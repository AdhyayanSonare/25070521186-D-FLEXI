// Runs the Vercel serverless entry (api/index.mjs) the way Vercel does: no JWT_SECRET, production mode.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

delete process.env.JWT_SECRET;
process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';
process.env.MONGODB_DB = `has_vercel_${Date.now()}`;
const { default: handler } = await import('../../api/index.mjs');
const mongoose = (await import('mongoose')).default;

const server = http.createServer((req, res) => handler(req, res)).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
after(async () => { await mongoose.connection.db.dropDatabase(); await mongoose.disconnect(); server.close(); });

test('serverless handler connects, stores a generated JWT secret and signs users in', async () => {
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  assert.equal(health.database, 'connected');
  const stored = await mongoose.connection.db.collection('appConfig').findOne({ _id: 'jwt' });
  assert.match(stored.secret, /^[0-9a-f]{96}$/);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@humanatlas.test', password: 'Admin@Atlas2026' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie.split(';')[0] } }).then((r) => r.json());
  assert.equal(me.user.role, 'admin');
  // A second call reuses the same secret and connection (no new secret is generated).
  await fetch(`${base}/api/health`);
  assert.equal(await mongoose.connection.db.collection('appConfig').countDocuments(), 1);
});
