const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const mosaic = require('./mosaic_calculator.js').__test;
const minigames = require('./ramified_minigames_setup.js');

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
  assert.deepStrictEqual(payload.pieces, [{ row: 4, col: 4, kind: 'king', side: 'white', value: 'K' }]);
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
  assert.strictEqual(verbose.pieces, undefined);

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
  assert.match(source, /\/\/ \};/);
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
  mosaic.refreshExport({ fillPresetDefaults: false });
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

function testExportHiddenRowsHaveCssRule() {
  const html = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  assert.ok(html.includes('.export-meta-field[hidden]'));
  assert.ok(html.includes('display: none !important;'));
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
  assert.deepStrictEqual(compact.pieces, [{ row: 2, col: 2, kind: 'rook', side: 'black', value: 'r' }]);
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
  assert.deepStrictEqual(
    palette.map((entry) => entry.kind),
    [
      'clear',
      'input-hole',
      'start',
      'target',
      'sokoban-player',
      'sokoban-box',
      'sokoban-target',
      'sokoban-wall',
      'sokoban-ice',
      'sokoban-energy-bridge'
    ]
  );

  mosaic.setTestBoard({
    rows: 3,
    cols: 4,
    lattice: 'square',
    sokoban: {
      players: [tile(2, 1), tile(2, 2)],
      boxes: [tile(2, 3)],
      targets: [tile(2, 4)],
      walls: [tile(1, 1)],
      ice: [tile(1, 2)],
      energyBridges: [tile(1, 3)]
    }
  });
  assert.deepStrictEqual(mosaic.sokobanDecorationsForExport(), {
    targets: [tile(2, 4)],
    ice: [tile(1, 2)],
    energyBridges: [tile(1, 3)],
    walls: [tile(1, 1)],
    boxes: [tile(2, 3)],
    players: [tile(2, 1), tile(2, 2)]
  });
  assert.deepStrictEqual(mosaic.compactSokobanDecorationsForExport(), {
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
  const normalized = minigames.normalizePresetPayload(compact);
  assert.deepStrictEqual(normalized.sokoban.walls, [tile(1, 1)]);
  assert.deepStrictEqual(normalized.removedTiles, []);
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

const tests = [
  testFullExportIncludesMarkers,
  testBackgroundFormats,
  testMinigameFormats,
  testGroupSelectAndMetadataDefaults,
  testDisplayNameGeneratesPresetKey,
  testCustomKeyOverride,
  testAdvancedMultiGroupExport,
  testPresetMetadataCanBeClearedWhileEditing,
  testMinigameTestLink,
  testExportHiddenRowsHaveCssRule,
  testHolePruningAndToggle,
  testImportStyleMarkers,
  testPieceSetsImportExportAndDecorationToggle,
  testSokobanDecorationPaletteAndExports,
  testSokobanWallToggleDoesNotRemoveTile,
  testHoleMarkerDrawingMatchesConnectFour,
  testSokobanDecorationDrawingMatchesMinigame,
  testRemovedBoundaryPresetIdsAreNotAdvertised,
  testPaletteSwatchRatios
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} mosaic calculator export tests passed`);
