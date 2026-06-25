import mongoose from 'mongoose'
import { Post, EMOTES } from '../models/Post.js'
import { Comment } from '../models/Comment.js'
import { Reaction } from '../models/Reaction.js'
import { getFriendIds, areFriends } from './friend.service.js'
import { paginateByCursor, parseCursor } from '../utils/paginate.js'
import { ApiError } from '../utils/ApiError.js'

const populateAuthor = { path: 'author', select: 'username displayName avatarUrl' }

export async function createPost(userId, { text, imageUrl }) {
  if (!text?.trim() && !imageUrl) throw ApiError.badRequest('Post cannot be empty')
  const post = await Post.create({ author: userId, text: text?.trim() || '', imageUrl: imageUrl || '' })
  return Post.findById(post._id).populate(populateAuthor).lean()
}

// Feed = own posts + friends' posts, newest-first, keyset-paginated.
// load-more on scroll passes the last post _id as the cursor.
export async function getFeed(userId, { cursor, limit }) {
  const friendIds = await getFriendIds(userId)
  const authorIds = [userId, ...friendIds].map((id) => new mongoose.Types.ObjectId(id))

  const page = await paginateByCursor(
    Post,
    { author: { $in: authorIds } },
    { cursor: parseCursor(cursor), limit, populate: populateAuthor },
  )

  // Attach this viewer's own reaction per post (single batched query).
  const ids = page.items.map((p) => p._id)
  const mine = await Reaction.find({ post: { $in: ids }, user: userId }).lean()
  const byPost = new Map(mine.map((r) => [String(r.post), r.emote]))
  page.items = page.items.map((p) => ({ ...p, myReaction: byPost.get(String(p._id)) || null }))
  return page
}

async function assertCanSeePost(userId, postId) {
  const post = await Post.findById(postId)
  if (!post) throw ApiError.notFound('Post not found')
  const isAuthor = String(post.author) === String(userId)
  if (!isAuthor && !(await areFriends(userId, post.author))) {
    throw ApiError.forbidden('Only friends can view this post')
  }
  return post
}

export async function getComments(userId, postId, { cursor, limit }) {
  await assertCanSeePost(userId, postId)
  return paginateByCursor(
    Comment,
    { post: new mongoose.Types.ObjectId(postId) },
    { cursor: parseCursor(cursor), limit, populate: { path: 'author', select: 'username displayName avatarUrl' } },
  )
}

export async function addComment(userId, postId, text) {
  await assertCanSeePost(userId, postId)
  const comment = await Comment.create({ post: postId, author: userId, text })
  await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } })
  return Comment.findById(comment._id)
    .populate({ path: 'author', select: 'username displayName avatarUrl' })
    .lean()
}

// Set / switch / remove a reaction. Atomic $inc keeps counts race-safe.
export async function setReaction(userId, postId, emote) {
  if (emote && !EMOTES.includes(emote)) throw ApiError.badRequest('Invalid emote')
  await assertCanSeePost(userId, postId)

  const existing = await Reaction.findOne({ post: postId, user: userId })

  // No emote (or same emote) => toggle OFF.
  if (!emote || (existing && existing.emote === emote)) {
    if (existing) {
      await existing.deleteOne()
      await Post.updateOne({ _id: postId }, { $inc: { [`reactionCounts.${existing.emote}`]: -1 } })
    }
    return { emote: null }
  }

  if (existing) {
    const prev = existing.emote
    existing.emote = emote
    await existing.save()
    await Post.updateOne(
      { _id: postId },
      { $inc: { [`reactionCounts.${prev}`]: -1, [`reactionCounts.${emote}`]: 1 } },
    )
  } else {
    await Reaction.create({ post: postId, user: userId, emote })
    await Post.updateOne({ _id: postId }, { $inc: { [`reactionCounts.${emote}`]: 1 } })
  }
  return { emote }
}
