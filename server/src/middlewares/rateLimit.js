import { redis } from '../config/redis.js'
import { ApiError } from '../utils/ApiError.js'

// Fixed-window rate limiter backed by Redis (works across instances).
export function rateLimit({ windowSec = 60, max = 100, keyPrefix = 'rl' } = {}) {
  return async (req, res, next) => {
    try {
      const id = req.userId || req.ip
      const key = `${keyPrefix}:${id}`
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, windowSec)
      if (count > max) {
        return next(new ApiError(429, 'Too many requests, slow down'))
      }
      next()
    } catch {
      // Fail-open: never let a Redis hiccup block the API.
      next()
    }
  }
}
