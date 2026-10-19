(function (root) {
  'use strict';
  const labels = { frame: 'Frame', polytope: 'Polytope', sphere: 'Sphere', point: 'Coordinate point', vector: 'Vector', roots: 'Roots', lattice: 'Lattice', voronoi: 'Voronoi cell', formula: 'Formula set', tropical: 'Tropical polynomial', weyl: 'Weyl chambers', cone: 'Rational cone', fan: 'Fan' };
  const kinds = Object.keys(labels), keyOf = a => a ? a.kind + ':' + a.id : '';
  const clone = value => JSON.parse(JSON.stringify(value));
  const subtypes = Object.fromEntries(kinds.map(kind => [kind, [[kind, labels[kind]]]]));
  subtypes.polytope = [['regular-polytope','Regular polytope'],['simplex','Simplex']];
  const nativeTypes = { polytope: 'regular-polytope', sphere: 'sphere', point: 'point', vector: 'vector', roots: 'root-set', lattice: 'lattice', voronoi: 'voronoi-diagram', formula: 'formula-set', tropical: 'tropical-polynomial', weyl: 'weyl-chambers', cone: 'toric-cone', fan: 'toric-fan', matrix: 'matrix', lie: 'dynkin-type' };
  const regularFamilies = ['regular-simplex','hypercube','cross-polytope','dodecahedron','icosahedron','24-cell','120-cell','600-cell'];
  const fanPresets = ['affine-space','projective-space','weighted-projective-space'];
  let kernel = null;
  function setKernel(value) { kernel = value; }
  function math(action, value) { if (!kernel) throw new Error('The slicing mathematics adapter is not ready.'); return kernel(action, value); }
  function number(value, label = 'Coordinate') {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const s = String(value ?? '').trim(), part = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?';
    if (!new RegExp('^' + part + '(?:\\s*/\\s*' + part + ')?$', 'i').test(s)) throw new Error(label + ' must be a finite number or fraction.');
    const [a,b] = s.split('/').map(Number), result = b === undefined ? a : a/b;
    if (!Number.isFinite(result)) throw new Error(label + ' must be finite.');
    return result;
  }
  function dimension(value = 4) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 2) throw new Error('Ambient dimension must be an integer at least 2.'); return n; }
  const identity = n => Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r===c?1:0));
  function vector(value, n, label = 'Vector') {
    if (!Array.isArray(value) || value.length !== n) throw new Error(label + ' must have exactly ' + n + ' coordinates.');
    return value.map(x=>number(x,label));
  }
  function rows(value, n, label = 'Matrix', fullRank = false) {
    if (!Array.isArray(value) || value.length !== n) throw new Error(label + ' must have exactly ' + n + ' rows.');
    const result = value.map(row=>vector(row,n,label));
    if (fullRank && !independent(result)) throw new Error(label + ' must be invertible. The previous data is unchanged.');
    return result;
  }
  function independent(matrix) {
    const a = matrix.map(row=>row.slice()), n=a.length;
    const max = Math.max(...a.flat().map(Math.abs)); if (!max) return false;
    for (let c=0;c<n;c++) {
      let pivot=c; for (let r=c+1;r<n;r++) if (Math.abs(a[r][c])>Math.abs(a[pivot][c])) pivot=r;
      if (Math.abs(a[pivot][c]) <= max*1e-12) return false;
      [a[c],a[pivot]]=[a[pivot],a[c]];
      for(let r=c+1;r<n;r++) { const f=a[r][c]/a[c][c]; for(let j=c;j<n;j++) a[r][j]-=f*a[c][j]; }
    }
    return true;
  }
  function choice(value, allowed, fallback, label) { const result=value??fallback; if(!allowed.includes(result)) throw new Error('Unsupported '+label+'.'); return result; }
  function normalize(kind,type,source={}) {
    if (kind==='variety' && type==='toric') return { dimension:String(source.dimension??4), fan:String(source.fan||''), cone:String(source.cone||'') };
    if(!subtypes[kind]?.some(([value])=>value===type)) throw new Error('Unsupported slicing asset subtype.');
    const n=dimension(source.ambientDimension??source.position?.length??source.basis?.length??4), base={ambientDimension:n};
    // A new blank editor has a bounded allocation. Larger supplied mathematical data is preserved.
    const defaults = () => { if(n>256) throw new Error('Supply explicit data for a space of dimension greater than 256.'); return identity(n); };
    const zero = () => { if(n>256) throw new Error('Supply explicit coordinates for this dimension.'); return Array(n).fill(0); };
    if(kind==='frame') return {...base,position:vector(source.position??zero(),n,'Frame point'),basis:rows(source.basis??defaults(),n,'Frame basis',true)};
    if(kind==='polytope') {
      if(!['regular-polytope','simplex'].includes(type)) throw new Error('Unsupported polytope type.');
      const family=choice(source.family,regularFamilies,'hypercube','regular polytope family'), scale=number(source.scale??1,'Scale');
      if(scale<=0) throw new Error('Scale must be positive.');
      if(type==='regular-polytope' && (['dodecahedron','icosahedron'].includes(family)&&n!==3 || ['24-cell','120-cell','600-cell'].includes(family)&&n!==4)) throw new Error('This regular polytope family requires its original ambient dimension.');
      return {...base,scale,...(type==='regular-polytope'?{family}:{})};
    }
    if(kind==='sphere') { const radius=number(source.radius??1,'Radius'); if(radius<=0) throw new Error('Radius must be positive.'); return {...base,center:vector(source.center??zero(),n,'Sphere center'),radius}; }
    if(kind==='point') return {...base,position:vector(source.position??zero(),n,'Point')};
    if(kind==='vector') return {...base,vector:vector(source.vector??defaults()[0],n),label:String(source.label||'v')};
    if(kind==='roots'||kind==='weyl') return {...base,lie:String(source.lie||''),...(kind==='roots'?{rootSignMode:choice(source.rootSignMode,['all','positive'],'all','root sign mode')}:{})};
    if(kind==='lattice') {
      const basisMode=choice(source.basisMode,['matrix-input','matrix-object','dynkin','lmfdb-field'],'matrix-input','lattice construction');
      if(basisMode==='matrix-input') return {...base,basisMode,basisRows:rows(source.basisRows??defaults(),n,'Lattice basis',true)};
      if(basisMode==='matrix-object') return {...base,basisMode,matrix:String(source.matrix||'')};
      if(basisMode==='dynkin') return {...base,basisMode,lie:String(source.lie||''),dynkinLatticeKind:choice(source.dynkinLatticeKind,['root','weight'],'root','Dynkin lattice')};
      return {...base,basisMode,lmfdbQuery:String(source.lmfdbQuery||'Qi'),lmfdbField:source.lmfdbField?clone(source.lmfdbField):null,embeddingCoordinateMode:choice(source.embeddingCoordinateMode,['raw','minkowski'],'raw','embedding coordinates')};
    }
    if(kind==='voronoi') return {...base,lattice:String(source.lattice||''),point:String(source.point||'')};
    if(kind==='formula') { const formula=String(source.formula??'x1^2 + x2^2 <= 1').trim(); if(!formula) throw new Error('Enter a formula.'); return {...base,formula}; }
    if(kind==='tropical') { const tropicalInput=String(source.tropicalInput??'max(0,x1,x2)').trim(); if(!tropicalInput) throw new Error('Enter a tropical polynomial.'); return {...base,tropicalInput,tropicalConvention:choice(source.tropicalConvention,['max','min'],'max','tropical convention')}; }
    if(kind==='cone') {
      const generators=source.generators??[];
      if(!Array.isArray(generators)) throw new Error('Supply a list of cone generators.');
      const ids=new Set();
      return {...base,generators:generators.map((g,i)=>{
        const id=String(g.id||'ray-'+(i+1)); if(ids.has(id)) throw new Error('Ray IDs must be unique.'); ids.add(id);
        vector(g.coordinates,n,'Ray');
        return {id,label:String(g.label||'u_'+(i+1)),coordinates:g.coordinates.map(String)};
      })};
    }
    if(kind==='fan') {
      const constructionMode=choice(source.constructionMode,['preset','cone-list'],'preset','fan construction');
      if(!Array.isArray(source.cones??[])) throw new Error('Supply cone references.');
      return {...base,constructionMode,...(constructionMode==='preset'?{preset:choice(source.preset,fanPresets,'projective-space','fan preset')}:{cones:[...new Set(source.cones??[])].map(String)}),characterLattice:String(source.characterLattice||'')};
    }
    throw new Error('Unsupported slicing asset kind.');
  }
  const isAsset=a=>!!a&&(kinds.includes(a.kind)||a.kind==='variety'&&a.type==='toric');
  function resize(asset, next) {
    const n=dimension(next),old=asset.data.ambientDimension,d=clone(asset.data);
    if(n>8) throw new Error('The current input editor supports dimensions 2–8.');
    const resizeVector=(v,label)=>{ if(n<old&&v.slice(n).some(x=>Math.abs(number(x))>1e-12)) throw new Error(label+' has nonzero coordinates outside the new space. Supply replacement data explicitly.'); return Array.from({length:n},(_,i)=>v[i]??0); };
    if(d.position) d.position=resizeVector(d.position,'Point'); if(d.center) d.center=resizeVector(d.center,'Center'); if(d.vector) d.vector=resizeVector(d.vector,'Vector'); if(d.latticePoint) d.latticePoint=resizeVector(d.latticePoint,'Lattice point');
    for(const field of ['basis','basisRows']) if(d[field]) {
      if(n<old&&d[field].some((row,r)=>row.some((x,c)=>(r>=n||c>=n)&&Math.abs(number(x)-(r===c?1:0))>1e-12))) throw new Error('The basis uses discarded coordinates. Supply a replacement basis explicitly.');
      d[field]=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>d[field][r]?.[c]??(r===c?1:0)));
    }
    if(d.generators) d.generators=d.generators.map(g=>({...g,coordinates:resizeVector(g.coordinates,'Ray')}));
    d.ambientDimension=n; return normalize(asset.kind,asset.type,d);
  }
  const inputType=a=>a?.kind==='variety'&&a.type==='toric'?'toric-variety-input':a?.kind+'-input';
  const renderable=a=>isAsset(a)||a?.kind==='matrix';
  function references(asset) {
    const d=asset.data||{}, result=[];
    const add=(field,kind,label,optional=false,many=false)=>result.push({field,kind,label,optional,many});
    if(['roots','weyl'].includes(asset.kind)||asset.kind==='lattice'&&d.basisMode==='dynkin') add('lie','lie','Lie type');
    if(asset.kind==='matrix'&&d.construction) result.push({field:'construction.lie',kind:'lie',label:'Lie type'});
    if(asset.kind==='matrix') add('field','field','Field',true);
    if(asset.kind==='lattice'&&d.basisMode==='matrix-object') add('matrix','matrix','Basis matrix');
    if(asset.kind==='voronoi') {add('lattice','lattice','Lattice');add('point','point','Cell center');}
    if(asset.kind==='fan') { if(d.constructionMode==='cone-list') add('cones','cone','Maximal cones',false,true); add('characterLattice','lattice','Character lattice',true); }
    if(asset.kind==='variety'&&asset.type==='toric') { add('fan','fan','Fan',!!d.cone); add('cone','cone','Affine cone',!!d.fan); }
    return result;
  }
  const readRef=(data,path)=>path.split('.').reduce((x,k)=>x?.[k],data);
  function refKeys(asset) { return references(asset).flatMap(spec=>spec.many?readRef(asset.data,spec.field)||[]:[readRef(asset.data,spec.field)]).filter(Boolean); }
  function closure(selected,assets) {
    const found=new Map(),missing=[],visiting=new Set(),get=k=>assets.find(a=>keyOf(a)===k);
    function visit(key) {
      if(visiting.has(key)) { missing.push('Cyclic asset reference: '+key); return; }
      if(found.has(key)) return;
      const asset=get(key); if(!asset) { missing.push('Missing asset: '+key); return; }
      found.set(key,asset); visiting.add(key);
      for(const spec of references(asset)) {
        const value=readRef(asset.data,spec.field),keys=spec.many?value||[]:[value];
        if(!keys.length&&!spec.optional) missing.push(spec.label+' is required.');
        for(const k of keys) {
          if(!k&&spec.optional) continue;
          if(!k||get(k)?.kind!==spec.kind) missing.push((asset.plainName||asset.name||asset.kind)+': choose '+spec.label+'.');
          else visit(k);
        }
      }
      visiting.delete(key);
    }
    selected.filter(Boolean).forEach(visit);
    return {assets:[...found.values()],missing};
  }
  function issues(asset,assets,native=true) {
    const result=closure([keyOf(asset)],assets),missing=result.missing.slice(),get=k=>assets.find(a=>keyOf(a)===k);
    for(const a of result.assets) {
      let d=a.data;
      if(a.kind==='matrix') { try { d=materialize(a,assets).data; } catch(error) { missing.push(error.message); } }
      const n=a.kind==='matrix'?d.rows:d.ambientDimension;
      if(native&&n!=null&&(n<2||n>8)) missing.push((a.plainName||a.kind)+': this slicing calculator supports dimensions 2–8; the asset is unchanged.');
      if(a.kind==='matrix'&&native) {
        if(d.rows!==d.cols) missing.push('The slicing matrix source requires a square matrix.');
        if(!['real','rational','integer','complex'].includes(d.dataType)) missing.push('The slicing renderer requires real numeric matrix entries.');
        if(!d.construction) { try { rows(d.entries,d.rows,'Matrix'); } catch(e) { missing.push(e.message); } }
      }
      for(const spec of references(a)) for(const key of (spec.many?readRef(d,spec.field)||[]:[readRef(d,spec.field)])) {
        const parent=get(key); if(!parent) continue;
        if(parent.kind==='lie') {
          if(parent.data.rank!==n) missing.push('Lie rank must match the chosen coordinate realization dimension ('+n+').');
          if(!['A','B','C','D','E6','E7','E8','F4','G2'].includes(parent.data.family)||parent.data.family==='D'&&n<4) missing.push('This Lie type is unsupported by the slicing renderer.');
        } else if(a.kind!=='variety'&&parent.kind!=='field') { let p=parent;try {p=materialize(parent,assets);}catch(_){} if((p.data.ambientDimension??p.data.rows)!==n) missing.push('Referenced assets must have the same ambient dimension. Their coordinates were preserved.'); }
      }
      if(a.kind==='lattice'&&d.basisMode==='matrix-object'&&get(d.matrix)) {
        try { const p=materialize(get(d.matrix),assets); rows(p.data.entries,n,'Lattice basis',true); } catch(e) { missing.push(e.message); }
      }
      if(a.kind==='lattice'&&d.basisMode==='lmfdb-field'&&!d.lmfdbField) missing.push('Choose number-field data for this lattice.');
      if(a.kind==='variety'&&a.type==='toric'&&d.fan&&d.cone) missing.push('Choose a fan or an affine cone for this toric variety.');
    }
    return [...new Set(missing)];
  }
  function inputIssues(asset,assets) { return issues(asset,assets).filter(message=>!(asset.kind==='lattice'&&asset.data.basisMode==='lmfdb-field'&&message==='Choose number-field data for this lattice.')&&!(asset.kind==='fan'&&message==='Maximal cones is required.')); }
  function materialize(asset,assets) {
    if(asset.kind==='matrix'&&asset.data.construction) {
      const lie=assets.find(a=>keyOf(a)===asset.data.construction.lie&&a.kind==='lie');
      if(!lie) throw new Error('Choose a Lie type for this matrix.');
      const n=lie.data.rank;
      if(n<2||n>8) throw new Error('Lie basis matrices currently support rank 2–8.');
      const entries=math('lie-matrix',{lie:lie.data,basis:asset.data.construction.basis}).map(row=>row.map(String));
      return {...asset,data:{...asset.data,rows:n,cols:n,entries,dataType:'real'}};
    }
    if(asset.kind==='matrix'&&asset.data.field) {
      const field=assets.find(a=>keyOf(a)===asset.data.field&&a.kind==='field');
      if(!field)throw new Error('Choose an existing Field asset for this matrix.');
      return {...asset,data:{...asset.data,...field.data}};
    }
    if(asset.kind==='variety'&&asset.type==='toric') {
      const parent=assets.find(a=>keyOf(a)===(asset.data.fan||asset.data.cone));
      if(parent) return {...asset,data:{...asset.data,dimension:String(parent.data.ambientDimension)}};
    }
    return asset;
  }
  function context(computation,assets,definition) {
    const selected=[...Object.values(computation.refs).filter(v=>typeof v==='string'&&v),...(computation.refs.nodes||[])];
    const result=closure(selected,assets),missing=result.missing.slice(),objects={};
    for(const spec of definition.slots||[]) {
      const asset=assets.find(a=>keyOf(a)===computation.refs[spec.id]);
      if(!asset&&!spec.optional) missing.push('Choose '+spec.label+'.');
      else if(asset&&(!(spec.kinds||[spec.kind]).includes(asset.kind)||spec.subtype&&asset.type!==spec.subtype)) missing.push('Choose a compatible '+spec.label+'.');
    }
    for(const asset of result.assets) { objects[keyOf(asset)]=asset; missing.push(...issues(asset,assets)); }
    const frame=assets.find(a=>keyOf(a)===computation.refs.frame);
    if(definition.id==='lattice-character') {const lattice=assets.find(a=>keyOf(a)===computation.refs.lattice),point=assets.find(a=>keyOf(a)===computation.refs.point);if(lattice&&point&&lattice.data.ambientDimension!==point.data.ambientDimension)missing.push('The point and lattice must have the same ambient dimension.');}
    if(definition.slicingScene&&!(computation.refs.nodes||[]).length&&!(definition.geometryView&&assets.find(a=>keyOf(a)===computation.refs.asset)?.kind==='frame')) missing.push('Choose one or more objects to project or slice.');
    if(frame) for(const key of computation.refs.nodes||[]) {
      const asset=assets.find(a=>keyOf(a)===key); if(!asset) continue;
      try {const data=materialize(asset,assets).data,n=asset.kind==='variety'?Number(data.dimension):data.ambientDimension??data.rows;
      if(n!==frame.data.ambientDimension) missing.push('Frame and source objects must have the same ambient dimension.');}catch(error){missing.push(error.message);}
    }
    return {objects,missing:[...new Set(missing)],signature:JSON.stringify([computation.refs,result.assets.map(a=>[keyOf(a),a.type,a.name,a.data])])};
  }
  // Import into a temporary graph. Allocation and publication belong to the workspace store.
  function prepareImport(value, normalizeObject) {
    if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('Supply a slicing experiment or an asset JSON object.');
    const records=[],layers=[],ids=new Map(); let serial=0,frame='',nodes=[];
    const add=(kind,type,data,name,key)=>{ const item={kind,type,data:normalizeObject(kind,type,data),name:String(name||labels[kind]||kind),id:key||'import-'+(++serial)}; records.push(item); return keyOf(item); };
    const normal=a=>add(a.kind,a.type||a.kind,a.data,a.name,a.id);
    if(value.module!=='higher-dimensional-slice-explorer') {
      if(!isAsset(value)&&value.kind!=='matrix') throw new Error('This is not a supported slicing asset.');
      if(!value.data||typeof value.data!=='object') throw new Error('The imported asset has no mathematical data.');
      if(value.dependencies!=null&&!Array.isArray(value.dependencies)) throw new Error('Dependencies must be an array of assets.');
      for(const dependency of value.dependencies||[]) {
        if(!dependency.id||!dependency.data||!(isAsset(dependency)||['matrix','lie','field'].includes(dependency.kind))) throw new Error('Invalid slicing dependency.');
        normal(dependency);
      }
      const primary=normal({...value,id:'import-primary'});
      if(new Set(records.map(keyOf)).size!==records.length) throw new Error('Duplicate dependency IDs.');
      return {records,primary,frame,nodes,layers,legacy:false};
    }
    if(value.version!==1) throw new Error('Unsupported slicing experiment version.');
    const n=dimension(value.ambientDimension);
    if(!Array.isArray(value.objects)||!Array.isArray(value.frame)) throw new Error('A whole experiment must include all source objects and the complete frame.');
    const columns=rows(value.frame,n,'Complete frame',true),basis=columns[0].map((_,c)=>columns.map(row=>row[c]));
    const frameData=normalize('frame','frame',{ambientDimension:n,position:value.position,basis});
    frame=add('frame','frame',frameData,'F');
    const nativeKinds=Object.fromEntries(Object.entries(nativeTypes).map(([kind,type])=>[type,kind]));
    nativeKinds.simplex='polytope'; nativeKinds['cartesian-frame']='frame';
    for(const object of value.objects) {
      const type=object?.data?.objectType,kind=nativeKinds[type];
      if(!kind||!object.id||ids.has(object.id)) throw new Error('Unknown source type or duplicate source ID in the experiment.');
      ids.set(object.id,type==='cartesian-frame'&&object.data.basis==='moving'?frame:kind+':legacy-'+(++serial));
    }
    const lieFor=data=>{
      if(data.dynkinSourceId) { const key=ids.get(data.dynkinSourceId); if(!key||!key.startsWith('lie:')) throw new Error('Missing Lie source in the experiment.'); return key; }
      const raw=String(data.dynkinType||''),family=['E','F','G'].includes(raw)?raw+(data.dynkinRank??n):raw;
      if(!family) throw new Error('The source has no Lie type.');
      const d=normalizeObject('lie','simple',{family,rank:data.dynkinRank??n});
      const previous=records.find(a=>a.kind==='lie'&&JSON.stringify(a.data)===JSON.stringify(d));
      return previous?keyOf(previous):add('lie','simple',d,family+(family.length===1?d.rank:''));
    };
    for(const object of value.objects) {
      const d=clone(object.data),type=d.objectType,key=ids.get(object.id),kind=key.split(':')[0];
      if(d.ambientDimension!=null&&d.ambientDimension!==n) throw new Error('The experiment contains incompatible source dimensions.');
      let data={...d,ambientDimension:n},subtype=kind;
      if(kind==='polytope') subtype=type;
      if(kind==='lie') { const raw=String(d.dynkinType||''),family=['E','F','G'].includes(raw)?raw+(d.dynkinRank??n):raw; data={family,rank:d.dynkinRank??n};subtype='simple'; }
      if(kind==='frame') data=d.basis==='moving'?clone(frameData):{ambientDimension:n,position:Array(n).fill(0),basis:identity(n)};
      if(kind==='matrix') { data={rows:n,cols:n,entries:rows(d.matrixRows,n,'Matrix').map(row=>row.map(String)),dataType:'real'}; if(d.matrixPresetKind&&d.matrixPresetKind!=='manual') data.construction={lie:lieFor(d),basis:d.matrixPresetKind}; }
      if(['roots','weyl'].includes(kind)||kind==='lattice'&&d.basisMode==='dynkin') data.lie=lieFor(d);
      if(kind==='lattice'&&d.basisMode==='matrix-object') {data.matrix=ids.get(d.matrixSourceId);if(!data.matrix)throw new Error('Missing matrix source in the experiment.');}
      if(kind==='voronoi') {data.lattice=ids.get(d.latticeSourceId);if(!data.lattice)throw new Error('Missing lattice source in the experiment.');data.point=add('point','point',{ambientDimension:n,position:d.latticePoint||d.center||Array(n).fill(0)},object.name+'_center');}
      if(kind==='fan') {
        data.characterLattice=d.characterLatticeSourceId?ids.get(d.characterLatticeSourceId):'';
        if(d.characterLatticeSourceId&&!data.characterLattice) throw new Error('Missing character lattice in the experiment.');
        if(d.constructionMode==='cone-list') {
          data.cones=(d.coneSourceIds||[]).map(id=>{const key=ids.get(id);if(!key)throw new Error('Missing fan cone in the experiment.');return key;});
          for(const c of d.cones||[]) {
            if(c.sourceId) {const key=ids.get(c.sourceId);if(!key)throw new Error('Missing fan cone in the experiment.');if(!data.cones.includes(key))data.cones.push(key);}
            else data.cones.push(add('cone','cone',{ambientDimension:n,generators:c.generators},c.label||'cone'));
          }
        }
      }
      if(key!==frame) add(kind,subtype,data,object.name,key.slice(key.indexOf(':')+1));
      if(kind!=='lie'&&!nodes.includes(key)) nodes.push(key);
      const viewData={};for(const field of ['showDistricts','tropicalDistrictLabelDensity','tropicalNotationMode','showChambers','weylLabelMode','weylElementDisplayMode','weylLabelDensity','showLatticePoints','latticeBoundShape','latticeBoundRadius']) if(Object.hasOwn(d,field)) viewData[field]=d[field];
      layers.push([key,{style:clone(object.style||{}),labels:!!object.labels,visibleProjection:object.visibleProjection!==false,visibleSlice:!!object.visibleSlice,data:viewData}]);
    }
    return {records,frame,nodes,layers,viewport:clone(value.viewport||{}),legacy:true};
  }
  const slot=(id,label,kind,extra={})=>({id,label,kind,...extra});
  const definitions=[
    ...kinds.map(kind=>({id:kind+'-input',label:labels[kind]+' Input',input:kind,engine:'slice',slicing:true})),
    {id:'toric-variety-input',label:'Toric Variety Input',input:'variety',subtype:'toric',engine:'slice',slicing:true},
    {id:'slicing-scene',label:'Projection / 2D Slice',engine:'slice',slicing:true,slicingScene:true,canvas:true,light:true,slots:[slot('frame','Frame','frame')],fromKinds:[...kinds,'matrix','variety']},
    {id:'frame-details',label:'Frame / Slice Details',engine:'slice',slicing:true,light:true,marker:'frame-matrix',slots:[slot('frame','Frame','frame')]},
    {id:'cone-faces',label:'Cone Faces / Orbits',engine:'slice',slicing:true,light:true,marker:'toric-cone-face-list',slots:[slot('cone','Rational cone','cone')]},
    {id:'cone-variety',label:'Affine Toric Variety',engine:'slice',slicing:true,light:true,marker:'toric-cone-variety-info',slots:[slot('cone','Rational cone','cone')]},
    {id:'fan-orbits',label:'Fan / Orbits',engine:'slice',slicing:true,light:true,marker:'toric-fan-info',slots:[slot('fan','Fan','fan')]},
    {id:'fan-divisors',label:'Toric Divisors / Bundles',engine:'slice',slicing:true,light:true,marker:'toric-fan-divisor-info',slots:[slot('variety','Toric variety','variety',{subtype:'toric'})]},
    {id:'lattice-character',label:'Lattice / Equivariant Bundles',engine:'slice',slicing:true,light:true,marker:'slice-weight-info-out',slots:[slot('lattice','Lattice','lattice'),slot('point','Point / weight','point'),slot('variety','Toric variety','variety',{subtype:'toric',optional:true})]},
    {id:'slicing-display',label:'Slice Viewport / Layers',engine:'slice',slicing:true,display:true,viewTypes:['slicing-scene','geometry-view'],marker:'screen-zoom',slots:[],light:true},
    {id:'slicing-debug',label:'Slice Diagnostics',engine:'slice',slicing:true,display:true,viewTypes:['slicing-scene','geometry-view'],marker:'debug-warnings',slots:[],light:true}
  ];
  const api={kinds,labels,subtypes,nativeTypes,normalize,resize,number,dimension,identity,vector,rows,independent,isAsset,inputType,renderable,references,readRef,refKeys,closure,issues,inputIssues,materialize,context,prepareImport,definitions,math,setKernel,clone,keyOf};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.MathWorkspaceSlicing=api;
}(typeof window!=='undefined'?window:globalThis));
