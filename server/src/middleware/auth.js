import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { HttpError } from './errors.js';

export const COOKIE_NAME = 'has_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function cookieOptions() {
  return { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' };
}

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/** Rejects the request with 401 unless it carries a valid session cookie. Sets req.user. */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new HttpError(401, 'Sign in to continue.'));
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Your session has expired. Sign in again.'));
  }
  const user = await User.findById(payload.sub);
  if (!user) return next(new HttpError(401, 'This account no longer exists.'));
  req.user = user;
  next();
}
