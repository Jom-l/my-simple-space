import { ApiError } from '../utils/ApiError.js'
import { isProd } from '../config/env.js'

// 404 for unmatched routes.
export function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}

// Central error handler — controllers/services throw, this responds.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500
  let message = err.expose ? err.message : 'Internal server error'

  // Mongoose / Mongo specifics.
  if (err.name === 'ValidationError') {
    status = 400
    message = err.message
  } else if (err.name === 'CastError') {
    status = 400
    message = `Invalid ${err.path}`
  } else if (err.code === 11000) {
    status = 409
    message = `Duplicate value: ${Object.keys(err.keyValue || {}).join(', ')}`
  }

  if (status >= 500) console.error('[error]', err)

  res.status(status).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
    ...(!isProd && status >= 500 ? { stack: err.stack } : {}),
  })
}
