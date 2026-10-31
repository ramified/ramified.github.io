'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    const installHarness = () => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels; window.k = api.assetKey;
      window.get = ref => api.localAssetSnapshot().assets.find(a => k(a) === k(ref));
      // The retained native Input is used only to inspect real computation;
      // every reference edit below uses the ordinary Assets Input controls.
      window.nativePanel = panels.open('sheaf-input', k(tensor), 'main');
      window.payload = ref => {
        nativePanel.computation.refs.asset = k(ref); panels.refresh();
        return nativePanel.propertyRenderer.editor.objectIO('input-graph').entries.find(e => e.assetKey === k(ref)).data.workspaceSheafComplex.payload;
      };
      window.geometryEvidence = ref => {
        const construction = payload(ref).construction;
        const field = { 'ideal-sheaf': 'idealSheafMapId', 'normal-bundle': 'normalBundleMapId', 'conormal-bundle': 'conormalBundleMapId', 'relative-tangent': 'relativeSheafMapId', 'relative-cotangent': 'relativeSheafMapId' }[get(ref).type];
        const map = nativePanel.propertyRenderer.editor.objectIO('input-graph').entries.find(e => e.assetKey === get(ref).data.map);
        return { actualMap: construction?.[field], expectedMap: map?.nativeId, relativeType: construction?.relativeSheafType, savedType: get(ref).type };
      };
      window.choose = (field, ref) => {
        document.querySelector('[data-assets-reference="' + field + '"]').click();
        const option = [...document.querySelectorAll('.workspace-reference-option')].find(n => n.dataset.assetKey === k(ref));
        if (!option) throw Error('Missing compatible reference ' + k(ref));
        option.click();
      };
      window.cacheNativeGraph = () => {
        // Save through the historical Input so generated differential sheaves
        // and exact-sequence scaffolding are persisted with their references.
        const root = nativePanel.propertyRenderer.editor.shadow, name = root.getElementById('sheaf-name');
        name.value = 'K_{cache' + (window.nativeSaveIndex = (window.nativeSaveIndex || 0) + 1) + '}';
        name.dispatchEvent(new Event('input', { bubbles: true }));
        const save = root.getElementById('add-object');
        if (save.disabled) throw Error('Historical Input must be ready to save');
        save.click();
      };
    };
    const space = async () => {
      await read(() => document.querySelector('[data-assets-field="confirmed"]').focus());
      for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    };
    const save = () => read(() => document.querySelector('[data-assets-editor]').requestSubmit());
    const assertGeometry = async (name = 'geo', index = null) => {
      const result = await read(({ name, index }) => geometryEvidence(index == null ? window[name] : window[name][index]), { name, index });
      assert.ok(result.actualMap, result.savedType + ' must materialize its geometric construction');
      assert.equal(result.actualMap, result.expectedMap, 'native computation must use the saved map');
      if (result.savedType.startsWith('relative-')) assert.equal(result.relativeType, result.savedType.slice('relative-'.length));
    };
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels; window.k = api.assetKey;
      window.get = ref => api.localAssetSnapshot().assets.find(a => k(a) === k(ref));
      window.P = api.createObjectAsset('variety', { name: 'P', type: 'projective', data: { dimension: '3' } });
      window.Q = api.createObjectAsset('variety', { name: 'Q', type: 'projective', data: { dimension: '2' } });
      window.E = api.createObjectAsset('sheaf', { name: 'E', type: 'locally-free', data: { base: k(P), rank: '2' } });
      window.F = api.createObjectAsset('sheaf', { name: 'F', type: 'locally-free', data: { base: k(P), rank: '3' } });
      window.G = api.createObjectAsset('sheaf', { name: 'G', type: 'locally-free', data: { base: k(P), rank: '4' } });
      window.i = api.createObjectAsset('map', { name: 'i', data: { domain: k(Q), codomain: k(P) } });
      window.h = api.createObjectAsset('map', { name: 'h', data: { domain: k(P), codomain: k(Q) } });
      window.tensor = api.createObjectAsset('sheaf', { name: 'B', type: 'tensor', data: {
        first: k(E), second: k(F), parents: [k(E), k(F), k(G)], exponents: ['1','1','1']
      } });
      window.geos = [];
    });
    await read(installHarness);
    await read(() => {
      api.assetRequest('select-for-modify', { ref: tensor });
    });
    if (!process.argv.includes('--geometry-only')) {
      assert.equal(await read(() => payload(tensor).rank), '24');
      await read(() => { choose('first', G); document.querySelector('[data-assets-editor]').requestSubmit(); });
      assert.deepEqual(await read(() => get(tensor).data.parents), await read(() => [k(G), k(F), k(G)]), 'TENSOR-001: First sheaf edit must update the canonical factor list');
      assert.equal(await read(() => payload(tensor).rank), '48', 'the result must use the edited factor');
      await read(() => {
        cacheNativeGraph();
        const data = JSON.parse(JSON.stringify(get(tensor).data)); data.workspaceSheafComplex.payload.id = 'legacy-tensor-test';
        window.tensor = api.createObjectAsset('sheaf', { name: 'B_{cached}', type: 'tensor', data });
        api.assetRequest('select-for-modify', { ref: tensor });
      });
      assert.ok(await read(() => get(tensor).data.workspaceSheafComplex.payload.construction), 'exercise an actual saved native construction');
      await read(() => choose('second', E)); await save();
      assert.deepEqual(await read(() => get(tensor).data.parents), await read(() => [k(G), k(E), k(G)]));
      assert.equal(await read(() => !!get(tensor).data.workspaceSheafComplex?.payload?.construction), false, 'changing a factor invalidates the cached construction');
      assert.equal(await read(() => payload(tensor).rank), '32');
      assert.deepEqual(await read(() => get(tensor).data.exponents), ['1', '1', '1']);
      await read(() => {
        window.powered = api.createObjectAsset('sheaf', { name: 'B_{powered}', type: 'tensor', data: {
          first: k(E), second: k(F), parents: [k(E), k(F), k(G)], exponents: ['2','1','1'], exact: true
        } });
        window.binary = api.createObjectAsset('sheaf', { name: 'B_{binary}', type: 'tensor', data: { first: k(E), second: k(F) } });
        api.assetRequest('select-for-modify', { ref: powered });
      });
      assert.equal(await read(() => payload(powered).rank), '48');
      await read(() => choose('first', G)); await save();
      assert.equal(await read(() => payload(powered).rank), '192');
      assert.deepEqual(await read(() => [get(powered).data.exponents, get(powered).data.exact, get(powered).data.parents[2]]), await read(() => [['2','1','1'], true, k(G)]), 'retain every exponent, extra factor, and exactness setting');
      await read(() => { api.assetRequest('select-for-modify', { ref: binary }); choose('second', G); }); await save();
      assert.equal(await read(() => payload(binary).rank), '8', 'two-factor products without a parents array remain editable');
    }
    const types = ['ideal-sheaf', 'normal-bundle', 'conormal-bundle', 'relative-tangent', 'relative-cotangent'];
    for (const [index, type] of types.entries()) {
      await read(({ index, type }) => {
        window.geo = api.createObjectAsset('sheaf', { name: 'N_{' + index + '}', data: { base: k(P) } });
        geos.push(geo);
        api.assetRequest('select-for-modify', { ref: geo });
        const select = document.querySelector('[data-assets-subtype]'); select.value = type; select.dispatchEvent(new Event('change', { bubbles: true }));
        choose('map', type.startsWith('relative-') ? h : i);
      }, { index, type });
      assert.equal(await read(() => !!document.querySelector('input[type="checkbox"][data-assets-field="confirmed"]')), true, 'GEO-001: ' + type + ' must expose a geometric-hypothesis confirmation');
      await save();
      assert.equal(await read(() => get(geo).type), 'abstract', 'unconfirmed drafts do not replace the saved object');
      assert.match(await read(() => api.activeAssetInputInstance().validation.message), /Confirm the geometric hypotheses/);
      assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), false);
      await space();
      assert.equal(await read(() => get(geo).type), type);
      assert.equal(await read(() => get(geo).data.confirmed), true, 'confirmation is saved as a boolean');
      assert.ok(await read(() => payload(geo).construction), type + ' constructs successfully');
      await assertGeometry();
      await read(() => { api.assetRequest('select-for-modify', { ref: tensor }); api.assetRequest('select-for-modify', { ref: geo }); });
      assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), true, 'reopening preserves confirmation');
    }
    await read(() => cacheNativeGraph());
    await space(); await save();
    assert.equal(await read(() => get(geo).data.confirmed), true, 'unchecking cannot overwrite a valid cached saved construction');
    assert.match(await read(() => api.activeAssetInputInstance().validation.message), /Confirm the geometric hypotheses/);
    await space();
    await read(() => {
      choose('map', h);
      window.h2 = api.createObjectAsset('map', { name: 'h_{2}', data: { domain: k(P), codomain: k(Q) } });
    });
    assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), true, 'reselecting the same map keeps confirmation');
    await read(() => choose('map', h2));
    assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), false, 'a new map requires new confirmation');
    assert.equal(await read(() => get(geo).data.map), await read(() => k(h)));
    await space();
    assert.equal(await read(() => get(geo).data.map), await read(() => k(h2)));
    await assertGeometry();
    await read(() => {
      const select = document.querySelector('[data-assets-subtype]'); select.value = 'relative-tangent'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), false, 'a different construction requires confirmation');
    assert.equal(await read(() => get(geo).type), 'relative-cotangent');
    await space();
    assert.equal(await read(() => get(geo).type), 'relative-tangent');
    await read(() => { const name = document.querySelector('[data-assets-name]'); name.focus(); name.select(); });
    await client.send('Input.insertText', { text: 'N_{renamed}' });
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await save();
    assert.deepEqual(await read(() => [get(geo).name, get(geo).data.confirmed]), ['N_{renamed}', true], 'renaming does not revoke hypotheses');
    await read(() => {
      payload(geo); cacheNativeGraph();
      const data = JSON.parse(JSON.stringify(get(geo).data)); delete data.confirmed; data.workspaceSheafComplex.payload.id = 'legacy-geometry-test';
      window.legacy = api.createObjectAsset('sheaf', { name: 'N_{legacy}', type: get(geo).type, data });
      api.assetRequest('select-for-modify', { ref: legacy });
    });
    assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), true, 'legacy saved geometry opens as confirmed');
    await space(); await save();
    assert.match(await read(() => api.activeAssetInputInstance().validation.message), /Confirm the geometric hypotheses/);
    await space();
    assert.equal(await read(() => get(legacy).data.confirmed), true);
    await assertGeometry('legacy');
    const backup = await read(() => panels.exportText('workspace'));
    const refs = await read(() => ({ tensor, geos, legacy }));
    const expected = await read(() => [tensor, ...geos, legacy].map(ref => ({ id: ref.id, type: get(ref).type, data: get(ref).data })));
    await client.send('Page.reload');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(text => { MathWorkspaceObjectPanels.importText('workspace', text); }, backup);
    await read(refs => { Object.assign(window, refs); }, refs);
    await read(installHarness);
    assert.deepEqual(await read(() => [tensor, ...geos, legacy].map(ref => ({ id: ref.id, type: get(ref).type, data: get(ref).data }))), expected, 'workspace backup preserves the edited factors and confirmations');
    assert.equal(await read(() => payload(tensor).rank), process.argv.includes('--geometry-only') ? '24' : '32');
    for (const index of types.keys()) {
      await read(index => { api.assetRequest('select-for-modify', { ref: geos[index] }); }, index);
      assert.equal(await read(() => document.querySelector('[data-assets-field="confirmed"]').checked), true);
      await assertGeometry('geos', index);
    }
    const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(os.tmpdir(), 'math-workspace-geometric-confirmation.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot: ' + screenshotPath);
    console.log('PASS TENSOR-001/GEO-001: edits, ranks, exponents, cached constructions, keyboard confirmation, map/type changes, legacy data and cross-page backup');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
