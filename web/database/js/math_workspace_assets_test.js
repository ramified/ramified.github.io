const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(__dirname, 'math_workspace.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'math_workspace.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'math_workspace.css'), 'utf8');
const historicalSheafSource = fs.readFileSync(path.join(__dirname, 'sheaf_complex_calculator.js'), 'utf8');
const nativeBundle = fs.readFileSync(path.join(__dirname, 'math_workspace_native_editors_v8.js'));
const nativeBuilder = fs.readFileSync(path.join(root, 'math_workspace_version1', 'js', 'math_workspace', 'build.mjs'), 'utf8');
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
assert.strictEqual(api.DEFAULT_CANVAS_HEIGHT, 680, 'each new workspace session starts at 680px');
assert.strictEqual(api.MIN_CANVAS_HEIGHT, 420);
assert.strictEqual(api.MAX_CANVAS_HEIGHT, 1600);
assert.strictEqual(api.canvasHeightFor('assets'), 680, 'Assets keeps its own default canvas height');
api.state.canvasHeight = 733;
assert.strictEqual(api.canvasHeightFor('assets'), 733, 'Assets height is session state rather than a shared CSS minimum');
api.sessions.set('young', { canvasHeight: 817 });
assert.strictEqual(api.canvasHeightFor('young'), 817, 'calculator sessions retain their own height');
assert.strictEqual(api.canvasHeightFor('assets'), 733, 'calculator sizing does not mutate Assets sizing');
assert.strictEqual(typeof api.canvasAssetRecord, 'undefined', 'a View must render the Asset raw name rather than rewriting it into another name source');
assert.strictEqual(typeof api.createAssetInputInstance, 'function', 'Milestone B1 requires stable per-Asset Input Instances');

const entries = [
  { kind: 'variety', id: 'X1', name: 'Z', plainName: 'Z', typeLabel: 'variety' },
  { kind: 'sheaf', id: 'E2', name: '\\mathcal{A}', plainName: 'A', typeLabel: 'sheaf' },
  { kind: 'map', id: 'M3', name: 'f', plainName: 'f', typeLabel: 'map' },
  { kind: 'variety', id: 'X4', name: 'B', plainName: 'B', typeLabel: 'variety' }
];
api.state.snapshot = { revision: 1, assets: entries, capabilities: { variety: true, sheaf: true, map: true } };
entries.forEach((entry, index) => api.state.metadata.set(api.assetKey(entry), { order: index + 1, modifiedAt: [40, 10, 30, 20][index] }));
entries[0].data = { dimension: '3' };
entries[1].data = { base: 'variety:X1', rank: '1' };
entries[1].properties = { basis: 'chern', homology: { rules: [{ target: 'variety:X1' }] } };

const rebasedProperties = api.invalidateDerivedAssetProperties(entries[1], { ...entries[1], data: { ...entries[1].data, base: 'variety:X4' } });
assert.strictEqual(rebasedProperties.basis, 'chern', 'a structural Asset edit retains non-derived property preferences');
assert.strictEqual(Object.hasOwn(rebasedProperties, 'homology'), false, 'a structural Asset edit must invalidate stale derived Homology rather than retain an old base reference');

const jsonClone = (value) => JSON.parse(JSON.stringify(value));
const installCommandAssets = (assets, revision = 20) => {
  api.state.snapshot = { revision, assets, capabilities: { variety: true, sheaf: true, map: true } };
  return assets;
};
const makePropertyCommand = (sourceRef, revision, before, after) => api.createAssetPropertyCommand({
  sourceRef,
  revision,
  before: { objects: before },
  after: { objects: after },
  reason: 'homology'
});

{
  const [variety] = installCommandAssets([{ kind: 'variety', id: 'X1', dependencies: [], properties: { homology: { rules: [] }, unrelated: { keep: true } } }]);
  const command = makePropertyCommand({ kind: 'variety', id: 'X1' }, 20, { 'variety:X1': { homology: { rules: [] } } }, { 'variety:X1': { homology: { rules: [{ id: 'r1' }] } } });
  let refreshes = 0;
  assert.strictEqual(api.commitAssetPropertyCommand(command, () => { refreshes += 1; }), true, 'same-owner Homology must commit');
  assert.strictEqual(variety.properties.homology.rules[0].id, 'r1');
  assert.strictEqual(variety.properties.unrelated.keep, true, 'an incremental Homology patch must preserve unrelated properties');
  assert.strictEqual(api.state.snapshot.revision, 21, 'one command increments revision once');
  assert.strictEqual(refreshes, 1, 'one command refreshes projections once');
}

{
  const [variety] = installCommandAssets([{ kind: 'variety', id: 'X1', dependencies: [], properties: { homology: { rules: [] }, unrelated: 'keep' } }]);
  const command = makePropertyCommand({ kind: 'variety', id: 'X1' }, 20, { 'variety:X1': { homology: { rules: [] } } }, { 'variety:X1': {} });
  assert.deepStrictEqual(Array.from(command.changes[0].propertiesPatch.unset), ['homology'], 'captured field deletion must be explicit');
  api.commitAssetPropertyCommand(command, () => {});
  assert.strictEqual(Object.hasOwn(variety.properties, 'homology'), false);
  assert.strictEqual(variety.properties.unrelated, 'keep', 'an explicit unset must not delete unrelated properties');
}

{
  const [base, sheaf] = installCommandAssets([
    { kind: 'variety', id: 'X1', dependencies: [], properties: { unrelated: 'keep' } },
    { kind: 'sheaf', id: 'E2', dependencies: [{ kind: 'variety', id: 'X1' }], properties: { basis: 'chern' } }
  ]);
  const command = makePropertyCommand({ kind: 'sheaf', id: 'E2' }, 20,
    { 'variety:X1': {}, 'sheaf:E2': { basis: 'chern' } },
    { 'variety:X1': { homology: { customClasses: [{ id: 'chern:E2:1' }] } }, 'sheaf:E2': { basis: 'chern' } });
  assert.strictEqual(command.changes.length, 1, 'unchanged source owners must not produce patches');
  assert.strictEqual(command.changes[0].ref.kind, 'variety');
  api.commitAssetPropertyCommand(command, () => {});
  assert.strictEqual(base.properties.homology.customClasses[0].id, 'chern:E2:1', 'a sheaf Card must commit Homology to its base variety owner');
  assert.strictEqual(base.properties.unrelated, 'keep');
  assert.strictEqual(sheaf.properties.basis, 'chern');
}

{
  const [domain, codomain] = installCommandAssets([
    { kind: 'variety', id: 'X1', dependencies: [], properties: { marker: 'domain' } },
    { kind: 'variety', id: 'X2', dependencies: [], properties: { marker: 'codomain' } },
    { kind: 'map', id: 'M3', dependencies: [{ kind: 'variety', id: 'X1' }, { kind: 'variety', id: 'X2' }], properties: {} }
  ]);
  const command = makePropertyCommand({ kind: 'map', id: 'M3' }, 20,
    { 'variety:X1': {}, 'variety:X2': {}, 'map:M3': {} },
    { 'variety:X1': { homology: { rules: [{ id: 'pullback' }] } }, 'variety:X2': { homology: { rules: [{ id: 'pushforward' }] } }, 'map:M3': {} });
  let refreshes = 0;
  api.commitAssetPropertyCommand(command, () => { refreshes += 1; });
  assert.strictEqual(domain.properties.homology.rules[0].id, 'pullback');
  assert.strictEqual(codomain.properties.homology.rules[0].id, 'pushforward');
  assert.strictEqual(api.state.snapshot.revision, 21, 'a multi-owner command increments revision once');
  assert.strictEqual(refreshes, 1, 'a multi-owner command performs one unified refresh');
}

{
  const assets = installCommandAssets([
    { kind: 'variety', id: 'X1', dependencies: [], properties: { homology: { value: 'old' } } },
    { kind: 'sheaf', id: 'E2', dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} }
  ]);
  const before = jsonClone(api.state.snapshot);
  const stale = makePropertyCommand({ kind: 'sheaf', id: 'E2' }, 19, { 'variety:X1': { homology: { value: 'old' } } }, { 'variety:X1': { homology: { value: 'new' } } });
  assert.throws(() => api.commitAssetPropertyCommand(stale, () => {}), /stale/);
  assert.strictEqual(JSON.stringify(api.state.snapshot), JSON.stringify(before), 'a stale command must leave all owners unchanged');
  assert.strictEqual(assets[0].properties.homology.value, 'old');
}

{
  installCommandAssets([{ kind: 'map', id: 'M3', dependencies: [{ kind: 'variety', id: 'X1' }], properties: { homology: { value: 'map-old' } } }]);
  const before = jsonClone(api.state.snapshot);
  const missingOwner = { sourceRef: { kind: 'map', id: 'M3' }, revision: 20, reason: 'homology', changes: [
    { ref: { kind: 'map', id: 'M3' }, propertiesPatch: { set: { homology: { value: 'map-new' } }, unset: [] } },
    { ref: { kind: 'variety', id: 'X1' }, propertiesPatch: { set: { homology: { value: 'base-new' } }, unset: [] } }
  ] };
  assert.throws(() => api.commitAssetPropertyCommand(missingOwner, () => {}), /owner no longer exists/);
  assert.strictEqual(JSON.stringify(api.state.snapshot), JSON.stringify(before), 'a missing owner must reject the whole command before any write');
}

{
  installCommandAssets([
    { kind: 'variety', id: 'X1', dependencies: [], properties: { homology: { value: 'old' } } },
    { kind: 'map', id: 'M3', dependencies: [{ kind: 'variety', id: 'X1' }], properties: { homology: { value: 'map-old' } } }
  ]);
  const before = jsonClone(api.state.snapshot);
  const invalidField = { sourceRef: { kind: 'map', id: 'M3' }, revision: 20, reason: 'homology', changes: [
    { ref: { kind: 'variety', id: 'X1' }, propertiesPatch: { set: { homology: { value: 'new' } }, unset: [] } },
    { ref: { kind: 'map', id: 'M3' }, propertiesPatch: { set: { forbidden: true }, unset: [] } }
  ] };
  assert.throws(() => api.commitAssetPropertyCommand(invalidField, () => {}), /unapproved field/);
  assert.strictEqual(JSON.stringify(api.state.snapshot), JSON.stringify(before), 'an unapproved field must reject all staged owner writes');
}

{
  installCommandAssets([{ kind: 'variety', id: 'X1', dependencies: [], properties: {} }]);
  const command = makePropertyCommand({ kind: 'variety', id: 'X1' }, 20, { 'variety:X1': {} }, { 'variety:X1': { homology: { value: 'captured' } } });
  let captures = 0, refreshes = 0;
  const session = { applyingAssets: false, editor: { captureAssetProperties() { captures += 1; return command; } } };
  assert.strictEqual(api.captureAndCommitAssetPropertyCommand(session, () => { refreshes += 1; }), true, 'adapter capture must feed the workspace command');
  assert.strictEqual(captures, 1);
  assert.strictEqual(refreshes, 1);
  session.applyingAssets = true;
  assert.strictEqual(api.captureAndCommitAssetPropertyCommand(session, () => { refreshes += 1; }), false, 'projection application must suppress Card commands');
  assert.strictEqual(captures, 1);
}

{
  const bindingAssets = installCommandAssets([
    { kind: 'variety', id: 'X1', name: 'X', plainName: 'X', dependencies: [], properties: {} },
    { kind: 'variety', id: 'X2', name: 'Y', plainName: 'Y', dependencies: [], properties: {} },
    { kind: 'sheaf', id: 'E2', name: '\\mathcal{E}', plainName: 'E', dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} },
    { kind: 'map', id: 'M3', name: 'f', plainName: 'f', dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} }
  ], 30);
  const coordinator = api.createAssetsCardCoordinator();
  const makeFakeSession = (cardType) => {
    const calls = { applies: [], visible: [], prioritized: [], focused: [], captures: 0, labels: [] };
    const session = {
      kind: 'assets-property-slot', cardType, applyingAssets: false, boundInstanceKey: null, bindingToken: null, calls,
      editor: {
        setBindingToken(token) { calls.bindingToken = token; },
        applyAssets(snapshot, ref, _properties, binding) {
          calls.applies.push({ ref: { ...ref }, binding: { ...binding }, revision: snapshot.revision });
          if (session.failNextApply) { session.failNextApply = false; return false; }
          return true;
        },
        focusAssetCard() { return true; },
        setCardVisible(key, visible) { calls.visible.push([key, visible]); return true; },
        prioritizeCard(key) { calls.prioritized.push(key); return true; },
        focusCard(key) { calls.focused.push(key); return true; },
        getCardPresentation() { return { collapsed: false, pinned: false, displayMode: 'normal' }; },
        setCardPresentation() { return true; },
        setCardLabel(key, title, aria) { calls.labels.push({ key, title, aria }); return true; },
        captureAssetProperties() { calls.captures += 1; return session.command || null; },
        setInspectorActive() {}
      }
    };
    return session;
  };
  const bind = (cardType, ref, session, overrides = {}) => api.bindAssetPropertySlot(cardType, ref, {
    coordinator, session, snapshot: api.state.snapshot, render: false, focus: false, promote: false, ...overrides
  });

  assert.strictEqual(api.cardSupportsAsset('hodge', 'variety'), true);
  assert.strictEqual(api.cardSupportsAsset('hodge', 'sheaf'), false);
  assert.strictEqual(api.cardSupportsAsset('homology', 'map'), true);
  assert.strictEqual(Array.from(api.NATIVE_ASSET_CARD_TYPES).length, 5, 'native property sessions must have a fixed five-slot upper bound');

  const hodgeSession = makeFakeSession('hodge');
  const homologySession = makeFakeSession('homology');
  const classSession = makeFakeSession('characteristic-classes');
  const hodgeX = bind('hodge', { kind: 'variety', id: 'X1' }, hodgeSession);
  const homologyE = bind('homology', { kind: 'sheaf', id: 'E2' }, homologySession);
  const classesE = bind('characteristic-classes', { kind: 'sheaf', id: 'E2' }, classSession);
  assert.strictEqual(hodgeX.targetRef.id, 'X1');
  assert.strictEqual(homologyE.targetRef.id, 'E2');
  assert.strictEqual(classesE.targetRef.id, 'E2');
  assert.notStrictEqual(coordinator.slots.get('hodge').rendererSession, coordinator.slots.get('homology').rendererSession, 'each Property Slot owns a different bounded renderer session');

  const oldHomologyToken = homologySession.bindingToken;
  bind('homology', { kind: 'map', id: 'M3' }, homologySession, { promote: true, focus: true });
  assert.strictEqual(coordinator.instances.get(coordinator.slots.get('homology').activeInstanceKey).targetRef.id, 'M3', 'opening map Homology retargets only Homology');
  assert.strictEqual(coordinator.instances.get(coordinator.slots.get('hodge').activeInstanceKey).targetRef.id, 'X1', 'Hodge remains bound to its variety');
  assert.strictEqual(coordinator.instances.get(coordinator.slots.get('characteristic-classes').activeInstanceKey).targetRef.id, 'E2', 'other visible Property Slots retain their target');
  assert.deepStrictEqual(hodgeSession.calls.applies.at(-1).ref, { kind: 'variety', id: 'X1' }, 'retargeting Homology must not replace Hodge baseline');
  assert.strictEqual(coordinator.slots.get('homology').collapsed, false, 'the directed Property Slot is expanded');
  assert.strictEqual(homologySession.calls.prioritized.at(-1), 'homology-card', 'the directed Property Slot is promoted inside its renderer');
  assert.strictEqual(homologySession.calls.focused.at(-1), 'homology-card', 'the directed Property Card is focused after binding');

  let refreshes = 0;
  homologySession.command = api.createAssetPropertyCommand({
    sourceRef: { kind: 'map', id: 'M3' }, revision: 30,
    before: { objects: { 'map:M3': {} } }, after: { objects: { 'map:M3': { homology: { value: 'map-only' } } } }, reason: 'homology'
  });
  api.state.selected = new Set(['variety:X2']);
  assert.strictEqual(api.handleAssetPropertySessionChange(homologySession, homologySession.bindingToken, () => { refreshes += 1; }, coordinator), true, 'Property save uses its bound Instance even when Explorer selection differs');
  assert.strictEqual(bindingAssets.find((asset) => asset.id === 'M3').properties.homology.value, 'map-only');
  assert.strictEqual(bindingAssets.find((asset) => asset.id === 'X2').properties.homology, undefined, 'Explorer selection must not become the save owner');
  assert.strictEqual(api.state.snapshot.revision, 31, 'bound Property save increments revision once');
  assert.strictEqual(refreshes, 1, 'bound Property save refreshes once');

  const capturesBeforeStale = homologySession.calls.captures;
  assert.strictEqual(api.handleAssetPropertySessionChange(homologySession, oldHomologyToken, () => {}, coordinator), false, 'a callback from the parked binding must be ignored');
  assert.strictEqual(homologySession.calls.captures, capturesBeforeStale, 'stale callbacks must not even capture a command');
  homologySession.applyingAssets = true;
  assert.strictEqual(api.handleAssetPropertySessionChange(homologySession, homologySession.bindingToken, () => {}, coordinator), false, 'retarget/apply guard suppresses property commands');
  homologySession.applyingAssets = false;

  const oldHodgeKey = coordinator.slots.get('hodge').activeInstanceKey;
  hodgeSession.failNextApply = true;
  assert.throws(() => bind('hodge', { kind: 'variety', id: 'X2' }, hodgeSession), /could not be projected/);
  assert.strictEqual(coordinator.slots.get('hodge').activeInstanceKey, oldHodgeKey, 'a failed binding rolls the Slot back atomically');
  assert.strictEqual(coordinator.instances.has(api.assetCardInstanceKey({ kind: 'variety', id: 'X2' }, 'hodge')), false, 'a failed binding does not publish a partial Instance');
  assert.throws(() => bind('hodge', { kind: 'sheaf', id: 'E2' }, hodgeSession), /not available/);
  assert.strictEqual(coordinator.slots.get('hodge').activeInstanceKey, oldHodgeKey, 'compatibility validation failure leaves all bindings unchanged');
}

const makeFakeClock = () => {
  let now = 0, nextId = 1;
  const tasks = new Map();
  return {
    now: () => now,
    setTimer(fn, delay) { const id = nextId++; tasks.set(id, { at: now + Math.max(0, delay), fn }); return id; },
    clearTimer(id) { tasks.delete(id); },
    tick(ms) {
      const end = now + ms;
      while (true) {
        const due = [...tasks].filter(([, task]) => task.at <= end).sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
        if (!due) break;
        tasks.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    },
    pending: () => tasks.size
  };
};
const makeAutosaveFixture = () => {
  const assets = [
    { kind: 'variety', id: 'X1', name: 'A', plainName: 'A', type: 'abstract', typeLabel: 'Abstract variety', data: { dimension: '3' }, dependencies: [], properties: {} },
    { kind: 'variety', id: 'X2', name: 'B', plainName: 'B', type: 'abstract', typeLabel: 'Abstract variety', data: { dimension: '2' }, dependencies: [], properties: {} },
    { kind: 'map', id: 'M3', name: 'f', plainName: 'f', type: 'ordinary', typeLabel: 'Map of varieties', data: { domain: 'variety:X1', codomain: 'variety:X1' }, dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} }
  ];
  api.state.snapshot = { revision: 100, assets, capabilities: { variety: true, sheaf: true, map: true } };
  const clock = makeFakeClock(), coordinator = api.createAssetsCardCoordinator({ setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: clock.now });
  let refreshes = 0;
  const propertyApplies = { affected: 0, unrelated: 0 };
  const fakePropertySession = (counter) => ({
    applyingAssets: false, bindingToken: counter, editor: {
      setBindingToken() {}, applyAssets() { propertyApplies[counter] += 1; return true; }, setCardVisible() { return true; }, focusAssetCard() { return true; },
      setCardLabel() {}, getCardPresentation() { return {}; }, setInspectorActive() {}
    }
  });
  const affected = { ...api.createAssetInputInstance({ kind: 'variety', id: 'X1' }, assets[0]), key: api.assetCardInstanceKey({ kind: 'variety', id: 'X1' }, 'hodge'), cardType: 'hodge', derivedStale: false };
  const unrelated = { ...api.createAssetInputInstance({ kind: 'variety', id: 'X2' }, assets[1]), key: api.assetCardInstanceKey({ kind: 'variety', id: 'X2' }, 'betti'), cardType: 'betti', derivedStale: false };
  coordinator.instances.set(affected.key, affected); coordinator.instances.set(unrelated.key, unrelated);
  Object.assign(coordinator.slots.get('hodge'), { activeInstanceKey: affected.key, visible: true, rendererSession: fakePropertySession('affected') });
  Object.assign(coordinator.slots.get('betti'), { activeInstanceKey: unrelated.key, visible: true, rendererSession: fakePropertySession('unrelated') });
  const refresh = (snapshot, _targetRef, affectedKeys) => {
    refreshes += 1;
    api.state.snapshot = snapshot;
    api.markAffectedAssetPropertyInstances(affectedKeys, coordinator);
    api.reprojectActiveAssetPropertySlots(snapshot, { onlyStale: true }, coordinator);
  };
  const bind = (ref, options = {}) => api.bindAssetInputInstance(ref, { coordinator, render: false, refresh, ...options });
  const edit = (instance, patch, options = {}) => api.updateAssetInputDraft(instance, patch, { coordinator, refresh, ...options });
  return { assets, clock, coordinator, refresh, bind, edit, propertyApplies, refreshes: () => refreshes };
};

{
  const fixture = makeAutosaveFixture(), instance = fixture.bind({ kind: 'variety', id: 'X1' });
  const revision = api.state.snapshot.revision;
  fixture.edit(instance, { name: 'A_1' });
  fixture.edit(instance, { name: 'A_2' });
  fixture.edit(instance, { name: 'A_3' });
  assert.strictEqual(instance.draft.name, 'A_3', 'every keystroke immediately updates the stable Input Instance draft');
  assert.strictEqual(fixture.assets[0].name, 'A', 'debounce hot path must not mutate the committed Asset model');
  assert.strictEqual(api.state.snapshot.revision, revision, 'debounce hot path must not increment Asset revision');
  assert.strictEqual(fixture.refreshes(), 0, 'debounce hot path must not project canvases or Property Cards');
  assert.deepStrictEqual(fixture.propertyApplies, { affected: 0, unrelated: 0 }, 'keypresses must not run derived/property computations');
  fixture.clock.tick(api.INPUT_AUTOSAVE_DEBOUNCE_MS - 1);
  assert.strictEqual(fixture.assets[0].name, 'A');
  fixture.clock.tick(1);
  assert.strictEqual(fixture.assets[0].name, 'A_3', 'trailing debounce commits only the final semantic value');
  assert.strictEqual(api.state.snapshot.revision, revision + 1, 'one debounced semantic commit increments revision once');
  assert.strictEqual(fixture.refreshes(), 1, 'one debounced semantic commit refreshes once');
  assert.deepStrictEqual(fixture.propertyApplies, { affected: 1, unrelated: 0 }, 'only the affected visible Property Card refreshes on commit');
}

{
  const fixture = makeAutosaveFixture(), a = fixture.bind({ kind: 'variety', id: 'X1' });
  const revision = api.state.snapshot.revision;
  fixture.edit(a, { name: '\\mathcal{A' });
  fixture.clock.tick(api.INPUT_AUTOSAVE_DEBOUNCE_MS);
  assert.strictEqual(a.autosaveStatus, 'Invalid draft');
  assert.strictEqual(a.draft.name, '\\mathcal{A', 'invalid intermediate LaTeX remains in its Input Instance');
  assert.strictEqual(fixture.assets[0].name, 'A');
  assert.strictEqual(api.state.snapshot.revision, revision, 'invalid draft never commits');
  const b = fixture.bind({ kind: 'variety', id: 'X2' });
  fixture.bind({ kind: 'variety', id: 'X1' });
  assert.strictEqual(a.draft.name, '\\mathcal{A', 'invalid A -> B -> A restores A draft instead of committed data');
  assert.strictEqual(b.draft.name, 'B', 'Input Instance drafts do not leak between Assets');
  assert.notStrictEqual(a.validation, b.validation, 'Input Instance validation objects are isolated');
}

{
  const fixture = makeAutosaveFixture(), a = fixture.bind({ kind: 'variety', id: 'X1' });
  fixture.edit(a, { name: 'A_{saved}' });
  fixture.bind({ kind: 'variety', id: 'X2' });
  assert.strictEqual(fixture.assets[0].name, 'A_{saved}', 'switching Assets flushes a valid pending draft');
  assert.strictEqual(fixture.assets[1].name, 'B', 'A flush cannot write into the newly active B target');
  assert.strictEqual(fixture.refreshes(), 1);
}

{
  const fixture = makeAutosaveFixture(), a = fixture.bind({ kind: 'variety', id: 'X1' });
  fixture.edit(a, { name: 'A_{captured}' }, { schedule: false });
  const command = api.createAssetInputCommitCommand(a);
  fixture.bind({ kind: 'variety', id: 'X2' }, { flush: false });
  const result = api.commitAssetInputCommand(command, { coordinator: fixture.coordinator, refresh: fixture.refresh });
  assert.strictEqual(result.committed, true, 'a captured autosave command remains valid after another Input Instance is shown');
  assert.strictEqual(fixture.assets[0].name, 'A_{captured}');
  assert.strictEqual(fixture.assets[1].name, 'B', 'autosave command target never follows Explorer/Input retarget state');
}

{
  const fixture = makeAutosaveFixture(), map = fixture.bind({ kind: 'map', id: 'M3' });
  fixture.edit(map, { data: { codomain: 'variety:X2' } }, { immediate: true });
  assert.strictEqual(fixture.assets[2].data.codomain, 'variety:X2', 'valid reference picker/drop changes commit without text debounce');
  const revision = api.state.snapshot.revision, refreshes = fixture.refreshes();
  fixture.edit(map, { data: { codomain: 'variety:X2' } }, { immediate: true });
  assert.strictEqual(api.state.snapshot.revision, revision, 'semantic no-op autosave does not increment revision');
  assert.strictEqual(fixture.refreshes(), refreshes, 'semantic no-op autosave does not refresh projections or properties');
}

{
  const fixture = makeAutosaveFixture(), a = fixture.bind({ kind: 'variety', id: 'X1' });
  fixture.edit(a, { name: 'A_{conflict}' }, { schedule: false });
  const command = api.createAssetInputCommitCommand(a), preserved = a.draft.name;
  api.state.snapshot.revision += 1;
  const result = api.commitAssetInputCommand(command, { coordinator: fixture.coordinator, refresh: fixture.refresh });
  assert.strictEqual(result.conflict, true, 'revision mismatch rejects the whole autosave command');
  assert.strictEqual(a.autosaveStatus, 'Conflict');
  assert.strictEqual(a.draft.name, preserved, 'revision conflict preserves the original Input Instance draft');
  assert.strictEqual(fixture.assets[0].name, 'A');
}

{
  const fixture = makeAutosaveFixture(), b = fixture.bind({ kind: 'variety', id: 'X2' });
  fixture.edit(b, { name: 'B_{pending}' });
  const generation = b.taskGeneration;
  api.removeAssetInputInstances(new Set(['variety:X2']), fixture.coordinator);
  fixture.clock.tick(api.INPUT_AUTOSAVE_MAX_WAIT_MS + 10);
  assert.strictEqual(b.deleted, true);
  assert(b.taskGeneration > generation, 'delete invalidates the pending task generation');
  assert.strictEqual(fixture.coordinator.instances.has(b.key), false, 'delete removes the Input Instance atomically');
  assert.strictEqual(fixture.assets[1].name, 'B', 'deleted Instance debounce cannot commit later');
}

{
  const fixture = makeAutosaveFixture(), map = fixture.bind({ kind: 'map', id: 'M3' });
  fixture.edit(map, { name: 'g' });
  const staleEpoch = map.rendererEpoch, staleGeneration = map.taskGeneration;
  map.rendererEpoch += 1;
  fixture.clock.tick(api.INPUT_AUTOSAVE_DEBOUNCE_MS);
  assert.strictEqual(fixture.assets[2].name, 'f', 'stale renderer debounce cannot mutate a newly rendered Instance');
  assert.strictEqual(api.acceptAssetInputAsyncResult(map.key, staleEpoch, staleGeneration, () => { throw new Error('stale callback executed'); }, fixture.coordinator), false, 'stale MathJax/async renderer callback is discarded');
  const currentEpoch = map.rendererEpoch;
  fixture.edit(map, { name: 'h' });
  assert.strictEqual(api.acceptAssetInputAsyncResult(map.key, currentEpoch, staleGeneration, () => { throw new Error('stale generation executed'); }, fixture.coordinator), false, 'stale validation generation is discarded');
}

{
  const fixture = makeAutosaveFixture(), a = fixture.bind({ kind: 'variety', id: 'X1' });
  for (let index = 0; index < 5; index += 1) { fixture.edit(a, { name: `A_${index}` }); fixture.clock.tick(350); }
  assert.strictEqual(fixture.assets[0].name, 'A_4', 'max-wait commits continuous typing without waiting for an unbounded pause');
  assert.strictEqual(fixture.refreshes(), 1, 'max-wait still produces one final semantic commit');
}

api.state.snapshot = { revision: 1, assets: entries, capabilities: { variety: true, sheaf: true, map: true } };

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

assert.strictEqual(api.normalizedAssetData('variety', 'curve', { dimension: '9', genus: '4' }).dimension, '1', 'curve subtype changes must force dimension one');
assert.strictEqual(api.normalizedAssetData('variety', 'point', { dimension: '9' }).dimension, '0', 'point subtype changes must force dimension zero');
assert.strictEqual(api.normalizedAssetData('variety', 'grassmannian', { r: '2', n: '5' }).dimension, '6', 'Grassmannian dimension must derive from r and n');
assert.strictEqual(api.normalizedAssetData('variety', 'symmetric-product-curve', { power: '4' }).dimension, '4', 'symmetric-product dimension must derive from its power');
assert.deepStrictEqual(Array.from(api.referenceFieldSpecs('variety', 'product'), (spec) => spec.expectedKind), ['variety', 'variety'], 'product factors must accept only varieties');
assert.deepStrictEqual(Array.from(api.referenceFieldSpecs('map', 'composition'), (spec) => spec.expectedKind), ['map', 'map'], 'map composition must accept only maps');
assert.strictEqual(api.isDirectSheafType('abstract'), true, 'direct sheaves retain an editable base variety');
assert.strictEqual(api.isDirectSheafType('dual'), false, 'constructed sheaves infer their base variety');
assert.deepStrictEqual(Array.from(api.referenceFieldSpecs('sheaf', 'abstract'), (spec) => spec.field), ['base'], 'direct sheaves expose a base picker');
assert.deepStrictEqual(Array.from(api.referenceFieldSpecs('sheaf', 'dual'), (spec) => spec.field), ['parent'], 'derived sheaves must not expose an independently editable base picker');
assert.strictEqual(api.inferredSheafBase('dual', { parent: 'sheaf:E2' }), 'variety:X1', 'a derived sheaf takes its base from its parent');
assert.strictEqual(api.normalizedAssetData('sheaf', 'dual', { parent: 'sheaf:E2' }).base, 'variety:X1', 'derived bases are normalized before validation and saving');
assert.throws(() => api.validateAssetData('variety', 'product', { first: 'variety:X1', second: 'variety:X4' }, 'variety:X1'), /must reference an allowed variety/, 'a product variety cannot use itself as a factor');
assert.throws(() => api.validateAssetData('sheaf', 'direct-sum', { base: 'variety:X1', first: 'sheaf:E2', second: 'sheaf:E2' }, 'sheaf:E2'), /must reference an allowed sheaf/, 'a sheaf construction cannot use itself as an operand');
assert.throws(() => api.validateAssetData('map', 'composition', { domain: 'map:M3', codomain: 'map:M3' }, 'map:M3'), /must reference an allowed map/, 'a map composition cannot contain itself');
entries[3].dependencies = [{ kind: 'variety', id: 'X1' }];
assert.strictEqual(api.referenceEligibility({ field: 'first', expectedKind: 'variety' }, 'variety:X4', { kind: 'variety', type: 'product', currentKey: 'variety:X1', data: { first: '', second: '' } }).allowed, false, 'a reference that closes a transitive dependency cycle must be refused');
entries[3].dependencies = [];
api.state.draggedAssetKey = 'variety:X1';
assert.strictEqual(api.referenceDragKey({ getData: () => '' }), 'variety:X1', 'dragover must retain the active asset when browsers hide custom payloads');
api.state.draggedAssetKey = '';

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
assert(source.includes("menuCascade('Properties'"), 'Asset item menus must expose a Properties cascade');
assert(source.includes('ASSET_CARD_REGISTRY') && source.includes('cardSupportsAsset'), 'all Assets Card compatibility must come from one registry helper');
assert(source.includes("button.addEventListener('pointerdown', activate)"), 'Asset property submenu actions must activate before a floating submenu can close');
assert(source.includes('Open this from Assets > Properties so it stays bound to one Asset.'), 'projected native property cards must not be allowed without a stable Asset reference');
assert(source.includes('commitAssetPropertyCommand'), 'Asset property edits must use an explicit command');
assert(source.includes('ASSET_PROPERTY_CARDS.forEach') && source.includes('cardKey === card.nativeCardKey && slot.visible'), 'each Slot session must expose only its own bound Property Card');
assert(source.includes('ensureAssetsPropertySlotSession'), 'each Assets Property Slot must use a private card-only session');
assert(source.includes('applyAssetPropertyBindingProjection') && source.includes('instance.targetRef'), 'Assets must project each private Property Slot from its stable Instance target');
assert(source.includes('captureAssetProperties'), 'property-card edits must remain in the session-only Assets collection');
assert(source.includes('if (!session || session.applyingAssets) return false;'), 'native projection and Card opening must not be mistaken for a mathematical Card command');
assert(source.includes('boundInstanceKey') && source.includes('bindingToken'), 'a Property Card callback must be tied to its stable Slot/Instance binding');
assert(source.includes("This property card could not be displayed."), 'opening a property Card must fail visibly instead of silently doing nothing');
assert(source.includes('function revealAssetsEditor'), 'New and Open must restore the shared Assets Input card');
assert(source.includes("selectInspectorSource('assets')"), 'Asset editing must return the Inspector to Assets');
assert(source.includes('function createDefaultAsset'), 'New Assets commands must create a visible default object immediately');
assert(source.includes('function uniqueDefaultAssetName'), 'default Assets must retain globally unique names');
assert(source.includes('promoteInspectorCard'), 'requested Assets editing and property cards must lead the Inspector');
assert(source.includes('cardPickerSourceId'), 'the Add card source selector must keep its own source state');
assert(source.includes('workspace-card-options-unavailable'), 'unavailable cards must be grouped after available cards in the picker');
assert(source.includes("addEventListener('input', changeCardPickerSource)") && source.includes("addEventListener('change', changeCardPickerSource)"), 'the native source selector must refresh the picker for both select events');
assert(source.includes('function applyCardVisibility') && source.includes('const onScreen = preferred === \'assets\' || !session?.inspectorHost?.hidden'), 'card-picker checks must represent independently visible cards in the shared Inspector');
assert(source.includes('onScreen && available && !!card.visible'), 'unavailable cards must never appear checked when they cannot render');
assert(source.includes('editor.listCards?.().forEach((card) => editor.setCardVisible?.(card.key, false))'), 'new calculator sessions must keep their cards unchecked until explicitly added to the Inspector');
assert(source.includes('installWorkspaceOwnedCardChrome'), 'Assets-owned cards must receive the standard calculator-card header controls');
assert(source.includes('enableWorkspaceOwnedCardDragging') && source.includes('workspaceCardDragSuppressed'), 'Assets-owned cards must use the standard drag-grip reordering behavior without collapsing after a drag');
assert(source.includes('function normalizedAssetData') && source.includes('function validateAssetData'), 'Assets Input must normalize derived data and reject invalid references');
assert(source.includes('function referenceFieldSpecs') && source.includes('function referenceEligibility'), 'reference picker, drag/drop, and save validation must share one eligibility rule');
assert(!source.includes('editorRef') && !source.includes('editorDraft'), 'global Input target/draft state must be fully migrated to stable Input Instances');
assert(source.includes('DIRECT_SHEAF_TYPES') && source.includes('function inferredSheafBase'), 'direct and constructed sheaves must have distinct base-variety behavior');
assert(source.includes('INPUT_AUTOSAVE_DEBOUNCE_MS = 450') && source.includes('INPUT_AUTOSAVE_MAX_WAIT_MS = 1500'), 'Assets Input autosave must use bounded trailing debounce');
assert(source.includes('captureSheafComplexLayout') && source.includes('viewPosition'), 'View layout must be captured by stable Asset key and fed back into projection');
assert(!source.includes('restoreAssetPayloads?.(snapshot)'), 'View projection must not restore a native mathematical payload over Assets');
assert(!source.includes('propertyData'), 'mathematical Card properties must live on Asset records, not a private parallel store');
assert(source.includes('function commitAssetPropertyCommand'), 'Card math edits must use an explicit command to update an Asset record');
assert(source.includes('ASSET_DRAG_TYPE') && source.includes('bindReferenceField'), 'Assets must expose a typed drag payload and droppable reference component');
assert(source.includes('draggedAssetKey'), 'drag targets must retain the active reference while browser dragover hides custom payload data');
assert(source.includes('function collectSheafComplexAssets'), 'the workspace controller must project Assets into the native Sheaf canvas');
assert(source.includes('const roots = assetState.snapshot.assets.map(assetKey);'), 'Collect must start from the Assets graph rather than reverse-export the canvas');
assert(source.includes('projectAssetsToSheafComplex(session);'), 'Collect must project Assets into the Sheaf Complex canvas');
assert(source.includes("selectCanvasTab('sheaf-complexes');"), 'a successful collection must keep the refreshed Sheaf canvas focused');
assert(source.includes('function bindSheafComplexAssetDrop'), 'split view must make the native Sheaf canvas an Assets drop target');
assert(source.includes('function assetDependencyClosure'), 'a Sheaf canvas drop must include transitive Assets prerequisites');
assert(source.includes('assetProjection'), 'each workspace Sheaf canvas must retain its projected Assets and layout');
assert(!source.includes('baseByKey'), 'a View must not retain a second copy of an Asset base');
assert(source.includes("new Set(['input-card', 'homology-card'])"), 'legacy Sheaf Input and Homology cards must remain in their transition group');
assert(!source.includes('workspace-assets-toolbar'), 'Explorer controls must not duplicate the shortcut menu in a toolbar');
assert(!historicalSheafSource.includes('WORKSPACE_ASSETS_MODE'), 'the historical Sheaf calculator must not contain workspace Assets code');
assert(source.includes('function makeNativeCalculator'), 'workspace calculators must mount native editors');
assert(source.includes('inspectorHost'), 'workspace calculators must mount a separate Inspector host');
assert(source.includes('function ensureCalculatorSession'), 'cards must retain a session after a canvas tab closes');
assert(source.includes('function availableCardsFor'), 'the outer Add card picker must enumerate source-specific cards');
assert(source.includes('workspace-card-form') && source.includes('workspace-field') && source.includes('workspace-control'), 'Assets Input must use the shared workspace card standard');
assert(!source.includes('iframe'), 'workspace implementation must not create calculator iframes');
assert(!source.includes('postMessage'), 'workspace implementation must not use a calculator message bridge');
assert(!source.includes('calculator_workspace'), 'workspace implementation must not reference the retired calculator host or bridge');
assert(!html.includes('<iframe'), 'workspace markup must not contain calculator iframes');
assert(!html.includes('calculator_workspace'), 'workspace markup must not load the retired calculator host or bridge');
assert(nativeBundle.includes(Buffer.from('MathWorkspaceNativeEditors')), 'the self-contained native editor library must export its factories');
assert(nativeBundle.includes(Buffer.from('setInspectorActive')), 'native calculators must expose an independent Inspector lifecycle');
assert(nativeBundle.includes(Buffer.from('setAssetAdapter')), 'the workspace-native runtime must expose the optional Assets adapter');
assert(nativeBundle.includes(Buffer.from('setBindingToken')), 'workspace-native Property callbacks must carry their Slot binding token');
assert(nativeBundle.includes(Buffer.from('getCardPresentation')) && nativeBundle.includes(Buffer.from('setCardLabel')), 'workspace-native Property Slots must expose presentation and target-title adapters');
assert(nativeBundle.includes(Buffer.from('__workspaceAssetsApplied')), 'only the bundled Sheaf Complex editor may contain the Assets adapter');
assert(nativeBundle.includes(Buffer.from('__workspaceCollectAssets')), 'the native bridge retains its graph snapshot capability for future workspace synchronization');
assert(nativeBundle.includes(Buffer.from('__workspaceProjectionProperties')), 'the native adapter must read mathematical properties from Asset records');
assert(nativeBundle.includes(Buffer.from('captureAssetLayout')), 'the native adapter must expose only View layout back to the controller');
assert(nativeBundle.includes(Buffer.from('__workspaceSetProjectionReadOnly')), 'projected native math controls must be read-only');
assert(nativeBundle.includes(Buffer.from('__workspaceSyncHomologyPromotionLabels')), 'workspace-only promotion labels must follow the current Asset base');
assert(nativeBundle.includes(Buffer.from('validateAssetCardBinding')), 'the native adapter must call the central workspace compatibility validator');
assert(nativeBundle.includes(Buffer.from('if (refs.homologyRules) new MutationObserver(__workspaceSyncHomologyPromotionLabels).observe(refs.homologyRules')), 'the Homology-label observer must wait until the native editor has initialized its refs');
assert(nativeBundle.includes(Buffer.from('workspaceCollectAssets')), 'the workspace-only Collect canvas button must be present in the native bundle');
assert(nativeBundle.includes(Buffer.from('state.varieties = assets.filter((asset) => asset.kind === "variety").map((asset) => project(asset, __workspaceVarietyFromAsset))')), 'the authoritative adapter must replace each native Asset clone from the projection');
assert(nativeBundle.includes(Buffer.from('listCards')), 'native calculators must expose their card catalog to the workspace picker');
assert(nativeBundle.includes(Buffer.from('prioritizeCard')), 'native property cards must support being promoted to the first Inspector position');
assert(!nativeBundle.includes(Buffer.from('workspace-view-area')), 'native calculators must not wrap main canvases in a workspace view area');
assert(!nativeBundle.includes(Buffer.from('workspace-view-heading')), 'native calculators must not add a duplicate Main canvas heading');
assert(!nativeBundle.includes(Buffer.from('--workspace-inspector-offset')), 'native calculators must not use a coordinate-based Inspector portal');
assert(nativeBundle.includes(Buffer.from('body.querySelectorAll("footer")')), 'native calculators must remove standalone footer chrome inside the workspace');
assert(nativeBundle.includes(Buffer.from(':host{display:block;min-width:0;height:100%;overflow:hidden;isolation:isolate}')), 'native calculator hosts must fill their allocated workspace height');
assert(nativeBundle.includes(Buffer.from('[id$="-wide-host"]:not(:has(.card)){display:none!important}')), 'empty wide-card hosts must not reserve native canvas space');
assert(nativeBundle.includes(Buffer.from('.workspace-editor-layout .workspace-view-card{min-width:0;width:100%;height:100%')), 'nested calculator canvas panels must fill their allocated workspace height');
assert(/math_workspace_native_editors_v8\.js\?v=[a-f0-9]{16}/.test(html), 'native editor cache query must be derived from the reproducible bundle hash');
assert(html.includes('css/math_workspace.css?v=20260926-2'), 'workspace stylesheet changes need a cache-query bump');
assert(html.includes('js/math_workspace.js?v=20260926-5'), 'workspace controller changes need a cache-query bump');
assert(html.includes('js/calculator_cards.js?v=20260903-1'), 'workspace-owned Assets cards must reuse the shared calculator card chrome');
assert(nativeBuilder.includes('math_workspace_native_editors_v8.js') && nativeBuilder.includes('Stale live native editor bundle'), 'the source builder must publish and verify the live runtime');
assert(!source.includes("closeCardPicker(); const picker = assetState.referencePicker"), 'native source selection must not be closed by the global outside-pointer handler');
assert(html.includes('id="workspace-io-head"') && html.includes('drag-handle'), 'Assets Import / Export must expose the same drag grip as other cards');
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
assert(css.includes('Workspace card standard') && css.includes('.workspace-check') && css.includes('.workspace-code-control') && css.includes('.workspace-field-inline'), 'new workspace cards must have shared compact form and checkbox primitives');
assert(css.includes('.workspace-reference-control') && css.includes('.workspace-reference-picker'), 'reference fields need shared picker and drag-state styling');
assert(css.includes('.workspace-reference-derived'), 'inferred bases need a shared read-only reference style');
assert(css.includes('.workspace-card-options-unavailable') && css.includes('.workspace-card-tools'), 'Assets card picker and owned-card controls need shared workspace styling');
assert(css.includes('--workspace-view-height'), 'the outer View height must follow its visible session');
assert(css.includes('--workspace-session-pane-height'), 'each split canvas needs an independent allocated height');
assert(css.includes("[data-assets-empty='empty']") && css.includes("[data-assets-empty='loading']"), 'empty and loading Assets layouts must use stable Content-mode hooks');
assert(source.includes('function beginCanvasResize'), 'the focused canvas must have a resize handle');
assert(source.includes("openCanvas('assets')"), 'Assets must open as the initial workspace view');
assert(html.includes('id="workspace-canvas-resizer"'), 'the View must expose the focused-session resize handle');
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
  console.log('math_workspace_assets_test: atomic property commands, native isolation, layouts, selection, menus, and cascade covered');
}).catch((error) => { console.error(error); process.exitCode = 1; });
