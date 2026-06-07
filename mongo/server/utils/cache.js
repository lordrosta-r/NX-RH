'use strict'

// Cache en mémoire simple avec TTL
class MemoryCache {
  constructor() {
    this._store = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this._store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  invalidate(key) {
    this._store.delete(key);
  }

  invalidatePattern(prefix) {
    for (const k of this._store.keys()) {
      if (k.startsWith(prefix)) this._store.delete(k);
    }
  }

  size() {
    return this._store.size;
  }
}

module.exports = new MemoryCache();
