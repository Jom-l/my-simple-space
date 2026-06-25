import mongoose from 'mongoose'

// Per-participant read state avoids an unbounded seenBy array on every message.
const memberStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { _id: false },
)

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    isGroup: { type: Boolean, default: false },
    members: [memberStateSchema],
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  { timestamps: true },
)

// Inbox: a user's conversations sorted by recent activity.
conversationSchema.index({ participants: 1, updatedAt: -1 })

export const Conversation = mongoose.model('Conversation', conversationSchema)
