'use strict';
const assert = require('node:assert/strict');
const {startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse} = require('./math_workspace_drag_regression_test.js');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/math_workspace.html`);
    const {client} = session;
    const read = (fn, ...args) => evaluate(client, `(${fn.toString()})(...${JSON.stringify(args)})`);
    await client.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.a = api.createObjectAsset('variety', {name: 'TouchA'});
      window.b = api.createObjectAsset('variety', {name: 'TouchB'});
      api.state.showDefaults = false;
      api.applyAssetSnapshot(api.localAssetSnapshot());
    });
    const position = selector => read(selector => {
      const node = document.querySelector(selector); node.scrollIntoView({block:'center'});
      const r = node.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
    }, selector);
    const item = n => `[data-asset-key="variety:${n}"]`;
    const ids = await read(() => [a.id,b.id]);
    const send = (type, p) => client.send('Input.dispatchTouchEvent', {type, touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
    const tap = async p => {await send('touchStart',p);await send('touchEnd');await delay(60);};
    const hold = async p => {await send('touchStart',p);await delay(600);await send('touchEnd');await delay(60);};
    const menu = () => read(() => !document.querySelector('#workspace-assets-context-menu').hidden);
    const menuAction = async label => {
      const p = await read(label => {const b=[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent===label);const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};},label);
      await tap(p);
    };
    await tap(await position(item(ids[0])));
    assert.equal(await read(() => api.state.selected.size),1);
    await hold(await position(item(ids[0])));
    assert(await menu(),'long press opens context menu');
    assert(await read(() => document.querySelector('#workspace-assets-context-menu').classList.contains('workspace-touch-menu')));
    await menuAction('Select multiple');
    await tap(await position(item(ids[1])));
    assert.equal(await read(() => api.state.selected.size),2,'tap adds to multi selection');
    await hold(await position(item(ids[0])));
    assert.equal(await read(() => api.state.selected.size),2,'long press preserves group');
    assert(await read(() => [...document.querySelectorAll('#workspace-assets-context-menu button')].some(b=>b.textContent==='Delete 2 assets')));
    await menuAction('Finish multiple selection');
    await tap(await position(item(ids[0])));
    // Touch cascades expand on tap, remain inside the viewport and can close again.
    await hold(await position(item(ids[0])));
    await menuAction('Properties›');
    assert(await read(() => !!document.querySelector('.workspace-touch-menu [data-open="true"]')));
    assert(await read(() => document.querySelector('.workspace-touch-menu').getBoundingClientRect().bottom <= innerHeight));
    await menuAction('Properties›');
    assert.equal(await read(() => !!document.querySelector('.workspace-touch-menu [data-open="true"]')),false);
    await tap({x:10,y:10});
    await read(() => {api.state.selected.clear();api.applyAssetSnapshot(api.localAssetSnapshot());});
    // A swipe before the hold threshold must not select a marquee or open a menu.
    const p = await position(item(ids[0]));
    await send('touchStart',p);await send('touchMove',{x:p.x,y:p.y-45});await send('touchEnd');await delay(600);
    assert(!await menu());
    assert.equal(await read(() => !!api.state.marquee),false);
    // Cancelled holds do not open menus or leave feedback behind.
    await send('touchStart',await position(item(ids[0])));await delay(550);await send('touchCancel');
    assert(!await menu());
    assert.equal(await read(() => document.querySelectorAll('[data-touch-held]').length),0);
    // Reuse the actual asset drop protocol, including acceptance and cleanup.
    await read(() => {
      const target=document.createElement('div'); target.id='touch-drop-test';
      Object.assign(target.style,{position:'fixed',left:'650px',top:'150px',width:'160px',height:'120px',zIndex:20000});
      target.addEventListener('dragover',e=>e.preventDefault());
      target.addEventListener('drop',e=>{e.preventDefault();window.dropped=[...e.dataTransfer.types];});
      document.body.append(target);
    });
    await send('touchStart',await position(item(ids[0])));await delay(550);
    await send('touchMove',{x:700,y:190});await send('touchEnd');
    assert((await read(() => window.dropped || [])).includes('text/plain'),'touch drag carries asset payload');
    assert.equal(await read(() => document.querySelectorAll('.workspace-touch-drag-ghost,[data-touch-held]').length),0);
    await read(() => document.querySelector('#touch-drop-test').remove());
    // Drop into the real native canvas through its shadow DOM.
    await read(() => {api.openCanvas('sheaf-complexes'); api.setSplitView(true);});
    await waitFor(() => read(() => !!api.sessions.get('sheaf-complexes')?.assetProjection),20000);
    const destination = await read(() => {const r=api.sessions.get('sheaf-complexes').host.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
    await send('touchStart',await position(item(ids[0])));await delay(550);
    await send('touchMove',destination);await send('touchEnd');
    assert(await read(() => api.sessions.get('sheaf-complexes').assetProjection.keys.has('variety:'+a.id)),'real canvas accepts touch asset drop');
    await read(() => {api.setSplitView(false);api.selectCanvasTab('assets');});
    // The visually thin resize grip also responds to a touch just outside it.
    const resize = await read(() => {const r=document.querySelector('#workspace-canvas-resizer').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top-4,height:document.querySelector('.workspace-view-card').getBoundingClientRect().height};});
    await send('touchStart',resize);await send('touchMove',{x:resize.x,y:resize.y+40});await send('touchEnd');
    assert(await read(h => document.querySelector('.workspace-view-card').getBoundingClientRect().height > h+20,resize.height),'touch resize hit area');
    // A double tap opens once, through the existing asset Open action.
    await read(() => {window.openCount=MathWorkspaceObjectPanels.panels.size;});
    await tap(await position(item(ids[1])));await tap(await position(item(ids[1])));
    assert(await read(() => MathWorkspaceObjectPanels.panels.size === openCount+1),'double tap opens one panel');
    // Tabs use the existing pointer drag path, without adding touch controls.
    const tab = await read(() => {const buttons=[...document.querySelectorAll('[data-canvas-tab]')];const r=buttons.at(-1).getBoundingClientRect();return {x:r.left+20,y:r.top+r.height/2};});
    await send('touchStart',tab);await send('touchMove',{x:tab.x+20,y:tab.y+20});
    assert(await read(() => !!document.querySelector('#workspace-card-drag-ghost')),'touch starts panel drag');
    await send('touchCancel');
    assert.equal(await read(() => !!document.querySelector('#workspace-card-drag-ghost')),false,'cancel cleans panel drag');
    await read(() => api.selectCanvasTab('assets'));
    // Actual mouse events still get the original compact menu.
    const m = await position(item(ids[0]));
    await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:m.x,y:m.y,button:'right',buttons:2,clickCount:1});
    await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:m.x,y:m.y,button:'right',buttons:0,clickCount:1});
    assert(await menu());
    assert.equal(await read(() => document.querySelector('#workspace-assets-context-menu').classList.contains('workspace-touch-menu')),false);
    console.log('PASS touch menus/cascades, multi selection, swipe/cancel, asset drop into native canvas, resize, double tap, panel drag/cancel, and mouse menu regression');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
