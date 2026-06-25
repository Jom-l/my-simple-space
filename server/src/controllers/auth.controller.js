import * as authService from '../services/auth.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { env, isProd } from '../config/env.js'

const REFRESH_COOKIE = 'refreshToken'

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })
}

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body)
  setRefreshCookie(res, refreshToken)
  res.status(201).json({ user, accessToken })
})

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body)
  setRefreshCookie(res, refreshToken)
  res.json({ user, accessToken })
})

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken
  const { accessToken, refreshToken } = await authService.refresh(token)
  setRefreshCookie(res, refreshToken)
  res.json({ accessToken })
})

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refreshToken)
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  res.json({ ok: true })
})
