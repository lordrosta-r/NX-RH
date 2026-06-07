'use strict'

// =============================================================================
// routes/admin/envCheck.js — Vérification des variables d'environnement
//
// GET /api/admin/env-check — liste les variables attendues et leur présence
//
// Rôles autorisés : admin (déclaré dans index.js)
// =============================================================================

const express = require('express')
const router  = express.Router()

const ENV_VARS = [
  { key: 'MONGODB_URI',   required: true,  description: 'Connexion MongoDB' },
  { key: 'JWT_SECRET',    required: true,  description: 'Clé de signature JWT' },
  { key: 'SMTP_HOST',     required: false, description: 'Serveur SMTP pour les emails' },
  { key: 'SMTP_PORT',     required: false, description: 'Port SMTP (défaut: 587)' },
  { key: 'SMTP_USER',     required: false, description: 'Utilisateur SMTP' },
  { key: 'SMTP_PASS',     required: false, description: 'Mot de passe SMTP' },
  { key: 'SMTP_FROM',     required: false, description: 'Adresse expéditeur par défaut' },
  { key: 'LDAP_URL',      required: false, description: 'URL du serveur LDAP' },
  { key: 'LDAP_BASE_DN',  required: false, description: 'DN de base LDAP' },
  { key: 'LDAP_BIND_DN',  required: false, description: 'DN de bind LDAP' },
  { key: 'LDAP_BIND_PASS',required: false, description: 'Mot de passe bind LDAP' },
  { key: 'FRONTEND_URL',  required: false, description: 'URL frontend (pour les liens email)' },
  { key: 'NODE_ENV',      required: false, description: 'Environnement (production/development)' },
]

// GET /api/admin/env-check
router.get('/', (req, res) => {
  const result = ENV_VARS.map(v => ({
    key:         v.key,
    set:         !!process.env[v.key],
    required:    v.required,
    description: v.description,
  }))
  res.json(result)
})

module.exports = router
