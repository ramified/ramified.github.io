'use strict';
const assert = require('node:assert/strict');
const io = require('./math_workspace_io.js');
const model = require('./math_workspace_objects.js');
const slicing = require('./math_workspace_slicing.js');
const asset = (kind,data,type=kind) => ({kind,id:'A1',name:'Object "quoted" \\mathcal{X}\n中文',type,data:model.normalize(kind,type,data)});
for (const a of [asset('young',{partition:'3,2'},'partition'), asset('lie',{family:'E6'} ,'simple'), asset('point',{ambientDimension:3,position:[1.5,-2,1e-7]}), asset('vector',{ambientDimension:3}), asset('cone',{ambientDimension:3,generators:[{coordinates:['1/2','0','0']}]}), asset('lattice',{ambientDimension:3})]) {
  for (const format of io.casFormats(a)) {
    const code = io.casExport(a,format);
    assert.match(code,/^\w+ = (Partition|CartanType|vector|Cone|IntegerLattice)\(/m);
    assert.doesNotMatch(code,/json|HashTable|workspace_data|objectData|def |data\[/);
    assert.equal(code.trim().split('\n').length,a.kind==='lattice'?2:1,'native exports are direct, self-contained assignments with any required constructor import');
  }
}
assert.equal(io.casExport(asset('young',{partition:'3,2'},'partition'),'sage'),'partition = Partition([3, 2])\n');
assert.equal(io.casExport({...asset('vector',{ambientDimension:3}),name:'w'},'sage'),'w = vector(QQ, [1, 0, 0])\n');
assert.equal(io.casExport({...asset('vector',{ambientDimension:3}),name:'false'},'macaulay2'),'v = vector(QQ, {1, 0, 0});\n');
assert.equal(io.casExport({...asset('vector',{ambientDimension:3}),name:'a_b'},'macaulay2'),'v = vector(QQ, {1, 0, 0});\n');
assert.equal(io.casExport(asset('point',{ambientDimension:3,position:[1.5,-2,1e-7]}),'macaulay2'),'p = vector(QQ, {(3/2), -2, (1/10000000)});\n');
assert.equal(io.casExport(asset('lie',{family:'E6'},'simple'),'sage'),'cartan_type = CartanType(["E", 6])\n');
assert.equal(io.casExport(asset('cone',{ambientDimension:3}),'sage'),'C = Cone([], lattice=ZZ**3)\n');
assert.equal(io.casExport(asset('lattice',{ambientDimension:2,basisRows:[[1,2],[0,3]]}),'sage'),'from sage.modules.free_module_integer import IntegerLattice\nL = IntegerLattice(matrix(ZZ, [[1, 0], [2, 3]]), lll_reduce=False)\n','lattice columns must become Sage basis rows');
for (const a of [asset('category',{}),asset('functor',{}),asset('frame',{ambientDimension:3}),asset('sphere',{ambientDimension:3}),asset('young',{partition:'2,0,-1'},'generalized'),asset('lattice',{ambientDimension:2,basisRows:[[.5,0],[0,1]]}),{kind:'sheaf',type:'abstract',data:{}},{kind:'variety',type:'abstract',data:{}}]) {
  assert.deepEqual(io.casFormats(a),[]);
  for (const format of ['sage','macaulay2']) assert.throws(()=>io.casExport(a,format),/no supported native definition/);
}
assert.deepEqual(io.casFormats(asset('young',{partition:'3,2'},'partition')),['sage']);
assert.deepEqual(io.casFormats(asset('matrix',{})),['sage','macaulay2']);
assert.throws(()=>io.parse('{"schema":"other"}'),/supported/);
assert.throws(()=>io.parse('{"__proto__":{}}'),/Invalid backup property/);
const backup = {schema:io.schema,version:1,assets:[],panels:[],calculators:[],assetCards:{slots:[],instances:[]},workspace:{tabs:['assets'],panes:{primary:'assets',secondary:''},focusedPane:'primary',split:false,assets:{},inspectorOrder:[]}};
const options = {subtypes:{young:[['partition','Young']],frame:slicing.subtypes.frame},definitions:model.definitions,calculatorIds:[],nameKey:name=>name,validName:name=>!!name,normalize:model.normalize,references:()=>[]};
assert.deepEqual(io.validate(io.parse(JSON.stringify(backup)),options),backup);
const docked={id:'dock:workspace-io-card',source:'sidebar',key:'workspace-io-card',location:'main',canvasHeight:720};
assert.doesNotThrow(()=>io.validate({...backup,workspace:{...backup.workspace,dockedPanels:[docked],tabs:['assets',docked.id]}},options));
assert.throws(()=>io.validate({...backup,workspace:{...backup.workspace,dockedPanels:[docked]}},options),/conflicting saved location/);
assert.throws(()=>io.validate({...backup,workspace:{...backup.workspace,dockedPanels:[docked,docked]}},options),/duplicate docked panel/);
assert.throws(()=>io.validate({...backup,workspace:{...backup.workspace,dockedPanels:[{...docked,canvasHeight:NaN}]}},options),/Invalid saved docked panel/);
const young = {...asset('young',{partition:'3,2'},'partition'),name:'Y'};
assert.throws(()=>io.validate({...backup,assets:[young,young]},options),/duplicate asset ID/);
assert.throws(()=>io.validate({...backup,assets:[young],workspace:{...backup.workspace,tabs:['missing']}},options),/layout/);
assert.throws(()=>io.parse(JSON.stringify({...backup,version:2})),/supported/);
assert.throws(()=>io.validate({...backup,assets:[young]},{...options,references:()=>[{key:'young:missing',kind:'young'}]}),/missing or incompatible/);
assert.throws(()=>io.validate({...backup,assets:[young]},{...options,references:()=>[{key:'young:A1',kind:'young'}]}),/cycle/);
console.log('math_workspace_io_test: versioned backups, strict graphs, direct native constructors, supported formats and exact coordinates passed');
