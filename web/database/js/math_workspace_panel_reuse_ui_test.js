'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    const press=async(key,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code,modifiers,windowsVirtualKeyCode:key==='a'?65:0});};
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(item=>key(item)===key(a));
      window.a=api.createObjectAsset('number',{name:'a',data:{hasValue:true,value:'2'}});window.b=api.createObjectAsset('number',{name:'b',data:{hasValue:true,value:'3'}});
      window.view=panels.open('number-view',key(a),'side');window.input=panels.open('number-input',key(a),'side');window.bView=panels.open('number-view',key(b),'side');api.openCanvas('assets');
    });
    assert.equal(await read(()=>panels.open('number-view',key(a),'main').id),await read(()=>view.id));
    assert.equal(await read(()=>view.location),'side','revealing a panel preserves its position');
    assert.notEqual(await read(()=>view.id),await read(()=>bView.id),'different assets get different views');
    await read(()=>input.numberControls.value.focus());await press('a','KeyA',2);await client.send('Input.insertText',{text:'+'});
    const caret=await read(()=>input.numberControls.value.selectionStart);
    assert.equal(await read(()=>panels.open('number-input',key(a),'main').id),await read(()=>input.id));
    assert.equal(await read(()=>input.numberControls.value.value),'+');assert.equal(await read(()=>input.numberControls.value.selectionStart),caret);
    assert.equal(await read(()=>get(a).data.value),'2');
    await read(()=>{api.updateObjectAsset(a,{name:'renamed_a'});view.node.classList.add('collapsed');view.collapsed=true;});
    assert.equal(await read(()=>panels.open('number-view',key(a),'side').id),await read(()=>view.id));assert.equal(await read(()=>view.collapsed),false);
    await read(()=>{panels.move(view,'main');api.closeCanvas(view.id);});
    assert.equal(await read(()=>view.closed),true);
    assert.equal(await read(()=>panels.open('number-view',key(a),'side').id),await read(()=>view.id));assert.equal(await read(()=>view.location),'main');
    await read(()=>{
      window.matrix=api.createObjectAsset('matrix',{data:{rows:1,cols:1,dataType:'integer',entries:[['2']]}});
      window.calculation=panels.open('matrix-computation','','side',{refs:{matrix:key(matrix)}});
      window.native=panel=>panel.propertyRenderer.editor.inspectorShadow;const shadow=native(calculation);
      shadow.querySelector('#operation-select').value='power';shadow.querySelector('#operation-select').dispatchEvent(new Event('change'));shadow.querySelector('#power-exponent').value='3';shadow.querySelector('#compute-operation').click();
    });
    assert.equal(await read(()=>panels.open('matrix-computation','','main',{refs:{matrix:key(matrix)}}).id),await read(()=>calculation.id));
    assert.equal(await read(()=>native(calculation).querySelector('#operation-select').value),'power');
    await read(()=>{calculation.head.querySelector('[data-workspace-card-action="compare"]').click();window.comparison=[...panels.panels.values()].find(panel=>panel.definition.id==='matrix-computation'&&panel!==calculation);});
    assert(await read(()=>!!comparison&&comparison.comparison));
    assert.equal(await read(()=>native(comparison).querySelector('#operation-select').value),'power');assert.equal(await read(()=>native(comparison).querySelector('#power-exponent').value),'3');
    assert.match(await read(()=>comparison.propertyRenderer.editor.objectIO('export','rows')),/8/);
    await read(()=>{const shadow=native(comparison);shadow.querySelector('#power-exponent').value='4';shadow.querySelector('#compute-operation').click();});
    assert.match(await read(()=>comparison.propertyRenderer.editor.objectIO('export','rows')),/16/);assert.match(await read(()=>calculation.propertyRenderer.editor.objectIO('export','rows')),/8/);
    assert.equal(await read(()=>panels.open('matrix-computation','','side',{refs:{matrix:key(matrix)}}).id),await read(()=>calculation.id));
    await read(()=>{panels.refresh();panels.refresh();});assert.equal(await read(()=>(comparison.title.textContent.match(/Comparison/g)||[]).length),1);
    await read(()=>{
      window.saved=JSON.parse(panels.exportText('workspace'));window.originalInputId=input.id;window.originalViewId=view.id;window.comparisonId=comparison.id;window.calculationId=calculation.id;
      const legacy=JSON.parse(JSON.stringify(saved.panels.find(panel=>panel.id===input.id)));legacy.id='object-panel-9901';legacy.location='side';legacy.lastLocation='side';delete legacy.comparison;delete legacy.comparisonIndex;
      legacy.drafts.find(draft=>draft.index===1).value='2/';saved.panels.push(legacy);panels.importText('workspace',JSON.stringify(saved));
      window.restored=panels.panels.get(originalInputId);window.legacy=panels.panels.get('object-panel-9901');
    });
    assert.equal(await read(()=>restored.numberControls.value.value),'+');assert.equal(await read(()=>legacy.numberControls.value.value),'2/','legacy duplicate drafts remain independent');
    assert.match(await read(()=>legacy.title.textContent),/Saved copy/);
    assert.equal(await read(()=>panels.open('number-input',key(a),'side').id),await read(()=>originalInputId));
    assert.equal(await read(()=>panels.open('number-view',key(a),'side').id),await read(()=>originalViewId));
    assert.equal(await read(()=>panels.open('matrix-computation','','side',{refs:{matrix:key(matrix)}}).id),await read(()=>calculationId));
    assert.match(await read(()=>panels.panels.get(comparisonId).propertyRenderer.editor.objectIO('export','rows')),/16/);
    assert.equal(await read(()=>typeof MathWorkspacePanelRegistry.suggest),'function','the existing property catalog remains intact');
    await read(()=>{api.openCanvas('assets');panels.reveal(panels.panels.get(comparisonId));});
    fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-panel-reuse.png'),Buffer.from((await client.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.deepEqual(errors,[]);console.log('Panel reuse UI: stable views/editors, raw drafts/caret, reveal/close, comparison snapshots, independent calculations and legacy backups passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
