// Optional smoke test against the actual workerd/D1 runtime installed by Wrangler.
// Pass the path to miniflare/dist/src/index.js if it is not a local dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { passwordHash } from './theorem-graph.worker.mjs';
const { Miniflare, convertV4MiniflareOptions } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : 'miniflare');
const here = path.dirname(fileURLToPath(import.meta.url));
const password = 'runtime-test-only-password-12345';
const options = {
  cf: false,
  workers: [{
    name: 'theorem-personal-test', modulesRoot: here,
    modules: ['theorem-graph.worker.mjs', 'theorem-graph-common.mjs', 'theorem-graph-api.mjs']
      .map(file => ({ type: 'ESModule', path: path.join(here, file) })),
    compatibilityDate: '2026-10-14', d1Databases: ['DB'],
    bindings: { ADMIN_USERNAME: 'ramified', ADMIN_PASSWORD_HASH: await passwordHash(password), LOCAL_HTTP: 'true' }
  }]
};
const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
try {
  const db = await mf.getD1Database('DB');
  // D1 exec accepts newline-separated statements; flatten the migration into
  // one SQL input so trigger bodies retain their semicolon-delimited statements.
  const schema = (await fs.readFile(path.join(here, 'theorem-graph-schema.sql'), 'utf8')).replace(/^--.*$/gm, '').replace(/\r?\n/g, ' ');
  await db.exec(schema);
  const origin = 'http://127.0.0.1';
  let cookie = '';
  async function request(route, method = 'GET', body) {
    return mf.dispatchFetch(origin + '/api/theorem' + route, {
      method, headers: { Origin: origin, 'X-Theorem-Request': '1', 'Content-Type': 'application/json', Cookie: cookie },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  }
  assert.equal((await request('/documents')).status, 401);
  const login = await request('/login', 'POST', { username: 'ramified', password });
  assert.equal(login.status, 200, await login.text());
  cookie = login.headers.get('set-cookie').split(';')[0];
  const save = { baseRevision: 0, writeId: crypto.randomUUID(), sessionId: crypto.randomUUID(),
    payload: { formatVersion: 1, graph: { schemaVersion: 11, title: 'Workerd smoke test', nodes: [], arrows: [] } } };
  assert.equal((await request('/documents/runtime-graph', 'PUT', save)).status, 200);
  assert.equal((await db.prepare('SELECT username FROM graph_owners WHERE document_id=?').bind('runtime-graph').first()).username, 'ramified');
  const changed = { ...save, baseRevision: 1, writeId: crypto.randomUUID(), checkpoint: true,
    payload: { ...save.payload, graph: { ...save.payload.graph, title: 'Changed' } } };
  assert.equal((await request('/documents/runtime-graph', 'PUT', changed)).status, 200);
  assert.equal((await (await request('/documents/runtime-graph/history/1')).json()).payload.graph.title, 'Workerd smoke test');
  assert.equal((await request('/documents/runtime-graph', 'PUT', { ...changed, writeId: crypto.randomUUID() })).status, 409);
  const shareResponse = await request('/documents/runtime-graph/shares', 'POST', { canEdit: true, canSave: true });
  assert.equal(shareResponse.status, 200);
  const share = await shareResponse.json();
  const shared = await mf.dispatchFetch(origin + '/api/theorem/shared', {
    method: 'PUT', headers: { Origin: origin, 'X-Theorem-Request': '1', 'Content-Type': 'application/json', 'X-Theorem-Share': share.token },
    body: JSON.stringify({ ...changed, baseRevision: 2, writeId: crypto.randomUUID(), payload: { ...save.payload, graph: { ...save.payload.graph, title: 'Shared change' } } })
  });
  assert.equal(shared.status, 200, await shared.text());
  assert.equal((await (await request('/documents/runtime-graph')).json()).title, 'Shared change');
  assert.equal((await request('/documents/runtime-graph/shares/' + share.id, 'DELETE')).status, 200);
  assert.equal((await mf.dispatchFetch(origin + '/api/theorem/shared', { headers: { 'X-Theorem-Share': share.token } })).status, 404);
  assert.equal((await request('/logout', 'POST', {})).status, 200);
  assert.equal((await request('/documents')).status, 401);
  console.log('PASS actual workerd/D1: modules, password verification, cookies, ownership, writes, trigger checkpoints, conflict rejection, shared saves, revocation, logout');
} finally { await mf.dispose(); }
