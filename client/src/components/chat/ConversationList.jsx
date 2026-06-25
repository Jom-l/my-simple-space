import { Avatar } from '../common/Avatar.jsx'

export function ConversationList({ conversations, currentUserId, activeId, onSelect }) {
  const other = (c) => c.participants.find((p) => String(p._id) !== String(currentUserId)) || c.participants[0]

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-gray-100">
      <h2 className="px-4 py-3 text-sm font-semibold text-gray-500">Chats</h2>
      {conversations.length === 0 && (
        <p className="px-4 text-sm text-gray-400">No conversations yet. Start one from Friends.</p>
      )}
      {conversations.map((c) => {
        const o = other(c)
        return (
          <button
            key={c._id}
            onClick={() => onSelect(c)}
            className={`flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
              String(activeId) === String(c._id) ? 'bg-brand-50' : ''
            }`}
          >
            <Avatar user={o} size={44} showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{o?.displayName}</p>
              <p className="truncate text-xs text-gray-400">{c.lastMessage?.text || 'No messages yet'}</p>
            </div>
            {c.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                {c.unread}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
