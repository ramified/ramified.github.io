'use strict';

const assert = require('assert');

async function run() {
  const worker = await import('../../cloudflare/ramified-chess.worker.js');
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
