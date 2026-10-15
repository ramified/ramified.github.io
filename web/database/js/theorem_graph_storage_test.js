const assert = require('node:assert/strict');
const { Library } = require('./theorem_graph_storage.js');
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
    this.records.set(id, { id, title: body.payload.graph.title, payload: clone(body.payload), revision: body.baseRevision + 1, writeId: body.writeId, updatedAt: Date.now() });
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
  api.hold = null; release(); await syncing;
  assert.equal(api.records.get(id).payload.graph.title, 'Edit while saving');
  assert(!reloaded.dirty());

  api.records.get(id).revision++;
  api.records.get(id).payload = payload('Another device');
  await reloaded.save(payload('My unsynced work'));
  await reloaded.sync(); assert(reloaded.current.conflict);
  const calls = api.calls.length; await reloaded.sync(); assert.equal(api.calls.length, calls);
  const restored = await reloaded.useCloudVersion();
  assert.equal(restored.graph.title, 'Another device');
  assert((await store.list()).some(record => record.recovered && record.payload.graph.title === 'My unsynced work'));

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
  await management.create(original); await management.sync();
  const firstId = management.current.id;
  await management.create(payload('Keep this open')); await management.sync();
  const currentId = management.current.id;
  await management.rename(firstId, '  Renamed graph  '); await management.sync();
  assert.equal(management.current.id, currentId, 'renaming another row keeps the editor on its current graph');
  const renamed = await management.store.read(firstId);
  assert.equal(renamed.payload.graph.title, 'Renamed graph');
  assert.equal(renamed.payload.graph.titleNode.label, 'Renamed graph');
  assert.deepEqual(renamed.payload.drafts, [{ selector: '#node-label', value: 'Node draft ' }]);
  assert(renamed.history.some(entry => entry.payload.graph.title === 'Before rename'));
  assert.equal(management.api.records.get(firstId).title, 'Renamed graph');
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
  console.log('PASS theorem storage: rename checkpoints and drafts, non-active rows, stale/offline delete rejection, local/cloud removal');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
