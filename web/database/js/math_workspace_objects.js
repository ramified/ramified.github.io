(function (root) {
  'use strict';
  const keyOf = ref => ref ? `${ref.kind}:${ref.id}` : '';
  const types = ['A', 'B', 'C', 'D', 'E6', 'E7', 'E8', 'F4', 'G2'];
  const branchingRules = [
    ['diag-gl', 'GL(n) × GL(n) → GL(n)'], ['diag-o', 'O(n) × O(n) → O(n)'], ['diag-sp', 'Sp(2n) × Sp(2n) → Sp(2n)'],
    ['sum-gl', 'GL(n+m) → GL(n) × GL(m)'], ['sum-o', 'O(n+m) → O(n) × O(m)'], ['sum-sp', 'Sp(2n+2m) → Sp(2n) × Sp(2m)'],
    ['pol-o-gl', 'O(2n) → GL(n)'], ['pol-sp-gl', 'Sp(2n) → GL(n)'],
    ['gl-o', 'GL(n) → O(n)'], ['gl-sp', 'GL(2n) → Sp(2n)'],
    ['gl-o-gl', 'GL(2n) → O(2n) → GL(n)'], ['gl-sp-gl', 'GL(2n) → Sp(2n) → GL(n)']
  ];
  function normalize(kind, type, source = {}) {
    if (kind === 'young') {
      const raw = String(source.partition ?? (source.rows || []).join(', ')).trim().replace(/^\((.*)\)$/, '$1').trim();
      if (raw && !/^[+-]?\d+(?:(?:\s*,\s*|\s+)[+-]?\d+)*$/.test(raw)) throw new Error('Enter a complete list of integer rows, for example 4, 2, 1.');
      const rows = raw ? raw.split(/[,\s]+/).map(Number) : [];
      if (rows.length > 15 || rows.some(value => !Number.isSafeInteger(value) || Math.abs(value) > 25)) throw new Error('The editor supports at most 15 rows and 25 columns.');
      if (type !== 'generalized') {
        if (rows.some((value, index) => value < 0 || (index && value > rows[index - 1]))) throw new Error('Partition rows must be nonnegative and non-increasing.');
        while (rows.at(-1) === 0) rows.pop();
      }
      return { rows, partition: rows.join(', ') };
    }
    if (kind === 'lie') {
      const family = source.family || 'A', exceptional = { E6: 6, E7: 7, E8: 8, F4: 4, G2: 2 };
      if (!types.includes(family)) throw new Error('Choose a supported Lie type.');
      const rank = exceptional[family] || Number(source.rank ?? 3), min = { A: 1, B: 2, C: 2, D: 3 }[family] || 1;
      if (!Number.isInteger(rank) || rank < min || rank > 12) throw new Error(`Rank for ${family} must be an integer from ${min} to 12.`);
      return { family, rank };
    }
    return source;
  }
  const slot = (id, label, kind, extra = {}) => ({ id, label, kind, ...extra });
  const a = () => slot('lambda', 'Young diagram λ', 'young');
  const b = () => slot('mu', 'Young diagram μ', 'young');
  const lie = () => slot('lie', 'Lie type', 'lie');
  const definitions = [
    { id: 'young-input', label: 'Young diagram Input', input: 'young' },
    { id: 'lie-input', label: 'Lie type Input', input: 'lie' },
    { id: 'statistics', label: 'Statistics', engine: 'young', marker: 'out-size', slots: [a()], light: true },
    { id: 'weight', label: 'Lie Algebra Weight', engine: 'young', marker: 'lie-weight', slots: [a(), lie()], light: true },
    { id: 'branching', label: 'Branching Rules', engine: 'young', marker: 'br-output', slots: [a(), b()] },
    { id: 'symmetric', label: 'Symmetric Functions', engine: 'young', marker: 'symfun-output', slots: [a()], light: true },
    { id: 'pair-statistics', label: 'Pair Statistics', engine: 'double-young', marker: 'stats-out', slots: [a(), b(), lie()], light: true },
    { id: 'lr', label: 'Littlewood–Richardson Decomposition', engine: 'double-young', marker: 'schur-out', slots: [a(), b(), lie()] },
    { id: 'invariants', label: 'Lie Algebra Invariants', engine: 'double-young', marker: 'invariants-out', slots: [a(), b(), lie()], light: true },
    { id: 'kostka', label: 'Kostka Tableaux', engine: 'double-young', marker: 'kostka-out', slots: [slot('lambda', 'Shape λ', 'young'), slot('mu', 'Weight μ', 'young')] },
    { id: 'kronecker', label: 'Kronecker Decomposition', engine: 'double-young', marker: 'kronecker-out', slots: [a(), b()] },
    { id: 'plethysm', label: 'Plethysm Decomposition', engine: 'double-young', marker: 'plethysm-out', slots: [a(), b()] },
    { id: 'schur', label: 'Schur Functor', engine: 'double-young', marker: 'schur-functor-out', slots: [slot('lambda', 'Representation λ', 'young'), slot('mu', 'Functor shape μ', 'young'), lie()] },
    { id: 'grassmannian', label: 'Grassmannian Cup Product', engine: 'double-young', marker: 'grassmannian-out', slots: [a(), b(), slot('space', 'Grassmannian', 'variety', { subtype: 'grassmannian' })] },
    { id: 'polynomials', label: 'Symmetric Polynomials', engine: 'double-young', marker: 'sympoly-output', slots: [a(), b()] },
    { id: 'slice', label: '2D Weight Slice', engine: 'double-young', marker: 'slice-card-body', slots: [a(), b(), lie()], light: true }
  ];
  const byType = new Map(definitions.map(definition => [definition.id, definition]));
  function compatible(asset, spec, definition) {
    return !!asset && asset.kind === spec.kind && (!spec.subtype || asset.type === spec.subtype)
      && !(definition.engine === 'double-young' && asset.kind === 'young' && asset.type === 'generalized');
  }
  function contextFor(computation, assets) {
    const definition = byType.get(computation.type), objects = {}, missing = [];
    for (const spec of definition.slots || []) {
      if (computation.type === 'branching' && spec.id === 'mu' && !(computation.rule || 'diag-gl').startsWith('diag-')) continue;
      const asset = assets.find(asset => keyOf(asset) === computation.refs[spec.id]);
      if (compatible(asset, spec, definition)) objects[spec.id] = asset;
      else if (!spec.optional || computation.refs[spec.id]) missing.push(spec.label);
    }
    if (objects.space) {
      const { r, n } = objects.space.data;
      for (const id of ['lambda', 'mu']) if (objects[id] && (objects[id].data.rows.length > Number(r) || Math.max(0, ...objects[id].data.rows) > Number(n) - Number(r))) missing.push(`${id === 'lambda' ? 'λ' : 'μ'} must fit inside Gr(${r}, ${n})`);
    }
    return { objects, missing, signature: JSON.stringify([computation.rule, Object.entries(objects).map(([role, asset]) => [role, keyOf(asset), asset.type, asset.data])]) };
  }
  function mount(api) {
    const panels = new Map(), computations = new Map();
    let nextId = 0, snapshot = api.snapshot();
    const get = key => snapshot.assets.find(asset => keyOf(asset) === key);
    const element = (tag, className, text) => Object.assign(document.createElement(tag), { className: className || '', ...(text == null ? {} : { textContent: text }) });
    const button = (text, action, label = text) => { const node = element('button', 'btn btn-ghost', text); node.type = 'button'; node.setAttribute('aria-label', label); node.addEventListener('click', event => { event.stopPropagation(); try { action(); } catch (error) { api.status(error.message, 'error'); } }); return node; };
    const sync = (node, value) => window.CalculatorInputSettings.syncEditableValue(node, value);
    const listen = (node, handler) => window.CalculatorInputSettings.listenEditable(node, 'input', handler);
    const refOf = asset => asset ? { kind: asset.kind, id: asset.id } : null;
    function feedback(panel, text = '', error = false) { panel.message.textContent = text; panel.message.dataset.state = error ? 'error' : ''; panel.node.classList.toggle('is-stale', panel.computation?.status === 'stale'); }
    function field(label, control) {
      const node = element('label', 'workspace-field workspace-field-inline'); node.append(element('span', 'input-label', label), control); return node;
    }
    function createNative(panel, engine, role) {
      const host = element('section', 'workspace-object-native'), inspectorHost = element('section', 'workspace-object-native-inspector');
      host.dataset.objectEngine = engine;
      panel.renderArea.append(host, inspectorHost);
      const renderer = { host, inspectorHost, engine, role, editor: null, applying: true };
      renderer.editor = window.MathWorkspaceNativeEditors.factories[engine].mount(host, {
        id: `${panel.id}-${role}`, inspectorHost,
        onChange: change => nativeChange(panel, renderer, change),
        onError: error => feedback(panel, error.message, true)
      });
      renderer.editor.listCards().forEach(card => renderer.editor.setCardVisible(card.key, false));
      renderer.editor.configureObjectPanel({ mode: role === 'property' ? 'property' : 'input', compact: role === 'compact', marker: panel.definition.marker, operation: panel.definition.id });
      renderer.applying = false;
      return renderer;
    }
    function nativeChange(panel, renderer, change) {
      if (renderer.applying || panel.refreshing || !renderer.editor) return;
      if (panel.definition.input === 'young') {
        const asset = get(panel.assetKey); if (!asset || panel.activeRenderer !== renderer) return;
        const value = renderer.editor.collectAssets(); if (!value) return;
        const data = normalize('young', value.type, { rows: value.rows });
        if (asset.type === value.type && JSON.stringify(asset.data.rows) === JSON.stringify(data.rows)) return;
        try { api.update(refOf(asset), { type: value.type, data }); feedback(panel); }
        catch (error) { feedback(panel, error.message, true); }
      } else if (panel.computation && change?.interaction !== 'card-chrome') {
        const options = renderer.editor.captureAssetProperties();
        const optionsChanged = JSON.stringify(options) !== JSON.stringify(panel.computation.options);
        panel.computation.options = options;
        panel.computation.result = renderer.editor.readObjectResult();
        if (change?.interaction === 'object-compute') {
          panel.computation.status = 'current'; feedback(panel);
        } else if (optionsChanged && !panel.definition.light) {
          panel.computation.status = 'stale'; panel.computation.result = null;
          feedback(panel, 'Options changed. Use compute to update the result.');
        }
      }
    }
    function setRendererVisible(renderer, visible, property = false) {
      renderer.host.hidden = !visible || (property && renderer.operation !== 'slice');
      renderer.inspectorHost.hidden = !visible || !property;
      renderer.editor.setCanvasActive(visible && (!property || renderer.operation === 'slice'));
      renderer.editor.setInspectorActive(visible && property);
      // The runtime sets host.hidden, so apply the property layout after activation.
      renderer.host.hidden = !visible || (property && renderer.operation !== 'slice');
    }
    function updateDensity(panel) {
      const compact = panel.location !== 'main' || api.split() || panel.node.getBoundingClientRect().width < 600;
      panel.node.dataset.density = compact ? 'compact' : 'large';
      const visible = !panel.closed && !panel.collapsed && !panel.node.hidden;
      if (panel.definition.input !== 'young') {
        if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, visible && panel.computation.status !== 'missing', true);
        return;
      }
      if (!visible) { panel.renderers.forEach(renderer => setRendererVisible(renderer, false)); return; }
      const asset = get(panel.assetKey);
      const role = compact && asset?.type !== 'generalized' ? 'compact' : 'large';
      if (!panel.renderers.has(role)) panel.renderers.set(role, createNative(panel, role === 'compact' ? 'double-young' : 'young', role));
      const renderer = panel.renderers.get(role), changed = panel.activeRenderer !== renderer;
      panel.activeRenderer = renderer;
      for (const candidate of panel.renderers.values()) setRendererVisible(candidate, candidate === renderer);
      if (changed) projectInput(panel);
    }
    function projectInput(panel) {
      const asset = get(panel.assetKey), renderer = panel.activeRenderer;
      if (!renderer) return;
      renderer.applying = true;
      try { renderer.editor.applyAssets({ assets: asset ? [asset] : [] }, refOf(asset), null, { mode: 'input', compact: renderer.role === 'compact' }); }
      finally { renderer.applying = false; }
    }
    function updateSelector(select, spec, definition, value) {
      const candidates = snapshot.assets.filter(asset => compatible(asset, spec, definition));
      const signature = JSON.stringify(candidates.map(asset => [keyOf(asset), asset.name, asset.definition]));
      if (select.dataset.signature !== signature || (value && ![...select.options].some(option => option.value === value))) {
        select.replaceChildren(new Option(spec.optional ? 'None (when the rule uses one input)' : `Choose ${spec.label}…`, ''));
        candidates.forEach(asset => select.append(new Option(`${asset.plainName || asset.name} · ${asset.definition || asset.typeLabel}`, keyOf(asset))));
        if (value && !candidates.some(asset => keyOf(asset) === value)) select.append(new Option('Missing or incompatible asset', value));
        select.dataset.signature = signature;
      }
      select.value = value || '';
    }
    function referenceControl(panel, spec, definition, read, write) {
      const row = element('div', 'workspace-object-reference'), select = element('select', 'workspace-control'); select.dataset.objectReference = spec.id;
      select.setAttribute('aria-label', spec.label);
      select.addEventListener('change', () => { write(select.value); refreshPanel(panel); });
      select.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-math-workspace-asset')) event.preventDefault(); });
      select.addEventListener('drop', event => {
        event.preventDefault(); let key = event.dataTransfer?.getData('application/x-math-workspace-asset') || '';
        try { const parsed = JSON.parse(key); key = typeof parsed === 'string' ? parsed : keyOf(parsed); } catch (_) {}
        if (compatible(get(key), spec, definition)) { write(key); refreshPanel(panel); }
      });
      row.append(field(spec.label, select), button('+', () => {
        const asset = api.create(spec.kind, spec.subtype ? { type: spec.subtype, data: { r: '2', n: '4' } } : {});
        write(keyOf(asset)); refreshPanel(panel);
        if (spec.kind === 'lie') open('lie-input', keyOf(asset), 'side');
      }, `Create ${spec.label}`));
      if (!definition.input) row.append(button('edit', () => { const asset = get(read()); if (asset) api.edit(refOf(asset)); }, `Edit ${spec.label}`));
      panel.references.append(row); panel.selectors.push({ row, select, spec, definition, read });
    }
    function inputFields(panel) {
      const definition = panel.definition, name = element('input', 'workspace-control workspace-code-control'); name.type = 'text'; name.setAttribute('aria-label', 'Asset name');
      panel.name = name; panel.controls.append(field('Name', name));
      listen(name, () => {
        const asset = get(panel.assetKey); if (!asset) return;
        try { api.update(refOf(asset), { name: name.value }); feedback(panel); } catch (error) { feedback(panel, error.message, true); }
      });
      if (definition.input === 'young') {
        const type = element('select', 'workspace-control'); type.append(new Option('Young diagram', 'partition'), new Option('Generalized rows', 'generalized')); panel.youngType = type;
        const rows = element('input', 'workspace-control workspace-code-control'); rows.type = 'text'; rows.placeholder = '4, 2, 1'; rows.setAttribute('aria-label', 'Young diagram rows'); panel.rows = rows;
        const commit = () => {
          const asset = get(panel.assetKey); if (!asset) return;
          try { api.update(refOf(asset), { type: type.value, data: normalize('young', type.value, { partition: rows.value }) }); feedback(panel); } catch (error) { feedback(panel, error.message, true); }
        };
        listen(rows, commit); type.addEventListener('change', commit);
        panel.controls.append(field('Type', type), field('Rows', rows));
        const actions = element('div', 'workspace-form-actions');
        actions.append(button('clear', () => { const asset = get(panel.assetKey); if (asset) api.update(refOf(asset), { data: normalize('young', asset.type, { rows: [] }) }); }), button('transpose', () => {
          const asset = get(panel.assetKey); if (!asset || asset.type !== 'partition') return;
          const rows = Array.from({ length: asset.data.rows[0] || 0 }, (_, col) => asset.data.rows.filter(row => row > col).length);
          api.update(refOf(asset), { data: normalize('young', 'partition', { rows }) });
        })); panel.controls.append(actions);
      } else {
        const family = element('select', 'workspace-control'); family.append(...types.map(type => new Option(type, type))); panel.family = family;
        const rank = element('input', 'workspace-control'); rank.type = 'number'; rank.min = '1'; rank.max = '12'; rank.step = '1'; rank.value = '3'; panel.rank = rank;
        const commit = () => { const asset = get(panel.assetKey); if (!asset) return; try { api.update(refOf(asset), { data: normalize('lie', 'simple', { family: family.value, rank: rank.value }) }); feedback(panel); } catch (error) { feedback(panel, error.message, true); } };
        listen(rank, commit); family.addEventListener('change', commit);
        panel.controls.append(field('Type', family), field('Rank', rank));
      }
    }
    function addIO(panel) {
      const details = element('details', 'workspace-object-io'), summary = element('summary', '', 'Import / Export');
      const area = element('textarea', 'workspace-control workspace-code-control'); area.setAttribute('aria-label', panel.definition.input ? 'Asset JSON or partition text' : 'Property result'); area.rows = 5;
      const actions = element('div', 'workspace-form-actions');
      const exportText = () => {
        const asset = get(panel.assetKey);
        if (panel.definition.input) { if (!asset) throw new Error('Choose an asset first.'); return JSON.stringify({ kind: asset.kind, name: asset.name, type: asset.type, data: asset.data }, null, 2); }
        const computation = panel.computation;
        return JSON.stringify({ property: computation.type, refs: computation.refs, rule: computation.rule, options: computation.options, result: computation.status === 'current' ? panel.propertyRenderer?.editor.readObjectResult() || null : null, status: computation.status }, null, 2);
      };
      actions.append(button('export', () => { area.value = exportText(); }), button('download', () => {
        const url = URL.createObjectURL(new Blob([exportText()], { type: 'application/json' })), link = document.createElement('a'); link.href = url; link.download = `${panel.definition.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }));
      if (panel.definition.input) actions.append(button('import into this asset', () => {
        const asset = get(panel.assetKey); if (!asset) throw new Error('Choose or create the destination asset first.');
        const raw = area.value.trim(), value = raw.startsWith('{') ? JSON.parse(raw) : { kind: 'young', type: asset.type, data: { partition: raw } };
        if (value.kind !== asset.kind) throw new Error('Imported data has a different object type.');
        const type = value.type || asset.type, data = normalize(asset.kind, type, value.data || {});
        api.update(refOf(asset), { type, data }); feedback(panel, 'Imported into the selected asset.');
      }));
      else area.readOnly = true;
      details.append(summary, area, actions); panel.body.append(details);
    }
    function refreshPanel(panel) {
      if (panel.refreshing) return;
      panel.refreshing = true;
      try {
        panel.selectors.forEach(({ row, select, spec, definition, read }) => {
          updateSelector(select, spec, definition, read());
          row.hidden = definition.id === 'branching' && spec.id === 'mu' && !panel.computation.rule.startsWith('diag-');
        });
        if (panel.definition.input) {
          const asset = get(panel.assetKey);
          panel.controls.querySelectorAll('input,select,button').forEach(node => { node.disabled = !asset; });
          if (asset) {
            sync(panel.name, asset.name);
            if (asset.kind === 'young') { sync(panel.rows, asset.data.partition); panel.youngType.value = asset.type; }
            else { panel.family.value = asset.data.family; sync(panel.rank, asset.data.rank); panel.rank.disabled = !['A','B','C','D'].includes(asset.data.family); }
          }
          panel.title.textContent = `${asset?.plainName || asset?.name || 'Choose an asset'} · Input`;
          updateDensity(panel); projectInput(panel);
          panel.renderArea.hidden = !asset;
          if (!asset) feedback(panel, panel.assetKey ? 'The referenced asset was deleted. Choose another asset.' : 'Choose or create an asset to edit.');
        } else {
          const computation = panel.computation, context = contextFor(computation, snapshot.assets);
          panel.title.textContent = panel.definition.label;
          if (context.missing.length) {
            computation.status = 'missing'; computation.signature = ''; computation.result = null; panel.renderArea.hidden = true;
            if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, false, true);
            feedback(panel, 'Required inputs: ' + context.missing.join('; '));
          } else {
            panel.renderArea.hidden = false;
            if (!panel.propertyRenderer) { panel.propertyRenderer = createNative(panel, panel.definition.engine, 'property'); panel.propertyRenderer.operation = panel.definition.id; }
            const renderer = panel.propertyRenderer;
            if (computation.signature !== context.signature) {
              computation.signature = context.signature; computation.result = null; computation.status = panel.definition.light ? 'current' : 'stale';
              renderer.applying = true;
              try { renderer.editor.applyAssets({ assets: Object.values(context.objects) }, refOf(context.objects.lambda), null, { mode: 'property', operation: panel.definition.id, rule: computation.rule, light: panel.definition.light, refs: Object.fromEntries(Object.entries(context.objects).map(([role, asset]) => [role, refOf(asset)])) }); }
              finally { renderer.applying = false; }
              computation.options = renderer.editor.captureAssetProperties();
              if (panel.definition.light) computation.result = renderer.editor.readObjectResult();
            }
            setRendererVisible(renderer, !panel.closed && !panel.collapsed && !panel.node.hidden, true);
            feedback(panel, computation.status === 'stale' ? 'Inputs changed. Use compute to update the result.' : '');
          }
        }
        api.title(panel.id, panel.title.textContent);
      } finally { panel.refreshing = false; }
    }
    function move(panel, location) {
      if (panel.location !== 'hidden') panel.lastLocation = panel.location;
      if (panel.location === 'main') api.removeMain(panel.id);
      panel.location = location; panel.closed = location === 'hidden'; panel.node.hidden = panel.closed;
      panel.node.dataset.location = location;
      if (location === 'main') api.placeMain(panel);
      else if (location === 'side') api.side.prepend(panel.node);
      else api.parking.append(panel.node);
      if (location !== 'hidden') api.installChrome(panel);
      refreshPanel(panel); requestAnimationFrame(() => updateDensity(panel)); api.pickerChanged();
    }
    function open(type, assetKey = '', location = 'side', options = {}) {
      const definition = byType.get(type); if (!definition) throw new Error('Unknown mathematical panel.');
      const id = `object-panel-${++nextId}`;
      const node = element('section', 'card workspace-object-panel workspace-assets-inspector-card'), head = element('div', 'card-head'), title = element('span', 'card-head-label', definition.label);
      node.dataset.objectPanel = id; node.dataset.panelType = type;
      head.setAttribute('role', 'button'); head.tabIndex = 0; head.setAttribute('aria-expanded', 'true');
      const body = element('div', 'card-body workspace-card-form'), references = element('div', 'workspace-object-references'), controls = element('div', 'workspace-form-fields'), message = element('p', 'workspace-status'), renderArea = element('div', 'workspace-object-render-area'); message.setAttribute('role', 'status');
      const panel = { id, definition, node, head, title, body, references, controls, message, renderArea, selectors: [], renderers: new Map(), assetKey, location: 'hidden', closed: false, collapsed: false, refreshing: false };
      panels.set(id, panel); head.append(title, element('em', 'toggle-icon', '▾')); body.append(references, controls, message, renderArea); node.append(head, body);
      if (definition.input) {
        referenceControl(panel, slot('asset', definition.input === 'young' ? 'Young diagram' : 'Lie type', definition.input), definition, () => panel.assetKey, value => { panel.assetKey = value; });
        inputFields(panel);
      } else {
        const computation = { id: `computation-${nextId}`, type, refs: {}, options: {}, result: null, status: 'missing', signature: '' };
        if (assetKey && get(assetKey)?.kind === 'young') computation.refs.lambda = assetKey;
        computations.set(computation.id, computation); panel.computation = computation;
        if (type === 'branching') {
          computation.rule = 'diag-gl';
          const rule = element('select', 'workspace-control'); rule.dataset.branchingRule = '';
          rule.append(...branchingRules.map(([value, label]) => new Option(label, value)));
          rule.addEventListener('change', () => { computation.rule = rule.value; refreshPanel(panel); });
          panel.references.append(field('Rule', rule));
        }
        definition.slots.forEach(spec => referenceControl(panel, spec, definition, () => computation.refs[spec.id] || '', value => { computation.refs[spec.id] = value; }));
      }
      addIO(panel); move(panel, location); if (!options.keepPickerOpen) api.closePicker();
      panel.observer = new ResizeObserver(() => updateDensity(panel)); panel.observer.observe(node);
      return panel;
    }
    const bindDrop = (target, location) => {
      target.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-math-workspace-panel')) event.preventDefault(); });
      target.addEventListener('drop', event => { const panel = panels.get(event.dataTransfer?.getData('application/x-math-workspace-panel')); if (panel) { event.preventDefault(); if (location === 'main') api.focusPane(target.dataset.pane); move(panel, location); } });
    };
    bindDrop(api.side, 'side'); document.querySelectorAll('[data-pane]').forEach(pane => bindDrop(pane, 'main'));
    function refresh(value = api.snapshot()) { snapshot = value; panels.forEach(refreshPanel); }
    function listCards() {
      return definitions.flatMap(definition => {
        const instances = [...panels.values()].filter(panel => panel.definition === definition);
        if (!instances.length) return [{ key: 'new:' + definition.id, label: definition.label, visible: false }];
        return instances.map((panel, index) => ({
          key: panel.id, label: definition.label + (definition.input && get(panel.assetKey) ? ' · ' + (get(panel.assetKey).plainName || get(panel.assetKey).name) : '') + (instances.length > 1 ? ' · ' + (index + 1) : ''),
          visible: !panel.closed
        }));
      });
    }
    function setVisible(key, visible) {
      const panel = panels.get(key);
      if (panel) move(panel, visible ? panel.lastLocation || 'side' : 'hidden');
      else if (visible && key.startsWith('new:')) open(key.slice(4), '', 'side', { keepPickerOpen: true });
    }
    function syncPresentation(id) {
      const panel = panels.get(id); if (!panel) return;
      panel.collapsed = panel.node.classList.contains('collapsed'); updateDensity(panel);
    }
    return { panels, computations, open, move, refresh, listCards, setVisible, syncPresentation, resize: () => panels.forEach(updateDensity), closed: id => { const panel = panels.get(id); if (panel) { panel.lastLocation = 'main'; panel.location = 'hidden'; panel.closed = true; refreshPanel(panel); api.pickerChanged(); } } };
  }
  const api = { normalize, definitions, contextFor, compatible, keyOf, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceObjects = api;
}(typeof window !== 'undefined' ? window : globalThis));
