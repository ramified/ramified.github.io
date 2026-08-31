(() => {
  'use strict';

  const EXPORT_KIND = 'strand-diagram-calculator';
  const EXPORT_VERSION = 4;
  const DEFAULT_GROUP_TYPE = 'symmetric';
  const DEFAULT_STRAND_COUNT = 5;
  const DEFAULT_DIRECTION = 'up-down';
  const CANVAS_STRAND_LIMIT = 90;
  const ONE_LINE_DISPLAY_LIMIT = 60;
  const TWO_LINE_DISPLAY_LIMIT = 32;
  const MATRIX_DISPLAY_LIMIT = 14;
  const WORD_DISPLAY_LIMIT = 80;
  const REDUCED_WORD_GENERATION_LIMIT = 2200;
  const MAX_CANVAS_STEPS = 520;
  const DEFAULT_BASIC_EXPRESSION_FORMAT = 'composition';
  const DEFAULT_STRAND_DISPLAY_STYLE = 'soft';
  const DEFAULT_GENERATOR_SPACING = 0;
  const DEFAULT_GENERATOR_GAP_ENABLED = false;
  const GENERATOR_CUT_SIZE = 0.34;
  const DEFAULT_STRAND_SIZE_MODE = 'fit';
  const DEFAULT_FIXED_GENERATOR_SIZE = 88;
  const DIRECTIONS = new Set(['up-down', 'down-up', 'left-right', 'right-left']);
  const GROUP_TYPES = new Set(['symmetric', 'B', 'C', 'D']);
  const GENERATOR_FAMILIES = new Set(['coxeter', 'braid', 'kl', 'tl']);
  const STRAND_DISPLAY_STYLES = new Set(['straight', 'soft']);
  const STRAND_SIZE_MODES = new Set(['fit', 'fixed']);
  const BASIC_EXPRESSION_FORMATS = new Set(['composition', 'transpositions', 'cycle', 'one-line', 'two-line', 'matrix']);
  const BASIC_REDUCED_FORMATS = new Set(['composition', 'transpositions']);
  const CALCULATION_TARGETS = new Set(['symmetric', 'braid', 'hecke', 'tl', 'burau']);
  const CALCULATION_TASKS = new Set(['strand', 'relations', 'basis']);
  const CALCULATION_PRESENTATION_MODES = new Set(['symbolic', 'diagrammatic']);
  const CALCULATION_PRESENTATION_SCOPES = new Set(['all', 'basis']);
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  const CALCULATION_BASES = {
    symmetric: [
      { value: 'composition', label: 'Composition word' },
      { value: 'transpositions', label: 'Transpositions' },
      { value: 'cycle', label: 'Cycle notation' },
      { value: 'one-line', label: 'One-line' },
      { value: 'two-line', label: 'Two-line' },
      { value: 'matrix', label: 'Matrix' }
    ],
    braid: [{ value: 'freely-reduced-word', label: 'Freely reduced word' }],
    hecke: [
      { value: 'standard', label: 'Standard basis' },
      { value: 'kl', label: 'KL basis' }
    ],
    tl: [{ value: 'diagram', label: 'Diagram basis' }],
    burau: [
      { value: 'link-state', label: 'Link-state basis' },
      { value: 'matrix-unit', label: 'Unreduced matrix-unit basis' },
      { value: 'vector', label: 'Unreduced vector basis' }
    ]
  };
  const DIRECTION_LABELS = {
    'up-down': 'up to down',
    'down-up': 'down to up',
    'left-right': 'left to right',
    'right-left': 'right to left'
  };
  const GROUP_TYPE_NAMES = {
    symmetric: (n) => `S_${n}`,
    B: (n) => `B_${n}`,
    C: (n) => `C_${n}`,
    D: (n) => `D_${n}`
  };
  const GENERATOR_FAMILY_SECTIONS = [
    { family: 'coxeter', title: 'Coxeter / Weyl' },
    { family: 'braid', title: 'Braid' },
    { family: 'kl', title: 'KL generators' },
    { family: 'tl', title: 'Temperley-Lieb' }
  ];
  const STRAND_COLORS = [
    '#3d6b4f',
    '#8b3a2a',
    '#4f5f9a',
    '#a26b24',
    '#28707b',
    '#7b477e',
    '#4f7330',
    '#9b4f50'
  ];

  const state = {
    groupType: DEFAULT_GROUP_TYPE,
    strandCount: DEFAULT_STRAND_COUNT,
    direction: DEFAULT_DIRECTION,
    appliedSteps: [],
    basicExpressionFormat: DEFAULT_BASIC_EXPRESSION_FORMAT,
    basicReducedOnly: false,
    strandDisplayStyle: DEFAULT_STRAND_DISPLAY_STYLE,
    generatorSpacing: DEFAULT_GENERATOR_SPACING,
    generatorGapEnabled: DEFAULT_GENERATOR_GAP_ENABLED,
    strandSizeMode: DEFAULT_STRAND_SIZE_MODE,
    fixedGeneratorSize: DEFAULT_FIXED_GENERATOR_SIZE,
    calculationTask: 'strand',
    calculationTarget: 'tl',
    relationTarget: 'tl',
    basisTarget: 'tl',
    basisBasis: 'diagram',
    basisPageStart: '0',
    calculationBasis: 'diagram',
    calculationResult: null,
    calculationKey: '',
    calculationStale: false,
    calculationLatex: '',
    calculationPlain: '',
    calculationPresentationMode: 'symbolic',
    calculationPresentationScope: 'all',
    dragInput: null,
    canvasWidth: 0,
    canvasHeight: 0
  };

  let suppressInputChartClickUntil = 0;

  const refs = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheRefs();
    bindEvents();
    resizeCanvas();
    syncControls();
    renderAll();

    if (window.ResizeObserver && refs.canvas) {
      const observer = new ResizeObserver(() => {
        resizeCanvas();
        renderAll({ preserveMessage: true });
      });
      observer.observe(refs.canvas.parentElement || refs.canvas);
    } else {
      window.addEventListener('resize', () => {
        resizeCanvas();
        renderAll({ preserveMessage: true });
      });
    }
  }

  function cacheRefs() {
    const $ = (id) => document.getElementById(id);
    refs.canvas = $('strand-canvas');
    refs.stage = refs.canvas?.parentElement || null;
    refs.groupType = $('strand-group-type');
    refs.count = $('strand-count');
    refs.countLabel = $('strand-count-label');
    refs.direction = $('strand-direction');
    refs.displayStyle = $('strand-display-style');
    refs.generatorSpacing = $('strand-generator-spacing');
    refs.generatorSpacingValue = $('strand-generator-spacing-value');
    refs.generatorGapEnabled = $('strand-generator-gap-enabled');
    refs.sizeMode = $('strand-size-mode');
    refs.fixedGeneratorSize = $('strand-fixed-generator-size');
    refs.fixedGeneratorSizeValue = $('strand-fixed-generator-size-value');
    refs.fixedGeneratorSizeRow = $('strand-fixed-generator-size-row');
    refs.clear = $('strand-clear');
    refs.statusBadge = $('strand-status-badge');
    refs.status = $('strand-status');
    refs.summary = $('strand-summary');
    refs.basicExpressionFormat = $('strand-basic-expression-format');
    refs.basicReducedOnly = $('strand-basic-reduced-only');
    refs.basicInfo = $('strand-basic-info');
    refs.inputChart = $('strand-input-chart');
    refs.exportFormat = $('strand-export-format');
    refs.exportOut = $('strand-export-out');
    refs.refreshExport = $('strand-refresh-export');
    refs.copyExport = $('strand-copy-export');
    refs.importInput = $('strand-import-input');
    refs.loadImport = $('strand-load-import');
    refs.clearImport = $('strand-clear-import');
    refs.exportMessage = $('strand-export-message');
    refs.calculationCard = $('strand-calculation-card');
    refs.calculationTask = $('strand-calculation-task');
    refs.calculationSourceRow = $('strand-calculation-source-row');
    refs.calculationSource = $('strand-calculation-source');
    refs.calculationTarget = $('strand-calculation-target');
    refs.calculationBasisRow = $('strand-calculation-basis-row');
    refs.calculationBasis = $('strand-calculation-basis');
    refs.calculate = $('strand-calculate');
    refs.copyCalculationLatex = $('strand-copy-calculation-latex');
    refs.copyCalculationResult = $('strand-copy-calculation-result');
    refs.calculationActions = $('strand-calculation-actions');
    refs.calculationModeControl = $('strand-calculation-mode-control');
    refs.calculationScopeControl = $('strand-calculation-scope-control');
    refs.calculationPresentation = $('strand-calculation-presentation');
    refs.calculationMessage = $('strand-calculation-message');
    refs.calculationRenderWarning = $('strand-calculation-render-warning');
    refs.calculationRelations = $('strand-calculation-relations');
    refs.calculationRelationsSurface = $('strand-calculation-relations-surface');
    refs.calculationBasisSurface = $('strand-calculation-basis-surface');
    refs.calculationBasisSummary = $('strand-calculation-basis-summary');
    refs.calculationBasisList = $('strand-calculation-basis-list');
    refs.calculationBasisPagination = $('strand-calculation-basis-pagination');
    refs.calculationBasisPrevious = $('strand-calculation-basis-previous');
    refs.calculationBasisPage = $('strand-calculation-basis-page');
    refs.calculationBasisGo = $('strand-calculation-basis-go');
    refs.calculationBasisPageStatus = $('strand-calculation-basis-page-status');
    refs.calculationBasisNext = $('strand-calculation-basis-next');
    refs.calculationSurface = $('strand-calculation-surface');
    refs.calculationEquation = $('strand-calculation-equation');
    refs.calculationMatrixSection = $('strand-calculation-matrix-section');
    refs.calculationMatrixLabel = $('strand-calculation-matrix-label');
    refs.calculationMatrix = $('strand-calculation-matrix');
  }

  function bindEvents() {
    bindCards();

    refs.groupType.addEventListener('change', commitGroupType);
    refs.count.addEventListener('change', commitStrandCount);
    refs.count.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitStrandCount();
      }
    });

    refs.direction.addEventListener('change', () => {
      state.direction = DIRECTIONS.has(refs.direction.value) ? refs.direction.value : DEFAULT_DIRECTION;
      setStatus(`direction: ${DIRECTION_LABELS[state.direction]}`);
      renderAll({ preserveMessage: true });
      if (relationTaskActive()) renderRelationReference();
      else if (!basisTaskActive() && state.calculationResult) renderCalculationResult();
    });

    refs.displayStyle.addEventListener('change', () => {
      state.strandDisplayStyle = strandDisplayStyleValue(refs.displayStyle.value);
      setStatus(`display style: ${state.strandDisplayStyle}`);
      renderAll({ preserveMessage: true });
    });

    refs.generatorSpacing.addEventListener('input', updateGeneratorSpacingFromControl);
    bindRangePointer(refs.generatorSpacing, updateGeneratorSpacingFromControl);

    refs.generatorGapEnabled.addEventListener('change', () => {
      state.generatorGapEnabled = refs.generatorGapEnabled.checked;
      setStatus(state.generatorGapEnabled ? 'generator gap enabled' : 'generator gap disabled');
      renderAll({ preserveMessage: true });
    });

    refs.sizeMode.addEventListener('change', () => {
      state.strandSizeMode = strandSizeModeValue(refs.sizeMode.value);
      setStatus(state.strandSizeMode === 'fixed' ? 'size mode: fixed generator size' : 'size mode: fit canvas');
      resizeCanvas();
      renderAll({ preserveMessage: true });
    });

    refs.fixedGeneratorSize.addEventListener('input', updateFixedGeneratorSizeFromControl);
    bindRangePointer(refs.fixedGeneratorSize, updateFixedGeneratorSizeFromControl);

    refs.clear.addEventListener('click', clearSteps);
    bindInputChart();
    bindCanvasGeneratorDrag();
    refs.basicInfo.addEventListener('change', handleBasicInfoControlChange);
    refs.exportFormat.addEventListener('change', () => refreshExport());
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
    refs.calculationTask?.addEventListener('change', () => {
      setCalculationTask(refs.calculationTask.value);
    });
    refs.calculationTarget?.addEventListener('change', () => {
      if (relationTaskActive()) {
        state.relationTarget = calculationTargetValue(refs.calculationTarget.value);
        renderRelationReference();
      } else if (basisTaskActive()) {
        state.basisTarget = calculationTargetValue(refs.calculationTarget.value);
        state.basisBasis = calculationBasisValue(state.basisTarget, state.basisBasis);
        state.basisPageStart = '0';
        syncCalculationBasisOptions();
        renderBasisReference();
      } else {
        state.calculationTarget = calculationTargetValue(refs.calculationTarget.value);
        syncCalculationBasisOptions();
        markCalculationStale();
      }
      refreshExport();
    });
    refs.calculationBasis?.addEventListener('change', () => {
      if (basisTaskActive()) {
        state.basisBasis = calculationBasisValue(state.basisTarget, refs.calculationBasis.value);
        state.basisPageStart = '0';
        renderBasisReference();
      } else {
        state.calculationBasis = calculationBasisValue(state.calculationTarget, refs.calculationBasis.value);
        markCalculationStale();
      }
      refreshExport();
    });
    refs.calculationBasisPrevious?.addEventListener('click', () => setBasisPageStart(refs.calculationBasisPrevious.dataset.pageStart));
    refs.calculationBasisNext?.addEventListener('click', () => setBasisPageStart(refs.calculationBasisNext.dataset.pageStart));
    refs.calculationBasisGo?.addEventListener('click', goToBasisPage);
    refs.calculationBasisPage?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        goToBasisPage();
      }
    });
    refs.calculate?.addEventListener('click', calculateCurrentWord);
    refs.calculationModeControl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-calculation-mode]');
      if (button) setCalculationPresentation(button.dataset.calculationMode, state.calculationPresentationScope);
    });
    refs.calculationScopeControl?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-calculation-scope]');
      if (button && !button.disabled) setCalculationPresentation(state.calculationPresentationMode, button.dataset.calculationScope);
    });
    refs.copyCalculationLatex?.addEventListener('click', () => copyCalculationText(calculationLatexForCopy(), 'Calculation LaTeX copied.'));
    refs.copyCalculationResult?.addEventListener('click', () => copyCalculationText(state.calculationPlain, 'Calculation result copied.'));
  }

  function handleBasicInfoControlChange(event) {
    if (event.target?.id === 'strand-basic-expression-format') {
      state.basicExpressionFormat = basicExpressionFormatValue(event.target.value);
      renderAll({ preserveMessage: true });
      return;
    }
    if (event.target?.id === 'strand-basic-reduced-only') {
      state.basicReducedOnly = event.target.checked;
      renderAll({ preserveMessage: true });
    }
  }

  function bindInputChart() {
    if (!refs.inputChart) return;
    refs.inputChart.addEventListener('click', (event) => {
      if (Date.now() < suppressInputChartClickUntil) return;
      const chip = event.target.closest('[data-generator-family]');
      if (!chip) return;
      const generator = generatorRecordFromChip(chip);
      if (!validGenerator(generator)) return;
      addGenerator(generator);
    });

    refs.inputChart.addEventListener('pointerdown', (event) => {
      const chip = event.target.closest('[data-generator-family]');
      if (!chip || event.button !== 0) return;
      const generator = generatorRecordFromChip(chip);
      if (!validGenerator(generator)) return;
      state.dragInput = {
        source: 'chart',
        generator,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        ghost: null,
        insertIndex: null,
        guideLayer: null
      };
      document.addEventListener('pointermove', handleInputChartDragMove, { passive: false });
      document.addEventListener('pointerup', finishInputChartDrag, { passive: false });
      document.addEventListener('pointercancel', finishInputChartDrag, { passive: false });
    });
  }

  function bindCanvasGeneratorDrag() {
    const canvas = refs.canvas;
    if (!canvas) return;
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || state.dragInput) return;
      const hit = canvasGeneratorHitFromPointer(event.clientX, event.clientY);
      if (!hit) return;
      event.preventDefault();
      state.dragInput = {
        source: 'canvas',
        generator: hit.generator,
        sourceIndex: hit.sourceIndex,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        ghost: null,
        insertIndex: null,
        guideLayer: null,
        removed: false
      };
      document.addEventListener('pointermove', handleCanvasGeneratorDragMove, { passive: false });
      document.addEventListener('pointerup', finishCanvasGeneratorDrag, { passive: false });
      document.addEventListener('pointercancel', finishCanvasGeneratorDrag, { passive: false });
    });
  }

  function updateGeneratorSpacingFromControl() {
    state.generatorSpacing = generatorSpacingValue(refs.generatorSpacing.value);
    setStatus(`generator spacing: ${formatGeneratorSpacing(state.generatorSpacing)}`);
    renderAll({ preserveMessage: true });
  }

  function updateFixedGeneratorSizeFromControl() {
    state.fixedGeneratorSize = fixedGeneratorSizeValue(refs.fixedGeneratorSize.value);
    setStatus(`generator size: ${state.fixedGeneratorSize}px`);
    renderAll({ preserveMessage: true });
  }

  function bindRangePointer(input, onUpdate) {
    if (!input) return;
    let activePointerId = null;
    input.addEventListener('pointerdown', (event) => {
      if (event.button != null && event.button !== 0) return;
      activePointerId = event.pointerId;
      event.preventDefault();
      event.stopPropagation();
      input.focus({ preventScroll: true });
      if (input.setPointerCapture) {
        try { input.setPointerCapture(activePointerId); } catch (_) {}
      }
      updateRangeFromPointer(input, event.clientX, onUpdate);
    });
    input.addEventListener('pointermove', (event) => {
      if (event.pointerId !== activePointerId) return;
      event.preventDefault();
      event.stopPropagation();
      updateRangeFromPointer(input, event.clientX, onUpdate);
    });
    input.addEventListener('pointerup', finish);
    input.addEventListener('pointercancel', finish);
    input.addEventListener('dragstart', (event) => event.preventDefault());

    function finish(event) {
      if (event.pointerId !== activePointerId) return;
      if (input.releasePointerCapture) {
        try { input.releasePointerCapture(activePointerId); } catch (_) {}
      }
      activePointerId = null;
    }
  }

  function updateRangeFromPointer(input, clientX, onUpdate) {
    const next = rangeValueFromPointer(input, clientX);
    input.value = String(next);
    onUpdate();
  }

  function rangeValueFromPointer(input, clientX) {
    const rect = input.getBoundingClientRect();
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const rawStep = input.step === 'any' ? 0 : Number(input.step || 1);
    const span = max - min;
    const ratio = rect.width <= 0 ? 0 : Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * span;
    const stepped = rawStep > 0 ? min + Math.round((raw - min) / rawStep) * rawStep : raw;
    return Number(Math.max(min, Math.min(max, stepped)).toFixed(5));
  }

  function handleInputChartDragMove(event) {
    const drag = state.dragInput;
    if (!drag || drag.source !== 'chart' || event.pointerId !== drag.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance < 6) return;
    event.preventDefault();
    if (!drag.dragging) {
      drag.dragging = true;
      drag.ghost = createGeneratorGhost(drag.generator);
      document.body.classList.add('strand-generator-dragging');
      suppressInputChartClickUntil = Date.now() + 500;
    }
    moveGeneratorGhost(drag.ghost, event.clientX, event.clientY);
    const insertion = canvasInsertionFromPointer(event.clientX, event.clientY);
    drag.insertIndex = insertion ? insertion.insertIndex : null;
    drag.guideLayer = insertion ? insertion.guideLayer : null;
    renderAll({ preserveMessage: true });
  }

  function finishInputChartDrag(event) {
    const drag = state.dragInput;
    if (!drag || drag.source !== 'chart' || (event && event.pointerId !== drag.pointerId)) return;
    document.removeEventListener('pointermove', handleInputChartDragMove);
    document.removeEventListener('pointerup', finishInputChartDrag);
    document.removeEventListener('pointercancel', finishInputChartDrag);
    if (drag.ghost) drag.ghost.remove();
    document.body.classList.remove('strand-generator-dragging');

    const generator = drag.generator;
    const insertIndex = drag.insertIndex;
    const wasDragging = drag.dragging;
    state.dragInput = null;
    if (wasDragging) {
      suppressInputChartClickUntil = Date.now() + 500;
      if (event) event.preventDefault();
      if (Number.isInteger(insertIndex)) insertGeneratorAt(generator, insertIndex);
      else {
        setStatus(`drop ${inlineMath(generatorLatex(generator))} on the strand canvas to insert it`);
        renderAll({ preserveMessage: true });
      }
      return;
    }
  }

  function handleCanvasGeneratorDragMove(event) {
    const drag = state.dragInput;
    if (!drag || drag.source !== 'canvas' || event.pointerId !== drag.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance < 6) return;
    event.preventDefault();
    if (!drag.dragging) {
      drag.dragging = true;
      drag.ghost = createGeneratorGhost(drag.generator);
      document.body.classList.add('strand-generator-dragging');
      removeDraggedCanvasGenerator(drag);
    }
    moveGeneratorGhost(drag.ghost, event.clientX, event.clientY);
    const insertion = canvasInsertionFromPointer(event.clientX, event.clientY);
    drag.insertIndex = insertion ? insertion.insertIndex : null;
    drag.guideLayer = insertion ? insertion.guideLayer : null;
    renderAll({ preserveMessage: true });
  }

  function finishCanvasGeneratorDrag(event) {
    const drag = state.dragInput;
    if (!drag || drag.source !== 'canvas' || (event && event.pointerId !== drag.pointerId)) return;
    document.removeEventListener('pointermove', handleCanvasGeneratorDragMove);
    document.removeEventListener('pointerup', finishCanvasGeneratorDrag);
    document.removeEventListener('pointercancel', finishCanvasGeneratorDrag);
    if (drag.ghost) drag.ghost.remove();
    document.body.classList.remove('strand-generator-dragging');

    const generator = drag.generator;
    const insertIndex = drag.insertIndex;
    const sourceIndex = drag.sourceIndex;
    const wasDragging = drag.dragging;
    const wasCancelled = event?.type === 'pointercancel';
    state.dragInput = null;
    if (!wasDragging) return;

    if (event) event.preventDefault();
    suppressInputChartClickUntil = Date.now() + 500;
    if (wasCancelled) {
      restoreDraggedCanvasGenerator(drag);
      setStatus(`kept ${inlineMath(generatorLatex(generator))}`);
      renderAll({ preserveMessage: true });
      return;
    }

    if (Number.isInteger(insertIndex)) {
      insertGeneratorAt(generator, insertIndex, `moved ${inlineMath(generatorLatex(generator))} to word position ${insertIndex + 1}`);
      return;
    }

    setStatus(`deleted ${inlineMath(generatorLatex(generator))} from word position ${sourceIndex + 1}`);
    renderAll({ preserveMessage: true });
  }

  function removeDraggedCanvasGenerator(drag) {
    if (drag.removed) return;
    let index = Math.max(0, Math.min(state.appliedSteps.length - 1, drag.sourceIndex));
    if (!sameGeneratorRecord(state.appliedSteps[index], drag.generator)) {
      index = state.appliedSteps.findIndex((step) => sameGeneratorRecord(step, drag.generator));
    }
    if (index < 0) return;
    drag.sourceIndex = index;
    state.appliedSteps.splice(index, 1);
    drag.removed = true;
  }

  function restoreDraggedCanvasGenerator(drag) {
    if (!drag.removed) return;
    const index = Math.max(0, Math.min(state.appliedSteps.length, drag.sourceIndex));
    state.appliedSteps.splice(index, 0, drag.generator);
  }

  function createGeneratorGhost(generator) {
    const ghost = document.createElement('div');
    ghost.className = 'strand-generator-drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = inlineMath(generatorLatex(generator));
    document.body.appendChild(ghost);
    typesetMathNodes([ghost]);
    return ghost;
  }

  function moveGeneratorGhost(ghost, clientX, clientY) {
    if (!ghost) return;
    ghost.style.left = `${clientX + 10}px`;
    ghost.style.top = `${clientY + 10}px`;
  }

  function bindCards() {
    if (window.CalculatorCards) {
      window.CalculatorCards.init({
        side: '#cards',
        manualWideButtons: true,
        onWideChange(card) {
          if (card?.id !== 'strand-calculation-card') return;
          if (relationTaskActive()) renderRelationReference();
          else if (basisTaskActive()) renderBasisReference();
          else if (state.calculationResult) renderCalculationResult();
        }
      });
      window.CalculatorCards.setWide(refs.calculationCard, true, { notify: false });
      window.CalculatorCards.setCardCollapsed(refs.calculationCard, false, { refreshOnOpen: false });
      window.addEventListener('resize', () => window.CalculatorCards.syncWideCards(document));
      return;
    }
    let suppressCardToggleUntil = 0;
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('dragstart', (event) => event.preventDefault());
    });

    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < suppressCardToggleUntil) return;
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
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(pointerId); } catch (_) {}
      }
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
        suppressCardToggleUntil = Date.now() + 500;
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
      if (!dragCard || (event && event.pointerId !== pointerId)) return;
      if (event) event.preventDefault();
      document.removeEventListener('pointermove', handleCardDragMove, pointerOptions);
      document.removeEventListener('pointerup', finishCardDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishCardDrag, pointerOptions);
      document.body.classList.remove('card-dragging');
      if (dragging && placeholder) {
        dragCard.style.display = '';
        side.insertBefore(dragCard, placeholder);
        placeholder.remove();
        if (ghost) ghost.remove();
        suppressCardToggleUntil = Date.now() + 500;
      }
      if (dragCard) dragCard.classList.remove('dragging');
      dragCard = null;
      placeholder = null;
      ghost = null;
      pointerId = null;
      dragging = false;
    }
  }

  function getCardAfterPointer(side, y, dragCard, placeholder) {
    const cards = [...side.querySelectorAll('.card')]
      .filter((card) => card !== dragCard && card !== placeholder);
    return cards.reduce((closest, card) => {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: card };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function commitGroupType() {
    const previous = state.groupType;
    state.groupType = groupTypeValue(refs.groupType.value);
    const nextCount = cleanRankForGroup(refs.count.value, state.groupType);
    const before = state.appliedSteps.length;
    state.strandCount = nextCount;
    refs.count.value = String(nextCount);
    state.appliedSteps = filterValidSteps(state.appliedSteps, nextCount, state.groupType);
    const removed = before - state.appliedSteps.length;
    const changed = previous !== state.groupType;
    setStatus(`${changed ? 'group' : 'rank'} set to ${groupPlainLabel(state.groupType, state.strandCount)}${removed ? `; dropped ${removed} invalid generator${removed === 1 ? '' : 's'}` : ''}`);
    renderAll({ preserveMessage: true });
  }

  function commitStrandCount() {
    const next = cleanRankForGroup(refs.count.value, state.groupType);
    state.strandCount = next;
    refs.count.value = String(next);
    const before = state.appliedSteps.length;
    state.appliedSteps = filterValidSteps(state.appliedSteps, next, state.groupType);
    const removed = before - state.appliedSteps.length;
    setStatus(removed ? `${rankNoun()} set to ${next}; dropped ${removed} invalid generator${removed === 1 ? '' : 's'}` : `${rankNoun()} set to ${next}`);
    renderAll({ preserveMessage: true });
  }

  function syncGeneratorBounds() {
    if (!refs.generator) return;
    const min = signedGroupActive() ? 0 : 1;
    const max = Math.max(1, state.strandCount - 1);
    refs.generator.min = String(min);
    refs.generator.max = String(max);
    if (!generatorValuesForState().length) {
      refs.generator.value = String(min);
      return;
    }
    const value = clampInteger(refs.generator.value, min, max, min);
    refs.generator.value = String(value);
  }

  function syncControls() {
    state.groupType = groupTypeValue(state.groupType);
    refs.groupType.value = state.groupType;
    state.strandCount = cleanRankForGroup(state.strandCount, state.groupType);
    refs.count.value = String(state.strandCount);
    refs.count.min = String(rankBoundsForGroup(state.groupType).min);
    if (refs.countLabel) refs.countLabel.textContent = signedGroupActive() ? 'rank' : 'strands';
    refs.direction.value = state.direction;
    state.strandDisplayStyle = strandDisplayStyleValue(state.strandDisplayStyle);
    state.generatorSpacing = generatorSpacingValue(state.generatorSpacing);
    state.generatorGapEnabled = !!state.generatorGapEnabled;
    state.strandSizeMode = strandSizeModeValue(state.strandSizeMode);
    state.fixedGeneratorSize = fixedGeneratorSizeValue(state.fixedGeneratorSize);
    refs.displayStyle.value = state.strandDisplayStyle;
    refs.generatorSpacing.value = String(state.generatorSpacing);
    refs.generatorSpacingValue.textContent = formatGeneratorSpacing(state.generatorSpacing);
    refs.generatorGapEnabled.checked = state.generatorGapEnabled;
    refs.sizeMode.value = state.strandSizeMode;
    refs.fixedGeneratorSize.value = String(state.fixedGeneratorSize);
    refs.fixedGeneratorSizeValue.textContent = `${state.fixedGeneratorSize}px`;
    const fixedMode = state.strandSizeMode === 'fixed';
    refs.fixedGeneratorSize.disabled = !fixedMode;
    if (refs.fixedGeneratorSizeRow) refs.fixedGeneratorSizeRow.classList.toggle('is-disabled', !fixedMode);
    clearMathTypesetTargets(refs.statusBadge, refs.inputChart, refs.calculationSource);
    refs.statusBadge.textContent = inlineMath(groupLatex(state.groupType, state.strandCount));
    refs.clear.disabled = state.appliedSteps.length === 0;
    syncGeneratorBounds();
    syncBasicInfoControls();
    syncCalculationControls();
    renderInputChart();
  }

  function calculationTaskValue(value) {
    return CALCULATION_TASKS.has(value) ? value : 'strand';
  }

  function relationTaskActive() {
    return calculationTaskValue(state.calculationTask) === 'relations';
  }

  function basisTaskActive() {
    return calculationTaskValue(state.calculationTask) === 'basis';
  }

  function syncCalculationTaskControls() {
    state.calculationTask = calculationTaskValue(state.calculationTask);
    const relations = relationTaskActive();
    const basis = basisTaskActive();
    const reference = relations || basis;
    if (refs.calculationTask) refs.calculationTask.value = state.calculationTask;
    if (refs.calculationSourceRow) refs.calculationSourceRow.hidden = reference;
    if (refs.calculationBasisRow) refs.calculationBasisRow.hidden = relations;
    if (refs.calculationScopeControl) refs.calculationScopeControl.hidden = reference;
    if (refs.calculate) refs.calculate.hidden = reference;
    if (refs.copyCalculationLatex) refs.copyCalculationLatex.hidden = reference;
    if (refs.copyCalculationResult) refs.copyCalculationResult.hidden = reference;
    if (refs.calculationMessage) refs.calculationMessage.hidden = reference;
    if (refs.calculationRelationsSurface) refs.calculationRelationsSurface.hidden = !relations;
    if (refs.calculationBasisSurface) refs.calculationBasisSurface.hidden = !basis;
    if (refs.calculationSurface) refs.calculationSurface.hidden = reference;
    if (refs.calculationPresentation) refs.calculationPresentation.classList.toggle('is-reference', reference);
    if (refs.calculationActions) refs.calculationActions.classList.toggle('is-reference', reference);
  }

  function setCalculationTask(value) {
    const next = calculationTaskValue(value);
    state.calculationTask = next;
    syncCalculationControls();
    if (next === 'relations') {
      renderRelationReference();
    } else if (next === 'basis') {
      state.basisPageStart = '0';
      renderBasisReference();
    } else {
      if (state.calculationResult) renderCalculationResult();
      else clearCalculationResultDisplay();
    }
    refreshExport();
  }

  function syncCalculationControls() {
    state.calculationTask = calculationTaskValue(state.calculationTask);
    state.calculationTarget = calculationTargetValue(state.calculationTarget);
    state.relationTarget = calculationTargetValue(state.relationTarget);
    state.basisTarget = calculationTargetValue(state.basisTarget);
    state.basisBasis = calculationBasisValue(state.basisTarget, state.basisBasis);
    if (refs.calculationTarget) {
      refs.calculationTarget.value = relationTaskActive()
        ? state.relationTarget
        : basisTaskActive() ? state.basisTarget : state.calculationTarget;
    }
    syncCalculationBasisOptions();
    syncCalculationPresentationControls();
    syncCalculationTaskControls();
    if (refs.calculationSource) refs.calculationSource.textContent = calculationSourceTypesetLabel();
  }

  function syncCalculationBasisOptions() {
    if (!refs.calculationBasis) return;
    const target = basisTaskActive() ? state.basisTarget : state.calculationTarget;
    const choices = CALCULATION_BASES[target] || CALCULATION_BASES.tl;
    const selected = basisTaskActive()
      ? calculationBasisValue(target, state.basisBasis)
      : calculationBasisValue(target, state.calculationBasis);
    if (basisTaskActive()) state.basisBasis = selected;
    else state.calculationBasis = selected;
    refs.calculationBasis.innerHTML = choices
      .map((choice) => `<option value="${escapeHtml(choice.value)}">${escapeHtml(choice.label)}</option>`)
      .join('');
    refs.calculationBasis.value = selected;
  }

  function calculationPresentationModeValue(value) {
    return CALCULATION_PRESENTATION_MODES.has(value) ? value : 'symbolic';
  }

  function calculationPresentationScopeValue(value) {
    return CALCULATION_PRESENTATION_SCOPES.has(value) ? value : 'all';
  }

  function syncCalculationPresentationControls() {
    state.calculationPresentationMode = calculationPresentationModeValue(state.calculationPresentationMode);
    state.calculationPresentationScope = calculationPresentationScopeValue(state.calculationPresentationScope);
    refs.calculationModeControl?.querySelectorAll('[data-calculation-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.calculationMode === state.calculationPresentationMode));
    });
    const diagrammatic = state.calculationPresentationMode === 'diagrammatic';
    refs.calculationScopeControl?.classList.toggle('is-disabled', !diagrammatic);
    refs.calculationScopeControl?.querySelectorAll('[data-calculation-scope]').forEach((button) => {
      button.disabled = !diagrammatic;
      button.setAttribute('aria-pressed', String(button.dataset.calculationScope === state.calculationPresentationScope));
    });
  }

  function setCalculationPresentation(mode, scope) {
    const nextMode = calculationPresentationModeValue(mode);
    const nextScope = calculationPresentationScopeValue(scope);
    const changed = nextMode !== state.calculationPresentationMode || nextScope !== state.calculationPresentationScope;
    state.calculationPresentationMode = nextMode;
    state.calculationPresentationScope = nextScope;
    syncCalculationPresentationControls();
    if (changed && relationTaskActive()) renderRelationReference();
    else if (changed && basisTaskActive()) renderBasisReference();
    else if (changed && state.calculationResult) renderCalculationResult();
    if (changed) refreshExport();
  }

  function syncBasicInfoControls() {
    const format = basicExpressionFormatValue(state.basicExpressionFormat);
    state.basicExpressionFormat = format;
    if (refs.basicExpressionFormat) refs.basicExpressionFormat.value = format;

    const reducedAvailable = basicReducedApplies(format) && currentWordIsCoxeterOnly();
    if (refs.basicReducedOnly) {
      refs.basicReducedOnly.checked = reducedAvailable && state.basicReducedOnly;
      refs.basicReducedOnly.disabled = !reducedAvailable;
      refs.basicReducedOnly.title = reducedAvailable
        ? 'Show a canonical reduced expression for this permutation.'
        : 'Reduced display is available for composition words and transpositions.';
    }

    const label = refs.basicReducedOnly?.closest('.strand-basic-reduced-toggle');
    if (label) {
      label.classList.toggle('is-disabled', !reducedAvailable);
      label.title = refs.basicReducedOnly?.title || '';
    }
  }

  function addGeneratorFromInput() {
    if (!generatorValuesForState().length) {
      setStatus(`${groupPlainLabel()} has only the identity.`);
      renderAll({ preserveMessage: true });
      return;
    }
    const min = signedGroupActive() ? 0 : 1;
    const max = state.strandCount - 1;
    const generator = clampInteger(refs.generator.value, min, max, min);
    refs.generator.value = String(generator);
    addGenerator(generator);
  }

  function addGenerator(generator) {
    const record = normalizeGeneratorRecord(generator);
    insertGeneratorAt(record, state.appliedSteps.length, `added ${inlineMath(generatorLatex(record))}`);
  }

  function insertGeneratorAt(generator, index, message) {
    const record = normalizeGeneratorRecord(generator);
    if (!validGenerator(record)) {
      setStatus('choose a valid adjacent generator');
      renderAll({ preserveMessage: true });
      return;
    }
    const insertIndex = Math.max(0, Math.min(state.appliedSteps.length, Number.isInteger(index) ? index : state.appliedSteps.length));
    state.appliedSteps.splice(insertIndex, 0, record);
    setStatus(message || `inserted ${inlineMath(generatorLatex(record))} at word position ${insertIndex + 1}`);
    renderAll({ preserveMessage: true });
  }

  function undoStep() {
    if (!state.appliedSteps.length) return;
    const removed = state.appliedSteps.pop();
    setStatus(`removed ${inlineMath(generatorLatex(removed))}`);
    renderAll({ preserveMessage: true });
  }

  function clearSteps() {
    if (!state.appliedSteps.length) return;
    state.appliedSteps = [];
    setStatus('cleared strand word');
    renderAll({ preserveMessage: true });
  }

  function renderInputChart() {
    if (!refs.inputChart) return;
    const indices = generatorValuesForState();
    if (!indices.length) {
      refs.inputChart.innerHTML = `<div class="strand-note">${escapeHtml(inlineMath(groupLatex()))} has no available generators.</div>`;
      return;
    }
    refs.inputChart.innerHTML = GENERATOR_FAMILY_SECTIONS
      .map((section) => {
        const records = generatorRecordsForFamily(section.family, indices);
        const chips = records.map(generatorChipMarkup).join('');
        return `
          <div class="strand-generator-family">
            <div class="strand-generator-family-title">${escapeHtml(section.title)}</div>
            <div class="strand-generator-family-chips">${chips}</div>
          </div>
        `;
      })
      .join('');
  }

  function renderAll(options = {}) {
    syncControls();
    resizeCanvas();
    const data = buildPermutationData();
    renderCanvas(data);
    renderBasicInfo(data);
    syncCalculationResultState();
    refreshExport(data);
    renderSummary(data);
    if (!options.preserveMessage && refs.exportMessage) refs.exportMessage.textContent = '';
    queueMathTypeset();
    if (basisTaskActive()) renderBasisReference();
  }

  function renderSummary(data) {
    const length = data.wordRecords.length;
    clearMathTypesetTargets(refs.summary);
    refs.summary.textContent = length
      ? `${length} generator${length === 1 ? '' : 's'}; ${data.coxeterOnly ? inlineMath(`w=${oneLineLatex(data)}`) : inlineMath(generatorWordLatex(data.wordRecords, true))}`
      : `identity in ${inlineMath(groupLatex(data.groupType, data.n))}`;
  }

  function resizeCanvas() {
    const canvas = refs.canvas;
    if (!canvas) return;
    const { width, height, scrollAxes } = desiredCanvasSize(canvas);
    syncStageOverflow(scrollAxes);
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.setProperty('width', `${width}px`, 'important');
    canvas.style.setProperty('height', `${height}px`, 'important');
    if (state.strandSizeMode === 'fixed') canvas.style.setProperty('min-height', '0', 'important');
    else canvas.style.removeProperty('min-height');
    state.canvasWidth = width;
    state.canvasHeight = height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    syncFixedInputAnchorScroll();
    if (window.requestAnimationFrame) window.requestAnimationFrame(syncFixedInputAnchorScroll);
  }

  function desiredCanvasSize(canvas) {
    const stage = refs.stage || canvas.parentElement;
    const stageRect = stage?.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const baseWidth = Math.max(320, Math.round(stage?.clientWidth || stageRect?.width || canvasRect.width || canvas.clientWidth || 900));
    const baseHeight = fitCanvasHeight();
    if (state.strandSizeMode !== 'fixed') return { width: baseWidth, height: baseHeight, scrollAxes: { x: false, y: false } };

    const data = buildPermutationData();
    const view = canvasView(data);
    const layout = strandLayerLayout(view.steps.length);
    const margins = canvasMargins(baseWidth, baseHeight);
    const trackSpan = fixedTrackSpan(view.tracks.length);
    const layerSpan = fixedLayerSpan(layout.total);
    const vertical = isVerticalDirection();
    const width = Math.round(margins.left + margins.right + (vertical ? trackSpan : layerSpan));
    const height = Math.round(margins.top + margins.bottom + (vertical ? layerSpan : trackSpan));
    return {
      width,
      height,
      scrollAxes: {
        x: width > baseWidth + 1,
        y: height > baseHeight + 1
      }
    };
  }

  function syncStageOverflow(scrollAxes) {
    const stage = refs.stage || refs.canvas?.parentElement;
    if (!stage) return;
    stage.classList.toggle('is-scroll-x', !!scrollAxes?.x);
    stage.classList.toggle('is-scroll-y', !!scrollAxes?.y);
  }

  function syncFixedInputAnchorScroll() {
    const stage = refs.stage || refs.canvas?.parentElement;
    if (!stage) return;
    if (state.strandSizeMode !== 'fixed') {
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      return;
    }
    if (isVerticalDirection()) {
      stage.scrollTop = state.direction === 'down-up'
        ? Math.max(0, stage.scrollHeight - stage.clientHeight)
        : 0;
      return;
    }
    stage.scrollLeft = state.direction === 'right-left'
      ? Math.max(0, stage.scrollWidth - stage.clientWidth)
      : 0;
  }

  function fixedTrackSpan(trackCount) {
    return Math.max(1, trackCount - 1) * state.fixedGeneratorSize;
  }

  function fixedTrackOffset(trackIndex, trackCount) {
    if (trackCount <= 1) return fixedTrackSpan(trackCount) / 2;
    return trackIndex * state.fixedGeneratorSize;
  }

  function fixedLayerSpan(layerMax) {
    return Math.max(1, layerMax) * state.fixedGeneratorSize;
  }

  function fixedLayerOffset(layerPosition) {
    return layerPosition * state.fixedGeneratorSize;
  }

  function fixedGeometryActive() {
    return state.strandSizeMode === 'fixed';
  }

  function fitCanvasHeight() {
    const mobile = window.matchMedia?.('(max-width: 780px)')?.matches;
    if (mobile) return 380;
    return Math.max(420, Math.round(Math.min(window.innerHeight * 0.64, 620)));
  }

  function buildPermutationData() {
    const groupType = groupTypeValue(state.groupType);
    return signedGroupActive(groupType)
      ? buildSignedPermutationData(groupType)
      : buildSymmetricPermutationData(groupType);
  }

  function buildSymmetricPermutationData(groupType) {
    const n = state.strandCount;
    const wordRecords = filterValidSteps(state.appliedSteps, n, groupType);
    const steps = coxeterStepsFromRecords(wordRecords);
    const coxeterOnly = wordIsCoxeterOnly(wordRecords);
    const tracks = Array.from({ length: n }, (_, index) => index + 1);
    const stepRecords = wordRecords.map((record, sourceIndex) => diagramRecordForGenerator(record, sourceIndex, groupType, n));
    const order = applyDiagramRecordsToOrder(tracks, stepRecords);
    const imageBySource = new Map();
    const terminalOrderByPosition = new Map();

    tracks.forEach((position, index) => {
      const label = order[index];
      terminalOrderByPosition.set(position, label);
      if (label !== position) imageBySource.set(label, position);
    });

    const components = coxeterOnly ? buildComponentStates(steps) : [];
    const inversionCount = coxeterOnly ? countInversions(order) : null;
    const isReduced = coxeterOnly ? steps.length === inversionCount : null;
    const fullPermutation = n <= ONE_LINE_DISPLAY_LIMIT ? fullPermutationArray(n, imageBySource) : null;
    const fullTerminalOrder = n <= CANVAS_STRAND_LIMIT ? fullTerminalOrderArray(n, terminalOrderByPosition) : null;
    const oneLinePlain = fullPermutation
      ? `(${fullPermutation.join(',')})`
      : compactMappingPlain(imageBySource, n);
    const cycles = cyclesFromSparseMap(imageBySource);
    const canonicalSteps = coxeterOnly && inversionCount <= REDUCED_WORD_GENERATION_LIMIT
      ? canonicalStepsFromComponents(components)
      : null;

    return {
      groupType,
      signed: false,
      n,
      rank: n,
      tracks,
      wordRecords,
      steps,
      stepRecords,
      components,
      imageBySource,
      terminalOrderByPosition,
      inversionCount,
      length: inversionCount,
      isReduced,
      fullPermutation,
      fullTerminalOrder,
      oneLinePlain,
      cycles,
      canonicalSteps,
      coxeterOnly
    };
  }

  function buildSignedPermutationData(groupType) {
    const n = state.strandCount;
    const wordRecords = filterValidSteps(state.appliedSteps, n, groupType);
    const steps = coxeterStepsFromRecords(wordRecords);
    const coxeterOnly = wordIsCoxeterOnly(wordRecords);
    const tracks = signedTrackLabels(n);
    const stepRecords = wordRecords.map((record, sourceIndex) => diagramRecordForGenerator(record, sourceIndex, groupType, n));
    const order = applyDiagramRecordsToOrder(tracks, stepRecords);

    const imageBySource = new Map();
    const terminalOrderByPosition = new Map();
    tracks.forEach((position, index) => {
      const label = order[index];
      terminalOrderByPosition.set(position, label);
      if (label !== position) imageBySource.set(label, position);
    });

    const signedOneLine = Array.from({ length: n }, (_, index) => imageBySource.get(index + 1) || index + 1);
    const length = coxeterOnly ? signedLength(signedOneLine, groupType) : null;
    const isReduced = coxeterOnly ? steps.length === length : null;
    const fullPermutation = n <= ONE_LINE_DISPLAY_LIMIT ? signedOneLine : null;
    const fullTerminalOrder = tracks.length <= CANVAS_STRAND_LIMIT ? order.slice() : null;
    const oneLinePlain = n <= ONE_LINE_DISPLAY_LIMIT
      ? `(${signedOneLine.map(signedLabelPlain).join(',')})`
      : compactSignedMappingPlain(signedOneLine, groupType, n);
    const cycles = cyclesFromSignedMap(imageBySource, n);
    const canonicalSteps = coxeterOnly && length <= REDUCED_WORD_GENERATION_LIMIT
      ? canonicalSignedSteps(signedOneLine, groupType)
      : null;

    return {
      groupType,
      signed: true,
      n,
      rank: n,
      tracks,
      wordRecords,
      steps,
      stepRecords,
      components: [],
      imageBySource,
      terminalOrderByPosition,
      inversionCount: length,
      length,
      isReduced,
      fullPermutation,
      fullTerminalOrder,
      signedOneLine,
      oneLinePlain,
      cycles,
      canonicalSteps,
      coxeterOnly
    };
  }

  function buildComponentStates(steps) {
    if (!steps.length) return [];
    const uniqueEdges = [...new Set(steps)].sort((a, b) => a - b);
    const components = [];
    uniqueEdges.forEach((edge) => {
      const last = components[components.length - 1];
      if (last && edge <= last.end) {
        last.end = Math.max(last.end, edge + 1);
      } else {
        components.push({ start: edge, end: edge + 1, order: [] });
      }
    });

    const edgeToComponent = new Map();
    components.forEach((component, index) => {
      const length = component.end - component.start + 1;
      component.order = Array.from({ length }, (_, offset) => component.start + offset);
      uniqueEdges.forEach((edge) => {
        if (edge >= component.start && edge < component.end) edgeToComponent.set(edge, index);
      });
    });

    steps.forEach((step) => {
      const component = components[edgeToComponent.get(step)];
      if (!component) return;
      const local = step - component.start;
      const next = local + 1;
      const swap = component.order[local];
      component.order[local] = component.order[next];
      component.order[next] = swap;
    });

    return components;
  }

  function fullPermutationArray(n, imageBySource) {
    return Array.from({ length: n }, (_, index) => imageBySource.get(index + 1) || index + 1);
  }

  function fullTerminalOrderArray(n, terminalOrderByPosition) {
    return Array.from({ length: n }, (_, index) => terminalOrderByPosition.get(index + 1) || index + 1);
  }

  function signedTrackLabels(n) {
    const negative = Array.from({ length: n }, (_, index) => -n + index);
    const positive = Array.from({ length: n }, (_, index) => index + 1);
    return negative.concat(positive);
  }

  function trackIndexMap(tracks) {
    return new Map(tracks.map((label, index) => [label, index]));
  }

  function diagramRecordForGenerator(generator, sourceIndex, groupType, n) {
    const record = normalizeGeneratorRecord(generator);
    const index = record?.index ?? 1;
    return {
      generator: record,
      family: record?.family || 'coxeter',
      index,
      sign: record?.family === 'braid' ? record.sign : 1,
      sourceIndex,
      pairs: generatorSwapPairs(groupType, n, index),
      shouldSwap: record?.family === 'coxeter' || record?.family === 'braid'
    };
  }

  function applyDiagramRecordsToOrder(tracks, records) {
    const trackIndex = trackIndexMap(tracks);
    let order = tracks.slice();
    records.forEach((record) => {
      if (record.shouldSwap === false) return;
      order = applySwapPairsToOrder(order, record.pairs, trackIndex);
    });
    return order;
  }

  function generatorSwapPairs(groupType, n, generator) {
    if (!signedGroupActive(groupType)) return [[generator, generator + 1]];
    if (generator === 0) {
      return groupType === 'D'
        ? [[-2, 1], [-1, 2]]
        : [[-1, 1]];
    }
    return [[-(generator + 1), -generator], [generator, generator + 1]];
  }

  function applySwapPairsToOrder(order, pairs, trackIndex) {
    const next = order.slice();
    pairs.forEach(([leftTrack, rightTrack]) => {
      const left = trackIndex.get(leftTrack);
      const right = trackIndex.get(rightTrack);
      if (left == null || right == null) return;
      next[left] = order[right];
      next[right] = order[left];
    });
    return next;
  }

  function applyGeneratorToSignedOneLine(oneLine, groupType, generator) {
    const n = oneLine.length;
    const pairs = generatorSwapPairs(groupType, n, generator);
    return oneLine.map((value) => {
      for (const [left, right] of pairs) {
        if (value === left) return right;
        if (value === right) return left;
      }
      return value;
    });
  }

  function signedLength(oneLine, groupType) {
    let inversions = 0;
    let negativeSumPairs = 0;
    let negatives = 0;
    for (let i = 0; i < oneLine.length; i++) {
      if (oneLine[i] < 0) negatives++;
      for (let j = i + 1; j < oneLine.length; j++) {
        if (oneLine[i] > oneLine[j]) inversions++;
        if (oneLine[i] + oneLine[j] < 0) negativeSumPairs++;
      }
    }
    return inversions + negativeSumPairs + (groupType === 'D' ? 0 : negatives);
  }

  function canonicalSignedSteps(oneLine, groupType) {
    let current = oneLine.slice();
    let length = signedLength(current, groupType);
    const reductions = [];
    const limit = Math.max(REDUCED_WORD_GENERATION_LIMIT, length + 1);
    while (length > 0) {
      if (reductions.length > limit) return null;
      let found = false;
      for (let generator = 0; generator < current.length; generator++) {
        const next = applyGeneratorToSignedOneLine(current, groupType, generator);
        const nextLength = signedLength(next, groupType);
        if (nextLength < length) {
          reductions.push(generator);
          current = next;
          length = nextLength;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    return reductions.reverse();
  }

  function countInversions(values) {
    if (values.length < 2) return 0;
    const buffer = values.slice();
    const scratch = Array(values.length);
    return mergeCount(buffer, scratch, 0, values.length);
  }

  function mergeCount(values, scratch, start, end) {
    if (end - start <= 1) return 0;
    const mid = Math.floor((start + end) / 2);
    let count = mergeCount(values, scratch, start, mid) + mergeCount(values, scratch, mid, end);
    let left = start;
    let right = mid;
    let out = start;
    while (left < mid || right < end) {
      if (right >= end || (left < mid && values[left] <= values[right])) {
        scratch[out++] = values[left++];
      } else {
        scratch[out++] = values[right++];
        count += mid - left;
      }
    }
    for (let index = start; index < end; index++) values[index] = scratch[index];
    return count;
  }

  function canonicalStepsFromComponents(components) {
    const steps = [];
    components.forEach((component) => {
      const target = component.order.slice();
      const current = Array.from(
        { length: component.end - component.start + 1 },
        (_, offset) => component.start + offset
      );
      for (let targetIndex = 0; targetIndex < target.length; targetIndex++) {
        let currentIndex = current.indexOf(target[targetIndex]);
        while (currentIndex > targetIndex) {
          const step = component.start + currentIndex - 1;
          const swap = current[currentIndex - 1];
          current[currentIndex - 1] = current[currentIndex];
          current[currentIndex] = swap;
          steps.push(step);
          currentIndex--;
        }
      }
    });
    return steps;
  }

  function cyclesFromSparseMap(imageBySource) {
    const moved = [...imageBySource.keys()].sort((a, b) => a - b);
    const movedSet = new Set(moved);
    const seen = new Set();
    const cycles = [];
    moved.forEach((start) => {
      if (seen.has(start)) return;
      const cycle = [];
      let value = start;
      while (!seen.has(value)) {
        seen.add(value);
        cycle.push(value);
        value = imageBySource.get(value) || value;
      }
      if (cycle.length > 1 || movedSet.has(start)) cycles.push(cycle);
    });
    return cycles.filter((cycle) => cycle.length > 1);
  }

  function cyclesFromSignedMap(imageBySource, n) {
    const labels = signedTrackLabels(n);
    const seen = new Set();
    const cycles = [];
    labels.forEach((start) => {
      if (seen.has(start)) return;
      const cycle = [];
      let value = start;
      while (!seen.has(value)) {
        seen.add(value);
        cycle.push(value);
        value = imageBySource.get(value) || value;
      }
      if (cycle.length > 1) cycles.push(cycle);
    });
    return cycles;
  }

  function compactMappingPlain(imageBySource, n) {
    if (!imageBySource.size) return `identity in S_${n}`;
    const pairs = [...imageBySource.entries()]
      .sort(([a], [b]) => a - b)
      .slice(0, 12)
      .map(([source, image]) => `${source}->${image}`);
    const suffix = imageBySource.size > 12 ? ', ...' : '';
    return `w(i)=i except ${pairs.join(', ')}${suffix}`;
  }

  function compactSignedMappingPlain(oneLine, groupType, n) {
    const moved = oneLine
      .map((image, index) => ({ source: index + 1, image }))
      .filter((record) => record.image !== record.source);
    if (!moved.length) return `identity in ${groupPlainLabel(groupType, n)}`;
    const pairs = moved
      .slice(0, 12)
      .map((record) => `w(${record.source})=${signedLabelPlain(record.image)}`);
    const suffix = moved.length > 12 ? ', ...' : '';
    return `w(i)=i except ${pairs.join(', ')}${suffix}`;
  }

  function renderCanvas(data) {
    const canvas = refs.canvas;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const width = state.canvasWidth || canvas.clientWidth || 900;
    const height = state.canvasHeight || canvas.clientHeight || 560;
    ctx.clearRect(0, 0, width, height);
    drawCanvasBackground(ctx, width, height);

    const view = canvasView(data);
    drawCanvasFrame(ctx, width, height, view);
    if (!view.tracks.length) {
      drawCanvasMessage(ctx, width, height, `${groupPlainLabel(data.groupType, data.n)} identity`);
      return;
    }

    drawStrands(ctx, width, height, view);
    drawInsertionGuide(ctx, width, height, view);
    drawCanvasLegend(ctx, width, height, view);
  }

  function canvasView(data) {
    if (data.signed) return signedCanvasView(data);

    if (data.n <= CANVAS_STRAND_LIMIT) {
      const records = data.stepRecords.slice(0, MAX_CANVAS_STEPS);
      return {
        tracks: data.tracks.slice(),
        steps: records.map((record) => record.generator),
        records,
        sourceIndices: records.map((record) => record.sourceIndex),
        hiddenSteps: Math.max(0, data.stepRecords.length - MAX_CANVAS_STEPS),
        full: true,
        label: `${data.n} strand${data.n === 1 ? '' : 's'}`
      };
    }

    if (!data.stepRecords.length) {
      const limit = Math.min(CANVAS_STRAND_LIMIT, data.n);
      return {
        tracks: Array.from({ length: limit }, (_, index) => index + 1),
        steps: [],
        records: [],
        sourceIndices: [],
        hiddenSteps: 0,
        full: false,
        label: `first ${limit} of ${data.n} strands`
      };
    }

    const lastRecord = data.stepRecords[data.stepRecords.length - 1];
    const last = lastRecord?.index ?? data.steps[data.steps.length - 1] ?? 1;
    const component = data.coxeterOnly
      ? data.components.find((item) => last >= item.start && last < item.end) || data.components[0]
      : null;
    const span = component ? component.end - component.start + 1 : Math.min(data.n, CANVAS_STRAND_LIMIT);
    const center = last + 0.5;
    const half = Math.floor(CANVAS_STRAND_LIMIT / 2);
    const minStart = component ? component.start : 1;
    const maxEnd = component ? component.end : data.n;
    let start = Math.max(minStart, Math.floor(center) - half);
    let end = Math.min(maxEnd, start + CANVAS_STRAND_LIMIT - 1);
    start = Math.max(minStart, end - CANVAS_STRAND_LIMIT + 1);
    const tracks = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    const localStepRecords = data.stepRecords
      .filter((record) => record.pairs.every(([left, right]) => left >= start && left <= end && right >= start && right <= end))
      .slice(-MAX_CANVAS_STEPS);
    const localSteps = localStepRecords.map((record) => record.generator);
    const hiddenOutside = data.stepRecords.length - localSteps.length;
    return {
      tracks,
      steps: localSteps,
      records: localStepRecords,
      sourceIndices: localStepRecords.map((record) => record.sourceIndex),
      hiddenSteps: Math.max(0, hiddenOutside),
      full: false,
      label: component && span > tracks.length
        ? `active window ${start}-${end} in S_${data.n}`
        : component
          ? `active component ${component.start}-${component.end} in S_${data.n}`
          : `active window ${start}-${end} in S_${data.n}`
    };
  }

  function signedCanvasView(data) {
    const trackLimit = CANVAS_STRAND_LIMIT;
    if (data.tracks.length <= trackLimit) {
      const records = data.stepRecords.slice(0, MAX_CANVAS_STEPS);
      return {
        tracks: data.tracks.slice(),
        steps: records.map((record) => record.generator),
        records,
        sourceIndices: records.map((record) => record.sourceIndex),
        hiddenSteps: Math.max(0, data.stepRecords.length - MAX_CANVAS_STEPS),
        full: true,
        label: `${groupPlainLabel(data.groupType, data.n)} doubled strands`
      };
    }

    const window = signedTrackWindow(data, trackLimit);
    const tracks = data.tracks.slice(window.start, window.end);
    const visibleRecords = data.stepRecords
      .filter((record) => recordPairsInWindow(record, data.tracks, window.start, window.end))
      .slice(-MAX_CANVAS_STEPS);
    const hiddenSteps = Math.max(0, data.stepRecords.length - visibleRecords.length);
    return {
      tracks,
      steps: visibleRecords.map((record) => record.generator),
      records: visibleRecords,
      sourceIndices: visibleRecords.map((record) => record.sourceIndex),
      hiddenSteps,
      full: false,
      label: `active window in ${groupPlainLabel(data.groupType, data.n)}`
    };
  }

  function signedTrackWindow(data, limit) {
    const total = data.tracks.length;
    if (total <= limit) return { start: 0, end: total };
    const trackIndex = trackIndexMap(data.tracks);
    const last = data.stepRecords[data.stepRecords.length - 1];
    let center = Math.floor(total / 2);
    if (last) {
      const positions = last.pairs
        .flatMap((pair) => pair.map((track) => trackIndex.get(track)))
        .filter((index) => Number.isInteger(index));
      if (positions.length) {
        const min = Math.min(...positions);
        const max = Math.max(...positions);
        center = Math.round((min + max) / 2);
      }
    }
    let start = Math.max(0, center - Math.floor(limit / 2));
    let end = Math.min(total, start + limit);
    start = Math.max(0, end - limit);
    return { start, end };
  }

  function recordPairsInWindow(record, tracks, start, end) {
    const trackIndex = trackIndexMap(tracks);
    return record.pairs.every(([left, right]) => {
      const leftIndex = trackIndex.get(left);
      const rightIndex = trackIndex.get(right);
      return leftIndex >= start && leftIndex < end && rightIndex >= start && rightIndex < end;
    });
  }

  function drawCanvasBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(216, 208, 196, 0.38)';
    ctx.lineWidth = 1;
    const spacing = 28;
    for (let x = 0; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCanvasFrame(ctx, width, height, view) {
    ctx.save();
    ctx.strokeStyle = 'rgba(61, 107, 79, 0.38)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    const margin = canvasMargins(width, height);
    ctx.strokeRect(margin.left, margin.top, width - margin.left - margin.right, height - margin.top - margin.bottom);
    ctx.restore();
  }

  function drawCanvasMessage(ctx, width, height, message) {
    ctx.save();
    ctx.fillStyle = '#7a6f65';
    ctx.font = '15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, width / 2, height / 2);
    ctx.restore();
  }

  function drawStrands(ctx, width, height, view) {
    const tracks = view.tracks;
    if (!tracks.length) return;
    const trackIndex = trackIndexMap(tracks);
    const records = (view.records || []).filter((record) => record.pairs.some(([left, right]) => trackIndex.has(left) && trackIndex.has(right)));
    const layout = strandLayerLayout(records.length);
    const layerMax = layout.total;
    const order = tracks.slice();
    const strandSegments = new Map();
    const strandClipMasks = new Map();
    order.forEach((label, index) => {
      strandSegments.set(label, [[pointForLayerPosition(index, 0, tracks.length, layerMax, width, height)]]);
    });

    if (!records.length) {
      order.forEach((label, index) => {
        appendStrandPoint(strandSegments, label, pointForLayerPosition(index, layerMax, tracks.length, layerMax, width, height));
      });
    } else {
      const glyphs = [];
      records.forEach((record, stepIndex) => {
        const previousLayer = stepIndex === 0
          ? 0
          : layout.intervals[stepIndex - 1]?.end ?? layout.crossingEnds[stepIndex - 1];
        const crossingEnd = layout.crossingEnds[stepIndex];
        const crossingLayer = (previousLayer + crossingEnd) / 2;
        const recordGlyphs = [];
        record.pairs.forEach(([leftTrack, rightTrack]) => {
          const left = trackIndex.get(leftTrack);
          const right = trackIndex.get(rightTrack);
          if (left == null || right == null) return;
          const glyph = {
            record,
            leftIndex: left,
            rightIndex: right,
            leftLabel: order[left],
            rightLabel: order[right],
            startLayer: previousLayer,
            crossingLayer,
            endLayer: crossingEnd
          };
          glyphs.push(glyph);
          recordGlyphs.push(glyph);
        });
        const nextOrder = order.slice();
        if (record.shouldSwap !== false) {
          record.pairs.forEach(([leftTrack, rightTrack]) => {
            const left = trackIndex.get(leftTrack);
            const right = trackIndex.get(rightTrack);
            if (left == null || right == null) return;
            nextOrder[left] = order[right];
            nextOrder[right] = order[left];
          });
        }
        addBraidClipMasks(recordGlyphs, record, strandClipMasks, tracks.length, layerMax, width, height, lineWidthForTrackCount(tracks.length));
        const klBreaks = klVisualBreaks(recordGlyphs, record);
        const tlBreaks = tlVisualBreaks(recordGlyphs, record);
        nextOrder.forEach((label, index) => {
          const tlBreak = tlBreaks.get(label);
          if (tlBreak) {
            appendTlBreak(strandSegments, label, tlBreak, index, tracks.length, layerMax, width, height);
            return;
          }
          const klBreak = klBreaks.get(label);
          if (klBreak) {
            appendKlBreak(strandSegments, label, klBreak, index, tracks.length, layerMax, width, height);
            return;
          }
          appendStrandPoint(strandSegments, label, pointForLayerPosition(index, crossingEnd, tracks.length, layerMax, width, height));
        });
        const interval = layout.intervals[stepIndex];
        if (interval) {
          nextOrder.forEach((label, index) => {
            if (interval.cutStart != null && interval.cutEnd != null) {
              appendStrandPoint(strandSegments, label, pointForLayerPosition(index, interval.cutStart, tracks.length, layerMax, width, height));
              startStrandSegment(strandSegments, label, pointForLayerPosition(index, interval.cutEnd, tracks.length, layerMax, width, height));
            }
            if (interval.end !== layout.crossingEnds[stepIndex]) {
              appendStrandPoint(strandSegments, label, pointForLayerPosition(index, interval.end, tracks.length, layerMax, width, height));
            }
          });
        }
        order.splice(0, order.length, ...nextOrder);
      });

      const lineWidth = lineWidthForTrackCount(tracks.length);
      strandSegments.forEach((segments, label) => {
        segments.forEach((points) => drawStrandPath(ctx, points, strandColor(label), lineWidth, state.strandDisplayStyle, strandClipMasks.get(label), width, height));
      });
      drawGeneratorGlyphs(ctx, glyphs, tracks.length, layerMax, width, height, lineWidth);

      const endpoints = endpointMapFromSegments(strandSegments);
      drawEndpointLabels(ctx, endpoints, tracks.length, layerMax, width, height);
      return;
    }

    const lineWidth = lineWidthForTrackCount(tracks.length);
    strandSegments.forEach((segments, label) => {
      segments.forEach((points) => drawStrandPath(ctx, points, strandColor(label), lineWidth, state.strandDisplayStyle, null, width, height));
    });

    const endpoints = endpointMapFromSegments(strandSegments);
    drawEndpointLabels(ctx, endpoints, tracks.length, layerMax, width, height);
  }

  function lineWidthForTrackCount(trackCount) {
    return trackCount > 42 ? 1.05 : trackCount > 20 ? 1.45 : 2.2;
  }

  function addBraidClipMasks(recordGlyphs, record, strandClipMasks, trackCount, layerMax, width, height, lineWidth) {
    if (record.family !== 'braid') return;
    const radius = Math.max(5.5, lineWidth * 2.6 + 3);
    recordGlyphs.forEach((glyph) => {
      const positive = record.sign !== -1;
      const label = positive ? glyph.rightLabel : glyph.leftLabel;
      const center = pointForLayerPosition((glyph.leftIndex + glyph.rightIndex) / 2, glyph.crossingLayer, trackCount, layerMax, width, height);
      addStrandClipMask(strandClipMasks, label, { x: center.x, y: center.y, radius });
    });
  }

  function addStrandClipMask(strandClipMasks, label, mask) {
    const masks = strandClipMasks.get(label) || [];
    masks.push(mask);
    strandClipMasks.set(label, masks);
  }

  function klVisualBreaks(recordGlyphs, record) {
    const breaks = new Map();
    if (record.family !== 'kl') return breaks;
    recordGlyphs.forEach((glyph) => {
      breaks.set(glyph.leftLabel, {
        trackIndex: glyph.leftIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
      breaks.set(glyph.rightLabel, {
        trackIndex: glyph.rightIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
    });
    return breaks;
  }

  function tlVisualBreaks(recordGlyphs, record) {
    const breaks = new Map();
    if (record.family !== 'tl') return breaks;
    recordGlyphs.forEach((glyph) => {
      breaks.set(glyph.leftLabel, {
        trackIndex: glyph.leftIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
      breaks.set(glyph.rightLabel, {
        trackIndex: glyph.rightIndex,
        beforeLayer: glyph.startLayer,
        afterLayer: glyph.endLayer,
        endLayer: glyph.endLayer
      });
    });
    return breaks;
  }

  function appendKlBreak(strandSegments, label, klBreak, targetIndex, trackCount, layerMax, width, height) {
    appendStrandPoint(strandSegments, label, pointForLayerPosition(klBreak.trackIndex, klBreak.beforeLayer, trackCount, layerMax, width, height));
    startStrandSegment(strandSegments, label, pointForLayerPosition(klBreak.trackIndex, klBreak.afterLayer, trackCount, layerMax, width, height));
    if (klBreak.afterLayer !== klBreak.endLayer) {
      appendStrandPoint(strandSegments, label, pointForLayerPosition(targetIndex, klBreak.endLayer, trackCount, layerMax, width, height));
    }
  }

  function appendTlBreak(strandSegments, label, tlBreak, targetIndex, trackCount, layerMax, width, height) {
    startStrandSegment(strandSegments, label, pointForLayerPosition(targetIndex, tlBreak.endLayer, trackCount, layerMax, width, height));
  }

  function strandLayerLayout(stepCount) {
    if (stepCount <= 0) {
      return {
        total: 1,
        crossingEnds: [],
        intervals: [],
        guideLayers: [0, 1]
      };
    }
    const spacing = state.generatorSpacing;
    const cutSize = state.generatorGapEnabled ? GENERATOR_CUT_SIZE : 0;
    const crossingEnds = [];
    const intervals = [];
    const guideLayers = [0];
    let position = 0;
    for (let index = 0; index < stepCount; index++) {
      position += 1;
      crossingEnds.push(position);
      if (index < stepCount - 1) {
        const interval = { end: position, cutStart: null, cutEnd: null };
        const beforeCut = spacing / 2;
        const afterCut = spacing - beforeCut;
        if (cutSize > 0) {
          interval.cutStart = position + beforeCut;
          interval.cutEnd = interval.cutStart + cutSize;
          interval.end = interval.cutEnd + afterCut;
          guideLayers.push((interval.cutStart + interval.cutEnd) / 2);
        } else {
          interval.end = position + spacing;
          guideLayers.push(position + spacing / 2);
        }
        position = interval.end;
        intervals.push(interval);
      } else {
        guideLayers.push(position);
        intervals.push(null);
      }
    }
    return {
      total: Math.max(1, position),
      crossingEnds,
      intervals,
      guideLayers
    };
  }

  function appendStrandPoint(strandSegments, label, point) {
    const segments = strandSegments.get(label);
    if (!segments?.length) return;
    segments[segments.length - 1].push(point);
  }

  function startStrandSegment(strandSegments, label, point) {
    const segments = strandSegments.get(label);
    if (!segments) return;
    segments.push([point]);
  }

  function endpointMapFromSegments(strandSegments) {
    const endpoints = new Map();
    strandSegments.forEach((segments, label) => {
      const firstSegment = segments.find((segment) => segment.length);
      const lastSegment = segments.slice().reverse().find((segment) => segment.length);
      if (!firstSegment || !lastSegment) return;
      endpoints.set(label, [firstSegment[0], lastSegment[lastSegment.length - 1]]);
    });
    return endpoints;
  }

  function drawStrandPath(ctx, points, color, lineWidth, style, clipMasks = null, width = 0, height = 0) {
    if (points.length < 2) return;
    ctx.save();
    if (clipMasks?.length) applyInverseClipMasks(ctx, clipMasks, width, height);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (style === 'soft') drawSoftPathSegments(ctx, points);
    else drawStraightPathSegments(ctx, points);
    ctx.stroke();
    ctx.restore();
  }

  function applyInverseClipMasks(ctx, masks, width, height) {
    ctx.beginPath();
    ctx.rect(0, 0, Math.max(1, width), Math.max(1, height));
    masks.forEach((mask) => {
      ctx.moveTo(mask.x + mask.radius, mask.y);
      ctx.arc(mask.x, mask.y, mask.radius, 0, Math.PI * 2);
    });
    ctx.clip('evenodd');
  }

  function drawStraightPathSegments(ctx, points) {
    for (let index = 1; index < points.length; index++) {
      ctx.lineTo(points[index].x, points[index].y);
    }
  }

  function drawSoftPathSegments(ctx, points) {
    const vertical = isVerticalDirection();
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const point = points[index];
      const layerDelta = vertical ? point.y - previous.y : point.x - previous.x;
      const controlScale = 0.55;
      const c1 = vertical
        ? { x: previous.x, y: previous.y + layerDelta * controlScale }
        : { x: previous.x + layerDelta * controlScale, y: previous.y };
      const c2 = vertical
        ? { x: point.x, y: point.y - layerDelta * controlScale }
        : { x: point.x - layerDelta * controlScale, y: point.y };
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, point.x, point.y);
    }
  }

  function drawGeneratorGlyphs(ctx, glyphs, trackCount, layerMax, width, height, lineWidth) {
    glyphs.forEach((glyph) => {
      const family = glyph.record.family;
      if (family === 'kl') drawKlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth);
      else if (family === 'tl') drawTlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth);
    });
  }

  function drawKlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth) {
    const midTrack = (glyph.leftIndex + glyph.rightIndex) / 2;
    const topLeft = pointForLayerPosition(glyph.leftIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const topRight = pointForLayerPosition(glyph.rightIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const bottomLeft = pointForLayerPosition(glyph.leftIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const bottomRight = pointForLayerPosition(glyph.rightIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const center = pointForLayerPosition(midTrack, glyph.crossingLayer, trackCount, layerMax, width, height);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;
    drawTlCurve(ctx, topLeft, center, topRight, '#211c18', lineWidth);
    drawTlCurve(ctx, bottomLeft, center, bottomRight, '#211c18', lineWidth);
    ctx.restore();
  }

  function drawTlGlyph(ctx, glyph, trackCount, layerMax, width, height, lineWidth) {
    const span = Math.max(0.01, glyph.endLayer - glyph.startLayer);
    const bow = Math.min(span * 0.28, Math.max(0.01, span / 2 - 0.04));
    const topLeft = pointForLayerPosition(glyph.leftIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const topRight = pointForLayerPosition(glyph.rightIndex, glyph.startLayer, trackCount, layerMax, width, height);
    const bottomLeft = pointForLayerPosition(glyph.leftIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const bottomRight = pointForLayerPosition(glyph.rightIndex, glyph.endLayer, trackCount, layerMax, width, height);
    const topControls = [
      pointForLayerPosition(glyph.leftIndex, glyph.startLayer + bow, trackCount, layerMax, width, height),
      pointForLayerPosition(glyph.rightIndex, glyph.startLayer + bow, trackCount, layerMax, width, height)
    ];
    const bottomControls = [
      pointForLayerPosition(glyph.leftIndex, glyph.endLayer - bow, trackCount, layerMax, width, height),
      pointForLayerPosition(glyph.rightIndex, glyph.endLayer - bow, trackCount, layerMax, width, height)
    ];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;
    drawTlArc(ctx, topLeft, topControls[0], topControls[1], topRight, '#7b477e', lineWidth);
    drawTlArc(ctx, bottomLeft, bottomControls[0], bottomControls[1], bottomRight, '#7b477e', lineWidth);
    ctx.restore();
  }

  function drawTlArc(ctx, start, controlStart, controlEnd, end, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(controlStart.x, controlStart.y, controlEnd.x, controlEnd.y, end.x, end.y);
    ctx.stroke();
  }

  function drawTlCurve(ctx, start, control, end, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    drawSoftPathSegments(ctx, [start, control, end]);
    ctx.stroke();
  }

  function drawInsertionGuide(ctx, width, height, view) {
    const drag = state.dragInput;
    if (!drag?.dragging || drag.guideLayer == null || !view.tracks.length) return;
    const layout = strandLayerLayout(view.steps.length);
    const layerMax = layout.total;
    const start = pointForLayerPosition(0, drag.guideLayer, view.tracks.length, layerMax, width, height);
    const end = pointForLayerPosition(view.tracks.length - 1, drag.guideLayer, view.tracks.length, layerMax, width, height);
    ctx.save();
    ctx.strokeStyle = '#8b3a2a';
    ctx.fillStyle = '#8b3a2a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const marker = pointForLayerPosition(Math.max(0, Math.floor((view.tracks.length - 1) / 2)), drag.guideLayer, view.tracks.length, layerMax, width, height);
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEndpointLabels(ctx, paths, trackCount, layerMax, width, height) {
    if (trackCount > 28 || !endpointLabelsHaveRoom(paths, trackCount, width, height)) return;
    ctx.save();
    ctx.font = '12px JetBrains Mono, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    paths.forEach((points, label) => {
      const start = points[0];
      const end = points[points.length - 1];
      const color = strandColor(label);
      drawEndpointLabel(ctx, label, start, color, endpointSide(0, layerMax, width, height));
      drawEndpointLabel(ctx, label, end, color, endpointSide(layerMax, layerMax, width, height));
    });
    ctx.restore();
  }

  function endpointLabelsHaveRoom(paths, trackCount, width, height) {
    if (trackCount <= 1) return true;
    if (fixedGeometryActive()) {
      const longest = Math.max(...[...paths.keys()].map((label) => String(label).length), 1);
      return longest * 7 + 10 <= state.fixedGeneratorSize;
    }
    const margin = canvasMargins(width, height);
    const vertical = state.direction === 'up-down' || state.direction === 'down-up';
    const trackSpan = vertical
      ? width - margin.left - margin.right
      : height - margin.top - margin.bottom;
    const trackSpacing = trackSpan / Math.max(1, trackCount - 1);
    const longest = Math.max(...[...paths.keys()].map((label) => String(label).length), 1);
    return longest * 7 + 10 <= trackSpacing;
  }

  function drawEndpointLabel(ctx, label, point, color, side) {
    const offset = 17;
    const x = point.x + side.x * offset;
    const y = point.y + side.y * offset;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 253, 248, 0.86)';
    ctx.strokeStyle = 'rgba(216, 208, 196, 0.86)';
    ctx.lineWidth = 1;
    const text = String(label);
    const width = Math.max(18, ctx.measureText(text).width + 8);
    const height = 17;
    roundedRect(ctx, x - width / 2, y - height / 2, width, height, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function endpointSide(layer, layerMax) {
    if (state.direction === 'up-down') return layer === 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
    if (state.direction === 'down-up') return layer === 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    if (state.direction === 'left-right') return layer === 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
    return layer === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }

  function drawCanvasLegend(ctx, width, height, view) {
    ctx.save();
    ctx.fillStyle = '#7a6f65';
    ctx.font = '12px JetBrains Mono, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const hidden = view.hiddenSteps ? `; ${view.hiddenSteps} step${view.hiddenSteps === 1 ? '' : 's'} outside view` : '';
    ctx.fillText(`${view.label}${hidden}`, 14, 12);
    ctx.restore();
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
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

  function canvasMargins(width, height) {
    const vertical = isVerticalDirection();
    return vertical
      ? { left: 46, right: 46, top: 52, bottom: 52 }
      : { left: 58, right: 58, top: 44, bottom: 44 };
  }

  function pointForLayerPosition(trackIndex, layerPosition, trackCount, layerMax, width, height) {
    const margin = canvasMargins(width, height);
    const vertical = isVerticalDirection();
    const trackRatio = trackCount <= 1 ? 0.5 : trackIndex / (trackCount - 1);
    const layerRatio = layerMax <= 0 ? 0 : layerPosition / layerMax;
    const fixed = fixedGeometryActive();
    const trackCoord = vertical
      ? margin.left + (fixed ? fixedTrackOffset(trackIndex, trackCount) : trackRatio * (width - margin.left - margin.right))
      : margin.top + (fixed ? fixedTrackOffset(trackIndex, trackCount) : trackRatio * (height - margin.top - margin.bottom));
    const layerCoord = vertical
      ? margin.top + (fixed ? fixedLayerOffset(layerPosition) : layerRatio * (height - margin.top - margin.bottom))
      : margin.left + (fixed ? fixedLayerOffset(layerPosition) : layerRatio * (width - margin.left - margin.right));

    if (state.direction === 'up-down') return { x: trackCoord, y: layerCoord };
    if (state.direction === 'down-up') return { x: trackCoord, y: height - layerCoord };
    if (state.direction === 'left-right') return { x: layerCoord, y: trackCoord };
    return { x: width - layerCoord, y: trackCoord };
  }

  function isVerticalDirection() {
    return state.direction === 'up-down' || state.direction === 'down-up';
  }

  function canvasInsertionFromPointer(clientX, clientY) {
    const canvas = refs.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const width = state.canvasWidth || rect.width || canvas.clientWidth || 900;
    const height = state.canvasHeight || rect.height || canvas.clientHeight || 560;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const data = buildPermutationData();
    const view = canvasView(data);
    if (!view.tracks.length) return null;
    return insertionFromCanvasPoint(x, y, width, height, view);
  }

  function canvasGeneratorHitFromPointer(clientX, clientY) {
    const canvas = refs.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const width = state.canvasWidth || rect.width || canvas.clientWidth || 900;
    const height = state.canvasHeight || rect.height || canvas.clientHeight || 560;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const data = buildPermutationData();
    const view = canvasView(data);
    if (!view.tracks.length || !view.records?.length) return null;

    const trackIndex = trackIndexMap(view.tracks);
    const visibleRecords = view.records.filter((record) => record.pairs.some(([left, right]) => trackIndex.has(left) && trackIndex.has(right)));
    if (!visibleRecords.length) return null;

    const layout = strandLayerLayout(visibleRecords.length);
    const layerMax = layout.total;
    const radius = generatorHitRadius(width, height, view.tracks.length, layerMax);
    let best = null;

    visibleRecords.forEach((record, index) => {
      const previousLayer = index === 0
        ? 0
        : layout.intervals[index - 1]?.end ?? layout.crossingEnds[index - 1];
      const crossingLayer = (previousLayer + layout.crossingEnds[index]) / 2;
      record.pairs.forEach(([leftTrack, rightTrack]) => {
        const leftIndex = trackIndex.get(leftTrack);
        const rightIndex = trackIndex.get(rightTrack);
        if (leftIndex == null || rightIndex == null) return;
        const first = pointForLayerPosition(leftIndex, crossingLayer, view.tracks.length, layerMax, width, height);
        const second = pointForLayerPosition(rightIndex, crossingLayer, view.tracks.length, layerMax, width, height);
        const center = {
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2
        };
        const distance = Math.hypot(x - center.x, y - center.y);
        if (distance > radius || (best && distance >= best.distance)) return;
        best = {
          generator: record.generator,
          sourceIndex: record.sourceIndex,
          distance
        };
      });
    });

    return best;
  }

  function generatorHitRadius(width, height, trackCount, layerMax) {
    if (fixedGeometryActive()) return Math.max(18, Math.min(48, state.fixedGeneratorSize * 0.46));
    const margin = canvasMargins(width, height);
    const vertical = isVerticalDirection();
    const trackSpan = vertical
      ? width - margin.left - margin.right
      : height - margin.top - margin.bottom;
    const layerSpan = vertical
      ? height - margin.top - margin.bottom
      : width - margin.left - margin.right;
    const trackSpacing = trackSpan / Math.max(1, trackCount - 1);
    const layerSpacing = layerSpan / Math.max(1, layerMax);
    return Math.max(18, Math.min(42, Math.min(trackSpacing, layerSpacing) * 0.5));
  }

  function insertionFromCanvasPoint(x, y, width, height, view) {
    const stepCount = view.steps.length;
    const layout = strandLayerLayout(stepCount);
    const layerMax = layout.total;
    const layerPosition = layerPositionFromPoint(x, y, width, height, layerMax);
    const boundary = nearestBoundaryIndex(layerPosition, layout.guideLayers);
    return {
      insertIndex: insertionIndexForBoundary(boundary, view),
      guideLayer: layout.guideLayers[boundary] ?? layerMax
    };
  }

  function layerPositionFromPoint(x, y, width, height, layerMax) {
    const margin = canvasMargins(width, height);
    const vertical = isVerticalDirection();
    const raw = vertical
      ? (state.direction === 'down-up' ? height - y : y)
      : (state.direction === 'right-left' ? width - x : x);
    const start = vertical ? margin.top : margin.left;
    if (fixedGeometryActive()) {
      const position = (raw - start) / Math.max(1, state.fixedGeneratorSize);
      return Math.max(0, Math.min(layerMax, position));
    }
    const end = vertical ? height - margin.bottom : width - margin.right;
    const ratio = end <= start ? 0 : (raw - start) / (end - start);
    return Math.max(0, Math.min(layerMax, ratio * layerMax));
  }

  function nearestBoundaryIndex(layerPosition, guideLayers) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    guideLayers.forEach((guideLayer, index) => {
      const distance = Math.abs(layerPosition - guideLayer);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function insertionIndexForBoundary(boundary, view) {
    if (!view.steps.length || !view.sourceIndices?.length) return state.appliedSteps.length;
    if (boundary <= 0) return view.sourceIndices[0];
    if (boundary >= view.steps.length) return view.sourceIndices[view.sourceIndices.length - 1] + 1;
    return view.sourceIndices[boundary - 1] + 1;
  }

  function strandColor(label) {
    const direct = STRAND_COLORS[(Math.abs(label) - 1) % STRAND_COLORS.length];
    if (label <= STRAND_COLORS.length) return direct;
    const hue = (label * 137.508) % 360;
    return `hsl(${hue.toFixed(1)} 42% 39%)`;
  }

  function renderBasicInfo(data) {
    const rows = [
      ['group', inlineMath(groupLatex(data.groupType, data.n))],
      [data.signed ? 'rank' : 'strands', inlineMath(String(data.n))],
      ['word length', inlineMath(String(data.wordRecords.length))],
      ['direction', escapeHtml(DIRECTION_LABELS[state.direction] || state.direction)],
      [data.signed ? 'Coxeter length' : 'inversions', data.coxeterOnly ? inlineMath(String(data.length)) : escapeHtml('not applicable')],
      ['reduced?', escapeHtml(reducedText(data))]
    ];

    refs.basicInfo.innerHTML = `
      <div class="strand-stat-grid">
        ${rows.map(([label, value]) => statRow(label, value)).join('')}
        ${basicExpressionControlMarkup()}
        ${basicExpressionMarkup(data)}
      </div>
    `;
    recacheBasicInfoControls();
    syncBasicInfoControls();
  }

  function statRow(label, value) {
    return `
      <div class="strand-stat-row">
        <div class="strand-stat-label">${escapeHtml(label)}</div>
        <div class="strand-stat-value">${value}</div>
      </div>
    `;
  }

  function basicExpressionControlMarkup() {
    return statRow('expression', `
      <div class="strand-basic-controls" aria-label="Basic expression controls">
        <label class="strand-basic-format-control" for="strand-basic-expression-format">
          <select id="strand-basic-expression-format">
            <option value="composition">Composition word</option>
            <option value="transpositions">Transpositions</option>
            <option value="cycle">Cycle notation</option>
            <option value="one-line">One-line</option>
            <option value="two-line">Two-line</option>
            <option value="matrix">Matrix</option>
          </select>
        </label>
        <label class="strand-basic-reduced-toggle opt-row" for="strand-basic-reduced-only">
          <input id="strand-basic-reduced-only" type="checkbox">
          <span>reduced</span>
        </label>
      </div>
    `);
  }

  function recacheBasicInfoControls() {
    refs.basicExpressionFormat = document.getElementById('strand-basic-expression-format');
    refs.basicReducedOnly = document.getElementById('strand-basic-reduced-only');
  }

  function basicExpressionMarkup(data) {
    const format = basicExpressionFormatValue(state.basicExpressionFormat);
    if (format === 'matrix') return matrixMarkup(data);
    return statRow(basicExpressionLabel(format), basicExpressionValue(format, data));
  }

  function basicExpressionValue(format, data) {
    if (format === 'composition') {
      const steps = basicExpressionSteps(format, data);
      return steps ? inlineMath(generatorWordLatex(steps, true)) : reducedWordLimitMessage(data);
    }
    if (format === 'transpositions') {
      const steps = basicExpressionSteps(format, data);
      if (!data.coxeterOnly) return inlineMath(generatorWordLatex(data.wordRecords, true));
      return steps ? inlineMath(transpositionWordLatex(steps, data)) : reducedWordLimitMessage(data);
    }
    if (!data.coxeterOnly) return escapeHtml('not applicable for mixed typed words');
    if (format === 'cycle') return inlineMath(cycleLatex(data.cycles));
    if (format === 'one-line') return inlineMath(oneLineLatex(data));
    if (format === 'two-line') return inlineMath(twoLineLatex(data));
    return inlineMath(generatorWordLatex(data.steps, true));
  }

  function basicExpressionSteps(format, data) {
    if (!data.coxeterOnly) return data.wordRecords;
    if (state.basicReducedOnly && basicReducedApplies(format)) return data.canonicalSteps;
    return data.steps;
  }

  function reducedWordLimitMessage(data) {
    return escapeHtml(`${data.length} generators; too long to display`);
  }

  function basicExpressionLabel(format) {
    const reduced = state.basicReducedOnly && basicReducedApplies(format) && currentWordIsCoxeterOnly() ? ' (reduced)' : '';
    if (!currentWordIsCoxeterOnly() && (format === 'composition' || format === 'transpositions')) return 'formal word';
    if (format === 'transpositions') return `transpositions${reduced}`;
    if (format === 'cycle') return 'cycle notation';
    if (format === 'one-line') return signedGroupActive() ? 'signed one-line' : 'one-line';
    if (format === 'two-line') return signedGroupActive() ? 'signed two-line' : 'two-line';
    return `composition word${reduced}`;
  }

  function matrixMarkup(data) {
    if (!data.coxeterOnly) {
      return statRow('matrix', '<div class="strand-note">Permutation matrix is only defined for Coxeter-only words.</div>');
    }
    if (data.n > MATRIX_DISPLAY_LIMIT || !data.fullPermutation) {
      const moved = data.signed
        ? data.signedOneLine.filter((image, index) => image !== index + 1).length
        : data.imageBySource.size;
      return statRow('matrix', `<div class="strand-note">Permutation matrix is shown for at most ${MATRIX_DISPLAY_LIMIT} strands. This permutation moves ${moved} strand${moved === 1 ? '' : 's'}.</div>`);
    }
    const matrix = data.signed
      ? signedPermutationMatrixLatex(data.signedOneLine)
      : permutationMatrixLatex(data.fullPermutation);
    return statRow('matrix', `<div class="strand-matrix-wrap">${displayMath(matrix)}</div>`);
  }

  function reducedText(data) {
    if (!data.coxeterOnly) return 'not applicable (mixed typed word)';
    return data.isReduced
      ? `yes (length ${data.steps.length})`
      : `no (minimal length ${data.length})`;
  }

  function basicExpressionFormatValue(value) {
    return BASIC_EXPRESSION_FORMATS.has(value) ? value : DEFAULT_BASIC_EXPRESSION_FORMAT;
  }

  function basicReducedApplies(format) {
    return BASIC_REDUCED_FORMATS.has(format);
  }

  function strandDisplayStyleValue(value) {
    return STRAND_DISPLAY_STYLES.has(value) ? value : DEFAULT_STRAND_DISPLAY_STYLE;
  }

  function generatorSpacingValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_GENERATOR_SPACING;
    return Math.max(0, Math.min(2, Math.round(parsed * 100) / 100));
  }

  function formatGeneratorSpacing(value) {
    const spacing = generatorSpacingValue(value);
    return Number.isInteger(spacing * 10) ? spacing.toFixed(1) : spacing.toFixed(2);
  }

  function strandSizeModeValue(value) {
    return STRAND_SIZE_MODES.has(value) ? value : DEFAULT_STRAND_SIZE_MODE;
  }

  function fixedGeneratorSizeValue(value) {
    const parsed = parseInteger(value);
    if (!Number.isFinite(parsed)) return DEFAULT_FIXED_GENERATOR_SIZE;
    const clamped = Math.max(36, Math.min(180, parsed));
    return Math.round(clamped / 4) * 4;
  }

  function groupTypeValue(value) {
    return GROUP_TYPES.has(value) ? value : DEFAULT_GROUP_TYPE;
  }

  function signedGroupActive(groupType = state.groupType) {
    return groupType === 'B' || groupType === 'C' || groupType === 'D';
  }

  function rankBoundsForGroup(groupType = state.groupType) {
    if (groupType === 'B' || groupType === 'C') return { min: 2 };
    if (groupType === 'D') return { min: 4 };
    return { min: 1 };
  }

  function cleanRankForGroup(value, groupType = state.groupType) {
    const fallback = Math.max(rankBoundsForGroup(groupType).min, DEFAULT_STRAND_COUNT);
    const parsed = cleanPositiveInteger(value, fallback);
    return Math.max(rankBoundsForGroup(groupType).min, parsed);
  }

  function rankNoun(groupType = state.groupType) {
    return signedGroupActive(groupType) ? 'rank' : 'strand count';
  }

  function generatorValuesForState() {
    if (signedGroupActive()) {
      return Array.from({ length: state.strandCount }, (_, index) => index);
    }
    if (state.strandCount <= 1) return [];
    return Array.from({ length: state.strandCount - 1 }, (_, index) => index + 1);
  }

  function generatorRecordsForFamily(family, indices) {
    if (family === 'braid') {
      return indices.flatMap((index) => [
        { family: 'braid', index, sign: 1 },
        { family: 'braid', index, sign: -1 }
      ]);
    }
    return indices.map((index) => ({ family, index }));
  }

  function generatorChipMarkup(generator) {
    const record = normalizeGeneratorRecord(generator);
    const sign = record.family === 'braid' ? ` data-generator-sign="${record.sign}"` : '';
    return `<button class="strand-generator-chip is-${record.family}" type="button" data-generator-family="${record.family}" data-generator-index="${record.index}"${sign} aria-label="${escapeHtml(generatorAriaLabel(record))}">${escapeHtml(inlineMath(generatorLatex(record)))}</button>`;
  }

  function generatorRecordFromChip(chip) {
    if (!chip) return null;
    return normalizeGeneratorRecord({
      family: chip.dataset.generatorFamily,
      index: chip.dataset.generatorIndex,
      sign: chip.dataset.generatorSign
    });
  }

  function validGenerator(generator) {
    const record = normalizeGeneratorRecord(generator);
    return validGeneratorRecord(record, state.strandCount, state.groupType);
  }

  function validGeneratorRecord(record, strandCount, groupType = state.groupType) {
    if (!record || !Number.isInteger(record.index) || !GENERATOR_FAMILIES.has(record.family)) return false;
    return validGeneratorIndex(record.index, strandCount, groupType);
  }

  function validGeneratorIndex(generator, strandCount, groupType = state.groupType) {
    if (!Number.isInteger(generator)) return false;
    if (signedGroupActive(groupType)) return generator >= 0 && generator < strandCount;
    return generator >= 1 && generator < strandCount;
  }

  function filterValidSteps(steps, strandCount, groupType = state.groupType) {
    if (!Array.isArray(steps)) return [];
    return steps
      .map(normalizeGeneratorRecord)
      .filter((record) => validGeneratorRecord(record, strandCount, groupType));
  }

  function normalizeGeneratorRecord(value) {
    if (Number.isInteger(value) || (typeof value === 'string' && value.trim() !== '')) {
      const index = parseInteger(value);
      return Number.isInteger(index) ? { family: 'coxeter', index } : null;
    }
    if (!value || typeof value !== 'object') return null;
    const family = GENERATOR_FAMILIES.has(value.family) ? value.family : 'coxeter';
    const index = parseInteger(value.index ?? value.generator ?? value.step);
    if (!Number.isInteger(index)) return null;
    const record = { family, index };
    if (family === 'braid') record.sign = braidSignValue(value.sign ?? value.variant ?? value.inverse);
    return record;
  }

  function exportGeneratorRecord(generator) {
    const record = normalizeGeneratorRecord(generator);
    if (!record) return null;
    if (record.family === 'braid') return { family: 'braid', index: record.index, sign: record.sign === -1 ? -1 : 1 };
    return { family: record.family, index: record.index };
  }

  function braidSignValue(value) {
    if (value === -1 || value === '-1' || value === 'negative' || value === 'inverse' || value === true) return -1;
    return 1;
  }

  function sameGeneratorRecord(left, right) {
    const a = normalizeGeneratorRecord(left);
    const b = normalizeGeneratorRecord(right);
    if (!a || !b) return false;
    return a.family === b.family && a.index === b.index && (a.family !== 'braid' || a.sign === b.sign);
  }

  function wordIsCoxeterOnly(records) {
    return records.every((record) => normalizeGeneratorRecord(record)?.family === 'coxeter');
  }

  function currentWordIsCoxeterOnly() {
    return wordIsCoxeterOnly(filterValidSteps(state.appliedSteps, state.strandCount, state.groupType));
  }

  function coxeterStepsFromRecords(records) {
    return records
      .filter((record) => normalizeGeneratorRecord(record)?.family === 'coxeter')
      .map((record) => normalizeGeneratorRecord(record).index);
  }

  function groupPlainLabel(groupType = state.groupType, n = state.strandCount) {
    const cleanGroupType = groupTypeValue(groupType);
    return (GROUP_TYPE_NAMES[cleanGroupType] || GROUP_TYPE_NAMES[DEFAULT_GROUP_TYPE])(n);
  }

  function groupLatex(groupType = state.groupType, n = state.strandCount) {
    const cleanGroupType = groupTypeValue(groupType);
    if (cleanGroupType === 'symmetric') return `S_{${n}}`;
    return `${cleanGroupType}_{${n}}`;
  }

  function generatorLabel(generator) {
    const record = normalizeGeneratorRecord(generator);
    if (!record) return 's_?';
    if (record.family === 'braid') return record.sign === -1 ? `sigma_${record.index}^-1` : `sigma_${record.index}`;
    if (record.family === 'kl') return `b_${record.index}`;
    if (record.family === 'tl') return `e_${record.index}`;
    return `s_${record.index}`;
  }

  function generatorAriaLabel(generator) {
    const record = normalizeGeneratorRecord(generator);
    if (!record) return 'generator';
    if (record.family === 'braid') return record.sign === -1 ? `inverse braid generator sigma ${record.index}` : `braid generator sigma ${record.index}`;
    if (record.family === 'kl') return `KL generator b ${record.index}`;
    if (record.family === 'tl') return `Temperley-Lieb generator e ${record.index}`;
    return `Coxeter generator s ${record.index}`;
  }

  function signedLabelPlain(label) {
    return String(label);
  }

  function signedLabelLatex(label) {
    return label < 0 ? `\\overline{${Math.abs(label)}}` : String(label);
  }

  function generatorWordLatex(steps, compositionOrder) {
    if (!steps.length) return 'e';
    const ordered = compositionOrder ? steps.slice().reverse() : steps.slice();
    if (ordered.length > WORD_DISPLAY_LIMIT) {
      const head = ordered.slice(0, Math.floor(WORD_DISPLAY_LIMIT / 2));
      const tail = ordered.slice(-Math.floor(WORD_DISPLAY_LIMIT / 2));
      return `${head.map(generatorLatex).join('\\,')}\\,\\cdots\\,${tail.map(generatorLatex).join('\\,')}`;
    }
    return ordered.map(generatorLatex).join('\\,');
  }

  function generatorListLatex(steps) {
    if (!steps.length) return '()';
    const limited = steps.length > WORD_DISPLAY_LIMIT
      ? steps.slice(0, WORD_DISPLAY_LIMIT).map(generatorLatex).join(', ') + ', \\ldots'
      : steps.map(generatorLatex).join(', ');
    return `(${limited})`;
  }

  function generatorLatex(generator) {
    const record = normalizeGeneratorRecord(generator);
    if (!record) return 's_{?}';
    if (record.family === 'braid') return record.sign === -1 ? `\\sigma_{${record.index}}^{-1}` : `\\sigma_{${record.index}}`;
    if (record.family === 'kl') return `b_{${record.index}}`;
    if (record.family === 'tl') return `e_{${record.index}}`;
    return `s_{${record.index}}`;
  }

  function transpositionWordLatex(steps, data = null) {
    if (!steps.length) return 'e';
    const ordered = steps.slice().reverse();
    const body = ordered.length > WORD_DISPLAY_LIMIT
      ? ordered.slice(0, WORD_DISPLAY_LIMIT).map((step) => transpositionLatex(step, data)).join('') + '\\cdots'
      : ordered.map((step) => transpositionLatex(step, data)).join('');
    return body;
  }

  function transpositionLatex(step, data = null) {
    const groupType = data?.groupType || state.groupType;
    if (signedGroupActive(groupType)) {
      return generatorSwapPairs(groupType, data?.n || state.strandCount, step)
        .map((pair) => compactCycleEntriesLatex(pair))
        .join('');
    }
    return compactCycleEntriesLatex([step, step + 1]);
  }

  function cycleLatex(cycles) {
    if (!cycles.length) return '()';
    return cycles.map(compactCycleEntriesLatex).join('');
  }

  function compactCycleEntriesLatex(entries) {
    const compact = entries.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 10);
    if (compact) return `(${entries.join('')})`;
    return `(${entries.map(signedLabelLatex).join('\\,')})`;
  }

  function oneLineLatex(data) {
    if (data.signed) {
      if (data.fullPermutation) return `(${data.fullPermutation.map(signedLabelLatex).join(',')})`;
      const pairs = data.signedOneLine
        .map((image, index) => [index + 1, image])
        .filter(([source, image]) => source !== image);
      if (!pairs.length) return `\\operatorname{id}_{${groupLatex(data.groupType, data.n)}}`;
      const limited = pairs.slice(0, 14).map(([source, image]) => `w(${source})=${signedLabelLatex(image)}`).join(',\\ ');
      return `${limited}${pairs.length > 14 ? ',\\ \\ldots' : ''};\\quad w(i)=i\\text{ otherwise}`;
    }
    if (data.fullPermutation) return `(${data.fullPermutation.join(',')})`;
    if (!data.imageBySource.size) return `\\operatorname{id}_{S_{${data.n}}}`;
    const pairs = [...data.imageBySource.entries()].sort(([a], [b]) => a - b);
    const limited = pairs.slice(0, 14).map(([source, image]) => `w(${source})=${image}`).join(',\\ ');
    return `${limited}${pairs.length > 14 ? ',\\ \\ldots' : ''};\\quad w(i)=i\\text{ otherwise}`;
  }

  function twoLineLatex(data) {
    if (data.signed) {
      if (data.fullPermutation && data.n <= TWO_LINE_DISPLAY_LIMIT) {
        const top = Array.from({ length: data.n }, (_, index) => index + 1).join('&');
        const bottom = data.fullPermutation.map(signedLabelLatex).join('&');
        return `\\begin{pmatrix}${top}\\\\${bottom}\\end{pmatrix}`;
      }
      const pairs = data.signedOneLine
        .map((image, index) => [index + 1, image])
        .filter(([source, image]) => source !== image)
        .slice(0, TWO_LINE_DISPLAY_LIMIT);
      if (!pairs.length) return `\\begin{pmatrix}1&\\cdots&${data.n}\\\\1&\\cdots&${data.n}\\end{pmatrix}`;
      const top = pairs.map(([source]) => source).join('&');
      const bottom = pairs.map(([, image]) => signedLabelLatex(image)).join('&');
      return `\\begin{pmatrix}${top}\\\\${bottom}\\end{pmatrix}\\quad\\text{on moved positive strands}`;
    }
    if (data.fullPermutation && data.n <= TWO_LINE_DISPLAY_LIMIT) {
      const top = Array.from({ length: data.n }, (_, index) => index + 1).join('&');
      const bottom = data.fullPermutation.join('&');
      return `\\begin{pmatrix}${top}\\\\${bottom}\\end{pmatrix}`;
    }
    if (!data.imageBySource.size) return `\\begin{pmatrix}1&\\cdots&${data.n}\\\\1&\\cdots&${data.n}\\end{pmatrix}`;
    const pairs = [...data.imageBySource.entries()].sort(([a], [b]) => a - b).slice(0, TWO_LINE_DISPLAY_LIMIT);
    const top = pairs.map(([source]) => source).join('&');
    const bottom = pairs.map(([, image]) => image).join('&');
    return `\\begin{pmatrix}${top}\\\\${bottom}\\end{pmatrix}\\quad\\text{on moved strands}`;
  }

  function calculationTargetValue(value) {
    return CALCULATION_TARGETS.has(value) ? value : 'tl';
  }

  function calculationBasisValue(target, value) {
    const normalizedTarget = calculationTargetValue(target);
    const choices = CALCULATION_BASES[normalizedTarget] || CALCULATION_BASES.tl;
    if (normalizedTarget === 'symmetric' && value === 'permutation') return 'one-line';
    return choices.some((choice) => choice.value === value) ? value : choices[0].value;
  }

  function calculationSourceFamily() {
    const families = new Set(filterValidSteps(state.appliedSteps, state.strandCount, state.groupType).map((record) => record.family));
    if (!families.size) return 'identity';
    if (families.size > 1) return 'mixed';
    return [...families][0];
  }

  function calculationSourceTypesetLabel() {
    const source = calculationSourceFamily();
    const labels = {
      identity: 'identity',
      mixed: 'mixed typed word',
      coxeter: 'Coxeter generators',
      braid: 'braid generators',
      kl: 'KL generators',
      tl: 'Temperley-Lieb generators'
    };
    const suffix = state.groupType === 'symmetric'
      ? ` in type ${inlineMath('A')} (${inlineMath(groupLatex())})`
      : ` in type ${inlineMath(state.groupType)}`;
    return `${labels[source] || source}${suffix}`;
  }

  function calculationWordFromState() {
    return filterValidSteps(state.appliedSteps, state.strandCount, state.groupType)
      .slice()
      .reverse()
      .map(exportGeneratorRecord)
      .filter(Boolean);
  }

  function calculationFingerprint() {
    return JSON.stringify({
      groupType: state.groupType,
      rank: state.strandCount,
      word: calculationWordFromState(),
      target: calculationTargetValue(state.calculationTarget),
      basis: calculationBasisValue(state.calculationTarget, state.calculationBasis),
      convention: 'burau-compatible-v'
    });
  }

  function syncCalculationResultState() {
    if (state.calculationResult && state.calculationKey !== calculationFingerprint()) {
      markCalculationStale();
      return;
    }
    syncCalculationButtons();
  }

  function markCalculationStale() {
    if (!state.calculationResult) {
      syncCalculationButtons();
      return;
    }
    state.calculationStale = true;
    setCalculationMessage('Inputs changed. The displayed calculation is stale; calculate again.', false, true);
    syncCalculationButtons();
  }

  function syncCalculationButtons() {
    const current = !!state.calculationResult && !state.calculationStale && state.calculationKey === calculationFingerprint();
    if (refs.copyCalculationLatex) refs.copyCalculationLatex.disabled = !current;
    if (refs.copyCalculationResult) refs.copyCalculationResult.disabled = !current;
  }

  function calculateCurrentWord() {
    if (relationTaskActive()) {
      renderRelationReference();
      return;
    }
    if (basisTaskActive()) {
      renderBasisReference();
      return;
    }
    const engine = window.StrandMath;
    if (!engine?.calculateStrandWord) {
      setCalculationMessage('The calculation engine did not load.', true);
      return;
    }
    state.calculationTarget = calculationTargetValue(refs.calculationTarget?.value || state.calculationTarget);
    state.calculationBasis = calculationBasisValue(state.calculationTarget, refs.calculationBasis?.value || state.calculationBasis);
    if (refs.calculate) refs.calculate.disabled = true;
    setCalculationMessage('Calculating...');
    try {
      const calculation = engine.calculateStrandWord(calculationWordFromState(), {
        rank: state.strandCount,
        type: state.groupType === 'symmetric' ? 'A' : state.groupType,
        target: state.calculationTarget,
        basis: state.calculationBasis,
        convention: 'burau-compatible-v',
        includeTrace: true
      });
      state.calculationResult = calculation;
      state.calculationKey = calculationFingerprint();
      state.calculationStale = false;
      state.calculationLatex = engine.formatAlignedTrace(calculation.trace);
      state.calculationPlain = engine.formatLinearCombinationPlain(calculation.result, calculation.basis);
      renderCalculationResult();
      setCalculationMessage(calculation.warnings.length ? calculation.warnings.join(' ') : 'Calculation complete.');
      refreshExport();
    } catch (error) {
      state.calculationResult = null;
      state.calculationKey = '';
      state.calculationStale = false;
      state.calculationLatex = '';
      state.calculationPlain = '';
      clearCalculationResultDisplay();
      setCalculationMessage(error?.message || 'Unable to calculate this word.', true);
      refreshExport();
    } finally {
      if (refs.calculate) refs.calculate.disabled = false;
      syncCalculationButtons();
    }
  }

  function diagrammaticPresentationOptions() {
    return {
      scope: calculationPresentationScopeValue(state.calculationPresentationScope),
      direction: DIRECTIONS.has(state.direction) ? state.direction : DEFAULT_DIRECTION
    };
  }

  function calculationLatexForCopy() {
    if (!state.calculationResult) return '';
    if (state.calculationPresentationMode !== 'diagrammatic') return state.calculationLatex;
    const formatter = window.StrandMath?.formatDiagrammaticTraceTikz;
    if (!formatter) return state.calculationLatex;
    try {
      return formatter(state.calculationResult, diagrammaticPresentationOptions());
    } catch (_) {
      return state.calculationLatex;
    }
  }

  function htmlElement(tagName, className) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    return element;
  }

  function mathElement(latex, className) {
    const element = htmlElement('span', className || 'strand-diagram-math');
    element.textContent = inlineMath(latex || '0');
    return element;
  }

  function svgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NAMESPACE, tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
    return element;
  }

  function appendDiagramEndpoint(svg, point) {
    if (!point) return;
    svg.appendChild(svgElement('circle', {
      class: 'strand-diagram-endpoint',
      cx: Number(point.x) * 100,
      cy: Number(point.y) * 100,
      r: 1.35
    }));
  }

  function renderInlineDiagram(diagram) {
    const svg = svgElement('svg', {
      class: 'strand-inline-diagram',
      viewBox: '0 0 100 100',
      width: Math.max(32, Number(diagram?.width) || 72),
      height: Math.max(32, Number(diagram?.height) || 72),
      role: 'img',
      'aria-label': diagram?.label || 'diagrammatic basis element',
      preserveAspectRatio: 'none'
    });
    const title = svgElement('title');
    title.textContent = diagram?.label || 'diagrammatic basis element';
    svg.appendChild(title);

    if (diagram?.kind === 'matrix-unit' || diagram?.kind === 'vector-unit') {
      (diagram.cells || []).forEach((cell) => {
        svg.appendChild(svgElement('rect', {
          class: `strand-diagram-grid-cell${cell.selected ? ' is-selected' : ''}`,
          x: Number(cell.x) * 100,
          y: Number(cell.y) * 100,
          width: Number(cell.width) * 100,
          height: Number(cell.height) * 100
        }));
      });
      return svg;
    }

    (diagram?.platforms || []).forEach((platform) => {
      const points = (platform.points || [])
        .map((point) => `${Number(point.x) * 100},${Number(point.y) * 100}`)
        .join(' ');
      if (points) svg.appendChild(svgElement('polygon', {
        class: 'strand-diagram-platform',
        points
      }));
    });

    (diagram?.paths || []).forEach((path) => {
      const role = path.role === 'tl'
        ? ' is-tl'
        : path.role === 'link-state' ? ' is-link-state' : diagram.kind === 'hecke' ? ' is-hecke' : '';
      svg.appendChild(svgElement('path', {
        class: `strand-diagram-path${role}`,
        d: window.StrandMath.pathToSvgData(path)
      }));
      if (!path.closed) {
        appendDiagramEndpoint(svg, path.start);
        if (!path.endOnPlatform) appendDiagramEndpoint(svg, path.curves?.[path.curves.length - 1]?.end);
      }
    });
    (diagram?.overlays || []).forEach((overlay) => {
      const attributes = {
        x1: Number(overlay.from.x) * 100,
        y1: Number(overlay.from.y) * 100,
        x2: Number(overlay.to.x) * 100,
        y2: Number(overlay.to.y) * 100
      };
      svg.appendChild(svgElement('line', { ...attributes, class: 'strand-diagram-over-gap' }));
      svg.appendChild(svgElement('line', { ...attributes, class: 'strand-diagram-over' }));
    });
    return svg;
  }

  function renderDiagramTerm(term, index) {
    const node = htmlElement('span', 'strand-diagram-term');
    const parts = term.parts || {};
    const prefix = `${parts.prefix || (index ? '+' : '')}${parts.coefficientLatex || ''}`;
    if (term.diagram) {
      if (prefix) node.appendChild(mathElement(prefix, 'strand-diagram-term-prefix'));
      node.appendChild(renderInlineDiagram(term.diagram));
    } else {
      node.appendChild(mathElement(`${prefix}${term.basisLatex || ''}`, 'strand-diagram-coefficient'));
    }
    return node;
  }

  function renderDiagramOperand(operand) {
    const node = htmlElement('span', 'strand-diagram-operand');
    if (!operand || operand.kind === 'symbolic') {
      node.appendChild(mathElement(operand?.latex || '0'));
      return node;
    }
    if (operand.kind === 'diagram') {
      if (operand.badgeLatex) node.appendChild(mathElement(operand.badgeLatex, 'strand-diagram-representation-badge'));
      node.appendChild(renderInlineDiagram(operand.diagram));
      return node;
    }
    if (operand.kind === 'linear-combination') {
      node.classList.add('strand-diagram-linear');
      if (!operand.terms?.length) node.appendChild(mathElement('0'));
      (operand.terms || []).forEach((term, index) => node.appendChild(renderDiagramTerm(term, index)));
      return node;
    }
    if (operand.kind === 'factor-product') {
      node.classList.add('strand-diagram-factor-product');
      (operand.factors || []).forEach((factor) => {
        const factorNode = htmlElement('span', 'strand-diagram-factor');
        factorNode.appendChild(mathElement('(', 'strand-diagram-parenthesis'));
        factorNode.appendChild(renderDiagramOperand(factor));
        factorNode.appendChild(mathElement(')', 'strand-diagram-parenthesis'));
        node.appendChild(factorNode);
      });
      return node;
    }
    if (operand.kind === 'representation') {
      node.classList.add('strand-diagram-representation');
      node.appendChild(mathElement(operand.badgeLatex || '\\rho', 'strand-diagram-representation-badge'));
      node.appendChild(mathElement('(', 'strand-diagram-parenthesis'));
      node.appendChild(renderDiagramOperand(operand.content));
      node.appendChild(mathElement(')', 'strand-diagram-parenthesis'));
      return node;
    }
    if (operand.kind === 'vector-system') {
      const system = htmlElement('span', 'strand-diagram-vector-system');
      (operand.rows || []).forEach((row) => {
        const rowNode = htmlElement('span', 'strand-diagram-vector-row');
        const lhs = htmlElement('span', 'strand-diagram-vector-lhs');
        lhs.appendChild(mathElement(row.lhs?.rhoLatex || '\\rho(\\beta)'));
        lhs.appendChild(row.lhs?.diagram ? renderInlineDiagram(row.lhs.diagram) : mathElement(row.lhs?.basisLatex || 'e'));
        rowNode.appendChild(lhs);
        rowNode.appendChild(mathElement('=', 'strand-diagram-trace-equals'));
        const rhs = { kind: 'linear-combination', terms: row.terms || [] };
        rowNode.appendChild(renderDiagramOperand(rhs));
        system.appendChild(rowNode);
      });
      node.appendChild(system);
      return node;
    }
    node.appendChild(mathElement(operand.latex || '0'));
    return node;
  }

  function renderDiagrammaticTrace(model) {
    const trace = htmlElement('div', 'strand-diagram-trace');
    (model.rows || []).forEach((row) => {
      const rowNode = htmlElement('div', 'strand-diagram-trace-row');
      rowNode.dataset.relationId = row.relationId || '';
      rowNode.appendChild(row.lhs ? renderDiagramOperand(row.lhs) : htmlElement('span'));
      rowNode.appendChild(mathElement('=', 'strand-diagram-trace-equals'));
      const rhs = renderDiagramOperand(row.rhs);
      rowNode.appendChild(rhs);
      rowNode.appendChild(row.annotationLatex
        ? mathElement(row.annotationLatex, 'strand-diagram-trace-annotation')
        : htmlElement('span'));
      trace.appendChild(rowNode);
    });
    return trace;
  }

  function renderDiagrammaticRelations(model, presentationMode) {
    const sheet = htmlElement(
      'div',
      'strand-diagram-relation-sheet is-' + (presentationMode === 'diagrammatic' ? 'diagrammatic' : 'symbolic')
    );
    const groups = model.groups?.length
      ? model.groups
      : [{ id: 'relations', label: 'Relations', rows: model.rows || [] }];
    groups.forEach((group) => {
      const section = htmlElement('section', 'strand-diagram-relation-group');
      section.dataset.relationGroup = group.id || '';
      const heading = htmlElement('div', 'strand-diagram-relation-group-title');
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '4');
      heading.textContent = group.label || '';
      section.appendChild(heading);
      const list = htmlElement('ul', 'strand-diagram-relation-list');
      (group.rows || []).forEach((row) => {
        const item = htmlElement('li', 'strand-diagram-relation-item');
        item.dataset.relationId = row.relationId || '';
        item.setAttribute('aria-label', row.label || row.relationId || 'relation');
        const equations = htmlElement('div', 'strand-diagram-relation-equations');
        if (row.hint) {
          equations.classList.add('has-hint');
          equations.title = row.hint;
          equations.setAttribute('aria-description', row.hint);
          equations.tabIndex = 0;
        }
        (row.equations || []).forEach((equation) => {
          const equationNode = htmlElement('div', 'strand-diagram-relation-equation');
          if (equation.lhs) equationNode.appendChild(renderDiagramOperand(equation.lhs));
          if (equation.operator) equationNode.appendChild(mathElement(equation.operator, 'strand-diagram-relation-operator'));
          equationNode.appendChild(renderDiagramOperand(equation.rhs));
          equations.appendChild(equationNode);
        });
        item.appendChild(equations);
        list.appendChild(item);
      });
      section.appendChild(list);
      sheet.appendChild(section);
    });
    return sheet;
  }

  function relationReferenceCalculation() {
    const engine = window.StrandMath;
    if (!engine?.calculateStrandWord) throw new Error('The calculation engine did not load.');
    const target = calculationTargetValue(state.relationTarget);
    const basis = calculationBasisValue(target, '');
    return engine.calculateStrandWord([], {
      rank: 2,
      type: 'A',
      target,
      basis,
      convention: 'burau-compatible-v',
      includeTrace: true
    });
  }

  function renderRelationReference() {
    if (!relationTaskActive()) return;
    clearMathTypesetTargets(
      refs.calculationRelations,
      refs.calculationBasisSummary,
      refs.calculationBasisList,
      refs.calculationEquation,
      refs.calculationMatrix
    );
    if (refs.calculationEquation) refs.calculationEquation.textContent = '';
    if (refs.calculationMatrixSection) refs.calculationMatrixSection.hidden = true;
    if (refs.calculationMatrix) refs.calculationMatrix.textContent = '';
    if (refs.calculationRelations) refs.calculationRelations.replaceChildren();
    setCalculationRenderWarning([]);
    try {
      const calculation = relationReferenceCalculation();
      const diagrammatic = state.calculationPresentationMode === 'diagrammatic';
      const model = diagrammatic && window.StrandMath?.buildDiagrammaticRelations
        ? window.StrandMath.buildDiagrammaticRelations(calculation, diagrammaticPresentationOptions())
        : window.StrandMath.buildSymbolicRelations(calculation);
      if (refs.calculationRelations) {
        refs.calculationRelations.appendChild(renderDiagrammaticRelations(
          model,
          diagrammatic ? 'diagrammatic' : 'symbolic'
        ));
      }
      setCalculationRenderWarning(model.warnings || []);
    } catch (error) {
      if (refs.calculationRelations) refs.calculationRelations.textContent = error?.message || 'Unable to build the relation reference.';
    }
    queueCalculationMathTypeset();
  }

  function basisReferenceWarnings() {
    return { messages: [], codes: new Set(), atoms: 0 };
  }

  function addBasisReferenceWarning(context, code, message) {
    if (context.codes.has(code)) return;
    context.codes.add(code);
    context.messages.push(message);
  }

  function basisSymbolicOperand(item) {
    return { kind: 'symbolic', latex: item?.labelLatex || '?' };
  }

  function claimBasisDiagram(context, cost) {
    const amount = Math.max(1, Number(cost) || 1);
    if (context.atoms + amount > context.limits.atoms) {
      addBasisReferenceWarning(
        context,
        'atoms',
        `Only the first ${context.limits.atoms} basis diagram atoms are rendered; the remaining labels stay symbolic.`
      );
      return false;
    }
    context.atoms += amount;
    return true;
  }

  function basisDiagramOperand(item, model, context) {
    const math = window.StrandMath;
    const symbolic = basisSymbolicOperand(item);
    if (!math?.makePermutationDiagram || model.rank > context.limits.rank) {
      if (model.rank > context.limits.rank) {
        addBasisReferenceWarning(
          context,
          'rank',
          `Basis diagrams are limited to rank ${context.limits.rank}; these basis labels stay symbolic.`
        );
      }
      return symbolic;
    }
    const direction = DIRECTIONS.has(state.direction) ? state.direction : DEFAULT_DIRECTION;
    if (item.kind === 'permutation') {
      if (!claimBasisDiagram(context, 1)) return symbolic;
      return { kind: 'diagram', diagram: math.makePermutationDiagram(item.values, direction), latex: item.labelLatex };
    }
    if (item.kind === 'hecke-standard') {
      if (item.word.length > context.limits.compositionLength) {
        addBasisReferenceWarning(context, 'length', 'A Hecke basis diagram exceeded the composition-length display limit.');
        return symbolic;
      }
      if (!claimBasisDiagram(context, 1)) return symbolic;
      const records = item.word.map((index) => ({ family: 'hecke', index, sign: 1 }));
      return {
        kind: 'diagram',
        diagram: math.makeBraidDiagram(model.rank, records, direction, 'hecke', `standard Hecke basis element ${item.labelPlain}`),
        latex: item.labelLatex
      };
    }
    if (item.kind === 'tl-diagram') {
      if (!claimBasisDiagram(context, 1)) return symbolic;
      return {
        kind: 'diagram',
        diagram: math.makeTlDiagram(model.rank, item.pairs, direction, `Temperley-Lieb basis diagram ${item.labelPlain}`),
        latex: item.labelLatex
      };
    }
    if (item.kind === 'matrix-unit' || item.kind === 'vector-unit') {
      if (!claimBasisDiagram(context, 1)) return symbolic;
      return {
        kind: 'diagram',
        diagram: math.makeGridDiagram(
          model.rank,
          item.row,
          item.column,
          direction,
          item.kind === 'vector-unit'
        ),
        latex: item.labelLatex
      };
    }
    if (item.kind === 'burau-link-state') {
      if (!claimBasisDiagram(context, 1)) return symbolic;
      return {
        kind: 'diagram',
        diagram: math.makeBurauLinkStateDiagram(
          model.rank,
          item.cupIndex,
          direction,
          `Burau link state ${item.labelPlain}`
        ),
        latex: item.labelLatex
      };
    }
    if (item.kind !== 'hecke-kl') return symbolic;
    if (model.rank > 7 || !math.canonicalBasis || !math.OperationBudget) {
      addBasisReferenceWarning(context, 'kl-rank', 'Exact diagrammatic KL expansion is available only through rank 7.');
      return symbolic;
    }
    try {
      const budget = new math.OperationBudget({ operations: 750000, terms: 12000, timeoutMs: 2200 });
      const expansion = math.canonicalBasis(model.rank, item.values, budget);
      const terms = expansion.sortedTerms(math.comparePermutationBasis);
      if (!claimBasisDiagram(context, terms.length)) return symbolic;
      return {
        kind: 'linear-combination',
        latex: item.labelLatex,
        terms: terms.map((term, index) => {
          const word = math.reducedWord(term.basis.values, budget);
          const records = word.map((generator) => ({ family: 'hecke', index: generator, sign: 1 }));
          const basisLatex = `H_{[${term.basis.values.join(',')}]}`;
          return {
            coefficient: term.coefficient.toJSON(),
            diagram: math.makeBraidDiagram(
              model.rank,
              records,
              direction,
              'hecke',
              `standard Hecke term ${term.basis.values.join(', ')}`
            ),
            basisLatex,
            parts: math.termParts(term.coefficient, index)
          };
        })
      };
    } catch (error) {
      addBasisReferenceWarning(
        context,
        'kl-computation',
        `A KL basis expansion stayed symbolic because it exceeded the display work limit. ${error?.message || ''}`
      );
      return symbolic;
    }
  }

  function renderBasisSummary(model) {
    const summary = refs.calculationBasisSummary;
    if (!summary) return;
    summary.replaceChildren();
    summary.appendChild(mathElement(model.countLatex, 'strand-basis-count'));
    summary.appendChild(mathElement(model.definitionLatex, 'strand-basis-definition'));
    summary.appendChild(mathElement(model.resultFormLatex, 'strand-basis-result-form'));
    const explanation = htmlElement('p', 'strand-basis-explanation');
    explanation.textContent = model.explanation || '';
    summary.appendChild(explanation);
    const algorithm = htmlElement('p', 'strand-basis-algorithm');
    algorithm.textContent = model.algorithm || '';
    summary.appendChild(algorithm);
    if (model.page) {
      const range = htmlElement('p', 'strand-basis-algorithm');
      range.textContent = `Showing ${model.page.firstItem}-${model.page.lastItem} of ${model.dimension}.`;
      summary.appendChild(range);
    }
  }

  function renderBasisPagination(page) {
    if (!refs.calculationBasisPagination) return;
    refs.calculationBasisPagination.hidden = !page || page.count === '1';
    if (!page) return;
    refs.calculationBasisPrevious.disabled = !page.hasPrevious;
    refs.calculationBasisPrevious.dataset.pageStart = page.previousStart;
    refs.calculationBasisNext.disabled = !page.hasNext;
    refs.calculationBasisNext.dataset.pageStart = page.nextStart;
    refs.calculationBasisPage.value = page.index;
    refs.calculationBasisPage.dataset.pageCount = page.count;
    refs.calculationBasisPageStatus.textContent = `of ${page.count}`;
  }

  function renderBasisReference() {
    if (!basisTaskActive()) return;
    clearMathTypesetTargets(
      refs.calculationRelations,
      refs.calculationBasisSummary,
      refs.calculationBasisList,
      refs.calculationEquation,
      refs.calculationMatrix
    );
    if (refs.calculationBasisSummary) refs.calculationBasisSummary.replaceChildren();
    if (refs.calculationBasisList) refs.calculationBasisList.replaceChildren();
    renderBasisPagination(null);
    setCalculationRenderWarning([]);
    const engine = window.StrandMath;
    if (!engine?.buildBasisCatalog) {
      if (refs.calculationBasisSummary) refs.calculationBasisSummary.textContent = 'The basis catalog did not load.';
      return;
    }
    try {
      const model = engine.buildBasisCatalog({
        rank: state.strandCount,
        type: state.groupType === 'symmetric' ? 'A' : state.groupType,
        target: state.basisTarget,
        basis: state.basisBasis,
        offset: state.basisPageStart,
        pageSize: engine.DEFAULT_BASIS_PAGE_SIZE
      });
      renderBasisSummary(model);
      const warningContext = basisReferenceWarnings();
      warningContext.limits = { ...(engine.DEFAULT_DIAGRAM_LIMITS || { rank: 24, compositionLength: 160, atoms: 240 }) };
      const diagrammatic = state.calculationPresentationMode === 'diagrammatic';
      if (refs.calculationBasisList) {
        (model.page?.items || []).forEach((item) => {
          const node = htmlElement('div', `strand-basis-item${diagrammatic ? ' is-diagrammatic' : ''}`);
          node.setAttribute('role', 'listitem');
          node.setAttribute('aria-label', item.labelPlain || 'basis element');
          node.appendChild(diagrammatic
            ? renderDiagramOperand(basisDiagramOperand(item, model, warningContext))
            : mathElement(item.labelLatex));
          refs.calculationBasisList.appendChild(node);
        });
      }
      if (model.page) state.basisPageStart = model.page.start;
      renderBasisPagination(model.page);
      setCalculationRenderWarning([...(model.warnings || []), ...warningContext.messages]);
    } catch (error) {
      if (refs.calculationBasisSummary) {
        refs.calculationBasisSummary.textContent = error?.message || 'Unable to build this basis catalog.';
      }
    }
    queueCalculationMathTypeset();
  }

  function setBasisPageStart(value) {
    if (!basisTaskActive()) return;
    const text = String(value ?? '').trim();
    state.basisPageStart = /^\d+$/.test(text) ? text : '0';
    renderBasisReference();
  }

  function goToBasisPage() {
    if (!basisTaskActive() || !refs.calculationBasisPage) return;
    const text = refs.calculationBasisPage.value.trim();
    if (!/^\d+$/.test(text) || BigInt(text) < 1n) {
      setCalculationRenderWarning('Enter a positive whole page number.');
      return;
    }
    const pageCount = BigInt(refs.calculationBasisPage.dataset.pageCount || '1');
    const page = BigInt(text) > pageCount ? pageCount : BigInt(text);
    const size = BigInt(window.StrandMath?.DEFAULT_BASIS_PAGE_SIZE || 24);
    state.basisPageStart = ((page - 1n) * size).toString();
    renderBasisReference();
  }

  function setCalculationRenderWarning(messages) {
    if (!refs.calculationRenderWarning) return;
    const text = Array.isArray(messages) ? messages.filter(Boolean).join(' ') : String(messages || '');
    refs.calculationRenderWarning.textContent = text;
    refs.calculationRenderWarning.hidden = !text;
  }

  function renderCalculationResult() {
    if (relationTaskActive()) {
      renderRelationReference();
      return;
    }
    if (basisTaskActive()) {
      renderBasisReference();
      return;
    }
    const calculation = state.calculationResult;
    if (!calculation) {
      clearCalculationResultDisplay();
      return;
    }
    clearMathTypesetTargets(refs.calculationRelations, refs.calculationEquation, refs.calculationMatrix);
    setCalculationRenderWarning([]);
    let diagrammaticModel = null;
    let diagrammaticError = null;
    if (state.calculationPresentationMode === 'diagrammatic' && window.StrandMath?.buildDiagrammaticTrace) {
      try {
        diagrammaticModel = window.StrandMath.buildDiagrammaticTrace(calculation, diagrammaticPresentationOptions());
      } catch (error) {
        diagrammaticError = error;
      }
    }
    if (refs.calculationEquation) {
      refs.calculationEquation.replaceChildren();
      if (diagrammaticModel) {
        refs.calculationEquation.appendChild(renderDiagrammaticTrace(diagrammaticModel));
      } else {
        refs.calculationEquation.textContent = state.calculationLatex;
      }
    }
    if (diagrammaticModel) setCalculationRenderWarning(diagrammaticModel.warnings);
    else if (diagrammaticError) setCalculationRenderWarning(`Diagrammatic rendering failed; symbolic notation is shown. ${diagrammaticError?.message || ''}`);
    const matrix = calculation.metadata?.matrix;
    if (refs.calculationMatrixSection) refs.calculationMatrixSection.hidden = !matrix;
    if (refs.calculationMatrixLabel) {
      refs.calculationMatrixLabel.textContent = calculation.basis === 'link-state'
        ? 'reduced matrix in the link-state basis'
        : 'unreduced matrix';
    }
    if (refs.calculationMatrix) {
      refs.calculationMatrix.textContent = matrix
        ? `\\[${calculation.basis === 'link-state' ? '\\bar\\rho' : '\\rho'}(\\beta)=${window.StrandMath.formatMatrixLatex(matrix)}\\]`
        : '';
    }
    queueCalculationMathTypeset();
  }

  function clearCalculationResultDisplay() {
    clearMathTypesetTargets(refs.calculationRelations, refs.calculationEquation, refs.calculationMatrix);
    if (refs.calculationEquation) refs.calculationEquation.textContent = '';
    if (refs.calculationRelations) refs.calculationRelations.innerHTML = '';
    if (refs.calculationMatrixSection) refs.calculationMatrixSection.hidden = true;
    if (refs.calculationMatrix) refs.calculationMatrix.textContent = '';
    setCalculationRenderWarning([]);
  }

  function setCalculationMessage(message, isError = false, isStale = false) {
    if (!refs.calculationMessage) return;
    refs.calculationMessage.textContent = message || '';
    refs.calculationMessage.classList.toggle('is-error', !!isError);
    refs.calculationMessage.classList.toggle('is-stale', !!isStale);
  }

  function copyCalculationText(text, successMessage) {
    if (!text || state.calculationStale || state.calculationKey !== calculationFingerprint()) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => setCalculationMessage(successMessage))
        .catch(() => fallbackCopyText(text, successMessage));
      return;
    }
    fallbackCopyText(text, successMessage);
  }

  function fallbackCopyText(text, successMessage) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    setCalculationMessage(successMessage);
  }

  function refreshExport(data = buildPermutationData()) {
    if (!refs.exportOut) return;
    const format = refs.exportFormat.value;
    if (format === 'json') refs.exportOut.value = exportJson();
    else if (format === 'plain') refs.exportOut.value = exportPlain(data);
    else refs.exportOut.value = exportLatex(data);
  }

  function exportJson() {
    const appliedGenerators = state.appliedSteps
      .map(exportGeneratorRecord)
      .filter(Boolean);
    const coxeterOnly = wordIsCoxeterOnly(appliedGenerators);
    const payload = {
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      groupType: state.groupType,
      strandCount: state.strandCount,
      direction: state.direction,
      strandDisplayStyle: state.strandDisplayStyle,
      generatorSpacing: state.generatorSpacing,
      generatorGapEnabled: state.generatorGapEnabled,
      strandSizeMode: state.strandSizeMode,
      fixedGeneratorSize: state.fixedGeneratorSize,
      appliedGenerators,
      calculationSettings: {
        task: calculationTaskValue(state.calculationTask),
        target: state.calculationTarget,
        relationTarget: calculationTargetValue(state.relationTarget),
        basisTarget: calculationTargetValue(state.basisTarget),
        basisBasis: calculationBasisValue(state.basisTarget, state.basisBasis),
        basis: state.calculationBasis,
        convention: 'burau-compatible-v',
        presentation: {
          mode: calculationPresentationModeValue(state.calculationPresentationMode),
          scope: calculationPresentationScopeValue(state.calculationPresentationScope)
        }
      }
    };
    if (coxeterOnly) payload.appliedSteps = appliedGenerators.map((record) => record.index);
    if (state.calculationResult && !state.calculationStale && state.calculationKey === calculationFingerprint()) {
      payload.calculation = window.StrandMath?.serializeCalculation
        ? window.StrandMath.serializeCalculation(state.calculationResult)
        : null;
    }
    return JSON.stringify(payload, null, 2);
  }

  function exportLatex(data) {
    const group = groupLatex(data.groupType, data.n);
    if (!data.coxeterOnly) {
      return [
        '% Strand Diagram Calculator',
        `\\[x=${generatorWordLatex(data.wordRecords, true)}\\]`,
        `\\[\\text{mixed typed word over } ${group};\\quad \\text{Coxeter reduction not applicable}\\]`
      ].join('\n');
    }
    const lines = [
      '% Strand Diagram Calculator',
      `\\[w=${generatorWordLatex(data.steps, true)}\\in ${group}\\]`,
      `\\[w=${cycleLatex(data.cycles)}=${oneLineLatex(data)}=${twoLineLatex(data)}\\]`,
      `\\[\\ell(w)=${data.length},\\quad \\text{input word length}=${data.wordRecords.length}\\]`
    ];
    if (data.n <= MATRIX_DISPLAY_LIMIT && data.fullPermutation) {
      const rows = data.signed ? signedMatrixLatexRows(data.signedOneLine) : matrixLatexRows(data.fullPermutation);
      lines.push(`\\[\\begin{bmatrix}${rows.join('\\\\')}\\end{bmatrix}\\]`);
    }
    return lines.join('\n');
  }

  function matrixLatexRows(permutation) {
    return permutation.map((_, rowIndex) => {
      const row = rowIndex + 1;
      return permutation.map((image) => image === row ? '1' : '').join('&');
    });
  }

  function signedMatrixLatexRows(oneLine) {
    return oneLine.map((_, rowIndex) => {
      const row = rowIndex + 1;
      return oneLine.map((image) => {
        if (Math.abs(image) !== row) return '';
        return image > 0 ? '1' : '-1';
      }).join('&');
    });
  }

  function permutationMatrixLatex(permutation) {
    const rows = matrixLatexRows(permutation);
    const body = rows.join('\\\\');
    if (permutation.length >= 8) return `\\left(\\begin{smallmatrix}${body}\\end{smallmatrix}\\right)`;
    return `\\begin{pmatrix}${body}\\end{pmatrix}`;
  }

  function signedPermutationMatrixLatex(oneLine) {
    const rows = signedMatrixLatexRows(oneLine);
    const body = rows.join('\\\\');
    if (oneLine.length >= 8) return `\\left(\\begin{smallmatrix}${body}\\end{smallmatrix}\\right)`;
    return `\\begin{pmatrix}${body}\\end{pmatrix}`;
  }

  function exportPlain(data) {
    const lines = [
      'Strand Diagram Calculator',
      `group: ${groupPlainLabel(data.groupType, data.n)}`,
      `${data.signed ? 'rank' : 'strandCount'}: ${data.n}`,
      `direction: ${DIRECTION_LABELS[state.direction] || state.direction}`,
      `chronological generators: ${data.wordRecords.length ? data.wordRecords.map(generatorLabel).join(', ') : 'identity'}`,
      `composition word: ${plainGeneratorWord(data.wordRecords)}`
    ];
    if (data.coxeterOnly) {
      lines.push(
        `transpositions: ${plainTranspositionWord(data.steps, data)}`,
        `cycle notation: ${plainCycleNotation(data.cycles)}`,
        `one-line: ${data.oneLinePlain}`,
        `${data.signed ? 'Coxeter length' : 'inversions'}: ${data.length}`,
        `reduced: ${data.isReduced ? 'yes' : 'no'}`
      );
      if (data.canonicalSteps) lines.push(`canonical reduced word: ${plainGeneratorWord(data.canonicalSteps)}`);
    } else {
      lines.push('Coxeter reduction: not applicable to mixed typed words');
    }
    return lines.join('\n');
  }

  function plainGeneratorWord(steps) {
    if (!steps.length) return 'e';
    return steps.slice().reverse().map(generatorLabel).join(' ');
  }

  function plainTranspositionWord(steps, data = null) {
    if (!steps.length) return 'e';
    const groupType = data?.groupType || state.groupType;
    return steps.slice().reverse().map((step) => {
      if (!signedGroupActive(groupType)) return compactCycleEntriesPlain([step, step + 1]);
      return generatorSwapPairs(groupType, data?.n || state.strandCount, step)
        .map(compactCycleEntriesPlain)
        .join('');
    }).join('');
  }

  function plainCycleNotation(cycles) {
    if (!cycles.length) return '()';
    return cycles.map(compactCycleEntriesPlain).join('');
  }

  function compactCycleEntriesPlain(entries) {
    const compact = entries.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 10);
    return compact ? `(${entries.join('')})` : `(${entries.join(' ')})`;
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
      const result = importJson(refs.importInput.value);
      setExportMessage(result.dropped
        ? `JSON imported; dropped ${result.dropped} invalid generator${result.dropped === 1 ? '' : 's'}.`
        : 'JSON imported.');
      setStatus('imported JSON preset');
      renderAll({ preserveMessage: true });
      if (relationTaskActive()) renderRelationReference();
      else if (!basisTaskActive()) {
        clearCalculationResultDisplay();
        setCalculationMessage('Calculation settings imported. Calculate to verify the result locally.');
      }
    } catch (error) {
      setExportMessage(error?.message || 'Unable to import JSON.', true);
    }
  }

  function importJson(text) {
    const data = JSON.parse(text || '{}');
    if (data.kind && data.kind !== EXPORT_KIND) throw new Error('This is not a strand diagram preset.');
    const groupType = groupTypeValue(data.groupType || DEFAULT_GROUP_TYPE);
    const strandCount = cleanRankForGroup(data.strandCount, groupType);
    const direction = DIRECTIONS.has(data.direction) ? data.direction : DEFAULT_DIRECTION;
    const strandDisplayStyle = strandDisplayStyleValue(data.strandDisplayStyle);
    const generatorSpacing = importedGeneratorSpacing(data);
    const generatorGapEnabled = data.generatorGapEnabled === true;
    const strandSizeMode = strandSizeModeValue(data.strandSizeMode);
    const fixedGeneratorSize = fixedGeneratorSizeValue(data.fixedGeneratorSize);
    const calculationTask = calculationTaskValue(data.calculationSettings?.task);
    const calculationTarget = calculationTargetValue(data.calculationSettings?.target || data.calculation?.target || 'tl');
    const relationTarget = calculationTargetValue(data.calculationSettings?.relationTarget || calculationTarget);
    const basisTarget = calculationTargetValue(data.calculationSettings?.basisTarget || calculationTarget);
    const calculationBasis = calculationBasisValue(
      calculationTarget,
      data.calculationSettings?.basis || data.calculation?.basis
    );
    const basisBasis = calculationBasisValue(
      basisTarget,
      data.calculationSettings?.basisBasis || calculationBasis
    );
    const calculationPresentationMode = calculationPresentationModeValue(data.calculationSettings?.presentation?.mode);
    const calculationPresentationScope = calculationPresentationScopeValue(data.calculationSettings?.presentation?.scope);
    const rawSteps = Array.isArray(data.appliedGenerators)
      ? data.appliedGenerators
      : Array.isArray(data.appliedSteps)
        ? data.appliedSteps
        : [];
    const steps = rawSteps
      .map(normalizeGeneratorRecord)
      .filter(Boolean);
    const valid = filterValidSteps(steps, strandCount, groupType);
    state.groupType = groupType;
    state.strandCount = strandCount;
    state.direction = direction;
    state.strandDisplayStyle = strandDisplayStyle;
    state.generatorSpacing = generatorSpacing;
    state.generatorGapEnabled = generatorGapEnabled;
    state.strandSizeMode = strandSizeMode;
    state.fixedGeneratorSize = fixedGeneratorSize;
    state.appliedSteps = valid;
    state.calculationTask = calculationTask;
    state.calculationTarget = calculationTarget;
    state.relationTarget = relationTarget;
    state.basisTarget = basisTarget;
    state.basisBasis = basisBasis;
    state.basisPageStart = '0';
    state.calculationBasis = calculationBasis;
    state.calculationPresentationMode = calculationPresentationMode;
    state.calculationPresentationScope = calculationPresentationScope;
    state.calculationResult = null;
    state.calculationKey = '';
    state.calculationStale = false;
    state.calculationLatex = '';
    state.calculationPlain = '';
    return { dropped: steps.length - valid.length };
  }

  function importedGeneratorSpacing(data) {
    if (Object.prototype.hasOwnProperty.call(data, 'generatorSpacing')) {
      return generatorSpacingValue(data.generatorSpacing);
    }
    return data.generatorGapMode === 'gap'
      ? generatorSpacingValue(0.62)
      : DEFAULT_GENERATOR_SPACING;
  }

  function cleanPositiveInteger(value, fallback) {
    const parsed = parseInteger(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < 1) return 1;
    return parsed;
  }

  function clampInteger(value, min, max, fallback) {
    const parsed = parseInteger(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }

  function parseInteger(value) {
    const text = String(value ?? '').trim();
    if (!text) return Number.NaN;
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return Number.NaN;
    return Math.floor(parsed);
  }

  function inlineMath(latex) {
    return `\\(${latex}\\)`;
  }

  function displayMath(latex) {
    return `\\[${latex}\\]`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(message) {
    if (!refs.status) return;
    clearMathTypesetTargets(refs.status);
    refs.status.textContent = message || 'ready';
    queueMathTypeset();
  }

  function setExportMessage(message, isError = false) {
    if (!refs.exportMessage) return;
    refs.exportMessage.textContent = message || '';
    refs.exportMessage.classList.toggle('is-error', !!isError);
  }

  let calculationMathTypesetQueued = false;
  function queueCalculationMathTypeset() {
    if (!window.MathJax || calculationMathTypesetQueued) return;
    calculationMathTypesetQueued = true;
    const run = () => {
      calculationMathTypesetQueued = false;
      if (!window.MathJax?.typesetPromise) return;
      const targets = [
        refs.calculationRelations,
        refs.calculationBasisSummary,
        refs.calculationBasisList,
        refs.calculationEquation,
        refs.calculationMatrix
      ].filter(Boolean);
      if (window.MathJax.typesetClear) window.MathJax.typesetClear(targets);
      window.MathJax.typesetPromise(targets).catch(() => {});
    };
    if (window.MathJax.startup?.promise) {
      window.MathJax.startup.promise.then(run).catch(() => { calculationMathTypesetQueued = false; });
    } else {
      window.setTimeout(run, 0);
    }
  }

  let mathTypesetQueued = false;
  function queueMathTypeset() {
    if (!window.MathJax || mathTypesetQueued) return;
    mathTypesetQueued = true;
    const run = () => {
      mathTypesetQueued = false;
      if (!window.MathJax?.typesetPromise) return;
      const targets = [
        refs.basicInfo,
        refs.inputChart,
        refs.statusBadge,
        refs.status,
        refs.summary,
        refs.calculationSource
      ].filter(Boolean);
      if (window.MathJax.typesetClear) window.MathJax.typesetClear(targets);
      window.MathJax.typesetPromise(targets).catch(() => {});
    };
    if (window.MathJax.startup?.promise) window.MathJax.startup.promise.then(run).catch(() => { mathTypesetQueued = false; });
    else window.setTimeout(run, 0);
  }

  function clearMathTypesetTargets(...nodes) {
    const targets = nodes.flat().filter(Boolean);
    if (targets.length && window.MathJax?.typesetClear) window.MathJax.typesetClear(targets);
  }

  function typesetMathNodes(nodes) {
    const targets = (nodes || []).filter(Boolean);
    if (!targets.length || !window.MathJax) return;
    const run = () => {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise(targets).catch(() => {});
    };
    if (window.MathJax.startup?.promise) window.MathJax.startup.promise.then(run).catch(() => {});
    else window.setTimeout(run, 0);
  }
})();
