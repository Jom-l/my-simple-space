import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCursorList } from '../hooks/useCursorList.js'
import { chatApi } from '../api/endpoints.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../socket/SocketProvider.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import { ConversationList } from '../components/chat/ConversationList.jsx'
import { MessageList } from '../components/chat/MessageList.jsx'
import { ChatInput } from '../components/chat/ChatInput.jsx'
import { Avatar } from '../components/common/Avatar.jsx'
import { STATUS_LABELS } from '../components/common/StatusDot.jsx'

export default function Chat() {
  const { user } = useAuth()
  const socket = useSocket()
  const { setActiveConversation } = useNotifications()
  const [params, setParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [typing, setTyping] = useState(false)

  const activeId = active?._id || params.get('c')

  // Messages for the active conversation (newest-first from the API).
  const { items, setItems, hasMore, loading, loadMore } = useCursorList(
    (cursor) => (activeId ? chatApi.messages(activeId, cursor) : Promise.resolve({ items: [], nextCursor: null, hasMore: false })),
    [activeId],
  )
  // Display oldest -> newest (bottom = latest).
  const messages = useMemo(() => [...items].reverse(), [items])

  const otherUser = useMemo(() => {
    if (!active) return null
    return active.participants?.find((p) => String(p._id) !== String(user.id)) || active.participants?.[0]
  }, [active, user])

  const loadConversations = useCallback(async () => {
    const list = await chatApi.conversations()
    setConversations(list)
    return list
  }, [])

  useEffect(() => {
    loadConversations().then((list) => {
      const qid = params.get('c')
      if (qid && !active) {
        const found = list.find((c) => String(c._id) === qid)
        if (found) setActive(found)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Join the active conversation room + socket listeners.
  useEffect(() => {
    if (!socket || !activeId) return
    socket.emit('conversation:join', { conversationId: activeId })

    const onNew = (msg) => {
      if (String(msg.conversationId) !== String(activeId)) {
        // Bump unread on a background conversation.
        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) === String(msg.conversationId)
              ? { ...c, unread: (c.unread || 0) + 1, lastMessage: { text: msg.text || '📷 Photo' } }
              : c,
          ),
        )
        return
      }
      setItems((prev) => [msg, ...prev]) // newest at front
      if (String(msg.sender) !== String(user.id)) {
        socket.emit('message:seen', { conversationId: activeId, messageId: msg._id })
      }
    }

    const onSeen = ({ userId, messageId }) => {
      if (String(userId) === String(user.id)) return
      setItems((prev) =>
        prev.map((m) =>
          String(m._id) <= String(messageId) && !m.seenBy?.some((s) => String(s.user) === String(userId))
            ? { ...m, seenBy: [...(m.seenBy || []), { user: userId }] }
            : m,
        ),
      )
    }

    const onTyping = ({ conversationId, userId }) => {
      if (String(conversationId) === String(activeId) && String(userId) !== String(user.id)) setTyping(true)
    }
    const onTypingStop = ({ conversationId }) => {
      if (String(conversationId) === String(activeId)) setTyping(false)
    }
    const onPresence = ({ userId, status }) => {
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) => (String(p._id) === String(userId) ? { ...p, status } : p)),
        })),
      )
      setActive((a) =>
        a
          ? { ...a, participants: a.participants.map((p) => (String(p._id) === String(userId) ? { ...p, status } : p)) }
          : a,
      )
    }

    socket.on('message:new', onNew)
    socket.on('message:seen', onSeen)
    socket.on('typing:start', onTyping)
    socket.on('typing:stop', onTypingStop)
    socket.on('presence:update', onPresence)

    return () => {
      socket.emit('conversation:leave', { conversationId: activeId })
      socket.off('message:new', onNew)
      socket.off('message:seen', onSeen)
      socket.off('typing:start', onTyping)
      socket.off('typing:stop', onTypingStop)
      socket.off('presence:update', onPresence)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeId])

  // Keep the global notification badge in sync with the open chat.
  useEffect(() => {
    setActiveConversation(activeId || null)
    return () => setActiveConversation(null)
  }, [activeId, setActiveConversation])

  // On opening a conversation, clear its unread + mark newest seen.
  useEffect(() => {
    if (!activeId) return
    setConversations((prev) => prev.map((c) => (String(c._id) === String(activeId) ? { ...c, unread: 0 } : c)))
    const latest = items[0]
    if (latest && socket) socket.emit('message:seen', { conversationId: activeId, messageId: latest._id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, items.length === 0 ? null : items[0]?._id])

  const select = (c) => {
    setActive(c)
    setParams({ c: c._id })
    setTyping(false)
  }

  const send = (payload) => {
    socket?.emit('message:send', { conversationId: activeId, ...payload })
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-2xl bg-white shadow-sm">
      <ConversationList
        conversations={conversations}
        currentUserId={user.id}
        activeId={activeId}
        onSelect={select}
      />

      {active ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Avatar user={otherUser} size={40} showStatus />
            <div>
              <p className="text-sm font-semibold">{otherUser?.displayName}</p>
              <p className="text-xs text-gray-400">
                {typing ? 'typing…' : STATUS_LABELS[otherUser?.status] || 'Offline'}
              </p>
            </div>
          </header>

          <MessageList
            messages={messages}
            hasMore={hasMore}
            loadingOlder={loading}
            onLoadOlder={loadMore}
            currentUserId={user.id}
            otherUserId={otherUser?._id}
          />

          <ChatInput
            onSend={send}
            onTyping={(isTyping) =>
              socket?.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId: activeId })
            }
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  )
}
