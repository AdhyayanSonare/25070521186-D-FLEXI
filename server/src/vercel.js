// Vercel serverless handler. The Express app is created once per instance and the
// MongoDB connection is cached between requests (see db.js).
import { createApp } from './app.js';
import { connectDatabase } from './db.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    // The app still answers: /api/health reports the state, other routes return a clear 503.
  }
  return app(req, res);
}
