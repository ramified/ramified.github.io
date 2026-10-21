(function(root){
  'use strict';
  function makeMatrix(n, callback) { return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>callback(i,j))); }
  function cartanMatrix(type, rank) {
    if ((type === 'B' || type === 'C') && rank === 1) return [[2]];
    if (type === 'D' && rank === 2) return [[2,0],[0,2]];
    if (type === 'A') return makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
    if (type === 'B') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
      C[rank - 2][rank - 1] = -2;
      C[rank - 1][rank - 2] = -1;
      return C;
    }
    if (type === 'C') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : Math.abs(i - j) === 1 ? -1 : 0);
      C[rank - 2][rank - 1] = -1;
      C[rank - 1][rank - 2] = -2;
      return C;
    }
    if (type === 'D') {
      const C = makeMatrix(rank, (i, j) => i === j ? 2 : 0);
      for (let i = 0; i < rank - 2; i++) {
        C[i][i + 1] = -1;
        C[i + 1][i] = -1;
      }
      C[rank - 3][rank - 1] = -1;
      C[rank - 1][rank - 3] = -1;
      return C;
    }
    if (type === 'G2') return [[2, -1], [-3, 2]];
    if (type === 'F4') return [[2, -1, 0, 0], [-1, 2, -2, 0], [0, -1, 2, -1], [0, 0, -1, 2]];
    if (type === 'E6') {
      const C = makeMatrix(6, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    if (type === 'E7') {
      const C = makeMatrix(7, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    if (type === 'E8') {
      const C = makeMatrix(8, (i, j) => i === j ? 2 : 0);
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 7]].forEach(([a, b]) => { C[a][b] = -1; C[b][a] = -1; });
      return C;
    }
    throw new Error('Unsupported Dynkin type.');
  }

  function layoutNodes(type, rank, width, height) {
    const midY = height * 0.52;
    const edge = Math.min(118, Math.max(70, Math.min((width - 172) / Math.max(1, rank - 1), height * 0.22)));
    const nodes = [];
    function line(count, y = midY, centerX = width / 2) {
      const startX = centerX - edge * (count - 1) / 2;
      for (let i = 0; i < count; i++) nodes[i] = { x: startX + edge * i, y };
    }
    if (type === 'A' || type === 'B' || type === 'C' || type === 'F4' || type === 'G2' || (type === 'D' && rank === 2)) {
      line(rank);
    } else if (type === 'D') {
      const chainCount = rank - 2;
      const centerX = width / 2 - edge / 2;
      const startX = centerX - edge * (chainCount - 1) / 2;
      for (let i = 0; i < chainCount; i++) {
        nodes[i] = { x: startX + edge * i, y: midY };
      }
      const fork = nodes[rank - 3];
      nodes[rank - 2] = { x: fork.x + edge * Math.cos(Math.PI / 6), y: midY - edge * Math.sin(Math.PI / 6) };
      nodes[rank - 1] = { x: fork.x + edge * Math.cos(Math.PI / 6), y: midY + edge * Math.sin(Math.PI / 6) };
    } else if (type === 'E6' || type === 'E7' || type === 'E8') {
      const chain = rank - 1;
      line(chain);
      nodes[rank - 1] = { x: nodes[2].x, y: midY - edge };
    }
    return nodes;
  }

  function scene({family,rank,vertices=[],quiver=null}) {
    const cartan=cartanMatrix(family,rank),nodes=layoutNodes(family,rank,900,360).map((node,index)=>({...node,index,marked:vertices.includes(index+1)})),edges=[];
    for(let i=0;i<rank;i++)for(let j=i+1;j<rank;j++) {
      if(!cartan[i][j]&&!cartan[j][i])continue;
      const multiplicity=Math.max(1,Math.abs(cartan[i][j]*cartan[j][i]));
      const arrowTarget=quiver?quiver[i+'-'+j]===-1?i:j:multiplicity>1?Math.abs(cartan[i][j])>Math.abs(cartan[j][i])?j:i:null;
      edges.push({i,j,multiplicity,arrowTarget});
    }
    return {nodes,edges};
  }
  const api={cartanMatrix,layoutNodes,scene};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DynkinDiagramGeometry=api;
}(typeof window!=='undefined'?window:globalThis));
