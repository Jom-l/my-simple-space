import { Router } from 'express'
import * as ctrl from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { updateProfileSchema, statusSchema } from '../validators.js'

const router = Router()
router.use(requireAuth)

router.get('/me', ctrl.me)
router.patch('/me', validate(updateProfileSchema), ctrl.updateProfile)
router.put('/me/status', validate(statusSchema), ctrl.setStatus)
router.get('/search', ctrl.searchUsers)

export default router
