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

function stonesAt(state, cols = state.preset.cols) {
  return state.stones
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.color}`;
    })
    .sort();
}

function tokensAt(state, cols = state.preset.cols) {
  return state.tokens
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.color}`;
    })
    .sort();
}

function stackedTileSummaries(state) {
  const groups = new Map();
  state.boxes.forEach((item) => {
    const boxes = groups.get(item.index) || [];
    boxes.push(`${item.id}:${item.value}`);
    groups.set(item.index, boxes);
  });
  return Array.from(groups.entries())
    .filter((entry) => entry[1].length > 1)
    .map((entry) => `${entry[0]}=${entry[1].join('/')}`)
    .sort();
}

function allMergeEvents(events) {
  return events.flatMap((event) => {
    if (event.kind === 'merge') return [event];
    if (event.kind !== 'moveGroup') return [];
    return (event.merges || []).concat(event.postMerges || []);
  });
}

function allBounceMoves(events) {
  return events.flatMap((event) => {
    if (event.kind === 'bounceGroup') return event.moves || [];
    if (event.kind === 'moveGroup') return event.bounces || [];
    return [];
  });
}

function gluedEdgeSignature(edge) {
  return `${edge.group}:${edge.first.row},${edge.first.col},${edge.first.dir}>${edge.second.row},${edge.second.col},${edge.second.dir}`;
}

function assertLineMatchesEitherDirection(actual, expected) {
  assert.ok(Array.isArray(actual));
  const reversed = expected.slice().reverse();
  assert.ok(
    actual.length === expected.length
      && (actual.every((value, index) => value === expected[index])
        || actual.every((value, index) => value === reversed[index])),
    `expected ${actual.join(',')} to match ${expected.join(',')} in either direction`
  );
}

function squareTestGeometry(rows, cols, size = 10) {
  const cells = [];
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      cells[game.indexOf(row, col, cols)] = {
        row,
        col,
        x: ((col - 0.5) * size),
        y: ((row - 0.5) * size)
      };
    }
  }
  return {
    rows,
    cols,
    width: cols * size,
    height: rows * size,
    radius: size / 2,
    size,
    lattice: game.LATTICES.square,
    cells
  };
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
  assert.deepStrictEqual(game.stateSummary(state).newBoxIds, [1, 2]);
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
  assert.ok(!allMergeEvents(result.events).some((event) => event.newValue === 8));
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
  assert.strictEqual(allMergeEvents(result.events).length, 0);
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
  assert.strictEqual(allBounceMoves(result.events).length, 0);
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
  const merge = allMergeEvents(result.events)[0];
  assert.ok(merge);
  assert.strictEqual(merge.boxId, 3);
  assert.deepStrictEqual(merge.removeBoxIds, [1]);
  assert.strictEqual(merge.newValue, 8);
  const bounceMoves = allBounceMoves(result.events);
  assert.deepStrictEqual(bounceMoves.map((move) => move.boxId), [2]);
  assert.ok(bounceMoves.every((move) => move.to === game.indexOf(1, 4, 4)));
  assert.ok(bounceMoves[0].glued);
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
  const merge = allMergeEvents(result.events)[0];
  assert.ok(merge);
  assert.strictEqual(merge.targetBoxId, null);
  assert.deepStrictEqual(merge.moves.map((move) => move.boxId).sort((a, b) => a - b), [1, 3]);
  assert.strictEqual(allBounceMoves(result.events).length, 0);
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
  assert.strictEqual(allMergeEvents(result.events).length, 0);
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
  assert.strictEqual(game.fullBoardWithoutAdjacentMerge(state), true);
  assert.deepStrictEqual(game.explosionModeDirections(state), []);
  assert.strictEqual(game.isGameOver(state), true);
}

function testExplosionModeForFullCycleBoard() {
  const state = game.createGameState('torus');
  let id = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) {
      state.boxes.push({
        id,
        index: game.indexOf(row, col, 4),
        value: (row + col) % 2 ? 2 : 4
      });
      id += 1;
    }
  }
  state.nextBoxId = 17;
  assert.strictEqual(game.fullBoardWithoutAdjacentMerge(state), true);
  assert.deepStrictEqual(game.explosionModeDirections(state), [game.DIRS.E, game.DIRS.S, game.DIRS.W, game.DIRS.N]);
  assert.strictEqual(game.isExplosionModeActive(state), true);
  assert.strictEqual(game.isGameOver(state), false);

  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.ok(result.events.some((event) => event.kind === 'moveGroup'));
  assert.ok(result.events.some((event) => event.kind === 'explode' && event.value <= 4));
  assert.ok(result.events.some((event) => event.kind === 'removeTile'));
  const clearEvents = result.events.filter((event) => event.kind === 'clearNumbers');
  assert.ok(clearEvents.length);
  assert.ok(clearEvents.some((event) => event.removeBoxIds.length > 0));
  assert.strictEqual(result.state.boxes.length, 0);
  assert.ok(result.state.removed.size > 0);
  assert.strictEqual(game.isExplosionModeActive(result.state), false);
}

function testDownMoveAfterExplosionDoesNotStack() {
  const state = game.createGameState('torus');
  state.phase = 'ready';
  state.round = 1;
  state.boxes = [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4),
    box(3, 1, 3, 8),
    box(4, 1, 4, 16),
    box(8, 2, 1, 256),
    box(7, 2, 2, 128),
    box(6, 2, 3, 64),
    box(5, 2, 4, 32),
    box(9, 3, 4, 512),
    box(13, 4, 1, 2),
    box(12, 4, 2, 2),
    box(11, 4, 3, 2),
    box(10, 4, 4, 2)
  ];
  state.nextBoxId = 14;

  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(Array.from(result.state.removed).sort((a, b) => a - b), [
    game.indexOf(4, 1, 4),
    game.indexOf(4, 2, 4),
    game.indexOf(4, 3, 4),
    game.indexOf(4, 4, 4)
  ]);
  assert.deepStrictEqual(stackedTileSummaries(result.state), []);
  assert.ok(result.events.some((event) => (
    event.kind === 'moveGroup'
      && (event.bounces || []).some((move) => move.boxId === 5 && move.from === game.indexOf(2, 4, 4) && move.to === game.indexOf(3, 4, 4))
  )));
  assert.ok(!result.state.boxes.some((item) => result.state.removed.has(item.index)));
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

function testExplosionMoverVacatesSourceForBounceResolution() {
  const preset = {
    id: 'explosion-vacates-source',
    label: 'explosion-vacates-source',
    lattice: 'square',
    rows: 2,
    cols: 4,
    surface: 'explosion vacates source',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 1, dir: game.DIRS.W }
      },
      {
        group: 1,
        first: { row: 2, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 4),
    box(4, 1, 4, 4),
    box(5, 2, 4, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const removedBoxes = result.state.boxes.filter((item) => result.state.removed.has(item.index));
  assert.deepStrictEqual(removedBoxes, []);
  assert.ok(result.state.removed.has(game.indexOf(1, 2, 4)));
  assert.ok(!result.state.boxes.some((item) => item.id === 1 || item.id === 5));
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:8', '1,4:2']);
}

function testMergeAndMoveShareAnimationStep() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 3, 2),
    box(2, 1, 4, 2),
    box(3, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.events[0].kind, 'moveGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId), [3]);
  assert.deepStrictEqual(result.events[0].merges.map((event) => event.boxId), [2]);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:4', '2,4:4']);
  assert.strictEqual(result.state.score, 4);
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
  const merge = allMergeEvents(result.events)[0];
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
  assert.ok(allMergeEvents(result.events).some((event) => event.newValue === 8));
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
  const ramifiedStep = game.surfaceSuccessor(ramified, game.indexOf(2, 8, 9), game.DIRS.S);
  assert.strictEqual(ramifiedStep.kind, 'glued');
  assert.strictEqual(ramifiedStep.index, game.indexOf(3, 3, 9));
  assert.strictEqual(ramifiedStep.dir, game.DIRS.S);

  const ramifiedReturnStep = game.surfaceSuccessor(ramified, game.indexOf(2, 3, 9), game.DIRS.S);
  assert.strictEqual(ramifiedReturnStep.kind, 'glued');
  assert.strictEqual(ramifiedReturnStep.index, game.indexOf(3, 8, 9));
  assert.strictEqual(ramifiedReturnStep.dir, game.DIRS.S);
}

function testGlueHoverFindsMultiEdgeGroup() {
  const state = game.createGameState('ramified-cover');
  const geom = squareTestGeometry(4, 9);
  const hover = game.hoveredGlueBoundaryAtPoint(state.preset, geom, { x: 75, y: 19.8 }, { threshold: 1 });
  assert.ok(hover);
  assert.strictEqual(hover.group, 0);
  assert.strictEqual(hover.edgeKey, `${game.indexOf(2, 8, 9)}:${game.DIRS.S}`);
  assert.deepStrictEqual(Array.from(game.hoveredGlueEdgeKeys(state.preset, hover)).sort(), [
    `${game.indexOf(2, 8, 9)}:${game.DIRS.S}`,
    `${game.indexOf(2, 9, 9)}:${game.DIRS.S}`,
    `${game.indexOf(3, 3, 9)}:${game.DIRS.N}`,
    `${game.indexOf(3, 4, 9)}:${game.DIRS.N}`
  ].sort());
  assert.strictEqual(game.hoveredGlueBoundaryAtPoint(state.preset, geom, { x: 5, y: 5 }, { threshold: 1 }), null);
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

function testGomokuRandomGluePresetSize() {
  const state = game.createGomokuState('gomoku-random-glue', {
    boardSize: 9,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  assert.strictEqual(state.preset.rows, 9);
  assert.strictEqual(state.preset.cols, 9);
  assert.strictEqual(state.preset.label, 'random glue 9*9');
  assert.strictEqual(state.preset.gluedEdges.length, 18);
  assert.deepStrictEqual(gluedBoundaryKeys(state.preset), squareBoundaryKeys(9, 9));
  const base = game.PRESETS.find((preset) => preset.id === 'gomoku-random-glue');
  assert.strictEqual(base.rows, 15);
  assert.strictEqual(base.gluedEdges.length, 0);
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

function playGomokuMoves(state, moves) {
  return moves.reduce((current, move) => {
    const [row, col] = move;
    const result = game.placeGomokuStone(current, game.indexOf(row, col, current.preset.cols));
    assert.strictEqual(result.changed, true, result.message || `move ${row},${col} should be valid`);
    return result.state;
  }, state);
}

function testGomokuAlternatingPlacement() {
  let state = game.beginGomokuGame('classic-4x4');
  let result = game.placeGomokuStone(state, game.indexOf(1, 1, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.stone.color, 'black');
  assert.strictEqual(result.state.turn, 'white');
  assert.strictEqual(result.state.round, 1);
  result = game.placeGomokuStone(result.state, game.indexOf(1, 2, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.stone.color, 'white');
  assert.strictEqual(result.state.turn, 'black');
  assert.deepStrictEqual(stonesAt(result.state), ['1,1:black', '1,2:white']);
}

function testGomokuRejectsOccupiedAndRemovedTiles() {
  const preset = {
    id: 'gomoku-removed',
    label: 'gomoku removed',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [{ row: 1, col: 1 }],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginGomokuGame(preset);
  let result = game.placeGomokuStone(state, game.indexOf(1, 1, 2));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'tile is removed');
  result = game.placeGomokuStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, true);
  state = result.state;
  result = game.placeGomokuStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'tile already has a stone');
  assert.deepStrictEqual(stonesAt(state), ['1,2:black']);
}

function testGomokuSquareHorizontalWin() {
  const preset = {
    id: 'gomoku-square-win',
    label: 'gomoku square win',
    lattice: 'square',
    rows: 2,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3], [2, 3],
    [1, 4], [2, 4],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2, 3, 4]);
}

function testGomokuHexAxisWin() {
  const preset = {
    id: 'gomoku-hex-win',
    label: 'gomoku hex win',
    lattice: 'hexagonal',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [3, 1], [1, 1],
    [3, 2], [1, 2],
    [3, 3], [1, 3],
    [3, 4], [1, 4],
    [3, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(3, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(3, 4, 5),
    game.indexOf(3, 5, 5)
  ]);
}

function testGomokuSquareDiagonalWin() {
  const preset = {
    id: 'gomoku-square-diagonal-win',
    label: 'gomoku square diagonal win',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [5, 1], [1, 1],
    [4, 2], [1, 2],
    [3, 3], [1, 3],
    [2, 4], [2, 1],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(5, 1, 5),
    game.indexOf(4, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(2, 4, 5),
    game.indexOf(1, 5, 5)
  ]);
}

function testGomokuDiagonalChecksAlternateStepOrders() {
  const preset = {
    id: 'gomoku-diagonal-branch-win',
    label: 'gomoku diagonal branch win',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 2, col: 4 }, right: { row: 2, col: 5 } }],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [5, 1], [1, 1],
    [4, 2], [1, 2],
    [3, 3], [1, 3],
    [2, 4], [2, 1],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(5, 1, 5),
    game.indexOf(4, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(2, 4, 5),
    game.indexOf(1, 5, 5)
  ]);
}

function testGomokuDiagonalTransportsAfterRotatingGlue() {
  const preset = {
    id: 'gomoku-diagonal-transport-rotation',
    label: 'gomoku diagonal transport rotation',
    lattice: 'square',
    rows: 7,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 3, dir: game.DIRS.N }, second: { row: 3, col: 5, dir: game.DIRS.E } }
    ]
  };
  const state = game.createGomokuState(preset);
  const line = [
    game.indexOf(1, 3, 5),
    game.indexOf(4, 5, 5),
    game.indexOf(5, 4, 5),
    game.indexOf(6, 3, 5),
    game.indexOf(7, 2, 5)
  ];
  state.stones = line.map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  const win = game.findGomokuWin(state, line[0], 'black');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, line);

  const route = game.placementLineTransitionRoute(state, line[0], line[1]);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.N, game.DIRS.S]);
  assert.strictEqual(route.transitions[0].glued, true);
}

function testGomokuDiagonalTransportsAfterReflectingGlue() {
  const preset = {
    id: 'gomoku-diagonal-transport-reflection',
    label: 'gomoku diagonal transport reflection',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, reversed: true, first: { row: 5, col: 5, dir: game.DIRS.E }, second: { row: 5, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = game.createGomokuState(preset);
  const line = [
    game.indexOf(5, 5, 5),
    game.indexOf(4, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(2, 3, 5),
    game.indexOf(1, 4, 5)
  ];
  state.stones = line.map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  const win = game.findGomokuWin(state, line[0], 'black');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, line);

  const route = game.placementLineTransitionRoute(state, line[0], line[1]);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.E, game.DIRS.N]);
  assert.strictEqual(route.transitions[0].glued, true);
  assert.strictEqual(route.transitions[0].edge.reversed, true);
}

function testGomokuGluedEdgeWin() {
  const preset = {
    id: 'gomoku-glued-win',
    label: 'gomoku glued win',
    lattice: 'square',
    rows: 2,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 3 }, right: { row: 1, col: 4 } }],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 4, dir: game.DIRS.W } }
    ]
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3], [2, 3],
    [1, 4], [2, 4],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2, 3, 4]);
  const route = game.placementLineTransitionRoute(state, game.indexOf(1, 3, 5), game.indexOf(1, 4, 5));
  assert.ok(route);
  assert.strictEqual(route.transitions.length, 1);
  assert.strictEqual(route.transitions[0].glued, true);
  assert.deepStrictEqual(
    route.transitions.map((transition) => [transition.from, transition.to, transition.edge && transition.edge.dir]),
    [[game.indexOf(1, 3, 5), game.indexOf(1, 4, 5), game.DIRS.E]]
  );
}

function testDiagonalGluedLineUsesBoundaryCorner() {
  const preset = {
    id: 'gomoku-diagonal-glued-render',
    label: 'gomoku diagonal glued render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 1, dir: game.DIRS.N }, second: { row: 2, col: 1, dir: game.DIRS.S } }
    ]
  };
  const state = game.createGomokuState(preset);
  state.winningLine = [game.indexOf(1, 1, 2), game.indexOf(2, 2, 2)];
  const geom = {
    cols: 2,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: [
      { row: 1, col: 1, x: 0, y: 0 },
      { row: 1, col: 2, x: 10, y: 0 },
      { row: 2, col: 1, x: 0, y: 10 },
      { row: 2, col: 2, x: 10, y: 10 }
    ]
  };
  const route = game.placementLineTransitionRoute(state, game.indexOf(1, 1, 2), game.indexOf(2, 2, 2));
  assert.ok(route);
  assert.strictEqual(route.kind, 'diagonal');
  assert.strictEqual(route.transitions[0].glued, true);
  const segments = game.placementLineRenderSegments(
    state,
    geom,
    game.indexOf(1, 1, 2),
    game.indexOf(2, 2, 2)
  );
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.notStrictEqual(segments[0].end.x, 0);
}

function testDiagonalGluedLineUsesCornerSharedWithPreviousTile() {
  const preset = {
    id: 'gomoku-diagonal-glued-second-step-render',
    label: 'gomoku diagonal glued second step render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [
      { left: { row: 1, col: 1 }, right: { row: 2, col: 1 } },
      { left: { row: 1, col: 2 }, right: { row: 2, col: 2 } }
    ],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 2, col: 2, dir: game.DIRS.S } }
    ]
  };
  const state = game.createGomokuState(preset);
  const geom = {
    cols: 2,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: [
      { row: 1, col: 1, x: 0, y: 0 },
      { row: 1, col: 2, x: 10, y: 0 },
      { row: 2, col: 1, x: 0, y: 10 },
      { row: 2, col: 2, x: 10, y: 10 }
    ]
  };
  const from = game.indexOf(1, 1, 2);
  const to = game.indexOf(2, 2, 2);
  const route = game.placementLineTransitionRoute(state, from, to);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.E, game.DIRS.N]);
  assert.strictEqual(route.transitions[1].glued, true);
  const segments = game.placementLineRenderSegments(state, geom, from, to);
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7 && segments[0].end.x < 5.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.ok(segments[1].start.x > 4.7 && segments[1].start.x < 5.7);
  assert.ok(segments[1].start.y > 14.7);
}

function testGomokuCyclicReuseWin() {
  const state = game.createGomokuState('torus');
  state.phase = 'ready';
  state.stones = [1, 2, 3, 4].map((col, index) => ({
    id: index + 1,
    index: game.indexOf(1, col, 4),
    color: 'black'
  }));
  state.nextStoneId = 5;
  state.round = 4;
  const win = game.findGomokuWin(state, game.indexOf(1, 1, 4), 'black');
  assert.ok(win);
  assert.strictEqual(win.color, 'black');
  assert.deepStrictEqual(win.line, [
    game.indexOf(1, 1, 4),
    game.indexOf(1, 2, 4),
    game.indexOf(1, 3, 4),
    game.indexOf(1, 4, 4),
    game.indexOf(1, 1, 4)
  ]);
}

function connectFourPreset() {
  return {
    id: 'connect-four-test',
    label: 'connect four test',
    lattice: 'square',
    rows: 6,
    cols: 7,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
}

function connectFourTopHoles(count = 7, cols = 7) {
  return Array.from({ length: count }, (_, index) => game.indexOf(1, index + 1, cols));
}

function testConnectFourDropStopsAtBoundaryAndBlocker() {
  let state = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: [game.indexOf(1, 1, 7)]
  });
  let result = game.placeConnectFourToken(state, game.indexOf(1, 1, 7));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.color, 'red');
  assert.strictEqual(result.token.index, game.indexOf(6, 1, 7));
  assert.deepStrictEqual(result.drop.path, [
    game.indexOf(1, 1, 7),
    game.indexOf(2, 1, 7),
    game.indexOf(3, 1, 7),
    game.indexOf(4, 1, 7),
    game.indexOf(5, 1, 7),
    game.indexOf(6, 1, 7)
  ]);
  state = result.state;
  result = game.placeConnectFourToken(state, game.indexOf(1, 1, 7));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.color, 'yellow');
  assert.strictEqual(result.token.index, game.indexOf(5, 1, 7));
  assert.deepStrictEqual(tokensAt(result.state), ['5,1:yellow', '6,1:red']);
}

function testConnectFourCycleWarning() {
  const state = game.beginConnectFourGame('torus', {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 1, 4)]
  });
  const result = game.placeConnectFourToken(state, game.indexOf(1, 1, 4));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.cycle, true);
  assert.strictEqual(result.message, 'drop route cycles before stopping');
  assert.deepStrictEqual(result.cycleHoles, [game.indexOf(1, 1, 4)]);
  assert.strictEqual(state.tokens.length, 0);
}

function testConnectFourDropCarriesGluedRoute() {
  const state = game.beginConnectFourGame('torus', {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 4, 4)]
  });
  state.tokens = [
    { id: 1, index: game.indexOf(1, 2, 4), color: 'yellow' }
  ];
  state.nextTokenId = 2;
  state.turn = 'red';
  const result = game.placeConnectFourToken(state, game.indexOf(1, 4, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.index, game.indexOf(1, 1, 4));
  assert.strictEqual(result.drop.blockedBy, game.indexOf(1, 2, 4));
  assert.deepStrictEqual(result.drop.path, [
    game.indexOf(1, 4, 4),
    game.indexOf(1, 1, 4)
  ]);
  assert.strictEqual(result.drop.transitions.length, 1);
  assert.strictEqual(result.drop.transitions[0].glued, true);
  assert.strictEqual(result.drop.transitions[0].edge.dir, game.DIRS.E);
}

function testConnectFourEndsWhenInputHolesFilled() {
  const preset = {
    id: 'connect-four-one-hole-test',
    label: 'connect four one hole test',
    lattice: 'square',
    rows: 1,
    cols: 1,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = game.beginConnectFourGame(preset, {
    fallDir: game.DIRS.S,
    holes: [0]
  });
  const result = game.placeConnectFourToken(state, 0);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.ending, 'draw');
  assert.strictEqual(result.state.winner, '');
  assert.deepStrictEqual(game.connectFourOpenHoleIndices(result.state), []);
}

function testConnectFourHorizontalWin() {
  let state = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: connectFourTopHoles(4)
  });
  [
    [1, 1], [1, 1],
    [1, 2], [1, 2],
    [1, 3], [1, 3],
    [1, 4]
  ].forEach(([row, col]) => {
    const result = game.placeConnectFourToken(state, game.indexOf(row, col, 7));
    assert.strictEqual(result.changed, true, result.message || `drop ${row},${col}`);
    state = result.state;
  });
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'red');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(6, 1, 7),
    game.indexOf(6, 2, 7),
    game.indexOf(6, 3, 7),
    game.indexOf(6, 4, 7)
  ]);
}

function testConnectFourDiagonalWinDetection() {
  const state = game.createConnectFourState(connectFourPreset(), { fallDir: game.DIRS.S });
  state.phase = 'ready';
  state.tokens = [
    { id: 1, index: game.indexOf(6, 1, 7), color: 'red' },
    { id: 2, index: game.indexOf(5, 2, 7), color: 'red' },
    { id: 3, index: game.indexOf(4, 3, 7), color: 'red' },
    { id: 4, index: game.indexOf(3, 4, 7), color: 'red' }
  ];
  state.nextTokenId = 5;
  const win = game.findConnectFourWin(state, game.indexOf(3, 4, 7), 'red');
  assert.ok(win);
  assert.strictEqual(win.color, 'red');
  assert.deepStrictEqual(win.line, [
    game.indexOf(6, 1, 7),
    game.indexOf(5, 2, 7),
    game.indexOf(4, 3, 7),
    game.indexOf(3, 4, 7)
  ]);
}

function testConnectFourDiagonalTransportsAfterReflectingGlue() {
  const preset = {
    id: 'connect-four-diagonal-transport-reflection',
    label: 'connect four diagonal transport reflection',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, reversed: true, first: { row: 5, col: 5, dir: game.DIRS.E }, second: { row: 5, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = game.createConnectFourState(preset, { fallDir: game.DIRS.S });
  state.phase = 'ready';
  state.tokens = [
    { id: 1, index: game.indexOf(5, 5, 5), color: 'red' },
    { id: 2, index: game.indexOf(4, 1, 5), color: 'red' },
    { id: 3, index: game.indexOf(3, 2, 5), color: 'red' },
    { id: 4, index: game.indexOf(2, 3, 5), color: 'red' }
  ];
  state.nextTokenId = 5;
  const win = game.findConnectFourWin(state, game.indexOf(5, 5, 5), 'red');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, [
    game.indexOf(5, 5, 5),
    game.indexOf(4, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(2, 3, 5)
  ]);
}

function testExtraBackgroundPresets() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  [
    ['twisted-torus', 'twisted torus'],
    ['gomoku-random-glue', 'random glue n*n'],
    ['rubiks-cube-2x2x2', "Rubik's Cube 2*2*2"],
    ['rubiks-cube-3x3x3', "Rubik's Cube 3*3*3"],
    ['connect-four-6x7', 'Connect Four 6*7'],
    ['connect-four-high-hit', 'high hit (6x7 Sigma_1,1)'],
    ['connect-four-high-hit-2', 'high hit2 (6x7 Sigma_0,3)'],
    ['connect-four-all-horizontal', 'all horizontal (6x7 Sigma_1,5)'],
    ['connect-four-top-fight', 'top fight (6x7 Sigma_1,1)'],
    ['connect-four-exchange', 'exchange (6x7 Sigma_1.5,1^1)'],
    ['connect-four-across', 'across (6x7 Sigma_1,1^1)'],
    ['connect-four-usual-strip', 'usual strip (6x7 Sigma_0,2)'],
    ['connect-four-mobius-strip', 'M&ouml;bius strip (6x7 N_1,1)'],
    ['connect-four-hex-usual-strip', 'hex usual strip (6x7 Sigma_0,2)'],
    ['connect-four-hex-bad-mobius-strip', 'hex bad M&ouml;bius strip (6x7 N_0,2^10)'],
    ['connect-four-hex-good-mobius-strip', 'hex good M&ouml;bius strip (7x7 N_0,2)'],
    ['usual-strip', 'usual strip'],
    ['mobius-strip', 'M&ouml;bius strip']
  ].forEach(([id, label]) => {
    assert.ok(html.includes(`<option value="${id}">${label}</option>`));
    assert.ok(game.PRESETS.find((preset) => preset.id === id));
  });

  const exchangePreset = game.createConnectFourState('connect-four-exchange').preset;
  assert.strictEqual(exchangePreset.cutEdges.length, 4);
  assert.strictEqual(exchangePreset.gluedEdges.length, 4);
  assert.strictEqual(exchangePreset.surface, 'Sigma_1.5,1^1');

  const across = game.createConnectFourState('connect-four-across');
  assert.ok(across.removed.has(game.indexOf(4, 4, 7)));
  assert.strictEqual(across.preset.gluedEdges.length, 2);

  const hexGood = game.createConnectFourState('connect-four-hex-good-mobius-strip');
  assert.strictEqual(hexGood.preset.lattice, 'hexagonal');
  assert.strictEqual(hexGood.preset.rows, 7);
  assert.strictEqual(hexGood.preset.cols, 7);
  assert.strictEqual(hexGood.preset.gluedEdges.length, 13);

  [
    'connect-four-6x7',
    'connect-four-high-hit',
    'connect-four-high-hit-2',
    'connect-four-all-horizontal',
    'connect-four-top-fight',
    'connect-four-exchange',
    'connect-four-across',
    'connect-four-usual-strip',
    'connect-four-mobius-strip',
    'connect-four-hex-usual-strip',
    'connect-four-hex-bad-mobius-strip',
    'connect-four-hex-good-mobius-strip'
  ].forEach((id) => {
    const state = game.createConnectFourState(id);
    assert.deepStrictEqual(Array.from(state.holes).sort((a, b) => a - b), connectFourTopHoles(state.preset.cols, state.preset.cols));
    assert.deepStrictEqual(
      state.preset.connectFourHoles.map((tile) => game.indexOf(tile.row, tile.col, state.preset.cols)),
      connectFourTopHoles(state.preset.cols, state.preset.cols)
    );
  });
  assert.deepStrictEqual(Array.from(game.createConnectFourState('connect-four-6x7', { holes: [] }).holes), []);
  assert.deepStrictEqual(Array.from(game.beginConnectFourGame('connect-four-6x7').holes).sort((a, b) => a - b), connectFourTopHoles());

  const rubiks2 = game.createGameState('rubiks-cube-2x2x2');
  assert.strictEqual(rubiks2.preset.rows, 6);
  assert.strictEqual(rubiks2.preset.cols, 8);
  assert.strictEqual(rubiks2.preset.surface, 'M_0,8');
  assert.strictEqual(rubiks2.preset.removedTiles.length, 24);
  assert.strictEqual(rubiks2.preset.gluedEdges.length, 14);
  assert.deepStrictEqual(rubiks2.preset.gluedEdges.map(gluedEdgeSignature), [
    '6:3,1,2>3,8,0',
    '6:4,1,2>4,8,0',
    '9:3,2,3>2,3,2',
    '9:3,1,3>1,3,2',
    '10:2,4,0>3,5,3',
    '10:1,4,0>3,6,3',
    '12:4,5,1>5,4,0',
    '12:4,6,1>6,4,0',
    '13:1,4,3>3,7,3',
    '13:1,3,3>3,8,3',
    '14:4,8,1>6,3,1',
    '14:4,7,1>6,4,1',
    '15:5,3,2>4,2,1',
    '15:6,3,2>4,1,1'
  ]);
  assert.strictEqual(game.emptyExistingIndices(rubiks2).length, 24);
  assert.strictEqual(game.countUnmatchedBoundaries(rubiks2.preset, rubiks2.removed), 0);

  const rubiks3 = game.createGameState('rubiks-cube-3x3x3');
  assert.strictEqual(rubiks3.preset.rows, 9);
  assert.strictEqual(rubiks3.preset.cols, 12);
  assert.strictEqual(rubiks3.preset.surface, 'M_0,8');
  assert.strictEqual(rubiks3.preset.removedTiles.length, 54);
  assert.strictEqual(rubiks3.preset.gluedEdges.length, 21);
  assert.deepStrictEqual(rubiks3.preset.gluedEdges.map(gluedEdgeSignature), [
    '0:4,1,2>4,12,0',
    '0:5,1,2>5,12,0',
    '0:6,1,2>6,12,0',
    '1:4,3,3>3,4,2',
    '1:4,2,3>2,4,2',
    '1:4,1,3>1,4,2',
    '2:1,6,3>4,10,3',
    '2:1,5,3>4,11,3',
    '2:1,4,3>4,12,3',
    '3:3,6,0>4,7,3',
    '3:2,6,0>4,8,3',
    '3:1,6,0>4,9,3',
    '4:6,1,1>9,4,2',
    '4:6,2,1>8,4,2',
    '4:6,3,1>7,4,2',
    '5:6,7,1>7,6,0',
    '5:6,8,1>8,6,0',
    '5:6,9,1>9,6,0',
    '6:9,4,1>6,12,1',
    '6:9,5,1>6,11,1',
    '6:9,6,1>6,10,1'
  ]);
  assert.strictEqual(game.emptyExistingIndices(rubiks3).length, 54);
  assert.strictEqual(game.countUnmatchedBoundaries(rubiks3.preset, rubiks3.removed), 0);

  const usual = game.createGameState('usual-strip');
  assert.strictEqual(usual.preset.lattice, 'hexagonal');
  assert.strictEqual(usual.preset.rows, 4);
  assert.strictEqual(usual.preset.cols, 5);
  assert.strictEqual(usual.preset.gluedEdges.length, 7);
  assert.strictEqual(game.countUnmatchedBoundaries(usual.preset, usual.removed), 20);

  const mobius = game.createGameState('mobius-strip');
  assert.strictEqual(mobius.preset.lattice, 'hexagonal');
  assert.strictEqual(mobius.preset.surface, 'N_0,2^6');
  assert.strictEqual(mobius.preset.gluedEdges.length, 7);
  assert.ok(mobius.preset.gluedEdges.every((pair) => pair.reversed));
  assert.ok(mobius.preset.gluedEdges.every((pair) => pair.secondArrowReversed === false));
  assert.strictEqual(game.countUnmatchedBoundaries(mobius.preset, mobius.removed), 20);

  const twisted = game.createGameState('twisted-torus');
  assert.strictEqual(twisted.preset.rows, 4);
  assert.strictEqual(twisted.preset.cols, 4);
  assert.strictEqual(twisted.preset.surface, 'M_2,1');
  assert.strictEqual(twisted.preset.gluedEdges.length, 8);
  const twistedStep = game.surfaceSuccessor(twisted, game.indexOf(1, 1, 4), game.DIRS.N);
  assert.strictEqual(twistedStep.kind, 'glued');
  assert.strictEqual(twistedStep.index, game.indexOf(4, 2, 4));

  const halfGlued = game.createGameState('half-glued');
  assert.strictEqual(halfGlued.preset.surface, 'Sigma_1,1');
  assert.deepStrictEqual(halfGlued.preset.gluedEdges.map(gluedEdgeSignature), [
    '0:1,1,3>4,3,1',
    '0:1,2,3>4,4,1',
    '1:3,1,2>1,4,0',
    '1:4,1,2>2,4,0'
  ]);
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
  assert.ok(!minigameHtml.includes('id="import-preset-toggle"'));
  assert.ok(minigameHtml.includes('id="game-mode-select"'));
  assert.ok(minigameHtml.includes('<option value="2048" selected>2048</option>'));
  assert.ok(minigameHtml.includes('<option value="gomoku">Gomoku</option>'));
  assert.ok(minigameHtml.includes('<option value="connect-four">Connect Four</option>'));
  assert.ok(minigameHtml.includes('<optgroup label="2048">'));
  assert.ok(minigameHtml.includes('<optgroup label="Gomoku">'));
  assert.ok(minigameHtml.includes('<optgroup label="Connect Four">'));
  assert.ok(minigameHtml.includes('id="gomoku-size-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="gomoku-board-size"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-style"'));
  assert.ok(minigameHtml.includes('<option value="vertex">vertex E/S/W/N</option>'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-row" data-mode-control="connect-four"'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-dir"'));
  assert.ok(minigameHtml.includes('id="game-setup-alert"'));
  assert.ok(minigameHtml.includes('<option value="import-preset">import</option>'));
  assert.ok(minigameHtml.includes('id="import-preset-input"'));
  assert.ok(minigameHtml.includes('id="apply-import-preset"'));
  assert.ok(minigameHtml.includes('id="import-state"'));
  assert.ok(!minigameHtml.includes('id="debug-export-output" readonly'));
  assert.ok(minigameHtml.includes('id="step-mode-row" data-mode-control="2048"'));
  assert.ok(minigameHtml.includes('<option value="">empty</option>'));
  assert.ok(mosaicHtml.includes('id="export-background-preset"'));
  assert.ok(mosaicHtml.includes('id="export-background-preset" type="button">export</button>'));
  assert.ok(!mosaicHtml.includes('export background'));
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
  assert.ok(html.includes('id="highlight-new-boxes" checked'));
}

function testStepPauseRendersAfterSelectingNextEvent() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const finishIndex = source.indexOf('function tickAnimation()');
  const finishEnd = source.indexOf('function finishEventQueue()', finishIndex);
  const body = source.slice(finishIndex, finishEnd);
  const clearIndex = body.indexOf('currentAnimation = null;');
  const pauseIndex = body.indexOf('stepPaused = eventIndex < eventQueue.length;', clearIndex);
  const renderIndex = body.indexOf('render();', pauseIndex);
  assert.ok(clearIndex >= 0);
  assert.ok(pauseIndex > clearIndex);
  assert.ok(renderIndex > pauseIndex);
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
  assert.deepStrictEqual(game.stateSummary(result.state).newBoxIds, spawnEvents.map((event) => event.boxId).sort((a, b) => a - b));
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
  const mode2048Controls = [
    makeElement('box-ui-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('new-boxes-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('speed-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('step-mode-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('debug-tile-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('move-row', { attributes: { 'data-mode-control': '2048' } })
  ];
  const modeGomokuControls = [
    makeElement('gomoku-size-row', { hidden: true, attributes: { 'data-mode-control': 'gomoku' } }),
    makeElement('gomoku-display-row', { hidden: true, attributes: { 'data-mode-control': 'gomoku' } })
  ];
  const modeConnectFourControls = [
    makeElement('connect-four-fall-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } })
  ];
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
    makeElement('game-mode-select', { value: '2048' }),
    makeElement('surface-preset-select', { value: 'torus' }),
    makeElement('import-preset-tools', { hidden: true }),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('gomoku-board-size', { value: '15' }),
    makeElement('gomoku-display-style', { value: 'center' }),
    makeElement('connect-four-fall-dir', {
      value: 'S',
      options: ['S', 'E', 'W', 'N', 'SE', 'SW', 'NW', 'NE'].map((value) => ({ value, textContent: '', hidden: false, disabled: false }))
    }),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('highlight-new-boxes', { checked: true }),
    makeElement('begin-game'),
    makeElement('game-setup-alert', { hidden: true }),
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
    makeElement('score-label'),
    makeElement('highest-tile-label'),
    makeElement('existing-tile-label'),
    makeElement('removed-tile-label'),
    makeElement('round-label'),
    makeElement('score-value'),
    makeElement('highest-tile-value'),
    makeElement('existing-tile-value'),
    makeElement('removed-tile-value'),
    makeElement('round-value')
  ].forEach((element) => elements.set(element.id, element));
  moveButtons.forEach((button) => elements.set(button.id, button));
  mode2048Controls.forEach((control) => elements.set(control.id, control));
  modeGomokuControls.forEach((control) => elements.set(control.id, control));
  modeConnectFourControls.forEach((control) => elements.set(control.id, control));

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
        if (selector === '[data-move-dir]') return moveButtons;
        if (selector === '[data-mode-control="2048"]') return mode2048Controls;
        if (selector === '[data-mode-control="gomoku"]') return modeGomokuControls;
        if (selector === '[data-mode-control="connect-four"]') return modeConnectFourControls;
        return [];
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

  assert.strictEqual(typeof canvas.listeners.mousemove, 'function');
  assert.strictEqual(typeof canvas.listeners.mouseleave, 'function');
  canvas.listeners.mousemove({ clientX: 57, clientY: 29 });
  assert.strictEqual(canvas.style.cursor, 'help');
  canvas.listeners.mouseleave();
  assert.strictEqual(canvas.style.cursor, '');

  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '2');
  assert.strictEqual(moveButtons.some((button) => button.disabled), false);
  assert.strictEqual(elements.get('move-row').hidden, false);
  assert.strictEqual(elements.get('box-ui-row').hidden, false);

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
  canvas.listeners.click({ clientX: 36, clientY: 41 });
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

  elements.get('surface-preset-select').value = 'import-preset';
  elements.get('surface-preset-select').listeners.change();
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

  elements.get('game-mode-select').value = 'gomoku';
  elements.get('game-mode-select').listeners.change();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('surface-preset-select').value, 'gomoku-random-glue');
  assert.strictEqual(elements.get('move-row').hidden, true);
  assert.strictEqual(elements.get('box-ui-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.strictEqual(elements.get('step-mode-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-value').disabled, true);
  elements.get('gomoku-display-style').value = 'vertex';
  elements.get('gomoku-display-style').listeners.change();
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('score-label').textContent, 'Turn');
  assert.strictEqual(elements.get('score-value').textContent, 'black');
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('score-value').textContent, 'white');
  assert.strictEqual(elements.get('highest-tile-label').textContent, 'Black stones');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '0');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  assert.strictEqual(elements.get('undo-step').disabled, false);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.deepStrictEqual(exported.stones.map((stone) => stone.color), ['black']);
  assert.strictEqual(exported.turn, 'white');
  const gomokuExport = exported;
  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(elements.get('score-value').textContent, 'black');
  assert.strictEqual(elements.get('round-value').textContent, '0');
  elements.get('debug-export-output').value = JSON.stringify(gomokuExport);
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 1);

  const clickCell = (row, col) => {
    canvas.listeners.click({
      clientX: 57 + ((col - 1) * 58),
      clientY: 57 + ((row - 1) * 58)
    });
  };
  elements.get('surface-preset-select').value = 'torus';
  elements.get('surface-preset-select').listeners.change();
  elements.get('begin-game').listeners.click();
  clickCell(1, 1);
  clickCell(2, 1);
  clickCell(1, 2);
  clickCell(2, 2);
  clickCell(1, 3);
  clickCell(2, 3);
  clickCell(1, 4);
  assert.strictEqual(elements.get('status-line').textContent, 'black wins');
  assert.strictEqual(elements.get('status-badge').textContent, 'over');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.resultDismissed, false);
  assert.strictEqual(exported.stones.length, 7);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.resultDismissed, true);
  assert.strictEqual(exported.stones.length, 7);

  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('surface-preset-select').value, 'connect-four-6x7');
  assert.strictEqual(elements.get('connect-four-fall-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-display-row').hidden, true);
  assert.strictEqual(elements.get('move-row').hidden, true);
  elements.get('surface-preset-select').value = 'connect-four-6x7';
  elements.get('surface-preset-select').listeners.change();
  elements.get('connect-four-fall-dir').value = 'S';
  elements.get('connect-four-fall-dir').listeners.change();
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  assert.strictEqual(elements.get('begin-game').textContent, 'stop the game');
  assert.strictEqual(elements.get('score-label').textContent, 'Turn');
  assert.strictEqual(elements.get('score-value').textContent, 'red');
  assert.strictEqual(elements.get('connect-four-fall-dir').disabled, true);
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  assert.strictEqual(elements.get('status-line').textContent, 'Connect Four drop 1');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  assert.strictEqual(elements.get('score-value').textContent, 'yellow');
  assert.strictEqual(elements.get('highest-tile-label').textContent, 'Red tokens');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '0');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.tokens.length, 1);
  assert.strictEqual(exported.holes.length, 7);
  assert.strictEqual(exported.preset.connectFourHoles.length, 7);
  assert.strictEqual(exported.tokens[0].row, 6);
  assert.strictEqual(exported.tokens[0].col, 1);
  assert.strictEqual(exported.fallDirName, 'S');
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('begin-game').textContent, 'begin the game');
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');

  elements.get('surface-preset-select').value = 'torus';
  elements.get('surface-preset-select').listeners.change();
  elements.get('connect-four-fall-dir').value = 'E';
  elements.get('connect-four-fall-dir').listeners.change();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('begin-game').listeners.click();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('status-line').textContent, 'Connect Four drop rejected');
  assert.strictEqual(elements.get('info-line').textContent, 'drop route cycles before stopping');
  assert.strictEqual(elements.get('game-setup-alert').hidden, false);
  assert.strictEqual(elements.get('game-setup-alert').textContent, 'Connect Four drop rejected: drop route cycles before stopping');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[1, 1]]);
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[1, 1]]);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles, []);
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
  testExplosionModeForFullCycleBoard();
  testDownMoveAfterExplosionDoesNotStack();
  testBlockedResidentWithSuccessorPreventsGroupExplosion();
  testExplosionMoverVacatesSourceForBounceResolution();
  testMergeAndMoveShareAnimationStep();
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
  testGlueHoverFindsMultiEdgeGroup();
  testGenus2PresetFromExport();
  testRandomGluePresetCoversBoundary();
  testRandomGluePresetIsDeterministicWithGlueRng();
  testGomokuRandomGluePresetSize();
  testHexClassicPreset();
  testHexClassicSuccessors();
  testGomokuAlternatingPlacement();
  testGomokuRejectsOccupiedAndRemovedTiles();
  testGomokuSquareHorizontalWin();
  testGomokuHexAxisWin();
  testGomokuSquareDiagonalWin();
  testGomokuDiagonalChecksAlternateStepOrders();
  testGomokuDiagonalTransportsAfterRotatingGlue();
  testGomokuDiagonalTransportsAfterReflectingGlue();
  testGomokuGluedEdgeWin();
  testDiagonalGluedLineUsesBoundaryCorner();
  testDiagonalGluedLineUsesCornerSharedWithPreviousTile();
  testGomokuCyclicReuseWin();
  testConnectFourDropStopsAtBoundaryAndBlocker();
  testConnectFourCycleWarning();
  testConnectFourDropCarriesGluedRoute();
  testConnectFourEndsWhenInputHolesFilled();
  testConnectFourHorizontalWin();
  testConnectFourDiagonalWinDetection();
  testConnectFourDiagonalTransportsAfterReflectingGlue();
  testExtraBackgroundPresets();
  testHexKeyboardMapping();
  testHexMovePadUsesArrowGlyphs();
  testMosaicBackgroundExportAndMinigameImportControlsExist();
  testPresetFromMosaicBackgroundExport();
  testPresetFromFullMosaicCalculatorExport();
  testSpeedControlDefaults();
  testStepPauseRendersAfterSelectingNextEvent();
  testStationaryDifferentBlocks();
  testSimultaneousDifferentExplosion();
  testLargeExplosionClearsSurfaceNeighbors();
  testSpawnAfterValidRound();
  testHeadlessDomStepControls();
  console.log('ramified_minigames_setup_test: all tests passed');
}

run();
