'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    assert.equal(await read(()=>!!document.querySelector('[data-icon-geometry-setting]')),false,'ordinary sessions have no geometry controls');
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.frame=api.createObjectAsset('frame',{name:'FramePreview',data:{ambientDimension:2}});window.cone=api.createObjectAsset('cone',{name:'ConePreview',data:{ambientDimension:2}});
      window.fan=api.createObjectAsset('fan',{name:'FanPreview',data:{ambientDimension:2}});window.namedFan=api.createObjectAsset('fan',{data:{ambientDimension:2}});window.namedCone=api.createObjectAsset('cone',{data:{ambientDimension:2}});window.cone2=api.createObjectAsset('cone',{data:{ambientDimension:2}});
      window.icon=a=>document.querySelector('[data-asset-key="'+key(a)+'"] .workspace-asset-icon');api.openCanvas('assets');window.before=JSON.stringify(api.localAssetSnapshot().assets);
    });
    assert.match(await read(()=>namedFan.name),/^\\Sigma(?:_\{\d+\})?$/);assert.match(await read(()=>namedCone.name),/^\\sigma(?:_\{\d+\})?$/);assert.match(await read(()=>cone2.name),/^\\sigma_\{\d+\}$/);assert.notEqual(await read(()=>namedCone.name),await read(()=>cone2.name),'Greek default labels keep collision-safe numbering');
    assert.equal(await read(()=>icon(frame).querySelector('path').getAttribute('d')),'M4 20H36M31 15L36 20L31 25M20 36V4M15 9L20 4L25 9');
    for(const name of ['fan','cone'])assert.equal(await read(name=>icon(window[name]).querySelector('[data-fan-ray="2"]').getAttribute('d'),name),'M20 20L'+(20-16*0.7)+' '+(20+16*0.7));
    for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'D',code:'KeyD',modifiers:type==='keyDown'?11:0});
    await waitFor(()=>read(()=>!!document.querySelector('#workspace-design-lab')),10000);
    assert.equal(await read(()=>document.querySelectorAll('[data-design-experiment="icon-geometry"],[data-design-experiment="cartan-matrix"],[data-icon-geometry-setting],[data-cartan-setting]').length),0,'completed experiments are removed');
    assert(await read(()=>!!document.querySelector('[data-design-experiment="principal-assets"]')),'the remaining experiment is retained');
    const backup=await read(()=>panels.exportText('workspace'));assert(!backup.includes('fanNegativeLength')&&!backup.includes('coneNegativeLength'));
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>before));
    await read(()=>document.querySelector('[data-design-exit]').click());
    assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().fanNegativeLength),0.7);assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().coneNegativeLength),0.7);
    assert.equal(await read(()=>new URL(location.href).searchParams.has('designLab')),false);
    assert.deepEqual(errors,[]);console.log('PASS approved fan/cone lengths, full frame axes, retired experiments, clean backups and Greek default labels');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
