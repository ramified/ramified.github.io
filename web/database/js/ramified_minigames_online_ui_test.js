const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse, delay } = require('./math_workspace_drag_regression_test.js');
const { startWorkerTestServer } = require('../cloudflare/ramified-worker-test-server.cjs');
async function run() {
  const files = await startServer(), bridge = await startWorkerTestServer(files), sessions = [];
  const errors = [];
  try {
    async function browser() {
      const session = await launchBrowser(`http://127.0.0.1:${bridge.server.address().port}/ramified_minigames.html`); sessions.push(session);
      const client = session.client;
      await client.send('Runtime.enable'); await client.send('Page.enable');
      client.socket.addEventListener('message', event => { const m = JSON.parse(String(event.data)); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
      const read = exp => evaluate(client, exp);
      await waitFor(() => read('window.RamifiedMinigames?.player.state().ready'), 15000, 'engine ready');
      async function click(selector) {
        const point = await waitFor(() => read(`(() => { const n=document.querySelector(${JSON.stringify(selector)}); if(!n || n.disabled || !n.getClientRects().length) return null; n.scrollIntoView({block:'nearest'}); const r=n.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2; return n.contains(document.elementFromPoint(x,y)) ? {x,y}:null; })()`), 10000, selector);
        await mouse(client, 'mousePressed', point.x, point.y, 1); await mouse(client, 'mouseReleased', point.x, point.y, 0);
      }
      const until = (exp, label) => waitFor(() => read(exp), 15000, label || exp);
      const info = () => read('RamifiedMinigames.player.onlineInfo()');
      const set = (id, value) => read(`(() => { const n=document.getElementById(${JSON.stringify(id)});n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      return { client, read, click, until, info, set };
    }
    const a = await browser(), b = await browser();
    await a.click('#player-new'); await a.click('#player-slot-1'); await a.click('[data-game-mode="go"]');
    await a.until(`!document.querySelector('#player-begin').disabled`); await a.click('#player-begin'); await a.click('#mosaic-canvas');
    await a.until(`RamifiedMinigames.__test.getGame().round===1`, 'local move before online');
    const localBefore = await a.read(`JSON.stringify(RamifiedMinigames.__test.getGame().stones)`);
    await a.click('#fullscreen-settings-open'); await a.click('#player-home-button');
    await a.click('#player-online-open'); await b.click('#player-online-open');
    await a.until(`document.querySelectorAll('#player-lobby-players li').length===2`, 'all browser identities in lobby');
    for (const width of [390, 320]) {
      await a.client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await a.read(`(() => { const p=document.querySelector('#player-lobby');return p.scrollWidth<=p.clientWidth+1; })()`), true, `lobby fits ${width}`);
      await a.read(`document.querySelector('#player-lobby-rooms').scrollIntoView({block:'nearest'})`);
      assert.equal(await a.read(`(() => { const p=document.querySelector('#player-lobby').getBoundingClientRect(),r=document.querySelector('#player-lobby-rooms').getBoundingClientRect();return r.top<p.bottom && r.bottom>p.top; })()`), true, `room directory reachable at ${width}`);
      if (width === 320) fs.writeFileSync(path.join(os.tmpdir(), 'ramified-r19-lobby-320.png'), Buffer.from((await a.client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      await a.click('#player-lobby-refresh');
    }
    await a.client.send('Emulation.clearDeviceMetricsOverride');
    await a.click('#player-lobby-create');
    assert.equal(await a.read(`document.querySelectorAll('#player-game-list button:not([hidden])').length`), 6);
    await a.click('[data-game-mode="gomoku"]');
    await a.until(`!document.querySelector('#player-begin').disabled`);
    assert.equal(await a.read(`document.querySelector('#player-setup-players').hidden`), true);
    await a.click('#player-more'); await a.set('player-time-mode', 'byoyomi'); await a.set('player-time-main', '300'); await a.set('player-time-action', '30');
    await a.click('#player-back'); await a.click('#player-begin');
    await a.until(`RamifiedMinigames.player.onlineInfo().joined && !document.querySelector('#player-room').hidden`, 'creator waiting room');
    const first = await a.info(); assert.deepEqual(first.roles, ['black']); assert.equal(first.roundState, 'waiting');
    await b.click('#player-lobby-refresh'); await b.click('[data-room-code]');
    await b.until(`RamifiedMinigames.player.onlineInfo().joined`);
    assert.deepEqual((await b.info()).roles, []);
    await b.click('#player-room-seat-options input[value="white"]');
    await a.click('#player-room-ready'); assert.equal((await a.info()).roundState, 'waiting');
    await b.until(`RamifiedMinigames.player.onlineInfo().readyClientIds.length===1`);
    assert.equal(await b.read(`document.querySelector('#player-room-seat-options input[value="white"]').checked`), true, 'another player becoming ready does not discard the pending seat choice');
    await b.click('#player-room-claim');
    await b.until(`RamifiedMinigames.player.onlineInfo().roles.includes('white')`);
    await a.click('#player-room-ready'); await b.click('#player-room-ready');
    await a.until(`RamifiedMinigames.player.onlineInfo().roundState==='playing'`, 'two ready humans start');
    await b.until(`document.querySelector('#player-menu').hidden`);
    assert.equal((await a.info()).timeControl.mode, 'byoyomi');
    await a.click('#mosaic-canvas');
    await b.until(`RamifiedMinigames.__test.getGame().round===1`, 'accepted move reaches opponent');
    assert.equal(await a.read(`RamifiedMinigames.player.snapshot()`), null, 'network state never autosaves');
    // Open room through the existing in-game menu; host draft does not stop clocks.
    await a.read(`document.querySelector('#player-menu-button').click()`);
    await a.click('#player-room-change');
    await a.click('[data-game-mode="connect-four"]'); await a.until(`!document.querySelector('#player-begin').disabled`);
    const remaining = (await b.info()).clock.seats.black.main;
    await delay(200); await a.click('#player-begin');
    await b.until(`!!RamifiedMinigames.player.onlineInfo().proposal`, 'proposal reaches opponent');
    assert.match(await b.read(`document.querySelector('#player-room-proposal-text').textContent`), /6 × 7/, 'consent describes the proposed dimensions');
    assert.equal((await b.info()).gameMode, 'gomoku');
    assert((await b.info()).clock.seats.black.main <= remaining);
    await b.click('#player-proposal-accept');
    await a.until(`RamifiedMinigames.player.onlineInfo().gameMode==='connect-four' && !RamifiedMinigames.player.state().browsing`, 'new configuration');
    assert.deepEqual((await a.info()).roles, []); assert.equal((await a.info()).roundState, 'waiting');
    for (const width of [1280, 390, 320]) {
      await a.client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.equal(await a.read(`(() => { const p=document.querySelector('#player-room');return p.scrollWidth<=p.clientWidth+1; })()`), true, `room fits ${width}`);
      await a.read(`SiteI18n.setLocale('zh-CN')`);
      assert.equal(await a.read(`document.querySelector('#player-room-ready').textContent`), '准备');
      assert.equal(await a.read(`(() => { const p=document.querySelector('#player-room').getBoundingClientRect(), f=document.querySelector('#player-room-leave').getBoundingClientRect();return f.bottom<=p.bottom+1; })()`), true, `room footer fits ${width}`);
      if (width === 320) fs.writeFileSync(path.join(os.tmpdir(), 'ramified-r19-room-320.png'), Buffer.from((await a.client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      await a.read(`SiteI18n.setLocale('en')`);
    }
    await a.client.send('Emulation.clearDeviceMetricsOverride');
    await a.click('#player-room-watch'); await a.click('#fullscreen-settings-open'); await a.click('#fullscreen-settings-display-tab'); await a.click('#player-fullscreen');
    await a.until(`!!document.fullscreenElement`, 'real fullscreen');
    await a.client.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await a.click('#fullscreen-settings-open'); await a.click('#player-menu-button');
    assert.equal(await a.read(`(() => { const p=document.querySelector('.player-room-body').getBoundingClientRect(), f=document.querySelector('#player-room').getBoundingClientRect();return Math.abs((p.left+p.right-f.left-f.right)/2)<2; })()`), true, 'fullscreen room content is centered');
    const screenshot = path.join(os.tmpdir(), 'ramified-r19-room-fullscreen.png');
    fs.writeFileSync(screenshot, Buffer.from((await a.client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    console.log('R19 screenshot: ' + screenshot);
    await a.read(`document.exitFullscreen()`); await a.until(`!document.fullscreenElement`);
    await a.client.send('Emulation.clearDeviceMetricsOverride');
    await a.click('#player-room-leave'); await a.until(`!RamifiedMinigames.player.onlineInfo().joined`);
    assert.equal(await a.read(`JSON.stringify(RamifiedMinigames.__test.getGame().stones)`), localBefore, 'local board survives online play and proposals');
    assert.equal(await a.read(`document.querySelector('#fullscreen-undo-step').disabled`), false, 'local undo history is retained');
    await b.click('#player-room-leave');
    for (const mode of ['hex', 'go', 'reversi', 'chinese-checkers', 'fide-chess', 'billiards']) {
      await a.click('#player-lobby-create');
      if (await a.read(`document.querySelector('[data-game-mode="${mode}"]').hidden`)) await a.click('#player-games-next');
      await a.click(`[data-game-mode="${mode}"]`); await a.until(`!document.querySelector('#player-begin').disabled`, mode + ' preview');
      const preview = await a.read(`(() => { const g=RamifiedMinigames.__test.getGame();return [g.preset.id,g.preset.rows,g.preset.cols]; })()`);
      await a.click('#player-begin'); await a.until(`RamifiedMinigames.player.onlineInfo().joined`, mode + ' creation');
      const roomInfo = await a.info(); const serverRoom = bridge.objects.get(roomInfo.roomCode).room;
      assert.deepEqual([serverRoom.snapshot.preset.id, serverRoom.snapshot.preset.rows, serverRoom.snapshot.preset.cols], preview);
      assert.equal(serverRoom.snapshot.round, 0, mode + ' fresh initial state');
      if (mode === 'billiards') {
        assert.equal(serverRoom.snapshot.rules, 'competitive');
        await b.click('#player-lobby-refresh'); await b.click(`[data-room-code="${roomInfo.roomCode}"]`);
        await b.until(`RamifiedMinigames.player.onlineInfo().joined`);
        await b.click('#player-room-seat-options input[value="player-2"]'); await b.click('#player-room-claim');
        await b.until(`RamifiedMinigames.player.onlineInfo().roles.includes('player-2')`);
        await a.click('#player-room-ready'); await b.click('#player-room-ready');
        await a.until(`RamifiedMinigames.player.onlineInfo().roundState==='playing'`);
        await a.read(`RamifiedMinigames.player.onlineSend({type:'billiardsShot',baseVersion:RamifiedMinigames.player.onlineInfo().version || 0,action:{aim:{x:1,y:0},power:.15,contact:{x:0,y:0}}})`);
        await waitFor(() => bridge.objects.get(roomInfo.roomCode).room.snapshot.shots === 1, 20000, 'server billiards simulation');
        await a.click('#fullscreen-settings-open'); await a.click('#player-menu-button');
        await b.read(`document.querySelector('#player-menu-button').click()`); await b.click('#player-room-leave');
      }
      await a.click('#player-room-leave');
      console.log('Online initialization verified: ' + mode);
    }
    // Delay an actual successful create response until after navigation away.
    await a.click('#player-lobby-create'); await a.click('[data-game-mode="gomoku"]');
    await a.until(`!document.querySelector('#player-begin').disabled`);
    await a.read(`(() => { const original=window.fetch; window.__restoreFetch=()=>{window.fetch=original};window.fetch=(url,options)=>original(url,options).then(response=>options?.method==='POST' && String(url).endsWith('/api/rooms') ? new Promise(resolve=>{window.__releaseRoomResponse=()=>resolve(response)}) : response); })()`);
    await a.click('#player-begin'); await a.until(`typeof window.__releaseRoomResponse==='function'`);
    await a.click('#player-back'); await a.click('#player-back');
    await a.read(`window.__restoreFetch(); window.__releaseRoomResponse()`); await delay(250);
    assert.equal(await a.read(`document.querySelector('#player-lobby').hidden`), false, 'late create response does not replace the page after cancel');
    assert.equal((await a.info()).joined, false);
    await a.click('#player-back');
    assert.equal(await a.read(`JSON.stringify(RamifiedMinigames.__test.getGame().stones)`), localBefore, 'cancelled request preserves the local game');
    assert.deepEqual(errors, []);
    console.log('ramified_minigames_online_ui_test: two real browser clients, lobby, fresh creation, seats, readiness, timed configuration consent and narrow bilingual room UI passed');
  } finally {
    for (const s of sessions) { s.client.close(); await stopBrowser(s.browser, s.profile); }
    await bridge.close(); await new Promise(resolve => files.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
