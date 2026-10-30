'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
(async()=>{
 const server=await startServer();let session;
 try{
  session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
  const read=(fn,...args)=>evaluate(session.client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  await waitFor(()=>read(()=>!!window.MathWorkspaceAssetsTest&&!!window.MathWorkspaceObjectPanels),20000);
  const initial=await read(()=>{
   const api=MathWorkspaceAssetsTest,k=a=>a.kind+':'+a.id;
   const P=api.createObjectAsset('variety',{type:'projective',data:{dimension:'3'}});
   const E=api.createObjectAsset('sheaf',{type:'locally-free',data:{base:k(P),rank:'2'}});
   const F=api.createObjectAsset('sheaf',{type:'locally-free',data:{base:k(P),rank:'3'}});
   const sum=api.createObjectAsset('sheaf',{type:'direct-sum',data:{first:k(E),second:k(F)}});
   window.auditInput=MathWorkspaceObjectPanels.open('sheaf-input',k(sum),'main');
   window.inputSeeds={P,E,F,sum};
   const editor=auditInput.propertyRenderer?.editor;
   const ancestors=[];for(let n=editor?.shadow.querySelector('#input-card');n;n=n.parentElement)ancestors.push({tag:n.tagName,id:n.id,cls:n.className,hidden:n.hidden,display:getComputedStyle(n).display,height:n.getBoundingClientRect().height});
   return {message:auditInput.message.textContent,ancestors,hasRenderer:!!editor,hasGraph:!!editor?.objectIO('input-graph'),keys:editor?.objectIO('input-graph')?.entries.map(e=>({kind:e.kind,type:e.type,name:e.name,construction:e.data.workspaceSheafComplex.payload.construction})),inputVisible:editor?.shadow.querySelector('#input-card')?.getBoundingClientRect().height};
  });
  assert.ok(initial.hasGraph);assert.ok(initial.inputVisible>0);assert.equal(initial.message,'');
  const result=await read(()=>{
   const editor=auditInput.propertyRenderer.editor,root=editor.shadow;
   const payload=editor.objectIO('input-graph').entries.find(e=>e.assetKey===MathWorkspaceAssetsTest.assetKey(inputSeeds.sum)).data.workspaceSheafComplex.payload;
   return {construction:payload.construction,rank:payload.rank,controls:[...root.querySelectorAll('#input-card input,#input-card select,#input-card button')].map(n=>({id:n.id,value:n.value,disabled:n.disabled})),functions:['createProductVariety','createSelfSumSheafConstruction','createRecommendationsFromDraft'].map(name=>[name,typeof editor.environment.window[name]])};
  });
  assert.equal(result.construction.type,'direct-sum');assert.equal(result.rank,'5');
  await read(()=>{const api=MathWorkspaceAssetsTest;window.selfAsset=api.createObjectAsset('sheaf',{type:'self-direct-sum',data:{parent:api.assetKey(inputSeeds.E),multiplicity:'3'}});auditInput.computation.refs.asset=api.assetKey(selfAsset);MathWorkspaceObjectPanels.refresh();const count=auditInput.propertyRenderer.editor.shadow.querySelector('#sheaf-self-sum-count');count.focus();count.select();});
  await session.client.send('Input.insertText',{text:'1'});await session.client.send('Input.insertText',{text:'2'});
  const saved=await read(()=>{const editor=auditInput.propertyRenderer.editor;editor.shadow.querySelector('#add-object').click();const a=MathWorkspaceAssetsTest.localAssetSnapshot().assets.find(a=>a.id===selfAsset.id&&a.kind==='sheaf');return {data:a.data,message:auditInput.message.textContent};});
  assert.equal(saved.data.multiplicity,'12',saved.message);assert.ok(saved.data.workspaceSheafComplex?.payload?.construction);
  await read(()=>{
   const api=MathWorkspaceAssetsTest,k=api.assetKey;const Q=api.createObjectAsset('variety',{name:'ProductFactorQ',type:'projective',data:{dimension:'2'}});
   const editor=auditInput.propertyRenderer.editor,root=editor.shadow,select=(id,value)=>{const n=root.getElementById(id);n.value=value;n.dispatchEvent(new Event('change',{bubbles:true}));};
   select('input-mode','create');select('add-object-kind','combined');select('combined-type','product');
   const choose=(button,asset)=>{root.getElementById(button).click();const entry=editor.objectIO('input-graph').entries.find(e=>e.assetKey===k(asset));const label=root.querySelector('[data-object-kind="variety"][data-object-id="'+entry.nativeId+'"]');if(!label)throw Error('Missing pick label');label.click();};
   choose('product-factor-a',inputSeeds.P);choose('product-factor-b',Q);
  });
  await waitFor(()=>read(()=>!auditInput.propertyRenderer.editor.shadow.getElementById('add-object').disabled),5000);
  const combined=await read(()=>{
   const api=MathWorkspaceAssetsTest,editor=auditInput.propertyRenderer.editor,root=editor.shadow;root.getElementById('add-object').click();
   const snapshot=api.localAssetSnapshot(),products=snapshot.assets.filter(a=>a.kind==='variety'&&a.type==='product');
   const decode=v=>Array.isArray(v)?v.map(decode):v?.$kind==='object'?Object.fromEntries(v.entries.map(([k,x])=>[k,decode(x)])):v;const raw=decode(editor.capture().model),state=raw.state||raw;
   return {debug:Object.fromEntries(Object.entries(state).filter(([k])=>/product|inputMode|canvasPick|activeVariety/.test(k))),ui:['input-mode','add-object-kind','combined-type','add-object','product-factor-a','product-factor-b'].map(id=>({id,value:root.getElementById(id).value,text:root.getElementById(id).textContent.slice(0,60),disabled:root.getElementById(id).disabled})),products,projections:snapshot.assets.filter(a=>a.kind==='map'&&a.data.workspaceSheafComplex?.payload?.construction?.type==='projection').length,message:auditInput.message.textContent,nativeProducts:editor.objectIO('input-graph').entries.filter(e=>e.type==='product')};
  });
  assert.equal(combined.products.length,1,combined.message);assert.equal(combined.products[0].data.dimension,'5');assert.equal(combined.projections,2);
  const reopened=await read(()=>{auditInput.computation.signature='';MathWorkspaceObjectPanels.refresh();const graph=auditInput.propertyRenderer.editor.objectIO('input-graph');return graph.entries.find(e=>e.assetKey===MathWorkspaceAssetsTest.assetKey(selfAsset)).data.workspaceSheafComplex.payload;});
  assert.equal(reopened.construction.multiplicity,'12');assert.equal(reopened.rank,'24');
  const constructions=await read(()=>{
   const api=MathWorkspaceAssetsTest,k=api.assetKey,P=inputSeeds.P,E=inputSeeds.E,F=inputSeeds.F,Q=api.localAssetSnapshot().assets.find(a=>a.name==='ProductFactorQ');
   const f=api.createObjectAsset('map',{data:{domain:k(Q),codomain:k(P)}}),g=api.createObjectAsset('map',{data:{domain:k(P),codomain:k(Q)}});
   const cases={'tensor':{first:k(E),second:k(F)},'dual':{parent:k(E)},'self-tensor-product':{parent:k(E),multiplicity:'3'},'internal-hom':{first:k(E),second:k(E)},schur:{parent:k(E),partition:'2,1'},'map-operation':{map:k(f),parent:k(E),operation:'pullback'},'ideal-sheaf':{map:k(f),confirmed:true},'normal-bundle':{map:k(f),confirmed:true},'conormal-bundle':{map:k(f),confirmed:true},'relative-tangent':{map:k(g),confirmed:true},'relative-cotangent':{map:k(g),confirmed:true}};
   const results=[];
   for(const [type,data]of Object.entries(cases)){
    const a=api.createObjectAsset('sheaf',{type,data});auditInput.computation.refs.asset=k(a);MathWorkspaceObjectPanels.refresh();
    const native=auditInput.propertyRenderer.editor.objectIO('input-graph').entries.find(e=>e.assetKey===k(a));results.push({type,construction:native?.data.workspaceSheafComplex.payload.construction?.type,message:auditInput.message.textContent});
   }
   return results;
  });
  for(const row of constructions){assert.ok(row.construction,JSON.stringify(row));assert.equal(row.message,'',JSON.stringify(row));}
  await read(()=>{const n=auditInput.propertyRenderer.editor.shadow.getElementById('sheaf-name');n.focus();n.select();});
  await session.client.send('Input.insertText',{text:'RelativeSaved'});
  await waitFor(()=>read(()=>!auditInput.propertyRenderer.editor.shadow.getElementById('add-object').disabled),5000);
  const sequenceSave=await read(()=>{auditInput.propertyRenderer.editor.shadow.getElementById('add-object').click();return {message:auditInput.message.textContent,names:MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>a.name),sequences:MathWorkspaceAssetsTest.localAssetSnapshot().assets.filter(a=>a.kind==='complex').length};});
  assert.ok(sequenceSave.names.includes('RelativeSaved'),JSON.stringify(sequenceSave));assert.ok(sequenceSave.sequences>0);
  const changed=await read(()=>{const api=MathWorkspaceAssetsTest,record=api.localAssetSnapshot().assets.find(a=>a.id===selfAsset.id&&a.kind==='sheaf');api.updateObjectAsset(record,{data:{...record.data,multiplicity:'4'}});auditInput.computation.refs.asset=api.assetKey(record);MathWorkspaceObjectPanels.refresh();return auditInput.propertyRenderer.editor.objectIO('input-graph').entries.find(e=>e.assetKey===api.assetKey(record)).data.workspaceSheafComplex.payload;});
  assert.equal(changed.construction.multiplicity,'4');assert.equal(changed.rank,'8');
  assert.equal(await read(()=>!!document.querySelector('[data-assets-full-input]')),false);
  assert.notEqual(await read(()=>MathWorkspaceObjects.capabilityFor(inputSeeds.P).modify),'sheaf-input');
  console.log('Restored Input: ranks, real editing, Assets save, product/projections and reopening passed.');
 }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
