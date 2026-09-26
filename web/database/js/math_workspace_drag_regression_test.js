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

async function labelInfo(client, kind) {
  return evaluate(client, `(() => {
    const api = window.MathWorkspaceAssetsTest;
    const session = api.sessions.get('sheaf-complexes');
    const label = session?.editor?.shadow?.querySelector('[data-object-kind="${kind}"][data-object-id]');
    if (!label) return null;
    const rect = label.getBoundingClientRect();
    const layout = Object.fromEntries((session.editor.captureAssetLayout?.() || []).map((entry) => [entry.key, entry.point]));
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const hit = session.editor.shadow.elementFromPoint?.(x, y);
    return { x, y, id: label.dataset.objectId, layout, hidden: session.host.hidden, className: label.className, probe: label.dataset.dragProbe || '', pointerCaptured: label.hasPointerCapture?.(1) || false, hit: hit?.outerHTML?.slice(0, 240) || '', inputMode: session.editor.inspectorShadow?.querySelector('#input-mode')?.value, inputKind: session.editor.inspectorShadow?.querySelector('#add-object-kind')?.value };
  })()`);
}

async function dragLabel(client, kind, dx = 70, dy = 42) {
  const before = await labelInfo(client, kind);
  assert(before, `missing ${kind} label`);
  await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('[data-object-kind="${kind}"][data-object-id]').dataset.dragProbe = 'stable'`);
  await mouse(client, 'mouseMoved', before.x, before.y, 0);
  await mouse(client, 'mousePressed', before.x, before.y, 1);
  // A real drag outlives the native editor's 80 ms resize debounce.  Keeping
  // the pointer down here catches workspace reactivation that replaces the
  // captured label before the first visible movement.
  await delay(140);
  const pressed = await labelInfo(client, kind);
  await mouse(client, 'mouseMoved', before.x + dx / 2, before.y + dy / 2, 1);
  await delay(16);
  const during = await labelInfo(client, kind);
  const duringScene = await sceneGeometry(client);
  await mouse(client, 'mouseMoved', before.x + dx, before.y + dy, 1);
  await mouse(client, 'mouseReleased', before.x + dx, before.y + dy, 0);
  await delay(320);
  const after = await labelInfo(client, kind);
  const afterScene = await sceneGeometry(client);
  return { before, pressed, during, after, duringScene, afterScene };
}

async function selectionInfo(client) {
  return evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const labels = [...session.editor.shadow.querySelectorAll('[data-object-kind][data-object-id]')];
    const active = labels.filter((label) => label.classList.contains('is-active')).map((label) => ({
      kind: label.dataset.objectKind,
      id: label.dataset.objectId
    }));
    const controls = [...session.editor.shadow.querySelectorAll('[data-map-control]')].map((control) => ({
      control: control.dataset.mapControl,
      disabled: control.disabled,
      left: parseFloat(control.style.left),
      top: parseFloat(control.style.top)
    }));
    return { active, controls };
  })()`);
}

async function clickLabel(client, kind) {
  const before = await labelInfo(client, kind);
  assert(before, `missing ${kind} label`);
  await mouse(client, 'mouseMoved', before.x, before.y, 0);
  await mouse(client, 'mousePressed', before.x, before.y, 1);
  await mouse(client, 'mouseReleased', before.x, before.y, 0);
  await delay(320);
  return selectionInfo(client);
}

async function dragMapControl(client, dx = 44, dy = -32) {
  const before = await evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const control = session.editor.shadow.querySelector('[data-map-control]:not([disabled])');
    if (!control) return null;
    control.dataset.dragProbe = 'stable';
    const rect = control.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      control: control.dataset.mapControl,
      left: parseFloat(control.style.left),
      top: parseFloat(control.style.top),
      bitmap: session.editor.shadow.querySelector('#sheaf-canvas').toDataURL()
    };
  })()`);
  assert(before, 'selected map must expose an enabled native curve control');
  await mouse(client, 'mouseMoved', before.x, before.y, 0);
  await mouse(client, 'mousePressed', before.x, before.y, 1);
  await delay(140);
  await mouse(client, 'mouseMoved', before.x + dx, before.y + dy, 1);
  await delay(24);
  const during = await evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const control = session.editor.shadow.querySelector('[data-map-control="${before.control}"]');
    return control ? {
      probe: control.dataset.dragProbe || '',
      left: parseFloat(control.style.left),
      top: parseFloat(control.style.top),
      bitmap: session.editor.shadow.querySelector('#sheaf-canvas').toDataURL()
    } : null;
  })()`);
  await mouse(client, 'mouseReleased', before.x + dx, before.y + dy, 0);
  await delay(320);
  const after = await evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const control = session.editor.shadow.querySelector('[data-map-control="${before.control}"]');
    return control ? {
      left: parseFloat(control.style.left),
      top: parseFloat(control.style.top),
      bitmap: session.editor.shadow.querySelector('#sheaf-canvas').toDataURL()
    } : null;
  })()`);
  return { before, during, after };
}

async function sceneGeometry(client) {
  return evaluate(client, `(() => {
    const api = window.MathWorkspaceAssetsTest;
    const session = api.sessions.get('sheaf-complexes');
    const root = session.editor.shadow;
    const stage = root.querySelector('.sheaf-stage');
    const canvas = root.querySelector('#sheaf-canvas');
    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const origin = { x: stageRect.left + stage.clientLeft, y: stageRect.top + stage.clientTop };
    const canonical = { width: 880, height: 280 };
    const scale = Math.min(stage.clientWidth / canonical.width, stage.clientHeight / canonical.height);
    const offset = {
      x: (stage.clientWidth - canonical.width * scale) / 2,
      y: (stage.clientHeight - canonical.height * scale) / 2
    };
    const layout = Object.fromEntries((session.editor.captureAssetLayout?.() || []).map((entry) => [entry.key, entry.point]));
    const node = (kind) => {
      const element = root.querySelector('[data-object-kind="' + kind + '"][data-object-id]');
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        id: element.dataset.objectId,
        left: parseFloat(element.style.left), top: parseFloat(element.style.top),
        centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2,
        width: rect.width, height: rect.height,
        offsetWidth: element.offsetWidth, offsetHeight: element.offsetHeight,
        fontSize: parseFloat(style.fontSize), paddingLeft: parseFloat(style.paddingLeft),
        borderWidth: parseFloat(style.borderLeftWidth)
      };
    };
    const handle = root.querySelector('[data-map-control^="handle:0:out"]');
    const handleRect = handle?.getBoundingClientRect();
    const endpointNodes = [...root.querySelectorAll('[data-map-control^="anchor:"]')];
    const endpoints = endpointNodes.map((endpoint) => {
      const rect = endpoint.getBoundingClientRect();
      return { control: endpoint.dataset.mapControl, centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
    });
    const toolbar = root.querySelector('.canvas-corner-actions');
    const toolbarRect = toolbar?.getBoundingClientRect();
    const scene = root.querySelector('[data-workspace-scene]');
    const outerSplit = document.querySelector('#workspace-split-view');
    const outerInspector = document.querySelector('#workspace-inspector');
    const outerSplitRect = outerSplit?.getBoundingClientRect();
    const outerInspectorRect = outerInspector?.getBoundingClientRect();
    return {
      canonical, scale, offset, origin,
      stage: { width: stage.clientWidth, height: stage.clientHeight },
      canvas: {
        width: canvasRect.width, height: canvasRect.height,
        intrinsicWidth: canvas.width / (devicePixelRatio || 1),
        intrinsicHeight: canvas.height / (devicePixelRatio || 1)
      },
      layout,
      objects: { variety: node('variety'), sheaf: node('sheaf'), map: node('map') },
      handle: handle && handleRect ? {
        control: handle.dataset.mapControl,
        left: parseFloat(handle.style.left), top: parseFloat(handle.style.top),
        centerX: handleRect.left + handleRect.width / 2, centerY: handleRect.top + handleRect.height / 2,
        width: handleRect.width, height: handleRect.height,
        offsetWidth: handle.offsetWidth, offsetHeight: handle.offsetHeight,
        hitInset: Math.abs(parseFloat(getComputedStyle(handle, '::before').inset) || 0)
      } : null,
      endpoints,
      sceneMetrics: session.editor.captureSceneGeometry?.() || null,
      sceneTransform: scene?.style.transform || '',
      toolbar: toolbarRect ? { width: toolbarRect.width, height: toolbarRect.height } : null,
      outerUi: {
        split: outerSplitRect ? { width: outerSplitRect.width, height: outerSplitRect.height, fontSize: parseFloat(getComputedStyle(outerSplit).fontSize) } : null,
        inspector: outerInspectorRect ? { width: outerInspectorRect.width, height: outerInspectorRect.height } : null
      },
      revision: api.state.snapshot.revision,
      outerRefreshCount: api.assetsCardState.outerRefreshCount
    };
  })()`);
}

function closeTo(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

function assertSceneUsesCanonicalTransform(snapshot, label) {
  const { canonical, scale, offset, origin } = snapshot;
  assert(snapshot.sceneMetrics, `${label} must expose the authoritative scene transform`);
  closeTo(snapshot.sceneMetrics.view.scale, scale, 1e-6, `${label} authoritative scale`);
  closeTo(snapshot.canvas.intrinsicWidth, canonical.width, 0.01, `${label} canonical canvas width`);
  closeTo(snapshot.canvas.intrinsicHeight, canonical.height, 0.01, `${label} canonical canvas height`);
  closeTo(snapshot.canvas.width / canonical.width, scale, 0.01, `${label} canvas horizontal scale`);
  closeTo(snapshot.canvas.height / canonical.height, scale, 0.01, `${label} canvas vertical scale`);
  for (const kind of ['variety', 'sheaf']) {
    const key = `${kind}:${kind === 'variety' ? 'X1' : 'E3'}`;
    const point = snapshot.layout[key];
    const object = snapshot.objects[kind];
    closeTo(object.centerX, origin.x + offset.x + point.x * canonical.width * scale, 1.25, `${label} ${kind} screen x`);
    closeTo(object.centerY, origin.y + offset.y + point.y * canonical.height * scale, 1.25, `${label} ${kind} screen y`);
  }
  for (const kind of ['variety', 'sheaf', 'map']) {
    const object = snapshot.objects[kind];
    closeTo(object.centerX, origin.x + offset.x + object.left * scale, 1.25, `${label} ${kind} absolute label x`);
    closeTo(object.centerY, origin.y + offset.y + object.top * scale, 1.25, `${label} ${kind} absolute label y`);
    closeTo(object.width / object.offsetWidth, scale, 0.03, `${label} ${kind} visual width/font/padding scale`);
    closeTo(object.height / object.offsetHeight, scale, 0.03, `${label} ${kind} visual height/font/padding scale`);
  }
  const curve = snapshot.layout['map:M4'].curve;
  if (snapshot.handle && curve?.handles?.[0]) {
    const handlePoint = curve.handles[0];
    closeTo(snapshot.handle.centerX, origin.x + offset.x + handlePoint.x * canonical.width * scale, 1.25, `${label} curve handle screen x`);
    closeTo(snapshot.handle.centerY, origin.y + offset.y + handlePoint.y * canonical.height * scale, 1.25, `${label} curve handle screen y`);
  }
  if (snapshot.endpoints.length >= 2) {
    const endpoints = snapshot.endpoints.slice().sort((left, right) => Number(left.control.split(':')[1]) - Number(right.control.split(':')[1]));
    const endpointPoints = [snapshot.layout['variety:X1'], snapshot.layout['variety:X2']];
    for (let index = 0; index < 2; index += 1) {
      closeTo(endpoints[index].centerX, origin.x + offset.x + endpointPoints[index].x * canonical.width * scale, 1.25, `${label} map endpoint ${index} x without double scaling`);
      closeTo(endpoints[index].centerY, origin.y + offset.y + endpointPoints[index].y * canonical.height * scale, 1.25, `${label} map endpoint ${index} y without double scaling`);
    }
  }
  const lengths = snapshot.sceneMetrics, expected = lengths.canonical, actual = lengths.screen;
  for (const key of ['fontSize', 'mapFontSize', 'labelPaddingX', 'labelPaddingY', 'dependencyLineWidth', 'mapLineWidth', 'dashLength', 'dashGap', 'arrowhead', 'handleSize', 'anchorSize', 'selectionOutline']) {
    closeTo(actual[key], expected[key] * scale, 1e-6, `${label} ${key} length transform`);
  }
  closeTo(actual.handleHitRadius, (expected.handleSize / 2 + expected.handleHitInset) * scale, 1e-6, `${label} handle hit radius transform`);
  const anchor = snapshot.sceneMetrics.curveAnchor;
  if (!anchor) { assert.strictEqual(snapshot.handle, null, `${label} a visible curve handle requires curved-arrow metrics`); return; }
  assert(anchor, `${label} must expose a curved-arrow anchor`);
  closeTo(anchor.pathStart.x, anchor.sourceCenter.x, 1e-9, `${label} canonical path start x`);
  closeTo(anchor.pathStart.y, anchor.sourceCenter.y, 1e-9, `${label} canonical path start y`);
  closeTo(anchor.pathEnd.x, anchor.targetCenter.x, 1e-9, `${label} canonical path end x`);
  closeTo(anchor.pathEnd.y, anchor.targetCenter.y, 1e-9, `${label} canonical path end y`);
  closeTo(anchor.pathStartScreen.x, anchor.sourceCenterScreen.x, 1e-6, `${label} screen path start x`);
  closeTo(anchor.pathStartScreen.y, anchor.sourceCenterScreen.y, 1e-6, `${label} screen path start y`);
  closeTo(anchor.pathEndScreen.x, anchor.targetCenterScreen.x, 1e-6, `${label} screen path end x`);
  closeTo(anchor.pathEndScreen.y, anchor.targetCenterScreen.y, 1e-6, `${label} screen path end y`);
  closeTo(anchor.controlStart.x, anchor.pathStart.x, 1e-9, `${label} controls and painted path share start x`);
  closeTo(anchor.controlStart.y, anchor.pathStart.y, 1e-9, `${label} controls and painted path share start y`);
  closeTo(anchor.controlEnd.x, anchor.pathEnd.x, 1e-9, `${label} controls and painted path share end x`);
  closeTo(anchor.controlEnd.y, anchor.pathEnd.y, 1e-9, `${label} controls and painted path share end y`);
}

async function hitRegionInfo(client) {
  return evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const root = session.editor.shadow;
    const metrics = session.editor.captureSceneGeometry();
    const handle = root.querySelector('[data-map-control^="handle:0:out"]');
    const label = root.querySelector('[data-object-kind="variety"][data-object-id]');
    const handleRect = handle.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const handleCenter = { x: handleRect.left + handleRect.width / 2, y: handleRect.top + handleRect.height / 2 };
    const hitRadius = metrics.screen.handleHitRadius;
    const closest = (x, y, selector) => root.elementFromPoint(x, y)?.closest?.(selector) || null;
    return {
      hitRadius,
      handleInside: closest(handleCenter.x + hitRadius - 0.5, handleCenter.y, '[data-map-control]')?.dataset.mapControl || '',
      handleOutside: closest(handleCenter.x + hitRadius + 1.5, handleCenter.y, '[data-map-control]')?.dataset.mapControl || '',
      objectInside: closest(labelRect.right - 0.5, labelRect.top + labelRect.height / 2, '[data-object-kind]')?.dataset.objectKind || '',
      objectOutside: closest(labelRect.right + 1.5, labelRect.top + labelRect.height / 2, '[data-object-kind]')?.dataset.objectKind || ''
    };
  })()`);
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
    const autosaveBefore = await evaluate(client, `(() => {
      const setSelect = (selector, value) => {
        const node = document.querySelector(selector);
        node.value = value;
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const create = (kind, name, references = {}) => {
        setSelect('[data-assets-mode]', 'create');
        setSelect('[data-assets-kind]', kind);
        document.querySelector('[data-assets-name]').value = name;
        for (const [field, key] of Object.entries(references)) {
          document.querySelector('[data-assets-reference="' + field + '"]').dataset.assetReferenceValue = key;
        }
        document.querySelector('[data-assets-save]').click();
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
      const picker = document.querySelector('#workspace-open-canvas');
      picker.value = 'sheaf-complexes';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
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

      const homologySlot = api.assetsCardState.slots.get('homology');
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
      document.querySelector('#workspace-card-source').value = 'assets';
      document.querySelector('#workspace-card-source').dispatchEvent(new Event('change', { bubbles: true }));
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

    await waitFor(() => evaluate(client, `!!window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes')?.editor?.shadow?.querySelector('[data-workspace-collect-assets]')`), 20000, 'Sheaf workspace collect control');
    await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('[data-workspace-collect-assets]').click()`);
    try {
      await waitFor(() => evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelectorAll('[data-object-kind][data-object-id]').length >= 4`), 10000, 'projected canvas labels');
    } catch (error) {
      const diagnostics = await evaluate(client, `(() => {
        const api = window.MathWorkspaceAssetsTest;
        const session = api.sessions.get('sheaf-complexes');
        return {
          assets: api.state.snapshot.assets.map((asset) => ({ key: api.assetKey(asset), name: asset.name, data: asset.data })),
          labels: session?.editor?.shadow?.querySelectorAll('[data-object-kind][data-object-id]').length || 0,
          status: document.querySelector('#workspace-status')?.textContent || '',
          editorStatus: document.querySelector('[data-assets-editor-status]')?.textContent || ''
        };
      })()`);
      throw new Error(`${error.message}: ${JSON.stringify(diagnostics)}`);
    }

    const bitmapBefore = await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('#sheaf-canvas').toDataURL()`);
    await evaluate(client, `(() => {
      window.__mathWorkspaceDragErrors = [];
      window.addEventListener('error', (event) => window.__mathWorkspaceDragErrors.push(event.message || 'window error'));
      window.addEventListener('unhandledrejection', (event) => window.__mathWorkspaceDragErrors.push(String(event.reason?.message || event.reason || 'unhandled rejection')));
    })()`);

    for (const kind of ['variety', 'sheaf', 'map']) {
      const selection = await clickLabel(client, kind);
      assert(selection.active.some((entry) => entry.kind === kind), `${kind} click must retain native selection after workspace projection: ${JSON.stringify(selection)}`);
    }
    await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const pointCount = session.editor.inspectorShadow.querySelector('[data-canvas-appearance-point-count]');
      pointCount.value = '1';
      pointCount.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await delay(320);
    const singleGeometry = await sceneGeometry(client);
    assert(singleGeometry.handle, `single view must expose a curve handle: ${JSON.stringify(singleGeometry)}`);
    assertSceneUsesCanonicalTransform(singleGeometry, 'single view');
    await evaluate(client, `document.querySelector('#workspace-split-view').click()`);
    await delay(420);
    const splitGeometry = await sceneGeometry(client);
    assert.deepStrictEqual(splitGeometry.layout, singleGeometry.layout, 'single to split must not rewrite canonical layout');
    assert.strictEqual(splitGeometry.revision, singleGeometry.revision, 'canvas resize must not increment Asset revision');
    assert.strictEqual(splitGeometry.outerRefreshCount, singleGeometry.outerRefreshCount, 'canvas resize must not publish a Property command refresh');
    assertSceneUsesCanonicalTransform(splitGeometry, 'split view');
    closeTo(splitGeometry.objects.variety.width / splitGeometry.objects.variety.offsetWidth, splitGeometry.scale, 0.03, 'split label visual/font/padding scale');
    closeTo(splitGeometry.handle.width / splitGeometry.handle.offsetWidth, splitGeometry.scale, 0.03, 'split handle visual scale');
    closeTo(splitGeometry.outerUi.split.height, singleGeometry.outerUi.split.height, 0.1, 'workspace split control height must not scene-scale');
    closeTo(splitGeometry.outerUi.split.fontSize, singleGeometry.outerUi.split.fontSize, 0.01, 'workspace UI typography must not scene-scale');
    closeTo(splitGeometry.toolbar.width, singleGeometry.toolbar.width, 0.1, 'canvas toolbar must remain outside scene scaling');
    closeTo(splitGeometry.toolbar.height, singleGeometry.toolbar.height, 0.1, 'canvas toolbar height must remain outside scene scaling');
    const hitRegions = await hitRegionInfo(client);
    assert.strictEqual(hitRegions.handleInside, 'handle:0:out', `scaled handle hit region must accept its canonical boundary: ${JSON.stringify(hitRegions)}`);
    assert.strictEqual(hitRegions.handleOutside, '', `scaled handle hit region must not retain an extra fixed-pixel tolerance: ${JSON.stringify(hitRegions)}`);
    assert.strictEqual(hitRegions.objectInside, 'variety', `scaled object hit region must match the visual label: ${JSON.stringify(hitRegions)}`);
    assert.notStrictEqual(hitRegions.objectOutside, 'variety', `object hit region must not extend beyond its transformed bounds: ${JSON.stringify(hitRegions)}`);
    const splitCurveControl = await dragMapControl(client, 28, 18);
    assert(splitCurveControl.during && splitCurveControl.after, 'curve handle must remain live after split resize');
    assert(Math.hypot(splitCurveControl.during.left - splitCurveControl.before.left, splitCurveControl.during.top - splitCurveControl.before.top) > 10 / splitGeometry.scale, `split curve drag must inverse-transform the pointer without offset: ${JSON.stringify(splitCurveControl)}`);
    assert(Math.hypot(splitCurveControl.after.left - splitCurveControl.before.left, splitCurveControl.after.top - splitCurveControl.before.top) > 10 / splitGeometry.scale, `split curve drag must persist without rebound: ${JSON.stringify(splitCurveControl)}`);
    const splitAfterCurve = await sceneGeometry(client);
    await evaluate(client, `document.querySelector('#workspace-split-view').click()`);
    await delay(420);
    const restoredGeometry = await sceneGeometry(client);
    assert.deepStrictEqual(restoredGeometry.layout, splitAfterCurve.layout, 'split to single must preserve the intentional canonical curve edit without drift');
    assertSceneUsesCanonicalTransform(restoredGeometry, 'restored single view');

    const stableLayout = restoredGeometry.layout;
    await evaluate(client, `(async () => {
      const button = document.querySelector('#workspace-split-view');
      for (let index = 0; index < 20; index += 1) {
        button.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
    })()`);
    await delay(180);
    const cycledGeometry = await sceneGeometry(client);
    assert.deepStrictEqual(cycledGeometry.layout, stableLayout, '20 single/split transitions must not drift canonical positions or curve geometry');
    assert.strictEqual(cycledGeometry.revision, singleGeometry.revision, '20 view transitions must not increment Asset revision');
    assert.strictEqual(cycledGeometry.outerRefreshCount, singleGeometry.outerRefreshCount, '20 view transitions must not send CARD-001 commands');
    assertSceneUsesCanonicalTransform(cycledGeometry, '20-cycle restored view');

    await evaluate(client, `document.querySelector('#workspace-split-view').click()`);
    await delay(180);
    const viewportLayouts = [];
    for (const width of [1320, 1180, 1040, 1440]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await delay(220);
      const geometry = await sceneGeometry(client);
      assertSceneUsesCanonicalTransform(geometry, `split viewport ${width}`);
      viewportLayouts.push(geometry.layout);
    }
    viewportLayouts.forEach((layout) => assert.deepStrictEqual(layout, stableLayout, 'continuous pane resize must not rewrite canonical layout'));
    await evaluate(client, `document.querySelector('#workspace-split-view').click()`);
    await delay(220);

    const curvedSourceBefore = await sceneGeometry(client);
    const curvedSourceDrag = await dragLabel(client, 'variety', 36, 20);
    assertSceneUsesCanonicalTransform(curvedSourceDrag.duringScene, 'curved source during live drag');
    assertSceneUsesCanonicalTransform(curvedSourceDrag.afterScene, 'curved source after drag');
    const beforeAnchor = curvedSourceBefore.sceneMetrics.curveAnchor;
    const duringAnchor = curvedSourceDrag.duringScene.sceneMetrics.curveAnchor;
    const afterAnchor = curvedSourceDrag.afterScene.sceneMetrics.curveAnchor;
    assert(Math.hypot(duringAnchor.sourceCenter.x - beforeAnchor.sourceCenter.x, duringAnchor.sourceCenter.y - beforeAnchor.sourceCenter.y) > 5, 'curved path source must update before pointerup');
    closeTo(duringAnchor.firstControl.x - duringAnchor.sourceCenter.x, beforeAnchor.firstControl.x - beforeAnchor.sourceCenter.x, 1e-9, 'source drag must preserve first control relative x');
    closeTo(duringAnchor.firstControl.y - duringAnchor.sourceCenter.y, beforeAnchor.firstControl.y - beforeAnchor.sourceCenter.y, 1e-9, 'source drag must preserve first control relative y');
    closeTo(afterAnchor.firstControl.x - afterAnchor.sourceCenter.x, beforeAnchor.firstControl.x - beforeAnchor.sourceCenter.x, 1e-9, 'source pointerup must preserve first control relative x');
    closeTo(afterAnchor.firstControl.y - afterAnchor.sourceCenter.y, beforeAnchor.firstControl.y - beforeAnchor.sourceCenter.y, 1e-9, 'source pointerup must preserve first control relative y');

    await clickLabel(client, 'map');
    const selectedMap = await selectionInfo(client);
    assert(selectedMap.controls.some((control) => !control.disabled), `map selection must expose editable curve controls: ${JSON.stringify(selectedMap)}`);
    const curveControl = await dragMapControl(client);
    assert(curveControl.during, 'map curve control must remain present during pointer drag');
    assert.strictEqual(curveControl.during.probe, 'stable', 'workspace projection must not replace the captured curve control');
    assert(Math.hypot(curveControl.during.left - curveControl.before.left, curveControl.during.top - curveControl.before.top) > 10, `map curve control must follow the pointer before pointerup: ${JSON.stringify(curveControl)}`);
    assert.notStrictEqual(curveControl.during.bitmap, curveControl.before.bitmap, 'map curve must redraw while its control is dragged');
    assert(curveControl.after, 'map curve control must remain available after pointerup');
    assert(Math.hypot(curveControl.after.left - curveControl.before.left, curveControl.after.top - curveControl.before.top) > 10, `map curve control trajectory must persist after workspace projection: ${JSON.stringify(curveControl)}`);
    await evaluate(client, `(() => {
      const pointCount = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.inspectorShadow.querySelector('[data-canvas-appearance-point-count]');
      pointCount.value = '0';
      pointCount.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await delay(320);

    const variety = await dragLabel(client, 'variety');
    const sheaf = await dragLabel(client, 'sheaf');
    const map = await dragLabel(client, 'map');
    const bitmapAfter = await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('#sheaf-canvas').toDataURL()`);

    for (const [kind, result] of Object.entries({ variety, sheaf, map })) {
      assert(result.during && result.after, `${kind} drag must retain its label`);
      assert.strictEqual(result.pressed.probe, 'stable', `${kind} pointerdown must not replace the captured label`);
      assert(result.pressed.className.includes('is-dragging'), `${kind} pointerdown must start the native drag state`);
      assert(Math.hypot(result.during.x - result.before.x, result.during.y - result.before.y) > 10, `${kind} must follow the pointer during drag: ${JSON.stringify(result)}`);
      const beforePoint = result.before.layout[`${kind}:${kind === 'variety' ? 'X1' : kind === 'sheaf' ? 'E3' : 'M4'}`];
      const afterPoint = result.after.layout[`${kind}:${kind === 'variety' ? 'X1' : kind === 'sheaf' ? 'E3' : 'M4'}`];
      assert(Math.hypot(afterPoint.x - beforePoint.x, afterPoint.y - beforePoint.y) > 0.01, `${kind} native layout coordinates must persist after pointerup: ${JSON.stringify(result)}`);
    }
    assert.notStrictEqual(bitmapAfter, bitmapBefore, 'canvas dependency lines must be redrawn after object movement');

    const geometryBeforeCards = await sceneGeometry(client);
    const propertySessions = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      api.bindAssetPropertySlot('hodge', { kind: 'variety', id: 'X1' });
      api.bindAssetPropertySlot('betti', { kind: 'variety', id: 'X2' });
      api.bindAssetPropertySlot('homology', { kind: 'sheaf', id: 'E3' });
      api.bindAssetPropertySlot('characteristic-classes', { kind: 'sheaf', id: 'E3' });
      api.bindAssetPropertySlot('sheaf-cohomology', { kind: 'sheaf', id: 'E3' });
      api.bindAssetPropertySlot('homology', { kind: 'map', id: 'M4' });
      const sessions = api.NATIVE_ASSET_CARD_TYPES.map((cardType) => api.assetsCardState.slots.get(cardType).rendererSession);
      return {
        count: sessions.filter(Boolean).length,
        uniqueHosts: new Set(sessions.map((session) => session?.host)).size,
        canvasesHidden: sessions.every((session) => session?.host.hidden),
        homologyInstance: api.assetsCardState.slots.get('homology').activeInstanceKey
      };
    })()`);
    assert.deepStrictEqual(propertySessions, { count: 5, uniqueHosts: 5, canvasesHidden: true, homologyInstance: 'asset:map:M4:homology' });
    await delay(180);
    const geometryWithCards = await sceneGeometry(client);
    assert.deepStrictEqual(geometryWithCards.layout, geometryBeforeCards.layout, 'opening Property Cards must not rewrite canonical scene geometry');
    assertSceneUsesCanonicalTransform(geometryWithCards, 'scene with Property Cards');
    closeTo(geometryWithCards.outerUi.split.fontSize, geometryBeforeCards.outerUi.split.fontSize, 0.01, 'Property Cards must not scale workspace UI typography');
    const withCards = await dragLabel(client, 'variety', -55, 34);
    assert(Math.hypot(withCards.after.x - withCards.before.x, withCards.after.y - withCards.before.y) > 10, 'private Property Card sessions must not disable canvas drag');

    const zeroSizeTransform = await evaluate(client, `(async () => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const stage = session.editor.shadow.querySelector('.sheaf-stage');
      const scene = session.editor.shadow.querySelector('[data-workspace-scene]');
      const before = scene.style.transform;
      stage.style.display = 'none';
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const hidden = scene.style.transform;
      stage.style.removeProperty('display');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { before, hidden, restored: scene.style.transform };
    })()`);
    assert.strictEqual(zeroSizeTransform.hidden, zeroSizeTransform.before, 'hidden/0x0 stage must not overwrite the last valid transform');
    assert(zeroSizeTransform.restored, 'restored stage must retain a valid transform');

    await evaluate(client, `document.querySelector('[data-canvas-tab="assets"]').click()`);
    await delay(80);
    const inactiveBefore = await labelInfo(client, 'sheaf');
    assert.strictEqual(inactiveBefore.hidden, true, 'Sheaf canvas session must be inactive when Assets is selected');
    await mouse(client, 'mouseMoved', inactiveBefore.x, inactiveBefore.y, 0);
    await mouse(client, 'mousePressed', inactiveBefore.x, inactiveBefore.y, 1);
    await mouse(client, 'mouseMoved', inactiveBefore.x + 80, inactiveBefore.y + 40, 1);
    await mouse(client, 'mouseReleased', inactiveBefore.x + 80, inactiveBefore.y + 40, 0);
    const inactiveAfter = await labelInfo(client, 'sheaf');
    assert.deepStrictEqual(inactiveAfter.layout, inactiveBefore.layout, 'inactive canvas session must ignore pointer drag');

    await evaluate(client, `document.querySelector('[data-canvas-tab="sheaf-complexes"]').click()`);
    await delay(80);
    const reactivated = await dragLabel(client, 'sheaf', 45, -35);
    assert(Math.hypot(reactivated.after.x - reactivated.before.x, reactivated.after.y - reactivated.before.y) > 10, `reactivated canvas session must resume drag: ${JSON.stringify(reactivated)}`);

    const secondaryPoint = await evaluate(client, `(() => {
      document.querySelector('#workspace-split-view').click();
      const rect = document.querySelector('#workspace-canvas-pane-secondary').getBoundingClientRect();
      return { x: rect.left + Math.min(30, rect.width / 2), y: rect.top + Math.min(30, rect.height / 2) };
    })()`);
    await mouse(client, 'mouseMoved', secondaryPoint.x, secondaryPoint.y, 0);
    await mouse(client, 'mousePressed', secondaryPoint.x, secondaryPoint.y, 1);
    await mouse(client, 'mouseReleased', secondaryPoint.x, secondaryPoint.y, 0);
    assert.strictEqual(await evaluate(client, `document.querySelector('#workspace-canvas-pane-secondary').classList.contains('focused')`), true, 'secondary split pane must receive focus');
    const dropResult = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      const session = api.sessions.get('sheaf-complexes');
      const root = session.editor.shadow;
      const stage = root.querySelector('.sheaf-stage');
      const scene = root.querySelector('[data-workspace-scene]');
      const metrics = session.editor.captureSceneGeometry();
      const rect = scene.getBoundingClientRect();
      const normalized = { x: 0.72, y: 0.22 };
      const clientX = rect.left + normalized.x * metrics.canonical.width * metrics.view.scale;
      const clientY = rect.top + normalized.y * metrics.canonical.height * metrics.view.scale;
      const transfer = new DataTransfer();
      transfer.setData('application/x-math-workspace-asset', JSON.stringify({ kind: 'variety', id: 'X1' }));
      for (const type of ['dragenter', 'dragover', 'drop']) session.host.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX, clientY, dataTransfer: transfer }));
      return { revision: api.state.snapshot.revision, normalized };
    })()`);
    await delay(320);
    const droppedGeometry = await sceneGeometry(client);
    closeTo(droppedGeometry.layout['variety:X1'].x, dropResult.normalized.x, 1.5 / (droppedGeometry.scale * droppedGeometry.canonical.width), 'Assets drop inverse-transform x');
    closeTo(droppedGeometry.layout['variety:X1'].y, dropResult.normalized.y, 1.5 / (droppedGeometry.scale * droppedGeometry.canonical.height), 'Assets drop inverse-transform y');
    assert.strictEqual(droppedGeometry.revision, dropResult.revision, 'pure View drop must not increment Asset revision');
    assertSceneUsesCanonicalTransform(droppedGeometry, 'split view after Assets drop');
    const splitDrag = await dragLabel(client, 'map', 100, 20);
    assert.strictEqual(splitDrag.pressed.probe, 'stable', 'focusing the Sheaf Complex split pane must not replace the captured map label');
    assert(splitDrag.pressed.className.includes('is-dragging'), 'split-view map pointerdown must start the intended label drag');
    assert(Math.hypot(splitDrag.during.x - splitDrag.before.x, splitDrag.during.y - splitDrag.before.y) > 10, `split-view map label must follow the pointer before pointerup: ${JSON.stringify(splitDrag)}`);

    const errors = await evaluate(client, `window.__mathWorkspaceDragErrors || []`);
    assert.deepStrictEqual(errors, []);
    console.log('math_workspace_drag_regression_test: real CDP pointer drag path passed');
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
