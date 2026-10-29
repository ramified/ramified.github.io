(function(root){
  'use strict';
  const mosaic=root.MathWorkspaceMosaic||(typeof require==='function'?require('./math_workspace_mosaic.js'):null);
  if(typeof require==='function'&&!root.MosaicKnotEngine)require('./math_workspace/sources/js/mosaic_knot_engine.js');
  const kinds=['knot','dual-graph'],labels={knot:'Knot / Link','dual-graph':'Dual Graph'};
  const clone=value=>JSON.parse(JSON.stringify(value)),keyOf=a=>a?a.kind+':'+a.id:'';
  const fail=message=>{throw new Error(message);};
  const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
  function planar(pd){
    if(!Array.isArray(pd)||pd.some(row=>!Array.isArray(row)||row.length!==4||row.some(n=>!integer(n,1))))fail('PD needs four positive integer arc labels at each crossing.');
    const ports=new Map(),alpha=[],sigma=d=>4*Math.floor(d/4)+(d+1)%4;
    pd.flat().forEach((label,d)=>{if(!ports.has(label))ports.set(label,[]);ports.get(label).push(d);});
    for(const pair of ports.values()){if(pair.length!==2)fail('Each PD arc label must occur exactly twice.');alpha[pair[0]]=pair[1];alpha[pair[1]]=pair[0];}
    const seen=new Set(),faces=[];
    for(let d=0;d<4*pd.length;d++)if(!seen.has(d)){
      const face=[];let p=d;do{seen.add(p);face.push(p);p=sigma(alpha[p]);}while(p!==d);faces.push(face);
    }
    const crossingGroups=[],groupOf=[],visited=new Set();
    for(let i=0;i<pd.length;i++)if(!visited.has(i)){
      const group=[],pending=[i];visited.add(i);
      while(pending.length){const c=pending.pop();group.push(c);groupOf[c]=crossingGroups.length;for(let p=4*c;p<4*c+4;p++){const next=Math.floor(alpha[p]/4);if(!visited.has(next)){visited.add(next);pending.push(next);}}}
      crossingGroups.push(group);
    }
    if(pd.length-ports.size+faces.length!==2*crossingGroups.length)fail('This PD rotation system is not a planar diagram. Surface knots are not supported.');
    const used=new Set(),components=[];
    for(let d=0;d<4*pd.length;d++)if(!used.has(d)){
      const occurrences=[];let p=d;
      do{const opposite=4*Math.floor(p/4)+(p+2)%4;used.add(p);used.add(opposite);occurrences.push({crossing:Math.floor(p/4),over:p%2===1,from:p,to:opposite,component:components.length});p=alpha[opposite];}while(p!==d);
      components.push({index:components.length,occurrences});
    }
    return {pd,ports,alpha,faces,crossingGroups,groupOf,components};
  }
  function graph(source){
    const genera=clone(source.genera??[0]),legs=clone(source.legs??[[]]),edges=clone(source.edges??[]),decorations=clone(source.decorations??{});
    if(!Array.isArray(genera)||!genera.length||genera.some(n=>!integer(n))||!Array.isArray(legs)||legs.length!==genera.length||legs.some(row=>!Array.isArray(row)||row.some(n=>!Number.isSafeInteger(n))))fail('Supply nonnegative integer genera and one integer half-edge list per vertex.');
    const halfEdges=legs.flat(),known=new Set(halfEdges),paired=new Set();
    if(known.size!==halfEdges.length)fail('Half-edge labels must be unique integers.');
    if(!Array.isArray(edges))fail('Supply a list of half-edge pairs.');
    for(const pair of edges){if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||pair.some(n=>!known.has(n)||paired.has(n)))fail('Each edge must pair two distinct, unpaired half-edges from the vertex lists.');pair.forEach(n=>paired.add(n));}
    if(!decorations||typeof decorations!=='object'||Array.isArray(decorations)||Object.entries(decorations).some(([k,v])=>!known.has(Number(k))||String(Number(k))!==k||typeof v!=='string'))fail('Decorations must map existing half-edge labels to text.');
    return {genera,legs,edges,decorations};
  }
  function normalize(kind,source={}){
    const ref=String(source.source||'');
    if(ref&&!/^mosaic-diagram:[A-Za-z0-9_-]+$/.test(ref))fail('Choose a Mosaic Diagram source.');
    const hasSnapshot=ref?source.hasSnapshot===true:true;
    if(kind==='knot'){
      const pd=clone(source.pd??[]),circles=source.circles??(ref?0:1);planar(pd);
      if(!integer(circles)||(!ref&&!pd.length&&!circles))fail('Specify at least one closed component, including any crossing-free circles.');
      return {source:ref,pd,circles,...(ref?{hasSnapshot}: {})};
    }
    if(kind!=='dual-graph')fail('Unsupported topology asset.');
    return {source:ref,...graph(source),...(ref?{hasSnapshot}: {})};
  }
  function definition(kind,data){
    return kind==='knot'?{pd:clone(data.pd),circles:data.circles}:graph(data);
  }
  function dense(payload){
    const tiles=Array.from({length:payload.rows*payload.cols},()=>[]);
    for(const entry of payload.tiles||[])tiles[(entry.row-1)*payload.cols+entry.col-1]=clone(entry.tile||[]);
    return tiles;
  }
  function connections(payload){
    const {rows,cols,lattice,boundary}=payload,sides=lattice==='square'?4:6;
    const at=e=>integer(e?.index)?e.index:(e.row-1)*cols+e.col-1;
    const removed=new Set((payload.removedTiles||[]).map(e=>typeof e==='number'?e:at(e)));
    const cuts=new Set((payload.cutEdges||[]).map(e=>{const a=at(e.left),b=at(e.right);return [a,b].sort((x,y)=>x-y).join(':');}));
    const glued=new Map();
    for(const pair of payload.gluedEdges||[]){const a={index:at(pair.first),dir:pair.first.dir},b={index:at(pair.second),dir:pair.second.dir};glued.set(a.index+':'+a.dir,b);glued.set(b.index+':'+b.dir,a);}
    const mod=(n,k)=>(n%k+k)%k;
    function next(index,dir){
      if(removed.has(index))return null;
      const r=Math.floor(index/cols),c=index%cols;
      let row,col;
      if(sides===4){const delta=[[0,1],[1,0],[0,-1],[-1,0]][dir];row=r+delta[0];col=c+delta[1];if(boundary==='wrapped'){row=mod(row,rows);col=mod(col,cols);}}
      else{const delta=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]][dir];let q=c-Math.floor(r/2)+delta[0];row=r+delta[1];if(boundary==='wrapped'){q=mod(q,cols);row=mod(row,rows);}col=q+Math.floor(row/2);if(boundary==='wrapped')col=mod(col,cols);}
      if(row>=0&&row<rows&&col>=0&&col<cols){const to=row*cols+col;if(!removed.has(to)&&!cuts.has([index,to].sort((a,b)=>a-b).join(':')))return {index:to,dir:(dir+sides/2)%sides};}
      const partner=glued.get(index+':'+dir);return partner&&!removed.has(partner.index)?partner:null;
    }
    return {next,removed,sides};
  }
  function validateTiles(tiles,sides){
    for(const tile of tiles){const dirs=[];
      if(tile?.type==='vertex'){if(!Array.isArray(tile.edges))fail('Graph vertices need a spoke list.');dirs.push(...tile.edges);}
      else{if(!Array.isArray(tile)||tile.some(p=>!Array.isArray(p)||p.length!==2))fail('Mosaic arcs must pair two distinct directions.');for(const pair of tile){if(pair[0]===pair[1])fail('Mosaic arcs must pair two distinct directions.');dirs.push(...pair);}}
      if(dirs.some(d=>!integer(d)||d>=sides)||new Set(dirs).size!==dirs.length)fail('Mosaic directions must be valid and each port can be used only once.');
    }
  }
  function extractGraph(payload){
    const tiles=dense(payload),{next,removed,sides}=connections(payload),vertices=[],vertexId=new Map(),weights=new Map();
    validateTiles(tiles,sides);
    (payload.tiles||[]).forEach(e=>weights.set((e.row-1)*payload.cols+e.col-1,e.decoration??0));
    tiles.forEach((tile,index)=>{if(tile?.type==='vertex'&&!removed.has(index)){vertexId.set(index,vertices.length);vertices.push(index);}});
    if(!vertices.length)fail('The Mosaic Diagram needs at least one graph vertex.');
    const result={genera:vertices.map(i=>weights.get(i)||0),legs:vertices.map(()=>[]),edges:[],decorations:{}},marked=new Set(),topologyEdges=[],topologyLegs=[];
    const spokes=i=>tiles[i]?.type==='vertex'?tiles[i].edges:[];
    const traversed=new Set();
    for(const vertex of vertices)for(const dir of spokes(vertex)){
      if(!integer(dir)||dir>=sides)fail('Invalid graph vertex spoke.');
      const start=vertex+':'+dir;if(marked.has(start))continue;marked.add(start);
      let current={index:vertex,dir},end=null;const seen=new Set();
      while(true){const id=current.index+':'+current.dir;if(seen.has(id))fail('A graph path does not terminate at a vertex or an external leg.');seen.add(id);const to=next(current.index,current.dir);if(!to)break;
        if(tiles[to.index]?.type==='vertex'){if(spokes(to.index).includes(to.dir)){end=to;marked.add(to.index+':'+to.dir);}break;}
        const tile=tiles[to.index];if(!Array.isArray(tile))fail('Invalid graph tile.');
        const pair=tile.find(p=>Array.isArray(p)&&p.includes(to.dir));if(!pair)break;
        traversed.add(to.index+':'+tile.indexOf(pair));current={index:to.index,dir:pair[0]===to.dir?pair[1]:pair[0]};
      }
      if(end)topologyEdges.push([vertex,dir,end.index,end.dir]);else topologyLegs.push([vertex,dir]);
    }
    // Match the native converter's numbering: internal edges first, then legs.
    let label=0;const add=(index,dir)=>{const id=++label;result.legs[vertexId.get(index)].push(id);const text=payload.halfEdgeDecorations?.[index+':'+dir];if(text!=null&&String(text).trim())result.decorations[id]=String(text).trim();return id;};
    topologyEdges.forEach(([a,d,b,e])=>result.edges.push([add(a,d),add(b,e)]));topologyLegs.forEach(([a,d])=>add(a,d));
    if(tiles.some((tile,i)=>Array.isArray(tile)&&!removed.has(i)&&tile.some((_,j)=>!traversed.has(i+':'+j))))fail('The diagram contains strands disconnected from every graph vertex.');
    return graph(result);
  }
  const cache=new Map();
  function fromMosaic(kind,diagram,assets){
    if(diagram?.kind!=='mosaic-diagram')fail('Choose an existing Mosaic Diagram.');
    const payload=mosaic.payload(diagram,assets),signature=kind+JSON.stringify(payload);
    if(cache.has(signature))return clone(cache.get(signature));
    let result;
    if(kind==='knot'){
      if(payload.diagramType!=='link')fail('Choose a link-type Mosaic Diagram for Knot / Link.');
      if(payload.boundary==='wrapped'||payload.gluedEdges.length)fail('Only planar knot diagrams are supported; periodic or glued-boundary knots cannot be generated.');
      const tiles=dense(payload),{next,removed,sides}=connections(payload);validateTiles(tiles,sides);
      if(tiles.some(tile=>tile?.type==='vertex'))fail('Knot diagrams cannot contain graph vertices.');
      for(let i=0;i<tiles.length;i++)for(const pair of tiles[i])for(const dir of pair){const to=next(i,dir);if(removed.has(i)||!to||!tiles[to.index]?.some(p=>Array.isArray(p)&&p.includes(to.dir)))fail('The knot diagram must be closed with matching endpoints.');}
      const encoded=root.MosaicKnotEngine.buildDiagram({...payload,wrapped:false,tiles});
      if(!encoded.ok)fail(encoded.error||'Unable to encode this planar knot.');
      if(!encoded.componentCount)fail('The Mosaic Diagram has no closed knot or link.');
      result={pd:encoded.pdEntries,circles:encoded.components.filter(c=>!c.occurrences.length).length};
    }else{
      if(payload.diagramType!=='dual')fail('Choose a dual-type Mosaic Diagram for Dual Graph.');
      result=extractGraph(payload);
    }
    result=normalize(kind,result);if(cache.size>64)cache.clear();cache.set(signature,result);return clone(result);
  }
  function resolve(asset,assets){
    const data=normalize(asset.kind,asset.data);
    if(!data.source)return data;
    return {...fromMosaic(asset.kind,assets.find(a=>keyOf(a)===data.source),assets),source:data.source,hasSnapshot:true};
  }
  function issues(asset,assets){try{resolve(asset,assets);return [];}catch(error){return [error.message];}}
  function detach(asset,assets){
    let data;try{data=resolve(asset,assets);}catch(error){if(!asset.data.hasSnapshot)throw error;data=asset.data;}
    return normalize(asset.kind,definition(asset.kind,data));
  }
  function synchronize(assets){
    const changed=[];
    for(const asset of assets)if(kinds.includes(asset.kind)&&asset.data.source){try{const data=resolve(asset,assets);if(JSON.stringify(data)!==JSON.stringify(asset.data)){asset.data=data;changed.push(asset);}}catch(_){} }
    return changed;
  }
  function knotInfo(data){
    const topology=planar(data.pd),components=topology.components;
    return {...topology,componentCount:components.length+data.circles,crossingCount:data.pd.length};
  }
  function graphInfo(data){
    const d=graph(data),owner=new Map(),parent=d.genera.map((_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
    d.legs.forEach((list,i)=>list.forEach(n=>owner.set(n,i)));d.edges.forEach(([a,b])=>{parent[find(owner.get(a))]=find(owner.get(b));});
    const components=new Set(parent.map((_,i)=>find(i))).size,betti=d.edges.length-d.genera.length+components;
    return {vertices:d.genera.length,edges:d.edges.length,markings:d.legs.flat().length-2*d.edges.length,components,betti,genus:d.genera.reduce((a,b)=>a+b,0)+betti,dimension:d.genera.reduce((total,g,i)=>total+3*g-3+d.legs[i].length,0),stable:d.genera.every((g,i)=>2*g-2+d.legs[i].length>0)};
  }
  const presets={knot:[{label:'Unknot',data:{pd:[],circles:1}},{label:'Trefoil',data:{pd:[[1,4,2,5],[3,6,4,1],[5,2,6,3]],circles:0}},{label:'Two-component unlink',data:{pd:[],circles:2}}],
    'dual-graph':[{id:'moduli',label:'M_g,n stable graph',generator:'moduli'},{id:'random-stable-curve',label:'Random stable curve',generator:'random-stable-curve'}]};
  const importedPresets=root.MathWorkspaceTopologyPresetData||(typeof require==='function'?require('./math_workspace_topology_preset_data.js'):[]);
  for(const preset of importedPresets){if(preset.id==='trefoil')presets.knot[1]=preset;else presets.knot.push(preset);}
  function moduliPreset(genus,markings){
    if(!integer(genus)||genus>12||!integer(markings)||markings>6)fail('Choose integer g from 0 to 12 and n from 0 to 6.');
    if(2*genus-2+markings<=0)fail('A stable M_g,n graph requires 2g - 2 + n > 0.');
    const halfEdges=Array.from({length:markings},(_,i)=>i+1);
    return normalize('dual-graph',{genera:[genus],legs:[halfEdges],edges:[],decorations:{}});
  }
  function migrateWorkspace(value){
    const mapping={'mosaic-knot':['knot','knot-info'],'mosaic-dual':['dual-graph','dual-graph-view']};
    for(const panel of value.panels||[]){const entry=mapping[panel.type];if(!entry)continue;
      const [kind,type]=entry,source=panel.computation?.refs?.asset;
      const diagram=value.assets.find(a=>keyOf(a)===source&&a.kind==='mosaic-diagram');
      let asset=value.assets.find(a=>a.kind===kind&&a.data.source===source);
      if(diagram&&!asset){let serial=1;while(value.assets.some(a=>a.id==='topology'+serial))serial++;let name=(kind==='knot'?'K':'G')+'_{'+serial+'}';while(value.assets.some(a=>a.name===name))name+='^{\\prime}';
        asset={kind,type:kind,id:'topology'+serial,name,data:normalize(kind,{source}),dependencies:[{kind:'mosaic-diagram',id:diagram.id}],properties:{}};
        try{asset.data=resolve(asset,value.assets);}catch(_){}value.assets.push(asset);
      }
      panel.type=type;panel.assetKey=asset?keyOf(asset):'';if(panel.computation){panel.computation.refs={asset:asset?keyOf(asset):''};panel.computation.status='current';}if(kind==='knot')panel.renderers=[];
    }
    return value;
  }
  const api={kinds,labels,normalize,definition,planar,knotInfo,graphInfo,fromMosaic,resolve,issues,detach,synchronize,presets,moduliPreset,migrateWorkspace};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceTopology=api;
})(typeof window!=='undefined'?window:globalThis);
