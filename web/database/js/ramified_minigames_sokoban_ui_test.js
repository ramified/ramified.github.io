'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html`);
    const { client } = session, errors = [];
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    });
    await client.send('Runtime.enable'); await client.send('Page.enable');
    const read = expression => evaluate(client, expression);
    const ready = async () => {
      try { return await waitFor(() => read('!!window.RamifiedMinigames?.player.state().canPrepare'), 15000, 'ready'); }
      catch (error) { console.error(await read(`({state:RamifiedMinigames.player.state(),phase:RamifiedMinigames.__test.getGame().phase,status:document.querySelector('#status-line').textContent,errors:document.querySelector('#player-message').textContent})`)); throw error; }
    };
    const click = async selector => {
      const p = await waitFor(() => read(`(() => { const n = [...document.querySelectorAll(${JSON.stringify(selector)})].find(n => n.getClientRects().length && !n.disabled); if (!n) return null; n.scrollIntoView({block:'nearest',inline:'nearest'}); const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2; return n.contains(document.elementFromPoint(x,y))?{x,y}:null; })()`), 5000, selector);
      await mouse(client, 'mousePressed', p.x, p.y, 1); await mouse(client, 'mouseReleased', p.x, p.y, 0);
    };
    // Existing game regressions explicitly use the first of the three collection saves.
    const chooseGame = async selector => { await click(selector); await click('#player-slot-1'); };
    const key = async (key, code, virtualKey) => {
      await client.send('Input.dispatchKeyEvent', { type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey, ...(key==='Enter'?{text:'\r'}:{}) });
      await client.send('Input.dispatchKeyEvent', { type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey });
    };
    const shot = async name => {
      if (!process.env.RAMIFIED_UI_SCREENSHOTS) return;
      fs.mkdirSync(process.env.RAMIFIED_UI_SCREENSHOTS, { recursive:true });
      const { data } = await client.send('Page.captureScreenshot', { format:'png' });
      fs.writeFileSync(path.join(process.env.RAMIFIED_UI_SCREENSHOTS, name+'.png'), Buffer.from(data,'base64'));
    };
    const progress = () => read('JSON.parse(localStorage.getItem(RamifiedSaveSlots.SAVE_KEY))?.slots[0]?.sokoban');
    const saveContents = () => read(`(() => { const s=JSON.parse(localStorage.getItem(RamifiedSaveSlots.SAVE_KEY))?.slots[0]?.game; if(s)delete s.payload.exportedAt; return s; })()`);
    const openMenu = async () => { await click('#fullscreen-settings-open'); await click('#player-menu-button'); };
    const levelSelect = async number => {
      await click('#player-level-'+number); await ready();
      if (await read('!document.querySelector("#player-confirm").hidden')) await click('#player-confirm-new');
      await waitFor(() => read('document.querySelector("#player-menu").hidden'), 5000, 'started level');
    };
    const solve = async (prefix = '') => {
      if (!await read('document.querySelector("#player-actions").open')) await click('#player-actions > summary');
      for (const d of 'EWSSNWWENN'.slice(prefix.length)) {
        const before = await read('RamifiedMinigames.__test.getGame().moves');
        await click(`#player-action-controls [data-move-dir="${d}"]`);
        await waitFor(() => read(`RamifiedMinigames.player.state().canPrepare && RamifiedMinigames.__test.getGame().moves > ${before}`), 5000, 'move '+d);
      }
      await waitFor(() => read('RamifiedMinigames.player.state().solved && !document.querySelector("#canvas-start-overlay").hidden'), 5000, 'solved');
    };
    await ready(); await click('#player-new'); await click('#player-games-next'); await chooseGame('[data-game-mode="sokoban"]');
    assert.strictEqual(await read('document.querySelectorAll("#player-level-list > button").length'),19);
    assert.deepStrictEqual(await read('[...document.querySelectorAll("#player-level-list > button:not(:disabled)")].map(n=>n.dataset.levelId)'), ['classic-fans','pedestrian','classic-fans-glue']);
    assert.strictEqual(await read('localStorage.getItem(RamifiedSaveSlots.SAVE_KEY)'),null, 'browsing does not create a save');
    for (const locale of ['en','zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      for (const [width,fullscreen] of [[1280,false],[390,false],[320,false],[1920,true],[320,true]]) {
        if (await read('!!document.fullscreenElement')) await read('document.exitFullscreen()');
        await client.send('Emulation.setDeviceMetricsOverride',{width,height:width>600?900:844,deviceScaleFactor:1,mobile:false});
        if (fullscreen) { await client.send('Runtime.evaluate',{expression:'RamifiedMinigames.player.fullscreen()',userGesture:true,awaitPromise:true}); await waitFor(()=>read('!!document.fullscreenElement')); }
        await read('document.querySelector("#player-levels").scrollTop=0'); await delay(60);
        assert.strictEqual(await read(`(() => { const p=document.querySelector('#player-levels'),g=document.querySelector('#player-level-list'),r=p.getBoundingClientRect(),b=g.getBoundingClientRect(); return p.scrollWidth<=p.clientWidth && Math.abs(b.x+b.width/2-(r.x+p.clientWidth/2))<1 && [...g.children].every(n=>n.getBoundingClientRect().height>=44); })()`),true,'bounded centered grid');
        await shot(`levels-${locale}-${width}-${fullscreen?'fullscreen':'frame'}`);
      }
    }
    await read('document.exitFullscreen()');
    await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    // Enter starts an unlocked level without a preparation page.
    await read('document.querySelector("#player-level-2").focus()'); await key('Enter','Enter',13); await ready();
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'pedestrian');
    await solve();
    assert.deepStrictEqual((await progress()).completed,['pedestrian']);
    assert.strictEqual((await progress()).unlocked.length,4);
    assert.strictEqual(await read('document.querySelector("#canvas-start-begin").textContent'),'下一关');
    await shot('sokoban-complete-zh');
    for (const width of [390,320]) {
      await client.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
      await delay(80);
      assert.strictEqual(await read(`(() => {const p=document.querySelector('#canvas-wrap').getBoundingClientRect();return ['canvas-start-begin','canvas-start-close'].every(id=>{const n=document.getElementById(id),r=n.getBoundingClientRect();return r.x>=p.x&&r.right<=p.right&&r.y>=p.y&&r.bottom<=p.bottom&&n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});})()`),true,'result actions stay visible and clickable inside narrow game frame');
      await shot('sokoban-complete-'+width);
    }
    await click('#canvas-start-begin'); await ready();
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'classic-fans-glue','next is current + 1, not newly unlocked 4');
    await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await openMenu(); await click('#player-choose-level');
    const saved = await saveContents();
    await click('#player-level-1'); await ready();
    assert.strictEqual(await read('document.querySelector("#player-confirm").hidden'),false);
    await click('#player-cancel-new');
    assert.deepStrictEqual(await saveContents(),saved,'cancel keeps unfinished level');
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'classic-fans-glue');
    await levelSelect(1); await solve();
    assert.deepStrictEqual((await progress()).completed,['classic-fans','pedestrian']);
    assert.strictEqual((await progress()).unlocked.length,5);
    // Undo and redo through the real toolbar must not award another unlock.
    await click('#fullscreen-undo-step'); await ready();
    assert.strictEqual(await read('document.querySelector("#canvas-start-overlay").hidden'),true);
    await click('#fullscreen-redo-step'); await ready();
    assert.strictEqual((await progress()).unlocked.length,5);
    await client.send('Page.reload'); await ready(); await click('#player-continue'); await click('#player-slot-1'); await ready();
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'classic-fans');
    assert.strictEqual(await read('document.querySelector("#canvas-start-begin").textContent'),'下一关');
    assert.strictEqual((await progress()).unlocked.length,5);
    await click('#canvas-start-close'); await levelSelect(1); await solve();
    assert.strictEqual((await progress()).unlocked.length,5,'replay does not unlock');
    // R resets the same official level and keeps long-term completion.
    await read('document.querySelector("#mosaic-canvas").focus()');
    await key('r','KeyR',82); await key('r','KeyR',82); await ready();
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().moves'),0);
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'classic-fans');
    await openMenu(); await click('#player-home-button'); await click('#player-new'); await chooseGame('[data-game-mode="gomoku"]'); await ready();
    await click('#player-begin'); await click('#player-confirm-new');
    assert.strictEqual((await progress()).unlocked.length,5,'another game preserves progress');
    await openMenu(); await click('#player-home-button'); await click('#player-new'); await click('#player-games-next'); await chooseGame('[data-game-mode="sokoban"]');
    assert.strictEqual(await read('document.querySelectorAll("#player-level-list > button:not(:disabled)").length'),5);
    // Fail the first request for a not-yet-loaded level, then retry normally.
    await client.send('Network.enable'); await client.send('Network.setBlockedURLs',{urls:['*sokoban/ice_test.preset.js*']});
    const beforeFailure=await saveContents();
    await click('#player-level-4');
    await waitFor(()=>read('!document.querySelector("#player-message").hidden && !document.querySelector("#player-level-4").disabled'),5000,'load error');
    assert.deepStrictEqual(await saveContents(),beforeFailure);
    await client.send('Network.setBlockedURLs',{urls:[]});
    await levelSelect(4);
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'ice-test');
    // Back must discard a pending selection even if its script arrives later.
    await openMenu(); await click('#player-choose-level');
    let pausedRequest;
    const pauseListener = event => {const m=JSON.parse(String(event.data));if(m.method==='Fetch.requestPaused')pausedRequest=m.params.requestId;};
    client.socket.addEventListener('message',pauseListener);
    await client.send('Fetch.enable',{patterns:[{urlPattern:'*sokoban/curling_on_cube.preset.js*',requestStage:'Request'}]});
    await click('#player-level-5'); await waitFor(()=>pausedRequest,5000,'delayed level request');
    await click('#player-back');
    await client.send('Fetch.continueRequest',{requestId:pausedRequest});
    await client.send('Fetch.disable');client.socket.removeEventListener('message',pauseListener);
    await delay(150);await ready();
    assert.strictEqual(await read('document.querySelector("#player-game-menu").hidden'),false,'late response does not reopen levels');
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'ice-test');
    // Read every moved file through the browser loader, then restore the live game.
    const levelIds = await read('RamifiedMinigames.player.sokobanLevels().map(p=>p.id)');
    for (const id of levelIds) {
      assert.strictEqual(await read(`RamifiedMinigames.player.beginSetup('sokoban',{presetId:${JSON.stringify(id)}})`),true,id+': browser asset');
      await read('RamifiedMinigames.player.cancelSetup()');
    }
    await client.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/ramified_minigames_archive.html`});await ready();
    assert.strictEqual(await read("RamifiedMinigames.player.beginSetup('sokoban',{presetId:'pedestrian'})"),true);
    assert.strictEqual(await read('RamifiedMinigames.player.commitSetup()'),true);
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().preset.id'),'pedestrian');
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),null,'archive remains outside campaign progress');
    assert.deepStrictEqual(errors,[]);
    console.log('ramified_minigames_sokoban_ui_test: bilingual grid, narrow/fullscreen, real level 1/2 wins, next, cancel, undo/redo, replay, R, refresh, other-game save, load retry/cancel, all assets and archive passed');
  } finally {
    if (session) {
      session.client.close();
      const profile=path.resolve(session.profile),temp=path.resolve(os.tmpdir());
      assert(profile.startsWith(temp+path.sep)&&path.basename(profile).startsWith('math-workspace-drag-'));
      await stopBrowser(session.browser,session.profile);
    }
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
