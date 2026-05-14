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
    tiles: [],
    edits: 0,
    showErrors: true,
    showCoords: false,
    wrappedViewMode: 'periodic',
    viewScale: 1,
    viewX: 0,
    viewY: 0,
    arrowMode: 'none',
    editMode: 'rotate',
    selectedTile: null,
    selectedPaletteId: '',
    drag: null,
    dragPoint: null,
    dragPreviewIndex: -1,
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
  let tileDragGhost = null;
  let tileDragSource = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    bindControls();
    bindCards();
    bindCanvas();

    createBoard(5, 5, state.lattice, state.wrapped);
  }

  function collectRefs() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.canvasWrap = document.getElementById('canvas-wrap');
    refs.statusBadge = document.getElementById('status-badge');
    refs.statusLine = document.getElementById('status-line');
    refs.infoLine = document.getElementById('info-line');
    refs.gridRows = document.getElementById('grid-rows');
    refs.gridCols = document.getElementById('grid-cols');
    refs.inputRows = document.getElementById('input-rows');
    refs.inputCols = document.getElementById('input-cols');
    refs.latticeSelect = document.getElementById('lattice-select');
    refs.wrapBoard = document.getElementById('wrap-board');
    refs.arrowMode = document.getElementById('arrow-mode');
    refs.editMode = document.getElementById('edit-mode');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.wrappedViewMode = document.getElementById('wrapped-view-mode');
    refs.resetView = document.getElementById('reset-view');
    refs.tilePalette = document.getElementById('tile-palette');
    refs.importInput = document.getElementById('import-input');
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
    refs.latticeSelect.addEventListener('change', () => generateFromControls('input'));
    refs.wrapBoard.addEventListener('change', () => generateFromControls('input'));
    refs.arrowMode.addEventListener('change', () => {
      state.arrowMode = normalizeArrowMode(refs.arrowMode.value);
      updateSelectedTileFromPalette();
      renderTilePalette();
      updateReport(false);
    });
    refs.editMode.addEventListener('change', () => {
      state.editMode = normalizeEditMode(refs.editMode.value);
      refreshExport();
    });

    document.getElementById('apply-input').addEventListener('click', () => generateFromControls('input'));
    document.getElementById('clear-board').addEventListener('click', clearBoard);
    document.getElementById('generate-import').addEventListener('click', generateFromImport);
    document.getElementById('refresh-export').addEventListener('click', refreshExport);
    document.getElementById('copy-export').addEventListener('click', copyExport);

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

    bindPalette();
  }

  function bindPalette() {
    renderTilePalette();
  }

  function renderTilePalette() {
    if (!refs.tilePalette) return;
    refs.tilePalette.textContent = '';
    const entries = getTilePreferences();
    const selectedEntry = entries.find((entry) => entry.id === state.selectedPaletteId);
    if (!selectedEntry) {
      state.selectedTile = null;
      state.selectedPaletteId = '';
    } else {
      state.selectedTile = cloneTile(selectedEntry.tile);
    }

    entries.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tile-swatch';
      button.title = entry.label;
      button.setAttribute('aria-label', entry.label);
      button.dataset.tile = JSON.stringify(entry.tile);
      button.dataset.paletteId = entry.id;
      if (entry.id === state.selectedPaletteId) button.classList.add('active');

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      button.appendChild(canvas);
      refs.tilePalette.appendChild(button);
      drawTilePreview(canvas, entry.tile);

      button.addEventListener('click', () => selectPaletteTile(entry));
      button.addEventListener('pointerdown', (event) => beginPaletteDrag(event, entry));
    });
  }

  function getTilePreferences() {
    const lattice = getLattice();
    return generateTilePreferences(lattice);
  }

  function selectPaletteTile(entry) {
    state.selectedTile = cloneTile(entry.tile);
    state.selectedPaletteId = entry.id;
    refs.tilePalette.querySelectorAll('.tile-swatch').forEach((button) => {
      button.classList.toggle('active', button.dataset.paletteId === entry.id);
    });
  }

  function updateSelectedTileFromPalette() {
    if (!state.selectedPaletteId) return;
    const entry = getTilePreferences().find((item) => item.id === state.selectedPaletteId);
    state.selectedTile = entry ? cloneTile(entry.tile) : null;
  }

  function beginPaletteDrag(event, entry) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    selectPaletteTile(entry);
    state.drag = {
      type: 'palette',
      tile: cloneTile(entry.tile),
      active: false
    };
    const startX = event.clientX;
    const startY = event.clientY;

    const onMove = (moveEvent) => {
      if (state.drag && !state.drag.active) {
        if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
        state.drag.active = true;
        startTileDragGhost(moveEvent.clientX, moveEvent.clientY, state.drag.tile, event.currentTarget);
      }
      moveTileDragGhost(moveEvent.clientX, moveEvent.clientY);
      updateDragPreview(moveEvent.clientX, moveEvent.clientY);
    };
    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (state.drag && state.drag.active && isOverCanvas(upEvent.clientX, upEvent.clientY)) {
        const hit = hitTest(upEvent.clientX, upEvent.clientY);
        if (hit >= 0) placeTile(hit, state.drag ? state.drag.tile : entry.tile);
      }
      clearEditorDrag();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    event.preventDefault();
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
    let cardTop = 0;
    let cardLeft = 0;
    let cardWidth = 0;
    let cardHeight = 0;
    let ghost = null;
    let ghostOffsetY = 0;
    let dragging = false;
    const pointerOptions = { passive: false };

    side.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest('.drag-handle');
      if (!handle) return;
      event.preventDefault();
      event.stopPropagation();
      const card = handle.closest('.card');
      if (!card) return;
      dragCard = card;
      pointerId = event.pointerId;
      startY = event.clientY;
      const rect = card.getBoundingClientRect();
      cardTop = rect.top;
      cardLeft = rect.left;
      cardWidth = rect.width;
      cardHeight = rect.height;
      ghostOffsetY = startY - cardTop;
      dragging = false;
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
        dragging = true;
        suppressCardToggleUntil = Date.now() + 500;
        document.body.classList.add('card-dragging');
        dragCard.classList.add('dragging');
        placeholder = document.createElement('div');
        placeholder.id = 'dnd-placeholder';
        placeholder.style.cssText = `height:${cardHeight}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;transition:height 0.15s;`;
        dragCard.parentElement.insertBefore(placeholder, dragCard);
        ghost = dragCard.cloneNode(true);
        ghost.id = 'dnd-ghost';
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${cardLeft}px`,
          width: `${cardWidth}px`,
          top: `${event.clientY - ghostOffsetY}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: '0.88',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: '4px',
          transition: 'none',
          touchAction: 'none'
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
      dragCard.classList.remove('dragging');
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

  function bindCanvas() {
    refs.canvas.addEventListener('pointerdown', handlePointerDown);
    refs.canvas.addEventListener('pointermove', handlePointerMove);
    refs.canvas.addEventListener('pointerup', handlePointerUp);
    refs.canvas.addEventListener('pointercancel', clearPointerState);
    refs.canvas.addEventListener('wheel', handleWheel, { passive: false });
    refs.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const hit = hitTest(event.clientX, event.clientY);
      if (hit >= 0 && !isTileEmpty(state.tiles[hit])) editExistingTile(hit, -1);
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

  function generateFromControls(source) {
    const rowRef = source === 'toolbar' ? refs.gridRows : refs.inputRows;
    const colRef = source === 'toolbar' ? refs.gridCols : refs.inputCols;
    const rows = clampInt(rowRef.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(colRef.value, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[refs.latticeSelect.value] ? refs.latticeSelect.value : state.lattice;
    const wrapped = refs.wrapBoard.checked;
    createBoard(rows, cols, latticeName, wrapped);
  }

  function syncInputDimensions() {
    const rows = clampInt(refs.inputRows.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(refs.inputCols.value, MIN_BOARD, MAX_BOARD, state.cols);
    refs.inputRows.value = rows;
    refs.inputCols.value = cols;
  }

  function createBoard(rows, cols, latticeName, wrapped) {
    state.rows = rows;
    state.cols = cols;
    state.lattice = LATTICES[latticeName] ? latticeName : 'hexagonal';
    state.wrapped = !!wrapped;
    state.edits = 0;
    state.hoverIndex = -1;
    state.tiles = Array(rows * cols).fill(null);
    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    renderTilePalette();
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function generateFromImport() {
    const text = refs.importInput.value.trim();
    if (!text) {
      refs.statusLine.textContent = 'no mosaic data';
      refs.statusLine.classList.add('mosaic-status-bad');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      refs.statusLine.textContent = 'mosaic data is not valid JSON';
      refs.statusLine.classList.add('mosaic-status-bad');
      return;
    }

    try {
      applyImportedMosaic(payload);
      refs.statusLine.textContent = 'mosaic generated';
      refs.statusLine.classList.remove('mosaic-status-bad');
    } catch (error) {
      refs.statusLine.textContent = error.message || 'could not generate mosaic';
      refs.statusLine.classList.add('mosaic-status-bad');
    }
  }

  function applyImportedMosaic(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('mosaic data must be an object');
    const rows = clampInt(payload.rows, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(payload.cols, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[payload.lattice] ? payload.lattice : state.lattice;
    const wrapped = payload.boundary === 'wrapped' || payload.wrapped === true;

    state.rows = rows;
    state.cols = cols;
    state.lattice = latticeName;
    state.wrapped = wrapped;
    state.wrappedViewMode = payload.wrappedViewMode === 'single' ? 'single' : 'periodic';
    state.arrowMode = normalizeImportedArrowMode(payload);
    state.editMode = normalizeEditMode(payload.clickMode || payload.editMode);
    state.showErrors = !(payload.display && payload.display.showOpenEnds === false);
    state.showCoords = !!(payload.display && payload.display.showCoords);
    state.edits = Number.isFinite(Number(payload.edits)) ? Math.max(0, Math.trunc(Number(payload.edits))) : 0;
    state.hoverIndex = -1;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.tiles = importTiles(payload.tiles, rows, cols);

    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    refs.showErrors.checked = state.showErrors;
    refs.showCoords.checked = state.showCoords;
    renderTilePalette();
    resizeCanvas();
    applyImportedView(payload.view);
    updateReport(false);
  }

  function importTiles(entries, rows, cols) {
    const tiles = Array(rows * cols).fill(null);
    if (!Array.isArray(entries)) return tiles;

    entries.forEach((entry, entryIndex) => {
      const index = importedTileIndex(entry, entryIndex, rows, cols);
      if (index < 0 || index >= tiles.length) return;
      tiles[index] = importedTileValue(entry);
    });
    return tiles;
  }

  function importedTileIndex(entry, entryIndex, rows, cols) {
    if (entry && typeof entry === 'object') {
      const row = Number(entry.row);
      const col = Number(entry.col);
      if (Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= rows && col >= 1 && col <= cols) {
        return indexOf(row - 1, col - 1, cols);
      }
    }
    return entryIndex < rows * cols ? entryIndex : -1;
  }

  function importedTileValue(entry) {
    let value = entry;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      if (Object.prototype.hasOwnProperty.call(entry, 'tile')) value = entry.tile;
      else if (Number.isFinite(Number(entry.mask))) value = tileFromMask(Number(entry.mask));
      else value = null;
    }
    if (value == null) return null;
    if (!Array.isArray(value)) return null;
    return cloneTile(value);
  }

  function normalizeImportedArrowMode(payload) {
    if (payload.arcArrows === 'visible' || payload.arcArrows === 'show') return 'show';
    return normalizeArrowMode(payload.arrowMode);
  }

  function applyImportedView(view) {
    state.viewScale = 1;
    state.viewX = 0;
    state.viewY = 0;
    if (view && typeof view === 'object') {
      const scale = Number(view.scale);
      const x = Number(view.x);
      const y = Number(view.y);
      if (Number.isFinite(scale)) state.viewScale = clamp(scale, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
      if (Number.isFinite(x)) state.viewX = x;
      if (Number.isFinite(y)) state.viewY = y;
    }
    normalizeViewOffset();
  }

  function clearBoard() {
    state.tiles = Array(state.rows * state.cols).fill(null);
    state.edits += 1;
    updateReport(false);
  }

  function rotateTile(index, steps) {
    if (isTileEmpty(state.tiles[index])) return;
    const next = rotateTileValue(state.tiles[index], steps);
    if (tilesEqual(state.tiles[index], next)) return;
    state.tiles[index] = next;
    state.edits += 1;
    updateReport(false);
  }

  function editExistingTile(index, direction) {
    if (state.editMode === 'reorder') {
      if (direction > 0) cycleTilePairs(index);
      else reverseTilePairs(index);
      return;
    }
    rotateTile(index, direction);
  }

  function cycleTilePairs(index) {
    const tile = normalizeTile(state.tiles[index]);
    if (tile.length < 2) return;
    const next = tile.slice(1).concat([tile[0]]);
    if (tilesEqual(tile, next)) return;
    state.tiles[index] = cloneTile(next);
    state.edits += 1;
    updateReport(false);
  }

  function reverseTilePairs(index) {
    const tile = normalizeTile(state.tiles[index]);
    if (tile.length < 2) return;
    const next = tile.slice().reverse();
    if (tilesEqual(tile, next)) return;
    state.tiles[index] = cloneTile(next);
    state.edits += 1;
    updateReport(false);
  }

  function placeTile(index, tile) {
    if (index < 0 || isTileEmpty(tile)) return;
    if (tilesEqual(state.tiles[index], tile)) return;
    state.tiles[index] = cloneTile(tile);
    state.edits += 1;
    updateReport(false);
  }

  function deleteTile(index) {
    if (index < 0 || isTileEmpty(state.tiles[index])) return;
    state.tiles[index] = null;
    state.edits += 1;
    updateReport(false);
  }

  function moveTile(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const tile = state.tiles[fromIndex];
    if (isTileEmpty(tile)) return;
    state.tiles[toIndex] = cloneTile(tile);
    state.tiles[fromIndex] = null;
    state.edits += 1;
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
    const existingTile = hit >= 0 ? state.tiles[hit] : null;
    pointerState = {
      id: event.pointerId,
      index: hit,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    state.drag = !isTileEmpty(existingTile) ? {
      type: 'canvas',
      sourceIndex: hit,
      tile: cloneTile(existingTile),
      active: false
    } : null;
    longPressFired = false;
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
    if (state.drag && state.drag.type === 'canvas' && pointerState.moved) {
      const wasActive = state.drag.active;
      state.drag.active = true;
      if (!wasActive) startTileDragGhost(event.clientX, event.clientY, state.drag.tile);
      moveTileDragGhost(event.clientX, event.clientY);
      updateDragPreview(event.clientX, event.clientY);
      event.preventDefault();
      return;
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
    const overCanvas = isOverCanvas(event.clientX, event.clientY);
    const hit = overCanvas ? hitTest(event.clientX, event.clientY) : -1;
    if (state.drag && state.drag.type === 'canvas' && state.drag.active) {
      if (!overCanvas) {
        deleteTile(state.drag.sourceIndex);
      } else if (hit >= 0) {
        moveTile(state.drag.sourceIndex, hit);
      }
      clearEditorDrag();
      clearPointerState(event);
      return;
    }
    if (!pointerState.moved && hit === pointerState.index && hit >= 0 && !longPressFired) {
      if (!isTileEmpty(state.tiles[hit])) editExistingTile(hit, 1);
      else if (!isTileEmpty(state.selectedTile)) placeTile(hit, state.selectedTile);
    }
    clearEditorDrag();
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
    if (!state.drag || state.drag.type === 'canvas') clearEditorDrag();
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
    const active = state.tiles.reduce((count, tile) => count + (isTileEmpty(tile) ? 0 : 1), 0);
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    let openEnds = 0;
    let alignedEdges = 0;

    for (let index = 0; index < total; index += 1) {
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      const mask = tileToMask(state.tiles[index]);
      if (!mask) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        if (!(mask & (1 << dir))) continue;
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (!next) {
          openEnds += 1;
          continue;
        }
        const nextIndex = indexOf(next.row, next.col, state.cols);
        const oppositeBit = 1 << lattice.opposite[dir];
        if (tileToMask(state.tiles[nextIndex]) & oppositeBit) {
          if (index < nextIndex) {
            alignedEdges += 1;
            union(parent, rank, index, nextIndex);
          }
        } else {
          openEnds += 1;
        }
      }
    }

    const activeIndices = state.tiles
      .map((tile, index) => (isTileEmpty(tile) ? -1 : index))
      .filter((index) => index >= 0);
    const components = activeIndices.length
      ? new Set(activeIndices.map((index) => find(parent, index))).size
      : 0;
    const cycles = Math.max(0, alignedEdges - active + components);
    let label = active === 0 ? 'empty' : 'editing';
    let message = active === 0 ? 'empty canvas' : `${openEnds} open end${openEnds === 1 ? '' : 's'}`;

    if (active > 0 && openEnds === 0) {
      label = 'closed';
      message = components > 1 ? `${components} closed components` : 'closed network';
    } else if (components > 1 && openEnds === 0) {
      label = 'disconnected';
      message = `${components} components`;
    } else if (cycles > 0) {
      label = 'loop';
      message = `${cycles} loop${cycles === 1 ? '' : 's'}`;
    }

    return {
      total,
      active,
      alignedEdges,
      openEnds,
      components,
      cycles,
      label,
      message
    };
  }

  function updateReport(manualCheck) {
    const report = analyze();
    refs.out.status.textContent = report.label;
    refs.out.lattice.textContent = getLattice().label;
    refs.out.boundary.textContent = state.wrapped ? 'wrapped' : 'open';
    refs.out.tiles.textContent = `${report.active}/${report.total}`;
    refs.out.connections.textContent = String(report.alignedEdges);
    refs.out.openEnds.textContent = String(report.openEnds);
    refs.out.components.textContent = String(report.components);
    refs.out.cycles.textContent = String(report.cycles);
    refs.out.moves.textContent = String(state.edits);

    refs.statusBadge.textContent = report.label;
    refs.statusBadge.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusBadge.classList.toggle('mosaic-status-bad', report.openEnds > 0 || report.cycles > 0);
    refs.statusLine.textContent = manualCheck ? `checked: ${report.message}` : report.message;
    refs.statusLine.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusLine.classList.toggle('mosaic-status-bad', report.openEnds > 0);
    refs.infoLine.textContent = `${getLattice().label}, ${state.wrapped ? 'wrapped' : 'open'} · ${report.active} filled`;

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
      drawDragGhost(ctx, palette);
      return;
    }

    drawBoardCopy(ctx, report, palette, { x: 0, y: 0 });
    drawDragGhost(ctx, palette);
  }

  function drawBoardCopy(ctx, report, palette, offset) {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    for (let index = 0; index < state.tiles.length; index += 1) {
      drawTile(ctx, index, report, palette);
    }
    ctx.restore();
  }

  function drawDragGhost(ctx, palette) {
    if (!state.drag || !state.drag.active || !state.dragPoint || isTileEmpty(state.drag.tile)) return;
    const radius = geometry.radius * 0.88;
    const points = tilePoints(state.dragPoint.x, state.dragPoint.y, radius);

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(61,107,79,0.16)';
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawPipe(ctx, state.dragPoint, state.drag.tile, palette);
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
    const tile = state.tiles[index];
    const mask = tileToMask(tile);
    const hasTile = !isTileEmpty(tile);
    const points = tilePoints(cell.x, cell.y, radius * 0.96);
    const isDragTarget = !!state.drag && index === state.dragPreviewIndex;
    const isDragSource = !!state.drag && state.drag.active && state.drag.type === 'canvas' && state.drag.sourceIndex === index;
    const displayTile = isDragTarget && !isTileEmpty(state.drag.tile) ? state.drag.tile : tile;
    const isHover = index === state.hoverIndex;

    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = isDragTarget ? 'rgba(61,107,79,0.12)' : (isDragSource ? '#eee7dd' : (hasTile ? '#fffdf8' : '#f8f5ee'));
    ctx.strokeStyle = (isHover || isDragTarget) ? palette.accent : palette.border;
    ctx.lineWidth = (isHover || isDragTarget) ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    drawPipe(ctx, cell, displayTile, palette);

    if (state.showErrors && !isDragTarget) drawOpenEndMarks(ctx, index, cell, mask, palette);
    if (state.showCoords) drawCellLabel(ctx, cell, palette);
  }

  function drawPipe(ctx, cell, tile, palette, radiusOverride = null) {
    const radius = radiusOverride || geometry.radius;
    const arcs = normalizeTile(tile);
    if (!arcs.length) return;
    const theme = getMosaicTheme(palette);
    const pipeColor = theme.pipe;
    const pipeWidth = Math.max(5, radius * 0.17);
    const gapWidth = pipeWidth + Math.max(4, radius * 0.09);

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    arcs.forEach((pair, index) => {
      if (index > 0) {
        ctx.strokeStyle = '#fffdf8';
        ctx.lineWidth = gapWidth;
        drawArcPath(ctx, cell, pair, radius);
      }
      ctx.strokeStyle = pipeColor;
      ctx.fillStyle = pipeColor;
      ctx.lineWidth = pipeWidth;
      drawArcPath(ctx, cell, pair, radius);
      drawArcArrow(ctx, cell, pair, radius, pipeWidth);
    });
    ctx.restore();
  }

  function drawOpenEndMarks(ctx, index, cell, mask, palette) {
    const radius = geometry.radius;
    const lattice = getLattice();
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (!(mask & (1 << dir))) continue;
      if (hasMatchingConnection(index, dir)) continue;
      const point = edgePoint(cell.x, cell.y, dir, edgeConnectionDistance(radius));
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

  function drawTilePreview(canvas, tile) {
    const ctx = canvas.getContext('2d');
    const palette = getPalette();
    const lattice = getLattice();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 24;
    const points = lattice.shape === 'square'
      ? squarePoints(cx, cy, radius * 0.86)
      : hexPoints(cx, cy, radius * 0.88, lattice);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    drawPipe(ctx, { x: cx, y: cy }, tile, palette, radius);
  }

  function isOverCanvas(clientX, clientY) {
    const rect = refs.canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function updateDragPreview(clientX, clientY) {
    const overCanvas = isOverCanvas(clientX, clientY);
    const nextIndex = overCanvas ? hitTest(clientX, clientY) : -1;
    const hadPoint = !!state.dragPoint;
    state.dragPoint = overCanvas ? clientPointToLogical(clientX, clientY) : null;
    if (nextIndex !== state.dragPreviewIndex || state.dragPoint || hadPoint) {
      state.dragPreviewIndex = nextIndex;
      draw(analyze());
    }
  }

  function startTileDragGhost(clientX, clientY, tile, sourceElement = null) {
    clearTileDragGhost();
    if (isTileEmpty(tile)) return;
    tileDragSource = sourceElement;
    if (tileDragSource) tileDragSource.classList.add('dragging');

    const ghost = document.createElement('div');
    ghost.className = 'tile-drag-ghost';
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    ghost.appendChild(canvas);
    document.body.appendChild(ghost);
    tileDragGhost = ghost;
    document.body.classList.add('tile-dragging');
    drawTilePreview(canvas, tile);
    moveTileDragGhost(clientX, clientY);
  }

  function moveTileDragGhost(clientX, clientY) {
    if (!tileDragGhost) return;
    if (isOverCanvas(clientX, clientY)) {
      tileDragGhost.style.display = 'none';
      return;
    }
    tileDragGhost.style.display = '';
    tileDragGhost.style.left = `${clientX}px`;
    tileDragGhost.style.top = `${clientY}px`;
  }

  function clearTileDragGhost() {
    if (tileDragSource) tileDragSource.classList.remove('dragging');
    tileDragSource = null;
    if (tileDragGhost) tileDragGhost.remove();
    tileDragGhost = null;
    if (document.body) document.body.classList.remove('tile-dragging');
  }

  function clearEditorDrag() {
    const hadPreview = state.dragPreviewIndex >= 0 || !!state.dragPoint;
    clearTileDragGhost();
    state.drag = null;
    state.dragPoint = null;
    state.dragPreviewIndex = -1;
    if (hadPreview) draw(analyze());
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
    return !!(tileToMask(state.tiles[nextIndex]) & (1 << lattice.opposite[dir]));
  }

  function refreshExport() {
    const report = analyze();
    const lattice = getLattice();
    const payload = {
      name: 'Mosaic Calculator',
      lattice: state.lattice,
      boundary: state.wrapped ? 'wrapped' : 'open',
      wrappedViewMode: state.wrappedViewMode,
      arcArrows: state.arrowMode === 'show' ? 'visible' : 'hidden',
      clickMode: state.editMode,
      display: {
        showOpenEnds: state.showErrors,
        showCoords: state.showCoords
      },
      view: {
        scale: Number(state.viewScale.toFixed(4)),
        x: Number(state.viewX.toFixed(2)),
        y: Number(state.viewY.toFixed(2))
      },
      rows: state.rows,
      cols: state.cols,
      edits: state.edits,
      filledTiles: report.active,
      tiles: state.tiles.map((tile, index) => {
        const mask = tileToMask(tile);
        return {
          row: Math.floor(index / state.cols) + 1,
          col: (index % state.cols) + 1,
          tile: cloneTile(tile),
          mask,
          edges: maskToDirs(mask).map((dir) => lattice.dirNames[dir]),
          arcs: normalizeTile(tile).map((pair) => pair.slice(0, 2).map((dir) => lattice.dirNames[dir])),
          directedArcs: normalizeTile(tile).map((pair) => ({
            from: lattice.dirNames[pair[0]],
            to: lattice.dirNames[pair[1]]
          }))
        };
      })
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
    refs.arrowMode.value = state.arrowMode;
    refs.editMode.value = state.editMode;
    refs.wrappedViewMode.value = state.wrappedViewMode;
  }

  function generateTilePreferences(lattice) {
    const tilesByKey = new Map();
    const blankTile = [];

    for (let size = 2; size <= lattice.sides; size += 2) {
      combinations(Array.from({ length: lattice.sides }, (_, index) => index), size).forEach((edges) => {
        generateMatchings(edges).forEach((matching) => {
          const canonical = canonicalTile(matching, lattice.sides);
          const key = tileKey(canonical);
          if (!tilesByKey.has(key)) tilesByKey.set(key, canonical);
        });
      });
    }

    return [blankTile].concat(Array.from(tilesByKey.values())
      .sort((left, right) => {
        if (left.length !== right.length) return left.length - right.length;
        return tileKey(left).localeCompare(tileKey(right));
      }))
      .map((tile) => ({
        id: tile.length ? `tile-${tileKey(tile).replaceAll(',', '-').replaceAll(';', '_')}` : 'tile-blank',
        label: tileLabel(tile, lattice),
        tile
      }));
  }

  function canonicalTile(tile, sides) {
    let best = null;
    let bestKey = '';
    [-1, 1].forEach((orientation) => {
      for (let shift = 0; shift < sides; shift += 1) {
        const candidate = tile.map((pair) => normalizePair([
          modulo((orientation * pair[0]) + shift, sides),
          modulo((orientation * pair[1]) + shift, sides)
        ])).sort(comparePairs);
        const key = tileKey(candidate);
        if (!best || key < bestKey) {
          best = candidate;
          bestKey = key;
        }
      }
    });
    return best;
  }

  function tileKey(tile) {
    return tile.map((pair) => `${pair[0]},${pair[1]}`).join(';');
  }

  function tileLabel(tile, lattice) {
    if (!tile.length) return 'blank';
    return tile.map((pair) => `${lattice.dirNames[pair[0]]}-${lattice.dirNames[pair[1]]}`).join(' / ');
  }

  function normalizePair(pair) {
    return pair[0] <= pair[1] ? [pair[0], pair[1]] : [pair[1], pair[0]];
  }

  function comparePairs(left, right) {
    if (left[0] !== right[0]) return left[0] - right[0];
    return left[1] - right[1];
  }

  function combinations(items, size) {
    if (size === 0) return [[]];
    if (items.length < size) return [];
    if (items.length === size) return [items.slice()];
    const [head, ...tail] = items;
    return combinations(tail, size - 1)
      .map((combo) => [head, ...combo])
      .concat(combinations(tail, size));
  }

  function generateMatchings(edges) {
    if (!edges.length) return [[]];
    const [first, ...rest] = edges;
    const matchings = [];
    rest.forEach((second, secondIndex) => {
      const remaining = rest.filter((_, index) => index !== secondIndex);
      generateMatchings(remaining).forEach((matching) => {
        matchings.push([normalizePair([first, second]), ...matching]);
      });
    });
    return matchings;
  }

  function maskToDirs(mask) {
    const dirs = [];
    const lattice = getLattice();
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (mask & (1 << dir)) dirs.push(dir);
    }
    return dirs;
  }

  // A tile is an ordered list of edge pairs; later arcs are drawn above earlier arcs.
  function tileFromPairs(pairs) {
    return pairs.map((pair) => [pair[0], pair[1]]);
  }

  function cloneTile(tile) {
    if (tile == null) return null;
    const arcs = normalizeTile(tile);
    return arcs.map((pair) => [pair[0], pair[1]]);
  }

  function normalizeTile(tile) {
    if (typeof tile === 'number') return tileFromMask(tile);
    if (!Array.isArray(tile)) return [];
    const sides = getLattice().sides;
    return tile
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const first = normalizeDir(pair[0], sides);
        const second = normalizeDir(pair[1], sides);
        if (first === second) return null;
        return [first, second];
      })
      .filter(Boolean);
  }

  function normalizeArrowMode(mode) {
    return mode === 'show' ? 'show' : 'none';
  }

  function normalizeEditMode(mode) {
    return mode === 'reorder' ? 'reorder' : 'rotate';
  }

  function normalizeDir(dir, sides) {
    const parsed = Number(dir);
    if (!Number.isFinite(parsed)) return 0;
    return modulo(Math.trunc(parsed), sides);
  }

  function tileFromMask(mask) {
    const dirs = maskToDirs(mask);
    const pairs = [];
    for (let index = 0; index + 1 < dirs.length; index += 2) {
      pairs.push([dirs[index], dirs[index + 1]]);
    }
    return pairs;
  }

  function tileToMask(tile) {
    if (typeof tile === 'number') return tile || 0;
    return normalizeTile(tile).reduce((mask, pair) => (
      mask | (1 << pair[0]) | (1 << pair[1])
    ), 0);
  }

  function isTileEmpty(tile) {
    return tile == null;
  }

  function tilesEqual(left, right) {
    if (left == null || right == null) return left == null && right == null;
    const leftTile = normalizeTile(left);
    const rightTile = normalizeTile(right);
    if (leftTile.length !== rightTile.length) return false;
    return leftTile.every((pair, index) => (
      pair[0] === rightTile[index][0]
      && pair[1] === rightTile[index][1]
    ));
  }

  function rotateTileValue(tile, steps) {
    if (tile == null) return null;
    const arcs = normalizeTile(tile);
    if (!arcs.length) return [];
    const lattice = getLattice();
    const normalized = ((steps % lattice.sides) + lattice.sides) % lattice.sides;
    return arcs.map((pair) => [
      (pair[0] + normalized) % lattice.sides,
      (pair[1] + normalized) % lattice.sides
    ]);
  }

  function maskFromDirs(dirs) {
    return dirs.reduce((mask, dir) => mask | (1 << dir), 0);
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

  function drawArcPath(ctx, cell, pair, radius) {
    const path = getArcPath(cell, pair, radius);
    if (!path) return null;

    ctx.beginPath();
    ctx.moveTo(path.start.x, path.start.y);
    if (path.type === 'line') {
      ctx.lineTo(path.end.x, path.end.y);
    } else if (path.type === 'arc') {
      ctx.arc(path.center.x, path.center.y, path.arcRadius, path.startAngle, path.endAngle, path.anticlockwise);
    } else {
      ctx.quadraticCurveTo(path.control.x, path.control.y, path.end.x, path.end.y);
    }
    ctx.stroke();
    return path;
  }

  function drawArcArrow(ctx, cell, pair, radius, pipeWidth) {
    if (state.arrowMode !== 'show') return;
    const path = getArcPath(cell, pair, radius);
    if (!path) return;
    const size = Math.max(7, pipeWidth * 1.35);
    let point;
    let angle;

    if (path.type === 'line') {
      point = lerpPoint(path.start, path.end, 0.58);
      angle = Math.atan2(path.end.y - path.start.y, path.end.x - path.start.x);
    } else if (path.type === 'arc') {
      const direction = path.anticlockwise ? -1 : 1;
      const midAngle = path.startAngle + (direction * path.sweep / 2);
      point = {
        x: path.center.x + Math.cos(midAngle) * path.arcRadius,
        y: path.center.y + Math.sin(midAngle) * path.arcRadius
      };
      angle = midAngle + (direction * Math.PI / 2);
    } else {
      const t = 0.58;
      point = quadraticPoint(path.start, path.control, path.end, t);
      const tangent = quadraticTangent(path.start, path.control, path.end, t);
      angle = Math.atan2(tangent.y, tangent.x);
    }

    drawArrowHead(ctx, point, angle, size);
  }

  function getArcPath(cell, pair, radius) {
    const lattice = getLattice();
    const a = modulo(pair[0], lattice.sides);
    const b = modulo(pair[1], lattice.sides);
    const distance = edgeConnectionDistance(radius);
    const start = edgePoint(cell.x, cell.y, a, distance);
    const end = edgePoint(cell.x, cell.y, b, distance);

    if (lattice.opposite[a] === b) {
      return { type: 'line', start, end };
    }

    const angleA = lattice.angles[a];
    const angleB = lattice.angles[b];
    const tangentA = { x: Math.cos(angleA), y: Math.sin(angleA) };
    const tangentB = { x: Math.cos(angleB), y: Math.sin(angleB) };
    const normalA = { x: -tangentA.y, y: tangentA.x };
    const normalB = { x: -tangentB.y, y: tangentB.x };
    const center = lineIntersection(start, normalA, end, normalB);

    if (!center) {
      return { type: 'quadratic', start, end, control: { x: cell.x, y: cell.y } };
    }

    const arcRadius = Math.hypot(start.x - center.x, start.y - center.y);
    if (!Number.isFinite(arcRadius) || arcRadius < 0.001 || arcRadius > radius * 8) {
      return { type: 'quadratic', start, end, control: { x: cell.x, y: cell.y } };
    }

    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    const clockwise = moduloAngle(endAngle - startAngle);
    const anticlockwise = moduloAngle(startAngle - endAngle);
    const useAnticlockwise = anticlockwise < clockwise;
    return {
      type: 'arc',
      start,
      end,
      center,
      arcRadius,
      startAngle,
      endAngle,
      anticlockwise: useAnticlockwise,
      sweep: useAnticlockwise ? anticlockwise : clockwise
    };
  }

  function drawArrowHead(ctx, point, angle, size) {
    const tip = {
      x: point.x + Math.cos(angle) * size * 0.45,
      y: point.y + Math.sin(angle) * size * 0.45
    };
    const tail = {
      x: point.x - Math.cos(angle) * size * 0.45,
      y: point.y - Math.sin(angle) * size * 0.45
    };
    const side = {
      x: Math.cos(angle + Math.PI / 2) * size * 0.36,
      y: Math.sin(angle + Math.PI / 2) * size * 0.36
    };
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tail.x + side.x, tail.y + side.y);
    ctx.lineTo(tail.x - side.x, tail.y - side.y);
    ctx.closePath();
    ctx.fill();
  }

  function lerpPoint(from, to, t) {
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t
    };
  }

  function quadraticPoint(start, control, end, t) {
    const left = lerpPoint(start, control, t);
    const right = lerpPoint(control, end, t);
    return lerpPoint(left, right, t);
  }

  function quadraticTangent(start, control, end, t) {
    return {
      x: (2 * (1 - t) * (control.x - start.x)) + (2 * t * (end.x - control.x)),
      y: (2 * (1 - t) * (control.y - start.y)) + (2 * t * (end.y - control.y))
    };
  }

  function edgeConnectionDistance(radius) {
    return getLattice().shape === 'square' ? radius : radius * Math.sqrt(3) / 2;
  }

  function lineIntersection(pointA, vectorA, pointB, vectorB) {
    const cross = (vectorA.x * vectorB.y) - (vectorA.y * vectorB.x);
    if (Math.abs(cross) < 0.0001) return null;
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const distance = ((dx * vectorB.y) - (dy * vectorB.x)) / cross;
    return {
      x: pointA.x + (vectorA.x * distance),
      y: pointA.y + (vectorA.y * distance)
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
      pipe: MOSAIC_THEME.pipe
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

  function moduloAngle(angle) {
    return modulo(angle, Math.PI * 2);
  }

  function modulo(value, size) {
    return ((value % size) + size) % size;
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
