import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { userApi } from '../api/endpoints.js'
import { Avatar } from '../components/common/Avatar.jsx'
import { ImageUploader } from '../components/common/ImageUploader.jsx'

export default function Settings() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || '',
  })
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    try {
      const updated = await userApi.updateProfile(form)
      setUser((u) => ({ ...u, ...updated }))
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold">Profile settings</h2>
      <form onSubmit={save} className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, avatarUrl: form.avatarUrl }} size={64} />
          <ImageUploader label="Change photo" onUploaded={(url) => setForm((f) => ({ ...f, avatarUrl: url }))} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Display name</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Bio</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={busy}
            className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </form>
    </div>
  )
}
