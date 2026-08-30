const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator(options = {}) {
  let source = fs.readFileSync(path.join(__dirname, 'theorem_graph_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    refs,
    createGraph,
    ensureNodeChildGraph,
    moveNodeBetweenGraphs,
    appendNodeToGraph,
    makeArrow,
    makeNode,
    makeReference,
    arrowDetailSnapshot,
    restoreArrowDetailSnapshot,
    buildGraphExport,
    buildCurrentNodeExport,
    buildSelectedReferencesExport,
    currentNodeExportJson,
    selectedReferencesExportJson,
    normalizeCurrentNodeImport,
    normalizeSelectedReferencesImport,
    importCurrentNodeIntoGraph,
    isSelectedReferencesExport,
    pushUndoSnapshot,
    performUndo,
    colorPaletteRenderPlan,
    normalizeGraphImport,
    nodeTypeRowsForType,
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
    referenceUsageLabels,
    rewriteReferenceCitationsInGraph,
    mergeReferencesByKey,
    setReferenceSelected,
    syncReferenceMasterCheckbox,
    syncGraphCitationKeys,
    parseImportText,
    validateSharedImport,
    syncSharedImportContext,
    applySharedImport,
    importRefreshesReferenceCollection,
    sharedImportExportAdapter: window.SiteImportExportPageAdapter
  };
})();`);
  const sandbox = {
    console,
    URL,
    window: {
      THEOREM_GRAPH_NODE_TYPE_ROWS: options.nodeTypeRows,
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
  assert.strictEqual(arrow.labels[0].text, 'uses \\cite[p. 3]{newKey, extraKey}');
  assert.strictEqual(arrow.remark, 'Remark cites \\cite{newKey}.');
}

function testLegacyArrowLabelMigratesAndExportsCompatibilityMirror() {
  const api = loadCalculator();
  const graph = api.createGraph('Legacy labels');
  graph.nodes = [
    api.makeNode({ id: 'a', label: 'A' }),
    api.makeNode({ id: 'b', label: 'B' })
  ];
  graph.arrows = [api.makeArrow({
    id: 'arr',
    sourceId: 'a',
    targetId: 'b',
    label: 'legacy label',
    labelPosition: 0.7,
    labelOffset: -25,
    labelAlign: 'right',
    color: '#2f5f9f'
  })];

  const arrow = graph.arrows[0];
  assert.strictEqual(arrow.labels.length, 1);
  assert.strictEqual(arrow.labels[0].id, 'label-1');
  assert.strictEqual(arrow.labels[0].text, 'legacy label');
  assert.strictEqual(arrow.labels[0].color, '#2f5f9f');
  assert.strictEqual(arrow.labels[0].position, 0.7);
  assert.strictEqual(arrow.labels[0].offset, -25);
  assert.strictEqual(arrow.labels[0].align, 'right');

  const exported = api.buildGraphExport(graph, { includeTitleNode: true }).arrows[0];
  assert.strictEqual(exported.labels[0].text, 'legacy label');
  assert.strictEqual(exported.label, 'legacy label');
  assert.strictEqual(exported.labelPosition, 0.7);
  assert.strictEqual(exported.labelOffset, -25);
  assert.strictEqual(exported.labelAlign, 'right');
  assert.strictEqual(exported.color, '#2f5f9f');
}

function testMultipleArrowLabelsAndTermsRoundTrip() {
  const api = loadCalculator();
  const graph = api.createGraph('Multiple labels');
  graph.nodes = [
    api.makeNode({ id: 'a', label: 'A' }),
    api.makeNode({ id: 'b', label: 'B' })
  ];
  graph.arrows = [api.makeArrow({
    id: 'arr',
    sourceId: 'a',
    targetId: 'b',
    color: '#5f574e',
    labels: [
      { id: 'primary', text: '$f$', color: '#1a1612', position: 0.3, offset: 15, align: 'left' },
      { id: 'secondary', text: '$g$', color: '#8b3a2a', position: 0.75, offset: -20, align: 'right' }
    ],
    terms: [
      { id: 'conditions', label: 'conditions', type: 'list', text: '- proper\n- smooth' },
      { id: 'checks', label: 'checks', type: 'checkbox', text: '- [ ] verify' }
    ]
  })];

  const exportedGraph = api.buildGraphExport(graph, { includeTitleNode: true });
  const imported = api.normalizeGraphImport(exportedGraph);
  const arrow = imported.arrows[0];

  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.id)), ['primary', 'secondary']);
  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.color)), ['#1a1612', '#8b3a2a']);
  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.position)), [0.3, 0.75]);
  assert.deepStrictEqual(hostArray(arrow.terms.map((term) => term.type)), ['list', 'checkbox']);
  assert.strictEqual(exportedGraph.arrows[0].label, '$f$');
  assert.strictEqual(exportedGraph.arrows[0].labels.length, 2);
  assert.strictEqual(exportedGraph.arrows[0].terms.length, 2);
}

function testArrowLabelDefaultsAndStableIds() {
  const api = loadCalculator();
  const arrow = api.makeArrow({
    labels: [
      { id: 'duplicate', text: 'one' },
      { id: 'duplicate', text: 'two', color: 'invalid' }
    ]
  });

  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.id)), ['duplicate', 'duplicate-2']);
  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.color)), ['#1a1612', '#1a1612']);
  assert.deepStrictEqual(hostArray(arrow.labels.map((label) => label.position)), [0.5, 0.5]);
}

function testArrowCitationsIncludeAllLabelsAndTerms() {
  const api = loadCalculator();
  const arrow = api.makeArrow({
    labels: [
      { id: 'one', text: 'Uses \\cite{labelRef}.' },
      { id: 'two', text: 'Compare \\cite{otherRef}.' }
    ],
    terms: [
      { id: 'sources', label: 'sources', type: 'textbox', text: 'See \\cite{termRef}.' }
    ],
    remark: 'Remark \\cite{remarkRef}.'
  });

  assert.deepStrictEqual(
    hostArray(api.collectArrowCitationKeys(arrow)),
    ['labelRef', 'otherRef', 'termRef', 'remarkRef']
  );
  assert.strictEqual(api.rewriteReferenceCitationsInGraph({
    title: 'Root',
    nodes: [],
    arrows: [arrow]
  }, ['labelRef', 'termRef'], 'nextRef'), true);
  assert.strictEqual(arrow.labels[0].text, 'Uses \\cite{nextRef}.');
  assert.strictEqual(arrow.terms[0].text, 'See \\cite{nextRef}.');
}

function testUndoRestoresArrowLabelsAndTerms() {
  const api = loadCalculator();
  const graph = api.createGraph('Undo arrow details');
  graph.nodes = [api.makeNode({ id: 'a' }), api.makeNode({ id: 'b' })];
  graph.arrows = [api.makeArrow({
    id: 'arr',
    sourceId: 'a',
    targetId: 'b',
    labels: [{ id: 'one', text: 'before', color: '#1a1612' }],
    terms: [{ id: 'term', label: 'term', type: 'textbox', text: 'before' }]
  })];
  api.state.rootGraph = graph;
  api.state.activePath = [];

  api.pushUndoSnapshot('arrow edit');
  graph.arrows[0].labels[0].text = 'after';
  graph.arrows[0].terms[0].text = 'after';
  api.performUndo({ render: false });

  assert.strictEqual(api.state.rootGraph.arrows[0].labels[0].text, 'before');
  assert.strictEqual(api.state.rootGraph.arrows[0].terms[0].text, 'before');
}

function testCancelSnapshotRestoresArrowLabelsAndTerms() {
  const api = loadCalculator();
  const arrow = api.makeArrow({
    labels: [{ id: 'one', text: 'before', color: '#2f5f9f', position: 0.25 }],
    terms: [{ id: 'term', label: 'term', type: 'enumeration', text: '1. before' }]
  });
  const snapshot = api.arrowDetailSnapshot(arrow);

  arrow.labels[0].text = 'after';
  arrow.labels[0].color = '#8b3a2a';
  arrow.terms[0].text = '1. after';
  api.restoreArrowDetailSnapshot(arrow, snapshot);

  assert.strictEqual(arrow.labels[0].text, 'before');
  assert.strictEqual(arrow.labels[0].color, '#2f5f9f');
  assert.strictEqual(arrow.labels[0].position, 0.25);
  assert.strictEqual(arrow.terms[0].type, 'enumeration');
  assert.strictEqual(arrow.terms[0].text, '1. before');
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
  const canonicalLabeled = api.layoutArrowSpringStrength({ body: 'solid', labels: [{ id: 'one', text: 'uses' }] });
  const none = api.layoutArrowSpringStrength({ body: 'none' });

  assert.strictEqual(wavy, solid);
  assert.ok(dashed > 0 && dashed < solid);
  assert.ok(dotted > 0 && dotted < dashed);
  assert.strictEqual(labeled, solid * 0.45);
  assert.strictEqual(canonicalLabeled, labeled);
  assert.strictEqual(none, 0);
}

function testLayoutArrowIdealDistanceRespectsBodyAndLabel() {
  const api = loadCalculator();
  const solid = api.layoutArrowIdealDistance({ body: 'solid' });
  const dashed = api.layoutArrowIdealDistance({ body: 'dashed' });
  const dotted = api.layoutArrowIdealDistance({ body: 'dotted' });
  const labeled = api.layoutArrowIdealDistance({ body: 'solid', label: 'uses' });
  const labeledDotted = api.layoutArrowIdealDistance({ body: 'dotted', label: 'maybe' });
  const canonicalLabeled = api.layoutArrowIdealDistance({ body: 'solid', labels: [{ id: 'one', text: 'uses' }] });

  assert.strictEqual(solid, 220);
  assert.strictEqual(dashed, 290);
  assert.strictEqual(dotted, 360);
  assert.strictEqual(labeled, 420);
  assert.strictEqual(labeledDotted, 560);
  assert.strictEqual(canonicalLabeled, labeled);

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

function testMoveNodeIntoNodePreservesChildGraphAndRemovesSourceArrows() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const moved = api.makeNode({ id: 'move', label: 'Move me' });
  const target = api.makeNode({ id: 'target', label: 'Target' });
  const other = api.makeNode({ id: 'other', label: 'Other' });
  moved.childGraph = api.createGraph('Moved child');
  root.nodes = [moved, target, other];
  root.arrows = [
    api.makeArrow({ id: 'touching', sourceId: 'move', targetId: 'other' }),
    api.makeArrow({ id: 'kept', sourceId: 'target', targetId: 'other' })
  ];

  const child = api.ensureNodeChildGraph(target);
  const result = api.moveNodeBetweenGraphs(root, 'move', child, { position: { x: 120, y: 140 } });

  assert.strictEqual(result.node, moved);
  assert.strictEqual(result.removedArrowCount, 1);
  assert.deepStrictEqual(root.nodes.map((node) => node.id), ['target', 'other']);
  assert.deepStrictEqual(root.arrows.map((arrow) => arrow.id), ['kept']);
  assert.strictEqual(child.nodes[0], moved);
  assert.ok(moved.childGraph);
  assert.strictEqual(moved.childGraph.title, 'Move me');
}

function testMoveNodeToAncestorGraphUniquifiesId() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const owner = api.makeNode({ id: 'owner', label: 'Owner' });
  const conflict = api.makeNode({ id: 'move', label: 'Existing Move' });
  const child = api.createGraph('Owner child');
  const moved = api.makeNode({ id: 'move', label: 'Moved from child' });
  child.nodes = [moved];
  owner.childGraph = child;
  root.nodes = [owner, conflict];

  const result = api.moveNodeBetweenGraphs(child, 'move', root, { position: { x: 240, y: 180 } });

  assert.strictEqual(child.nodes.length, 0);
  assert.notStrictEqual(result.node.id, 'move');
  assert.ok(root.nodes.some((node) => node.id === 'move'));
  assert.ok(root.nodes.some((node) => node.id === result.node.id));
  assert.strictEqual(result.node.label, 'Moved from child');
}

function testCurrentNodeExportIncludesNodeChildGraphAndReferences() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const node = api.makeNode({ id: 'n1', label: 'Portable node', setting: 'See \\cite{ref1}.' });
  node.childGraph = api.createGraph('Portable child');
  node.childGraph.nodes = [api.makeNode({ id: 'nested', label: 'Nested' })];
  root.nodes = [node];
  api.state.rootGraph = root;
  api.state.activePath = [];
  api.state.selectedNodeId = 'n1';
  api.state.references = [api.makeReference({ key: 'ref1', citeKey: 'ref1', title: 'Reference' })];

  const exported = api.buildCurrentNodeExport();

  assert.strictEqual(exported.exportKind, 'current-node');
  assert.strictEqual(exported.title, 'Portable node');
  assert.strictEqual(exported.node.id, 'n1');
  assert.ok(exported.node.childGraph);
  assert.strictEqual(exported.node.childGraph.nodes[0].id, 'nested');
  assert.deepStrictEqual(hostArray(exported.node.citationKeys), ['ref1']);
  assert.strictEqual(exported.references[0].key, 'ref1');
}

function testCurrentNodeExportJsonIsParseable() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  root.nodes = [api.makeNode({ id: 'n1', label: 'Portable node' })];
  api.state.rootGraph = root;
  api.state.activePath = [];
  api.state.selectedNodeId = 'n1';

  const parsed = JSON.parse(api.currentNodeExportJson());

  assert.strictEqual(parsed.exportKind, 'current-node');
  assert.strictEqual(parsed.node.label, 'Portable node');
}

function testObjectAndPropertyNodeTypesRoundTrip() {
  const api = loadCalculator();
  const graph = api.createGraph('Typed graph');
  graph.nodes = [
    api.makeNode({
      id: 'obj',
      type: 'object',
      label: 'Group',
      details: [{ id: 'definition', label: 'definition', type: 'textbox', text: 'A group object.' }]
    }),
    api.makeNode({
      id: 'prop',
      type: 'property',
      label: 'Nilpotent',
      details: [{ id: 'criteria', label: 'criteria', type: 'textbox', text: 'Central series exists.' }]
    })
  ];

  const exported = api.buildGraphExport(graph, { includeTitleNode: true });
  const imported = api.normalizeGraphImport(exported);

  assert.deepStrictEqual(hostArray(exported.nodes.map((node) => node.type)), ['object', 'property']);
  assert.deepStrictEqual(hostArray(imported.nodes.map((node) => node.type)), ['object', 'property']);
}

function testNodeTypeRowsUseGlobalConfigAndFallbacks() {
  const api = loadCalculator({
    nodeTypeRows: {
      theorem: ['assumption', 'conclusion'],
      object: ['definition', 'examples'],
      misc: []
    }
  });

  assert.deepStrictEqual(
    hostArray(api.nodeTypeRowsForType('object').map((row) => row.label)),
    ['definition', 'examples']
  );
  assert.deepStrictEqual(
    hostArray(api.nodeTypeRowsForType('lemma').map((row) => row.label)),
    ['assumption', 'conclusion']
  );
  assert.deepStrictEqual(
    hostArray(api.nodeTypeRowsForType('property').map((row) => row.label)),
    ['definition', 'criteria', 'examples']
  );
}

function testDefaultTheoremRowsStayLegacyFields() {
  const api = loadCalculator();
  const rows = hostArray(api.nodeTypeRowsForType('theorem')).map((row) => ({
    label: row.label,
    field: row.field
  }));

  assert.deepStrictEqual(rows, [
    { label: 'setting', field: 'setting' },
    { label: 'condition', field: 'condition' },
    { label: 'result', field: 'result' },
    { label: 'proof sketch', field: 'proofSketch' }
  ]);
}

function testSelectedReferenceExportJsonAndImportNormalize() {
  const api = loadCalculator();
  api.state.references = [
    api.makeReference({ key: 'ref1', citeKey: 'ref1', title: 'Reference 1' }),
    api.makeReference({ key: 'ref2', citeKey: 'ref2', title: 'Reference 2' })
  ];
  api.state.selectedReferenceKeys = new Set(['ref2']);

  const exported = api.buildSelectedReferencesExport();
  const parsed = JSON.parse(api.selectedReferencesExportJson());
  const normalized = api.normalizeSelectedReferencesImport(exported);
  const merged = api.mergeReferencesByKey(
    [api.makeReference({ key: 'ref1', citeKey: 'ref1', title: 'Existing' })],
    normalized.references
  );

  assert.strictEqual(exported.exportKind, 'selected-references');
  assert.strictEqual(parsed.exportKind, 'selected-references');
  assert.deepStrictEqual(hostArray(exported.references.map((reference) => reference.key)), ['ref2']);
  assert.strictEqual(api.isSelectedReferencesExport(exported), true);
  assert.deepStrictEqual(hostArray(merged.map((reference) => reference.key)), ['ref1', 'ref2']);
}

function testReferenceUsageLabelsMatchUsageScanner() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  root.nodes = [
    api.makeNode({ id: 'a', label: 'Node A', setting: 'Read \\cite{ref1}.' }),
    api.makeNode({ id: 'b', label: 'Node B' })
  ];
  root.arrows = [
    api.makeArrow({ id: 'arr', sourceId: 'a', targetId: 'b', remark: 'Uses \\cite{ref1}.' })
  ];
  api.state.rootGraph = root;
  const reference = api.makeReference({ key: 'ref1', citeKey: 'ref1', title: 'Reference' });

  assert.deepStrictEqual(
    hostArray(api.referenceUsageLabels(reference)),
    hostArray(api.referenceUsages(reference).map((usage) => usage.label))
  );
}

function testCurrentNodeImportAppendsAndUniquifiesId() {
  const api = loadCalculator();
  const graph = api.createGraph('Destination');
  graph.nodes = [api.makeNode({ id: 'n1', label: 'Existing' })];
  const data = {
    schemaVersion: 9,
    exportKind: 'current-node',
    title: 'Imported',
    node: {
      id: 'n1',
      type: 'misc',
      label: 'Imported',
      x: 160,
      y: 170,
      childGraph: {
        title: 'Imported',
        nodes: [{ id: 'nested', type: 'misc', label: 'Nested', x: 100, y: 100 }],
        arrows: [],
        view: { layoutAvoidOverlap: true }
      }
    },
    references: [{ key: 'ref1', citeKey: 'ref1', title: 'Reference' }]
  };

  const result = api.importCurrentNodeIntoGraph(graph, data);

  assert.strictEqual(graph.nodes.length, 2);
  assert.notStrictEqual(result.node.id, 'n1');
  assert.strictEqual(result.node.label, 'Imported');
  assert.ok(result.node.childGraph);
  assert.strictEqual(result.node.childGraph.nodes[0].id, 'nested');
  assert.strictEqual(result.references[0].key, 'ref1');
}

function testUndoRestoresDeletedNode() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  root.nodes = [api.makeNode({ id: 'n1', label: 'Keep me' })];
  api.state.rootGraph = root;
  api.state.activePath = [];

  api.pushUndoSnapshot('delete node');
  root.nodes = [];
  api.performUndo({ render: false });

  assert.strictEqual(api.state.rootGraph.nodes.length, 1);
  assert.strictEqual(api.state.rootGraph.nodes[0].label, 'Keep me');
}

function testEmptyGraphTitleIsPreserved() {
  const api = loadCalculator();
  const untitledGraph = api.createGraph();
  const importedWithoutTitle = api.normalizeGraphImport({ nodes: [], arrows: [] });

  assert.strictEqual(untitledGraph.title, '');
  assert.strictEqual(untitledGraph.titleNode.label, '');
  assert.strictEqual(importedWithoutTitle.title, '');

  api.state.rootGraph = api.createGraph('Maintenance Tracker');
  api.state.activePath = [];

  api.state.graphTitle = '';
  const exported = api.buildGraphExport(api.state.rootGraph);

  assert.strictEqual(api.state.graphTitle, '');
  assert.strictEqual(api.state.rootGraph.titleNode.label, '');
  assert.strictEqual(exported.title, '');

  const imported = api.normalizeGraphImport(exported);
  assert.strictEqual(imported.title, '');
  assert.strictEqual(imported.titleNode.label, '');
}

function testUndoRestoresNodeMoveIntoChildGraph() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  const moved = api.makeNode({ id: 'move', label: 'Move me' });
  const target = api.makeNode({ id: 'target', label: 'Target' });
  root.nodes = [moved, target];
  api.state.rootGraph = root;
  api.state.activePath = [];

  api.pushUndoSnapshot('move node inside');
  api.moveNodeBetweenGraphs(root, 'move', api.ensureNodeChildGraph(target));
  api.performUndo({ render: false });

  assert.deepStrictEqual(hostArray(api.state.rootGraph.nodes.map((node) => node.id)), ['move', 'target']);
  assert.ok(!api.state.rootGraph.nodes.find((node) => node.id === 'target').childGraph);
}

function testUndoRestoresCurrentNodeImport() {
  const api = loadCalculator();
  const graph = api.createGraph('Destination');
  graph.nodes = [api.makeNode({ id: 'n1', label: 'Existing' })];
  api.state.rootGraph = graph;
  api.state.activePath = [];
  const data = {
    schemaVersion: 9,
    exportKind: 'current-node',
    node: { id: 'n2', type: 'misc', label: 'Imported', x: 160, y: 170 },
    references: []
  };

  api.pushUndoSnapshot('current node import');
  api.importCurrentNodeIntoGraph(graph, data);
  api.performUndo({ render: false });

  assert.deepStrictEqual(hostArray(api.state.rootGraph.nodes.map((node) => node.label)), ['Existing']);
}

function testUndoRestoresNodeColorEditSnapshot() {
  const api = loadCalculator();
  const root = api.createGraph('Root');
  root.nodes = [api.makeNode({ id: 'n1', label: 'Colored', color: '#7a6f65' })];
  api.state.rootGraph = root;
  api.state.activePath = [];

  api.pushUndoSnapshot('node edit');
  root.nodes[0].color = '#8b5f2a';
  api.performUndo({ render: false });

  assert.strictEqual(api.state.rootGraph.nodes[0].color, '#7a6f65');
}

function testCurrentNodeImportRejectsGraphPayload() {
  const api = loadCalculator();

  assert.throws(
    () => api.normalizeCurrentNodeImport({ schemaVersion: 9, title: 'Graph', nodes: [], arrows: [] }),
    /current-node export/
  );
}

function testColorPaletteOverflowContainsOnlyHiddenPresets() {
  const api = loadCalculator();
  const plan = api.colorPaletteRenderPlan([
    { label: 'one', value: '#111111' },
    { label: 'two', value: '#222222' },
    { label: 'three', value: '#333333' },
    { label: 'four', value: '#444444' }
  ], 3);

  assert.strictEqual(plan.hasOverflow, true);
  assert.deepStrictEqual(hostArray(plan.visible.map((entry) => entry.value)), ['#111111', '#222222']);
  assert.deepStrictEqual(hostArray(plan.overflow.map((entry) => entry.value)), ['#333333', '#444444']);
}

function testImportParserAcceptsJsonAndExportedPresetText() {
  const api = loadCalculator();
  const json = '{"schemaVersion":10,"title":"JSON graph","nodes":[],"arrows":[]}';
  const preset = [
    '// Save this file as theorem_graph_presets/round_trip.preset.js',
    '// Add this entry to theorem_graph_presets/presets.js:',
    'window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};',
    `window.THEOREM_GRAPH_PRESET_DATA.round_trip = ${json};`
  ].join('\n');

  assert.strictEqual(api.parseImportText(json).title, 'JSON graph');
  assert.strictEqual(api.parseImportText(preset).title, 'JSON graph');

  const prepared = api.validateSharedImport('json-current', { source: 'paste', text: preset });
  assert.strictEqual(prepared.text, preset);
  assert.strictEqual(prepared.data.title, 'JSON graph');
  assert.strictEqual(prepared.source, 'paste');
}

function testImportParserRejectsMalformedPresetText() {
  const api = loadCalculator();
  const malformed = [
    '// Save this file as theorem_graph_presets/broken.preset.js',
    'window.THEOREM_GRAPH_PRESET_DATA.broken = { title: "not JSON" };'
  ].join('\n');

  assert.throws(() => api.parseImportText(malformed), /Invalid preset file/);
  assert.throws(() => api.validateSharedImport('json-current', { source: 'paste', text: malformed }), /Invalid preset file/);
}

function testSharedImportContextEnablesTextImportsAndSynchronizesScope() {
  const api = loadCalculator();
  api.refs.importInput = { disabled: true };
  api.refs.importModePreset = { checked: true };
  api.refs.importModeJson = { checked: false };
  api.refs.importScopeCurrent = { checked: true };
  api.refs.importScopeWhole = { checked: false };
  api.refs.importScopeNode = { checked: false };

  api.syncSharedImportContext({ importKind: 'json-current' });
  assert.strictEqual(api.refs.importInput.disabled, false);
  assert.strictEqual(api.state.importMode, 'json');
  assert.strictEqual(api.state.importScope, 'current');

  api.syncSharedImportContext({ importKind: 'json-whole' });
  assert.strictEqual(api.refs.importInput.disabled, false);
  assert.strictEqual(api.refs.importScopeWhole.checked, true);
  assert.strictEqual(api.state.importScope, 'whole');

  api.syncSharedImportContext({ importKind: 'json-node' });
  assert.strictEqual(api.refs.importInput.disabled, false);
  assert.strictEqual(api.refs.importScopeNode.checked, true);
  assert.strictEqual(api.state.importScope, 'node');

  api.syncSharedImportContext({ importKind: 'preset' });
  assert.strictEqual(api.refs.importInput.disabled, true);
  assert.strictEqual(api.refs.importModePreset.checked, true);
  assert.strictEqual(api.state.importScope, 'current');
}

function testSharedImportAdapterUsesAwaitedPageImport() {
  const api = loadCalculator();

  assert.strictEqual(api.sharedImportExportAdapter.validateImport, api.validateSharedImport);
  assert.strictEqual(api.sharedImportExportAdapter.onContextChange, api.syncSharedImportContext);
  assert.strictEqual(api.sharedImportExportAdapter.applyImport, api.applySharedImport);
}

function testReferenceRefreshPolicyMatchesImportCoverage() {
  const api = loadCalculator();

  assert.strictEqual(api.importRefreshesReferenceCollection('current', 0), true);
  assert.strictEqual(api.importRefreshesReferenceCollection('whole', 0), true);
  assert.strictEqual(api.importRefreshesReferenceCollection('whole', 2), true);
  assert.strictEqual(api.importRefreshesReferenceCollection('current', 1), false);
}

testHiddenCitationKeysArePruned();
testVisibleCitationKeysSurvive();
testReferenceRenameRewritesNestedNodesTitleAndArrows();
testLegacyArrowLabelMigratesAndExportsCompatibilityMirror();
testMultipleArrowLabelsAndTermsRoundTrip();
testArrowLabelDefaultsAndStableIds();
testArrowCitationsIncludeAllLabelsAndTerms();
testUndoRestoresArrowLabelsAndTerms();
testCancelSnapshotRestoresArrowLabelsAndTerms();
testMultiKeyReplacementPreservesUnrelatedKeys();
testDeleteUsageReportIncludesNestedNodesAndArrows();
testRawBibtexKeyIsRenameAlias();
testReferenceSelectionEnablesDeleteButton();
testCheckboxQuestionStateRoundTrips();
testLayoutArrowSpringWeightsRespectBodyStyle();
testLayoutArrowIdealDistanceRespectsBodyAndLabel();
testCanvasHeightIsExportedPerGraph();
testMoveNodeIntoNodePreservesChildGraphAndRemovesSourceArrows();
testMoveNodeToAncestorGraphUniquifiesId();
testCurrentNodeExportIncludesNodeChildGraphAndReferences();
testCurrentNodeExportJsonIsParseable();
testObjectAndPropertyNodeTypesRoundTrip();
testNodeTypeRowsUseGlobalConfigAndFallbacks();
testDefaultTheoremRowsStayLegacyFields();
testSelectedReferenceExportJsonAndImportNormalize();
testReferenceUsageLabelsMatchUsageScanner();
testCurrentNodeImportAppendsAndUniquifiesId();
testUndoRestoresDeletedNode();
testEmptyGraphTitleIsPreserved();
testUndoRestoresNodeMoveIntoChildGraph();
testUndoRestoresCurrentNodeImport();
testUndoRestoresNodeColorEditSnapshot();
testCurrentNodeImportRejectsGraphPayload();
testColorPaletteOverflowContainsOnlyHiddenPresets();
testImportParserAcceptsJsonAndExportedPresetText();
testImportParserRejectsMalformedPresetText();
testSharedImportContextEnablesTextImportsAndSynchronizesScope();
testSharedImportAdapterUsesAwaitedPageImport();
testReferenceRefreshPolicyMatchesImportCoverage();

console.log('theorem graph regression tests passed');
