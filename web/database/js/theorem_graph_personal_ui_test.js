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
    assert(await read(`document.getElementById('theorem-personal').getClientRects().length === 0`), 'guests see no personal card or reserved space');
    assert(await read(`document.getElementById('theorem-personal').parentElement.id === 'cards'`), 'personal graphs belong to the right sidebar');
    assert(await read(`document.getElementById('personal-login').hidden`), 'credentials are initially collapsed');
    assert(await read(`document.querySelector('#theorem-graph-import-panel #personal-sign-in') !== null`), 'sign-in belongs to Import, not the hidden legacy controls');
    await screenshot('ui-guest.png');
    await clear('graph-title'); await type('personal ');
    await delay(700);
    assert.equal(await value('graph-title'), 'personal ', 'local autosave preserves trailing spaces');
    assert(await read(`(async()=> (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':guest').list()).some(row=>row.history.some(entry=>entry.payload.graph.title==='Maintenance Tracker')))()`), 'first edit retains the original opening version');
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
    assert(await read(`document.getElementById('personal-login-status').getClientRects().length > 0 && document.getElementById('theorem-personal').hidden`), 'failed sign-in is visible without revealing My graphs');
    await clear('personal-username'); await type('ramified');
    await read(`document.getElementById('personal-password').focus()`); await type(password);
    await read(`document.getElementById('personal-login').requestSubmit()`); await synced();
    assert(await read(`!document.getElementById('theorem-personal').hidden && !document.getElementById('theorem-personal').classList.contains('collapsed')`), 'successful sign-in opens the right-side card');
    assert(await read(`document.getElementById('personal-login').hidden`), 'successful sign-in closes the form');
    const record = db.sqlite.prepare('SELECT * FROM documents').get();
    assert.equal(JSON.parse(record.content).graph.title, 'personal graph');
    assert.equal(await value('personal-password'), '');
    assert(!record.content.includes(password), 'passwords must never be captured in graph drafts');
    await client.send('Page.reload'); await delay(100); await ready(); await synced();
    assert(await read(`!document.getElementById('theorem-personal').hidden`), 'a valid session restores the card after reload');
    await read(`CalculatorCards.collapseCard('#theorem-personal')`);
    await clear('graph-title'); await type('collapsed card'); await synced();
    assert(await read(`document.getElementById('theorem-personal').classList.contains('collapsed')`), 'autosave does not reopen a collapsed card');
    await read(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-show-graphs').click()`);
    assert(await read(`!document.getElementById('theorem-personal').classList.contains('collapsed')`), 'Import can reopen My graphs');

    await clear('graph-title'); await type('cloud ');
    await synced();
    assert.equal(await value('graph-title'), 'cloud ', 'cloud acknowledgement preserves the raw focused draft');
    assert.equal(await read('document.activeElement.id'), 'graph-title');
    const cursor = await read(`document.getElementById('graph-title').selectionStart`);
    assert.equal(cursor, 6);
    await type('title'); await synced();
    assert.equal(await value('graph-title'), 'cloud title');

    const second = await launchBrowser(`${origin}/theorem_graph_calculator.html`);
    try {
      const readSecond = expression => evaluate(second.client, expression);
      await waitFor(() => readSecond(`document.getElementById('theorem-personal')?.dataset.ready === 'true'`));
      await readSecond(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-sign-in').click()`);
      await readSecond(`document.getElementById('personal-password').focus()`);
      await second.client.send('Input.insertText', { text: password });
      await readSecond(`document.getElementById('personal-login').requestSubmit()`);
      await waitFor(() => readSecond(`document.getElementById('graph-title').value === 'cloud title' && document.getElementById('personal-status').textContent === 'Saved to cloud'`), 20000, 'fresh device loads saved cloud graph');
    } finally { second.client.close(); await stopBrowser(second.browser, second.profile); }

    // IME input is preserved locally without publishing an intermediate model.
    await read(`(() => { const field=document.getElementById('graph-title'); field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})); field.value='中文草稿 '; field.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'稿'})); })()`);
    await delay(700);
    assert.equal(await value('graph-title'), '中文草稿 ');
    await read(`document.getElementById('graph-title').dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'中文草稿 '}))`);
    await synced();
    assert.equal(await value('graph-title'), '中文草稿 ');

    await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await clear('graph-title'); await type('offline work'); await delay(700);
    assert.equal(await value('graph-title'), 'offline work');
    await read(`document.getElementById('personal-sync').click()`); await delay(800);
    assert.match(await read(`document.getElementById('personal-status').textContent`), /Saved on this device/);
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await read(`window.dispatchEvent(new Event('online'))`); await synced();
    assert.equal(JSON.parse(db.sqlite.prepare('SELECT content FROM documents WHERE id=?').get(record.id).content).graph.title, 'offline work');

    // Change the server's revision as a second device would, then edit this tab.
    const remotePayload = JSON.parse(record.content);
    remotePayload.graph.title = 'remote device'; remotePayload.graph.titleNode.label = 'remote device';
    remotePayload.drafts = []; remotePayload.editor.detailEditBaseline = null;
    db.sqlite.prepare('UPDATE documents SET revision=revision+1, content=?, title=? WHERE id=?')
      .run(JSON.stringify(remotePayload), 'remote device', record.id);
    await clear('graph-title'); await type('local conflict');
    await waitFor(() => read(`!document.getElementById('personal-conflict').hidden`), 15000, 'conflict banner');
    assert.equal(await value('graph-title'), 'local conflict');
    await read(`document.getElementById('personal-cloud-version').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'remote device'`), 10000, 'open remote graph');
    const recovered = await read(`(async()=> (await new TheoremGraphStorage.IndexedStore('theorem-graphs-v2:'+window.THEOREM_GRAPH_API_BASE+':ramified').list()).some(row=>row.recovered && row.payload.graph.title==='local conflict'))()`);
    assert(recovered, 'conflict resolution preserves the displaced local graph');

    await clear('graph-title'); await type('before restore'); await delay(700);
    await read(`document.getElementById('personal-revert').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'remote device'`), 10000, 'restore opening version');
    await read(`document.getElementById('personal-history').click()`);
    await waitFor(() => read(`document.querySelectorAll('#personal-history-list button').length > 0`), 10000, 'history list');
    await read(`document.querySelector('#personal-history-list button').click()`);
    await waitFor(() => read(`!document.getElementById('personal-history-preview').hidden`), 10000, 'history preview');
    assert.match(await read(`document.getElementById('personal-preview-text').textContent`), /before restore/);
    await read(`document.getElementById('personal-restore-history').click()`);
    await waitFor(() => read(`document.getElementById('graph-title').value === 'before restore'`), 10000, 'restore checkpoint');
    await synced();

    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert(await read('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'personal controls must fit narrow screens');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(`document.getElementById('theorem-personal').scrollIntoView({block:'start'})`);
    const screenshotPath = await screenshot('ui-test.png');
    await read(`document.getElementById('personal-logout').click()`);
    await waitFor(() => read(`document.getElementById('theorem-personal').hidden`), 10000, 'sign-out hides the personal card');
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
    await synced();
    assert(await read(`!document.getElementById('theorem-personal').hidden`), 'the password form supports Enter to sign in');
    db.sqlite.prepare('UPDATE graph_sessions SET expires_at=0').run();
    await read(`document.getElementById('personal-refresh').click()`);
    await waitFor(() => read(`document.getElementById('theorem-personal').hidden`), 10000, 'an expired session hides the personal card');
    assert.deepEqual(errors, []);
    console.log('PASS theorem personal UI: guest layout, Import sign-in/cancel/errors/Enter, authenticated sidebar, session reload/expiry, collapse/reopen, sign-out, real typing, cloud save, draft/caret/IME, offline retry, conflicts, history restore, narrow layout');
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
