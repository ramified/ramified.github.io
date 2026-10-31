'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    const modify = async ref => {
      // Switching objects is a focus boundary. Use an actual Tab so the
      // browser delivers blur/change before exercising the Modify request.
      for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await read(ref => api.assetRequest('select-for-modify', { ref: window[ref] }), ref);
      await waitFor(() => read(ref => api.activeAssetInputInstance().targetRef.id === window[ref].id, ref), 5000);
    };
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.a = api.createObjectAsset('variety', { name: 'A' });
      window.b = api.createObjectAsset('variety', { name: 'B' });
      window.get = ref => api.localAssetSnapshot().assets.find(asset => asset.kind === ref.kind && asset.id === ref.id);
      window.nameField = () => document.querySelector('[data-assets-name]');
      api.bindAssetInputInstance(a);
    });
    const typeName = async text => {
      await read(() => { nameField().focus(); nameField().select(); });
      await client.send('Input.insertText', { text });
    };
    const savedName = async (ref, expected) => waitFor(() => read(({ ref, expected }) =>
      get(window[ref]).name === expected && api.activeAssetInputInstance().autosaveStatus === 'Saved', { ref, expected }), 5000, 'automatic save of ' + expected);
    const conflict = () => waitFor(() => read(() => api.activeAssetInputInstance().autosaveStatus === 'Conflict'), 5000, 'same-object conflict');
    const chooseConflict = async choice => {
      await read(choice => document.querySelector('[data-assets-resolve="' + choice + '"]').scrollIntoView({ block: 'center' }), choice);
      const point = await read(choice => {
        const box = document.querySelector('[data-assets-resolve="' + choice + '"]').getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }, choice);
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, button: 'none', buttons: 0 });
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
    };

    // No Submit, blur or explicit flush: real input events and page timers save.
    await read(() => { window.originalField = nameField(); });
    for (const text of ['A1', 'A2', 'A3']) await typeName(text);
    await savedName('a', 'A3');
    assert.deepEqual(await read(() => [nameField() === originalField, document.activeElement === nameField(), nameField().value, nameField().selectionStart]), [true, true, 'A3', 2]);

    await typeName('\\mathcal{A');
    await waitFor(() => read(() => api.activeAssetInputInstance().autosaveStatus === 'Invalid draft'), 5000);
    assert.equal(await read(() => get(a).name), 'A3', 'invalid draft must not overwrite the last saved name');
    assert.equal(await read(() => nameField().value), '\\mathcal{A');
    await modify('b');
    await typeName('B1'); await savedName('b', 'B1');
    await modify('a');
    assert.equal(await read(() => nameField().value), '\\mathcal{A', 'returning to A restores its own invalid draft');
    await typeName('A4'); await savedName('a', 'A4');
    assert.equal(await read(() => get(b).name), 'B1');

    await typeName('A5');
    await read(() => api.updateObjectAsset(b, { name: 'B2' }));
    await savedName('a', 'A5');
    assert.equal(await read(() => api.activeAssetInputInstance().conflictState), null, 'editing B must not conflict with A');
    assert.equal(await read(() => get(b).name), 'B2');

    await typeName('A6');
    await read(() => api.updateObjectAsset(a, { name: 'A_external' }));
    await conflict();
    assert.deepEqual(await read(() => [get(a).name, nameField().value]), ['A_external', 'A6']);
    await chooseConflict('saved');
    assert.deepEqual(await read(() => [get(a).name, nameField().value, api.activeAssetInputInstance().conflictState]), ['A_external', 'A_external', null]);

    await typeName('A7');
    await read(() => api.updateObjectAsset(a, { name: 'A_external_2' }));
    await conflict();
    await chooseConflict('draft');
    await savedName('a', 'A7');
    assert.equal(await read(() => nameField().value), 'A7');

    await typeName('A7 '); await savedName('a', 'A7');
    assert.equal(await read(() => nameField().value), 'A7 ', 'autosave keeps trailing spaces in the focused draft');
    await client.send('Input.insertText', { text: 'next' });
    await savedName('a', 'A7 next');
    assert.equal(await read(() => nameField().value), 'A7 next');
    console.log('PASS autosave UI: real typing without blur/Submit, focused draft/caret, invalid recovery, per-object drafts, unrelated edits, conflicts and both resolutions');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
