const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'math_workspace.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'math_workspace.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'math_workspace.css'), 'utf8');
const historicalSheafSource = fs.readFileSync(path.join(__dirname, 'sheaf_complex_calculator.js'), 'utf8');
const nativeBundle = fs.readFileSync(path.join(__dirname, 'math_workspace_native_editors.js'));
const calculatorPages = [
  'young_diagrams.html',
  'double_young_diagram.html',
  'higher_dimensional_slice_calculator.html',
  'dynkin_diagram_calculator.html',
  'strand_diagram_calculator.html',
  'matrix_calculator.html',
  'sheaf_complex_calculator.html',
  'mosaic_calculator.html',
  'category_calculator.html',
  'place_ramification_calculator.html'
];

const documentListeners = {};
const windowListeners = {};
const document = {
  addEventListener(type, handler) { documentListeners[type] = handler; },
  querySelector() { return null; }
};
const window = {
  addEventListener(type, handler) { windowListeners[type] = handler; }
};
vm.runInNewContext(source, {
  console,
  document,
  window,
  location: { protocol: 'file:', origin: 'null' },
  URLSearchParams,
  Intl,
  Date,
  Map,
  Set,
  Promise,
  setTimeout,
  clearTimeout
});

const api = window.MathWorkspaceAssetsTest;
assert(api, 'workspace must expose focused Assets test hooks');
assert.deepStrictEqual(Array.from(api.layouts), ['icons', 'list', 'details', 'tiles', 'content']);
assert.strictEqual(typeof documentListeners.DOMContentLoaded, 'function');

const entries = [
  { kind: 'variety', id: 'X1', name: 'Z', plainName: 'Z', typeLabel: 'variety' },
  { kind: 'sheaf', id: 'E2', name: '\\mathcal{A}', plainName: 'A', typeLabel: 'sheaf' },
  { kind: 'map', id: 'M3', name: 'f', plainName: 'f', typeLabel: 'map' },
  { kind: 'variety', id: 'X4', name: 'B', plainName: 'B', typeLabel: 'variety' }
];
api.state.snapshot = { revision: 1, assets: entries, capabilities: { variety: true, sheaf: true, map: true } };
entries.forEach((entry, index) => api.state.metadata.set(api.assetKey(entry), { order: index + 1, modifiedAt: [40, 10, 30, 20][index] }));

api.state.sort = 'creation';
assert.deepStrictEqual(Array.from(api.orderedAssets(), api.assetKey), ['variety:X1', 'sheaf:E2', 'map:M3', 'variety:X4']);
api.state.sort = 'name';
api.state.direction = 'asc';
assert.deepStrictEqual(Array.from(api.orderedAssets(), api.assetKey), ['sheaf:E2', 'variety:X4', 'map:M3', 'variety:X1']);
api.state.direction = 'desc';
assert.deepStrictEqual(Array.from(api.orderedAssets(), api.assetKey), ['variety:X1', 'map:M3', 'variety:X4', 'sheaf:E2']);
api.state.sort = 'modified';
api.state.direction = 'asc';
assert.deepStrictEqual(Array.from(api.orderedAssets(), api.assetKey), ['sheaf:E2', 'variety:X4', 'map:M3', 'variety:X1']);

api.state.sort = 'creation';
api.state.direction = 'asc';
api.state.selected.clear();
api.selectAssetKey('sheaf:E2');
assert.deepStrictEqual(Array.from(api.state.selected), ['sheaf:E2']);
api.selectAssetKey('variety:X4', { shiftKey: true });
assert.deepStrictEqual(Array.from(api.state.selected), ['sheaf:E2', 'map:M3', 'variety:X4']);
api.selectAssetKey('map:M3', { ctrlKey: true });
assert.deepStrictEqual(Array.from(api.state.selected), ['sheaf:E2', 'variety:X4']);
api.selectAssetKey('variety:X1', { ctrlKey: true, shiftKey: true });
assert.deepStrictEqual(new Set(api.state.selected), new Set(['variety:X1', 'sheaf:E2', 'map:M3', 'variety:X4']));

assert(source.includes("event.key.toLowerCase() === 'a'"), 'Ctrl+A shortcut must remain wired');
assert(source.includes("event.key === 'F2'"), 'F2 rename shortcut must remain wired');
assert(source.includes("event.key === 'Delete'"), 'bulk Delete shortcut must remain wired');
assert(source.includes('beginAssetMarquee'), 'rubber-band selection must remain wired');
assert(source.includes("layout: 'icons'"), 'Icons must remain the initial layout');
assert(source.includes("menuCascade('View'"), 'View must use a cascading shortcut menu');
assert(source.includes("menuCascade('Sort by'"), 'Sort by must use a cascading shortcut menu');
assert(source.includes("menuCascade('New'"), 'New must use a cascading shortcut menu');
assert(!source.includes('workspace-assets-toolbar'), 'Explorer controls must not duplicate the shortcut menu in a toolbar');
assert(!historicalSheafSource.includes('WORKSPACE_ASSETS_MODE'), 'the historical Sheaf calculator must not contain workspace Assets code');
assert(source.includes('function makeNativeCalculator'), 'workspace calculators must mount native editors');
assert(source.includes('inspectorHost'), 'workspace calculators must mount a separate Inspector host');
assert(source.includes('function ensureCalculatorSession'), 'cards must retain a session after a canvas tab closes');
assert(source.includes('function availableCardsFor'), 'the outer Add card picker must enumerate source-specific cards');
assert(source.includes('workspace-assets-native-editor'), 'Assets must use its own native Input card');
assert(!source.includes('iframe'), 'workspace implementation must not create calculator iframes');
assert(!source.includes('postMessage'), 'workspace implementation must not use a calculator message bridge');
assert(!source.includes('calculator_workspace'), 'workspace implementation must not reference the retired calculator host or bridge');
assert(!html.includes('<iframe'), 'workspace markup must not contain calculator iframes');
assert(!html.includes('calculator_workspace'), 'workspace markup must not load the retired calculator host or bridge');
assert(nativeBundle.includes(Buffer.from('MathWorkspaceNativeEditors')), 'the self-contained native editor library must export its factories');
assert(nativeBundle.includes(Buffer.from('setInspectorActive')), 'native calculators must expose an independent Inspector lifecycle');
assert(nativeBundle.includes(Buffer.from('listCards')), 'native calculators must expose their card catalog to the workspace picker');
assert(!nativeBundle.includes(Buffer.from('workspace-view-area')), 'native calculators must not wrap main canvases in a workspace view area');
assert(!nativeBundle.includes(Buffer.from('workspace-view-heading')), 'native calculators must not add a duplicate Main canvas heading');
assert(!nativeBundle.includes(Buffer.from('--workspace-inspector-offset')), 'native calculators must not use a coordinate-based Inspector portal');
assert(html.includes('math_workspace_native_editors.js?v=20260916-1'), 'native editor layout changes need a cache-query bump');
assert(html.includes('css/math_workspace.css?v=20260916-2'), 'workspace stylesheet changes need a cache-query bump');
assert(html.includes('js/math_workspace.js?v=20260916-2'), 'workspace controller changes need a cache-query bump');
['young', 'double-young', 'slice', 'dynkin', 'strand', 'matrix', 'complex', 'mosaic', 'category', 'ramification'].forEach((nativeId) => {
  assert(nativeBundle.includes(Buffer.from(`${nativeId}:`)) || nativeBundle.includes(Buffer.from(`"${nativeId}"`)), `${nativeId} native editor must be compiled into the workspace library`);
});
calculatorPages.forEach((page) => {
  const pageHtml = fs.readFileSync(path.join(root, page), 'utf8');
  assert(!pageHtml.includes('calculator_workspace_embed.js'), `${page} must remain independent of the workspace bridge`);
  assert(!pageHtml.includes('math_workspace_native_editors.js'), `${page} must remain independent of workspace-native editors`);
});
assert(html.includes('id="workspace-assets-context-menu"'));
assert(html.includes('id="workspace-assets-delete-dialog"'));
assert(html.includes('id="workspace-add-card"'), 'the outer Inspector must own Add card');
assert(html.includes('id="workspace-card-source"'), 'Add card must choose a calculator or Assets source');
assert(html.includes('tex-chtml.js'), 'Assets names need MathJax rendering');
['icons', 'list', 'details', 'tiles', 'content'].forEach((layout) => {
  assert(css.includes(`[data-layout='${layout}']`), `${layout} layout needs dedicated CSS`);
});
assert(css.includes('@media (max-width: 620px)'), 'Assets needs the workspace narrow-layout rule');
assert(css.includes('.workspace-assets-menu-cascade'), 'Cascading shortcut menus need dedicated CSS');
assert(css.includes('overflow: visible'), 'The compact shortcut menu must not show a spurious scrollbar');
assert(!css.includes('min-width: 920px'), 'calculator views must not force a desktop-only minimum width');
assert(!css.includes('visibility: hidden; pointer-events: none'), 'the outer Inspector must remain the visible Inspector');

entries[1].dependencies = [{ kind: 'variety', id: 'X1' }];
entries[2].dependencies = [{ kind: 'sheaf', id: 'E2' }];
api.assetRequest('plan-delete', { refs: [{ kind: 'variety', id: 'X1' }] }).then(async (plan) => {
  assert.deepStrictEqual(Array.from(plan.selected, (asset) => asset.id), ['X1']);
  assert.deepStrictEqual(new Set(Array.from(plan.dependents, (asset) => asset.id)), new Set(['E2', 'M3']));
  await assert.rejects(api.assetRequest('rename', { ref: { kind: 'map', id: 'M3' }, name: '\\mathbf{B}' }), /already has that name/);
  await api.assetRequest('rename', { ref: { kind: 'map', id: 'M3' }, name: 'g' });
  await assert.rejects(api.assetRequest('commit-delete', { refs: [{ kind: 'variety', id: 'X1' }], revision: plan.revision }), /changed while deletion was being confirmed/);
  const currentPlan = await api.assetRequest('plan-delete', { refs: [{ kind: 'variety', id: 'X1' }] });
  const afterDelete = await api.assetRequest('commit-delete', { refs: [{ kind: 'variety', id: 'X1' }], revision: currentPlan.revision });
  assert.deepStrictEqual(Array.from(afterDelete.assets, (asset) => asset.id), ['X4']);
  console.log('math_workspace_assets_test: native isolation, layouts, selection, menus, and atomic cascade covered');
}).catch((error) => { console.error(error); process.exitCode = 1; });
