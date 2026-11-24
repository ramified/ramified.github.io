'use strict';
// Closing every main-area panel, Assets included, must leave a visible way back:
// the empty main area offers actions, and the tab bar keeps a + menu.
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!document.querySelector('[data-canvas-tab="assets"]')),20000);
    // The engine loader box is prepended to <main> while resources load and shifts the page,
    // so press only once the target is unobstructed and has stopped moving.
    const point=selector=>read(selector=>{const node=document.querySelector(selector);if(!node)throw new Error('Missing '+selector);node.scrollIntoView({block:'nearest'});const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,clear:!!hit&&(hit===node||node.contains(hit))&&!document.getElementById('workspace-engine-loader')?.getClientRects().length};},selector);
    const stablePoint=selector=>{let last=null;return waitFor(async()=>{const next=await point(selector),same=last&&next.clear&&Math.abs(next.x-last.x)<1&&Math.abs(next.y-last.y)<1;last=next;if(!same)await new Promise(resolve=>setTimeout(resolve,60));return same&&next;},15000,'a settled '+selector);};
    const click=async selector=>{const {x,y}=await stablePoint(selector);await mouse(client,'mouseMoved',x,y,0);await mouse(client,'mousePressed',x,y,1);await mouse(client,'mouseReleased',x,y,0);};
    const key=async(key,code,virtual)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:virtual});};
    const empty=()=>read(()=>{const node=document.querySelector('#workspace-canvas-pane-primary .workspace-canvas-empty');return node&&{state:node.dataset.canvasEmpty,text:node.textContent,actions:[...node.querySelectorAll('[data-canvas-empty-action]')].map(b=>b.dataset.canvasEmptyAction),visible:node.getClientRects().length>0};});
    const assetsInMain=()=>read(()=>!!document.querySelector('#workspace-canvas-pane-primary .workspace-assets-view')?.getClientRects().length&&!!document.querySelector('[data-canvas-tab="assets"]'));
    const menu=()=>read(()=>{const m=document.getElementById('workspace-assets-context-menu');return{open:!m.hidden,owner:m.dataset.menuOwner||'',items:[...m.querySelectorAll(':scope > button')].map(b=>({label:b.textContent,disabled:b.disabled,checked:b.dataset.checked==='true'})),expanded:document.querySelector('[data-workspace-add-tab]').getAttribute('aria-expanded')};});
    const menuItem=label=>read(label=>{const items=[...document.querySelectorAll('#workspace-assets-context-menu > button')];const index=items.findIndex(b=>b.textContent===label);if(index<0)throw new Error('Missing menu item '+label);items.forEach(b=>delete b.dataset.testTarget);items[index].dataset.testTarget='';return '#workspace-assets-context-menu > [data-test-target]';},label);
    const closeAssetsTab=()=>click('[data-canvas-tab="assets"] + .workspace-canvas-tab-close');
    const dragAssetsToSidebar=async()=>{
      const start=await stablePoint('[data-canvas-tab="assets"]');
      await mouse(client,'mouseMoved',start.x,start.y,0);await mouse(client,'mousePressed',start.x,start.y,1);await mouse(client,'mouseMoved',start.x+8,start.y+8,1);
      await waitFor(()=>read(()=>!!document.querySelector('#workspace-card-drag-ghost')));
      const end=await read(()=>{const r=document.querySelector('.workspace-inspector-head').getBoundingClientRect();return{x:r.left+80,y:r.bottom+20};});
      await mouse(client,'mouseMoved',end.x,end.y,1);await mouse(client,'mouseReleased',end.x,end.y,0);
      await waitFor(()=>read(()=>!!document.querySelector('[data-docked-panel="assets"]')&&!document.querySelector('[data-canvas-tab="assets"]')));
    };

    // The + button sits after the last tab, and the tab bar stays visible.
    assert.equal(await read(()=>document.querySelector('#workspace-canvas-tabs > :last-child').matches('[data-workspace-add-tab]')),true);

    // 1. Closing the last tab, Assets, explains the state and focuses a way back.
    await closeAssetsTab();
    let state=await empty();
    assert.equal(state?.state,'all-closed');assert.equal(state.visible,true);
    assert.deepEqual(state.actions,['assets','new-object','add-panel']);
    assert.match(state.text,/All panels are closed/);assert.doesNotMatch(state.text,/Open an object from Assets or choose Add panel/);
    assert.equal(await read(()=>document.activeElement?.dataset.canvasEmptyAction),'assets','focus moves from the removed close button to the first action');
    assert.equal(await read(()=>getComputedStyle(document.getElementById('workspace-canvas-tabs')).display!=='none'),true,'the + button keeps the tab bar visible');
    await click('[data-canvas-empty-action="assets"]');
    await waitFor(()=>assetsInMain());assert.equal(await empty(),null);

    // 2. New object opens Assets first, so the created object will be visible.
    await closeAssetsTab();await click('[data-canvas-empty-action="new-object"]');
    await waitFor(()=>read(()=>[...document.querySelectorAll('dialog')].some(d=>d.open)));
    assert.equal(await assetsInMain(),true);
    await key('Escape','Escape',27);await waitFor(()=>read(()=>![...document.querySelectorAll('dialog')].some(d=>d.open)));

    // 3. Add panel… opens the existing picker, which can also bring Assets back.
    await closeAssetsTab();await click('[data-canvas-empty-action="add-panel"]');
    await waitFor(()=>read(()=>!document.getElementById('workspace-card-picker').hidden));
    assert.equal(await read(()=>!!document.querySelector('#workspace-card-options [data-card-key="assets"]')),true);
    await click('#workspace-add-card');await waitFor(()=>read(()=>document.getElementById('workspace-card-picker').hidden));

    // 4. The + menu: Escape returns focus, the button toggles, and Assets reopens.
    await click('[data-workspace-add-tab]');
    let opened=await menu();
    assert.equal(opened.open,true);assert.equal(opened.owner,'add-tab');assert.equal(opened.expanded,'true');
    assert.deepEqual(opened.items.map(i=>i.label),['Assets','New object…','Add panel…']);
    assert.equal(opened.items[0].disabled,false);
    await key('ArrowDown','ArrowDown',40);
    assert.equal(await read(()=>document.activeElement?.textContent),'New object…','arrow keys move through the menu');
    await key('Escape','Escape',27);
    opened=await menu();assert.equal(opened.open,false);assert.equal(opened.expanded,'false');
    assert.equal(await read(()=>document.activeElement?.matches('[data-workspace-add-tab]')),true);
    await click('[data-workspace-add-tab]');assert.equal((await menu()).open,true);
    await click('[data-workspace-add-tab]');assert.equal((await menu()).open,false,'a second click closes the menu');
    await click('[data-workspace-add-tab]');await click(await menuItem('Assets'));
    await waitFor(()=>assetsInMain());assert.equal((await menu()).open,false);

    // While Assets is shown, its + menu entry is marked and inactive.
    await click('[data-workspace-add-tab]');opened=await menu();
    assert.deepEqual([opened.items[0].disabled,opened.items[0].checked],[true,true]);
    await key('Escape','Escape',27);

    // 5. Assets docked in the side panels: point there instead of offering to reopen it.
    await dragAssetsToSidebar();
    state=await empty();
    assert.equal(state?.state,'assets-side');assert.deepEqual(state.actions,['new-object','add-panel']);assert.match(state.text,/side panels/);
    await click('[data-workspace-add-tab]');opened=await menu();
    assert.equal(opened.items[0].disabled,false,'Assets can be moved from the side panels to the main area');
    await click(await menuItem('Assets'));
    await waitFor(()=>assetsInMain());
    assert.equal(await read(()=>!!document.querySelector('#workspace-cards [data-docked-panel="assets"]:not([hidden])')),false);

    // 6. Docked and then hidden: the empty main area still reopens Assets in the main area.
    await dragAssetsToSidebar();
    await click('[data-docked-panel="assets"] [data-workspace-card-action="hide"]');
    await waitFor(()=>read(()=>document.querySelector('[data-docked-panel="assets"]')?.hidden!==false));
    assert.equal((await empty())?.state,'all-closed');
    await click('[data-canvas-empty-action="assets"]');
    await waitFor(()=>assetsInMain());

    assert.deepEqual(errors,[]);
    console.log('empty main area: actions after closing Assets, New object, Add panel, + menu keyboard/toggle, docked and hidden Assets passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
