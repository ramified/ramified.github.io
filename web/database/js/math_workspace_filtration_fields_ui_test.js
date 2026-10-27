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
    window.term=api.createObjectAsset('matrix',{name:'G'});
    window.f=api.createObjectAsset('filtration',{data:{objects:['F_0','F_1'],quotients:[{symbol:'G',ref:'matrix:'+term.id}],direction:'decreasing',startDegree:4}});
    window.fv=panels.open('filtration-view','filtration:'+f.id,'main');window.fi=panels.open('filtration-input','filtration:'+f.id,'side');
  });
  assert.equal(await read(()=>fv.computation.status),'current');
  assert(await read(()=>fv.propertyRenderer.editor.shadow.querySelector('.workspace-complex-display').textContent.includes('decreasing')));
  assert.equal(await read(()=>fi.structureRows.length),3);
  if(process.env.WORKSPACE_TEST_SCREENSHOT){const shot=await client.send('Page.captureScreenshot',{format:'png'});require('node:fs').writeFileSync(process.env.WORKSPACE_TEST_SCREENSHOT+'-filtration.png',Buffer.from(shot.data,'base64'));}
  await read(()=>api.updateObjectAsset(term,{name:'H'}));
  assert(await read(()=>fv.propertyRenderer.editor.shadow.querySelector('.workspace-complex-display').textContent.includes('H')),'linked quotient names update');
  await read(()=>{window.fo=panels.open('filtration-operations','filtration:'+f.id,'main');});
  assert.deepEqual(await read(()=>fo.propertyRenderer.editor.objectIO('complex-entries')[0].objects),['F_1','F_0']);
  await read(()=>{
    const editor=fo.propertyRenderer.editor,find=id=>editor.shadow.querySelector(id)||editor.inspectorShadow.querySelector(id);
    find('#complex-chart-import-input').value=JSON.stringify({schema:'sheaf-complex-calculator-complex-chart',version:1,entries:[{id:'derived-filtration',kind:'filtration',length:2,objects:['U','V'],quotients:['W']}]});
    find('#complex-chart-import-apply').click();editor.shadow.querySelector('[data-save-complex-results]').click();
  });
  assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='filtration'&&a.data.legacy?.id==='derived-filtration')));
  await read(()=>{
    window.k=api.createObjectAsset('field',{data:{dataType:'finite-field',finiteFieldPrime:3}});
    window.ff=api.createObjectAsset('field');window.input=panels.open('field-input','field:'+ff.id,'side');
    input.coefficientType.value='function-field';input.coefficientType.dispatchEvent(new Event('change',{bubbles:true}));
    const selector=input.selectors.find(row=>row.spec.id==='constantField');
    window.constantSelect=selector.row.querySelector('select');constantSelect.value='field:'+k.id;constantSelect.dispatchEvent(new Event('change',{bubbles:true}));
  });
  assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===ff.id).data.constantField),'field:'+await read(()=>k.id));
  await read(()=>input.fieldControls.functionFieldPolynomial.focus());
  await client.send('Input.insertText',{text:'u^2-t'});
  assert.equal(await read(()=>input.fieldControls.functionFieldPolynomial.value),'u^2-t');
  await read(()=>{
    window.fieldView=panels.open('field-view','field:'+ff.id,'main');
    [...fieldView.renderArea.querySelectorAll('button')].find(b=>b.textContent==='Ramification of the defining extension').click();
    window.ext=api.localAssetSnapshot().assets.find(a=>a.kind==='field-extension'&&a.data.target==='field:'+ff.id);
    window.view=[...panels.panels.values()].find(p=>p.definition.id==='field-extension-view'&&p.computation.refs.asset==='field-extension:'+ext.id);
    view.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]').click();
  });
  await waitFor(()=>read(()=>view.propertyRenderer.editor.readObjectResult()?.hasResult),30000);
  assert.equal(await read(()=>JSON.parse(view.propertyRenderer.editor.objectIO('extension-export')).base.kind),'Fqt');
  assert.equal(await read(()=>String(JSON.parse(view.propertyRenderer.editor.objectIO('extension-export')).base.q)),'3');
  assert(await read(()=>view.propertyRenderer.editor.objectIO('extension-export').includes('x^2-t')));
  await read(()=>api.updateObjectAsset(k,{data:{dataType:'finite-extension',finiteFieldPrime:2,finiteFieldDegree:2}}));
  assert.equal(await read(()=>view.propertyRenderer.editor.readObjectResult().hasResult),false,'constant field changes invalidate results');
  await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]').click());
  await waitFor(()=>read(()=>view.propertyRenderer.editor.readObjectResult()?.hasResult),30000);
  assert.equal(await read(()=>String(JSON.parse(view.propertyRenderer.editor.objectIO('extension-export')).base.q)),'4');
  if(process.env.WORKSPACE_TEST_SCREENSHOT){const shot=await client.send('Page.captureScreenshot',{format:'png'});require('node:fs').writeFileSync(process.env.WORKSPACE_TEST_SCREENSHOT+'-function.png',Buffer.from(shot.data,'base64'));}
  assert(await read(()=>{const root=view.propertyRenderer.editor.shadow,stage=root.querySelector('.ramification-stage'),status=root.querySelector('#generic-status');return getComputedStyle(stage).position==='relative'&&stage.getBoundingClientRect().top>=status.getBoundingClientRect().bottom;}),'the diagram is contained below the visible computation status');
  await read(()=>{
    window.unsupported=api.createObjectAsset('field-extension',{data:{base:'field:'+ff.id,polynomial:'x^2-u'}});
    window.uv=panels.open('field-extension-view','field-extension:'+unsupported.id,'main');
  });
  assert(await read(()=>uv.propertyRenderer.editor.shadow.querySelector('[data-extension-compute]').disabled));
  assert(await read(()=>uv.propertyRenderer.editor.shadow.querySelector('#generic-status').textContent.includes('algebraic function-field base')));
  await read(()=>{window.backup=panels.exportText('workspace');panels.importText('workspace',backup);});
  assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='filtration'&&a.data.direction==='decreasing'&&a.data.quotients[0].ref==='matrix:'+term.id)));
  assert(await read(()=>api.localAssetSnapshot().assets.some(a=>a.kind==='field'&&a.data.dataType==='function-field'&&a.data.constantField==='field:'+k.id&&a.data.functionFieldPolynomial==='u^2-t')));
  console.log('PASS filtration references/operations, function-field form and defining extension, F3(t)/F4(t) computation, invalidation, unsupported bases, backup restore');
}finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}}
run().catch(error=>{console.error(error);process.exitCode=1;});
