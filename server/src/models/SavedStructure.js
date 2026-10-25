import mongoose from 'mongoose';

const savedStructureSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Stable identifier from the atlas manifest (FMA concept id such as "FMA7088").
    structureId: { type: String, required: true, trim: true, maxlength: 64 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    system: { type: String, trim: true, maxlength: 40, default: '' },
    pieces: { type: Number, min: 0, default: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'savedStructures' },
);

// One saved entry per user per structure.
savedStructureSchema.index({ user: 1, structureId: 1 }, { unique: true });

savedStructureSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    structureId: this.structureId,
    name: this.name,
    system: this.system,
    pieces: this.pieces,
    createdAt: this.createdAt,
  };
};

export const SavedStructure = mongoose.model('SavedStructure', savedStructureSchema);
