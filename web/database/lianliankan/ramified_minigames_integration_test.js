const assert = require('assert');
const fs = require('fs');
const path = require('path');
const minigames = require('../js/ramified_minigames_setup.js');
const lianliankan = require('./lianliankan_engine.js');

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
  assert.strictEqual(minigames.gameModeFromUrlParam('Tile Matching'), 'lianliankan');
  assert.strictEqual(minigames.gameModeFromUrlParam('连连看'), 'lianliankan');
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

function testPresetEmptyCellsRemainPlayable() {
  const preset = minigames.normalizePresetPayload({
    ...sharedPreset(),
    lianliankan: { initiallyEmpty: [{ row: 1, col: 1 }] }
  });
  const state = minigames.createLianliankanState(preset, {
    rng: minigames.createRng([0.2, 0.8, 0.4, 0.6]),
    maxShuffleAttempts: 0
  });
  const first = state.board.cells[0];
  assert.strictEqual(first.playable, true);
  assert.strictEqual(first.tile, null, 'configured empty cell must remain a path cell');
  assert.strictEqual(state.board.cells.filter((cell) => cell.tile).length, 6, 'odd capacity gains one deterministic empty cell');
}

function testExplicitCatalogEligibility() {
  const tileMatchingPresets = minigames.presetListForMode(minigames.GAME_MODES.LIANLIANKAN).map((preset) => preset.id);
  assert.deepStrictEqual(tileMatchingPresets, [
    'boundary-glue-board',
    'ramified-cover',
    'rubiks-cube-2x2x2',
    'rubiks-cube-3x3x3',
    'usual-strip'
  ]);
  assert.strictEqual(minigames.defaultPresetIdForMode(minigames.GAME_MODES.LIANLIANKAN), 'rubiks-cube-2x2x2');

  const billiardsPresets = minigames.presetListForMode(minigames.GAME_MODES.BILLIARDS).map((preset) => preset.id);
  assert.deepStrictEqual(billiardsPresets, ['boundary-glue-board', 'twisted-torus', 'genus-2', 'half-glued', 'rubiks-cube-2x2x2', 'usual-strip']);

  const boundaryModes = minigames.gameModesForPreset(minigames.normalizePresetPayload({
    id: 'untagged-square',
    label: 'untagged square',
    lattice: 'square',
    rows: 4,
    cols: 4,
    gameTypes: ['2048']
  }));
  assert.deepStrictEqual(boundaryModes, ['2048'], 'untagged square presets must not gain Tile Matching or Billiard automatically');
}

function testTileMatchingTileSets() {
  assert.strictEqual(minigames.defaultBoardSizeForMode(minigames.GAME_MODES.LIANLIANKAN), 6);
  const chinese = minigames.lianliankanSymbolsForTileSet('chinese');
  assert.strictEqual(chinese[0].glyph, '山');
  assert.ok(chinese.every((symbol) => symbol.id.startsWith('han_')));

  const japanese = minigames.lianliankanSymbolsForTileSet('japanese');
  assert.strictEqual(japanese[0].glyph, 'あ');
  assert.ok(japanese.every((symbol) => symbol.id.startsWith('hiragana_')));

  const young = minigames.lianliankanSymbolsForTileSet('young-3x3');
  assert.strictEqual(young.length, 19);
  assert.deepStrictEqual(young[0], { id: 'young_100', glyph: '' });
  assert.deepStrictEqual(young[young.length - 1], { id: 'young_333', glyph: '' });

  const state = minigames.createLianliankanState(boundaryPreset(6, 6), {
    boardRows: 6,
    boardCols: 6,
    symbols: young,
    rng: minigames.createRng([0.3, 0.8, 0.2, 0.7])
  });
  state.board.cells.filter((cell) => cell.tile).forEach((cell) => {
    assert.ok(cell.tile.id.startsWith('young_'));
  });

  const html = fs.readFileSync(path.join(__dirname, '..', 'ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="lianliankan-tile-set"'));
  assert.ok(html.includes('value="chinese" selected'));
  assert.ok(html.includes('value="japanese"'));
  assert.ok(html.includes('value="young-3x3"'));
}

function testSharedLocaleContract() {
  const locales = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n', 'ramified_minigames_locales.js'), 'utf8');
  [
    "'setup.lianliankanRules'",
    "'setup.refreshRemainingTiles'",
    "'games.lianliankan'",
    "'status.lianliankanMatch'",
    "'status.lianliankanHint'",
    "'status.noLianliankanMatches'",
    "'status.tilesLeft'",
    "'status.pairsCleared'",
    "'common.showHint'",
    "'common.resetGame'",
    "Tile Matching",
    "连连看",
    "'access.tileSet': ['Tile Matching tile set', '连连看图案组']",
    "'setup.tileSet': ['Tile set', '图案组']",
    "'setup.chineseCharacters': ['Chinese characters', '汉字']",
    "'setup.japaneseCharacters': ['Japanese characters', '日文假名']",
    "'setup.youngDiagrams3x3': ['Young diagrams (3×3)', '杨图（3×3）']",
    "tiles remaining$",
    "selected; (\\\\d+) tiles remaining$"
  ].forEach((source) => assert.ok(locales.includes(source), `missing Lianliankan locale source: ${source}`));
}

function boundaryPreset(rows, cols) {
  return {
    id: minigames.BOUNDARY_GLUE_BOARD_PRESET_ID,
    label: 'boundary glue board',
    lattice: 'square',
    rows,
    cols,
    surface: 'torus',
    boundaryGlueBoard: true,
    boundaryGlueMode: minigames.BOUNDARY_GLUE_MODES.TORUS,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
}

function outerRingIndices(state) {
  return state.board.cells
    .filter((cell) => cell.row === 1 || cell.row === state.board.rows || cell.col === 1 || cell.col === state.board.cols)
    .map((cell) => cell.index);
}

function testLargeBoundaryBoardEmptyRing() {
  const state = minigames.createLianliankanState(boundaryPreset(6, 6), {
    boardRows: 6,
    boardCols: 6,
    rng: minigames.createRng([0.1, 0.7, 0.3, 0.9])
  });
  const ring = outerRingIndices(state);
  assert.strictEqual(ring.length, 20);
  ring.forEach((index) => {
    assert.strictEqual(state.board.cells[index].playable, true, 'the outer ring remains traversable');
    assert.strictEqual(state.board.cells[index].tile, null, 'the outer ring starts tile-free');
  });
  assert.strictEqual(lianliankan.remainingTileCount(state), 16);
  assert.strictEqual(state.preset.removedTiles.length, 0);

  lianliankan.refreshGame(state, { rng: minigames.createRng([0.8, 0.2, 0.6, 0.4]) });
  ring.forEach((index) => assert.strictEqual(state.board.cells[index].tile, null, 'refresh preserves the empty ring'));

  const cloned = minigames.cloneGameState(state);
  ring.forEach((index) => assert.strictEqual(cloned.board.cells[index].tile, null, 'cloning preserves the empty ring'));

  state.resultDismissed = true;
  const summary = minigames.stateSummary(state);
  assert.strictEqual(summary.resultDismissed, true);
  const imported = minigames.gameStateFromDebugImportPayload({ ...summary, preset: state.preset }).state;
  assert.strictEqual(imported.resultDismissed, true);
  ring.forEach((index) => assert.strictEqual(imported.board.cells[index].tile, null, 'import preserves the empty ring'));

  state.board.cells.forEach((cell) => {
    cell.tile = null;
  });
  lianliankan.updateGameStatus(state);
  const completeSummary = minigames.stateSummary(state);
  assert.strictEqual(completeSummary.phase, 'complete');
  const importedComplete = minigames.gameStateFromDebugImportPayload({ ...completeSummary, preset: state.preset }).state;
  assert.strictEqual(importedComplete.phase, 'complete');
  assert.strictEqual(lianliankan.remainingTileCount(importedComplete), 0, 'a completed import must not regenerate tiles');

  const shortSide = minigames.createLianliankanState(boundaryPreset(4, 6), {
    boardRows: 4,
    boardCols: 6,
    rng: minigames.createRng([0.2, 0.6, 0.4, 0.8])
  });
  assert.strictEqual(lianliankan.remainingTileCount(shortSide), 24, 'boards with a side of four keep their full tile layout');
}

testSharedModeContract();
testPresetEmptyCellsRemainPlayable();
testExplicitCatalogEligibility();
testTileMatchingTileSets();
testSharedLocaleContract();
testLargeBoundaryBoardEmptyRing();
console.log('Lianliankan shared minigames integration tests passed.');
