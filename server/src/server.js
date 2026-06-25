import http from 'http'
import { env } from './config/env.js'
import { connectMongo } from './config/db.js'
import { redis } from './config/redis.js'
import { createApp } from './app.js'
import { initSockets } from './sockets/index.js'

async function start() {
  await connectMongo()

  const app = createApp()
  const httpServer = http.createServer(app)
  await initSockets(httpServer)

  httpServer.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`)
  })

  // Graceful shutdown.
  const shutdown = async (sig) => {
    console.log(`\n[server] ${sig} received, shutting down...`)
    httpServer.close()
    await redis.quit().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((err) => {
  console.error('[server] failed to start:', err)
  process.exit(1)
})
