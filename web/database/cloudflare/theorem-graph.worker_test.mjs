import assert from 'node:assert/strict';
import worker, { passwordHash } from './theorem-graph.worker.mjs';
import database from './theorem-graph-test-db.cjs';

const db = new database.TestDatabase();
const env = { DB: db, ADMIN_USERNAME: 'ramified', ADMIN_PASSWORD_HASH: await passwordHash('test-only-password-12345') };
const origin = 'https://personal.example';
let cookie = '';
async function request(path, method = 'GET', body, options = {}) {
  const response = await worker.fetch(new Request(origin + '/api/theorem' + path, {
    method, headers: { 'Content-Type': 'application/json', 'Origin': origin, 'X-Theorem-Request': '1',
      'CF-Connecting-IP': '192.0.2.1', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), options.env || env);
  return { status: response.status, headers: response.headers, body: await response.json() };
}
const payload = title => ({ formatVersion: 1, graph: { schemaVersion: 11, title, nodes: [], arrows: [], references: [] }, drafts: [] });
const save = (title, baseRevision, extra = {}) => ({ payload: payload(title), baseRevision, writeId: crypto.randomUUID(), sessionId: 'session-one', ...extra });
try {
  assert.equal((await request('/documents')).status, 401);
  assert.equal((await request('/documents/document-one', 'PUT', save('Unauthorized', 0))).status, 401);
  assert.equal((await request('/login', 'POST', { username: 'ramified', password: 'wrong' })).status, 401);
  assert.equal((await request('/login', 'POST', { username: 'someone', password: 'test-only-password-12345' })).status, 401);
  assert.equal((await request('/login', 'POST', {}, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  const login = await request('/login', 'POST', { username: 'ramified', password: 'test-only-password-12345' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Secure/);
  assert.match(cookie, /^__Host-theorem_session=/);
  assert(!db.sqlite.prepare('SELECT token_hash FROM graph_sessions').get().token_hash.includes(cookie.split('=')[1]));
  assert.equal((await request('/session')).body.username, 'ramified');
  assert.equal((await request('/session', 'GET', undefined, { headers: { Cookie: cookie + 'forged' } })).status, 401);
  assert.equal((await request('/documents/document-one', 'PUT', save('CSRF', 0), { headers: { 'X-Theorem-Request': '' } })).status, 403);

  const initial = save('First', 0);
  assert.equal((await request('/documents/document-one', 'PUT', initial)).body.revision, 1);
  assert.equal((await request('/documents/document-one', 'PUT', initial)).body.revision, 1, 'retry must not create another revision');
  assert.equal((await request('/documents/document-one', 'PUT', { ...initial, payload: payload('different') })).status, 409);
  assert.equal((await request('/documents/document-one', 'PUT', save('Second', 1))).body.revision, 2);
  assert.equal((await request('/documents/document-one/history')).body.history.length, 0, 'ordinary autosaves do not append full history');
  assert.equal((await request('/documents/document-one', 'PUT', save('Stale', 1))).status, 409);
  assert.equal((await request('/documents/document-one')).body.payload.graph.title, 'Second');

  const concurrent = await Promise.all(['Tab A', 'Tab B'].map(title => request('/documents/document-one', 'PUT', save(title, 2))));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409], 'conditional update permits only one writer');
  assert.equal((await request('/documents/document-one', 'PUT', save('New session', 3, { sessionId: 'session-two' }))).body.revision, 4);
  assert.equal((await request('/documents/document-one/history')).body.history[0].revision, 3);
  const earlier = await request('/documents/document-one/history/3');
  assert.equal(earlier.status, 200);
  assert.equal((await request('/documents/document-one', 'PUT', save('Restored', 4, { checkpoint: true, sessionId: 'session-two' }))).body.revision, 5);
  assert.equal((await request('/documents/document-one/history/4')).body.payload.graph.title, 'New session');
  db.sqlite.prepare('UPDATE documents SET checkpoint_at = ? WHERE id = ?').run(Date.now() - 300001, 'document-one');
  assert.equal((await request('/documents/document-one', 'PUT', save('After five minutes', 5, { sessionId: 'session-two' }))).body.revision, 6);
  assert.equal((await request('/documents/document-one/history/5')).status, 200);
  for (let version = 6; version < 60; version++) {
    assert.equal((await request('/documents/document-one', 'PUT', save(`Checkpoint ${version}`, version, { checkpoint: true }))).status, 200);
  }
  assert.equal((await request('/documents/document-one/history')).body.history.length, 50);
  const latest = await request('/documents/document-one');
  assert.equal(latest.headers.get('cache-control'), 'no-store');
  assert.equal((await request('/documents')).body.documents.length, 1);
  assert(!('payload' in (await request('/documents')).body.documents[0]), 'lists must not download every graph');
  const named = save('Same graph title', 0, { title: 'First proof' });
  assert.equal((await request('/documents/named-version-one', 'PUT', named)).status, 200);
  assert.equal((await request('/documents/named-version-two', 'PUT', save('Same graph title', 0, { title: 'Alternative proof' }))).status, 200);
  assert.equal((await request('/documents/named-version-one', 'PUT', { ...named, title: 'Reused ID with different name' })).status, 409);
  assert.equal((await request('/documents/named-version-one', 'PUT', save('Edited title', 1))).status, 200);
  const namedSaved = (await request('/documents/named-version-one')).body;
  assert.equal(namedSaved.title, 'First proof', 'content-only saves preserve the library name, including legacy clients');
  assert.equal(namedSaved.payload.graph.title, 'Edited title');
  assert.equal((await request('/documents/named-version-one', 'PUT', save('Edited title', 2, { title: '  Revised proof  ' }))).status, 200);
  assert.equal((await request('/documents/named-version-one')).body.title, 'Revised proof');
  for (const title of ['', ' ', null, 42, 'x'.repeat(241)]) {
    assert.equal((await request('/documents/named-version-one', 'PUT', save('Edited title', 3, { title }))).status, 400);
  }
  console.log('PASS theorem cloud: independent names, same-title versions, metadata saves, retries and name validation');
  assert.equal((await request('/documents/document-two', 'PUT', { ...save('Bad', 0), payload: { graph: {} } })).status, 400);
  assert.equal((await request('/documents/document-two', 'PUT', save('x'.repeat(1024 * 1024), 0))).status, 413);
  assert.equal((await request('/documents/document-two', 'PUT', save('Future schema', 0, { payload: { ...payload('x'), graph: { ...payload('x').graph, schemaVersion: 999 } } }))).status, 400);
  assert.equal((await request('/documents/document-one', 'DELETE', { baseRevision: 0 })).status, 409, 'stale deletes must not remove a graph');

  assert.equal((await request('/session', 'GET', undefined, { env: { ...env, ADMIN_PASSWORD_HASH: await passwordHash('changed-test-password-12345') } })).status, 401, 'password rotation revokes old sessions');
  assert.equal((await request('/logout', 'POST', {})).status, 200);
  assert.equal((await request('/session')).status, 401);
  for (let i = 0; i < 10; i++) await request('/login', 'POST', { username: 'ramified', password: 'wrong' }, { headers: { 'CF-Connecting-IP': '192.0.2.99' } });
  assert.equal((await request('/login', 'POST', { username: 'ramified', password: 'test-only-password-12345' }, { headers: { 'CF-Connecting-IP': '192.0.2.99' } })).status, 429);
  assert.equal((await request('/session', 'GET', undefined, { env: { DB: db } })).status, 503);
  console.log('PASS theorem cloud: authentication, CSRF, sessions, rate limits, optimistic writes, retries, atomic history, retention, size limits');
} finally { db.close(); }
