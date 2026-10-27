'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){const server=await startServer();let session;
try{
  session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
  await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
  const controls=await read(()=>{
    window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(x=>key(x)===key(a));
    window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.point=api.createObjectAsset('point',{data:{ambientDimension:3}});window.lattice=api.createObjectAsset('lattice',{data:{ambientDimension:3,basisMode:'dynkin',lie:key(lie)}});
    const results=[];
    for(const kind of ['polytope','sphere','point','vector','roots','lattice','voronoi','formula','tropical','weyl']){
      const asset=kind==='point'?point:kind==='lattice'?lattice:api.createObjectAsset(kind,{data:{ambientDimension:3,...(['roots','weyl'].includes(kind)?{lie:key(lie)}:{}),...(kind==='voronoi'?{lattice:key(lattice),point:key(point)}:{})}});
      const panel=panels.open(kind+'-input',key(asset),'side'),root=panel.activeRenderer.editor.inspectorShadow;
      results.push({kind,visible:['object-color','object-opacity','object-point-size','object-line-width','object-visible-projection','object-visible-slice','object-labels','source-status','source-mode-controls','source-add-object','object-name','object-select'].filter(id=>root.querySelector('#'+id)?.getClientRects().length)});
      if(kind==='vector'){window.v=asset;window.vi=panel;}
    }return results;
  });
  assert.deepEqual(controls.filter(item=>item.visible.length),[],'all ten geometric editor families exclude view-only controls');
  await read(()=>{
    window.frame=api.createObjectAsset('frame',{data:{ambientDimension:3}});window.scene=panels.open('slicing-scene','','main',{refs:{frame:key(frame),nodes:[key(v)]}});window.otherScene=panels.compare(scene);
    window.display=panels.open('slicing-display','','side');display.viewSelect.value=scene.id;display.viewSelect.dispatchEvent(new Event('change'));
    window.layer=(panel,asset)=>panel.propertyRenderer.editor.objectIO('view').layers.find(([id])=>id===key(asset))[1];
    window.originalColor=layer(otherScene,v).style.color;window.vectorData=JSON.stringify(get(v).data);window.revision=api.localAssetSnapshot().revision;
    const root=display.propertyRenderer.editor.inspectorShadow,color=root.querySelector('#object-color');color.value='#ff0000';color.dispatchEvent(new Event('input',{bubbles:true}));
    root.querySelector('#object-visible-projection').click();
  });
  await waitFor(()=>read(()=>layer(scene,v).style.color==='#ff0000'));
  assert.equal(await read(()=>layer(scene,v).visibleProjection),false);
  assert.equal(await read(()=>layer(otherScene,v).style.color),await read(()=>originalColor));
  assert.equal(await read(()=>JSON.stringify(get(v).data)),await read(()=>vectorData));assert.equal(await read(()=>api.localAssetSnapshot().revision),await read(()=>revision));
  await read(()=>{
    window.c=api.createObjectAsset('complex',{data:{legacy:{id:'imported-C',kind:'chain-complex',objects:['A','B'],maps:['f'],display:'snake-les',snakeLayout:{firstRowSize:1,startIndex:0},selected:false}}});
    window.cv=panels.open('complex-view',key(c),'main');window.cc=panels.compare(cv);window.layout=panel=>panel.propertyRenderer.editor.shadow.querySelector('[aria-label="Complex display layout"]');
  });
  assert.equal(await read(()=>get(c).data.legacy.display),undefined);assert.equal(await read(()=>get(c).data.legacy.selected),undefined);
  assert.equal(await read(()=>layout(cv).value),'snake');assert.equal(await read(()=>layout(cc).value),'snake');
  await read(()=>{window.complexData=JSON.stringify(get(c).data);layout(cc).value='inline';layout(cc).dispatchEvent(new Event('change'));});
  assert.equal(await read(()=>layout(cv).value),'snake');assert.equal(await read(()=>JSON.stringify(get(c).data)),await read(()=>complexData));
  await read(()=>{
    window.saved=JSON.parse(panels.exportText('workspace'));window.ids={scene:scene.id,other:otherScene.id,cv:cv.id,cc:cc.id};
    // Simulate an older backup with presentation embedded in its math records.
    const savedC=saved.assets.find(x=>x.id===c.id);savedC.data.legacy.display='snake-les';savedC.data.legacy.selected=false;savedC.data.legacy.snakeLayout={firstRowSize:1,startIndex:0};
    for(const p of saved.panels.filter(p=>p.computation?.refs.asset===key(c)&&p.id!==cc.id))delete p.computation.options.presentation;
    const variety=api.createObjectAsset('variety');window.varietyKey=key(variety);saved.assets.push({...get(variety),data:{...get(variety).data,workspaceSheafComplex:{payload:{type:'abstract',dim:3,labelX:.25,labelY:.75,hiddenOnCanvas:true}}}});
    const clean=saved.workspace.viewDefaults.filter(([key])=>key!==window.key(c));saved.workspace.viewDefaults=clean;
    panels.importText('workspace',JSON.stringify(saved));
    window.restored=panels.panels;window.restoredC=api.localAssetSnapshot().assets.find(x=>x.id===c.id);
  });
  assert.equal(await read(()=>restoredC.data.legacy.display),undefined);assert.equal(await read(()=>restoredC.data.legacy.selected),undefined);
  assert.equal(await read(()=>layout(restored.get(ids.cv)).value),'snake');assert.equal(await read(()=>layout(restored.get(ids.cc)).value),'inline');
  assert.equal(await read(()=>layer(restored.get(ids.scene),v).style.color),'#ff0000');assert.equal(await read(()=>layer(restored.get(ids.scene),v).visibleProjection),false);
  assert.equal(await read(()=>layer(restored.get(ids.other),v).style.color),await read(()=>originalColor));
  await read(()=>{window.overview=panels.openOverview('sheaf-view',varietyKey);panels.move(overview,'main');});
  assert.deepEqual(await read(()=>{const point=overview.propertyRenderer.editor.captureAssetLayout().find(item=>item.key===varietyKey).point;return {x:point.x,y:point.y,hidden:point.hidden};}),{x:.25,y:.75,hidden:true},'migrated drawing defaults reach the actual view');
  const clean=await read(()=>JSON.parse(panels.exportText('workspace')));
  assert.equal(clean.assets.find(a=>a.kind==='variety'&&a.data.workspaceSheafComplex).data.workspaceSheafComplex.payload.labelX,undefined);
  assert(clean.workspace.viewDefaults.some(([key,view])=>key.startsWith('variety:')&&view.sheaf?.labelX===.25&&view.sheaf.hiddenOnCanvas));
  await client.send('Page.reload');await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
  await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),JSON.stringify(clean));
  assert.equal(await read(id=>MathWorkspaceObjectPanels.panels.get(id).propertyRenderer.editor.shadow.querySelector('[aria-label="Complex display layout"]').value,clean.panels.find(p=>p.comparison&&p.type==='complex-view').id),'inline');
  fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-presentation.png'),Buffer.from((await client.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.deepEqual(errors,[]);console.log('Presentation UI: ten geometry families, bound colors/visibility, independent comparisons, legacy migration and portable backups passed');
}finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}}
run().catch(error=>{console.error(error);process.exitCode=1;});
