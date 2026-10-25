import mongoose from 'mongoose';
import { config } from './config.js';
import { connectDatabase } from './db.js';
import { createApp } from './app.js';

mongoose.set('bufferCommands', false);

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}  (health: /api/health)`);
});

async function connectWithRetry() {
  try {
    await connectDatabase();
  } catch (err) {
    console.error(`[db] could not connect to ${config.mongoUri.replace(/\/\/[^@]*@/, '//***@')}: ${err.message}. Retrying in 5s.`);
    setTimeout(connectWithRetry, 5000);
  }
}
connectWithRetry();

const shutdown = async () => {
  server.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
