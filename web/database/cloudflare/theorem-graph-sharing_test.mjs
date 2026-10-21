import assert from 'node:assert/strict';
import worker, { passwordHash } from './theorem-graph.worker.mjs';
import database from './theorem-graph-test-db.cjs';

const db = new database.TestDatabase();
const password = 'account-test-password-12345';
const env = { DB: db, ADMIN_PASSWORD_HASH: await passwordHash(password), ALLOWED_ORIGINS: 'https://ramified.github.io' };
const origin = 'https://ramified.github.io';
const payload = title => ({ formatVersion: 1, graph: { schemaVersion: 11, title, titleNode: { label: title }, nodes: [], arrows: [] }, drafts: [{ selector: '#node-label', value: 'private draft' }], editor: { detailEditBaseline: 'private baseline' } });
const write = (title, baseRevision) => ({ payload: payload(title), baseRevision, writeId: crypto.randomUUID(), sessionId: crypto.randomUUID() });
async function request(route, method = 'GET', body, token = '', headers = {}) {
  const response = await worker.fetch(new Request('https://theorem.example/api/theorem' + route, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Theorem-Request': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  }), env);
  return { status: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
}
async function login(username) {
  const result = await request('/login', 'POST', { username, password });
  assert.equal(result.status, 200, JSON.stringify(result.body)); return result.body.token;
}
try {
  const preflight = await request('/documents', 'OPTIONS');
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.equal((await request('/documents', 'OPTIONS', undefined, '', { Origin: 'https://untrusted.example' })).status, 403);
  const admin = await login('ramified');
  assert.equal((await request('/users', 'POST', { username: 'alice', password }, admin)).status, 200);
  assert.equal((await request('/users', 'POST', { username: 'bob', password }, admin)).status, 200);
  assert.equal((await request('/users', 'POST', { username: 'alice', password }, admin)).status, 409);
  assert.equal((await request('/users', 'POST', { username: 'ramified', password }, admin)).status, 400);
  const alice = await login('alice'), bob = await login('bob');
  assert.equal((await request('/users', 'GET', undefined, alice)).status, 403);
  assert.equal((await request('/users', 'POST', { username: 'hacker', password }, alice)).status, 403);
  assert.equal((await request('/documents/alice-graph', 'PUT', write('Alice only', 0), alice)).status, 200);
  assert.equal((await request('/documents/admin-graph', 'PUT', write('Administrator only', 0), admin)).status, 200);
  assert.deepEqual((await request('/documents', 'GET', undefined, bob)).body.documents, []);
  assert.deepEqual((await request('/documents', 'GET', undefined, alice)).body.documents.map(row => row.id), ['alice-graph']);
  for (const route of ['/documents/alice-graph', '/documents/alice-graph/history', '/documents/alice-graph/shares']) {
    assert.equal((await request(route, 'GET', undefined, bob)).status, 404);
  }
  assert.equal((await request('/documents/alice-graph', 'PUT', write('Stolen', 1), bob)).status, 404);
  assert.equal((await request('/documents/alice-graph', 'DELETE', { baseRevision: 1 }, bob)).status, 404);
  assert.equal((await request('/documents/alice-graph/rename', 'POST', { ...write('', 1), title: 'Stolen' }, bob)).status, 404);
  const rename = await request('/documents/alice-graph/rename', 'POST', { ...write('', 1), title: 'Renamed' }, alice);
  assert.equal(rename.status, 200); assert.equal(rename.body.revision, 2);
  assert.deepEqual(rename.body.payload, payload('Alice only'), 'renaming preserves graph content and private drafts');
  assert.equal((await request('/documents/alice-graph', 'GET', undefined, alice)).body.title, 'Renamed');
  assert.equal((await request('/documents/alice-graph/history/1', 'GET', undefined, alice)).body.payload.graph.title, 'Alice only');
  assert.equal((await request('/documents/alice-graph/shares', 'POST', { canEdit: false, canSave: true }, alice)).status, 400);
  const tokens = [];
  for (const [canEdit, canSave] of [[false, false], [true, false], [true, true]]) {
    const link = await request('/documents/alice-graph/shares', 'POST', { canEdit, canSave }, alice);
    assert.equal(link.status, 200); tokens.push(link.body);
    const shared = await request('/shared', 'GET', undefined, '', { 'X-Theorem-Share': link.body.token });
    assert.equal(shared.status, 200); assert.equal(shared.body.canEdit, canEdit); assert.equal(shared.body.canSave, canSave);
    assert.deepEqual(shared.body.payload.drafts, []); assert.deepEqual(shared.body.payload.editor, {});
    if (!canSave) assert.equal((await request('/shared', 'PUT', write('Forbidden', 2), '', { 'X-Theorem-Share': link.body.token })).status, 403);
  }
  const writable = tokens[2], headers = { 'X-Theorem-Share': writable.token };
  const sharedWrite = { ...write('Shared update', 2), title: 'Recipient cannot rename the library entry' };
  assert.equal((await request('/shared', 'PUT', sharedWrite, '', headers)).body.revision, 3);
  assert.equal((await request('/shared', 'PUT', sharedWrite, '', headers)).body.revision, 3, 'uncertain shared save retries are idempotent');
  assert.equal((await request('/shared', 'PUT', write('Stale shared write', 2), '', headers)).status, 409);
  assert.equal((await request('/documents/alice-graph', 'GET', undefined, alice)).body.payload.graph.title, 'Shared update');
  assert.equal((await request('/documents/alice-graph', 'GET', undefined, alice)).body.title, 'Renamed', 'shared content edits preserve the owner’s saved name');
  assert.equal((await request('/documents/alice-graph/shares/' + writable.id, 'DELETE', undefined, bob)).status, 404);
  assert.equal((await request('/documents/alice-graph/shares/' + writable.id, 'DELETE', undefined, alice)).status, 200);
  assert.equal((await request('/shared', 'GET', undefined, '', headers)).status, 404);
  assert.equal((await request('/shared', 'PUT', write('After revoke', 3), '', headers)).status, 404);
  assert.equal((await request('/documents/alice-graph', 'DELETE', { baseRevision: 2 }, alice)).status, 409);
  assert.equal((await request('/documents/alice-graph', 'DELETE', { baseRevision: 3 }, alice)).status, 200);
  assert.equal((await request('/shared', 'GET', undefined, '', { 'X-Theorem-Share': tokens[0].token })).status, 404);
  assert.equal((await request('/documents/alice-graph', 'PUT', write('Resurrected', 0), alice)).status, 410);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM history WHERE document_id=?').get('alice-graph').n, 0);
  // Simulate a document saved before the multi-account upgrade.
  db.sqlite.prepare('DELETE FROM graph_owners WHERE document_id=?').run('admin-graph');
  assert.equal((await request('/documents/admin-graph', 'GET', undefined, admin)).status, 200);
  assert.equal((await request('/documents/admin-graph', 'GET', undefined, alice)).status, 404);
  assert.equal((await request('/users/alice', 'PUT', { disabled: true }, admin)).status, 200);
  assert.equal((await request('/session', 'GET', undefined, alice)).status, 401);
  assert.equal((await request('/login', 'POST', { username: 'alice', password })).status, 401);
  assert.equal((await request('/users/alice', 'PUT', { disabled: false }, admin)).status, 200);
  const newAlice = await login('alice');
  assert.equal((await request('/users/alice', 'PUT', { password: password + '-new' }, admin)).status, 200);
  assert.equal((await request('/session', 'GET', undefined, newAlice)).status, 401);
  const users = await request('/users', 'GET', undefined, admin);
  assert(!JSON.stringify(users.body).includes('password'), 'account lists never reveal password hashes');
  assert.equal((await request('/documents', 'GET', undefined, admin, { Origin: 'https://untrusted.example' })).status, 403);
  console.log('PASS multi-account sharing: CORS, bearer sessions, ownership, legacy data, admin-only provisioning, rename, delete, tombstones, all link permissions, sanitized sharing, conflicts, revocation, disabled accounts and password resets');
} finally { db.close(); }
