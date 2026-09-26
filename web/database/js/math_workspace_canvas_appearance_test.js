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
  await delay(100);
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
      create('sheaf', '\\\\mathcal{E}', { base: 'variety:X1' });
      create('map', 'f', { domain: 'variety:X1', codomain: 'variety:X2' });
      const picker = document.querySelector('#workspace-open-canvas');
      picker.value = 'sheaf-complexes';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
      window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.shadow.querySelector('[data-workspace-collect-assets]').click();
    })()`);
    await waitFor(() => evaluate(client, `!!window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes')?.editor?.inspectorShadow?.querySelector('#canvas-appearance-card')`), 10000, 'Canvas Appearance Card');

    const initial = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      const session = api.sessions.get('sheaf-complexes');
      const root = session.editor.inspectorShadow;
      const card = root.querySelector('#canvas-appearance-card');
      const input = root.querySelector('#input-card');
      const entry = session.editor.listCards().find((item) => item.key === 'canvas-appearance-card');
      return {
        registered: !!entry,
        visible: entry?.visible,
        inputHasCurve: !!input?.querySelector('#map-curve-row,#map-label-offset-row,[data-workspace-canvas-appearance-control]'),
        empty: !card.querySelector('[data-canvas-appearance-empty]')?.hidden,
        title: card.querySelector('.card-head')?.getAttribute('aria-label'),
        shell: {
          drag: !!card.querySelector('.drag-handle'), pin: !!card.querySelector('.card-pin-btn'),
          up: !!card.querySelector('[data-workspace-card-action="move-up"]'),
          down: !!card.querySelector('[data-workspace-card-action="move-down"]'),
          hide: !!card.querySelector('[data-workspace-card-action="hide"]')
        }
      };
    })()`);
    assert.strictEqual(initial.registered, true, 'Canvas Appearance must be registered in the native Card dock');
    assert.strictEqual(initial.visible, true, 'a new Sheaf Complex session must show Canvas Appearance by default');
    assert.strictEqual(initial.inputHasCurve, false, 'Input Card must not retain Curve/Label controls');
    assert.strictEqual(initial.empty, true, 'unbound Canvas Appearance must show a compact empty state');
    assert.strictEqual(initial.title, 'Sheaf Complex · Canvas Appearance');
    assert.deepStrictEqual(initial.shell, { drag: true, pin: true, up: true, down: true, hide: true });

    await clickCanvasObject(client, 'variety');
    const varietyState = await evaluate(client, `(() => {
      const card = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.inspectorShadow.querySelector('#canvas-appearance-card');
      return { title: card.querySelector('.card-head').getAttribute('aria-label'), empty: !card.querySelector('[data-canvas-appearance-empty]').hidden, mapHidden: card.querySelector('[data-canvas-appearance-map]').hidden };
    })()`);
    assert.deepStrictEqual(varietyState, { title: 'X · Canvas Appearance', empty: true, mapHidden: true });
    await clickCanvasObject(client, 'sheaf');
    const sheafState = await evaluate(client, `(() => {
      const card = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes').editor.inspectorShadow.querySelector('#canvas-appearance-card');
      return { title: card.querySelector('.card-head').getAttribute('aria-label'), empty: !card.querySelector('[data-canvas-appearance-empty]').hidden, mathRendered: !!card.querySelector('.card-head-label mjx-container') };
    })()`);
    assert.strictEqual(sheafState.title, 'E · Canvas Appearance');
    assert.strictEqual(sheafState.empty, true);
    assert.strictEqual(sheafState.mathRendered, true, 'LaTeX object names must use the existing MathJax title path');
    await clickCanvasObject(client, 'map');

    const selected = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      const session = api.sessions.get('sheaf-complexes');
      const root = session.editor.inspectorShadow;
      const card = root.querySelector('#canvas-appearance-card');
      const revision = api.state.snapshot.revision;
      const refreshes = api.assetsCardState.outerRefreshCount;
      const autosaves = [...api.assetsCardState.instances.values()].filter((item) => item.cardType === 'input').map((item) => item.taskGeneration);
      const recomputeJobId = session.editor.captureCanvasAppearance().recomputeJobId;
      const recomputeSteps = [recomputeJobId];
      const pointCount = card.querySelector('[data-canvas-appearance-point-count]');
      pointCount.value = pointCount.value === '1' ? '2' : '1';
      pointCount.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      recomputeSteps.push(session.editor.captureCanvasAppearance().recomputeJobId);
      const range = card.querySelector('[data-canvas-appearance-label-offset]');
      const before = Number(range.value);
      range.value = String(Math.min(Number(range.max), before + 7));
      range.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      recomputeSteps.push(session.editor.captureCanvasAppearance().recomputeJobId);
      const layout = Object.fromEntries(session.editor.captureAssetLayout().map((item) => [item.key, item.point]));
      return {
        title: card.querySelector('.card-head').getAttribute('aria-label'),
        mapControlsVisible: !card.querySelector('[data-canvas-appearance-map]').hidden,
        value: Number(range.value), layoutOffset: layout['map:M4'].y,
        revision, revisionAfter: api.state.snapshot.revision,
        refreshes, refreshesAfter: api.assetsCardState.outerRefreshCount,
        autosaves, autosavesAfter: [...api.assetsCardState.instances.values()].filter((item) => item.cardType === 'input').map((item) => item.taskGeneration)
        ,recomputeJobId, recomputeJobIdAfter: session.editor.captureCanvasAppearance().recomputeJobId, recomputeSteps
      };
    })()`);
    assert.strictEqual(selected.title, 'f · Canvas Appearance');
    assert.strictEqual(selected.mapControlsVisible, true);
    assert.strictEqual(selected.layoutOffset, selected.value, 'Card input must update canonical session layout immediately');
    assert.strictEqual(selected.revisionAfter, selected.revision, 'appearance must not increment Asset revision');
    assert.strictEqual(selected.refreshesAfter, selected.refreshes, 'appearance must not refresh Property Slots');
    assert.deepStrictEqual(selected.autosavesAfter, selected.autosaves, 'appearance must not schedule Input autosave');
    assert.strictEqual(selected.recomputeJobIdAfter, selected.recomputeJobId, `appearance controls must not run derived recomputation: ${selected.recomputeSteps.join(' -> ')}`);

    const explorerIndependent = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      api.selectAssetKey('variety:X1');
      return api.sessions.get('sheaf-complexes').editor.inspectorShadow.querySelector('#canvas-appearance-card .card-head').getAttribute('aria-label');
    })()`);
    assert.strictEqual(explorerIndependent, 'f · Canvas Appearance', 'Assets Explorer selection must not retarget Canvas Appearance');

    const beforeDrag = await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const label = session.editor.shadow.querySelector('[data-object-kind="map"][data-object-id]');
      label.dataset.appearanceProbe = 'stable';
      const rect = label.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await mouse(client, 'mouseMoved', beforeDrag.x, beforeDrag.y, 0);
    await mouse(client, 'mousePressed', beforeDrag.x, beforeDrag.y, 1);
    await mouse(client, 'mouseMoved', beforeDrag.x + 40, beforeDrag.y + 28, 1);
    await delay(20);
    const duringDrag = await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const label = session.editor.shadow.querySelector('[data-object-kind="map"][data-object-id]');
      const card = session.editor.inspectorShadow.querySelector('#canvas-appearance-card');
      const layout = Object.fromEntries(session.editor.captureAssetLayout().map((item) => [item.key, item.point]));
      return {
        stable: label.dataset.appearanceProbe,
        dragging: label.classList.contains('is-dragging'),
        cardOffset: Number(card.querySelector('[data-canvas-appearance-label-offset]').value),
        layoutOffset: layout['map:M4'].y
      };
    })()`);
    assert.strictEqual(duringDrag.stable, 'stable', 'drag must not replace the captured label node');
    assert.strictEqual(duringDrag.dragging, true, 'pointer capture drag must remain active');
    assert.strictEqual(duringDrag.cardOffset, duringDrag.layoutOffset, 'canvas drag must update the Card before pointerup');
    await mouse(client, 'mouseReleased', beforeDrag.x + 40, beforeDrag.y + 28, 0);

    const isolation = await evaluate(client, `(() => {
      const api = window.MathWorkspaceAssetsTest;
      const first = api.sessions.get('sheaf-complexes');
      const host = document.createElement('section');
      const inspectorHost = document.createElement('section');
      document.body.append(host, inspectorHost);
      const second = window.MathWorkspaceNativeEditors.factories.complex.mount(host, { id: 'appearance-isolation', inspectorHost });
      const snapshot = { ...api.state.snapshot, assets: api.state.snapshot.assets.map((asset) => ({ ...asset, viewPosition: first.assetProjection.layout.get(asset.kind + ':' + asset.id) || null })) };
      second.applyAssets(snapshot, { kind: 'map', id: 'M4' }, null);
      second.setCanvasAppearanceTarget({ kind: 'map', id: 'M4' }, { source: 'canvas-test' });
      const control = second.inspectorShadow.querySelector('[data-canvas-appearance-label-offset]');
      control.value = '19';
      control.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      const firstLayout = Object.fromEntries(first.editor.captureAssetLayout().map((item) => [item.key, item.point]));
      const secondLayout = Object.fromEntries(second.captureAssetLayout().map((item) => [item.key, item.point]));
      const result = { first: firstLayout['map:M4'].y, second: secondLayout['map:M4'].y };
      second.dispose(); inspectorHost.remove();
      return result;
    })()`);
    assert.notStrictEqual(isolation.first, isolation.second, 'two native Sheaf sessions must own independent appearance state');

    const chrome = await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const root = session.editor.inspectorShadow;
      const card = root.querySelector('#canvas-appearance-card');
      const orderBefore = [...card.parentElement.children].indexOf(card);
      card.querySelector('.card-pin-btn').click();
      card.querySelector('.card-head-label').click();
      session.editor.setCardPresentation('canvas-appearance-card', { displayMode: 'wide' });
      const move = [...card.querySelectorAll('[data-workspace-card-action="move-up"],[data-workspace-card-action="move-down"]')].find((button) => !button.disabled);
      move?.click();
      const orderAfter = [...card.parentElement.children].indexOf(card);
      const layout = Object.fromEntries(session.editor.captureAssetLayout().map((item) => [item.key, item.point]));
      card.querySelector('[data-workspace-card-action="hide"]').click();
      return {
        orderBefore, orderAfter, moved: !!move,
        hidden: !session.editor.listCards().find((item) => item.key === 'canvas-appearance-card').visible,
        collapsed: card.classList.contains('collapsed'), pinned: card.classList.contains('is-pinned'),
        wide: card.dataset.cardWideState, target: session.editor.captureCanvasAppearance().targetKey,
        layout
      };
    })()`);
    assert.strictEqual(chrome.hidden, true, 'hide control must update this session Card visibility');
    assert.strictEqual(chrome.collapsed, true, 'collapse must be retained by the Card shell');
    assert.strictEqual(chrome.pinned, true, 'pin must be retained by the Card shell');
    assert.strictEqual(chrome.wide, 'wide', 'wide presentation must be retained by the Card shell');
    if (chrome.moved) assert.notStrictEqual(chrome.orderAfter, chrome.orderBefore, 'move control must reorder the Card');

    await evaluate(client, `(() => {
      const tab = document.querySelector('[data-canvas-tab="sheaf-complexes"]');
      tab.closest('.workspace-canvas-tab-group').querySelector('.workspace-canvas-tab-close').click();
      const picker = document.querySelector('#workspace-open-canvas');
      picker.value = 'sheaf-complexes';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await delay(160);
    const reopened = await evaluate(client, `(() => {
      const session = window.MathWorkspaceAssetsTest.sessions.get('sheaf-complexes');
      const card = session.editor.inspectorShadow.querySelector('#canvas-appearance-card');
      const layout = Object.fromEntries(session.editor.captureAssetLayout().map((item) => [item.key, item.point]));
      const value = {
        hidden: !session.editor.listCards().find((item) => item.key === 'canvas-appearance-card').visible,
        collapsed: card.classList.contains('collapsed'), pinned: card.classList.contains('is-pinned'),
        wide: card.dataset.cardWideState, target: session.editor.captureCanvasAppearance().targetKey,
        layout
      };
      session.editor.setCardVisible('canvas-appearance-card', true);
      return value;
    })()`);
    assert.strictEqual(reopened.hidden, true, 'close/reopen must retain Card visibility');
    assert.strictEqual(reopened.collapsed, chrome.collapsed);
    assert.strictEqual(reopened.pinned, chrome.pinned);
    assert.strictEqual(reopened.wide, chrome.wide);
    assert.strictEqual(reopened.target, chrome.target, 'close/reopen must retain stable canvas binding identity');
    assert.deepStrictEqual(reopened.layout, chrome.layout, 'close/reopen must retain canonical appearance layout');

    console.log('math_workspace_canvas_appearance_test: real controller/runtime/Card path passed');
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
