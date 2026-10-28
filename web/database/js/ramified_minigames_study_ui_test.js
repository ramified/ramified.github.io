'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');
// Screenshots are optional diagnostics, never persistent test fixtures.
// Prefer an output directory outside the checkout, e.g. under the OS temp folder.
const out = process.env.RAMIFIED_STUDY_SCREENSHOTS ? path.resolve(process.env.RAMIFIED_STUDY_SCREENSHOTS) : null;
async function run() {
  const server = await startServer();
  let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html`);
    const { client } = session;
    const read = expression => evaluate(client, expression);
    const ready = () => waitFor(() => read('!!window.RamifiedMinigames?.player.state().ready'), 60000, 'game ready');
    const visible = id => read(`!!document.getElementById('${id}')?.getClientRects().length`);
    const click = async selector => {
      await waitFor(() => read(`(() => {const n=document.querySelector(${JSON.stringify(selector)});return n && n.getClientRects().length && !n.disabled})()`), 10000, selector);
      await read(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await delay(100);
    };
    const resize = async width => {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: width === 1280 ? 900 : 844, deviceScaleFactor: 1, mobile: false });
      await delay(120);
    };
    const shot = async name => {
      if (!out) return;
      await read('Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode().catch(()=>{})))');
      fs.mkdirSync(out, { recursive: true });
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data, 'base64'));
    };
    const contained = () => read(`(() => {const r=document.querySelector('.mosaic-layout').getBoundingClientRect();return {page:document.documentElement.scrollWidth<=innerWidth,frame:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})()`);
    await ready();
    // Capture the untouched original at the same exact sizes as the study.
    for (const width of [1280,768,360]) { await resize(width); await shot(`original-home-${width}-en`); }
    await click('#player-new'); await click('#player-slot-1');
    for (const width of [1280,768,360]) { await resize(width); await shot(`original-games-${width}-en`); }
    await client.send('Page.navigate', {url:`http://127.0.0.1:${server.address().port}/ramified_minigames_study.html`});
    await waitFor(()=>read('document.body.classList.contains("design-study")'),10000,'study loaded');
    await ready();
    for (const width of [1280,768,360]) {
      await resize(width);
      assert.deepStrictEqual(await contained(), { page:true,frame:true });
      await shot(`home-${width}-en`);
    }
    await click('#player-new'); await click('#player-slot-1');
    const modes = await read('[...document.querySelectorAll("#player-game-list>button")].map(b=>b.dataset.gameMode)');
    assert.equal(modes.length,11);
    assert.equal(modes[0],'2048');
    for (const locale of ['en','zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      for (const width of [1280,768,360]) {
        await resize(width);
        assert.deepStrictEqual(await contained(),{page:true,frame:true});
        assert.equal(await read('[...document.querySelectorAll("#player-game-list>button")].filter(b=>b.hidden).length'),0);
        await shot(`games-${width}-${locale}`);
      }
    }
    await read('SiteI18n.setLocale("en")');
    for (const mode of modes.filter(mode => !process.env.RAMIFIED_STUDY_FOCUS || mode === process.env.RAMIFIED_STUDY_FOCUS)) {
      await resize(1280);
      await click(`[data-game-mode="${mode}"]`); await ready();
      if(mode==='fide-chess') {await click('[data-chess-category="game"]');await ready();}
      if(mode==='sokoban') await click('#player-level-1');
      else await click('#player-begin');
      if(await visible('player-confirm-new')) await click('#player-confirm-new');
      await waitFor(()=>read('RamifiedMinigames.player.state().active && document.querySelector("#player-menu").hidden'),20000,mode+' start');
      assert.equal(await read('RamifiedMinigames.player.state().mode'), mode);
      for(const width of [1280,768,360]) {
        await resize(width);
        assert.deepStrictEqual(await contained(),{page:true,frame:true});
        const canvas = await read('(() => {const r=document.querySelector("#mosaic-canvas").getBoundingClientRect();return {width:r.width,height:r.height}})()');
        assert(canvas.width>100 && canvas.height>60, mode+' board visible');
        await shot(`${mode}-${width}-en`);
      }
      if(mode==='billiards') {
        assert.equal(await read('document.querySelector("#player-actions").open'),false);
        assert.equal(await read('document.querySelector("#fullscreen-billiards-spin").getClientRects().length'),0,'closed action drawer keeps board clear');
        await click('#player-actions > summary');
        assert.equal(await visible('fullscreen-billiards-spin'),true);
        await shot('billiards-actions-360-en');
        await click('#player-actions > summary');
      }
      await click('#fullscreen-settings-open');
      await click('#player-menu-button');
      console.log('Verified at 360 / 768 / 1280: '+mode);
    }
    await click('[data-game-mode="2048"]'); await ready(); await click('#player-begin');
    if(await visible('player-confirm-new')) await click('#player-confirm-new');
    await ready();
    const roundBeforeKey = await read('RamifiedMinigames.__test.getGame().round');
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await waitFor(()=>read(`RamifiedMinigames.__test.getGame().round > ${roundBeforeKey}`),10000,'original keyboard move through study shell');
    const before = await read('document.querySelector("#fullscreen-sound-enabled").checked');
    await click('#study-mute');
    assert.equal(await read('document.querySelector("#fullscreen-sound-enabled").checked'),!before);
    await click('#study-mute');
    await click('#fullscreen-settings-open');
    assert.equal(await read('document.querySelector("#study-workshop").open'),false);
    await read('document.querySelector("#study-workshop").open=true');
    assert.equal(await read('document.querySelector("#study-workshop").contains(document.querySelector("#debug-tools"))'),true);
    await click('#debug-toggle');
    assert.equal(await visible('debug-tools'),true, 'workshop restores access to the original debug controls');
    await read('SiteI18n.setLocale("zh-CN")');
    for(const width of [1280,768,360]) { await resize(width); await shot(`workshop-${width}-zh`); }
    assert.equal(await read('Object.keys(localStorage).some(k=>k.startsWith("design-study:"))'),true);
    assert.equal(await read('document.querySelector("#study-mute").textContent'), '声音已关闭');
    await client.send('Emulation.setEmulatedMedia', { features:[{name:'prefers-color-scheme',value:'dark'}] });
    await read('document.querySelector("#study-workshop").open=false');
    await shot('settings-dark-360-zh');
    await click('#fullscreen-settings-display-tab');
    const fullButton = await read('(() => {const n=document.querySelector("#player-fullscreen");n.scrollIntoView({block:"center"});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
    await client.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,...fullButton});
    await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,...fullButton});
    await waitFor(()=>read('!!document.fullscreenElement'),5000,'study fullscreen');
    await shot('fullscreen-dark-360-zh');
    await read('document.exitFullscreen()');
    // Check the shared Mosaic page still uses its own shell and has no study assets.
    await client.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/mosaic_calculator.html`});
    await waitFor(()=>read('document.readyState === "complete" && !!document.querySelector("#mosaic-canvas")'),30000,'Mosaic loaded');
    assert.equal(await read('document.body.classList.contains("design-study")'),false);
    assert.equal(await read('document.querySelectorAll("link[href*=ramified_minigames_study],script[src*=ramified_minigames_study]").length'),0);
    await resize(1280); await shot('mosaic-unaffected-1280');
    console.log(`Study: ${process.env.RAMIFIED_STUDY_FOCUS ? 'focused '+process.env.RAMIFIED_STUDY_FOCUS : '11 games'}, three widths, bilingual menus, workshop, mute, keyboard, fullscreen, isolated saves and Mosaic checks passed.`);
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser, session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
