'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay, mouse } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session, errors = [];
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await client.send('Runtime.enable'); await client.send('Page.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Page.javascriptDialogOpening') {
        errors.push('Unexpected dialog: ' + message.params.message);
        client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
    });
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels && !!document.querySelector('[data-assets-editor]')), 20000);
    assert.equal(await read(() => [...document.querySelector('#workspace-open-canvas').options].some(option => option.value === 'double-young')), false);
    await read(() => {
      const api = window.MathWorkspaceAssetsTest;
      const a = api.createObjectAsset('young', { name: 'a', data: { partition: '2,1' } });
      const b = api.createObjectAsset('young', { name: 'b', data: { partition: '1' } });
      const g = api.createObjectAsset('lie', { name: 'g', data: { family: 'A', rank: 3 } });
      const x = api.createObjectAsset('variety', { name: 'X', type: 'grassmannian', data: { r: 2, n: 4 } });
      window.testAssets = { a: a.id, b: b.id, g: g.id, x: x.id };
      document.querySelector('#workspace-add-card').click();
      document.querySelector('#workspace-card-options input[data-card-key="new:young-input"]').click();
      window.testInput = [...window.MathWorkspaceObjectPanels.panels.values()].at(-1);
      const select = testInput.node.querySelector('[data-object-reference="asset"]');
      select.value = 'young:' + testAssets.a; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await waitFor(() => read(() => testInput.activeRenderer?.role === 'compact'));
    assert.equal(await read(() => document.querySelector('#workspace-card-picker').hidden), false, 'checkbox selection keeps the picker open');
    assert.equal(await read(() => document.querySelector('#workspace-card-options button')), null);
    assert.equal(await read(() => document.querySelector('#workspace-card-options input[data-card-key="' + testInput.id + '"]').checked), true);
    await read(() => {
      document.querySelector('#workspace-add-card').click();
      testInput.head.click();
    });
    assert.equal(await read(() => testInput.node.classList.contains('collapsed') && testInput.collapsed), true);
    assert.equal(await read(() => testInput.head.getAttribute('aria-expanded')), 'false');
    await read(() => { testInput.head.focus(); testInput.head.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    assert.equal(await read(() => testInput.collapsed), false);
    assert.equal(await read(() => testInput.head.querySelectorAll('.drag-handle,.toggle-icon,.card-pin-btn,.workspace-card-tools').length), 4);
    await read(() => {
      testInput.head.querySelector('.card-pin-btn').click();
      testInput.head.querySelector('[data-workspace-card-action="hide"]').click();
      document.querySelector('#workspace-add-card').click();
    });
    assert.equal(await read(() => document.querySelector('#workspace-card-options input[data-card-key="' + testInput.id + '"]').checked), false);
    await read(() => document.querySelector('#workspace-card-options input[data-card-key="' + testInput.id + '"]').click());
    assert.equal(await read(() => MathWorkspaceObjectPanels.panels.size), 1, 'showing a hidden panel restores the same instance');
    assert.equal(await read(() => testInput.node.classList.contains('is-pinned')), true);
    await read(() => {
      document.querySelector('#workspace-add-card').click();
      testInput.head.querySelector('[data-workspace-card-action="move-down"]').click();
    });
    assert.equal(await read(() => testInput.node.previousElementSibling.id), 'workspace-io-card');
    await read(() => testInput.head.querySelector('[data-workspace-card-action="move-up"]').click());
    console.log('PASS shared card header, checkbox visibility, pinning, collapse and ordering');
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [2, 1]);
    assert.deepEqual(await read(() => ['grid-rows','grid-cols'].map(id => testInput.activeRenderer.editor.shadow.getElementById(id).value)), ['5', '5']);
    assert.equal(await read(() => testInput.activeRenderer.editor.shadow.getElementById('mu-canvas').closest('.diagram-slot').getBoundingClientRect().width), 0);
    console.log('PASS compact single input, independent Assets, default 5 by 5');

    const key = async (key, code, options = {}) => {
      const windowsVirtualKeyCode = key === 'Backspace' ? 8 : key === 'a' ? 65 : 0;
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...options });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, ...options });
    };
    const type = async text => { for (const char of text) await client.send('Input.insertText', { text: char }); };
    await read(() => testInput.rows.focus()); await key('a', 'KeyA', { modifiers: 2 }); await key('Backspace', 'Backspace');
    assert.equal(await read(() => testInput.rows.value), '');
    await type('4, ');
    assert.equal(await read(() => testInput.rows.value), '4, ');
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [4]);
    await type('2, 1');
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [4, 2, 1]);
    await read(() => testInput.rows.setSelectionRange(3, 4)); await type('3');
    assert.equal(await read(() => testInput.rows.value), '4, 3, 1');
    assert.equal(await read(() => testInput.rows.selectionStart), 4);
    await read(() => testInput.name.focus()); await key('a', 'KeyA', { modifiers: 2 }); await key('Backspace', 'Backspace'); await type('daily ');
    assert.equal(await read(() => testInput.name.value), 'daily ');
    await type('task');
    await read(() => {
      testInput.name.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      testInput.name.value = '每日任务';
      testInput.name.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    });
    assert.equal(await read(() => MathWorkspaceAssetsTest.state.snapshot.assets.find(a => a.id === testAssets.a).name), 'daily task');
    await read(() => testInput.name.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
    await waitFor(() => read(() => MathWorkspaceAssetsTest.state.snapshot.assets.find(a => a.id === testAssets.a).name === '每日任务'));
    console.log('PASS sequential drafts, invalid prefixes, caret, trailing space, IME');

    await read(() => testInput.moveButton.click()); await delay(200);
    assert.equal(await read(() => testInput.activeRenderer.role), 'large');
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [4, 3, 1]);
    fs.writeFileSync(path.join(os.tmpdir(), 'math-workspace-object-large.png'), Buffer.from((await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await read(() => MathWorkspaceAssetsTest.setSplitView(true)); await delay(150);
    assert.equal(await read(() => testInput.activeRenderer.role), 'compact');
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [4, 3, 1]);
    await read(() => testInput.moveButton.click());
    assert.equal(await read(() => testInput.location), 'side');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const screenshotPath = path.join(os.tmpdir(), 'math-workspace-object-panels.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64')); console.log('SCREENSHOT ' + screenshotPath);
    console.log('PASS full width, split and side reuse one panel and asset');

    await read(() => {
      window.secondInput = MathWorkspaceObjectPanels.open('young-input', 'young:' + testAssets.a, 'main');
      MathWorkspaceAssetsTest.updateObjectAsset({ kind: 'young', id: testAssets.a }, { data: { partition: '2,1' } });
    });
    assert.deepEqual(await read(() => secondInput.activeRenderer.editor.collectAssets().rows), [2, 1]);
    assert.deepEqual(await read(() => testInput.activeRenderer.editor.collectAssets().rows), [2, 1]);
    const point = await read(() => {
      const canvas = testInput.activeRenderer.editor.shadow.getElementById('lambda-canvas'); canvas.scrollIntoView({ block: 'center' });
      const rect = canvas.getBoundingClientRect(); return { x: rect.left + rect.width * .65, y: rect.top + rect.height * .45 };
    });
    const before = await read(() => JSON.stringify(testInput.activeRenderer.editor.collectAssets().rows));
    await mouse(client, 'mouseMoved', point.x, point.y, 0); await mouse(client, 'mousePressed', point.x, point.y, 1); await mouse(client, 'mouseReleased', point.x, point.y, 0);
    await waitFor(() => read(previous => JSON.stringify(testInput.activeRenderer.editor.collectAssets().rows) !== previous, before));
    assert.deepEqual(await read(() => secondInput.activeRenderer.editor.collectAssets().rows), await read(() => testInput.activeRenderer.editor.collectAssets().rows));
    console.log('PASS actual canvas pointer editing publishes to the shared asset');
    await read(() => {
      MathWorkspaceAssetsTest.setSplitView(true);
      const transfer = new DataTransfer(); transfer.setData('application/x-math-workspace-panel', testInput.id);
      document.querySelector('#workspace-canvas-pane-secondary').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
    });
    await delay(100);
    assert.deepEqual(await read(() => [secondInput, testInput].map(panel => [panel.node.closest('[data-pane]').dataset.pane, panel.activeRenderer.role])), [['primary','compact'],['secondary','compact']]);
    fs.writeFileSync(path.join(os.tmpdir(), 'math-workspace-object-split.png'), Buffer.from((await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data, 'base64'));
    await read(() => MathWorkspaceObjectPanels.move(testInput, 'side'));
    console.log('PASS two independent input panels naturally share the main area');

    await read(() => {
      MathWorkspaceAssetsTest.updateObjectAsset({ kind: 'young', id: testAssets.a }, { data: { partition: '1' } });
      window.lrPanel = MathWorkspaceObjectPanels.open('lr', 'young:' + testAssets.a, 'side');
      window.statsPanel = MathWorkspaceObjectPanels.open('statistics', 'young:' + testAssets.b, 'side');
    });
    const choose = (panelName, role, kind, assetName) => read((panelName, role, kind, assetName) => {
      const select = window[panelName].node.querySelector('[data-object-reference="' + role + '"]');
      select.value = kind + ':' + testAssets[assetName]; select.dispatchEvent(new Event('change', { bubbles: true }));
    }, panelName, role, kind, assetName);
    await read(() => {
      const transfer = new DataTransfer(); transfer.setData('application/x-math-workspace-asset', JSON.stringify({ kind: 'young', id: testAssets.b }));
      lrPanel.node.querySelector('[data-object-reference="mu"]').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
    });
    await choose('lrPanel', 'lie', 'lie', 'g');
    await waitFor(() => read(() => !!lrPanel.propertyRenderer));
    await read(() => lrPanel.propertyRenderer.editor.inspectorShadow.getElementById('compute-schur').click()); await delay(200);
    assert.equal(await read(() => lrPanel.computation.status), 'current');
    const lr = await read(() => lrPanel.propertyRenderer.editor.readObjectResult().text);
    assert(lr.includes('(2)') && lr.includes('(1,1)'), lr);
    assert.equal(await read(() => statsPanel.propertyRenderer.editor.inspectorShadow.getElementById('out-size').textContent.trim()), '1');
    const lrId = await read(() => lrPanel.computation.id);
    await read(() => lrPanel.moveButton.click()); await delay(150);
    assert.equal(await read(() => lrPanel.computation.id), lrId);
    assert.equal(await read(() => lrPanel.propertyRenderer.editor.readObjectResult().text), lr);
    await read(() => { window.liePanel = MathWorkspaceObjectPanels.open('lie-input', 'lie:' + testAssets.g); liePanel.rank.focus(); });
    await key('a', 'KeyA', { modifiers: 2 }); await key('Backspace', 'Backspace');
    assert.equal(await read(() => liePanel.rank.value), '');
    assert.equal(await read(() => lrPanel.computation.status), 'current');
    await type('4');
    assert.equal(await read(() => lrPanel.computation.status), 'stale');
    assert.equal(await read(() => lrPanel.propertyRenderer.editor.shadow.getElementById('lie-rank').value), '4');
    assert.equal(await read(() => statsPanel.propertyRenderer.editor.inspectorShadow.getElementById('out-size').textContent.trim()), '1');
    await read(() => {
      const io = lrPanel.node.querySelector('.workspace-object-io');
      [...io.querySelectorAll('button')].find(button => button.textContent === 'export').click();
    });
    assert.equal(await read(() => JSON.parse(lrPanel.node.querySelector('.workspace-object-io textarea').value).result), null, 'stale results are never exported as current');
    console.log('PASS dual inputs, native LR result, independent statistics and shared Lie invalidation');

    await choose('lrPanel', 'mu', 'young', 'a');
    assert.equal(await read(() => lrPanel.computation.refs.lambda === lrPanel.computation.refs.mu), true);
    await read(() => { window.cupPanel = MathWorkspaceObjectPanels.open('grassmannian', 'young:' + testAssets.a); });
    await choose('cupPanel', 'mu', 'young', 'b'); await choose('cupPanel', 'space', 'variety', 'x');
    assert.deepEqual(await read(() => ['grid-rows','grid-cols'].map(id => cupPanel.propertyRenderer.editor.shadow.getElementById(id).value)), ['2', '2']);
    await read(() => MathWorkspaceAssetsTest.updateObjectAsset({ kind: 'variety', id: testAssets.x }, { data: { r: 3, n: 6 } }));
    assert.deepEqual(await read(() => ['grid-rows','grid-cols'].map(id => cupPanel.propertyRenderer.editor.shadow.getElementById(id).value)), ['3', '3']);
    console.log('PASS same-asset inputs and Grassmannian object geometry');

    // Exercise every migrated renderer with small inputs, including the derived
    // slice canvas; they must work without any corresponding Input view.
    await read(() => {
      MathWorkspaceObjectPanels.move(testInput, 'hidden');
      MathWorkspaceObjectPanels.move(secondInput, 'hidden');
      window.otherPanels = {};
      for (const id of ['weight','branching','symmetric','pair-statistics','invariants','kostka','kronecker','plethysm','schur','polynomials','slice']) {
        otherPanels[id] = MathWorkspaceObjectPanels.open(id, 'young:' + testAssets.a, 'side');
      }
    });
    for (const id of ['weight','branching','symmetric','pair-statistics','invariants','kostka','kronecker','plethysm','schur','polynomials','slice']) {
      await read(id => {
        const panel = otherPanels[id];
        for (const [role, key] of [['mu','young:' + testAssets.b], ['lie','lie:' + testAssets.g]]) {
          const select = panel.node.querySelector('[data-object-reference="' + role + '"]');
          if (select) { select.value = key; select.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        const compute = panel.propertyRenderer?.editor.inspectorShadow.querySelector('.workspace-object-content [data-shortcut-primary]');
        compute?.click();
      }, id);
      assert.equal(await read(id => !!otherPanels[id].propertyRenderer, id), true, id);
    }
    await delay(250);
    assert.equal(await read(() => otherPanels.slice.propertyRenderer.editor.inspectorShadow.getElementById('open-slice-btn').disabled), true, 'collinear inputs show an inline explanation');
    await read(() => MathWorkspaceAssetsTest.updateObjectAsset({ kind: 'young', id: testAssets.b }, { data: { partition: '1,1' } }));
    assert.equal(await read(() => otherPanels.slice.propertyRenderer.editor.shadow.getElementById('slice-panel').style.display), '', 'independent inputs produce a slice without an Input view');
    await read(() => {
      const panel = otherPanels.branching, rule = panel.node.querySelector('[data-branching-rule]');
      const mu = panel.node.querySelector('[data-object-reference="mu"]');
      mu.value = ''; mu.dispatchEvent(new Event('change', { bubbles: true }));
      rule.value = 'sum-gl'; rule.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await read(() => otherPanels.branching.computation.status), 'stale');
    assert.equal(await read(() => otherPanels.branching.node.querySelector('[data-object-reference="mu"]').closest('.workspace-object-reference').hidden), true);
    assert.equal(await read(() => otherPanels.branching.propertyRenderer.editor.inspectorShadow.getElementById('br-rule').value), 'sum-gl');
    await read(() => {
      const panel = otherPanels.branching, rule = panel.node.querySelector('[data-branching-rule]');
      rule.value = 'diag-gl'; rule.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await read(() => otherPanels.branching.computation.status), 'missing');
    await read(() => {
      const mu = otherPanels.branching.node.querySelector('[data-object-reference="mu"]');
      mu.value = 'young:' + testAssets.b; mu.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await read(() => otherPanels.branching.computation.status), 'stale');
    console.log('PASS slice dependence and branching rule input arity');
    await read(() => {
      window.generalizedAsset = MathWorkspaceAssetsTest.createObjectAsset('young', { type:'generalized', data:{partition:'2, 0, -1'} });
      window.generalizedPanel = MathWorkspaceObjectPanels.open('young-input', 'young:' + generalizedAsset.id, 'main');
    });
    assert.deepEqual(await read(() => generalizedPanel.activeRenderer.editor.collectAssets().rows), [2, 0, -1]);
    await read(() => {
      const root = generalizedPanel.activeRenderer.editor.shadow, cols = root.getElementById('grid-cols');
      cols.value = '1'; cols.dispatchEvent(new Event('change', { bubbles:true }));
    });
    assert.deepEqual(await read(() => generalizedPanel.activeRenderer.editor.collectAssets().rows), [2, 0, -1], 'resizing the signed grid must not clip the object');
    await read(() => MathWorkspaceAssetsTest.closeCanvas(generalizedPanel.id));
    assert.equal(await read(() => generalizedPanel.closed), true);
    await read(() => MathWorkspaceObjectPanels.move(generalizedPanel, 'side'));
    assert.deepEqual(await read(() => generalizedPanel.activeRenderer.editor.collectAssets().rows), [2, 0, -1]);
    console.log('PASS all migrated Property renderers, generalized rows and close/reopen');

    await read(async () => {
      const api = MathWorkspaceAssetsTest, refs = [{ kind: 'lie', id: testAssets.g }];
      const plan = await api.assetRequest('plan-delete', { refs });
      const snapshot = await api.assetRequest('commit-delete', { refs, revision: plan.revision }); api.applyAssetSnapshot(snapshot);
    });
    await waitFor(() => read(() => lrPanel.computation.status === 'missing'));
    assert.equal(await read(() => lrPanel.computation.refs.lie), 'lie:' + await read(() => testAssets.g));
    assert.equal(await read(() => lrPanel.renderArea.hidden), true);
    assert.equal(await read(() => MathWorkspaceAssetsTest.state.snapshot.assets.filter(a => a.kind === 'young').length), 3);
    await client.send('Emulation.setDeviceMetricsOverride', { width: 760, height: 1000, deviceScaleFactor: 1, mobile: false }); await delay(200);
    assert.equal(await read(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(await read(() => [...MathWorkspaceObjectPanels.panels.values()].filter(panel => panel.message.dataset.state === 'error').map(panel => panel.message.textContent)), []);
    console.log('math_workspace_objects_ui_test: all object/panel integration checks passed');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
