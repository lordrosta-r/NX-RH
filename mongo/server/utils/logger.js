'use strict'

const fs = require('fs')
const winston = require('winston')

// Répertoire de logs configurable (LOG_DIR). En production on écrit des fichiers ;
// si le dossier n'est pas inscriptible, on retombe sur la console seule plutôt
// que de faire crasher le démarrage du conteneur.
const LOG_DIR = process.env.LOG_DIR || 'logs'
let fileTransportsEnabled = process.env.NODE_ENV === 'production'
if (fileTransportsEnabled) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  } catch {
    fileTransportsEnabled = false
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
            return `${timestamp} [${level}]: ${message}${metaStr}`
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
    ...(fileTransportsEnabled ? [
      new winston.transports.File({ filename: `${LOG_DIR}/error.log`, level: 'error' }),
      new winston.transports.File({ filename: `${LOG_DIR}/combined.log` }),
    ] : []),
  ],
})

module.exports = logger
