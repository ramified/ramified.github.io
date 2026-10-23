'use strict';
const assert=require('node:assert/strict'),mosaic=require('./math_workspace_mosaic.js'),objects=require('./math_workspace_objects.js'),defaults=require('./math_workspace_defaults.js');
const space={kind:'mosaic-space',id:'S1',data:mosaic.normalize('mosaic-space')};
const diagram={kind:'mosaic-diagram',id:'D1',data:mosaic.fromPayload('mosaic-diagram',{...space.data,diagramType:'dual',tiles:[{row:1,col:1,tile:null},{row:2,col:2,tile:{type:'vertex',edges:[0,3]},decoration:2}],view:{scale:3},display:{showCoords:true}},'mosaic-space:S1')};
assert.equal(diagram.data.tiles.length,1);assert.equal(diagram.data.tiles[0].decoration,2);
assert.equal(diagram.data.view,undefined);assert.equal(diagram.data.display,undefined);
assert.deepEqual(mosaic.issues(diagram,[space]),[]);
assert(mosaic.issues(diagram,[]).length);
const changed={...space,data:{...space.data,rows:6}},before=JSON.stringify(diagram);
assert(mosaic.issues(diagram,[changed]).length);assert.equal(JSON.stringify(diagram),before);
assert(mosaic.issues(diagram,[{...space,data:{...space.data,removedTiles:[{row:2,col:2}]}}]).length);
assert.throws(()=>mosaic.payload(diagram,[changed]));
assert.equal(mosaic.payload(diagram,[space]).tiles[0].decoration,2);
assert.throws(()=>mosaic.normalize('mosaic-space',{rows:1}));
assert.throws(()=>mosaic.normalize('mosaic-diagram',{tiles:[{row:0,col:1,tile:[]}]}));
assert.equal(defaults.assetData('mosaic-diagram','mosaic-diagram',{},kind=>{assert.equal(kind,'mosaic-space');return space;}).space,'mosaic-space:S1');
for(const kind of mosaic.kinds){assert(objects.inputKinds.includes(kind));assert.equal(objects.capabilityFor({kind}).open,'mosaic-view');}
const context=objects.contextFor({type:'mosaic-statistics',refs:{asset:'mosaic-diagram:D1'}},[diagram,space]);
assert.equal(context.objects.asset.id,'S1');assert.deepEqual(context.missing,[]);
assert.equal(context.signature,objects.contextFor({type:'mosaic-statistics',refs:{asset:'mosaic-space:S1'}},[diagram,space]).signature,'background properties depend only on the shared space');
for(const property of mosaic.propertyPanels){
  const definition=objects.definitions.find(d=>d.id===property.id);
  assert.equal(definition.slots[0].kind,property.owner);
}
const pieces={...diagram,data:mosaic.fromPayload('mosaic-diagram',{...space.data,pieces:[{row:2,col:2,kind:'king',color:'white'}]},'mosaic-space:S1')};
assert(mosaic.issues(pieces,[changed]).length,'grid changes invalidate piece-only diagrams without deleting pieces');
assert(mosaic.issues(pieces,[{...space,data:{...space.data,removedTiles:[{row:2,col:2}]}}]).length,'removed occupied tiles invalidate piece-only diagrams');
assert.deepEqual(mosaic.issues(pieces,[space]),[]);
assert.deepEqual(Object.keys(mosaic.fromPayload('mosaic-space',{...space.data,pieces:pieces.data.pieces})).filter(key=>key==='pieces'),[],'space cannot own decorations');
console.log('PASS Mosaic model: topology/diagram separation, sparse tiles, marked vertices, defaults, dependency closure and lossless invalidation');
