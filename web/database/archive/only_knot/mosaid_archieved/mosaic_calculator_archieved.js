(() => {
  'use strict';

  const DIR_NAMES = ['E', 'SE', 'SW', 'W', 'NW', 'NE'];
  const OPPOSITE = [3, 4, 5, 0, 1, 2];
  const DIR_ANGLES = [0, 60, 120, 180, 240, 300].map((deg) => deg * Math.PI / 180);
  const VERTEX_ANGLES = [30, 90, 150, 210, 270, 330].map((deg) => deg * Math.PI / 180);
  const MAX_BOARD = 12;
  const MIN_BOARD = 2;

  const state = {
    rows: 5,
    cols: 5,
    seed: '',
    solutionMasks: [],
    masks: [],
    initialMasks: [],
    locked: [],
    moves: 0,
    showErrors: true,
    showCoords: false,
    lockMode: false,
    hoverIndex: -1
  };

  const refs = {};
  let geometry = null;
  let pointerState = null;
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
    createPuzzle(5, 5, seed);
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
    refs.lockMode = document.getElementById('lock-mode');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.exportOut = document.getElementById('export-out');

    refs.out = {
      status: document.getElementById('out-status'),
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

    window.addEventListener('resize', debounce(() => {
      resizeCanvas();
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
    const seed = randomizeSeed ? randomSeed() : (refs.seedInput.value.trim() || randomSeed());
    refs.seedInput.value = seed;
    createPuzzle(rows, cols, seed);
  }

  function syncInputDimensions() {
    const rows = clampInt(refs.inputRows.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(refs.inputCols.value, MIN_BOARD, MAX_BOARD, state.cols);
    refs.inputRows.value = rows;
    refs.inputCols.value = cols;
  }

  function createPuzzle(rows, cols, seed) {
    state.rows = rows;
    state.cols = cols;
    state.seed = seed;
    state.moves = 0;
    state.hoverIndex = -1;
    state.locked = Array(rows * cols).fill(false);

    const rng = mulberry32(hashString(`${seed}:${rows}x${cols}`));
    state.solutionMasks = buildSolutionTree(rows, cols, rng);
    state.masks = state.solutionMasks.map((mask) => rotateMask(mask, Math.floor(rng() * 6)));

    if (state.masks.every((mask, index) => mask === state.solutionMasks[index])) {
      const first = state.masks.findIndex((mask) => mask !== 0);
      if (first >= 0) state.masks[first] = rotateMask(state.masks[first], 1);
    }

    state.initialMasks = state.masks.slice();
    syncAllDimensionInputs(rows, cols);
    resizeCanvas();
    updateReport(false);
  }

  function buildSolutionTree(rows, cols, rng) {
    const total = rows * cols;
    const masks = Array(total).fill(0);
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    const edges = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const from = indexOf(row, col, cols);
        for (const dir of [0, 1, 2]) {
          const next = neighbor(row, col, dir, rows, cols);
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
        masks[edge.to] |= (1 << OPPOSITE[edge.dir]);
        chosen += 1;
        if (chosen === total - 1) break;
      }
    }
    return masks;
  }

  function shuffleCurrentPuzzle() {
    const rng = mulberry32(hashString(`${state.seed}:shuffle:${Date.now()}`));
    state.masks = state.solutionMasks.map((mask) => rotateMask(mask, Math.floor(rng() * 6)));
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
    const hit = hitTest(event.clientX, event.clientY);
    pointerState = {
      id: event.pointerId,
      index: hit,
      x: event.clientX,
      y: event.clientY,
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
    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (Math.hypot(dx, dy) > 10) {
      pointerState.moved = true;
      clearLongPressTimer();
    }
  }

  function handlePointerUp(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
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
    if (event && pointerState && event.pointerId === pointerState.id && refs.canvas.releasePointerCapture) {
      try { refs.canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    pointerState = null;
    longPressFired = false;
  }

  function clearLongPressTimer() {
    if (longPressTimer !== null) window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function analyze() {
    const total = state.rows * state.cols;
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    let openEnds = 0;
    let alignedEdges = 0;

    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      const mask = state.masks[index] || 0;
      for (let dir = 0; dir < 6; dir += 1) {
        if (!(mask & (1 << dir))) continue;
        const next = neighbor(row, col, dir, state.rows, state.cols);
        if (!next) {
          openEnds += 1;
          continue;
        }
        const nextIndex = indexOf(next.row, next.col, state.cols);
        const oppositeBit = 1 << OPPOSITE[dir];
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
    refs.seedLine.textContent = `seed ${state.seed}`;

    refreshExport();
    draw(report);
  }

  function resizeCanvas() {
    const widthAvailable = Math.max(280, refs.canvasWrap.clientWidth || 720);
    const margin = widthAvailable < 430 ? 18 : 28;
    const hexWidthFactor = Math.sqrt(3) * (state.cols + 0.5);
    const radius = clamp((widthAvailable - margin * 2) / hexWidthFactor, 16, 48);
    const hexWidth = Math.sqrt(3) * radius;
    const logicalWidth = Math.ceil(hexWidth * (state.cols + 0.5) + margin * 2);
    const logicalHeight = Math.ceil((2 * radius) + ((state.rows - 1) * 1.5 * radius) + margin * 2);
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);

    refs.canvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.canvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;

    const cells = [];
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

    geometry = {
      width: logicalWidth,
      height: logicalHeight,
      radius,
      dpr,
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

    for (let index = 0; index < state.masks.length; index += 1) {
      drawTile(ctx, index, report, palette);
    }
  }

  function drawTile(ctx, index, report, palette) {
    const cell = geometry.cells[index];
    if (!cell) return;
    const radius = geometry.radius;
    const mask = state.masks[index] || 0;
    const points = hexPoints(cell.x, cell.y, radius * 0.96);
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
    const pipeColor = locked ? palette.text : palette.accent;

    ctx.save();
    ctx.strokeStyle = pipeColor;
    ctx.lineWidth = Math.max(5, radius * 0.17);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    dirs.forEach((dir) => {
      const end = edgePoint(cell.x, cell.y, dir, radius * 0.69);
      ctx.beginPath();
      ctx.moveTo(cell.x, cell.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    ctx.fillStyle = pipeColor;
    circle(ctx, cell.x, cell.y, Math.max(4, radius * 0.14));

    if (dirs.length === 1) {
      const bulb = edgePoint(cell.x, cell.y, dirs[0], radius * 0.58);
      circle(ctx, bulb.x, bulb.y, Math.max(5, radius * 0.19));
    }
    ctx.restore();
  }

  function drawOpenEndMarks(ctx, index, cell, mask, palette) {
    const radius = geometry.radius;
    for (let dir = 0; dir < 6; dir += 1) {
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
    const rect = refs.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * geometry.width / rect.width;
    const y = (clientY - rect.top) * geometry.height / rect.height;

    for (let index = 0; index < geometry.cells.length; index += 1) {
      const cell = geometry.cells[index];
      if (!cell) continue;
      if (Math.abs(x - cell.x) > geometry.radius || Math.abs(y - cell.y) > geometry.radius) continue;
      if (pointInPolygon({ x, y }, hexPoints(cell.x, cell.y, geometry.radius * 0.96))) return index;
    }
    return -1;
  }

  function hasMatchingConnection(index, dir) {
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const next = neighbor(row, col, dir, state.rows, state.cols);
    if (!next) return false;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    return !!(state.masks[nextIndex] & (1 << OPPOSITE[dir]));
  }

  function refreshExport() {
    const report = analyze();
    const payload = {
      name: 'Mosaic Calculator',
      rows: state.rows,
      cols: state.cols,
      seed: state.seed,
      moves: state.moves,
      solved: report.solved,
      tiles: state.masks.map((mask, index) => ({
        row: Math.floor(index / state.cols) + 1,
        col: (index % state.cols) + 1,
        edges: maskToDirs(mask).map((dir) => DIR_NAMES[dir]),
        locked: state.locked[index]
      })),
      solution: state.solutionMasks.map((mask, index) => ({
        row: Math.floor(index / state.cols) + 1,
        col: (index % state.cols) + 1,
        edges: maskToDirs(mask).map((dir) => DIR_NAMES[dir])
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

  function syncAllDimensionInputs(rows, cols) {
    refs.gridRows.value = rows;
    refs.gridCols.value = cols;
    refs.inputRows.value = rows;
    refs.inputCols.value = cols;
  }

  function maskToDirs(mask) {
    const dirs = [];
    for (let dir = 0; dir < 6; dir += 1) {
      if (mask & (1 << dir)) dirs.push(dir);
    }
    return dirs;
  }

  function rotateMask(mask, steps) {
    const normalized = ((steps % 6) + 6) % 6;
    let rotated = 0;
    for (let dir = 0; dir < 6; dir += 1) {
      if (mask & (1 << dir)) rotated |= (1 << ((dir + normalized) % 6));
    }
    return rotated;
  }

  function neighbor(row, col, dir, rows, cols) {
    const evenRow = row % 2 === 0;
    const offsets = evenRow
      ? [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]]
      : [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]];
    const nextRow = row + offsets[dir][0];
    const nextCol = col + offsets[dir][1];
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
    return { row: nextRow, col: nextCol };
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

  function hexPoints(x, y, radius) {
    return VERTEX_ANGLES.map((angle) => ({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius
    }));
  }

  function edgePoint(x, y, dir, distance) {
    return {
      x: x + Math.cos(DIR_ANGLES[dir]) * distance,
      y: y + Math.sin(DIR_ANGLES[dir]) * distance
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
