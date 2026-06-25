import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Avatar } from '../common/Avatar.jsx'
import { ReactionBar } from './ReactionBar.jsx'
import { CommentList } from './CommentList.jsx'

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function PostCard({ post }) {
  const [showComments, setShowComments] = useState(false)
  const [count, setCount] = useState(post.commentCount || 0)

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-3">
        <Avatar user={post.author} size={42} />
        <div>
          <p className="text-sm font-semibold">{post.author?.displayName}</p>
          <p className="text-xs text-gray-400">
            @{post.author?.username} · {timeAgo(post.createdAt)}
          </p>
        </div>
      </header>

      {post.text && <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.text}</p>}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" className="mb-3 max-h-[28rem] w-full rounded-xl object-cover" />
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
        <ReactionBar post={post} />
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
        >
          <MessageSquare size={16} /> {count > 0 ? count : ''} Comment{count === 1 ? '' : 's'}
        </button>
      </div>

      {showComments && <CommentList postId={post._id} onAdded={() => setCount((c) => c + 1)} />}
    </article>
  )
}
