(function(root){
  'use strict';
  const topology=root.MathWorkspaceTopology||(typeof require==='function'?require('./math_workspace_topology.js'):null),mosaic=root.MathWorkspaceMosaic||(typeof require==='function'?require('./math_workspace_mosaic.js'):null);
  const clone=value=>JSON.parse(JSON.stringify(value)),key=a=>a.kind+':'+a.id;
  function flip(data,index){
    const d=topology.normalize('knot',topology.definition('knot',data));
    if(!Number.isInteger(index)||index<0||index>=d.pd.length)throw new Error('Unknown crossing.');
    const row=d.pd[index];d.pd[index]=[row[1],row[2],row[3],row[0]];return topology.normalize('knot',d);
  }
  // Remove only empty monogons or cancellable empty bigons in the PD rotation
  // system. Splice through deleted crossings along opposite ports, not faces.
  function removeCrossings(data,removed){
    const info=topology.knotInfo(data),pd=[],labels=new Map();let next=0;
    for(let c=0;c<data.pd.length;c++)if(!removed.has(c)){
      const row=[];
      for(let i=0;i<4;i++){
        const p=4*c+i;let q=info.alpha[p],guard=0;
        while(removed.has(Math.floor(q/4))){q=info.alpha[4*Math.floor(q/4)+(q+2)%4];if(++guard>4*data.pd.length)throw new Error('Unable to splice diagram.');}
        const id=Math.min(p,q)+':'+Math.max(p,q);if(!labels.has(id))labels.set(id,++next);row.push(labels.get(id));
      }pd.push(row);
    }
    const crossingComponents=topology.planar(pd).components.length,circles=info.componentCount-crossingComponents;
    return topology.normalize('knot',{pd,circles});
  }
  function simplify(data){
    let d=topology.normalize('knot',topology.definition('knot',data));const moves=[];
    for(let guard=0;guard<data.pd.length;guard++){
      const info=topology.knotInfo(d),one=info.faces.find(face=>face.length===1);let removed;
      if(one){removed=new Set([Math.floor(one[0]/4)]);moves.push('R1');}
      else{
        const two=info.faces.find(face=>face.length===2&&Math.floor(face[0]/4)!==Math.floor(face[1]/4)&&face[0]%2===info.alpha[face[0]]%2);
        if(!two)break;removed=new Set(two.map(p=>Math.floor(p/4)));moves.push('R2');
      }
      d=removeCrossings(d,removed);
    }
    return {data:d,moves,removed:data.pd.length-d.pd.length};
  }
  const pairKey=pair=>pair.slice().sort((a,b)=>a-b).join('.');
  const crossingKey=c=>c.tileIndex+':'+[pairKey(c.underDirs),pairKey(c.overDirs)].sort().join('/');
  function traceSignature(encoded,flippedKeys=new Set()){
    const minimumCycle=tokens=>{
      if(!tokens.length)return '';
      const rotation=sequence=>{
        const n=sequence.length;let i=0,j=1,k=0;
        while(i<n&&j<n&&k<n){const a=sequence[(i+k)%n],b=sequence[(j+k)%n];if(a===b){k++;continue;}if(a>b){i+=k+1;if(i===j)i++;}else{j+=k+1;if(i===j)j++;}k=0;}
        const start=Math.min(i,j);return [...sequence.slice(start),...sequence.slice(0,start)].join('|');
      };
      return [rotation(tokens),rotation(tokens.slice().reverse())].sort()[0];
    };
    return encoded.components.map(component=>minimumCycle(component.occurrences.map(o=>{
      const c=encoded.graph.crossings[o.crossing],id=crossingKey(c);return id+':'+Number(flippedKeys.has(id)?!o.over:o.over);
    }))).sort().join(' // ');
  }
  function prepareMosaicFlips(asset,assets,indices){
    try{
      if(!asset.data.source)return {ok:false,reason:'This object is not following a Mosaic source.'};
      topology.resolve(asset,assets);
      const diagram=assets.find(a=>key(a)===asset.data.source);if(!diagram)return {ok:false,reason:'The Mosaic source no longer exists.'};
      const payload=mosaic.payload(diagram,assets),dense=Array.from({length:payload.rows*payload.cols},()=>[]);
      for(const t of payload.tiles)dense[(t.row-1)*payload.cols+t.col-1]=clone(t.tile);
      const encoded=root.MosaicKnotEngine.buildDiagram({...payload,wrapped:false,tiles:dense});
      if(!encoded.ok)return {ok:false,reason:encoded.error};
      if(JSON.stringify(encoded.pdEntries)!==JSON.stringify(asset.data.pd))return {ok:false,reason:'The current Knot no longer maps exactly to crossings in its source.'};
      const flippedKeys=new Set(),changedTiles=new Map();
      for(const index of indices){const target=encoded.graph.crossings[index];if(!Number.isInteger(index)||!target)return {ok:false,reason:'The corresponding source crossing could not be found.'};const id=crossingKey(target);if(flippedKeys.has(id))flippedKeys.delete(id);else flippedKeys.add(id);}
      const permutations=arcs=>arcs.length?arcs.flatMap((arc,i)=>permutations(arcs.filter((_,j)=>i!==j)).map(rest=>[arc,...rest])):[[]];
      for(const tileIndex of new Set(encoded.graph.crossings.filter(c=>flippedKeys.has(crossingKey(c))).map(c=>c.tileIndex))){
        const crossings=encoded.graph.crossings.filter(c=>c.tileIndex===tileIndex);
        const changed=permutations(clone(dense[tileIndex])).find(arcs=>crossings.every(c=>{
          const over=flippedKeys.has(crossingKey(c))?c.underDirs:c.overDirs,under=flippedKeys.has(crossingKey(c))?c.overDirs:c.underDirs;
          return arcs.findIndex(arc=>pairKey(arc)===pairKey(over))>arcs.findIndex(arc=>pairKey(arc)===pairKey(under));
        }));
        if(!changed)return {ok:false,reason:'This tile contains multiple related crossings. Its layer order cannot represent these edits without changing other crossings.'};
        changedTiles.set(tileIndex,changed);
      }
      const candidateTiles=dense.map((tile,i)=>changedTiles.get(i)||tile);
      const candidate=root.MosaicKnotEngine.buildDiagram({...payload,wrapped:false,tiles:candidateTiles});
      const oldByKey=new Map(encoded.graph.crossings.map(c=>[crossingKey(c),c])),newByKey=new Map((candidate.graph?.crossings||[]).map(c=>[crossingKey(c),c]));
      const exact=candidate.ok&&oldByKey.size===newByKey.size&&candidate.componentCount===encoded.componentCount&&[...oldByKey].every(([k,c])=>{
        const other=newByKey.get(k);return other&&pairKey(other.overDirs)===pairKey(flippedKeys.has(k)?c.underDirs:c.overDirs);
      })&&traceSignature(candidate)===traceSignature(encoded,flippedKeys);
      if(!exact)return {ok:false,reason:'The changed Mosaic would alter other crossings or their traversal order.'};
      const data=mosaic.normalize('mosaic-diagram',{...diagram.data,tiles:diagram.data.tiles.map(t=>{const changed=changedTiles.get((t.row-1)*payload.cols+t.col-1);return changed?{...t,tile:changed}:t;})});
      return {ok:true,ref:{kind:diagram.kind,id:diagram.id},before:clone(diagram.data),data};
    }catch(error){return {ok:false,reason:error.message};}
  }
  const prepareMosaicFlip=(asset,assets,index)=>prepareMosaicFlips(asset,assets,[index]);
  const api={flip,simplify,prepareMosaicFlip,prepareMosaicFlips};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceKnotOperations=api;
})(typeof window!=='undefined'?window:globalThis);
