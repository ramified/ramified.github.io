'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const topology=require('./math_workspace_topology.js'),mosaic=require('./math_workspace_mosaic.js'),ops=require('./math_workspace_knot_operations.js');
const source=fs.readFileSync(path.join(__dirname,'mosaic_calculator.js'),'utf8'),start=source.indexOf('  const KNOT_PRESETS = '),end=source.indexOf('  const DUAL_GRAPH_PRESETS = ',start);
const catalog=JSON.parse(JSON.stringify(vm.runInNewContext('('+source.slice(start+'  const KNOT_PRESETS = '.length,end).trim().replace(/;$/,'')+')')));
function fixture(payload){
  const space={kind:'mosaic-space',id:'S',data:mosaic.normalize('mosaic-space',{...payload,boundary:'grid'})};
  const sparse=payload.tiles.flatMap((tile,index)=>tile?.length?[{row:Math.floor(index/payload.cols)+1,col:index%payload.cols+1,tile}]:[]);
  const diagram={kind:'mosaic-diagram',id:'D',data:mosaic.fromPayload('mosaic-diagram',{...payload,tiles:sparse},'mosaic-space:S')};
  const knot={kind:'knot',id:'K',data:topology.normalize('knot',{...topology.fromMosaic('knot',diagram,[space,diagram]),source:'mosaic-diagram:D',hasSnapshot:true})};return {space,diagram,knot};
}
function multiFixture(){
  const tiles=Array.from({length:25},()=>null),put=(r,c,t)=>{tiles[(r-1)*5+c-1]=t;};
  put(3,3,[[0,3],[1,4],[2,5]]);put(3,4,[[3,2]]);put(4,3,[[4,5]]);put(4,2,[[5,4]]);put(3,2,[[0,1]]);put(2,2,[[1,0]]);put(2,3,[[2,3]]);
  return fixture({rows:5,cols:5,lattice:'hexagonal',diagramType:'link',tiles});
}
function run(){
  for(const preset of topology.presets.knot){
    assert.equal(ops.simplify(preset.data).removed,0,preset.label+' is already locally reduced');
    for(let i=0;i<preset.data.pd.length;i++)assert.equal(topology.knotInfo(ops.flip(preset.data,i)).componentCount,topology.knotInfo(preset.data).componentCount);
  }
  const trefoil=topology.presets.knot.find(p=>p.id==='trefoil'),hopf=topology.presets.knot.find(p=>p.id==='hopf-link');
  for(let i=0;i<3;i++)assert.deepEqual(ops.simplify(ops.flip(trefoil.data,i)).data,{source:'',pd:[],circles:1});
  assert.deepEqual(ops.simplify(ops.flip(hopf.data,0)).data,{source:'',pd:[],circles:2});
  for(const preset of catalog){
    const {space,diagram,knot}=fixture(preset.payload),assets=[space,diagram,knot],before=JSON.stringify(assets);
    for(let i=0;i<knot.data.pd.length;i++)assert.equal(ops.prepareMosaicFlip(knot,assets,i).ok,true,preset.id+' crossing '+i);
    assert.equal(JSON.stringify(assets),before,'planning a sync is read-only');
  }
  const multi=multiFixture(),assets=Object.values(multi);assert.equal(multi.knot.data.pd.length,3);
  assert.equal(ops.prepareMosaicFlip(multi.knot,assets,1).ok,false,'reversing nonadjacent tile layers would change other crossings');
  assert.equal(ops.prepareMosaicFlips(multi.knot,assets,[1,0]).ok,true,'combined changes can become expressible as a tile layer order');
  const changed={...multi.knot,data:ops.flip(multi.knot.data,0)};assert.equal(ops.prepareMosaicFlip(changed,assets,0).ok,false,'outdated correspondence cannot write to source');
  console.log('PASS crossing flips, R1/R2 reductions, all Mosaic preset syncs, multi-crossing rejection and mutation-free planning');
}
if(require.main===module)run();module.exports={catalog,fixture,multiFixture};
