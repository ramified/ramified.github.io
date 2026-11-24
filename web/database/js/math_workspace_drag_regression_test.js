const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mime = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8']
]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function edgeExecutable() {
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ]
    : ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error('No installed Edge/Chromium executable is available for the native drag regression test.');
  return executable;
}

async function startServer() {
  const server = http.createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? 'math_workspace.html' : pathname.replace(/^\/+/, '');
      const filename = path.resolve(root, relative);
      if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
      const contents = fs.readFileSync(filename);
      response.writeHead(200, { 'content-type': mime.get(path.extname(filename)) || 'application/octet-stream' });
      response.end(contents);
    } catch (_) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(test, timeout = 15000, label = 'condition') {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try {
      const value = await test();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function launchBrowser(url) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'math-workspace-drag-'));
  const browser = childProcess.spawn(edgeExecutable(), [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--window-size=1440,1000',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    url
  ], { stdio: 'ignore' });
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const [port] = String(await waitFor(() => fs.existsSync(portFile) && fs.readFileSync(portFile, 'utf8'), 15000, 'DevTools port')).trim().split(/\r?\n/);
    const target = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      return targets.find((entry) => entry.type === 'page' && entry.url === url);
    }, 15000, 'workspace page target');
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.open();
    return { browser, client, profile };
  } catch (error) {
    browser.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
    throw error;
  }
}

async function stopBrowser(browser, profile) {
  const exited = new Promise((resolve) => browser.once('exit', resolve));
  browser.kill();
  await Promise.race([exited, delay(2000)]);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4 && error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
      await delay(200);
    }
  }
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function mouse(client, type, x, y, buttons) {
  await client.send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: type === 'mouseMoved' ? (buttons ? 'left' : 'none') : 'left',
    buttons,
    clickCount: type === 'mouseMoved' ? 0 : 1,
    pointerType: 'mouse'
  });
}

async function main() {
  const server = await startServer();
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/math_workspace.html`;
  const launched = await launchBrowser(url);
  const { browser, client, profile } = launched;
  try {
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await waitFor(() => evaluate(client, `document.readyState === 'complete' && !!window.MathWorkspaceAssetsTest`), 20000, 'workspace initialization');
    await evaluate(client, `(() => {
      window.__mathWorkspaceEarlyErrors = [];
      window.addEventListener('error', (event) => window.__mathWorkspaceEarlyErrors.push(event.message || 'window error'));
      window.addEventListener('unhandledrejection', (event) => window.__mathWorkspaceEarlyErrors.push(String(event.reason?.message || event.reason || 'unhandled rejection')));
    })()`);
    await evaluate(client, "MathWorkspaceLoader.ensure(['complex'])");
    const autosaveBefore = await evaluate(client, `(() => {
      const setSelect = (selector, value) => {
        const node = document.querySelector(selector);
        node.value = value;
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const create = (kind, name, references = {}) => {
        const api = window.MathWorkspaceAssetsTest;
        const asset = api.createObjectAsset(kind, { name, data: references });
        api.assetRequest('select-for-modify', { ref: { kind: asset.kind, id: asset.id } });
      };
      create('variety', 'X');
      create('variety', 'Y');
      create('sheaf', 'E', { base: 'variety:X1' });
      create('map', 'f', { domain: 'variety:X1', codomain: 'variety:X2' });
      const api = window.MathWorkspaceAssetsTest;
      const revision = api.state.snapshot.revision;
      const refreshes = api.assetsCardState.outerRefreshCount;
      const name = document.querySelector('[data-assets-name]');
      for (const value of ['f_1', 'f_2', 'f_3']) {
        name.value = value;
        name.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const instance = api.activeAssetInputInstance();
      return { revision, refreshes, committedName: api.state.snapshot.assets.find((asset) => asset.kind === 'map').name, draftName: instance.draft.name, status: instance.autosaveStatus };
    })()`);
    assert.strictEqual(autosaveBefore.committedName, 'f', 'keypress hot path must leave the committed map unchanged before debounce');
    assert.strictEqual(autosaveBefore.draftName, 'f_3', 'keypress hot path must immediately update the active Input Instance draft');
    assert.strictEqual(autosaveBefore.status, 'Editing');
    try {
      await waitFor(() => evaluate(client, `window.MathWorkspaceAssetsTest.state.snapshot.assets.find((asset) => asset.kind === 'map')?.name === 'f_3'`), 3000, 'final debounced browser autosave');
    } catch (error) {
      const diagnostics = await evaluate(client, `(() => {
        const api = window.MathWorkspaceAssetsTest;
        const map = api.state.snapshot.assets.find((asset) => asset.kind === 'map');
        const instance = api.assetInputInstanceForRef({ kind: map.kind, id: map.id });
        return { committed: map.name, revision: api.state.snapshot.revision, activeKey: api.state.activeInputInstanceKey, slotKey: api.assetsCardState.slots.get('input').activeInstanceKey, draft: instance?.draft, dirty: instance?.dirty, validation: instance?.validation, status: instance?.autosaveStatus, generation: instance?.taskGeneration, epoch: instance?.rendererEpoch, baseRevision: instance?.baseRevision, debouncePending: instance?.debounceTimer != null, maxWaitPending: instance?.maxWaitTimer != null, queueLength: api.assetsCardState.inputTaskQueue.length, running: api.assetsCardState.inputTaskRunning, errors: window.__mathWorkspaceEarlyErrors };
      })()`);
      throw new Error(`${error.message}: ${JSON.stringify(diagnostics)}`);
    }
    const autosaveAfter = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      const map = api.state.snapshot.assets.find((asset) => asset.kind === 'map');
      const instance = api.assetInputInstanceForRef({ kind: map.kind, id: map.id });
      return { revision: api.state.snapshot.revision, refreshes: api.assetsCardState.outerRefreshCount, committedName: map.name, draftName: instance.draft.name, status: instance.autosaveStatus };
    })()`);
    assert.strictEqual(autosaveAfter.committedName, 'f_3', 'rapid browser typing must produce one final autosave value');
    assert.strictEqual(autosaveAfter.draftName, 'f_3');
    assert.strictEqual(autosaveAfter.status, 'Saved');
    assert.strictEqual(autosaveAfter.revision, autosaveBefore.revision + 1, 'rapid browser typing must increment revision once');
    assert.strictEqual(autosaveAfter.refreshes, autosaveBefore.refreshes, 'Input typing/commit must not retarget Property Slots');

    const cardIdentity = await evaluate(client, `(async () => {
      const api = window.MathWorkspaceAssetsTest;
      const shell = (card) => ({
        handle: !!card.querySelector('.drag-handle'),
        pin: !!card.querySelector('.card-pin-btn'),
        moveUp: !!card.querySelector('[data-workspace-card-action="move-up"]'),
        moveDown: !!card.querySelector('[data-workspace-card-action="move-down"]'),
        hide: !!card.querySelector('[data-workspace-card-action="hide"]'),
        upDisabled: card.querySelector('[data-workspace-card-action="move-up"]')?.disabled,
        downDisabled: card.querySelector('[data-workspace-card-action="move-down"]')?.disabled
      });
      const inputCard = document.querySelector('.workspace-assets-input-card');
      const utilityCard = document.querySelector('#workspace-io-card');
      const boundMap = api.state.snapshot.assets.find((asset) => asset.kind === 'map');
      const firstVariety = api.state.snapshot.assets.find((asset) => asset.kind === 'variety');
      const secondVariety = api.state.snapshot.assets.filter((asset) => asset.kind === 'variety')[1];
      const sheaf = api.state.snapshot.assets.find((asset) => asset.kind === 'sheaf');
      const initialKey = api.activeAssetInputInstance().key;
      const initialTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');

      api.state.selected = new Set(['variety:' + secondVariety.id]);
      const selectionIndependentTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');

      await api.assetRequest('select-for-modify', { ref: { kind: 'variety', id: firstVariety.id } });
      const firstInstance = api.activeAssetInputInstance();
      const firstKey = firstInstance.key;
      const name = document.querySelector('[data-assets-name]');
      name.value = 'X_{';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      await api.assetRequest('select-for-modify', { ref: { kind: 'variety', id: secondVariety.id } });
      const secondTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');
      await api.assetRequest('select-for-modify', { ref: { kind: 'variety', id: firstVariety.id } });
      const restoredTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');
      const restoredDraft = api.activeAssetInputInstance().draft.name;

      await api.assetRequest('rename', { ref: { kind: 'variety', id: firstVariety.id }, name: 'X_{renamed}' });
      const renamedTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');
      const renamedKey = api.activeAssetInputInstance().key;

      const createTitles = {};
      for (const kind of ['variety', 'sheaf', 'map']) {
        await api.assetRequest('prepare-create', { kind });
        createTitles[kind] = inputCard.querySelector('.card-head').getAttribute('aria-label');
      }
      api.state.editorMode = 'modify';
      api.state.activeInputInstanceKey = null;
      api.assetsCardState.slots.get('input').activeInstanceKey = null;
      api.renderAssetsEditor();
      const emptyTitle = inputCard.querySelector('.card-head').getAttribute('aria-label');
      await api.assetRequest('select-for-modify', { ref: { kind: boundMap.kind, id: boundMap.id } });

      api.bindAssetPropertySlot('hodge', { kind: 'variety', id: firstVariety.id }, { focus: false });
      api.bindAssetPropertySlot('betti', { kind: 'variety', id: firstVariety.id }, { focus: false });
      api.bindAssetPropertySlot('homology', { kind: 'variety', id: firstVariety.id }, { focus: false });
      api.bindAssetPropertySlot('homology', { kind: 'sheaf', id: sheaf.id }, { focus: false });
      api.bindAssetPropertySlot('homology', { kind: 'map', id: boundMap.id }, { focus: false });
      api.bindAssetPropertySlot('characteristic-classes', { kind: 'sheaf', id: sheaf.id }, { focus: false });
      api.bindAssetPropertySlot('sheaf-cohomology', { kind: 'sheaf', id: sheaf.id }, { focus: false });
      await new Promise((resolve) => setTimeout(resolve, 80));

      const propertyShells = {};
      for (const type of api.NATIVE_ASSET_CARD_TYPES) {
        const slot = api.assetsCardState.slots.get(type);
        const nativeKey = api.ASSET_CARD_REGISTRY[type].nativeCardKey;
        const card = slot.rendererSession.editor.inspectorShadow.querySelector('[data-workspace-card-id="' + nativeKey + '"]');
        propertyShells[type] = { ...shell(card), title: card.querySelector('.card-head').getAttribute('aria-label') };
      }

      const homologySlot = api.assetsCardState.slots.get('homology-map');
      const homologyCard = homologySlot.rendererSession.editor.inspectorShadow.querySelector('[data-workspace-card-id="homology-card"]');
      homologyCard.querySelector('.card-pin-btn').click();
      homologyCard.querySelector('.card-head').click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      const beforeRetarget = { collapsed: homologySlot.collapsed, pinned: homologySlot.pinned, displayMode: homologySlot.displayMode };
      api.bindAssetPropertySlot('homology', { kind: 'variety', id: firstVariety.id }, { focus: false });
      const afterRetarget = { collapsed: homologySlot.collapsed, pinned: homologySlot.pinned, displayMode: homologySlot.displayMode };

      const revisionBeforeChrome = api.state.snapshot.revision;
      const statusBeforeChrome = api.activeAssetInputInstance().autosaveStatus;
      inputCard.querySelector('.card-pin-btn').click();
      inputCard.querySelector('.card-head').click();
      inputCard.querySelector('.card-head').click();
      inputCard.querySelector('[data-workspace-card-action="move-up"]')?.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      const chromeResult = {
        revisionBefore: revisionBeforeChrome,
        revisionAfter: api.state.snapshot.revision,
        statusBefore: statusBeforeChrome,
        statusAfter: api.activeAssetInputInstance().autosaveStatus
      };

      utilityCard.querySelector('[data-workspace-card-action="hide"]').click();
      document.querySelector('#workspace-add-card').click();
      const utilityOption = [...document.querySelectorAll('.workspace-card-option')].find((row) => row.textContent.includes('Import / Export'));
      const utilityHidden = { slotVisible: api.assetsUtilitySlots.get('importExport').visible, checked: utilityOption.querySelector('input').checked };
      utilityOption.querySelector('input').click();
      document.querySelector('#workspace-add-card').click();

      return {
        rootShells: { input: shell(inputCard), utility: shell(utilityCard) },
        utilityHasTarget: utilityCard.hasAttribute('data-input-instance-key') || utilityCard.hasAttribute('data-target-ref'),
        initialKey,
        initialTitle,
        selectionIndependentTitle,
        firstKey,
        secondTitle,
        restoredTitle,
        restoredDraft,
        renamedTitle,
        renamedKey,
        createTitles,
        emptyTitle,
        propertyShells,
        beforeRetarget,
        afterRetarget,
        chromeResult,
        utilityHidden
      };
    })()`);
    for (const [name, shell] of Object.entries({ ...cardIdentity.rootShells, ...cardIdentity.propertyShells })) {
      assert(shell.handle && shell.pin && shell.moveUp && shell.moveDown && shell.hide, `${name} must expose the standard Card controls: ${JSON.stringify(shell)}`);
    }
    assert.strictEqual(cardIdentity.initialTitle, 'f 3 · Input', 'bound Input title must use the committed map name and plain fallback');
    assert.strictEqual(cardIdentity.selectionIndependentTitle, cardIdentity.initialTitle, 'Explorer selection must not retarget the Input title');
    assert.strictEqual(cardIdentity.secondTitle, 'Y · Input');
    assert.strictEqual(cardIdentity.restoredTitle, 'X · Input');
    assert.strictEqual(cardIdentity.restoredDraft, 'X_{', 'A → B → A must restore the invalid draft with its title owner');
    assert.strictEqual(cardIdentity.renamedTitle, 'X renamed · Input');
    assert.strictEqual(cardIdentity.renamedKey, cardIdentity.firstKey, 'rename must preserve stable Input Instance identity');
    assert.deepStrictEqual(cardIdentity.createTitles, { variety: 'New Variety · Input', sheaf: 'New Sheaf · Input', map: 'New Map · Input' });
    assert.strictEqual(cardIdentity.emptyTitle, 'Assets · Input', 'an unbound Input Card must clear the previous object title');
    assert.strictEqual(cardIdentity.propertyShells.hodge.title, 'X renamed · Hodge Numbers');
    assert.deepStrictEqual(cardIdentity.afterRetarget, cardIdentity.beforeRetarget, 'Property Slot chrome presentation must survive retarget');
    assert.strictEqual(cardIdentity.chromeResult.revisionAfter, cardIdentity.chromeResult.revisionBefore, 'Card chrome must not increment Asset revision');
    assert.strictEqual(cardIdentity.chromeResult.statusAfter, cardIdentity.chromeResult.statusBefore, 'Card chrome must not trigger Input autosave');
    assert.strictEqual(cardIdentity.utilityHasTarget, false, 'Import / Export must remain a targetless utility Card');
    assert.deepStrictEqual(cardIdentity.utilityHidden, { slotVisible: false, checked: false }, 'hide and Add Card checkbox must share Slot visibility');
    assert.deepStrictEqual(await evaluate(client, `window.__mathWorkspaceEarlyErrors`), [], 'autosave and Card chrome browser paths must not emit window errors');

    console.log('PASS browser autosave and asset property cards');
  } finally {
    client.close();
    await new Promise((resolve) => server.close(resolve));
    await stopBrowser(browser, profile);
  }
}

module.exports = { delay, startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
