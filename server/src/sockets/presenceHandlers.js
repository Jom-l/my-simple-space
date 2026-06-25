import * as presence from '../services/presence.service.js'
import { getFriendIds } from '../services/friend.service.js'
import { room } from './emitter.js'

// Tell a user's friends about their current status.
async function broadcastStatus(io, userId, status) {
  const friendIds = await getFriendIds(userId)
  friendIds.forEach((fid) =>
    io.to(room.user(fid)).emit('presence:update', { userId, status }),
  )
}

export function registerPresenceHandlers(io, socket) {
  const { userId } = socket

  presence.addSocket(userId, socket.id).then((status) => broadcastStatus(io, userId, status))

  // Manual status change (online / do_not_disturb / away / offline).
  socket.on('presence:set', async ({ status }) => {
    const effective = await presence.setManualStatus(userId, status)
    await broadcastStatus(io, userId, effective)
  })

  socket.on('disconnect', async () => {
    const status = await presence.removeSocket(userId, socket.id)
    await broadcastStatus(io, userId, status)
  })
}
