import { parseRecipe, printRecipe, references, resolveValue, identifier } from './recipe.mjs';
import {editors} from './editors/catalog.mjs';
import {decodeState} from './editors/state.mjs';

export const SCHEMA = 'pure-math-workspace';
export const VERSION = 2;
const clone = value => structuredClone(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const uid = () => globalThis.crypto.randomUUID();
export function newProject(name = 'Untitled') {
  return { schema: SCHEMA, version: VERSION, id: uid(), name, assets: [], computations: [], statements: [], views: [{ id: uid(), assetIds: [], renderer: 'visual', settings: { scale: 1 } }], activeView: 0, compare: false, recipeDraft: '', calculatorSessions: [], activeCalculator: null, modified: new Date().toISOString() };
}
const fail = message => { throw new Error(message); };
function safeTree(value, depth = 0) {
  if (depth > 80) fail('Project nesting exceeds 80 levels');
  if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) fail('Unsafe numeric value: use strings for exact large integers');
  if (!value || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(k)) fail('Reserved property in project');
    safeTree(v, depth + 1);
  }
}
export function validateProject(input, registry) {
  safeTree(input);
  const p = clone(input);
  if(p.schema === SCHEMA && p.version === 1){p.version=2;p.calculatorSessions=[];p.activeCalculator=null;}
  if (p.schema !== SCHEMA || p.version !== VERSION) fail('Unsupported project schema or version');
  if(!Array.isArray(p.calculatorSessions)||p.calculatorSessions.length>100) fail('Invalid calculator sessions');
  const sessionIds=new Set();
  for(const s of p.calculatorSessions){
    if(!s||typeof s.id!=='string'||!s.id||sessionIds.has(s.id)||!editors.some(e=>e.id===s.family)||typeof s.name!=='string'||s.name.length>200||s.version!==1)fail('Invalid calculator session');
    if(s.snapshot!==null){
      const saved=s.snapshot;if(!saved||Array.isArray(saved)||saved.version!==1||!saved.ui||typeof saved.ui!=='object'||Array.isArray(saved.ui)||!saved.storage||typeof saved.storage!=='object')fail('Invalid calculator snapshot');
      if(saved.model!==null)decodeState(saved.model);
      if(saved.ui.controls!==undefined&&(!Array.isArray(saved.ui.controls)||saved.ui.controls.some(c=>!c||typeof c.id!=='string'||typeof c.value!=='string')))fail('Invalid saved controls');
    }
    sessionIds.add(s.id);
  }
  if(p.activeCalculator!==null&&!sessionIds.has(p.activeCalculator))fail('Missing active calculator session');
  if (typeof p.id !== 'string' || typeof p.name !== 'string' || p.name.length > 200) fail('Invalid project identity');
  for (const field of ['assets', 'computations', 'statements', 'views']) if (!Array.isArray(p[field]) || p[field].length > 1000) fail(`Invalid ${field}`);
  const names = new Set(), ids = new Set();
  for (const a of p.assets) {
    if (!a || typeof a.id !== 'string' || ids.has(a.id) || !identifier.test(a.name) || names.has(a.name)) fail('Duplicate or invalid asset identity');
    ids.add(a.id); names.add(a.name);
    if (typeof a.type !== 'string' || !a.data || typeof a.data !== 'object' || !a.context || typeof a.context !== 'object' || !Array.isArray(a.assumptions) || !Array.isArray(a.dependencies) || !Array.isArray(a.history)) fail(`Invalid asset ${a.name}`);
    if (!Number.isSafeInteger(a.revision) || a.revision < 1) fail('Invalid asset revision');
    if (!['current', 'stale'].includes(a.status)) fail('Invalid asset status');
    registry.validateValue?.(a);
    const revisions = new Set();
    for (const h of a.history) {
      if (!Number.isSafeInteger(h.revision) || h.revision < 1 || h.revision >= a.revision || !h.value || revisions.has(h.revision)) fail('Invalid revision history');
      revisions.add(h.revision); registry.validateValue?.(h.value);
    }
  }
  const byId = new Map(p.assets.map(a => [a.id, a]));
  for (const a of p.assets) if (a.dependencies.some(id => !ids.has(id) || id === a.id) || new Set(a.dependencies).size !== a.dependencies.length) fail(`Invalid dependency of ${a.name}`);
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail('Cyclic asset dependencies');
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).dependencies.forEach(visit); visiting.delete(id); visited.add(id);
  }
  ids.forEach(visit);
  const available = new Set();
  const parsed = parseRecipe(printRecipe(p.statements));
  if (parsed.length !== p.assets.length) fail('Each asset must have one recipe statement');
  for (const s of parsed) {
    const op = registry.get(s.operation);
    if (!op || !names.has(s.name)) fail(`Unsupported statement ${s.name}`);
    const min = op.signature.filter(v => !v.endsWith('?')).length;
    if (s.args.length < min || s.args.length > op.signature.length) fail(`Invalid argument count for ${s.operation}`);
    for (const r of references(s.args)) if (!available.has(r)) fail(`Missing or forward reference ${r}`);
    const a = p.assets.find(a => a.name === s.name);
    const dependencyIds = [...new Set(references(s.args))].map(n => p.assets.find(a => a.name === n).id).sort();
    if (!equal([...a.dependencies].sort(), dependencyIds)) fail(`Dependency/recipe mismatch for ${s.name}`);
    available.add(s.name);
  }
  const computationIds = new Set();
  for (const c of p.computations) {
    if (!c || typeof c.id !== 'string' || computationIds.has(c.id) || !ids.has(c.outputId) || !registry.has(c.operation) || c.version !== registry.get(c.operation).version || !Array.isArray(c.inputs) || !Array.isArray(c.parameters) || !['success', 'stale'].includes(c.status)) fail('Invalid computation');
    computationIds.add(c.id);
    for (const r of c.inputs) {
      const a = byId.get(r.id);
      if (!a || (a.revision !== r.revision && !a.history.some(h => h.revision === r.revision))) fail('Missing input revision');
    }
  }
  const viewIds = new Set();
  for (const v of p.views) {
    if (typeof v.id !== 'string' || viewIds.has(v.id) || !Array.isArray(v.assetIds) || v.assetIds.some(id => !ids.has(id)) || !['visual', 'data'].includes(v.renderer) || !v.settings || typeof v.settings !== 'object') fail('Invalid view');
    viewIds.add(v.id);
    if (v.settings.scale !== undefined && (!Number.isFinite(v.settings.scale) || v.settings.scale < 0.25 || v.settings.scale > 4)) fail('Invalid view scale');
  }
  if (!p.views.length) p.views = newProject().views;
  p.activeView = Number.isInteger(p.activeView) && p.activeView >= 0 && p.activeView < p.views.length ? p.activeView : 0;
  p.compare = !!p.compare;
  p.recipeDraft = typeof p.recipeDraft === 'string' ? p.recipeDraft : printRecipe(p.statements);
  return p;
}
function valueOf(a) { return { type: a.type, data: clone(a.data), context: clone(a.context), assumptions: clone(a.assumptions) }; }
function changeAsset(previous, name, value, dependencies) {
  if (!previous) return { id: uid(), name, revision: 1, ...clone(value), dependencies, history: [], status: 'current' };
  const changed = !equal(valueOf(previous), value) || !equal(previous.dependencies, dependencies);
  return { ...clone(previous), ...clone(value), dependencies, status: 'current', revision: previous.revision + (changed ? 1 : 0), history: changed ? [...previous.history, { revision: previous.revision, value: valueOf(previous) }] : clone(previous.history) };
}
export class ProjectStore {
  constructor(registry, executor, project = newProject()) { this.registry = registry; this.executor = executor; this.project = project; this.undoStack = []; this.redoStack = []; this.generation = 0; }
  commit(next) {
    validateProject(next, this.registry);
    this.undoStack.push(clone(this.project)); if (this.undoStack.length > 40) this.undoStack.shift();
    this.redoStack = []; this.project = next; this.project.modified = new Date().toISOString(); this.generation++;
  }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(clone(this.project)); this.project = this.undoStack.pop(); this.generation++; }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(clone(this.project)); this.project = this.redoStack.pop(); this.generation++; }
  async runRecipe(text, { signal, progress = () => {} } = {}) {
    const statements = parseRecipe(text), old = this.project, generation = this.generation;
    const known = new Set();
    for (const s of statements) {
      if (!this.registry.has(s.operation)) throw Object.assign(new Error(`Unknown operation ${s.operation}`), { line: s.line });
      for (const r of references(s.args)) if (!known.has(r)) throw Object.assign(new Error(`Missing or forward reference ${r}`), { line: s.line });
      known.add(s.name);
    }
    const next = { ...clone(old), assets: [], computations: [], statements, recipeDraft: text };
    const byName = new Map();
    for (let i = 0; i < statements.length; i++) {
      const s = statements[i];
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      progress({ index: i, total: statements.length, name: s.name });
      try {
        const dependencies = [...new Set(references(s.args))].map(n => byName.get(n).id);
        const inputs = dependencies.map(id => { const a = next.assets.find(a => a.id === id); return { id, revision: a.revision }; });
        const args = s.args.map(v => resolveValue(v, n => valueOf(byName.get(n))));
        const value = await this.executor(s.operation, args, { signal });
        const a = changeAsset(old.assets.find(a => a.name === s.name), s.name, value, dependencies);
        next.assets.push(a); byName.set(s.name, a);
        if (this.registry.get(s.operation).kind === 'operation' || this.registry.get(s.operation).network) {
          next.computations.push({ id: uid(), operation: s.operation, version: this.registry.get(s.operation).version, inputs, parameters: clone(s.args), outputId: a.id, status: 'success', completed: new Date().toISOString(), provenance: value.context?.origin === 'external' ? 'external-service' : 'workspace-engine' });
        }
      } catch (e) { e.line = s.line; e.statement = s.name; throw e; }
    }
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (generation !== this.generation) throw new Error('Project changed during computation; results were not applied');
    const ids = new Set(next.assets.map(a => a.id));
    next.views.forEach(v => { v.assetIds = v.assetIds.filter(id => ids.has(id)); });
    // Preserve successful previous runs and the exact revisions they used.
    const past = old.computations.filter(c => ids.has(c.outputId) && c.inputs.every(r => ids.has(r.id)));
    next.computations = [...past, ...next.computations].slice(-1000);
    this.commit(next);
    return next;
  }
  async appendStatement(text, { signal } = {}) {
    const statements = parseRecipe(text);
    if (statements.length !== 1) fail('Expected one constructor or operation');
    const s = statements[0], old = this.project, generation = this.generation;
    if (old.assets.some(a => a.name === s.name)) fail('Asset name already exists');
    const op = this.registry.get(s.operation);
    if (!op) fail(`Unknown operation ${s.operation}`);
    const resolve = name => {
      const a = old.assets.find(a => a.name === name);
      if (!a) fail(`Missing input ${name}`);
      if (a.status === 'stale') fail(`Input ${name} is stale; recompute it first`);
      return a;
    };
    const inputs = [...new Set(references(s.args))].map(resolve);
    const value = await this.executor(s.operation,s.args.map(v=>resolveValue(v,n=>valueOf(resolve(n)))),{signal});
    if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
    if (generation !== this.generation) fail('Project changed during computation; results were not applied');
    const next = clone(old), a = changeAsset(undefined,s.name,value,inputs.map(a=>a.id));
    next.assets.push(a); next.statements.push(s);
    if(op.kind === 'operation' || op.network) next.computations.push({id:uid(),operation:s.operation,version:op.version,inputs:inputs.map(a=>({id:a.id,revision:a.revision})),parameters:clone(s.args),outputId:a.id,status:'success',completed:new Date().toISOString(),provenance:value.context?.origin==='external'?'external-service':'workspace-engine'});
    // Keep unexecuted text intact; adding an asset must not discard a draft.
    next.recipeDraft = `${old.recipeDraft.trimEnd()}${old.recipeDraft.trim()?'\n':''}${printRecipe(statements)}`;
    next.views[next.activeView].assetIds.push(a.id);
    this.commit(next);
    return a;
  }
  async editSource(id, args, { signal } = {}) {
    const old = this.project.assets.find(a => a.id === id);
    if (!old) fail('Unknown asset');
    const statement = this.project.statements.find(s => s.name === old.name);
    if (this.registry.get(statement.operation)?.kind !== 'constructor') fail('Edit derived inputs in the recipe');
    const generation = this.generation;
    const resolve = name => { const a = this.project.assets.find(a => a.name === name); if (!a || a.status === 'stale') fail('Missing or stale input'); return valueOf(a); };
    const value = await this.executor(statement.operation, args.map(v => resolveValue(v, resolve)), { signal });
    if (signal?.aborted || generation !== this.generation) fail('Edit cancelled or project changed');
    const next = clone(this.project);
    const deps = [...new Set(references(args))].map(n => next.assets.find(a => a.name === n)?.id);
    const changed = changeAsset(old, old.name, value, deps);
    next.assets[next.assets.findIndex(a => a.id === id)] = changed;
    next.statements.find(s => s.name === old.name).args = clone(args);
    const stale = new Set([id]);
    if (changed.revision !== old.revision) {
      let updated = true;
      while (updated) {
        updated = false;
        for (const a of next.assets) if (!stale.has(a.id) && a.dependencies.some(d => stale.has(d))) { a.status = 'stale'; stale.add(a.id); updated = true; }
      }
      for (const c of next.computations) if (stale.has(c.outputId)) c.status = 'stale';
    }
    next.recipeDraft = printRecipe(next.statements); this.commit(next);
  }
  deleteAsset(id) {
    const p = clone(this.project), a = p.assets.find(a => a.id === id);
    if (!a) return;
    if (p.assets.some(other => other.dependencies.includes(id))) fail('Remove dependent assets or reassign their inputs first');
    p.assets = p.assets.filter(a => a.id !== id); p.statements = p.statements.filter(s => s.name !== a.name);
    p.computations = p.computations.filter(c => c.outputId !== id && !c.inputs.some(r => r.id === id));
    p.views.forEach(v => { v.assetIds = v.assetIds.filter(x => x !== id); });
    p.recipeDraft = printRecipe(p.statements); this.commit(p);
  }
  updateView(id, changes) { const p = clone(this.project); Object.assign(p.views.find(v => v.id === id), changes); this.commit(p); }
  addView() { const p = clone(this.project); p.views.push({ id: uid(), assetIds: [], renderer: 'visual', settings: { scale: 1 } }); p.activeView = p.views.length - 1; this.commit(p); }
  exportSelection(ids) {
    const p = clone(this.project), needed = new Set(ids);
    const add = id => { const a = p.assets.find(a => a.id === id); if (!a) fail('Unknown selected asset'); for (const d of a.dependencies) if (!needed.has(d)) { needed.add(d); add(d); } };
    ids.forEach(add);
    p.assets = p.assets.filter(a => needed.has(a.id)); const names = new Set(p.assets.map(a => a.name));
    p.statements = p.statements.filter(s => names.has(s.name)); p.computations = p.computations.filter(c => needed.has(c.outputId));
    p.views.forEach(v => { v.assetIds = v.assetIds.filter(id => needed.has(id)); }); p.recipeDraft = printRecipe(p.statements);
    // Whole legacy files may contain unselected objects. Only whole-project
    // exports retain those originals; selection exports contain the native closure.
    delete p.legacyImports;
    p.calculatorSessions=[];p.activeCalculator=null;
    return p;
  }
  importProject(raw, merge = false) {
    const imported = validateProject(raw, this.registry);
    if (!merge) { this.commit(imported); return; }
    const p = clone(this.project), ids = new Map(imported.assets.map(a => [a.id, uid()])), names = new Map(), taken = new Set(p.assets.map(a => a.name));
    for (const a of imported.assets) { let name = a.name, n = 2; while (taken.has(name)) name = `${a.name}_${n++}`; names.set(a.name, name); taken.add(name); }
    const remap = v => {
      if (Array.isArray(v)) return v.map(remap);
      if (v && typeof v === 'object') {
        if ('ref' in v) return { ref: names.get(v.ref) };
        if ('record' in v) return { record: v.record.map(([k, x]) => [k, remap(x)]) };
      }
      return v;
    };
    p.assets.push(...imported.assets.map(a => ({ ...a, id: ids.get(a.id), name: names.get(a.name), dependencies: a.dependencies.map(id => ids.get(id)) })));
    p.statements.push(...imported.statements.map(s => ({ ...s, name: names.get(s.name), args: s.args.map(remap) })));
    p.computations.push(...imported.computations.map(c => ({ ...c, id: uid(), outputId: ids.get(c.outputId), inputs: c.inputs.map(r => ({ ...r, id: ids.get(r.id) })), parameters: c.parameters.map(remap) })));
    p.views.push(...imported.views.map(v => ({ ...v, id: uid(), assetIds: v.assetIds.map(id => ids.get(id)) })));
    p.legacyImports = [...(p.legacyImports || []), ...(imported.legacyImports || [])];
    p.calculatorSessions.push(...imported.calculatorSessions.map(s=>({...s,id:uid()})));
    p.recipeDraft = printRecipe(p.statements); this.commit(p);
  }
}
