import { Router } from 'express'
import * as ctrl from '../controllers/conversation.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { rateLimit } from '../middlewares/rateLimit.js'
import { startConversationSchema, messageSchema } from '../validators.js'

const router = Router()
router.use(requireAuth)

router.get('/', ctrl.list)
router.post('/', validate(startConversationSchema), ctrl.start)
router.get('/:id/messages', ctrl.messages)
router.post(
  '/:id/messages',
  rateLimit({ windowSec: 10, max: 30, keyPrefix: 'rl:msg' }),
  validate(messageSchema),
  ctrl.sendMessage,
)
router.post('/:id/seen', ctrl.markSeen)

export default router
