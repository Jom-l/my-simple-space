import { Router } from 'express'
import authRoutes from './auth.routes.js'
import userRoutes from './user.routes.js'
import friendRoutes from './friend.routes.js'
import conversationRoutes from './conversation.routes.js'
import postRoutes from './post.routes.js'
import uploadRoutes from './upload.routes.js'

const router = Router()

router.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }))
router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/friends', friendRoutes)
router.use('/conversations', conversationRoutes)
router.use('/posts', postRoutes)
router.use('/uploads', uploadRoutes)

export default router
