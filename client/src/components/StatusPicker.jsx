import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../socket/SocketProvider.jsx'
import { StatusDot, STATUS_LABELS } from './common/StatusDot.jsx'
import { userApi } from '../api/endpoints.js'

const OPTIONS = ['online', 'do_not_disturb', 'away', 'offline']

export function StatusPicker() {
  const { user, setUser } = useAuth()
  const socket = useSocket()

  const change = async (status) => {
    const { status: effective } = await userApi.setStatus(status)
    setUser((u) => ({ ...u, status: effective }))
    socket?.emit('presence:set', { status })
  }

  return (
    <div className="rounded-lg border border-gray-100 px-2 py-2">
      <p className="mb-1 px-1 text-xs font-medium text-gray-400">Status</p>
      <select
        value={user?.status || 'offline'}
        onChange={(e) => change(e.target.value)}
        className="w-full rounded-md border-0 bg-gray-50 py-1.5 pl-2 text-sm focus:ring-2 focus:ring-brand-500"
      >
        {OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <div className="mt-1 flex items-center gap-1.5 px-1">
        <StatusDot status={user?.status} size={10} />
        <span className="text-xs text-gray-500">{STATUS_LABELS[user?.status] || 'Offline'}</span>
      </div>
    </div>
  )
}
