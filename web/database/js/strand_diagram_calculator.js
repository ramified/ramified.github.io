(() => {
  'use strict';

  const EXPORT_KIND = 'strand-diagram-calculator';
  const EXPORT_VERSION = 1;
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
  const STRAND_DISPLAY_STYLES = new Set(['straight', 'soft']);
  const STRAND_SIZE_MODES = new Set(['fit', 'fixed']);
  const BASIC_EXPRESSION_FORMATS = new Set(['composition', 'transpositions', 'cycle', 'one-line', 'two-line', 'matrix']);
  const BASIC_REDUCED_FORMATS = new Set(['composition', 'transpositions']);
  const DIRECTION_LABELS = {
    'up-down': 'up to down',
    'down-up': 'down to up',
    'left-right': 'left to right',
    'right-left': 'right to left'
  };
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
    refs.count = $('strand-count');
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
  }

  function bindEvents() {
    bindCards();

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
    refs.basicExpressionFormat.addEventListener('change', () => {
      state.basicExpressionFormat = basicExpressionFormatValue(refs.basicExpressionFormat.value);
      renderAll({ preserveMessage: true });
    });
    refs.basicReducedOnly.addEventListener('change', () => {
      state.basicReducedOnly = refs.basicReducedOnly.checked;
      renderAll({ preserveMessage: true });
    });
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
  }

  function bindInputChart() {
    if (!refs.inputChart) return;
    refs.inputChart.addEventListener('click', (event) => {
      if (Date.now() < suppressInputChartClickUntil) return;
      const chip = event.target.closest('[data-generator-step]');
      if (!chip) return;
      const generator = parseInteger(chip.dataset.generatorStep);
      if (!validGenerator(generator)) return;
      addGenerator(generator);
    });

    refs.inputChart.addEventListener('pointerdown', (event) => {
      const chip = event.target.closest('[data-generator-step]');
      if (!chip || event.button !== 0) return;
      const generator = parseInteger(chip.dataset.generatorStep);
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
        setStatus(`drop s_${generator} on the strand canvas to insert it`);
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
      setStatus(`kept s_${generator}`);
      renderAll({ preserveMessage: true });
      return;
    }

    if (Number.isInteger(insertIndex)) {
      insertGeneratorAt(generator, insertIndex, `moved s_${generator} to word position ${insertIndex + 1}`);
      return;
    }

    setStatus(`deleted s_${generator} from word position ${sourceIndex + 1}`);
    renderAll({ preserveMessage: true });
  }

  function removeDraggedCanvasGenerator(drag) {
    if (drag.removed) return;
    let index = Math.max(0, Math.min(state.appliedSteps.length - 1, drag.sourceIndex));
    if (state.appliedSteps[index] !== drag.generator) {
      index = state.appliedSteps.findIndex((step) => step === drag.generator);
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
    ghost.textContent = `s_${generator}`;
    document.body.appendChild(ghost);
    return ghost;
  }

  function moveGeneratorGhost(ghost, clientX, clientY) {
    if (!ghost) return;
    ghost.style.left = `${clientX + 10}px`;
    ghost.style.top = `${clientY + 10}px`;
  }

  function bindCards() {
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

  function commitStrandCount() {
    const next = cleanPositiveInteger(refs.count.value, DEFAULT_STRAND_COUNT);
    state.strandCount = next;
    refs.count.value = String(next);
    const before = state.appliedSteps.length;
    state.appliedSteps = filterValidSteps(state.appliedSteps, next);
    const removed = before - state.appliedSteps.length;
    setStatus(removed ? `strand count set to ${next}; dropped ${removed} invalid step${removed === 1 ? '' : 's'}` : `strand count set to ${next}`);
    renderAll({ preserveMessage: true });
  }

  function syncGeneratorBounds() {
    if (!refs.generator) return;
    const max = Math.max(1, state.strandCount - 1);
    refs.generator.min = '1';
    refs.generator.max = String(max);
    if (state.strandCount <= 1) {
      refs.generator.value = '1';
      return;
    }
    const value = clampInteger(refs.generator.value, 1, max, 1);
    refs.generator.value = String(value);
  }

  function syncControls() {
    refs.count.value = String(state.strandCount);
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
    refs.statusBadge.textContent = `S_${state.strandCount}`;
    refs.clear.disabled = state.appliedSteps.length === 0;
    syncGeneratorBounds();
    syncBasicInfoControls();
    renderInputChart();
  }

  function syncBasicInfoControls() {
    const format = basicExpressionFormatValue(state.basicExpressionFormat);
    state.basicExpressionFormat = format;
    refs.basicExpressionFormat.value = format;

    const reducedAvailable = basicReducedApplies(format);
    refs.basicReducedOnly.checked = state.basicReducedOnly;
    refs.basicReducedOnly.disabled = !reducedAvailable;
    refs.basicReducedOnly.title = reducedAvailable
      ? 'Show a canonical reduced expression for this permutation.'
      : 'Reduced display is available for composition words and transpositions.';

    const label = refs.basicReducedOnly.closest('.strand-basic-reduced-toggle');
    if (label) {
      label.classList.toggle('is-disabled', !reducedAvailable);
      label.title = refs.basicReducedOnly.title;
    }
  }

  function addGeneratorFromInput() {
    if (state.strandCount <= 1) {
      setStatus('S_1 has only the identity.');
      renderAll({ preserveMessage: true });
      return;
    }
    const max = state.strandCount - 1;
    const generator = clampInteger(refs.generator.value, 1, max, 1);
    refs.generator.value = String(generator);
    addGenerator(generator);
  }

  function addGenerator(generator) {
    insertGeneratorAt(generator, state.appliedSteps.length, `added s_${generator}`);
  }

  function insertGeneratorAt(generator, index, message) {
    if (!validGenerator(generator)) {
      setStatus('choose a valid adjacent generator');
      renderAll({ preserveMessage: true });
      return;
    }
    const insertIndex = Math.max(0, Math.min(state.appliedSteps.length, Number.isInteger(index) ? index : state.appliedSteps.length));
    state.appliedSteps.splice(insertIndex, 0, generator);
    setStatus(message || `inserted s_${generator} at word position ${insertIndex + 1}`);
    renderAll({ preserveMessage: true });
  }

  function undoStep() {
    if (!state.appliedSteps.length) return;
    const removed = state.appliedSteps.pop();
    setStatus(`removed s_${removed}`);
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
    if (state.strandCount <= 1) {
      refs.inputChart.innerHTML = '<div class="strand-note">S_1 has no adjacent generators.</div>';
      return;
    }
    const chips = [];
    for (let step = 1; step < state.strandCount; step++) {
      chips.push(`<button class="strand-generator-chip" type="button" data-generator-step="${step}" aria-label="generator s ${step}">s_${step}</button>`);
    }
    refs.inputChart.innerHTML = chips.join('');
  }

  function renderAll(options = {}) {
    syncControls();
    resizeCanvas();
    const data = buildPermutationData();
    renderCanvas(data);
    renderBasicInfo(data);
    refreshExport(data);
    renderSummary(data);
    if (!options.preserveMessage && refs.exportMessage) refs.exportMessage.textContent = '';
    queueMathTypeset();
  }

  function renderSummary(data) {
    const length = state.appliedSteps.length;
    refs.summary.textContent = length
      ? `${length} generator${length === 1 ? '' : 's'}; w = ${data.oneLinePlain}`
      : `identity in S_${state.strandCount}`;
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
    const n = state.strandCount;
    const steps = filterValidSteps(state.appliedSteps, n);
    const components = buildComponentStates(steps);
    const imageBySource = new Map();
    const terminalOrderByPosition = new Map();

    components.forEach((component) => {
      component.order.forEach((label, index) => {
        const position = component.start + index;
        terminalOrderByPosition.set(position, label);
        if (label !== position) imageBySource.set(label, position);
      });
    });

    const inversionCount = components.reduce((sum, component) => sum + countInversions(component.order), 0);
    const isReduced = steps.length === inversionCount;
    const fullPermutation = n <= ONE_LINE_DISPLAY_LIMIT ? fullPermutationArray(n, imageBySource) : null;
    const fullTerminalOrder = n <= CANVAS_STRAND_LIMIT ? fullTerminalOrderArray(n, terminalOrderByPosition) : null;
    const oneLinePlain = fullPermutation
      ? `(${fullPermutation.join(',')})`
      : compactMappingPlain(imageBySource, n);
    const cycles = cyclesFromSparseMap(imageBySource);
    const canonicalSteps = inversionCount <= REDUCED_WORD_GENERATION_LIMIT
      ? canonicalStepsFromComponents(components)
      : null;

    return {
      n,
      steps,
      components,
      imageBySource,
      terminalOrderByPosition,
      inversionCount,
      isReduced,
      fullPermutation,
      fullTerminalOrder,
      oneLinePlain,
      cycles,
      canonicalSteps
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

  function compactMappingPlain(imageBySource, n) {
    if (!imageBySource.size) return `identity in S_${n}`;
    const pairs = [...imageBySource.entries()]
      .sort(([a], [b]) => a - b)
      .slice(0, 12)
      .map(([source, image]) => `${source}->${image}`);
    const suffix = imageBySource.size > 12 ? ', ...' : '';
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
      drawCanvasMessage(ctx, width, height, 'S_1 identity');
      return;
    }

    drawStrands(ctx, width, height, view);
    drawInsertionGuide(ctx, width, height, view);
    drawCanvasLegend(ctx, width, height, view);
  }

  function canvasView(data) {
    if (data.n <= CANVAS_STRAND_LIMIT) {
      const steps = data.steps.slice(0, MAX_CANVAS_STEPS);
      return {
        tracks: Array.from({ length: data.n }, (_, index) => index + 1),
        steps,
        sourceIndices: steps.map((_, index) => index),
        hiddenSteps: Math.max(0, data.steps.length - MAX_CANVAS_STEPS),
        full: true,
        label: `${data.n} strand${data.n === 1 ? '' : 's'}`
      };
    }

    if (!data.steps.length) {
      const limit = Math.min(CANVAS_STRAND_LIMIT, data.n);
      return {
        tracks: Array.from({ length: limit }, (_, index) => index + 1),
        steps: [],
        sourceIndices: [],
        hiddenSteps: 0,
        full: false,
        label: `first ${limit} of ${data.n} strands`
      };
    }

    const last = data.steps[data.steps.length - 1];
    const component = data.components.find((item) => last >= item.start && last < item.end) || data.components[0];
    const span = component.end - component.start + 1;
    const center = last + 0.5;
    const half = Math.floor(CANVAS_STRAND_LIMIT / 2);
    let start = Math.max(component.start, Math.floor(center) - half);
    let end = Math.min(component.end, start + CANVAS_STRAND_LIMIT - 1);
    start = Math.max(component.start, end - CANVAS_STRAND_LIMIT + 1);
    const tracks = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    const localStepRecords = data.steps
      .map((step, index) => ({ step, index }))
      .filter((record) => record.step >= start && record.step < end)
      .slice(-MAX_CANVAS_STEPS);
    const localSteps = localStepRecords.map((record) => record.step);
    const hiddenOutside = data.steps.length - localSteps.length;
    return {
      tracks,
      steps: localSteps,
      sourceIndices: localStepRecords.map((record) => record.index),
      hiddenSteps: Math.max(0, hiddenOutside),
      full: false,
      label: span > tracks.length
        ? `active window ${start}-${end} in S_${data.n}`
        : `active component ${component.start}-${component.end} in S_${data.n}`
    };
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
    const trackStart = tracks[0];
    const trackEnd = tracks[tracks.length - 1];
    const steps = view.steps.filter((step) => step >= trackStart && step < trackEnd);
    const layout = strandLayerLayout(steps.length);
    const layerMax = layout.total;
    const order = tracks.slice();
    const strandSegments = new Map();
    order.forEach((label, index) => {
      strandSegments.set(label, [[pointForLayerPosition(index, 0, tracks.length, layerMax, width, height)]]);
    });

    if (!steps.length) {
      order.forEach((label, index) => {
        appendStrandPoint(strandSegments, label, pointForLayerPosition(index, layerMax, tracks.length, layerMax, width, height));
      });
    } else {
      steps.forEach((step, stepIndex) => {
        const local = step - trackStart;
        const leftLabel = order[local];
        const rightLabel = order[local + 1];
        const nextOrder = order.slice();
        nextOrder[local] = rightLabel;
        nextOrder[local + 1] = leftLabel;
        nextOrder.forEach((label, index) => {
          appendStrandPoint(strandSegments, label, pointForLayerPosition(index, layout.crossingEnds[stepIndex], tracks.length, layerMax, width, height));
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
    }

    const lineWidth = tracks.length > 42 ? 1.05 : tracks.length > 20 ? 1.45 : 2.2;
    strandSegments.forEach((segments, label) => {
      segments.forEach((points) => drawStrandPath(ctx, points, strandColor(label), lineWidth, state.strandDisplayStyle));
    });

    const endpoints = endpointMapFromSegments(strandSegments);
    drawEndpointLabels(ctx, endpoints, tracks.length, layerMax, width, height);
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

  function drawStrandPath(ctx, points, color, lineWidth, style) {
    if (points.length < 2) return;
    ctx.save();
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
    if (!view.tracks.length || !view.steps.length) return null;

    const trackStart = view.tracks[0];
    const trackEnd = view.tracks[view.tracks.length - 1];
    const visibleSteps = view.steps
      .map((step, index) => ({ step, sourceIndex: view.sourceIndices[index] ?? index }))
      .filter((record) => record.step >= trackStart && record.step < trackEnd);
    if (!visibleSteps.length) return null;

    const layout = strandLayerLayout(visibleSteps.length);
    const layerMax = layout.total;
    const radius = generatorHitRadius(width, height, view.tracks.length, layerMax);
    let best = null;

    visibleSteps.forEach((record, index) => {
      const local = record.step - trackStart;
      if (local < 0 || local + 1 >= view.tracks.length) return;
      const previousLayer = index === 0
        ? 0
        : layout.intervals[index - 1]?.end ?? layout.crossingEnds[index - 1];
      const crossingLayer = (previousLayer + layout.crossingEnds[index]) / 2;
      const first = pointForLayerPosition(local, crossingLayer, view.tracks.length, layerMax, width, height);
      const second = pointForLayerPosition(local + 1, crossingLayer, view.tracks.length, layerMax, width, height);
      const center = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2
      };
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance > radius || (best && distance >= best.distance)) return;
      best = {
        generator: record.step,
        sourceIndex: record.sourceIndex,
        distance
      };
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
      ['strands', inlineMath(`S_{${data.n}}`)],
      ['word length', inlineMath(String(data.steps.length))],
      ['direction', escapeHtml(DIRECTION_LABELS[state.direction] || state.direction)],
      ['inversions', inlineMath(String(data.inversionCount))],
      ['reduced?', escapeHtml(reducedText(data))]
    ];

    refs.basicInfo.innerHTML = `
      <div class="strand-stat-grid">
        ${rows.map(([label, value]) => statRow(label, value)).join('')}
        ${basicExpressionMarkup(data)}
      </div>
    `;
  }

  function statRow(label, value) {
    return `
      <div class="strand-stat-row">
        <div class="strand-stat-label">${escapeHtml(label)}</div>
        <div class="strand-stat-value">${value}</div>
      </div>
    `;
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
      return steps ? inlineMath(transpositionWordLatex(steps)) : reducedWordLimitMessage(data);
    }
    if (format === 'cycle') return inlineMath(cycleLatex(data.cycles));
    if (format === 'one-line') return inlineMath(oneLineLatex(data));
    if (format === 'two-line') return inlineMath(twoLineLatex(data));
    return inlineMath(generatorWordLatex(data.steps, true));
  }

  function basicExpressionSteps(format, data) {
    if (state.basicReducedOnly && basicReducedApplies(format)) return data.canonicalSteps;
    return data.steps;
  }

  function reducedWordLimitMessage(data) {
    return escapeHtml(`${data.inversionCount} generators; too long to display`);
  }

  function basicExpressionLabel(format) {
    const reduced = state.basicReducedOnly && basicReducedApplies(format) ? ' (reduced)' : '';
    if (format === 'transpositions') return `transpositions${reduced}`;
    if (format === 'cycle') return 'cycle notation';
    if (format === 'one-line') return 'one-line';
    if (format === 'two-line') return 'two-line';
    return `composition word${reduced}`;
  }

  function matrixMarkup(data) {
    if (data.n > MATRIX_DISPLAY_LIMIT || !data.fullPermutation) {
      const moved = data.imageBySource.size;
      return statRow('matrix', `<div class="strand-note">Permutation matrix is shown for at most ${MATRIX_DISPLAY_LIMIT} strands. This permutation moves ${moved} strand${moved === 1 ? '' : 's'}.</div>`);
    }
    return statRow('matrix', `<div class="strand-matrix-wrap">${displayMath(`P_w=${permutationMatrixLatex(data.fullPermutation)}`)}</div>`);
  }

  function reducedText(data) {
    return data.isReduced
      ? `yes (length ${data.steps.length})`
      : `no (minimal length ${data.inversionCount})`;
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

  function validGenerator(generator) {
    return Number.isInteger(generator) && generator >= 1 && generator < state.strandCount;
  }

  function generatorWordLatex(steps, compositionOrder) {
    if (!steps.length) return 'e';
    const ordered = compositionOrder ? steps.slice().reverse() : steps.slice();
    if (ordered.length > WORD_DISPLAY_LIMIT) {
      const head = ordered.slice(0, Math.floor(WORD_DISPLAY_LIMIT / 2));
      const tail = ordered.slice(-Math.floor(WORD_DISPLAY_LIMIT / 2));
      return `${head.map((step) => `s_{${step}}`).join('\\,')}\\,\\cdots\\,${tail.map((step) => `s_{${step}}`).join('\\,')}`;
    }
    return ordered.map((step) => `s_{${step}}`).join('\\,');
  }

  function generatorListLatex(steps) {
    if (!steps.length) return '()';
    const limited = steps.length > WORD_DISPLAY_LIMIT
      ? steps.slice(0, WORD_DISPLAY_LIMIT).map((step) => `s_{${step}}`).join(', ') + ', \\ldots'
      : steps.map((step) => `s_{${step}}`).join(', ');
    return `(${limited})`;
  }

  function transpositionWordLatex(steps) {
    if (!steps.length) return 'e';
    const ordered = steps.slice().reverse();
    const body = ordered.length > WORD_DISPLAY_LIMIT
      ? ordered.slice(0, WORD_DISPLAY_LIMIT).map(transpositionLatex).join('') + '\\cdots'
      : ordered.map(transpositionLatex).join('');
    return body;
  }

  function transpositionLatex(step) {
    return compactCycleEntriesLatex([step, step + 1]);
  }

  function cycleLatex(cycles) {
    if (!cycles.length) return '()';
    return cycles.map(compactCycleEntriesLatex).join('');
  }

  function compactCycleEntriesLatex(entries) {
    const compact = entries.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 10);
    return compact ? `(${entries.join('')})` : `(${entries.join('\\,')})`;
  }

  function oneLineLatex(data) {
    if (data.fullPermutation) return `(${data.fullPermutation.join(',')})`;
    if (!data.imageBySource.size) return `\\operatorname{id}_{S_{${data.n}}}`;
    const pairs = [...data.imageBySource.entries()].sort(([a], [b]) => a - b);
    const limited = pairs.slice(0, 14).map(([source, image]) => `w(${source})=${image}`).join(',\\ ');
    return `${limited}${pairs.length > 14 ? ',\\ \\ldots' : ''};\\quad w(i)=i\\text{ otherwise}`;
  }

  function twoLineLatex(data) {
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

  function refreshExport(data = buildPermutationData()) {
    if (!refs.exportOut) return;
    const format = refs.exportFormat.value;
    if (format === 'json') refs.exportOut.value = exportJson();
    else if (format === 'plain') refs.exportOut.value = exportPlain(data);
    else refs.exportOut.value = exportLatex(data);
  }

  function exportJson() {
    return JSON.stringify({
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      strandCount: state.strandCount,
      direction: state.direction,
      strandDisplayStyle: state.strandDisplayStyle,
      generatorSpacing: state.generatorSpacing,
      generatorGapEnabled: state.generatorGapEnabled,
      strandSizeMode: state.strandSizeMode,
      fixedGeneratorSize: state.fixedGeneratorSize,
      appliedSteps: state.appliedSteps.slice()
    }, null, 2);
  }

  function exportLatex(data) {
    const lines = [
      '% Strand Diagram Calculator',
      `\\[w=${generatorWordLatex(data.steps, true)}\\in S_{${data.n}}\\]`,
      `\\[w=${cycleLatex(data.cycles)}=${oneLineLatex(data)}=${twoLineLatex(data)}\\]`,
      `\\[\\ell(w)=${data.inversionCount},\\quad \\text{input word length}=${data.steps.length}\\]`
    ];
    if (data.n <= MATRIX_DISPLAY_LIMIT && data.fullPermutation) {
      lines.push(`\\[P_{w(i),i}=\\begin{bmatrix}${matrixLatexRows(data.fullPermutation).join('\\\\')}\\end{bmatrix}\\]`);
    }
    return lines.join('\n');
  }

  function matrixLatexRows(permutation) {
    return permutation.map((_, rowIndex) => {
      const row = rowIndex + 1;
      return permutation.map((image) => image === row ? '1' : '').join('&');
    });
  }

  function permutationMatrixLatex(permutation) {
    const rows = matrixLatexRows(permutation);
    const body = rows.join('\\\\');
    if (permutation.length >= 8) return `\\left(\\begin{smallmatrix}${body}\\end{smallmatrix}\\right)`;
    return `\\begin{pmatrix}${body}\\end{pmatrix}`;
  }

  function exportPlain(data) {
    const lines = [
      'Strand Diagram Calculator',
      `strandCount: ${data.n}`,
      `direction: ${DIRECTION_LABELS[state.direction] || state.direction}`,
      `chronological steps: ${data.steps.length ? data.steps.map((step) => `s_${step}`).join(', ') : 'identity'}`,
      `composition word: ${plainGeneratorWord(data.steps)}`,
      `transpositions: ${plainTranspositionWord(data.steps)}`,
      `cycle notation: ${plainCycleNotation(data.cycles)}`,
      `one-line: ${data.oneLinePlain}`,
      `inversions: ${data.inversionCount}`,
      `reduced: ${data.isReduced ? 'yes' : 'no'}`
    ];
    if (data.canonicalSteps) lines.push(`canonical reduced word: ${plainGeneratorWord(data.canonicalSteps)}`);
    return lines.join('\n');
  }

  function plainGeneratorWord(steps) {
    if (!steps.length) return 'e';
    return steps.slice().reverse().map((step) => `s_${step}`).join(' ');
  }

  function plainTranspositionWord(steps) {
    if (!steps.length) return 'e';
    return steps.slice().reverse().map((step) => compactCycleEntriesPlain([step, step + 1])).join('');
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
        ? `JSON imported; dropped ${result.dropped} invalid step${result.dropped === 1 ? '' : 's'}.`
        : 'JSON imported.');
      setStatus('imported JSON preset');
      renderAll({ preserveMessage: true });
    } catch (error) {
      setExportMessage(error?.message || 'Unable to import JSON.', true);
    }
  }

  function importJson(text) {
    const data = JSON.parse(text || '{}');
    if (data.kind && data.kind !== EXPORT_KIND) throw new Error('This is not a strand diagram preset.');
    const strandCount = cleanPositiveInteger(data.strandCount, DEFAULT_STRAND_COUNT);
    const direction = DIRECTIONS.has(data.direction) ? data.direction : DEFAULT_DIRECTION;
    const strandDisplayStyle = strandDisplayStyleValue(data.strandDisplayStyle);
    const generatorSpacing = importedGeneratorSpacing(data);
    const generatorGapEnabled = data.generatorGapEnabled === true;
    const strandSizeMode = strandSizeModeValue(data.strandSizeMode);
    const fixedGeneratorSize = fixedGeneratorSizeValue(data.fixedGeneratorSize);
    const rawSteps = Array.isArray(data.appliedSteps) ? data.appliedSteps : [];
    const steps = rawSteps
      .map(parseInteger)
      .filter((value) => Number.isFinite(value));
    const valid = filterValidSteps(steps, strandCount);
    state.strandCount = strandCount;
    state.direction = direction;
    state.strandDisplayStyle = strandDisplayStyle;
    state.generatorSpacing = generatorSpacing;
    state.generatorGapEnabled = generatorGapEnabled;
    state.strandSizeMode = strandSizeMode;
    state.fixedGeneratorSize = fixedGeneratorSize;
    state.appliedSteps = valid;
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

  function filterValidSteps(steps, strandCount) {
    if (strandCount <= 1) return [];
    return steps
      .map(parseInteger)
      .filter((value) => Number.isInteger(value) && value >= 1 && value < strandCount);
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
    if (refs.status) refs.status.textContent = message || 'ready';
  }

  function setExportMessage(message, isError = false) {
    if (!refs.exportMessage) return;
    refs.exportMessage.textContent = message || '';
    refs.exportMessage.classList.toggle('is-error', !!isError);
  }

  let mathTypesetQueued = false;
  function queueMathTypeset() {
    if (!window.MathJax || mathTypesetQueued) return;
    mathTypesetQueued = true;
    const run = () => {
      mathTypesetQueued = false;
      if (!window.MathJax?.typesetPromise) return;
      const targets = [refs.basicInfo].filter(Boolean);
      if (window.MathJax.typesetClear) window.MathJax.typesetClear(targets);
      window.MathJax.typesetPromise(targets).catch(() => {});
    };
    if (window.MathJax.startup?.promise) window.MathJax.startup.promise.then(run).catch(() => { mathTypesetQueued = false; });
    else window.setTimeout(run, 0);
  }
})();
