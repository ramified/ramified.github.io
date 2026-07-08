(() => {
  'use strict';

  const CATEGORY_LABELS = [
    '\\mathcal{C}',
    '\\mathcal{D}',
    '\\mathcal{E}',
    '\\mathcal{A}',
    '\\mathcal{B}',
    '\\mathcal{M}',
    '\\mathcal{N}',
    '\\mathcal{S}'
  ];
  const FUNCTOR_LABELS = ['F', 'G', 'H', 'K', 'L', 'T', 'S'];
  const DEFAULT_MORPHISM_TEMPLATE = '\\operatorname{Mor}_{{category}}({source},{target})';
  const EXPORT_KIND = 'category-calculator-prototype';
  const EXPORT_VERSION = 1;
  const NODE_TRIM = 58;
  const ARROW_HEAD = 10;
  const REPOSITION_MARGIN = 0.06;
  const SCRIPT_CAPITALS = Object.freeze({
    A: '𝒜',
    B: 'ℬ',
    C: '𝒞',
    D: '𝒟',
    E: 'ℰ',
    F: 'ℱ',
    G: '𝒢',
    H: 'ℋ',
    I: 'ℐ',
    J: '𝒥',
    K: '𝒦',
    L: 'ℒ',
    M: 'ℳ',
    N: '𝒩',
    O: '𝒪',
    P: '𝒫',
    Q: '𝒬',
    R: 'ℛ',
    S: '𝒮',
    T: '𝒯',
    U: '𝒰',
    V: '𝒱',
    W: '𝒲',
    X: '𝒳',
    Y: '𝒴',
    Z: '𝒵'
  });

  const state = {
    categories: [],
    functors: [],
    activeKind: null,
    activeId: null,
    inputMode: 'create',
    nextCategorySerial: 1,
    nextFunctorSerial: 1,
    canvasWidth: 0,
    canvasHeight: 0,
    drag: null,
    functorPickTarget: 'domain',
    suppressLabelClickUntil: 0
  };

  const refs = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheRefs();
    bindEvents();
    setCreateDefaults('category');
    resizeCanvas();
    syncControls();
    renderAll();

    if (window.ResizeObserver && refs.canvas) {
      const observer = new ResizeObserver(() => {
        resizeCanvas();
        renderAll({ preserveControls: true });
      });
      observer.observe(refs.canvas.parentElement || refs.canvas);
    } else {
      window.addEventListener('resize', () => {
        resizeCanvas();
        renderAll({ preserveControls: true });
      });
    }

  }

  function cacheRefs() {
    const $ = (id) => document.getElementById(id);
    refs.canvas = $('category-canvas');
    refs.labelLayer = $('category-label-layer');
    refs.status = $('category-status');
    refs.summary = $('category-summary');
    refs.countBadge = $('category-count-badge');
    refs.modeBadge = $('category-mode-badge');
    refs.clearCanvas = $('clear-category-canvas');
    refs.inputMode = $('category-input-mode');
    refs.objectKind = $('category-object-kind');
    refs.applyObject = $('category-apply-object');
    refs.deleteObject = $('category-delete-object');
    refs.inputNote = $('category-input-note');
    refs.categoryEditor = $('category-editor');
    refs.categoryLabel = $('category-label');
    refs.categoryObjectSymbol = $('category-object-symbol');
    refs.categoryMorphismTemplate = $('category-morphism-template');
    refs.categoryOpposite = $('category-opposite');
    refs.functorEditor = $('functor-editor');
    refs.functorLabel = $('functor-label');
    refs.functorDomain = $('functor-domain');
    refs.functorCodomain = $('functor-codomain');
    refs.functorDomainButton = $('functor-domain-button');
    refs.functorCodomainButton = $('functor-codomain-button');
    refs.functorVariance = $('functor-variance');
    refs.functorPickStatus = $('functor-pick-status');
    refs.resetFunctorPick = $('reset-functor-pick');
    refs.exportFormat = $('category-export-format');
    refs.exportOut = $('category-export-out');
    refs.refreshExport = $('refresh-category-export');
    refs.copyExport = $('copy-category-export');
    refs.importInput = $('category-import-input');
    refs.loadImport = $('load-category-import');
    refs.clearImport = $('clear-category-import');
    refs.exportMessage = $('category-export-message');
  }

  function bindEvents() {
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (event.target.closest('button,input,select,textarea,a,.drag-handle')) return;
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    refs.inputMode.addEventListener('change', () => {
      state.inputMode = refs.inputMode.value === 'modify' && activeObject() ? 'modify' : 'create';
      refs.inputMode.value = state.inputMode;
      if (state.inputMode === 'create') setCreateDefaults(currentKind());
      syncControls();
      renderAll({ preserveControls: true });
    });

    refs.objectKind.addEventListener('change', () => {
      if (state.inputMode === 'create') setCreateDefaults(currentKind());
      syncControls();
      renderAll({ preserveControls: true });
    });

    refs.applyObject.addEventListener('click', applyObjectFromControls);
    refs.deleteObject.addEventListener('click', deleteActiveObject);
    refs.clearCanvas.addEventListener('click', clearCanvas);

    [
      refs.categoryLabel,
      refs.categoryObjectSymbol,
      refs.categoryMorphismTemplate,
      refs.categoryOpposite
    ].forEach((control) => {
      control.addEventListener('input', handleCategoryDraftChange);
      control.addEventListener('change', handleCategoryDraftChange);
    });

    [
      refs.functorLabel,
      refs.functorVariance
    ].forEach((control) => {
      control.addEventListener('input', handleFunctorDraftChange);
      control.addEventListener('change', handleFunctorDraftChange);
    });

    [refs.functorDomainButton, refs.functorCodomainButton].forEach((button) => {
      if (!button) return;
      button.addEventListener('click', () => {
        setFunctorPickTarget(button.dataset.functorPick === 'codomain' ? 'codomain' : 'domain');
      });
    });

    if (refs.resetFunctorPick) {
      refs.resetFunctorPick.addEventListener('click', () => {
        resetFunctorEndpointDraft();
        syncFunctorParentButtons();
        handleFunctorDraftChange();
      });
    }

    refs.labelLayer.addEventListener('pointerdown', handleLabelPointerDown);
    refs.labelLayer.addEventListener('click', handleLabelClick);
    refs.labelLayer.addEventListener('keydown', handleLabelKeydown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    refs.exportFormat.addEventListener('change', refreshExport);
    refs.refreshExport.addEventListener('click', () => {
      refreshExport();
      setExportMessage('Export refreshed.');
    });
    refs.copyExport.addEventListener('click', copyExport);
    refs.loadImport.addEventListener('click', loadImport);
    refs.clearImport.addEventListener('click', () => {
      refs.importInput.value = '';
      setExportMessage('Import input cleared.');
    });
  }

  function currentKind() {
    return refs.objectKind.value === 'functor' ? 'functor' : 'category';
  }

  function activeObject() {
    if (state.activeKind === 'category') return categoryById(state.activeId);
    if (state.activeKind === 'functor') return functorById(state.activeId);
    return null;
  }

  function setActive(kind, id) {
    const object = kind === 'category' ? categoryById(id) : functorById(id);
    if (!object) return;
    state.activeKind = kind;
    state.activeId = id;
    state.inputMode = 'modify';
    refs.inputMode.value = 'modify';
    refs.objectKind.value = kind;
    loadActiveIntoControls();
    syncControls();
    renderAll({ preserveControls: true });
  }

  function setCreateDefaults(kind) {
    if (kind === 'functor') {
      refs.functorLabel.value = defaultFunctorLabel();
      refs.functorDomain.value = '';
      refs.functorCodomain.value = '';
      state.functorPickTarget = 'domain';
      refs.functorVariance.value = 'covariant';
      syncFunctorParentButtons();
      return;
    }
    refs.categoryLabel.value = defaultCategoryLabel();
    refs.categoryObjectSymbol.value = 'X';
    refs.categoryMorphismTemplate.value = DEFAULT_MORPHISM_TEMPLATE;
    refs.categoryOpposite.checked = false;
  }

  function defaultCategoryLabel() {
    const index = state.categories.length % CATEGORY_LABELS.length;
    const cycle = Math.floor(state.categories.length / CATEGORY_LABELS.length);
    return cycle ? `${CATEGORY_LABELS[index]}_{${cycle + 1}}` : CATEGORY_LABELS[index];
  }

  function defaultFunctorLabel() {
    const index = state.functors.length % FUNCTOR_LABELS.length;
    const cycle = Math.floor(state.functors.length / FUNCTOR_LABELS.length);
    return cycle ? `${FUNCTOR_LABELS[index]}_{${cycle + 1}}` : FUNCTOR_LABELS[index];
  }

  function loadActiveIntoControls() {
    const object = activeObject();
    if (!object) return;
    if (state.activeKind === 'category') {
      refs.categoryLabel.value = object.label;
      refs.categoryObjectSymbol.value = object.objectSymbol;
      refs.categoryMorphismTemplate.value = object.morphismTemplate || DEFAULT_MORPHISM_TEMPLATE;
      refs.categoryOpposite.checked = !!object.opposite;
      return;
    }
    refs.functorLabel.value = object.label;
    refs.functorDomain.value = object.domainId;
    refs.functorCodomain.value = object.codomainId;
    state.functorPickTarget = object.domainId && !object.codomainId ? 'codomain' : 'domain';
    refs.functorVariance.value = object.variance === 'contravariant' ? 'contravariant' : 'covariant';
    syncFunctorParentButtons();
  }

  function syncControls() {
    const active = activeObject();
    const kind = currentKind();
    const canCreateFunctor = state.categories.length >= 2;
    const functorOption = refs.objectKind.querySelector('option[value="functor"]');
    if (functorOption) functorOption.disabled = !canCreateFunctor && !(state.inputMode === 'modify' && state.activeKind === 'functor');

    if (kind === 'functor' && !canCreateFunctor && state.inputMode === 'create') {
      refs.objectKind.value = 'category';
      setCreateDefaults('category');
    }

    refs.categoryEditor.hidden = currentKind() !== 'category';
    refs.functorEditor.hidden = currentKind() !== 'functor';
    refs.inputMode.querySelector('option[value="modify"]').disabled = !active;
    refs.inputMode.value = state.inputMode;

    syncFunctorEndpointDefaults(state.inputMode === 'modify' && state.activeKind === 'functor' ? active : null);
    syncFunctorParentButtons();

    const isModify = state.inputMode === 'modify' && !!active;
    refs.applyObject.textContent = isModify ? 'update' : 'add';
    refs.deleteObject.disabled = !isModify;
    refs.deleteObject.hidden = !isModify;

    const selectedKind = currentKind();
    refs.applyObject.disabled = selectedKind === 'functor' && state.inputMode === 'create' && !canCreateFunctor;
    if (refs.inputNote) {
      refs.inputNote.textContent = inputNoteText(selectedKind, isModify, canCreateFunctor);
    }
    if (refs.modeBadge) {
      refs.modeBadge.textContent = `${state.inputMode} ${selectedKind}`;
    }
  }

  function inputNoteText(kind, isModify, canCreateFunctor) {
    if (isModify && state.activeKind === 'category') return 'Editing the selected category updates formulas immediately.';
    if (isModify && state.activeKind === 'functor') return 'Editing the selected functor updates arrows immediately.';
    if (kind === 'functor' && !canCreateFunctor) return 'Add two categories to enable functors.';
    if (kind === 'functor') return 'Use the parents row, then click categories on the canvas.';
    return 'Set object notation and the Mor template for this category.';
  }

  function syncFunctorEndpointDefaults(activeFunctor = null) {
    const previousDomain = refs.functorDomain.value;
    const previousCodomain = refs.functorCodomain.value;
    if (!state.categories.length) {
      refs.functorDomain.value = '';
      refs.functorCodomain.value = '';
      return;
    }

    if (activeFunctor) {
      refs.functorDomain.value = activeFunctor.domainId;
      refs.functorCodomain.value = activeFunctor.codomainId;
      return;
    }

    const hasPreviousDomain = state.categories.some((category) => category.id === previousDomain);
    const hasPreviousCodomain = state.categories.some((category) => category.id === previousCodomain);
    refs.functorDomain.value = hasPreviousDomain ? previousDomain : '';
    refs.functorCodomain.value = hasPreviousCodomain ? previousCodomain : '';
  }

  function syncFunctorParentButtons() {
    if (!refs.functorDomainButton || !refs.functorCodomainButton) return;
    const domain = categoryById(refs.functorDomain.value);
    const codomain = categoryById(refs.functorCodomain.value);
    refs.functorDomainButton.textContent = domain ? stripLatex(categoryDisplayLabel(domain)) : 'category';
    refs.functorCodomainButton.textContent = codomain ? stripLatex(categoryDisplayLabel(codomain)) : 'category';
    refs.functorDomainButton.title = domain ? `Domain: ${stripLatex(categoryDisplayLabel(domain))}` : 'Pick a domain category on the canvas';
    refs.functorCodomainButton.title = codomain ? `Codomain: ${stripLatex(categoryDisplayLabel(codomain))}` : 'Pick a codomain category on the canvas';
    refs.functorDomainButton.setAttribute('aria-pressed', state.functorPickTarget === 'domain' ? 'true' : 'false');
    refs.functorCodomainButton.setAttribute('aria-pressed', state.functorPickTarget === 'codomain' ? 'true' : 'false');
    if (refs.functorPickStatus) refs.functorPickStatus.textContent = functorPickStatusText();
  }

  function functorPickStatusText() {
    if (currentKind() !== 'functor') return '';
    const domain = categoryById(refs.functorDomain.value);
    const codomain = categoryById(refs.functorCodomain.value);
    if (!domain) return 'pick a domain';
    if (!codomain) return 'pick a codomain';
    return state.functorPickTarget === 'codomain'
      ? 'click a category to replace the codomain'
      : 'click a category to replace the domain';
  }

  function setFunctorPickTarget(target) {
    state.functorPickTarget = target === 'codomain' ? 'codomain' : 'domain';
    syncFunctorParentButtons();
    setStatus(state.functorPickTarget === 'codomain' ? 'pick a codomain category' : 'pick a domain category');
  }

  function resetFunctorEndpointDraft() {
    refs.functorDomain.value = '';
    refs.functorCodomain.value = '';
    state.functorPickTarget = 'domain';
    setStatus('functor parents reset');
  }

  function applyObjectFromControls() {
    if (state.inputMode === 'modify' && activeObject()) {
      updateActiveObjectFromControls();
      setStatus('updated');
      return;
    }

    if (currentKind() === 'functor') addFunctorFromControls();
    else addCategoryFromControls();
  }

  function addCategoryFromControls() {
    const category = readCategoryControls();
    const point = positionForNewCategory(state.categories.length);
    category.id = `category-${state.nextCategorySerial++}`;
    category.x = point.x;
    category.y = point.y;
    state.categories.push(category);
    state.activeKind = 'category';
    state.activeId = category.id;
    state.inputMode = 'modify';
    refs.inputMode.value = 'modify';
    refs.objectKind.value = 'category';
    loadActiveIntoControls();
    setStatus('category added');
    renderAll({ preserveControls: true });
  }

  function addFunctorFromControls() {
    if (state.categories.length < 2) {
      setStatus('add two categories first');
      return;
    }
    const functor = readFunctorControls();
    if (!functor.domainId || !functor.codomainId) {
      setStatus('choose domain and codomain');
      state.functorPickTarget = functor.domainId ? 'codomain' : 'domain';
      syncFunctorParentButtons();
      return;
    }
    functor.id = `functor-${state.nextFunctorSerial++}`;
    state.functors.push(functor);
    state.activeKind = 'functor';
    state.activeId = functor.id;
    state.inputMode = 'modify';
    refs.inputMode.value = 'modify';
    refs.objectKind.value = 'functor';
    loadActiveIntoControls();
    setStatus('functor added');
    renderAll({ preserveControls: true });
  }

  function updateActiveObjectFromControls() {
    if (state.activeKind === 'category') {
      const existing = categoryById(state.activeId);
      if (!existing) return;
      Object.assign(existing, readCategoryControls(), { id: existing.id, x: existing.x, y: existing.y });
    } else if (state.activeKind === 'functor') {
      const existing = functorById(state.activeId);
      if (!existing) return;
      Object.assign(existing, readFunctorControls(), { id: existing.id });
    }
    renderAll({ preserveControls: true });
  }

  function readCategoryControls() {
    return {
      label: cleanMath(refs.categoryLabel.value, defaultCategoryLabel()),
      objectSymbol: cleanMath(refs.categoryObjectSymbol.value, 'X'),
      morphismTemplate: cleanTemplate(refs.categoryMorphismTemplate.value),
      opposite: !!refs.categoryOpposite.checked
    };
  }

  function readFunctorControls() {
    return {
      label: cleanMath(refs.functorLabel.value, defaultFunctorLabel()),
      domainId: refs.functorDomain.value || '',
      codomainId: refs.functorCodomain.value || '',
      variance: refs.functorVariance.value === 'contravariant' ? 'contravariant' : 'covariant'
    };
  }

  function handleCategoryDraftChange() {
    if (state.inputMode === 'modify' && state.activeKind === 'category') {
      updateActiveObjectFromControls();
    }
  }

  function handleFunctorDraftChange() {
    if (state.inputMode === 'modify' && state.activeKind === 'functor') {
      updateActiveObjectFromControls();
    } else {
      syncFunctorParentButtons();
      renderCanvas();
      renderLabels();
      refreshExport();
    }
  }

  function deleteActiveObject() {
    if (!(state.inputMode === 'modify' && activeObject())) return;
    if (state.activeKind === 'category') {
      const removedId = state.activeId;
      state.categories = state.categories.filter((category) => category.id !== removedId);
      state.functors = state.functors.filter((functor) => functor.domainId !== removedId && functor.codomainId !== removedId);
      setStatus('category deleted');
    } else {
      state.functors = state.functors.filter((functor) => functor.id !== state.activeId);
      setStatus('functor deleted');
    }
    const next = state.categories[0] || state.functors[0] || null;
    state.activeKind = next ? (next.domainId ? 'functor' : 'category') : null;
    state.activeId = next?.id || null;
    state.inputMode = next ? 'modify' : 'create';
    refs.inputMode.value = state.inputMode;
    refs.objectKind.value = state.activeKind || 'category';
    if (state.inputMode === 'create') setCreateDefaults('category');
    else loadActiveIntoControls();
    renderAll({ preserveControls: true });
  }

  function clearCanvas() {
    if (!state.categories.length && !state.functors.length) {
      setStatus('canvas already clear');
      return;
    }
    const confirmed = window.confirm('Clear all categories and functors?');
    if (!confirmed) return;
    state.categories = [];
    state.functors = [];
    state.activeKind = null;
    state.activeId = null;
    state.inputMode = 'create';
    refs.inputMode.value = 'create';
    refs.objectKind.value = 'category';
    state.nextCategorySerial = 1;
    state.nextFunctorSerial = 1;
    setCreateDefaults('category');
    setStatus('cleared');
    renderAll({ preserveControls: true });
  }

  function renderAll(options = {}) {
    if (!options.preserveControls) {
      syncControls();
    } else {
      syncControls();
    }
    renderCanvas();
    renderLabels();
    refreshExport();
    updateSummary();
  }

  function updateSummary() {
    const catCount = state.categories.length;
    const functorCount = state.functors.length;
    refs.countBadge.textContent = `${catCount} categor${catCount === 1 ? 'y' : 'ies'}, ${functorCount} functor${functorCount === 1 ? '' : 's'}`;
    refs.summary.textContent = catCount
      ? `${catCount} category node${catCount === 1 ? '' : 's'}; ${functorCount} functor arrow${functorCount === 1 ? '' : 's'}`
      : 'empty category canvas';
  }

  function resizeCanvas() {
    const canvas = refs.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || canvas.clientWidth || 880));
    const height = Math.max(320, Math.round(rect.height || canvas.clientHeight || 420));
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    state.canvasWidth = width;
    state.canvasHeight = height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function renderCanvas() {
    const canvas = refs.canvas;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const width = state.canvasWidth || canvas.clientWidth || 880;
    const height = state.canvasHeight || canvas.clientHeight || 420;
    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height);

    if (!state.categories.length) {
      renderCanvasMessage(ctx, width, height, 'Add a category to begin.');
      return;
    }

    state.functors.forEach((functor) => drawFunctor(ctx, functor));
  }

  function drawBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function renderCanvasMessage(ctx, width, height, message) {
    ctx.save();
    ctx.fillStyle = '#7a6f65';
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, width / 2, height / 2);
    ctx.restore();
  }

  function drawFunctor(ctx, functor) {
    const domain = categoryById(functor.domainId);
    const codomain = categoryById(functor.codomainId);
    if (!domain || !codomain) return;
    const selected = state.activeKind === 'functor' && state.activeId === functor.id;
    const dashed = functor.variance === 'contravariant';
    ctx.save();
    ctx.strokeStyle = selected ? '#8b3a2a' : '#3d6b4f';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = selected ? 2.2 : 1.55;
    if (dashed) ctx.setLineDash([8, 6]);
    if (domain.id === codomain.id) {
      drawLoopArrow(ctx, domain);
    } else {
      drawCurvedArrow(ctx, canvasPoint(domain), canvasPoint(codomain), functorBend(functor));
    }
    ctx.restore();
  }

  function drawCurvedArrow(ctx, from, to, bend) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    const start = { x: from.x + ux * NODE_TRIM, y: from.y + uy * NODE_TRIM };
    const end = { x: to.x - ux * NODE_TRIM, y: to.y - uy * NODE_TRIM };
    const ctrl = {
      x: (start.x + end.x) / 2 + px * bend,
      y: (start.y + end.y) / 2 + py * bend
    };
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
    ctx.stroke();
    const tangent = { x: end.x - ctrl.x, y: end.y - ctrl.y };
    drawArrowHead(ctx, end, Math.atan2(tangent.y, tangent.x));
  }

  function drawLoopArrow(ctx, category) {
    const point = canvasPoint(category);
    const radius = 42;
    const center = { x: point.x, y: point.y - 48 };
    const startAngle = Math.PI * 0.18;
    const endAngle = Math.PI * 1.68;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, startAngle, endAngle, false);
    ctx.stroke();
    const end = {
      x: center.x + Math.cos(endAngle) * radius,
      y: center.y + Math.sin(endAngle) * radius
    };
    drawArrowHead(ctx, end, endAngle + Math.PI / 2);
  }

  function drawArrowHead(ctx, point, angle) {
    ctx.save();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x - ARROW_HEAD * Math.cos(angle - Math.PI / 6), point.y - ARROW_HEAD * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(point.x - ARROW_HEAD * Math.cos(angle + Math.PI / 6), point.y - ARROW_HEAD * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function functorBend(functor) {
    const siblings = state.functors.filter((item) => item.domainId === functor.domainId && item.codomainId === functor.codomainId);
    if (siblings.length <= 1) return 0;
    const index = Math.max(0, siblings.findIndex((item) => item.id === functor.id));
    return (index - (siblings.length - 1) / 2) * 34;
  }

  function renderLabels() {
    if (!refs.labelLayer) return;
    const categoryHtml = state.categories.map((category) => {
      const point = canvasPoint(category);
      const selected = state.activeKind === 'category' && state.activeId === category.id;
      const classes = ['category-node-label'];
      if (selected) classes.push('is-selected');
      if (currentKind() === 'functor') {
        if (category.id === refs.functorDomain.value) classes.push('is-functor-domain');
        if (category.id === refs.functorCodomain.value) classes.push('is-functor-codomain');
        if (category.id !== refs.functorDomain.value && category.id !== refs.functorCodomain.value) classes.push('is-pick-candidate');
      }
      return `
        <button class="${classes.join(' ')}" type="button" data-object-kind="category" data-object-id="${escapeHtml(category.id)}" style="left:${point.x}px;top:${point.y}px;" aria-label="Category ${escapeHtml(stripLatex(categoryDisplayLabel(category)))}">
          ${labelMathHtml(categoryDisplayLabel(category))}
        </button>
      `;
    }).join('');

    const functorHtml = state.functors.map((functor) => {
      const point = functorLabelPoint(functor);
      const selected = state.activeKind === 'functor' && state.activeId === functor.id;
      return `
        <button class="category-functor-label${selected ? ' is-selected' : ''}" type="button" data-object-kind="functor" data-object-id="${escapeHtml(functor.id)}" style="left:${point.x}px;top:${point.y}px;" aria-label="Functor ${escapeHtml(stripLatex(functor.label))}">
          ${labelMathHtml(functor.label)}
        </button>
      `;
    }).join('');

    refs.labelLayer.innerHTML = categoryHtml + functorHtml;
  }

  function positionFunctorLabels() {
    state.functors.forEach((functor) => {
      const element = refs.labelLayer.querySelector(`[data-object-kind="functor"][data-object-id="${cssEscape(functor.id)}"]`);
      if (!element) return;
      const point = functorLabelPoint(functor);
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    });
  }

  function canvasPoint(category) {
    const width = state.canvasWidth || refs.canvas?.clientWidth || 880;
    const height = state.canvasHeight || refs.canvas?.clientHeight || 420;
    const x = Number.isFinite(category.x) ? category.x : 0.5;
    const y = Number.isFinite(category.y) ? category.y : 0.5;
    return { x: clamp(x, 0, 1) * width, y: clamp(y, 0, 1) * height };
  }

  function functorLabelPoint(functor) {
    const domain = categoryById(functor.domainId);
    const codomain = categoryById(functor.codomainId);
    if (!domain || !codomain) return { x: state.canvasWidth / 2 || 0, y: state.canvasHeight / 2 || 0 };
    const from = canvasPoint(domain);
    if (domain.id === codomain.id) {
      return { x: from.x + 54, y: from.y - 94 };
    }
    const to = canvasPoint(codomain);
    const bend = functorBend(functor);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const px = -uy;
    const py = ux;
    return {
      x: (from.x + to.x) / 2 + px * bend,
      y: (from.y + to.y) / 2 + py * bend - 18
    };
  }

  function positionForNewCategory(index) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: clamp(0.24 + column * 0.26, REPOSITION_MARGIN, 1 - REPOSITION_MARGIN),
      y: clamp(0.42 + row * 0.18, 0.12, 0.88)
    };
  }

  function handleLabelPointerDown(event) {
    const target = event.target.closest('[data-object-kind][data-object-id]');
    if (!target || !refs.labelLayer.contains(target)) return;
    const kind = target.dataset.objectKind;
    const id = target.dataset.objectId;
    if (kind === 'category' && currentKind() === 'functor' && state.functorPickTarget) {
      event.preventDefault();
      handleFunctorCategoryPick(id);
      return;
    }
    if (kind === 'functor') {
      setActive('functor', id);
      return;
    }
    const category = categoryById(id);
    if (!category) return;
    selectActiveInPlace('category', id);
    const rect = refs.canvas.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    state.drag = {
      id,
      element: target,
      canvasRect: rect,
      offsetX: event.clientX - targetRect.left - targetRect.width / 2,
      offsetY: event.clientY - targetRect.top - targetRect.height / 2
    };
    target.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function selectActiveInPlace(kind, id) {
    const object = kind === 'category' ? categoryById(id) : functorById(id);
    if (!object) return;
    state.activeKind = kind;
    state.activeId = id;
    state.inputMode = 'modify';
    refs.inputMode.value = 'modify';
    refs.objectKind.value = kind;
    loadActiveIntoControls();
    syncControls();
    refs.labelLayer.querySelectorAll('.category-node-label,.category-functor-label').forEach((label) => {
      label.classList.toggle('is-selected', label.dataset.objectKind === kind && label.dataset.objectId === id);
    });
    renderCanvas();
    refreshExport();
    updateSummary();
  }

  function handleLabelClick(event) {
    if (Date.now() < state.suppressLabelClickUntil) return;
    const target = event.target.closest('[data-object-kind][data-object-id]');
    if (!target || !refs.labelLayer.contains(target)) return;
    if (target.dataset.objectKind === 'category' && currentKind() === 'functor' && state.functorPickTarget) {
      handleFunctorCategoryPick(target.dataset.objectId);
      return;
    }
    setActive(target.dataset.objectKind, target.dataset.objectId);
  }

  function handleLabelKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('[data-object-kind][data-object-id]');
    if (!target || !refs.labelLayer.contains(target)) return;
    event.preventDefault();
    if (target.dataset.objectKind === 'category' && currentKind() === 'functor' && state.functorPickTarget) {
      handleFunctorCategoryPick(target.dataset.objectId);
      return;
    }
    setActive(target.dataset.objectKind, target.dataset.objectId);
  }

  function handleFunctorCategoryPick(categoryId) {
    if (!categoryById(categoryId)) return;
    const target = state.functorPickTarget === 'codomain' ? 'codomain' : 'domain';
    if (target === 'domain') {
      refs.functorDomain.value = categoryId;
      state.functorPickTarget = 'codomain';
      setStatus('domain picked; pick a codomain category');
    } else {
      refs.functorCodomain.value = categoryId;
      state.functorPickTarget = 'domain';
      setStatus('codomain picked');
    }
    state.suppressLabelClickUntil = Date.now() + 250;
    syncFunctorParentButtons();
    handleFunctorDraftChange();
  }

  function handlePointerMove(event) {
    const drag = state.drag;
    if (!drag) return;
    const category = categoryById(drag.id);
    if (!category) return;
    const width = drag.canvasRect.width || 1;
    const height = drag.canvasRect.height || 1;
    const rawX = event.clientX - drag.canvasRect.left - drag.offsetX;
    const rawY = event.clientY - drag.canvasRect.top - drag.offsetY;
    const x = clamp(rawX / width, REPOSITION_MARGIN, 1 - REPOSITION_MARGIN);
    const y = clamp(rawY / height, 0.08, 0.92);
    category.x = x;
    category.y = y;
    const left = x * (state.canvasWidth || width);
    const top = y * (state.canvasHeight || height);
    if (drag.element) {
      drag.element.style.left = `${left}px`;
      drag.element.style.top = `${top}px`;
    }
    renderCanvas();
    positionFunctorLabels();
  }

  function finishDrag() {
    if (!state.drag) return;
    state.drag = null;
    renderAll({ preserveControls: true });
  }

  function categoryDisplayLabel(category) {
    return category?.opposite ? `${category.label}^{op}` : category?.label || '\\mathcal{C}';
  }

  function oppositeOfCategoryDisplay(category) {
    return category?.opposite ? category.label : `${category.label}^{op}`;
  }

  function categoryObjectsLatex(category) {
    const display = categoryDisplayLabel(category);
    const objects = `\\operatorname{Ob}(${display})`;
    return category.opposite ? `${objects}=\\operatorname{Ob}(${category.label})` : objects;
  }

  function categoryMorphismPreviewLatex(category) {
    const source = category.objectSymbol || 'X';
    const target = primeSymbol(source);
    const left = applyMorphismTemplate(category, {
      source,
      target,
      category: categoryDisplayLabel(category)
    });
    if (!category.opposite) return left;
    const right = applyMorphismTemplate(category, {
      source: target,
      target: source,
      category: category.label
    });
    return `${left}=${right}`;
  }

  function applyMorphismTemplate(category, values) {
    const template = category?.morphismTemplate || DEFAULT_MORPHISM_TEMPLATE;
    return template
      .replaceAll('{source}', values.source || 'X')
      .replaceAll('{target}', values.target || "X'")
      .replaceAll('{category}', values.category || categoryDisplayLabel(category));
  }

  function functorSignatureLatex(functor) {
    const domain = categoryById(functor.domainId);
    const codomain = categoryById(functor.codomainId);
    if (!domain || !codomain) return `${functor.label}:?\\to ?`;
    const domainLabel = functor.variance === 'contravariant'
      ? oppositeOfCategoryDisplay(domain)
      : categoryDisplayLabel(domain);
    return `${functor.label}:${domainLabel}\\to ${categoryDisplayLabel(codomain)}`;
  }

  function functorMorphismPreviewLatex(functor) {
    const domain = categoryById(functor.domainId);
    const codomain = categoryById(functor.codomainId);
    if (!domain || !codomain) return '\\text{choose domain and codomain}';
    const x = domain.objectSymbol || 'X';
    const xp = primeSymbol(x);
    const sourceMor = applyMorphismTemplate(domain, {
      source: x,
      target: xp,
      category: categoryDisplayLabel(domain)
    });
    const targetSource = functor.variance === 'contravariant' ? `${functor.label}(${xp})` : `${functor.label}(${x})`;
    const targetTarget = functor.variance === 'contravariant' ? `${functor.label}(${x})` : `${functor.label}(${xp})`;
    const targetMor = applyMorphismTemplate(codomain, {
      source: targetSource,
      target: targetTarget,
      category: categoryDisplayLabel(codomain)
    });
    return `${sourceMor}\\mapsto ${targetMor}`;
  }

  function primeSymbol(symbol) {
    return `${symbol || 'X'}'`;
  }

  function refreshExport() {
    if (!refs.exportOut) return;
    const format = refs.exportFormat.value;
    if (format === 'json') refs.exportOut.value = exportJson();
    else if (format === 'plain') refs.exportOut.value = exportPlain();
    else refs.exportOut.value = exportLatex();
  }

  function exportJson() {
    return JSON.stringify({
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      categories: state.categories.map((category) => ({
        id: category.id,
        label: category.label,
        objectSymbol: category.objectSymbol,
        morphismTemplate: category.morphismTemplate,
        opposite: !!category.opposite,
        x: round(category.x),
        y: round(category.y)
      })),
      functors: state.functors.map((functor) => ({
        id: functor.id,
        label: functor.label,
        domainId: functor.domainId,
        codomainId: functor.codomainId,
        variance: functor.variance
      })),
      active: {
        kind: state.activeKind,
        id: state.activeId
      },
      next: {
        categorySerial: state.nextCategorySerial,
        functorSerial: state.nextFunctorSerial
      }
    }, null, 2);
  }

  function exportLatex() {
    const lines = ['% Category Calculator prototype'];
    if (!state.categories.length) lines.push('% empty');
    state.categories.forEach((category, index) => {
      lines.push(`\\[\\mathsf{Cat}_{${index + 1}}:\\ ${categoryDisplayLabel(category)}\\]`);
      lines.push(`\\[${categoryObjectsLatex(category)}\\]`);
      lines.push(`\\[${categoryMorphismPreviewLatex(category)}\\]`);
    });
    state.functors.forEach((functor, index) => {
      lines.push(`\\[\\mathsf{Fun}_{${index + 1}}:\\ ${functorSignatureLatex(functor)}\\]`);
      lines.push(`\\[${functorMorphismPreviewLatex(functor)}\\]`);
    });
    return lines.join('\n');
  }

  function exportPlain() {
    const lines = ['Category Calculator prototype'];
    if (!state.categories.length) lines.push('empty');
    state.categories.forEach((category, index) => {
      lines.push(`Category ${index + 1}: ${stripLatex(categoryDisplayLabel(category))}`);
      lines.push(`  Objects: ${stripLatex(categoryObjectsLatex(category))}`);
      lines.push(`  Morphisms: ${stripLatex(categoryMorphismPreviewLatex(category))}`);
    });
    state.functors.forEach((functor, index) => {
      lines.push(`Functor ${index + 1}: ${stripLatex(functorSignatureLatex(functor))}`);
      lines.push(`  Variance: ${functor.variance}`);
      lines.push(`  Morphisms: ${stripLatex(functorMorphismPreviewLatex(functor))}`);
    });
    return lines.join('\n');
  }

  function copyExport() {
    refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard?.writeText) {
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
    document.execCommand('copy');
    setExportMessage('Export copied.');
  }

  function loadImport() {
    try {
      importJson(refs.importInput.value);
      setExportMessage('JSON imported.');
      setStatus('imported');
    } catch (error) {
      setExportMessage(error?.message || 'Unable to import JSON.', true);
    }
  }

  function importJson(text) {
    const data = JSON.parse(text || '{}');
    if (data.kind && data.kind !== EXPORT_KIND) throw new Error('This is not a category calculator preset.');
    const rawCategories = Array.isArray(data.categories) ? data.categories : [];
    const categoryIds = new Set();
    const categories = rawCategories.map((item, index) => {
      const id = uniqueId(cleanId(item.id) || `category-${index + 1}`, categoryIds);
      categoryIds.add(id);
      const fallback = CATEGORY_LABELS[index % CATEGORY_LABELS.length];
      return {
        id,
        label: cleanMath(item.label, fallback),
        objectSymbol: cleanMath(item.objectSymbol, 'X'),
        morphismTemplate: cleanTemplate(item.morphismTemplate),
        opposite: !!item.opposite,
        x: clampNumber(item.x, positionForNewCategory(index).x, REPOSITION_MARGIN, 1 - REPOSITION_MARGIN),
        y: clampNumber(item.y, positionForNewCategory(index).y, 0.08, 0.92)
      };
    });
    const knownCategoryIds = new Set(categories.map((category) => category.id));
    const functorIds = new Set();
    const functors = (Array.isArray(data.functors) ? data.functors : [])
      .filter((item) => knownCategoryIds.has(item.domainId) && knownCategoryIds.has(item.codomainId))
      .map((item, index) => {
        const id = uniqueId(cleanId(item.id) || `functor-${index + 1}`, functorIds);
        functorIds.add(id);
        return {
          id,
          label: cleanMath(item.label, FUNCTOR_LABELS[index % FUNCTOR_LABELS.length]),
          domainId: item.domainId,
          codomainId: item.codomainId,
          variance: item.variance === 'contravariant' ? 'contravariant' : 'covariant'
        };
      });
    state.categories = categories;
    state.functors = functors;
    state.nextCategorySerial = Math.max(nextSerialFromIds(categories, 'category'), Number(data.next?.categorySerial) || 1);
    state.nextFunctorSerial = Math.max(nextSerialFromIds(functors, 'functor'), Number(data.next?.functorSerial) || 1);
    const activeKind = data.active?.kind === 'functor' ? 'functor' : (data.active?.kind === 'category' ? 'category' : null);
    const activeId = data.active?.id;
    if (activeKind === 'category' && categoryById(activeId)) {
      state.activeKind = 'category';
      state.activeId = activeId;
    } else if (activeKind === 'functor' && functorById(activeId)) {
      state.activeKind = 'functor';
      state.activeId = activeId;
    } else {
      state.activeKind = categories[0] ? 'category' : (functors[0] ? 'functor' : null);
      state.activeId = categories[0]?.id || functors[0]?.id || null;
    }
    state.inputMode = state.activeId ? 'modify' : 'create';
    refs.inputMode.value = state.inputMode;
    refs.objectKind.value = state.activeKind || 'category';
    if (state.inputMode === 'modify') loadActiveIntoControls();
    else setCreateDefaults('category');
    renderAll({ preserveControls: true });
  }

  function nextSerialFromIds(items, prefix) {
    let max = 0;
    items.forEach((item) => {
      const match = String(item.id || '').match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    return max + 1;
  }

  function categoryById(id) {
    return state.categories.find((category) => category.id === id) || null;
  }

  function functorById(id) {
    return state.functors.find((functor) => functor.id === id) || null;
  }

  function setStatus(message) {
    if (refs.status) refs.status.textContent = message || 'ready';
  }

  function setExportMessage(message, isError = false) {
    if (!refs.exportMessage) return;
    refs.exportMessage.textContent = message || '';
    refs.exportMessage.classList.toggle('is-error', !!isError);
  }

  function labelMathHtml(latex) {
    return escapeHtml(renderMathLabel(latex));
  }

  function renderMathLabel(latex) {
    return String(latex || '')
      .replace(/\\mathcal\{([A-Z])\}/g, (_, letter) => SCRIPT_CAPITALS[letter] || letter)
      .replace(/\^\{([^}]+)\}/g, (_, value) => superscriptText(value))
      .replace(/_/g, '')
      .replace(/[{}]/g, '')
      .replace(/\\/g, '');
  }

  function superscriptText(value) {
    const map = {
      '0': '⁰',
      '1': '¹',
      '2': '²',
      '3': '³',
      '4': '⁴',
      '5': '⁵',
      '6': '⁶',
      '7': '⁷',
      '8': '⁸',
      '9': '⁹',
      '+': '⁺',
      '-': '⁻',
      '=': '⁼',
      '(': '⁽',
      ')': '⁾',
      n: 'ⁿ',
      i: 'ⁱ',
      o: 'ᵒ',
      p: 'ᵖ'
    };
    return String(value || '').split('').map((char) => map[char] || char).join('');
  }

  function cleanMath(value, fallback) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text || fallback;
  }

  function cleanTemplate(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text || DEFAULT_MORPHISM_TEMPLATE;
  }

  function cleanId(value) {
    const text = String(value || '').trim();
    return /^[A-Za-z][A-Za-z0-9_-]{0,48}$/.test(text) ? text : '';
  }

  function uniqueId(base, used) {
    let id = base;
    let index = 2;
    while (used.has(id)) {
      id = `${base}-${index++}`;
    }
    return id;
  }

  function stripLatex(value) {
    return String(value || '')
      .replace(/\\operatorname\{([^}]+)\}/g, '$1')
      .replace(/\\mathcal\{([^}]+)\}/g, '$1')
      .replace(/\\mathsf\{([^}]+)\}/g, '$1')
      .replace(/\\texttt\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\to/g, '->')
      .replace(/\\mapsto/g, '|->')
      .replace(/[{}]/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value || '').replace(/[^A-Za-z0-9_-]/g, '\\$&');
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, min, max) : fallback;
  }

  function round(value) {
    return Math.round(Number(value || 0) * 10000) / 10000;
  }
})();
