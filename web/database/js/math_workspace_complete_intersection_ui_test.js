'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await waitFor(() => read(() => !!window.MathWorkspaceAssetsTest), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.field = name => document.querySelector('[data-assets-field="' + name + '"]');
      window.chooseType = type => {
        const select = document.querySelector('[data-assets-subtype]');
        select.value = type; select.dispatchEvent(new Event('change', { bubbles: true }));
      };
      window.current = () => api.localAssetSnapshot().assets.find(a => a.id === api.activeAssetInputInstance()?.targetRef.id);
      chooseType('complete-intersection');
      field('degrees').focus();
    });
    // The initial, unbound form must use the same dimension semantics as Modify.
    for (const text of ['2', ',', ' ', '3']) await client.send('Input.insertText', { text });
    await read(() => document.querySelector('[data-assets-editor]').requestSubmit());
    assert.deepEqual(await read(() => {
      const a = current(); return [a.data.dimension, a.data.ambientDimension, a.data.degrees];
    }), ['3', '5', '2, 3'], 'CI-001: creating a threefold of degrees 2,3 must give P^5');
    const press = async (key, code, modifiers = 0) => {
      const virtual = { Backspace: 8, ArrowRight: 39, Home: 36 }[key] || 0;
      for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key, code, modifiers, windowsVirtualKeyCode: virtual });
    };
    const replace = async (name, value) => {
      await read(name => { field(name).focus(); field(name).select(); }, name);
      await press('Backspace', 'Backspace');
      for (const text of value) await client.send('Input.insertText', { text });
    };
    const save = () => read(() => document.querySelector('[data-assets-editor]').requestSubmit());
    const definition = () => read(() => {
      const d = current().data; return [d.dimension, d.ambientDimension, d.degrees];
    });
    const controls = () => read(() => [field('dimension').value, field('ambientDimension').value,
      field('degrees').value, document.querySelector('[data-assets-ci-count]').value,
      [...document.querySelectorAll('[data-assets-ci-degree]')].map(input => input.value)]);
    assert.deepEqual(await controls(), ['3', '5', '2, 3', '2', ['2', '3']], 'CI-002: saved display agrees with model');
    assert.equal(await read(() => !!(document.querySelector('[data-assets-ci-count]').compareDocumentPosition(field('degrees')) & Node.DOCUMENT_POSITION_FOLLOWING)), true, 'choose the equation count before entering its degrees');
    assert.equal(await read(() => field('ambientDimension').readOnly), true);
    await read(() => { window.ciRef = api.activeAssetInputInstance().targetRef; });

    // Real sequential numeric editing: empty and multi-digit prefixes survive.
    await read(() => { field('dimension').focus(); field('dimension').select(); });
    await press('Backspace', 'Backspace');
    assert.equal(await read(() => field('dimension').value), '');
    assert.deepEqual(await definition(), ['3', '5', '2, 3']);
    for (const text of ['1', '5']) await client.send('Input.insertText', { text });
    assert.equal(await read(() => field('dimension').value), '15');
    assert.equal(await read(() => field('ambientDimension').value), '17');
    await save();
    assert.deepEqual(await definition(), ['15', '17', '2, 3']);

    // Ranges use real keyboard events and retain the active DOM node.
    await read(() => { window.countControl = document.querySelector('[data-assets-ci-count]'); countControl.focus(); });
    await press('ArrowRight', 'ArrowRight');
    assert.deepEqual(await controls(), ['15', '18', '2, 3, 2', '3', ['2', '3', '2']]);
    assert.equal(await read(() => document.activeElement === countControl && countControl.isConnected), true);
    await read(() => { window.degreeControl = document.querySelector('[data-assets-ci-degree="0"]'); degreeControl.focus(); });
    await press('ArrowRight', 'ArrowRight');
    assert.deepEqual(await controls(), ['15', '18', '3, 3, 2', '3', ['3', '3', '2']]);
    assert.equal(await read(() => document.activeElement === degreeControl && degreeControl.isConnected), true);
    await save();
    assert.deepEqual(await definition(), ['15', '18', '3, 3, 2']);

    // Empty list and equation-count growth/shrink have explicit semantics.
    await read(() => document.querySelector('[data-assets-ci-count]').focus());
    await press('Home', 'Home');
    await save();
    assert.deepEqual(await definition(), ['15', '15', '']);
    assert.deepEqual(await controls(), ['15', '15', '', '0', []]);
    await replace('dimension', '3'); await save();
    await read(() => document.querySelector('[data-assets-ci-count]').focus());
    for (let i = 0; i < 8; i++) await press('ArrowRight', 'ArrowRight');
    await save();
    assert.deepEqual(await definition(), ['3', '11', '2, 2, 2, 2, 2, 2, 2, 2']);
    await replace('dimension', '15'); await save();
    assert.deepEqual(await definition(), ['15', '23', '2, 2, 2, 2, 2, 2, 2, 2'], 'maximum supported dimension and equation count');
    await read(() => { field('dimension').focus(); field('dimension').select(); });
    await client.send('Input.insertText', { text: '16' }); await save();
    assert.equal((await definition())[0], '15', 'out-of-range dimension does not replace the model');
    assert.equal(await read(() => field('dimension').value), '16', 'rejected dimension draft remains available for correction');
    await replace('dimension', '3'); await save();
    await replace('degrees', '99'); await save();
    assert.deepEqual(await controls(), ['3', '4', '99', '1', ['99']]);
    assert.equal(await read(() => document.querySelector('[data-assets-ci-degree]').max), '99');

    // An incomplete list is a draft, not a new mathematical definition.
    await replace('degrees', '2, ');
    await read(() => new Promise(resolve => setTimeout(resolve, api.INPUT_AUTOSAVE_DEBOUNCE_MS + 100)));
    assert.equal(await read(() => field('degrees').value), '2, ');
    assert.equal(await read(() => field('degrees').selectionStart), 3);
    assert.equal(await read(() => document.querySelector('[data-assets-ci-count]').disabled), true);
    assert.deepEqual(await definition(), ['3', '4', '99']);
    await client.send('Input.insertText', { text: '3' });
    assert.equal(await read(() => field('degrees').value), '2, 3');
    assert.equal(await read(() => field('ambientDimension').value), '5');
    await save();
    assert.deepEqual(await definition(), ['3', '5', '2, 3']);
    await read(() => { window.textControl = field('degrees'); textControl.focus(); textControl.setSelectionRange(0, 1); });
    await client.send('Input.insertText', { text: '4' });
    assert.deepEqual(await read(() => [field('degrees') === textControl, textControl.value, textControl.selectionStart]), [true, '4, 3', 1]);
    await save();

    // IME text is published only after composition finishes.
    await read(() => { field('degrees').focus(); field('degrees').select(); field('degrees').dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
    await client.send('Input.insertText', { text: '5, 6' });
    await read(() => new Promise(resolve => setTimeout(resolve, api.INPUT_AUTOSAVE_DEBOUNCE_MS + 100)));
    assert.deepEqual(await definition(), ['3', '5', '4, 3']);
    await read(() => field('degrees').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '5, 6' })));
    await waitFor(() => read(() => current().data.degrees === '5, 6'), 5000);
    assert.deepEqual(await definition(), ['3', '5', '5, 6']);
    await replace('degrees', '100'); await save();
    assert.deepEqual(await definition(), ['3', '5', '5, 6'], 'out-of-range degree does not replace the model');
    await replace('degrees', '2, 3'); await save();
    await replace('dimension', '0'); await save();
    assert.deepEqual(await definition(), ['0', '2', '2, 3'], 'zero-dimensional complete intersections remain supported');

    // Reopen, object JSON, and a portable workspace backup preserve the data.
    await read(() => api.assetRequest('select-for-modify', { ref: ciRef }));
    assert.deepEqual(await controls(), ['0', '2', '2, 3', '2', ['2', '3']]);
    assert.deepEqual(await read(() => {
      const d = JSON.parse(MathWorkspaceObjectPanels.exportText('variety:' + ciRef.id)).data;
      return [d.dimension, d.ambientDimension, d.degrees];
    }), ['0', '2', '2, 3']);
    const backup = await read(() => MathWorkspaceObjectPanels.exportText('workspace'));
    await client.send('Page.reload');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(text => MathWorkspaceObjectPanels.importText('workspace', text), backup);
    assert.deepEqual(await read(() => {
      const d = document.querySelector('[data-assets-field="dimension"]'), n = document.querySelector('[data-assets-field="ambientDimension"]');
      return [d.value, n.value, [...document.querySelectorAll('[data-assets-ci-degree]')].map(input => input.value)];
    }), ['0', '2', ['2', '3']]);

    // Directory creation starts with a bound asset and uses the same controls.
    await read(() => {
      document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 150 }));
      [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button => button.textContent === 'New…').click();
      document.querySelector('[data-create-kind="variety"]').click();
      window.api = MathWorkspaceAssetsTest;
      window.field = name => document.querySelector('[data-assets-field="' + name + '"]');
      window.current = () => api.localAssetSnapshot().assets.find(a => a.id === api.activeAssetInputInstance()?.targetRef.id);
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'complete-intersection'; type.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await replace('degrees', '2, 3'); await save();
    assert.deepEqual(await definition(), ['3', '5', '2, 3']);
    // Use a custom name for the comparison object shown in the screenshot.
    await read(() => { const name = document.querySelector('[data-assets-name]'); name.focus(); name.select(); });
    await client.send('Input.insertText', { text: 'Y' }); await save();
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.equal(await read(() => [...document.querySelectorAll('.workspace-ci-slider')].every(row => row.scrollWidth <= row.clientWidth + 1)), true, 'CI ranges fit a narrow viewport');
    await client.send('Emulation.clearDeviceMetricsOverride');
    const fs = require('node:fs'), path = require('node:path');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(require('node:os').tmpdir(), 'math-workspace-complete-intersection.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot: ' + screenshotPath);
    // Invalid initial Add must leave no placeholder asset, then recover in place.
    await client.send('Page.reload');
    await waitFor(() => read(() => !!window.MathWorkspaceAssetsTest), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.field = name => document.querySelector('[data-assets-field="' + name + '"]');
      window.current = () => api.localAssetSnapshot().assets.find(a => a.id === api.activeAssetInputInstance()?.targetRef.id);
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'complete-intersection'; type.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await replace('degrees', '2, '); await save();
    assert.equal(await read(() => api.localAssetSnapshot().assets.length), 0);
    assert.equal(await read(() => field('degrees').value), '2, ');
    await read(() => field('degrees').focus());
    await client.send('Input.insertText', { text: '3' }); await save();
    assert.deepEqual(await definition(), ['3', '5', '2, 3']);
    console.log('PASS CI-001/002/003: creation, dimensions, sliders, sequential drafts, selection, IME, boundaries, reopen, export and backup restore');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
