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
  'billiards',
  'hex',
  'gomoku',
  'go',
  'connect-four',
  'reversi',
  'fide-chess',
  'chinese-checkers'
]);

const PLAYER_ROLES_BY_MODE = {
  billiards: ['player-1', 'player-2'],
  hex: ['red', 'blue'],
  gomoku: ['black', 'white'],
  go: ['black', 'white'],
  'connect-four': ['red', 'yellow'],
  reversi: ['black', 'white'],
  'fide-chess': ['white', 'black'],
  'chinese-checkers': ['red', 'yellow']
};

const ROOM_CODE_ALPHABET = '0123456789';
const ROOM_CODE_LENGTH = 6;
const MAX_JSON_BYTES = 850 * 1024;
const APPROVAL_TTL_MS = 45 * 1000;
const APPROVED_HISTORY_TTL_MS = 20 * 1000;
const ROOM_INDEX_OBJECT_NAME = '__room-index__';
const ROOM_INDEX_STORAGE_KEY = 'rooms';
const ROOM_INDEX_MAX_ROOMS = 200;
const ROOM_EMPTY_TTL_MS = 5 * 60 * 1000;
const ROOM_EXPIRY_RETRY_MS = 60 * 1000;
const ANALYTICS_OBJECT_PREFIX = '__analytics__:';
const ANALYTICS_STORAGE_KEY = 'aggregate';
const ANALYTICS_MAX_SECONDS = 60;
const ANALYTICS_MAX_REPORT_DAYS = 31;
const ANALYTICS_GAME_MODES = new Set([
  '2048',
  'billiards',
  'chinese-checkers',
  'connect-four',
  'fide-chess',
  'go',
  'gomoku',
  'hex',
  'lianliankan',
  'reversi',
  'sokoban',
  'unknown'
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/api/analytics' && request.method === 'OPTIONS') {
        return analyticsPreflightResponse(request, env);
      }

      if (path === '/api/analytics' && request.method === 'POST') {
        return await recordAnalyticsRequest(request, env);
      }

      if (path === '/admin/analytics' && request.method === 'GET') {
        return analyticsAdminPageResponse(request, env);
      }

      if (path === '/api/admin/analytics' && request.method === 'GET') {
        return await analyticsAdminReportResponse(request, env, url);
      }

      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

      if (request.method === 'POST' && path === '/api/rooms') {
        return await createRoom(request, env);
      }

      if (request.method === 'GET' && path === '/api/rooms') {
        return await listRooms(env);
      }

      const roomMetaMatch = /^\/api\/rooms\/([A-Z0-9]{4,8})$/i.exec(path);
      if (request.method === 'GET' && roomMetaMatch) {
        const roomCode = normalizeRoomCode(roomMetaMatch[1]);
        const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
        return addCors(await stub.fetch(new Request(`https://room/meta?roomCode=${roomCode}`)));
      }

      const wsMatch = /^\/ws\/([A-Z0-9]{4,8})$/i.exec(path);
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
      if (url.pathname === '/analytics/record' && request.method === 'POST') return this.handleAnalyticsRecord(request);
      if (url.pathname === '/analytics/report' && request.method === 'GET') return this.handleAnalyticsReport();
      if (url.pathname === '/room-index/register' && request.method === 'POST') return this.handleRoomIndexRegister(request);
      if (url.pathname === '/room-index/remove' && request.method === 'POST') return this.handleRoomIndexRemove(request);
      if (url.pathname === '/room-index/list' && request.method === 'GET') return this.handleRoomIndexList();
      if (url.pathname === '/lifecycle/reconcile' && request.method === 'POST') return this.handleLifecycleReconcile();
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
    validateSnapshot(snapshot, gameMode, { initial: true });
    const clientId = normalizeClientId(body.clientId);
    if (!clientId) return jsonResponse({ error: 'Missing client id.' }, 400);

    const roles = {};
    const playerNames = {};
    const rolesAssigned = assignRequestedRoles(roles, gameMode, body.rolesRequested || body.role, clientId, snapshot);
    const playerName = normalizePlayerName(body.playerName, clientId);
    playerNames[clientId] = playerName;
    const now = new Date().toISOString();
    this.room = {
      roomCode,
      gameMode,
      version: 0,
      snapshot,
      summary: sanitizeText(body.summary, 220),
      roles,
      playerNames,
      readyToPlay: false,
      roundState: 'waiting',
      readyClientIds: [],
      rematch: null,
      roundStartSnapshot: snapshot,
      pendingApproval: null,
      approvedHistory: null,
      disconnected: {},
      emptySince: now,
      createdAt: now,
      updatedAt: now
    };
    updateRoomReadiness(this.room);
    await this.saveRoom();
    await this.ctx.storage.setAlarm(Date.now() + ROOM_EMPTY_TTL_MS);
    return jsonResponse(publicRoomPayload(this.room, {
      role: rolesAssigned[0] || 'spectator',
      rolesAssigned
    }));
  }

  async handleMeta() {
    await this.loadRoom();
    if (!this.room) return jsonResponse({ error: 'Room not found.' }, 404);
    updateRoomReadiness(this.room);
    return jsonResponse(publicRoomPayload(this.room));
  }

  async handleAnalyticsRecord(request) {
    const event = normalizeAnalyticsEvent(await readJson(request));
    if (!event) return jsonResponse({ error: 'Invalid analytics event.' }, 400);
    const current = normalizeAnalyticsAggregate(await this.ctx.storage.get(ANALYTICS_STORAGE_KEY), event.day);
    current.events += 1;
    current.updatedAt = new Date().toISOString();
    const game = analyticsMetricBucket(current.byGame, event.gameMode);
    const country = analyticsMetricBucket(current.byCountry, event.country);
    if (event.type === 'visit') {
      current.visits += 1;
      game.visits += 1;
      country.visits += 1;
    } else {
      current.activeSeconds += event.activeSeconds;
      game.activeSeconds += event.activeSeconds;
      country.activeSeconds += event.activeSeconds;
    }
    await this.ctx.storage.put(ANALYTICS_STORAGE_KEY, current);
    return jsonResponse({ ok: true });
  }

  async handleAnalyticsReport() {
    const aggregate = await this.ctx.storage.get(ANALYTICS_STORAGE_KEY);
    return jsonResponse({ aggregate: aggregate ? normalizeAnalyticsAggregate(aggregate) : null });
  }

  async handleRoomIndexRegister(request) {
    const body = await readJson(request);
    const entry = normalizeRoomIndexEntry(body);
    if (!entry) return jsonResponse({ error: 'Invalid room index entry.' }, 400);
    const existing = await this.ctx.storage.get(ROOM_INDEX_STORAGE_KEY);
    const rooms = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    rooms[entry.roomCode] = entry;
    await this.ctx.storage.put(ROOM_INDEX_STORAGE_KEY, pruneRoomIndex(rooms));
    return jsonResponse({ ok: true });
  }

  async handleRoomIndexRemove(request) {
    const body = await readJson(request);
    const roomCode = normalizeRoomCode(body.roomCode || body.code);
    if (!roomCode) return jsonResponse({ error: 'Invalid room code.' }, 400);
    const existing = await this.ctx.storage.get(ROOM_INDEX_STORAGE_KEY);
    const rooms = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    if (Object.prototype.hasOwnProperty.call(rooms, roomCode)) {
      delete rooms[roomCode];
      await this.ctx.storage.put(ROOM_INDEX_STORAGE_KEY, rooms);
    }
    return jsonResponse({ ok: true });
  }

  async handleRoomIndexList() {
    const existing = await this.ctx.storage.get(ROOM_INDEX_STORAGE_KEY);
    const rooms = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
    const now = Date.now();
    const reconciled = new Map();
    for (const entry of roomIndexList(rooms)) {
      if (!roomIndexEntryNeedsReconciliation(entry, now)) continue;
      try {
        const lifecycle = await reconcileIndexedRoom(this.env, entry.roomCode);
        const connected = Math.max(0, Math.floor(Number(lifecycle && lifecycle.connected) || 0));
        const expiresAt = normalizeOptionalTimestamp(lifecycle && lifecycle.expiresAt);
        if (!lifecycle || lifecycle.exists === false || connected === 0 && (!expiresAt || Date.parse(expiresAt) <= now)) {
          reconciled.set(entry.roomCode, { previous: entry, remove: true });
          continue;
        }
        reconciled.set(entry.roomCode, {
          previous: entry,
          entry: normalizeRoomIndexEntry({
            ...entry,
            ...(lifecycle.room || {}),
            verifiedAt: new Date(now).toISOString(),
            expiresAt: connected > 0 ? '' : expiresAt
          })
        });
      } catch (_) {
        // Keep the prior entry on transient room/index errors and retry on the next search.
      }
    }
    if (!reconciled.size) return jsonResponse({ rooms: roomIndexList(rooms).map(publicRoomIndexEntry) });

    const latestStored = await this.ctx.storage.get(ROOM_INDEX_STORAGE_KEY);
    const latest = latestStored && typeof latestStored === 'object' && !Array.isArray(latestStored) ? latestStored : {};
    let changed = false;
    reconciled.forEach((result, roomCode) => {
      const current = normalizeRoomIndexEntry(latest[roomCode]);
      if (!sameRoomIndexLease(current, result.previous)) return;
      if (result.remove) delete latest[roomCode];
      else latest[roomCode] = result.entry;
      changed = true;
    });
    if (changed) await this.ctx.storage.put(ROOM_INDEX_STORAGE_KEY, pruneRoomIndex(latest));
    return jsonResponse({ rooms: roomIndexList(latest).map(publicRoomIndexEntry) });
  }

  async handleLifecycleReconcile() {
    await this.loadRoom();
    if (!this.room) return jsonResponse({ exists: false }, 404);
    const connected = this.playerSockets().length;
    if (connected > 0) {
      if (this.room.emptySince) {
        this.room.emptySince = null;
        await this.saveRoom();
      }
      await this.ctx.storage.deleteAlarm();
      return jsonResponse({ exists: true, connected, room: publicRoomPayload(this.room), expiresAt: '' });
    }
    const expiresAt = await this.ensureEmptyRoomExpiry({ inferExisting: true, publish: false });
    return jsonResponse({ exists: true, connected: 0, room: publicRoomPayload(this.room), expiresAt });
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
      roles: [],
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
    if (payload.type === 'claimRoles') {
      await this.handleClaimRoles(ws, payload);
      return;
    }
    if (payload.type === 'updateName') {
      await this.handleUpdateName(ws, payload);
      return;
    }
    if (payload.type === 'setReady') {
      await this.handleSetReady(ws, payload);
      return;
    }
    if (payload.type === 'proposeRematch') {
      await this.handleProposeRematch(ws, payload);
      return;
    }
    if (payload.type === 'acceptRematch') {
      await this.handleAcceptRematch(ws, payload);
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
      const attachment = safeAttachment(ws);
      const nextAttachment = { ...attachment, leaving: true };
      this.sessions.set(ws, nextAttachment);
      ws.serializeAttachment(nextAttachment);
      await this.releaseSocketRole(ws, { announce: true });
      ws.close(1000, 'left room');
      return;
    }
    this.safeSend(ws, { type: 'error', error: 'Unknown message type.' });
  }

  async webSocketClose(ws) {
    await this.finishSocket(ws, 'disconnected');
  }

  async webSocketError(ws) {
    await this.finishSocket(ws, 'connection error');
  }

  async alarm() {
    await this.loadRoom();
    if (!this.room) return;
    if (this.playerSockets().length > 0) {
      this.room.emptySince = null;
      await this.saveRoom();
      try {
        await this.publishRoomIndex({ throwOnError: true });
      } catch (_) {
        await this.ctx.storage.setAlarm(Date.now() + ROOM_EXPIRY_RETRY_MS);
        return;
      }
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const emptySince = roomEmptySinceTime(this.room, Date.now());
    const expiresAt = emptySince + ROOM_EMPTY_TTL_MS;
    if (Date.now() < expiresAt) {
      await this.ctx.storage.setAlarm(expiresAt);
      return;
    }

    const roomCode = this.room.roomCode;
    const expectedEmptySince = this.room.emptySince;
    try {
      await unregisterRoomFromIndex(this.env, roomCode);
    } catch (_) {
      await this.ctx.storage.setAlarm(Date.now() + ROOM_EXPIRY_RETRY_MS);
      return;
    }

    if (this.playerSockets().length > 0 || this.room.emptySince !== expectedEmptySince) {
      this.room.emptySince = null;
      await this.saveRoom();
      try {
        await this.publishRoomIndex({ throwOnError: true });
      } catch (_) {
        await this.ctx.storage.setAlarm(Date.now() + ROOM_EXPIRY_RETRY_MS);
        return;
      }
      await this.ctx.storage.deleteAlarm();
      return;
    }

    await this.ctx.storage.deleteAll();
    this.room = null;
  }

  async handleHello(ws, payload) {
    const clientId = normalizeClientId(payload.clientId) || safeAttachment(ws).clientId;
    const playerName = normalizePlayerName(payload.playerName, clientId);
    if (!this.room.playerNames || typeof this.room.playerNames !== 'object') this.room.playerNames = {};
    this.room.playerNames[clientId] = playerName;
    const reconnected = !!(this.room.disconnected && this.room.disconnected[clientId]);
    const rolesAssigned = assignRequestedRoles(
      this.room.roles,
      this.room.gameMode,
      payload.rolesRequested || payload.role,
      clientId,
      this.room.snapshot
    );
    const attachment = {
      ...safeAttachment(ws),
      clientId,
      playerName,
      role: rolesAssigned[0] || 'spectator',
      roles: rolesAssigned,
      joined: true
    };
    this.sessions.set(ws, attachment);
    ws.serializeAttachment(attachment);
    this.room.updatedAt = new Date().toISOString();
    this.room.emptySince = null;
    if (reconnected && this.room.disconnected) delete this.room.disconnected[clientId];
    updateRoomReadiness(this.room);
    await this.ctx.storage.deleteAlarm();
    await this.saveRoom();
    await this.publishRoomIndex();
    this.safeSend(ws, {
      type: 'joined',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      role: attachment.role,
      rolesAssigned: attachment.roles,
      version: this.room.version,
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      readyToPlay: this.room.readyToPlay !== false,
      unclaimedRoles: unclaimedRoomRoles(this.room)
    });
    this.sendState(ws, { reason: 'join' });
    if (reconnected) this.broadcastPlayerReconnect(attachment);
    this.broadcastPresence();
  }

  async handleClaimRoles(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined) {
      this.safeSend(ws, { type: 'error', error: 'Join the room before choosing colors.' });
      return;
    }
    if (this.room.gameMode !== 'chinese-checkers') {
      this.safeSend(ws, { type: 'error', error: 'Color claiming is only available for Chinese Checkers.' });
      return;
    }
    if (this.room.readyToPlay !== false) {
      this.safeSend(ws, { type: 'error', error: 'Chinese Checkers has already begun.' });
      return;
    }
    const clientId = normalizeClientId(payload.clientId) || attachment.clientId;
    if (clientId !== attachment.clientId) {
      this.safeSend(ws, { type: 'error', error: 'Client id does not match this connection.' });
      return;
    }
    if (!this.room.playerNames || typeof this.room.playerNames !== 'object') this.room.playerNames = {};
    this.room.playerNames[clientId] = normalizePlayerName(payload.playerName, clientId);
    const rolesAssigned = claimRequestedChineseCheckersRoles(
      this.room.roles,
      payload.rolesRequested || payload.role,
      clientId,
      this.room.snapshot
    );
    const nextAttachment = {
      ...attachment,
      playerName: this.room.playerNames[clientId],
      role: rolesAssigned[0] || 'spectator',
      roles: rolesAssigned,
      joined: true
    };
    this.sessions.set(ws, nextAttachment);
    ws.serializeAttachment(nextAttachment);
    this.room.updatedAt = new Date().toISOString();
    updateRoomReadiness(this.room);
    await this.saveRoom();
    this.safeSend(ws, {
      type: 'rolesConfirmed',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      role: nextAttachment.role,
      rolesAssigned: nextAttachment.roles,
      version: this.room.version,
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      readyToPlay: this.room.readyToPlay !== false,
      unclaimedRoles: unclaimedRoomRoles(this.room)
    });
    this.broadcastPresence();
  }

  async handleUpdateName(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined) {
      this.safeSend(ws, { type: 'error', error: 'Join the room before setting a name.' });
      return;
    }
    const clientId = normalizeClientId(payload.clientId) || attachment.clientId;
    if (clientId !== attachment.clientId) {
      this.safeSend(ws, { type: 'error', error: 'Client id does not match this connection.' });
      return;
    }
    if (!this.room.playerNames || typeof this.room.playerNames !== 'object') this.room.playerNames = {};
    const playerName = normalizePlayerName(payload.playerName, clientId);
    this.room.playerNames[clientId] = playerName;
    const nextAttachment = { ...attachment, playerName };
    this.sessions.set(ws, nextAttachment);
    ws.serializeAttachment(nextAttachment);
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.safeSend(ws, {
      type: 'nameUpdated',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      role: nextAttachment.role || 'spectator',
      rolesAssigned: attachmentRoles(nextAttachment),
      version: this.room.version,
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      readyToPlay: this.room.readyToPlay !== false,
      unclaimedRoles: unclaimedRoomRoles(this.room)
    });
    this.broadcastPresence();
  }

  currentPlayableClientIds() {
    return uniqueStrings(this.playerSockets()
      .filter(({ attachment }) => attachmentHasPlayableRole(attachment))
      .map(({ attachment }) => attachment.clientId));
  }

  async handleSetReady(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined || !attachmentHasPlayableRole(attachment)) {
      this.safeSend(ws, { type: 'error', error: 'Only players can change readiness.' });
      return;
    }
    if (roomRoundState(this.room) !== 'waiting') {
      this.safeSend(ws, { type: 'error', error: 'The round is not waiting for players.' });
      return;
    }
    const current = this.currentPlayableClientIds();
    const ready = new Set(normalizeClientIds(this.room.readyClientIds).filter((clientId) => current.includes(clientId)));
    if (payload.ready === false) ready.delete(attachment.clientId);
    else ready.add(attachment.clientId);
    this.room.readyClientIds = Array.from(ready);
    if (current.length && current.every((clientId) => ready.has(clientId))) {
      this.room.roundState = 'playing';
      this.room.readyToPlay = true;
      this.room.readyClientIds = [];
    }
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.broadcastPresence();
  }

  async handleProposeRematch(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined || !attachmentHasPlayableRole(attachment)) {
      this.safeSend(ws, { type: 'error', error: 'Only players can suggest a rematch.' });
      return;
    }
    if (roomRoundState(this.room) !== 'finished') {
      this.safeSend(ws, { type: 'error', error: 'A rematch can be suggested after the game ends.' });
      return;
    }
    this.room.roundState = 'rematch-vote';
    this.room.readyToPlay = false;
    this.room.rematch = {
      proposerClientId: attachment.clientId,
      proposerName: normalizePlayerName(attachment.playerName, attachment.clientId),
      acceptedClientIds: [attachment.clientId]
    };
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.broadcastPresence();
  }

  async handleAcceptRematch(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined || !attachmentHasPlayableRole(attachment)) {
      this.safeSend(ws, { type: 'error', error: 'Only players can accept a rematch.' });
      return;
    }
    if (roomRoundState(this.room) !== 'rematch-vote' || !this.room.rematch) {
      this.safeSend(ws, { type: 'error', error: 'There is no rematch awaiting acceptance.' });
      return;
    }
    const players = this.currentPlayableClientIds();
    const accepted = new Set(normalizeClientIds(this.room.rematch.acceptedClientIds).filter((clientId) => players.includes(clientId)));
    accepted.add(attachment.clientId);
    this.room.rematch.acceptedClientIds = Array.from(accepted);
    if (!players.length || !players.every((clientId) => accepted.has(clientId))) {
      this.room.updatedAt = new Date().toISOString();
      await this.saveRoom();
      this.broadcastPresence();
      return;
    }
    rotateTwoPlayerRoomRoles(this.room, players);
    this.refreshSessionRoles();
    this.room.snapshot = this.room.roundStartSnapshot || this.room.snapshot;
    this.room.version += 1;
    this.room.roundState = 'playing';
    this.room.readyToPlay = true;
    this.room.readyClientIds = [];
    this.room.rematch = null;
    this.room.summary = 'Rematch started.';
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.playerSockets().forEach(({ ws: target, attachment: targetAttachment }) => {
      this.safeSend(target, {
        type: 'state',
        roomCode: this.room.roomCode,
        gameMode: this.room.gameMode,
        version: this.room.version,
        snapshot: this.room.snapshot,
        summary: this.room.summary,
        action: { type: 'rematch-start', gameMode: this.room.gameMode },
        clientId: attachment.clientId,
        role: targetAttachment.role || 'spectator',
        rolesAssigned: attachmentRoles(targetAttachment),
        roles: publicRoles(this.room.roles),
        rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
        ...publicRoundState(this.room)
      });
    });
  }

  async handleProposeMove(ws, payload) {
    const attachment = safeAttachment(ws);
    if (!attachment.joined) {
      this.safeSend(ws, { type: 'rejected', error: 'Join the room before moving.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    const roles = attachmentRoles(attachment);
    const role = roles[0] || 'spectator';
    if (!roles.length) {
      this.safeSend(ws, { type: 'rejected', error: 'Spectators cannot move.', version: this.room.version, snapshot: this.room.snapshot });
      return;
    }
    if (roomRoundState(this.room) !== 'playing') {
      this.safeSend(ws, { type: 'rejected', error: 'The online round is waiting for players.', version: this.room.version, snapshot: this.room.snapshot });
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
    const turnIssue = historyActionType(action.type) ? '' : this.turnIssue(roles, action, payload.snapshot);
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

    if (this.room.gameMode === 'hex' && action.type === 'pie-swap') {
      const red = this.room.roles && this.room.roles.red;
      const blue = this.room.roles && this.room.roles.blue;
      if (!red || !blue || red === blue) {
        this.safeSend(ws, { type: 'rejected', error: 'Pie swap requires both Hex players to be assigned.', version: this.room.version, snapshot: this.room.snapshot });
        return;
      }
      this.room.roles.red = blue;
      this.room.roles.blue = red;
      this.refreshSessionRoles();
    }

    this.room.version += 1;
    this.room.snapshot = payload.snapshot;
    this.room.summary = sanitizeText(payload.summary, 220);
    this.room.updatedAt = new Date().toISOString();
    if (historyActionType(action.type)) this.room.approvedHistory = null;
    if (payload.snapshot && ['gameover', 'complete'].includes(payload.snapshot.phase)) {
      this.room.roundState = 'finished';
      this.room.readyToPlay = false;
      this.room.readyClientIds = [];
      this.room.rematch = null;
    }
    updateRoomReadiness(this.room);
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
      role,
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      ...publicRoundState(this.room)
    };
    // Role ownership in the public map is deliberately boolean. Send each
    // connection its authoritative assignment separately so clients retain
    // their move permission and receive role changes such as a Hex pie swap.
    this.playerSockets().forEach(({ ws: target, attachment: targetAttachment }) => {
      this.safeSend(target, {
        ...stateMessage,
        role: targetAttachment.role || 'spectator',
        rolesAssigned: attachmentRoles(targetAttachment)
      });
    });
    this.safeSend(ws, {
      type: 'accepted',
      version: this.room.version,
      action,
      role: safeAttachment(ws).role || 'spectator',
      rolesAssigned: attachmentRoles(safeAttachment(ws)),
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      ...publicRoundState(this.room)
    });
  }

  async handleHistoryRequest(ws, payload) {
    const attachment = safeAttachment(ws);
    const kind = payload.kind === 'redo' ? 'redo' : 'undo';
    if (!attachment.joined || !attachmentHasPlayableRole(attachment)) {
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
      item.clientId !== attachment.clientId && attachmentHasPlayableRole(item)
    ));
    const approverClientIds = uniqueStrings(approvers.map(({ attachment: item }) => item.clientId));
    if (!approverClientIds.length) {
      this.safeSend(ws, { type: 'historyRejected', kind, error: 'No opponent is connected to approve this request.' });
      return;
    }
    const requestId = crypto.randomUUID();
    this.room.pendingApproval = {
      requestId,
      kind,
      requesterClientId: attachment.clientId,
      requesterRole: attachment.role,
      requesterRoles: attachmentRoles(attachment),
      approverClientIds,
      approvedClientIds: [],
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
        requesterRoles: attachmentRoles(attachment),
        version: this.room.version,
        summary: this.room.pendingApproval.summary
      });
    });
    this.safeSend(ws, {
      type: 'approvalPending',
      requestId,
      kind,
      version: this.room.version,
      message: `Waiting for ${approverClientIds.length} player${approverClientIds.length === 1 ? '' : 's'} to approve ${kind}.`
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
    if (attachment.clientId === pending.requesterClientId || !attachmentHasPlayableRole(attachment)) {
      this.safeSend(ws, { type: 'approvalResolved', allowed: false, message: 'This client cannot approve the request.' });
      return;
    }
    if (Array.isArray(pending.approverClientIds) && !pending.approverClientIds.includes(attachment.clientId)) {
      this.safeSend(ws, { type: 'approvalResolved', allowed: false, message: 'This client was not asked to approve the request.' });
      return;
    }
    const requester = this.findSocketByClientId(pending.requesterClientId);
    if (payload.allow) {
      pending.approvedClientIds = uniqueStrings((pending.approvedClientIds || []).concat(attachment.clientId));
      const remaining = (pending.approverClientIds || []).filter((clientId) => !pending.approvedClientIds.includes(clientId));
      if (remaining.length) {
        await this.saveRoom();
        this.safeSend(ws, { type: 'approvalResolved', allowed: true, message: `${pending.kind} approval recorded; waiting for ${remaining.length} more.` });
        return;
      }
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

  turnIssue(roles, action, nextSnapshot) {
    const owned = normalizeRoles(roles);
    if (this.room.gameMode === 'billiards') {
      return billiardsTurnIssue(owned, action, this.room.snapshot, nextSnapshot);
    }
    if (this.room.gameMode === 'chinese-checkers' && action.type === 'chinese-checkers-start') {
      if (!owned.length) return 'Claim at least one color before beginning.';
      const claimed = claimedRoomRoles(this.room);
      const nextPlayers = rolesForGame('chinese-checkers', nextSnapshot);
      if (!nextPlayers.length) return 'Chinese Checkers start needs at least one claimed color.';
      const unclaimedInSnapshot = nextPlayers.filter((role) => !claimed.includes(role));
      if (unclaimedInSnapshot.length) return 'Partial start can only keep claimed colors active.';
      return '';
    }
    if (this.room.gameMode === 'chinese-checkers' && this.room.readyToPlay === false) {
      return 'Chinese Checkers is waiting for the remaining colors.';
    }
    if (this.room.gameMode === 'chinese-checkers') {
      const actionRole = chineseCheckersActionRole(action, nextSnapshot);
      if (!actionRole) return 'Chinese Checkers move needs a color.';
      if (!owned.includes(actionRole)) return `${actionRole} is controlled by another player.`;
      const available = rolesForGame('chinese-checkers', this.room.snapshot);
      if (!available.includes(actionRole)) return `${actionRole} is not active in this room.`;
      if (isChineseCheckersOpeningRoundSnapshot(this.room.snapshot)) {
        const opened = chineseCheckersOpeningOrder(this.room.snapshot);
        if (opened.includes(actionRole)) return `${actionRole} already moved in the opening round.`;
        return '';
      }
      const expected = normalizeRole(this.room.snapshot && this.room.snapshot.turn);
      if (expected && actionRole !== expected) return `${expected} to move.`;
      return '';
    }
    if (this.room.gameMode === 'hex' && action.type === 'pie-swap') {
      const current = this.room.snapshot && typeof this.room.snapshot === 'object' ? this.room.snapshot : {};
      if (!owned.includes('blue')) return 'blue to move.';
      if (!current.pieRule || !current.pieAvailable || normalizeRole(current.turn) !== 'blue') {
        return 'The Hex pie swap is unavailable.';
      }
      if (!nextSnapshot || nextSnapshot.pieSwapped !== true || nextSnapshot.pieAvailable || normalizeRole(nextSnapshot.turn) !== 'blue') {
        return 'Pie swap must preserve the Blue turn and close the swap window.';
      }
      if (!sameHexTiles(current.tiles, nextSnapshot.tiles)) return 'Pie swap cannot change any Hex tiles.';
      return '';
    }
    if (goReviewActionType(action.type) && this.room.snapshot && this.room.snapshot.scoringReview) return '';
    const expected = normalizeRole(this.room.snapshot && this.room.snapshot.turn);
    if (expected && !owned.includes(expected)) return `${expected} to move.`;
    if (this.room.gameMode === 'hex' && action.type === 'place') {
      const actionRole = normalizeRole(action.role);
      if (actionRole && actionRole !== expected) return `${expected} to move.`;
    }
    return '';
  }

  async releaseSocketRole(ws, options = {}) {
    const attachment = safeAttachment(ws);
    if (!attachment || !attachment.clientId || !this.room || !this.room.roles) return;
    const rolesReleased = attachmentRoles(attachment);
    const playerName = normalizePlayerName(attachment.playerName, attachment.clientId);
    Object.keys(this.room.roles).forEach((role) => {
      if (this.room.roles[role] === attachment.clientId) delete this.room.roles[role];
    });
    this.room.updatedAt = new Date().toISOString();
    updateRoomReadiness(this.room);
    await this.saveRoom();
    if (options.announce) {
      this.broadcast({
        type: 'playerLeft',
        roomCode: this.room.roomCode,
        playerName,
        rolesReleased,
        wasPlayer: rolesReleased.length > 0,
        roles: publicRoles(this.room.roles),
        rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
        readyToPlay: this.room.readyToPlay !== false,
        unclaimedRoles: unclaimedRoomRoles(this.room),
        connected: Math.max(0, this.playerSockets().length - 1)
      });
    }
    this.broadcastPresence();
  }

  async announceSocketDisconnect(ws, reason = 'disconnected') {
    await this.loadRoom();
    const attachment = safeAttachment(ws);
    if (!this.room || !attachment || !attachment.joined || attachment.leaving) return;
    const rolesAssigned = attachmentRoles(attachment);
    const playerName = normalizePlayerName(attachment.playerName, attachment.clientId);
    if (!this.room.disconnected || typeof this.room.disconnected !== 'object' || Array.isArray(this.room.disconnected)) {
      this.room.disconnected = {};
    }
    this.room.disconnected[attachment.clientId] = {
      playerName,
      rolesAssigned,
      reason: sanitizeText(reason, 80),
      disconnectedAt: new Date().toISOString()
    };
    this.room.updatedAt = new Date().toISOString();
    await this.saveRoom();
    this.broadcast({
      type: 'playerDisconnected',
      roomCode: this.room.roomCode,
      playerName,
      rolesAssigned,
      wasPlayer: rolesAssigned.length > 0,
      reason: sanitizeText(reason, 80),
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      readyToPlay: this.room.readyToPlay !== false,
      unclaimedRoles: unclaimedRoomRoles(this.room),
      connected: Math.max(0, this.playerSockets().length - 1)
    });
  }

  async finishSocket(ws, reason) {
    if (!this.sessions.has(ws)) return;
    await this.announceSocketDisconnect(ws, reason);
    this.sessions.delete(ws);
    this.broadcastPresence();
    if (this.playerSockets().length === 0) {
      await this.ensureEmptyRoomExpiry({ reset: true, publish: true });
    }
  }

  async ensureEmptyRoomExpiry(options = {}) {
    if (!this.room || this.playerSockets().length > 0) return '';
    const now = Date.now();
    const inferred = options.inferExisting ? roomEmptySinceTime(this.room, now) : now;
    const emptySince = options.reset ? now : inferred;
    const emptySinceIso = new Date(emptySince).toISOString();
    const changed = this.room.emptySince !== emptySinceIso;
    this.room.emptySince = emptySinceIso;
    if (options.reset) this.room.updatedAt = emptySinceIso;
    if (changed || options.reset) await this.saveRoom();
    const expiresAt = emptySince + ROOM_EMPTY_TTL_MS;
    await this.ctx.storage.setAlarm(Math.max(now, expiresAt));
    if (options.publish) await this.publishRoomIndex();
    return new Date(expiresAt).toISOString();
  }

  async publishRoomIndex(options = {}) {
    if (!this.room || !hasRoomNamespace(this.env)) return false;
    try {
      await registerRoomInIndex(this.env, this.room);
      return true;
    } catch (_) {
      if (options.throwOnError) throw _;
      // Discovery is best-effort while the room itself remains authoritative.
      return false;
    }
  }

  broadcastPlayerReconnect(attachment) {
    if (!this.room || !attachment || !attachment.joined) return;
    const rolesAssigned = attachmentRoles(attachment);
    this.broadcast({
      type: 'playerReconnected',
      roomCode: this.room.roomCode,
      playerName: normalizePlayerName(attachment.playerName, attachment.clientId),
      rolesAssigned,
      wasPlayer: rolesAssigned.length > 0,
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      readyToPlay: this.room.readyToPlay !== false,
      unclaimedRoles: unclaimedRoomRoles(this.room),
      connected: this.playerSockets().length
    });
  }

  expireApprovals() {
    const now = Date.now();
    if (this.room.pendingApproval && this.room.pendingApproval.expiresAt <= now) this.room.pendingApproval = null;
    if (this.room.approvedHistory && this.room.approvedHistory.expiresAt <= now) this.room.approvedHistory = null;
  }

  sendState(ws, extra = {}) {
    const attachment = safeAttachment(ws);
    this.safeSend(ws, {
      type: 'state',
      roomCode: this.room.roomCode,
      gameMode: this.room.gameMode,
      version: this.room.version,
      snapshot: this.room.snapshot,
      summary: this.room.summary,
      role: attachment.role || 'spectator',
      rolesAssigned: attachmentRoles(attachment),
      roles: publicRoles(this.room.roles),
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      ...publicRoundState(this.room),
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
      rolePlayers: publicRolePlayers(this.room.roles, this.room.playerNames),
      ...publicRoundState(this.room),
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

  refreshSessionRoles() {
    this.sessions.forEach((attachment, ws) => {
      if (!attachment.joined) return;
      const roles = rolesForGame(this.room.gameMode, this.room.snapshot)
        .filter((role) => this.room.roles && this.room.roles[role] === attachment.clientId);
      const next = { ...attachment, roles, role: roles[0] || 'spectator' };
      this.sessions.set(ws, next);
      ws.serializeAttachment(next);
    });
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

async function recordAnalyticsRequest(request, env) {
  const origin = analyticsAllowedOrigin(request, env);
  if (!origin) return analyticsJsonResponse({ error: 'Analytics origin is not allowed.' }, 403, '');
  const source = await readJson(request);
  const event = normalizeAnalyticsEvent({
    ...source,
    day: analyticsUtcDay(),
    country: analyticsCountry(request)
  });
  if (!event) return analyticsJsonResponse({ error: 'Invalid analytics event.' }, 400, origin);
  const stub = analyticsDayStub(env, event.day);
  const response = await stub.fetch(new Request('https://analytics/analytics/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  }));
  if (!response.ok) return analyticsJsonResponse({ error: 'Analytics storage is unavailable.' }, 503, origin);
  return new Response(null, {
    status: 204,
    headers: analyticsResponseHeaders(origin)
  });
}

function analyticsPreflightResponse(request, env) {
  const origin = analyticsAllowedOrigin(request, env);
  if (!origin) return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  return new Response(null, {
    status: 204,
    headers: {
      ...analyticsResponseHeaders(origin),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function analyticsAdminPageResponse(request, env) {
  const denied = analyticsAdminAccessResponse(request, env);
  if (denied) return denied;
  return new Response(analyticsAdminHtml(), {
    status: 200,
    headers: analyticsAdminHeaders('text/html; charset=utf-8')
  });
}

async function analyticsAdminReportResponse(request, env, url) {
  const denied = analyticsAdminAccessResponse(request, env);
  if (denied) return denied;
  const days = clampInteger(url.searchParams.get('days'), 1, ANALYTICS_MAX_REPORT_DAYS, 14);
  const dayNames = analyticsUtcDays(days);
  const responses = await Promise.all(dayNames.map(async (day) => {
    const response = await analyticsDayStub(env, day).fetch(new Request('https://analytics/analytics/report'));
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && payload.aggregate ? normalizeAnalyticsAggregate(payload.aggregate, day) : null;
  }));
  return new Response(JSON.stringify(analyticsReport(responses.filter(Boolean), days)), {
    status: 200,
    headers: analyticsAdminHeaders('application/json; charset=utf-8')
  });
}

function analyticsAdminAccessResponse(request, env) {
  const configured = String(env && env.ANALYTICS_ADMIN_TOKEN || '');
  if (!configured) {
    return new Response('Analytics admin token is not configured.', {
      status: 503,
      headers: analyticsAdminHeaders('text/plain; charset=utf-8')
    });
  }
  if (analyticsAdminAuthorized(request, configured)) return null;
  const headers = analyticsAdminHeaders('text/plain; charset=utf-8');
  headers['WWW-Authenticate'] = 'Basic realm="Ramified analytics", charset="UTF-8"';
  return new Response('Authentication required.', { status: 401, headers });
}

export function analyticsAdminAuthorized(request, configuredToken) {
  const authorization = String(request && request.headers && request.headers.get('Authorization') || '');
  let supplied = '';
  if (/^Bearer\s+/i.test(authorization)) {
    supplied = authorization.replace(/^Bearer\s+/i, '').trim();
  } else if (/^Basic\s+/i.test(authorization)) {
    try {
      const decoded = atob(authorization.replace(/^Basic\s+/i, '').trim());
      const separator = decoded.indexOf(':');
      supplied = separator >= 0 ? decoded.slice(separator + 1) : '';
    } catch (_) {
      supplied = '';
    }
  }
  return timingSafeStringEqual(supplied, String(configuredToken || ''));
}

function timingSafeStringEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index % Math.max(1, a.length)) || 0)
      ^ (b.charCodeAt(index % Math.max(1, b.length)) || 0);
  }
  return mismatch === 0 && a.length > 0;
}

function analyticsDayStub(env, day) {
  const name = `${ANALYTICS_OBJECT_PREFIX}${day}`;
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(name));
}

function analyticsAllowedOrigin(request, env) {
  const origin = String(request && request.headers && request.headers.get('Origin') || '').replace(/\/+$/, '');
  if (!origin) return '';
  const configured = String(env && env.ANALYTICS_ALLOWED_ORIGINS || 'https://ramified.github.io');
  const allowed = configured.split(',').map((value) => value.trim().replace(/\/+$/, '')).filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}

function analyticsResponseHeaders(origin) {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}

function analyticsAdminHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, private',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };
}

function analyticsJsonResponse(payload, status, origin) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...analyticsResponseHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function analyticsCountry(request) {
  const country = String(request && request.cf && request.cf.country || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'unknown';
}

function analyticsUtcDay(time = Date.now()) {
  return new Date(time).toISOString().slice(0, 10);
}

function analyticsUtcDays(count, time = Date.now()) {
  const days = [];
  const end = new Date(`${analyticsUtcDay(time)}T00:00:00.000Z`).getTime();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(analyticsUtcDay(end - (offset * 24 * 60 * 60 * 1000)));
  }
  return days;
}

export function normalizeAnalyticsEvent(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const type = source.type === 'visit' ? 'visit' : (source.type === 'heartbeat' ? 'heartbeat' : '');
  const day = String(source.day || '');
  if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const rawMode = String(source.gameMode || '').trim().toLowerCase();
  const gameMode = ANALYTICS_GAME_MODES.has(rawMode) ? rawMode : 'unknown';
  const rawCountry = String(source.country || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'unknown';
  const activeSeconds = type === 'heartbeat'
    ? clampInteger(source.activeSeconds, 1, ANALYTICS_MAX_SECONDS, 0)
    : 0;
  if (type === 'heartbeat' && !activeSeconds) return null;
  return { type, day, gameMode, country, activeSeconds };
}

function normalizeAnalyticsAggregate(source, fallbackDay = '') {
  const value = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(value.day || '')) ? String(value.day) : fallbackDay;
  return {
    day,
    visits: nonnegativeInteger(value.visits),
    activeSeconds: nonnegativeInteger(value.activeSeconds),
    events: nonnegativeInteger(value.events),
    byGame: normalizeAnalyticsMetricMap(value.byGame),
    byCountry: normalizeAnalyticsMetricMap(value.byCountry),
    updatedAt: String(value.updatedAt || '')
  };
}

function normalizeAnalyticsMetricMap(source) {
  const result = {};
  if (!source || typeof source !== 'object' || Array.isArray(source)) return result;
  Object.entries(source).slice(0, 100).forEach(([key, value]) => {
    const cleanKey = String(key || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
    if (!cleanKey) return;
    result[cleanKey] = {
      visits: nonnegativeInteger(value && value.visits),
      activeSeconds: nonnegativeInteger(value && value.activeSeconds)
    };
  });
  return result;
}

function analyticsMetricBucket(map, key) {
  if (!map[key]) map[key] = { visits: 0, activeSeconds: 0 };
  return map[key];
}

function nonnegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function analyticsReport(aggregates, days) {
  const totals = { visits: 0, activeSeconds: 0, events: 0 };
  const byGame = {};
  const byCountry = {};
  const daily = aggregates
    .map((entry) => normalizeAnalyticsAggregate(entry))
    .sort((left, right) => left.day.localeCompare(right.day));
  daily.forEach((entry) => {
    totals.visits += entry.visits;
    totals.activeSeconds += entry.activeSeconds;
    totals.events += entry.events;
    mergeAnalyticsMetricMaps(byGame, entry.byGame);
    mergeAnalyticsMetricMaps(byCountry, entry.byCountry);
  });
  return {
    generatedAt: new Date().toISOString(),
    days,
    totals,
    daily: daily.map((entry) => ({
      day: entry.day,
      visits: entry.visits,
      activeSeconds: entry.activeSeconds,
      events: entry.events,
      updatedAt: entry.updatedAt
    })),
    games: analyticsMetricRows(byGame, 'gameMode'),
    countries: analyticsMetricRows(byCountry, 'country')
  };
}

function mergeAnalyticsMetricMaps(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    const bucket = analyticsMetricBucket(target, key);
    bucket.visits += nonnegativeInteger(value && value.visits);
    bucket.activeSeconds += nonnegativeInteger(value && value.activeSeconds);
  });
}

function analyticsMetricRows(source, keyName) {
  return Object.entries(source || {})
    .map(([key, value]) => ({ [keyName]: key, visits: value.visits, activeSeconds: value.activeSeconds }))
    .sort((left, right) => right.activeSeconds - left.activeSeconds || right.visits - left.visits || String(left[keyName]).localeCompare(String(right[keyName])));
}

function analyticsAdminHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ramified Minigames analytics</title>
  <style>
    :root{color-scheme:light dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#0d1720;color:#edf6f7}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#173345,#0d1720 56%);min-height:100vh}.wrap{width:min(1120px,calc(100% - 32px));margin:0 auto;padding:36px 0 60px}header,.toolbar,.card,.panel{border:1px solid #315365;background:rgba(12,29,39,.88);box-shadow:0 18px 50px rgba(0,0,0,.22)}header{padding:24px;border-radius:18px;margin-bottom:18px}h1,h2,p{margin-top:0}h1{margin-bottom:8px;font-size:clamp(1.55rem,4vw,2.5rem)}.muted{color:#a9c3cc}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:14px;margin-bottom:18px}button,select{font:inherit;color:inherit;background:#173d4c;border:1px solid #4d7d8d;border-radius:9px;padding:8px 11px;cursor:pointer}button:hover{background:#205267}.spacer{flex:1}.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:18px}.card{padding:18px;border-radius:14px}.label{color:#a9c3cc;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em}.value{font-size:1.75rem;font-weight:750;margin-top:6px}.grid{display:grid;grid-template-columns:1.1fr 1fr;gap:18px}.panel{border-radius:16px;padding:18px;overflow:auto}.panel.daily{grid-column:1/-1}table{width:100%;border-collapse:collapse;min-width:430px}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #294656}th{color:#9ec6d1;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}td.num,th.num{text-align:right}.error{color:#ff9d96}.privacy{margin:14px 0 0;font-size:.88rem;color:#9eb7bf}@media(max-width:760px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.grid{grid-template-columns:1fr}.panel.daily{grid-column:auto}}@media(max-width:430px){.cards{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="wrap">
    <header>
      <h1 id="title">Ramified Minigames analytics</h1>
      <p class="muted" id="subtitle">Anonymous aggregate traffic and active playtime.</p>
      <p class="privacy" id="privacy">No IP addresses, names, room codes, persistent visitor IDs, or game states are stored.</p>
    </header>
    <div class="toolbar">
      <label><span id="range-label">Range</span> <select id="days"><option value="7">7 days</option><option value="14" selected>14 days</option><option value="31">31 days</option></select></label>
      <button id="refresh" type="button">Refresh</button>
      <span class="spacer"></span>
      <button id="language" type="button">中文</button>
      <span class="muted" id="status" role="status">Loading…</span>
    </div>
    <section class="cards" aria-label="Summary">
      <article class="card"><div class="label" id="visits-label">Visits</div><div class="value" id="visits">0</div></article>
      <article class="card"><div class="label" id="playtime-label">Active playtime</div><div class="value" id="playtime">0m</div></article>
      <article class="card"><div class="label" id="average-label">Average per visit</div><div class="value" id="average">0m</div></article>
      <article class="card"><div class="label" id="events-label">Recorded events</div><div class="value" id="events">0</div></article>
    </section>
    <section class="grid">
      <article class="panel daily"><h2 id="daily-title">Daily traffic</h2><table><thead><tr><th id="day-head">UTC day</th><th class="num" id="daily-visits-head">Visits</th><th class="num" id="daily-time-head">Active playtime</th></tr></thead><tbody id="daily-body"></tbody></table></article>
      <article class="panel"><h2 id="games-title">Games</h2><table><thead><tr><th id="game-head">Game</th><th class="num" id="game-visits-head">Visits</th><th class="num" id="game-time-head">Active playtime</th></tr></thead><tbody id="games-body"></tbody></table></article>
      <article class="panel"><h2 id="countries-title">Countries</h2><table><thead><tr><th id="country-head">Country</th><th class="num" id="country-visits-head">Visits</th><th class="num" id="country-time-head">Active playtime</th></tr></thead><tbody id="countries-body"></tbody></table></article>
    </section>
  </main>
  <script>
  (function(){
    'use strict';
    var copy={
      en:{title:'Ramified Minigames analytics',subtitle:'Anonymous aggregate traffic and active playtime.',privacy:'No IP addresses, names, room codes, persistent visitor IDs, or game states are stored.',range:'Range',refresh:'Refresh',loading:'Loading…',updated:'Updated',error:'Could not load analytics.',visits:'Visits',playtime:'Active playtime',average:'Average per visit',events:'Recorded events',daily:'Daily traffic',games:'Games',countries:'Countries',day:'UTC day',game:'Game',country:'Country',empty:'No data'},
      zh:{title:'歧趣游境数据统计',subtitle:'匿名汇总的访问流量与活跃游玩时长。',privacy:'不存储 IP 地址、姓名、房间码、持久访客标识或游戏状态。',range:'范围',refresh:'刷新',loading:'加载中…',updated:'已更新',error:'无法加载统计数据。',visits:'访问次数',playtime:'活跃游玩时长',average:'平均每次访问',events:'已记录事件',daily:'每日流量',games:'游戏',countries:'国家/地区',day:'UTC 日期',game:'游戏',country:'国家/地区',empty:'暂无数据'}
    };
    var gameNames={'2048':'2048',billiards:'Billiards','chinese-checkers':'Chinese Checkers','connect-four':'Connect Four','fide-chess':'FIDE Chess',go:'Go',gomoku:'Gomoku',hex:'Hex',lianliankan:'Lianliankan',reversi:'Reversi',sokoban:'Sokoban',unknown:'Unknown'};
    var language=(navigator.language||'').toLowerCase().indexOf('zh')===0?'zh':'en';
    var lastData=null;
    function text(id,value){document.getElementById(id).textContent=value;}
    function applyLanguage(){var c=copy[language];document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=c.title;text('title',c.title);text('subtitle',c.subtitle);text('privacy',c.privacy);text('range-label',c.range);text('refresh',c.refresh);text('language',language==='zh'?'English':'中文');text('visits-label',c.visits);text('playtime-label',c.playtime);text('average-label',c.average);text('events-label',c.events);text('daily-title',c.daily);text('games-title',c.games);text('countries-title',c.countries);text('day-head',c.day);text('daily-visits-head',c.visits);text('daily-time-head',c.playtime);text('game-head',c.game);text('game-visits-head',c.visits);text('game-time-head',c.playtime);text('country-head',c.country);text('country-visits-head',c.visits);text('country-time-head',c.playtime);if(lastData)render(lastData);}
    function duration(seconds){seconds=Math.max(0,Number(seconds)||0);if(seconds<60)return Math.round(seconds)+'s';if(seconds<3600)return Math.round(seconds/60)+'m';return (seconds/3600).toFixed(seconds<36000?1:0)+'h';}
    function row(cells){var tr=document.createElement('tr');cells.forEach(function(cell,index){var td=document.createElement('td');td.textContent=cell;if(index>0)td.className='num';tr.appendChild(td);});return tr;}
    function fill(id,rows,mapper){var body=document.getElementById(id);body.textContent='';if(!rows.length){var empty=row([copy[language].empty,'','']);body.appendChild(empty);return;}rows.forEach(function(item){body.appendChild(row(mapper(item)));});}
    function render(data){lastData=data;var totals=data.totals||{};text('visits',String(totals.visits||0));text('playtime',duration(totals.activeSeconds));text('average',duration((totals.activeSeconds||0)/Math.max(1,totals.visits||0)));text('events',String(totals.events||0));fill('daily-body',data.daily||[],function(item){return[item.day,String(item.visits||0),duration(item.activeSeconds)];});fill('games-body',data.games||[],function(item){return[gameNames[item.gameMode]||item.gameMode,String(item.visits||0),duration(item.activeSeconds)];});fill('countries-body',data.countries||[],function(item){return[item.country==='unknown'?'—':item.country,String(item.visits||0),duration(item.activeSeconds)];});}
    async function load(){var status=document.getElementById('status');status.className='muted';status.textContent=copy[language].loading;try{var response=await fetch('/api/admin/analytics?days='+encodeURIComponent(document.getElementById('days').value),{cache:'no-store'});if(!response.ok)throw new Error(String(response.status));var data=await response.json();render(data);status.textContent=copy[language].updated+' '+new Date(data.generatedAt).toLocaleString();}catch(_){status.className='error';status.textContent=copy[language].error;}}
    document.getElementById('refresh').addEventListener('click',load);document.getElementById('days').addEventListener('change',load);document.getElementById('language').addEventListener('click',function(){language=language==='en'?'zh':'en';applyLanguage();});applyLanguage();load();setInterval(load,30000);
  })();
  </script>
</body>
</html>`;
}

async function createRoom(request, env) {
  const body = await readJson(request);
  const gameMode = normalizeGameMode(body.gameMode);
  if (!SUPPORTED_GAME_MODES.has(gameMode)) return jsonResponse({ error: 'Unsupported game mode.' }, 400);
  validateSnapshot(body.snapshot, gameMode, { initial: true });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = randomRoomCode();
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
    const initRequest = new Request('https://room/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, roomCode, gameMode })
    });
    const response = await stub.fetch(initRequest);
    if (response.status !== 409) {
      if (response.ok) {
        try {
          const room = await response.clone().json();
          await registerRoomInIndex(env, { ...room, emptySince: room.createdAt });
        } catch (_) {
          // Room creation already succeeded; discovery can recover on the next room creation.
        }
      }
      return addCors(response);
    }
  }
  return jsonResponse({ error: 'Could not allocate a room code; try again.' }, 503);
}

async function listRooms(env) {
  const stub = roomIndexStub(env);
  const response = await stub.fetch(new Request('https://room-index/room-index/list'));
  return addCors(response);
}

async function registerRoomInIndex(env, room) {
  if (!hasRoomNamespace(env)) throw new Error('Room namespace is unavailable.');
  const emptySince = normalizeOptionalTimestamp(room && room.emptySince);
  const entry = normalizeRoomIndexEntry({
    ...room,
    verifiedAt: new Date().toISOString(),
    expiresAt: emptySince ? new Date(Date.parse(emptySince) + ROOM_EMPTY_TTL_MS).toISOString() : ''
  });
  if (!entry) return;
  const stub = roomIndexStub(env);
  await stub.fetch(new Request('https://room-index/room-index/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  }));
}

async function unregisterRoomFromIndex(env, roomCode) {
  if (!hasRoomNamespace(env)) throw new Error('Room namespace is unavailable.');
  const stub = roomIndexStub(env);
  const response = await stub.fetch(new Request('https://room-index/room-index/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode })
  }));
  if (!response.ok) throw new Error(`Room index removal failed with HTTP ${response.status}.`);
}

async function reconcileIndexedRoom(env, roomCode) {
  if (!hasRoomNamespace(env)) throw new Error('Room namespace is unavailable.');
  const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomCode));
  const response = await stub.fetch(new Request('https://room/lifecycle/reconcile', { method: 'POST' }));
  if (response.status === 404) return { exists: false };
  if (!response.ok) throw new Error(`Room reconciliation failed with HTTP ${response.status}.`);
  return response.json();
}

function hasRoomNamespace(env) {
  return !!(env && env.GAME_ROOM && typeof env.GAME_ROOM.idFromName === 'function' && typeof env.GAME_ROOM.get === 'function');
}

function roomIndexStub(env) {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(ROOM_INDEX_OBJECT_NAME));
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

export function validateSnapshot(snapshot, gameMode, options = {}) {
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
  if (gameMode === 'billiards' && String(snapshot.rules || '').trim().toLowerCase() !== 'competitive') {
    throw new Error('Online Billiards requires Competitive rules.');
  }
  if (gameMode === 'billiards' && options.initial) validateInitialBilliardsSnapshot(snapshot);
  if (gameMode === 'hex') validateHexSnapshot(snapshot, options);
  if (gameMode === 'fide-chess') {
    const variant = String(snapshot.fideChessVariant || snapshot.chessVariant || snapshot.variant || '').toLowerCase();
    if (variant.includes('puzzle')) throw new Error('FIDE chess puzzle mode is not supported online.');
  }
}

function validateHexSnapshot(snapshot, options = {}) {
  const phase = String(snapshot.phase || '').trim().toLowerCase();
  if (!['setup', 'ready', 'gameover'].includes(phase)) throw new Error('Hex snapshot has an invalid phase.');
  const turn = normalizeRole(snapshot.turn);
  if (!['red', 'blue'].includes(turn)) throw new Error('Hex snapshot needs a red or blue turn.');
  const tiles = Array.isArray(snapshot.tiles) ? snapshot.tiles : null;
  if (!tiles) throw new Error('Hex snapshot needs a tile array.');
  if (tiles.length > 4096) throw new Error('Hex snapshot has too many tiles.');
  const ids = new Set();
  const indices = new Set();
  tiles.forEach((tile) => {
    if (!tile || typeof tile !== 'object' || Array.isArray(tile)) throw new Error('Hex snapshot has an invalid tile.');
    const id = Number(tile.id);
    const index = Number(tile.index);
    const color = normalizeRole(tile.color);
    if (!Number.isInteger(id) || id < 1 || ids.has(id)) throw new Error('Hex tile ids must be unique positive integers.');
    if (!Number.isInteger(index) || index < 0 || indices.has(index)) throw new Error('Hex tile indices must be unique nonnegative integers.');
    if (!['red', 'blue'].includes(color)) throw new Error('Hex tiles must be red or blue.');
    ids.add(id);
    indices.add(index);
  });
  if (snapshot.pieRule != null && typeof snapshot.pieRule !== 'boolean') throw new Error('Hex pieRule must be boolean.');
  if (snapshot.pieAvailable != null && typeof snapshot.pieAvailable !== 'boolean') throw new Error('Hex pieAvailable must be boolean.');
  if (snapshot.pieSwapped != null && typeof snapshot.pieSwapped !== 'boolean') throw new Error('Hex pieSwapped must be boolean.');
  if (snapshot.pieAvailable && (!snapshot.pieRule || snapshot.pieSwapped || tiles.length !== 1 || turn !== 'blue')) {
    throw new Error('Hex pieAvailable is only valid immediately after Red’s first tile.');
  }
  if (options.initial && phase !== 'ready') throw new Error('Finish the Hex setup before creating an online room.');
}

function sameHexTiles(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const signature = (tiles) => tiles.map((tile) => `${tile && tile.id}:${tile && tile.index}:${normalizeRole(tile && tile.color)}`).sort().join('|');
  return signature(left) === signature(right);
}

function validateInitialBilliardsSnapshot(snapshot) {
  if (snapshot.phase !== 'ready' || snapshot.ballInHand) {
    throw new Error('Finish the Billiards setup before creating an online room.');
  }
  const balls = Array.isArray(snapshot.balls) ? snapshot.balls : [];
  const active = balls.filter((ball) => ball && ball.active !== false);
  const cues = active.filter((ball) => String(ball.kind || '').trim().toLowerCase() === 'cue');
  if (cues.length !== 1) throw new Error('Online Billiards requires exactly one active cue ball.');
  const ids = new Set();
  active.forEach((ball) => {
    const id = String(ball.id || '').trim();
    const at = ball.at && typeof ball.at === 'object' && !Array.isArray(ball.at) ? ball.at : {};
    if (!id || ids.has(id)) throw new Error('Online Billiards ball ids must be unique.');
    ids.add(id);
    if (!Number.isInteger(Number(at.row)) || Number(at.row) < 1
      || !Number.isInteger(Number(at.col)) || Number(at.col) < 1
      || !Number.isFinite(Number(at.x)) || !Number.isFinite(Number(at.y))) {
      throw new Error('Online Billiards balls need canonical row, col, x, and y coordinates.');
    }
  });
}

export function normalizeAction(action) {
  const source = action && typeof action === 'object' && !Array.isArray(action) ? action : {};
  const result = {};
  Object.keys(source).slice(0, 24).forEach((key) => {
    const value = source[key];
    if (value == null) return;
    if (typeof value === 'string') result[key] = sanitizeText(value, 180);
    else if (typeof value === 'number' && Number.isFinite(value)) result[key] = value;
    else if (typeof value === 'boolean') result[key] = value;
  });
  if (source.aim && typeof source.aim === 'object' && !Array.isArray(source.aim)) {
    result.aim = finiteCoordinatePair(source.aim);
  }
  if (source.contact && typeof source.contact === 'object' && !Array.isArray(source.contact)) {
    result.contact = finiteCoordinatePair(source.contact);
  }
  if (source.at && typeof source.at === 'object' && !Array.isArray(source.at)) {
    result.at = {
      row: finiteNumberOrNull(source.at.row),
      col: finiteNumberOrNull(source.at.col),
      ...finiteCoordinatePair(source.at)
    };
  }
  result.type = sanitizeText(result.type || 'move', 48).toLowerCase();
  result.clientId = sanitizeText(result.clientId || '', 90);
  result.approvedRequestId = sanitizeText(result.approvedRequestId || '', 90);
  return result;
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function finiteCoordinatePair(value) {
  return {
    x: finiteNumberOrNull(value && value.x),
    y: finiteNumberOrNull(value && value.y)
  };
}

function assignRequestedRoles(roles, gameMode, requestedRoles, clientId, snapshot) {
  const available = rolesForGame(gameMode, snapshot);
  if (!available.length) return ['spectator'];
  const rawRequested = normalizeRoles(requestedRoles);
  if (rawRequested.includes('spectator')) {
    available.forEach((role) => {
      if (roles[role] === clientId) delete roles[role];
    });
    return ['spectator'];
  }
  const requested = rawRequested.filter((role) => role !== 'auto');
  const existing = available.filter((role) => roles[role] === clientId);
  if (gameMode !== 'chinese-checkers') {
    if (existing.length) return [existing[0]];
    const requestedOpen = requested.find((role) => available.includes(role) && !roles[role]);
    const chosen = requestedOpen || randomOpenRole(roles, available);
    if (chosen) {
      roles[chosen] = clientId;
      return [chosen];
    }
    return ['spectator'];
  }
  requested.forEach((role) => {
    if (available.includes(role) && (!roles[role] || roles[role] === clientId)) roles[role] = clientId;
  });
  let assigned = available.filter((role) => roles[role] === clientId);
  return assigned.length ? assigned : ['spectator'];
}

function claimRequestedChineseCheckersRoles(roles, requestedRoles, clientId, snapshot) {
  const available = rolesForGame('chinese-checkers', snapshot);
  if (!available.length) return ['spectator'];
  const requested = normalizeRoles(requestedRoles).filter((role) => role !== 'auto');
  available.forEach((role) => {
    if (roles[role] === clientId) delete roles[role];
  });
  if (requested.includes('spectator')) return ['spectator'];
  requested.forEach((role) => {
    if (available.includes(role) && !roles[role]) roles[role] = clientId;
  });
  const assigned = available.filter((role) => roles[role] === clientId);
  return assigned.length ? assigned : ['spectator'];
}

function rolesForGame(gameMode, snapshot) {
  const mode = normalizeGameMode(gameMode);
  if (mode === 'chinese-checkers') {
    const fromSnapshot = normalizeRoles(snapshot && (snapshot.playerColors || snapshot.chineseCheckersPlayers));
    return fromSnapshot.length ? fromSnapshot : (PLAYER_ROLES_BY_MODE[mode] || []).slice();
  }
  return PLAYER_ROLES_BY_MODE[mode] ? PLAYER_ROLES_BY_MODE[mode].slice() : [];
}

function randomOpenRole(roles, available) {
  const open = (available || []).filter((role) => !roles[role]);
  if (!open.length) return '';
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return open[bytes[0] % open.length] || '';
}

function unclaimedRoomRoles(room) {
  if (!room) return [];
  return rolesForGame(room.gameMode, room.snapshot).filter((role) => !room.roles || !room.roles[role]);
}

function claimedRoomRoles(room) {
  if (!room) return [];
  return rolesForGame(room.gameMode, room.snapshot).filter((role) => room.roles && room.roles[role]);
}

function chineseCheckersOpeningOrder(snapshot) {
  const players = rolesForGame('chinese-checkers', snapshot);
  return normalizeRoles(snapshot && snapshot.openingOrder).filter((role) => players.includes(role));
}

function chineseCheckersPendingOpeningRoles(snapshot) {
  const players = rolesForGame('chinese-checkers', snapshot);
  const opened = chineseCheckersOpeningOrder(snapshot);
  return players.filter((role) => !opened.includes(role));
}

function isChineseCheckersOpeningRoundSnapshot(snapshot) {
  if (!snapshot || snapshot.phase === 'setup' || snapshot.phase === 'gameover') return false;
  return chineseCheckersPendingOpeningRoles(snapshot).length > 0;
}

function chineseCheckersActionRole(action, nextSnapshot) {
  const direct = normalizeRole(action && action.role);
  if (direct) return direct;
  const lastMove = nextSnapshot && nextSnapshot.lastMove && typeof nextSnapshot.lastMove === 'object'
    ? nextSnapshot.lastMove
    : null;
  return normalizeRole(lastMove && lastMove.color);
}

function updateRoomReadiness(room) {
  if (!room) return;
  if (!room.roundState) room.roundState = room.readyToPlay === false ? 'waiting' : 'playing';
  if (!Array.isArray(room.readyClientIds)) room.readyClientIds = [];
  if (!Object.prototype.hasOwnProperty.call(room, 'rematch')) room.rematch = null;
  if (!room.roundStartSnapshot) room.roundStartSnapshot = room.snapshot;
  room.readyToPlay = room.roundState === 'playing';
}

function roomRoundState(room) {
  updateRoomReadiness(room);
  return room && room.roundState ? room.roundState : 'waiting';
}

function normalizeClientIds(value) {
  const ids = Array.isArray(value) ? value : [];
  return uniqueStrings(ids.map((item) => normalizeClientId(item)).filter(Boolean));
}

function publicRoundState(room) {
  updateRoomReadiness(room);
  const rematch = room.rematch && typeof room.rematch === 'object'
    ? {
      proposerName: sanitizeText(room.rematch.proposerName || '', 32),
      acceptedClientIds: normalizeClientIds(room.rematch.acceptedClientIds)
    }
    : null;
  return {
    roundState: room.roundState,
    readyToPlay: room.readyToPlay === true,
    readyClientIds: normalizeClientIds(room.readyClientIds),
    rematch,
    unclaimedRoles: unclaimedRoomRoles(room)
  };
}

function rotateTwoPlayerRoomRoles(room, playerIds) {
  const activeIds = uniqueStrings(playerIds);
  const roles = rolesForGame(room.gameMode, room.snapshot)
    .filter((role) => activeIds.includes(room.roles && room.roles[role]));
  if (roles.length !== 2) return;
  const first = room.roles[roles[0]];
  const second = room.roles[roles[1]];
  if (!first || !second || first === second) return;
  room.roles[roles[0]] = second;
  room.roles[roles[1]] = first;
}

function normalizeRoles(value) {
  const result = [];
  const add = (roleValue) => {
    const role = normalizeRole(roleValue);
    if (role && !result.includes(role)) result.push(role);
  };
  if (Array.isArray(value)) value.forEach(add);
  else if (typeof value === 'string') value.split(/[,\s]+/).forEach(add);
  else if (value != null) add(value);
  return result;
}

function attachmentRoles(attachment) {
  const roles = normalizeRoles(attachment && (attachment.roles || attachment.rolesAssigned));
  if (roles.length) return roles.filter((role) => role !== 'spectator');
  const role = normalizeRole(attachment && attachment.role);
  return role && role !== 'spectator' ? [role] : [];
}

function attachmentHasPlayableRole(attachment) {
  return attachmentRoles(attachment).length > 0;
}

function uniqueStrings(values) {
  const result = [];
  (values || []).forEach((value) => {
    const text = String(value || '').trim();
    if (text && !result.includes(text)) result.push(text);
  });
  return result;
}

function publicRoomPayload(room, extra = {}) {
  return {
    roomCode: room.roomCode,
    gameMode: room.gameMode,
    version: room.version,
    summary: room.summary || '',
    roles: publicRoles(room.roles),
    rolePlayers: publicRolePlayers(room.roles, room.playerNames),
    ...publicRoundState(room),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    ...extra
  };
}

function normalizeRoomIndexEntry(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const roomCode = normalizeRoomCode(source.roomCode || source.code);
  const gameMode = normalizeGameMode(source.gameMode || source.mode);
  if (!roomCode || !SUPPORTED_GAME_MODES.has(gameMode)) return null;
  const updatedAt = normalizeTimestamp(source.updatedAt || source.createdAt);
  return {
    roomCode,
    gameMode,
    summary: sanitizeText(source.summary, 220),
    updatedAt,
    verifiedAt: normalizeOptionalTimestamp(source.verifiedAt),
    expiresAt: normalizeOptionalTimestamp(source.expiresAt)
  };
}

function roomIndexList(rooms) {
  const list = [];
  Object.keys(rooms || {}).forEach((key) => {
    const entry = normalizeRoomIndexEntry(rooms[key] || { roomCode: key });
    if (entry) list.push(entry);
  });
  list.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.roomCode.localeCompare(b.roomCode));
  return list;
}

function publicRoomIndexEntry(entry) {
  return {
    roomCode: entry.roomCode,
    gameMode: entry.gameMode,
    summary: entry.summary || '',
    updatedAt: entry.updatedAt
  };
}

function roomIndexEntryNeedsReconciliation(entry, now = Date.now()) {
  const expiresAt = Date.parse(entry && entry.expiresAt || '');
  if (Number.isFinite(expiresAt)) return expiresAt <= now;
  const verifiedAt = Date.parse(entry && (entry.verifiedAt || entry.updatedAt) || '');
  return !Number.isFinite(verifiedAt) || verifiedAt + ROOM_EMPTY_TTL_MS <= now;
}

function sameRoomIndexLease(left, right) {
  if (!left || !right) return false;
  return left.roomCode === right.roomCode
    && left.gameMode === right.gameMode
    && left.updatedAt === right.updatedAt
    && left.verifiedAt === right.verifiedAt
    && left.expiresAt === right.expiresAt;
}

function pruneRoomIndex(rooms) {
  return roomIndexList(rooms).slice(0, ROOM_INDEX_MAX_ROOMS).reduce((result, entry) => {
    result[entry.roomCode] = entry;
    return result;
  }, {});
}

function normalizeTimestamp(value) {
  const text = String(value || '').trim();
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function normalizeOptionalTimestamp(value) {
  const text = String(value || '').trim();
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function roomEmptySinceTime(room, fallback = Date.now()) {
  const candidates = [room && room.emptySince, room && room.updatedAt, room && room.createdAt];
  for (const candidate of candidates) {
    const time = Date.parse(String(candidate || ''));
    if (Number.isFinite(time)) return Math.min(time, fallback);
  }
  return fallback;
}

function publicRoles(roles) {
  const result = {};
  Object.keys(roles || {}).forEach((role) => {
    result[role] = !!roles[role];
  });
  return result;
}

function publicRolePlayers(roles, playerNames) {
  const result = {};
  Object.keys(roles || {}).forEach((role) => {
    const clientId = roles[role];
    if (!clientId) return;
    result[role] = normalizePlayerName(playerNames && playerNames[clientId], clientId);
  });
  return result;
}

function randomRoomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

function normalizeRoomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function billiardsTurnIssue(owned, action, currentSnapshot, nextSnapshot) {
  const current = currentSnapshot && typeof currentSnapshot === 'object' ? currentSnapshot : {};
  const next = nextSnapshot && typeof nextSnapshot === 'object' ? nextSnapshot : {};
  const expected = normalizeRole(current.ballInHandPlayer || current.turn);
  if (!expected || !['player-1', 'player-2'].includes(expected)) return 'Billiards snapshot has no valid active player.';
  if (!owned.includes(expected)) return `${expected} to play.`;
  const type = String(action && action.type || '').trim().toLowerCase();
  if (type === 'billiards-place-cue') {
    if (!current.ballInHand || current.phase !== 'ball-in-hand') return 'Cue placement requires ball in hand.';
    const player = normalizeRole(action.player || expected);
    if (player !== expected) return `${expected} must place the cue ball.`;
    const at = action.at && typeof action.at === 'object' ? action.at : action;
    if (!Number.isInteger(at.row) || !Number.isInteger(at.col) || !Number.isFinite(at.x) || !Number.isFinite(at.y)) {
      return 'Cue placement needs canonical row, col, x, and y coordinates.';
    }
    if (next.ballInHand || next.phase !== 'ready') return 'Accepted cue placement must end ball in hand and return the table to ready.';
    if (normalizeRole(next.turn) !== expected) return 'Cue placement cannot change the active player.';
    return '';
  }
  if (type !== 'billiards-shot') return 'Unsupported Billiards action.';
  if (current.ballInHand || current.phase !== 'ready') return 'Place the cue ball before shooting.';
  const shooter = normalizeRole(action.shooter);
  if (shooter !== expected) return `${expected} must shoot.`;
  const aim = action.aim && typeof action.aim === 'object' ? action.aim : {};
  const aimX = aim.x;
  const aimY = aim.y;
  const aimLength = Math.hypot(aimX, aimY);
  if (!Number.isFinite(aimX) || !Number.isFinite(aimY) || Math.abs(aimLength - 1) > 1e-5) return 'Billiards aim must be normalized.';
  const power = Number(action.power);
  if (!Number.isFinite(power) || power <= 0 || power > 1) return 'Billiards power must be greater than zero and at most one.';
  const contact = action.contact && typeof action.contact === 'object' ? action.contact : {};
  if (!Number.isFinite(contact.x) || !Number.isFinite(contact.y) || Math.hypot(contact.x, contact.y) > 0.861) {
    return 'Billiards cue contact must lie on the cue-ball contact control.';
  }
  const lastShot = next.lastShot && typeof next.lastShot === 'object' ? next.lastShot : {};
  if (normalizeRole(lastShot.shooter) !== shooter) return 'Resulting Billiards snapshot has the wrong shooter.';
  const lastAim = lastShot.aim && typeof lastShot.aim === 'object' ? lastShot.aim : {};
  const lastContact = lastShot.contact && typeof lastShot.contact === 'object' ? lastShot.contact : {};
  if (!sameBilliardsNumber(lastAim.x, aimX) || !sameBilliardsNumber(lastAim.y, aimY)
    || !sameBilliardsNumber(lastShot.power, power)
    || !sameBilliardsNumber(lastContact.x, contact.x) || !sameBilliardsNumber(lastContact.y, contact.y)) {
    return 'Resulting Billiards snapshot does not match the submitted shot parameters.';
  }
  if (Math.max(0, Math.floor(Number(next.shots) || 0)) !== Math.max(0, Math.floor(Number(current.shots) || 0)) + 1) {
    return 'A Billiards shot must increment the shot count exactly once.';
  }
  const scratch = !!lastShot.scratch;
  const pocketed = Array.isArray(lastShot.pocketedTargets) ? lastShot.pocketedTargets.length : 0;
  const opponent = shooter === 'player-1' ? 'player-2' : 'player-1';
  const resultingTurn = scratch || pocketed === 0 ? opponent : shooter;
  if (normalizeRole(next.turn) !== resultingTurn) return 'Resulting Billiards turn does not match pocket/scratch rules.';
  if (action.resultingTurn && normalizeRole(action.resultingTurn) !== resultingTurn) return 'Billiards action resulting turn is inconsistent.';
  if (scratch && (!next.ballInHand || normalizeRole(next.ballInHandPlayer) !== opponent || next.phase !== 'ball-in-hand')) {
    return 'A Billiards scratch must pass the turn and grant ball in hand.';
  }
  if (!scratch && (next.ballInHand || next.phase === 'ball-in-hand')) return 'Ball in hand is only granted after a scratch.';
  return '';
}

function sameBilliardsNumber(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-7;
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

function normalizePlayerName(value, clientId = '') {
  const name = sanitizeText(value, 32).replace(/\s+/g, ' ').trim();
  if (name) return name;
  const suffix = String(clientId || '').replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return suffix ? `Player ${suffix}` : 'Player';
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
