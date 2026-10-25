import mongoose from 'mongoose';
import { config } from './config.js';

mongoose.set('strictQuery', true);

export async function connectDatabase() {
  mongoose.connection.on('connected', () => console.log(`[db] connected to "${config.mongoDb}"`));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb, serverSelectionTimeoutMS: 5000 });
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
