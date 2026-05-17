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
  const DEFAULT_RIEMANN_NODE_RADII = [1.1, 0.5, 0.47, 0.43, 0.39, 0.35, 0.35];
  const DEFAULT_RIEMANN_NODE_POSITIONS = [0, 0.12, 0.24, 0.36, 0.48, 0.84, 1];
  const RIEMANN_LOOP_FINAL_INDEX = 22;
  const RIEMANN_LOOP_PASS_INDEX = RIEMANN_LOOP_FINAL_INDEX - 1;
  const DEFAULT_RIEMANN_LOOP_NODE_POSITIONS = Array.from({ length: RIEMANN_LOOP_FINAL_INDEX + 1 }, (_, index) => (
    index >= RIEMANN_LOOP_PASS_INDEX ? 1 : Math.max(index * 0.02, 1 - ((RIEMANN_LOOP_PASS_INDEX - index) * 0.1))
  ));
  const DEFAULT_RIEMANN_LOOP_TANGENT_SCALE = 0.4;
  const RIEMANN_LOOP_NODE_POSITION_GAP = 0.01;
  const DRAW_START_EDGE_RATIO = 0.42;
  const DRAW_EXIT_EDGE_RATIO = 0.94;
  const DRAW_BACKTRACK_EDGE_RATIO = 1.03;
  const PICK_UNCONNECTED_LIFT_ALPHA = 0.32;
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
    diagramType: 'link',
    wrapped: false,
    tiles: [],
    edits: 0,
    showErrors: true,
    showCoords: false,
    colorComponents: true,
    displayPick: false,
    componentColors: [],
    drawStyle: 'shade',
    drawAction: 'edge',
    knotCodeKind: 'pd',
    wrappedViewMode: 'periodic',
    viewScale: 1,
    viewX: 0,
    viewY: 0,
    inputMode: 'draw',
    displayPickInputLocked: false,
    displayPickReturnMode: 'draw',
    editMode: 'rotate',
    vertexDecorations: {},
    drawLayer: 'above',
    selectedTile: null,
    selectedPaletteId: '',
    drag: null,
    dragPoint: null,
    dragPreviewIndex: -1,
    pickedComponent: null,
    pickedAnchor: null,
    pickHoverHit: null,
    drawDebugHit: null,
    hoverIndex: -1,
    dualGraphLayout: null,
    dualGraphSimulation: null,
    dualGraphDragging: null,
    dualGraphAnimating: false,
    riemannSurfaceModel: null,
    selectedRiemannVertex: null,
    dualGraphInvariantsExpanded: true,
    riemannNodeRadii: DEFAULT_RIEMANN_NODE_RADII.slice(),
    riemannLoopNodePositions: DEFAULT_RIEMANN_LOOP_NODE_POSITIONS.slice(),
    riemannLoopTangentScale: DEFAULT_RIEMANN_LOOP_TANGENT_SCALE,
    showRiemannDebugCircles: false,
    showRiemannBezierCurve: false,
    showDualGraphCanvas: false,
    showRiemannSurfaceCanvas: false
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
  let decorationClickTimer = null;

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
    refs.diagramType = document.getElementById('diagram-type');
    refs.inputMode = document.getElementById('input-mode');
    refs.inputDecorationOption = refs.inputMode
      ? refs.inputMode.querySelector('option[value="decoration"]')
      : null;
    refs.latticeSelect = document.getElementById('lattice-select');
    refs.wrapBoard = document.getElementById('wrap-board');
    refs.editMode = document.getElementById('edit-mode');
    refs.drawAction = document.getElementById('draw-action');
    refs.drawVertexOption = refs.drawAction
      ? refs.drawAction.querySelector('option[value="vertex"]')
      : null;
    refs.drawLayer = document.getElementById('draw-layer');
    refs.drawStyle = document.getElementById('draw-style');
    refs.applyPick = document.getElementById('apply-pick');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.colorComponents = document.getElementById('color-components');
    refs.displayPick = document.getElementById('display-pick');
    refs.wrappedViewRow = document.getElementById('wrapped-view-row');
    refs.wrappedViewMode = document.getElementById('wrapped-view-mode');
    refs.knotStatus = document.getElementById('knot-status');
    refs.knotCard = document.getElementById('knot-card');
    refs.knotNameRow = document.getElementById('knot-name-row');
    refs.knotName = document.getElementById('knot-name');
    refs.knotCodeRow = document.getElementById('knot-code-row');
    refs.knotCodeKind = document.getElementById('knot-code-kind');
    refs.knotCode = document.getElementById('knot-code');
    refs.dualGraphCard = document.getElementById('dual-graph-card');
    refs.dualGraphStatus = document.getElementById('dual-graph-status');
    refs.dualGraphInvariants = document.getElementById('dual-graph-invariants');
    refs.dualGraphInvariantToggle = document.getElementById('dual-graph-invariant-toggle');
    refs.dualGraphInvariantPanel = document.getElementById('dual-graph-invariant-panel');
    refs.dualGraphCanvas = document.getElementById('dual-graph-canvas');
    refs.dualGraphCanvasWrap = document.getElementById('dual-graph-canvas-wrap');
    refs.dualGraphViewWrap = document.getElementById('dual-graph-view-wrap');
    refs.dualGraphPlaceholder = document.getElementById('dual-graph-placeholder');
    refs.riemannSurfaceCanvas = document.getElementById('riemann-surface-canvas');
    refs.riemannSurfaceViewWrap = document.getElementById('riemann-surface-view-wrap');
    refs.dualGraphLayoutControls = document.getElementById('dual-graph-layout-controls');
    refs.computeLayout = document.getElementById('compute-layout');
    refs.resetLayout = document.getElementById('reset-layout');
    refs.exportDualGraph = document.getElementById('export-dual-graph');
    refs.showDualGraphCanvas = document.getElementById('show-dual-graph-canvas');
    refs.showRiemannSurfaceCanvas = document.getElementById('show-riemann-surface-canvas');
    refs.showRiemannDebugCircles = document.getElementById('show-riemann-debug-circles');
    refs.showRiemannBezierCurve = document.getElementById('show-riemann-bezier-curve');
    refs.riemannNodeRadiusInputs = Array.from(document.querySelectorAll('[data-riemann-node-radius]'));
    refs.riemannNodeRadiusOutputs = Array.from(document.querySelectorAll('[data-riemann-node-radius-value]'));
    refs.riemannNodePositionInputs = Array.from(document.querySelectorAll('[data-riemann-node-position]'));
    refs.riemannNodePositionOutputs = Array.from(document.querySelectorAll('[data-riemann-node-position-value]'));
    refs.riemannLoopTangentScaleInputs = Array.from(document.querySelectorAll('[data-riemann-loop-tangent-scale]'));
    refs.riemannLoopTangentScaleOutputs = Array.from(document.querySelectorAll('[data-riemann-loop-tangent-scale-value]'));
    refs.tilePalette = document.getElementById('tile-palette');
    refs.importInput = document.getElementById('import-input');
    refs.exportCard = document.getElementById('export-card');
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
    refs.diagramType.addEventListener('change', () => {
      setDiagramType(refs.diagramType.value);
    });
    refs.inputMode.addEventListener('change', () => {
      setInputMode(refs.inputMode.value);
    });
    refs.latticeSelect.addEventListener('change', () => generateFromControls());
    refs.wrapBoard.addEventListener('change', () => generateFromControls());
    refs.editMode.addEventListener('change', () => {
      state.editMode = normalizeEditMode(refs.editMode.value);
      refreshExport();
    });
    refs.drawAction.addEventListener('change', () => {
      state.drawAction = normalizeDrawAction(refs.drawAction.value);
      cancelDrawGesture(false);
      clearDrawDebugHit(false);
      state.hoverIndex = -1;
      updateDrawModeControls();
      updateReport(false);
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
    refs.displayPick.addEventListener('change', () => {
      state.displayPick = refs.displayPick.checked;
      if (!isPickDisplayActive()) state.pickHoverHit = null;
      if (state.displayPick) {
        beginDisplayPickCapture();
      } else {
        finishDisplayPickCapture(true);
      }
      refreshExport();
    });
    refs.wrappedViewMode.addEventListener('change', () => {
      state.wrappedViewMode = refs.wrappedViewMode.value === 'single' ? 'single' : 'periodic';
      normalizeViewOffset();
      updateReport(false);
    });
    refs.knotCodeKind.addEventListener('change', () => {
      state.knotCodeKind = normalizeKnotCodeKind(refs.knotCodeKind.value);
      updateKnotCard(analyze());
      refreshExport();
    });
    if (refs.computeLayout) {
      refs.computeLayout.addEventListener('click', () => {
        if (!state.dualGraphData || !isDualGraphVisualizationVisible()) return;
        ensureDualGraphLayout(state.dualGraphData);
        if (state.dualGraphAnimating) {
          state.dualGraphAnimating = false;
          refs.computeLayout.textContent = 'Compute layout';
        } else {
          state.dualGraphAnimating = true;
          refs.computeLayout.textContent = 'Stop';
          animateDualGraphLayout();
        }
      });
    }
    if (refs.resetLayout) {
      refs.resetLayout.addEventListener('click', () => {
        state.dualGraphAnimating = false;
        state.dualGraphDragging = null;
        state.dualGraphLayout = null;
        if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
        updateReport(false);
      });
    }
    if (refs.exportDualGraph) {
      refs.exportDualGraph.addEventListener('click', exportDualGraphFromVisualization);
    }
    if (refs.dualGraphInvariantToggle) {
      refs.dualGraphInvariantToggle.addEventListener('click', () => {
        state.dualGraphInvariantsExpanded = !state.dualGraphInvariantsExpanded;
        syncDualGraphInvariantVisibility();
      });
    }
    if (refs.showDualGraphCanvas) {
      refs.showDualGraphCanvas.addEventListener('change', () => {
        state.showDualGraphCanvas = refs.showDualGraphCanvas.checked;
        syncDualGraphCanvasVisibility();
        if (state.dualGraphData) renderVisibleDualGraphVisualizations(state.dualGraphData);
      });
    }
    if (refs.showRiemannSurfaceCanvas) {
      refs.showRiemannSurfaceCanvas.addEventListener('change', () => {
        state.showRiemannSurfaceCanvas = refs.showRiemannSurfaceCanvas.checked;
        syncDualGraphCanvasVisibility();
        if (state.dualGraphData) renderVisibleDualGraphVisualizations(state.dualGraphData);
      });
    }
    if (refs.riemannNodeRadiusInputs) {
      refs.riemannNodeRadiusInputs.forEach((input) => {
        input.addEventListener('input', () => {
          const index = Number(input.dataset.riemannNodeRadius);
          if (!Number.isInteger(index) || index < 0 || index >= DEFAULT_RIEMANN_NODE_RADII.length) return;
          state.riemannNodeRadii[index] = normalizeRiemannNodeRadiusInput(input.value, DEFAULT_RIEMANN_NODE_RADII[index]);
          syncRiemannNodeControls();
          if (state.dualGraphData && state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
        });
      });
    }
    if (refs.riemannNodePositionInputs) {
      refs.riemannNodePositionInputs.forEach((input) => {
        input.addEventListener('input', () => {
          const index = Number(input.dataset.riemannNodePosition);
          if (!Number.isInteger(index) || index <= 0 || index >= RIEMANN_LOOP_PASS_INDEX) return;
          state.riemannLoopNodePositions[index] = normalizeRiemannLoopNodePositionInput(input.value, DEFAULT_RIEMANN_LOOP_NODE_POSITIONS[index]);
          normalizeRiemannLoopNodePositions();
          syncRiemannNodeControls();
          if (state.dualGraphData && state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
        });
      });
    }
    if (refs.riemannLoopTangentScaleInputs) {
      refs.riemannLoopTangentScaleInputs.forEach((input) => {
        input.addEventListener('input', () => {
          state.riemannLoopTangentScale = normalizeRiemannLoopTangentScaleInput(Number(input.value) / 100);
          syncRiemannNodeControls();
          if (state.dualGraphData && state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
        });
      });
    }
    if (refs.showRiemannDebugCircles) {
      refs.showRiemannDebugCircles.addEventListener('change', () => {
        state.showRiemannDebugCircles = refs.showRiemannDebugCircles.checked;
        if (state.dualGraphData && state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
      });
    }
    if (refs.showRiemannBezierCurve) {
      refs.showRiemannBezierCurve.addEventListener('change', () => {
        state.showRiemannBezierCurve = refs.showRiemannBezierCurve.checked;
        if (state.dualGraphData && state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
      });
    }
    if (refs.riemannSurfaceCanvas) {
      refs.riemannSurfaceCanvas.addEventListener('click', handleRiemannSurfaceClick);
    }
    if (refs.dualGraphCanvas) {
      refs.dualGraphCanvas.addEventListener('mousedown', handleDualGraphMouseDown);
      refs.dualGraphCanvas.addEventListener('mousemove', handleDualGraphMouseMove);
      refs.dualGraphCanvas.addEventListener('mouseup', handleDualGraphMouseUp);
      refs.dualGraphCanvas.addEventListener('mouseleave', handleDualGraphMouseUp);
    }
    window.addEventListener('resize', debounce(() => {
      resizeCanvas();
      normalizeViewOffset();
      draw(analyze());
    }, 80));

    bindPalette();
  }

  function setInputMode(mode, options = {}) {
    state.inputMode = normalizeInputMode(mode);
    refs.inputMode.value = state.inputMode;
    clearDecorationClickTimer();
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    if (state.inputMode !== 'pick' && !state.displayPick && options.clearPick !== false) {
      state.pickedComponent = null;
      state.pickedAnchor = null;
    }
    clearEditorDrag();
    cancelDrawGesture();
    if (isTilingMode()) renderTilePalette();
    updateInputModePanels();
    updateDrawModeControls();
    updateInputModePanels();
    updateInputModeLock();
    updateReport(false);
  }

  function setDiagramType(type) {
    const nextType = normalizeDiagramType(type);
    if (nextType === state.diagramType) {
      syncAllInputs(state.rows, state.cols, state.lattice, state.wrapped);
      renderTilePalette();
      updateReport(false);
      return;
    }

    clearEditorDrag();
    cancelDrawGesture(false);
    clearDecorationClickTimer();

    // Check if switching from dual to link and there are vertex tiles
    if (state.diagramType === 'dual' && nextType === 'link') {
      const hasVertices = state.tiles.some(tile => isVertexTileValue(tile));
      if (hasVertices) {
        const confirmed = confirm('All the vertex tiles will be removed. Continue?');
        if (!confirmed) {
          // User cancelled, restore the select value
          refs.diagramType.value = state.diagramType;
          return;
        }
        // Remove only vertex tiles, preserve others
        state.tiles = state.tiles.map(tile => isVertexTileValue(tile) ? null : tile);
      }
    }

    state.diagramType = nextType;
    if (!isDualGraph()) {
      state.vertexDecorations = {};
      if (state.inputMode === 'decoration') state.inputMode = 'draw';
    }
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.componentColors = [];
    state.edits += 1;
    syncAllInputs(state.rows, state.cols, state.lattice, state.wrapped);
    renderTilePalette();
    updateReport(false);
  }

  function bindPalette() {
    renderTilePalette();
  }

  function renderTilePalette() {
    if (!refs.tilePalette) return;
    if (!isTilingMode()) return;
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
    if (!isTilingMode()) return;
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
    if (!isTilingMode()) return;
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
    refs.canvas.addEventListener('dblclick', handleVertexDecorationDoubleClick);
    refs.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (isDecorationMode()) {
        const hit = vertexDecorationHitTest(event.clientX, event.clientY);
        if (hit >= 0) changeVertexDecoration(hit, -1);
        return;
      }
      if (state.inputMode === 'draw') {
        const hit = hitTest(event.clientX, event.clientY);
        if (hit >= 0) {
          if (state.drawAction === 'edge' && isDualGraph()) {
            toggleVertexTileAtIndex(hit);
            updateReport(false);
          } else if (!isTileEmpty(state.tiles[hit])) {
            if (state.drawAction === 'edge') cycleTilePairs(hit);
            else applyDrawTileAction(hit, -1);
          }
        }
        return;
      }
      if (!isTilingMode()) return;
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
      if (isDecorationMode()) {
        const debugChanged = clearDrawDebugHit(false);
        const hit = vertexDecorationHitTest(event.clientX, event.clientY);
        if (hit !== state.hoverIndex || debugChanged) {
          state.hoverIndex = hit;
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'draw') {
        if (state.drawAction === 'edge') {
          const debugChanged = updateDrawDebugFromPoint(event.clientX, event.clientY, false);
          if (state.hoverIndex !== -1 || debugChanged) {
            state.hoverIndex = -1;
            draw(analyze());
          }
        } else {
          const debugChanged = clearDrawDebugHit(false);
          const hit = hitTest(event.clientX, event.clientY);
          if (hit !== state.hoverIndex || debugChanged) {
            state.hoverIndex = hit;
            draw(analyze());
          }
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
    state.pickedAnchor = null;
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    clearDecorationClickTimer();
    state.vertexDecorations = {};
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
    clearDecorationClickTimer();
    const oldRows = state.rows;
    const oldCols = state.cols;
    const oldLattice = state.lattice;
    const oldTiles = state.tiles.slice();
    const oldDecorations = { ...state.vertexDecorations };

    state.rows = rows;
    state.cols = cols;
    state.lattice = nextLattice;
    state.wrapped = nextWrapped;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    if (oldLattice !== nextLattice) {
      state.selectedTile = null;
      state.selectedPaletteId = '';
    }
    state.tiles = oldLattice !== nextLattice
      ? Array(rows * cols).fill(null)
      : reshapeTiles(oldTiles, oldRows, oldCols, rows, cols, getLattice().sides);
    state.vertexDecorations = oldLattice !== nextLattice
      ? {}
      : reshapeVertexDecorations(oldDecorations, oldRows, oldCols, rows, cols);
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

  function reshapeVertexDecorations(oldDecorations, oldRows, oldCols, rows, cols) {
    const next = {};
    const rowLimit = Math.min(oldRows, rows);
    const colLimit = Math.min(oldCols, cols);
    for (let row = 0; row < rowLimit; row += 1) {
      for (let col = 0; col < colLimit; col += 1) {
        const oldIndex = indexOf(row, col, oldCols);
        const value = normalizeVertexDecoration(oldDecorations[oldIndex]);
        if (value > 0) next[indexOf(row, col, cols)] = value;
      }
    }
    return next;
  }

  function adaptTileToSides(tile, sides) {
    if (tile == null) return null;
    if (isVertexTileValue(tile)) {
      return vertexTileFromDirs(normalizeVertexTile(tile).filter((dir) => dir >= 0 && dir < sides));
    }
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
    const diagramType = normalizeDiagramType(payload.diagramType || payload.type);
    const wrapped = payload.boundary === 'wrapped' || payload.wrapped === true;

    state.rows = rows;
    state.cols = cols;
    state.lattice = latticeName;
    state.diagramType = diagramType;
    state.wrapped = wrapped;
    state.wrappedViewMode = payload.wrappedViewMode === 'single' ? 'single' : 'periodic';
    state.inputMode = normalizeInputMode(payload.inputMode);
    state.editMode = normalizeEditMode(payload.clickMode || payload.editMode);
    state.drawAction = normalizeDrawAction(payload.drawAction || (payload.display && payload.display.drawAction));
    if (state.diagramType === 'dual' && (payload.drawAddVertices || (payload.display && payload.display.drawAddVertices))) {
      state.drawAction = 'vertex';
    }
    state.knotCodeKind = normalizeKnotCodeKind(payload.knotCodeKind || (payload.display && payload.display.knotCodeKind));
    state.drawLayer = normalizeDrawLayer(payload.drawLayer);
    state.showErrors = !(payload.display && payload.display.showOpenEnds === false);
    state.showCoords = !!(payload.display && payload.display.showCoords);
    state.colorComponents = !(payload.display && payload.display.colorComponents === false);
    state.displayPick = !!(payload.display && payload.display.pick);
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    state.componentColors = [];
    state.drawStyle = normalizeDrawStyle(
      payload.drawStyle
      || (payload.display && payload.display.drawStyle)
      || (payload.display && payload.display.drawDebug ? 'debug' : 'shade')
    );
    state.edits = Number.isFinite(Number(payload.edits)) ? Math.max(0, Math.trunc(Number(payload.edits))) : 0;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.tiles = importTiles(payload.tiles, rows, cols);
    state.vertexDecorations = importVertexDecorations(payload, rows, cols);

    syncAllInputs(rows, cols, state.lattice, state.wrapped);
    refs.showErrors.checked = state.showErrors;
    refs.showCoords.checked = state.showCoords;
    refs.colorComponents.checked = state.colorComponents;
    refs.displayPick.checked = state.displayPick;
    refs.drawAction.value = state.drawAction;
    refs.knotCodeKind.value = state.knotCodeKind;
    refs.drawStyle.value = state.drawStyle;
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
      else if (isDualGraph() && (Array.isArray(entry.vertexEdges) || Array.isArray(entry.spokes))) {
        value = vertexTileFromDirs(entry.vertexEdges || entry.spokes);
      } else if (Number.isFinite(Number(entry.mask))) {
        value = isDualGraph() ? vertexTileFromDirs(maskToDirs(Number(entry.mask))) : tileFromMask(Number(entry.mask));
      }
      else value = null;
    }
    if (value == null) return null;
    if (isDualGraph() && !isVertexTileValue(value)) {
      if (Array.isArray(value) && !value.some((entry) => Array.isArray(entry))) return vertexTileFromDirs(value);
      return null;
    }
    if (!isDualGraph() && !Array.isArray(value)) return null;
    return cloneTile(value);
  }

  function importVertexDecorations(payload, rows, cols) {
    const decorations = {};
    const entries = Array.isArray(payload.tiles) ? payload.tiles : [];
    entries.forEach((entry, entryIndex) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const index = importedTileIndex(entry, entryIndex, rows, cols);
      if (index < 0 || index >= rows * cols || !isVertexTileValue(state.tiles[index])) return;
      const value = normalizeVertexDecoration(entry.decoration ?? entry.vertexDecoration);
      if (value > 0) decorations[index] = value;
    });

    if (payload.vertexDecorations && typeof payload.vertexDecorations === 'object') {
      Object.entries(payload.vertexDecorations).forEach(([key, value]) => {
        const index = Number(key);
        const decoration = normalizeVertexDecoration(value);
        if (Number.isInteger(index) && index >= 0 && index < rows * cols && decoration > 0 && isVertexTileValue(state.tiles[index])) {
          decorations[index] = decoration;
        }
      });
    }

    return decorations;
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
    const shouldRestoreInputMode = state.displayPickInputLocked && state.inputMode === 'pick';
    const returnMode = state.displayPickReturnMode || 'draw';
    clearDecorationClickTimer();
    state.tiles = Array(state.rows * state.cols).fill(null);
    state.vertexDecorations = {};
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.displayPick = false;
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    if (refs.displayPick) refs.displayPick.checked = false;
    if (shouldRestoreInputMode) {
      state.inputMode = normalizeInputMode(returnMode);
      refs.inputMode.value = state.inputMode;
      updateInputModePanels();
      updateDrawModeControls();
    }
    updateInputModeLock();
    state.edits += 1;
    updateReport(false);
  }

  function vertexDecorationHitTest(clientX, clientY) {
    if (!isDecorationMode()) return -1;
    const hit = hitTest(clientX, clientY);
    return hit >= 0 && isVertexTileValue(state.tiles[hit]) ? hit : -1;
  }

  function vertexDecorationValue(index) {
    const value = Number(state.vertexDecorations[index]);
    return Number.isInteger(value) && value > 0 ? value : 0;
  }

  function normalizeVertexDecoration(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.trunc(number));
  }

  function setVertexDecoration(index, value) {
    if (index < 0 || index >= state.tiles.length || !isVertexTileValue(state.tiles[index])) return false;
    const next = normalizeVertexDecoration(value);
    const current = vertexDecorationValue(index);
    if (next === current) return false;
    if (next > 0) state.vertexDecorations[index] = next;
    else delete state.vertexDecorations[index];
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function changeVertexDecoration(index, delta) {
    return setVertexDecoration(index, Math.max(0, vertexDecorationValue(index) + delta));
  }

  function scheduleVertexDecorationIncrement(index) {
    clearDecorationClickTimer();
    decorationClickTimer = window.setTimeout(() => {
      decorationClickTimer = null;
      changeVertexDecoration(index, 1);
    }, 300);
  }

  function clearDecorationClickTimer() {
    if (decorationClickTimer !== null) window.clearTimeout(decorationClickTimer);
    decorationClickTimer = null;
  }

  function handleVertexDecorationDoubleClick(event) {
    if (!isDecorationMode()) return false;
    event.preventDefault();
    clearDecorationClickTimer();
    const hit = vertexDecorationHitTest(event.clientX, event.clientY);
    if (hit < 0) return true;
    const current = vertexDecorationValue(hit);
    const input = window.prompt('Vertex decoration', String(current));
    if (input == null) return true;
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) {
      refs.statusLine.textContent = 'decoration must be a non-negative integer';
      refs.statusLine.classList.add('mosaic-status-bad');
      return true;
    }
    refs.statusLine.classList.remove('mosaic-status-bad');
    setVertexDecoration(hit, Number(trimmed));
    return true;
  }

  function pruneVertexDecorations() {
    Object.keys(state.vertexDecorations).forEach((key) => {
      const index = Number(key);
      if (!Number.isInteger(index) || !isVertexTileValue(state.tiles[index]) || vertexDecorationValue(index) === 0) {
        delete state.vertexDecorations[key];
      }
    });
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
    if (state.editMode === 'randomize') {
      randomizeTile(index);
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

  function applyDrawTileAction(index, direction) {
    if (index < 0) return false;
    if (state.drawAction === 'vertex') {
      return direction > 0 && toggleVertexTileAtIndex(index);
    }
    if (isTileEmpty(state.tiles[index])) return false;
    if (state.drawAction === 'rotate') {
      rotateTile(index, direction);
      return true;
    }
    if (state.drawAction === 'reorder') {
      if (direction > 0) cycleTilePairs(index);
      else reverseTilePairs(index);
      return true;
    }
    if (state.drawAction === 'randomize') {
      randomizeTile(index);
      return true;
    }
    return false;
  }

  function randomizeTile(index) {
    if (isDualGraph() && isVertexTileValue(state.tiles[index])) {
      return;
    }

    const dirs = maskToDirs(tileToMask(state.tiles[index]));
    if (dirs.length < 2 || dirs.length % 2 !== 0) return;
    let next = randomMatching(dirs);
    for (let attempt = 0; attempt < 8 && tilesEqual(state.tiles[index], next); attempt += 1) {
      next = randomMatching(dirs);
    }
    if (tilesEqual(state.tiles[index], next)) return;
    state.tiles[index] = next;
    state.edits += 1;
    updateReport(false);
  }

  function randomMatching(dirs) {
    const remaining = dirs.slice();
    const pairs = [];
    while (remaining.length > 1) {
      const first = remaining.shift();
      const mateIndex = Math.floor(Math.random() * remaining.length);
      const second = remaining.splice(mateIndex, 1)[0];
      pairs.push([first, second]);
    }
    return shuffleArray(pairs);
  }

  function placeTile(index, tile) {
    if (index < 0 || isTileEmpty(tile)) return;
    if (tilesEqual(state.tiles[index], tile)) return;
    state.tiles[index] = cloneTile(tile);
    delete state.vertexDecorations[index];
    state.edits += 1;
    updateReport(false);
  }

  function deleteTile(index) {
    if (index < 0 || isTileEmpty(state.tiles[index])) return;
    state.tiles[index] = null;
    delete state.vertexDecorations[index];
    state.edits += 1;
    updateReport(false);
  }

  function moveTile(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const tile = state.tiles[fromIndex];
    if (isTileEmpty(tile)) return;
    const decoration = vertexDecorationValue(fromIndex);
    state.tiles[toIndex] = cloneTile(tile);
    state.tiles[fromIndex] = null;
    delete state.vertexDecorations[fromIndex];
    delete state.vertexDecorations[toIndex];
    if (decoration > 0 && isVertexTileValue(state.tiles[toIndex])) state.vertexDecorations[toIndex] = decoration;
    state.edits += 1;
    updateReport(false);
  }

  function beginDrawGesture(event) {
    const point = clientPointToBoardPoint(event.clientX, event.clientY);
    const tileHit = tileHitTest(event.clientX, event.clientY, 1.02);

    if (!tileHit) {
      updateDrawDebugFromPoint(event.clientX, event.clientY, false);
      return;
    }

    const tile = state.tiles[tileHit.index];
    const isVertex = isVertexTileValue(tile);

    // Determine entry point
    let entryDir = null;
    let vertexTouched = false;

    if (isVertex) {
      const anchor = dualGraphAnchorFromPoint(point, tileHit);
      if (anchor && anchor.type === 'edge') {
        entryDir = anchor.dir;
      } else {
        vertexTouched = true;
      }
    } else {
      const edgeHit = edgeHitTest(event.clientX, event.clientY, 0);
      if (edgeHit && edgeHit.index === tileHit.index) {
        entryDir = edgeHit.dir;
      } else {
        updateDrawDebugFromPoint(event.clientX, event.clientY, false);
        return;
      }
    }

    pointerState = {
      id: event.pointerId,
      index: tileHit.index,
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
      current: {
        index: tileHit.index,
        offset: copyOffsetRecord(tileHit.offset),
        entryDir: entryDir,
        isVertexTile: isVertex,
        vertexTouched: vertexTouched,
        originalTile: cloneTile(tile),
        removedEntryPair: null,
        removedEntryIndex: -1
      },
      history: [],
      eraseMode: 'detecting',
      completed: false
    };

    if (!isVertex && entryDir != null) {
      const removed = removePairAtEdge(tile || [], entryDir);
      state.tiles[tileHit.index] = removed.tile;
      drawState.current.removedEntryPair = removed.pair;
      drawState.current.removedEntryIndex = removed.pairIndex;
    }

    state.hoverIndex = tileHit.index;
    updateUnifiedDrawPreview(event.clientX, event.clientY, false);
    draw(analyze());
  }

  function updateDrawGesture(event) {
    if (!drawState) return;

    updateUnifiedDrawPreview(event.clientX, event.clientY);

    if (!drawState.current) {
      const tileHit = tileHitTest(event.clientX, event.clientY, 1.02);
      if (!tileHit) return;

      const tile = state.tiles[tileHit.index];
      const isVertex = isVertexTileValue(tile);
      const point = clientPointToBoardPoint(event.clientX, event.clientY);

      let entryDir = null;
      let vertexTouched = false;

      if (isVertex) {
        const anchor = dualGraphAnchorFromPoint(point, tileHit);
        if (anchor && anchor.type === 'edge') {
          entryDir = anchor.dir;
        } else {
          vertexTouched = true;
        }
      } else {
        const edgeHit = edgeHitTest(event.clientX, event.clientY, 0);
        if (edgeHit && edgeHit.index === tileHit.index) {
          entryDir = edgeHit.dir;
        } else {
          return;
        }
      }

      drawState.current = {
        index: tileHit.index,
        offset: copyOffsetRecord(tileHit.offset),
        entryDir: entryDir,
        isVertexTile: isVertex,
        vertexTouched: vertexTouched,
        originalTile: cloneTile(tile),
        removedEntryPair: null,
        removedEntryIndex: -1
      };

      if (!isVertex && entryDir != null) {
        const removed = removePairAtEdge(tile || [], entryDir);
        state.tiles[tileHit.index] = removed.tile;
        drawState.current.removedEntryPair = removed.pair;
        drawState.current.removedEntryIndex = removed.pairIndex;
      }

      state.hoverIndex = tileHit.index;
      updateUnifiedDrawPreview(event.clientX, event.clientY);
      draw(analyze());
      return;
    }

    const point = clientPointToBoardPoint(event.clientX, event.clientY);
    const currentHit = tileHitTest(event.clientX, event.clientY, 1.02);

    if (currentHit && currentHit.index === drawState.current.index) {
      if (drawState.current.isVertexTile) {
        const centerDist = dualGraphCenterDistanceFromPoint(point, drawState.current);
        if (centerDist != null && centerDist <= geometry.radius * 0.32) {
          if (!drawState.current.vertexTouched) {
            // First time touching the vertex - commit the entry spoke
            drawState.current.vertexTouched = true;
            if (drawState.current.entryDir != null) {
              commitDualGraphSpoke(drawState.current.index, drawState.current.entryDir);
              drawState.completed = true;
              updateReport(false);
            }
            // Now we're drawing from the center
            drawState.current.entryDir = null;
          }
        }
      }
      return;
    }

    const exitDir = detectExitDirection(event.clientX, event.clientY, drawState.current);
    if (exitDir == null) return;

    if (exitDir === drawState.current.entryDir && !drawState.current.vertexTouched) {
      if (drawState.history.length) undoLastDrawSegment();
      else restorePendingDrawTile();
      updateUnifiedDrawPreview(event.clientX, event.clientY);
      return;
    }

    const finished = drawState.current;
    commitCurrentTile(exitDir);
    drawState.current = null;
    drawState.completed = true;
    updateReport(false);

    const next = nextDrawEntry(finished, exitDir);
    if (next) {
      startDrawingAtTile(next, event.clientX, event.clientY);
    }
  }

  function firstDrawEntry(clientX, clientY) {
    return edgeHitTest(clientX, clientY, 0);
  }

  function detectExitDirection(clientX, clientY, tileState) {
    if (tileState.isVertexTile) {
      const point = clientPointToBoardPoint(clientX, clientY);
      const endpoint = dualGraphEndpointFromPoint(point, {
        index: tileState.index,
        offset: tileState.offset,
        anchor: tileState.entryDir != null ? 'edge' : 'center',
        entryDir: tileState.entryDir
      });
      return endpoint && endpoint.type === 'edge' ? endpoint.dir : null;
    } else {
      return drawExitDirection(clientX, clientY, tileState);
    }
  }

  function commitCurrentTile(exitDir) {
    if (!drawState || !drawState.current) return;

    const current = drawState.current;

    if (current.isVertexTile) {
      // If vertex was touched, entry spoke was already toggled when touching vertex
      // So we only need to toggle the exit spoke
      if (current.vertexTouched) {
        if (exitDir != null) {
          commitDualGraphSpoke(current.index, exitDir);
        }
      } else {
        // Vertex not touched - toggle both entry and exit spokes
        if (current.entryDir != null) {
          commitDualGraphSpoke(current.index, current.entryDir);
        }
        if (exitDir != null && exitDir !== current.entryDir) {
          commitDualGraphSpoke(current.index, exitDir);
        }
      }
    } else {
      if (current.entryDir != null && exitDir != null) {
        const eraseModeBefore = drawState.eraseMode;
        const erasesExisting = eraseModeBefore === 'detecting'
          && pairHasEndpoints(current.removedEntryPair, current.entryDir, exitDir);

        if (erasesExisting) {
          state.tiles[current.index] = cloneTile(state.tiles[current.index] || []);
        } else {
          drawState.eraseMode = 'drawing';
          const removed = removePairAtEdge(state.tiles[current.index] || [], exitDir);
          const next = removed.tile;
          const newPair = [current.entryDir, exitDir];
          if (state.drawLayer === 'below') next.unshift(newPair);
          else next.push(newPair);
          state.tiles[current.index] = cloneTile(next);
        }

        state.edits += 1;

        drawState.history.push({
          tileState: cloneDrawTileState(current),
          exitDir,
          eraseModeBefore,
          eraseModeAfter: drawState.eraseMode
        });
      }
    }

    drawState.completed = true;
  }

  function startDrawingAtTile(entry, clientX, clientY) {
    const tile = state.tiles[entry.index];
    const isVertex = isVertexTileValue(tile);

    drawState.current = {
      index: entry.index,
      offset: copyOffsetRecord(entry.offset),
      entryDir: entry.dir,
      isVertexTile: isVertex,
      vertexTouched: false,
      originalTile: cloneTile(tile),
      removedEntryPair: null,
      removedEntryIndex: -1
    };

    if (!isVertex && entry.dir != null) {
      const removed = removePairAtEdge(tile || [], entry.dir);
      state.tiles[entry.index] = removed.tile;
      drawState.current.removedEntryPair = removed.pair;
      drawState.current.removedEntryIndex = removed.pairIndex;
    }

    state.hoverIndex = entry.index;
    updateUnifiedDrawPreview(clientX, clientY);
    draw(analyze());
  }

  function updateUnifiedDrawPreview(clientX, clientY, redraw = true) {
    if (!drawState || !drawState.current) {
      updateDrawDebugFromPoint(clientX, clientY, redraw);
      return;
    }

    const current = drawState.current;
    const point = clientPointToBoardPoint(clientX, clientY);

    if (current.isVertexTile) {
      const endpoint = dualGraphEndpointFromPoint(point, {
        index: current.index,
        offset: current.offset,
        anchor: current.entryDir != null ? 'edge' : 'center',
        entryDir: current.entryDir
      });

      const dir = current.entryDir != null
        ? current.entryDir
        : (endpoint && endpoint.type === 'edge'
          ? endpoint.dir
          : nearestDirectionForTilePoint(point, current));

      setDrawDebugHit({
        index: current.index,
        dir: dir == null || dir < 0 ? 0 : dir,
        offset: copyOffsetRecord(current.offset),
        point,
        graphAnchor: current.entryDir != null ? 'edge' : 'center',
        graphVertex: !!endpoint && endpoint.type === 'center'
      }, redraw);
    } else {
      if (state.drawStyle === 'shade') {
        setDrawDebugHit({
          index: current.index,
          dir: current.entryDir,
          offset: copyOffsetRecord(current.offset),
          point
        }, redraw);
      } else {
        updateDrawDebugFromPoint(clientX, clientY, redraw);
      }
    }
  }

  function cloneDrawTileState(tileState) {
    return {
      index: tileState.index,
      offset: copyOffsetRecord(tileState.offset),
      entryDir: tileState.entryDir,
      isVertexTile: tileState.isVertexTile,
      vertexTouched: tileState.vertexTouched,
      originalTile: cloneTile(tileState.originalTile),
      removedEntryPair: tileState.removedEntryPair ? tileState.removedEntryPair.slice() : null,
      removedEntryIndex: tileState.removedEntryIndex
    };
  }

  function beginDualGraphDrawGesture(event) {
    // Unified system: just call beginDrawGesture
    beginDrawGesture(event);
  }

  function updateDualGraphDrawGesture(event) {
    // Unified system: just call updateDrawGesture
    updateDrawGesture(event);
  }

  function updateDualGraphDrawPreview(clientX, clientY, redraw = true) {
    // Unified system: just call updateUnifiedDrawPreview
    updateUnifiedDrawPreview(clientX, clientY, redraw);
  }

  function nearestDirectionForTilePoint(point, tileState) {
    const cell = geometry.cells[tileState.index];
    if (!cell) return null;
    const local = {
      x: point.x - tileState.offset.x,
      y: point.y - tileState.offset.y
    };
    return nearestDirectionFromVector(local.x - cell.x, local.y - cell.y);
  }

  function dualGraphAnchorFromPoint(point, tileState) {
    const centerDistance = dualGraphCenterDistanceFromPoint(point, tileState);
    if (centerDistance == null) return null;
    if (centerDistance <= geometry.radius * 0.34) return { type: 'center' };

    const dir = nearestDirectionForTilePoint(point, tileState);
    if (dir == null || dir < 0) return { type: 'center' };
    return { type: 'edge', dir };
  }

  function dualGraphEndpointFromPoint(point, tileState) {
    const gestureDir = tileState.entryDir ?? nearestDirectionForTilePoint(point, tileState);
    const projection = gestureDir == null || gestureDir < 0
      ? null
      : dualGraphSpokeProjectionFromPoint(point, tileState, gestureDir);
    if (projection && projection.distance <= geometry.radius * 0.34) {
      if (tileState.anchor === 'edge' && projection.t >= 0.78) {
        return { type: 'center', dir: gestureDir };
      }
      if (tileState.anchor === 'center' && projection.t <= 0.22) {
        return { type: 'edge', dir: gestureDir };
      }
    }

    const centerDistance = dualGraphCenterDistanceFromPoint(point, tileState);
    if (centerDistance == null) return null;
    if (centerDistance <= geometry.radius * 0.32) return { type: 'center' };

    const dir = drawExitDirectionFromPoint(point, tileState);
    if (dir == null) return null;
    return { type: 'edge', dir };
  }

  function dualGraphCenterDistanceFromPoint(point, tileState) {
    const cell = geometry.cells[tileState.index];
    if (!cell) return null;
    return Math.hypot(
      point.x - tileState.offset.x - cell.x,
      point.y - tileState.offset.y - cell.y
    );
  }

  function commitDualGraphSpoke(index, dir) {
    const changed = setVertexTileSpoke(index, dir, !vertexTileHasSpoke(index, dir));
    if (changed) state.edits += 1;
  }

  function dualGraphSpokeProjectionFromPoint(point, tileState, dir) {
    const cell = geometry.cells[tileState.index];
    if (!cell) return null;
    const center = {
      x: cell.x + tileState.offset.x,
      y: cell.y + tileState.offset.y
    };
    const edge = edgePoint(center.x, center.y, dir, edgeConnectionDistance(geometry.radius));
    const vx = center.x - edge.x;
    const vy = center.y - edge.y;
    const lengthSq = (vx * vx) + (vy * vy);
    if (lengthSq < 0.001) return null;
    const rawT = (((point.x - edge.x) * vx) + ((point.y - edge.y) * vy)) / lengthSq;
    const t = Math.max(0, Math.min(1, rawT));
    const projected = {
      x: edge.x + (vx * t),
      y: edge.y + (vy * t)
    };
    return {
      center,
      edge,
      point: projected,
      rawT,
      t,
      distance: Math.hypot(point.x - projected.x, point.y - projected.y)
    };
  }

  function continueFromVertexEdge(tileState, dir, clientX, clientY) {
    // Obsolete: unified system handles transitions automatically
    return false;
  }

  function shouldDrawDualGraphVertex(clientX, clientY) {
    if (!isDualGraph()) return false;
    const hit = tileHitTest(clientX, clientY, 1.02);
    if (!hit) return false;
    return state.drawAction === 'edge' && isVertexTileValue(state.tiles[hit.index]);
  }

  function toggleVertexTileAtIndex(index) {
    if (!isDualGraph() || index < 0 || index >= state.tiles.length) return false;
    const tile = state.tiles[index];
    if (isVertexTileValue(tile)) {
      state.tiles[index] = null;
      delete state.vertexDecorations[index];
    } else if (isTileEmpty(tile)) {
      // Creating a vertex on an empty tile - auto-connect to open ends
      const openEnds = findOpenEndsPointingToTile(index);
      state.tiles[index] = vertexTileFromDirs(openEnds);
      delete state.vertexDecorations[index];
    } else {
      state.tiles[index] = vertexTileFromDirs(maskToDirs(tileToMask(tile)));
      delete state.vertexDecorations[index];
    }
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function findOpenEndsPointingToTile(targetIndex) {
    const lattice = getLattice();
    const cell = geometry.cells[targetIndex];
    if (!cell) return [];

    const openDirs = [];

    // Check each direction from the target tile
    for (let dir = 0; dir < lattice.sides; dir++) {
      // Find the neighbor in this direction
      const neighborInfo = neighbor(cell.row, cell.col, dir, state.rows, state.cols, lattice, state.wrapped);
      if (!neighborInfo) continue;

      const neighborIndex = indexOf(neighborInfo.row, neighborInfo.col, state.cols);
      const neighborTile = state.tiles[neighborIndex];

      // Check if neighbor has an open end pointing back to us
      const oppositeDir = lattice.opposite[dir];

      if (isVertexTileValue(neighborTile)) {
        // Neighbor is a vertex tile - check if it has a spoke pointing to us
        if (vertexTileHasSpoke(neighborIndex, oppositeDir)) {
          openDirs.push(dir);
        }
      } else if (!isTileEmpty(neighborTile)) {
        // Neighbor is an arc tile - check if it has an open end pointing to us
        const arcs = normalizeTile(neighborTile);
        const hasOpenEnd = arcs.some(pair => pair[0] === oppositeDir || pair[1] === oppositeDir);
        if (hasOpenEnd) {
          openDirs.push(dir);
        }
      }
    }

    return openDirs;
  }

  function startDrawTile(edge, redraw = true) {
    // Obsolete: replaced by startDrawingAtTile in unified system
    return;
  }

  function commitDrawTile(tileState, exitDir) {
    // Obsolete: replaced by commitCurrentTile in unified system
    return;
  }

  function undoLastDrawSegment() {
    if (!drawState || !drawState.history.length) return false;
    if (drawState.current) restoreDrawTile(drawState.current);

    const segment = drawState.history.pop();
    restoreDrawTile(segment.tileState);
    state.edits = Math.max(0, state.edits - 1);
    drawState.eraseMode = segment.eraseModeBefore || 'drawing';
    drawState.completed = drawState.history.length > 0;
    updateReport(false);

    // Restore the previous tile state
    drawState.current = cloneDrawTileState(segment.tileState);
    state.hoverIndex = segment.tileState.index;

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
    if (drawState && drawState.current && drawState.current.isVertexTile && pointerState && !pointerState.moved) {
      const point = clientPointToBoardPoint(event.clientX, event.clientY);
      const endpoint = dualGraphEndpointFromPoint(point, {
        index: drawState.current.index,
        offset: drawState.current.offset,
        anchor: drawState.current.entryDir != null ? 'edge' : 'center',
        entryDir: drawState.current.entryDir
      });
      if (!endpoint) return false;

      const anchor = drawState.current.entryDir != null ? 'edge' : 'center';

      if (anchor === 'center' && endpoint.type === 'edge') {
        commitDualGraphSpoke(drawState.current.index, endpoint.dir);
        drawState.completed = true;
        updateReport(false);
        return true;
      }

      if (anchor === 'edge' && endpoint.type === 'center') {
        commitDualGraphSpoke(drawState.current.index, drawState.current.entryDir);
        drawState.completed = true;
        updateReport(false);
        return true;
      }

      return false;
    }
    return false;
  }

  function beginDrawTileActionGesture(event) {
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
    clearDrawDebugHit(false);
    if (hit !== state.hoverIndex) {
      state.hoverIndex = hit;
      draw(analyze());
    }
    refs.canvas.setPointerCapture(event.pointerId);
  }

  function updateDrawTileActionGesture(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (Math.hypot(dx, dy) > 10) pointerState.moved = true;

    const hit = hitTest(event.clientX, event.clientY);
    if (hit !== state.hoverIndex) {
      state.hoverIndex = hit;
      draw(analyze());
    }
  }

  function handleDrawTileActionClick(event) {
    if (!pointerState || pointerState.moved || longPressFired) return false;
    const hit = hitTest(event.clientX, event.clientY);
    if (hit < 0 || hit !== pointerState.index) return false;
    return applyDrawTileAction(hit, 1);
  }

  function finishDrawGesture(event = null) {
    if (!drawState) return;
    if (drawState.current) {
      // If vertex was touched, the spoke was already committed, so don't restore
      // For arc tiles or vertex tiles where vertex wasn't touched, restore the original
      if (!drawState.current.isVertexTile || !drawState.current.vertexTouched) {
        restoreDrawTile(drawState.current);
      }
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
    state.pickedAnchor = hit ? pickHoverHitFromEdgeHit(hit, component) : null;
    state.pickHoverHit = hit ? pickHoverHitFromEdgeHit(hit, component) : null;
    if (hit && state.displayPickInputLocked) {
      finishDisplayPickCapture(true);
      return;
    }
    updateReport(false);
  }

  function componentAtEdgeHit(hit, report) {
    const connection = connectedArcAtEdgeHit(hit, report);
    return connection ? connection.component : null;
  }

  function connectedArcAtEdgeHit(hit, report) {
    if (isDualGraph()) return connectedDualGraphAtEdgeHit(hit, report);
    if (!hit || !report || !report.arcComponents) return null;
    const direct = connectedArcAtTileEdge(hit.index, hit.dir, hit.offset, report);
    if (direct) return direct;

    const neighborHit = matchingNeighborEdgeHit(hit);
    if (!neighborHit) return null;
    return connectedArcAtTileEdge(neighborHit.index, neighborHit.dir, neighborHit.offset, report);
  }

  function connectedArcAtTileEdge(index, dir, offset, report) {
    const tile = normalizeTile(state.tiles[index]);
    const pairIndex = tile.findIndex((pair) => pair[0] === dir || pair[1] === dir);
    if (pairIndex < 0) return null;
    const component = report.arcComponents[index]
      ? report.arcComponents[index][pairIndex]
      : null;
    if (!Number.isInteger(component) || component < 0) return null;
    return {
      index,
      dir,
      pairIndex,
      component,
      offset: copyOffsetRecord(offset)
    };
  }

  function connectedDualGraphAtEdgeHit(hit, report) {
    if (!hit || !report) return null;
    const directArc = connectedArcAtTileEdge(hit.index, hit.dir, hit.offset, report);
    if (directArc) return directArc;
    const directSpoke = connectedGraphSpokeAtTileEdge(hit.index, hit.dir, hit.offset, report);
    if (directSpoke) return directSpoke;

    const neighborHit = matchingNeighborEdgeHit(hit);
    if (!neighborHit) return null;
    return connectedArcAtTileEdge(neighborHit.index, neighborHit.dir, neighborHit.offset, report)
      || connectedGraphSpokeAtTileEdge(neighborHit.index, neighborHit.dir, neighborHit.offset, report);
  }

  function connectedGraphSpokeAtEdgeHit(hit, report) {
    if (!hit || !report || !report.spokeComponents) return null;
    const direct = connectedGraphSpokeAtTileEdge(hit.index, hit.dir, hit.offset, report);
    if (direct) return direct;

    const neighborHit = matchingNeighborEdgeHit(hit);
    if (!neighborHit) return null;
    return connectedGraphSpokeAtTileEdge(neighborHit.index, neighborHit.dir, neighborHit.offset, report);
  }

  function connectedGraphSpokeAtTileEdge(index, dir, offset, report) {
    const spokes = normalizeVertexTile(state.tiles[index]);
    const spokeIndex = spokes.findIndex((candidate) => candidate === dir);
    if (spokeIndex < 0) return null;
    const component = report.spokeComponents[index]
      ? report.spokeComponents[index][spokeIndex]
      : null;
    if (!Number.isInteger(component) || component < 0) return null;
    return {
      index,
      dir,
      pairIndex: spokeIndex,
      component,
      offset: copyOffsetRecord(offset)
    };
  }

  function applyPickedComponent() {
    if (state.pickedComponent == null) return;
    if (isDualGraph()) {
      applyPickedDualComponent();
      return;
    }
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
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    if (changed) state.edits += 1;
    updateReport(false);
  }

  function applyPickedDualComponent() {
    const report = analyze();
    const keepComponent = state.pickedComponent;
    let changed = false;

    state.tiles = state.tiles.map((tile, tileIndex) => {
      if (isTileEmpty(tile)) return null;
      if (isVertexTileValue(tile)) {
        const spokes = normalizeVertexTile(tile);
        const components = report.spokeComponents[tileIndex] || [];
        const kept = spokes.filter((_, spokeIndex) => components[spokeIndex] === keepComponent);

        // If no spokes are kept, remove the vertex entirely (including isolated vertices)
        if (kept.length === 0) {
          if (spokes.length > 0) changed = true;
          return null;
        }

        const nextTile = vertexTileFromDirs(kept);
        if (tilesEqual(tile, nextTile)) return cloneTile(tile);
        changed = true;
        return nextTile;
      }

      const arcs = normalizeTile(tile);
      const components = report.arcComponents[tileIndex] || [];
      const kept = arcs.filter((_, arcIndex) => components[arcIndex] === keepComponent);
      const nextTile = kept.map((pair) => pair.slice(0, 2));
      if (tilesEqual(tile, nextTile)) return cloneTile(tile);
      changed = true;
      return nextTile.length ? nextTile : null;
    });

    state.pickedComponent = null;
    state.pickedAnchor = null;
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
      offset: copyOffsetRecord(hit.offset)
    };
  }

  function setPickHoverHit(hit, redraw = true) {
    const next = hit
      ? {
        index: hit.index,
        dir: hit.dir,
        component: hit.component,
        offset: copyOffsetRecord(hit.offset)
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
      if (isDrawGestureAction()) {
        if (shouldDrawDualGraphVertex(event.clientX, event.clientY)) beginDualGraphDrawGesture(event);
        else beginDrawGesture(event);
      }
      else beginDrawTileActionGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode === 'pick') {
      beginPickGesture(event);
      event.preventDefault();
      return;
    }
    if (isDecorationMode()) {
      const hit = vertexDecorationHitTest(event.clientX, event.clientY);
      pointerState = {
        id: event.pointerId,
        index: hit,
        x: event.clientX,
        y: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false
      };
      refs.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!isTilingMode()) {
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
    if (state.inputMode === 'draw' && !isDrawGestureAction()) {
      updateDrawTileActionGesture(event);
      event.preventDefault();
      return;
    }
    if (state.inputMode === 'pick') {
      updatePickGesture(event);
      event.preventDefault();
      return;
    }
    if (isDecorationMode()) {
      if (!pointerState || event.pointerId !== pointerState.id) return;
      const dx = event.clientX - pointerState.x;
      const dy = event.clientY - pointerState.y;
      if (Math.hypot(dx, dy) > 10) pointerState.moved = true;
      event.preventDefault();
      return;
    }
    if (!isTilingMode()) return;

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
    if (state.inputMode === 'draw' && !isDrawGestureAction()) {
      handleDrawTileActionClick(event);
      clearPointerState(event);
      return;
    }
    if (state.inputMode === 'pick') {
      finishPickGesture(event);
      clearPointerState(event);
      return;
    }
    if (isDecorationMode()) {
      if (pointerState && event.pointerId === pointerState.id && !pointerState.moved) {
        const hit = vertexDecorationHitTest(event.clientX, event.clientY);
        if (hit >= 0 && hit === pointerState.index) scheduleVertexDecorationIncrement(hit);
      }
      clearPointerState(event);
      return;
    }
    if (!isTilingMode()) {
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
    return isDualGraph() ? analyzeDualGraph() : analyzeLinkMosaic();
  }

  function analyzeLinkMosaic() {
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

  function analyzeDualGraph() {
    const total = state.rows * state.cols;
    const lattice = getLattice();
    const active = state.tiles.reduce((count, tile) => count + (isTileEmpty(tile) ? 0 : 1), 0);
    const parent = [];
    const rank = [];
    const nodeIds = new Map();
    const portIds = new Map();
    const portMeta = [];
    const arcPortIds = Array.from({ length: total }, () => []);
    const spokePortIds = Array.from({ length: total }, () => []);
    let openEnds = 0;
    let alignedEdges = 0;
    let edgeCount = 0;

    const ensureNode = (key) => {
      if (nodeIds.has(key)) return nodeIds.get(key);
      const id = parent.length;
      nodeIds.set(key, id);
      parent[id] = id;
      rank[id] = 0;
      return id;
    };
    const ensureVertex = (index) => ensureNode(`v:${index}`);
    const ensurePort = (index, dir) => {
      const key = `p:${index}:${dir}`;
      if (portIds.has(key)) return portIds.get(key);
      const id = ensureNode(key);
      portIds.set(key, id);
      portMeta.push({ index, dir, id });
      return id;
    };
    const connectNodes = (left, right) => {
      edgeCount += 1;
      union(parent, rank, left, right);
    };

    for (let index = 0; index < total; index += 1) {
      if (isTileEmpty(state.tiles[index])) continue;
      const arcs = normalizeTile(state.tiles[index]);
      arcs.forEach((pair, pairIndex) => {
        const left = ensurePort(index, pair[0]);
        const right = ensurePort(index, pair[1]);
        arcPortIds[index][pairIndex] = left;
        connectNodes(left, right);
      });

      if (isVertexTileValue(state.tiles[index])) {
        const vertex = ensureVertex(index);
        normalizeVertexTile(state.tiles[index]).forEach((dir, spokeIndex) => {
          const port = ensurePort(index, dir);
          spokePortIds[index][spokeIndex] = port;
          connectNodes(vertex, port);
        });
      }
    }

    portMeta.forEach((port) => {
      const row = Math.floor(port.index / state.cols);
      const col = port.index % state.cols;
      const next = neighbor(row, col, port.dir, state.rows, state.cols, lattice, state.wrapped);
      if (!next) {
        openEnds += 1;
        return;
      }
      const nextIndex = indexOf(next.row, next.col, state.cols);
      const opposite = lattice.opposite[port.dir];
      const nextId = portIds.get(`p:${nextIndex}:${opposite}`);
      if (nextId == null) {
        openEnds += 1;
        return;
      }
      if (port.id < nextId) {
        alignedEdges += 1;
        connectNodes(port.id, nextId);
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
    const spokeComponents = spokePortIds.map((tilePorts) => (
      tilePorts.map((portId) => rootToComponent.get(find(parent, portId)) ?? -1)
    ));

    let label = active === 0 ? 'empty' : 'editing';
    let message = active === 0 ? 'empty canvas' : `${components} component${components === 1 ? '' : 's'}, ${openEnds} open end${openEnds === 1 ? '' : 's'}`;
    if (active > 0 && openEnds === 0) {
      label = 'closed';
      message = cycles > 0
        ? `${components} component${components === 1 ? '' : 's'}, ${cycles} cycle${cycles === 1 ? '' : 's'}`
        : `${components} component${components === 1 ? '' : 's'}`;
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
      arcComponents,
      spokeComponents
    };
  }

  function updateReport(manualCheck) {
    pruneVertexDecorations();
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
    refs.infoLine.textContent = `${getLattice().label}, ${isDualGraph() ? 'dual graph' : 'knot/link'}, ${state.wrapped ? 'wrapped' : 'open'} · ${report.active} filled`;

    updatePickControls();
    updateDisplayControls();
    if (!isDualGraph()) updateKnotCard(report);
    else updateDualGraphCard(report);
    refreshExport();
    draw(report);
  }

  function normalizePickedComponent(report) {
    if (state.pickedAnchor) {
      const component = componentAtEdgeHit(state.pickedAnchor, report);
      if (component == null) {
        state.pickedComponent = null;
        state.pickedAnchor = null;
        return;
      }
      state.pickedAnchor.component = component;
      state.pickedComponent = component;
      return;
    }
    if (state.pickedComponent == null) return;
    const componentGroups = isDualGraph()
      ? (report.arcComponents || []).concat(report.spokeComponents || [])
      : report.arcComponents;
    const hasComponent = (componentGroups || []).some((components) => (
      components.some((component) => component === state.pickedComponent)
    ));
    if (!hasComponent) {
      state.pickedComponent = null;
      state.pickedAnchor = null;
    }
  }

  function updatePickControls() {
    if (!refs.applyPick) return;
    refs.applyPick.disabled = state.inputMode !== 'pick' || state.pickedComponent == null;
  }

  function isPickDisplayActive() {
    return state.inputMode === 'pick' || state.displayPick;
  }

  function beginDisplayPickCapture() {
    state.displayPickInputLocked = true;
    state.displayPickReturnMode = state.inputMode;
    setInputMode('pick', { clearPick: false });
    updateInputModeLock();
  }

  function finishDisplayPickCapture(restoreMode) {
    const wasLocked = state.displayPickInputLocked;
    const returnMode = state.displayPickReturnMode || 'draw';
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    updateInputModeLock();
    if (wasLocked && restoreMode) {
      setInputMode(returnMode, { clearPick: false });
      return;
    }
    updateInputModePanels();
    updateDrawModeControls();
    updateReport(false);
  }

  function updateInputModeLock() {
    if (!refs.inputMode) return;
    refs.inputMode.disabled = !!state.displayPickInputLocked;
  }

  function updateKnotCard(report) {
    if (!refs.knotStatus || !refs.knotName || !refs.knotCode) return;
    const summary = identifyKnot(report);
    const showDetails = !!summary.showDetails;
    syncKnotCodeSelector(summary);
    refs.knotStatus.textContent = summary.status;
    renderKnotNames(summary);
    refs.knotCode.value = showDetails ? knotCodeForDisplay(summary) : '-';
    setKnotDetailVisibility(showDetails);
    refs.knotStatus.classList.toggle('mosaic-status-good', summary.tone === 'good');
    refs.knotStatus.classList.toggle('mosaic-status-bad', summary.tone === 'bad');
    refs.knotName.classList.toggle('mosaic-status-good', summary.tone === 'good');
    refs.knotName.classList.toggle('mosaic-status-bad', summary.tone === 'bad');
  }

  function renderKnotNames(summary) {
    refs.knotName.textContent = '';
    refs.knotName.classList.remove('mosaic-knot-links');
    const candidates = summary.candidates || [];
    if (!candidates.length) {
      refs.knotName.textContent = summary.name || '-';
      return;
    }
    refs.knotName.classList.add('mosaic-knot-links');
    candidates.forEach((candidate) => {
      const link = document.createElement('a');
      link.href = candidate.href || knotInfoHrefFromName(candidate.name);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = candidate.label || candidate.name;
      refs.knotName.appendChild(link);
    });
  }

  function setKnotDetailVisibility(showDetails) {
    [
      refs.knotNameRow,
      refs.knotCodeRow
    ].forEach((element) => {
      if (element) element.hidden = !showDetails;
    });
  }

  function syncKnotCodeSelector(summary) {
    if (!refs.knotCodeKind) return;
    const braidOption = refs.knotCodeKind.querySelector('option[value="braid"]');
    const hasBraid = !!(summary && Array.isArray(summary.braid));
    if (braidOption) braidOption.disabled = !hasBraid;
    if (!hasBraid && state.knotCodeKind === 'braid') {
      state.knotCodeKind = 'pd';
    }
    refs.knotCodeKind.value = state.knotCodeKind;
  }

  function updateDualGraphCard(report) {
    if (!refs.dualGraphStatus || !refs.dualGraphCanvas) return;

    const graphData = collectDualGraphData(report);

    if (!graphData.isValid) {
      refs.dualGraphStatus.textContent = graphData.reason || 'Not available';
      if (refs.dualGraphInvariants) refs.dualGraphInvariants.innerHTML = '<span class="hint">-</span>';
      refs.dualGraphCanvasWrap.style.display = 'none';
      refs.dualGraphPlaceholder.style.display = 'block';
      state.dualGraphLayout = null;
      state.dualGraphData = null;
      state.dualGraphAnimating = false;
      state.dualGraphDragging = null;
      state.riemannSurfaceModel = null;
      state.selectedRiemannVertex = null;
      syncDualGraphCanvasVisibility();
      return;
    }

    refs.dualGraphStatus.textContent = `${graphData.vertices.length} vertices, ${graphData.edges.length} edges, ${graphData.legs.length} legs`;
    if (refs.dualGraphInvariants) refs.dualGraphInvariants.innerHTML = formatDualGraphInvariants(graphData);
    syncDualGraphInvariantVisibility();
    refs.dualGraphCanvasWrap.style.display = 'block';
    refs.dualGraphPlaceholder.style.display = 'none';

    // Check if graph structure changed
    const structureKey = JSON.stringify({
      v: graphData.vertices.map(v => v.index),
      e: graphData.edges.map(e => [e.from, e.to]),
      l: graphData.legs.map(l => l.vertex)
    });
    const oldKey = state.dualGraphStructureKey || '';

    if (structureKey !== oldKey) {
      state.dualGraphAnimating = false;
      state.dualGraphLayout = null;
      state.dualGraphStructureKey = structureKey;
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
    }

    state.dualGraphData = graphData;
    syncDualGraphCanvasVisibility();
    renderVisibleDualGraphVisualizations(graphData);
  }

  function syncDualGraphCanvasVisibility() {
    if (refs.showDualGraphCanvas) refs.showDualGraphCanvas.checked = state.showDualGraphCanvas;
    if (refs.showRiemannSurfaceCanvas) refs.showRiemannSurfaceCanvas.checked = state.showRiemannSurfaceCanvas;
    if (refs.dualGraphViewWrap) refs.dualGraphViewWrap.hidden = !state.showDualGraphCanvas;
    if (refs.riemannSurfaceViewWrap) refs.riemannSurfaceViewWrap.hidden = !state.showRiemannSurfaceCanvas;
    if (refs.dualGraphLayoutControls) refs.dualGraphLayoutControls.hidden = !isDualGraphVisualizationVisible();

    if (!isDualGraphVisualizationVisible()) {
      state.dualGraphAnimating = false;
      state.dualGraphDragging = null;
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
    }
    if (!state.showDualGraphCanvas && refs.dualGraphCanvas) refs.dualGraphCanvas.style.cursor = 'default';
    if (!state.showRiemannSurfaceCanvas) {
      state.riemannSurfaceModel = null;
      state.selectedRiemannVertex = null;
    }

    if (refs.computeLayout) refs.computeLayout.disabled = !isDualGraphVisualizationVisible() || !state.dualGraphData;
    if (refs.resetLayout) refs.resetLayout.disabled = !isDualGraphVisualizationVisible() || !state.dualGraphData;
  }

  function renderVisibleDualGraphVisualizations(graphData) {
    if (state.showDualGraphCanvas) renderDualGraphVisualization(graphData);
    if (state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(graphData);
  }

  function isDualGraphVisualizationVisible() {
    return state.showDualGraphCanvas || state.showRiemannSurfaceCanvas;
  }

  function ensureDualGraphLayout(graphData) {
    if (state.dualGraphLayout) return state.dualGraphLayout;
    const size = dualGraphLayoutSize();
    state.dualGraphLayout = calculateGraphLayout(graphData, size.width, size.height);
    return state.dualGraphLayout;
  }

  function dualGraphLayoutSize() {
    const canvas = refs.dualGraphCanvas;
    if (!canvas) return { width: 300, height: 300 };
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width) || canvas.width || 300;
    const height = Math.round(rect.height) || canvas.height || 300;
    return { width, height };
  }

  function collectDualGraphData(report) {
    // Check prerequisites: exactly one component and at least one vertex
    if (report.components !== 1) {
      return { isValid: false, reason: 'Requires exactly one component' };
    }

    const lattice = getLattice();
    const vertices = [];
    const edges = [];
    const legs = [];

    // Collect vertices
    for (let index = 0; index < state.tiles.length; index += 1) {
      if (isVertexTileValue(state.tiles[index])) {
        const row = Math.floor(index / state.cols);
        const col = index % state.cols;
        vertices.push({ index, row, col });
      }
    }

    if (vertices.length === 0) {
      return { isValid: false, reason: 'Requires at least one vertex' };
    }

    // Track which vertex spokes have been processed
    const markedSpokes = new Set();

    // Process each vertex and its spokes
    for (let vi = 0; vi < vertices.length; vi += 1) {
      const vertex = vertices[vi];
      const vertexTile = normalizeVertexTile(state.tiles[vertex.index]);

      vertexTile.forEach((startDir) => {
        const spokeKey = `${vertex.index}:${startDir}`;
        if (markedSpokes.has(spokeKey)) return; // Already processed

        // Mark this spoke as processed
        markedSpokes.add(spokeKey);

        // Trace the arc from this vertex spoke
        const path = [{ index: vertex.index, dir: startDir }];
        let current = { index: vertex.index, dir: startDir };

        while (true) {
          const row = Math.floor(current.index / state.cols);
          const col = current.index % state.cols;
          const next = neighbor(row, col, current.dir, state.rows, state.cols, lattice, state.wrapped);

          if (!next) {
            // Open end - this is a leg
            legs.push({
              vertex: vertex.index,
              spoke: startDir,
              path: path.slice()
            });
            break;
          }

          const nextIndex = indexOf(next.row, next.col, state.cols);
          const opposite = lattice.opposite[current.dir];

          if (isVertexTileValue(state.tiles[nextIndex])) {
            // Only a matching spoke on the target vertex closes a dual graph edge.
            if (vertexTileHasSpoke(nextIndex, opposite)) {
              const endSpokeKey = `${nextIndex}:${opposite}`;
              markedSpokes.add(endSpokeKey); // Mark the other end too

              edges.push({
                from: vertex.index,
                to: nextIndex,
                fromSpoke: startDir,
                toSpoke: opposite,
                path: path.slice()
              });
            } else {
              legs.push({
                vertex: vertex.index,
                spoke: startDir,
                path: path.concat({ index: nextIndex, dir: opposite })
              });
            }
            break;
          }

          // Continue tracing through the tile
          const tile = normalizeTile(state.tiles[nextIndex]);
          let nextDir = null;
          for (const pair of tile) {
            if (pair[0] === opposite) {
              nextDir = pair[1];
              break;
            }
            if (pair[1] === opposite) {
              nextDir = pair[0];
              break;
            }
          }

          if (nextDir == null) {
            // Dead end - this is a leg
            legs.push({
              vertex: vertex.index,
              spoke: startDir,
              path: path.slice()
            });
            break;
          }

          current = { index: nextIndex, dir: nextDir };
          path.push(current);
        }
      });
    }

    return { isValid: true, vertices, edges, legs };
  }

  function dualGraphInvariants(graphData) {
    const vertices = graphData.vertices.length;
    const edges = graphData.edges.length;
    const halfEdges = graphData.legs.length;
    const components = countDualGraphComponents(graphData);
    const cycleRank = Math.max(0, edges - vertices + components);
    const vertexGenus = graphData.vertices.reduce((total, vertex) => (
      total + vertexDecorationValue(vertex.index)
    ), 0);
    const genus = vertexGenus + cycleRank;
    const eulerCharacteristic = (2 * components) - (2 * genus) - halfEdges;

    return {
      vertices,
      edges,
      halfEdges,
      components,
      cycleRank,
      vertexGenus,
      genus,
      eulerCharacteristic
    };
  }

  function formatDualGraphInvariants(graphData) {
    const inv = dualGraphInvariants(graphData);
    return `<dl class="slice-invariant-list">
      <dt>g</dt><dd>${inv.genus}</dd>
      <dt>n</dt><dd>${inv.halfEdges}</dd>
      <dt>b<sub>1</sub></dt><dd>${inv.cycleRank}</dd>
    </dl>`;
  }

  function syncDualGraphInvariantVisibility() {
    const expanded = state.dualGraphInvariantsExpanded;
    if (refs.dualGraphInvariantPanel) refs.dualGraphInvariantPanel.hidden = !expanded;
    if (refs.dualGraphInvariantToggle) {
      refs.dualGraphInvariantToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      refs.dualGraphInvariantToggle.setAttribute('title', expanded ? 'hide invariants' : 'show invariants');
      refs.dualGraphInvariantToggle.setAttribute('aria-label', expanded ? 'hide invariants' : 'show invariants');
      refs.dualGraphInvariantToggle.innerHTML = expanded ? '&#9662;' : '&#9656;';
    }
  }

  function countDualGraphComponents(graphData) {
    const vertices = graphData.vertices.map((vertex) => vertex.index);
    if (!vertices.length) return 0;

    const parent = new Map(vertices.map((index) => [index, index]));
    const findRoot = (index) => {
      const current = parent.get(index);
      if (current === index) return index;
      const root = findRoot(current);
      parent.set(index, root);
      return root;
    };
    const unite = (left, right) => {
      const leftRoot = findRoot(left);
      const rightRoot = findRoot(right);
      if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
    };

    graphData.edges.forEach((edge) => {
      if (parent.has(edge.from) && parent.has(edge.to)) unite(edge.from, edge.to);
    });

    return new Set(vertices.map(findRoot)).size;
  }

  function buildDualGraphExport(report, lattice) {
    const graphData = collectDualGraphData(report);
    if (!graphData.isValid) {
      return {
        isValid: false,
        status: graphData.reason || 'Not available',
        vertices: [],
        edges: [],
        legs: []
      };
    }

    return {
      isValid: true,
      status: `${graphData.vertices.length} vertices, ${graphData.edges.length} edges, ${graphData.legs.length} legs`,
      vertices: graphData.vertices.map((vertex) => ({
        index: vertex.index,
        row: vertex.row + 1,
        col: vertex.col + 1,
        decoration: vertexDecorationValue(vertex.index),
        spokes: normalizeVertexTile(state.tiles[vertex.index]).map((dir) => ({
          dir,
          name: lattice.dirNames[dir]
        })),
        layout: dualGraphNodeExport(`v${vertex.index}`)
      })),
      edges: graphData.edges.map((edge, edgeIndex) => ({
        index: edgeIndex,
        from: edge.from,
        to: edge.to,
        fromSpoke: {
          dir: edge.fromSpoke,
          name: lattice.dirNames[edge.fromSpoke]
        },
        toSpoke: {
          dir: edge.toSpoke,
          name: lattice.dirNames[edge.toSpoke]
        },
        path: exportDualGraphPath(edge.path, lattice),
        layoutControls: edge.from === edge.to
          ? [`e${edgeIndex}_0`, `e${edgeIndex}_1`, `e${edgeIndex}_2`].map(dualGraphNodeExport).filter(Boolean)
          : [dualGraphNodeExport(`e${edgeIndex}`)].filter(Boolean)
      })),
      legs: graphData.legs.map((leg, legIndex) => ({
        index: legIndex,
        vertex: leg.vertex,
        spoke: {
          dir: leg.spoke,
          name: lattice.dirNames[leg.spoke]
        },
        path: exportDualGraphPath(leg.path, lattice),
        layout: dualGraphNodeExport(`l${legIndex}`)
      }))
    };
  }

  function buildDualGraphOnlyExport(report) {
    const graphData = collectDualGraphData(report);
    if (!graphData.isValid) {
      return {
        vertices: [],
        edges: [],
        halfEdges: []
      };
    }

    const vertexIds = new Map();
    graphData.vertices.forEach((vertex, vertexIndex) => {
      vertexIds.set(vertex.index, vertexIndex + 1);
    });

    return {
      vertices: graphData.vertices.map((vertex, vertexIndex) => ({
        id: vertexIndex + 1,
        decoration: vertexDecorationValue(vertex.index)
      })),
      edges: graphData.edges.map((edge) => ({
        from: vertexIds.get(edge.from),
        to: vertexIds.get(edge.to)
      })),
      halfEdges: graphData.legs.map((leg) => ({
        vertex: vertexIds.get(leg.vertex)
      }))
    };
  }

  function exportDualGraphPath(path, lattice) {
    return path.map((step) => ({
      index: step.index,
      row: Math.floor(step.index / state.cols) + 1,
      col: (step.index % state.cols) + 1,
      dir: step.dir,
      name: lattice.dirNames[step.dir]
    }));
  }

  function dualGraphNodeExport(id) {
    if (!state.dualGraphLayout || !state.dualGraphLayout.nodeMap) return null;
    const node = state.dualGraphLayout.nodeMap.get(id);
    if (!node) return null;
    return {
      x: Number(node.x.toFixed(2)),
      y: Number(node.y.toFixed(2))
    };
  }

  function renderDualGraphVisualization(graphData) {
    if (!state.showDualGraphCanvas) return;
    const canvas = refs.dualGraphCanvas;
    if (!canvas) return;

    // Ensure canvas matches display size
    const rect = canvas.getBoundingClientRect();
    const displayWidth = Math.round(rect.width);
    const displayHeight = Math.round(rect.height);
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      // If layout exists but was for a different size, scale it
      if (state.dualGraphLayout) {
        const sx = displayWidth / state.dualGraphLayout.width;
        const sy = displayHeight / state.dualGraphLayout.height;
        state.dualGraphLayout.nodes.forEach((node) => {
          node.x *= sx;
          node.y *= sy;
        });
        state.dualGraphLayout.width = displayWidth;
        state.dualGraphLayout.height = displayHeight;
      }
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Get or create layout
    ensureDualGraphLayout(graphData);

    const layout = state.dualGraphLayout;

    // Draw edges using virtual nodes
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;

    graphData.edges.forEach((edge, i) => {
      const fromNode = layout.nodeMap.get(`v${edge.from}`);
      const toNode = layout.nodeMap.get(`v${edge.to}`);

      if (!fromNode || !toNode) return;

      if (edge.from === edge.to) {
        // Loop: draw through 3 virtual nodes
        const node0 = layout.nodeMap.get(`e${i}_0`);
        const node1 = layout.nodeMap.get(`e${i}_1`);
        const node2 = layout.nodeMap.get(`e${i}_2`);

        if (node0 && node1 && node2) {
          // Draw smooth curve through all 3 virtual nodes
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.quadraticCurveTo(node0.x, node0.y, (node0.x + node1.x) / 2, (node0.y + node1.y) / 2);
          ctx.quadraticCurveTo(node1.x, node1.y, (node1.x + node2.x) / 2, (node1.y + node2.y) / 2);
          ctx.quadraticCurveTo(node2.x, node2.y, fromNode.x, fromNode.y);
          ctx.stroke();
        }
      } else {
        // Regular edge: single virtual node
        const edgeNode = layout.nodeMap.get(`e${i}`);
        if (edgeNode) {
          // Draw as quadratic curve through virtual node
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.quadraticCurveTo(edgeNode.x, edgeNode.y, toNode.x, toNode.y);
          ctx.stroke();
        }
      }
    });

    // Draw legs using virtual nodes
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;

    graphData.legs.forEach((leg, i) => {
      const legNode = layout.nodeMap.get(`l${i}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);

      if (!legNode || !vertexNode) return;

      ctx.beginPath();
      ctx.moveTo(vertexNode.x, vertexNode.y);
      ctx.lineTo(legNode.x, legNode.y);
      ctx.stroke();

      // Draw virtual node
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(legNode.x, legNode.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw vertices on top
    graphData.vertices.forEach((vertex) => {
      const node = layout.nodeMap.get(`v${vertex.index}`);
      if (node) {
        drawDualGraphVertex(ctx, node.x, node.y, vertexDecorationValue(vertex.index));
      }
    });
  }

  function drawDualGraphVertex(ctx, x, y, decoration) {
    const text = decoration ? String(decoration) : '';
    const fontSize = 11;
    let radius = 8;
    if (text) {
      ctx.save();
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      const metrics = ctx.measureText(text);
      radius = Math.max(radius, metrics.width / 2 + 4, fontSize * 0.68);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#1e40af';
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    if (text) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.fillText(text, x, y + fontSize * 0.03);
    }
    ctx.restore();
  }

  function renderRiemannSurfaceVisualization(graphData) {
    if (!state.showRiemannSurfaceCanvas) return;
    const canvas = refs.riemannSurfaceCanvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayWidth = Math.round(rect.width) || canvas.width || 300;
    const displayHeight = Math.round(rect.height) || canvas.height || 170;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, width, height);

    if (state.selectedRiemannVertex != null && !graphData.vertices.some((vertex) => vertex.index === state.selectedRiemannVertex)) {
      state.selectedRiemannVertex = null;
    }

    const model = calculateRiemannSurfaceModel(graphData, width, height);
    state.riemannSurfaceModel = model;
    if (!model.surfaces.size) return;

    drawRiemannSurfaceDomains(ctx, model);
    if (state.showRiemannBezierCurve) drawRiemannSurfaceDebugBezierCurves(ctx, model);
    if (state.showRiemannDebugCircles) drawRiemannSurfaceDebugCircles(ctx, model);
    drawRiemannSurfaceNodes(ctx, model);
  }

  function calculateRiemannSurfaceModel(graphData, width, height) {
    const layoutMap = state.dualGraphLayout && state.dualGraphLayout.nodeMap
      ? state.dualGraphLayout.nodeMap
      : null;
    const sources = graphData.vertices.map((vertex) => {
      const node = layoutMap ? layoutMap.get(`v${vertex.index}`) : null;
      return {
        index: vertex.index,
        x: node ? node.x : vertex.col,
        y: node ? node.y : vertex.row
      };
    });
    const padding = 38;
    const boundsSources = sources.slice();
    if (layoutMap) {
      graphData.edges.forEach((edge, edgeIndex) => {
        const node = edge.from === edge.to
          ? layoutMap.get(`e${edgeIndex}_1`)
          : layoutMap.get(`e${edgeIndex}`);
        if (node) boundsSources.push({ x: node.x, y: node.y });
      });
    }
    const bounds = pointBounds(boundsSources);
    const sourceWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const sourceHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const scale = sources.length <= 1
      ? 1
      : Math.min((width - padding * 2) / sourceWidth, (height - padding * 2) / sourceHeight);
    const sourceCenter = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
    const targetCenter = { x: width / 2, y: height / 2 };
    const mapPoint = (point) => ({
      x: targetCenter.x + ((point.x - sourceCenter.x) * scale),
      y: targetCenter.y + ((point.y - sourceCenter.y) * scale)
    });

    const surfaces = new Map();
    sources.forEach((source) => {
      const point = mapPoint(source);
      surfaces.set(source.index, {
        vertexIndex: source.index,
        x: point.x,
        y: point.y,
        color: riemannSurfaceColor(surfaces.size),
        genus: vertexDecorationValue(source.index),
        arms: [],
        marks: []
      });
    });

    const centers = Array.from(surfaces.values());
    const minDistance = nearestSurfaceDistance(centers);
    const defaultRadius = Math.min(36, Math.min(width, height) * 0.16);
    const radius = clamp(minDistance ? Math.min(defaultRadius, minDistance * 0.3) : defaultRadius, 16, 42);
    const tubeWidth = clamp(radius * 0.72, 13, 24);
    centers.forEach((surface) => {
      surface.radius = radius;
      surface.tubeWidth = tubeWidth;
      const radii = riemannNodeRadiiForSurface(surface);
      surface.coreNode = {
        x: surface.x,
        y: surface.y,
        radius: radii[0]
      };
    });

    const nodeMarks = [];
    const debugNodes = [];
    centers.forEach((surface) => addRiemannDebugNodes(debugNodes, [surface.coreNode]));
    const pairTotals = new Map();
    graphData.edges.forEach((edge) => {
      const key = edgePairKey(edge);
      pairTotals.set(key, (pairTotals.get(key) || 0) + 1);
    });
    const pairSeen = new Map();

    graphData.edges.forEach((edge, edgeIndex) => {
      const from = surfaces.get(edge.from);
      const to = surfaces.get(edge.to);
      if (!from || !to) return;

      if (edge.from === edge.to) {
        const loopNode = layoutMap ? layoutMap.get(`e${edgeIndex}_1`) : null;
        const node = loopNode
          ? mapPoint(loopNode)
          : {
            x: from.x + Math.cos(edgeIndex * Math.PI * 0.7) * radius * 2.6,
            y: from.y - radius * 2.2
          };
        const vector = normalizeVector(node.x - from.x, node.y - from.y, 0, -1);
        const normal = { x: -vector.y, y: vector.x };
        const leftArm = createSurfaceLoopArm(from, node, vector, normal, 1, edgeIndex);
        const rightArm = createSurfaceLoopArm(from, node, vector, normal, -1, edgeIndex);
        from.arms.push(leftArm, rightArm);
        addRiemannDebugNodes(debugNodes, leftArm.controlNodes.slice(1));
        addRiemannDebugNodes(debugNodes, rightArm.controlNodes.slice(1));
        nodeMarks.push({ type: 'regular', x: node.x, y: node.y });
        return;
      }

      const key = edgePairKey(edge);
      const seen = pairSeen.get(key) || 0;
      pairSeen.set(key, seen + 1);
      const total = pairTotals.get(key) || 1;
      const edgeNode = layoutMap ? layoutMap.get(`e${edgeIndex}`) : null;
      let node = edgeNode ? mapPoint(edgeNode) : {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2
      };
      if (!edgeNode && total > 1) {
        const vector = normalizeVector(to.x - from.x, to.y - from.y, 1, 0);
        const normal = { x: -vector.y, y: vector.x };
        const offset = (seen - (total - 1) / 2) * Math.min(18, radius * 0.9);
        node = {
          x: node.x + normal.x * offset,
          y: node.y + normal.y * offset
        };
      }
      const edgeVector = normalizeVector(to.x - from.x, to.y - from.y, 1, 0);
      const edgeArms = createSurfaceEdgeArms(from, to, node, edgeVector, edgeIndex);
      from.arms.push(edgeArms.from);
      to.arms.push(edgeArms.to);
      addRiemannDebugNodes(debugNodes, edgeArms.controlNodes);
      nodeMarks.push({ type: 'regular', x: node.x, y: node.y });
    });

    const legsByVertex = new Map();
    graphData.legs.forEach((leg, index) => {
      if (!legsByVertex.has(leg.vertex)) legsByVertex.set(leg.vertex, []);
      legsByVertex.get(leg.vertex).push(index + 1);
    });
    legsByVertex.forEach((labels, vertexIndex) => {
      const surface = surfaces.get(vertexIndex);
      if (!surface) return;
      const samples = sampleRiemannSurfaceInterior(surface, labels.length + surface.genus + 5);
      labels.forEach((label, index) => {
        const point = samples.marked[index] || sampleRiemannSurfacePoint(surface, index + 17, 0.46);
        surface.marks.push({
          label,
          x: point.x,
          y: point.y
        });
      });
      surface.handlePoints = samples.handles.slice(0, Math.max(surface.genus, 0));
    });
    centers.forEach((surface) => {
      if (surface.handlePoints) return;
      surface.handlePoints = sampleRiemannSurfaceInterior(surface, surface.genus + 3).handles.slice(0, Math.max(surface.genus, 0));
    });

    return { surfaces, nodeMarks, debugNodes, radius, tubeWidth };
  }

  function drawRiemannSurfaceDomains(ctx, model) {
    const boundaryWidth = 2.4;
    orderedRiemannSurfaces(model).forEach((surface) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#111111';
      surface.arms.forEach((arm) => drawSurfaceArm(ctx, arm, 0));
      drawSurfaceBody(ctx, surface, surfaceCoreRadius(surface));
      ctx.fillStyle = surface.color;
      surface.arms.forEach((arm) => drawSurfaceArm(ctx, arm, -boundaryWidth));
      drawSurfaceBody(ctx, surface, Math.max(0.1, surfaceCoreRadius(surface) - boundaryWidth));
      ctx.restore();
      drawRiemannSurfaceGenusForSurface(ctx, surface);
      drawRiemannSurfaceMarkedPointsForSurface(ctx, surface);
    });
  }

  function drawRiemannSurfaceGenus(ctx, model) {
    orderedRiemannSurfaces(model).forEach((surface) => {
      drawRiemannSurfaceGenusForSurface(ctx, surface);
    });
  }

  function drawRiemannSurfaceGenusForSurface(ctx, surface) {
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    const coreRadius = surfaceCoreRadius(surface);
    const handles = Math.min(surface.genus, 3);
    for (let index = 0; index < handles; index += 1) {
      const point = surface.handlePoints && surface.handlePoints[index]
        ? surface.handlePoints[index]
        : sampleRiemannSurfacePoint(surface, 101 + index, 0.38);
      drawRiemannSurfaceHole(ctx, point.x, point.y, coreRadius);
    }
    if (surface.genus > 3) {
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#111111';
      ctx.fillText(`g=${surface.genus}`, surface.x, surface.y + coreRadius * 0.58);
    }
    ctx.restore();
  }

  function drawRiemannSurfaceHole(ctx, x, y, coreRadius) {
    const halfWidth = clamp(coreRadius * 0.22, 6, 11);
    const extension = clamp(coreRadius * 0.08, 2.5, 4.5);
    const upperDepth = clamp(coreRadius * 0.1, 3.2, 5.5);
    const lowerDepth = clamp(coreRadius * 0.2, 5, 10);
    const upperLeft = { x: x - halfWidth, y };
    const upperRight = { x: x + halfWidth, y };
    const lowerLeft = { x: x - halfWidth - extension, y: y + upperDepth * 0.12 };
    const lowerRight = { x: x + halfWidth + extension, y: y + upperDepth * 0.12 };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(upperLeft.x, upperLeft.y);
    ctx.quadraticCurveTo(x, y - upperDepth, upperRight.x, upperRight.y);
    ctx.quadraticCurveTo(x + halfWidth + extension * 0.55, y + upperDepth * 0.12, lowerRight.x, lowerRight.y);
    ctx.quadraticCurveTo(x, y + lowerDepth, lowerLeft.x, lowerLeft.y);
    ctx.quadraticCurveTo(x - halfWidth - extension * 0.55, y + upperDepth * 0.12, upperLeft.x, upperLeft.y);
    ctx.closePath();
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawRiemannSurfaceDebugCircles(ctx, model) {
    if (!model.debugNodes || !model.debugNodes.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.74)';
    ctx.fillStyle = 'rgba(37, 99, 235, 0.07)';
    ctx.lineWidth = 1.1;
    model.debugNodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawRiemannSurfaceDebugBezierCurves(ctx, model) {
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 64, 175, 0.88)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    const edgeGroups = new Map();
    const loopGroups = new Map();

    orderedRiemannSurfaces(model).forEach((surface) => {
      surface.arms.forEach((arm) => {
        if (!arm.bezier) return;
        if (arm.kind === 'loop') {
          const key = arm.loopId == null ? `${arm.bezier.end.x},${arm.bezier.end.y}` : arm.loopId;
          if (!loopGroups.has(key)) loopGroups.set(key, []);
          loopGroups.get(key).push(arm);
        } else if (arm.kind === 'edge') {
          const key = arm.edgeId == null ? `${arm.bezier.end.x},${arm.bezier.end.y}` : arm.edgeId;
          if (!edgeGroups.has(key)) edgeGroups.set(key, []);
          edgeGroups.get(key).push(arm);
        } else {
          drawRiemannDebugBezierArm(ctx, arm);
        }
      });
    });

    loopGroups.forEach((arms) => {
      const first = arms.find((arm) => arm.side > 0) || arms[0];
      const second = arms.find((arm) => arm !== first);
      if (second) drawRiemannDebugBezierPair(ctx, first, second);
      else drawRiemannDebugBezierArm(ctx, first);
    });

    edgeGroups.forEach((arms) => {
      const first = arms.find((arm) => arm.edgeSide === 'from') || arms[0];
      const second = arms.find((arm) => arm !== first);
      if (second) drawRiemannDebugBezierPair(ctx, first, second);
      else drawRiemannDebugBezierArm(ctx, first);
    });
    ctx.restore();
  }

  function drawRiemannDebugBezierPair(ctx, first, second) {
    ctx.beginPath();
    ctx.moveTo(first.bezier.start.x, first.bezier.start.y);
    ctx.bezierCurveTo(
      first.bezier.controlA.x,
      first.bezier.controlA.y,
      first.bezier.controlB.x,
      first.bezier.controlB.y,
      first.bezier.end.x,
      first.bezier.end.y
    );
    ctx.bezierCurveTo(
      second.bezier.controlB.x,
      second.bezier.controlB.y,
      second.bezier.controlA.x,
      second.bezier.controlA.y,
      second.bezier.start.x,
      second.bezier.start.y
    );
    ctx.stroke();
  }

  function drawRiemannDebugBezierArm(ctx, arm) {
    ctx.beginPath();
    ctx.moveTo(arm.bezier.start.x, arm.bezier.start.y);
    ctx.bezierCurveTo(
      arm.bezier.controlA.x,
      arm.bezier.controlA.y,
      arm.bezier.controlB.x,
      arm.bezier.controlB.y,
      arm.bezier.end.x,
      arm.bezier.end.y
    );
    ctx.stroke();
  }

  function drawRiemannSurfaceNodes(ctx, model) {
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.fillStyle = '#2563eb';
    ctx.lineWidth = 2;
    model.nodeMarks.forEach((mark) => {
      if (mark.type === 'self') {
        const left = mark.points[0];
        const right = mark.points[1];
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.quadraticCurveTo((left.x + right.x) / 2, Math.min(left.y, right.y) - model.radius * 0.7, right.x, right.y);
        ctx.stroke();
        drawSurfacePoint(ctx, left.x, left.y, 3.8);
        drawSurfacePoint(ctx, right.x, right.y, 3.8);
      } else {
        drawSurfacePoint(ctx, mark.x, mark.y, 4.2);
      }
    });
    ctx.restore();
  }

  function drawRiemannSurfaceMarkedPoints(ctx, model) {
    ctx.save();
    ctx.fillStyle = '#dc2626';
    orderedRiemannSurfaces(model).forEach((surface) => {
      drawRiemannSurfaceMarkedPointsForSurface(ctx, surface);
    });
    ctx.restore();
  }

  function drawRiemannSurfaceMarkedPointsForSurface(ctx, surface) {
    ctx.save();
    ctx.fillStyle = '#dc2626';
    surface.marks.forEach((mark) => {
      drawSurfacePoint(ctx, mark.x, mark.y, 4.2);
    });
    ctx.restore();
  }

  function orderedRiemannSurfaces(model) {
    const surfaces = Array.from(model.surfaces.values());
    if (state.selectedRiemannVertex == null) return surfaces;
    return surfaces.sort((left, right) => {
      if (left.vertexIndex === state.selectedRiemannVertex) return -1;
      if (right.vertexIndex === state.selectedRiemannVertex) return 1;
      return 0;
    });
  }

  function handleRiemannSurfaceClick(event) {
    if (!state.showRiemannSurfaceCanvas || !state.riemannSurfaceModel || !state.dualGraphData || !refs.riemannSurfaceCanvas) return;
    const canvas = refs.riemannSurfaceCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const hit = hitRiemannSurfaceComponent(state.riemannSurfaceModel, x, y);
    state.selectedRiemannVertex = hit;
    if (state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
  }

  function hitRiemannSurfaceComponent(model, x, y) {
    const surfaces = orderedRiemannSurfaces(model).slice().reverse();
    for (const surface of surfaces) {
      const bodyHit = Math.hypot(x - surface.x, y - surface.y) <= surfaceCoreRadius(surface);
      if (bodyHit) return surface.vertexIndex;
      for (const arm of surface.arms) {
        if ((arm.nodes || []).some((node) => Math.hypot(x - node.x, y - node.y) <= node.radius + 4)) {
          return surface.vertexIndex;
        }
      }
    }
    return null;
  }

  function createSurfaceArm(surface, target, tangentVector = null) {
    const vector = normalizeVector(target.x - surface.x, target.y - surface.y, 1, 0);
    const tangent = tangentVector
      ? normalizeVector(tangentVector.x, tangentVector.y, vector.x, vector.y)
      : vector;
    const distance = Math.hypot(target.x - surface.x, target.y - surface.y);
    const radii = riemannNodeRadiiForSurface(surface);
    const start = {
      x: surface.x,
      y: surface.y
    };
    const end = {
      x: target.x,
      y: target.y
    };
    const startControlDistance = Math.max(surface.radius * 0.65, distance * 0.3);
    const endControlDistance = Math.max(surface.tubeWidth * 1.15, distance * 0.24);
    const startControl = {
      x: start.x + vector.x * startControlDistance,
      y: start.y + vector.y * startControlDistance
    };
    const endControl = {
      x: end.x - tangent.x * endControlDistance,
      y: end.y - tangent.y * endControlDistance
    };
    const controlNodes = sampleSurfaceArmNodes(start, startControl, endControl, end, radii);
    shapeIntermediateNodeRadii(controlNodes);
    return {
      x: target.x,
      y: target.y,
      tangent,
      controlNodes,
      nodes: controlNodes.slice(0, -1)
    };
  }

  function createSurfaceLoopArm(surface, node, direction, normal, side, loopId = null) {
    const distance = Math.hypot(node.x - surface.x, node.y - surface.y);
    const bow = Math.max(surface.radius * 0.82, distance * 0.24);
    const radii = riemannNodeRadiiForSurface(surface);
    const start = {
      x: surface.x,
      y: surface.y
    };
    const startControl = {
      x: surface.x + direction.x * Math.max(surface.radius * 0.8, distance * 0.28) + normal.x * side * bow,
      y: surface.y + direction.y * Math.max(surface.radius * 0.8, distance * 0.28) + normal.y * side * bow
    };
    const nodeTangentDistance = Math.max(surface.tubeWidth * 1.25, distance * 0.22);
    const endControl = {
      x: node.x + normal.x * side * nodeTangentDistance,
      y: node.y + normal.y * side * nodeTangentDistance
    };
    const controlNodes = sampleSurfaceArmNodes(start, startControl, endControl, node, radii, riemannNodeParameters(22));
    shapeIntermediateNodeRadii(controlNodes);
    shapeLoopTangentNode(controlNodes, start, startControl, endControl, node);
    return {
      kind: 'loop',
      loopId,
      side,
      x: node.x,
      y: node.y,
      tangent: direction,
      bezier: {
        start,
        controlA: startControl,
        controlB: endControl,
        end: node
      },
      controlNodes,
      nodes: controlNodes.slice(0, -1)
    };
  }

  function createSurfaceEdgeArms(from, to, node, edgeVector, edgeId = null) {
    const edgeDir = normalizeVector(edgeVector.x, edgeVector.y, to.x - from.x, to.y - from.y);
    const fromDir = normalizeVector(node.x - from.x, node.y - from.y, edgeDir.x, edgeDir.y);
    const toDir = normalizeVector(node.x - to.x, node.y - to.y, -edgeDir.x, -edgeDir.y);
    const fromRadii = riemannNodeRadiiForSurface(from);
    const toRadii = riemannNodeRadiiForSurface(to);
    const middleRadius = Math.min(fromRadii[6], toRadii[6]);
    const fromArmRadii = [fromRadii[0], fromRadii[1], fromRadii[2], fromRadii[3], fromRadii[4], 1, middleRadius];
    const toArmRadii = [toRadii[0], toRadii[1], toRadii[2], toRadii[3], toRadii[4], 1, middleRadius];
    const fromStart = {
      x: from.x,
      y: from.y
    };
    const toStart = {
      x: to.x,
      y: to.y
    };
    const fromDistance = Math.max(Math.hypot(node.x - fromStart.x, node.y - fromStart.y), 1);
    const toDistance = Math.max(Math.hypot(node.x - toStart.x, node.y - toStart.y), 1);
    const fromNodeHandle = Math.max(from.radius * 0.7, fromDistance * 0.26);
    const toNodeHandle = Math.max(to.radius * 0.7, toDistance * 0.26);
    const fromControls = {
      a: {
        x: fromStart.x + fromDir.x * Math.max(from.radius * 0.72, fromDistance * 0.34),
        y: fromStart.y + fromDir.y * Math.max(from.radius * 0.72, fromDistance * 0.34)
      },
      b: {
        x: node.x - edgeDir.x * fromNodeHandle,
        y: node.y - edgeDir.y * fromNodeHandle
      }
    };
    const toControls = {
      a: {
        x: toStart.x + toDir.x * Math.max(to.radius * 0.72, toDistance * 0.34),
        y: toStart.y + toDir.y * Math.max(to.radius * 0.72, toDistance * 0.34)
      },
      b: {
        x: node.x + edgeDir.x * toNodeHandle,
        y: node.y + edgeDir.y * toNodeHandle
      }
    };

    const fromNodes = sampleSurfaceArmNodes(fromStart, fromControls.a, fromControls.b, node, fromArmRadii, riemannNodeParameters(6));
    const toNodes = sampleSurfaceArmNodes(toStart, toControls.a, toControls.b, node, toArmRadii, riemannNodeParameters(6));
    shapeIntermediateNodeRadii(fromNodes);
    shapeIntermediateNodeRadii(toNodes);
    const controlNodes = [
      ...fromNodes.slice(1),
      ...toNodes.slice(1, -1).reverse()
    ];

    return {
      controlNodes,
      from: {
        kind: 'edge',
        edgeId,
        edgeSide: 'from',
        x: node.x,
        y: node.y,
        tangent: edgeDir,
        controlNodeCount: 6,
        bezier: {
          start: fromStart,
          controlA: fromControls.a,
          controlB: fromControls.b,
          end: node
        },
        controlNodes,
        nodes: fromNodes.slice(0, -1)
      },
      to: {
        kind: 'edge',
        edgeId,
        edgeSide: 'to',
        x: node.x,
        y: node.y,
        tangent: { x: -edgeDir.x, y: -edgeDir.y },
        controlNodeCount: 6,
        bezier: {
          start: toStart,
          controlA: toControls.a,
          controlB: toControls.b,
          end: node
        },
        controlNodes,
        nodes: toNodes.slice(0, -1)
      }
    };
  }

  function shapeIntermediateNodeRadii(nodes) {
    if (nodes.length < 2) return;
    const node = nodes[nodes.length - 1];
    let passIndex = nodes.length - 2;
    for (let index = nodes.length - 2; index > 0; index -= 1) {
      if ((nodes[index].t || 0) < 1 - 0.0001) {
        passIndex = index;
        break;
      }
    }
    const passNode = nodes[passIndex];
    passNode.radius = Math.max(0.1, Math.hypot(node.x - passNode.x, node.y - passNode.y));
    for (let index = 1; index < passIndex; index += 1) {
      nodes[index].radius = (((passIndex - index) * nodes[0].radius) + (index * passNode.radius)) / passIndex;
    }
    for (let index = passIndex + 1; index < nodes.length - 1; index += 1) {
      nodes[index].radius = passNode.radius;
    }
  }

  function shapeLoopTangentNode(nodes, start, controlA, controlB, end) {
    if (nodes.length <= RIEMANN_LOOP_FINAL_INDEX || !nodes[RIEMANN_LOOP_PASS_INDEX]) return;
    const passNode = nodes[RIEMANN_LOOP_PASS_INDEX];
    const finalNode = nodes[RIEMANN_LOOP_FINAL_INDEX];
    const currentDx = passNode.x - finalNode.x;
    const currentDy = passNode.y - finalNode.y;
    const currentDistance = Math.hypot(currentDx, currentDy);
    const currentRadius = passNode.radius;
    const derivative = cubicDerivative(start, controlA, controlB, end, 1);
    const fallbackTangent = normalizeVector(finalNode.x - passNode.x, finalNode.y - passNode.y, 1, 0);
    const tangent = normalizeVector(derivative.x, derivative.y, fallbackTangent.x, fallbackTangent.y);
    const side = (currentDx * tangent.x) + (currentDy * tangent.y) < 0 ? -1 : 1;
    const scale = normalizeRiemannLoopTangentScaleInput(state.riemannLoopTangentScale);
    passNode.x = finalNode.x + (tangent.x * side * currentDistance * scale);
    passNode.y = finalNode.y + (tangent.y * side * currentDistance * scale);
    passNode.radius = Math.max(0.1, currentRadius * scale);
    for (let index = 1; index < RIEMANN_LOOP_PASS_INDEX; index += 1) {
      nodes[index].radius = (((RIEMANN_LOOP_PASS_INDEX - index) * nodes[0].radius) + (index * passNode.radius)) / RIEMANN_LOOP_PASS_INDEX;
    }
  }

  function sampleSurfaceArmNodes(start, controlA, controlB, end, radii, parameters = riemannNodeParameters(6)) {
    return parameters.map((t, step) => {
      const point = cubicPoint(start, controlA, controlB, end, t);
      const radiusIndex = Math.min(Math.round(t * (radii.length - 1)), radii.length - 1);
      return {
        x: point.x,
        y: point.y,
        radius: radii[radiusIndex],
        t
      };
    });
  }

  function addRiemannDebugNodes(target, nodes) {
    (nodes || []).forEach((node, index) => {
      target.push({
        x: node.x,
        y: node.y,
        radius: node.radius,
        index
      });
    });
  }

  function riemannNodeRadiiForSurface(surface) {
    return DEFAULT_RIEMANN_NODE_RADII.map((fallback, index) => {
      const scale = normalizeRiemannNodeRadiusInput(state.riemannNodeRadii[index], fallback);
      return clamp(surface.radius * scale, 2.6, surface.radius * 1.18);
    });
  }

  function riemannNodeParameters(finalIndex = 6) {
    if (finalIndex === RIEMANN_LOOP_FINAL_INDEX) {
      normalizeRiemannLoopNodePositions();
      const passT = DEFAULT_RIEMANN_NODE_POSITIONS[5];
      return state.riemannLoopNodePositions.map((position, index) => {
        if (index === 0) return 0;
        if (index >= RIEMANN_LOOP_PASS_INDEX) return index === RIEMANN_LOOP_PASS_INDEX ? passT : 1;
        return passT * normalizeRiemannLoopNodePositionInput(position, DEFAULT_RIEMANN_LOOP_NODE_POSITIONS[index]);
      });
    }
    return DEFAULT_RIEMANN_NODE_POSITIONS.slice();
  }

  function surfaceCoreRadius(surface) {
    return surface.coreNode ? surface.coreNode.radius : surface.radius;
  }

  function normalizeRiemannNodeRadiusInput(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return clamp(number, 0.08, 1.1);
  }

  function normalizeRiemannLoopNodePositionInput(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return clamp(number, RIEMANN_LOOP_NODE_POSITION_GAP, 1 - RIEMANN_LOOP_NODE_POSITION_GAP);
  }

  function normalizeRiemannLoopTangentScaleInput(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_RIEMANN_LOOP_TANGENT_SCALE;
    return clamp(number, 0, 1);
  }

  function normalizeRiemannLoopNodePositions() {
    for (let index = 1; index < RIEMANN_LOOP_PASS_INDEX; index += 1) {
      const min = index === 1 ? RIEMANN_LOOP_NODE_POSITION_GAP : state.riemannLoopNodePositions[index - 1] + RIEMANN_LOOP_NODE_POSITION_GAP;
      const max = 1 - ((RIEMANN_LOOP_PASS_INDEX - index) * RIEMANN_LOOP_NODE_POSITION_GAP);
      state.riemannLoopNodePositions[index] = clamp(
        normalizeRiemannLoopNodePositionInput(state.riemannLoopNodePositions[index], DEFAULT_RIEMANN_LOOP_NODE_POSITIONS[index]),
        min,
        max
      );
    }
    state.riemannLoopNodePositions[0] = 0;
    state.riemannLoopNodePositions[RIEMANN_LOOP_PASS_INDEX] = 1;
    state.riemannLoopNodePositions[RIEMANN_LOOP_FINAL_INDEX] = 1;
  }

  function drawSurfaceArm(ctx, arm, outline) {
    const nodes = (arm.nodes || []).map((node) => ({
      x: node.x,
      y: node.y,
      radius: Math.max(0.1, node.radius + outline)
    }));
    if (!nodes.length) return;

    for (let index = 0; index + 1 < nodes.length; index += 1) {
      drawCircleConvexHull(ctx, nodes[index], nodes[index + 1]);
    }
    nodes.forEach((node) => {
      drawSurfacePoint(ctx, node.x, node.y, node.radius);
    });
  }

  function drawCircleConvexHull(ctx, left, right) {
    const tangents = externalCircleTangents(left, right);
    if (!tangents) return;
    ctx.beginPath();
    ctx.moveTo(tangents[0].left.x, tangents[0].left.y);
    ctx.lineTo(tangents[0].right.x, tangents[0].right.y);
    ctx.lineTo(tangents[1].right.x, tangents[1].right.y);
    ctx.lineTo(tangents[1].left.x, tangents[1].left.y);
    ctx.closePath();
    ctx.fill();
  }

  function externalCircleTangents(left, right) {
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const distanceSquared = (dx * dx) + (dy * dy);
    if (distanceSquared < 0.001) return null;
    const radiusDelta = left.radius - right.radius;
    const tangentSquared = distanceSquared - (radiusDelta * radiusDelta);
    if (tangentSquared <= 0.001) return null;
    const tangentDistance = Math.sqrt(tangentSquared);
    return [1, -1].map((side) => {
      const normalX = ((dx * radiusDelta) - (side * dy * tangentDistance)) / distanceSquared;
      const normalY = ((dy * radiusDelta) + (side * dx * tangentDistance)) / distanceSquared;
      return {
        left: {
          x: left.x + (normalX * left.radius),
          y: left.y + (normalY * left.radius)
        },
        right: {
          x: right.x + (normalX * right.radius),
          y: right.y + (normalY * right.radius)
        }
      };
    });
  }

  function drawSurfaceBody(ctx, surface, radius) {
    ctx.beginPath();
    ctx.arc(surface.x, surface.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function sampleRiemannSurfaceInterior(surface, count) {
    const marked = [];
    const handles = [];
    const used = [];
    const target = Math.max(count, 1);
    const gap = clamp(surfaceCoreRadius(surface) * 0.26, 7, 13);
    const attempts = Math.max(target * 18, 36);

    for (let index = 0; index < attempts && (handles.length < target || marked.length < target); index += 1) {
      if (handles.length < target) {
        const point = sampleRiemannSurfacePoint(surface, 2000 + index, 0.82, { shrink: 0.42 });
        if (hasSampleClearance(point, used, gap)) {
          handles.push(point);
          used.push(point);
        }
      }
      if (marked.length < target) {
        const point = sampleRiemannSurfacePoint(surface, 5000 + index, 0.58, { shrink: 0.48 });
        if (hasSampleClearance(point, used, gap * 0.72)) {
          marked.push(point);
          used.push(point);
        }
      }
    }

    while (handles.length < target) {
      handles.push(sampleRiemannSurfacePoint(surface, 8000 + handles.length, 0.9, { shrink: 0.36 }));
    }
    while (marked.length < target) {
      marked.push(sampleRiemannSurfacePoint(surface, 9000 + marked.length, 0.7, { shrink: 0.44 }));
    }
    return { marked, handles };
  }

  function hasSampleClearance(point, used, gap) {
    return used.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= gap);
  }

  function sampleRiemannSurfacePoint(surface, seed, middleBias, options = {}) {
    const pieces = riemannSurfaceSamplePieces(surface);
    if (!pieces.length) return { x: surface.x, y: surface.y };
    const random = seededRandom((surface.vertexIndex + 1) * 4099 + seed * 9173);
    const circleShrink = Number.isFinite(options.shrink) ? options.shrink : 0.72;
    const hullShrink = Number.isFinite(options.shrink) ? options.shrink : 0.56;
    const middleRoll = random();
    if (middleRoll < middleBias) {
      return sampleInCircle({
        x: surface.x,
        y: surface.y,
        radius: surfaceCoreRadius(surface) * 0.62
      }, random, circleShrink);
    }
    const piece = weightedChoice(pieces, random);
    if (piece.type === 'circle') return sampleInCircle(piece, random, circleShrink);
    return sampleInHull(piece.left, piece.right, random, hullShrink);
  }

  function riemannSurfaceSamplePieces(surface) {
    const pieces = [{
      type: 'circle',
      x: surface.x,
      y: surface.y,
      radius: surfaceCoreRadius(surface)
    }];
    surface.arms.forEach((arm) => {
      const nodes = arm.nodes || [];
      nodes.forEach((node) => {
        pieces.push({
          type: 'circle',
          x: node.x,
          y: node.y,
          radius: node.radius
        });
      });
      for (let index = 0; index + 1 < nodes.length; index += 1) {
        pieces.push({
          type: 'hull',
          left: nodes[index],
          right: nodes[index + 1],
          area: circleHullAreaEstimate(nodes[index], nodes[index + 1])
        });
      }
    });
    pieces.forEach((piece) => {
      if (piece.area == null) piece.area = Math.PI * piece.radius * piece.radius;
    });
    return pieces;
  }

  function weightedChoice(items, random) {
    const total = items.reduce((sum, item) => sum + Math.max(item.area || 0, 0.001), 0);
    let target = random() * total;
    for (const item of items) {
      target -= Math.max(item.area || 0, 0.001);
      if (target <= 0) return item;
    }
    return items[items.length - 1];
  }

  function sampleInCircle(circle, random, shrink = 0.72) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * circle.radius * shrink;
    return {
      x: circle.x + Math.cos(angle) * radius,
      y: circle.y + Math.sin(angle) * radius
    };
  }

  function sampleInHull(left, right, random, shrink = 0.56) {
    const t = random();
    const base = {
      x: left.x + ((right.x - left.x) * t),
      y: left.y + ((right.y - left.y) * t)
    };
    const radius = (left.radius + ((right.radius - left.radius) * t)) * shrink;
    const direction = normalizeVector(right.x - left.x, right.y - left.y, 1, 0);
    const normal = { x: -direction.y, y: direction.x };
    const offset = (random() - 0.5) * 2 * radius;
    return {
      x: base.x + normal.x * offset,
      y: base.y + normal.y * offset
    };
  }

  function circleHullAreaEstimate(left, right) {
    const distance = Math.hypot(right.x - left.x, right.y - left.y);
    return Math.max(0.001, distance * (left.radius + right.radius));
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function cubicPoint(start, controlA, controlB, end, t) {
    const inv = 1 - t;
    const aa = inv * inv * inv;
    const ab = 3 * inv * inv * t;
    const bb = 3 * inv * t * t;
    const cc = t * t * t;
    return {
      x: start.x * aa + controlA.x * ab + controlB.x * bb + end.x * cc,
      y: start.y * aa + controlA.y * ab + controlB.y * bb + end.y * cc
    };
  }

  function cubicDerivative(start, controlA, controlB, end, t) {
    const inv = 1 - t;
    return {
      x: (3 * inv * inv * (controlA.x - start.x)) + (6 * inv * t * (controlB.x - controlA.x)) + (3 * t * t * (end.x - controlB.x)),
      y: (3 * inv * inv * (controlA.y - start.y)) + (6 * inv * t * (controlB.y - controlA.y)) + (3 * t * t * (end.y - controlB.y))
    };
  }

  function pointBounds(points) {
    if (!points.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    return points.reduce((bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y)
    }), {
      minX: points[0].x,
      maxX: points[0].x,
      minY: points[0].y,
      maxY: points[0].y
    });
  }

  function nearestSurfaceDistance(surfaces) {
    if (surfaces.length < 2) return 0;
    let best = Infinity;
    for (let left = 0; left < surfaces.length; left += 1) {
      for (let right = left + 1; right < surfaces.length; right += 1) {
        best = Math.min(best, Math.hypot(surfaces[left].x - surfaces[right].x, surfaces[left].y - surfaces[right].y));
      }
    }
    return Number.isFinite(best) ? best : 0;
  }

  function riemannSurfaceColor(index) {
    const colors = [
      '#cfe8ff',
      '#ffd7d7',
      '#dff3d6',
      '#eadcff',
      '#ffe6bd',
      '#d9f0ef',
      '#f5d4eb',
      '#e8e1c8'
    ];
    return colors[index % colors.length];
  }

  function edgePairKey(edge) {
    return edge.from === edge.to
      ? `loop:${edge.from}`
      : (edge.from < edge.to ? `${edge.from}:${edge.to}` : `${edge.to}:${edge.from}`);
  }

  function normalizeVector(dx, dy, fallbackX, fallbackY) {
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return { x: fallbackX, y: fallbackY };
    return { x: dx / length, y: dy / length };
  }

  function drawSurfacePoint(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function calculateGraphLayout(graphData, width, height) {
    // Initialize layout with virtual nodes for edges and loops
    const padding = 40;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - padding;

    const nodes = [];
    const nodeMap = new Map();
    const vertexPositions = initialDualGraphVertexPositions(graphData, width, height, padding);

    // Add vertex nodes
    graphData.vertices.forEach((vertex, i) => {
      const angle = (2 * Math.PI * i) / graphData.vertices.length - Math.PI / 2;
      const initial = vertexPositions.get(vertex.index) || {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
      const node = {
        id: `v${vertex.index}`,
        type: 'vertex',
        vertexIndex: vertex.index,
        x: initial.x,
        y: initial.y,
        vx: 0,
        vy: 0,
        fixed: false
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Add virtual nodes for edges with offset for multiple edges
    const edgeCountMap = new Map();
    graphData.edges.forEach((edge, i) => {
      const fromNode = nodeMap.get(`v${edge.from}`);
      const toNode = nodeMap.get(`v${edge.to}`);
      if (!fromNode || !toNode) return;

      // Track multiple edges between same vertices
      const key = edge.from === edge.to
        ? `loop:${edge.from}`
        : (edge.from < edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`);
      const count = edgeCountMap.get(key) || 0;
      edgeCountMap.set(key, count + 1);

      if (edge.from === edge.to) {
        // Loop: vertex + 3 handles start as a 60-degree parallelogram.
        const loopHandles = initialLoopHandlePositions(fromNode, count);
        loopHandles.forEach((position, j) => {
          const node = {
            id: `e${i}_${j}`,
            type: 'edge',
            edgeIndex: i,
            loopPart: j,
            from: edge.from,
            to: edge.to,
            x: position.x,
            y: position.y,
            vx: 0,
            vy: 0,
            fixed: false
          };
          nodes.push(node);
          nodeMap.set(node.id, node);
        });
      } else {
        // Regular edge: single virtual node with offset for multiples
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const offset = (count - 0.5) * 25;

        const node = {
          id: `e${i}`,
          type: 'edge',
          edgeIndex: i,
          from: edge.from,
          to: edge.to,
          x: midX + perpX * offset,
          y: midY + perpY * offset,
          vx: 0,
          vy: 0,
          fixed: false
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
      }
    });

    // Add virtual nodes for legs with even distribution
    const legCountMap = new Map();
    graphData.legs.forEach((leg, i) => {
      const fromNode = nodeMap.get(`v${leg.vertex}`);
      if (!fromNode) return;

      const count = legCountMap.get(leg.vertex) || 0;
      legCountMap.set(leg.vertex, count + 1);

      const angle = (count * Math.PI * 2 / Math.max(graphData.legs.filter(l => l.vertex === leg.vertex).length, 1));
      const dist = 50;
      const node = {
        id: `l${i}`,
        type: 'leg',
        legIndex: i,
        vertex: leg.vertex,
        x: fromNode.x + Math.cos(angle) * dist,
        y: fromNode.y + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        fixed: false
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    return { nodes, nodeMap, width, height };
  }

  function initialLoopHandlePositions(vertexNode, loopIndex) {
    const sideLength = 46;
    const baseAngle = (loopIndex * Math.PI * 2 / 3) + Math.PI / 6;
    const nextAngle = baseAngle + (Math.PI / 3);
    const a = {
      x: Math.cos(baseAngle) * sideLength,
      y: Math.sin(baseAngle) * sideLength
    };
    const b = {
      x: Math.cos(nextAngle) * sideLength,
      y: Math.sin(nextAngle) * sideLength
    };

    return [
      { x: vertexNode.x + a.x, y: vertexNode.y + a.y },
      { x: vertexNode.x + a.x + b.x, y: vertexNode.y + a.y + b.y },
      { x: vertexNode.x + b.x, y: vertexNode.y + b.y }
    ];
  }

  function initialDualGraphVertexPositions(graphData, width, height, padding) {
    const positions = new Map();
    if (!geometry || !Array.isArray(geometry.cells) || !graphData.vertices.length) return positions;

    const samples = graphData.vertices
      .map((vertex) => {
        const cell = geometry.cells[vertex.index];
        return cell ? { index: vertex.index, x: cell.x, y: cell.y } : null;
      })
      .filter(Boolean);
    if (!samples.length) return positions;

    if (samples.length === 1) {
      positions.set(samples[0].index, { x: width / 2, y: height / 2 });
      return positions;
    }

    const minX = Math.min(...samples.map((sample) => sample.x));
    const maxX = Math.max(...samples.map((sample) => sample.x));
    const minY = Math.min(...samples.map((sample) => sample.y));
    const maxY = Math.max(...samples.map((sample) => sample.y));
    const sourceWidth = Math.max(maxX - minX, 1);
    const sourceHeight = Math.max(maxY - minY, 1);
    const targetWidth = Math.max(width - (padding * 2), 1);
    const targetHeight = Math.max(height - (padding * 2), 1);
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const sourceCenterX = (minX + maxX) / 2;
    const sourceCenterY = (minY + maxY) / 2;
    const targetCenterX = width / 2;
    const targetCenterY = height / 2;

    samples.forEach((sample) => {
      positions.set(sample.index, {
        x: clamp(targetCenterX + ((sample.x - sourceCenterX) * scale), padding, width - padding),
        y: clamp(targetCenterY + ((sample.y - sourceCenterY) * scale), padding, height - padding)
      });
    });

    return positions;
  }

  function runForceSimulation(layout, graphData, iterations = 100) {
    // Deprecated - use animateDualGraphLayout instead
  }

  function animateDualGraphLayout() {
    if (!state.dualGraphAnimating || !state.dualGraphLayout || !state.dualGraphData) return;
    if (!isDualGraphVisualizationVisible()) {
      state.dualGraphAnimating = false;
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
      return;
    }

    const layout = state.dualGraphLayout;
    const graphData = state.dualGraphData;

    applyForces(layout, graphData, 1.0);

    layout.nodes.forEach((node) => {
      if (node.fixed) return;
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.85;
      node.vy *= 0.85;

      const margin = 20;
      if (node.x < margin) { node.x = margin; node.vx = 0; }
      if (node.x > layout.width - margin) { node.x = layout.width - margin; node.vx = 0; }
      if (node.y < margin) { node.y = margin; node.vy = 0; }
      if (node.y > layout.height - margin) { node.y = layout.height - margin; node.vy = 0; }
    });

    renderVisibleDualGraphVisualizations(graphData);

    if (state.dualGraphAnimating) {
      requestAnimationFrame(animateDualGraphLayout);
    }
  }

  function applyForces(layout, graphData, alpha) {
    const nodes = layout.nodes;

    // Strong repulsion between all nodes
    const repulsionStrength = 2000;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);
        const force = repulsionStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!nodes[i].fixed) {
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
        }
        if (!nodes[j].fixed) {
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }
    }

    // Attraction along edges - stronger springs
    const edgeStrength = 0.1;
    const edgeLength = 80;
    graphData.edges.forEach((edge, i) => {
      const fromNode = layout.nodeMap.get(`v${edge.from}`);
      const toNode = layout.nodeMap.get(`v${edge.to}`);

      if (!fromNode || !toNode) return;

      if (edge.from === edge.to) {
        // Loop: connect vertex → node0 → node1 → node2 → vertex
        const node0 = layout.nodeMap.get(`e${i}_0`);
        const node1 = layout.nodeMap.get(`e${i}_1`);
        const node2 = layout.nodeMap.get(`e${i}_2`);

        if (node0 && node1 && node2) {
          const loopSegmentLength = edgeLength / 2;
          applySpringForce(fromNode, node0, edgeStrength, loopSegmentLength);
          applySpringForce(node0, node1, edgeStrength, loopSegmentLength);
          applySpringForce(node1, node2, edgeStrength, loopSegmentLength);
          applySpringForce(node2, fromNode, edgeStrength, loopSegmentLength);
        }
      } else {
        // Regular edge: single virtual node
        const edgeNode = layout.nodeMap.get(`e${i}`);
        if (edgeNode) {
          applySpringForce(fromNode, edgeNode, edgeStrength, edgeLength / 2);
          applySpringForce(toNode, edgeNode, edgeStrength, edgeLength / 2);
        }
      }
    });

    // Attraction for legs
    const legStrength = 0.08;
    const legLength = 60;
    graphData.legs.forEach((leg, i) => {
      const legNode = layout.nodeMap.get(`l${i}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);

      if (!legNode || !vertexNode) return;
      applySpringForce(vertexNode, legNode, legStrength, legLength);
    });

    // Weak center force
    const centerStrength = 0.005;
    const centerX = layout.width / 2;
    const centerY = layout.height / 2;
    nodes.forEach((node) => {
      if (node.fixed) return;
      node.vx += (centerX - node.x) * centerStrength;
      node.vy += (centerY - node.y) * centerStrength;
    });
  }

  function applySpringForce(node1, node2, strength, targetDist) {
    const dx = node2.x - node1.x;
    const dy = node2.y - node1.y;
    const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
    const force = (dist - targetDist) * strength;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (!node1.fixed) {
      node1.vx += fx;
      node1.vy += fy;
    }
    if (!node2.fixed) {
      node2.vx -= fx;
      node2.vy -= fy;
    }
  }

  function handleDualGraphMouseDown(event) {
    if (!state.showDualGraphCanvas || !state.dualGraphLayout) return;

    const canvas = refs.dualGraphCanvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find node under cursor
    const hitRadius = 15;
    for (const node of state.dualGraphLayout.nodes) {
      if (!isVisibleDualGraphNode(node)) continue;
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        state.dualGraphDragging = node;
        node.fixed = true;
        canvas.style.cursor = 'grabbing';
        break;
      }
    }
  }

  function handleDualGraphMouseMove(event) {
    if (!state.showDualGraphCanvas || !state.dualGraphLayout) return;

    const canvas = refs.dualGraphCanvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (state.dualGraphDragging) {
      state.dualGraphDragging.x = x;
      state.dualGraphDragging.y = y;
      state.dualGraphDragging.vx = 0;
      state.dualGraphDragging.vy = 0;

      // Re-render if not animating (animation loop handles it otherwise)
      if (!state.dualGraphAnimating && state.dualGraphData) {
        renderVisibleDualGraphVisualizations(state.dualGraphData);
      }
    } else {
      const hitRadius = 15;
      let hovering = false;
      for (const node of state.dualGraphLayout.nodes) {
        if (!isVisibleDualGraphNode(node)) continue;
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          hovering = true;
          break;
        }
      }
      canvas.style.cursor = hovering ? 'grab' : 'default';
    }
  }

  function handleDualGraphMouseUp() {
    if (state.dualGraphDragging) {
      state.dualGraphDragging.fixed = false;
      state.dualGraphDragging = null;
      if (refs.dualGraphCanvas) {
        refs.dualGraphCanvas.style.cursor = 'default';
      }
    }
  }

  function isVisibleDualGraphNode(node) {
    return !!node && node.type !== 'edge';
  }

  function normalizeKnotCandidates(result) {
    if (Array.isArray(result.candidates) && result.candidates.length) {
      return result.candidates
        .map((candidate) => {
          if (!candidate || typeof candidate !== 'object') return null;
          const name = String(candidate.name || '').trim();
          const label = String(candidate.label || candidate.displayName || name).trim();
          if (!name && !label) return null;
          return {
            name,
            label: label || name,
            href: candidate.href || (name ? knotInfoHrefFromName(name) : '')
          };
        })
        .filter(Boolean);
    }
    if (!result.name || !result.href) return [];
    return [{
      name: result.name,
      label: result.name,
      href: result.href
    }];
  }

  function knotCodeForDisplay(summary) {
    if (state.knotCodeKind === 'dt') return findAKnotDt(summary.dt);
    if (state.knotCodeKind === 'braid') return findAKnotBraid(summary);
    return findAKnotPd(summary.pd);
  }

  function findAKnotPd(pdText) {
    const entries = [];
    String(pdText || '').replace(/X\[([^\]]*)\]/g, (_, values) => {
      const entry = values.split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));
      if (entry.length === 4) entries.push(entry);
      return '';
    });
    return entries.length ? JSON.stringify(entries) : '[]';
  }

  function findAKnotDt(dtText) {
    const match = /^DT\[([^\]]*)\]$/.exec(String(dtText || '').trim());
    if (!match || !match[1].trim()) return '[]';
    const values = match[1].split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
    return JSON.stringify(values);
  }

  function findAKnotBraid(summary) {
    return Array.isArray(summary.braid) ? JSON.stringify(summary.braid) : 'braid unavailable';
  }

  function knotInfoHrefFromName(name) {
    const plainName = String(name || '').replace(/^knot\s+/, '').replace(/^.*\(([^)]+)\).*$/, '$1');
    return `https://knotinfo.org/diagram_display.php?${encodeURIComponent(plainName)}`;
  }

  function identifyKnot(report) {
    if (!report || report.active === 0) {
      return {
        status: 'empty canvas',
        name: '',
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }
    if (report.openEnds > 0 || report.components !== 1) {
      return {
        status: 'not a knot',
        name: `${report.components} components, ${report.openEnds} open ends`,
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }
    if (state.wrapped) {
      return {
        status: 'wrapped knot candidate',
        name: 'further exploration remains experimental',
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad'
      };
    }

    const engine = window.MosaicKnotEngine;
    if (!engine || typeof engine.identify !== 'function') {
      return {
        status: 'engine unavailable',
        name: 'mosaic_knot_engine.js did not load',
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad',
        showDetails: true
      };
    }

    const result = engine.identify({
      rows: state.rows,
      cols: state.cols,
      lattice: state.lattice,
      wrapped: state.wrapped,
      method: 'invariants',
      tiles: state.tiles.map((tile) => normalizeTile(tile).map((pair) => pair.slice(0, 2)))
    });

    return {
      status: result.status || 'code generated',
      name: result.name || '',
      candidates: normalizeKnotCandidates(result),
      pd: result.pd || '',
      dt: result.dt || '',
      braid: Array.isArray(result.braid) ? result.braid.slice() : null,
      href: result.href || '',
      linkText: result.linkText || 'more data',
      tone: result.tone || (result.name ? 'good' : 'bad'),
      showDetails: true
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
      const offsets = getBoardCopyOffsets();
      const pickedLift = buildPickedLiftContext(report, offsets);
      ctx.save();
      applyViewTransform(ctx);
      offsets.forEach((offset) => {
        drawBoardCopy(ctx, report, palette, offset, pickedLift);
      });
      drawDrawDebugOverlay(ctx, palette, report);
      drawPickHoverOverlay(ctx, palette, report);
      ctx.restore();
      drawDragGhost(ctx, palette);
      return;
    }

    drawBoardCopy(ctx, report, palette, { x: 0, y: 0, copyCol: 0, copyRow: 0 }, null);
    drawDrawDebugOverlay(ctx, palette, report);
    drawPickHoverOverlay(ctx, palette, report);
    drawDragGhost(ctx, palette);
  }

  function drawBoardCopy(ctx, report, palette, offset, pickedLift) {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    for (let index = 0; index < state.tiles.length; index += 1) {
      drawTile(ctx, index, report, palette, offset, pickedLift);
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
    if (isDualGraph() && isVertexTileValue(state.drag.tile)) drawGraphTile(ctx, state.dragPoint, state.drag.tile, palette);
    else drawPipe(ctx, state.dragPoint, state.drag.tile, palette);
    ctx.restore();
  }

  function drawPickHoverOverlay(ctx, palette, report) {
    if (!isPickDisplayActive()) return;
    if (state.pickedAnchor) {
      drawPickHitMarkers(ctx, state.pickedAnchor, palette.accent2, 2.4);
    }
    if (state.inputMode === 'pick' && state.pickHoverHit) {
      drawPickHitMarkers(ctx, state.pickHoverHit, palette.accent, 2);
    }
  }

  function drawPickHitMarkers(ctx, hit, color, width) {
    const midpoint = sharedEdgeMidpoint(hit);
    if (!midpoint) return;
    const radius = geometry.radius;

    ctx.save();
    drawPickEdgeMidpoint(ctx, midpoint.x, midpoint.y, radius, color, width);
    ctx.restore();
  }

  function matchingNeighborEdgeMarker(hit) {
    const neighborHit = matchingNeighborEdgeHit(hit);
    if (!neighborHit) return null;
    const nextCell = geometry.cells[neighborHit.index];
    if (!nextCell) return null;
    return {
      x: nextCell.x + neighborHit.offset.x,
      y: nextCell.y + neighborHit.offset.y,
      dir: neighborHit.dir
    };
  }

  function matchingNeighborEdgeHit(hit) {
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
      index: nextIndex,
      dir: opposite,
      offset: nextOffset
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

  function edgeMarkerMidpoint(x, y, dir, radius) {
    const segment = edgeSegmentPoints(x, y, dir, radius * 0.96);
    return {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2
    };
  }

  function sharedEdgeMidpoint(hit) {
    const cell = geometry.cells[hit.index];
    if (!cell) return null;

    const radius = geometry.radius;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const points = [edgeMarkerMidpoint(tile.x, tile.y, hit.dir, radius)];
    const neighborMarker = matchingNeighborEdgeMarker(hit);
    if (neighborMarker) {
      points.push(edgeMarkerMidpoint(neighborMarker.x, neighborMarker.y, neighborMarker.dir, radius));
    }
    return averagePoints(points);
  }

  function averagePoints(points) {
    if (!points.length) return null;
    const total = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });
    return {
      x: total.x / points.length,
      y: total.y / points.length
    };
  }

  function drawPickEdgeMidpoint(ctx, x, y, radius, color, width = 2) {
    const markerRadius = Math.max(4.2, radius * 0.105) * Math.max(0.85, width / 2);
    ctx.save();
    ctx.fillStyle = 'rgba(255,253,248,0.96)';
    circle(ctx, x, y, markerRadius);
    ctx.fillStyle = color;
    circle(ctx, x, y, Math.max(2.2, markerRadius * 0.55));
    ctx.restore();
  }

  function drawDrawDebugOverlay(ctx, palette, report) {
    if (state.inputMode !== 'draw' || !isDrawGestureAction() || state.drawStyle === 'none' || !state.drawDebugHit) return;
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

    if (hit.graphVertex) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,253,248,0.96)';
      circle(ctx, tile.x, tile.y, Math.max(5.2, radius * 0.13));
      ctx.fillStyle = palette.accent;
      circle(ctx, tile.x, tile.y, Math.max(2.8, radius * 0.07));

      if (state.drawStyle === 'debug') {
        const label = `T${hit.index + 1} (${cell.row + 1},${cell.col + 1})  V`;
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
      }
      ctx.restore();
      return;
    }

    const edge = edgePoint(tile.x, tile.y, hit.dir, edgeConnectionDistance(radius));
    const label = `T${hit.index + 1} (${cell.row + 1},${cell.col + 1})  E ${lattice.dirNames[hit.dir]}`;
    const markers = [{ x: tile.x, y: tile.y, dir: hit.dir }];
    const neighborMarker = matchingNeighborEdgeMarker(hit);
    if (neighborMarker) markers.push(neighborMarker);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const markerWidth = Math.max(1.8, radius * 0.055);
    markers.forEach((marker) => {
      drawPickEdgeMarker(
        ctx,
        marker.x,
        marker.y,
        marker.dir,
        radius,
        palette.accent,
        markerWidth
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

    if (hit.graphAnchor || hit.graphVertex) {
      drawDualGraphShadeOverlay(ctx, palette, report, hit);
      return;
    }

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

  function drawDualGraphShadeOverlay(ctx, palette, report, hit) {
    const cell = geometry.cells[hit.index];
    if (!cell || !hit.point) return;
    const radius = geometry.radius;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const projection = hit.graphAnchor
      ? dualGraphSpokeProjectionFromPoint(hit.point, hit, hit.dir)
      : null;
    const start = projection
      ? (hit.graphAnchor === 'edge' ? projection.edge : projection.center)
      : tile;
    const end = projection ? projection.point : hit.point;
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (!Number.isFinite(distance) || distance < 1.5) return;

    const pipeWidth = Math.max(5, radius * 0.17);
    const color = drawShadeColor(hit, report, palette);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = pipeWidth * 2.4;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.lineWidth = pipeWidth * 0.82;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawShadeColor(hit, report, palette) {
    if (isDualGraph()) {
      const connection = connectedArcAtEdgeHit(hit, report);
      if (!connection) return palette.accent;
      const theme = getMosaicTheme(palette);
      return componentPipeColor(connection.component, theme);
    }
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
    if (!isPeriodicWrappedView()) return [{ x: 0, y: 0, copyCol: 0, copyRow: 0 }];
    const range = getPeriodicRange();
    const offsets = [];
    for (let row = -range; row <= range; row += 1) {
      for (let col = -range; col <= range; col += 1) {
        if (row === 0 && col === 0) continue;
        offsets.push(copyOffset(col, row));
      }
    }
    offsets.push(copyOffset(0, 0));
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
      y: (col * geometry.periodA.y) + (row * geometry.periodB.y),
      copyCol: col,
      copyRow: row
    };
  }

  function copyOffsetRecord(offset) {
    const copy = copyCoordsFromOffset(offset);
    return {
      x: offset && Number.isFinite(offset.x) ? offset.x : 0,
      y: offset && Number.isFinite(offset.y) ? offset.y : 0,
      copyCol: copy.copyCol,
      copyRow: copy.copyRow
    };
  }

  function copyCoordsFromOffset(offset) {
    if (!offset) return { copyCol: 0, copyRow: 0 };
    if (Number.isInteger(offset.copyCol) && Number.isInteger(offset.copyRow)) {
      return { copyCol: offset.copyCol, copyRow: offset.copyRow };
    }
    if (!geometry) return { copyCol: 0, copyRow: 0 };
    const a = geometry.periodA;
    const b = geometry.periodB;
    const det = (a.x * b.y) - (a.y * b.x);
    if (Math.abs(det) < 0.0001) return { copyCol: 0, copyRow: 0 };
    const x = Number.isFinite(offset.x) ? offset.x : 0;
    const y = Number.isFinite(offset.y) ? offset.y : 0;
    return {
      copyCol: Math.round(((x * b.y) - (y * b.x)) / det),
      copyRow: Math.round(((a.x * y) - (a.y * x)) / det)
    };
  }

  function drawTile(ctx, index, report, palette, offset = null, pickedLift = null) {
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
    const spokeComponents = !isDragTarget && report.spokeComponents
      ? report.spokeComponents[index]
      : null;
    const isHover = (isTilingMode() || (state.inputMode === 'draw' && !isDrawGestureAction()))
      && index === state.hoverIndex;
    const isDecorationHover = isDecorationMode() && index === state.hoverIndex;

    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = isDragTarget ? 'rgba(61,107,79,0.12)' : (isDragSource ? '#eee7dd' : (hasTile ? '#fffdf8' : '#f8f5ee'));
    ctx.strokeStyle = (isHover || isDecorationHover || isDragTarget) ? palette.accent : palette.border;
    ctx.lineWidth = (isHover || isDecorationHover || isDragTarget) ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    if (isDualGraph() && isVertexTileValue(displayTile)) {
      drawGraphTile(ctx, cell, displayTile, palette, null, spokeComponents, {
        tileIndex: index,
        copy: offset,
        pickedLift
      });
      if (!isDragTarget && !isDragSource) {
        drawVertexDecoration(ctx, cell, vertexDecorationValue(index), palette, radius);
      }
    } else {
      drawPipe(ctx, cell, displayTile, palette, null, arcComponents, {
        tileIndex: index,
        copy: offset,
        pickedLift
      });
    }

    if (state.showErrors && !isDragTarget) drawOpenEndMarks(ctx, index, cell, mask, palette);
    if (state.showCoords) drawCellLabel(ctx, cell, palette);
  }

  function drawVertexDecoration(ctx, cell, value, palette, radius) {
    if (!value) return;
    drawNumberBadge(ctx, cell.x, cell.y, value, clamp(radius * 0.42, 9, 17), Math.max(7, radius * 0.18));
  }

  function drawNumberBadge(ctx, x, y, value, fontSize, minRadius) {
    if (!value) return;
    const text = String(value);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    const metrics = ctx.measureText(text);
    const badgeRadius = Math.max(minRadius, metrics.width / 2 + Math.max(3, fontSize * 0.26), fontSize * 0.68);
    ctx.beginPath();
    ctx.arc(x, y, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y + fontSize * 0.03);
    ctx.restore();
  }

  function drawPipe(ctx, cell, tile, palette, radiusOverride = null, arcComponents = null, drawMeta = null) {
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
      const pipeAlpha = componentPipeAlpha(componentIndex, drawMeta, index);
      const currentPipeWidth = pipeWidth * strokeScale;
      const currentGapWidth = currentPipeWidth + Math.max(4, radius * 0.09);
      ctx.save();
      ctx.globalAlpha *= pipeAlpha;
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
      ctx.restore();
    });
    ctx.restore();
  }

  function drawGraphTile(ctx, cell, tile, palette, radiusOverride = null, spokeComponents = null, drawMeta = null) {
    if (isTileEmpty(tile)) return;
    const radius = radiusOverride || geometry.radius;
    const spokes = normalizeVertexTile(tile);
    const theme = getMosaicTheme(palette);
    const pipeWidth = Math.max(5, radius * 0.17);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    spokes.forEach((dir, index) => {
      const componentIndex = spokeComponents ? spokeComponents[index] : null;
      const strokeScale = componentStrokeScale(componentIndex);
      const pipeAlpha = componentPipeAlpha(componentIndex, drawMeta, index);
      const pipeColor = componentPipeColor(componentIndex, theme);
      const end = edgePoint(cell.x, cell.y, dir, edgeConnectionDistance(radius));
      ctx.save();
      ctx.globalAlpha *= pipeAlpha;
      ctx.strokeStyle = pipeColor;
      ctx.lineWidth = pipeWidth * strokeScale;
      ctx.beginPath();
      ctx.moveTo(cell.x, cell.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    });

    ctx.fillStyle = theme.pipe;
    ctx.strokeStyle = '#fffdf8';
    ctx.lineWidth = Math.max(2, radius * 0.055);
    circle(ctx, cell.x, cell.y, Math.max(4.4, radius * 0.11));
    ctx.stroke();
    ctx.restore();
  }

  function componentStrokeScale(componentIndex) {
    if (!isPickDisplayActive() || state.pickedComponent == null || componentIndex == null || componentIndex < 0) {
      return 1;
    }
    return componentIndex === state.pickedComponent ? 1.22 : 0.34;
  }

  function componentPipeAlpha(componentIndex, drawMeta, pairIndex) {
    if (
      !isPickDisplayActive()
      || !state.wrapped
      || state.pickedComponent == null
      || componentIndex !== state.pickedComponent
      || !drawMeta
      || !drawMeta.pickedLift
    ) {
      return 1;
    }
    const copy = copyCoordsFromOffset(drawMeta.copy);
    const key = liftedArcKey(copy.copyCol, copy.copyRow, drawMeta.tileIndex, pairIndex);
    return drawMeta.pickedLift.has(key) ? 1 : PICK_UNCONNECTED_LIFT_ALPHA;
  }

  function buildPickedLiftContext(report, offsets) {
    if (
      isDualGraph()
      ||
      !isPickDisplayActive()
      || !state.wrapped
      || !isPeriodicWrappedView()
      || state.pickedComponent == null
      || !state.pickedAnchor
      || !report.arcComponents
    ) {
      return null;
    }

    const anchorArc = connectedArcAtEdgeHit(state.pickedAnchor, report);
    if (!anchorArc) return null;

    const anchorCopy = copyCoordsFromOffset(anchorArc.offset);
    const bounds = liftedCopyBounds(offsets, anchorCopy);
    return traceLiftedComponent(anchorArc.index, anchorArc.pairIndex, anchorCopy, bounds);
  }

  function traceLiftedComponent(anchorIndex, anchorPairIndex, anchorCopy, bounds) {
    const selected = new Set();
    const queued = new Set();
    const queue = [{
      index: anchorIndex,
      pairIndex: anchorPairIndex,
      copyCol: anchorCopy.copyCol,
      copyRow: anchorCopy.copyRow
    }];

    while (queue.length) {
      const current = queue.shift();
      if (!copyWithinBounds(current, bounds)) continue;

      const key = liftedArcKey(current.copyCol, current.copyRow, current.index, current.pairIndex);
      if (queued.has(key)) continue;
      queued.add(key);
      selected.add(key);

      const tile = normalizeTile(state.tiles[current.index]);
      const pair = tile[current.pairIndex];
      if (!pair) continue;

      pair.forEach((dir) => {
        const next = liftedNeighbor(current.index, dir, current.copyCol, current.copyRow);
        if (!next || !copyWithinBounds(next, bounds)) return;
        const nextTile = normalizeTile(state.tiles[next.index]);
        const nextPairIndex = nextTile.findIndex((candidate) => candidate[0] === next.dir || candidate[1] === next.dir);
        if (nextPairIndex < 0) return;
        queue.push({
          index: next.index,
          pairIndex: nextPairIndex,
          copyCol: next.copyCol,
          copyRow: next.copyRow
        });
      });
    }

    return selected;
  }

  function liftedNeighbor(index, dir, copyCol, copyRow) {
    const lattice = getLattice();
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const next = neighbor(row, col, dir, state.rows, state.cols, lattice, true);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    const nextOffset = drawContinuationOffset({
      index,
      offset: copyOffset(copyCol, copyRow)
    }, dir, nextIndex);
    const nextCopy = copyCoordsFromOffset(nextOffset);
    return {
      index: nextIndex,
      dir: lattice.opposite[dir],
      copyCol: nextCopy.copyCol,
      copyRow: nextCopy.copyRow
    };
  }

  function liftedCopyBounds(offsets, anchorCopy) {
    const bounds = offsets.reduce((acc, offset) => {
      const copy = copyCoordsFromOffset(offset);
      acc.minCol = Math.min(acc.minCol, copy.copyCol);
      acc.maxCol = Math.max(acc.maxCol, copy.copyCol);
      acc.minRow = Math.min(acc.minRow, copy.copyRow);
      acc.maxRow = Math.max(acc.maxRow, copy.copyRow);
      return acc;
    }, {
      minCol: anchorCopy.copyCol,
      maxCol: anchorCopy.copyCol,
      minRow: anchorCopy.copyRow,
      maxRow: anchorCopy.copyRow
    });
    bounds.minCol -= 1;
    bounds.maxCol += 1;
    bounds.minRow -= 1;
    bounds.maxRow += 1;
    return bounds;
  }

  function copyWithinBounds(copy, bounds) {
    return copy.copyCol >= bounds.minCol
      && copy.copyCol <= bounds.maxCol
      && copy.copyRow >= bounds.minRow
      && copy.copyRow <= bounds.maxRow;
  }

  function liftedArcKey(copyCol, copyRow, index, pairIndex) {
    return `${copyCol}:${copyRow}:${index}:${pairIndex}`;
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

    if (isDualGraph() && isVertexTileValue(tile)) drawGraphTile(ctx, { x: cx, y: cy }, tile, palette, radius);
    else drawPipe(ctx, { x: cx, y: cy }, tile, palette, radius);
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

  function tileHitTest(clientX, clientY, radiusScale = 0.96) {
    if (!geometry) return null;
    return tileHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY), radiusScale);
  }

  function edgeHitTest(clientX, clientY, minDistanceRatio = 0.42) {
    if (!geometry) return null;
    return edgeHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY), minDistanceRatio);
  }

  function updateDrawDebugFromPoint(clientX, clientY, redraw = true) {
    if (state.inputMode !== 'draw' || !isDrawGestureAction() || state.drawStyle === 'none') return false;
    const hit = dualGraphDrawDebugHit(clientX, clientY) || edgeHitTest(clientX, clientY, 0);
    if (hit) hit.point = clientPointToBoardPoint(clientX, clientY);
    return setDrawDebugHit(hit, redraw);
  }

  function dualGraphDrawDebugHit(clientX, clientY) {
    if (!isDualGraph() || state.drawAction !== 'edge') return null;
    const hit = tileHitTest(clientX, clientY, 1.02);
    if (!hit || !isVertexTileValue(state.tiles[hit.index])) return null;

    const point = clientPointToBoardPoint(clientX, clientY);
    const cell = geometry.cells[hit.index];
    if (!cell) return null;
    const tile = {
      x: cell.x + hit.offset.x,
      y: cell.y + hit.offset.y
    };
    const dx = point.x - tile.x;
    const dy = point.y - tile.y;
    const dir = nearestDirectionFromVector(dx, dy);
    const normalizedDir = dir < 0 ? 0 : dir;
    const edge = edgePoint(tile.x, tile.y, normalizedDir, edgeConnectionDistance(geometry.radius));
    const centerDistance = Math.hypot(dx, dy);
    const edgeDistance = Math.hypot(point.x - edge.x, point.y - edge.y);
    const graphVertex = centerDistance <= edgeDistance || centerDistance < geometry.radius * 0.32;
    return {
      index: hit.index,
      dir: normalizedDir,
      offset: copyOffsetRecord(hit.offset),
      point,
      graphVertex
    };
  }

  function updateDrawShadeFromCurrent(clientX, clientY, redraw = true) {
    if (!isDrawGestureAction() || !drawState || !drawState.current) return false;
    return setDrawDebugHit({
      index: drawState.current.index,
      dir: drawState.current.entryDir,
      offset: { x: drawState.current.offset.x, y: drawState.current.offset.y },
      point: clientPointToBoardPoint(clientX, clientY)
    }, redraw);
  }

  function setDrawDebugHit(hit, redraw = true) {
    if (state.inputMode !== 'draw' || !isDrawGestureAction() || state.drawStyle === 'none') return false;
    const next = hit
      ? {
        index: hit.index,
        dir: hit.dir,
        offset: { x: hit.offset.x, y: hit.offset.y },
        point: hit.point ? { x: hit.point.x, y: hit.point.y } : null,
        graphAnchor: hit.graphAnchor || null,
        graphVertex: !!hit.graphVertex
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
      && left.graphAnchor === right.graphAnchor
      && left.graphVertex === right.graphVertex
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
      diagramType: state.diagramType,
      boundary: state.wrapped ? 'wrapped' : 'open',
      wrappedViewMode: state.wrappedViewMode,
      inputMode: state.inputMode,
      clickMode: state.editMode,
      drawAction: state.drawAction,
      knotCodeKind: state.knotCodeKind,
      drawLayer: state.drawLayer,
      drawStyle: state.drawStyle,
      display: {
        showOpenEnds: state.showErrors,
        showCoords: state.showCoords,
        colorComponents: state.colorComponents,
        pick: state.displayPick,
        drawAction: state.drawAction,
        knotCodeKind: state.knotCodeKind,
        drawStyle: state.drawStyle,
        drawDebug: state.drawStyle === 'debug'
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
          vertexEdges: normalizeVertexTile(tile).map((dir) => lattice.dirNames[dir]),
          decoration: isDualGraph() && isVertexTileValue(tile) ? vertexDecorationValue(index) : 0
        };
      }),
      dualGraph: isDualGraph() ? buildDualGraphExport(report, lattice) : null
    };
    refs.exportOut.value = JSON.stringify(payload, null, 2);
  }

  function copyExport() {
    if (!refs.exportOut.value) refreshExport();
    const text = refs.exportOut.value;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => { refs.statusLine.textContent = 'export copied'; })
        .catch(fallbackCopyExport);
    } else {
      fallbackCopyExport();
    }
  }

  function exportDualGraphFromVisualization() {
    const report = analyze();
    const graphData = collectDualGraphData(report);
    refs.exportOut.value = JSON.stringify(buildDualGraphOnlyExport(report), null, 2);
    if (refs.exportCard) refs.exportCard.classList.remove('collapsed');
    if (refs.exportOut) {
      refs.exportOut.focus();
      refs.exportOut.select();
    }
    if (refs.statusLine) {
      refs.statusLine.textContent = graphData.isValid
        ? 'dual graph export ready'
        : (graphData.reason || 'dual graph export unavailable');
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
    refs.diagramType.value = state.diagramType;
    refs.inputMode.value = state.inputMode;
    refs.latticeSelect.value = latticeName;
    refs.wrapBoard.checked = wrapped;
    refs.editMode.value = state.editMode;
    refs.drawAction.value = state.drawAction;
    refs.knotCodeKind.value = state.knotCodeKind;
    refs.drawLayer.value = state.drawLayer;
    refs.drawStyle.value = state.drawStyle;
    refs.colorComponents.checked = state.colorComponents;
    refs.displayPick.checked = state.displayPick;
    syncDualGraphInvariantVisibility();
    if (refs.showDualGraphCanvas) refs.showDualGraphCanvas.checked = state.showDualGraphCanvas;
    if (refs.showRiemannSurfaceCanvas) refs.showRiemannSurfaceCanvas.checked = state.showRiemannSurfaceCanvas;
    if (refs.showRiemannDebugCircles) refs.showRiemannDebugCircles.checked = state.showRiemannDebugCircles;
    if (refs.showRiemannBezierCurve) refs.showRiemannBezierCurve.checked = state.showRiemannBezierCurve;
    syncDualGraphCanvasVisibility();
    syncRiemannNodeControls();
    refs.wrappedViewMode.value = state.wrappedViewMode;
    updateInputModePanels();
    updateDrawModeControls();
    updateInputModeLock();
    updateDisplayControls();
    updatePickControls();
  }

  function updateInputModePanels() {
    refs.inputPanels.forEach((panel) => {
      const modes = (panel.dataset.inputPanel || '').split(/\s+/);
      panel.hidden = !modes.includes(state.inputMode);
    });
  }

  function syncRiemannNodeControls() {
    if (refs.riemannNodeRadiusInputs) {
      refs.riemannNodeRadiusInputs.forEach((input) => {
        const index = Number(input.dataset.riemannNodeRadius);
        if (Number.isInteger(index) && index >= 0 && index < DEFAULT_RIEMANN_NODE_RADII.length) {
          input.value = normalizeRiemannNodeRadiusInput(state.riemannNodeRadii[index], DEFAULT_RIEMANN_NODE_RADII[index]).toFixed(2);
        }
      });
    }
    if (refs.riemannNodeRadiusOutputs) {
      refs.riemannNodeRadiusOutputs.forEach((output) => {
        const index = Number(output.dataset.riemannNodeRadiusValue);
        if (Number.isInteger(index) && index >= 0 && index < DEFAULT_RIEMANN_NODE_RADII.length) {
          output.textContent = normalizeRiemannNodeRadiusInput(state.riemannNodeRadii[index], DEFAULT_RIEMANN_NODE_RADII[index]).toFixed(2);
        }
      });
    }
    if (refs.riemannNodePositionInputs) {
      refs.riemannNodePositionInputs.forEach((input) => {
        const index = Number(input.dataset.riemannNodePosition);
        if (Number.isInteger(index) && index > 0 && index < RIEMANN_LOOP_PASS_INDEX) {
          input.value = normalizeRiemannLoopNodePositionInput(state.riemannLoopNodePositions[index], DEFAULT_RIEMANN_LOOP_NODE_POSITIONS[index]).toFixed(2);
        }
      });
    }
    if (refs.riemannNodePositionOutputs) {
      refs.riemannNodePositionOutputs.forEach((output) => {
        const index = Number(output.dataset.riemannNodePositionValue);
        if (Number.isInteger(index) && index > 0 && index < RIEMANN_LOOP_PASS_INDEX) {
          output.textContent = normalizeRiemannLoopNodePositionInput(state.riemannLoopNodePositions[index], DEFAULT_RIEMANN_LOOP_NODE_POSITIONS[index]).toFixed(2);
        }
      });
    }
    if (refs.riemannLoopTangentScaleInputs) {
      refs.riemannLoopTangentScaleInputs.forEach((input) => {
        input.value = String(Math.round(normalizeRiemannLoopTangentScaleInput(state.riemannLoopTangentScale) * 100));
      });
    }
    if (refs.riemannLoopTangentScaleOutputs) {
      refs.riemannLoopTangentScaleOutputs.forEach((output) => {
        output.textContent = `${Math.round(normalizeRiemannLoopTangentScaleInput(state.riemannLoopTangentScale) * 100)}%`;
      });
    }
  }

  function updateDrawModeControls() {
    if (!refs.drawLayer || !refs.drawStyle) return;
    if (!isDualGraph() && state.inputMode === 'decoration') {
      state.inputMode = 'draw';
      refs.inputMode.value = state.inputMode;
    }
    if (refs.inputDecorationOption) {
      refs.inputDecorationOption.hidden = !isDualGraph();
      refs.inputDecorationOption.disabled = !isDualGraph();
    }
    if (!isDualGraph() && state.drawAction === 'vertex') {
      state.drawAction = 'edge';
      refs.drawAction.value = state.drawAction;
    }
    if (refs.drawVertexOption) {
      refs.drawVertexOption.hidden = !isDualGraph();
      refs.drawVertexOption.disabled = !isDualGraph();
    }
    refs.drawLayer.disabled = state.drawAction !== 'edge';
    refs.drawStyle.disabled = !isDrawGestureAction();
  }

  function updateDisplayControls() {
    if (refs.wrappedViewRow) {
      refs.wrappedViewRow.hidden = !state.wrapped;
      refs.wrappedViewMode.disabled = !state.wrapped;
    }
    if (refs.knotCard) refs.knotCard.hidden = isDualGraph();
    if (refs.dualGraphCard) refs.dualGraphCard.hidden = !isDualGraph();
  }

  function generateTilePreferences(lattice) {
    return isDualGraph()
      ? generateDualGraphTilePreferences(lattice)
      : generateArcTilePreferences(lattice);
  }

  function generateArcTilePreferences(lattice) {
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

  function generateDualGraphTilePreferences(lattice) {
    const arcEntries = generateArcTilePreferences(lattice)
      .map((entry) => ({
        ...entry,
        id: entry.tile.length ? `arc-${entry.id}` : 'tile-blank',
        label: entry.tile.length ? `arc ${entry.label}` : entry.label
      }));
    const vertexEntries = generateVertexTilePreferences(lattice);
    return arcEntries.concat(vertexEntries);
  }

  function generateVertexTilePreferences(lattice) {
    const maxMask = 1 << lattice.sides;
    const tilesByKey = new Map();
    Array.from({ length: maxMask }, (_, mask) => mask).forEach((mask) => {
      const dirs = maskToDirs(mask);
      const canonical = canonicalDirs(dirs, lattice.sides);
      const key = dirsKey(canonical);
      if (!tilesByKey.has(key)) tilesByKey.set(key, canonical);
    });
    return Array.from(tilesByKey.values()).map((dirs) => {
      return {
        id: dirs.length ? `vertex-${dirsKey(dirs).replaceAll(',', '-')}` : 'vertex-free',
        label: vertexTileLabel(dirs, lattice),
        tile: vertexTileFromDirs(dirs)
      };
    }).sort((left, right) => {
      const leftCount = normalizeVertexTile(left.tile).length;
      const rightCount = normalizeVertexTile(right.tile).length;
      if (leftCount !== rightCount) return leftCount - rightCount;
      return left.id.localeCompare(right.id);
    });
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

  function canonicalDirs(dirs, sides) {
    let best = null;
    let bestKey = '';
    for (let shift = 0; shift < sides; shift += 1) {
      const candidate = normalizeDirs(dirs.map((dir) => modulo(dir + shift, sides)));
      const key = dirsKey(candidate);
      if (!best || key < bestKey) {
        best = candidate;
        bestKey = key;
      }
    }
    return best || [];
  }

  function tileKey(tile) {
    return tile.map((pair) => `${pair[0]},${pair[1]}`).join(';');
  }

  function dirsKey(dirs) {
    return dirs.join(',');
  }

  function tileLabel(tile, lattice) {
    if (!tile.length) return 'blank';
    return tile.map((pair) => `${lattice.dirNames[pair[0]]}-${lattice.dirNames[pair[1]]}`).join(' / ');
  }

  function vertexTileLabel(dirs, lattice) {
    if (!dirs.length) return 'isolated vertex';
    return `vertex ${dirs.map((dir) => lattice.dirNames[dir]).join(' / ')}`;
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

  function shuffleArray(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const value = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = value;
    }
    return shuffled;
  }

  function maskToDirs(mask) {
    const dirs = [];
    const lattice = getLattice();
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (mask & (1 << dir)) dirs.push(dir);
    }
    return dirs;
  }

  // Link tiles are ordered edge pairs; dual graph tiles keep center-to-edge spokes.
  function tileFromPairs(pairs) {
    return pairs.map((pair) => [pair[0], pair[1]]);
  }

  function vertexTileFromDirs(dirs) {
    return {
      type: 'vertex',
      edges: normalizeDirs(dirs)
    };
  }

  function cloneTile(tile) {
    if (tile == null) return null;
    if (isVertexTileValue(tile)) return vertexTileFromDirs(normalizeVertexTile(tile));
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

  function isVertexTileValue(tile) {
    return !!tile
      && typeof tile === 'object'
      && !Array.isArray(tile)
      && (
        tile.type === 'vertex'
        || Array.isArray(tile.edges)
        || Array.isArray(tile.spokes)
        || Array.isArray(tile.vertex)
      );
  }

  function normalizeVertexTile(tile) {
    if (typeof tile === 'number') return maskToDirs(tile);
    if (Array.isArray(tile)) {
      if (tile.some((entry) => Array.isArray(entry))) return [];
      return normalizeDirs(tile);
    }
    if (!tile || typeof tile !== 'object') return [];
    const dirs = Array.isArray(tile.edges)
      ? tile.edges
      : (Array.isArray(tile.spokes) ? tile.spokes : tile.vertex);
    return normalizeDirs(Array.isArray(dirs) ? dirs : []);
  }

  function normalizeDirs(dirs) {
    const sides = getLattice().sides;
    return Array.from(new Set((dirs || [])
      .map((dir) => normalizeDir(dir, sides))
      .filter((dir) => Number.isInteger(dir))))
      .sort((left, right) => left - right);
  }

  function vertexTileHasSpoke(index, dir) {
    return normalizeVertexTile(state.tiles[index]).includes(normalizeDir(dir, getLattice().sides));
  }

  function tileHasEdgeAt(index, dir) {
    if (index < 0 || index >= state.tiles.length) return false;
    return !!(tileToMask(state.tiles[index]) & (1 << normalizeDir(dir, getLattice().sides)));
  }

  function setVertexTileSpoke(index, dir, present, allowCreate = false) {
    if (index < 0 || index >= state.tiles.length) return false;
    const tile = state.tiles[index];
    if (!isVertexTileValue(tile) && !(allowCreate && isTileEmpty(tile))) return false;
    const dirs = normalizeVertexTile(state.tiles[index]);
    const normalized = normalizeDir(dir, getLattice().sides);
    const hasDir = dirs.includes(normalized);
    if (present === hasDir && isVertexTileValue(state.tiles[index])) return false;
    const next = present
      ? normalizeDirs(dirs.concat([normalized]))
      : dirs.filter((item) => item !== normalized);
    const nextTile = vertexTileFromDirs(next);
    if (tilesEqual(state.tiles[index], nextTile)) return false;
    state.tiles[index] = nextTile;
    return true;
  }

  function normalizeEditMode(mode) {
    if (mode === 'randonize') return 'randomize';
    return ['rotate', 'reorder', 'randomize'].includes(mode) ? mode : 'rotate';
  }

  function normalizeDiagramType(type) {
    return type === 'dual' || type === 'dualGraph' || type === 'dual-graph' ? 'dual' : 'link';
  }

  function isDualGraph() {
    return state.diagramType === 'dual';
  }

  function isTilingMode() {
    return state.inputMode === 'tiling';
  }

  function isDecorationMode() {
    return state.inputMode === 'decoration' && isDualGraph();
  }

  function isDrawGestureAction() {
    return state.drawAction === 'edge';
  }

  function normalizeInputMode(mode) {
    if (mode === 'drag') return 'tiling';
    if (mode === 'decoration') return isDualGraph() ? 'decoration' : 'draw';
    return ['draw', 'tiling', 'pick', 'import'].includes(mode) ? mode : 'draw';
  }

  function normalizeDrawLayer(layer) {
    return layer === 'below' ? 'below' : 'above';
  }

  function normalizeDrawStyle(style) {
    return ['none', 'debug', 'shade'].includes(style) ? style : 'shade';
  }

  function normalizeDrawAction(action) {
    if (action === 'randonize') return 'randomize';
    return ['edge', 'vertex', 'rotate', 'reorder', 'randomize'].includes(action) ? action : 'edge';
  }

  function normalizeKnotCodeKind(kind) {
    if (kind === 'pt') return 'dt';
    return ['pd', 'dt', 'braid'].includes(kind) ? kind : 'pd';
  }

  function normalizeDir(dir, sides) {
    if (typeof dir === 'string') {
      const normalized = dir.trim().toUpperCase();
      const named = getLattice().dirNames.findIndex((name) => name.toUpperCase() === normalized);
      if (named >= 0) return named;
    }
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
    const arcMask = normalizeTile(tile).reduce((mask, pair) => (
      mask | (1 << pair[0]) | (1 << pair[1])
    ), 0);
    const spokeMask = normalizeVertexTile(tile).reduce((mask, dir) => (
      mask | (1 << dir)
    ), 0);
    return arcMask | spokeMask;
  }

  function isTileEmpty(tile) {
    return tile == null;
  }

  function tilesEqual(left, right) {
    if (left == null || right == null) return left == null && right == null;
    if (isVertexTileValue(left) || isVertexTileValue(right)) {
      const leftDirs = normalizeVertexTile(left);
      const rightDirs = normalizeVertexTile(right);
      return leftDirs.length === rightDirs.length
        && leftDirs.every((dir, index) => dir === rightDirs[index]);
    }
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
    if (isVertexTileValue(tile)) {
      const lattice = getLattice();
      const normalized = ((steps % lattice.sides) + lattice.sides) % lattice.sides;
      return vertexTileFromDirs(normalizeVertexTile(tile).map((dir) => (dir + normalized) % lattice.sides));
    }
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
