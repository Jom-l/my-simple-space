import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { redis, keys } from '../config/redis.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js'

const REFRESH_TTL_SEC = () => env.jwt.refreshTtlDays * 24 * 60 * 60

// Persist a refresh jti in Redis so sessions are revocable (logout / logout-all).
async function storeRefresh(userId, jti) {
  await redis.set(keys.refresh(userId, jti), '1', 'EX', REFRESH_TTL_SEC())
  await redis.sadd(keys.refreshSet(userId), jti)
}

async function revokeRefresh(userId, jti) {
  await redis.del(keys.refresh(userId, jti))
  await redis.srem(keys.refreshSet(userId), jti)
}

async function issueTokens(userId) {
  const accessToken = signAccessToken(userId)
  const { token: refreshToken, jti } = signRefreshToken(userId)
  await storeRefresh(userId, jti)
  return { accessToken, refreshToken }
}

export async function register({ username, email, password, displayName }) {
  const exists = await User.findOne({ $or: [{ username }, { email }] }).select('_id').lean()
  if (exists) throw ApiError.conflict('Username or email already taken')

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    username,
    email,
    passwordHash,
    displayName: displayName || username,
  })
  const tokens = await issueTokens(user._id)
  return { user: user.toPublic(), ...tokens }
}

export async function login({ usernameOrEmail, password }) {
  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  }).select('+passwordHash')
  if (!user) throw ApiError.unauthorized('Invalid credentials')

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw ApiError.unauthorized('Invalid credentials')

  const tokens = await issueTokens(user._id)
  return { user: user.toPublic(), ...tokens }
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token')
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw ApiError.unauthorized('Invalid refresh token')
  }

  const exists = await redis.get(keys.refresh(payload.sub, payload.jti))
  if (!exists) throw ApiError.unauthorized('Session revoked or expired')

  // Rotate: kill the old jti, issue a fresh pair.
  await revokeRefresh(payload.sub, payload.jti)
  return issueTokens(payload.sub)
}

export async function logout(refreshToken) {
  if (!refreshToken) return
  try {
    const payload = verifyRefreshToken(refreshToken)
    await revokeRefresh(payload.sub, payload.jti)
  } catch {
    // already invalid — nothing to revoke
  }
}

// Used on password reset to kill every active session.
export async function logoutAll(userId) {
  const jtis = await redis.smembers(keys.refreshSet(userId))
  await Promise.all(jtis.map((jti) => revokeRefresh(userId, jti)))
}
