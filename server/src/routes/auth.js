import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errors.js';
import { EMAIL_RE, str } from '../middleware/validate.js';
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts. Wait a few minutes and try again.' });
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function readEmail(value) {
  const email = str(value, { field: 'Email', max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.', { email: 'Enter a valid email address' });
  return email;
}

router.post('/register', authLimiter, async (req, res) => {
  const displayName = str(req.body?.displayName, { field: 'Display name', min: 2, max: 60 });
  const email = readEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'Use 8–72 characters with at least one letter and one number.', { password: 'Use 8–72 characters with a letter and a number' });
  }
  if (await User.exists({ email })) {
    throw new HttpError(409, 'An account with this email already exists. Sign in instead.', { email: 'Already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ displayName, email, passwordHash });
  } catch (err) {
    if (err?.code === 11000) throw new HttpError(409, 'An account with this email already exists. Sign in instead.', { email: 'Already registered' });
    throw err;
  }
  issueSession(res, user);
  res.status(201).json({ user: user.toPublic() });
});

router.post('/login', authLimiter, async (req, res) => {
  const email = readEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) throw new HttpError(400, 'Password is required.', { password: 'Required' });
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'That email and password do not match an account.');
  issueSession(res, user);
  res.json({ user: user.toPublic() });
});

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;
