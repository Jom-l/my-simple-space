import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useSocket } from '../socket/SocketProvider.jsx'
import { chatApi, friendApi } from '../api/endpoints.js'

const NotificationsContext = createContext(null)
export const useNotifications = () => useContext(NotificationsContext)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const socket = useSocket()

  // Per-conversation unread map -> nav badge = sum of values.
  const [convUnread, setConvUnread] = useState({})
  const [requestCount, setRequestCount] = useState(0)
  // Conversation currently open on screen (don't badge messages the user sees).
  const activeConvRef = useRef(null)

  const messageUnread = useMemo(
    () => Object.values(convUnread).reduce((a, b) => a + (b || 0), 0),
    [convUnread],
  )

  // Initial counts on login.
  useEffect(() => {
    if (!user) {
      setConvUnread({})
      setRequestCount(0)
      return
    }
    ;(async () => {
      try {
        const [convos, requests] = await Promise.all([chatApi.conversations(), friendApi.requests()])
        const map = {}
        convos.forEach((c) => {
          if (c.unread > 0) map[c._id] = c.unread
        })
        setConvUnread(map)
        setRequestCount(requests.length)
      } catch {
        /* ignore */
      }
    })()
  }, [user])

  // Global socket listeners — fire regardless of which page is mounted.
  useEffect(() => {
    if (!socket || !user) return

    const onMessage = (msg) => {
      if (String(msg.sender) === String(user.id)) return
      if (String(msg.conversationId) === String(activeConvRef.current)) return
      setConvUnread((prev) => ({
        ...prev,
        [msg.conversationId]: (prev[msg.conversationId] || 0) + 1,
      }))
    }
    const onFriendRequest = () => setRequestCount((c) => c + 1)

    socket.on('message:new', onMessage)
    socket.on('friend:request', onFriendRequest)
    return () => {
      socket.off('message:new', onMessage)
      socket.off('friend:request', onFriendRequest)
    }
  }, [socket, user])

  // Receive every conversation's messages so badges update before opening them.
  useEffect(() => {
    if (!socket || !user) return
    ;(async () => {
      try {
        const convos = await chatApi.conversations()
        convos.forEach((c) => socket.emit('conversation:join', { conversationId: c._id }))
      } catch {
        /* ignore */
      }
    })()
  }, [socket, user])

  const setActiveConversation = useCallback((convId) => {
    activeConvRef.current = convId
    if (convId) {
      setConvUnread((prev) => {
        if (!prev[convId]) return prev
        const next = { ...prev }
        delete next[convId]
        return next
      })
    }
  }, [])

  const refreshFriendRequests = useCallback(async () => {
    try {
      const requests = await friendApi.requests()
      setRequestCount(requests.length)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <NotificationsContext.Provider
      value={{ messageUnread, requestCount, convUnread, setActiveConversation, refreshFriendRequests }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
