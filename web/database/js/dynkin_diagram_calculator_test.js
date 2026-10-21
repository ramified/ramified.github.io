'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'dynkin_diagram_calculator.js'),'utf8').replace(/\}\)\(\);\s*$/,'return {rankBounds,clampRank,cartanMatrix,positiveRoots,invariants,layoutNodes,parabolicData,quiverOrientationMatches};})();');
const api=vm.runInNewContext(source,{document:{addEventListener(){}},window:{DynkinDiagramGeometry:require('./dynkin_diagram_geometry.js')},console});
const plain=value=>JSON.parse(JSON.stringify(value));
function info(type,rank){const c=api.cartanMatrix(type,rank),roots=api.positiveRoots(c);return {c,roots,info:api.invariants(type,rank,c,roots)};}
const d=info('D',3),a=info('A',3);
assert.equal(api.rankBounds('D').min,2);assert.equal(api.clampRank('D',3),3);
const relabel=[1,0,2]; // D3 center 1 maps to A3 center 2 (one-based labels).
assert.deepEqual(plain(d.c),relabel.map(i=>relabel.map(j=>a.c[i][j])));
assert.deepEqual(d.roots.map(v=>[v[1],v[0],v[2]].join(',')).sort(),a.roots.map(v=>v.join(',')).sort());
for(const key of ['dimension','positiveRoots','roots','coxeter','dualCoxeter','determinant','center'])assert.equal(d.info[key],a.info[key],key);
assert.equal(d.info.dimension,15);assert.equal(d.info.positiveRoots,6);assert.equal(d.info.weylOrder,24n);
assert.deepEqual(plain(d.info.exponents),[1,2,3]);
assert(api.layoutNodes('D',3,900,360).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
const a1=info('A',1);assert.equal(a1.info.dimension,3);assert.equal(a1.info.positiveRoots,1);assert.equal(a1.info.weylOrder,2n);
const b=info('B',2),c=info('C',2);
assert.deepEqual(plain(b.c),[[2,-2],[-1,2]]);assert.deepEqual(plain(c.c),[[2,-1],[-2,2]]);
assert.deepEqual(plain(b.c),plain(c.c).slice().reverse().map(row=>row.slice().reverse()));
for(const key of ['dimension','positiveRoots','roots','coxeter','dualCoxeter','determinant','center'])assert.equal(b.info[key],c.info[key],key);
assert.equal(b.info.dimension,10);assert.equal(b.info.weylOrder,8n);assert.equal(c.info.weylOrder,8n);
for(const type of ['B','C']) {
  assert.equal(api.rankBounds(type).min,1);
  const v=info(type,1);assert.deepEqual(plain(v.c),[[2]]);
  for(const key of ['dimension','positiveRoots','roots','coxeter','dualCoxeter','determinant','center'])assert.equal(v.info[key],a1.info[key],type+'1 '+key);
  assert.equal(v.info.weylOrder,2n);
}
const d2=info('D',2);assert.deepEqual(plain(d2.c),[[2,0],[0,2]]);
assert.equal(d2.info.dimension,6);assert.equal(d2.info.roots,4);assert.equal(d2.info.weylOrder,4n);
assert.deepEqual(plain(d2.info.exponents),[1,1]);assert.equal(d2.info.center,'Z/2Z x Z/2Z');
assert(api.layoutNodes('D',2,900,360).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
for(const indices of [[0],[1],[0,1]]) {
  const p=api.parabolicData('D',2,indices,d2.roots);
  assert.equal(p.dimension,6-indices.length);assert.equal(p.nilradicalDimension,indices.length);
  assert.equal(p.model.flag,indices.length===2?'\\mathfrak{b}\\oplus\\mathfrak{b}':indices[0]===0?'\\mathfrak{b}\\oplus\\mathfrak{sl}_2':'\\mathfrak{sl}_2\\oplus\\mathfrak{b}');
}
assert(api.quiverOrientationMatches({},{}),'an edgeless quiver has period one');
console.log('PASS native D3/A3 relabelling, roots, invariants, layout, A1 and B2/C2 dual numbering');
