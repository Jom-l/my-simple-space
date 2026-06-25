import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../config/env.js'

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret)
}

// Refresh token carries a unique jti so individual sessions can be revoked.
export function signRefreshToken(userId) {
  const jti = crypto.randomUUID()
  const token = jwt.sign({ sub: String(userId), jti }, env.jwt.refreshSecret, {
    expiresIn: `${env.jwt.refreshTtlDays}d`,
  })
  return { token, jti }
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret)
}
