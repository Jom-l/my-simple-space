import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true },
)

// Comments per post, newest-first, cursor-paginated.
commentSchema.index({ post: 1, _id: -1 })

export const Comment = mongoose.model('Comment', commentSchema)
