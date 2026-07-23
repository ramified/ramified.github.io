const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const game = require('./ramified_minigames_setup.js');
const presetRegistrySource = require('../ramified_minigame_presets/presets.js');
const presetRegistry = presetRegistrySource.presets;
const presetDefaultFor = presetRegistrySource.defaultFor;
const presetDataByKey = Object.fromEntries(
  presetRegistry.map((entry) => [entry.key, require(`../ramified_minigame_presets/${entry.file}`)])
);

function tile(row, col) {
  return { row, col };
}

function registryEntryHasGameType(entry, gameType) {
  const values = [];
  if (Array.isArray(entry.gameTypes)) values.push(...entry.gameTypes);
  if (Array.isArray(entry.groups)) values.push(...entry.groups);
  if (entry.group) values.push(entry.group);
  return values.includes(gameType);
}

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

function discsAt(state, cols = state.preset.cols) {
  return state.discs
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

function indexMultiplicities(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
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

function boundaryBoardOptions(options = {}) {
  const rows = options.rows || options.boardRows || 4;
  const cols = options.cols || options.boardCols || rows;
  return {
    boundaryGlueMode: options.mode || options.boundaryGlueMode || game.BOUNDARY_GLUE_MODES.TORUS,
    boardRows: rows,
    boardCols: cols,
    boardSize: rows,
    glueRng: options.glueRng
  };
}

function boundaryBoardState(options = {}) {
  return game.createGameState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryGomokuState(options = {}) {
  return game.createGomokuState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryGoState(options = {}) {
  return game.createGoState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryReversiState(options = {}) {
  return game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryConnectFourPreset(options = {}) {
  return game.generateBoundaryGlueBoardPreset({
    id: 'boundary-connect-four-test',
    label: 'boundary connect four test',
    lattice: 'square',
    rows: options.rows || 4,
    cols: options.cols || 4,
    surface: 'test torus',
    boundaryGlueBoard: true,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.TORUS,
    connectFourHoles: []
  }, {
    gameMode: game.GAME_MODES.NUMBER_2048,
    boundaryGlueMode: options.mode || game.BOUNDARY_GLUE_MODES.TORUS,
    boardRows: options.rows || 4,
    boardCols: options.cols || 4,
    glueRng: options.glueRng
  });
}

function stateWithBoxes(presetId, boxes, options = {}) {
  const state = game.createGameState(presetId, options);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function boundaryStateWithBoxes(boxes, options = {}) {
  const state = boundaryBoardState(options);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function sokobanPreset(options = {}) {
  return game.normalizePresetPayload({
    id: options.id || 'sokoban-test',
    label: options.label || 'Sokoban test',
    gameTypes: ['Sokoban'],
    lattice: options.lattice || 'square',
    size: options.size || '3x4',
    surface: options.surface || 'test room',
    removed: options.removed || [],
    cuts: options.cuts || [],
    glue: options.glue || [],
    sokoban: options.sokoban || {}
  });
}

function readySokobanState(options = {}) {
  const state = game.beginSokobanGame(sokobanPreset(options));
  state.phase = 'ready';
  return state;
}

function sokobanActorsAt(actors, cols) {
  return actors
    .map((actor) => {
      const pos = game.rowCol(actor.index, cols);
      return `${pos.row},${pos.col}`;
    })
    .sort();
}

function gluePair(group, first, second, options = {}) {
  return {
    group,
    reversed: !!options.reversed,
    firstArrowReversed: !!options.firstArrowReversed,
    secondArrowReversed: Object.prototype.hasOwnProperty.call(options, 'secondArrowReversed')
      ? !!options.secondArrowReversed
      : !options.reversed,
    first,
    second
  };
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

function testLongGluedChainConvergesBeforeBackMerge() {
  const preset = {
    id: 'long-glued-chain',
    label: 'long glued chain',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'long glued chain',
    removedTiles: [{ row: 4, col: 4 }],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 4, dir: game.DIRS.E }, second: { row: 2, col: 1, dir: game.DIRS.W } },
      { group: 0, first: { row: 2, col: 4, dir: game.DIRS.E }, second: { row: 3, col: 1, dir: game.DIRS.W } },
      { group: 0, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 4),
    box(4, 1, 4, 8),
    box(5, 2, 1, 16),
    box(6, 2, 2, 2),
    box(7, 2, 3, 8),
    box(8, 2, 4, 16),
    box(9, 3, 1, 2),
    box(10, 3, 2, 4),
    box(11, 3, 3, 16),
    box(12, 3, 4, 32),
    box(13, 4, 1, 64),
    box(14, 4, 2, 2),
    box(15, 4, 3, 32)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const merges = allMergeEvents(result.events);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(merges.length, 1);
  assert.strictEqual(merges[0].targetBoxId, 2);
  assert.deepStrictEqual(merges[0].removeBoxIds, [1]);
  assert.strictEqual(merges[0].newValue, 4);
  assert.deepStrictEqual(valuesAt(result.state), [
    '1,2:4',
    '1,3:4',
    '1,4:8',
    '2,1:16',
    '2,2:2',
    '2,3:8',
    '2,4:16',
    '3,1:2',
    '3,2:4',
    '3,3:16',
    '3,4:32',
    '4,1:64',
    '4,2:2',
    '4,3:32'
  ]);
  assert.strictEqual(allBounceMoves(result.events).length, 0);
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
  const state = boundaryBoardState();
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
  const state = boundaryBoardState();
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
  const state = boundaryStateWithBoxes([
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
  const state = boundaryStateWithBoxes([box(1, 1, 1, 2)]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.ok(result.state.removed.has(game.indexOf(1, 4, 4)));
  assert.ok(result.events.some((event) => event.kind === 'explode'));
}

function testKleinAndRamifiedSuccessors() {
  const klein = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.KLEIN_BOTTLE });
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

function glueGroupSummary(gluedEdges) {
  const groups = new Map();
  gluedEdges.forEach((pair) => {
    const group = Number(pair.group);
    const entry = groups.get(group) || { count: 0, reversedValues: new Set() };
    entry.count += 1;
    entry.reversedValues.add(!!pair.reversed);
    groups.set(group, entry);
  });
  return Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([group, entry]) => {
      const reversed = Array.from(entry.reversedValues);
      const flag = reversed.length > 1 ? 'mixed' : (reversed[0] ? 'reversed' : 'normal');
      return `${group}:${entry.count}:${flag}`;
    });
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

function testBoundaryGlueBoardPresetSizingAndGlueModes() {
  const source = game.PRESETS.find((preset) => preset.id === game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.ok(source && source.boundaryGlueBoard);

  const defaults2048 = game.createGameState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaults2048.rows, 4);
  assert.strictEqual(defaults2048.cols, 4);
  assert.strictEqual(defaults2048.boundaryGlueMode, game.BOUNDARY_GLUE_MODES.TORUS);
  assert.strictEqual(defaults2048.gluedEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(defaults2048.gluedEdges), ['0:4:normal', '1:4:normal']);

  const defaultsGomoku = game.createGomokuState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsGomoku.rows, 15);
  assert.strictEqual(defaultsGomoku.cols, 15);
  assert.strictEqual(defaultsGomoku.gluedEdges.length, 30);
  assert.deepStrictEqual(glueGroupSummary(defaultsGomoku.gluedEdges), ['0:15:normal', '1:15:normal']);

  const defaultsGo = game.createGoState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsGo.rows, 19);
  assert.strictEqual(defaultsGo.cols, 19);
  assert.strictEqual(defaultsGo.gluedEdges.length, 38);

  const defaultsReversi = game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsReversi.rows, 10);
  assert.strictEqual(defaultsReversi.cols, 10);
  assert.strictEqual(defaultsReversi.gluedEdges.length, 20);

  const torusEdges = game.generateTorusBoundaryGlue(3, 5);
  assert.strictEqual(torusEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(torusEdges), ['0:3:normal', '1:5:normal']);
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: torusEdges }), squareBoundaryKeys(3, 5));

  const kleinEdges = game.generateKleinBoundaryGlue(3, 5);
  assert.strictEqual(kleinEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(kleinEdges), ['0:3:reversed', '1:5:normal']);
  assert.ok(kleinEdges.slice(0, 3).every((pair) => pair.reversed));
  assert.strictEqual(kleinEdges[0].first.row, 1);
  assert.strictEqual(kleinEdges[0].second.row, 3);
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: kleinEdges }), squareBoundaryKeys(3, 5));

  const projectiveEdges = game.generateProjectivePlaneBoundaryGlue(3, 5);
  assert.strictEqual(projectiveEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(projectiveEdges), ['0:3:reversed', '1:5:reversed']);
  assert.ok(projectiveEdges.every((pair) => pair.reversed));
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: projectiveEdges }), squareBoundaryKeys(3, 5));

  const torusState = boundaryBoardState({ rows: 3, cols: 5 });
  let step = game.surfaceSuccessor(torusState, game.indexOf(2, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(2, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(torusState, game.indexOf(1, 4, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const kleinState = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.KLEIN_BOTTLE, rows: 3, cols: 5 });
  step = game.surfaceSuccessor(kleinState, game.indexOf(1, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(3, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(kleinState, game.indexOf(1, 4, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const projectiveState = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.RP2, rows: 3, cols: 5 });
  step = game.surfaceSuccessor(projectiveState, game.indexOf(1, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(3, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(projectiveState, game.indexOf(1, 2, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const open = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.OPEN,
    boardRows: 3,
    boardCols: 5
  });
  assert.strictEqual(open.rows, 3);
  assert.strictEqual(open.cols, 5);
  assert.strictEqual(open.gluedEdges.length, 0);

  const randomA = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.RANDOM,
    boardRows: 3,
    boardCols: 5,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  const randomB = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.RANDOM,
    boardRows: 3,
    boardCols: 5,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  assert.deepStrictEqual(randomA.gluedEdges, randomB.gluedEdges);
  assert.strictEqual(glueGroupSummary(randomA.gluedEdges).length, randomA.gluedEdges.length);
  assert.deepStrictEqual(gluedBoundaryKeys(randomA), squareBoundaryKeys(3, 5));

  const classic = boundaryGomokuState({ mode: game.BOUNDARY_GLUE_MODES.OPEN, rows: 9, cols: 9 });
  assert.strictEqual(classic.preset.rows, 9);
  assert.strictEqual(classic.preset.cols, 9);
  assert.strictEqual(classic.preset.label, 'open/classic 9x9');
  assert.strictEqual(classic.preset.gluedEdges.length, 0);
  assert.strictEqual(game.emptyExistingIndices(classic).length, 81);

  const state = boundaryGomokuState({
    mode: game.BOUNDARY_GLUE_MODES.RANDOM,
    rows: 9,
    cols: 9,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  assert.strictEqual(state.preset.rows, 9);
  assert.strictEqual(state.preset.cols, 9);
  assert.strictEqual(state.preset.label, 'random boundary glue 9x9');
  assert.strictEqual(state.preset.gluedEdges.length, 18);
  assert.deepStrictEqual(gluedBoundaryKeys(state.preset), squareBoundaryKeys(9, 9));
  const base = game.PRESETS.find((preset) => preset.id === game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.ok(base.boundaryGlueBoard);
  assert.strictEqual(base.rows, 4);
  assert.strictEqual(base.gluedEdges.length, 0);

  const rectangle = boundaryGoState({ rows: 13, cols: 9 });
  assert.strictEqual(rectangle.preset.rows, 13);
  assert.strictEqual(rectangle.preset.cols, 9);
  assert.strictEqual(rectangle.preset.gluedEdges.length, 22);

  let ticTacToe = game.beginGomokuGame('gomoku-tic-tac-toe');
  [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3]
  ].forEach(([row, col]) => {
    ticTacToe = game.placeGomokuStone(ticTacToe, game.indexOf(row, col, 3)).state;
  });
  assert.strictEqual(ticTacToe.preset.gomokuWinLength, undefined);
  assert.strictEqual(ticTacToe.winner, 'black');
  assertLineMatchesEitherDirection(ticTacToe.winningLine, [1, 2, 0, 1, 2]);
  assert.deepStrictEqual(indexMultiplicities(ticTacToe.winningLine), { 0: 1, 1: 2, 2: 2 });
  assert.strictEqual(game.countUnmatchedBoundaries(ticTacToe.preset, ticTacToe.removed), 0);

  const strangeCorner = game.createGomokuState('gomoku-strange-corner');
  assert.strictEqual(strangeCorner.preset.gluedEdges.length, 10);
  assert.strictEqual(game.countUnmatchedBoundaries(strangeCorner.preset, strangeCorner.removed), 40);

  const smallHoles = game.createGomokuState('gomoku-small-holes');
  assert.strictEqual(smallHoles.preset.removedTiles.length, 9);
  assert.strictEqual(smallHoles.preset.gluedEdges.length, 18);
  assert.strictEqual(game.countUnmatchedBoundaries(smallHoles.preset, smallHoles.removed), 60);

  const bigHole = game.createGomokuState('gomoku-big-hole');
  assert.strictEqual(bigHole.preset.removedTiles.length, 25);
  assert.strictEqual(bigHole.preset.gluedEdges.length, 10);
  assert.strictEqual(game.countUnmatchedBoundaries(bigHole.preset, bigHole.removed), 60);

  const genusFour = game.createGomokuState('gomoku-m4-15x15');
  assert.strictEqual(genusFour.preset.label, 'genus 4');
  assert.strictEqual(genusFour.preset.rows, 15);
  assert.strictEqual(genusFour.preset.cols, 15);
  assert.strictEqual(genusFour.preset.surface, 'M_4,1');
  assert.strictEqual(genusFour.preset.removedTiles.length, 25);
  assert.strictEqual(genusFour.preset.gluedEdges.length, 40);
  assert.strictEqual(game.countUnmatchedBoundaries(genusFour.preset, genusFour.removed), 0);
  assert.deepStrictEqual(genusFour.preset.gluedEdges.slice(0, 5).map(gluedEdgeSignature), [
    '0:5,10,1>1,10,3',
    '0:5,9,1>1,9,3',
    '0:5,8,1>1,8,3',
    '0:5,7,1>1,7,3',
    '0:5,6,1>1,6,3'
  ]);
}

function testOfficialGomokuTorusUsesFiveInLineMultiplicity() {
  let state = game.beginGomokuGame('gomoku-tic-tac-toe');
  state = playGomokuMoves(state, [
    [1, 2], [2, 1],
    [2, 2], [2, 3],
    [3, 2]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.strictEqual(state.winningLine.length, 5);
  assert.deepStrictEqual(indexMultiplicities(state.winningLine), { 1: 1, 4: 2, 7: 2 });

  const winFromTop = game.findGomokuWin(state, game.indexOf(1, 2, 3), 'black');
  assert.ok(winFromTop);
  assert.deepStrictEqual(winFromTop.line, [7, 1, 4, 7, 1]);
  state.winningLine = winFromTop.line;
  const segments = game.placementWinningLineSegments(state, squareTestGeometry(3, 3));
  const repeatedSegments = segments.filter((segment) => segment.count === 2);
  assert.strictEqual(repeatedSegments.length, 2);
  assert.ok(repeatedSegments.some((segment) => segment.start.y > 24 && segment.end.y > 29));
  assert.ok(repeatedSegments.some((segment) => segment.start.y < 1 && segment.end.y <= 5));
}

function testOfficialGomokuTorusLegacyImportUpgradesWinLength() {
  const officialPreset = game.PRESETS.find((preset) => preset.id === 'gomoku-tic-tac-toe');
  assert.ok(officialPreset);
  const legacyPreset = JSON.parse(JSON.stringify(officialPreset));
  legacyPreset.gomokuWinLength = 3;
  assert.strictEqual(game.normalizePresetPayload(legacyPreset).gomokuWinLength, undefined);
  const { elements } = createHeadlessDomHarness();
  importHeadlessStatus(elements, {
    gameMode: 'gomoku',
    preset: legacyPreset,
    phase: 'gameover',
    ending: 'gomoku-win',
    round: 5,
    turn: 'black',
    winner: 'black',
    winningLine: [1, 4, 7],
    resultDismissed: true,
    nextStoneId: 6,
    stones: [
      { id: 1, row: 1, col: 2, color: 'black' },
      { id: 3, row: 2, col: 2, color: 'black' },
      { id: 2, row: 2, col: 3, color: 'white' },
      { id: 5, row: 3, col: 2, color: 'black' },
      { id: 4, row: 3, col: 3, color: 'white' }
    ]
  });
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.gomokuWinLength, undefined);
  assert.strictEqual(exported.winningLine.length, 5);
  assert.deepStrictEqual(indexMultiplicities(exported.winningLine), { 1: 2, 4: 1, 7: 2 });
}

function testCustomGomokuThreeInLinePresetStillWorks() {
  const preset = game.normalizePresetPayload({
    id: 'custom-three-line',
    label: 'custom three line',
    gameTypes: ['Gomoku'],
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'custom',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    gomokuWinLength: 3
  });
  assert.strictEqual(preset.gomokuWinLength, 3);
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2]);
}

function testGoCaptureSuicideKoAndScoring() {
  const preset = {
    id: 'go-3x3',
    label: 'go 3x3',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'go test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginGoGame(preset, { komi: 6.5 });
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(2, 3, 3), color: 'black' },
    { id: 4, index: game.indexOf(2, 2, 3), color: 'white' }
  ];
  state.nextStoneId = 5;
  state.turn = 'black';
  let result = game.placeGoStone(state, game.indexOf(3, 2, 3));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.captures.black, 1);
  assert.ok(!result.state.stones.some((stone) => stone.index === game.indexOf(2, 2, 3)));

  state = game.beginGoGame(preset);
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(2, 3, 3), color: 'black' },
    { id: 4, index: game.indexOf(3, 2, 3), color: 'black' }
  ];
  state.nextStoneId = 5;
  state.turn = 'white';
  result = game.placeGoStone(state, game.indexOf(2, 2, 3));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'suicide is not legal');

  state = game.beginGoGame(preset);
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(3, 2, 3), color: 'black' },
    { id: 4, index: game.indexOf(2, 2, 3), color: 'white' }
  ];
  state.nextStoneId = 5;
  state.turn = 'black';
  state.previousBoardSignature = [
    `${game.indexOf(1, 2, 3)}:black`,
    `${game.indexOf(2, 1, 3)}:black`,
    `${game.indexOf(2, 3, 3)}:black`,
    `${game.indexOf(3, 2, 3)}:black`
  ].sort().join('|');
  result = game.placeGoStone(state, game.indexOf(2, 3, 3));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'simple ko forbids this recapture');

  state = game.beginGoGame(preset, { komi: 6.5 });
  state.stones = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(3, 3, 3), color: 'white' }
  ];
  state.nextStoneId = 3;
  result = game.passGoTurn(state);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.turn, 'white');
  result = game.passGoTurn(result.state);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'white');
  assert.strictEqual(result.state.finalScore.komi, 6.5);
}

function testGoGluedCaptureUsesSurfaceSuccessor() {
  const preset = {
    id: 'go-glued-capture',
    label: 'go glued capture',
    lattice: 'square',
    rows: 1,
    cols: 2,
    surface: 'go glued capture',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: game.DIRS.E }, second: { row: 1, col: 2, dir: game.DIRS.W } }
    ]
  };
  const state = game.beginGoGame(preset);
  state.stones = [{ id: 1, index: game.indexOf(1, 1, 2), color: 'white' }];
  state.nextStoneId = 2;
  state.turn = 'black';
  const result = game.placeGoStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.captures.black, 1);
  assert.deepStrictEqual(result.state.stones.map((stone) => stone.color), ['black']);
}

function testReversiOpeningFlipsAndScoring() {
  let state = game.beginReversiGame(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions({
    mode: game.BOUNDARY_GLUE_MODES.OPEN,
    rows: 8,
    cols: 8
  }));
  assert.strictEqual(state.preset.rows, 8);
  assert.strictEqual(state.discs.length, 4);
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(3, 4, 8), 'black'), [game.indexOf(4, 4, 8)]);
  let result = game.placeReversiDisc(state, game.indexOf(3, 4, 8));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.flips.length, 1);
  assert.strictEqual(result.state.discs.find((disc) => disc.index === game.indexOf(4, 4, 8)).color, 'black');

  const linePreset = {
    id: 'reversi-line',
    label: 'reversi line',
    lattice: 'square',
    rows: 1,
    cols: 3,
    surface: 'line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  state = game.beginReversiGame(linePreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(1, 2, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  result = game.placeReversiDisc(state, game.indexOf(1, 3, 3));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'black');
  assert.deepStrictEqual(result.state.finalScore, { black: 3, white: 0 });
}

function testReversiCenteredOpeningDimensions() {
  const cases = [
    [8, 8, [
      '4,4:white', '4,5:black',
      '5,4:black', '5,5:white'
    ]],
    [9, 8, [
      '4,4:white', '4,5:black',
      '5,4:black', '5,5:white',
      '6,4:white', '6,5:black'
    ]],
    [8, 9, [
      '4,4:white', '4,5:black', '4,6:white',
      '5,4:black', '5,5:white', '5,6:black'
    ]],
    [9, 9, [
      '4,4:white', '4,5:black', '4,6:white',
      '5,4:black', '5,5:white', '5,6:black',
      '6,4:white', '6,5:black', '6,6:white'
    ]]
  ];
  cases.forEach(([rows, cols, expected]) => {
    const sortedExpected = expected.slice().sort();
    const pure = game.centeredReversiOpening(rows, cols).map((entry) => {
      const point = game.rowCol(entry.index, cols);
      return `${point.row},${point.col}:${entry.color}`;
    }).sort();
    assert.deepStrictEqual(pure, sortedExpected);

    const state = game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions({
      mode: game.BOUNDARY_GLUE_MODES.OPEN,
      rows,
      cols
    }));
    assert.deepStrictEqual(discsAt(state), sortedExpected);
  });
}

function testReversiGluedFlipAndLoopGuard() {
  const gluedPreset = {
    id: 'reversi-glued',
    label: 'reversi glued',
    lattice: 'square',
    rows: 1,
    cols: 3,
    surface: 'glued',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 1, dir: game.DIRS.W } }
    ]
  };
  let state = game.beginReversiGame(gluedPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(1, 3, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(1, 2, 3), 'black'), [game.indexOf(1, 3, 3)]);

  const loopPreset = {
    ...gluedPreset,
    id: 'reversi-loop',
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 2, dir: game.DIRS.W } }
    ]
  };
  state = game.beginReversiGame(loopPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'white' },
    { id: 2, index: game.indexOf(1, 3, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(1, 1, 3), 'black'), []);
}

function testReversiDiagonalFlipsAndAnimationMetadata() {
  const diagonalPreset = {
    id: 'reversi-diagonal',
    label: 'reversi diagonal',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'diagonal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginReversiGame(diagonalPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 4), color: 'black' },
    { id: 2, index: game.indexOf(2, 2, 4), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  let result = game.placeReversiDisc(state, game.indexOf(3, 3, 4));
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(result.flips, [game.indexOf(2, 2, 4)]);
  assert.ok(result.lines.some((line) => line.kind === 'diagonal'));
  assert.deepStrictEqual(result.flippedDiscs, [{
    id: 2,
    index: game.indexOf(2, 2, 4),
    fromColor: 'white',
    toColor: 'black'
  }]);

  const gluedPreset = {
    id: 'reversi-glued-diagonal',
    label: 'reversi glued diagonal',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'glued diagonal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 3, col: 1, dir: game.DIRS.W } }
    ]
  };
  state = game.beginReversiGame(gluedPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  result = game.placeReversiDisc(state, game.indexOf(1, 3, 3));
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(result.flips, [game.indexOf(2, 1, 3)]);
  const gluedLine = result.lines.find((line) => line.kind === 'diagonal');
  assert.ok(gluedLine);
  assert.ok(gluedLine.routes.some((route) => route.transitions.some((transition) => transition.glued)));
}

function testChineseCheckersSetupMovesJumpsAndWin() {
  const state = game.beginChineseCheckersGame('chinese-checkers-hex-rhombus-9x9');
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.strictEqual(state.marbles.length, 8);
  assert.strictEqual(state.camps.starts.red.size, 4);
  const firstMove = game.placeChineseCheckerMarble(state, game.indexOf(1, 2, 9), game.indexOf(1, 3, 9));
  assert.strictEqual(firstMove.changed, true);
  assert.strictEqual(firstMove.state.turn, 'yellow');

  const jumpPreset = {
    id: 'checkers-jump',
    label: 'checkers jump',
    lattice: 'square',
    rows: 1,
    cols: 5,
    surface: 'jump line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 5 }],
      yellowStart: [{ row: 1, col: 2 }, { row: 1, col: 4 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  let jumpState = game.beginChineseCheckersGame(jumpPreset);
  const moveMap = game.chineseCheckerMoveMap(jumpState, game.indexOf(1, 1, 5));
  assert.deepStrictEqual(moveMap.get(game.indexOf(1, 5, 5)).path, [
    game.indexOf(1, 1, 5),
    game.indexOf(1, 3, 5),
    game.indexOf(1, 5, 5)
  ]);
  const jumpResult = game.placeChineseCheckerMarble(jumpState, game.indexOf(1, 1, 5), game.indexOf(1, 5, 5));
  assert.strictEqual(jumpResult.changed, true);
  assert.strictEqual(jumpResult.state.phase, 'gameover');
  assert.strictEqual(jumpResult.state.winner, 'red');
  assert.deepStrictEqual(jumpResult.state.winningLine, []);

  jumpState = game.beginChineseCheckersGame({
    ...jumpPreset,
    removedTiles: [{ row: 1, col: 5 }]
  });
  const illegal = game.placeChineseCheckerMarble(jumpState, game.indexOf(1, 1, 5), game.indexOf(1, 5, 5));
  assert.strictEqual(illegal.changed, false);
  assert.strictEqual(illegal.message, 'target tile is removed');
}

function testChineseCheckersSuperJumpRulesAndSegments() {
  const superPreset = {
    id: 'checkers-super-jump',
    label: 'checkers super jump',
    lattice: 'square',
    rows: 1,
    cols: 5,
    surface: 'super jump line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 5 }],
      yellowStart: [{ row: 1, col: 3 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  let state = game.beginChineseCheckersGame(superPreset);
  let moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  let move = moveMap.get(game.indexOf(1, 5, 5));
  assert.ok(move);
  assert.strictEqual(move.kind, 'jump');
  assert.deepStrictEqual(move.path, [game.indexOf(1, 1, 5), game.indexOf(1, 5, 5)]);
  assert.strictEqual(move.segments[0].jumped, game.indexOf(1, 3, 5));
  assert.deepStrictEqual(move.segments[0].path, [
    game.indexOf(1, 1, 5),
    game.indexOf(1, 2, 5),
    game.indexOf(1, 3, 5),
    game.indexOf(1, 4, 5),
    game.indexOf(1, 5, 5)
  ]);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    chineseCheckersCamps: {
      ...superPreset.chineseCheckersCamps,
      yellowStart: [{ row: 1, col: 2 }]
    }
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    chineseCheckersCamps: {
      ...superPreset.chineseCheckersCamps,
      yellowStart: [{ row: 1, col: 3 }, { row: 1, col: 4 }]
    }
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    removedTiles: [{ row: 1, col: 4 }]
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  const gluedPreset = {
    id: 'checkers-super-glued',
    label: 'checkers super glued',
    lattice: 'square',
    rows: 1,
    cols: 6,
    surface: 'super glued line',
    removedTiles: [],
    cutEdges: [
      { left: { row: 1, col: 2 }, right: { row: 1, col: 3 } }
    ],
    gluedEdges: [
      { first: { row: 1, col: 2, dir: game.DIRS.E }, second: { row: 1, col: 4, dir: game.DIRS.W } }
    ],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 6 }],
      yellowStart: [{ row: 1, col: 4 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  state = game.beginChineseCheckersGame(gluedPreset);
  move = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 6)).get(game.indexOf(1, 6, 6));
  assert.ok(move);
  assert.strictEqual(move.segments[0].jumped, game.indexOf(1, 4, 6));
  assert.ok(move.segments[0].transitions.some((transition) => transition.glued));
}

function testPieceSetsInitializePlacementGames() {
  const goState = game.beginGoGame({
    id: 'piece-set-go',
    label: 'piece set go',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'piece set go',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: {
        black: [{ row: 1, col: 1 }],
        white: [{ row: 5, col: 5 }]
      },
      targets: {}
    }
  });
  assert.deepStrictEqual(goState.stones.map((stone) => [stone.index, stone.color]), [
    [game.indexOf(1, 1, 5), 'black'],
    [game.indexOf(5, 5, 5), 'white']
  ]);

  const reversiState = game.beginReversiGame({
    id: 'piece-set-reversi',
    label: 'piece set reversi',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'piece set reversi',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: {
        black: [{ row: 1, col: 1 }],
        white: [{ row: 1, col: 2 }]
      },
      targets: {}
    }
  });
  assert.deepStrictEqual(reversiState.discs.map((disc) => [disc.index, disc.color]), [
    [game.indexOf(1, 1, 4), 'black'],
    [game.indexOf(1, 2, 4), 'white']
  ]);

  const blackSolo = game.beginChineseCheckersGame({
    id: 'piece-set-checkers-black',
    label: 'piece set checkers black',
    lattice: 'square',
    rows: 1,
    cols: 2,
    surface: 'piece set checkers black',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: { black: [{ row: 1, col: 1 }] },
      targets: { black: [{ row: 1, col: 2 }] }
    }
  });
  assert.deepStrictEqual(blackSolo.playerColors, ['black']);
  assert.strictEqual(blackSolo.turn, 'black');
  assert.deepStrictEqual(blackSolo.marbles.map((marble) => marble.color), ['black']);
  const soloMove = game.placeChineseCheckerMarble(blackSolo, game.indexOf(1, 1, 2), game.indexOf(1, 2, 2));
  assert.strictEqual(soloMove.changed, true);
  assert.strictEqual(soloMove.state.phase, 'gameover');
  assert.strictEqual(soloMove.state.winner, 'black');
  assert.deepStrictEqual(soloMove.state.winningLine, []);

  const multi = game.beginChineseCheckersGame({
    id: 'piece-set-checkers-multi',
    label: 'piece set checkers multi',
    lattice: 'square',
    rows: 1,
    cols: 4,
    surface: 'piece set checkers multi',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersPlayers: ['green', 'black'],
    pieceSets: {
      starts: {
        green: [{ row: 1, col: 1 }],
        black: [{ row: 1, col: 4 }]
      },
      targets: {
        green: [{ row: 1, col: 4 }],
        black: [{ row: 1, col: 1 }]
      }
    }
  });
  assert.deepStrictEqual(multi.playerColors, ['green', 'black']);
  assert.strictEqual(multi.turn, 'green');
  const firstMove = game.placeChineseCheckerMarble(multi, game.indexOf(1, 1, 4), game.indexOf(1, 2, 4));
  assert.strictEqual(firstMove.changed, true);
  assert.strictEqual(firstMove.state.turn, 'black');
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

function testDiagonalLineCrossingTwoGluedEdgesUsesOnlyEndpointHalves() {
  const preset = {
    id: 'gomoku-diagonal-two-glued-render',
    label: 'gomoku diagonal two glued render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [
      { left: { row: 2, col: 1 }, right: { row: 2, col: 2 } }
    ],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 1, dir: game.DIRS.N }, second: { row: 2, col: 1, dir: game.DIRS.S } },
      { group: 1, first: { row: 2, col: 1, dir: game.DIRS.E }, second: { row: 2, col: 2, dir: game.DIRS.W } }
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
  assert.strictEqual(route.kind, 'diagonal');
  assert.deepStrictEqual(route.directions, [game.DIRS.N, game.DIRS.E]);
  assert.ok(route.transitions.every((transition) => transition.glued));
  const segments = game.placementLineRenderSegments(state, geom, from, to);
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.ok(segments[1].start.x > 4.7 && segments[1].start.x < 5.7);
  assert.ok(segments[1].start.y > 14.7);
}

function testImportedSelfGluedDiagonalWinRendersNoAxisSegments() {
  const preset = {
    id: 'imported-preset',
    label: '6x6 Sigma_0,1^1',
    lattice: 'square',
    rows: 6,
    cols: 6,
    surface: 'Sigma_0,1^1',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        reversed: false,
        firstArrowReversed: false,
        secondArrowReversed: true,
        first: { row: 1, col: 6, dir: game.DIRS.N },
        second: { row: 1, col: 6, dir: game.DIRS.E }
      }
    ],
    connectFourHoles: []
  };
  const state = game.createGomokuState(preset);
  state.phase = 'gameover';
  state.winner = 'black';
  state.winningLine = [16, 11, 5, 4, 9];
  state.stones = [
    { id: 5, index: 4, color: 'black' },
    { id: 1, index: 5, color: 'black' },
    { id: 7, index: 9, color: 'black' },
    { id: 3, index: 11, color: 'black' },
    { id: 9, index: 16, color: 'black' }
  ];
  const win = game.findGomokuWin(state, 16, 'black');
  assert.ok(win);
  assert.strictEqual(win.diagonal, true);
  assert.deepStrictEqual(win.line, state.winningLine);
  const geom = {
    cols: 6,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: Array.from({ length: 36 }, (_, index) => {
      const point = game.rowCol(index, 6);
      return {
        row: point.row,
        col: point.col,
        x: (point.col - 1) * 10,
        y: (point.row - 1) * 10
      };
    })
  };
  const pairRoute = game.placementLineTransitionRoute(state, 11, 5);
  assert.strictEqual(pairRoute.kind, 'axis');
  const segments = game.placementWinningLineSegments(state, geom);
  assert.strictEqual(segments.length, 8);
  segments.forEach((segment) => {
    assert.ok(Math.abs(segment.end.x - segment.start.x) > 0.1);
    assert.ok(Math.abs(segment.end.y - segment.start.y) > 0.1);
  });
}

function testGomokuCyclicReuseWin() {
  const state = boundaryGomokuState();
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
  const state = game.beginConnectFourGame(boundaryConnectFourPreset(), {
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
  const state = game.beginConnectFourGame(boundaryConnectFourPreset(), {
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
  [
    [game.BOUNDARY_GLUE_BOARD_PRESET_ID, 'boundary glue board'],
    ['twisted-torus', 'twisted torus'],
    ['gomoku-tic-tac-toe', 'Tic-tac-toe'],
    ['gomoku-strange-corner', 'strange corner'],
    ['gomoku-small-holes', 'small holes'],
    ['gomoku-big-hole', 'big hole'],
    ['gomoku-m4-15x15', 'genus 4'],
    ['rubiks-cube-2x2x2', "Rubik's Cube 2*2*2"],
    ['rubiks-cube-3x3x3', "Rubik's Cube 3*3*3"],
    ['connect-four-6x7', 'Connect Four 6*7'],
    ['connect-four-high-hit', 'high hit'],
    ['connect-four-high-hit-2', 'high hit2'],
    ['connect-four-all-horizontal', 'all horizontal'],
    ['connect-four-top-fight', 'top fight'],
    ['connect-four-exchange', 'exchange'],
    ['connect-four-across', 'across'],
    ['connect-four-usual-strip', 'usual strip'],
    ['connect-four-mobius-strip', 'M\u00f6bius strip'],
    ['connect-four-hex-usual-strip', 'hex usual strip'],
    ['connect-four-hex-bad-mobius-strip', 'hex bad M\u00f6bius strip'],
    ['connect-four-hex-good-mobius-strip', 'hex good M\u00f6bius strip'],
    ['usual-strip', 'usual strip'],
    ['mobius-strip', 'M\u00f6bius strip'],
    ['chinese-checkers-hex-rhombus-9x9', 'hex rhombus 9*9'],
    ['chinese-checkers-hex-strip-9x9', 'hex strip 9*9']
  ].forEach(([id, label]) => {
    assert.ok(presetRegistry.find((preset) => preset.id === id && preset.label === label));
    assert.ok(game.PRESETS.find((preset) => preset.id === id));
  });

  ['torus', 'klein-bottle', 'gomoku-classic', 'gomoku-random-glue'].forEach((id) => {
    assert.ok(!presetRegistry.some((preset) => preset.id === id), `${id} should not be registered`);
    assert.ok(!game.PRESETS.some((preset) => preset.id === id), `${id} should not be installed`);
  });

  assertPresetRegistryDefaults();

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

function assertPresetRegistryDefaults() {
  assert.ok(presetRegistrySource && !Array.isArray(presetRegistrySource));
  assert.ok(presetDefaultFor && typeof presetDefaultFor === 'object' && !Array.isArray(presetDefaultFor));
  assert.ok(Array.isArray(presetRegistry));
  assert.ok(presetRegistry.every((preset) => !Object.prototype.hasOwnProperty.call(preset, 'defaultFor')));
  assert.deepStrictEqual(presetRegistrySource.gameOrder, ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban']);
  const expected = {
    gomoku: game.BOUNDARY_GLUE_BOARD_PRESET_ID,
    go: 'three-slits',
    'connect-four': 'connect-four-exchange',
    '2048': 'ramified-cover',
    reversi: 'focus-frame',
    'chinese-checkers': 'octahedron-with-square-holes',
    sokoban: 'sokoban-square'
  };
  assert.deepStrictEqual(presetDefaultFor, expected);
  const expectedResolved = {
    gomoku: game.BOUNDARY_GLUE_BOARD_PRESET_ID,
    go: 'three-slits',
    'connect-four': 'connect-four-exchange',
    '2048': 'ramified-cover',
    reversi: 'focus-frame',
    'chinese-checkers': 'octahedron-with-square-holes',
    sokoban: 'sokoban-square'
  };
  Object.entries(expectedResolved).forEach(([mode, id]) => {
    const entry = presetRegistry.find((preset) => preset.id === id);
    assert.ok(entry, `missing default preset ${id}`);
    assert.ok(registryEntrySupportsMode(entry, mode), `${id} does not support ${mode}`);
  });
}

function registryEntrySupportsMode(entry, mode) {
  if (mode === '2048') return registryEntryHasGameType(entry, '2048');
  if (mode === 'gomoku') return registryEntryHasGameType(entry, 'Gomoku');
  if (mode === 'connect-four') return registryEntryHasGameType(entry, 'Connect Four');
  if (mode === 'go') return registryEntryHasGameType(entry, 'Go');
  if (mode === 'reversi') return registryEntryHasGameType(entry, 'Reversi');
  if (mode === 'chinese-checkers') return registryEntryHasGameType(entry, 'Chinese Checkers');
  if (mode === 'sokoban') return registryEntryHasGameType(entry, 'Sokoban');
  return false;
}

function testKeyboardMapping() {
  const squarePreset = game.createGameState('classic-4x4').preset;
  assert.strictEqual(game.dirFromKey('KeyW', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('KeyA', squarePreset), game.DIRS.W);
  assert.strictEqual(game.dirFromKey('KeyS', squarePreset), game.DIRS.S);
  assert.strictEqual(game.dirFromKey('KeyD', squarePreset), game.DIRS.E);
  assert.strictEqual(game.dirFromKey('w', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('ArrowUp', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('ArrowLeft', squarePreset), game.DIRS.W);

  const hexPreset = game.createGameState('hex-classic-4x4').preset;
  assert.strictEqual(game.dirFromKey('ArrowLeft', hexPreset), game.HEX_DIRS.W);
  assert.strictEqual(game.dirFromKey('ArrowRight', hexPreset), game.HEX_DIRS.E);
  assert.strictEqual(game.dirFromKey('ArrowUp', hexPreset), null);
  assert.strictEqual(game.dirFromKey('ArrowDown', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyW', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyE', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyA', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyD', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyZ', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyX', hexPreset), null);
}

function testHexMovePadUsesArrowGlyphs() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('--hex-move-size: 46px;'));
  assert.ok(html.includes('--hex-row-offset: 26px;'));
  assert.ok(html.includes('width: var(--hex-pad-width);'));
  assert.ok(html.includes('left: var(--hex-row-offset);'));
  assert.ok(html.includes('position: relative;'));
  assert.ok(html.includes('.hex-move-pad [data-move-dir="E"] { grid-column: 3; grid-row: 2; }'));
  assert.ok(html.includes('data-move-dir="N" aria-label="Move up" title="Move up (ArrowUp/W)">'));
  assert.ok(html.includes('data-move-dir="W" aria-label="Move left" title="Move left (ArrowLeft/A)">'));
  assert.ok(html.includes('data-move-dir="E" aria-label="Move right" title="Move right (ArrowRight/D)">'));
  assert.ok(html.includes('data-move-dir="S" aria-label="Move down" title="Move down (ArrowDown/S)">'));
  assert.ok(html.includes('data-move-dir="NW" aria-label="Move northwest" title="Move northwest (ArrowUp+ArrowLeft)">&#x2196;</button>'));
  assert.ok(html.includes('data-move-dir="NE" aria-label="Move northeast" title="Move northeast (ArrowUp+ArrowRight)">&#x2197;</button>'));
  assert.ok(html.includes('data-move-dir="W" aria-label="Move west" title="Move west (ArrowLeft)">&#x2190;</button>'));
  assert.ok(html.includes('data-move-dir="E" aria-label="Move east" title="Move east (ArrowRight)">&#x2192;</button>'));
  assert.ok(html.includes('data-move-dir="SW" aria-label="Move southwest" title="Move southwest (ArrowDown+ArrowLeft)">&#x2199;</button>'));
  assert.ok(html.includes('data-move-dir="SE" aria-label="Move southeast" title="Move southeast (ArrowDown+ArrowRight)">&#x2198;</button>'));
}

function testMosaicBackgroundExportAndMinigameImportControlsExist() {
  const minigameHtml = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const mosaicHtml = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  const minigameSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  assert.ok(!minigameHtml.includes('id="import-preset-toggle"'));
  assert.ok(minigameHtml.includes('id="game-mode-select"'));
  assert.ok(minigameHtml.includes('<option value="2048" selected>2048</option>'));
  assert.ok(minigameHtml.includes('<option value="gomoku">Gomoku</option>'));
  assert.ok(minigameHtml.includes('<option value="connect-four">Connect Four</option>'));
  assert.ok(minigameHtml.includes('<option value="go">Go</option>'));
  assert.ok(minigameHtml.includes('<option value="reversi">Reversi</option>'));
  assert.ok(minigameHtml.includes('<option value="chinese-checkers">Chinese Checkers</option>'));
  assert.ok(minigameHtml.includes('<option value="sokoban">Sokoban</option>'));
  assert.ok(minigameHtml.includes('<option value="__random-game-setup">Random setup</option>'));
  const gameSelectStart = minigameHtml.indexOf('id="game-mode-select"');
  const gameSelectEnd = minigameHtml.indexOf('</select>', gameSelectStart);
  const staticGameOptions = Array.from(minigameHtml.slice(gameSelectStart, gameSelectEnd).matchAll(/<option value="([^"]+)"/g), (match) => match[1]);
  assert.deepStrictEqual(staticGameOptions, ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban', game.RANDOM_GAME_MODE_CHOICE_ID]);
  assert.ok(minigameHtml.includes('<option value="">Loading presets...</option>'));
  assert.ok(minigameHtml.includes('id="boundary-glue-mode-row"'));
  assert.ok(minigameHtml.includes('id="boundary-glue-shape-row"'));
  assert.ok(minigameHtml.includes('id="boundary-glue-rect-row"'));
  assert.ok(minigameHtml.includes('<option value="rp2">RP^2</option>'));
  assert.ok(minigameHtml.includes('<option value="random">random boundary glue</option>'));
  assert.ok(minigameHtml.includes('<script src="ramified_minigame_presets/presets.js"></script>'));
  assert.ok(!minigameHtml.includes('<option value="twisted-torus">'));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, '2048')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Gomoku')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Connect Four')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Go')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Reversi')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Chinese Checkers')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Sokoban')));
  assert.ok(presetRegistry.every((preset) => Array.isArray(preset.gameTypes) && preset.gameTypes.length >= 1));
  const presetDir = require('path').resolve(__dirname, '..', 'ramified_minigame_presets');
  const presetFilesWithGameTypes = fs.readdirSync(presetDir)
    .filter((file) => file.endsWith('.preset.js'))
    .filter((file) => fs.readFileSync(require('path').join(presetDir, file), 'utf8').includes('"gameTypes"'));
  assert.deepStrictEqual(presetFilesWithGameTypes, [
    'classic_chinese_checkers.preset.js',
    'dodecahedron_with_pentagon_holes.preset.js',
    'focus_frame.preset.js',
    'octahedron_with_square_glues.preset.js',
    'octahedron_with_square_holes.preset.js',
    'three_slits.preset.js',
    'tunnels.preset.js'
  ]);
  assert.ok(minigameHtml.includes('id="gomoku-size-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="sokoban-object-size" min="54" max="96" step="2" value="70"'));
  assert.ok(minigameHtml.includes('<output id="sokoban-object-size-value">70%</output>'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-inner" min="0" max="100" step="5" value="55"'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-outer" min="0" max="100" step="5" value="82"'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-blur" min="0" max="100" step="5" value="38"'));
  assert.ok(minigameHtml.includes('id="sokoban-beam-width" min="20" max="110" step="5" value="70"'));
  assert.ok(minigameHtml.includes('id="sokoban-beam-opacity" min="5" max="80" step="5" value="34"'));
  assert.ok(minigameHtml.includes('id="gomoku-board-size"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-style"'));
  assert.ok(minigameHtml.includes('id="go-komi-row" data-mode-control="go"'));
  assert.ok(minigameHtml.includes('id="go-komi"'));
  assert.ok(minigameHtml.includes('id="go-action-row" data-mode-control="go"'));
  assert.ok(minigameHtml.includes('id="go-pass"'));
  assert.ok(minigameHtml.includes('<option value="vertex" selected>gridded board</option>'));
  assert.ok(minigameHtml.includes('<option value="center">tile board</option>'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-row" data-mode-control="connect-four"'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-dir"'));
  assert.ok(minigameHtml.includes('id="connect-four-align-row" data-mode-control="connect-four"'));
  assert.ok(minigameHtml.includes('id="connect-four-align-fall" checked'));
  assert.ok(minigameHtml.includes('id="game-setup-alert"'));
  assert.ok(minigameHtml.includes('Import / Export'));
  assert.ok(minigameHtml.includes('Game Setup</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('Import / Export</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('Game Stats</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('id="import-game-mode"'));
  assert.ok(minigameHtml.includes('id="import-preset-source"'));
  assert.ok(minigameHtml.includes('id="import-preset-catalog"'));
  assert.ok(minigameHtml.includes('id="import-preset-input"'));
  assert.ok(minigameHtml.includes('id="apply-import-preset"'));
  assert.ok(minigameHtml.includes('id="export-state-kind"'));
  assert.ok(minigameHtml.includes('id="export-background-format"'));
  assert.ok(minigameHtml.includes('id="import-state"'));
  assert.ok(!minigameHtml.includes('id="debug-export-output" readonly'));
  const importExportSection = minigameHtml.slice(
    minigameHtml.indexOf('Import / Export'),
    minigameHtml.indexOf('Game Stats')
  );
  assert.ok(importExportSection.includes('class="minigame-subpanel" id="import-preset-tools"'));
  assert.ok(importExportSection.includes('class="minigame-action-grid"'));
  assert.ok(importExportSection.includes('class="mosaic-editor-input minigame-status-export"'));
  assert.ok(!importExportSection.includes('mosaic-debug-panel'));
  assert.ok(minigameSource.includes("document.querySelectorAll('.card-head')"));
  assert.ok(minigameSource.includes("card.classList.toggle('collapsed')"));
  assert.ok(minigameHtml.includes('id="step-mode-row" data-mode-control="2048"'));
  assert.ok(minigameHtml.includes('<option value="">empty</option>'));
  assert.ok(!mosaicHtml.includes('id="export-background-preset"'));
  assert.ok(mosaicHtml.includes('id="export-type"'));
  assert.ok(mosaicHtml.includes('<option value="minigame">For minigames</option>'));
  assert.ok(mosaicHtml.includes('id="export-format"'));
  assert.ok(mosaicHtml.includes('<option value="dsl" selected>DSL-style</option>'));
  assert.ok(mosaicHtml.includes('id="export-preset-id"'));
  assert.ok(mosaicHtml.includes('File key'));
  assert.ok(mosaicHtml.includes('Display name'));
  assert.ok(mosaicHtml.includes('id="export-preset-advanced"'));
  assert.ok(mosaicHtml.includes('id="export-preset-advanced-row" hidden'));
  assert.ok(!mosaicHtml.includes('id="export-preset-custom-key"'));
  assert.ok(mosaicHtml.includes('id="export-preset-group-row"'));
  assert.ok(mosaicHtml.includes('.export-meta-field[hidden]'));
  assert.ok(mosaicHtml.includes('Game type'));
  assert.ok(mosaicHtml.includes('id="export-preset-groups"'));
  assert.ok(mosaicHtml.includes('<select id="export-preset-group"'));
  assert.ok(mosaicHtml.includes('<option value="Connect Four">Connect Four</option>'));
  assert.ok(mosaicHtml.includes('id="export-test-link"'));
  assert.ok(mosaicHtml.includes('<script src="ramified_minigame_presets/presets.js"></script>'));
  assert.ok(mosaicHtml.includes('<option value="decoration">Add / remove decorations</option>'));
  assert.ok(mosaicHtml.includes('id="background-decoration-kind"'));
  assert.ok(mosaicHtml.includes('id="background-decoration-color"'));
}

function testCardHeadersCollapse() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  let clickHandler = null;
  let collapsed = false;
  const card = {
    classList: {
      toggle(name) {
        assert.strictEqual(name, 'collapsed');
        collapsed = !collapsed;
      }
    }
  };
  const head = {
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    },
    closest(selector) {
      return selector === '.card' ? card : null;
    }
  };
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Math,
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '.card-head' ? [head] : [];
      },
      addEventListener(type, handler) {
        if (type === 'DOMContentLoaded') handler();
      }
    },
    window: {
      addEventListener() {}
    }
  };
  vm.runInNewContext(source, context);
  assert.strictEqual(typeof clickHandler, 'function');
  clickHandler({ target: { closest: () => null } });
  assert.strictEqual(collapsed, true);
  clickHandler({ target: { closest: () => null } });
  assert.strictEqual(collapsed, false);
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

function testPresetFromMosaicPresetJsWrapper() {
  const source = [
    '// Save this file as ramified_minigame_presets/wrapped_export.preset.js',
    '// Add this entry to ramified_minigame_presets/presets.js:',
    '(function(root, factory) {',
    '  const preset = factory();',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = preset;",
    '  if (root) {',
    '    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};',
    '    root.RAMIFIED_MINIGAME_PRESET_DATA.wrapped_export = preset;',
    '  }',
    "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {",
    '  return {',
    '    "id": "wrapped-export",',
    '    "label": "Wrapped Export",',
    '    "lattice": "square",',
    '    "size": "4x4",',
    '    "surface": "wrapper test",',
    '    "holes": "top"',
    '  };',
    '});'
  ].join('\n');
  assert.ok(game.extractReturnedPresetObjectText(source).includes('"id": "wrapped-export"'));
  const preset = game.presetFromImportText(source);
  assert.strictEqual(preset.id, 'imported-preset');
  assert.strictEqual(preset.sourceId, 'wrapped-export');
  assert.strictEqual(preset.label, 'Wrapped Export');
  assert.deepStrictEqual(preset.gameTypes, []);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(preset.connectFourHoles.length, 4);
}

function testUrlMinigamePresetImport() {
  const payload = {
    id: 'url-connect',
    label: 'URL Connect',
    gameTypes: ['Connect Four'],
    lattice: 'square',
    size: '4x4',
    surface: 'url test',
    holes: 'top'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=connect-four`,
    randoms: [0.99, 0]
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'connect-four');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported from link');
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'URL Connect'
  )));
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.label, 'URL Connect');
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
  assert.strictEqual(exported.preset.connectFourHoles.length, 4);
}

function testUrlMinigamePresetImportInfersModeFromGroup() {
  const payload = {
    id: 'url-gomoku',
    label: 'URL Gomoku',
    group: 'Gomoku',
    lattice: 'square',
    size: '5x5',
    surface: 'url inferred'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({ locationSearch: `?minigamePreset=${encoded}` });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported from link');
  elements.get('begin-game').listeners.click();
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.label, 'URL Gomoku');
  assert.strictEqual(exported.preset.gameTypes, undefined);
}

function testMultiGroupImportedPresetFiltering() {
  const payload = {
    id: 'url-shared',
    label: 'URL Shared',
    gameTypes: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '5x5',
    surface: 'shared surface'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=gomoku`
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');

  elements.get('game-mode-select').value = '2048';
  elements.get('game-mode-select').listeners.change();
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'URL Shared'
  )));

  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  assert.ok(!elements.get('surface-preset-select').options.some((option) => option.value === 'imported-preset'));
}

function testLegacyGroupsImportedPresetFiltering() {
  const payload = {
    id: 'url-shared-legacy',
    label: 'URL Shared Legacy',
    group: '2048',
    groups: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '5x5',
    surface: 'shared legacy surface'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=gomoku`
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
}

function testGameTypesTakePrecedenceOverLegacyGroups() {
  const preset = game.normalizePresetPayload({
    id: 'game-types-first',
    label: 'Game Types First',
    gameTypes: ['Connect Four'],
    group: '2048',
    groups: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '4x4',
    surface: 'precedence'
  });
  assert.deepStrictEqual(preset.gameTypes, ['Connect Four']);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(game.gameModeFromPresetGroup(preset), game.GAME_MODES.CONNECT_FOUR);
}

function testCompactPresetDslParser() {
  const preset = game.normalizePresetPayload({
    id: 'compact-test',
    label: 'compact test',
    group: '2048',
    lattice: 'square',
    size: '4x4',
    surface: 'compact surface',
    removed: 'rect(2..3,2..3); 1,1',
    holes: 'top',
    cuts: '1,2=1,3',
    glue: 'g7:1..2,4,E=1..2,1,W; g8~00:1,1,N=4,4,S'
  });
  assert.strictEqual(preset.id, 'compact-test');
  assert.deepStrictEqual(preset.gameTypes, ['2048']);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(preset.rows, 4);
  assert.strictEqual(preset.cols, 4);
  assert.deepStrictEqual(preset.removedTiles, [
    { row: 1, col: 1 },
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 3, col: 2 },
    { row: 3, col: 3 }
  ]);
  assert.deepStrictEqual(preset.connectFourHoles, [
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 1, col: 4 }
  ]);
  assert.deepStrictEqual(preset.cutEdges, [{ left: { row: 1, col: 2 }, right: { row: 1, col: 3 } }]);
  assert.strictEqual(preset.gluedEdges.length, 3);
  assert.strictEqual(preset.gluedEdges[0].group, 7);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.DIRS.E);
  assert.strictEqual(preset.gluedEdges[2].reversed, true);
  assert.strictEqual(preset.gluedEdges[2].firstArrowReversed, false);
  assert.strictEqual(preset.gluedEdges[2].secondArrowReversed, false);

  const rubiks = game.normalizePresetPayload({
    id: 'compact-rubiks',
    label: 'compact Rubik',
    group: '2048',
    generator: 'rubiksCube',
    cubeSize: 2
  });
  assert.strictEqual(rubiks.rows, 6);
  assert.deepStrictEqual(rubiks.gameTypes, ['2048']);
  assert.strictEqual(rubiks.cols, 8);
  assert.strictEqual(rubiks.removedTiles.length, 24);
  assert.strictEqual(rubiks.gluedEdges.length, 14);

  assert.throws(
    () => game.normalizePresetPayload({
      id: 'bad-glue',
      label: 'bad glue',
      lattice: 'square',
      size: '2x2',
      glue: 'g0:1..2,1,E=1,2,W'
    }),
    /mismatched ranges/
  );
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
    tagName: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    attributes: {},
    textContent: '',
    label: '',
    children: [],
    options: [],
    style: {},
    clientWidth: 720,
    parentElement: null,
    listeners: {},
    get innerHTML() {
      return this._innerHTML || '';
    },
    set innerHTML(value) {
      this._innerHTML = String(value || '');
      this.children = [];
      this.options = [];
    },
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
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      if (child.tagName === 'OPTION') {
        this.options.push(child);
      } else if (Array.isArray(child.options)) {
        this.options.push(...child.options);
      }
      return child;
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

function createHeadlessDomHarness(options = {}) {
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
  const moveButtons = ['N', 'W', 'E', 'S', 'NW', 'NE', 'SW', 'SE'].map(makeMoveButton);
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
    makeElement('connect-four-fall-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } }),
    makeElement('connect-four-align-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } })
  ];
  const modeGoControls = [
    makeElement('go-komi-row', { hidden: true, attributes: { 'data-mode-control': 'go' } }),
    makeElement('go-action-row', { hidden: true, attributes: { 'data-mode-control': 'go' } })
  ];
  const modeChineseCheckersControls = [
    makeElement('chinese-checkers-player-row', { hidden: true, attributes: { 'data-mode-control': 'chinese-checkers' } })
  ];
  const modeSokobanControls = [
    makeElement('sokoban-object-size-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-inner-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-outer-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-blur-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-beam-width-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-beam-opacity-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } })
  ];
  const canvas = makeElement('mosaic-canvas', {
    parentElement: wrap,
    getContext() {
      return ctx;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 288, height: 288 };
    },
    setPointerCapture(pointerId) {
      calls.push({ method: 'setPointerCapture', args: [pointerId] });
    },
    releasePointerCapture(pointerId) {
      calls.push({ method: 'releasePointerCapture', args: [pointerId] });
    }
  });
  [
    canvas,
    makeElement('game-mode-select', { value: options.gameMode || '2048' }),
    makeElement('surface-preset-select', { value: options.preset || 'classic-4x4' }),
    makeElement('import-preset-toggle'),
    makeElement('import-preset-tools'),
    makeElement('import-keep-game-mode', { checked: options.importKeepGameMode !== false }),
    makeElement('import-game-mode', { value: options.importGameMode || options.gameMode || '2048' }),
    makeElement('import-preset-source', { value: options.importSource || 'catalog' }),
    makeElement('import-preset-catalog-row'),
    makeElement('import-preset-catalog'),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('boundary-glue-mode-row', { hidden: true }),
    makeElement('boundary-glue-mode', { value: 'torus' }),
    makeElement('boundary-glue-shape-row', { hidden: true }),
    makeElement('boundary-glue-shape', { value: 'square' }),
    makeElement('boundary-glue-rect-row', { hidden: true }),
    makeElement('boundary-glue-rows', { value: '15' }),
    makeElement('boundary-glue-cols', { value: '15' }),
    makeElement('gomoku-board-size', { value: '15' }),
    makeElement('gomoku-display-style', { value: 'vertex' }),
    makeElement('go-komi', { value: '6.5' }),
    makeElement('go-pass'),
    makeElement('connect-four-fall-dir', {
      value: 'S',
      options: ['S', 'E', 'W', 'N', 'SE', 'SW', 'NW', 'NE'].map((value) => ({ value, textContent: '', hidden: false, disabled: false }))
    }),
    makeElement('connect-four-align-fall', { checked: true }),
    makeElement('sokoban-object-size', { value: '70' }),
    makeElement('sokoban-object-size-value'),
    makeElement('sokoban-glow-inner', { value: '55' }),
    makeElement('sokoban-glow-inner-value'),
    makeElement('sokoban-glow-outer', { value: '82' }),
    makeElement('sokoban-glow-outer-value'),
    makeElement('sokoban-glow-blur', { value: '38' }),
    makeElement('sokoban-glow-blur-value'),
    makeElement('sokoban-beam-width', { value: '70' }),
    makeElement('sokoban-beam-width-value'),
    makeElement('sokoban-beam-opacity', { value: '34' }),
    makeElement('sokoban-beam-opacity-value'),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('highlight-new-boxes', { checked: true }),
    makeElement('begin-game'),
    makeElement('game-setup-alert', { hidden: true }),
    makeElement('animation-speed', { value: '80' }),
    makeElement('animation-speed-value'),
    makeElement('step-mode', { checked: !!options.stepMode }),
    makeElement('next-step'),
    makeElement('debug-toggle'),
    makeElement('debug-tools'),
    makeElement('debug-tile-value', { value: '128' }),
    makeElement('undo-step'),
    makeElement('redo-step'),
    makeElement('export-state'),
    makeElement('import-state'),
    makeElement('debug-export-output'),
    makeElement('export-state-kind', { value: options.exportKind || 'status' }),
    makeElement('export-background-format-row', { hidden: true }),
    makeElement('export-background-format', { value: options.exportFormat || 'dsl' }),
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
  modeGoControls.forEach((control) => elements.set(control.id, control));
  modeChineseCheckersControls.forEach((control) => elements.set(control.id, control));
  modeSokobanControls.forEach((control) => elements.set(control.id, control));

  const documentListeners = {};
  const windowListeners = {};
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Buffer,
    Math: Object.create(Math),
    performance: { now: () => 0 },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    URLSearchParams,
    document: {
      getElementById(id) {
        return elements.get(id) || null;
      },
      createElement(tagName) {
        return makeElement('', { tagName: String(tagName || '').toUpperCase() });
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
        if (selector === '[data-mode-control="go"]') return modeGoControls;
        if (selector === '[data-mode-control="chinese-checkers"]') return modeChineseCheckersControls;
        if (selector === '[data-mode-control="sokoban"]') return modeSokobanControls;
        return [];
      }
    },
    window: {
      devicePixelRatio: 1,
      location: { search: options.locationSearch || '' },
      RAMIFIED_MINIGAME_PRESETS: presetRegistrySource,
      RAMIFIED_MINIGAME_PRESET_DATA: presetDataByKey,
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
  let randoms = (options.randoms || [0.5, 0.5, 0, 0.1, 0.2, 0.1, 0.3, 0.1]).slice();
  context.Math.random = () => (randoms.length ? randoms.shift() : 0.1);
  vm.runInNewContext(source, context);
  return { elements, canvas, moveButtons, documentListeners, windowListeners, calls, context };
}

function pointerEvent(x, y, extra = {}) {
  return {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra
  };
}

function swipeCanvas(canvas, startX, startY, endX, endY, extra = {}) {
  const pointerId = extra.pointerId || 1;
  canvas.listeners.pointerdown(pointerEvent(startX, startY, { ...extra, pointerId }));
  canvas.listeners.pointermove(pointerEvent(endX, endY, { ...extra, pointerId }));
  const up = pointerEvent(endX, endY, { ...extra, pointerId });
  canvas.listeners.pointerup(up);
  return up;
}

function keyboardEvent(code, extra = {}) {
  return {
    code,
    key: code,
    repeat: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra
  };
}

function pressKey(documentListeners, code, extra = {}) {
  const event = keyboardEvent(code, extra);
  documentListeners.keydown(event);
  return event;
}

function releaseKey(documentListeners, code, extra = {}) {
  const event = keyboardEvent(code, extra);
  documentListeners.keyup(event);
  return event;
}

function enableHeadlessDebug(elements) {
  if (elements.get('debug-toggle').attributes['aria-pressed'] !== 'true') {
    elements.get('debug-toggle').listeners.click();
  }
}

function importHeadlessStatus(elements, payload) {
  enableHeadlessDebug(elements);
  elements.get('debug-export-output').value = JSON.stringify(payload);
  elements.get('import-state').listeners.click();
}

function encodeBase64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function singleSquareBoxStatus() {
  const preset = game.createGameState('classic-4x4').preset;
  return {
    preset,
    phase: 'ready',
    round: 0,
    score: 0,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 2, col: 2, value: 2 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
}

function singleHexBoxStatus() {
  const preset = game.createGameState('hex-classic-4x4').preset;
  return {
    preset,
    phase: 'ready',
    round: 0,
    score: 0,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 2, col: 2, value: 2 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
}

function testSquareWasdKeyboardControls() {
  [
    ['KeyW', 'up'],
    ['KeyA', 'left'],
    ['KeyS', 'down'],
    ['KeyD', 'right']
  ].forEach(([key, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleSquareBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testActiveSquareKeyboardPreventsPageScroll() {
  [
    ['ArrowUp', 'up'],
    ['ArrowLeft', 'left'],
    ['ArrowDown', 'down'],
    ['ArrowRight', 'right'],
    ['KeyW', 'up'],
    ['KeyA', 'left'],
    ['KeyS', 'down'],
    ['KeyD', 'right']
  ].forEach(([key, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleSquareBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testHexArrowKeyboardControls() {
  [
    [['ArrowLeft'], 'west'],
    [['ArrowRight'], 'east'],
    [['ArrowUp', 'ArrowLeft'], 'northwest'],
    [['ArrowUp', 'ArrowRight'], 'northeast'],
    [['ArrowDown', 'ArrowLeft'], 'southwest'],
    [['ArrowDown', 'ArrowRight'], 'southeast']
  ].forEach(([keys, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    keys.forEach((key) => {
      const event = pressKey(documentListeners, key);
      assert.strictEqual(event.defaultPrevented, true);
    });
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testActiveHexKeyboardPreventsPageScroll() {
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach((key) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
  });
}

function testHexVerticalArrowAloneDoesNotMove() {
  ['ArrowUp', 'ArrowDown'].forEach((key) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('round-value').textContent, '0');
    assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  });
}

function testHexKeyboardStateClearsOnKeyupAndBlur() {
  let harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleHexBoxStatus());
  pressKey(harness.documentListeners, 'ArrowUp');
  releaseKey(harness.documentListeners, 'ArrowUp');
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: east');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleHexBoxStatus());
  pressKey(harness.documentListeners, 'ArrowDown');
  harness.windowListeners.blur();
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: east');
}

function testKeyboardPreventsScrollWhileBusyWithoutMovingAgain() {
  let harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleSquareBoxStatus());
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'moving');
  const animatingEvent = pressKey(harness.documentListeners, 'ArrowLeft');
  assert.strictEqual(animatingEvent.defaultPrevented, true);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');

  harness = createHeadlessDomHarness({ stepMode: true });
  importHeadlessStatus(harness.elements, singleSquareBoxStatus());
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'step');
  const pausedEvent = pressKey(harness.documentListeners, 'ArrowLeft');
  assert.strictEqual(pausedEvent.defaultPrevented, true);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
}

function testKeyboardAllowsPageScrollOutsideActive2048() {
  let harness = createHeadlessDomHarness();
  let event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, {
    preset: { label: 'over', lattice: 'square', rows: 4, cols: 4, surface: 'over' },
    phase: 'gameover',
    ending: 'bonus',
    round: 5,
    score: 0,
    nextBoxId: 1,
    boxes: [],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '5');

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'gomoku';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'connect-four';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');
}

function testKeyboardShortcutsUndoRedoAndReset() {
  let harness = createHeadlessDomHarness();
  let { elements, canvas, documentListeners } = harness;
  elements.get('game-mode-select').value = 'gomoku';
  elements.get('game-mode-select').listeners.change();
  elements.get('begin-game').listeners.click();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 1);
  assert.strictEqual(elements.get('redo-step').disabled, true);

  event = pressKey(documentListeners, 'KeyZ');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(elements.get('redo-step').disabled, false);

  event = pressKey(documentListeners, 'KeyY');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 1);
  assert.strictEqual(elements.get('undo-step').disabled, false);

  event = pressKey(documentListeners, 'KeyZ', { target: { tagName: 'TEXTAREA' } });
  assert.strictEqual(event.defaultPrevented, false);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 1);

  event = pressKey(documentListeners, 'KeyR');
  assert.strictEqual(event.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'reset complete');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(exported.round, 0);
  assert.strictEqual(elements.get('undo-step').disabled, true);
  assert.strictEqual(elements.get('redo-step').disabled, true);

  harness = createHeadlessDomHarness();
  ({ elements, documentListeners } = harness);
  importHeadlessStatus(elements, singleSquareBoxStatus());
  pressKey(documentListeners, 'ArrowRight');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  event = pressKey(documentListeners, 'KeyR');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'ready');
  assert.strictEqual(exported.round, 0);
}

function testSwipeRightMovesSquare2048() {
  const { elements, canvas, moveButtons } = createHeadlessDomHarness();
  assert.strictEqual(typeof canvas.listeners.pointerdown, 'function');
  assert.strictEqual(typeof canvas.listeners.pointermove, 'function');
  assert.strictEqual(typeof canvas.listeners.pointerup, 'function');
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('info-line').textContent, 'use arrow keys, buttons, or swipe/drag to slide');
  const up = swipeCanvas(canvas, 40, 40, 80, 40);
  assert.strictEqual(up.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
  assert.strictEqual(elements.get('status-badge').textContent, 'moving');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  assert.ok(moveButtons.every((button) => button.disabled));
}

function testShortSwipeDoesNotMove() {
  const { elements, canvas } = createHeadlessDomHarness();
  elements.get('begin-game').listeners.click();
  const up = swipeCanvas(canvas, 40, 40, 47, 43);
  assert.strictEqual(up.defaultPrevented, false);
  assert.strictEqual(elements.get('round-value').textContent, '0');
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
}

function testSwipeSuppressesFollowupClick() {
  const { elements, canvas } = createHeadlessDomHarness({ stepMode: true });
  elements.get('begin-game').listeners.click();
  enableHeadlessDebug(elements);
  swipeCanvas(canvas, 40, 40, 80, 40);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
  assert.strictEqual(elements.get('status-badge').textContent, 'step');
  const click = pointerEvent(57, 57);
  canvas.listeners.click(click);
  assert.strictEqual(click.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
}

function testSwipeIgnoredOutsideAccepting2048() {
  let harness = createHeadlessDomHarness();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');

  harness = createHeadlessDomHarness();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: right');
  swipeCanvas(harness.canvas, 80, 40, 40, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: right');

  harness = createHeadlessDomHarness({ stepMode: true });
  harness.elements.get('begin-game').listeners.click();
  enableHeadlessDebug(harness.elements);
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  swipeCanvas(harness.canvas, 80, 40, 40, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'step');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, {
    preset: { label: 'over', lattice: 'square', rows: 4, cols: 4, surface: 'over' },
    phase: 'gameover',
    ending: 'bonus',
    round: 5,
    score: 0,
    nextBoxId: 1,
    boxes: [],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  let exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.round, 5);

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'gomoku';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(exported.round, 0);

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'connect-four';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.tokens.length, 0);
  assert.strictEqual(exported.round, 0);
}

function testHexSwipeDirections() {
  [
    ['east', 36, 0],
    ['southeast', 24, 36],
    ['southwest', -24, 36],
    ['west', -36, 0],
    ['northwest', -24, -36],
    ['northeast', 24, -36]
  ].forEach(([label, dx, dy]) => {
    const { elements, canvas } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    swipeCanvas(canvas, 100, 100, 100 + dx, 100 + dy);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testDynamicPresetCatalogOptions() {
  const { elements } = createHeadlessDomHarness();
  const gameSelect = elements.get('game-mode-select');
  const select = elements.get('surface-preset-select');
  assert.deepStrictEqual(
    gameSelect.options.map((option) => option.value),
    ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban', game.RANDOM_GAME_MODE_CHOICE_ID]
  );
  assert.deepStrictEqual(game.orderedCatalogGameModes(), ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban']);
  assert.strictEqual(select.disabled, false);
  assert.strictEqual(select.value, 'ramified-cover');
  assert.strictEqual(select.options[0].value, game.RANDOM_PRESET_CHOICE_ID);
  assert.strictEqual(select.options[0].textContent, 'Random preset');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['2048']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID && option.textContent === 'boundary glue board'));
  assert.ok(select.options.some((option) => option.value === 'ramified-cover'));
  assert.ok(!select.options.some((option) => ['torus', 'klein-bottle', 'gomoku-classic', 'gomoku-random-glue'].includes(option.value)));
  assert.ok(!select.options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!select.options.some((option) => option.value === 'import-preset'));
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-shape-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode').value, 'torus');
  assert.strictEqual(elements.get('gomoku-board-size').value, '5');

  gameSelect.value = 'gomoku';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Gomoku']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'gomoku-small-holes'));
  assert.ok(!select.options.some((option) => ['torus', 'gomoku-classic', 'gomoku-random-glue'].includes(option.value)));
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, false);
  elements.get('boundary-glue-shape').value = 'rectangle';
  elements.get('boundary-glue-shape').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, false);
  elements.get('boundary-glue-rows').value = '8';
  elements.get('boundary-glue-cols').value = '11';
  elements.get('boundary-glue-rows').listeners.change();
  let exported = null;
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.preset.rows, 8);
  assert.strictEqual(exported.preset.cols, 11);
  elements.get('boundary-glue-shape').value = 'square';
  elements.get('boundary-glue-shape').listeners.change();
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, true);

  gameSelect.value = 'connect-four';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'connect-four-exchange');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Connect Four']
  );
  assert.ok(select.options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);

  gameSelect.value = 'go';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'three-slits');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Go']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'three-slits'));
  assert.strictEqual(elements.get('go-komi-row').hidden, false);
  assert.strictEqual(elements.get('go-action-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-board-size').value, '19');

  gameSelect.value = 'reversi';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'focus-frame');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Reversi']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'focus-frame'));
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-board-size').value, '10');
  assert.strictEqual(elements.get('go-komi-row').hidden, true);

  gameSelect.value = 'chinese-checkers';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'octahedron-with-square-holes');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Chinese Checkers']
  );
  assert.ok(select.options.some((option) => option.value === 'octahedron-with-square-holes'));
  assert.ok(!select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!select.options.some((option) => option.value === 'gomoku-classic'));

  gameSelect.value = 'sokoban';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'sokoban-square');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Sokoban']
  );
  assert.strictEqual(elements.get('sokoban-object-size').value, '70');
  assert.strictEqual(elements.get('sokoban-object-size-value').textContent, '70%');
  assert.strictEqual(elements.get('sokoban-object-size-row').hidden, false);
  assert.strictEqual(elements.get('sokoban-glow-inner-value').textContent, '55%');
  assert.strictEqual(elements.get('sokoban-glow-outer-value').textContent, '82%');
  assert.strictEqual(elements.get('sokoban-glow-blur-value').textContent, '38%');
  assert.strictEqual(elements.get('sokoban-beam-width-value').textContent, '70%');
  assert.strictEqual(elements.get('sokoban-beam-opacity-value').textContent, '34%');
  assert.strictEqual(elements.get('sokoban-glow-inner-row').hidden, false);
  assert.strictEqual(elements.get('sokoban-beam-width-row').hidden, false);
}

function testRandomSetupAndPresetOptions() {
  const firstSokobanPreset = game.randomPresetForMode('sokoban', () => 0);
  const middleSokobanPreset = game.randomPresetForMode('sokoban', () => 0.5);
  assert.ok(firstSokobanPreset);
  assert.ok(middleSokobanPreset);
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === firstSokobanPreset.id), 'sokoban'));
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === middleSokobanPreset.id), 'sokoban'));

  let rolls = [0.99, 0];
  const choice = game.randomSetupChoice(() => rolls.shift());
  assert.strictEqual(choice.mode, 'sokoban');
  assert.strictEqual(choice.preset.id, firstSokobanPreset.id);

  let harness = createHeadlessDomHarness({ randoms: [0.99, 0] });
  let gameSelect = harness.elements.get('game-mode-select');
  let presetSelect = harness.elements.get('surface-preset-select');
  assert.strictEqual(gameSelect.value, 'sokoban');
  assert.strictEqual(presetSelect.value, firstSokobanPreset.id);
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(harness.elements.get('begin-game').textContent, 'begin the game');

  harness = createHeadlessDomHarness({ randoms: [0.5, 0.5, 0.99, 0] });
  gameSelect = harness.elements.get('game-mode-select');
  presetSelect = harness.elements.get('surface-preset-select');
  gameSelect.value = game.RANDOM_GAME_MODE_CHOICE_ID;
  gameSelect.listeners.change();
  assert.strictEqual(gameSelect.value, 'sokoban');
  assert.strictEqual(presetSelect.value, firstSokobanPreset.id);
  assert.ok(![game.RANDOM_GAME_MODE_CHOICE_ID, game.RANDOM_PRESET_CHOICE_ID].includes(gameSelect.value));
  assert.ok(![game.RANDOM_GAME_MODE_CHOICE_ID, game.RANDOM_PRESET_CHOICE_ID].includes(presetSelect.value));

  harness = createHeadlessDomHarness({ randoms: [0.5, 0.5, 0.999] });
  gameSelect = harness.elements.get('game-mode-select');
  presetSelect = harness.elements.get('surface-preset-select');
  gameSelect.value = 'connect-four';
  gameSelect.listeners.change();
  presetSelect.value = game.RANDOM_PRESET_CHOICE_ID;
  presetSelect.listeners.change();
  assert.strictEqual(gameSelect.value, 'connect-four');
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === presetSelect.value), 'connect-four'));
  assert.notStrictEqual(presetSelect.value, game.RANDOM_PRESET_CHOICE_ID);

  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const importGameStart = html.indexOf('id="import-game-mode"');
  const importGameEnd = html.indexOf('id="import-preset-source"', importGameStart);
  assert.ok(importGameStart >= 0 && importGameEnd > importGameStart);
  assert.ok(!html.slice(importGameStart, importGameEnd).includes(game.RANDOM_GAME_MODE_CHOICE_ID));
}

function testImportExportCardDefaultsAndCatalogImport() {
  const { elements } = createHeadlessDomHarness();
  assert.strictEqual(elements.get('import-game-mode').value, '2048');
  assert.strictEqual(elements.get('import-keep-game-mode').checked, true);
  assert.strictEqual(elements.get('import-preset-source').value, 'catalog');
  assert.strictEqual(elements.get('import-preset-catalog-row').hidden, false);
  assert.strictEqual(elements.get('import-preset-input').hidden, true);
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'classic-4x4'));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'connect-four-6x7'));

  elements.get('import-game-mode').value = 'connect-four';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'classic-4x4'));
  elements.get('import-preset-catalog').value = 'connect-four-6x7';
  elements.get('import-keep-game-mode').checked = false;
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('game-mode-select').value, 'connect-four');
  assert.strictEqual(elements.get('surface-preset-select').value, 'connect-four-6x7');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported');

  elements.get('import-game-mode').value = 'go';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'gomoku-classic'));

  elements.get('import-game-mode').value = 'reversi';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'gomoku-classic'));

  elements.get('import-game-mode').value = 'chinese-checkers';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'chinese-checkers-hex-rhombus-9x9'));
}

function testImportExportCardPastedPresetMode() {
  const { elements } = createHeadlessDomHarness();
  elements.get('import-keep-game-mode').checked = false;
  elements.get('import-game-mode').value = 'gomoku';
  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  assert.strictEqual(elements.get('import-preset-catalog-row').hidden, true);
  assert.strictEqual(elements.get('import-preset-input').hidden, false);
  elements.get('import-preset-input').value = JSON.stringify({
    id: 'paste-test',
    label: 'Pasted Test',
    lattice: 'square',
    size: '5x5',
    surface: 'paste surface'
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'Pasted Test'
  )));
  elements.get('export-state-kind').value = 'status';
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
}

function testNewPlacementGameStatusRoundTrips() {
  let harness = createHeadlessDomHarness();
  let { elements } = harness;
  elements.get('game-mode-select').value = 'go';
  elements.get('game-mode-select').listeners.change();
  elements.get('go-komi').value = '7.5';
  elements.get('go-komi').listeners.change();
  elements.get('begin-game').listeners.click();
  elements.get('go-pass').listeners.click();
  elements.get('go-pass').listeners.click();
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'go');
  assert.strictEqual(exported.komi, 7.5);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.winner, 'white');
  assert.ok(exported.finalScore);

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('debug-export-output').value = JSON.stringify(exported);
  elements.get('import-state').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'go');
  assert.strictEqual(exported.komi, 7.5);
  assert.strictEqual(elements.get('go-komi').value, '7.5');

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('game-mode-select').value = 'reversi';
  elements.get('game-mode-select').listeners.change();
  elements.get('begin-game').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'reversi');
  assert.strictEqual(exported.preset.rows, 8);
  assert.strictEqual(exported.discs.length, 4);

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('game-mode-select').value = 'chinese-checkers';
  elements.get('game-mode-select').listeners.change();
  elements.get('begin-game').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'chinese-checkers');
  assert.strictEqual(exported.marbles.length, 8);
  assert.strictEqual(exported.camps.starts.red.length, 4);
  assert.strictEqual(exported.preset.pieceSets.targets.red.length, 4);
  assert.deepStrictEqual(exported.winningLine, []);

  exported.winningLine = [0, 1, 2];
  elements.get('debug-export-output').value = JSON.stringify(exported);
  elements.get('import-state').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.winningLine, []);
}

function testNewPlacementGameAnimationsStartFromUi() {
  const cellClick = (row, col) => ({
    clientX: 57 + ((col - 1) * 58),
    clientY: 57 + ((row - 1) * 58)
  });

  let harness = createHeadlessDomHarness();
  let { elements, canvas, calls } = harness;
  importHeadlessStatus(elements, {
    gameMode: 'reversi',
    preset: {
      id: 'ui-reversi-animation',
      label: 'ui reversi animation',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'ui reversi',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    phase: 'ready',
    round: 0,
    turn: 'black',
    discs: [
      { id: 1, row: 1, col: 1, color: 'black' },
      { id: 2, row: 2, col: 2, color: 'white' }
    ]
  });
  calls.length = 0;
  canvas.listeners.click(cellClick(3, 3));
  assert.ok(calls.some((call) => call.method === 'requestAnimationFrame'));

  harness = createHeadlessDomHarness();
  ({ elements, canvas, calls } = harness);
  importHeadlessStatus(elements, {
    gameMode: 'chinese-checkers',
    preset: {
      id: 'ui-checkers-animation',
      label: 'ui checkers animation',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'ui checkers',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      chineseCheckersPlayers: ['red', 'yellow'],
      pieceSets: {
        starts: {
          red: [{ row: 1, col: 1 }],
          yellow: [{ row: 1, col: 2 }]
        },
        targets: {
          red: [{ row: 1, col: 3 }],
          yellow: [{ row: 4, col: 4 }]
        }
      }
    },
    phase: 'ready',
    round: 0,
    turn: 'red',
    camps: {
      starts: {
        red: [{ row: 1, col: 1 }],
        yellow: [{ row: 1, col: 2 }]
      },
      targets: {
        red: [{ row: 1, col: 3 }],
        yellow: [{ row: 4, col: 4 }]
      }
    },
    marbles: [
      { id: 1, row: 1, col: 1, color: 'red' },
      { id: 2, row: 1, col: 2, color: 'yellow' }
    ]
  });
  canvas.listeners.click(cellClick(1, 1));
  calls.length = 0;
  canvas.listeners.click(cellClick(1, 3));
  assert.ok(calls.some((call) => call.method === 'requestAnimationFrame'));
}

function testBackgroundExportFormats() {
  const { elements } = createHeadlessDomHarness();
  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = 'connect-four-6x7';
  elements.get('surface-preset-select').listeners.change();
  elements.get('export-state-kind').value = 'background';
  elements.get('export-state-kind').listeners.change();
  assert.strictEqual(elements.get('export-background-format-row').hidden, false);

  elements.get('export-background-format').value = 'dsl';
  elements.get('export-state').listeners.click();
  const compact = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(compact.size, '6x7');
  assert.strictEqual(compact.gameTypes, undefined);
  assert.strictEqual(compact.group, undefined);
  assert.strictEqual(compact.groups, undefined);
  assert.strictEqual(compact.holes, 'top');
  assert.strictEqual(game.normalizePresetPayload(compact).connectFourHoles.length, 7);

  elements.get('export-background-format').value = 'verbose';
  elements.get('export-state').listeners.click();
  const verbose = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(verbose.rows, 6);
  assert.strictEqual(verbose.cols, 7);
  assert.strictEqual(verbose.gameTypes, undefined);
  assert.strictEqual(verbose.group, undefined);
  assert.strictEqual(verbose.groups, undefined);
  assert.strictEqual(verbose.connectFourHoles.length, 7);
  assert.strictEqual(verbose.tokens, undefined);
  assert.strictEqual(verbose.boxes, undefined);
}

function testFullStatusImportWithoutDebugMode() {
  const { elements } = createHeadlessDomHarness();
  assert.notStrictEqual(elements.get('debug-toggle').attributes['aria-pressed'], 'true');
  assert.strictEqual(elements.get('import-state').disabled, false);
  elements.get('debug-export-output').value = JSON.stringify({
    gameMode: '2048',
    preset: {
      label: 'status no debug',
      group: '2048',
      lattice: 'square',
      rows: 2,
      cols: 2,
      surface: 'status surface'
    },
    phase: 'ready',
    round: 3,
    score: 8,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 1, col: 1, value: 8 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('round-value').textContent, '3');
  assert.strictEqual(elements.get('score-value').textContent, '8');
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
    makeElement('connect-four-fall-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } }),
    makeElement('connect-four-align-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } })
  ];
  const modeGoControls = [
    makeElement('go-komi-row', { hidden: true, attributes: { 'data-mode-control': 'go' } }),
    makeElement('go-action-row', { hidden: true, attributes: { 'data-mode-control': 'go' } })
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
    makeElement('surface-preset-select', { value: game.BOUNDARY_GLUE_BOARD_PRESET_ID }),
    makeElement('import-preset-tools'),
    makeElement('import-keep-game-mode', { checked: true }),
    makeElement('import-game-mode', { value: '2048' }),
    makeElement('import-preset-source', { value: 'catalog' }),
    makeElement('import-preset-catalog-row'),
    makeElement('import-preset-catalog'),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('boundary-glue-mode-row', { hidden: true }),
    makeElement('boundary-glue-mode', { value: 'torus' }),
    makeElement('boundary-glue-shape-row', { hidden: true }),
    makeElement('boundary-glue-shape', { value: 'square' }),
    makeElement('boundary-glue-rect-row', { hidden: true }),
    makeElement('boundary-glue-rows', { value: '4' }),
    makeElement('boundary-glue-cols', { value: '4' }),
    makeElement('gomoku-board-size', { value: '15' }),
    makeElement('gomoku-display-style', { value: 'vertex' }),
    makeElement('go-komi', { value: '6.5' }),
    makeElement('go-pass'),
    makeElement('connect-four-fall-dir', {
      value: 'S',
      options: ['S', 'E', 'W', 'N', 'SE', 'SW', 'NW', 'NE'].map((value) => ({ value, textContent: '', hidden: false, disabled: false }))
    }),
    makeElement('connect-four-align-fall', { checked: true }),
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
    makeElement('redo-step'),
    makeElement('export-state'),
    makeElement('import-state'),
    makeElement('debug-export-output'),
    makeElement('export-state-kind', { value: 'status' }),
    makeElement('export-background-format-row', { hidden: true }),
    makeElement('export-background-format', { value: 'dsl' }),
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
  modeGoControls.forEach((control) => elements.set(control.id, control));

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
      createElement(tagName) {
        return makeElement('', { tagName: String(tagName || '').toUpperCase() });
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
        if (selector === '[data-mode-control="go"]') return modeGoControls;
        return [];
      }
    },
    window: {
      devicePixelRatio: 1,
      RAMIFIED_MINIGAME_PRESETS: presetRegistrySource,
      RAMIFIED_MINIGAME_PRESET_DATA: presetDataByKey,
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
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
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

  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  assert.strictEqual(elements.get('import-preset-tools').hidden, false);
  assert.strictEqual(elements.get('import-preset-input').hidden, false);
  elements.get('import-preset-input').value = JSON.stringify({
    schema: 'ramified-minigame-background-preset',
    preset: {
      label: 'tiny import',
      lattice: 'square',
      size: '2x2',
      removed: '1,1',
      glue: 'g0:1,2,E=2,1,W'
    }
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '3');
  assert.strictEqual(elements.get('import-preset-tools').hidden, false);

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
  assert.strictEqual(elements.get('surface-preset-select').value, game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.strictEqual(elements.get('move-row').hidden, true);
  assert.strictEqual(elements.get('box-ui-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.strictEqual(elements.get('step-mode-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-value').disabled, true);
  elements.get('surface-preset-select').value = 'gomoku-m4-15x15';
  elements.get('surface-preset-select').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
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
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  elements.get('gomoku-board-size').value = '4';
  elements.get('gomoku-board-size').listeners.change();
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
  assert.strictEqual(elements.get('surface-preset-select').value, 'connect-four-exchange');
  assert.strictEqual(elements.get('connect-four-fall-row').hidden, false);
  assert.strictEqual(elements.get('connect-four-align-row').hidden, false);
  assert.strictEqual(elements.get('connect-four-align-fall').checked, true);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.strictEqual(elements.get('move-row').hidden, true);
  elements.get('surface-preset-select').value = 'connect-four-6x7';
  elements.get('surface-preset-select').listeners.change();
  calls.length = 0;
  elements.get('connect-four-fall-dir').value = 'E';
  elements.get('connect-four-fall-dir').listeners.change();
  assert.ok(calls.some((call) => call.method === 'rotate' && Math.abs(call.args[0] - (Math.PI / 2)) < 1e-9));
  calls.length = 0;
  elements.get('connect-four-align-fall').checked = false;
  elements.get('connect-four-align-fall').listeners.change();
  assert.ok(!calls.some((call) => call.method === 'rotate' && Math.abs(call.args[0] - (Math.PI / 2)) < 1e-9));
  elements.get('connect-four-align-fall').checked = true;
  elements.get('connect-four-align-fall').listeners.change();
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

  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  elements.get('import-preset-input').value = JSON.stringify({
    id: 'connect-four-cycle-torus',
    label: 'Connect Four cycle torus',
    lattice: 'square',
    size: '4x4',
    surface: 'cycle torus',
    glue: 'g0:1..4,4,E=1..4,1,W; g1:1,1..4,N=4,1..4,S'
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
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
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[4, 1]]);
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[4, 1]]);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles, []);
}

function testSokobanPresetRegistryAndSetup() {
  const state = game.createSokobanState('sokoban-square');
  assert.strictEqual(state.gameMode, game.GAME_MODES.SOKOBAN);
  assert.strictEqual(state.players.length, 1);
  assert.strictEqual(state.boxes.length, 1);
  assert.strictEqual(state.targets.size, 1);
  assert.ok(state.walls.size > 0);
  assert.strictEqual(state.removed.has(game.indexOf(1, 1, state.preset.cols)), false);
  assert.strictEqual(game.sokobanSetupIssue(state), '');
  assert.strictEqual(game.gameModeFromPresetGroup(state.preset), game.GAME_MODES.SOKOBAN);
}

function testSokobanPlayerMovementAndMultiPlayerTransaction() {
  let state = readySokobanState({
    sokoban: {
      players: [tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.strictEqual(result.state.moves, 1);
  assert.strictEqual(result.state.pushes, 0);

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1), tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2', '2,3']);

  state = readySokobanState({
    sokoban: {
      players: [tile(1, 1), tile(2, 1)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.W);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1', '2,1']);
}

function testSokobanWallsAndBoxPushes() {
  let state = readySokobanState({
    sokoban: {
      players: [tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)],
      walls: [tile(2, 3)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(state.removed.has(game.indexOf(2, 3, state.preset.cols)), false);

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,3']);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'solved');

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 3)],
      walls: [tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,2']);
}

function testSokobanGluedEdgeMovementAndPush() {
  let state = readySokobanState({
    size: '2x2',
    glue: [
      gluePair(1, { row: 1, col: 2, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      players: [tile(1, 2)],
      boxes: [tile(2, 2)],
      targets: [tile(2, 1)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1']);

  state = readySokobanState({
    size: '1x2',
    glue: [
      gluePair(1, { row: 1, col: 2, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 1)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['1,1']);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(game.sokobanSolved(result.state), true);
}

function testSokobanStatusRoundTripAndCompactImport() {
  const compact = game.normalizePresetPayload({
    id: 'sokoban-compact',
    label: 'Sokoban Compact',
    gameTypes: ['Sokoban'],
    size: '3x4',
    sokoban: {
      players: '2,1; 2,2',
      boxes: '2,3',
      targets: '2,4',
      walls: '1,1',
      ice: '1,2',
      energyBridges: '1,3'
    }
  });
  assert.deepStrictEqual(compact.sokoban.players, [tile(2, 1), tile(2, 2)]);
  assert.deepStrictEqual(compact.sokoban.walls, [tile(1, 1)]);

  const state = game.beginSokobanGame(compact);
  const result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  const summary = game.stateSummary(result.state);
  assert.strictEqual(summary.gameMode, game.GAME_MODES.SOKOBAN);
  assert.strictEqual(summary.pushes, 1);
  assert.deepStrictEqual(summary.walls, [game.indexOf(1, 1, compact.cols)]);

  const imported = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: compact,
    phase: 'ready',
    players: [{ id: 10, row: 2, col: 1 }],
    boxes: [{ id: 20, row: 2, col: 3 }],
    targets: [tile(2, 4)],
    walls: [tile(1, 1)],
    moves: 4,
    pushes: 2
  }).state;
  assert.strictEqual(imported.gameMode, game.GAME_MODES.SOKOBAN);
  assert.deepStrictEqual(sokobanActorsAt(imported.players, imported.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(imported.boxes, imported.preset.cols), ['2,3']);
  assert.strictEqual(imported.nextPlayerId, 11);
  assert.strictEqual(imported.nextBoxId, 21);
  assert.strictEqual(imported.moves, 4);
  assert.strictEqual(imported.pushes, 2);
  assert.strictEqual(imported.walls.has(game.indexOf(1, 1, imported.preset.cols)), true);
}

function testSokobanIcePlayerSlidingAndSkiingBlockers() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(3, 1)],
      targets: [tile(3, 2)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 4)],
      targets: [tile(3, 5)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,4']);
  assert.strictEqual(result.state.pushes, 0);
}

function testSokobanIceBoxFrictionRules() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 3), tile(2, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,5']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 1)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,3']);
}

function testSokobanEnergyBeamFormationAndGluedRoutes() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(3, 1)],
      targets: [tile(3, 2)],
      energyBridges: [tile(2, 2), tile(2, 5)]
    }
  });
  let beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.deepStrictEqual(beams[0].interior.map((index) => {
    const pos = game.rowCol(index, state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,3', '2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 3)],
      targets: [tile(3, 2)],
      energyBridges: [tile(2, 2), tile(2, 5)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 0);

  const glued = game.createSokobanState(sokobanPreset({
    size: '1x4',
    glue: [
      gluePair(1, { row: 1, col: 4, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      energyBridges: [tile(1, 2), tile(1, 4)]
    }
  }));
  beams = game.sokobanEnergyBeamObjects(glued);
  assert.ok(beams.some((beam) => beam.interior.includes(game.indexOf(1, 1, glued.preset.cols))));
}

function testSokobanEnergyBridgesAreBoxLikeCargo() {
  let state = readySokobanState({
    size: '3x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 3)],
      energyBridges: [tile(2, 2)]
    }
  });
  assert.strictEqual(game.sokobanSetupIssue(state), '');
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,3']);
  assert.strictEqual(result.bridges.length, 1);
  assert.strictEqual(result.beams.length, 0);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(game.sokobanSolved(result.state), true);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(3, 5)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 1);
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['2,3', '2,4']);
  assert.strictEqual(result.bridges.length, 1);
  assert.strictEqual(result.beams.length, 0);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state).length, 0);
}

function testSokobanEnergyBeamPushesAndIceSliding() {
  let state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(4, 5)],
      targets: [tile(4, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['3,2', '3,4']);
  assert.strictEqual(result.state.pushes, 1);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(4, 5)],
      targets: [tile(4, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(4, 5)],
      targets: [tile(4, 4)],
      walls: [tile(3, 3)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, false);

  state = readySokobanState({
    size: '5x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(5, 5)],
      targets: [tile(5, 4)],
      ice: [tile(2, 2), tile(2, 4), tile(3, 2), tile(3, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['4,2', '4,4']);
}

function run() {
  testInitialSpawnWeights();
  testRoundSpawnWeights();
  testNoSpawnAfterNoop();
  testGameOverWhenFullAndBlocked();
  testOrdinaryMergeOnce();
  testNewlyMergedTileBlocksLaterPush();
  testLongGluedChainConvergesBeforeBackMerge();
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
  testBoundaryGlueBoardPresetSizingAndGlueModes();
  testGoCaptureSuicideKoAndScoring();
  testGoGluedCaptureUsesSurfaceSuccessor();
  testReversiOpeningFlipsAndScoring();
  testReversiCenteredOpeningDimensions();
  testReversiGluedFlipAndLoopGuard();
  testReversiDiagonalFlipsAndAnimationMetadata();
  testChineseCheckersSetupMovesJumpsAndWin();
  testChineseCheckersSuperJumpRulesAndSegments();
  testPieceSetsInitializePlacementGames();
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
  testDiagonalLineCrossingTwoGluedEdgesUsesOnlyEndpointHalves();
  testImportedSelfGluedDiagonalWinRendersNoAxisSegments();
  testGomokuCyclicReuseWin();
  testOfficialGomokuTorusUsesFiveInLineMultiplicity();
  testOfficialGomokuTorusLegacyImportUpgradesWinLength();
  testCustomGomokuThreeInLinePresetStillWorks();
  testConnectFourDropStopsAtBoundaryAndBlocker();
  testConnectFourCycleWarning();
  testConnectFourDropCarriesGluedRoute();
  testConnectFourEndsWhenInputHolesFilled();
  testConnectFourHorizontalWin();
  testConnectFourDiagonalWinDetection();
  testConnectFourDiagonalTransportsAfterReflectingGlue();
  testSokobanPresetRegistryAndSetup();
  testSokobanPlayerMovementAndMultiPlayerTransaction();
  testSokobanWallsAndBoxPushes();
  testSokobanGluedEdgeMovementAndPush();
  testSokobanStatusRoundTripAndCompactImport();
  testSokobanIcePlayerSlidingAndSkiingBlockers();
  testSokobanIceBoxFrictionRules();
  testSokobanEnergyBeamFormationAndGluedRoutes();
  testSokobanEnergyBridgesAreBoxLikeCargo();
  testSokobanEnergyBeamPushesAndIceSliding();
  testExtraBackgroundPresets();
  testKeyboardMapping();
  testHexMovePadUsesArrowGlyphs();
  testMosaicBackgroundExportAndMinigameImportControlsExist();
  testCardHeadersCollapse();
  testPresetFromMosaicBackgroundExport();
  testPresetFromFullMosaicCalculatorExport();
  testPresetFromMosaicPresetJsWrapper();
  testUrlMinigamePresetImport();
  testUrlMinigamePresetImportInfersModeFromGroup();
  testMultiGroupImportedPresetFiltering();
  testLegacyGroupsImportedPresetFiltering();
  testGameTypesTakePrecedenceOverLegacyGroups();
  testCompactPresetDslParser();
  testSpeedControlDefaults();
  testSquareWasdKeyboardControls();
  testActiveSquareKeyboardPreventsPageScroll();
  testHexArrowKeyboardControls();
  testActiveHexKeyboardPreventsPageScroll();
  testHexVerticalArrowAloneDoesNotMove();
  testHexKeyboardStateClearsOnKeyupAndBlur();
  testKeyboardPreventsScrollWhileBusyWithoutMovingAgain();
  testKeyboardAllowsPageScrollOutsideActive2048();
  testKeyboardShortcutsUndoRedoAndReset();
  testSwipeRightMovesSquare2048();
  testShortSwipeDoesNotMove();
  testSwipeSuppressesFollowupClick();
  testSwipeIgnoredOutsideAccepting2048();
  testHexSwipeDirections();
  testDynamicPresetCatalogOptions();
  testRandomSetupAndPresetOptions();
  testImportExportCardDefaultsAndCatalogImport();
  testImportExportCardPastedPresetMode();
  testNewPlacementGameStatusRoundTrips();
  testNewPlacementGameAnimationsStartFromUi();
  testBackgroundExportFormats();
  testFullStatusImportWithoutDebugMode();
  testStepPauseRendersAfterSelectingNextEvent();
  testStationaryDifferentBlocks();
  testSimultaneousDifferentExplosion();
  testLargeExplosionClearsSurfaceNeighbors();
  testSpawnAfterValidRound();
  testHeadlessDomStepControls();
  console.log('ramified_minigames_setup_test: all tests passed');
}

run();
