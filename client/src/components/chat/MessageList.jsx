import { useEffect, useLayoutEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble.jsx'

/**
 * messages: display order (oldest -> newest, bottom = latest)
 * onLoadOlder: called when user scrolls to top; prepends older messages.
 * Preserves scroll position on prepend; autoscrolls to bottom on new message
 * only when the user is already near the bottom.
 */
export function MessageList({ messages, hasMore, loadingOlder, onLoadOlder, currentUserId, otherUserId }) {
  const containerRef = useRef(null)
  const prevFirstId = useRef(null)
  const prevLastId = useRef(null)
  const prevHeight = useRef(0)
  const wasNearBottom = useRef(true)

  // Track near-bottom state on every scroll; trigger older-load at the top.
  const onScroll = () => {
    const el = containerRef.current
    if (!el) return
    wasNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (el.scrollTop < 60 && hasMore && !loadingOlder) {
      prevHeight.current = el.scrollHeight
      onLoadOlder()
    }
  }

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const first = messages[0]?._id
    const last = messages[messages.length - 1]?._id

    if (prevFirstId.current && first !== prevFirstId.current && last === prevLastId.current) {
      // Older messages prepended -> keep viewport anchored.
      el.scrollTop = el.scrollHeight - prevHeight.current
    } else if (last !== prevLastId.current) {
      // New message at bottom (or first load) -> scroll down if appropriate.
      if (wasNearBottom.current || prevLastId.current === null) {
        el.scrollTop = el.scrollHeight
      }
    }
    prevFirstId.current = first
    prevLastId.current = last
  }, [messages])

  // Always land at the bottom when switching conversations.
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [currentUserId, otherUserId])

  return (
    <div ref={containerRef} onScroll={onScroll} className="flex-1 space-y-1.5 overflow-y-auto bg-gray-50 p-4">
      {loadingOlder && (
        <div className="flex justify-center py-2">
          <Loader2 size={18} className="animate-spin text-brand-400" />
        </div>
      )}
      {!hasMore && messages.length > 0 && (
        <p className="py-2 text-center text-xs text-gray-300">Beginning of conversation</p>
      )}
      {messages.map((m) => (
        <MessageBubble
          key={m._id}
          message={m}
          mine={String(m.sender) === String(currentUserId)}
          otherUserId={otherUserId}
        />
      ))}
    </div>
  )
}
