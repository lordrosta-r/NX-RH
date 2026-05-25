'use strict'

// Compteurs en mémoire pour les métriques de base
const metrics = {
  requests:     { total: 0, success: 0, errors: 0 },
  responseTime: { sum: 0, count: 0, max: 0 },
  db:           { queries: 0, errors: 0 },
}

function recordRequest(durationMs, isError = false) {
  metrics.requests.total++
  if (isError) {
    metrics.requests.errors++
  } else {
    metrics.requests.success++
  }
  metrics.responseTime.sum += durationMs
  metrics.responseTime.count++
  if (durationMs > metrics.responseTime.max) {
    metrics.responseTime.max = durationMs
  }
}

function getMetrics() {
  const avgResponseTime = metrics.responseTime.count > 0
    ? Math.round(metrics.responseTime.sum / metrics.responseTime.count)
    : 0
  return {
    requests:     { ...metrics.requests },
    responseTime: {
      avg:   avgResponseTime,
      max:   metrics.responseTime.max,
      count: metrics.responseTime.count,
    },
    db: { ...metrics.db },
  }
}

module.exports = { recordRequest, getMetrics, metrics }
