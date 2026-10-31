'use strict';
// Audit only: serves the current files, exercises an isolated browser, and
// records evidence. It does not change calculator sources or production data.
const fs = require('node:fs');
const path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('../js/math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session;
    const read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    await waitFor(() => read(() => !!window.MathWorkspaceObjectPanels), 20000);
    await read(() => {
      window.api = MathWorkspaceAssetsTest; window.panels = MathWorkspaceObjectPanels; window.k = api.assetKey;
      window.get = ref => api.localAssetSnapshot().assets.find(a => k(a) === k(ref));
      window.P = api.createObjectAsset('variety', { name: 'P', type: 'projective', data: { dimension: '3' } });
      window.Q = api.createObjectAsset('variety', { name: 'Q', type: 'projective', data: { dimension: '2' } });
      window.E = api.createObjectAsset('sheaf', { name: 'E', type: 'locally-free', data: { base: k(P), rank: '2' } });
      window.F = api.createObjectAsset('sheaf', { name: 'F', type: 'locally-free', data: { base: k(P), rank: '3' } });
      window.G = api.createObjectAsset('sheaf', { name: 'G', type: 'locally-free', data: { base: k(P), rank: '4' } });
      window.T = api.createObjectAsset('sheaf', { name: 'T', type: 'locally-free', data: { base: k(Q), rank: '2' } });
      window.i = api.createObjectAsset('map', { name: 'i', data: { domain: k(Q), codomain: k(P) } });
      window.p = api.createObjectAsset('map', { name: 'h', data: { domain: k(P), codomain: k(Q) } });
      window.formEvidence = () => {
        const form = document.querySelector('[data-assets-editor]');
        return {
          fields: [...form.querySelectorAll('input,select,button')].filter(n => n.getClientRects().length).map(n => ({ tag: n.tagName, type: n.type, field: n.dataset.assetsField || n.dataset.assetsReference || '', label: n.getAttribute('aria-label') || n.closest('label')?.querySelector('.input-label')?.textContent || n.textContent?.trim().slice(0,60), value: n.value, checked: n.checked })),
          message: form.querySelector('[data-assets-editor-status]').textContent,
          savedType: get(api.activeAssetInputInstance().targetRef).type,
          draftType: api.activeAssetInputInstance().draft.type
        };
      };
      window.chooseReference = (field, ref) => {
        document.querySelector('[data-assets-reference="' + field + '"]').click();
        const choice = [...document.querySelectorAll('.workspace-reference-option')].find(n => n.dataset.assetKey === k(ref));
        if (!choice) throw new Error('Missing choice ' + field + ' ' + k(ref));
        choice.click();
      };
    });
    const result = { date: '2026-10-30', scope: 'Current working-tree Assets → Input; technical native projection probes are explicitly identified.' };
    result.geometricConfirmation = await read(() => {
      const cases = ['ideal-sheaf','normal-bundle','conormal-bundle','relative-tangent','relative-cotangent'];
      return cases.map((type, index) => {
        const a = api.createObjectAsset('sheaf', { name: 'N_{' + index + '}', data: { base: k(P) } });
        api.assetRequest('select-for-modify', { ref: a });
        const select = document.querySelector('[data-assets-subtype]'); select.value = type; select.dispatchEvent(new Event('change', { bubbles: true }));
        chooseReference('map', type.startsWith('relative-') ? p : i);
        document.querySelector('[data-assets-editor]').requestSubmit();
        return { type, ...formEvidence() };
      });
    });
    result.forms = await read(() => {
      window.probes = {};
      const specs = {
        divisor: { type: 'divisor-line', data: { base: k(P), divisorCoefficients: { hyperplane: '2' } } },
        cotangent: { type: 'cotangent', data: { base: k(P) } },
        tangent: { type: 'tangent', data: { base: k(P) } },
        advancedTensor: { type: 'tensor', data: { first: k(E), second: k(F), parents: [k(E), k(F), k(G)], exponents: ['1','1','1'] } },
        tensorPowered: { type: 'tensor', data: { first: k(E), second: k(F), parents: [k(E), k(F), k(G)], exponents: ['2','1','1'], exact: true } },
        hom: { type: 'internal-hom', data: { first: k(E), second: k(F) } },
        pullback: { type: 'map-operation', data: { map: k(i), parent: k(E), operation: 'pullback' } },
        pushforward: { type: 'map-operation', data: { map: k(i), parent: k(T), operation: 'pushforward' } },
        pushforwardCompact: { type: 'map-operation', data: { map: k(i), parent: k(T), operation: 'pushforward', proper: false, exact: false } },
        homOrdinary: { type: 'internal-hom', data: { first: k(E), second: k(F), exact: true } }
      };
      const evidence = Object.fromEntries(Object.entries(specs).map(([label, spec]) => {
        probes[label] = api.createObjectAsset('sheaf', { name: 'S_{' + label + '}', ...spec });
        api.assetRequest('select-for-modify', { ref: probes[label] });
        return [label, formEvidence()];
      }));
      probes.exteriorSchur = api.createObjectAsset('sheaf', { name: 'W', type: 'schur', data: { parent: k(probes.cotangent), partition: '1,1' } });
      api.assetRequest('select-for-modify', { ref: probes.exteriorSchur });
      evidence.exteriorSchur = formEvidence();
      return evidence;
    });
    result.publicLegacyInput = await read(() => {
      api.openCanvas('sheaf-complexes');
      document.querySelector('#workspace-add-card').click();
      const result = { catalogContainsLegacyInput: MathWorkspacePanelRegistry.panels.some(p => p.id === 'sheaf-input'),
        menuText: document.querySelector('#workspace-card-picker').textContent.replace(/\s+/g, ' ').trim() };
      document.querySelector('#workspace-add-card').click(); api.openCanvas('assets');
      return result;
    });
    await read(() => {
      api.assetRequest('select-for-modify', { ref: probes.divisor });
      const input = document.querySelector('[data-assets-name]'); input.focus(); input.select();
    });
    await client.send('Input.insertText', { text: 'D_{check}' });
    for (const type of ['keyDown', 'keyUp']) await client.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    result.divisorRoundtrip = await read(() => {
      document.querySelector('[data-assets-editor]').requestSubmit();
      api.assetRequest('select-for-modify', { ref: probes.divisor });
      return { data: get(probes.divisor).data, form: formEvidence() };
    });
    // Technical probe: the retained native Input is opened by test API, not
    // through the public catalog, to inspect the existing calculation engine.
    result.nativeProjectionBefore = await read(() => {
      window.auditPanel = panels.open('sheaf-input', k(probes.advancedTensor), 'main');
      window.nativePayload = ref => {
        auditPanel.computation.refs.asset = k(ref); panels.refresh();
        const graph = auditPanel.propertyRenderer.editor.objectIO('input-graph');
        const payload = graph.entries.find(e => e.assetKey === k(ref))?.data.workspaceSheafComplex.payload;
        return { message: auditPanel.message.textContent, rank: payload?.rank, construction: payload?.construction, divisorCoefficients: payload?.divisorCoefficients };
      };
      return Object.fromEntries(Object.entries(probes).map(([label, ref]) => [label, nativePayload(ref)]));
    });
    result.exteriorProperties = await read(() => Object.fromEntries(['characteristic-classes', 'sheaf-cohomology'].map(type => {
      api.bindAssetPropertySlot(type, probes.exteriorSchur, { focus: false, promote: false });
      const editor = api.assetsCardState.slots.get(type).rendererSession.editor;
      const root = editor.inspectorShadow;
      const report = editor.readObjectResult();
      const chart = root.querySelector(type === 'characteristic-classes' ? '#class-chart' : '#cohomology-chart');
      const message = root.querySelector(type === 'characteristic-classes' ? '#class-message' : '#cohomology-message');
      return [type, { resultKeys: Object.keys(report || {}), text: report?.text?.slice(0,1800), chart: chart?.textContent.slice(0,1800), message: message?.textContent }];
    })));
    result.legacyMarkedExterior = await read(() => {
      // Compatibility probe seeded with the metadata emitted by the historical
      // exterior-power constructor, not a claim that the public form exposes it.
      const legacy = api.createObjectAsset('sheaf', { name: 'U', type: 'schur', data: {
        parent: k(probes.cotangent), partition: '1,1', workspaceSheafComplex: { payload: {
          type: 'abstract', rank: '3', construction: { type: 'schur', sheafId: k(probes.cotangent), partition: [1,1],
            differentialWedge: true, differentialType: 'cotangent', wedgeDegree: 2 }
        } }
      } });
      api.bindAssetPropertySlot('sheaf-cohomology', legacy, { focus: false, promote: false });
      const root = api.assetsCardState.slots.get('sheaf-cohomology').rendererSession.editor.inspectorShadow;
      return { chart: root.querySelector('#cohomology-chart')?.textContent, message: root.querySelector('#cohomology-message')?.textContent };
    });
    result.tensorEdit = await read(() => {
      api.assetRequest('select-for-modify', { ref: probes.advancedTensor });
      chooseReference('first', G);
      document.querySelector('[data-assets-editor]').requestSubmit();
      const a = get(probes.advancedTensor);
      return { data: a.data, form: formEvidence(), native: nativePayload(a) };
    });
    result.naming = await read(() => {
      api.openCanvas('assets');
      const makePair = (type, data) => [0,1].map(() => api.createObjectAsset('variety', { type, data }).name);
      window.namingPairs = {
        ppav: makePair('ppav-moduli', { genus: '2' }),
        grassmannian: makePair('grassmannian', { r: '2', n: '4' }),
        projective: makePair('projective', { dimension: '4' }),
        symmetricProduct: makePair('symmetric-product-curve', { power: '3' })
      };
      const Y = api.createObjectAsset('variety', { name: 'Y_{1}', data: { dimension: '2' } });
      namingPairs.productEndingInSubscript = makePair('product', { first: k(Q), second: k(Y) });
      return namingPairs;
    });
    await waitFor(() => read(() => !!window.MathJax?.typesetPromise), 20000);
    result.namingRendering = await read(async () => {
      const content = document.querySelector('[data-assets-content]');
      await MathJax.typesetPromise([content]); await MathWorkspaceAssetIcons.typeset(content);
      return Object.fromEntries(Object.entries(namingPairs).map(([label, names]) => [label, names.map(name => {
        const asset = api.localAssetSnapshot().assets.find(a => a.name === name);
        const node = content.querySelector('[data-asset-key="' + k(asset) + '"] .workspace-asset-name');
        return { name, error: [...node.querySelectorAll('mjx-merror,[data-mjx-error]')].map(n => n.getAttribute('data-mjx-error') || n.textContent) };
      })]));
    });
    const filename = path.join(__dirname, 'math_workspace_batch2_audit_results.json');
    fs.writeFileSync(filename, JSON.stringify(result, null, 2) + '\n');
    console.log('Evidence: ' + filename);
    console.log(JSON.stringify({
      geometry: result.geometricConfirmation.map(({ type, savedType, message, fields }) => ({ type, savedType, message, checkboxes: fields.filter(f => f.type === 'checkbox').length })),
      forms: Object.fromEntries(Object.entries(result.forms).map(([k,v]) => [k,v.fields.map(f => f.label)])),
      tensor: { beforeRank: result.nativeProjectionBefore.advancedTensor.rank, afterRank: result.tensorEdit.native.rank, first: result.tensorEdit.data.first, parents: result.tensorEdit.data.parents },
      legacyInput: result.publicLegacyInput,
      naming: result.namingRendering
    }, null, 2));
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
