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
  if (USE_MINIO) {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1')
    }
    await minioClient.fPutObject(BUCKET, remoteName, localPath, { 'Content-Type': mimeType })
    const url = await minioClient.presignedGetObject(BUCKET, remoteName, 7 * 24 * 3600)
    fs.unlink(localPath, () => {})
    return { url, key: remoteName, backend: 'minio' }
  }

  // Local disk fallback
  const uploadDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', 'uploads')

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const dest = path.join(uploadDir, remoteName)
  // remoteName contient un sous-dossier (<userId>/<fichier>) → créer le parent.
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(localPath, dest)
  fs.unlink(localPath, () => {})
  return { url: `/uploads/${remoteName}`, key: remoteName, backend: 'local' }
}

/**
 * Deletes a file from the configured storage backend.
 */
async function deleteFile(key) {
  if (USE_MINIO) {
    await minioClient.removeObject(BUCKET, key)
    return
  }

  const uploadDir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', 'uploads')

  const filePath = path.join(uploadDir, key)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

/**
 * Returns a signed/presigned URL for downloading a stored file.
 * For local backend, returns the public path.
 */
async function getSignedUrl(key, expirySeconds = 3600) {
  if (USE_MINIO) {
    return minioClient.presignedGetObject(BUCKET, key, expirySeconds)
  }
  return `/uploads/${key}`
}

module.exports = { uploadFile, deleteFile, getSignedUrl, USE_MINIO }
