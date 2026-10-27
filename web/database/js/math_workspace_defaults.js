(function (root) {
  'use strict';
  const keyOf = asset => asset.kind + ':' + asset.id;
  // Only omitted inputs get defaults. An explicitly empty or broken reference
  // remains editable, and importing/restoring never runs this constructor.
  function assetData(kind, type, source, ensure) {
    const data = JSON.parse(JSON.stringify(source));
    const put = (field, parentKind, options = {}) => {
      if (!Object.hasOwn(data, field)) data[field] = keyOf(ensure(parentKind, options));
    };
    const n = Number(data.ambientDimension ?? data.position?.length ?? data.basis?.length ?? 4);
    if(kind==='mosaic-diagram')put('space','mosaic-space');
    if(kind==='field-extension')put('base','field',{data:{dataType:'rational'}});
    if(kind==='field'&&data.dataType==='function-field')put('constantField','field',{data:{dataType:'rational'}});
    if(kind==='number')put('field','field',{data:{dataType:'rational'}});
    const lie = rank => ({ data: { family: 'A', rank } });
    const space = { type: 'projective', data: { dimension: '3' } };
    if (['dynkin', 'strands'].includes(kind)) {
      const largest = kind === 'dynkin' ? Math.max(1, ...(data.vertices || [1]), ...Object.keys(data.quiver || {}).flatMap(edge => edge.split('-').map(v => Number(v) + 1))) : Math.max(1, ...(data.generators || []).map(g => g.index));
      put('lie', 'lie', lie(Math.max(3, largest)));
    }
    if (['roots', 'weyl'].includes(kind) || kind === 'lattice' && data.basisMode === 'dynkin') put('lie', 'lie', lie(n));
    if (kind === 'matrix') {
      if (data.construction) {
        if (!Object.hasOwn(data.construction, 'lie')) data.construction.lie = keyOf(ensure('lie', lie(Number(data.rows ?? data.entries?.length ?? 3))));
      } else put('field', 'field', { data });
    }
    if (kind === 'lattice' && data.basisMode === 'matrix-object') put('matrix', 'matrix', { data: { rows: n, cols: n, dataType: 'real' } });
    if (kind === 'voronoi') {
      put('lattice', 'lattice', { data: { ambientDimension: n } });
      put('point', 'point', { data: { ambientDimension: n } });
    }
    if (kind === 'functor') { put('domain', 'category'); put('codomain', 'category'); }
    if (kind === 'variety' && type === 'toric' && !Object.hasOwn(data, 'fan') && !Object.hasOwn(data, 'cone')) put('fan', 'fan', { data: { ambientDimension: Number(data.dimension ?? 4) } });
    if (kind === 'variety' && type === 'product') { put('first', 'variety', space); put('second', 'variety', space); }
    if (kind === 'sheaf') {
      if (['direct-sum', 'tensor', 'internal-hom'].includes(type)) {
        put('first', 'sheaf', { type: 'structure' }); put('second', 'sheaf', { type: 'tangent' });
      } else if (['dual', 'self-direct-sum', 'self-tensor-product', 'schur'].includes(type)) put('parent', 'sheaf', { type: 'structure' });
      else if (['ideal-sheaf', 'normal-bundle', 'conormal-bundle', 'relative-tangent', 'relative-cotangent', 'map-operation'].includes(type)) put('map', 'map');
      else put('base', 'variety', space);
    }
    if (kind === 'map') {
      const parentKind = type === 'sheaf' ? 'sheaf' : type === 'composition' ? 'map' : 'variety';
      const options = parentKind === 'variety' ? space : {};
      put('domain', parentKind, options); put('codomain', parentKind, options);
    }
    return data;
  }
  function panelRefs(definition, source, assets, ensure) {
    const refs = JSON.parse(JSON.stringify(source)), get = key => assets.find(asset => keyOf(asset) === key);
    const bound = Object.values(refs).flat().map(get).filter(Boolean);
    if (!bound.length) return refs;
    // Wait for the actual operands before supplying supporting context.
    if ((definition.slots || []).some(spec => !spec.optional && !refs[spec.id] && !['frame', 'lie', 'point'].includes(spec.kind))) return refs;
    const put = (id, kind, options) => { const asset = ensure(kind, options); if (asset) refs[id] = keyOf(asset); };
    for (const spec of definition.slots || []) {
      if (spec.optional || Object.hasOwn(refs, spec.id)) continue;
      if (spec.kind === 'frame' && definition.slicingScene) {
        const dimension = asset => {
          if (asset.kind === 'variety') return get(asset.data.fan || asset.data.cone)?.data.ambientDimension ?? Number(asset.data.dimension);
          if (asset.kind === 'matrix' && asset.data.construction) return get(asset.data.construction.lie)?.data.rank;
          return asset.data.ambientDimension ?? asset.data.rows;
        };
        const dimensions = [...new Set(bound.filter(asset => asset.kind !== 'frame').map(dimension))];
        if (dimensions.length === 1 && Number.isSafeInteger(dimensions[0]) && dimensions[0] >= 2 && dimensions[0] <= 8) put(spec.id, 'frame', { data: { ambientDimension: dimensions[0] } });
      } else if (spec.kind === 'lie' && bound.some(asset => asset.kind === 'young')) {
        const rank = Math.max(3, ...bound.filter(asset => asset.kind === 'young').map(asset => asset.data.rows.length));
        if (rank <= 12) put(spec.id, 'lie', { data: { family: 'A', rank } });
      } else if (spec.kind === 'point' && definition.id === 'lattice-character') {
        const lattice = get(refs.lattice);
        if (lattice) put(spec.id, 'point', { data: { ambientDimension: lattice.data.ambientDimension } });
      }
    }
    return refs;
  }
  function unusedDefaultKeys(assets, roots = []) {
    const byKey = new Map(assets.map(asset => [keyOf(asset), asset]));
    const pending = [...roots, ...assets.filter(asset => !asset.isDefault).map(keyOf)], reachable = new Set();
    while (pending.length) {
      const key = pending.pop(), asset = byKey.get(key);
      if (!asset || reachable.has(key)) continue;
      reachable.add(key);
      for (const ref of asset.dependencies || []) pending.push(typeof ref === 'string' ? ref : keyOf(ref));
    }
    return assets.filter(asset => asset.isDefault && !reachable.has(keyOf(asset))).map(keyOf);
  }
  const api = { assetData, panelRefs, unusedDefaultKeys };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceDefaults = api;
}(typeof window !== 'undefined' ? window : globalThis));
