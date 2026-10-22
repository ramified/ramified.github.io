(function(root){
  'use strict';
  const kinds=['mosaic-space','mosaic-diagram'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const spaceFields=['rows','cols','lattice','boundary','removedTiles','cutEdges','gluedEdges','backgroundMetric'];
  const diagramFields=['diagramType','tiles','halfEdgeDecorations','inputHoles','pieces','pieceSets','sokoban','lianliankan','hex','billiards'];
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
    if(d.tiles.length&&d.grid&&['rows','cols','lattice'].some(key=>d.grid[key]!==s[key]))return ['The space grid changed. Diagram data is preserved; restore the grid or choose a compatible space.'];
    if(d.tiles.some(t=>t.row>s.rows||t.col>s.cols||s.removedTiles.some(r=>r.row===t.row&&r.col===t.col)))return ['A diagram tile lies outside the available space. Diagram data is preserved; restore the affected tiles or choose another space.'];
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
  const api={kinds,normalize,issues,fromPayload,payload};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceMosaic=api;
})(typeof window!=='undefined'?window:globalThis);
