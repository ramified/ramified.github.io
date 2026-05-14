(() => {
  'use strict';

  const LATTICES = {
    hexagonal: {
      label: 'hexagonal',
      dirNames: ['E', 'SE', 'SW', 'W', 'NW', 'NE'],
      opposite: [3, 4, 5, 0, 1, 2],
      angles: [0, 60, 120, 180, 240, 300].map(toRadians),
      vertexAngles: [30, 90, 150, 210, 270, 330].map(toRadians),
      sides: 6,
      forwardDirs: [0, 1, 2],
      shape: 'hex'
    },
    square: {
      label: 'square',
      dirNames: ['E', 'S', 'W', 'N'],
      opposite: [2, 3, 0, 1],
      angles: [0, 90, 180, 270].map(toRadians),
      sides: 4,
      forwardDirs: [0, 1],
      shape: 'square'
    }
  };
  const MAX_BOARD = 12;
  const MIN_BOARD = 2;
  const MIN_VIEW_SCALE = 0.45;
  const MAX_VIEW_SCALE = 2.8;
  const MOSAIC_THEME = {
    pipe: '#2f3437'
  };

  const state = {
    rows: 5,
    cols: 5,
    lattice: 'hexagonal',
    wrapped: false,
    seed: '',
    solutionMasks: [],
    masks: [],
    initialMasks: [],
    locked: [],
    moves: 0,
    showErrors: true,
    showCoords: false,
    lockMode: false,
    wrappedViewMode: 'periodic',
    viewScale: 1,
    viewX: 0,
    viewY: 0,
    hoverIndex: -1
  };

  const refs = {};
  let geometry = null;
  let pointerState = null;
  const activePointers = new Map();
  let pinchState = null;
  let longPressTimer = null;
  let longPressFired = false;
  let suppressCardToggleUntil = 0;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    bindControls();
    bindCards();
    bindCanvas();

    const seed = randomSeed();
    refs.seedInput.value = seed;
    createPuzzle(5, 5, seed, state.lattice, state.wrapped);
  }

  function collectRefs() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.canvasWrap = document.getElementById('canvas-wrap');
    refs.statusBadge = document.getElementById('status-badge');
    refs.statusLine = document.getElementById('status-line');
    refs.seedLine = document.getElementById('seed-line');
    refs.gridRows = document.getElementById('grid-rows');
    refs.gridCols = document.getElementById('grid-cols');
    refs.inputRows = document.getElementById('input-rows');
    refs.inputCols = document.getElementById('input-cols');
    refs.seedInput = document.getElementById('seed-input');
    refs.latticeSelect = document.getElementById('lattice-select');
    refs.wrapBoard = document.getElementById('wrap-board');
    refs.lockMode = document.getElementById('lock-mode');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.wrappedViewMode = document.getElementById('wrapped-view-mode');
    refs.resetView = document.getElementById('reset-view');
    refs.exportOut = document.getElementById('export-out');

    refs.out = {
      status: document.getElementById('out-status'),
      lattice: document.getElementById('out-lattice'),
      boundary: document.getElementById('out-boundary'),
      tiles: document.getElementById('out-tiles'),
      connections: document.getElementById('out-connections'),
      openEnds: document.getElementById('out-open-ends'),
      components: document.getElementById('out-components'),
      cycles: document.getElementById('out-cycles'),
      moves: document.getElementById('out-moves')
    };
  }

  function bindControls() {
    refs.gridRows.addEventListener('change', () => generateFromControls('toolbar'));
    refs.gridCols.addEventListener('change', () => generateFromControls('toolbar'));
    refs.inputRows.addEventListener('change', () => syncInputDimensions());
    refs.inputCols.addEventListener('change', () => syncInputDimensions());
    refs.seedInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') generateFromControls('input');
    });
    refs.latticeSelect.addEventListener('change', () => generateFromControls('input'));
    refs.wrapBoard.addEventListener('change', () => generateFromControls('input'));

    document.getElementById('new-puzzle').addEventListener('click', () => generateFromControls('toolbar', true));
    document.getElementById('shuffle-puzzle').addEventListener('click', shuffleCurrentPuzzle);
    document.getElementById('reset-puzzle').addEventListener('click', resetPuzzle);
    document.getElementById('check-puzzle').addEventListener('click', () => updateReport(true));
    document.getElementById('solve-puzzle').addEventListener('click', solvePuzzle);
    document.getElementById('clear-locks').addEventListener('click', clearLocks);
    document.getElementById('apply-input').addEventListener('click', () => generateFromControls('input'));
    document.getElementById('random-seed').addEventListener('click', () => generateFromControls('input', true));
    document.getElementById('refresh-export').addEventListener('click', refreshExport);
    document.getElementById('copy-export').addEventListener('click', copyExport);

    refs.lockMode.addEventListener('change', () => {
      state.lockMode = refs.lockMode.checked;
      updateReport(false);
    });
    refs.showErrors.addEventListener('change', () => {
      state.showErrors = refs.showErrors.checked;
      updateReport(false);
    });
    refs.showCoords.addEventListener('change', () => {
      state.showCoords = refs.showCoords.checked;
      updateReport(false);
    });
    refs.wrappedViewMode.addEventListener('change', () => {
      state.wrappedViewMode = refs.wrappedViewMode.value === 'single' ? 'single' : 'periodic';
      normalizeViewOffset();
      updateReport(false);
    });
    refs.resetView.addEventListener('click', () => {
      resetView();
      updateReport(false);
    });

    window.addEventListener('resize', debounce(() => {
      resizeCanvas();
      normalizeViewOffset();
      draw(analyze());
    }, 80));
  }

  function bindCards() {
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (Date.now() < suppressCardToggleUntil) return;
        if (event.target.closest('button,input,select,textarea,a')) return;
        const card = head.closest('.card');
        if (card) card.classList.toggle('collapsed');
      });
    });

    const side = document.querySelector('.side');
    let dragCard = null;
    let placeholder = null;
    let pointerId = null;
    let startY = 0;
    let dragging = false;

    side.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.drag-handle');
      if (!handle) return;
      const card = handle.closest('.card');
      if (!card) return;
      dragCard = card;
      pointerId = event.pointerId;
      startY = event.clientY;
      dragging = false;
      handle.setPointerCapture(pointerId);
      event.preventDefault();
    });

    side.addEventListener('pointermove', (event) => {
      if (!dragCard || event.pointerId !== pointerId) return;
      if (!dragging && Math.abs(event.clientY - startY) < 6) return;
      if (!dragging) {
        dragging = true;
        dragCard.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.className = 'card';
        placeholder.style.height = `${dragCard.offsetHeight}px`;
        placeholder.style.opacity = '0.18';
        dragCard.parentElement.insertBefore(placeholder, dragCard.nextSibling);
      }
      const after = getCardAfterPointer(side, event.clientY, dragCard, placeholder);
      if (after) side.insertBefore(placeholder, after);
      else side.appendChild(placeholder);
    });

    side.addEventListener('pointerup', finishCardDrag);
    side.addEventListener('pointercancel', finishCardDrag);

    function finishCardDrag(event) {
      if (!dragCard || (event && event.pointerId !== pointerId)) return;
      if (dragging && placeholder) {
        side.insertBefore(dragCard, placeholder);
        placeholder.remove();
        suppressCardToggleUntil = Date.now() + 220;
      }
      dragCard.classList.remove('dragging');
      dragCard = null;
      placeholder = null;
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

  function bindCanvas() {
    refs.canvas.addEventListener('pointerdown', handlePointerDown);
    refs.canvas.addEventListener('pointermove', handlePointerMove);
    refs.canvas.addEventListener('pointerup', handlePointerUp);
    refs.canvas.addEventListener('pointercancel', clearPointerState);
    refs.canvas.addEventListener('wheel', handleWheel, { passive: false });
    refs.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const hit = hitTest(event.clientX, event.clientY);
      if (hit >= 0) toggleLock(hit);
    });
    refs.canvas.addEventListener('mouseleave', () => {
      state.hoverIndex = -1;
      draw(analyze());
    });
    refs.canvas.addEventListener('mousemove', (event) => {
      if (pointerState) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit !== state.hoverIndex) {
        state.hoverIndex = hit;
        draw(analyze());
      }
    });
  }

  function generateFromControls(source, randomizeSeed = false) {
    const rowRef = source === 'toolbar' ? refs.gridRows : refs.inputRows;
    const colRef = source === 'toolbar' ? refs.gridCols : refs.inputCols;
    const rows = clampInt(rowRef.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(colRef.value, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[refs.latticeSelect.value] ? refs.latticeSelect.value : state.lattice;
    const wrapped = refs.wrapBoard.checked;
    const seed = randomizeSeed ? randomSeed() : (refs.seedInput.value.trim() || randomSeed());
    refs.seedInput.value = seed;
    createPuzzle(rows, cols, seed, latticeName, wrapped);
  }

  function syncInputDimensions() {
    const rows = clampInt(refs.inputRows.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(refs.inputCols.value, MIN_BOARD, MAX_BOARD, state.cols);
    refs.inputRows.value = rows;
    refs.inputCols.value = cols;
  }

  function createPuzzle(rows, cols, seed, latticeName, wrapped) {
    state.rows = rows;
    state.cols = cols;
    state.lattice = LATTICES[latticeName] ? latticeName : 'hexagonal';
    state.wrapped = !!wrapped;
    state.seed = seed;
    state.moves = 0;
    state.hoverIndex = -1;
    state.locked = Array(rows * cols).fill(false);

    const lattice = getLattice();
    const rng = mulberry32(hashString(`${seed}:${state.lattice}:${state.wrapped ? 'wrapped' : 'open'}:${rows}x${cols}`));
    state.solutionMasks = buildSolutionTree(rows, cols, rng, lattice, state.wrapped);
    state.masks = state.solutionMasks.map((mask) => rotateMask(mask, Math.floor(rng() * lattice.sides)));

    if (state.masks.every((mask, index) => mask === state.solutionMasks[index])) {
      const first = state.masks.findIndex((mask) => mask !== 0);
      if (first >= 0) state.masks[first] = rotateMask(state.masks[first], 1);
    }

    state.initialMasks = state.masks.slice();
    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function buildSolutionTree(rows, cols, rng, lattice, wrapped) {
    const total = rows * cols;
    const masks = Array(total).fill(0);
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    const edges = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const from = indexOf(row, col, cols);
        for (const dir of lattice.forwardDirs) {
          const next = neighbor(row, col, dir, rows, cols, lattice, wrapped);
          if (!next) continue;
          edges.push({ from, to: indexOf(next.row, next.col, cols), dir });
        }
      }
    }

    shuffle(edges, rng);
    let chosen = 0;
    for (const edge of edges) {
      if (union(parent, rank, edge.from, edge.to)) {
        masks[edge.from] |= (1 << edge.dir);
        masks[edge.to] |= (1 << lattice.opposite[edge.dir]);
        chosen += 1;
        if (chosen === total - 1) break;
      }
    }
    return masks;
  }

  function shuffleCurrentPuzzle() {
    const rng = mulberry32(hashString(`${state.seed}:shuffle:${Date.now()}`));
    const lattice = getLattice();
    state.masks = state.solutionMasks.map((mask) => rotateMask(mask, Math.floor(rng() * lattice.sides)));
    if (state.masks.every((mask, index) => mask === state.solutionMasks[index])) {
      const first = state.masks.findIndex((mask) => mask !== 0);
      if (first >= 0) state.masks[first] = rotateMask(state.masks[first], 1);
    }
    state.initialMasks = state.masks.slice();
    state.locked = Array(state.rows * state.cols).fill(false);
    state.moves = 0;
    updateReport(false);
  }

  function resetPuzzle() {
    state.masks = state.initialMasks.slice();
    state.locked = Array(state.rows * state.cols).fill(false);
    state.moves = 0;
    updateReport(false);
  }

  function solvePuzzle() {
    state.masks = state.solutionMasks.slice();
    state.locked = Array(state.rows * state.cols).fill(false);
    updateReport(false);
  }

  function clearLocks() {
    state.locked = Array(state.rows * state.cols).fill(false);
    updateReport(false);
  }

  function rotateTile(index, steps) {
    if (state.locked[index]) return;
    state.masks[index] = rotateMask(state.masks[index], steps);
    state.moves += 1;
    updateReport(false);
  }

  function toggleLock(index) {
    state.locked[index] = !state.locked[index];
    updateReport(false);
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.wrapped && activePointers.size >= 2) {
      clearLongPressTimer();
      pointerState = null;
      startPinch();
      refs.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    const hit = hitTest(event.clientX, event.clientY);
    pointerState = {
      id: event.pointerId,
      index: hit,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    longPressFired = false;
    if (hit >= 0 && event.pointerType !== 'mouse') {
      longPressTimer = window.setTimeout(() => {
        longPressFired = true;
        toggleLock(hit);
      }, 520);
    }
    refs.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (state.wrapped && pinchState && activePointers.size >= 2) {
      updatePinch();
      event.preventDefault();
      return;
    }

    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (Math.hypot(dx, dy) > 10) {
      pointerState.moved = true;
      clearLongPressTimer();
    }
    if (state.wrapped && pointerState.moved) {
      panViewByClientDelta(event.clientX - pointerState.lastX, event.clientY - pointerState.lastY);
      pointerState.lastX = event.clientX;
      pointerState.lastY = event.clientY;
      event.preventDefault();
    }
  }

  function handlePointerUp(event) {
    if (!pointerState || event.pointerId !== pointerState.id) {
      clearPointerState(event);
      return;
    }
    clearLongPressTimer();
    const hit = hitTest(event.clientX, event.clientY);
    if (!pointerState.moved && hit === pointerState.index && hit >= 0 && !longPressFired) {
      if (state.lockMode) toggleLock(hit);
      else rotateTile(hit, event.shiftKey ? -1 : 1);
    }
    clearPointerState(event);
  }

  function clearPointerState(event) {
    clearLongPressTimer();
    if (event) activePointers.delete(event.pointerId);
    if (activePointers.size < 2) pinchState = null;
    if (event && pointerState && event.pointerId === pointerState.id && refs.canvas.releasePointerCapture) {
      try { refs.canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    pointerState = null;
    longPressFired = false;
  }

  function handleWheel(event) {
    if (!state.wrapped) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAtClientPoint(event.clientX, event.clientY, state.viewScale * factor);
  }

  function startPinch() {
    const pair = firstTwoPointers();
    if (!pair) return;
    pinchState = {
      distance: pointerDistance(pair[0], pair[1]),
      center: pointerCenter(pair[0], pair[1])
    };
  }

  function updatePinch() {
    const pair = firstTwoPointers();
    if (!pair || !pinchState || pinchState.distance <= 0) return;
    const center = pointerCenter(pair[0], pair[1]);
    const distance = pointerDistance(pair[0], pair[1]);
    const nextScale = state.viewScale * (distance / pinchState.distance);
    zoomAtClientPoint(center.x, center.y, nextScale, false);
    panViewByClientDelta(center.x - pinchState.center.x, center.y - pinchState.center.y, false);
    pinchState = { distance, center };
    refreshExport();
    draw(analyze());
  }

  function firstTwoPointers() {
    const pointers = Array.from(activePointers.values());
    if (pointers.length < 2) return null;
    return [pointers[0], pointers[1]];
  }

  function pointerDistance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
  }

  function pointerCenter(left, right) {
    return {
      x: (left.x + right.x) / 2,
      y: (left.y + right.y) / 2
    };
  }

  function panViewByClientDelta(clientDx, clientDy, redraw = true) {
    const delta = clientDeltaToLogical(clientDx, clientDy);
    state.viewX += delta.x;
    state.viewY += delta.y;
    normalizeViewOffset();
    if (redraw) {
      refreshExport();
      draw(analyze());
    }
  }

  function zoomAtClientPoint(clientX, clientY, scale, redraw = true) {
    if (!geometry) resizeCanvas();
    const nextScale = clamp(scale, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
    const point = clientPointToLogical(clientX, clientY);
    const center = { x: geometry.width / 2, y: geometry.height / 2 };
    const worldX = center.x + ((point.x - center.x - state.viewX) / state.viewScale);
    const worldY = center.y + ((point.y - center.y - state.viewY) / state.viewScale);
    state.viewScale = nextScale;
    state.viewX = point.x - center.x - (nextScale * (worldX - center.x));
    state.viewY = point.y - center.y - (nextScale * (worldY - center.y));
    normalizeViewOffset();
    if (redraw) {
      refreshExport();
      draw(analyze());
    }
  }

  function resetView(redraw = true) {
    state.viewScale = 1;
    state.viewX = 0;
    state.viewY = 0;
    if (redraw) {
      refreshExport();
      draw(analyze());
    }
  }

  function normalizeViewOffset() {
    if (!geometry || !isPeriodicWrappedView()) return;
    const a = {
      x: geometry.periodA.x * state.viewScale,
      y: geometry.periodA.y * state.viewScale
    };
    const b = {
      x: geometry.periodB.x * state.viewScale,
      y: geometry.periodB.y * state.viewScale
    };
    const det = (a.x * b.y) - (a.y * b.x);
    if (Math.abs(det) < 0.0001) return;
    const u = ((state.viewX * b.y) - (state.viewY * b.x)) / det;
    const v = ((a.x * state.viewY) - (a.y * state.viewX)) / det;
    const wholeU = Math.round(u);
    const wholeV = Math.round(v);
    state.viewX -= (wholeU * a.x) + (wholeV * b.x);
    state.viewY -= (wholeU * a.y) + (wholeV * b.y);
  }

  function clientPointToLogical(clientX, clientY) {
    const rect = refs.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * geometry.width / rect.width,
      y: (clientY - rect.top) * geometry.height / rect.height
    };
  }

  function clientDeltaToLogical(clientDx, clientDy) {
    const rect = refs.canvas.getBoundingClientRect();
    return {
      x: clientDx * geometry.width / rect.width,
      y: clientDy * geometry.height / rect.height
    };
  }

  function clearLongPressTimer() {
    if (longPressTimer !== null) window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function analyze() {
    const total = state.rows * state.cols;
    const lattice = getLattice();
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    let openEnds = 0;
    let alignedEdges = 0;

    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      const mask = state.masks[index] || 0;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        if (!(mask & (1 << dir))) continue;
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (!next) {
          openEnds += 1;
          continue;
        }
        const nextIndex = indexOf(next.row, next.col, state.cols);
        const oppositeBit = 1 << lattice.opposite[dir];
        if (state.masks[nextIndex] & oppositeBit) {
          if (index < nextIndex) {
            alignedEdges += 1;
            union(parent, rank, index, nextIndex);
          }
        } else {
          openEnds += 1;
        }
      }
    }

    const components = new Set(parent.map((_, index) => find(parent, index))).size;
    const cycles = Math.max(0, alignedEdges - total + components);
    const solved = openEnds === 0 && components === 1 && cycles === 0;
    let label = 'working';
    let message = `${openEnds} open end${openEnds === 1 ? '' : 's'}`;

    if (solved) {
      label = 'solved';
      message = 'solved';
    } else if (components > 1 && openEnds === 0) {
      label = 'disconnected';
      message = `${components} components`;
    } else if (cycles > 0) {
      label = 'loop';
      message = `${cycles} loop${cycles === 1 ? '' : 's'}`;
    }

    return {
      total,
      targetEdges: Math.max(0, total - 1),
      alignedEdges,
      openEnds,
      components,
      cycles,
      solved,
      label,
      message
    };
  }

  function updateReport(manualCheck) {
    const report = analyze();
    refs.out.status.textContent = report.label;
    refs.out.lattice.textContent = getLattice().label;
    refs.out.boundary.textContent = state.wrapped ? 'wrapped' : 'open';
    refs.out.tiles.textContent = String(report.total);
    refs.out.connections.textContent = `${report.alignedEdges}/${report.targetEdges}`;
    refs.out.openEnds.textContent = String(report.openEnds);
    refs.out.components.textContent = String(report.components);
    refs.out.cycles.textContent = String(report.cycles);
    refs.out.moves.textContent = String(state.moves);

    refs.statusBadge.textContent = report.label;
    refs.statusBadge.classList.toggle('mosaic-status-good', report.solved);
    refs.statusBadge.classList.toggle('mosaic-status-bad', !report.solved && (report.openEnds > 0 || report.cycles > 0));
    refs.statusLine.textContent = manualCheck ? `checked: ${report.message}` : report.message;
    refs.statusLine.classList.toggle('mosaic-status-good', report.solved);
    refs.statusLine.classList.toggle('mosaic-status-bad', !report.solved && report.openEnds > 0);
    refs.seedLine.textContent = `${getLattice().label}, ${state.wrapped ? 'wrapped' : 'open'} · seed ${state.seed}`;

    refreshExport();
    draw(report);
  }

  function resizeCanvas() {
    const widthAvailable = Math.max(280, refs.canvasWrap.clientWidth || 720);
    const margin = widthAvailable < 430 ? 18 : 28;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    const lattice = getLattice();
    let logicalWidth;
    let logicalHeight;
    let radius;
    let periodA;
    let periodB;
    const cells = [];

    if (lattice.shape === 'square') {
      const size = clamp((widthAvailable - margin * 2) / state.cols, 24, 58);
      radius = size / 2;
      logicalWidth = Math.ceil((state.cols * size) + margin * 2);
      logicalHeight = Math.ceil((state.rows * size) + margin * 2);
      periodA = { x: state.cols * size, y: 0 };
      periodB = { x: 0, y: state.rows * size };
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          cells[indexOf(row, col, state.cols)] = {
            row,
            col,
            x: margin + radius + (col * size),
            y: margin + radius + (row * size)
          };
        }
      }
    } else {
      const hexWidthFactor = Math.sqrt(3) * (state.cols + 0.5);
      radius = clamp((widthAvailable - margin * 2) / hexWidthFactor, 16, 48);
      const hexWidth = Math.sqrt(3) * radius;
      logicalWidth = Math.ceil(hexWidth * (state.cols + 0.5) + margin * 2);
      logicalHeight = Math.ceil((2 * radius) + ((state.rows - 1) * 1.5 * radius) + margin * 2);
      periodA = { x: state.cols * hexWidth, y: 0 };
      periodB = { x: (state.rows % 2) * hexWidth / 2, y: state.rows * 1.5 * radius };
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          cells[indexOf(row, col, state.cols)] = {
            row,
            col,
            x: margin + (hexWidth / 2) + (col * hexWidth) + ((row % 2) * hexWidth / 2),
            y: margin + radius + (row * 1.5 * radius)
          };
        }
      }
    }

    refs.canvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.canvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;

    geometry = {
      width: logicalWidth,
      height: logicalHeight,
      radius,
      dpr,
      shape: lattice.shape,
      periodA,
      periodB,
      cells
    };
  }

  function draw(report) {
    if (!geometry) resizeCanvas();
    const canvas = refs.canvas;
    const ctx = canvas.getContext('2d');
    const palette = getPalette();

    ctx.setTransform(geometry.dpr, 0, 0, geometry.dpr, 0, 0);
    ctx.clearRect(0, 0, geometry.width, geometry.height);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, geometry.width, geometry.height);

    if (state.wrapped) {
      ctx.save();
      applyViewTransform(ctx);
      getBoardCopyOffsets().forEach((offset) => {
        drawBoardCopy(ctx, report, palette, offset);
      });
      ctx.restore();
      return;
    }

    drawBoardCopy(ctx, report, palette, { x: 0, y: 0 });
  }

  function drawBoardCopy(ctx, report, palette, offset) {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    for (let index = 0; index < state.masks.length; index += 1) {
      drawTile(ctx, index, report, palette);
    }
    ctx.restore();
  }

  function applyViewTransform(ctx) {
    const cx = geometry.width / 2;
    const cy = geometry.height / 2;
    ctx.translate(cx + state.viewX, cy + state.viewY);
    ctx.scale(state.viewScale, state.viewScale);
    ctx.translate(-cx, -cy);
  }

  function getBoardCopyOffsets() {
    if (!isPeriodicWrappedView()) return [{ x: 0, y: 0 }];
    const range = getPeriodicRange();
    const offsets = [];
    for (let row = -range; row <= range; row += 1) {
      for (let col = -range; col <= range; col += 1) {
        if (row === 0 && col === 0) continue;
        offsets.push(copyOffset(col, row));
      }
    }
    offsets.push({ x: 0, y: 0 });
    return offsets;
  }

  function getPeriodicRange() {
    if (!geometry) return 1;
    const periodA = Math.hypot(geometry.periodA.x, geometry.periodA.y);
    const periodB = Math.hypot(geometry.periodB.x, geometry.periodB.y);
    const minPeriod = Math.max(1, Math.min(periodA, periodB));
    return Math.min(4, Math.max(1, Math.ceil(Math.max(geometry.width, geometry.height) / (minPeriod * state.viewScale)) + 1));
  }

  function copyOffset(col, row) {
    return {
      x: (col * geometry.periodA.x) + (row * geometry.periodB.x),
      y: (col * geometry.periodA.y) + (row * geometry.periodB.y)
    };
  }

  function drawTile(ctx, index, report, palette) {
    const cell = geometry.cells[index];
    if (!cell) return;
    const radius = geometry.radius;
    const mask = state.masks[index] || 0;
    const points = tilePoints(cell.x, cell.y, radius * 0.96);
    const locked = state.locked[index];
    const isHover = index === state.hoverIndex;

    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = report.solved ? 'rgba(61,107,79,0.08)' : (locked ? '#f1ede5' : '#fffdf8');
    ctx.strokeStyle = isHover ? palette.accent : palette.border;
    ctx.lineWidth = isHover ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    drawPipe(ctx, cell, mask, locked, palette);

    if (state.showErrors) drawOpenEndMarks(ctx, index, cell, mask, palette);
    if (state.showCoords) drawCellLabel(ctx, cell, palette);
    if (locked) drawLock(ctx, cell, palette);
  }

  function drawPipe(ctx, cell, mask, locked, palette) {
    const radius = geometry.radius;
    const dirs = maskToDirs(mask);
    const theme = getMosaicTheme(palette);
    const pipeColor = locked ? theme.lockedPipe : theme.pipe;

    ctx.save();
    ctx.strokeStyle = pipeColor;
    ctx.lineWidth = Math.max(5, radius * 0.17);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    dirs.forEach((dir) => {
      const end = edgePoint(cell.x, cell.y, dir, radius * 0.72);
      ctx.beginPath();
      ctx.moveTo(cell.x, cell.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    ctx.fillStyle = pipeColor;
    circle(ctx, cell.x, cell.y, Math.max(4, radius * 0.14));
    ctx.restore();
  }

  function drawOpenEndMarks(ctx, index, cell, mask, palette) {
    const radius = geometry.radius;
    const lattice = getLattice();
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (!(mask & (1 << dir))) continue;
      if (hasMatchingConnection(index, dir)) continue;
      const point = edgePoint(cell.x, cell.y, dir, radius * 0.82);
      ctx.fillStyle = palette.accent2;
      circle(ctx, point.x, point.y, Math.max(3, radius * 0.08));
    }
  }

  function drawCellLabel(ctx, cell, palette) {
    ctx.save();
    ctx.fillStyle = palette.muted;
    ctx.font = `${Math.max(9, geometry.radius * 0.23)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${cell.row + 1},${cell.col + 1}`, cell.x, cell.y + geometry.radius * 0.5);
    ctx.restore();
  }

  function drawLock(ctx, cell, palette) {
    const radius = geometry.radius;
    const size = Math.max(8, radius * 0.22);
    const x = cell.x - size / 2;
    const y = cell.y - size / 2;
    ctx.save();
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(x, y + size * 0.28, size, size * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cell.x, y + size * 0.28, size * 0.32, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }

  function hitTest(clientX, clientY) {
    if (!geometry) return -1;
    const point = state.wrapped
      ? screenPointToWorld(clientPointToLogical(clientX, clientY))
      : clientPointToLogical(clientX, clientY);
    const offsets = state.wrapped ? getBoardCopyOffsets() : [{ x: 0, y: 0 }];

    for (const offset of offsets) {
      const x = point.x - offset.x;
      const y = point.y - offset.y;
      for (let index = 0; index < geometry.cells.length; index += 1) {
        const cell = geometry.cells[index];
        if (!cell) continue;
        if (Math.abs(x - cell.x) > geometry.radius || Math.abs(y - cell.y) > geometry.radius) continue;
        if (pointInPolygon({ x, y }, tilePoints(cell.x, cell.y, geometry.radius * 0.96))) return index;
      }
    }
    return -1;
  }

  function screenPointToWorld(point) {
    const center = { x: geometry.width / 2, y: geometry.height / 2 };
    return {
      x: center.x + ((point.x - center.x - state.viewX) / state.viewScale),
      y: center.y + ((point.y - center.y - state.viewY) / state.viewScale)
    };
  }

  function hasMatchingConnection(index, dir) {
    const lattice = getLattice();
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return false;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    return !!(state.masks[nextIndex] & (1 << lattice.opposite[dir]));
  }

  function refreshExport() {
    const report = analyze();
    const lattice = getLattice();
    const payload = {
      name: 'Mosaic Calculator',
      lattice: state.lattice,
      boundary: state.wrapped ? 'wrapped' : 'open',
      wrappedViewMode: state.wrappedViewMode,
      view: {
        scale: Number(state.viewScale.toFixed(4)),
        x: Number(state.viewX.toFixed(2)),
        y: Number(state.viewY.toFixed(2))
      },
      rows: state.rows,
      cols: state.cols,
      seed: state.seed,
      moves: state.moves,
      solved: report.solved,
      tiles: state.masks.map((mask, index) => ({
        row: Math.floor(index / state.cols) + 1,
        col: (index % state.cols) + 1,
        edges: maskToDirs(mask).map((dir) => lattice.dirNames[dir]),
        locked: state.locked[index]
      })),
      solution: state.solutionMasks.map((mask, index) => ({
        row: Math.floor(index / state.cols) + 1,
        col: (index % state.cols) + 1,
        edges: maskToDirs(mask).map((dir) => lattice.dirNames[dir])
      }))
    };
    refs.exportOut.value = JSON.stringify(payload, null, 2);
  }

  function copyExport() {
    refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { refs.statusLine.textContent = 'export copied'; })
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
      refs.statusLine.textContent = 'export copied';
    } catch (_) {
      refs.statusLine.textContent = 'copy unavailable';
    }
  }

  function syncAllInputs(rows, cols, latticeName, wrapped) {
    refs.gridRows.value = rows;
    refs.gridCols.value = cols;
    refs.inputRows.value = rows;
    refs.inputCols.value = cols;
    refs.latticeSelect.value = latticeName;
    refs.wrapBoard.checked = wrapped;
    refs.wrappedViewMode.value = state.wrappedViewMode;
  }

  function maskToDirs(mask) {
    const dirs = [];
    const lattice = getLattice();
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (mask & (1 << dir)) dirs.push(dir);
    }
    return dirs;
  }

  function rotateMask(mask, steps) {
    const lattice = getLattice();
    const normalized = ((steps % lattice.sides) + lattice.sides) % lattice.sides;
    let rotated = 0;
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (mask & (1 << dir)) rotated |= (1 << ((dir + normalized) % lattice.sides));
    }
    return rotated;
  }

  function neighbor(row, col, dir, rows, cols, lattice = getLattice(), wrapped = state.wrapped) {
    if (wrapped && lattice.shape === 'hex') {
      return wrappedHexNeighbor(row, col, dir, rows, cols);
    }

    const offsets = getOffsets(row, lattice);
    const nextRow = row + offsets[dir][0];
    const nextCol = col + offsets[dir][1];
    if (wrapped) {
      return {
        row: modulo(nextRow, rows),
        col: modulo(nextCol, cols)
      };
    }
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
    return { row: nextRow, col: nextCol };
  }

  function wrappedHexNeighbor(row, col, dir, rows, cols) {
    const axial = offsetToAxial(row, col);
    const deltas = [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1]
    ];
    const nextQ = modulo(axial.q + deltas[dir][0], cols);
    const nextR = modulo(axial.r + deltas[dir][1], rows);
    return axialToOffset(nextQ, nextR, cols);
  }

  function offsetToAxial(row, col) {
    return {
      q: col - ((row - (row & 1)) / 2),
      r: row
    };
  }

  function axialToOffset(q, r, cols) {
    return {
      row: r,
      col: modulo(q + ((r - (r & 1)) / 2), cols)
    };
  }

  function getOffsets(row, lattice) {
    if (lattice.shape === 'square') {
      return [[0, 1], [1, 0], [0, -1], [-1, 0]];
    }
    const evenRow = row % 2 === 0;
    return evenRow
      ? [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]]
      : [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]];
  }

  function indexOf(row, col, cols) {
    return row * cols + col;
  }

  function find(parent, item) {
    let node = item;
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]];
      node = parent[node];
    }
    return node;
  }

  function union(parent, rank, left, right) {
    let rootLeft = find(parent, left);
    let rootRight = find(parent, right);
    if (rootLeft === rootRight) return false;
    if (rank[rootLeft] < rank[rootRight]) {
      const temp = rootLeft;
      rootLeft = rootRight;
      rootRight = temp;
    }
    parent[rootRight] = rootLeft;
    if (rank[rootLeft] === rank[rootRight]) rank[rootLeft] += 1;
    return true;
  }

  function shuffle(array, rng) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      const temp = array[index];
      array[index] = array[swapIndex];
      array[swapIndex] = temp;
    }
  }

  function tilePoints(x, y, radius) {
    const lattice = getLattice();
    if (lattice.shape === 'square') return squarePoints(x, y, radius);
    return hexPoints(x, y, radius, lattice);
  }

  function squarePoints(x, y, radius) {
    return [
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y - radius },
      { x: x + radius, y: y + radius },
      { x: x - radius, y: y + radius }
    ];
  }

  function hexPoints(x, y, radius, lattice) {
    return lattice.vertexAngles.map((angle) => ({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius
    }));
  }

  function edgePoint(x, y, dir, distance) {
    const angle = getLattice().angles[dir];
    return {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance
    };
  }

  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersects = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi) / (yj - yi)) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function getPalette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      border: styles.getPropertyValue('--border').trim() || '#d8d0c4',
      text: styles.getPropertyValue('--text').trim() || '#1a1612',
      muted: styles.getPropertyValue('--muted').trim() || '#7a6f65',
      accent: styles.getPropertyValue('--accent').trim() || '#3d6b4f',
      accent2: styles.getPropertyValue('--accent2').trim() || '#8b3a2a'
    };
  }

  function getMosaicTheme(palette) {
    return {
      pipe: MOSAIC_THEME.pipe,
      lockedPipe: palette.text
    };
  }

  function getLattice() {
    return LATTICES[state.lattice] || LATTICES.hexagonal;
  }

  function isPeriodicWrappedView() {
    return state.wrapped && state.wrappedViewMode === 'periodic';
  }

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function modulo(value, size) {
    return ((value % size) + size) % size;
  }

  function hashString(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6D2B79F5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    return `mosaic-${Math.floor(Math.random() * 0xFFFFFF).toString(36).padStart(5, '0')}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
  }

  function debounce(callback, delay) {
    let timer = null;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback.apply(this, args), delay);
    };
  }
})();
