(function (root) {
  'use strict';
  const slicing = root.MathWorkspaceSlicing || (typeof require === 'function' ? require('./math_workspace_slicing.js') : null);
  const keyOf = ref => ref ? `${ref.kind}:${ref.id}` : '';
  const types = ['A', 'B', 'C', 'D', 'E6', 'E7', 'E8', 'F4', 'G2'];
  const inputKinds = ['young', 'lie', 'matrix', 'category', 'functor', 'dynkin', 'strands', ...slicing.kinds];
  const kindLabels = { ...slicing.labels, variety: 'Toric variety', young: 'Young diagram', lie: 'Lie type', matrix: 'Matrix', category: 'Category', functor: 'Functor', dynkin: 'Dynkin diagram', strands: 'Strands' };
  const branchingRules = [
    ['diag-gl', 'GL(n) × GL(n) → GL(n)'], ['diag-o', 'O(n) × O(n) → O(n)'], ['diag-sp', 'Sp(2n) × Sp(2n) → Sp(2n)'],
    ['sum-gl', 'GL(n+m) → GL(n) × GL(m)'], ['sum-o', 'O(n+m) → O(n) × O(m)'], ['sum-sp', 'Sp(2n+2m) → Sp(2n) × Sp(2m)'],
    ['pol-o-gl', 'O(2n) → GL(n)'], ['pol-sp-gl', 'Sp(2n) → GL(n)'],
    ['gl-o', 'GL(n) → O(n)'], ['gl-sp', 'GL(2n) → Sp(2n)'],
    ['gl-o-gl', 'GL(2n) → O(2n) → GL(n)'], ['gl-sp-gl', 'GL(2n) → Sp(2n) → GL(n)']
  ];
  function normalize(kind, type, source = {}) {
    if (slicing.kinds.includes(kind) || kind === 'variety' && type === 'toric') return slicing.normalize(kind,type,source);
    if (kind === 'dynkin') {
      const vertices = source.vertices ?? [1];
      if (!Array.isArray(vertices) || !vertices.length || vertices.some(v => !Number.isSafeInteger(v) || v < 1)) throw new Error('Choose one or more positive integer vertex numbers.');
      let quiver = null;
      if (source.quiver != null) {
        if (typeof source.quiver !== 'object' || Array.isArray(source.quiver)) throw new Error('Quiver directions must be an edge map.');
        quiver = {};
        for (const [edge, direction] of Object.entries(source.quiver)) {
          if (!/^\d+-\d+$/.test(edge) || ![-1, 1].includes(direction)) throw new Error('Each quiver edge needs direction 1 or -1.');
          const [i, j] = edge.split('-').map(Number);
          if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j) || i >= j) throw new Error('Invalid quiver edge.');
          quiver[edge] = direction;
        }
      }
      return { lie: String(source.lie || ''), vertices: [...new Set(vertices)].sort((a, b) => a - b), quiver };
    }
    if (kind === 'strands') {
      const generators = source.generators ?? [];
      if (!Array.isArray(generators)) throw new Error('Supply an ordered generator list.');
      return { lie: String(source.lie || ''), generators: generators.map(record => {
        if (!record || !['coxeter','braid','kl','tl'].includes(record.family) || !Number.isSafeInteger(record.index) || record.index < 0) throw new Error('Invalid typed generator.');
        if (record.family === 'braid' && ![1, -1].includes(record.sign)) throw new Error('Braid generators need sign 1 or -1.');
        return { family: record.family, index: record.index, ...(record.family === 'braid' ? { sign: record.sign } : {}) };
      }) };
    }
    if (kind === 'matrix') {
      const rows = Number(source.rows ?? source.entries?.length ?? 5), cols = Number(source.cols ?? source.entries?.[0]?.length ?? 5);
      if (![rows, cols].every(n => Number.isInteger(n) && n >= 1 && n <= 8)) throw new Error('Matrix dimensions must be integers from 1 to 8.');
      const dataType = source.dataType || 'complex';
      if (!['complex','real','rational','integer','finite-field','rational-function','number-field'].includes(dataType)) throw new Error('Unsupported matrix coefficient type.');
      const entries = source.entries || Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r === c ? '1' : '0'));
      if (entries.length !== rows || entries.some(row => !Array.isArray(row) || row.length !== cols)) throw new Error('Matrix entries must match its dimensions.');
      const finiteFieldPrime = Number(source.finiteFieldPrime ?? 7);
      if (!Number.isSafeInteger(finiteFieldPrime) || finiteFieldPrime < 2 || finiteFieldPrime > 999983 || Array.from({length: Math.floor(Math.sqrt(finiteFieldPrime)) - 1}, (_, i) => i + 2).some(n => finiteFieldPrime % n === 0)) throw new Error('Choose a prime from 2 to 999983.');
      const rationalFunctionVariables = source.rationalFunctionVariables || ['t'];
      if (!Array.isArray(rationalFunctionVariables) || !rationalFunctionVariables.length || rationalFunctionVariables.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Supply a nonempty list of rational function variables.');
      let construction;
      if (source.construction) {
        if (!['simple-roots','fundamental-weights'].includes(source.construction.basis)) throw new Error('Choose a supported Lie basis.');
        construction = { lie: String(source.construction.lie || ''), basis: source.construction.basis };
      }
      return { rows, cols, entries: entries.map(row => row.map(String)), dataType, finiteFieldPrime, rationalFunctionVariables: rationalFunctionVariables.slice(), numberFieldSymbol: String(source.numberFieldSymbol || 'a'), numberFieldPolynomial: String(source.numberFieldPolynomial || 'a^2 - 2'), ...(construction ? { construction } : {}) };
    }
    if (kind === 'category') return { objectSymbol: String(source.objectSymbol || 'X').trim(), objectCondition: String(source.objectCondition || '').trim(), morphismElement: String(source.morphismElement || 'f:{source}\\to {target}').trim(), morphismCondition: String(source.morphismCondition || '').trim(), opposite: !!source.opposite };
    if (kind === 'functor') {
      if (source.variance && !['covariant','contravariant'].includes(source.variance)) throw new Error('Unsupported functor variance.');
      return { domain: String(source.domain || ''), codomain: String(source.codomain || ''), variance: source.variance || 'covariant' };
    }
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
      // A0 is the empty root system used by the existing one-strand identity.
      const rank = exceptional[family] || Number(source.rank ?? 3), min = { A: 0, B: 2, C: 2, D: 3 }[family] ?? 1;
      if (!Number.isSafeInteger(rank) || rank < min || rank >= Number.MAX_SAFE_INTEGER) throw new Error(`Rank for ${family} must be an integer at least ${min}.`);
      return { family, rank };
    }
    return source;
  }
  function strandContext(lie) {
    if (!lie || !['A','B','C','D'].includes(lie.family)) throw new Error('Strands requires a Lie type in A–D.');
    return { groupType: lie.family === 'A' ? 'symmetric' : lie.family, strandCount: lie.rank + (lie.family === 'A' ? 1 : 0) };
  }
  function dynkinEdges(lie) {
    const { family, rank } = lie;
    const chainLength = family === 'D' || family.startsWith('E') ? rank - 1 : rank;
    const edges = Array.from({ length: Math.max(0, chainLength - 1) }, (_, i) => i + '-' + (i + 1));
    if (family === 'D') edges.push((rank - 3) + '-' + (rank - 1));
    if (family.startsWith('E')) edges.push('2-' + (rank - 1));
    return edges;
  }
  function rootObjectIssues(asset, parent) {
    if (!parent || parent.kind !== 'lie') return ['Choose an existing Lie type asset.'];
    const data = asset.data, lie = parent.data, issues = [];
    if (asset.kind === 'strands') {
      if (!['A','B','C','D'].includes(lie.family)) return ['Strands requires a Lie type in A–D.'];
      const min = lie.family === 'A' ? 1 : 0, max = lie.family === 'A' ? lie.rank : lie.rank - 1;
      if (data.generators.some(record => record.index < min || record.index > max)) issues.push('The generator word contains indices outside this Lie type. Edit the word or its Lie reference; the word has been preserved.');
    } else if (asset.kind === 'dynkin') {
      if (data.vertices.some(v => v > lie.rank)) issues.push('The vertex set exceeds the Lie rank. Edit the vertices or Lie reference; the set has been preserved.');
      if (data.quiver != null) {
        if (!['A','D','E6','E7','E8'].includes(lie.family)) issues.push('Quiver directions require a simply laced type A, D or E.');
        const edges = Object.keys(data.quiver), chainEnd = lie.family === 'D' || lie.family.startsWith('E') ? lie.rank - 2 : lie.rank - 1;
        const valid = edge => { const [i,j] = edge.split('-').map(Number); return j === i + 1 && j <= chainEnd || lie.family === 'D' && i === lie.rank - 3 && j === lie.rank - 1 || lie.family.startsWith('E') && i === 2 && j === lie.rank - 1; };
        if (edges.length !== Math.max(0, lie.rank - 1) || edges.some(edge => !valid(edge))) issues.push('Stored quiver edges do not match the Lie diagram. Remove or replace the optional directions; they have been preserved.');
      }
    }
    return issues;
  }
  function lieEngineIssues(lie, engine) {
    if (engine === 'strand') {
      if (!['A','B','C','D'].includes(lie.family)) return ['Strands requires a Lie type in A–D.'];
      if (lie.family === 'D' && lie.rank < 4) return ['The Strands calculator supports D ranks starting at 4.'];
      // Bound the native palette allocation, not the mathematical asset.
      if (lie.rank > 1000) return ['This Strands view supports Lie ranks up to 1000. The asset is unchanged.'];
    } else if (['dynkin','young','double-young'].includes(engine)) {
      const min = lie.family === 'D' && engine === 'dynkin' ? 4 : 1;
      if (lie.rank < min || lie.rank > 12) return ['This ' + engine + ' calculator supports this Lie rank from ' + min + ' to 12. The asset is unchanged.'];
    }
    return [];
  }
  function prepareRootImport(kind, value) {
    let data, lie;
    if (value.kind === kind) {
      if (value.type && value.type !== kind) throw new Error('Unsupported object subtype.');
      data = normalize(kind, kind, value.data);
      if (value.lieAsset) lie = normalize('lie', 'simple', value.lieAsset.data);
    } else if (kind === 'strands' && value.kind === 'strand-diagram-calculator') {
      if (!Number.isInteger(value.version) || value.version < 1 || value.version > 4) throw new Error('Unsupported Strands file version.');
      if (!['symmetric','B','C','D'].includes(value.groupType || 'symmetric')) throw new Error('Unsupported Strands group.');
      const family = value.groupType === 'symmetric' || !value.groupType ? 'A' : value.groupType;
      if (!Number.isSafeInteger(value.strandCount)) throw new Error('Invalid strand count.');
      lie = normalize('lie', 'simple', { family, rank: value.strandCount - (family === 'A' ? 1 : 0) });
      const generators = value.appliedGenerators ?? value.appliedSteps?.map(index => ({ family: 'coxeter', index }));
      if (!Array.isArray(generators)) throw new Error('The file needs a generator list.');
      data = normalize(kind, kind, { generators });
    } else if (kind === 'dynkin' && value.calculator === 'Dynkin diagram calculator') {
      if (value.version !== 1) throw new Error('Unsupported Dynkin file version.');
      lie = normalize('lie', 'simple', { family: value.typeKey || value.family, rank: value.rank });
      data = normalize(kind, kind, { vertices: value.selectedVertices || [value.selectedVertex], quiver: value.quiver?.enabled ? value.quiver.orientations : null });
    } else throw new Error('Imported data has a different object type.');
    if (lie) { const issues = rootObjectIssues({ kind, data }, { kind: 'lie', data: lie }); if (issues.length) throw new Error(issues.join(' ')); }
    return { data, lie };
  }
  const slot = (id, label, kind, extra = {}) => ({ id, label, kind, ...extra });
  function prepareCategoryGraph(value) {
    if (value?.kind !== 'category-calculator-prototype' || !Array.isArray(value.categories) || !Array.isArray(value.functors)) throw new Error('Choose a Category JSON preset containing categories and functors.');
    const ids = new Set();
    const categories = value.categories.map(item => {
      if (!item.id || ids.has(item.id)) throw new Error('Category IDs must be present and unique.');
      ids.add(item.id);
      return { sourceId: item.id, name: String(item.label || '\\mathcal{C}'), data: normalize('category', 'category', item), point: { x: Number(item.x), y: Number(item.y) } };
    });
    const functorIds = new Set();
    const functors = value.functors.map(item => {
      if (!item.id || functorIds.has(item.id) || !ids.has(item.domainId) || !ids.has(item.codomainId)) throw new Error('Every functor needs a unique ID and two existing category endpoints.');
      functorIds.add(item.id);
      return { sourceId: item.id, name: String(item.label || 'F'), data: normalize('functor', 'functor', { domain: item.domainId, codomain: item.codomainId, variance: item.variance }) };
    });
    return { categories, functors };
  }
  const a = () => slot('lambda', 'Young diagram λ', 'young');
  const b = () => slot('mu', 'Young diagram μ', 'young');
  const lie = () => slot('lie', 'Lie type', 'lie');
  const classicalLie = () => slot('lie', 'Lie type (A–D)', 'lie', { families: ['A','B','C','D'] });
  const dynkin = () => slot('dynkin', 'Dynkin diagram', 'dynkin');
  const strands = () => slot('strands', 'Strands', 'strands');
  const definitions = [
    ...slicing.definitions,
    { id: 'young-input', label: 'Young diagram Input', input: 'young' },
    { id: 'lie-input', label: 'Lie type Input', input: 'lie' },
    { id: 'matrix-input', label: 'Matrix Input', input: 'matrix', engine: 'matrix' },
    { id: 'category-input', label: 'Category Input', input: 'category', engine: 'category' },
    { id: 'functor-input', label: 'Functor Input', input: 'functor', engine: 'category' },
    { id: 'dynkin-input', label: 'Dynkin diagram Input', input: 'dynkin', engine: 'dynkin' },
    { id: 'strands-input', label: 'Strands Input', input: 'strands', engine: 'strand' },
    { id: 'dynkin-invariants', label: 'Dynkin Basic Invariants', engine: 'dynkin', marker: 'dynkin-invariants', slots: [lie()], fromKinds: ['dynkin'], light: true },
    { id: 'dynkin-cartan', label: 'Cartan Matrix', engine: 'dynkin', marker: 'dynkin-cartan', slots: [lie()], fromKinds: ['dynkin'], light: true },
    { id: 'dynkin-vertex', label: 'Vertex Data', engine: 'dynkin', marker: 'dynkin-vertex-data', slots: [dynkin()], light: true },
    { id: 'dynkin-parabolic', label: 'Parabolic Subalgebra', engine: 'dynkin', marker: 'dynkin-parabolic', slots: [dynkin()], light: true },
    { id: 'dynkin-starting', label: 'Starting Function / AR Quiver', engine: 'dynkin', marker: 'dynkin-starting-function', slots: [dynkin()], light: true },
    { id: 'strands-info', label: 'Strands Basic Info', engine: 'strand', marker: 'strand-basic-info', slots: [strands()], light: true },
    { id: 'strands-calculation', label: 'Strands Calculation', engine: 'strand', marker: 'strand-calculation-card', slots: [strands()] },
    { id: 'strands-relations', label: 'Strands Relations', engine: 'strand', marker: 'strand-calculation-card', slots: [], light: true },
    { id: 'strands-basis', label: 'Strands Basis', engine: 'strand', marker: 'strand-calculation-card', slots: [classicalLie()], fromKinds: ['strands'], light: true },
    { id: 'strands-display', label: 'Strands Display', engine: 'strand', marker: 'strand-direction', slots: [], display: true, light: true },
    { id: 'matrix-invariants', label: 'Matrix Basic Invariants', engine: 'matrix', marker: 'out-rank', slots: [slot('matrix', 'Matrix', 'matrix')], light: true },
    { id: 'matrix-computation', label: 'Matrix Computation', engine: 'matrix', marker: 'operation-output', slots: [slot('matrix', 'Matrix', 'matrix')] },
    { id: 'matrix-polynomial', label: 'Action on Polynomial', engine: 'matrix', marker: 'polynomial-action-output', slots: [slot('matrix', 'Matrix', 'matrix')] },
    { id: 'category-diagram', label: 'Category and Functor Diagram', engine: 'category', scene: true, light: true, slots: [] },
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
      && (!spec.families || spec.families.includes(asset.data.family))
      && !(definition.engine === 'double-young' && asset.kind === 'young' && asset.type === 'generalized');
  }
  function contextFor(computation, assets) {
    const definition = byType.get(computation.type), objects = {}, missing = [];
    if (definition.slicing) return slicing.context(computation,assets,definition);
    if (definition.scene) {
      const keys = new Set(computation.refs.nodes || []);
      for (const key of keys) {
        const asset = assets.find(asset => keyOf(asset) === key);
        if (!asset || !['category', 'functor'].includes(asset.kind)) { missing.push(key); continue; }
        objects[key] = asset;
        if (asset.kind === 'functor') for (const endpoint of ['domain', 'codomain']) {
          const category = assets.find(item => keyOf(item) === asset.data[endpoint] && item.kind === 'category');
          if (category) objects[keyOf(category)] = category;
          else missing.push((asset.plainName || asset.name) + ': ' + endpoint);
        }
      }
    }
    for (const spec of definition.slots || []) {
      if (computation.type === 'branching' && spec.id === 'mu' && !(computation.rule || 'diag-gl').startsWith('diag-')) continue;
      const asset = assets.find(asset => keyOf(asset) === computation.refs[spec.id]);
      if (compatible(asset, spec, definition)) {
        if (asset.kind === 'matrix' && asset.data.construction) {
          const deps = slicing.closure([keyOf(asset)],assets); missing.push(...deps.missing);
          deps.assets.filter(a=>a!==asset).forEach(a=>{objects[keyOf(a)]=a;});
          try { objects[spec.id] = slicing.materialize(asset,assets); } catch(error) { missing.push(error.message); }
        } else objects[spec.id] = asset;
      }
      else if (!spec.optional || computation.refs[spec.id]) missing.push(spec.label);
    }
    const dependent = objects.dynkin || objects.strands;
    if (dependent) {
      const parent = assets.find(asset => keyOf(asset) === dependent.data.lie && asset.kind === 'lie');
      if (parent) objects.lie = parent;
      missing.push(...rootObjectIssues(dependent, parent));
    }
    if (objects.lie) missing.push(...lieEngineIssues(objects.lie.data, definition.engine));
    if (objects.space) {
      const { r, n } = objects.space.data;
      for (const id of ['lambda', 'mu']) if (objects[id] && (objects[id].data.rows.length > Number(r) || Math.max(0, ...objects[id].data.rows) > Number(n) - Number(r))) missing.push(`${id === 'lambda' ? 'λ' : 'μ'} must fit inside Gr(${r}, ${n})`);
    }
    return { objects, missing, signature: JSON.stringify([computation.rule, Object.entries(objects).map(([role, asset]) => [role, keyOf(asset), asset.type, asset.data, definition.scene ? asset.name : null])]) };
  }
  function mount(api) {
    const panels = new Map(), computations = new Map(), ioRenderers = new Map();
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
      renderer.editor.configureObjectPanel({ mode: panel.definition.scene || panel.definition.slicingScene ? 'scene' : role === 'property' ? 'property' : 'input', compact: role === 'compact', marker: panel.definition.marker, operation: panel.definition.id, assetKind: panel.definition.input });
      renderer.applying = false;
      return renderer;
    }
    function nativeChange(panel, renderer, change) {
      if (renderer.applying || panel.refreshing || !renderer.editor) return;
      if (panel.definition.display) {
        const target = panels.get(panel.computation.refs.view), targetRenderer = target?.activeRenderer || target?.propertyRenderer;
        if (targetRenderer) { targetRenderer.applying = true; try { targetRenderer.editor.objectIO('view', renderer.editor.objectIO('view')); } finally { targetRenderer.applying = false; } }
        if (target?.computation && targetRenderer) { target.computation.options = targetRenderer.editor.captureAssetProperties(); target.computation.result = targetRenderer.editor.readObjectResult(); api.ioChanged(); }
        return;
      }
      if (panel.definition.input && panel.definition.input !== 'lie') {
        const asset = get(panel.assetKey); if (!asset || panel.inputIssues?.length || panel.activeRenderer !== renderer) return;
        if (asset.kind === 'strands' || panel.definition.slicing) panels.forEach(other => { if (other.definition.display && other.computation.refs.view === panel.id) refreshPanel(other); });
        const value = renderer.editor.collectAssets(); if (!value) return;
        const data = normalize(asset.kind, value.type || asset.type, value.data || { rows: value.rows });
        if (JSON.stringify(asset.data) === JSON.stringify(data) && (!value.name || asset.name === value.name)) return;
        renderer.signature = '';
        try { api.update(refOf(asset), { type: value.type || asset.type, name: value.name || asset.name, data }); feedback(panel); }
        catch (error) { feedback(panel, error.message, true); }
      } else if (panel.computation && panel.computation.status !== 'missing' && change?.interaction !== 'card-chrome') {
        if(panel.definition.slicingScene) {
          const value=renderer.editor.collectAssets(),asset=value&&get(value.assetKey);
          if(asset&&JSON.stringify(value.data)!==JSON.stringify(asset.data)) { api.update(refOf(asset),{data:value.data}); }
        }
        const options = renderer.editor.captureAssetProperties();
        const optionsChanged = JSON.stringify(options) !== JSON.stringify(panel.computation.options);
        panel.computation.options = options;
        panel.computation.result = renderer.editor.readObjectResult();
        if (panel.computation.result?.hasResult === false && (!panel.definition.light || panel.definition.slicing)) {
          panel.computation.status = panel.definition.slicing ? 'pending' : 'stale'; panel.computation.result = null; feedback(panel, panel.definition.slicing ? 'Computing…' : 'Use compute to update the result.');
        } else if (change?.interaction === 'object-compute' || panel.definition.light) {
          panel.computation.status = 'current'; feedback(panel);
        } else if (optionsChanged && !panel.definition.light) {
          panel.computation.status = 'stale'; panel.computation.result = null;
          feedback(panel, 'Options changed. Use compute to update the result.');
        }
        api.ioChanged();
        if (panel.definition.slicing) panels.forEach(other => { if (other.definition.display && other.computation.refs.view === panel.id) refreshPanel(other); });
      }
    }
    function setRendererVisible(renderer, visible, property = false) {
      const canvas = !property || ['slice', 'category-diagram','slicing-scene'].includes(renderer.operation);
      const inspector = property && !['category-diagram','slicing-scene'].includes(renderer.operation) || renderer.role === 'input' && ['matrix', 'category', 'strand','slice'].includes(renderer.engine);
      const inputOnly = renderer.role === 'input' && renderer.engine === 'category';
      renderer.editor.setCanvasActive(visible && canvas && !inputOnly);
      renderer.editor.setInspectorActive(visible && inspector);
      // The runtime sets host.hidden, so apply the property layout after activation.
      renderer.host.hidden = !visible || !canvas || inputOnly;
      renderer.inspectorHost.hidden = !visible || !inspector;
    }
    function updateDensity(panel) {
      if (panel.definition.slicing && panel.definition.input) { const asset = get(panel.assetKey); panel.inputIssues = asset ? slicing.inputIssues(asset,snapshot.assets) : []; }
      if(panel.definition.input==='matrix') { const asset=get(panel.assetKey); panel.inputIssues=[]; if(asset?.data.construction) { try {slicing.materialize(asset,snapshot.assets);}catch(error){panel.inputIssues=[error.message];} } }
      if (['dynkin','strands'].includes(panel.definition.input)) {
        const asset = get(panel.assetKey), parent = get(asset?.data.lie);
        panel.inputIssues = asset ? [...rootObjectIssues(asset, parent), ...(parent ? lieEngineIssues(parent.data, panel.definition.engine) : [])] : [];
      }
      const compact = panel.location !== 'main' || api.split() || panel.node.getBoundingClientRect().width < 600;
      panel.node.dataset.density = compact ? 'compact' : 'large';
      const visible = !panel.closed && !panel.collapsed && !panel.node.hidden && !panel.inputIssues?.length && (!panel.definition.input || !!get(panel.assetKey));
      if (panel.definition.input && panel.definition.engine) {
        if (visible && get(panel.assetKey) && !panel.activeRenderer) {
          panel.activeRenderer = createNative(panel, panel.definition.engine, 'input');
          panel.renderers.set('input', panel.activeRenderer); projectInput(panel);
        }
        if (panel.activeRenderer) setRendererVisible(panel.activeRenderer, visible);
        return;
      }
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
      if (!renderer || !asset || panel.inputIssues?.length) return;
      const assets = panel.definition.slicing ? snapshot.assets : asset.kind === 'matrix' && asset.data.construction ? slicing.closure([keyOf(asset)],snapshot.assets).assets : [asset, ...snapshot.assets.filter(item => asset.kind === 'functor' && item.kind === 'category' || ['dynkin','strands'].includes(asset.kind) && keyOf(item) === asset.data.lie)];
      const signature = JSON.stringify(assets);
      if (renderer.signature === signature) return;
      renderer.applying = true;
      try { renderer.editor.applyAssets({ assets }, refOf(asset), null, { mode: 'input', compact: renderer.role === 'compact' }); renderer.signature = signature; }
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
        const asset = api.create(spec.kind, spec.subtype ? { type: spec.subtype, ...(spec.subtype === 'grassmannian' ? {data: { r: '2', n: '4' }} : {}) } : {});
        write(keyOf(asset)); refreshPanel(panel);
        if (spec.kind === 'lie') open('lie-input', keyOf(asset), 'side');
      }, `Create ${spec.label}`));
      if (!definition.input || spec.id !== 'asset') row.append(button('edit', () => { const asset = get(read()); if (asset) api.edit(refOf(asset)); }, `Edit ${spec.label}`));
      panel.references.append(row); panel.selectors.push({ row, select, spec, definition, read });
    }
    function inputFields(panel) {
      const definition = panel.definition, name = element('input', 'workspace-control workspace-code-control'); name.type = 'text'; name.setAttribute('aria-label', 'Asset name');
      panel.name = name; panel.controls.append(field('Name', name));
      listen(name, () => {
        const asset = get(panel.assetKey); if (!asset) return;
        try { api.update(refOf(asset), { name: name.value }); feedback(panel); } catch (error) { feedback(panel, error.message, true); }
      });
      if (definition.slicing) { slicingInputFields(panel); return; }
      if (definition.input === 'matrix') {
        const mode = element('select','workspace-control'); mode.setAttribute('aria-label','Matrix construction'); mode.append(new Option('Manual matrix','manual'),new Option('Simple roots from Lie type','simple-roots'),new Option('Fundamental weights from Lie type','fundamental-weights')); panel.matrixConstruction = mode;
        mode.addEventListener('change',()=>{ const asset=get(panel.assetKey); if(!asset) return; const data={...asset.data}; if(mode.value==='manual') { try { Object.assign(data,slicing.materialize(asset,snapshot.assets).data); } catch(_) {} delete data.construction; } else data.construction={lie:asset.data.construction?.lie||'',basis:mode.value}; api.update(refOf(asset),{data}); });
        panel.controls.append(field('Construction',mode));
        referenceControl(panel,lie(),definition,()=>get(panel.assetKey)?.data.construction?.lie||'',value=>{ const asset=get(panel.assetKey); if(asset?.data.construction) api.update(refOf(asset),{data:{...asset.data,construction:{...asset.data.construction,lie:value}}}); });
      } else if (definition.input === 'young') {
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
      } else if (definition.input === 'lie') {
        const family = element('select', 'workspace-control'); family.append(...types.map(type => new Option(type, type))); panel.family = family;
        const rank = element('input', 'workspace-control'); rank.type = 'number'; rank.min = '0'; rank.step = '1'; rank.value = '3'; panel.rank = rank;
        const commit = () => { const asset = get(panel.assetKey); if (!asset) return; try { api.update(refOf(asset), { data: normalize('lie', 'simple', { family: family.value, rank: rank.value }) }); feedback(panel); } catch (error) { feedback(panel, error.message, true); } };
        listen(rank, commit); family.addEventListener('change', commit);
        panel.controls.append(field('Type', family), field('Rank', rank));
      } else if (['dynkin','strands'].includes(definition.input)) {
        referenceControl(panel, definition.input === 'strands' ? classicalLie() : lie(), definition,
          () => get(panel.assetKey)?.data.lie || '', value => { const asset = get(panel.assetKey); if (asset) api.update(refOf(asset), { data: { ...asset.data, lie: value } }); });
        panel.derivedLabel = element('p', 'workspace-status'); panel.controls.append(panel.derivedLabel);
        if (definition.input === 'dynkin') {
          const vertices = element('input', 'workspace-control'); vertices.type = 'text'; vertices.setAttribute('aria-label', 'Selected vertices'); panel.vertices = vertices;
          listen(vertices, () => {
            const asset = get(panel.assetKey); if (!asset) return;
            try {
              if (!/^\d+(?:(?:\s*,\s*|\s+)\d+)*\s*$/.test(vertices.value)) throw new Error('Enter complete vertex numbers, for example 1, 3.');
              api.update(refOf(asset), { data: { ...asset.data, vertices: vertices.value.trim().split(/[,\s]+/).map(Number) } });
            } catch (error) { feedback(panel, error.message, true); }
          });
          const quiver = element('input'); quiver.type = 'checkbox'; panel.quiver = quiver;
          quiver.addEventListener('change', () => {
            const asset = get(panel.assetKey), parent = get(asset?.data.lie); if (!asset) return;
            const data = quiver.checked && parent ? Object.fromEntries(dynkinEdges(parent.data).map(edge => [edge, 1])) : null;
            api.update(refOf(asset), { data: { ...asset.data, quiver: data } });
          });
          panel.controls.append(field('Vertices', vertices), field('Store quiver directions', quiver));
        } else {
          panel.repairWord = button('Clear generator word', () => { const asset = get(panel.assetKey); if (asset) api.update(refOf(asset), { data: { ...asset.data, generators: [] } }); });
          panel.controls.append(panel.repairWord);
        }
      } else if (definition.input === 'functor') {
        for (const endpoint of ['domain', 'codomain']) referenceControl(panel, slot(endpoint, endpoint === 'domain' ? 'Domain' : 'Codomain', 'category'), definition,
          () => get(panel.assetKey)?.data[endpoint] || '', value => {
            const asset = get(panel.assetKey); if (asset) api.update(refOf(asset), { data: { ...asset.data, [endpoint]: value } });
          });
      }
    }
    function slicingInputFields(panel) {
      const definition=panel.definition,kind=definition.input;
      const commit=patch=>{ const asset=get(panel.assetKey); if(asset) api.update(refOf(asset),{data:normalize(asset.kind,asset.type,{...asset.data,...patch})}); };
      if(kind!=='variety') {
        const n=element('input','workspace-control'); n.type='number'; n.min='2'; n.max='8'; n.step='1'; n.setAttribute('aria-label','Ambient dimension'); panel.dimension=n;
        const row=element('div','workspace-object-reference'); row.append(field('Dimension',n),button('apply',()=>{const asset=get(panel.assetKey); if(asset) api.update(refOf(asset),{data:slicing.resize(asset,n.value)});},'Apply dimension to this asset')); panel.controls.append(row);
      }
      if(kind==='polytope') {
        const type=element('select','workspace-control'); type.append(...slicing.subtypes.polytope.map(([v,t])=>new Option(t,v))); panel.slicingType=type;
        type.addEventListener('change',()=>{const a=get(panel.assetKey); if(a) api.update(refOf(a),{type:type.value,data:normalize(a.kind,type.value,a.data)});}); panel.controls.append(field('Type',type));
      }
      if(kind==='lattice') {
        const mode=element('select','workspace-control'); mode.append(...[['matrix-input','Manual basis'],['matrix-object','Matrix asset'],['dynkin','Lie root / weight lattice'],['lmfdb-field','Number field']].map(([v,t])=>new Option(t,v))); panel.latticeMode=mode;
        mode.addEventListener('change',()=>commit({basisMode:mode.value})); panel.controls.append(field('Construction',mode));
      }
      const specs=kind==='variety'?[slot('fan','Fan','fan',{optional:true}),slot('cone','Affine cone','cone',{optional:true})]:['roots','weyl','lattice'].includes(kind)?[lie(),...(kind==='lattice'?[slot('matrix','Basis matrix','matrix')]:[])]:kind==='voronoi'?[slot('lattice','Lattice','lattice'),slot('point','Cell center','point')]:kind==='fan'?[slot('characterLattice','Character lattice','lattice',{optional:true})]:[];
      specs.forEach(spec=>referenceControl(panel,spec,definition,()=>get(panel.assetKey)?.data[spec.id]||'',value=>commit({[spec.id]:value,...(kind==='variety'?{[spec.id==='fan'?'cone':'fan']:''}:{})})));
      if(kind==='fan') {
        const mode=element('select','workspace-control'); mode.append(new Option('Preset','preset'),new Option('Cone assets','cone-list')); panel.fanMode=mode;
        mode.addEventListener('change',()=>commit({constructionMode:mode.value})); panel.controls.append(field('Construction',mode));
        panel.coneChoices=element('div','workspace-object-scene-choices'); panel.controls.append(panel.coneChoices);
      }
      if(kind==='cone'||kind==='fan') panel.controls.append(button('Create toric variety',()=>{const asset=get(panel.assetKey); if(!asset) return; const v=api.create('variety',{type:'toric',data:{[kind]:keyOf(asset),dimension:asset.data.ambientDimension}}); open('toric-variety-input',keyOf(v),'side');}));
    }
    function refreshSlicingInput(panel,asset) {
      panel.inputIssues=slicing.inputIssues(asset,snapshot.assets);
      if(panel.dimension) sync(panel.dimension,asset.data.ambientDimension);
      if(panel.slicingType) panel.slicingType.value=asset.type;
      if(panel.latticeMode) panel.latticeMode.value=asset.data.basisMode;
      if(panel.fanMode) panel.fanMode.value=asset.data.constructionMode;
      panel.selectors.forEach(({row,spec})=>{
        if(asset.kind==='lattice'&&spec.id!=='asset') row.hidden=spec.id==='lie'?asset.data.basisMode!=='dynkin':asset.data.basisMode!=='matrix-object';
      });
      if(panel.coneChoices) {
        panel.coneChoices.hidden=asset.data.constructionMode!=='cone-list';
        const choices=[...snapshot.assets.filter(a=>a.kind==='cone'),...(asset.data.cones||[]).filter(key=>!get(key)).map(key=>({kind:'cone',id:key.slice(key.indexOf(':')+1),name:'Missing cone: '+key}))],signature=JSON.stringify(choices.map(a=>[keyOf(a),a.name]));
        if(signature!==panel.coneChoices.dataset.signature) {
          panel.coneChoices.replaceChildren();
          choices.forEach(a=>{ const label=element('label','workspace-check workspace-card-option'),check=element('input'); check.type='checkbox'; check.dataset.cone=keyOf(a); label.append(check,element('span','',a.plainName||a.name)); panel.coneChoices.append(label);
            check.addEventListener('change',()=>{const current=get(panel.assetKey),keys=new Set(current.data.cones); if(check.checked) keys.add(keyOf(a)); else keys.delete(keyOf(a)); api.update(refOf(current),{data:{...current.data,cones:[...keys]}});});
          }); panel.coneChoices.dataset.signature=signature;
        }
        panel.coneChoices.querySelectorAll('input').forEach(check=>{check.checked=(asset.data.cones||[]).includes(check.dataset.cone);});
      }
      feedback(panel,panel.inputIssues.join(' '),!!panel.inputIssues.length);
    }
    function ioEntries() {
      const entries = snapshot.assets.filter(asset => inputKinds.includes(asset.kind) || slicing.isAsset(asset)).map(asset => ({
        id: keyOf(asset), label: (asset.plainName || asset.name) + ' · ' + asset.typeLabel,
        canImport: true, filename: asset.kind + '-' + asset.id + '.json'
      }));
      for (const panel of panels.values()) if (panel.computation && !panel.definition.display) entries.push({
        id: 'property:' + panel.computation.id,
        label: panel.definition.label + ' · ' + Object.values(panel.computation.refs).flat().filter(Boolean).map(key => get(key)?.plainName || get(key)?.name || 'Missing asset').join(', ') + ' · ' + panel.computation.id,
        canImport: false, filename: panel.definition.id + '.json'
      });
      entries.push({ id: 'category-graph', label: 'Category / Functor graph (new assets)', canImport: true, importOnly: true });
      entries.push({ id: 'slicing-graph', label: 'Slicing experiment (new assets)', canImport: true, importOnly: true });
      return entries;
    }
    function refreshSceneChoices(panel) {
      panel.controls.classList.add('workspace-object-scene-choices');
      const assets = snapshot.assets.filter(asset => panel.definition.slicingScene ? slicing.renderable(asset) : ['category', 'functor'].includes(asset.kind));
      const signature = JSON.stringify(assets.map(asset => [keyOf(asset), asset.name]));
      if (panel.sceneSignature !== signature) {
        panel.controls.replaceChildren();
        for (const asset of assets) {
          const label = element('label', 'workspace-check workspace-card-option'), check = element('input'); check.type = 'checkbox'; check.dataset.sceneAsset = keyOf(asset);
          check.addEventListener('change', () => { const nodes = new Set(panel.computation.refs.nodes); if (check.checked) nodes.add(keyOf(asset)); else nodes.delete(keyOf(asset)); panel.computation.refs.nodes = [...nodes]; refreshPanel(panel); });
          label.append(check, element('span', '', asset.plainName || asset.name)); panel.controls.append(label);
        }
        for (const key of panel.computation.refs.nodes.filter(key => !get(key))) panel.controls.append(button('Remove missing ' + key, () => { panel.computation.refs.nodes = panel.computation.refs.nodes.filter(value => value !== key); panel.sceneSignature = ''; refreshPanel(panel); }));
        panel.sceneSignature = signature;
      }
      panel.controls.querySelectorAll('[data-scene-asset]').forEach(check => { check.checked = panel.computation.refs.nodes.includes(check.dataset.sceneAsset); });
    }
    function ioRenderer(asset) {
      const engine = slicing.isAsset(asset) ? 'slice' : asset.kind === 'strands' ? 'strand' : asset.kind === 'dynkin' ? 'dynkin' : asset.kind === 'matrix' ? 'matrix' : 'category';
      if (['dynkin','strands'].includes(asset.kind)) { const parent = get(asset.data.lie), issues = [...rootObjectIssues(asset, parent), ...(parent ? lieEngineIssues(parent.data, engine) : [])]; if (issues.length) throw new Error(issues.join(' ')); }
      let editor = ioRenderers.get(engine);
      if (!editor) {
        const host = element('section'), inspectorHost = element('section'); api.parking.append(host, inspectorHost);
        editor = window.MathWorkspaceNativeEditors.factories[engine].mount(host, { id: 'object-io-' + engine, inspectorHost });
        editor.listCards().forEach(card => editor.setCardVisible(card.key, false)); editor.configureObjectPanel({ mode: 'io' });
        editor.setCanvasActive(false); editor.setInspectorActive(false); ioRenderers.set(engine, editor);
      }
      const assets = engine === 'slice' || asset.kind === 'matrix' && asset.data.construction ? slicing.closure([keyOf(asset)],snapshot.assets).assets : [asset, ...snapshot.assets.filter(item => asset.kind === 'functor' && item.kind === 'category' && [asset.data.domain, asset.data.codomain].includes(keyOf(item)) || ['dynkin','strands'].includes(asset.kind) && keyOf(item) === asset.data.lie)];
      editor.applyAssets({ assets }, refOf(asset)); return editor;
    }
    function exportFormats(key) {
      const asset = get(key), panel = [...panels.values()].find(panel => 'property:' + panel.computation?.id === key);
      const kind = asset?.kind || panel?.definition.engine;
      const formats = slicing.isAsset(asset) || panel?.definition.slicing ? (asset?.kind==='frame'?['json','latex','plain']:['json','plain']) : ['strands','strand','dynkin'].includes(kind) ? ['json','latex','plain'] : kind === 'matrix' && panel?.definition.id !== 'matrix-invariants' ? ['json','latex','python','sage','macaulay2','mathematica','matlab','rows'] : ['category','functor'].includes(kind) ? ['json','latex','plain','preset'] : ['json'];
      return formats.map(id => ({ id, label: { json: 'JSON asset / result', latex: 'LaTeX', plain: 'Plain text', preset: 'Category JSON preset', rows: 'Rows' }[id] || id }));
    }
    function exportText(key, format = 'json') {
      const asset = get(key);
      if (asset && (inputKinds.includes(asset.kind) || slicing.isAsset(asset))) {
        if (format !== 'json') return ioRenderer(asset).objectIO('export', format);
        const parent = ['dynkin','strands'].includes(asset.kind) ? get(asset.data.lie) : null;
        const deps = slicing.references(asset).length ? slicing.closure([keyOf(asset)],snapshot.assets).assets.filter(a=>keyOf(a)!==keyOf(asset)) : [];
        return JSON.stringify({ kind: asset.kind, name: asset.name, type: asset.type, data: asset.data, ...(deps.length ? { dependencies: deps.map(a=>({kind:a.kind,id:a.id,name:a.name,type:a.type,data:a.data})) } : {}), ...(parent ? { lieAsset: { kind: 'lie', type: parent.type, data: parent.data } } : {}) }, null, 2);
      }
      const panel = [...panels.values()].find(panel => panel.computation && 'property:' + panel.computation.id === key);
      if (!panel) throw new Error('Choose an asset or property to export.');
      const computation = panel.computation;
      if (format !== 'json') {
        if (computation.status !== 'current') throw new Error('Update the property result before exporting it.');
        return panel.propertyRenderer.editor.objectIO('export', format);
      }
      return JSON.stringify({ property: computation.type, refs: computation.refs, rule: computation.rule, options: computation.options, result: computation.status === 'current' ? panel.propertyRenderer?.editor.readObjectResult() || null : null, status: computation.status }, null, 2);
    }
    function importText(key, text) {
      if (key === 'category-graph') return api.importCategoryGraph(JSON.parse(text));
      if (key === 'slicing-graph') return api.importSlicing(JSON.parse(text));
      const asset = get(key);
      if (!asset || !(inputKinds.includes(asset.kind) || slicing.isAsset(asset))) throw new Error('Choose the destination asset first.');
      if (asset.kind === 'matrix' && !text.trim().startsWith('{')) return api.update(refOf(asset), { data: normalize('matrix', 'matrix', ioRenderer(asset).objectIO('parse', text)) });
      const raw = text.trim(), value = raw.startsWith('{') ? JSON.parse(raw) : { kind: 'young', type: asset.type, data: { partition: raw } };
      if (slicing.isAsset(asset) || asset.kind === 'matrix' && (value.data?.construction || value.dependencies)) return api.importSlicing(value,refOf(asset));
      if (['dynkin','strands'].includes(asset.kind)) return api.importRootObject(refOf(asset), value);
      if (value.kind !== asset.kind) throw new Error('Imported data has a different object type.');
      const type = value.type || asset.type;
      if (!(asset.kind === 'young' ? ['partition', 'generalized'] : asset.kind === 'lie' ? ['simple'] : [asset.kind]).includes(type)) throw new Error('Imported data has an unsupported object subtype.');
      const data = normalize(asset.kind, type, value.data || {});
      if (asset.kind === 'matrix') ioRenderer({ ...asset, data }).objectIO('validate');
      api.update(refOf(asset), { type, data });
    }
    function refreshDisplayPanel(panel) {
      const select = panel.viewSelect, selected = panel.computation.refs.view || '';
      const views = [...panels.values()].filter(other => (panel.definition.viewTypes || ['strands-input']).includes(other.definition.id));
      select.replaceChildren(new Option('Choose a view…', ''), ...views.map((other, index) => new Option((get(other.assetKey)?.plainName || other.definition.label) + ' · View ' + (index + 1) + ' · ' + ({ main: 'Main area', side: 'Side panel', hidden: 'Hidden' }[other.location]), other.id))); select.value = selected;
      const target = panels.get(selected), source = target?.activeRenderer || target?.propertyRenderer;
      const valid = source && !target.inputIssues?.length && (target.computation ? target.computation.status !== 'missing' : get(target.assetKey));
      panel.computation.status = valid ? 'current' : 'missing'; panel.renderArea.hidden = !valid;
      if (valid) {
        if (!panel.propertyRenderer) { panel.propertyRenderer = createNative(panel, panel.definition.engine, 'property'); panel.propertyRenderer.operation = panel.definition.id; }
        const renderer = panel.propertyRenderer; renderer.applying = true;
        try { renderer.editor.objectIO('view', source.editor.objectIO('view')); } finally { renderer.applying = false; }
      }
      if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, !!valid && !panel.closed && !panel.collapsed && !panel.node.hidden, true);
      feedback(panel, valid ? '' : 'Choose an available view. Display settings belong to that view.');
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
            if (panel.definition.slicing) refreshSlicingInput(panel,asset);
            else if (asset.kind === 'matrix') {
              panel.matrixConstruction.value=asset.data.construction?.basis||'manual'; panel.inputIssues=[];
              panel.selectors.filter(entry=>entry.spec.id==='lie').forEach(entry=>{entry.row.hidden=!asset.data.construction;});
              if(asset.data.construction) { try { slicing.materialize(asset,snapshot.assets); } catch(error) { panel.inputIssues=[error.message]; } }
              feedback(panel,panel.inputIssues.join(' '),!!panel.inputIssues.length);
            } else if (asset.kind === 'young') { sync(panel.rows, asset.data.partition); panel.youngType.value = asset.type; }
            else if (asset.kind === 'lie') { panel.family.value = asset.data.family; sync(panel.rank, asset.data.rank); panel.rank.disabled = !['A','B','C','D'].includes(asset.data.family); }
            else if (['dynkin','strands'].includes(asset.kind)) {
              const parent = get(asset.data.lie);
              panel.inputIssues = [...rootObjectIssues(asset, parent), ...(parent ? lieEngineIssues(parent.data, panel.definition.engine) : [])];
              panel.derivedLabel.textContent = parent ? (parent.plainName || parent.name) + ' · ' + parent.data.family + parent.data.rank + (asset.kind === 'strands' && ['A','B','C','D'].includes(parent.data.family) ? ' · ' + (parent.data.family === 'A' ? 'S' + (parent.data.rank + 1) : parent.data.family + parent.data.rank) : '') : 'Choose a Lie type for this object.';
              if (panel.vertices) {
                sync(panel.vertices, asset.data.vertices.join(', ')); panel.quiver.checked = asset.data.quiver != null;
                panel.quiver.disabled = !asset.data.quiver && (!parent || !['A','D','E6','E7','E8'].includes(parent.data.family) || lieEngineIssues(parent.data, 'dynkin').length > 0);
              }
              if (panel.repairWord) panel.repairWord.hidden = !panel.inputIssues.length || !asset.data.generators.length;
              feedback(panel, panel.inputIssues.join(' '), !!panel.inputIssues.length);
            }
          }
          panel.title.textContent = `${asset?.plainName || asset?.name || 'Choose an asset'} · Input`;
          updateDensity(panel); projectInput(panel);
          panel.renderArea.hidden = !asset || !!panel.inputIssues?.length;
          if (!asset) feedback(panel, panel.assetKey ? 'The referenced asset was deleted. Choose another asset.' : 'Choose or create an asset to edit.');
        } else if (panel.definition.display) { refreshDisplayPanel(panel); } else {
          if (panel.definition.scene || panel.definition.slicingScene) refreshSceneChoices(panel);
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
              try { renderer.editor.applyAssets({ assets: Object.values(context.objects) }, refOf(context.objects.lambda), null, { mode: 'property', operation: panel.definition.id, rule: computation.rule, light: panel.definition.light, references: computation.refs, refs: Object.fromEntries(Object.entries(context.objects).map(([role, asset]) => [role, refOf(asset)])) }); }
              finally { renderer.applying = false; }
              computation.options = renderer.editor.captureAssetProperties();
              if (panel.definition.light) computation.result = renderer.editor.readObjectResult();
              if(panel.definition.slicing&&computation.result?.hasResult===false){computation.result=null;computation.status='pending';}
            }
            setRendererVisible(renderer, !panel.closed && !panel.collapsed && !panel.node.hidden, true);
            feedback(panel, computation.status === 'pending' ? 'Computing…' : computation.status === 'stale' ? 'Inputs changed. Use compute to update the result.' : '');
          }
        }
        api.title(panel.id, panel.title.textContent);
      } finally { panel.refreshing = false; }
      api.ioChanged(); api.pickerChanged();
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
      if (!panel.definition.display) panels.forEach(other => { if (other.definition.display) refreshPanel(other); });
    }
    function open(type, assetKey = '', location = 'side', options = {}) {
      const definition = byType.get(type); if (!definition) throw new Error('Unknown mathematical panel.');
      const hiddenInput = definition.input && assetKey && [...panels.values()].find(panel => panel.closed && panel.definition === definition && panel.assetKey === assetKey);
      if (hiddenInput) { move(hiddenInput, location); if (!options.keepPickerOpen) api.closePicker(); return hiddenInput; }
      const id = `object-panel-${++nextId}`;
      const node = element('section', 'card workspace-object-panel workspace-assets-inspector-card'), head = element('div', 'card-head'), title = element('span', 'card-head-label', definition.label);
      node.dataset.objectPanel = id; node.dataset.panelType = type;
      head.setAttribute('role', 'button'); head.tabIndex = 0; head.setAttribute('aria-expanded', 'true');
      const body = element('div', 'card-body workspace-card-form'), references = element('div', 'workspace-object-references'), controls = element('div', 'workspace-form-fields'), message = element('p', 'workspace-status'), renderArea = element('div', 'workspace-object-render-area'); message.setAttribute('role', 'status');
      const panel = { id, definition, node, head, title, body, references, controls, message, renderArea, selectors: [], renderers: new Map(), assetKey, location: 'hidden', closed: false, collapsed: false, refreshing: false };
      panels.set(id, panel); head.append(title, element('em', 'toggle-icon', '▾')); body.append(references, controls, message, renderArea); node.append(head, body);
      if (definition.input) {
        referenceControl(panel, slot('asset', kindLabels[definition.input], definition.input, {subtype:definition.subtype}), definition, () => panel.assetKey, value => { panel.assetKey = value; });
        inputFields(panel);
      } else {
        const computation = { id: `computation-${nextId}`, type, refs: JSON.parse(JSON.stringify(options.refs || {})), options: {}, result: null, status: 'missing', signature: '' };
        const firstSlot = definition.slots?.find(spec => spec.kind === get(assetKey)?.kind);
        if (firstSlot) computation.refs[firstSlot.id] = assetKey;
        else if (!definition.slicing && definition.fromKinds?.includes(get(assetKey)?.kind)) computation.refs.lie = get(assetKey).data.lie;
        if (definition.display) {
          const select = element('select', 'workspace-control'); select.setAttribute('aria-label', 'Target view'); panel.viewSelect = select;
          select.addEventListener('change', () => { computation.refs.view = select.value; refreshPanel(panel); });
          panel.references.append(field('View', select));
        }
        if (definition.scene && !computation.refs.nodes) computation.refs.nodes = assetKey ? [assetKey] : snapshot.assets.filter(asset => ['category', 'functor'].includes(asset.kind)).map(keyOf);
        if (definition.slicingScene && !computation.refs.nodes) computation.refs.nodes = get(assetKey) && get(assetKey).kind !== 'frame' ? [assetKey] : [];
        computations.set(computation.id, computation); panel.computation = computation;
        if (type === 'branching') {
          computation.rule = options.rule || 'diag-gl';
          const rule = element('select', 'workspace-control'); rule.dataset.branchingRule = '';
          rule.append(...branchingRules.map(([value, label]) => new Option(label, value)));
          rule.value = computation.rule;
          rule.addEventListener('change', () => { computation.rule = rule.value; refreshPanel(panel); });
          panel.references.append(field('Rule', rule));
        }
        definition.slots.forEach(spec => referenceControl(panel, spec, definition, () => computation.refs[spec.id] || '', value => { computation.refs[spec.id] = value; }));
      }
      move(panel, location); if (!options.keepPickerOpen) api.closePicker();
      panel.observer = new ResizeObserver(() => updateDensity(panel)); panel.observer.observe(node);
      return panel;
    }
    const bindDrop = (target, location) => {
      target.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-math-workspace-panel')) event.preventDefault(); });
      target.addEventListener('drop', event => { const panel = panels.get(event.dataTransfer?.getData('application/x-math-workspace-panel')); if (panel) { event.preventDefault(); if (location === 'main') api.focusPane(target.dataset.pane); move(panel, location); } });
    };
    bindDrop(api.side, 'side'); document.querySelectorAll('[data-pane]').forEach(pane => bindDrop(pane, 'main'));
    function refresh(value = api.snapshot()) { snapshot = value; panels.forEach(refreshPanel); api.ioChanged(); }
    function listCards() {
      return definitions.filter(definition => !definition.input).flatMap(definition => {
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
    slicing.setKernel((action,value)=>{
      let editor=ioRenderers.get('slice-kernel');
      if(!editor) { const host=element('section'),inspectorHost=element('section'); api.parking.append(host,inspectorHost); editor=window.MathWorkspaceNativeEditors.factories.slice.mount(host,{id:'slicing-mathematics',inspectorHost}); editor.listCards().forEach(card=>editor.setCardVisible(card.key,false)); editor.configureObjectPanel({mode:'kernel'}); editor.setCanvasActive(false); editor.setInspectorActive(false); ioRenderers.set('slice-kernel',editor); }
      return editor.objectIO(action,value);
    });
    return { panels, computations, open, move, refresh, listCards, setVisible, syncPresentation, ioEntries, exportFormats, exportText, importText, resize: () => panels.forEach(updateDensity), closed: id => { const panel = panels.get(id); if (panel) { panel.lastLocation = 'main'; panel.location = 'hidden'; panel.closed = true; refreshPanel(panel); api.pickerChanged(); } } };
  }
  const api = { normalize, definitions, contextFor, compatible, keyOf, mount, inputKinds, prepareCategoryGraph, strandContext, dynkinEdges, rootObjectIssues, lieEngineIssues, prepareRootImport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceObjects = api;
}(typeof window !== 'undefined' ? window : globalThis));
