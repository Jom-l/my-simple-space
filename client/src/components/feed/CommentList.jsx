import { useState } from 'react'
import { Send } from 'lucide-react'
import { useCursorList } from '../../hooks/useCursorList.js'
import { postApi } from '../../api/endpoints.js'
import { Avatar } from '../common/Avatar.jsx'

export function CommentList({ postId, onAdded }) {
  const { items, setItems, hasMore, loading, loadMore } = useCursorList(
    (cursor) => postApi.comments(postId, cursor),
    [postId],
  )
  const [text, setText] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const comment = await postApi.addComment(postId, text.trim())
    // newest-first list -> prepend
    setItems((prev) => [comment, ...prev])
    setText('')
    onAdded?.()
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <form onSubmit={submit} className="mb-3 flex gap-2">
        <input
          className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="rounded-full bg-brand-600 p-2 text-white hover:bg-brand-700">
          <Send size={16} />
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c._id} className="flex gap-2">
            <Avatar user={c.author} size={28} />
            <div className="rounded-2xl bg-gray-50 px-3 py-1.5">
              <p className="text-xs font-semibold">{c.author?.displayName}</p>
              <p className="text-sm">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button onClick={loadMore} disabled={loading} className="mt-2 text-xs font-medium text-brand-600">
          {loading ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </div>
  )
}
