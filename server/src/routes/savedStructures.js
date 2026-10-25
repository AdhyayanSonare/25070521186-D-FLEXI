import { Router } from 'express';
import { SavedStructure } from '../models/SavedStructure.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { objectId, str } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const items = await SavedStructure.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ items: items.map((s) => s.toPublic()) });
});

router.post('/', async (req, res) => {
  const structureId = str(req.body?.structureId, { field: 'Structure ID', max: 64 });
  const name = str(req.body?.name, { field: 'Structure name', max: 200 });
  const system = str(req.body?.system, { field: 'System', max: 40, required: false });
  const pieces = Number.isInteger(req.body?.pieces) && req.body.pieces >= 0 ? req.body.pieces : 1;
  const existing = await SavedStructure.findOne({ user: req.user._id, structureId });
  if (existing) throw new HttpError(409, `${name} is already in your Study Space.`, { item: existing.toPublic() });
  try {
    const item = await SavedStructure.create({ user: req.user._id, structureId, name, system, pieces });
    res.status(201).json({ item: item.toPublic() });
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, `${name} is already in your Study Space.`);
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const deleted = await SavedStructure.findOneAndDelete({ _id: objectId(req.params.id), user: req.user._id });
  if (!deleted) throw new HttpError(404, 'Saved structure not found.');
  res.json({ ok: true, id: deleted._id.toString() });
});

export default router;
