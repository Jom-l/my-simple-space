import * as chat from '../services/chat.service.js'
import { room } from './emitter.js'

export function registerChatHandlers(io, socket) {
  const { userId } = socket

  // Join/leave conversation rooms as the user opens/closes chats.
  socket.on('conversation:join', async ({ conversationId }) => {
    const participants = await chat.getParticipants(conversationId)
    if (participants.includes(String(userId))) {
      socket.join(room.conversation(conversationId))
    }
  })

  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(room.conversation(conversationId))
  })

  // Primary send path — persist, then broadcast to the conversation room.
  socket.on('message:send', async ({ conversationId, text, attachments }, ack) => {
    try {
      const { message } = await chat.createMessage(userId, conversationId, { text, attachments })
      io.to(room.conversation(conversationId)).emit('message:new', message)
      ack?.({ ok: true, message })
    } catch (err) {
      ack?.({ ok: false, error: err.message })
    }
  })

  socket.on('message:delivered', async ({ conversationId, messageId }) => {
    await chat.markDelivered(userId, conversationId, messageId)
    io.to(room.conversation(conversationId)).emit('message:delivered', { messageId, userId })
  })

  socket.on('message:seen', async ({ conversationId, messageId }) => {
    await chat.markSeen(userId, conversationId, messageId)
    io.to(room.conversation(conversationId)).emit('message:seen', { conversationId, userId, messageId })
  })

  socket.on('typing:start', ({ conversationId }) => {
    socket.to(room.conversation(conversationId)).emit('typing:start', { conversationId, userId })
  })

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(room.conversation(conversationId)).emit('typing:stop', { conversationId, userId })
  })
}
