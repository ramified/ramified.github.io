'use strict';

const assert = require('assert');
const fs = require('fs');
const game = require('./ramified_minigames_setup.js');

function torusPreset(rows = 4, cols = 4, removedTiles = []) {
  return {
    id: `hex-test-${rows}x${cols}-${removedTiles.length}`,
    label: 'Hex test torus',
    lattice: 'square',
    rows,
    cols,
    surface: 'torus',
    removedTiles,
    cutEdges: [],
    gluedEdges: game.generateTorusBoundaryGlue(rows, cols)
  };
}

function play(state, index) {
  const result = game.placeHexTile(state, index);
  assert.strictEqual(result.changed, true, result.message);
  return result.state;
}

function testAlternationAndWinningWitness() {
  let state = game.beginHexGame(torusPreset());
  assert.strictEqual(state.phase, 'ready');
  state = play(state, 0);
  assert.strictEqual(state.turn, 'blue');
  assert.strictEqual(game.placeHexTile(state, 0).changed, false);
  // Red completes a seam-crossing row; Blue's moves stay out of the way.
  [4, 1, 5, 2, 6, 3].forEach((index) => { state = play(state, index); });
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'red');
  assert.ok(state.winningExpression && state.winningExpression !== '0');
  assert.ok(state.winningCycle && state.winningCycle.traversals.length >= 4);
  const cycle = state.winningCycle.traversals;
  assert.strictEqual(cycle[0].from, 3);
  assert.strictEqual(cycle[cycle.length - 1].to, cycle[0].from);
}

function testRemovedTilesAndFullBoardDraw() {
  const removed = [{ row: 1, col: 1 }];
  let state = game.beginHexGame(torusPreset(4, 4, removed));
  assert.strictEqual(game.placeHexTile(state, 0).changed, false);

  // A checkerboard coloring on an even torus has no same-color adjacency,
  // so filling every playable tile is a legitimate draw.
  state = game.beginHexGame(torusPreset());
  const red = [];
  const blue = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ((row + col) % 2 === 0 ? red : blue).push((row * 4) + col);
    }
  }
  for (let index = 0; index < red.length; index += 1) {
    state = play(state, red[index]);
    state = play(state, blue[index]);
  }
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, '');
  assert.strictEqual(state.ending, 'draw');
}

function testCloneImportRecordAndPieRule() {
  let state = game.beginHexGame(torusPreset(), { pieRule: true });
  state = play(state, 0);
  assert.strictEqual(state.pieAvailable, true);
  const cloned = game.cloneGameState(state);
  assert.deepStrictEqual(game.stateSummary(cloned), game.stateSummary(state));
  const swapped = game.swapHexPieColors(state);
  assert.strictEqual(swapped.changed, true);
  state = swapped.state;
  assert.strictEqual(state.pieSwapped, true);
  assert.strictEqual(state.pieAvailable, false);
  assert.strictEqual(state.turn, 'blue');
  state = play(state, 4);
  assert.strictEqual(state.turn, 'red');

  const imported = game.gameStateFromDebugImportPayload({
    gameMode: 'hex',
    preset: state.preset,
    phase: state.phase,
    turn: state.turn,
    pieRule: state.pieRule,
    pieAvailable: state.pieAvailable,
    pieSwapped: state.pieSwapped,
    nextTileId: state.nextTileId,
    tiles: state.tiles,
    recordMoves: state.recordMoves,
    round: state.round,
    ending: state.ending
  }).state;
  assert.deepStrictEqual(game.stateSummary(imported), game.stateSummary(state));

  const replayed = game.gameStateFromRecordImportPayload({
    kind: 'ramified-minigame-record',
    gameMode: 'hex',
    preset: state.preset,
    settings: { pieRule: true },
    moves: state.recordMoves
  }).state;
  assert.deepStrictEqual(game.stateSummary(replayed), game.stateSummary(state));

  let normalPie = game.beginHexGame(torusPreset(), { pieRule: true });
  normalPie = play(normalPie, 0);
  normalPie = play(normalPie, 4);
  assert.strictEqual(normalPie.pieAvailable, false);
  assert.strictEqual(game.swapHexPieColors(normalPie).changed, false);
}

function testSeededOpeningAndValidation() {
  const preset = {
    ...torusPreset(),
    hex: {
      seeds: [
        { row: 1, col: 1, color: 'red' },
        { row: 3, col: 3, color: 'blue' }
      ]
    }
  };
  let state = game.beginHexGame(preset, { pieRule: true });
  assert.strictEqual(state.phase, 'ready');
  assert.strictEqual(state.turn, 'red');
  assert.strictEqual(state.seedTiles.length, 2);
  assert.strictEqual(game.placeHexTile(state, 0).changed, false, 'opening seed occupies its tile');
  state = play(state, 1);
  assert.strictEqual(state.pieAvailable, true, 'the first live Red move opens the pie window');
  const swapped = game.swapHexPieColors(state);
  assert.strictEqual(swapped.changed, true);
  state = play(swapped.state, 2);
  const cloned = game.cloneGameState(state);
  assert.strictEqual(cloned.seedTiles.length, 2);
  const replayed = game.gameStateFromRecordImportPayload({
    kind: 'ramified-minigame-record',
    gameMode: 'hex',
    preset,
    settings: { pieRule: true },
    moves: state.recordMoves
  }).state;
  assert.deepStrictEqual(game.stateSummary(replayed), game.stateSummary(state));

  const alreadyWon = {
    ...torusPreset(),
    hex: { seeds: [1, 2, 3, 4].map((col) => ({ row: 1, col, color: 'red' })) }
  };
  const rejected = game.beginHexGame(alreadyWon);
  assert.strictEqual(rejected.phase, 'setup');
  assert.match(rejected.setupIssue, /already form a nontrivial/i);

  const duplicate = game.beginHexGame({
    ...torusPreset(),
    hex: { seeds: [{ row: 1, col: 1, color: 'red' }, { row: 1, col: 1, color: 'blue' }] }
  });
  assert.match(duplicate.setupIssue, /duplicates another seed/i);
}

function testOwnedCatalogAndDeferredTopologyLifecycle() {
  assert.deepStrictEqual(
    game.presetListForMode(game.GAME_MODES.HEX).map((preset) => preset.id),
    ['boundary-glue-board', 'classic-hex']
  );
  assert.ok(!game.presetListForMode(game.GAME_MODES.LIANLIANKAN).some((preset) => preset.id === 'classic-hex'));
  ['boundary-glue-board', 'classic-hex'].forEach((id) => {
    const owned = game.presetListForMode(game.GAME_MODES.HEX).find((preset) => preset.id === id);
    assert.ok(owned.hex && owned.hex.homology, `${id} stores Hex homology information`);
    const cached = game.createHexState(owned, { deferTopology: true });
    assert.strictEqual(cached.hexTopologyState, 'ready', `${id} does not enter the worker computation path`);
    assert.ok(cached.hexRuntime);
  });

  const boundary = game.presetListForMode(game.GAME_MODES.HEX).find((preset) => preset.id === 'boundary-glue-board');
  ['torus', 'klein-bottle', 'rp2'].forEach((boundaryGlueMode) => {
    const cached = game.createHexState(boundary, {
      deferTopology: true,
      boundaryGlueMode,
      boardRows: 5,
      boardCols: 8
    });
    assert.strictEqual(cached.hexTopologyState, 'ready', `${boundaryGlueMode} supports changing rows and columns`);
  });

  const preset = torusPreset();
  const deferred = game.createHexState(preset, { deferTopology: true });
  assert.strictEqual(deferred.phase, 'setup');
  assert.strictEqual(deferred.hexTopologyState, 'pending');
  assert.strictEqual(deferred.hexTopology, null);
  assert.strictEqual(deferred.hexRuntime, null);

  const computed = game.createHexState(preset);
  assert.strictEqual(computed.hexTopologyState, 'ready');
  game.__test.rebuildHexRuntime(deferred, computed.hexTopology);
  assert.strictEqual(deferred.hexTopologyState, 'ready');
  assert.strictEqual(deferred.hexTopology, computed.hexTopology);
  assert.ok(deferred.hexRuntime);

  const invalid = game.createHexState(preset, { deferTopology: true });
  game.__test.rebuildHexRuntime(invalid, { valid: false, reason: 'invalid topology' });
  assert.strictEqual(invalid.hexTopologyState, 'error');
  assert.strictEqual(invalid.setupIssue, 'invalid topology');

  const other = game.createHexState(preset, { deferTopology: true });
  assert.strictEqual(game.__test.hexHomologyResultMatches(4, 4, deferred, deferred), false, 'completed states reject another result');
  assert.strictEqual(game.__test.hexHomologyResultMatches(4, 5, other, other), false, 'stale request IDs are rejected');
  assert.strictEqual(game.__test.hexHomologyResultMatches(5, 5, other, deferred), false, 'replaced previews reject old results');
  assert.strictEqual(game.__test.hexHomologyResultMatches(5, 5, other, other), true);

  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const resetBlock = source.slice(source.indexOf('function resetToPreview'), source.indexOf('function finishPresetCatalogInit'));
  assert.ok(resetBlock.indexOf('render();') < resetBlock.indexOf('scheduleHexHomologyRequest(game)'));
  assert.ok(source.includes("syncStatus('computing homology'"));
  assert.ok(source.includes('deferHexHomologyFallback'));
  assert.ok(source.includes('refs.begin.disabled = !catalogAvailable || onlineRoomActive || hexTopologyPending'));
  assert.ok(fs.existsSync(require.resolve('./hex_homology_worker.js')));
}

[
  testAlternationAndWinningWitness,
  testRemovedTilesAndFullBoardDraw,
  testCloneImportRecordAndPieRule,
  testSeededOpeningAndValidation,
  testOwnedCatalogAndDeferredTopologyLifecycle
].forEach((test) => test());

console.log('hex_minigame_test: all tests passed');
