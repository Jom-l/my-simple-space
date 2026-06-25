import axios from 'axios'

// Access token lives in memory only; the refresh token is an httpOnly cookie.
let accessToken = null
const listeners = new Set()

export function setAccessToken(token) {
  accessToken = token
  listeners.forEach((fn) => fn(token))
}
export function getAccessToken() {
  return accessToken
}
export function onTokenChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// On 401, try one silent refresh then replay the request.
let refreshing = null
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios.post('/api/auth/refresh', {}, { withCredentials: true }).finally(() => {
            refreshing = null
          })
        const { data } = await refreshing
        setAccessToken(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        setAccessToken(null)
      }
    }
    return Promise.reject(error)
  },
)
