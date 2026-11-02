(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TheoremGraphStorage = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const signature = value => JSON.stringify(value);
  const equal = (a, b) => signature(a) === signature(b);
  const copy = value => value === undefined ? undefined : clone(value);
  const draftKey = item => item.selector === '#graph-title' ? item.selector : item.selector + '|' + (item.context || '');
  // Compare the shared document separately from device-specific editor state.
  function documentContent(payload) {
    if (!payload) return null;
    const graph = clone(payload.graph);
    const clean = graph => {
      if (!graph) return;
      if (graph.view) for (const key of ['selectedId', 'selectedReferenceKeys', 'layoutRunning']) delete graph.view[key];
      for (const node of graph.nodes || []) if (node.childGraph) clean(node.childGraph);
    };
    clean(graph);
    const drafts = (payload.drafts || []).map(item => ({ selector: item.selector, context: item.selector === '#graph-title' ? undefined : item.context, value: item.value, checked: !!item.checked }))
      .sort((a, b) => (a.selector + (a.context || '')).localeCompare(b.selector + (b.context || '')));
    return { graph, drafts };
  }
  function mergeValue(base, local, remote, path = '', conflicts = []) {
    if (equal(local, remote) || equal(remote, base)) return copy(local);
    if (equal(local, base)) return copy(remote);
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    if (object(local) && object(remote) && (object(base) || base === undefined)) {
      const result = {};
      for (const key of new Set([...Object.keys(base || {}), ...Object.keys(local), ...Object.keys(remote)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        const value = mergeValue(base?.[key], local[key], remote[key], `${path}/${key}`, conflicts);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    if ([base, local, remote].every(Array.isArray)) {
      const key = ['id', 'key'].find(key => [base, local, remote].every(list => list.every(item => object(item) && typeof item[key] === 'string')
        && new Set(list.map(item => item[key])).size === list.length));
      if (key) {
        const maps = [base, local, remote].map(list => new Map(list.map(item => [item[key], item])));
        const common = new Set(base.map(item => item[key]).filter(id => maps[1].has(id) && maps[2].has(id)));
        const orders = [base, local, remote].map(list => list.map(item => item[key]).filter(id => common.has(id)));
        const localOrderChanged = !equal(orders[0], orders[1]), remoteOrderChanged = !equal(orders[0], orders[2]);
        if (localOrderChanged && remoteOrderChanged && !equal(orders[1], orders[2])) conflicts.push(`${path}/order`);
        const preferred = localOrderChanged && !remoteOrderChanged ? [local, remote] : [remote, local];
        const result = [];
        for (const id of new Set([...preferred.flatMap(list => list.map(item => item[key])), ...base.map(item => item[key])])) {
          const value = mergeValue(...maps.map(map => map.get(id)), `${path}/${id}`, conflicts);
          if (value !== undefined) result.push(value);
        }
        return result;
      }
    }
    conflicts.push(path || '/');
    return copy(local);
  }
  function mergePayload(base, local, remote) {
    if (equal(documentContent(local), documentContent(base))) return { payload: clone(remote), conflicts: [] };
    if (equal(documentContent(remote), documentContent(base))) return { payload: clone(local), conflicts: [] };
    const conflicts = [];
    const graph = mergeValue(base?.graph, local.graph, remote.graph, '/graph', conflicts);
    const validateLinks = (graph, path = '/graph') => {
      const ids = new Set(['__title__', ...(graph.nodes || []).map(node => node.id)]);
      for (const arrow of graph.arrows || []) if ((arrow.sourceId && !ids.has(arrow.sourceId)) || (arrow.targetId && !ids.has(arrow.targetId))) conflicts.push(`${path}/arrows/${arrow.id}`);
      for (const node of graph.nodes || []) if (node.childGraph) validateLinks(node.childGraph, `${path}/nodes/${node.id}/childGraph`);
    };
    validateLinks(graph);
    const maps = [base, local, remote].map(payload => new Map((payload?.drafts || []).map(item => [draftKey(item), item])));
    const value = item => item && { value: item.value, checked: !!item.checked };
    const drafts = [];
    for (const key of new Set(maps.flatMap(map => [...map.keys()]))) {
      const [before, here, there] = maps.map(map => map.get(key));
      // Missing textbox drafts usually mean a different node was selected or a
      // value was committed; they do not mean the shared field was deleted.
      if (!here) { if (there) drafts.push(clone(there)); continue; }
      if (!there) { if (!equal(value(here), value(before))) drafts.push(clone(here)); continue; }
      const merged = mergeValue(value(before), value(here), value(there), `/drafts/${key}`, conflicts);
      drafts.push(clone(equal(merged, value(here)) ? here : there));
    }
    const payload = { ...clone(local), graph, drafts };
    return { payload: equal(documentContent(payload), documentContent(remote)) ? clone(remote) : payload, conflicts };
  }
  const title = payload => String(payload?.graph?.title || 'Untitled graph');
  // `title` on a storage record is the library name, independent of payload.graph.title.
  const normalizeName = value => {
    const name = String(value).trim();
    if (!name || name.length > 120) throw new Error('Use a saved version name between 1 and 120 characters.');
    return name;
  };
  const dirty = record => !!record && (!!record.pending || signature(record.payload) !== record.syncedPayload
    || record.title !== (record.syncedTitle ?? record.title));
  const conflict = () => Object.assign(new Error('Another tab updated this local graph.'), { status: 409 });
  const summary = record => ({ id: record.id, title: record.title, updatedAt: record.updatedAt,
    cloudRevision: record.cloudRevision, recovered: !!record.recovered, conflict: !!record.conflict,
    dirty: dirty(record) });

  class IndexedStore {
    constructor(name = 'theorem-personal-graphs-v1') { this.name = name; }
    async open() {
      if (!this.database) this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.name, 2);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('graphs')) request.result.createObjectStore('graphs', { keyPath: 'id' });
          const catalog = request.result.createObjectStore('catalog', { keyPath: 'id' });
          const cursor = request.transaction.objectStore('graphs').openCursor();
          cursor.onsuccess = () => {
            if (cursor.result) { catalog.put(summary(cursor.result.value)); cursor.result.continue(); }
          };
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Close older theorem graph tabs and retry.'));
      });
      return this.database;
    }
    async read(id) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const request = db.transaction('graphs').objectStore('graphs').get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    }
    async list() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const request = db.transaction('graphs').objectStore('graphs').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    async summaries() {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const request = db.transaction('catalog').objectStore('catalog').getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    async put(record, expectedVersion = 0) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['graphs', 'catalog'], 'readwrite');
        const store = transaction.objectStore('graphs');
        const read = store.get(record.id);
        let error; let saved;
        read.onsuccess = () => {
          if ((read.result?.localVersion || 0) !== expectedVersion) { error = conflict(); transaction.abort(); return; }
          saved = { ...clone(record), localVersion: expectedVersion + 1 };
          store.put(saved);
          transaction.objectStore('catalog').put(summary(saved));
        };
        transaction.oncomplete = () => resolve(saved);
        transaction.onabort = () => reject(error || transaction.error || new Error('Local save was interrupted.'));
        transaction.onerror = () => { error ||= transaction.error; };
      });
    }
    async remove(id) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['graphs', 'catalog'], 'readwrite');
        transaction.objectStore('graphs').delete(id); transaction.objectStore('catalog').delete(id);
        transaction.oncomplete = resolve;
        transaction.onabort = () => reject(transaction.error || new Error('Could not remove the local graph.'));
      });
    }
  }

  class CloudAPI {
    constructor(base, fetcher = (...args) => fetch(...args)) {
      this.base = base.replace(/\/$/, ''); this.fetcher = fetcher; this.token = '';
      this.tokenKey = 'theorem-session-v2:' + this.base;
      this.identity = null;
      try {
        this.token = sessionStorage.getItem(this.tokenKey) || '';
        if (this.token) this.identity = JSON.parse(sessionStorage.getItem(this.tokenKey + ':identity'));
      } catch { /* Memory-only login still works. */ }
    }
    setToken(token) {
      this.token = token || '';
      if (!this.token) this.identity = null;
      try {
        if (this.token) sessionStorage.setItem(this.tokenKey, this.token);
        else { sessionStorage.removeItem(this.tokenKey); sessionStorage.removeItem(this.tokenKey + ':identity'); }
      } catch { /* Memory-only session. */ }
    }
    async request(path, method = 'GET', body, extraHeaders = {}) {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 15000);
      try {
        const response = await this.fetcher(`${this.base}${path}`, {
          method, credentials: 'omit', cache: 'no-store', signal: abort.signal,
          headers: { 'Content-Type': 'application/json', 'X-Theorem-Request': '1',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...extraHeaders },
          ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Cloud storage did not return a valid response.');
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 401 && path !== '/login') this.setToken('');
          throw Object.assign(new Error(data.error || 'Cloud request failed.'), { status: response.status });
        }
        if (path === '/login') this.setToken(data.token);
        if (path === '/login' || path === '/session') {
          this.identity = { username: data.username, admin: !!data.admin };
          try { sessionStorage.setItem(this.tokenKey + ':identity', JSON.stringify(this.identity)); } catch {}
        }
        if (path === '/logout') this.setToken('');
        return data;
      } finally { clearTimeout(timer); }
    }
  }

  class Library {
    constructor({ store, api = null, uuid = () => crypto.randomUUID(), now = () => Date.now(), onChange = () => {} }) {
      Object.assign(this, { store, api, uuid, now, onChange });
      this.current = null;
      this.opening = null;
      this.sessionId = uuid();
      this.online = false;
      this.queue = Promise.resolve();
      this.syncing = null;
    }
    serial(task) {
      const result = this.queue.then(task);
      this.queue = result.catch(() => {});
      return result;
    }
    emit() { this.onChange(this.current); }
    dirty(record = this.current) { return dirty(record); }
    async write(record, expected = record.localVersion || 0) {
      const saved = await this.store.put(record, expected);
      if (this.current?.id === saved.id) this.current = saved;
      return saved;
    }
    make(payload, name = title(payload)) {
      return { id: this.uuid(), title: name, payload: clone(payload), cloudRevision: 0,
        syncedPayload: null, pending: null, localVersion: 0, updatedAt: this.now(),
        checkpointAt: this.now(), history: [], conflict: false };
    }
    async create(payload, name = title(payload).slice(0, 120).trim() || 'Untitled graph') {
      const normalized = normalizeName(name);
      return this.serial(async () => {
        this.current = await this.store.put(this.make(payload, normalized), 0);
        this.opening = clone(payload); this.emit(); return this.current;
      });
    }
    checkpoint(record, reason) {
      const last = record.history[0];
      if (!last || signature(last.payload) !== signature(record.payload)) {
        record.history.unshift({ id: this.uuid(), title: record.title, updatedAt: record.updatedAt, reason, payload: clone(record.payload) });
        record.history = record.history.slice(0, 50);
      }
      record.checkpointAt = this.now();
    }
    async save(payload, forceCheckpoint = false, checkpointReason = 'Before restore') {
      const id = this.current?.id;
      if (!id) return this.create(payload);
      return this.serial(async () => {
        if (this.current?.id !== id) return;
        if (signature(payload) === signature(this.current.payload) && !forceCheckpoint) return this.current;
        const record = clone(this.current);
        if (!record.history.length || forceCheckpoint || this.now() - record.checkpointAt >= 300000) this.checkpoint(record, forceCheckpoint ? checkpointReason : 'Autosave checkpoint');
        record.payload = clone(payload); record.updatedAt = this.now();
        record.forceCheckpoint ||= forceCheckpoint;
        try { this.current = await this.write(record); }
        catch (error) {
          if (error.status !== 409) throw error;
          // A different tab owns a newer head. Preserve this tab as a new graph.
          const copy = this.make(payload, record.title);
          copy.recovered = true;
          this.current = await this.store.put(copy, 0);
          this.opening = clone(payload);
        }
        this.emit(); return this.current;
      });
    }
    async openLocal(id) {
      return this.serial(async () => {
        const record = await this.store.read(id);
        if (!record) throw new Error('Local graph not found.');
        this.current = record; this.opening = clone(record.payload); this.sessionId = this.uuid();
        this.emit(); return clone(record.payload);
      });
    }
    async openCloud(id, beforeApply = async () => {}) {
      const previousId = this.current?.id;
      const remote = await this.api.request(`/documents/${encodeURIComponent(id)}`);
      await beforeApply();
      if (await this.store.read(id)) await this.receive(remote);
      return this.serial(async () => {
        if (this.current?.id !== previousId) throw new Error('The active graph changed while loading. Open the cloud graph again.');
        const local = await this.store.read(id);
        // A refresh must never discard an unsent edit, even after an uncertain response.
        if (local && (this.dirty(local) || local.cloudRevision >= remote.revision)) {
          this.current = local;
        } else {
          const record = { ...(local || this.make(remote.payload)), id, payload: remote.payload, title: remote.title,
            cloudRevision: remote.revision, updatedAt: remote.updatedAt, syncedPayload: signature(remote.payload), syncedTitle: remote.title, pending: null, conflict: false };
          this.current = await this.store.put(record, local?.localVersion || 0);
        }
        this.opening = clone(this.current.payload); this.sessionId = this.uuid();
        this.emit(); return clone(this.current.payload);
      });
    }
    async useCloudVersion(beforeApply = async () => {}) {
      if (!this.current) return;
      const id = this.current.id;
      const remote = await this.api.request(`/documents/${encodeURIComponent(id)}`);
      await beforeApply();
      return this.serial(async () => {
        if (this.current?.id !== id) return;
        const latest = await this.store.read(id);
        // Keep the displaced local draft as its own recoverable document.
        if (this.dirty(latest)) await this.store.put({ ...this.make(latest.payload, latest.title), recovered: true }, 0);
        this.current = await this.store.put({ ...latest, payload: remote.payload, title: remote.title,
          cloudRevision: remote.revision, updatedAt: remote.updatedAt, syncedPayload: signature(remote.payload), syncedTitle: remote.title,
          pending: null, conflict: false, forceCheckpoint: false }, latest.localVersion);
        this.opening = clone(remote.payload); this.sessionId = this.uuid(); this.emit();
        return clone(remote.payload);
      });
    }
    async receive(remote) {
      return this.serial(async () => {
        const record = await this.store.read(remote.id);
        if (!record || remote.revision <= record.cloudRevision) return { changed: false };
        let base;
        try { base = JSON.parse(record.syncedPayload); } catch { base = null; }
        // A lost acknowledgement can already be present on the server; edits
        // made after that request must be compared against its acknowledged body.
        const acknowledged = record.pending && equal(remote.payload, record.pending.payload)
          && remote.title === record.pending.title;
        if (acknowledged) base = remote.payload;
        const merged = mergePayload(base, record.payload, remote.payload);
        const conflicts = [...merged.conflicts];
        const name = mergeValue(acknowledged ? record.pending.title : record.syncedTitle ?? record.title,
          record.title, remote.title, '/title', conflicts);
        if (conflicts.length) {
          if (!record.conflict) await this.write({ ...record, conflict: true });
          this.emit();
          return { changed: false, conflict: true, conflicts };
        }
        const next = { ...record, payload: merged.payload, title: name, cloudRevision: remote.revision,
          syncedPayload: signature(remote.payload), syncedTitle: remote.title, pending: null, conflict: false,
          updatedAt: this.dirty(record) ? record.updatedAt : remote.updatedAt,
          forceCheckpoint: !!(record.forceCheckpoint || record.pending?.checkpoint) };
        await this.write(next); this.emit();
        return { changed: true, before: record.payload, payload: clone(next.payload) };
      });
    }
    async rename(id, name) {
      const normalized = normalizeName(name);
      // Cache remote-only rows without changing the graph open in the editor.
      if (!await this.store.read(id)) {
        const remote = await this.api.request(`/documents/${encodeURIComponent(id)}`);
        await this.store.put({ ...this.make(remote.payload), id, title: remote.title, payload: remote.payload,
          cloudRevision: remote.revision, updatedAt: remote.updatedAt, syncedPayload: signature(remote.payload), syncedTitle: remote.title }, 0);
      }
      return this.serial(async () => {
        const record = await this.store.read(id);
        if (record.conflict) throw new Error('Resolve this graph’s conflict before renaming it.');
        // Remember the metadata baseline for records cached before names were independent.
        record.syncedTitle ??= record.title;
        record.title = normalized; record.updatedAt = this.now();
        await this.write(record); this.emit(); return clone(record.payload);
      });
    }
    async remove(id) {
      if (this.syncing) await this.syncing;
      return this.serial(async () => {
        const record = await this.store.read(id);
        if (this.online) {
          let remote;
          try { remote = await this.api.request(`/documents/${encodeURIComponent(id)}`); }
          catch (error) { if (error.status !== 404) throw error; }
          if (remote) {
            if (record?.cloudRevision && record.cloudRevision !== remote.revision) throw new Error('This graph changed on another device. Refresh it before deleting.');
            await this.api.request(`/documents/${encodeURIComponent(id)}`, 'DELETE', { baseRevision: remote.revision });
          }
        } else if (record?.cloudRevision) throw new Error('Connect before deleting a cloud graph.');
        await this.store.remove(id);
        if (this.current?.id === id) { this.current = null; this.opening = null; }
        this.emit();
      });
    }
    async sync() {
      if (!this.online || !this.api) return;
      if (this.syncing) return this.syncing;
      this.syncing = this.runSync().finally(() => { this.syncing = null; this.emit(); });
      this.emit(); return this.syncing;
    }
    async runSync() {
      await this.queue;
      // The catalog is small; do not read every graph and its full history on
      // every autosave merely to find the documents with pending changes.
      const list = this.store.summaries ? await this.store.summaries() : (await this.store.list()).map(summary);
      for (const item of list) {
        if (!item.dirty || item.conflict) continue;
        // Two passes drain edits made while the first request was in flight.
        for (let pass = 0; pass < 2; pass++) {
          if (!this.online) return;
          const record = await this.serial(async () => {
            let fresh = await this.store.read(item.id);
            if (!fresh || fresh.conflict || !this.dirty(fresh)) return null;
            if (!fresh.pending) fresh = await this.write({ ...fresh, forceCheckpoint: false, pending: {
              writeId: this.uuid(), sessionId: this.sessionId, baseRevision: fresh.cloudRevision,
              payload: clone(fresh.payload), title: fresh.title, checkpoint: !!fresh.forceCheckpoint
            } });
            return fresh;
          });
          if (!record) break;
          try {
            const acknowledgement = await this.api.request(`/documents/${encodeURIComponent(record.id)}`, 'PUT', record.pending);
            await this.serial(async () => {
              const latest = await this.store.read(record.id);
              if (latest?.pending?.writeId !== record.pending.writeId) return;
              await this.write({ ...latest, cloudRevision: acknowledgement.revision,
                syncedPayload: signature(record.pending.payload), syncedTitle: record.pending.title ?? record.title,
                pending: null, conflict: false });
              this.emit();
            });
          } catch (error) {
            if (error.status === 409) {
              const remote = await this.api.request(`/documents/${encodeURIComponent(record.id)}`);
              const result = await this.receive(remote);
              if (!result.conflict) continue;
              break;
            }
            if (error.status === 410) {
              await this.serial(async () => {
                const latest = await this.store.read(record.id);
                if (latest) await this.write({ ...latest, conflict: true });
                this.emit();
              });
              break;
            }
            if (error.status === 401) this.online = false;
            throw error;
          }
        }
      }
    }
  }
  // Drafts use a separate database and never enter Library's cloud-sync queue.
  class WorkspaceDrafts {
    constructor(store) { this.store = store; this.current = null; this.generation = 0; }
    async save(payload, sourceId, baselineKey, name, sourceSignature = null) {
      const generation = this.generation;
      const record = { ...this.current, id: this.current?.id || crypto.randomUUID(),
        title: name || title(payload), payload: clone(payload), sourceId, baselineKey, sourceSignature,
        updatedAt: Date.now() };
      let saved;
      try { saved = await this.store.put(record, record.localVersion || 0); }
      catch (error) {
        if (error.status !== 409) throw error;
        // Two tabs may restore the same draft. Keep both instead of overwriting.
        saved = await this.store.put({ ...record, id: crypto.randomUUID(), localVersion: 0 }, 0);
      }
      if (generation === this.generation) this.current = saved;
      return saved;
    }
    async open(id) { this.generation++; this.current = await this.store.read(id); return this.current; }
    async list() { return (await (this.store.summaries ? this.store.summaries() : this.store.list())).sort((a, b) => b.updatedAt - a.updatedAt); }
    release() { this.generation++; this.current = null; }
  }
  return { IndexedStore, CloudAPI, Library, WorkspaceDrafts, signature, mergePayload, documentContent };
});
