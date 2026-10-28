'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');
// Screenshots are optional diagnostics, never persistent test fixtures.
// Prefer an output directory outside the checkout, e.g. under the OS temp folder.
const out = process.env.RAMIFIED_STUDY_SCREENSHOTS ? path.resolve(process.env.RAMIFIED_STUDY_SCREENSHOTS) : null;
// Guard the requested rollback: the generated adapter may add shell APIs but
// must leave every original drawing, animation, coordinate and rules function intact.
const normalize = source => source.replace(/\r\n/g, '\n');
const sharedEngine = normalize(fs.readFileSync(path.join(__dirname, 'ramified_minigames_setup.js'), 'utf8'));
const studyEngine = normalize(fs.readFileSync(path.join(__dirname, 'ramified_minigames_study_engine.js'), 'utf8'));
const restoredEngine = studyEngine.replace(/^\/\* Generated study adapter[^\n]*\n/, '')
  .replace(/    refreshPresentation\(\)[\s\S]*?(?=    fit\(\))/, '');
assert.equal(restoredEngine, sharedEngine, 'original drawing and rules are preserved exactly');
async function run() {
  const server = await startServer();
  let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html`);
    const { client } = session;
    const browserErrors = [];
    await client.send('Runtime.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    const read = expression => evaluate(client, expression);
    const ready = () => waitFor(() => read('!!window.RamifiedMinigames?.player.state().ready'), 60000, 'game ready');
    const visible = id => read(`!!document.getElementById('${id}')?.getClientRects().length`);
    const click = async selector => {
      await waitFor(() => read(`(() => {const n=document.querySelector(${JSON.stringify(selector)});return n && n.getClientRects().length && !n.disabled})()`), 10000, selector);
      await read(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await delay(100);
    };
    const chooseMode = async mode => {
      while (!await read('document.querySelector("#player-games-previous").disabled')) await click('#player-games-previous');
      if (await read(`document.querySelector('[data-game-mode="${mode}"]').hidden`)) await click('#player-games-next');
      await click(`[data-game-mode="${mode}"]`);
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
      const stage = await read('(() => {const n=document.querySelector(".mosaic-layout"),r=n.getBoundingClientRect();return {ratio:r.width/r.height,container:getComputedStyle(n).containerType}})()');
      assert(Math.abs(stage.ratio - (width === 360 ? 9/16 : 4/3)) < .01, 'fixed stage ratio');
      assert.equal(stage.container,'size');
      await shot(`home-${width}-en`);
    }
    assert(await visible('study-build'), 'visible build stamp');
    assert.equal(await read('document.querySelectorAll("link[href*=ramified_minigames_player],script[src*=ramified_minigames_setup],script[src*=ramified_minigames_player]").length'),0,'no old shell or second engine');
    await click('#player-new');
    const modes = await read('[...document.querySelectorAll("#player-game-list>button")].map(b=>b.dataset.gameMode)');
    assert.equal(modes.length,11);
    assert.equal(modes[0],'2048');
    for (const locale of ['en','zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      for (const width of [1280,768,360]) {
        await resize(width);
        assert.deepStrictEqual(await contained(),{page:true,frame:true});
        assert.equal(await read('[...document.querySelectorAll("#player-game-list>button")].filter(b=>!b.hidden).length'),6);
        assert.equal(await read('[...document.querySelectorAll("#player-game-list img")].every(i=>i.getAttribute("src").startsWith("assets/ramified_minigames/board_game_stickers/"))'),true,'original artwork');
        await shot(`games-${width}-${locale}`);
      }
    }
    await read('SiteI18n.setLocale("en")');
    for (const mode of modes.filter(mode => !process.env.RAMIFIED_STUDY_FOCUS || mode === process.env.RAMIFIED_STUDY_FOCUS)) {
      await resize(1280);
      await chooseMode(mode); await ready();
      if(mode==='gomoku') await read('["gomoku-black-controller","gomoku-white-controller"].forEach(id=>{const n=document.getElementById(id);n.value="human";n.dispatchEvent(new Event("change",{bubbles:true}))})');
      if(mode==='fide-chess') {await click('[data-chess-category="game"]');await ready();}
      assert.equal(await read('document.querySelectorAll("#study-random-board,#study-preset-list").length'),0,'experimental preparation controls removed');
      for (const width of [1280,360]) {
        await resize(width);
        if(mode==='sokoban') {
          await waitFor(()=>read('[...document.querySelectorAll(".player-level")].every(b=>b.dataset.preview==="ready")'),20000,'original level previews');
          assert(await read('[...document.querySelectorAll(".player-level-preview")].every(c=>c.width>0&&c.height>0)'), 'real level canvases');
        } else if(await visible('player-board-setup')) {
          assert.equal(await read('getComputedStyle(document.querySelector(".player-setup-main")).display'),'grid','original centered preparation layout');
          assert(await visible('player-board-name'),'board name remains visible on mobile');
          if(['gomoku','connect-four','chinese-checkers'].includes(mode)) {
            await waitFor(()=>read('(()=>{const stones=[...document.querySelectorAll("#player-setup-players .player-stone,#player-setup-options .player-stone")].filter(s=>s.getClientRects().length);return stones.length>0&&stones.every(s=>{const c=s.querySelector(".study-player-piece");return c&&s.classList.contains("player-stone-"+c.dataset.color)&&c.getContext("2d").getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]>0})})()'),5000,'player markers use game renderer');
          }
          if(mode==='chinese-checkers'&&width===360) assert.equal(await read('getComputedStyle(document.querySelector("#chinese-checkers-player-options")).gridTemplateColumns.split(" ").length'),2,'original mobile player picker columns');
          await waitFor(()=>read('(()=>{const a=document.querySelector("#player-board-preview"),b=document.querySelector("#mosaic-canvas");if(a.width!==b.width||a.height!==b.height)return false;const x=a.getContext("2d").getImageData(0,0,a.width,a.height).data,y=b.getContext("2d").getImageData(0,0,b.width,b.height).data;return x.every((v,i)=>v===y[i])})()'),5000,'preview uses actual game drawing');
        }
        await shot(`preparation-${mode}-${width}`);
      }
      if(mode==='sokoban') await click('#player-level-1');
      else await click('#player-begin');
      if(await visible('player-confirm-new')) await click('#player-confirm-new');
      await waitFor(()=>read('RamifiedMinigames.player.state().active && document.querySelector("#player-menu").hidden'),20000,mode+' start');
      assert.equal(await read('document.querySelector("#study-tutorial") === null && typeof window.RamifiedStudyView === "undefined"'),true,'experimental board presentation removed');
      if (await visible('study-notice')) await click('#study-sound-no');
      assert.equal(await read('RamifiedMinigames.player.state().mode'), mode);
      for(const width of [1280,768,360]) {
        await resize(width);
        assert.deepStrictEqual(await contained(),{page:true,frame:true});
        const canvas = await read('(() => {const r=document.querySelector("#mosaic-canvas").getBoundingClientRect();return {width:r.width,height:r.height}})()');
        assert(canvas.width>100 && canvas.height>60, mode+' board visible');
        if(width===360) assert(await read('["fullscreen-undo-step","fullscreen-redo-step","fullscreen-restart","fullscreen-settings-open"].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.width>=44&&r.height>=44})'),'phone touch targets');
        assert(await read('["fullscreen-undo-step","fullscreen-redo-step","fullscreen-restart","fullscreen-settings-open"].every(id=>{const n=document.getElementById(id),svg=n.querySelector("svg");return !n.querySelector("span[data-i18n]")&&svg&&getComputedStyle(svg).display!=="none"})'),'original icon toolbar');
        if(mode==='2048') assert(await visible('player-actions'),'original Game actions remains available');
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
      if(['gomoku','go'].includes(mode)) {
        for(const width of [360,1280]) for(const deviceScaleFactor of [1,2]) {
          await client.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor,mobile:false}); await delay(200);
          const target=await read(`(()=>{const game=RamifiedMinigames.__test.getGame(),g=RamifiedMinigames.__test.getGeometry(),cell=g.cells.find((p,i)=>p&&!game.removed.has(i)&&!game.stones.some(s=>s.index===i));const index=g.cells.indexOf(cell),t=g.displayTransform;let x=cell.x,y=cell.y;if(t){const dx=x-t.centerX,dy=y-t.centerY;x=t.centerX+dx*t.cos-dy*t.sin-t.minX;y=t.centerY+dx*t.sin+dy*t.cos-t.minY}const r=document.querySelector('#mosaic-canvas').getBoundingClientRect();return {index,x:r.left+x*r.width/g.width,y:r.top+y*r.height/g.height}})()`);
          await client.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:target.x,y:target.y});
          await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:target.x,y:target.y});
          await waitFor(()=>read(`RamifiedMinigames.__test.getGame().stones.some(s=>s.index===${target.index})`),3000,mode+' actual click matches drawn intersection');
        }
      }
      await click('#fullscreen-settings-open');
      await click('#player-menu-button');
      console.log('Verified at 360 / 768 / 1280: '+mode);
    }
    await chooseMode('2048'); await ready(); await click('#player-begin');
    if(await visible('player-confirm-new')) await click('#player-confirm-new');
    await ready();
    const roundBeforeKey = await read('RamifiedMinigames.__test.getGame().round');
    // A randomly spawned board can already be packed against any one side.
    for (const [key, code] of [['ArrowRight',39],['ArrowDown',40],['ArrowLeft',37],['ArrowUp',38]]) {
      await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code});
      await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});
      await delay(700);
      if (await read(`RamifiedMinigames.__test.getGame().round > ${roundBeforeKey}`)) break;
    }
    await waitFor(()=>read(`RamifiedMinigames.__test.getGame().round > ${roundBeforeKey}`),10000,'original keyboard move through study shell');
    await resize(1280);
    for(const deviceScaleFactor of [1,2]) {
      await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor,mobile:false});
      await waitFor(()=>read('(()=>{const c=document.querySelector("#mosaic-canvas"),r=c.getBoundingClientRect();return Math.abs(c.width-r.width*devicePixelRatio)<=2&&Math.abs(c.height-r.height*devicePixelRatio)<=2})()'),5000,'DPR-only repaint');
    }
    await client.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    const before = await read('document.querySelector("#fullscreen-sound-enabled").checked');
    await read('document.querySelector("#study-mute").click()');
    assert.equal(await read('document.querySelector("#fullscreen-sound-enabled").checked'),!before);
    await read('document.querySelector("#study-mute").click()');
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
    assert.deepStrictEqual(browserErrors, [], 'no browser exceptions across study flows');
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
