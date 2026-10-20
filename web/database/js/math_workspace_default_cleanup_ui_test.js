'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=k=>api.localAssetSnapshot().assets.find(a=>key(a)===k);window.one=api.createObjectAsset('young',{data:{rows:[1]}});window.power=panels.open('plethysm',key(one),'side');window.defaultRows=()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='young'&&a.isDefault).map(a=>a.data.rows);});
    assert.deepEqual(await read(()=>defaultRows()),[[2]]);
    for(let degree=3;degree<=8;degree++){
      await read(degree=>{power.powerDegree.value=String(degree);power.powerDegree.dispatchEvent(new Event('input'));},degree);
      assert.deepEqual(await read(()=>defaultRows()),[[degree]],'only the current power default remains after changing n');
    }
    await read(()=>{window.shared=power.computation.refs.lambda;window.advanced=panels.open('plethysm','','side',{refs:{lambda:shared,mu:key(one)}});panels.move(advanced,'hidden');power.powerDegree.value='9';power.powerDegree.dispatchEvent(new Event('input'));});
    assert.deepEqual(await read(()=>defaultRows()),[[8],[9]],'a saved panel retains its shared operand');
    await read(()=>{window.user=api.createObjectAsset('young',{data:{rows:[3]}});const select=advanced.node.querySelector('[data-object-reference="lambda"]');select.value=key(user);select.dispatchEvent(new Event('change'));});
    assert.equal(await read(()=>!!get(shared)),false);assert.deepEqual(await read(()=>defaultRows()),[[9]]);
    // Blank and sequential drafts keep the last valid binding until complete.
    await read(()=>power.powerDegree.focus());
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:0});
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    assert.equal(await read(()=>power.powerDegree.value),'');assert.deepEqual(await read(()=>defaultRows()),[[9]]);
    await client.send('Input.insertText',{text:'1'});await client.send('Input.insertText',{text:'2'});
    assert.equal(await read(()=>power.powerDegree.value),'12');assert.deepEqual(await read(()=>defaultRows()),[[12]]);
    await read(()=>{power.powerDegree.blur();power.powerMode.value='exterior';power.powerMode.dispatchEvent(new Event('change'));});
    assert.deepEqual(await read(()=>defaultRows()),[Array(12).fill(1)]);
    await read(()=>{power.powerMode.value='advanced';power.powerMode.dispatchEvent(new Event('change'));const select=power.node.querySelector('[data-object-reference="lambda"]');select.value=key(one);select.dispatchEvent(new Event('change'));});
    assert.deepEqual(await read(()=>defaultRows()),[]);assert.equal(await read(()=>!!get(key(user))),true,'unused user-created diagrams remain');
    // A default matrix and field form a transitive dependency chain.
    await read(()=>{window.lattice=api.createObjectAsset('lattice',{data:{ambientDimension:2,basisMode:'matrix-object'}});window.matrixKey=lattice.data.matrix;window.fieldKey=get(matrixKey).data.field;window.matrixFixture=get(matrixKey);window.fieldFixture=get(fieldKey);window.matrix=api.createObjectAsset('matrix',{data:{rows:2,cols:2,dataType:'real'}});});
    assert.equal(await read(()=>matrix.data.field),await read(()=>fieldKey));
    await read(()=>api.updateObjectAsset({kind:'lattice',id:lattice.id},{data:{ambientDimension:2,basisMode:'matrix-input',basisRows:[[1,0],[0,1]]}}));
    assert.equal(await read(()=>!!get(matrixKey)),false);assert.equal(await read(()=>!!get(fieldKey)),true,'a user matrix still owns the coefficient field');
    await read(async()=>{const refs=[{kind:'matrix',id:matrix.id}],plan=await api.assetRequest('plan-delete',{refs});api.applyAssetSnapshot(await api.assetRequest('commit-delete',{refs,revision:plan.revision}));});
    assert.equal(await read(()=>!!get(fieldKey)),false,'the field is released with its last owner');
    // Old backups may contain orphan defaults; collection waits for all panels.
    await read(()=>{const backup=JSON.parse(panels.exportText('workspace'));const field={...fieldFixture,id:'orphanfield',name:'K_{orphan}',isDefault:true};const matrix={...matrixFixture,id:'orphanmatrix',name:'A_{orphan}',isDefault:true,data:{...matrixFixture.data,field:key(field)}};backup.assets.push(field,matrix);panels.importText('workspace',JSON.stringify(backup));});
    assert.equal(await read(()=>api.localAssetSnapshot().assets.some(a=>['orphanfield','orphanmatrix'].includes(a.id))),false);
    await read(()=>panels.importText('workspace',panels.exportText('workspace')));
    assert.equal(await read(()=>[...panels.panels.values()].some(p=>p.definition.id==='plethysm'&&p.computation.refs.mu===key(one))),true);
    assert.deepEqual(errors,[]);console.log('default cleanup: degree changes, shared/saved panels, real drafts, user assets, dependency chains, last-owner deletion, and restore passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
