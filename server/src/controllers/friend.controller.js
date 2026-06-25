import * as friendService from '../services/friend.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { emitToUser } from '../sockets/emitter.js'

export const sendRequest = asyncHandler(async (req, res) => {
  const fr = await friendService.sendRequest(req.userId, req.body.username)
  emitToUser(fr.recipient, 'friend:request', { from: req.userId })
  res.status(201).json({ request: fr })
})

export const accept = asyncHandler(async (req, res) => {
  const fr = await friendService.respondToRequest(req.userId, req.params.id, true)
  emitToUser(fr.requester, 'friend:accepted', { by: req.userId })
  res.json({ request: fr })
})

export const decline = asyncHandler(async (req, res) => {
  const fr = await friendService.respondToRequest(req.userId, req.params.id, false)
  res.json({ request: fr })
})

export const listFriends = asyncHandler(async (req, res) => {
  const friends = await friendService.listFriends(req.userId)
  res.json({
    friends: friends.map((u) => ({
      id: u._id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      status: u.status,
    })),
  })
})

export const listRequests = asyncHandler(async (req, res) => {
  const requests = await friendService.listPendingRequests(req.userId)
  res.json({ requests })
})
