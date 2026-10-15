import { API, SESSION_MS, idPattern, json, fault, base64, hash, passwordHash, checkPassword,
  cookieOptions, tokenFrom, readJson, validatePayload, documentValue, rateLimit } from './theorem-graph-common.mjs';

const userPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}$/;
const ownerQuery = 'SELECT d.*, COALESCE(o.username, ?) AS owner FROM documents d LEFT JOIN graph_owners o ON o.document_id=d.id';
const adminName = env => env.ADMIN_USERNAME || 'ramified';
const randomToken = () => base64(crypto.getRandomValues(new Uint8Array(32)));
const publicPayload = payload => ({ formatVersion: 1, graph: payload.graph, editor: {}, drafts: [] });
async function account(env, username) {
  if (username === adminName(env)) return { username, password_hash: env.ADMIN_PASSWORD_HASH, admin: true };
  return env.DB.prepare('SELECT * FROM graph_users WHERE username=? AND disabled=0').bind(username).first();
}
function bearer(request, env) {
  const authorization = request.headers.get('authorization');
  return authorization ? authorization.replace(/^Bearer\s+/i, '') : tokenFrom(request, env);
}
async function authenticate(request, env, now) {
  const token = bearer(request, env);
  if (!/^[\w-]{43}$/.test(token)) throw fault(401, 'Please sign in.');
  const session = await env.DB.prepare('SELECT * FROM graph_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token), now).first();
  const user = session && await account(env, session.username);
  if (!user || session.password_tag !== await hash(user.password_hash)) throw fault(401, 'Your session expired. Please sign in again.');
  return user;
}
async function owned(env, id, user) {
  const row = await env.DB.prepare(ownerQuery + ' WHERE d.id=?').bind(adminName(env), id).first();
  if (!row || row.owner !== user.username) throw fault(404, 'Graph not found.');
  return row;
}
function validateWrite(data) {
  if (!Number.isSafeInteger(data.baseRevision) || data.baseRevision < 0 || !idPattern.test(data.writeId) || !idPattern.test(data.sessionId)) throw fault(400, 'Invalid save version.');
  validatePayload(data.payload);
}
async function updateGraph(env, id, existing, data, now, shareHash = null) {
  validateWrite(data);
  const title = validatePayload(data.payload), content = JSON.stringify(data.payload);
  if (existing.write_id === data.writeId) {
    if (existing.content !== content) throw fault(409, 'Save identifier was reused with different content.');
    return { revision: existing.revision, updatedAt: existing.updated_at };
  }
  // Permission is checked again inside the conditional write so revocation wins
  // over a request that was authorized just before its link was revoked.
  const guard = shareHash ? ' AND EXISTS (SELECT 1 FROM graph_shares WHERE token_hash=? AND document_id=documents.id AND can_edit=1 AND can_save=1)' : '';
  const args = [title, content, data.checkpoint ? 1 : 0, data.sessionId, now, now, now,
    data.sessionId, data.writeId, data.checkpoint ? 1 : 0, id, data.baseRevision];
  if (shareHash) args.push(shareHash);
  const saved = await env.DB.prepare(`UPDATE documents SET title=?,content=?,revision=revision+1,
    checkpoint_at=CASE WHEN ?=1 OR session_id!=? OR ?-checkpoint_at>=300000 THEN ? ELSE checkpoint_at END,
    updated_at=?,session_id=?,write_id=?,force_checkpoint=? WHERE id=? AND revision=?${guard}
    RETURNING revision,updated_at AS updatedAt`).bind(...args).first();
  if (!saved) throw fault(409, 'This graph changed or access was revoked. Reload before saving; your local changes are kept.');
  return saved;
}
async function routes(request, env, ctx) {
  if (!env.DB || !env.ADMIN_PASSWORD_HASH) throw fault(503, 'Cloud storage is not configured.');
  const route = new URL(request.url).pathname.slice(API.length), method = request.method, now = Date.now();
  if (route === '/login' && method === 'POST') {
    await rateLimit(env.DB, request.headers.get('cf-connecting-ip') || 'unknown', now);
    const data = await readJson(request);
    if (typeof data.username !== 'string' || typeof data.password !== 'string' || data.password.length > 1024) throw fault(400, 'Invalid credentials.');
    const user = await account(env, data.username);
    const valid = await checkPassword(data.password, user?.password_hash || env.ADMIN_PASSWORD_HASH);
    if (!user || !valid) throw fault(401, 'Incorrect username or password.');
    const token = randomToken();
    await env.DB.prepare('INSERT INTO graph_sessions VALUES (?,?,?,?)').bind(await hash(token), user.username, await hash(user.password_hash), now + SESSION_MS).run();
    const cleanup = env.DB.prepare('DELETE FROM graph_sessions WHERE expires_at<=?').bind(now).run();
    if (ctx?.waitUntil) ctx.waitUntil(cleanup); else await cleanup;
    const cookie = cookieOptions(request, env);
    return json({ username: user.username, admin: !!user.admin, token }, 200, {
      'Set-Cookie': `${cookie.name}=${token}; ${cookie.flags}; Max-Age=${SESSION_MS / 1000}`
    });
  }
  if (route === '/shared') {
    const token = request.headers.get('x-theorem-share') || '';
    if (!/^[\w-]{43}$/.test(token)) throw fault(404, 'Share link not found or revoked.');
    const tokenHash = await hash(token);
    const link = await env.DB.prepare('SELECT * FROM graph_shares WHERE token_hash=?').bind(tokenHash).first();
    const row = link && await env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(link.document_id).first();
    if (!row) throw fault(404, 'Share link not found or revoked.');
    if (method === 'GET') {
      const value = documentValue(row);
      return json({ ...value, payload: publicPayload(value.payload), canEdit: !!link.can_edit, canSave: !!link.can_save });
    }
    if (method === 'PUT') {
      if (!link.can_edit || !link.can_save) throw fault(403, 'This link does not allow saving changes to the original graph.');
      const data = await readJson(request);
      validateWrite(data); data.payload = publicPayload(data.payload);
      return json(await updateGraph(env, row.id, row, data, now, tokenHash));
    }
    throw fault(405, 'Method not allowed.');
  }
  const user = await authenticate(request, env, now);
  if (route === '/session' && method === 'GET') return json({ username: user.username, admin: !!user.admin });
  if (route === '/logout' && method === 'POST') {
    await env.DB.prepare('DELETE FROM graph_sessions WHERE token_hash=?').bind(await hash(bearer(request, env))).run();
    const cookie = cookieOptions(request, env);
    return json({ ok: true }, 200, { 'Set-Cookie': `${cookie.name}=; ${cookie.flags}; Max-Age=0` });
  }
  if (route === '/users' || route.startsWith('/users/')) {
    if (!user.admin) throw fault(403, 'Only the administrator can manage accounts.');
    if (route === '/users' && method === 'GET') return json({ users: (await env.DB.prepare('SELECT username,disabled,created_at AS createdAt FROM graph_users ORDER BY username').all()).results });
    const data = await readJson(request);
    const username = route === '/users' ? data.username : route.slice('/users/'.length);
    if (!userPattern.test(username) || username === adminName(env)) throw fault(400, 'Use a unique username with 3–40 letters, digits, underscores or hyphens.');
    if (data.password !== undefined && (typeof data.password !== 'string' || data.password.length < 14 || data.password.length > 1024)) throw fault(400, 'Use a password between 14 and 1024 characters.');
    const existing = await env.DB.prepare('SELECT username FROM graph_users WHERE username=?').bind(username).first();
    if (route === '/users' && method === 'POST') {
      if (existing) throw fault(409, 'That username already exists.');
      if (!data.password) throw fault(400, 'A password is required.');
      const saved = await env.DB.prepare('INSERT INTO graph_users SELECT ?,?,0,? WHERE (SELECT COUNT(*) FROM graph_users)<100 RETURNING username')
        .bind(username, await passwordHash(data.password), now).first();
      if (!saved) throw fault(422, 'Account limit reached.');
    } else if (method === 'PUT' && existing) {
      if (!data.password && typeof data.disabled !== 'boolean') throw fault(400, 'Choose a new password or account status.');
      await env.DB.batch([
        ...(data.password ? [env.DB.prepare('UPDATE graph_users SET password_hash=? WHERE username=?').bind(await passwordHash(data.password), username)] : []),
        ...(typeof data.disabled === 'boolean' ? [env.DB.prepare('UPDATE graph_users SET disabled=? WHERE username=?').bind(data.disabled ? 1 : 0, username)] : []),
        env.DB.prepare('DELETE FROM graph_sessions WHERE username=?').bind(username)
      ]);
    } else throw fault(404, 'Account not found.');
    return json({ ok: true });
  }
  if (route === '/documents' && method === 'GET') {
    const rows = await env.DB.prepare(`SELECT d.id,d.title,d.revision,d.updated_at AS updatedAt FROM documents d
      LEFT JOIN graph_owners o ON o.document_id=d.id WHERE COALESCE(o.username,?)=? ORDER BY d.updated_at DESC`).bind(adminName(env), user.username).all();
    return json({ documents: rows.results });
  }
  const match = /^\/documents\/([\w-]{8,80})(?:\/(history|shares|rename)(?:\/([\w-]+))?)?$/.exec(route);
  if (!match) throw fault(404, 'Unknown endpoint.');
  const [, id, operation, child] = match;
  let row;
  if (method === 'PUT' && !operation) {
    row = await env.DB.prepare(ownerQuery + ' WHERE d.id=?').bind(adminName(env), id).first();
    if (row && row.owner !== user.username) throw fault(404, 'Graph not found.');
  } else row = await owned(env, id, user);
  if (operation === 'shares') {
    if (method === 'GET' && !child) return json({ shares: (await env.DB.prepare('SELECT id,can_edit AS canEdit,can_save AS canSave,created_at AS createdAt FROM graph_shares WHERE document_id=? ORDER BY created_at DESC').bind(id).all()).results });
    if (method === 'POST' && !child) {
      const data = await readJson(request);
      if (typeof data.canEdit !== 'boolean' || typeof data.canSave !== 'boolean' || (data.canSave && !data.canEdit)) throw fault(400, 'Saving requires editing permission.');
      const token = randomToken(), shareId = crypto.randomUUID();
      const saved = await env.DB.prepare(`INSERT INTO graph_shares SELECT ?,?,?,?,?,? WHERE
        (SELECT COUNT(*) FROM graph_shares WHERE document_id=?)<50 RETURNING id`)
        .bind(shareId, await hash(token), id, data.canEdit ? 1 : 0, data.canSave ? 1 : 0, now, id).first();
      if (!saved) throw fault(422, 'Revoke an existing link before adding more.');
      return json({ id: shareId, token, canEdit: data.canEdit, canSave: data.canSave });
    }
    if (method === 'DELETE' && child) {
      await env.DB.prepare('DELETE FROM graph_shares WHERE id=? AND document_id=?').bind(child, id).run();
      return json({ ok: true });
    }
    throw fault(405, 'Method not allowed.');
  }
  if (operation === 'history' && method === 'GET') {
    if (child) return json(documentValue(await env.DB.prepare('SELECT * FROM history WHERE document_id=? AND revision=?').bind(id, Number(child)).first()));
    return json({ history: (await env.DB.prepare('SELECT revision,title,saved_at AS updatedAt FROM history WHERE document_id=? ORDER BY revision DESC LIMIT 50').bind(id).all()).results });
  }
  if (operation === 'rename' && method === 'POST') {
    const data = await readJson(request);
    if (typeof data.title !== 'string' || !data.title.trim() || data.title.trim().length > 120) throw fault(400, 'Use a graph name between 1 and 120 characters.');
    const payload = JSON.parse(row.content);
    payload.graph.title = data.title.trim();
    if (payload.graph.titleNode) payload.graph.titleNode.label = payload.graph.title;
    payload.drafts = (payload.drafts || []).filter(draft => draft.selector !== '#graph-title');
    if (payload.editor) payload.editor.detailEditBaseline = null;
    return json({ ...await updateGraph(env, id, row, { ...data, payload, checkpoint: true }, now), payload });
  }
  if (operation) throw fault(405, 'Method not allowed.');
  if (method === 'GET') return json(documentValue(row));
  if (method === 'DELETE') {
    const data = await readJson(request);
    if (!Number.isSafeInteger(data.baseRevision)) throw fault(400, 'A graph revision is required.');
    const result = await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO graph_deletions SELECT id,? FROM documents WHERE id=? AND revision=?').bind(now, id, data.baseRevision),
      env.DB.prepare('DELETE FROM documents WHERE id=? AND revision=? RETURNING id').bind(id, data.baseRevision)
    ]);
    if (!result[1].results.length) throw fault(409, 'This graph changed. Refresh before deleting.');
    return json({ ok: true });
  }
  if (method !== 'PUT') throw fault(405, 'Method not allowed.');
  const data = await readJson(request); validateWrite(data);
  if (row) return json(await updateGraph(env, id, row, data, now));
  if (await env.DB.prepare('SELECT document_id FROM graph_deletions WHERE document_id=?').bind(id).first()) throw fault(410, 'This graph was deleted. Save your local work as a new graph.');
  if (data.baseRevision !== 0) throw fault(409, 'Graph no longer exists. Save your work as a new graph.');
  const result = await env.DB.batch([
    env.DB.prepare(`INSERT INTO documents (id,title,content,revision,updated_at,checkpoint_at,session_id,write_id)
      SELECT ?,?,?,1,?,?,?,? WHERE (SELECT COUNT(*) FROM documents d LEFT JOIN graph_owners o ON o.document_id=d.id WHERE COALESCE(o.username,?)=?)<500
      AND NOT EXISTS (SELECT 1 FROM graph_deletions WHERE document_id=?)
      ON CONFLICT(id) DO NOTHING RETURNING revision,updated_at AS updatedAt`)
      .bind(id, validatePayload(data.payload), JSON.stringify(data.payload), now, now, data.sessionId, data.writeId, adminName(env), user.username, id),
    env.DB.prepare(`INSERT INTO graph_owners SELECT id,? FROM documents WHERE changes()=1 AND id=? AND write_id=? AND session_id=?
      ON CONFLICT(document_id) DO NOTHING`).bind(user.username, id, data.writeId, data.sessionId)
  ]);
  if (!result[0].results[0]) throw fault(409, 'The graph already exists or the library has reached its limit.');
  return json(result[0].results[0]);
}

export async function handleAPI(request, env, ctx) {
  const origin = request.headers.get('origin'), ownOrigin = new URL(request.url).origin;
  const allowed = new Set([ownOrigin, ...(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
  const cors = { Vary: 'Origin', ...(origin && allowed.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}) };
  let response;
  try {
    if (origin && !allowed.has(origin)) throw fault(403, 'Request origin is not allowed.');
    if (request.method === 'OPTIONS') {
      if (!origin || !allowed.has(origin)) throw fault(403, 'Request origin is not allowed.');
      return new Response(null, { status: 204, headers: { ...cors,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Theorem-Request,X-Theorem-Share',
        'Access-Control-Max-Age': '600' } });
    }
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw fault(405, 'Method not allowed.');
    if (request.method !== 'GET' && (!origin || request.headers.get('x-theorem-request') !== '1')) throw fault(403, 'Request origin is not allowed.');
    response = await routes(request, env, ctx);
  } catch (error) {
    response = json({ error: error.status ? error.message : 'Storage is temporarily unavailable. Your local draft can be retried.' }, error.status || 503);
  }
  const headers = new Headers(response.headers);
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}
