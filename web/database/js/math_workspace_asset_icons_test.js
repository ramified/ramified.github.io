'use strict';
const assert = require('node:assert/strict');
global.MathWorkspaceObjects = require('./math_workspace_objects.js');
global.StrandDrawing = require('./strand_drawing.js');
const icons = require('./math_workspace_asset_icons.js');
const young = (rows,type='partition') => ({kind:'young',type,data:{rows}});
assert.equal(icons.describe(young([])).source,'generic');
assert.equal(icons.describe(young([0,0],'generalized')).source,'generic');
assert.equal(icons.describe(young([5,4,3,2,1])).source,'diagram');
assert.equal(icons.describe(young([6])).source,'generic');
assert.equal(icons.describe(young([1,1,1,1,1,1])).source,'generic');
assert.equal(icons.describe(young([3,0,-3],'generalized')).source,'diagram');
assert.equal(icons.describe(young([4,-3],'generalized')).source,'generic');
assert.deepEqual(icons.describe(young([2,0,-2],'generalized')).rows,[2,0,-2]);
for (const name of ['X','\\lambda','\\mathcal{F}^{st}_{2}','F_2','\\mathbb{K}','α','X_{a_{2}}']) assert(icons.letterName(name),name);
for (const name of ['XY','X+Y','\\operatorname{Hom}','X_{2','F_2_3','\\mathcal{FG}','F_{\\href{x}{y}}']) assert(!icons.letterName(name),name);
const lie={kind:'lie',data:{family:'A',rank:3}}, strand={kind:'strands',data:{lie:'lie:a',generators:[]}};
assert.equal(icons.describe(strand,()=>lie).source,'diagram');
assert.equal(icons.describe(strand,()=>({...lie,data:{family:'A',rank:4}})).source,'generic');
assert.equal(icons.describe({...strand,data:{...strand.data,generators:Array(5).fill({family:'coxeter',index:1})}},()=>lie).source,'generic');
const drawing=global.StrandDrawing;
for (const family of ['coxeter','braid','kl','tl']) {
  const scene=drawing.scene({groupType:'symmetric',strandCount:4,generators:[{family,index:1,sign:-1}]});
  assert.deepEqual(scene.records[0].pairs,[[1,2]]);assert.equal(scene.records[0].shouldSwap,['coxeter','braid'].includes(family));assert.equal(scene.records[0].sign,-1);
}
assert.deepEqual(drawing.scene({groupType:'D',strandCount:4,generators:[{family:'coxeter',index:0}]}).records[0].pairs,[[-2,1],[-1,2]]);
assert.deepEqual(drawing.scene({groupType:'B',strandCount:2,generators:[{family:'coxeter',index:0}]}).tracks,[-2,-1,1,2]);
console.log('workspace icon eligibility, notation, dependencies, and strand scenes passed');
