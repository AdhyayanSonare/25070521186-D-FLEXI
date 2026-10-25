import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { str } from '../middleware/validate.js';
import { searchPubMed } from '../services/pubmed.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many research searches. Wait a minute and try again.' });

router.get('/', requireAuth, limiter, async (req, res) => {
  const term = str(req.query.term, { field: 'Search term', min: 2, max: 120 });
  res.json(await searchPubMed(term));
});

export default router;
