import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { useCursorList } from '../hooks/useCursorList.js'
import { postApi } from '../api/endpoints.js'
import { PostComposer } from '../components/feed/PostComposer.jsx'
import { PostCard } from '../components/feed/PostCard.jsx'

export default function Feed() {
  const { items, setItems, hasMore, loading, loadMore } = useCursorList(
    (cursor) => postApi.feed(cursor),
    [],
  )
  const sentinel = useRef(null)

  // Infinite scroll downward: load the next page when the sentinel appears.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PostComposer onPosted={(post) => setItems((prev) => [post, ...prev])} />

      {items.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}

      {!loading && items.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
          Your feed is empty. Add friends and create your first post!
        </p>
      )}

      <div ref={sentinel} className="flex justify-center py-4">
        {loading && <Loader2 className="animate-spin text-brand-500" />}
        {!hasMore && items.length > 0 && <span className="text-xs text-gray-300">You're all caught up</span>}
      </div>
    </div>
  )
}
