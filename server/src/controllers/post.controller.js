import * as posts from '../services/post.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { clampLimit } from '../utils/paginate.js'

export const create = asyncHandler(async (req, res) => {
  const post = await posts.createPost(req.userId, req.body)
  res.status(201).json({ post })
})

export const feed = asyncHandler(async (req, res) => {
  const page = await posts.getFeed(req.userId, {
    cursor: req.query.cursor,
    limit: clampLimit(req.query.limit),
  })
  res.json(page)
})

export const comments = asyncHandler(async (req, res) => {
  const page = await posts.getComments(req.userId, req.params.id, {
    cursor: req.query.cursor,
    limit: clampLimit(req.query.limit),
  })
  res.json(page)
})

export const addComment = asyncHandler(async (req, res) => {
  const comment = await posts.addComment(req.userId, req.params.id, req.body.text)
  res.status(201).json({ comment })
})

export const react = asyncHandler(async (req, res) => {
  const result = await posts.setReaction(req.userId, req.params.id, req.body.emote ?? null)
  res.json(result)
})
