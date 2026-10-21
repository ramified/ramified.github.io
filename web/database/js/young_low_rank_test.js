'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'young_diagrams.js'),'utf8');
const begin=source.indexOf('function bgcd('),end=source.indexOf('// ── Dynkin labels from row lengths');
const api=vm.runInNewContext(source.slice(begin,end)+'\n({cartanMatrix,positiveRoots,positiveCoroots,weylDimGeneral})');
for(const type of ['B:1','C:1']){
  const c=api.cartanMatrix(type);assert.equal(JSON.stringify(c),'[[2]]');assert.equal(api.positiveRoots(c).length,1);
  assert.equal(api.weylDimGeneral(api.positiveCoroots(c),[1]),2n);
  assert.equal(api.weylDimGeneral(api.positiveCoroots(c),[2]),3n);
}
const c=api.cartanMatrix('D:2');assert.equal(JSON.stringify(c),'[[2,0],[0,2]]');assert.equal(api.positiveRoots(c).length,2);
for(const [labels,dimension] of [[[1,0],2n],[[0,1],2n],[[1,1],4n],[[2,3],12n]])assert.equal(api.weylDimGeneral(api.positiveCoroots(c),labels),dimension);
console.log('PASS Young B1/C1 weights and D2 product Weyl dimensions');
