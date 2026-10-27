'use strict';
const assert = require('node:assert/strict');
const { definitions } = require('./math_workspace_objects.js');
const { create } = require('./math_workspace_panel_catalog.js');
const catalog = create({ definitions, assets: { young: [['partition','Partition']] }, nativePanels: {
  input: { cardType: 'input', supportedKinds: ['variety'] },
  hodge: { cardType: 'hodge', label: 'Hodge Numbers', nativeCardKey: 'hodge-card', supportedKinds: ['variety'] },
  ...Object.fromEntries([['variety','Variety Homology Classes'],['sheaf','Sheaf Class Relations'],['map','Map Pullback / Pushforward']].map(([kind,label])=>['homology-'+kind,{cardType:'homology-'+kind,label,nativeCardKey:'homology-card',supportedKinds:[kind]}]))
} });
assert.equal(catalog.getPrincipals().enabled,true,'confirmed assignments are active by default');
catalog.configurePrincipals({enabled:false}); // Exercise the underlying compatibility rules independently of ownership.
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
const third=asset('young','target','partition');assets.push(third);
assert.deepEqual(find(suggest('young:b','young:a','young:target','lie:g'),'lr').refs,{lambda:'young:b',mu:'young:a',nu:'young:target',lie:'lie:g'});
assert.deepEqual(find(suggest('young:a'),'plethysm').refs,{mu:'young:a'});
assert.equal(find(suggest('young:a'),'plethysm').ready,true,'a power shortcut needs one representation');
assert.equal(find(suggest('young:a','young:a'),'lr').refs.mu,undefined,'duplicate selection must not supply both inputs');
assert(!find(suggest('young:c'),'lr'),'generalized Young diagrams are incompatible with the pair engine');
assert(find(suggest('young:c'),'statistics'));
assert.deepEqual(suggest('matrix:m').filter(panel=>panel.ready).map(panel=>panel.id),['matrix-view','matrix-invariants','matrix-computation','matrix-polynomial']);
assert(!find(suggest('matrix:m'),'statistics'));
assert(!find(suggest('dynkin:d'),'dynkin-cartan'),'marked Dynkin diagrams do not inherit Lie-only panels');
assert.deepEqual(find(suggest('lie:g'),'dynkin-cartan').refs,{lie:'lie:g'});
assert(!find(suggest('dynkin:missing'),'dynkin-cartan'),'a missing reference must not fall back to an unrelated Lie');
assert(!find(suggest('strands:s'),'strands-basis'),'Lie-only basis panels require a Lie type');
assert.deepEqual(find(suggest('lie:g'),'strands-basis').refs,{lie:'lie:g'});
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
assert.equal(catalog.getPrincipals().enabled,false,'preview can temporarily disable the approved assignments');
assert.deepEqual(catalog.principalCandidates('weight'),['young','lie']);
assert.deepEqual(catalog.principalCandidates('dynkin-cartan'),['lie']);
assert.deepEqual(catalog.principalCandidates('dynkin-invariants'),['lie']);
assert.deepEqual(catalog.principalCandidates('strands-basis'),['lie']);
assert.deepEqual(catalog.principalCandidates('slicing-display'),[],'view settings are not properties');
for(const id of ['young-view','matrix-view','field-view','geometry-view','slicing-scene','category-diagram']){assert.equal(catalog.get(id).role,'display');assert(!Object.hasOwn(catalog.getPrincipals().types,id),'displays have no principal property assignment');}
assert.equal(catalog.getPrincipals().types['asset:homology'],undefined);
assert.equal(catalog.getPrincipals().types['lattice-character'],'variety');
assert.equal(catalog.getPrincipals().types['asset:hodge'],'variety');
for(const kind of ['variety','sheaf','map'])assert.deepEqual(catalog.principalCandidates('asset:homology-'+kind),[kind]);
catalog.configurePrincipals({types:{'asset:homology':'wait'}});
for(const kind of ['variety','sheaf','map'])assert.equal(catalog.getPrincipals().types['asset:homology-'+kind],kind,'legacy shared assignment cannot override independent panels');
catalog.configurePrincipals({enabled:true,types:{weight:'young','dynkin-cartan':'lie',grassmannian:'variety'}});
assert(!find(suggest('lie:g'),'weight'),'a supporting Lie type does not own representation properties');
assert.deepEqual(find(suggest('young:a','lie:g'),'weight').refs,{lambda:'young:a',lie:'lie:g'},'supporting inputs still bind when a principal asset is selected');
assert(!find(suggest('dynkin:d'),'dynkin-cartan'),'linked supporting assets do not inherit principal properties');
assert(find(suggest('lie:g'),'dynkin-cartan'));
assert(!find(suggest('young:a'),'grassmannian'));
assert(!find(suggest('young:a','variety:p'),'grassmannian'),'an incompatible principal subtype cannot trigger the panel');
assert(find(suggest('young:a','variety:gr'),'grassmannian'));
assert.throws(()=>catalog.configurePrincipals({enabled:true,types:{'dynkin-cartan':'dynkin'}}),/compatible principal/,'the removed marked-Dynkin relationship cannot be reintroduced');
catalog.configurePrincipals({enabled:true,types:{weight:null}});assert(!find(suggest('young:a','lie:g'),'weight'));
catalog.configurePrincipals({enabled:true,types:{weight:'wait','young-view':'young','sheaf-view':null}});
assert.equal(catalog.getPrincipals().types.weight,'wait');assert(find(suggest('lie:g'),'weight'),'Wait defers ownership and keeps existing associations');
assert(!Object.hasOwn(catalog.getPrincipals().types,'young-view'),'older drafts cannot turn displays into properties');
assert.throws(()=>catalog.configurePrincipals({types:{weight:['young','lie']}}),/compatible principal/);
assert.throws(()=>catalog.configurePrincipals({types:{weight:'matrix'}}),/compatible principal/);
assert.throws(()=>catalog.configurePrincipals({types:{unknown:'young'}}),/compatible principal/);
const shared=create({nativePanels:{shared:{nativeCardKey:'shared',cardType:'shared',label:'Shared',supportedKinds:['variety','sheaf']}}});
shared.configurePrincipals({enabled:true,types:{'asset:shared':'variety'}});
assert.deepEqual(shared.suggest(['variety:p','sheaf:f'],[...assets,asset('sheaf','f')]).map(item=>item.refs.asset),['variety:p'],'single-input panels bind only the selected principal type');
catalog.configurePrincipals({enabled:true,types:{'slicing-display':'sphere'}});
const geometryViews=[{id:'frame-only',type:'geometry-view',assetKeys:['frame:f']},{id:'sphere-only',type:'geometry-view',assetKeys:['sphere:s']}];
assert.deepEqual(catalog.suggest(['frame:f','sphere:s'],assets,geometryViews).filter(item=>item.id==='slicing-display').map(item=>item.refs.view),['frame-only','sphere-only'],'view settings remain independent of property ownership');
catalog.configurePrincipals();assert(!find(suggest('lie:g'),'weight'),'reset restores the approved assignments');
assert(find(suggest('young:a','lie:g'),'weight'));
const homologyAssets=[...assets,asset('sheaf','e'),asset('map','f')];
for(const [key,label] of [['variety:p','Variety Homology Classes'],['sheaf:e','Sheaf Class Relations'],['map:f','Map Pullback / Pushforward']]){
  const kind=key.split(':')[0],list=catalog.suggest([key],homologyAssets).filter(panel=>panel.id.startsWith('asset:homology-'));
  assert.deepEqual(list.map(panel=>panel.id),['asset:homology-'+kind]);assert.equal(list[0].label,label);
}
const diagrams=catalog.suggest(['complex:c','filtration:f'],[asset('complex','c'),asset('filtration','f')]);
assert.deepEqual(diagrams.filter(p=>p.id==='complex-diagrams').map(p=>p.refs.nodes),[['complex:c','filtration:f']]);
assert(!diagrams.some(p=>['complex-view','filtration-view','complex-operations','filtration-operations'].includes(p.id)),'legacy panels are restored, not advertised as new choices');
console.log('math_workspace_panel_catalog_test: selection, ordered inputs, linked references, principal ownership, scenes and views passed');
