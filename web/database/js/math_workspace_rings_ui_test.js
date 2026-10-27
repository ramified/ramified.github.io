'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,errors=[],read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(item=>key(item)===key(a));
      api.openCanvas('assets');document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));
      [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();
    });
    assert.match(await read(()=>document.querySelector('[data-create-kind="field"]').textContent),/Ring/);
    await read(()=>{document.querySelector('[data-create-kind="field"]').click();window.z=api.localAssetSnapshot().assets.find(a=>a.kind==='field');window.input=[...panels.panels.values()].find(p=>p.definition.id==='field-input');input.coefficientType.value='integer';input.coefficientType.dispatchEvent(new Event('change'));});
    assert.equal(await read(()=>get(z).name),'R','new rings use R');
    assert.equal(await read(()=>get(z).typeLabel),'Ring');
    assert.match(await read(()=>input.ringClassification.textContent),/not a field/);
    await read(()=>{
      window.display=panels.open('field-view',key(z),'main');
      window.n=api.createObjectAsset('number',{data:{field:key(z),hasValue:true,value:'6'}});
      window.matrix=api.createObjectAsset('matrix',{data:{rows:1,cols:1,entries:[['2']],field:key(z)}});
      window.matrixInput=panels.open('matrix-input',key(matrix),'side');window.numberInput=panels.open('number-input',key(n),'side');
    });
    assert.match(await read(()=>display.computation.result.text),/Integer ring.*not a field/s);
    assert.equal(await read(()=>matrixInput.selectors.find(s=>s.spec.id==='field').spec.label),'Coefficient ring');
    assert.match(await read(()=>get(matrix).definition),/Integer ring ℤ/,'matrix descriptions use the linked ring');
    assert.equal(await read(()=>numberInput.selectors.find(s=>s.spec.id==='field').spec.label),'Coefficient ring');
    assert.equal(await read(()=>MathWorkspaceNumbers.evaluate(get(n),api.localAssetSnapshot().assets).text),'6');
    assert.match(await read(()=>{try{api.updateObjectAsset(n,{data:{...get(n).data,value:'3/2'}});return '';}catch(error){return error.message;}}),/integer/);
    assert.equal(await read(()=>get(n).data.value),'6');
    await read(()=>{
      window.extension=api.createObjectAsset('field-extension');window.base=api.localAssetSnapshot().assets.find(a=>key(a)===extension.data.base);
      window.extensionInput=panels.open('field-extension-input',key(extension),'side');
      window.functionField=api.createObjectAsset('field',{data:{dataType:'function-field',constantField:key(base)}});window.functionInput=panels.open('field-input',key(functionField),'side');
    });
    assert(!await read(()=>[...extensionInput.selectors.find(s=>s.spec.id==='base').select.options].some(option=>option.value===key(z))),'field extensions cannot select the integer ring');
    assert(!await read(()=>[...functionInput.selectors.find(s=>s.spec.id==='constantField').select.options].some(option=>option.value===key(z))));
    assert.match(await read(()=>{try{api.updateObjectAsset(extension,{data:{...get(extension).data,base:key(z)}});return '';}catch(error){return error.message;}}),/base field/);
    await read(()=>api.updateObjectAsset(base,{data:{...get(base).data,dataType:'integer'}}));
    assert.equal(await read(()=>get(base).data.dataType),'integer','dependent assets do not block the ring definition');
    assert.equal(await read(()=>api.localAssetSnapshot().diagnostics[key(extension)].valid),false);
    await read(()=>api.updateObjectAsset(base,{data:{...get(base).data,dataType:'rational'}}));
    await read(()=>{
      window.calculation=panels.open('matrix-computation','','main',{refs:{matrix:key(matrix)}});window.shadow=calculation.propertyRenderer.editor.inspectorShadow;
      const operation=shadow.querySelector('#operation-select');operation.value='inverse';operation.dispatchEvent(new Event('change'));shadow.querySelector('#compute-operation').click();
    });
    assert.match(await read(()=>calculation.propertyRenderer.editor.objectIO('export','rows')),/1\/2/);
    assert.match(await read(()=>shadow.querySelector('#operation-output').textContent),/not invertible over ℤ/);
    assert.match(await read(()=>calculation.propertyRenderer.editor.objectIO('export','sage')),/Result entries lie in ℚ/);
    assert.equal(await read(()=>get(matrix).data.field),await read(()=>key(z)),'computing over Q never changes the input ring');
    await read(()=>{api.updateObjectAsset(matrix,{data:{...get(matrix).data,entries:[['-1']]}});shadow.querySelector('#compute-operation').click();});
    assert.match(await read(()=>shadow.querySelector('#operation-output').textContent),/matrix is invertible over ℤ/);
    await read(()=>{
      window.saved=JSON.parse(panels.exportText('workspace'));
      saved.assets.push({kind:'field',id:'F999',type:'field',typeLabel:'Field',name:'F_{legacy}',data:MathWorkspaceObjects.normalize('field','field',{dataType:'integer'}),dependencies:[]});
      panels.importText('workspace',JSON.stringify(saved));window.legacy=api.localAssetSnapshot().assets.find(a=>a.id==='F999');
    });
    assert.equal(await read(()=>legacy.name),'F_{legacy}','existing names and identities survive');
    assert.equal(await read(()=>legacy.typeLabel),'Ring');
    assert.equal(await read(()=>get(matrix).data.field),await read(()=>key(z)));
    assert.equal(await read(()=>get(n).data.field),await read(()=>key(z)));
    assert(!await read(()=>MathWorkspaceRings.isField(legacy)));
    await read(()=>{window.finalInput=panels.open('field-input',key(z),'side');finalInput.node.scrollIntoView({block:'center'});});
    fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-ring.png'),Buffer.from((await client.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.deepEqual(errors,[]);
    console.log('Ring UI: R naming, coefficient references, field-only guards, exact integer inverses and legacy backup preservation passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
