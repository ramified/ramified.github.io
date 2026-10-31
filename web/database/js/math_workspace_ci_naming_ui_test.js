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
    const names = await read(() => {
      window.api = MathWorkspaceAssetsTest;
      window.get = ref => api.localAssetSnapshot().assets.find(a => a.id === ref.id && a.kind === ref.kind);
      window.ciData = { dimension: '3', ambientDimension: '5', degrees: '2, 3' };
      window.copies = Array.from({ length: 3 }, () => api.createObjectAsset('variety', { type: 'complete-intersection', data: ciData }));
      return copies.map(ref => get(ref).name);
    });
    assert.deepEqual(names, ['X_{2,3}', '(X_{2,3})_{2}', '(X_{2,3})_{3}'], 'CI-004: number the complete expression, avoiding a double subscript');
    const replace = async (selector, text) => {
      await read(selector => { const input = document.querySelector(selector); input.focus(); input.select(); }, selector);
      await client.send('Input.insertText', { text });
    };
    const save = () => read(() => document.querySelector('[data-assets-editor]').requestSubmit());
    const degrees = '[data-assets-field="degrees"]';
    await read(() => api.assetRequest('prepare-create', { kind: 'variety' }));
    await read(() => {
      const type = document.querySelector('[data-assets-subtype]'); type.value = 'complete-intersection'; type.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-assets-field="degrees"]').focus();
    });
    for (const text of ['2', ',', ' ', '3']) await client.send('Input.insertText', { text });
    assert.equal(await read(() => document.querySelector('[data-assets-name]').value), '(X_{2,3})_{4}', 'unbound form previews a unique legal name');
    await save();
    await read(() => { window.fourth = api.activeAssetInputInstance().targetRef; });
    assert.equal(await read(() => get(fourth).name), '(X_{2,3})_{4}');

    await read(() => api.assetRequest('select-for-modify', { ref: copies[1] }));
    await replace(degrees, '2, 2'); await save();
    assert.equal(await read(() => get(copies[1]).name), 'X_{2,2}');
    assert.equal(await read(() => get(copies[2]).name), '(X_{2,3})_{3}', 'existing copy number survives a gap');
    await read(() => api.assetRequest('select-for-modify', { ref: copies[0] }));
    await replace(degrees, '2, 2'); await save();
    assert.equal(await read(() => get(copies[0]).name), '(X_{2,2})_{2}', 'parameter changes avoid an existing name');

    await read(() => api.assetRequest('select-for-modify', { ref: fourth }));
    await replace('[data-assets-name]', 'Q_{custom}'); await save();
    await replace(degrees, '4, 5'); await save();
    assert.deepEqual(await read(() => [get(fourth).name, get(fourth).autoName]), ['Q_{custom}', ''], 'user name survives degree changes');

    // Existing saved names with an explicit autoName marker can be repaired;
    // never guess that an arbitrary user-supplied name is automatic.
    await read(() => {
      const old = api.state.snapshot.assets.find(a => a.id === copies[2].id);
      old.name = old.autoName = 'X_{2,3}_{3}';
      window.custom = api.createObjectAsset('variety', { type: 'complete-intersection', name: 'X_{7,8}', data: { dimension: '3', degrees: '7, 8', ambientDimension: '5' } });
    });
    assert.equal(await read(() => get(copies[2]).name), '(X_{2,3})_{3}', 'repair legacy automatic numbering without changing the copy index');
    assert.equal(await read(() => get(custom).autoName), '');

    const emptyNames = await read(() => [0, 1].map(() => api.createObjectAsset('variety', { type: 'complete-intersection', data: { dimension: '3', ambientDimension: '3', degrees: '' } }).name));
    assert.deepEqual(emptyNames, ['\\mathbb{P}^{3}', '(\\mathbb{P}^{3})_{2}'], 'empty-equation CI names use the same grouped copy index');

    await read(() => api.assetRequest('select-for-modify', { ref: copies[2] }));
    assert.equal(await read(() => document.querySelector('[data-assets-name]').value), '(X_{2,3})_{3}');
    const settle = () => read(async () => {
      await MathJax.startup.promise;
      const content = document.querySelector('[data-assets-content]');
      await MathJax.typesetPromise([content]); await MathWorkspaceAssetIcons.typeset(content);
    });
    await waitFor(() => read(() => !!window.MathJax?.typesetPromise), 20000);
    await settle();
    assert.equal(await read(() => !!document.querySelector('[data-assets-content] mjx-merror,[data-assets-content] [data-mjx-error]')), false, 'all generated CI names render without MathJax errors');
    assert.equal(await read(() => [...document.querySelectorAll('.workspace-asset-variety .workspace-asset-icon')].every(host => host.dataset.iconSource === 'name')), true, 'valid formulas do not fall back to a generic icon');
    const backup = await read(() => MathWorkspaceObjectPanels.exportText('workspace'));
    const expected = await read(() => api.localAssetSnapshot().assets.map(a => [a.id, a.name, a.autoName]));
    await client.send('Page.reload');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(text => MathWorkspaceObjectPanels.importText('workspace', text), backup);
    assert.deepEqual(await read(() => MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a => [a.id, a.name, a.autoName])), expected, 'portable backup preserves names and automatic/custom ownership');
    assert.equal(await read(() => document.querySelector('[data-assets-name]').value), '(X_{2,3})_{3}');
    await waitFor(() => read(() => !!window.MathJax?.typesetPromise), 20000); await settle();
    assert.equal(await read(() => !!document.querySelector('[data-assets-content] mjx-merror,[data-assets-content] [data-mjx-error]')), false);
    const legacyBackup = JSON.parse(backup), legacyAsset = legacyBackup.assets.find(a => a.name === '(X_{2,3})_{3}');
    legacyAsset.name = legacyAsset.autoName = 'X_{2,3}_{3}';
    for (const instance of legacyBackup.assetCards.instances.filter(i => i.cardType === 'input' && i.targetRef.id === legacyAsset.id)) {
      instance.draft.name = instance.draft.autoName = legacyAsset.name;
      const base = JSON.parse(instance.baseDefinition); base.name = base.autoName = legacyAsset.name;
      instance.baseDefinition = JSON.stringify(base);
    }
    await read(text => MathWorkspaceObjectPanels.importText('workspace', text), JSON.stringify(legacyBackup));
    assert.equal(await read(() => document.querySelector('[data-assets-name]').value), '(X_{2,3})_{3}', 'legacy backup repairs both the asset and its clean Input draft');
    const dirtyBackup = JSON.parse(JSON.stringify(legacyBackup));
    const dirtyInput = dirtyBackup.assetCards.instances.find(i => i.cardType === 'input' && i.targetRef.id === legacyAsset.id);
    dirtyInput.dirty = true; dirtyInput.draft.name = '\\mathcal{unfinished'; dirtyInput.draft.autoName = '';
    await read(text => MathWorkspaceObjectPanels.importText('workspace', text), JSON.stringify(dirtyBackup));
    assert.equal(await read(() => document.querySelector('[data-assets-name]').value), '\\mathcal{unfinished', 'legacy-name repair must preserve an unsaved custom draft');
    assert.equal(await read(id => MathWorkspaceAssetsTest.localAssetSnapshot().assets.find(a => a.id === id).name, legacyAsset.id), '(X_{2,3})_{3}');
    await read(text => MathWorkspaceObjectPanels.importText('workspace', text), JSON.stringify(legacyBackup));
    await settle();
    const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
    const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.join(os.tmpdir(), 'math-workspace-ci-naming.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log('Screenshot: ' + screenshotPath);
    console.log('PASS CI-004: repeated creation, live naming, degree changes, stable indices, custom names, legacy automatic names, MathJax and portable backup');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
