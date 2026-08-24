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
  const six = N.placeRack(initial, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(six.changed, true);
  assert.strictEqual(six.state.balls.filter((ball) => ball.kind === 'cue').length, 1);
  const sixTargets = six.state.balls.filter((ball) => ball.kind === 'target');
  assert.deepStrictEqual(sixTargets.map((ball) => ball.number).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
  assert.ok(Math.abs(sixTargets.reduce((sum, ball) => sum + ball.position.x, 0) / sixTargets.length) < 1e-8);
  assert.ok(Math.abs(sixTargets.reduce((sum, ball) => sum + ball.position.y, 0) / sixTargets.length) < 1e-8);
  const clearPreview = N.rackPreviewEntries(initial, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(clearPreview.every((entry) => entry.valid));
  const blockedPreviewState = N.cloneState(initial);
  blockedPreviewState.balls[0].tileIndex = clearPreview[0].tileIndex;
  blockedPreviewState.balls[0].position = { ...clearPreview[0].position };
  const blockedPreview = N.rackPreviewEntries(blockedPreviewState, 6, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(blockedPreview.some((entry) => !entry.valid));

  const fifteen = N.placeRack(six.state, 15, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(fifteen.changed, true);
  assert.strictEqual(fifteen.state.targetTotal, 15);
  assert.deepStrictEqual(fifteen.state.balls.filter((ball) => ball.kind === 'target').map((ball) => ball.number).sort((a, b) => a - b), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.strictEqual(N.begin(fifteen.state).changed, true);
  const restored = N.stateFromExport(preset, N.stateExport(fifteen.state));
  assert.deepStrictEqual(restored.balls.filter((ball) => ball.kind === 'target').map((ball) => ball.number).sort((a, b) => a - b), Array.from({ length: 15 }, (_, index) => index + 1));

  const invalid = N.placeRack(fifteen.state, 7, tileIndex, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.strictEqual(invalid.changed, false);
  assert.strictEqual(invalid.state, fifteen.state);
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

async function run() {
  testBrowserSimulationWorker();
  testRackPlacement();
  const worker = await import('../../cloudflare/ramified-chess.worker.js');
  await testOnlineRoundReadinessAndRematch(worker);
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

  console.log('topological_billiards_worker_test: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
