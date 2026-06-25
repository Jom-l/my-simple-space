import { StatusDot } from './StatusDot.jsx'

export function Avatar({ user, size = 40, showStatus = false }) {
  const initials = (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase()
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      )}
      {showStatus && user?.status && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot status={user.status} />
        </span>
      )}
    </div>
  )
}
