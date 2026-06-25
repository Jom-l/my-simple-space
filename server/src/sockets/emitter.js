// Holds the Socket.IO server instance so controllers/services can emit
// without circular imports. Set once during bootstrap.
let io = null

export function setIo(instance) {
  io = instance
}

export function getIo() {
  return io
}

export const room = {
  user: (userId) => `user:${userId}`,
  conversation: (conversationId) => `conversation:${conversationId}`,
}

export function emitToUser(userId, event, payload) {
  if (io) io.to(room.user(userId)).emit(event, payload)
}

export function emitToConversation(conversationId, event, payload) {
  if (io) io.to(room.conversation(conversationId)).emit(event, payload)
}
