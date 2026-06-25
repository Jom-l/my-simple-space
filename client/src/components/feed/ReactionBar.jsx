import { useState } from 'react'
import { postApi } from '../../api/endpoints.js'

// Default emote set (matches server EMOTES).
export const EMOTES = [
  { key: 'like', emoji: '👍' },
  { key: 'love', emoji: '❤️' },
  { key: 'haha', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'sad', emoji: '😢' },
  { key: 'angry', emoji: '😡' },
]

export function ReactionBar({ post }) {
  const [mine, setMine] = useState(post.myReaction || null)
  const [counts, setCounts] = useState(post.reactionCounts || {})
  const [open, setOpen] = useState(false)

  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)

  const react = async (emote) => {
    setOpen(false)
    const target = mine === emote ? null : emote
    // Optimistic update.
    setCounts((c) => {
      const next = { ...c }
      if (mine) next[mine] = Math.max(0, (next[mine] || 0) - 1)
      if (target) next[target] = (next[target] || 0) + 1
      return next
    })
    setMine(target)
    try {
      await postApi.react(post._id, target)
    } catch {
      // revert on failure
      setMine(post.myReaction || null)
      setCounts(post.reactionCounts || {})
    }
  }

  const current = EMOTES.find((e) => e.key === mine)

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => (mine ? react(mine) : setOpen((o) => !o))}
        onMouseEnter={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          mine ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <span>{current ? current.emoji : '👍'}</span>
        {current ? current.key : 'React'}
      </button>
      {total > 0 && <span className="text-xs text-gray-400">{total}</span>}

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute -top-12 left-0 z-10 flex gap-1 rounded-full bg-white px-2 py-1 shadow-lg ring-1 ring-gray-100"
        >
          {EMOTES.map((e) => (
            <button
              key={e.key}
              onClick={() => react(e.key)}
              title={e.key}
              className="text-xl transition hover:scale-125"
            >
              {e.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
