import mongoose from 'mongoose';
import { isDemoEmail } from '../demo.js';

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id.toString(), displayName: this.displayName, email: this.email, role: this.role || 'user', demo: isDemoEmail(this.email), createdAt: this.createdAt };
};

export const User = mongoose.model('User', userSchema);
