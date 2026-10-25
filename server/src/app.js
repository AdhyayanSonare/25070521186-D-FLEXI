import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from './config.js';
import { databaseStatus } from './db.js';
import { HttpError, errorHandler, notFound } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import savedRoutes from './routes/savedStructures.js';
import noteRoutes from './routes/notes.js';
import researchRoutes from './routes/research.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' });
    // The Vite dev server proxies /api, so CORS is only a fallback for direct cross-origin calls in development.
    const origin = req.get('origin');
    if (origin && origin === config.clientOrigin) {
      res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' });
      if (req.method === 'OPTIONS') {
        res.set({ 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
        return res.sendStatus(204);
      }
    }
    next();
  });
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    const db = databaseStatus();
    res.status(db === 'connected' ? 200 : 503).json({ ok: db === 'connected', api: 'up', database: db, databaseName: config.mongoDb, time: new Date().toISOString() });
  });

  // Fail fast with a clear message instead of hanging when MongoDB is down.
  app.use('/api', (_req, _res, next) => {
    if (databaseStatus() !== 'connected') return next(new HttpError(503, 'The database is not connected. Start MongoDB and try again.'));
    next();
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/saved-structures', savedRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', notFound);

  // Production: serve the built React app from client/dist with an SPA fallback.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
