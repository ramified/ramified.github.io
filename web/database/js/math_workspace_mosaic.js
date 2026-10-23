(function(root){
  'use strict';
  const kinds=['mosaic-space','mosaic-diagram'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const spaceFields=['rows','cols','lattice','boundary','removedTiles','cutEdges','gluedEdges','backgroundMetric'];
  const diagramFields=['diagramType','tiles','halfEdgeDecorations','inputHoles','pieces','pieceSets','sokoban','lianliankan','hex','billiards'];
  // One ownership table drives both the workspace catalog and native surfaces.
  const propertyPanels=[
    {id:'mosaic-statistics',label:'Background Statistics',marker:'statistics-card',owner:'mosaic-space'},
    {id:'mosaic-diagram-statistics',label:'Diagram Statistics',marker:'statistics-card',owner:'mosaic-diagram'},
    {id:'mosaic-homology',label:'Cellular Homology',marker:'homology-card',owner:'mosaic-space',canvas:true},
    {id:'mosaic-poincare',label:'Poincaré Disk',marker:'poincare-card',owner:'mosaic-space'},
    {id:'mosaic-metric',label:'Hyperbolic Metric (experimental)',marker:'hyperbolic-metric-debug-card',owner:'mosaic-space',canvas:true},
    {id:'mosaic-local-geometry',label:'Local Geometry (experimental)',marker:'homology-local-chart-card',owner:'mosaic-space',canvas:true},
    {id:'mosaic-homology-cords',label:'Homology Cords (experimental)',marker:'homology-cord-debug-card',owner:'mosaic-space',canvas:true},
    {id:'mosaic-wander',label:'Universal Cover (experimental)',marker:'wander-card',owner:'mosaic-space',canvas:true},
    {id:'mosaic-knot',label:'Knot / Link',marker:'knot-card',owner:'mosaic-diagram'},
    {id:'mosaic-dual',label:'Dual Graph',marker:'dual-graph-card',owner:'mosaic-diagram'},
    {id:'mosaic-seifert',label:'Seifert Surface',marker:'seifert-surface-card',owner:'mosaic-diagram',canvas:true}
  ];
  const editTools={
    'mosaic-space':{modes:['background'],actions:['tile','boundary','glue-boundary','reverse-glue']},
    'mosaic-diagram':{modes:['draw','tiling','decoration','background','pick'],actions:['decoration']}
  };
  function propertyAsset(id,asset,assets){
    return propertyPanels.find(panel=>panel.id===id)?.owner==='mosaic-space'&&asset?.kind==='mosaic-diagram'
      ?assets.find(item=>item.kind==='mosaic-space'&&item.kind+':'+item.id===asset.data.space):asset;
  }
  const pick=(source,keys)=>Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,clone(source[key])]));
  function normalize(kind,source={}){
    if(kind==='mosaic-space'){
      const data={rows:5,cols:5,lattice:'hexagonal',boundary:'glued',removedTiles:[],cutEdges:[],gluedEdges:[],backgroundMetric:'flat',...pick(source,spaceFields)};
      if(![data.rows,data.cols].every(n=>Number.isInteger(n)&&n>=2&&n<=20))throw new Error('Mosaic dimensions must be integers from 2 to 20.');
      if(!['square','hexagonal'].includes(data.lattice)||!['grid','wrapped','glued'].includes(data.boundary))throw new Error('Unsupported Mosaic grid or boundary.');
      for(const key of ['removedTiles','cutEdges','gluedEdges'])if(!Array.isArray(data[key]))throw new Error('Invalid Mosaic '+key+'.');
      return data;
    }
    const data={space:String(source.space||''),diagramType:'link',tiles:[],halfEdgeDecorations:{},inputHoles:[],pieces:[],sokoban:{},lianliankan:{},hex:{},billiards:{},...pick(source,diagramFields)};
    if(!['link','dual'].includes(data.diagramType)||!Array.isArray(data.tiles))throw new Error('Invalid Mosaic diagram.');
    data.tiles=data.tiles.map(tile=>tile&&tile.tile==null?{...tile,tile:[]}:tile);
    for(const tile of data.tiles)if(!tile||!Number.isInteger(tile.row)||!Number.isInteger(tile.col)||tile.row<1||tile.col<1||!(Array.isArray(tile.tile)||tile.tile?.type==='vertex'&&Array.isArray(tile.tile.edges)))throw new Error('Mosaic tiles need row, column and tile data.');
    if(source.grid)data.grid=pick(source.grid,['rows','cols','lattice']);
    return data;
  }
  function issues(asset,assets){
    if(asset.kind!=='mosaic-diagram')return [];
    const space=assets.find(a=>a.kind==='mosaic-space'&&a.kind+':'+a.id===asset.data.space);
    if(!space)return ['Choose an existing Mosaic space.'];
    const d=asset.data,s=space.data;
    const hasContent=value=>Array.isArray(value)?value.length>0:value&&typeof value==='object'?Object.values(value).some(hasContent):value!=null&&value!==false&&value!=='';
    if(diagramFields.filter(key=>key!=='diagramType').some(key=>hasContent(d[key]))&&d.grid&&['rows','cols','lattice'].some(key=>d.grid[key]!==s[key]))return ['The space grid changed. Diagram data is preserved; restore the grid or choose a compatible space.'];
    const outside=value=>{
      if(!value||typeof value!=='object')return false;
      if(Number.isInteger(value.row)&&Number.isInteger(value.col)&&(value.row<1||value.col<1||value.row>s.rows||value.col>s.cols||s.removedTiles.some(r=>r.row===value.row&&r.col===value.col)))return true;
      return Object.values(value).some(outside);
    };
    if(diagramFields.some(key=>outside(d[key])))return ['A diagram tile or decoration lies outside the available space. Diagram data is preserved; restore the affected tiles or choose another space.'];
    return [];
  }
  function fromPayload(kind,payload,space){
    if(kind==='mosaic-space')return normalize(kind,payload);
    const data=normalize(kind,{...payload,space,grid:payload});
    data.tiles=data.tiles.filter(t=>t.tile.length||t.tile.type==='vertex'||t.decoration).map(t=>({row:t.row,col:t.col,tile:t.tile,...(t.decoration?{decoration:t.decoration}:{})}));
    return data;
  }
  function payload(asset,assets){
    const error=issues(asset,assets);if(error.length)throw new Error(error.join(' '));
    const space=asset.kind==='mosaic-space'?asset:assets.find(a=>a.kind+':'+a.id===asset.data.space);
    return {...normalize('mosaic-diagram'),...space.data,...(asset.kind==='mosaic-diagram'?pick(asset.data,diagramFields):{})};
  }
  const api={kinds,propertyPanels,editTools,propertyAsset,normalize,issues,fromPayload,payload};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceMosaic=api;
})(typeof window!=='undefined'?window:globalThis);
