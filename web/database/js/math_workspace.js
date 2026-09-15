(function () {
  'use strict';

  const calculators = [
    ['young', 'Young diagrams', 'young'],
    ['double-young', 'Double Young diagrams', 'double-young'],
    ['slicing', 'Higher-dimensional slicing', 'slice'],
    ['dynkin', 'Dynkin diagrams', 'dynkin'],
    ['strands', 'Strands', 'strand'],
    ['matrices', 'Matrices', 'matrix'],
    ['sheaf-complexes', 'Sheaf complexes', 'complex'],
    ['mosaic', 'Mosaic', 'mosaic'],
    ['categories', 'Categories', 'category'],
    ['places', 'Place ramification', 'ramification']
  ].map(([id, label, nativeId]) => ({ id, label, nativeId, kind: 'calculator' }));
  const assetsDefinition = { id: 'assets', label: 'Assets', kind: 'assets' };
  const byId = new Map([...calculators, assetsDefinition].map((item) => [item.id, item]));
  const canvases = new Map(), sessions = new Map(), liveCards = new Map();
  const paneCanvases = { primary: '', secondary: '' };
  let activeCanvasId = '', focusedPane = 'primary', splitView = false, inspectorSourceId = '';
  const ASSET_LAYOUTS = ['icons', 'list', 'details', 'tiles', 'content'];
  const ASSET_KINDS = ['variety', 'sheaf', 'map'];
  const assetState = {
    ready: true, editorCard: null, editorRecord: null, editorMode: 'create', editorRef: null, view: null,
    snapshot: { revision: 0, assets: [], capabilities: { variety: true, sheaf: false, map: false } },
    layout: 'icons', sort: 'creation', direction: 'asc', selected: new Set(), anchor: '', metadata: new Map(),
    creationCounter: 0, nextObjectId: 0, renameKey: '', marquee: null,
    cards: { input: true, importExport: true }
  };
  const $ = (selector) => document.querySelector(selector);
  const assetKey = (asset) => `${asset?.kind || ''}:${asset?.id || ''}`;
  const assetRef = (asset) => ({ kind: asset.kind, id: asset.id });

  function status(message, kind = '') {
    const node = $('#workspace-status');
    node.textContent = message || '';
    node.dataset.state = kind;
  }

  function makeNativeCalculator(calculator) {
    const library = window.MathWorkspaceNativeEditors;
    const factory = library?.factories?.[calculator.nativeId];
    if (!factory?.mount) throw new Error(`The native ${calculator.label} editor is unavailable.`);
    const host = document.createElement('section'), inspectorHost = document.createElement('section');
    host.className = 'workspace-native-calculator'; host.dataset.nativeCalculator = calculator.nativeId;
    inspectorHost.className = 'workspace-native-inspector'; inspectorHost.dataset.nativeInspector = calculator.id; inspectorHost.hidden = true;
    const editor = factory.mount(host, {
      id: `workspace-${calculator.id}`,
      inspectorHost,
      onChange: () => { if (calculator.id === activeCanvasId) updateImportExport(); },
      onError: (error) => status(error?.message || String(error), 'error')
    });
    $('#workspace-canvas-parking').appendChild(host); $('#workspace-cards').appendChild(inspectorHost);
    editor.setCanvasActive?.(false); editor.setInspectorActive?.(false);
    return { host, inspectorHost, editor };
  }

  function ensureCalculatorSession(definition) {
    let session = sessions.get(definition.id);
    if (!session) { const created = makeNativeCalculator(definition); session = { kind: 'calculator', definition, ...created }; sessions.set(definition.id, session); }
    return session;
  }

  function renderInspector() {
    sessions.forEach((session, id) => session.editor?.setInspectorActive?.(id === inspectorSourceId));
    const assetsActive = inspectorSourceId === 'assets';
    $('#workspace-io-card').hidden = !assetsActive || !assetState.cards.importExport;
    if (assetState.editorCard) assetState.editorCard.hidden = !assetsActive || !assetState.cards.input;
    $('#workspace-add-card').setAttribute('aria-expanded', String(!$('#workspace-card-picker').hidden));
  }

  function selectInspectorSource(id) {
    const definition = byId.get(id); if (!definition) return;
    if (definition.kind === 'calculator') ensureCalculatorSession(definition);
    inspectorSourceId = id; renderInspector(); updateImportExport(); renderCardPicker();
  }

  function openCanvas(id) {
    const definition = byId.get(id);
    if (!definition) return;
    if (!canvases.has(id)) {
      if (definition.kind === 'assets') {
        canvases.set(id, { kind: 'assets', definition, node: ensureAssetsView() });
        ensureAssetsEditor(false);
      } else {
        try {
          const session = ensureCalculatorSession(definition);
          canvases.set(id, { kind: 'calculator', definition, node: session.host, editor: session.editor, ready: true });
        } catch (error) {
          status(error?.message || String(error), 'error');
          return;
        }
      }
    }
    if (!inspectorSourceId) selectInspectorSource(id);
    selectCanvasTab(id);
  }

  const otherPane = (name) => name === 'primary' ? 'secondary' : 'primary';
  const openedCanvasIds = () => Array.from(canvases.keys());
  function selectCanvasTab(id) {
    if (!canvases.has(id)) return;
    const other = otherPane(focusedPane);
    if (splitView && paneCanvases[other] === id) {
      const current = paneCanvases[focusedPane]; paneCanvases[focusedPane] = id; paneCanvases[other] = current;
    } else {
      paneCanvases[focusedPane] = id;
      if (!splitView) paneCanvases.secondary = '';
    }
    activeCanvasId = paneCanvases[focusedPane];
    renderCanvasView(); updateImportExport();
  }
  function focusCanvasPane(name) {
    if (!paneCanvases[name]) return;
    focusedPane = name; activeCanvasId = paneCanvases[name]; renderCanvasView(); updateImportExport();
  }
  function setSplitView(enabled) {
    const ids = openedCanvasIds();
    if (enabled && ids.length < 2) return;
    splitView = !!enabled;
    if (splitView) {
      const other = otherPane(focusedPane);
      if (!paneCanvases[other] || paneCanvases[other] === paneCanvases[focusedPane]) paneCanvases[other] = ids.find((id) => id !== paneCanvases[focusedPane]) || '';
    } else {
      paneCanvases.secondary = ''; focusedPane = 'primary'; activeCanvasId = paneCanvases.primary;
    }
    renderCanvasView(); updateImportExport();
  }
  function closeCanvas(id) {
    const canvas = canvases.get(id);
    if (!canvas) return;
    if (canvas.kind === 'calculator') {
      $('#workspace-canvas-parking').appendChild(canvas.node); canvas.node.hidden = true; canvas.editor?.setCanvasActive?.(false);
    } else {
      $('#workspace-canvas-parking').appendChild(canvas.node); canvas.node.hidden = true;
    }
    canvases.delete(id);
    const ids = openedCanvasIds();
    ['primary', 'secondary'].forEach((name) => {
      if (paneCanvases[name] === id) paneCanvases[name] = ids.find((candidate) => candidate !== paneCanvases[otherPane(name)]) || '';
    });
    if (splitView && (!paneCanvases.primary || !paneCanvases.secondary)) splitView = false;
    if (!splitView) {
      paneCanvases.primary = paneCanvases.primary || paneCanvases.secondary || ids[0] || '';
      paneCanvases.secondary = ''; focusedPane = 'primary';
    } else if (!paneCanvases[focusedPane]) focusedPane = paneCanvases.primary ? 'primary' : 'secondary';
    activeCanvasId = paneCanvases[focusedPane] || '';
    renderCanvasView(); updateImportExport();
  }

  function renderCanvasTabs() {
    const host = $('#workspace-canvas-tabs'); host.replaceChildren();
    canvases.forEach((entry, id) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', className: `workspace-canvas-tab${id === activeCanvasId ? ' active' : ''}`, textContent: entry.definition.label });
      button.dataset.canvasTab = id; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(id === activeCanvasId));
      button.addEventListener('click', () => selectCanvasTab(id));
      const close = Object.assign(document.createElement('button'), { type: 'button', className: 'workspace-canvas-tab-close', textContent: '×', title: `Close ${entry.definition.label}` });
      close.setAttribute('aria-label', close.title); close.addEventListener('click', (event) => { event.stopPropagation(); closeCanvas(id); });
      const tab = Object.assign(document.createElement('div'), { className: 'workspace-canvas-tab-group' }); tab.append(button, close); host.appendChild(tab);
    });
  }

  function renderCanvasView() {
    const panes = $('#workspace-canvas-panes'), primary = $('#workspace-canvas-pane-primary'), secondary = $('#workspace-canvas-pane-secondary');
    panes.dataset.split = String(splitView); secondary.hidden = !splitView;
    [primary, secondary].forEach((pane) => pane.classList.toggle('focused', pane.dataset.pane === focusedPane));
    canvases.forEach((entry, id) => {
      const paneName = id === paneCanvases.primary ? 'primary' : (splitView && id === paneCanvases.secondary ? 'secondary' : '');
      if (paneName) {
        const slot = document.querySelector(`#workspace-canvas-pane-${paneName} .workspace-canvas-pane-slot`);
        slot.querySelector('.workspace-canvas-empty')?.remove();
        if (entry.node.parentElement !== slot) slot.appendChild(entry.node);
        entry.node.hidden = false;
        entry.editor?.setCanvasActive?.(true);
      } else {
        if (entry.node.parentElement !== $('#workspace-canvas-parking')) $('#workspace-canvas-parking').appendChild(entry.node);
        entry.node.hidden = true;
        entry.editor?.setCanvasActive?.(false);
      }
    });
    [primary, secondary].forEach((pane) => {
      const slot = pane.querySelector('.workspace-canvas-pane-slot'), id = paneCanvases[pane.dataset.pane];
      pane.classList.toggle('workspace-canvas-pane-empty', !id);
      if (!id) slot.replaceChildren(Object.assign(document.createElement('p'), { className: 'workspace-canvas-empty', textContent: 'Open a view to begin.' }));
    });
    $('#workspace-canvas-name').textContent = activeCanvasId ? byId.get(activeCanvasId).label : 'Choose a view';
    const split = $('#workspace-split-view'); split.disabled = canvases.size < 2; split.textContent = splitView ? 'single view' : 'split view'; split.setAttribute('aria-pressed', String(splitView));
    renderCanvasTabs(); renderInspector();
  }

  function availableCardsFor(sourceId) {
    if (sourceId === 'assets') {
      ensureAssetsEditor(false);
      return [
        { key: 'input', label: 'Assets Input', available: true, visible: !!assetState.cards.input },
        { key: 'importExport', label: 'Import / Export (session-only)', available: true, visible: !!assetState.cards.importExport }
      ];
    }
    const definition = byId.get(sourceId);
    if (!definition || definition.kind !== 'calculator') return [];
    return ensureCalculatorSession(definition).editor.listCards?.() || [];
  }

  function setCardVisibility(sourceId, key, visible) {
    if (sourceId === 'assets') {
      assetState.cards[key] = !!visible;
      if (key === 'input' && visible) ensureAssetsEditor(false);
      renderInspector(); return;
    }
    const definition = byId.get(sourceId);
    if (definition?.kind === 'calculator') ensureCalculatorSession(definition).editor.setCardVisible?.(key, visible);
    renderInspector(); renderCardPicker();
  }

  function renderCardPicker() {
    const source = $('#workspace-card-source'), options = $('#workspace-card-options');
    if (!source || !options) return;
    const preferred = inspectorSourceId || activeCanvasId || 'assets';
    source.replaceChildren(new Option('Assets', 'assets'), ...calculators.map((calculator) => new Option(calculator.label, calculator.id)));
    source.value = preferred;
    const cards = availableCardsFor(preferred); options.replaceChildren();
    cards.forEach((card) => {
      const row = Object.assign(document.createElement('label'), { className: 'workspace-card-option' });
      const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!card.visible, disabled: !card.available });
      check.addEventListener('change', () => setCardVisibility(preferred, card.key, check.checked));
      row.append(check, document.createTextNode(card.available ? card.label : `${card.label} — unavailable for the current selection`)); options.appendChild(row);
    });
    if (preferred === 'assets') renderInspector();
  }

  function closeCardPicker() {
    const picker = $('#workspace-card-picker'); if (picker.hidden) return false;
    picker.hidden = true; $('#workspace-add-card').setAttribute('aria-expanded', 'false'); return true;
  }

  function openCardPicker() {
    const sourceId = inspectorSourceId || activeCanvasId || 'assets'; selectInspectorSource(sourceId);
    const picker = $('#workspace-card-picker'), button = $('#workspace-add-card'), rect = button.getBoundingClientRect();
    picker.hidden = false; picker.style.left = `${Math.max(8, Math.min(rect.right - 310, window.innerWidth - 318))}px`; picker.style.top = `${Math.min(rect.bottom + 7, window.innerHeight - 120)}px`;
    button.setAttribute('aria-expanded', 'true'); $('#workspace-card-source').focus();
  }

  function ensureAssetsView() {
    if (assetState.view) return assetState.view;
    const view = document.createElement('section');
    view.className = 'workspace-assets-view'; view.tabIndex = 0; view.setAttribute('aria-label', 'Assets explorer');
    view.innerHTML = `<span class="workspace-assets-count" data-assets-count aria-live="polite"></span>
      <div class="workspace-assets-content" data-assets-content role="listbox" aria-label="Mathematical assets" aria-multiselectable="true"></div>`;
    const content = view.querySelector('[data-assets-content]');
    content.addEventListener('contextmenu', handleAssetsContextMenu); content.addEventListener('pointerdown', beginAssetMarquee);
    view.addEventListener('keydown', handleAssetKeydown);
    assetState.view = view;
    renderAssets();
    return view;
  }

  function ensureAssetsEditor(visible) {
    if (assetState.editorCard) { if (visible) assetState.editorCard.hidden = false; return assetState.editorRecord; }
    const identity = 'assets::input', card = document.createElement('section');
    card.className = 'card workspace-live-card workspace-assets-input-card workspace-assets-inspector-card'; card.dataset.workspaceCard = identity; card.dataset.workspaceLabel = 'Assets · Input'; card.hidden = !visible;
    card.innerHTML = `<div class="card-head" role="button" tabindex="0" aria-expanded="true"><span class="drag-handle" aria-hidden="true">⋮⋮</span><span class="card-head-label">Input</span><em class="toggle-icon">▾</em></div>
      <form class="card-body workspace-assets-native-editor" data-assets-editor novalidate>
        <div class="workspace-assets-editor-row"><label>Mode<select data-assets-mode><option value="create">Create</option><option value="modify">Modify</option></select></label><label>Object<select data-assets-kind><option value="variety">Variety</option><option value="sheaf">Sheaf</option><option value="map">Map</option></select></label></div>
        <label>Name<input data-assets-name type="text" value="X" maxlength="80" spellcheck="false"></label>
        <label>Type<select data-assets-subtype></select></label>
        <div data-assets-fields></div>
        <div class="workspace-assets-editor-actions"><button class="btn" type="submit" data-assets-save>add</button><button class="btn btn-ghost" type="button" data-assets-delete hidden>delete</button></div>
        <p class="workspace-status" data-assets-editor-status role="status" aria-live="polite"></p>
      </form>`;
    const form = card.querySelector('[data-assets-editor]');
    card.querySelector('.card-head').addEventListener('click', () => { const collapsed = card.classList.toggle('collapsed'); card.querySelector('.card-head').setAttribute('aria-expanded', String(!collapsed)); });
    form.querySelector('[data-assets-kind]').addEventListener('change', () => { assetState.editorRef = null; renderAssetsEditor(); });
    form.querySelector('[data-assets-subtype]').addEventListener('change', renderAssetsEditorFields);
    form.querySelector('[data-assets-mode]').addEventListener('change', (event) => { if (event.target.value === 'create') { assetState.editorMode = 'create'; assetState.editorRef = null; renderAssetsEditor(); } });
    form.addEventListener('submit', saveAssetsEditor);
    form.querySelector('[data-assets-delete]').addEventListener('click', () => { if (assetState.editorRef) deleteAssets([assetState.editorRef]); });
    $('#workspace-cards').appendChild(card); liveCards.set(identity, card);
    assetState.editorCard = card; assetState.editorRecord = { card };
    renderAssetsEditor();
    return assetState.editorRecord;
  }

  const ASSET_SUBTYPES = {
    variety: [['abstract', 'Abstract variety'], ['curve', 'Curve'], ['symmetric-product-curve', 'Symmetric product of a curve'], ['abelian', 'Abelian variety'], ['ppav-moduli', 'Moduli of ppav'], ['point', 'Point'], ['projective', 'Projective space'], ['grassmannian', 'Grassmannian'], ['complete-intersection', 'Complete intersection'], ['product', 'Product of varieties']],
    sheaf: [['abstract', 'Abstract sheaf'], ['locally-free', 'Locally free sheaf'], ['structure', 'Structure sheaf'], ['tangent', 'Tangent sheaf'], ['cotangent', 'Cotangent sheaf'], ['canonical', 'Canonical sheaf'], ['twist', 'Twist'], ['divisor-line', 'Divisor line bundle'], ['universal-bundle', 'Universal bundle'], ['direct-sum', 'Direct sum'], ['self-direct-sum', 'Self direct sum'], ['self-tensor-product', 'Self tensor product'], ['dual', 'Dual sheaf'], ['internal-hom', 'Internal Hom'], ['ideal-sheaf', 'Ideal sheaf'], ['normal-bundle', 'Normal bundle'], ['conormal-bundle', 'Conormal bundle'], ['relative-tangent', 'Relative tangent'], ['relative-cotangent', 'Relative cotangent'], ['tensor', 'Tensor product'], ['schur', 'Schur functor'], ['map-operation', 'Pullback / pushforward']],
    map: [['ordinary', 'Map of varieties'], ['sheaf', 'Map of sheaves'], ['abel-jacobi', 'Abel–Jacobi map'], ['composition', 'Composition of maps']]
  };
  const plainAssetName = (value) => String(value || '').replace(/\\(?:mathcal|mathbf|mathrm|operatorname)\s*\{([^}]*)\}/g, '$1').replace(/[{}$\\]/g, '').replace(/[_^]/g, ' ').replace(/\s+/g, ' ').trim();
  const canonicalAssetName = (value) => plainAssetName(value).toLocaleLowerCase().replace(/\s+/g, '');
  const localAssetSnapshot = () => ({ revision: assetState.snapshot.revision, assets: assetState.snapshot.assets.map((asset) => ({ ...asset, dependencies: (asset.dependencies || []).map((ref) => ({ ...ref })), data: { ...(asset.data || {}) } })), capabilities: { variety: true, sheaf: assetState.snapshot.assets.some((asset) => asset.kind === 'variety'), map: assetState.snapshot.assets.some((asset) => asset.kind === 'variety') } });
  const editorForm = () => assetState.editorCard?.querySelector('[data-assets-editor]');
  const fieldHtml = (label, name, value = '', type = 'text') => `<label>${label}<input data-assets-field="${name}" type="${type}" value="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></label>`;
  function referenceOptions(kind, selected = '') {
    return assetState.snapshot.assets.filter((asset) => !kind || asset.kind === kind).map((asset) => `<option value="${assetKey(asset)}"${assetKey(asset) === selected ? ' selected' : ''}>${asset.plainName || asset.name}</option>`).join('');
  }
  function renderAssetsEditor() {
    const form = editorForm(); if (!form) return;
    form.querySelector('[data-assets-editor-status]').textContent = '';
    const record = assetState.editorRef ? assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(assetState.editorRef)) : null;
    assetState.editorMode = record ? 'modify' : 'create';
    const kind = record?.kind || form.querySelector('[data-assets-kind]').value || 'variety';
    const subtype = record?.type || ASSET_SUBTYPES[kind][0][0];
    form.querySelector('[data-assets-mode]').value = assetState.editorMode;
    form.querySelector('[data-assets-kind]').value = kind; form.querySelector('[data-assets-kind]').disabled = !!record;
    form.querySelector('[data-assets-name]').value = record?.name || (kind === 'variety' ? 'X' : kind === 'sheaf' ? '\\mathcal{E}' : 'f');
    const subtypeSelect = form.querySelector('[data-assets-subtype]'); subtypeSelect.replaceChildren(...ASSET_SUBTYPES[kind].map(([value, label]) => new Option(label, value))); subtypeSelect.value = subtype;
    form.querySelector('[data-assets-save]').textContent = record ? 'save' : 'add'; form.querySelector('[data-assets-delete]').hidden = !record;
    renderAssetsEditorFields();
  }
  function renderAssetsEditorFields() {
    const form = editorForm(); if (!form) return;
    const kind = form.querySelector('[data-assets-kind]').value, type = form.querySelector('[data-assets-subtype]').value;
    const record = assetState.editorRef ? assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(assetState.editorRef)) : null;
    const data = record?.data || {}, fields = form.querySelector('[data-assets-fields]'); let html = '';
    if (kind === 'variety') {
      if (type !== 'point') html += fieldHtml('Dimension', 'dimension', data.dimension ?? (type === 'curve' ? 1 : 3), 'number');
      if (['curve', 'symmetric-product-curve', 'ppav-moduli'].includes(type)) html += fieldHtml('Genus', 'genus', data.genus ?? 2, 'number');
      if (type === 'symmetric-product-curve') html += fieldHtml('Symmetric power m', 'power', data.power ?? 3, 'number');
      if (type === 'grassmannian') html += fieldHtml('r', 'r', data.r ?? 2, 'number') + fieldHtml('n', 'n', data.n ?? 4, 'number');
      if (type === 'complete-intersection') html += fieldHtml('Ambient dimension', 'ambientDimension', data.ambientDimension ?? 4, 'number') + fieldHtml('Degrees', 'degrees', data.degrees ?? '2, 3');
      if (type === 'product') html += `<label>First factor<select data-assets-field="first">${referenceOptions('variety', data.first)}</select></label><label>Second factor<select data-assets-field="second">${referenceOptions('variety', data.second)}</select></label>`;
    } else if (kind === 'sheaf') {
      html += `<label>Base variety<select data-assets-field="base">${referenceOptions('variety', data.base)}</select></label>`;
      if (['abstract', 'locally-free'].includes(type)) html += fieldHtml('Rank', 'rank', data.rank ?? 1, 'number');
      if (type === 'twist') html += fieldHtml('Twist r', 'twist', data.twist ?? 1, 'number');
      if (['direct-sum', 'tensor', 'internal-hom'].includes(type)) html += `<label>First sheaf<select data-assets-field="first">${referenceOptions('sheaf', data.first)}</select></label><label>Second sheaf<select data-assets-field="second">${referenceOptions('sheaf', data.second)}</select></label>`;
      if (['dual', 'self-direct-sum', 'self-tensor-product', 'schur'].includes(type)) html += `<label>Parent sheaf<select data-assets-field="parent">${referenceOptions('sheaf', data.parent)}</select></label>`;
      if (type === 'schur') html += fieldHtml('Partition', 'partition', data.partition ?? '2,1');
    } else {
      const endpointKind = type === 'sheaf' ? 'sheaf' : type === 'composition' ? 'map' : 'variety';
      html += `<label>${type === 'composition' ? 'First map' : 'Domain'}<select data-assets-field="domain">${referenceOptions(endpointKind, data.domain)}</select></label><label>${type === 'composition' ? 'Second map' : 'Codomain'}<select data-assets-field="codomain">${referenceOptions(endpointKind, data.codomain)}</select></label>`;
    }
    fields.innerHTML = html;
  }
  function assetEditorData() {
    const form = editorForm(), data = {};
    form.querySelectorAll('[data-assets-field]').forEach((field) => { data[field.dataset.assetsField] = field.value; });
    return data;
  }
  function assetDependencies(kind, type, data) {
    const keys = kind === 'sheaf' ? ['base', 'first', 'second', 'parent'] : kind === 'map' ? ['domain', 'codomain'] : type === 'product' ? ['first', 'second'] : [];
    return [...new Set(keys.map((key) => data[key]).filter(Boolean))].map((key) => { const [dependencyKind, id] = key.split(':'); return { kind: dependencyKind, id }; });
  }
  function assetDefinitionFor(kind, type, data) {
    if (kind === 'variety') {
      if (type === 'projective') return `Projective space of dimension ${data.dimension || 0}`;
      if (type === 'grassmannian') return `Gr(${data.r || '?'}, ${data.n || '?'})`;
      if (type === 'complete-intersection') return `Complete intersection of degrees ${data.degrees || '—'} in ℙ^${data.ambientDimension || '?'}`;
      if (type === 'curve') return `Curve of genus ${data.genus || '?'}`;
      return `${ASSET_SUBTYPES.variety.find(([value]) => value === type)?.[1] || 'Variety'} · dimension ${type === 'point' ? 0 : data.dimension || '?'}`;
    }
    if (kind === 'sheaf') return `${ASSET_SUBTYPES.sheaf.find(([value]) => value === type)?.[1] || 'Sheaf'} on ${data.base ? data.base.split(':')[1] : 'a variety'}`;
    return `${ASSET_SUBTYPES.map.find(([value]) => value === type)?.[1] || 'Map'}: ${data.domain ? data.domain.split(':')[1] : '?'} → ${data.codomain ? data.codomain.split(':')[1] : '?'}`;
  }
  function saveAssetsEditor(event) {
    event.preventDefault(); const form = editorForm(), kind = form.querySelector('[data-assets-kind]').value, type = form.querySelector('[data-assets-subtype]').value, name = form.querySelector('[data-assets-name]').value.trim();
    const message = form.querySelector('[data-assets-editor-status]');
    try {
      if (!name) throw new Error('An asset name cannot be empty.');
      const currentKey = assetState.editorRef ? assetKey(assetState.editorRef) : '';
      if (assetState.snapshot.assets.some((asset) => assetKey(asset) !== currentKey && canonicalAssetName(asset.name) === canonicalAssetName(name))) throw new Error('Another asset already has that name.');
      const data = assetEditorData(), dependencies = assetDependencies(kind, type, data), prefix = kind === 'variety' ? 'X' : kind === 'sheaf' ? 'E' : 'M';
      let record = currentKey ? assetState.snapshot.assets.find((asset) => assetKey(asset) === currentKey) : null;
      if (!record) { record = { id: `${prefix}${++assetState.nextObjectId}`, kind }; assetState.snapshot.assets.push(record); }
      Object.assign(record, { name, plainName: plainAssetName(name), type, typeLabel: ASSET_SUBTYPES[kind].find(([value]) => value === type)?.[1] || kind, definition: assetDefinitionFor(kind, type, data), dependencies, data });
      record.fingerprint = JSON.stringify({ name, type, data, dependencies }); assetState.snapshot.revision += 1; assetState.snapshot.capabilities = localAssetSnapshot().capabilities;
      assetState.editorRef = { kind: record.kind, id: record.id }; assetState.selected = new Set([assetKey(record)]); assetState.anchor = assetKey(record);
      applyAssetSnapshot(localAssetSnapshot()); renderAssetsEditor(); message.textContent = 'Asset saved.'; status('Asset saved.', 'success');
    } catch (error) { message.textContent = error.message; status(error.message, 'error'); }
  }

  async function assetRequest(action, payload = {}) {
    if (action === 'snapshot') return localAssetSnapshot();
    if (action === 'prepare-create') { ensureAssetsEditor(false); assetState.editorMode = 'create'; assetState.editorRef = null; editorForm().querySelector('[data-assets-kind]').value = payload.kind; renderAssetsEditor(); return localAssetSnapshot(); }
    if (action === 'select-for-modify') { ensureAssetsEditor(false); const record = assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(payload.ref)); if (!record) throw new Error('The selected asset no longer exists.'); assetState.editorRef = { kind: record.kind, id: record.id }; renderAssetsEditor(); return localAssetSnapshot(); }
    if (action === 'rename') { const record = assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(payload.ref)); const name = String(payload.name || '').trim(); if (!record) throw new Error('The selected asset no longer exists.'); if (!name) throw new Error('An asset name cannot be empty.'); if (assetState.snapshot.assets.some((asset) => asset !== record && canonicalAssetName(asset.name) === canonicalAssetName(name))) throw new Error('Another asset already has that name.'); record.name = name; record.plainName = plainAssetName(name); record.fingerprint = JSON.stringify({ name, type: record.type, data: record.data, dependencies: record.dependencies }); assetState.snapshot.revision += 1; if (assetKey(assetState.editorRef) === assetKey(record)) renderAssetsEditor(); return localAssetSnapshot(); }
    if (action === 'plan-delete') {
      const selectedKeys = new Set((payload.refs || []).map(assetKey)), deleting = new Set(selectedKeys); let changed = true;
      while (changed) { changed = false; assetState.snapshot.assets.forEach((asset) => { if (!deleting.has(assetKey(asset)) && (asset.dependencies || []).some((ref) => deleting.has(assetKey(ref)))) { deleting.add(assetKey(asset)); changed = true; } }); }
      const selected = assetState.snapshot.assets.filter((asset) => selectedKeys.has(assetKey(asset))), dependents = assetState.snapshot.assets.filter((asset) => deleting.has(assetKey(asset)) && !selectedKeys.has(assetKey(asset)));
      return { revision: assetState.snapshot.revision, selected, dependents, all: [...selected, ...dependents] };
    }
    if (action === 'commit-delete') { if (Number(payload.revision) !== assetState.snapshot.revision) throw new Error('Assets changed while deletion was being confirmed. Review the deletion again.'); const plan = await assetRequest('plan-delete', payload), deleting = new Set(plan.all.map(assetKey)); assetState.snapshot.assets = assetState.snapshot.assets.filter((asset) => !deleting.has(assetKey(asset))); assetState.snapshot.revision += 1; if (deleting.has(assetKey(assetState.editorRef))) { assetState.editorRef = null; renderAssetsEditor(); } return localAssetSnapshot(); }
    throw new Error('Unknown Assets operation.');
  }

  function applyAssetSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.assets)) return;
    const now = Date.now(), present = new Set();
    snapshot.assets.forEach((asset) => {
      const key = assetKey(asset); present.add(key); const previous = assetState.metadata.get(key);
      if (!previous) assetState.metadata.set(key, { createdAt: now, modifiedAt: now, order: ++assetState.creationCounter, fingerprint: asset.fingerprint });
      else if (previous.fingerprint !== asset.fingerprint) Object.assign(previous, { modifiedAt: now, fingerprint: asset.fingerprint });
    });
    Array.from(assetState.metadata.keys()).forEach((key) => { if (!present.has(key)) assetState.metadata.delete(key); });
    assetState.selected = new Set(Array.from(assetState.selected).filter((key) => present.has(key)));
    if (!present.has(assetState.anchor)) assetState.anchor = '';
    if (!present.has(assetState.renameKey)) assetState.renameKey = '';
    assetState.snapshot = snapshot; renderAssets();
  }

  function orderedAssets() {
    const entries = assetState.snapshot.assets.slice(), direction = assetState.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    entries.sort((left, right) => {
      const lm = assetState.metadata.get(assetKey(left)) || {}, rm = assetState.metadata.get(assetKey(right)) || {};
      let compared = 0;
      if (assetState.sort === 'name') compared = collator.compare(left.plainName || left.name, right.plainName || right.name);
      else if (assetState.sort === 'type') compared = collator.compare(left.typeLabel, right.typeLabel);
      else if (assetState.sort === 'modified') compared = (lm.modifiedAt || 0) - (rm.modifiedAt || 0);
      else compared = (lm.order || 0) - (rm.order || 0);
      return compared ? compared * direction : (lm.order || 0) - (rm.order || 0);
    });
    return entries;
  }

  const assetIcon = (kind) => kind === 'variety' ? '𝕍' : kind === 'sheaf' ? '𝒽' : '→';
  const formatAssetTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  function createAssetItem(asset) {
    const key = assetKey(asset), meta = assetState.metadata.get(key) || {}, item = document.createElement('div');
    item.className = `workspace-asset-item workspace-asset-${asset.kind}`; item.dataset.assetKey = key; item.dataset.assetKind = asset.kind; item.dataset.assetId = asset.id;
    item.setAttribute('role', assetState.layout === 'details' ? 'row' : 'option'); item.setAttribute('aria-selected', String(assetState.selected.has(key)));
    item.setAttribute('aria-label', `${asset.plainName || asset.name}, ${asset.typeLabel}`); item.tabIndex = assetState.selected.has(key) ? 0 : -1;
    const icon = Object.assign(document.createElement('span'), { className: 'workspace-asset-icon', textContent: assetIcon(asset.kind) }); icon.setAttribute('aria-hidden', 'true');
    const name = Object.assign(document.createElement('span'), { className: 'workspace-asset-name', title: asset.name, textContent: `\\(${asset.name}\\)` });
    const type = Object.assign(document.createElement('span'), { className: 'workspace-asset-type', textContent: asset.typeLabel });
    const definition = Object.assign(document.createElement('span'), { className: 'workspace-asset-definition', textContent: asset.definition || asset.typeLabel });
    const modified = Object.assign(document.createElement('time'), { className: 'workspace-asset-modified', textContent: formatAssetTime(meta.modifiedAt) });
    if (assetState.renameKey === key) {
      const input = Object.assign(document.createElement('input'), { className: 'workspace-asset-rename', value: asset.name }); input.setAttribute('aria-label', `Rename ${asset.plainName || asset.name}`);
      input.addEventListener('click', (event) => event.stopPropagation()); input.addEventListener('keydown', handleRenameKeydown); input.addEventListener('blur', () => commitAssetRename(key, input.value)); name.replaceChildren(input);
    }
    item.append(icon, name, type, definition, modified);
    item.addEventListener('click', handleAssetClick);
    item.addEventListener('dblclick', handleAssetDoubleClick);
    return item;
  }

  function renderAssets() {
    if (!assetState.view) return;
    const content = assetState.view.querySelector('[data-assets-content]'), entries = orderedAssets();
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    content.dataset.layout = assetState.layout; content.replaceChildren();
    if (!assetState.ready) { content.appendChild(Object.assign(document.createElement('p'), { className: 'workspace-assets-empty', textContent: 'Loading Assets…' })); return; }
    if (!entries.length) {
      const empty = Object.assign(document.createElement('div'), { className: 'workspace-assets-empty' }); empty.innerHTML = '<strong>This Assets view is empty.</strong><span>Right-click here to create a variety.</span>'; content.appendChild(empty); return;
    }
    if (assetState.layout === 'details') {
      const header = Object.assign(document.createElement('div'), { className: 'workspace-assets-details-header' }); header.setAttribute('role', 'row');
      ['Name', 'Type', 'Definition', 'Date modified'].forEach((label) => header.appendChild(Object.assign(document.createElement('span'), { textContent: label }))); content.appendChild(header);
    }
    entries.forEach((asset) => content.appendChild(createAssetItem(asset)));
    const rename = content.querySelector('.workspace-asset-rename'); if (rename) { rename.focus(); rename.select(); }
    if (!assetState.renameKey && window.MathJax?.typesetPromise) { window.MathJax.typesetClear?.([content]); window.MathJax.typesetPromise([content]).catch(() => {}); }
  }

  function selectAssetKey(key, event = {}) {
    const keys = orderedAssets().map(assetKey), additive = !!(event.ctrlKey || event.metaKey);
    if (event.shiftKey && assetState.anchor && keys.includes(assetState.anchor)) {
      const start = keys.indexOf(assetState.anchor), end = keys.indexOf(key), range = keys.slice(Math.min(start, end), Math.max(start, end) + 1);
      assetState.selected = additive ? new Set([...assetState.selected, ...range]) : new Set(range);
    } else if (additive) {
      if (assetState.selected.has(key)) assetState.selected.delete(key); else assetState.selected.add(key);
      assetState.anchor = key;
    } else {
      assetState.selected = new Set([key]); assetState.anchor = key;
    }
    assetState.renameKey = ''; syncAssetSelectionDom();
  }

  function syncAssetSelectionDom() {
    if (!assetState.view) return;
    const entries = orderedAssets();
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => {
      const selected = assetState.selected.has(item.dataset.assetKey);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  }

  function handleAssetClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (item && !event.target.closest('input')) selectAssetKey(item.dataset.assetKey, event);
  }
  function handleAssetDoubleClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (!item || event.target.closest('input')) return;
    assetState.selected = new Set([item.dataset.assetKey]); assetState.anchor = item.dataset.assetKey; renderAssets(); openSelectedAsset();
  }
  const selectedAssetRecords = () => orderedAssets().filter((asset) => assetState.selected.has(assetKey(asset)));

  async function openSelectedAsset() {
    const selected = selectedAssetRecords();
    if (selected.length !== 1) return;
    ensureAssetsEditor(true).card.scrollIntoView?.({ block: 'nearest' });
    try {
      applyAssetSnapshot(await assetRequest('select-for-modify', { ref: assetRef(selected[0]) }));
      status(`Editing ${selected[0].plainName || selected[0].name}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }
  async function createAsset(kind) {
    closeAssetsContextMenu(); ensureAssetsEditor(true).card.scrollIntoView?.({ block: 'nearest' });
    try {
      applyAssetSnapshot(await assetRequest('prepare-create', { kind }));
      status(`Create a ${kind} in the Input card.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }
  function beginAssetRename() {
    const selected = selectedAssetRecords();
    if (selected.length !== 1) return;
    closeAssetsContextMenu(); assetState.renameKey = assetKey(selected[0]); renderAssets();
  }
  function handleRenameKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault(); const key = assetState.renameKey; assetState.renameKey = ''; renderAssets();
      assetState.view.querySelector(`[data-asset-key="${CSS.escape(key)}"]`)?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault(); commitAssetRename(assetState.renameKey, event.currentTarget.value);
    }
  }
  async function commitAssetRename(key, value) {
    if (!key || assetState.renameKey !== key) return;
    const asset = assetState.snapshot.assets.find((entry) => assetKey(entry) === key);
    if (!asset) return;
    assetState.renameKey = '';
    try {
      applyAssetSnapshot(await assetRequest('rename', { ref: assetRef(asset), name: value })); status('Asset renamed.', 'success');
    } catch (error) {
      assetState.renameKey = key; renderAssets(); status(error.message, 'error');
    }
  }

  function handleAssetKeydown(event) {
    if (event.target.closest('input,select,button')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault(); const ordered = orderedAssets(); assetState.selected = new Set(ordered.map(assetKey)); assetState.anchor = ordered[0] ? assetKey(ordered[0]) : ''; renderAssets();
    } else if (event.key === 'F2') { event.preventDefault(); beginAssetRename(); }
    else if (event.key === 'Delete') { event.preventDefault(); deleteAssets(selectedAssetRecords().map(assetRef)); }
    else if (event.key === 'Enter') { event.preventDefault(); openSelectedAsset(); }
    else if (event.key === 'Escape') {
      event.preventDefault(); if (!closeAssetsContextMenu()) { assetState.selected.clear(); assetState.anchor = ''; renderAssets(); }
    } else if ((event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) && assetState.selected.size) {
      event.preventDefault(); const rect = assetState.view.querySelector('[aria-selected="true"]')?.getBoundingClientRect(); if (rect) showAssetsContextMenu(rect.left + 12, rect.top + 12, 'item');
    }
  }

  function beginAssetMarquee(event) {
    if (event.button !== 0 || event.target.closest('[data-asset-key],input,select,button')) return;
    closeAssetsContextMenu(); event.preventDefault();
    const marquee = Object.assign(document.createElement('div'), { className: 'workspace-assets-marquee' }); document.body.appendChild(marquee);
    const baseline = (event.ctrlKey || event.metaKey) ? new Set(assetState.selected) : new Set();
    assetState.marquee = { startX: event.clientX, startY: event.clientY, marquee, baseline };
    const move = (moveEvent) => updateAssetMarquee(moveEvent);
    const finish = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', finish); document.removeEventListener('pointercancel', finish);
      assetState.marquee?.marquee.remove(); assetState.marquee = null; renderAssets();
    };
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', finish, { once: true }); document.addEventListener('pointercancel', finish, { once: true });
    updateAssetMarquee(event);
  }
  function updateAssetMarquee(event) {
    const drag = assetState.marquee;
    if (!drag) return;
    event.preventDefault();
    const left = Math.min(drag.startX, event.clientX), top = Math.min(drag.startY, event.clientY), right = Math.max(drag.startX, event.clientX), bottom = Math.max(drag.startY, event.clientY);
    Object.assign(drag.marquee.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    const next = new Set(drag.baseline);
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => {
      const rect = item.getBoundingClientRect(); if (rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom) next.add(item.dataset.assetKey);
    });
    assetState.selected = next;
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => item.setAttribute('aria-selected', String(next.has(item.dataset.assetKey))));
    assetState.view.querySelector('[data-assets-count]').textContent = `${assetState.snapshot.assets.length} objects${next.size ? ` · ${next.size} selected` : ''}`;
  }

  function handleAssetsContextMenu(event) {
    event.preventDefault(); const item = event.target.closest('[data-asset-key]');
    if (item) {
      if (!assetState.selected.has(item.dataset.assetKey)) { assetState.selected = new Set([item.dataset.assetKey]); assetState.anchor = item.dataset.assetKey; renderAssets(); }
      showAssetsContextMenu(event.clientX, event.clientY, 'item');
    } else {
      assetState.selected.clear(); assetState.anchor = ''; renderAssets(); showAssetsContextMenu(event.clientX, event.clientY, 'background');
    }
  }
  function menuButton(label, action, options = {}) {
    const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, disabled: !!options.disabled });
    button.setAttribute('role', 'menuitem'); if (options.checked) button.dataset.checked = 'true';
    button.addEventListener('click', () => { action(); closeAssetsContextMenu(); }); return button;
  }
  function menuCascade(label, children) {
    const wrapper = Object.assign(document.createElement('div'), { className: 'workspace-assets-menu-cascade' });
    const trigger = Object.assign(document.createElement('button'), { type: 'button' });
    trigger.setAttribute('role', 'menuitem'); trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
    trigger.append(document.createTextNode(label), Object.assign(document.createElement('span'), { className: 'workspace-assets-menu-arrow', textContent: '›' }));
    const submenu = Object.assign(document.createElement('div'), { className: 'workspace-assets-submenu' }); submenu.setAttribute('role', 'menu'); children.forEach((child) => submenu.appendChild(child));
    const setOpen = (open) => { wrapper.dataset.open = String(open); trigger.setAttribute('aria-expanded', String(open)); };
    const openExclusive = () => {
      wrapper.parentElement?.querySelectorAll('.workspace-assets-menu-cascade').forEach((item) => {
        item.dataset.open = 'false'; item.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
      });
      setOpen(true);
    };
    wrapper.addEventListener('mouseenter', openExclusive); wrapper.addEventListener('mouseleave', () => setOpen(false)); trigger.addEventListener('focus', openExclusive);
    trigger.addEventListener('click', (event) => { event.stopPropagation(); openExclusive(); });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); setOpen(true); submenu.querySelector('button:not(:disabled)')?.focus(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); }
    });
    submenu.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); } });
    wrapper.append(trigger, submenu); return wrapper;
  }
  function showAssetsContextMenu(x, y, kind) {
    const menu = $('#workspace-assets-context-menu'); menu.replaceChildren();
    if (kind === 'item') {
      menu.append(menuButton('Open', openSelectedAsset, { disabled: assetState.selected.size !== 1 }), menuButton('Rename', beginAssetRename, { disabled: assetState.selected.size !== 1 }), menuButton(`Delete${assetState.selected.size > 1 ? ` ${assetState.selected.size} assets` : ''}`, () => deleteAssets(selectedAssetRecords().map(assetRef)), { disabled: !assetState.selected.size }));
    } else {
      const viewItems = ASSET_LAYOUTS.map((layout) => menuButton(layout[0].toUpperCase() + layout.slice(1), () => { assetState.layout = layout; renderAssets(); }, { checked: assetState.layout === layout }));
      const sortItems = [['creation', 'Creation order'], ['name', 'Name'], ['type', 'Object type'], ['modified', 'Date modified']].map(([value, label]) => menuButton(label, () => { assetState.sort = value; renderAssets(); }, { checked: assetState.sort === value }));
      sortItems.push(Object.assign(document.createElement('div'), { className: 'workspace-assets-menu-separator' }), menuButton('Ascending', () => { assetState.direction = 'asc'; renderAssets(); }, { checked: assetState.direction === 'asc', disabled: assetState.sort === 'creation' }), menuButton('Descending', () => { assetState.direction = 'desc'; renderAssets(); }, { checked: assetState.direction === 'desc', disabled: assetState.sort === 'creation' }));
      const newItems = ASSET_KINDS.map((assetKind) => menuButton(assetKind[0].toUpperCase() + assetKind.slice(1), () => createAsset(assetKind), { disabled: assetState.snapshot.capabilities?.[assetKind] === false }));
      menu.append(menuCascade('View', viewItems), menuCascade('Sort by', sortItems), menuCascade('New', newItems));
    }
    menu.hidden = false; menu.classList.toggle('workspace-assets-menu-left', x > window.innerWidth - 460); menu.style.left = '0px'; menu.style.top = '0px';
    const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - rect.width - 6))}px`; menu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - rect.height - 6))}px`;
    menu.querySelector('button:not(:disabled)')?.focus();
  }
  function closeAssetsContextMenu() {
    const menu = $('#workspace-assets-context-menu'); if (menu.hidden) return false;
    menu.hidden = true; menu.replaceChildren(); return true;
  }

  async function deleteAssets(refs) {
    closeAssetsContextMenu(); if (!refs.length) return;
    try {
      const plan = await assetRequest('plan-delete', { refs });
      if (!plan.all?.length || !await confirmAssetDelete(plan)) return;
      applyAssetSnapshot(await assetRequest('commit-delete', { refs, revision: plan.revision }));
      assetState.selected.clear(); assetState.anchor = ''; status(`Deleted ${plan.all.length} asset${plan.all.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }
  function confirmAssetDelete(plan) {
    const dialog = $('#workspace-assets-delete-dialog'), selected = plan.selected || [], dependents = plan.dependents || [];
    $('#workspace-assets-delete-summary').textContent = dependents.length ? `Deleting the selection will also delete ${dependents.length} dependent asset${dependents.length === 1 ? '' : 's'}. This cannot be undone.` : `Delete ${selected.length} selected asset${selected.length === 1 ? '' : 's'}? This cannot be undone.`;
    fillDeleteList($('#workspace-assets-delete-selected'), 'Selected', selected); fillDeleteList($('#workspace-assets-delete-dependents'), 'Also deleted', dependents);
    if (typeof dialog.showModal !== 'function') return Promise.resolve(window.confirm($('#workspace-assets-delete-summary').textContent));
    return new Promise((resolve) => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); dialog.querySelector('[value="cancel"]')?.focus(); });
  }
  function fillDeleteList(host, heading, entries) {
    host.replaceChildren(); host.hidden = !entries.length; if (!entries.length) return;
    host.appendChild(Object.assign(document.createElement('h3'), { textContent: heading })); const list = document.createElement('ul');
    entries.forEach((asset) => list.appendChild(Object.assign(document.createElement('li'), { textContent: `${asset.plainName || asset.name} — ${asset.typeLabel}` }))); host.appendChild(list);
  }

  function toggleImportExportCard() { const card = $('#workspace-io-card'), collapsed = card.classList.toggle('collapsed'); $('#workspace-io-head').setAttribute('aria-expanded', String(!collapsed)); }
  function chooseOptions(select, entries, placeholder) {
    const previous = select.value; select.replaceChildren(new Option(placeholder, '')); entries.filter((entry) => !entry.disabled).forEach((entry) => select.appendChild(new Option(entry.label, entry.id)));
    if (Array.from(select.options).some((item) => item.value === previous)) select.value = previous; select.disabled = entries.length === 0;
  }
  function updateImportExport() {
    const assetsTarget = inspectorSourceId === 'assets' || activeCanvasId === 'assets';
    const definition = byId.get(assetsTarget ? 'assets' : activeCanvasId); $('#workspace-io-target').textContent = definition ? definition.label : 'No main view selected';
    chooseOptions($('#workspace-io-exporter'), [], assetsTarget ? 'Unavailable for Assets' : 'Use the calculator’s native card');
    chooseOptions($('#workspace-io-format'), [], 'Default format'); $('#workspace-io-format-row').hidden = true;
    chooseOptions($('#workspace-io-importer'), [], assetsTarget ? 'Unavailable for Assets' : 'Use the calculator’s native card');
    $('#workspace-io-output').value = '';
  }

  function initialise() {
    const picker = $('#workspace-open-canvas'); picker.appendChild(new Option('Open view…', '', true, true));
    const views = document.createElement('optgroup'); views.label = 'Workspace views'; views.appendChild(new Option('Assets', 'assets')); picker.appendChild(views);
    const calculatorGroup = document.createElement('optgroup'); calculatorGroup.label = 'Calculator views';
    calculators.forEach((calculator) => calculatorGroup.appendChild(new Option(calculator.label, calculator.id))); picker.appendChild(calculatorGroup);
    picker.addEventListener('change', () => { if (picker.value) openCanvas(picker.value); picker.value = ''; }); $('#workspace-split-view').addEventListener('click', () => setSplitView(!splitView));
    $('#workspace-io-card').classList.add('workspace-assets-inspector-card');
    $('#workspace-add-card').addEventListener('click', () => $('#workspace-card-picker').hidden ? openCardPicker() : closeCardPicker());
    $('#workspace-card-source').addEventListener('change', (event) => selectInspectorSource(event.currentTarget.value));
    document.querySelectorAll('[data-pane]').forEach((pane) => pane.addEventListener('pointerdown', () => focusCanvasPane(pane.dataset.pane)));
    $('#workspace-io-head').addEventListener('click', toggleImportExportCard); $('#workspace-io-head').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleImportExportCard(); } });
    document.addEventListener('pointerdown', (event) => { if (!$('#workspace-assets-context-menu').hidden && !$('#workspace-assets-context-menu').contains(event.target)) closeAssetsContextMenu(); if (!$('#workspace-card-picker').hidden && !$('#workspace-card-picker').contains(event.target) && !$('#workspace-add-card').contains(event.target)) closeCardPicker(); }, true);
    window.addEventListener('blur', () => { closeAssetsContextMenu(); closeCardPicker(); }); window.addEventListener('resize', () => { closeAssetsContextMenu(); closeCardPicker(); });
    document.querySelectorAll('[data-workspace-io-tab]').forEach((tab) => tab.addEventListener('click', () => { const name = tab.dataset.workspaceIoTab; document.querySelectorAll('[data-workspace-io-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === tab))); $('#workspace-io-export-panel').hidden = name !== 'export'; $('#workspace-io-import-panel').hidden = name !== 'import'; }));
    renderCanvasView();
  }

  window.MathWorkspaceAssetsTest = { assetKey, layouts: ASSET_LAYOUTS.slice(), selectAssetKey, orderedAssets, state: assetState, assetRequest, canonicalAssetName };
  document.addEventListener('DOMContentLoaded', initialise);
}());
