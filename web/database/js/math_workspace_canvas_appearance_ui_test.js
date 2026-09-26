const assert = require('assert');
const {
  delay, startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse
} = require('./math_workspace_drag_regression_test.js');

async function clickCanvasObject(client, kind) {
  const point = await evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const label = session.editor.shadow.querySelector('[data-object-kind="${kind}"][data-object-id]');
    if (!label) return null;
    const rect = label.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  assert(point, `missing ${kind} canvas object`);
  await mouse(client, 'mouseMoved', point.x, point.y, 0);
  await mouse(client, 'mousePressed', point.x, point.y, 1);
  await mouse(client, 'mouseReleased', point.x, point.y, 0);
  await delay(80);
}

async function inputTitle(client, key) {
  await evaluate(client, `(() => {
    const api = window.MathWorkspaceAssetsTest;
    const [kind, id] = ${JSON.stringify(key)}.split(':');
    api.bindAssetInputInstance({ kind, id });
  })()`);
  await waitFor(() => evaluate(client, `(() => {
    const label = document.querySelector('.workspace-assets-input-card .card-head-label');
    return !!label?.querySelector('mjx-container');
  })()`), 10000, `${key} Input MathJax title`);
  return evaluate(client, `(() => {
    const api = window.MathWorkspaceAssetsTest;
    const card = document.querySelector('.workspace-assets-input-card');
    const label = card.querySelector('.card-head-label');
    const math = label.querySelector('mjx-container');
    const record = api.state.snapshot.assets.find((asset) => asset.kind + ':' + asset.id === ${JSON.stringify(key)});
    return {
      raw: record.name,
      plain: record.plainName,
      aria: card.querySelector('.card-head').getAttribute('aria-label'),
      mathRendered: !!math,
      textTransform: math ? getComputedStyle(math).textTransform : '',
      glyphClasses: [...label.querySelectorAll('mjx-c')].map((node) => node.className)
    };
  })()`);
}

async function renameActive(client, name) {
  await evaluate(client, `(() => {
    const input = document.querySelector('[data-assets-name]');
    input.value = ${JSON.stringify(name)};
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: null }));
    document.querySelector('[data-assets-save]').click();
  })()`);
  await waitFor(() => evaluate(client, `window.MathWorkspaceAssetsTest.state.snapshot.assets.find((asset) => asset.kind === 'map')?.name === ${JSON.stringify(name)}`), 10000, `rename map to ${name}`);
  await waitFor(() => evaluate(client, `document.querySelector('.workspace-assets-input-card .card-head')?.getAttribute('aria-label') === (window.MathWorkspaceAssetsTest.state.snapshot.assets.find((asset) => asset.kind === 'map').plainName + ' · Input')`), 10000, `${name} Input title`);
  await delay(80);
}

function assertTitle(snapshot, raw, suffix) {
  assert.strictEqual(snapshot.raw, raw);
  assert.strictEqual(snapshot.aria, `${snapshot.plain} · ${suffix}`);
  assert.strictEqual(snapshot.mathRendered, true, `${raw} must render through MathJax`);
  assert.strictEqual(snapshot.textTransform, 'none', `${raw} MathJax output must preserve source case`);
}

function assertAligned(metrics, mode) {
  const close = (left, right, label) => assert(Math.abs(left - right) <= 1, `${mode}: ${label} must align (${left} vs ${right})`);
  assert.strictEqual(metrics.resetPresent, false, `${mode}: workspace Reset must not exist`);
  assert.strictEqual(metrics.resetTabbable, false, `${mode}: Reset must not be in keyboard order`);
  assert.strictEqual(metrics.resetListenerCount, 0, `${mode}: Reset must not register an event listener`);
  assert.strictEqual(metrics.overlap, false, `${mode}: Curve controls must not overlap`);
  assert.strictEqual(metrics.overflow, false, `${mode}: Curve rows must not overflow`);
  close(metrics.curve.label.left, metrics.offset.label.left, 'label column');
  close(metrics.curve.control.left, metrics.offset.control.left, 'control column');
  close(metrics.curve.input.left, metrics.offset.input.left, 'input column');
  close(metrics.curve.output.left, metrics.offset.output.left, 'unit/output column');
}

async function layoutMetrics(client, narrow = false) {
  return evaluate(client, `(() => {
    const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
    const card = session.editor.inspectorShadow.querySelector('#canvas-appearance-card');
    if (${narrow}) card.style.width = '270px'; else card.style.removeProperty('width');
    const rows = [...card.querySelectorAll('[data-canvas-appearance-map] .map-curve-row')];
    const rect = (node) => { const value = node.getBoundingClientRect(); return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width }; };
    const measure = (row) => ({
      row: rect(row), label: rect(row.querySelector('.input-label')),
      control: rect(row.querySelector('.map-curve-control > span')),
      descriptor: rect(row.querySelector('.map-curve-control > span')),
      input: rect(row.querySelector('input')),
      output: rect(row.querySelector('output')),
      scrollWidth: row.scrollWidth, clientWidth: row.clientWidth
    });
    const curve = measure(rows[0]), offset = measure(rows[1]);
    const controls = [curve.descriptor, curve.input, curve.output];
    const overlap = controls.some((left, index) => controls.slice(index + 1).some((right) => left.left < right.right - 0.5 && right.left < left.right - 0.5));
    return {
      resetPresent: !!card.querySelector('[data-canvas-appearance-reset],.map-curve-reset'),
      resetTabbable: [...card.querySelectorAll('button,input,select,textarea,[tabindex]')].some((node) => node.matches('[data-canvas-appearance-reset],.map-curve-reset') && !node.disabled && node.tabIndex >= 0),
      resetListenerCount: window.__canvasAppearanceResetListenerCount || 0,
      overlap,
      overflow: curve.scrollWidth > curve.clientWidth + 1 || offset.scrollWidth > offset.clientWidth + 1 || card.scrollWidth > card.clientWidth + 1,
      curve, offset
    };
  })()`);
}

async function main() {
  const server = await startServer();
  const url = `http://127.0.0.1:${server.address().port}/math_workspace.html`;
  let browser;
  let client;
  let profile;
  try {
    ({ browser, client, profile } = await launchBrowser(url));
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await waitFor(() => evaluate(client, `document.readyState === 'complete' && !!window.MathWorkspaceAssetsTest`), 20000, 'workspace initialization');
    await evaluate(client, `(() => {
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      window.__canvasAppearanceResetListenerCount = 0;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (this.matches?.('[data-canvas-appearance-reset],.map-curve-reset')) window.__canvasAppearanceResetListenerCount += 1;
        return originalAddEventListener.call(this, type, listener, options);
      };
      window.__restoreCanvasAppearanceListenerProbe = () => { EventTarget.prototype.addEventListener = originalAddEventListener; };
      const setSelect = (selector, value) => {
        const node = document.querySelector(selector);
        node.value = value;
        node.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const create = (kind, name, references = {}) => {
        setSelect('[data-assets-mode]', 'create');
        setSelect('[data-assets-kind]', kind);
        document.querySelector('[data-assets-name]').value = name;
        for (const [field, key] of Object.entries(references)) document.querySelector('[data-assets-reference="' + field + '"]').dataset.assetReferenceValue = key;
        document.querySelector('[data-assets-save]').click();
      };
      create('variety', 'X_1');
      create('variety', 'Y');
      create('sheaf', '\\\\mathcal{E}_{2}', { base: 'variety:X1' });
      create('map', 'f', { domain: 'variety:X1', codomain: 'variety:X2' });
      const picker = document.querySelector('#workspace-open-canvas');
      picker.value = 'sheaf-complexes';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
      window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('[data-workspace-collect-assets]').click();
      window.__restoreCanvasAppearanceListenerProbe();
    })()`);
    await waitFor(() => evaluate(client, `!!window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes')?.editor?.inspectorShadow?.querySelector('#canvas-appearance-card')`), 10000, 'Canvas Appearance Card');

    const initialRevision = await evaluate(client, `window.MathWorkspaceAssetsTest.state.snapshot.revision`);
    const fTitle = await inputTitle(client, 'map:M4');
    assertTitle(fTitle, 'f', 'Input');
    assert(fTitle.glyphClasses.some((name) => String(name).includes('1D453')), 'f must retain the lowercase MathJax glyph');

    await renameActive(client, 'F');
    const upperTitle = await inputTitle(client, 'map:M4');
    assertTitle(upperTitle, 'F', 'Input');
    assert(upperTitle.glyphClasses.some((name) => String(name).includes('1D439')), 'F must retain the uppercase MathJax glyph');

    await renameActive(client, '\\varphi');
    assertTitle(await inputTitle(client, 'map:M4'), '\\varphi', 'Input');
    assertTitle(await inputTitle(client, 'sheaf:E3'), '\\mathcal{E}_{2}', 'Input');
    assertTitle(await inputTitle(client, 'variety:X1'), 'X_1', 'Input');

    const renderInvariant = await evaluate(client, `(async () => {
      const api = window.MathWorkspaceAssetsTest;
      api.bindAssetInputInstance({ kind: 'map', id: 'M4' });
      const before = { name: api.state.snapshot.assets.find((asset) => asset.kind === 'map').name, revision: api.state.snapshot.revision };
      api.renderAssetsEditor();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const after = { name: api.state.snapshot.assets.find((asset) => asset.kind === 'map').name, revision: api.state.snapshot.revision };
      return { before, after };
    })()`);
    assert.deepStrictEqual(renderInvariant.after, renderInvariant.before, 'render/MathJax must not mutate Asset name or revision');
    assert(renderInvariant.after.revision > initialRevision, 'explicit rename commits should be the only revision changes in this test');

    await clickCanvasObject(client, 'map');
    const appearanceTitle = await evaluate(client, `(() => {
      const card = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.inspectorShadow.querySelector('#canvas-appearance-card');
      const math = card.querySelector('.card-head-label mjx-container');
      return { aria: card.querySelector('.card-head').getAttribute('aria-label'), textTransform: getComputedStyle(math).textTransform, rendered: !!math };
    })()`);
    assert.strictEqual(appearanceTitle.rendered, true);
    assert.strictEqual(appearanceTitle.textTransform, 'none', 'Canvas Appearance title must preserve case');
    assert.strictEqual(appearanceTitle.aria, 'varphi · Canvas Appearance');

    await evaluate(client, `window.MathWorkspaceAssetsTest.bindAssetPropertySlot('homology', { kind: 'map', id: 'M4' }, { selectTarget: false, focus: false, promote: false })`);
    await waitFor(() => evaluate(client, `!!window.MathWorkspaceAssetsTest.assetsCardState.slots.get('homology')?.rendererSession?.editor?.inspectorShadow?.querySelector('#homology-card .card-head-label mjx-container')`), 10000, 'Property MathJax title');
    const propertyTitle = await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.assetsCardState.slots.get('homology').rendererSession;
      const card = session.editor.inspectorShadow.querySelector('#homology-card');
      const math = card.querySelector('.card-head-label mjx-container');
      return { aria: card.querySelector('.card-head').getAttribute('aria-label'), textTransform: getComputedStyle(math).textTransform };
    })()`);
    assert.strictEqual(propertyTitle.textTransform, 'none', 'Property title must preserve case');
    assert.strictEqual(propertyTitle.aria, 'varphi · Homology Classes');

    assertAligned(await layoutMetrics(client), 'normal inspector');
    await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.setCardPresentation('canvas-appearance-card', { displayMode: 'wide' })`);
    await delay(80);
    assertAligned(await layoutMetrics(client), 'wide inspector');
    await evaluate(client, `window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.setCardPresentation('canvas-appearance-card', { displayMode: 'normal' })`);
    await evaluate(client, `document.querySelector('#workspace-split-view').click()`);
    await delay(180);
    assertAligned(await layoutMetrics(client), 'split view');
    assertAligned(await layoutMetrics(client, true), 'narrow inspector');

    console.log('math_workspace_canvas_appearance_ui_test: case-preserving titles and responsive Curve layout passed');
  } finally {
    if (client) client.close();
    await new Promise((resolve) => server.close(resolve));
    if (browser) await stopBrowser(browser, profile);
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
