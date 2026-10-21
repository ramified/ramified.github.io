'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.y=api.createObjectAsset('young',{data:{rows:[3,1]}});window.g=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.k=api.createObjectAsset('field');
      window.modify=asset=>{document.querySelector('[data-asset-key="'+key(asset)+'"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent==='Modify').click();window.editor=[...panels.panels.values()].filter(p=>p.assetKey===key(asset)&&p.definition.input&&!p.closed).at(-1);};
      window.assetsPane=()=>document.querySelector('.workspace-assets-view').closest('[data-pane]')?.dataset.pane;
      api.openCanvas('assets');window.initialPane=assetsPane();modify(y);
    });
    assert.equal(await read(()=>document.getElementById('workspace-canvas-panes').dataset.split),'true');
    assert.equal(await read(()=>assetsPane()),await read(()=>initialPane));
    assert(await read(()=>editor.node.getClientRects().length>0&&editor.node.closest('[data-pane]').dataset.pane!==assetsPane()));
    await read(()=>{window.originalEditor=editor;panels.move(editor,'hidden');modify(y);});
    assert(await read(()=>editor===originalEditor),'closed Modify panels are reused');
    for(const variable of ['g','k']){
      await read(variable=>modify(window[variable]),variable);
      assert.equal(await read(()=>assetsPane()),await read(()=>initialPane));
      assert(await read(()=>editor.node.getClientRects().length>0&&editor.node.closest('[data-pane]').dataset.pane!==assetsPane()));
    }
    // Clicking the Assets tab swaps it to the opposite pane; Modify preserves it there.
    await read(()=>{api.selectCanvasTab('assets');window.swappedPane=assetsPane();modify(y);});
    assert.notEqual(await read(()=>swappedPane),await read(()=>initialPane));
    assert.equal(await read(()=>assetsPane()),await read(()=>swappedPane));
    await read(()=>{window.property=panels.open('weight','','side',{refs:{lambda:key(y),lie:key(g)}});property.node.querySelector('[aria-label="Edit Lie type"]').click();});
    assert.equal(await read(()=>assetsPane()),await read(()=>swappedPane));
    assert(await read(()=>[...panels.panels.values()].some(p=>p.definition.id==='lie-input'&&p.node.getClientRects().length&&p.node.closest('[data-pane]')?.dataset.pane!==assetsPane())));
    await read(()=>{const backup=panels.exportText('workspace');panels.importText('workspace',backup);});
    assert.equal(await read(()=>assetsPane()),await read(()=>swappedPane));
    assert.equal(await read(()=>document.getElementById('workspace-canvas-panes').dataset.split),'true');
    // Assets in the sidebar is already visible beside the editor.
    await read(()=>{api.setSplitView(false);api.selectCanvasTab('assets');window.scrollTo(0,0);});
    const start=await read(()=>{const r=document.querySelector('[data-canvas-tab="assets"]').getBoundingClientRect();return{x:r.left+20,y:r.top+12};});
    await mouse(client,'mouseMoved',start.x,start.y,0);await mouse(client,'mousePressed',start.x,start.y,1);await mouse(client,'mouseMoved',start.x+8,start.y+8,1);
    await waitFor(()=>read(()=>!!document.querySelector('#workspace-card-drag-ghost')));
    const end=await read(()=>{const r=document.querySelector('.workspace-inspector-head').getBoundingClientRect();return{x:r.left+80,y:r.bottom+20};});
    await mouse(client,'mouseMoved',end.x,end.y,1);await mouse(client,'mouseReleased',end.x,end.y,0);
    await waitFor(()=>read(()=>!!document.querySelector('[data-docked-panel="assets"]')));
    await read(()=>modify(g));
    assert.equal(await read(()=>document.querySelector('[data-docked-panel="assets"]').hidden),false);
    assert.equal(await read(()=>document.getElementById('workspace-canvas-panes').dataset.split),'false');
    assert(await read(()=>editor.node.getClientRects().length>0));
    assert.deepEqual(errors,[]);
    console.log('PASS Modify beside Assets, both pane orientations, closed reuse, property Edit, backups and docked sidebar placement');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
