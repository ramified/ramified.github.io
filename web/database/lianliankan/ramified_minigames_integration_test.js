const assert = require('assert');
const fs = require('fs');
const path = require('path');
const minigames = require('../js/ramified_minigames_setup.js');
const koreanAudio = require('../js/ramified_minigames_korean_audio.js');
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

  const katakana = minigames.lianliankanSymbolsForTileSet('japanese-katakana');
  assert.strictEqual(katakana.length, 71);
  assert.deepStrictEqual(katakana[0], { id: 'katakana_a', glyph: 'ア' });

  const mixedKana = minigames.lianliankanSymbolsForTileSet('japanese-mixed');
  assert.strictEqual(mixedKana.length, 71);
  assert.deepStrictEqual(mixedKana[0], {
    id: 'hiragana_a', glyph: 'あ', matchKey: 'kana_a', counterpart: { id: 'katakana_a', glyph: 'ア', matchKey: 'kana_a' }
  });

  const koreanConsonants = minigames.lianliankanSymbolsForTileSet('korean-jamo-consonants');
  const koreanVowels = minigames.lianliankanSymbolsForTileSet('korean-jamo-vowels');
  const koreanBasic = minigames.lianliankanSymbolsForTileSet('korean-jamo-basic');
  const koreanModern = minigames.lianliankanSymbolsForTileSet('korean-jamo-modern');
  const koreanCombined = minigames.lianliankanSymbolsForTileSet('korean-jamo-combined');
  assert.strictEqual(koreanConsonants.length, 14);
  assert.strictEqual(koreanVowels.length, 10);
  assert.strictEqual(koreanBasic.length, 24);
  assert.strictEqual(koreanModern.length, 16);
  assert.strictEqual(koreanCombined.length, 40);
  assert.ok(koreanModern.some((symbol) => symbol.glyph === 'ㄲ'));
  assert.ok(koreanModern.some((symbol) => symbol.glyph === 'ㅢ'));
  assert.ok(koreanCombined.some((symbol) => symbol.glyph === 'ㅎ'));

  const spellingA = minigames.lianliankanSymbolsForTileSet('korean-spelling-a');
  const spellingVowels = minigames.lianliankanSymbolsForTileSet('korean-spelling-vowels');
  const spellingCv = minigames.lianliankanSymbolsForTileSet('korean-spelling-cv');
  const spellingCvc = minigames.lianliankanSymbolsForTileSet('korean-spelling-cvc');
  assert.strictEqual(spellingA.length, 14);
  assert.ok(spellingA.some((symbol) => symbol.glyph === '가'));
  assert.ok(spellingA.some((symbol) => symbol.glyph === '아'));
  assert.deepStrictEqual(spellingVowels.map((symbol) => symbol.glyph), ['아', '야', '어', '여', '오', '요', '우', '유', '으', '이']);
  assert.strictEqual(spellingCv.length, 140);
  assert.strictEqual(spellingCvc.length, 1120);
  assert.ok(spellingCvc.some((symbol) => symbol.glyph === '각'));
  assert.ok(spellingCvc.some((symbol) => symbol.glyph === '강'));

  const ipaVowels = minigames.lianliankanSymbolsForTileSet('ipa-vowels');
  const ipaPulmonic = minigames.lianliankanSymbolsForTileSet('ipa-pulmonic-consonants');
  const ipaNonPulmonic = minigames.lianliankanSymbolsForTileSet('ipa-non-pulmonic-consonants');
  const ipaOther = minigames.lianliankanSymbolsForTileSet('ipa-other-symbols');
  const ipaAffricates = minigames.lianliankanSymbolsForTileSet('ipa-affricates');
  assert.strictEqual(ipaVowels.length, 28);
  assert.strictEqual(ipaPulmonic.length, 59);
  assert.strictEqual(ipaNonPulmonic.length, 14);
  assert.strictEqual(ipaOther.length, 10);
  assert.strictEqual(ipaAffricates.length, 8);
  assert.deepStrictEqual(ipaVowels[0], { id: 'ipa_Close_front_unrounded_vowel', glyph: 'i' });
  assert.ok(ipaAffricates.some((symbol) => symbol.glyph === 't͡ʃ'));

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
  assert.ok(html.includes('id="lianliankan-tile-level-row"'));
  assert.ok(html.includes('id="lianliankan-tile-level"'));
  assert.ok(html.includes('value="chinese" selected'));
  assert.ok(html.includes('value="japanese"'));
  assert.ok(html.includes('value="korean"'));
  assert.ok(html.includes('value="ipa"'));
  assert.ok(html.includes('value="japanese-katakana"'));
  assert.ok(html.includes('value="japanese-mixed"'));
  [
    'korean-jamo-consonants', 'korean-jamo-vowels', 'korean-jamo-basic', 'korean-jamo-modern', 'korean-jamo-combined',
    'korean-spelling-a', 'korean-spelling-vowels', 'korean-spelling-cv', 'korean-spelling-cvc',
    'ipa-vowels', 'ipa-pulmonic-consonants', 'ipa-non-pulmonic-consonants', 'ipa-other-symbols', 'ipa-affricates'
  ].forEach((value) => assert.ok(html.includes(`value="${value}"`), `missing Korean Tile Matching option ${value}`));
  assert.ok(html.includes('id="lianliankan-ipa-audio-note"'));
  assert.ok(html.includes('value="young-3x3"'));
  const koreanAudioScript = 'js/ramified_minigames_korean_audio.js?v=20260901-1';
  const setupScript = 'js/ramified_minigames_setup.js?v=20260901-9';
  assert.ok(html.includes(koreanAudioScript), 'the Korean audio catalog is loaded in the browser');
  assert.ok(html.indexOf(koreanAudioScript) < html.indexOf(setupScript), 'the Korean audio catalog loads before minigame setup');
}

function testJapanesePronunciationPlayback() {
  const katakanaWithoutAudio = lianliankan.KATAKANA_SYMBOLS.filter((symbol) => !minigames.lianliankanPronunciationPath(symbol));
  assert.deepStrictEqual(katakanaWithoutAudio, [], 'every Katakana tile resolves to its matching Hiragana pronunciation audio');
  lianliankan.KATAKANA_SYMBOLS.forEach((symbol) => {
    const syllable = symbol.id.slice('katakana_'.length);
    assert.strictEqual(
      minigames.lianliankanPronunciationPath(symbol),
      `assets/ramified_minigames/japanese_pronunciation/${syllable}.mp3?v=20260901-2`
    );
  });
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'hiragana_chi', glyph: 'ち' }),
    'assets/ramified_minigames/japanese_pronunciation/chi.mp3?v=20260901-2'
  );
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'katakana_chi', glyph: 'チ' }),
    'assets/ramified_minigames/japanese_pronunciation/chi.mp3?v=20260901-2'
  );
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'katakana_chi', glyph: 'チ', matchKey: 'kana_chi' }),
    'assets/ramified_minigames/japanese_pronunciation/chi.mp3?v=20260901-2'
  );
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'hangul_consonant_g', glyph: 'ㄱ' }),
    'assets/ramified_minigames/korean_pronunciation/introduction/g-m.mp3?v=20260901-1'
  );
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'hangul_spelling_cv_b_i', glyph: '비' }),
    'assets/ramified_minigames/korean_pronunciation/hangul-table/bi-f.mp3?v=20260901-1'
  );
  assert.strictEqual(
    minigames.lianliankanPronunciationPath({ id: 'ipa_Close_front_unrounded_vowel', glyph: 'i' }),
    'https://www.ipachart.com/ogg/Close_front_unrounded_vowel.ogg'
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
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'katakana_bi', glyph: 'ビ' }), false);
    assert.strictEqual(created.length, 0, 'sound defaults to off without creating an Audio object');

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 0.35,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_po', glyph: 'ぽ' }), true);
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].source, 'assets/ramified_minigames/japanese_pronunciation/po.mp3?v=20260901-2');
    assert.strictEqual(created[0].volume, 0.35);
    assert.strictEqual(created[0].played, true);
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'katakana_ze', glyph: 'ゼ' }), true);
    assert.strictEqual(created[1].source, 'assets/ramified_minigames/japanese_pronunciation/ze.mp3?v=20260901-2');
    assert.strictEqual(created[1].played, true, 'Katakana ゼ pronunciation starts playback');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'katakana_bi', glyph: 'ビ' }), true);
    assert.strictEqual(created[2].source, 'assets/ramified_minigames/japanese_pronunciation/bi.mp3?v=20260901-2');
    assert.strictEqual(created[2].played, true, 'Katakana ビ pronunciation starts playback when sound is enabled');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hangul_spelling_cv_b_i', glyph: '비' }), true);
    assert.strictEqual(created[3].source, 'assets/ramified_minigames/korean_pronunciation/hangul-table/bi-f.mp3?v=20260901-1');
    assert.strictEqual(created[3].played, true, 'Korean 비 pronunciation starts playback when sound is enabled');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'han_山', glyph: '山' }), false);

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 0,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(created[3].paused, true, 'zero volume stops active pronunciation');
    assert.strictEqual(created[3].sourceReleased, true, 'stopped pronunciation releases its local source');
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_chi', glyph: 'ち' }), false);
    assert.strictEqual(created.length, 4, 'zero volume does not create another Audio object');

    minigames.__test.setFullscreenPreferences({
      soundEnabled: true,
      soundVolume: 1,
      showActionRow: true,
      showGameTools: true
    });
    assert.strictEqual(minigames.__test.playLianliankanPronunciation({ id: 'hiragana_chi', glyph: 'ち' }), true);
    minigames.__test.setGame(null);
    assert.strictEqual(created[4].paused, true, 'switching away from Tile Matching stops active pronunciation');
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
    const browserAssetName = `${entry.id}.mp3`;
    const browserAsset = path.join(audioFolder, browserAssetName);
    assert.ok(fs.existsSync(browserAsset), `missing browser-compatible pronunciation asset: ${browserAssetName}`);
    assert.ok(fs.statSync(browserAsset).size > 1000, `browser-compatible pronunciation asset is unexpectedly small: ${browserAssetName}`);
  });
}

function testKoreanPronunciationAssets() {
  const audioFolder = path.join(__dirname, '..', 'assets', 'ramified_minigames', 'korean_pronunciation');
  const index = fs.readFileSync(path.join(audioFolder, 'audio-index.md'), 'utf8');
  const indexedRows = index.split(/\r?\n/).map((line) => {
    const match = line.match(/^\|\s*`([^`]+\.mp3)`\s*\|\s*([^|]+?)\s*\|/);
    return match ? { relativePath: match[1], glyph: match[2].trim() } : null;
  }).filter(Boolean);
  assert.strictEqual(indexedRows.length, 474, 'the Korean audio index lists every local MP3');
  assert.strictEqual(Object.keys(koreanAudio.indexedByGlyph).length, indexedRows.length);
  indexedRows.forEach(({ relativePath, glyph }) => {
    assert.strictEqual(koreanAudio.indexedByGlyph[glyph], relativePath, `catalog follows audio-index.md for ${glyph}`);
    const asset = path.join(audioFolder, ...relativePath.split('/'));
    assert.ok(fs.existsSync(asset), `missing indexed Korean pronunciation asset: ${relativePath}`);
    assert.ok(fs.statSync(asset).size > 1000, `Korean pronunciation asset is unexpectedly small: ${relativePath}`);
  });

  const localFiles = [];
  fs.readdirSync(audioFolder, { withFileTypes: true }).filter((entry) => entry.isDirectory()).forEach((directory) => {
    fs.readdirSync(path.join(audioFolder, directory.name)).filter((name) => name.endsWith('.mp3')).forEach((name) => {
      localFiles.push(`${directory.name}/${name}`);
    });
  });
  assert.deepStrictEqual(localFiles.sort(), indexedRows.map((row) => row.relativePath).sort(), 'every local Korean MP3 is indexed');

  const finalExam = minigames.lianliankanSymbolsForTileSet('korean-jamo-combined');
  assert.strictEqual(finalExam.length, 40);
  assert.ok(finalExam.every((symbol) => minigames.lianliankanPronunciationPath(symbol)), 'every final-exam jamo has direct or indexed example audio');
  assert.strictEqual(koreanAudio.pathForGlyph('ㄹ'), 'hangul-table/la-f.mp3');
  assert.strictEqual(koreanAudio.pathForGlyph('ㅇ'), 'hangul-table/ang-m.mp3');
  assert.strictEqual(koreanAudio.pathForGlyph('ㅢ'), 'hangul-table/ui-f.mp3');

  const cvSymbols = minigames.lianliankanSymbolsForTileSet('korean-spelling-cv');
  assert.strictEqual(cvSymbols.filter((symbol) => minigames.lianliankanPronunciationPath(symbol)).length, 139);
  assert.deepStrictEqual(cvSymbols.filter((symbol) => !minigames.lianliankanPronunciationPath(symbol)).map((symbol) => symbol.glyph), ['랴']);
  const cvcSymbols = minigames.lianliankanSymbolsForTileSet('korean-spelling-cvc');
  assert.strictEqual(cvcSymbols.filter((symbol) => minigames.lianliankanPronunciationPath(symbol)).length, 42);
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
    "'setup.japaneseHiragana': ['Japanese Hiragana', '日文平假名']",
    "'setup.japaneseKatakana': ['Japanese Katakana', '日文片假名']",
    "'setup.japaneseMixedKana': ['Japanese mixed Kana', '日文平假名与片假名配对']",
    "'setup.koreanJamoConsonants': ['Korean jamo: basic consonants', '韩文字母：基础辅音']",
    "'setup.koreanJamoCombined': ['Korean jamo: final exam', '韩文字母：综合测验']",
    "'setup.koreanSpellingCvc': ['Korean spelling 4: basic CVC', '韩文拼写 4：基础辅音－元音－收音']",
    "'setup.ipaCharacters': ['IPA symbols', '国际音标符号']",
    "'setup.ipaAudioAttribution': ['Audio from IPA Chart; see its clip licences and attribution.', '语音来自 IPA Chart；请查看各音频的许可与署名。']",
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
testKoreanPronunciationAssets();
testRapidConsecutiveTileMatches();
testHexTileMatchingUsesHexTopology();
testSharedLocaleContract();
testLargeBoundaryBoardEmptyRing();
console.log('Lianliankan shared minigames integration tests passed.');
