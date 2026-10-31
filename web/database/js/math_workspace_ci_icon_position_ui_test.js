'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await waitFor(() => read(() => !!window.MathWorkspaceAssetsTest && !!window.MathJax?.typesetPromise), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.ci = api.createObjectAsset('variety', { type: 'complete-intersection', data: { dimension: '3', ambientDimension: '6', degrees: '2, 2, 2' } });
      window.icon = () => document.querySelector('[data-asset-key="variety:' + ci.id + '"] .workspace-asset-icon');
      window.measureIcon = () => {
        const host = icon(), formula = host.querySelector('.workspace-icon-formula'), math = formula.querySelector('mjx-container');
        const h = host.getBoundingClientRect(), f = formula.getBoundingClientRect(), m = math.getBoundingClientRect();
        return { hostX: h.x, hostWidth: h.width, formulaX: f.x, formulaWidth: f.width, mathX: m.x, mathWidth: m.width,
          offset: f.x + f.width / 2 - h.x - h.width / 2, mathOffset: m.x + m.width / 2 - h.x - h.width / 2,
          naturalWidth: formula.offsetWidth, transform: formula.style.transform };
      };
    });
    await waitFor(() => read(() => !!icon()?.querySelector('mjx-container')), 10000);
    const samples = [];
    for (let i = 0; i < 8; i++) {
      await read(async () => {
        await MathWorkspaceAssetIcons.typeset(document.querySelector('[data-assets-content]'));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      samples.push(await read(() => measureIcon()));
    }
    console.log('Repeated fit offsets: ' + JSON.stringify(samples.map(sample => sample.offset)));
    assert(samples.every(sample => Math.abs(sample.offset) < 1.5 && Math.abs(sample.mathOffset) < 1.5), 'X_{2,2,2} must remain centered inside its icon after repeated fitting');
    assert(Math.max(...samples.map(s => s.hostX)) - Math.min(...samples.map(s => s.hostX)) < 1.5, 'icon host must not drift horizontally');
    const settle = () => read(async () => {
      const content = document.querySelector('[data-assets-content]');
      await MathJax.typesetPromise([content]);
      await MathWorkspaceAssetIcons.typeset(content);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    for (const layout of ['icons', 'list', 'details', 'tiles', 'content']) {
      for (const count of [3, 8]) {
        await read(({ layout, count }) => {
          api.state.layout = layout;
          const current = api.localAssetSnapshot().assets.find(a => a.id === ci.id);
          api.updateObjectAsset(ci, { data: { ...current.data, degrees: Array(count).fill('2').join(', '), ambientDimension: String(3 + count) } });
        }, { layout, count });
        await settle();
        const measurement = await read(() => measureIcon());
        assert(Math.abs(measurement.offset) < 1.5 && Math.abs(measurement.mathOffset) < 1.5, layout + ': ' + count + ' equations remain centered');
        assert(measurement.formulaWidth <= measurement.hostWidth + 1, layout + ': long name fits its icon');
      }
    }
    await read(() => {
      api.state.layout = 'icons'; api.openCanvas('sheaf-complexes');
      const current = api.localAssetSnapshot().assets.find(a => a.id === ci.id);
      api.updateObjectAsset(ci, { data: { ...current.data, degrees: '2, 2, 2', ambientDimension: '6' } });
      api.selectCanvasTab('assets');
    });
    await settle();
    for (const width of [390, 900, 1440]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await settle();
      assert(Math.abs((await read(() => measureIcon())).offset) < 1.5, 'icon remains centered at viewport width ' + width);
    }
    await client.send('Emulation.clearDeviceMetricsOverride'); await settle();
    const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(os.tmpdir(), 'math-workspace-ci-icon-position.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot: ' + screenshotPath);
    console.log('PASS CI icon centered after repeated fits, degree changes, five layouts, hidden updates and viewport resizing');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
