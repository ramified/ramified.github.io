'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html`);
    const { client } = session, errors = [];
    client.socket.addEventListener('message', event => {
      const m = JSON.parse(String(event.data));
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
    });
    await client.send('Runtime.enable'); await client.send('Page.enable');
    const read = expression => evaluate(client, expression);
    const ready = () => waitFor(() => read('!!window.RamifiedMinigames?.player.state().canPrepare'), 20000, 'ready');
    const visible = id => read(`!document.getElementById('${id}').hidden`);
    const click = async selector => {
      const p = await waitFor(() => read(`(() => {
        const n = document.querySelector(${JSON.stringify(selector)}); if (!n || n.disabled || !n.getClientRects().length) return null;
        n.scrollIntoView({block:'nearest',inline:'nearest'});
        const r=n.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
        return n.contains(document.elementFromPoint(x,y)) ? {x,y} : null;
      })()`), 6000, selector);
      await mouse(client, 'mousePressed', p.x, p.y, 1); await mouse(client, 'mouseReleased', p.x, p.y, 0);
    };
    // Export metadata includes translated status text; compare the actual game/progress instead.
    const stored = () => read(`(() => {const s=JSON.parse(localStorage.getItem(RamifiedSaveSlots.SAVE_KEY)); for(const slot of s?.slots||[])if(slot?.game){delete slot.game.payload.exportedAt;delete slot.game.payload.status;}return s;})()`);
    const reload = async () => { await client.send('Page.reload'); await ready(); };
    const home = async () => { await click('#fullscreen-settings-open'); await click('#player-menu-button'); await click('#player-home-button'); };
    const selectGame = async mode => {
      if (await read(`document.querySelector('[data-game-mode="${mode}"]').hidden`)) await click('#player-games-next');
      await click(`[data-game-mode="${mode}"]`);
    };
    const prepare = async (mode, slot) => { await click('#player-new'); await selectGame(mode); await click('#player-slot-'+slot); await ready(); };
    const continueSlot = async slot => { await click('#player-continue'); await click('#player-slot-'+slot); await waitFor(()=>visible('player-menu').then(v=>!v),10000,'continued'); await ready(); };
    const startLevel = async level => {
      await click('#player-level-'+level); await ready();
      if (await visible('player-confirm')) await click('#player-confirm-new');
      await waitFor(()=>visible('player-menu').then(v=>!v),10000,'started');
    };
    const move = async dir => {
      if (!await read('document.querySelector("#player-actions").open')) await click('#player-actions > summary');
      const moves = await read('RamifiedMinigames.__test.getGame().moves');
      await click(`[data-move-dir="${dir}"]`);
      await waitFor(()=>read(`RamifiedMinigames.player.state().canPrepare && RamifiedMinigames.__test.getGame().moves>${moves}`),5000,'moved');
    };
    const shot = async name => {
      if (!process.env.RAMIFIED_UI_SCREENSHOTS) return;
      fs.mkdirSync(process.env.RAMIFIED_UI_SCREENSHOTS,{recursive:true});
      const {data}=await client.send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(process.env.RAMIFIED_UI_SCREENSHOTS,name+'.png'),Buffer.from(data,'base64'));
    };
    await ready();
    assert.strictEqual(await read('document.querySelector("#player-continue").disabled'),true);
    await prepare('sokoban',1);
    assert.strictEqual(await stored(),null,'browsing an empty slot does not save');
    await startLevel(1);
    for(const dir of 'EWSSNWWENN') await move(dir);
    await waitFor(()=>read('RamifiedMinigames.player.state().solved'),5000,'solved');
    await home();
    assert.deepStrictEqual((await stored()).slots[0].sokoban.completed,['classic-fans']);
    const legacyGame=(await stored()).slots[0].game, legacyProgress=(await stored()).slots[0].sokoban;
    await prepare('sokoban',2);
    assert.strictEqual(await read('[...document.querySelectorAll("#player-level-list button:not(:disabled)")].length'),3,'slot 2 starts with three levels');
    await startLevel(2); await move('E'); await home();
    await prepare('gomoku',3); await click('#player-begin'); await home();
    const all = await stored();
    assert.deepStrictEqual(all.slots.map(s=>s.game.payload.gameMode),['sokoban','sokoban','gomoku']);
    assert.deepStrictEqual(all.slots[1].sokoban.completed,[]);
    await reload(); await continueSlot(2);
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().moves'),1);
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'pedestrian');
    await home(); await continueSlot(1);
    assert.strictEqual(await read('RamifiedMinigames.player.state().solved'),true);
    await home(); await click('#player-continue');
    // Every control is reachable at narrow widths; content stays centered in fullscreen.
    for(const locale of ['en','zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      for(const [width,full] of [[1280,false],[390,false],[320,false],[1920,true],[320,true]]) {
        if(await read('!!document.fullscreenElement'))await read('document.exitFullscreen()');
        await client.send('Emulation.setDeviceMetricsOverride',{width,height:width>600?900:844,deviceScaleFactor:1,mobile:false});
        if(full) {await client.send('Runtime.evaluate',{expression:'RamifiedMinigames.player.fullscreen()',userGesture:true,awaitPromise:true});await waitFor(()=>read('!!document.fullscreenElement'));}
        await delay(80);
        assert.strictEqual(await read(`(() => {const p=document.querySelector('#player-slots'),g=document.querySelector('#player-slot-list'),b=p.getBoundingClientRect(),r=g.getBoundingClientRect();return p.scrollWidth<=p.clientWidth&&Math.abs(r.x+r.width/2-(b.x+p.clientWidth/2))<1;})()`),true,'slots centered without horizontal overflow');
        await read('document.querySelector("#player-slots").scrollTop=0'); await shot(`slots-${locale}-${width}-${full}`);
        await click('#player-slot-restart-2');
        assert.strictEqual(await read('document.activeElement.id'),'player-slot-cancel');
        assert.strictEqual(await read('document.querySelector("#player-slot-warning").textContent.includes("2")'),true);
        await shot(`restart-${locale}-${width}-${full}`); await click('#player-slot-cancel');
      }
    }
    if(await read('!!document.fullscreenElement'))await read('document.exitFullscreen()');
    await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    assert.deepStrictEqual(await stored(),all,'canceling every restart leaves all three games intact');
    await click('#player-slot-restart-1');
    await read('SiteI18n.setLocale("en")');
    assert.match(await read('document.querySelector("#player-slot-warning").textContent'),/Restart save 1/,'open confirmation updates its language');
    await click('#player-slot-confirm-action');
    assert.strictEqual(await visible('player-games'),true);
    await selectGame('sokoban');
    assert.strictEqual(await visible('player-levels'),true,'restart keeps the target slot selected');
    assert.strictEqual(await read('[...document.querySelectorAll("#player-level-list button:not(:disabled)")].length'),3);
    let after=await stored();
    assert.strictEqual(after.slots[0].game,null);
    assert.deepStrictEqual(after.slots[0].sokoban.completed,[]);
    assert.deepStrictEqual(after.slots.slice(1),all.slots.slice(1),'restart affects only its target');
    await reload(); await continueSlot(3); await home(); await click('#player-continue');
    assert.strictEqual((await stored()).slots[2].game.payload.settings.displayStyle,'vertex','switching from Sokoban restores Gomoku display');
    const beforeDelete=await stored();
    // Failed destructive writes keep the original slot and confirmation open.
    await click('#player-slot-delete-3');
    await read(`window.realSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===RamifiedSaveSlots.SAVE_KEY)throw Error('quota');return window.realSetItem.call(this,k,v);}`);
    await click('#player-slot-confirm-action');
    assert.strictEqual(await visible('player-slot-confirm'),true);
    assert.strictEqual(await visible('player-message'),true);
    assert.deepStrictEqual(await stored(),beforeDelete);
    await read('Storage.prototype.setItem=window.realSetItem');
    await click('#player-slot-confirm-action');
    assert.strictEqual((await stored()).slots[2],null);
    // Active-slot autosave/pagehide must not resurrect a deleted game.
    await reload(); await click('#player-continue');
    assert.strictEqual(await read('document.querySelector("#player-slot-3").disabled'),true);
    assert.strictEqual((await stored()).slots[2],null);
    await click('#player-slot-1');
    assert.strictEqual(await visible('player-games'),true,'blank restarted slot can choose a game');
    await selectGame('sokoban'); await startLevel(1); await home();
    const beforeBrowse=await stored();
    await prepare('gomoku',2); await click('#player-begin'); await click('#player-cancel-new');
    assert.deepStrictEqual(await stored(),beforeBrowse,'preparation and replacement cancel do not change another slot');
    await click('#player-back'); await click('#player-back'); await click('#player-back');
    await click('#player-continue');
    // A late restore may finish loading but cannot replace the game after Back.
    await read(`window.actualRestore=RamifiedMinigames.player.restore;RamifiedMinigames.player.restore=async function(...args){await new Promise(resolve=>window.releaseRestore=resolve);return window.actualRestore.apply(this,args);};window.beforeLate=RamifiedMinigames.__test.getGame();`);
    await click('#player-slot-2'); await click('#player-back');
    await read('window.releaseRestore();RamifiedMinigames.player.restore=window.actualRestore'); await delay(100);
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame()===window.beforeLate'),true);
    assert.strictEqual(await visible('player-home'),true);
    assert.deepStrictEqual(await stored(),beforeBrowse);
    // Resume after canceling a different slot's preparation: Next level still belongs to slot 1.
    await continueSlot(1);
    for(const dir of 'EWSSNWWENN') await move(dir);
    const beforeNext=await stored();
    await click('#fullscreen-settings-open'); await click('#player-menu-button');
    await click('#player-game-menu [data-player-page="setup"]');
    await selectGame('gomoku'); await click('#player-slot-2'); await ready();
    await click('#player-back'); await click('#player-back'); await click('#player-back');
    await click('#player-resume'); await click('#canvas-start-begin'); await ready();
    assert.strictEqual(await read('RamifiedMinigames.player.state().sokobanLevelId'),'pedestrian');
    assert.deepStrictEqual((await stored()).slots.slice(1),beforeNext.slots.slice(1),'next after canceled cross-slot preparation keeps other slots untouched');
    console.log('Save slots: independent games/progress, real solve, cancel, restart, delete, quota and late restore verified');

    // Fresh page initialization migrates the old format. Only this disposable profile is edited.
    await read(`localStorage.removeItem(RamifiedSaveSlots.SAVE_KEY);localStorage.setItem(RamifiedSaveSlots.LEGACY_SAVE_KEY,${JSON.stringify(JSON.stringify(legacyGame))});localStorage.setItem(RamifiedSokobanProgress.SAVE_KEY,${JSON.stringify(JSON.stringify(legacyProgress))});`);
    // Avoid the current pagehide autosave by navigating to a neutral document before replacing fixtures.
    await client.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/robots.txt`});
    await waitFor(()=>read('document.readyState==="complete"'));
    await read(`localStorage.removeItem('ramified.minigames.player.slots.v1')`);
    await client.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/ramified_minigames.html`}); await ready();
    assert.deepStrictEqual((await stored()).slots.map(s=>s?.game?.payload.gameMode||null),['sokoban',null,null]);
    assert.deepStrictEqual((await stored()).slots[0].sokoban,legacyProgress);
    await continueSlot(1); assert.strictEqual(await read('RamifiedMinigames.player.state().solved'),true);
    await home(); await click('#player-continue'); await click('#player-slot-delete-1'); await click('#player-slot-confirm-action');
    await reload();
    assert.strictEqual(await read('document.querySelector("#player-continue").disabled'),true);
    assert.deepStrictEqual((await stored()).slots,[null,null,null]);
    assert.deepStrictEqual(await read('JSON.parse(localStorage.getItem(RamifiedSaveSlots.LEGACY_SAVE_KEY))'),legacyGame,'legacy backup retained, never reimported');
    assert.deepStrictEqual(errors,[]);
    console.log('ramified_minigames_save_slots_ui_test: three slots, bilingual desktop/narrow/fullscreen, actual progress, isolated restart/delete, failures, canceled restore, migration and refresh passed');
  } finally {
    if(session) {
      session.client.close();
      const profile=path.resolve(session.profile),temp=path.resolve(os.tmpdir());
      assert(profile.startsWith(temp+path.sep)&&path.basename(profile).startsWith('math-workspace-drag-'));
      await stopBrowser(session.browser,session.profile);
    }
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
