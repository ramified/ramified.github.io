const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const load = name => import(pathToFileURL(path.join(__dirname, name)));
class Storage {
  constructor() { this.data = new Map(); this.alarm = null; }
  async get(k) { return this.data.get(k); }
  async put(k, v) { this.data.set(k, structuredClone(v)); }
  async setAlarm(v) { this.alarm = v; }
  async deleteAlarm() { this.alarm = null; }
  async deleteAll() { this.data.clear(); this.alarm = null; }
}
function socket(id) {
  let a = { clientId: id, joined: false, roles: [] };
  return { sent: [], deserializeAttachment: () => a, serializeAttachment: v => { a = v; }, send(v) { this.sent.push(JSON.parse(v)); }, close() {} };
}
async function run() {
  const c = await load('ramified-room-clock.js');
  const { GameRoom, default: worker } = await load('ramified-chess.worker.js');
  let now = 1000000;
  const realNow = Date.now; Date.now = () => now;
  try {
    const makeClock = (mode, extra = {}) => {
      const room = { roundState: 'playing', gameMode: 'gomoku', snapshot: { phase: 'ready', turn: 'black' }, timeControl: { mode, totalSeconds: 10, moveSeconds: 30, periodSeconds: 30 }, ...extra };
      c.startClock(room, ['black', 'white'], now); return room;
    };
    for (const [seconds, count] of [[20, 3], [40, 2], [70, 1]]) {
      const room = makeClock('byoyomi'); room.clock.seats.black.main = 0;
      assert.deepEqual(c.settleClock(room, now + seconds * 1000), []);
      c.finishClockAction(room, { type: 'place' }, room.snapshot, now + seconds * 1000);
      assert.equal(room.clock.seats.black.periods, count); assert.equal(room.clock.seats.black.period, 30000);
    }
    const deadline = makeClock('byoyomi'); deadline.clock.seats.black.main = 0;
    assert.deepEqual(c.settleClock(deadline, now + 90000), ['black']);
    const crossing = makeClock('byoyomi'); c.settleClock(crossing, now + 15000);
    assert.equal(crossing.clock.seats.black.period, 25000); assert.equal(crossing.clock.seats.black.periods, 3);
    const undo = makeClock('move'); c.settleClock(undo, now + 10000);
    c.finishClockAction(undo, { type: 'history-undo' }, undo.snapshot, now + 10000);
    assert.equal(undo.clock.seats.black.period, 20000);
    c.finishClockAction(undo, { type: 'place' }, undo.snapshot, now + 10000);
    assert.equal(undo.clock.seats.black.period, 30000);
    c.finishClockAction(undo, { type: 'history-undo' }, undo.snapshot, now + 10000);
    assert.equal(undo.clock.seats.black.period, 20000, 'undo after a completed action cannot exploit its period refill');
    const jump = makeClock('move', { gameMode: 'chinese-checkers', roles: { black: 'a', white: 'b' }, snapshot: { phase: 'ready', turn: 'black', playerColors: ['black', 'white'], openingOrder: [], jumpChain: { marbleId: 1 } } });
    c.settleClock(jump, now + 5000); c.finishClockAction(jump, { type: 'chinese-checkers-move', role: 'black' }, jump.snapshot, now + 5000);
    assert.equal(jump.clock.seats.black.period, 25000); assert.equal(jump.clock.seats.white.period, 25000);
    const pie = makeClock('total', { gameMode: 'hex', snapshot: { phase: 'ready', turn: 'blue' } });
    c.startClock(pie, ['red', 'blue'], now); c.settleClock(pie, now + 3000);
    c.finishClockAction(pie, { type: 'pie-swap', role: 'blue' }, pie.snapshot, now + 3000);
    assert.equal(pie.clock.seats.red.main, 7000); assert.equal(pie.clock.seats.blue.main, 10000);
    const review = makeClock('total', { gameMode: 'go' }); c.settleClock(review, now + 2000);
    const previous = review.snapshot; review.snapshot = { ...previous, scoringReview: true };
    c.finishClockAction(review, { type: 'pass' }, previous, now + 2000); c.settleClock(review, now + 90000);
    assert.equal(review.clock.seats.black.main, 8000);
    assert.throws(() => c.timeControl({ mode: 'move', moveSeconds: 0 }));
    assert.throws(() => c.timeControl({ mode: 'byoyomi', totalSeconds: 1, periodSeconds: 1.5 }));

    const objects = new Map(), env = { GAME_ROOM: { idFromName: id => id, get(id) {
      if (!objects.has(id)) objects.set(id, new GameRoom({ storage: new Storage(), getWebSockets: () => [] }, env));
      return objects.get(id);
    } } };
    const creation = { clientId: 'retry-player', creationId: 'same-attempt', gameMode: 'gomoku', role: 'black', snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'black' } };
    const create = body => worker.fetch(new Request('https://worker/api/rooms', { method: 'POST', body: JSON.stringify(body) }), env);
    const created = await (await create(creation)).json(), retried = await (await create(creation)).json();
    assert.equal(retried.roomCode, created.roomCode, 'lost creation response can be retried without creating another room');
    assert.equal(objects.size, 2, 'only one room and its index exist');
    const reserved = objects.get(created.roomCode);
    now += 60000; await reserved.alarm();
    assert.deepEqual(reserved.room.roles, {}, 'creator who never connects cannot reserve a seat permanently');
    assert.equal(reserved.room.hostId, null);
    assert.equal(reserved.ctx.storage.alarm, Date.parse(reserved.room.emptySince) + 300000);

    async function makeRoom(config = { mode: 'unlimited' }) {
      const storage = new Storage(), room = new GameRoom({ storage, getWebSockets: () => [] }, {});
      const res = await room.handleInit(new Request('https://room/init', { method: 'POST', body: JSON.stringify({ roomCode: '123456', gameMode: 'gomoku', clientId: 'first-player', role: 'black', timeControl: config, snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'black' } }) }));
      assert.equal(res.status, 200);
      async function join(id) { const ws = socket(id); room.sessions.set(ws, ws.deserializeAttachment()); await room.handleHello(ws, { clientId: id, role: 'white' }); return ws; }
      const first = await join('first-player'), second = await join('second-player'), spectator = await join('spectator-player');
      return { room, first, second, spectator, storage, join };
    }
    const r = await makeRoom({ mode: 'total', totalSeconds: 100 });
    assert.equal(r.second.deserializeAttachment().role, 'spectator', 'joining never automatically takes a seat');
    await r.room.handleSetReady(r.first, { ready: true }); assert.equal(r.room.room.roundState, 'waiting', 'one player cannot start');
    await r.room.handleClaimRoles(r.second, { rolesRequested: ['white'] });
    await r.room.handleSetReady(r.first, {}); await r.room.handleSetReady(r.second, {});
    assert.equal(r.room.room.roundState, 'playing'); assert.equal(r.storage.alarm, now + 100000);
    await r.room.handleLifecycleReconcile();
    assert.equal(r.storage.alarm, now + 100000, 'lobby reconciliation must preserve the running clock alarm');
    r.room.emptySince = new Date(now - 300000).toISOString();
    await r.room.scheduleRoomAlarm(now + 60000);
    assert.equal(r.storage.alarm, now + 60000, 'expired empty cleanup is deferred to its retry');
    r.room.emptySince = null;
    const initialClock = structuredClone(r.room.room.clock);
    await r.room.finishSocket(r.first, 'disconnected');
    assert.equal(r.storage.alarm, now + 60000); now += 59000;
    const reconnect = await r.join('first-player');
    assert.equal(r.room.room.hostId, 'first-player'); assert.equal(r.room.room.members['first-player'].order, 1);
    assert.equal(r.room.room.clock.seats.black.main, 41000);
    await r.room.finishSocket(reconnect, 'disconnected'); now += 41000;
    await r.room.alarm(); assert.equal(r.room.room.outcome.type, 'timeout', 'timeout can precede identity expiry');
    assert.equal(r.room.room.hostId, 'first-player'); now += 19000; await r.room.alarm();
    assert.equal(r.room.room.hostId, 'second-player'); assert.ok(!r.room.room.roles.black);
    const returned = await r.join('first-player'); assert.equal(returned.deserializeAttachment().role, 'spectator');
    assert.equal(r.room.room.hostId, 'second-player'); assert.ok(r.room.room.members['first-player'].order > 2);
    assert.notDeepEqual(r.room.room.clock, initialClock);

    const p = await makeRoom(); await p.room.handleClaimRoles(p.second, { rolesRequested: ['white'] });
    await p.room.handleSetReady(p.first, {}); await p.room.handleSetReady(p.second, {});
    const before = p.room.room.snapshot;
    const proposed = { type: 'proposeConfiguration', gameMode: 'gomoku', snapshot: { gameMode: 'gomoku', phase: 'ready', turn: 'white', preset: { id: 'new', rows: 15, cols: 15, boundaryGlueMode: 'open' } }, timeControl: { mode: 'move', moveSeconds: 20 } };
    await p.room.handleConfiguration(p.spectator, proposed); assert.equal(p.room.room.proposal, null);
    await p.room.handleConfiguration(p.first, proposed); const proposal1 = p.room.room.proposal.id;
    p.room.sendState(p.second);
    assert.equal(p.second.sent.at(-1).proposal.configuration.rows, 15);
    assert.equal(p.second.sent.at(-1).proposal.configuration.boundary, 'open');
    assert.equal(p.room.room.snapshot, before); now += 60000; await p.room.alarm();
    assert.equal(p.room.room.proposal, null); assert.equal(p.room.room.roles.white, 'second-player', 'nonresponse does not eject');
    await p.room.handleConfiguration(p.first, proposed);
    await p.room.handleConfiguration(p.second, { type: 'configurationResponse', proposalId: proposal1, accept: true });
    assert.equal(p.room.room.snapshot, before, 'stale consent cannot apply a replacement proposal');
    await p.room.handleConfiguration(p.second, { type: 'configurationResponse', proposalId: p.room.room.proposal.id, accept: true });
    assert.equal(p.room.room.snapshot.preset.id, 'new'); assert.equal(p.room.room.roundState, 'waiting');
    assert.deepEqual(p.room.room.roles, {}); assert.equal(p.room.room.clock, null);
    await p.room.handleClaimRoles(p.first, { rolesRequested: ['black'] }); await p.room.handleClaimRoles(p.second, { rolesRequested: ['white'] });
    await p.room.handleConfiguration(p.first, proposed);
    await p.room.handleConfiguration(p.second, { type: 'configurationResponse', proposalId: p.room.room.proposal.id, accept: false });
    assert.ok(!p.room.room.members['second-player']); assert.ok(p.room.room.members['spectator-player']);

    const h = await makeRoom(); await h.room.handleClaimRoles(h.second, { rolesRequested: ['white'] });
    await h.room.handleConfiguration(h.first, proposed);
    await h.room.releaseSocketRole(h.first);
    assert.equal(h.room.room.proposal, null, 'departing host cancels the outstanding proposal');
    assert.equal(h.room.room.hostId, 'second-player');

    const d = await makeRoom(); await d.room.handleClaimRoles(d.second, { rolesRequested: ['white'] });
    await d.room.handleConfiguration(d.first, proposed);
    await d.room.finishSocket(d.second, 'disconnected');
    assert.equal(d.room.applyAgreedConfiguration(), false, 'a disconnected participant is not implicit consent');

    const tabs = await makeRoom();
    const secondTab = await tabs.join('second-player');
    await tabs.room.handleClaimRoles(tabs.second, { rolesRequested: ['white'] });
    assert.deepEqual(secondTab.deserializeAttachment().roles, ['white'], 'seat ownership is shared across tabs of one identity');
    await tabs.room.handleClaimRoles(tabs.first, { rolesRequested: [] });
    assert.equal(tabs.room.room.hostId, 'second-player', 'host who releases every waiting seat transfers to the next participant');
    await tabs.room.handleClaimRoles(tabs.second, { rolesRequested: ['black'] });
    assert.deepEqual(secondTab.deserializeAttachment().roles, ['black'], 'old seat permissions are removed from every tab');

    const a = await makeRoom(); await a.room.handleClaimRoles(a.second, { rolesRequested: ['white'] });
    await a.room.handleSetReady(a.first, {}); await a.room.handleSetReady(a.second, {});
    await a.room.releaseSocketRole(a.first); assert.equal(a.room.room.hostId, 'second-player'); assert.equal(a.room.room.roundState, 'playing');
    await a.room.releaseSocketRole(a.second); assert.equal(a.room.room.outcome.type, 'aborted'); assert.equal(a.room.room.hostId, null);
    assert.equal(a.room.room.emptySince, null, 'spectators keep a room alive');
    await a.room.handleClaimRoles(a.spectator, { rolesRequested: ['black'] });
    assert.equal(a.room.room.hostId, 'spectator-player'); assert.equal(a.room.room.roundState, 'waiting'); assert.equal(a.room.room.snapshot.turn, 'black');
    console.log('ramified-room-rules_test: clocks, opening, history, host/grace, consent, explicit seats and aborted rounds passed');
  } finally { Date.now = realNow; }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
