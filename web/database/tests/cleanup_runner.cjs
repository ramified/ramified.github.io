'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..'),repo=path.resolve(site,'../..');
const dot=path.join(repo,'.git'),gitDir=fs.statSync(dot).isDirectory()?dot:path.resolve(repo,fs.readFileSync(dot,'utf8').trim().replace(/^gitdir:\s*/,''));
assert.equal(fs.readFileSync(path.join(gitDir,'HEAD'),'utf8').trim(),'ref: refs/heads/cleanup','Must stop: not on cleanup branch');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'cleanup_paths.json'),'utf8'));
const h=require(path.join(site,config.browserHelper));
fs.rmSync=p=>console.log('Deletion suppressed: '+p);
const record=process.argv.includes('--record'),label=process.argv.find(x=>x.startsWith('--label='))?.slice(8)||'check';
const golden=path.join(__dirname,'cleanup_baseline.json');

const expected={
  "slice": [
    {
      "kind": "circle",
      "radius": 1
    },
    {
      "kind": "empty"
    }
  ],
  "young": [
    {
      "boxes": "5",
      "standardTableaux": "5",
      "conjugate": "(2, 2, 1)"
    },
    {
      "boxes": "3",
      "standardTableaux": "2",
      "conjugate": "(2, 1)"
    }
  ],
  "double-young": [
    [
      [
        [
          4
        ],
        1
      ],
      [
        [
          2,
          2
        ],
        1
      ]
    ],
    [
      [
        [
          2
        ],
        1
      ]
    ]
  ],
  "production": [
    {
      "title": "How Young Diagram² Calculator was made",
      "algorithms": true
    },
    {
      "summary": true,
      "lessons": true
    }
  ],
  "dynkin": [
    [
      [
        2,
        -1
      ],
      [
        -1,
        2
      ]
    ],
    [
      [
        2,
        -1,
        0
      ],
      [
        -1,
        2,
        -1
      ],
      [
        0,
        -1,
        2
      ]
    ]
  ],
  "strand": [
    [
      3,
      2,
      1
    ],
    [
      1,
      2,
      3
    ]
  ],
  "matrix": [
    {
      "rank": "2",
      "trace": "5",
      "determinant": "-2"
    },
    {
      "rank": "2",
      "trace": "2",
      "determinant": "1"
    }
  ],
  "sheaf": [
    [
      "3",
      "0"
    ],
    [
      "0",
      "1"
    ]
  ],
  "complex": [
    [
      "0",
      "0",
      "1"
    ],
    [
      "27",
      "0",
      "0"
    ]
  ],
  "mosaic": [
    {
      "group": "Z^2",
      "freeRank": 2
    },
    {
      "freeRank": 0,
      "torsion": []
    }
  ],
  "category": [
    {
      "opposite": true,
      "label": "C"
    },
    {
      "opposite": false,
      "label": "D"
    }
  ],
  "ramification": [
    {
      "behavior": "ramified",
      "components": [
        [
          2,
          1
        ]
      ]
    },
    {
      "behavior": "inert",
      "components": [
        [
          1,
          2
        ]
      ]
    }
  ]
};
async function browserCase(id,variant=0){
 const api=MathWorkspaceAssetsTest,panels=MathWorkspaceObjectPanels,k=api.assetKey,temporary=[];
 function mount(family){
  const host=document.createElement('section'),inspectorHost=document.createElement('section');document.body.append(host,inspectorHost);
  const e=MathWorkspaceNativeEditors.factories[family].mount(host,{id:'baseline-'+family,inspectorHost});temporary.push({e,host,inspectorHost});return e;
 }
 const snapshot=e=>{const model=MathWorkspaceNativeEditors.decodeState(e.capture().model);return model.state||model;};
 const add=(kind,type,data,name)=>api.createObjectAsset(kind,{type,data,...(name?{name}:{})});
 try{
  if(id==='slice'){
   const frame=add('frame','frame',{ambientDimension:3,position:variant?[0,0,2]:[0,0,0],basis:[[1,0,0],[0,1,0],[0,0,1]]});
   const sphere=add('sphere','sphere',{ambientDimension:3,center:[0,0,0],radius:1});
   const p=panels.open('slicing-scene',k(sphere),'side');p.computation.refs.frame=k(frame);panels.refresh();
   const s=p.propertyRenderer.editor.readObjectResult().objects.find(o=>o.asset===k(sphere)).slice;
   return variant?{kind:s.kind}:{kind:s.kind,radius:s.radius};
  }
  if(id==='young'){
   const a=add('young','partition',{rows:variant?[2,1]:[3,2]});const p=panels.open('statistics',k(a),'side'),d=p.propertyRenderer.editor.environment.document;
   return {boxes:d.getElementById('out-size').textContent,standardTableaux:d.getElementById('out-nstand').textContent,conjugate:d.getElementById('out-conj').textContent};
  }
  if(id==='double-young'){const e=mount(id);return e.environment.window.__dbg.decomposePlethysm(variant?[1]:[2],[2]).map(t=>[t.nu,t.coefficient]);}
  if(id==='production'){const e=mount(id);return variant?{summary:[...e.shadow.querySelectorAll('h2')].some(n=>n.textContent.trim()==='Project summary'),lessons:[...e.shadow.querySelectorAll('h2')].some(n=>n.textContent.trim()==='Corrections and lessons learned')}:{title:e.shadow.querySelector('h1').textContent.trim(),algorithms:[...e.shadow.querySelectorAll('h2')].some(n=>n.textContent.trim()==='Mathematical and computational algorithms')};}
  if(id==='dynkin'){const a=add('lie','simple',{family:'A',rank:variant?3:2});return panels.open('lie-view',k(a),'side').propertyRenderer.editor.readObjectResult().cartan;}
  if(id==='strand'){const e=mount(id);return e.environment.window.StrandMath.permutationFromWord(3,variant?[1,1]:[1,2,1]);}
  if(id==='matrix'){
   const a=add('matrix','matrix',{rows:2,cols:2,entries:variant?[['1','0'],['0','1']]:[['1','2'],['3','4']],dataType:'rational'});
   const d=panels.open('matrix-invariants',k(a),'side').propertyRenderer.editor.environment.document;
   return {rank:d.getElementById('out-rank').textContent,trace:d.getElementById('out-trace').textContent,determinant:d.getElementById('out-det').textContent};
  }
  if(id==='sheaf'||id==='complex'){
   const p=add('variety','projective',{dimension:id==='sheaf'?'1':'2'});let target;
   if(id==='sheaf')target=add('sheaf','twist',{base:k(p),twist:variant?'-2':'2'});
   else{const o=add('sheaf',variant?'tangent':'cotangent',{base:k(p)});target=add('sheaf','schur',{parent:k(o),partition:variant?'2':'1,1'});}
   const e=mount(id);
   if(id==='complex')e.applyAssets(api.localAssetSnapshot(),{kind:target.kind,id:target.id});
   else{
    const saved=e.capture(),model=MathWorkspaceNativeEditors.decodeState(saved.model),state=model.state;
    state.varieties=[{id:'P1',type:'projective',dim:'1',name:'P',nameDirty:true}];
    state.sheaves=[{id:'L',type:'twist',twist:variant?'-2':'2',rank:'1',basis:'chern',name:'L',baseVarietyId:'P1',nameDirty:true}];
    state.activeVarietyId='P1';state.activeSheafId='L';
    e.restore({...saved,model:MathWorkspaceNativeEditors.encodeState(model)});
   }
   e.setCardVisible('cohomology-card',true);e.focusAssetCard('cohomology-card');
   for(let i=0;i<30&&!snapshot(e).lastResult;i++)await new Promise(resolve=>setTimeout(resolve,100));
   const c=snapshot(e).lastResult.cohomology;return c.dimensions?.map(x=>x.plain)||{message:c.message};
  }
  if(id==='mosaic'){
   const e=mount(id),calculator=e.environment.window.MosaicCalculator;calculator.__test.setTestBoard({rows:2,cols:2,lattice:'square',boundary:variant?'free':'glued',removedTiles:[1,2,3],gluedEdges:variant?[]:[{first:{index:0,dir:0},second:{index:0,dir:2},reversed:false},{first:{index:0,dir:1},second:{index:0,dir:3},reversed:false}]});const r=calculator.analyzeBackgroundHomology();return variant?{freeRank:r.freeRank,torsion:r.torsion.map(String)}:{group:r.group,freeRank:r.freeRank};
  }
  if(id==='category'){
   const c=add('category','category',{objectSymbol:'X',opposite:!variant},variant?'D':'C');const e=mount(id);e.configureObjectPanel({mode:'input',operation:'category-input'});e.applyAssets(api.localAssetSnapshot(),{kind:c.kind,id:c.id});const r=snapshot(e).categories.find(a=>a.id===k(c));return {opposite:r.opposite,label:r.label};
  }
  if(id==='ramification'){
   const e=mount(id),r=e.environment.window.RamificationLocalEngine.compute({schemaVersion:1,base:{kind:'Q'},extension:{kind:'polynomial',generator:'alpha',polynomial:'x^2-2'},selection:{bound:7,includeInfinite:false}});
   const p=r.places.find(p=>p.id===(variant?'Q:3':'Q:2'));return {behavior:p.behavior,components:p.components.map(c=>[c.e,c.f])};
  }
 }finally{for(const {e,host,inspectorHost}of temporary){e.dispose();host.remove();inspectorHost.remove();}}
}
async function workerCase(){
 const host=document.createElement('section'),inspectorHost=document.createElement('section');document.body.append(host,inspectorHost);
 const e=MathWorkspaceNativeEditors.factories.mosaic.mount(host,{id:'baseline-worker',inspectorHost});
 let worker;
 try{
  const t=e.environment.window.MosaicCalculator.__test;
  t.setTestBoard({rows:2,cols:2,lattice:'square',boundary:'glued',removedTiles:[1,2,3],gluedEdges:[{first:{index:0,dir:0},second:{index:0,dir:2},reversed:false},{first:{index:0,dir:1},second:{index:0,dir:3},reversed:false}]});
  worker=new e.environment.Worker('js/background_homology_worker.js');
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timeout')),15000);worker.onmessage=event=>{clearTimeout(timer);resolve(event.data)};worker.onerror=event=>{clearTimeout(timer);reject(Error(event.message))};worker.postMessage({id:7,snapshot:t.backgroundHomologySnapshot()});});
  return {ok:result.ok,id:result.id,group:result.analysis?.group,freeRank:result.analysis?.freeRank};
 }finally{worker?.terminate();e.dispose();host.remove();inspectorHost.remove();}
}

(async()=>{
 const server=await h.startServer();let session;
 const result={version:1,outputs:{},consoleErrors:[],metrics:{},network:[]};
 try{
  session=await h.launchBrowser('about:blank');const c=session.client;
  await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true});
  const origin='http://127.0.0.1:'+server.address().port;
  const clean=text=>String(text).replaceAll(origin,'[origin]').replace(/blob:\[origin\]\/[\w-]+/g,'blob:[worker]');
  c.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')result.consoleErrors.push(clean(m.params.exceptionDetails.exception?.description?.split('\n')[0]||m.params.exceptionDetails.text));if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')result.consoleErrors.push(clean(m.params.args.map(a=>a.value||a.description).join(' ')));if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')result.consoleErrors.push(clean(m.params.entry.text+' '+(m.params.entry.url||'')));});
  const read=(fn,...args)=>h.evaluate(c,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  const ready=()=>h.waitFor(()=>h.evaluate(c,'!!window.MathWorkspaceObjectPanels'),45000,'workspace ready');
  await c.send('Page.navigate',{url:origin+'/math_workspace.html'});await ready();
  result.metrics.interfaceReady=await h.evaluate(c,'performance.now()');
  await h.waitFor(()=>h.evaluate(c,"document.readyState==='complete'"),45000);
  const resources=await read(()=>{const n=performance.getEntriesByType('navigation')[0],r=performance.getEntriesByType('resource');return{network:r.map(x=>({url:x.name.replace(location.origin,'[origin]'),encoded:x.encodedBodySize,transfer:x.transferSize})),transfer:n.transferSize+r.reduce((s,x)=>s+x.transferSize,0),body:n.encodedBodySize+r.reduce((s,x)=>s+x.encodedBodySize,0)}});
  result.network=resources.network;result.metrics.transferBytes=resources.transfer;result.metrics.bodyBytes=resources.body;
  for(const id of Object.keys(expected))for(let variant=0;variant<2;variant++){
   const name=id+':'+variant,value=await read(browserCase,id,variant);assert.deepEqual(value,expected[id][variant],name);result.outputs[name]=value;console.log('PASS '+name);
  }
  result.outputs.worker=await read(workerCase);assert.deepEqual(result.outputs.worker,{ok:true,id:7,group:'Z^2',freeRank:2});
  await c.send('Page.reload');await ready();
  const flow=await read(()=>{
   const api=MathWorkspaceAssetsTest,p=MathWorkspaceObjectPanels,a=api.createObjectAsset('variety',{type:'projective',name:'P',data:{dimension:'1'}});
   api.bindAssetInputInstance(a);return{ref:{kind:a.kind,id:a.id}};
  });
  await read(()=>{const input=document.querySelector('[data-assets-name]');input.focus();input.select()});
  await c.send('Input.insertText',{text:'P_saved'});
  await h.waitFor(()=>read(()=>MathWorkspaceAssetsTest.activeAssetInputInstance().autosaveStatus==='Saved'),5000,'autosave');
  const saved=await read(()=>MathWorkspaceObjectPanels.exportText('workspace'));
  await c.send('Page.reload');await ready();await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),saved);
  result.outputs.saveRefreshRestore=await read(ref=>{const a=MathWorkspaceAssetsTest.localAssetSnapshot().assets.find(a=>a.kind===ref.kind&&a.id===ref.id);return{name:a.name,dimension:a.data.dimension,draft:MathWorkspaceAssetsTest.activeAssetInputInstance().draft.name}},flow.ref);
  assert.deepEqual(result.outputs.saveRefreshRestore,{name:'P_saved',dimension:'1',draft:'P_saved'});
  const backup=await read(()=>{
   const api=MathWorkspaceAssetsTest,p=MathWorkspaceObjectPanels;
   const c=api.createObjectAsset('category',{name:'C',data:{objectSymbol:'X',opposite:true}});
   p.open('category-input',api.assetKey(c),'side');
   api.openCanvas('mosaic');api.closeCanvas('mosaic');
   window.__backupAssets=api.localAssetSnapshot().assets.map(a=>({kind:a.kind,id:a.id,type:a.type,name:a.name,data:a.data,dependencies:a.dependencies}));
   return{text:p.exportText('workspace'),assets:window.__backupAssets,category:c.id};
  });
  await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),backup.text);
  const samePage=await read(()=>MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>({kind:a.kind,id:a.id,type:a.type,name:a.name,data:a.data,dependencies:a.dependencies})));
  assert.deepEqual(samePage,backup.assets);
  await c.send('Page.reload');await ready();
  await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),backup.text);
  const restored=await read(()=>MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>({kind:a.kind,id:a.id,type:a.type,name:a.name,data:a.data,dependencies:a.dependencies})));
  assert.deepEqual(restored,backup.assets);
  result.outputs.backupRoundtrip=await read(id=>{const a=MathWorkspaceAssetsTest.localAssetSnapshot().assets.find(a=>a.id===id);const panel=[...MathWorkspaceObjectPanels.panels.values()].find(p=>p.definition.id==='category-input');return{category:a.name,opposite:a.data.opposite,formulaProjected:!!panel?.activeRenderer?.editor,savedMosaic:MathWorkspaceAssetsTest.sessions.has('mosaic')}},backup.category);
  assert.deepEqual(result.outputs.backupRoundtrip,{category:'C',opposite:true,formulaProjected:true,savedMosaic:true});
  await c.send('Page.reload');await ready();
  await c.send('Fetch.enable',{patterns:[{urlPattern:'*cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js',requestStage:'Request'}]});
  c.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Fetch.requestPaused')setTimeout(()=>c.send('Fetch.continueRequest',{requestId:m.params.requestId}).catch(()=>{}),2500)});
  await c.send('Page.reload');await ready();result.metrics.delayedMathJaxReady=await h.evaluate(c,'performance.now()');
  result.metrics.interfaceBeforeMathJax=await read(()=>!window.MathJax?.typesetPromise);
  assert.equal(result.metrics.interfaceBeforeMathJax,true,'Interface available during the forced MathJax delay');
  await read(()=>{
    const api=MathWorkspaceAssetsTest,a=api.createObjectAsset('variety',{type:'projective',name:'Q_{early}',data:{dimension:'2'}});
    api.bindAssetInputInstance(a);
    const host=document.createElement('section'),inspectorHost=document.createElement('section');document.body.append(host,inspectorHost);
    const editor=MathWorkspaceNativeEditors.factories.young.mount(host,{id:'early-mathjax',inspectorHost});
    const formula=document.createElement('span');formula.textContent='\\(\\Omega^2\\)';editor.shadow.querySelector('.editor-body').append(formula);
    window.__earlyMath={editor,host,inspectorHost,formula};
    const field=document.querySelector('[data-assets-name]');field.focus();field.select();
  });
  await c.send('Input.insertText',{text:'Q_{early} '});
  await read(()=>{const field=document.querySelector('[data-assets-name]');field.setSelectionRange(2,2);window.__earlyDraft={value:field.value,selection:field.selectionStart};});
  await h.waitFor(()=>h.evaluate(c,'!!window.MathJax?.typesetPromise'),45000,'MathJax loaded');
  await read(async()=>{await MathJax.startup.promise;});
  await h.waitFor(()=>read(()=>!!__earlyMath.formula.querySelector('mjx-container')),10000,'late shadow formula rendered');
  assert.equal(await read(()=>!!__earlyMath.formula.querySelector('mjx-merror,[data-mjx-error]')),false,'Late shadow formula has no rendering error');
  assert.deepEqual(await read(()=>{const f=document.querySelector('[data-assets-name]');return{value:f.value,selection:f.selectionStart}}),await read(()=>__earlyDraft),'MathJax preserves focused draft and selection');
  await read(()=>{__earlyMath.editor.dispose();__earlyMath.host.remove();__earlyMath.inspectorHost.remove();});
  result.outputs.formula=await read(async()=>{await MathJax.startup.promise;const n=document.createElement('div');n.textContent='\\(\\frac{1}{2}+\\Omega^2\\)';document.body.append(n);await MathJax.typesetPromise([n]);const r={rendered:!!n.querySelector('mjx-container'),errors:!!n.querySelector('mjx-merror,[data-mjx-error]')};n.remove();return r;});
  assert.deepEqual(result.outputs.formula,{rendered:true,errors:false});
  result.consoleErrors=[...new Set(result.consoleErrors)].sort();
  result.metrics.bundleBytes=fs.statSync(path.join(site,config.bundle)).size;
  result.environment={node:process.version,browser:(await c.send('Browser.getVersion')).product};
  if(record){assert(!fs.existsSync(golden),'Baseline already exists; never overwrite');fs.writeFileSync(golden,JSON.stringify(result,null,2)+'\n');}
  else{
   const before=JSON.parse(fs.readFileSync(golden,'utf8'));assert.deepEqual(result.outputs,before.outputs,'Exact baseline outputs');
   const extra=result.consoleErrors.filter(x=>!before.consoleErrors.includes(x));assert.deepEqual(extra,[],'No new console errors');
  }
  const target=path.join(__dirname,'results',label+'.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',outputs:Object.keys(result.outputs).length,consoleErrors:result.consoleErrors,metrics:result.metrics,result:target}));
 }finally{
  if(session){session.client.close();session.browser.kill();console.log('Profile retained: '+session.profile);}
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1});

