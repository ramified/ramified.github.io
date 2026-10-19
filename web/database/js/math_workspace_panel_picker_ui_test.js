'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session, errors = [];
    const read = (fn,...args) => evaluate(client,'(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await client.send('Runtime.enable'); await client.send('Page.enable');
    client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspacePanelRegistry && !!window.MathWorkspaceObjectPanels),20000);
    assert.equal(await read(()=>[...document.querySelector('#workspace-open-canvas').options].some(o=>o.value.startsWith('object:'))),false);
    assert.equal(await read(()=>document.querySelector('#workspace-card-source')),null);
    await read(()=>document.querySelector('#workspace-add-card').click());
    assert.deepEqual(await read(()=>[...document.querySelectorAll('#workspace-card-options input')].map(i=>i.dataset.cardKey)),['importExport']);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.a=api.createObjectAsset('young',{name:'alpha',data:{partition:'2,1'}});
      window.b=api.createObjectAsset('young',{name:'beta',data:{partition:'1'}});
      window.g=api.createObjectAsset('lie',{name:'g',data:{family:'A',rank:3}});
      window.m=api.createObjectAsset('matrix',{name:'M',data:{rows:2,cols:2}});
      window.x=api.createObjectAsset('variety',{name:'X',type:'grassmannian',data:{r:2,n:4}});
      window.f=api.createObjectAsset('frame',{name:'F',data:{ambientDimension:3}});
      window.s=api.createObjectAsset('sphere',{name:'S',data:{ambientDimension:3,radius:2}});
      window.d=api.createObjectAsset('dynkin',{name:'D',data:{lie:key(g),vertices:[1]}});
      window.w=api.createObjectAsset('strands',{name:'w',data:{lie:key(g),generators:[]}});
      window.option=(id)=>document.querySelector('#workspace-card-options > .workspace-card-option input[data-panel-type="'+id+'"]');
      window.select=(...assets)=>assets.forEach((asset,index)=>api.selectAssetKey(key(asset),{ctrlKey:index>0}));
      // Start with a real asset click, as users enter the contextual picker.
      document.querySelector('#workspace-add-card').click();
    });
    const point = await read(()=>{const r=document.querySelector('[data-asset-key="'+key(a)+'"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
    await mouse(client,'mousePressed',point.x,point.y,1);await mouse(client,'mouseReleased',point.x,point.y,0);
    await read(()=>document.querySelector('#workspace-add-card').click());
    assert.equal(await read(()=>document.querySelector('#workspace-card-context').textContent),'Selected: alpha');
    assert.equal(await read(()=>option('lr').closest('label').textContent.includes('Needs: Young diagram μ, Lie type')),true);
    assert.equal(await read(()=>option('matrix-invariants')),null);
    assert.equal(await read(()=>document.querySelector('#workspace-card-options [data-panel-type$="-input"]')),null);
    await read(()=>option('lr').click());
    await read(()=>window.partial=[...panels.panels.values()].find(p=>p.definition.id==='lr'));
    assert.deepEqual(await read(()=>partial.computation.refs),{lambda:await read(()=>key(a))});
    assert.equal(await read(()=>partial.computation.status),'missing');
    assert.equal(await read(()=>document.querySelector('#workspace-card-picker').hidden),false);
    await read(()=>{const ref=partial.node.querySelector('[data-object-reference="mu"]');ref.value=key(b);ref.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await read(()=>option('lr').checked),false,'editing references updates the open picker without changing asset selection');
    assert.equal(await read(()=>!!document.querySelector('.workspace-existing-panels [data-card-key="'+partial.id+'"]')),true);
    await read(()=>{const ref=partial.node.querySelector('[data-object-reference="mu"]');ref.value='';ref.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await read(()=>option('lr').checked),true);
    await read(()=>select(b,a,g));
    assert.equal(await read(()=>option('lr').closest('label').textContent.includes('Needs:')),false);
    // Keyboard selection must leave focus on the same logical checkbox after rebuilding.
    await read(()=>option('lr').focus());
    for (const type of ['keyDown','keyUp']) await client.send('Input.dispatchKeyEvent',{type,key:' ',code:'Space',windowsVirtualKeyCode:32});
    await waitFor(()=>read(()=>[...panels.panels.values()].filter(p=>p.definition.id==='lr').length===2));
    await read(()=>window.ready=[...panels.panels.values()].find(p=>p.definition.id==='lr'&&p!==partial));
    assert.deepEqual(await read(()=>ready.computation.refs),await read(()=>({lambda:key(b),mu:key(a),lie:key(g)})));
    assert.deepEqual(await read(()=>partial.computation.refs),await read(()=>({lambda:key(a),mu:''})),'new selections must not retarget existing panels');
    assert.equal(await read(()=>document.activeElement===option('lr')),true);
    await read(()=>option('lr').click());
    assert.equal(await read(()=>ready.closed),true);
    await read(()=>option('lr').click());
    assert.equal(await read(()=>ready.closed),false);
    assert.equal(await read(()=>[...panels.panels.values()].filter(p=>p.definition.id==='lr').length),2,'rechecking restores the same panel');
    assert.equal(await read(()=>option('lr').dataset.cardKey===ready.id),true);
    const shot=await client.send('Page.captureScreenshot',{format:'png'});
    const screenshot=path.join(os.tmpdir(),'math-workspace-panel-picker.png');fs.writeFileSync(screenshot,Buffer.from(shot.data,'base64'));
    console.log('Screenshot: '+screenshot);
    console.log('PASS contextual selection, partial inputs, ordered prefill, checkbox focus and instance restoration');

    await read(()=>select(m));
    assert.equal(await read(()=>option('lr')),null);
    assert.equal(await read(()=>!!option('matrix-invariants')),true);
    assert.equal(await read(()=>document.querySelector('.workspace-existing-panels [data-card-key="'+ready.id+'"]').checked),true);
    await read(()=>option('matrix-invariants').click());
    await waitFor(()=>read(()=>[...panels.panels.values()].find(p=>p.definition.id==='matrix-invariants')?.computation.status==='current'));
    await read(()=>select(x,m));
    assert.equal(await read(()=>!!option('grassmannian')),true);
    await read(()=>option('asset:hodge').click());
    assert.deepEqual(await read(()=>[...api.state.selected]),await read(()=>[key(x),key(m)]),'opening a native property preserves the selected assets');
    assert.equal(await read(()=>api.assetsCardState.instances.get(api.assetsCardState.slots.get('hodge').activeInstanceKey).targetRef.id),await read(()=>x.id));
    assert.equal(await read(()=>option('asset:hodge').checked),true);
    await read(()=>option('asset:hodge').click());
    assert.equal(await read(()=>api.assetsCardState.slots.get('hodge').visible),false);
    await read(()=>option('asset:hodge').click());
    assert.equal(await read(()=>api.assetsCardState.slots.get('hodge').visible),true);
    console.log('PASS type filtering, existing panel management and native Variety properties');

    await read(()=>{select(f,s);option('slicing-scene').click();});
    await read(()=>window.scene=[...panels.panels.values()].find(p=>p.definition.id==='slicing-scene'));
    assert.deepEqual(await read(()=>scene.computation.refs),await read(()=>({frame:key(f),nodes:[key(s)]})));
    assert.equal(await read(()=>scene.computation.status),'current');
    await read(()=>option('slicing-display').click());
    assert.equal(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='slicing-display').computation.refs.view),await read(()=>scene.id));
    await read(()=>{select(d);option('dynkin-cartan').click();});
    assert.equal(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='dynkin-cartan').computation.refs.lie),await read(()=>key(g)));
    await read(()=>{panels.open('strands-input',key(w),'side',{keepPickerOpen:true});select(w);});
    assert.equal(await read(()=>!!option('strands-display')),true);
    await read(()=>option('strands-display').click());
    assert.equal(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='strands-display').computation.refs.view),await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='strands-input').id));
    await read(()=>{document.querySelector('#workspace-add-card').click();scene.head.querySelector('[data-workspace-card-action="move-area"]').click();});
    assert.equal(await read(()=>scene.location),'main','properties can still be moved into the main area explicitly');
    assert.deepEqual(errors,[]);
    console.log('math_workspace_panel_picker_ui_test: all contextual picker checks passed');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
