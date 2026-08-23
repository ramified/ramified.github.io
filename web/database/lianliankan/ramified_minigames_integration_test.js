const assert = require('assert');
const minigames = require('../js/ramified_minigames_setup.js');

function sharedPreset() {
  return minigames.normalizePresetPayload({
    id: 'lianliankan-shared-test',
    label: 'Lianliankan shared test',
    lattice: 'square',
    rows: 2,
    cols: 4,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 1, dir: 'W' },
        second: { row: 1, col: 4, dir: 'E' }
      },
      {
        group: 1,
        first: { row: 2, col: 1, dir: 'W' },
        second: { row: 2, col: 4, dir: 'E' }
      }
    ]
  });
}

function testSharedModeContract() {
  assert.strictEqual(minigames.GAME_MODES.LIANLIANKAN, 'lianliankan');
  assert.strictEqual(minigames.gameModeFromUrlParam('tile-link'), 'lianliankan');
  assert.ok(minigames.orderedCatalogGameModes().includes('lianliankan'));

  const preset = sharedPreset();
  const state = minigames.createLianliankanState(preset, {
    rng: minigames.createRng([0.1, 0.7, 0.3, 0.9]),
    maxShuffleAttempts: 0
  });
  assert.ok(minigames.isLianliankanGame(state));
  assert.strictEqual(state.preset.id, preset.id);
  assert.strictEqual(state.preset.lattice, preset.lattice);
  assert.strictEqual(state.board.rows, preset.rows);
  assert.strictEqual(state.board.cols, preset.cols);
  assert.strictEqual(state.topology.gluedEdges.length, 2);
  assert.ok(['ready', 'deadlock'].includes(state.phase));

  const summary = minigames.stateSummary(state);
  assert.strictEqual(summary.gameMode, 'lianliankan');
  assert.strictEqual(summary.tiles.length, 8);

  const cloned = minigames.cloneGameState(state);
  assert.ok(minigames.isLianliankanGame(cloned));
  assert.notStrictEqual(cloned.board, state.board);
  assert.deepStrictEqual(minigames.stateSummary(cloned), summary);

  const imported = minigames.gameStateFromDebugImportPayload({
    ...summary,
    preset
  }).state;
  assert.ok(minigames.isLianliankanGame(imported));
  assert.deepStrictEqual(minigames.stateSummary(imported), summary);
}

testSharedModeContract();
console.log('Lianliankan shared minigames integration tests passed.');
