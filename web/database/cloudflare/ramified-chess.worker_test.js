const assert = require('assert');

const FIVE_MINUTES = 5 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;

class FakeStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
    this.alarm = null;
    this.setAlarmCalls = [];
    this.deleteAlarmCalls = 0;
    this.deleteAllCalls = 0;
  }

  async get(key) {
    return this.values.get(key);
  }

  async put(key, value) {
    this.values.set(key, structuredClone(value));
  }

  async setAlarm(time) {
    this.alarm = Number(time);
    this.setAlarmCalls.push(this.alarm);
  }

  async deleteAlarm() {
    this.alarm = null;
    this.deleteAlarmCalls += 1;
  }

  async deleteAll() {
    this.values.clear();
    this.alarm = null;
    this.deleteAllCalls += 1;
  }
}

function makeSocket(clientId, options = {}) {
  let attachment = {
    clientId,
    playerName: options.playerName || clientId,
    role: options.role || 'spectator',
    roles: options.roles || (options.role ? [options.role] : []),
    joined: options.joined !== false,
    leaving: !!options.leaving
  };
  return {
    sent: [],
    deserializeAttachment() { return attachment; },
    serializeAttachment(next) { attachment = next; },
    send(message) { this.sent.push(JSON.parse(message)); },
    close() {}
  };
}

function makeContext(storage, sockets = []) {
  return {
    storage,
    getWebSockets() { return sockets; }
  };
}

function makeRoom(overrides = {}) {
  const now = new Date(Date.now()).toISOString();
  return {
    roomCode: '123456',
    gameMode: 'gomoku',
    version: 0,
    snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'black' },
    roundStartSnapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'black' },
    summary: 'test room',
    roles: {},
    playerNames: {},
    readyToPlay: false,
    roundState: 'waiting',
    readyClientIds: [],
    rematch: null,
    disconnected: {},
    emptySince: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeNamespace(stubs) {
  return {
    idFromName(name) { return name; },
    get(id) {
      const stub = stubs[id];
      if (!stub) throw new Error(`Missing Durable Object stub for ${id}`);
      return stub;
    }
  };
}

async function withFakeNow(now, callback) {
  const original = Date.now;
  Date.now = () => now;
  try {
    return await callback();
  } finally {
    Date.now = original;
  }
}

async function testCreationAndJoinAlarm(worker) {
  const now = Date.parse('2026-09-03T10:00:00.000Z');
  await withFakeNow(now, async () => {
    const storage = new FakeStorage();
    const room = new worker.GameRoom(makeContext(storage), {});
    const response = await room.handleInit(new Request('https://room/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: '123456',
        gameMode: 'gomoku',
        snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'black' },
        clientId: 'creator-1234',
        playerName: 'Creator',
        role: 'black'
      })
    }));
    assert.strictEqual(response.status, 200);
    assert.strictEqual(storage.alarm, now + FIVE_MINUTES, 'creation starts the empty-room grace period');

    const socket = makeSocket('creator-1234', { joined: false });
    room.sessions.set(socket, socket.deserializeAttachment());
    await room.handleHello(socket, { clientId: 'creator-1234', playerName: 'Creator', role: 'black' });
    assert.strictEqual(storage.alarm, null, 'the first completed join cancels expiration');
    assert.strictEqual(room.room.emptySince, null);
  });
}

async function testFinalSocketStartsGracePeriod(worker) {
  const now = Date.parse('2026-09-03T11:00:00.000Z');
  await withFakeNow(now, async () => {
    const storage = new FakeStorage({ room: makeRoom() });
    const first = makeSocket('player-a-1234', { role: 'black' });
    const second = makeSocket('player-b-5678', { role: 'white' });
    const room = new worker.GameRoom(makeContext(storage, [first, second]), {});
    room.room = makeRoom({ roles: { black: 'player-a-1234', white: 'player-b-5678' } });

    await room.webSocketClose(first);
    assert.strictEqual(storage.alarm, null, 'one remaining joined socket keeps the room alive');
    await room.webSocketClose(second);
    assert.strictEqual(storage.alarm, now + FIVE_MINUTES);
    assert.strictEqual(room.room.emptySince, new Date(now).toISOString());
    assert.deepStrictEqual(room.room.roles, { black: 'player-a-1234', white: 'player-b-5678' }, 'disconnect grace preserves roles');

    const errorStorage = new FakeStorage();
    const errorSocket = makeSocket('player-c-9012', { role: 'black' });
    const errorRoom = new worker.GameRoom(makeContext(errorStorage, [errorSocket]), {});
    errorRoom.room = makeRoom();
    await errorRoom.webSocketError(errorSocket);
    assert.strictEqual(errorStorage.alarm, now + FIVE_MINUTES, 'socket errors start the same grace period');

    const leaveStorage = new FakeStorage();
    const leavingSocket = makeSocket('player-d-3456', { role: 'black', leaving: true });
    const leaveRoom = new worker.GameRoom(makeContext(leaveStorage, [leavingSocket]), {});
    leaveRoom.room = makeRoom();
    await leaveRoom.webSocketClose(leavingSocket);
    assert.strictEqual(leaveStorage.alarm, now + FIVE_MINUTES, 'intentional leaves start the same grace period');
  });
}

async function testReconnectionCancelsGracePeriod(worker) {
  const now = Date.parse('2026-09-03T12:00:00.000Z');
  await withFakeNow(now, async () => {
    const storage = new FakeStorage();
    storage.alarm = now + FIVE_MINUTES;
    const room = new worker.GameRoom(makeContext(storage), {});
    room.room = makeRoom({
      emptySince: new Date(now - 30_000).toISOString(),
      roles: { black: 'player-a-1234' },
      disconnected: { 'player-a-1234': { disconnectedAt: new Date(now - 30_000).toISOString() } }
    });
    const socket = makeSocket('player-a-1234', { joined: false });
    room.sessions.set(socket, socket.deserializeAttachment());
    await room.handleHello(socket, { clientId: 'player-a-1234', playerName: 'Alice', role: 'black' });
    assert.strictEqual(storage.alarm, null);
    assert.strictEqual(room.room.emptySince, null);
    assert.strictEqual(room.room.roles.black, 'player-a-1234');
    assert.ok(!room.room.disconnected['player-a-1234']);
  });
}

async function testAcceptedMoveCarriesPerConnectionRoles(worker) {
  const black = makeSocket('player-a-1234', { playerName: 'Player 4AA0', role: 'black' });
  const white = makeSocket('player-b-5678', { playerName: 'Player B123', role: 'white' });
  const storage = new FakeStorage();
  const room = new worker.GameRoom(makeContext(storage, [black, white]), {});
  room.room = makeRoom({
    readyToPlay: true,
    roundState: 'playing',
    roles: { black: 'player-a-1234', white: 'player-b-5678' },
    playerNames: { 'player-a-1234': 'Player 4AA0', 'player-b-5678': 'Player B123' }
  });

  await room.handleProposeMove(black, {
    baseVersion: 0,
    action: { type: 'place' },
    snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'white' },
    summary: 'Gomoku: Player B123 to move'
  });

  const blackState = black.sent.find((message) => message.type === 'state');
  const whiteState = white.sent.find((message) => message.type === 'state');
  const accepted = black.sent.find((message) => message.type === 'accepted');
  assert.deepStrictEqual(blackState.roles, { black: true, white: true });
  assert.deepStrictEqual(blackState.rolesAssigned, ['black']);
  assert.deepStrictEqual(whiteState.rolesAssigned, ['white']);
  assert.deepStrictEqual(accepted.rolesAssigned, ['black']);
}

async function testAlarmCleanupRetryAndRace(worker) {
  const now = Date.parse('2026-09-03T13:00:00.000Z');
  await withFakeNow(now, async () => {
    const removed = [];
    const indexStub = {
      async fetch(request) {
        if (new URL(request.url).pathname === '/room-index/remove') {
          removed.push((await request.json()).roomCode);
          return Response.json({ ok: true });
        }
        return Response.json({ ok: true });
      }
    };
    const env = { GAME_ROOM: makeNamespace({ '__room-index__': indexStub }) };
    const storage = new FakeStorage({ room: makeRoom() });
    const room = new worker.GameRoom(makeContext(storage), env);
    room.room = makeRoom({ emptySince: new Date(now - FIVE_MINUTES).toISOString() });
    await room.alarm();
    assert.deepStrictEqual(removed, ['123456']);
    assert.strictEqual(storage.deleteAllCalls, 1);
    assert.strictEqual(room.room, null);
    assert.strictEqual((await room.handleMeta()).status, 404, 'expired room metadata is gone');

    const retryStorage = new FakeStorage({ room: makeRoom() });
    const retryEnv = {
      GAME_ROOM: makeNamespace({
        '__room-index__': { async fetch() { return new Response('failed', { status: 503 }); } }
      })
    };
    const retryRoom = new worker.GameRoom(makeContext(retryStorage), retryEnv);
    retryRoom.room = makeRoom({ emptySince: new Date(now - FIVE_MINUTES).toISOString() });
    await retryRoom.alarm();
    assert.strictEqual(retryStorage.deleteAllCalls, 0, 'state remains when index removal fails');
    assert.strictEqual(retryStorage.alarm, now + RETRY_DELAY);

    const raceStorage = new FakeStorage({ room: makeRoom() });
    const raceRoom = new worker.GameRoom(makeContext(raceStorage), {});
    raceRoom.room = makeRoom({ emptySince: new Date(now - FIVE_MINUTES).toISOString() });
    const reconnected = makeSocket('player-race-1234', { role: 'black' });
    const raceIndex = {
      async fetch(request) {
        if (new URL(request.url).pathname === '/room-index/remove') {
          raceRoom.sessions.set(reconnected, reconnected.deserializeAttachment());
        }
        return Response.json({ ok: true });
      }
    };
    raceRoom.env = { GAME_ROOM: makeNamespace({ '__room-index__': raceIndex }) };
    await raceRoom.alarm();
    assert.strictEqual(raceStorage.deleteAllCalls, 0, 'a reconnect racing cleanup prevents deletion');
    assert.strictEqual(raceRoom.room.emptySince, null);
  });
}

async function testEarlyAndLegacyAlarms(worker) {
  const now = Date.parse('2026-09-03T14:00:00.000Z');
  await withFakeNow(now, async () => {
    const storage = new FakeStorage();
    const room = new worker.GameRoom(makeContext(storage), {});
    room.room = makeRoom({ emptySince: new Date(now - 60_000).toISOString() });
    await room.alarm();
    assert.strictEqual(storage.alarm, now + FOUR_MINUTES, 'an early alarm is rescheduled for the true deadline');

    const activeStorage = new FakeStorage();
    activeStorage.alarm = now;
    const activeSocket = makeSocket('thinking-player-1234', { role: 'black' });
    const active = new worker.GameRoom(makeContext(activeStorage, [activeSocket]), {});
    active.room = makeRoom({ emptySince: new Date(now - FIVE_MINUTES).toISOString() });
    await active.alarm();
    assert.strictEqual(activeStorage.deleteAllCalls, 0, 'connected move-inactive players keep the room alive');
    assert.strictEqual(activeStorage.alarm, null);
    assert.strictEqual(active.room.emptySince, null);

    const legacyStorage = new FakeStorage();
    const legacy = new worker.GameRoom(makeContext(legacyStorage), {});
    legacy.room = makeRoom({
      emptySince: undefined,
      updatedAt: new Date(now - 10 * 60_000).toISOString()
    });
    const response = await legacy.handleLifecycleReconcile();
    const payload = await response.json();
    assert.strictEqual(payload.connected, 0);
    assert.ok(Date.parse(payload.expiresAt) <= now);
    assert.strictEqual(legacyStorage.alarm, now, 'a legacy room already empty for five minutes is due immediately');
  });
}

const FOUR_MINUTES = 4 * 60 * 1000;

async function testLegacyIndexReconciliation(worker) {
  const now = Date.parse('2026-09-03T15:00:00.000Z');
  await withFakeNow(now, async () => {
    const old = new Date(now - 10 * 60_000).toISOString();
    const fresh = new Date(now - 60_000).toISOString();
    const storage = new FakeStorage({
      rooms: {
        '111111': { roomCode: '111111', gameMode: 'gomoku', summary: 'empty legacy', updatedAt: old },
        '222222': { roomCode: '222222', gameMode: 'go', summary: 'active legacy', updatedAt: old },
        '333333': { roomCode: '333333', gameMode: 'reversi', summary: 'fresh room', updatedAt: fresh }
      }
    });
    const lifecycleStub = (payload) => ({ async fetch() { return Response.json(payload); } });
    const env = {
      GAME_ROOM: makeNamespace({
        '111111': lifecycleStub({
          exists: true,
          connected: 0,
          expiresAt: new Date(now - FIVE_MINUTES).toISOString(),
          room: { roomCode: '111111', gameMode: 'gomoku', summary: 'empty legacy', updatedAt: old }
        }),
        '222222': lifecycleStub({
          exists: true,
          connected: 1,
          expiresAt: '',
          room: { roomCode: '222222', gameMode: 'go', summary: 'active legacy', updatedAt: old }
        })
      })
    };
    const index = new worker.GameRoom(makeContext(storage), env);
    const response = await index.handleRoomIndexList();
    const payload = await response.json();
    assert.deepStrictEqual(payload.rooms.map((entry) => entry.roomCode), ['333333', '222222']);
    assert.ok(payload.rooms.every((entry) => !('verifiedAt' in entry) && !('expiresAt' in entry)), 'private lease fields stay out of the public API');
    const stored = storage.values.get('rooms');
    assert.ok(!stored['111111'], 'stale empty legacy room is pruned');
    assert.strictEqual(stored['222222'].verifiedAt, new Date(now).toISOString(), 'connected legacy room receives a fresh verification lease');
  });
}

async function testAnonymousAnalyticsAndPrivateDashboard(worker) {
  const storage = new FakeStorage();
  const analyticsObject = new worker.GameRoom(makeContext(storage), {});
  const stub = { fetch(request) { return analyticsObject.fetch(request); } };
  const env = {
    ANALYTICS_ALLOWED_ORIGINS: 'https://ramified.github.io',
    ANALYTICS_ADMIN_TOKEN: 'correct-horse-battery-staple',
    GAME_ROOM: {
      idFromName(name) { return name; },
      get(id) {
        assert.ok(String(id).startsWith('__analytics__:'));
        return stub;
      }
    }
  };
  const publicHeaders = {
    Origin: 'https://ramified.github.io',
    'Content-Type': 'text/plain;charset=UTF-8'
  };

  const visit = await worker.default.fetch(new Request('https://worker.example/api/analytics', {
    method: 'POST',
    headers: publicHeaders,
    body: JSON.stringify({ type: 'visit', gameMode: 'gomoku', playerName: 'must not be stored' })
  }), env);
  assert.strictEqual(visit.status, 204);
  assert.strictEqual(visit.headers.get('Access-Control-Allow-Origin'), 'https://ramified.github.io');

  const heartbeat = await worker.default.fetch(new Request('https://worker.example/api/analytics', {
    method: 'POST',
    headers: publicHeaders,
    body: JSON.stringify({ type: 'heartbeat', gameMode: 'gomoku', activeSeconds: 999 })
  }), env);
  assert.strictEqual(heartbeat.status, 204);

  const blocked = await worker.default.fetch(new Request('https://worker.example/api/analytics', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example' },
    body: JSON.stringify({ type: 'visit', gameMode: 'go' })
  }), env);
  assert.strictEqual(blocked.status, 403);

  const unauthorized = await worker.default.fetch(new Request('https://worker.example/admin/analytics'), env);
  assert.strictEqual(unauthorized.status, 401);
  assert.ok(unauthorized.headers.get('WWW-Authenticate').includes('Basic'));

  const authorization = `Basic ${Buffer.from('admin:correct-horse-battery-staple').toString('base64')}`;
  const dashboard = await worker.default.fetch(new Request('https://worker.example/admin/analytics', {
    headers: { Authorization: authorization }
  }), env);
  assert.strictEqual(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.ok(dashboardHtml.includes('Ramified Minigames analytics'));
  assert.ok(dashboardHtml.includes('歧趣游境数据统计'));

  const report = await worker.default.fetch(new Request('https://worker.example/api/admin/analytics?days=1', {
    headers: { Authorization: authorization }
  }), env);
  assert.strictEqual(report.status, 200);
  const payload = await report.json();
  assert.strictEqual(payload.totals.visits, 1);
  assert.strictEqual(payload.totals.activeSeconds, 60, 'heartbeat duration is clamped');
  assert.deepStrictEqual(payload.games, [{ gameMode: 'gomoku', visits: 1, activeSeconds: 60 }]);
  const stored = storage.values.get('aggregate');
  assert.ok(stored);
  assert.strictEqual(stored.playerName, undefined);
  assert.deepStrictEqual(Object.keys(stored), ['day', 'visits', 'activeSeconds', 'events', 'byGame', 'byCountry', 'updatedAt']);
}

async function run() {
  const worker = await import('./ramified-chess.worker.js');
  await testCreationAndJoinAlarm(worker);
  await testFinalSocketStartsGracePeriod(worker);
  await testReconnectionCancelsGracePeriod(worker);
  await testAcceptedMoveCarriesPerConnectionRoles(worker);
  await testAlarmCleanupRetryAndRace(worker);
  await testEarlyAndLegacyAlarms(worker);
  await testLegacyIndexReconciliation(worker);
  await testAnonymousAnalyticsAndPrivateDashboard(worker);
  console.log('ramified-chess.worker_test: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
