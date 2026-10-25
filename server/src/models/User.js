import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: 'users' },
);

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id.toString(), displayName: this.displayName, email: this.email, createdAt: this.createdAt };
};

export const User = mongoose.model('User', userSchema);
