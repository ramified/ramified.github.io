// Personal theorem graphs. All document endpoints require a server-side session.
const API = '/api/theorem';
const MAX_BODY = 1024 * 1024;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const idPattern = /^[A-Za-z0-9_-]{8,80}$/;

function json(value, status = 200, extra = {}) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra
  } });
}
function fault(status, message) { return Object.assign(new Error(message), { status }); }
function base64(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function unbase64(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
async function hash(value) { return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
export async function passwordHash(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const digest = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return `pbkdf2-sha256$100000$${base64(salt)}$${base64(new Uint8Array(digest))}`;
}
async function checkPassword(password, encoded) {
  const parts = String(encoded).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== '100000') throw fault(503, 'Password is not configured.');
  const actual = await passwordHash(password, unbase64(parts[2]));
  return equal(encoder.encode(actual), encoder.encode(encoded));
}
function cookieOptions(request, env) {
  const url = new URL(request.url);
  const local = env.LOCAL_HTTP === 'true' && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  return { name: local ? 'theorem_session' : '__Host-theorem_session', flags: `Path=/; HttpOnly; SameSite=Strict${local ? '' : '; Secure'}` };
}
function tokenFrom(request, env) {
  const { name } = cookieOptions(request, env);
  return (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
async function readJson(request) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw fault(415, 'JSON is required.');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw fault(413, 'Graph exceeds the 1 MiB save limit.');
  const reader = request.body?.getReader();
  if (!reader) throw fault(400, 'Missing request body.');
  const chunks = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); throw fault(413, 'Graph exceeds the 1 MiB save limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw fault(400, 'Invalid JSON.'); }
}
function validatePayload(payload) {
  const graph = payload?.graph;
  if (payload?.formatVersion !== 1 || !graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.arrows)
    || !Number.isInteger(graph.schemaVersion) || graph.schemaVersion < 1 || graph.schemaVersion > 11) {
    throw fault(400, 'Unsupported graph document.');
  }
  // Bound nesting and total objects before the editor walks imported graphs.
  let count = 0;
  const inspect = (value, depth) => {
    if (++count > 60000 || depth > 80) throw fault(400, 'Graph is too complex.');
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw fault(400, 'Invalid object key.');
        inspect(child, depth + 1);
      }
    }
  };
  inspect(payload, 0);
  return String(graph.title || 'Untitled graph').slice(0, 240);
}
function documentValue(row) {
  if (!row) throw fault(404, 'Graph not found.');
  return { id: row.id || row.document_id, title: row.title, revision: row.revision,
    updatedAt: row.updated_at || row.saved_at, payload: JSON.parse(row.content) };
}
async function rateLimit(db, ip, now) {
  const window = Math.floor(now / 900000);
  const keys = [`global:${window}`, `${await hash(ip)}:${window}`];
  const values = await db.batch([...keys.map(bucket => db.prepare(
    'INSERT INTO login_limits (bucket, hits, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 RETURNING hits'
  ).bind(bucket, now + 1800000)), db.prepare('DELETE FROM login_limits WHERE expires_at <= ?').bind(now)]);
  if (values[0].results[0].hits > 60 || values[1].results[0].hits > 10) throw fault(429, 'Too many login attempts. Try again in 15 minutes.');
}
async function authenticated(request, env, now) {
  const token = tokenFrom(request, env);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw fault(401, 'Please sign in.');
  const tag = await hash(env.ADMIN_PASSWORD_HASH);
  const session = await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ? AND password_tag = ?')
    .bind(await hash(token), now, tag).first();
  if (!session) throw fault(401, 'Your session expired. Please sign in again.');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${API}/`)) {
      if (url.pathname === '/') return Response.redirect(`${url.origin}/theorem_graph_calculator.html`, 302);
      if (!env.ASSETS) return new Response('Personal editor assets are not built.', { status: 503 });
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'same-origin');
      headers.set('X-Frame-Options', 'DENY');
      return new Response(response.body, { status: response.status, headers });
    }
    try {
      if (!env.DB || !env.ADMIN_PASSWORD_HASH) throw fault(503, 'Personal storage is not configured.');
      if (!['GET', 'POST', 'PUT'].includes(request.method)) throw fault(405, 'Method not allowed.');
      if (request.method !== 'GET' && (request.headers.get('origin') !== url.origin || request.headers.get('x-theorem-request') !== '1')) {
        throw fault(403, 'Request origin is not allowed.');
      }
      const now = Date.now();
      const route = url.pathname.slice(API.length);
      if (route === '/login' && request.method === 'POST') {
        await rateLimit(env.DB, request.headers.get('cf-connecting-ip') || 'unknown', now);
        const data = await readJson(request);
        if (typeof data.password !== 'string' || data.password.length > 1024) throw fault(400, 'Invalid password.');
        const valid = await checkPassword(data.password, env.ADMIN_PASSWORD_HASH);
        if (!valid || data.username !== (env.ADMIN_USERNAME || 'ramified')) throw fault(401, 'Incorrect username or password.');
        const token = base64(crypto.getRandomValues(new Uint8Array(32)));
        await env.DB.prepare('INSERT INTO sessions VALUES (?, ?, ?)').bind(await hash(token), await hash(env.ADMIN_PASSWORD_HASH), now + SESSION_MS).run();
        const cleanup = env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
          env.DB.prepare('DELETE FROM login_limits WHERE expires_at <= ?').bind(now)
        ]);
        if (ctx?.waitUntil) ctx.waitUntil(cleanup); else await cleanup;
        const cookie = cookieOptions(request, env);
        return json({ username: env.ADMIN_USERNAME || 'ramified' }, 200, {
          'Set-Cookie': `${cookie.name}=${token}; ${cookie.flags}; Max-Age=${SESSION_MS / 1000}`
        });
      }
      await authenticated(request, env, now);
      if (route === '/session' && request.method === 'GET') return json({ username: env.ADMIN_USERNAME || 'ramified' });
      if (route === '/logout' && request.method === 'POST') {
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hash(tokenFrom(request, env))).run();
        const cookie = cookieOptions(request, env);
        return json({ ok: true }, 200, { 'Set-Cookie': `${cookie.name}=; ${cookie.flags}; Max-Age=0` });
      }
      if (route === '/documents' && request.method === 'GET') {
        const result = await env.DB.prepare('SELECT id, title, revision, updated_at AS updatedAt FROM documents ORDER BY updated_at DESC').all();
        return json({ documents: result.results });
      }
      const match = /^\/documents\/([A-Za-z0-9_-]{8,80})(?:\/history(?:\/(\d+))?)?$/.exec(route);
      if (!match) throw fault(404, 'Unknown endpoint.');
      const id = match[1];
      if (route.includes('/history')) {
        if (request.method !== 'GET') throw fault(405, 'Method not allowed.');
        if (match[2]) return json(documentValue(await env.DB.prepare('SELECT * FROM history WHERE document_id = ? AND revision = ?').bind(id, Number(match[2])).first()));
        const result = await env.DB.prepare('SELECT revision, title, saved_at AS updatedAt FROM history WHERE document_id = ? ORDER BY revision DESC LIMIT 50').bind(id).all();
        return json({ history: result.results });
      }
      if (request.method === 'GET') return json(documentValue(await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first()));
      if (request.method !== 'PUT') throw fault(405, 'Method not allowed.');
      const data = await readJson(request);
      if (!Number.isSafeInteger(data.baseRevision) || data.baseRevision < 0 || !idPattern.test(data.writeId) || !idPattern.test(data.sessionId)) throw fault(400, 'Invalid save version.');
      const title = validatePayload(data.payload);
      const content = JSON.stringify(data.payload);
      // Retries after a lost response return the original acknowledgement.
      const existing = await env.DB.prepare('SELECT revision, write_id, content, updated_at FROM documents WHERE id = ?').bind(id).first();
      if (existing?.write_id === data.writeId) {
        if (existing.content !== content) throw fault(409, 'Save identifier was reused with different content.');
        return json({ revision: existing.revision, updatedAt: existing.updated_at });
      }
      let saved;
      if (data.baseRevision === 0) {
        saved = await env.DB.prepare(`INSERT INTO documents (id,title,content,revision,updated_at,checkpoint_at,session_id,write_id)
          SELECT ?,?,?,1,?,?,?,? WHERE (SELECT COUNT(*) FROM documents) < 500
          ON CONFLICT(id) DO NOTHING RETURNING revision, updated_at AS updatedAt`)
          .bind(id, title, content, now, now, data.sessionId, data.writeId).first();
        if (!saved && !existing) throw fault(422, 'The personal library is limited to 500 graphs. Export a backup before adding more.');
      } else {
        saved = await env.DB.prepare(`UPDATE documents SET title=?, content=?, revision=revision+1,
          checkpoint_at=CASE WHEN ?=1 OR session_id != ? OR ?-checkpoint_at >= 300000 THEN ? ELSE checkpoint_at END,
          updated_at=?, session_id=?, write_id=?, force_checkpoint=? WHERE id=? AND revision=?
          RETURNING revision, updated_at AS updatedAt`)
          .bind(title, content, data.checkpoint ? 1 : 0, data.sessionId, now, now, now, data.sessionId, data.writeId,
            data.checkpoint ? 1 : 0, id, data.baseRevision).first();
      }
      if (!saved) throw fault(409, 'This graph changed on another device. Keep your changes as a copy or open the cloud version.');
      return json(saved);
    } catch (error) {
      return json({ error: error.status ? error.message : 'Storage is temporarily unavailable. Your local draft can be retried.' }, error.status || 503);
    }
  }
};
