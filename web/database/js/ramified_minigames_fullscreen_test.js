// Real layout regression; the selector substitutions model a browser that does
// not recognize one fullscreen spelling. They do not emulate iPad Safari.
const assert = require('assert');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');

function inspectPage() {
  const canvas = document.querySelector('#mosaic-canvas');
  const wrap = document.querySelector('#canvas-wrap');
  const shell = document.querySelector('#fullscreen-action-shell');
  const vv = window.visualViewport;
  const style = getComputedStyle(canvas);
  const rect = (node) => node.getBoundingClientRect().toJSON();
  const ratio = canvas.style.aspectRatio.split('/').map(Number);
  return {
    fullscreen: (document.fullscreenElement || document.webkitFullscreenElement)?.id,
    visible: { left: vv?.offsetLeft || 0, top: vv?.offsetTop || 0,
      width: vv?.width || innerWidth, height: vv?.height || innerHeight },
    wrap: rect(wrap), canvas: rect(canvas), shell: rect(shell),
    requested: [parseFloat(style.getPropertyValue('--canvas-display-width')), parseFloat(style.getPropertyValue('--canvas-display-height'))],
    computed: [style.width, style.height], logicalRatio: ratio[0] / ratio[1],
    gutter: parseFloat(getComputedStyle(wrap).paddingTop),
    placement: shell.dataset.placement,
    backing: [canvas.width, canvas.height],
    diagnostics: window.RamifiedMinigames.getFullscreenDiagnostics?.() || null
  };
}

function assertContained(s, label) {
  assert.strictEqual(s.fullscreen, 'canvas-wrap', `${label}: actual target`);
  const c = s.canvas, v = s.visible;
  assert(c.left >= v.left - 1 && c.top >= v.top - 1 && c.right <= v.left + v.width + 1 && c.bottom <= v.top + v.height + 1,
    `${label}: canvas outside visible rectangle: ${JSON.stringify(s)}`);
  assert(Math.abs(c.width - s.requested[0]) <= 1 && Math.abs(c.height - s.requested[1]) <= 1,
    `${label}: CSS overrode contain result: ${JSON.stringify(s)}`);
  assert(Math.abs(c.width - c.height * s.logicalRatio) <= 2, `${label}: aspect ratio changed`);
  assert(s.backing[0] >= c.width && s.backing[1] >= c.height, `${label}: drawing buffer`);
  if (s.gutter > 0) assert(c.top >= s.shell.bottom - 1, `${label}: action row overlaps canvas`);
}

async function main() {
  const server = await startServer();
  let browser;
  try {
    browser = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html?fullscreenDebug=1`);
    const client = browser.client;
    await waitFor(() => evaluate(client, `document.readyState === 'complete' && !!window.RamifiedMinigames && document.querySelector('#mosaic-canvas').width > 300`), 20000, 'minigames initialization');
    await evaluate(client, `window.__fullscreenTestStyle = document.querySelector('style').textContent;
      const api = window.RamifiedMinigames;
      api.__test.setGame(api.createGameState({id:'fullscreen-square',label:'Square',lattice:'square',rows:4,cols:4,size:'4x4',removed:[],glue:[]}));
      window.dispatchEvent(new Event('resize'));`);
    for (const profile of ['prefix-only-parser', 'standard-only-parser', 'standard', 'prefixed-api-void']) {
      if (profile === 'prefixed-api-void') {
        await evaluate(client, `{
          const wrap=document.querySelector('#canvas-wrap');
          const request=wrap.requestFullscreen;
          wrap.webkitRequestFullscreen=function(){request.call(this);};
          wrap.requestFullscreen=undefined;
          Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>null});
        }`);
      }
      await evaluate(client, `document.querySelector('style').textContent = window.__fullscreenTestStyle${profile === 'prefix-only-parser' ? ".replace(/:fullscreen/g, ':unsupported-fullscreen')" : profile === 'standard-only-parser' ? ".replace(/:-webkit-full-screen/g, ':unsupported-webkit-full-screen')" : ''};`);
      await client.send('Emulation.setDeviceMetricsOverride', { width:1366, height:900, deviceScaleFactor:2, mobile:false });
      await client.send('Runtime.evaluate', { expression:`document.querySelector('[data-canvas-display-mode="fullscreen"]').click()`, userGesture:true });
      await waitFor(() => evaluate(client, `(document.fullscreenElement || document.webkitFullscreenElement)?.id === 'canvas-wrap'`), 10000, 'native fullscreen');
      for (const [width, height] of [[1366,900], [900,1366], [900,900], [1180,600], [900,1366], [1366,900]]) {
        await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor:2, mobile:false });
        await evaluate(client, `window.dispatchEvent(new Event('orientationchange'))`);
        await delay(180);
        for (const visible of [true, false]) {
          await evaluate(client, `{ const toggle=document.querySelector('#fullscreen-show-action-row');toggle.checked=${visible};toggle.dispatchEvent(new Event('change',{bubbles:true})); }`);
          await delay(160);
          const state = await evaluate(client, `(${inspectPage})()`);
          assertContained(state, `${profile} ${width}x${height} actions=${visible}`);
          assert(state.diagnostics, 'debug report available for iPad feedback');
          if (profile === 'prefixed-api-void') assert.strictEqual(state.diagnostics.fullscreenAPI, 'webkit');
          if (profile === 'standard' && visible && (width === 900 && height === 900 || width === 1366 && height === 900)) {
            console.log(JSON.stringify({ width, height, available:state.diagnostics.available,
              fit:state.diagnostics.fit, canvas:state.canvas, gutter:state.gutter,
              actionBottom:state.shell.bottom, buffer:state.backing }));
          }
        }
      }
      if (profile === 'standard') {
        await client.send('Emulation.setDeviceMetricsOverride', { width:900, height:900, deviceScaleFactor:2, mobile:false });
        await evaluate(client, `{ const toggle=document.querySelector('#fullscreen-show-action-row');toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true})); }`);
        await delay(200);
        await evaluate(client, `document.querySelector('#fullscreen-action-shell').style.minHeight='98px'`);
        await delay(250);
        const taller = await evaluate(client, `(${inspectPage})()`);
        assertContained(taller, 'toolbar grows without a window resize');
        assert(taller.gutter >= 118, 'gutter follows the measured toolbar, not a fixed 56px');
        await evaluate(client, `document.querySelector('#fullscreen-action-shell').style.minHeight='';
          { const toggle=document.querySelector('#fullscreen-show-action-row');toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true})); }`);
        await client.send('Emulation.setDeviceMetricsOverride', { width:1366, height:900, deviceScaleFactor:2, mobile:false });
        await delay(200);
        // A controlled API discrepancy, NOT a claim about what Safari reports.
        await evaluate(client, `Object.defineProperties(visualViewport, {
          width:{configurable:true,value:1000},height:{configurable:true,value:600},
          offsetLeft:{configurable:true,value:20},offsetTop:{configurable:true,value:0}});
          visualViewport.dispatchEvent(new Event('resize'));`);
        await delay(250);
        assertContained(await evaluate(client, `(${inspectPage})()`), 'offset visual rectangle smaller than fullscreen root');
        await evaluate(client, `Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:170});
          visualViewport.dispatchEvent(new Event('scroll'));`);
        await delay(250);
        assertContained(await evaluate(client, `(${inspectPage})()`), 'visual viewport scroll without resize');
        await evaluate(client, `for (const key of ['width','height','offsetLeft','offsetTop']) delete visualViewport[key];
          visualViewport.dispatchEvent(new Event('resize'));`);
        await delay(250);
        const stable = await evaluate(client, `window.RamifiedMinigames.getFullscreenDiagnostics().events.at(-1).time`);
        await delay(350);
        assert.strictEqual(await evaluate(client, `window.RamifiedMinigames.getFullscreenDiagnostics().events.at(-1).time`), stable,
          'sizing settles instead of looping through ResizeObserver/gutter updates');
        const overlay = await evaluate(client, `(() => { const el=document.querySelector('#fullscreen-sizing-debug');
          const s=getComputedStyle(el);return {position:s.position,pointerEvents:s.pointerEvents}; })()`);
        assert.deepStrictEqual(overlay, {position:'fixed',pointerEvents:'none'});
        for (const [rows, cols] of [[4,8],[8,4]]) {
          await evaluate(client, `api.__test.setGame(api.createGameState({id:'fullscreen-rectangle',label:'Rectangle',lattice:'square',rows:${rows},cols:${cols},size:'${rows}x${cols}',removed:[],glue:[]}));`);
          for (const [width,height] of [[1180,600],[900,1366]]) {
            await client.send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:2,mobile:false});
            await evaluate(client, `window.dispatchEvent(new Event('orientationchange'))`);
            await delay(200);
            assertContained(await evaluate(client, `(${inspectPage})()`), `${rows}x${cols} board at ${width}x${height}`);
          }
        }
        await evaluate(client, `api.__test.setGame(api.createGameState({id:'fullscreen-square',label:'Square',lattice:'square',rows:4,cols:4,size:'4x4',removed:[],glue:[]}));`);
      }
      console.log(`${profile}: landscape/portrait/orientation/action row rectangles PASS`);
      await evaluate(client, `document.exitFullscreen()`);
      await delay(200);
      const normal = await evaluate(client, `({fullscreen:!!(document.fullscreenElement || document.webkitFullscreenElement), body:document.body.className, display:document.querySelector('#mosaic-canvas').style.getPropertyValue('--canvas-display-height'), position:document.querySelector('#mosaic-canvas').style.getPropertyValue('--canvas-display-top')})`);
      assert.strictEqual(normal.fullscreen, false);
      assert(!normal.body.includes('canvas-fullscreen-active'));
      assert.strictEqual(normal.display, '');
      assert.strictEqual(normal.position, '');
      if (profile === 'prefixed-api-void') {
        await evaluate(client, `delete document.fullscreenElement;
          delete document.querySelector('#canvas-wrap').requestFullscreen;
          delete document.querySelector('#canvas-wrap').webkitRequestFullscreen;`);
      }
    }
    await evaluate(client, `document.querySelector('[data-canvas-display-mode="fit-viewport"]').click()`);
    await delay(250);
    const fit = await evaluate(client, `(${inspectPage})()`);
    assert(Math.abs(fit.canvas.width-fit.requested[0])<=1 && Math.abs(fit.canvas.height-fit.requested[1])<=1,
      'fit viewport retains its display-size CSS');
    await client.send('Page.navigate', {url:`http://127.0.0.1:${server.address().port}/ramified_minigames.html`});
    await waitFor(() => evaluate(client, `document.readyState==='complete' && !location.search && !!window.RamifiedMinigames`),20000,'normal page reload');
    await client.send('Runtime.evaluate', {expression:`document.querySelector('[data-canvas-display-mode="fullscreen"]').click()`,userGesture:true});
    await waitFor(() => evaluate(client, `document.fullscreenElement?.id === 'canvas-wrap'`),10000,'fullscreen without diagnostics');
    await delay(250);
    assertContained(await evaluate(client, `(${inspectPage})()`), 'normal users without debug flag');
    assert.strictEqual(await evaluate(client, `window.RamifiedMinigames.getFullscreenDiagnostics()`),null);
    assert.strictEqual(await evaluate(client, `!!document.querySelector('#fullscreen-sizing-debug')`),false);
    await evaluate(client, `document.exitFullscreen()`);
    console.log('toolbar remeasurement, viewport offsets, prefixed API, settling, fit viewport, debug opt-in and exit PASS');
  } finally {
    if (browser) { browser.client.close(); await stopBrowser(browser.browser, browser.profile); }
    await new Promise((resolve) => server.close(resolve));
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { inspectPage, assertContained };
