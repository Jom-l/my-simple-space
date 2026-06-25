import { ApiError } from '../utils/ApiError.js'

// Validates req[source] against a Zod schema, replacing it with parsed data.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      return next(ApiError.badRequest('Validation failed', details))
    }
    req[source] = result.data
    next()
  }
}
