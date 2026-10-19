'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session, errors = [];
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await client.send('Runtime.enable'); await client.send('Page.enable');
    client.socket.addEventListener('message', event => {
      const msg = JSON.parse(String(event.data));
      if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Page.javascriptDialogOpening') { errors.push(msg.params.message); client.send('Page.handleJavaScriptDialog', { accept: true }); }
    });
    const type = async value => { for (const text of value) await client.send('Input.insertText', { text }); };
    const key = async (key, code, modifiers = 0) => {
      const windowsVirtualKeyCode = key === 'Backspace' ? 8 : key === 'a' ? 65 : 0;
      for (const type of ['keyDown','keyUp']) await client.send('Input.dispatchKeyEvent', { type, key, code, modifiers, windowsVirtualKeyCode });
    };
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels;
      window.a = api.createObjectAsset('matrix', { name: 'A', data: { rows: 2, cols: 2, entries: [['1','2'],['3','4']], dataType: 'rational' } });
      window.b = api.createObjectAsset('matrix', { name: 'B', data: { rows: 2, cols: 2, entries: [['1','0'],['0','1']] } });
      window.input = panels.open('matrix-input', 'matrix:' + a.id, 'main');
      window.other = panels.open('matrix-input', 'matrix:' + b.id, 'side');
      window.inv = panels.open('matrix-invariants', 'matrix:' + a.id, 'side');
      window.op = panels.open('matrix-computation', 'matrix:' + a.id, 'side');
    });
    assert.equal(await read(() => panels.listCards().some(card => /Input/.test(card.label))), false);
    await read(() => {
      document.querySelector('#workspace-add-card').click();
      document.querySelector('#workspace-card-options input[data-card-key="' + op.id + '"]').click();
    });
    assert.equal(await read(() => op.closed), true);
    await read(() => { document.querySelector('#workspace-card-options input[data-card-key="' + op.id + '"]').click(); document.querySelector('#workspace-add-card').click(); });
    assert.equal(await read(() => op.computation.refs.matrix), 'matrix:' + await read(() => a.id));
    assert.equal(await read(() => [...document.querySelector('#workspace-open-canvas').options].some(o => ['matrices','categories'].includes(o.value))), false);
    assert.match(await read(() => inv.propertyRenderer.editor.readObjectResult().text), /-2/);
    await read(() => {
      const root = op.propertyRenderer.editor.inspectorShadow;
      root.querySelector('#operation-select').value = 'inverse'; root.querySelector('#compute-operation').click();
    });
    await waitFor(() => read(() => op.computation.status === 'current'));
    assert.match(await read(() => panels.exportText('property:' + op.computation.id, 'rows')), /-2/);
    const matrixShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(os.tmpdir(), 'math-workspace-matrix-input.png'), Buffer.from(matrixShot.data, 'base64'));
    await read(() => { const root = input.activeRenderer.editor.shadow, field = root.querySelector('#data-type-select'); field.value = 'real'; field.dispatchEvent(new Event('change', { bubbles: true })); root.querySelector('.matrix-cell').focus(); });
    await key('a', 'KeyA', 2); await key('Backspace', 'Backspace');
    assert.equal(await read(() => input.activeRenderer.editor.shadow.querySelector('.matrix-cell').value), '');
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(x => x.id === a.id).data.entries[0][0]), '1');
    await read(() => api.updateObjectAsset({ kind: 'matrix', id: b.id }, { name: 'B_2' }));
    assert.equal(await read(() => input.activeRenderer.editor.shadow.querySelector('.matrix-cell').value), '', 'unrelated updates preserve the blank draft');
    await type('-');
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(x => x.id === a.id).data.entries[0][0]), '1');
    await type('2.5');
    assert.equal(await read(() => input.activeRenderer.editor.shadow.querySelector('.matrix-cell').value), '-2.5');
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(x => x.id === a.id).data.entries[0][0]), '-2.5');
    assert.equal(await read(() => op.computation.status), 'stale');
    assert.equal(await read(() => JSON.parse(panels.exportText('property:' + op.computation.id)).result), null);
    await read(() => { const root = input.activeRenderer.editor.shadow; root.querySelector('#matrix-cols').value = '3'; root.querySelector('#matrix-cols').dispatchEvent(new Event('change', { bubbles: true })); });
    assert.deepEqual(await read(() => api.localAssetSnapshot().assets.find(x => x.id === a.id).data.entries[0]), ['-2.5','2','0']);
    await read(() => input.activeRenderer.editor.shadow.querySelector('#clear-matrix').click());
    assert.deepEqual(await read(() => api.localAssetSnapshot().assets.find(x => x.id === a.id).data.entries[0]), ['0','0','0']);
    await read(() => panels.importText('matrix:' + a.id, '1,0;0,1'));
    await read(() => { panels.move(input, 'side'); panels.move(input, 'main'); api.setSplitView(true); });
    assert.deepEqual(await read(() => { const data = api.localAssetSnapshot().assets.find(x => x.id === a.id).data; return [data.rows, data.cols]; }), [2,2]);
    await read(() => panels.move(input, 'hidden'));
    assert.equal(await read(() => panels.open('matrix-input', 'matrix:' + a.id, 'side').id), await read(() => input.id), 'reopening an Input restores its hidden instance');
    await read(() => panels.move(input, 'hidden'));
    await read(() => panels.importText('matrix:' + a.id, '1, 0; 0, 1'));
    assert.equal(await read(() => panels.exportText('matrix:' + a.id, 'latex').includes('pmatrix')), true);
    const beforeBad = await read(() => panels.exportText('matrix:' + a.id));
    assert.equal(await read(() => { try { panels.importText('matrix:' + a.id, '1, 2; 3'); return false; } catch (_) { return true; } }), true);
    assert.equal(await read(() => panels.exportText('matrix:' + a.id)), beforeBad);
    await read(() => {
      window.poly = panels.open('matrix-polynomial', 'matrix:' + a.id, 'side');
      const root = poly.propertyRenderer.editor.inspectorShadow;
      root.querySelector('#polynomial-action-variables').value = 'x,y';
      root.querySelector('#polynomial-action-input').value = 'x^2+y';
      root.querySelector('#compute-polynomial-action').click();
    });
    await waitFor(() => read(() => poly.computation.status === 'current'));
    assert.match(await read(() => panels.exportText('property:' + poly.computation.id, 'latex')), /x/);
    console.log('PASS Matrix assets, native computations, drafts, sizing, stale results and centralized IO');

    await read(() => {
      window.c = api.createObjectAsset('category', { name: 'C' });
      window.d = api.createObjectAsset('category', { name: 'D' });
      window.f = api.createObjectAsset('functor', { name: 'F', data: { domain: 'category:' + c.id, codomain: 'category:' + c.id } });
      window.cInput = panels.open('category-input', 'category:' + c.id, 'side');
      window.fInput = panels.open('functor-input', 'functor:' + f.id, 'side');
      window.scene = panels.open('category-diagram', 'functor:' + f.id, 'main');
    });
    assert.deepEqual(await read(() => api.localAssetSnapshot().assets.find(x => x.id === f.id).dependencies.map(x => x.id)), [await read(() => c.id)]);
    assert.equal(await read(() => JSON.parse(scene.propertyRenderer.editor.objectIO('export', 'preset')).categories.length), 1);
    await read(() => {
      const root = cInput.activeRenderer.editor.inspectorShadow, preset = root.querySelector('#category-preset-select');
      preset.selectedIndex = 1; root.querySelector('#category-apply-preset').click();
    });
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(x => x.id === c.id).name), await read(() => cInput.activeRenderer.editor.collectAssets().name));
    await read(() => {
      const asset = api.localAssetSnapshot().assets.find(x => x.id === c.id);
      api.updateObjectAsset({ kind: 'category', id: c.id }, { name: 'C', data: { ...asset.data, objectCondition: '' } });
    });
    await read(() => {
      const root = cInput.activeRenderer.editor.inspectorShadow;
      root.querySelector('#category-object-condition-preview').click(); root.querySelector('#category-object-condition').focus();
    });
    await type('daily ');
    assert.equal(await read(() => cInput.activeRenderer.editor.inspectorShadow.querySelector('#category-object-condition').value), 'daily ');
    await type('task');
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(x => x.id === c.id).data.objectCondition), 'daily task');
    await read(() => { const control = fInput.node.querySelector('[data-object-reference="codomain"]'); control.value = 'category:' + d.id; control.dispatchEvent(new Event('change')); });
    assert.equal(await read(() => JSON.parse(scene.propertyRenderer.editor.objectIO('export', 'preset')).categories.length), 2);
    await read(() => scene.propertyRenderer.editor.shadow.querySelector('[data-object-kind="category"]').click());
    assert.equal(await read(() => cInput.assetKey), 'category:' + await read(() => c.id));
    assert.equal(await read(() => fInput.assetKey), 'functor:' + await read(() => f.id));
    await read(() => {
      scene.propertyRenderer.editor.objectIO('layout', [{ id: 'category:' + c.id, x: .2, y: .3 }]);
      api.updateObjectAsset({ kind: 'category', id: c.id }, { data: { ...api.localAssetSnapshot().assets.find(x => x.id === c.id).data, opposite: true } });
    });
    assert.equal(await read(() => JSON.parse(scene.propertyRenderer.editor.objectIO('export', 'preset')).categories.find(x => x.id === 'category:' + c.id).x), .2);
    const scenePreset = await read(() => panels.exportText('property:' + scene.computation.id, 'preset'));
    const count = await read(() => api.localAssetSnapshot().assets.length);
    await read(text => panels.importText('category-graph', text), scenePreset);
    assert.equal(await read(() => api.localAssetSnapshot().assets.length), count + 3);
    assert.equal(await read(() => { try { panels.importText('category-graph', JSON.stringify({ kind: 'category-calculator-prototype', categories: [{id:'x'}], functors: [{id:'f',domainId:'missing',codomainId:'x'}] })); return false; } catch (_) { return true; } }), true);
    assert.equal(await read(() => api.localAssetSnapshot().assets.length), count + 3, 'invalid graph imports are atomic');
    assert.equal(await read(() => panels.listCards().some(card => /Input/.test(card.label))), false);
    await read(() => api.updateObjectAsset({ kind: 'category', id: c.id }, { name: 'RenamedC' }));
    assert.match(await read(() => scene.propertyRenderer.editor.readObjectResult().text), /RenamedC/);
    await read(() => { api.state.snapshot.assets = api.state.snapshot.assets.filter(x => x.id !== c.id && x.id !== a.id); api.applyAssetSnapshot(api.localAssetSnapshot()); });
    assert.equal(await read(() => scene.computation.status), 'missing');
    assert.equal(await read(() => inv.computation.status), 'missing');
    assert.equal(await read(() => cInput.renderArea.hidden), true);
    assert.equal(await read(() => scene.computation.refs.nodes[0]), 'functor:' + await read(() => f.id));
    await client.send('Emulation.setDeviceMetricsOverride', { width: 760, height: 1000, deviceScaleFactor: 1, mobile: false });
    assert.equal(await read(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(os.tmpdir(), 'math-workspace-matrix-category.png'); fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot: ' + screenshotPath);
    assert.deepEqual(errors, []);
    console.log('PASS Category/Functor references, native formulas, self functors, independent views, graph IO and no runtime errors');
  } finally { if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); } await new Promise(resolve => server.close(resolve)); }
}
if (require.main === module) run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
