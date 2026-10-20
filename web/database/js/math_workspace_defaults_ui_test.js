'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session, errors = [];
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await client.send('Runtime.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels;
      window.key = asset => asset.kind + ':' + asset.id;
      window.get = ref => api.localAssetSnapshot().assets.find(asset => key(asset) === ref);
    });
    const backgroundMenu = async () => {
      const point = await read(async () => {
        api.selectCanvasTab('assets');
        const view = document.querySelector('.workspace-assets-view');
        await new Promise(requestAnimationFrame);
        view.scrollIntoView({ block: 'start' });
        await new Promise(requestAnimationFrame);
        const rect = view.getBoundingClientRect();
        return { x: rect.left + 5, y: Math.max(10, rect.top + 5) };
      });
      for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, ...point, button: 'right', buttons: type === 'mousePressed' ? 2 : 0, clickCount: 1 });
      await waitFor(() => read(() => !document.querySelector('#workspace-assets-context-menu').hidden), 15000, 'background context menu at ' + JSON.stringify(point) + ' over ' + await read(p => document.elementFromPoint(p.x, p.y)?.outerHTML.slice(0, 400), point));
    };
    const toggleDefaults = async () => {
      await backgroundMenu();
      await read(() => document.querySelector('#workspace-assets-context-menu [role="menuitemcheckbox"]').click());
    };
    assert.equal(await read(() => api.localAssetSnapshot().assets.length), 0, 'an empty workspace loads no unused defaults');
    await backgroundMenu();
    assert.deepEqual(await read(() => [...document.querySelectorAll('#workspace-assets-context-menu > .workspace-assets-menu-cascade > button')].map(button => button.firstChild.textContent)), ['View', 'Sort by']);
    await read(() => {
      const menu = document.querySelector('#workspace-assets-context-menu');
      const button = [...menu.querySelectorAll('button')].find(button => button.textContent === 'New…');
      button.click();
    });
    await read(() => document.querySelector('[data-create-kind="dynkin"]').click());
    await waitFor(() => read(() => api.localAssetSnapshot().assets.some(asset => asset.kind === 'dynkin')));
    await read(() => { window.d = api.localAssetSnapshot().assets.find(asset => asset.kind === 'dynkin'); window.dv = panels.open('dynkin-view', key(d), 'main'); });
    assert.equal(await read(() => dv.computation.status), 'current');
    assert.deepEqual(await read(() => get(d.data.lie).data), { family: 'A', rank: 3 });
    assert.equal(await read(() => get(d.data.lie).isDefault), true);
    assert.deepEqual(await read(() => api.orderedAssets().map(asset => asset.kind)), ['dynkin']);
    await read(() => {
      window.w = api.createObjectAsset('strands'); window.wv = panels.open('strands-view', key(w), 'main');
      window.m = api.createObjectAsset('matrix'); window.mv = panels.open('matrix-invariants', key(m), 'side');
      window.e = api.createObjectAsset('sheaf'); window.map = api.createObjectAsset('map');
      window.f = api.createObjectAsset('functor'); window.fv = panels.open('category-diagram', key(f), 'side');
    });
    assert.equal(await read(() => w.data.lie), await read(() => d.data.lie), 'default Lie types are shared');
    assert.deepEqual(await read(() => [wv, mv, fv].map(panel => panel.computation.status)), ['current', 'current', 'current']);
    assert.equal(await read(() => get(m.data.field).isDefault), true);
    assert.equal(await read(() => get(e.data.base).isDefault), true);
    assert.equal(await read(() => map.data.domain), await read(() => e.data.base));
    assert.equal(await read(() => get(f.data.domain).isDefault), true);
    await read(() => {
      window.p = api.createObjectAsset('point', { data: { ambientDimension: 3, position: [1, 2, 3] } });
      window.pv = panels.open('geometry-view', key(p), 'main');
      window.pv2 = panels.open('geometry-view', key(p), 'side');
      window.r = api.createObjectAsset('roots'); window.rv = panels.open('geometry-view', key(r), 'side');
      window.weyl = api.createObjectAsset('weyl');
      window.v = api.createObjectAsset('voronoi', { data: { ambientDimension: 3 } });
      window.vv = panels.open('geometry-view', key(v), 'side');
      window.t = api.createObjectAsset('variety', { type: 'toric', data: { dimension: '3' } });
      window.tv = panels.open('geometry-view', key(t), 'side');
      window.derivedToric = api.createObjectAsset('variety', { type: 'toric', data: { fan: t.data.fan } });
      window.derivedView = panels.open('geometry-view', key(derivedToric), 'side');
      window.l = api.createObjectAsset('lattice', { data: { ambientDimension: 2, basisMode: 'matrix-object' } });
      window.y = api.createObjectAsset('young', { data: { partition: '2,1' } });
      window.weight = panels.open('weight', key(y), 'side');
    });
    assert.deepEqual(await read(() => [pv, pv2, rv, vv, tv, weight].map(panel => [panel.definition.id, panel.computation.status])), [
      ['geometry-view', 'current'], ['geometry-view', 'current'], ['geometry-view', 'current'], ['geometry-view', 'current'], ['geometry-view', 'current'], ['weight', 'current']
    ]);
    assert.equal(await read(() => pv.computation.refs.frame), await read(() => pv2.computation.refs.frame));
    assert.equal(await read(() => get(pv.computation.refs.frame).data.ambientDimension), 3);
    assert.equal(await read(() => get(rv.computation.refs.frame).data.ambientDimension), 4);
    assert.equal(await read(() => derivedView.computation.status), 'current', 'toric frames use the dimension of the referenced fan');
    assert.equal(await read(() => get(derivedView.computation.refs.frame).data.ambientDimension), 3);
    assert.equal(await read(() => get(r.data.lie).data.rank), 4);
    assert.equal(await read(() => weyl.data.lie), await read(() => r.data.lie));
    assert.equal(await read(() => get(l.data.matrix).data.rows), 2);
    assert.deepEqual(await read(() => MathWorkspaceSlicing.issues(l, api.localAssetSnapshot().assets)), []);
    const beforeInvalid = await read(() => api.localAssetSnapshot());
    assert.match(await read(() => { try { api.createObjectAsset('dynkin', { data: { vertices: [0, 7] } }); } catch (error) { return error.message; } }), /vertex/);
    assert.deepEqual(await read(() => api.localAssetSnapshot()), beforeInvalid, 'failed creation leaves no orphan defaults');
    await read(() => {
      window.explicit = api.createObjectAsset('dynkin', { data: { lie: '', vertices: [1] } });
      window.explicitView = panels.open('dynkin-view', key(explicit), 'side');
      window.emptyFrame = panels.open('geometry-view', key(p), 'side', { refs: { frame: '' } });
      window.custom = api.createObjectAsset('lie', { data: { family: 'B', rank: 3 } });
      window.customWord = api.createObjectAsset('strands', { data: { lie: key(custom) } });
    });
    assert.equal(await read(() => explicitView.computation.status), 'missing');
    assert.equal(await read(() => emptyFrame.computation.status), 'missing');
    assert.equal(await read(() => customWord.data.lie), await read(() => key(custom)));
    const hidden = await read(() => api.localAssetSnapshot().assets.filter(asset => asset.isDefault).length);
    await toggleDefaults();
    assert.equal(await read(() => document.querySelectorAll('[data-default-asset]').length), hidden);
    assert.equal(await read(() => api.state.showDefaults), true);
    await read(() => api.selectAssetKey(d.data.lie));
    await toggleDefaults();
    assert.equal(await read(() => api.state.selected.size), 0, 'hiding defaults removes hidden selections');
    assert.equal(await read(() => document.querySelectorAll('[data-default-asset]').length), 0);
    const count = await read(() => api.localAssetSnapshot().assets.length);
    await read(() => { window.backup = panels.exportText('workspace'); panels.importText('workspace', backup); });
    assert.equal(await read(() => api.localAssetSnapshot().assets.length), count, 'restore creates no new defaults');
    assert.equal(await read(() => panels.panels.get(emptyFrame.id).computation.refs.frame), '');
    assert.equal(await read(() => api.state.showDefaults), false);
    assert.equal(await read(() => api.localAssetSnapshot().assets.filter(asset => asset.isDefault).length), hidden);
    await toggleDefaults();
    await read(() => panels.importText('workspace', panels.exportText('workspace')));
    assert.equal(await read(() => api.state.showDefaults), true, 'the visibility preference is saved');
    assert.equal(await read(() => document.querySelectorAll('[data-default-asset]').length), hidden);
    assert.deepEqual(errors, []);
    console.log('math_workspace_defaults_ui_test: lazy dependencies, native results, dimension matching, reuse, context menu, explicit inputs, atomic creation and backups passed');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
