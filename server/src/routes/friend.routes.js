import { Router } from 'express'
import * as ctrl from '../controllers/friend.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { friendRequestSchema } from '../validators.js'

const router = Router()
router.use(requireAuth)

router.get('/', ctrl.listFriends)
router.get('/requests', ctrl.listRequests)
router.post('/request', validate(friendRequestSchema), ctrl.sendRequest)
router.post('/:id/accept', ctrl.accept)
router.post('/:id/decline', ctrl.decline)

export default router
