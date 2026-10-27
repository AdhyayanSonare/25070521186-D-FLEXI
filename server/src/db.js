import mongoose from 'mongoose';
import { config } from './config.js';

mongoose.set('strictQuery', true);
// Fail fast instead of queueing queries while disconnected.
mongoose.set('bufferCommands', false);

import { randomBytes } from 'node:crypto';

let listening = false;
let ready = null;

/** Loads JWT_SECRET from the environment, or a generated secret stored once in MongoDB. */
async function ensureJwtSecret() {
  if (config.jwtSecret) return;
  const doc = await mongoose.connection.db.collection('appConfig').findOneAndUpdate(
    { _id: 'jwt' },
    { $setOnInsert: { secret: randomBytes(48).toString('hex'), createdAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  );
  config.jwtSecret = (doc?.value ?? doc).secret;
}

/** Connects once per process; later calls reuse the same connection (serverless-friendly). */
export function connectDatabase() {
  if (mongoose.connection.readyState === 1 && ready) return ready;
  ready = open().catch((err) => { ready = null; throw err; });
  return ready;
}

async function open() {
  if (!listening) {
    listening = true;
    mongoose.connection.on('connected', () => console.log(`[db] connected to "${config.mongoDb}"`));
    mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
    mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  }
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb, serverSelectionTimeoutMS: 8000, maxPoolSize: 5 });
  await ensureJwtSecret();
  // Make sure unique indexes (email, user+structure) exist before accepting writes.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  if (config.seedDemo) {
    const { ensureDemoAccounts } = await import('./seed.js');
    const created = await ensureDemoAccounts();
    if (created.length) console.log(`[db] created demo accounts: ${created.join(', ')}`);
  }
}

export function databaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
}
