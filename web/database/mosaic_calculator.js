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
  const DRAW_START_EDGE_RATIO = 0.42;
  const DRAW_EXIT_EDGE_RATIO = 0.94;
  const DRAW_BACKTRACK_EDGE_RATIO = 1.03;
  const HEX_AXIAL_DELTAS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1]
  ];
  const MOSAIC_THEME = {
    pipe: '#2f3437'
  };
  const COMPONENT_COLOR_PALETTE = ['#b23a48', '#1f7a8c', '#6a4c93', '#c47f17'];

  const state = {
    rows: 5,
    cols: 5,
    lattice: 'hexagonal',
    wrapped: false,
    tiles: [],
    edits: 0,
    showErrors: true,
    showCoords: false,
    colorComponents: true,
    componentColors: [],
    drawStyle: 'shade',
    knotMethod: 'hybrid',
    wrappedViewMode: 'periodic',
    viewScale: 1,
    viewX: 0,
    viewY: 0,
    inputMode: 'draw',
    editMode: 'rotate',
    drawLayer: 'above',
    selectedTile: null,
    selectedPaletteId: '',
    drag: null,
    dragPoint: null,
    dragPreviewIndex: -1,
    pickedComponent: null,
    pickHoverHit: null,
    drawDebugHit: null,
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
  let drawState = null;

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
    refs.inputMode = document.getElementById('input-mode');
    refs.latticeSelect = document.getElementById('lattice-select');
    refs.wrapBoard = document.getElementById('wrap-board');
    refs.editMode = document.getElementById('edit-mode');
    refs.drawLayer = document.getElementById('draw-layer');
    refs.drawStyle = document.getElementById('draw-style');
    refs.applyPick = document.getElementById('apply-pick');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.colorComponents = document.getElementById('color-components');
    refs.wrappedViewRow = document.getElementById('wrapped-view-row');
    refs.wrappedViewMode = document.getElementById('wrapped-view-mode');
    refs.knotMethod = document.getElementById('knot-method');
    refs.knotStatus = document.getElementById('knot-status');
    refs.knotMethodResult = document.getElementById('knot-method-result');
    refs.knotName = document.getElementById('knot-name');
    refs.knotPd = document.getElementById('knot-pd');
    refs.knotDt = document.getElementById('knot-dt');
    refs.knotLink = document.getElementById('knot-link');
    refs.tilePalette = document.getElementById('tile-palette');
    refs.importInput = document.getElementById('import-input');
    refs.exportOut = document.getElementById('export-out');
    refs.inputPanels = Array.from(document.querySelectorAll('[data-input-panel]'));

    refs.out = {
      tiles: document.getElementById('out-tiles'),
      openEnds: document.getElementById('out-open-ends'),
      components: document.getElementById('out-components')
    };
  }

  function bindControls() {
    const updateBoardFromControls = debounce(() => generateFromControls(), 80);
    refs.gridRows.addEventListener('input', updateBoardFromControls);
    refs.gridCols.addEventListener('input', updateBoardFromControls);
    refs.gridRows.addEventListener('change', () => generateFromControls());
    refs.gridCols.addEventListener('change', () => generateFromControls());
    refs.inputMode.addEventListener('change', () => {
      state.inputMode = normalizeInputMode(refs.inputMode.value);
      state.hoverIndex = -1;
      state.drawDebugHit = null;
      state.pickHoverHit = null;
      if (state.inputMode !== 'pick') state.pickedComponent = null;
      clearEditorDrag();
      cancelDrawGesture();
      if (state.inputMode === 'drag') renderTilePalette();
      updateInputModePanels();
      updateReport(false);
    });
    refs.latticeSelect.addEventListener('change', () => generateFromControls());
    refs.wrapBoard.addEventListener('change', () => generateFromControls());
    refs.editMode.addEventListener('change', () => {
      state.editMode = normalizeEditMode(refs.editMode.value);
      refreshExport();
    });
    refs.drawLayer.addEventListener('change', () => {
      state.drawLayer = normalizeDrawLayer(refs.drawLayer.value);
      refreshExport();
    });
    refs.drawStyle.addEventListener('change', () => {
      state.drawStyle = normalizeDrawStyle(refs.drawStyle.value);
      state.drawDebugHit = null;
      updateReport(false);
    });

    document.getElementById('clear-board').addEventListener('click', clearBoard);
    document.getElementById('generate-import').addEventListener('click', generateFromImport);
    refs.applyPick.addEventListener('click', applyPickedComponent);
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
    refs.colorComponents.addEventListener('change', () => {
      state.colorComponents = refs.colorComponents.checked;
      if (state.colorComponents) state.componentColors = [];
      updateReport(false);
      refreshExport();
    });
    refs.wrappedViewMode.addEventListener('change', () => {
      state.wrappedViewMode = refs.wrappedViewMode.value === 'single' ? 'single' : 'periodic';
      normalizeViewOffset();
      updateReport(false);
    });
    refs.knotMethod.addEventListener('change', () => {
      state.knotMethod = normalizeKnotMethod(refs.knotMethod.value);
      updateReport(false);
      refreshExport();
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
    if (state.inputMode !== 'drag') return;
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
    if (state.inputMode !== 'drag') return;
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
    if (state.inputMode !== 'drag') return;
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
    refs.canvas.addEventListener('dblclick', () => {
      if (!state.colorComponents) return;
      state.colorComponents = false;
      state.componentColors = [];
      refs.colorComponents.checked = false;
      updateReport(false);
    });
    refs.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (state.inputMode === 'draw') {
        const hit = hitTest(event.clientX, event.clientY);
        if (hit >= 0 && !isTileEmpty(state.tiles[hit])) reverseTilePairs(hit);
        return;
      }
      if (state.inputMode !== 'drag') return;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit >= 0 && !isTileEmpty(state.tiles[hit])) editExistingTile(hit, -1);
    });
    refs.canvas.addEventListener('mouseleave', () => {
      clearDrawDebugHit(false);
      clearPickHoverHit(false);
      state.hoverIndex = -1;
      draw(analyze());
    });
    refs.canvas.addEventListener('mousemove', (event) => {
      if (pointerState) return;
      if (state.inputMode === 'import') {
        if (state.hoverIndex !== -1) {
          state.hoverIndex = -1;
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'pick') {
        const pickChanged = updatePickHoverFromPoint(event.clientX, event.clientY, false);
        if (state.hoverIndex !== -1 || pickChanged) {
          state.hoverIndex = -1;
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'draw') {
        const debugChanged = updateDrawDebugFromPoint(event.clientX, event.clientY, false);
        if (state.hoverIndex !== -1 || debugChanged) {
          state.hoverIndex = -1;
          draw(analyze());
        }
        return;
      }
      const debugChanged = updateDrawDebugFromPoint(event.clientX, event.clientY, false);
      const hit = hitTest(event.clientX, event.clientY);
      if (hit !== state.hoverIndex || debugChanged) {
        state.hoverIndex = hit;
        draw(analyze());
      }
    });
  }

  function generateFromControls() {
    const rows = clampInt(refs.gridRows.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(refs.gridCols.value, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[refs.latticeSelect.value] ? refs.latticeSelect.value : state.lattice;
    const wrapped = refs.wrapBoard.checked;
    reshapeBoard(rows, cols, latticeName, wrapped);
  }

  function createBoard(rows, cols, latticeName, wrapped) {
    state.rows = rows;
    state.cols = cols;
    state.lattice = LATTICES[latticeName] ? latticeName : 'hexagonal';
    state.wrapped = !!wrapped;
    state.edits = 0;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.tiles = Array(rows * cols).fill(null);
    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    renderTilePalette();
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function reshapeBoard(rows, cols, latticeName, wrapped) {
    const nextLattice = LATTICES[latticeName] ? latticeName : state.lattice;
    const nextWrapped = !!wrapped;
    const sameShape = rows === state.rows
      && cols === state.cols
      && nextLattice === state.lattice
      && nextWrapped === state.wrapped;
    if (sameShape) {
      syncAllInputs(rows, cols, state.lattice, state.wrapped);
      return;
    }

    clearEditorDrag();
    cancelDrawGesture(false);
    const oldRows = state.rows;
    const oldCols = state.cols;
    const oldLattice = state.lattice;
    const oldTiles = state.tiles.slice();

    state.rows = rows;
    state.cols = cols;
    state.lattice = nextLattice;
    state.wrapped = nextWrapped;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    if (oldLattice !== nextLattice) {
      state.selectedTile = null;
      state.selectedPaletteId = '';
    }
    state.tiles = reshapeTiles(oldTiles, oldRows, oldCols, rows, cols, getLattice().sides);
    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    renderTilePalette();
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function reshapeTiles(oldTiles, oldRows, oldCols, rows, cols, sides) {
    const next = Array(rows * cols).fill(null);
    const rowLimit = Math.min(oldRows, rows);
    const colLimit = Math.min(oldCols, cols);
    for (let row = 0; row < rowLimit; row += 1) {
      for (let col = 0; col < colLimit; col += 1) {
        const oldIndex = indexOf(row, col, oldCols);
        const nextIndex = indexOf(row, col, cols);
        next[nextIndex] = adaptTileToSides(oldTiles[oldIndex], sides);
      }
    }
    return next;
  }

  function adaptTileToSides(tile, sides) {
    if (tile == null) return null;
    if (!Array.isArray(tile)) return null;
    return tile
      .map((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const first = Number(pair[0]);
        const second = Number(pair[1]);
        if (!Number.isInteger(first) || !Number.isInteger(second)) return null;
        if (first < 0 || first >= sides || second < 0 || second >= sides || first === second) return null;
        return [first, second];
      })
      .filter(Boolean);
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
    state.inputMode = normalizeInputMode(payload.inputMode);
    state.editMode = normalizeEditMode(payload.clickMode || payload.editMode);
    state.drawLayer = normalizeDrawLayer(payload.drawLayer);
    state.showErrors = !(payload.display && payload.display.showOpenEnds === false);
    state.showCoords = !!(payload.display && payload.display.showCoords);
    state.colorComponents = !(payload.display && payload.display.colorComponents === false);
    state.componentColors = [];
    state.drawStyle = normalizeDrawStyle(
      payload.drawStyle
      || (payload.display && payload.display.drawStyle)
      || (payload.display && payload.display.drawDebug ? 'debug' : 'shade')
    );
    state.knotMethod = normalizeKnotMethod(payload.knotMethod || (payload.display && payload.display.knotMethod));
    state.edits = Number.isFinite(Number(payload.edits)) ? Math.max(0, Math.trunc(Number(payload.edits))) : 0;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.tiles = importTiles(payload.tiles, rows, cols);

    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    refs.showErrors.checked = state.showErrors;
    refs.showCoords.checked = state.showCoords;
    refs.colorComponents.checked = state.colorComponents;
    refs.drawStyle.value = state.drawStyle;
    refs.knotMethod.value = state.knotMethod;
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
    state.pickedComponent = null;
    state.pickHoverHit = null;
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

  function beginDrawGesture(event) {
    const entry = edgeHitTest(event.clientX, event.clientY, 0);
    updateDrawDebugFromPoint(event.clientX, event.clientY, false);
    pointerState = {
      id: event.pointerId,
      index: entry ? entry.index : -1,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    refs.canvas.setPointerCapture(event.pointerId);
    drawState = {
      pointerId: event.pointerId,
      origin: null,
      current: null,
      history: [],
      eraseMode: 'detecting',
      completed: false
    };
    state.hoverIndex = -1;
    if (entry) {
      startDrawTile(entry, false);
      if (state.drawStyle === 'shade') updateDrawShadeFromCurrent(event.clientX, event.clientY, false);
      else updateDrawDebugFromPoint(event.clientX, event.clientY, false);
      draw(analyze());
    }
  }

  function updateDrawGesture(event) {
    if (!drawState) return;
    if (state.drawStyle === 'shade' && drawState.current) {
      updateDrawShadeFromCurrent(event.clientX, event.clientY);
    } else {
      updateDrawDebugFromPoint(event.clientX, event.clientY);
    }
    if (!drawState.current) {
      const firstEntry = firstDrawEntry(event.clientX, event.clientY);
      if (firstEntry) {
        startDrawTile(firstEntry);
        if (state.drawStyle === 'shade') updateDrawShadeFromCurrent(event.clientX, event.clientY);
      }
      return;
    }

    const backtrackDir = drawBacktrackDirection(event.clientX, event.clientY, drawState.current);
    if (backtrackDir === drawState.current.entryDir) {
      if (drawState.history.length) undoLastDrawSegment();
      else restorePendingDrawTile();
      if (state.drawStyle === 'shade') {
        if (drawState.current) updateDrawShadeFromCurrent(event.clientX, event.clientY);
        else updateDrawDebugFromPoint(event.clientX, event.clientY);
      } else {
        updateDrawDebugFromPoint(event.clientX, event.clientY);
      }
      return;
    }

    const exitDir = drawExitDirection(event.clientX, event.clientY, drawState.current);
    if (exitDir == null || exitDir === drawState.current.entryDir) return;

    const finished = drawState.current;
    commitDrawTile(finished, exitDir);
    drawState.current = null;
    drawState.completed = true;
    updateReport(false);

    const next = nextDrawEntry(finished, exitDir);
    if (next) {
      startDrawTile(next);
      if (state.drawStyle === 'shade') updateDrawShadeFromCurrent(event.clientX, event.clientY);
    }
  }

  function firstDrawEntry(clientX, clientY) {
    return edgeHitTest(clientX, clientY, 0);
  }

  function startDrawTile(edge, redraw = true) {
    if (!drawState) return;
    const originalTile = isTileEmpty(state.tiles[edge.index]) ? null : cloneTile(state.tiles[edge.index]);
    const removed = removePairAtEdge(originalTile || [], edge.dir);
    state.tiles[edge.index] = removed.tile;
    drawState.current = {
      index: edge.index,
      offset: { x: edge.offset.x, y: edge.offset.y },
      entryDir: edge.dir,
      originalTile,
      removedEntryPair: removed.pair,
      removedEntryIndex: removed.pairIndex
    };
    if (redraw) draw(analyze());
  }

  function commitDrawTile(tileState, exitDir) {
    const eraseModeBefore = drawState ? drawState.eraseMode : 'drawing';
    const erasesExisting = eraseModeBefore === 'detecting'
      && pairHasEndpoints(tileState.removedEntryPair, tileState.entryDir, exitDir);

    if (erasesExisting) {
      state.tiles[tileState.index] = cloneTile(state.tiles[tileState.index] || []);
    } else {
      if (drawState) drawState.eraseMode = 'drawing';
      const removed = removePairAtEdge(state.tiles[tileState.index] || [], exitDir);
      const next = removed.tile;
      const newPair = [tileState.entryDir, exitDir];
      if (state.drawLayer === 'below') next.unshift(newPair);
      else next.push(newPair);
      state.tiles[tileState.index] = cloneTile(next);
    }
    state.edits += 1;
    if (drawState) {
      drawState.origin = null;
      drawState.history.push({
        tileState: cloneDrawTileState(tileState),
        exitDir,
        eraseModeBefore,
        eraseModeAfter: drawState.eraseMode
      });
    }
  }

  function undoLastDrawSegment() {
    if (!drawState || !drawState.history.length) return false;
    if (drawState.current) restoreDrawTile(drawState.current);

    const segment = drawState.history.pop();
    restoreDrawTile(segment.tileState);
    state.edits = Math.max(0, state.edits - 1);
    drawState.current = null;
    drawState.eraseMode = segment.eraseModeBefore || 'drawing';
    drawState.completed = drawState.history.length > 0;
    updateReport(false);

    startDrawTile({
      index: segment.tileState.index,
      dir: segment.tileState.entryDir,
      offset: segment.tileState.offset
    });
    return true;
  }

  function restorePendingDrawTile() {
    if (!drawState || !drawState.current) return false;
    restoreDrawTile(drawState.current);
    drawState.current = null;
    drawState.completed = drawState.history.length > 0;
    if (state.drawStyle === 'shade') clearDrawDebugHit(false);
    updateReport(false);
    return true;
  }

  function handleDrawClick(event) {
    if (!pointerState || pointerState.moved || longPressFired) return false;
    if (drawState && (drawState.current || drawState.history.length)) return false;
    const hit = hitTest(event.clientX, event.clientY);
    if (hit < 0 || hit !== pointerState.index || isTileEmpty(state.tiles[hit])) return false;
    cycleTilePairs(hit);
    return true;
  }

  function cloneDrawTileState(tileState) {
    return {
      index: tileState.index,
      offset: { x: tileState.offset.x, y: tileState.offset.y },
      entryDir: tileState.entryDir,
      originalTile: tileState.originalTile == null ? null : cloneTile(tileState.originalTile),
      removedEntryPair: tileState.removedEntryPair ? tileState.removedEntryPair.slice() : null,
      removedEntryIndex: tileState.removedEntryIndex
    };
  }

  function finishDrawGesture(event = null) {
    if (!drawState) return;
    if (drawState.current) {
      restoreDrawTile(drawState.current);
    }
    drawState = null;
    if (event && isOverCanvas(event.clientX, event.clientY)) {
      updateDrawDebugFromPoint(event.clientX, event.clientY, false);
    } else {
      clearDrawDebugHit(false);
    }
    updateReport(false);
  }

  function cancelDrawGesture(redraw = true) {
    if (!drawState) return;
    if (drawState.current) restoreDrawTile(drawState.current);
    drawState = null;
    clearDrawDebugHit(false);
    if (redraw) updateReport(false);
  }

  function restoreDrawTile(tileState) {
    state.tiles[tileState.index] = tileState.originalTile == null ? null : cloneTile(tileState.originalTile);
  }

  function removePairAtEdge(tile, dir) {
    const next = cloneTile(tile) || [];
    const pairIndex = next.findIndex((pair) => pair[0] === dir || pair[1] === dir);
    const pair = pairIndex >= 0 ? next[pairIndex].slice() : null;
    if (pairIndex >= 0) next.splice(pairIndex, 1);
    return { tile: next, pairIndex, pair };
  }

  function pairHasEndpoints(pair, first, second) {
    return Array.isArray(pair)
      && ((pair[0] === first && pair[1] === second) || (pair[0] === second && pair[1] === first));
  }

  function beginPickGesture(event) {
    pointerState = {
      id: event.pointerId,
      index: -1,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    refs.canvas.setPointerCapture(event.pointerId);
  }

  function updatePickGesture(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (Math.hypot(dx, dy) > 8) pointerState.moved = true;
  }

  function finishPickGesture(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    if (!pointerState.moved && isOverCanvas(event.clientX, event.clientY)) {
      pickComponentAtPoint(event.clientX, event.clientY);
    }
  }

  function pickComponentAtPoint(clientX, clientY) {
    const hit = edgeHitTest(clientX, clientY, DRAW_START_EDGE_RATIO);
    const report = analyze();
    const component = hit ? componentAtEdgeHit(hit, report) : null;
    state.pickedComponent = component;
    state.pickHoverHit = hit ? pickHoverHitFromEdgeHit(hit, component) : null;
    updateReport(false);
  }

  function componentAtEdgeHit(hit, report) {
    if (!hit || !report || !report.arcComponents) return null;
    const tile = normalizeTile(state.tiles[hit.index]);
    const pairIndex = tile.findIndex((pair) => pair[0] === hit.dir || pair[1] === hit.dir);
    if (pairIndex < 0) return null;
    const component = report.arcComponents[hit.index]
      ? report.arcComponents[hit.index][pairIndex]
      : null;
    return Number.isInteger(component) && component >= 0 ? component : null;
  }

  function applyPickedComponent() {
    if (state.pickedComponent == null) return;
    const report = analyze();
    const keepComponent = state.pickedComponent;
    let changed = false;

    state.tiles = state.tiles.map((tile, tileIndex) => {
      const arcs = normalizeTile(tile);
      if (!arcs.length) {
        if (tile != null) changed = true;
        return null;
      }
      const components = report.arcComponents[tileIndex] || [];
      const kept = arcs.filter((_, arcIndex) => components[arcIndex] === keepComponent);
      if (kept.length === arcs.length) return cloneTile(tile);
      changed = true;
      return kept.length ? kept.map((pair) => pair.slice(0, 2)) : null;
    });

    state.pickedComponent = null;
    state.pickHoverHit = null;
    if (changed) state.edits += 1;
    updateReport(false);
  }

  function updatePickHoverFromPoint(clientX, clientY, redraw = true) {
    if (state.inputMode !== 'pick') return false;
    const hit = edgeHitTest(clientX, clientY, DRAW_START_EDGE_RATIO);
    const report = analyze();
    const component = hit ? componentAtEdgeHit(hit, report) : null;
    return setPickHoverHit(hit ? pickHoverHitFromEdgeHit(hit, component) : null, redraw);
  }

  function pickHoverHitFromEdgeHit(hit, component) {
    return {
      index: hit.index,
      dir: hit.dir,
      component,
      offset: { x: hit.offset.x, y: hit.offset.y }
    };
  }

  function setPickHoverHit(hit, redraw = true) {
    const next = hit
      ? {
        index: hit.index,
        dir: hit.dir,
        component: hit.component,
        offset: { x: hit.offset.x, y: hit.offset.y }
      }
      : null;
    if (samePickHoverHit(state.pickHoverHit, next)) return false;
    state.pickHoverHit = next;
    if (redraw) draw(analyze());
    return true;
  }

  function clearPickHoverHit(redraw = true) {
    if (!state.pickHoverHit) return false;
    state.pickHoverHit = null;
    if (redraw) draw(analyze());
    return true;
  }

  function samePickHoverHit(left, right) {
    if (!left || !right) return left === right;
    return left.index === right.index
      && left.dir === right.dir
      && left.component === right.component
      && Math.abs(left.offset.x - right.offset.x) < 0.001
      && Math.abs(left.offset.y - right.offset.y) < 0.001;
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

    if (state.inputMode === 'draw') {
      beginDrawGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode === 'pick') {
      beginPickGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode !== 'drag') {
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

    if (drawState && event.pointerId === drawState.pointerId) {
      if (pointerState && event.pointerId === pointerState.id) {
        const dx = event.clientX - pointerState.x;
        const dy = event.clientY - pointerState.y;
        if (Math.hypot(dx, dy) > 10) pointerState.moved = true;
      }
      updateDrawGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode === 'pick') {
      updatePickGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode !== 'drag') return;

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
    if (drawState && event.pointerId === drawState.pointerId) {
      const handledClick = handleDrawClick(event);
      finishDrawGesture(event);
      clearPointerState(event);
      if (handledClick) return;
      return;
    }
    if (state.inputMode === 'pick') {
      finishPickGesture(event);
      clearPointerState(event);
      return;
    }
    if (state.inputMode !== 'drag') {
      clearPointerState(event);
      return;
    }
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
    const parent = [];
    const rank = [];
    const portIds = new Map();
    const portMeta = [];
    const arcPortIds = Array.from({ length: total }, () => []);
    let openEnds = 0;
    let alignedEdges = 0;
    let edgeCount = 0;

    const portKey = (index, dir) => `${index}:${dir}`;
    const ensurePort = (index, dir) => {
      const key = portKey(index, dir);
      if (portIds.has(key)) return portIds.get(key);
      const id = parent.length;
      portIds.set(key, id);
      parent[id] = id;
      rank[id] = 0;
      portMeta[id] = { index, dir };
      return id;
    };
    const connectPorts = (left, right) => {
      edgeCount += 1;
      union(parent, rank, left, right);
    };

    for (let index = 0; index < total; index += 1) {
      normalizeTile(state.tiles[index]).forEach((pair, pairIndex) => {
        const left = ensurePort(index, pair[0]);
        const right = ensurePort(index, pair[1]);
        arcPortIds[index][pairIndex] = left;
        connectPorts(left, right);
      });
    }

    portMeta.forEach((port, id) => {
      const row = Math.floor(port.index / state.cols);
      const col = port.index % state.cols;
      const next = neighbor(row, col, port.dir, state.rows, state.cols, lattice, state.wrapped);
      if (!next) {
        openEnds += 1;
        return;
      }
      const nextIndex = indexOf(next.row, next.col, state.cols);
      const opposite = lattice.opposite[port.dir];
      const nextId = portIds.get(portKey(nextIndex, opposite));
      if (nextId == null) {
        openEnds += 1;
        return;
      }
      if (id < nextId) {
        alignedEdges += 1;
        connectPorts(id, nextId);
      }
    });

    const roots = parent.map((_, index) => find(parent, index));
    const rootToComponent = new Map();
    roots.forEach((root) => {
      if (!rootToComponent.has(root)) rootToComponent.set(root, rootToComponent.size);
    });
    const components = rootToComponent.size;
    const cycles = Math.max(0, edgeCount - parent.length + components);
    const arcComponents = arcPortIds.map((tilePorts) => (
      tilePorts.map((portId) => rootToComponent.get(find(parent, portId)) ?? -1)
    ));

    let label = active === 0 ? 'empty' : 'editing';
    let message = active === 0 ? 'empty canvas' : `${openEnds} open end${openEnds === 1 ? '' : 's'}`;

    if (active > 0 && openEnds === 0) {
      label = 'closed';
      message = cycles > 0 ? `${cycles} cycle${cycles === 1 ? '' : 's'}` : 'closed line work';
    } else if (components > 1) {
      message = `${components} component${components === 1 ? '' : 's'}, ${openEnds} open end${openEnds === 1 ? '' : 's'}`;
    }

    return {
      total,
      active,
      alignedEdges,
      openEnds,
      components,
      cycles,
      label,
      message,
      arcComponents
    };
  }

  function updateReport(manualCheck) {
    const report = analyze();
    normalizePickedComponent(report);
    refs.out.tiles.textContent = `${report.active}/${report.total}`;
    refs.out.openEnds.textContent = String(report.openEnds);
    refs.out.components.textContent = String(report.components);

    refs.statusBadge.textContent = report.label;
    refs.statusBadge.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusBadge.classList.toggle('mosaic-status-bad', report.openEnds > 0);
    refs.statusLine.textContent = manualCheck ? `checked: ${report.message}` : report.message;
    refs.statusLine.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusLine.classList.toggle('mosaic-status-bad', report.openEnds > 0);
    refs.infoLine.textContent = `${getLattice().label}, ${state.wrapped ? 'wrapped' : 'open'} · ${report.active} filled`;

    updatePickControls();
    updateKnotCard(report);
    refreshExport();
    draw(report);
  }

  function normalizePickedComponent(report) {
    if (state.pickedComponent == null) return;
    const hasComponent = report.arcComponents.some((components) => (
      components.some((component) => component === state.pickedComponent)
    ));
    if (!hasComponent) state.pickedComponent = null;
  }

  function updatePickControls() {
    if (!refs.applyPick) return;
    refs.applyPick.disabled = state.inputMode !== 'pick' || state.pickedComponent == null;
  }

  function updateKnotCard(report) {
    if (!refs.knotStatus || !refs.knotName || !refs.knotLink) return;
    const summary = identifyKnot(report);
    refs.knotStatus.textContent = summary.status;
    if (refs.knotMethodResult) refs.knotMethodResult.textContent = summary.methodResult || 'not run';
    refs.knotName.textContent = summary.name || '-';
    if (refs.knotPd) refs.knotPd.value = summary.pd || '-';
    if (refs.knotDt) refs.knotDt.value = summary.dt || '-';
    refs.knotStatus.classList.toggle('mosaic-status-good', summary.tone === 'good');
    refs.knotStatus.classList.toggle('mosaic-status-bad', summary.tone === 'bad');
    if (refs.knotMethodResult) {
      refs.knotMethodResult.classList.toggle('mosaic-status-good', summary.tone === 'good');
      refs.knotMethodResult.classList.toggle('mosaic-status-bad', summary.tone === 'bad');
    }
    refs.knotName.classList.toggle('mosaic-status-good', summary.tone === 'good');
    refs.knotName.classList.toggle('mosaic-status-bad', summary.tone === 'bad');
    refs.knotLink.hidden = !summary.href;
    if (summary.href) {
      refs.knotLink.href = summary.href;
      refs.knotLink.textContent = summary.linkText;
    }
  }

  function identifyKnot(report) {
    if (!report || report.active === 0) {
      return {
        status: 'empty canvas',
        methodResult: 'not run',
        name: '',
        pd: '',
        dt: '',
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }
    if (report.openEnds > 0 || report.components !== 1) {
      return {
        status: 'not a knot',
        methodResult: 'not run',
        name: `${report.components} components, ${report.openEnds} open ends`,
        pd: '',
        dt: '',
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }
    if (state.wrapped) {
      return {
        status: 'wrapped knot candidate',
        methodResult: 'not run',
        name: 'further exploration remains experimental',
        pd: '',
        dt: '',
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }

    const engine = window.MosaicKnotEngine;
    if (!engine || typeof engine.identify !== 'function') {
      return {
        status: 'engine unavailable',
        methodResult: 'not run',
        name: 'mosaic_knot_engine.js did not load',
        pd: '',
        dt: '',
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }

    const result = engine.identify({
      rows: state.rows,
      cols: state.cols,
      lattice: state.lattice,
      wrapped: state.wrapped,
      method: state.knotMethod,
      tiles: state.tiles.map((tile) => normalizeTile(tile).map((pair) => pair.slice(0, 2)))
    });

    return {
      status: result.status || 'PD/DT generated',
      methodResult: result.methodResult || 'no match',
      name: result.name || '',
      pd: result.pd || '',
      dt: result.dt || '',
      href: result.href || '',
      linkText: result.linkText || 'more data',
      tone: result.tone || (result.name ? 'good' : 'bad')
    };
  }

  function countMosaicCrossings() {
    return state.tiles.reduce((total, tile) => total + countTileCrossings(tile), 0);
  }

  function countTileCrossings(tile) {
    const arcs = normalizeTile(tile);
    const sides = getLattice().sides;
    let count = 0;
    for (let left = 0; left < arcs.length; left += 1) {
      for (let right = left + 1; right < arcs.length; right += 1) {
        if (pairsCrossInTile(arcs[left], arcs[right], sides)) count += 1;
      }
    }
    return count;
  }

  function pairsCrossInTile(left, right, sides) {
    if (left[0] === right[0] || left[0] === right[1] || left[1] === right[0] || left[1] === right[1]) {
      return false;
    }
    const rightStartInside = dirBetweenCyclic(right[0], left[0], left[1], sides);
    const rightEndInside = dirBetweenCyclic(right[1], left[0], left[1], sides);
    return rightStartInside !== rightEndInside;
  }

  function dirBetweenCyclic(dir, start, end, sides) {
    const span = modulo(end - start, sides);
    const offset = modulo(dir - start, sides);
    return offset > 0 && offset < span;
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
      periodB = { x: state.rows * hexWidth / 2, y: state.rows * 1.5 * radius };
      for (let row = 0; row < state.rows; row += 1) {
        for (let col = 0; col < state.cols; col += 1) {
          const axial = offsetToAxial(row, col);
          cells[indexOf(row, col, state.cols)] = {
            row,
            col,
            q: axial.q,
            r: axial.r,
            x: margin + (hexWidth / 2) + (hexWidth * (axial.q + (axial.r / 2))),
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
      drawDrawDebugOverlay(ctx, palette, report);
      drawPickHoverOverlay(ctx, palette, report);
      ctx.restore();
      drawDragGhost(ctx, palette);
      return;
    }

    drawBoardCopy(ctx, report, palette, { x: 0, y: 0 });
    drawDrawDebugOverlay(ctx, palette, report);
    drawPickHoverOverlay(ctx, palette, report);
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

  function drawPickHoverOverlay(ctx, palette, report) {
    if (state.inputMode !== 'pick' || !state.pickHoverHit) return;
    const hit = state.pickHoverHit;
    const cell = geometry.cells[hit.index];
    if (!cell) return;

    const radius = geometry.radius;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const markers = [{ x: tile.x, y: tile.y, dir: hit.dir }];
    const neighborMarker = matchingNeighborEdgeMarker(hit);
    if (neighborMarker) markers.push(neighborMarker);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    markers.forEach((marker) => {
      drawPickEdgeMarker(ctx, marker.x, marker.y, marker.dir, radius, palette.accent, 2);
    });
    ctx.restore();
  }

  function matchingNeighborEdgeMarker(hit) {
    const lattice = getLattice();
    const cell = geometry.cells[hit.index];
    if (!cell) return null;
    const next = neighbor(cell.row, cell.col, hit.dir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    const opposite = lattice.opposite[hit.dir];
    const nextOffset = drawContinuationOffset({
      index: hit.index,
      offset: hit.offset
    }, hit.dir, nextIndex);
    const nextCell = geometry.cells[nextIndex];
    if (!nextCell) return null;
    return {
      x: nextCell.x + nextOffset.x,
      y: nextCell.y + nextOffset.y,
      dir: opposite
    };
  }

  function drawPickEdgeMarker(ctx, x, y, dir, radius, color, width) {
    const segment = edgeSegmentPoints(x, y, dir, radius * 0.96);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  function drawDrawDebugOverlay(ctx, palette, report) {
    if (state.inputMode !== 'draw' || state.drawStyle === 'none' || !state.drawDebugHit) return;
    if (state.drawStyle === 'shade' && drawState && drawState.current) {
      drawDrawShadeOverlay(ctx, palette, report, state.drawDebugHit);
    }
    drawDrawDebugEdgeOverlay(ctx, palette, state.drawDebugHit);
  }

  function drawDrawDebugEdgeOverlay(ctx, palette, hit) {
    const cell = geometry.cells[hit.index];
    if (!cell) return;

    const lattice = getLattice();
    const radius = geometry.radius;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const edge = edgePoint(tile.x, tile.y, hit.dir, edgeConnectionDistance(radius));
    const label = `T${hit.index + 1} (${cell.row + 1},${cell.col + 1})  E ${lattice.dirNames[hit.dir]}`;
    const markers = [{ x: tile.x, y: tile.y, dir: hit.dir }];
    const neighborMarker = matchingNeighborEdgeMarker(hit);
    if (neighborMarker) markers.push(neighborMarker);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    markers.forEach((marker, markerIndex) => {
      drawPickEdgeMarker(
        ctx,
        marker.x,
        marker.y,
        marker.dir,
        radius,
        palette.accent,
        markerIndex === 0 ? Math.max(2.4, radius * 0.075) : Math.max(1.8, radius * 0.055)
      );
    });

    if (state.drawStyle !== 'debug') {
      ctx.restore();
      return;
    }
    ctx.strokeStyle = palette.accent2;
    if (ctx.setLineDash) ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tile.x, tile.y);
    ctx.lineTo(edge.x, edge.y);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);

    ctx.fillStyle = palette.accent2;
    circle(ctx, edge.x, edge.y, Math.max(3.5, radius * 0.09));

    ctx.font = `${Math.max(10, radius * 0.24)}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const metrics = ctx.measureText ? ctx.measureText(label) : null;
    const labelWidth = metrics && Number.isFinite(metrics.width) ? metrics.width : label.length * 7;
    const boxX = tile.x - labelWidth / 2 - 5;
    const boxY = tile.y - radius * 0.23 - 10;
    const boxHeight = Math.max(18, radius * 0.32);
    ctx.fillStyle = 'rgba(255,253,248,0.92)';
    ctx.strokeStyle = palette.accent2;
    ctx.lineWidth = 1;
    ctx.fillRect(boxX, boxY, labelWidth + 10, boxHeight);
    ctx.strokeRect(boxX, boxY, labelWidth + 10, boxHeight);
    ctx.fillStyle = palette.text;
    ctx.fillText(label, boxX + 5, boxY + boxHeight / 2);
    ctx.restore();
  }

  function drawDrawShadeOverlay(ctx, palette, report, hit) {
    const cell = geometry.cells[hit.index];
    if (!cell || !hit.point) return;

    const radius = geometry.radius;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const edge = edgePoint(tile.x, tile.y, hit.dir, edgeConnectionDistance(radius));
    const pointer = hit.point;
    const distance = Math.hypot(pointer.x - edge.x, pointer.y - edge.y);
    if (!Number.isFinite(distance) || distance < 1.5) return;

    const color = drawShadeColor(hit, report, palette);
    const pipeWidth = Math.max(5, radius * 0.17);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = pipeWidth * 2.4;
    drawPerpendicularShadePath(ctx, edge, pointer, hit.dir, radius);
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.lineWidth = pipeWidth * 0.82;
    drawPerpendicularShadePath(ctx, edge, pointer, hit.dir, radius);
    ctx.stroke();
    ctx.restore();
  }

  function drawShadeColor(hit, report, palette) {
    const tile = normalizeTile(state.tiles[hit.index]);
    const pairIndex = tile.findIndex((pair) => pair[0] === hit.dir || pair[1] === hit.dir);
    if (pairIndex < 0) return palette.accent;

    const theme = getMosaicTheme(palette);
    if (state.colorComponents && report && report.arcComponents && report.arcComponents[hit.index]) {
      return componentPipeColor(report.arcComponents[hit.index][pairIndex], theme);
    }
    return theme.pipe;
  }

  function drawPerpendicularShadePath(ctx, start, end, dir, radius) {
    const angle = getLattice().angles[dir];
    const baseTangent = { x: Math.cos(angle), y: Math.sin(angle) };
    const normal = { x: -baseTangent.y, y: baseTangent.x };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distanceSq = (dx * dx) + (dy * dy);
    const normalProjection = (dx * normal.x) + (dy * normal.y);

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    if (distanceSq < 0.001 || Math.abs(normalProjection) < 0.001) {
      const distance = Math.sqrt(distanceSq);
      const controlDistance = Math.max(radius * 0.28, distance * 0.45);
      const tangentSign = ((dx * baseTangent.x) + (dy * baseTangent.y)) < 0 ? -1 : 1;
      ctx.quadraticCurveTo(
        start.x + (baseTangent.x * tangentSign * controlDistance),
        start.y + (baseTangent.y * tangentSign * controlDistance),
        end.x,
        end.y
      );
      return;
    }

    const signedRadius = distanceSq / (2 * normalProjection);
    const center = {
      x: start.x + (normal.x * signedRadius),
      y: start.y + (normal.y * signedRadius)
    };
    const arcRadius = Math.abs(signedRadius);
    if (!Number.isFinite(arcRadius) || arcRadius < 0.001 || arcRadius > radius * 12) {
      const distance = Math.sqrt(distanceSq);
      const controlDistance = Math.max(radius * 0.28, distance * 0.45);
      const tangentSign = ((dx * baseTangent.x) + (dy * baseTangent.y)) < 0 ? -1 : 1;
      ctx.quadraticCurveTo(
        start.x + (baseTangent.x * tangentSign * controlDistance),
        start.y + (baseTangent.y * tangentSign * controlDistance),
        end.x,
        end.y
      );
      return;
    }

    const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
    const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
    const clockwise = moduloAngle(endAngle - startAngle);
    const anticlockwise = moduloAngle(startAngle - endAngle);
    ctx.arc(center.x, center.y, arcRadius, startAngle, endAngle, anticlockwise < clockwise);
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
    const arcComponents = !isDragTarget && report.arcComponents
      ? report.arcComponents[index]
      : null;
    const isHover = state.inputMode === 'drag' && index === state.hoverIndex;

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

    drawPipe(ctx, cell, displayTile, palette, null, arcComponents);

    if (state.showErrors && !isDragTarget) drawOpenEndMarks(ctx, index, cell, mask, palette);
    if (state.showCoords) drawCellLabel(ctx, cell, palette);
  }

  function drawPipe(ctx, cell, tile, palette, radiusOverride = null, arcComponents = null) {
    const radius = radiusOverride || geometry.radius;
    const arcs = normalizeTile(tile);
    if (!arcs.length) return;
    const theme = getMosaicTheme(palette);
    const pipeWidth = Math.max(5, radius * 0.17);

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    arcs.forEach((pair, index) => {
      const componentIndex = arcComponents ? arcComponents[index] : null;
      const strokeScale = componentStrokeScale(componentIndex);
      const currentPipeWidth = pipeWidth * strokeScale;
      const currentGapWidth = currentPipeWidth + Math.max(4, radius * 0.09);
      if (index > 0) {
        ctx.strokeStyle = '#fffdf8';
        ctx.lineWidth = currentGapWidth;
        drawArcPath(ctx, cell, pair, radius);
      }
      const pipeColor = componentPipeColor(componentIndex, theme);
      ctx.strokeStyle = pipeColor;
      ctx.fillStyle = pipeColor;
      ctx.lineWidth = currentPipeWidth;
      drawArcPath(ctx, cell, pair, radius);
    });
    ctx.restore();
  }

  function componentStrokeScale(componentIndex) {
    if (state.inputMode !== 'pick' || state.pickedComponent == null || componentIndex == null || componentIndex < 0) {
      return 1;
    }
    return componentIndex === state.pickedComponent ? 1.22 : 0.34;
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

  function componentPipeColor(componentIndex, theme) {
    if (!state.colorComponents || componentIndex == null || componentIndex < 0) return theme.pipe;
    if (componentIndex < COMPONENT_COLOR_PALETTE.length) return COMPONENT_COLOR_PALETTE[componentIndex];
    const generatedIndex = componentIndex - COMPONENT_COLOR_PALETTE.length;
    while (state.componentColors.length <= generatedIndex) {
      state.componentColors.push(randomComponentColor());
    }
    return state.componentColors[generatedIndex];
  }

  function randomComponentColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 62 + Math.floor(Math.random() * 22);
    const lightness = 32 + Math.floor(Math.random() * 16);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

  function edgeHitTest(clientX, clientY, minDistanceRatio = 0.42) {
    if (!geometry) return null;
    return edgeHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY), minDistanceRatio);
  }

  function updateDrawDebugFromPoint(clientX, clientY, redraw = true) {
    if (state.inputMode !== 'draw' || state.drawStyle === 'none') return false;
    const hit = edgeHitTest(clientX, clientY, 0);
    if (hit) hit.point = clientPointToBoardPoint(clientX, clientY);
    return setDrawDebugHit(hit, redraw);
  }

  function updateDrawShadeFromCurrent(clientX, clientY, redraw = true) {
    if (!drawState || !drawState.current) return false;
    return setDrawDebugHit({
      index: drawState.current.index,
      dir: drawState.current.entryDir,
      offset: { x: drawState.current.offset.x, y: drawState.current.offset.y },
      point: clientPointToBoardPoint(clientX, clientY)
    }, redraw);
  }

  function setDrawDebugHit(hit, redraw = true) {
    if (state.inputMode !== 'draw' || state.drawStyle === 'none') return false;
    const next = hit
      ? {
        index: hit.index,
        dir: hit.dir,
        offset: { x: hit.offset.x, y: hit.offset.y },
        point: hit.point ? { x: hit.point.x, y: hit.point.y } : null
      }
      : null;
    if (sameDrawDebugHit(state.drawDebugHit, next)) return false;
    state.drawDebugHit = next;
    if (redraw) draw(analyze());
    return true;
  }

  function clearDrawDebugHit(redraw = true) {
    if (!state.drawDebugHit) return false;
    state.drawDebugHit = null;
    if (redraw) draw(analyze());
    return true;
  }

  function sameDrawDebugHit(left, right) {
    if (!left || !right) return left === right;
    return left.index === right.index
      && left.dir === right.dir
      && Math.abs(left.offset.x - right.offset.x) < 0.001
      && Math.abs(left.offset.y - right.offset.y) < 0.001
      && sameOptionalPoint(left.point, right.point);
  }

  function sameOptionalPoint(left, right) {
    if (!left || !right) return left === right;
    return Math.abs(left.x - right.x) < 0.001
      && Math.abs(left.y - right.y) < 0.001;
  }

  function edgeHitAtBoardPoint(point, minDistanceRatio = 0.42) {
    const hit = tileHitAtBoardPoint(point, 1.02);
    if (!hit) return null;
    const dx = hit.local.x - hit.cell.x;
    const dy = hit.local.y - hit.cell.y;
    if (Math.hypot(dx, dy) < geometry.radius * minDistanceRatio) return null;
    const dir = nearestDirectionFromVector(dx, dy);
    if (dir < 0) return null;
    return {
      index: hit.index,
      dir,
      offset: hit.offset
    };
  }

  function drawExitDirection(clientX, clientY, tileState) {
    return drawExitDirectionFromPoint(clientPointToBoardPoint(clientX, clientY), tileState);
  }

  function drawBacktrackDirection(clientX, clientY, tileState) {
    return drawExitDirectionFromPoint(
      clientPointToBoardPoint(clientX, clientY),
      tileState,
      DRAW_BACKTRACK_EDGE_RATIO
    );
  }

  function drawExitDirectionFromPoint(point, tileState, edgeRatio = DRAW_EXIT_EDGE_RATIO) {
    const cell = geometry.cells[tileState.index];
    if (!cell) return null;
    const local = {
      x: point.x - tileState.offset.x,
      y: point.y - tileState.offset.y
    };
    const dx = local.x - cell.x;
    const dy = local.y - cell.y;
    const dir = nearestDirectionFromVector(dx, dy);
    if (dir < 0) return null;

    const lattice = getLattice();
    const projection = (dx * Math.cos(lattice.angles[dir])) + (dy * Math.sin(lattice.angles[dir]));
    if (projection < edgeConnectionDistance(geometry.radius) * edgeRatio) return null;
    return dir;
  }

  function nextDrawEntry(tileState, exitDir) {
    const lattice = getLattice();
    const cell = geometry.cells[tileState.index];
    if (!cell) return null;
    const next = neighbor(cell.row, cell.col, exitDir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return null;
    const index = indexOf(next.row, next.col, state.cols);
    return {
      index,
      dir: lattice.opposite[exitDir],
      offset: drawContinuationOffset(tileState, exitDir, index)
    };
  }

  function drawContinuationOffset(tileState, exitDir, nextIndex) {
    const cell = geometry.cells[tileState.index];
    const nextCell = geometry.cells[nextIndex];
    if (!cell || !nextCell) return { x: 0, y: 0 };
    const angle = getLattice().angles[exitDir];
    const distance = 2 * edgeConnectionDistance(geometry.radius);
    const expectedNextCenter = {
      x: cell.x + tileState.offset.x + (Math.cos(angle) * distance),
      y: cell.y + tileState.offset.y + (Math.sin(angle) * distance)
    };
    return snapDrawOffset({
      x: expectedNextCenter.x - nextCell.x,
      y: expectedNextCenter.y - nextCell.y
    });
  }

  function snapDrawOffset(offset) {
    if (!state.wrapped || !geometry) {
      return {
        x: Math.abs(offset.x) < 0.001 ? 0 : offset.x,
        y: Math.abs(offset.y) < 0.001 ? 0 : offset.y
      };
    }
    const a = geometry.periodA;
    const b = geometry.periodB;
    const det = (a.x * b.y) - (a.y * b.x);
    if (Math.abs(det) < 0.0001) return offset;
    const u = ((offset.x * b.y) - (offset.y * b.x)) / det;
    const v = ((a.x * offset.y) - (a.y * offset.x)) / det;
    const snapped = copyOffset(Math.round(u), Math.round(v));
    if (Math.hypot(offset.x - snapped.x, offset.y - snapped.y) < 0.75) return snapped;
    return offset;
  }

  function tileHitAtBoardPoint(point, radiusScale = 0.96) {
    const offsets = state.wrapped ? getBoardCopyOffsets() : [{ x: 0, y: 0 }];
    for (const offset of offsets) {
      const local = {
        x: point.x - offset.x,
        y: point.y - offset.y
      };
      for (let index = 0; index < geometry.cells.length; index += 1) {
        const cell = geometry.cells[index];
        if (!cell) continue;
        const radius = geometry.radius * radiusScale;
        if (Math.abs(local.x - cell.x) > radius || Math.abs(local.y - cell.y) > radius) continue;
        if (pointInPolygon(local, tilePoints(cell.x, cell.y, radius))) {
          return { index, cell, offset, local };
        }
      }
    }
    return null;
  }

  function nearestDirectionFromVector(dx, dy) {
    if (Math.hypot(dx, dy) < 0.0001) return -1;
    const lattice = getLattice();
    const angle = Math.atan2(dy, dx);
    return lattice.angles.reduce((best, dirAngle, dir) => {
      const delta = Math.abs(Math.atan2(Math.sin(angle - dirAngle), Math.cos(angle - dirAngle)));
      return delta < best.delta ? { dir, delta } : best;
    }, { dir: -1, delta: Infinity }).dir;
  }

  function clientPointToBoardPoint(clientX, clientY) {
    const point = clientPointToLogical(clientX, clientY);
    return state.wrapped ? screenPointToWorld(point) : point;
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
      inputMode: state.inputMode,
      clickMode: state.editMode,
      drawLayer: state.drawLayer,
      drawStyle: state.drawStyle,
      knotMethod: state.knotMethod,
      display: {
        showOpenEnds: state.showErrors,
        showCoords: state.showCoords,
        colorComponents: state.colorComponents,
        drawStyle: state.drawStyle,
        drawDebug: state.drawStyle === 'debug',
        knotMethod: state.knotMethod
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
          arcs: normalizeTile(tile).map((pair) => pair.slice(0, 2).map((dir) => lattice.dirNames[dir]))
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
    refs.inputMode.value = state.inputMode;
    refs.latticeSelect.value = latticeName;
    refs.wrapBoard.checked = wrapped;
    refs.editMode.value = state.editMode;
    refs.drawLayer.value = state.drawLayer;
    refs.drawStyle.value = state.drawStyle;
    refs.knotMethod.value = state.knotMethod;
    refs.colorComponents.checked = state.colorComponents;
    refs.wrappedViewMode.value = state.wrappedViewMode;
    updateInputModePanels();
    updateDisplayControls();
    updatePickControls();
  }

  function updateInputModePanels() {
    refs.inputPanels.forEach((panel) => {
      const modes = (panel.dataset.inputPanel || '').split(/\s+/);
      panel.hidden = !modes.includes(state.inputMode);
    });
  }

  function updateDisplayControls() {
    if (!refs.wrappedViewRow) return;
    refs.wrappedViewRow.hidden = !state.wrapped;
    refs.wrappedViewMode.disabled = !state.wrapped;
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

    preferredTileRepresentatives(lattice).forEach((tile) => {
      const canonical = canonicalTile(tile, lattice.sides);
      tilesByKey.set(tileKey(canonical), tileFromPairs(tile));
    });

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

  function preferredTileRepresentatives(lattice) {
    if (lattice.shape !== 'hex') return [];
    return [
      [[0, 2], [3, 4]]
    ];
  }

  function canonicalTile(tile, sides) {
    let best = null;
    let bestKey = '';
    for (let shift = 0; shift < sides; shift += 1) {
      const candidate = tile.map((pair) => normalizePair([
        modulo(pair[0] + shift, sides),
        modulo(pair[1] + shift, sides)
      ])).sort(comparePairs);
      const key = tileKey(candidate);
      if (!best || key < bestKey) {
        best = candidate;
        bestKey = key;
      }
    }
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

  function normalizeEditMode(mode) {
    return mode === 'reorder' ? 'reorder' : 'rotate';
  }

  function normalizeInputMode(mode) {
    return ['draw', 'drag', 'pick', 'import'].includes(mode) ? mode : 'draw';
  }

  function normalizeDrawLayer(layer) {
    return layer === 'below' ? 'below' : 'above';
  }

  function normalizeDrawStyle(style) {
    return ['none', 'debug', 'shade'].includes(style) ? style : 'shade';
  }

  function normalizeKnotMethod(method) {
    return ['hybrid', 'invariants', 'dt'].includes(method) ? method : 'hybrid';
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
    if (lattice.shape === 'hex') return hexNeighbor(row, col, dir, rows, cols, wrapped);

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

  function hexNeighbor(row, col, dir, rows, cols, wrapped) {
    const axial = offsetToAxial(row, col);
    const delta = HEX_AXIAL_DELTAS[dir];
    let nextQ = axial.q + delta[0];
    let nextR = axial.r + delta[1];
    if (wrapped) {
      nextQ = modulo(nextQ, cols);
      nextR = modulo(nextR, rows);
      return axialToOffset(nextQ, nextR, cols);
    }

    const nextRow = nextR;
    const nextCol = nextQ + Math.floor(nextR / 2);
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
    return { row: nextRow, col: nextCol };
  }

  function offsetToAxial(row, col) {
    return {
      q: col - Math.floor(row / 2),
      r: row
    };
  }

  function axialToOffset(q, r, cols) {
    return {
      row: r,
      col: modulo(q + Math.floor(r / 2), cols)
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

  function edgeSegmentPoints(x, y, dir, radius) {
    const lattice = getLattice();
    const points = tilePoints(x, y, radius);
    if (lattice.shape === 'square') {
      const start = points[(dir + 1) % lattice.sides];
      const end = points[(dir + 2) % lattice.sides];
      return { start, end };
    }
    return {
      start: points[modulo(dir - 1, lattice.sides)],
      end: points[dir]
    };
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
