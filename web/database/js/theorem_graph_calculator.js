(() => {
  'use strict';

  const SCHEMA_VERSION = 1;
  const NODE_TYPES = {
    theorem: { label: 'Theorem', fill: '#f8f1e5', stroke: '#3d6b4f', band: '#3d6b4f' },
    lemma: { label: 'Lemma', fill: '#f4f7ed', stroke: '#6b7f3d', band: '#6b7f3d' },
    proposition: { label: 'Proposition', fill: '#fff7e8', stroke: '#8a6330', band: '#8a6330' },
    corollary: { label: 'Corollary', fill: '#eef7f4', stroke: '#46786e', band: '#46786e' },
    conjecture: { label: 'Conjecture', fill: '#fbefee', stroke: '#8b3a2a', band: '#8b3a2a' },
    definition: { label: 'Definition', fill: '#f4f1f8', stroke: '#66527c', band: '#66527c' },
    example: { label: 'Example', fill: '#f7f5f1', stroke: '#7a6f65', band: '#7a6f65' }
  };
  const NODE_TYPE_KEYS = Object.keys(NODE_TYPES);
  const KNOWN_NODE_KEYS = new Set([
    'id',
    'type',
    'label',
    'setting',
    'condition',
    'result',
    'citationKeys',
    'color',
    'x',
    'y'
  ]);
  const KNOWN_ARROW_KEYS = new Set(['id', 'sourceId', 'targetId', 'label', 'curve', 'labelOffset', 'color']);
  const KNOWN_REFERENCE_KEYS = new Set(['key', 'author', 'title', 'year', 'citeText', 'url', 'source', 'rawBibtex']);

  const state = {
    nodes: [],
    arrows: [],
    references: [],
    selectedReferenceKeys: new Set(),
    editingReferenceKey: null,
    selectedNodeId: null,
    selectedArrowId: null,
    connectMode: false,
    connectSourceId: null,
    layoutRunning: false,
    animationFrame: null,
    canvasWidth: 960,
    canvasHeight: 560,
    drag: null,
    hoveredNodeId: null,
    nodeSerial: 1,
    arrowSerial: 1,
    viewExtra: {},
    mathTypesetTimer: null,
    mathTypesetAttempts: 0,
    detailPreview: null
  };

  const refs = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheRefs();
    bindEvents();
    seedExample();
    resizeCanvas();
    renderAll();

    if (window.ResizeObserver && refs.canvas) {
      const observer = new ResizeObserver(() => {
        resizeCanvas();
        clampAllNodes();
        renderCanvas();
      });
      observer.observe(refs.canvas);
    } else {
      window.addEventListener('resize', () => {
        resizeCanvas();
        clampAllNodes();
        renderCanvas();
      });
    }
  }

  function cacheRefs() {
    const $ = (id) => document.getElementById(id);
    refs.canvas = $('theorem-graph-canvas');
    refs.nodeLayer = $('theorem-node-layer');
    refs.status = $('theorem-status');
    refs.summary = $('theorem-summary');
    refs.graphCountBadge = $('graph-count-badge');
    refs.connectBadge = $('connect-badge');
    refs.clearGraph = $('clear-graph');
    refs.nodeEmptyNote = $('node-empty-note');
    refs.nodeEditor = $('node-editor');
    refs.nodeType = $('node-type');
    refs.nodeLabel = $('node-label');
    refs.nodeSetting = $('node-setting');
    refs.nodeCondition = $('node-condition');
    refs.nodeResult = $('node-result');
    refs.nodeColor = $('node-color');
    refs.arrowEditor = $('arrow-editor');
    refs.arrowSource = $('arrow-source');
    refs.arrowTarget = $('arrow-target');
    refs.arrowLabel = $('arrow-label');
    refs.arrowCurve = $('arrow-curve');
    refs.arrowLabelOffset = $('arrow-label-offset');
    refs.arrowColor = $('arrow-color');
    refs.detailUpdate = $('detail-update');
    refs.newNodeType = $('new-node-type');
    refs.newNodeLabel = $('new-node-label');
    refs.addNode = $('add-node');
    refs.connectMode = $('connect-mode');
    refs.deleteSelected = $('delete-selected');
    refs.toggleLayout = $('toggle-layout');
    refs.resetLayout = $('reset-layout');
    refs.graphHelp = $('graph-help');
    refs.bibtexInput = $('bibtex-input');
    refs.addReference = $('add-reference');
    refs.linkReferenceUrl = $('link-reference-url');
    refs.linkReferenceKey = $('link-reference-key');
    refs.linkReferenceTitle = $('link-reference-title');
    refs.linkReferenceSource = $('link-reference-source');
    refs.addLinkReference = $('add-link-reference');
    refs.clearBibtex = $('clear-bibtex');
    refs.deleteSelectedReferences = $('delete-selected-references');
    refs.referenceMessage = $('reference-message');
    refs.referenceSelectAll = $('reference-select-all');
    refs.referenceEditForm = $('reference-edit-form');
    refs.referenceEditKey = $('reference-edit-key');
    refs.referenceEditCite = $('reference-edit-cite');
    refs.referenceEditTitle = $('reference-edit-title');
    refs.referenceEditAuthor = $('reference-edit-author');
    refs.referenceEditYear = $('reference-edit-year');
    refs.referenceEditUrl = $('reference-edit-url');
    refs.referenceEditSource = $('reference-edit-source');
    refs.referenceEditRaw = $('reference-edit-raw');
    refs.referenceEditSave = $('reference-edit-save');
    refs.referenceEditCancel = $('reference-edit-cancel');
    refs.referenceList = $('reference-list');
    refs.exportOut = $('theorem-export-out');
    refs.refreshExport = $('refresh-export');
    refs.copyExport = $('copy-export');
    refs.importInput = $('theorem-import-input');
    refs.loadImport = $('load-import');
    refs.clearImport = $('clear-import');
    refs.exportMessage = $('export-message');
  }

  function bindEvents() {
    if (refs.canvas) {
      refs.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
      refs.canvas.addEventListener('pointermove', handleCanvasPointerMove);
      refs.canvas.addEventListener('pointerup', handleCanvasPointerUp);
      refs.canvas.addEventListener('pointercancel', handleCanvasPointerUp);
      refs.canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    }
    if (refs.nodeLayer) {
      refs.nodeLayer.addEventListener('pointerdown', handleNodeLayerPointerDown);
      refs.nodeLayer.addEventListener('pointermove', handleCanvasPointerMove);
      refs.nodeLayer.addEventListener('pointerup', handleCanvasPointerUp);
      refs.nodeLayer.addEventListener('pointercancel', handleCanvasPointerUp);
      refs.nodeLayer.addEventListener('dblclick', handleNodeLayerDoubleClick);
    }

    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', () => {
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    if (refs.clearGraph) refs.clearGraph.addEventListener('click', clearGraphWithConfirm);
    if (refs.addNode) refs.addNode.addEventListener('click', addNodeFromControls);
    if (refs.connectMode) refs.connectMode.addEventListener('click', toggleConnectMode);
    if (refs.deleteSelected) refs.deleteSelected.addEventListener('click', deleteSelected);
    if (refs.toggleLayout) refs.toggleLayout.addEventListener('click', toggleLayout);
    if (refs.resetLayout) refs.resetLayout.addEventListener('click', resetLayout);
    if (refs.addReference) refs.addReference.addEventListener('click', addReferencesFromInput);
    if (refs.addLinkReference) refs.addLinkReference.addEventListener('click', addLinkReferenceFromControls);
    if (refs.clearBibtex) refs.clearBibtex.addEventListener('click', () => {
      refs.bibtexInput.value = '';
      if (refs.linkReferenceUrl) refs.linkReferenceUrl.value = '';
      if (refs.linkReferenceKey) refs.linkReferenceKey.value = '';
      if (refs.linkReferenceTitle) refs.linkReferenceTitle.value = '';
      if (refs.linkReferenceSource) refs.linkReferenceSource.value = 'auto';
      setReferenceMessage('Reference inputs cleared.');
    });
    if (refs.deleteSelectedReferences) refs.deleteSelectedReferences.addEventListener('click', deleteSelectedReferences);
    if (refs.referenceSelectAll) {
      refs.referenceSelectAll.addEventListener('change', toggleReferenceSelectionFromMaster);
    }
    if (refs.referenceEditSave) refs.referenceEditSave.addEventListener('click', saveReferenceEdit);
    if (refs.referenceEditCancel) refs.referenceEditCancel.addEventListener('click', closeReferenceEdit);
    if (refs.refreshExport) refs.refreshExport.addEventListener('click', () => {
      refreshExport();
      setExportMessage('Export refreshed.');
    });
    if (refs.copyExport) refs.copyExport.addEventListener('click', copyExport);
    if (refs.loadImport) refs.loadImport.addEventListener('click', loadImport);
    if (refs.clearImport) refs.clearImport.addEventListener('click', () => {
      refs.importInput.value = '';
      setExportMessage('Import input cleared.');
    });

    if (refs.detailUpdate) refs.detailUpdate.addEventListener('click', applyDetailUpdate);
    [
      refs.nodeColor,
      refs.arrowCurve,
      refs.arrowLabelOffset,
      refs.arrowColor
    ].forEach((control) => {
      if (!control) return;
      control.addEventListener('input', previewDetailStyle);
      control.addEventListener('change', previewDetailStyle);
    });
    document.querySelectorAll('[data-color-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.colorTarget || '');
        if (!input) return;
        input.value = normalizeColor(button.dataset.colorValue, input.value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function seedExample() {
    state.nodes = [
      makeNode({
        id: 'n1',
        type: 'lemma',
        label: 'Lemma 1',
        setting: 'A compact workspace of mathematical statements.',
        condition: 'References and hypotheses are recorded with each node.',
        result: 'A local statement can support a later theorem.',
        citationKeys: ['hartshorne1977'],
        x: 210,
        y: 180
      }),
      makeNode({
        id: 'n2',
        type: 'theorem',
        label: 'Theorem A',
        setting: 'The same setting as Lemma 1.',
        condition: 'Assume the lemma and the recorded compatibility condition.',
        result: 'The main result follows as a dependency node.',
        citationKeys: ['hartshorne1977'],
        x: 500,
        y: 270
      }),
      makeNode({
        id: 'n3',
        type: 'conjecture',
        label: 'Conjecture B',
        setting: 'A neighboring problem suggested by Theorem A.',
        condition: 'The expected extension is not yet proved.',
        result: 'A possible future arrow can be added when proved.',
        citationKeys: [],
        x: 735,
        y: 160
      })
    ];
    state.arrows = [
      makeArrow({ id: 'a1', sourceId: 'n1', targetId: 'n2', label: 'uses' }),
      makeArrow({ id: 'a2', sourceId: 'n2', targetId: 'n3', label: 'suggests' })
    ];
    state.references = [
      makeReference({
        key: 'hartshorne1977',
        author: 'Hartshorne, Robin',
        title: 'Algebraic Geometry',
        year: '1977',
        citeText: '\\cite{hartshorne1977}',
        source: 'bibtex',
        rawBibtex: '@book{hartshorne1977, author={Hartshorne, Robin}, title={Algebraic Geometry}, year={1977}}'
      })
    ];
    state.selectedNodeId = 'n2';
    state.nodeSerial = 4;
    state.arrowSerial = 3;
  }

  function makeNode(source = {}) {
    const id = cleanId(source.id) || nextNodeId();
    const extra = collectExtra(source, KNOWN_NODE_KEYS);
    return {
      extra,
      id,
      type: normalizeType(source.type),
      label: cleanString(source.label) || NODE_TYPES[normalizeType(source.type)].label,
      setting: cleanString(source.setting),
      condition: cleanString(source.condition),
      result: cleanString(source.result),
      citationKeys: normalizeCitationKeys(source.citationKeys),
      color: normalizeColor(source.color, NODE_TYPES[normalizeType(source.type)].stroke),
      x: finiteNumber(source.x, state.canvasWidth / 2),
      y: finiteNumber(source.y, state.canvasHeight / 2),
      vx: 0,
      vy: 0,
      fixed: false
    };
  }

  function makeArrow(source = {}) {
    const extra = collectExtra(source, KNOWN_ARROW_KEYS);
    return {
      extra,
      id: cleanId(source.id) || nextArrowId(),
      sourceId: cleanId(source.sourceId),
      targetId: cleanId(source.targetId),
      label: cleanString(source.label),
      curve: clamp(finiteNumber(source.curve, 0), -160, 160),
      labelOffset: clamp(finiteNumber(source.labelOffset, 0), -120, 120),
      color: normalizeColor(source.color, '#5f574e')
    };
  }

  function makeReference(source = {}) {
    const extra = collectExtra(source, KNOWN_REFERENCE_KEYS);
    return {
      extra,
      key: cleanString(source.key),
      author: cleanString(source.author),
      title: cleanString(source.title),
      year: cleanString(source.year),
      citeText: cleanString(source.citeText) || defaultCiteText(cleanString(source.key)),
      url: normalizeUrl(source.url),
      source: normalizeReferenceSource(source.source, source.url ? inferReferenceSource(source.url) : 'bibtex'),
      rawBibtex: cleanString(source.rawBibtex)
    };
  }

  function collectExtra(source, knownKeys) {
    const extra = {};
    if (!source || typeof source !== 'object') return extra;
    Object.keys(source).forEach((key) => {
      if (!knownKeys.has(key)) extra[key] = source[key];
    });
    return extra;
  }

  function nextNodeId() {
    let id = '';
    do {
      id = `n${state.nodeSerial}`;
      state.nodeSerial += 1;
    } while (state.nodes.some((node) => node.id === id));
    return id;
  }

  function nextArrowId() {
    let id = '';
    do {
      id = `a${state.arrowSerial}`;
      state.arrowSerial += 1;
    } while (state.arrows.some((arrow) => arrow.id === id));
    return id;
  }

  function resizeCanvas() {
    if (!refs.canvas) return;
    const rect = refs.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || refs.canvas.clientWidth || 960));
    const height = Math.max(320, Math.round(rect.height || refs.canvas.clientHeight || 560));
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
    state.canvasWidth = width;
    state.canvasHeight = height;
    refs.canvas.width = Math.round(width * dpr);
    refs.canvas.height = Math.round(height * dpr);
    const ctx = refs.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function renderAll() {
    syncEditor();
    renderReferences();
    syncControls();
    refreshExport();
    renderCanvas();
    renderNodeLayer();
  }

  function renderCanvas() {
    if (!refs.canvas) return;
    const ctx = refs.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    drawEmptyState(ctx);
    drawArrows(ctx);
    drawConnectPreview(ctx);
    renderNodeLayer();
  }

  function drawEmptyState(ctx) {
    if (state.nodes.length) return;
    ctx.save();
    if (!state.nodes.length) {
      ctx.fillStyle = '#7a6f65';
      ctx.font = '15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add a theorem, lemma, conjecture, or definition to begin.', state.canvasWidth / 2, state.canvasHeight / 2);
    }
    ctx.restore();
  }

  function drawArrows(ctx) {
    const groups = parallelArrowGroups();
    state.arrows.forEach((arrow) => {
      const source = findNode(arrow.sourceId);
      const target = findNode(arrow.targetId);
      if (!source || !target) return;
      const groupKey = arrowGroupKey(arrow);
      const siblings = groups.get(groupKey) || [];
      const siblingIndex = siblings.findIndex((item) => item.id === arrow.id);
      const offset = (siblingIndex - (siblings.length - 1) / 2) * 26;
      const selected = state.selectedArrowId === arrow.id;
      const preview = selected ? currentArrowPreview(arrow) : arrow;
      const model = arrowCurve(source, target, offset + finiteNumber(preview.curve, 0));
      const color = normalizeColor(preview.color, '#5f574e');
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = selected ? 2.6 : 1.6;
      ctx.shadowColor = selected ? 'rgba(139, 58, 42, 0.22)' : 'transparent';
      ctx.shadowBlur = selected ? 5 : 0;
      ctx.setLineDash(selected ? [] : [0]);
      ctx.beginPath();
      ctx.moveTo(model.start.x, model.start.y);
      ctx.quadraticCurveTo(model.control.x, model.control.y, model.end.x, model.end.y);
      ctx.stroke();
      drawArrowHead(ctx, model.headBase, model.end);
      if (arrow.label) drawArrowLabel(ctx, arrow.label, model, preview.labelOffset);
      ctx.restore();
    });
  }

  function drawArrowLabel(ctx, label, model, labelOffset) {
    const text = truncateText(label, 28);
    const point = quadraticPoint(model.start, model.control, model.end, 0.5);
    const normal = quadraticNormal(model.start, model.control, model.end, 0.5);
    const offset = finiteNumber(labelOffset, 0);
    point.x += normal.x * offset;
    point.y += normal.y * offset;
    ctx.save();
    ctx.font = '12px "JetBrains Mono", Consolas, monospace';
    const metrics = ctx.measureText(text);
    const width = metrics.width + 10;
    const height = 20;
    ctx.fillStyle = 'rgba(255, 253, 248, 0.88)';
    ctx.strokeStyle = '#d8d0c4';
    roundRect(ctx, point.x - width / 2, point.y - height / 2, width, height, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7a6f65';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, point.x, point.y + 0.5);
    ctx.restore();
  }

  function drawArrowHead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - Math.cos(angle - Math.PI / 6) * size, to.y - Math.sin(angle - Math.PI / 6) * size);
    ctx.lineTo(to.x - Math.cos(angle + Math.PI / 6) * size, to.y - Math.sin(angle + Math.PI / 6) * size);
    ctx.closePath();
    ctx.fill();
  }

  function drawConnectPreview(ctx) {
    if (!state.connectMode || !state.connectSourceId) return;
    const source = findNode(state.connectSourceId);
    if (!source) return;
    ctx.save();
    ctx.fillStyle = '#3d6b4f';
    ctx.font = '12px "JetBrains Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const text = `source: ${source.label || source.id}`;
    const width = ctx.measureText(text).width + 14;
    roundRect(ctx, 12, state.canvasHeight - 38, width, 24, 3);
    ctx.fillStyle = 'rgba(255, 253, 248, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#3d6b4f';
    ctx.stroke();
    ctx.fillStyle = '#3d6b4f';
    ctx.fillText(text, 19, state.canvasHeight - 32);
    ctx.restore();
  }

  function renderNodeLayer() {
    if (!refs.nodeLayer) return;
    const existing = new Map(Array.from(refs.nodeLayer.querySelectorAll('[data-node-id]')).map((element) => [element.dataset.nodeId, element]));
    const rendered = [];
    state.nodes.forEach((node) => {
      let element = existing.get(node.id);
      if (!element) {
        element = document.createElement('button');
        element.type = 'button';
        element.className = 'theorem-node-label';
        element.dataset.nodeId = node.id;
        refs.nodeLayer.appendChild(element);
      }
      element.classList.toggle('is-selected', state.selectedNodeId === node.id);
      element.classList.toggle('is-source', state.connectSourceId === node.id);
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      const color = currentNodeColor(node);
      element.style.borderColor = color;
      element.style.color = color;
      const sourceLabel = node.label || node.id;
      element.setAttribute('aria-label', `${(NODE_TYPES[node.type] || NODE_TYPES.theorem).label}: ${plainLabel(sourceLabel)}`);
      if (element.dataset.sourceLabel !== sourceLabel) {
        element.textContent = sourceLabel;
        element.dataset.sourceLabel = sourceLabel;
        element.dataset.needsTypeset = 'true';
      }
      rendered.push(node.id);
    });
    existing.forEach((element, id) => {
      if (!rendered.includes(id)) element.remove();
    });
    typesetNodeLabels();
  }

  function nodeBox(_ctx, node) {
    const element = refs.nodeLayer ? refs.nodeLayer.querySelector(`[data-node-id="${cssEscape(node.id)}"]`) : null;
    const rect = element ? element.getBoundingClientRect() : null;
    const layerRect = refs.nodeLayer ? refs.nodeLayer.getBoundingClientRect() : null;
    const width = rect && rect.width ? rect.width : 92;
    const height = rect && rect.height ? rect.height : 34;
    if (rect && layerRect) {
      return {
        x: rect.left - layerRect.left,
        y: rect.top - layerRect.top,
        width,
        height
      };
    }
    return {
      x: node.x - width / 2,
      y: node.y - height / 2,
      width,
      height
    };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function typesetNodeLabels() {
    if (!refs.nodeLayer) return;
    const pending = Array.from(refs.nodeLayer.querySelectorAll('[data-needs-typeset="true"]'));
    if (!pending.length) return;
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== 'function') {
      scheduleMathTypesetRetry();
      return;
    }
    state.mathTypesetAttempts = 0;
    pending.forEach((element) => {
      delete element.dataset.needsTypeset;
    });
    window.MathJax.typesetPromise(pending).then(() => {
      renderCanvas();
    }).catch(() => {});
  }

  function scheduleMathTypesetRetry() {
    if (state.mathTypesetAttempts > 80) return;
    if (state.mathTypesetTimer) return;
    state.mathTypesetAttempts += 1;
    state.mathTypesetTimer = window.setTimeout(() => {
      state.mathTypesetTimer = null;
      typesetNodeLabels();
    }, 250);
  }

  function arrowCurve(source, target, offset) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;
    const sourceRadius = 48;
    const targetRadius = 50;
    const start = {
      x: source.x + ux * sourceRadius,
      y: source.y + uy * sourceRadius
    };
    const end = {
      x: target.x - ux * targetRadius,
      y: target.y - uy * targetRadius
    };
    const curve = finiteNumber(offset, 0);
    const control = {
      x: (start.x + end.x) / 2 + px * curve,
      y: (start.y + end.y) / 2 + py * curve
    };
    const headBase = quadraticPoint(start, control, end, 0.92);
    return { start, control, end, headBase };
  }

  function quadraticPoint(start, control, end, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y
    };
  }

  function quadraticNormal(start, control, end, t) {
    const dx = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
    const dy = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: -dy / length,
      y: dx / length
    };
  }

  function parallelArrowGroups() {
    const groups = new Map();
    state.arrows.forEach((arrow) => {
      const key = arrowGroupKey(arrow);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(arrow);
    });
    return groups;
  }

  function arrowGroupKey(arrow) {
    return `${arrow.sourceId}->${arrow.targetId}`;
  }

  function handleCanvasPointerDown(event) {
    const point = eventPoint(event);
    const node = hitNode(point);
    if (state.connectMode) {
      handleConnectClick(node);
      return;
    }

    if (node) {
      selectNode(node.id);
      state.drag = {
        nodeId: node.id,
        offsetX: node.x - point.x,
        offsetY: node.y - point.y
      };
      node.fixed = true;
      try {
        refs.canvas.setPointerCapture(event.pointerId);
      } catch (_) {}
      renderAll();
      return;
    }

    const arrow = hitArrow(point);
    if (arrow) {
      selectArrow(arrow.id);
    } else {
      clearSelection();
    }
    renderAll();
  }

  function handleNodeLayerPointerDown(event) {
    const target = event.target.closest('[data-node-id]');
    if (!target) return;
    event.preventDefault();
    const node = findNode(target.dataset.nodeId);
    if (!node) return;
    if (state.connectMode) {
      handleConnectClick(node);
      return;
    }
    const point = eventPoint(event);
    selectNode(node.id);
    state.drag = {
      nodeId: node.id,
      offsetX: node.x - point.x,
      offsetY: node.y - point.y
    };
    node.fixed = true;
    try {
      target.setPointerCapture(event.pointerId);
    } catch (_) {}
    renderAll();
  }

  function handleCanvasPointerMove(event) {
    const point = eventPoint(event);
    if (state.drag) {
      const node = findNode(state.drag.nodeId);
      if (node) {
        const margin = 90;
        node.x = clamp(point.x + state.drag.offsetX, -margin, state.canvasWidth + margin);
        node.y = clamp(point.y + state.drag.offsetY, -margin, state.canvasHeight + margin);
        node.vx = 0;
        node.vy = 0;
        refreshExport();
        renderCanvas();
      }
      return;
    }

    const node = hitNode(point);
    state.hoveredNodeId = node ? node.id : null;
    if (refs.canvas) refs.canvas.style.cursor = node ? (state.connectMode ? 'crosshair' : 'grab') : 'default';
  }

  function handleCanvasPointerUp(event) {
    if (state.drag) {
      const node = findNode(state.drag.nodeId);
      if (node) {
        node.fixed = false;
        if (nodeOutsideCanvas(node)) {
          removeNodeById(node.id, `Removed ${node.label}.`);
        }
      }
    }
    state.drag = null;
    if (refs.canvas) {
      refs.canvas.style.cursor = state.hoveredNodeId ? 'grab' : 'default';
      if (event && event.pointerId != null) {
        try {
          refs.canvas.releasePointerCapture(event.pointerId);
        } catch (_) {}
      }
    }
    const captureTarget = event?.target;
    if (captureTarget && captureTarget !== refs.canvas && event && event.pointerId != null) {
      try {
        captureTarget.releasePointerCapture(event.pointerId);
      } catch (_) {}
    }
  }

  function handleNodeLayerDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleCanvasDoubleClick(event) {
    if (state.connectMode) return;
    const point = eventPoint(event);
    const node = addNode({
      type: refs.newNodeType ? refs.newNodeType.value : 'lemma',
      label: refs.newNodeLabel && refs.newNodeLabel.value.trim()
        ? refs.newNodeLabel.value.trim()
        : nextDefaultNodeLabel(refs.newNodeType ? refs.newNodeType.value : 'lemma'),
      x: point.x,
      y: point.y
    });
    selectNode(node.id);
    setStatus(`Added ${node.label}.`);
    renderAll();
  }

  function eventPoint(event) {
    const rect = refs.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function hitNode(point) {
    if (!refs.canvas) return null;
    const ctx = refs.canvas.getContext('2d');
    for (let i = state.nodes.length - 1; i >= 0; i -= 1) {
      const node = state.nodes[i];
      const box = nodeBox(ctx, node);
      if (
        point.x >= box.x
        && point.x <= box.x + box.width
        && point.y >= box.y
        && point.y <= box.y + box.height
      ) {
        return node;
      }
    }
    return null;
  }

  function hitArrow(point) {
    const groups = parallelArrowGroups();
    for (let i = state.arrows.length - 1; i >= 0; i -= 1) {
      const arrow = state.arrows[i];
      const source = findNode(arrow.sourceId);
      const target = findNode(arrow.targetId);
      if (!source || !target) continue;
      const siblings = groups.get(arrowGroupKey(arrow)) || [];
      const siblingIndex = siblings.findIndex((item) => item.id === arrow.id);
      const offset = (siblingIndex - (siblings.length - 1) / 2) * 26;
      const preview = state.selectedArrowId === arrow.id ? currentArrowPreview(arrow) : arrow;
      const model = arrowCurve(source, target, offset + finiteNumber(preview.curve, 0));
      if (distanceToQuadratic(point, model.start, model.control, model.end) < 9) return arrow;
    }
    return null;
  }

  function distanceToQuadratic(point, start, control, end) {
    let best = Infinity;
    let prev = start;
    for (let i = 1; i <= 24; i += 1) {
      const next = quadraticPoint(start, control, end, i / 24);
      best = Math.min(best, distanceToSegment(point, prev, next));
      prev = next;
    }
    return best;
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 0.0001) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
    return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
  }

  function handleConnectClick(node) {
    if (!node) {
      setStatus('Click a node to choose the source.');
      return;
    }
    if (!state.connectSourceId) {
      state.connectSourceId = node.id;
      selectNode(node.id);
      setStatus(`Source set to ${node.label}. Click a target node.`);
      syncControls();
      renderCanvas();
      return;
    }
    if (state.connectSourceId === node.id) {
      setStatus('Choose a different target node.');
      return;
    }
    const arrow = addArrow(state.connectSourceId, node.id, '');
    state.connectMode = false;
    state.connectSourceId = null;
    selectArrow(arrow.id);
    setStatus(`Added arrow ${findNode(arrow.sourceId).label} -> ${findNode(arrow.targetId).label}.`);
    renderAll();
  }

  function addNodeFromControls() {
    const type = refs.newNodeType ? refs.newNodeType.value : 'lemma';
    const label = refs.newNodeLabel && refs.newNodeLabel.value.trim()
      ? refs.newNodeLabel.value.trim()
      : nextDefaultNodeLabel(type);
    const angle = state.nodes.length * Math.PI * (3 - Math.sqrt(5));
    const radius = Math.min(state.canvasWidth, state.canvasHeight) * 0.18;
    const node = addNode({
      type,
      label,
      x: state.canvasWidth / 2 + Math.cos(angle) * radius,
      y: state.canvasHeight / 2 + Math.sin(angle) * radius
    });
    if (refs.newNodeLabel) refs.newNodeLabel.value = '';
    selectNode(node.id);
    setStatus(`Added ${node.label}.`);
    renderAll();
  }

  function addNode(source) {
    const node = makeNode(source);
    state.nodes.push(node);
    clampNode(node);
    return node;
  }

  function addArrow(sourceId, targetId, label) {
    const arrow = makeArrow({ sourceId, targetId, label });
    state.arrows.push(arrow);
    return arrow;
  }

  function toggleConnectMode() {
    state.connectMode = !state.connectMode;
    state.connectSourceId = null;
    if (state.connectMode) {
      setStatus('Connect mode on. Click source, then target.');
    } else {
      setStatus('Connect mode off.');
    }
    syncControls();
    renderCanvas();
  }

  function selectNode(id) {
    state.selectedNodeId = id;
    state.selectedArrowId = null;
    state.detailPreview = null;
  }

  function selectArrow(id) {
    state.selectedArrowId = id;
    state.selectedNodeId = null;
    state.detailPreview = null;
  }

  function clearSelection() {
    state.selectedNodeId = null;
    state.selectedArrowId = null;
    state.detailPreview = null;
  }

  function deleteSelected() {
    if (state.selectedNodeId) {
      const node = findNode(state.selectedNodeId);
      removeNodeById(state.selectedNodeId, node ? `Deleted ${node.label}.` : 'Deleted selected node.');
      return;
    }
    if (state.selectedArrowId) {
      state.arrows = state.arrows.filter((arrow) => arrow.id !== state.selectedArrowId);
      clearSelection();
      setStatus('Deleted selected arrow.');
      renderAll();
      return;
    }
    setStatus('Nothing selected.');
  }

  function removeNodeById(id, message) {
    state.nodes = state.nodes.filter((item) => item.id !== id);
    state.arrows = state.arrows.filter((arrow) => arrow.sourceId !== id && arrow.targetId !== id);
    state.connectSourceId = state.connectSourceId === id ? null : state.connectSourceId;
    clearSelection();
    setStatus(message || 'Removed node.');
    renderAll();
  }

  function nodeOutsideCanvas(node) {
    return node.x < 0 || node.x > state.canvasWidth || node.y < 0 || node.y > state.canvasHeight;
  }

  function clearGraphWithConfirm() {
    if (!state.nodes.length && !state.arrows.length && !state.references.length) {
      setStatus('Graph is already empty.');
      return;
    }
    if (!window.confirm('Clear all nodes, arrows, and references?')) return;
    stopLayout();
    state.nodes = [];
    state.arrows = [];
    state.references = [];
    state.selectedReferenceKeys = new Set();
    state.editingReferenceKey = null;
    if (refs.referenceEditForm) refs.referenceEditForm.hidden = true;
    state.selectedNodeId = null;
    state.selectedArrowId = null;
    state.connectSourceId = null;
    state.connectMode = false;
    state.viewExtra = {};
    setStatus('Cleared graph.');
    setReferenceMessage('No references.');
    renderAll();
  }

  function resetLayout() {
    stopLayout();
    if (!state.nodes.length) {
      setStatus('No nodes to reset.');
      return;
    }
    const centerX = state.canvasWidth / 2;
    const centerY = state.canvasHeight / 2;
    const radius = Math.max(80, Math.min(state.canvasWidth, state.canvasHeight) * 0.32);
    state.nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / state.nodes.length - Math.PI / 2;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
      clampNode(node);
    });
    setStatus('Layout reset.');
    renderAll();
  }

  function toggleLayout() {
    if (state.layoutRunning) {
      stopLayout();
      setStatus('Layout paused.');
    } else {
      startLayout();
    }
    syncControls();
  }

  function startLayout() {
    if (state.nodes.length < 2) {
      setStatus('Add at least two nodes for layout.');
      return;
    }
    state.layoutRunning = true;
    setStatus('Force layout running.');
    syncControls();
    tickLayout();
  }

  function stopLayout() {
    state.layoutRunning = false;
    if (state.animationFrame) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
    syncControls();
  }

  function tickLayout() {
    if (!state.layoutRunning) return;
    applyForces();
    renderCanvas();
    refreshExport();
    state.animationFrame = window.requestAnimationFrame(tickLayout);
  }

  function applyForces() {
    const nodes = state.nodes;
    const padding = 46;
    nodes.forEach((node) => {
      if (!node.fixed) {
        node.vx *= 0.82;
        node.vy *= 0.82;
      }
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const distSq = Math.max(dx * dx + dy * dy, 400);
        const dist = Math.sqrt(distSq);
        const force = Math.min(3.5, 4200 / distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.fixed) {
          a.vx -= fx;
          a.vy -= fy;
        }
        if (!b.fixed) {
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    state.arrows.forEach((arrow) => {
      const source = findNode(arrow.sourceId);
      const target = findNode(arrow.targetId);
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ideal = 220;
      const force = (dist - ideal) * 0.006;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!source.fixed) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.fixed) {
        target.vx -= fx;
        target.vy -= fy;
      }
    });

    const centerX = state.canvasWidth / 2;
    const centerY = state.canvasHeight / 2;
    nodes.forEach((node) => {
      if (!node.fixed) {
        node.vx += (centerX - node.x) * 0.002;
        node.vy += (centerY - node.y) * 0.002;
        node.x += clamp(node.vx, -8, 8);
        node.y += clamp(node.vy, -8, 8);
      }
      node.x = clamp(node.x, padding, state.canvasWidth - padding);
      node.y = clamp(node.y, padding, state.canvasHeight - padding);
      if (node.x <= padding || node.x >= state.canvasWidth - padding) node.vx *= -0.25;
      if (node.y <= padding || node.y >= state.canvasHeight - padding) node.vy *= -0.25;
    });
  }

  function syncEditor() {
    const node = findNode(state.selectedNodeId);
    const arrow = findArrow(state.selectedArrowId);
    const disabled = !node;
    refs.nodeEmptyNote.hidden = !!(node || arrow);
    refs.nodeEditor.hidden = !node;
    if (refs.arrowEditor) refs.arrowEditor.hidden = !arrow;
    [
      refs.nodeType,
      refs.nodeLabel,
      refs.nodeSetting,
      refs.nodeCondition,
      refs.nodeResult,
      refs.nodeColor
    ].forEach((control) => {
      if (control) control.disabled = disabled;
    });
    [
      refs.arrowSource,
      refs.arrowTarget,
      refs.arrowLabel,
      refs.arrowCurve,
      refs.arrowLabelOffset,
      refs.arrowColor
    ].forEach((control) => {
      if (control) control.disabled = !arrow;
    });
    if (refs.detailUpdate) refs.detailUpdate.disabled = !(node || arrow);
    if (!node) {
      refs.nodeType.value = 'theorem';
      refs.nodeLabel.value = '';
      refs.nodeSetting.value = '';
      refs.nodeCondition.value = '';
      refs.nodeResult.value = '';
      if (refs.nodeColor) refs.nodeColor.value = '#3d6b4f';
      populateArrowParentSelects(arrow);
      if (refs.arrowLabel) refs.arrowLabel.value = arrow ? (arrow.label || '') : '';
      if (refs.arrowCurve) refs.arrowCurve.value = arrow ? String(roundNumber(arrow.curve || 0)) : '0';
      if (refs.arrowLabelOffset) refs.arrowLabelOffset.value = arrow ? String(roundNumber(arrow.labelOffset || 0)) : '0';
      if (refs.arrowColor) refs.arrowColor.value = arrow ? normalizeColor(arrow.color, '#5f574e') : '#5f574e';
      return;
    }
    refs.nodeType.value = node.type;
    refs.nodeLabel.value = node.label;
    refs.nodeSetting.value = node.setting;
    refs.nodeCondition.value = node.condition;
    refs.nodeResult.value = node.result;
    if (refs.nodeColor) refs.nodeColor.value = normalizeColor(node.color, NODE_TYPES[node.type].stroke);
    populateArrowParentSelects(null);
    if (refs.arrowLabel) refs.arrowLabel.value = '';
    if (refs.arrowCurve) refs.arrowCurve.value = '0';
    if (refs.arrowLabelOffset) refs.arrowLabelOffset.value = '0';
    if (refs.arrowColor) refs.arrowColor.value = '#5f574e';
  }

  function populateArrowParentSelects(arrow) {
    [refs.arrowSource, refs.arrowTarget].forEach((select) => {
      if (!select) return;
      select.replaceChildren();
      state.nodes.forEach((node) => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.label || node.id;
        select.appendChild(option);
      });
    });
    if (!arrow) return;
    if (refs.arrowSource) refs.arrowSource.value = arrow.sourceId;
    if (refs.arrowTarget) refs.arrowTarget.value = arrow.targetId;
  }

  function previewDetailStyle() {
    const node = findNode(state.selectedNodeId);
    const arrow = findArrow(state.selectedArrowId);
    if (node) {
      state.detailPreview = {
        kind: 'node',
        id: node.id,
        color: normalizeColor(refs.nodeColor ? refs.nodeColor.value : node.color, node.color)
      };
      renderCanvas();
      setStatus('Previewing node color. Press update to save.');
      return;
    }
    if (arrow) {
      state.detailPreview = {
        kind: 'arrow',
        id: arrow.id,
        curve: clamp(finiteNumber(refs.arrowCurve ? refs.arrowCurve.value : arrow.curve, arrow.curve), -160, 160),
        labelOffset: clamp(finiteNumber(refs.arrowLabelOffset ? refs.arrowLabelOffset.value : arrow.labelOffset, arrow.labelOffset), -120, 120),
        color: normalizeColor(refs.arrowColor ? refs.arrowColor.value : arrow.color, arrow.color)
      };
      renderCanvas();
      setStatus('Previewing arrow style. Press update to save.');
    }
  }

  function currentNodeColor(node) {
    if (state.detailPreview?.kind === 'node' && state.detailPreview.id === node.id) {
      return normalizeColor(state.detailPreview.color, node.color);
    }
    return normalizeColor(node.color, (NODE_TYPES[node.type] || NODE_TYPES.theorem).stroke);
  }

  function currentArrowPreview(arrow) {
    if (state.detailPreview?.kind !== 'arrow' || state.detailPreview.id !== arrow.id) return arrow;
    return {
      ...arrow,
      curve: state.detailPreview.curve,
      labelOffset: state.detailPreview.labelOffset,
      color: state.detailPreview.color
    };
  }

  function applyDetailUpdate() {
    const node = findNode(state.selectedNodeId);
    const arrow = findArrow(state.selectedArrowId);
    if (node) {
      const type = normalizeType(refs.nodeType.value);
      node.type = type;
      node.label = cleanString(refs.nodeLabel.value) || node.id;
      node.setting = cleanString(refs.nodeSetting.value);
      node.condition = cleanString(refs.nodeCondition.value);
      node.result = cleanString(refs.nodeResult.value);
      node.color = normalizeColor(refs.nodeColor ? refs.nodeColor.value : node.color, NODE_TYPES[type].stroke);
      state.detailPreview = null;
      setStatus(`Updated ${node.label}.`);
      renderAll();
      return;
    }
    if (arrow) {
      const sourceId = cleanId(refs.arrowSource ? refs.arrowSource.value : arrow.sourceId);
      const targetId = cleanId(refs.arrowTarget ? refs.arrowTarget.value : arrow.targetId);
      if (!findNode(sourceId) || !findNode(targetId)) {
        setStatus('Choose existing parent nodes for the arrow.');
        return;
      }
      if (sourceId === targetId) {
        setStatus('Choose two different parent nodes for the arrow.');
        return;
      }
      arrow.sourceId = sourceId;
      arrow.targetId = targetId;
      arrow.label = cleanString(refs.arrowLabel.value);
      arrow.curve = clamp(finiteNumber(refs.arrowCurve ? refs.arrowCurve.value : arrow.curve, arrow.curve), -160, 160);
      arrow.labelOffset = clamp(finiteNumber(refs.arrowLabelOffset ? refs.arrowLabelOffset.value : arrow.labelOffset, arrow.labelOffset), -120, 120);
      arrow.color = normalizeColor(refs.arrowColor ? refs.arrowColor.value : arrow.color, '#5f574e');
      state.detailPreview = null;
      setStatus(arrow.label ? `Updated arrow ${arrow.label}.` : 'Updated arrow.');
      renderAll();
      return;
    }
    setStatus('Click a node or arrow before updating.');
  }

  function renderReferences() {
    refs.referenceList.replaceChildren();
    syncReferenceMasterCheckbox();
    if (!state.references.length) {
      const empty = document.createElement('div');
      empty.className = 'theorem-empty';
      empty.textContent = 'No references yet.';
      refs.referenceList.appendChild(empty);
      return;
    }
    state.references.forEach((reference) => {
      const item = document.createElement('div');
      item.className = 'theorem-reference-item';

      const body = document.createElement('div');
      const key = document.createElement('div');
      key.className = 'theorem-reference-key';
      key.textContent = `[${reference.key}]`;
      const title = document.createElement('div');
      title.className = 'theorem-reference-title';
      title.textContent = reference.title || 'Untitled reference';
      const meta = document.createElement('div');
      meta.className = 'theorem-reference-meta';
      meta.textContent = referenceMeta(reference);
      const cite = document.createElement('div');
      cite.className = 'theorem-reference-cite';
      cite.textContent = reference.citeText || defaultCiteText(reference.key);
      body.append(key, title, meta, cite);
      if (reference.url) {
        const link = document.createElement('a');
        link.className = 'theorem-reference-link';
        link.href = reference.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = referenceLinkLabel(reference);
        body.appendChild(link);
      }

      const button = document.createElement('button');
      button.className = 'btn btn-ghost theorem-small-button';
      button.type = 'button';
      button.textContent = 'edit';
      button.addEventListener('click', () => {
        openReferenceEdit(reference.key);
      });

      const checkbox = document.createElement('input');
      checkbox.className = 'theorem-reference-checkbox';
      checkbox.type = 'checkbox';
      checkbox.checked = state.selectedReferenceKeys.has(reference.key);
      checkbox.setAttribute('aria-label', `Select reference ${reference.key}`);
      checkbox.addEventListener('change', () => {
        setReferenceSelected(reference.key, checkbox.checked);
      });

      item.append(body, button, checkbox);
      refs.referenceList.appendChild(item);
    });
    syncReferenceMasterCheckbox();
  }

  function openReferenceEdit(key) {
    const reference = state.references.find((item) => item.key === key);
    if (!reference || !refs.referenceEditForm) return;
    state.editingReferenceKey = key;
    refs.referenceEditForm.hidden = false;
    refs.referenceEditKey.value = reference.key;
    refs.referenceEditCite.value = reference.citeText || defaultCiteText(reference.key);
    refs.referenceEditTitle.value = reference.title;
    refs.referenceEditAuthor.value = reference.author;
    refs.referenceEditYear.value = reference.year;
    if (refs.referenceEditUrl) refs.referenceEditUrl.value = reference.url || '';
    if (refs.referenceEditSource) refs.referenceEditSource.value = normalizeReferenceSource(reference.source, reference.url ? inferReferenceSource(reference.url) : 'bibtex');
    refs.referenceEditRaw.value = reference.rawBibtex;
    setReferenceMessage(`Editing [${reference.key}].`);
  }

  function closeReferenceEdit() {
    state.editingReferenceKey = null;
    if (refs.referenceEditForm) refs.referenceEditForm.hidden = true;
    setReferenceMessage('Edit cancelled.');
  }

  function saveReferenceEdit() {
    if (!state.editingReferenceKey) return;
    const original = state.references.find((item) => item.key === state.editingReferenceKey);
    if (!original) {
      closeReferenceEdit();
      return;
    }
    const nextKey = cleanString(refs.referenceEditKey.value);
    if (!nextKey) {
      setReferenceMessage('Reference key is required.', true);
      return;
    }
    if (nextKey !== original.key && state.references.some((item) => item.key === nextKey)) {
      setReferenceMessage(`Reference [${nextKey}] already exists.`, true);
      return;
    }
    original.key = nextKey;
    original.citeText = cleanString(refs.referenceEditCite.value) || defaultCiteText(nextKey);
    original.title = cleanString(refs.referenceEditTitle.value);
    original.author = cleanString(refs.referenceEditAuthor.value);
    original.year = cleanString(refs.referenceEditYear.value);
    original.url = normalizeUrl(refs.referenceEditUrl ? refs.referenceEditUrl.value : original.url);
    original.source = normalizeReferenceSource(refs.referenceEditSource ? refs.referenceEditSource.value : original.source, original.url ? inferReferenceSource(original.url) : 'bibtex');
    original.rawBibtex = cleanString(refs.referenceEditRaw.value);
    if (state.selectedReferenceKeys.has(state.editingReferenceKey)) {
      state.selectedReferenceKeys.delete(state.editingReferenceKey);
      state.selectedReferenceKeys.add(nextKey);
    }
    state.editingReferenceKey = null;
    refs.referenceEditForm.hidden = true;
    setReferenceMessage(`Saved [${nextKey}].`);
    renderAll();
  }

  function deleteSelectedReferences() {
    const selected = state.references.filter((reference) => state.selectedReferenceKeys.has(reference.key));
    if (!selected.length) {
      setReferenceMessage('No references selected.', true);
      return;
    }
    const used = selected.filter((reference) => referenceIsUsed(reference));
    if (used.length) {
      const names = used.map((reference) => `[${reference.key}]`).join(', ');
      const message = `${names} ${used.length === 1 ? 'is' : 'are'} used in nodes or arrows. Delete anyway?`;
      if (!window.confirm(message)) {
        setReferenceMessage('Delete cancelled.');
        return;
      }
    }
    const selectedKeys = new Set(selected.map((reference) => reference.key));
    state.references = state.references.filter((reference) => !selectedKeys.has(reference.key));
    state.selectedReferenceKeys = new Set();
    if (selectedKeys.has(state.editingReferenceKey)) {
      state.editingReferenceKey = null;
      if (refs.referenceEditForm) refs.referenceEditForm.hidden = true;
    }
    setReferenceMessage(`Deleted ${selected.length} reference${selected.length === 1 ? '' : 's'}.`);
    renderAll();
  }

  function referenceIsUsed(reference) {
    const key = cleanString(reference.key);
    const citeText = cleanString(reference.citeText);
    if (!key && !citeText) return false;
    const keyPattern = key ? new RegExp(`\\\\cite(?:\\[[^\\]]*\\])?\\{${escapeRegExp(key)}\\}`) : null;
    return state.nodes.some((node) => objectUsesReference(node, key, citeText, keyPattern))
      || state.arrows.some((arrow) => objectUsesReference(arrow, key, citeText, keyPattern));
  }

  function objectUsesReference(source, key, citeText, keyPattern) {
    if (Array.isArray(source.citationKeys) && key && source.citationKeys.includes(key)) return true;
    const fields = ['label', 'setting', 'condition', 'result'];
    return fields.some((field) => textUsesReference(source[field], key, citeText, keyPattern));
  }

  function textUsesReference(value, key, citeText, keyPattern) {
    const text = cleanString(value);
    if (!text) return false;
    if (citeText && text.includes(citeText)) return true;
    if (keyPattern && keyPattern.test(text)) return true;
    return false;
  }

  function setReferenceSelected(key, selected) {
    if (selected) state.selectedReferenceKeys.add(key);
    else state.selectedReferenceKeys.delete(key);
    syncReferenceMasterCheckbox();
    refreshExport();
  }

  function toggleReferenceSelectionFromMaster() {
    const checked = !!refs.referenceSelectAll.checked;
    state.selectedReferenceKeys = new Set(checked ? state.references.map((reference) => reference.key) : []);
    renderReferences();
    refreshExport();
  }

  function syncReferenceMasterCheckbox() {
    if (!refs.referenceSelectAll) return;
    const keys = new Set(state.references.map((reference) => reference.key));
    state.selectedReferenceKeys = new Set(Array.from(state.selectedReferenceKeys).filter((key) => keys.has(key)));
    const total = state.references.length;
    const selected = state.references.filter((reference) => state.selectedReferenceKeys.has(reference.key)).length;
    refs.referenceSelectAll.checked = total > 0 && selected === total;
    refs.referenceSelectAll.indeterminate = selected > 0 && selected < total;
    refs.referenceSelectAll.disabled = total === 0;
  }

  function addReferencesFromInput() {
    const raw = refs.bibtexInput.value.trim();
    if (!raw) {
      setReferenceMessage('Paste BibTeX before adding.', true);
      return;
    }
    const parsed = parseBibtex(raw);
    if (!parsed.length) {
      setReferenceMessage('No BibTeX entries found.', true);
      return;
    }
    let added = 0;
    let replaced = 0;
    parsed.forEach((entry) => {
      if (!entry.key) return;
      const next = makeReference(entry);
      const index = state.references.findIndex((reference) => reference.key === next.key);
      if (index >= 0) {
        state.references[index] = next;
        replaced += 1;
      } else {
        state.references.push(next);
        added += 1;
      }
    });
    if (!added && !replaced) {
      setReferenceMessage('No entries had usable keys.', true);
      return;
    }
    refs.bibtexInput.value = '';
    setReferenceMessage(`${added} added, ${replaced} replaced.`);
    renderAll();
  }

  function addLinkReferenceFromControls() {
    const url = normalizeUrl(refs.linkReferenceUrl ? refs.linkReferenceUrl.value : '');
    if (!url) {
      setReferenceMessage('Enter a valid link before adding.', true);
      return;
    }
    const inferredSource = refs.linkReferenceSource && refs.linkReferenceSource.value !== 'auto'
      ? refs.linkReferenceSource.value
      : inferReferenceSource(url);
    const title = cleanString(refs.linkReferenceTitle ? refs.linkReferenceTitle.value : '') || defaultLinkTitle(url, inferredSource);
    const key = cleanString(refs.linkReferenceKey ? refs.linkReferenceKey.value : '') || nextReferenceKey(inferredSource);
    if (state.references.some((reference) => reference.key === key)) {
      setReferenceMessage(`Reference [${key}] already exists.`, true);
      return;
    }
    state.references.push(makeReference({
      key,
      title,
      source: inferredSource,
      url,
      citeText: defaultCiteText(key)
    }));
    if (refs.linkReferenceUrl) refs.linkReferenceUrl.value = '';
    if (refs.linkReferenceKey) refs.linkReferenceKey.value = '';
    if (refs.linkReferenceTitle) refs.linkReferenceTitle.value = '';
    if (refs.linkReferenceSource) refs.linkReferenceSource.value = 'auto';
    setReferenceMessage(`Added [${key}].`);
    renderAll();
  }

  function parseBibtex(raw) {
    const entries = [];
    let index = 0;
    while (index < raw.length) {
      const at = raw.indexOf('@', index);
      if (at < 0) break;
      const open = findNextBrace(raw, at + 1);
      if (open < 0) break;
      const closeChar = raw[open] === '(' ? ')' : '}';
      let depth = 1;
      let cursor = open + 1;
      while (cursor < raw.length && depth > 0) {
        const char = raw[cursor];
        if (char === raw[open]) depth += 1;
        else if (char === closeChar) depth -= 1;
        cursor += 1;
      }
      if (depth !== 0) break;
      const rawEntry = raw.slice(at, cursor);
      const content = raw.slice(open + 1, cursor - 1);
      const comma = topLevelComma(content);
      if (comma >= 0) {
        const key = cleanString(content.slice(0, comma));
        const fields = parseBibtexFields(content.slice(comma + 1));
        entries.push({
          key,
          author: fields.author || '',
          title: fields.title || '',
          year: fields.year || '',
          url: fields.url || '',
          source: fields.url ? inferReferenceSource(fields.url) : 'bibtex',
          citeText: defaultCiteText(key),
          rawBibtex: rawEntry
        });
      }
      index = cursor;
    }
    return entries;
  }

  function findNextBrace(text, start) {
    for (let i = start; i < text.length; i += 1) {
      if (text[i] === '{' || text[i] === '(') return i;
    }
    return -1;
  }

  function topLevelComma(text) {
    let depth = 0;
    let quote = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"' && text[i - 1] !== '\\') quote = !quote;
      if (quote) continue;
      if (char === '{' || char === '(') depth += 1;
      else if (char === '}' || char === ')') depth = Math.max(0, depth - 1);
      else if (char === ',' && depth === 0) return i;
    }
    return -1;
  }

  function parseBibtexFields(body) {
    const fields = {};
    let cursor = 0;
    while (cursor < body.length) {
      while (cursor < body.length && /[\s,]/.test(body[cursor])) cursor += 1;
      const keyStart = cursor;
      while (cursor < body.length && /[A-Za-z0-9_-]/.test(body[cursor])) cursor += 1;
      const key = body.slice(keyStart, cursor).toLowerCase();
      while (cursor < body.length && /\s/.test(body[cursor])) cursor += 1;
      if (!key || body[cursor] !== '=') {
        cursor += 1;
        continue;
      }
      cursor += 1;
      while (cursor < body.length && /\s/.test(body[cursor])) cursor += 1;
      const parsed = readBibtexValue(body, cursor);
      if (key) fields[key] = parsed.value;
      cursor = parsed.next;
    }
    return fields;
  }

  function readBibtexValue(body, start) {
    if (body[start] === '{' || body[start] === '(') {
      const open = body[start];
      const close = open === '(' ? ')' : '}';
      let depth = 1;
      let cursor = start + 1;
      while (cursor < body.length && depth > 0) {
        if (body[cursor] === open) depth += 1;
        else if (body[cursor] === close) depth -= 1;
        cursor += 1;
      }
      return { value: cleanBibtexValue(body.slice(start + 1, cursor - 1)), next: cursor };
    }
    if (body[start] === '"') {
      let cursor = start + 1;
      while (cursor < body.length) {
        if (body[cursor] === '"' && body[cursor - 1] !== '\\') break;
        cursor += 1;
      }
      return { value: cleanBibtexValue(body.slice(start + 1, cursor)), next: cursor + 1 };
    }
    let cursor = start;
    while (cursor < body.length && body[cursor] !== ',') cursor += 1;
    return { value: cleanBibtexValue(body.slice(start, cursor)), next: cursor };
  }

  function cleanBibtexValue(value) {
    return cleanString(value)
      .replace(/\s+/g, ' ')
      .replace(/[{}]/g, '')
      .trim();
  }

  function refreshExport() {
    if (!refs.exportOut) return;
    refs.exportOut.value = JSON.stringify(buildExport(), null, 2);
    syncControls();
  }

  function buildExport() {
    return {
      schemaVersion: SCHEMA_VERSION,
      nodes: state.nodes.map((node) => ({
        ...node.extra,
        id: node.id,
        type: node.type,
        label: node.label,
        setting: node.setting,
        condition: node.condition,
        result: node.result,
        citationKeys: [...node.citationKeys],
        color: node.color,
        x: roundNumber(node.x),
        y: roundNumber(node.y)
      })),
      arrows: state.arrows.map((arrow) => ({
        ...arrow.extra,
        id: arrow.id,
        sourceId: arrow.sourceId,
        targetId: arrow.targetId,
        label: arrow.label,
        curve: roundNumber(arrow.curve || 0),
        labelOffset: roundNumber(arrow.labelOffset || 0),
        color: arrow.color
      })),
      references: state.references.map((reference) => ({
        ...reference.extra,
        key: reference.key,
        author: reference.author,
        title: reference.title,
        year: reference.year,
        citeText: reference.citeText || defaultCiteText(reference.key),
        url: reference.url,
        source: reference.source,
        rawBibtex: reference.rawBibtex
      })),
      view: {
        ...state.viewExtra,
        selectedId: state.selectedNodeId || '',
        selectedReferenceKeys: state.references
          .filter((reference) => state.selectedReferenceKeys.has(reference.key))
          .map((reference) => reference.key),
        layoutRunning: false
      }
    };
  }

  function copyExport() {
    refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => setExportMessage('Export copied.'))
        .catch(() => fallbackCopyExport());
      return;
    }
    fallbackCopyExport();
  }

  function fallbackCopyExport() {
    refs.exportOut.focus();
    refs.exportOut.select();
    try {
      document.execCommand('copy');
      setExportMessage('Export copied.');
    } catch (_) {
      setExportMessage('Copy failed; select the export text manually.', true);
    }
  }

  function loadImport() {
    const raw = refs.importInput.value.trim();
    if (!raw) {
      setExportMessage('Paste exported JSON before loading.', true);
      return;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      setExportMessage(`Invalid JSON: ${error.message}`, true);
      return;
    }

    try {
      const next = normalizeImport(data);
      stopLayout();
      state.nodes = next.nodes;
      state.arrows = next.arrows;
      state.references = next.references;
      state.selectedReferenceKeys = next.selectedReferenceKeys;
      state.editingReferenceKey = null;
      if (refs.referenceEditForm) refs.referenceEditForm.hidden = true;
      state.selectedNodeId = next.selectedNodeId;
      state.selectedArrowId = null;
      state.connectMode = false;
      state.connectSourceId = null;
      state.viewExtra = next.viewExtra;
      state.nodeSerial = nextSerial(state.nodes.map((node) => node.id), 'n');
      state.arrowSerial = nextSerial(state.arrows.map((arrow) => arrow.id), 'a');
      clampAllNodes();
      setExportMessage(`Loaded ${state.nodes.length} nodes and ${state.arrows.length} arrows.`);
      setStatus('Imported graph.');
      renderAll();
    } catch (error) {
      setExportMessage(error.message, true);
    }
  }

  function normalizeImport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Import must be a JSON object.');
    }
    if (data.schemaVersion && Number(data.schemaVersion) > SCHEMA_VERSION) {
      setExportMessage(`Newer schema ${data.schemaVersion}; preserving known fields.`, true);
    }
    const rawNodes = Array.isArray(data.nodes) ? data.nodes : [];
    const rawArrows = Array.isArray(data.arrows) ? data.arrows : [];
    const rawReferences = Array.isArray(data.references) ? data.references : [];
    const ids = new Set();
    const nodes = [];
    rawNodes.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const id = cleanId(entry.id);
      if (!id || ids.has(id)) return;
      const node = makeNode({
        ...entry,
        label: cleanString(entry.label) || `Node ${index + 1}`,
        x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : state.canvasWidth / 2,
        y: Number.isFinite(Number(entry.y)) ? Number(entry.y) : state.canvasHeight / 2
      });
      nodes.push(node);
      ids.add(id);
    });

    const arrows = [];
    const arrowIds = new Set();
    rawArrows.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const sourceId = cleanId(entry.sourceId);
      const targetId = cleanId(entry.targetId);
      if (!ids.has(sourceId) || !ids.has(targetId) || sourceId === targetId) return;
      let id = cleanId(entry.id);
      if (!id || arrowIds.has(id)) id = nextImportedId(arrowIds, 'a');
      const arrow = makeArrow({ ...entry, id, sourceId, targetId });
      arrows.push(arrow);
      arrowIds.add(id);
    });

    const references = [];
    const referenceKeys = new Set();
    rawReferences.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const key = cleanString(entry.key);
      if (!key || referenceKeys.has(key)) return;
      references.push(makeReference({ ...entry, key }));
      referenceKeys.add(key);
    });

    const view = data.view && typeof data.view === 'object' && !Array.isArray(data.view) ? data.view : {};
    const selectedId = cleanId(view.selectedId);
    const selectedReferenceKeys = new Set(
      (Array.isArray(view.selectedReferenceKeys) ? view.selectedReferenceKeys : [])
        .map(cleanString)
        .filter((key) => referenceKeys.has(key))
    );
    const viewExtra = { ...view };
    delete viewExtra.selectedId;
    delete viewExtra.selectedReferenceKeys;
    delete viewExtra.layoutRunning;
    return {
      nodes,
      arrows,
      references,
      selectedNodeId: ids.has(selectedId) ? selectedId : (nodes[0] ? nodes[0].id : null),
      selectedReferenceKeys,
      viewExtra
    };
  }

  function nextImportedId(used, prefix) {
    let index = 1;
    let id = `${prefix}${index}`;
    while (used.has(id)) {
      index += 1;
      id = `${prefix}${index}`;
    }
    return id;
  }

  function nextSerial(ids, prefix) {
    let serial = 1;
    ids.forEach((id) => {
      const match = new RegExp(`^${prefix}(\\d+)$`).exec(id);
      if (match) serial = Math.max(serial, Number(match[1]) + 1);
    });
    return serial;
  }

  function syncControls() {
    const selectedNode = findNode(state.selectedNodeId);
    const selectedArrow = findArrow(state.selectedArrowId);
    if (refs.graphCountBadge) {
      refs.graphCountBadge.textContent = `${state.nodes.length} node${state.nodes.length === 1 ? '' : 's'}, ${state.arrows.length} arrow${state.arrows.length === 1 ? '' : 's'}`;
    }
    if (refs.connectBadge) {
      refs.connectBadge.textContent = state.connectMode
        ? (state.connectSourceId ? 'choose target' : 'choose source')
        : (selectedNode ? selectedNode.label : (selectedArrow ? 'arrow selected' : 'select'));
      refs.connectBadge.classList.toggle('is-active', state.connectMode);
    }
    if (refs.connectMode) {
      refs.connectMode.textContent = state.connectMode ? 'cancel connect' : 'connect';
      refs.connectMode.setAttribute('aria-pressed', state.connectMode ? 'true' : 'false');
    }
    if (refs.toggleLayout) refs.toggleLayout.textContent = state.layoutRunning ? 'pause layout' : 'run layout';
    if (refs.deleteSelected) refs.deleteSelected.disabled = !(selectedNode || selectedArrow);
    if (refs.deleteSelectedReferences) refs.deleteSelectedReferences.disabled = state.selectedReferenceKeys.size === 0;
    if (refs.graphHelp) {
      refs.graphHelp.textContent = selectedArrow
        ? 'Selected arrow: edit parents, curve, label, offset, and color in the Node / Arrow card.'
        : 'Connect mode: click the source node, then the target node.';
    }
    if (refs.summary) {
      const selectedRefs = state.references.filter((reference) => state.selectedReferenceKeys.has(reference.key)).length;
      refs.summary.textContent = `${state.references.length} reference${state.references.length === 1 ? '' : 's'}, ${selectedRefs} selected`;
    }
  }

  function setStatus(message) {
    if (refs.status) refs.status.textContent = message;
  }

  function setReferenceMessage(message, error = false) {
    if (!refs.referenceMessage) return;
    refs.referenceMessage.textContent = message;
    refs.referenceMessage.classList.toggle('theorem-danger', !!error);
  }

  function setExportMessage(message, error = false) {
    if (!refs.exportMessage) return;
    refs.exportMessage.textContent = message;
    refs.exportMessage.classList.toggle('theorem-danger', !!error);
  }

  function findNode(id) {
    return state.nodes.find((node) => node.id === id) || null;
  }

  function findArrow(id) {
    return state.arrows.find((arrow) => arrow.id === id) || null;
  }

  function clampAllNodes() {
    state.nodes.forEach(clampNode);
  }

  function clampNode(node) {
    node.x = clamp(node.x, 46, Math.max(46, state.canvasWidth - 46));
    node.y = clamp(node.y, 46, Math.max(46, state.canvasHeight - 46));
  }

  function normalizeType(type) {
    return NODE_TYPE_KEYS.includes(type) ? type : 'theorem';
  }

  function normalizeCitationKeys(value) {
    if (Array.isArray(value)) {
      return uniqueStrings(value.map(cleanString).filter(Boolean));
    }
    return uniqueStrings(cleanString(value).split(/[,\s;]+/).map(cleanString).filter(Boolean));
  }

  function referenceMeta(reference) {
    const source = referenceSourceLabel(reference.source);
    const details = [reference.author, reference.year].filter(Boolean).join(' - ');
    return [source, details].filter(Boolean).join(' - ') || 'metadata not parsed';
  }

  function referenceLinkLabel(reference) {
    const source = referenceSourceLabel(reference.source);
    return source ? `open ${source}` : 'open link';
  }

  function referenceSourceLabel(source) {
    const labels = {
      bibtex: 'BibTeX',
      web: 'Web',
      mathoverflow: 'MathOverflow',
      'math-stackexchange': 'Math StackExchange',
      'stacks-project': 'Stacks Project'
    };
    return labels[normalizeReferenceSource(source, '')] || '';
  }

  function normalizeReferenceSource(source, fallback) {
    const value = cleanString(source).toLowerCase();
    const allowed = ['bibtex', 'web', 'mathoverflow', 'math-stackexchange', 'stacks-project'];
    return allowed.includes(value) ? value : (fallback == null ? 'web' : fallback);
  }

  function inferReferenceSource(url) {
    const text = cleanString(url).toLowerCase();
    if (text.includes('mathoverflow.net')) return 'mathoverflow';
    if (text.includes('math.stackexchange.com')) return 'math-stackexchange';
    if (text.includes('stacks.math.columbia.edu')) return 'stacks-project';
    return 'web';
  }

  function normalizeUrl(value) {
    const text = cleanString(value);
    if (!text) return '';
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      try {
        const url = new URL(`https://${text}`);
        return url.hostname.includes('.') ? url.href : '';
      } catch (_) {
        return '';
      }
    }
  }

  function defaultLinkTitle(url, source) {
    const sourceLabel = referenceSourceLabel(source);
    if (sourceLabel) return sourceLabel;
    try {
      return new URL(url).hostname;
    } catch (_) {
      return 'Linked reference';
    }
  }

  function nextReferenceKey(source) {
    const prefixMap = {
      mathoverflow: 'mo',
      'math-stackexchange': 'mse',
      'stacks-project': 'stacks',
      web: 'link',
      bibtex: 'ref'
    };
    const prefix = prefixMap[normalizeReferenceSource(source, 'web')] || 'link';
    let index = state.references.length + 1;
    let key = `${prefix}${index}`;
    while (state.references.some((reference) => reference.key === key)) {
      index += 1;
      key = `${prefix}${index}`;
    }
    return key;
  }

  function defaultCiteText(key) {
    const clean = cleanString(key);
    return clean ? `\\cite{${clean}}` : '';
  }

  function escapeRegExp(value) {
    return cleanString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function uniqueStrings(values) {
    const seen = new Set();
    const result = [];
    values.forEach((value) => {
      if (seen.has(value)) return;
      seen.add(value);
      result.push(value);
    });
    return result;
  }

  function nextDefaultNodeLabel(type) {
    const label = (NODE_TYPES[normalizeType(type)] || NODE_TYPES.theorem).label;
    const count = state.nodes.filter((node) => node.type === normalizeType(type)).length + 1;
    return `${label} ${count}`;
  }

  function cleanId(value) {
    return cleanString(value).replace(/\s+/g, '-');
  }

  function cleanString(value) {
    return value == null ? '' : String(value).trim();
  }

  function plainLabel(value) {
    return cleanString(value)
      .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
      .replace(/[{}]/g, '')
      .replace(/\\/g, '');
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return cleanString(value).replace(/["\\]/g, '\\$&');
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeColor(value, fallback) {
    const color = cleanString(value);
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundNumber(value) {
    return Math.round(value * 10) / 10;
  }

  function truncateText(value, limit) {
    const text = cleanString(value);
    return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
  }
})();
