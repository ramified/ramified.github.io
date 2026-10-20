'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,delay,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.strands=api.createObjectAsset('strands',{data:{lie:key(lie),generators:[{family:'braid',index:1,sign:-1}]}});window.view=panels.open('strands-view',key(strands),'main');view.propertyRenderer.editor.resizeViewport(true);});
    await delay(150);
    const messages=await read(()=>({message:view.message.textContent,state:view.message.dataset.state}));console.log('Strands resize:',JSON.stringify(messages));
    await read(()=>{api.selectCanvasTab('assets');window.scrollTo(0,0);});
    const before=await read(()=>document.querySelector('.workspace-inspector').getBoundingClientRect().width);
    const start=await read(()=>{const r=document.querySelector('[data-canvas-tab="assets"]').getBoundingClientRect();return{x:r.left+20,y:r.top+12};});
    await mouse(client,'mouseMoved',start.x,start.y,0);await mouse(client,'mousePressed',start.x,start.y,1);await mouse(client,'mouseMoved',start.x+8,start.y+8,1);
    await waitFor(()=>read(()=>!!document.querySelector('#workspace-card-drag-ghost')));
    const end=await read(()=>{const r=document.querySelector('.workspace-inspector-head').getBoundingClientRect();return{x:r.left+80,y:r.bottom+20};});
    await mouse(client,'mouseMoved',end.x,end.y,1);await mouse(client,'mouseReleased',end.x,end.y,0);
    await waitFor(()=>read(()=>!!document.querySelector('[data-docked-panel="assets"]')));
    await read(()=>{api.state.layout='details';api.applyAssetSnapshot(api.localAssetSnapshot());});await delay(100);
    const dimensions=await read(()=>{const sidebar=document.querySelector('.workspace-inspector').getBoundingClientRect(),card=document.querySelector('[data-docked-panel="assets"]').getBoundingClientRect(),content=document.querySelector('[data-assets-content]');return {sidebar:sidebar.width,card:card.width,content:content.clientWidth,scrollWidth:content.scrollWidth,page:document.documentElement.scrollWidth,viewport:innerWidth};});console.log('Sidebar details:',JSON.stringify(dimensions));
    assert(!messages.message.includes('signed')&&messages.state!=='error','Strands resize must receive current diagram data');
    assert.equal(dimensions.sidebar,before);assert(dimensions.card<=dimensions.sidebar+1,'details must stay within the sidebar');assert(dimensions.page<=dimensions.viewport+1,'details must not widen the page');assert(dimensions.scrollWidth>dimensions.content,'wide details remain available through local scrolling');
    // Exercise signed types, empty words, viewport changes, and all placements.
    for(const family of ['A','B','C','D']){
      await read(family=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family,rank:family==='D'?4:3}});api.updateObjectAsset({kind:'strands',id:strands.id},{data:{lie:key(lie),generators:[]}});panels.move(view,'main');view.propertyRenderer.editor.resizeViewport(true);},family);await delay(80);
      assert.equal(await read(()=>view.message.dataset.state==='error'),false,family+' main');
      await read(()=>{panels.move(view,'side');view.propertyRenderer.editor.resizeViewport(true);});await delay(80);assert.equal(await read(()=>view.message.dataset.state==='error'),false,family+' side');
    }
    assert.deepEqual(errors,[]);console.log('Strands viewport data and bounded docked Assets details passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
