(function (root) {
  'use strict';
  const keyOf = asset => asset ? asset.kind + ':' + asset.id : '';
  const copy = value => JSON.parse(JSON.stringify(value));
  // Approved user choices. Wait entries retain their existing associations.
  const draftPrincipals = Object.freeze({
    'frame-details':'frame','cone-faces':'cone','cone-variety':'cone','fan-orbits':'fan','fan-divisors':'variety','lattice-character':'variety',
    'dynkin-invariants':'lie','dynkin-cartan':'lie','dynkin-vertex':'dynkin','dynkin-parabolic':'dynkin','dynkin-starting':'dynkin',
    'strands-info':'strands','strands-calculation':'strands','strands-relations':'strands','strands-basis':'lie',
    'matrix-invariants':'matrix','matrix-computation':'matrix','matrix-polynomial':'matrix',
    statistics:'young',weight:'young',branching:'young',symmetric:'young','pair-statistics':'young',lr:'young',invariants:'young',kostka:'young',kronecker:'young',plethysm:'young',schur:'young',grassmannian:'young',polynomials:'young',slice:'young',
    'asset:hodge':'variety','asset:betti':'variety','asset:homology-variety':'variety','asset:homology-sheaf':'sheaf','asset:homology-map':'map','asset:characteristic-classes':'sheaf','asset:sheaf-cohomology':'sheaf'
  });
  const matches = (asset, input) => !!asset && (input.kinds || [input.kind]).includes(asset.kind)
    && (!input.subtype || asset.type === input.subtype)
    && (!input.subtypes?.[asset.kind] || input.subtypes[asset.kind].includes(asset.type))
    && (!input.families || input.families.includes(asset.data.family))
    && !(input.excludeTypes || []).includes(asset.type);
  // Extra relations supplement the authoritative input slots in calculator definitions.
  const relations = {
    'complex-diagrams': {nodes:{id:'nodes',label:'Complexes / filtrations',kinds:['complex','filtration'],min:0}},
    'strands-relations': { selection: [{ kind: 'strands' }, { kind: 'lie', families: ['A','B','C','D'] }] },
    'strands-display': { views: ['strands-input'] },
    'category-diagram': { nodes: { id: 'nodes', label: 'Categories / functors', kinds: ['category','functor'], min: 1 } },
    'slicing-scene': { nodes: { id: 'nodes', label: 'Objects to project or slice', kinds: ['frame','polytope','sphere','point','vector','roots','lattice','voronoi','formula','tropical','weyl','cone','fan','matrix','variety'], subtypes: { variety: ['toric'] }, excludeInput: 'frame', min: 1 } },
    'branching': { defaultRule: 'diag-gl' }
  };
  function create({ assets = {}, definitions = [], nativePanels = {}, resolveRefs = (id, refs) => refs } = {}) {
    const assetTypes = Object.entries(assets).map(([kind, subtypes]) => ({ kind, subtypes: subtypes.map(([type,label]) => ({ type,label })) }));
    const panels = definitions.filter(definition=>!definition.legacy).map(definition => ({
      id: definition.id, label: definition.label, route: 'objects',
      role: definition.input ? 'input' : definition.display ? 'view' : definition.assetView || definition.objectView || definition.scene || definition.slicingScene || definition.id==='matrix-view' ? 'display' : 'property',
      inputs: (definition.slots || []).map(slot => ({ ...slot, ...(definition.engine === 'double-young' && slot.kind === 'young' ? { excludeTypes: ['generalized'] } : {}) })),
      ...(definition.input ? { edits: { kind: definition.input, subtype: definition.subtype } } : {}),
      ...copy(relations[definition.id] || {}),
      ...(definition.viewTypes ? { views: definition.viewTypes.slice() } : {})
    }));
    for (const definition of Object.values(nativePanels)) if (definition.nativeCardKey) panels.push({
      id: 'asset:' + definition.cardType, cardType: definition.cardType, label: definition.label,
      // Toric varieties are handled by the slicing engine; the legacy Sheaf
      // property adapter has no toric geometry projection.
      route: 'assets', role: 'property', ...(definition.targetLabels?{targetLabels:{...definition.targetLabels}}:{}), inputs: [{ id: 'asset', label: 'Asset', kinds: [...definition.supportedKinds], excludeTypes: ['toric'] }]
    });
    const byId = new Map(panels.map(panel => [panel.id,panel]));
    const inputKinds = input => input.kinds || (input.kind ? [input.kind] : []);
    function principalCandidates(panel, seen = new Set()) {
      if(seen.has(panel.id))return [];seen.add(panel.id);
      return [...new Set([
        ...panel.inputs.flatMap(inputKinds),...(panel.via||[]).map(relation=>relation.kind),
        ...(panel.selection||[]).flatMap(inputKinds),...inputKinds(panel.nodes||{}),
        ...(panel.views||[]).flatMap(id=>{const view=byId.get(id);return view?(view.edits?[view.edits.kind]:principalCandidates(view,seen)):[];})
      ])];
    }
    const principalPanels=panels.filter(panel=>panel.role==='property');
    const choices=new Map(principalPanels.map(panel=>[panel.id,principalCandidates(panel)]));
    const proposed=Object.fromEntries(principalPanels.map(panel=>{
      const kinds=choices.get(panel.id),primary=panel.inputs.find(input=>!input.optional);
      return [panel.id,draftPrincipals[panel.id]==='wait'||kinds.includes(draftPrincipals[panel.id])?draftPrincipals[panel.id]:inputKinds(primary||{}).find(kind=>kind!=='frame')||kinds.find(kind=>kind!=='frame')||kinds[0]||null];
    }));
    let principalSettings={enabled:true,types:{...proposed}};
    function configurePrincipals(next={}) {
      const types={...proposed};
      for(const [id,kind] of Object.entries(next.types||{})) {
        if(id==='asset:homology'&&!byId.has(id))continue; // Retired shared entry; the three typed panels have independent assignments.
        if(byId.has(id)&&byId.get(id).role!=='property')continue; // Accept older drafts without assigning properties to displays.
        if(!choices.has(id)||kind!==null&&kind!=='wait'&&!choices.get(id).includes(kind))throw new Error('Choose a compatible principal asset type for '+id+'.');
        types[id]=kind;
      }
      principalSettings={enabled:next.enabled==null?true:!!next.enabled,types};return getPrincipals();
    }
    function getPrincipals(){return {enabled:principalSettings.enabled,types:{...principalSettings.types}};}
    function bindingKey(id, refs = {}, rule) {
      return JSON.stringify([id, Object.entries(refs).filter(([,value]) => Array.isArray(value) ? value.length : !!value).sort(([a],[b]) => a.localeCompare(b)), rule || byId.get(id)?.defaultRule || '']);
    }
    function suggest(selectedKeys, allAssets, views = []) {
      const selected = [...new Set(selectedKeys)].map(key => allAssets.find(asset => keyOf(asset) === key)).filter(Boolean), result = [];
      const get = key => allAssets.find(asset => keyOf(asset) === key);
      const emit = (panel, refs, extra = {}) => {
        refs = resolveRefs(panel.id, refs, allAssets);
        const missing = panel.inputs.filter(input => !input.optional && !refs[input.id]).map(input => input.label);
        if (panel.nodes && !(refs[panel.nodes.id] || []).length) missing.push(panel.nodes.label);
        result.push({ id: panel.id, label: panel.targetLabels?.[get(refs.asset)?.kind]||panel.label, route: panel.route, cardType: panel.cardType, role: panel.role, refs, rule: panel.defaultRule, missing, ready: !missing.length, key: bindingKey(panel.id,refs), ...extra });
      };
      for (const panel of panels) {
        if (panel.role === 'input') continue;
        const principal=principalSettings.types[panel.id],filtering=principalSettings.enabled&&selected.length>0&&panel.role==='property'&&principal!=='wait';
        const owns=asset=>asset.kind===principal&&(panel.role==='view'||panel.inputs.some(input=>matches(asset,input))||panel.nodes&&matches(asset,panel.nodes)||(panel.selection||[]).some(input=>matches(asset,input))||(panel.via||[]).some(relation=>relation.kind===asset.kind&&panel.inputs.some(input=>input.id===relation.input&&matches(get(asset.data[relation.field]),input))));
        if(filtering&&(principal===null||!selected.some(owns)))continue;
        if (panel.role === 'view') {
          const sources=filtering?selected.filter(owns):selected;
          for (const view of views) if (!view.closed && panel.views?.includes(view.type) && (selected.length ? sources.some(asset => view.assetKeys.includes(keyOf(asset))) : view.active)) emit(panel,{view:view.id},{viewLabel:view.label});
          continue;
        }
        if (!selected.length) continue;
        if (panel.selection) { if (selected.some(asset => panel.selection.some(input => matches(asset,input)))) emit(panel,{}); continue; }
        const candidates = input => {
          const sources=filtering&&panel.inputs.length===1&&!panel.nodes?selected.filter(asset=>asset.kind===principal):selected;
          const direct = sources.filter(asset => matches(asset,input));
          const linked = (panel.via || []).filter(relation => relation.input === input.id).flatMap(relation => sources.filter(asset => asset.kind === relation.kind).map(asset => get(asset.data[relation.field]))).filter(asset => matches(asset,input));
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
    return { assets: assetTypes, panels, matches, suggest, bindingKey, get: id => byId.get(id), principalCandidates:id=>[...(choices.get(id)||[])], getPrincipals, configurePrincipals };
  }
  const api = { create, matches, relations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspacePanelCatalog = api;
}(typeof window !== 'undefined' ? window : globalThis));
