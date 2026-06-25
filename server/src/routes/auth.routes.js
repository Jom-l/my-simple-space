import { Router } from 'express'
import * as ctrl from '../controllers/auth.controller.js'
import { validate } from '../middlewares/validate.js'
import { rateLimit } from '../middlewares/rateLimit.js'
import { registerSchema, loginSchema } from '../validators.js'

const router = Router()
const authLimiter = rateLimit({ windowSec: 60, max: 20, keyPrefix: 'rl:auth' })

router.post('/register', authLimiter, validate(registerSchema), ctrl.register)
router.post('/login', authLimiter, validate(loginSchema), ctrl.login)
router.post('/refresh', ctrl.refresh)
router.post('/logout', ctrl.logout)

export default router
