const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'theorem_graph_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    refs,
    createGraph,
    makeArrow,
    makeNode,
    makeReference,
    buildGraphExport,
    normalizeGraphImport,
    detailCheckboxItems,
    checkboxItemsToText,
    layoutArrowSpringStrength,
    layoutArrowIdealDistance,
    collectArrowCitationKeys,
    collectNodeCitationKeys,
    parseCitationKeysFromText,
    replaceCitationKeysInText,
    referenceCitationAliases,
    referenceDeleteWarningMessage,
    referenceUsages,
    rewriteReferenceCitationsInGraph,
    setReferenceSelected,
    syncReferenceMasterCheckbox,
    syncGraphCitationKeys
  };
})();`);
  const sandbox = {
    console,
    URL,
    window: {
      addEventListener() {},
      setTimeout() {}
    },
    document: {
      addEventListener() {}
    }
  };
  return vm.runInNewContext(source, sandbox, { filename: 'theorem_graph_calculator.js' });
}

function hostArray(value) {
  return Array.from(value || []);
}

function testHiddenCitationKeysArePruned() {
  const api = loadCalculator();
  const graph = api.createGraph('Root');
  const node = api.makeNode({
    id: 'n1',
    label: 'Plain node',
    setting: 'No visible citation here.',
    citationKeys: ['FST2008']
  });
  graph.nodes = [node];

  api.syncGraphCitationKeys(graph);

  assert.deepStrictEqual(hostArray(node.citationKeys), []);
  assert.deepStrictEqual(hostArray(api.collectNodeCitationKeys(node)), []);
}

function testVisibleCitationKeysSurvive() {
  const api = loadCalculator();
  const graph = api.createGraph('Root');
  const node = api.makeNode({
    id: 'n1',
    label: 'Visible node',
    setting: 'Read \\cite{FST08}.',
    citationKeys: ['stale']
  });
  graph.nodes = [node];

  api.syncGraphCitationKeys(graph);

  assert.deepStrictEqual(hostArray(node.citationKeys), ['FST08']);
  assert.deepStrictEqual(hostArray(api.collectNodeCitationKeys(node)), ['FST08']);
}

function testReferenceRenameRewritesNestedNodesTitleAndArrows() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const owner = api.makeNode({
    id: 'owner',
    label: 'Owner',
    details: [{ id: 'cite', label: 'cite', type: 'textbox', text: 'Parent text \\cite{rawKey}.' }]
  });
  const child = api.createGraph('Child graph');
  child.titleNode.details = [{ id: 'source', label: 'source', type: 'textbox', text: 'Title source \\cite{oldKey}.' }];
  const nestedA = api.makeNode({
    id: 'a',
    label: 'Nested A',
    setting: 'See \\cite{oldKey, otherKey}.'
  });
  const nestedB = api.makeNode({
    id: 'b',
    label: 'Nested B',
    proofSketch: 'Compare \\cite[Section 2]{oldKey}.'
  });
  const arrow = api.makeArrow({
    id: 'arr',
    sourceId: 'a',
    targetId: 'b',
    label: 'uses \\cite[p. 3]{oldKey, extraKey}',
    remark: 'Remark cites \\cite{rawKey}.'
  });
  child.nodes = [nestedA, nestedB];
  child.arrows = [arrow];
  owner.childGraph = child;
  root.nodes = [owner];

  const changed = api.rewriteReferenceCitationsInGraph(root, ['oldKey', 'rawKey'], 'newKey');

  assert.strictEqual(changed, true);
  assert.strictEqual(owner.details[0].text, 'Parent text \\cite{newKey}.');
  assert.strictEqual(child.titleNode.details[0].text, 'Title source \\cite{newKey}.');
  assert.strictEqual(nestedA.setting, 'See \\cite{newKey, otherKey}.');
  assert.strictEqual(nestedB.proofSketch, 'Compare \\cite[Section 2]{newKey}.');
  assert.strictEqual(arrow.label, 'uses \\cite[p. 3]{newKey, extraKey}');
  assert.strictEqual(arrow.remark, 'Remark cites \\cite{newKey}.');
}

function testMultiKeyReplacementPreservesUnrelatedKeys() {
  const api = loadCalculator();
  const text = 'Use \\cite[p. 3]{oldKey, otherKey} and \\cite{keepKey}.';

  assert.strictEqual(
    api.replaceCitationKeysInText(text, ['oldKey'], 'newKey'),
    'Use \\cite[p. 3]{newKey, otherKey} and \\cite{keepKey}.'
  );
}

function testDeleteUsageReportIncludesNestedNodesAndArrows() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const owner = api.makeNode({ id: 'owner', label: 'Owner' });
  const child = api.createGraph('Child graph');
  const nestedA = api.makeNode({ id: 'a', label: 'Nested A', setting: 'Read \\cite{newKey}.' });
  const nestedB = api.makeNode({ id: 'b', label: 'Nested B' });
  const arrow = api.makeArrow({
    id: 'arr',
    sourceId: 'a',
    targetId: 'b',
    remark: 'Depends on \\cite{newKey}.'
  });
  child.nodes = [nestedA, nestedB];
  child.arrows = [arrow];
  owner.childGraph = child;
  root.nodes = [owner];
  api.state.rootGraph = root;

  const reference = api.makeReference({
    key: 'displayKey',
    citeKey: 'newKey',
    rawBibtex: '@article{rawKey, title={Example}}'
  });
  const usages = api.referenceUsages(reference);
  const labels = usages.map((usage) => usage.label);
  const warning = api.referenceDeleteWarningMessage([{ reference, usages }]);

  assert.ok(labels.includes('Child graph > Nested A'));
  assert.ok(labels.includes('Child graph > Arrow: Nested A -> Nested B'));
  assert.ok(warning.includes('[displayKey] \\cite{newKey}'));
  assert.ok(warning.includes('Child graph > Nested A'));
  assert.ok(warning.includes('Child graph > Arrow: Nested A -> Nested B'));
}

function testRawBibtexKeyIsRenameAlias() {
  const api = loadCalculator();
  const reference = api.makeReference({
    key: 'FST08',
    citeKey: 'FST08',
    rawBibtex: '@article{FST2008, title={Cluster complexes}}'
  });

  assert.deepStrictEqual(hostArray(api.referenceCitationAliases(reference)), ['FST08', 'FST2008']);
}

function testReferenceSelectionEnablesDeleteButton() {
  const api = loadCalculator();
  api.state.references = [api.makeReference({ key: 'ref1', citeKey: 'ref1' })];
  api.refs.referenceSelectAll = {
    checked: false,
    indeterminate: false,
    disabled: false
  };
  api.refs.deleteSelectedReferences = {
    disabled: true
  };

  api.setReferenceSelected('ref1', true);

  assert.strictEqual(api.refs.deleteSelectedReferences.disabled, false);
  assert.strictEqual(api.refs.referenceSelectAll.checked, true);

  api.setReferenceSelected('ref1', false);

  assert.strictEqual(api.refs.deleteSelectedReferences.disabled, true);
  assert.strictEqual(api.refs.referenceSelectAll.checked, false);
}

function testCheckboxQuestionStateRoundTrips() {
  const api = loadCalculator();
  const items = hostArray(api.detailCheckboxItems('- [ ] open\n- [x] done\n- [?] unclear\nloose item'))
    .map((item) => ({ state: item.state, checked: item.checked, text: item.text }));

  assert.deepStrictEqual(items, [
    { state: 'unchecked', checked: false, text: 'open' },
    { state: 'checked', checked: true, text: 'done' },
    { state: 'question', checked: false, text: 'unclear' },
    { state: 'unchecked', checked: false, text: 'loose item' }
  ]);
  assert.strictEqual(
    api.checkboxItemsToText(items),
    '- [ ] open\n- [x] done\n- [?] unclear\n- [ ] loose item'
  );
  assert.strictEqual(api.checkboxItemsToText([{ checked: true, text: 'legacy checked' }]), '- [x] legacy checked');
}

function testLayoutArrowSpringWeightsRespectBodyStyle() {
  const api = loadCalculator();
  const solid = api.layoutArrowSpringStrength({ body: 'solid' });
  const wavy = api.layoutArrowSpringStrength({ body: 'wavy' });
  const dashed = api.layoutArrowSpringStrength({ body: 'dashed' });
  const dotted = api.layoutArrowSpringStrength({ body: 'dotted' });
  const labeled = api.layoutArrowSpringStrength({ body: 'solid', label: 'uses' });
  const none = api.layoutArrowSpringStrength({ body: 'none' });

  assert.strictEqual(wavy, solid);
  assert.ok(dashed > 0 && dashed < solid);
  assert.ok(dotted > 0 && dotted < dashed);
  assert.strictEqual(labeled, solid * 0.45);
  assert.strictEqual(none, 0);
}

function testLayoutArrowIdealDistanceRespectsBodyAndLabel() {
  const api = loadCalculator();
  const solid = api.layoutArrowIdealDistance({ body: 'solid' });
  const dashed = api.layoutArrowIdealDistance({ body: 'dashed' });
  const dotted = api.layoutArrowIdealDistance({ body: 'dotted' });
  const labeled = api.layoutArrowIdealDistance({ body: 'solid', label: 'uses' });
  const labeledDotted = api.layoutArrowIdealDistance({ body: 'dotted', label: 'maybe' });

  assert.strictEqual(solid, 220);
  assert.strictEqual(dashed, 290);
  assert.strictEqual(dotted, 360);
  assert.strictEqual(labeled, 420);
  assert.strictEqual(labeledDotted, 560);

  api.state.layoutIdealDistance = 260;
  api.state.layoutDashedIdealBonus = 80;
  api.state.layoutDottedIdealBonus = 150;
  api.state.layoutLabelIdealBonus = 40;
  api.state.layoutSpringStrength = 8;
  api.state.layoutDashedSpringScale = 50;
  api.state.layoutDottedSpringScale = 10;
  api.state.layoutLabelSpringScale = 25;

  assert.strictEqual(api.layoutArrowIdealDistance({ body: 'dashed', label: 'uses' }), 380);
  assert.strictEqual(api.layoutArrowSpringStrength({ body: 'solid' }), 0.008);
  assert.strictEqual(api.layoutArrowSpringStrength({ body: 'dashed' }), 0.004);
  assert.strictEqual(api.layoutArrowSpringStrength({ body: 'dotted' }), 0.0008);
  assert.strictEqual(api.layoutArrowSpringStrength({ body: 'solid', label: 'uses' }), 0.002);
}

function testCanvasHeightIsExportedPerGraph() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const owner = api.makeNode({ id: 'owner', label: 'Owner' });
  const child = api.createGraph('Child graph');

  root.canvasHeight = 720;
  root.canvasRatioLocked = false;
  root.canvasAspectRatio = 1.4;
  child.canvasHeight = 420;
  child.canvasRatioLocked = true;
  child.canvasAspectRatio = 1.25;
  owner.childGraph = child;
  root.nodes = [owner];
  api.state.rootGraph = root;
  api.state.activePath = [];

  const exported = api.buildGraphExport(root, { includeTitleNode: true });
  const exportedChild = exported.nodes[0].childGraph;
  const imported = api.normalizeGraphImport(exported);

  assert.strictEqual(exported.view.canvasHeight, 720);
  assert.strictEqual(exportedChild.view.canvasHeight, 420);
  assert.strictEqual(exportedChild.view.canvasRatioLocked, true);
  assert.strictEqual(imported.canvasHeight, 720);
  assert.strictEqual(imported.nodes[0].childGraph.canvasHeight, 420);
  assert.strictEqual(imported.nodes[0].childGraph.canvasRatioLocked, true);
}

testHiddenCitationKeysArePruned();
testVisibleCitationKeysSurvive();
testReferenceRenameRewritesNestedNodesTitleAndArrows();
testMultiKeyReplacementPreservesUnrelatedKeys();
testDeleteUsageReportIncludesNestedNodesAndArrows();
testRawBibtexKeyIsRenameAlias();
testReferenceSelectionEnablesDeleteButton();
testCheckboxQuestionStateRoundTrips();
testLayoutArrowSpringWeightsRespectBodyStyle();
testLayoutArrowIdealDistanceRespectsBodyAndLabel();
testCanvasHeightIsExportedPerGraph();

console.log('theorem graph regression tests passed');
