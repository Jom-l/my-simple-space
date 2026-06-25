import { areFriends } from '../services/friend.service.js'
import { ApiError } from '../utils/ApiError.js'

// Guards actions that require the two users to be accepted friends.
// Resolves the target id via `getTargetId(req)` (async allowed).
export function friendGuard(getTargetId) {
  return async (req, res, next) => {
    try {
      const targetId = await getTargetId(req)
      if (!targetId) return next(ApiError.notFound('Target user not found'))
      if (String(targetId) === String(req.userId)) return next() // self is fine
      const ok = await areFriends(req.userId, targetId)
      if (!ok) return next(ApiError.forbidden('You must be friends to do this'))
      next()
    } catch (err) {
      next(err)
    }
  }
}
