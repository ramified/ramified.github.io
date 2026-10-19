(function (root) {
  'use strict';
  const keyOf = asset => asset ? asset.kind + ':' + asset.id : '';
  const copy = value => JSON.parse(JSON.stringify(value));
  const matches = (asset, input) => !!asset && (input.kinds || [input.kind]).includes(asset.kind)
    && (!input.subtype || asset.type === input.subtype)
    && (!input.subtypes?.[asset.kind] || input.subtypes[asset.kind].includes(asset.type))
    && (!input.families || input.families.includes(asset.data.family))
    && !(input.excludeTypes || []).includes(asset.type);
  // Extra relations supplement the authoritative input slots in calculator definitions.
  const relations = {
    'dynkin-invariants': { via: [{ kind: 'dynkin', field: 'lie', input: 'lie' }] },
    'dynkin-cartan': { via: [{ kind: 'dynkin', field: 'lie', input: 'lie' }] },
    'strands-basis': { via: [{ kind: 'strands', field: 'lie', input: 'lie' }] },
    'strands-relations': { selection: [{ kind: 'strands' }, { kind: 'lie', families: ['A','B','C','D'] }] },
    'strands-display': { views: ['strands-input'] },
    'category-diagram': { nodes: { id: 'nodes', label: 'Categories / functors', kinds: ['category','functor'], min: 1 } },
    'slicing-scene': { nodes: { id: 'nodes', label: 'Objects to project or slice', kinds: ['frame','polytope','sphere','point','vector','roots','lattice','voronoi','formula','tropical','weyl','cone','fan','matrix','variety'], subtypes: { variety: ['toric'] }, excludeInput: 'frame', min: 1 } },
    'branching': { defaultRule: 'diag-gl' }
  };
  function create({ assets = {}, definitions = [], nativePanels = {} } = {}) {
    const assetTypes = Object.entries(assets).map(([kind, subtypes]) => ({ kind, subtypes: subtypes.map(([type,label]) => ({ type,label })) }));
    const panels = definitions.map(definition => ({
      id: definition.id, label: definition.label, route: 'objects',
      role: definition.input ? 'input' : definition.display ? 'view' : 'property',
      inputs: (definition.slots || []).map(slot => ({ ...slot, ...(definition.engine === 'double-young' && slot.kind === 'young' ? { excludeTypes: ['generalized'] } : {}) })),
      ...(definition.input ? { edits: { kind: definition.input, subtype: definition.subtype } } : {}),
      ...copy(relations[definition.id] || {}),
      ...(definition.viewTypes ? { views: definition.viewTypes.slice() } : {})
    }));
    for (const definition of Object.values(nativePanels)) if (definition.nativeCardKey) panels.push({
      id: 'asset:' + definition.cardType, cardType: definition.cardType, label: definition.label,
      // Toric varieties are handled by the slicing engine; the legacy Sheaf
      // property adapter has no toric geometry projection.
      route: 'assets', role: 'property', inputs: [{ id: 'asset', label: 'Asset', kinds: [...definition.supportedKinds], excludeTypes: ['toric'] }]
    });
    const byId = new Map(panels.map(panel => [panel.id,panel]));
    function bindingKey(id, refs = {}, rule) {
      return JSON.stringify([id, Object.entries(refs).filter(([,value]) => Array.isArray(value) ? value.length : !!value).sort(([a],[b]) => a.localeCompare(b)), rule || byId.get(id)?.defaultRule || '']);
    }
    function suggest(selectedKeys, allAssets, views = []) {
      const selected = [...new Set(selectedKeys)].map(key => allAssets.find(asset => keyOf(asset) === key)).filter(Boolean), result = [];
      const get = key => allAssets.find(asset => keyOf(asset) === key);
      const emit = (panel, refs, extra = {}) => {
        const missing = panel.inputs.filter(input => !input.optional && !refs[input.id]).map(input => input.label);
        if (panel.nodes && !(refs[panel.nodes.id] || []).length) missing.push(panel.nodes.label);
        result.push({ id: panel.id, label: panel.label, route: panel.route, cardType: panel.cardType, role: panel.role, refs, rule: panel.defaultRule, missing, ready: !missing.length, key: bindingKey(panel.id,refs), ...extra });
      };
      for (const panel of panels) {
        if (panel.role === 'input') continue;
        if (panel.role === 'view') {
          for (const view of views) if (!view.closed && panel.views?.includes(view.type) && (selected.length ? selected.some(asset => view.assetKeys.includes(keyOf(asset))) : view.active)) emit(panel,{view:view.id},{viewLabel:view.label});
          continue;
        }
        if (!selected.length) continue;
        if (panel.selection) { if (selected.some(asset => panel.selection.some(input => matches(asset,input)))) emit(panel,{}); continue; }
        const candidates = input => {
          const direct = selected.filter(asset => matches(asset,input));
          const linked = (panel.via || []).filter(relation => relation.input === input.id).flatMap(relation => selected.filter(asset => asset.kind === relation.kind).map(asset => get(asset.data[relation.field]))).filter(asset => matches(asset,input));
          return [...new Map([...direct,...linked].map(asset => [keyOf(asset),asset])).values()];
        };
        if (panel.inputs.length === 1 && !panel.nodes) { for (const asset of candidates(panel.inputs[0])) emit(panel,{[panel.inputs[0].id]:keyOf(asset)}); continue; }
        const refs = {}, used = new Set();
        for (const input of panel.inputs) { const asset = candidates(input).find(asset => !used.has(keyOf(asset))); if (asset) { refs[input.id]=keyOf(asset);used.add(keyOf(asset)); } }
        if (panel.nodes) refs[panel.nodes.id] = selected.filter(asset => matches(asset,panel.nodes) && keyOf(asset)!==refs[panel.nodes.excludeInput]).map(keyOf);
        if (Object.values(refs).some(value => Array.isArray(value) ? value.length : !!value)) emit(panel,refs);
      }
      return result.sort((a,b) => Number(b.ready)-Number(a.ready));
    }
    return { assets: assetTypes, panels, matches, suggest, bindingKey, get: id => byId.get(id) };
  }
  const api = { create, matches, relations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspacePanelCatalog = api;
}(typeof window !== 'undefined' ? window : globalThis));
