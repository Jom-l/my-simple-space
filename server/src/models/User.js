import mongoose from 'mongoose'

export const USER_STATUS = ['online', 'do_not_disturb', 'away', 'offline']

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: USER_STATUS, default: 'offline' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

// username/email uniqueness already creates indexes via `unique: true`.

userSchema.methods.toPublic = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    status: this.status,
    lastSeenAt: this.lastSeenAt,
  }
}

export const User = mongoose.model('User', userSchema)
