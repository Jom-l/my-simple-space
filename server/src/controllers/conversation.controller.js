import * as chat from '../services/chat.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { clampLimit } from '../utils/paginate.js'
import { emitToConversation } from '../sockets/emitter.js'

export const start = asyncHandler(async (req, res) => {
  const convo = await chat.getOrCreateConversation(req.userId, req.body.userId)
  res.status(201).json({ conversation: convo })
})

export const list = asyncHandler(async (req, res) => {
  const conversations = await chat.listConversations(req.userId)
  res.json({ conversations })
})

export const messages = asyncHandler(async (req, res) => {
  const page = await chat.getMessages(req.userId, req.params.id, {
    cursor: req.query.cursor,
    limit: clampLimit(req.query.limit),
  })
  res.json(page)
})

// REST fallback for sending (the socket path is primary). Broadcasts on success.
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = await chat.createMessage(req.userId, req.params.id, req.body)
  emitToConversation(req.params.id, 'message:new', message)
  res.status(201).json({ message })
})

export const markSeen = asyncHandler(async (req, res) => {
  await chat.markSeen(req.userId, req.params.id, req.body.messageId)
  emitToConversation(req.params.id, 'message:seen', {
    conversationId: req.params.id,
    userId: req.userId,
    messageId: req.body.messageId,
  })
  res.json({ ok: true })
})
