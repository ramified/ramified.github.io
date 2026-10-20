'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,delay}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const {decodeState}=await import('../archive/math_workspace_version1/js/math_workspace/editors/state.mjs');
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.native=p=>p.propertyRenderer.editor.inspectorShadow;window.one=api.createObjectAsset('young',{data:{rows:[1]}});window.two=api.createObjectAsset('young',{data:{rows:[2]}});window.g=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.lr=panels.open('lr','','side',{refs:{lambda:key(one),mu:key(one),nu:key(two),lie:key(g)}});const fixed=native(lr).getElementById('fixed-rank-mode');fixed.checked=false;fixed.dispatchEvent(new Event('change',{bubbles:true}));native(lr).getElementById('compute-schur').click();});
    let exported=await read(()=>JSON.parse(panels.exportText('property:'+lr.computation.id)));
    assert.match(exported.result.text,/Coefficient = 1/);assert.match(exported.result.text,/stable A/);assert(exported.refs.nu);
    await read(()=>api.updateObjectAsset({kind:'young',id:two.id},{data:{rows:[1,1]}}));
    assert.equal(await read(()=>lr.computation.status),'stale');assert.equal(await read(()=>JSON.parse(panels.exportText('property:'+lr.computation.id)).result),null);
    await read(()=>native(lr).getElementById('compute-schur').click());assert.match(await read(()=>native(lr).getElementById('schur-out').textContent),/Coefficient = 1/);
    await read(async()=>{const refs=[{kind:'young',id:two.id}],plan=await api.assetRequest('plan-delete',{refs});api.applyAssetSnapshot(await api.assetRequest('commit-delete',{refs,revision:plan.revision}));});
    assert.equal(await read(()=>lr.computation.status),'missing');assert.equal(await read(()=>lr.computation.refs.nu),'young:'+await read(()=>two.id));
    // Known identities distinguish the outer power diagram from the representation.
    await read(()=>{window.power=panels.open('plethysm',key(one),'side');native(power).getElementById('compute-plethysm').click();});
    const terms=async()=>decodeState(await read(()=>power.propertyRenderer.editor.capture().model)).state.lastPlethysm.terms.map(({nu,coefficient})=>({nu,coefficient}));
    assert.deepEqual(await terms(),[{nu:[2],coefficient:1}]);
    await read(()=>{power.powerMode.value='advanced';power.powerMode.dispatchEvent(new Event('change'));native(power).getElementById('compute-plethysm').click();});assert.deepEqual(await terms(),[{nu:[2],coefficient:1}]);
    await read(()=>{power.powerMode.value='exterior';power.powerMode.dispatchEvent(new Event('change'));native(power).getElementById('compute-plethysm').click();});assert.deepEqual(await terms(),[{nu:[1,1],coefficient:1}]);
    await read(()=>{power.powerDegree.value='0';power.powerDegree.dispatchEvent(new Event('input'));native(power).getElementById('compute-plethysm').click();});assert.deepEqual(await terms(),[{nu:[],coefficient:1}]);
    await read(()=>{window.large=api.createObjectAsset('young',{data:{rows:[2]}});const select=power.node.querySelector('[data-object-reference="mu"]');select.value=key(large);select.dispatchEvent(new Event('change'));power.powerDegree.value='12';power.powerDegree.dispatchEvent(new Event('input'));native(power).getElementById('compute-plethysm').click();});
    assert.match(await read(()=>native(power).getElementById('plethysm-out').textContent),/capped at 12/);
    const invalid=JSON.parse(await read(()=>panels.exportText('workspace')));invalid.panels.find(p=>p.type==='plethysm').computation.settings.degree=13;
    await assert.rejects(read(text=>panels.importText('workspace',text),JSON.stringify(invalid)),/Invalid plethysm power settings/);
    // Keyboard creation must preserve the existing creation flow's name focus.
    await read(()=>{api.selectCanvasTab('assets');window.scrollTo(0,0);document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));});
    await read(()=>[...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click());
    const before=await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='sheaf').length);
    await client.send('Input.insertText',{text:'sheaf'});
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    assert.equal(await read(()=>document.activeElement.dataset.createKind),'sheaf');
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor(()=>read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='sheaf').length).then(count=>count===before+1));
    await delay(100);assert.equal(await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='sheaf').length),before+1);
    assert.equal(await read(()=>document.querySelector('#workspace-create-dialog').open),false);
    assert.equal(await read(()=>document.activeElement.matches('[data-assets-name]')),true,'creation should keep focus on the new sheaf name');
    await read(()=>{api.selectCanvasTab('assets');document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();api.state.snapshot.capabilities.sheaf=false;const search=document.querySelector('[data-create-search]');search.value='sheaf';search.dispatchEvent(new Event('input'));});
    assert.equal(await read(()=>document.querySelector('[data-create-kind="sheaf"]').disabled),true);
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.equal(await read(()=>document.querySelector('#workspace-create-dialog').open),true,'Enter must not activate an unavailable object');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='sheaf').length),before+1);
    await read(()=>{api.state.snapshot.capabilities.sheaf=true;});
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await waitFor(()=>read(()=>document.activeElement===api.state.view));
    assert.deepEqual(errors,[]);console.log('LR target lifecycle/exports, exact power identities/limits, backup validation, keyboard creation, capabilities, and cancellation focus passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
