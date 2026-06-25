import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createPubSubPair } from '../config/redis.js'
import { env } from '../config/env.js'
import { verifyAccessToken } from '../utils/tokens.js'
import { setIo, room } from './emitter.js'
import { registerChatHandlers } from './chatHandlers.js'
import { registerPresenceHandlers } from './presenceHandlers.js'

export async function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  })

  // Redis adapter -> horizontal scaling: any instance can broadcast to any room.
  const { pubClient, subClient } = createPubSubPair()
  io.adapter(createAdapter(pubClient, subClient))

  // Authenticate every socket from the JWT passed in the handshake.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = verifyAccessToken(token)
      socket.userId = payload.sub
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    // Personal room for presence + targeted notifications (multi-device safe).
    socket.join(room.user(socket.userId))
    registerPresenceHandlers(io, socket)
    registerChatHandlers(io, socket)
  })

  setIo(io)
  return io
}
