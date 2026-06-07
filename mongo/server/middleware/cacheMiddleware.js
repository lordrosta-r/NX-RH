'use strict'

const cache = require('../utils/cache');

/**
 * Middleware de cache GET pour Express.
 * @param {number} ttlSeconds - TTL du cache en secondes (défaut : 300)
 * @param {Function|null} keyFn - Fonction optionnelle (req) => string pour la clé de cache.
 *   Si null, la clé est `METHOD:originalUrl`.
 */
const cacheResponse = (ttlSeconds = 300, keyFn = null) => {
  return (req, res, next) => {
    // Désactivé en environnement de test
    if (process.env.NODE_ENV === 'test') return next();

    const key = keyFn ? keyFn(req) : `${req.method}:${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Intercepte res.json pour stocker la réponse en cas de succès
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        cache.set(key, body, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

module.exports = { cacheResponse };
