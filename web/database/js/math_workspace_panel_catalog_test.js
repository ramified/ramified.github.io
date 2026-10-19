'use strict';
const assert = require('node:assert/strict');
const { definitions } = require('./math_workspace_objects.js');
const { create } = require('./math_workspace_panel_catalog.js');
const catalog = create({ definitions, assets: { young: [['partition','Partition']] }, nativePanels: {
  input: { cardType: 'input', supportedKinds: ['variety'] },
  hodge: { cardType: 'hodge', label: 'Hodge Numbers', nativeCardKey: 'hodge-card', supportedKinds: ['variety'] }
} });
const asset = (kind,id,type=kind,data={}) => ({kind,id,type,data});
const assets = [asset('young','a','partition'),asset('young','b','partition'),asset('young','c','generalized'),
  asset('lie','g','classical',{family:'A'}),asset('lie','e','exceptional',{family:'E8'}),
  asset('dynkin','d','dynkin',{lie:'lie:g'}),asset('dynkin','missing','dynkin',{lie:'lie:deleted'}),
  asset('strands','s','strands',{lie:'lie:g'}),asset('strands','e','strands',{lie:'lie:e'}),
  asset('matrix','m'),asset('frame','f'),asset('frame','f2'),asset('sphere','s'),asset('lattice','l'),asset('point','p'),
  asset('variety','gr','grassmannian'),asset('variety','p','projective'),asset('variety','t','toric'),
  asset('category','c'),asset('category','d'),asset('functor','f')];
const suggest = (...keys) => catalog.suggest(keys,assets);
const find = (list,id) => list.find(panel=>panel.id===id);
assert.deepEqual(catalog.assets,[{kind:'young',subtypes:[{type:'partition',label:'Partition'}]}]);
assert.equal(catalog.get('young-input').role,'input');
assert.deepEqual(suggest(),[]);
assert(!suggest('young:a').some(panel=>panel.role==='input'));
const partial = find(suggest('young:a'),'lr');
assert.deepEqual(partial.refs,{lambda:'young:a'});
assert.deepEqual(partial.missing,['Young diagram μ','Lie type']);
assert.equal(partial.ready,false,'unselected existing assets must not fill missing inputs');
assert.deepEqual(find(suggest('young:b','young:a','lie:g'),'lr').refs,{lambda:'young:b',mu:'young:a',lie:'lie:g'});
assert.equal(find(suggest('young:b','young:a','lie:g'),'lr').ready,true);
assert.equal(find(suggest('young:a','young:a'),'lr').refs.mu,undefined,'duplicate selection must not supply both inputs');
assert(!find(suggest('young:c'),'lr'),'generalized Young diagrams are incompatible with the pair engine');
assert(find(suggest('young:c'),'statistics'));
assert.deepEqual(suggest('matrix:m').filter(panel=>panel.ready).map(panel=>panel.id),['matrix-view','matrix-invariants','matrix-computation','matrix-polynomial']);
assert(!find(suggest('matrix:m'),'statistics'));
assert.deepEqual(find(suggest('dynkin:d'),'dynkin-cartan').refs,{lie:'lie:g'});
assert(!find(suggest('dynkin:missing'),'dynkin-cartan'),'a missing reference must not fall back to an unrelated Lie');
assert.deepEqual(find(suggest('strands:s'),'strands-basis').refs,{lie:'lie:g'});
assert(!find(suggest('strands:e'),'strands-basis'),'A–D restrictions apply to linked references');
assert(find(suggest('strands:s'),'strands-relations'));
assert.deepEqual(find(suggest('frame:f','sphere:s'),'slicing-scene').refs,{frame:'frame:f',nodes:['sphere:s']});
assert.equal(find(suggest('frame:f'),'slicing-scene').ready,false);
assert.deepEqual(find(suggest('sphere:s'),'slicing-scene').missing,['Frame']);
assert.deepEqual(find(suggest('frame:f','frame:f2'),'slicing-scene').refs,{frame:'frame:f',nodes:['frame:f2']});
assert(!find(suggest('variety:p'),'slicing-scene'));
assert(find(suggest('variety:t'),'slicing-scene'));
assert.deepEqual(find(suggest('lattice:l','point:p'),'lattice-character').missing,[],'optional variety is not required');
assert.deepEqual(find(suggest('category:c','functor:f'),'category-diagram').refs.nodes,['category:c','functor:f']);
assert.equal(find(suggest('variety:gr'),'grassmannian').refs.space,'variety:gr');
assert(!find(suggest('variety:p'),'grassmannian'));
assert.deepEqual(find(suggest('variety:p'),'asset:hodge').refs,{asset:'variety:p'});
assert.equal(find(suggest('variety:p'),'asset:hodge').route,'assets');
assert(!find(suggest('variety:t'),'asset:hodge'),'legacy native properties must not claim unsupported toric geometry');
const views=[{id:'v1',type:'strands-view',assetKeys:['strands:s'],label:'First view',active:true},
  {id:'v2',type:'strands-view',assetKeys:['strands:s'],label:'Second view'},
  {id:'v3',type:'strands-view',assetKeys:['strands:e'],label:'Other view'},
  {id:'v4',type:'strands-view',assetKeys:['strands:s'],closed:true}];
assert.deepEqual(catalog.suggest(['strands:s'],assets,views).filter(p=>p.role==='view').map(p=>p.refs.view),['v1','v2']);
assert.deepEqual(catalog.suggest([],assets,views).map(p=>p.refs.view),['v1']);
assert.equal(catalog.bindingKey('branching',{mu:'young:b',lambda:'young:a',lie:''}),catalog.bindingKey('branching',{lambda:'young:a',mu:'young:b'},'diag-gl'));
assert.notEqual(catalog.bindingKey('lr',{lambda:'young:a',mu:'young:b'}),catalog.bindingKey('lr',{lambda:'young:b',mu:'young:a'}));
console.log('math_workspace_panel_catalog_test: typed selection, ordered inputs, references, scenes and views passed');
