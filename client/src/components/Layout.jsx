import { NavLink, useNavigate } from 'react-router-dom'
import { Home, MessageCircle, Users, Settings, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar } from './common/Avatar.jsx'
import { StatusPicker } from './StatusPicker.jsx'

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
  }`

export function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-4 px-4 py-4">
      <aside className="flex w-56 shrink-0 flex-col rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-6 flex items-center gap-2 px-2 text-brand-600">
          <Sparkles size={22} />
          <span className="font-bold">Simple Space</span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={linkClass}>
            <Home size={18} /> Feed
          </NavLink>
          <NavLink to="/chat" className={linkClass}>
            <MessageCircle size={18} /> Chat
          </NavLink>
          <NavLink to="/friends" className={linkClass}>
            <Users size={18} /> Friends
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            <Settings size={18} /> Settings
          </NavLink>
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <StatusPicker />
          <div className="flex items-center gap-2 px-2">
            <Avatar user={user} size={36} showStatus />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.displayName}</p>
              <p className="truncate text-xs text-gray-400">@{user?.username}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
