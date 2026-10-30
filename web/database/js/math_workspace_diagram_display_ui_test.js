'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){const server=await startServer();let session;
try{
  session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
  const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
  await read(()=>{
    window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;
    window.c=api.createObjectAsset('complex');window.f=api.createObjectAsset('filtration',{data:{quotients:['\\frac{H^0(X,F)}{H^1(X,G)}','\\frac{\\frac{A}{B}}{\\frac{C}{D}}']}});
    window.p=panels.open('complex-diagrams','complex:'+c.id,'main');
    window.shared=panels.open('complex-diagrams','filtration:'+f.id,'main');
    window.editor=p.propertyRenderer.editor;window.find=sel=>editor.shadow.querySelector(sel)||editor.inspectorShadow.querySelector(sel);
  });
  assert.equal(await read(()=>shared===p),true,'opening another filtration adds it to the common display');
  assert.equal(await read(()=>[...panels.panels.values()].filter(p=>p.definition.structureScene).length),1);
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),2);
  assert.equal(await read(()=>find('#complex-chart-delete').textContent),'remove');
  assert.equal(await read(()=>!!find('[data-diagram-action="clear"]')),false,'remove is the single removal action');
  await waitFor(()=>read(()=>!!find('[data-diagram-asset="filtration:'+f.id+'"] .sheaf-filtration-quotient mjx-container')),20000);
  const formulaFits=()=>{
    const row=find('[data-diagram-asset="filtration:'+f.id+'"]'),formula=row.querySelector('.sheaf-step-saved-rule-formula'),bounds=formula.getBoundingClientRect();
    return {height:bounds.height,noVerticalScroll:formula.scrollHeight<=formula.clientHeight+1,labels:[...formula.querySelectorAll('.sheaf-filtration-quotient mjx-container,.sheaf-filtration-object mjx-container')].every(node=>{const r=node.getBoundingClientRect();return r.top>=bounds.top-1&&r.bottom<=bounds.bottom+1;})};
  };
  assert(await read(formulaFits).then(result=>result.height>40&&result.noVerticalScroll&&result.labels),'tall quotient formulas contribute to row height instead of being clipped');
  assert.equal(await read(()=>find('[data-save-complex-results]').disabled),true,'referenced sources cannot be saved as duplicate previews');
  await read(()=>{window.other=panels.open('complex-diagrams','complex:'+c.id,'side',{newInstance:true});other.propertyRenderer.editor.objectIO('presentation',{display:'snake-les'});});
  assert.equal(await read(()=>editor.objectIO('presentation').display||''),'','panel layouts are independent');
  await read(()=>find('[data-diagram-asset="complex:'+c.id+'"] [data-complex-chart-edit]').click());
  assert(await read(()=>[...panels.panels.values()].some(p=>p.definition.id==='complex-input'&&p.assetKey==='complex:'+c.id)));
  await read(()=>find('[data-diagram-asset="complex:'+c.id+'"] [data-complex-chart-object-index="0"]').click());
  assert.equal(await read(()=>document.activeElement.getAttribute('aria-label')),'Term 1 symbol');
  await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
  await client.send('Input.insertText',{text:'X '});
  assert.equal(await read(()=>document.activeElement.value),'X ','term editing preserves raw drafts');
  await read(()=>document.activeElement.blur());
  await read(()=>api.updateObjectAsset(c,{name:'D',data:{...api.localAssetSnapshot().assets.find(a=>a.id===c.id).data,objects:['X','Y','Z']}}));
  assert.deepEqual(await read(()=>editor.objectIO('complex-entries').find(e=>e.kind==='chain-complex').objects),['X','Y','Z']);
  assert.deepEqual(await read(()=>other.propertyRenderer.editor.objectIO('complex-entries')[0].objects),['X','Y','Z'],'shared edits reach every panel');
  assert.equal(await read(()=>other.propertyRenderer.editor.objectIO('complex-entries')[0].display),'snake-les');
  await read(()=>panels.move(other,'hidden'));
  await read(()=>{
    find('#complex-chart-operations').click();
    const mode=find('[data-complex-chart-operation-mode-select]');mode.value='extend';mode.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert(await read(()=>!find('[data-complex-chart-operation-add]').disabled),'existing operation produces a preview');
  const before=await read(()=>api.localAssetSnapshot().assets.length);
  await read(()=>find('[data-complex-chart-operation-add]').click());
  assert.equal(await read(()=>api.localAssetSnapshot().assets.length),before,'adding an operation result only creates a preview');
  assert(await read(()=>editor.objectIO('complex-entries').some(e=>!e.id.startsWith('workspace-diagram-'))));
  await read(()=>find('[data-save-complex-results]').click());
  assert.equal(await read(()=>api.localAssetSnapshot().assets.length),before+1);
  assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.data.legacy?.workspaceProvenance?.operation==='extend')));
  assert.equal(await read(()=>editor.objectIO('complex-entries').filter(e=>!e.id.startsWith('workspace-diagram-')).length),0);
  assert.equal(await read(()=>find('[data-save-complex-results]').disabled),true,'saved previews are now references');
  await read(()=>{
    const source=editor.objectIO('complex-entries')[0];
    find('#complex-chart-import-input').value=JSON.stringify({schema:'sheaf-complex-calculator-complex-chart',version:1,entries:[{...source,objects:['U','V','W']}]});find('#complex-chart-import-apply').click();
  });
  assert.deepEqual(await read(()=>editor.objectIO('complex-entries').find(e=>e.id==='workspace-diagram-complex-'+c.id).objects),['X','Y','Z'],'importing a source snapshot never overwrites its reference');
  assert(await read(()=>editor.objectIO('complex-entries').some(e=>e.id.startsWith('preview-workspace-diagram-'))));
  await read(()=>{for(const box of editor.shadow.querySelectorAll('[data-complex-chart-select]')){box.checked=box.dataset.complexChartSelect.startsWith('preview-');box.dispatchEvent(new Event('change',{bubbles:true}));}find('#complex-chart-delete').click();});
  await read(()=>{
    for(const box of editor.shadow.querySelectorAll('[data-complex-chart-select]')){box.checked=box.dataset.complexChartSelect==='workspace-diagram-filtration-'+f.id;box.dispatchEvent(new Event('change',{bubbles:true}));}
    find('#complex-chart-delete').click();
  });
  assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='filtration'&&a.id===f.id)),'removing a display member preserves its Asset');
  assert.equal(await read(()=>p.computation.refs.nodes.includes('filtration:'+f.id)),false);
  await read(()=>{window.backup=panels.exportText('workspace');panels.importText('workspace',backup);window.restored=[...panels.panels.values()].find(a=>a.definition.id==='complex-diagrams');});
  assert.equal(await read(()=>restored.computation.refs.nodes.length),2);
  assert.equal(await read(()=>restored.propertyRenderer.editor.objectIO('complex-entries').length),2,'restore projects current Assets without duplicate sources');
  await read(()=>{
    window.p=restored;window.editor=p.propertyRenderer.editor;
    window.extra=api.createObjectAsset('filtration');
    editor.shadow.querySelector('[data-diagram-action="collect"]').click();
  });
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),4,'collect shows all complexes and filtrations');
  await read(()=>editor.shadow.querySelector('[data-diagram-action="collect"]').click());
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),4,'collect does not duplicate members');
  await read(()=>{
    find('#complex-chart-import-input').value=JSON.stringify({schema:'sheaf-complex-calculator-complex-chart',version:1,entries:[{id:'remove-preview',kind:'filtration',length:2,objects:['U','V'],quotients:['W']}]});
    find('#complex-chart-import-apply').click();window.assetsBeforeRemove=JSON.stringify(api.localAssetSnapshot().assets);
    for(const box of editor.shadow.querySelectorAll('[data-complex-chart-select]')){box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));}
    find('#complex-chart-delete').click();
  });
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),0,'remove handles all selected references and previews');
  assert.deepEqual(await read(()=>p.computation.refs.nodes),[]);
  assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>assetsBeforeRemove),'remove preserves Assets');
  await read(()=>{panels.move(p,'hidden');window.reopened=panels.open('complex-diagrams','filtration:'+f.id,'main');});
  assert.equal(await read(()=>reopened===p),true,'a closed common display is reused');
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),1);
  await read(()=>editor.shadow.querySelector('[data-diagram-action="collect"]').click());
  await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await waitFor(()=>read(()=>getComputedStyle(find('[data-diagram-asset="filtration:'+f.id+'"] .sheaf-step-saved-rule-formula')).gridRowStart==='2'));
  assert(await read(formulaFits).then(result=>result.noVerticalScroll&&result.labels),'narrow displays retain full quotient height');
  await read(()=>{window.backup=panels.exportText('workspace');panels.importText('workspace',backup);});
  assert.equal(await read(()=>[...panels.panels.values()].filter(panel=>panel.definition.structureScene&&!panel.comparison).length),1,'backup retains one common display');
  if(process.env.WORKSPACE_TEST_SCREENSHOT){const shot=await client.send('Page.captureScreenshot',{format:'png'});require('node:fs').writeFileSync(process.env.WORKSPACE_TEST_SCREENSHOT,Buffer.from(shot.data,'base64'));}
  console.log('PASS common diagram display, tall/narrow filtration formulas, remove/collect, shared editing, previews, provenance, save-once and restore');
}finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}}
run().catch(error=>{console.error(error);process.exitCode=1;});
