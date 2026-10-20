'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
 const server=await startServer();let session;
 try{
  session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
  const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
  await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
  await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.asset=api.createObjectAsset('young',{data:{partition:'3,2'}});window.view=panels.open('young-view',key(asset),'main');});
  const drag=async delta=>{const start=await read(()=>{const handle=document.getElementById('workspace-canvas-resizer');handle.scrollIntoView({block:'center'});const rect=handle.getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2,height:Number(handle.getAttribute('aria-valuenow'))};});await mouse(client,'mouseMoved',start.x,start.y,0);await mouse(client,'mousePressed',start.x,start.y,1);for(let step=1;step<=5;step++)await mouse(client,'mouseMoved',start.x,start.y+delta*step/5,1);await mouse(client,'mouseReleased',start.x,start.y+delta,0);await waitFor(()=>read(height=>Number(document.getElementById('workspace-canvas-resizer').getAttribute('aria-valuenow'))===height,start.height+delta));return start.height+delta;};
  const height=await drag(100);
  assert.equal(await read(()=>api.canvasHeightFor(view.id)),height,'resizer stores object view height');
  assert.equal(await read(()=>getComputedStyle(view.head).display),'none','main-area views have no card header');
  await read(()=>{window.property=panels.open('statistics',key(asset),'main');});
  const propertyHeight=await drag(60);assert.equal(await read(()=>api.canvasHeightFor(property.id)),propertyHeight,'property results can be resized');
  await read(()=>{panels.move(property,'side');});
  assert.notEqual(await read(()=>getComputedStyle(property.head).display),'none','right sidebar retains its card header');
  await read(()=>{property.node.classList.add('collapsed');panels.syncPresentation(property.id);panels.move(property,'main');});
  assert.equal(await read(()=>property.collapsed),false,'a main-area panel cannot remain collapsed with its header hidden');
  assert.equal(await read(()=>api.canvasHeightFor(property.id)),propertyHeight,'height survives moving out of the main area and back');
  await read(()=>{api.openCanvas('mosaic');});
  const calculatorHeight=await drag(40);assert.equal(await read(()=>api.canvasHeightFor('mosaic')),calculatorHeight,'calculator canvases share the resizer');
  await read(()=>{window.frame=api.createObjectAsset('frame',{data:{ambientDimension:3}});window.point=api.createObjectAsset('point',{data:{ambientDimension:3}});window.geometry=panels.open('geometry-view',key(point),'main');geometry.computation.refs.frame=key(frame);panels.refresh();window.matrix=api.createObjectAsset('matrix',{data:{rows:2,cols:2}});window.matrixView=panels.open('matrix-view',key(matrix),'main');api.setSplitView(true);document.getElementById('workspace-canvas-pane-secondary').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));api.selectCanvasTab(geometry.id);});
  const before=await read(()=>geometry.propertyRenderer.host.getBoundingClientRect().height);
  const splitHeight=await drag(70);
  assert.equal(await read(()=>api.canvasHeightFor(geometry.id)),splitHeight);assert.equal(await read(()=>api.canvasHeightFor(matrixView.id)),splitHeight,'the bottom handle resizes both visible panes');
  assert(await read(previous=>geometry.propertyRenderer.host.getBoundingClientRect().height>previous+40,before),'the actual geometry surface grows with its canvas');
  await drag(-90);
  assert.equal(await read(()=>[...document.querySelectorAll('.workspace-canvas-pane-slot .card-head')].filter(head=>head.getClientRects().length).length),0,'both split panes hide every outer card header');
  assert.equal(await read(()=>[...geometry.propertyRenderer.editor.shadow.querySelectorAll('.card-head')].filter(head=>head.getClientRects().length).length),0,'native shadow-root headers are hidden in the main area');
  await read(()=>{window.expected=api.canvasHeightFor(geometry.id);const backup=panels.exportText('workspace');panels.importText('workspace',backup);});
  assert.equal(await read(()=>api.canvasHeightFor(geometry.id)),await read(()=>expected),'workspace backups retain object panel heights');
  assert.equal(await read(()=>api.canvasHeightFor(matrixView.id)),await read(()=>expected));
  await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:500,deviceScaleFactor:1,mobile:false});
  await read(()=>{api.setSplitView(false);window.shortView=panels.open('young-view',key(asset),'main');});
  await waitFor(()=>read(()=>Number(document.getElementById('workspace-canvas-resizer').getAttribute('aria-valuenow'))<420));
  const shortHeight=await drag(20);
  assert(shortHeight<420,'dragging a short auto-sized view must not jump to the old minimum');
  await read(()=>{const saved=panels.exportText('workspace');panels.importText('workspace',saved);});
  assert.equal(await read(()=>api.canvasHeightFor(shortView.id)),shortHeight,'short manually resized height survives backup');
  console.log('math_workspace_layout_ui_test: real resizer drags, views, properties, calculators, split panes, sidebar headers and height restoration passed');
 }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
