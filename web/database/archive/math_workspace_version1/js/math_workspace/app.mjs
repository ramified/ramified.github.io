import { operations } from './kernel.mjs';
import { ProjectStore, newProject, validateProject } from './project.mjs';
import { workerExecutor } from './executor.mjs';
import { parseRecipe, printRecipe, printValue, literal } from './recipe.mjs';
import { loadProject, saveProject } from './persistence.mjs';
import { tk, translate, setLocale, getLocale } from './locales.mjs';
import { renderAsset, el, code } from './views.mjs';
import { families, typeFamily, buildCatalog } from './catalog.mjs';
import { detectImport, matrixCAS } from './formats.mjs';
import { examples } from './examples.mjs';
import nativeEditors from 'workspace:editors';
import {editors,editorName} from './editors/catalog.mjs';

export async function startWorkspace(){
const $ = id => document.getElementById(id);
const store = new ProjectStore(operations, workerExecutor);
const mountedEditors=new Map();let calculatorSaveTimer;
function snapshotEditors(){for(const [id,entry] of mountedEditors){const session=store.project.calculatorSessions.find(s=>s.id===id);if(session&&entry.snapshot===session.snapshot){session.snapshot=entry.editor.capture();entry.snapshot=session.snapshot;}}}
function calculatorChanged(){clearTimeout(calculatorSaveTimer);calculatorSaveTimer=setTimeout(()=>{try{snapshotEditors();persist();}catch(e){report(e);}},450);}
function drawCalculators(){
  const p=store.project,active=p.activeCalculator;
  for(const [id,entry] of mountedEditors)if(!p.calculatorSessions.some(s=>s.id===id)){entry.editor.dispose();mountedEditors.delete(id);}
  const bar=$('calculator-tabs');bar.replaceChildren();
  const assetTab=button('assetWorkspace',()=>{snapshotEditors();p.activeCalculator=null;render();persist();});assetTab.setAttribute('role','tab');assetTab.setAttribute('aria-selected',String(active===null));bar.append(assetTab);
  for(const session of p.calculatorSessions){
    const tab=el('button',session.name);tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(active===session.id));tab.onclick=()=>{snapshotEditors();p.activeCalculator=session.id;render();persist();};bar.append(tab);
  }
  document.body.classList.toggle('calculator-active',!!active);$('calculator-area').hidden=!active;
  for(const [id,entry] of mountedEditors)if(id!==active)entry.editor.deactivate();
  if(!active)return;
  const session=p.calculatorSessions.find(s=>s.id===active);let entry=mountedEditors.get(active);
  if(!entry){
    const factory=nativeEditors[session.family];if(!factory)throw new Error(`Unknown calculator ${session.family}`);
    const host=el('section',undefined,'native-calculator');host.dataset.sessionId=active;$('calculator-content').append(host);
    let editor;try{editor=factory.mount(host,{id:active,snapshot:session.snapshot,onChange:calculatorChanged,onError:report});}catch(error){host.remove();throw error;}
    entry={editor,snapshot:session.snapshot};mountedEditors.set(active,entry);
  }else if(entry.snapshot!==session.snapshot&&session.snapshot){entry.editor.restore(session.snapshot);entry.snapshot=session.snapshot;}
  entry.editor.activate();$('calculator-title').textContent=session.name;
}
function openCalculator(family){
  snapshotEditors();const e=editors.find(e=>e.id===family);if(!e)throw new Error('Unknown calculator');
  const p=structuredClone(store.project),name=editorName(e,getLocale()),n=p.calculatorSessions.filter(s=>s.family===family).length+1;
  const session={id:crypto.randomUUID(),family,version:1,name:n>1?`${name} ${n}`:name,snapshot:null};p.calculatorSessions.push(session);p.activeCalculator=session.id;commit(p);
}
let selected = null, controller = null, editing = null, saveTimer, renderEpoch = 0;
const current = () => store.project.assets.find(a => a.id === selected);
const status = (key, params) => { $('status').textContent = tk(key, params); };
function report(error) {
  if (error.name === 'AbortError') { status('cancelled'); return; }
  status(error.line ? 'failed' : 'validationFailed', { line: error.line || '?' });
  $('diagnostics').hidden = false; $('diagnostics').open = true;
  $('error-detail').textContent = `${error.statement ? `${error.statement}: ` : ''}${error.message}`;
  const dialog = document.querySelector('dialog[open]');
  if (dialog) { dialog.querySelector('.dialog-error')?.remove(); const message = el('div', tk('validationFailed'), 'dialog-error'); message.setAttribute('role', 'alert'); message.append(code(error.message)); dialog.append(message); }
}
async function persist() {
  snapshotEditors();
  $('save-status').textContent = tk('saving');
  try { await saveProject(store.project); $('save-status').textContent = tk('saved'); }
  catch (e) { $('save-status').textContent = tk('storageError'); }
}
function busy(value) {
  document.querySelectorAll('button,input,select,textarea').forEach(n => { n.disabled = value; });
  $('cancel').disabled = !value;
  if (!value) { $('undo').disabled = !store.undoStack.length; $('redo').disabled = !store.redoStack.length; }
}
async function action(work) {
  if (controller) return;
  controller = new AbortController(); busy(true); $('diagnostics').hidden = true;
  document.querySelectorAll('.dialog-error').forEach(n => n.remove());
  try { await work(controller.signal); await persist(); }
  catch (e) { report(e); }
  finally { controller = null; await render(); busy(false); }
}
function requireAppliedRecipe() {
  if (!store.project.assets.length) return;
  let draft;
  try { draft = printRecipe(parseRecipe(store.project.recipeDraft)); } catch { throw new Error(tk('draftConflict')); }
  if (draft !== printRecipe(store.project.statements)) throw new Error(tk('draftConflict'));
}
function commit(next) { store.commit(next); render(); persist(); }
function showAsset(id, viewId = store.project.views[store.project.activeView].id) {
  const v = store.project.views.find(v => v.id === viewId);
  if (!v.assetIds.includes(id)) store.updateView(v.id, { assetIds: [...v.assetIds, id] });
  selected = id; render(); persist();
}
function button(key, handler, className) { const n = el('button', tk(key), className); n.type = 'button'; n.onclick = handler; return n; }
function uniqueName(base = 'result') { let name = base, n = 2; while (store.project.assets.some(a => a.name === name)) name = `${base}${n++}`; return name; }
function drawLibrary() {
  const root = $('asset-list'); root.replaceChildren(); const query = $('search').value.toLowerCase();
  const assets = store.project.assets.filter(a => `${a.name} ${a.type} ${tk(typeFamily[a.type] || 'context')}`.toLowerCase().includes(query));
  if (!assets.length) root.append(el('p', tk('emptyLibrary'), 'hint'));
  const groups = new Map();
  for (const a of assets) { const family = typeFamily[a.type] || operations.get(store.project.statements.find(s => s.name === a.name)?.operation)?.family || 'context'; if (!groups.has(family)) groups.set(family, []); groups.get(family).push(a); }
  for (const [family, items] of groups) {
    const group = el('section', undefined, 'asset-group'); group.append(el('h3', tk(family)));
    for (const a of items) {
      const b = el('button', undefined, `asset-item${selected === a.id ? ' selected' : ''}`); b.type = 'button'; b.draggable = true;
      const icon = el('span', ({ partition: '▦', matrix: '▤', rootSystem: '○', strand: '⋈', category: '→', surface: '◇' })[a.type] || '·', 'asset-icon'); icon.setAttribute('aria-hidden', 'true');
      const name = el('span', a.name); name.append(el('small', a.type, 'asset-type')); name.lang = 'en'; name.dataset.i18nIgnore = ''; b.append(icon, name);
      if (a.status === 'stale') { const dot = el('span', '●', 'stale-dot'); dot.title = tk('stale'); b.append(dot); }
      b.setAttribute('aria-pressed', String(a.id === selected)); b.onclick = () => { selected = a.id; render(); }; b.ondblclick = () => showAsset(a.id);
      b.ondragstart = event => { event.dataTransfer.setData('application/x-math-asset', a.id); event.dataTransfer.effectAllowed = 'copy'; };
      group.append(b);
    }
    root.append(group);
  }
}
function drawInspector() {
  const root = $('inspector'); root.replaceChildren(); const a = current();
  if (!a) { root.append(el('p', tk('noSelection'), 'hint')); return; }
  root.append(el('div', a.name, 'asset-name'), el('span', tk('revision', { n: a.revision }), 'badge'), document.createTextNode(' '), el('span', tk(a.status), `badge ${a.status}`));
  const actions = el('div', undefined, 'actions'); actions.append(button('addToView', () => showAsset(a.id)), button('edit', () => openEditor('edit')), button('delete', () => { try { store.deleteAsset(a.id); selected = null; render(); persist(); } catch (e) { report(e); } })); root.append(actions);
  root.append(el('h3', tk('depends')), el('p', a.dependencies.map(id => store.project.assets.find(x => x.id === id)?.name).join(', ') || '∅'));
  root.append(el('h3', tk('operations')));
  const ops = [...operations.values()].filter(o => o.accepts?.includes(a.type));
  if (ops.length) {
    const select = el('select'); select.setAttribute('aria-label', tk('operations'));
    ops.forEach(o => { const n = el('option', o.name); n.value = o.name; select.append(n); }); select.lang = 'en'; select.dataset.i18nIgnore = '';
    root.append(select, button('useOperation', () => openEditor('operation', select.value), 'wide'));
  } else root.append(el('p', tk('noOperation'), 'hint'));
  root.append(el('h3', tk('assumptions')), code(JSON.stringify({ ...a.context, assumptions: a.assumptions }, null, 2)));
  if (a.context.arithmetic === 'legacy-number') root.append(el('p', tk('legacy'), 'hint'));
  root.append(el('h3', tk('properties')), code(JSON.stringify(a.data, null, 2)));
}
async function drawCanvases(epoch) {
  const root = $('canvases'); root.replaceChildren(); root.classList.toggle('comparison', store.project.compare && store.project.views.length > 1);
  const p = store.project, active = p.views[p.activeView];
  const views = p.compare && p.views.length > 1 ? [active, p.views[(p.activeView + 1) % p.views.length]] : [active];
  for (const v of views) {
    const pane = el('section', undefined, 'canvas-pane'); pane.setAttribute('aria-label', tk('view', { n: p.views.indexOf(v) + 1 }));
    pane.ondragover = e => { e.preventDefault(); pane.classList.add('drag-over'); };
    pane.ondragleave = () => pane.classList.remove('drag-over');
    pane.ondrop = e => { e.preventDefault(); pane.classList.remove('drag-over'); const id = e.dataTransfer.getData('application/x-math-asset'); if (p.assets.some(a => a.id === id)) showAsset(id, v.id); };
    const controls = el('div', undefined, 'canvas-controls'), select = el('select'); select.setAttribute('aria-label', tk('viewType'));
    for (const mode of ['visual', 'data']) { const o = el('option', tk(mode)); o.value = mode; select.append(o); } select.value = v.renderer;
    select.onchange = () => { store.updateView(v.id, { renderer: select.value }); render(); persist(); };
    const scale = el('input'); scale.type = 'range'; scale.min = '.5'; scale.max = '2'; scale.step = '.1'; scale.value = v.settings.scale || 1; scale.setAttribute('aria-label', tk('scale'));
    scale.onchange = () => { store.updateView(v.id, { settings: { ...v.settings, scale: Number(scale.value) } }); render(); persist(); };
    controls.append(el('span', tk('view', { n: p.views.indexOf(v) + 1 })), select, scale);
    if (p.views.length > 1) controls.append(button('closeView', () => { const next = structuredClone(p); next.views = next.views.filter(view => view.id !== v.id); next.activeView = Math.min(next.activeView, next.views.length - 1); commit(next); }));
    pane.append(controls); root.append(pane);
    if (!v.assetIds.length) {
      const empty = el('div', undefined, 'empty-state'); empty.append(el('h2', tk('emptyView')), el('p', tk('emptyHint'), 'hint'));
      const choices = el('div', undefined, 'example-grid'); examples.slice(0, 3).forEach(ex => choices.append(button(ex.key, () => openExample(ex)))); empty.append(choices); pane.append(empty);
    }
    for (const id of v.assetIds) {
      const a = p.assets.find(a => a.id === id); if (!a) continue;
      const article = el('article', undefined, 'asset-view'), heading = el('div', undefined, 'asset-view-heading');
      heading.append(el('h3', a.name)); if (a.status === 'stale') heading.append(el('span', tk('stale'), 'badge stale'));
      heading.append(button('removeView', () => { store.updateView(v.id, { assetIds: v.assetIds.filter(x => x !== id) }); render(); persist(); })); article.append(heading);
      const content = el('div'); content.style.zoom = v.settings.scale || 1; article.append(content); pane.append(article);
      article.onclick = () => { if (selected !== id) { selected = id; drawLibrary(); drawInspector(); } };
      const isSource = operations.get(p.statements.find(s => s.name === a.name)?.operation)?.kind === 'constructor';
      try { await renderAsset(a, content, { mode: v.renderer, edit: a.type === 'partition' && isSource ? rows => action(async signal => { requireAppliedRecipe(); await store.editSource(id, [literal(rows)], { signal }); status('changed'); }) : undefined }); }
      catch (e) { content.replaceChildren(code(e.message)); }
      if (epoch !== renderEpoch) return;
    }
  }
}
async function render() {
  try {
  const epoch = ++renderEpoch, p = store.project;
  $('project-name').value = p.name; $('recipe').value = p.recipeDraft; $('compare').checked = p.compare;
  if (!p.assets.some(a => a.id === selected)) selected = null;
  drawLibrary(); drawInspector();
  const tabs = $('view-tabs'); tabs.replaceChildren();
  p.views.forEach((v, i) => { const b = el('button', tk('view', { n: i + 1 })); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(p.activeView === i)); b.onclick = () => { const next = structuredClone(p); next.activeView = i; commit(next); }; tabs.append(b); });
  $('undo').disabled = !store.undoStack.length; $('redo').disabled = !store.redoStack.length;
  drawCalculators();
  await drawCanvases(epoch);
  } catch(error) { report(error); }
}
function run(text, showNames) {
  return action(async signal => {
    await store.runRecipe(text, { signal, progress: p => status('running', { ...p, index: p.index + 1 }) });
    const view = store.project.views[store.project.activeView];
    if (showNames || !view.assetIds.length) {
      const ids = (showNames || store.project.assets.slice(0, 3).map(a => a.name)).map(name => store.project.assets.find(a => a.name === name)?.id).filter(Boolean);
      store.updateView(view.id, { assetIds: ids }); selected = ids.at(-1) || null;
    }
    status('complete', { count: store.project.assets.length });
  });
}
function openExample(ex) {
  // Examples are merged, so exploring an example cannot delete the user's work.
  return action(async signal => {
    requireAppliedRecipe();
    const temp = new ProjectStore(operations, workerExecutor); await temp.runRecipe(ex.source, { signal });
    const ids = ex.show.map(name => temp.project.assets.find(a => a.name === name)?.id).filter(Boolean);
    temp.updateView(temp.project.views[0].id, { assetIds: ids });
    const oldLength = store.project.views.length;
    store.importProject(temp.project, store.project.assets.length > 0);
    store.project.activeView = store.project.assets.length === temp.project.assets.length ? 0 : oldLength;
    selected = store.project.views[store.project.activeView].assetIds[0] || null;
    status('complete', { count: store.project.assets.length });
  });
}
function fillArguments() {
  const op = operations.get($('operation-select').value), sample = parseRecipe(op.example)[0];
  if (editing?.mode === 'operation' && current()) sample.args[0] = { ref: current().name };
  $('signature').textContent = `${op.name}(${op.signature.join(', ')})`;
  $('operation-note').hidden=!op.network;$('operation-note').textContent=op.network?tk('externalComputation'):'';
  $('arguments').value = sample.args.map(printValue).join(', ');
  $('asset-name').value = uniqueName(op.kind === 'constructor' ? sample.name : 'result');
}
function openEditor(mode, operation) {
  if (controller) return;
  const a = current();
  if (mode !== 'create' && !a) { status('selectFirst'); return; }
  const select = $('operation-select'); select.replaceChildren();
  editing = { mode, id: a?.id };
  const statement = mode === 'edit' ? store.project.statements.find(s => s.name === a.name) : null;
  if (statement && operations.get(statement.operation).kind !== 'constructor') { status('sourceEditOnly'); $('recipe').focus(); return; }
  const ops = [...operations.values()].filter(o => mode === 'create' ? o.kind === 'constructor' : mode === 'edit' ? o.name === statement.operation : o.accepts?.includes(a.type));
  ops.forEach(op => { const n = el('option', `${tk(op.family)} · ${op.name}`); n.value = op.name; select.append(n); });
  if (operation) select.value = operation;
  $('editor-title').textContent = tk(mode === 'create' ? 'create' : mode === 'edit' ? 'edit' : 'useOperation');
  $('editor-submit').textContent = tk(mode === 'create' ? 'createObject' : 'apply');
  fillArguments();
  if (statement) { $('asset-name').value = a.name; $('arguments').value = statement.args.map(printValue).join(', '); }
  $('asset-name').readOnly = mode === 'edit'; select.disabled = mode === 'edit';
  const editor = $('editor-dialog');
  if (typeof editor.showModal === 'function') editor.showModal();
  else { editor.setAttribute('open', ''); editor.classList.add('dialog-fallback'); }
}
$('operation-select').onchange = fillArguments;
$('editor-form').onsubmit = event => {
  event.preventDefault();
  const mode = editing.mode, id = editing.id, name = $('asset-name').value, operation = $('operation-select').value;
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) { report(new Error('Asset name must start with a letter and contain only letters, numbers, or underscores')); return; }
  if (!name) { report(new Error('Asset name is required')); return; }
  if (!operation || !operations.has(operation)) { report(new Error('Choose a valid constructor')); return; }
  const text = `${name} = ${operation}(${$('arguments').value})`;
  action(async signal => {
    const statements = parseRecipe(text); if (statements.length !== 1) throw new Error('Expected one constructor or operation');
    if (mode === 'edit') { requireAppliedRecipe(); await store.editSource(id, statements[0].args, { signal }); status('changed'); }
    else {
      const a = await store.appendStatement(text, { signal }); selected = a.id;
      status('complete', { count: store.project.assets.length });
    }
    const editor = $('editor-dialog');
    if (typeof editor.close === 'function') editor.close();
    else { editor.removeAttribute('open'); editor.classList.remove('dialog-fallback'); }
  });
};
$('run').onclick = () => run($('recipe').value);
$('cancel').onclick = () => controller?.abort();
$('restore-recipe').onclick = () => { const p = structuredClone(store.project); p.recipeDraft = printRecipe(p.statements); commit(p); };
$('create').onclick = () => openEditor('create');
$('open-calculator').onclick=()=>{const select=$('calculator-choice');select.replaceChildren();for(const e of editors){const option=el('option',editorName(e,getLocale()));option.value=e.id;select.append(option);}$('calculator-dialog').showModal();};
$('calculator-open').onclick=()=>{try{openCalculator($('calculator-choice').value);$('calculator-dialog').close();}catch(e){report(e);}};
$('calculator-close').onclick=()=>{snapshotEditors();const p=structuredClone(store.project);p.calculatorSessions=p.calculatorSessions.filter(s=>s.id!==p.activeCalculator);p.activeCalculator=p.calculatorSessions.at(-1)?.id||null;commit(p);};
$('add-view').onclick = () => { store.addView(); render(); persist(); };
$('compare').onchange = () => { const p = structuredClone(store.project); p.compare = $('compare').checked; commit(p); };
$('search').oninput = drawLibrary;
$('undo').onclick = () => { snapshotEditors(); store.undo(); render(); persist(); };
$('redo').onclick = () => { snapshotEditors(); store.redo(); render(); persist(); };
$('project-name').onchange = () => { const p = structuredClone(store.project); p.name = $('project-name').value || tk('untitled'); commit(p); };
$('new-project').onclick = () => { if ((store.project.assets.length || store.project.calculatorSessions.length) && !confirm(tk('confirmNew'))) return; snapshotEditors();store.commit(newProject(tk('untitled'))); selected = null; render(); persist(); };
$('recipe').oninput = () => { store.project.recipeDraft = $('recipe').value; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); };
$('recipe').onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run($('recipe').value); } };
document.querySelectorAll('[data-close-dialog]').forEach(b => { b.onclick = () => b.closest('dialog').close(); });

let exportValue = '', exportExtension = 'json';
function refreshExport() {
  snapshotEditors();
  const kind = $('export-kind').value;
  try {
    exportExtension = kind === 'recipe' ? 'math' : kind === 'sage' ? 'sage' : kind === 'macaulay2' ? 'm2' : 'json';
    if (kind === 'project') exportValue = JSON.stringify(store.project, null, 2);
    else if (kind === 'selection') { if (!current()) throw new Error(tk('selectFirst')); exportValue = JSON.stringify(store.exportSelection([selected]), null, 2); }
    else if (kind === 'recipe') exportValue = printRecipe(store.project.statements);
    else exportValue = matrixCAS(current(), kind);
    $('export-text').value = exportValue; $('download-export').disabled = false; $('copy-export').disabled = false;
  } catch (e) { $('export-text').value = e.message; $('download-export').disabled = true; $('copy-export').disabled = true; }
}
$('export-project').onclick = () => { refreshExport(); $('export-dialog').showModal(); };
$('export-kind').onchange = refreshExport;
$('copy-export').onclick = async () => { try { await navigator.clipboard.writeText(exportValue); status('copied'); } catch (e) { report(e); } };
$('download-export').onclick = () => { const blob = new Blob([exportValue], { type: exportExtension === 'json' ? 'application/json' : 'text/plain' }), url = URL.createObjectURL(blob); const a = el('a'); a.href = url; a.download = `math-workspace.${exportExtension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('import-project').onclick = () => $('import-dialog').showModal();
$('import-file').onchange = async () => { const file = $('import-file').files[0]; if (!file) return; if (file.size > 20 * 1024 * 1024) { report(new Error('Import exceeds 20 MB')); return; } $('import-text').value = await file.text(); };
$('apply-import').onclick = () => action(async signal => {
  const imported = detectImport($('import-text').value), merge = $('import-mode').value === 'merge';
  if (imported.kind === 'project') store.importProject(imported.value, merge);
  else { const temp = new ProjectStore(operations, workerExecutor); await temp.runRecipe(imported.value, { signal }); if(imported.legacy) temp.project.legacyImports=[imported.legacy]; store.importProject(temp.project, merge); }
  selected = null; $('import-dialog').close(); status(imported.notice||'imported');
});
$('show-coverage').onclick = () => {
  const root = $('coverage-content'); root.replaceChildren(el('p', tk('coverageSummary', { count: operations.size })));
  const table = el('table'), header = el('tr'); header.append(el('th', tk('library')), el('th', tk('native')), el('th', tk('source'))); table.append(header);
  for (const f of buildCatalog(operations).families) {
    const row = el('tr'), ops = el('td', [...f.constructors, ...f.workingOperations].map(o => o.name).join(', ') || '—', 'coverage-ops'), linkCell = el('td'), a = el('a', tk('source')); a.href = f.sources.find(s => s.endsWith('.html')); linkCell.append(a); row.append(el('td', tk(f.id)), ops, linkCell); table.append(row);
  }
  root.append(table); const link = el('a', tk('inventoryLink')); link.href = 'assets/math_workspace_catalog.json'; root.append(link); $('coverage-dialog').showModal();
};
function language(value) {
  setLocale(value); document.documentElement.lang = getLocale(); translate(); $('language').value = getLocale();
  const select = $('examples'); select.replaceChildren(); const first = el('option', tk('chooseExample')); first.value = ''; select.append(first);
  examples.forEach((ex, i) => { const o = el('option', tk(ex.key)); o.value = String(i); select.append(o); });
  status('ready'); render();
  try { localStorage.setItem('ramified.site.language', getLocale()); } catch {}
}
$('examples').onchange = () => { if ($('examples').value !== '') openExample(examples[Number($('examples').value)]); $('examples').value = ''; };
$('language').onchange = () => language($('language').value);
try { setLocale(localStorage.getItem('ramified.site.language') || 'en'); } catch {}
let restoreError,storageUnavailable=false,saved;
try { saved = await loadProject(); } catch { storageUnavailable=true; }
try { if(saved)store.project=validateProject(saved,operations); }catch(e){restoreError=e;}
language(getLocale());
busy(false);$('startup-notice').hidden=true;
if(storageUnavailable)$('save-status').textContent=tk('storageError');
if (restoreError) report(restoreError);
// Read-only inspection hook for automated browser acceptance checks.
globalThis.MathWorkspace = Object.freeze({ snapshot: () => structuredClone(store.project), operations: () => [...operations.keys()] });
}
