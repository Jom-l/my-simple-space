import { Router } from 'express'
import * as ctrl from '../controllers/upload.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { uploadImage } from '../middlewares/upload.js'
import { rateLimit } from '../middlewares/rateLimit.js'

const router = Router()
router.use(requireAuth)

router.post(
  '/',
  rateLimit({ windowSec: 60, max: 30, keyPrefix: 'rl:upload' }),
  uploadImage,
  ctrl.uploadImage,
)

export default router
