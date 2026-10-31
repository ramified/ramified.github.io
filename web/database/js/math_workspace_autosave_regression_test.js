const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'math_workspace.js'), 'utf8');
const document = { addEventListener() {}, querySelector() { return null; } };
// Use the real definition/validation modules, just as the page does. A missing
// model is caught as an invalid dimension, disguising fixture drift as a save failure.
const window = {
  addEventListener() {},
  MathWorkspaceMosaic: require('./math_workspace_mosaic.js'),
  MathWorkspaceNumbers: require('./math_workspace_numbers.js'),
  MathWorkspacePresentation: require('./math_workspace_presentation.js'),
  MathWorkspaceSheafModel: require('./math_workspace_sheaf_model.js')
};
vm.runInNewContext(source, { console, document, window, location: { protocol: 'file:', origin: 'null' }, URLSearchParams, Intl, Date, Map, Set, Promise, setTimeout, clearTimeout });
const api = window.MathWorkspaceAssetsTest;

function fakeClock() {
  let now = 0, nextId = 1;
  const tasks = new Map();
  return {
    now: () => now,
    setTimer(fn, delay) { const id = nextId++; tasks.set(id, { at: now + Math.max(0, delay), fn }); return id; },
    clearTimer(id) { tasks.delete(id); },
    tick(ms) {
      const end = now + ms;
      while (true) {
        const due = [...tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        tasks.delete(due[0]); now = due[1].at; due[1].fn();
      }
      now = end;
    }
  };
}

function fixture() {
  const assets = [
    { kind: 'variety', id: 'X1', name: 'A', plainName: 'A', type: 'abstract', typeLabel: 'Abstract variety', data: { dimension: '3' }, dependencies: [], properties: {} },
    { kind: 'variety', id: 'X2', name: 'B', plainName: 'B', type: 'abstract', typeLabel: 'Abstract variety', data: { dimension: '2' }, dependencies: [], properties: {} },
    { kind: 'map', id: 'M3', name: 'f', plainName: 'f', type: 'ordinary', typeLabel: 'Map of varieties', data: { domain: 'variety:X1', codomain: 'variety:X1' }, dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} }
  ];
  api.state.snapshot = { revision: 50, assets, capabilities: { variety: true, sheaf: true, map: true } };
  const clock = fakeClock();
  const coordinator = api.createAssetsCardCoordinator({ setTimer: clock.setTimer, clearTimer: clock.clearTimer, now: clock.now });
  let refreshes = 0;
  const refresh = (snapshot) => { refreshes += 1; api.state.snapshot = snapshot; };
  const bind = (ref, options = {}) => api.bindAssetInputInstance(ref, { coordinator, render: false, refresh, ...options });
  const edit = (instance, patch, options = {}) => api.updateAssetInputDraft(instance, patch, { coordinator, refresh, ...options });
  return { assets, clock, coordinator, refresh, bind, edit, refreshes: () => refreshes };
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' }), revision = api.state.snapshot.revision;
  const validation = api.validateAssetInputDraft(a);
  assert.strictEqual(validation.valid, true, 'fixture must load the real validation dependencies: ' + validation.message);
  f.edit(a, { name: 'A1' }); f.edit(a, { name: 'A2' }); f.edit(a, { name: 'A3' });
  assert.strictEqual(a.draft.name, 'A3');
  assert.strictEqual(f.assets[0].name, 'A');
  assert.strictEqual(api.state.snapshot.revision, revision);
  assert.strictEqual(f.refreshes(), 0);
  f.clock.tick(449); assert.strictEqual(f.assets[0].name, 'A');
  f.clock.tick(1); assert.strictEqual(f.assets[0].name, 'A3');
  assert.strictEqual(api.state.snapshot.revision, revision + 1);
  assert.strictEqual(f.refreshes(), 1);
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' }), revision = api.state.snapshot.revision;
  f.edit(a, { name: '\\mathcal{A' }); f.clock.tick(450);
  assert.strictEqual(a.autosaveStatus, 'Invalid draft');
  assert.strictEqual(a.draft.name, '\\mathcal{A');
  assert.strictEqual(api.state.snapshot.revision, revision);
  const b = f.bind({ kind: 'variety', id: 'X2' });
  f.bind({ kind: 'variety', id: 'X1' });
  assert.strictEqual(a.draft.name, '\\mathcal{A');
  assert.strictEqual(b.draft.name, 'B');
  assert.notStrictEqual(a.validation, b.validation);
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' });
  f.edit(a, { name: 'A_{flush}' });
  f.bind({ kind: 'variety', id: 'X2' });
  assert.strictEqual(f.assets[0].name, 'A_{flush}');
  assert.strictEqual(f.assets[1].name, 'B');
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' });
  f.edit(a, { name: 'A_{fixed}' }, { schedule: false });
  const command = api.createAssetInputCommitCommand(a);
  f.bind({ kind: 'variety', id: 'X2' }, { flush: false });
  api.commitAssetInputCommand(command, { coordinator: f.coordinator, refresh: f.refresh });
  assert.strictEqual(f.assets[0].name, 'A_{fixed}');
  assert.strictEqual(f.assets[1].name, 'B');
}

{
  const f = fixture(), map = f.bind({ kind: 'map', id: 'M3' });
  f.edit(map, { data: { codomain: 'variety:X2' } }, { immediate: true });
  assert.strictEqual(f.assets[2].data.codomain, 'variety:X2');
  const revision = api.state.snapshot.revision, refreshes = f.refreshes();
  f.edit(map, { data: { codomain: 'variety:X2' } }, { immediate: true });
  assert.strictEqual(api.state.snapshot.revision, revision);
  assert.strictEqual(f.refreshes(), refreshes);
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' });
  f.edit(a, { name: 'A_{independent}' }, { schedule: false });
  const command = api.createAssetInputCommitCommand(a);
  f.assets[1].name = 'B_{elsewhere}'; api.state.snapshot.revision += 1;
  assert.strictEqual(api.commitAssetInputCommand(command, { coordinator: f.coordinator, refresh: f.refresh }).committed, true, 'an unrelated asset revision must not conflict');
  assert.strictEqual(f.assets[0].name, 'A_{independent}');
  assert.strictEqual(f.assets[1].name, 'B_{elsewhere}');
  assert.strictEqual(a.conflictState, null);
}

for (const resolution of ['saved', 'draft']) {
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' });
  f.edit(a, { name: 'A_{conflict}' }, { schedule: false });
  const command = api.createAssetInputCommitCommand(a);
  f.assets[0].name = 'A_{elsewhere}'; api.state.snapshot.revision += 1;
  assert.strictEqual(api.commitAssetInputCommand(command, { coordinator: f.coordinator, refresh: f.refresh }).conflict, true);
  assert.strictEqual(a.draft.name, 'A_{conflict}');
  assert.strictEqual(a.autosaveStatus, 'Conflict');
  assert.strictEqual(f.assets[0].name, 'A_{elsewhere}', 'a conflicting draft must not overwrite the external edit');
  assert.strictEqual(api.resolveAssetInputConflict(a, resolution, { coordinator: f.coordinator, refresh: f.refresh }), true);
  const expected = resolution === 'saved' ? 'A_{elsewhere}' : 'A_{conflict}';
  assert.strictEqual(a.draft.name, expected);
  assert.strictEqual(f.assets[0].name, expected);
  assert.strictEqual(a.conflictState, null);
  assert.strictEqual(a.autosaveStatus, 'Saved');
}

{
  const f = fixture(), b = f.bind({ kind: 'variety', id: 'X2' });
  f.edit(b, { name: 'B_{pending}' });
  api.removeAssetInputInstances(new Set(['variety:X2']), f.coordinator);
  f.clock.tick(1600);
  assert.strictEqual(b.deleted, true);
  assert.strictEqual(f.coordinator.instances.has(b.key), false);
  assert.strictEqual(f.assets[1].name, 'B');
}

{
  const f = fixture(), map = f.bind({ kind: 'map', id: 'M3' });
  f.edit(map, { name: 'g' });
  const epoch = map.rendererEpoch, generation = map.taskGeneration;
  map.rendererEpoch += 1; f.clock.tick(450);
  assert.strictEqual(f.assets[2].name, 'f');
  assert.strictEqual(api.acceptAssetInputAsyncResult(map.key, epoch, generation, () => assert.fail('stale renderer callback ran'), f.coordinator), false);
  f.edit(map, { name: 'h' });
  assert.strictEqual(api.acceptAssetInputAsyncResult(map.key, map.rendererEpoch, generation, () => assert.fail('stale generation callback ran'), f.coordinator), false);
}

{
  const f = fixture(), a = f.bind({ kind: 'variety', id: 'X1' });
  for (let index = 0; index < 5; index += 1) { f.edit(a, { name: `A_${index}` }); f.clock.tick(350); }
  assert.strictEqual(f.assets[0].name, 'A_4');
  assert.strictEqual(f.refreshes(), 1);
}

{
  const f = fixture();
  const parent = { kind: 'sheaf', id: 'E4', name: 'E', type: 'locally-free', data: { base: 'variety:X1', rank: '2' }, dependencies: [{ kind: 'variety', id: 'X1' }], properties: {} };
  const saved = { kind: 'sheaf', id: 'E5', name: 'S', type: 'self-direct-sum', data: { base: 'variety:X1', parent: 'sheaf:E4', multiplicity: '2', workspaceSheafComplex: { payload: { id: 'native-S', construction: { type: 'self-direct-sum', multiplicity: '2' } } } }, dependencies: [{ kind: 'sheaf', id: 'E4' }], properties: {} };
  f.assets.push(parent, saved);
  const input = f.bind(saved);
  f.edit(input, { data: { multiplicity: '3' } }, { immediate: true });
  assert.strictEqual(saved.data.multiplicity, '3');
  assert.strictEqual(saved.data.workspaceSheafComplex.payload.construction, undefined);
  assert.strictEqual(input.draft.data.workspaceSheafComplex.payload.construction, undefined, 'invalidate the draft cache with the saved cache');
  f.edit(input, { name: 'S_{renamed}' }, { immediate: true });
  const current = api.state.snapshot.assets.find(asset => asset.id === saved.id);
  assert.strictEqual(current.name, 'S_{renamed}');
  assert.strictEqual(current.data.workspaceSheafComplex.payload.construction, undefined, 'later autosaves must not resurrect the old construction');
}

{
  const cached={workspaceSheafComplex:{payload:{construction:{type:'tensor',exact:true,derived:false}}}};
  assert.strictEqual(api.normalizedAssetData('sheaf','tensor',cached).exact,true,'legacy cached ordinary mode is reflected in the editor');
  assert.strictEqual(api.normalizedAssetData('sheaf','tensor',{...cached,exact:false}).exact,false,'explicit derived mode takes priority over the cache');
  assert.strictEqual(api.normalizedAssetData('sheaf','map-operation',{workspaceSheafComplex:{payload:{construction:{type:'pushforward',proper:false}}}}).proper,false,'legacy ! pushforward is not silently displayed as proper');
}

console.log('math_workspace_autosave_regression_test: per-Asset drafts, debounce, guards, conflicts, cleanup, invalidation and legacy mode defaults passed');
