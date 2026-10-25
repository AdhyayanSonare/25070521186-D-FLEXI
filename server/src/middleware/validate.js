import mongoose from 'mongoose';
import { HttpError } from './errors.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function str(value, { field, min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${field} is required.`, { [field]: 'Required' });
    return '';
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`, { [field]: 'Must be text' });
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, `${field} must be at least ${min} characters.`, { [field]: `At least ${min} characters` });
  if (v.length > max) throw new HttpError(400, `${field} must be at most ${max} characters.`, { [field]: `At most ${max} characters` });
  return v;
}

export function objectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Record not found.');
  return id;
}
