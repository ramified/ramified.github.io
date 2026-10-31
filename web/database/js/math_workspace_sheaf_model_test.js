'use strict';
const assert=require('node:assert/strict'),model=require('./math_workspace_sheaf_model.js');
const variety=(id,type,data)=>({kind:'variety',id,type,data});
assert.deepEqual(model.degrees(''),[]);assert.deepEqual(model.degrees('0'),[]);assert.deepEqual(model.degrees('2; 3|4'),[2,3,4]);
for(const invalid of ['100','2a','-1','1,1,1,1,1,1,1,1,1'])assert.throws(()=>model.degrees(invalid));
assert.equal(model.dimension(variety('X','complete-intersection',{degrees:'',ambientDimension:3}),[]),3);
assert.equal(model.dimension(variety('X','symmetric-product-curve',{power:0}),[]),0);
for(const [type,data]of [['abstract',{dimension:20}],['ppav-moduli',{genus:6}],['grassmannian',{r:4,n:4}],['grassmannian',{r:2,n:12}]])assert.throws(()=>model.dimension(variety('X',type,data),[]));
const X=variety('X','projective',{dimension:3}),Y=variety('Y','projective',{dimension:2}),Z=variety('Z','point',{}),f={kind:'map',id:'f',type:'ordinary',data:{domain:'variety:X',codomain:'variety:Y'}},g={kind:'map',id:'g',type:'ordinary',data:{domain:'variety:Y',codomain:'variety:Z'}},h={kind:'map',id:'h',type:'composition',data:{domain:'map:f',codomain:'map:g'}};
const assets=[X,Y,Z,f,g,h];assert.deepEqual(model.endpoints(h,assets),{domain:'variety:X',codomain:'variety:Z'});
const ids=new Map(assets.map(a=>[a.kind+':'+a.id,a.id]));assert.equal(model.project(h,ids,assets).codomainId,'Z');
g.data.domain='variety:X';assert.match(model.issues(h,assets)[0],/second map/);g.data.domain='variety:Y';
const E={kind:'sheaf',id:'E',type:'locally-free',data:{base:'variety:X'}},F={kind:'sheaf',id:'F',type:'locally-free',data:{base:'variety:Y'}},sum={kind:'sheaf',id:'S',type:'direct-sum',data:{first:'sheaf:E',second:'sheaf:F'}};
assert.ok(model.issues(sum,[...assets,E,F]).length);F.data.base='variety:X';assert.deepEqual(model.issues(sum,[...assets,E,F]),[]);
const self={kind:'sheaf',id:'T',type:'self-direct-sum',data:{parent:'sheaf:E',multiplicity:'2',workspaceSheafComplex:{payload:{id:'T2',construction:{type:'self-direct-sum',multiplicity:'2'}}}}};
assert.ok(model.editedData(self,self.type,self.data).workspaceSheafComplex.payload.construction);
assert.deepEqual(model.editedData(self,self.type,{...self.data,multiplicity:'3'}).workspaceSheafComplex.payload,{id:'T2'});
assert.equal(self.data.workspaceSheafComplex.payload.construction.multiplicity,'2');
const embedding={kind:'map',id:'i',type:'ordinary',data:{domain:'variety:Z',codomain:'variety:Y'}},geometryAssets=[...assets,embedding];
for(const type of ['ideal-sheaf','normal-bundle','conormal-bundle','relative-tangent','relative-cotangent']){
  const geo={kind:'sheaf',id:'N',type,data:{map:'map:i'}};
  assert.match(model.issues(geo,geometryAssets)[0],/Confirm the geometric hypotheses/);
  geo.data.workspaceSheafComplex={payload:{construction:{type}}};
  assert.deepEqual(model.issues(geo,geometryAssets),[],'legacy saved geometry remains usable');
  geo.data.confirmed=false;
  assert.match(model.issues(geo,geometryAssets)[0],/Confirm the geometric hypotheses/,'cached constructions must not override an explicit unchecked box');
  geo.data.confirmed=true;
  assert.deepEqual(model.issues(geo,geometryAssets),[]);
}
assert.match(model.issues({kind:'sheaf',id:'bad-normal',type:'normal-bundle',data:{map:'map:f',confirmed:true}},assets)[0],/negative codimension/,'confirmation does not bypass dimension constraints');
assert.deepEqual(model.tensorParents({first:'sheaf:E',second:'sheaf:F'}),['sheaf:E','sheaf:F'],'legacy binary input remains readable');
assert.deepEqual(model.tensorParents({parents:[]}),[]);
assert.deepEqual(model.tensorExponents({parents:['sheaf:E','sheaf:F'],exponents:[' +02 ','0']}),['2','0']);
assert.throws(()=>model.tensorExponents({parents:['sheaf:E'],exponents:['']}),/complete exponent/);
assert.throws(()=>model.tensorExponents({parents:Array(7).fill('sheaf:E')}),/at most 6/);
assert.equal(model.base({kind:'sheaf',id:'unit',type:'tensor',data:{parents:[],base:'variety:X'}},assets),'variety:X');
assert.deepEqual(model.issues({kind:'sheaf',id:'unit',type:'tensor',data:{parents:[],base:'variety:X'}},assets),[]);
assert.deepEqual(model.issues({kind:'sheaf',id:'one',type:'tensor',data:{parents:['sheaf:E'],exponents:['3']}},[...assets,E]),[]);
assert.ok(model.issues({kind:'sheaf',id:'mixed',type:'tensor',data:{parents:['sheaf:E','sheaf:other']}},[...assets,E,{...F,id:'other',data:{base:'variety:Y'}}]).length,'check the base of every factor');
for(let n=1;n<=6;n++)for(let k=1;k<=n;k++){
  const expected=Array(n+1).fill(0n);expected[k]=1n;
  assert.deepEqual(model.projectiveSchurCohomology(n,Array(k).fill(1),'cotangent'),expected,'Bott recovers every Hodge row on projective space');
}
assert.deepEqual(model.projectiveSchurCohomology(1,[2],'cotangent'),[0n,3n],'Sym^2 Omega_P1 = O(-4)');
assert.deepEqual(model.projectiveSchurCohomology(2,[2],'tangent'),[27n,0n,0n],'Sym^2 T_P2 has 27 sections');
assert.deepEqual(model.projectiveSchurCohomology(2,[2,1],'tangent'),[35n,0n,0n],'S_(2,1) T_P2 = T_P2(3)');
assert.deepEqual(model.projectiveSchurCohomology(2,[2,2],'cotangent'),[0n,0n,10n],'S_(2,2) Omega_P2 = O(-6)');
assert.deepEqual(model.projectiveSchurCohomology(2,[2],'cotangent'),[0n,0n,0n],'singular shifted weights are acyclic');
assert.deepEqual(model.projectiveSchurCohomology(2,[1,1,1],'cotangent'),[0n,0n,0n],'too many rows give the zero bundle');
assert.throws(()=>model.projectiveSchurCohomology(3,[1,2],'tangent'));
model.setDivisorBasisProvider(()=>[{id:'H1'},{id:'H2'}]);
assert.deepEqual(model.divisorCoefficients({base:'variety:X',divisorCoefficients:{H1:' -02 / 4 ',H2:'0'}},assets),{H1:'-1/2'});
assert.deepEqual(model.divisorCoefficients({base:'variety:X',divisorCoefficients:{old:'0'}},assets),{});
for(const value of ['', '-', '2/', '1/0','2.5'])assert.throws(()=>model.divisorCoefficients({base:'variety:X',divisorCoefficients:{H1:value}},assets));
assert.throws(()=>model.divisorCoefficients({base:'variety:X',divisorCoefficients:{old:'2'}},assets),/unavailable/);
model.setDivisorBasisProvider(undefined);
console.log('Sheaf model: CI parsing, range boundaries, composition endpoints, dependent bases and saved construction invalidation passed.');

