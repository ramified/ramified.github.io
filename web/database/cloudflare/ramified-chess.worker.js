const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

const SUPPORTED_GAME_MODES = new Set([
  'gomoku',
  'go',
  'connect-four',
  'reversi',
  'fide-chess'
]);

const PLAYER_ROLES_BY_MODE = {
  gomoku: ['black', 'white'],
  go: ['black', 'white'],
  'connect-four': ['red', 'yellow'],
  reversi: ['black', 'white'],
  'fide-chess': ['white', 'black']
};

const ROOM_CODE_ALPHABET = '0123456789';
const ROOM_CODE_LENGTH = 6;
const MAX_JSON_BYTES = 850 * 1024;
const APPROVAL_TTL_MS = 45 * 1000;
const APPROVED_HISTORY_TTL_MS = 20 * 1000;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'POST' && path === '/api/rooms') {
        return await createRoom(request, env);
      }

      const roomMetaMatch = /^\/api\/rooms\/([A-Z2-9]{4,8})$/i.exec(path);
      if (request.method === 'GET' && roomMetaMatch) {
        const roomCode = normalizeRoomCode(roomMetaMatch[1]);
        const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
        return addCors(await stub.fetch(new Request(`https://room/meta?roomCode=${roomCode}`)));
      }

      const wsMatch = /^\/ws\/([A-Z2-9]{4,8})$/i.exec(path);
      if (request.method === 'GET' && wsMatch) {
        if (request.headers.get('Upgrade') !== 'websocket') {
          return jsonResponse({ error: 'Expected WebSocket upgrade.' }, 426);
        }
        const roomCode = normalizeRoomCode(wsMatch[1]);
        const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
        return stub.fetch(request);
      }

      return jsonResponse({ error: 'Not found.' }, 404);
    } catch (error) {
      return jsonResponse({ error: error && error.message ? error.message : 'Worker error.' }, 500);
    }
  }
};

export class GameRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.sessions = new Map();
    if (this.ctx.getWebSockets) {
      this.ctx.getWebSockets().forEach((ws) => {
        const attachment = safeAttachment(ws);
        this.sessions.set(ws, attachment);
      });
    }
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/init' && request.method === 'POST') return this.handleInit(request);
      if (url.pathname === '/meta' && request.method === 'GET') return this.handleMeta();
      if (/^\/ws\//.test(url.pathname) && request.headers.get('Upgrade') === 'websocket') return this.handleWebSocket(request);
      return jsonResponse({ error: 'Room endpoint not found.' }, 404);
    } catch (error) {
      return jsonResponse({
        error: `Room error: ${error && error.message ? error.message : 'Durable Object exception.'}`
      }, 500);
    }
  }

  async handleInit(request) {
    const body = await readJson(request);
    const roomCode = normalizeRoomCode(body.roomCode);
    if (!roomCode) return jsonResponse({ error: 'Invalid room code.' }, 400);
    await this.loadRoom();
    if (this.room) return jsonResponse({ error: 'Room already exists.' }, 409);

    const gameMode = normalizeGameMode(body.gameMode);
    if (!SUPPORTED_GAME_MODES.has(gameMode)) {
      return jsonResponse({ error: 'Unsupported game mode.' }, 400);
    }
    const snapshot = body.snapshot;
    validateSnapshot(snapshot, gameMode);
    const clientId = normalizeClientId(body.clientId);
    if (!clientId) return jsonResponse({ error: 'Missing client id.' }, 400);

    const roles = {};
    const role = assignRequestedRole(roles, gameMode, body.role, clientId);
    const now = new Date().toISOString();
    this.room = {
      roomCode,
      gameMode,
      version: 0,
      snapshot,
      summary: sanitizeText(body.summary, 220),
      roles,
      pendingApproval: null,
      approvedHistory: null,
      createdAt: now,
      updatedAt: now
    };
    await this.saveRoom();
    return jsonResponse(publicRoomPayload(this.room, { role }));
  }

  async handleMeta() {
    await this.loadRoom();
    if (!this.room) return jsonResponse({ error: 'Room not found.' }, 404);
    return jsonResponse(publicRoomPayload(this.room));
  }

  async handleWebSocket(request) {
    await this.loadRoom();
    if (!this.room) return jsonResponse({ error: 'Room not found.' }, 404);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const url = new URL(request.url);
    const clientId = normalizeClientId(url.searchParams.get('clientId')) || `anon-${crypto.randomUUID()}`;
    const attachment = {
      clientId,
      role: '',
      joined: false,
      connectedAt: new Date().toISOString()
    };
    this.sessions.set(server, attachment);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async webSocketMessage(ws, message) {
    await this.loadRoom();
    if (!this.room) {
      this.safeSend(ws, { type: 'error', error: 'Room not found.' });
      return;
    }
    let payload;
    try {
      payload = JSON.parse(String(message || ''));
    } catch (_) {
      this.safeSend(ws, { type: 'error', error: 'Malformed JSON message.' });
      return;
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      this.safeSend(ws, { type: 'error', error: 'Message must be a JSON object.' });
      return;
    }
    const size = byteLength(JSON.stringify(payload));
    if (size > MAX_JSON_BYTES) {
      this.safeSend(ws, { type: 'error', error: 'Message is too large.' });
      return;
    }

    if (payload.type === 'hello') {
      await this.handleHello(ws, payload);
      return;
    }
    if (payload.type === 'proposeMove') {
      await this.handleProposeMove(ws, payload);
      return;
    }
    if (payload.type === 'historyRequest') {
      await this.handleHistoryRequest(ws, payload);
      return;
    }
    if (payload.type === 'approvalResponse') {
      await this.handleApprovalResponse(ws, payload);
      return;
    }
    if (payload.type === 'resync') {
      this.sendState(ws, { reason: 'resync' });
      return;
    }
    if (payload.type === 'leave') {
      await this.releaseSocketRole(ws);
      ws.close(1000, 'left room');
      return;
    }
    this.safeSend(ws, { type: 'error', error: 'Unknown message type.' });
  }

  async webSocketClose(ws) {
    this.sessions.delete(ws);
    this.broadcastPresence();
  }

  async webSocketError(ws) {
    this.sessions.delete(ws);
    this.broadcastPresence();
  }

  async handleHello(ws, payload) {
    const clientId = normalizeClientId(payload.clientId) || safeAttachment(ws).clientId;
    const attachment = {
      ...safeAttachment(ws),
      clientId,
      role: assignRequestedRole(this.room.roles, this.room.gameMode, payload.role, clientId),
      joined: true
    };
    this.sessions.set(ws, attachment);
    ws.serializeAttachment(attachment);
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.safeSend(ws, {
      type: 'joined',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      role: attachment.role,
      version: this.room.version,
      roles: publicRoles(this.room.roles)
    });
    this.sendState(ws, { reason: 'join' });
    this.broadcastPresence();
  }

  async handleProposeMove(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined) {
      this.safeSend(ws, { type: 'rejected', error: 'Join the room before moving.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    const role = normalizeRole(attachment.role);
    if (!role || role === 'spectator') {
      this.safeSend(ws, { type: 'rejected', error: 'Spectators cannot move.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    if (Number(payload.baseVersion) !== this.room.version) {
      this.safeSend(ws, { type: 'rejected', error: 'Stale move; resyncing current room state.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    const action = normalizeAction(payload.action);
    const historyIssue = this.historyActionIssue(action, attachment.clientId);
    if (historyIssue) {
      this.safeSend(ws, { type: 'rejected', error: historyIssue, version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    const turnIssue = historyActionType(action.type) ? '' : this.turnIssue(role, action);
    if (turnIssue) {
      this.safeSend(ws, { type: 'rejected', error: turnIssue, version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    try {
      validateSnapshot(payload.snapshot, this.room.gameMode);
    } catch (error) {
      this.safeSend(ws, { type: 'rejected', error: error.message, version: this.room.version, snapshot: this.room.snapshot });
      return;
    }

    this.room.version += 1;
    this.room.snapshot = payload.snapshot;
    this.room.summary = sanitizeText(payload.summary, 220);
    this.room.updatedAt = new Date().toISOString();
    if (historyActionType(action.type)) this.room.approvedHistory = null;
    await this.saveRoom();

    const stateMessage = {
      type: 'state',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      version: this.room.version,
      snapshot: this.room.snapshot,
      summary: this.room.summary,
      action,
      clientId: attachment.clientId,
      role
    };
    this.broadcast(stateMessage);
    this.safeSend(ws, { type: 'accepted', version: this.room.version, action });
  }

  async handleHistoryRequest(ws, payload) {
    const attachment = safeAttachment(ws);
    const kind = payload.kind === 'redo' ? 'redo' : 'undo';
    if (!attachment.joined || attachment.role === 'spectator') {
      this.safeSend(ws, { type: 'historyRejected', kind, error: 'Only players can request undo/redo.' });
      return;
    }
    if (Number(payload.baseVersion) !== this.room.version) {
      this.safeSend(ws, { type: 'historyRejected', kind, error: 'Stale history request; resync first.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    this.expireApprovals();
    if (this.room.pendingApproval) {
      this.safeSend(ws, { type: 'historyRejected', kind, error: 'Another undo/redo request is already pending.' });
      return;
    }
    const approvers = this.playerSockets().filter(({ attachment: item }) => (
      item.clientId !== attachment.clientId && item.role !== 'spectator'
    ));
    if (!approvers.length) {
      this.safeSend(ws, { type: 'historyRejected', kind, error: 'No opponent is connected to approve this request.' });
      return;
    }
    const requestId = crypto.randomUUID();
    this.room.pendingApproval = {
      requestId,
      kind,
      requesterClientId: attachment.clientId,
      requesterRole: attachment.role,
      baseVersion: this.room.version,
      expiresAt: Date.now() + APPROVAL_TTL_MS,
      summary: sanitizeText(payload.summary || this.room.summary, 220)
    };
    await this.saveRoom();
    approvers.forEach(({ ws: target }) => {
      this.safeSend(target, {
        type: 'approvalRequest',
        requestId,
        kind,
        requesterRole: attachment.role,
        version: this.room.version,
        summary: this.room.pendingApproval.summary
      });
    });
    this.safeSend(ws, {
      type: 'approvalPending',
      requestId,
      kind,
      version: this.room.version,
      message: `Waiting for opponent to approve ${kind}.`
    });
  }

  async handleApprovalResponse(ws, payload) {
    const attachment = safeAttachment(ws);
    this.expireApprovals();
    const pending = this.room.pendingApproval;
    if (!pending || payload.requestId !== pending.requestId) {
      this.safeSend(ws, { type: 'approvalResolved', allowed: false, message: 'No matching history request is pending.' });
      return;
    }
    if (attachment.clientId === pending.requesterClientId || attachment.role === 'spectator') {
      this.safeSend(ws, { type: 'approvalResolved', allowed: false, message: 'This client cannot approve the request.' });
      return;
    }
    const requester = this.findSocketByClientId(pending.requesterClientId);
    if (payload.allow) {
      this.room.approvedHistory = {
        requestId: pending.requestId,
        kind: pending.kind,
        requesterClientId: pending.requesterClientId,
        expiresAt: Date.now() + APPROVED_HISTORY_TTL_MS
      };
      this.room.pendingApproval = null;
      await this.saveRoom();
      if (requester) {
        this.safeSend(requester.ws, {
          type: 'historyApproved',
          requestId: this.room.approvedHistory.requestId,
          kind: this.room.approvedHistory.kind,
          version: this.room.version
        });
      }
      this.safeSend(ws, { type: 'approvalResolved', allowed: true, message: `${pending.kind} approved.` });
      return;
    }

    this.room.pendingApproval = null;
    await this.saveRoom();
    if (requester) {
      this.safeSend(requester.ws, {
        type: 'historyRejected',
        requestId: pending.requestId,
        kind: pending.kind,
        error: `${pending.kind} was rejected by the opponent.`
      });
    }
    this.safeSend(ws, { type: 'approvalResolved', allowed: false, message: `${pending.kind} rejected.` });
  }

  historyActionIssue(action, clientId) {
    if (!historyActionType(action.type)) return '';
    this.expireApprovals();
    const approved = this.room.approvedHistory;
    if (!approved) return 'Undo/redo was not approved.';
    if (approved.requestId !== action.approvedRequestId) return 'Undo/redo approval id does not match.';
    if (approved.kind !== (action.type === 'history-redo' ? 'redo' : 'undo')) return 'Undo/redo approval kind does not match.';
    if (approved.requesterClientId !== clientId) return 'Only the requesting client can apply the approved history change.';
    return '';
  }

  turnIssue(role, action) {
    if (goReviewActionType(action.type) && this.room.snapshot && this.room.snapshot.scoringReview) return '';
    const expected = normalizeRole(this.room.snapshot && this.room.snapshot.turn);
    if (expected && expected !== role) return `${expected} to move.`;
    return '';
  }

  async releaseSocketRole(ws) {
    const attachment = safeAttachment(ws);
    if (!attachment || !attachment.clientId || !this.room || !this.room.roles) return;
    Object.keys(this.room.roles).forEach((role) => {
      if (this.room.roles[role] === attachment.clientId) delete this.room.roles[role];
    });
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.broadcastPresence();
  }

  expireApprovals() {
    const now = Date.now();
    if (this.room.pendingApproval && this.room.pendingApproval.expiresAt <= now) this.room.pendingApproval = null;
    if (this.room.approvedHistory && this.room.approvedHistory.expiresAt <= now) this.room.approvedHistory = null;
  }

  sendState(ws, extra = {}) {
    this.safeSend(ws, {
      type: 'state',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      version: this.room.version,
      snapshot: this.room.snapshot,
      summary: this.room.summary,
      ...extra
    });
  }

  broadcast(message) {
    this.sessions.forEach((attachment, ws) => {
      if (!attachment.joined) return;
      this.safeSend(ws, message);
    });
  }

  broadcastPresence() {
    if (!this.room) return;
    this.broadcast({
      type: 'presence',
      roomCode: this.room.roomCode,
      roles: publicRoles(this.room.roles),
      connected: this.playerSockets().length
    });
  }

  playerSockets() {
    const sockets = [];
    this.sessions.forEach((attachment, ws) => {
      if (attachment.joined) sockets.push({ ws, attachment });
    });
    return sockets;
  }

  findSocketByClientId(clientId) {
    return this.playerSockets().find(({ attachment }) => attachment.clientId === clientId) || null;
  }

  safeSend(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch (_) {
      this.sessions.delete(ws);
    }
  }

  async loadRoom() {
    if (this.room) return;
    this.room = await this.ctx.storage.get('room');
  }

  async saveRoom() {
    await this.ctx.storage.put('room', this.room);
  }
}

async function createRoom(request, env) {
  const body = await readJson(request);
  const gameMode = normalizeGameMode(body.gameMode);
  if (!SUPPORTED_GAME_MODES.has(gameMode)) return jsonResponse({ error: 'Unsupported game mode.' }, 400);
  validateSnapshot(body.snapshot, gameMode);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = randomRoomCode();
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
    const initRequest = new Request('https://room/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, roomCode, gameMode })
    });
    const response = await stub.fetch(initRequest);
    if (response.status !== 409) return addCors(response);
  }
  return jsonResponse({ error: 'Could not allocate a room code; try again.' }, 503);
}

async function readJson(request) {
  const text = await request.text();
  if (byteLength(text) > MAX_JSON_BYTES) throw new Error('Request body is too large.');
  try {
    return JSON.parse(text || '{}');
  } catch (_) {
    throw new Error('Request body must be valid JSON.');
  }
}

function validateSnapshot(snapshot, gameMode) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Missing game snapshot.');
  }
  if (byteLength(JSON.stringify(snapshot)) > MAX_JSON_BYTES) {
    throw new Error('Game snapshot is too large.');
  }
  const snapshotMode = normalizeGameMode(snapshot.gameMode);
  if (snapshotMode !== gameMode) {
    throw new Error('Snapshot game mode does not match the room.');
  }
  if (gameMode === 'fide-chess') {
    const variant = String(snapshot.fideChessVariant || snapshot.chessVariant || snapshot.variant || '').toLowerCase();
    if (variant.includes('puzzle')) throw new Error('FIDE chess puzzle mode is not supported online.');
  }
}

function normalizeAction(action) {
  const source = action && typeof action === 'object' && !Array.isArray(action) ? action : {};
  const result = {};
  Object.keys(source).slice(0, 24).forEach((key) => {
    const value = source[key];
    if (value == null) return;
    if (typeof value === 'string') result[key] = sanitizeText(value, 180);
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'boolean') result[key] = value;
  });
  result.type = sanitizeText(result.type || 'move', 48).toLowerCase();
  result.clientId = sanitizeText(result.clientId || '', 90);
  result.approvedRequestId = sanitizeText(result.approvedRequestId || '', 90);
  return result;
}

function assignRequestedRole(roles, gameMode, requestedRole, clientId) {
  const available = PLAYER_ROLES_BY_MODE[gameMode] || [];
  const requested = normalizeRole(requestedRole);
  const existing = available.find((role) => roles[role] === clientId);
  if (existing) return existing;
  if (requested === 'spectator') return 'spectator';
  if (available.includes(requested) && (!roles[requested] || roles[requested] === clientId)) {
    roles[requested] = clientId;
    return requested;
  }
  const open = available.find((role) => !roles[role]);
  if (open) {
    roles[open] = clientId;
    return open;
  }
  return 'spectator';
}

function publicRoomPayload(room, extra = {}) {
  return {
    roomCode: room.roomCode,
    gameMode: room.gameMode,
    version: room.version,
    summary: room.summary || '',
    roles: publicRoles(room.roles),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    ...extra
  };
}

function publicRoles(roles) {
  const result = {};
  Object.keys(roles || {}).forEach((role) => {
    result[role] = !!roles[role];
  });
  return result;
}

function randomRoomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

function normalizeRoomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8);
}

function normalizeGameMode(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 32);
}

function normalizeClientId(value) {
  const id = String(value || '').trim();
  return /^[a-zA-Z0-9._:-]{8,100}$/.test(id) ? id : '';
}

function historyActionType(type) {
  return type === 'history-undo' || type === 'history-redo';
}

function goReviewActionType(type) {
  return type === 'go-dead-group'
    || type === 'go-territory'
    || type === 'go-confirm-score'
    || type === 'go-scoring-method';
}

function safeAttachment(ws) {
  try {
    return ws.deserializeAttachment ? (ws.deserializeAttachment() || {}) : {};
  } catch (_) {
    return {};
  }
}

function sanitizeText(value, maxLength = 200) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, maxLength);
}

function byteLength(text) {
  return new TextEncoder().encode(String(text || '')).length;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS
  });
}

function addCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
