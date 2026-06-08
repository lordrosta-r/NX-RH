'use strict'

// =============================================================================
// routes/admin/sslCert.js — Téléversement du certificat SSL (admin only)
//
// GET  /api/admin/ssl/cert  → métadonnées du cert installé (sans clé privée)
// POST /api/admin/ssl/cert  → installe fullchain.pem + privkey.pem
//
// Le guard authGuard(['admin']) est appliqué dans index.js ; on ajoute ici une
// vérification défensive du rôle (defense in depth).
//
// Sécurité :
//  - Validation Joi (forme, taille ~64 Ko).
//  - Vérification des marqueurs PEM.
//  - Parsing réel via crypto natif (X509Certificate + createPrivateKey).
//  - Vérification de la cohérence clé ↔ certificat.
//  - Écriture atomique (fichier .tmp puis rename), privkey en 0600.
//  - Chemin résolu et confiné dans nginx/certs (anti path-traversal).
//  - Aucun shell-out vers Docker.
// =============================================================================

const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')
const { installCert } = require('../../validators/sslValidators')

// Dossier cible des certificats TLS lus par nginx.
// En conteneur, ce dossier est un volume PARTAGÉ avec nginx (CERTS_DIR=/etc/nginx/certs,
// monté :rw côté app, :ro côté nginx). En dev hors conteneur, on retombe sur
// <repo>/nginx/certs. __dirname = mongo/server/routes/admin.
const CERTS_DIR     = process.env.CERTS_DIR
  ? path.resolve(process.env.CERTS_DIR)
  : path.resolve(path.join(__dirname, '../../../nginx/certs'))
const FULLCHAIN_PATH = path.join(CERTS_DIR, 'fullchain.pem')
const PRIVKEY_PATH   = path.join(CERTS_DIR, 'privkey.pem')

const CERT_MARKER = '-----BEGIN CERTIFICATE-----'
const KEY_MARKERS = [
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
]

function httpError(status, message) {
  const e = new Error(message)
  e.status = status
  return e
}

// Vérifie qu'un chemin résolu reste DANS le dossier des certs (anti-traversal).
function assertInsideCertsDir(target) {
  const resolved = path.resolve(target)
  const prefix = CERTS_DIR.endsWith(path.sep) ? CERTS_DIR : CERTS_DIR + path.sep
  if (resolved !== CERTS_DIR && !resolved.startsWith(prefix)) {
    throw httpError(500, 'Chemin de destination invalide')
  }
  return resolved
}

// Écriture atomique : écrit dans un .tmp dans le même dossier puis rename.
function atomicWrite(target, content, mode) {
  assertInsideCertsDir(target)
  const tmp = `${target}.tmp`
  assertInsideCertsDir(tmp)
  fs.writeFileSync(tmp, content, { mode })
  // S'assure du mode même si umask l'a restreint à la création.
  fs.chmodSync(tmp, mode)
  fs.renameSync(tmp, target)
}

// Parse + valide le certificat. Retourne l'objet X509Certificate.
function parseCertificate(pem) {
  if (!pem.includes(CERT_MARKER)) {
    throw httpError(400, 'Le fullchain ne contient pas de certificat PEM valide')
  }
  let cert
  try {
    cert = new crypto.X509Certificate(pem)
  } catch {
    throw httpError(400, 'Certificat illisible ou corrompu')
  }
  const now = Date.now()
  const notBefore = new Date(cert.validFrom).getTime()
  const notAfter  = new Date(cert.validTo).getTime()
  if (Number.isNaN(notBefore) || Number.isNaN(notAfter)) {
    throw httpError(400, 'Dates de validité du certificat illisibles')
  }
  if (now < notBefore) {
    throw httpError(400, 'Le certificat n\'est pas encore valide (date de début future)')
  }
  if (now > notAfter) {
    throw httpError(400, 'Le certificat est expiré')
  }
  return cert
}

// Parse + valide la clé privée. Retourne l'objet KeyObject.
function parsePrivateKey(pem) {
  if (!KEY_MARKERS.some(m => pem.includes(m))) {
    throw httpError(400, 'La clé privée ne contient pas de marqueur PEM valide')
  }
  try {
    return crypto.createPrivateKey(pem)
  } catch {
    throw httpError(400, 'Clé privée illisible ou protégée par mot de passe (non supporté)')
  }
}

// Vérifie que la clé publique du cert correspond à la clé privée.
function assertKeyMatchesCert(cert, privateKey) {
  let certPubDer, keyPubDer
  try {
    certPubDer = cert.publicKey.export({ type: 'spki', format: 'der' })
    keyPubDer = crypto
      .createPublicKey(privateKey)
      .export({ type: 'spki', format: 'der' })
  } catch {
    throw httpError(400, 'Impossible de comparer la clé et le certificat')
  }
  if (certPubDer.length !== keyPubDer.length || !crypto.timingSafeEqual(certPubDer, keyPubDer)) {
    throw httpError(400, 'La clé privée ne correspond pas au certificat fourni')
  }
}

function certMetadata(cert) {
  // subject = "CN=example.com\nO=..." → on extrait le CN si présent.
  const cnLine = String(cert.subject || '')
    .split('\n')
    .find(l => l.startsWith('CN='))
  const cn = cnLine ? cnLine.slice(3).trim() : null
  const notAfter = new Date(cert.validTo)
  const notBefore = new Date(cert.validFrom)
  const daysRemaining = Math.floor((notAfter.getTime() - Date.now()) / 86400000)
  return {
    cn,
    subject: cert.subject,
    notBefore: notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    daysRemaining,
  }
}

// ─── GET — métadonnées du cert installé ────────────────────────────────────────

router.get('/cert', (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      throw httpError(403, 'Accès réservé aux administrateurs')
    }
    if (!fs.existsSync(FULLCHAIN_PATH)) {
      return res.json({ installed: false })
    }
    const pem = fs.readFileSync(FULLCHAIN_PATH, 'utf8')
    let cert
    try {
      cert = new crypto.X509Certificate(pem)
    } catch {
      // Fichier présent mais illisible : on signale sans exposer de détail.
      return res.json({ installed: true, valid: false })
    }
    res.json({ installed: true, valid: true, ...certMetadata(cert) })
  } catch (err) {
    next(err)
  }
})

// ─── POST — installation du cert ───────────────────────────────────────────────

router.post('/cert', (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      throw httpError(403, 'Accès réservé aux administrateurs')
    }

    const { error, value } = installCert.validate(req.body, { stripUnknown: true })
    if (error) {
      throw httpError(400, error.details.map(d => d.message).join(' ; '))
    }

    const cert = parseCertificate(value.fullchain)
    const privateKey = parsePrivateKey(value.privkey)
    assertKeyMatchesCert(cert, privateKey)

    // S'assure que le dossier existe.
    fs.mkdirSync(CERTS_DIR, { recursive: true })

    // Écriture atomique : fullchain lisible (0644), privkey stricte (0600).
    atomicWrite(FULLCHAIN_PATH, value.fullchain, 0o644)
    atomicWrite(PRIVKEY_PATH, value.privkey, 0o600)

    const meta = certMetadata(cert)
    res.json({
      ok: true,
      message:
        'Certificat installé. Rechargez nginx pour l\'activer : ' +
        'docker compose kill -s HUP nginx',
      notAfter: meta.notAfter,
      cn: meta.cn,
      daysRemaining: meta.daysRemaining,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
