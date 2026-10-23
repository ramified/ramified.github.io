const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser, stopBrowser, evaluate, waitFor, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const { passwordHash } = await import('../cloudflare/theorem-graph.worker.mjs');
  const { startLocalServer } = await import('../cloudflare/theorem-graph-local-server.mjs');
  const password = 'browser-test-only-password-12345';
  const service = await startLocalServer({ memory: true, password: await passwordHash(password) });
  const { origin, server, db } = service;
  let session;
  try {
    session = await launchBrowser(`${origin}/theorem_graph_calculator.html`);
    const { client } = session;
    await client.send('Page.enable'); await client.send('Runtime.enable'); await client.send('Network.enable');
    const errors = [];
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Page.javascriptDialogOpening') client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    const read = value => evaluate(client, value);
    const value = id => read(`document.getElementById(${JSON.stringify(id)}).value`);
    const key = async (key, code, modifiers = 0) => {
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: key === 'Backspace' ? 8 : key === 'a' ? 65 : 0 });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers });
    };
    const clear = async id => { await read(`document.getElementById(${JSON.stringify(id)}).focus()`); await key('a', 'KeyA', 2); await key('Backspace', 'Backspace'); };
    const type = async text => { for (const character of text) await client.send('Input.insertText', { text: character }); };
    const ready = () => waitFor(() => read(`document.getElementById('theorem-personal')?.dataset.ready === 'true'`), 20000, 'personal editor ready');
    const synced = () => waitFor(() => read(`document.getElementById('personal-status').textContent === 'Saved to cloud'`), 20000, 'cloud acknowledgement');
    const click = id => read('document.getElementById(' + JSON.stringify(id) + ').click()');
    const idle = () => waitFor(() => read('!document.getElementById("personal-login-submit").disabled'));
    const save = async (name) => {
      await idle(); await click('personal-save');
      if (name) {
        await waitFor(() => read('!document.getElementById("personal-rename").hidden'));
        await clear('personal-rename-title'); await type(name);
        await read('document.getElementById("personal-rename").requestSubmit()');
      }
      await idle(); await click('personal-sync'); await synced();
    };
    const openLogin = async () => {
      await read(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-sign-in').click()`);
      assert(await read(`document.getElementById('personal-password').getClientRects().length > 0`), 'login fields are reachable from the actual Import tab');
    };
    const screenshot = async name => {
      const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const target = path.resolve(__dirname, '../cloudflare/.theorem-local', name);
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, Buffer.from(shot.data, 'base64'));
      return target;
    };
    await ready();
    assert(await read(`document.getElementById('theorem-personal').getClientRects().length > 0`), 'guests can manage local drafts and saved graphs');
    assert(await read(`document.getElementById('theorem-personal').parentElement.id === 'cards'`), 'personal graphs belong to the right sidebar');
    assert(await read(`document.getElementById('personal-login').hidden`), 'credentials are initially collapsed');
    assert(await read(`document.querySelector('#theorem-graph-import-panel #personal-sign-in') !== null`), 'sign-in belongs to Import, not the hidden legacy controls');
    await screenshot('ui-guest.png');
    await clear('graph-title'); await type('personal ');
    await delay(700);
    assert.equal(await value('graph-title'), 'personal ', 'local autosave preserves trailing spaces');
    assert.equal(await read(`(async()=> (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':guest').list()).length)()`), 0, 'typing creates only a device draft');
    await client.send('Page.reload'); await delay(100); await ready();
    assert.equal(await value('graph-title'), 'personal ', 'raw draft survives reload');
    assert.equal(await read('document.activeElement.id'), 'graph-title', 'editing focus is restored');
    await type('graph');
    assert.equal(await value('graph-title'), 'personal graph');
    await delay(600);
    assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM documents').get().n, 0, 'signed-out edits must not write to cloud');
    await openLogin(); await type('cancelled password');
    await read(`document.getElementById('personal-login-cancel').click()`);
    assert.equal(await value('personal-password'), '', 'cancelling clears the password');
    assert(await read(`document.getElementById('personal-login').hidden`));
    await openLogin();
    await clear('personal-username'); await type('someone-else');
    await read(`document.getElementById('personal-password').focus()`); await type(password);
    await read(`document.getElementById('personal-login').requestSubmit()`);
    await waitFor(() => read(`document.getElementById('personal-login-status').textContent.includes('Incorrect username or password')`));
    assert(await read(`document.getElementById('personal-login-status').getClientRects().length > 0`), 'failed sign-in is visible without revealing My graphs');
    await clear('personal-username'); await type('ramified');
    await read(`document.getElementById('personal-password').focus()`); await type(password);
    await read(`document.getElementById('personal-login').requestSubmit()`); await idle(); await save('Version A');
    assert(await read(`!document.getElementById('theorem-personal').hidden && !document.getElementById('theorem-personal').classList.contains('collapsed')`), 'successful sign-in opens the right-side card');
    assert(await read(`document.getElementById('personal-login').hidden`), 'successful sign-in closes the form');
    const record = db.sqlite.prepare('SELECT * FROM documents').get();
    assert.equal(JSON.parse(record.content).graph.title, 'personal graph');
    assert.equal(await value('personal-password'), '');
    assert(!record.content.includes(password), 'passwords must never be captured in graph drafts');
    await client.send('Page.reload'); await delay(100); await ready(); await synced();
    assert(await read(`!document.getElementById('theorem-personal').hidden`), 'a valid session restores the card after reload');
    await read(`CalculatorCards.collapseCard('#theorem-personal')`);
    await clear('graph-title'); await type('collapsed card'); await save();
    assert(await read(`document.getElementById('theorem-personal').classList.contains('collapsed')`), 'autosave does not reopen a collapsed card');
    await read(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-show-graphs').click()`);
    assert(await read(`!document.getElementById('theorem-personal').classList.contains('collapsed')`), 'Import can reopen My graphs');

    await clear('graph-title'); await type('cloud ');
    await save();
    assert.equal(await value('graph-title'), 'cloud ', 'cloud acknowledgement preserves the raw focused draft');
    assert.equal(await read('document.activeElement.id'), 'graph-title');
    const cursor = await read(`document.getElementById('graph-title').selectionStart`);
    assert.equal(cursor, 6);
    await type('title'); await save();
    assert.equal(await value('graph-title'), 'cloud title');

    const second = await launchBrowser(`${origin}/theorem_graph_calculator.html`);
    try {
      const readSecond = expression => evaluate(second.client, expression);
      await waitFor(() => readSecond(`document.getElementById('theorem-personal')?.dataset.ready === 'true'`));
      await readSecond(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-sign-in').click()`);
      await readSecond(`document.getElementById('personal-password').focus()`);
      await second.client.send('Input.insertText', { text: password });
      await readSecond(`document.getElementById('personal-login').requestSubmit()`);
      await waitFor(() => readSecond(`document.querySelector('#personal-graph-list .theorem-personal-item-name') && !document.getElementById('personal-login-submit').disabled`));
      assert.equal(await readSecond(`document.getElementById('graph-title').value`), 'Maintenance Tracker', 'login does not select a cloud graph');
      await readSecond(`document.querySelector('#personal-graph-list .theorem-personal-item-name').click()`);
      await waitFor(() => readSecond(`document.getElementById('graph-title').value === 'cloud title' && document.getElementById('personal-status').textContent === 'Saved to cloud'`), 20000, 'fresh device loads saved cloud graph');
    } finally { second.client.close(); await stopBrowser(second.browser, second.profile); }

    // IME input is preserved locally without publishing an intermediate model.
    await read(`(() => { const field=document.getElementById('graph-title'); field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})); field.value='中文草稿 '; field.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'稿'})); })()`);
    await delay(700);
    assert.equal(await value('graph-title'), '中文草稿 ');
    await read(`document.getElementById('graph-title').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文草稿 '}))`);
    await save();
    assert.equal(await value('graph-title'), '中文草稿 ');

    await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await clear('graph-title'); await type('offline work'); await delay(700);
    assert.equal(await value('graph-title'), 'offline work');
    await click('personal-save'); await idle(); await read(`document.getElementById('personal-sync').click()`); await delay(800);
    assert.match(await read(`document.getElementById('personal-status').textContent`), /device/);
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await read(`window.dispatchEvent(new Event('online'))`); await synced();
    assert.equal(JSON.parse(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content).graph.title, 'offline work');

    // Change the server's revision as a second device would, then edit this tab.
    const remotePayload = JSON.parse(record.content);
    remotePayload.graph.title = 'remote device'; remotePayload.graph.titleNode.label = 'remote device';
    remotePayload.drafts = []; remotePayload.editor.detailEditBaseline = null;
    db.sqlite.prepare('UPDATE documents SET revision=revision+1, content=?, title=? WHERE id=?')
      .run(JSON.stringify(remotePayload), 'remote device', record.id);
    await clear('graph-title'); await type('local conflict'); await click('personal-save');
    await waitFor(() => read(`!document.getElementById('personal-conflict').hidden`), 15000, 'conflict banner');
    assert.equal(await value('graph-title'), 'local conflict');
    await read(`document.getElementById('personal-cloud-version').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'remote device'`), 10000, 'open remote graph');
    const recovered = await read(`(async()=> (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':ramified').list()).some(row=>row.recovered && row.payload.graph.title==='local conflict'))()`);
    assert(recovered, 'conflict resolution preserves the displaced local graph');

    await clear('graph-title'); await type('before restore'); await save(); await clear('graph-title'); await type('discard me'); await delay(700);
    await read(`document.getElementById('personal-revert').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'before restore'`), 10000, 'discard returns to latest explicit save');
    await idle();
    await read(`document.getElementById('personal-history').click()`);
    await waitFor(() => read(`document.querySelectorAll('#personal-history-list button').length > 0`), 10000, 'history list');
    await read(`document.querySelector('#personal-history-list button').click()`);
    await waitFor(() => read(`!document.getElementById('personal-history-preview').hidden`), 10000, 'history preview');
    await idle();
    assert.match(await read(`document.getElementById('personal-preview-text').textContent`), /remote device/);
    await read(`document.getElementById('personal-restore-history').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'remote device'`), 10000, 'load history as draft');
    assert.equal(JSON.parse(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content).graph.title, 'before restore', 'loading history never overwrites the saved graph');
    await save();

    await clear('graph-title'); await type('experiment B'); await delay(650);
    const original = db.sqlite.prepare('SELECT content,title FROM documents WHERE id=?').get(record.id);
    await click('personal-sync'); await idle();
    assert.equal(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content, original.content, 'Sync never commits a draft');
    await click('personal-copy'); await idle(); await click('personal-rename-cancel');
    assert.equal(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content, original.content, 'cancelled Save as preserves A');
    await click('personal-copy'); await idle(); await clear('personal-rename-title'); await type('Version B');
    await read(`document.getElementById('personal-rename').requestSubmit()`); await idle(); await synced();
    assert.equal(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content, original.content, 'Save as B preserves A');
    assert.equal(JSON.parse(db.sqlite.prepare('SELECT content FROM documents WHERE title=?').get('Version B').content).graph.title, 'experiment B');
    await clear('graph-title'); await type('more experiments'); await delay(500);
    assert.equal(db.sqlite.prepare('SELECT title FROM documents WHERE title=?').get('Version B').title, 'Version B');
    await click('personal-detach'); await idle();
    assert.match(await read(`document.getElementById('personal-current').textContent`), /Temporary draft/);
    await client.send('Page.reload'); await delay(100); await ready();
    assert.equal(await value('graph-title'), 'more experiments', 'detached draft survives reload');
    await click('personal-new'); await idle();
    assert.equal(await value('graph-title'), 'Untitled graph');
    const blank = await read(`(async()=> { const id=sessionStorage.getItem('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':ramified:active:draft'); return (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':ramified:drafts').read(id)).payload.graph; })()`);
    assert.equal(blank.nodes.length, 0); assert.equal(blank.arrows.length, 0); assert.equal(blank.references.length, 0);
    await read(`document.getElementById('personal-drafts-panel').open=true; [...document.querySelectorAll('#personal-draft-list button')].find(b=>b.textContent.startsWith('more experiments')).click()`); await idle();
    assert.equal(await value('graph-title'), 'more experiments', 'old temporary work remains recoverable');
    await read(`document.querySelector('#personal-graph-list .theorem-personal-item-name').click()`); await idle();
    await clear('graph-title'); await type('last keystroke before import');
    const imported = JSON.parse(original.content).graph;
    imported.title = 'Imported experiment'; imported.titleNode.label = 'Imported experiment';
    await read(`SiteImportExportPageAdapter.applyImport('json-whole', {data:${JSON.stringify(imported)}})`);
    await delay(500);
    assert.match(await read(`document.getElementById('personal-current').textContent`), /Temporary draft/);
    assert.equal(await value('graph-title'), 'Imported experiment');
    assert.equal(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content, original.content, 'whole import does not overwrite a saved graph');
    assert(await read(`(async()=> (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':ramified:drafts').list()).some(row=>row.payload.graph.title==='last keystroke before import'))()`), 'whole import keeps even the final unsaved keystroke');

    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert(await read('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'personal controls must fit narrow screens');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(`document.getElementById('theorem-personal').scrollIntoView({block:'start'})`);
    const screenshotPath = await screenshot('ui-test.png');
    await read(`document.getElementById('personal-logout').click()`);
    await waitFor(() => read(`!document.getElementById('personal-sign-in').hidden`), 10000, 'sign-out returns to local workspace');
    await openLogin();
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert(await read('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'login fields fit narrow screens');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(`document.getElementById('personal-account').scrollIntoView({block:'center'})`);
    await screenshot('ui-login.png');
    await read(`document.getElementById('personal-password').focus()`);
    await type(password);
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await waitFor(() => read(`document.getElementById('personal-sign-in').hidden`)); await idle();
    assert(await read(`!document.getElementById('theorem-personal').hidden`), 'the password form supports Enter to sign in');
    const beforeExpiry = await value('graph-title');
    db.sqlite.prepare('UPDATE graph_sessions SET expires_at=0').run();
    await read(`document.getElementById('personal-refresh').click()`);
    await waitFor(() => read(`document.getElementById('personal-status').textContent.includes('Session expired')`), 10000, 'session expiry is reported');
    assert.equal(await value('graph-title'), beforeExpiry, 'session expiry never replaces the canvas');
    assert.deepEqual(errors, []);
    console.log('PASS theorem personal UI: explicit saves, Save as preserves original, cancelled Save as, sync excludes drafts, detached/blank/recovered drafts, import isolation, session expiry, real typing/caret/IME, offline saves, conflicts, history as draft, account login/logout and narrow layout');
    console.log(`Screenshot: ${screenshotPath}`);
  } catch (error) {
    if (session) {
      console.error('UI diagnostic:', await evaluate(session.client, `({status:document.getElementById('personal-status')?.textContent,current:document.getElementById('personal-current')?.textContent,loginHidden:document.getElementById('personal-login')?.hidden,title:document.getElementById('graph-title')?.value})`).catch(() => null));
      console.error('Stored document revisions:', db.sqlite.prepare('SELECT id, revision, title FROM documents').all());
    }
    throw error;
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve)); db.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
