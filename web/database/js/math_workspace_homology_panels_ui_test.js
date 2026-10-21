'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.x=api.createObjectAsset('variety',{type:'projective',data:{dimension:'2'}});
      window.e=api.createObjectAsset('sheaf',{type:'structure',data:{base:key(x)}});
      window.f=api.createObjectAsset('map',{type:'ordinary',data:{domain:key(x),codomain:key(x)}});
      window.targets=[x,e,f];
      targets.forEach(a=>api.bindAssetPropertySlot('homology-'+a.kind,{kind:a.kind,id:a.id},{focus:false,promote:false}));
      const mapSlot=api.assetsCardState.slots.get('homology-map');
      const card=mapSlot.rendererSession.editor.inspectorShadow.querySelector('#homology-card');
      card.querySelector('.card-pin-btn').click();card.querySelector('.card-head').click();
      window.original=api.localAssetSnapshot().assets;
      window.saved=panels.exportText('workspace');
      window.state=()=>targets.map(a=>{const slot=api.assetsCardState.slots.get('homology-'+a.kind);return {type:slot.cardType,active:slot.activeInstanceKey,visible:slot.visible,pinned:slot.pinned,collapsed:slot.collapsed};});
      window.expected=state();
    });
    assert.equal(await read(()=>new Set(targets.map(a=>api.assetsCardState.slots.get('homology-'+a.kind).rendererSession)).size),3);
    assert(await read(()=>state().every(slot=>slot.visible)),'three independent panels open simultaneously');
    assert.match(await read(()=>{try{api.bindAssetPropertySlot('homology-sheaf',{kind:x.kind,id:x.id},{focus:false});return '';}catch(error){return error.message;}}),/not available/,'cross-kind binding is rejected');
    await read(()=>panels.importText('workspace',saved));
    assert.deepEqual(await read(()=>state()),await read(()=>expected),'all panels restore their own targets and presentation');
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets),await read(()=>original));
    await read(()=>{
      const old=JSON.parse(saved),typed=old.assetCards.slots.filter(slot=>slot.cardType.startsWith('homology-'));
      const active=typed.find(slot=>slot.cardType==='homology-map'),oldKey=key=>key.replace(/:homology-(variety|sheaf|map)$/,':homology');
      old.assetCards.slots=old.assetCards.slots.filter(slot=>!slot.cardType.startsWith('homology-'));
      old.assetCards.slots.push({...active,cardType:'homology',activeInstanceKey:oldKey(active.activeInstanceKey),recentInstanceKeys:typed.filter(slot=>slot!==active).map(slot=>oldKey(slot.activeInstanceKey))});
      old.assetCards.instances.forEach(instance=>{if(instance.cardType.startsWith('homology-'))instance.cardType='homology';});
      old.workspace.inspectorOrder=old.workspace.inspectorOrder.filter(id=>!id.startsWith('asset-card:homology-'));old.workspace.inspectorOrder.push('asset-card:homology');
      window.legacy=JSON.stringify(old);panels.importText('workspace',legacy);
    });
    assert.deepEqual(await read(()=>state().map(slot=>slot.visible)),[false,false,true],'legacy active interface alone stays visible');
    assert.deepEqual(await read(()=>state().map(slot=>slot.active)),await read(()=>expected.map(slot=>slot.active)),'legacy instances route to the correct new slots');
    assert.equal(await read(()=>state()[2].pinned),true);assert.equal(await read(()=>state()[2].collapsed),true);
    await read(()=>targets.forEach(a=>api.bindAssetPropertySlot('homology',{kind:a.kind,id:a.id},{focus:false,promote:false})));
    assert(await read(()=>state().every(slot=>slot.visible)),'legacy helper routes each kind independently');
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets),await read(()=>original),'migration preserves mathematical data');
    const invalid=await read(()=>{const bad=JSON.parse(panels.exportText('workspace'));bad.assetCards.instances.find(item=>item.cardType==='homology-variety').targetRef={kind:e.kind,id:e.id};try{panels.importText('workspace',JSON.stringify(bad));return '';}catch(error){return error.message;}});
    assert.match(invalid,/Incompatible saved Assets property target/);
    assert(await read(()=>state().every(slot=>slot.visible)),'invalid import leaves all current panels intact');
    await read(()=>{
      targets.forEach(a=>api.assetsCardState.slots.get('homology-'+a.kind).rendererSession.editor.setCardPresentation('homology-card',{collapsed:true}));
      api.assetsCardState.slots.get('homology-variety').rendererSession.inspectorHost.scrollIntoView({block:'center'});
    });
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-homology-panels.png'),Buffer.from(shot.data,'base64'));
    console.log('PASS three simultaneous Homology panels, typed bindings, independent presentation, new backup roundtrip and legacy migration');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
