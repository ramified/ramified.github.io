const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { launchBrowser, stopBrowser, evaluate, waitFor, delay } = require('./math_workspace_drag_regression_test.js');
const root = path.resolve(__dirname, '..');

async function run() {
  const { passwordHash } = await import('../cloudflare/theorem-graph.worker.mjs');
  const { startLocalServer } = await import('../cloudflare/theorem-graph-local-server.mjs');
  const password = 'cross-origin-ui-password-12345';
  const backend = await startLocalServer({ memory: true, password: await passwordHash(password) });
  const frontend = http.createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://local').pathname;
      if (pathname === '/js/theorem_graph_cloud_config.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' });
        response.end(`window.THEOREM_GRAPH_API_BASE=${JSON.stringify(backend.origin + '/api/theorem')};`); return;
      }
      const file = path.resolve(root, '.' + decodeURIComponent(pathname));
      if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
      const contents = fs.readFileSync(file);
      response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
      response.end(contents);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => frontend.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${frontend.address().port}`;
  backend.env.ALLOWED_ORIGINS = origin;
  const page = origin + '/theorem_graph_calculator.html';
  const sessions = [], errors = [];
  async function browser(url) {
    const session = await launchBrowser(url); sessions.push(session);
    const c = session.client;
    await c.send('Page.enable'); await c.send('Runtime.enable');
    c.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Page.javascriptDialogOpening') c.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });
    const read = expression => evaluate(c, expression);
    const ready = () => waitFor(() => read(`document.getElementById('theorem-personal')?.dataset.ready === 'true'`), 20000);
    const click = id => read(`document.getElementById(${JSON.stringify(id)}).click()`);
    async function type(id, value) {
      await read(`document.getElementById(${JSON.stringify(id)}).focus()`);
      // Let native focus/selection settle after revealing a collapsed form.
      await read(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 });
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', modifiers: 0, windowsVirtualKeyCode: 8 });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', modifiers: 0 });
      await delay(60);
      for (const text of value) {
        await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: text, text, modifiers: 0 });
        await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: text, modifiers: 0 });
        await delay(20);
      }
      if (!await read(`document.getElementById(${JSON.stringify(id)}).readOnly`)) {
        assert(await read(`document.getElementById(${JSON.stringify(id)}).value === ${JSON.stringify(value)}`), `Sequential typing is preserved in ${id}`);
      }
    }
    async function login(username) {
      await read(`CalculatorCards.openCard('#export-card'); document.getElementById('theorem-graph-import-tab').click(); document.getElementById('personal-sign-in').click()`);
      await type('personal-username', username); await type('personal-password', password);
      await read(`document.getElementById('personal-login').requestSubmit()`);
      await waitFor(() => read(`!document.getElementById('theorem-personal').hidden && document.getElementById('personal-account-name').textContent === ${JSON.stringify('Signed in as ' + username)}`));
      await waitFor(() => read(`!document.getElementById('personal-logout').disabled && document.getElementById('personal-login').hidden`));
    }
    const sync = async () => {
      await delay(350); await click('personal-sync');
      await waitFor(() => read(`document.getElementById('personal-status').textContent === 'Saved to cloud'`), 15000);
    };
    const navigate = async url => { await c.send('Page.navigate', { url }); await delay(150); await ready(); };
    await ready(); return { c, read, click, type, login, sync, navigate };
  }
  try {
    const owner = await browser(page);
    assert.equal(await owner.read('location.origin'), origin);
    await owner.type('graph-title', 'Owner graph'); await delay(500); await owner.login('ramified'); await owner.sync();
    const documentId = backend.db.sqlite.prepare('SELECT id FROM documents').get().id;
    const row = `document.querySelector('#personal-graph-list [data-id="${documentId}"]')`;
    assert(await owner.read(`${row}.classList.contains('is-current') && ${row}.hasAttribute('aria-current')`));
    assert(await owner.read(`${row}.querySelector('time').dateTime.length > 0`));
    await owner.read(`document.querySelector('#theorem-personal .calculator-card-wide-btn').click()`);
    assert(await owner.read(`document.getElementById('theorem-personal').parentElement.id === 'personal-wide-host'`));
    assert(await owner.read(`document.getElementById('theorem-personal').getBoundingClientRect().width > 900`));
    await owner.read(`document.querySelector('#theorem-personal .calculator-card-wide-btn').click()`);
    assert(await owner.read(`document.getElementById('theorem-personal').parentElement.id === 'cards'`));
    await owner.read(`document.querySelector('#theorem-personal .calculator-card-wide-btn').click()`);
    await owner.read(`${row}.querySelector('.theorem-personal-item-actions button').click()`);
    await owner.type('personal-rename-title', 'Owner renamed');
    await owner.read(`document.getElementById('personal-rename').requestSubmit()`);
    await waitFor(() => owner.read(`document.getElementById('graph-title').value === 'Owner renamed'`)); await owner.sync();
    assert.equal(backend.db.sqlite.prepare('SELECT title FROM documents WHERE id=?').get(documentId).title, 'Owner renamed');
    await owner.read(`document.getElementById('personal-users').open = true`); await delay(200);
    await owner.type('personal-user-name', 'alice'); await owner.type('personal-user-password', password);
    await owner.read(`document.getElementById('personal-user-form').requestSubmit()`);
    await waitFor(() => owner.read(`document.getElementById('personal-user-status').textContent.includes('alice created')`));
    assert.equal(await owner.read(`document.getElementById('personal-user-password').value`), '');
    await owner.read(`${row}.querySelectorAll('.theorem-personal-item-actions button')[1].click()`);
    await waitFor(() => owner.read(`!document.getElementById('personal-share-panel').hidden`));
    const links = [];
    for (const [canEdit, canSave] of [[false, false], [true, false], [true, true]]) {
      await owner.read(`document.getElementById('personal-share-edit').checked=${canEdit}; document.getElementById('personal-share-edit').dispatchEvent(new Event('change')); document.getElementById('personal-share-save').checked=${canSave}; document.getElementById('personal-share-form').requestSubmit()`);
      await waitFor(async () => {
        const value = await owner.read(`document.getElementById('personal-share-url').value`); return value && !links.includes(value);
      });
      links.push(await owner.read(`document.getElementById('personal-share-url').value`));
      assert(links.at(-1).startsWith(page + '#share='), 'share links keep the public frontend URL');
      await delay(150);
    }
    console.log('PASS browser: cross-origin login, user provisioning, wide rows, current highlight, rename, and share creation');
    const viewer = await browser(links[0]);
    assert(await viewer.read(`document.getElementById('theorem-personal').hidden && document.getElementById('graph-title').readOnly`));
    await viewer.type('graph-title', 'Forbidden');
    assert.equal(await viewer.read(`document.getElementById('graph-title').value`), 'Owner renamed');
    assert(await viewer.read(`document.querySelector('#node-card .card-body').inert`));
    await viewer.navigate(links[1]); await viewer.type('graph-title', 'Temporary edit'); await delay(500);
    assert(await viewer.read(`document.getElementById('personal-shared-save').hidden`));
    assert.equal(backend.db.sqlite.prepare('SELECT title FROM documents WHERE id=?').get(documentId).title, 'Owner renamed');
    await viewer.c.send('Page.reload'); await delay(150);
    await waitFor(() => viewer.read(`document.getElementById('theorem-personal')?.dataset.ready === 'true'`));
    assert.equal(await viewer.read(`document.getElementById('graph-title').value`), 'Temporary edit', 'temporary shared drafts survive reload without entering My graphs');
    await viewer.navigate(links[2]); await viewer.type('graph-title', 'Saved by recipient'); await viewer.click('personal-shared-save');
    await waitFor(() => viewer.read(`document.getElementById('personal-shared-status').textContent === 'Saved to the original graph.'`));
    assert.equal(backend.db.sqlite.prepare('SELECT title FROM documents WHERE id=?').get(documentId).title, 'Saved by recipient');
    await viewer.type('graph-title', 'Unsaved next edit ');
    assert(await viewer.read(`document.getElementById('personal-shared-status').textContent.includes('Unsaved shared changes')`), 'new edits replace the previous saved message');
    await viewer.click('personal-shared-reload');
    await waitFor(() => viewer.read(`document.getElementById('graph-title').value === 'Saved by recipient'`));
    await owner.read(`[...document.querySelectorAll('#personal-share-list li')].find(row=>row.textContent.includes('Edit and save')).querySelector('button').click()`);
    await delay(300); await viewer.click('personal-shared-reload');
    await waitFor(() => viewer.read(`document.getElementById('personal-shared-status').textContent.includes('revoked')`));
    assert(await viewer.read(`document.getElementById('personal-shared-save').hidden && document.getElementById('graph-title').readOnly`));
    console.log('PASS browser: anonymous read-only, temporary editing, explicit original saves, reload recovery, and link revocation');
    await viewer.click('personal-shared-leave'); await viewer.login('alice');
    assert.equal(await viewer.read(`document.querySelectorAll('#personal-graph-list .theorem-personal-item').length`), 0, 'Alice sees no administrator or shared graphs');
    assert(await viewer.read(`document.getElementById('personal-users').hidden`));
    await viewer.type('graph-title', 'Alice private'); await viewer.sync();
    const aliceId = backend.db.sqlite.prepare('SELECT document_id FROM graph_owners WHERE username=?').get('alice').document_id;
    assert.equal(await viewer.read(`document.querySelectorAll('#personal-graph-list .theorem-personal-item').length`), 1);
    await viewer.c.send('Network.enable');
    await viewer.c.send('Network.setBlockedURLs', { urls: [backend.origin + '/*'] });
    await viewer.navigate(page);
    assert.equal(await viewer.read(`document.getElementById('graph-title').value`), 'Alice private', 'offline reload restores only the signed-in account cache');
    assert(await viewer.read(`!document.getElementById('theorem-personal').hidden`));
    await viewer.type('graph-title', 'Alice offline'); await delay(500);
    await viewer.navigate(page);
    assert.equal(await viewer.read(`document.getElementById('graph-title').value`), 'Alice offline');
    await viewer.c.send('Network.setBlockedURLs', { urls: [] });
    await viewer.read(`window.dispatchEvent(new Event('online'))`);
    await waitFor(() => viewer.read(`document.getElementById('personal-status').textContent === 'Saved to cloud'`), 15000);
    assert.equal(backend.db.sqlite.prepare('SELECT title FROM documents WHERE id=?').get(aliceId).title, 'Alice offline');
    await viewer.click('personal-logout'); await waitFor(() => viewer.read(`document.getElementById('theorem-personal').hidden`));
    assert.notEqual(await viewer.read(`document.getElementById('graph-title').value`), 'Alice offline', 'sign-out clears the private graph from the editor');
    await viewer.login('ramified'); await delay(250);
    assert(!await viewer.read(`!!document.querySelector('#personal-graph-list [data-id="${aliceId}"]')`), 'switching accounts isolates local caches');
    await owner.click('personal-refresh'); await delay(250);
    await owner.read(`${row}.querySelector('.theorem-personal-item-name').click()`); await delay(400);
    assert.equal(await owner.read(`document.getElementById('graph-title').value`), 'Saved by recipient');
    await owner.click('personal-copy'); await delay(300); await owner.sync();
    await owner.read(`document.getElementById('personal-share-panel').hidden=true; document.getElementById('personal-users').open=false; document.getElementById('personal-wide-host').scrollIntoView({block:'center'})`);
    const shot = await owner.c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(root, 'cloudflare/.theorem-local/ui-wide-library.png'), Buffer.from(shot.data, 'base64'));
    await owner.c.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await waitFor(() => owner.read(`document.getElementById('theorem-personal').parentElement.id === 'cards'`));
    assert(await owner.read(`document.documentElement.scrollWidth <= innerWidth + 1`), 'list fits a narrow viewport');
    await owner.c.send('Emulation.clearDeviceMetricsOverride');
    await owner.read(`${row}.querySelectorAll('.theorem-personal-item-actions button')[2].click()`);
    await waitFor(() => owner.read(`!${row}`));
    assert.equal(backend.db.sqlite.prepare('SELECT id FROM documents WHERE id=?').get(documentId), undefined);
    assert.deepEqual(errors, []);
    console.log('PASS browser: local account isolation, no shared-draft uploads, sidebar/wide responsive layout, deleting graphs and share links');
  } catch (error) {
    for (const session of sessions) console.error('UI state:', await evaluate(session.client, `({login:document.getElementById('personal-login-status')?.textContent,status:document.getElementById('personal-status')?.textContent,user:document.getElementById('personal-account-name')?.textContent,username:document.getElementById('personal-username')?.value,newUser:document.getElementById('personal-user-name')?.value,userStatus:document.getElementById('personal-user-status')?.textContent,active:document.activeElement?.id,cardHidden:document.getElementById('theorem-personal')?.hidden,api:window.THEOREM_GRAPH_API_BASE})`).catch(() => null));
    console.error('Runtime errors:', errors); throw error;
  } finally {
    for (const session of sessions) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => frontend.close(resolve));
    await new Promise(resolve => backend.server.close(resolve)); backend.db.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
