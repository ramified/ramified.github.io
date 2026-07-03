const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const game = require('./ramified_minigames_setup.js');

function box(id, row, col, value, cols = 4) {
  return { id, index: game.indexOf(row, col, cols), value };
}

function valuesAt(state, cols = state.preset.cols) {
  return state.boxes
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.value}`;
    })
    .sort();
}

function stateWithBoxes(presetId, boxes) {
  const state = game.createGameState(presetId);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function testInitialSpawnWeights() {
  const rng = game.createRng([0, 0.99, 0, 0.99]);
  const state = game.beginGame('classic-4x4', { rng });
  assert.strictEqual(state.boxes.length, 2);
  assert.deepStrictEqual(state.boxes.map((item) => item.value), [4, 4]);
  assert.ok(state.boxes.every((item) => item.value <= 4));
}

function testRoundSpawnWeights() {
  assert.strictEqual(game.spawnRoundValue(() => 0.899), 2);
  assert.strictEqual(game.spawnRoundValue(() => 0.95), 4);
  assert.strictEqual(game.spawnRoundValue(() => 0.995), 8);
  assert.strictEqual(game.spawnRoundValue(() => 0.9992), 16);
  assert.strictEqual(game.spawnRoundValue(() => 0.9999), 32);
}

function testNoSpawnAfterNoop() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.events.length, 0);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:4']);
}

function testGameOverWhenFullAndBlocked() {
  const state = game.createGameState('classic-4x4');
  const values = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2
  ];
  state.boxes = values.map((value, index) => ({ id: index + 1, index, value }));
  state.nextBoxId = 17;
  assert.strictEqual(game.emptyExistingIndices(state).length, 0);
  assert.strictEqual(game.isGameOver(state), true);
  assert.strictEqual(game.simulateRound(state, game.DIRS.W, { spawn: false }).changed, false);
}

function testOrdinaryMergeOnce() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 2),
    box(4, 1, 4, 2)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:4', '1,2:4']);
  assert.strictEqual(result.state.score, 8);
}

function testNewlyMergedTileBlocksLaterPush() {
  const state = stateWithBoxes('classic-4x4', [
    box(4, 4, 1, 4),
    box(1, 4, 2, 2),
    box(2, 4, 3, 2),
    box(3, 4, 4, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['4,2:4', '4,3:4', '4,4:4']);
  assert.strictEqual(result.state.score, 4);
  assert.ok(!result.events.some((event) => event.kind === 'merge' && event.newValue === 8));
}

function testFaceToFaceSwapBouncesWithoutMoving() {
  const preset = {
    id: 'face-to-face',
    label: 'face-to-face',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'swap collision',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 1, col: 1, dir: game.DIRS.N },
        second: { row: 1, col: 2, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:2']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => `${move.boxId}:${move.from}>${move.to}`).sort(), [
    `${1}:${game.indexOf(1, 1, 4)}>${game.indexOf(1, 2, 4)}`,
    `${2}:${game.indexOf(1, 2, 4)}>${game.indexOf(1, 1, 4)}`
  ]);
  assert.ok(result.events[0].moves.every((move) => move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testOccupiedMovingResidentBlocksGroupMerge() {
  const preset = {
    id: 'occupied-resident',
    label: 'occupied-resident',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'occupied resident',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 1, col: 2, dir: game.DIRS.N },
        second: { row: 1, col: 3, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 2, 4),
    box(2, 1, 3, 2),
    box(3, 2, 3, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:4', '1,3:2', '2,3:4']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId).sort(), [1, 2, 3]);
  assert.ok(!result.events.some((event) => event.kind === 'merge'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testVacatingResidentSurvivesIncomingExplosion() {
  const preset = {
    id: 'vacating-resident-explosion',
    label: 'vacating-resident-explosion',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'vacating resident explosion',
    removedTiles: [
      { row: 1, col: 4 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 4, col: 4 }
    ],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 4, col: 3, dir: game.DIRS.S },
        second: { row: 2, col: 1, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(22, 1, 1, 2),
    box(21, 2, 1, 4),
    box(16, 4, 3, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['4,1:4']);
  assert.ok(result.state.removed.has(game.indexOf(2, 1, 4)));
  assert.strictEqual(result.state.removed.has(game.indexOf(3, 1, 4)), false);
  const impactGroup = result.events.find((event) => event.kind === 'moveGroup' && event.explosions && event.explosions.length);
  assert.ok(impactGroup);
  assert.strictEqual(impactGroup.explosions[0].value, 2);
  assert.deepStrictEqual(impactGroup.explosions[0].moves.map((move) => move.boxId).sort((a, b) => a - b), [16, 22]);
  assert.ok(!result.events.some((event) => event.kind === 'explode' && event.value === 2));
  const explosionRemoval = result.events.find((event) => event.kind === 'removeTile' && event.index === game.indexOf(2, 1, 4));
  assert.ok(explosionRemoval);
  assert.deepStrictEqual(explosionRemoval.removeBoxIds.sort((a, b) => a - b), [16, 22]);
  assert.ok(!result.events.some((event) => event.kind === 'bounceGroup'));
}

function testBlockedResidentPreventsGroupExplosion() {
  const preset = {
    id: 'blocked-resident-mixed',
    label: 'blocked-resident-mixed',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'blocked resident mixed',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 2, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 4, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 3, 4),
    box(2, 2, 4, 2),
    box(3, 1, 4, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:8', '2,4:2']);
  const merge = result.events.find((event) => event.kind === 'merge');
  assert.ok(merge);
  assert.strictEqual(merge.boxId, 3);
  assert.deepStrictEqual(merge.removeBoxIds, [1]);
  assert.strictEqual(merge.newValue, 8);
  const bounce = result.events.find((event) => event.kind === 'bounceGroup');
  assert.ok(bounce);
  assert.deepStrictEqual(bounce.moves.map((move) => move.boxId), [2]);
  assert.ok(bounce.moves.every((move) => move.to === game.indexOf(1, 4, 4)));
  assert.ok(bounce.moves[0].glued);
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
  assert.ok(!result.events.some((event) => event.kind === 'removeTile'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testSameValueGroupMergesThroughVacatingResident() {
  const preset = {
    id: 'vacating-resident-merge',
    label: 'vacating-resident-merge',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'vacating resident merge',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 3, col: 3, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 2, 1, 4, 3),
    box(2, 2, 2, 2, 3),
    box(3, 3, 3, 4, 3)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state, 3), ['2,2:8', '2,3:2']);
  const merge = result.events.find((event) => event.kind === 'merge');
  assert.ok(merge);
  assert.strictEqual(merge.targetBoxId, null);
  assert.deepStrictEqual(merge.moves.map((move) => move.boxId).sort((a, b) => a - b), [1, 3]);
  assert.ok(!result.events.some((event) => event.kind === 'bounceGroup'));
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
}

function testStackedTileDoesNotExposeHiddenMerge() {
  const preset = {
    id: 'stacked-hidden-merge',
    label: 'stacked-hidden-merge',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'stacked hidden merge',
    removedTiles: [{ row: 4, col: 1 }],
    cutEdges: [],
    gluedEdges: []
  };
  const state = stateWithBoxes(preset, [
    box(71, 1, 1, 2),
    box(41, 2, 1, 16),
    box(43, 2, 1, 8),
    box(55, 2, 1, 4),
    box(70, 2, 1, 2),
    box(67, 3, 1, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '2,1:16', '2,1:2', '2,1:4', '2,1:8', '3,1:8']);
  assert.ok(!result.events.some((event) => event.kind === 'merge'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
  assert.ok(result.events.every((event) => event.kind === 'bounceGroup'));
}

function testMoveIntoBouncingResidentDoesNotStack() {
  const preset = {
    id: 'bouncing-resident-target',
    label: 'bouncing-resident-target',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'bouncing resident target',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(8, 1, 2, 2),
    box(20, 1, 3, 2),
    box(6, 2, 2, 4),
    box(16, 2, 4, 4),
    box(13, 3, 2, 2),
    box(18, 3, 3, 2),
    box(14, 4, 1, 4),
    box(10, 4, 3, 4),
    box(19, 4, 4, 2)
  ]);
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,3:4', '2,4:8', '3,3:4', '4,1:4', '4,3:4', '4,4:2']);
  const indices = result.state.boxes.map((item) => item.index);
  assert.strictEqual(indices.length, new Set(indices).size);
  const mixedGroup = result.events.find((event) => event.kind === 'moveGroup' && event.bounces.some((move) => move.boxId === 10));
  assert.ok(mixedGroup);
  const blockedMove = mixedGroup.bounces.find((move) => move.boxId === 10);
  assert.strictEqual(blockedMove.from, game.indexOf(4, 3, 4));
  assert.strictEqual(blockedMove.to, game.indexOf(4, 4, 4));
  assert.strictEqual(blockedMove.value, 4);
}

function testMoveIntoLaterBouncingResidentDoesNotStack() {
  const preset = {
    id: 'later-bouncing-resident-target',
    label: 'later-bouncing-resident-target',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'later bouncing resident target',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(33, 1, 1, 8),
    box(32, 1, 2, 2),
    box(28, 1, 3, 4),
    box(34, 2, 2, 2),
    box(26, 2, 3, 16),
    box(27, 2, 4, 2),
    box(14, 3, 1, 4),
    box(31, 3, 2, 2),
    box(18, 3, 3, 16),
    box(30, 4, 1, 2),
    box(24, 4, 4, 8)
  ]);
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: false });
  assert.strictEqual(result.changed, true);
  const indices = result.state.boxes.map((item) => item.index);
  assert.strictEqual(indices.length, new Set(indices).size);
  const mixedGroup = result.events.find((event) => event.kind === 'moveGroup' && event.bounces.some((move) => move.boxId === 18));
  assert.ok(mixedGroup);
  const blockedMove = mixedGroup.bounces.find((move) => move.boxId === 18);
  assert.strictEqual(blockedMove.from, game.indexOf(3, 3, 4));
  assert.strictEqual(blockedMove.to, game.indexOf(2, 3, 4));
  assert.strictEqual(blockedMove.value, 16);
}

function testBounceOnlyDirectionsDoNotPreventGameOver() {
  const preset = {
    id: 'bounce-only-terminal',
    label: 'bounce-only-terminal',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'bounce only terminal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(49, 1, 1, 2),
    box(24, 1, 2, 16),
    box(54, 1, 3, 4),
    box(55, 2, 2, 2),
    box(45, 2, 3, 8),
    box(52, 2, 4, 4),
    box(56, 3, 1, 8),
    box(36, 3, 2, 32),
    box(50, 3, 3, 4),
    box(57, 4, 1, 2),
    box(53, 4, 3, 2),
    box(26, 4, 4, 32)
  ]);
  state.score = 312;
  state.nextBoxId = 58;
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const results = Object.values(game.DIRS).map((dir) => game.simulateRound(state, dir, { spawn: false }));
  assert.ok(results.every((result) => result.changed === false));
  assert.ok(results.some((result) => result.events.some((event) => event.kind === 'bounceGroup')));
  assert.strictEqual(game.isGameOver(state), true);
}

function testBlockedResidentWithSuccessorPreventsGroupExplosion() {
  const preset = {
    id: 'blocked-chain-resident',
    label: 'blocked-chain-resident',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'blocked chain resident',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 3, col: 4, dir: game.DIRS.E },
        second: { row: 4, col: 3, dir: game.DIRS.S }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(7, 4, 2, 32),
    box(9, 3, 4, 2),
    box(8, 4, 3, 4),
    box(6, 4, 4, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['3,4:2', '4,2:32', '4,3:4', '4,4:8']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId).sort((a, b) => a - b), [7, 9]);
  assert.ok(result.events[0].moves.some((move) => move.boxId === 9 && move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
  assert.ok(!result.events.some((event) => event.kind === 'removeTile'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testMoveEventsAreGroupedByTick() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const groups = result.events.filter((event) => event.kind === 'moveGroup');
  assert.ok(groups.length >= 1);
  assert.strictEqual(groups[0].moves.length, 2);
  assert.ok(!result.events.some((event) => event.kind === 'move'));
  groups[0].moves.forEach((move) => {
    assert.ok(Number.isInteger(move.from));
    assert.ok(Number.isInteger(move.to));
    assert.ok(Number.isFinite(move.value));
  });
}

function testBouncesAndMovesShareTickAnimation() {
  const preset = {
    id: 'mixed-bounce-move-tick',
    label: 'mixed-bounce-move-tick',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'mixed bounce move tick',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 4, col: 1, dir: game.DIRS.S },
        second: { row: 4, col: 3, dir: game.DIRS.S }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(16, 4, 1, 2),
    box(25, 4, 3, 2),
    box(27, 3, 3, 2),
    box(22, 2, 2, 16)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.events[0].kind, 'moveGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId), [22]);
  assert.deepStrictEqual(result.events[0].bounces.map((move) => move.boxId).sort((a, b) => a - b), [16, 25, 27]);
  assert.ok(result.events[0].bounces.some((move) => move.boxId === 16 && move.glued));
  assert.ok(!result.events[0].explosions.length);
}

function testGluedBoxRejoinsNextMovementStep() {
  const state = stateWithBoxes('torus', [
    box(1, 1, 4, 2),
    box(2, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const groups = result.events.filter((event) => event.kind === 'moveGroup');
  assert.ok(groups.length >= 2);
  assert.deepStrictEqual(groups[0].moves.map((move) => move.boxId).sort(), [1, 2]);
  assert.deepStrictEqual(groups[1].moves.map((move) => move.boxId).sort(), [1, 2]);
  const gluedMove = groups[0].moves.find((move) => move.boxId === 1);
  assert.strictEqual(gluedMove.glued, true);
  assert.strictEqual(gluedMove.edge.dir, game.DIRS.E);
  assert.strictEqual(gluedMove.dir, game.DIRS.E);
  assert.ok(groups[1].moves.some((move) => move.boxId === 1 && move.from === game.indexOf(1, 1, 4) && move.to === game.indexOf(1, 2, 4)));
}

function testGluedMergeCarriesPortalAnimationMove() {
  const preset = {
    id: 'glued-merge-test',
    label: 'glued-merge-test',
    rows: 1,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 2, dir: game.DIRS.E },
        second: { row: 1, col: 1, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(1, 2, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 1, 2), value: 2 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const merge = result.events.find((event) => event.kind === 'merge');
  assert.ok(merge);
  assert.strictEqual(merge.newValue, 4);
  assert.strictEqual(merge.moves.length, 1);
  assert.strictEqual(merge.moves[0].glued, true);
  assert.strictEqual(merge.moves[0].from, game.indexOf(1, 2, 2));
  assert.strictEqual(merge.moves[0].to, game.indexOf(1, 1, 2));
  assert.strictEqual(merge.moves[0].edge.dir, game.DIRS.E);
  assert.strictEqual(merge.moves[0].dir, game.DIRS.E);
}

function pushTurnPreset(rows = 2) {
  return {
    id: 'push-turn-test',
    label: 'push-turn-test',
    rows,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 1, dir: game.DIRS.E },
        second: { row: 1, col: 2, dir: game.DIRS.N }
      }
    ]
  };
}

function testStoppedBlockerCanBePushedAfterGlue() {
  const state = game.createGameState(pushTurnPreset());
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:2', '2,2:4']);
  const firstGroup = result.events.find((event) => event.kind === 'moveGroup');
  assert.ok(firstGroup);
  assert.strictEqual(firstGroup.moves.length, 2);
}

function testPushedBlockCanMerge() {
  const state = game.createGameState(pushTurnPreset());
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 },
    { id: 3, index: game.indexOf(2, 2, 2), value: 4 }
  ];
  state.nextBoxId = 4;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:2', '2,2:8']);
  assert.strictEqual(result.state.score, 8);
  assert.ok(result.events.some((event) => event.kind === 'merge' && event.newValue === 8));
}

function testPushChainLimitDebug() {
  const rows = 53;
  const state = game.createGameState(pushTurnPreset(rows));
  state.boxes = [{ id: 1, index: game.indexOf(1, 1, 2), value: 2 }];
  for (let row = 1; row <= rows; row += 1) {
    state.boxes.push({ id: row + 1, index: game.indexOf(row, 2, 2), value: 100 + row });
  }
  state.nextBoxId = rows + 2;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.debugMessages.length, 1);
  assert.ok(result.debugMessages[0].includes('push-chain debug'));
  assert.ok(result.events.some((event) => event.kind === 'debug'));
}

function testPushLoopBreaksWhenItReturnsToActorDirection() {
  const preset = pushTurnPreset();
  preset.gluedEdges.push({
    group: 1,
    first: { row: 2, col: 2, dir: game.DIRS.S },
    second: { row: 1, col: 1, dir: game.DIRS.W }
  });
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 },
    { id: 3, index: game.indexOf(2, 2, 2), value: 8 }
  ];
  state.nextBoxId = 4;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const firstGroup = result.events.find((event) => event.kind === 'moveGroup');
  assert.ok(firstGroup);
  assert.strictEqual(firstGroup.moves.length, 3);
  assert.deepStrictEqual(
    firstGroup.moves.map((move) => `${move.boxId}:${move.from}>${move.to}`).sort(),
    ['1:0>1', '2:1>3', '3:3>0']
  );
}

function testTorusGlueLoopExplosion() {
  const state = stateWithBoxes('torus', [box(1, 1, 1, 2)]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.ok(result.state.removed.has(game.indexOf(1, 4, 4)));
  assert.ok(result.events.some((event) => event.kind === 'explode'));
}

function testKleinAndRamifiedSuccessors() {
  const klein = game.createGameState('klein-bottle');
  const kleinStep = game.surfaceSuccessor(klein, game.indexOf(1, 4, 4), game.DIRS.E);
  assert.strictEqual(kleinStep.kind, 'glued');
  assert.strictEqual(kleinStep.index, game.indexOf(4, 1, 4));
  assert.strictEqual(kleinStep.dir, game.DIRS.E);

  const ramified = game.createGameState('ramified-cover');
  const ramifiedStep = game.surfaceSuccessor(ramified, game.indexOf(2, 3, 9), game.DIRS.S);
  assert.strictEqual(ramifiedStep.kind, 'glued');
  assert.strictEqual(ramifiedStep.index, game.indexOf(3, 9, 9));
  assert.strictEqual(ramifiedStep.dir, game.DIRS.S);
}

function testGenus2PresetFromExport() {
  const state = game.createGameState('genus-2');
  assert.strictEqual(state.preset.gluedEdges.length, 8);
  assert.strictEqual(state.preset.lattice, 'square');

  const eastToNorth = game.surfaceSuccessor(state, game.indexOf(4, 4, 4), game.DIRS.E);
  assert.strictEqual(eastToNorth.kind, 'glued');
  assert.strictEqual(eastToNorth.index, game.indexOf(1, 3, 4));
  assert.strictEqual(eastToNorth.dir, game.DIRS.S);

  const northToWest = game.surfaceSuccessor(state, game.indexOf(1, 2, 4), game.DIRS.N);
  assert.strictEqual(northToWest.kind, 'glued');
  assert.strictEqual(northToWest.index, game.indexOf(4, 1, 4));
  assert.strictEqual(northToWest.dir, game.DIRS.E);
}

function squareBoundaryKeys(rows = 4, cols = 4) {
  const keys = new Set();
  for (let col = 1; col <= cols; col += 1) {
    keys.add(`${game.indexOf(1, col, cols)}:${game.DIRS.N}`);
    keys.add(`${game.indexOf(rows, col, cols)}:${game.DIRS.S}`);
  }
  for (let row = 1; row <= rows; row += 1) {
    keys.add(`${game.indexOf(row, 1, cols)}:${game.DIRS.W}`);
    keys.add(`${game.indexOf(row, cols, cols)}:${game.DIRS.E}`);
  }
  return keys;
}

function gluedBoundaryKeys(preset) {
  const keys = new Set();
  preset.gluedEdges.forEach((pair) => {
    keys.add(`${game.indexOf(pair.first.row, pair.first.col, preset.cols)}:${pair.first.dir}`);
    keys.add(`${game.indexOf(pair.second.row, pair.second.col, preset.cols)}:${pair.second.dir}`);
  });
  return keys;
}

function testRandomGluePresetCoversBoundary() {
  const rng = game.createRng([0.97, 0.13, 0.53, 0.29, 0.71, 0.41, 0.19]);
  const state = game.createGameState('random-glue-4x4', { glueRng: rng });
  assert.strictEqual(state.preset.gluedEdges.length, 8);
  assert.deepStrictEqual(gluedBoundaryKeys(state.preset), squareBoundaryKeys());
}

function testRandomGluePresetIsDeterministicWithGlueRng() {
  const sequence = [0.8, 0.1, 0.6, 0.3, 0.95, 0.2];
  const first = game.createGameState('random-glue-4x4', { glueRng: game.createRng(sequence) });
  const second = game.createGameState('random-glue-4x4', { glueRng: game.createRng(sequence) });
  assert.deepStrictEqual(first.preset.gluedEdges, second.preset.gluedEdges);
  assert.strictEqual(game.PRESETS.find((preset) => preset.id === 'random-glue-4x4').gluedEdges.length, 0);
}

function testHexClassicPreset() {
  const state = game.createGameState('hex-classic-4x4');
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.strictEqual(game.latticeForPreset(state.preset).sides, 6);
  assert.strictEqual(game.emptyExistingIndices(state).length, 16);
  assert.strictEqual(state.preset.gluedEdges.length, 0);
  assert.strictEqual(game.countUnmatchedBoundaries(state.preset, state.removed), 30);
}

function testHexClassicSuccessors() {
  const state = game.createGameState('hex-classic-4x4');
  const center = game.indexOf(2, 2, 4);
  const expected = [
    [game.HEX_DIRS.E, 2, 3],
    [game.HEX_DIRS.SE, 3, 3],
    [game.HEX_DIRS.SW, 3, 2],
    [game.HEX_DIRS.W, 2, 1],
    [game.HEX_DIRS.NW, 1, 2],
    [game.HEX_DIRS.NE, 1, 3]
  ];
  expected.forEach(([dir, row, col]) => {
    const step = game.surfaceSuccessor(state, center, dir);
    assert.strictEqual(step.kind, 'direct');
    assert.strictEqual(step.index, game.indexOf(row, col, 4));
  });
}

function testHexKeyboardMapping() {
  const preset = game.createGameState('hex-classic-4x4').preset;
  assert.strictEqual(game.dirFromKey('KeyW', preset), game.HEX_DIRS.NW);
  assert.strictEqual(game.dirFromKey('KeyE', preset), game.HEX_DIRS.NE);
  assert.strictEqual(game.dirFromKey('KeyA', preset), game.HEX_DIRS.W);
  assert.strictEqual(game.dirFromKey('KeyD', preset), game.HEX_DIRS.E);
  assert.strictEqual(game.dirFromKey('KeyZ', preset), game.HEX_DIRS.SW);
  assert.strictEqual(game.dirFromKey('KeyX', preset), game.HEX_DIRS.SE);
  assert.strictEqual(game.dirFromKey('w', preset), game.HEX_DIRS.NW);
}

function testHexMovePadUsesArrowGlyphs() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('--hex-move-size: 46px;'));
  assert.ok(html.includes('--hex-row-offset: 26px;'));
  assert.ok(html.includes('width: var(--hex-pad-width);'));
  assert.ok(html.includes('left: var(--hex-row-offset);'));
  assert.ok(html.includes('position: relative;'));
  assert.ok(html.includes('.hex-move-pad [data-move-dir="E"] { grid-column: 3; grid-row: 2; }'));
  assert.ok(html.includes('data-move-dir="NW" aria-label="Move northwest" title="Move northwest (W)">&#x2196;</button>'));
  assert.ok(html.includes('data-move-dir="NE" aria-label="Move northeast" title="Move northeast (E)">&#x2197;</button>'));
  assert.ok(html.includes('data-move-dir="W" aria-label="Move west" title="Move west (A)">&#x2190;</button>'));
  assert.ok(html.includes('data-move-dir="E" aria-label="Move east" title="Move east (D)">&#x2192;</button>'));
  assert.ok(html.includes('data-move-dir="SW" aria-label="Move southwest" title="Move southwest (Z)">&#x2199;</button>'));
  assert.ok(html.includes('data-move-dir="SE" aria-label="Move southeast" title="Move southeast (X)">&#x2198;</button>'));
}

function testMosaicBackgroundExportAndMinigameImportControlsExist() {
  const minigameHtml = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const mosaicHtml = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  assert.ok(minigameHtml.includes('id="import-preset-toggle"'));
  assert.ok(minigameHtml.includes('id="import-preset-input"'));
  assert.ok(minigameHtml.includes('id="apply-import-preset"'));
  assert.ok(minigameHtml.includes('id="import-state"'));
  assert.ok(!minigameHtml.includes('id="debug-export-output" readonly'));
  assert.ok(minigameHtml.includes('<div class="mosaic-debug-step-row">'));
  assert.ok(minigameHtml.includes('<option value="">empty</option>'));
  assert.ok(mosaicHtml.includes('id="export-background-preset"'));
}

function testPresetFromMosaicBackgroundExport() {
  const payload = {
    schema: 'ramified-minigame-background-preset',
    version: 1,
    preset: {
      id: 'custom-square',
      label: 'custom square',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'M_1',
      removedTiles: [{ index: 0 }],
      cutEdges: [{ left: { row: 2, col: 2 }, right: { row: 2, col: 3 } }],
      gluedEdges: [
        {
          group: 5,
          orientation: 'reversed',
          first: { row: 1, col: 4, edge: 'E' },
          second: { row: 4, col: 1, dir: game.DIRS.W }
        }
      ]
    }
  };
  const preset = game.presetFromImportPayload(payload);
  assert.strictEqual(preset.id, 'imported-preset');
  assert.strictEqual(preset.sourceId, 'custom-square');
  assert.strictEqual(preset.label, 'custom square');
  assert.strictEqual(preset.lattice, 'square');
  assert.deepStrictEqual(preset.removedTiles, [{ row: 1, col: 1 }]);
  assert.deepStrictEqual(preset.cutEdges, [{ left: { row: 2, col: 2 }, right: { row: 2, col: 3 } }]);
  assert.strictEqual(preset.gluedEdges.length, 1);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.DIRS.E);
  assert.strictEqual(preset.gluedEdges[0].second.dir, game.DIRS.W);
  assert.strictEqual(preset.gluedEdges[0].reversed, true);
  const state = game.createGameState(preset);
  assert.strictEqual(state.removed.size, 1);
}

function testPresetFromFullMosaicCalculatorExport() {
  const preset = game.presetFromImportText(JSON.stringify({
    name: 'Mosaic Calculator',
    lattice: 'hexagonal',
    rows: 3,
    cols: 3,
    backgroundSpace: { surfaceType: 'hex disk' },
    removedTiles: [{ row: 2, col: 2 }],
    gluedEdges: [
      {
        first: { row: 1, col: 1, edge: 'NW' },
        second: { row: 3, col: 3, edge: 'SE' }
      }
    ]
  }));
  assert.strictEqual(preset.lattice, 'hexagonal');
  assert.strictEqual(preset.surface, 'hex disk');
  assert.deepStrictEqual(preset.removedTiles, [{ row: 2, col: 2 }]);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.HEX_DIRS.NW);
  assert.strictEqual(preset.gluedEdges[0].second.dir, game.HEX_DIRS.SE);
}

function testSpeedControlDefaults() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="animation-speed" min="40" max="400" step="20" value="80"'));
  assert.ok(html.includes('<output id="animation-speed-value">80 ms</output>'));
}

function testStationaryDifferentBlocks() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: false });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:4']);
}

function testSimultaneousDifferentExplosion() {
  const preset = {
    id: 'collision-test',
    label: 'collision-test',
    rows: 2,
    cols: 3,
    surface: 'test',
    removedTiles: [{ row: 1, col: 3 }],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 2, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(2, 1, 3), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 3), value: 4 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.ok(result.state.removed.has(game.indexOf(2, 2, 3)));
  const impactGroup = result.events.find((event) => event.kind === 'moveGroup' && event.explosions && event.explosions.length);
  assert.ok(impactGroup);
  const explosion = impactGroup.explosions.find((event) => event.value === 2);
  assert.ok(explosion);
  assert.deepStrictEqual(explosion.removeBoxIds.sort((a, b) => a - b), [1, 2]);
  assert.deepStrictEqual(explosion.moves.map((move) => move.boxId).sort((a, b) => a - b), [1, 2]);
  assert.ok(explosion.moves.some((move) => move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'explode' && event.value === 2));
}

function testLargeExplosionClearsSurfaceNeighbors() {
  const preset = {
    id: 'large-blast-test',
    label: 'large-blast-test',
    rows: 3,
    cols: 3,
    surface: 'test',
    removedTiles: [{ row: 1, col: 3 }, { row: 3, col: 3 }],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 3, col: 2, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(2, 1, 3), value: 128 },
    { id: 2, index: game.indexOf(3, 2, 3), value: 256 },
    { id: 3, index: game.indexOf(1, 2, 3), value: 4 },
    { id: 4, index: game.indexOf(2, 3, 3), value: 8 }
  ];
  state.nextBoxId = 5;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.ok(result.state.removed.has(game.indexOf(2, 2, 3)));
  assert.deepStrictEqual(result.state.boxes, []);
  const clear = result.events.find((event) => event.kind === 'clearNumbers');
  assert.ok(clear);
  assert.ok(clear.indices.includes(game.indexOf(1, 2, 3)));
  assert.ok(clear.indices.includes(game.indexOf(2, 3, 3)));
  assert.ok(!result.state.removed.has(game.indexOf(1, 2, 3)));
  assert.ok(!result.state.removed.has(game.indexOf(2, 3, 3)));
}

function testSpawnAfterValidRound() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2)
  ]);
  const rng = game.createRng([0, 0.9999, 0, 0.9992]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: true, rng });
  const spawnEvents = result.events.filter((event) => event.kind === 'spawn');
  assert.strictEqual(spawnEvents.length, 2);
  assert.deepStrictEqual(spawnEvents.map((event) => event.value), [32, 16]);
}

function makeElement(id, extra = {}) {
  const classes = new Set();
  return {
    id,
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    attributes: {},
    textContent: '',
    style: {},
    clientWidth: 720,
    parentElement: null,
    listeners: {},
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : !!force;
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    focus() {},
    select() {},
    ...extra
  };
}

function makeMoveButton(dir) {
  return makeElement(`move-${dir}`, {
    getAttribute(name) {
      return name === 'data-move-dir' ? dir : null;
    }
  });
}

function testHeadlessDomStepControls() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const elements = new Map();
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      target[prop] = (...args) => {
        calls.push({ method: prop, args });
      };
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
  const wrap = makeElement('canvas-wrap', { clientWidth: 720 });
  const moveButtons = [makeMoveButton('N'), makeMoveButton('W'), makeMoveButton('E'), makeMoveButton('S')];
  const canvas = makeElement('mosaic-canvas', {
    parentElement: wrap,
    getContext() {
      return ctx;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 288, height: 288 };
    }
  });
  [
    canvas,
    makeElement('surface-preset-select', { value: 'torus' }),
    makeElement('import-preset-toggle'),
    makeElement('import-preset-tools', { hidden: true }),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('begin-game'),
    makeElement('animation-speed', { value: '80' }),
    makeElement('animation-speed-value'),
    makeElement('step-mode', { checked: true }),
    makeElement('next-step'),
    makeElement('debug-toggle'),
    makeElement('debug-tools'),
    makeElement('debug-tile-value', { value: '128' }),
    makeElement('undo-step'),
    makeElement('export-state'),
    makeElement('import-state'),
    makeElement('debug-export-output'),
    makeElement('status-badge'),
    makeElement('status-line'),
    makeElement('info-line'),
    makeElement('score-value'),
    makeElement('highest-tile-value'),
    makeElement('existing-tile-value'),
    makeElement('removed-tile-value'),
    makeElement('round-value')
  ].forEach((element) => elements.set(element.id, element));
  moveButtons.forEach((button) => elements.set(button.id, button));

  const documentListeners = {};
  const windowListeners = {};
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Math: Object.create(Math),
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    document: {
      getElementById(id) {
        return elements.get(id) || null;
      },
      addEventListener(type, handler) {
        documentListeners[type] = handler;
        if (type === 'DOMContentLoaded') handler();
      },
      querySelectorAll(selector) {
        return selector === '[data-move-dir]' ? moveButtons : [];
      }
    },
    window: {
      devicePixelRatio: 1,
      addEventListener(type, handler) {
        windowListeners[type] = handler;
      },
      requestAnimationFrame(handler) {
        calls.push({ method: 'requestAnimationFrame', args: [] });
        return 1;
      },
      cancelAnimationFrame() {}
    }
  };
  let randoms = [0, 0.1, 0.2, 0.1];
  context.Math.random = () => (randoms.length ? randoms.shift() : 0.1);
  vm.runInNewContext(source, context);

  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '2');
  assert.strictEqual(moveButtons.some((button) => button.disabled), false);

  elements.get('debug-toggle').listeners.click();
  assert.strictEqual(elements.get('debug-tools').hidden, false);
  assert.strictEqual(elements.get('debug-toggle').attributes['aria-pressed'], 'true');
  assert.strictEqual(elements.get('import-state').disabled, false);

  elements.get('debug-tile-value').value = '1';
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('status-line').textContent, 'debug value rejected');
  assert.strictEqual(elements.get('undo-step').disabled, true);

  elements.get('debug-tile-value').value = '128';
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.debugMode, true);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 128);
  assert.strictEqual(elements.get('undo-step').disabled, false);

  elements.get('debug-tile-value').value = '';
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(elements.get('status-line').textContent, 'debug: r1 c1 = empty');
  assert.strictEqual(exported.boxes.some((item) => item.row === 1 && item.col === 1), false);

  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 128);

  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 2);

  let preventedRepeat = false;
  documentListeners.keydown({
    key: 'ArrowRight',
    repeat: true,
    preventDefault() {
      preventedRepeat = true;
    }
  });
  assert.strictEqual(preventedRepeat, true);
  assert.strictEqual(elements.get('round-value').textContent, '0');

  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'E').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'step');
  assert.strictEqual(elements.get('next-step').disabled, false);
  assert.strictEqual(moveButtons.every((button) => button.disabled), true);
  assert.strictEqual(elements.get('animation-speed-value').textContent, '80 ms');

  elements.get('import-preset-toggle').listeners.click();
  assert.strictEqual(elements.get('import-preset-tools').hidden, false);
  elements.get('import-preset-input').value = JSON.stringify({
    schema: 'ramified-minigame-background-preset',
    preset: {
      label: 'tiny import',
      lattice: 'square',
      rows: 2,
      cols: 2,
      removedTiles: [{ row: 1, col: 1 }],
      gluedEdges: [
        { first: { row: 1, col: 2, edge: 'E' }, second: { row: 2, col: 1, edge: 'W' } }
      ]
    }
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '3');
  assert.strictEqual(elements.get('import-preset-tools').hidden, true);

  elements.get('debug-export-output').value = JSON.stringify({
    preset: {
      label: 'status import',
      lattice: 'square',
      rows: 2,
      cols: 2,
      surface: 'debug status'
    },
    phase: 'ready',
    round: 7,
    score: 12,
    nextBoxId: 5,
    boxes: [
      { id: 1, row: 1, col: 1, value: 2 },
      { id: 2, row: 1, col: 1, value: 4 },
      { id: 3, row: 1, col: 2, value: 8 }
    ],
    removed: [{ row: 2, col: 2 }],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.ok(elements.get('info-line').textContent.includes('warning: 2 stacked boxes'));
  assert.strictEqual(elements.get('round-value').textContent, '7');
  assert.strictEqual(elements.get('score-value').textContent, '12');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.warnings[0].kind, 'stacked-boxes');
  assert.strictEqual(exported.boxes.length, 3);

  elements.get('debug-export-output').value = JSON.stringify({
    preset: {
      label: 'bonus ending import',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'full blocked grid'
    },
    phase: 'ready',
    round: 11,
    score: 20,
    nextBoxId: 17,
    boxes: Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4) + 1;
      const col = (index % 4) + 1;
      return { id: index + 1, row, col, value: (row + col) % 2 ? 2 : 4 };
    }),
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  ['N', 'W', 'E'].forEach((dir, index) => {
    moveButtons.find((button) => button.getAttribute('data-move-dir') === dir).listeners.click();
    assert.strictEqual(elements.get('status-line').textContent, 'no move');
    assert.strictEqual(elements.get('info-line').textContent, `${index + 1}/4 directions unchanged`);
  });
  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'S').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'bonus ending');
  assert.strictEqual(elements.get('info-line').textContent, 'all 4 directions unchanged');
  assert.strictEqual(elements.get('status-badge').textContent, 'over');
  assert.ok(moveButtons.every((button) => button.disabled));
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.ending, 'bonus');
}

function run() {
  testInitialSpawnWeights();
  testRoundSpawnWeights();
  testNoSpawnAfterNoop();
  testGameOverWhenFullAndBlocked();
  testOrdinaryMergeOnce();
  testNewlyMergedTileBlocksLaterPush();
  testFaceToFaceSwapBouncesWithoutMoving();
  testOccupiedMovingResidentBlocksGroupMerge();
  testVacatingResidentSurvivesIncomingExplosion();
  testBlockedResidentPreventsGroupExplosion();
  testSameValueGroupMergesThroughVacatingResident();
  testStackedTileDoesNotExposeHiddenMerge();
  testMoveIntoBouncingResidentDoesNotStack();
  testMoveIntoLaterBouncingResidentDoesNotStack();
  testBounceOnlyDirectionsDoNotPreventGameOver();
  testBlockedResidentWithSuccessorPreventsGroupExplosion();
  testMoveEventsAreGroupedByTick();
  testBouncesAndMovesShareTickAnimation();
  testGluedBoxRejoinsNextMovementStep();
  testGluedMergeCarriesPortalAnimationMove();
  testStoppedBlockerCanBePushedAfterGlue();
  testPushedBlockCanMerge();
  testPushChainLimitDebug();
  testPushLoopBreaksWhenItReturnsToActorDirection();
  testTorusGlueLoopExplosion();
  testKleinAndRamifiedSuccessors();
  testGenus2PresetFromExport();
  testRandomGluePresetCoversBoundary();
  testRandomGluePresetIsDeterministicWithGlueRng();
  testHexClassicPreset();
  testHexClassicSuccessors();
  testHexKeyboardMapping();
  testHexMovePadUsesArrowGlyphs();
  testMosaicBackgroundExportAndMinigameImportControlsExist();
  testPresetFromMosaicBackgroundExport();
  testPresetFromFullMosaicCalculatorExport();
  testSpeedControlDefaults();
  testStationaryDifferentBlocks();
  testSimultaneousDifferentExplosion();
  testLargeExplosionClearsSurfaceNeighbors();
  testSpawnAfterValidRound();
  testHeadlessDomStepControls();
  console.log('ramified_minigames_setup_test: all tests passed');
}

run();
