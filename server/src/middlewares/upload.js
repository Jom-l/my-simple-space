import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const dir = path.resolve(process.cwd(), env.uploadDir)
fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true)
    else cb(ApiError.badRequest('Only image files are allowed'))
  },
}).single('image')
