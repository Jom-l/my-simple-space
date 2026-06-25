import mongoose from 'mongoose'

export const EMOTES = ['like', 'love', 'haha', 'wow', 'sad', 'angry']

function zeroCounts() {
  return EMOTES.reduce((acc, e) => ({ ...acc, [e]: 0 }), {})
}

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 5000 },
    imageUrl: { type: String, default: '' },
    // Denormalized totals -> feed renders without joining reactions/comments.
    reactionCounts: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(zeroCounts())),
    },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// A user's posts, newest-first; also serves the friend-feed $in query.
postSchema.index({ author: 1, _id: -1 })

export const Post = mongoose.model('Post', postSchema)
