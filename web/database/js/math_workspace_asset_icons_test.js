'use strict';
const assert = require('node:assert/strict');
global.MathWorkspaceObjects = require('./math_workspace_objects.js');
global.StrandDrawing = require('./strand_drawing.js');
const icons = require('./math_workspace_asset_icons.js');
assert.deepEqual(icons.settings(),{exactColor:'',genericColor:'#a8510b',stroke:0.7,strandStroke:19,hatch:true,matrixStroke:2.1,matrixEntryStroke:0.7,matrixFontSize:20,matrixFontFamily:'"Times New Roman", serif',matrixRowGap:0,matrixColumnGap:0,matrixBracketGap:1,matrixBracketCurve:3,matrixPadding:0,fanNegativeLength:0.7,coneNegativeLength:0.7});
assert.equal(icons.describe({kind:'mosaic-space',name:'S',data:{}}).kind,'mosaic-space');
assert.equal(icons.describe({kind:'mosaic-diagram',name:'D',data:{}}).kind,'mosaic-diagram');
const young = (rows,type='partition') => ({kind:'young',type,data:{rows}});
assert.deepEqual(icons.describe({kind:'sheaf',name:'Sheaf',data:{}}).representative,{kind:'sheaf',name:'\\mathcal{F}',fallback:'ℱ'});
assert.equal(icons.describe({kind:'sheaf',name:'\\mathcal{E}',data:{}}).name,'\\mathcal{E}','a supported asset name retains its exact icon');
const latticePoints=icons.describe({kind:'lattice',name:'Lattice',data:{}}).representative.points;
assert.equal(latticePoints.length,9);
for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++)assert(latticePoints.some(p=>p.x===a+b/2&&p.y===b*Math.sqrt(3)/2));
assert.equal(icons.describe({kind:'lattice',name:'L_2',data:{}}).name,'L_2');
for(const [family,rank,notation] of [['A',3,'A_{3}'],['B',4,'B_{4}'],['E6',6,'E_{6}'],['E7',7,'E_{7}'],['E8',8,'E_{8}'],['F4',4,'F_{4}'],['G2',2,'G_{2}'],['A',0,'A_{0}']]) {
  assert.equal(icons.describe({kind:'lie',name:'\\mathfrak{g}',data:{family,rank}}).name,notation);
}
assert.equal(icons.describe({kind:'lie',data:{}}).representative.name,'E_{6}');
assert.equal(icons.describe(young([])).source,'generic');
assert.deepEqual(icons.describe(young([])).representative.rows,[3,1]);
assert.deepEqual(icons.describe({kind:'strands',name:'',data:{}}).representative,{kind:'strands',groupType:'symmetric',strandCount:3,generators:[{family:'braid',index:1,sign:1},{family:'braid',index:2,sign:-1}]});
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
const marked={kind:'dynkin',name:'\\Delta',data:{lie:'lie:a',vertices:[2],quiver:null}};
assert.equal(icons.describe(marked,()=>lie).source,'diagram');
assert.equal(icons.describe(marked,()=>lie).family,'A');
assert.equal(icons.describe(marked,()=>({...lie,data:{family:'D',rank:5}})).family,'D','parent changes invalidate icon geometry');
assert.equal(icons.describe(marked,()=>({...lie,data:{family:'A',rank:13}})).source,'generic');
assert.equal(icons.describe({...marked,data:{...marked.data,vertices:[4]}},()=>lie).source,'generic','invalid markings never produce an exact icon');
assert.equal(icons.describe(marked).source,'generic');
assert.deepEqual(icons.describe(marked).representative,{kind:'dynkin',family:'D',rank:5,vertices:[2],quiver:null});
const geometry=require('./dynkin_diagram_geometry.js');
const d5=geometry.scene(icons.describe(marked).representative);
assert.equal(d5.nodes.length,5);assert.equal(d5.edges.length,4);
assert.deepEqual(d5.nodes.filter(n=>n.marked).map(n=>n.index+1),[2]);
assert.deepEqual(d5.edges.map(e=>[e.i+1,e.j+1]),[[1,2],[2,3],[3,4],[3,5]]);
for(const [family,rank,multiplicity,target] of [['B',3,2,3],['C',3,2,2],['F4',4,2,3],['G2',2,3,1]]) {
  const edge=geometry.scene({family,rank,vertices:[1]}).edges.find(e=>e.multiplicity>1);
  assert.equal(edge.multiplicity,multiplicity);assert.equal(edge.arrowTarget+1,target);
}
assert.equal(geometry.scene({family:'D',rank:2,vertices:[1,2]}).edges.length,0);
assert.deepEqual(geometry.scene({family:'A',rank:3,quiver:{'0-1':1,'1-2':-1}}).edges.map(e=>e.arrowTarget+1),[2,2]);
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
const braidWord=indices=>indices.map(index=>({family:'braid',index,sign:1}));
const wordIcon=indices=>icons.describe({...strand,data:{...strand.data,generators:braidWord(indices)}},()=>lie);
assert.equal(wordIcon([1,3,1,3,1,3,1,3]).source,'diagram','eight generators in four compressed rows fit');
assert.equal(wordIcon([1,3,1,3,1,3,1,3,1,3]).source,'generic','five compressed rows use the type representative');
for(const family of ['coxeter','braid','kl','tl']) {
  const generators=braidWord([1,3,1,3,1,3,1,3]).map(record=>({...record,family}));
  assert.equal(icons.describe({...strand,data:{...strand.data,generators}},()=>lie).source,'diagram',family+' uses the shared row count');
}
const packed=(indices,n=6)=>drawing.consecutiveRows(drawing.scene({groupType:'symmetric',strandCount:n,generators:braidWord(indices)}).records).map(row=>row.map(record=>record.generator.index));
assert.deepEqual(packed([1,3,5,2]),[[1,3,5],[2]]);
assert.deepEqual(packed([4,3,1,4]),[[4],[3,1],[4]],'only group consecutive independent crossings, without backfilling');
assert.deepEqual(packed([1,3,1,4]),[[1,3],[1,4]]);
assert.deepEqual(packed([1,1]),[[1],[1]],'repeated crossings occupy separate rows');
assert.deepEqual(packed([]),[]);
for(const groupType of ['B','C','D']) {
  const records=drawing.scene({groupType,strandCount:4,generators:braidWord([0,3,1])}).records;
  assert.deepEqual(drawing.consecutiveRows(records).map(row=>row.map(record=>record.generator.index)),[[0,3],[1]]);
}
function context(){
  const strokes=[],curves=[],masks=[];
  return {strokes,curves,masks,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},rect(){},arc(x,y,r){masks.push({x,y,r});},clip(){},bezierCurveTo(...points){curves.push(points);},stroke(){strokes.push({color:this.strokeStyle,width:this.lineWidth,cap:this.lineCap,join:this.lineJoin,alpha:this.globalAlpha});}};
}
for(const family of ['coxeter','braid','kl','tl'])for(const groupType of ['symmetric','B','C','D']) {
  const ctx=context(),model={groupType,strandCount:4,generators:[{family,index:groupType==='symmetric'?1:0,sign:-1}]},before=JSON.stringify(model);
  drawing.thumbnail(ctx,256,256,model,'#387456',{strokeWidth:18});
  assert(ctx.strokes.length&&ctx.curves.length,'soft paths are used for '+groupType+' '+family);
  assert(ctx.strokes.every(s=>s.color==='#387456'&&s.width===18&&s.cap==='round'&&s.join==='round'&&s.alpha===1),'all paths and generator glyphs use the same thumbnail color and stroke');
  assert.equal(JSON.stringify(model),before,'rendering does not change the word');
}
const compact=context();drawing.thumbnail(compact,256,256,{groupType:'symmetric',strandCount:4,generators:braidWord([1,3])});
assert(compact.curves.every(points=>points[5]===240),'independent crossings finish on the same row');
const plus=context(),minus=context();
drawing.thumbnail(plus,256,256,{groupType:'symmetric',strandCount:3,generators:[{family:'braid',index:1,sign:1}]});
drawing.thumbnail(minus,256,256,{groupType:'symmetric',strandCount:3,generators:[{family:'braid',index:1,sign:-1}]});
assert(plus.masks.length&&minus.masks.length,'braid over/under gaps are retained');
console.log('workspace icon eligibility, notation, dependencies, and strand scenes passed');
