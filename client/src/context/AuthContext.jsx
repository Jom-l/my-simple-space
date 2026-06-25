import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { setAccessToken } from '../api/client.js'
import { authApi, userApi } from '../api/endpoints.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On boot, try to restore a session via the refresh cookie.
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        setAccessToken(data.accessToken)
        const me = await userApi.me()
        setUser(me)
      } catch {
        setAccessToken(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async (creds) => {
    const { user, accessToken } = await authApi.login(creds)
    setAccessToken(accessToken)
    setUser(user)
  }, [])

  const register = useCallback(async (data) => {
    const { user, accessToken } = await authApi.register(data)
    setAccessToken(accessToken)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
