(() => {
  'use strict';

  const MAX_DIMENSION = 8;
  const MAX_CI_EQUATIONS = 8;
  const MAX_AMBIENT = 16;
  const MAX_CI_DEGREE = 99;
  const MAX_CI_SLIDER_DEGREE = 12;
  const MAX_ROOT_EXPANSION_MONOMIALS = 1500;
  const MAX_EXPLICIT_ROOT_FACTORS = 64;
  const MAX_HOMOLOGY_RULE_PASSES = 10;
  const MAX_HOMOLOGY_RULE_MS = 300;
  const VARIETY_LETTER_NAMES = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'Q'];
  const SHEAF_LETTER_NAMES = ['\\mathcal{E}', '\\mathcal{F}', '\\mathcal{G}', '\\mathcal{H}', '\\mathcal{I}', '\\mathcal{J}', '\\mathcal{K}', '\\mathcal{L}', '\\mathcal{M}', '\\mathcal{N}'];
  const HOMOLOGY_HYPERPLANE_CLASS = 'hyperplane';
  const HOMOLOGY_POINT_CLASS = 'point';
  const HOMOLOGY_TOP_RULE_ID = 'top-hyperplane-point';
  const VARS = new Map();
  const refs = {};
  const hodgeACoeffCache = new Map();
  const state = {
    lastResult: null,
    varieties: [],
    sheaves: [],
    maps: [],
    activeVarietyId: null,
    activeSheafId: null,
    activeMapId: null,
    inputMode: 'create',
    labelDrag: null,
    mapDraft: null,
    mapDrag: null,
    basePickActive: false,
    canvasWidth: 0,
    canvasHeight: 0,
    draftVarietyNameDirty: false,
    draftSheafNameDirty: false,
    draftMapNameDirty: false,
    nextObjectId: 1,
    hodgeExpanded: false,
    hodgeWide: false,
    hodgeCellSize: 20,
    exportScope: 'main',
    constructionMessage: '',
    suppressLabelClickUntil: 0,
    suppressCardToggleUntil: 0,
    mathJaxQueue: Promise.resolve()
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    initializeInputObjects();
    syncInputEditorVisibility();
    normalizeControlVisibility();
    syncCompleteIntersectionControls();
    bindControls();
    bindCards();
    renderConstructionPanel();
    syncHodgeWidePlacement();
    recompute();
    window.addEventListener('resize', debounce(() => {
      renderCanvas(state.lastResult);
      syncHodgeWidePlacement();
    }, 80));
  }

  function collectRefs() {
    refs.dim = $('variety-dim');
    refs.varietyType = $('variety-type');
    refs.curveGenusRow = $('curve-genus-row');
    refs.curveGenus = $('curve-genus');
    refs.ciDegreesRow = $('ci-degrees-row');
    refs.ciDegrees = $('ci-degrees');
    refs.ciEquationCountRow = $('ci-equation-count-row');
    refs.ciEquationCount = $('ci-equation-count');
    refs.ciEquationCountValue = $('ci-equation-count-value');
    refs.ciDegreeSliders = $('ci-degree-sliders');
    refs.ciNote = $('ci-note');
    refs.varietyName = $('variety-name');
    refs.varietyEditorTitle = $('variety-editor-title');
    refs.varietyEditor = $('variety-editor');
    refs.sheafType = $('sheaf-type');
    refs.sheafName = $('sheaf-name');
    refs.sheafEditorTitle = $('sheaf-editor-title');
    refs.sheafEditor = $('sheaf-editor');
    refs.sheafBaseRow = $('sheaf-base-row');
    refs.sheafBaseVariety = $('sheaf-base-variety');
    refs.pickSheafBase = $('pick-sheaf-base');
    refs.mapEditor = $('map-editor');
    refs.mapEditorTitle = $('map-editor-title');
    refs.mapName = $('map-name');
    refs.mapPickStatus = $('map-pick-status');
    refs.resetMapPick = $('reset-map-pick');
    refs.constructionOperation = $('construction-operation');
    refs.constructionFields = $('construction-fields');
    refs.constructionPreview = $('construction-preview');
    refs.applyConstruction = $('apply-construction');
    refs.constructionMessage = $('construction-message');
    refs.inputMode = $('input-mode');
    refs.addObjectKind = $('add-object-kind');
    refs.inputOptions = $('input-options');
    refs.modifyWarning = $('modify-warning');
    refs.repeatNames = $('repeat-names');
    refs.repeatStyle = $('repeat-style');
    refs.addObject = $('add-object');
    refs.deleteObject = $('delete-object');
    refs.twistOption = $('sheaf-twist-option');
    refs.twistRow = $('twist-row');
    refs.twist = $('twist-r');
    refs.basisRow = $('basis-row');
    refs.basis = $('abstract-basis');
    refs.rootFormRow = $('root-form-row');
    refs.rootForm = $('root-form');
    refs.classTermRow = $('class-term-row');
    refs.classTermOnly = $('class-term-only');
    refs.classTermIndex = $('class-term-index');
    refs.rankRow = $('rank-row');
    refs.rank = $('rank-symbol');
    refs.canvas = $('sheaf-canvas');
    refs.canvasLabels = $('sheaf-canvas-labels');
    refs.clearCanvas = $('clear-canvas');
    refs.objectBadge = $('object-badge');
    refs.status = $('sheaf-status');
    refs.ringSummary = $('ring-summary');
    refs.classActions = $('class-actions');
    refs.classChart = $('class-chart');
    refs.classMessage = $('class-message');
    refs.exportClasses = $('export-classes');
    refs.homologyCard = $('homology-card');
    refs.homologyActive = $('homology-active');
    refs.homologyHyperplaneRow = $('homology-hyperplane-row');
    refs.homologyHyperplaneSymbol = $('homology-hyperplane-symbol');
    refs.homologyPointRow = $('homology-point-row');
    refs.homologyPointSymbol = $('homology-point-symbol');
    refs.homologySymbols = $('homology-symbols');
    refs.homologyRules = $('homology-rules');
    refs.homologyAddRule = $('homology-add-rule');
    refs.homologyRuleEquation = $('homology-rule-equation');
    refs.homologyAddRuleButton = $('homology-add-rule-button');
    refs.homologyMessage = $('homology-message');
    refs.hodgeCard = $('hodge-card');
    refs.hodgeSideAnchor = $('hodge-side-anchor');
    refs.hodgeWideHost = $('hodge-wide-host');
    refs.toggleHodgeWide = $('toggle-hodge-wide');
    refs.hodgeExpanded = $('hodge-expanded');
    refs.hodgeCellSize = $('hodge-cell-size');
    refs.hodgeCellSizeValue = $('hodge-cell-size-value');
    refs.hodgeActions = $('hodge-actions');
    refs.hodgeChart = $('hodge-chart');
    refs.hodgeMessage = $('hodge-message');
    refs.exportHodge = $('export-hodge');
    refs.exportCard = $('export-card');
    refs.exportFormat = $('export-format');
    refs.refreshExport = $('refresh-export');
    refs.copyExport = $('copy-export');
    refs.exportOut = $('export-out');
  }

  function $(id) {
    return document.getElementById(id);
  }

  function initializeInputObjects() {
    state.varieties = [];
    state.sheaves = [];
    state.maps = [];
    state.activeVarietyId = null;
    state.activeSheafId = null;
    state.activeMapId = null;
  }

  function createDefaultVariety() {
    return {
      id: nextInputId('X'),
      type: 'abstract',
      dim: '3',
      name: 'X',
      genus: 'g',
      ciDegrees: '',
      nameDirty: false
    };
  }

  function createDefaultSheaf() {
    return {
      id: nextInputId('E'),
      type: 'abstract',
      name: '\\mathcal{E}',
      twist: '1',
      rank: 'r',
      baseVarietyId: null,
      basis: 'chern',
      nameDirty: false
    };
  }

  function createDefaultMap(domain, codomain, options = {}) {
    const from = normalizeMapEndpoint(domain, 'domain');
    const to = normalizeMapEndpoint(codomain, 'codomain');
    return {
      id: nextInputId('M'),
      name: sanitizeMathLabel(options.name, readMapDraftName()),
      domainKind: from.kind,
      domainId: from.id,
      codomainKind: to.kind,
      codomainId: to.id,
      construction: options.construction || null
    };
  }

  function normalizeMapEndpoint(endpoint, role) {
    return {
      kind: endpoint?.kind || endpoint?.[`${role}Kind`] || null,
      id: endpoint?.id || endpoint?.[`${role}Id`] || null
    };
  }

  function createVarietyFromDraft() {
    const variety = {
      id: nextInputId('X'),
      ...readVarietyDraft()
    };
    variety.name = uniqueObjectName('variety', variety.name);
    refs.varietyName.value = variety.name;
    variety.nameDirty = variety.nameDirty || variety.name !== defaultVarietyNameLatex();
    geometryFromVariety(variety);
    positionVarietyOnCanvas(variety);
    avoidCanvasLabelOverlap(variety);
    return variety;
  }

  function createSheafFromDraft() {
    const baseVariety = draftBaseVariety();
    if (!baseVariety) return null;
    const sheaf = {
      id: nextInputId('E'),
      ...readSheafDraft(baseVariety)
    };
    sheaf.name = uniqueObjectName('sheaf', sheaf.name);
    refs.sheafName.value = sheaf.name;
    sheaf.nameDirty = sheaf.nameDirty || sheaf.name !== defaultSheafNameLatex();
    positionSheafNearBase(sheaf, baseVariety);
    avoidCanvasLabelOverlap(sheaf);
    sheafFromObject(sheaf, baseVariety ? geometryFromVariety(baseVariety) : null);
    return sheaf;
  }

  function readVarietyDraft() {
    const defaultName = defaultVarietyNameLatex();
    const name = sanitizeMathLabel(refs.varietyName.value, defaultName);
    return {
      type: refs.varietyType.value,
      dim: normalizedDraftDimension(),
      name,
      genus: sanitizeGenusInput(refs.curveGenus.value),
      ciAmbient: derivedCompleteIntersectionAmbient(),
      ciDegrees: normalizedCompleteIntersectionDegreesText(),
      nameDirty: state.draftVarietyNameDirty || name !== defaultName
    };
  }

  function readSheafDraft(baseVariety = draftBaseVariety()) {
    const defaultName = defaultSheafNameLatex();
    const name = sanitizeMathLabel(refs.sheafName.value, defaultName);
    return {
      type: refs.sheafType.value,
      name,
      twist: refs.twist.value,
      rank: refs.rank.value,
      baseVarietyId: baseVariety?.id || null,
      basis: normalizeBasisValue(refs.basis.value),
      nameDirty: state.draftSheafNameDirty || name !== defaultName
    };
  }

  function readMapDraftName() {
    const fallback = inputIsModifyMode() ? (activeMap()?.name || defaultMapNameLatex()) : defaultMapNameLatex();
    return sanitizeMathLabel(refs.mapName?.value, fallback);
  }

  function uniqueObjectName(kind, proposedName, excludeId = null) {
    if (!refs.repeatNames?.checked) return proposedName;
    const items = kind === 'sheaf' ? state.sheaves : state.varieties;
    const used = new Set(items
      .filter((item) => item.id !== excludeId)
      .map((item) => canonicalMathLabel(item.name)));
    const sequence = repetitionNameSequence(kind, proposedName);
    const sequenceKeys = new Set(sequence.map(canonicalMathLabel));
    const proposedKey = canonicalMathLabel(proposedName);
    if (!sequenceKeys.has(proposedKey)) return proposedName;
    if (!used.has(proposedKey)) return proposedName;
    for (const candidate of sequence) {
      if (!used.has(canonicalMathLabel(candidate))) return candidate;
    }
    return proposedName;
  }

  function nameBelongsToRepetitionModel(kind, name) {
    const sequence = repetitionNameSequence(kind, name);
    const key = canonicalMathLabel(name);
    return sequence.some((candidate) => canonicalMathLabel(candidate) === key);
  }

  function repetitionNameSequence(kind, proposedName) {
    const style = refs.repeatStyle?.value || 'letters';
    if (style === 'letters') {
      return kind === 'sheaf' ? SHEAF_LETTER_NAMES : VARIETY_LETTER_NAMES;
    }
    const base = repetitionBaseName(kind, proposedName);
    if (style === 'prime') {
      return Array.from({ length: 24 }, (_, index) => `${base}${"'".repeat(index)}`);
    }
    if (style === 'paren') {
      return Array.from({ length: 25 }, (_, index) => (index === 0 ? base : `${base}^{(${index})}`));
    }
    if (style === 'subscript') {
      return Array.from({ length: 25 }, (_, index) => (index === 0 ? base : `${base}_{${index}}`));
    }
    return [base];
  }

  function repetitionBaseName(kind, proposedName) {
    const fallback = kind === 'sheaf' ? '\\mathcal{E}' : (refs.varietyType?.value === 'curve' ? curveDefaultName(refs.curveGenus?.value) : 'X');
    const name = sanitizeMathLabel(proposedName, fallback);
    if (refs.repeatStyle?.value === 'letters') return name;
    if (kind === 'sheaf') {
      const match = name.match(/^\\mathcal\{([A-Z])\}(?:'*)?(?:\^\{\(\d+\)\}|_\{\d+\})?$/);
      return match ? `\\mathcal{${match[1]}}` : name;
    }
    const match = name.match(/^([A-Za-z])(?:'*)?(?:\^\{\(\d+\)\}|_\{\d+\})?$/);
    return match ? match[1] : name;
  }

  function canonicalMathLabel(value) {
    return String(value || '').replace(/\s+/g, '');
  }

  function curveDefaultName(genusValue) {
    return sanitizeGenusInput(genusValue) === '1' ? 'E' : 'C';
  }

  function sanitizeGenusInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'g';
    if (raw === 'g') return 'g';
    if (/^\d+$/.test(raw)) return raw;
    return 'g';
  }

  function varietyHasHyperplaneClass(type) {
    return type === 'projective' || type === 'complete-intersection';
  }

  function sheafSupportsChernRoots(sheaf = activeSheaf()) {
    return !!sheaf && (sheaf.type === 'abstract' || sheaf.type === 'locally-free');
  }

  function normalizeBasisValue(value) {
    if (value === 'character') return 'character';
    if (value === 'roots') return 'roots';
    return 'chern';
  }

  function basisLabel(value) {
    const basis = normalizeBasisValue(value);
    if (basis === 'character') return 'Chern character';
    if (basis === 'roots') return 'Chern roots';
    return 'Chern classes';
  }

  function basisStatusLabel(value) {
    return basisLabel(value).toLowerCase();
  }

  function syncClassDisplayControls(result = state.lastResult) {
    const hasClasses = !!result?.classRows?.length || (!!activeSheaf() && !!activeVariety());
    const supportsRoots = sheafSupportsChernRoots(result?.sheaf || activeSheaf());
    syncBasisOptions(supportsRoots);
    const usingRoots = supportsRoots && refs.basis?.value === 'roots';
    if (refs.rootFormRow) refs.rootFormRow.hidden = !hasClasses || !usingRoots;
    const rankPlain = result?.bundle?.rankPlain || result?.sheaf?.rankPlain || activeSheaf()?.rank;
    const activeDim = Number.isInteger(result?.geometry?.dim) ? result.geometry.dim : null;
    const fallbackVariety = activeVariety();
    const classDim = activeDim == null
      ? (fallbackVariety ? normalizedInt(fallbackVariety.dim, 0, MAX_DIMENSION, MAX_DIMENSION) : MAX_DIMENSION)
      : activeDim;
    const expandedOption = refs.rootForm?.querySelector('option[value="expanded"]');
    const canExpandRoots = usingRoots && rootExpansionRankFromPlain(rankPlain, classDim) != null;
    if (expandedOption) expandedOption.disabled = !canExpandRoots;
    if (!canExpandRoots && refs.rootForm?.value === 'expanded') refs.rootForm.value = 'product';
    if (refs.classTermRow) refs.classTermRow.hidden = !hasClasses;
    const termOnly = !!refs.classTermOnly?.checked;
    if (refs.classTermIndex) refs.classTermIndex.disabled = !hasClasses || !termOnly;
    if (refs.classTermIndex) {
      refs.classTermIndex.max = String(Math.max(0, classDim));
    }
  }

  function syncBasisOptions(supportsRoots = sheafSupportsChernRoots()) {
    if (!refs.basis) return;
    const rootOption = refs.basis.querySelector('option[value="roots"]');
    if (rootOption) rootOption.hidden = !supportsRoots;
    if (!supportsRoots && refs.basis.value === 'roots') refs.basis.value = 'chern';
  }

  function genusLatex(value) {
    return sanitizeGenusInput(value);
  }

  function genusPlain(value) {
    return sanitizeGenusInput(value);
  }

  function nextInputId(prefix) {
    const id = `${prefix}${state.nextObjectId}`;
    state.nextObjectId += 1;
    return id;
  }

  function activeVariety() {
    return state.varieties.find((item) => item.id === state.activeVarietyId) || state.varieties[0] || null;
  }

  function activeSheaf() {
    return state.sheaves.find((item) => item.id === state.activeSheafId) || null;
  }

  function activeMap() {
    return state.maps.find((item) => item.id === state.activeMapId) || null;
  }

  function selectedVariety() {
    return state.varieties.find((item) => item.id === state.activeVarietyId) || null;
  }

  function selectedSheaf() {
    return state.sheaves.find((item) => item.id === state.activeSheafId) || null;
  }

  function selectedMap() {
    return state.maps.find((item) => item.id === state.activeMapId) || null;
  }

  function activeObjectForModifyMode() {
    if (state.activeMapId) return selectedMap();
    if (state.activeSheafId) return selectedSheaf();
    if (state.activeVarietyId) return selectedVariety();
    return null;
  }

  function modifyKind() {
    if (state.activeMapId) return 'map';
    return state.activeSheafId ? 'sheaf' : 'variety';
  }

  function defaultBaseVarietyId() {
    return state.varieties.find((item) => item.id === state.activeVarietyId)?.id
      || state.varieties[0]?.id
      || null;
  }

  function draftBaseVariety() {
    const selectedId = refs.sheafBaseVariety?.value || defaultBaseVarietyId();
    return state.varieties.find((item) => item.id === selectedId) || null;
  }

  function baseVarietyForSheaf(sheaf) {
    if (!sheaf) return null;
    return state.varieties.find((item) => item.id === sheaf.baseVarietyId) || activeVariety() || state.varieties[0] || null;
  }

  function syncSheafBaseOptions(force = false) {
    if (!refs.sheafBaseVariety) return;
    const hasMultipleVarieties = state.varieties.length > 1;
    refs.sheafBaseRow.hidden = !refs.addObjectKind || refs.addObjectKind.value !== 'sheaf' || !hasMultipleVarieties;
    if (!hasMultipleVarieties) {
      refs.sheafBaseVariety.innerHTML = '';
      if (state.varieties.length === 1) refs.sheafBaseVariety.value = state.varieties[0].id;
      return;
    }
    const editingSheaf = inputIsModifyMode() && refs.addObjectKind?.value === 'sheaf' ? activeSheaf() : null;
    const fallback = editingSheaf?.baseVarietyId || defaultBaseVarietyId();
    const current = force ? fallback : (refs.sheafBaseVariety.value || fallback);
    refs.sheafBaseVariety.innerHTML = state.varieties.map((variety) => {
      const label = sanitizeMathLabel(variety.name, 'X');
      return `<option value="${escapeHtml(variety.id)}">${escapeHtml(latexToPlain(label))}</option>`;
    }).join('');
    const next = state.varieties.some((item) => item.id === current) ? current : fallback;
    if (next) refs.sheafBaseVariety.value = next;
    if (force && !refs.sheafBaseVariety.value) refs.sheafBaseVariety.value = next || '';
  }

  function positionSheafNearBase(sheaf, baseVariety) {
    if (!sheaf || !baseVariety) return;
    const baseX = Number.isFinite(baseVariety.labelX) ? baseVariety.labelX : 0.28;
    const baseY = Number.isFinite(baseVariety.labelY) ? baseVariety.labelY : 0.36;
    sheaf.labelX = clamp(baseX + 0.1, 0.08, 0.94);
    sheaf.labelY = clamp(baseY - 0.16, 0.08, 0.92);
  }

  function positionVarietyOnCanvas(variety) {
    if (!variety) return;
    variety.labelX = 0.28;
    variety.labelY = 0.36;
  }

  function avoidCanvasLabelOverlap(object) {
    if (!object) return;
    const step = 0.075;
    const rowStep = 0.045;
    const thresholdX = 0.055;
    const thresholdY = 0.055;
    const startX = Number.isFinite(object.labelX) ? object.labelX : 0.5;
    const startY = Number.isFinite(object.labelY) ? object.labelY : 0.5;
    const existing = [...state.varieties, ...state.sheaves];
    for (let row = 0; row < 6; row += 1) {
      const candidateY = clamp(startY + row * rowStep, 0.08, 0.92);
      for (let col = 0; col < 10; col += 1) {
        const candidateX = clamp(startX + col * step, 0.08, 0.94);
        const overlaps = existing.some((item) => (
          item.id !== object.id
          && Number.isFinite(item.labelX)
          && Number.isFinite(item.labelY)
          && Math.abs(item.labelX - candidateX) < thresholdX
          && Math.abs(item.labelY - candidateY) < thresholdY
        ));
        if (!overlaps) {
          object.labelX = candidateX;
          object.labelY = candidateY;
          return;
        }
      }
    }
  }

  function syncInputEditorVisibility() {
    const modifying = inputIsModifyMode();
    const hasModifyTarget = !!activeObjectForModifyMode();
    const showingMap = modifying ? !!state.activeMapId : refs.addObjectKind?.value === 'map';
    const showingSheaf = !showingMap && (modifying ? !!state.activeSheafId : refs.addObjectKind?.value === 'sheaf');
    if (refs.addObjectKind) refs.addObjectKind.hidden = modifying;
    if (refs.inputOptions) refs.inputOptions.hidden = modifying;
    if (refs.modifyWarning) refs.modifyWarning.hidden = !modifying || hasModifyTarget;
    refs.varietyEditor.hidden = modifying ? (showingSheaf || showingMap || !hasModifyTarget) : (showingSheaf || showingMap);
    refs.sheafEditor.hidden = modifying ? (!showingSheaf || !hasModifyTarget) : !showingSheaf;
    if (refs.mapEditor) refs.mapEditor.hidden = modifying ? (!showingMap || !hasModifyTarget) : !showingMap;
    syncInputModeControls();
    updateInputEditorTitles();
    updateDeleteObjectButton();
  }

  function resetDraftForKind(kind = currentInputKind()) {
    if (kind === 'sheaf') {
      refs.sheafType.value = 'abstract';
      refs.twist.value = '1';
      refs.rank.value = 'r';
      refs.basis.value = 'chern';
      state.draftSheafNameDirty = false;
      syncSheafBaseOptions(true);
      refs.sheafName.value = defaultCreateSheafNameLatex();
    } else if (kind === 'map') {
      clearMapDraft();
      state.draftMapNameDirty = false;
      syncDefaultMapName(true);
    } else {
      refs.varietyType.value = 'abstract';
      refs.dim.value = '3';
      refs.curveGenus.value = 'g';
      refs.ciDegrees.value = '';
      syncCompleteIntersectionControls();
      state.draftVarietyNameDirty = false;
      refs.varietyName.value = defaultCreateVarietyNameLatex();
    }
    normalizeControlVisibility();
  }

  function selectObject(kind, id) {
    activateObject(kind, id, { mode: 'modify', loadDraft: true });
    recompute();
  }

  function activateObject(kind, id, options = {}) {
    if (kind === 'variety') {
      state.activeVarietyId = id;
      state.activeSheafId = null;
      state.activeMapId = null;
    } else if (kind === 'sheaf') {
      state.activeSheafId = id;
      state.activeMapId = null;
      const sheaf = activeSheaf();
      const baseVariety = baseVarietyForSheaf(sheaf);
      if (baseVariety) state.activeVarietyId = baseVariety.id;
      if (sheaf) refs.basis.value = normalizeBasisValue(sheaf.basis);
    } else if (kind === 'map') {
      state.activeMapId = id;
      state.activeSheafId = null;
    }
    if (refs.addObjectKind && inputIsCreateMode() && (kind === 'variety' || kind === 'sheaf')) {
      refs.addObjectKind.value = kind;
    }
    if (options.mode) setInputMode(options.mode, { loadDraft: false });
    if (options.loadDraft) loadActiveObjectIntoDraft(kind);
    syncInputEditorVisibility();
  }

  function inputIsModifyMode() {
    return state.inputMode === 'modify';
  }

  function inputIsCreateMode() {
    return state.inputMode !== 'modify';
  }

  function setInputMode(mode, options = {}) {
    state.inputMode = mode === 'modify' ? 'modify' : 'create';
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    if (state.inputMode === 'modify' && options.clearSelection) {
      state.activeVarietyId = null;
      state.activeSheafId = null;
      state.activeMapId = null;
    }
    if (state.inputMode === 'modify') {
      clearMapDraft();
      setBasePickActive(false);
    }
    if (state.inputMode === 'create' && options.resetDraft) {
      resetDraftForKind(currentInputKind());
    }
    if (options.loadDraft && state.inputMode === 'modify' && activeObjectForModifyMode()) {
      loadActiveObjectIntoDraft(modifyKind());
    }
    syncInputEditorVisibility();
  }

  function syncInputModeControls() {
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    if (refs.addObject) {
      refs.addObject.textContent = currentInputKind() === 'map' && inputIsCreateMode() ? 'pick' : (inputIsModifyMode() ? 'update' : 'add');
      refs.addObject.hidden = inputIsModifyMode() && !activeObjectForModifyMode();
    }
    updateInputEditorTitles();
  }

  function updateInputEditorTitles() {
    const kind = inputIsModifyMode() ? modifyKind() : currentInputKind();
    if (refs.varietyEditorTitle) {
      if (inputIsModifyMode() && kind === 'variety') {
        setInlineMath(refs.varietyEditorTitle, `\\text{the variety } ${sanitizeMathLabel(refs.varietyName?.value || activeVariety()?.name, 'X')}`);
      } else {
        refs.varietyEditorTitle.textContent = 'new variety';
      }
    }
    if (refs.sheafEditorTitle) {
      if (inputIsModifyMode() && kind === 'sheaf') {
        setInlineMath(refs.sheafEditorTitle, `\\text{the sheaf } ${sanitizeMathLabel(refs.sheafName?.value || activeSheaf()?.name, '\\mathcal{E}')}`);
      } else {
        refs.sheafEditorTitle.textContent = 'new sheaf';
      }
    }
    if (refs.mapEditorTitle) {
      if (inputIsModifyMode() && kind === 'map') {
        setInlineMath(refs.mapEditorTitle, `\\text{the map } ${readMapDraftName()}`);
      } else {
        refs.mapEditorTitle.textContent = 'new map';
      }
    }
  }

  function loadActiveObjectIntoDraft(kind = currentInputKind()) {
    const item = activeObjectForKind(kind);
    if (!item) return;
    if (kind === 'map') loadMapIntoDraft(item);
    else if (kind === 'sheaf') loadSheafIntoDraft(item);
    else loadVarietyIntoDraft(item);
    normalizeControlVisibility();
  }

  function loadVarietyIntoDraft(variety) {
    refs.varietyType.value = variety.type || 'abstract';
    refs.dim.value = variety.dim ?? '3';
    refs.varietyName.value = variety.name || defaultVarietyNameLatex();
    refs.curveGenus.value = variety.genus || 'g';
    refs.ciDegrees.value = variety.ciDegrees || '';
    syncCompleteIntersectionControls();
    state.draftVarietyNameDirty = !!variety.nameDirty;
    updateInputEditorTitles();
  }

  function loadSheafIntoDraft(sheaf) {
    refs.sheafType.value = sheaf.type || 'abstract';
    refs.sheafName.value = sheaf.name || defaultSheafNameLatex();
    refs.twist.value = sheaf.twist ?? '1';
    refs.rank.value = sheaf.rank || 'r';
    refs.basis.value = normalizeBasisValue(sheaf.basis);
    state.draftSheafNameDirty = !!sheaf.nameDirty;
    syncSheafBaseOptions();
    if (refs.sheafBaseVariety && sheaf.baseVarietyId && state.varieties.some((item) => item.id === sheaf.baseVarietyId)) {
      refs.sheafBaseVariety.value = sheaf.baseVarietyId;
    }
    updateInputEditorTitles();
  }

  function loadMapIntoDraft(map) {
    state.mapDraft = map ? { domainKind: map.domainKind, domainId: map.domainId } : null;
    if (refs.mapName) refs.mapName.value = map?.name || defaultMapNameLatex();
    state.draftMapNameDirty = false;
    updateMapPickStatus();
    updateInputEditorTitles();
  }

  function activeObjectForKind(kind) {
    if (inputIsModifyMode()) {
      if (kind === 'map') return selectedMap();
      if (kind === 'sheaf') return selectedSheaf();
      return state.activeSheafId || state.activeMapId ? null : selectedVariety();
    }
    if (kind === 'map') return activeMap();
    return kind === 'sheaf' ? activeSheaf() : activeVariety();
  }

  function currentInputKind() {
    if (inputIsModifyMode()) return modifyKind();
    if (refs.addObjectKind?.value === 'map') return 'map';
    return refs.addObjectKind?.value === 'sheaf' ? 'sheaf' : 'variety';
  }

  function deleteActiveObject(kind = currentInputKind()) {
    if (kind === 'map') {
      const active = activeObjectForKind(kind);
      if (active) removeCanvasObject('map', active.id);
      return;
    }
    const deletingSheaf = kind === 'sheaf';
    const items = deletingSheaf ? state.sheaves : state.varieties;
    const active = activeObjectForKind(kind);
    if (!active) return;
    const index = items.findIndex((item) => item.id === active.id);
    if (index < 0) return;
    const removed = items.splice(index, 1)[0] || null;
    const next = items[Math.min(index, items.length - 1)] || null;
    if (deletingSheaf) {
      state.activeSheafId = next?.id || null;
      state.maps = state.maps.filter((map) => !(map.domainKind === 'sheaf' && map.domainId === removed?.id) && !(map.codomainKind === 'sheaf' && map.codomainId === removed?.id));
      if (next) {
        state.activeVarietyId = next.baseVarietyId || defaultBaseVarietyId();
        refs.basis.value = normalizeBasisValue(next.basis);
      }
    } else {
      const removedSheafIds = new Set(state.sheaves.filter((sheaf) => sheaf.baseVarietyId === removed?.id).map((sheaf) => sheaf.id));
      state.activeVarietyId = next?.id || null;
      state.activeSheafId = null;
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.baseVarietyId !== removed?.id);
      state.maps = state.maps.filter((map) => (
        !(map.domainKind === 'variety' && map.domainId === removed?.id)
        && !(map.codomainKind === 'variety' && map.codomainId === removed?.id)
        && !(map.domainKind === 'sheaf' && removedSheafIds.has(map.domainId))
        && !(map.codomainKind === 'sheaf' && removedSheafIds.has(map.codomainId))
      ));
      if (!state.varieties.some((variety) => variety.id === state.activeVarietyId)) {
        state.activeVarietyId = state.varieties[0]?.id || null;
      }
      syncDefaultSheafName();
    }
    if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
    clearMapDraft();
    syncSheafBaseOptions(true);
    if (inputIsModifyMode()) {
      const nextActive = activeObjectForKind(kind);
      if (nextActive) loadActiveObjectIntoDraft(kind);
      else setInputMode('create', { resetDraft: true });
    }
    recompute();
  }

  function removeCanvasObject(kind, id) {
    if (kind === 'map') {
      state.maps = state.maps.filter((map) => map.id !== id);
      if (state.activeMapId === id) state.activeMapId = null;
      if (state.mapDraft?.domainKind === 'map' && state.mapDraft.domainId === id) clearMapDraft();
      recompute();
      return;
    }
    if (kind === 'sheaf') {
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.id !== id);
      state.maps = state.maps.filter((map) => !(map.domainKind === 'sheaf' && map.domainId === id) && !(map.codomainKind === 'sheaf' && map.codomainId === id));
      if (state.activeSheafId === id) state.activeSheafId = null;
      if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
      clearMapDraft();
      syncSheafBaseOptions(true);
      recompute();
      return;
    }
    if (kind === 'variety') {
      const removedSheafIds = new Set(state.sheaves.filter((sheaf) => sheaf.baseVarietyId === id).map((sheaf) => sheaf.id));
      state.varieties = state.varieties.filter((variety) => variety.id !== id);
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.baseVarietyId !== id);
      state.maps = state.maps.filter((map) => (
        !(map.domainKind === 'variety' && map.domainId === id)
        && !(map.codomainKind === 'variety' && map.codomainId === id)
        && !(map.domainKind === 'sheaf' && removedSheafIds.has(map.domainId))
        && !(map.codomainKind === 'sheaf' && removedSheafIds.has(map.codomainId))
      ));
      if (state.activeVarietyId === id) state.activeVarietyId = state.varieties[0]?.id || null;
      if (state.activeSheafId && !state.sheaves.some((sheaf) => sheaf.id === state.activeSheafId)) state.activeSheafId = null;
      if (state.activeMapId && !state.maps.some((map) => map.id === state.activeMapId)) state.activeMapId = null;
      clearMapDraft();
      syncSheafBaseOptions(true);
      syncDefaultSheafName();
      recompute();
    }
  }

  function clearCanvasObjects() {
    state.varieties = [];
    state.sheaves = [];
    state.maps = [];
    state.activeVarietyId = null;
    state.activeSheafId = null;
    state.activeMapId = null;
    state.labelDrag = null;
    clearMapDraft();
    setBasePickActive(false);
    if (refs.addObjectKind) refs.addObjectKind.value = 'variety';
    setInputMode('create', { resetDraft: true });
    syncSheafBaseOptions(true);
    syncInputEditorVisibility();
    recompute();
  }

  function updateDeleteObjectButton() {
    if (!refs.deleteObject) return;
    const kind = currentInputKind();
    const active = activeObjectForKind(kind);
    refs.deleteObject.hidden = inputIsModifyMode() && !activeObjectForModifyMode();
    refs.deleteObject.disabled = !active;
    refs.deleteObject.textContent = 'delete';
    refs.deleteObject.title = active ? `Delete selected ${kind}` : `No ${kind} to delete`;
  }

  function createObjectFromDraft(kind = currentInputKind()) {
    if (kind === 'map') return null;
    if (kind === 'sheaf') {
      const sheaf = createSheafFromDraft();
      if (!sheaf) return null;
      state.sheaves.push(sheaf);
      state.activeSheafId = sheaf.id;
      state.activeVarietyId = sheaf.baseVarietyId || defaultBaseVarietyId();
      prepareNextDraftName('sheaf', sheaf.name);
      return sheaf;
    }
    const variety = createVarietyFromDraft();
    state.varieties.push(variety);
    state.activeVarietyId = variety.id;
    state.activeSheafId = null;
    prepareNextDraftName('variety', variety.name);
    return variety;
  }

  function prepareNextDraftName(kind, createdName) {
    if (!refs.repeatNames?.checked || !nameBelongsToRepetitionModel(kind, createdName)) return;
    if (kind === 'sheaf') {
      state.draftSheafNameDirty = false;
      refs.sheafName.value = uniqueObjectName('sheaf', createdName);
    } else {
      state.draftVarietyNameDirty = false;
      refs.varietyName.value = uniqueObjectName('variety', createdName);
    }
  }

  function updateObjectFromDraft(kind = currentInputKind()) {
    const active = activeObjectForKind(kind);
    if (!active) return null;
    if (kind === 'map') {
      active.name = readMapDraftName();
      updateInputEditorTitles();
      return active;
    }
    if (kind === 'sheaf') {
      const oldBaseId = active.baseVarietyId;
      const baseVariety = draftBaseVariety();
      if (!baseVariety) return null;
      Object.assign(active, readSheafDraft(baseVariety));
      if (oldBaseId !== active.baseVarietyId) {
        positionSheafNearBase(active, baseVariety);
        avoidCanvasLabelOverlap(active);
      }
      sheafFromObject(active, geometryFromVariety(baseVariety));
      state.activeSheafId = active.id;
      state.activeVarietyId = active.baseVarietyId || defaultBaseVarietyId();
      refs.basis.value = normalizeBasisValue(active.basis);
      return active;
    }
    Object.assign(active, readVarietyDraft());
    geometryFromVariety(active);
    if (active.type === 'curve') refs.dim.value = '1';
    state.activeVarietyId = active.id;
    state.activeSheafId = null;
    state.sheaves.forEach((sheaf) => {
      if (sheaf.baseVarietyId === active.id && !sheaf.nameDirty) {
        const rank = sanitizeRankInput(sheaf.rank);
        const twist = normalizedInt(sheaf.twist, -24, 24, 1);
        sheaf.name = defaultSheafNameFor(sheaf.type, rank, twist, active.name);
      }
    });
    syncDefaultSheafName();
    return active;
  }

  function bindControls() {
    if (refs.inputMode) {
      refs.inputMode.addEventListener('change', () => {
        setInputMode(refs.inputMode.value, {
          loadDraft: true,
          resetDraft: true,
          clearSelection: refs.inputMode.value === 'modify'
        });
        recompute();
      });
    }
    if (refs.repeatNames) {
      refs.repeatNames.addEventListener('change', () => {
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
    }
    if (refs.repeatStyle) {
      refs.repeatStyle.addEventListener('change', () => {
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
    }
    refs.addObjectKind.addEventListener('change', () => {
      state.activeMapId = null;
      clearMapDraft();
      setBasePickActive(false);
      if (refs.addObjectKind.value === 'variety') state.activeSheafId = null;
      if (inputIsModifyMode()) {
        if (!activeObjectForKind(currentInputKind())) setInputMode('create', { resetDraft: true });
        else loadActiveObjectIntoDraft(currentInputKind());
      } else {
        resetDraftForKind(currentInputKind());
      }
      syncInputEditorVisibility();
      if (inputIsModifyMode()) syncSheafBaseOptions();
      normalizeControlVisibility();
      typeset(refs.varietyEditor);
      typeset(refs.sheafEditor);
      typeset(refs.mapEditor);
      recompute();
    });
    refs.addObject.addEventListener('click', () => {
      const changed = inputIsModifyMode()
        ? updateObjectFromDraft()
        : createObjectFromDraft();
      if (!changed) return;
      syncSheafBaseOptions(true);
      recompute();
    });
    if (refs.deleteObject) {
      refs.deleteObject.addEventListener('click', () => {
        deleteActiveObject();
      });
    }
    refs.varietyType.addEventListener('change', () => {
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      if (refs.varietyType.value === 'curve') refs.dim.value = '1';
      if (refs.varietyType.value === 'complete-intersection') syncCompleteIntersectionControls();
      normalizeControlVisibility();
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.dim.addEventListener('change', () => {
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = refs.varietyType.value === 'curve' ? '1' : String(dim);
      if (refs.varietyType.value === 'complete-intersection') syncCompleteIntersectionControls();
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.curveGenus.addEventListener('input', () => {
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.curveGenus.addEventListener('change', () => {
      refs.curveGenus.value = sanitizeGenusInput(refs.curveGenus.value);
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    refs.ciDegrees.addEventListener('change', () => {
      syncCompleteIntersectionControls();
      syncDefaultVarietyName();
      syncDefaultSheafName();
    });
    if (refs.ciEquationCount) {
      refs.ciEquationCount.addEventListener('input', () => {
        syncCompleteIntersectionControls({ source: 'count' });
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
      refs.ciEquationCount.addEventListener('change', () => {
        syncCompleteIntersectionControls({ source: 'count' });
        syncDefaultVarietyName();
        syncDefaultSheafName();
      });
    }
    if (refs.ciDegreeSliders) {
      refs.ciDegreeSliders.addEventListener('input', (event) => {
        const slider = event.target.closest('.ci-degree-slider');
        if (!slider) return;
        updateDegreeFromSlider(slider);
      });
      refs.ciDegreeSliders.addEventListener('change', (event) => {
        const slider = event.target.closest('.ci-degree-slider');
        if (!slider) return;
        updateDegreeFromSlider(slider);
      });
    }
    refs.varietyName.addEventListener('input', () => {
      state.draftVarietyNameDirty = true;
      updateInputEditorTitles();
      syncDefaultSheafName();
    });
    refs.varietyName.addEventListener('change', () => {
      refs.varietyName.value = normalizeDraftNameForKind('variety', refs.varietyName.value);
      updateInputEditorTitles();
      syncDefaultSheafName();
    });
    refs.sheafType.addEventListener('change', () => {
      syncDefaultRank(true);
      syncDefaultSheafName();
    });
    refs.sheafName.addEventListener('input', () => {
      state.draftSheafNameDirty = true;
      updateInputEditorTitles();
    });
    refs.sheafName.addEventListener('change', () => {
      refs.sheafName.value = normalizeDraftNameForKind('sheaf', refs.sheafName.value);
      updateInputEditorTitles();
    });
    if (refs.mapName) {
      refs.mapName.addEventListener('input', () => {
        state.draftMapNameDirty = true;
        updateInputEditorTitles();
      });
      refs.mapName.addEventListener('change', () => {
        refs.mapName.value = readMapDraftName();
        updateInputEditorTitles();
      });
    }
    if (refs.sheafBaseVariety) {
      refs.sheafBaseVariety.addEventListener('change', () => {
        if (refs.sheafBaseVariety.value) {
          state.activeVarietyId = refs.sheafBaseVariety.value;
        }
        syncDefaultSheafName();
        normalizeControlVisibility();
        recompute();
      });
    }
    if (refs.pickSheafBase) {
      refs.pickSheafBase.addEventListener('click', () => {
        setBasePickActive(!state.basePickActive);
        clearMapDraft();
        recompute();
      });
    }
    refs.twist.addEventListener('change', () => {
      refs.twist.value = String(normalizedInt(refs.twist.value, -24, 24, 1));
      syncDefaultSheafName();
    });
    refs.basis.addEventListener('change', () => {
      const sheaf = activeSheaf();
      if (sheaf) sheaf.basis = normalizeBasisValue(refs.basis.value);
      syncClassDisplayControls();
      recompute();
    });
    if (refs.rootForm) {
      refs.rootForm.addEventListener('change', () => {
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.classTermOnly) {
      refs.classTermOnly.addEventListener('change', () => {
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.classTermIndex) {
      refs.classTermIndex.addEventListener('change', () => {
        const max = normalizedInt(refs.classTermIndex.max, 0, MAX_DIMENSION, MAX_DIMENSION);
        refs.classTermIndex.value = String(normalizedInt(refs.classTermIndex.value, 0, max, 1));
        syncClassDisplayControls();
        recompute();
      });
    }
    if (refs.homologyHyperplaneSymbol) {
      refs.homologyHyperplaneSymbol.addEventListener('change', () => {
        updateHomologySymbol(HOMOLOGY_HYPERPLANE_CLASS, refs.homologyHyperplaneSymbol.value);
      });
    }
    if (refs.homologyPointSymbol) {
      refs.homologyPointSymbol.addEventListener('change', () => {
        updateHomologySymbol(HOMOLOGY_POINT_CLASS, refs.homologyPointSymbol.value);
      });
    }
    if (refs.homologyRules) {
      refs.homologyRules.addEventListener('change', (event) => {
        const toggle = event.target.closest('[data-homology-rule-toggle]');
        if (!toggle) return;
        setHomologyRuleEnabled(toggle.dataset.homologyRuleToggle, toggle.checked);
      });
      refs.homologyRules.addEventListener('click', (event) => {
        const button = event.target.closest('[data-homology-rule-delete]');
        if (!button) return;
        deleteHomologyRule(button.dataset.homologyRuleDelete);
      });
    }
    if (refs.homologyAddRuleButton) {
      refs.homologyAddRuleButton.addEventListener('click', addHomologyRuleFromControls);
    }
    if (refs.resetMapPick) {
      refs.resetMapPick.addEventListener('click', () => {
        clearMapDraft();
        recompute();
      });
    }
    if (refs.constructionOperation) {
      refs.constructionOperation.addEventListener('change', () => {
        state.constructionMessage = '';
        renderConstructionPanel();
      });
    }
    if (refs.constructionFields) {
      refs.constructionFields.addEventListener('change', () => {
        state.constructionMessage = '';
        renderConstructionPanel();
      });
      refs.constructionFields.addEventListener('input', (event) => {
        if (event.target?.matches?.('[data-construction-field="name"]')) {
          state.constructionMessage = '';
          updateConstructionPreview();
        }
      });
    }
    if (refs.applyConstruction) {
      refs.applyConstruction.addEventListener('click', applyConstruction);
    }
    refs.rank.addEventListener('change', () => {
      refs.rank.value = sanitizeRankInput(refs.rank.value);
      syncDefaultSheafName();
    });
    if (refs.exportClasses) {
      refs.exportClasses.addEventListener('click', () => openChartExport('classes'));
    }
    if (refs.exportHodge) {
      refs.exportHodge.addEventListener('click', () => openChartExport('hodge'));
    }
    if (refs.clearCanvas) {
      refs.clearCanvas.addEventListener('click', clearCanvasObjects);
    }
    refs.refreshExport.addEventListener('click', () => refreshExport('main'));
    refs.copyExport.addEventListener('click', copyExport);
    refs.exportFormat.addEventListener('change', () => refreshExport());
    refs.hodgeExpanded.addEventListener('change', () => {
      state.hodgeExpanded = refs.hodgeExpanded.checked;
      if (state.lastResult?.hodge) {
        renderHodgeChart(state.lastResult);
        typeset(refs.hodgeChart);
      }
    });
    if (refs.toggleHodgeWide) {
      refs.toggleHodgeWide.addEventListener('click', () => {
        setHodgeWide(!state.hodgeWide);
      });
    }
    if (refs.hodgeCellSize) {
      refs.hodgeCellSize.addEventListener('input', () => {
        setHodgeCellSize(refs.hodgeCellSize.value);
      });
      refs.hodgeCellSize.addEventListener('change', () => {
        setHodgeCellSize(refs.hodgeCellSize.value);
      });
    }
    refs.canvasLabels.addEventListener('click', (event) => {
      if (Date.now() < state.suppressLabelClickUntil) return;
      const target = event.target.closest('[data-object-kind]');
      if (!target) return;
      if (handleCanvasPickClick(target)) return;
      selectObject(target.dataset.objectKind, target.dataset.objectId);
    });
    refs.canvasLabels.addEventListener('keydown', (event) => {
      const target = event.target.closest('[data-object-kind]');
      if (!target) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (handleCanvasPickClick(target)) return;
        selectObject(target.dataset.objectKind, target.dataset.objectId);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        const kind = target.dataset.objectKind;
        activateObject(kind, target.dataset.objectId);
        deleteActiveObject(kind);
      }
    });
    refs.canvasLabels.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const target = event.target.closest('[data-object-kind]');
      if (!target) return;
      if (currentInputKind() === 'map' && inputIsCreateMode()) {
        if (target.dataset.objectKind === 'map') {
          startCanvasLabelDrag(target, event);
          return;
        }
        if (shouldUseMapCanvasDrag(target)) startMapCanvasDrag(target, event);
        return;
      }
      if (state.basePickActive) return;
      startCanvasLabelDrag(target, event);
    });
    refs.hodgeChart.addEventListener('click', toggleHodgeExpanded);
    refs.hodgeChart.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleHodgeExpanded();
    });
  }

  function activeHomologyGeometry() {
    const variety = activeVariety();
    return variety ? geometryFromVariety(variety) : null;
  }

  function updateHomologySymbol(classId, value) {
    const variety = activeVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const def = homologyClassDefById(geometry, classId);
    if (!def) return;
    const homology = ensureHomologySystem(variety, geometry);
    homology.classes[classId] = homology.classes[classId] || {};
    homology.classes[classId].symbol = sanitizeHomologySymbol(value, def.defaultSymbol);
    recompute();
  }

  function setHomologyRuleEnabled(ruleId, enabled) {
    const variety = activeVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    const rule = homology.rules.find((item) => item.id === ruleId);
    if (!rule) return;
    rule.enabled = !!enabled;
    recompute();
  }

  function deleteHomologyRule(ruleId) {
    const variety = activeVariety();
    if (!variety) return;
    const geometry = geometryFromVariety(variety);
    const homology = ensureHomologySystem(variety, geometry);
    homology.rules = homology.rules.filter((rule) => rule.builtin || rule.id !== ruleId);
    recompute();
  }

  function addHomologyRuleFromControls() {
    const variety = activeVariety();
    if (!variety) return;
    const geometry = activeHomologyGeometry();
    if (!geometry) return;
    const homology = ensureHomologySystem(variety, geometry);
    let rule;
    try {
      rule = parseHomologyRuleEquation(refs.homologyRuleEquation?.value || '', geometry);
    } catch (error) {
      if (refs.homologyMessage) refs.homologyMessage.textContent = error.message || 'Invalid rule.';
      return;
    }
    homology.rules.push(rule);
    if (refs.homologyRuleEquation) refs.homologyRuleEquation.value = '';
    if (refs.homologyMessage) refs.homologyMessage.textContent = '';
    recompute();
  }

  function renderConstructionPanel() {
    if (!refs.constructionOperation || !refs.constructionFields) return;
    const operation = refs.constructionOperation.value || 'product-variety';
    const values = constructionControlValues();
    const stateForFields = constructionFieldState(operation, values);
    refs.constructionFields.innerHTML = [
      ...stateForFields.fields.map((field) => constructionSelectRow(field)),
      constructionNameRow(stateForFields.defaultName, values.name || '')
    ].join('');
    updateConstructionPreview();
  }

  function constructionControlValues() {
    const values = {};
    refs.constructionFields?.querySelectorAll?.('[data-construction-field]').forEach((control) => {
      values[control.dataset.constructionField] = control.value;
    });
    return values;
  }

  function constructionFieldState(operation, values = {}) {
    const varieties = constructionVarietyOptions();
    const sheaves = constructionSheafOptions();
    const maps = constructionMapOptions();
    const varietyMaps = constructionMapOptions((map) => map.domainKind === 'variety' && map.codomainKind === 'variety');
    const fields = [];
    const select = (name, label, options) => {
      const value = constructionSelectedValue(options, values[name]);
      fields.push({ name, label, options, value });
      return value;
    };

    if (operation === 'product-variety') {
      const left = select('varietyA', 'left', varieties);
      const right = select('varietyB', 'right', varieties);
      return { fields, defaultName: defaultProductVarietyName(left, right) };
    }
    if (operation === 'direct-sum-sheaf' || operation === 'tensor-sheaf') {
      const left = select('sheafA', 'left', sheaves);
      const right = select('sheafB', 'right', sheaves);
      return {
        fields,
        defaultName: operation === 'direct-sum-sheaf'
          ? defaultBinarySheafName(left, right, '\\oplus')
          : defaultBinarySheafName(left, right, '\\otimes')
      };
    }
    if (operation === 'compose-map') {
      const first = select('mapA', 'first', maps);
      const second = select('mapB', 'second', maps);
      return { fields, defaultName: defaultComposedMapName(first, second) };
    }
    if (operation === 'pullback-sheaf' || operation === 'pushforward-sheaf') {
      const mapId = select('map', 'map', varietyMaps);
      const sheafId = select('sheaf', 'sheaf', sheaves);
      return {
        fields,
        defaultName: operation === 'pullback-sheaf'
          ? defaultPullbackSheafName(mapId, sheafId)
          : defaultPushforwardSheafName(mapId, sheafId)
      };
    }
    return { fields, defaultName: 'X' };
  }

  function constructionSelectRow(field) {
    return `
      <div class="sheaf-field-row">
        <label class="input-label" for="construction-${field.name}">${escapeHtml(field.label)}</label>
        <select id="construction-${field.name}" class="sheaf-select" data-construction-field="${escapeHtml(field.name)}">
          ${field.options.length ? field.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('') : '<option value="">none</option>'}
        </select>
      </div>
    `;
  }

  function constructionNameRow(defaultName, value) {
    return `
      <div class="sheaf-field-row">
        <label class="input-label" for="construction-name">name</label>
        <input id="construction-name" class="sheaf-input" type="text" value="${escapeHtml(value)}" placeholder="${escapeHtml(defaultName)}" maxlength="48" spellcheck="false" autocomplete="off" data-construction-field="name">
      </div>
    `;
  }

  function updateConstructionPreview() {
    if (!refs.constructionPreview) return;
    const preview = constructionPreviewData(refs.constructionOperation?.value || 'product-variety', constructionControlValues());
    if (refs.applyConstruction) refs.applyConstruction.disabled = !!preview.error;
    if (preview.error) {
      refs.constructionPreview.textContent = preview.error;
    } else {
      setInlineMath(refs.constructionPreview, preview.latex);
    }
    if (refs.constructionMessage) {
      refs.constructionMessage.textContent = state.constructionMessage || '';
      refs.constructionMessage.className = state.constructionMessage?.startsWith('Error:') ? 'construction-message err' : 'construction-message';
    }
  }

  function constructionPreviewData(operation, values = {}) {
    try {
      const data = validateConstruction(operation, values);
      return {
        error: '',
        defaultName: data.defaultName,
        latex: constructionPreviewLatex(data)
      };
    } catch (error) {
      return {
        error: error.message || 'Construction is not available.',
        defaultName: '',
        latex: ''
      };
    }
  }

  function constructionPreviewLatex(data) {
    const name = sanitizeMathLabel(data.name, data.defaultName);
    if (data.operation === 'product-variety') {
      return `${name}=${sanitizeMathLabel(data.left.name, 'X')}\\times ${sanitizeMathLabel(data.right.name, 'Y')}`;
    }
    if (data.operation === 'direct-sum-sheaf') {
      return `${name}=${sanitizeMathLabel(data.left.name, '\\mathcal{E}')}\\oplus ${sanitizeMathLabel(data.right.name, '\\mathcal{F}')}`;
    }
    if (data.operation === 'tensor-sheaf') {
      return `${name}=${sanitizeMathLabel(data.left.name, '\\mathcal{E}')}\\otimes ${sanitizeMathLabel(data.right.name, '\\mathcal{F}')}`;
    }
    if (data.operation === 'compose-map') {
      return `${name}=${sanitizeMathLabel(data.second.name, 'g')}\\circ ${sanitizeMathLabel(data.first.name, 'f')}`;
    }
    if (data.operation === 'pullback-sheaf') {
      return `${name}=${sanitizeMathLabel(data.map.name, 'f')}^{*}${sanitizeMathLabel(data.sheaf.name, '\\mathcal{E}')}`;
    }
    return `${name}=${sanitizeMathLabel(data.map.name, 'f')}_{*}${sanitizeMathLabel(data.sheaf.name, '\\mathcal{E}')}`;
  }

  function applyConstruction() {
    const operation = refs.constructionOperation?.value || 'product-variety';
    let data;
    try {
      data = validateConstruction(operation, constructionControlValues());
      const created = createConstructedObject(data);
      if (!created) throw new Error('Could not create the requested object.');
      state.constructionMessage = `Created ${latexToPlain(created.name || data.name)}.`;
      recompute();
    } catch (error) {
      state.constructionMessage = `Error: ${error.message || 'Construction failed.'}`;
      updateConstructionPreview();
    }
  }

  function validateConstruction(operation, values = {}) {
    if (operation === 'product-variety') {
      const left = requireVariety(values.varietyA);
      const right = requireVariety(values.varietyB);
      const dim = normalizedInt(left.dim, 0, MAX_DIMENSION, 0) + normalizedInt(right.dim, 0, MAX_DIMENSION, 0);
      if (dim > MAX_DIMENSION) throw new Error(`Product dimension ${dim} exceeds the calculator limit ${MAX_DIMENSION}.`);
      const defaultName = defaultProductVarietyName(left.id, right.id);
      return { operation, left, right, dim, defaultName, name: constructionName(values.name, defaultName) };
    }
    if (operation === 'direct-sum-sheaf' || operation === 'tensor-sheaf') {
      const left = requireSheaf(values.sheafA);
      const right = requireSheaf(values.sheafB);
      if (!left.baseVarietyId || left.baseVarietyId !== right.baseVarietyId) throw new Error('The sheaves must have the same base variety.');
      const defaultName = operation === 'direct-sum-sheaf'
        ? defaultBinarySheafName(left.id, right.id, '\\oplus')
        : defaultBinarySheafName(left.id, right.id, '\\otimes');
      return { operation, left, right, baseVarietyId: left.baseVarietyId, defaultName, name: constructionName(values.name, defaultName) };
    }
    if (operation === 'compose-map') {
      const first = requireMap(values.mapA);
      const second = requireMap(values.mapB);
      if (first.codomainKind !== second.domainKind || first.codomainId !== second.domainId) {
        throw new Error('Maps must compose as second after first.');
      }
      const defaultName = defaultComposedMapName(first.id, second.id);
      return { operation, first, second, defaultName, name: constructionName(values.name, defaultName) };
    }
    if (operation === 'pullback-sheaf' || operation === 'pushforward-sheaf') {
      const map = requireMap(values.map);
      if (map.domainKind !== 'variety' || map.codomainKind !== 'variety') throw new Error('Use a map between varieties.');
      const sheaf = requireSheaf(values.sheaf);
      if (operation === 'pullback-sheaf' && sheaf.baseVarietyId !== map.codomainId) throw new Error('For pullback, the sheaf must live on the codomain.');
      if (operation === 'pushforward-sheaf' && sheaf.baseVarietyId !== map.domainId) throw new Error('For pushforward, the sheaf must live on the domain.');
      const defaultName = operation === 'pullback-sheaf' ? defaultPullbackSheafName(map.id, sheaf.id) : defaultPushforwardSheafName(map.id, sheaf.id);
      return { operation, map, sheaf, defaultName, name: constructionName(values.name, defaultName) };
    }
    throw new Error('Unknown construction.');
  }

  function createConstructedObject(data) {
    if (data.operation === 'product-variety') return createProductVariety(data);
    if (data.operation === 'direct-sum-sheaf' || data.operation === 'tensor-sheaf') return createBinarySheafConstruction(data);
    if (data.operation === 'compose-map') return createComposedMap(data);
    if (data.operation === 'pullback-sheaf' || data.operation === 'pushforward-sheaf') return createMapSheafConstruction(data);
    return null;
  }

  function createProductVariety(data) {
    const variety = {
      id: nextInputId('X'),
      type: 'abstract',
      dim: String(data.dim),
      name: uniqueConstructedObjectName('variety', data.name),
      genus: 'g',
      ciDegrees: '',
      nameDirty: true,
      construction: {
        type: 'product',
        varietyIds: [data.left.id, data.right.id]
      }
    };
    positionConstructedObjectNear(variety, [data.left, data.right]);
    state.varieties.push(variety);
    state.activeVarietyId = variety.id;
    state.activeSheafId = null;
    state.activeMapId = null;
    return variety;
  }

  function createBinarySheafConstruction(data) {
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: constructionRankPlaceholder(data.operation, data.left, data.right),
      baseVarietyId: data.baseVarietyId,
      basis: 'chern',
      nameDirty: true,
      construction: {
        type: data.operation === 'direct-sum-sheaf' ? 'direct-sum' : 'tensor',
        sheafIds: [data.left.id, data.right.id]
      }
    };
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    state.sheaves.push(sheaf);
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId;
    state.activeMapId = null;
    return sheaf;
  }

  function createComposedMap(data) {
    return createMapObject(
      { kind: data.first.domainKind, id: data.first.domainId },
      { kind: data.second.codomainKind, id: data.second.codomainId },
      {
        name: uniqueConstructedObjectName('map', data.name),
        construction: {
          type: 'composition',
          mapIds: [data.first.id, data.second.id]
        }
      }
    );
  }

  function createMapSheafConstruction(data) {
    const isPullback = data.operation === 'pullback-sheaf';
    const sheaf = {
      id: nextInputId('E'),
      type: 'abstract',
      name: uniqueConstructedObjectName('sheaf', data.name),
      twist: '1',
      rank: isPullback ? data.sheaf.rank : 'r',
      baseVarietyId: isPullback ? data.map.domainId : data.map.codomainId,
      basis: normalizeBasisValue(data.sheaf.basis),
      nameDirty: true,
      construction: {
        type: isPullback ? 'pullback' : 'pushforward',
        mapId: data.map.id,
        sheafId: data.sheaf.id
      }
    };
    positionSheafNearBase(sheaf, baseVarietyForSheaf(sheaf));
    avoidCanvasLabelOverlap(sheaf);
    state.sheaves.push(sheaf);
    state.activeSheafId = sheaf.id;
    state.activeVarietyId = sheaf.baseVarietyId;
    state.activeMapId = null;
    return sheaf;
  }

  function constructionVarietyOptions() {
    return state.varieties.map((variety) => ({
      value: variety.id,
      label: latexToPlain(sanitizeMathLabel(variety.name, 'X'))
    }));
  }

  function constructionSheafOptions(filter = null) {
    return state.sheaves
      .filter((sheaf) => !filter || filter(sheaf))
      .map((sheaf) => ({
        value: sheaf.id,
        label: latexToPlain(sanitizeMathLabel(sheaf.name, '\\mathcal{E}'))
      }));
  }

  function constructionMapOptions(filter = null) {
    return state.maps
      .filter((map) => !filter || filter(map))
      .map((map) => ({
        value: map.id,
        label: exportMapPlain(map)
      }));
  }

  function constructionSelectedValue(options, current) {
    if (current && options.some((option) => option.value === current)) return current;
    return options[0]?.value || '';
  }

  function requireVariety(id) {
    const variety = state.varieties.find((item) => item.id === id);
    if (!variety) throw new Error('Choose a variety.');
    return variety;
  }

  function requireSheaf(id) {
    const sheaf = state.sheaves.find((item) => item.id === id);
    if (!sheaf) throw new Error('Choose a sheaf.');
    return sheaf;
  }

  function requireMap(id) {
    const map = state.maps.find((item) => item.id === id);
    if (!map) throw new Error('Choose a map.');
    return map;
  }

  function constructionName(value, fallback) {
    return sanitizeMathLabel(value, fallback);
  }

  function defaultProductVarietyName(leftId, rightId) {
    const left = state.varieties.find((item) => item.id === leftId);
    const right = state.varieties.find((item) => item.id === rightId);
    return `${sanitizeMathLabel(left?.name, 'X')}\\times ${sanitizeMathLabel(right?.name, 'Y')}`;
  }

  function defaultBinarySheafName(leftId, rightId, operationLatex) {
    const left = state.sheaves.find((item) => item.id === leftId);
    const right = state.sheaves.find((item) => item.id === rightId);
    return `${sanitizeMathLabel(left?.name, '\\mathcal{E}')}${operationLatex}${sanitizeMathLabel(right?.name, '\\mathcal{F}')}`;
  }

  function defaultComposedMapName(firstId, secondId) {
    const first = state.maps.find((item) => item.id === firstId);
    const second = state.maps.find((item) => item.id === secondId);
    return `${sanitizeMathLabel(second?.name, 'g')}\\circ ${sanitizeMathLabel(first?.name, 'f')}`;
  }

  function defaultPullbackSheafName(mapId, sheafId) {
    const map = state.maps.find((item) => item.id === mapId);
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return `${sanitizeMathLabel(map?.name, 'f')}^{*}${sanitizeMathLabel(sheaf?.name, '\\mathcal{E}')}`;
  }

  function defaultPushforwardSheafName(mapId, sheafId) {
    const map = state.maps.find((item) => item.id === mapId);
    const sheaf = state.sheaves.find((item) => item.id === sheafId);
    return `${sanitizeMathLabel(map?.name, 'f')}_{*}${sanitizeMathLabel(sheaf?.name, '\\mathcal{E}')}`;
  }

  function constructionRankPlaceholder(operation, left, right) {
    const leftRank = sanitizeRankInput(left.rank);
    const rightRank = sanitizeRankInput(right.rank);
    if (/^\d+$/.test(leftRank) && /^\d+$/.test(rightRank)) {
      return operation === 'direct-sum-sheaf'
        ? String(Number(leftRank) + Number(rightRank))
        : String(Number(leftRank) * Number(rightRank));
    }
    return 'r';
  }

  function uniqueConstructedObjectName(kind, proposedName) {
    const fallback = kind === 'map' ? defaultMapNameLatex() : (kind === 'sheaf' ? '\\mathcal{E}' : 'X');
    const sanitized = sanitizeMathLabel(proposedName, fallback);
    const items = kind === 'map' ? state.maps : (kind === 'sheaf' ? state.sheaves : state.varieties);
    const used = new Set(items.map((item) => canonicalMathLabel(item.name)));
    if (!used.has(canonicalMathLabel(sanitized))) return sanitized;
    for (let index = 2; index <= 50; index += 1) {
      const candidate = sanitizeMathLabel(`${sanitized}^{(${index})}`, sanitized);
      if (!used.has(canonicalMathLabel(candidate))) return candidate;
    }
    return sanitized;
  }

  function positionConstructedObjectNear(object, sources) {
    const positioned = sources.filter((source) => Number.isFinite(source?.labelX) && Number.isFinite(source?.labelY));
    if (!positioned.length) {
      positionVarietyOnCanvas(object);
      return;
    }
    const x = positioned.reduce((sum, source) => sum + source.labelX, 0) / positioned.length;
    const y = positioned.reduce((sum, source) => sum + source.labelY, 0) / positioned.length;
    object.labelX = clamp(x + 0.08, 0.08, 0.94);
    object.labelY = clamp(y + 0.1, 0.08, 0.92);
    avoidCanvasLabelOverlap(object);
  }

  function setBasePickActive(enabled) {
    state.basePickActive = !!enabled && currentInputKind() === 'sheaf' && !inputIsModifyMode();
    if (refs.pickSheafBase) {
      refs.pickSheafBase.setAttribute('aria-pressed', state.basePickActive ? 'true' : 'false');
      refs.pickSheafBase.textContent = state.basePickActive ? 'picking' : 'pick';
    }
  }

  function clearMapDraft() {
    state.mapDraft = null;
    state.mapDrag = null;
    updateMapPickStatus();
  }

  function updateMapPickStatus() {
    if (!refs.mapPickStatus) return;
    if (inputIsModifyMode() && state.activeMapId) {
      const map = selectedMap();
      refs.mapPickStatus.textContent = map ? `${objectPlainLabel(map.domainKind, map.domainId)} -> ${objectPlainLabel(map.codomainKind, map.codomainId)}` : 'map';
      return;
    }
    if (state.mapDraft) {
      refs.mapPickStatus.textContent = `${objectPlainLabel(state.mapDraft.domainKind, state.mapDraft.domainId)} ->`;
      return;
    }
    refs.mapPickStatus.textContent = 'pick a domain';
  }

  function handleCanvasPickClick(target) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    if (state.basePickActive) {
      if (kind !== 'variety') return true;
      chooseSheafBaseFromCanvas(id);
      return true;
    }
    if (currentInputKind() === 'map' && inputIsCreateMode()) {
      handleMapPick(kind, id);
      return true;
    }
    return false;
  }

  function chooseSheafBaseFromCanvas(varietyId) {
    if (!state.varieties.some((variety) => variety.id === varietyId)) return;
    if (refs.sheafBaseVariety) refs.sheafBaseVariety.value = varietyId;
    state.activeVarietyId = varietyId;
    setBasePickActive(false);
    syncDefaultSheafName();
    normalizeControlVisibility();
    recompute();
  }

  function handleMapPick(kind, id) {
    if (kind !== 'variety' && kind !== 'sheaf') return;
    if (!state.mapDraft) {
      state.mapDraft = { domainKind: kind, domainId: id };
      updateMapPickStatus();
      recompute();
      return;
    }
    if (isValidMapCodomain(state.mapDraft.domainKind, state.mapDraft.domainId, kind, id)) {
      createMapObject({ kind: state.mapDraft.domainKind, id: state.mapDraft.domainId }, { kind, id });
      clearMapDraft();
      recompute();
      return;
    }
    state.mapDraft = { domainKind: kind, domainId: id };
    updateMapPickStatus();
    recompute();
  }

  function createMapObject(domain, codomain, options = {}) {
    const map = createDefaultMap(domain, codomain, options);
    if (!isValidMapCodomain(map.domainKind, map.domainId, map.codomainKind, map.codomainId)) return null;
    positionMapLabel(map);
    state.maps.push(map);
    state.activeMapId = map.id;
    state.activeSheafId = null;
    state.draftMapNameDirty = false;
    syncDefaultMapName(true);
    return map;
  }

  function isValidMapCodomain(domainKind, domainId, codomainKind, codomainId) {
    if (!domainKind || !domainId || !codomainKind || !codomainId) return false;
    if (domainKind !== codomainKind || domainId === codomainId) return false;
    if (domainKind === 'variety') {
      return state.varieties.some((item) => item.id === domainId)
        && state.varieties.some((item) => item.id === codomainId);
    }
    if (domainKind === 'sheaf') {
      const domain = state.sheaves.find((item) => item.id === domainId);
      const codomain = state.sheaves.find((item) => item.id === codomainId);
      return !!domain && !!codomain && domain.baseVarietyId === codomain.baseVarietyId;
    }
    return false;
  }

  function allowableMapCodomain(kind, id) {
    return !!state.mapDraft && isValidMapCodomain(state.mapDraft.domainKind, state.mapDraft.domainId, kind, id);
  }

  function shouldUseMapCanvasDrag(target) {
    const kind = target.dataset.objectKind;
    if (currentInputKind() !== 'map' || !inputIsCreateMode()) return false;
    if (kind !== 'variety' && kind !== 'sheaf') return false;
    return !allowableMapCodomain(kind, target.dataset.objectId);
  }

  function startMapCanvasDrag(target, event) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    if (kind !== 'variety' && kind !== 'sheaf') return;
    const canvasRect = refs.canvas.getBoundingClientRect();
    state.mapDrag = {
      domainKind: kind,
      domainId: id,
      target,
      pointerId: event.pointerId,
      canvasRect,
      x: event.clientX - canvasRect.left,
      y: event.clientY - canvasRect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    document.addEventListener('pointermove', updateMapCanvasDrag);
    document.addEventListener('pointerup', finishMapCanvasDrag);
    document.addEventListener('pointercancel', finishMapCanvasDrag);
  }

  function updateMapCanvasDrag(event) {
    const drag = state.mapDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX - drag.canvasRect.left;
    drag.y = event.clientY - drag.canvasRect.top;
    if (!drag.moved && (Math.abs(event.clientX - drag.startX) > 5 || Math.abs(event.clientY - drag.startY) > 5)) {
      event.preventDefault();
      drag.moved = true;
      try { drag.target?.setPointerCapture?.(drag.pointerId); } catch (_) {}
      state.mapDraft = { domainKind: drag.domainKind, domainId: drag.domainId };
      updateMapPickStatus();
      renderCanvas(state.lastResult);
      return;
    }
    if (!drag.moved) return;
    event.preventDefault();
    redrawCanvasSurface();
  }

  function finishMapCanvasDrag(event) {
    const drag = state.mapDrag;
    document.removeEventListener('pointermove', updateMapCanvasDrag);
    document.removeEventListener('pointerup', finishMapCanvasDrag);
    document.removeEventListener('pointercancel', finishMapCanvasDrag);
    if (!drag) return;
    const target = event.type === 'pointercancel'
      ? null
      : document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-object-kind]');
    const targetKind = target?.dataset.objectKind;
    const targetId = target?.dataset.objectId;
    try { drag.target?.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    state.mapDrag = null;
    const clickedSameLabel = !drag.moved
      && event.type !== 'pointercancel'
      && targetKind === drag.domainKind
      && targetId === drag.domainId;
    if (clickedSameLabel) {
      state.suppressLabelClickUntil = Date.now() + 180;
      handleMapPick(targetKind, targetId);
      return;
    }
    if (!drag.moved) return;
    state.suppressLabelClickUntil = Date.now() + 180;
    if (isValidMapCodomain(drag.domainKind, drag.domainId, targetKind, targetId)) {
      createMapObject({ kind: drag.domainKind, id: drag.domainId }, { kind: targetKind, id: targetId });
      clearMapDraft();
    }
    recompute();
  }

  function objectPlainLabel(kind, id) {
    if (kind === 'variety') return latexToPlain(state.varieties.find((item) => item.id === id)?.name || 'X');
    if (kind === 'sheaf') return latexToPlain(state.sheaves.find((item) => item.id === id)?.name || 'E');
    if (kind === 'map') return latexToPlain(state.maps.find((item) => item.id === id)?.name || 'f');
    return '';
  }

  function safeParseDegrees() {
    try {
      return parseDegrees(refs.ciDegrees.value);
    } catch (_) {
      return [];
    }
  }

  function normalizedDraftDimension() {
    return String(normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3));
  }

  function completeIntersectionDegrees() {
    return safeParseDegrees().map((degree) => normalizedInt(degree, 1, MAX_CI_DEGREE, 2));
  }

  function normalizedCompleteIntersectionDegreesText() {
    return completeIntersectionDegrees().join(', ');
  }

  function derivedCompleteIntersectionAmbient() {
    const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
    const degrees = completeIntersectionDegrees();
    return String(Math.min(MAX_AMBIENT, dim + degrees.length));
  }

  function derivedCompleteIntersectionAmbientFor(variety, degrees) {
    const dim = normalizedInt(variety?.dim, 0, MAX_DIMENSION, 3);
    return Math.min(MAX_AMBIENT, dim + degrees.length);
  }

  function syncCompleteIntersectionControls({ source = 'text' } = {}) {
    if (!refs.ciDegrees || !refs.ciEquationCount || !refs.ciDegreeSliders) return;
    let degrees = completeIntersectionDegrees();
    if (source === 'count') {
      const count = normalizedInt(refs.ciEquationCount.value, 0, MAX_CI_EQUATIONS, degrees.length);
      if (degrees.length < count) degrees = degrees.concat(Array.from({ length: count - degrees.length }, () => 2));
      else degrees = degrees.slice(0, count);
    }
    refs.ciDegrees.value = degrees.join(', ');
    refs.ciEquationCount.value = String(degrees.length);
    refs.ciEquationCountValue.textContent = String(degrees.length);
    refs.ciDegreeSliders.hidden = degrees.length === 0 || refs.varietyType.value !== 'complete-intersection';
    refs.ciDegreeSliders.innerHTML = degrees.map((degree, index) => `
      <label class="ci-degree-slider-row" for="ci-degree-${index}">
        <span>degree ${index + 1}</span>
        <input id="ci-degree-${index}" class="ci-degree-slider" type="range" min="1" max="${Math.max(MAX_CI_SLIDER_DEGREE, degree)}" step="1" value="${degree}" data-degree-index="${index}">
        <output for="ci-degree-${index}">${degree}</output>
      </label>
    `).join('');
  }

  function updateDegreeFromSlider(slider) {
    const index = Number(slider.dataset.degreeIndex);
    if (!Number.isInteger(index)) return;
    const degrees = completeIntersectionDegrees();
    degrees[index] = normalizedInt(slider.value, 1, MAX_CI_DEGREE, 2);
    refs.ciDegrees.value = degrees.join(', ');
    const output = slider.parentElement?.querySelector('output');
    if (output) output.textContent = String(degrees[index]);
    syncDefaultVarietyName();
    syncDefaultSheafName();
  }

  function defaultVarietyNameLatex() {
    const type = refs.varietyType.value;
    if (type === 'projective') {
      const n = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      return `\\mathbb{P}^{${n}}`;
    }
    if (type === 'curve') return curveDefaultName(refs.curveGenus.value);
    if (type === 'complete-intersection') {
      const degrees = safeParseDegrees();
      const ambient = derivedCompleteIntersectionAmbient();
      return degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
    }
    return 'X';
  }

  function defaultCreateVarietyNameLatex() {
    return inputIsModifyMode() ? defaultVarietyNameLatex() : uniqueObjectName('variety', defaultVarietyNameLatex());
  }

  function defaultSheafNameLatex() {
    const baseVariety = draftBaseVariety() || activeVariety();
    const variety = baseVariety ? geometryFromVariety(baseVariety).labelLatex : 'X';
    const type = refs.sheafType.value;
    return defaultSheafNameFor(type, sanitizeRankInput(refs.rank.value), normalizedInt(refs.twist.value, -24, 24, 1), variety);
  }

  function defaultCreateSheafNameLatex() {
    return inputIsModifyMode() ? defaultSheafNameLatex() : uniqueObjectName('sheaf', defaultSheafNameLatex());
  }

  function normalizeDraftNameForKind(kind, value) {
    const defaultName = kind === 'sheaf' ? defaultSheafNameLatex() : defaultVarietyNameLatex();
    const sanitized = sanitizeMathLabel(value, defaultName);
    return inputIsModifyMode() ? sanitized : uniqueObjectName(kind, sanitized);
  }

  function defaultSheafNameFor(type, rankPlain, twist, variety) {
    if (type === 'locally-free') return rankPlain === '1' ? '\\mathcal{L}' : '\\mathcal{E}';
    if (type === 'tangent') return `\\mathcal{T}_{${variety}}`;
    if (type === 'cotangent') return `\\Omega^1_{${variety}}`;
    if (type === 'canonical') return `K_{${variety}}`;
    if (type === 'twist') return `\\mathcal{O}_{${variety}}(${twist})`;
    return '\\mathcal{E}';
  }

  function defaultMapNameLatex() {
    const index = state.maps.length + 1;
    return index === 1 ? 'f' : `f_{${index}}`;
  }

  function syncDefaultMapName(force = false) {
    if (!refs.mapName) return;
    if (force || !state.draftMapNameDirty) refs.mapName.value = defaultMapNameLatex();
  }

  function syncDefaultVarietyName(force = false) {
    if (!refs.varietyName) return;
    if (force || !state.draftVarietyNameDirty) refs.varietyName.value = defaultCreateVarietyNameLatex();
  }

  function syncDefaultSheafName(force = false) {
    if (!refs.sheafName) return;
    if (force || !state.draftSheafNameDirty) refs.sheafName.value = defaultCreateSheafNameLatex();
  }

  function syncDefaultRank(force = false) {
    if (!refs.rank || !force) return;
    if (refs.sheafType.value === 'locally-free') refs.rank.value = '1';
    else if (refs.sheafType.value === 'abstract') refs.rank.value = 'r';
  }

  function recompute() {
    try {
      normalizeControlVisibility();
      VARS.clear();
      const chosenSheaf = inputIsModifyMode() ? selectedSheaf() : null;
      const chosenVariety = inputIsModifyMode() ? selectedVariety() : null;
      const baseVariety = chosenSheaf ? baseVarietyForSheaf(chosenSheaf) : chosenVariety;
      const geometry = baseVariety ? geometryFromVariety(baseVariety) : null;
      const sheaf = chosenSheaf && geometry ? sheafFromObject(chosenSheaf, geometry) : null;
      const result = buildResult(geometry, sheaf);
      state.lastResult = result;
      refs.classMessage.textContent = '';
      renderResult(result);
      refreshExport();
    } catch (error) {
      state.lastResult = null;
      refs.status.textContent = error.message || 'unable to compute';
      if (refs.classActions) refs.classActions.hidden = true;
      if (refs.basisRow) refs.basisRow.hidden = true;
      if (refs.rootFormRow) refs.rootFormRow.hidden = true;
      if (refs.classTermRow) refs.classTermRow.hidden = true;
      if (refs.classChart) refs.classChart.hidden = true;
      refs.classMessage.className = 'err';
      refs.classMessage.textContent = error.message || 'Unable to compute.';
      refs.classMessage.hidden = false;
      if (refs.hodgeActions) refs.hodgeActions.hidden = true;
      if (refs.hodgeChart) {
        refs.hodgeChart.hidden = true;
        refs.hodgeChart.innerHTML = '';
      }
      refs.hodgeMessage.textContent = 'No Hodge numbers available for the current input.';
      refs.hodgeMessage.hidden = false;
      renderConstructionPanel();
      renderHomologyPanel(null);
      renderCanvas(null);
    }
  }

  function buildResult(geometry, sheaf) {
    if (geometry && sheaf) return buildCharacteristicClasses(geometry, sheaf);
    if (geometry) {
      return {
        geometry,
        sheaf: null,
        bundle: null,
        hodge: buildHodgeNumbers(geometry),
        classRows: []
      };
    }
    return {
      geometry: null,
      sheaf,
      bundle: null,
      hodge: null,
      classRows: []
    };
  }

  function normalizeControlVisibility() {
    syncSheafBaseOptions();
    const hasVariety = state.varieties.length > 0;
    const hasSheaf = !!activeSheaf();
    const editingSheaf = inputIsModifyMode() && !!state.activeSheafId;
    const editingMap = inputIsModifyMode() && !!state.activeMapId;
    const draftingMap = inputIsModifyMode() ? editingMap : refs.addObjectKind?.value === 'map';
    const draftingSheaf = !draftingMap && (inputIsModifyMode() ? editingSheaf : refs.addObjectKind?.value === 'sheaf');
    const draftVariety = refs.varietyType.value;
    const activeVarietyType = activeVariety()?.type || 'abstract';
    const activeSheafType = activeSheaf()?.type || 'abstract';
    const draftBase = draftBaseVariety();
    const draftBaseType = draftBase?.type || 'abstract';
    let draftSheaf = refs.sheafType.value;
    const canTwist = draftingSheaf ? !!draftBase && varietyHasHyperplaneClass(draftBaseType) : hasVariety && varietyHasHyperplaneClass(activeVarietyType);
    if (refs.twistOption) {
      refs.twistOption.hidden = !canTwist;
      refs.twistOption.disabled = !canTwist;
    }
    if (!canTwist && draftSheaf === 'twist') {
      refs.sheafType.value = 'abstract';
      draftSheaf = 'abstract';
      syncDefaultRank(true);
      syncDefaultSheafName();
    }
    const showCurve = draftVariety === 'curve';
    const showCi = draftVariety === 'complete-intersection';
    if (refs.curveGenusRow) refs.curveGenusRow.hidden = !showCurve;
    refs.ciDegreesRow.hidden = !showCi;
    if (refs.ciEquationCountRow) refs.ciEquationCountRow.hidden = !showCi;
    if (refs.ciDegreeSliders) refs.ciDegreeSliders.hidden = !showCi || completeIntersectionDegrees().length === 0;
    refs.ciNote.hidden = !showCi;
    refs.twistRow.hidden = !draftingSheaf || draftSheaf !== 'twist';
    const activeSupportsRoots = sheafSupportsChernRoots(activeSheaf());
    const needsBasisInput = hasVariety && hasSheaf && (
      activeSupportsRoots
      || (activeVarietyType === 'abstract' && (activeSheafType === 'tangent' || activeSheafType === 'cotangent' || activeSheafType === 'canonical'))
    );
    syncBasisOptions(activeSupportsRoots);
    if (!needsBasisInput) refs.basis.value = 'chern';
    refs.basisRow.hidden = !needsBasisInput;
    syncClassDisplayControls();
    refs.rankRow.hidden = !draftingSheaf || (draftSheaf !== 'abstract' && draftSheaf !== 'locally-free');
    refs.sheafBaseRow.hidden = inputIsModifyMode() || !draftingSheaf || state.varieties.length <= 1;
    if (refs.pickSheafBase) {
      refs.pickSheafBase.disabled = refs.sheafBaseRow.hidden;
      refs.pickSheafBase.setAttribute('aria-pressed', state.basePickActive ? 'true' : 'false');
      refs.pickSheafBase.textContent = state.basePickActive ? 'picking' : 'pick';
    }
    if (state.basePickActive && (refs.sheafBaseRow.hidden || !draftingSheaf)) setBasePickActive(false);
    if (refs.addObject) {
      const canAddSheaf = !draftingSheaf || !!draftBase;
      const hasEditableObject = !inputIsModifyMode() || !!activeObjectForKind(currentInputKind());
      const creatingMap = draftingMap && inputIsCreateMode();
      refs.addObject.disabled = creatingMap || (!canAddSheaf && draftingSheaf) || !hasEditableObject;
      refs.addObject.textContent = creatingMap ? 'pick' : (inputIsModifyMode() ? 'update' : 'add');
      refs.addObject.title = creatingMap ? 'Pick domain and codomain on the canvas' : (draftingSheaf && !draftBase ? 'Add a base variety first' : '');
    }
    updateMapPickStatus();
    syncInputEditorVisibility();
  }

  function geometryFromVariety(variety) {
    const type = variety?.type || 'abstract';
    if (type === 'projective') {
      const n = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const labelLatex = sanitizeMathLabel(variety.name, `\\mathbb{P}^{${n}}`);
      Object.assign(variety, { dim: String(n), name: labelLatex });
      const geometry = {
        type,
        dim: n,
        ambient: n,
        degrees: [],
        codim: 0,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${n}}`,
        ambientPlain: `P^${n}`
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'curve') {
      const genus = sanitizeGenusInput(variety.genus);
      const labelLatex = sanitizeMathLabel(variety.name, curveDefaultName(genus));
      Object.assign(variety, { dim: '1', genus, name: labelLatex });
      const geometry = {
        type,
        dim: 1,
        genus,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'curve',
        ambientPlain: 'curve'
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    if (type === 'complete-intersection') {
      const degrees = parseDegrees(variety.ciDegrees || '');
      const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const ambient = derivedCompleteIntersectionAmbientFor(variety, degrees);
      const defaultLabel = degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
      const labelLatex = sanitizeMathLabel(variety.name, defaultLabel);
      Object.assign(variety, { dim: String(dim), ciAmbient: String(ambient), name: labelLatex });
      const geometry = {
        type,
        dim,
        ambient,
        degrees,
        codim: degrees.length,
        labelLatex,
        labelPlain: degrees.length ? `${latexToPlain(labelLatex)} in P^${ambient}` : latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${ambient}}`,
        ambientPlain: `P^${ambient}`
      };
      return attachHomologyToGeometry(variety, geometry);
    }
    const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
    const labelLatex = sanitizeMathLabel(variety.name, 'X');
    Object.assign(variety, { dim: String(dim), name: labelLatex });
    const geometry = {
      type: 'abstract',
      dim,
      ambient: null,
      degrees: [],
      codim: null,
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      ambientLatex: 'abstract',
      ambientPlain: 'abstract'
    };
    return attachHomologyToGeometry(variety, geometry);
  }

  function attachHomologyToGeometry(variety, geometry) {
    const homology = ensureHomologySystem(variety, geometry);
    return { ...geometry, varietyId: variety?.id || null, homology };
  }

  function ensureHomologySystem(variety, geometry) {
    const homology = variety.homology && typeof variety.homology === 'object' ? variety.homology : {};
    homology.classes = homology.classes && typeof homology.classes === 'object' ? homology.classes : {};
    homology.rules = Array.isArray(homology.rules) ? homology.rules : [];

    const classDefs = homologyClassDefinitions({ ...geometry, homology });
    classDefs.forEach((def) => {
      const existing = homology.classes[def.id] && typeof homology.classes[def.id] === 'object'
        ? homology.classes[def.id]
        : {};
      existing.symbol = sanitizeHomologySymbol(existing.symbol, def.defaultSymbol);
      homology.classes[def.id] = existing;
    });

    const existingTopRule = homology.rules.find((rule) => rule.id === HOMOLOGY_TOP_RULE_ID);
    const customRules = homology.rules.filter((rule) => rule.id !== HOMOLOGY_TOP_RULE_ID);
    const standardRule = standardHomologyTopRule(geometry, existingTopRule);
    homology.rules = [
      ...(standardRule ? [standardRule] : []),
      ...customRules.map((rule) => normalizeHomologyRule(rule, geometry)).filter(Boolean)
    ];
    variety.homology = homology;
    return homology;
  }

  function homologyClassDefinitions(geometry) {
    if (!geometry) return [];
    const homology = geometry.homology || {};
    const defs = [];
    if (varietyHasHyperplaneClass(geometry.type)) {
      defs.push(homologyClassDefinition(
        HOMOLOGY_HYPERPLANE_CLASS,
        1,
        'H',
        'hyperplane',
        homology
      ));
    }
    if (Number.isInteger(geometry.dim) && geometry.dim >= 0) {
      defs.push(homologyClassDefinition(
        HOMOLOGY_POINT_CLASS,
        geometry.dim,
        '[p]',
        'point',
        homology
      ));
    }
    return defs;
  }

  function homologyClassDefinition(id, degree, defaultSymbol, kind, homology) {
    const symbol = sanitizeHomologySymbol(homology?.classes?.[id]?.symbol, defaultSymbol);
    return {
      id,
      degree,
      defaultSymbol,
      kind,
      symbolLatex: symbol,
      symbolPlain: latexToPlain(symbol)
    };
  }

  function homologyClassDefById(geometry, classId) {
    return homologyClassDefinitions(geometry).find((def) => def.id === classId) || null;
  }

  function homologyVariableId(classId) {
    if (classId === HOMOLOGY_HYPERPLANE_CLASS) return 'H';
    if (classId === HOMOLOGY_POINT_CLASS) return 'point';
    return `homology_${String(classId || '').replace(/[^A-Za-z0-9_]+/g, '_')}`;
  }

  function defineHomologyVariables(geometry) {
    homologyClassDefinitions(geometry).forEach((def) => {
      defineVariable(homologyVariableId(def.id), def.degree, def.symbolLatex);
    });
  }

  function standardHomologyTopRule(geometry, existingRule = null) {
    if (!varietyHasHyperplaneClass(geometry?.type) || !Number.isInteger(geometry.dim) || geometry.dim <= 0) return null;
    const degreeProduct = (geometry.degrees || []).reduce((product, degree) => product * BigInt(degree), 1n);
    return {
      id: HOMOLOGY_TOP_RULE_ID,
      builtin: true,
      enabled: existingRule ? existingRule.enabled !== false : true,
      lhs: { powers: { [homologyVariableId(HOMOLOGY_HYPERPLANE_CLASS)]: geometry.dim } },
      rhs: [
        {
          coefficient: degreeProduct.toString(),
          powers: { [homologyVariableId(HOMOLOGY_POINT_CLASS)]: 1 }
        }
      ]
    };
  }

  function normalizeHomologyRule(rule, geometry) {
    if (!rule || typeof rule !== 'object') return null;
    const defs = homologyClassDefinitions(geometry);
    const variableIds = new Set(defs.map((def) => homologyVariableId(def.id)));
    let lhsPowers = normalizeHomologyPowers(rule.lhs?.powers || rule.lhsPowers, variableIds);
    let rhsTerms = normalizeHomologyRuleTerms(rule.rhs || rule.rhsTerms, variableIds);
    if ((!lhsPowers || !rhsTerms) && rule.source && rule.target) {
      const sourceDef = defs.find((def) => def.id === rule.source);
      const targetDef = defs.find((def) => def.id === rule.target);
      if (!sourceDef || !targetDef) return null;
      const power = normalizedInt(rule.power, 1, Math.max(1, geometry?.dim || MAX_DIMENSION), 1);
      lhsPowers = { [homologyVariableId(rule.source)]: power };
      try {
        rhsTerms = [
          {
            coefficient: formatFractionPlain(parseRuleCoefficient(rule.coefficient || '1')),
            powers: { [homologyVariableId(rule.target)]: 1 }
          }
        ];
      } catch (_) {
        return null;
      }
    }
    if (!lhsPowers || !rhsTerms) return null;
    const normalized = {
      id: rule.id || nextInputId('R'),
      builtin: false,
      enabled: rule.enabled !== false,
      lhs: { powers: lhsPowers },
      rhs: rhsTerms
    };
    return homologyRulePreservesDegree(normalized, defs) ? normalized : null;
  }

  function normalizeHomologyPowers(powers, variableIds) {
    if (!powers || typeof powers !== 'object') return null;
    const out = {};
    for (const [id, exp] of Object.entries(powers)) {
      if (!variableIds.has(id)) return null;
      const exponent = normalizedInt(exp, 0, MAX_DIMENSION, 0);
      if (exponent > 0) out[id] = exponent;
    }
    return Object.keys(out).length ? out : null;
  }

  function normalizeHomologyRuleTerms(terms, variableIds) {
    if (!Array.isArray(terms)) return null;
    const out = [];
    for (const term of terms) {
      if (!term || typeof term !== 'object') return null;
      const powers = normalizeHomologyPowers(term.powers || {}, variableIds) || {};
      let coefficient;
      try {
        coefficient = formatFractionPlain(parseRuleCoefficient(term.coefficient || '1'));
      } catch (_) {
        return null;
      }
      if (parseRuleCoefficient(coefficient).isZero()) continue;
      out.push({ coefficient, powers });
    }
    return out;
  }

  function serializeHomologyPoly(poly) {
    return sortedTerms(poly).map(([key, coeff]) => ({
      coefficient: formatFractionPlain(coeff),
      powers: parseMonoKey(key)
    }));
  }

  function homologyRuleRhsPoly(rule) {
    if (!Array.isArray(rule?.rhs)) return Poly.zero();
    let out = Poly.zero();
    for (const term of rule.rhs) {
      let coeff;
      try {
        coeff = parseRuleCoefficient(term.coefficient || '1');
      } catch (_) {
        continue;
      }
      if (coeff.isZero()) continue;
      out = out.add(polyFromPowers(term.powers || {}).scale(coeff));
    }
    return out;
  }

  function homologyRuleInputText(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleInputMonomial(rule.lhs?.powers || {})}=${formatHomologyInputPoly(homologyRuleRhsPoly(rule))}`;
  }

  function formatHomologyInputPoly(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatHomologyInputTerm(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? `-${body}` : `+${body}`;
    });
    return out;
  }

  function formatHomologyInputTerm(key, absCoeff) {
    const mono = homologyRuleInputMonomial(parseMonoKey(key));
    if (!mono) return absCoeff.toPlainAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toPlainAbs()}${mono}`;
  }

  function homologyRuleInputMonomial(powers) {
    return Object.entries(powers || {}).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.plain : id;
      return exp === 1 ? base : `${base}^${exp}`;
    }).join('');
  }

  function polyFromPowers(powers) {
    const clean = {};
    for (const [id, exp] of Object.entries(powers || {})) {
      const exponent = Number(exp) || 0;
      if (exponent > 0) clean[id] = exponent;
    }
    return Object.keys(clean).length ? new Poly(new Map([[monoKey(clean), Fraction.one()]])) : Poly.one();
  }

  function homologyRuleLhsLatex(rule, geometry) {
    defineHomologyVariables(geometry);
    return monomialLatex(monoKey(rule.lhs?.powers || {})) || '1';
  }

  function homologyRuleLhsPlain(rule, geometry) {
    defineHomologyVariables(geometry);
    return monomialPlain(monoKey(rule.lhs?.powers || {})) || '1';
  }

  function homologyRulePlainEquation(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleInputMonomial(rule.lhs?.powers || {})} = ${formatHomologyInputPoly(homologyRuleRhsPoly(rule))}`;
  }

  function defaultHomologyRulePlaceholder(geometry) {
    const topRule = standardHomologyTopRule(geometry);
    if (topRule) return homologyRuleInputText(topRule, geometry);
    const defs = homologyClassDefinitions(geometry);
    return defs.length ? `${defs[0].symbolPlain}=0` : '';
  }

  function parseHomologyRuleEquation(text, geometry) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('Enter a rule as left=right.');
    const parts = raw.split('=');
    if (parts.length !== 2) throw new Error('Use exactly one equals sign.');
    defineHomologyVariables(geometry);
    const lhs = parseHomologyExpression(parts[0], geometry, { side: 'left' });
    const rhs = parseHomologyExpression(parts[1], geometry, { side: 'right' });
    if (lhs.isZero()) throw new Error('Left side cannot be zero.');
    const lhsTerms = sortedTerms(lhs);
    if (lhsTerms.length !== 1 || !lhsTerms[0][1].isOne()) {
      throw new Error('Left side must be one monomial with coefficient 1.');
    }
    const lhsPowers = parseMonoKey(lhsTerms[0][0]);
    const rule = {
      id: nextInputId('R'),
      builtin: false,
      enabled: true,
      lhs: { powers: lhsPowers },
      rhs: serializeHomologyPoly(rhs)
    };
    const defs = homologyClassDefinitions(geometry);
    if (!homologyRulePreservesDegree(rule, defs)) throw new Error('Rule degrees must match.');
    return {
      ...rule,
      input: raw
    };
  }

  function parseHomologyExpression(text, geometry, { side = 'right' } = {}) {
    const source = String(text || '').trim();
    if (!source) throw new Error(`${side === 'left' ? 'Left' : 'Right'} side is empty.`);
    const compact = source
      .replace(/\\cdot/g, '*')
      .replace(/\\,/g, '')
      .replace(/\s+/g, '');
    if (compact === '0') return Poly.zero();
    const aliases = homologyParseAliases(geometry);
    const pieces = splitSignedHomologyTerms(compact);
    let out = Poly.zero();
    for (const piece of pieces) {
      const term = parseHomologyTerm(piece.body, aliases);
      out = out.add(term.scale(fraction(piece.sign)));
    }
    return out;
  }

  function homologyParseAliases(geometry) {
    return homologyClassDefinitions(geometry)
      .flatMap((def) => {
        const id = homologyVariableId(def.id);
        return [def.symbolLatex, def.symbolPlain, def.defaultSymbol]
          .filter(Boolean)
          .map((alias) => ({ alias: String(alias).replace(/\s+/g, ''), id }));
      })
      .filter((entry, index, all) => entry.alias && all.findIndex((item) => item.alias === entry.alias && item.id === entry.id) === index)
      .sort((a, b) => b.alias.length - a.alias.length);
  }

  function splitSignedHomologyTerms(text) {
    const terms = [];
    let start = 0;
    let sign = 1;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '{' || char === '[' || char === '(') depth += 1;
      else if (char === '}' || char === ']' || char === ')') depth = Math.max(0, depth - 1);
      else if ((char === '+' || char === '-') && depth === 0) {
        if (i > start) terms.push({ sign, body: text.slice(start, i) });
        sign = char === '-' ? -1 : 1;
        start = i + 1;
      }
    }
    if (start < text.length) terms.push({ sign, body: text.slice(start) });
    return terms.filter((term) => term.body);
  }

  function parseHomologyTerm(text, aliases) {
    let rest = text.replace(/\*/g, '');
    if (!rest) throw new Error('Rule contains an empty term.');
    let coeff = Fraction.one();
    const coeffMatch = rest.match(/^(\d+(?:\/\d+)?)/);
    if (coeffMatch) {
      coeff = parseRuleCoefficient(coeffMatch[1]);
      rest = rest.slice(coeffMatch[1].length);
    }
    const powers = {};
    while (rest) {
      const match = aliases.find((entry) => rest.startsWith(entry.alias));
      if (!match) throw new Error(`Unknown class in rule near "${rest}".`);
      rest = rest.slice(match.alias.length);
      const parsedPower = parseHomologyExponent(rest);
      rest = parsedPower.rest;
      powers[match.id] = (powers[match.id] || 0) + parsedPower.exponent;
    }
    return polyFromPowers(powers).scale(coeff);
  }

  function parseHomologyExponent(text) {
    if (!text.startsWith('^')) return { exponent: 1, rest: text };
    const body = text.slice(1);
    const braced = body.match(/^\{(\d+)\}/);
    if (braced) return { exponent: normalizedInt(braced[1], 0, MAX_DIMENSION, 1), rest: body.slice(braced[0].length) };
    const plain = body.match(/^(\d+)/);
    if (plain) return { exponent: normalizedInt(plain[1], 0, MAX_DIMENSION, 1), rest: body.slice(plain[1].length) };
    throw new Error('Rule exponent must be a nonnegative integer.');
  }

  function sheafFromObject(sheaf, geometry) {
    const type = sheaf?.type || 'abstract';
    const twist = normalizedInt(sheaf.twist, -24, 24, 1);
    let basis = normalizeBasisValue(sheaf.basis);
    if (basis === 'roots' && !sheafSupportsChernRoots(sheaf)) basis = 'chern';
    const rankPlain = sanitizeRankInput(sheaf.rank);
    const baseVariety = baseVarietyForSheaf(sheaf);
    const labelLatex = sanitizeMathLabel(sheaf.name, defaultSheafNameFor(type, rankPlain, twist, geometry?.labelLatex || 'X'));
    Object.assign(sheaf, { twist: String(twist), basis, rank: rankPlain, name: labelLatex, baseVarietyId: baseVariety?.id || sheaf.baseVarietyId || null });
    return {
      type,
      twist,
      baseVarietyId: sheaf.baseVarietyId,
      basis,
      rankPlain,
      rankLatex: symbolToLatex(rankPlain),
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      construction: sheaf.construction || null,
      sourceObject: sheaf
    };
  }

  function readGeometry() {
    const type = refs.varietyType.value;
    if (type === 'projective') {
      const n = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = String(n);
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, `\\mathbb{P}^{${n}}`);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim: n,
        ambient: n,
        degrees: [],
        codim: 0,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${n}}`,
        ambientPlain: `P^${n}`
      };
    }
    if (type === 'curve') {
      refs.dim.value = '1';
      refs.curveGenus.value = sanitizeGenusInput(refs.curveGenus.value);
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, curveDefaultName(refs.curveGenus.value));
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim: 1,
        genus: refs.curveGenus.value,
        ambient: null,
        degrees: [],
        codim: null,
        labelLatex,
        labelPlain: latexToPlain(labelLatex),
        ambientLatex: 'curve',
        ambientPlain: 'curve'
      };
    }
    if (type === 'complete-intersection') {
      const degrees = parseDegrees(refs.ciDegrees.value);
      const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
      refs.dim.value = String(dim);
      const ambient = Math.min(MAX_AMBIENT, dim + degrees.length);
      const defaultLabel = degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
      const labelLatex = sanitizeMathLabel(refs.varietyName.value, defaultLabel);
      refs.varietyName.value = labelLatex;
      return {
        type,
        dim,
        ambient,
        degrees,
        codim: degrees.length,
        labelLatex,
        labelPlain: degrees.length ? `${latexToPlain(labelLatex)} in P^${ambient}` : latexToPlain(labelLatex),
        ambientLatex: `\\mathbb{P}^{${ambient}}`,
        ambientPlain: `P^${ambient}`
      };
    }
    const dim = normalizedInt(refs.dim.value, 0, MAX_DIMENSION, 3);
    refs.dim.value = String(dim);
    const labelLatex = sanitizeMathLabel(refs.varietyName.value, 'X');
    refs.varietyName.value = labelLatex;
    return {
      type: 'abstract',
      dim,
      ambient: null,
      degrees: [],
      codim: null,
      labelLatex,
      labelPlain: latexToPlain(labelLatex),
      ambientLatex: 'abstract',
      ambientPlain: 'abstract'
    };
  }

  function readSheaf() {
    const type = refs.sheafType.value;
    const twist = normalizedInt(refs.twist.value, -24, 24, 1);
    let basis = normalizeBasisValue(refs.basis.value);
    if (basis === 'roots' && type !== 'abstract' && type !== 'locally-free') basis = 'chern';
    const rankPlain = sanitizeRankInput(refs.rank.value);
    refs.rank.value = rankPlain;
    const labelLatex = sanitizeMathLabel(refs.sheafName.value, defaultSheafNameLatex());
    refs.sheafName.value = labelLatex;
    return {
      type,
      twist,
      basis,
      rankPlain,
      rankLatex: symbolToLatex(rankPlain),
      labelLatex,
      labelPlain: latexToPlain(labelLatex)
    };
  }

  function buildCharacteristicClasses(geometry, sheaf) {
    defineHomologyVariables(geometry);
    const d = geometry.dim;
    const bundle = buildBundleForSheaf(geometry, sheaf);
    const hodge = buildHodgeNumbers(geometry);

    const result = {
      geometry,
      sheaf,
      bundle,
      hodge,
      classRows: [],
      classDisplay: classDisplayOptions(geometry, sheaf)
    };
    result.classRows = buildClassRows(bundle, d, result.classDisplay);
    return result;
  }

  function buildBundleForSheaf(geometry, sheaf, options = {}) {
    const d = geometry.dim;
    if (sheaf.construction) return buildConstructedSheafBundle(geometry, sheaf, options);
    if (sheaf.type === 'locally-free') return buildLocallyFreeBundle(d, sheaf, options);
    if (sheaf.type === 'abstract') return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
    if (geometry.type === 'abstract' || geometry.type === 'curve') return buildAbstractGeometrySheaf(geometry, sheaf, options);
    return buildEmbeddedGeometrySheaf(geometry, sheaf, options);
  }

  function classDisplayOptions(geometry, sheaf) {
    const supportsRoots = sheafSupportsChernRoots(sheaf);
    const expression = supportsRoots && sheaf.basis === 'roots' ? 'roots' : 'standard';
    const rootForm = refs.rootForm?.value === 'expanded' ? 'expanded' : 'product';
    const termMode = refs.classTermOnly?.checked ? 'term' : 'total';
    const termIndex = termMode === 'term'
      ? normalizedInt(refs.classTermIndex?.value, 0, geometry.dim, 1)
      : null;
    if (termMode === 'term' && refs.classTermIndex) refs.classTermIndex.value = String(termIndex);
    return {
      expression,
      rootForm,
      termMode,
      termIndex,
      geometry,
      homology: geometry.homology || null
    };
  }

  function buildClassRows(bundle, d, options) {
    if (options.expression === 'roots') {
      if (options.rootForm === 'expanded' && rootExpansionRankFromPlain(bundle.rankPlain, d) != null) {
        return buildExpandedRootClassRows(bundle, d, options);
      }
      return buildProductRootClassRows(bundle, options);
    }
    return buildStandardClassRows(bundle, d, options);
  }

  function formatClassPolyLatex(poly, options) {
    return formatPolyLatex(applyHomologyRules(poly, options));
  }

  function formatClassPolyPlain(poly, options) {
    return formatPolyPlain(applyHomologyRules(poly, options));
  }

  function formatRankPlusClassPolyLatex(rank, poly, options) {
    return formatRankPlusPolyLatex(rank, applyHomologyRules(poly, options));
  }

  function formatRankPlusClassPolyPlain(rank, poly, options) {
    return formatRankPlusPolyPlain(rank, applyHomologyRules(poly, options));
  }

  function buildStandardClassRows(bundle, d, options) {
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `chern_${i}`, latex: formatClassPolyLatex(i === 0 ? Poly.one() : componentOrZero(bundle.cComps, i), options), plain: formatClassPolyPlain(i === 0 ? Poly.one() : componentOrZero(bundle.cComps, i), options) },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `character_${i}`, latex: i === 0 ? (bundle.rankLatex || '0') : formatClassPolyLatex(componentOrZero(bundle.chComps, i), options), plain: i === 0 ? (bundle.rankPlain || '0') : formatClassPolyPlain(componentOrZero(bundle.chComps, i), options) },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `todd_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.todd, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.todd, i), options) },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `segre_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.segre, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.segre, i), options) },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `sqrtTodd_${i}`, latex: formatClassPolyLatex(homogeneousPart(bundle.sqrtTodd, i), options), plain: formatClassPolyPlain(homogeneousPart(bundle.sqrtTodd, i), options) }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'chern', latex: formatClassPolyLatex(bundle.cTotal, options), plain: formatClassPolyPlain(bundle.cTotal, options) },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'character', latex: formatRankPlusClassPolyLatex(bundle.rankLatex, positiveTotal(bundle.chComps, d), options), plain: formatRankPlusClassPolyPlain(bundle.rankPlain, positiveTotal(bundle.chComps, d), options) },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'todd', latex: formatClassPolyLatex(bundle.todd, options), plain: formatClassPolyPlain(bundle.todd, options) },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'segre', latex: formatClassPolyLatex(bundle.segre, options), plain: formatClassPolyPlain(bundle.segre, options) },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'sqrtTodd', latex: formatClassPolyLatex(bundle.sqrtTodd, options), plain: formatClassPolyPlain(bundle.sqrtTodd, options) }
    ];
  }

  function buildProductRootClassRows(bundle, options) {
    const rankLatex = bundle.rankLatex || 'r';
    const rankPlain = bundle.rankPlain || 'r';
    const explicitRank = explicitRootRankFromPlain(rankPlain);
    const total = explicitRank == null
      ? indexedRootTotals(rankLatex, rankPlain)
      : explicitRootTotals(explicitRank);
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      const term = i === 0 ? rootDegreeZeroTerms(rankLatex, rankPlain) : {
        chern: coefficientLatexPlain(total.chern, i),
        character: explicitRank == null ? rootCharacterTerm(i, rankLatex, rankPlain) : explicitRootCharacterTerm(i, explicitRank),
        todd: coefficientLatexPlain(total.todd, i),
        segre: coefficientLatexPlain(total.segre, i),
        sqrtTodd: coefficientLatexPlain(total.sqrtTodd, i)
      };
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `root_chern_${i}`, latex: term.chern.latex, plain: term.chern.plain },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `root_character_${i}`, latex: term.character.latex, plain: term.character.plain },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `root_todd_${i}`, latex: term.todd.latex, plain: term.todd.plain },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `root_segre_${i}`, latex: term.segre.latex, plain: term.segre.plain },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `root_sqrtTodd_${i}`, latex: term.sqrtTodd.latex, plain: term.sqrtTodd.plain }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'root_chern', latex: total.chern.latex, plain: total.chern.plain },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'root_character', latex: total.character.latex, plain: total.character.plain },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'root_todd', latex: total.todd.latex, plain: total.todd.plain },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'root_segre', latex: total.segre.latex, plain: total.segre.plain },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'root_sqrtTodd', latex: total.sqrtTodd.latex, plain: total.sqrtTodd.plain }
    ];
  }

  function indexedRootTotals(rankLatex, rankPlain) {
    const alpha = '\\alpha_j';
    const rangeLatex = `_{j=1}^{${rankLatex}}`;
    const rangePlain = `_{j=1}^${rankPlain}`;
    return {
      chern: {
        latex: `\\prod${rangeLatex}(1+${alpha})`,
        plain: `prod${rangePlain}(1 + alpha_j)`
      },
      character: {
        latex: `\\sum${rangeLatex} e^{${alpha}}`,
        plain: `sum${rangePlain} exp(alpha_j)`
      },
      todd: {
        latex: `\\prod${rangeLatex}\\frac{${alpha}}{1-e^{-${alpha}}}`,
        plain: `prod${rangePlain} alpha_j/(1 - exp(-alpha_j))`
      },
      segre: {
        latex: `\\prod${rangeLatex}(1+${alpha})^{-1}`,
        plain: `prod${rangePlain}(1 + alpha_j)^-1`
      },
      sqrtTodd: {
        latex: `\\prod${rangeLatex}\\sqrt{\\frac{${alpha}}{1-e^{-${alpha}}}}`,
        plain: `prod${rangePlain} sqrt(alpha_j/(1 - exp(-alpha_j)))`
      }
    };
  }

  function explicitRootTotals(rank) {
    const roots = Array.from({ length: rank }, (_, index) => index + 1);
    return {
      chern: explicitProductDisplay(roots.map((i) => ({
        latex: `(1+${rootLatex(i)})`,
        plain: `(1 + ${rootPlain(i)})`
      })), '1'),
      character: explicitSumDisplay(roots.map((i) => ({
        latex: `e^{${rootLatex(i)}}`,
        plain: `exp(${rootPlain(i)})`
      })), '0'),
      todd: explicitProductDisplay(roots.map((i) => ({
        latex: `\\left(\\frac{${rootLatex(i)}}{1-e^{-${rootLatex(i)}}}\\right)`,
        plain: `(${rootPlain(i)}/(1 - exp(-${rootPlain(i)})))`
      })), '1'),
      segre: explicitProductDisplay(roots.map((i) => ({
        latex: `(1+${rootLatex(i)})^{-1}`,
        plain: `(1 + ${rootPlain(i)})^-1`
      })), '1'),
      sqrtTodd: explicitProductDisplay(roots.map((i) => ({
        latex: `\\sqrt{\\frac{${rootLatex(i)}}{1-e^{-${rootLatex(i)}}}}`,
        plain: `sqrt(${rootPlain(i)}/(1 - exp(-${rootPlain(i)})))`
      })), '1')
    };
  }

  function explicitProductDisplay(factors, emptyValue) {
    if (!factors.length) return { latex: emptyValue, plain: emptyValue };
    return {
      latex: factors.map((factor) => factor.latex).join(''),
      plain: factors.map((factor) => factor.plain).join('*')
    };
  }

  function explicitSumDisplay(terms, emptyValue) {
    if (!terms.length) return { latex: emptyValue, plain: emptyValue };
    return {
      latex: terms.map((term) => term.latex).join(' + '),
      plain: terms.map((term) => term.plain).join(' + ')
    };
  }

  function explicitRootCharacterTerm(degree, rank) {
    const denom = factorialBigInt(degree).toString();
    const terms = Array.from({ length: rank }, (_, index) => {
      const i = index + 1;
      const latexRoot = rootLatex(i);
      const plainRoot = rootPlain(i);
      return {
        latex: degree === 1 ? latexRoot : `${latexRoot}^{${degree}}`,
        plain: degree === 1 ? plainRoot : `${plainRoot}^${degree}`
      };
    });
    const sum = explicitSumDisplay(terms, '0');
    if (denom === '1' || sum.latex === '0') return sum;
    return {
      latex: `\\frac{1}{${denom}}\\left(${sum.latex}\\right)`,
      plain: `1/${denom}*(${sum.plain})`
    };
  }

  function rootLatex(index) {
    return `\\alpha_{${index}}`;
  }

  function rootPlain(index) {
    return `alpha_${index}`;
  }

  function buildExpandedRootClassRows(bundle, d, options) {
    const rank = rootExpansionRankFromPlain(bundle.rankPlain, d);
    if (rank == null) return buildProductRootClassRows(bundle, { ...options, rootForm: 'product' });
    const rootDisplay = buildExpandedRootPolynomials(rank, d);
    if (rootDisplayHasLargeExpansion(rootDisplay, options)) {
      options.rootForm = 'product';
      return buildProductRootClassRows(bundle, { ...options, rootForm: 'product' });
    }
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const suffix = `_{${i}}`;
      return [
        { label: `c_${i}(${bundle.labelPlain})`, labelLatex: `c${suffix}(${bundle.labelLatex})`, key: `root_chern_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.chern, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.chern, i)) },
        { label: `ch_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}${suffix}(${bundle.labelLatex})`, key: `root_character_${i}`, latex: i === 0 ? String(rank) : formatPolyLatex(homogeneousPart(rootDisplay.character, i)), plain: i === 0 ? String(rank) : formatPolyPlain(homogeneousPart(rootDisplay.character, i)) },
        { label: `td_${i}(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}${suffix}(${bundle.labelLatex})`, key: `root_todd_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.todd, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.todd, i)) },
        { label: `s_${i}(${bundle.labelPlain})`, labelLatex: `s${suffix}(${bundle.labelLatex})`, key: `root_segre_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.segre, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.segre, i)) },
        { label: `sqrt td_${i}(${bundle.labelPlain})`, labelLatex: `\\left(\\sqrt{\\operatorname{td}}\\right)${suffix}(${bundle.labelLatex})`, key: `root_sqrtTodd_${i}`, latex: formatPolyLatex(homogeneousPart(rootDisplay.sqrtTodd, i)), plain: formatPolyPlain(homogeneousPart(rootDisplay.sqrtTodd, i)) }
      ];
    }
    return [
      { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'root_chern', latex: formatPolyLatex(rootDisplay.chern), plain: formatPolyPlain(rootDisplay.chern) },
      { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'root_character', latex: formatRankPlusPolyLatex(String(rank), rootDisplay.character), plain: formatRankPlusPolyPlain(String(rank), rootDisplay.character) },
      { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'root_todd', latex: formatPolyLatex(rootDisplay.todd), plain: formatPolyPlain(rootDisplay.todd) },
      { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'root_segre', latex: formatPolyLatex(rootDisplay.segre), plain: formatPolyPlain(rootDisplay.segre) },
      { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'root_sqrtTodd', latex: formatPolyLatex(rootDisplay.sqrtTodd), plain: formatPolyPlain(rootDisplay.sqrtTodd) }
    ];
  }

  function buildExpandedRootPolynomials(rank, d) {
    const roots = chernRootVariables(rank);
    const pComps = powerSumsFromRoots(roots, d);
    return {
      chern: multiplyRootFactors(roots.map((root) => Poly.one().add(root)), d),
      character: positiveTotal(chComponentsFromPowerSums(pComps, d), d),
      todd: multiplyRootSeries(roots, toddFactorCoefficients(d), d),
      segre: multiplyRootSeries(roots, segreFactorCoefficients(d), d),
      sqrtTodd: multiplyRootSeries(roots, sqrtToddFactorCoefficients(d), d)
    };
  }

  function chernComponentsFromRoots(rank, d) {
    const total = chernRootVariables(rank)
      .reduce((product, root) => product.mul(Poly.one().add(root), d), Poly.one());
    const cComps = zeroComponentArray(d);
    cComps[0] = Poly.one();
    for (let i = 1; i <= d; i++) cComps[i] = homogeneousPart(total, i);
    return cComps;
  }

  function chernRootVariables(rank) {
    return Array.from({ length: rank }, (_, index) => chernRootVariable(index + 1));
  }

  function chernRootVariable(index) {
    const id = `chernRoot${index}`;
    defineVariable(id, 1, `\\alpha_{${index}}`);
    return Poly.variable(id);
  }

  function componentOrZero(comps, index) {
    return comps && comps[index] ? comps[index] : Poly.zero();
  }

  function powerSumsFromRoots(roots, d) {
    const sums = zeroComponentArray(d);
    for (const root of roots) {
      let power = Poly.one();
      for (let i = 1; i <= d; i++) {
        power = power.mul(root, d);
        sums[i] = sums[i].add(power);
      }
    }
    return sums;
  }

  function multiplyRootFactors(factors, d) {
    return factors.reduce((product, factor) => product.mul(factor, d), Poly.one()).truncate(d);
  }

  function multiplyRootSeries(roots, coeffs, d) {
    return multiplyRootFactors(roots.map((root) => polyFromRootSeries(root, coeffs, d)), d);
  }

  function polyFromRootSeries(root, coeffs, d) {
    let total = Poly.zero();
    let power = Poly.one();
    for (let i = 0; i <= d; i++) {
      const coeff = Fraction.from(coeffs[i] || Fraction.zero());
      if (!coeff.isZero()) total = total.add(power.scale(coeff));
      if (i < d) power = power.mul(root, d);
    }
    return total.truncate(d);
  }

  function segreFactorCoefficients(d) {
    return Array.from({ length: d + 1 }, (_, i) => fraction(i % 2 === 0 ? 1 : -1));
  }

  function toddFactorCoefficients(d) {
    const denominator = Array.from({ length: d + 1 }, (_, i) => fraction(i % 2 === 0 ? 1 : -1, factorialBigInt(i + 1)));
    return seriesInverse(denominator, d);
  }

  function sqrtToddFactorCoefficients(d) {
    return seriesExp(seriesScale(toddLogCoefficients(d), fraction(1, 2), d), d);
  }

  function rootDisplayHasLargeExpansion(display, options) {
    if (options.termMode === 'term') {
      const i = options.termIndex;
      const polys = [
        homogeneousPart(display.chern, i),
        i === 0 ? Poly.one() : homogeneousPart(display.character, i),
        homogeneousPart(display.todd, i),
        homogeneousPart(display.segre, i),
        homogeneousPart(display.sqrtTodd, i)
      ];
      return polys.some((poly) => poly.terms.size > MAX_ROOT_EXPANSION_MONOMIALS);
    }
    return [display.chern, display.character, display.todd, display.segre, display.sqrtTodd]
      .some((poly) => poly.terms.size > MAX_ROOT_EXPANSION_MONOMIALS);
  }

  function homogeneousPart(poly, degree) {
    poly = Poly.from(poly);
    const terms = new Map();
    for (const [key, coeff] of poly.terms) {
      if (monoDegree(key) === degree) terms.set(key, coeff);
    }
    return new Poly(terms);
  }

  function applyHomologyRules(poly, options = {}) {
    poly = Poly.from(poly);
    const geometry = options.geometry || null;
    const homology = options.homology || geometry?.homology || null;
    if (!homology?.rules?.length) return poly;
    const defs = homologyClassDefinitions(geometry);
    const available = new Set(defs.map((def) => homologyVariableId(def.id)));
    const rules = homology.rules.filter((rule) => (
      rule.enabled !== false
      && homologyRulePreservesDegree(rule, defs)
      && homologyRuleUsesAvailableVariables(rule, available)
    ));
    if (!rules.length) return poly;
    let out = poly;
    const start = currentTimeMs();
    for (let pass = 1; pass <= MAX_HOMOLOGY_RULE_PASSES; pass += 1) {
      const before = out;
      for (const rule of rules) out = applyOneHomologyRule(out, rule, geometry?.dim ?? MAX_DIMENSION);
      if (polyEquals(before, out)) return out.truncate(geometry?.dim ?? MAX_DIMENSION);
      if (currentTimeMs() - start > MAX_HOMOLOGY_RULE_MS) {
        recordHomologyRuleWarning(options, `Homology rules did not settle within ${MAX_HOMOLOGY_RULE_MS / 1000}s.`);
        return out.truncate(geometry?.dim ?? MAX_DIMENSION);
      }
    }
    recordHomologyRuleWarning(options, `Homology rules did not settle after ${MAX_HOMOLOGY_RULE_PASSES} passes.`);
    return out.truncate(geometry?.dim ?? MAX_DIMENSION);
  }

  function recordHomologyRuleWarning(options, message) {
    if (!options.homologyRuleWarning) options.homologyRuleWarning = message;
  }

  function polyEquals(a, b) {
    a = Poly.from(a);
    b = Poly.from(b);
    if (a.terms.size !== b.terms.size) return false;
    for (const [key, coeff] of a.terms) {
      const other = b.terms.get(key);
      if (!other || coeff.num !== other.num || coeff.den !== other.den) return false;
    }
    return true;
  }

  function currentTimeMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  function applyOneHomologyRule(poly, rule, maxDegree) {
    const lhsPowers = rule.lhs?.powers || {};
    const rhs = homologyRuleRhsPoly(rule);
    const terms = new Map();
    for (const [key, coeff] of poly.terms) {
      const powers = parseMonoKey(key);
      const count = monomialFactorCount(powers, lhsPowers);
      const replacement = count > 0
        ? polyFromPowers(removeMonomialFactor(powers, lhsPowers, count)).mul(polyPower(rhs, count, maxDegree), maxDegree).scale(coeff)
        : polyFromPowers(powers).scale(coeff);
      for (const [nextKey, nextCoeff] of replacement.terms) {
        const next = (terms.get(nextKey) || Fraction.zero()).add(nextCoeff);
        if (next.isZero()) terms.delete(nextKey);
        else terms.set(nextKey, next);
      }
    }
    return new Poly(terms).truncate(maxDegree);
  }

  function homologyRulePreservesDegree(rule, defs) {
    const lhsDegree = homologyPowersDegree(rule.lhs?.powers || {}, defs);
    if (lhsDegree == null || lhsDegree <= 0) return false;
    const rhs = homologyRuleRhsPoly(rule);
    if (rhs.isZero()) return true;
    return sortedTerms(rhs).every(([key]) => homologyPowersDegree(parseMonoKey(key), defs) === lhsDegree);
  }

  function homologyRuleUsesAvailableVariables(rule, availableIds) {
    const allTerms = [rule.lhs || {}, ...(rule.rhs || [])];
    return allTerms.every((term) => Object.keys(term.powers || {}).every((id) => availableIds.has(id)));
  }

  function homologyPowersDegree(powers, defs) {
    let degree = 0;
    for (const [id, exp] of Object.entries(powers || {})) {
      const def = defs.find((entry) => homologyVariableId(entry.id) === id);
      if (!def) return null;
      degree += def.degree * (Number(exp) || 0);
    }
    return degree;
  }

  function monomialFactorCount(powers, factorPowers) {
    const entries = Object.entries(factorPowers || {});
    if (!entries.length) return 0;
    let count = Infinity;
    for (const [id, exp] of entries) {
      const exponent = Number(exp) || 0;
      if (exponent <= 0) return 0;
      count = Math.min(count, Math.floor((powers[id] || 0) / exponent));
    }
    return Number.isFinite(count) ? count : 0;
  }

  function removeMonomialFactor(powers, factorPowers, count) {
    const out = { ...powers };
    for (const [id, exp] of Object.entries(factorPowers || {})) {
      out[id] = (out[id] || 0) - (Number(exp) || 0) * count;
      if (out[id] <= 0) delete out[id];
    }
    return out;
  }

  function polyPower(poly, exponent, maxDegree) {
    let out = Poly.one();
    for (let i = 0; i < exponent; i++) out = out.mul(poly, maxDegree);
    return out;
  }

  function coefficientLatexPlain(total, degree) {
    return {
      latex: `\\left[${total.latex}\\right]_{${degree}}`,
      plain: `degree_${degree}(${total.plain})`
    };
  }

  function rootDegreeZeroTerms(rankLatex, rankPlain) {
    return {
      chern: { latex: '1', plain: '1' },
      character: { latex: rankLatex, plain: rankPlain },
      todd: { latex: '1', plain: '1' },
      segre: { latex: '1', plain: '1' },
      sqrtTodd: { latex: '1', plain: '1' }
    };
  }

  function rootCharacterTerm(degree, rankLatex, rankPlain) {
    const denom = factorialBigInt(degree).toString();
    const powerLatex = degree === 1 ? '\\alpha_j' : `\\alpha_j^{${degree}}`;
    const powerPlain = degree === 1 ? 'alpha_j' : `alpha_j^${degree}`;
    const sumLatex = `\\sum_{j=1}^{${rankLatex}} ${powerLatex}`;
    const sumPlain = `sum_{j=1}^${rankPlain} ${powerPlain}`;
    if (denom === '1') return { latex: sumLatex, plain: sumPlain };
    return {
      latex: `\\frac{1}{${denom}}${sumLatex}`,
      plain: `1/${denom}*${sumPlain}`
    };
  }

  function buildConstructedSheafBundle(geometry, sheaf, options = {}) {
    const construction = sheaf.construction || {};
    if (construction.type === 'direct-sum' || construction.type === 'tensor') {
      const [leftObject, rightObject] = (construction.sheafIds || []).map((id) => state.sheaves.find((item) => item.id === id));
      if (!leftObject || !rightObject) return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      const left = buildSourceSheafBundle(geometry, leftObject);
      const right = buildSourceSheafBundle(geometry, rightObject);
      return construction.type === 'direct-sum'
        ? buildDirectSumBundle(geometry.dim, sheaf, left, right)
        : buildTensorBundle(geometry.dim, sheaf, left, right);
    }
    if (construction.type === 'pullback' || construction.type === 'pushforward') {
      return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, {
        ...options,
        variablePrefix: constructionVariablePrefix(sheaf.sourceObject || sheaf, construction.type),
        chernSubjectLatex: sheaf.labelLatex,
        characterSubjectLatex: sheaf.labelLatex
      });
    }
    return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildSourceSheafBundle(geometry, sheafObject) {
    const source = sheafFromObject(sheafObject, geometry);
    return buildBundleForSheaf(geometry, source, {
      variablePrefix: constructionVariablePrefix(sheafObject, 'source')
    });
  }

  function buildDirectSumBundle(d, sheaf, left, right) {
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      chComps[i] = componentOrZero(left.chComps, i).add(componentOrZero(right.chComps, i));
    }
    return buildBundleFromCh(chComps, rankSumLatex(left, right), rankSumPlain(left, right), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildTensorBundle(d, sheaf, left, right) {
    const chComps = zeroComponentArray(d);
    const leftRank = rankAsDegreeZeroPoly(left, `${constructionSafeId(sheaf.labelPlain)}Left`);
    const rightRank = rankAsDegreeZeroPoly(right, `${constructionSafeId(sheaf.labelPlain)}Right`);
    for (let i = 1; i <= d; i++) {
      let term = componentOrZero(left.chComps, i).mul(rightRank, d)
        .add(componentOrZero(right.chComps, i).mul(leftRank, d));
      for (let j = 1; j < i; j += 1) {
        term = term.add(componentOrZero(left.chComps, j).mul(componentOrZero(right.chComps, i - j), d));
      }
      chComps[i] = term;
    }
    return buildBundleFromCh(chComps, rankProductLatex(left, right), rankProductPlain(left, right), sheaf.labelLatex, sheaf.labelPlain);
  }

  function rankAsDegreeZeroPoly(bundle, idSeed) {
    const plain = String(bundle.rankPlain || '').trim();
    if (/^-?\d+$/.test(plain)) return Poly.constant(BigInt(plain));
    const id = `rank${constructionSafeId(bundle.rankLatex || bundle.rankPlain || idSeed)}`;
    defineVariable(id, 0, bundle.rankLatex || plain || 'r');
    return Poly.variable(id);
  }

  function rankSumLatex(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) + Number(right.rankPlain));
    }
    return `${rankLatexTerm(left)}+${rankLatexTerm(right)}`;
  }

  function rankSumPlain(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) + Number(right.rankPlain));
    }
    return `${left.rankPlain || 'r'}+${right.rankPlain || 's'}`;
  }

  function rankProductLatex(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) * Number(right.rankPlain));
    }
    return `${rankLatexTerm(left)}${rankLatexTerm(right)}`;
  }

  function rankProductPlain(left, right) {
    if (/^-?\d+$/.test(left.rankPlain || '') && /^-?\d+$/.test(right.rankPlain || '')) {
      return String(Number(left.rankPlain) * Number(right.rankPlain));
    }
    return `(${left.rankPlain || 'r'})*(${right.rankPlain || 's'})`;
  }

  function rankLatexTerm(bundle) {
    const rank = bundle.rankLatex || bundle.rankPlain || 'r';
    return /^[A-Za-z0-9_{}\\^]+$/.test(rank) ? rank : `\\left(${rank}\\right)`;
  }

  function constructionVariablePrefix(object, role) {
    return `${role}${constructionSafeId(object?.id || object?.name || 'object')}_`;
  }

  function constructionSafeId(value) {
    return String(value || 'x').replace(/[^A-Za-z0-9]/g, '') || 'x';
  }

  function buildAbstractGeometrySheaf(geometry, sheaf, options = {}) {
    if (sheaf.type === 'tangent') {
      return buildAbstractTangentBundle(geometry, sheaf);
    }
    if (sheaf.type === 'cotangent') {
      return buildAbstractCotangentBundle(geometry, sheaf);
    }
    if (sheaf.type === 'canonical') {
      return buildAbstractCanonicalBundle(geometry, sheaf);
    }
    if (sheaf.type === 'twist') {
      throw new Error('O_X(r) requires a map to projective space.');
    }
    return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildAbstractTangentBundle(geometry, sheaf) {
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'tangent');
    }
    const d = geometry.dim;
    if (sheaf.basis === 'character') {
      return buildBundleFromCh(abstractTangentChComponents(geometry), String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
    }
    return buildBundleFromChern(abstractTangentChernComponents(geometry), String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractCotangentBundle(geometry, sheaf) {
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'cotangent');
    }
    const d = geometry.dim;
    if (sheaf.basis === 'character') {
      const chComps = abstractTangentChComponents(geometry).map((comp, i) => (
        i === 0 ? comp : comp.scale(fraction(i % 2 === 0 ? 1 : -1))
      ));
      return buildBundleFromCh(chComps, String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
    }
    const cComps = abstractTangentChernComponents(geometry).map((comp, i) => (
      i === 0 ? comp : comp.scale(fraction(i % 2 === 0 ? 1 : -1))
    ));
    return buildBundleFromChern(cComps, String(d), String(d), sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractCanonicalBundle(geometry, sheaf) {
    if (geometry.type === 'curve') {
      return buildCurveLineBundle(geometry, sheaf, 'canonical');
    }
    const d = geometry.dim;
    const firstChern = sheaf.basis === 'character'
      ? (abstractTangentChComponents(geometry)[1] || Poly.zero()).scale(fraction(-1))
      : (abstractTangentChernComponents(geometry)[1] || Poly.zero()).scale(fraction(-1));
    return buildLineFromFirstChern(firstChern, d, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildCurveLineBundle(geometry, sheaf, kind) {
    const point = curvePointClass(geometry);
    const firstChern = kind === 'tangent' ? curveTangentFirstChern(geometry, point) : curveCanonicalFirstChern(geometry, point);
    return buildLineFromFirstChern(firstChern, 1, sheaf.labelLatex, sheaf.labelPlain);
  }

  function curvePointClass(geometry) {
    const id = homologyVariableId(HOMOLOGY_POINT_CLASS);
    const pointClass = homologyClassDefById(geometry, HOMOLOGY_POINT_CLASS);
    defineVariable(id, 1, pointClass?.symbolLatex || '[p]');
    return Poly.variable(id);
  }

  function curveTangentFirstChern(geometry, point) {
    const genus = sanitizeGenusInput(geometry.genus);
    if (/^\d+$/.test(genus)) return point.scale(fraction(2 - 2 * Number(genus)));
    defineVariable('curveGenus', 0, 'g');
    return point.scale(fraction(2)).sub(Poly.variable('curveGenus').mul(point, 1).scale(fraction(2)));
  }

  function curveCanonicalFirstChern(geometry, point) {
    return curveTangentFirstChern(geometry, point).neg();
  }

  function abstractTangentChernComponents(geometry) {
    const d = geometry.dim;
    const cComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      const id = `cX${i}`;
      defineVariable(id, i, `c_{${i}}(${geometry.labelLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return cComps;
  }

  function abstractTangentChComponents(geometry) {
    const d = geometry.dim;
    const chComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      const id = `chX${i}`;
      defineVariable(id, i, `\\operatorname{ch}_{${i}}(${geometry.labelLatex})`);
      chComps[i] = Poly.variable(id);
    }
    return chComps;
  }

  function buildEmbeddedGeometrySheaf(geometry, sheaf, options = {}) {
    const d = geometry.dim;
    if (sheaf.type === 'tangent') {
      const terms = [{ multiplicity: geometry.ambient + 1, twist: 1 }, { multiplicity: -1, twist: 0 }];
      geometry.degrees.forEach((degree) => terms.push({ multiplicity: -1, twist: degree }));
      const chComps = chComponentsFromLineTerms(terms, d);
      return buildBundleFromCh(chComps, String(d), String(d), sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'cotangent') {
      const terms = [{ multiplicity: geometry.ambient + 1, twist: -1 }, { multiplicity: -1, twist: 0 }];
      geometry.degrees.forEach((degree) => terms.push({ multiplicity: -1, twist: -degree }));
      const chComps = chComponentsFromLineTerms(terms, d);
      return buildBundleFromCh(chComps, String(d), String(d), sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'canonical') {
      const q = geometry.degrees.reduce((sum, degree) => sum + degree, 0) - geometry.ambient - 1;
      return buildLineFromHyperplane(q, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    if (sheaf.type === 'twist') {
      return buildLineFromHyperplane(sheaf.twist, d, sheafLabelLatex(sheaf), sheafLabelPlain(sheaf));
    }
    return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
  }

  function buildLocallyFreeBundle(d, sheaf, options = {}) {
    const prefix = options.variablePrefix || '';
    const numericRank = numericRankFromPlain(sheaf.rankPlain);
    if (sheaf.basis === 'character') {
      if (numericRank == null) {
        return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain, options);
      }
      const maxCharacterIndex = Math.min(d, numericRank);
      const freeChComps = zeroComponentArray(maxCharacterIndex);
      for (let i = 1; i <= maxCharacterIndex; i++) {
        const id = `${prefix}ch${i}`;
        defineVariable(id, i, `\\operatorname{ch}_{${i}}(${sheaf.labelLatex})`);
        freeChComps[i] = Poly.variable(id);
      }
      const freePComps = zeroComponentArray(maxCharacterIndex);
      for (let i = 1; i <= maxCharacterIndex; i++) {
        freePComps[i] = freeChComps[i].scale(fraction(factorialBigInt(i)));
      }
      const freeCComps = chernFromPowerSums(freePComps, maxCharacterIndex);
      const cComps = zeroComponentArray(d);
      for (let i = 1; i <= maxCharacterIndex; i++) cComps[i] = freeCComps[i];
      return buildBundleFromChern(cComps, sheaf.rankLatex, sheaf.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
    }
    const cComps = zeroComponentArray(d);
    const maxChernIndex = numericRank == null ? d : Math.min(d, numericRank);
    for (let i = 1; i <= maxChernIndex; i++) {
      const id = `${prefix}c${i}`;
      defineVariable(id, i, `c_{${i}}(${sheaf.labelLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return buildBundleFromChern(cComps, sheaf.rankLatex, sheaf.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractBundle(d, sheaf, subjectLatex, subjectPlain, rankLatex, rankPlain, options = {}) {
    const chernSubjectLatex = options.chernSubjectLatex || subjectLatex;
    const characterSubjectLatex = options.characterSubjectLatex || subjectLatex;
    const prefix = options.variablePrefix || '';
    if (sheaf.basis === 'character') {
      const chComps = zeroComponentArray(d);
      for (let i = 1; i <= d; i++) {
        const id = `${prefix}ch${i}`;
        defineVariable(id, i, `\\operatorname{ch}_{${i}}(${characterSubjectLatex})`);
        chComps[i] = Poly.variable(id);
      }
      return buildBundleFromCh(chComps, rankLatex, rankPlain, subjectLatex, subjectPlain);
    }
    const cComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      const id = `${prefix}c${i}`;
      defineVariable(id, i, `c_{${i}}(${chernSubjectLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return buildBundleFromChern(cComps, rankLatex, rankPlain, subjectLatex, subjectPlain);
  }

  function buildLineFromHyperplane(twist, d, labelLatex, labelPlain) {
    return buildLineFromFirstChern(Poly.variable('H').scale(fraction(twist)), d, labelLatex, labelPlain);
  }

  function buildLineFromFirstChern(firstChern, d, labelLatex, labelPlain) {
    const cComps = zeroComponentArray(d);
    if (d >= 1) cComps[1] = firstChern;
    return buildBundleFromChern(cComps, '1', '1', labelLatex, labelPlain);
  }

  function buildBundleFromChern(cComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = cComps.length - 1;
    const pComps = powerSumsFromChern(cComps, d);
    const chComps = chComponentsFromPowerSums(pComps, d);
    return finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain);
  }

  function buildBundleFromCh(chComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = chComps.length - 1;
    const pComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) pComps[i] = chComps[i].scale(fraction(factorialBigInt(i)));
    const cComps = chernFromPowerSums(pComps, d);
    return finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain);
  }

  function finishBundle(cComps, chComps, pComps, rankLatex, rankPlain, labelLatex, labelPlain) {
    const d = cComps.length - 1;
    const cTotal = totalFromComponents(cComps, d, Poly.one());
    const segre = inverseUnit(cTotal, d);
    const logTodd = toddLogFromPowerSums(pComps, d);
    const todd = expPoly(logTodd, d);
    const sqrtTodd = expPoly(logTodd.scale(fraction(1, 2)), d);
    return {
      cComps,
      chComps,
      pComps,
      cTotal,
      segre,
      todd,
      sqrtTodd,
      rankLatex,
      rankPlain,
      labelLatex,
      labelPlain
    };
  }

  function chComponentsFromLineTerms(terms, d) {
    const chComps = zeroComponentArray(d);
    const H = Poly.variable('H');
    const powers = [Poly.one()];
    for (let i = 1; i <= d; i++) powers[i] = powers[i - 1].mul(H, d);
    for (let i = 1; i <= d; i++) {
      let coeff = Fraction.zero();
      for (const term of terms) {
        const qPower = bigintPow(BigInt(term.twist), i);
        coeff = coeff.add(fraction(BigInt(term.multiplicity) * qPower, factorialBigInt(i)));
      }
      chComps[i] = chComps[i].add(powers[i].scale(coeff));
    }
    return chComps;
  }

  function zeroComponentArray(d) {
    return Array.from({ length: d + 1 }, () => Poly.zero());
  }

  function totalFromComponents(comps, d, constant) {
    let total = constant || Poly.zero();
    for (let i = 1; i <= d; i++) total = total.add(comps[i]);
    return total.truncate(d);
  }

  function positiveTotal(comps, d) {
    return totalFromComponents(comps, d, Poly.zero());
  }

  function powerSumsFromChern(cComps, d) {
    const p = zeroComponentArray(d);
    for (let k = 1; k <= d; k++) {
      let sum = Poly.zero();
      for (let i = 1; i < k; i++) {
        const sign = i % 2 === 1 ? 1 : -1;
        sum = sum.add(cComps[i].mul(p[k - i], d).scale(fraction(sign)));
      }
      const lastSign = k % 2 === 1 ? 1 : -1;
      sum = sum.add(cComps[k].scale(fraction(lastSign * k)));
      p[k] = sum.truncate(d);
    }
    return p;
  }

  function chernFromPowerSums(pComps, d) {
    const c = zeroComponentArray(d);
    c[0] = Poly.one();
    for (let k = 1; k <= d; k++) {
      let sum = Poly.zero();
      for (let i = 1; i <= k; i++) {
        const sign = i % 2 === 1 ? 1 : -1;
        sum = sum.add(c[k - i].mul(pComps[i], d).scale(fraction(sign)));
      }
      c[k] = sum.scale(fraction(1, k)).truncate(d);
    }
    return c;
  }

  function chComponentsFromPowerSums(pComps, d) {
    const ch = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) ch[i] = pComps[i].scale(fraction(1, factorialBigInt(i)));
    return ch;
  }

  function inverseUnit(poly, d) {
    const u = poly.sub(Poly.one()).truncate(d);
    let total = Poly.one();
    let term = Poly.one();
    for (let i = 1; i <= d; i++) {
      term = term.mul(u, d).scale(fraction(-1));
      if (term.isZero()) break;
      total = total.add(term);
    }
    return total.truncate(d);
  }

  function expPoly(poly, d) {
    let total = Poly.one();
    let term = Poly.one();
    for (let i = 1; i <= d; i++) {
      term = term.mul(poly, d).scale(fraction(1, i));
      if (term.isZero()) break;
      total = total.add(term);
    }
    return total.truncate(d);
  }

  function toddLogFromPowerSums(pComps, d) {
    const coeffs = toddLogCoefficients(d);
    let out = Poly.zero();
    for (let i = 1; i <= d; i++) {
      if (!coeffs[i] || coeffs[i].isZero()) continue;
      out = out.add(pComps[i].scale(coeffs[i]));
    }
    return out.truncate(d);
  }

  function buildHodgeNumbers(geometry) {
    const d = geometry.dim;
    if (geometry.type === 'curve') {
      const genus = genusLatex(geometry.genus);
      return {
        entries: [
          [
            { latex: '1', plain: '1' },
            { latex: genus, plain: genusPlain(geometry.genus) }
          ],
          [
            { latex: genus, plain: genusPlain(geometry.genus) },
            { latex: '1', plain: '1' }
          ]
        ],
        message: `Curve Hodge numbers with genus ${genusPlain(geometry.genus)}.`
      };
    }
    if (geometry.type === 'abstract') {
      if (d === 2) {
        return {
          entries: [
            [
              { latex: '1', plain: '1' },
              { latex: 'q', plain: 'q' },
              { latex: 'p_g', plain: 'p_g' }
            ],
            [
              { latex: 'q', plain: 'q' },
              { latex: 'h^{1,1}', plain: 'h^1,1' },
              { latex: 'q', plain: 'q' }
            ],
            [
              { latex: 'p_g', plain: 'p_g' },
              { latex: 'q', plain: 'q' },
              { latex: '1', plain: '1' }
            ]
          ],
          message: 'Abstract surface: standard notation for Hodge numbers.'
        };
      }
      const entries = Array.from({ length: d + 1 }, (_, p) => (
        Array.from({ length: d + 1 }, (_, q) => ({
          latex: `h^{${p},${q}}`,
          plain: `h^${p},${q}`
        }))
      ));
      return {
        entries,
        message: 'Abstract variety: entries are symbolic Hodge numbers.'
      };
    }

    const chi = chiYCoefficientsForCompleteIntersection(geometry);
    const entries = Array.from({ length: d + 1 }, () => (
      Array.from({ length: d + 1 }, () => Fraction.zero())
    ));
    for (let p = 0; p <= d; p++) entries[p][p] = entries[p][p].add(Fraction.one());
    for (let p = 0; p <= d; p++) {
      const diagonal = fraction(p % 2 === 0 ? 1 : -1);
      const sign = fraction((d - p) % 2 === 0 ? 1 : -1);
      const primitive = chi[p].sub(diagonal).mul(sign);
      if (!primitive.isZero()) {
        const q = d - p;
        entries[p][q] = entries[p][q].add(primitive);
      }
    }
    return {
      entries: entries.map((row) => row.map((value) => ({
        latex: formatFractionLatex(value),
        plain: formatFractionPlain(value)
      }))),
      message: geometry.type === 'projective'
        ? 'Projective-space Hodge numbers.'
        : 'Smooth complete-intersection Hodge numbers, computed from the Hirzebruch chi_y genus.'
    };
  }

  function chiYCoefficientsForCompleteIntersection(geometry) {
    const d = geometry.dim;
    const values = [];
    for (let y = 0; y <= d; y++) values.push(chiYValueAt(geometry, fraction(y)));
    return interpolateAtConsecutiveIntegers(values);
  }

  function chiYValueAt(geometry, y) {
    const d = geometry.dim;
    const ambient = geometry.ambient;
    const degrees = geometry.degrees;
    let series = seriesPow(hirzebruchQSeries(1, y, d), ambient + 1, d);
    series = seriesScale(series, Fraction.one().div(Fraction.one().add(y)), d);
    for (const degree of degrees) {
      series = seriesMultiply(series, seriesInverse(hirzebruchQSeries(degree, y, d), d), d);
    }
    const degreeProduct = degrees.reduce((prod, degree) => prod * BigInt(degree), 1n);
    return series[d].mul(fraction(degreeProduct));
  }

  function hirzebruchQSeries(scaleValue, y, d) {
    const aCoeffs = hirzebruchACoeffs(d);
    return Array.from({ length: d + 1 }, (_, k) => {
      const positive = fraction(bigintPow(BigInt(scaleValue), k));
      const negative = fraction(bigintPow(BigInt(-scaleValue), k));
      return aCoeffs[k].mul(positive).add(y.mul(aCoeffs[k]).mul(negative));
    });
  }

  function hirzebruchACoeffs(d) {
    if (hodgeACoeffCache.has(d)) return hodgeACoeffCache.get(d);
    const denominator = Array.from({ length: d + 1 }, (_, n) => {
      const sign = n % 2 === 0 ? 1 : -1;
      return fraction(sign, factorialBigInt(n + 1));
    });
    const coeffs = seriesInverse(denominator, d);
    hodgeACoeffCache.set(d, coeffs);
    return coeffs;
  }

  function seriesPow(series, exponent, d) {
    let result = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    let base = series.slice();
    let n = exponent;
    while (n > 0) {
      if (n % 2 === 1) result = seriesMultiply(result, base, d);
      n = Math.floor(n / 2);
      if (n > 0) base = seriesMultiply(base, base, d);
    }
    return result;
  }

  function interpolateAtConsecutiveIntegers(values) {
    const d = values.length - 1;
    let result = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i <= d; i++) {
      let basis = [Fraction.one()];
      let denominator = Fraction.one();
      for (let j = 0; j <= d; j++) {
        if (i === j) continue;
        basis = yPolyMultiplyLinear(basis, fraction(-j), Fraction.one(), d);
        denominator = denominator.mul(fraction(i - j));
      }
      const scale = values[i].div(denominator);
      result = yPolyAdd(result, yPolyScale(basis, scale, d), d);
    }
    return result;
  }

  function yPolyMultiplyLinear(poly, constant, linear, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i < poly.length && i <= d; i++) {
      out[i] = out[i].add(poly[i].mul(constant));
      if (i + 1 <= d) out[i + 1] = out[i + 1].add(poly[i].mul(linear));
    }
    return out;
  }

  function yPolyScale(poly, scalar, d) {
    return Array.from({ length: d + 1 }, (_, i) => (poly[i] || Fraction.zero()).mul(scalar));
  }

  function yPolyAdd(a, b, d) {
    return Array.from({ length: d + 1 }, (_, i) => (a[i] || Fraction.zero()).add(b[i] || Fraction.zero()));
  }

  const toddLogCache = new Map();
  function toddLogCoefficients(d) {
    if (toddLogCache.has(d)) return toddLogCache.get(d);
    const g = Array.from({ length: d + 1 }, (_, n) => fraction(n % 2 === 0 ? 1 : -1, factorialBigInt(n + 1)));
    const f = seriesInverse(g, d);
    const logF = seriesLogUnit(f, d);
    toddLogCache.set(d, logF);
    return logF;
  }

  function seriesInverse(series, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    out[0] = Fraction.one().div(series[0]);
    for (let n = 1; n <= d; n++) {
      let sum = Fraction.zero();
      for (let i = 1; i <= n; i++) sum = sum.add(series[i].mul(out[n - i]));
      out[n] = sum.neg().div(series[0]);
    }
    return out;
  }

  function seriesLogUnit(series, d) {
    const u = series.slice();
    u[0] = u[0].sub(Fraction.one());
    let total = Array.from({ length: d + 1 }, () => Fraction.zero());
    let power = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    for (let k = 1; k <= d; k++) {
      power = seriesMultiply(power, u, d);
      const scale = fraction(k % 2 === 1 ? 1 : -1, k);
      total = seriesAdd(total, seriesScale(power, scale, d), d);
    }
    return total;
  }

  function seriesExp(series, d) {
    let total = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    let power = [Fraction.one(), ...Array.from({ length: d }, () => Fraction.zero())];
    for (let k = 1; k <= d; k++) {
      power = seriesMultiply(power, series, d);
      total = seriesAdd(total, seriesScale(power, fraction(1, factorialBigInt(k)), d), d);
    }
    return total;
  }

  function seriesMultiply(a, b, d) {
    const out = Array.from({ length: d + 1 }, () => Fraction.zero());
    for (let i = 0; i <= d; i++) {
      if (a[i].isZero()) continue;
      for (let j = 0; j + i <= d; j++) {
        if (!b[j] || b[j].isZero()) continue;
        out[i + j] = out[i + j].add(a[i].mul(b[j]));
      }
    }
    return out;
  }

  function seriesScale(series, scalar, d) {
    return Array.from({ length: d + 1 }, (_, i) => series[i].mul(scalar));
  }

  function seriesAdd(a, b, d) {
    return Array.from({ length: d + 1 }, (_, i) => a[i].add(b[i]));
  }

  class Fraction {
    constructor(num = 0n, den = 1n) {
      num = toBigInt(num);
      den = toBigInt(den);
      if (den === 0n) throw new Error('Division by zero.');
      if (num === 0n) {
        this.num = 0n;
        this.den = 1n;
        return;
      }
      if (den < 0n) {
        num = -num;
        den = -den;
      }
      const g = bigintGcd(bigintAbs(num), den);
      this.num = num / g;
      this.den = den / g;
    }

    static zero() { return new Fraction(0n, 1n); }
    static one() { return new Fraction(1n, 1n); }
    static from(value) {
      if (value instanceof Fraction) return value;
      return new Fraction(value, 1n);
    }

    add(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den + other.num * this.den, this.den * other.den);
    }

    sub(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den - other.num * this.den, this.den * other.den);
    }

    mul(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.num, this.den * other.den);
    }

    div(other) {
      other = Fraction.from(other);
      return new Fraction(this.num * other.den, this.den * other.num);
    }

    neg() { return new Fraction(-this.num, this.den); }
    abs() { return new Fraction(bigintAbs(this.num), this.den); }
    isZero() { return this.num === 0n; }
    isOne() { return this.num === this.den; }
    sign() { return this.num < 0n ? -1 : this.num > 0n ? 1 : 0; }

    toLatexAbs() {
      const abs = this.abs();
      if (abs.den === 1n) return abs.num.toString();
      return `\\frac{${abs.num.toString()}}{${abs.den.toString()}}`;
    }

    toPlainAbs() {
      const abs = this.abs();
      if (abs.den === 1n) return abs.num.toString();
      return `${abs.num.toString()}/${abs.den.toString()}`;
    }
  }

  class Poly {
    constructor(terms = null) {
      this.terms = new Map();
      if (terms) {
        for (const [key, coeff] of terms.entries ? terms.entries() : Object.entries(terms)) {
          const c = Fraction.from(coeff);
          if (!c.isZero()) this.terms.set(key, c);
        }
      }
    }

    static zero() { return new Poly(); }
    static one() { return new Poly(new Map([['', Fraction.one()]])); }
    static constant(value) {
      const c = Fraction.from(value);
      return c.isZero() ? Poly.zero() : new Poly(new Map([['', c]]));
    }
    static variable(id) { return new Poly(new Map([[monoKey({ [id]: 1 }), Fraction.one()]])); }

    add(other) {
      other = Poly.from(other);
      const terms = new Map(this.terms);
      for (const [key, coeff] of other.terms) {
        const next = (terms.get(key) || Fraction.zero()).add(coeff);
        if (next.isZero()) terms.delete(key);
        else terms.set(key, next);
      }
      return new Poly(terms);
    }

    sub(other) { return this.add(Poly.from(other).neg()); }
    neg() { return this.scale(fraction(-1)); }

    scale(value) {
      const scalar = Fraction.from(value);
      if (scalar.isZero()) return Poly.zero();
      const terms = new Map();
      for (const [key, coeff] of this.terms) terms.set(key, coeff.mul(scalar));
      return new Poly(terms);
    }

    mul(other, maxDegree = MAX_DIMENSION) {
      other = Poly.from(other);
      if (this.isZero() || other.isZero()) return Poly.zero();
      const terms = new Map();
      for (const [aKey, aCoeff] of this.terms) {
        const aPowers = parseMonoKey(aKey);
        for (const [bKey, bCoeff] of other.terms) {
          const powers = { ...aPowers };
          for (const [id, exp] of Object.entries(parseMonoKey(bKey))) {
            powers[id] = (powers[id] || 0) + exp;
          }
          const key = monoKey(powers);
          if (monoDegree(key) > maxDegree) continue;
          const next = (terms.get(key) || Fraction.zero()).add(aCoeff.mul(bCoeff));
          if (next.isZero()) terms.delete(key);
          else terms.set(key, next);
        }
      }
      return new Poly(terms);
    }

    truncate(maxDegree) {
      const terms = new Map();
      for (const [key, coeff] of this.terms) {
        if (monoDegree(key) <= maxDegree) terms.set(key, coeff);
      }
      return new Poly(terms);
    }

    isZero() { return this.terms.size === 0; }

    static from(value) {
      if (value instanceof Poly) return value;
      return Poly.constant(value);
    }
  }

  function defineVariable(id, degree, latex) {
    VARS.set(id, { degree, latex, plain: latexToPlain(latex) });
  }

  function monoKey(powers) {
    return Object.entries(powers)
      .filter(([, exp]) => exp > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, exp]) => `${id}:${exp}`)
      .join('|');
  }

  function parseMonoKey(key) {
    if (!key) return {};
    const out = {};
    for (const part of key.split('|')) {
      const [id, exp] = part.split(':');
      out[id] = Number(exp);
    }
    return out;
  }

  function monoDegree(key) {
    if (!key) return 0;
    let degree = 0;
    const powers = parseMonoKey(key);
    for (const [id, exp] of Object.entries(powers)) {
      const data = VARS.get(id);
      degree += (data ? data.degree : 1) * exp;
    }
    return degree;
  }

  function monomialLatex(key) {
    if (!key) return '';
    return Object.entries(parseMonoKey(key)).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.latex : id;
      return exp === 1 ? base : `{${base}}^{${exp}}`;
    }).join('\\,');
  }

  function monomialPlain(key) {
    if (!key) return '';
    return Object.entries(parseMonoKey(key)).map(([id, exp]) => {
      const data = VARS.get(id);
      const base = data ? data.plain : id;
      return exp === 1 ? base : `${base}^${exp}`;
    }).join('*');
  }

  function sortedTerms(poly) {
    return Array.from(poly.terms.entries()).sort((a, b) => {
      const byDegree = monoDegree(a[0]) - monoDegree(b[0]);
      if (byDegree) return byDegree;
      return a[0].localeCompare(b[0]);
    });
  }

  function formatPolyLatex(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatTermLatex(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function formatTermLatex(key, absCoeff) {
    const mono = monomialLatex(key);
    if (!mono) return absCoeff.toLatexAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toLatexAbs()}\\,${mono}`;
  }

  function formatPolyPlain(poly) {
    poly = Poly.from(poly);
    if (poly.isZero()) return '0';
    let out = '';
    sortedTerms(poly).forEach(([key, coeff], index) => {
      const sign = coeff.sign();
      const body = formatTermPlain(key, coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function formatTermPlain(key, absCoeff) {
    const mono = monomialPlain(key);
    if (!mono) return absCoeff.toPlainAbs();
    if (absCoeff.isOne()) return mono;
    return `${absCoeff.toPlainAbs()}*${mono}`;
  }

  function formatRankPlusPolyLatex(rank, poly) {
    if (poly.isZero()) return rank || '0';
    const body = formatPolyLatex(poly);
    if (!rank || rank === '0') return body;
    return body.startsWith('-') ? `${rank} - ${body.slice(1)}` : `${rank} + ${body}`;
  }

  function formatRankPlusPolyPlain(rank, poly) {
    if (poly.isZero()) return rank || '0';
    const body = formatPolyPlain(poly);
    if (!rank || rank === '0') return body;
    return body.startsWith('-') ? `${rank} - ${body.slice(1)}` : `${rank} + ${body}`;
  }

  function renderHomologyPanel(result = state.lastResult) {
    if (!refs.homologyCard) return;
    const variety = activeVariety();
    if (!variety) {
      if (refs.homologyActive) refs.homologyActive.textContent = 'Add a variety.';
      if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = true;
      if (refs.homologyPointRow) refs.homologyPointRow.hidden = true;
      if (refs.homologySymbols) {
        refs.homologySymbols.hidden = true;
        refs.homologySymbols.innerHTML = '';
      }
      if (refs.homologyRules) {
        refs.homologyRules.hidden = true;
        refs.homologyRules.innerHTML = '';
      }
      if (refs.homologyAddRule) refs.homologyAddRule.hidden = true;
      if (refs.homologyMessage) refs.homologyMessage.textContent = '';
      return;
    }

    const geometry = result?.geometry?.homology && result.geometry.varietyId === variety.id
      ? result.geometry
      : geometryFromVariety(variety);
    const defs = homologyClassDefinitions(geometry);
    const hyperplane = defs.find((def) => def.id === HOMOLOGY_HYPERPLANE_CLASS);
    const point = defs.find((def) => def.id === HOMOLOGY_POINT_CLASS);

    if (refs.homologyActive) setInlineMath(refs.homologyActive, `\\text{classes on } ${geometry.labelLatex}`);
    if (refs.homologyHyperplaneRow) refs.homologyHyperplaneRow.hidden = !hyperplane;
    if (refs.homologyHyperplaneSymbol && hyperplane) refs.homologyHyperplaneSymbol.value = hyperplane.symbolLatex;
    if (refs.homologyPointRow) refs.homologyPointRow.hidden = !point;
    if (refs.homologyPointSymbol && point) refs.homologyPointSymbol.value = point.symbolLatex;

    const ruleWarning = result?.classDisplay?.homologyRuleWarning || '';
    renderHomologySymbols(geometry, defs);
    renderHomologyRules(geometry, defs);
    renderHomologyRuleCreator(geometry, defs);
    if (refs.homologyMessage) refs.homologyMessage.textContent = ruleWarning;
    typeset(refs.homologyCard);
  }

  function renderHomologySymbols(geometry, defs) {
    if (!refs.homologySymbols) return;
    refs.homologySymbols.hidden = defs.length === 0;
    refs.homologySymbols.innerHTML = defs.map((def) => `
      <div class="homology-symbol-row">
        <span>\\(${def.symbolLatex}\\in H^{${2 * def.degree}}(${geometry.labelLatex})\\)</span>
        <span class="homology-symbol-kind">${escapeHtml(def.kind)}</span>
      </div>
    `).join('');
  }

  function renderHomologyRules(geometry, defs) {
    if (!refs.homologyRules) return;
    const available = new Set(defs.map((def) => homologyVariableId(def.id)));
    const rules = (geometry.homology?.rules || []).filter((rule) => (
      homologyRulePreservesDegree(rule, defs)
      && homologyRuleUsesAvailableVariables(rule, available)
    ));
    defineHomologyVariables(geometry);
    refs.homologyRules.hidden = rules.length === 0;
    refs.homologyRules.innerHTML = rules.map((rule) => `
      <div class="homology-rule-row" data-rule-id="${escapeHtml(rule.id)}">
        <label class="homology-rule-toggle">
          <input type="checkbox" data-homology-rule-toggle="${escapeHtml(rule.id)}" ${rule.enabled !== false ? 'checked' : ''}>
          <span>\\(${homologyRuleLatex(rule, geometry)}\\)</span>
        </label>
        ${rule.builtin ? '<span class="homology-symbol-kind">standard</span>' : `<button class="btn btn-ghost homology-rule-delete" type="button" data-homology-rule-delete="${escapeHtml(rule.id)}">delete</button>`}
      </div>
    `).join('');
  }

  function renderHomologyRuleCreator(geometry, defs) {
    if (!refs.homologyAddRule) return;
    refs.homologyAddRule.hidden = defs.length === 0;
    if (defs.length === 0) return;
    if (refs.homologyRuleEquation) {
      refs.homologyRuleEquation.placeholder = defaultHomologyRulePlaceholder(geometry);
    }
  }

  function homologyRuleLatex(rule, geometry) {
    defineHomologyVariables(geometry);
    return `${homologyRuleLhsLatex(rule, geometry)}=${formatPolyLatex(homologyRuleRhsPoly(rule))}`;
  }

  function homologyRulePlain(rule, geometry) {
    return homologyRulePlainEquation(rule, geometry);
  }

  function renderResult(result) {
    const { geometry, bundle } = result;
    const badgeParts = [];
    if (geometry) badgeParts.push(geometry.labelLatex);
    if (bundle) badgeParts.push(bundle.labelLatex);
    setInlineMath(refs.objectBadge, badgeParts.length ? badgeParts.join(',\\ ') : '\\text{empty}');
    const basis = basisStatusLabel(result.sheaf?.basis);
    refs.status.textContent = `${state.varieties.length} variet${state.varieties.length === 1 ? 'y' : 'ies'} · ${state.sheaves.length} ${state.sheaves.length === 1 ? 'sheaf' : 'sheaves'} · ${state.maps.length} map${state.maps.length === 1 ? '' : 's'}${bundle ? ` · ${basis} basis` : ''}`;
    setInlineMath(refs.ringSummary, geometry ? `A^*(${geometry.labelLatex})_{\\le ${geometry.dim}}` : '\\text{add a variety}');
    renderConstructionPanel();
    renderHomologyPanel(result);
    if (result.classRows.length) {
      if (refs.classActions) refs.classActions.hidden = false;
      syncClassDisplayControls(result);
      refs.classChart.hidden = false;
      refs.classMessage.hidden = true;
      refs.classChart.innerHTML = result.classRows.map((row) => `
        <div class="sheaf-formula-row">
          <span class="sheaf-formula-label">\\(${row.labelLatex}\\)</span>
          <span class="sheaf-formula-value">\\(${row.latex}\\)</span>
        </div>
      `).join('');
      refs.classMessage.textContent = '';
    } else {
      if (refs.classActions) refs.classActions.hidden = true;
      refs.basisRow.hidden = true;
      if (refs.rootFormRow) refs.rootFormRow.hidden = true;
      if (refs.classTermRow) refs.classTermRow.hidden = true;
      refs.classChart.hidden = true;
      refs.classChart.innerHTML = '';
      refs.classMessage.className = 'hint';
      refs.classMessage.hidden = false;
      refs.classMessage.textContent = 'Select a sheaf for characteristic classes.';
    }
    if (result.hodge) {
      if (refs.hodgeActions) refs.hodgeActions.hidden = false;
      refs.hodgeChart.hidden = false;
      refs.hodgeMessage.hidden = false;
      renderHodgeChart(result);
    } else {
      if (refs.hodgeActions) refs.hodgeActions.hidden = true;
      refs.hodgeChart.hidden = true;
      refs.hodgeChart.innerHTML = '';
      refs.hodgeMessage.hidden = false;
      refs.hodgeMessage.textContent = 'Add and select a variety for Hodge numbers.';
    }
    typeset(refs.classChart);
    typeset(refs.hodgeChart);
    renderCanvas(result);
  }

  function setInlineMath(element, latex) {
    element.innerHTML = `\\(${latex}\\)`;
    typeset(element);
  }

  function renderHodgeChart(result) {
    const d = result.geometry.dim;
    const entries = result.hodge.entries;
    const expanded = state.hodgeExpanded;
    const chiOffset = expanded && d > 0 ? -d - 1 : 0;
    const leftPaddingCols = expanded && d > 0 ? Math.max(2 * d, -chiOffset) : 0;
    const hodgeOffset = expanded ? leftPaddingCols : 0;
    const hodgeEndCol = hodgeOffset + 2 * d + 1;
    const chiEndCol = expanded ? hodgeOffset + chiOffset + 2 * d + 1 : hodgeEndCol;
    const totalCols = Math.max(hodgeEndCol, chiEndCol);
    const rowOffset = expanded ? 1 : 0;
    const totalRows = 2 * d + 1 + rowOffset;
    const boardCells = [];
    const connectorCells = [];
    const diagonalLines = [];
    const bettiCol = totalCols + 2;
    const shortenLine = (x1, y1, x2, y2, amount = 0.42) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      if (!length || length <= amount * 2) return { x1, y1, x2, y2 };
      const ux = dx / length;
      const uy = dy / length;
      const round = (value) => Number(value.toFixed(3));
      return {
        x1: round(x1 + ux * amount),
        y1: round(y1 + uy * amount),
        x2: round(x2 - ux * amount),
        y2: round(y2 - uy * amount)
      };
    };
    const hodgeGridPosition = (p, q) => ({
      row: 2 * d - (p + q) + 1 + rowOffset,
      col: hodgeOffset + d + p - q + 1
    });
    const chiGridColumn = (p) => hodgeOffset + chiOffset + 2 * p + 1;
    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const { row, col } = hodgeGridPosition(p, q);
        boardCells.push(`<span class="hodge-cell" style="grid-row:${row};grid-column:${col};" title="h^${p},${q}">\\(${entries[p][q].latex}\\)</span>`);
      }
    }
    if (expanded) {
      const connectorKeys = new Set();
      const addBettiConnector = (p, q) => {
        const { row, col } = hodgeGridPosition(p, q);
        const startCol = Math.min(col, bettiCol);
        const endCol = Math.max(col, bettiCol);
        if (endCol - startCol < 2) return;
        const key = `${row}:${startCol}:${endCol}`;
        if (connectorKeys.has(key)) return;
        connectorKeys.add(key);
        connectorCells.push(`<span class="hodge-betti-line" style="grid-row:${row};grid-column:${startCol + 1}/${endCol};"></span>`);
      };
      for (let p = 0; p <= d; p++) addBettiConnector(p, 0);
      for (let q = 0; q <= d; q++) addBettiConnector(d, q);
      for (let p = 0; p <= d; p++) {
        const hodge = hodgeGridPosition(p, d);
        const chiCol = chiGridColumn(p);
        const line = shortenLine(hodge.col - 0.5, hodge.row - 0.5, chiCol - 0.5, 0.5);
        diagonalLines.push(`<line x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"></line>`);
      }
      hodgeChiDisplays(result).forEach((chi, p) => {
        const col = chiGridColumn(p);
        boardCells.push(`<span class="hodge-chi" style="grid-row:1;grid-column:${col};">\\(${chi}\\)</span>`);
      });
      const eulerDisplay = hodgeEulerDisplay(result);
      const eulerClass = parseSimpleLatexNumber(eulerDisplay) == null ? '' : ' is-number';
      boardCells.push(`<span class="hodge-euler${eulerClass}" style="grid-row:1;grid-column:${bettiCol};">\\(${eulerDisplay}\\)</span>`);
      hodgeBettiDisplays(result).forEach((betti, k) => {
        const row = 2 * d - k + 1 + rowOffset;
        const bettiClass = parseSimpleLatexNumber(betti) == null ? '' : ' is-number';
        boardCells.push(`<span class="hodge-betti${bettiClass}" style="grid-row:${row};grid-column:${bettiCol};">\\(${betti}\\)</span>`);
      });
    }
    const expandedClass = expanded ? ' is-expanded' : '';
    if (refs.hodgeExpanded) refs.hodgeExpanded.checked = expanded;
    syncHodgeCellSizeControl();
    refs.hodgeChart.setAttribute('aria-expanded', String(expanded));
    refs.hodgeChart.innerHTML = `
      <div class="hodge-frame${expandedClass}">
        <div class="hodge-board${expandedClass}" style="--hodge-cell:${state.hodgeCellSize}px;--hodge-row:${state.hodgeCellSize}px;--hodge-total-cols:${totalCols};--hodge-cols:${2 * d + 1};--hodge-rows:${totalRows};">
          ${expanded ? `<svg class="hodge-diagonal-guides" viewBox="0 0 ${totalCols} ${totalRows}" style="grid-row:1/${totalRows + 1};grid-column:1/${totalCols + 1};">${diagonalLines.join('')}</svg>` : ''}
          ${connectorCells.join('')}${boardCells.join('')}
        </div>
      </div>`;
    refs.hodgeMessage.textContent = result.hodge.message;
  }

  function toggleHodgeExpanded() {
    state.hodgeExpanded = !state.hodgeExpanded;
    if (state.lastResult?.hodge) {
      renderHodgeChart(state.lastResult);
      typeset(refs.hodgeChart);
    }
  }

  function setHodgeWide(enabled) {
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    state.hodgeWide = !!enabled && canUseWide;
    syncHodgeWidePlacement();
  }

  function setHodgeCellSize(value) {
    state.hodgeCellSize = normalizedInt(value, 15, 30, 20);
    syncHodgeCellSizeControl();
    const board = refs.hodgeChart?.querySelector('.hodge-board');
    if (board) {
      board.style.setProperty('--hodge-cell', `${state.hodgeCellSize}px`);
      board.style.setProperty('--hodge-row', `${state.hodgeCellSize}px`);
    }
  }

  function syncHodgeCellSizeControl() {
    if (refs.hodgeCellSize) refs.hodgeCellSize.value = String(state.hodgeCellSize);
    if (refs.hodgeCellSizeValue) refs.hodgeCellSizeValue.textContent = `${state.hodgeCellSize}px`;
  }

  function syncHodgeWidePlacement() {
    const card = refs.hodgeCard;
    const sideAnchor = refs.hodgeSideAnchor;
    const wideHost = refs.hodgeWideHost;
    if (!card || !sideAnchor || !wideHost) return;
    const canUseWide = window.matchMedia('(min-width: 960px)').matches;
    if (!canUseWide) state.hodgeWide = false;
    if (state.hodgeWide) {
      if (card.parentElement !== wideHost) wideHost.appendChild(card);
    } else if (sideAnchor.parentElement && card.parentElement !== sideAnchor.parentElement) {
      sideAnchor.insertAdjacentElement('afterend', card);
    }
    card.classList.toggle('wide', state.hodgeWide);
    wideHost.hidden = !state.hodgeWide;
    if (refs.toggleHodgeWide) {
      refs.toggleHodgeWide.textContent = state.hodgeWide ? 'side' : 'wide';
      refs.toggleHodgeWide.setAttribute('aria-pressed', state.hodgeWide ? 'true' : 'false');
      refs.toggleHodgeWide.disabled = !canUseWide;
    }
  }

  function hodgeChiDisplays(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') {
      const variety = result.geometry.labelLatex;
      return Array.from({ length: d + 1 }, (_, p) => {
        if (p === 0) return `\\chi(\\mathcal{O}_{${variety}})`;
        if (p === d) return `\\chi(\\omega_{${variety}})`;
        if (p === 1) return `\\chi(\\Omega_{${variety}})`;
        return `\\chi(\\Omega_{${variety}}^{${p}})`;
      });
    }
    return hodgeChiExpressions(result.hodge.entries, d);
  }

  function hodgeBettiDisplays(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') {
      return Array.from({ length: 2 * d + 1 }, (_, k) => `b_{${k}}`);
    }
    return hodgeBettiExpressions(result.hodge.entries, d);
  }

  function hodgeEulerDisplay(result) {
    const d = result.geometry.dim;
    if (result.geometry.type === 'abstract') return 'e';
    let total = Fraction.zero();
    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const value = parseSimpleLatexNumber(result.hodge.entries[p][q].latex);
        if (value == null) return 'e';
        total = total.add(value.mul(fraction((p + q) % 2 === 0 ? 1 : -1)));
      }
    }
    return formatFractionLatex(total);
  }

  function hodgeBettiExpressions(entries, d) {
    const out = [];
    for (let k = 0; k <= 2 * d; k++) {
      const terms = [];
      const pMin = Math.max(0, k - d);
      const pMax = Math.min(d, k);
      for (let p = pMin; p <= pMax; p++) {
        const q = k - p;
        terms.push({ ...entries[p][q], sign: 1 });
      }
      out[k] = formatHodgeExpressionLatex(terms);
    }
    return out;
  }

  function hodgeChiExpressions(entries, d) {
    const out = [];
    for (let p = 0; p <= d; p++) {
      const terms = [];
      for (let q = 0; q <= d; q++) {
        terms.push({ ...entries[p][q], sign: q % 2 === 0 ? 1 : -1 });
      }
      out[p] = formatHodgeExpressionLatex(terms);
    }
    return out;
  }

  function formatHodgeExpressionLatex(terms) {
    let numeric = Fraction.zero();
    const symbolic = new Map();
    for (const term of terms) {
      const sign = term.sign < 0 ? -1 : 1;
      const numericValue = parseSimpleLatexNumber(term.latex);
      if (numericValue) {
        numeric = numeric.add(numericValue.mul(fraction(sign)));
        continue;
      }
      if (!term.latex || term.latex === '0') continue;
      const current = symbolic.get(term.latex) || Fraction.zero();
      symbolic.set(term.latex, current.add(fraction(sign)));
    }
    const pieces = [];
    if (!numeric.isZero()) pieces.push({ coeff: numeric, body: '' });
    for (const [latex, coeff] of symbolic.entries()) {
      if (!coeff.isZero()) pieces.push({ coeff, body: latex });
    }
    if (!pieces.length) return '0';
    let out = '';
    pieces.forEach((piece, index) => {
      const sign = piece.coeff.sign();
      const body = hodgeTermBodyLatex(piece.body, piece.coeff.abs());
      if (index === 0) out += sign < 0 ? `-${body}` : body;
      else out += sign < 0 ? ` - ${body}` : ` + ${body}`;
    });
    return out;
  }

  function hodgeTermBodyLatex(body, coeff) {
    if (!body) return coeff.toLatexAbs();
    if (coeff.isOne()) return body;
    return `${coeff.toLatexAbs()}\\,${body}`;
  }

  function parseSimpleLatexNumber(latex) {
    const text = String(latex || '').trim();
    if (!text || text === '0') return Fraction.zero();
    const integer = text.match(/^-?\d+$/);
    if (integer) return fraction(BigInt(integer[0]));
    const fracMatch = text.match(/^-?\\frac\{(\d+)\}\{(\d+)\}$/);
    if (fracMatch) {
      const sign = text.startsWith('-') ? -1n : 1n;
      return fraction(sign * BigInt(fracMatch[1]), BigInt(fracMatch[2]));
    }
    return null;
  }

  function renderCanvas(result) {
    const canvas = refs.canvas;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const cssWidth = Math.max(320, Math.floor(wrap.clientWidth || 760));
    const cssHeight = cssWidth < 620 ? 330 : 280;
    const ratio = window.devicePixelRatio || 1;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);
    state.canvasWidth = cssWidth;
    state.canvasHeight = cssHeight;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    drawCanvasBackground(ctx, cssWidth, cssHeight);
    if (!state.varieties.length && !state.sheaves.length) {
      renderCanvasMessage(cssWidth, cssHeight, '\\text{Add a variety or sheaf}');
      return;
    }
    ensureCanvasLabelPositions(cssWidth, cssHeight);
    drawSheafBaseLines(ctx, cssWidth, cssHeight);
    drawMapArrows(ctx, cssWidth, cssHeight);
    renderCanvasLabels(cssWidth, cssHeight);
  }

  function redrawCanvasSurface() {
    const canvas = refs.canvas;
    if (!canvas || !state.canvasWidth || !state.canvasHeight) return;
    const ratio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    drawCanvasBackground(ctx, state.canvasWidth, state.canvasHeight);
    if (!state.varieties.length && !state.sheaves.length) return;
    ensureCanvasLabelPositions(state.canvasWidth, state.canvasHeight);
    drawSheafBaseLines(ctx, state.canvasWidth, state.canvasHeight);
    drawMapArrows(ctx, state.canvasWidth, state.canvasHeight);
  }

  function renderCanvasMessage(width, height, latex) {
    if (!refs.canvasLabels) return;
    refs.canvasLabels.innerHTML = `<div class="sheaf-canvas-label" style="left:${width / 2}px;top:${height / 2}px;color:var(--accent2);">\\(${latex}\\)</div>`;
    typeset(refs.canvasLabels);
  }

  function renderCanvasLabels(width, height) {
    if (!refs.canvasLabels) return;
    const labels = canvasOverviewLabels(width, height);
    refs.canvasLabels.innerHTML = labels.map((label) => `
      <div class="${label.className || 'sheaf-canvas-label'}" style="left:${label.x}px;top:${label.y}px;max-width:${label.maxWidth}px;" ${label.objectKind ? `data-object-kind="${label.objectKind}" data-object-id="${escapeHtml(label.objectId)}" role="button" tabindex="0" aria-label="${escapeHtml(label.ariaLabel || label.main)}"` : ''}>
        <span>\\(${label.main}\\)</span>
      </div>
    `).join('');
    typeset(refs.canvasLabels);
  }

  function canvasOverviewLabels(width, height) {
    const compact = width < 620;
    const layout = canvasOverviewLayout(width, height, compact);
    const labels = [];
    const showSelection = inputIsModifyMode();
    state.varieties.forEach((variety, index) => {
      const rect = layout.varietyNodes[index] || layout.varietyPanel;
      const pos = canvasLabelPosition(variety, 'variety', rect, width, height, index, state.varieties.length);
      const name = sanitizeMathLabel(variety.name, 'X');
      const classes = ['sheaf-canvas-label', 'is-variety'];
      if (showSelection && !state.activeSheafId && !state.activeMapId && variety.id === state.activeVarietyId) classes.push('is-active');
      const activeEndpointRole = activeMapEndpointRole('variety', variety.id);
      if (activeEndpointRole === 'domain') classes.push('is-map-domain');
      else if (activeEndpointRole === 'codomain') classes.push('is-map-codomain');
      if (state.basePickActive) classes.push('is-pick-candidate');
      if (currentInputKind() === 'map' && inputIsCreateMode() && !state.mapDraft) classes.push('is-pick-candidate');
      else if (state.mapDraft?.domainKind === 'variety' && state.mapDraft.domainId === variety.id) classes.push('is-map-domain');
      else if (allowableMapCodomain('variety', variety.id)) classes.push('is-map-codomain-candidate');
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `variety ${latexToPlain(name)}`,
        className: classes.join(' '),
        objectKind: 'variety',
        objectId: variety.id
      });
    });
    state.sheaves.forEach((sheaf, index) => {
      const rect = layout.sheafNodes[index] || layout.sheafPanel;
      const pos = canvasLabelPosition(sheaf, 'sheaf', rect, width, height, index, state.sheaves.length);
      const name = sanitizeMathLabel(sheaf.name, '\\mathcal{E}');
      const classes = ['sheaf-canvas-label', 'is-sheaf'];
      if (showSelection && sheaf.id === state.activeSheafId) classes.push('is-active');
      const activeEndpointRole = activeMapEndpointRole('sheaf', sheaf.id);
      if (activeEndpointRole === 'domain') classes.push('is-map-domain');
      else if (activeEndpointRole === 'codomain') classes.push('is-map-codomain');
      if (currentInputKind() === 'map' && inputIsCreateMode() && !state.mapDraft) classes.push('is-pick-candidate');
      else if (state.mapDraft?.domainKind === 'sheaf' && state.mapDraft.domainId === sheaf.id) classes.push('is-map-domain');
      else if (allowableMapCodomain('sheaf', sheaf.id)) classes.push('is-map-codomain-candidate');
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `sheaf ${latexToPlain(name)}`,
        className: classes.join(' '),
        objectKind: 'sheaf',
        objectId: sheaf.id
      });
    });
    state.maps.forEach((map) => {
      const endpoints = mapEndpointLabels(map, labels);
      if (!endpoints) return;
      const pos = mapLabelPosition(map, endpoints, width, height);
      const name = sanitizeMathLabel(map.name, 'f');
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: 96,
        main: name,
        ariaLabel: `map ${latexToPlain(name)}`,
        className: `${showSelection && map.id === state.activeMapId ? 'sheaf-canvas-label is-active is-map' : 'sheaf-canvas-label is-map'}`,
        objectKind: 'map',
        objectId: map.id
      });
    });
    return labels;
  }

  function activeMapEndpointRole(kind, id) {
    if (!inputIsModifyMode() || !state.activeMapId) return null;
    const map = selectedMap();
    if (!map) return null;
    if (map.domainKind === kind && map.domainId === id) return 'domain';
    if (map.codomainKind === kind && map.codomainId === id) return 'codomain';
    return null;
  }

  function drawCanvasBackground(ctx, width, height) {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);
  }

  function drawSheafBaseLines(ctx, width, height) {
    const labels = canvasOverviewLabels(width, height);
    const labelMap = new Map();
    labels.forEach((label) => {
      if (!label.objectKind || !label.objectId) return;
      labelMap.set(`${label.objectKind}:${label.objectId}`, label);
    });
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 58, 42, 0.65)';
    ctx.lineWidth = 1.6;
    labels.forEach((label) => {
      if (label.objectKind !== 'sheaf') return;
      const sheaf = state.sheaves.find((item) => item.id === label.objectId);
      if (!sheaf?.baseVarietyId) return;
      const base = labelMap.get(`variety:${sheaf.baseVarietyId}`);
      if (!base) return;
      ctx.beginPath();
      ctx.moveTo(label.x, label.y);
      ctx.lineTo(base.x, base.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawMapArrows(ctx, width, height) {
    const labels = canvasOverviewLabels(width, height).filter((label) => label.objectKind !== 'map');
    const labelMap = canvasLabelMap(labels);
    ctx.save();
    state.maps.forEach((map) => {
      const from = labelMap.get(`${map.domainKind}:${map.domainId}`);
      const to = labelMap.get(`${map.codomainKind}:${map.codomainId}`);
      if (!from || !to) return;
      drawArrowBetweenLabels(ctx, from, to, map.id === state.activeMapId ? '#8b3a2a' : 'rgba(139,58,42,0.72)');
    });
    if (state.mapDrag) {
      const from = labelMap.get(`${state.mapDrag.domainKind}:${state.mapDrag.domainId}`);
      if (from) drawArrowFromLabel(ctx, from, state.mapDrag.x, state.mapDrag.y, 'rgba(139,58,42,0.42)');
    }
    ctx.restore();
  }

  function drawArrowBetweenLabels(ctx, from, to, color) {
    const endpoints = clippedArrowEndpoints(from, to);
    if (!endpoints) return;
    drawArrow(ctx, endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2, color);
  }

  function drawArrowFromLabel(ctx, from, x2, y2, color) {
    const start = labelEdgePoint(from, x2, y2, 6);
    if (!start || Math.hypot(x2 - start.x, y2 - start.y) < 12) return;
    drawArrow(ctx, start.x, start.y, x2, y2, color);
  }

  function clippedArrowEndpoints(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 18) return null;
    const ux = dx / length;
    const uy = dy / length;
    let startOffset = labelExitOffset(from, ux, uy) + 6;
    let endOffset = labelExitOffset(to, -ux, -uy) + 9;
    const maxOffset = length - 12;
    if (startOffset + endOffset > maxOffset) {
      const scale = maxOffset / (startOffset + endOffset);
      startOffset *= scale;
      endOffset *= scale;
    }
    return {
      x1: from.x + ux * startOffset,
      y1: from.y + uy * startOffset,
      x2: to.x - ux * endOffset,
      y2: to.y - uy * endOffset
    };
  }

  function labelEdgePoint(label, x, y, extra = 6) {
    const dx = x - label.x;
    const dy = y - label.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return null;
    const ux = dx / length;
    const uy = dy / length;
    const offset = Math.min(length - 1, labelExitOffset(label, ux, uy) + extra);
    return {
      x: label.x + ux * offset,
      y: label.y + uy * offset
    };
  }

  function labelExitOffset(label, ux, uy) {
    const bounds = estimatedLabelBounds(label);
    const xOffset = Math.abs(ux) < 0.001 ? Infinity : bounds.halfWidth / Math.abs(ux);
    const yOffset = Math.abs(uy) < 0.001 ? Infinity : bounds.halfHeight / Math.abs(uy);
    return Math.min(xOffset, yOffset);
  }

  function estimatedLabelBounds(label) {
    const plain = latexToPlain(label.main || '');
    const lines = Math.max(1, Math.ceil(plain.length / 22));
    const maxWidth = label.maxWidth || 260;
    const width = Math.min(maxWidth, Math.max(label.objectKind === 'map' ? 30 : 42, plain.length * 8 + 24));
    const height = label.objectKind === 'map' ? 24 : Math.max(26, lines * 22 + 6);
    return {
      halfWidth: width / 2,
      halfHeight: height / 2
    };
  }

  function canvasLabelMap(labels = canvasOverviewLabels(state.canvasWidth || 760, state.canvasHeight || 280)) {
    const labelMap = new Map();
    labels.forEach((label) => {
      if (!label.objectKind || !label.objectId) return;
      labelMap.set(`${label.objectKind}:${label.objectId}`, label);
    });
    return labelMap;
  }

  function mapEndpointLabels(map, labels) {
    const labelMap = canvasLabelMap(labels);
    const from = labelMap.get(`${map.domainKind}:${map.domainId}`);
    const to = labelMap.get(`${map.codomainKind}:${map.codomainId}`);
    return from && to ? { from, to } : null;
  }

  function mapLabelPosition(map, endpoints, width, height) {
    if (Number.isFinite(map.labelX) && Number.isFinite(map.labelY)) {
      return {
        x: clamp(map.labelX * width, 24, width - 24),
        y: clamp(map.labelY * height, 24, height - 24)
      };
    }
    return {
      x: (endpoints.from.x + endpoints.to.x) / 2,
      y: (endpoints.from.y + endpoints.to.y) / 2
    };
  }

  function drawWideOverview(ctx, width, height, result) {
    drawInputOverview(ctx, canvasOverviewLayout(width, height, false), result);
  }

  function drawCompactOverview(ctx, width, height, result) {
    drawInputOverview(ctx, canvasOverviewLayout(width, height, true), result);
  }

  function canvasOverviewLayout(width, height, compact) {
    if (compact) {
      const margin = 28;
      const panelW = Math.max(120, width - margin * 2);
      const varietyPanel = { x: margin, y: 28, w: panelW, h: 120 };
      const sheafPanel = { x: margin, y: 176, w: panelW, h: 120 };
      return {
        varietyPanel,
        sheafPanel,
        varietyNodes: objectNodeRects(state.varieties.length, varietyPanel),
        sheafNodes: objectNodeRects(state.sheaves.length, sheafPanel),
        hodge: { x: margin, y: 232, w: (panelW - 12) / 2, h: 70 },
        classes: { x: margin + (panelW + 12) / 2, y: 232, w: (panelW - 12) / 2, h: 70 }
      };
    }
    const margin = 36;
    const colW = Math.max(120, (width - margin * 2) / 2);
    const varietyPanel = { x: margin, y: 36, w: colW, h: height - 72 };
    const sheafPanel = { x: width - margin - colW, y: 36, w: colW, h: height - 72 };
    return {
      varietyPanel,
      sheafPanel,
      varietyNodes: objectNodeRects(state.varieties.length, varietyPanel),
      sheafNodes: objectNodeRects(state.sheaves.length, sheafPanel),
      hodge: { x: 0, y: 0, w: 0, h: 0 },
      classes: { x: 0, y: 0, w: 0, h: 0 }
    };
  }

  function objectNodeRects(count, panel) {
    const safeCount = Math.max(1, count);
    const gap = Math.max(18, Math.min(34, panel.h / (safeCount + 2)));
    const nodeH = Math.max(26, Math.min(40, (panel.h - gap * (safeCount + 1)) / safeCount));
    return Array.from({ length: count }, (_, index) => ({
      x: panel.x,
      y: panel.y + gap + index * (nodeH + gap),
      w: panel.w,
      h: nodeH
    }));
  }

  function drawInputOverview(ctx, layout) {
    drawObjectPanel(ctx, layout.varietyPanel, layout.varietyNodes, state.varieties, state.activeVarietyId, '#3d6b4f', '#f7f4ef');
    drawObjectPanel(ctx, layout.sheafPanel, layout.sheafNodes, state.sheaves, state.activeSheafId, '#3d6b4f', '#ffffff');
    drawClassNode(ctx, layout.hodge.x, layout.hodge.y, layout.hodge.w, layout.hodge.h, 0);
    drawClassNode(ctx, layout.classes.x, layout.classes.y, layout.classes.w, layout.classes.h, 0);
    const activeVarietyRect = layout.varietyNodes[state.varieties.findIndex((item) => item.id === state.activeVarietyId)];
    const activeSheafRect = layout.sheafNodes[state.sheaves.findIndex((item) => item.id === state.activeSheafId)];
    if (activeVarietyRect) drawArrow(ctx, activeVarietyRect.x + activeVarietyRect.w, activeVarietyRect.y + activeVarietyRect.h / 2, layout.hodge.x, layout.hodge.y + layout.hodge.h / 2, '#3d6b4f');
    if (activeSheafRect) drawArrow(ctx, activeSheafRect.x + activeSheafRect.w, activeSheafRect.y + activeSheafRect.h / 2, layout.classes.x, layout.classes.y + layout.classes.h / 2, '#8b3a2a');
  }

  function drawObjectPanel(ctx, panel, nodes, items, activeId, color, fill) {
    roundedRect(ctx, panel.x, panel.y, panel.w, panel.h, 8, '#fffdf8', '#d8d0c4');
    nodes.forEach((node, index) => {
      const active = items[index]?.id === activeId;
      roundedRect(ctx, node.x, node.y, node.w, node.h, 6, active ? fill : 'rgba(255,255,255,0.58)', active ? color : '#d8d0c4');
    });
  }

  function sanitizeDimensionText(value) {
    return String(normalizedInt(value, 0, MAX_DIMENSION, 3));
  }

  function drawAmbient(ctx, x, y, w, h, geometry) {
    roundedRect(ctx, x, y, w, h, 8, '#f7f4ef', '#d8d0c4');
    ctx.save();
    ctx.strokeStyle = '#3d6b4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + 8, Math.max(40, w * 0.34), Math.max(22, h * 0.2), -0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSheafNode(ctx, x, y, w, h, bundle) {
    roundedRect(ctx, x, y, w, h, 8, '#ffffff', '#3d6b4f');
  }

  function drawClassNode(ctx, x, y, w, h, dim) {
    roundedRect(ctx, x, y, w, h, 8, '#fff7f3', '#8b3a2a');
  }

  function canvasLabelPosition(object, kind, fallbackRect, width, height) {
    if (Number.isFinite(object.labelX) && Number.isFinite(object.labelY)) {
      return {
        x: clamp(object.labelX * width, 24, width - 24),
        y: clamp(object.labelY * height, 24, height - 24)
      };
    }
    return {
      x: clamp(fallbackRect.x + fallbackRect.w / 2, 24, width - 24),
      y: clamp(fallbackRect.y + fallbackRect.h / 2, 24, height - 24)
    };
  }

  function ensureCanvasLabelPositions(width, height) {
    const compact = width < 620;
    const layout = canvasOverviewLayout(width, height, compact);
    state.varieties.forEach((variety, index) => {
      if (Number.isFinite(variety.labelX) && Number.isFinite(variety.labelY)) return;
      const rect = layout.varietyNodes[index] || layout.varietyPanel;
      setCanvasLabelPosition(variety, rect.x + rect.w / 2, rect.y + rect.h / 2, width, height);
    });
    state.sheaves.forEach((sheaf, index) => {
      if (Number.isFinite(sheaf.labelX) && Number.isFinite(sheaf.labelY)) return;
      const rect = layout.sheafNodes[index] || layout.sheafPanel;
      setCanvasLabelPosition(sheaf, rect.x + rect.w / 2, rect.y + rect.h / 2, width, height);
    });
    state.maps.forEach((map) => {
      if (Number.isFinite(map.labelX) && Number.isFinite(map.labelY)) return;
      positionMapLabel(map, width, height);
    });
  }

  function setCanvasLabelPosition(object, x, y, width, height) {
    object.labelX = clamp(width ? x / width : 0.5, 0.04, 0.96);
    object.labelY = clamp(height ? y / height : 0.5, 0.07, 0.93);
  }

  function positionMapLabel(map, width = state.canvasWidth || 760, height = state.canvasHeight || 280) {
    const labels = canvasOverviewLabels(width, height).filter((label) => label.objectKind !== 'map');
    const endpoints = mapEndpointLabels(map, labels);
    if (!endpoints) {
      map.labelX = 0.5;
      map.labelY = 0.5;
      return;
    }
    setCanvasLabelPosition(map, (endpoints.from.x + endpoints.to.x) / 2, (endpoints.from.y + endpoints.to.y) / 2, width, height);
  }

  function startCanvasLabelDrag(target, event) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    const item = objectByKind(kind, id);
    if (!item || !refs.canvas) return;
    event.preventDefault();
    target.classList.add('is-dragging');
    const canvasRect = refs.canvas.getBoundingClientRect();
    const labelRect = target.getBoundingClientRect();
    state.labelDrag = {
      item,
      kind,
      id,
      target,
      canvasRect,
      offsetX: event.clientX - labelRect.left,
      offsetY: event.clientY - labelRect.top,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false
    };
    try { target.setPointerCapture?.(event.pointerId); } catch (_) {}
    document.addEventListener('pointermove', updateCanvasLabelDrag);
    document.addEventListener('pointerup', finishCanvasLabelDrag);
    document.addEventListener('pointercancel', finishCanvasLabelDrag);
  }

  function updateCanvasLabelDrag(event) {
    const drag = state.labelDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const width = drag.canvasRect.width || 1;
    const height = drag.canvasRect.height || 1;
    const x = event.clientX - drag.canvasRect.left - drag.offsetX + drag.target.offsetWidth / 2;
    const y = event.clientY - drag.canvasRect.top - drag.offsetY + drag.target.offsetHeight / 2;
    const clampedX = clamp(x, 24, width - 24);
    const clampedY = clamp(y, 24, height - 24);
    setCanvasLabelPosition(drag.item, clampedX, clampedY, width, height);
    drag.target.style.left = `${clampedX}px`;
    drag.target.style.top = `${clampedY}px`;
    if (Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2) {
      drag.moved = true;
      redrawCanvasSurface();
    }
  }

  function finishCanvasLabelDrag(event) {
    const drag = state.labelDrag;
    document.removeEventListener('pointermove', updateCanvasLabelDrag);
    document.removeEventListener('pointerup', finishCanvasLabelDrag);
    document.removeEventListener('pointercancel', finishCanvasLabelDrag);
    if (!drag) return;
    drag.target.classList.remove('is-dragging');
    try { drag.target.releasePointerCapture?.(drag.pointerId); } catch (_) {}
    const moved = drag.moved;
    const outside = event && pointOutsideRect(event.clientX, event.clientY, drag.canvasRect);
    state.labelDrag = null;
    if (moved && outside) {
      state.suppressLabelClickUntil = Date.now() + 180;
      removeCanvasObject(drag.kind, drag.id);
      return;
    }
    if (moved) {
      state.suppressLabelClickUntil = Date.now() + 180;
      recompute();
    }
  }

  function objectByKind(kind, id) {
    if (kind === 'sheaf') return state.sheaves.find((entry) => entry.id === id);
    if (kind === 'map') return state.maps.find((entry) => entry.id === id);
    return state.varieties.find((entry) => entry.id === id);
  }

  function pointOutsideRect(x, y, rect) {
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(angle - 0.45), y2 - 10 * Math.sin(angle - 0.45));
    ctx.lineTo(x2 - 10 * Math.cos(angle + 0.45), y2 - 10 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  function refreshExport(scope = state.exportScope || 'main') {
    if (!refs.exportOut) return;
    state.exportScope = scope || 'main';
    if (!state.lastResult) {
      refs.exportOut.value = '';
      return;
    }
    const format = refs.exportFormat.value;
    refs.exportOut.value = exportResult(state.lastResult, format, state.exportScope);
  }

  function openChartExport(scope) {
    refreshExport(scope);
    if (refs.exportCard) refs.exportCard.classList.remove('collapsed');
    refs.status.textContent = scope === 'hodge' ? 'hodge numbers export ready' : 'characteristic classes export ready';
  }

  function exportResult(result, format, scope = 'main') {
    if (scope === 'classes') {
      if (!result.classRows.length) return 'No characteristic classes available. Select a sheaf.';
      return exportClassChart(result, format);
    }
    if (scope === 'hodge') {
      if (!result.hodge || !result.geometry) return 'No Hodge numbers available. Add and select a variety.';
      return exportHodgeChart(result, format);
    }
    return exportMainCanvas(result, format);
  }

  function exportMainCanvas(result, format) {
    const lines = [];
    const basisPlain = basisLabel(result.sheaf?.basis);
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: main canvas');
      state.varieties.forEach((variety, index) => {
        const marker = variety.id === state.activeVarietyId ? '\\quad\\text{active for }h^{p,q}' : '';
        lines.push(`\\[X_{${index + 1}}:\\ ${exportVarietyLatex(variety)}${marker}\\]`);
      });
      state.sheaves.forEach((sheaf, index) => {
        const marker = sheaf.id === state.activeSheafId ? '\\quad\\text{active for }A^*' : '';
        lines.push(`\\[E_{${index + 1}}:\\ ${exportSheafLatex(sheaf)}${marker}\\]`);
      });
      state.maps.forEach((map, index) => {
        const marker = map.id === state.activeMapId ? '\\quad\\text{active map}' : '';
        lines.push(`\\[f_{${index + 1}}:\\ ${exportMapLatex(map)}${marker}\\]`);
      });
      if (result.sheaf) lines.push(`% basis: ${basisPlain}`);
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: main canvas');
      state.varieties.forEach((variety, index) => {
        const marker = variety.id === state.activeVarietyId ? ' active for hodge numbers' : '';
        lines.push(`# X_${index + 1}: ${exportVarietyPlain(variety)}${marker}`);
      });
      state.sheaves.forEach((sheaf, index) => {
        const marker = sheaf.id === state.activeSheafId ? ' active for characteristic classes' : '';
        lines.push(`# E_${index + 1}: ${exportSheafPlain(sheaf)}${marker}`);
      });
      state.maps.forEach((map, index) => {
        const marker = map.id === state.activeMapId ? ' active map' : '';
        lines.push(`# f_${index + 1}: ${exportMapPlain(map)}${marker}`);
      });
      if (result.sheaf) lines.push(`# basis: ${basisPlain}`);
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: main canvas');
    state.varieties.forEach((variety, index) => {
      const marker = variety.id === state.activeVarietyId ? ' active for Hodge numbers' : '';
      lines.push(`X_${index + 1}: ${exportVarietyPlain(variety)}${marker}`);
    });
    state.sheaves.forEach((sheaf, index) => {
      const marker = sheaf.id === state.activeSheafId ? ' active for characteristic classes' : '';
      lines.push(`E_${index + 1}: ${exportSheafPlain(sheaf)}${marker}`);
    });
    state.maps.forEach((map, index) => {
      const marker = map.id === state.activeMapId ? ' active map' : '';
      lines.push(`f_${index + 1}: ${exportMapPlain(map)}${marker}`);
    });
    if (result.sheaf) lines.push(`basis: ${basisPlain}`);
    return lines.join('\n');
  }

  function exportVarietyLatex(variety) {
    const geometry = geometryFromVariety(variety);
    const parts = [
      `${sanitizeMathLabel(variety.name, 'X')}`,
      `\\operatorname{type}=\\text{${varietyTypeLabel(variety.type)}}`,
      `\\dim=${geometry.dim}`
    ];
    if (geometry.type === 'curve') parts.push(`g=${genusLatex(geometry.genus)}`);
    if (geometry.type === 'projective') parts.push(`\\text{ambient}=\\mathbb{P}^{${geometry.ambient}}`);
    if (geometry.type === 'complete-intersection') {
      parts.push(`\\text{ambient}=\\mathbb{P}^{${geometry.ambient}}`);
      parts.push(`\\text{degrees}=(${geometry.degrees.join(',') || '0'})`);
    }
    return parts.join(',\\ ');
  }

  function exportSheafLatex(sheaf) {
    const base = baseVarietyForSheaf(sheaf);
    const parts = [
      `${sanitizeMathLabel(sheaf.name, '\\mathcal{E}')}`,
      `\\operatorname{type}=\\text{${sheafTypeLabel(sheaf.type)}}`,
      `\\operatorname{rk}=${symbolToLatex(sanitizeRankInput(sheaf.rank))}`
    ];
    if (base) parts.push(`\\text{base}=${sanitizeMathLabel(base.name, 'X')}`);
    if (sheaf.type === 'twist') parts.push(`r=${normalizedInt(sheaf.twist, -24, 24, 1)}`);
    parts.push(`\\text{basis}=\\text{${basisLabel(sheaf.basis)}}`);
    return parts.join(',\\ ');
  }

  function exportMapLatex(map) {
    return `${sanitizeMathLabel(map.name, 'f')}: ${objectLatexLabel(map.domainKind, map.domainId)}\\to ${objectLatexLabel(map.codomainKind, map.codomainId)}`;
  }

  function exportVarietyPlain(variety) {
    const geometry = geometryFromVariety(variety);
    const parts = [
      `name ${latexToPlain(variety.name)}`,
      `type ${varietyTypeLabel(variety.type)}`,
      `dim ${geometry.dim}`
    ];
    if (geometry.type === 'curve') parts.push(`genus ${genusPlain(geometry.genus)}`);
    if (geometry.type === 'projective') parts.push(`ambient P^${geometry.ambient}`);
    if (geometry.type === 'complete-intersection') {
      parts.push(`ambient P^${geometry.ambient}`);
      parts.push(`degrees ${geometry.degrees.join(',') || 'none'}`);
    }
    return parts.join('; ');
  }

  function exportSheafPlain(sheaf) {
    const base = baseVarietyForSheaf(sheaf);
    const parts = [
      `name ${latexToPlain(sheaf.name)}`,
      `type ${sheafTypeLabel(sheaf.type)}`,
      `rank ${sanitizeRankInput(sheaf.rank)}`
    ];
    if (base) parts.push(`base ${latexToPlain(base.name)}`);
    if (sheaf.type === 'twist') parts.push(`twist ${normalizedInt(sheaf.twist, -24, 24, 1)}`);
    parts.push(`basis ${basisLabel(sheaf.basis)}`);
    return parts.join('; ');
  }

  function exportMapPlain(map) {
    return `${latexToPlain(map.name)}: ${objectPlainLabel(map.domainKind, map.domainId)} -> ${objectPlainLabel(map.codomainKind, map.codomainId)}`;
  }

  function objectLatexLabel(kind, id) {
    if (kind === 'variety') return sanitizeMathLabel(state.varieties.find((item) => item.id === id)?.name, 'X');
    if (kind === 'sheaf') return sanitizeMathLabel(state.sheaves.find((item) => item.id === id)?.name, '\\mathcal{E}');
    return sanitizeMathLabel(state.maps.find((item) => item.id === id)?.name, 'f');
  }

  function varietyTypeLabel(type) {
    if (type === 'projective') return 'projective space';
    if (type === 'complete-intersection') return 'complete intersection';
    if (type === 'curve') return 'curve';
    return 'abstract variety';
  }

  function sheafTypeLabel(type) {
    if (type === 'locally-free') return 'locally free';
    if (type === 'tangent') return 'tangent sheaf';
    if (type === 'cotangent') return 'cotangent sheaf';
    if (type === 'canonical') return 'canonical sheaf';
    if (type === 'twist') return 'twist';
    return 'abstract sheaf';
  }

  function exportClassChart(result, format) {
    const lines = [];
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: characteristic classes');
      lines.push(`% X: ${result.geometry.labelPlain}`);
      lines.push(`% E: ${result.bundle.labelPlain}`);
      lines.push(`% display: ${classDisplayDescription(result)}`);
      lines.push(...exportHomologyNotes(result.geometry, format));
      result.classRows.forEach((row) => lines.push(`\\[${row.labelLatex} = ${row.latex}\\]`));
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: characteristic classes');
      lines.push(`# X: ${result.geometry.labelPlain}`);
      lines.push(`# E: ${result.bundle.labelPlain}`);
      lines.push(`# display: ${classDisplayDescription(result)}`);
      lines.push(...exportHomologyNotes(result.geometry, format));
      result.classRows.forEach((row) => lines.push(`${row.key} = ${row.plain}`));
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: characteristic classes');
    lines.push(`X: ${result.geometry.labelPlain}`);
    lines.push(`E: ${result.bundle.labelPlain}`);
    lines.push(`display: ${classDisplayDescription(result)}`);
    lines.push(...exportHomologyNotes(result.geometry, format));
    result.classRows.forEach((row) => lines.push(`${row.label} = ${row.plain}`));
    return lines.join('\n');
  }

  function exportHomologyNotes(geometry, format) {
    const defs = homologyClassDefinitions(geometry);
    if (!defs.length) return [];
    const rules = (geometry.homology?.rules || []).filter((rule) => (
      rule.enabled !== false
      && homologyRulePreservesDegree(rule, defs)
    ));
    if (format === 'latex') {
      return [
        ...defs.map((def) => `% ${def.symbolLatex} in H^{${2 * def.degree}}(${geometry.labelPlain}): ${def.kind}`),
        ...rules.map((rule) => `% rule: ${homologyRulePlain(rule, geometry)}`)
      ];
    }
    const prefix = format === 'sage' ? '# ' : '';
    return [
      ...defs.map((def) => `${prefix}${def.symbolPlain} in H^${2 * def.degree}(${geometry.labelPlain}): ${def.kind}`),
      ...rules.map((rule) => `${prefix}rule: ${homologyRulePlain(rule, geometry)}`)
    ];
  }

  function classDisplayDescription(result) {
    const expression = result.classRows.some((row) => row.key.startsWith('root_')) ? 'Chern roots' : 'class variables';
    const term = result.classDisplay?.termMode === 'term' ? `i=${result.classDisplay.termIndex}` : 'total';
    const form = expression === 'Chern roots' ? `, ${result.classDisplay?.rootForm === 'expanded' ? 'expanded polynomial' : 'product'}` : '';
    return `${expression}${form}, ${term}`;
  }

  function exportHodgeChart(result, format) {
    const lines = [];
    if (format === 'latex') {
      lines.push('% Sheaf Calculator: Hodge numbers');
      lines.push('% requires \\usepackage{tikz-cd}');
      lines.push(`% X: ${result.geometry.labelPlain}`);
      lines.push(exportHodgeTikzcd(result, state.hodgeExpanded));
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: Hodge numbers');
      lines.push(`# X: ${result.geometry.labelPlain}`);
      lines.push(...exportHodgeLines(result, 'plain'));
      if (state.hodgeExpanded) lines.push(...exportExpandedHodgeLines(result, 'plain'));
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: Hodge numbers');
    lines.push(`X: ${result.geometry.labelPlain}`);
    lines.push(...exportHodgeLines(result, 'plain'));
    if (state.hodgeExpanded) lines.push(...exportExpandedHodgeLines(result, 'plain'));
    return lines.join('\n');
  }

  function exportHodgeTikzcd(result, expanded) {
    const d = result.geometry.dim;
    const entries = result.hodge.entries;
    const layout = hodgeExportLayout(d, expanded);
    const rows = Array.from({ length: layout.totalRows }, () => (
      Array.from({ length: layout.totalCols }, () => '')
    ));
    const arrows = [];
    const arrowKeys = new Set();
    const setCell = (row, col, value) => {
      rows[row - 1][col - 1] = value;
    };
    const addArrow = (from, to) => {
      const key = `${from.row}-${from.col}:${to.row}-${to.col}`;
      if (arrowKeys.has(key)) return;
      arrowKeys.add(key);
      arrows.push(`  \\arrow[dotted, no head, shorten <=3pt, shorten >=3pt, from=${from.row}-${from.col}, to=${to.row}-${to.col}]`);
    };

    for (let p = 0; p <= d; p++) {
      for (let q = 0; q <= d; q++) {
        const pos = layout.hodgeGridPosition(p, q);
        setCell(pos.row, pos.col, entries[p][q].latex);
      }
    }

    if (expanded) {
      hodgeChiDisplays(result).forEach((chi, p) => {
        setCell(1, layout.chiGridColumn(p), chi);
        addArrow(layout.hodgeGridPosition(p, d), { row: 1, col: layout.chiGridColumn(p) });
      });
      const euler = hodgeEulerDisplay(result);
      setCell(1, layout.bettiCol, euler);
      hodgeBettiDisplays(result).forEach((betti, k) => {
        const row = 2 * d - k + 1 + layout.rowOffset;
        setCell(row, layout.bettiCol, betti);
      });
      for (let p = 0; p <= d; p++) addArrow(layout.hodgeGridPosition(p, 0), { row: 2 * d - p + 1 + layout.rowOffset, col: layout.bettiCol });
      for (let q = 0; q <= d; q++) addArrow(layout.hodgeGridPosition(d, q), { row: d - q + 1 + layout.rowOffset, col: layout.bettiCol });
    }

    const matrix = rows.map((row, index) => {
      const terminator = index === rows.length - 1 ? '' : ' \\\\';
      return `  ${row.map((cell) => (cell ? `{${cell}}` : '{}')).join(' & ')}${terminator}`;
    }).join('\n');
    const arrowBlock = arrows.length ? `\n${arrows.join('\n')}` : '';
    return [
      '\\[',
      '\\begin{tikzcd}[row sep=1.15em, column sep=1.15em, cells={nodes={inner sep=1pt}}]',
      matrix,
      arrowBlock,
      '\\end{tikzcd}',
      '\\]'
    ].filter(Boolean).join('\n');
  }

  function hodgeExportLayout(d, expanded) {
    const chiOffset = expanded && d > 0 ? -d - 1 : 0;
    const leftPaddingCols = expanded && d > 0 ? Math.max(2 * d, -chiOffset) : 0;
    const hodgeOffset = expanded ? leftPaddingCols : 0;
    const hodgeEndCol = hodgeOffset + 2 * d + 1;
    const chiEndCol = expanded ? hodgeOffset + chiOffset + 2 * d + 1 : hodgeEndCol;
    const coreCols = Math.max(hodgeEndCol, chiEndCol);
    const rowOffset = expanded ? 1 : 0;
    const bettiCol = coreCols + 2;
    return {
      rowOffset,
      bettiCol,
      totalCols: expanded ? bettiCol : coreCols,
      totalRows: 2 * d + 1 + rowOffset,
      hodgeGridPosition: (p, q) => ({
        row: 2 * d - (p + q) + 1 + rowOffset,
        col: hodgeOffset + d + p - q + 1
      }),
      chiGridColumn: (p) => hodgeOffset + chiOffset + 2 * p + 1
    };
  }

  function exportHodgeLines(result, format) {
    const d = result.geometry.dim;
    const lines = [format === 'latex' ? '% h^{p,q}, rows indexed by p' : 'h^p,q, rows indexed by p'];
    for (let p = 0; p <= d; p++) {
      const row = [];
      for (let q = 0; q <= d; q++) row.push(result.hodge.entries[p][q][format === 'latex' ? 'latex' : 'plain']);
      lines.push(format === 'latex' ? `% p=${p}: ${row.join(', ')}` : `p=${p}: ${row.join(', ')}`);
    }
    return lines;
  }

  function exportExpandedHodgeLines(result, format) {
    const lines = ['', format === 'latex' ? '% expanded invariants' : 'expanded invariants'];
    hodgeChiDisplays(result).forEach((chi, p) => {
      lines.push(format === 'latex' ? `% chi_${p}: ${chi}` : `chi_${p}: ${latexToPlain(chi)}`);
    });
    const euler = hodgeEulerDisplay(result);
    lines.push(format === 'latex' ? `% e: ${euler}` : `e: ${latexToPlain(euler)}`);
    hodgeBettiDisplays(result).forEach((betti, k) => {
      lines.push(format === 'latex' ? `% b_{${k}}: ${betti}` : `b_${k}: ${latexToPlain(betti)}`);
    });
    return lines;
  }

  function copyExport() {
    if (!refs.exportOut.value) refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { refs.status.textContent = 'export copied'; })
        .catch(fallbackCopyExport);
    } else {
      fallbackCopyExport();
    }
  }

  function fallbackCopyExport() {
    refs.exportOut.focus();
    refs.exportOut.select();
    try {
      document.execCommand('copy');
      refs.status.textContent = 'export copied';
    } catch (_) {
      refs.status.textContent = 'copy unavailable';
    }
  }

  function bindCards() {
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < state.suppressCardToggleUntil) return;
        if (event.target.closest('button,input,select,textarea,a,.drag-handle')) return;
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    const side = document.querySelector('.side');
    if (!side) return;
    let dragCard = null;
    let placeholder = null;
    let pointerId = null;
    let startY = 0;
    let ghost = null;
    let ghostOffsetY = 0;
    let dragging = false;
    const pointerOptions = { passive: false };

    side.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.card');
      if (!card || card.parentElement !== side) return;
      event.preventDefault();
      event.stopPropagation();
      dragCard = card;
      pointerId = event.pointerId;
      startY = event.clientY;
      dragging = false;
      const rect = card.getBoundingClientRect();
      ghostOffsetY = startY - rect.top;
      try { handle.setPointerCapture(pointerId); } catch (_) {}
      document.addEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.addEventListener('pointerup', finishCardDrag, pointerOptions);
      document.addEventListener('pointercancel', finishCardDrag, pointerOptions);
    }, pointerOptions);

    function handleCardDragMove(event) {
      if (!dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      if (!dragging && Math.abs(event.clientY - startY) < 6) return;
      if (!dragging) {
        const rect = dragCard.getBoundingClientRect();
        dragging = true;
        state.suppressCardToggleUntil = Date.now() + 500;
        document.body.classList.add('card-dragging');
        dragCard.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.style.cssText = `height:${rect.height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;`;
        dragCard.parentElement.insertBefore(placeholder, dragCard);
        ghost = dragCard.cloneNode(true);
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          top: `${event.clientY - ghostOffsetY}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: '0.88',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: '4px'
        });
        document.body.appendChild(ghost);
        dragCard.style.display = 'none';
      }
      if (ghost) ghost.style.top = `${event.clientY - ghostOffsetY}px`;
      const after = getCardAfterPointer(side, event.clientY, dragCard, placeholder);
      if (after) side.insertBefore(placeholder, after);
      else side.appendChild(placeholder);
    }

    function finishCardDrag(event) {
      if (!dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      document.removeEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.removeEventListener('pointerup', finishCardDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishCardDrag, pointerOptions);
      if (dragging && placeholder) side.insertBefore(dragCard, placeholder);
      if (placeholder) placeholder.remove();
      if (ghost) ghost.remove();
      dragCard.style.display = '';
      dragCard.classList.remove('dragging');
      document.body.classList.remove('card-dragging');
      dragCard = null;
      placeholder = null;
      ghost = null;
      pointerId = null;
      dragging = false;
    }
  }

  function getCardAfterPointer(container, y, dragCard, placeholder) {
    const cards = Array.from(container.children).filter((child) => child.classList.contains('card') && child !== dragCard && child !== placeholder);
    let candidate = null;
    let candidateOffset = Number.NEGATIVE_INFINITY;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const offset = y - rect.top - rect.height / 2;
      if (offset < 0 && offset > candidateOffset) {
        candidateOffset = offset;
        candidate = card;
      }
    }
    return candidate;
  }

  function typeset(element) {
    if (!window.MathJax?.typesetPromise) return;
    if (window.MathJax.typesetClear) window.MathJax.typesetClear([element]);
    state.mathJaxQueue = state.mathJaxQueue
      .then(() => window.MathJax.typesetPromise([element]))
      .catch(() => {});
  }

  function parseDegrees(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    const parts = raw.replace(/[;|]/g, ',').split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 1 && parts[0] === '0') return [];
    if (parts.length > MAX_CI_EQUATIONS) throw new Error(`Use at most ${MAX_CI_EQUATIONS} equations.`);
    const degrees = parts.map((part) => Number(part));
    if (degrees.some((degree) => !Number.isInteger(degree) || degree <= 0 || degree > 99)) {
      throw new Error('Complete-intersection degrees must be positive integers, or blank for projective space.');
    }
    return degrees;
  }

  function normalizedInt(value, min, max, fallback) {
    const number = Math.floor(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function sanitizeRankInput(value) {
    const raw = String(value || '').trim();
    if (/^-?\d+$/.test(raw)) return raw;
    if (/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(raw)) return raw;
    return 'r';
  }

  function numericRankFromPlain(value) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return null;
    return Math.min(MAX_DIMENSION, Number(raw));
  }

  function explicitRootRankFromPlain(value) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const rank = Number(raw);
    if (!Number.isInteger(rank) || rank < 0 || rank > MAX_EXPLICIT_ROOT_FACTORS) return null;
    return rank;
  }

  function rootExpansionRankFromPlain(value, d = MAX_DIMENSION) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const rank = Number(raw);
    if (!Number.isInteger(rank) || rank < 0) return null;
    const monomialBound = binomial(rank + d, d);
    if (!Number.isFinite(monomialBound) || monomialBound > MAX_ROOT_EXPANSION_MONOMIALS) return null;
    return rank;
  }

  function binomial(n, k) {
    if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let out = 1;
    for (let i = 1; i <= k; i++) {
      out *= (n - k + i) / i;
      if (out > MAX_ROOT_EXPANSION_MONOMIALS) return out;
    }
    return out;
  }

  function sanitizeMathLabel(value, fallback) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    const safeFallback = String(fallback || 'X').trim() || 'X';
    if (!raw) return safeFallback;
    if (raw.length > 48) return safeFallback;
    if (!/^[A-Za-z0-9_{}\\^()\[\]+,\-'\s*]+$/.test(raw)) return safeFallback;
    return raw;
  }

  function sanitizeHomologySymbol(value, fallback) {
    return sanitizeMathLabel(value, fallback);
  }

  function parseRuleCoefficient(value) {
    const raw = String(value || '1').trim().replace(/\s+/g, '');
    if (!raw) return Fraction.one();
    const match = raw.match(/^([+-]?\d+)(?:\/(\d+))?$/);
    if (!match) throw new Error('Rule coefficient must be an integer or fraction.');
    const den = BigInt(match[2] || '1');
    if (den === 0n) throw new Error('Rule coefficient has zero denominator.');
    return new Fraction(BigInt(match[1]), den);
  }

  function sheafLabelLatex(sheaf) {
    return sheaf.labelLatex || '\\mathcal{E}';
  }

  function sheafLabelPlain(sheaf) {
    return sheaf.labelPlain || latexToPlain(sheafLabelLatex(sheaf));
  }

  function symbolToLatex(value) {
    const raw = sanitizeRankInput(value);
    if (/^-?\d+$/.test(raw)) return raw;
    const greek = { rho: '\\rho', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma' };
    if (greek[raw]) return greek[raw];
    const match = raw.match(/^([A-Za-z]+)_([A-Za-z0-9]+)$/);
    if (match) return `${match[1]}_{${match[2]}}`;
    return raw;
  }

  function latexToPlain(latex) {
    return String(latex)
      .replace(/\\operatorname\{ch\}_\{(\d+)\}\(([^)]+)\)/g, 'ch_$1($2)')
      .replace(/\\mathcal\{([^}]+)\}/g, '$1')
      .replace(/\\mathbb\{([^}]+)\}/g, '$1')
      .replace(/\\times/g, ' x ')
      .replace(/\\oplus/g, ' + ')
      .replace(/\\otimes/g, ' tensor ')
      .replace(/\\circ/g, ' o ')
      .replace(/\\Omega/g, 'Omega')
      .replace(/\\omega/g, 'omega')
      .replace(/[{}\\]/g, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function formatFractionLatex(value) {
    value = Fraction.from(value);
    if (value.isZero()) return '0';
    const body = value.abs().toLatexAbs();
    return value.sign() < 0 ? `-${body}` : body;
  }

  function formatFractionPlain(value) {
    value = Fraction.from(value);
    if (value.isZero()) return '0';
    const body = value.abs().toPlainAbs();
    return value.sign() < 0 ? `-${body}` : body;
  }

  function fraction(num, den = 1) {
    return new Fraction(num, den);
  }

  function toBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (value instanceof Fraction) {
      if (value.den !== 1n) throw new Error('Expected integer fraction.');
      return value.num;
    }
    return BigInt(Math.trunc(Number(value)));
  }

  function bigintAbs(value) {
    return value < 0n ? -value : value;
  }

  function bigintGcd(a, b) {
    while (b !== 0n) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1n;
  }

  function bigintPow(base, exponent) {
    let out = 1n;
    for (let i = 0; i < exponent; i++) out *= base;
    return out;
  }

  const factorialCache = [1n];
  function factorialBigInt(n) {
    for (let i = factorialCache.length; i <= n; i++) factorialCache[i] = factorialCache[i - 1] * BigInt(i);
    return factorialCache[n];
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
})();
