import { Router } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { SavedStructure } from '../models/SavedStructure.js';
import { StudyNote } from '../models/StudyNote.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { objectId } from '../middleware/validate.js';
import { isDemoEmail } from '../demo.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const countBy = async (Model) => {
  const rows = await Model.aggregate([{ $group: { _id: '$user', n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

router.get('/stats', async (_req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, admins, saved, notes, notesThisWeek, usersThisWeek, top] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    SavedStructure.countDocuments(),
    StudyNote.countDocuments(),
    StudyNote.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    SavedStructure.aggregate([
      { $group: { _id: { structureId: '$structureId', name: '$name', system: '$system' }, count: { $sum: 1 } } },
      { $sort: { count: -1, '_id.name': 1 } },
      { $limit: 6 },
    ]),
  ]);
  res.json({
    users, admins, saved, notes, notesThisWeek, usersThisWeek,
    topStructures: top.map((t) => ({ ...t._id, count: t.count })),
  });
});

router.get('/users', async (_req, res) => {
  const [users, savedCounts, noteCounts] = await Promise.all([User.find().sort({ createdAt: -1 }).limit(500), countBy(SavedStructure), countBy(StudyNote)]);
  res.json({
    items: users.map((u) => ({ ...u.toPublic(), saved: savedCounts.get(String(u._id)) ?? 0, notes: noteCounts.get(String(u._id)) ?? 0 })),
  });
});

router.delete('/users/:id', async (req, res) => {
  const id = objectId(req.params.id);
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot delete your own account from the admin page.');
  const user = await User.findById(id);
  if (!user) throw new HttpError(404, 'User not found.');
  if (isDemoEmail(user.email)) throw new HttpError(400, 'The evaluation accounts are protected and cannot be deleted.');
  const uid = new mongoose.Types.ObjectId(id);
  const [s, n] = await Promise.all([SavedStructure.deleteMany({ user: uid }), StudyNote.deleteMany({ user: uid }), User.deleteOne({ _id: uid })]);
  res.json({ ok: true, id, removedSaved: s.deletedCount, removedNotes: n.deletedCount });
});

export default router;
