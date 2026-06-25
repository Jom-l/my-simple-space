import { Check, CheckCheck } from 'lucide-react'

function time(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, mine, otherUserId }) {
  // Receipt state for my own messages.
  const seen = (message.seenBy || []).some((s) => String(s.user) === String(otherUserId))
  const delivered = (message.deliveredTo || []).some((u) => String(u) === String(otherUserId))

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
          mine ? 'bg-brand-600 text-white' : 'bg-white text-gray-800 shadow-sm'
        }`}
      >
        {message.attachments?.map((a, i) => (
          <img key={i} src={a.url} alt="" className="mb-1 max-h-60 rounded-lg object-cover" />
        ))}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-brand-100' : 'text-gray-400'}`}>
          <span>{time(message.createdAt)}</span>
          {mine &&
            (seen ? (
              <CheckCheck size={13} className="text-sky-200" />
            ) : delivered ? (
              <CheckCheck size={13} />
            ) : (
              <Check size={13} />
            ))}
        </div>
      </div>
    </div>
  )
}
