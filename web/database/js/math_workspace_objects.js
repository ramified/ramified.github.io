(function (root) {
  'use strict';
  const rings = root.MathWorkspaceRings || (typeof require === 'function' ? require('./math_workspace_rings.js') : null);
  const diagnostics = root.MathWorkspaceDiagnostics || (typeof require === 'function' ? require('./math_workspace_diagnostics.js') : null);
  const panelRegistry = root.MathWorkspacePanelInstances || (typeof require === 'function' ? require('./math_workspace_panel_registry.js') : null);
  const slicing = root.MathWorkspaceSlicing || (typeof require === 'function' ? require('./math_workspace_slicing.js') : null);
  const mosaic = root.MathWorkspaceMosaic || (typeof require === 'function' ? require('./math_workspace_mosaic.js') : null);
  const topology = root.MathWorkspaceTopology || (typeof require === 'function' ? require('./math_workspace_topology.js') : null);
  const structures = root.MathWorkspaceStructures || (typeof require === 'function' ? require('./math_workspace_structures.js') : null);
  const keyOf = ref => ref ? `${ref.kind}:${ref.id}` : '';
  const types = ['A', 'B', 'C', 'D', 'E6', 'E7', 'E8', 'F4', 'G2'];
  const numbers = root.MathWorkspaceNumbers || (typeof require === 'function' ? require('./math_workspace_numbers.js') : null);
  const inputKinds = ['number', 'young', 'lie', 'field', 'matrix', 'category', 'functor', 'dynkin', 'strands', ...slicing.kinds, ...mosaic.kinds, ...topology.kinds, ...structures.kinds];
  const kindLabels = { ...topology.labels, ...structures.labels, ...slicing.labels, variety: 'Variety', sheaf:'Sheaf', map:'Map', number:'Number', young: 'Young diagram', lie: 'Lie type', field: 'Ring', matrix: 'Matrix', category: 'Category', functor: 'Functor', dynkin: 'Marked Dynkin diagram', strands: 'Strands' };
  const coefficientTypes = [['complex','Complex numbers ℂ'],['real','Real numbers ℝ'],['rational','Rational numbers ℚ'],['integer','Integer ring ℤ'],['finite-field','Prime field'],['finite-extension','Finite field F_(p^n)'],['rational-function','Rational function field over ℚ'],['function-field','Function field over a constant field'],['number-field','Number field']];
  function fieldLabel(data) {
    if (data.dataType === 'finite-field') return 'GF(' + data.finiteFieldPrime + ')';
    if (data.dataType === 'finite-extension') return 'GF(' + data.finiteFieldPrime + '^' + data.finiteFieldDegree + ')';
    if (data.dataType === 'function-field') return 'k(' + data.rationalFunctionVariables.join(', ') + ')' + (data.functionFieldPolynomial?'['+data.functionFieldGenerator+'] / ('+data.functionFieldPolynomial+')':'');
    if (data.dataType === 'rational-function') return 'ℚ(' + data.rationalFunctionVariables.join(', ') + ')';
    if (data.dataType === 'number-field') return 'ℚ(' + data.numberFieldSymbol + ') / (' + data.numberFieldPolynomial + ')';
    return coefficientTypes.find(([type]) => type === data.dataType)?.[1] || data.dataType;
  }
  const branchingRules = [
    ['diag-gl', 'GL(n) × GL(n) → GL(n)'], ['diag-o', 'O(n) × O(n) → O(n)'], ['diag-sp', 'Sp(2n) × Sp(2n) → Sp(2n)'],
    ['sum-gl', 'GL(n+m) → GL(n) × GL(m)'], ['sum-o', 'O(n+m) → O(n) × O(m)'], ['sum-sp', 'Sp(2n+2m) → Sp(2n) × Sp(2m)'],
    ['pol-o-gl', 'O(2n) → GL(n)'], ['pol-sp-gl', 'Sp(2n) → GL(n)'],
    ['gl-o', 'GL(n) → O(n)'], ['gl-sp', 'GL(2n) → Sp(2n)'],
    ['gl-o-gl', 'GL(2n) → O(2n) → GL(n)'], ['gl-sp-gl', 'GL(2n) → Sp(2n) → GL(n)']
  ];
  function normalize(kind, type, source = {}) {
    if(topology.kinds.includes(kind))return topology.normalize(kind,source);
    if(structures.kinds.includes(kind))return structures.normalize(kind,source);
    if(mosaic.kinds.includes(kind))return mosaic.normalize(kind,source);
    if (slicing.kinds.includes(kind) || kind === 'variety' && type === 'toric') return slicing.normalize(kind,type,source);
    if (kind === 'number') return numbers.normalize(source);
    if (kind === 'field') {
      if(source.dataType==='finite-extension'){
        const base=normalize('field','field',{...source,dataType:'finite-field'}),degree=Number(source.finiteFieldDegree??2);
        if(!Number.isSafeInteger(degree)||degree<1||degree>64)throw new Error('Choose a finite-field degree from 1 to 64.');
        return {...base,dataType:'finite-extension',finiteFieldDegree:degree};
      }
      if(source.dataType==='function-field'){
        const base=normalize('field','field',{...source,dataType:'rational-function'}),variables=base.rationalFunctionVariables.map(v=>v.trim()),generator=String(source.functionFieldGenerator??'u').trim();
        if(variables.some(v=>! /^[A-Za-z][A-Za-z0-9_]*$/.test(v))||new Set(variables).size!==variables.length||! /^[A-Za-z][A-Za-z0-9_]*$/.test(generator)||variables.includes(generator))throw new Error('Use distinct variable names and a separate algebraic generator.');
        return {...base,dataType:'function-field',rationalFunctionVariables:variables,constantField:String(source.constantField??''),functionFieldGenerator:generator,functionFieldPolynomial:String(source.functionFieldPolynomial??'').trim()};
      }
      const { dataType, finiteFieldPrime, rationalFunctionVariables, numberFieldSymbol, numberFieldPolynomial } = normalize('matrix','matrix',source);
      return { dataType, finiteFieldPrime, rationalFunctionVariables, numberFieldSymbol, numberFieldPolynomial };
    }
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
      return { rows, cols, entries: entries.map(row => row.map(String)), dataType, finiteFieldPrime, rationalFunctionVariables: rationalFunctionVariables.slice(), numberFieldSymbol: String(source.numberFieldSymbol || 'a'), numberFieldPolynomial: String(source.numberFieldPolynomial || 'a^2 - 2'), ...(source.field ? { field: String(source.field) } : {}), ...(construction ? { construction } : {}) };
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
      const rank = exceptional[family] || Number(source.rank ?? 3), min = { A: 0, B: 1, C: 1, D: 2 }[family] ?? 1;
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
    if (family === 'D' && rank >= 3) edges.push((rank - 3) + '-' + (rank - 1));
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
        if (!['A','D','E6','E7','E8'].includes(lie.family) && !(lie.rank === 1 && ['B','C'].includes(lie.family))) issues.push('Quiver directions require a simply laced diagram.');
        const edges = Object.keys(data.quiver), chainEnd = lie.family === 'D' || lie.family.startsWith('E') ? lie.rank - 2 : lie.rank - 1;
        const valid = edge => { const [i,j] = edge.split('-').map(Number); return j === i + 1 && j <= chainEnd || lie.family === 'D' && i === lie.rank - 3 && j === lie.rank - 1 || lie.family.startsWith('E') && i === 2 && j === lie.rank - 1; };
        if (edges.length !== (lie.family === 'D' && lie.rank === 2 ? 0 : Math.max(0, lie.rank - 1)) || edges.some(edge => !valid(edge))) issues.push('Stored quiver edges do not match the Lie diagram. Remove or replace the optional directions; they have been preserved.');
      }
    }
    return issues;
  }
  function lieEngineIssues(lie, engine) {
    if (engine === 'strand') {
      if (!['A','B','C','D'].includes(lie.family)) return ['Strands requires a Lie type in A–D.'];
      if (lie.family === 'D' && lie.rank < 2) return ['The Strands calculator supports D ranks starting at 2.'];
      // Bound the native palette allocation, not the mathematical asset.
      if (lie.rank > 1000) return ['This Strands view supports Lie ranks up to 1000. The asset is unchanged.'];
    } else if (['dynkin','young','double-young'].includes(engine)) {
      const min = lie.family === 'D' ? 2 : 1;
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
  const dynkin = () => slot('dynkin', 'Marked Dynkin diagram', 'dynkin');
  const strands = () => slot('strands', 'Strands', 'strands');
  function powerRows(mode, degree) {
    if (!['symmetric','exterior'].includes(mode) || !Number.isInteger(degree) || degree < 0 || degree > 12) throw new Error('Power degree must be an integer from 0 to 12.');
    return degree === 0 ? [] : mode === 'symmetric' ? [degree] : Array(degree).fill(1);
  }
  const definitions = [
    {id:'sheaf-input',label:'Input',engine:'complex',sheafInput:true,light:true,legacy:true,slots:[slot('asset','Modify object',null,{kinds:['variety','sheaf','map'],optional:true,emptyLabel:'Create / construct…'})]},
    {id:'complex-diagrams',label:'Complexes & Filtrations',engine:'complex',assetView:true,readOnly:true,structureScene:true,light:true,slots:[]},
    ...structures.kinds.map(kind=>({id:kind+'-input',label:structures.labels[kind]+' Input',input:kind})),
    {id:'complex-view',label:'Complex Display',engine:'complex',assetView:true,readOnly:true,viewRole:'asset',light:true,structure:true,slots:[slot('asset','Complex','complex')]},
    {id:'field-extension-view',label:'Place Ramification',engine:'ramification',assetView:true,readOnly:true,viewRole:'asset',light:true,structure:true,slots:[slot('asset','Field extension','field-extension')]},
    {id:'complex-operations',label:'Complex Operations',engine:'complex',structure:true,light:true,slots:[slot('asset','Complex','complex')]},
    {id:'filtration-view',label:'Filtration Display',engine:'complex',assetView:true,readOnly:true,viewRole:'asset',light:true,structure:true,slots:[slot('asset','Filtration','filtration')]},
    {id:'filtration-operations',label:'Filtration Operations',engine:'complex',structure:true,light:true,slots:[slot('asset','Filtration','filtration')]},
    ...[['invariants','Field Invariants'],['decomposition','Place Decomposition'],['selected','Selected Place']].map(([part,label])=>({id:'field-extension-'+part,label,engine:'ramification',structure:true,light:true,slots:[slot('asset','Field extension','field-extension')]})),
    ...mosaic.kinds.map(kind=>({id:kind+'-input',label:(kind==='mosaic-space'?'Mosaic Space':'Mosaic Diagram')+' Input',input:kind,engine:'mosaic'})),
    {id:'mosaic-view',label:'Mosaic Canvas',engine:'mosaic',assetView:true,readOnly:true,viewRole:'asset',light:true,slots:[slot('asset','Mosaic object',null,{kinds:mosaic.kinds})]},
    ...mosaic.propertyPanels.map(({id,label,marker,owner,canvas})=>({id,label,marker,mosaicOwner:owner,mosaicCanvas:!!canvas,...(id==='mosaic-seifert'?{assetView:true,readOnly:true}:{}),engine:'mosaic',viewRole:'asset',light:true,slots:[slot('asset',owner==='mosaic-space'?'Mosaic space':'Mosaic diagram',owner)]})),
    ...topology.kinds.map(kind=>({id:kind+'-input',label:topology.labels[kind]+' Input',input:kind})),
    {id:'knot-view',label:'Knot / Link Diagram',topologyView:true,assetView:true,readOnly:true,viewRole:'asset',light:true,slots:[slot('asset','Knot / Link','knot')]},
    {id:'knot-info',label:'Knot / Link Information',topologyView:true,viewRole:'asset',light:true,slots:[slot('asset','Knot / Link','knot')]},
    {id:'dual-graph-view',label:'Dual Graph Display',engine:'mosaic',topology:true,marker:'dual-graph-card',assetView:true,readOnly:true,viewRole:'asset',light:true,slots:[slot('asset','Dual Graph','dual-graph')]},
    {id:'dual-graph-info',label:'Dual Graph Invariants',topologyView:true,viewRole:'asset',light:true,slots:[slot('asset','Dual Graph','dual-graph')]},
    {id:'dual-graph-divisors',label:'Boundary Divisors',engine:'mosaic',topology:true,marker:'dual-graph-degenerations-card',viewRole:'asset',light:true,slots:[slot('asset','Dual Graph','dual-graph')]},
    ...slicing.definitions,
    { id: 'young-input', label: 'Young diagram Input', input: 'young' },
    { id: 'young-view', label: 'Young diagram', engine:'young', assetView:true, viewRole:'lambda', light:true, slots:[slot('lambda','Young diagram','young')] },
    { id: 'dynkin-view', label:'Marked Dynkin diagram', engine:'dynkin', assetView:true, viewRole:'dynkin', light:true, slots:[dynkin()] },
    { id: 'lie-view', label:'Dynkin diagram', engine:'dynkin', assetView:true, readOnly:true, viewRole:'lie', light:true, slots:[lie()] },
    { id: 'strands-view', label:'Strands', engine:'strand', assetView:true, viewRole:'strands', light:true, slots:[strands()] },
    { id: 'sheaf-view', label:'Variety and Sheaf Overview', engine:'complex', assetView:true, sheafView:true, overview:true, readOnly:true, viewRole:'asset', light:true, slots:[slot('asset','Add / select object',null,{kinds:['variety','sheaf','map'],optional:true,emptyLabel:'Choose an object to add…'})] },
    { id: 'geometry-view', label:'Projection / 2D Slice', engine:'slice', assetView:true, geometryView:true, slicing:true, slicingScene:true, light:true, slots:[slot('asset','Object',null,{kinds:[...slicing.kinds,'variety'],optional:true,emptyLabel:'Choose an object…'}),slot('frame','Frame','frame')] },
    { id: 'lie-input', label: 'Lie type Input', input: 'lie' },
    { id: 'number-input', label: 'Number Input', input: 'number' },
    { id: 'number-view', label: 'Number Display', objectView: true, slots: [slot('asset','Number','number')], light: true },
    { id: 'field-input', label: 'Ring Input', input: 'field' },
    { id: 'field-view', label: 'Ring Display', objectView: true, slots: [slot('asset','Ring','field')], light: true },
    { id: 'asset-view', label: 'Object Display', objectView: true, slots: [slot('asset','Asset',null,{kinds:['variety','sheaf','map','lie']})], light: true },
    { id: 'matrix-input', label: 'Matrix Input', input: 'matrix', engine: 'matrix' },
    { id: 'matrix-view', label: 'Matrix Display', engine: 'matrix', slots: [slot('matrix', 'Matrix', 'matrix')], light: true },
    { id: 'category-input', label: 'Category Input', input: 'category', engine: 'category' },
    { id: 'functor-input', label: 'Functor Input', input: 'functor', engine: 'category' },
    { id: 'dynkin-input', label: 'Marked Dynkin diagram Input', input: 'dynkin' },
    { id: 'strands-input', label: 'Strands Input', input: 'strands', engine: 'strand' },
    { id: 'dynkin-invariants', label: 'Dynkin Basic Invariants', engine: 'dynkin', marker: 'dynkin-invariants', slots: [lie()], light: true },
    { id: 'dynkin-cartan', label: 'Cartan Matrix', engine: 'dynkin', marker: 'dynkin-cartan', slots: [lie()], light: true },
    { id: 'dynkin-vertex', label: 'Vertex Data', engine: 'dynkin', marker: 'dynkin-vertex-data', slots: [dynkin()], light: true },
    { id: 'dynkin-parabolic', label: 'Parabolic Subalgebra', engine: 'dynkin', marker: 'dynkin-parabolic', slots: [dynkin()], light: true },
    { id: 'dynkin-starting', label: 'Starting Function / AR Quiver', engine: 'dynkin', marker: 'dynkin-starting-function', slots: [dynkin()], light: true },
    { id: 'strands-info', label: 'Strands Basic Info', engine: 'strand', marker: 'strand-basic-info', slots: [strands()], light: true },
    { id: 'strands-calculation', label: 'Strands Calculation', engine: 'strand', marker: 'strand-calculation-card', slots: [strands()] },
    { id: 'strands-relations', label: 'Strands Relations', engine: 'strand', marker: 'strand-calculation-card', slots: [], light: true },
    { id: 'strands-basis', label: 'Strands Basis', engine: 'strand', marker: 'strand-calculation-card', slots: [classicalLie()], light: true },
    { id: 'strands-display', label: 'Strands Display', engine: 'strand', marker: 'strand-direction', slots: [], display: true, viewTypes:['strands-view'], light: true },
    { id: 'matrix-invariants', label: 'Matrix Basic Invariants', engine: 'matrix', marker: 'out-rank', slots: [slot('matrix', 'Matrix', 'matrix')], light: true },
    { id: 'matrix-computation', label: 'Matrix Computation', engine: 'matrix', marker: 'operation-output', slots: [slot('matrix', 'Matrix', 'matrix')] },
    { id: 'matrix-polynomial', label: 'Action on Polynomial', engine: 'matrix', marker: 'polynomial-action-output', slots: [slot('matrix', 'Matrix', 'matrix')] },
    { id: 'category-diagram', label: 'Category and Functor Overview', engine: 'complex', scene: true, overview:true, readOnly:true, light: true, slots: [] },
    { id: 'statistics', label: 'Statistics', engine: 'young', marker: 'out-size', slots: [a()], light: true },
    { id: 'weight', label: 'Lie Algebra Weight', engine: 'young', marker: 'lie-weight', slots: [a(), lie()], light: true },
    { id: 'branching', label: 'Branching Rules', engine: 'young', marker: 'br-output', slots: [a(), b()] },
    { id: 'symmetric', label: 'Symmetric Functions', engine: 'young', marker: 'symfun-output', slots: [a()], light: true },
    { id: 'pair-statistics', label: 'Pair Statistics', engine: 'double-young', marker: 'stats-out', slots: [a(), b(), lie()], light: true },
    { id: 'lr', label: 'Littlewood–Richardson Decomposition', engine: 'double-young', marker: 'schur-out', slots: [a(), b(), slot('nu','Target ν','young',{optional:true,emptyLabel:'None — full decomposition'}), lie()] },
    { id: 'invariants', label: 'Lie Algebra Invariants', engine: 'double-young', marker: 'invariants-out', slots: [a(), b(), lie()], light: true },
    { id: 'kostka', label: 'Kostka Tableaux', engine: 'double-young', marker: 'kostka-out', slots: [slot('lambda', 'Shape λ', 'young'), slot('mu', 'Weight μ', 'young')] },
    { id: 'kronecker', label: 'Kronecker Decomposition', engine: 'double-young', marker: 'kronecker-out', slots: [a(), b()] },
    { id: 'plethysm', label: 'Plethysm Decomposition', engine: 'double-young', marker: 'plethysm-out', slots: [slot('mu','Representation μ','young'), slot('lambda','Outer diagram λ','young',{optional:true,emptyLabel:'Choose outer diagram λ…'})] },
    { id: 'schur', label: 'Schur Functor', engine: 'double-young', marker: 'schur-functor-out', slots: [slot('lambda', 'Representation λ', 'young'), slot('mu', 'Functor shape μ', 'young'), lie()] },
    { id: 'grassmannian', label: 'Grassmannian Cup Product', engine: 'double-young', marker: 'grassmannian-out', slots: [a(), b(), slot('space', 'Grassmannian', 'variety', { subtype: 'grassmannian' })] },
    { id: 'polynomials', label: 'Symmetric Polynomials', engine: 'double-young', marker: 'sympoly-output', slots: [a(), b()] },
    { id: 'slice', label: '2D Weight Slice', engine: 'double-young', marker: 'slice-card-body', slots: [a(), b(), lie()], light: true }
  ];
  const capabilities=Object.fromEntries(['variety','sheaf','map',...inputKinds].map(kind=>[kind,{
    open:kind==='number'?'number-view':kind==='lie'?'lie-view':kind==='young'?'young-view':kind==='dynkin'?'dynkin-view':kind==='strands'?'strands-view':kind==='matrix'?'matrix-view':kind==='field'?'field-view':['category','functor'].includes(kind)?'category-diagram':['variety','sheaf','map'].includes(kind)?'sheaf-view':slicing.kinds.includes(kind)?'geometry-view':'asset-view',
    modify:inputKinds.includes(kind)?kind+'-input':null,
    directEdit:['young','dynkin','strands','matrix'].includes(kind),
    properties:definitions.filter(d=>!d.input&&!d.assetView&&!d.objectView&&!d.display&&!d.scene&&!d.slicingScene&&d.id!=='matrix-view'&&(d.slots||[]).some(s=>(s.kinds||[s.kind]).includes(kind))).map(d=>d.id)
  }]));
  function capabilityFor(asset){return asset?.kind==='variety'&&asset.type==='toric'?{...capabilities.variety,modify:'toric-variety-input'}:capabilities[asset?.kind];}
  for(const kind of mosaic.kinds){kindLabels[kind]=kind==='mosaic-space'?'Mosaic Space':'Mosaic Diagram';capabilities[kind].open='mosaic-view';}
  for(const kind of topology.kinds)capabilities[kind].open=kind+'-view';
  for(const kind of structures.kinds)capabilities[kind].open=kind+'-view';
  for(const kind of ['complex','filtration']){capabilities[kind].open='complex-diagrams';capabilities[kind].properties=capabilities[kind].properties.filter(id=>!id.endsWith('-operations'));}
  for(const definition of definitions)if(['complex-view','filtration-view','complex-operations','filtration-operations'].includes(definition.id))definition.legacy=true;
  const byType = new Map(definitions.map(definition => [definition.id, definition]));
  function compatible(asset, spec, definition) {
    return !!asset && (spec.kinds || [spec.kind]).includes(asset.kind) && (!spec.subtype || asset.type === spec.subtype)
      && (!spec.requiresField || rings.isField(asset))
      && !(definition.geometryView&&asset.kind==='variety'&&asset.type!=='toric')
      && !(spec.kind==='frame'&&definition.frameDimension&&asset.data.ambientDimension!==definition.frameDimension)
      && (!spec.families || spec.families.includes(asset.data.family))
      && !(definition.engine === 'double-young' && asset.kind === 'young' && asset.type === 'generalized');
  }
  function contextFor(computation, assets, validation = diagnostics.analyze(assets)) {
    const definition = byType.get(computation.type), objects = {}, missing = [];
    const invalidMessages=[...new Set(Object.values(computation.refs||{}).flat().filter(key=>typeof key==='string').flatMap(key=>diagnostics.messages(validation[key],assets)))];
    if (definition.slicing) {const context=slicing.context(computation,assets,definition);return {...context,missing:[...context.missing,...invalidMessages],invalid:!!invalidMessages.length};}
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
      const original = assets.find(asset => keyOf(asset) === computation.refs[spec.id]);
      const asset = definition.engine==='mosaic'?mosaic.propertyAsset(definition.id,original,assets):original;
      if (compatible(asset, spec, definition)) {
        if (asset.kind === 'matrix') {
          const deps = slicing.closure([keyOf(asset)],assets); missing.push(...deps.missing);
          deps.assets.filter(a=>a!==asset).forEach(a=>{objects[keyOf(a)]=a;});
          try { objects[spec.id] = slicing.materialize(asset,assets); } catch(error) { missing.push(error.message); }
        } else objects[definition.scene ? keyOf(asset) : spec.id] = asset;
      }
      else if (!spec.optional || computation.refs[spec.id]) missing.push(spec.label);
    }
    if (objects.asset?.kind === 'number') {
      const parent=assets.find(a=>keyOf(a)===objects.asset.data.field&&a.kind==='field');
      if(parent)objects.field=parent;else missing.push('Coefficient ring');
    }
    if(definition.structureScene){
      for(const key of computation.refs.nodes||[]){
        const asset=assets.find(a=>keyOf(a)===key&&['complex','filtration'].includes(a.kind));
        if(!asset)continue;
        objects[key]=asset;missing.push(...structures.issues(asset,assets));
        for(const ref of structures.references(asset.kind,asset.data)){const item=assets.find(a=>keyOf(a)===ref);if(item)objects[ref]=item;}
      }
    }
    if(definition.structure&&objects.asset){
      missing.push(...structures.issues(objects.asset,assets));
      const pending=structures.references(objects.asset.kind,objects.asset.data),visited=new Set();
      while(pending.length){const ref=pending.pop();if(visited.has(ref))continue;visited.add(ref);const item=assets.find(a=>keyOf(a)===ref);if(item){objects[ref]=item;if(item.kind==='field'){missing.push(...structures.issues(item,assets));pending.push(...structures.references('field',item.data));}}}
    }
    if (definition.sheafView) {
      // Project the same authoritative records used by the sheaf calculator.
      // A sheaf needs its base, and a map needs both endpoints and their bases.
      const visited = new Set(), pending = [];
      for (const key of new Set([...(computation.refs.nodes || []),...(objects.asset ? [keyOf(objects.asset)] : [])])) {
        const asset = assets.find(asset => keyOf(asset) === key && ['variety','sheaf','map'].includes(asset.kind));
        if (!asset) { missing.push(key); continue; }
        if (asset !== objects.asset) objects[key] = asset;
        pending.push(asset);
      }
      while (pending.length) for (const ref of pending.pop().dependencies || []) {
        const key = keyOf(ref);
        if (visited.has(key)) continue;
        visited.add(key);
        const dependency = assets.find(asset => keyOf(asset) === key);
        if (!dependency) { missing.push(key); continue; }
        if (dependency !== objects.asset) objects[key] = dependency;
        pending.push(dependency);
      }
    }
    if (definition.sheafView) { try { numbers.validateGraph(Object.values(objects)); } catch(error) { missing.push(error.message); } }
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
    if (computation.type === 'plethysm' && !objects.lambda) missing.push('Outer diagram λ');
    if(objects.asset&&topology.kinds.includes(objects.asset.kind)){try{objects.asset={...objects.asset,data:topology.resolve(objects.asset,assets)};}catch(error){missing.push(error.message);}}
    if(definition.engine==='mosaic'&&objects.asset&&!definition.topology){missing.push(...mosaic.issues(objects.asset,assets));const space=assets.find(a=>keyOf(a)===objects.asset.data.space);if(space)objects.mosaicSpace=space;}
    return { objects, missing:[...new Set([...missing,...invalidMessages])], invalid:!!invalidMessages.length, signature: JSON.stringify([computation.rule, computation.settings, Object.entries(objects).map(([role, asset]) => [role, keyOf(asset), asset.type, asset.data, definition.scene || definition.assetView || definition.objectView || definition.id==='matrix-view' ? asset.name : null])]) };
  }
  function mount(api) {
    const registry=panelRegistry.create(key=>!!get(key));
    const panels = new Map(), computations = new Map(), ioRenderers = new Map(), legacyViews=new Map(), dynkinFocus=new Map(),dynkinSelectionModes=new Map();
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
    function ensureMatrixField(key) {
      const matrix=get(key); if(!matrix || matrix.kind!=='matrix' || matrix.data.field || matrix.data.construction) return;
      const data=normalize('field','field',matrix.data);
      const existing=snapshot.assets.find(a=>a.kind==='field'&&JSON.stringify(a.data)===JSON.stringify(data));
      const parent=existing||api.ensureDefault('field',{data});
      api.update(refOf(matrix),{data:{...matrix.data,field:keyOf(parent)}});
    }
    function editMatrixAsset(asset) {
      const key=keyOf(asset);
      const existing=find('matrix-input',key);
      if(existing)return reveal(existing);
      return open('matrix-input',key,'side');
    }
    function latticeBasisMatrix(panel) {
      const asset=get(panel.assetKey);if(!asset)return;
      let matrix=get(asset.data.matrix);
      if(asset.data.basisMode!=='matrix-object') {
        const n=asset.data.ambientDimension,basis=asset.data.basisRows||slicing.identity(n);
        const data=normalize('matrix','matrix',{rows:n,cols:n,entries:basis.map(row=>row.map(String)),dataType:'real'});
        matrix=api.create('matrix',{data});
        api.update(refOf(asset),{data:{...asset.data,basisMode:'matrix-object',matrix:keyOf(matrix)}});
      }
      if(!matrix)throw new Error('Choose or create a basis matrix first.');
      return matrix;
    }
    function createNative(panel, engine, role) {
      const host = element('section', 'workspace-object-native'), inspectorHost = element('section', 'workspace-object-native-inspector');
      host.dataset.objectEngine = engine;
      panel.renderArea.append(host, inspectorHost);
      const renderer = { host, inspectorHost, engine, role, editor: null, applying: true };
      renderer.editor = window.MathWorkspaceNativeEditors.factories[engine].mount(host, { workspaceObjectPanel:true,
        id: `${panel.id}-${role}`, inspectorHost,
        onChange: change => nativeChange(panel, renderer, change),
        onCollectAssets: () => overviewAction(panel,'collect'),
        onCollectComplexAssets: entries => {
          const added=[];
          for(const entry of entries||[]){if(!['chain-complex','filtration'].includes(entry.kind))continue;const kind=entry.kind==='filtration'?'filtration':'complex',asset=api.create(kind,{data:structures.fromComplexEntry(entry),view:root.MathWorkspacePresentation.split(kind,{legacy:entry}).view});added.push(keyOf(asset));if(!panel.definition.structureScene)open('complex-diagrams',keyOf(asset),'main');}
          if(panel.definition.structureScene){panel.computation.refs.nodes=[...new Set([...panel.computation.refs.nodes,...added])];refreshPanel(panel);}
          return added;
        },
        onEditDiagramAsset:key=>{const asset=get(key);if(asset)open(asset.kind+'-input',key,'side');},
        onEditDiagramTerm:(key,part,index)=>{
          const asset=get(key),term=asset?.data[part]?.[index];if(!term)return;
          if(term.ref&&get(term.ref)){api.edit(refOf(get(term.ref)));return;}
          const input=open(asset.kind+'-input',key,'side');input.structureRows?.find(row=>row.kind===part&&row.i===index)?.symbol.focus();
        },
        onRemoveDiagramAssets:keys=>{panel.computation.refs.nodes=panel.computation.refs.nodes.filter(key=>!keys.includes(key));refreshPanel(panel);},
        onOverviewAction: action => overviewAction(panel,action),
        onRemoveOverviewAsset: key => removeOverviewAsset(panel,key),
        onExportOverview: format => exportCategoryOverview(panel,format),
        onSelectAsset: ref => {
          if (!panel.definition.overview || renderer.applying || (ref && !get(keyOf(ref)))) return;
          panel.computation.refs.active = keyOf(ref);
          api.selectAsset?.(ref); api.ioChanged();
        },
        onError: error => feedback(panel, error.message, true)
      });
      renderer.editor.listCards().forEach(card => renderer.editor.setCardVisible(card.key, false));
      renderer.editor.configureObjectPanel({ mode: panel.definition.scene || panel.definition.slicingScene ? 'scene' : panel.definition.assetView?'view':role === 'property' ? 'property' : 'modify', compact: role === 'compact', marker: panel.definition.marker, operation: panel.definition.id, assetKind: panel.definition.input });
      renderer.operation=panel.definition.id;
      renderer.applying = false;
      return renderer;
    }
    function nativeChange(panel, renderer, change) {
      if (renderer.applying || panel.refreshing || !renderer.editor) return;
      if(panel.definition.sheafInput){
        if(!renderer.editor.objectIO('input-changed'))return;
        if(renderer.sourceRevision!==snapshot.revision){feedback(panel,'Assets changed while this draft was open. Reload saved inputs before applying this draft.',true);return;}
        renderer.committing=true;
        try{
          const result=api.commitSheafGraph(renderer.editor.objectIO('input-graph'),renderer.managedKeys||[]);
          renderer.editor.objectIO('input-ack',{ids:result.ids,assets:snapshot.assets});renderer.managedKeys=result.keys;
          renderer.sourceRevision=snapshot.revision;
          panel.computation.signature=JSON.stringify([panel.computation.refs.asset,snapshot.assets.filter(a=>['variety','sheaf','map','number','field','complex'].includes(a.kind)&&snapshot.diagnostics?.[keyOf(a)]?.valid!==false)]);
          feedback(panel,'Saved to Assets.');
        }catch(error){feedback(panel,error.message,true);}
        finally{renderer.committing=false;}
        return;
      }
      const dynkinKey=['dynkin-view','dynkin-starting'].includes(panel.definition.id)?panel.computation.refs.dynkin:null;
      const selectionMode=dynkinKey?renderer.editor.objectIO('selection-mode'):null;
      if(dynkinKey&&change?.interaction==='dynkin-vertex-focus'){
        const key=dynkinKey,vertex=renderer.editor.objectIO('vertex-focus');
        if(Number.isInteger(vertex)){
          dynkinFocus.set(key,vertex);dynkinSelectionModes.set(key,selectionMode);
          for(const target of panels.values())if(['dynkin-vertex','dynkin-view','dynkin-starting'].includes(target.definition.id)&&target.computation.refs.dynkin===key&&target.propertyRenderer&&!['missing','invalid'].includes(target.computation.status)){
            const native=target.propertyRenderer;native.applying=true;
            try{native.editor.objectIO('selection-mode',selectionMode);native.editor.objectIO('vertex-focus',vertex);target.computation.options=native.editor.captureAssetProperties();target.computation.result=native.editor.readObjectResult();}finally{native.applying=false;}
          }
        }
      }
      if(panel.definition.id==='dynkin-starting'&&!['missing','invalid'].includes(panel.computation.status)){
        const asset=get(panel.computation.refs.dynkin),value=renderer.editor.collectAssets();
        if(asset&&value&&(JSON.stringify(asset.data.quiver)!==JSON.stringify(value.data.quiver)||JSON.stringify(asset.data.vertices)!==JSON.stringify(value.data.vertices))){
          // AR header clicks use the same selection rules as the main diagram.
          try{api.update(refOf(asset),{data:{...asset.data,vertices:value.data.vertices,quiver:value.data.quiver}});}catch(error){feedback(panel,error.message,true);return;}
        }
      }
      if (['mosaic-metric','mosaic-poincare'].includes(panel.definition.id)) {
        const asset=get(panel.computation.refs.asset);
        const backgroundMetric=renderer.editor.objectIO('mosaic-payload')?.backgroundMetric;
        if(asset&&backgroundMetric&&backgroundMetric!==asset.data.backgroundMetric)
          api.update(refOf(asset),{data:{...asset.data,backgroundMetric}});
        return;
      }
      if (panel.definition.display) {
        const target = panels.get(panel.computation.refs.view), targetRenderer = target?.activeRenderer || target?.propertyRenderer;
        if (targetRenderer) { targetRenderer.applying = true; try { targetRenderer.editor.objectIO('view', renderer.editor.objectIO('view')); } finally { targetRenderer.applying = false; } }
        if (target?.computation && targetRenderer) { target.computation.options = targetRenderer.editor.captureAssetProperties(); target.computation.result = targetRenderer.editor.readObjectResult(); api.ioChanged(); }
        return;
      }
      if (panel.definition.input && panel.definition.input !== 'lie' || panel.definition.id==='matrix-view' || panel.definition.assetView&&!panel.definition.geometryView&&!panel.definition.readOnly) {
        const asset = get(panel.definition.id==='matrix-view'?panel.computation.refs.matrix:panel.definition.assetView?panel.computation.refs[panel.definition.viewRole]:panel.assetKey); if (!asset || panel.inputIssues?.length || (panel.definition.input && panel.activeRenderer !== renderer)) return;
        if (asset.kind === 'strands' || panel.definition.slicing) panels.forEach(other => { if (other.definition.display && other.computation.refs.view === panel.id) refreshPanel(other); });
        const value = renderer.editor.collectAssets(); if (!value) return;
        const data = normalize(asset.kind, value.type || asset.type, value.data || { rows: value.rows });
        if (JSON.stringify(asset.data) === JSON.stringify(data) && (!value.name || asset.name === value.name)) {if(panel.computation)panel.computation.options=renderer.editor.captureAssetProperties();api.ioChanged();return;}
        renderer.signature = '';
        try { api.update(refOf(asset), { type: value.type || asset.type, name: value.name || asset.name, data }); feedback(panel); }
        catch (error) { feedback(panel, error.message, true); }
      } else if (panel.computation && !['missing','invalid'].includes(panel.computation.status) && change?.interaction !== 'card-chrome') {
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
      if (renderer.operation==='dynkin-cartan') {renderer.editor.setCanvasActive(false);renderer.editor.setInspectorActive(false);renderer.host.hidden=true;renderer.inspectorHost.hidden=true;return;}
      const mosaicCanvas=mosaic.propertyPanels.some(panel=>panel.id===renderer.operation&&panel.canvas);
      const view=['sheaf-input','dual-graph-view','complex-diagrams','complex-operations','filtration-operations','filtration-view'].includes(renderer.operation)||renderer.operation.startsWith('field-extension-')||mosaicCanvas||['complex-view','field-extension-view','mosaic-view','young-view','dynkin-view','lie-view','strands-view','sheaf-view','geometry-view','slice','category-diagram','slicing-scene'].includes(renderer.operation);
      const canvas = !property || view;
      const inspector = mosaicCanvas || property && !view || renderer.role === 'input' && ['mosaic','matrix', 'category', 'strand','slice'].includes(renderer.engine);
      // Slicing inputs edit Assets; the dedicated slicing scene owns the canvas.
      const inputOnly = renderer.role === 'input' && (['category', 'slice','strand','matrix'].includes(renderer.engine) || renderer.constructedMatrix);
      renderer.editor.setCanvasActive(visible && canvas && !inputOnly);
      renderer.editor.setInspectorActive(visible && inspector && !renderer.hideInputInspector);
      // The runtime sets host.hidden, so apply the property layout after activation.
      renderer.host.hidden = !visible || !canvas || inputOnly;
      renderer.inspectorHost.hidden = !visible || !inspector || renderer.hideInputInspector;
    }
    function updateDensity(panel) {
      if(panel.definition.engine==='mosaic'&&panel.definition.input){const asset=get(panel.assetKey);panel.inputIssues=asset?mosaic.issues(asset,snapshot.assets):[];feedback(panel,panel.inputIssues.join(' '),!!panel.inputIssues.length);}
      if (panel.definition.slicing && panel.definition.input) { const asset = get(panel.assetKey); panel.inputIssues = asset ? slicing.inputIssues(asset,snapshot.assets) : []; }
      if(panel.definition.input==='matrix') { const asset=get(panel.assetKey); panel.inputIssues=[]; if(asset) { try {slicing.materialize(asset,snapshot.assets);}catch(error){panel.inputIssues=[error.message];} } }
      if (['dynkin','strands'].includes(panel.definition.input)) {
        const asset = get(panel.assetKey), parent = get(asset?.data.lie);
        panel.inputIssues = asset ? [...rootObjectIssues(asset, parent), ...(parent ? lieEngineIssues(parent.data, panel.definition.engine) : [])] : [];
      }
      const compact = panel.location !== 'main' || api.split() || panel.node.getBoundingClientRect().width < 600;
      panel.node.dataset.density = compact ? 'compact' : 'large';
      for(const renderer of [...panel.renderers.values(),panel.propertyRenderer].filter(Boolean)) renderer.editor.setViewportDensity?.(panel.node.dataset.density);
      const visible = !panel.closed && !panel.collapsed && !panel.node.hidden && !panel.inputIssues?.length && (!panel.definition.input || !!get(panel.assetKey));
      if (panel.definition.input && panel.definition.engine) {
        if (visible && get(panel.assetKey) && !panel.activeRenderer) {
          panel.activeRenderer = createNative(panel, panel.definition.engine, 'input');
          panel.renderers.set('input', panel.activeRenderer); projectInput(panel);
        }
        if (panel.activeRenderer) {
          const asset=get(panel.assetKey);
          panel.activeRenderer.constructedMatrix=panel.definition.input==='matrix'&&!!asset?.data.construction;
          panel.activeRenderer.hideInputInspector=panel.activeRenderer.constructedMatrix||panel.definition.input==='lattice'&&['matrix-input','matrix-object'].includes(asset?.data.basisMode);
          setRendererVisible(panel.activeRenderer, visible);
        }
        return;
      }
      if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, visible && !['missing','invalid'].includes(panel.computation.status), true);
    }
    function projectInput(panel) {
      const asset = get(panel.assetKey), renderer = panel.activeRenderer;
      if (!renderer || !asset || panel.inputIssues?.length) return;
      const assets = panel.definition.slicing || panel.definition.engine==='mosaic' ? snapshot.assets : asset.kind === 'matrix' ? slicing.closure([keyOf(asset)],snapshot.assets).assets : [asset, ...snapshot.assets.filter(item => asset.kind === 'functor' && item.kind === 'category' || ['dynkin','strands'].includes(asset.kind) && keyOf(item) === asset.data.lie)];
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
        select.replaceChildren(new Option(spec.emptyLabel || (spec.optional ? 'None (when the rule uses one input)' : `Choose ${spec.label}…`), ''));
        candidates.forEach(asset => select.append(new Option(`${asset.plainName || asset.name} · ${asset.definition || asset.typeLabel}`, keyOf(asset))));
        if (value && !candidates.some(asset => keyOf(asset) === value)) {const existing=get(value);select.append(new Option(existing?(existing.plainName||existing.name)+' · incompatible':'Missing asset', value));}
        select.dataset.signature = signature;
      }
      select.value = value || '';
    }
    function referenceControl(panel, spec, definition, read, write, actions = {}) {
      const row = element('div', 'workspace-object-reference'), select = element('select', 'workspace-control'); select.dataset.objectReference = spec.id;
      select.setAttribute('aria-label', spec.label);
      const commit = value => {
        write(value);
        if(definition.slicingScene) {
          const refs=panel.computation.refs;
          if(spec.id==='asset'&&value&&get(value)?.kind!=='frame') refs.nodes=[...new Set([...(refs.nodes||[]),value])];
          if(spec.id==='asset'&&get(value)?.kind==='frame') refs.frame=value;
          if(spec.id==='frame'||spec.id==='asset'&&get(value)?.kind==='frame') {
            const frame=get(refs.frame);
            refs.nodes=(refs.nodes||[]).filter(key=>key!==refs.frame&&slicing.fitsFrame(get(key),frame,snapshot.assets));
            if(refs.asset&&refs.asset!==refs.frame&&!slicing.fitsFrame(get(refs.asset),frame,snapshot.assets)) refs.asset='';
          }
        }
        if (definition.overview && value) {
          panel.computation.refs.nodes = [...new Set([...(panel.computation.refs.nodes || []),value])];
          panel.computation.refs.active = value;
        }
        refreshPanel(panel);
        if (definition.overview && value) selectOverviewAsset(panel,value);
      };
      select.addEventListener('change', () => commit(select.value));
      select.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-math-workspace-asset')) event.preventDefault(); });
      select.addEventListener('drop', event => {
        event.preventDefault(); let key = event.dataTransfer?.getData('application/x-math-workspace-asset') || '';
        try { const parsed = JSON.parse(key); key = typeof parsed === 'string' ? parsed : keyOf(parsed); } catch (_) {}
        if (compatible(get(key), spec, definition)) commit(key);
      });
      row.append(field(spec.label, select));
      if(definition.objectView || definition.assetView || definition.id==='matrix-view') { panel.references.append(row);panel.selectors.push({row,select,spec,definition,read});return; }
      row.append(button('+', () => {
        if(actions.create){actions.create();return;}
        const asset = api.create(spec.kind, spec.requiresField ? {data:{dataType:'rational'}} : spec.subtype ? { type: spec.subtype, ...(spec.subtype === 'grassmannian' ? {data: { r: '2', n: '4' }} : {}) } : {});
        write(keyOf(asset)); refreshPanel(panel);
        if (['lie','field'].includes(spec.kind)) open(spec.kind+'-input', keyOf(asset), 'side');
      }, `Create ${spec.label}`));
      if (!definition.input || spec.id !== 'asset') row.append(button('edit', () => { if(actions.edit){actions.edit();return;}const asset = get(read()); if (asset) api.edit(refOf(asset)); }, `Edit ${spec.label}`));
      panel.references.append(row); panel.selectors.push({ row, select, spec, definition, read });
    }
    function inputFields(panel) {
      const definition = panel.definition, name = element('input', 'workspace-control workspace-code-control'); name.type = 'text'; name.setAttribute('aria-label', 'Asset name');
      panel.name = name; panel.controls.append(field('Name', name));
      listen(name, () => {
        const asset = get(panel.assetKey); if (!asset) return;
        try { api.update(refOf(asset), { name: name.value }); feedback(panel); } catch (error) { feedback(panel, error.message, true); }
      });
      if(structures.kinds.includes(definition.input)){structureInputFields(panel);return;}
      if(topology.kinds.includes(definition.input)){
        panel.topologyInput=root.MathWorkspaceTopologyUI.mountInput(panel.controls,{read:()=>get(panel.assetKey),assets:()=>snapshot.assets,update:data=>{const a=get(panel.assetKey);if(a)api.update(refOf(a),{data});},feedback:(text,error)=>feedback(panel,text,error),open,generatePreset});return;
      }
      if (definition.slicing) { slicingInputFields(panel); return; }
      if(definition.input==='mosaic-diagram'){
        referenceControl(panel,slot('space','Mosaic space','mosaic-space'),definition,()=>get(panel.assetKey)?.data.space||'',value=>{const asset=get(panel.assetKey);if(asset)api.update(refOf(asset),{data:{...asset.data,space:value}});});
        panel.controls.append(element('p','workspace-card-context','Decorations belong to this diagram. Use Edit Mosaic space to change its shared background.'));
        const generate=kind=>{const diagram=get(panel.assetKey);if(!diagram)return;try{
          const data={...topology.fromMosaic(kind,diagram,snapshot.assets),source:keyOf(diagram),hasSnapshot:true};
          const existing=snapshot.assets.find(a=>a.kind===kind&&a.data.source===keyOf(diagram));
          const asset=existing||api.create(kind,{data});open(kind+'-input',keyOf(asset),'side');open(kind+'-view',keyOf(asset),'main');feedback(panel,'Created / opened '+(asset.plainName||asset.name)+'.');
        }catch(error){feedback(panel,error.message,true);}};
        for(const kind of topology.kinds){const action=button('Generate '+topology.labels[kind],()=>generate(kind));action.dataset.mosaicGenerate=kind;panel.controls.append(action);}
        return;
      }
      if(definition.input==='mosaic-space'){panel.controls.append(element('p','workspace-card-context','Changes to this background affect every diagram that references it. Diagram decorations are preserved.'));return;}
      if (definition.input === 'number') {
        referenceControl(panel,slot('field','Coefficient ring','field'),definition,()=>get(panel.assetKey)?.data.field||'',value=>{
          const asset=get(panel.assetKey);if(asset)try{api.update(refOf(asset),{data:{...asset.data,field:value}});feedback(panel);}catch(error){feedback(panel,error.message,true);}
        });
        const mode=element('select','workspace-control');mode.setAttribute('aria-label','Number mode');mode.append(new Option('Symbolic','symbolic'),new Option('Value','value'));
        const value=element('input','workspace-control workspace-code-control');value.type='text';value.setAttribute('aria-label','Number value');value.spellcheck=false;
        const replace=element('input');replace.type='checkbox';replace.setAttribute('aria-label','Substitute value in calculations');
        const positive=element('input');positive.type='checkbox';positive.setAttribute('aria-label','Assume positive');
        const commit=()=>{const asset=get(panel.assetKey);if(!asset)return;panel.numberDraftMode={key:panel.assetKey,mode:mode.value,value:value.value,replace:replace.checked,positive:positive.checked};try{api.update(refOf(asset),{data:{...asset.data,hasValue:mode.value==='value',value:value.value,replaceWithValue:replace.checked,positive:positive.checked}});panel.numberDraftMode=null;feedback(panel);}catch(error){feedback(panel,error.message,true);}};
        mode.addEventListener('change',()=>{replace.checked=mode.value==='value';panel.numberValueRow.hidden=panel.numberReplaceRow.hidden=mode.value!=='value';panel.numberPositiveRow.hidden=mode.value==='value';commit();});listen(value,commit);replace.addEventListener('change',commit);positive.addEventListener('change',commit);
        panel.numberControls={mode,value,replace,positive};panel.numberValueRow=field('Value',value);panel.numberReplaceRow=field('Substitute value in calculations',replace);panel.numberPositiveRow=field('Assume positive',positive);
        panel.controls.append(field('Mode',mode),panel.numberValueRow,panel.numberReplaceRow,panel.numberPositiveRow,element('p','workspace-card-context','Choose Asset in a variety’s Genus or a sheaf’s Rank to use this Number. References follow renames and shared value changes.'));
      } else if (definition.input === 'field') {
        const type=element('select','workspace-control'); type.setAttribute('aria-label','Coefficient type'); type.append(...coefficientTypes.map(([value,label])=>new Option(label,value))); panel.coefficientType=type;panel.ringClassification=element('p','workspace-card-context');panel.ringClassification.setAttribute('role','status');panel.controls.append(panel.ringClassification);
        const prime=element('input','workspace-control'); prime.type='number'; prime.min='2'; prime.max='999983'; prime.step='1'; prime.setAttribute('aria-label','Prime');
        const variables=element('input','workspace-control'); variables.type='text'; variables.setAttribute('aria-label','Variables');
        const symbol=element('input','workspace-control'); symbol.type='text'; symbol.setAttribute('aria-label','Generator');
        const polynomial=element('input','workspace-control workspace-code-control'); polynomial.type='text'; polynomial.setAttribute('aria-label','Defining polynomial');
        const degree=element('input','workspace-control');degree.type='number';degree.min='1';degree.max='64';degree.step='1';degree.setAttribute('aria-label','Finite-field degree');
        const functionGenerator=element('input','workspace-control');functionGenerator.type='text';functionGenerator.setAttribute('aria-label','Algebraic generator');
        const functionPolynomial=element('input','workspace-control');functionPolynomial.type='text';functionPolynomial.setAttribute('aria-label','Algebraic relation (optional)');
        panel.fieldControls={finiteFieldPrime:prime,finiteFieldDegree:degree,rationalFunctionVariables:variables,numberFieldSymbol:symbol,numberFieldPolynomial:polynomial,functionFieldGenerator:functionGenerator,functionFieldPolynomial:functionPolynomial}; panel.fieldRows={};
        referenceControl(panel,slot('constantField','Constant field','field',{requiresField:true}),definition,()=>get(panel.assetKey)?.data.constantField||'',value=>{const asset=get(panel.assetKey);if(asset)try{api.update(refOf(asset),{data:{...asset.data,constantField:value}});feedback(panel);}catch(error){feedback(panel,error.message,true);}});
        const commit=()=>{
          const asset=get(panel.assetKey); if(!asset)return;
          try {
            const data={...asset.data,dataType:type.value};
            if(['finite-field','finite-extension'].includes(type.value)) { if(!prime.value.trim())return; data.finiteFieldPrime=Number(prime.value); }
            if(type.value==='finite-extension')data.finiteFieldDegree=degree.value.trim()?Number(degree.value):asset.data.finiteFieldDegree??2;
            if(['rational-function','function-field'].includes(type.value)) { if(!variables.value.trim())return; data.rationalFunctionVariables=variables.value.split(',').map(v=>v.trim()); }
            if(type.value==='function-field'){
              if(!data.constantField)data.constantField=keyOf(api.ensureDefault('field',{data:{dataType:'rational'}}));
              data.functionFieldGenerator=functionGenerator.value||data.functionFieldGenerator||'u';data.functionFieldPolynomial=functionPolynomial.value;
            }
            if(type.value==='number-field') { if(!symbol.value.trim()||!polynomial.value.trim())return; data.numberFieldSymbol=symbol.value;data.numberFieldPolynomial=polynomial.value; }
            api.update(refOf(asset),{data:normalize('field','field',data)}); feedback(panel);
          } catch(error) { feedback(panel,error.message,true); }
        };
        type.addEventListener('change',commit); panel.controls.append(field('Type',type));
        for(const [key,control] of Object.entries(panel.fieldControls)) { listen(control,commit); const row=field(control.getAttribute('aria-label'),control);if(key.endsWith('Polynomial'))row.classList.remove('workspace-field-inline');panel.fieldRows[key]=row;panel.controls.append(row); }
        panel.functionFieldNote=element('p','workspace-card-context','Leave the algebraic relation empty for k(t₁,…,tₙ). Otherwise give a polynomial in the algebraic generator over this rational function field. This is a declared field presentation; irreducibility is not verified.');panel.controls.append(panel.functionFieldNote);
      } else if (definition.input === 'matrix') {
        const mode = element('select','workspace-control'); mode.setAttribute('aria-label','Matrix construction'); mode.append(new Option('Manual matrix','manual'),new Option('Simple roots from Lie type','simple-roots'),new Option('Fundamental weights from Lie type','fundamental-weights')); panel.matrixConstruction = mode;
        mode.addEventListener('change',()=>{ const asset=get(panel.assetKey); if(!asset) return; const data={...asset.data}; if(mode.value==='manual') { try { Object.assign(data,slicing.materialize(asset,snapshot.assets).data); } catch(_) {} delete data.construction;delete data.field; } else {delete data.field;data.construction={lie:asset.data.construction?.lie||'',basis:mode.value};} api.update(refOf(asset),{data});if(mode.value==='manual')ensureMatrixField(panel.assetKey); });
        panel.controls.append(field('Construction',mode));
        referenceControl(panel,slot('field','Coefficient ring','field'),definition,()=>get(panel.assetKey)?.data.field||'',value=>{
          const asset=get(panel.assetKey); if(!asset)return;
          if(value)api.update(refOf(asset),{data:{...asset.data,field:value}});
          else { const data={...slicing.materialize(asset,snapshot.assets).data};delete data.field;api.update(refOf(asset),{data});ensureMatrixField(panel.assetKey); }
        },{create:()=>{const asset=get(panel.assetKey);if(!asset)return;const data=normalize('field','field',slicing.materialize(asset,snapshot.assets).data);const parent=api.create('field',{data});api.update(refOf(asset),{data:{...asset.data,field:keyOf(parent)}});open('field-input',keyOf(parent),'side');}});
        referenceControl(panel,lie(),definition,()=>get(panel.assetKey)?.data.construction?.lie||'',value=>{ const asset=get(panel.assetKey); if(asset?.data.construction) api.update(refOf(asset),{data:{...asset.data,construction:{...asset.data.construction,lie:value}}}); });
        panel.selectors.filter(entry=>['field','lie'].includes(entry.spec.id)).forEach(entry=>panel.controls.append(entry.row));
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
        if (definition.input === 'strands') {
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
        const mode=element('select','workspace-control'); mode.append(...[['matrix-input','Stored basis'],['matrix-object','Matrix asset'],['dynkin','Lie root / weight lattice'],['lmfdb-field','Number field']].map(([v,t])=>new Option(t,v))); panel.latticeMode=mode;
        mode.addEventListener('change',()=>commit({basisMode:mode.value})); panel.controls.append(field('Construction',mode));
      }
      const specs=kind==='variety'?[slot('fan','Fan','fan',{optional:true}),slot('cone','Affine cone','cone',{optional:true})]:['roots','weyl','lattice'].includes(kind)?[lie(),...(kind==='lattice'?[slot('matrix','Basis matrix','matrix')]:[])]:kind==='voronoi'?[slot('lattice','Lattice','lattice'),slot('point','Cell center','point')]:kind==='fan'?[slot('characterLattice','Character lattice','lattice',{optional:true})]:[];
      specs.forEach(spec=>referenceControl(panel,spec,definition,()=>get(panel.assetKey)?.data[spec.id]||'',value=>commit({[spec.id]:value,...(kind==='variety'?{[spec.id==='fan'?'cone':'fan']:''}:{}),...(kind==='lattice'&&spec.id==='matrix'?{basisMode:'matrix-object'}:{})}),kind==='lattice'&&spec.id==='matrix'?{
        edit:()=>editMatrixAsset(latticeBasisMatrix(panel)),
        create:()=>{const asset=get(panel.assetKey);if(!asset)return;if(asset.data.basisMode==='matrix-input')latticeBasisMatrix(panel);else{const n=asset.data.ambientDimension,matrix=api.create('matrix',{data:normalize('matrix','matrix',{rows:n,cols:n,dataType:'real'})});commit({basisMode:'matrix-object',matrix:keyOf(matrix)});}}
      }:{}));
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
      panel.selectors.forEach(({row,spec,select})=>{
        if(asset.kind==='lattice'&&spec.id!=='asset') {
          row.hidden=spec.id==='lie'?asset.data.basisMode!=='dynkin':!['matrix-input','matrix-object'].includes(asset.data.basisMode);
          if(spec.id==='matrix')select.options[0].textContent=asset.data.basisMode==='matrix-input'?'Stored basis':`Choose ${spec.label}…`;
        }
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
      const entries = [{ id: 'workspace', label: 'Complete workspace backup (JSON)', canImport: true, filename: 'math-workspace.json' }, ...snapshot.assets.map(asset => ({
        id: keyOf(asset), label: (asset.plainName || asset.name) + ' · ' + asset.typeLabel,
        canImport: true, filename: asset.kind + '-' + asset.id + '.json'
      }))];
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
      const frame=get(panel.computation.refs.frame);
      const assets = snapshot.assets.filter(asset => panel.definition.slicingScene ? keyOf(asset)!==keyOf(frame)&&slicing.fitsFrame(asset,frame,snapshot.assets) : ['category', 'functor'].includes(asset.kind));
      const signature = JSON.stringify([panel.computation.refs.nodes,assets.map(asset => [keyOf(asset), asset.name])]);
      if (panel.sceneSignature !== signature) {
        panel.controls.replaceChildren();
        if(panel.definition.slicingScene) panel.controls.append(element('span','workspace-scene-choices-label','Geometric objects:'));
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
      const assets = engine === 'slice' || asset.kind === 'matrix' ? slicing.closure([keyOf(asset)],snapshot.assets).assets : [asset, ...snapshot.assets.filter(item => asset.kind === 'functor' && item.kind === 'category' && [asset.data.domain, asset.data.codomain].includes(keyOf(item)) || ['dynkin','strands'].includes(asset.kind) && keyOf(item) === asset.data.lie)];
      editor.applyAssets({ assets }, refOf(asset)); return editor;
    }
    function exportCategoryOverview(panel, format) {
      const assets = Object.values(contextFor(panel.computation,snapshot.assets,snapshot.diagnostics).objects);
      // Reuse the category calculator's formulas and graph formats for IO.
      const editor = ioRenderer(assets[0] || {kind:'category',id:'overview-empty',data:{}});
      editor.applyAssets({assets},refOf(get(panel.computation.refs.active)));
      editor.objectIO('layout',panel.propertyRenderer.editor.captureAssetLayout().filter(entry=>entry.key.startsWith('category:')).map(entry=>({id:entry.key,x:entry.point.x,y:entry.point.y})));
      return editor.objectIO('export',format);
    }
    function exportFormats(key) {
      if (key === 'workspace') return [{ id: 'json', label: 'Workspace JSON backup' }];
      const asset = get(key), panel = [...panels.values()].find(panel => 'property:' + panel.computation?.id === key);
      const kind = asset?.kind || panel?.definition.engine;
      const formats = slicing.isAsset(asset) || panel?.definition.slicing ? (asset?.kind==='frame'?['json','latex','plain']:['json','plain']) : ['strands','strand','dynkin'].includes(kind) ? ['json','latex','plain'] : kind === 'matrix' && panel?.definition.id !== 'matrix-invariants' ? ['json','latex','python','sage','macaulay2','mathematica','matlab','rows'] : ['category','functor'].includes(kind) ? ['json','latex','plain','preset'] : ['json'];
      return [...new Set([...formats.filter(id => !asset || !['sage','macaulay2'].includes(id)), ...(asset ? window.MathWorkspaceIO.casFormats(asset) : [])])].map(id => ({ id, label: { json: 'JSON asset / result', sage: 'SageMath', macaulay2: 'Macaulay2', latex: 'LaTeX', plain: 'Plain text', preset: 'Category JSON preset', rows: 'Rows' }[id] || id }));
    }
    function exportText(key, format = 'json') {
      if (key === 'workspace') return JSON.stringify(api.captureWorkspace(), null, 2);
      const asset = get(key);
      if(asset&&format!=='json'&&snapshot.diagnostics?.[key]&&!snapshot.diagnostics[key].valid)throw new Error('Needs repair: '+diagnostics.messages(snapshot.diagnostics[key],snapshot.assets).join(' '));
      if (asset && ['sage','macaulay2'].includes(format)) {
        if (!window.MathWorkspaceIO.casFormats(asset).includes(format)) throw new Error('This object has no supported native definition in the selected computer algebra system.');
        if (asset.kind !== 'matrix') return window.MathWorkspaceIO.casExport(asset, format);
      }
      if (asset) {
        if (format !== 'json') return ioRenderer(asset).objectIO('export', format);
        const parent = ['dynkin','strands'].includes(asset.kind) ? get(asset.data.lie) : null;
        const dependencies = dependencyRecords(asset);
        return JSON.stringify({ kind: asset.kind, id: asset.id, name: asset.name, type: asset.type, data: asset.data, properties: asset.properties || {}, ...(dependencies.length ? { dependencies } : {}), ...(parent ? { lieAsset: { kind: 'lie', type: parent.type, data: parent.data } } : {}) }, null, 2);
      }
      const panel = [...panels.values()].find(panel => panel.computation && 'property:' + panel.computation.id === key);
      if (!panel) throw new Error('Choose an asset or property to export.');
      const computation = panel.computation;
      if (format !== 'json') {
        if (computation.status !== 'current') throw new Error('Update the property result before exporting it.');
        return panel.propertyRenderer.editor.objectIO('export', format);
      }
      return JSON.stringify({ property: computation.type, refs: computation.refs, rule: computation.rule, settings: computation.settings, options: computation.options, result: computation.status === 'current' ? panel.propertyRenderer?.editor.readObjectResult() || computation.result || null : null, status: computation.status }, null, 2);
    }
    function dependencyRecords(asset) {
      const found = new Set([keyOf(asset)]), result = [];
      const visit = item => {
        for (const ref of item.dependencies || []) {
          const key = keyOf(ref), dependency = get(key);
          if (!dependency || found.has(key)) continue;
          found.add(key); visit(dependency);
          result.push({ kind: dependency.kind, id: dependency.id, name: dependency.name, type: dependency.type, data: dependency.data, properties: dependency.properties || {} });
        }
      };
      visit(asset); return result;
    }
    function importText(key, text) {
      if (key === 'workspace') return api.restoreWorkspace(text);
      if (key === 'category-graph') return api.importCategoryGraph(JSON.parse(text));
      if (key === 'slicing-graph') return api.importSlicing(JSON.parse(text));
      const asset = get(key);
      if (!asset) throw new Error('Choose the destination asset first.');
      if (asset.kind === 'matrix' && !text.trim().startsWith('{')) return api.update(refOf(asset), { data: normalize('matrix', 'matrix', ioRenderer(asset).objectIO('parse', text)) });
      const raw = text.trim(), value = raw.startsWith('{') ? JSON.parse(raw) : { kind: 'young', type: asset.type, data: { partition: raw } };
      if (slicing.isAsset(asset) || asset.kind === 'matrix' && (value.data?.construction || value.data?.field || value.dependencies)) return api.importSlicing(value,refOf(asset));
      if (asset.kind === 'number') return api.importNumberAsset(refOf(asset),value);
      if (['dynkin','strands'].includes(asset.kind)) return api.importRootObject(refOf(asset), value);
      if (value.kind !== asset.kind) throw new Error('Imported data has a different object type.');
      if (!inputKinds.includes(asset.kind)) return api.importAsset(refOf(asset), value);
      const type = value.type || asset.type;
      if (!(asset.kind === 'young' ? ['partition', 'generalized'] : asset.kind === 'lie' ? ['simple'] : [asset.kind]).includes(type)) throw new Error('Imported data has an unsupported object subtype.');
      const data = normalize(asset.kind, type, value.data || {});
      if (asset.kind === 'matrix') ioRenderer({ ...asset, data }).objectIO('validate');
      api.update(refOf(asset), { type, data });
    }
    function structureInputFields(panel){
      const commit=patch=>{const asset=get(panel.assetKey);if(!asset)return;try{api.update(refOf(asset),{data:{...asset.data,...patch}});feedback(panel);}catch(error){feedback(panel,error.message,true);}};
      panel.structureControls={};
      const text=(key,label,type='text')=>{
        const input=element('input','workspace-control');input.type=type;input.setAttribute('aria-label',label);panel.structureControls[key]=input;const row=field(label,input);if(key==='polynomial'||key==='embedding')row.classList.remove('workspace-field-inline');panel.controls.append(row);
        listen(input,()=>{if(type==='number'&&(input.value.trim()===''||!Number.isFinite(Number(input.value))))return;commit({[key]:type==='number'?Number(input.value):input.value});});return input;
      };
      if(panel.definition.input==='field-extension'){
        for(const [id,label,optional]of [['base','Base field',false],['target','Target field (optional)',true]])referenceControl(panel,slot(id,label,'field',{optional,requiresField:true}),panel.definition,()=>get(panel.assetKey)?.data[id]||'',value=>commit({[id]:value}));
        text('generator','Generator');text('polynomial','Defining polynomial over the base field');text('embedding','Base embedding (optional)');
        panel.controls.append(element('p','workspace-card-context','The polynomial defines the extension over the selected base. A target field reference records a chosen presentation; it does not certify an isomorphism. Unsupported bases or embeddings are retained and reported by the display.'));
      }else{
        const filtration=panel.definition.input==='filtration';
        text('startDegree',filtration?'Starting index':'Starting degree','number');
        const direction=element('select','workspace-control');direction.append(...(filtration?[new Option('Increasing filtration','increasing'),new Option('Decreasing filtration','decreasing')]:[new Option('Cochain: degrees increase','cochain'),new Option('Chain: degrees decrease','chain')]));direction.setAttribute('aria-label','Degree direction');direction.addEventListener('change',()=>commit({direction:direction.value}));panel.structureControls.direction=direction;panel.controls.append(field('Direction',direction));
        const condition=element('select','workspace-control');condition.append(new Option('Diagram only — not verified','diagram'),new Option(filtration?'Filtration condition declared by user':'Complex condition declared by user','declared'));condition.setAttribute('aria-label','Complex condition');condition.addEventListener('change',()=>commit({condition:condition.value}));panel.structureControls.condition=condition;panel.controls.append(field('Condition',condition));
        panel.structureTerms=element('div','workspace-structure-terms');panel.controls.append(panel.structureTerms);
        const relation=filtration?'quotients':'maps';
        panel.controls.append(button('Add term',()=>{const a=get(panel.assetKey);commit({objects:[...a.data.objects,{symbol:(filtration?'F_':'A_')+a.data.objects.length,ref:''}],[relation]:[...a.data[relation],{symbol:(filtration?'G_':'d_')+a.data[relation].length,ref:''}]});}),button('Remove last term',()=>{const a=get(panel.assetKey);if(a.data.objects.length>1)commit({objects:a.data.objects.slice(0,-1),[relation]:a.data[relation].slice(0,-1)});}));
        panel.controls.append(element('p','workspace-card-context',filtration?'Link terms and subquotients to existing objects or enter symbols. Inclusions and subquotient identifications are declared, not verified. Decreasing filtrations are displayed in reverse order to keep inclusion arrows correct.':'Use symbols directly or link existing assets. Linked labels follow their assets. Neither a diagram nor a declaration proves that consecutive differentials compose to zero.'));
      }
      panel.structureCommit=commit;
    }
    function refreshStructureInput(panel,asset){
      for(const [key,control]of Object.entries(panel.structureControls))sync(control,asset.data[key]);
      if(!['complex','filtration'].includes(asset.kind))return;
      const d=asset.data,signature=JSON.stringify([panel.assetKey,d.objects.length,snapshot.assets.filter(a=>['sheaf','variety','matrix','map'].includes(a.kind)).map(a=>[keyOf(a),a.name])]);
      if(panel.structureSignature!==signature){
        panel.structureSignature=signature;panel.structureRows=[];panel.structureTerms.replaceChildren();
        const relation=asset.kind==='filtration'?'quotients':'maps';
        for(let i=0;i<d.objects.length;i++)for(const kind of (i<d[relation].length?['objects',relation]:['objects'])){
          const row=element('div','workspace-object-reference'),symbol=element('input','workspace-control'),select=element('select','workspace-control'),label=(kind==='objects'?'Term ':kind==='quotients'?'Subquotient ':'Differential ')+(i+1);
          symbol.type='text';symbol.setAttribute('aria-label',label+' symbol');select.setAttribute('aria-label',label+' asset');select.append(new Option('Symbol only',''));
          snapshot.assets.filter(a=>kind==='maps'?a.kind==='map':['sheaf','variety','matrix'].includes(a.kind)).forEach(a=>select.append(new Option(a.plainName||a.name,keyOf(a))));
          const update=()=>{const current=get(panel.assetKey);const list=current.data[kind].map((t,index)=>index===i?{symbol:symbol.value,ref:select.value}:t);panel.structureCommit({[kind]:list});};
          listen(symbol,update);select.addEventListener('change',update);row.append(field(label,symbol),field('Link',select));panel.structureTerms.append(row);panel.structureRows.push({kind,i,symbol,select});
        }
      }
      for(const row of panel.structureRows){sync(row.symbol,d[row.kind][row.i].symbol);row.select.value=d[row.kind][row.i].ref;}
    }
    function refreshObjectView(panel) {
      const asset=get(panel.computation.refs.asset),computation=panel.computation;
      computation.status=asset?'current':'missing';panel.renderArea.hidden=!asset;
      if(!asset) {feedback(panel,'Choose an asset to display.');return;}
      panel.title.textContent=(asset.plainName||asset.name)+' · Display';
      const diagnostic=snapshot.diagnostics?.[keyOf(asset)];
      if(diagnostic&&!diagnostic.valid){computation.status='invalid';computation.signature='';computation.result=null;panel.renderArea.replaceChildren();feedback(panel,'⚠ Needs repair: '+diagnostics.messages(diagnostic,snapshot.assets).join(' '),true);return;}
      if(asset.kind==='number') {
        try {
          const result=numbers.evaluate(asset,snapshot.assets),title=element('p','workspace-object-display-title');
          title.textContent='\\('+asset.name+(asset.data.hasValue?' = '+result.latex:'')+'\\)';
          const fieldText=element('p','workspace-card-context',(result.field.plainName||result.field.name)+' · '+fieldLabel(result.field.data));
          const usage=element('p','workspace-card-context',asset.data.hasValue?(asset.data.replaceWithValue?'Values are substituted in linked calculations.':'Linked calculations retain the symbol.'):(asset.data.positive?'Symbolic; assumed positive.':'Symbolic.'));
          const signature=JSON.stringify([asset,result.field]);if(signature!==computation.signature){computation.signature=signature;panel.renderArea.replaceChildren(title,fieldText,usage);window.MathJax?.typesetPromise?.([title]).catch(()=>{});}
          computation.result={text:(asset.name+(asset.data.hasValue?' = '+result.text:''))+' in '+fieldLabel(result.field.data)};feedback(panel);
        } catch(error){computation.status='missing';panel.renderArea.replaceChildren();feedback(panel,error.message,true);}
        return;
      }
      const signature=JSON.stringify([asset.name,asset.type,asset.data,asset.dependencies?.map(ref=>get(keyOf(ref))?.name)]);
      if(signature!==computation.signature) {
        computation.signature=signature;
        const title=element('p','workspace-object-display-title',asset.definition||asset.typeLabel||asset.kind),details=element('dl','workspace-object-display-details');
        const valueNode=value=>{
          if(Array.isArray(value)) {
            if(!value.length)return element('span','','∅');
            if(value.every(row=>Array.isArray(row))) {const table=element('table','workspace-object-display-grid');for(const row of value){const tr=element('tr');for(const cell of row)tr.append(element('td','',String(cell)));table.append(tr);}return table;}
            return element('span','',value.map(item=>typeof item==='object'?Object.entries(item).map(([key,v])=>key+': '+v).join(', '):String(item)).join('; '));
          }
          if(value&&typeof value==='object') {const dl=element('dl','workspace-object-display-details');for(const [key,item] of Object.entries(value)){dl.append(element('dt','',key.replace(/([A-Z])/g,' $1')),valueNode(item));}return dl;}
          return element('span','',get(value)?.plainName||get(value)?.name||(value==null?'—':String(value)));
        };
        const data=asset.kind==='field'&&asset.data.dataType==='function-field'?{structure:rings.classification(asset.data),constantField:asset.data.constantField,variables:asset.data.rationalFunctionVariables,...(asset.data.functionFieldPolynomial?{generator:asset.data.functionFieldGenerator,relation:asset.data.functionFieldPolynomial,verification:'Declared field presentation; irreducibility not verified.'}:{})}:asset.kind==='field'?{structure:rings.classification(asset.data)}:asset.kind==='lie'?{}:Object.fromEntries(Object.entries(asset.data).filter(([,value])=>value!==''&&value!=null));
        for(const [key,value] of Object.entries(data)) {const term=key.replace(/([A-Z])/g,' $1');const description=element('dd');description.append(valueNode(value));details.append(element('dt','',term[0].toUpperCase()+term.slice(1)),description);}
        panel.renderArea.replaceChildren(title,...(Object.keys(data).length?[details]:[]));computation.result={text:panel.renderArea.textContent};
        if(asset.kind==='field'&&asset.data.dataType==='number-field')panel.renderArea.append(button('Ramification over ℚ',()=>{
          const base=api.ensureDefault('field',{data:{dataType:'rational'}});
          const definition={base:keyOf(base),target:keyOf(asset),polynomial:asset.data.numberFieldPolynomial,generator:asset.data.numberFieldSymbol,embedding:''};
          const existing=api.snapshot().assets.find(a=>a.kind==='field-extension'&&JSON.stringify(a.data)===JSON.stringify(structures.normalize('field-extension',definition)));
          const extension=existing||api.create('field-extension',{data:definition});
          open('field-extension-view',keyOf(extension),'main');
        },'Open the explicit extension of this field over the rationals'));
        if(asset.kind==='field'&&asset.data.dataType==='function-field'){
          const algebraic=!!asset.data.functionFieldPolynomial;
          panel.renderArea.append(button(algebraic?'Ramification of the defining extension':'New extension over this field',()=>{
            const base=algebraic?api.ensureDefault('field',{data:{...asset.data,functionFieldPolynomial:''}}):asset;
            const polynomial=algebraic?asset.data.functionFieldPolynomial.replace(/[A-Za-z][A-Za-z0-9_]*/g,token=>token===asset.data.functionFieldGenerator?'x':token):'x^2-t';
            const definition={base:keyOf(base),target:algebraic?keyOf(asset):'',polynomial,generator:algebraic?asset.data.functionFieldGenerator:'a'};
            const existing=algebraic&&api.snapshot().assets.find(a=>a.kind==='field-extension'&&JSON.stringify(a.data)===JSON.stringify(structures.normalize('field-extension',definition)));
            const extension=existing||api.create('field-extension',{data:definition});open('field-extension-view',keyOf(extension),'main');if(!algebraic)open('field-extension-input',keyOf(extension),'side');
          }));
        }
      }
      feedback(panel);
    }
    function refreshDisplayPanel(panel) {
      const select = panel.viewSelect, selected = panel.computation.refs.view || '';
      const views = [...panels.values()].filter(other => (panel.definition.viewTypes || ['strands-input']).includes(other.definition.id));
      select.replaceChildren(new Option('Choose a view…', ''), ...views.map((other, index) => new Option((get(other.assetKey)?.plainName || other.definition.label) + ' · View ' + (index + 1) + ' · ' + ({ main: 'Main area', side: 'Side panel', hidden: 'Hidden' }[other.location]), other.id))); select.value = selected;
      const target = panels.get(selected), source = target?.activeRenderer || target?.propertyRenderer;
      const valid = source && !target.inputIssues?.length && (target.computation ? !['missing','invalid'].includes(target.computation.status) : get(target.assetKey));
      panel.computation.status = valid ? 'current' : 'missing'; panel.renderArea.hidden = !valid;
      if (valid) {
        if (!panel.propertyRenderer) { panel.propertyRenderer = createNative(panel, panel.definition.engine, 'property'); panel.propertyRenderer.operation = panel.definition.id; }
        const renderer = panel.propertyRenderer; renderer.applying = true;
        try { renderer.editor.objectIO('view', source.editor.objectIO('view')); } finally { renderer.applying = false; }
      }
      if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, !!valid && !panel.closed && !panel.collapsed && !panel.node.hidden, true);
      feedback(panel, valid ? '' : 'Choose an available view. Display settings belong to that view.');
    }
    function bindPower(panel) {
      const settings = panel.computation.settings;
      if (settings.mode === 'advanced' || !get(panel.computation.refs.mu)) return;
      const rows = powerRows(settings.mode, settings.degree), revision = snapshot.revision;
      const asset = api.ensureDefault('young',{type:'partition',data:{rows}});
      panel.computation.refs.lambda = keyOf(asset);
      panel.powerBinding = JSON.stringify(rows);
      snapshot = api.snapshot();
      if (snapshot.revision !== revision) api.publishDefaults();
    }
    function powerControls(panel) {
      const mode = element('select','workspace-control'); mode.dataset.plethysmMode='';mode.setAttribute('aria-label','Plethysm mode');
      mode.append(new Option('Symmetric power','symmetric'),new Option('Exterior power','exterior'),new Option('Advanced','advanced'));
      const degree = element('input','workspace-control'); degree.type='number';degree.min='0';degree.max='12';degree.step='1';degree.setAttribute('aria-label','Power degree');degree.dataset.powerDegree='';
      panel.powerMode=mode;panel.powerDegree=degree;panel.powerDegreeRow=field('Degree n',degree);panel.controls.append(field('Operation',mode),panel.powerDegreeRow);
      mode.addEventListener('change',()=>{panel.computation.settings.mode=mode.value;if(mode.value!=='advanced')bindPower(panel);refreshPanel(panel);});
      listen(degree,()=>{const n=Number(degree.value);if(!Number.isInteger(n)||n<0||n>12)return;panel.computation.settings.degree=n;bindPower(panel);refreshPanel(panel);});
    }
    function refreshDiagramMembers(panel){
      if(!panel.diagramMembers){panel.diagramMembers=element('details');const title=element('summary','','Assets in this display');panel.diagramChoices=element('div','workspace-form-fields');panel.diagramMembers.append(title,panel.diagramChoices);panel.references.append(panel.diagramMembers);}
      const candidates=snapshot.assets.filter(a=>['complex','filtration'].includes(a.kind)),nodes=panel.computation.refs.nodes||[];
      const signature=JSON.stringify([nodes,candidates.map(a=>[keyOf(a),a.name])]);if(signature===panel.memberSignature)return;panel.memberSignature=signature;
      panel.diagramChoices.replaceChildren();
      for(const a of candidates){const check=element('input');check.type='checkbox';check.checked=nodes.includes(keyOf(a));check.dataset.diagramMember=keyOf(a);const row=element('label');row.append(check,document.createTextNode(' '+a.name+' · '+kindLabels[a.kind]));check.addEventListener('change',()=>{panel.computation.refs.nodes=check.checked?[...new Set([...panel.computation.refs.nodes,keyOf(a)])]:panel.computation.refs.nodes.filter(key=>key!==keyOf(a));refreshPanel(panel);});panel.diagramChoices.append(row);}
      if(!candidates.length)panel.diagramChoices.append(element('p','','Create a Complex or Filtration asset, or save a preview from this panel.'));
    }
    function refreshPanel(panel) {
      if (panel.refreshing) return;
      panel.refreshing = true;
      try {
        if(panel.definition.sheafInput){
          if(!panel.propertyRenderer)panel.propertyRenderer=createNative(panel,'complex','property');
          const renderer=panel.propertyRenderer,assets=snapshot.assets.filter(a=>['variety','sheaf','map','number','field','complex'].includes(a.kind)&&snapshot.diagnostics?.[keyOf(a)]?.valid!==false),signature=JSON.stringify([panel.computation.refs.asset,assets]);
          if(!renderer.committing&&signature!==panel.computation.signature&&(!renderer.editor.objectIO('input-dirty')||renderer.sourceTarget!==panel.computation.refs.asset)){
            renderer.applying=true;
            try{renderer.editor.objectIO('input-reset');renderer.editor.applyAssets({assets},refOf(get(panel.computation.refs.asset)));renderer.managedKeys=assets.filter(a=>['variety','sheaf','map','number'].includes(a.kind)).map(keyOf);renderer.sourceRevision=snapshot.revision;renderer.sourceTarget=panel.computation.refs.asset;panel.computation.signature=signature;feedback(panel);}
            catch(error){feedback(panel,error.message,true);}
            finally{renderer.applying=false;}
          }
          setRendererVisible(renderer,!panel.closed&&!panel.collapsed&&!panel.node.hidden,true);
          panel.title.textContent=panel.definition.label;registry.register(panel);api.title(panel.id,panel.title.textContent);return;
        }
        if(panel.definition.mosaicOwner==='mosaic-space'&&panel.computation){
          const asset=get(panel.computation.refs.asset),space=mosaic.propertyAsset(panel.definition.id,asset,snapshot.assets);
          if(space&&space!==asset)panel.computation.refs.asset=keyOf(space);
        }
        if (panel.definition.id === 'plethysm') {
          const settings=panel.computation.settings, outer=get(panel.computation.refs.lambda);
          if(settings.mode!=='advanced') {
            if(panel.powerBinding && (!outer || outer.type!=='partition' || JSON.stringify(outer.data.rows)!==panel.powerBinding)) settings.mode='advanced';
            else if(!panel.powerBinding) bindPower(panel);
          }
          panel.powerMode.value=settings.mode;sync(panel.powerDegree,settings.degree);panel.powerDegreeRow.hidden=settings.mode==='advanced';
        }
          panel.selectors.forEach(({ row, select, spec, definition, read }) => {
          const source=definition.geometryView&&get(panel.computation.refs.asset);
          updateSelector(select, spec, definition.geometryView&&spec.id==='frame'?{...definition,frameDimension:source?.data.ambientDimension??Number(source&&slicing.materialize(source,snapshot.assets).data.dimension)}:definition, read());
          row.hidden = definition.id === 'branching' && spec.id === 'mu' && !panel.computation.rule.startsWith('diag-')
            || definition.id === 'plethysm' && spec.id === 'lambda' && panel.computation.settings.mode !== 'advanced'
            || !!definition.input && spec.id==='asset' && !!get(panel.assetKey)
            || (definition.assetView||definition.objectView||definition.id==='matrix-view') && spec.id!=='frame' && !!get(read())
            || definition.geometryView && spec.id==='frame' && get(panel.computation.refs.asset)?.kind==='frame';
        });
        if (panel.definition.input) {
          const asset = get(panel.assetKey);
          panel.controls.querySelectorAll('input,select,button').forEach(node => { node.disabled = !asset; });
          if (asset) {
            sync(panel.name, asset.name);
            if(panel.topologyInput)panel.topologyInput.refresh();
            else if (panel.definition.slicing) refreshSlicingInput(panel,asset);
            else if (asset.kind === 'number') {
              const controls=panel.numberControls,pending=panel.numberDraftMode?.key===panel.assetKey?panel.numberDraftMode:null;controls.mode.value=pending?.mode||(asset.data.hasValue?'value':'symbolic');sync(controls.value,pending?.value??asset.data.value);controls.replace.checked=pending?pending.replace:asset.data.replaceWithValue;controls.positive.checked=pending?pending.positive:asset.data.positive;
              panel.numberValueRow.hidden=panel.numberReplaceRow.hidden=controls.mode.value!=='value';panel.numberPositiveRow.hidden=controls.mode.value==='value';
            } else if (asset.kind === 'field') {
              panel.ringClassification.textContent=rings.classification(asset.data);
              panel.coefficientType.value=asset.data.dataType;
              const visible={finiteFieldPrime:['finite-field','finite-extension'],finiteFieldDegree:['finite-extension'],rationalFunctionVariables:['rational-function','function-field'],numberFieldSymbol:['number-field'],numberFieldPolynomial:['number-field'],functionFieldGenerator:['function-field'],functionFieldPolynomial:['function-field']};
              for(const [key,control] of Object.entries(panel.fieldControls)) { sync(control,key==='rationalFunctionVariables'?asset.data[key].join(', '):asset.data[key]??(key==='finiteFieldDegree'?2:key==='functionFieldGenerator'?'u':''));panel.fieldRows[key].hidden=!visible[key].includes(asset.data.dataType); }
              panel.selectors.filter(entry=>entry.spec.id==='constantField').forEach(entry=>entry.row.hidden=asset.data.dataType!=='function-field');panel.functionFieldNote.hidden=asset.data.dataType!=='function-field';
            } else if (asset.kind === 'matrix') {
              panel.matrixConstruction.value=asset.data.construction?.basis||'manual'; panel.inputIssues=[];
              panel.selectors.filter(entry=>entry.spec.id==='lie').forEach(entry=>{entry.row.hidden=!asset.data.construction;});
              panel.selectors.filter(entry=>entry.spec.id==='field').forEach(entry=>{entry.row.hidden=!!asset.data.construction;});
              try { slicing.materialize(asset,snapshot.assets); } catch(error) { panel.inputIssues=[error.message]; }
              feedback(panel,panel.inputIssues.join(' '),!!panel.inputIssues.length);
            } else if (asset.kind === 'young') { sync(panel.rows, asset.data.partition); panel.youngType.value = asset.type; }
            else if (asset.kind === 'lie') { panel.family.value = asset.data.family; sync(panel.rank, asset.data.rank); panel.rank.disabled = !['A','B','C','D'].includes(asset.data.family); }
            else if (['dynkin','strands'].includes(asset.kind)) {
              const parent = get(asset.data.lie);
              panel.inputIssues = [...rootObjectIssues(asset, parent), ...(parent ? lieEngineIssues(parent.data, panel.definition.engine) : [])];
              panel.derivedLabel.textContent = parent ? (parent.plainName || parent.name) + ' · ' + parent.data.family + parent.data.rank + (asset.kind === 'strands' && ['A','B','C','D'].includes(parent.data.family) ? ' · ' + (parent.data.family === 'A' ? 'S' + (parent.data.rank + 1) : parent.data.family + parent.data.rank) : '') : 'Choose a Lie type for this object.';
              if (panel.repairWord) panel.repairWord.hidden = !panel.inputIssues.length || !asset.data.generators.length;
              feedback(panel, panel.inputIssues.join(' '), !!panel.inputIssues.length);
            }
          }
          if(asset&&structures.kinds.includes(asset.kind))refreshStructureInput(panel,asset);
          panel.title.textContent = `${asset?.plainName || asset?.name || 'Choose an asset'} · Modify`;
          updateDensity(panel); projectInput(panel);
          panel.renderArea.hidden = !asset || !!panel.inputIssues?.length || !panel.definition.engine;
          if (!asset) feedback(panel, panel.assetKey ? 'The referenced asset was deleted. Choose another asset.' : 'Choose or create an asset to edit.');
        } else if(panel.definition.topologyView){
          const context=contextFor(panel.computation,snapshot.assets,snapshot.diagnostics),asset=context.objects.asset;
          panel.computation.status=context.missing.length?'invalid':'current';panel.renderArea.hidden=!!context.missing.length;
          panel.title.textContent=(asset?(asset.plainName||asset.name)+' · ':'')+panel.definition.label;
          if(context.missing.length){panel.renderArea.replaceChildren();panel.computation.result=null;panel.computation.signature='';feedback(panel,context.missing.join(' '),true);}
          else{const signature=context.signature+(panel.definition.id==='knot-view'?'|'+JSON.stringify(root.MathWorkspaceKnotDrawing.settings())+'|'+root.MathWorkspaceKnotEditing.signature(asset):'');if(panel.computation.signature!==signature){panel.computation.signature=signature;panel.computation.result=root.MathWorkspaceTopologyUI.render(panel.renderArea,asset,panel.definition.id,{read:()=>get(keyOf(asset)),assets:()=>snapshot.assets,update:api.update,refresh});feedback(panel);}}
        } else if (panel.definition.objectView) { refreshObjectView(panel); }
        else if (panel.definition.display) { refreshDisplayPanel(panel); } else {
          if(panel.definition.structureScene)refreshDiagramMembers(panel);
          if (panel.definition.slicingScene || panel.definition.scene&&!panel.definition.assetView&&!panel.definition.overview) refreshSceneChoices(panel);
          const computation = panel.computation, context = contextFor(computation, snapshot.assets,snapshot.diagnostics);
          if (panel.definition.overview && computation.refs.active && !Object.values(context.objects).some(asset=>keyOf(asset)===computation.refs.active)) computation.refs.active = '';
          const bound=get(computation.refs[panel.definition.viewRole||'asset']);
          if(panel.dynkinRepair){const parent=get(bound?.data.lie);panel.dynkinRepair.hidden=!bound||!parent||!!lieEngineIssues(parent.data,'dynkin').length||!rootObjectIssues(bound,parent).length;}
          panel.title.textContent = panel.definition.assetView&&!panel.definition.overview&&bound?(bound.plainName||bound.name)+' · '+panel.definition.label:panel.definition.label;
          if (context.missing.length) {
            computation.status = context.invalid ? 'invalid' : 'missing'; computation.signature = ''; computation.result = null; panel.renderArea.hidden = true;
            if (panel.propertyRenderer) setRendererVisible(panel.propertyRenderer, false, true);
            feedback(panel, (context.invalid ? '⚠ Needs repair: ' : 'Required inputs: ') + context.missing.join('; '), context.invalid);
          } else {
            panel.renderArea.hidden = false;
            if (!panel.propertyRenderer) {
              panel.propertyRenderer = createNative(panel, panel.definition.engine, 'property'); panel.propertyRenderer.operation = panel.definition.id;
              const legacy=panel.definition.assetView&&legacyViews.get(keyOf(bound));
              if(legacy){const renderer=panel.propertyRenderer;renderer.applying=true;try{renderer.editor.restore(legacy.engine===renderer.engine?legacy.snapshot:{ui:legacy.snapshot.ui});}finally{renderer.applying=false;}legacyViews.delete(keyOf(bound));}
            }
            const renderer = panel.propertyRenderer;
            if (computation.signature !== context.signature) {
              computation.signature = context.signature; computation.result = null; computation.status = panel.definition.light ? 'current' : 'stale';
              const layout = panel.definition.overview ? new Map(renderer.editor.captureAssetLayout().map(entry => [entry.key, entry.point])) : null;
              const projectedAssets = Object.values(context.objects).map(asset => layout ? {...asset,viewPosition:layout.get(keyOf(asset)) || root.MathWorkspacePresentation.layout(api.viewDefaults?.(asset)?.sheaf)} : asset);
              renderer.applying = true;
              const overviewActive = Object.hasOwn(computation.refs,'active') ? get(computation.refs.active) : bound;
              const active = panel.definition.overview ? overviewActive : panel.definition.geometryView || panel.definition.structure ? get(computation.refs.asset) : context.objects[panel.definition.viewRole||'lambda'];
              try { renderer.editor.applyAssets({ assets: projectedAssets }, refOf(active), null, { mode: panel.definition.assetView?'view':'property', operation: panel.definition.id, vertexFocus:dynkinFocus.get(computation.refs.dynkin), multiSelect:dynkinSelectionModes.get(computation.refs.dynkin), rule: computation.rule, settings: computation.settings, light: panel.definition.light, viewDefaults:api.viewDefaults?.(active), references: computation.refs, refs: Object.fromEntries(Object.entries(context.objects).map(([role, asset]) => [role, refOf(asset)])) }); }
              finally { renderer.applying = false; }
              if(['dynkin-view','dynkin-starting'].includes(panel.definition.id)&&!dynkinSelectionModes.has(computation.refs.dynkin))dynkinSelectionModes.set(computation.refs.dynkin,renderer.editor.objectIO('selection-mode'));
              computation.options = renderer.editor.captureAssetProperties();
              if (panel.definition.light) computation.result = renderer.editor.readObjectResult();
              if(panel.definition.slicing&&computation.result?.hasResult===false){computation.result=null;computation.status='pending';}
            }
            setRendererVisible(renderer, !panel.closed && !panel.collapsed && !panel.node.hidden, true);
            feedback(panel, computation.status === 'pending' ? 'Computing…' : computation.status === 'stale' ? 'Inputs changed. Use compute to update the result.' : '');
          }
        }
        if(panel.definition.id==='dynkin-cartan') {
          const matrix=panel.computation.status==='current'&&panel.computation.result?.cartan,lie=get(panel.computation.refs.lie);
          panel.addCartan.disabled=!matrix?.length;
          if(matrix&&lie) {
            if(!panel.cartanView){panel.cartanView=element('div');panel.renderArea.append(panel.cartanView);}
            window.MathWorkspaceCartan.renderInto(panel.cartanView,matrix,lie.data.family[0]+lie.data.rank);
          }
        }
        const targets=panel.definition.input?[panel.assetKey]:Object.values(panel.computation?.refs||{}).flat();
        const messages=[...new Set(targets.flatMap(key=>diagnostics.messages(snapshot.diagnostics?.[key],snapshot.assets)))];
        if(!panel.diagnosticBadge){panel.diagnosticBadge=element('span','workspace-panel-warning','⚠');panel.diagnosticBadge.setAttribute('role','img');panel.title.after(panel.diagnosticBadge);}
        panel.diagnosticBadge.hidden=!messages.length;panel.diagnosticBadge.title=messages.join(' ');panel.diagnosticBadge.setAttribute('aria-label','Needs repair: '+messages.join(' '));
        panel.node.dataset.validation=messages.length?'invalid':'valid';
        if(panel.definition.input&&messages.length)feedback(panel,'⚠ Needs repair: '+messages.join(' '),true);
        registry.register(panel);
        if(panel.comparison)panel.title.textContent=panel.title.textContent.replace(/ · (?:Comparison|Saved copy) \d+$/,'')+' · '+(panel.definition.input?'Saved copy ':'Comparison ')+(panel.comparisonIndex||2);
        api.title(panel.id, panel.title.textContent);
      } finally { panel.refreshing = false; }
      api.ioChanged(); api.pickerChanged();
    }
    function move(panel, location) {
      if (panel.location !== 'hidden') panel.lastLocation = panel.location;
      if (panel.location === 'main') api.removeMain(panel.id);
      panel.location = location; panel.closed = location === 'hidden'; panel.node.hidden = panel.closed;
      panel.node.dataset.location = location;
      if(location==='main'){panel.collapsed=false;panel.node.classList.remove('collapsed');panel.head.setAttribute('aria-expanded','true');}
      if (location === 'main') api.placeMain(panel);
      else if (location === 'side') api.side.prepend(panel.node);
      else api.parking.append(panel.node);
      if (location !== 'hidden') api.installChrome(panel);
      refreshPanel(panel); requestAnimationFrame(() => updateDensity(panel)); api.pickerChanged();
      if (!panel.definition.display) panels.forEach(other => { if (other.definition.display) refreshPanel(other); });
    }
    function open(type, assetKey = '', location = 'side', options = {}) {
      const definition = byType.get(type); if (!definition) throw new Error('Unknown mathematical panel.');
      if(definition.mosaicOwner==='mosaic-space')assetKey=keyOf(mosaic.propertyAsset(type,get(assetKey),snapshot.assets))||assetKey;
      let refs = JSON.parse(JSON.stringify(options.refs || {}));
      if (!definition.input) {
        if(definition.structureScene&&!refs.nodes)refs.nodes=get(assetKey)&&['complex','filtration'].includes(get(assetKey).kind)?[assetKey]:[];
        const firstSlot = definition.slots?.find(spec => compatible(get(assetKey), spec, definition));
        if (firstSlot && !options.id) refs[firstSlot.id] = assetKey;
        else if (!options.id && !definition.slicing && definition.fromKinds?.includes(get(assetKey)?.kind)) refs.lie = get(assetKey).data.lie;
        if (definition.scene && !refs.nodes) refs.nodes = assetKey ? [assetKey] : snapshot.assets.filter(asset => ['category', 'functor'].includes(asset.kind) && !asset.isDefault).map(keyOf);
        if (definition.sheafView && !refs.nodes) refs.nodes = refs.asset ? [refs.asset] : [];
        if (definition.slicingScene && !refs.nodes) refs.nodes = get(assetKey) && get(assetKey).kind !== 'frame' ? [assetKey] : [];
        if (definition.geometryView && get(refs.asset)?.kind === 'frame') refs.frame = refs.asset;
      }
      if(!options.id&&(!options.newInstance||definition.input)){
        const existing=find(type,assetKey,refs,options.rule);
        if(existing){
          if(definition.structureScene){
            const nodes=[...new Set([...(existing.computation.refs.nodes||[]),...(refs.nodes||[])])];
            if(JSON.stringify(nodes)!==JSON.stringify(existing.computation.refs.nodes)){existing.computation.refs.nodes=nodes;refreshPanel(existing);}
          }
          if(!options.keepPickerOpen)api.closePicker();return location==='hidden'?existing:reveal(existing,location);
        }
      }
      if(type==='matrix-input' && !options.id)ensureMatrixField(assetKey);
      // Restored panels retain exactly their saved references, including blanks.
      if (!definition.input&&!options.id) {
          const revision = snapshot.revision;
          refs = root.MathWorkspaceDefaults.panelRefs(definition, refs, snapshot.assets, api.ensureDefault);
          if (api.snapshot().revision !== revision) api.publishDefaults();
          snapshot = api.snapshot();
      }
      const id = options.id || `object-panel-${nextId + 1}`;
      nextId = Math.max(nextId, Number(id.match(/\d+$/)[0]));
      const node = element('section', 'card workspace-object-panel workspace-assets-inspector-card'), head = element('div', 'card-head'), title = element('span', 'card-head-label', definition.label);
      node.dataset.objectPanel = id; node.dataset.panelType = type;
      head.setAttribute('role', 'button'); head.tabIndex = 0; head.setAttribute('aria-expanded', 'true');
      const body = element('div', 'card-body workspace-card-form'), references = element('div', 'workspace-object-references'), controls = element('div', 'workspace-form-fields'), message = element('p', 'workspace-status'), renderArea = element('div', 'workspace-object-render-area'); message.setAttribute('role', 'status');
      if (type==='category-diagram') references.hidden=true;
      const panel = { id, definition, node, head, title, body, references, controls, message, renderArea, selectors: [], renderers: new Map(), assetKey:definition.overview||definition.structureScene?'':assetKey, location: 'hidden', closed: false, collapsed: false, refreshing: false, comparison:!!(options.newInstance||options.comparison),comparisonIndex:options.comparisonIndex };
      node.dataset.panelRole=definition.input?'modify':definition.assetView||definition.scene||definition.slicingScene||['matrix-view','slice'].includes(type)?'view':'property';
      panels.set(id, panel); head.append(title, element('em', 'toggle-icon', '▾')); body.append(references, controls, message, renderArea); node.append(head, body);
      if(definition.sheafInput)controls.append(button('Reload saved inputs',()=>{panel.propertyRenderer?.editor.objectIO('input-reset');panel.computation.signature='';refreshPanel(panel);},'Discard this draft and reload the saved Assets'));
      if(type==='dynkin-view'){
        panel.dynkinRepair=button('Reset markings and directions',()=>{const asset=get(panel.computation.refs.dynkin);if(asset)api.update(refOf(asset),{data:{...asset.data,vertices:[1],quiver:null}});},'Reset invalid diagram data to vertex 1 without quiver directions');
        panel.dynkinRepair.hidden=true;body.insertBefore(panel.dynkinRepair,renderArea);
      }
      if(definition.slicingScene) body.append(references,controls,message);
      if (definition.input) {
        referenceControl(panel, slot('asset', kindLabels[definition.input], definition.input, {subtype:definition.subtype}), definition, () => panel.assetKey, value => { panel.assetKey = value; if(definition.input==='matrix')ensureMatrixField(value); });
        inputFields(panel);
        const rows=[...panel.controls.children],primary=rows.filter(row=>['Name','Type','Construction'].includes(row.querySelector('.input-label')?.textContent)),dependencies=panel.selectors.filter(entry=>entry.spec.id!=='asset').map(entry=>entry.row);
        panel.controls.append(...primary,...dependencies,...rows.filter(row=>!primary.includes(row)&&!dependencies.includes(row)));
        if(panel.derivedLabel)panel.derivedLabel.hidden=true;
      } else {
        const computation = { id: options.computationId || `computation-${nextId}`, type, refs, options: {}, result: null, status: 'missing', signature: '' };
        if(type==='plethysm') computation.settings = options.settings ? {...options.settings} : {mode:options.id || refs.lambda ? 'advanced' : 'symmetric',degree:2};
        if (definition.display) {
          const select = element('select', 'workspace-control'); select.setAttribute('aria-label', 'Target view'); panel.viewSelect = select;
          select.addEventListener('change', () => { computation.refs.view = select.value; refreshPanel(panel); });
          panel.references.append(field('View', select));
        }
        computations.set(computation.id, computation); panel.computation = computation;
        if(type==='dynkin-cartan') {
          panel.addCartan=button('Add to Assets',()=>{
            const matrix=panel.computation.status==='current'&&panel.computation.result?.cartan;
            if(!matrix?.length)return;
            const asset=api.create('matrix',{data:normalize('matrix','matrix',{rows:matrix.length,cols:matrix.length,entries:matrix.map(row=>row.map(String)),dataType:'integer'})});
            api.selectAsset?.(refOf(asset));feedback(panel,'Added '+(asset.plainName||asset.name)+' to Assets.');
          },'Add the displayed Cartan matrix to Assets');panel.addCartan.dataset.addCartanAsset='';panel.body.append(panel.addCartan);
        }
        if(type==='plethysm'){powerControls(panel);if(options.id&&computation.settings.mode!=='advanced')panel.powerBinding=JSON.stringify(powerRows(computation.settings.mode,computation.settings.degree));}
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
    function find(type,assetKey='',refs={},rule){
      const definition=byType.get(type);if(!definition)return null;
      registry.sync(panels.values());return registry.find(definition,assetKey,refs,rule);
    }
    function reveal(panel,location=panel.lastLocation||'side'){
      if(panel.closed||panel.location==='hidden')move(panel,panel.lastLocation|| (location==='hidden'?'side':location));
      else if(panel.location==='main')api.placeMain(panel);
      panel.collapsed=false;panel.node.classList.remove('collapsed');panel.head.setAttribute('aria-expanded','true');
      // Reuse must not rebuild controls or replace a focused editing draft.
      updateDensity(panel);panel.node.scrollIntoView({block:'nearest'});
      if(!panel.node.contains(document.activeElement))panel.head.focus({preventScroll:true});
      return panel;
    }
    function compare(panel){
      if(panel.definition.input)return reveal(panel);
      const clone=open(panel.definition.id,'',panel.location==='hidden'?'side':panel.location,{newInstance:true,refs:panel.computation?.refs,rule:panel.computation?.rule,settings:panel.computation?.settings});
      for(const [source,target] of [[panel.propertyRenderer,clone.propertyRenderer],...[...panel.renderers].map(([role,renderer])=>[renderer,clone.renderers.get(role)])]){
        if(!source||!target)continue;target.applying=true;
        try{target.editor.restore(source.editor.capture());if(panel.definition.structure||panel.definition.structureScene)target.editor.objectIO('presentation',source.editor.captureAssetProperties()?.presentation);}finally{target.applying=false;}
      }
      if(clone.computation&&panel.computation){clone.computation.options=JSON.parse(JSON.stringify(panel.computation.options||{}));clone.computation.status=panel.computation.status;clone.computation.result=clone.propertyRenderer?.editor.readObjectResult()||clone.computation.result;}
      refreshPanel(clone);return clone;
    }
    function overviewAction(panel, action) {
      if(panel.definition.structureScene){
        if(action!=='collect')return;
        const refs=panel.computation.refs;
        refs.nodes=[...new Set([...(refs.nodes||[]),...snapshot.assets.filter(asset=>['complex','filtration'].includes(asset.kind)).map(keyOf)])];
        refreshPanel(panel);return;
      }
      if(panel.definition.slicingScene) {
        const refs=panel.computation.refs,frame=get(refs.frame);
        if(action==='clear') { refs.nodes=[];refs.asset=''; }
        else if(action==='collect') {
          if(!frame)return;
          refs.nodes=snapshot.assets.filter(asset=>keyOf(asset)!==refs.frame&&slicing.fitsFrame(asset,frame,snapshot.assets)).map(keyOf);
          if(refs.asset&&refs.asset!==refs.frame&&!refs.nodes.includes(refs.asset))refs.asset='';
        } else return;
        refreshPanel(panel);return;
      }
      if (!panel.definition.overview) return;
      const refs = panel.computation.refs;
      if (action === 'clear') {
        refs.nodes = []; refs.active = '';
        refs.asset = '';
      } else if (action === 'collect') {
        const kinds = panel.definition.sheafView ? ['variety','sheaf','map'] : ['category','functor'];
        refs.nodes = [...new Set([...(refs.nodes || []),...snapshot.assets.filter(asset=>kinds.includes(asset.kind)).map(keyOf)])];
      }
      refreshPanel(panel);
    }
    function removeOverviewAsset(panel, key) {
      if (!panel.definition.overview || !get(key)) return false;
      const refs = panel.computation.refs;
      // Keep the other displayed objects, including implicit endpoints/bases.
      // Remove dependent drawings too so their projection cannot re-add key.
      const displayed = Object.values(contextFor(panel.computation,snapshot.assets,snapshot.diagnostics).objects);
      refs.nodes = [...new Set(displayed.filter(asset => {
        const context = contextFor({type:panel.definition.id,refs:{nodes:[keyOf(asset)]}},snapshot.assets);
        return !Object.values(context.objects).some(item=>keyOf(item)===key);
      }).map(keyOf))];
      if (!refs.nodes.includes(refs.asset)) refs.asset = '';
      if (!refs.nodes.includes(refs.active)) refs.active = '';
      refreshPanel(panel);
      return true;
    }
    function selectOverviewAsset(panel, key) {
      const asset = get(key), editor = panel.propertyRenderer?.editor;
      if (!asset || !editor || !Object.values(contextFor(panel.computation,snapshot.assets,snapshot.diagnostics).objects).some(item=>keyOf(item)===key)) return false;
      panel.computation.refs.active = key;
      editor.objectIO('select',refOf(asset)); api.ioChanged(); return true;
    }
    function openOverview(type, key) {
      const definition = byType.get(type);
      if (!definition?.overview) return open(type,key,'hidden');
      let panel = find(type);
      if (!panel) panel = open(type,key,'hidden',{refs:{active:key}});
      else {
        const refs = panel.computation.refs;
        refs.nodes = [...new Set([...(refs.nodes || (refs.asset ? [refs.asset] : [])),key])];
        refs.active = key;
        if (definition.sheafView) refs.asset = key;
        refreshPanel(panel);
      }
      selectOverviewAsset(panel,key);
      return panel;
    }
    function selectAsset(key) {
      for (const panel of panels.values()) if (panel.definition.overview && !panel.closed && !panel.node.hidden) selectOverviewAsset(panel,key);
    }
    const bindDrop = (target, location) => {
      target.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('application/x-math-workspace-panel')) event.preventDefault(); });
      target.addEventListener('drop', event => { const panel = panels.get(event.dataTransfer?.getData('application/x-math-workspace-panel')); if (panel) { event.preventDefault(); if (location === 'main') api.focusPane(target.dataset.pane); move(panel, location); } });
    };
    bindDrop(api.side, 'side'); document.querySelectorAll('[data-pane]').forEach(pane => bindDrop(pane, 'main'));
    function refresh(value = api.snapshot()) {
      snapshot = value;
      for (const panel of panels.values()) {
        if (panel.definition.overview) {
          const refs = panel.computation.refs;
          if (refs.nodes) refs.nodes = refs.nodes.filter(key=>get(key));
          if (refs.asset && !get(refs.asset)) refs.asset = refs.nodes?.at(-1) || '';
          if (refs.active && !get(refs.active)) refs.active = '';
        }
        refreshPanel(panel);
      }
      api.ioChanged();
    }
    function listCards() {
      return definitions.filter(definition => !definition.input).flatMap(definition => {
        const instances = [...panels.values()].filter(panel => panel.definition === definition);
        if(definition.legacy&&!instances.length)return [];
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
    function capturePanels() {
      return [...panels.values()].map(panel => ({
        id: panel.id, type: panel.definition.id, assetKey: panel.assetKey, location: panel.location, lastLocation: panel.lastLocation,
        comparison:!!panel.comparison,comparisonIndex:panel.comparisonIndex,
        canvasHeight:panel.canvasHeight, canvasHeightMode:panel.canvasHeightMode,
        presentation: { collapsed: panel.node.classList.contains('collapsed'), pinned: panel.node.classList.contains('is-pinned'), displayMode: panel.node.dataset.cardWideState || 'normal' },
        computation: panel.computation ? { id: panel.computation.id, refs: panel.computation.refs, rule: panel.computation.rule, settings: panel.computation.settings, options: panel.computation.options, status: panel.computation.status } : null,
        drafts:[...panel.controls.querySelectorAll('input:not([type="checkbox"]),textarea')].map((control,index)=>({index,value:control.value})),
        legacyView:legacyViews.get(panel.assetKey)||null,
        renderers: [...panel.renderers.entries()].map(([role, renderer]) => ({ role, snapshot: renderer.editor.capture() })).concat(panel.propertyRenderer ? [{ role: 'property', snapshot: panel.propertyRenderer.editor.capture(), ...(panel.definition.overview ? {overviewLayout:panel.propertyRenderer.editor.captureAssetLayout()} : {}) }] : [])
      }));
    }
    function clearPanels() {
      root.MathWorkspaceKnotEditing?.clear();
      for (const panel of panels.values()) {
        panel.observer?.disconnect();
        for (const renderer of new Set([...panel.renderers.values(), panel.propertyRenderer].filter(Boolean))) renderer.editor.dispose();
        panel.node.remove();
      }
      panels.clear(); computations.clear(); legacyViews.clear(); dynkinFocus.clear();dynkinSelectionModes.clear(); registry.clear(); nextId = 0;
    }
    function restorePanels(saved) {
      snapshot = api.snapshot();
      for(const item of saved)if(['dynkin-view','dynkin-starting'].includes(item.type)){
        if(Number.isInteger(item.computation?.options?.vertex))dynkinFocus.set(item.computation.refs.dynkin,item.computation.options.vertex);
        if(typeof item.computation?.options?.multiSelect==='boolean')dynkinSelectionModes.set(item.computation.refs.dynkin,item.computation.options.multiSelect);
      }
      for(const item of saved){const definition=byType.get(item.type),kind=definition?.input,view=capabilities[kind]?.open,role=byType.get(view)?.viewRole;
        if(item.legacyView)legacyViews.set(item.assetKey,item.legacyView);
        else if(['young','dynkin','strands'].includes(kind)&&!saved.some(other=>other.type===view&&other.computation?.refs[role]===item.assetKey)){
          const native=item.renderers.find(renderer=>['input','large','compact'].includes(renderer.role));
          if(native)legacyViews.set(item.assetKey,{engine:native.role==='compact'?'double-young':kind==='strands'?'strand':kind,snapshot:native.snapshot});
        }
      }
      for (const item of saved) open(item.type, item.assetKey, item.location, { id: item.id, comparison:item.comparison,comparisonIndex:item.comparisonIndex,computationId: item.computation?.id, refs: item.computation?.refs, rule: item.computation?.rule, settings: item.computation?.settings, keepPickerOpen: true });
      for(const panel of [...panels.values()])if(panel.definition.display){const old=panels.get(panel.computation.refs.view);if(old?.definition.input==='strands'){const view=open('strands-view',old.assetKey,'hidden',{keepPickerOpen:true});panel.computation.refs.view=view.id;}}
      panels.forEach(refreshPanel);
      for (const item of saved) {
        const panel = panels.get(item.id); panel.lastLocation = item.lastLocation;
        panel.canvasHeight=item.canvasHeight; panel.canvasHeightMode=item.canvasHeightMode==='manual'?'manual':'auto';
        for (const savedRenderer of item.renderers) {
          let renderer = savedRenderer.role === 'property' ? panel.propertyRenderer : panel.renderers.get(savedRenderer.role);
          if(savedRenderer.role==='property'&&panel.computation?.status==='invalid')continue;
          if (!renderer && panel.definition.input && panel.definition.engine && savedRenderer.role === 'input') { renderer = createNative(panel, panel.definition.engine, 'input'); panel.renderers.set('input', renderer); panel.activeRenderer = renderer; projectInput(panel); }
          if (!renderer) continue;
          renderer.applying = true;
          try {
            const savedEntry = (value,key) => value?.$kind==='object' ? value.entries.find(entry=>entry[0]===key)?.[1] : value?.[key];
            const legacyCategories = panel.definition.id==='category-diagram' && savedEntry(savedEntry(savedRenderer.snapshot?.model,'state'),'categories');
            if (legacyCategories) renderer.editor.objectIO('layout',legacyCategories.map(item=>({id:savedEntry(item,'id'),x:savedEntry(item,'x'),y:savedEntry(item,'y')})));
            else renderer.editor.restore(savedRenderer.snapshot);
            // Restore diagram geometry as complete values. The historical
            // state merge can otherwise retain a stale straight-curve tag.
            const overviewLayout=savedRenderer.overviewLayout || item.computation?.options?.layout;
            if (panel.definition.overview && !legacyCategories && overviewLayout) renderer.editor.objectIO('layout',overviewLayout);
            const selected = panel.definition.overview && get(Object.hasOwn(panel.computation.refs,'active') ? panel.computation.refs.active : panel.computation.refs.asset);
            if (selected) renderer.editor.objectIO('select',refOf(selected));
          } finally { renderer.applying = false; }
        }
        if(panel.definition.structure||panel.definition.structureScene)panel.propertyRenderer?.editor.objectIO('presentation',item.computation?.options?.presentation);
        if(panel.definition.topology){panel.propertyRenderer?.editor.objectIO('invalidate-projection');panel.computation.signature='';refreshPanel(panel);}
        if(panel.definition.structureScene){panel.computation.signature='';refreshPanel(panel);}
        if (panel.computation) { panel.computation.options = item.computation.options;if(!['missing','invalid'].includes(panel.computation.status)){panel.computation.status = item.computation.status; panel.computation.result = panel.propertyRenderer?.editor.readObjectResult() || panel.computation.result || null;} }
        const collapsed=panel.location!=='main'&&!!item.presentation.collapsed;
        panel.node.classList.toggle('collapsed', collapsed); panel.node.classList.toggle('is-pinned', !!item.presentation.pinned); panel.node.dataset.cardWideState = item.presentation.displayMode;
        panel.head.setAttribute('aria-expanded', String(!collapsed)); panel.collapsed = collapsed;
        for(const draft of item.drafts||[]){const control=[...panel.controls.querySelectorAll('input:not([type="checkbox"]),textarea')][draft.index];if(control)window.CalculatorInputSettings.syncEditableValue(control,draft.value,{force:true});}
        panel.topologyInput?.restoreDraft();
        if(panel.numberControls&&panel.numberControls.value.value!==get(panel.assetKey)?.data.value){const controls=panel.numberControls;panel.numberDraftMode={key:panel.assetKey,mode:controls.mode.value,value:controls.value.value,replace:controls.replace.checked,positive:controls.positive.checked};}
        updateDensity(panel);
      }
      // Older AR snapshots always enabled multi-select. Restore the main
      // diagram's actual mode before reconciling those historical snapshots.
      const restoredModes=new Set();
      for(const panel of panels.values())if(panel.definition.id==='dynkin-view'&&panel.propertyRenderer&&!['missing','invalid'].includes(panel.computation.status)){
        const key=panel.computation.refs.dynkin;
        if(!restoredModes.has(key)){dynkinSelectionModes.set(key,panel.propertyRenderer.editor.objectIO('selection-mode'));restoredModes.add(key);}
      }
      for(const panel of panels.values())if(['dynkin-vertex','dynkin-view','dynkin-starting'].includes(panel.definition.id)&&panel.propertyRenderer&&!['missing','invalid'].includes(panel.computation.status)){
        const key=panel.computation.refs.dynkin,renderer=panel.propertyRenderer;renderer.applying=true;
        try{
          renderer.editor.objectIO('selection-mode',dynkinSelectionModes.get(key));
          const focus=dynkinFocus.get(key);if(focus)renderer.editor.objectIO('vertex-focus',focus);
          panel.computation.options=renderer.editor.captureAssetProperties();panel.computation.result=renderer.editor.readObjectResult();
        }finally{renderer.applying=false;}
      }
    }
    function generatePreset(id){
      if(id!=='random-stable-curve')throw new Error('Unknown topology preset generator.');
      let editor=ioRenderers.get('topology-preset-kernel');
      if(!editor){const host=element('section'),inspectorHost=element('section');api.parking.append(host,inspectorHost);editor=window.MathWorkspaceNativeEditors.factories.mosaic.mount(host,{id:'topology-preset-kernel',inspectorHost});editor.listCards().forEach(card=>editor.setCardVisible(card.key,false));editor.configureObjectPanel({mode:'topology-preset-kernel'});editor.setCanvasActive(false);editor.setInspectorActive(false);ioRenderers.set('topology-preset-kernel',editor);}
      const payload=editor.objectIO('random-stable-curve'),space={kind:'mosaic-space',id:'preset-space',data:mosaic.fromPayload('mosaic-space',payload)},diagram={kind:'mosaic-diagram',id:'preset-diagram',data:mosaic.fromPayload('mosaic-diagram',payload,keyOf(space))};
      return topology.fromMosaic('dual-graph',diagram,[space,diagram]);
    }
    numbers.setKernel((value,field)=>{
      let editor=ioRenderers.get('number-kernel');
      if(!editor){const host=element('section'),inspectorHost=element('section');api.parking.append(host,inspectorHost);editor=window.MathWorkspaceNativeEditors.factories.matrix.mount(host,{id:'number-mathematics',inspectorHost});editor.listCards().forEach(card=>editor.setCardVisible(card.key,false));editor.setCanvasActive(false);editor.setInspectorActive(false);ioRenderers.set('number-kernel',editor);}
      return editor.objectIO('number',{value,field});
    });
    slicing.setKernel((action,value)=>{
      let editor=ioRenderers.get('slice-kernel');
      if(!editor) { const host=element('section'),inspectorHost=element('section'); api.parking.append(host,inspectorHost); editor=window.MathWorkspaceNativeEditors.factories.slice.mount(host,{id:'slicing-mathematics',inspectorHost}); editor.listCards().forEach(card=>editor.setCardVisible(card.key,false)); editor.configureObjectPanel({mode:'kernel'}); editor.setCanvasActive(false); editor.setInspectorActive(false); ioRenderers.set('slice-kernel',editor); }
      return editor.objectIO(action,value);
    });
    return { panels, computations, registry,find,reveal,compare,open, openOverview, selectAsset, move, refresh, listCards, setVisible, syncPresentation, capturePanels, clearPanels, restorePanels, ioEntries, exportFormats, exportText, importText, resize: () => panels.forEach(updateDensity), closed: id => { const panel = panels.get(id); if (panel) { panel.lastLocation = 'main'; panel.location = 'hidden'; panel.closed = true; refreshPanel(panel); api.pickerChanged(); } } };
  }
  const api = { normalize, kindLabels, powerRows, fieldLabel, definitions, capabilities, capabilityFor, contextFor, compatible, keyOf, mount, inputKinds, prepareCategoryGraph, strandContext, dynkinEdges, rootObjectIssues, lieEngineIssues, prepareRootImport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceObjects = api;
}(typeof window !== 'undefined' ? window : globalThis));
