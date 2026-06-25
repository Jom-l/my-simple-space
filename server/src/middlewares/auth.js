import { verifyAccessToken } from '../utils/tokens.js'
import { ApiError } from '../utils/ApiError.js'

// Extracts a Bearer token and attaches req.userId.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next(ApiError.unauthorized('Missing access token'))

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.sub
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'))
  }
}
