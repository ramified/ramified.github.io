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
    const harness = () => {
      window.api = MathWorkspaceAssetsTest; window.k = api.assetKey;
      window.get = ref => api.localAssetSnapshot().assets.find(a => k(a) === k(ref));
      window.panel = MathWorkspaceObjectPanels.open('sheaf-input', k(tensor), 'main');
      window.payload = () => {
        panel.computation.refs.asset = k(tensor); MathWorkspaceObjectPanels.refresh();
        return panel.propertyRenderer.editor.objectIO('input-graph').entries.find(e => e.assetKey === k(tensor)).data.workspaceSheafComplex.payload;
      };
      window.choose = (index, ref) => {
        document.querySelector('[data-assets-tensor-index="' + index + '"]').click();
        const option = [...document.querySelectorAll('.workspace-reference-option')].find(n => n.dataset.assetKey === k(ref));
        if (!option) throw Error('Missing reference ' + k(ref)); option.click();
      };
    };
    await read(() => {
      const api = MathWorkspaceAssetsTest, k = api.assetKey;
      window.P = api.createObjectAsset('variety', { name: 'P', type: 'projective', data: { dimension: '3' } });
      window.Q = api.createObjectAsset('variety', { name: 'Q', type: 'projective', data: { dimension: '2' } });
      window.E = api.createObjectAsset('sheaf', { name: 'E', type: 'locally-free', data: { base: k(P), rank: '2' } });
      window.F = api.createObjectAsset('sheaf', { name: 'F', type: 'locally-free', data: { base: k(P), rank: '3' } });
      window.G = api.createObjectAsset('sheaf', { name: 'G', type: 'locally-free', data: { base: k(P), rank: '4' } });
      window.H = api.createObjectAsset('sheaf', { name: 'H', type: 'locally-free', data: { base: k(Q), rank: '5' } });
      window.tensor = api.createObjectAsset('sheaf', { name: 'B', type: 'tensor', data: { parents: [k(E), k(F), k(G)], exponents: ['1','1','1'], exact: true } });
      api.assetRequest('select-for-modify', { ref: tensor });
    });
    assert.equal(await read(() => document.querySelectorAll('[data-assets-tensor-row]').length), 3, 'TENSOR-002: expose every factor, not only the first two');
    await read(harness);
    const save = () => read(() => document.querySelector('[data-assets-editor]').requestSubmit());
    const exponent = index => '[data-assets-tensor-exponent="' + index + '"]';
    const replace = async (index, text) => {
      await read(selector => { const input = document.querySelector(selector); input.focus(); input.select(); }, exponent(index));
      if (text) await client.send('Input.insertText', { text });
      else for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    };
    const blur = async () => { for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); };
    assert.equal(await read(() => payload().rank), '24');
    await read(() => choose(2, E)); await save();
    assert.equal(await read(() => payload().rank), '12', 'third factor changes the actual result');
    await replace(2, '2'); await save();
    assert.equal(await read(() => payload().rank), '24');
    assert.equal(await read(() => get(tensor).data.exact), true);
    await replace(0, '');
    await read(() => { window.exponentNode = document.querySelector('[data-assets-tensor-exponent="0"]'); });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => exponentNode.value), '');
    assert.equal(await read(() => get(tensor).data.exponents[0]), '1', 'empty draft retains the previous model');
    await client.send('Input.insertText', { text: '1' });
    await client.send('Input.insertText', { text: '2' });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.deepEqual(await read(() => [document.activeElement === exponentNode, document.querySelector('[data-assets-tensor-exponent="0"]') === exponentNode, exponentNode.value, exponentNode.selectionStart]), [true,true,'12',2]);
    assert.equal(await read(() => payload().rank), '49152', 'sequential exponent editing reaches 12');
    await read(() => { exponentNode.focus(); exponentNode.select(); exponentNode.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
    await client.send('Input.insertText', { text: 'n' });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => get(tensor).data.exponents[0]), '12', 'IME composition cannot publish early');
    await read(() => { exponentNode.dispatchEvent(new CompositionEvent('compositionend', { data: 'n', bubbles: true })); exponentNode.dispatchEvent(new InputEvent('input', { data: 'n', inputType: 'insertText', bubbles: true })); });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => get(tensor).data.exponents[0]), 'n');
    await client.send('Input.insertText', { text: ' ' });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => exponentNode.value), 'n ', 'keep trailing spaces during symbolic editing');
    await client.send('Input.insertText', { text: '+' });
    await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => exponentNode.value), 'n +');
    assert.equal(await read(() => get(tensor).data.exponents[0]), 'n', 'incomplete symbolic prefix cannot publish as 1');
    await client.send('Input.insertText', { text: ' 1' }); await save();
    assert.match(await read(() => payload().construction.exponents[0]), /n/);
    await replace(0, '(n+1)^15'); await blur(); await save(); await save();
    assert.equal(await read(() => get(tensor).data.exponents[0]), '(n+1)^15', 'preserve the expression instead of expanding its symbols in the saved model');
    await read(() => {
      const expanded = payload().construction.exponents[0];
      if (expanded.length <= 80) throw Error('Prepare a genuine expanded legacy exponent');
      api.updateObjectAsset(tensor, { data: { ...get(tensor).data, exponents: [expanded,...get(tensor).data.exponents.slice(1)] } });
    }); await save(); await save();
    assert.deepEqual(await read(() => MathWorkspaceSheafModel.issues(get(tensor),api.localAssetSnapshot().assets)), [], 'expanded normal forms remain valid on repeated saves');
    const legacyLength = await read(() => {
      const input = document.querySelector('[data-assets-tensor-exponent="0"]'); input.focus(); input.setSelectionRange(input.value.length,input.value.length); return input.value.length;
    });
    await client.send('Input.insertText', { text: '+1' });
    assert.equal(await read(() => document.querySelector('[data-assets-tensor-exponent="0"]').value.length), legacyLength+2, 'long legacy exponents remain fully editable');
    await blur(); await save();
    await replace(0, '1/0'); await save();
    assert.notEqual(await read(() => get(tensor).data.exponents[0]), '1/0', 'invalid expressions are rejected, never silently converted to 1');
    await replace(0, '1'); await blur(); await save();
    await read(() => document.querySelector('[data-assets-tensor-add]').click());
    assert.equal(await read(() => document.querySelectorAll('[data-assets-tensor-row]').length), 4);
    assert.equal(await read(() => get(tensor).data.parents.length), 3, 'an unselected new factor stays a draft');
    await read(() => choose(3, G)); await save();
    assert.equal(await read(() => payload().rank), '96');
    await replace(1, '0'); await blur(); await save();
    assert.equal(await read(() => payload().rank), '32', 'a zero exponent contributes the tensor unit');
    await read(() => document.querySelector('[data-assets-tensor-remove="1"]').click()); await save();
    assert.deepEqual(await read(() => get(tensor).data.exponents), ['1','2','1'], 'removal keeps factors paired with their own exponents');
    assert.equal(await read(() => get(tensor).dependencies.some(ref => k(ref) === k(F))), false, 'removed factors no longer remain as hidden dependencies');
    assert.equal(await read(() => payload().rank), '32');
    await read(() => choose(2, H)); await save();
    assert.equal(await read(() => get(tensor).data.parents[2]), await read(() => k(G)), 'mixed base varieties cannot replace a valid tensor');
    await read(() => choose(2, G)); await save();
    while (await read(() => document.querySelectorAll('[data-assets-tensor-row]').length) < 6) {
      const index = await read(() => document.querySelectorAll('[data-assets-tensor-row]').length);
      await read(() => document.querySelector('[data-assets-tensor-add]').click());
      await read(index => choose(index, E), index);
    }
    assert.equal(await read(() => document.querySelector('[data-assets-tensor-add]').disabled), true, 'match the engine limit of six factors');
    assert.equal(await read(() => payload().rank), '256');
    await read(() => {
      const graph = panel.propertyRenderer.editor.objectIO('input-graph'), ids = new Map(graph.entries.map(e => [e.nativeId,e.assetKey]));
      const cached = MathWorkspaceSheafModel.remap(payload(), ids); cached.id = 'tensor-editor-cache';
      api.updateObjectAsset(tensor, { data: { ...get(tensor).data, workspaceSheafComplex: { payload: cached } } });
    });
    await replace(5, '2'); await blur(); await save(); await save();
    assert.equal(await read(() => payload().rank), '512', 'exponent edits invalidate old caches across repeated saves');
    await replace(5, 'n +'); await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    const backup = await read(() => MathWorkspaceObjectPanels.exportText('workspace'));
    const refs = await read(() => ({ tensor,P,Q,E,F,G,H }));
    const expected = await read(() => ({ parents: get(tensor).data.parents, exponents: get(tensor).data.exponents, exact: get(tensor).data.exact }));
    await client.send('Page.reload');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(text => { MathWorkspaceObjectPanels.importText('workspace', text); }, backup);
    await read(refs => { Object.assign(window, refs); }, refs); await read(harness);
    assert.deepEqual(await read(() => ({ parents: get(tensor).data.parents, exponents: get(tensor).data.exponents, exact: get(tensor).data.exact })), expected);
    assert.equal(await read(() => payload().rank), '512');
    assert.equal(await read(() => document.querySelector('[data-assets-tensor-exponent="5"]').value), 'n +', 'backup restores incomplete exponent drafts alongside the last valid model');
    while (await read(() => document.querySelectorAll('[data-assets-tensor-row]').length)) {
      await read(() => document.querySelector('[data-assets-tensor-remove="0"]').click());
    }
    await save();
    assert.deepEqual(await read(() => get(tensor).data.parents), []);
    assert.equal(await read(() => get(tensor).data.base), await read(() => k(P)));
    assert.deepEqual(await read(() => get(tensor).dependencies.map(k)), await read(() => [k(P)]), 'an empty tensor depends only on its chosen base');
    assert.equal(await read(() => payload().rank), '1', 'empty tensor is the structure sheaf on its selected base');
    await read(() => {
      document.querySelector('[data-assets-reference="base"]').click();
      [...document.querySelectorAll('.workspace-reference-option')].find(n => n.dataset.assetKey === k(Q)).click();
    }); await save();
    assert.equal(await read(() => get(tensor).data.base), await read(() => k(Q)));
    await read(() => document.querySelector('[data-assets-tensor-add]').click());
    await read(() => choose(0, H)); await save();
    assert.equal(await read(() => payload().rank), '5', 'one-factor tensors work without a second reference');
    await replace(0, '-'); await read(() => new Promise(resolve => setTimeout(resolve, 650)));
    assert.equal(await read(() => get(tensor).data.exponents[0]), '1');
    await client.send('Input.insertText', { text: '1' }); await blur(); await save();
    assert.equal(await read(() => get(tensor).data.exponents[0]), '-1', 'signed symbolic exponents retain the native formal-power semantics');
    await blur();
    await read(() => {
      api.assetRequest('prepare-create', { kind: 'sheaf' });
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'tensor'; type.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-assets-tensor-add]').click();
      window.tensor = api.activeAssetInputInstance().targetRef;
      choose(0,E); choose(1,F); choose(2,G);
    }); await save();
    assert.equal(await read(() => payload().rank), '24', 'the unbound Create form supports adding and selecting factors');
    await read(() => {
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'direct-sum'; type.dispatchEvent(new Event('change', { bubbles: true }));
    }); await save();
    assert.equal(await read(() => get(tensor).data.parents), undefined, 'switching to a binary operation cannot retain hidden tensor factors');
    assert.equal(await read(() => payload().rank), '5');
    await read(() => {
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'tensor'; type.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-assets-tensor-add]').click(); choose(2,G);
      api.openCanvas('assets');
    }); await save();
    await client.send('Emulation.setDeviceMetricsOverride', { width:390,height:844,deviceScaleFactor:1,mobile:false });
    await read(() => document.querySelector('[data-assets-editor]').scrollIntoView({ block:'center' }));
    assert.equal(await read(() => [...document.querySelectorAll('[data-assets-tensor-row]')].every(row => row.scrollWidth <= row.clientWidth + 1)), true, 'factor rows fit a narrow viewport');
    const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
    const screenshot = await client.send('Page.captureScreenshot', { format:'png' });
    const screenshotPath = path.join(os.tmpdir(),'math-workspace-tensor-editor.png');
    fs.writeFileSync(screenshotPath,Buffer.from(screenshot.data,'base64'));
    console.log('Screenshot: '+screenshotPath);
    console.log('PASS TENSOR-002: 0–6 factors, every reference, exponent drafts and expressions, calculation, cached edits and backup restore');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
