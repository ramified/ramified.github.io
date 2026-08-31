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
  assert.strictEqual(japanese.length, 71);
  assert.strictEqual(japanese[0].glyph, 'あ');
  assert.ok(japanese.every((symbol) => symbol.id.startsWith('hiragana_')));
  assert.ok(japanese.some((symbol) => symbol.glyph === 'ぽ'));

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

function testJapanesePronunciationPlayback() {
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'hiragana_chi', glyph: 'ち' }),
    'assets/ramified_minigames/japanese_pronunciation/chi.ogg'
  );
  assert.strictEqual(minigames.lianliankanPronunciationPath({ id: 'han_山', glyph: '山' }), '');

  const created = [];
  const OriginalAudio = global.Audio;
  global.Audio = class FakeAudio {
    constructor(source) {
      this.source = source;
      this.currentTime = 0;
      this.preload = '';
      this.volume = 1;
      this.listeners = {};
      created.push(this);
    }

    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }

    pause() {
      this.paused = true;
    }

    removeAttribute(name) {
      if (name === 'src') this.sourceReleased = true;
    }

    load() {
      this.reloaded = true;
    }

    play() {
      this.played = true;
      return Promise.resolve();
    }
  };
  const previousGame = minigames.__test.getGame();
  const previousPreferences = minigames.__test.getFullscreenPreferences();
  try {
    const activeGame = minigames.createLianliankanState(sharedPreset(), {
      rng: minigames.createRng([0.1, 0.7, 0.3, 0.9]),
      maxShuffleAttempts: 0
    });
    minigames.__test.setGame(activeGame);
    minigames.__test.setFullscreenPreferences(minigames.__test.fullscreenSettingsDefaults);
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_po', glyph: 'ぽ' }), false);
    assert.strictEqual(created.length, 0, 'sound defaults to off without creating an Audio object');

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 0.35,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_po', glyph: 'ぽ' }), true);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].source, 'assets/ramified_minigames/japanese_pronunciation/po.ogg');
    assert.strictEqual(created[0].volume, 0.35);
    assert.strictEqual(created[0].played, true);
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'han_山', glyph: '山' }), false);

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 0,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(created[0].paused, true, 'zero volume stops active pronunciation');
    assert.strictEqual(created[0].sourceReleased, true, 'stopped pronunciation releases its local source');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_chi', glyph: 'ち' }), false);
    assert.strictEqual(created.length, 1, 'zero volume does not create another Audio object');

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 1,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_chi', glyph: 'ち' }), true);
    minigames.__test.setGame(null);
    assert.strictEqual(created[1].paused, true, 'switching away from Tile Matching stops active pronunciation');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_chi', glyph: 'ち' }), false);
  } finally {
    minigames.__test.stopLianliankanPronunciation();
    minigames.__test.setGame(previousGame);
    minigames.__test.setFullscreenPreferences(previousPreferences);
    if (OriginalAudio === undefined) delete global.Audio;
    else global.Audio = OriginalAudio;
  }
}

function testJapanesePronunciationAssets() {
  const audioFolder = path.join(__dirname, '..', 'assets', 'ramified_minigames', 'japanese_pronunciation');
  const sources = JSON.parse(fs.readFileSync(path.join(audioFolder, 'sources.json'), 'utf8'));
  const expectedIds = lianliankan.HIRAGANA_SYMBOLS.map((symbol) => symbol.id.slice('hiragana_'.length));
  assert.strictEqual(sources.license, 'Public domain');
  assert.deepStrictEqual(sources.files.map((entry) => entry.id), expectedIds);
  sources.files.forEach((entry) => {
    const asset = path.join(audioFolder, entry.local);
    assert.ok(fs.existsSync(asset), `missing local pronunciation asset: ${entry.local}`);
    assert.ok(fs.statSync(asset).size > 1000, `pronunciation asset is unexpectedly small: ${entry.local}`);
  });
}

function testRapidConsecutiveTileMatches() {
  const state = minigames.createLianliankanState(sharedPreset(), {
    rng: minigames.createRng([0.1, 0.7, 0.3, 0.9]),
    maxShuffleAttempts: 0
  });
  state.board.cells.forEach((cell) => {
    cell.tile = null;
  });
  state.board.cells[0].tile = { id: 'fast_a', glyph: 'A' };
  state.board.cells[1].tile = { id: 'fast_a', glyph: 'A' };
  state.board.cells[2].tile = { id: 'fast_b', glyph: 'B' };
  state.board.cells[3].tile = { id: 'fast_b', glyph: 'B' };
  state.matches = 0;
  state.selectedIndex = null;
  state.pendingMatch = null;
  lianliankan.updateGameStatus(state);

  const previousGame = minigames.__test.getGame();
  try {
    minigames.__test.setGame(state);
    minigames.__test.selectLianliankanTile(state, 0);
    const firstMatch = minigames.__test.selectLianliankanTile(state, 1);
    assert.strictEqual(firstMatch.result.kind, 'removed');
    assert.strictEqual(state.board.cells[0].tile, null);
    assert.strictEqual(state.board.cells[1].tile, null);
    assert.strictEqual(state.phase, 'ready', 'the board is ready before the first match effect expires');
    assert.deepStrictEqual(
      firstMatch.effect.tiles.map((entry) => entry.tile.glyph),
      ['A', 'A'],
      'removed tiles remain captured for the temporary visual effect'
    );

    const nextSelection = minigames.__test.selectLianliankanTile(state, 2);
    assert.strictEqual(nextSelection.result.kind, 'selected', 'another tile can be selected during the first effect');
    assert.strictEqual(state.selectedIndex, 2);
    const secondMatch = minigames.__test.selectLianliankanTile(state, 3);
    assert.strictEqual(secondMatch.result.kind, 'removed');
    assert.strictEqual(state.phase, 'complete');
    assert.strictEqual(state.matches, 2);
    assert.strictEqual(minigames.__test.activeLianliankanMatchEffects(state).length, 2, 'rapid match effects coexist');

    minigames.__test.clearLianliankanMatchEffects(state);
    assert.strictEqual(minigames.__test.activeLianliankanMatchEffects(state).length, 0);
  } finally {
    minigames.__test.clearLianliankanMatchEffects();
    minigames.__test.setGame(previousGame);
  }
}

function testHexTileMatchingUsesHexTopology() {
  const rawPreset = require('../ramified_minigame_presets/usual_strip.preset.js');
  const preset = minigames.normalizePresetPayload({
    ...rawPreset,
    gameTypes: ['Tile Matching']
  });
  const state = minigames.createLianliankanState(preset, {
    rng: minigames.createRng([0.1, 0.7, 0.3, 0.9]),
    maxShuffleAttempts: 0
  });
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.strictEqual(state.topology.directions.length, 6);
  assert.strictEqual(state.board.rows, 4);
  assert.strictEqual(state.board.cols, 5);
  assert.ok(['ready', 'deadlock'].includes(state.phase));
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
testJapanesePronunciationPlayback();
testJapanesePronunciationAssets();
testRapidConsecutiveTileMatches();
testHexTileMatchingUsesHexTopology();
testSharedLocaleContract();
testLargeBoundaryBoardEmptyRing();
console.log('Lianliankan shared minigames integration tests passed.');
