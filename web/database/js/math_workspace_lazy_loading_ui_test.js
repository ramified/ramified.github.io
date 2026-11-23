'use strict';

const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, evaluate, waitFor } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer();
  let session;
  try {
    session = await launchBrowser('about:blank');
    const { client } = session;
    const url = 'http://127.0.0.1:' + server.address().port + '/math_workspace.html';
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    const observed = [];
    let heldMatrix;
    let mode = 'hold';
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*', '*cdn.bootcdn.net*'] });
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/math_workspace_editors/*' }, { urlPattern: '*mosaic_*_data.js*' }] });
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const file = new URL(request.url).pathname.split('/').at(-1);
      observed.push(file);
      if (file === 'matrix.js' && mode === 'hold') { heldMatrix = requestId; return; }
      if (file === 'matrix.js' && mode === 'fail') client.send('Fetch.failRequest', { requestId, errorReason: 'Failed' });
      else client.send('Fetch.continueRequest', { requestId });
    });
    const navigate = async () => {
      observed.length = 0;
      await client.send('Page.navigate', { url });
      await waitFor(() => read(() => !!document.querySelector('[data-assets-create]')), 15000, 'Assets view');
    };
    const choose = kind => read(kind => {
      if (!document.querySelector('#workspace-create-dialog')?.open) {
        // After the first asset creation, the menu is the standard entry point.
        const empty = document.querySelector('[data-assets-create]');
        if (empty) empty.click();
        else {
          document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 150 }));
          [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button => button.textContent === 'New…').click();
        }
      }
      document.querySelector('[data-create-kind="' + kind + '"]').click();
    }, kind);
    const count = kind => read(kind => MathWorkspaceAssetsTest.state.snapshot.assets.filter(asset => asset.kind === kind).length, kind);
    const hasPanel = type => read(type => !!document.querySelector('[data-panel-type="' + type + '"]'), type);
    const downloadMessage = () => read(() => document.querySelector('.workspace-create-download [role="status"]')?.textContent);
    const clickDownloadButton = label => read(label => [...document.querySelectorAll('.workspace-create-download button')].find(button => button.textContent === label).click(), label);

    await navigate();
    await choose('number');
    assert.equal(await count('number'), 1);
    assert(await hasPanel('number-input'));
    assert.deepEqual(observed, [], 'cold startup and symbolic Number creation do not download editors or catalogs');

    await choose('matrix');
    await waitFor(() => heldMatrix, 5000, 'held matrix request');
    assert.match(await downloadMessage(), /Loading the Matrix editor/);
    assert(await read(() => document.querySelector('#workspace-create-dialog').open));
    assert.deepEqual(await read(() => ['lie','sheaf'].map(kind => {
      const icon = document.querySelector('[data-create-kind="' + kind + '"] .workspace-create-icon');
      const fallback = icon.querySelector('.workspace-icon-fallback');
      return { text: fallback.textContent, visible: fallback.checkVisibility(), rank: fallback.querySelector('sub')?.textContent ?? null, overflow: getComputedStyle(fallback).overflow };
    })), [
      { text: 'E6', visible: true, rank: '6', overflow: 'visible' },
      { text: 'ℱ', visible: true, rank: null, overflow: 'visible' }
    ], 'Lie rank is a subscript and the fallback glyphs are not clipped while MathJax is unavailable');
    assert.equal(await count('matrix'), 0);
    await clickDownloadButton('Cancel creation');
    await choose('field');
    assert(await hasPanel('field-input'), 'another type can be created while the cancelled request is still loading');
    await client.send('Fetch.continueRequest', { requestId: heldMatrix });
    await waitFor(() => read(() => !!MathWorkspaceNativeEditors.factories.matrix), 15000, 'cached matrix editor');
    assert.equal(await count('matrix'), 0);
    assert.deepEqual(observed, ['matrix.js']);

    mode = 'fail';
    await navigate();
    await choose('matrix');
    await waitFor(async () => /Could not download/.test(await downloadMessage()), 10000, 'matrix download error');
    assert(await read(() => document.querySelector('#workspace-create-dialog').open));
    assert.equal(await count('matrix'), 0);
    mode = 'pass';
    await clickDownloadButton('Retry download');
    await waitFor(() => hasPanel('matrix-input'), 15000, 'matrix input after retry');
    assert.equal(await count('matrix'), 1);
    assert.deepEqual(observed, ['matrix.js', 'matrix.js'], 'a matrix only requests its own editor');
    const backup = await read(() => MathWorkspaceObjectPanels.exportText('workspace'));

    await choose('knot');
    assert.deepEqual(observed, ['matrix.js', 'matrix.js'], 'a knot definition can be created before downloading identification data');
    await read(() => {
      const knot = MathWorkspaceAssetsTest.state.snapshot.assets.find(asset => asset.kind === 'knot');
      MathWorkspaceObjectPanels.open('knot-info', 'knot:' + knot.id, 'side');
    });
    await waitFor(() => read(() => !!window.MosaicKnotData && !!window.MosaicLinkData), 15000, 'topology identification catalogs');
    assert.deepEqual(observed.slice(2).sort(), ['mosaic_knot_data.js', 'mosaic_link_data.js']);
    await waitFor(() => read(() => document.querySelector('[data-panel-type="knot-info"] .stat-label')?.textContent === 'Components'), 10000, 'knot identification panel');

    mode = 'hold';
    heldMatrix = null;
    await navigate();
    await read(text => {
      window.restoreResult = MathWorkspaceObjectPanels.importText('workspace', text);
    }, backup);
    await waitFor(() => heldMatrix, 5000, 'backup matrix request');
    assert.equal(await count('matrix'), 0, 'backup does not replace Assets until its editor is ready');
    await client.send('Fetch.continueRequest', { requestId: heldMatrix });
    await read(() => window.restoreResult);
    assert.equal(await count('matrix'), 1);
    assert(await hasPanel('matrix-input'));
    assert.deepEqual(observed, ['matrix.js'], 'restoring a Matrix backup does not load unrelated editors');
    console.log('PASS on-demand creation, cancellation, failed download, retry, topology-only catalogs, and cold backup restore');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    server.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
