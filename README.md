# My Simple Space

A small, friends-first social network: friends-only feed, real-time chat, presence, reactions, and comments.

## Stack

- **Client** — React (Vite, JavaScript) + Tailwind CSS v4 + lucide-react
- **Server** — Node.js + Express 5 + Socket.IO
- **Database** — MongoDB (Mongoose), indexed for scale
- **Cache / realtime** — Redis (sessions, presence, unread counters, Socket.IO adapter)

## Features

- **Auth** — JWT access + refresh, Redis-backed revocable sessions.
- **Friends** — request / accept / decline. You must be friends before chatting or seeing posts.
- **Chat** — real-time (Socket.IO), multiple conversations, autoscroll, upward cursor pagination (load older on scroll up), `sent` / `delivered` / `seen` receipts, typing, per-conversation unread counts.
- **Presence** — `online` / `do_not_disturb` / `away` / `offline` (manual override + auto from sockets).
- **Posts** — friends-only feed with cursor "load more on scroll", photos, comments, default-emote reactions (👍 ❤️ 😂 😮 😢 😡).
- **Settings** — edit profile + avatar.

## Scale notes

All listing endpoints use **keyset (cursor) pagination on `_id`** — never `.skip()`. The `_id` (ObjectId) embeds a creation-time millisecond, so it doubles as the chronological cursor. Hot queries are backed by matching compound indexes (`Message {conversationId, _id:-1}`, `Post {author, _id:-1}`, etc.). See `docs/mongodb-best-practices.md`.

## Prerequisites

- Node.js 20+ (built on 24)
- MongoDB running locally (or set `MONGO_URI`)
- Redis running locally (or set `REDIS_URL`)

## Setup

```bash
# Backend
cd server
cp .env.example .env        # adjust secrets / URIs
npm install
npm run dev                 # http://localhost:5000

# Frontend (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api + /socket.io)
```

## Layout

```
client/   React + Vite + Tailwind v4 SPA
server/   Express API, Socket.IO, Mongoose models, Redis
docs/     MongoDB best-practices report
```
