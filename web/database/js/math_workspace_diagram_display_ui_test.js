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
    window.c=api.createObjectAsset('complex');window.f=api.createObjectAsset('filtration');
    window.p=panels.open('complex-diagrams','complex:'+c.id,'main');
    p.references.querySelector('[data-diagram-member="filtration:'+f.id+'"]').click();
    window.editor=p.propertyRenderer.editor;window.find=sel=>editor.shadow.querySelector(sel)||editor.inspectorShadow.querySelector(sel);
  });
  assert.equal(await read(()=>editor.objectIO('complex-entries').length),2);
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
  if(process.env.WORKSPACE_TEST_SCREENSHOT){const shot=await client.send('Page.captureScreenshot',{format:'png'});require('node:fs').writeFileSync(process.env.WORKSPACE_TEST_SCREENSHOT,Buffer.from(shot.data,'base64'));}
  console.log('PASS mixed diagram display, shared editing, native operation preview, provenance, save-once, non-destructive removal and restore');
}finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}}
run().catch(error=>{console.error(error);process.exitCode=1;});
