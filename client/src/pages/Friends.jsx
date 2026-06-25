import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Check, X, MessageCircle } from 'lucide-react'
import { friendApi, chatApi } from '../api/endpoints.js'
import { Avatar } from '../components/common/Avatar.jsx'

export default function Friends() {
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [f, r] = await Promise.all([friendApi.list(), friendApi.requests()])
    setFriends(f)
    setRequests(r)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const send = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      await friendApi.send(username.trim())
      setMsg({ type: 'ok', text: `Request sent to @${username}` })
      setUsername('')
    } catch (err) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Failed' })
    }
  }

  const respond = async (id, accept) => {
    accept ? await friendApi.accept(id) : await friendApi.decline(id)
    load()
  }

  const openChat = async (friendId) => {
    const convo = await chatApi.start(friendId)
    navigate(`/chat?c=${convo._id}`)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UserPlus size={18} /> Add a friend
        </h2>
        <form onSubmit={send} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
            placeholder="Enter a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button className="rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700">
            Send
          </button>
        </form>
        {msg && (
          <p className={`mt-2 text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
            {msg.text}
          </p>
        )}
      </section>

      {requests.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Friend requests ({requests.length})</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r._id} className="flex items-center gap-3">
                <Avatar user={r.requester} size={36} />
                <span className="flex-1 text-sm font-medium">{r.requester.displayName}</span>
                <button
                  onClick={() => respond(r._id, true)}
                  className="rounded-lg bg-green-100 p-2 text-green-700 hover:bg-green-200"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => respond(r._id, false)}
                  className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-gray-400">No friends yet. Add someone above.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3">
                <Avatar user={f} size={36} showStatus />
                <div className="flex-1">
                  <p className="text-sm font-medium">{f.displayName}</p>
                  <p className="text-xs text-gray-400">@{f.username}</p>
                </div>
                <button
                  onClick={() => openChat(f.id)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
                >
                  <MessageCircle size={16} /> Chat
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
