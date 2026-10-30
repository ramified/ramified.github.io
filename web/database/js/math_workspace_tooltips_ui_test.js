'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse} = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const {client} = session, errors = [];
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await client.send('Runtime.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels;
      window.young = api.createObjectAsset('young', {name:'lambda', data:{rows:[2,1]}});
      window.symmetric = panels.open('symmetric', 'young:' + young.id, 'side');
      window.editor = symmetric.propertyRenderer.editor;
      window.root = editor.inspectorShadow;
      window.beforeHints = JSON.stringify(api.localAssetSnapshot().assets);
    });
    const hover = async selector => {
      const point = await read(async selector => {
        const node = root.querySelector(selector); node.scrollIntoView({block:'center'});
        await new Promise(requestAnimationFrame);
        const rect = node.getBoundingClientRect();
        return {x:rect.left + Math.min(3, rect.width / 2), y:rect.top + rect.height / 2};
      }, selector);
      await mouse(client, 'mouseMoved', point.x, point.y, 0);
      await waitFor(() => read(() => !!root.querySelector('.custom-tooltip:popover-open')));
      return read(() => root.querySelector('.custom-tooltip:popover-open').textContent);
    };
    assert.match(await hover('[for="symfun-variable-count"]'), /N is the number of variables/);
    assert(await read(() => {
      const tip = root.querySelector('.custom-tooltip:popover-open'), rect = tip.getBoundingClientRect();
      return rect.width > 0 && rect.left >= 9 && rect.right <= innerWidth - 9 && rect.top >= 9 && rect.bottom <= innerHeight - 9;
    }), 'top-layer hint fits the viewport outside pane clipping');
    await waitFor(() => read(() => getComputedStyle(root.querySelector('.custom-tooltip:popover-open')).opacity === '1'));
    const screenshot = path.join(os.tmpdir(), 'math-workspace-tooltip-preview.png');
    fs.writeFileSync(screenshot, Buffer.from((await client.send('Page.captureScreenshot', {format:'png'})).data, 'base64'));
    assert.match(await hover('.symfun-infinite-toggle'), /infinitely many variables/, 'moving between labels inside one shadow root updates the hint');
    assert.match(await hover('.symfun-symbol'), /Monomial symmetric function/, 'generated output labels work without registering each label');
    assert.match(await hover('.symfun-symbol sub'), /Monomial symmetric function/, 'moving onto a nested symbol preserves the hint');
    await read(() => root.querySelector('.symfun-symbol').remove());
    await waitFor(() => read(() => !root.querySelector('.custom-tooltip:popover-open')), 5000, 'replaced output removes its stale hint');
    await mouse(client, 'mouseMoved', 5, 5, 0);
    await waitFor(() => read(() => !root.querySelector('.custom-tooltip:popover-open')));
    await read(() => {
      const label = root.querySelector('[for="symfun-variable-count"]');
      label.setAttribute('aria-describedby', 'existing-description'); label.focus();
    });
    assert(await read(() => {
      const tip = root.querySelector('.custom-tooltip:popover-open'), label = root.activeElement;
      return tip?.textContent.includes('N is the number') && label.getAttribute('aria-describedby') === 'existing-description ' + tip.id;
    }), 'keyboard focus exposes a description in the same shadow root');
    await client.send('Input.dispatchKeyEvent', {type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
    await client.send('Input.dispatchKeyEvent', {type:'keyUp', key:'Escape', code:'Escape', windowsVirtualKeyCode:27});
    assert.equal(await read(() => !!root.querySelector('.custom-tooltip:popover-open')), false);
    assert.equal(await read(() => root.querySelector('[for="symfun-variable-count"]').getAttribute('aria-describedby')), 'existing-description');
    assert.equal(await read(() => JSON.stringify(api.localAssetSnapshot().assets)), await read(() => beforeHints), 'hints do not edit mathematical assets');

    // A second calculator engine uses the same mechanism, rather than an N-only fix.
    await read(() => {
      window.polynomials = panels.open('polynomials', '', 'side', {refs:{lambda:'young:' + young.id, mu:'young:' + young.id}});
      window.root = polynomials.propertyRenderer.editor.inspectorShadow;
    });
    assert.match(await hover('[for="sympoly-variable-count"]'), /N is the number of variables/);
    assert.match(await hover('.symfun-infinite-toggle'), /infinitely many variables/);
    await read(() => {
      window.weight = panels.open('weight', 'young:' + young.id, 'side');
      window.root = weight.propertyRenderer.editor.inspectorShadow;
    });
    assert.match(await hover('#lie-weight-label'), /row vector|Matrix-coordinate weight/);
    assert.match(await hover('#lie-dynkin-label'), /Dynkin labels/);

    // Independently docked cards get fresh event surfaces while retaining nodes.
    await read(() => {
      window.detachedHost = document.createElement('section');
      detachedHost.style.cssText = 'position:fixed;left:20px;top:20px;width:500px;height:500px;z-index:20000;background:white';
      document.body.append(detachedHost);
      const card = [...editor.inspectorShadow.querySelectorAll('.card')].find(node => node.querySelector('#symfun-variable-count'));
      editor.moveCardSurface(card.dataset.workspaceCardId, detachedHost); window.root = detachedHost.shadowRoot;
    });
    assert.match(await hover('[for="symfun-variable-count"]'), /N is the number of variables/);
    assert(await read(() => root.querySelector('.custom-tooltip:popover-open').getRootNode() === detachedHost.shadowRoot));
    await read(() => editor.dispose());
    assert.equal(await read(() => !!root.querySelector('.custom-tooltip:popover-open')), false, 'disposing an editor closes and removes its popup');
    assert.deepEqual(errors, []);
    console.log('PASS hints: real pointer moves, nested/dynamic labels, keyboard/Escape, clipping, symmetric functions/polynomials, weights, detached cards and cleanup');
    console.log('Screenshot: ' + screenshot);
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
