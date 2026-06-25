import { useState } from 'react'
import { X } from 'lucide-react'
import { postApi } from '../../api/endpoints.js'
import { ImageUploader } from '../common/ImageUploader.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { Avatar } from '../common/Avatar.jsx'

export function PostComposer({ onPosted }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() && !imageUrl) return
    setBusy(true)
    try {
      const post = await postApi.create({ text: text.trim(), imageUrl })
      onPosted({ ...post, myReaction: null })
      setText('')
      setImageUrl('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar user={user} size={42} />
        <textarea
          rows={2}
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
          placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0]}?`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {imageUrl && (
        <div className="relative mt-3 ml-14">
          <img src={imageUrl} alt="" className="max-h-60 rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => setImageUrl('')}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between pl-14">
        <ImageUploader onUploaded={setImageUrl} />
        <button
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-1.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}
