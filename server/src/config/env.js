import dotenv from 'dotenv'

dotenv.config()

function required(key, fallback) {
  const val = process.env[key] ?? fallback
  if (val === undefined) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return val
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/my_simple_space'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10),
  },

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}

export const isProd = env.nodeEnv === 'production'
