import mongoose from 'mongoose';

const studyNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    structureId: { type: String, required: true, trim: true, maxlength: 64 },
    structureName: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true, collection: 'studyNotes' },
);

studyNoteSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    structureId: this.structureId,
    structureName: this.structureName,
    content: this.content,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudyNote = mongoose.model('StudyNote', studyNoteSchema);
