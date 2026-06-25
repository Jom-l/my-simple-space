import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(form)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-600">
          <Sparkles /> <span className="text-xl font-bold">My Simple Space</span>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <input
          className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
          placeholder="Username or email"
          value={form.usernameOrEmail}
          onChange={(e) => setForm({ ...form, usernameOrEmail: e.target.value })}
        />
        <input
          type="password"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand-600">
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}
