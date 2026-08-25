'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const M = require('./topological_billiards_math.js');
const P = require('./topological_billiards_physics.js');
const N = require('./topological_billiards_native.js');

function testBrowserSimulationWorker() {
  let messageHandler = null;
  const messages = [];
  const workerScope = {
    addEventListener(type, handler) {
      if (type === 'message') messageHandler = handler;
    },
    postMessage(message) {
      messages.push(message);
    }
  };
  const context = vm.createContext({
    self: workerScope,
    performance,
    importScripts() {
      workerScope.TopologicalBilliardsMath = M;
      workerScope.TopologicalBilliardsPhysics = P;
      workerScope.TopologicalBilliardsNative = N;
    }
  });
  const source = fs.readFileSync(require.resolve('./topological_billiards_simulation_worker.js'), 'utf8');
  vm.runInContext(source, context, { filename: 'topological_billiards_simulation_worker.js' });
  assert.strictEqual(typeof messageHandler, 'function');

  const preset = {
    id: 'worker-shot-test',
    lattice: 'square',
    rows: 1,
    cols: 1,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      pockets: [],
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }],
      parameters: { maxShotSeconds: 0.05 }
    }
  };
  const state = N.begin(N.createState(preset)).state;
  messageHandler({
    data: {
      id: 17,
      preset,
      state: N.stateExport(state),
      aim: { x: 1, y: 0 },
      power: 0.4,
      contact: { x: 0, y: 0 },
      shooter: 'player-1',
      collectTrajectory: true
    }
  });
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].id, 17);
  assert.strictEqual(messages[0].ok, true);
  assert.strictEqual(messages[0].changed, true);
  assert.strictEqual(messages[0].state.shots, 1);
  assert.ok(messages[0].simulationSteps > 0);
  assert.ok(messages[0].trajectory.length >= 2);
}

function testRackPlacement() {
  const preset = {
    id: 'rack-placement-test',
    lattice: 'square',
    rows: 5,
    cols: 5,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      ballRadius: 0.12,
      pockets: [],
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }]
    }
  };
  const initial = N.createState(preset);
  const tileIndex = N.indexOf(3, 3, preset.cols);
  const spacing = initial.ballRadius * 2 * 1.005;
  const assertTriangularPacking = (entries) => {
    assert.ok(entries.length > 1);
    const distances = [];
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const dx = entries[left].position.x - entries[right].position.x;
        const dy = entries[left].position.y - entries[right].position.y;
        distances.push(Math.hypot(dx, dy));
      }
    }
    const nearest = Math.min(...distances);
    assert.ok(Math.abs(nearest - spacing) < 1e-9, `nearest centres should be ${spacing}, got ${nearest}`);
    distances.filter((distance) => distance <= nearest * 1.001).forEach((distance) => {
      assert.ok(Math.abs(distance - spacing) < 1e-9, `adjacent centres should be uniformly spaced: ${distance}`);
    });
  };
  [6, 10, 15].forEach((count) => {
    const layout = N.rackLayout(count, { x: 0.15, y: -0.2 }, { x: 1, y: 0 }, initial.ballRadius);
    assert.strictEqual(layout.positions.length, count);
    assertTriangularPacking(layout.positions.map((position) => ({ position })));
    assert.ok(Math.abs(layout.positions.reduce((sum, position) => sum + position.x, 0) / count - 0.15) < 1e-9);
    assert.ok(Math.abs(layout.positions.reduce((sum, position) => sum + position.y, 0) / count + 0.2) < 1e-9);
  });
  const six = N.placeRack(initial, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(six.changed, true);
  assert.strictEqual(six.state.balls.filter((ball) => ball.kind === 'cue').length, 1);
  const sixTargets = six.state.balls.filter((ball) => ball.kind === 'target');
  assert.deepStrictEqual(sixTargets.map((ball) => ball.number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.ok(Math.abs(sixTargets.reduce((sum, ball) => sum + ball.position.x, 0) / sixTargets.length) < 1e-8);
  assert.ok(Math.abs(sixTargets.reduce((sum, ball) => sum + ball.position.y, 0) / sixTargets.length) < 1e-8);
  assertTriangularPacking(sixTargets);
  const clearPreview = N.rackPreviewEntries(initial, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(clearPreview.every((entry) => entry.valid));
  assertTriangularPacking(clearPreview);
  const blockedPreviewState = N.cloneState(initial);
  blockedPreviewState.balls[0].tileIndex = clearPreview[0].tileIndex;
  blockedPreviewState.balls[0].position = { ...clearPreview[0].position };
  const blockedPreview = N.rackPreviewEntries(blockedPreviewState, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(blockedPreview.some((entry) => !entry.valid));

  const fifteen = N.placeRack(six.state, 15, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(fifteen.changed, true);
  assert.strictEqual(fifteen.state.targetTotal, 15);
  assert.deepStrictEqual(fifteen.state.balls.filter((ball) => ball.kind === 'target').map((ball) => ball.number).sort((a, b) => a - b), Array.from({ length: 15 }, (_, index) => index + 1));
  const tenPreview = N.rackPreviewEntries(initial, 10, tileIndex, { x: 0, y: 0 }, { x: 0, y: 1 });
  assert.strictEqual(tenPreview.length, 10);
  assert.strictEqual(N.begin(fifteen.state).changed, true);
  const restored = N.stateFromExport(preset, N.stateExport(fifteen.state));
  assert.deepStrictEqual(restored.balls.filter((ball) => ball.kind === 'target').map((ball) => ball.number).sort((a, b) => a - b), Array.from({ length: 15 }, (_, index) => index + 1));

  const invalid = N.placeRack(fifteen.state, 7, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(invalid.changed, false);
  assert.strictEqual(invalid.state, fifteen.state);
}

function testSetupInteractionPreview() {
  const preset = {
    id: 'setup-interaction-preview-test', lattice: 'square', rows: 1, cols: 1,
    removedTiles: [], cutEdges: [], gluedEdges: [
      { first: { row: 1, col: 1, dir: 'E' }, second: { row: 1, col: 1, dir: 'W' } },
      { first: { row: 1, col: 1, dir: 'N' }, second: { row: 1, col: 1, dir: 'S' } }
    ], billiards: { ballRadius: 0.1, pockets: [] }
  };
  const state = N.createState(preset);
  const tileIndex = 0;
  const valid = N.setupInteractionPreview(state, { kind: 'cue' }, tileIndex, { x: 0, y: 0 });
  assert.strictEqual(valid.type, 'ball');
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.action, 'place');
  const placed = N.placeBall(state, { kind: 'cue' }, tileIndex, { x: 0, y: 0 }).state;
  const blocked = N.setupInteractionPreview(placed, { kind: 'target', number: 1 }, tileIndex, { x: 0, y: 0 });
  assert.strictEqual(blocked.valid, false);
  assert.match(blocked.message, /overlaps another ball/);
  const pocket = N.setupInteractionPreview(placed, { kind: 'pocket' }, tileIndex, { x: -1, y: -1 });
  assert.strictEqual(pocket.type, 'pocket');
  assert.strictEqual(pocket.action, 'add');
  assert.strictEqual(pocket.incidences.length, 4, 'all quotient-equivalent seam incidences are highlighted');
  const withPocket = N.togglePocket(placed, tileIndex, { x: -1, y: -1 }).state;
  const removePocket = N.setupInteractionPreview(withPocket, { kind: 'pocket' }, tileIndex, { x: -1, y: -1 });
  assert.strictEqual(removePocket.action, 'remove');
  const eraseCue = N.setupInteractionPreview(placed, { kind: 'clear' }, tileIndex, { x: 0, y: 0 });
  assert.strictEqual(eraseCue.action, 'erase');
  assert.strictEqual(eraseCue.type, 'ball');
}

async function testOnlineRoundReadinessAndRematch(worker) {
  const ctx = { storage: { async put() {} }, getWebSockets() { return []; } };
  const room = new worker.GameRoom(ctx, {});
  const firstId = 'player-a-1234';
  const secondId = 'player-b-5678';
  const snapshot = { gameMode: 'gomoku', phase: 'ready', turn: 'black' };
  room.room = {
    roomCode: 'TEST',
    gameMode: 'gomoku',
    version: 0,
    snapshot,
    roundStartSnapshot: snapshot,
    summary: '',
    roles: { black: firstId, white: secondId },
    playerNames: { [firstId]: 'Alice', [secondId]: 'Bob' },
    roundState: 'waiting',
    readyToPlay: false,
    readyClientIds: [],
    rematch: null
  };
  const socket = (clientId, role) => {
    let attachment = { clientId, playerName: clientId, role, roles: [role], joined: true };
    return {
      deserializeAttachment() { return attachment; },
      serializeAttachment(next) { attachment = next; },
      send() {}
    };
  };
  const first = socket(firstId, 'black');
  const second = socket(secondId, 'white');
  room.sessions.set(first, first.deserializeAttachment());
  room.sessions.set(second, second.deserializeAttachment());
  await room.handleSetReady(first, { ready: true });
  assert.strictEqual(room.room.roundState, 'waiting');
  await room.handleSetReady(second, { ready: true });
  assert.strictEqual(room.room.roundState, 'playing');
  room.room.roundState = 'finished';
  room.room.readyToPlay = false;
  await room.handleProposeRematch(first, {});
  await room.handleAcceptRematch(second, {});
  assert.strictEqual(room.room.roundState, 'playing');
  assert.strictEqual(room.room.roles.black, secondId);
  assert.strictEqual(room.room.roles.white, firstId);
}

async function testHexRoomPieSwap(worker) {
  const ctx = { storage: { async put() {} }, getWebSockets() { return []; } };
  const room = new worker.GameRoom(ctx, {});
  const redId = 'hex-red-1234';
  const blueId = 'hex-blue-5678';
  const snapshot = {
    gameMode: 'hex', phase: 'ready', turn: 'blue',
    tiles: [{ id: 1, index: 0, color: 'red', moveNumber: 1 }],
    pieRule: true, pieAvailable: true, pieSwapped: false
  };
  room.room = {
    roomCode: 'HEX', gameMode: 'hex', version: 0, snapshot, roundStartSnapshot: snapshot,
    summary: '', roles: { red: redId, blue: blueId },
    playerNames: { [redId]: 'Red', [blueId]: 'Blue' },
    roundState: 'playing', readyToPlay: true, readyClientIds: [redId, blueId], rematch: null
  };
  const socket = (clientId, role) => {
    let attachment = { clientId, playerName: clientId, role, roles: [role], joined: true };
    return {
      deserializeAttachment() { return attachment; },
      serializeAttachment(next) { attachment = next; },
      send() {}
    };
  };
  const red = socket(redId, 'red');
  const blue = socket(blueId, 'blue');
  room.sessions.set(red, red.deserializeAttachment());
  room.sessions.set(blue, blue.deserializeAttachment());
  const next = { ...snapshot, pieAvailable: false, pieSwapped: true };
  await room.handleProposeMove(blue, {
    baseVersion: 0,
    action: { type: 'pie-swap', gameMode: 'hex', role: 'blue' },
    snapshot: next,
    summary: 'pie swap'
  });
  assert.strictEqual(room.room.version, 1);
  assert.strictEqual(room.room.roles.red, blueId);
  assert.strictEqual(room.room.roles.blue, redId);
  assert.strictEqual(room.sessions.get(red).role, 'blue');
  assert.strictEqual(room.sessions.get(blue).role, 'red');
  await room.handleProposeMove(blue, {
    baseVersion: 0,
    action: { type: 'place', gameMode: 'hex', role: 'red', index: 1 },
    snapshot: next,
    summary: 'stale'
  });
  assert.strictEqual(room.room.version, 1);
}

async function run() {
  testBrowserSimulationWorker();
  testRackPlacement();
  testSetupInteractionPreview();
  const worker = await import('../../cloudflare/ramified-chess.worker.js');
  await testOnlineRoundReadinessAndRematch(worker);
  await testHexRoomPieSwap(worker);
  const shot = worker.normalizeAction({
    type: 'billiards-shot',
    shooter: 'player-1',
    aim: { x: 1, y: 0, ignored: 'value' },
    power: 0.65,
    contact: { x: 0.2, y: -0.1, ignored: 'value' }
  });
  assert.deepStrictEqual(shot.aim, { x: 1, y: 0 });
  assert.deepStrictEqual(shot.contact, { x: 0.2, y: -0.1 });

  const current = {
    gameMode: 'billiards',
    rules: 'competitive',
    phase: 'ready',
    turn: 'player-1',
    ballInHand: false,
    shots: 2
  };
  const retained = {
    ...current,
    shots: 3,
    lastShot: {
      shooter: 'player-1',
      aim: { x: 1, y: 0 },
      power: 0.65,
      contact: { x: 0.2, y: -0.1 },
      pocketedTargets: ['1'],
      scratch: false
    }
  };
  assert.strictEqual(worker.billiardsTurnIssue(['player-1'], shot, current, retained), '');
  assert.match(worker.billiardsTurnIssue([], shot, current, retained), /player-1 to play/);

  const passed = {
    ...retained,
    turn: 'player-2',
    lastShot: { ...retained.lastShot, pocketedTargets: [] }
  };
  assert.strictEqual(worker.billiardsTurnIssue(['player-1'], shot, current, passed), '');

  const scratched = {
    ...passed,
    phase: 'ball-in-hand',
    ballInHand: true,
    ballInHandPlayer: 'player-2',
    lastShot: { ...passed.lastShot, scratch: true }
  };
  assert.strictEqual(worker.billiardsTurnIssue(['player-1'], shot, current, scratched), '');

  const placement = worker.normalizeAction({
    type: 'billiards-place-cue',
    player: 'player-2',
    at: { row: 2, col: 3, x: 0.1, y: -0.2, ignored: 'value' }
  });
  assert.deepStrictEqual(placement.at, { row: 2, col: 3, x: 0.1, y: -0.2 });
  assert.strictEqual(worker.billiardsTurnIssue(
    ['player-2'],
    placement,
    { ...scratched, turn: 'player-2' },
    { ...scratched, phase: 'ready', ballInHand: false, ballInHandPlayer: '', turn: 'player-2' }
  ), '');

  const initial = {
    gameMode: 'billiards',
    rules: 'competitive',
    phase: 'ready',
    ballInHand: false,
    balls: [{ id: 'cue', kind: 'cue', active: true, at: { row: 1, col: 1, x: 0, y: 0 } }]
  };
  assert.doesNotThrow(() => worker.validateSnapshot(initial, 'billiards', { initial: true }));
  assert.throws(() => worker.validateSnapshot({ ...initial, rules: 'solo' }, 'billiards', { initial: true }), /Competitive/);
  assert.throws(() => worker.validateSnapshot({ ...initial, phase: 'setup' }, 'billiards', { initial: true }), /Finish/);
  assert.throws(() => worker.validateSnapshot({ ...initial, balls: [] }, 'billiards', { initial: true }), /exactly one/);

  const hexInitial = {
    gameMode: 'hex', phase: 'ready', turn: 'red', tiles: [],
    pieRule: false, pieAvailable: false, pieSwapped: false
  };
  assert.doesNotThrow(() => worker.validateSnapshot(hexInitial, 'hex', { initial: true }));
  assert.throws(() => worker.validateSnapshot({ ...hexInitial, turn: 'green' }, 'hex', { initial: true }), /red or blue/);
  assert.throws(() => worker.validateSnapshot({ ...hexInitial, tiles: [{ id: 1, index: 0, color: 'red' }, { id: 1, index: 1, color: 'blue' }] }, 'hex'), /unique/);

  console.log('topological_billiards_worker_test: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
