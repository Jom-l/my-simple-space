import mongoose from 'mongoose'

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image'], default: 'image' },
  },
  { _id: false },
)

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 4000 },
    attachments: { type: [attachmentSchema], default: [] },
    // 1:1 receipts: bounded to the other participant, safe to embed.
    seenBy: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        seenAt: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

// THE hot index: matches find({conversationId}).sort({_id:-1}) exactly.
// Keyset pagination -> O(log n) seek at any depth (page 1 == page 10,000).
messageSchema.index({ conversationId: 1, _id: -1 })

export const Message = mongoose.model('Message', messageSchema)
