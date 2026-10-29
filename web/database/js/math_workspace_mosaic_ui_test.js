'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const{client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.space=api.createObjectAsset('mosaic-space');
      window.first=api.createObjectAsset('mosaic-diagram',{data:{space:key(space)}});
      window.second=api.createObjectAsset('mosaic-diagram',{data:{space:key(space)}});
      window.get=a=>api.localAssetSnapshot().assets.find(b=>key(b)===key(a));
      window.input=panels.open('mosaic-diagram-input',key(first),'main');
    });
    assert(await read(()=>!!input.activeRenderer?.editor),'native diagram editor mounts');
    assert.deepEqual(await read(()=>get(first).dependencies),await read(()=>[{kind:space.kind,id:space.id}]));
    await read(()=>{const type=input.activeRenderer.editor.environment.document.getElementById('diagram-type');type.value='dual';type.dispatchEvent(new Event('change',{bubbles:true}));});
    await waitFor(()=>read(()=>get(first).data.diagramType==='dual'));
    assert.equal(await read(()=>get(second).data.diagramType),'link','native edits affect only the bound diagram');
    await read(()=>{
      const data=MathWorkspaceMosaic.fromPayload('mosaic-diagram',{...space.data,diagramType:'link',tiles:[{row:2,col:2,tile:[[0,3]]}]},key(space));
      api.updateObjectAsset(first,{data});
      window.view=panels.open('mosaic-view',key(first),'side');
      window.stats=panels.open('mosaic-statistics',key(first),'side');
      window.homology=panels.open('mosaic-homology',key(space),'side');
    });
    assert.equal(await read(()=>get(second).data.tiles.length),0,'diagrams remain independent');
    assert.equal(await read(()=>view.computation.status),'current');
    assert.equal(await read(()=>stats.computation.status),'current');
    assert(await read(()=>!!homology.propertyRenderer));
    await read(()=>homology.propertyRenderer.editor.environment.document.getElementById('compute-homology').click());
    await waitFor(()=>read(()=>!homology.propertyRenderer.editor.environment.document.getElementById('homology-group').textContent.includes('not computed')),20000);
    await read(()=>{window.saved=JSON.stringify(get(first).data);api.updateObjectAsset(space,{data:{...get(space).data,rows:6}});});
    assert(await read(()=>input.inputIssues.length>0),'structural mismatch is visible');
    assert.equal(await read(()=>JSON.stringify(get(first).data)),await read(()=>saved),'invalidating a diagram never discards its data');
    await read(()=>api.updateObjectAsset(space,{data:space.data}));
    assert.equal(await read(()=>input.inputIssues.length),0,'restoring the space repairs all views');
    await read(()=>{window.spaceInput=panels.open('mosaic-space-input',key(space),'main');});
    assert(await read(()=>!!spaceInput.activeRenderer));
    const press=async(key,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code:key==='a'?'KeyA':key,modifiers,windowsVirtualKeyCode:{a:65,Backspace:8,Tab:9}[key]||0});};
    await read(()=>spaceInput.activeRenderer.editor.environment.document.getElementById('grid-rows').focus());
    await press('a',2);await press('Backspace');
    assert.equal(await read(()=>get(space).data.rows),5,'empty numeric draft does not alter the space');
    await client.send('Input.insertText',{text:'6'});await press('Tab');
    await waitFor(()=>read(()=>get(space).data.rows===6));
    assert.equal(await read(()=>JSON.stringify(get(first).data)),await read(()=>saved),'native space edits preserve diagram data');
    await read(()=>api.updateObjectAsset(space,{data:space.data}));
    const toolbar=await read(()=>{const doc=spaceInput.activeRenderer.editor.environment.document,bar=doc.querySelector('.workspace-native-toolbar'),canvas=doc.getElementById('mosaic-canvas');return {bottom:bar.getBoundingClientRect().bottom,canvasTop:canvas.getBoundingClientRect().top,align:getComputedStyle(bar).justifyContent};});
    assert(toolbar.bottom<=toolbar.canvasTop+1&&toolbar.align==='flex-end','canvas toolbar stays above the canvas and aligned right: '+JSON.stringify(toolbar));
    const screenshot=await client.send('Page.captureScreenshot',{format:'png'});const image=path.join(os.tmpdir(),'math-workspace-mosaic-space.png');fs.writeFileSync(image,Buffer.from(screenshot.data,'base64'));console.log('Screenshot: '+image);
    const snapshots=await read(()=>panels.capturePanels());
    assert(snapshots.length>=5);
    const extra=await read(()=>['mosaic-seifert','mosaic-poincare'].map(type=>{const p=panels.open(type,key(first),'side');const mounted=!!p.propertyRenderer;panels.move(p,'hidden');return mounted;}));
    assert(extra.every(Boolean),'Mosaic surface display and background properties remain available');
    assert(await read(()=>!MathWorkspaceObjects.capabilities['mosaic-diagram'].properties.some(id=>['mosaic-knot','mosaic-dual','mosaic-seifert'].includes(id))),'knot / graph properties move to independent assets; the surface is a view');
    await read(()=>{window.backup=panels.exportText('workspace');window.beforeRestore=JSON.stringify(api.localAssetSnapshot().assets);panels.importText('workspace',backup);});
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets.map(a=>[key(a),a.data]))),await read(()=>JSON.stringify(JSON.parse(beforeRestore).map(a=>[key(a),a.data]))),'workspace backup roundtrip preserves Mosaic assets');
    await read(()=>{window.beforeImport=api.localAssetSnapshot().assets.length;api.openCanvas('mosaic');api.sessions.get('mosaic').editor.environment.document.querySelector('[data-mosaic-save-assets]').click();});
    await waitFor(()=>read(()=>api.localAssetSnapshot().assets.length===beforeImport+2));
    assert(await read(()=>{const a=api.localAssetSnapshot().assets.at(-1);return a.kind==='mosaic-diagram'&&a.dependencies[0].kind==='mosaic-space';}),'existing Mosaic can be saved as linked assets');
    console.log('PASS Mosaic assets: shared space, independent diagrams, native inputs, canvas/properties, lossless invalidation and panel capture');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
