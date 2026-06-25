import { Router } from 'express'
import * as ctrl from '../controllers/post.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { rateLimit } from '../middlewares/rateLimit.js'
import { createPostSchema, commentSchema, reactionSchema } from '../validators.js'

const router = Router()
router.use(requireAuth)

router.get('/feed', ctrl.feed)
router.post(
  '/',
  rateLimit({ windowSec: 60, max: 30, keyPrefix: 'rl:post' }),
  validate(createPostSchema),
  ctrl.create,
)
router.get('/:id/comments', ctrl.comments)
router.post('/:id/comments', validate(commentSchema), ctrl.addComment)
router.put('/:id/reactions', validate(reactionSchema), ctrl.react)

export default router
