const assert = require('assert');
const gameApi = require('./lianliankan_engine.js');
const mosaicAdapter = require('./mosaic_adapter.js');

const A = { id: 'a', glyph: 'A' };
const B = { id: 'b', glyph: 'B' };
const C = { id: 'c', glyph: 'C' };
const X = { id: 'block', glyph: 'X' };

function tileFor(character) {
  if (character === 'A') return A;
  if (character === 'B') return B;
  if (character === 'C') return C;
  if (character === 'X') return X;
  return null;
}

function fixture(lines, options = {}) {
  const rows = lines.length;
  const cols = lines[0].length;
  const playable = [];
  const tiles = [];
  lines.forEach((line) => {
    assert.strictEqual(line.length, cols, 'fixture rows must have equal width');
    Array.from(line).forEach((character) => {
      playable.push(character !== '#');
      tiles.push(character === '#' ? null : tileFor(character));
    });
  });
  const board = gameApi.createBoard({ rows, cols, playable, tiles });
  const topology = gameApi.createSquareTopology(board, options);
  return { board, topology };
}

function pathFor(lines, start, target, options) {
  const setup = fixture(lines, options);
  return gameApi.findPath(setup.board, setup.topology, start, target);
}

function createFixtureGame(lines, options = {}) {
  const setup = fixture(lines, options);
  return gameApi.createGame({
    board: setup.board,
    cutEdges: options.cutEdges,
    gluedEdges: options.gluedEdges,
    generateTiles: false,
    ensureInitialMatch: false
  });
}

function counts(game) {
  return Object.entries(gameApi.symbolCounts(game.board)).sort();
}

function testPathfinder() {
  let path = pathFor(['A..A'], 0, 3);
  assert.ok(path, 'P01 horizontal path should exist');
  assert.strictEqual(path.turns, 0);
  assert.deepStrictEqual(path.cells, [0, 1, 2, 3]);

  path = pathFor(['A', '.', '.', 'A'], 0, 3);
  assert.ok(path, 'P02 vertical path should exist');
  assert.strictEqual(path.turns, 0);

  path = pathFor(['A.', '.A'], 0, 3);
  assert.ok(path, 'P03 one-turn path should exist');
  assert.strictEqual(path.turns, 1);
  assert.deepStrictEqual(path.points, [0, 1, 3], 'N/E/S/W preference should choose east first');

  path = pathFor(['AX..', '.X.A', '....'], 0, 7);
  assert.ok(path, 'P04 two-turn path should exist');
  assert.strictEqual(path.turns, 2);

  const threeTurnSetup = fixture(['AXXX', '.X.A', '...X', 'XXXX']);
  path = gameApi.findPath(threeTurnSetup.board, threeTurnSetup.topology, 0, 7);
  assert.strictEqual(path, null, 'P05 routes requiring three turns must be rejected');
  path = gameApi.findPath(threeTurnSetup.board, threeTurnSetup.topology, 0, 7, { maxTurns: 3 });
  assert.ok(path && path.turns === 3, 'P05 fixture must contain a real three-turn route');

  path = pathFor(['AXA'], 0, 2);
  assert.strictEqual(path, null, 'P06 occupied cells block a route');

  path = pathFor(['A..A'], 0, 3);
  assert.ok(path, 'P07 empty playable cells are traversable');

  path = pathFor(['XXX', 'AXA', 'XXX'], 3, 5);
  assert.strictEqual(path, null, 'P08 ordinary outside-board routing must be rejected');

  const cut = fixture(['AA'], {
    cutEdges: [{ first: { row: 1, col: 1 }, second: { row: 1, col: 2 } }]
  });
  assert.strictEqual(gameApi.findPath(cut.board, cut.topology, 0, 1), null, 'cut internal edges behave as boundaries');
}

function testBoundaryGlue() {
  let setup = fixture(['A']);
  assert.strictEqual(setup.topology.nextStep(0, gameApi.DIRS.N), null, 'G01 unglued boundaries are blocked');

  const horizontalGlue = [{
    group: 1,
    first: { row: 1, col: 1, dir: 'W' },
    second: { row: 1, col: 2, dir: 'E' }
  }];
  setup = fixture(['AA'], { gluedEdges: horizontalGlue });
  let step = setup.topology.nextStep(0, gameApi.DIRS.W);
  assert.ok(step && step.kind === 'glued', 'G02 configured glue should be traversable');
  assert.strictEqual(step.cell, 1);
  assert.strictEqual(step.direction, gameApi.DIRS.W);
  assert.strictEqual(setup.topology.nextStep(0, gameApi.DIRS.N), null, 'G03 glue does not create arbitrary exterior space');

  const mappedGlue = [{
    group: 2,
    first: { row: 1, col: 2, dir: 'E' },
    second: { row: 1, col: 1, dir: 'N' }
  }];
  setup = fixture(['.A', 'A.'], { gluedEdges: mappedGlue });
  step = setup.topology.nextStep(1, gameApi.DIRS.E);
  assert.strictEqual(step.cell, 0, 'G04 glue reaches its explicit partner cell');
  assert.strictEqual(step.direction, gameApi.DIRS.S, 'G04 outgoing direction is opposite the partner edge');
  const gluePath = gameApi.findPath(setup.board, setup.topology, 1, 2);
  assert.ok(gluePath, 'G05 a path can continue through mapped glue direction');
  assert.strictEqual(gluePath.transitions.length, 2);
  assert.strictEqual(gluePath.transitions[0].kind, 'glued');
  assert.strictEqual(gluePath.turns, 0, 'G05 continuing in the mapped direction adds no turn');

  const cycleGlue = [{
    group: 3,
    first: { row: 1, col: 2, dir: 'N' },
    second: { row: 1, col: 2, dir: 'S' }
  }];
  setup = fixture(['A.XA'], { gluedEdges: cycleGlue });
  const started = Date.now();
  assert.strictEqual(gameApi.findPath(setup.board, setup.topology, 0, 3), null, 'G06 cyclic glue must not invent a route');
  assert.ok(Date.now() - started < 500, 'G06 cyclic glue search must terminate promptly');

  const torus = fixture(['AA'], { gluedEdges: gameApi.torusGlue(1, 2) });
  assert.strictEqual(torus.topology.nextStep(0, gameApi.DIRS.W).cell, 1, 'generated torus glue is compatible');
}

function testMatchingAndSelection() {
  let setup = fixture(['AB']);
  assert.strictEqual(gameApi.findConnection(setup.board, setup.topology, 0, 1), null, 'M01 different ids cannot match');

  setup = fixture(['AXA']);
  assert.strictEqual(gameApi.findConnection(setup.board, setup.topology, 0, 2), null, 'M02 blocked identical tiles cannot match');

  let game = createFixtureGame(['AA']);
  assert.deepStrictEqual(gameApi.handleSelection(game, 0), { kind: 'selected', index: 0 });
  const removed = gameApi.handleSelection(game, 1);
  assert.strictEqual(removed.kind, 'removed', 'M03 a valid pair is removed');
  assert.strictEqual(game.board.cells[0].tile, null);
  assert.strictEqual(game.board.cells[1].tile, null);
  assert.strictEqual(game.phase, 'complete');

  game = createFixtureGame(['BAAB']);
  gameApi.handleSelection(game, 1);
  gameApi.handleSelection(game, 2);
  const subsequent = gameApi.findConnection(game.board, game.topology, 0, 3);
  assert.ok(subsequent, 'M04 removed cells remain playable and traversable');

  game = createFixtureGame(['AA']);
  gameApi.handleSelection(game, 0);
  assert.strictEqual(gameApi.handleSelection(game, 0).kind, 'deselected', 'M05 selecting the same tile toggles it off');

  game = createFixtureGame(['AB']);
  gameApi.handleSelection(game, 0);
  const replaced = gameApi.handleSelection(game, 1);
  assert.strictEqual(replaced.kind, 'selected');
  assert.strictEqual(replaced.replaced, 0);
  assert.strictEqual(game.selectedIndex, 1, 'a different symbol becomes the selection');

  game = createFixtureGame(['AA']);
  gameApi.handleSelection(game, 0);
  const pending = gameApi.handleSelection(game, 1, { deferMatch: true });
  assert.strictEqual(pending.kind, 'match');
  assert.strictEqual(game.phase, 'animating');
  assert.ok(game.board.cells[0].tile && game.board.cells[1].tile, 'deferred matches remain visible during animation');
  gameApi.commitPendingMatch(game);
  assert.strictEqual(game.phase, 'complete');
}

function testDeadlock() {
  let game = createFixtureGame(['AA']);
  assert.strictEqual(game.phase, 'ready', 'D01 a legal pair keeps the game ready');
  assert.ok(game.availableMatch);

  game = createFixtureGame(['AB']);
  assert.strictEqual(game.phase, 'deadlock', 'D02 remaining tiles without a pair are a deadlock');

  game = createFixtureGame(['AA']);
  gameApi.handleSelection(game, 0);
  gameApi.handleSelection(game, 1);
  assert.strictEqual(game.phase, 'complete', 'D03 completion takes precedence over deadlock');

  game = createFixtureGame(['AABC']);
  gameApi.handleSelection(game, 0);
  gameApi.handleSelection(game, 1);
  assert.strictEqual(game.phase, 'deadlock', 'D04 status is recomputed after each removal');
}

function testRefresh() {
  let game = createFixtureGame(['AABBCC']);
  const beforeCounts = counts(game);
  const topology = game.topology;
  const result = gameApi.refreshGame(game, { rng: gameApi.createSeededRng(7) });
  assert.ok(result.success, 'R01 refresh should retain a legal match');
  assert.deepStrictEqual(counts(game), beforeCounts, 'R01 refresh preserves exact symbol counts');
  assert.strictEqual(game.topology, topology, 'R03 refresh preserves the topology object');

  game = createFixtureGame(['BAAB']);
  gameApi.handleSelection(game, 1);
  gameApi.handleSelection(game, 2);
  const emptyBefore = game.board.cells.filter((cell) => !cell.tile).map((cell) => cell.index);
  gameApi.refreshGame(game, { rng: gameApi.createSeededRng(9) });
  const emptyAfter = game.board.cells.filter((cell) => !cell.tile).map((cell) => cell.index);
  assert.deepStrictEqual(emptyAfter, emptyBefore, 'R02/R04 removed tiles stay removed and empty locations are preserved');
  assert.deepStrictEqual(counts(game), [['b', 2]], 'R02 removed symbols are not resurrected');

  game = createFixtureGame(['ABAB']);
  assert.strictEqual(game.phase, 'deadlock');
  const recovered = gameApi.refreshGame(game, { maxAttempts: 0 });
  assert.ok(recovered.success && recovered.recovered, 'R05 deterministic recovery creates a legal pair');
  assert.ok(gameApi.findAnyLegalMatch(game));
  assert.deepStrictEqual(counts(game), [['a', 2], ['b', 2]]);

  game = createFixtureGame(['ABAB']);
  const bounded = gameApi.refreshGame(game, { maxAttempts: 2, rng: () => 0 });
  assert.strictEqual(bounded.attempts, 2, 'R06 random retry count is bounded');
  assert.ok(bounded.success && bounded.recovered, 'R06 deterministic recovery follows failed retries');

  const generated = gameApi.createGame({ rows: 4, cols: 6, rng: () => 0, maxShuffleAttempts: 0 });
  assert.strictEqual(gameApi.remainingTileCount(generated), 24);
  assert.ok(gameApi.findAnyLegalMatch(generated), 'generated boards are presented with a legal move');
  Object.values(gameApi.symbolCounts(generated.board)).forEach((count) => assert.strictEqual(count % 2, 0));
}

function testMosaicAdapter() {
  const preset = {
    id: 'adapter-test',
    lattice: 'square',
    size: '2x3',
    removedTiles: [{ row: 2, col: 2 }],
    cutEdges: [{ first: { row: 1, col: 1 }, second: { row: 1, col: 2 } }],
    gluedEdges: [{
      group: 4,
      first: { row: 1, col: 1, dir: 'N' },
      second: { row: 2, col: 3, dir: 'S' }
    }]
  };
  const normalized = mosaicAdapter.normalizedPresetData(preset);
  assert.strictEqual(normalized.rows, 2);
  assert.strictEqual(normalized.cols, 3);
  assert.strictEqual(normalized.removedTiles.length, 1);
  assert.strictEqual(normalized.cutEdges.length, 1);
  assert.strictEqual(normalized.gluedEdges.length, 1);

  const game = mosaicAdapter.createGameFromMosaicPreset(preset, {
    rng: gameApi.createSeededRng(2),
    maxShuffleAttempts: 0
  });
  assert.strictEqual(game.board.cells[4].playable, false, 'adapter preserves Mosaic removed cells');
  assert.strictEqual(game.topology.gluedEdges.length, 1, 'adapter preserves Mosaic glue pairs');
  const state = mosaicAdapter.snapshot(game);
  assert.strictEqual(state.gameMode, 'lianliankan');
  assert.strictEqual(state.rows, 2);
  assert.strictEqual(state.cols, 3);

  const shared = mosaicAdapter.createSharedState(preset, {
    tiles: game.board.cells.map((cell) => cell.tile),
    ensureInitialMatch: false
  });
  shared.selectedIndex = shared.board.cells.find((cell) => !!cell.tile).index;
  shared.matches = 3;
  shared.refreshes = 2;
  mosaicAdapter.syncSharedState(shared);
  assert.strictEqual(shared.gameMode, 'lianliankan', 'shared state uses the common game-mode discriminator');
  assert.strictEqual(shared.preset, preset, 'shared state retains the common preset object');
  assert.ok(shared.removed instanceof Set && shared.removed.has(4), 'shared state exposes removed cells to the common renderer');
  assert.deepStrictEqual(shared.boxes, [], 'shared state remains safe for common non-placement helpers');

  const cloned = mosaicAdapter.cloneSharedState(shared);
  assert.notStrictEqual(cloned, shared, 'shared undo cloning creates a new state');
  assert.notStrictEqual(cloned.board, shared.board, 'shared undo cloning creates a new board');
  assert.strictEqual(cloned.selectedIndex, shared.selectedIndex);
  assert.strictEqual(cloned.matches, 3);
  assert.strictEqual(cloned.score, 3);

  const restored = mosaicAdapter.stateFromSnapshot(preset, mosaicAdapter.snapshot(shared));
  assert.deepStrictEqual(mosaicAdapter.snapshot(restored), mosaicAdapter.snapshot(shared), 'shared status snapshots round-trip exactly');
  assert.throws(() => mosaicAdapter.stateFromSnapshot(preset, {
    tiles: [{ row: 1, col: 4, id: 'outside', glyph: 'X' }]
  }), /outside the board/);
  assert.throws(() => mosaicAdapter.stateFromSnapshot(preset, {
    tiles: [{ row: 2, col: 2, id: 'removed', glyph: 'X' }]
  }), /removed cell/);

  const setup = fixture(['.A', 'A.'], {
    gluedEdges: [{
      group: 2,
      first: { row: 1, col: 2, dir: 'E' },
      second: { row: 2, col: 1, dir: 'N' }
    }]
  });
  const path = gameApi.findPath(setup.board, setup.topology, 1, 2);
  const geometry = {
    radius: 5,
    cells: [
      { index: 0, x: 5, y: 5 }, { index: 1, x: 15, y: 5 },
      { index: 2, x: 5, y: 15 }, { index: 3, x: 15, y: 15 }
    ]
  };
  const segments = mosaicAdapter.pathSegments(path, geometry);
  assert.deepStrictEqual(segments.map((segment) => segment.kind), ['glue-source', 'glue-target']);
}

function run() {
  testPathfinder();
  testBoundaryGlue();
  testMatchingAndSelection();
  testDeadlock();
  testRefresh();
  testMosaicAdapter();
  console.log('Lianliankan engine tests passed (P01-P08, G01-G06, M01-M05, D01-D04, R01-R06).');
}

run();
