'use strict'

const path   = require('path')
const fs     = require('fs')
const logger = require('../utils/logger')

// MinIO is enabled only when all three required env vars are set
const USE_MINIO = !!(
  process.env.MINIO_ENDPOINT &&
  process.env.MINIO_ACCESS_KEY &&
  process.env.MINIO_SECRET_KEY
)

let minioClient = null
const BUCKET = process.env.MINIO_BUCKET || 'nxrh'

// ─── Sécurité : anti directory-traversal sur le stockage disque ──────────────
// Les noms distants (`remoteName`/`key`) sont de la forme `<userId>/<fichier>`.
// On valide chaque segment et on vérifie que le chemin résolu reste DANS le
// dossier de stockage prévu (defense-in-depth contre `..`, chemins absolus, etc.).

// Caractères autorisés pour un segment de nom : alphanum, point, tiret, underscore.
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

/**
 * Valide un nom de fichier distant (clé de stockage) et renvoie sa forme
 * normalisée sûre. Rejette toute tentative de traversée de répertoire.
 * @param {string} name — ex. "<userId>/<fichier.ext>"
 * @returns {string} le nom validé (segments joints par '/')
 * @throws {Error} si le nom est invalide / dangereux
 */
function sanitizeStorageKey(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 512) {
    throw new Error('Nom de fichier de stockage invalide')
  }
  // Pas de NUL, pas de backslash (séparateur Windows), pas de chemin absolu.
  if (name.includes('\0') || name.includes('\\') || path.isAbsolute(name)) {
    throw new Error('Nom de fichier de stockage invalide')
  }

  // On découpe sur '/' (les sous-dossiers sont autorisés) et on valide chaque
  // segment : ni vide, ni '.'/'..', et uniquement des caractères whitelistés.
  const segments = name.split('/')
  for (const seg of segments) {
    if (seg === '' || seg === '.' || seg === '..' || !SAFE_SEGMENT.test(seg)) {
      throw new Error('Nom de fichier de stockage invalide')
    }
    // path.basename(seg) doit être identique : aucun reste de séparateur.
    if (path.basename(seg) !== seg) {
      throw new Error('Nom de fichier de stockage invalide')
    }
  }

  return segments.join('/')
}

/**
 * Résout un chemin disque pour une clé de stockage donnée et garantit qu'il
 * reste confiné dans `baseDir`. Lève une erreur si la clé s'échappe du dossier.
 * @param {string} baseDir — dossier de stockage (déjà résolu en absolu)
 * @param {string} key — clé déjà passée par sanitizeStorageKey
 * @returns {string} chemin disque absolu sûr
 */
function resolveWithinBase(baseDir, key) {
  const safeKey = sanitizeStorageKey(key)
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, safeKey)
  // Le chemin résolu doit être STRICTEMENT dans base (préfixe + séparateur).
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Chemin de stockage hors du dossier autorisé')
  }
  return resolved
}

if (USE_MINIO) {
  const Minio = require('minio')
  minioClient = new Minio.Client({
    endPoint:  process.env.MINIO_ENDPOINT,
    port:      parseInt(process.env.MINIO_PORT || '9000'),
    useSSL:    process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
  })
  logger.info('[storage] Using MinIO backend')
} else {
  logger.info('[storage] Using local disk backend (set MINIO_* env vars to use MinIO)')
}

/**
 * Uploads a file from a local temp path to the configured storage backend.
 * Deletes the local temp file after transfer.
 * Returns { url, key, backend }.
 */
async function uploadFile(localPath, remoteName, mimeType = 'application/octet-stream') {
  // Valide/normalise la clé AVANT tout accès stockage (anti path-traversal).
  const safeName = sanitizeStorageKey(remoteName)

  if (USE_MINIO) {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1')
    }
    await minioClient.fPutObject(BUCKET, safeName, localPath, { 'Content-Type': mimeType })
    const url = await minioClient.presignedGetObject(BUCKET, safeName, 7 * 24 * 3600)
    fs.unlink(localPath, () => {})
    return { url, key: safeName, backend: 'minio' }
  }

  // Local disk fallback
  const uploadDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', 'uploads')

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  // Chemin confiné dans uploadDir (vérifie le préfixe résolu).
  const dest = resolveWithinBase(uploadDir, safeName)
  // safeName contient un sous-dossier (<userId>/<fichier>) → créer le parent.
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(localPath, dest)
  fs.unlink(localPath, () => {})
  return { url: `/uploads/${safeName}`, key: safeName, backend: 'local' }
}

/**
 * Deletes a file from the configured storage backend.
 */
async function deleteFile(key) {
  const safeKey = sanitizeStorageKey(key)

  if (USE_MINIO) {
    await minioClient.removeObject(BUCKET, safeKey)
    return
  }

  const uploadDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', 'uploads')

  const filePath = resolveWithinBase(uploadDir, safeKey)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

/**
 * Returns a signed/presigned URL for downloading a stored file.
 * For local backend, returns the public path.
 */
async function getSignedUrl(key, expirySeconds = 3600) {
  const safeKey = sanitizeStorageKey(key)
  if (USE_MINIO) {
    return minioClient.presignedGetObject(BUCKET, safeKey, expirySeconds)
  }
  return `/uploads/${safeKey}`
}

module.exports = { uploadFile, deleteFile, getSignedUrl, USE_MINIO }
