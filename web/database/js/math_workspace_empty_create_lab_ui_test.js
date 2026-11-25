'use strict';
// The empty-create Design Lab experiment is retired; its approved result
// (neutral ghost button, raised above center) is the live default. This test
// covers that live default only.
const assert = require('node:assert/strict');
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

    // The former Design Lab shortcut no longer mounts the retired preview.
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'D', code: 'KeyD', modifiers: type === 'keyDown' ? 11 : 0 });
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(await read(() => !!document.querySelector('[data-empty-create-use], [data-empty-create-option]')), false, 'retired empty-create previews stay unmounted');
    assert.deepEqual(await approvedState(), ['neutral', 'true'], 'shortcut leaves the approved default unchanged');

    // The live create action: click, keyboard, background double-click and context menu.
    await read(() => document.querySelector('.workspace-assets-view .workspace-assets-create').click());
    assert(await read(() => document.querySelector('#workspace-create-dialog').open), 'button opens creation');
    await read(() => document.querySelector('#workspace-create-dialog').close());
    await read(() => document.querySelector('.workspace-assets-view .workspace-assets-create').focus());
    assert(await read(() => document.activeElement.matches('.workspace-assets-create')), 'create action receives keyboard focus');
    assert.deepEqual(await read(() => { const s = getComputedStyle(document.activeElement); return [s.outlineWidth, s.outlineStyle]; }), ['2px', 'solid'], 'focus outline is visible');
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', text: type === 'keyDown' ? '\r' : '', windowsVirtualKeyCode: 13 });
    assert(await read(() => document.querySelector('#workspace-create-dialog').open), 'Enter opens creation');
    await read(() => document.querySelector('#workspace-create-dialog').close());
    const point = await read(() => { document.activeElement.blur(); const n = document.querySelector('.workspace-assets-view [data-assets-content]'); n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return { x: r.left + 25, y: r.top + 25 }; });
    for (const clickCount of [1, 2]) for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, ...point, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount });
    assert(await read(() => document.querySelector('#workspace-create-dialog').open), 'real background double-click opens creation');
    await read(() => document.querySelector('#workspace-create-dialog').close());
    await read(() => document.querySelector('.workspace-assets-view [data-assets-content]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 160 })));
    assert(await read(() => [...document.querySelectorAll('#workspace-assets-context-menu button')].some(b => b.textContent === 'New…')), 'context menu offers New…');
    await read(() => document.querySelector('#workspace-assets-context-menu').hidden = true);

    // Narrow split pane and touch targets for the live default.
    await client.send('Emulation.setDeviceMetricsOverride', { width: 620, height: 1000, deviceScaleFactor: 1, mobile: false });
    await read(() => api.setSplitView(true));
    await assertEmptyFits('620px split pane');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    assert(await read(() => matchMedia('(any-pointer: coarse)').matches));
    assert(await read(() => { const r = document.querySelector('.workspace-assets-view .workspace-assets-create').getBoundingClientRect(); return r.height >= 44 && r.width >= 44; }), 'default has a 44px touch target');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await read(() => api.setSplitView(false));

    await read(() => { window.asset = api.createObjectAsset('young', { name: 'EmptyLabTest' }); });
    assert.equal(await read(() => document.querySelector('.workspace-assets-view [data-empty-create-variant]')), null, 'populated layouts are untouched');
    console.log('PASS empty-create default: approved style, no Design Lab preview, click/keyboard/double-click, context menu, narrow split, touch target');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
if (require.main === module) run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
