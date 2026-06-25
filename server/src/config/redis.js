import Redis from 'ioredis'
import { env } from './env.js'

// Main client for commands (sessions, cache, counters, presence).
export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
})

redis.on('connect', () => console.log('[redis] connected'))
redis.on('error', (err) => console.error('[redis] error:', err.message))

// Socket.IO Redis adapter needs dedicated pub/sub clients (duplicates).
export function createPubSubPair() {
  const pubClient = redis.duplicate()
  const subClient = redis.duplicate()
  return { pubClient, subClient }
}

// Key builders — central place so naming stays consistent.
export const keys = {
  refresh: (userId, jti) => `refresh:${userId}:${jti}`,
  refreshSet: (userId) => `refresh:set:${userId}`,
  friends: (userId) => `friends:${userId}`,
  presenceSockets: (userId) => `presence:sockets:${userId}`,
  userStatus: (userId) => `presence:status:${userId}`,
  unread: (userId, conversationId) => `unread:${userId}:${conversationId}`,
  unreadIndex: (userId) => `unread:index:${userId}`,
}
