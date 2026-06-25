import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'

const SocketContext = createContext(null)
export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!user) {
      ref.current?.disconnect()
      ref.current = null
      setSocket(null)
      return
    }

    const s = io('/', {
      auth: { token: getAccessToken() },
      withCredentials: true,
    })
    ref.current = s
    setSocket(s)

    return () => {
      s.disconnect()
      ref.current = null
    }
  }, [user])

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}
