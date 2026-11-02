const assert = require('node:assert/strict');
const { Library, WorkspaceDrafts, mergePayload } = require('./theorem_graph_storage.js');
const clone = value => JSON.parse(JSON.stringify(value));
const payload = title => ({ formatVersion: 1, graph: { schemaVersion: 11, title, nodes: [], arrows: [] }, drafts: [] });
class MemoryStore {
  constructor() { this.records = new Map(); }
  async read(id) { return this.records.has(id) ? clone(this.records.get(id)) : null; }
  async list() { return [...this.records.values()].map(clone); }
  async remove(id) { this.records.delete(id); }
  async put(record, expected) {
    if ((this.records.get(record.id)?.localVersion || 0) !== expected) throw Object.assign(new Error('Local conflict'), { status: 409 });
    const result = { ...clone(record), localVersion: expected + 1 };
    this.records.set(record.id, result); return clone(result);
  }
}
class Remote {
  constructor() { this.records = new Map(); this.calls = []; this.loseReply = false; }
  async request(route, method = 'GET', body) {
    const id = route.split('/')[2];
    const existing = this.records.get(id);
    if (method === 'GET') {
      if (!existing) throw Object.assign(new Error('Graph not found'), { status: 404 });
      return clone(existing);
    }
    if (method === 'DELETE') {
      if (existing?.revision !== body.baseRevision) throw Object.assign(new Error('Cloud conflict'), { status: 409 });
      this.records.delete(id); return { ok: true };
    }
    this.calls.push(clone(body));
    if (this.hold) await this.hold();
    if (existing?.writeId === body.writeId) return { revision: existing.revision };
    if ((existing?.revision || 0) !== body.baseRevision) throw Object.assign(new Error('Cloud conflict'), { status: 409 });
    this.records.set(id, { id, title: body.title ?? existing?.title ?? body.payload.graph.title, payload: clone(body.payload), revision: body.baseRevision + 1, writeId: body.writeId, updatedAt: Date.now() });
    if (this.loseReply) { this.loseReply = false; throw new Error('Connection lost after commit'); }
    return { revision: body.baseRevision + 1 };
  }
}
async function run() {
  const store = new MemoryStore(); const api = new Remote();
  const a = new Library({ store, api });
  await a.create(payload('Initial'));
  const id = a.current.id;
  await a.save(payload('Offline edit'));
  assert.equal(a.current.title, 'Initial', 'content title edits preserve the saved version name');
  assert(a.dirty()); await a.sync(); assert.equal(api.calls.length, 0);
  const reloaded = new Library({ store, api });
  assert.equal((await reloaded.openLocal(id)).graph.title, 'Offline edit');
  reloaded.online = true; api.loseReply = true;
  await assert.rejects(reloaded.sync(), /Connection lost/);
  const pending = reloaded.current.pending.writeId;
  assert(reloaded.dirty());
  await reloaded.save(payload('Typed after lost response'));
  await reloaded.sync();
  assert.equal(api.calls[1].writeId, pending, 'uncertain saves reuse the persisted operation ID');
  assert.equal(api.records.get(id).payload.graph.title, 'Typed after lost response');
  assert.equal(api.records.get(id).revision, 2);
  assert(!reloaded.dirty());

  let release; let started;
  const inFlight = new Promise(resolve => { started = resolve; });
  api.hold = () => { started(); return new Promise(resolve => { release = resolve; }); };
  await reloaded.save(payload('First request'));
  const syncing = reloaded.sync(); await inFlight;
  await reloaded.save(payload('Edit while saving'));
  await reloaded.rename(id, 'Named during sync');
  api.hold = null; release(); await syncing;
  assert.equal(api.records.get(id).payload.graph.title, 'Edit while saving');
  assert.equal(api.records.get(id).title, 'Named during sync', 'a rename during a content save is drained separately');
  assert(!reloaded.dirty());

  api.records.get(id).revision++;
  api.records.get(id).payload = payload('Another device');
  await reloaded.save(payload('My unsynced work'));
  await reloaded.sync(); assert(reloaded.current.conflict);
  const calls = api.calls.length; await reloaded.sync(); assert.equal(api.calls.length, calls);
  const restored = await reloaded.useCloudVersion();
  assert.equal(restored.graph.title, 'Another device');
  assert((await store.list()).some(record => record.recovered && record.payload.graph.title === 'My unsynced work'));
  assert.equal((await store.list()).find(record => record.recovered).title, 'Named during sync', 'recovered copies retain their saved name');

  const tab = new Library({ store, api });
  await tab.openLocal(id);
  await reloaded.save(payload('Updated in first tab'));
  await tab.save(payload('Other tab must survive'));
  assert.notEqual(tab.current.id, id, 'stale local tab becomes a recovery copy');
  assert(tab.current.recovered);
  assert.equal((await store.read(id)).payload.graph.title, 'Updated in first tab');

  const opening = clone(tab.opening);
  await tab.save(payload('After opening'));
  await tab.save(opening, true);
  assert(tab.current.history.some(entry => entry.payload.graph.title === 'After opening'));
  assert.equal(tab.current.payload.graph.title, opening.graph.title);
  assert.equal(tab.current.forceCheckpoint, true);
  const pendingBefore = clone(reloaded.current.payload);
  await reloaded.openCloud(id);
  assert.deepEqual(reloaded.current.payload, pendingBefore, 'opening cloud never silently replaces unsent local edits');
  console.log('PASS theorem storage: offline/reload, uncertain-response retry, edits during sync, cloud/local conflicts, recovery copies, restore history');

  const management = new Library({ store: new MemoryStore(), api: new Remote() });
  management.online = true;
  const original = payload('Before rename');
  original.graph.titleNode = { label: 'Before rename' };
  original.drafts = [{ selector: '#graph-title', value: 'Old raw title ' }, { selector: '#node-label', value: 'Node draft ' }];
  await management.create(original, 'First proof'); await management.sync();
  const firstId = management.current.id;
  await management.create(original, 'Alternative proof'); await management.sync();
  const currentId = management.current.id;
  await management.rename(firstId, '  Renamed graph  '); await management.sync();
  assert.equal(management.current.id, currentId, 'renaming another row keeps the editor on its current graph');
  const renamed = await management.store.read(firstId);
  assert.equal(renamed.title, 'Renamed graph');
  assert.deepEqual(renamed.payload, original, 'renaming preserves graph content, title node, editor state and raw drafts');
  assert.equal(renamed.history.length, 0, 'a library rename does not create a graph-content checkpoint');
  assert.equal(management.current.title, 'Alternative proof');
  assert.deepEqual(management.current.payload, original, 'different saved names can distinguish the same graph title');
  assert.equal(management.api.records.get(firstId).title, 'Renamed graph');
  assert.deepEqual(management.api.records.get(firstId).payload, original);
  await management.openLocal(firstId);
  await management.save(payload('Edited graph title')); await management.sync();
  assert.equal(management.current.title, 'Renamed graph', 'autosave keeps the saved name after a title change');
  await management.save(original, true); await management.sync();
  assert.equal(management.current.title, 'Renamed graph', 'restoring content keeps the saved name');
  await management.openLocal(currentId);
  management.api.records.get(firstId).revision++;
  await assert.rejects(management.remove(firstId), /changed on another device/);
  assert(await management.store.read(firstId), 'a rejected delete retains the local graph');
  await management.openCloud(firstId);
  management.online = false;
  await assert.rejects(management.remove(firstId), /Connect before deleting/);
  management.online = true;
  await management.remove(firstId);
  assert.equal(management.current, null);
  assert.equal(await management.store.read(firstId), null);
  assert(!management.api.records.has(firstId));
  assert(await management.store.read(currentId), 'deleting one graph preserves the other rows');
  console.log('PASS theorem storage: independent saved names, same-title versions, content/draft preservation, non-active rows, restores, stale/offline delete rejection, local/cloud removal');

  const legacyStore = new MemoryStore();
  const legacy = new Library({ store: legacyStore, api: management.api });
  const oldRecord = management.api.records.get(currentId);
  await legacyStore.put({ ...legacy.make(oldRecord.payload), id: currentId, title: oldRecord.title,
    cloudRevision: oldRecord.revision, syncedPayload: JSON.stringify(oldRecord.payload) }, 0);
  await legacy.openLocal(currentId);
  assert(!legacy.dirty(), 'legacy records need no forced upload');
  await legacy.rename(currentId, 'Legacy name');
  assert(legacy.dirty(), 'metadata-only edits to legacy records are dirty');
  const legacyReload = new Library({ store: legacyStore, api: management.api });
  await legacyReload.openLocal(currentId); legacyReload.online = true; legacyReload.api.loseReply = true;
  await assert.rejects(legacyReload.sync(), /Connection lost/);
  await legacyReload.rename(currentId, 'After lost rename response');
  await legacyReload.sync();
  assert.equal(management.api.records.get(currentId).title, 'After lost rename response');
  assert.deepEqual(management.api.records.get(currentId).payload, original);
  assert(!legacyReload.dirty());
  const remoteOnly = new Library({ store: new MemoryStore(), api: management.api }); remoteOnly.online = true;
  await remoteOnly.rename(currentId, 'Remote-only name'); await remoteOnly.sync();
  assert.equal(remoteOnly.current, null, 'renaming a cloud-only row does not open it');
  await legacyReload.openCloud(currentId);
  assert.equal(legacyReload.current.title, 'Remote-only name', 'cloud reload restores name independently of content');
  console.log('PASS theorem storage: legacy metadata migration, offline rename reload, uncertain rename retries and remote-only names');

  const draftStore = new MemoryStore(), drafts = new WorkspaceDrafts(draftStore);
  const savedBefore = clone(await legacyReload.store.read(currentId));
  await drafts.save(payload('Experiment'), currentId, 'saved-baseline', 'Independent name');
  const draftId = drafts.current.id;
  await legacyReload.sync();
  assert.deepEqual(await legacyReload.store.read(currentId), savedBefore, 'backing up drafts never writes to the saved library');
  const otherTab = new WorkspaceDrafts(draftStore);
  await otherTab.open(draftId);
  await drafts.save(payload('First tab'), currentId, 'saved-baseline', 'Independent name');
  await otherTab.save(payload('Second tab'), currentId, 'saved-baseline', 'Independent name');
  assert.notEqual(otherTab.current.id, draftId, 'concurrent draft updates preserve both tabs');
  assert.equal((await draftStore.read(draftId)).payload.graph.title, 'First tab');
  drafts.release();
  await drafts.save(payload('Temporary'), null, '', 'Temporary');
  assert.equal(drafts.current.sourceId, null);
  assert.equal((await drafts.list()).length, 3, 'detaching retains old drafts for recovery');
  const reloadedDrafts = new WorkspaceDrafts(draftStore);
  assert.equal((await reloadedDrafts.open(drafts.current.id)).payload.graph.title, 'Temporary');
  let releaseWrite;
  const delayed = new WorkspaceDrafts({ put: record => new Promise(resolve => { releaseWrite = () => resolve(record); }) });
  const flight = delayed.save(payload('Before import'), currentId, 'baseline', 'A');
  delayed.release(); releaseWrite(); await flight;
  assert.equal(delayed.current, null, 'a late backup must not rebind an imported or detached workspace');
  console.log('PASS theorem drafts: separate storage, reload, detaching, concurrent tabs and late backup isolation');

  const cloud = new Remote();
  const writer = new Library({ store: new MemoryStore(), api: cloud }); writer.online = true;
  const base = payload('Shared content');
  base.graph.nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
  await writer.create(base, 'Original saved name'); await writer.sync();
  const sharedId = writer.current.id;
  const reader = new Library({ store: new MemoryStore(), api: cloud }); reader.online = true;
  await reader.openCloud(sharedId);
  await writer.rename(sharedId, 'Renamed on A'); await writer.sync();
  await reader.receive(await cloud.request('/documents/' + sharedId));
  assert.equal(reader.current.title, 'Renamed on A');
  assert.equal(reader.current.cloudRevision, writer.current.cloudRevision);
  assert(!reader.current.conflict && !reader.dirty(), 'remote-only renames fast-forward, including the revision');

  const left = clone(base), right = clone(base);
  left.graph.nodes[0].label = 'Changed on B'; right.graph.nodes[1].label = 'Changed on A';
  await reader.save(left); await writer.save(right); await writer.sync(); await reader.sync();
  assert(!reader.current.conflict && !reader.dirty(), 'non-overlapping saved edits rebase and upload automatically');
  assert.deepEqual(cloud.records.get(sharedId).payload.graph.nodes.map(node => node.label), ['Changed on B', 'Changed on A']);

  await writer.receive(await cloud.request('/documents/' + sharedId));
  const sameLeft = clone(reader.current.payload), sameRight = clone(writer.current.payload);
  sameLeft.graph.nodes[0].label = 'My conflicting edit'; sameRight.graph.nodes[0].label = 'Their conflicting edit';
  await reader.save(sameLeft); await writer.save(sameRight); await writer.sync(); await reader.sync();
  assert(reader.current.conflict, 'different changes to the same field require review');
  assert.equal(reader.current.payload.graph.nodes[0].label, 'My conflicting edit');
  assert.equal(cloud.records.get(sharedId).payload.graph.nodes[0].label, 'Their conflicting edit');

  const deleted = clone(base); deleted.graph.nodes.shift();
  const otherEdit = clone(base); otherEdit.graph.nodes[1].label = 'Independent edit';
  const deletionMerge = mergePayload(base, deleted, otherEdit);
  assert.equal(deletionMerge.conflicts.length, 0);
  assert.deepEqual(deletionMerge.payload.graph.nodes, [{ id: 'b', label: 'Independent edit' }]);
  const deletedEdit = clone(base); deletedEdit.graph.nodes[0].label = 'Edit deleted node';
  assert(mergePayload(base, deleted, deletedEdit).conflicts.length, 'delete versus edit is a real conflict');
  const newLink = clone(base); newLink.graph.arrows.push({ id: 'link', sourceId: 'a', targetId: 'b' });
  assert(mergePayload(base, deleted, newLink).conflicts.length, 'merging cannot leave an arrow pointing at a deleted node');
  const oldInput = clone(base); oldInput.drafts = [{ selector: '#graph-title', context: 'old selection', value: 'Shared content' }];
  const movedInput = clone(oldInput); movedInput.drafts[0].context = 'new selection';
  const changedInput = clone(oldInput); changedInput.graph.title = 'Remote title'; changedInput.drafts[0].value = 'Remote title';
  assert.equal(mergePayload(oldInput, movedInput, changedInput).conflicts.length, 0, 'selecting another node does not create a title draft conflict');
  const orderedBase = clone(base); orderedBase.graph.nodes.push({ id: 'c', label: 'C' });
  const reordered = clone(orderedBase); reordered.graph.nodes = [reordered.graph.nodes[1], reordered.graph.nodes[0], reordered.graph.nodes[2]];
  const orderedEdit = clone(orderedBase); orderedEdit.graph.nodes[2].label = 'Independent C';
  assert.deepEqual(mergePayload(orderedBase, reordered, orderedEdit).payload.graph.nodes.map(node => node.id), ['b', 'a', 'c'], 'an independent content edit preserves a local reorder');
  const otherOrder = clone(orderedBase); otherOrder.graph.nodes = [otherOrder.graph.nodes[0], otherOrder.graph.nodes[2], otherOrder.graph.nodes[1]];
  assert(mergePayload(orderedBase, reordered, otherOrder).conflicts.includes('/graph/nodes/order'), 'different concurrent reorders cannot silently overwrite each other');

  const uncertain = new Library({ store: new MemoryStore(), api: cloud }); uncertain.online = true;
  await uncertain.openCloud(sharedId);
  const sent = clone(uncertain.current.payload); sent.graph.title = 'Acknowledgement lost';
  await uncertain.save(sent); cloud.loseReply = true;
  await assert.rejects(uncertain.sync(), /Connection lost/);
  const afterSend = clone(sent); afterSend.graph.title = 'Typed after acknowledgement was lost';
  await uncertain.save(afterSend);
  await uncertain.receive(await cloud.request('/documents/' + sharedId));
  assert(!uncertain.current.conflict && uncertain.dirty(), 'receiving our acknowledged pending write preserves later local changes');
  await uncertain.sync();
  assert.equal(cloud.records.get(sharedId).payload.graph.title, 'Typed after acknowledgement was lost');

  const naming = new Library({ store: new MemoryStore(), api: cloud }); naming.online = true;
  await naming.openCloud(sharedId); await naming.rename(sharedId, 'My local name');
  await writer.rename(sharedId, 'Their remote name'); await writer.sync();
  await naming.receive(await cloud.request('/documents/' + sharedId));
  assert(naming.current.conflict && naming.current.title === 'My local name', 'competing renames preserve both choices');
  console.log('PASS three-way sync: automatic name/revision updates, disjoint node edits, same-field conflicts, deletion safety and competing renames');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
