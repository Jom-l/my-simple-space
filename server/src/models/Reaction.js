import mongoose from 'mongoose'
import { EMOTES } from './Post.js'

const reactionSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emote: { type: String, enum: EMOTES, required: true },
  },
  { timestamps: true },
)

// One reaction per user per post; switching emote updates this doc.
reactionSchema.index({ post: 1, user: 1 }, { unique: true })

export const Reaction = mongoose.model('Reaction', reactionSchema)
