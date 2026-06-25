import mongoose from 'mongoose'
import { env } from './env.js'

// Single pooled connection reused across the whole app.
export async function connectMongo() {
  mongoose.set('strictQuery', true)

  mongoose.connection.on('connected', () => {
    console.log('[mongo] connected')
  })
  mongoose.connection.on('error', (err) => {
    console.error('[mongo] error:', err.message)
  })
  mongoose.connection.on('disconnected', () => {
    console.warn('[mongo] disconnected')
  })

  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 10000,
  })

  // Build indexes in dev; in prod manage them explicitly/offline.
  if (env.nodeEnv !== 'production') {
    await mongoose.connection.syncIndexes().catch((e) =>
      console.warn('[mongo] syncIndexes warning:', e.message),
    )
  }

  return mongoose.connection
}
