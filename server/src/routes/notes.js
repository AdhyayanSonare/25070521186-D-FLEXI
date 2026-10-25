import { Router } from 'express';
import { StudyNote } from '../models/StudyNote.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { objectId, str } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const filter = { user: req.user._id };
  if (typeof req.query.structureId === 'string' && req.query.structureId) filter.structureId = req.query.structureId.slice(0, 64);
  const notes = await StudyNote.find(filter).sort({ updatedAt: -1 }).limit(500);
  res.json({ items: notes.map((n) => n.toPublic()) });
});

router.post('/', async (req, res) => {
  const note = await StudyNote.create({
    user: req.user._id,
    structureId: str(req.body?.structureId, { field: 'Structure ID', max: 64 }),
    structureName: str(req.body?.structureName, { field: 'Structure name', max: 200 }),
    content: str(req.body?.content, { field: 'Note', max: 5000 }),
  });
  res.status(201).json({ item: note.toPublic() });
});

router.patch('/:id', async (req, res) => {
  const content = str(req.body?.content, { field: 'Note', max: 5000 });
  const note = await StudyNote.findOneAndUpdate(
    { _id: objectId(req.params.id), user: req.user._id },
    { $set: { content } },
    { new: true, runValidators: true },
  );
  if (!note) throw new HttpError(404, 'Note not found.');
  res.json({ item: note.toPublic() });
});

router.delete('/:id', async (req, res) => {
  const deleted = await StudyNote.findOneAndDelete({ _id: objectId(req.params.id), user: req.user._id });
  if (!deleted) throw new HttpError(404, 'Note not found.');
  res.json({ ok: true, id: deleted._id.toString() });
});

export default router;
