import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Generic keyset/cursor pagination.
 * fetcher(cursor) -> { items, nextCursor, hasMore }
 * Items accumulate in fetch order (newest -> older).
 */
export function useCursorList(fetcher, deps = []) {
  const [items, setItems] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const cursorRef = useRef(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const data = await fetcher(cursorRef.current)
      cursorRef.current = data.nextCursor
      setHasMore(data.hasMore)
      setItems((prev) => [...prev, ...data.items])
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore])

  const reset = useCallback(() => {
    cursorRef.current = null
    setHasMore(true)
    setItems([])
  }, [])

  // Reset + initial load when deps change.
  useEffect(() => {
    cursorRef.current = null
    setHasMore(true)
    setItems([])
    let cancelled = false
    ;(async () => {
      loadingRef.current = true
      setLoading(true)
      try {
        const data = await fetcher(null)
        if (cancelled) return
        cursorRef.current = data.nextCursor
        setHasMore(data.hasMore)
        setItems(data.items)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { items, setItems, hasMore, loading, loadMore, reset }
}
