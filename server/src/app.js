import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { env } from './config/env.js'
import apiRoutes from './routes/index.js'
import { notFound, errorHandler } from './middlewares/error.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  // Serve uploaded images (dev). Swap for S3/CDN in production.
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)))

  app.use('/api', apiRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
