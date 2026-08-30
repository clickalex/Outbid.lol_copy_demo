'use strict';

/**
 * Token-bucket rate limiter, keyed by client IP (or a custom key such as a
 * user id). Pure in-memory; buckets are pruned periodically.
 */

const { CONFIG } = require('./config');

class RateLimiter {
  constructor() {
    this.buckets = new Map();
    this._pruneTimer = setInterval(() => this.prune(), 60_000);
    if (this._pruneTimer.unref) this._pruneTimer.unref();
  }

  /** Returns true when the request is allowed. */
  allow(key, spec) {
    return this.take(key, spec).allowed;
  }

  take(key, spec) {
    const { rate, burst, windowMs } = spec;
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: burst, last: now };
      this.buckets.set(key, b);
    }
    const elapsed = Math.max(0, now - b.last);
    const refill = (elapsed / windowMs) * rate;
    b.tokens = Math.min(burst, b.tokens + refill);
    b.last = now;
    const allowed = b.tokens >= 1;
    if (allowed) b.tokens -= 1;
    return {
      allowed,
      remaining: Math.max(0, Math.floor(b.tokens)),
      retryAfterMs: allowed ? 0 : Math.ceil(((1 - b.tokens) / rate) * windowMs),
      limit: burst
    };
  }

  prune() {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, bucket] of this.buckets) {
      if (bucket.last < cutoff) this.buckets.delete(key);
    }
  }
}

/** Pick the right limit bucket for an endpoint. */
function specFor(route, authLevel) {
  if (route === 'boost') return CONFIG.RATE_LIMITS.BOOST;
  if (authLevel === 'sensitive' || route === 'login' || route === 'signup' || route === 'donate') {
    return CONFIG.RATE_LIMITS.SENSITIVE;
  }
  return CONFIG.RATE_LIMITS.GENERAL;
}

module.exports = { RateLimiter, specFor };
