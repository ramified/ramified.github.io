// Convert the standalone Mosaic knot catalog into background-free workspace data.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
require('./math_workspace/sources/js/mosaic_knot_engine.js');
const source=fs.readFileSync(path.join(directory,'mosaic_calculator.js'),'utf8');
const start=source.indexOf('  const KNOT_PRESETS = '),end=source.indexOf('  const DUAL_GRAPH_PRESETS = ',start);
if(start<0||end<0)throw new Error('Cannot locate the Mosaic knot preset catalog.');
const literal=source.slice(start+'  const KNOT_PRESETS = '.length,end).trim().replace(/;$/,'');
const catalog=vm.runInNewContext('('+literal+')',{}, {timeout:1000});
const records=catalog.map(({id,label,payload})=>{
  const diagram=globalThis.MosaicKnotEngine.buildDiagram({...payload,wrapped:false});
  if(!diagram.ok)throw new Error(id+': '+diagram.error);
  return {id,label,data:{pd:diagram.pdEntries,circles:diagram.components.filter(c=>!c.occurrences.length).length}};
});
const output='// Generated from mosaic_calculator.js KNOT_PRESETS. Run node js/build_math_workspace_topology_presets.mjs.\n'+
  '(function(root){\n  const presets='+JSON.stringify(records,null,2)+';\n  if(typeof module!==\'undefined\'&&module.exports)module.exports=presets;else root.MathWorkspaceTopologyPresetData=presets;\n})(typeof window!==\'undefined\'?window:globalThis);\n';
const target=path.join(directory,'math_workspace_topology_preset_data.js');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output)throw new Error('Stale topology presets; run node js/build_math_workspace_topology_presets.mjs.');}
else fs.writeFileSync(target,output);
console.log('Workspace topology presets: '+records.length+' Mosaic knot / link examples');
