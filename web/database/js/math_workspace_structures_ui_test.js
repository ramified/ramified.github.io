'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){const server=await startServer();let session;
try{
 session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
 const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
 await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
 await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.c=api.createObjectAsset('complex');window.cv=panels.open('complex-view','complex:'+c.id,'main');window.ci=panels.open('complex-input','complex:'+c.id,'side');});
 assert.equal(await read(()=>cv.computation.status),'current');
 assert(await read(()=>cv.propertyRenderer.editor.shadow.querySelector('.workspace-complex-display').textContent.includes('not verified')));
 assert.equal(await read(()=>ci.structureRows.length),5);
 await read(()=>ci.structureControls.startDegree.focus());
 const selectAll=async()=>{await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});};
 await selectAll();await client.send('Input.insertText',{text:'3'});await selectAll();
 await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
 await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
 assert.equal(await read(()=>ci.structureControls.startDegree.value),'');
 assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===c.id).data.startDegree),3,'empty degree drafts preserve the valid model');
 await client.send('Input.insertText',{text:'0'});
 await read(()=>{ci.structureRows[0].symbol.focus();});
 await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
 await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
 await client.send('Input.insertText',{text:'E '});
 assert.equal(await read(()=>ci.structureRows[0].symbol.value),'E ');
 assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===c.id).data.objects[0].symbol),'E ');
 await read(()=>{window.e=api.createObjectAsset('field-extension',{data:{polynomial:'x^2-3'}});window.ev=panels.open('field-extension-view','field-extension:'+e.id,'main');window.ei=panels.open('field-extension-input','field-extension:'+e.id,'side');});
 assert(await read(()=>ev.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]')));
 await read(()=>ev.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]').click());
 await waitFor(()=>read(()=>ev.propertyRenderer.editor.readObjectResult()?.hasResult),30000);
 assert(await read(()=>JSON.parse(ev.propertyRenderer.editor.objectIO('extension-export')).base.kind==='Q'));
 if(process.env.WORKSPACE_TEST_SCREENSHOT){const shot=await client.send('Page.captureScreenshot',{format:'png'});require('node:fs').writeFileSync(process.env.WORKSPACE_TEST_SCREENSHOT,Buffer.from(shot.data,'base64'));}
 await read(()=>{window.ep=panels.open('field-extension-decomposition','field-extension:'+e.id,'side');});
 assert(await read(()=>ep.propertyRenderer.editor.shadow.querySelector('.workspace-native-content #decomposition-table')));
 await read(()=>ep.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]').click());
 await waitFor(()=>read(()=>ep.propertyRenderer.editor.readObjectResult()?.hasResult),30000);
 assert(await read(()=>ep.propertyRenderer.editor.objectIO('extension-export').includes('x^2-3')),'property panels compute from the bound definition');
 await read(()=>{window.ops=panels.open('complex-operations','complex:'+c.id,'main');});
 assert(await read(()=>ops.propertyRenderer.editor.shadow.querySelector('[data-save-complex-results]')));
 await read(()=>{window.savedComplex=api.localAssetSnapshot().assets.find(a=>a.id===c.id).data;api.updateObjectAsset(c,{data:{...savedComplex,objects:[{symbol:'层',ref:''},...savedComplex.objects.slice(1)]}});});
 assert(await read(()=>cv.propertyRenderer.editor.shadow.querySelector('.workspace-complex-display').textContent.includes('层')),'unsupported notation preserves a readable label');
 assert.match(await read(()=>ops.propertyRenderer.editor.shadow.querySelector('.workspace-complex-display').textContent),/outside the legacy operation engine/);
 await read(()=>api.updateObjectAsset(c,{data:savedComplex}));
 await read(()=>{
   const editor=ops.propertyRenderer.editor,find=id=>editor.shadow.querySelector(id)||editor.inspectorShadow.querySelector(id);
   find('#complex-chart-import-input').value=JSON.stringify({schema:'sheaf-complex-calculator-complex-chart',version:1,entries:[{id:'derived-complex',kind:'chain-complex',length:2,objects:['R','S'],maps:['g'],selected:true}]});
   find('#complex-chart-import-apply').click();
   editor.shadow.querySelector('[data-save-complex-results]').click();
 });
 assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='complex'&&a.data.legacy?.id==='derived-complex')),'operation results can become independent Assets');
 await read(()=>{
   api.openCanvas('sheaf-complexes');window.legacy=api.sessions.get('sheaf-complexes').editor;
   legacy.inspectorShadow.querySelector('#complex-chart-import-input').value=JSON.stringify({schema:'sheaf-complex-calculator-complex-chart',version:1,entries:[{id:'legacy-complex',kind:'chain-complex',length:2,objects:['P','Q'],maps:['f'],selected:true},{id:'legacy-filtration',kind:'filtration',length:2,objects:['U','V'],quotients:['W'],selected:true}]});
   legacy.inspectorShadow.querySelector('#complex-chart-import-apply').click();
   legacy.inspectorShadow.querySelector('[data-save-complex-assets]').click();
 });
 assert.equal(await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='complex'&&a.data.legacy?.id==='legacy-complex').length),1);
 await read(()=>legacy.inspectorShadow.querySelector('[data-save-complex-assets]').click());
 assert.equal(await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='complex'&&a.data.legacy?.id==='legacy-complex').length),1,'repeat migration updates instead of duplicating');
 assert.equal(await read(()=>legacy.objectIO('complex-entries').length),2,'legacy filtration and complex are preserved');
 await read(()=>{window.nf=api.createObjectAsset('field',{data:{dataType:'number-field',numberFieldPolynomial:'x^2-3'}});window.nv=panels.open('field-view','field:'+nf.id,'main');[...nv.renderArea.querySelectorAll('button')].find(b=>b.textContent==='Ramification over ℚ').click();});
 assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='field-extension'&&a.data.target==='field:'+nf.id&&a.data.polynomial==='x^2-3')));
 const backup=await read(()=>panels.exportText('workspace'));
 await read(text=>panels.importText('workspace',text),backup);
 assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='complex'&&a.data.objects[0].symbol==='E ')));
 assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='field-extension'&&a.data.base)));
 console.log('PASS complex display/operations, draft preservation, extension computation/properties, legacy migration, number-field shortcut and backup restore');
}finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});



