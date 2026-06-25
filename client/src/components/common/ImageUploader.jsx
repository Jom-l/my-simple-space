import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { uploadApi } from '../../api/endpoints.js'

// Uploads an image and returns its URL via onUploaded.
export function ImageUploader({ onUploaded, label = 'Photo' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const { url } = await uploadApi.image(file)
      onUploaded(url)
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        {label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handle} />
    </>
  )
}
