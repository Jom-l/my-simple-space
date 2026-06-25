import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.details?.[0]?.message
      setError(detail || err.response?.data?.error || 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  const field = (key, props = {}) => (
    <input
      className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-brand-500"
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      {...props}
    />
  )

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-600">
          <Sparkles /> <span className="text-xl font-bold">Join Simple Space</span>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {field('displayName', { placeholder: 'Display name' })}
        {field('username', { placeholder: 'Username' })}
        {field('email', { placeholder: 'Email', type: 'email' })}
        {field('password', { placeholder: 'Password (min 8 chars)', type: 'password' })}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
