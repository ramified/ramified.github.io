'use strict';
const assert=require('node:assert/strict'),slicing=require('./math_workspace_slicing.js'),objects=require('./math_workspace_objects.js');
const asset=(kind,id,data,type=kind)=>({kind,id,type,data:objects.normalize(kind,type,data)});
const f=asset('frame','f',{ambientDimension:3,position:[1,2,3],basis:[[2,1,0],[0,3,0],[0,0,4]]});
assert.deepEqual(f.data.basis,[[2,1,0],[0,3,0],[0,0,4]],'a frame is a point and all ordered basis vectors, without orthonormalization');
assert.throws(()=>slicing.normalize('frame','frame',{ambientDimension:3,basis:[[1,0,0],[0,1,0],[0,0,0]]}),/invertible/);
assert.throws(()=>slicing.normalize('frame','frame',{ambientDimension:3,basis:[[1,0],[0,1],[0,0]]}),/exactly 3/);
assert.throws(()=>slicing.resize(f,2),/outside/);
assert.deepEqual(slicing.resize(f,4).basis,[[2,1,0,0],[0,3,0,0],[0,0,4,0],[0,0,0,1]]);
const sphere=asset('sphere','s',{ambientDimension:3}),point=asset('point','p',{ambientDimension:3}),lattice=asset('lattice','l',{ambientDimension:3}),voronoi=asset('voronoi','v',{ambientDimension:3,lattice:'lattice:l',point:'point:p'});
assert.deepEqual(slicing.issues(voronoi,[voronoi,lattice,point]),[]);
assert(slicing.issues(voronoi,[voronoi,lattice]).some(s=>s.includes('Cell center')));
assert.deepEqual(objects.contextFor({type:'slicing-scene',refs:{frame:'frame:f',nodes:['sphere:s','voronoi:v']}},[f,sphere,point,lattice,voronoi]).missing,[]);
point.data.ambientDimension=2;assert(slicing.issues(voronoi,[voronoi,lattice,point]).some(s=>s.includes('same ambient dimension')));point.data.ambientDimension=3;
const lie=asset('lie','g',{family:'A',rank:3},'simple'),matrix=asset('matrix','m',{rows:2,cols:2,construction:{lie:'lie:g',basis:'simple-roots'}});
slicing.setKernel((action,{lie})=>{assert.equal(action,'lie-matrix');return slicing.identity(lie.rank);});
assert.equal(slicing.materialize(matrix,[matrix,lie]).data.rows,3);
assert.deepEqual(slicing.issues(matrix,[matrix,lie]),[],'generated matrix dimensions follow the Lie type');
assert.equal(matrix.data.rows,2,'projection does not mutate stored assets');
const graph={version:1,module:'higher-dimensional-slice-explorer',ambientDimension:3,position:[1,2,3],frame:[[2,0,0],[1,3,0],[0,0,4]],objects:[
  {id:'g',name:'g',data:{objectType:'dynkin-type',dynkinType:'A',dynkinRank:3}},
  {id:'m',name:'m',data:{objectType:'matrix',matrixRows:slicing.identity(3),matrixPresetKind:'simple-roots',dynkinSourceId:'g'}},
  {id:'l',name:'l',data:{objectType:'lattice',basisMode:'matrix-object',matrixSourceId:'m'}},
  {id:'v',name:'v',data:{objectType:'voronoi-diagram',latticeSourceId:'l',latticePoint:[0,0,0]}},
  {id:'r',name:'r',data:{objectType:'root-set',dynkinSourceId:'g'}},
  {id:'c',name:'c',data:{objectType:'toric-cone',generators:[{id:'u',coordinates:['1/2','0','0']}]}},
  {id:'fan',name:'fan',data:{objectType:'toric-fan',constructionMode:'cone-list',coneSourceIds:['c'],cones:[]}},
  {id:'moving',name:'moving',data:{objectType:'cartesian-frame',basis:'moving'}}
]};
const prepared=slicing.prepareImport(graph,objects.normalize);
assert.deepEqual(prepared.records[0].data,f.data);
assert.equal(prepared.records.filter(a=>a.kind==='lie').length,1);
assert.equal(prepared.records.filter(a=>a.kind==='frame').length,1,'a legacy moving frame view references the slice frame');
assert.equal(prepared.records.find(a=>a.kind==='cone').data.generators[0].coordinates[0],'1/2');
for(const a of prepared.records)assert.deepEqual(slicing.issues(a,prepared.records),[],a.kind);
assert.throws(()=>slicing.prepareImport({...graph,frame:graph.frame.slice(0,2)},objects.normalize),/exactly 3/);
assert.throws(()=>slicing.prepareImport({...graph,objects:[...graph.objects,graph.objects[0]]},objects.normalize),/duplicate/);
assert.throws(()=>slicing.prepareImport({...graph,objects:[{id:'r',data:{objectType:'root-set',dynkinSourceId:'missing'}}]},objects.normalize),/Missing Lie/);
assert.equal(slicing.normalize('frame','frame',{ambientDimension:9,position:Array(9).fill(0),basis:slicing.identity(9)}).basis.length,9);
assert(slicing.issues(asset('frame','large',{ambientDimension:9}),[asset('frame','large',{ambientDimension:9})]).some(s=>s.includes('2–8')));
console.log('math_workspace_slicing_test: complete frames, strict dimensions, derived matrices and linked legacy graph migration passed');
