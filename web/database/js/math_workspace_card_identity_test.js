const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'math_workspace.js'), 'utf8');
const document = {
  addEventListener() {},
  querySelector() { return null; }
};
const window = { addEventListener() {} };

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
assert(api, 'workspace must expose Assets test hooks');
assert.strictEqual(typeof api.assetInputCardTitleState, 'function', 'B1.1 needs a testable binding-title derivation');

const assets = [
  { kind: 'variety', id: 'X1', name: 'X', plainName: 'X', type: 'abstract', data: {}, dependencies: [], properties: {} },
  { kind: 'variety', id: 'X2', name: 'Y', plainName: 'Y', type: 'abstract', data: {}, dependencies: [], properties: {} },
  { kind: 'sheaf', id: 'E3', name: '\\mathcal{E}', plainName: 'E', type: 'abstract', data: { base: 'variety:X1' }, dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} }
];
api.state.snapshot = { revision: 10, assets, capabilities: { variety: true, sheaf: true, map: false } };
const coordinator = api.createAssetsCardCoordinator();

const bindInput = (ref) => api.bindAssetInputInstance(ref, { coordinator, render: false, flush: false });
const x = bindInput({ kind: 'variety', id: 'X1' });
const xKey = x.key;
api.state.selected = new Set(['variety:X2']);
assert.deepStrictEqual(
  { ...api.assetInputCardTitleState(coordinator) },
  { rendered: '\\(X\\) · Input', plain: 'X · Input', instanceKey: xKey },
  'Input title must use the active Input Instance rather than Explorer selection'
);

x.draft.name = 'unsaved-X';
const y = bindInput({ kind: 'variety', id: 'X2' });
assert.strictEqual(api.assetInputCardTitleState(coordinator).plain, 'Y · Input');
bindInput({ kind: 'variety', id: 'X1' });
assert.strictEqual(api.assetInputCardTitleState(coordinator).plain, 'X · Input');
assert.strictEqual(coordinator.instances.get(xKey).draft.name, 'unsaved-X', 'A → B → A must restore the same title owner and draft');

assets[0].name = 'X_{renamed}';
assets[0].plainName = 'X renamed';
assert.strictEqual(api.assetInputCardTitleState(coordinator).plain, 'X renamed · Input');
assert.strictEqual(api.assetInputCardTitleState(coordinator).instanceKey, xKey, 'rename must not replace Input Instance identity');

bindInput({ kind: 'sheaf', id: 'E3' });
assert.deepStrictEqual(
  { ...api.assetInputCardTitleState(coordinator) },
  { rendered: '\\(\\mathcal{E}\\) · Input', plain: 'E · Input', instanceKey: 'asset:sheaf:E3:input' },
  'LaTeX names need a MathJax-ready title and plain fallback'
);

coordinator.slots.get('input').activeInstanceKey = null;
assert.strictEqual(api.assetInputCardTitleState(coordinator, { mode: 'modify' }).plain, 'Assets · Input');
assert.strictEqual(api.assetInputCardTitleState(coordinator, { mode: 'create', createKind: 'variety' }).plain, 'New Variety · Input');
assert.strictEqual(api.assetInputCardTitleState(coordinator, { mode: 'create', createKind: 'sheaf' }).plain, 'New Sheaf · Input');
assert.strictEqual(api.assetInputCardTitleState(coordinator, { mode: 'create', createKind: 'map' }).plain, 'New Map · Input');

assert(api.assetsUtilitySlots instanceof Map, 'utility cards need Slot-owned chrome state');
const utility = api.assetsUtilitySlots.get('importExport');
assert(utility, 'Import / Export needs its own utility Slot');
assert.strictEqual(Object.hasOwn(utility, 'targetRef'), false, 'utility Slot must not invent an object target');

{
  const propertyCoordinator = api.createAssetsCardCoordinator();
  const calls = { presentations: [], captures: 0, labels: [] };
  let nativePresentation = { collapsed: false, pinned: false, displayMode: 'normal' };
  const session = {
    kind: 'assets-property-slot', cardType: 'hodge', applyingAssets: false, boundInstanceKey: null, bindingToken: null,
    editor: {
      setBindingToken() {},
      applyAssets() { return true; },
      focusAssetCard() { return true; },
      setCardVisible() { return true; },
      prioritizeCard() { return true; },
      focusCard() { return true; },
      getCardPresentation() { return { ...nativePresentation }; },
      setCardPresentation(_key, value) { calls.presentations.push({ ...value }); nativePresentation = { ...nativePresentation, ...value }; return true; },
      setCardLabel(_key, rendered, aria) { calls.labels.push({ rendered, aria }); return true; },
      captureAssetProperties() { calls.captures += 1; return null; },
      setInspectorActive() {}
    }
  };
  const bind = (id) => api.bindAssetPropertySlot('hodge', { kind: 'variety', id }, {
    coordinator: propertyCoordinator,
    session,
    snapshot: api.state.snapshot,
    render: false,
    focus: false,
    promote: false
  });
  bind('X1');
  nativePresentation = { collapsed: true, pinned: true, displayMode: 'wide' };
  bind('X2');
  const slot = propertyCoordinator.slots.get('hodge');
  assert.deepStrictEqual(
    { collapsed: slot.collapsed, pinned: slot.pinned, displayMode: slot.displayMode },
    nativePresentation,
    'retarget must retain Property Slot chrome presentation'
  );
  assert.deepStrictEqual(calls.presentations.at(-1), nativePresentation, 'retarget must reapply Slot presentation to the renderer');
  assert.deepStrictEqual(calls.labels.at(-1), { rendered: '\\(Y\\) · Hodge Numbers', aria: 'Y · Hodge Numbers' });

  const revision = api.state.snapshot.revision;
  assert.strictEqual(api.handleAssetPropertySessionChange(session, { bindingToken: session.bindingToken, interaction: 'card-chrome' }, () => {}, propertyCoordinator), false);
  assert.strictEqual(calls.captures, 0, 'Property card chrome must not capture or write back properties');
  assert.strictEqual(api.state.snapshot.revision, revision, 'Property card chrome must not increment Asset revision');
}

console.log('math workspace card identity tests passed');
