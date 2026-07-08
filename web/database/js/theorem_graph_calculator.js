(() => {
  'use strict';

  const SCHEMA_VERSION = 4;
  const DEFAULT_GRAPH_TITLE = 'Dependency Graph';
  const PRESET_FOLDER_URL = 'theorem_graph_presets/';
  const DEFAULT_PRESET_KEY = 'corrections_wait';
  const DEFAULT_NODE_STROKE = '#7a6f65';
  const DEFAULT_NODE_FILL = '#f7f5f1';
  const NODE_TYPES = {
    theorem: { label: 'Theorem', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    lemma: { label: 'Lemma', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    proposition: { label: 'Proposition', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    corollary: { label: 'Corollary', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    conjecture: { label: 'Conjecture', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    definition: { label: 'Definition', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    example: { label: 'Example', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE },
    misc: { label: 'Misc', fill: DEFAULT_NODE_FILL, stroke: DEFAULT_NODE_STROKE, band: DEFAULT_NODE_STROKE }
  };
  const NODE_TYPE_KEYS = Object.keys(NODE_TYPES);
  const LEGACY_NODE_DETAIL_FIELDS = [
    { key: 'setting', label: 'setting' },
    { key: 'condition', label: 'condition' },
    { key: 'result', label: 'result' },
    { key: 'proofSketch', label: 'proof sketch' }
  ];
  const MISC_DETAIL_TYPES = new Set(['textbox', 'list', 'enumeration', 'checkbox']);
  const KNOWN_NODE_KEYS = new Set([
    'id',
    'type',
    'label',
    'setting',
    'condition',
    'result',
    'proofSketch',
    'details',
    'citationKeys',
    'color',
    'fillColor',
    'x',
    'y'
  ]);
  const KNOWN_ARROW_KEYS = new Set(['id', 'sourceId', 'targetId', 'label', 'remark', 'style', 'body', 'head', 'tail', 'level', 'endpointScale', 'curve', 'labelOffset', 'color']);
  const KNOWN_REFERENCE_KEYS = new Set(['key', 'author', 'title', 'year', 'citeText', 'url', 'source', 'rawBibtex', 'links']);
  const ARROW_BODIES = [
    { id: 'none', label: 'none' },
    { id: 'solid', label: 'solid' },
    { id: 'dashed', label: 'dashed' },
    { id: 'dotted', label: 'dotted' },
    { id: 'wavy', label: 'wavy' }
  ];
  const ARROW_HEADS = [
    { id: 'arrow', label: 'arrow' },
    { id: 'none', label: 'none' },
    { id: 'twohead', label: 'two-head' },
    { id: 'bar', label: 'bar' },
    { id: 'harpoon-up', label: 'harpoon up' },
    { id: 'harpoon-down', label: 'harpoon down' }
  ];
  const ARROW_TAILS = [
    { id: 'none', label: 'none' },
    { id: 'arrow', label: 'arrow' },
    { id: 'bar', label: 'bar' },
    { id: 'hook', label: 'hook' },
    { id: 'harpoon-up', label: 'harpoon up' },
    { id: 'harpoon-down', label: 'harpoon down' }
  ];
  const ARROW_BODY_IDS = new Set(ARROW_BODIES.map((item) => item.id));
  const ARROW_HEAD_IDS = new Set(ARROW_HEADS.map((item) => item.id));
  const ARROW_TAIL_IDS = new Set(ARROW_TAILS.map((item) => item.id));
  const ARROW_RENDER_METRICS = {
    headSize: 8,
    headSpacing: 2,
    barSize: 6.5,
    hookBack: 9,
    hookShoulder: 4.6,
    hookTip: 5.8,
    bodyLineGap: 5.2,
    waveAmplitude: 2.6,
    waveLength: 14
  };
  const ARROW_LEVEL_MIN = 1;
  const ARROW_LEVEL_MAX = 4;
  const ARROW_LEVEL_DEFAULT = 1;
  const ARROW_ENDPOINT_SCALE_DEFAULT = 1;
  const ARROW_ENDPOINT_SCALE_MIN = 0.8;
  const ARROW_ENDPOINT_SCALE_MAX = 2;
  const ARROW_BOUNDARY_GAP_DEFAULT = 10;
  const ARROW_BOUNDARY_GAP_MIN = 0;
  const ARROW_BOUNDARY_GAP_MAX = 48;
  const NODE_FILL_SATURATION_DEFAULT = 210;
  const NODE_FILL_SATURATION_MIN = 0;
  const NODE_FILL_SATURATION_MAX = 300;
  const ARROW_STYLES = [
    { id: 'arrow', label: 'solid arrow', body: 'solid', head: 'arrow', tail: 'none' },
    { id: 'plain', label: 'plain line', body: 'solid', head: 'none', tail: 'none' },
    { id: 'dashed', label: 'dashed arrow', body: 'dashed', head: 'arrow', tail: 'none' },
    { id: 'dotted', label: 'dotted arrow', body: 'dotted', head: 'arrow', tail: 'none' },
    { id: 'wavy', label: 'wavy arrow', body: 'wavy', head: 'arrow', tail: 'none' },
    { id: 'double', label: 'double arrow', body: 'solid', head: 'arrow', tail: 'none', level: 2, migratedLevel: 2 },
    { id: 'double-dashed', label: 'double dashed arrow', body: 'dashed', head: 'arrow', tail: 'none', level: 2, migratedLevel: 2 },
    { id: 'triple', label: 'triple arrow', body: 'solid', head: 'arrow', tail: 'none', level: 3, migratedLevel: 3 },
    { id: 'twohead', label: 'two-headed arrow', body: 'solid', head: 'twohead', tail: 'none' },
    { id: 'hook', label: 'hook arrow', body: 'solid', head: 'arrow', tail: 'hook' },
    { id: 'dashed-hook', label: 'dashed hook arrow', body: 'dashed', head: 'arrow', tail: 'hook' },
    { id: 'mapsto', label: 'mapsto arrow', body: 'solid', head: 'arrow', tail: 'bar' },
    { id: 'bar', label: 'barred arrow', body: 'solid', head: 'bar', tail: 'none' },
    { id: 'bar-both', label: 'barred line', body: 'solid', head: 'bar', tail: 'bar' },
    { id: 'two-way', label: 'two-way arrow', body: 'solid', head: 'arrow', tail: 'arrow' },
    { id: 'dashed-two-way', label: 'dashed two-way arrow', body: 'dashed', head: 'arrow', tail: 'arrow' },
    { id: 'harpoon-up', label: 'harpoon up', body: 'solid', head: 'harpoon-up', tail: 'none' },
    { id: 'harpoon-down', label: 'harpoon down', body: 'solid', head: 'harpoon-down', tail: 'none' },
    { id: 'leftharpoon-up', label: 'left harpoon up', body: 'solid', head: 'none', tail: 'harpoon-up' },
    { id: 'leftharpoon-down', label: 'left harpoon down', body: 'solid', head: 'none', tail: 'harpoon-down' },
    { id: 'wavy-line', label: 'wavy line', body: 'wavy', head: 'none', tail: 'none' },
    { id: 'dotted-line', label: 'dotted line', body: 'dotted', head: 'none', tail: 'none' }
  ];
  const ARROW_STYLE_MAP = new Map(ARROW_STYLES.map((style) => [style.id, style]));
  const NODE_DETAIL_LATEX_FIELDS = [
    { key: 'setting', inputRef: 'nodeSetting', previewRef: 'nodeSettingPreview' },
    { key: 'condition', inputRef: 'nodeCondition', previewRef: 'nodeConditionPreview' },
    { key: 'result', inputRef: 'nodeResult', previewRef: 'nodeResultPreview' },
    { key: 'proofSketch', inputRef: 'nodeProofSketch', previewRef: 'nodeProofSketchPreview' }
  ];
  const TEXTAREA_AUTO_MAX_HEIGHT = 180;

  const state = {
    graphTitle: DEFAULT_GRAPH_TITLE,
    importMode: 'preset',
    presets: [],
    presetScriptNonce: '',
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
    detailPreview: null,
    detailEditBaseline: null,
    activeLatexDetailField: null,
    arrowBoundaryGap: ARROW_BOUNDARY_GAP_DEFAULT,
    nodeFillSaturation: NODE_FILL_SATURATION_DEFAULT,
    cleanExportSignature: ''
  };

  const refs = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheRefs();
    populateArrowPartPickers();
    bindEvents();
    resizeCanvas();
    loadPresetRegistry();
    renderAll();
    loadDefaultPreset();

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
    refs.graphTitle = $('graph-title');
    refs.clearGraph = $('clear-graph');
    refs.nodeEmptyNote = $('node-empty-note');
    refs.nodeEditor = $('node-editor');
    refs.nodeType = $('node-type');
    refs.nodeLabel = $('node-label');
    refs.nodeFixedDetailRows = Array.from(document.querySelectorAll('[data-node-fixed-detail]'));
    refs.nodeSetting = $('node-setting');
    refs.nodeCondition = $('node-condition');
    refs.nodeResult = $('node-result');
    refs.nodeProofSketch = $('node-proof-sketch');
    refs.nodeSettingPreview = $('node-setting-preview');
    refs.nodeConditionPreview = $('node-condition-preview');
    refs.nodeResultPreview = $('node-result-preview');
    refs.nodeProofSketchPreview = $('node-proof-sketch-preview');
    refs.nodeMiscEditor = $('node-misc-editor');
    refs.nodeMiscDetailName = $('node-misc-detail-name');
    refs.nodeMiscDetailType = $('node-misc-detail-type');
    refs.nodeMiscDetailList = $('node-misc-detail-list');
    refs.addNodeMiscDetail = $('add-node-misc-detail');
    refs.nodeColor = $('node-color');
    refs.nodeFillColor = $('node-fill-color');
    refs.arrowEditor = $('arrow-editor');
    refs.arrowSource = $('arrow-source');
    refs.arrowTarget = $('arrow-target');
    refs.arrowLabel = $('arrow-label');
    refs.arrowRemark = $('arrow-remark');
    refs.arrowBodyPicker = $('arrow-body-picker');
    refs.arrowHeadPicker = $('arrow-head-picker');
    refs.arrowTailPicker = $('arrow-tail-picker');
    refs.arrowLevel = $('arrow-level');
    refs.arrowLevelValue = $('arrow-level-value');
    refs.arrowEndpointScale = $('arrow-endpoint-scale');
    refs.arrowEndpointScaleValue = $('arrow-endpoint-scale-value');
    refs.arrowCurve = $('arrow-curve');
    refs.arrowLabelOffset = $('arrow-label-offset');
    refs.arrowColor = $('arrow-color');
    refs.detailUpdate = $('detail-update');
    refs.detailCancel = $('detail-cancel');
    refs.newNodeType = $('new-node-type');
    refs.newNodeLabel = $('new-node-label');
    refs.addNode = $('add-node');
    refs.connectMode = $('connect-mode');
    refs.deleteSelected = $('delete-selected');
    refs.toggleLayout = $('toggle-layout');
    refs.resetLayout = $('reset-layout');
    refs.arrowBoundaryGap = $('arrow-boundary-gap');
    refs.arrowBoundaryGapValue = $('arrow-boundary-gap-value');
    refs.nodeFillSaturation = $('node-fill-saturation');
    refs.nodeFillSaturationValue = $('node-fill-saturation-value');
    refs.graphHelp = $('graph-help');
    refs.bibtexInput = $('bibtex-input');
    refs.addReference = $('add-reference');
    refs.linkReferenceUrl = $('link-reference-url');
    refs.linkReferenceKey = $('link-reference-key');
    refs.linkReferenceTitle = $('link-reference-title');
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
    refs.referenceEditLinks = $('reference-edit-links');
    refs.referenceEditLinkLabel = $('reference-edit-link-label');
    refs.referenceEditLinkUrl = $('reference-edit-link-url');
    refs.referenceEditAddLink = $('reference-edit-add-link');
    refs.referenceEditRaw = $('reference-edit-raw');
    refs.referenceEditSave = $('reference-edit-save');
    refs.referenceEditCancel = $('reference-edit-cancel');
    refs.referenceList = $('reference-list');
    refs.exportOut = $('theorem-export-out');
    refs.refreshExport = $('refresh-export');
    refs.copyExport = $('copy-export');
    refs.importInput = $('theorem-import-input');
    refs.importModePreset = $('import-mode-preset');
    refs.importModeJson = $('import-mode-json');
    refs.presetImportRow = $('preset-import-row');
    refs.jsonImportPanel = $('json-import-panel');
    refs.presetSelect = $('preset-select');
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
    if (refs.addNodeMiscDetail) refs.addNodeMiscDetail.addEventListener('click', addMiscDetailFromControls);
    if (refs.connectMode) refs.connectMode.addEventListener('click', toggleConnectMode);
    if (refs.deleteSelected) refs.deleteSelected.addEventListener('click', deleteSelected);
    if (refs.toggleLayout) refs.toggleLayout.addEventListener('click', toggleLayout);
    if (refs.resetLayout) refs.resetLayout.addEventListener('click', resetLayout);
    [refs.arrowBoundaryGap, refs.nodeFillSaturation].forEach((control) => {
      if (!control) return;
      control.addEventListener('input', updateDebugRenderSettings);
      control.addEventListener('change', updateDebugRenderSettings);
    });
    if (refs.addReference) refs.addReference.addEventListener('click', addReferencesFromInput);
    if (refs.addLinkReference) refs.addLinkReference.addEventListener('click', addLinkReferenceFromControls);
    if (refs.clearBibtex) refs.clearBibtex.addEventListener('click', () => {
      refs.bibtexInput.value = '';
      clearLinkReferenceControls();
      setReferenceMessage('Reference inputs cleared.');
    });
    if (refs.deleteSelectedReferences) refs.deleteSelectedReferences.addEventListener('click', deleteSelectedReferences);
    if (refs.referenceSelectAll) {
      refs.referenceSelectAll.addEventListener('change', toggleReferenceSelectionFromMaster);
    }
    if (refs.referenceEditAddLink) refs.referenceEditAddLink.addEventListener('click', addReferenceEditLinkFromDraft);
    [refs.referenceEditLinkLabel, refs.referenceEditLinkUrl].forEach((control) => {
      if (!control) return;
      control.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          addReferenceEditLinkFromDraft();
        }
      });
    });
    if (refs.referenceEditSave) refs.referenceEditSave.addEventListener('click', saveReferenceEdit);
    if (refs.referenceEditCancel) refs.referenceEditCancel.addEventListener('click', closeReferenceEdit);
    if (refs.refreshExport) refs.refreshExport.addEventListener('click', () => {
      refreshExport();
      setExportMessage('Export refreshed.');
    });
    if (refs.copyExport) refs.copyExport.addEventListener('click', copyExport);
    if (refs.graphTitle) {
      refs.graphTitle.addEventListener('input', () => {
        state.graphTitle = refs.graphTitle.value;
        refreshExport();
      });
      refs.graphTitle.addEventListener('blur', () => {
        state.graphTitle = cleanGraphTitle(refs.graphTitle.value);
        refs.graphTitle.value = state.graphTitle;
        refreshExport();
      });
    }
    if (refs.importModePreset) refs.importModePreset.addEventListener('change', () => setImportMode('preset'));
    if (refs.importModeJson) refs.importModeJson.addEventListener('change', () => setImportMode('json'));
    if (refs.presetSelect) refs.presetSelect.addEventListener('change', syncControls);
    if (refs.loadImport) refs.loadImport.addEventListener('click', loadImport);
    if (refs.clearImport) refs.clearImport.addEventListener('click', () => {
      refs.importInput.value = '';
      setExportMessage('Import input cleared.');
    });

    if (refs.detailUpdate) refs.detailUpdate.addEventListener('click', () => applyDetailUpdate({ manual: true }));
    if (refs.detailCancel) refs.detailCancel.addEventListener('click', cancelDetailEdit);
    window.addEventListener('beforeunload', handleBeforeUnload);
    bindLatexDetailPreviewEvents();
    bindAutoResizeTextareas();
    [
      refs.nodeType,
      refs.nodeLabel,
      refs.nodeSetting,
      refs.nodeCondition,
      refs.nodeResult,
      refs.nodeProofSketch,
      refs.nodeColor,
      refs.nodeFillColor,
      refs.arrowSource,
      refs.arrowTarget,
      refs.arrowLabel,
      refs.arrowRemark,
      refs.arrowLevel,
      refs.arrowEndpointScale,
      refs.arrowCurve,
      refs.arrowLabelOffset,
      refs.arrowColor
    ].forEach((control) => {
      if (!control) return;
      control.addEventListener('input', autoApplyDetailUpdate);
      control.addEventListener('change', autoApplyDetailUpdate);
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

  function populateArrowPartPickers() {
    populateArrowPartPicker(refs.arrowTailPicker, 'tail', ARROW_TAILS);
    populateArrowPartPicker(refs.arrowBodyPicker, 'body', ARROW_BODIES);
    populateArrowPartPicker(refs.arrowHeadPicker, 'head', ARROW_HEADS);
  }

  function populateArrowPartPicker(picker, part, options) {
    if (!picker) return;
    picker.replaceChildren();
    picker.dataset.label = part;
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theorem-arrow-part-button';
      button.dataset.arrowPart = part;
      button.dataset.arrowValue = option.id;
      button.title = option.label;
      button.setAttribute('aria-label', `${part}: ${option.label}`);
      button.innerHTML = arrowPartIconSvg(part, option.id);
      button.addEventListener('click', () => {
        setArrowPartValue(part, option.id);
        autoApplyDetailUpdate();
      });
      picker.appendChild(button);
    });
  }

  function setArrowPartValue(part, value) {
    const picker = arrowPartPicker(part);
    if (!picker) return;
    const normalized = normalizeArrowPart(part, value);
    picker.dataset.value = normalized;
    syncArrowPartPickerButtons(part, normalized, false);
  }

  function getArrowPartValue(part, fallback) {
    const picker = arrowPartPicker(part);
    return normalizeArrowPart(part, picker ? picker.dataset.value : fallback, fallback);
  }

  function setArrowLevelControl(value, disabled = false) {
    const level = normalizeArrowLevel(value);
    if (refs.arrowLevel) {
      refs.arrowLevel.value = String(level);
      refs.arrowLevel.disabled = !!disabled;
    }
    syncArrowLevelValue(level);
  }

  function getArrowLevelValue(fallback = ARROW_LEVEL_DEFAULT) {
    return normalizeArrowLevel(refs.arrowLevel ? refs.arrowLevel.value : fallback);
  }

  function syncArrowLevelValue(value) {
    if (!refs.arrowLevelValue) return;
    refs.arrowLevelValue.textContent = String(normalizeArrowLevel(value));
  }

  function setArrowEndpointScaleControl(value, disabled = false) {
    const scale = normalizeArrowEndpointScale(value);
    if (refs.arrowEndpointScale) {
      refs.arrowEndpointScale.value = scale.toFixed(2);
      refs.arrowEndpointScale.disabled = !!disabled;
    }
    syncArrowEndpointScaleValue(scale);
  }

  function getArrowEndpointScaleValue(fallback = ARROW_ENDPOINT_SCALE_DEFAULT) {
    return normalizeArrowEndpointScale(refs.arrowEndpointScale ? refs.arrowEndpointScale.value : fallback);
  }

  function syncArrowEndpointScaleValue(value) {
    if (!refs.arrowEndpointScaleValue) return;
    refs.arrowEndpointScaleValue.textContent = `${normalizeArrowEndpointScale(value).toFixed(2)}x`;
  }

  function syncArrowPartPickers(arrow, disabled = false) {
    const style = arrowStyleFromArrow(arrow || {});
    setArrowPartPickerValue('body', style.body, disabled);
    setArrowPartPickerValue('head', style.head, disabled);
    setArrowPartPickerValue('tail', style.tail, disabled);
  }

  function setArrowPartPickerValue(part, value, disabled) {
    const picker = arrowPartPicker(part);
    if (!picker) return;
    const normalized = normalizeArrowPart(part, value);
    picker.dataset.value = normalized;
    syncArrowPartPickerButtons(part, normalized, disabled);
  }

  function syncArrowPartPickerButtons(part, value, disabled) {
    const picker = arrowPartPicker(part);
    if (!picker) return;
    picker.querySelectorAll('.theorem-arrow-part-button').forEach((button) => {
      const selected = button.dataset.arrowValue === value;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.disabled = !!disabled;
    });
  }

  function arrowPartPicker(part) {
    if (part === 'body') return refs.arrowBodyPicker;
    if (part === 'head') return refs.arrowHeadPicker;
    if (part === 'tail') return refs.arrowTailPicker;
    return null;
  }

  function arrowPartIconSvg(part, value) {
    if (part === 'head') {
      return `<svg viewBox="0 0 64 24" aria-hidden="true" focusable="false"><path d="M12 12 H52" fill="none" stroke="currentColor" stroke-width="2"/>${arrowPartEndpointSvg(value, 52, 'head')}</svg>`;
    }
    if (part === 'tail') {
      return `<svg viewBox="0 0 64 24" aria-hidden="true" focusable="false"><path d="M12 12 H52" fill="none" stroke="currentColor" stroke-width="2"/>${arrowPartEndpointSvg(value, 12, 'tail')}</svg>`;
    }
    return `<svg viewBox="0 0 64 24" aria-hidden="true" focusable="false">${arrowPartBodySvg(value)}</svg>`;
  }

  function arrowPartBodySvg(body) {
    const normalized = normalizeArrowPart('body', body);
    if (normalized === 'none') {
      return '';
    }
    if (normalized === 'wavy') {
      return '<path d="M12 12 C 16 5, 20 19, 24 12 S 32 5, 36 12 S 44 19, 48 12 S 56 5, 60 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
    const dash = normalized === 'dashed' ? ' stroke-dasharray="7 5"' : (normalized === 'dotted' ? ' stroke-dasharray="1 5" stroke-linecap="round"' : '');
    return `<path d="M12 12 H52" fill="none" stroke="currentColor" stroke-width="2"${dash}/>`;
  }

  function arrowPartEndpointSvg(kind, x, side) {
    const direction = side === 'head' ? 1 : -1;
    if (!kind || kind === 'none') return '';
    if (kind === 'arrow') {
      return side === 'head'
        ? '<path d="M44 6 C47 9, 49 11, 52 12 C49 13, 47 15, 44 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M20 6 C17 9, 15 11, 12 12 C15 13, 17 15, 20 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (kind === 'twohead') {
      return '<path d="M44 6 C47 9, 49 11, 52 12 C49 13, 47 15, 44 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 6.5 C40 9.4, 42 11, 45 12 C42 13, 40 14.6, 37 17.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (kind === 'bar') {
      return `<path d="M${x} 5 V19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    }
    if (kind === 'hook') {
      const d = direction < 0 ? 'M12 4 C4 4, 4 12, 12 12' : 'M52 20 C60 20, 60 12, 52 12';
      return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
    }
    if (kind === 'harpoon-up') {
      return side === 'head'
        ? '<path d="M44 6 C47 9, 49 11, 52 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M20 6 C17 9, 15 11, 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    if (kind === 'harpoon-down') {
      return side === 'head'
        ? '<path d="M44 18 C47 15, 49 13, 52 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M20 18 C17 15, 15 13, 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '';
  }

  function bindAutoResizeTextareas() {
    document.querySelectorAll('textarea.theorem-textarea').forEach((textarea) => {
      autoResizeTextarea(textarea);
      textarea.addEventListener('input', () => autoResizeTextarea(textarea));
    });
  }

  function autoResizeTextarea(textarea) {
    if (!textarea || textarea.tagName !== 'TEXTAREA' || textarea.hidden) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_AUTO_MAX_HEIGHT);
    textarea.style.height = `${Math.max(66, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_AUTO_MAX_HEIGHT ? 'auto' : 'hidden';
  }

  function autoResizeDetailTextareas() {
    const textareas = [
      refs.nodeSetting,
      refs.nodeCondition,
      refs.nodeResult,
      refs.nodeProofSketch,
      ...(refs.nodeMiscDetailList ? refs.nodeMiscDetailList.querySelectorAll('textarea.theorem-textarea') : []),
      refs.arrowRemark
    ];
    textareas.forEach(autoResizeTextarea);
  }

  function bindLatexDetailPreviewEvents() {
    NODE_DETAIL_LATEX_FIELDS.forEach(({ key, inputRef, previewRef }) => {
      const input = refs[inputRef];
      const preview = refs[previewRef];
      if (preview) {
        preview.addEventListener('click', () => {
          showLatexDetailEditor(key);
        });
      }
      if (input) {
        input.addEventListener('focus', () => {
          state.activeLatexDetailField = key;
          syncLatexDetailFields();
        });
        input.addEventListener('blur', () => {
          window.setTimeout(() => {
            if (state.activeLatexDetailField === key && document.activeElement !== input) {
              state.activeLatexDetailField = null;
              syncLatexDetailFields();
            }
          }, 0);
        });
      }
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
        proofSketch: 'Record a short proof strategy, reductions, or the key cited step here.',
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
        proofSketch: 'Apply Lemma 1, then track the remaining compatibility condition.',
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
        proofSketch: '',
        citationKeys: [],
        x: 735,
        y: 160
      })
    ];
    state.arrows = [
      makeArrow({ id: 'a1', sourceId: 'n1', targetId: 'n2', label: 'uses', remark: 'The compatibility hypothesis is carried along this dependency.' }),
      makeArrow({ id: 'a2', sourceId: 'n2', targetId: 'n3', label: 'suggests', remark: '' })
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
    const type = normalizeType(source.type);
    const extra = collectExtra(source, KNOWN_NODE_KEYS);
    return {
      extra,
      id,
      type,
      label: cleanString(source.label) || NODE_TYPES[type].label,
      setting: cleanString(source.setting),
      condition: cleanString(source.condition),
      result: cleanString(source.result),
      proofSketch: cleanString(source.proofSketch),
      details: normalizeMiscDetails(source, type),
      citationKeys: normalizeCitationKeys(source.citationKeys),
      color: normalizeColor(source.color, NODE_TYPES[type].stroke),
      fillColor: normalizeNodeFillColor(source.fillColor || source.fill, NODE_TYPES[type].fill),
      x: finiteNumber(source.x, state.canvasWidth / 2),
      y: finiteNumber(source.y, state.canvasHeight / 2),
      vx: 0,
      vy: 0,
      fixed: false
    };
  }

  function makeArrow(source = {}) {
    const extra = collectExtra(source, KNOWN_ARROW_KEYS);
    const parts = arrowPartsFromSource(source);
    const hasExplicitLevel = Object.prototype.hasOwnProperty.call(source, 'level');
    return {
      extra,
      id: cleanId(source.id) || nextArrowId(),
      sourceId: cleanId(source.sourceId),
      targetId: cleanId(source.targetId),
      label: cleanString(source.label),
      remark: cleanString(source.remark),
      body: parts.body,
      head: parts.head,
      tail: parts.tail,
      level: normalizeArrowLevel(parts.migratedLevel || (hasExplicitLevel ? source.level : parts.level)),
      endpointScale: normalizeArrowEndpointScale(source.endpointScale),
      curve: clamp(finiteNumber(source.curve, 0), -160, 160),
      labelOffset: clamp(finiteNumber(source.labelOffset, 0), -120, 120),
      color: normalizeColor(source.color, '#5f574e')
    };
  }

  function makeReference(source = {}) {
    const extra = collectExtra(source, KNOWN_REFERENCE_KEYS);
    const key = cleanString(source.key);
    const rawBibtex = cleanString(source.rawBibtex);
    const fallbackUrl = normalizeUrl(source.url);
    const fallbackSource = normalizeReferenceSource(source.source, fallbackUrl ? inferReferenceSource(fallbackUrl) : 'bibtex');
    const links = normalizeReferenceLinks(source.links, {
      url: fallbackUrl,
      source: fallbackSource
    });
    const primaryLink = links[0] || null;
    const sourceType = primaryLink
      ? normalizeReferenceSource(primaryLink.source, inferReferenceSource(primaryLink.url))
      : fallbackSource;
    return {
      extra,
      key,
      author: cleanString(source.author),
      title: cleanString(source.title),
      year: cleanString(source.year),
      citeText: cleanString(source.citeText) || referenceDefaultCiteText({ key, source: sourceType, rawBibtex }),
      url: primaryLink ? primaryLink.url : '',
      source: sourceType,
      rawBibtex,
      links
    };
  }

  function normalizeReferenceLinks(links, fallback = {}) {
    const normalized = [];
    if (Array.isArray(links)) {
      links.forEach((entry) => {
        const link = normalizeReferenceLink(entry);
        if (link) normalized.push(link);
      });
    }
    const fallbackUrl = normalizeUrl(fallback.url);
    if (!normalized.length && fallbackUrl) {
      normalized.push({
        url: fallbackUrl,
        source: normalizeReferenceSource(fallback.source, inferReferenceSource(fallbackUrl)),
        label: ''
      });
    }
    return normalized;
  }

  function normalizeReferenceLink(entry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const url = normalizeUrl(entry.url || entry.href);
    if (!url) return null;
    return {
      url,
      source: normalizeReferenceSource(entry.source, inferReferenceSource(url)),
      label: cleanString(entry.label)
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

  function normalizeMiscDetails(source = {}, type = 'theorem') {
    if (normalizeType(type) !== 'misc') return [];
    const rawDetails = Array.isArray(source.details) ? source.details : [];
    if (rawDetails.length) {
      const used = new Set();
      const details = rawDetails.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const label = cleanDetailLabel(entry.label || entry.name || entry.title) || `detail ${index + 1}`;
        const id = uniqueDetailId(cleanDetailId(entry.id || label), used);
        const text = cleanString(
          Object.prototype.hasOwnProperty.call(entry, 'text') ? entry.text
            : Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value
              : entry.content
        );
        return {
          id,
          label,
          type: normalizeMiscDetailType(entry.type || entry.mode || entry.kind),
          text
        };
      }).filter(Boolean);
      if (details.length) return details;
    }
    return legacyFieldsToMiscDetails(source);
  }

  function legacyFieldsToMiscDetails(source = {}) {
    const used = new Set();
    return LEGACY_NODE_DETAIL_FIELDS.map(({ key, label }) => {
      const text = cleanString(source[key]);
      if (!text) return null;
      return {
        id: uniqueDetailId(label, used),
        label,
        type: 'textbox',
        text
      };
    }).filter(Boolean);
  }

  function normalizeMiscDetailType(type) {
    const value = cleanString(type).toLowerCase();
    if (value === 'numbered' || value === 'ordered' || value === 'enum') return 'enumeration';
    if (value === 'bullet' || value === 'bullets' || value === 'unordered') return 'list';
    if (value === 'task' || value === 'tasks' || value === 'checklist' || value === 'checkboxes' || value === 'todo') return 'checkbox';
    if (value === 'text' || value === 'textarea') return 'textbox';
    return MISC_DETAIL_TYPES.has(value) ? value : 'textbox';
  }

  function cleanDetailLabel(value) {
    return cleanString(value).replace(/\s+/g, ' ').slice(0, 48);
  }

  function cleanDetailId(value) {
    return cleanString(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function miscDetailFieldKey(detailId) {
    return `misc:${cleanDetailId(detailId)}`;
  }

  function uniqueDetailId(base, used) {
    const root = cleanDetailId(base) || 'detail';
    let id = root;
    let index = 2;
    while (used.has(id)) {
      id = `${root}-${index}`;
      index += 1;
    }
    used.add(id);
    return id;
  }

  function cloneMiscDetails(details) {
    return (Array.isArray(details) ? details : []).map((detail) => ({
      id: cleanDetailId(detail.id),
      label: cleanDetailLabel(detail.label),
      type: normalizeMiscDetailType(detail.type || detail.mode),
      text: cleanString(detail.text)
    }));
  }

  function cleanMiscDetailsForExport(details) {
    return cloneMiscDetails(details).filter((detail) => detail.label || detail.text);
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
  }

  function renderCanvas() {
    if (!refs.canvas) return;
    renderNodeLayer();
    const ctx = refs.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    drawEmptyState(ctx);
    drawArrows(ctx);
    drawConnectPreview(ctx);
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
      const style = arrowStyleFromArrow(preview);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = selected ? 2.6 : 1.6;
      ctx.shadowColor = selected ? 'rgba(139, 58, 42, 0.22)' : 'transparent';
      ctx.shadowBlur = selected ? 5 : 0;
      const level = normalizeArrowLevel(preview.level);
      const metrics = arrowLevelMetrics(level, preview.endpointScale, selected, style.body);
      drawArrowBody(ctx, model, style, metrics);
      drawArrowEndpoint(ctx, style.tail, model.start, quadraticTangentAngle(model.start, model.control, model.end, 0) + Math.PI, metrics, 'tail');
      drawArrowEndpoint(ctx, style.head, model.end, quadraticTangentAngle(model.start, model.control, model.end, 1), metrics, 'head');
      if (arrow.label) drawArrowLabel(ctx, arrow.label, model, preview.labelOffset);
      ctx.restore();
    });
  }

  function drawArrowBody(ctx, model, style, metrics) {
    if (!model) return;
    const body = style.body || 'solid';
    if (body === 'none') {
      ctx.setLineDash([]);
      return;
    }
    ctx.lineWidth = metrics.bodyLineWidth;
    const offsets = metrics.offsets;
    if (body === 'wavy') {
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      offsets.forEach((offset) => {
        const strand = arrowBodyStrandModel(model, style, metrics, offset);
        if (strand) drawWavyQuadratic(ctx, strand);
      });
      ctx.setLineDash([]);
      return;
    }
    setArrowLineDash(ctx, body);
    offsets.forEach((offset) => {
      const strand = arrowBodyStrandModel(model, style, metrics, offset);
      if (strand) drawQuadraticPath(ctx, strand);
    });
    ctx.setLineDash([]);
  }

  function arrowLevelMetrics(level, endpointScale = ARROW_ENDPOINT_SCALE_DEFAULT, selected = false, body = 'solid') {
    const offsets = arrowLevelOffsets(level);
    const bodyLineWidth = selected ? 2.4 : 1.6;
    const bodySpan = offsets.length > 1 ? offsets[offsets.length - 1] - offsets[0] : 0;
    const wavePadding = body === 'wavy' ? ARROW_RENDER_METRICS.waveAmplitude * 2 : 0;
    const bodyWidth = bodyLineWidth + bodySpan + wavePadding;
    const outerOffset = offsets.reduce((max, offset) => Math.max(max, Math.abs(offset)), 0);
    const scale = normalizeArrowEndpointScale(endpointScale);
    const levelExtra = Math.max(0, offsets.length - 1);
    const headLength = (ARROW_RENDER_METRICS.headSize + levelExtra * 2) * scale;
    const headHeight = Math.max(
      ARROW_RENDER_METRICS.headSize * 1.2,
      bodyWidth + ARROW_RENDER_METRICS.bodyLineGap * 2
    ) * scale;
    const barHalfSize = Math.max(
      ARROW_RENDER_METRICS.barSize,
      bodyWidth / 2 + ARROW_RENDER_METRICS.bodyLineGap * 0.9
    ) * scale;
    return {
      offsets,
      bodyLineWidth,
      bodyWidth,
      endpointScale: scale,
      headLength,
      headHeight,
      secondHeadLength: headLength * 0.88,
      secondHeadHeight: headHeight * 0.88,
      secondHeadOffset: headLength * 0.72 + ARROW_RENDER_METRICS.headSpacing * scale,
      barHalfSize,
      harpoonOffset: outerOffset,
      hookBack: ARROW_RENDER_METRICS.hookBack * scale,
      hookShoulder: ARROW_RENDER_METRICS.hookShoulder * scale,
      hookTip: ARROW_RENDER_METRICS.hookTip * scale
    };
  }

  function arrowBodyStrandModel(model, style, metrics, offset) {
    const strand = offset ? offsetQuadraticModel(model, offset) : model;
    const startInset = arrowEndpointBodyInset(style.tail, metrics, offset);
    const endInset = arrowEndpointBodyInset(style.head, metrics, offset);
    if (startInset <= 0 && endInset <= 0) return strand;
    return trimQuadraticModel(strand, startInset, endInset);
  }

  function arrowEndpointBodyInset(kind, metrics, offset = 0) {
    if (!kind || kind === 'none') return 0;
    if (kind === 'arrow') return arrowHeadStrandInset(metrics.headLength, metrics.headHeight, offset);
    if (kind === 'twohead') return arrowHeadStrandInset(metrics.headLength, metrics.headHeight, offset);
    if (kind === 'bar' || kind === 'hook' || kind === 'harpoon-up' || kind === 'harpoon-down') return 0;
    return 0;
  }

  function arrowHeadStrandInset(length, height, offset) {
    const halfHeight = Math.max(1, height / 2);
    const ratio = clamp(Math.abs(offset) / halfHeight, 0, 1);
    return length * ratio * 0.92;
  }

  function trimQuadraticModel(model, startInset, endInset) {
    const samples = quadraticLengthSamples(model, 64);
    const totalLength = samples[samples.length - 1].length;
    if (!Number.isFinite(totalLength) || totalLength <= 0) return model;
    let startTrim = Math.max(0, finiteNumber(startInset, 0));
    let endTrim = Math.max(0, finiteNumber(endInset, 0));
    const minVisible = Math.min(12, totalLength * 0.35);
    const maxTrim = Math.max(0, totalLength - minVisible);
    if (startTrim + endTrim > maxTrim) {
      const scale = maxTrim / (startTrim + endTrim || 1);
      startTrim *= scale;
      endTrim *= scale;
    }
    const t0 = quadraticTAtLength(samples, startTrim);
    const t1 = quadraticTAtLength(samples, totalLength - endTrim);
    if (t1 <= t0) return null;
    return quadraticSubcurve(model, t0, t1);
  }

  function quadraticLengthSamples(model, steps) {
    const samples = [{ t: 0, length: 0 }];
    let previous = model.start;
    let length = 0;
    for (let index = 1; index <= steps; index += 1) {
      const t = index / steps;
      const point = quadraticPoint(model.start, model.control, model.end, t);
      length += Math.hypot(point.x - previous.x, point.y - previous.y);
      samples.push({ t, length });
      previous = point;
    }
    return samples;
  }

  function quadraticTAtLength(samples, targetLength) {
    const totalLength = samples[samples.length - 1].length;
    if (targetLength <= 0) return 0;
    if (targetLength >= totalLength) return 1;
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const next = samples[index];
      if (targetLength <= next.length) {
        const span = next.length - previous.length || 1;
        const ratio = (targetLength - previous.length) / span;
        return previous.t + (next.t - previous.t) * ratio;
      }
    }
    return 1;
  }

  function quadraticSubcurve(model, t0, t1) {
    if (t0 <= 0 && t1 >= 1) return model;
    const first = splitQuadratic(model.start, model.control, model.end, t1).left;
    if (t0 <= 0) return first;
    return splitQuadratic(first.start, first.control, first.end, t0 / t1).right;
  }

  function splitQuadratic(start, control, end, t) {
    const startControl = lerpPoint(start, control, t);
    const controlEnd = lerpPoint(control, end, t);
    const mid = lerpPoint(startControl, controlEnd, t);
    return {
      left: { start, control: startControl, end: mid },
      right: { start: mid, control: controlEnd, end }
    };
  }

  function lerpPoint(start, end, t) {
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
  }

  function arrowLevelOffsets(level) {
    const count = normalizeArrowLevel(level);
    const center = (count - 1) / 2;
    return Array.from({ length: count }, (_, index) => (index - center) * ARROW_RENDER_METRICS.bodyLineGap);
  }

  function setArrowLineDash(ctx, body) {
    if (body === 'dashed') {
      ctx.setLineDash([8, 6]);
    } else if (body === 'dotted') {
      ctx.setLineDash([1.4, 5.2]);
      ctx.lineCap = 'round';
    } else {
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }
  }

  function drawQuadraticPath(ctx, model) {
    ctx.beginPath();
    ctx.moveTo(model.start.x, model.start.y);
    ctx.quadraticCurveTo(model.control.x, model.control.y, model.end.x, model.end.y);
    ctx.stroke();
  }

  function drawOffsetQuadratic(ctx, model, offset) {
    drawQuadraticPath(ctx, offsetQuadraticModel(model, offset));
  }

  function offsetQuadraticModel(model, offset) {
    const startNormal = quadraticNormal(model.start, model.control, model.end, 0);
    const controlNormal = quadraticNormal(model.start, model.control, model.end, 0.5);
    const endNormal = quadraticNormal(model.start, model.control, model.end, 1);
    return {
      start: offsetPoint(model.start, startNormal, offset),
      control: offsetPoint(model.control, controlNormal, offset),
      end: offsetPoint(model.end, endNormal, offset)
    };
  }

  function drawWavyQuadratic(ctx, model) {
    const steps = 72;
    const amplitude = ARROW_RENDER_METRICS.waveAmplitude;
    const wavelength = ARROW_RENDER_METRICS.waveLength;
    let distance = 0;
    let previous = quadraticPoint(model.start, model.control, model.end, 0);
    ctx.beginPath();
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const point = quadraticPoint(model.start, model.control, model.end, t);
      if (index) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      const normal = quadraticNormal(model.start, model.control, model.end, t);
      const wave = Math.sin((distance / wavelength) * Math.PI * 2) * amplitude;
      const drawn = offsetPoint(point, normal, wave);
      if (index === 0) ctx.moveTo(drawn.x, drawn.y);
      else ctx.lineTo(drawn.x, drawn.y);
      previous = point;
    }
    ctx.stroke();
  }

  function drawArrowEndpoint(ctx, kind, point, angle, metrics, placement = 'head') {
    if (!kind || kind === 'none') return;
    if (kind === 'arrow') {
      drawArrowHeadAt(ctx, point, angle, metrics.headLength, metrics.headHeight);
      return;
    }
    if (kind === 'twohead') {
      drawArrowHeadAt(ctx, point, angle, metrics.headLength, metrics.headHeight);
      drawArrowHeadAt(ctx, {
        x: point.x - Math.cos(angle) * metrics.secondHeadOffset,
        y: point.y - Math.sin(angle) * metrics.secondHeadOffset
      }, angle, metrics.secondHeadLength, metrics.secondHeadHeight);
      return;
    }
    if (kind === 'bar') {
      drawArrowBarAt(ctx, point, angle, metrics);
      return;
    }
    if (kind === 'hook') {
      drawArrowHookAt(ctx, point, angle, metrics, placement);
      return;
    }
    if (kind === 'harpoon-up' || kind === 'harpoon-down') {
      drawHarpoonAt(ctx, point, angle, kind === 'harpoon-up' ? -1 : 1, metrics, placement);
    }
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

  function drawArrowHeadBranchPath(ctx, tip, angle, length, height, side) {
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const px = -uy;
    const py = ux;
    const halfHeight = height / 2;
    const base = {
      x: tip.x - ux * length,
      y: tip.y - uy * length
    };
    ctx.moveTo(base.x + px * halfHeight * side, base.y + py * halfHeight * side);
    ctx.bezierCurveTo(
      base.x + ux * length * 0.24 + px * halfHeight * 0.7 * side,
      base.y + uy * length * 0.24 + py * halfHeight * 0.7 * side,
      tip.x - ux * length * 0.32 + px * halfHeight * 0.12 * side,
      tip.y - uy * length * 0.32 + py * halfHeight * 0.12 * side,
      tip.x,
      tip.y
    );
  }

  function drawArrowHeadAt(ctx, tip, angle, length, height) {
    ctx.save();
    ctx.lineWidth = Math.max(1.7, ctx.lineWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    drawArrowHeadBranchPath(ctx, tip, angle, length, height, 1);
    drawArrowHeadBranchPath(ctx, tip, angle, length, height, -1);
    ctx.stroke();
    ctx.restore();
  }

  function drawHarpoonAt(ctx, tip, angle, side, metrics, placement = 'head') {
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const strandSign = placement === 'tail' ? -1 : 1;
    const point = {
      x: tip.x + px * side * metrics.harpoonOffset * strandSign,
      y: tip.y + py * side * metrics.harpoonOffset * strandSign
    };
    const branchSide = side * strandSign;
    ctx.save();
    ctx.lineWidth = Math.max(1.7, metrics.bodyLineWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    drawArrowHeadBranchPath(ctx, point, angle, metrics.headLength, metrics.headHeight, branchSide);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowBarAt(ctx, point, angle, metrics) {
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const size = metrics.barHalfSize;
    ctx.save();
    ctx.lineWidth = Math.max(1.7, metrics.bodyLineWidth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x + px * size, point.y + py * size);
    ctx.lineTo(point.x - px * size, point.y - py * size);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowHookAt(ctx, point, angle, metrics, placement = 'head') {
    const px = -Math.sin(angle);
    const py = Math.cos(angle);
    const radius = Math.max(metrics.bodyLineWidth * 2.2, metrics.hookBack * 0.52);
    const side = 1;
    const strandSign = placement === 'tail' ? -1 : 1;
    ctx.save();
    ctx.lineWidth = Math.max(1.7, metrics.bodyLineWidth);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    metrics.offsets.forEach((offset) => {
      const strand = {
        x: point.x + px * offset * strandSign,
        y: point.y + py * offset * strandSign
      };
      const normalX = px * side;
      const normalY = py * side;
      const center = {
        x: strand.x + normalX * radius,
        y: strand.y + normalY * radius
      };
      const startAngle = Math.atan2(strand.y - center.y, strand.x - center.x);
      ctx.moveTo(strand.x, strand.y);
      ctx.arc(center.x, center.y, radius, startAngle, startAngle + side * Math.PI, side < 0);
    });
    ctx.stroke();
    ctx.restore();
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
      const fillColor = currentNodeFillColor(node);
      element.style.borderColor = color;
      element.style.color = color;
      element.style.setProperty('--node-fill', fillColor);
      element.style.backgroundColor = fillColor;
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

  function pointInBox(point, box) {
    return !!point && !!box
      && point.x >= box.x
      && point.x <= box.x + box.width
      && point.y >= box.y
      && point.y <= box.y + box.height;
  }

  function quadraticBoxBoundaryT(model, box, fromEnd = false) {
    const steps = 96;
    if (!box) return fromEnd ? 1 : 0;
    if (fromEnd) {
      if (!pointInBox(model.end, box)) return 1;
      let insideT = 1;
      for (let i = steps - 1; i >= 0; i -= 1) {
        const outsideT = i / steps;
        const point = quadraticPoint(model.start, model.control, model.end, outsideT);
        if (!pointInBox(point, box)) {
          return refineQuadraticBoundaryT(model, box, insideT, outsideT);
        }
        insideT = outsideT;
      }
      return 1;
    }

    if (!pointInBox(model.start, box)) return 0;
    let insideT = 0;
    for (let i = 1; i <= steps; i += 1) {
      const outsideT = i / steps;
      const point = quadraticPoint(model.start, model.control, model.end, outsideT);
      if (!pointInBox(point, box)) {
        return refineQuadraticBoundaryT(model, box, insideT, outsideT);
      }
      insideT = outsideT;
    }
    return 0;
  }

  function refineQuadraticBoundaryT(model, box, insideT, outsideT) {
    let inner = insideT;
    let outer = outsideT;
    for (let i = 0; i < 18; i += 1) {
      const mid = (inner + outer) / 2;
      const point = quadraticPoint(model.start, model.control, model.end, mid);
      if (pointInBox(point, box)) inner = mid;
      else outer = mid;
    }
    return (inner + outer) / 2;
  }

  function directNodeBoundaryPoint(node, other, box) {
    const width = box && box.width ? box.width : 92;
    const height = box && box.height ? box.height : 34;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const xLimit = Math.abs(ux) > 0.0001 ? width / 2 / Math.abs(ux) : Infinity;
    const yLimit = Math.abs(uy) > 0.0001 ? height / 2 / Math.abs(uy) : Infinity;
    const distance = Math.min(xLimit, yLimit);
    return {
      x: node.x + ux * distance,
      y: node.y + uy * distance
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
      typesetLatexDetailPreviews();
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
    const curve = finiteNumber(offset, 0);
    const fullModel = {
      start: { x: source.x, y: source.y },
      control: {
        x: (source.x + target.x) / 2 + px * curve,
        y: (source.y + target.y) / 2 + py * curve
      },
      end: { x: target.x, y: target.y }
    };
    const sourceBox = nodeBox(null, source);
    const targetBox = nodeBox(null, target);
    const startT = quadraticBoxBoundaryT(fullModel, sourceBox, false);
    const endT = quadraticBoxBoundaryT(fullModel, targetBox, true);
    const gap = normalizeArrowBoundaryGap(state.arrowBoundaryGap);
    if (endT - startT > 0.01) {
      const visible = quadraticSubcurve(fullModel, startT, endT);
      return arrowModelWithHeadBase(trimQuadraticModel(visible, gap, gap) || visible);
    }
    const start = directNodeBoundaryPoint(source, target, sourceBox);
    const end = directNodeBoundaryPoint(target, source, targetBox);
    const fallbackModel = {
      start,
      control: {
        x: (start.x + end.x) / 2 + px * curve,
        y: (start.y + end.y) / 2 + py * curve
      },
      end
    };
    return arrowModelWithHeadBase(trimQuadraticModel(fallbackModel, gap, gap) || fallbackModel);
  }

  function arrowModelWithHeadBase(model) {
    return {
      ...model,
      headBase: quadraticPoint(model.start, model.control, model.end, 0.92)
    };
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

  function quadraticTangentAngle(start, control, end, t) {
    const dx = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
    const dy = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
    return Math.atan2(dy, dx);
  }

  function offsetPoint(point, normal, offset) {
    return {
      x: point.x + normal.x * offset,
      y: point.y + normal.y * offset
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

  function addMiscDetailFromControls() {
    const node = findNode(state.selectedNodeId);
    if (!node || node.type !== 'misc') {
      setStatus('Choose a Misc node before adding an extra field.');
      return;
    }
    applyNodeDetailFromControls(node);
    const label = cleanDetailLabel(refs.nodeMiscDetailName ? refs.nodeMiscDetailName.value : '');
    if (!label) {
      setStatus('Name the extra field before adding it.');
      if (refs.nodeMiscDetailName) refs.nodeMiscDetailName.focus();
      return;
    }
    const id = uniqueDetailId(label, new Set(node.details.map((detail) => detail.id)));
    node.details.push({
      id,
      label,
      type: normalizeMiscDetailType(refs.nodeMiscDetailType ? refs.nodeMiscDetailType.value : 'textbox'),
      text: ''
    });
    if (refs.nodeMiscDetailName) refs.nodeMiscDetailName.value = '';
    if (refs.nodeMiscDetailType) refs.nodeMiscDetailType.value = 'textbox';
    state.activeLatexDetailField = miscDetailFieldKey(id);
    setStatus(`Added ${label} to ${node.label}.`);
    renderAll();
    focusMiscDetailText(id);
  }

  function removeMiscDetailFromControls(detailId) {
    const node = findNode(state.selectedNodeId);
    if (!node || node.type !== 'misc') {
      setStatus('Choose a Misc node before removing an extra field.');
      return;
    }
    applyNodeDetailFromControls(node);
    const before = node.details.length;
    node.details = node.details.filter((detail) => detail.id !== detailId);
    if (node.details.length === before) return;
    if (state.activeLatexDetailField === miscDetailFieldKey(detailId)) state.activeLatexDetailField = null;
    setStatus(`Removed extra field from ${node.label}.`);
    renderAll();
  }

  function focusMiscDetailText(detailId) {
    if (!refs.nodeMiscDetailList) return;
    const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(detailId)}"]`);
    const textarea = row ? row.querySelector('[data-detail-role="text"]') : null;
    if (!textarea) return;
    textarea.focus();
    autoResizeTextarea(textarea);
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
    state.activeLatexDetailField = null;
    resetDetailEditBaseline();
  }

  function selectArrow(id) {
    state.selectedArrowId = id;
    state.selectedNodeId = null;
    state.detailPreview = null;
    state.activeLatexDetailField = null;
    resetDetailEditBaseline();
  }

  function clearSelection() {
    state.selectedNodeId = null;
    state.selectedArrowId = null;
    state.detailPreview = null;
    state.detailEditBaseline = null;
    state.activeLatexDetailField = null;
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
    state.detailEditBaseline = null;
    state.activeLatexDetailField = null;
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

  function updateDebugRenderSettings() {
    state.arrowBoundaryGap = normalizeArrowBoundaryGap(refs.arrowBoundaryGap ? refs.arrowBoundaryGap.value : state.arrowBoundaryGap);
    state.nodeFillSaturation = normalizeNodeFillSaturation(refs.nodeFillSaturation ? refs.nodeFillSaturation.value : state.nodeFillSaturation);
    syncDebugControlValues();
    renderCanvas();
    setStatus(`Debug view: arrow gap ${state.arrowBoundaryGap}px, fill saturation ${state.nodeFillSaturation}%.`);
  }

  function syncDebugControlValues() {
    state.arrowBoundaryGap = normalizeArrowBoundaryGap(state.arrowBoundaryGap);
    state.nodeFillSaturation = normalizeNodeFillSaturation(state.nodeFillSaturation);
    if (refs.arrowBoundaryGap) refs.arrowBoundaryGap.value = String(state.arrowBoundaryGap);
    if (refs.arrowBoundaryGapValue) refs.arrowBoundaryGapValue.textContent = `${state.arrowBoundaryGap}px`;
    if (refs.nodeFillSaturation) refs.nodeFillSaturation.value = String(state.nodeFillSaturation);
    if (refs.nodeFillSaturationValue) refs.nodeFillSaturationValue.textContent = `${state.nodeFillSaturation}%`;
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
    const isMisc = !!node && node.type === 'misc';
    refs.nodeEmptyNote.hidden = !!(node || arrow);
    refs.nodeEditor.hidden = !node;
    if (refs.arrowEditor) refs.arrowEditor.hidden = !arrow;
    refs.nodeFixedDetailRows.forEach((row) => {
      row.hidden = isMisc;
    });
    if (refs.nodeMiscEditor) refs.nodeMiscEditor.hidden = !isMisc;
    [
      refs.nodeType,
      refs.nodeLabel,
      refs.nodeColor,
      refs.nodeFillColor
    ].forEach((control) => {
      if (control) control.disabled = disabled;
    });
    [
      refs.nodeSetting,
      refs.nodeCondition,
      refs.nodeResult,
      refs.nodeProofSketch
    ].forEach((control) => {
      if (control) control.disabled = disabled || isMisc;
    });
    [
      refs.nodeMiscDetailName,
      refs.nodeMiscDetailType,
      refs.addNodeMiscDetail
    ].forEach((control) => {
      if (control) control.disabled = disabled || !isMisc;
    });
    [
      refs.arrowSource,
      refs.arrowTarget,
      refs.arrowLabel,
      refs.arrowRemark,
      refs.arrowLevel,
      refs.arrowEndpointScale,
      refs.arrowCurve,
      refs.arrowLabelOffset,
      refs.arrowColor
    ].forEach((control) => {
      if (control) control.disabled = !arrow;
    });
    if (refs.detailUpdate) refs.detailUpdate.disabled = !(node || arrow);
    if (refs.detailCancel) refs.detailCancel.disabled = !(node || arrow);
    if (!node) {
      if (refs.nodeType) refs.nodeType.value = 'theorem';
      if (refs.nodeLabel) refs.nodeLabel.value = '';
      refs.nodeSetting.value = '';
      refs.nodeCondition.value = '';
      refs.nodeResult.value = '';
      refs.nodeProofSketch.value = '';
      renderMiscDetailFields(null);
      if (refs.nodeColor) refs.nodeColor.value = DEFAULT_NODE_STROKE;
      if (refs.nodeFillColor) refs.nodeFillColor.value = DEFAULT_NODE_FILL;
      populateArrowParentSelects(arrow);
      if (refs.arrowLabel) refs.arrowLabel.value = arrow ? (arrow.label || '') : '';
      if (refs.arrowRemark) refs.arrowRemark.value = arrow ? (arrow.remark || '') : '';
      syncArrowPartPickers(arrow || null, !arrow);
      setArrowLevelControl(arrow ? arrow.level : ARROW_LEVEL_DEFAULT, !arrow);
      setArrowEndpointScaleControl(arrow ? arrow.endpointScale : ARROW_ENDPOINT_SCALE_DEFAULT, !arrow);
      if (refs.arrowCurve) refs.arrowCurve.value = arrow ? String(roundNumber(arrow.curve || 0)) : '0';
      if (refs.arrowLabelOffset) refs.arrowLabelOffset.value = arrow ? String(roundNumber(arrow.labelOffset || 0)) : '0';
      if (refs.arrowColor) refs.arrowColor.value = arrow ? normalizeColor(arrow.color, '#5f574e') : '#5f574e';
      autoResizeDetailTextareas();
      syncLatexDetailFields();
      return;
    }
    if (refs.nodeType) refs.nodeType.value = node.type;
    if (refs.nodeLabel) refs.nodeLabel.value = node.label;
    refs.nodeSetting.value = node.setting;
    refs.nodeCondition.value = node.condition;
    refs.nodeResult.value = node.result;
    refs.nodeProofSketch.value = node.proofSketch;
    renderMiscDetailFields(isMisc ? node : null);
    if (refs.nodeColor) refs.nodeColor.value = normalizeColor(node.color, NODE_TYPES[node.type].stroke);
    if (refs.nodeFillColor) refs.nodeFillColor.value = normalizeNodeFillColor(node.fillColor, NODE_TYPES[node.type].fill);
    populateArrowParentSelects(null);
    if (refs.arrowLabel) refs.arrowLabel.value = '';
    if (refs.arrowRemark) refs.arrowRemark.value = '';
    syncArrowPartPickers(null, true);
    setArrowLevelControl(ARROW_LEVEL_DEFAULT, true);
    setArrowEndpointScaleControl(ARROW_ENDPOINT_SCALE_DEFAULT, true);
    if (refs.arrowCurve) refs.arrowCurve.value = '0';
    if (refs.arrowLabelOffset) refs.arrowLabelOffset.value = '0';
    if (refs.arrowColor) refs.arrowColor.value = '#5f574e';
    autoResizeDetailTextareas();
    syncLatexDetailFields();
  }

  function renderMiscDetailFields(node) {
    if (!refs.nodeMiscDetailList) return;
    refs.nodeMiscDetailList.replaceChildren();
    if (!node) return;
    if (!Array.isArray(node.details)) node.details = [];
    node.details.forEach((detail) => {
      refs.nodeMiscDetailList.appendChild(createMiscDetailRow(detail));
    });
    autoResizeDetailTextareas();
    syncLatexDetailFields();
  }

  function createMiscDetailRow(detail) {
    const row = document.createElement('div');
    row.className = 'theorem-field-row';
    row.dataset.miscDetailId = detail.id;

    const labelSlot = document.createElement('div');
    labelSlot.className = 'theorem-misc-detail-label-slot';

    const label = document.createElement('span');
    label.className = 'input-label theorem-misc-detail-name';
    label.tabIndex = 0;
    label.setAttribute('role', 'button');
    label.textContent = detail.label;
    label.title = 'Rename extra';
    label.addEventListener('click', () => showMiscDetailLabelEditor(detail.id));
    label.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      showMiscDetailLabelEditor(detail.id);
    });

    const labelInput = document.createElement('input');
    labelInput.className = 'theorem-input theorem-misc-detail-name-input';
    labelInput.type = 'text';
    labelInput.maxLength = 48;
    labelInput.spellcheck = true;
    labelInput.autocomplete = 'off';
    labelInput.value = detail.label;
    labelInput.dataset.detailRole = 'label';
    labelInput.hidden = true;
    labelInput.addEventListener('input', () => updateMiscDetailLabelDraft(detail.id));
    labelInput.addEventListener('blur', () => commitMiscDetailLabelEdit(detail.id));
    labelInput.addEventListener('focusout', () => commitMiscDetailLabelEdit(detail.id));
    labelInput.addEventListener('change', () => commitMiscDetailLabelEdit(detail.id));
    labelInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        labelInput.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelMiscDetailLabelEdit(detail.id);
      }
    });
    labelInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitMiscDetailLabelEdit(detail.id);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelMiscDetailLabelEdit(detail.id);
      }
    });

    const body = document.createElement('div');
    body.className = 'theorem-misc-detail-body';

    const textarea = document.createElement('textarea');
    textarea.className = 'theorem-textarea';
    textarea.spellcheck = true;
    textarea.value = detail.text;
    textarea.dataset.detailRole = 'text';
    textarea.addEventListener('input', autoApplyDetailUpdate);
    textarea.addEventListener('change', autoApplyDetailUpdate);
    textarea.addEventListener('focus', () => {
      state.activeLatexDetailField = miscDetailFieldKey(detail.id);
      syncLatexDetailFields();
    });
    textarea.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (state.activeLatexDetailField === miscDetailFieldKey(detail.id) && document.activeElement !== textarea) {
          state.activeLatexDetailField = null;
          syncLatexDetailFields();
        }
      }, 0);
    });

    const preview = document.createElement('div');
    preview.className = 'theorem-misc-preview';
    preview.setAttribute('role', 'group');
    preview.tabIndex = 0;
    preview.dataset.detailPreview = 'true';
    preview.hidden = true;
    preview.addEventListener('click', (event) => {
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('input[type="checkbox"]')) return;
      showLatexDetailEditor(miscDetailFieldKey(detail.id));
    });
    preview.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('input[type="checkbox"]')) return;
      event.preventDefault();
      showLatexDetailEditor(miscDetailFieldKey(detail.id));
    });

    labelSlot.append(label, labelInput);
    body.append(textarea, preview);
    row.append(labelSlot, body);
    return row;
  }

  function showMiscDetailLabelEditor(detailId) {
    if (!refs.nodeMiscDetailList) return;
    const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(detailId)}"]`);
    if (!row) return;
    const label = row.querySelector('.theorem-misc-detail-name');
    const input = row.querySelector('[data-detail-role="label"]');
    if (!label || !input) return;
    input.dataset.originalLabel = cleanDetailLabel(input.value || label.textContent);
    label.hidden = true;
    input.hidden = false;
    input.focus();
    if (typeof input.select === 'function') input.select();
  }

  function updateMiscDetailLabelDraft(detailId) {
    if (!refs.nodeMiscDetailList) return;
    const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(detailId)}"]`);
    if (!row) return;
    const label = row.querySelector('.theorem-misc-detail-name');
    const input = row.querySelector('[data-detail-role="label"]');
    if (!label || !input) return;
    const next = cleanDetailLabel(input.value);
    if (!next) return;
    label.textContent = next;
    autoApplyDetailUpdate({ target: input });
  }

  function commitMiscDetailLabelEdit(detailId) {
    if (!refs.nodeMiscDetailList) return;
    const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(detailId)}"]`);
    if (!row) return;
    const label = row.querySelector('.theorem-misc-detail-name');
    const input = row.querySelector('[data-detail-role="label"]');
    if (!label || !input || input.hidden) return;
    const previous = cleanDetailLabel(input.dataset.originalLabel || label.textContent) || 'extra';
    const next = cleanDetailLabel(input.value);
    if (!next) {
      const remove = window.confirm(`Remove extra field "${previous}"?`);
      if (remove) {
        removeMiscDetailFromControls(detailId);
        return;
      }
      input.value = previous;
      hideMiscDetailLabelEditor(label, input, previous);
      autoApplyDetailUpdate({ target: input });
      return;
    }
    input.value = next;
    hideMiscDetailLabelEditor(label, input, next);
    autoApplyDetailUpdate({ target: input });
  }

  function cancelMiscDetailLabelEdit(detailId) {
    if (!refs.nodeMiscDetailList) return;
    const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(detailId)}"]`);
    if (!row) return;
    const label = row.querySelector('.theorem-misc-detail-name');
    const input = row.querySelector('[data-detail-role="label"]');
    if (!label || !input) return;
    const previous = cleanDetailLabel(input.dataset.originalLabel || label.textContent) || 'extra';
    input.value = previous;
    hideMiscDetailLabelEditor(label, input, previous);
    autoApplyDetailUpdate({ target: input });
  }

  function hideMiscDetailLabelEditor(label, input, value) {
    label.textContent = value;
    label.hidden = false;
    input.hidden = true;
    delete input.dataset.originalLabel;
  }

  function showLatexDetailEditor(key) {
    let input = null;
    const field = NODE_DETAIL_LATEX_FIELDS.find((item) => item.key === key);
    if (field) {
      input = refs[field.inputRef];
    } else if (key.startsWith('misc:') && refs.nodeMiscDetailList) {
      const row = refs.nodeMiscDetailList.querySelector(`[data-misc-detail-id="${cssEscape(key.slice(5))}"]`);
      input = row ? row.querySelector('[data-detail-role="text"]') : null;
    }
    if (!input) return;
    state.activeLatexDetailField = key;
    syncLatexDetailFields();
    input.hidden = false;
    autoResizeTextarea(input);
    input.focus();
    if (typeof input.setSelectionRange === 'function') {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }

  function syncLatexDetailFields() {
    const node = findNode(state.selectedNodeId);
    NODE_DETAIL_LATEX_FIELDS.forEach(({ key, inputRef, previewRef }) => {
      const input = refs[inputRef];
      const preview = refs[previewRef];
      if (!input || !preview) return;
      const value = input.value;
      const showPreview = !!node && node.type !== 'misc' && state.activeLatexDetailField !== key && hasDollarMath(value);
      input.hidden = showPreview;
      preview.hidden = !showPreview;
      preview.disabled = !node || node.type === 'misc';
      preview.setAttribute('aria-label', `Edit ${key}`);
      if (showPreview) {
        if (preview.dataset.sourceText !== value) {
          if (window.MathJax && typeof window.MathJax.typesetClear === 'function') {
            window.MathJax.typesetClear([preview]);
          }
          preview.textContent = value;
          preview.dataset.sourceText = value;
          preview.dataset.needsTypeset = 'true';
        }
      } else {
        delete preview.dataset.needsTypeset;
        delete preview.dataset.sourceText;
      }
    });

    const rows = refs.nodeMiscDetailList ? refs.nodeMiscDetailList.querySelectorAll('[data-misc-detail-id]') : [];
    rows.forEach((row) => {
      const detailId = row.dataset.miscDetailId || '';
      const key = miscDetailFieldKey(detailId);
      const input = row.querySelector('[data-detail-role="text"]');
      const preview = row.querySelector('[data-detail-preview]');
      if (!input || !preview) return;
      const value = input.value;
      const detail = node && Array.isArray(node.details) ? node.details.find((item) => item.id === detailId) : null;
      const type = normalizeMiscDetailType(detail ? detail.type : 'textbox');
      const showPreview = !!node && node.type === 'misc' && state.activeLatexDetailField !== key && !!cleanString(value) && (type !== 'textbox' || hasDollarMath(value));
      input.hidden = showPreview;
      preview.hidden = !showPreview;
      preview.setAttribute('aria-disabled', (!node || node.type !== 'misc') ? 'true' : 'false');
      preview.setAttribute('aria-label', `Preview ${detail ? detail.label : 'detail'}`);
      if (showPreview) {
        if (preview.dataset.sourceText !== value || preview.dataset.detailType !== type) {
          if (window.MathJax && typeof window.MathJax.typesetClear === 'function') {
            window.MathJax.typesetClear([preview]);
          }
          renderDetailPreviewContent(preview, value, type);
          preview.dataset.sourceText = value;
          preview.dataset.detailType = type;
          preview.dataset.needsTypeset = 'true';
        }
      } else {
        delete preview.dataset.needsTypeset;
        delete preview.dataset.sourceText;
        delete preview.dataset.detailType;
      }
    });
    typesetLatexDetailPreviews();
  }

  function renderDetailPreviewContent(preview, value, type) {
    preview.replaceChildren();
    if (type === 'list' || type === 'enumeration') {
      const list = document.createElement(type === 'list' ? 'ul' : 'ol');
      detailListItems(value).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      preview.appendChild(list);
      return;
    }
    if (type === 'checkbox') {
      renderCheckboxDetailPreview(preview, value);
      return;
    }
    preview.textContent = value;
  }

  function detailListItems(value) {
    return cleanString(value)
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').trim())
      .filter(Boolean);
  }

  function renderCheckboxDetailPreview(preview, value) {
    const list = document.createElement('div');
    list.className = 'theorem-misc-task-list';
    detailCheckboxItems(value).forEach((item, index) => {
      const task = document.createElement('div');
      task.className = 'theorem-misc-task';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.checked;
      checkbox.addEventListener('change', () => {
        updateCheckboxDetailItem(preview, index, checkbox.checked);
      });

      const text = document.createElement('span');
      text.className = 'theorem-misc-task-text';
      text.textContent = item.text;

      task.append(checkbox, text);
      list.appendChild(task);
    });
    preview.appendChild(list);
  }

  function updateCheckboxDetailItem(preview, index, checked) {
    const row = preview.closest('[data-misc-detail-id]');
    const textarea = row ? row.querySelector('[data-detail-role="text"]') : null;
    if (!textarea) return;
    const items = detailCheckboxItems(textarea.value);
    if (!items[index]) return;
    items[index] = { ...items[index], checked };
    textarea.value = checkboxItemsToText(items);
    autoApplyDetailUpdate({ target: textarea });
  }

  function detailCheckboxItems(value) {
    return cleanString(value)
      .split(/\r?\n/)
      .map(parseCheckboxDetailLine)
      .filter((item) => item && cleanString(item.text));
  }

  function parseCheckboxDetailLine(line) {
    const trimmed = cleanString(line);
    if (!trimmed) return null;
    const marked = trimmed.match(/^[-*]\s+\[([ xX])\]\s*(.*)$/);
    if (marked) {
      return {
        checked: marked[1].toLowerCase() === 'x',
        text: cleanString(marked[2])
      };
    }
    const bareMarked = trimmed.match(/^\[([ xX])\]\s*(.*)$/);
    if (bareMarked) {
      return {
        checked: bareMarked[1].toLowerCase() === 'x',
        text: cleanString(bareMarked[2])
      };
    }
    return {
      checked: false,
      text: trimmed.replace(/^[-*]\s+/, '').trim()
    };
  }

  function checkboxItemsToText(items) {
    return items
      .filter((item) => item && cleanString(item.text))
      .map((item) => `- [${item.checked ? 'x' : ' '}] ${cleanString(item.text)}`)
      .join('\n');
  }

  function typesetLatexDetailPreviews() {
    const fixedPending = NODE_DETAIL_LATEX_FIELDS
      .map(({ previewRef }) => refs[previewRef])
      .filter((preview) => preview && !preview.hidden && preview.dataset.needsTypeset === 'true');
    const miscPending = refs.nodeMiscDetailList
      ? Array.from(refs.nodeMiscDetailList.querySelectorAll('[data-detail-preview][data-needs-typeset="true"]'))
      : [];
    const pending = fixedPending.concat(miscPending);
    if (!pending.length) return;
    if (!window.MathJax || typeof window.MathJax.typesetPromise !== 'function') {
      scheduleMathTypesetRetry();
      return;
    }
    state.mathTypesetAttempts = 0;
    pending.forEach((element) => {
      delete element.dataset.needsTypeset;
    });
    window.MathJax.typesetPromise(pending).catch(() => {});
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

  function currentNodeColor(node) {
    if (state.detailPreview?.kind === 'node' && state.detailPreview.id === node.id) {
      return normalizeColor(state.detailPreview.color, node.color);
    }
    return normalizeColor(node.color, (NODE_TYPES[node.type] || NODE_TYPES.theorem).stroke);
  }

  function currentNodeFillColor(node) {
    const type = NODE_TYPES[node.type] || NODE_TYPES.theorem;
    let fillColor;
    if (state.detailPreview?.kind === 'node' && state.detailPreview.id === node.id) {
      fillColor = normalizeNodeFillColor(state.detailPreview.fillColor, node.fillColor || type.fill);
    } else {
      fillColor = normalizeNodeFillColor(node.fillColor, type.fill);
    }
    return applyNodeFillSaturation(fillColor);
  }

  function currentArrowPreview(arrow) {
    if (state.detailPreview?.kind !== 'arrow' || state.detailPreview.id !== arrow.id) return arrow;
    return {
      ...arrow,
      body: state.detailPreview.body,
      head: state.detailPreview.head,
      tail: state.detailPreview.tail,
      level: state.detailPreview.level,
      endpointScale: state.detailPreview.endpointScale,
      curve: state.detailPreview.curve,
      labelOffset: state.detailPreview.labelOffset,
      color: state.detailPreview.color
    };
  }

  function autoApplyDetailUpdate(event) {
    autoResizeTextarea(event?.target);
    const updated = applyDetailUpdate({ manual: false });
    if (updated && event?.target === refs.nodeType) {
      syncEditor();
      syncControls();
    }
  }

  function applyDetailUpdate({ manual = true } = {}) {
    const node = findNode(state.selectedNodeId);
    const arrow = findArrow(state.selectedArrowId);
    if (node) {
      applyNodeDetailFromControls(node);
      state.detailPreview = null;
      if (manual) {
        state.activeLatexDetailField = null;
        resetDetailEditBaseline();
        setStatus(`Updated ${node.label}.`);
        renderAll();
      } else {
        syncLatexDetailFields();
        renderCanvas();
        refreshExport();
      }
      return true;
    }
    if (arrow) {
      const result = applyArrowDetailFromControls(arrow);
      if (!result.ok) {
        setStatus('Choose existing parent nodes for the arrow.');
        if (result.reason === 'same-node') setStatus('Choose two different parent nodes for the arrow.');
        return false;
      }
      state.detailPreview = null;
      if (manual) {
        resetDetailEditBaseline();
        setStatus(arrow.label ? `Updated arrow ${arrow.label}.` : 'Updated arrow.');
        renderAll();
      } else {
        renderCanvas();
        refreshExport();
      }
      return true;
    }
    setStatus('Click a node or arrow before updating.');
    return false;
  }

  function applyNodeDetailFromControls(node) {
    const previousType = node.type;
    const type = normalizeType(refs.nodeType ? refs.nodeType.value : node.type);
    const fixedValues = {
      setting: cleanString(refs.nodeSetting ? refs.nodeSetting.value : node.setting),
      condition: cleanString(refs.nodeCondition ? refs.nodeCondition.value : node.condition),
      result: cleanString(refs.nodeResult ? refs.nodeResult.value : node.result),
      proofSketch: cleanString(refs.nodeProofSketch ? refs.nodeProofSketch.value : node.proofSketch)
    };
    node.type = type;
    node.label = cleanString(refs.nodeLabel ? refs.nodeLabel.value : node.label) || node.id;
    if (type === 'misc') {
      node.setting = '';
      node.condition = '';
      node.result = '';
      node.proofSketch = '';
      node.details = previousType === 'misc'
        ? collectMiscDetailsFromControls(node.details)
        : legacyFieldsToMiscDetails(fixedValues);
    } else {
      Object.assign(node, fixedValues);
      node.details = [];
    }
    node.color = normalizeColor(refs.nodeColor ? refs.nodeColor.value : node.color, NODE_TYPES[type].stroke);
    node.fillColor = normalizeNodeFillColor(refs.nodeFillColor ? refs.nodeFillColor.value : node.fillColor, NODE_TYPES[type].fill);
  }

  function collectMiscDetailsFromControls(fallback = []) {
    if (!refs.nodeMiscDetailList) return cloneMiscDetails(fallback);
    const fallbackById = new Map(cloneMiscDetails(fallback).map((detail) => [detail.id, detail]));
    const rows = Array.from(refs.nodeMiscDetailList.querySelectorAll('[data-misc-detail-id]'));
    return rows.map((row, index) => {
      const id = cleanDetailId(row.dataset.miscDetailId) || `detail-${index + 1}`;
      const fallbackDetail = fallbackById.get(id) || { id, label: `detail ${index + 1}`, type: 'textbox', text: '' };
      const label = row.querySelector('[data-detail-role="label"]');
      const text = row.querySelector('[data-detail-role="text"]');
      return {
        ...fallbackDetail,
        label: cleanDetailLabel(label ? label.value : fallbackDetail.label) || fallbackDetail.label,
        text: cleanString(text ? text.value : '')
      };
    });
  }

  function applyArrowDetailFromControls(arrow) {
    const sourceId = cleanId(refs.arrowSource ? refs.arrowSource.value : arrow.sourceId);
    const targetId = cleanId(refs.arrowTarget ? refs.arrowTarget.value : arrow.targetId);
    if (!findNode(sourceId) || !findNode(targetId)) return { ok: false, reason: 'missing-node' };
    if (sourceId === targetId) return { ok: false, reason: 'same-node' };
    arrow.sourceId = sourceId;
    arrow.targetId = targetId;
    arrow.label = cleanString(refs.arrowLabel ? refs.arrowLabel.value : arrow.label);
    arrow.remark = cleanString(refs.arrowRemark ? refs.arrowRemark.value : arrow.remark);
    arrow.body = getArrowPartValue('body', arrow.body);
    arrow.head = getArrowPartValue('head', arrow.head);
    arrow.tail = getArrowPartValue('tail', arrow.tail);
    arrow.level = getArrowLevelValue(arrow.level);
    arrow.endpointScale = getArrowEndpointScaleValue(arrow.endpointScale);
    arrow.curve = clamp(finiteNumber(refs.arrowCurve ? refs.arrowCurve.value : arrow.curve, arrow.curve), -160, 160);
    arrow.labelOffset = clamp(finiteNumber(refs.arrowLabelOffset ? refs.arrowLabelOffset.value : arrow.labelOffset, arrow.labelOffset), -120, 120);
    arrow.color = normalizeColor(refs.arrowColor ? refs.arrowColor.value : arrow.color, '#5f574e');
    syncArrowLevelValue(arrow.level);
    syncArrowEndpointScaleValue(arrow.endpointScale);
    return { ok: true };
  }

  function cancelDetailEdit() {
    const baseline = state.detailEditBaseline;
    if (!baseline) {
      setStatus('No detail changes to cancel.');
      return;
    }
    if (baseline.kind === 'node') {
      const node = findNode(baseline.id);
      if (!node) {
        clearSelection();
        setStatus('Selected node is no longer available.');
        renderAll();
        return;
      }
      restoreNodeDetailSnapshot(node, baseline.values);
      state.detailPreview = null;
      state.activeLatexDetailField = null;
      resetDetailEditBaseline();
      setStatus(`Cancelled edits to ${node.label}.`);
      renderAll();
      return;
    }
    if (baseline.kind === 'arrow') {
      const arrow = findArrow(baseline.id);
      if (!arrow) {
        clearSelection();
        setStatus('Selected arrow is no longer available.');
        renderAll();
        return;
      }
      restoreArrowDetailSnapshot(arrow, baseline.values);
      state.detailPreview = null;
      resetDetailEditBaseline();
      setStatus(arrow.label ? `Cancelled edits to arrow ${arrow.label}.` : 'Cancelled edits to arrow.');
      renderAll();
    }
  }

  function resetDetailEditBaseline() {
    const node = findNode(state.selectedNodeId);
    if (node) {
      state.detailEditBaseline = {
        kind: 'node',
        id: node.id,
        values: nodeDetailSnapshot(node)
      };
      return;
    }
    const arrow = findArrow(state.selectedArrowId);
    if (arrow) {
      state.detailEditBaseline = {
        kind: 'arrow',
        id: arrow.id,
        values: arrowDetailSnapshot(arrow)
      };
      return;
    }
    state.detailEditBaseline = null;
  }

  function nodeDetailSnapshot(node) {
    return {
      type: node.type,
      label: node.label,
      setting: node.setting,
      condition: node.condition,
      result: node.result,
      proofSketch: node.proofSketch,
      details: cloneMiscDetails(node.details),
      color: node.color,
      fillColor: node.fillColor
    };
  }

  function arrowDetailSnapshot(arrow) {
    return {
      sourceId: arrow.sourceId,
      targetId: arrow.targetId,
      label: arrow.label,
      remark: arrow.remark,
      body: arrow.body,
      head: arrow.head,
      tail: arrow.tail,
      level: arrow.level,
      endpointScale: arrow.endpointScale,
      curve: arrow.curve,
      labelOffset: arrow.labelOffset,
      color: arrow.color
    };
  }

  function restoreNodeDetailSnapshot(node, values) {
    Object.assign(node, {
      type: normalizeType(values.type),
      label: cleanString(values.label) || node.id,
      setting: cleanString(values.setting),
      condition: cleanString(values.condition),
      result: cleanString(values.result),
      proofSketch: cleanString(values.proofSketch),
      details: normalizeMiscDetails(values, normalizeType(values.type)),
      color: normalizeColor(values.color, NODE_TYPES[normalizeType(values.type)].stroke),
      fillColor: normalizeNodeFillColor(values.fillColor, NODE_TYPES[normalizeType(values.type)].fill)
    });
  }

  function restoreArrowDetailSnapshot(arrow, values) {
    Object.assign(arrow, {
      sourceId: cleanId(values.sourceId),
      targetId: cleanId(values.targetId),
      label: cleanString(values.label),
      remark: cleanString(values.remark),
      body: normalizeArrowPart('body', values.body),
      head: normalizeArrowPart('head', values.head),
      tail: normalizeArrowPart('tail', values.tail),
      level: normalizeArrowLevel(values.level),
      endpointScale: normalizeArrowEndpointScale(values.endpointScale),
      curve: clamp(finiteNumber(values.curve, 0), -160, 160),
      labelOffset: clamp(finiteNumber(values.labelOffset, 0), -120, 120),
      color: normalizeColor(values.color, '#5f574e')
    });
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
      body.append(key, title, meta);
      const citeText = referenceDisplayCiteText(reference);
      if (citeText) {
        const cite = document.createElement('div');
        cite.className = 'theorem-reference-cite';
        cite.textContent = citeText;
        body.appendChild(cite);
      }
      const links = referenceLinks(reference);
      if (links.length) {
        const linkList = document.createElement('div');
        linkList.className = 'theorem-reference-link-list';
        links.forEach((entry, index) => {
          const link = document.createElement('a');
          link.className = 'theorem-reference-link';
          link.href = entry.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = referenceLinkLabel(reference, entry, index);
          linkList.appendChild(link);
        });
        body.appendChild(linkList);
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
    refs.referenceEditCite.value = referenceDisplayCiteText(reference);
    refs.referenceEditTitle.value = reference.title;
    refs.referenceEditAuthor.value = reference.author;
    refs.referenceEditYear.value = reference.year;
    renderReferenceEditLinks(referenceLinks(reference));
    refs.referenceEditRaw.value = reference.rawBibtex;
    setReferenceMessage(`Editing [${reference.key}].`);
  }

  function renderReferenceEditLinks(links) {
    if (!refs.referenceEditLinks) return;
    refs.referenceEditLinks.replaceChildren();
    links.forEach((link) => {
      addReferenceEditLinkRow(link);
    });
    clearReferenceEditLinkDraft();
  }

  function addReferenceEditLinkFromDraft() {
    const rawUrl = cleanString(refs.referenceEditLinkUrl ? refs.referenceEditLinkUrl.value : '');
    const label = cleanString(refs.referenceEditLinkLabel ? refs.referenceEditLinkLabel.value : '');
    if (!rawUrl) {
      setReferenceMessage('Enter a link before adding.', true);
      return;
    }
    const url = normalizeUrl(rawUrl);
    if (!url) {
      setReferenceMessage('Enter a valid link before adding.', true);
      return;
    }
    addReferenceEditLinkRow({
      url,
      label,
      source: inferReferenceSource(url)
    });
    clearReferenceEditLinkDraft();
    setReferenceMessage('Link added to the edit form.');
  }

  function clearReferenceEditLinkDraft() {
    if (refs.referenceEditLinkLabel) refs.referenceEditLinkLabel.value = '';
    if (refs.referenceEditLinkUrl) refs.referenceEditLinkUrl.value = '';
  }

  function addReferenceEditLinkRow(link = {}) {
    if (!refs.referenceEditLinks) return;
    const row = document.createElement('div');
    row.className = 'theorem-reference-link-row';

    const label = createReferenceLinkLabelControl(link.label);

    const url = document.createElement('input');
    url.className = 'theorem-input';
    url.type = 'url';
    url.spellcheck = false;
    url.autocomplete = 'off';
    url.placeholder = 'https://example.com';
    url.value = cleanString(link.url);
    url.dataset.referenceLinkUrl = 'true';

    const remove = document.createElement('button');
    remove.className = 'btn btn-ghost theorem-small-button';
    remove.type = 'button';
    remove.textContent = 'delete';
    remove.addEventListener('click', () => {
      row.remove();
    });

    row.append(label, url, remove);
    refs.referenceEditLinks.appendChild(row);
  }

  function createReferenceLinkLabelControl(labelText) {
    const label = document.createElement('span');
    label.className = 'theorem-reference-link-label-text';
    label.tabIndex = 0;
    label.dataset.referenceLinkLabel = 'true';
    setReferenceLinkLabelText(label, labelText);
    const beginEdit = () => {
      if (label.contentEditable === 'true') return;
      label.dataset.previousLabel = linkLabelValue(label);
      label.contentEditable = 'true';
      if (label.classList.contains('is-empty')) {
        label.textContent = '';
        label.classList.remove('is-empty');
      }
      label.focus();
    };
    label.addEventListener('click', beginEdit);
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        label.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setReferenceLinkLabelText(label, label.dataset.previousLabel || '');
        label.blur();
      }
    });
    label.addEventListener('blur', () => {
      setReferenceLinkLabelText(label, label.textContent);
      label.contentEditable = 'false';
    });
    return label;
  }

  function setReferenceLinkLabelText(label, value) {
    const text = cleanString(value);
    label.textContent = text || 'label';
    label.classList.toggle('is-empty', !text);
  }

  function linkLabelValue(label) {
    if (!label || label.classList.contains('is-empty')) return '';
    return cleanString(label.textContent);
  }

  function collectReferenceEditLinks() {
    if (!refs.referenceEditLinks) return { links: [], invalid: false };
    const links = [];
    let invalid = false;
    const rows = Array.from(refs.referenceEditLinks.querySelectorAll('.theorem-reference-link-row'));
    rows.forEach((row) => {
      const urlInput = row.querySelector('[data-reference-link-url]');
      const labelInput = row.querySelector('[data-reference-link-label]');
      const rawUrl = cleanString(urlInput ? urlInput.value : '');
      if (!rawUrl) return;
      const url = normalizeUrl(rawUrl);
      if (!url) {
        invalid = true;
        return;
      }
      links.push({
        url,
        source: inferReferenceSource(url),
        label: linkLabelValue(labelInput)
      });
    });
    return { links, invalid };
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
    const linkResult = collectReferenceEditLinks();
    if (linkResult.invalid) {
      setReferenceMessage('Enter valid links or remove invalid link rows.', true);
      return;
    }
    const rawBibtex = cleanString(refs.referenceEditRaw.value);
    const primaryLink = linkResult.links[0] || null;
    original.key = nextKey;
    original.title = cleanString(refs.referenceEditTitle.value);
    original.author = cleanString(refs.referenceEditAuthor.value);
    original.year = cleanString(refs.referenceEditYear.value);
    original.rawBibtex = rawBibtex;
    original.links = linkResult.links;
    original.url = primaryLink ? primaryLink.url : '';
    original.source = primaryLink ? primaryLink.source : (rawBibtex ? 'bibtex' : normalizeReferenceSource(original.source, 'web'));
    original.citeText = cleanString(refs.referenceEditCite.value) || referenceDefaultCiteText(original);
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
    const fields = ['label', 'setting', 'condition', 'result', 'proofSketch', 'remark'];
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
    const overrides = referenceInputOverrides();
    if (overrides.invalidUrl) {
      setReferenceMessage('Enter a valid link or leave it blank.', true);
      return;
    }
    const parsed = parseBibtex(raw);
    if (!parsed.length) {
      setReferenceMessage('No BibTeX entries found.', true);
      return;
    }
    if (overrides.hasValues && parsed.length !== 1) {
      setReferenceMessage('Use link/key/title overrides with exactly one BibTeX entry.', true);
      return;
    }
    let added = 0;
    let replaced = 0;
    parsed.forEach((entry) => {
      const merged = overrides.hasValues ? applyReferenceInputOverrides(entry, overrides) : entry;
      if (!merged.key) return;
      const next = makeReference(merged);
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
    if (overrides.hasValues) clearLinkReferenceControls();
    setReferenceMessage(`${added} added, ${replaced} replaced.`);
    renderAll();
  }

  function referenceInputOverrides() {
    const rawUrl = cleanString(refs.linkReferenceUrl ? refs.linkReferenceUrl.value : '');
    const url = rawUrl ? normalizeUrl(rawUrl) : '';
    const key = cleanString(refs.linkReferenceKey ? refs.linkReferenceKey.value : '');
    const title = cleanString(refs.linkReferenceTitle ? refs.linkReferenceTitle.value : '');
    return {
      hasValues: !!(rawUrl || key || title),
      invalidUrl: !!(rawUrl && !url),
      key,
      title,
      url,
      source: url ? inferReferenceSource(url) : ''
    };
  }

  function applyReferenceInputOverrides(entry, overrides) {
    const next = { ...entry };
    if (overrides.key) {
      next.key = overrides.key;
      next.citeText = defaultCiteText(overrides.key);
    }
    if (overrides.title) next.title = overrides.title;
    if (overrides.url) {
      const source = overrides.source || inferReferenceSource(overrides.url);
      next.url = overrides.url;
      next.source = source;
      next.links = [{ url: overrides.url, source, label: '' }];
    }
    return next;
  }

  function clearLinkReferenceControls() {
    if (refs.linkReferenceUrl) refs.linkReferenceUrl.value = '';
    if (refs.linkReferenceKey) refs.linkReferenceKey.value = '';
    if (refs.linkReferenceTitle) refs.linkReferenceTitle.value = '';
  }

  function addLinkReferenceFromControls() {
    const rawUrl = cleanString(refs.linkReferenceUrl ? refs.linkReferenceUrl.value : '');
    const url = normalizeUrl(rawUrl);
    const titleInput = cleanString(refs.linkReferenceTitle ? refs.linkReferenceTitle.value : '');
    if (rawUrl && !url) {
      setReferenceMessage('Enter a valid link or leave it blank.', true);
      return;
    }
    if (!url && !titleInput) {
      setReferenceMessage('Enter a title or link before adding.', true);
      return;
    }
    const inferredSource = url ? inferReferenceSource(url) : 'web';
    const title = titleInput || defaultLinkTitle(url, inferredSource);
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
      links: url ? [{ url, source: inferredSource, label: '' }] : []
    }));
    clearLinkReferenceControls();
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
          rawBibtex: rawEntry,
          links: fields.url ? [{ url: fields.url, source: inferReferenceSource(fields.url), label: '' }] : []
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
    refs.exportOut.value = buildPresetFileExport();
    syncControls();
  }

  function markCurrentExportClean() {
    state.cleanExportSignature = graphContentSignature();
  }

  function hasUnsavedCorrections() {
    return !!state.cleanExportSignature && graphContentSignature() !== state.cleanExportSignature;
  }

  function graphContentSignature() {
    const snapshot = buildExport();
    if (snapshot.view && typeof snapshot.view === 'object') {
      delete snapshot.view.selectedId;
      delete snapshot.view.selectedReferenceKeys;
      delete snapshot.view.layoutRunning;
      if (!Object.keys(snapshot.view).length) delete snapshot.view;
    }
    return JSON.stringify(snapshot);
  }

  function handleBeforeUnload(event) {
    if (!hasUnsavedCorrections()) return undefined;
    event.preventDefault();
    event.returnValue = '';
    return '';
  }

  function buildPresetFileExport() {
    const preset = buildExport();
    const key = presetKeyFromTitle(preset.title);
    const file = `${key}.preset.js`;
    return [
      `// Save this file as theorem_graph_presets/${file}`,
      '// Add this entry to theorem_graph_presets/presets.js:',
      `// { label: ${JSON.stringify(preset.title)}, key: ${JSON.stringify(key)}, file: ${JSON.stringify(file)} }`,
      'window.THEOREM_GRAPH_PRESET_DATA = window.THEOREM_GRAPH_PRESET_DATA || {};',
      `window.THEOREM_GRAPH_PRESET_DATA.${key} = ${JSON.stringify(preset, null, 2)};`
    ].join('\n');
  }

  function buildExport() {
    return {
      schemaVersion: SCHEMA_VERSION,
      title: cleanGraphTitle(state.graphTitle),
      nodes: state.nodes.map((node) => ({
        ...node.extra,
        id: node.id,
        type: node.type,
        label: node.label,
        ...(node.type === 'misc' ? { details: cleanMiscDetailsForExport(node.details) } : {}),
        setting: node.setting,
        condition: node.condition,
        result: node.result,
        proofSketch: node.proofSketch,
        citationKeys: [...node.citationKeys],
        color: node.color,
        fillColor: normalizeNodeFillColor(node.fillColor, (NODE_TYPES[node.type] || NODE_TYPES.theorem).fill),
        x: roundNumber(node.x),
        y: roundNumber(node.y)
      })),
      arrows: state.arrows.map((arrow) => ({
        ...arrow.extra,
        id: arrow.id,
        sourceId: arrow.sourceId,
        targetId: arrow.targetId,
        label: arrow.label,
        remark: arrow.remark,
        body: arrow.body,
        head: arrow.head,
        tail: arrow.tail,
        level: normalizeArrowLevel(arrow.level),
        endpointScale: roundScale(arrow.endpointScale),
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
        citeText: referenceExportCiteText(reference),
        url: reference.url,
        source: reference.source,
        rawBibtex: reference.rawBibtex,
        links: referenceExportLinks(reference)
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

  function setImportMode(mode) {
    state.importMode = mode === 'json' ? 'json' : 'preset';
    syncControls();
  }

  function currentImportMode() {
    if (refs.importModeJson && refs.importModeJson.checked) return 'json';
    return state.importMode === 'json' ? 'json' : 'preset';
  }

  async function loadImport() {
    if (currentImportMode() === 'preset') {
      await loadSelectedPreset();
      return;
    }
    loadJsonImport();
  }

  function loadJsonImport() {
    const raw = refs.importInput.value.trim();
    if (!raw) {
      setExportMessage('Paste JSON text before loading.', true);
      return;
    }
    let data;
    try {
      data = parseImportText(raw);
    } catch (error) {
      setExportMessage(error.message, true);
      return;
    }

    try {
      applyImportData(data, 'JSON text');
    } catch (error) {
      setExportMessage(error.message, true);
    }
  }

  function parseImportText(raw) {
    try {
      return JSON.parse(raw);
    } catch (jsonError) {
      const presetData = parsePresetFileText(raw);
      if (presetData) return presetData;
      throw new Error(`Invalid import: expected JSON or an exported preset file. JSON parser said: ${jsonError.message}`);
    }
  }

  function parsePresetFileText(raw) {
    const targetPattern = /window\s*\.\s*THEOREM_GRAPH_PRESET_DATA\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\])\s*=/g;
    let match;
    let lastError = null;
    while ((match = targetPattern.exec(raw))) {
      const objectStart = raw.indexOf('{', match.index + match[0].length);
      const objectEnd = findJsonObjectEnd(raw, objectStart);
      if (objectEnd < 0) continue;
      try {
        return JSON.parse(raw.slice(objectStart, objectEnd + 1));
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw new Error(`Invalid preset file: ${lastError.message}`);
    }
    return null;
  }

  function findJsonObjectEnd(text, start) {
    if (start < 0 || text[start] !== '{') return -1;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  }

  function applyImportData(data, sourceLabel = 'graph') {
    const next = normalizeImport(data);
    stopLayout();
    state.graphTitle = next.title;
    state.nodes = next.nodes;
    state.arrows = next.arrows;
    state.references = next.references;
    state.selectedReferenceKeys = next.selectedReferenceKeys;
    state.editingReferenceKey = null;
    if (refs.referenceEditForm) refs.referenceEditForm.hidden = true;
    state.selectedNodeId = next.selectedNodeId;
    state.selectedArrowId = null;
    state.activeLatexDetailField = null;
    resetDetailEditBaseline();
    state.connectMode = false;
    state.connectSourceId = null;
    state.viewExtra = next.viewExtra;
    state.nodeSerial = nextSerial(state.nodes.map((node) => node.id), 'n');
    state.arrowSerial = nextSerial(state.arrows.map((arrow) => arrow.id), 'a');
    clampAllNodes();
    setExportMessage(`Loaded ${state.nodes.length} nodes and ${state.arrows.length} arrows from ${sourceLabel}.`);
    setStatus('Imported graph.');
    renderAll();
    markCurrentExportClean();
  }

  function loadPresetRegistry() {
    if (!refs.presetSelect) return;
    const registryPresets = normalizePresetRegistry(window.THEOREM_GRAPH_PRESETS);
    state.presets = registryPresets;
    setPresetOptions(registryPresets, registryPresets.length ? 'Choose a preset' : 'No presets found');
    selectDefaultPresetOption();
    setExportMessage(
      registryPresets.length
        ? `Loaded ${registryPresets.length} preset${registryPresets.length === 1 ? '' : 's'} from presets.js.`
        : 'No presets are registered in theorem_graph_presets/presets.js.',
      !registryPresets.length
    );
    syncControls();
  }

  function selectDefaultPresetOption() {
    if (!refs.presetSelect) return;
    const index = state.presets.findIndex((preset) => preset.key === DEFAULT_PRESET_KEY);
    if (index >= 0) refs.presetSelect.value = String(index);
  }

  function normalizePresetRegistry(registry) {
    const rawPresets = Array.isArray(registry) ? registry : [];
    return rawPresets
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const label = cleanString(entry.label || entry.title || entry.name) || 'Preset';
        if (entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data)) {
          return { label, data: entry.data };
        }
        const json = cleanString(entry.json);
        if (json) return { label, json };
        const file = cleanPresetFile(entry.file);
        if (file) {
          const key = cleanString(entry.key || entry.id) || presetKeyFromFile(file);
          return { label, file, key };
        }
        return null;
      })
      .filter(Boolean);
  }

  function cleanPresetFile(file) {
    const value = cleanString(file).replace(/\\/g, '/');
    if (!value || /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('/') || value.includes('..')) return '';
    return value.replace(/^\.?\//, '');
  }

  function presetKeyFromFile(file) {
    return cleanString(file)
      .replace(/^.*\//, '')
      .replace(/\.preset\.js$/i, '')
      .replace(/\.js$/i, '')
      .replace(/[^A-Za-z0-9_$]/g, '_') || 'preset';
  }

  function presetKeyFromTitle(title) {
    const key = cleanGraphTitle(title)
      .toLowerCase()
      .replace(/[^a-z0-9_$]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return /^[a-z_$]/.test(key) ? key : `preset_${key || 'graph'}`;
  }

  function setPresetOptions(presets, placeholder) {
    if (!refs.presetSelect) return;
    refs.presetSelect.innerHTML = '';
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    refs.presetSelect.appendChild(empty);
    presets.forEach((preset, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = preset.label;
      refs.presetSelect.appendChild(option);
    });
  }

  async function loadSelectedPreset() {
    if (!refs.presetSelect) return;
    const preset = state.presets[Number(refs.presetSelect.value)];
    if (!preset) {
      setExportMessage('Choose a preset before applying.', true);
      return;
    }
    try {
      const data = await readPresetData(preset);
      applyImportData(data, preset.label);
    } catch (error) {
      setExportMessage(`Preset load failed: ${error.message}`, true);
    }
  }

  async function loadDefaultPreset() {
    const index = state.presets.findIndex((preset) => preset.key === DEFAULT_PRESET_KEY);
    if (index < 0) {
      loadSeedExampleFallback('Default preset not found; loaded the starter example.', true);
      return;
    }
    if (refs.presetSelect) refs.presetSelect.value = String(index);
    const preset = state.presets[index];
    try {
      const data = await readPresetData(preset);
      applyImportData(data, preset.label);
      setExportMessage(`Default preset "${preset.label}" loaded.`);
    } catch (error) {
      loadSeedExampleFallback(`Default preset failed: ${error.message}. Loaded the starter example.`, true);
    }
  }

  function loadSeedExampleFallback(message, error = false) {
    seedExample();
    renderAll();
    markCurrentExportClean();
    setExportMessage(message, error);
    setStatus('Loaded starter example.');
  }

  async function readPresetData(preset) {
    if (preset.data) return preset.data;
    if (preset.json) return JSON.parse(preset.json);
    if (preset.file) return loadPresetScriptData(preset);
    throw new Error('Preset entry must provide data, json, or file in presets.js.');
  }

  function loadPresetScriptData(preset) {
    const key = cleanString(preset.key);
    if (!key) return Promise.reject(new Error('Preset file entry needs a key.'));
    if (window.THEOREM_GRAPH_PRESET_DATA && window.THEOREM_GRAPH_PRESET_DATA[key]) {
      return Promise.resolve(window.THEOREM_GRAPH_PRESET_DATA[key]);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const query = state.presetScriptNonce ? `?t=${encodeURIComponent(state.presetScriptNonce)}` : '';
      script.src = `${PRESET_FOLDER_URL}${presetUrlPath(preset.file)}${query}`;
      script.onload = () => {
        const data = window.THEOREM_GRAPH_PRESET_DATA && window.THEOREM_GRAPH_PRESET_DATA[key];
        if (data) resolve(data);
        else reject(new Error(`Preset file loaded, but did not register key "${key}".`));
      };
      script.onerror = () => reject(new Error(`Could not load ${preset.file}.`));
      document.head.appendChild(script);
    });
  }

  function presetUrlPath(file) {
    return cleanString(file).split('/').map(encodeURIComponent).join('/');
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
    const titleSource = Object.prototype.hasOwnProperty.call(data, 'title')
      ? data.title
      : (Object.prototype.hasOwnProperty.call(view, 'title') ? view.title : DEFAULT_GRAPH_TITLE);
    return {
      title: cleanGraphTitle(titleSource),
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

  function syncImportModeControls() {
    const mode = state.importMode === 'json' ? 'json' : 'preset';
    state.importMode = mode;
    const jsonMode = mode === 'json';
    if (refs.importModePreset) refs.importModePreset.checked = !jsonMode;
    if (refs.importModeJson) refs.importModeJson.checked = jsonMode;
    if (refs.presetImportRow) refs.presetImportRow.hidden = jsonMode;
    if (refs.jsonImportPanel) refs.jsonImportPanel.hidden = !jsonMode;
    if (refs.presetSelect) refs.presetSelect.disabled = jsonMode;
    if (refs.importInput) refs.importInput.disabled = !jsonMode;
    if (refs.clearImport) refs.clearImport.disabled = !jsonMode;
    if (refs.loadImport) {
      refs.loadImport.disabled = jsonMode
        ? false
        : !(state.presets.length && refs.presetSelect && refs.presetSelect.value);
    }
  }

  function syncControls() {
    const selectedNode = findNode(state.selectedNodeId);
    const selectedArrow = findArrow(state.selectedArrowId);
    if (refs.graphCountBadge) {
      refs.graphCountBadge.textContent = `${state.nodes.length} node${state.nodes.length === 1 ? '' : 's'}, ${state.arrows.length} arrow${state.arrows.length === 1 ? '' : 's'}`;
    }
    if (refs.graphTitle && refs.graphTitle.value !== state.graphTitle) refs.graphTitle.value = state.graphTitle;
    syncDebugControlValues();
    syncImportModeControls();
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
        ? 'Selected arrow: edit parents, type, curve, label, offset, and color in the Node / Arrow card.'
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

  function arrowPartsFromSource(source = {}) {
    if (
      Object.prototype.hasOwnProperty.call(source, 'body')
      || Object.prototype.hasOwnProperty.call(source, 'head')
      || Object.prototype.hasOwnProperty.call(source, 'tail')
    ) {
      const body = normalizeArrowBodySpec(source.body);
      return {
        body: body.body,
        head: normalizeArrowPart('head', source.head),
        tail: normalizeArrowPart('tail', source.tail),
        migratedLevel: body.level
      };
    }
    return arrowStyleDefinition(source.style);
  }

  function arrowStyleFromArrow(arrow = {}) {
    return {
      body: normalizeArrowPart('body', arrow.body),
      head: normalizeArrowPart('head', arrow.head),
      tail: normalizeArrowPart('tail', arrow.tail)
    };
  }

  function normalizeArrowPart(part, value, fallback) {
    const id = cleanString(value);
    if (part === 'body') return ARROW_BODY_IDS.has(id) ? id : normalizeArrowPart('body', fallback || 'solid');
    if (part === 'head') return ARROW_HEAD_IDS.has(id) ? id : normalizeArrowPart('head', fallback || 'arrow');
    if (part === 'tail') return ARROW_TAIL_IDS.has(id) ? id : normalizeArrowPart('tail', fallback || 'none');
    return '';
  }

  function normalizeArrowBodySpec(value) {
    const id = cleanString(value);
    if (id === 'double') return { body: 'solid', level: 2 };
    if (id === 'double-dashed') return { body: 'dashed', level: 2 };
    if (id === 'triple') return { body: 'solid', level: 3 };
    return { body: normalizeArrowPart('body', id), level: null };
  }

  function normalizeArrowLevel(value) {
    return Math.round(clamp(finiteNumber(value, ARROW_LEVEL_DEFAULT), ARROW_LEVEL_MIN, ARROW_LEVEL_MAX));
  }

  function normalizeArrowEndpointScale(value) {
    return clamp(finiteNumber(value, ARROW_ENDPOINT_SCALE_DEFAULT), ARROW_ENDPOINT_SCALE_MIN, ARROW_ENDPOINT_SCALE_MAX);
  }

  function normalizeArrowStyle(style) {
    const id = cleanString(style);
    return ARROW_STYLE_MAP.has(id) ? id : 'arrow';
  }

  function arrowStyleDefinition(style) {
    return ARROW_STYLE_MAP.get(normalizeArrowStyle(style)) || ARROW_STYLES[0];
  }

  function normalizeCitationKeys(value) {
    if (Array.isArray(value)) {
      return uniqueStrings(value.map(cleanString).filter(Boolean));
    }
    return uniqueStrings(cleanString(value).split(/[,\s;]+/).map(cleanString).filter(Boolean));
  }

  function referenceMeta(reference) {
    const source = referenceIsBibtexLike(reference)
      ? 'BibTeX'
      : (referenceLinks(reference).length ? 'Link' : referenceSourceLabel(reference.source));
    const linkCount = referenceLinks(reference).length;
    const linkMeta = linkCount > 1 ? `${linkCount} links` : '';
    const details = [reference.author, reference.year].filter(Boolean).join(' - ');
    return [source, linkMeta, details].filter(Boolean).join(' - ') || 'metadata not parsed';
  }

  function referenceDisplayCiteText(reference) {
    const citeText = cleanString(reference.citeText);
    if (!citeText) return referenceDefaultCiteText(reference);
    if (!referenceIsBibtexLike(reference) && citeText === defaultCiteText(reference.key)) return '';
    return citeText;
  }

  function referenceExportCiteText(reference) {
    const citeText = cleanString(reference.citeText);
    if (!referenceIsBibtexLike(reference) && citeText === defaultCiteText(reference.key)) return '';
    return citeText || referenceDefaultCiteText(reference);
  }

  function referenceDefaultCiteText(reference) {
    return referenceIsBibtexLike(reference) ? defaultCiteText(reference.key) : '';
  }

  function referenceIsBibtexLike(reference) {
    return normalizeReferenceSource(reference.source, '') === 'bibtex' || !!cleanString(reference.rawBibtex);
  }

  function referenceLinks(reference) {
    return normalizeReferenceLinks(reference.links, {
      url: reference.url,
      source: reference.source
    });
  }

  function referenceExportLinks(reference) {
    return referenceLinks(reference).map((link) => ({
      url: link.url,
      source: link.source,
      label: link.label
    }));
  }

  function referenceLinkLabel(reference, link, index = 0) {
    const customLabel = cleanString(link && link.label);
    if (customLabel) return customLabel;
    const suffix = index > 0 ? ` ${index + 1}` : '';
    return `open link${suffix}`;
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

  function cleanGraphTitle(value) {
    return cleanString(value).replace(/\s+/g, ' ');
  }

  function hasDollarMath(value) {
    const text = cleanString(value);
    if (!text) return false;
    let opening = false;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== '$' || isEscaped(text, index)) continue;
      if (opening) return true;
      opening = true;
    }
    return false;
  }

  function isEscaped(text, index) {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
      slashCount += 1;
    }
    return slashCount % 2 === 1;
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

  function normalizeNodeFillColor(value, fallback) {
    const color = normalizeColor(value, fallback);
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const lightness = perceivedLightness(rgb);
    const targetLightness = 0.86;
    if (lightness >= targetLightness) return color;
    const mix = clamp((targetLightness - lightness) / (1 - lightness || 1), 0, 1);
    return rgbToHex({
      r: rgb.r + (255 - rgb.r) * mix,
      g: rgb.g + (255 - rgb.g) * mix,
      b: rgb.b + (255 - rgb.b) * mix
    });
  }

  function applyNodeFillSaturation(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const factor = normalizeNodeFillSaturation(state.nodeFillSaturation) / 100;
    if (Math.abs(factor - 1) < 0.001) return color;
    const gray = perceivedLightness(rgb) * 255;
    return rgbToHex({
      r: gray + (rgb.r - gray) * factor,
      g: gray + (rgb.g - gray) * factor,
      b: gray + (rgb.b - gray) * factor
    });
  }

  function normalizeArrowBoundaryGap(value) {
    return clamp(Math.round(finiteNumber(value, ARROW_BOUNDARY_GAP_DEFAULT)), ARROW_BOUNDARY_GAP_MIN, ARROW_BOUNDARY_GAP_MAX);
  }

  function normalizeNodeFillSaturation(value) {
    return clamp(Math.round(finiteNumber(value, NODE_FILL_SATURATION_DEFAULT) / 10) * 10, NODE_FILL_SATURATION_MIN, NODE_FILL_SATURATION_MAX);
  }

  function hexToRgb(color) {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cleanString(color));
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    };
  }

  function perceivedLightness(rgb) {
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
  }

  function rgbToHex(rgb) {
    const channel = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
    return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundNumber(value) {
    return Math.round(value * 10) / 10;
  }

  function roundScale(value) {
    return Math.round(normalizeArrowEndpointScale(value) * 100) / 100;
  }

  function truncateText(value, limit) {
    const text = cleanString(value);
    return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3))}...` : text;
  }
})();
