import { redis, keys } from '../config/redis.js'
import { User } from '../models/User.js'

// Manual statuses override the automatic online/offline derived from sockets.
const MANUAL = new Set(['do_not_disturb', 'away'])

// Effective status = manual override if set, else online when any socket is live.
async function effectiveStatus(userId) {
  const manual = await redis.get(keys.userStatus(userId))
  if (manual && MANUAL.has(manual)) return manual
  const count = await redis.scard(keys.presenceSockets(userId))
  return count > 0 ? 'online' : 'offline'
}

export async function addSocket(userId, socketId) {
  await redis.sadd(keys.presenceSockets(userId), socketId)
  const status = await effectiveStatus(userId)
  await User.updateOne({ _id: userId }, { status, lastSeenAt: new Date() })
  return status
}

export async function removeSocket(userId, socketId) {
  await redis.srem(keys.presenceSockets(userId), socketId)
  const status = await effectiveStatus(userId)
  await User.updateOne({ _id: userId }, { status, lastSeenAt: new Date() })
  return status
}

// User-chosen status. 'online'/'offline' clear any manual override.
export async function setManualStatus(userId, status) {
  if (MANUAL.has(status)) {
    await redis.set(keys.userStatus(userId), status)
  } else {
    await redis.del(keys.userStatus(userId))
  }
  const effective = await effectiveStatus(userId)
  await User.updateOne({ _id: userId }, { status: effective, lastSeenAt: new Date() })
  return effective
}

export async function getStatus(userId) {
  return effectiveStatus(userId)
}
