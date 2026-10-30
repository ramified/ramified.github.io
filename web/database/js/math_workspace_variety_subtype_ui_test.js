'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(async () => {
      window.api = MathWorkspaceAssetsTest;
      window.asset = api.createObjectAsset('variety');
      await api.assetRequest('select-for-modify', { ref: asset });
      window.changeType = type => {
        const select = document.querySelector('[data-assets-subtype]');
        select.value = type; select.dispatchEvent(new Event('change', { bubbles: true }));
      };
      window.values = () => {
        const record = api.localAssetSnapshot().assets.find(item => item.id === asset.id);
        return [document.querySelector('[data-assets-name]').value,
          document.querySelector('[data-assets-field="dimension"]').value, record.name, record.data.dimension];
      };
      changeType('curve');
    });
    assert.deepEqual(await read(() => values()), ['C', '1', 'C', '1'], 'switching to Curve updates both controls and saved data');
    assert.equal(await read(() => document.querySelector('[data-assets-field="dimension"]').readOnly), true);
    await read(() => api.renderAssetsEditor());
    assert.deepEqual(await read(() => values()), ['C', '1', 'C', '1'], 'rerender must not restore the old dimension');
    await read(() => changeType('point'));
    assert.equal(await read(() => values()[1]), '0', 'Point also discards the old dimension');
    await read(() => changeType('curve'));
    assert.deepEqual(await read(() => values()), ['C', '1', 'C', '1']);
    const press = async (key, code, modifiers = 0) => {
      for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key, code, modifiers, windowsVirtualKeyCode: key === 'a' ? 65 : key === 'Backspace' ? 8 : 0 });
    };
    await read(() => document.querySelector('[data-assets-name]').focus());
    await press('a', 'KeyA', 2); await press('Backspace', 'Backspace');
    assert.equal(await read(() => values()[0]), '');
    for (const text of ['D', ' ', 'custom']) await client.send('Input.insertText', { text });
    assert.equal(await read(() => values()[0]), 'D custom');
    await read(() => { document.activeElement.blur(); changeType('abstract'); changeType('curve'); });
    assert.deepEqual(await read(() => values()), ['D custom', '1', 'D custom', '1'], 'custom names survive subtype changes');
    assert.deepEqual(await read(() => {
      const first = api.createObjectAsset('variety', { type: 'curve' });
      const second = api.createObjectAsset('variety', { type: 'curve' });
      return [first.name, first.data.dimension, second.name, second.data.dimension];
    }), ['C', '1', 'C_{2}', '1'], 'direct curve creation uses unique C names');
    await read(async () => {
      asset = api.createObjectAsset('variety');
      await api.assetRequest('select-for-modify', { ref: asset }); changeType('curve');
    });
    assert.deepEqual(await read(() => values()), ['C_{3}', '1', 'C_{3}', '1'], 'subtype changes avoid name collisions too');
    await read(async () => { await api.assetRequest('prepare-create', { kind: 'variety' }); changeType('curve'); });
    assert.deepEqual(await read(() => [document.querySelector('[data-assets-name]').value, document.querySelector('[data-assets-field="dimension"]').value]), ['C_{4}', '1'], 'unbound creation form also supplies curve defaults');
    await read(() => {
      document.querySelector('[data-assets-editor]').requestSubmit();
      asset = api.localAssetSnapshot().assets.find(a => a.id === api.activeAssetInputInstance().targetRef.id);
    });
    assert.deepEqual(await read(() => values()), ['C_{4}', '1', 'C_{4}', '1'], 'submitting the creation form keeps its defaults');
    await read(() => changeType('abelian'));
    assert.deepEqual(await read(() => values()), ['A', '3', 'A', '3'], 'created objects retain automatic naming after submission');
    await read(() => api.updateObjectAsset(asset, { name: 'SubmittedVariety' }));
    await read(async () => {
      asset = api.createObjectAsset('variety');
      await api.assetRequest('select-for-modify', { ref: asset });
      window.chooseFactor = (field, factor) => {
        document.querySelector('[data-assets-reference="' + field + '"]').click();
        document.querySelector('.workspace-reference-option[data-asset-key="variety:' + factor.id + '"]').click();
      };
      window.left = api.createObjectAsset('variety', { type: 'projective', name: 'L', data: { dimension: '2' } });
      window.right = api.createObjectAsset('variety', { type: 'curve', name: 'R' });
      changeType('product');
    });
    assert.equal(await read(() => values()[1]), '', 'a product without factors has unknown dimension, never the old dimension');
    await read(() => chooseFactor('first', left));
    assert.equal(await read(() => values()[1]), '');
    await read(() => chooseFactor('second', right));
    assert.deepEqual(await read(() => values()), ['L\\times R', '3', 'L\\times R', '3'], 'product fields are derived after both factors are selected');
    await read(() => { window.nested = api.createObjectAsset('variety', { type: 'product', data: { first: 'variety:' + asset.id, second: 'variety:' + right.id } }); });
    await read(() => api.updateObjectAsset(left, { name: 'Lnew', data: { dimension: '5' } }));
    assert.deepEqual(await read(() => values()), ['Lnew\\times R', '6', 'Lnew\\times R', '6'], 'factor changes refresh the open product editor and model');
    assert.deepEqual(await read(() => { const item = api.localAssetSnapshot().assets.find(a => a.id === nested.id); return [item.name, item.data.dimension]; }), ['Lnew\\times R\\times R', '7'], 'nested products update transitively');
    await read(() => api.updateObjectAsset(asset, { name: 'CustomProduct' }));
    await read(() => api.updateObjectAsset(left, { name: 'Lagain', data: { dimension: '4' } }));
    assert.deepEqual(await read(() => { const item = api.localAssetSnapshot().assets.find(a => a.id === asset.id); return [item.name, item.data.dimension]; }), ['CustomProduct', '5'], 'custom product names survive factor changes');
    await read(async () => {
      asset = api.createObjectAsset('variety');
      await api.assetRequest('select-for-modify', { ref: asset });
    });
    for (const [type, dimension, name] of [
      ['symmetric-product-curve', '3', '\\operatorname{Sym}^{3}(C)'],
      ['ppav-moduli', '3', '\\mathcal{A}_{2}'],
      ['grassmannian', '4', '\\operatorname{Gr}(2,4)'],
      ['complete-intersection', '2', 'X_{2,3}'],
      ['point', '0', 'p'],
      ['projective', '3', '\\mathbb{P}^{3}'],
      ['abelian', '3', 'A'],
      ['abstract', '3', 'X']
    ]) {
      await read(type => changeType(type), type);
      assert.deepEqual(await read(() => values()), [name, dimension, name, dimension], type + ' derives its own name and dimension');
    }
    await read(() => changeType('grassmannian'));
    await read(() => { window.nField = document.querySelector('[data-assets-field="n"]'); nField.focus(); });
    await press('a', 'KeyA', 2); await press('Backspace', 'Backspace');
    assert.equal(await read(() => nField.value), '', 'an empty parameter stays editable');
    await client.send('Input.insertText', { text: '1' });
    await read(() => new Promise(resolve => setTimeout(resolve, api.INPUT_AUTOSAVE_DEBOUNCE_MS + 100)));
    assert.equal(await read(() => nField.value), '1', 'a parameter prefix is retained even while invalid for this construction');
    assert.equal(await read(() => values()[3]), '4', 'invalid construction parameters do not replace the last valid model');
    await client.send('Input.insertText', { text: '2' });
    assert.equal(await read(() => document.querySelector('[data-assets-field="n"]') === nField), true, 'live derivation never replaces the focused control');
    assert.deepEqual(await read(() => values().slice(0, 2)), ['\\operatorname{Gr}(2,12)', '20'], 'dependent fields update during valid parameter entry');
    await read(() => { nField.blur(); api.flushAssetInputInstance(api.activeAssetInputInstance()); });
    assert.deepEqual(await read(() => values()), ['\\operatorname{Gr}(2,12)', '20', '\\operatorname{Gr}(2,12)', '20']);
    await read(() => { const backup = MathWorkspaceObjectPanels.exportText('workspace'); MathWorkspaceObjectPanels.importText('workspace', backup); });
    assert.equal(await read(() => api.localAssetSnapshot().assets.find(a => a.id === asset.id).autoName), '\\operatorname{Gr}(2,12)', 'automatic naming survives backup restoration');
    await read(async () => {
      asset = api.createObjectAsset('variety', { name: 'X' });
      await api.assetRequest('select-for-modify', { ref: asset }); changeType('curve');
    });
    assert.deepEqual(await read(() => values()), ['X', '1', 'X', '1'], 'an explicitly chosen default-looking name is still a custom name');
    await read(async () => {
      asset = api.createObjectAsset('variety');
      delete api.state.snapshot.assets.find(a => a.id === asset.id).autoName;
      await api.assetRequest('select-for-modify', { ref: asset }); changeType('curve');
    });
    assert.match(await read(() => values()[0]), /^C(?:_\{\d+\})?$/, 'legacy generic defaults adopt the new subtype name when edited');
    assert.equal(await read(() => values()[1]), '1');
    const chosenName = await read(() => values()[0]);
    await read(() => document.querySelector('[data-assets-name]').focus());
    await press('a', 'KeyA', 2); await press('Backspace', 'Backspace');
    await client.send('Input.insertText', { text: chosenName });
    await read(() => { document.activeElement.blur(); changeType('point'); });
    assert.deepEqual(await read(() => values()), [chosenName, '0', chosenName, '0'], 'explicitly retyping a default name disables future automatic renaming');
    console.log('PASS all variety subtype defaults, live parameters, products, transitive dependencies, custom names, drafts and backups');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
