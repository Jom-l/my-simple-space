import mongoose from 'mongoose'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { redis, keys } from '../config/redis.js'
import { areFriends } from './friend.service.js'
import { paginateByCursor, parseCursor } from '../utils/paginate.js'
import { ApiError } from '../utils/ApiError.js'

// Find-or-create the 1:1 conversation between two friends.
export async function getOrCreateConversation(userId, otherUserId) {
  if (String(userId) === String(otherUserId)) {
    throw ApiError.badRequest('Cannot start a conversation with yourself')
  }
  if (!(await areFriends(userId, otherUserId))) {
    throw ApiError.forbidden('You must be friends to chat')
  }

  const participants = [userId, otherUserId]
  let convo = await Conversation.findOne({
    isGroup: false,
    participants: { $all: participants, $size: 2 },
  })
  if (!convo) {
    convo = await Conversation.create({
      participants,
      isGroup: false,
      members: participants.map((u) => ({ user: u, lastReadMessageId: null })),
    })
  }
  return convo
}

export async function listConversations(userId) {
  const convos = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate('participants', 'username displayName avatarUrl status')
    .lean()

  // Attach unread counts from Redis.
  const withUnread = await Promise.all(
    convos.map(async (c) => ({
      ...c,
      unread: Number((await redis.get(keys.unread(userId, c._id))) || 0),
    })),
  )
  return withUnread
}

async function assertParticipant(conversationId, userId) {
  const convo = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  })
  if (!convo) throw ApiError.forbidden('Not a participant of this conversation')
  return convo
}

// Newest-first page; client scrolls UP passing the oldest _id as cursor.
export async function getMessages(userId, conversationId, { cursor, limit }) {
  await assertParticipant(conversationId, userId)
  return paginateByCursor(
    Message,
    { conversationId: new mongoose.Types.ObjectId(conversationId) },
    { cursor: parseCursor(cursor), limit },
  )
}

export async function createMessage(userId, conversationId, { text, attachments }) {
  const convo = await assertParticipant(conversationId, userId)
  if (!text?.trim() && !(attachments?.length)) {
    throw ApiError.badRequest('Message cannot be empty')
  }

  const message = await Message.create({
    conversationId,
    sender: userId,
    text: text?.trim() || '',
    attachments: attachments || [],
    deliveredTo: [],
    seenBy: [],
  })

  // Denormalize last message onto the conversation (and bump updatedAt).
  convo.lastMessage = {
    text: message.text || (message.attachments.length ? '📷 Photo' : ''),
    sender: userId,
    createdAt: message.createdAt,
  }
  await convo.save()

  // Increment unread for everyone except the sender.
  await Promise.all(
    convo.participants
      .filter((p) => String(p) !== String(userId))
      .map((p) => redis.incr(keys.unread(p, conversationId))),
  )

  return { message, conversation: convo }
}

// Marks messages up to `messageId` as seen for this user; resets unread.
export async function markSeen(userId, conversationId, messageId) {
  await assertParticipant(conversationId, userId)

  await Message.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      _id: { $lte: new mongoose.Types.ObjectId(messageId) },
      'seenBy.user': { $ne: userId },
    },
    { $addToSet: { seenBy: { user: userId, seenAt: new Date() } } },
  )

  await Conversation.updateOne(
    { _id: conversationId, 'members.user': userId },
    { $set: { 'members.$.lastReadMessageId': messageId } },
  )

  await redis.del(keys.unread(userId, conversationId))
}

export async function markDelivered(userId, conversationId, messageId) {
  await Message.updateOne(
    { _id: messageId, deliveredTo: { $ne: userId } },
    { $addToSet: { deliveredTo: userId } },
  )
}

export async function getParticipants(conversationId) {
  const convo = await Conversation.findById(conversationId).select('participants').lean()
  return convo ? convo.participants.map(String) : []
}
