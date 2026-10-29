'use strict';
const assert=require('node:assert/strict'), creation=require('./math_workspace_creation.js'), model=require('./math_workspace_objects.js');
const kinds=['variety','sheaf','map',...model.inputKinds];
const catalog=creation.catalog(Object.fromEntries(kinds.map(kind=>[kind,[[kind,model.kindLabels[kind]||kind]]])),model.kindLabels,model.capabilities);
assert.equal(catalog.length,kinds.length);assert.equal(new Set(catalog.map(x=>x.kind)).size,kinds.length);
assert(catalog.every(x=>x.subjects.length&&x.description));
const representation=creation.filter(catalog,'','representation'), linear=creation.filter(catalog,'','linear');
assert.equal(representation.filter(x=>x.kind==='matrix').length,0);assert(representation.some(x=>x.kind==='young'));assert(!representation.some(x=>x.kind==='field'));
assert(linear.some(x=>x.kind==='matrix'));assert(linear.some(x=>x.kind==='field'));assert(!linear.some(x=>x.kind==='young'));
assert.deepEqual(creation.filter(catalog,'braid').map(x=>x.kind).sort(),['knot','strands']);
assert.equal(creation.filter(catalog,'braid','linear').length,0);
assert(creation.filter(catalog,'representation theory').some(x=>x.kind==='fan'));
assert.equal(creation.filter(catalog,'zzzz').length,0);
assert.equal(catalog.find(x=>x.kind==='variety').label,'Variety');
assert.equal(catalog.find(x=>x.kind==='formula').label,'Equations');
assert(creation.filter(catalog,'inequalities').some(entry=>entry.kind==='formula'));
assert(creation.filter(catalog,'formula set').some(entry=>entry.kind==='formula'),'the old name remains searchable');
assert(catalog.every(entry=>creation.displays.some(display=>display.id===entry.display&&display.views.includes(model.capabilities[entry.kind].open))),'every asset is classified by its actual display route');
assert.deepEqual(creation.filter(catalog,'','','dynkin').map(entry=>entry.kind).sort(),['dynkin','lie']);
assert.deepEqual(creation.filter(catalog,'','linear','matrix').map(entry=>entry.kind),['matrix']);
assert.equal(creation.filter(catalog,'','algebraic','matrix').length,0);
assert(creation.filter(catalog,'matrices').some(entry=>entry.kind==='matrix'));
const assignments=creation.subjectAssignments(catalog),defaults=assignments.settings();let updates=0;
assert.deepEqual(defaults,{version:1,subjectsByKind:{
  filtration:['algebraic'],complex:['algebraic'],'field-extension':['linear'],
  'mosaic-space':['topology'],'mosaic-diagram':['topology'],knot:['topology'],'dual-graph':['topology'],frame:['linear','geometry'],
  polytope:['geometry'],sphere:['geometry'],point:['linear','geometry'],vector:['linear','geometry'],
  roots:['representation','geometry'],lattice:['linear','geometry'],voronoi:['geometry'],formula:['geometry'],
  tropical:['geometry'],weyl:['representation','geometry'],cone:['geometry'],fan:['representation','algebraic','geometry'],
  dynkin:['representation'],strands:['representation'],matrix:['linear'],field:['linear'],number:['linear','algebraic'],category:['categories'],
  functor:['categories'],young:['representation'],lie:['representation'],variety:['algebraic'],sheaf:['algebraic'],map:['algebraic']
}},'defaults exactly match the approved subject configuration');
const unsubscribe=assignments.subscribe(()=>updates++);
assignments.set('matrix',['topology','topology']);
assert.deepEqual(assignments.settings().subjectsByKind.matrix,['topology']);
assert(!creation.filter(catalog,'linear algebra').some(entry=>entry.kind==='matrix'),'removed subject names do not remain in the search index');
assert(creation.filter(catalog,'topology').some(entry=>entry.kind==='matrix'));
assignments.set('matrix',[]);
assert(creation.filter(catalog,'','','matrix').some(entry=>entry.kind==='matrix'),'unassigned types remain browsable');
assert.equal(creation.filter(catalog,'','linear','matrix').length,0);
assert.throws(()=>assignments.set('matrix',['invalid']));assert.throws(()=>assignments.set('invalid',[]));
assignments.reset();assert.deepEqual(assignments.settings(),defaults);assert.equal(updates,3);
const copy=assignments.settings();copy.subjectsByKind.matrix.length=0;assert.deepEqual(assignments.settings(),defaults,'export cannot mutate live assignments');
unsubscribe();assignments.reset();assert.equal(updates,3);
assert.deepEqual(model.powerRows('symmetric',0),[]);assert.deepEqual(model.powerRows('symmetric',3),[3]);assert.deepEqual(model.powerRows('exterior',3),[1,1,1]);
assert.throws(()=>model.powerRows('symmetric',13));assert.throws(()=>model.powerRows('exterior',1.5));
console.log('creation catalog coverage, overlapping subjects, search, and power shapes passed');
