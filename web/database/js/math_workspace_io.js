(function (root) {
  'use strict';
  const schema = 'ramified-math-workspace';
  const clone = value => JSON.parse(JSON.stringify(value));
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  function safeData(value) {
    if (Array.isArray(value)) value.forEach(safeData);
    else if (record(value)) for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid backup property.');
      safeData(item);
    }
    else if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Backup numbers must be finite.');
  }
  function parse(text) {
    const value = JSON.parse(text); safeData(value);
    if (!record(value) || value.schema !== schema || value.version !== 1) throw new Error('Choose a supported complete workspace JSON backup (version 1).');
    if (!Array.isArray(value.assets) || !Array.isArray(value.panels) || !Array.isArray(value.calculators) || !record(value.workspace)) throw new Error('The workspace backup is incomplete.');
    return value;
  }
  function migrateHomologyCards(value) {
    const cards=value.assetCards;
    if(!Array.isArray(cards?.instances)||!Array.isArray(cards?.slots))return value;
    const legacy=cards.slots.filter(slot=>slot.cardType==='homology');
    if(legacy.length>1)throw new Error('Duplicate legacy Homology slot.');
    const keys=new Map(),instances=[];
    for(const instance of cards.instances) {
      if(instance.cardType!=='homology')continue;
      const ref=instance.targetRef;
      if(!['variety','sheaf','map'].includes(ref?.kind))throw new Error('Invalid legacy Homology target.');
      const oldKey=`asset:${ref.kind}:${ref.id}:homology`,type='homology-'+ref.kind;
      instance.cardType=type;keys.set(oldKey,{key:`asset:${ref.kind}:${ref.id}:${type}`,type});instances.push(instance);
    }
    if(!legacy.length)return value;
    const slot=legacy[0],active=keys.get(slot.activeInstanceKey),replacements=[];
    if(!Array.isArray(slot.recentInstanceKeys))throw new Error('Invalid legacy Homology history.');
    for(const kind of ['variety','sheaf','map']) {
      const type='homology-'+kind;
      if(cards.slots.some(item=>item.cardType===type))throw new Error('Conflicting Homology slots.');
      const history=slot.recentInstanceKeys.map(key=>keys.get(key)).filter(item=>item?.type===type).map(item=>item.key);
      const first=instances.find(item=>item.cardType===type),firstKey=first&&`asset:${kind}:${first.targetRef.id}:${type}`;
      const current=active?.type===type?active.key:history[0]||firstKey||null;
      replacements.push({...slot,cardType:type,activeInstanceKey:current,recentInstanceKeys:[...new Set(history)].filter(key=>key!==current),visible:!!slot.visible&&active?.type===type,snapshot:active?.type===type?slot.snapshot:null});
    }
    cards.slots=cards.slots.flatMap(item=>item===slot?replacements:[item]);
    const workspace=value.workspace,activeType=active?.type||'homology-variety',oldNode='asset-card:homology',node='asset-card:'+activeType,oldDock='dock:'+oldNode,dock='dock:'+node;
    if(Array.isArray(workspace?.inspectorOrder))workspace.inspectorOrder=workspace.inspectorOrder.flatMap(key=>key===oldNode?[node,...replacements.filter(item=>item.cardType!==activeType).map(item=>'asset-card:'+item.cardType)]:[key]);
    if(Array.isArray(workspace?.dockedPanels))for(const panel of workspace.dockedPanels)if(panel.source==='sidebar'&&panel.key===oldNode){panel.key=node;panel.id=dock;}
    if(Array.isArray(workspace?.tabs))workspace.tabs=workspace.tabs.map(id=>id===oldDock?dock:id);
    if(workspace?.panes)for(const name of ['primary','secondary'])if(workspace.panes[name]===oldDock)workspace.panes[name]=dock;
    if(workspace?.inspectorSourceId===oldDock)workspace.inspectorSourceId=dock;
    return value;
  }
  function unique(items, key, label) {
    const seen = new Set();
    for (const item of items) {
      const id = key(item);
      if (typeof id !== 'string' || !id || seen.has(id)) throw new Error('Invalid or duplicate ' + label + '.');
      seen.add(id);
    }
  }
  function validate(value, { subtypes, definitions, calculatorIds, nameKey, validName, normalize, references }) {
    unique(value.assets, a => record(a) && a.kind + ':' + a.id, 'asset ID');
    unique(value.assets, a => record(a) && typeof a.name === 'string' && nameKey(a.name), 'asset name');
    const assets = value.assets.map(asset => {
      if (!record(asset) || typeof asset.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(asset.id) || !subtypes[asset.kind]?.some(([type]) => type === asset.type) || !validName(asset.name) || !record(asset.data)) throw new Error('The backup contains an invalid mathematical object.');
      return { ...asset, data: normalize(asset.kind, asset.type, asset.data) };
    });
    const byKey = new Map(assets.map(a => [a.kind + ':' + a.id, a])), visiting = new Set(), visited = new Set();
    function visit(asset) {
      const key = asset.kind + ':' + asset.id;
      if (visiting.has(key)) throw new Error('Asset references cannot form a cycle.');
      if (visited.has(key)) return;
      visiting.add(key);
      for (const spec of references(asset)) {
        if (!spec.key) continue; // Incomplete new objects are legitimate workspace state.
        const target = byKey.get(spec.key);
        if (!target || target.kind !== spec.kind) throw new Error('The backup contains a missing or incompatible asset reference: ' + spec.key);
        visit(target);
      }
      visiting.delete(key); visited.add(key);
    }
    assets.forEach(visit);
    unique(value.panels, p => p?.id, 'panel ID');
    const types = new Set(definitions.map(d => d.id));
    for (const panel of value.panels) {
      if (!/^object-panel-[1-9]\d*$/.test(panel.id) || !types.has(panel.type) || !['main', 'side', 'hidden'].includes(panel.location) || !record(panel.presentation) || !Array.isArray(panel.renderers)) throw new Error('Invalid saved object panel.');
      const definition = definitions.find(d => d.id === panel.type);
      if(panel.canvasHeight!=null&&(!Number.isFinite(panel.canvasHeight)||panel.canvasHeight<240||panel.canvasHeight>1600))throw new Error('Invalid saved panel height.');
      if (definition.input ? typeof panel.assetKey !== 'string' : !record(panel.computation) || !record(panel.computation.refs)) throw new Error('Invalid panel inputs.');
      if (panel.computation?.settings != null) {
        const settings=panel.computation.settings;
        if (panel.type!=='plethysm' || !record(settings) || !['symmetric','exterior','advanced'].includes(settings.mode) || !Number.isInteger(settings.degree) || settings.degree<0 || settings.degree>12) throw new Error('Invalid plethysm power settings.');
      }
      if (panel.computation?.rule && !['diag-gl','diag-o','diag-sp','sum-gl','sum-o','sum-sp','pol-o-gl','pol-sp-gl','gl-o','gl-sp','gl-o-gl','gl-sp-gl'].includes(panel.computation.rule)) throw new Error('Invalid branching rule.');
      if(panel.drafts!=null&&(!Array.isArray(panel.drafts)||panel.drafts.some(d=>!Number.isInteger(d.index)||d.index<0||typeof d.value!=='string')))throw new Error('Invalid saved input drafts.');
      if(panel.legacyView!=null&&(!['young','double-young','dynkin','strand'].includes(panel.legacyView.engine)||!record(panel.legacyView.snapshot)))throw new Error('Invalid saved legacy view.');
      for (const renderer of panel.renderers) if (!['input','compact','large','property'].includes(renderer.role) || !record(renderer.snapshot)) throw new Error('Invalid saved panel renderer.');
    }
    unique(value.calculators, c => c?.id, 'calculator session');
    for (const item of value.calculators) if (!calculatorIds.includes(item.id) || !record(item.snapshot)) throw new Error('Invalid calculator session.');
    const workspace = value.workspace, docked=workspace.dockedPanels||[];
    if(!Array.isArray(docked))throw new Error('Invalid saved docked panels.');
    unique(docked,p=>p?.id,'docked panel');
    for(const panel of docked){
      if(!record(panel)||!['canvas','sidebar','native-card'].includes(panel.source)||!['main','side','hidden'].includes(panel.location)||panel.canvasHeight!=null&&(!Number.isFinite(panel.canvasHeight)||panel.canvasHeight<240||panel.canvasHeight>1600))throw new Error('Invalid saved docked panel.');
      if(panel.source==='canvas'&&(!['assets',...value.calculators.map(c=>c.id)].includes(panel.id))||panel.source==='sidebar'&&(typeof panel.key!=='string'||panel.id!=='dock:'+panel.key)||panel.source==='native-card'&&(!value.calculators.some(c=>c.id===panel.sessionId)||typeof panel.key!=='string'||panel.id!=='native-card:'+panel.sessionId+':'+panel.key))throw new Error('Invalid docked panel reference.');
    }
    const ids = new Set(['assets', ...value.calculators.map(c => c.id), ...value.panels.filter(p => p.location === 'main').map(p => p.id), ...docked.filter(p=>p.location==='main').map(p=>p.id)]);
    if (!Array.isArray(workspace.tabs) || workspace.tabs.some(id => !ids.has(id)) || new Set(workspace.tabs).size !== workspace.tabs.length || !record(workspace.panes) || !['primary','secondary'].includes(workspace.focusedPane)) throw new Error('Invalid workspace layout.');
    if(docked.some(panel=>(panel.location==='main')!==workspace.tabs.includes(panel.id)))throw new Error('A docked panel has a conflicting saved location.');
    for (const id of Object.values(workspace.panes)) if (id && !workspace.tabs.includes(id)) throw new Error('A workspace pane references a missing tab.');
    if (workspace.split && (!workspace.panes.primary || !workspace.panes.secondary || workspace.panes.primary === workspace.panes.secondary)) throw new Error('Split view needs two distinct tabs.');
    if (!record(workspace.assets) || !Array.isArray(workspace.inspectorOrder) || !Array.isArray(value.assetCards?.slots) || !Array.isArray(value.assetCards?.instances)) throw new Error('Invalid saved workspace settings.');
    return { ...value, assets };
  }
  // Only offer formats with a native mathematical constructor. JSON backups
  // handle all other object types; CAS exports never substitute data records.
  function casFormats(asset) {
    if (!asset) return [];
    if (['matrix','point','vector'].includes(asset.kind)) return ['sage','macaulay2'];
    if (asset.kind === 'young' && asset.type === 'partition' || ['lie','cone'].includes(asset.kind)) return ['sage'];
    if (asset.kind === 'lattice' && asset.data.basisRows?.length && asset.data.basisRows.every(row => row.every(Number.isSafeInteger))) return ['sage'];
    return [];
  }
  const casNames = { young: 'partition', lie: 'cartan_type', point: 'p', vector: 'v', lattice: 'L', cone: 'C' };
  function casName(asset, format) {
    // Names are labels, never source code. Use a safe default for LaTeX names,
    // reserved words, and names that would shadow the constructor or its ring.
    const reserved = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield true false null new then do catch use package needsPackage end local export option QQ ZZ Matrix matrix vector Partition CartanType Cone IntegerLattice'.split(' '));
    const identifier = format === 'macaulay2' ? /^[A-Za-z][A-Za-z0-9]*$/ : /^[A-Za-z][A-Za-z0-9_]*$/;
    return identifier.test(asset.name) && !reserved.has(asset.name) ? asset.name : casNames[asset.kind];
  }
  function casExport(asset, format) {
    if (!casFormats(asset).includes(format) || asset.kind === 'matrix') throw new Error('This object has no supported native definition in the selected computer algebra system.');
    const data = asset.data, name = casName(asset, format);
    const list = values => (format === 'sage' ? '[' : '{') + values.map(rationalLiteral).join(', ') + (format === 'sage' ? ']' : '}');
    let expression;
    if (['point','vector'].includes(asset.kind)) expression = 'vector(QQ, ' + list(data.position || data.vector) + ')';
    if (asset.kind === 'young') expression = 'Partition(' + list(data.rows) + ')';
    if (asset.kind === 'lie') expression = 'CartanType([' + JSON.stringify(data.family.charAt(0)) + ', ' + data.rank + '])';
    if (asset.kind === 'cone') expression = 'Cone([' + data.generators.map(g => list(g.coordinates)).join(', ') + '], lattice=ZZ**' + data.ambientDimension + ')';
    if (asset.kind === 'lattice') {
      // The workspace stores basis vectors as columns; IntegerLattice takes rows.
      const basis = data.basisRows[0].map((_, column) => data.basisRows.map(row => row[column]));
      expression = 'IntegerLattice(matrix(ZZ, [' + basis.map(list).join(', ') + ']), lll_reduce=False)';
    }
    const prelude = asset.kind === 'lattice' ? 'from sage.modules.free_module_integer import IntegerLattice\n' : '';
    return prelude + name + ' = ' + expression + (format === 'macaulay2' ? ';' : '') + '\n';
  }
  function rationalLiteral(value) {
    const parts = String(value).trim().split('/');
    if (parts.length === 2) return '(' + rationalLiteral(parts[0]) + ')/(' + rationalLiteral(parts[1]) + ')';
    if (parts.length !== 1 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(parts[0])) throw new Error('A numeric CAS coordinate was expected.');
    const [mantissa, power = '0'] = parts[0].toLowerCase().split('e'), [whole, fraction = ''] = mantissa.split('.');
    const numerator = BigInt((whole || '0') + fraction), exponent = Number(power) - fraction.length;
    if (Math.abs(exponent) > 10000) throw new Error('Numeric exponent is too large to export.');
    let n = exponent >= 0 ? numerator * 10n ** BigInt(exponent) : numerator, d = exponent >= 0 ? 1n : 10n ** BigInt(-exponent);
    let a = n < 0n ? -n : n, b = d;
    while (b) [a,b] = [b,a % b];
    n /= a; d /= a;
    return d === 1n ? String(n) : '(' + n + '/' + d + ')';
  }
  const api = { schema, clone, parse, validate, migrateHomologyCards, casFormats, casExport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MathWorkspaceIO = api;
}(typeof window !== 'undefined' ? window : globalThis));
