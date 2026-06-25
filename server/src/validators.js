import { z } from 'zod'
import { EMOTES } from './models/Post.js'

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/i, 'letters, numbers, underscore only'),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(60).optional(),
})

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export const statusSchema = z.object({
  status: z.enum(['online', 'do_not_disturb', 'away', 'offline']),
})

export const friendRequestSchema = z.object({
  username: z.string().min(1),
})

export const startConversationSchema = z.object({
  userId: z.string().min(1),
})

export const messageSchema = z.object({
  text: z.string().max(4000).optional(),
  attachments: z
    .array(z.object({ url: z.string(), type: z.enum(['image']).default('image') }))
    .optional(),
})

export const createPostSchema = z.object({
  text: z.string().max(5000).optional(),
  imageUrl: z.string().optional(),
})

export const commentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const reactionSchema = z.object({
  emote: z.enum(EMOTES).nullable().optional(),
})
