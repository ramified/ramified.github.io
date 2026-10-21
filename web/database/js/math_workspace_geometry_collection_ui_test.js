'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try {
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');await client.send('Page.enable');
    client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.f3=api.createObjectAsset('frame',{data:{ambientDimension:3}});
      window.f4=api.createObjectAsset('frame',{data:{ambientDimension:4}});
      window.s3=api.createObjectAsset('sphere',{data:{ambientDimension:3}});
      window.s4=api.createObjectAsset('sphere',{data:{ambientDimension:4}});
      const lattice=api.createObjectAsset('lattice',{data:{ambientDimension:3}}),point=api.createObjectAsset('point',{data:{ambientDimension:3}});
      window.bad=api.createObjectAsset('voronoi',{data:{ambientDimension:3,lattice:key(lattice),point:key(point)}});
      window.rectangular=api.createObjectAsset('matrix',{data:{rows:3,cols:2}});
      // Simulate a source whose dependency is no longer available.
      api.state.snapshot.assets.find(asset=>asset.id===bad.id).data.lattice='lattice:missing';
      window.scene=panels.open('geometry-view',key(f3),'main');
      window.other=panels.open('slicing-scene',key(s3),'side');other.computation.refs.frame=key(f3);panels.refresh();
      window.root=scene.propertyRenderer.editor.shadow;
      window.act=action=>root.querySelector('[data-scene-action="'+action+'"]').click();
      window.assetBefore=JSON.stringify(api.localAssetSnapshot().assets);
    });
    assert.equal(await read(()=>scene.computation.status),'current','frame-only displays have a usable canvas');
    assert.equal(await read(()=>root.querySelector('[data-scene-control-group="frame"]').textContent.includes(f3.name)),true);
    assert.equal(await read(()=>root.querySelector('[data-frame-control="visibleProjection"]').checked),true,'the chosen frame has its own visible basis');
    await read(()=>act('collect'));
    assert.equal(await read(()=>scene.computation.refs.nodes.includes(key(s3))),true);
    for(const name of ['f4','s4','bad','rectangular'])assert.equal(await read(name=>scene.computation.refs.nodes.includes(key(window[name])),name),false,name+' must not be collected');
    assert.equal(await read(()=>scene.computation.refs.nodes.includes(key(f3))),false,'the selected frame is separate from collected objects');
    assert.deepEqual(await read(()=>other.computation.refs.nodes),await read(()=>[key(s3)]),'collection belongs to one display');
    const once=await read(()=>scene.computation.refs.nodes);
    await read(()=>act('collect'));assert.deepEqual(await read(()=>scene.computation.refs.nodes),once,'collect is idempotent');
    await read(()=>root.querySelector('[data-layer-control="visibleProjection"]').click());
    assert.equal(await read(()=>root.querySelector('[data-frame-control="visibleProjection"]').checked),true,'object layer controls preserve the frame');
    await read(()=>act('clear'));
    assert.deepEqual(await read(()=>scene.computation.refs.nodes),[]);
    assert.equal(await read(()=>scene.computation.refs.asset),'');
    assert.equal(await read(()=>scene.computation.refs.frame),await read(()=>key(f3)));
    assert.equal(await read(()=>scene.computation.status),'current');
    assert.equal(await read(()=>getComputedStyle(scene.propertyRenderer.host).display==='none'),false,'clear keeps the canvas and toolbar');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>assetBefore),'display actions do not mutate assets');
    await read(()=>act('collect'));
    await read(()=>{const select=scene.references.querySelector('[data-object-reference="frame"]');select.value=key(f4);select.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await read(()=>scene.computation.refs.nodes.includes(key(s3))),false,'frame changes remove incompatible display members');
    assert.deepEqual(await read(()=>scene.propertyRenderer.editor.readObjectResult().frame),await read(()=>f4.data),'the frame selector overrides the object that opened the display');
    await read(()=>act('collect'));
    assert.equal(await read(()=>scene.computation.refs.nodes.includes(key(s4))),true);
    assert.equal(await read(()=>scene.computation.refs.nodes.includes(key(s3))),false);
    for(const width of [1440,760]) {
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:false});
      await read(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await read(()=>{const area=root.querySelector('.workspace-native-content').getBoundingClientRect(),bar=root.querySelector('.workspace-native-toolbar').getBoundingClientRect();return {height:area.height,bottom:area.bottom,top:bar.top,overflow:root.querySelector('.workspace-native-surface').scrollWidth>root.querySelector('.workspace-native-surface').clientWidth};});
      assert(layout.height>100,'the canvas stays usable at width '+width);assert(layout.top>=layout.bottom-1,'toolbar is below the canvas');assert.equal(layout.overflow,false);
      const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-geometry-collection-'+width+'.png'),Buffer.from(shot.data,'base64'));
    }
    assert.deepEqual(errors,[]);
    console.log('math_workspace_geometry_collection_ui_test: scoped toolbar, compatible collection, clear, independent displays and responsive layout passed');
  } finally {if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
