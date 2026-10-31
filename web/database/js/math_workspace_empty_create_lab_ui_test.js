'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/math_workspace.html`);
    const { client } = session, read = (fn, ...args) => evaluate(client, `(${fn.toString()})(...${JSON.stringify(args)})`);
    await waitFor(() => read(() => !!window.MathWorkspaceAssetsTest), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest;
      api.openCanvas('assets'); api.state.showDefaults = false; api.applyAssetSnapshot(api.localAssetSnapshot());
    });
    assert.equal(await read(() => !!document.querySelector('#workspace-design-lab')), false);
    const approvedState = () => read(() => {
      const empty = document.querySelector('.workspace-assets-view [data-empty-create-variant]');
      return [empty.dataset.emptyCreateVariant, empty.dataset.emptyCreateRaised];
    });
    async function assertEmptyFits(placement) {
      const sizes = await read(() => [...document.querySelectorAll('.workspace-assets-view,.workspace-assets-view > [data-assets-content]')].map(node => ({
        className: node.className, height: node.clientHeight, scrollHeight: node.scrollHeight, width: node.clientWidth, scrollWidth: node.scrollWidth
      })));
      assert(sizes.every(size => size.scrollHeight <= size.height && size.scrollWidth <= size.width), `${placement}: empty Assets has no overflow: ${JSON.stringify(sizes)}`);
    }
    assert.deepEqual(await approvedState(), ['neutral', 'true'], 'approved default applies without Design Lab');
    await assertEmptyFits('normal page');
    assert(await read(() => {
      const empty = document.querySelector('.workspace-assets-view .workspace-assets-empty'), button = empty.querySelector('button');
      const style = getComputedStyle(button), area = empty.getBoundingClientRect(), body = empty.querySelector('.workspace-empty-create-body').getBoundingClientRect();
      return button.classList.contains('btn-ghost') && style.backgroundColor === 'rgba(0, 0, 0, 0)' && (body.top + body.height / 2 - area.top) / area.height < .48;
    }), 'default is a neutral ghost button above center');
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'D', code: 'KeyD', modifiers: type === 'keyDown' ? 11 : 0 });
    await waitFor(() => read(() => !!document.querySelector('[data-empty-create-use]')));
    await read(() => {
      const picker = document.querySelector('[data-design-picker]'); picker.value = 'empty-create-button'; picker.dispatchEvent(new Event('change'));
    });
    const variants = ['outline', 'neutral', 'inline', 'dashed', 'round', 'none', 'current'];
    async function assertReachable(selector, placement) {
      // Move only scrollbars a user can operate. scrollIntoView() can also
      // scroll overflow:hidden ancestors, masking the original clipping bug.
      await read(selector => {
        const target = document.querySelector(selector);
        for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) {
            parent.scrollTop += target.getBoundingClientRect().bottom - parent.getBoundingClientRect().bottom + 16;
          }
        }
        window.scrollBy(0, target.getBoundingClientRect().top - innerHeight / 2);
      }, selector);
      assert(await read(selector => {
        const target = document.querySelector(selector), rect = target.getBoundingClientRect();
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === target;
      }, selector), `${placement}: ${selector} is reachable through visible scrollbars`);
    }
    await assertReachable('[data-empty-create-use="current"]', 'sidebar');
    await assertReachable('[data-design-reset="empty-create-button"]', 'sidebar');
    await assertReachable('[data-design-exit]', 'sidebar');
    assert.deepEqual(await read(() => [...document.querySelectorAll('[data-empty-create-use]')].map(node => node.dataset.emptyCreateUse)), variants);
    assert.deepEqual(await approvedState(), ['neutral', 'true'], 'mount preserves the approved default');
    assert.equal(await read(() => document.querySelector('[data-empty-create-use="neutral"]').getAttribute('aria-pressed')), 'true');
    const choose = id => read(id => document.querySelector(`[data-empty-create-use="${id}"]`).click(), id);
    for (const id of variants) {
      await choose(id);
      assert.equal(await read(() => document.querySelector('.workspace-assets-view .workspace-assets-empty').dataset.emptyCreateVariant), id);
      assert.equal(await read(id => document.querySelector(`[data-empty-create-use="${id}"]`).getAttribute('aria-pressed'), id), 'true');
      await assertEmptyFits(id);
      await read(() => document.querySelector('.workspace-assets-view .workspace-assets-create').click());
      assert(await read(() => document.querySelector('#workspace-create-dialog').open), `${id} retains the create action`);
      await read(() => document.querySelector('#workspace-create-dialog').close());
    }
    await choose('outline');
    await read(() => document.querySelector('[data-empty-create-position]').click());
    const center = await read(() => document.querySelector('.workspace-assets-view .workspace-empty-create-body').getBoundingClientRect().top);
    await read(() => document.querySelector('[data-empty-create-position]').click());
    assert(await read(top => document.querySelector('.workspace-assets-view .workspace-empty-create-body').getBoundingClientRect().top < top - 20, center));
    await read(() => {
      const picker = document.querySelector('[data-design-picker]'); picker.value = 'favorite-stars'; picker.dispatchEvent(new Event('change'));
      api.applyAssetSnapshot(api.localAssetSnapshot()); picker.value = 'empty-create-button'; picker.dispatchEvent(new Event('change'));
    });
    assert.equal(await read(() => document.querySelector('.workspace-assets-view [data-empty-create-raised]').dataset.emptyCreateRaised), 'true', 'settings survive renders and experiment switching');
    // Native keyboard activation and the focus outline also work on the text-only treatment.
    await choose('none');
    await read(() => document.querySelector('.workspace-assets-view .workspace-assets-create').focus());
    assert(await read(() => document.activeElement.matches('.workspace-assets-create')), 'original action receives keyboard focus');
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', text: type === 'keyDown' ? '\r' : '', windowsVirtualKeyCode: 13 });
    assert(await read(() => document.querySelector('#workspace-create-dialog').open));
    await read(() => document.querySelector('#workspace-create-dialog').close());
    await read(() => { const b = document.querySelector('.workspace-assets-view .workspace-assets-create'); b.focus(); });
    assert.deepEqual(await read(() => { const s = getComputedStyle(document.querySelector('.workspace-assets-view .workspace-assets-create')); return [s.outlineWidth, s.outlineStyle]; }), ['2px', 'solid']);
    const point = await read(() => { document.activeElement.blur(); const n = document.querySelector('.workspace-assets-view [data-assets-content]'); n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return { x: r.left + 25, y: r.top + 25 }; });
    for (const clickCount of [1, 2]) for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
    assert(await read(() => document.querySelector('#workspace-create-dialog').open), 'real background double-click opens creation');
    await read(() => document.querySelector('#workspace-create-dialog').close());
    // Real Assets context menu remains available.
    await read(() => document.querySelector('.workspace-assets-view [data-assets-content]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 160 })));
    assert(await read(() => [...document.querySelectorAll('#workspace-assets-context-menu button')].some(b => b.textContent === 'New…')));
    await read(() => document.querySelector('#workspace-assets-context-menu').hidden = true);
    await read(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.emptySettings = JSON.parse(text); } } });
      document.querySelector('[data-design-copy="empty-create-button"]').click();
    });
    await waitFor(() => read(() => !!window.emptySettings));
    assert.deepEqual(await read(() => emptySettings), { emptyCreateButton: { variant: 'none', aboveCenter: true } });
    // At 620px, place Design Lab in the second pane to exercise narrow Assets and samples.
    await client.send('Emulation.setDeviceMetricsOverride', { width: 620, height: 1000, deviceScaleFactor: 1, mobile: false });
    await read(() => { document.querySelector('#workspace-design-lab [data-workspace-card-action="move-area"]').click(); api.setSplitView(true); });
    assert.equal(await read(() => document.querySelector('#workspace-canvas-panes').dataset.split), 'true');
    await assertReachable('[data-empty-create-use="current"]', '620px split pane');
    await assertReachable('[data-design-reset="empty-create-button"]', '620px split pane');
    await assertReachable('[data-design-exit]', '620px split pane');
    for (const id of variants) {
      await choose(id);
      await assertEmptyFits(`${id} in 620px split pane`);
      assert(await read(() => [...document.querySelectorAll('.workspace-empty-create-preview,.workspace-assets-view [data-assets-content]')].every(n => n.scrollWidth <= n.clientWidth + 1)), `${id} fits narrow split panes`);
    }
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    assert(await read(() => matchMedia('(any-pointer: coarse)').matches));
    for (const id of variants.filter(id => id !== 'none')) {
      await choose(id);
      assert(await read(() => { const r = document.querySelector('.workspace-assets-view .workspace-assets-create').getBoundingClientRect(); return r.height >= 44 && r.width >= 44; }), `${id} has a 44px touch target`);
    }
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await read(() => api.setSplitView(false));
    await assertReachable('[data-empty-create-use="current"]', 'single main pane');
    await assertReachable('[data-design-reset="empty-create-button"]', 'single main pane');
    await assertReachable('[data-design-exit]', 'single main pane');
    await read(() => document.querySelector('#workspace-canvas-resizer').focus());
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
    assert(await read(() => getComputedStyle(document.querySelector('.workspace-empty-create-options')).gridTemplateColumns.split(' ').length >= 2), 'wide Design Lab shows samples side by side');
    await read(() => document.querySelector('#workspace-design-lab').scrollIntoView({ block: 'start' }));
    fs.writeFileSync(path.join(os.tmpdir(), 'math-workspace-empty-create-lab.png'), Buffer.from((await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'));
    await read(() => document.querySelector('[data-design-reset="empty-create-button"]').click());
    assert.deepEqual(await approvedState(), ['neutral', 'true'], 'Reset restores the approved default');
    assert.equal(await read(() => document.querySelector('[data-empty-create-position]').checked), true);
    await choose('dashed');
    await read(() => { window.asset = api.createObjectAsset('young', { name: 'EmptyLabTest' }); });
    assert.equal(await read(() => document.querySelector('.workspace-assets-view [data-empty-create-variant]')), null, 'populated layouts are untouched');
    await read(() => document.querySelector('[data-empty-create-option="round"] .workspace-assets-create').click());
    assert(await read(() => document.querySelector('#workspace-create-dialog').open), 'preview works even when real Assets is populated');
    await read(() => { document.querySelector('#workspace-create-dialog').close(); document.querySelector('[data-design-exit]').click(); api.applyAssetSnapshot({ ...api.localAssetSnapshot(), assets: [] }); });
    assert.deepEqual(await approvedState(), ['neutral', 'true'], 'exit restores the approved default');
    console.log('PASS empty-create-button: seven previews, keyboard/double-click, context menu, narrow split, touch targets, settings, reset and exit');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
if (require.main === module) run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
