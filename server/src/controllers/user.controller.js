import { User } from '../models/User.js'
import * as presence from '../services/presence.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) throw ApiError.notFound('User not found')
  res.json({ user: user.toPublic() })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, { $set: req.body }, { new: true })
  if (!user) throw ApiError.notFound('User not found')
  res.json({ user: user.toPublic() })
})

export const setStatus = asyncHandler(async (req, res) => {
  const effective = await presence.setManualStatus(req.userId, req.body.status)
  res.json({ status: effective })
})

export const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ users: [] })
  const users = await User.find({
    _id: { $ne: req.userId },
    $or: [
      { username: new RegExp('^' + q, 'i') },
      { displayName: new RegExp(q, 'i') },
    ],
  })
    .limit(10)
    .lean()
  res.json({ users: users.map((u) => ({ id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl })) })
})
