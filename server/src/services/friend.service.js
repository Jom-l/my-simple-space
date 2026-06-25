import { Friendship, pairKey } from '../models/Friendship.js'
import { User } from '../models/User.js'
import { redis, keys } from '../config/redis.js'
import { ApiError } from '../utils/ApiError.js'

const FRIENDS_TTL = 300 // seconds

// Cached set of accepted-friend ids for fast feed $in + friendship checks.
export async function getFriendIds(userId) {
  const cacheKey = keys.friends(userId)
  const cached = await redis.smembers(cacheKey)
  if (cached.length) return cached.filter((x) => x !== '__empty__')

  const rows = await Friendship.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select('requester recipient')
    .lean()

  const ids = rows.map((r) =>
    String(r.requester) === String(userId) ? String(r.recipient) : String(r.requester),
  )

  // Store a sentinel for empty sets so we still cache the negative result.
  await redis.del(cacheKey)
  await redis.sadd(cacheKey, ids.length ? ids : ['__empty__'])
  await redis.expire(cacheKey, FRIENDS_TTL)
  return ids
}

function invalidateFriends(...userIds) {
  return Promise.all(userIds.map((id) => redis.del(keys.friends(id))))
}

export async function areFriends(a, b) {
  const f = await Friendship.findOne({ pairKey: pairKey(a, b), status: 'accepted' })
    .select('_id')
    .lean()
  return Boolean(f)
}

export async function sendRequest(requesterId, targetUsername) {
  const target = await User.findOne({ username: targetUsername }).select('_id').lean()
  if (!target) throw ApiError.notFound('User not found')
  if (String(target._id) === String(requesterId)) {
    throw ApiError.badRequest('Cannot add yourself')
  }

  const key = pairKey(requesterId, target._id)
  const existing = await Friendship.findOne({ pairKey: key })
  if (existing) {
    if (existing.status === 'accepted') throw ApiError.conflict('Already friends')
    if (existing.status === 'pending') throw ApiError.conflict('Request already pending')
    // Reopen a previously declined relationship.
    existing.requester = requesterId
    existing.recipient = target._id
    existing.status = 'pending'
    existing.respondedAt = undefined
    await existing.save()
    return existing
  }

  return Friendship.create({
    requester: requesterId,
    recipient: target._id,
    pairKey: key,
    status: 'pending',
  })
}

export async function respondToRequest(userId, requestId, accept) {
  const fr = await Friendship.findById(requestId)
  if (!fr || fr.status !== 'pending') throw ApiError.notFound('Request not found')
  if (String(fr.recipient) !== String(userId)) {
    throw ApiError.forbidden('Not your request to answer')
  }
  fr.status = accept ? 'accepted' : 'declined'
  fr.respondedAt = new Date()
  await fr.save()
  if (accept) await invalidateFriends(fr.requester, fr.recipient)
  return fr
}

export async function listFriends(userId) {
  const ids = await getFriendIds(userId)
  if (!ids.length) return []
  return User.find({ _id: { $in: ids } }).lean()
}

export async function listPendingRequests(userId) {
  return Friendship.find({ recipient: userId, status: 'pending' })
    .populate('requester', 'username displayName avatarUrl')
    .lean()
}
