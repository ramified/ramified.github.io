const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const mosaic = require('./mosaic_calculator.js').__test;
const minigames = require('./ramified_minigames_setup.js');
const billiards = require('./billiards/topological_billiards_native.js');

function tile(row, col) {
  return { row, col };
}

function glue(group, first, second, options = {}) {
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

function loadPresetJs(source) {
  const sandbox = {
    module: { exports: {} },
    globalThis: {}
  };
  vm.runInNewContext(source, sandbox, { filename: 'mosaic-export.preset.js' });
  return sandbox.module.exports;
}

function decodeBase64UrlJson(encoded) {
  const padded = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function setupBoard() {
  mosaic.setTestBoard({
    rows: 4,
    cols: 4,
    lattice: 'square',
    removedTiles: [tile(2, 2), tile(2, 3), tile(3, 2), tile(3, 3)],
    inputHoles: [tile(1, 1), tile(1, 2), tile(1, 3), tile(1, 4)],
    cutEdges: [{ left: tile(1, 1), right: tile(1, 2) }],
    gluedEdges: [
      glue(3, { row: 1, col: 4, dir: 0 }, { row: 1, col: 1, dir: 2 }),
      glue(3, { row: 2, col: 4, dir: 0 }, { row: 2, col: 1, dir: 2 }),
      glue(3, { row: 3, col: 4, dir: 0 }, { row: 3, col: 1, dir: 2 }),
      glue(3, { row: 4, col: 4, dir: 0 }, { row: 4, col: 1, dir: 2 })
    ],
    pieces: [{ row: 4, col: 4, kind: 'king', side: 'white', value: 'K' }]
  });
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'connect-four-export',
    label: 'Connect Four Export',
    group: 'Connect Four'
  });
}

function testFullExportIncludesMarkers() {
  setupBoard();
  mosaic.setTestExportControls({ type: 'all', format: 'dsl' });
  const payload = JSON.parse(mosaic.buildExportText());
  assert.strictEqual(payload.name, 'Mosaic Calculator');
  assert.ok(Array.isArray(payload.tiles));
  assert.deepStrictEqual(payload.inputHoles.map((entry) => `${entry.row},${entry.col}`), ['1,1', '1,2', '1,3', '1,4']);
  assert.deepStrictEqual(payload.pieceSets, { starts: { white: [tile(4, 4)] }, targets: {} });
  assert.deepStrictEqual(payload.pieces, [{
    row: 4,
    col: 4,
    role: 'start',
    color: 'white',
    kind: 'king',
    value: 'K',
    side: 'white'
  }]);
}

function testBackgroundFormats() {
  setupBoard();
  mosaic.setTestExportControls({ type: 'background', format: 'verbose' });
  const verbose = JSON.parse(mosaic.buildExportText());
  assert.strictEqual(verbose.schema, 'ramified-minigame-background-preset');
  assert.ok(verbose.backgroundSpace);
  assert.deepStrictEqual(verbose.preset.connectFourHoles, [tile(1, 1), tile(1, 2), tile(1, 3), tile(1, 4)]);
  assert.deepStrictEqual(verbose.preset.inputHoles, verbose.preset.connectFourHoles);

  mosaic.setTestExportControls({ type: 'background', format: 'dsl' });
  const compact = JSON.parse(mosaic.buildExportText());
  assert.strictEqual(compact.schema, undefined);
  assert.strictEqual(compact.backgroundSpace, undefined);
  assert.strictEqual(compact.size, '4x4');
  assert.strictEqual(compact.removed, 'rect(2..3,2..3)');
  assert.strictEqual(compact.holes, 'top');
  assert.match(compact.glue, /g3:1\.\.4,4,E=1\.\.4,1,W/);
}

function testMinigameFormats() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'verbose',
    id: 'connect-four-export',
    label: 'Connect Four Export',
    group: 'Connect Four'
  });
  const verbose = JSON.parse(mosaic.buildExportText());
  assert.strictEqual(verbose.id, 'connect-four-export');
  assert.strictEqual(verbose.gameTypes, undefined);
  assert.strictEqual(verbose.group, undefined);
  assert.strictEqual(verbose.groups, undefined);
  assert.strictEqual(verbose.dualGraph, undefined);
  assert.strictEqual(verbose.backgroundSpace, undefined);
  assert.strictEqual(verbose.display, undefined);
  assert.deepStrictEqual(verbose.connectFourHoles, [tile(1, 1), tile(1, 2), tile(1, 3), tile(1, 4)]);
  assert.deepStrictEqual(verbose.pieceSets, { starts: { white: [tile(4, 4)] }, targets: {} });
  assert.deepStrictEqual(verbose.pieces, [{
    row: 4,
    col: 4,
    role: 'start',
    color: 'white',
    kind: 'king',
    value: 'K',
    side: 'white'
  }]);

  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'connect-four-export',
    label: 'Connect Four Export',
    group: 'Connect Four'
  });
  const source = mosaic.buildExportText();
  assert.match(source, /RAMIFIED_MINIGAME_PRESET_DATA/);
  assert.match(source, /Save this file as ramified_minigame_presets\/connect_four_export\.preset\.js/);
  assert.match(source, /Add this entry to ramified_minigame_presets\/presets\.js:/);
  assert.match(source, /\/\/\s+"gameTypes": \[/);
  assert.match(source, /\/\/\s+"file": "connect_four_export\.preset\.js"/);
  assert.match(source, /\/\/ \},/);
  assert.match(source, /Store gameTypes in presets\.js only/);
  assert.doesNotMatch(source.slice(source.indexOf('  return {')), /"gameTypes"\s*:/);
  assert.match(source, /connect_four_export\.preset\.js/);
  const exportedPreset = loadPresetJs(source);
  assert.strictEqual(exportedPreset.id, 'connect-four-export');
  assert.strictEqual(exportedPreset.gameTypes, undefined);
  assert.strictEqual(exportedPreset.group, undefined);
  assert.strictEqual(exportedPreset.groups, undefined);
  assert.strictEqual(exportedPreset.holes, 'top');
  const normalized = minigames.normalizePresetPayload(exportedPreset);
  assert.strictEqual(normalized.rows, 4);
  assert.strictEqual(normalized.cols, 4);
  assert.strictEqual(normalized.connectFourHoles.length, 4);
}

function testGroupSelectAndMetadataDefaults() {
  setupBoard();
  const groups = mosaic.exportPresetGroupChoices();
  assert.ok(groups.includes('2048'));
  assert.ok(groups.includes('Gomoku'));
  assert.ok(groups.includes('Connect Four'));

  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: '',
    label: '',
    group: ''
  });
  const metadata = mosaic.currentExportPresetMetadata();
  assert.ok(metadata.id);
  assert.ok(metadata.key);
  assert.ok(metadata.label);
  assert.deepStrictEqual(metadata.gameTypes, ['2048']);
  assert.strictEqual(mosaic.refs.exportPresetId.value, metadata.key);
  assert.strictEqual(mosaic.refs.exportPresetLabel.value, metadata.label);
  assert.strictEqual(mosaic.refs.exportPresetGroup.value, '2048');
  assert.strictEqual(mosaic.refs.exportPresetKeyRow.hidden, true);
  assert.strictEqual(mosaic.refs.exportPresetGroupRow.hidden, false);
}

function testDisplayNameGeneratesPresetKey() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'ignored-custom-key',
    label: 'Friendly Surface',
    group: '2048'
  });
  const metadata = mosaic.currentExportPresetMetadata();
  assert.strictEqual(metadata.id, 'friendly-surface');
  assert.strictEqual(metadata.key, 'friendly_surface');
  const source = mosaic.buildExportText();
  assert.match(source, /friendly_surface\.preset\.js/);
  assert.match(source, /RAMIFIED_MINIGAME_PRESET_DATA\["friendly_surface"\]/);
  assert.strictEqual(loadPresetJs(source).id, 'friendly-surface');
}

function testCustomKeyOverride() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'manual-key',
    label: 'Friendly Surface',
    group: '2048',
    advanced: true
  });
  const metadata = mosaic.currentExportPresetMetadata();
  assert.strictEqual(metadata.id, 'manual-key');
  assert.strictEqual(metadata.key, 'manual_key');
  assert.strictEqual(mosaic.refs.exportPresetKeyRow.hidden, false);
  assert.strictEqual(mosaic.refs.exportPresetGroupRow.hidden, true);
  const source = mosaic.buildExportText();
  assert.match(source, /manual_key\.preset\.js/);
  assert.match(source, /RAMIFIED_MINIGAME_PRESET_DATA\["manual_key"\]/);
  assert.strictEqual(loadPresetJs(source).label, 'Friendly Surface');
}

function testAdvancedMultiGroupExport() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    label: 'Shared Surface',
    group: '2048',
    advanced: true,
    gameTypes: ['2048', 'Gomoku', 'Connect Four']
  });
  const metadata = mosaic.currentExportPresetMetadata();
  assert.deepStrictEqual(metadata.gameTypes, ['2048', 'Gomoku', 'Connect Four']);
  const source = mosaic.buildExportText();
  assert.match(source, /\/\/\s+"gameTypes": \[/);
  assert.doesNotMatch(source.slice(source.indexOf('  return {')), /"gameTypes"\s*:/);
  const exportedPreset = loadPresetJs(source);
  assert.strictEqual(exportedPreset.gameTypes, undefined);
  assert.strictEqual(exportedPreset.group, undefined);
  assert.strictEqual(exportedPreset.groups, undefined);
  assert.deepStrictEqual(mosaic.minigamePresetRegistryEntry(metadata).gameTypes, ['2048', 'Gomoku', 'Connect Four']);
}

function testPresetMetadataCanBeClearedWhileEditing() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'editable-id',
    label: 'Editable Label',
    group: '2048'
  });
  mosaic.refs.exportPresetId.value = '';
  mosaic.refs.exportPresetLabel.value = '';
  mosaic.refreshExport({ fillPresetDefaults: false, manual: true });
  assert.strictEqual(mosaic.refs.exportPresetId.value, '');
  assert.strictEqual(mosaic.refs.exportPresetLabel.value, '');
  const source = mosaic.refs.exportOut.value;
  assert.match(source, /RAMIFIED_MINIGAME_PRESET_DATA/);
  const exportedPreset = loadPresetJs(source);
  assert.ok(exportedPreset.id);
  assert.ok(exportedPreset.label);

  mosaic.syncExportPresetDefaults();
  assert.ok(mosaic.refs.exportPresetId.value);
  assert.ok(mosaic.refs.exportPresetLabel.value);
}

function testMinigameTestLink() {
  setupBoard();
  mosaic.setTestExportControls({
    type: 'minigame',
    format: 'dsl',
    id: 'connect-four-export',
    label: 'Connect Four Export',
    group: 'Connect Four'
  });
  const href = mosaic.buildMinigameTestHref();
  const url = new URL(href, 'https://example.test/');
  assert.strictEqual(url.pathname, '/ramified_minigames.html');
  assert.strictEqual(url.searchParams.get('mode'), 'connect-four');
  const payload = decodeBase64UrlJson(url.searchParams.get('minigamePreset'));
  assert.strictEqual(payload.id, 'connect-four-export');
  assert.strictEqual(payload.gameTypes, undefined);
  assert.strictEqual(payload.holes, 'top');
  assert.strictEqual(mosaic.refs.exportTestLinkRow.hidden, false);
  assert.ok(mosaic.refs.exportTestLink.href.includes('minigamePreset='));
  assert.strictEqual(mosaic.minigameModeForExportGameType('Gomoku'), 'gomoku');
  assert.strictEqual(mosaic.minigameModeForExportGameType('2048'), '2048');
}

function testAdvancedChineseNameAndWrappedViewExport() {
  setupBoard();
  const profiles = [
    ['x-repeat', { x: 'repeat' }],
    ['x-reflect-y', { x: 'reflect-y' }],
    ['y-repeat', { y: 'repeat' }],
    ['y-reflect-x', { y: 'reflect-x' }],
    ['torus', { x: 'repeat', y: 'repeat' }],
    ['klein-x', { x: 'reflect-y', y: 'repeat' }],
    ['klein-y', { x: 'repeat', y: 'reflect-x' }],
    ['rp2', { x: 'reflect-y', y: 'reflect-x' }]
  ];
  profiles.forEach(([control, wrappedView]) => {
    mosaic.setTestExportControls({
      type: 'minigame',
      format: 'dsl',
      id: 'named-cover',
      label: 'Named cover',
      labelZh: '中文棋盘',
      group: 'Gomoku',
      advanced: true,
      wrappedView
    });
    assert.strictEqual(mosaic.refs.exportPresetWrappedView.value, control);
    const metadata = mosaic.currentExportPresetMetadata();
    assert.strictEqual(metadata.labelZh, '中文棋盘');
    assert.deepStrictEqual(metadata.wrappedView, wrappedView);
    const exported = loadPresetJs(mosaic.buildExportText());
    assert.strictEqual(exported.labelZh, '中文棋盘');
    assert.strictEqual(JSON.stringify(exported.wrappedView), JSON.stringify(wrappedView));
    const registry = mosaic.minigamePresetRegistryEntry(metadata);
    assert.strictEqual(registry.labelZh, '中文棋盘');
    assert.deepStrictEqual(registry.wrappedView, wrappedView);
    const normalized = minigames.normalizePresetPayload(exported, { registryEntry: registry });
    assert.strictEqual(normalized.labelZh, '中文棋盘');
    assert.deepStrictEqual(normalized.wrappedView.x, wrappedView.x || '');
    assert.deepStrictEqual(normalized.wrappedView.y, wrappedView.y || '');
    const url = new URL(mosaic.buildMinigameTestHref(), 'https://example.test/');
    const payload = decodeBase64UrlJson(url.searchParams.get('minigamePreset'));
    assert.strictEqual(payload.labelZh, '中文棋盘');
    assert.deepStrictEqual(payload.wrappedView, wrappedView);
  });

  mosaic.setTestExportControls({ type: 'minigame', format: 'verbose', label: 'English fallback', group: '2048' });
  const defaultExport = mosaic.buildMinigamePresetExport();
  assert.strictEqual(defaultExport.labelZh, undefined);
  assert.strictEqual(defaultExport.wrappedView, undefined);

  const previousWindow = global.window;
  try {
    global.window = { SiteI18n: { getLocale: () => 'zh-CN', translateSource: (value) => `tr:${value}` } };
    assert.strictEqual(minigames.localizedPresetLabel({ label: 'Named cover', labelZh: '中文棋盘' }), '中文棋盘');
    assert.strictEqual(minigames.localizedPresetLabel({ label: 'English fallback' }), 'tr:English fallback');
  } finally {
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
}

function testGluedChainHoverUsesPairFocusedWidthContrast() {
  setupBoard();
  mosaic.setTestGeometry({
    width: 80,
    height: 80,
    radius: 10,
    cells: Array.from({ length: 16 }, (_, index) => ({
      row: Math.floor(index / 4) + 1,
      col: (index % 4) + 1,
      x: 10 + ((index % 4) * 20),
      y: 10 + (Math.floor(index / 4) * 20)
    }))
  });
  const pair = mosaic.state.gluedEdges[0];
  mosaic.state.gluedHover = {
    edgeKey: `${pair.first.index}:${pair.first.dir}`,
    pairIndex: 0,
    group: pair.group
  };
  const drawCalls = [];
  const ctx = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property];
      target[property] = (...args) => drawCalls.push({ method: property, args });
      return target[property];
    },
    set(target, property, value) {
      drawCalls.push({ property, value });
      target[property] = value;
      return true;
    }
  });
  mosaic.drawGluedBoundaryPairs(ctx);
  const base = Math.max(1.8, 10 * 0.055) * 1.15;
  assert.strictEqual(drawCalls.filter((call) => call.property === 'strokeStyle' && call.value === 'rgba(255,255,255,0.95)').length, 8);
  assert.strictEqual(drawCalls.filter((call) => call.property === 'lineWidth' && call.value === base * 4.2).length, 2);
  assert.strictEqual(drawCalls.filter((call) => call.property === 'lineWidth' && call.value === base * 2.65).length, 6);
  assert.strictEqual(drawCalls.filter((call) => call.property === 'strokeStyle' && call.value === 'rgba(255,209,102,0.96)').length, 0);
  assert.strictEqual(mosaic.clearGluedBoundaryHover(), true);
  assert.strictEqual(mosaic.state.gluedHover, null);
}

function testHexAndTileMatchingTestLinks() {
  const gluedEdges = minigames.generateTorusBoundaryGlue(4, 4);
  mosaic.setTestBoard({
    rows: 4,
    cols: 4,
    lattice: 'square',
    gluedEdges,
    hex: { seeds: [{ row: 2, col: 2, color: 'red' }] }
  });
  mosaic.setTestExportControls({ type: 'minigame', format: 'dsl', label: 'Hex link', group: 'Hex' });
  let url = new URL(mosaic.buildMinigameTestHref(), 'https://example.test/');
  let payload = decodeBase64UrlJson(url.searchParams.get('minigamePreset'));
  assert.strictEqual(url.searchParams.get('mode'), 'hex');
  assert.deepStrictEqual(payload.hex, { seeds: [{ row: 2, col: 2, color: 'red' }] });
  let preset = minigames.normalizePresetPayload(payload);
  let state = minigames.createHexState(preset);
  assert.deepStrictEqual(state.seedTiles.map((entry) => [entry.index, entry.color]), [[5, 'red']]);

  mosaic.setTestBoard({
    rows: 2,
    cols: 4,
    lattice: 'square',
    lianliankan: { initiallyEmpty: [{ row: 1, col: 1 }, { row: 2, col: 4 }] }
  });
  mosaic.setTestExportControls({ type: 'minigame', format: 'dsl', label: 'Matching link', group: 'Tile Matching' });
  url = new URL(mosaic.buildMinigameTestHref(), 'https://example.test/');
  payload = decodeBase64UrlJson(url.searchParams.get('minigamePreset'));
  assert.strictEqual(url.searchParams.get('mode'), 'lianliankan');
  assert.deepStrictEqual(payload.lianliankan.initiallyEmpty, [tile(1, 1), tile(2, 4)]);
  preset = minigames.normalizePresetPayload(payload);
  state = minigames.createLianliankanState(preset, { rng: () => 0.25, maxShuffleAttempts: 0 });
  assert.strictEqual(state.board.cells[0].tile, null);
  assert.strictEqual(state.board.cells[7].tile, null);
}

function testMinigameStatusAndRecordProjection() {
  const base = { id: 'status-board', label: 'Status board', lattice: 'square', rows: 2, cols: 3 };
  const hex = mosaic.normalizeExportImportPayload({
    gameMode: 'hex',
    preset: { ...base, hex: { seeds: [{ row: 1, col: 1, color: 'red' }] } },
    tiles: [{ index: 5, color: 'blue' }]
  });
  assert.deepStrictEqual(hex.hex.seeds, [
    { row: 1, col: 1, color: 'red' },
    { row: 2, col: 3, color: 'blue' }
  ]);
  assert.strictEqual(hex.inputMode, 'background');
  assert.strictEqual(hex.backgroundAction, 'decoration');

  const matching = mosaic.normalizeExportImportPayload({
    gameMode: 'lianliankan',
    preset: { ...base, lianliankan: { initiallyEmpty: [tile(1, 1)] } },
    removed: [{ index: 4, row: 2, col: 2 }],
    tiles: [{ index: 1, id: 'a' }, { index: 3, id: 'a' }]
  });
  assert.deepStrictEqual(matching.lianliankan.initiallyEmpty, [tile(1, 1), tile(1, 3), tile(2, 3)]);

  const record = {
    kind: 'ramified-minigame-record',
    gameMode: 'gomoku',
    preset: { ...base, pieces: [{ row: 1, col: 1, color: 'white' }] },
    snapshot: {
      gameMode: 'gomoku',
      preset: base,
      stones: [{ index: 4, color: 'black' }]
    }
  };
  const projectedRecord = mosaic.normalizeExportImportPayload(record);
  assert.deepStrictEqual(projectedRecord.pieces, [{ index: 4, color: 'black', role: 'start' }]);
  assert.deepStrictEqual(mosaic.exportImportMetadataFromPayload(record, null).gameTypes, ['Gomoku']);

  const recordFallback = mosaic.normalizeExportImportPayload({
    kind: 'ramified-minigame-record',
    gameMode: 'hex',
    preset: { ...base, hex: { seeds: [{ row: 1, col: 2, color: 'blue' }] } }
  });
  assert.deepStrictEqual(recordFallback.hex, { seeds: [{ row: 1, col: 2, color: 'blue' }] });

  const billiards = mosaic.normalizeExportImportPayload({
    gameMode: 'billiards',
    preset: { ...base, billiards: { ballRadius: 0.07 } },
    billiardsState: {
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }],
      pockets: [{ id: 'p1', vertex: { row: 1, col: 1, corner: 'NW' } }],
      rules: 'eight-ball'
    }
  });
  assert.strictEqual(billiards.billiards.ballRadius, 0.07);
  assert.strictEqual(billiards.billiards.balls.length, 1);
  assert.strictEqual(billiards.billiards.pockets.length, 1);

  const sokoban = mosaic.normalizeExportImportPayload({
    gameMode: 'sokoban',
    preset: base,
    players: [{ index: 0 }],
    boxes: [{ index: 1, z: 0 }],
    targets: [{ index: 2 }],
    walls: [{ index: 3 }]
  });
  assert.deepStrictEqual(sokoban.sokoban.players, [{ index: 0 }]);
  assert.deepStrictEqual(sokoban.sokoban.boxes, [{ index: 1, z: 0 }]);
  assert.deepStrictEqual(sokoban.sokoban.targets, [{ index: 2 }]);
  assert.deepStrictEqual(sokoban.sokoban.walls, [{ index: 3 }]);
}

function testCompactMinigamePresetUsesSharedImportNormalization() {
  const preset = {
    id: 'boundary-glue-board',
    label: 'Klein bottle 4x4',
    lattice: 'square',
    size: '4x4',
    surface: 'Klein bottle',
    glue: 'g0~:1..4,4,E=4..1,1,W; g1:1,1..4,N=4,1..4,S'
  };
  const prepared = mosaic.prepareExportImportText(JSON.stringify(preset));
  const imported = prepared.normalizedPayload;
  assert.strictEqual(imported.rows, 4);
  assert.strictEqual(imported.cols, 4);
  assert.strictEqual(imported.lattice, 'square');
  assert.strictEqual(imported.boundary, 'glued');
  assert.strictEqual(imported.gluedEdges.length, 8);
  assert.deepStrictEqual(imported.gluedEdges[0], {
    group: 0,
    reversed: true,
    firstArrowReversed: true,
    secondArrowReversed: true,
    first: { row: 1, col: 4, dir: 'E' },
    second: { row: 4, col: 1, dir: 'W' }
  });
  assert.deepStrictEqual(imported.gluedEdges[7], {
    group: 1,
    reversed: false,
    firstArrowReversed: false,
    secondArrowReversed: true,
    first: { row: 1, col: 4, dir: 'N' },
    second: { row: 4, col: 4, dir: 'S' }
  });
}

function testExportHiddenRowsHaveCssRule() {
  const html = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  const pageAdapter = fs.readFileSync(require.resolve('./import_export_page_adapters.js'), 'utf8');
  assert.ok(html.includes('.export-meta-field[hidden]'));
  assert.ok(html.includes('display: none !important;'));
  const presetRow = html.indexOf('id="export-preset-meta-row"');
  const storedDataRow = html.indexOf('id="export-precomputed-game-data-row"');
  const testRow = html.indexOf('id="export-test-link-row"');
  assert.ok(html.includes('id="export-precomputed-game-data"'));
  assert.ok(html.includes('id="export-preset-label-zh"'));
  assert.ok(html.includes('id="export-preset-wrapped-view"'));
  assert.ok(html.includes('store precomputed game data'));
  assert.ok(presetRow < storedDataRow && storedDataRow < testRow, 'stored game data occupies one row immediately before Test');
  assert.ok(
    pageAdapter.includes("controls: ['#export-preset-meta-row', '#export-precomputed-game-data-row', '#export-test-link-row']"),
    'shared Import/Export panel must retain the stored game data row'
  );
}

function testHolePruningAndToggle() {
  mosaic.setTestBoard({
    rows: 3,
    cols: 3,
    lattice: 'square',
    removedTiles: [tile(1, 1)],
    inputHoles: [tile(1, 1), tile(1, 2)]
  });
  assert.deepStrictEqual(mosaic.inputHolesForExport().map((entry) => `${entry.row},${entry.col}`), ['1,2']);
  assert.strictEqual(mosaic.toggleInputHole(0, { update: false }), false);
  assert.strictEqual(mosaic.toggleInputHole(2, { update: false }), true);
  assert.deepStrictEqual(mosaic.inputHolesForExport().map((entry) => `${entry.row},${entry.col}`), ['1,2', '1,3']);
  assert.strictEqual(mosaic.toggleInputHole(2, { update: false }), true);
  assert.deepStrictEqual(mosaic.inputHolesForExport().map((entry) => `${entry.row},${entry.col}`), ['1,2']);
}

function testImportStyleMarkers() {
  mosaic.setTestBoard({
    rows: 6,
    cols: 7,
    lattice: 'square',
    inputHoles: Array.from({ length: 7 }, (_, col) => tile(1, col + 1)),
    pieces: [
      { row: 2, col: 2, kind: 'rook', side: 'black', value: 'r' },
      { row: 9, col: 9, kind: 'outside' }
    ]
  });
  const compact = mosaic.buildCompactBackgroundExport(false);
  assert.strictEqual(compact.holes, 'top');
  assert.deepStrictEqual(compact.pieceSets, { starts: { black: [tile(2, 2)] }, targets: {} });
  assert.deepStrictEqual(compact.pieces, [{
    row: 2,
    col: 2,
    role: 'start',
    color: 'black',
    kind: 'rook',
    value: 'R',
    side: 'black'
  }]);
}

function testPieceSetsImportExportAndDecorationToggle() {
  mosaic.setTestBoard({
    rows: 4,
    cols: 4,
    lattice: 'square',
    pieceSets: {
      starts: {
        black: [tile(1, 1)],
        blue: [tile(2, 2)]
      },
      targets: {
        black: [tile(4, 4)]
      }
    }
  });
  assert.deepStrictEqual(mosaic.pieceSetsForExport(), {
    starts: {
      black: [tile(1, 1)],
      blue: [tile(2, 2)]
    },
    targets: {
      black: [tile(4, 4)]
    }
  });

  mosaic.setTestBoard({
    rows: 3,
    cols: 3,
    lattice: 'square',
    backgroundAction: 'decoration',
    backgroundDecorationKind: 'target',
    backgroundDecorationColor: 'green'
  });
  assert.strictEqual(mosaic.toggleBackgroundDecoration(8, { update: false }), true);
  assert.deepStrictEqual(mosaic.pieceSetsForExport(), { starts: {}, targets: { green: [tile(3, 3)] } });
  assert.strictEqual(mosaic.toggleBackgroundDecoration(8, { update: false }), true);
  assert.strictEqual(mosaic.pieceSetsForExport(), null);
}

function testSokobanDecorationPaletteAndExports() {
  const palette = mosaic.backgroundDecorationPreferences();
  const paletteKinds = palette.map((entry) => entry.kind);
  [
    'clear',
    'input-hole',
    'start',
    'target',
    'sokoban-player',
    'sokoban-box',
    'sokoban-target',
    'sokoban-sea',
    'sokoban-wall',
    'sokoban-ice',
    'sokoban-energy-bridge'
  ].forEach((kind) => assert.ok(paletteKinds.includes(kind), `palette missing ${kind}`));

  mosaic.setTestBoard({
    rows: 3,
    cols: 4,
    lattice: 'square',
    sokoban: {
      players: [tile(2, 1), tile(2, 2)],
      boxes: [tile(2, 3)],
      targets: [tile(2, 4)],
      sea: [tile(3, 1)],
      walls: [tile(1, 1)],
      ice: [tile(1, 2)],
      energyBridges: [tile(1, 3)]
    }
  });
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    sea: [tile(3, 1)],
    targets: [tile(2, 4)],
    ice: [tile(1, 2)],
    energyBridges: [tile(1, 3)],
    walls: [tile(1, 1)],
    boxes: [tile(2, 3)],
    players: [tile(2, 1), tile(2, 2)]
  });
  assert.deepStrictEqual(mosaic.compactSokobanDecorationsForExport(), {
    sea: '3,1',
    targets: '2,4',
    ice: '1,2',
    energyBridges: '1,3',
    walls: '1,1',
    boxes: '2,3',
    players: '2,1; 2,2'
  });

  mosaic.setTestExportControls({
    type: 'background',
    format: 'verbose',
    id: 'sokoban-export',
    label: 'Sokoban Export',
    group: 'Sokoban'
  });
  const verbose = JSON.parse(mosaic.buildExportText());
  assert.deepStrictEqual(verbose.preset.sokoban.boxes, [tile(2, 3)]);
  assert.deepStrictEqual(verbose.preset.sokoban.sea, [tile(3, 1)]);
  assert.deepStrictEqual(verbose.preset.removedTiles, []);

  mosaic.setTestExportControls({
    type: 'background',
    format: 'dsl',
    id: 'sokoban-export',
    label: 'Sokoban Export',
    group: 'Sokoban'
  });
  const compact = JSON.parse(mosaic.buildExportText());
  assert.strictEqual(compact.sokoban.players, '2,1; 2,2');
  assert.strictEqual(compact.sokoban.sea, '3,1');
  const normalized = minigames.normalizePresetPayload(compact);
  assert.deepStrictEqual(normalized.sokoban.walls, [tile(1, 1)]);
  assert.deepStrictEqual(normalized.sokoban.sea, [tile(3, 1)]);
  assert.deepStrictEqual(normalized.removedTiles, []);
}

function testGameSpecificDecorationExports() {
  mosaic.setTestBoard({
    rows: 4,
    cols: 4,
    lattice: 'square',
    lianliankan: { initiallyEmpty: [tile(1, 2)] },
    hex: { seeds: [{ row: 2, col: 2, color: 'red' }, { row: 3, col: 3, color: 'blue' }] },
    billiards: {
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 4, col: 4, x: 0.1, y: -0.1 } }
      ],
      pockets: [{ id: 'p1', vertex: { row: 1, col: 1, corner: 'NW' } }]
    }
  });
  const exported = mosaic.buildMinigamePresetExport();
  assert.deepStrictEqual(exported.lianliankan, { initiallyEmpty: [tile(1, 2)] });
  assert.deepStrictEqual(exported.hex.seeds, [
    { row: 2, col: 2, color: 'red' },
    { row: 3, col: 3, color: 'blue' }
  ]);
  assert.strictEqual(exported.billiards.balls.length, 2);
  assert.deepStrictEqual(exported.billiards.pockets, [{ id: 'p1', vertex: { row: 1, col: 1, corner: 'NW' } }]);
  assert.strictEqual(mosaic.minigameModeForExportGameType('Tile Matching'), 'lianliankan');
  assert.strictEqual(mosaic.minigameModeForExportGameType('Hex (Nash)'), 'hex');
  assert.strictEqual(mosaic.minigameModeForExportGameType('Billiard'), 'billiards');
  assert.strictEqual(mosaic.minigameModeForExportGameType('Billiards'), 'billiards');

  mosaic.setTestBoard({
    rows: 3,
    cols: 3,
    lattice: 'square',
    removedTiles: [tile(1, 1)],
    lianliankan: { initiallyEmpty: [tile(1, 1)] },
    hex: { seeds: [{ row: 1, col: 1, color: 'red' }] },
    billiards: {
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }],
      pockets: [{ id: 'p1', vertex: { row: 1, col: 1, corner: 'NW' } }]
    }
  });
  const pruned = mosaic.buildMinigamePresetExport();
  assert.strictEqual(pruned.lianliankan, undefined);
  assert.strictEqual(pruned.hex, undefined);
  assert.deepStrictEqual(pruned.billiards, { pockets: [] });
}

function testBilliardsPaletteDropAndRackDirection() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    boundary: 'glued',
    inputMode: 'background',
    backgroundAction: 'decoration',
    backgroundDecorationKind: 'billiards-rack-6',
    billiards: { ballRadius: 0.05, pockets: [] }
  });
  mosaic.setTestGeometry({
    width: 220,
    height: 220,
    radius: 50,
    cells: [
      { x: 50, y: 50 }, { x: 150, y: 50 },
      { x: 50, y: 150 }, { x: 150, y: 150 }
    ]
  });
  mosaic.refs.canvas = {
    style: {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 220, height: 220 }; }
  };
  assert.strictEqual(mosaic.billiardsEditorGeometry().size, 100);
  assert.strictEqual(mosaic.toggleBackgroundDecoration(0, { clientX: 50, clientY: 50, update: false }), true);
  assert.deepStrictEqual(mosaic.state.billiardsRack, {
    count: 6,
    tileIndex: 0,
    position: { x: 0, y: 0 }
  });
  assert.strictEqual(mosaic.toggleBackgroundDecoration(1, { clientX: 80, clientY: 50, update: false }), true);
  assert.strictEqual(mosaic.state.billiardsRack, null);
  assert.deepStrictEqual(
    mosaic.buildMinigamePresetExport().billiards.balls.map((ball) => ball.number).sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6]
  );
  delete mosaic.refs.canvas;
}

function testSquareBilliardsUsesFullTileSide() {
  mosaic.setTestBoard({
    rows: 1,
    cols: 2,
    lattice: 'square',
    boundary: 'glued',
    billiards: {
      ballRadius: 0.05,
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }],
      pockets: []
    }
  });
  mosaic.setTestGeometry({
    width: 180,
    height: 100,
    radius: 40,
    cells: [{ x: 40, y: 40 }, { x: 120, y: 40 }]
  });
  const geometry = mosaic.billiardsEditorGeometry();
  const state = mosaic.currentBilliardsEditorState();
  assert.strictEqual(geometry.size, 80);
  const local = billiards.canvasToLocal({ x: 120, y: 40 }, geometry, state.atlas);
  assert.strictEqual(local.tileIndex, 1);
  assert.ok(Math.abs(local.position.x) < 1e-9);
  assert.ok(Math.abs(local.position.y) < 1e-9);

  const arcRadii = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {},
    fill() {}, stroke() {}, fillText() {}, setLineDash() {},
    arc(x, y, radius) { arcRadii.push(radius); }
  };
  billiards.render(ctx, geometry, state);
  assert.ok(arcRadii.some((radius) => Math.abs(radius - 4) < 1e-9), '0.05 local-radius ball should render at 4 px');
}

function testBilliardsBallDoubleClickRemovalAndCanonicalExportType() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    boundary: 'glued',
    inputMode: 'background',
    backgroundAction: 'decoration',
    billiards: {
      ballRadius: 0.05,
      balls: [{ id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } }],
      pockets: []
    }
  });
  mosaic.setTestGeometry({
    width: 220,
    height: 220,
    radius: 50,
    cells: [
      { x: 50, y: 50 }, { x: 150, y: 50 },
      { x: 50, y: 150 }, { x: 150, y: 150 }
    ]
  });
  mosaic.refs.canvas = {
    style: {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 220, height: 220 }; }
  };
  assert.strictEqual(mosaic.eraseBilliardsBallAtClientPoint(50, 50), true);
  assert.deepStrictEqual(mosaic.buildMinigamePresetExport().billiards, { ballRadius: 0.05, pockets: [] });
  assert.strictEqual(mosaic.eraseBilliardsBallAtClientPoint(50, 50), false);
  assert.ok(mosaic.exportPresetGroupChoices().includes('Billiard'));
  assert.ok(!mosaic.exportPresetGroupChoices().includes('Billiards'));
  delete mosaic.refs.canvas;
}

function testBilliardsPocketMaterializationAndRemoval() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    boundary: 'glued',
    inputMode: 'background',
    backgroundAction: 'decoration',
    backgroundDecorationKind: 'billiards-pocket',
    billiards: { ballRadius: 0.05 }
  });
  mosaic.setTestGeometry({
    width: 220,
    height: 220,
    radius: 50,
    cells: [
      { x: 50, y: 50 }, { x: 150, y: 50 },
      { x: 50, y: 150 }, { x: 150, y: 150 }
    ]
  });
  mosaic.refs.canvas = {
    style: {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 220, height: 220 }; }
  };
  const implicit = mosaic.currentBilliardsEditorState();
  assert.ok(implicit.pockets.length > 0);
  assert.strictEqual(mosaic.billiardsRenderStateForDecoration(implicit).pockets.length, 0);
  assert.strictEqual(mosaic.toggleBackgroundDecoration(0, { clientX: 50, clientY: 50, update: false }), true);
  assert.strictEqual(mosaic.state.billiards.pocketsExplicit, true);
  const materialized = mosaic.currentBilliardsEditorState();
  assert.strictEqual(mosaic.billiardsRenderStateForDecoration(materialized).pockets.length, materialized.pockets.length);
  const pocketCount = mosaic.state.billiards.pockets.length;
  assert.strictEqual(mosaic.toggleBackgroundDecoration(0, { clientX: 50, clientY: 50, update: false }), true);
  assert.strictEqual(mosaic.state.billiards.pockets.length, pocketCount - 1);
  delete mosaic.refs.canvas;
}

function testSokobanDecorationCoexistenceRules() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 4,
    lattice: 'square',
    backgroundAction: 'decoration',
    backgroundDecorationKind: 'sokoban-target'
  });
  const index = 0;
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  mosaic.state.backgroundDecorationKind = 'sokoban-box';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  mosaic.state.backgroundDecorationKind = 'water';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    sea: [tile(1, 1)],
    targets: [tile(1, 1)],
    boxes: [tile(1, 1)]
  });

  mosaic.state.backgroundDecorationKind = 'sokoban-ice';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    targets: [tile(1, 1)],
    ice: [tile(1, 1)],
    boxes: [tile(1, 1)]
  });

  mosaic.state.backgroundDecorationKind = 'sokoban-sea';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  mosaic.state.backgroundDecorationKind = 'sokoban-energy-bridge';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    sea: [tile(1, 1)],
    targets: [tile(1, 1)],
    boxes: [tile(1, 1)],
    energyBridges: [tile(1, 1)]
  });

  mosaic.state.backgroundDecorationKind = 'sokoban-box';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  mosaic.state.backgroundDecorationKind = 'sokoban-player';
  assert.strictEqual(mosaic.toggleBackgroundDecoration(index, { update: false }), true);
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    targets: [tile(1, 1)],
    players: [tile(1, 1)]
  });

  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 1), tile(1, 2)],
      sea: [tile(1, 1), tile(1, 2)],
      ice: [tile(1, 1)],
      energyBridges: [tile(1, 2)]
    }
  });
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    sea: [tile(1, 1), tile(1, 2)],
    targets: [tile(1, 1), tile(1, 2)],
    boxes: [tile(1, 2)],
    energyBridges: [tile(1, 2)]
  });
}

function testSokobanWallToggleDoesNotRemoveTile() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    backgroundAction: 'decoration',
    backgroundDecorationKind: 'sokoban-wall'
  });
  assert.strictEqual(mosaic.toggleBackgroundDecoration(0, { update: false }), true);
  assert.strictEqual(mosaic.state.removedTiles.has(0), false);
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), { walls: [tile(1, 1)] });
}

function testHoleMarkerDrawingMatchesConnectFour() {
  const mosaicSource = fs.readFileSync(require.resolve('./mosaic_calculator.js'), 'utf8');
  const minigameSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  [
    'geom.radius * 0.34',
    '#fffdf8',
    '#111111',
    "rgba(17,17,17,0.18)",
    "rgba(31,122,140,0.62)",
    'radius * 1.22'
  ].forEach((needle) => {
    assert.ok(mosaicSource.includes(needle.replace(/geom\.radius/g, 'tileRadius')) || mosaicSource.includes(needle));
    assert.ok(minigameSource.includes(needle));
  });
}

function testSokobanDecorationDrawingMatchesMinigame() {
  const mosaicSource = fs.readFileSync(require.resolve('./mosaic_calculator.js'), 'utf8');
  const minigameSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  [
    'drawSokobanBrickPattern',
    'drawSokobanCrate',
    'drawSokobanCratePath',
    'drawSokobanSnowflakeMark',
    'drawSokobanSea',
    "lattice && lattice.shape === 'hex'",
    "'#6c6257'",
    "'#b8793f'",
    "'#5d351e'",
    'createRadialGradient',
    'ctx.clip()',
    "'rgba(255,253,248,0.92)'",
    "'#111111'"
  ].forEach((needle) => {
    assert.ok(mosaicSource.includes(needle), `mosaic missing ${needle}`);
    assert.ok(minigameSource.includes(needle), `minigame missing ${needle}`);
  });
  assert.ok(mosaicSource.includes('const SOKOBAN_OBJECT_SCALE_DEFAULT = 0.70;'));
  assert.ok(mosaicSource.includes('const SOKOBAN_ENERGY_GLOW_DEFAULT = { inner: 0.55, outer: 0.82, blur: 0.38 };'));
  assert.ok(minigameSource.includes('const SOKOBAN_OBJECT_SCALE_DEFAULT = 70;'));
  assert.ok(minigameSource.includes('const SOKOBAN_ENERGY_GLOW_INNER_DEFAULT = 55;'));
  assert.ok(minigameSource.includes('const SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT = 82;'));
  assert.ok(minigameSource.includes('const SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT = 38;'));
  const minigamePlayerSource = minigameSource.slice(
    minigameSource.indexOf('function drawSokobanPlayer'),
    minigameSource.indexOf('function drawPlacementWinningLine')
  );
  assert.ok(!minigamePlayerSource.includes("'#2563eb'"));
}

function testRemovedBoundaryPresetIdsAreNotAdvertised() {
  const mosaicSource = fs.readFileSync(require.resolve('./mosaic_calculator.js'), 'utf8');
  const registrySource = fs.readFileSync(require.resolve('../ramified_minigame_presets/presets.js'), 'utf8');
  const backgroundPresetSource = mosaicSource.slice(
    mosaicSource.indexOf('const BACKGROUND_SPACE_PRESETS'),
    mosaicSource.indexOf('const SOKOBAN_ENERGY_GLOW_DEFAULT')
  );
  ["id: 'torus'", "id: 'klein-bottle'"].forEach((needle) => {
    assert.ok(!backgroundPresetSource.includes(needle), `${needle} should not be in Mosaic Calculator background presets`);
  });
  ['"id": "torus"', '"id": "klein-bottle"', '"id": "gomoku-classic"', '"id": "gomoku-random-glue"'].forEach((needle) => {
    assert.ok(!registrySource.includes(needle), `${needle} should not be in the minigame catalog`);
  });
  assert.ok(registrySource.includes('"id": "boundary-glue-board"'));
}

function testPaletteSwatchRatios() {
  const html = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  const source = fs.readFileSync(require.resolve('./mosaic_calculator.js'), 'utf8');
  const swatchBlock = html.slice(
    html.indexOf('    .tile-swatch {'),
    html.indexOf('    .tile-swatch[data-lattice-shape="square"]')
  );
  assert.ok(html.includes('.tile-swatch[data-lattice-shape="square"]'));
  assert.ok(html.includes('aspect-ratio: 1 / 1;'));
  assert.ok(html.includes('.tile-swatch[data-lattice-shape="hex"]'));
  assert.ok(html.includes('aspect-ratio: 1.7320508076 / 2;'));
  assert.ok(!/^\s+height:\s*46px;/m.test(swatchBlock));
  assert.ok(source.includes('button.dataset.latticeShape'));
  assert.ok(source.includes('Math.sqrt(3) / 2'));
}

function testStagedImportCatalogAndParameterizedLevels() {
  const html = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  const adapter = fs.readFileSync(require.resolve('./import_export_page_adapters.js'), 'utf8');
  assert.match(html, /id="import-catalog"/);
  ['knot/link', 'stable curve', 'minigames'].forEach((label) => assert.ok(html.includes(`>${label}<`)));
  assert.ok(html.includes('id="import-minigame-type"'));
  assert.ok(html.includes('id="minigame-rows"'));
  assert.ok(html.includes('id="minigame-cols"'));
  assert.ok(html.includes('id="minigame-board-size"'));
  assert.ok(!html.includes('id="background-preset-select"'));
  assert.ok(!html.includes('id="load-background-preset"'));
  assert.ok(adapter.includes("catalogContainer: '#mosaic-import-catalog-controls'"));
  assert.ok(adapter.includes('if (catalogSource && catalogContainer)'));
  assert.ok(adapter.includes("catalogContainer.setAttribute('data-import-source-panel', 'catalog')"));
  const source = fs.readFileSync(require.resolve('./mosaic_calculator.js'), 'utf8');
  assert.ok(source.includes('function importMosaicFromUrlParams()'));
  assert.ok(source.includes("get('mosaicPreset')"));
  assert.ok(source.includes("imported.inputMode = 'background'"));
  assert.ok(source.includes("imported.backgroundAction = 'decoration'"));

  const catalog = mosaic.minigamePresetRegistryEntries();
  const boundary = catalog.find((entry) => entry.id === 'boundary-glue-board');
  const queens = catalog.find((entry) => entry.id === 'n-queens-puzzle');
  assert.ok(boundary && boundary.gameTypes.includes('2048'));
  assert.ok(queens && queens.gameTypes.includes('FIDE Chess'));
  const boundaryPayload = mosaic.materializeMinigamePresetForMosaic(
    boundary,
    require('../ramified_minigame_presets/boundary_glue_board.preset.js')
  );
  assert.strictEqual(boundaryPayload.rows, 4);
  assert.strictEqual(boundaryPayload.cols, 4);
  assert.strictEqual(boundaryPayload.gluedEdges.length, 8);
  const queensPayload = mosaic.materializeMinigamePresetForMosaic(
    queens,
    require('../ramified_minigame_presets/n_queens_puzzle.preset.js')
  );
  assert.strictEqual(queensPayload.rows, queensPayload.cols);
  assert.strictEqual(queensPayload.pieces.length, queensPayload.rows);
}

function testEveryMinigameCatalogLevelMaterializesForImport() {
  const registry = require('../ramified_minigame_presets/presets.js').presets;
  registry.forEach((entry) => {
    const source = require(`../ramified_minigame_presets/${entry.file}`);
    const payload = mosaic.normalizeExportImportPayload(
      mosaic.materializeMinigamePresetForMosaic(entry, source)
    );
    assert.ok(payload.rows >= 2 && payload.rows <= 20, `${entry.id} needs valid imported rows`);
    assert.ok(payload.cols >= 2 && payload.cols <= 20, `${entry.id} needs valid imported columns`);
    if (typeof source.removed === 'string' && source.removed) {
      assert.ok(Array.isArray(payload.removedTiles) && payload.removedTiles.length, `${entry.id} needs compact removed tiles normalized`);
    }
    if (typeof source.glue === 'string' && source.glue) {
      assert.ok(Array.isArray(payload.gluedEdges) && payload.gluedEdges.length, `${entry.id} needs compact gluing normalized`);
    }
  });
  const rubiks = registry.find((entry) => entry.id === 'rubiks-cube-2x2x2');
  const rubiksPayload = mosaic.materializeMinigamePresetForMosaic(
    rubiks,
    require('../ramified_minigame_presets/rubiks_cube_2x2x2.preset.js')
  );
  assert.strictEqual(rubiksPayload.rows, 6);
  assert.strictEqual(rubiksPayload.cols, 8);
  assert.strictEqual(rubiksPayload.gluedEdges.length, 14);
  assert.ok(rubiksPayload.removedTiles.length > 0);
}

function testMinigameImportsClearOtherGameDecorations() {
  const registry = require('../ramified_minigame_presets/presets.js').presets;
  const ramifiedCover = registry.find((entry) => entry.id === 'ramified-cover');
  const coverSource = require('../ramified_minigame_presets/ramified_cover.preset.js');
  const matching = mosaic.materializeMinigamePresetForMosaic(ramifiedCover, coverSource, 'Tile Matching');
  assert.ok(matching.lianliankan.initiallyEmpty.length > 0, 'the selected game keeps its preset decorations');
  assert.deepStrictEqual(matching.inputHoles, []);
  assert.deepStrictEqual(matching.hex, { seeds: [] });
  assert.deepStrictEqual(matching.billiards, { balls: [], pockets: [] });
  assert.deepStrictEqual(matching.pieces, []);
  assert.ok(Object.values(matching.sokoban).every((entries) => entries.length === 0));

  const game2048 = mosaic.materializeMinigamePresetForMosaic(ramifiedCover, coverSource, '2048');
  assert.deepStrictEqual(game2048.lianliankan, { initiallyEmpty: [] }, 'shared levels do not leak Tile Matching decorations into 2048');

  const usualStrip = registry.find((entry) => entry.id === 'usual-strip');
  const billiards = mosaic.materializeMinigamePresetForMosaic(
    usualStrip,
    require('../ramified_minigame_presets/usual_strip.preset.js'),
    'Billiard'
  );
  assert.ok(billiards.billiards.balls.length > 0, 'the selected Billiards decorations are retained');
  assert.deepStrictEqual(billiards.lianliankan, { initiallyEmpty: [] });
  assert.deepStrictEqual(billiards.pieces, []);

  const topologyOnly = mosaic.isolateMinigamePresetDecorations({ rows: 4, cols: 4 }, 'Gomoku');
  assert.deepStrictEqual(topologyOnly.removedTiles, []);
  assert.deepStrictEqual(topologyOnly.cutEdges, []);
  assert.deepStrictEqual(topologyOnly.gluedEdges, []);
}

function testKnotImportClearsExistingDecorations() {
  const cleared = mosaic.clearDecorationsForKnotLinkImport({
    lattice: 'square', rows: 5, cols: 5, tiles: []
  });
  assert.deepStrictEqual(cleared.inputHoles, []);
  assert.deepStrictEqual(cleared.lianliankan.initiallyEmpty, []);
  assert.deepStrictEqual(cleared.hex.seeds, []);
  assert.deepStrictEqual(cleared.billiards.balls, []);
  assert.deepStrictEqual(cleared.billiards.pockets, []);
  assert.deepStrictEqual(cleared.pieces, []);
  assert.ok(Object.values(cleared.sokoban).every((entries) => Array.isArray(entries) && entries.length === 0));
}

function testManualExportRefreshAndOutsideDecorationRemoval() {
  setupBoard();
  mosaic.refs.exportOut.value = 'stale preview';
  mosaic.refreshExport();
  assert.strictEqual(mosaic.refs.exportOut.value, 'stale preview');
  mosaic.refreshExport({ manual: true });
  assert.notStrictEqual(mosaic.refs.exportOut.value, 'stale preview');

  mosaic.setTestBoard({
    rows: 2,
    cols: 2,
    lattice: 'square',
    removedTiles: [tile(1, 2)],
    inputHoles: [tile(1, 1)]
  });
  const descriptor = { type: 'input-hole', kind: 'input-hole' };
  assert.strictEqual(mosaic.moveBackgroundDecoration(0, 1, descriptor), false, 'removed in-canvas targets are non-destructive');
  assert.deepStrictEqual(mosaic.inputHolesForExport().map(({ row, col }) => ({ row, col })), [tile(1, 1)]);
  assert.strictEqual(mosaic.moveBackgroundDecoration(0, -1, descriptor, { removeWhenOutside: true, update: false }), true);
  assert.deepStrictEqual(mosaic.inputHolesForExport(), []);
}

function testPrecomputedDataRequiresManualRefresh() {
  mosaic.setTestBoard({
    rows: 2,
    cols: 3,
    lattice: 'square',
    gluedEdges: minigames.generateTorusBoundaryGlue(2, 3),
    hex: { seeds: [{ row: 1, col: 1, color: 'red' }] }
  });
  mosaic.setTestExportControls({ type: 'minigame', format: 'verbose', label: 'Manual Hex', group: 'Hex', storeHexHomology: true });
  mosaic.refs.exportOut.value = 'unchanged';
  mosaic.refreshExport();
  assert.strictEqual(mosaic.refs.exportOut.value, 'unchanged');
  assert.strictEqual(mosaic.buildMinigamePresetExport().hex.homology, undefined);
  mosaic.refreshExport({ manual: true });
  const exported = JSON.parse(mosaic.refs.exportOut.value);
  assert.strictEqual(exported.hex.homology.version, 1);
}

const tests = [
  testFullExportIncludesMarkers,
  testBackgroundFormats,
  testMinigameFormats,
  testGroupSelectAndMetadataDefaults,
  testDisplayNameGeneratesPresetKey,
  testCustomKeyOverride,
  testAdvancedMultiGroupExport,
  testAdvancedChineseNameAndWrappedViewExport,
  testGluedChainHoverUsesPairFocusedWidthContrast,
  testPresetMetadataCanBeClearedWhileEditing,
  testMinigameTestLink,
  testHexAndTileMatchingTestLinks,
  testMinigameStatusAndRecordProjection,
  testCompactMinigamePresetUsesSharedImportNormalization,
  testExportHiddenRowsHaveCssRule,
  testHolePruningAndToggle,
  testImportStyleMarkers,
  testPieceSetsImportExportAndDecorationToggle,
  testSokobanDecorationPaletteAndExports,
  testGameSpecificDecorationExports,
  testBilliardsPaletteDropAndRackDirection,
  testSquareBilliardsUsesFullTileSide,
  testBilliardsBallDoubleClickRemovalAndCanonicalExportType,
  testBilliardsPocketMaterializationAndRemoval,
  testSokobanDecorationCoexistenceRules,
  testSokobanWallToggleDoesNotRemoveTile,
  testHoleMarkerDrawingMatchesConnectFour,
  testSokobanDecorationDrawingMatchesMinigame,
  testRemovedBoundaryPresetIdsAreNotAdvertised,
  testPaletteSwatchRatios,
  testStagedImportCatalogAndParameterizedLevels,
  testEveryMinigameCatalogLevelMaterializesForImport,
  testMinigameImportsClearOtherGameDecorations,
  testKnotImportClearsExistingDecorations,
  testManualExportRefreshAndOutsideDecorationRemoval,
  testPrecomputedDataRequiresManualRefresh
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} mosaic calculator export tests passed`);
