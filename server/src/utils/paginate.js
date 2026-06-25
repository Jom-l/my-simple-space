import mongoose from 'mongoose'

const { ObjectId } = mongoose.Types

export function parseCursor(raw) {
  if (!raw) return null
  if (!ObjectId.isValid(raw)) return null
  return new ObjectId(raw)
}

export function clampLimit(raw, def = 10, max = 50) {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return def
  return Math.min(n, max)
}

/**
 * Keyset pagination on _id (descending = newest first).
 * cursor = last (oldest) _id of the previous page; returns the next older page.
 * Uses limit+1 to compute hasMore without a count query.
 *
 * @returns {Promise<{items: any[], nextCursor: string|null, hasMore: boolean}>}
 */
export async function paginateByCursor(model, filter, { cursor, limit = 10, populate } = {}) {
  const query = { ...filter }
  if (cursor) {
    query._id = { ...(query._id || {}), $lt: cursor }
  }

  let q = model.find(query).sort({ _id: -1 }).limit(limit + 1)
  if (populate) q = q.populate(populate)

  const rows = await q.lean().exec()
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = items.length ? String(items[items.length - 1]._id) : null

  return { items, nextCursor, hasMore }
}
