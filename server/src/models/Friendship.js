import mongoose from 'mongoose'

export const FRIENDSHIP_STATUS = ['pending', 'accepted', 'declined', 'blocked']

// Build a direction-independent key so "are A and B friends" is one lookup.
export function pairKey(a, b) {
  return [String(a), String(b)].sort().join(':')
}

const friendshipSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pairKey: { type: String, required: true },
    status: { type: String, enum: FRIENDSHIP_STATUS, default: 'pending', index: true },
    respondedAt: { type: Date },
  },
  { timestamps: true },
)

// One relationship per pair regardless of who asked.
friendshipSchema.index({ pairKey: 1 }, { unique: true })
// Incoming/outgoing request lists.
friendshipSchema.index({ recipient: 1, status: 1 })
friendshipSchema.index({ requester: 1, status: 1 })

export const Friendship = mongoose.model('Friendship', friendshipSchema)
