# MongoDB Performance Best Practices — "My Simple Space"

A concrete, app-specific playbook for scaling a Node.js + Mongoose + MongoDB + Redis
social app to **millions of messages and posts**. Tailored to the actual collections:
`User`, `Friendship`, `Conversation`, `Message`, `Post`, `Reaction`, `Comment`.

Guidance below was verified against current (2026) MongoDB / Mongoose documentation. Sources
are listed at the bottom. This is not generic advice — every index and snippet maps to one of
this app's real access patterns.

---

## 0. Access patterns (the source of truth)

Indexes exist to serve queries. Ours are:

| # | Path | Query | Sort | Hot? |
|---|------|-------|------|------|
| C1 | Chat — newest messages in a conversation | `find({conversationId})` | `_id` desc | Read+Write very hot |
| C2 | Chat — scroll up (older messages) | `find({conversationId, _id:{$lt:cursor}})` | `_id` desc | Hot |
| C3 | Receipts | `updateOne({_id, conversationId}, {$set/$addToSet})` | — | Hot write |
| F1 | Feed — friends' posts newest-first | `find({authorId:{$in:[...]}})` | `_id`/`createdAt` desc | Hot |
| F2 | Feed — load more | `find({authorId:{$in:[...]}, _id:{$lt:cursor}})` | `_id` desc | Hot |
| R1 | One reaction per user per post | upsert `{postId,userId}` | — | Medium |
| R2 | Reaction/comment counts on a post | denormalized `$inc` | — | Hot write |
| CM1 | Comments per post, paginated | `find({postId, _id:{$lt:cursor}})` | `_id` desc | Medium |
| P1 | A user's own posts | `find({authorId})` | `_id` desc | Medium |

> **Golden rule:** the index key order is decided by ESR — **E**quality, **S**ort, **R**ange —
> not by what "feels" related. Equality fields first, then the sort field, then any range
> predicate. Validate with `explain("executionStats")` and confirm there is **no `SORT` stage
> above the `IXSCAN`** and `totalDocsExamined` is close to `nReturned`.

---

## 1. Index strategy (per collection)

### `Message` — the hottest path

The dominant query is C1/C2: equality on `conversationId`, sort by `_id` descending, optional
`_id` range for the cursor. By ESR, `conversationId` (equality) leads, then `_id` (it is both
the sort key and the range key — a single field can serve both).

```js
// messageSchema
messageSchema.index({ conversationId: 1, _id: -1 });   // C1 + C2: list + scroll-up
```

- `_id: -1` matches the "newest first" sort direction. MongoDB can walk an index in either
  direction, but matching the sort direction lets a single index serve both this and any
  ascending variant; for a single-field-after-equality case the direction is cosmetic, but
  declaring it `-1` documents intent and keeps explain output clean.
- This index also **covers** the cursor range `_id: {$lt: cursor}` because `_id` is the second
  key — the planner does a bounded `IXSCAN`, never a collection scan.
- Do **not** add a separate `{conversationId: 1, createdAt: -1}` unless you sort by a
  *server-authoritative* `createdAt`. `_id` already embeds a creation timestamp (see §2).

Receipt/state queries (C3) ride the same prefix `{conversationId, _id}` when you address a
message by `(_id, conversationId)`, so no extra index is needed for the common "mark this
message seen" path.

If you support "unread per conversation" via a status field and query
`find({conversationId, status:'delivered'})`, add a **partial** index so it only stores the few
non-terminal messages:

```js
messageSchema.index(
  { conversationId: 1, status: 1, _id: -1 },
  { partialFilterExpression: { status: { $in: ['sent', 'delivered'] } } }
);
```

Partial indexes are smaller and faster than indexing every message's status (most are `seen`).

### `Conversation`

Lists a user's conversations, newest-activity-first. `participants` is an array (multikey), and
we sort by `lastMessageAt`:

```js
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
```

ESR: equality on `participants` (membership match), sort on `lastMessageAt`. Keep `participants`
**bounded** (see §3) — a multikey index over an unbounded participant array degrades.

### `Post` & feed

A user's own posts (P1):

```js
postSchema.index({ authorId: 1, _id: -1 });            // P1 and the per-author slice of F1/F2
```

The friend-feed (F1/F2) is `find({authorId: {$in: [friendIds]}}).sort({_id: -1})`. The same
`{authorId: 1, _id: -1}` index serves it: MongoDB expands the `$in` into one index-bound scan
per `authorId` and merges them in `_id` order. ESR treats a small/medium `$in` as **equality**,
so it stays in the leading position. (For very large `$in` arrays MongoDB treats it more like a
range — see §2 and §7.)

### `Reaction`

One reaction per user per post — enforce with a **unique compound** index. This both guarantees
the invariant and serves the "did this user react?" lookup:

```js
reactionSchema.index({ postId: 1, userId: 1 }, { unique: true });
// list reactions of a post, paginated:
reactionSchema.index({ postId: 1, _id: -1 });
```

The upsert in §4 relies on the unique index to be race-safe.

### `Comment`

```js
commentSchema.index({ postId: 1, _id: -1 });            // CM1: comments per post, scroll
```

### `Friendship`

Look up a user's friends in both directions. Store one row per directed edge (or query an
undirected pair). For the feed we need "all accepted friends of X" fast:

```js
friendshipSchema.index({ userId: 1, status: 1 });       // E,E — find accepted friends of userId
friendshipSchema.index({ pair: 1 }, { unique: true });  // canonical "min:max" string, dedupe edges
```

Cache the resolved friend-id list in Redis (§8) — the feed needs it on every load.

### `User`

```js
userSchema.index({ email: 1 }, { unique: true });
// case-insensitive handle lookup, only for users who set a handle:
userSchema.index(
  { handle: 1 },
  { unique: true, partialFilterExpression: { handle: { $exists: true, $ne: null } } }
);
```

Use a **partial** unique index (not legacy `sparse`) for optional-but-unique fields. The
`{$exists:true, $ne:null}` form is the current recommended pattern and avoids multiple-null
collisions while still letting many users have no handle.

#### Covered queries

A query is *covered* when every field it returns and filters on lives in one index, so MongoDB
never touches the document. Useful for hot existence checks. Example — "does this user already
react to this post?" returns only the indexed keys:

```js
Reaction.findOne({ postId, userId }, { _id: 0, postId: 1, userId: 1 }).lean(); // covered by the unique index
```

Drop `__v` from projections and avoid `select`-ing big fields to keep checks covered.

---

## 2. Cursor / keyset pagination

### Why `_id` works as a cursor

A MongoDB `ObjectId` is 12 bytes whose **leading 4 bytes are the creation time in seconds**.
So `_id` is monotonically increasing per process and sorts in roughly chronological order. That
makes it a free, always-indexed pagination cursor — no extra `createdAt` index required for chat.

### The pattern (chat scroll-up, C2)

```js
const PAGE = 30;
const q = { conversationId };
if (cursor) q._id = { $lt: new mongoose.Types.ObjectId(cursor) }; // older than last seen

const rows = await Message.find(q)
  .sort({ _id: -1 })
  .limit(PAGE + 1)          // fetch one extra
  .lean();

const hasMore = rows.length > PAGE;
const page = hasMore ? rows.slice(0, PAGE) : rows;
const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;
```

- **`$lt` for scrolling into the past** (descending), **`$gt` for "newer than"** (catching up /
  live tail).
- **`limit + 1` `hasMore` trick:** ask for one more than the page size; if you got it, there's a
  next page, and you don't need a separate `countDocuments()` (which would scan).
- This is **O(log n)** seek regardless of depth. `.skip(n)` is O(n) — it scans and discards `n`
  docs every page and gets linearly slower (see §7).

### The friend-feed `$in` case (F1/F2)

```js
const q = { authorId: { $in: friendIds } };
if (cursor) q._id = { $lt: new mongoose.Types.ObjectId(cursor) };

const rows = await Post.find(q).sort({ _id: -1 }).limit(PAGE + 1).lean();
```

Served by `{authorId: 1, _id: -1}`. The planner runs one bounded index scan per friend id,
each already in `_id` order, and merge-sorts them — no in-memory `SORT`, no collection scan.

### Pitfalls

1. **Timestamp collision / non-unique sort field.** `ObjectId` has only **1-second**
   resolution, so two docs in the same second have *no guaranteed order by timestamp* — but the
   full `_id` is still globally unique and totally ordered, so paginating on the **whole `_id`**
   (as above) is collision-safe. The danger is paginating on a *non-unique* field like
   `createdAt` alone — you can skip or repeat rows at page boundaries.
2. **Sorting by a non-unique field?** Use a **compound cursor** `(sortField, _id)` to break ties
   deterministically:

   ```js
   // sort by createdAt desc, tie-break by _id desc
   const q = lastCreatedAt
     ? { $or: [
         { createdAt: { $lt: lastCreatedAt } },
         { createdAt: lastCreatedAt, _id: { $lt: lastId } },
       ] }
     : {};
   Post.find(q).sort({ createdAt: -1, _id: -1 }).limit(PAGE + 1);
   ```
   Back it with `{createdAt: -1, _id: -1}`.
3. **Cursor must come from the same sort.** If the API ever changes sort order, old cursors
   become invalid — encode the sort into the cursor token.
4. **Don't trust client-supplied cursors blindly** — validate they're real ObjectIds before
   casting, or you'll throw on bad input.

---

## 3. Schema design for scale

### Reference, don't embed, for the high-volume children

- **Messages → reference `Conversation`.** A conversation has unbounded messages → never embed
  messages in the conversation document. One `Message` doc per message, `conversationId` ref.
- **Comments / Reactions → reference `Post`.** Same reasoning: unbounded, independently written,
  paginated on their own. Separate collections.

Embed only when data is **bounded, accessed together, and owned exclusively** by the parent
(e.g. a post's small set of media attachments).

### Denormalize the read-hot summaries

Maintain on the parent so feed/chat lists render without N+1 joins:

```js
// Conversation
{ lastMessage: { text, senderId, _id }, lastMessageAt: Date, messageCount: Number }
// Post
{ reactionCounts: { like: 0, love: 0, ... }, commentCount: 0 }
```

Update these atomically on write (§4). This is the single biggest win for feed/inbox latency —
the list query reads one document, not a fan-in over children.

### The bucket pattern for messages (apply later, when needed)

One-doc-per-message is correct to start. At extreme scale you can **bucket** N messages
(e.g. 50–100) per document, keyed by `conversationId` + a sequence/time window:

```js
// bucketed message doc
{ conversationId, bucketSeq, count, startId, endId, messages: [ {senderId, text, ts}, ... ] }
```

Buckets cut document count and index size and turn a page-load into one or two document reads.
**Cap each bucket** (e.g. `count < 100`) so it never approaches the 16MB limit; roll to a new
bucket via an atomic upsert when full. Only adopt this if profiling shows per-message document
overhead is the bottleneck — it complicates writes.

### 16MB limit & unbounded arrays — the two traps in THIS app

The BSON document cap is **16MB**. Two array fields here can grow without bound — fix both:

- **`Message.seenBy` / read receipts.** In a large group chat, an array of every viewer per
  message is unbounded and bloats the hot collection. Options, best first:
  1. For 1:1 and small groups: a **bounded** `seenBy: [userId]` with `$addToSet` is fine.
  2. For large groups: store receipts as **separate `Receipt` docs** (`{messageId, userId,
     state, ts}`) or, cheaper, track a **per-participant `lastReadMessageId`** on the
     conversation/membership — "seen up to here" instead of per-message arrays. This is O(1)
     per read instead of O(messages).
- **`Conversation.participants`.** Fine for DMs/small groups as a bounded array (and needed for
  the membership index). For large/feed-like rooms, move membership to a `Membership` collection
  (`{conversationId, userId, lastReadMessageId, role}`) to avoid an ever-growing array and a
  fat multikey index.

> Rule of thumb: if an array can grow with user activity and has no natural cap, it belongs in
> its own collection.

---

## 4. Write-path optimization

### Atomic counters — never read-modify-write

Two requests doing `read count -> +1 -> write` lose updates. Use the atomic `$inc` operator so
the increment happens server-side in one document-level-atomic op:

```js
// new comment: insert + bump counter
await Comment.create({ postId, authorId, text });
await Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

// reaction upsert (one per user) + correct count, race-safe
const res = await Reaction.updateOne(
  { postId, userId },
  { $setOnInsert: { type } },           // or $set to switch reaction type
  { upsert: true }
);
if (res.upsertedCount === 1) {
  await Post.updateOne({ _id: postId }, { $inc: { 'reactionCounts.like': 1 } });
}
```

The `{postId,userId}` **unique index** (§1) is what makes the upsert safe under concurrency: two
simultaneous reactions can't both insert. `$inc` is atomic at the document level — no app-side
lock or transaction needed for a single-doc counter.

For "switch reaction type" you need the old type to decrement the right counter; do it in a
`findOneAndUpdate` returning the previous doc, then `$inc` old−1/new+1, or wrap both in a
transaction if strict consistency matters. Approximate counts are usually acceptable for a
social feed — prefer the cheap path.

### Bulk operations

Fan-out and batch work should use **`bulkWrite`** (one round trip, ordered:false so one failure
doesn't abort the rest):

```js
await Message.bulkWrite(ops, { ordered: false });
// e.g. marking many messages delivered, or seeding test data
```

### Write concern

- Chat messages: default `w:1` is the right latency/durability trade-off; the message is acked
  once the primary has it. Use `{w:'majority'}` only for data you cannot lose on a primary
  failover (e.g. payments — not applicable here).
- Fire-and-forget telemetry/typing: you may even use `w:0`, but prefer Redis for that (§6).

### Keep the lastMessage denormalization atomic with the insert

```js
const msg = await Message.create({ conversationId, senderId, text });
await Conversation.updateOne(
  { _id: conversationId },
  { $set: { lastMessage: { text: msg.text, senderId, _id: msg._id }, lastMessageAt: msg.createdAt },
    $inc: { messageCount: 1 } }
);
```

---

## 5. When & how to shard (later, not now)

Don't shard until a single replica set's working set no longer fits in RAM or write throughput
saturates the primary. Sharding adds operational cost; a well-indexed replica set takes you very
far. When you do:

### `Message`

- **Recommended: `{conversationId: 1, _id: 1}` (compound, ranged).** Co-locates a conversation's
  messages on one shard so C1/C2 are **single-shard, targeted** queries. The trailing `_id`
  raises cardinality and prevents giant indivisible chunks for very active conversations.
- **`hashed` on `conversationId`** gives the most even write distribution and avoids hot-shard on
  a viral conversation, *but* makes range/sort scans within a conversation scatter-gather across
  all shards — bad for our dominant access pattern. Avoid unless write skew becomes the dominant
  problem.
- **Verdict:** prefer the **ranged compound** key; it matches our equality+sort pattern. Accept
  that a single mega-conversation can still be a hotspot and mitigate with bucketing (§3).

### `Post`

- **`{authorId: 1, _id: 1}`** keeps an author's posts together (good for P1), but the feed
  (`$in` over friends) becomes scatter-gather — acceptable because feed reads are cached and
  fan-out is naturally spread. Alternatively **hashed `_id`** for even distribution if author
  skew (celebrities) is severe.

### What NOT to do

- Don't pick a **monotonically increasing** shard key alone (raw `_id`, `createdAt`) for ranged
  sharding — all new writes hit the last chunk = a single hot shard. (Hashed fixes this but
  kills range queries.)
- Don't pick a **low-cardinality** key (`status`, `type`) — too few chunks, can't balance.
- Don't shard a collection you can't re-shard cheaply without first validating the key against
  `explain()` on real query shapes. Choose a key that makes your hot queries **targeted**, not
  broadcast.

---

## 6. TTL indexes & capped collections

### TTL indexes — auto-expiring data

A TTL index deletes documents a set time after a date field. Perfect for **ephemeral** data here:

```js
// Notifications: auto-purge after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

// Password-reset / email-verification tokens: expire at a precise time
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // delete when expiresAt passes
```

Notes: the TTL monitor runs ~every 60s, so deletion is approximate, not instant. TTL works on a
single date field only; don't TTL your chat messages unless the product is intentionally
ephemeral.

### Capped collections / Redis for transient signals

- **Typing indicators, presence, "is online":** do **not** put these in MongoDB. They are
  high-frequency, disposable, and read constantly — use **Redis** with short TTL keys
  (`SET typing:{convId}:{userId} 1 EX 5`) and pub/sub. This keeps the hot `Message` collection
  free of churn.
- **Capped collections** (fixed-size, auto-overwrite oldest, insertion-ordered) suit a bounded
  audit/event log or a recent-activity ring buffer. They can't grow past their cap and you can't
  delete from them individually — niche, but useful for "last N system events."

---

## 7. Anti-patterns to avoid (specific to this app)

1. **`.skip(n)` for deep pagination.** Linear scan-and-discard; page 1000 of a feed is brutal.
   Use keyset/`_id` cursors everywhere (§2). `skip` is acceptable only for tiny, shallow lists.
2. **Unbounded `$in` for the feed.** A user with 5,000 friends produces a 5,000-element `$in`.
   The planner does one scan per id; very large `$in` arrays balloon planning + execution.
   Mitigation: cap fan-out, or precompute a feed (fan-out-on-write into a `FeedEntry` collection)
   for users you follow who post a lot. Cache the friend-id list in Redis so you're not
   re-deriving it per request.
3. **Sorting without a matching index.** Any `find().sort()` whose sort key isn't an index prefix
   (after equality) triggers an in-memory `SORT` that **aborts at 100MB**. Every list query here
   must end its index with the sort key (`_id`/`createdAt`). Verify with `explain()`.
4. **Large fan-out-on-write.** Pushing every new post into every follower's mailbox is fine for
   normal users but pathological for celebrities (millions of writes per post). Use a **hybrid**:
   fan-out-on-write for normal accounts, fan-out-on-read (the `$in` query) for high-follower
   accounts.
5. **`$lookup` overuse.** Don't join `Message`/`Post` to `User` on every list read. Denormalize
   the few display fields you need (`senderName`, `authorAvatar`) onto the child, or batch-resolve
   user docs in the app and cache in Redis. `$lookup` on the hot path scales poorly and can't be
   sharded efficiently.
6. **Missing the `hasMore` trick / running `countDocuments` per page.** Counting scans the index;
   use `limit + 1` instead (§2).
7. **Indexing everything.** Each index slows writes and consumes RAM. Index only the query shapes
   in §0; drop unused indexes (`$indexStats`).

---

## 8. Read scaling

### Read preference

- Keep **chat and "did my write land" reads on the primary** (default `primary`) — secondaries
  lag and a user must see their own just-sent message.
- Route **analytics, counts, admin dashboards, and other staleness-tolerant reads** to
  `secondaryPreferred` to offload the primary. Set per-query, not globally:

  ```js
  Post.find(q).read('secondaryPreferred');
  ```
- The **feed** can tolerate slight staleness; `secondaryPreferred` is reasonable there once you
  have replicas to spare — but combine with caching first.

### Redis: cache vs query

Cache when data is **read-hot and either cheap-to-recompute-on-miss or tolerant of staleness**:

| Data | Store | Why |
|------|-------|-----|
| Presence / typing / online | **Redis only** | high churn, disposable |
| Unread counts per conversation | **Redis counter**, periodically reconciled | avoids a DB count on every inbox open |
| A user's friend-id list (for feed `$in`) | **Redis**, invalidate on friend change | derived every feed load |
| Rendered/first page of feed | **Redis** (short TTL) | most-requested, expensive to assemble |
| Authoritative messages, posts, reactions | **MongoDB** | source of truth, must be durable |

Pattern: read-through cache with explicit invalidation on write (e.g. bump unread in Redis when a
message is inserted; clear on read). Never let the cache become the source of truth for durable
data.

### Aggregation pipeline tips

When you must aggregate (e.g. grouping reactions, building a digest):

- **`$match` first**, and make its predicate hit an index — when `$match` is the first stage on
  indexed fields, MongoDB uses the index instead of a collection scan.
- **`$project`/`$limit` early** to shrink documents flowing through later stages.
- Put `$sort` **immediately after** an index-eligible `$match` so a `$sort` + `$limit` can use the
  index and a top-k optimization instead of sorting everything.
- Avoid `$lookup` in hot aggregations (§7). Set read preference per-aggregation when the result
  tolerates lag.

---

## Top 8 recommendations (summary)

1. **One compound index per hot query, ESR-ordered.** `Message {conversationId:1,_id:-1}`,
   `Post {authorId:1,_id:-1}`, `Comment {postId:1,_id:-1}`, `Reaction {postId:1,userId:1} unique`.
   Equality → Sort → Range, sort key last, verified with `explain()` (no `SORT` stage).
2. **Keyset pagination on `_id` everywhere; never `.skip()` at depth.** `$lt`/`$gt` + `limit+1`
   for `hasMore`. O(log n) regardless of how deep users scroll.
3. **Reference the high-volume children** (messages, comments, reactions are their own
   collections) and **denormalize the read-hot summaries** (`lastMessage`, `reactionCounts`,
   `commentCount`) onto the parent for one-document list reads.
4. **Kill unbounded arrays.** Replace per-message `seenBy` in large groups and unbounded
   `participants` with a per-member `lastReadMessageId` / a `Membership` collection — stay clear
   of the 16MB limit and fat multikey indexes.
5. **Atomic `$inc` + unique-index upserts for counters and one-per-user reactions** — never
   read-modify-write. Use `bulkWrite(ordered:false)` for fan-out/batch writes; `w:1` for chat.
6. **Push transient signals to Redis, not MongoDB** (presence, typing, unread counts, cached
   friend-id list, cached first feed page). Keep the hot `Message` collection free of churn.
7. **Defer sharding; when needed use ranged `{conversationId:1,_id:1}` for `Message`** (targeted
   chat reads) and `{authorId:1,_id:1}`/hashed `_id` for `Post`. Never shard on a monotonic or
   low-cardinality key.
8. **TTL-index ephemeral data** (notifications, tokens) and route staleness-tolerant reads to
   `secondaryPreferred`; in aggregations put `$match` first on an indexed field and avoid
   `$lookup` on the hot path.

---

## Sources (verified 2026)

- [The ESR (Equality, Sort, Range) Guideline — MongoDB Docs](https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/)
- [Query Optimization / Covered Queries — MongoDB Docs](https://www.mongodb.com/docs/manual/core/query-optimization/)
- [Cursor.skip() — MongoDB Docs](https://www.mongodb.com/docs/manual/reference/method/cursor.skip/)
- [Avoid Unbounded Arrays (Anti-pattern) — MongoDB Docs](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/)
- [Schema Design Anti-Patterns — MongoDB Docs](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/)
- [Choose a Shard Key / Hashed vs Ranged Sharding — MongoDB Docs](https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/)
- [Hashed Sharding](https://www.mongodb.com/docs/manual/core/hashed-sharding/) · [Ranged Sharding](https://www.mongodb.com/docs/manual/core/ranged-sharding/)
- [Write Operations Atomicity — MongoDB Docs](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- [Read Preference — MongoDB Docs](https://www.mongodb.com/docs/manual/core/read-preference/)
- [$match (aggregation) — MongoDB Docs](https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/)
- [Mongoose Guide — indexes / partialFilterExpression / bulkWrite](https://mongoosejs.com/docs/guide.html)
- [Performance Best Practices: Sharding — MongoDB Blog](https://www.mongodb.com/company/blog/mongodb/performance-best-practices-sharding)
- [How to Use the ESR Rule for Compound Index Design (2026)](https://oneuptime.com/blog/post/2026-03-31-mongodb-esr-rule-compound-index/view)
- [Implementing Cursor Pagination in MongoDB (2026)](https://oneuptime.com/blog/post/2026-03-31-mongodb-cursor-pagination/view)
