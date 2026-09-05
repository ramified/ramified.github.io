const assert = require('assert');
const fs = require('fs');
const path = require('path');
const minigames = require('./ramified_minigames_setup.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ramified_minigames.html'), 'utf8');
const setup = fs.readFileSync(path.join(__dirname, 'ramified_minigames_setup.js'), 'utf8');
const locales = fs.readFileSync(path.join(__dirname, 'i18n', 'ramified_minigames_locales.js'), 'utf8');

assert.ok(html.includes('css/import_export_panel.css'));
assert.ok(html.includes('js/import_export_panel.js'));
assert.ok(html.includes('id="ramified-import-export-panel"'));
assert.ok(html.includes('role="tablist"'));
assert.ok(html.includes('data-import-export-tab="export"'));
assert.ok(html.includes('data-import-export-tab="import"'));
assert.ok(html.includes('data-import-source-panel="file"'));
assert.ok(html.includes('id="import-state-file"'));
assert.ok(html.includes('id="download-state"'));
assert.ok(html.includes('id="debug-export-output" data-export-output'));
assert.ok(html.includes('aria-label="Current game status or preset export" readonly'));
assert.ok(html.includes('data-export-content'));
assert.ok(html.includes('data-export-format-value'));
assert.ok(html.includes('data-import-content-value'));
assert.ok(html.includes('data-import-format-value'));
assert.ok(html.includes('id="edit-mosaic-link-row"'));
assert.ok(html.includes('id="edit-mosaic-link"'));
assert.ok(html.includes('<span class="input-label" data-i18n="common.edit">edit</span>'));
assert.ok(html.includes('class="export-test-link" id="edit-mosaic-link" href="mosaic_calculator.html" target="_blank" rel="noopener"'));
assert.ok(html.includes('data-i18n="common.edit"'));
assert.ok(html.includes('data-i18n="io.editInMosaicCalculator"'));
assert.ok(html.includes('id="hex-neighbor-delay" min="0.1" max="0.8" step="0.1" value="0.4"'));
assert.ok(html.includes('id="hex-neighbor-size" min="50" max="100" step="1" value="75"'));
assert.ok(html.includes('id="hex-neighbor-stroke" min="1" max="5" step="0.5" value="3"'));
[
  'js/background_homology.js',
  'js/hex_homology_game.js',
  'js/billiards/topological_billiards_math.js',
  'js/billiards/topological_billiards_physics.js',
  'js/billiards/topological_billiards_renderer.js',
  'js/billiards/topological_billiards_native.js',
  'lianliankan/lianliankan_engine.js',
  'lianliankan/mosaic_adapter.js'
].forEach((asset) => assert.ok(
  !html.includes(`<script src="${asset}`),
  `${asset} must be loaded only when its game is selected`
));
assert.ok(!setup.includes('initBombImages();'), 'bomb artwork must not preload during initialization');
assert.ok(!setup.includes('Promise.all(registry.map'), 'the browser catalog must not preload every preset file');
assert.deepStrictEqual(
  minigames.__test.lazyPresetFromRegistryEntry({
    id: 'lazy-test', label: 'Lazy test', gameTypes: ['2048']
  }),
  { id: 'lazy-test', label: 'Lazy test', gameTypes: ['2048'], __lazyPreset: true }
);
assert.deepStrictEqual(minigames.__test.optionalScriptGroups.hex.map((url) => url.split('?')[0]), [
  'js/background_homology.js',
  'js/hex_homology_game.js'
]);
assert.deepStrictEqual(minigames.__test.optionalScriptGroups.billiards.map((url) => url.split('?')[0]), [
  'js/billiards/topological_billiards_math.js',
  'js/billiards/topological_billiards_physics.js',
  'js/billiards/topological_billiards_renderer.js',
  'js/billiards/topological_billiards_native.js'
]);
assert.ok(minigames.__test.optionalScriptGroups.billiards.some((url) => url.includes('topological_billiards_native.js?v=20260905-3')));
assert.deepStrictEqual(minigames.__test.optionalScriptGroups.lianliankan.map((url) => url.split('?')[0]), [
  'lianliankan/lianliankan_engine.js',
  'lianliankan/mosaic_adapter.js'
]);
const previousImage = global.Image;
const requestedBombImages = [];
global.Image = class FakeImage {
  set src(value) { requestedBombImages.push(value); }
};
const lazyBombOption = { id: 'test-lazy-bomb', kind: 'png', src: 'test-bomb.png' };
const firstLazyBombImage = minigames.__test.ensureBombImage(lazyBombOption);
const secondLazyBombImage = minigames.__test.ensureBombImage(lazyBombOption);
assert.strictEqual(firstLazyBombImage, secondLazyBombImage, 'the selected bomb image request is cached');
assert.deepStrictEqual(requestedBombImages, ['test-bomb.png'], 'only an explicitly requested bomb image is loaded');
if (previousImage === undefined) delete global.Image;
else global.Image = previousImage;
const pngBombRenderer = setup.slice(setup.indexOf('function drawPngBomb'), setup.indexOf('function bombTint'));
assert.ok(!pngBombRenderer.includes('ctx.clip()'), 'transparent bomb artwork should not be clipped to create its backdrop');
assert.ok(!pngBombRenderer.includes("globalCompositeOperation = 'source-atop'"), 'PNG tinting must not composite against the painted board');
assert.ok(!pngBombRenderer.includes('ctx.fillRect('), 'PNG bomb rendering must not paint a rectangular tint background');
assert.deepStrictEqual(minigames.bombBackdropPalette('blue'), {
  fill: '#d7edf1', stroke: '#1f7a8c', glow: '#1f7a8c'
});
assert.ok(setup.includes('tilePoints(cell.x, cell.y, radius, geom.lattice)'));

assert.ok(setup.includes('window.ImportExportPanel.mount'));
assert.ok(setup.includes("id: 'ramified-minigames'"));
assert.ok(setup.includes("defaultExporter: 'status'"));
assert.ok(setup.includes('exporters:'));
assert.ok(setup.includes("produce: () => exportSharedContent('background')"));
assert.ok(setup.includes("produce: () => exportSharedContent('record')"));
assert.ok(setup.includes('describeImport(prepared)'));
assert.ok(setup.includes('prepareImportRequest(request)'));
assert.ok(setup.includes('applyPreparedImport(prepared)'));
assert.ok(setup.includes('confirmActiveGameReplacement()'));
assert.ok(setup.includes("? 'ramified-minigame-background.json'"));
assert.ok(setup.includes("? 'ramified-minigame-record.json'"));
assert.ok(setup.includes(": 'ramified-minigame-status.json'"));
assert.ok(setup.includes("mimeType: 'application/json'"));
assert.ok(setup.includes("kind: 'ramified-minigame-record'"));
assert.ok(setup.includes('function buildMosaicCalculatorHref'));
assert.ok(setup.includes('mosaic_calculator.html?mosaicPreset='));
assert.ok(setup.includes("payload.boundary = 'glued'"));
assert.ok(setup.includes("payload.inputMode = 'background'"));
assert.ok(setup.includes("payload.backgroundAction = 'decoration'"));
assert.ok(setup.includes("runtime.billiardsCueHint', 'Click the white cue ball and drag away from the intended shot; it travels in the opposite direction.'"));
assert.ok(!setup.includes("runtime.billiardsCueHintCanvas', 'drag back to shoot'"));

const handoffState = minigames.createGameState({
  id: 'mosaic-handoff-test',
  label: 'Mosaic handoff test',
  lattice: 'square',
  rows: 2,
  cols: 2,
  removedTiles: [],
  cutEdges: [],
  gluedEdges: []
});
const handoffHref = minigames.__test.buildMosaicCalculatorHref(handoffState);
const handoffPayload = JSON.parse(Buffer.from(
  new URL(handoffHref, 'https://example.invalid/').searchParams.get('mosaicPreset'),
  'base64url'
).toString('utf8'));
assert.strictEqual(handoffPayload.boundary, 'glued');
assert.strictEqual(handoffPayload.inputMode, 'background');
assert.strictEqual(handoffPayload.backgroundAction, 'decoration');

[
  'io.tabExport',
  'io.tabImport',
  'io.localFile',
  'io.chooseFile',
  'io.exportDownloaded',
  'io.fileReady',
  'io.exportContent',
  'io.importContent',
  'io.editInMosaicCalculator',
  'common.edit',
  'access.hexNeighborDelay',
  'access.hexNeighborSize',
  'access.hexNeighborStroke',
  'setup.hexNeighborDelay',
  'setup.hexNeighborSize',
  'setup.hexNeighborStroke',
  'runtime.billiardsSnapGuidance',
  'io.autoDetect',
  'io.detectedFormat',
  'io.replaceConfirm'
].forEach((key) => assert.ok(locales.includes(`'${key}'`), `missing locale key ${key}`));

assert.strictEqual(minigames.HEX_NEIGHBOR_HINT_DELAY_DEFAULT, 0.4);
assert.strictEqual(minigames.HEX_NEIGHBOR_HINT_SIZE_DEFAULT, 75);
assert.strictEqual(minigames.HEX_NEIGHBOR_HINT_STROKE_DEFAULT, 3);
assert.strictEqual(minigames.HEX_NEIGHBOR_HINT_FADE_MS, 300);
assert.strictEqual(minigames.hexNeighborHintOpacity(0), 0);
assert.ok(minigames.hexNeighborHintOpacity(150) > 0 && minigames.hexNeighborHintOpacity(150) < 1);
assert.strictEqual(minigames.hexNeighborHintOpacity(300), 1);

const neighborHintState = {
  gameMode: 'hex',
  preset: {
    lattice: 'square',
    rows: 2,
    cols: 2,
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [{ first: { row: 1, col: 1, dir: 3 }, second: { row: 2, col: 2, dir: 1 } }]
  },
  removed: new Set()
};
assert.deepStrictEqual(
  minigames.hexNeighborHintIndices(neighborHintState, 0).sort((left, right) => left - right),
  [2, 3],
  'Hex neighbor hints respect cut edges and include glued-edge neighbors'
);

const bombChainState = minigames.createGameState({
  id: 'red-bomb-chain-test',
  label: 'red bomb chain test',
  lattice: 'square',
  rows: 2,
  cols: 3,
  removedTiles: [],
  cutEdges: [],
  gluedEdges: []
});
bombChainState.bombs = [
  { index: minigames.indexOf(1, 1, 3), kind: 'red', value: 128 },
  { index: minigames.indexOf(1, 2, 3), kind: 'red', value: 128 },
  { index: minigames.indexOf(1, 3, 3), kind: 'blue', value: 2 }
];
bombChainState.boxes = [
  { id: 1, index: minigames.indexOf(2, 1, 3), value: 4 },
  { id: 2, index: minigames.indexOf(2, 2, 3), value: 8 }
];
const bombChain = minigames.detonateBombAt(bombChainState, minigames.indexOf(1, 2, 3));
assert.deepStrictEqual(bombChain.detonations.map((entry) => entry.kind), ['red', 'blue', 'red']);
assert.deepStrictEqual(bombChain.state.bombs, [], 'red bombs trigger every adjacent bomb exactly once');
assert.deepStrictEqual(bombChain.state.boxes, [], 'triggered red bombs apply their own adjacent blast');
assert.deepStrictEqual(bombChain.clearedBoxIds.sort((left, right) => left - right), [1, 2]);

function boundaryBombChainState(gluedEdges) {
  const state = minigames.createGameState({
    id: 'boundary-bomb-chain-test',
    label: 'boundary bomb chain test',
    lattice: 'square',
    rows: 1,
    cols: 2,
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges
  });
  state.bombs = [
    { index: 0, kind: 'red', value: 128 },
    { index: 1, kind: 'blue', value: 2 }
  ];
  return state;
}

const cutBombChain = minigames.detonateBombAt(boundaryBombChainState([]), 0);
assert.deepStrictEqual(cutBombChain.detonations.map((entry) => entry.index), [0]);
assert.deepStrictEqual(cutBombChain.state.bombs.map((entry) => entry.index), [1], 'a cut edge blocks bomb propagation');

const gluedBombChain = minigames.detonateBombAt(boundaryBombChainState([{
  first: { row: 1, col: 1, dir: minigames.DIRS.W },
  second: { row: 1, col: 2, dir: minigames.DIRS.E }
}]), 0);
assert.deepStrictEqual(gluedBombChain.detonations.map((entry) => entry.index), [0, 1]);
assert.deepStrictEqual(gluedBombChain.state.bombs, [], 'a glued boundary triggers its partner bomb exactly once');

console.log('ramified_minigames_import_export_test: all tests passed');
