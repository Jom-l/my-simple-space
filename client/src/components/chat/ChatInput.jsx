import { useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { ImageUploader } from '../common/ImageUploader.jsx'

export function ChatInput({ onSend, onTyping }) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState('')
  const typingTimer = useRef(null)

  const handleChange = (e) => {
    setText(e.target.value)
    onTyping?.(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => onTyping?.(false), 1500)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() && !attachment) return
    onSend({
      text: text.trim(),
      attachments: attachment ? [{ url: attachment, type: 'image' }] : [],
    })
    setText('')
    setAttachment('')
    onTyping?.(false)
  }

  return (
    <form onSubmit={submit} className="border-t border-gray-100 p-3">
      {attachment && (
        <div className="relative mb-2 inline-block">
          <img src={attachment} alt="" className="max-h-32 rounded-lg" />
          <button
            type="button"
            onClick={() => setAttachment('')}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <ImageUploader label="" onUploaded={setAttachment} />
        <input
          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500"
          placeholder="Type a message…"
          value={text}
          onChange={handleChange}
        />
        <button className="rounded-full bg-brand-600 p-2.5 text-white hover:bg-brand-700">
          <Send size={18} />
        </button>
      </div>
    </form>
  )
}
