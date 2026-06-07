'use strict'

const { recordRequest } = require('../utils/metrics')

const metricsMiddleware = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const isError  = res.statusCode >= 400
    recordRequest(duration, isError)
  })
  next()
}

module.exports = { metricsMiddleware }
