import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { HttpError } from '../middleware/errors.js';
import { EMAIL_RE, str } from '../middleware/validate.js';
import { clearSession, issueSession, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { config } from '../config.js';
import { DEMO_ACCOUNTS } from '../seed.js';
import { isDemoEmail } from '../demo.js';

const DEMO_LOCKED = 'The evaluation accounts are shared, so their name and password cannot be changed. Register your own account to try this.';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: Number(process.env.AUTH_RATE_LIMIT) || 20, message: 'Too many attempts. Wait a few minutes and try again.' });
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

// Lets the sign-in page offer one-click demo logins, only while demo accounts are enabled.
router.get('/demo', (_req, res) => {
  res.json({ enabled: config.seedDemo, accounts: config.seedDemo ? DEMO_ACCOUNTS.map(({ label, email, password, role }) => ({ label, email, password, role })) : [] });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// Profile: change the display name.
router.patch('/me', requireAuth, async (req, res) => {
  if (isDemoEmail(req.user.email)) throw new HttpError(403, DEMO_LOCKED);
  req.user.displayName = str(req.body?.displayName, { field: 'Display name', min: 2, max: 60 });
  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// Change password: requires the current password, then issues a fresh session.
router.post('/password', requireAuth, authLimiter, async (req, res) => {
  if (isDemoEmail(req.user.email)) throw new HttpError(403, DEMO_LOCKED);
  const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const next = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!current || !(await bcrypt.compare(current, user.passwordHash))) {
    throw new HttpError(400, 'Your current password is not correct.', { currentPassword: 'Incorrect password' });
  }
  if (next.length < 8 || next.length > 72 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    throw new HttpError(400, 'Use 8–72 characters with at least one letter and one number.', { newPassword: 'Use 8–72 characters with a letter and a number' });
  }
  if (next === current) throw new HttpError(400, 'Choose a password different from the current one.', { newPassword: 'Must be different' });
  user.passwordHash = await bcrypt.hash(next, 12);
  await user.save();
  issueSession(res, user);
  res.json({ ok: true });
});

export default router;
