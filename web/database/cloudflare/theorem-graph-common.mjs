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

export { API, SESSION_MS, idPattern, json, fault, base64, hash, checkPassword, cookieOptions, tokenFrom, readJson, validatePayload, documentValue, rateLimit };
