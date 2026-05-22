(() => {
  'use strict';

  const MAX_DIMENSION = 8;
  const MAX_CI_EQUATIONS = 8;
  const MAX_AMBIENT = 16;
  const MAX_CI_DEGREE = 99;
  const MAX_CI_SLIDER_DEGREE = 12;
  const VARIETY_LETTER_NAMES = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'Q'];
  const SHEAF_LETTER_NAMES = ['\\mathcal{E}', '\\mathcal{F}', '\\mathcal{G}', '\\mathcal{H}', '\\mathcal{I}', '\\mathcal{J}', '\\mathcal{K}', '\\mathcal{L}', '\\mathcal{M}', '\\mathcal{N}'];
  const VARS = new Map();
  const refs = {};
  const hodgeACoeffCache = new Map();
  const state = {
    lastResult: null,
    varieties: [],
    sheaves: [],
    activeVarietyId: null,
    activeSheafId: null,
    inputMode: 'create',
    labelDrag: null,
    canvasWidth: 0,
    canvasHeight: 0,
    draftVarietyNameDirty: false,
    draftSheafNameDirty: false,
    nextObjectId: 1,
    hodgeExpanded: false,
    hodgeWide: false,
    hodgeCellSize: 20,
    exportScope: 'main',
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
    state.activeVarietyId = null;
    state.activeSheafId = null;
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
      basis: refs.basis.value,
      nameDirty: state.draftSheafNameDirty || name !== defaultName
    };
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

  function selectedVariety() {
    return state.varieties.find((item) => item.id === state.activeVarietyId) || null;
  }

  function selectedSheaf() {
    return state.sheaves.find((item) => item.id === state.activeSheafId) || null;
  }

  function activeObjectForModifyMode() {
    if (state.activeSheafId) return selectedSheaf();
    if (state.activeVarietyId) return selectedVariety();
    return null;
  }

  function modifyKind() {
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
    const showingSheaf = modifying ? !!state.activeSheafId : refs.addObjectKind?.value === 'sheaf';
    if (refs.addObjectKind) refs.addObjectKind.hidden = modifying;
    if (refs.inputOptions) refs.inputOptions.hidden = modifying;
    if (refs.modifyWarning) refs.modifyWarning.hidden = !modifying || hasModifyTarget;
    refs.varietyEditor.hidden = modifying ? (showingSheaf || !hasModifyTarget) : showingSheaf;
    refs.sheafEditor.hidden = modifying ? (!showingSheaf || !hasModifyTarget) : !showingSheaf;
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
    } else if (kind === 'sheaf') {
      state.activeSheafId = id;
      const sheaf = activeSheaf();
      const baseVariety = baseVarietyForSheaf(sheaf);
      if (baseVariety) state.activeVarietyId = baseVariety.id;
      if (sheaf) refs.basis.value = sheaf.basis || 'chern';
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
      refs.addObject.textContent = inputIsModifyMode() ? 'update' : 'add';
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
  }

  function loadActiveObjectIntoDraft(kind = currentInputKind()) {
    const item = activeObjectForKind(kind);
    if (!item) return;
    if (kind === 'sheaf') loadSheafIntoDraft(item);
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
    refs.basis.value = sheaf.basis || 'chern';
    state.draftSheafNameDirty = !!sheaf.nameDirty;
    syncSheafBaseOptions();
    if (refs.sheafBaseVariety && sheaf.baseVarietyId && state.varieties.some((item) => item.id === sheaf.baseVarietyId)) {
      refs.sheafBaseVariety.value = sheaf.baseVarietyId;
    }
    updateInputEditorTitles();
  }

  function activeObjectForKind(kind) {
    if (inputIsModifyMode()) return kind === 'sheaf' ? selectedSheaf() : (state.activeSheafId ? null : selectedVariety());
    return kind === 'sheaf' ? activeSheaf() : activeVariety();
  }

  function currentInputKind() {
    if (inputIsModifyMode()) return modifyKind();
    return refs.addObjectKind?.value === 'sheaf' ? 'sheaf' : 'variety';
  }

  function deleteActiveObject(kind = currentInputKind()) {
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
      if (next) {
        state.activeVarietyId = next.baseVarietyId || defaultBaseVarietyId();
        refs.basis.value = next.basis || 'chern';
      }
    } else {
      state.activeVarietyId = next?.id || null;
      state.activeSheafId = null;
      state.sheaves = state.sheaves.filter((sheaf) => sheaf.baseVarietyId !== removed?.id);
      if (!state.varieties.some((variety) => variety.id === state.activeVarietyId)) {
        state.activeVarietyId = state.varieties[0]?.id || null;
      }
      syncDefaultSheafName();
    }
    syncSheafBaseOptions(true);
    if (inputIsModifyMode()) {
      const nextActive = activeObjectForKind(kind);
      if (nextActive) loadActiveObjectIntoDraft(kind);
      else setInputMode('create', { resetDraft: true });
    }
    recompute();
  }

  function clearCanvasObjects() {
    state.varieties = [];
    state.sheaves = [];
    state.activeVarietyId = null;
    state.activeSheafId = null;
    state.labelDrag = null;
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
      refs.basis.value = active.basis || 'chern';
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
    refs.twist.addEventListener('change', () => {
      refs.twist.value = String(normalizedInt(refs.twist.value, -24, 24, 1));
      syncDefaultSheafName();
    });
    refs.basis.addEventListener('change', () => {
      const sheaf = activeSheaf();
      if (sheaf) sheaf.basis = refs.basis.value;
      recompute();
    });
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
      selectObject(target.dataset.objectKind, target.dataset.objectId);
    });
    refs.canvasLabels.addEventListener('keydown', (event) => {
      const target = event.target.closest('[data-object-kind]');
      if (!target) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
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
      startCanvasLabelDrag(target, event);
    });
    refs.hodgeChart.addEventListener('click', toggleHodgeExpanded);
    refs.hodgeChart.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleHodgeExpanded();
    });
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
    const draftingSheaf = inputIsModifyMode() ? editingSheaf : refs.addObjectKind?.value === 'sheaf';
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
    const needsBasisInput = hasVariety && hasSheaf && activeVarietyType === 'abstract'
      && (activeSheafType === 'abstract' || activeSheafType === 'locally-free' || activeSheafType === 'tangent' || activeSheafType === 'cotangent' || activeSheafType === 'canonical');
    if (!needsBasisInput) refs.basis.value = 'chern';
    refs.basisRow.hidden = !needsBasisInput;
    refs.rankRow.hidden = !draftingSheaf || (draftSheaf !== 'abstract' && draftSheaf !== 'locally-free');
    refs.sheafBaseRow.hidden = inputIsModifyMode() || !draftingSheaf || state.varieties.length <= 1;
    if (refs.addObject) {
      const canAddSheaf = !draftingSheaf || !!draftBase;
      const hasEditableObject = !inputIsModifyMode() || !!activeObjectForKind(currentInputKind());
      refs.addObject.disabled = (!canAddSheaf && draftingSheaf) || !hasEditableObject;
      refs.addObject.title = draftingSheaf && !draftBase ? 'Add a base variety first' : '';
    }
    syncInputEditorVisibility();
  }

  function geometryFromVariety(variety) {
    const type = variety?.type || 'abstract';
    if (type === 'projective') {
      const n = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const labelLatex = sanitizeMathLabel(variety.name, `\\mathbb{P}^{${n}}`);
      Object.assign(variety, { dim: String(n), name: labelLatex });
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
      const genus = sanitizeGenusInput(variety.genus);
      const labelLatex = sanitizeMathLabel(variety.name, curveDefaultName(genus));
      Object.assign(variety, { dim: '1', genus, name: labelLatex });
      return {
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
    }
    if (type === 'complete-intersection') {
      const degrees = parseDegrees(variety.ciDegrees || '');
      const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
      const ambient = derivedCompleteIntersectionAmbientFor(variety, degrees);
      const defaultLabel = degrees.length ? `X_{${degrees.join(',')}}` : `\\mathbb{P}^{${ambient}}`;
      const labelLatex = sanitizeMathLabel(variety.name, defaultLabel);
      Object.assign(variety, { dim: String(dim), ciAmbient: String(ambient), name: labelLatex });
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
    const dim = normalizedInt(variety.dim, 0, MAX_DIMENSION, 3);
    const labelLatex = sanitizeMathLabel(variety.name, 'X');
    Object.assign(variety, { dim: String(dim), name: labelLatex });
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

  function sheafFromObject(sheaf, geometry) {
    const type = sheaf?.type || 'abstract';
    const twist = normalizedInt(sheaf.twist, -24, 24, 1);
    const basis = sheaf.basis === 'character' ? 'character' : 'chern';
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
      labelPlain: latexToPlain(labelLatex)
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
    const basis = refs.basis.value === 'character' ? 'character' : 'chern';
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
    defineVariable('H', 1, 'H');
    const d = geometry.dim;
    let bundle;
    if (sheaf.type === 'locally-free') {
      bundle = buildLocallyFreeBundle(d, sheaf);
    } else if (sheaf.type === 'abstract') {
      bundle = buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain);
    } else if (geometry.type === 'abstract' || geometry.type === 'curve') {
      bundle = buildAbstractGeometrySheaf(geometry, sheaf);
    } else {
      bundle = buildEmbeddedGeometrySheaf(geometry, sheaf);
    }
    const hodge = buildHodgeNumbers(geometry);

    const result = {
      geometry,
      sheaf,
      bundle,
      hodge,
      classRows: [
        { label: `c(${bundle.labelPlain})`, labelLatex: `c(${bundle.labelLatex})`, key: 'chern', latex: formatPolyLatex(bundle.cTotal), plain: formatPolyPlain(bundle.cTotal) },
        { label: `ch(${bundle.labelPlain})`, labelLatex: `\\operatorname{ch}(${bundle.labelLatex})`, key: 'character', latex: formatRankPlusPolyLatex(bundle.rankLatex, positiveTotal(bundle.chComps, d)), plain: formatRankPlusPolyPlain(bundle.rankPlain, positiveTotal(bundle.chComps, d)) },
        { label: `td(${bundle.labelPlain})`, labelLatex: `\\operatorname{td}(${bundle.labelLatex})`, key: 'todd', latex: formatPolyLatex(bundle.todd), plain: formatPolyPlain(bundle.todd) },
        { label: `s(${bundle.labelPlain})`, labelLatex: `s(${bundle.labelLatex})`, key: 'segre', latex: formatPolyLatex(bundle.segre), plain: formatPolyPlain(bundle.segre) },
        { label: `sqrt td(${bundle.labelPlain})`, labelLatex: `\\sqrt{\\operatorname{td}(${bundle.labelLatex})}`, key: 'sqrtTodd', latex: formatPolyLatex(bundle.sqrtTodd), plain: formatPolyPlain(bundle.sqrtTodd) }
      ]
    };
    return result;
  }

  function buildAbstractGeometrySheaf(geometry, sheaf) {
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
    return buildAbstractBundle(geometry.dim, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain);
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
    const id = `pt_${geometry.labelPlain.replace(/[^A-Za-z0-9]+/g, '_') || 'C'}`;
    defineVariable(id, 1, `[p]_{${geometry.labelLatex}}`);
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

  function buildEmbeddedGeometrySheaf(geometry, sheaf) {
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
    return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain);
  }

  function buildLocallyFreeBundle(d, sheaf) {
    const numericRank = numericRankFromPlain(sheaf.rankPlain);
    if (sheaf.basis === 'character') {
      if (numericRank == null) {
        return buildAbstractBundle(d, sheaf, sheaf.labelLatex, sheaf.labelPlain, sheaf.rankLatex, sheaf.rankPlain);
      }
      const maxCharacterIndex = Math.min(d, numericRank);
      const freeChComps = zeroComponentArray(maxCharacterIndex);
      for (let i = 1; i <= maxCharacterIndex; i++) {
        const id = `ch${i}`;
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
      const id = `c${i}`;
      defineVariable(id, i, `c_{${i}}(${sheaf.labelLatex})`);
      cComps[i] = Poly.variable(id);
    }
    return buildBundleFromChern(cComps, sheaf.rankLatex, sheaf.rankPlain, sheaf.labelLatex, sheaf.labelPlain);
  }

  function buildAbstractBundle(d, sheaf, subjectLatex, subjectPlain, rankLatex, rankPlain, options = {}) {
    const chernSubjectLatex = options.chernSubjectLatex || subjectLatex;
    const characterSubjectLatex = options.characterSubjectLatex || subjectLatex;
    if (sheaf.basis === 'character') {
      const chComps = zeroComponentArray(d);
      for (let i = 1; i <= d; i++) {
        const id = `ch${i}`;
        defineVariable(id, i, `\\operatorname{ch}_{${i}}(${characterSubjectLatex})`);
        chComps[i] = Poly.variable(id);
      }
      return buildBundleFromCh(chComps, rankLatex, rankPlain, subjectLatex, subjectPlain);
    }
    const cComps = zeroComponentArray(d);
    for (let i = 1; i <= d; i++) {
      const id = `c${i}`;
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

  function renderResult(result) {
    const { geometry, bundle } = result;
    const badgeParts = [];
    if (geometry) badgeParts.push(geometry.labelLatex);
    if (bundle) badgeParts.push(bundle.labelLatex);
    setInlineMath(refs.objectBadge, badgeParts.length ? badgeParts.join(',\\ ') : '\\text{empty}');
    const basis = result.sheaf?.basis === 'character' ? 'chern character' : 'chern class';
    refs.status.textContent = `${state.varieties.length} variet${state.varieties.length === 1 ? 'y' : 'ies'} · ${state.sheaves.length} ${state.sheaves.length === 1 ? 'sheaf' : 'sheaves'}${bundle ? ` · ${basis} basis` : ''}`;
    setInlineMath(refs.ringSummary, geometry ? `A^*(${geometry.labelLatex})_{\\le ${geometry.dim}}` : '\\text{add a variety}');
    if (result.classRows.length) {
      if (refs.classActions) refs.classActions.hidden = false;
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
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `variety ${latexToPlain(name)}`,
        className: showSelection && !state.activeSheafId && variety.id === state.activeVarietyId ? 'sheaf-canvas-label is-active is-variety' : 'sheaf-canvas-label is-variety',
        objectKind: 'variety',
        objectId: variety.id
      });
    });
    state.sheaves.forEach((sheaf, index) => {
      const rect = layout.sheafNodes[index] || layout.sheafPanel;
      const pos = canvasLabelPosition(sheaf, 'sheaf', rect, width, height, index, state.sheaves.length);
      const name = sanitizeMathLabel(sheaf.name, '\\mathcal{E}');
      labels.push({
        x: pos.x,
        y: pos.y,
        maxWidth: Math.max(120, Math.min(260, width - 24)),
        main: name,
        ariaLabel: `sheaf ${latexToPlain(name)}`,
        className: showSelection && sheaf.id === state.activeSheafId ? 'sheaf-canvas-label is-active is-sheaf' : 'sheaf-canvas-label is-sheaf',
        objectKind: 'sheaf',
        objectId: sheaf.id
      });
    });
    return labels;
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
  }

  function setCanvasLabelPosition(object, x, y, width, height) {
    object.labelX = clamp(width ? x / width : 0.5, 0.04, 0.96);
    object.labelY = clamp(height ? y / height : 0.5, 0.07, 0.93);
  }

  function startCanvasLabelDrag(target, event) {
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    const item = kind === 'sheaf'
      ? state.sheaves.find((entry) => entry.id === id)
      : state.varieties.find((entry) => entry.id === id);
    if (!item || !refs.canvas) return;
    event.preventDefault();
    target.classList.add('is-dragging');
    const canvasRect = refs.canvas.getBoundingClientRect();
    const labelRect = target.getBoundingClientRect();
    state.labelDrag = {
      item,
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
    state.labelDrag = null;
    if (moved) {
      state.suppressLabelClickUntil = Date.now() + 180;
      recompute();
    }
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
    const basisPlain = result.sheaf?.basis === 'character' ? 'Chern character' : 'Chern classes';
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
    parts.push(`\\text{basis}=\\text{${sheaf.basis === 'character' ? 'Chern character' : 'Chern classes'}}`);
    return parts.join(',\\ ');
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
    parts.push(`basis ${sheaf.basis === 'character' ? 'Chern character' : 'Chern classes'}`);
    return parts.join('; ');
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
      result.classRows.forEach((row) => lines.push(`\\[${row.labelLatex} = ${row.latex}\\]`));
      return lines.join('\n');
    }
    if (format === 'sage') {
      lines.push('# Sheaf Calculator: characteristic classes');
      lines.push(`# X: ${result.geometry.labelPlain}`);
      lines.push(`# E: ${result.bundle.labelPlain}`);
      result.classRows.forEach((row) => lines.push(`${row.key} = ${row.plain}`));
      return lines.join('\n');
    }
    lines.push('Sheaf Calculator: characteristic classes');
    lines.push(`X: ${result.geometry.labelPlain}`);
    lines.push(`E: ${result.bundle.labelPlain}`);
    result.classRows.forEach((row) => lines.push(`${row.label} = ${row.plain}`));
    return lines.join('\n');
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

  function sanitizeMathLabel(value, fallback) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    const safeFallback = String(fallback || 'X').trim() || 'X';
    if (!raw) return safeFallback;
    if (raw.length > 48) return safeFallback;
    if (!/^[A-Za-z0-9_{}\\^()+,\-'\s]+$/.test(raw)) return safeFallback;
    return raw;
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
