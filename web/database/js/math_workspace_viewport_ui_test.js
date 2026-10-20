'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
 const server=await startServer();let session;
 try{
  session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
  const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  const settle=()=>read(()=>new Promise(resolve=>{let n=5;const tick=()=>--n?requestAnimationFrame(tick):resolve();requestAnimationFrame(tick);}));
  const errors=[];await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
  await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:2,mobile:false});
  await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.asset=api.createObjectAsset('young',{data:{partition:'3,2'}});window.view=panels.open('young-view',key(asset),'main');window.original=view.propertyRenderer;window.beforeAssets=JSON.stringify(api.localAssetSnapshot());});
  await settle();
  assert.deepEqual(await read(()=>['grid-cols','grid-rows'].map(id=>view.propertyRenderer.editor.shadow.getElementById(id).value)),['5','5']);
  let categoryPosition;
  const fit=async(name,selector)=>{
   await settle();
   const result=await read((name,selector)=>{const p=window[name],editor=p.propertyRenderer?.editor||p.editor,root=editor.shadow,canvas=root.querySelector(selector),area=root.querySelector('.workspace-native-content')||root.querySelector('#canvas-wrap,.sheaf-workspace,.ramification-stage'),c=canvas.getBoundingClientRect(),a=area.getBoundingClientRect();return {canvas:{x:c.x,y:c.y,width:c.width,height:c.height},area:{x:a.x,y:a.y,width:a.width,height:a.height},fits:c.width>0&&c.height>0&&c.left>=a.left-2&&c.top>=a.top-2&&c.right<=a.right+2&&c.bottom<=a.bottom+2,labelPosition:name==='categoryView'?(()=>{const entry=editor.captureAssetLayout().find(item=>item.key.startsWith('category:'));return entry?[entry.point.x,entry.point.y]:null;})():null,viewport:editor.getViewport(),style:canvas.parentElement.getAttribute('style'),canvasStyle:canvas.getAttribute('style'),status:document.getElementById('workspace-status')?.textContent};},name,selector);
   assert(result.fits,name+' canvas must fit its drawing area: '+JSON.stringify(result));
   if(result.labelPosition){if(categoryPosition)assert(result.labelPosition.every((v,i)=>Math.abs(v-categoryPosition[i])<.005),'category labels must keep their relative canvas positions');else categoryPosition=result.labelPosition;}
   return result;
  };
  await fit('view','#yd-canvas');
  const initialShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-young-default.png'),Buffer.from(initialShot.data,'base64'));
  assert(await read(()=>document.querySelector('.workspace-view-card').getBoundingClientRect().bottom<=innerHeight),'automatic main height fits screen');
  await read(()=>{api.setSplitView(true);});await fit('view','#yd-canvas');
  await read(()=>{api.setSplitView(false);panels.move(view,'side');});await fit('view','#yd-canvas');
  assert(await read(()=>view.propertyRenderer===original),'moving never remounts the renderer');
  assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot())),await read(()=>beforeAssets),'layout changes do not mutate Assets');
  await read(()=>{panels.move(view,'main');const root=view.propertyRenderer.editor.shadow;root.getElementById('showcoords').click();window.field=root.getElementById('grid-rows');field.focus();field.select();});
  for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  await client.send('Emulation.setDeviceMetricsOverride',{width:1100,height:640,deviceScaleFactor:2,mobile:false});await settle();
  assert.equal(await read(()=>field.value),'','resize preserves a focused empty draft');
  assert(await read(()=>view.propertyRenderer.editor.shadow.activeElement===field));
  await client.send('Input.insertText',{text:'15'});await read(()=>field.blur());
  await read(()=>{const c=view.propertyRenderer.editor.shadow.getElementById('grid-cols');c.value='25';c.dispatchEvent(new Event('change',{bubbles:true}));});
  await fit('view','#yd-canvas');
  const point=await read(()=>{const r=view.propertyRenderer.editor.shadow.getElementById('yd-canvas').getBoundingClientRect();return {x:r.left+r.width/25*.5,y:r.top+r.height/15*.5};});
  await mouse(client,'mousePressed',point.x,point.y,1);await mouse(client,'mouseReleased',point.x,point.y,0);
  await waitFor(()=>read(()=>api.localAssetSnapshot().assets.find(a=>a.id===asset.id).data.rows.length===0));
  await read(()=>{window.signed=api.createObjectAsset('young',{type:'generalized',data:{partition:'8,2,0,-3'}});window.signedView=panels.open('young-view',key(signed),'main');});await fit('signedView','#yd-canvas');
  await read(()=>{window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:5}});window.dynkin=api.createObjectAsset('dynkin',{data:{lie:key(lie)}});window.dynkinView=panels.open('dynkin-view',key(dynkin),'main');});await fit('dynkinView','#dynkin-canvas');
  await read(()=>{window.strands=api.createObjectAsset('strands',{data:{lie:key(lie),generators:[{family:'coxeter',index:1}]}});window.strandView=panels.open('strands-view',key(strands),'main');});await fit('strandView','#strand-canvas');
  await read(()=>{window.pointAsset=api.createObjectAsset('point',{data:{ambientDimension:3,position:[1,2,3]}});window.geometryView=panels.open('geometry-view',key(pointAsset),'main');});await fit('geometryView','#slice-viewport');
  await read(()=>{window.category=api.createObjectAsset('category');window.categoryView=panels.open('category-diagram',key(category),'main');});await fit('categoryView','.sheaf-stage');
  await read(()=>{window.lambda=api.createObjectAsset('young',{data:{partition:'2'}});window.mu=api.createObjectAsset('young',{data:{partition:'1,1'}});window.sliceLie=api.createObjectAsset('lie',{data:{family:'A',rank:2}});window.weightSlice=panels.open('slice','','main',{refs:{lambda:key(lambda),mu:key(mu),lie:key(sliceLie)}});});await fit('weightSlice','#slice-canvas');
  for(const [id,selector] of [['mosaic','#mosaic-canvas'],['places','#ramification-canvas'],['sheaf-complexes','#sheaf-canvas']]){
   await read(id=>{api.openCanvas(id);window.legacy=api.sessions.get(id);},id);await fit('legacy',selector);
  }
  for(const [name,selector] of [['signedView','#yd-canvas'],['dynkinView','#dynkin-canvas'],['strandView','#strand-canvas'],['geometryView','#slice-viewport'],['categoryView','.sheaf-stage'],['weightSlice','#slice-canvas']]){
   await read(name=>panels.move(window[name],'side'),name);await fit(name,selector);
   await read(name=>{panels.move(window[name],'main');api.setSplitView(true);},name);await fit(name,selector);
   await read(()=>api.setSplitView(false));
  }
  await read(()=>{api.selectCanvasTab(view.id);window.saved=panels.exportText('workspace');panels.importText('workspace',saved);window.restored=panels.panels.get(view.id);});await settle();
  assert.deepEqual(await read(()=>['grid-cols','grid-rows'].map(id=>restored.propertyRenderer.editor.shadow.getElementById(id).value)),['25','15']);
  assert(await read(()=>restored.propertyRenderer.editor.shadow.getElementById('showcoords').checked));
  await fit('restored','#yd-canvas');
  const screenshot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-viewport.png'),Buffer.from(screenshot.data,'base64'));
  assert.deepEqual(errors,[]);console.log('math_workspace_viewport_ui_test: main/split/side fit, 5x5 defaults, drafts, DPR clicks, Assets, backup and calculator canvases passed');
 }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
