import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

// Multer has already stored the file; return the public URL.
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded')
  res.status(201).json({ url: `/uploads/${req.file.filename}`, type: 'image' })
})
