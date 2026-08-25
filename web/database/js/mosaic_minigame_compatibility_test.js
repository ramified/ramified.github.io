'use strict';

const assert = require('assert');
const minigames = require('./ramified_minigames_setup.js');
const topologicalHex = require('./hex_homology_game.js');
const mosaic = require('./mosaic_calculator.js').__test;

function torusPreset(gameTypes, decorations = {}) {
  return {
    id: 'compatibility-torus',
    label: 'Compatibility torus',
    gameTypes,
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'torus',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: minigames.generateTorusBoundaryGlue(4, 4),
    ...decorations
  };
}

function testHexMinigameArtifactsRoundTrip() {
  const preset = torusPreset(['Hex'], {
    hex: {
      seeds: [{ row: 1, col: 1, color: 'red' }],
      homology: { version: 1, scheme: 'square-boundary-glue-v1' }
    }
  });
  let state = minigames.beginHexGame(preset);
  state = minigames.placeHexTile(state, 5).state;
  minigames.__test.setGame(state);

  const background = minigames.__test.backgroundPresetForExport();
  const compact = minigames.__test.compactBackgroundPresetForExport(background);
  const status = minigames.__test.debugExportPayload();
  const record = minigames.__test.gameRecordExportPayload(state);
  [background, compact, status.preset, record.preset, record.snapshot.preset].forEach((entry) => {
    assert.deepStrictEqual(entry.hex, preset.hex);
  });

  const importedBackground = minigames.normalizePresetPayload(background);
  assert.deepStrictEqual(importedBackground.hex, preset.hex);
  const importedStatusState = minigames.gameStateFromDebugImportPayload(status).state;
  const importedRecordState = minigames.gameStateFromRecordImportPayload(record).state;
  assert.deepStrictEqual(minigames.stateSummary(importedStatusState), minigames.stateSummary(state));
  assert.deepStrictEqual(minigames.stateSummary(importedRecordState), minigames.stateSummary(state));
  assert.deepStrictEqual(importedStatusState.preset.hex, preset.hex);
  assert.deepStrictEqual(importedRecordState.preset.hex, preset.hex);
  assert.strictEqual(importedStatusState.seedTiles.length, 1);
  assert.strictEqual(importedRecordState.seedTiles.length, 1);

  assert.strictEqual(mosaic.normalizeExportImportPayload(background).hex.seeds.length, 1);
  assert.strictEqual(mosaic.normalizeExportImportPayload(status).hex.seeds.length, 2);
  assert.strictEqual(mosaic.normalizeExportImportPayload(record).hex.seeds.length, 2);
  assert.deepStrictEqual(mosaic.normalizeExportImportPayload(status).hex.homology, preset.hex.homology);
  assert.deepStrictEqual(mosaic.exportImportMetadataFromPayload(status, null).gameTypes, ['Hex']);
}

function testTileMatchingMinigameArtifactsRoundTrip() {
  const preset = {
    id: 'compatibility-matching',
    label: 'Compatibility matching',
    gameTypes: ['Tile Matching'],
    lattice: 'square',
    rows: 2,
    cols: 4,
    surface: 'rectangle',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    lianliankan: { initiallyEmpty: [{ row: 1, col: 1 }, { row: 2, col: 4 }] }
  };
  const state = minigames.createLianliankanState(preset, { rng: () => 0.25, maxShuffleAttempts: 0 });
  state.board.cells[1].tile = null;
  minigames.__test.setGame(state);

  const background = minigames.__test.backgroundPresetForExport();
  const compact = minigames.__test.compactBackgroundPresetForExport(background);
  const status = minigames.__test.debugExportPayload();
  const record = minigames.__test.gameRecordExportPayload(state);
  [background, compact, status.preset, record.preset, record.snapshot.preset].forEach((entry) => {
    assert.deepStrictEqual(entry.lianliankan, preset.lianliankan);
  });

  const importedStatus = minigames.gameStateFromDebugImportPayload(status).state;
  const importedRecord = minigames.gameStateFromRecordImportPayload(record).state;
  assert.strictEqual(minigames.stateSummary(importedStatus).tiles.length, 5);
  assert.strictEqual(minigames.stateSummary(importedRecord).tiles.length, 5);
  assert.deepStrictEqual(importedStatus.preset.lianliankan, preset.lianliankan);
  assert.deepStrictEqual(importedRecord.preset.lianliankan, preset.lianliankan);

  assert.strictEqual(mosaic.normalizeExportImportPayload(background).lianliankan.initiallyEmpty.length, 2);
  assert.strictEqual(mosaic.normalizeExportImportPayload(status).lianliankan.initiallyEmpty.length, 3);
  assert.strictEqual(mosaic.normalizeExportImportPayload(record).lianliankan.initiallyEmpty.length, 3);
  assert.deepStrictEqual(mosaic.exportImportMetadataFromPayload(record, null).gameTypes, ['Tile Matching']);
}

function testEveryMosaicExportShapeImportsInMinigames() {
  mosaic.setTestBoard({
    rows: 4,
    cols: 4,
    lattice: 'square',
    gluedEdges: minigames.generateTorusBoundaryGlue(4, 4),
    lianliankan: { initiallyEmpty: [{ row: 1, col: 2 }] },
    hex: { seeds: [{ row: 2, col: 2, color: 'blue' }] }
  });
  mosaic.setTestExportControls({ type: 'minigame', format: 'verbose', label: 'Compatibility export', group: 'Hex' });
  const payloads = [
    mosaic.buildFullExport(),
    mosaic.buildBackgroundPresetExport(),
    mosaic.buildCompactBackgroundExport(false),
    mosaic.buildMinigamePresetExport()
  ];
  payloads.forEach((payload) => {
    const imported = minigames.presetFromImportText(JSON.stringify(payload));
    assert.deepStrictEqual(imported.hex, { seeds: [{ row: 2, col: 2, color: 'blue' }] });
    assert.deepStrictEqual(imported.lianliankan, { initiallyEmpty: [{ row: 1, col: 2 }] });
  });
  const texts = payloads.map((payload) => JSON.stringify(payload)).concat(mosaic.buildMinigamePresetJsExport());
  texts.forEach((text) => {
    const prepared = minigames.__test.prepareImportRequest({
      source: 'paste',
      text,
      importMode: 'hex',
      targetMode: 'hex',
      keepCurrentGameMode: true
    });
    assert.strictEqual(prepared.kind, 'preset');
    assert.deepStrictEqual(prepared.preset.hex, { seeds: [{ row: 2, col: 2, color: 'blue' }] });
    assert.deepStrictEqual(prepared.preset.lianliankan, { initiallyEmpty: [{ row: 1, col: 2 }] });
  });
}

function testMosaicOptionalHexHomologyCache() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 3,
    lattice: 'square',
    gluedEdges: minigames.generateTorusBoundaryGlue(2, 3),
    hex: { seeds: [{ row: 1, col: 1, color: 'red' }] }
  });
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'verbose',
    label: 'Cached Hex export',
    group: 'Hex',
    storeHexHomology: false
  });
  assert.strictEqual(mosaic.buildMinigamePresetExport().hex.homology, undefined);

  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'verbose',
    label: 'Cached Hex export',
    group: 'Hex',
    storeHexHomology: true
  });
  const exported = mosaic.buildMinigamePresetExport();
  assert.strictEqual(exported.hex.homology.version, 1);
  assert.match(exported.hex.homology.fingerprint, /^v1:/);
  assert.ok(exported.hex.homology.generators.length > 0);
  assert.ok(Array.isArray(exported.hex.homology.signatures));
  assert.deepStrictEqual(mosaic.buildFullExport().hex.homology, exported.hex.homology);
  assert.deepStrictEqual(mosaic.buildBackgroundPresetExport().preset.hex.homology, exported.hex.homology);
  const compact = mosaic.buildCompactBackgroundExport(true);
  assert.deepStrictEqual(compact.hex.homology, exported.hex.homology);

  topologicalHex.__test.topologyCache.clear();
  const imported = minigames.normalizePresetPayload(exported);
  const state = minigames.createHexState(imported, { deferTopology: true });
  assert.strictEqual(state.hexTopologyState, 'ready');
  assert.deepStrictEqual(imported.hex.homology, exported.hex.homology);

  topologicalHex.__test.topologyCache.clear();
  const compactState = minigames.createHexState(minigames.normalizePresetPayload(compact), { deferTopology: true });
  assert.strictEqual(compactState.hexTopologyState, 'ready');

  topologicalHex.__test.topologyCache.clear();
  const stale = JSON.parse(JSON.stringify(imported));
  stale.hex.homology.fingerprint += '-stale';
  assert.strictEqual(minigames.createHexState(stale, { deferTopology: true }).hexTopologyState, 'pending');
}

[
  testHexMinigameArtifactsRoundTrip,
  testTileMatchingMinigameArtifactsRoundTrip,
  testEveryMosaicExportShapeImportsInMinigames,
  testMosaicOptionalHexHomologyCache
].forEach((test) => test());

console.log('mosaic_minigame_compatibility_test: all tests passed');
