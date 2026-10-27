// Integration tests: run against a real MongoDB server (uses a throwaway database).
//   MONGODB_URI=mongodb://127.0.0.1:27017 npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.MONGODB_DB = `has_test_${Date.now()}`;
process.env.JWT_SECRET = 'test-secret-only-for-automated-tests-0123456789';
process.env.AUTH_RATE_LIMIT = '1000';
const { connectDatabase } = await import('../src/db.js');
const { createApp } = await import('../src/app.js');
const { setFetch, clearResearchCache } = await import('../src/services/pubmed.js');
const { User } = await import('../src/models/User.js');

let server, base;
before(async () => {
  mongoose.set('bufferCommands', false);
  await connectDatabase();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

/** Tiny client that keeps its own cookie, like a browser session. */
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    return { status: res.status, body: await res.json(), setCookie: set };
  };
}

const alice = client();
const bob = client();

test('health reports a connected database', async () => {
  const r = await alice('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.database, 'connected');
});

test('registration validates input and stores a bcrypt hash', async () => {
  assert.equal((await alice('POST', '/auth/register', { displayName: 'A', email: 'bad', password: 'x' })).status, 400);
  assert.equal((await alice('POST', '/auth/register', { displayName: 'Alice', email: 'alice@example.com', password: 'short1' })).status, 400);
  const r = await alice('POST', '/auth/register', { displayName: 'Alice', email: 'Alice@Example.com ', password: 'anatomy123' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.email, 'alice@example.com');
  assert.match(r.setCookie, /HttpOnly/i);
  assert.match(r.setCookie, /SameSite=Lax/i);
  const stored = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash').lean();
  assert.match(stored.passwordHash, /^\$2[aby]\$12\$/);
  assert.notEqual(stored.passwordHash, 'anatomy123');
  assert.equal(r.body.user.passwordHash, undefined);
});

test('duplicate email is rejected', async () => {
  const r = await bob('POST', '/auth/register', { displayName: 'Copy', email: 'alice@example.com', password: 'anatomy123' });
  assert.equal(r.status, 409);
});

test('login, me and logout', async () => {
  assert.equal((await bob('GET', '/auth/me')).status, 401);
  assert.equal((await bob('POST', '/auth/register', { displayName: 'Bob', email: 'bob@example.com', password: 'skeleton42' })).status, 201);
  assert.equal((await bob('POST', '/auth/logout')).status, 200);
  assert.equal((await bob('GET', '/auth/me')).status, 401);
  assert.equal((await bob('POST', '/auth/login', { email: 'bob@example.com', password: 'wrong-pass1' })).status, 401);
  assert.equal((await bob('POST', '/auth/login', { email: 'nobody@example.com', password: 'wrong-pass1' })).status, 401);
  const ok = await bob('POST', '/auth/login', { email: 'BOB@example.com', password: 'skeleton42' });
  assert.equal(ok.status, 200);
  assert.equal((await bob('GET', '/auth/me')).body.user.displayName, 'Bob');
});

let aliceSavedId, aliceNoteId;
test('saved structures persist with duplicate protection', async () => {
  const heart = { structureId: 'FMA7088', name: 'heart', system: 'cardiac', pieces: 12 };
  const r = await alice('POST', '/saved-structures', heart);
  assert.equal(r.status, 201);
  aliceSavedId = r.body.item.id;
  assert.equal((await alice('POST', '/saved-structures', heart)).status, 409);
  const list = await alice('GET', '/saved-structures');
  assert.deepEqual(list.body.items.map((i) => i.structureId), ['FMA7088']);
  assert.equal((await alice('POST', '/saved-structures', { name: 'no id' })).status, 400);
});

test('notes support create, read, update and delete', async () => {
  const c = await alice('POST', '/notes', { structureId: 'FMA7088', structureName: 'heart', content: 'Four chambers.' });
  assert.equal(c.status, 201);
  aliceNoteId = c.body.item.id;
  assert.equal((await alice('POST', '/notes', { structureId: 'FMA7088', structureName: 'heart', content: '   ' })).status, 400);
  const u = await alice('PATCH', `/notes/${aliceNoteId}`, { content: 'Four chambers, two atria and two ventricles.' });
  assert.equal(u.status, 200);
  assert.match(u.body.item.content, /two atria/);
  const filtered = await alice('GET', '/notes?structureId=FMA7088');
  assert.equal(filtered.body.items.length, 1);
  const extra = await alice('POST', '/notes', { structureId: 'FMA24474', structureName: 'femur', content: 'Longest bone.' });
  assert.equal((await alice('DELETE', `/notes/${extra.body.item.id}`)).status, 200);
  assert.equal((await alice('GET', '/notes')).body.items.length, 1);
});

test("one user cannot read, edit or delete another user's records", async () => {
  assert.equal((await bob('GET', '/saved-structures')).body.items.length, 0);
  assert.equal((await bob('GET', '/notes')).body.items.length, 0);
  assert.equal((await bob('PATCH', `/notes/${aliceNoteId}`, { content: 'hijack' })).status, 404);
  assert.equal((await bob('DELETE', `/notes/${aliceNoteId}`)).status, 404);
  assert.equal((await bob('DELETE', `/saved-structures/${aliceSavedId}`)).status, 404);
  // A user id in the body is ignored: the record belongs to the session user.
  const r = await bob('POST', '/saved-structures', { structureId: 'FMA7088', name: 'heart', user: 'someone-else' });
  assert.equal(r.status, 201);
  assert.equal((await alice('GET', '/notes')).body.items[0].content.includes('hijack'), false);
  assert.equal((await alice('DELETE', `/saved-structures/${aliceSavedId}`)).status, 200);
  assert.equal((await alice('GET', '/saved-structures')).body.items.length, 0);
  assert.equal((await bob('GET', '/saved-structures')).body.items.length, 1);
});

test('private endpoints require a session', async () => {
  const anon = client();
  for (const [m, p] of [['GET', '/saved-structures'], ['GET', '/notes'], ['POST', '/notes'], ['GET', '/research?term=heart']]) {
    assert.equal((await anon(m, p, m === 'POST' ? {} : undefined)).status, 401, `${m} ${p}`);
  }
});

test('research parses PubMed responses, caches them and fails gracefully', async () => {
  const calls = [];
  setFetch(async (url) => {
    calls.push(String(url));
    const u = new URL(url);
    if (u.pathname.endsWith('esearch.fcgi')) return Response.json({ esearchresult: { count: '1234', idlist: ['111', '222'] } });
    return Response.json({ result: { uids: ['111', '222'],
      111: { uid: '111', title: 'Morphology of the <i>human</i> femur.', fulljournalname: 'Journal of Anatomy', pubdate: '2024 Mar', authors: [{ name: 'Smith J' }, { name: 'Rao P' }, { name: 'Lee K' }, { name: 'Diaz M' }] },
      222: { uid: '222', title: 'Femoral neck geometry.', source: 'Clin Anat', pubdate: '2023', authors: [] } } });
  });
  clearResearchCache();
  const r = await alice('GET', '/research?term=left femur');
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 1234);
  assert.equal(r.body.articles.length, 2);
  assert.equal(r.body.articles[0].title, 'Morphology of the human femur.');
  assert.equal(r.body.articles[0].url, 'https://pubmed.ncbi.nlm.nih.gov/111/');
  assert.deepEqual(r.body.articles[0].authors, ['Smith J', 'Rao P', 'Lee K']);
  assert.equal(r.body.articles[0].moreAuthors, 1);
  assert.match(calls[0], /term=%28femur%29%5BTitle%2FAbstract%5D/);
  assert.equal((await alice('GET', '/research?term=left femur')).body.cached, true);
  assert.equal(calls.length, 2);

  setFetch(async () => { throw new TypeError('fetch failed'); });
  const down = await alice('GET', '/research?term=liver');
  assert.equal(down.status, 502);
  assert.match(down.body.error, /PubMed/);
  setFetch(async () => new Response('slow down', { status: 429 }));
  assert.equal((await alice('GET', '/research?term=spleen')).status, 503);
  assert.equal((await alice('GET', '/research?term=a')).status, 400);
});

test('demo accounts are seeded and can sign in', async () => {
  const demoStudent = client();
  const r = await demoStudent('POST', '/auth/login', { email: 'riya.sharma@humanatlas.test', password: 'Student@Atlas2026' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.role, 'user');
  assert.equal((await demoStudent('GET', '/saved-structures')).body.items.length, 5);
  assert.ok((await demoStudent('GET', '/notes')).body.items.length >= 1);
  const demo = await demoStudent('GET', '/auth/demo');
  assert.equal(demo.body.enabled, true);
  assert.equal(demo.body.accounts.length, 2);
});

test('admin routes are limited to administrators', async () => {
  assert.equal((await alice('GET', '/admin/stats')).status, 403);
  assert.equal((await alice('GET', '/admin/users')).status, 403);
  const admin = client();
  const login = await admin('POST', '/auth/login', { email: 'admin@humanatlas.test', password: 'Admin@Atlas2026' });
  assert.equal(login.body.user.role, 'admin');
  const stats = await admin('GET', '/admin/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.body.users >= 4);
  assert.ok(stats.body.topStructures.length >= 1);
  const users = await admin('GET', '/admin/users');
  const bobRow = users.body.items.find((u) => u.email === 'bob@example.com');
  assert.equal(bobRow.saved, 1);
  assert.equal(users.body.items.some((u) => 'passwordHash' in u), false);
  // An admin cannot delete themselves, but can delete another account along with its data.
  assert.equal((await admin('DELETE', `/admin/users/${login.body.user.id}`)).status, 400);
  const del = await admin('DELETE', `/admin/users/${bobRow.id}`);
  assert.equal(del.status, 200);
  assert.equal(del.body.removedSaved, 1);
  assert.equal((await bob('GET', '/auth/me')).status, 401);
});

test('profile: rename and change password with the current password', async () => {
  const carol = client();
  await carol('POST', '/auth/register', { displayName: 'Carol', email: 'carol@example.com', password: 'cranium123' });
  assert.equal((await carol('PATCH', '/auth/me', { displayName: 'C' })).status, 400);
  assert.equal((await carol('PATCH', '/auth/me', { displayName: 'Carol Mendes' })).body.user.displayName, 'Carol Mendes');
  assert.equal((await carol('POST', '/auth/password', { currentPassword: 'wrong-one1', newPassword: 'femur4567' })).status, 400);
  assert.equal((await carol('POST', '/auth/password', { currentPassword: 'cranium123', newPassword: 'short' })).status, 400);
  assert.equal((await carol('POST', '/auth/password', { currentPassword: 'cranium123', newPassword: 'femur4567' })).status, 200);
  const fresh = client();
  assert.equal((await fresh('POST', '/auth/login', { email: 'carol@example.com', password: 'cranium123' })).status, 401);
  assert.equal((await fresh('POST', '/auth/login', { email: 'carol@example.com', password: 'femur4567' })).status, 200);
  assert.equal((await client()('PATCH', '/auth/me', { displayName: 'Anon' })).status, 401);
});

test('evaluation accounts cannot be renamed, re-passworded or deleted', async () => {
  const riya = client();
  const login = await riya('POST', '/auth/login', { email: 'riya.sharma@humanatlas.test', password: 'Student@Atlas2026' });
  assert.equal(login.body.user.demo, true);
  assert.equal((await riya('PATCH', '/auth/me', { displayName: 'Hacked' })).status, 403);
  assert.equal((await riya('POST', '/auth/password', { currentPassword: 'Student@Atlas2026', newPassword: 'changed123' })).status, 403);
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@humanatlas.test', password: 'Admin@Atlas2026' });
  assert.equal((await admin('DELETE', `/admin/users/${login.body.user.id}`)).status, 400);
  assert.equal((await client()('POST', '/auth/login', { email: 'riya.sharma@humanatlas.test', password: 'Student@Atlas2026' })).status, 200);
});

