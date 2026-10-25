import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, _res, next) {
  next(new HttpError(404, `No API route for ${req.method} ${req.originalUrl}.`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' });
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Some fields are invalid.', details: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])) });
  }
  if (err instanceof mongoose.Error.CastError) return res.status(404).json({ error: 'Record not found.' });
  if (err?.name === 'MongooseServerSelectionError' || err?.name === 'MongoNetworkError') {
    return res.status(503).json({ error: 'The database is not reachable. Check that MongoDB is running.' });
  }
  console.error('[api] unexpected error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}
