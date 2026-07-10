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
  const WANDER_MOVE_ANIMATION_MS = 260;
  const WANDER_BOUNCE_ANIMATION_MS = 380;
  const WANDER_BOUNCE_EDGE_RATIO = 0.72;
  const WANDER_CAMERA_ANIMATION_MS = 520;
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
  const GLUED_BOUNDARY_COLORS = ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'];
  const DEFAULT_SEIFERT_BAND_WIDTH = 0.42;
  const MIN_SEIFERT_BAND_WIDTH = 0.24;
  const MAX_SEIFERT_BAND_WIDTH = 0.78;
  const DEFAULT_SEIFERT_SURFACE_COLOR = '#d8b071';
  const SEIFERT_BOUNDARY_COLOR_PALETTE = ['#8b5a2b', '#2f7d5c', '#2f6f9f', '#8a5aa6', '#b65f5f', '#7c8b32', '#b17234', '#26807b'];
  const DEFAULT_BACKGROUND_CUSP_MARKER_SCALE = 0.7;
  const DEFAULT_BACKGROUND_BILLIARD_SPEED = 0.2;
  const DEFAULT_BACKGROUND_BILLIARD_TRAIL_LENGTH = 200;
  const DEFAULT_BACKGROUND_BILLIARD_TRAIL_INFINITY = 400;
  const DEFAULT_BACKGROUND_BILLIARD_ARROW_LENGTH = 20;
  const DEFAULT_BACKGROUND_BILLIARD_HIT_MARKERS = 'boundary';
  const BACKGROUND_BILLIARD_MAX_HITS = 720;
  const BACKGROUND_BILLIARD_MAX_COLLISIONS_PER_FRAME = 80;
  const KNOT_PRESETS = [
    {
      id: 'hopf-link',
      label: 'Hopf link',
      payload: {
        name: 'Hopf link preset',
        diagramType: 'link',
        lattice: 'hexagonal',
        inputMode: 'tiling',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, null, null, null,
          null, [[0, 2]], [[3, 1], [0, 2]], [[1, 3]], null,
          null, [[5, 1]], [[5, 1]], [[2, 4]], [[2, 4]],
          null, [[4, 0]], [[4, 0], [3, 5]], [[3, 5]], null,
          null, null, null, null, null
        ]
      },
      squarePayload: {
        name: 'Hopf link preset',
        diagramType: 'link',
        lattice: 'square',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          [[1, 0]], [[2, 0]], [[2, 1]], null, null,
          [[1, 3]], [[0, 1]], [[3, 1], [0, 2]], [[1, 2]], null,
          [[0, 3]], [[3, 1], [0, 2]], [[3, 2]], [[1, 3]], null,
          null, [[3, 0]], [[2, 0]], [[2, 3]], null,
          null, null, null, null, null
        ]
      }
    },
    {
      id: 'solomon-link',
      label: 'Solomon link (L4a1)',
      payload: {
        name: 'Solomon link preset',
        diagramType: 'link',
        lattice: 'hexagonal',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, [[1, 2]], null, null,
          [[0, 1]], [[5, 2], [0, 3]], [[1, 3], [2, 4]], null, null,
          null, [[4, 0], [5, 1]], [[2, 5], [3, 0]], [[3, 4]], null,
          null, [[4, 5]], null, null, null,
          null, null, null, null, null
        ]
      },
      squarePayload: {
        name: 'Solomon link preset',
        diagramType: 'link',
        lattice: 'square',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, [[0, 1]], [[1, 2]], null, null,
          [[0, 1]], [[3, 1], [0, 2]], [[0, 2], [1, 3]], [[1, 2]], null,
          [[3, 0]], [[2, 0], [3, 1]], [[1, 3], [2, 0]], [[2, 3]], null,
          null, [[3, 0]], [[2, 3]], null, null,
          null, null, null, null, null
        ]
      }
    },
    {
      id: 'whitehead-link',
      label: 'Whitehead link (L5a1)',
      payload: {
        name: 'Whitehead link preset',
        diagramType: 'link',
        lattice: 'hexagonal',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, [[2, 1]], null, null,
          null, [[0, 2], [1, 5]], [[4, 2], [1, 3]], null, null,
          null, [[5, 1]], [[1, 4], [5, 2]], [[2, 4]], null,
          null, [[5, 1], [4, 0]], [[3, 5], [2, 4]], null, null,
          null, null, [[4, 5]], null, null
        ]
      },
      squarePayload: {
        name: 'Whitehead link preset',
        diagramType: 'link',
        lattice: 'square',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, [[1, 0]], [[2, 1]], null,
          [[0, 1]], [[0, 2]], [[0, 2], [1, 3]], [[3, 1], [0, 2]], [[1, 2]],
          [[3, 1]], [[0, 1]], [[1, 3], [0, 2]], [[3, 2]], [[1, 3]],
          [[3, 0]], [[3, 1], [2, 0]], [[2, 0], [1, 3]], [[2, 0]], [[2, 3]],
          null, [[3, 0]], [[2, 3]], null, null
        ]
      }
    },
    {
      id: 'trefoil',
      label: 'Trefoil knot (3_1)',
      payload: {
        name: 'Trefoil knot preset',
        diagramType: 'link',
        lattice: 'hexagonal',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, null, null, null,
          null, [[1, 0]], [[2, 0], [3, 1]], [[3, 2]], null,
          null, null, [[0, 4], [1, 5]], [[4, 2], [5, 3]], null,
          null, null, [[5, 4]], null, null,
          null, null, null, null, null
        ]
      },
      squarePayload: {
        name: 'Trefoil knot preset',
        diagramType: 'link',
        lattice: 'square',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, [[0, 1]], [[1, 2]], null, null,
          [[0, 1]], [[0, 2], [3, 1]], [[1, 3], [0, 2]], [[1, 2]], null,
          [[3, 0]], [[3, 1], [2, 0]], [[1, 0], [2, 3]], [[2, 3]], null,
          null, [[3, 0]], [[2, 3]], null, null,
          null, null, null, null, null
        ]
      }
    },
    {
      id: 'figure-eight',
      label: 'Figure-eight knot (4_1)',
      payload: {
        name: 'Figure-eight knot preset',
        diagramType: 'link',
        lattice: 'hexagonal',
        inputMode: 'tiling',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, null, [[1, 2]], null, null,
          [[0, 1]], [[2, 0], [5, 3]], [[3, 1], [4, 2]], null, null,
          null, [[4, 0], [5, 1]], [[5, 2], [3, 0]], [[3, 2], [1, 4]], null,
          null, [[5, 0], [4, 1]], [[5, 2], [3, 0]], [[3, 4]], null,
          null, null, [[4, 5]], null, null
        ]
      },
      squarePayload: {
        name: 'Figure-eight knot preset',
        diagramType: 'link',
        lattice: 'square',
        inputMode: 'draw',
        rows: 5,
        cols: 5,
        boundary: 'open',
        tiles: [
          null, [[0, 1]], [[1, 2]], null, null,
          [[0, 1]], [[3, 2], [1, 0]], [[2, 0], [1, 3]], [[2, 1]], null,
          [[3, 0]], [[2, 0], [1, 3]], [[1, 3], [2, 0]], [[2, 1], [3, 0]], [[2, 1]],
          null, [[0, 3]], [[1, 2], [0, 3]], [[3, 1], [0, 2]], [[3, 2]],
          null, null, [[0, 3]], [[3, 2]], null
        ]
      }
    }
  ];
  const DUAL_GRAPH_PRESETS = [
    { id: 'random-stable-curve', label: 'Random stable curve' },
    { id: 'moduli', label: 'M_g,n stable graph' }
  ];

  function backgroundTiles(rows, cols) {
    return Array(Math.max(0, rows * cols)).fill(null);
  }

  function backgroundGluedEdge(latticeId, group, first, second, options = {}) {
    const lattice = LATTICES[latticeId] || LATTICES.square;
    const reversed = !!options.reversed;
    return {
      group,
      orientation: reversed ? 'reversed' : 'opposite',
      reversed,
      firstArrowReversed: Object.prototype.hasOwnProperty.call(options, 'firstArrowReversed')
        ? !!options.firstArrowReversed
        : false,
      secondArrowReversed: Object.prototype.hasOwnProperty.call(options, 'secondArrowReversed')
        ? !!options.secondArrowReversed
        : !reversed,
      first: { ...first, edge: lattice.dirNames[first.dir] },
      second: { ...second, edge: lattice.dirNames[second.dir] }
    };
  }

  function backgroundPresetPayload({
    name,
    lattice = 'square',
    rows,
    cols,
    backgroundAction = 'billiard',
    backgroundChainLength = 1,
    backgroundChainReversed = true,
    backgroundCuspMarkerScale = DEFAULT_BACKGROUND_CUSP_MARKER_SCALE,
    backgroundBilliardTrailLength = DEFAULT_BACKGROUND_BILLIARD_TRAIL_LENGTH,
    removedTiles = [],
    cutEdges = [],
    gluedEdges = []
  }) {
    return {
      name,
      lattice,
      diagramType: 'link',
      boundary: 'glued',
      wrappedViewMode: 'periodic',
      inputMode: 'background',
      backgroundAction,
      backgroundMultiEdges: true,
      backgroundChainLength,
      backgroundChainReversed,
      backgroundCuspMarkerScale,
      backgroundBilliardSpeed: DEFAULT_BACKGROUND_BILLIARD_SPEED,
      backgroundBilliardTrailLength,
      backgroundBilliardArrowLength: DEFAULT_BACKGROUND_BILLIARD_ARROW_LENGTH,
      backgroundBilliardHitMarkers: DEFAULT_BACKGROUND_BILLIARD_HIT_MARKERS,
      rows,
      cols,
      removedTiles,
      cutEdges,
      gluedEdges,
      tiles: backgroundTiles(rows, cols)
    };
  }

  function createRandomBackgroundGluedEdges(rows, cols) {
    const boundary = [];
    for (let col = 1; col <= cols; col += 1) {
      boundary.push({ row: 1, col, dir: 3 });
      boundary.push({ row: rows, col, dir: 1 });
    }
    for (let row = 1; row <= rows; row += 1) {
      boundary.push({ row, col: 1, dir: 2 });
      boundary.push({ row, col: cols, dir: 0 });
    }
    const shuffled = boundary.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    const pairs = [];
    for (let index = 0; index + 1 < shuffled.length; index += 2) {
      pairs.push(backgroundGluedEdge('square', Math.floor(index / 2), shuffled[index], shuffled[index + 1]));
    }
    return pairs;
  }

  function createRubiksCubeBackgroundPreset(size, id, label) {
    const rows = size * 3;
    const cols = size * 4;
    const removedTiles = [];
    for (let row = 1; row <= rows; row += 1) {
      for (let col = 1; col <= cols; col += 1) {
        const middleBand = row > size && row <= size * 2;
        const centerColumnBand = col > size && col <= size * 2;
        if (!middleBand && !centerColumnBand) removedTiles.push({ row, col });
      }
    }

    const groups = size === 2
      ? { outer: 6, leftTop: 9, topRight: 13, topMiddle: 10, bottomLeft: 15, bottomRight: 12, bottomFar: 14 }
      : { outer: 0, leftTop: 1, topRight: 2, topMiddle: 3, bottomLeft: 4, bottomRight: 5, bottomFar: 6 };
    const gluedEdges = [];
    const add = (group, first, second) => {
      gluedEdges.push(backgroundGluedEdge('square', group, first, second));
    };

    const addOuter = () => {
      for (let row = size + 1; row <= size * 2; row += 1) {
        add(groups.outer, { row, col: 1, dir: 2 }, { row, col: cols, dir: 0 });
      }
    };
    const addLeftTop = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          groups.leftTop,
          { row: size + 1, col: size - offset, dir: 3 },
          { row: size - offset, col: size + 1, dir: 2 }
        );
      }
    };
    const addTopRight = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          groups.topRight,
          { row: 1, col: size * 2 - offset, dir: 3 },
          { row: size + 1, col: size * 3 + 1 + offset, dir: 3 }
        );
      }
    };
    const addTopMiddle = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          groups.topMiddle,
          { row: size - offset, col: size * 2, dir: 0 },
          { row: size + 1, col: size * 2 + 1 + offset, dir: 3 }
        );
      }
    };
    const addBottomLeft = () => {
      for (let offset = 0; offset < size; offset += 1) {
        if (size === 2) {
          add(
            groups.bottomLeft,
            { row: size * 2 + 1 + offset, col: size + 1, dir: 2 },
            { row: size * 2, col: size - offset, dir: 1 }
          );
        } else {
          add(
            groups.bottomLeft,
            { row: size * 2, col: 1 + offset, dir: 1 },
            { row: rows - offset, col: size + 1, dir: 2 }
          );
        }
      }
    };
    const addBottomRight = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          groups.bottomRight,
          { row: size * 2, col: size * 2 + 1 + offset, dir: 1 },
          { row: size * 2 + 1 + offset, col: size * 2, dir: 0 }
        );
      }
    };
    const addBottomFar = () => {
      for (let offset = 0; offset < size; offset += 1) {
        if (size === 2) {
          add(
            groups.bottomFar,
            { row: size * 2, col: cols - offset, dir: 1 },
            { row: rows, col: size + 1 + offset, dir: 1 }
          );
        } else {
          add(
            groups.bottomFar,
            { row: rows, col: size + 1 + offset, dir: 1 },
            { row: size * 2, col: cols - offset, dir: 1 }
          );
        }
      }
    };

    addOuter();
    addLeftTop();
    if (size === 2) {
      addTopMiddle();
      addBottomRight();
      addTopRight();
      addBottomFar();
      addBottomLeft();
    } else {
      addTopRight();
      addTopMiddle();
      addBottomLeft();
      addBottomRight();
      addBottomFar();
    }

    return {
      id,
      label,
      payload: backgroundPresetPayload({
        name: `${label} background preset`,
        rows,
        cols,
        backgroundChainLength: size === 2 ? 2 : 3,
        backgroundBilliardTrailLength: size === 2 ? 180 : 400,
        removedTiles,
        gluedEdges
      })
    };
  }

  const BACKGROUND_SPACE_PRESETS = [
    {
      id: 'classic-4x4',
      label: '4*4 classic',
      payload: {
        name: '4*4 classic background preset',
        lattice: 'square',
        diagramType: 'link',
        boundary: 'glued',
        wrappedViewMode: 'periodic',
        inputMode: 'background',
        backgroundAction: 'tile',
        backgroundMultiEdges: true,
        rows: 4,
        cols: 4,
        removedTiles: [],
        cutEdges: [],
        gluedEdges: [],
        tiles: Array(16).fill(null)
      }
    },
    {
      id: 'genus-2',
      label: 'genus 2',
      payload: backgroundPresetPayload({
        name: 'genus 2 background preset',
        rows: 4,
        cols: 4,
        backgroundChainLength: 2,
        backgroundBilliardTrailLength: 170,
        gluedEdges: [
          backgroundGluedEdge('square', 0, { row: 4, col: 4, dir: 0 }, { row: 1, col: 3, dir: 3 }),
          backgroundGluedEdge('square', 0, { row: 3, col: 4, dir: 0 }, { row: 1, col: 4, dir: 3 }),
          backgroundGluedEdge('square', 2, { row: 1, col: 2, dir: 3 }, { row: 4, col: 1, dir: 2 }),
          backgroundGluedEdge('square', 2, { row: 1, col: 1, dir: 3 }, { row: 3, col: 1, dir: 2 }),
          backgroundGluedEdge('square', 3, { row: 4, col: 1, dir: 1 }, { row: 2, col: 1, dir: 2 }),
          backgroundGluedEdge('square', 3, { row: 4, col: 2, dir: 1 }, { row: 1, col: 1, dir: 2 }),
          backgroundGluedEdge('square', 4, { row: 2, col: 4, dir: 0 }, { row: 4, col: 4, dir: 1 }),
          backgroundGluedEdge('square', 4, { row: 1, col: 4, dir: 0 }, { row: 4, col: 3, dir: 1 })
        ]
      })
    },
    {
      id: 'random-glue-4x4',
      label: 'random glue 4*4',
      randomGlue: true,
      payload: backgroundPresetPayload({
        name: 'random glue 4*4 background preset',
        rows: 4,
        cols: 4,
        backgroundChainLength: 4,
        backgroundBilliardTrailLength: 170
      })
    },
    {
      id: 'half-glued',
      label: 'half-glued',
      payload: {
        name: 'half-glued background preset',
        lattice: 'square',
        diagramType: 'link',
        boundary: 'glued',
        wrappedViewMode: 'periodic',
        inputMode: 'background',
        backgroundAction: 'billiard',
        backgroundMultiEdges: true,
        backgroundChainLength: 2,
        backgroundChainReversed: true,
        backgroundCuspMarkerScale: 0.7,
        backgroundBilliardSpeed: 0.2,
        backgroundBilliardTrailLength: 200,
        backgroundBilliardArrowLength: 20,
        backgroundBilliardHitMarkers: 'boundary',
        rows: 4,
        cols: 4,
        removedTiles: [],
        cutEdges: [],
        gluedEdges: [
          {
            group: 0,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 1, dir: 3, edge: 'N' },
            second: { row: 4, col: 3, dir: 1, edge: 'S' }
          },
          {
            group: 0,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 2, dir: 3, edge: 'N' },
            second: { row: 4, col: 4, dir: 1, edge: 'S' }
          },
          {
            group: 1,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 3, col: 1, dir: 2, edge: 'W' },
            second: { row: 1, col: 4, dir: 0, edge: 'E' }
          },
          {
            group: 1,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 4, col: 1, dir: 2, edge: 'W' },
            second: { row: 2, col: 4, dir: 0, edge: 'E' }
          }
        ],
        tiles: Array(16).fill(null)
      }
    },
    {
      id: 'torus',
      label: 'torus',
      payload: {
        name: 'torus background preset',
        lattice: 'square',
        diagramType: 'link',
        boundary: 'glued',
        wrappedViewMode: 'periodic',
        inputMode: 'background',
        backgroundAction: 'billiard',
        backgroundMultiEdges: true,
        backgroundChainLength: 4,
        backgroundChainReversed: true,
        backgroundCuspMarkerScale: 0.7,
        backgroundBilliardSpeed: 0.2,
        backgroundBilliardTrailLength: 170,
        backgroundBilliardArrowLength: 20,
        backgroundBilliardHitMarkers: 'boundary',
        rows: 4,
        cols: 4,
        removedTiles: [],
        cutEdges: [],
        gluedEdges: [
          {
            group: 3,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 4, col: 4, dir: 0, edge: 'E' },
            second: { row: 4, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 3, col: 4, dir: 0, edge: 'E' },
            second: { row: 3, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 2, col: 4, dir: 0, edge: 'E' },
            second: { row: 2, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 4, dir: 0, edge: 'E' },
            second: { row: 1, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 3, dir: 3, edge: 'N' },
            second: { row: 4, col: 3, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 2, dir: 3, edge: 'N' },
            second: { row: 4, col: 2, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 1, dir: 3, edge: 'N' },
            second: { row: 4, col: 1, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 4, dir: 3, edge: 'N' },
            second: { row: 4, col: 4, dir: 1, edge: 'S' }
          }
        ],
        tiles: Array(16).fill(null)
      }
    },
    {
      id: 'klein-bottle',
      label: 'Klein bottle',
      payload: {
        name: 'Klein bottle background preset',
        lattice: 'square',
        diagramType: 'link',
        boundary: 'glued',
        wrappedViewMode: 'periodic',
        inputMode: 'background',
        backgroundAction: 'billiard',
        backgroundMultiEdges: true,
        backgroundChainLength: 4,
        backgroundChainReversed: true,
        backgroundCuspMarkerScale: 0.7,
        backgroundBilliardSpeed: 0.2,
        backgroundBilliardTrailLength: 170,
        backgroundBilliardArrowLength: 20,
        backgroundBilliardHitMarkers: 'boundary',
        rows: 4,
        cols: 4,
        removedTiles: [],
        cutEdges: [],
        gluedEdges: [
          {
            group: 3,
            orientation: 'reversed',
            reversed: true,
            firstArrowReversed: true,
            secondArrowReversed: true,
            first: { row: 1, col: 4, dir: 0, edge: 'E' },
            second: { row: 4, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'reversed',
            reversed: true,
            firstArrowReversed: true,
            secondArrowReversed: true,
            first: { row: 2, col: 4, dir: 0, edge: 'E' },
            second: { row: 3, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'reversed',
            reversed: true,
            firstArrowReversed: true,
            secondArrowReversed: true,
            first: { row: 3, col: 4, dir: 0, edge: 'E' },
            second: { row: 2, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 3,
            orientation: 'reversed',
            reversed: true,
            firstArrowReversed: true,
            secondArrowReversed: true,
            first: { row: 4, col: 4, dir: 0, edge: 'E' },
            second: { row: 1, col: 1, dir: 2, edge: 'W' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 3, dir: 3, edge: 'N' },
            second: { row: 4, col: 3, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 2, dir: 3, edge: 'N' },
            second: { row: 4, col: 2, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 1, dir: 3, edge: 'N' },
            second: { row: 4, col: 1, dir: 1, edge: 'S' }
          },
          {
            group: 4,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 1, col: 4, dir: 3, edge: 'N' },
            second: { row: 4, col: 4, dir: 1, edge: 'S' }
          }
        ],
        tiles: Array(16).fill(null)
      }
    },
    {
      id: 'ramified-cover',
      label: 'ramified cover',
      payload: {
        name: 'ramified cover background preset',
        lattice: 'square',
        diagramType: 'link',
        boundary: 'glued',
        wrappedViewMode: 'periodic',
        inputMode: 'background',
        backgroundAction: 'billiard',
        backgroundMultiEdges: true,
        backgroundChainLength: 2,
        backgroundChainReversed: true,
        backgroundCuspMarkerScale: 0.7,
        backgroundBilliardSpeed: 0.2,
        backgroundBilliardTrailLength: 170,
        backgroundBilliardArrowLength: 20,
        backgroundBilliardHitMarkers: 'boundary',
        rows: 4,
        cols: 9,
        removedTiles: [
          { row: 1, col: 5 },
          { row: 2, col: 5 },
          { row: 3, col: 5 },
          { row: 4, col: 5 }
        ],
        cutEdges: [
          { left: { row: 2, col: 3 }, right: { row: 3, col: 3 } },
          { left: { row: 2, col: 4 }, right: { row: 3, col: 4 } },
          { left: { row: 2, col: 8 }, right: { row: 3, col: 8 } },
          { left: { row: 2, col: 9 }, right: { row: 3, col: 9 } }
        ],
        gluedEdges: [
          {
            group: 0,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 2, col: 8, dir: 1, edge: 'S' },
            second: { row: 3, col: 3, dir: 3, edge: 'N' }
          },
          {
            group: 0,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 2, col: 9, dir: 1, edge: 'S' },
            second: { row: 3, col: 4, dir: 3, edge: 'N' }
          },
          {
            group: 1,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 2, col: 3, dir: 1, edge: 'S' },
            second: { row: 3, col: 8, dir: 3, edge: 'N' }
          },
          {
            group: 1,
            orientation: 'opposite',
            reversed: false,
            firstArrowReversed: false,
            secondArrowReversed: true,
            first: { row: 2, col: 4, dir: 1, edge: 'S' },
            second: { row: 3, col: 9, dir: 3, edge: 'N' }
          }
        ],
        tiles: Array(36).fill(null)
      }
    },
    createRubiksCubeBackgroundPreset(2, 'rubiks-cube-2x2x2', "Rubik's Cube 2*2*2"),
    createRubiksCubeBackgroundPreset(3, 'rubiks-cube-3x3x3', "Rubik's Cube 3*3*3"),
    {
      id: 'usual-strip',
      label: 'usual strip',
      payload: backgroundPresetPayload({
        name: 'usual strip background preset',
        lattice: 'hexagonal',
        rows: 4,
        cols: 5,
        backgroundChainLength: 7,
        backgroundCuspMarkerScale: 0.35,
        backgroundBilliardTrailLength: 180,
        gluedEdges: [
          backgroundGluedEdge('hexagonal', 0, { row: 1, col: 1, dir: 3 }, { row: 1, col: 5, dir: 0 }),
          backgroundGluedEdge('hexagonal', 0, { row: 1, col: 1, dir: 2 }, { row: 2, col: 5, dir: 5 }),
          backgroundGluedEdge('hexagonal', 0, { row: 2, col: 1, dir: 3 }, { row: 2, col: 5, dir: 0 }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 4 }, { row: 2, col: 5, dir: 1 }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 3 }, { row: 3, col: 5, dir: 0 }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 2 }, { row: 4, col: 5, dir: 5 }),
          backgroundGluedEdge('hexagonal', 0, { row: 4, col: 1, dir: 3 }, { row: 4, col: 5, dir: 0 })
        ]
      })
    },
    {
      id: 'mobius-strip',
      label: 'M\u00f6bius strip',
      payload: backgroundPresetPayload({
        name: 'M\u00f6bius strip background preset',
        lattice: 'hexagonal',
        rows: 4,
        cols: 5,
        backgroundChainLength: 7,
        backgroundCuspMarkerScale: 0.35,
        backgroundBilliardTrailLength: 180,
        gluedEdges: [
          backgroundGluedEdge('hexagonal', 0, { row: 1, col: 1, dir: 3 }, { row: 4, col: 5, dir: 0 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 1, col: 1, dir: 2 }, { row: 4, col: 5, dir: 5 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 2, col: 1, dir: 3 }, { row: 3, col: 5, dir: 0 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 4 }, { row: 2, col: 5, dir: 1 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 3 }, { row: 2, col: 5, dir: 0 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 3, col: 1, dir: 2 }, { row: 2, col: 5, dir: 5 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
          backgroundGluedEdge('hexagonal', 0, { row: 4, col: 1, dir: 3 }, { row: 1, col: 5, dir: 0 }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false })
        ]
      })
    },
    {
      id: 'hex-classic-4x4',
      label: 'hex classic 4*4',
      payload: backgroundPresetPayload({
        name: 'hex classic 4*4 background preset',
        lattice: 'hexagonal',
        rows: 4,
        cols: 4,
        backgroundAction: 'tile',
        backgroundChainLength: 1,
        backgroundBilliardTrailLength: 180
      })
    }
  ];
  const COMPACT_DUAL_GRAPH_LAYOUT_SCALE = 0.5;
  const MINI_SPECTRAL_LAYOUT_SCALE = 2;
  const MINI_FORCE_EDGE_LENGTH = 12;
  const DEGENERATION_FORCE_LIMIT = 20;
  const DEGENERATION_FORCE_DURATION_MS = 5000;

  const state = {
    rows: 5,
    cols: 5,
    lattice: 'hexagonal',
    diagramType: 'link',
    boundaryMode: 'grid',
    wrapped: false,
    tiles: [],
    removedTiles: new Set(),
    cutEdges: new Set(),
    gluedEdges: [],
    pendingGlueEdge: null,
    pendingGlueChains: null,
    backgroundMultiEdges: true,
    backgroundChainLength: 1,
    backgroundChainReversed: false,
    backgroundGlueWarning: '',
    backgroundGlueFlicker: null,
    backgroundOrientability: null,
    backgroundCuspMarkerScale: DEFAULT_BACKGROUND_CUSP_MARKER_SCALE,
    backgroundBilliardSpeed: DEFAULT_BACKGROUND_BILLIARD_SPEED,
    backgroundBilliardTrailLength: DEFAULT_BACKGROUND_BILLIARD_TRAIL_LENGTH,
    backgroundBilliardArrowLength: DEFAULT_BACKGROUND_BILLIARD_ARROW_LENGTH,
    backgroundBilliardHitMarkers: DEFAULT_BACKGROUND_BILLIARD_HIT_MARKERS,
    backgroundHoverCusp: null,
    backgroundBilliard: {
      tileIndex: -1,
      position: null,
      direction: null,
      aimPoint: null,
      hitPoints: [],
      trailPoints: [],
      trailColorMode: 'blue',
      playing: false,
      frame: null,
      lastTime: 0
    },
    selectedBackgroundCusp: null,
    edits: 0,
    showErrors: true,
    showCoords: false,
    colorComponents: true,
    displayPick: false,
    showCusps: false,
    showSeifertSurface: false,
    showSeifertBackground: false,
    colorSeifertBoundaries: false,
    seifertBandWidth: DEFAULT_SEIFERT_BAND_WIDTH,
    seifertSurfaceColor: DEFAULT_SEIFERT_SURFACE_COLOR,
    componentColors: [],
    drawStyle: 'shade',
    drawAction: 'edge',
    knotCodeKind: 'pd',
    wrappedViewMode: 'periodic',
    viewScale: 1,
    viewX: 0,
    viewY: 0,
    inputMode: 'draw',
    backgroundReturnInputMode: 'draw',
    backgroundAction: 'tile',
    displayPickInputLocked: false,
    displayPickReturnMode: 'draw',
    editMode: 'rotate',
    vertexDecorations: {},
    halfEdgeDecorations: {},
    standardDualGraphInput: null,
    halfEdgeLabelStyle: 'number',
    clearVertexDecorations: true,
    clearHalfEdgeDecorations: true,
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
    backgroundHoverEdge: null,
    dualGraphLayout: null,
    dualGraphLayoutMethod: 'force',
    dualGraphLayoutTimings: {},
    dualGraphSimulation: null,
    dualGraphDragging: null,
    dualGraphAnimating: false,
    dualGraphDegenerations: [],
    dualGraphDegenerationLayouts: new Map(),
    dualGraphDegenerationCurrentLayouts: new Map(),
    dualGraphDegenerationSourceKey: '',
    dualGraphDegenerationHoverTimer: null,
    dualGraphDegenerationAnimations: new Map(),
    dualGraphDegenerationsWide: false,
    dualGraphDegenerationInitialLayout: 'shell',
    dualGraphDegenerationForceEnabled: true,
    emphasizeDegenerations: false,
    dualGraphDegenerationEmphasisStyle: 'orange',
    decorationHoverHit: null,
    algebraicCurveModel: null,
    algebraicCurveDragging: null,
    algebraicPointOverrides: {},
    algebraicUserPointLocks: {},
    algebraicTangentOverrides: {},
    algebraicOptimizationRunning: false,
    algebraicOptimizationFrame: null,
    algebraicOptimization: null,
    showAlgebraicTangentHandles: false,
    algebraicEnergyTerms: {
      bend: true,
      length: true,
      crossing: true,
      spacing: true,
      boundary: true
    },
    riemannSurfaceModel: null,
    selectedRiemannVertex: null,
    dualGraphInvariantsExpanded: true,
    riemannNodeRadii: DEFAULT_RIEMANN_NODE_RADII.slice(),
    riemannLoopNodePositions: DEFAULT_RIEMANN_LOOP_NODE_POSITIONS.slice(),
    riemannLoopTangentScale: DEFAULT_RIEMANN_LOOP_TANGENT_SCALE,
    showRiemannDebugCircles: false,
    showRiemannBezierCurve: false,
    showDualGraphCanvas: false,
    showRiemannSurfaceCanvas: false,
    showAlgebraicCurveCanvas: false,
    wanderOpen: false,
    wanderWide: false,
    wanderSelectingStart: false,
    wanderSelectionReturnInputMode: '',
    wanderSelectionReturnBackgroundAction: '',
    wanderStartIndex: -1,
    wanderTiles: [],
    wanderCurrentId: null,
    wanderHoverEdge: null,
    wanderBounce: null,
    wanderAnimation: null,
    wanderCameraX: 0,
    wanderCameraY: 0,
    wanderCameraAnimation: null,
    wanderMarkerRadius: 2,
    wanderSmokeMarks: [],
    wanderSmokeColor: 'blue',
    wanderSmokeBrightness: 1,
    wanderSmokeShape: 'tile',
    wanderSmokeThickness: 2,
    wanderSmokeOpacity: 1,
    wanderSmokeGradientInner: 0,
    wanderSmokeGradientMid: 0.5,
    wanderSmokeGradientEdge: 1,
    wanderSmokeAlphaInner: 1,
    wanderSmokeAlphaMid: 0.5,
    wanderSmokeAlphaEdge: 0,
    wanderNextId: 1,
    wanderBoardKey: ''
  };

  const refs = {};
  let geometry = null;
  let wanderGeometry = null;
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
    initCustomTooltips();

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
    refs.boundaryMode = document.getElementById('boundary-mode');
    refs.wrapBoard = document.getElementById('wrap-board');
    refs.diagramTypeRow = document.getElementById('diagram-type-row');
    refs.inputModeRow = document.getElementById('input-mode-row');
    refs.inputBackgroundOption = refs.inputMode
      ? refs.inputMode.querySelector('option[value="background"]')
      : null;
    refs.backgroundPresetSelect = document.getElementById('background-preset-select');
    refs.loadBackgroundPreset = document.getElementById('load-background-preset');
    refs.exportBackgroundPreset = document.getElementById('export-background-preset');
    refs.backgroundAction = document.getElementById('background-action');
    refs.backgroundOccupiedOption = refs.backgroundAction
      ? refs.backgroundAction.querySelector('option[value="occupied"]')
      : null;
    refs.backgroundReverseGlueOption = refs.backgroundAction
      ? refs.backgroundAction.querySelector('option[value="reverse-glue"]')
      : null;
    refs.backgroundMultiEdgeRow = document.getElementById('background-multi-edge-row');
    refs.backgroundMultiEdges = document.getElementById('background-multi-edges');
    refs.backgroundBeginSecondChain = document.getElementById('background-begin-second-chain');
    refs.backgroundChainSettingsRow = document.getElementById('background-chain-settings-row');
    refs.backgroundChainLength = document.getElementById('background-chain-length');
    refs.backgroundChainReversed = document.getElementById('background-chain-reversed');
    refs.backgroundBilliardRow = document.getElementById('background-billiard-row');
    refs.backgroundBilliardPlay = document.getElementById('background-billiard-play');
    refs.backgroundBilliardClear = document.getElementById('background-billiard-clear');
    refs.backgroundBilliardSpeedRow = document.getElementById('background-billiard-speed-row');
    refs.backgroundBilliardSpeed = document.getElementById('background-billiard-speed');
    refs.backgroundBilliardSpeedValue = document.getElementById('background-billiard-speed-value');
    refs.backgroundBilliardTrailRow = document.getElementById('background-billiard-trail-row');
    refs.backgroundBilliardTrail = document.getElementById('background-billiard-trail');
    refs.backgroundBilliardTrailValue = document.getElementById('background-billiard-trail-value');
    refs.backgroundBilliardArrowRow = document.getElementById('background-billiard-arrow-row');
    refs.backgroundBilliardArrow = document.getElementById('background-billiard-arrow');
    refs.backgroundBilliardArrowValue = document.getElementById('background-billiard-arrow-value');
    refs.backgroundBilliardHitRow = document.getElementById('background-billiard-hit-row');
    refs.backgroundBilliardHitMarkers = document.getElementById('background-billiard-hit-markers');
    refs.backgroundCuspMarkerRow = document.getElementById('background-cusp-marker-row');
    refs.backgroundCuspMarkerScale = document.getElementById('background-cusp-marker-scale');
    refs.backgroundCuspMarkerScaleValue = document.getElementById('background-cusp-marker-scale-value');
    refs.editMode = document.getElementById('edit-mode');
    refs.drawAction = document.getElementById('draw-action');
    refs.drawVertexOption = refs.drawAction
      ? refs.drawAction.querySelector('option[value="vertex"]')
      : null;
    refs.drawLayer = document.getElementById('draw-layer');
    refs.drawStyle = document.getElementById('draw-style');
    refs.halfEdgeLabelStyle = document.getElementById('half-edge-label-style');
    refs.randomHalfEdgeLabels = document.getElementById('random-half-edge-labels');
    refs.clearDecorations = document.getElementById('clear-decorations');
    refs.clearVertexDecorations = document.getElementById('clear-vertex-decorations');
    refs.clearHalfEdgeDecorations = document.getElementById('clear-half-edge-decorations');
    refs.applyPick = document.getElementById('apply-pick');
    refs.showErrors = document.getElementById('show-errors');
    refs.showCoords = document.getElementById('show-coords');
    refs.colorComponents = document.getElementById('color-components');
    refs.displayPick = document.getElementById('display-pick');
    refs.showCuspsRow = document.getElementById('show-cusps-row');
    refs.showCusps = document.getElementById('show-cusps');
    refs.showSeifertSurfaceRow = document.getElementById('show-seifert-surface-row');
    refs.showSeifertSurface = document.getElementById('show-seifert-surface');
    refs.showSeifertBackgroundRow = document.getElementById('show-seifert-background-row');
    refs.showSeifertBackground = document.getElementById('show-seifert-background');
    refs.colorSeifertBoundariesRow = document.getElementById('color-seifert-boundaries-row');
    refs.colorSeifertBoundaries = document.getElementById('color-seifert-boundaries');
    refs.seifertSurfaceColorRow = document.getElementById('seifert-surface-color-row');
    refs.seifertSurfaceColor = document.getElementById('seifert-surface-color');
    refs.seifertBandWidthRow = document.getElementById('seifert-band-width-row');
    refs.seifertBandWidth = document.getElementById('seifert-band-width');
    refs.seifertBandWidthValue = document.getElementById('seifert-band-width-value');
    refs.seifertSurfaceCard = document.getElementById('seifert-surface-card');
    refs.seifertStats = {
      pieces: document.getElementById('seifert-piece-count'),
      components: document.getElementById('seifert-component-count'),
      connected: document.getElementById('seifert-connected'),
      boundary: document.getElementById('seifert-boundary-count'),
      openEnds: document.getElementById('seifert-open-ends'),
      genusEuler: document.getElementById('seifert-genus-euler'),
      boundaryColors: document.getElementById('seifert-boundary-colors')
    };
    refs.wrappedViewRow = document.getElementById('wrapped-view-row');
    refs.wrappedViewMode = document.getElementById('wrapped-view-mode');
    refs.wanderOpenRow = document.getElementById('wander-open-row');
    refs.openWander = document.getElementById('open-wander');
    refs.wanderSideHost = document.getElementById('wander-side-host');
    refs.wanderWideHost = document.getElementById('wander-wide-host');
    refs.wanderCard = document.getElementById('wander-card');
    refs.wanderCanvas = document.getElementById('wander-canvas');
    refs.wanderStatus = document.getElementById('wander-status');
    refs.wanderChooseStart = document.getElementById('wander-choose-start');
    refs.wanderReset = document.getElementById('wander-reset');
    refs.wanderToggleWide = document.getElementById('wander-toggle-wide');
    refs.wanderMarkerRadius = document.getElementById('wander-marker-radius');
    refs.wanderMarkerRadiusValue = document.getElementById('wander-marker-radius-value');
    refs.wanderSmokeColor = document.getElementById('wander-smoke-color');
    refs.wanderSmokeBrightness = document.getElementById('wander-smoke-brightness');
    refs.wanderSmokeBrightnessValue = document.getElementById('wander-smoke-brightness-value');
    refs.wanderSmokeShape = document.getElementById('wander-smoke-shape');
    refs.wanderSmokeThickness = document.getElementById('wander-smoke-thickness');
    refs.wanderSmokeThicknessValue = document.getElementById('wander-smoke-thickness-value');
    refs.wanderSmokeOpacity = document.getElementById('wander-smoke-opacity');
    refs.wanderSmokeOpacityValue = document.getElementById('wander-smoke-opacity-value');
    refs.wanderSmokeGradientInner = document.getElementById('wander-smoke-gradient-inner');
    refs.wanderSmokeGradientInnerValue = document.getElementById('wander-smoke-gradient-inner-value');
    refs.wanderSmokeGradientMid = document.getElementById('wander-smoke-gradient-mid');
    refs.wanderSmokeGradientMidValue = document.getElementById('wander-smoke-gradient-mid-value');
    refs.wanderSmokeGradientEdge = document.getElementById('wander-smoke-gradient-edge');
    refs.wanderSmokeGradientEdgeValue = document.getElementById('wander-smoke-gradient-edge-value');
    refs.wanderSmokeAlphaInner = document.getElementById('wander-smoke-alpha-inner');
    refs.wanderSmokeAlphaInnerValue = document.getElementById('wander-smoke-alpha-inner-value');
    refs.wanderSmokeAlphaMid = document.getElementById('wander-smoke-alpha-mid');
    refs.wanderSmokeAlphaMidValue = document.getElementById('wander-smoke-alpha-mid-value');
    refs.wanderSmokeAlphaEdge = document.getElementById('wander-smoke-alpha-edge');
    refs.wanderSmokeAlphaEdgeValue = document.getElementById('wander-smoke-alpha-edge-value');
    refs.knotStatus = document.getElementById('knot-status');
    refs.knotCard = document.getElementById('knot-card');
    refs.knotNameRow = document.getElementById('knot-name-row');
    refs.knotName = document.getElementById('knot-name');
    refs.knotCodeRow = document.getElementById('knot-code-row');
    refs.knotCodeKind = document.getElementById('knot-code-kind');
    refs.knotCode = document.getElementById('knot-code');
    refs.dualGraphCard = document.getElementById('dual-graph-card');
    refs.dualGraphDegenerationsCard = document.getElementById('dual-graph-degenerations-card');
    refs.dualGraphDegenerationsSideHost = document.getElementById('dual-graph-degenerations-side-host');
    refs.dualGraphDegenerationsWideHost = document.getElementById('dual-graph-degenerations-wide-host');
    refs.dualGraphStatus = document.getElementById('dual-graph-status');
    refs.dualGraphStatusText = document.getElementById('dual-graph-status-text');
    refs.dualGraphInvariantsRow = document.getElementById('dual-graph-invariants-row');
    refs.dualGraphInvariants = document.getElementById('dual-graph-invariants');
    refs.dualGraphInvariantToggle = document.getElementById('dual-graph-invariant-toggle');
    refs.dualGraphInvariantPanel = document.getElementById('dual-graph-invariant-panel');
    refs.dualGraphCanvas = document.getElementById('dual-graph-canvas');
    refs.dualGraphCanvasWrap = document.getElementById('dual-graph-canvas-wrap');
    refs.dualGraphViewWrap = document.getElementById('dual-graph-view-wrap');
    refs.dualGraphPlaceholder = document.getElementById('dual-graph-placeholder');
    refs.riemannSurfaceCanvas = document.getElementById('riemann-surface-canvas');
    refs.riemannSurfaceViewWrap = document.getElementById('riemann-surface-view-wrap');
    refs.algebraicCurveCanvas = document.getElementById('algebraic-curve-canvas');
    refs.algebraicCurveViewWrap = document.getElementById('algebraic-curve-view-wrap');
    refs.optimizeAlgebraicCurve = document.getElementById('optimize-algebraic-curve');
    refs.algebraicEnergyStatus = document.getElementById('algebraic-energy-status');
    refs.showAlgebraicTangentHandles = document.getElementById('show-algebraic-tangent-handles');
    refs.algebraicEnergyTermInputs = Array.from(document.querySelectorAll('[data-algebraic-energy-term]'));
    refs.dualGraphLayoutMethod = document.getElementById('dual-graph-layout-method');
    refs.dualGraphLayoutTime = document.getElementById('dual-graph-layout-time');
    refs.dualGraphLayoutControls = document.getElementById('dual-graph-layout-controls');
    refs.computeLayout = document.getElementById('compute-layout');
    refs.resetLayout = document.getElementById('reset-layout');
    refs.computeDegenerations = document.getElementById('compute-degenerations');
    refs.exportDegenerations = document.getElementById('export-degenerations');
    refs.toggleDegenerationsWide = document.getElementById('toggle-degenerations-wide');
    refs.dualGraphDegenerationInitialLayout = document.getElementById('dual-graph-degeneration-initial-layout');
    refs.dualGraphDegenerationForce = document.getElementById('dual-graph-degeneration-force');
    refs.emphasizeDegenerations = document.getElementById('emphasize-degenerations');
    refs.dualGraphDegenerationEmphasisStyle = document.getElementById('dual-graph-degeneration-emphasis-style');
    refs.dualGraphDegenerationsStatus = document.getElementById('dual-graph-degenerations-status');
    refs.dualGraphDegenerationsGrid = document.getElementById('dual-graph-degenerations-grid');
    refs.exportDualGraph = document.getElementById('export-dual-graph');
    refs.showDualGraphCanvas = document.getElementById('show-dual-graph-canvas');
    refs.showRiemannSurfaceCanvas = document.getElementById('show-riemann-surface-canvas');
    refs.showAlgebraicCurveCanvas = document.getElementById('show-algebraic-curve-canvas');
    refs.dualGraphViewButtons = Array.from(document.querySelectorAll('[data-dual-graph-view]'));
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
    refs.importPresetSelect = document.getElementById('import-preset-select');
    refs.loadImportPreset = document.getElementById('load-import-preset');
    refs.dualGraphPresetControls = document.getElementById('dual-graph-preset-controls');
    refs.dualGraphPresetGenus = document.getElementById('dual-graph-preset-genus');
    refs.dualGraphPresetMarkings = document.getElementById('dual-graph-preset-markings');
    refs.exportCard = document.getElementById('export-card');
    refs.exportOut = document.getElementById('export-out');
    refs.inputPanels = Array.from(document.querySelectorAll('[data-input-panel]'));

    refs.out = {
      cardLabel: document.getElementById('statistics-card-label'),
      tilesRow: document.getElementById('out-tiles-row'),
      openEndsRow: document.getElementById('out-open-ends-row'),
      boundaryComponentsRow: document.getElementById('out-boundary-components-row'),
      orientableRow: document.getElementById('out-orientable-row'),
      componentsRow: document.getElementById('out-components-row'),
      surfaceTypeRow: document.getElementById('out-surface-type-row'),
      genusRow: document.getElementById('out-genus-row'),
      cuspsRow: document.getElementById('out-cusps-row'),
      tilesLabel: document.getElementById('out-tiles-label'),
      openEndsLabel: document.getElementById('out-open-ends-label'),
      boundaryComponentsLabel: document.getElementById('out-boundary-components-label'),
      orientableLabel: document.getElementById('out-orientable-label'),
      componentsLabel: document.getElementById('out-components-label'),
      genusLabel: document.getElementById('out-genus-label'),
      tiles: document.getElementById('out-tiles'),
      openEnds: document.getElementById('out-open-ends'),
      boundaryComponents: document.getElementById('out-boundary-components'),
      orientable: document.getElementById('out-orientable'),
      components: document.getElementById('out-components'),
      surfaceType: document.getElementById('out-surface-type'),
      genus: document.getElementById('out-genus'),
      cusps: document.getElementById('out-cusps')
    };
  }

  function bindControls() {
    refs.gridRows.addEventListener('change', () => generateFromControls());
    refs.gridCols.addEventListener('change', () => generateFromControls());
    refs.diagramType.addEventListener('change', () => {
      setDiagramType(refs.diagramType.value);
    });
    refs.inputMode.addEventListener('change', () => {
      setInputMode(refs.inputMode.value);
    });
    refs.latticeSelect.addEventListener('change', () => generateFromControls());
    if (refs.boundaryMode) refs.boundaryMode.addEventListener('change', () => generateFromControls());
    if (refs.wrapBoard) refs.wrapBoard.addEventListener('change', () => generateFromControls());
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
    if (refs.backgroundAction) {
      refs.backgroundAction.addEventListener('change', () => {
        state.backgroundAction = normalizeBackgroundAction(refs.backgroundAction.value);
        refs.backgroundAction.value = state.backgroundAction;
        state.hoverIndex = -1;
        state.backgroundHoverEdge = null;
        state.backgroundHoverCusp = null;
        if (!isBackgroundGlueAction()) clearPendingGlueEdge();
        if (!isBackgroundBilliardAction()) stopBackgroundBilliard(false);
        syncBackgroundModeControls();
        syncMainCanvasCursor();
        updateReport(false);
      });
    }
    if (refs.loadBackgroundPreset) {
      refs.loadBackgroundPreset.addEventListener('click', loadSelectedBackgroundPreset);
    }
    if (refs.exportBackgroundPreset) {
      refs.exportBackgroundPreset.addEventListener('click', exportBackgroundPreset);
    }
    if (refs.backgroundMultiEdges) {
      refs.backgroundMultiEdges.addEventListener('change', () => {
        state.backgroundMultiEdges = refs.backgroundMultiEdges.checked;
        clearPendingGlueEdge();
        syncBackgroundModeControls();
        updateReport(false);
      });
    }
    if (refs.backgroundChainLength) {
      refs.backgroundChainLength.addEventListener('change', () => {
        state.backgroundChainLength = normalizeBackgroundChainLength(refs.backgroundChainLength.value);
        rebuildPendingGlueChainsFromSettings();
        syncBackgroundModeControls();
        updateReport(false);
      });
    }
    if (refs.backgroundChainReversed) {
      refs.backgroundChainReversed.addEventListener('change', () => {
        state.backgroundChainReversed = !!refs.backgroundChainReversed.checked;
        setActivePendingGlueChainReversed(state.backgroundChainReversed);
        rebuildPendingGlueChainsFromSettings();
        syncBackgroundModeControls();
        updateReport(false);
      });
    }
    if (refs.backgroundBeginSecondChain) {
      refs.backgroundBeginSecondChain.addEventListener('click', beginSecondGlueBoundaryChain);
    }
    if (refs.backgroundBilliardPlay) {
      refs.backgroundBilliardPlay.addEventListener('click', toggleBackgroundBilliardPlayback);
    }
    if (refs.backgroundBilliardClear) {
      refs.backgroundBilliardClear.addEventListener('click', () => clearBackgroundBilliard(true));
    }
    if (refs.backgroundBilliardSpeed) {
      refs.backgroundBilliardSpeed.addEventListener('input', () => {
        state.backgroundBilliardSpeed = normalizeBackgroundBilliardSpeed(refs.backgroundBilliardSpeed.value);
        syncBackgroundBilliardControls();
        refreshExport();
      });
    }
    if (refs.backgroundBilliardTrail) {
      refs.backgroundBilliardTrail.addEventListener('input', () => {
        state.backgroundBilliardTrailLength = normalizeBackgroundBilliardTrailLength(refs.backgroundBilliardTrail.value);
        trimBackgroundBilliardTrail();
        syncBackgroundBilliardControls();
        draw(analyze());
        refreshExport();
      });
    }
    if (refs.backgroundBilliardArrow) {
      refs.backgroundBilliardArrow.addEventListener('input', () => {
        state.backgroundBilliardArrowLength = normalizeBackgroundBilliardArrowLength(refs.backgroundBilliardArrow.value);
        syncBackgroundBilliardControls();
        draw(analyze());
        refreshExport();
      });
    }
    if (refs.backgroundBilliardHitMarkers) {
      refs.backgroundBilliardHitMarkers.addEventListener('change', () => {
        state.backgroundBilliardHitMarkers = normalizeBackgroundBilliardHitMarkers(refs.backgroundBilliardHitMarkers.value);
        refs.backgroundBilliardHitMarkers.value = state.backgroundBilliardHitMarkers;
        draw(analyze());
        refreshExport();
      });
    }
    if (refs.backgroundCuspMarkerScale) {
      refs.backgroundCuspMarkerScale.addEventListener('input', () => {
        state.backgroundCuspMarkerScale = normalizeBackgroundCuspMarkerScale(refs.backgroundCuspMarkerScale.value);
        syncBackgroundModeControls();
        updateReport(false);
      });
    }
    if (refs.halfEdgeLabelStyle) {
      refs.halfEdgeLabelStyle.addEventListener('change', () => {
        state.halfEdgeLabelStyle = normalizeHalfEdgeLabelStyle(refs.halfEdgeLabelStyle.value);
        refs.halfEdgeLabelStyle.value = state.halfEdgeLabelStyle;
        refreshExport();
      });
    }
    if (refs.randomHalfEdgeLabels) {
      refs.randomHalfEdgeLabels.addEventListener('click', randomizeHalfEdgeDecorations);
    }
    if (refs.clearDecorations) {
      refs.clearDecorations.addEventListener('click', clearSelectedDecorations);
    }
    if (refs.clearVertexDecorations) {
      refs.clearVertexDecorations.addEventListener('change', () => {
        state.clearVertexDecorations = refs.clearVertexDecorations.checked;
        refreshExport();
      });
    }
    if (refs.clearHalfEdgeDecorations) {
      refs.clearHalfEdgeDecorations.addEventListener('change', () => {
        state.clearHalfEdgeDecorations = refs.clearHalfEdgeDecorations.checked;
        refreshExport();
      });
    }

    document.getElementById('clear-board').addEventListener('click', clearBoard);
    document.getElementById('generate-import').addEventListener('click', generateFromImport);
    if (refs.loadImportPreset) refs.loadImportPreset.addEventListener('click', loadSelectedImportPreset);
    if (refs.importPresetSelect) {
      refs.importPresetSelect.addEventListener('change', syncImportPresetControls);
    }
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
    if (refs.showCusps) {
      refs.showCusps.addEventListener('change', () => {
        state.showCusps = refs.showCusps.checked;
        if (!shouldShowBackgroundCusps()) {
          state.backgroundHoverCusp = null;
          state.selectedBackgroundCusp = null;
        }
        updateReport(false);
        refreshExport();
      });
    }
    if (refs.showSeifertSurface) {
      refs.showSeifertSurface.addEventListener('click', () => {
        state.showSeifertSurface = !state.showSeifertSurface;
        syncSeifertSurfaceControls();
        updateReport(false);
      });
    }
    if (refs.showSeifertBackground) {
      refs.showSeifertBackground.addEventListener('change', () => {
        state.showSeifertBackground = refs.showSeifertBackground.checked;
        syncSeifertSurfaceControls();
        updateReport(false);
      });
    }
    if (refs.colorSeifertBoundaries) {
      refs.colorSeifertBoundaries.addEventListener('change', () => {
        state.colorSeifertBoundaries = refs.colorSeifertBoundaries.checked;
        syncSeifertSurfaceControls();
        updateReport(false);
      });
    }
    if (refs.seifertSurfaceColor) {
      refs.seifertSurfaceColor.addEventListener('input', () => {
        state.seifertSurfaceColor = normalizeSeifertSurfaceColor(refs.seifertSurfaceColor.value);
        syncSeifertSurfaceControls();
        updateReport(false);
      });
      refs.seifertSurfaceColor.addEventListener('change', () => {
        state.seifertSurfaceColor = normalizeSeifertSurfaceColor(refs.seifertSurfaceColor.value);
        syncSeifertSurfaceControls();
        updateReport(false);
      });
    }
    if (refs.seifertBandWidth) {
      refs.seifertBandWidth.addEventListener('input', () => {
        state.seifertBandWidth = normalizeSeifertBandWidth(refs.seifertBandWidth.value);
        syncSeifertSurfaceControls();
        updateReport(false);
      });
    }
    document.querySelectorAll('[data-color-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.colorTarget || '');
        if (!input) return;
        input.value = normalizeSeifertSurfaceColor(button.dataset.colorValue, input.value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    refs.wrappedViewMode.addEventListener('change', () => {
      state.wrappedViewMode = refs.wrappedViewMode.value === 'single' ? 'single' : 'periodic';
      normalizeViewOffset();
      updateReport(false);
    });
    if (refs.openWander) {
      refs.openWander.addEventListener('click', openWanderChart);
    }
    if (refs.wanderChooseStart) {
      refs.wanderChooseStart.addEventListener('click', beginWanderStartSelection);
    }
    if (refs.wanderReset) {
      refs.wanderReset.addEventListener('click', () => {
        resetWanderPath('select a start tile on the main canvas', true);
        draw(analyze());
      });
    }
    if (refs.wanderToggleWide) {
      refs.wanderToggleWide.addEventListener('click', () => setWanderWide(!state.wanderWide));
    }
    if (refs.wanderMarkerRadius) {
      refs.wanderMarkerRadius.addEventListener('input', () => {
        state.wanderMarkerRadius = normalizeWanderMarkerRadius(refs.wanderMarkerRadius.value);
        syncWanderMarkerRadiusControl();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    if (refs.wanderSmokeColor) {
      refs.wanderSmokeColor.addEventListener('change', () => {
        state.wanderSmokeColor = normalizeWanderSmokeColor(refs.wanderSmokeColor.value);
        syncWanderSmokeControls();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    if (refs.wanderSmokeBrightness) {
      refs.wanderSmokeBrightness.addEventListener('input', () => {
        state.wanderSmokeBrightness = normalizeWanderSmokeBrightness(refs.wanderSmokeBrightness.value);
        syncWanderSmokeControls();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    if (refs.wanderSmokeShape) {
      refs.wanderSmokeShape.addEventListener('change', () => {
        state.wanderSmokeShape = normalizeWanderSmokeShape(refs.wanderSmokeShape.value);
        syncWanderSmokeControls();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    if (refs.wanderSmokeThickness) {
      refs.wanderSmokeThickness.addEventListener('input', () => {
        state.wanderSmokeThickness = normalizeWanderSmokeThickness(refs.wanderSmokeThickness.value);
        syncWanderSmokeControls();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    if (refs.wanderSmokeOpacity) {
      refs.wanderSmokeOpacity.addEventListener('input', () => {
        state.wanderSmokeOpacity = normalizeWanderSmokeOpacity(refs.wanderSmokeOpacity.value);
        syncWanderSmokeControls();
        draw(analyze());
        focusWanderCanvas();
      });
    }
    bindWanderSmokeGradientControl(refs.wanderSmokeGradientInner, 'wanderSmokeGradientInner');
    bindWanderSmokeGradientControl(refs.wanderSmokeGradientMid, 'wanderSmokeGradientMid');
    bindWanderSmokeGradientControl(refs.wanderSmokeGradientEdge, 'wanderSmokeGradientEdge');
    bindWanderSmokeAlphaControl(refs.wanderSmokeAlphaInner, 'wanderSmokeAlphaInner');
    bindWanderSmokeAlphaControl(refs.wanderSmokeAlphaMid, 'wanderSmokeAlphaMid');
    bindWanderSmokeAlphaControl(refs.wanderSmokeAlphaEdge, 'wanderSmokeAlphaEdge');
    if (refs.wanderCanvas) {
      refs.wanderCanvas.addEventListener('pointerdown', handleWanderPointerDown);
      refs.wanderCanvas.addEventListener('pointermove', handleWanderPointerMove);
      refs.wanderCanvas.addEventListener('mouseleave', () => {
        state.wanderHoverEdge = null;
        renderWanderChart();
      });
      bindTouchFallback(refs.wanderCanvas, {
        touchstart: handleWanderPointerDown,
        touchmove: handleWanderPointerMove
      });
      refs.wanderCanvas.addEventListener('contextmenu', (event) => event.preventDefault());
    }
    document.addEventListener('keydown', handleWanderKeyDown);
    refs.knotCodeKind.addEventListener('change', () => {
      state.knotCodeKind = normalizeKnotCodeKind(refs.knotCodeKind.value);
      updateKnotCard(analyze());
      refreshExport();
    });
    if (refs.dualGraphLayoutMethod) {
      refs.dualGraphLayoutMethod.addEventListener('change', () => {
        setDualGraphLayoutMethod(refs.dualGraphLayoutMethod.value);
      });
    }
    if (refs.computeLayout) {
      refs.computeLayout.addEventListener('click', () => {
        if (!state.dualGraphData || !(state.showDualGraphCanvas || state.showRiemannSurfaceCanvas)) return;
        runSelectedDualGraphLayout();
      });
    }
    if (refs.computeDegenerations) {
      refs.computeDegenerations.addEventListener('click', computeAndRenderDualGraphDegenerations);
    }
    if (refs.exportDegenerations) {
      refs.exportDegenerations.addEventListener('click', exportDualGraphDegenerations);
    }
    if (refs.toggleDegenerationsWide) {
      refs.toggleDegenerationsWide.addEventListener('click', () => {
        setDualGraphDegenerationsWide(!state.dualGraphDegenerationsWide);
      });
    }
    if (refs.dualGraphDegenerationInitialLayout) {
      refs.dualGraphDegenerationInitialLayout.addEventListener('change', () => {
        state.dualGraphDegenerationInitialLayout = normalizeDualGraphDegenerationInitialLayout(refs.dualGraphDegenerationInitialLayout.value);
        refs.dualGraphDegenerationInitialLayout.value = state.dualGraphDegenerationInitialLayout;
        state.dualGraphDegenerationLayouts = new Map();
        renderDualGraphDegenerationChart({ runInitialForce: true });
        refreshExport();
      });
    }
    if (refs.dualGraphDegenerationForce) {
      refs.dualGraphDegenerationForce.addEventListener('change', () => {
        state.dualGraphDegenerationForceEnabled = refs.dualGraphDegenerationForce.checked;
        if (state.dualGraphDegenerationForceEnabled) {
          runInitialDualGraphDegenerationForce();
        } else {
          clearDualGraphDegenerationAnimations();
          renderDualGraphDegenerationChart({ skipInitialForce: true });
        }
        refreshExport();
      });
    }
    if (refs.emphasizeDegenerations) {
      refs.emphasizeDegenerations.addEventListener('change', () => {
        state.emphasizeDegenerations = refs.emphasizeDegenerations.checked;
        syncDualGraphDegenerationEmphasisControls();
        repaintDualGraphDegenerationCanvases();
        refreshExport();
      });
    }
    if (refs.dualGraphDegenerationEmphasisStyle) {
      refs.dualGraphDegenerationEmphasisStyle.addEventListener('change', () => {
        if (!state.emphasizeDegenerations) {
          syncDualGraphDegenerationEmphasisControls();
          return;
        }
        state.dualGraphDegenerationEmphasisStyle = normalizeDualGraphDegenerationEmphasisStyle(refs.dualGraphDegenerationEmphasisStyle.value);
        refs.dualGraphDegenerationEmphasisStyle.value = state.dualGraphDegenerationEmphasisStyle;
        repaintDualGraphDegenerationCanvases();
        refreshExport();
      });
    }
    if (refs.optimizeAlgebraicCurve) {
      refs.optimizeAlgebraicCurve.addEventListener('click', () => {
        if (!state.dualGraphData || !state.showAlgebraicCurveCanvas) return;
        if (state.algebraicOptimizationRunning) {
          stopAlgebraicCurveOptimization();
        } else {
          startAlgebraicCurveOptimization(state.dualGraphData);
        }
      });
    }
    if (refs.resetLayout) {
      refs.resetLayout.addEventListener('click', () => {
        stopAlgebraicCurveOptimization();
        state.dualGraphAnimating = false;
        state.dualGraphDragging = null;
        state.dualGraphLayout = null;
        state.algebraicCurveDragging = null;
        state.algebraicPointOverrides = {};
        state.algebraicUserPointLocks = {};
        state.algebraicTangentOverrides = {};
        if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
        syncDualGraphLayoutControls();
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
    if (refs.showAlgebraicCurveCanvas) {
      refs.showAlgebraicCurveCanvas.addEventListener('change', () => {
        state.showAlgebraicCurveCanvas = refs.showAlgebraicCurveCanvas.checked;
        syncDualGraphCanvasVisibility();
        if (state.dualGraphData) renderVisibleDualGraphVisualizations(state.dualGraphData);
      });
    }
    if (refs.dualGraphViewButtons) {
      refs.dualGraphViewButtons.forEach((button) => {
        button.addEventListener('click', () => {
          toggleDualGraphVisualizationView(button.dataset.dualGraphView);
        });
      });
    }
    if (refs.showAlgebraicTangentHandles) {
      refs.showAlgebraicTangentHandles.addEventListener('change', () => {
        state.showAlgebraicTangentHandles = refs.showAlgebraicTangentHandles.checked;
        if (!state.showAlgebraicTangentHandles) state.algebraicCurveDragging = null;
        if (state.dualGraphData && state.showAlgebraicCurveCanvas) renderAlgebraicCurveVisualization(state.dualGraphData);
      });
    }
    if (refs.algebraicEnergyTermInputs) {
      refs.algebraicEnergyTermInputs.forEach((input) => {
        input.addEventListener('change', () => {
          const term = input.dataset.algebraicEnergyTerm;
          if (!Object.prototype.hasOwnProperty.call(state.algebraicEnergyTerms, term)) return;
          state.algebraicEnergyTerms[term] = input.checked;
          stopAlgebraicCurveOptimization();
          if (state.dualGraphData && state.showAlgebraicCurveCanvas) renderAlgebraicCurveVisualization(state.dualGraphData);
        });
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
      refs.riemannSurfaceCanvas.addEventListener('pointerdown', handleRiemannSurfacePointerDown);
      bindTouchFallback(refs.riemannSurfaceCanvas, {
        touchstart: handleRiemannSurfacePointerDown
      });
    }
    if (refs.algebraicCurveCanvas) {
      refs.algebraicCurveCanvas.addEventListener('pointerdown', handleAlgebraicCurvePointerDown);
      refs.algebraicCurveCanvas.addEventListener('pointermove', handleAlgebraicCurvePointerMove);
      refs.algebraicCurveCanvas.addEventListener('pointerup', handleAlgebraicCurvePointerUp);
      refs.algebraicCurveCanvas.addEventListener('pointercancel', handleAlgebraicCurvePointerUp);
      bindTouchFallback(refs.algebraicCurveCanvas, {
        touchstart: handleAlgebraicCurvePointerDown,
        touchmove: handleAlgebraicCurvePointerMove,
        touchend: handleAlgebraicCurvePointerUp,
        touchcancel: handleAlgebraicCurvePointerUp
      });
      refs.algebraicCurveCanvas.addEventListener('contextmenu', handleAlgebraicCurveContextMenu);
    }
    if (refs.dualGraphCanvas) {
      refs.dualGraphCanvas.addEventListener('pointerdown', handleDualGraphPointerDown);
      refs.dualGraphCanvas.addEventListener('pointermove', handleDualGraphPointerMove);
      refs.dualGraphCanvas.addEventListener('pointerup', handleDualGraphPointerUp);
      refs.dualGraphCanvas.addEventListener('pointercancel', handleDualGraphPointerUp);
      bindTouchFallback(refs.dualGraphCanvas, {
        touchstart: handleDualGraphPointerDown,
        touchmove: handleDualGraphPointerMove,
        touchend: handleDualGraphPointerUp,
        touchcancel: handleDualGraphPointerUp
      });
    }
    window.addEventListener('resize', debounce(() => {
      const oldGeometry = geometry;
      resizeCanvas();
      resizeWanderCanvas();
      remapBackgroundBilliardAfterResize(oldGeometry);
      normalizeViewOffset();
      syncDualGraphDegenerationWidePlacement();
      syncWanderPlacement();
      draw(analyze());
    }, 80));

    bindPalette();
  }

  function setInputMode(mode, options = {}) {
    state.inputMode = normalizeInputMode(mode);
    if (state.inputMode !== 'background') state.backgroundReturnInputMode = state.inputMode;
    refs.inputMode.value = state.inputMode;
    clearDecorationClickTimer();
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.decorationHoverHit = null;
    state.backgroundHoverEdge = null;
    state.backgroundHoverCusp = null;
    if (state.inputMode !== 'background') clearPendingGlueEdge();
    if (state.inputMode !== 'background') stopBackgroundBilliard(false);
    syncMainCanvasCursor();
    if (state.inputMode !== 'pick' && !state.displayPick && options.clearPick !== false) {
      state.pickedComponent = null;
      state.pickedAnchor = null;
    }
    clearEditorDrag();
    cancelDrawGesture();
    if (isTilingMode()) renderTilePalette();
    updateInputModePanels();
    syncImportPresetControls();
    updateDrawModeControls();
    syncBackgroundModeControls();
    updateInputModePanels();
    updateInputModeLock();
    updateReport(false);
  }

  function setDiagramType(type) {
    const nextType = normalizeDiagramType(type);
    if (nextType === state.diagramType) {
      syncAllInputs(state.rows, state.cols, state.lattice, state.boundaryMode);
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
      state.halfEdgeDecorations = {};
      state.standardDualGraphInput = null;
      if (state.inputMode === 'decoration') state.inputMode = 'draw';
    }
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.componentColors = [];
    state.edits += 1;
    syncAllInputs(state.rows, state.cols, state.lattice, state.boundaryMode);
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
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
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
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (_) {}
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

  function initCustomTooltips() {
    if (document.body.dataset.customTooltipsReady === '1') return;
    document.body.dataset.customTooltipsReady = '1';

    const tip = document.createElement('div');
    tip.className = 'custom-tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);

    let activeEl = null;

    function placeTooltip(el) {
      const rect = el.getBoundingClientRect();
      const margin = 10;
      const gap = 8;
      tip.style.left = '0px';
      tip.style.top = '0px';
      const tipRect = tip.getBoundingClientRect();
      let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
      left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
      let top = rect.top - tipRect.height - gap;
      if (top < margin) top = rect.bottom + gap;
      top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin));
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;
    }

    function showTooltip(el) {
      const text = el.getAttribute('data-tooltip');
      if (!text) return;
      activeEl = el;
      tip.textContent = text;
      tip.classList.add('visible');
      placeTooltip(el);
    }

    function hideTooltip(el) {
      if (el && activeEl && el !== activeEl) return;
      tip.classList.remove('visible');
      activeEl = null;
    }

    document.addEventListener('pointerenter', (event) => {
      const el = event.target && event.target.closest ? event.target.closest('[data-tooltip]') : null;
      if (el) showTooltip(el);
    }, true);
    document.addEventListener('pointerleave', (event) => {
      const el = event.target && event.target.closest ? event.target.closest('[data-tooltip]') : null;
      if (el) hideTooltip(el);
    }, true);
    document.addEventListener('focusin', (event) => {
      const el = event.target && event.target.closest ? event.target.closest('[data-tooltip]') : null;
      if (el) showTooltip(el);
    });
    document.addEventListener('focusout', (event) => {
      const el = event.target && event.target.closest ? event.target.closest('[data-tooltip]') : null;
      if (el) hideTooltip(el);
    });
    window.addEventListener('scroll', () => {
      if (activeEl) placeTooltip(activeEl);
    }, true);
    window.addEventListener('resize', () => {
      if (activeEl) placeTooltip(activeEl);
    });
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
        const halfEdgeHit = halfEdgeDecorationHitTest(event.clientX, event.clientY);
        if (halfEdgeHit) {
          setHalfEdgeDecoration(halfEdgeHit.key, '');
          return;
        }
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
          } else if (tileExists(hit) && !isTileEmpty(state.tiles[hit])) {
            if (state.drawAction === 'edge') cycleTilePairs(hit);
            else applyDrawTileAction(hit, -1);
          }
        }
        return;
      }
      if (!isTilingMode()) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit >= 0 && tileExists(hit) && !isTileEmpty(state.tiles[hit])) editExistingTile(hit, -1);
    });
    refs.canvas.addEventListener('mouseleave', () => {
      clearDrawDebugHit(false);
      clearPickHoverHit(false);
      state.hoverIndex = -1;
      state.decorationHoverHit = null;
      state.backgroundHoverEdge = null;
      state.backgroundHoverCusp = null;
      if (state.backgroundBilliard) state.backgroundBilliard.aimPoint = null;
      syncMainCanvasCursor();
      draw(analyze());
    });
    refs.canvas.addEventListener('mousemove', (event) => {
      if (pointerState) return;
      if (state.inputMode === 'import') {
        if (state.hoverIndex !== -1) {
          state.hoverIndex = -1;
          state.decorationHoverHit = null;
          syncMainCanvasCursor();
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'background') {
        const debugChanged = clearDrawDebugHit(false);
        const isBilliard = isBackgroundBilliardAction();
        const cusp = isBilliard ? null : backgroundCuspHitTest(event.clientX, event.clientY);
        const edge = !isBilliard && isBackgroundBoundaryAction()
          ? backgroundEdgeHitTest(event.clientX, event.clientY)
          : null;
        const hit = !isBilliard && isBackgroundBoundaryAction()
          ? -1
          : backgroundTileHitIndex(event.clientX, event.clientY);
        const aimChanged = isBilliard ? updateBackgroundBilliardAim(event.clientX, event.clientY, false) : false;
        const edgeChanged = !sameBackgroundEdgeHit(edge, state.backgroundHoverEdge);
        const cuspChanged = !sameBackgroundCuspHit(cusp, state.backgroundHoverCusp);
        if (hit !== state.hoverIndex || edgeChanged || cuspChanged || state.decorationHoverHit || debugChanged || aimChanged) {
          state.hoverIndex = hit;
          state.backgroundHoverEdge = edge;
          state.backgroundHoverCusp = cusp;
          state.decorationHoverHit = null;
          syncMainCanvasCursor();
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'pick') {
        const pickChanged = updatePickHoverFromPoint(event.clientX, event.clientY, false);
        if (state.hoverIndex !== -1 || state.decorationHoverHit || pickChanged) {
          state.hoverIndex = -1;
          state.decorationHoverHit = null;
          syncMainCanvasCursor();
          draw(analyze());
        }
        return;
      }
      if (isDecorationMode()) {
        const debugChanged = clearDrawDebugHit(false);
        const hit = decorationHitFromPoint(event.clientX, event.clientY);
        const hoverIndex = hit && hit.type === 'vertex' ? hit.index : -1;
        const hoverChanged = !sameDecorationHit(hit, state.decorationHoverHit);
        if (hoverIndex !== state.hoverIndex || hoverChanged || debugChanged) {
          state.hoverIndex = hoverIndex;
          state.decorationHoverHit = hit;
          syncMainCanvasCursor();
          draw(analyze());
        }
        return;
      }
      if (state.inputMode === 'draw') {
        if (state.drawAction === 'edge') {
          const debugChanged = updateDrawDebugFromPoint(event.clientX, event.clientY, false);
          if (state.hoverIndex !== -1 || state.decorationHoverHit || debugChanged) {
            state.hoverIndex = -1;
            state.decorationHoverHit = null;
            syncMainCanvasCursor();
            draw(analyze());
          }
        } else {
          const debugChanged = clearDrawDebugHit(false);
          const hit = hitTest(event.clientX, event.clientY);
          if (hit !== state.hoverIndex || state.decorationHoverHit || debugChanged) {
            state.hoverIndex = hit;
            state.decorationHoverHit = null;
            syncMainCanvasCursor();
            draw(analyze());
          }
        }
        return;
      }
      const debugChanged = updateDrawDebugFromPoint(event.clientX, event.clientY, false);
      const hit = hitTest(event.clientX, event.clientY);
      if (hit !== state.hoverIndex || state.decorationHoverHit || debugChanged) {
        state.hoverIndex = hit;
        state.decorationHoverHit = null;
        syncMainCanvasCursor();
        draw(analyze());
      }
    });
  }

  function bindTouchFallback(element, handlers) {
    if (!element || !handlers) return;
    const useFallback = !window.PointerEvent || isCoarsePrimaryPointer();
    if (!useFallback) return;
    const activeTouches = new Map();

    const eventOptions = { passive: false };
    Object.keys(handlers).forEach((type) => {
      const handler = handlers[type];
      if (typeof handler !== 'function') return;
      element.addEventListener(type, (event) => {
        const touches = touchesForFallbackEvent(event, activeTouches);
        if (!touches.length) return;
        event.preventDefault();
        touches.forEach((touch) => {
          if (type === 'touchstart') activeTouches.set(touch.identifier, true);
          const pointerEvent = pointerEventFromTouch(event, touch, type, element);
          handler(pointerEvent);
          if (type === 'touchend' || type === 'touchcancel') activeTouches.delete(touch.identifier);
        });
      }, eventOptions);
    });
  }

  function touchesForFallbackEvent(event, activeTouches) {
    const changed = Array.from(event.changedTouches || []);
    if (event.type === 'touchstart') return changed.slice(0, 1);
    const active = changed.filter((touch) => activeTouches.has(touch.identifier));
    if (active.length) return active.slice(0, 1);
    return changed.slice(0, 1);
  }

  function pointerEventFromTouch(sourceEvent, touch, type, element) {
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0,
      buttons: type === 'touchend' || type === 'touchcancel' ? 0 : 1,
      pointerId: touch.identifier,
      pointerType: 'touch',
      currentTarget: element,
      target: sourceEvent.target,
      preventDefault: () => sourceEvent.preventDefault(),
      stopPropagation: () => sourceEvent.stopPropagation()
    };
  }

  function isCoarsePrimaryPointer() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches;
  }

  function pointerHitRadius(event, mouseRadius, touchRadius) {
    return event && event.pointerType && event.pointerType !== 'mouse'
      ? touchRadius
      : mouseRadius;
  }

  function generateFromControls() {
    const rows = clampInt(refs.gridRows.value, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(refs.gridCols.value, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[refs.latticeSelect.value] ? refs.latticeSelect.value : state.lattice;
    const boundaryMode = refs.boundaryMode
      ? normalizeBoundaryMode(refs.boundaryMode.value)
      : normalizeBoundaryMode(!!(refs.wrapBoard && refs.wrapBoard.checked));
    reshapeBoard(rows, cols, latticeName, boundaryMode);
  }

  function createBoard(rows, cols, latticeName, boundaryInput) {
    const boundaryMode = normalizeBoundaryMode(boundaryInput);
    state.rows = rows;
    state.cols = cols;
    state.lattice = LATTICES[latticeName] ? latticeName : 'hexagonal';
    state.boundaryMode = boundaryMode;
    state.wrapped = boundaryMode === 'wrapped';
    if (boundaryMode === 'glued') state.inputMode = 'background';
    state.removedTiles = new Set();
    state.cutEdges = new Set();
    state.gluedEdges = [];
    clearPendingGlueEdge();
    state.backgroundChainLength = 1;
    state.backgroundChainReversed = false;
    state.backgroundGlueWarning = '';
    state.backgroundOrientability = null;
    state.edits = 0;
    state.hoverIndex = -1;
    state.backgroundHoverEdge = null;
    state.backgroundHoverCusp = null;
    clearBackgroundBilliard(false);
    state.selectedBackgroundCusp = null;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.decorationHoverHit = null;
    syncMainCanvasCursor();
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    clearDecorationClickTimer();
    state.vertexDecorations = {};
    state.halfEdgeDecorations = {};
    state.standardDualGraphInput = null;
    state.tiles = Array(rows * cols).fill(null);
    syncAllInputs(rows, cols, state.lattice, state.boundaryMode);
    renderTilePalette();
    resetWanderForBoardChange('');
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function reshapeBoard(rows, cols, latticeName, boundaryInput) {
    const nextLattice = LATTICES[latticeName] ? latticeName : state.lattice;
    const nextBoundaryMode = normalizeBoundaryMode(boundaryInput);
    const nextWrapped = nextBoundaryMode === 'wrapped';
    const sameShape = rows === state.rows
      && cols === state.cols
      && nextLattice === state.lattice
      && nextBoundaryMode === state.boundaryMode;
    if (sameShape) {
      syncAllInputs(rows, cols, state.lattice, state.boundaryMode);
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
    const oldHalfEdgeDecorations = { ...state.halfEdgeDecorations };
    const oldRemovedTiles = cloneRemovedTileSet();
    const oldCutEdges = cloneCutEdgeSet();
    const oldGluedEdges = cloneGluedEdges();
    const oldBoundaryMode = state.boundaryMode;

    state.rows = rows;
    state.cols = cols;
    state.lattice = nextLattice;
    state.boundaryMode = nextBoundaryMode;
    state.wrapped = nextWrapped;
    syncInputModeForBoundaryChange(oldBoundaryMode, nextBoundaryMode);
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.decorationHoverHit = null;
    state.backgroundHoverEdge = null;
    state.backgroundHoverCusp = null;
    clearBackgroundBilliard(false);
    state.selectedBackgroundCusp = null;
    clearPendingGlueEdge();
    state.backgroundGlueWarning = '';
    state.backgroundOrientability = null;
    syncMainCanvasCursor();
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
    state.halfEdgeDecorations = oldLattice !== nextLattice ? {} : oldHalfEdgeDecorations;
    state.removedTiles = reshapeRemovedTiles(oldRemovedTiles, oldRows, oldCols, rows, cols);
    state.cutEdges = oldLattice !== nextLattice
      ? new Set()
      : reshapeCutEdges(oldCutEdges, oldRows, oldCols, rows, cols);
    state.gluedEdges = oldLattice !== nextLattice
      ? []
      : reshapeGluedEdges(oldGluedEdges, oldRows, oldCols, rows, cols);
    clearPendingGlueEdge();
    pruneCutEdges();
    pruneGluedEdges();
    state.standardDualGraphInput = null;
    syncAllInputs(rows, cols, state.lattice, state.boundaryMode);
    renderTilePalette();
    resetWanderForBoardChange('wander reset: board changed');
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

  function reshapeRemovedTiles(oldRemovedTiles, oldRows, oldCols, rows, cols) {
    const next = new Set();
    const rowLimit = Math.min(oldRows, rows);
    const colLimit = Math.min(oldCols, cols);
    for (let row = 0; row < rowLimit; row += 1) {
      for (let col = 0; col < colLimit; col += 1) {
        const oldIndex = indexOf(row, col, oldCols);
        if (oldRemovedTiles.has(oldIndex)) next.add(indexOf(row, col, cols));
      }
    }
    return next;
  }

  function reshapeCutEdges(oldCutEdges, oldRows, oldCols, rows, cols) {
    const next = new Set();
    oldCutEdges.forEach((key) => {
      const parsed = parseCutEdgeKey(key);
      if (!parsed) return;
      const leftRow = Math.floor(parsed.left / oldCols);
      const leftCol = parsed.left % oldCols;
      const rightRow = Math.floor(parsed.right / oldCols);
      const rightCol = parsed.right % oldCols;
      if (leftRow >= rows || leftCol >= cols || rightRow >= rows || rightCol >= cols) return;
      next.add(cutEdgeKey(indexOf(leftRow, leftCol, cols), indexOf(rightRow, rightCol, cols)));
    });
    return next;
  }

  function reshapeGluedEdges(oldGluedEdges, oldRows, oldCols, rows, cols) {
    if (!Array.isArray(oldGluedEdges) || !oldGluedEdges.length) return [];
    return oldGluedEdges
      .map((pair) => {
        const orientation = normalizeGluePairOrientation(pair);
        return {
          first: reshapeBoundaryEdge(pair.first, oldRows, oldCols, rows, cols),
          second: reshapeBoundaryEdge(pair.second, oldRows, oldCols, rows, cols),
          group: normalizeGlueGroup(pair.group),
          reversed: orientation.reversed,
          firstArrowReversed: orientation.firstArrowReversed,
          secondArrowReversed: orientation.secondArrowReversed
        };
      })
      .filter((pair) => pair.first && pair.second);
  }

  function reshapeBoundaryEdge(edge, oldRows, oldCols, rows, cols) {
    if (!edge) return null;
    const oldIndex = Number(edge.index);
    const dir = Number(edge.dir);
    if (!Number.isInteger(oldIndex) || !Number.isInteger(dir)) return null;
    const row = Math.floor(oldIndex / oldCols);
    const col = oldIndex % oldCols;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return {
      index: indexOf(row, col, cols),
      dir
    };
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

    const standardGraph = standardDualGraphInputFromText(text);
    if (standardGraph.isValid) {
      applyImportedStandardDualGraph(standardGraph.graph);
      refs.statusLine.textContent = 'dual graph generated';
      refs.statusLine.classList.remove('mosaic-status-bad');
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
      const graphPayload = standardDualGraphInputFromPayload(payload);
      if (graphPayload.isValid) {
        applyImportedStandardDualGraph(graphPayload.graph);
        refs.statusLine.textContent = 'dual graph generated';
        refs.statusLine.classList.remove('mosaic-status-bad');
        return;
      }
      applyImportedMosaic(payload);
      refs.statusLine.textContent = 'mosaic generated';
      refs.statusLine.classList.remove('mosaic-status-bad');
    } catch (error) {
      refs.statusLine.textContent = error.message || 'could not generate mosaic';
      refs.statusLine.classList.add('mosaic-status-bad');
    }
  }

  function loadSelectedImportPreset() {
    if (!refs.importInput || !refs.importPresetSelect) return;
    const id = refs.importPresetSelect.value;
    if (isDualGraph()) {
      if (id === 'random-stable-curve') {
        try {
          const preset = applyRandomStableCurvePreset();
          refs.statusLine.textContent = `random stable curve loaded (g=${preset.genus}, n=${preset.markings})`;
          refs.statusLine.classList.remove('mosaic-status-bad');
        } catch (error) {
          refs.statusLine.textContent = error.message || 'could not load preset';
          refs.statusLine.classList.add('mosaic-status-bad');
        }
        return;
      }
      const genus = clampInt(refs.dualGraphPresetGenus ? refs.dualGraphPresetGenus.value : 2, 0, 12, 2);
      const markings = clampInt(refs.dualGraphPresetMarkings ? refs.dualGraphPresetMarkings.value : 5, 0, 6, 5);
      try {
        applyModuliSpaceDualGraphPreset(genus, markings);
        refs.statusLine.textContent = `M_${genus},${markings} preset loaded`;
        refs.statusLine.classList.remove('mosaic-status-bad');
      } catch (error) {
        refs.statusLine.textContent = error.message || 'could not load preset';
        refs.statusLine.classList.add('mosaic-status-bad');
      }
      return;
    }

    const preset = KNOT_PRESETS.find((entry) => entry.id === id) || KNOT_PRESETS[0];
    if (!preset) return;
    const payload = { ...knotPresetPayloadForCurrentLattice(preset), inputMode: 'import' };
    refs.importInput.value = JSON.stringify(payload, null, 2);
    try {
      applyImportedMosaic(payload);
      refs.statusLine.textContent = `${preset.label} preset loaded (${payload.lattice})`;
      refs.statusLine.classList.remove('mosaic-status-bad');
    } catch (error) {
      refs.statusLine.textContent = error.message || 'could not load preset';
      refs.statusLine.classList.add('mosaic-status-bad');
    }
  }

  function loadSelectedBackgroundPreset() {
    if (!refs.backgroundPresetSelect) return;
    const preset = BACKGROUND_SPACE_PRESETS.find((entry) => entry.id === refs.backgroundPresetSelect.value)
      || BACKGROUND_SPACE_PRESETS[0];
    if (!preset) return;

    try {
      const payload = JSON.parse(JSON.stringify(preset.payload || {}));
      if (preset.randomGlue) {
        payload.gluedEdges = createRandomBackgroundGluedEdges(payload.rows || 4, payload.cols || 4);
      }
      payload.boundary = 'glued';
      payload.inputMode = 'background';
      applyImportedMosaic(payload);
      if (refs.backgroundPresetSelect) refs.backgroundPresetSelect.value = preset.id;
      const background = analyzeBackgroundSpace();
      const surfaceText = background && background.surfaceType ? ` (${background.surfaceType})` : '';
      refs.statusLine.textContent = `${preset.label} preset loaded${surfaceText}`;
      refs.statusLine.classList.remove('mosaic-status-good', 'mosaic-status-bad');
    } catch (error) {
      refs.statusLine.textContent = error.message || 'could not load background preset';
      refs.statusLine.classList.add('mosaic-status-bad');
    }
  }

  function exportBackgroundPreset() {
    if (!refs.exportOut) return;
    const payload = buildBackgroundPresetExport();
    refs.exportOut.value = JSON.stringify(payload, null, 2);
    if (refs.exportCard) refs.exportCard.classList.remove('collapsed');
    refs.exportOut.focus();
    refs.exportOut.select();
    if (refs.statusLine) {
      refs.statusLine.textContent = `background preset exported (${payload.preset.rows}x${payload.preset.cols})`;
      refs.statusLine.classList.remove('mosaic-status-bad');
    }
  }

  function buildBackgroundPresetExport() {
    const report = analyze();
    const background = backgroundSpaceForExport(report);
    const selected = BACKGROUND_SPACE_PRESETS.find((entry) => refs.backgroundPresetSelect && entry.id === refs.backgroundPresetSelect.value);
    const surface = background && background.surfaceType
      ? background.surfaceType
      : `${state.lattice} background`;
    const label = `${state.rows}x${state.cols} ${surface}`;
    return {
      schema: 'ramified-minigame-background-preset',
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'mosaic-calculator',
      sourcePresetId: selected && selected.id ? selected.id : '',
      preset: {
        id: 'mosaic-background',
        label,
        lattice: state.lattice,
        rows: state.rows,
        cols: state.cols,
        surface,
        removedTiles: removedTilesForExport(),
        cutEdges: cutEdgesForExport(),
        gluedEdges: gluedEdgesForExport()
      },
      backgroundSpace: background
    };
  }

  function knotPresetPayloadForCurrentLattice(preset) {
    if (!preset) return {};
    if (state.lattice === 'square' && preset.squarePayload) return preset.squarePayload;
    return preset.payload || preset.squarePayload || {};
  }

  function syncBackgroundPresetControls() {
    if (!refs.backgroundPresetSelect) return;
    const previous = refs.backgroundPresetSelect.value;
    refs.backgroundPresetSelect.textContent = '';
    BACKGROUND_SPACE_PRESETS.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      refs.backgroundPresetSelect.appendChild(option);
    });
    const hasPrevious = BACKGROUND_SPACE_PRESETS.some((preset) => preset.id === previous);
    refs.backgroundPresetSelect.value = hasPrevious
      ? previous
      : (BACKGROUND_SPACE_PRESETS[0] ? BACKGROUND_SPACE_PRESETS[0].id : '');
    refs.backgroundPresetSelect.disabled = !BACKGROUND_SPACE_PRESETS.length;
    if (refs.loadBackgroundPreset) refs.loadBackgroundPreset.disabled = !BACKGROUND_SPACE_PRESETS.length;
  }

  function syncImportPresetControls() {
    if (!refs.importPresetSelect) return;
    const previous = refs.importPresetSelect.value;
    refs.importPresetSelect.textContent = '';
    if (isDualGraph()) {
      DUAL_GRAPH_PRESETS.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        refs.importPresetSelect.appendChild(option);
      });
      refs.importPresetSelect.value = DUAL_GRAPH_PRESETS.some((preset) => preset.id === previous)
        ? previous
        : 'random-stable-curve';
    } else {
      KNOT_PRESETS.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        refs.importPresetSelect.appendChild(option);
      });
      if (KNOT_PRESETS.some((preset) => preset.id === previous)) refs.importPresetSelect.value = previous;
    }
    if (refs.dualGraphPresetControls) {
      refs.dualGraphPresetControls.hidden = !isDualGraph() || refs.importPresetSelect.value !== 'moduli';
    }
  }

  function formatModuliSpaceDualGraphPreset(genus, markings) {
    const n = clampInt(markings, 0, 6, 5);
    const legs = Array.from({ length: n }, (_, index) => index + 1);
    return `Graph : [${clampInt(genus, 0, 12, 2)}] [[${legs.join(', ')}]] []`;
  }

  function applyModuliSpaceDualGraphPreset(genus, markings) {
    const g = clampInt(genus, 0, 12, 2);
    const n = clampInt(markings, 0, 6, 5);
    const rows = 5;
    const cols = 5;
    const latticeName = n > 4 ? 'hexagonal' : (LATTICES[state.lattice] ? state.lattice : 'hexagonal');
    const centerIndex = indexOf(2, 2, cols);
    const tiles = Array(rows * cols).fill(null);
    tiles[centerIndex] = plainVertexTileFromDirs(moduliSpaceLegDirs(n, latticeName));
    applyDualGraphTilesPreset({
      rows,
      cols,
      latticeName,
      tiles,
      vertexDecorations: g > 0 ? { [centerIndex]: g } : {},
      importText: formatModuliSpaceDualGraphPreset(g, n)
    });
  }

  function applyRandomStableCurvePreset() {
    const latticeName = LATTICES[state.lattice] ? state.lattice : 'hexagonal';
    const rendered = randomStableCurvePresetData(latticeName);
    applyDualGraphTilesPreset({
      rows: 5,
      cols: 5,
      latticeName,
      tiles: rendered.tiles,
      vertexDecorations: rendered.vertexDecorations
    });
    const graphData = state.dualGraphData && state.dualGraphData.isValid ? state.dualGraphData : null;
    if (graphData && refs.importInput) refs.importInput.value = graphData.standardText;
    const inv = graphData ? dualGraphInvariants(graphData) : null;
    return {
      genus: inv ? inv.genus : rendered.genus,
      markings: inv ? inv.halfEdges : rendered.markings
    };
  }

  function applyDualGraphTilesPreset(options) {
    const rows = clampInt(options && options.rows, MIN_BOARD, MAX_BOARD, 5);
    const cols = clampInt(options && options.cols, MIN_BOARD, MAX_BOARD, 5);
    const latticeName = options && LATTICES[options.latticeName] ? options.latticeName : 'hexagonal';
    const oldRows = state.rows;
    const oldCols = state.cols;
    const oldLattice = state.lattice;
    const oldRemovedTiles = cloneRemovedTileSet();
    const oldCutEdges = cloneCutEdgeSet();
    const oldGluedEdges = cloneGluedEdges();
    const boundaryMode = resolveImportedBoundaryMode(options, state.boundaryMode);
    clearEditorDrag();
    cancelDrawGesture(false);
    clearDecorationClickTimer();
    state.rows = rows;
    state.cols = cols;
    state.lattice = latticeName;
    state.diagramType = 'dual';
    state.boundaryMode = boundaryMode;
    state.wrapped = boundaryMode === 'wrapped';
    state.removedTiles = hasImportedRemovedTiles(options)
      ? importRemovedTiles(options, rows, cols)
      : reshapeRemovedTiles(oldRemovedTiles, oldRows, oldCols, rows, cols);
    state.cutEdges = hasImportedCutEdges(options)
      ? importCutEdges(options, rows, cols)
      : (oldLattice === latticeName ? reshapeCutEdges(oldCutEdges, oldRows, oldCols, rows, cols) : new Set());
    state.gluedEdges = hasImportedGluedEdges(options)
      ? importGluedEdges(options, rows, cols)
      : (oldLattice === latticeName ? reshapeGluedEdges(oldGluedEdges, oldRows, oldCols, rows, cols) : []);
    state.wrappedViewMode = 'periodic';
    state.inputMode = 'import';
    state.backgroundMultiEdges = true;
    state.backgroundChainLength = 1;
    state.backgroundChainReversed = false;
    state.backgroundGlueWarning = '';
    state.backgroundOrientability = null;
    state.editMode = 'rotate';
    state.drawAction = 'edge';
    state.drawLayer = 'above';
    state.drawStyle = 'shade';
    state.knotCodeKind = 'pd';
    state.showErrors = true;
    state.showCoords = false;
    state.colorComponents = true;
    state.displayPick = false;
    state.showCusps = false;
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    state.componentColors = [];
    state.edits = 0;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.decorationHoverHit = null;
    state.backgroundHoverEdge = null;
    clearPendingGlueEdge();
    clearBackgroundBilliard(false);
    syncMainCanvasCursor();
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.standardDualGraphInput = null;
    state.tiles = Array(rows * cols).fill(null);
    (Array.isArray(options && options.tiles) ? options.tiles : []).forEach((tile, index) => {
      if (index >= 0 && index < state.tiles.length) state.tiles[index] = tile == null ? null : cloneTile(tile);
    });
    state.vertexDecorations = { ...(options && options.vertexDecorations ? options.vertexDecorations : {}) };
    state.halfEdgeDecorations = {};
    clearRemovedTileContents();
    pruneCutEdges();
    pruneGluedEdges();
    state.dualGraphLayout = null;
    state.dualGraphStructureKey = '';
    state.dualGraphLayoutTimings = {};
    clearDualGraphDegenerationChart();

    syncAllInputs(rows, cols, state.lattice, state.boundaryMode);
    syncImportPresetControls();
    if (refs.showErrors) refs.showErrors.checked = state.showErrors;
    if (refs.showCoords) refs.showCoords.checked = state.showCoords;
    if (refs.colorComponents) refs.colorComponents.checked = state.colorComponents;
    if (refs.displayPick) refs.displayPick.checked = state.displayPick;
    if (refs.showCusps) refs.showCusps.checked = state.showCusps;
    if (refs.backgroundMultiEdges) refs.backgroundMultiEdges.checked = !!state.backgroundMultiEdges;
    if (refs.importInput && typeof (options && options.importText) === 'string') refs.importInput.value = options.importText;
    renderTilePalette();
    resetView(false);
    resizeCanvas();
    updateReport(false);
  }

  function moduliSpaceLegDirs(markings, latticeName) {
    const n = clampInt(markings, 0, latticeName === 'hexagonal' ? 6 : 4, 0);
    if (latticeName === 'hexagonal') return [0, 1, 2, 3, 4, 5].slice(0, n);
    const squareDirs = [
      [],
      [0],
      [0, 2],
      [0, 1, 3],
      [0, 1, 2, 3]
    ];
    return squareDirs[n].slice();
  }

  function randomStableCurvePresetData(latticeName) {
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const builder = makeRandomStableCurveBuilder(latticeName);
      if (!builder) continue;
      if (!connectRandomStableCurveVertices(builder)) continue;
      addRandomStableCurveLoops(builder);
      addRandomStableCurveExtraEdges(builder);
      const completed = completeRandomStableCurveBuilder(builder);
      if (completed) return completed;
    }
    return fallbackRandomStableCurvePreset(latticeName);
  }

  function makeRandomStableCurveBuilder(latticeName) {
    const rows = 5;
    const cols = 5;
    const lattice = LATTICES[latticeName] || LATTICES.hexagonal;
    const tiles = Array(rows * cols).fill(null);
    const vertexCount = randomInteger(1, 4);
    const positions = randomStableCurvePositions(vertexCount, rows, cols);
    if (positions.length !== vertexCount) return null;
    return {
      rows,
      cols,
      latticeName,
      lattice,
      tiles,
      vertexPositions: positions,
      vertexByIndex: new Map(positions.map((position, index) => [position, index])),
      spokes: Array.from({ length: vertexCount }, () => new Set()),
      edgeCount: 0
    };
  }

  function connectRandomStableCurveVertices(builder) {
    const order = shuffleArray(Array.from({ length: builder.vertexPositions.length }, (_, index) => index));
    for (let index = 1; index < order.length; index += 1) {
      const from = order[index];
      const to = order[randomInteger(0, index - 1)];
      if (!tryAddRandomStableCurveEdge(builder, from, to)) return false;
    }
    return true;
  }

  function addRandomStableCurveExtraEdges(builder) {
    const vertexCount = builder.vertexPositions.length;
    if (vertexCount < 2) return;
    const extraEdges = weightedRandomChoice([
      [0, 0.48],
      [1, 0.32],
      [2, 0.16],
      [3, 0.04]
    ]);
    for (let count = 0; count < extraEdges; count += 1) {
      if (randomStableCurveCycleRank(builder) >= 4) return;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const from = randomInteger(0, vertexCount - 1);
        let to = randomInteger(0, vertexCount - 2);
        if (to >= from) to += 1;
        if (tryAddRandomStableCurveEdge(builder, from, to)) break;
      }
    }
  }

  function addRandomStableCurveLoops(builder) {
    const loops = weightedRandomChoice([
      [0, 0.38],
      [1, 0.44],
      [2, 0.18]
    ]);
    for (let count = 0; count < loops; count += 1) {
      if (randomStableCurveCycleRank(builder) >= 4) return;
      const vertices = shuffleArray(Array.from({ length: builder.vertexPositions.length }, (_, index) => index));
      for (const vertex of vertices) {
        if (tryAddRandomStableCurveLoop(builder, vertex)) break;
      }
    }
  }

  function completeRandomStableCurveBuilder(builder) {
    const cycleRank = randomStableCurveCycleRank(builder);
    if (cycleRank > 4) return null;
    for (let genusAttempt = 0; genusAttempt < 40; genusAttempt += 1) {
      const targetGenus = randomInteger(cycleRank, 4);
      const genera = randomWeakComposition(targetGenus - cycleRank, builder.vertexPositions.length);
      const mandatoryLegs = genera.map((genus, vertex) => (
        Math.max(0, minimumStableValence(genus) - builder.spokes[vertex].size)
      ));
      const capacities = builder.spokes.map((spokes, vertex) => (
        safeRandomStableCurveLegDirs(builder, vertex, spokes).length
      ));
      if (mandatoryLegs.some((count, index) => count > capacities[index])) continue;

      const nextSpokes = builder.spokes.map((spokes) => new Set(spokes));
      mandatoryLegs.forEach((count, vertex) => {
        addRandomStableCurveLegs(builder, nextSpokes[vertex], vertex, count);
      });
      let extraLegs = randomInteger(0, 2);
      if (Math.random() < 0.2) extraLegs += randomInteger(1, 3);
      distributeRandomLegs(extraLegs, nextSpokes.map((spokes, vertex) => (
        safeRandomStableCurveLegDirs(builder, vertex, spokes).length
      ))).forEach((count, vertex) => {
        addRandomStableCurveLegs(builder, nextSpokes[vertex], vertex, count);
      });

      const tiles = builder.tiles.map((tile) => clonePlainTile(tile));
      const vertexDecorations = {};
      builder.vertexPositions.forEach((position, vertex) => {
        tiles[position] = plainVertexTileFromDirs(Array.from(nextSpokes[vertex]));
        if (genera[vertex] > 0) vertexDecorations[position] = genera[vertex];
      });
      const markings = nextSpokes.reduce((total, spokes) => total + spokes.size, 0) - (2 * builder.edgeCount);
      return {
        tiles,
        vertexDecorations,
        genus: targetGenus,
        markings
      };
    }
    return null;
  }

  function fallbackRandomStableCurvePreset(latticeName) {
    const tiles = Array(25).fill(null);
    const centerIndex = indexOf(2, 2, 5);
    tiles[centerIndex] = plainVertexTileFromDirs(moduliSpaceLegDirs(3, latticeName));
    return {
      tiles,
      vertexDecorations: {},
      genus: 0,
      markings: 3
    };
  }

  function randomStableCurvePositions(count, rows, cols) {
    const positions = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        positions.push(indexOf(row, col, cols));
      }
    }
    return shuffleArray(positions).slice(0, count);
  }

  function distributeRandomLegs(total, capacities) {
    const counts = capacities.map(() => 0);
    for (let leg = 0; leg < total; leg += 1) {
      const candidates = capacities
        .map((capacity, index) => ({ capacity, index }))
        .filter((entry) => counts[entry.index] < entry.capacity);
      if (!candidates.length) break;
      counts[candidates[randomInteger(0, candidates.length - 1)].index] += 1;
    }
    return counts;
  }

  function safeRandomStableCurveLegDirs(builder, vertex, usedDirs) {
    const preference = builder.latticeName === 'hexagonal'
      ? [5, 1, 4, 2, 0, 3]
      : [3, 1, 0, 2];
    return shuffleArray(preference.filter((dir) => (
      !usedDirs.has(dir) && randomStableCurveLegDirIsSafe(builder, vertex, dir)
    )));
  }

  function randomStableCurveLegDirIsSafe(builder, vertex, dir) {
    const vertexIndex = builder.vertexPositions[vertex];
    const next = randomStableCurveNeighborIndex(builder, vertexIndex, dir);
    if (next == null) return true;
    if (builder.vertexByIndex.has(next)) return false;
    return !randomStableCurveTilePortUsed(builder.tiles[next], builder.lattice.opposite[dir]);
  }

  function addRandomStableCurveLegs(builder, usedDirs, vertex, count) {
    safeRandomStableCurveLegDirs(builder, vertex, usedDirs).slice(0, count).forEach((dir) => usedDirs.add(dir));
  }

  function minimumStableValence(genus) {
    if (genus <= 0) return 3;
    if (genus === 1) return 1;
    return 0;
  }

  function randomWeakComposition(total, count) {
    const parts = Array(count).fill(0);
    for (let remaining = total; remaining > 0; remaining -= 1) {
      parts[randomInteger(0, count - 1)] += 1;
    }
    return parts;
  }

  function tryAddRandomStableCurveEdge(builder, from, to) {
    const path = findRandomStableCurvePath(builder, from, to);
    if (!path) return false;
    placeRandomStableCurvePath(builder, path);
    return true;
  }

  function tryAddRandomStableCurveLoop(builder, vertex) {
    const path = findRandomStableCurveLoop(builder, vertex);
    if (!path) return false;
    placeRandomStableCurvePath(builder, path);
    return true;
  }

  function findRandomStableCurvePath(builder, from, to) {
    const sourceIndex = builder.vertexPositions[from];
    const targetIndex = builder.vertexPositions[to];
    const queue = [{ index: sourceIndex, entryDir: null, cells: [sourceIndex], dirs: [] }];
    const visited = new Set([`${sourceIndex}:start`]);
    while (queue.length) {
      const current = queue.shift();
      for (const dir of shuffleArray(Array.from({ length: builder.lattice.sides }, (_, index) => index))) {
        if (!canLeaveRandomStableCurveCell(builder, current, dir, from)) continue;
        const next = randomStableCurveNeighborIndex(builder, current.index, dir);
        if (next == null) continue;
        const nextEntry = builder.lattice.opposite[dir];
        const nextVertex = builder.vertexByIndex.get(next);
        if (nextVertex != null) {
          if (nextVertex !== to || builder.spokes[to].has(nextEntry)) continue;
          return {
            from,
            to,
            cells: current.cells.concat(next),
            dirs: current.dirs.concat(dir)
          };
        }
        if (!canEnterRandomStableCurveCell(builder, next, nextEntry)) continue;
        const key = `${next}:${nextEntry}`;
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({
          index: next,
          entryDir: nextEntry,
          cells: current.cells.concat(next),
          dirs: current.dirs.concat(dir)
        });
      }
    }
    return null;
  }

  function findRandomStableCurveLoop(builder, vertex) {
    const sourceIndex = builder.vertexPositions[vertex];
    const startDirs = shuffleArray(Array.from({ length: builder.lattice.sides }, (_, index) => index))
      .filter((dir) => !builder.spokes[vertex].has(dir));
    for (const startDir of startDirs) {
      const startIndex = randomStableCurveNeighborIndex(builder, sourceIndex, startDir);
      if (startIndex == null || builder.vertexByIndex.has(startIndex)) continue;
      const entryDir = builder.lattice.opposite[startDir];
      if (!canEnterRandomStableCurveCell(builder, startIndex, entryDir)) continue;
      const queue = [{
        index: startIndex,
        entryDir,
        cells: [sourceIndex, startIndex],
        dirs: [startDir]
      }];
      const visited = new Set([`${startIndex}:${entryDir}`]);
      while (queue.length) {
        const current = queue.shift();
        for (const dir of shuffleArray(Array.from({ length: builder.lattice.sides }, (_, index) => index))) {
          if (!canLeaveRandomStableCurveCell(builder, current, dir, vertex)) continue;
          const next = randomStableCurveNeighborIndex(builder, current.index, dir);
          if (next == null) continue;
          const nextEntry = builder.lattice.opposite[dir];
          const nextVertex = builder.vertexByIndex.get(next);
          if (nextVertex != null) {
            if (nextVertex !== vertex) continue;
            if (nextEntry === startDir || builder.spokes[vertex].has(nextEntry)) continue;
            return {
              from: vertex,
              to: vertex,
              cells: current.cells.concat(next),
              dirs: current.dirs.concat(dir)
            };
          }
          if (!canEnterRandomStableCurveCell(builder, next, nextEntry)) continue;
          const key = `${next}:${nextEntry}`;
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({
            index: next,
            entryDir: nextEntry,
            cells: current.cells.concat(next),
            dirs: current.dirs.concat(dir)
          });
        }
      }
    }
    return null;
  }

  function canLeaveRandomStableCurveCell(builder, current, dir, sourceVertex) {
    const vertex = builder.vertexByIndex.get(current.index);
    if (vertex != null) return vertex === sourceVertex && !builder.spokes[vertex].has(dir);
    return current.entryDir !== dir && canAddRandomStableCurveArc(builder.tiles[current.index], current.entryDir, dir);
  }

  function canEnterRandomStableCurveCell(builder, index, entryDir) {
    return !randomStableCurveTilePortUsed(builder.tiles[index], entryDir);
  }

  function canAddRandomStableCurveArc(tile, first, second) {
    return Number.isInteger(first)
      && Number.isInteger(second)
      && first !== second
      && !randomStableCurveTilePortUsed(tile, first)
      && !randomStableCurveTilePortUsed(tile, second);
  }

  function randomStableCurveTilePortUsed(tile, dir) {
    return Array.isArray(tile) && tile.some((pair) => pair[0] === dir || pair[1] === dir);
  }

  function randomStableCurveNeighborIndex(builder, index, dir) {
    const row = Math.floor(index / builder.cols);
    const col = index % builder.cols;
    const next = neighbor(row, col, dir, builder.rows, builder.cols, builder.lattice, false);
    return next ? indexOf(next.row, next.col, builder.cols) : null;
  }

  function placeRandomStableCurvePath(builder, path) {
    builder.spokes[path.from].add(path.dirs[0]);
    builder.spokes[path.to].add(builder.lattice.opposite[path.dirs[path.dirs.length - 1]]);
    for (let index = 1; index < path.cells.length - 1; index += 1) {
      addRandomStableCurveArc(
        builder.tiles,
        path.cells[index],
        builder.lattice.opposite[path.dirs[index - 1]],
        path.dirs[index]
      );
    }
    builder.edgeCount += 1;
  }

  function addRandomStableCurveArc(tiles, index, first, second) {
    if (!Array.isArray(tiles[index])) tiles[index] = [];
    tiles[index].push([first, second]);
  }

  function randomStableCurveCycleRank(builder) {
    return Math.max(0, builder.edgeCount - builder.vertexPositions.length + 1);
  }

  function clonePlainTile(tile) {
    return Array.isArray(tile) ? tile.map((pair) => pair.slice(0, 2)) : null;
  }

  function weightedRandomChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let target = Math.random() * total;
    for (const [value, weight] of entries) {
      target -= weight;
      if (target <= 0) return value;
    }
    return entries[entries.length - 1][0];
  }

  function randomInteger(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (high <= low) return low;
    return low + Math.floor(Math.random() * ((high - low) + 1));
  }

  function plainVertexTileFromDirs(dirs) {
    return {
      type: 'vertex',
      edges: Array.isArray(dirs) ? dirs.slice() : []
    };
  }

  function applyImportedStandardDualGraph(graph) {
    const normalized = normalizeStandardDualGraphInput(graph);
    if (!normalized.isValid) throw new Error(normalized.reason || 'dual graph import failed');
    state.diagramType = 'dual';
    state.wrapped = state.boundaryMode === 'wrapped';
    state.inputMode = 'import';
    state.standardDualGraphInput = {
      genera: normalized.genera.slice(),
      legs: normalized.legs.map((entries) => entries.slice()),
      edges: normalized.edges.map((pair) => pair.slice(0, 2)),
      decorations: { ...normalized.decorations }
    };
    state.tiles = Array(state.rows * state.cols).fill(null);
    state.vertexDecorations = {};
    state.halfEdgeDecorations = {};
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.decorationHoverHit = null;
    state.backgroundHoverEdge = null;
    state.dualGraphLayout = null;
    state.dualGraphStructureKey = '';
    state.dualGraphLayoutTimings = {};
    clearDualGraphDegenerationChart();
    syncAllInputs(state.rows, state.cols, state.lattice, state.boundaryMode);
    renderTilePalette();
    updateReport(false);
  }

  function standardDualGraphInputFromPayload(payload) {
    if (typeof payload === 'string') return standardDualGraphInputFromText(payload);
    if (!payload || typeof payload !== 'object') return { isValid: false };
    if (typeof payload.graph === 'string') {
      const parsed = standardDualGraphInputFromText(payload.graph);
      if (!parsed.isValid) return parsed;
      return {
        isValid: true,
        graph: {
          ...parsed.graph,
          decorations: payload.decorations || payload.labels || {}
        }
      };
    }
    const normalized = normalizeStandardDualGraphInput(payload.graph ? payload : { graph: payload });
    return normalized.isValid
      ? { isValid: true, graph: payload.graph ? payload : { graph: payload } }
      : { isValid: false, reason: normalized.reason };
  }

  function standardDualGraphInputFromText(text) {
    const source = String(text || '').trim();
    if (!/^Graph\s*:/i.test(source)) return { isValid: false };
    const body = source.replace(/^Graph\s*:\s*/i, '');
    const first = readBracketGroup(body, 0);
    if (!first) return { isValid: false, reason: 'could not read genus list' };
    const second = readBracketGroup(body, first.end);
    if (!second) return { isValid: false, reason: 'could not read leg list' };
    const third = readBracketGroup(body, second.end);
    if (!third) return { isValid: false, reason: 'could not read edge list' };
    try {
      return {
        isValid: true,
        graph: {
          genera: JSON.parse(first.text),
          legs: JSON.parse(second.text),
          edges: parseStandardDualGraphEdgePairs(third.text)
        }
      };
    } catch (error) {
      return { isValid: false, reason: error.message || 'could not parse dual graph' };
    }
  }

  function readBracketGroup(text, startIndex) {
    const start = String(text).indexOf('[', startIndex);
    if (start < 0) return null;
    let depth = 0;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (char === '[') depth += 1;
      if (char === ']') {
        depth -= 1;
        if (depth === 0) {
          return {
            text: text.slice(start, index + 1),
            end: index + 1
          };
        }
      }
    }
    return null;
  }

  function parseStandardDualGraphEdgePairs(text) {
    const trimmed = String(text || '').trim();
    if (trimmed === '[]') return [];
    const pairs = [];
    const pattern = /\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
    let match;
    while ((match = pattern.exec(trimmed))) {
      pairs.push([Number(match[1]), Number(match[2])]);
    }
    if (!pairs.length) return JSON.parse(trimmed);
    return pairs;
  }

  function applyImportedMosaic(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('mosaic data must be an object');
    state.standardDualGraphInput = null;
    const oldRows = state.rows;
    const oldCols = state.cols;
    const oldLattice = state.lattice;
    const oldRemovedTiles = cloneRemovedTileSet();
    const oldCutEdges = cloneCutEdgeSet();
    const oldGluedEdges = cloneGluedEdges();
    const rows = clampInt(payload.rows, MIN_BOARD, MAX_BOARD, state.rows);
    const cols = clampInt(payload.cols, MIN_BOARD, MAX_BOARD, state.cols);
    const latticeName = LATTICES[payload.lattice] ? payload.lattice : state.lattice;
    const diagramType = normalizeDiagramType(payload.diagramType || payload.type);
    const boundaryMode = resolveImportedBoundaryMode(payload, state.boundaryMode);
    const wrapped = boundaryMode === 'wrapped';

    state.rows = rows;
    state.cols = cols;
    state.lattice = latticeName;
    state.diagramType = diagramType;
    state.boundaryMode = boundaryMode;
    state.wrapped = wrapped;
    state.wrappedViewMode = payload.wrappedViewMode === 'single' ? 'single' : 'periodic';
    state.inputMode = normalizeInputMode(payload.inputMode);
    state.backgroundAction = normalizeBackgroundAction(payload.backgroundAction || (payload.backgroundSpace && payload.backgroundSpace.action));
    state.backgroundMultiEdges = payload.backgroundMultiEdges !== false
      && !(payload.backgroundSpace && payload.backgroundSpace.multiEdges === false);
    state.backgroundChainLength = normalizeBackgroundChainLength(
      payload.backgroundChainLength != null
        ? payload.backgroundChainLength
        : (payload.backgroundSpace && payload.backgroundSpace.chainLength)
    );
    state.backgroundChainReversed = !!(
      payload.backgroundChainReversed
      || (payload.backgroundSpace && payload.backgroundSpace.chainReversed)
    );
    state.backgroundCuspMarkerScale = normalizeBackgroundCuspMarkerScale(
      payload.backgroundCuspMarkerScale != null
        ? payload.backgroundCuspMarkerScale
        : (payload.backgroundSpace && payload.backgroundSpace.cuspMarkerScale)
    );
    state.backgroundBilliardSpeed = normalizeBackgroundBilliardSpeed(
      payload.backgroundBilliardSpeed != null
        ? payload.backgroundBilliardSpeed
        : (payload.backgroundSpace && payload.backgroundSpace.billiardSpeed)
    );
    state.backgroundBilliardTrailLength = normalizeBackgroundBilliardTrailLength(
      payload.backgroundBilliardTrailLength != null
        ? payload.backgroundBilliardTrailLength
        : (payload.backgroundSpace && payload.backgroundSpace.billiardTrailLength)
    );
    state.backgroundBilliardArrowLength = normalizeBackgroundBilliardArrowLength(
      payload.backgroundBilliardArrowLength != null
        ? payload.backgroundBilliardArrowLength
        : (payload.backgroundSpace && payload.backgroundSpace.billiardArrowLength)
    );
    state.backgroundBilliardHitMarkers = normalizeBackgroundBilliardHitMarkers(
      payload.backgroundBilliardHitMarkers
      || (payload.backgroundSpace && payload.backgroundSpace.billiardHitMarkers)
    );
    state.editMode = normalizeEditMode(payload.clickMode || payload.editMode);
    state.drawAction = normalizeDrawAction(payload.drawAction || (payload.display && payload.display.drawAction));
    if (state.diagramType === 'dual' && (payload.drawAddVertices || (payload.display && payload.display.drawAddVertices))) {
      state.drawAction = 'vertex';
    }
    state.knotCodeKind = normalizeKnotCodeKind(payload.knotCodeKind || (payload.display && payload.display.knotCodeKind));
    state.drawLayer = normalizeDrawLayer(payload.drawLayer);
    const display = payload.display && typeof payload.display === 'object' ? payload.display : {};
    const hasDisplayValue = (key) => Object.prototype.hasOwnProperty.call(display, key);
    state.showErrors = !(payload.display && payload.display.showOpenEnds === false);
    state.showCoords = !!(payload.display && payload.display.showCoords);
    state.colorComponents = !(payload.display && payload.display.colorComponents === false);
    state.displayPick = !!(payload.display && payload.display.pick);
    state.showCusps = !!(payload.display && payload.display.cusps);
    state.showSeifertSurface = hasDisplayValue('showSeifertSurface')
      ? !!display.showSeifertSurface
      : !!state.showSeifertSurface;
    state.showSeifertBackground = hasDisplayValue('showSeifertBackground')
      ? !!display.showSeifertBackground
      : !!state.showSeifertBackground;
    state.colorSeifertBoundaries = hasDisplayValue('colorSeifertBoundaries')
      ? !!display.colorSeifertBoundaries
      : !!state.colorSeifertBoundaries;
    state.seifertBandWidth = normalizeSeifertBandWidth(
      hasDisplayValue('seifertBandWidth') ? display.seifertBandWidth : state.seifertBandWidth
    );
    state.seifertSurfaceColor = normalizeSeifertSurfaceColor(
      hasDisplayValue('seifertSurfaceColor') ? display.seifertSurfaceColor : state.seifertSurfaceColor,
      state.seifertSurfaceColor
    );
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    state.componentColors = [];
    state.drawStyle = normalizeDrawStyle(
      payload.drawStyle
      || (payload.display && payload.display.drawStyle)
      || (payload.display && payload.display.drawDebug ? 'debug' : 'shade')
    );
    state.edits = Number.isFinite(Number(payload.edits)) ? Math.max(0, Math.trunc(Number(payload.edits))) : 0;
    state.backgroundOrientability = null;
    state.halfEdgeLabelStyle = normalizeHalfEdgeLabelStyle(payload.halfEdgeLabelStyle || (payload.display && payload.display.halfEdgeLabelStyle));
    state.clearVertexDecorations = payload.clearVertexDecorations !== false;
    state.clearHalfEdgeDecorations = payload.clearHalfEdgeDecorations !== false;
    state.hoverIndex = -1;
    state.drawDebugHit = null;
    state.pickHoverHit = null;
    state.decorationHoverHit = null;
    state.backgroundHoverEdge = null;
    clearPendingGlueEdge();
    clearBackgroundBilliard(false);
    syncMainCanvasCursor();
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.selectedTile = null;
    state.selectedPaletteId = '';
    state.tiles = importTiles(payload.tiles, rows, cols);
    state.removedTiles = hasImportedRemovedTiles(payload)
      ? importRemovedTiles(payload, rows, cols)
      : reshapeRemovedTiles(oldRemovedTiles, oldRows, oldCols, rows, cols);
    state.cutEdges = hasImportedCutEdges(payload)
      ? importCutEdges(payload, rows, cols)
      : (oldLattice === latticeName ? reshapeCutEdges(oldCutEdges, oldRows, oldCols, rows, cols) : new Set());
    state.gluedEdges = hasImportedGluedEdges(payload)
      ? importGluedEdges(payload, rows, cols)
      : (oldLattice === latticeName ? reshapeGluedEdges(oldGluedEdges, oldRows, oldCols, rows, cols) : []);
    state.vertexDecorations = importVertexDecorations(payload, rows, cols);
    state.halfEdgeDecorations = importHalfEdgeDecorations(payload);
    clearRemovedTileContents();
    pruneCutEdges();
    pruneGluedEdges();

    syncAllInputs(rows, cols, state.lattice, state.boundaryMode);
    refs.showErrors.checked = state.showErrors;
    refs.showCoords.checked = state.showCoords;
    refs.colorComponents.checked = state.colorComponents;
    refs.displayPick.checked = state.displayPick;
    if (refs.showCusps) refs.showCusps.checked = state.showCusps;
    syncSeifertSurfaceControls();
    refs.drawAction.value = state.drawAction;
    refs.knotCodeKind.value = state.knotCodeKind;
    refs.drawStyle.value = state.drawStyle;
    if (refs.backgroundAction) refs.backgroundAction.value = state.backgroundAction;
    if (refs.backgroundMultiEdges) refs.backgroundMultiEdges.checked = !!state.backgroundMultiEdges;
    syncBackgroundBilliardControls();
    if (refs.halfEdgeLabelStyle) refs.halfEdgeLabelStyle.value = state.halfEdgeLabelStyle;
    if (refs.clearVertexDecorations) refs.clearVertexDecorations.checked = !!state.clearVertexDecorations;
    if (refs.clearHalfEdgeDecorations) refs.clearHalfEdgeDecorations.checked = !!state.clearHalfEdgeDecorations;
    renderTilePalette();
    resizeCanvas();
    importBackgroundBilliardState(payload);
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

  function importRemovedTiles(payload, rows, cols) {
    const removed = new Set();
    if (!payload || typeof payload !== 'object') return removed;
    const sources = [];
    if (Array.isArray(payload.removedTiles)) sources.push(...payload.removedTiles);
    if (Array.isArray(payload.backgroundRemovedTiles)) sources.push(...payload.backgroundRemovedTiles);

    sources.forEach((entry) => {
      let index = -1;
      if (Number.isInteger(Number(entry))) {
        index = Number(entry);
      } else if (entry && typeof entry === 'object') {
        const row = Number(entry.row);
        const col = Number(entry.col);
        if (Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= rows && col >= 1 && col <= cols) {
          index = indexOf(row - 1, col - 1, cols);
        } else if (Number.isInteger(Number(entry.index))) {
          index = Number(entry.index);
        }
      }
      if (Number.isInteger(index) && index >= 0 && index < rows * cols) removed.add(index);
    });
    return removed;
  }

  function importCutEdges(payload, rows, cols) {
    const cuts = new Set();
    if (!payload || typeof payload !== 'object') return cuts;
    const entries = [];
    if (Array.isArray(payload.cutEdges)) entries.push(...payload.cutEdges);
    if (Array.isArray(payload.backgroundCutEdges)) entries.push(...payload.backgroundCutEdges);
    if (payload.backgroundSpace && typeof payload.backgroundSpace === 'object') {
      if (Array.isArray(payload.backgroundSpace.cutEdges)) entries.push(...payload.backgroundSpace.cutEdges);
      if (Array.isArray(payload.backgroundSpace.boundaries)) entries.push(...payload.backgroundSpace.boundaries);
    }

    entries.forEach((entry) => {
      const endpoints = importedCutEdgeEndpoints(entry, rows, cols);
      if (!endpoints) return;
      const key = cutEdgeKey(endpoints.left, endpoints.right);
      if (isValidCutEdgeKey(key, rows, cols)) cuts.add(key);
    });
    return cuts;
  }

  function importGluedEdges(payload, rows, cols) {
    const glued = [];
    if (!payload || typeof payload !== 'object') return glued;
    const entries = [];
    if (Array.isArray(payload.gluedEdges)) entries.push(...payload.gluedEdges);
    if (Array.isArray(payload.backgroundGluedEdges)) entries.push(...payload.backgroundGluedEdges);
    if (payload.backgroundSpace && typeof payload.backgroundSpace === 'object') {
      if (Array.isArray(payload.backgroundSpace.gluedEdges)) entries.push(...payload.backgroundSpace.gluedEdges);
      if (Array.isArray(payload.backgroundSpace.gluedBoundaries)) entries.push(...payload.backgroundSpace.gluedBoundaries);
    }

    const seen = new Set();
    entries.forEach((entry) => {
      const pair = importedGluedBoundaryPair(entry, rows, cols);
      if (!pair) return;
      const key = gluedPairKey(pair);
      if (!key || seen.has(key)) return;
      seen.add(key);
      glued.push(pair);
    });
    return glued;
  }

  function importedGluedBoundaryPair(entry, rows, cols) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const first = importedBoundaryEdge(entry[0], rows, cols);
      const second = importedBoundaryEdge(entry[1], rows, cols);
      return first && second
        ? { first, second, group: null, reversed: false, firstArrowReversed: false, secondArrowReversed: true }
        : null;
    }
    if (!entry || typeof entry !== 'object') return null;
    const firstValue = firstPresentValue(entry, ['first', 'left', 'a', 'from']);
    const secondValue = firstPresentValue(entry, ['second', 'right', 'b', 'to']);
    const first = importedBoundaryEdge(firstValue, rows, cols);
    const second = importedBoundaryEdge(secondValue, rows, cols);
    if (!first || !second) return null;
    const orientation = normalizeGluePairOrientation(entry);
    return {
      first,
      second,
      group: normalizeGlueGroup(entry.group),
      reversed: orientation.reversed,
      firstArrowReversed: orientation.firstArrowReversed,
      secondArrowReversed: orientation.secondArrowReversed
    };
  }

  function importedBoundaryEdge(value, rows, cols) {
    if (!value || typeof value !== 'object') return null;
    const index = importedEndpointIndex(value, rows, cols);
    if (index < 0) return null;
    const dirValue = value.dir != null ? value.dir : value.edge;
    if (dirValue == null) return null;
    const dir = strictImportedDir(dirValue);
    if (dir == null) return null;
    const edge = { index, dir };
    return isValidBoundaryEdge(edge, rows, cols) ? edge : null;
  }

  function strictImportedDir(value) {
    const lattice = getLattice();
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      const named = lattice.dirNames.findIndex((name) => name.toUpperCase() === normalized);
      if (named >= 0) return named;
      if (!/^-?\d+$/.test(normalized)) return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return modulo(Math.trunc(parsed), lattice.sides);
  }

  function importedCutEdgeEndpoints(entry, rows, cols) {
    if (Array.isArray(entry) && entry.length >= 2) {
      const left = importedEndpointIndex(entry[0], rows, cols);
      const right = importedEndpointIndex(entry[1], rows, cols);
      return left >= 0 && right >= 0 ? { left, right } : null;
    }
    if (!entry || typeof entry !== 'object') return null;
    const leftValue = firstPresentValue(entry, ['left', 'a', 'from', 'first']);
    const rightValue = firstPresentValue(entry, ['right', 'b', 'to', 'second']);
    const left = importedEndpointIndex(leftValue, rows, cols);
    const right = importedEndpointIndex(rightValue, rows, cols);
    if (left >= 0 && right >= 0) return { left, right };
    if (Number.isInteger(Number(entry.leftIndex)) && Number.isInteger(Number(entry.rightIndex))) {
      return {
        left: Number(entry.leftIndex),
        right: Number(entry.rightIndex)
      };
    }
    if (Number.isInteger(Number(entry.index)) && entry.dir != null) {
      const index = Number(entry.index);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const next = neighbor(row, col, normalizeDir(entry.dir, getLattice().sides), rows, cols, getLattice(), false);
      return next ? { left: index, right: indexOf(next.row, next.col, cols) } : null;
    }
    return null;
  }

  function firstPresentValue(source, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    }
    return undefined;
  }

  function importedEndpointIndex(value, rows, cols) {
    if (Number.isInteger(Number(value))) {
      const index = Number(value);
      return index >= 0 && index < rows * cols ? index : -1;
    }
    if (value && typeof value === 'object') {
      const row = Number(value.row);
      const col = Number(value.col);
      if (Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= rows && col >= 1 && col <= cols) {
        return indexOf(row - 1, col - 1, cols);
      }
      if (Number.isInteger(Number(value.index))) {
        const index = Number(value.index);
        return index >= 0 && index < rows * cols ? index : -1;
      }
    }
    return -1;
  }

  function hasImportedRemovedTiles(payload) {
    return !!(payload && typeof payload === 'object' && (
      Array.isArray(payload.removedTiles) || Array.isArray(payload.backgroundRemovedTiles)
    ));
  }

  function hasImportedCutEdges(payload) {
    return !!(payload && typeof payload === 'object' && (
      Array.isArray(payload.cutEdges)
      || Array.isArray(payload.backgroundCutEdges)
      || (payload.backgroundSpace && typeof payload.backgroundSpace === 'object' && (
        Array.isArray(payload.backgroundSpace.cutEdges)
        || Array.isArray(payload.backgroundSpace.boundaries)
      ))
    ));
  }

  function hasImportedGluedEdges(payload) {
    return !!(payload && typeof payload === 'object' && (
      Array.isArray(payload.gluedEdges)
      || Array.isArray(payload.backgroundGluedEdges)
      || (payload.backgroundSpace && typeof payload.backgroundSpace === 'object' && (
        Array.isArray(payload.backgroundSpace.gluedEdges)
        || Array.isArray(payload.backgroundSpace.gluedBoundaries)
      ))
    ));
  }

  function hasImportedCutEdgeEntries(payload) {
    return !!(payload && typeof payload === 'object' && (
      (Array.isArray(payload.cutEdges) && payload.cutEdges.length > 0)
      || (Array.isArray(payload.backgroundCutEdges) && payload.backgroundCutEdges.length > 0)
      || (payload.backgroundSpace && typeof payload.backgroundSpace === 'object' && (
        (Array.isArray(payload.backgroundSpace.cutEdges) && payload.backgroundSpace.cutEdges.length > 0)
        || (Array.isArray(payload.backgroundSpace.boundaries) && payload.backgroundSpace.boundaries.length > 0)
      ))
    ));
  }

  function hasImportedGluedEdgeEntries(payload) {
    return !!(payload && typeof payload === 'object' && (
      (Array.isArray(payload.gluedEdges) && payload.gluedEdges.length > 0)
      || (Array.isArray(payload.backgroundGluedEdges) && payload.backgroundGluedEdges.length > 0)
      || (payload.backgroundSpace && typeof payload.backgroundSpace === 'object' && (
        (Array.isArray(payload.backgroundSpace.gluedEdges) && payload.backgroundSpace.gluedEdges.length > 0)
        || (Array.isArray(payload.backgroundSpace.gluedBoundaries) && payload.backgroundSpace.gluedBoundaries.length > 0)
      ))
    ));
  }

  function hasImportedRemovedTileEntries(payload) {
    return !!(payload && typeof payload === 'object' && (
      (Array.isArray(payload.removedTiles) && payload.removedTiles.length > 0)
      || (Array.isArray(payload.backgroundRemovedTiles) && payload.backgroundRemovedTiles.length > 0)
    ));
  }

  function importedBoundaryModeValue(value) {
    if (value === true || value === 'true' || value === 'wrapped') return 'wrapped';
    if (value === 'glued' || value === 'glue' || value === 'background') return 'glued';
    if (value === 'grid') return 'grid';
    return '';
  }

  function resolveImportedBoundaryMode(payload, fallbackMode) {
    const fallback = normalizeBoundaryMode(fallbackMode);
    if (!payload || typeof payload !== 'object') return fallback;
    const boundary = importedBoundaryModeValue(payload.boundary);
    const boundaryMode = importedBoundaryModeValue(payload.boundaryMode);
    if (boundary === 'wrapped' || boundary === 'glued') return boundary;
    if (boundaryMode === 'wrapped' || boundaryMode === 'glued') return boundaryMode;
    if (payload.wrapped === true) return 'wrapped';
    if (hasImportedRemovedTileEntries(payload) || hasImportedCutEdgeEntries(payload) || hasImportedGluedEdgeEntries(payload)) return 'glued';
    return fallback;
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

  function importHalfEdgeDecorations(payload) {
    const decorations = {};
    const addDecoration = (key, value) => {
      const normalizedKey = String(key || '').trim();
      const normalizedValue = normalizeHalfEdgeDecoration(value);
      if (normalizedKey && normalizedValue) decorations[normalizedKey] = normalizedValue;
    };

    if (payload.halfEdgeDecorations && typeof payload.halfEdgeDecorations === 'object') {
      Object.entries(payload.halfEdgeDecorations).forEach(([key, value]) => addDecoration(key, value));
    }

    const graph = payload.dualGraph;
    if (graph && Array.isArray(graph.legs)) {
      graph.legs.forEach((leg) => {
        if (!leg || leg.label == null) return;
        const vertex = Number(leg.vertex);
        const spoke = leg.spoke && typeof leg.spoke === 'object' ? Number(leg.spoke.dir) : Number(leg.spoke);
        if (Number.isInteger(vertex) && Number.isInteger(spoke)) addDecoration(`${vertex}:${spoke}`, leg.label);
      });
    }

    if (graph && Array.isArray(graph.halfEdges)) {
      graph.halfEdges.forEach((halfEdge) => {
        if (!halfEdge || halfEdge.label == null) return;
        const key = halfEdge.key || (
          Number.isInteger(Number(halfEdge.vertex)) && Number.isInteger(Number(halfEdge.spoke))
            ? `${Number(halfEdge.vertex)}:${Number(halfEdge.spoke)}`
            : ''
        );
        addDecoration(key, halfEdge.label);
      });
    }

    return decorations;
  }

  function importBackgroundBilliardState(payload) {
    const source = payload && typeof payload === 'object'
      ? (payload.backgroundBilliard || (payload.backgroundSpace && payload.backgroundSpace.billiard))
      : null;
    if (!source || typeof source !== 'object' || !geometry || !Array.isArray(geometry.cells)) return;
    const index = importedEndpointIndex(source.tile || source, state.rows, state.cols);
    if (index < 0 || !tileExists(index)) return;
    const cell = geometry.cells[index];
    if (!cell || !Number.isFinite(geometry.radius) || geometry.radius <= 0) return;
    const local = source.local || source.offset || source.position || {};
    const localX = Number(local.x);
    const localY = Number(local.y);
    if (!Number.isFinite(localX) || !Number.isFinite(localY)) return;
    const position = {
      x: cell.x + (localX * geometry.radius),
      y: cell.y + (localY * geometry.radius)
    };
    const hit = tileHitAtBoardPoint(position, 1);
    if (!hit || hit.index !== index) return;
    const direction = importBackgroundBilliardDirection(source);
    state.backgroundBilliard = {
      ...resetBackgroundBilliardState(),
      tileIndex: index,
      position,
      direction,
      aimPoint: direction ? {
        x: position.x + direction.x * normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength),
        y: position.y + direction.y * normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength)
      } : null,
      trailPoints: [{ x: position.x, y: position.y, colorMode: 'blue' }],
      trailColorMode: 'blue'
    };
    syncBackgroundBilliardControls();
  }

  function importBackgroundBilliardDirection(source) {
    if (!source || typeof source !== 'object') return null;
    if (source.direction && typeof source.direction === 'object') {
      const dx = Number(source.direction.x);
      const dy = Number(source.direction.y);
      if (Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) >= 0.001) {
        return normalizeVector(dx, dy, 1, 0);
      }
    }
    const angle = source.angleRadians != null ? Number(source.angleRadians) : (
      source.angleDegrees != null ? Number(source.angleDegrees) * Math.PI / 180 : Number(source.angle)
    );
    if (!Number.isFinite(angle)) return null;
    return normalizeVector(Math.cos(angle), Math.sin(angle), 1, 0);
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
    state.removedTiles = new Set();
    state.cutEdges = new Set();
    state.gluedEdges = [];
    clearPendingGlueEdge();
    state.vertexDecorations = {};
    state.halfEdgeDecorations = {};
    state.standardDualGraphInput = null;
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.backgroundHoverEdge = null;
    state.displayPick = false;
    state.showCusps = false;
    state.displayPickInputLocked = false;
    state.displayPickReturnMode = 'draw';
    state.backgroundOrientability = null;
    clearBackgroundBilliard(false);
    if (refs.displayPick) refs.displayPick.checked = false;
    if (refs.showCusps) refs.showCusps.checked = false;
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
    return hit >= 0 && tileExists(hit) && isVertexTileValue(state.tiles[hit]) ? hit : -1;
  }

  function halfEdgeDecorationHitTest(clientX, clientY) {
    if (!isDecorationMode()) return null;
    const graphData = collectDualGraphData(analyze(), { requireSingleComponent: false });
    if (!graphData.isValid) return null;
    const point = clientPointToBoardPoint(clientX, clientY);
    const hitPadding = Math.max(7, geometry.radius * 0.18);
    let best = null;

    graphData.legs.forEach((leg, legIndex) => {
      const hit = halfEdgeDecorationHitGeometry(leg, point);
      if (!hit) return;
      const distance = hit.distance;
      if (distance > hitPadding) return;
      if (!best || distance < best.distance) {
        best = {
          leg,
          legIndex,
          key: halfEdgeDecorationKey(leg),
          distance,
          nearest: hit.nearest
        };
      }
    });

    return best;
  }

  function decorationHitFromPoint(clientX, clientY) {
    const halfEdgeHit = halfEdgeDecorationHitTest(clientX, clientY);
    if (halfEdgeHit) {
      return {
        type: 'half-edge',
        key: halfEdgeHit.key,
        legIndex: halfEdgeHit.legIndex
      };
    }
    const vertexIndex = vertexDecorationHitTest(clientX, clientY);
    return vertexIndex >= 0 ? { type: 'vertex', index: vertexIndex } : null;
  }

  function sameDecorationHit(left, right) {
    if (!left || !right) return left === right;
    if (left.type !== right.type) return false;
    if (left.type === 'half-edge') return left.key === right.key;
    return left.index === right.index;
  }

  function syncMainCanvasCursor() {
    if (!refs.canvas) return;
    if (state.wanderSelectingStart) {
      refs.canvas.style.cursor = 'copy';
      return;
    }
    if (isDecorationMode()) {
      refs.canvas.style.cursor = state.decorationHoverHit ? 'pointer' : 'default';
      return;
    }
    if (state.inputMode === 'background' && isBackgroundBilliardAction()) {
      refs.canvas.style.cursor = state.backgroundBilliard && state.backgroundBilliard.playing ? 'default' : 'crosshair';
      return;
    }
    if (state.inputMode === 'background' && state.backgroundHoverCusp) {
      refs.canvas.style.cursor = 'pointer';
      return;
    }
    if (state.inputMode === 'background' && isBackgroundBoundaryAction()) {
      refs.canvas.style.cursor = state.backgroundHoverEdge ? 'pointer' : 'default';
      return;
    }
    refs.canvas.style.cursor = '';
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

  function halfEdgeDecorationValue(key) {
    const value = state.halfEdgeDecorations[key];
    return value == null ? '' : String(value);
  }

  function setHalfEdgeDecoration(key, label) {
    if (!key) return false;
    const next = normalizeHalfEdgeDecoration(label);
    const current = halfEdgeDecorationValue(key);
    if (next === current) return false;
    if (next) state.halfEdgeDecorations[key] = next;
    else delete state.halfEdgeDecorations[key];
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function assignNextHalfEdgeDecoration(key) {
    const graphData = collectDualGraphData(analyze(), { requireSingleComponent: false });
    if (!graphData.isValid) return false;
    const labels = orderedHalfEdgeLabels(graphData.legs.length, state.halfEdgeLabelStyle);
    const used = new Set(Object.values(state.halfEdgeDecorations).map((label) => String(label)));
    const next = labels.find((label) => !used.has(label)) || labels[0] || '1';
    return setHalfEdgeDecoration(key, next);
  }

  function scheduleDecorationClick(hit) {
    clearDecorationClickTimer();
    decorationClickTimer = window.setTimeout(() => {
      decorationClickTimer = null;
      if (!hit) return;
      if (hit.type === 'half-edge') {
        assignNextHalfEdgeDecoration(hit.key);
      } else if (hit.type === 'vertex') {
        changeVertexDecoration(hit.index, 1);
      }
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
    const halfEdgeHit = halfEdgeDecorationHitTest(event.clientX, event.clientY);
    if (halfEdgeHit) {
      const current = halfEdgeDecorationValue(halfEdgeHit.key);
      const input = window.prompt('Half-edge label', current);
      if (input == null) return true;
      setHalfEdgeDecoration(halfEdgeHit.key, input);
      refs.statusLine.classList.remove('mosaic-status-bad');
      return true;
    }

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

  function pruneHalfEdgeDecorations(graphData = null) {
    const data = graphData || collectDualGraphData(analyze(), { requireSingleComponent: false });
    if (!data.isValid) {
      state.halfEdgeDecorations = {};
      return;
    }
    const validKeys = new Set(data.legs.map(halfEdgeDecorationKey));
    Object.keys(state.halfEdgeDecorations).forEach((key) => {
      const value = normalizeHalfEdgeDecoration(state.halfEdgeDecorations[key]);
      if (!validKeys.has(key) || !value) delete state.halfEdgeDecorations[key];
      else state.halfEdgeDecorations[key] = value;
    });
  }

  function randomizeHalfEdgeDecorations() {
    const graphData = collectDualGraphData(analyze(), { requireSingleComponent: false });
    if (!graphData.isValid || !graphData.legs.length) return;
    pruneHalfEdgeDecorations(graphData);
    const legs = graphData.legs.slice();
    const remaining = legs.filter((leg) => !halfEdgeDecorationValue(halfEdgeDecorationKey(leg)));
    const targets = remaining.length ? remaining : legs;
    const labels = orderedHalfEdgeLabels(graphData.legs.length, state.halfEdgeLabelStyle);
    const used = remaining.length
      ? new Set(Object.values(state.halfEdgeDecorations).map((label) => String(label)))
      : new Set();
    const available = labels.filter((label) => !used.has(label));
    const shuffled = shuffleArray(available);
    targets.forEach((leg, index) => {
      const label = shuffled[index] || labels[index] || String(index + 1);
      state.halfEdgeDecorations[halfEdgeDecorationKey(leg)] = label;
    });
    state.edits += 1;
    updateReport(false);
  }

  function clearSelectedDecorations() {
    const clearVertex = !!(refs.clearVertexDecorations && refs.clearVertexDecorations.checked);
    const clearHalfEdge = !!(refs.clearHalfEdgeDecorations && refs.clearHalfEdgeDecorations.checked);
    if (!clearVertex && !clearHalfEdge) return;
    let changed = false;
    if (clearVertex && Object.keys(state.vertexDecorations).length) {
      state.vertexDecorations = {};
      changed = true;
    }
    if (clearHalfEdge && Object.keys(state.halfEdgeDecorations).length) {
      state.halfEdgeDecorations = {};
      changed = true;
    }
    if (!changed) return;
    state.edits += 1;
    updateReport(false);
  }

  function halfEdgeDecorationKey(leg) {
    if (leg && leg.key) return String(leg.key);
    return `${leg.vertex}:${leg.spoke}`;
  }

  function normalizeHalfEdgeDecoration(value) {
    return String(value == null ? '' : value).trim();
  }

  function orderedHalfEdgeLabels(count, style) {
    const labelStyle = normalizeHalfEdgeLabelStyle(style);
    return Array.from({ length: Math.max(0, count) }, (_, index) => halfEdgeLabelForIndex(index, labelStyle));
  }

  function halfEdgeLabelForIndex(index, style) {
    if (style === 'letter') return alphabeticLabel(index);
    if (style === 'point') return `p${index + 1}`;
    if (style === 'roman') return romanLabel(index + 1);
    return String(index + 1);
  }

  function alphabeticLabel(index) {
    let value = Math.max(0, Math.trunc(index));
    let label = '';
    do {
      label = String.fromCharCode(97 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return label;
  }

  function romanLabel(value) {
    let remaining = Math.max(1, Math.trunc(value));
    const parts = [
      [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
      [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
      [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
    ];
    let label = '';
    parts.forEach(([amount, text]) => {
      while (remaining >= amount) {
        label += text;
        remaining -= amount;
      }
    });
    return label;
  }

  function halfEdgeDecorationMarkPoint(leg) {
    const end = halfEdgeDecorationEnd(leg);
    const cell = end && geometry && geometry.cells[end.index];
    if (!cell) return null;
    return edgePoint(cell.x, cell.y, end.dir, edgeConnectionDistance(geometry.radius));
  }

  function halfEdgeDecorationLabelPoint(leg) {
    const mark = halfEdgeDecorationMarkPoint(leg);
    if (!mark) return null;
    const end = halfEdgeDecorationEnd(leg);
    const angle = getLattice().angles[end.dir];
    const distance = Math.max(12, geometry.radius * 0.24);
    return {
      x: mark.x + Math.cos(angle) * distance,
      y: mark.y + Math.sin(angle) * distance
    };
  }

  function halfEdgeDecorationEnd(leg) {
    if (!leg || !leg.path || !leg.path.length) return null;
    const last = leg.path[leg.path.length - 1];
    if (
      last
      && isVertexTileValue(state.tiles[last.index])
      && !vertexTileHasSpoke(last.index, last.dir)
      && leg.path.length > 1
    ) {
      return leg.path[leg.path.length - 2];
    }
    return last;
  }

  function halfEdgeDecorationHitGeometry(leg, point) {
    const end = halfEdgeDecorationEnd(leg);
    const mark = halfEdgeDecorationMarkPoint(leg);
    const cell = end && geometry && geometry.cells[end.index];
    if (!point || !mark || !cell) return null;
    const segmentStart = {
      x: cell.x + ((mark.x - cell.x) * 0.58),
      y: cell.y + ((mark.y - cell.y) * 0.58)
    };
    const projection = projectPointToSegment(point, segmentStart, mark);
    return {
      nearest: projection.point,
      distance: Math.min(
        Math.hypot(point.x - mark.x, point.y - mark.y),
        projection.distance
      )
    };
  }

  function clearStandardDualGraphInput() {
    if (state.standardDualGraphInput) state.standardDualGraphInput = null;
  }

  function isGluedBoundaryMode() {
    return state.boundaryMode === 'glued';
  }

  function tileExists(index) {
    return Number.isInteger(index)
      && index >= 0
      && index < state.rows * state.cols
      && (!isGluedBoundaryMode() || !state.removedTiles.has(index));
  }

  function cloneRemovedTileSet() {
    return state.removedTiles instanceof Set ? new Set(state.removedTiles) : new Set();
  }

  function cloneCutEdgeSet() {
    return state.cutEdges instanceof Set ? new Set(state.cutEdges) : new Set();
  }

  function cloneGluedEdges() {
    return Array.isArray(state.gluedEdges)
      ? state.gluedEdges
        .map((pair) => {
          const orientation = normalizeGluePairOrientation(pair);
          return {
            first: cloneBoundaryEdge(pair.first),
            second: cloneBoundaryEdge(pair.second),
            group: normalizeGlueGroup(pair.group),
            reversed: orientation.reversed,
            firstArrowReversed: orientation.firstArrowReversed,
            secondArrowReversed: orientation.secondArrowReversed
          };
        })
        .filter((pair) => pair.first && pair.second)
      : [];
  }

  function cutEdgeKey(leftIndex, rightIndex) {
    const left = Number(leftIndex);
    const right = Number(rightIndex);
    if (!Number.isInteger(left) || !Number.isInteger(right) || left === right) return '';
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function parseCutEdgeKey(key) {
    const match = /^(\d+):(\d+)$/.exec(String(key || ''));
    if (!match) return null;
    return {
      left: Number(match[1]),
      right: Number(match[2])
    };
  }

  function hasCutEdgeBetween(leftIndex, rightIndex) {
    return isGluedBoundaryMode()
      && state.cutEdges instanceof Set
      && state.cutEdges.has(cutEdgeKey(leftIndex, rightIndex));
  }

  function cloneBoundaryEdge(edge) {
    if (!edge) return null;
    const index = Number(edge.index);
    const dir = Number(edge.dir);
    const sides = getLattice().sides;
    if (!Number.isInteger(index) || index < 0 || index >= state.rows * state.cols) return null;
    if (!Number.isInteger(dir)) return null;
    return {
      index,
      dir: normalizeDir(dir, sides)
    };
  }

  function boundaryEdgeKey(edge) {
    const normalized = cloneBoundaryEdge(edge);
    return normalized ? `${normalized.index}:${normalized.dir}` : '';
  }

  function sameBoundaryEdge(left, right) {
    return boundaryEdgeKey(left) === boundaryEdgeKey(right);
  }

  function gluedPairKey(pair) {
    if (!pair) return '';
    const first = boundaryEdgeKey(pair.first);
    const second = boundaryEdgeKey(pair.second);
    if (!first || !second) return '';
    return first < second ? `${first}|${second}` : `${second}|${first}`;
  }

  function normalizeGlueGroup(group) {
    const value = Number(group);
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  function normalizeBooleanFlag(value) {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    }
    return false;
  }

  function normalizeGluePairReversed(pair) {
    if (!pair || typeof pair !== 'object') return false;
    if (Object.prototype.hasOwnProperty.call(pair, 'reversed')) return normalizeBooleanFlag(pair.reversed);
    return pair.orientation === 'reversed';
  }

  function normalizeGluePairOrientation(pair) {
    const reversed = normalizeGluePairReversed(pair);
    const hasFirstArrow = !!(pair && typeof pair === 'object'
      && Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed'));
    const hasSecondArrow = !!(pair && typeof pair === 'object'
      && Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed'));
    const firstArrowReversed = hasFirstArrow ? normalizeBooleanFlag(pair.firstArrowReversed) : reversed;
    const secondArrowReversed = hasSecondArrow ? normalizeBooleanFlag(pair.secondArrowReversed) : !reversed;
    return {
      reversed,
      firstArrowReversed,
      secondArrowReversed
    };
  }

  function gluePairFirstArrowReversed(pair) {
    return normalizeGluePairOrientation(pair).firstArrowReversed;
  }

  function gluePairSecondArrowReversed(pair) {
    return normalizeGluePairOrientation(pair).secondArrowReversed;
  }

  function nextGlueGroup() {
    const groups = cloneGluedEdges()
      .map((pair) => normalizeGlueGroup(pair.group))
      .filter((group) => group != null);
    return groups.length ? Math.max(...groups) + 1 : 0;
  }

  function gluedBoundaryPartner(index, dir) {
    const key = boundaryEdgeKey({ index, dir });
    if (!key) return null;
    for (const pair of cloneGluedEdges()) {
      const firstKey = boundaryEdgeKey(pair.first);
      const secondKey = boundaryEdgeKey(pair.second);
      if (firstKey === key) return cloneBoundaryEdge(pair.second);
      if (secondKey === key) return cloneBoundaryEdge(pair.first);
    }
    return null;
  }

  function isValidBoundaryEdge(edge, rows = state.rows, cols = state.cols) {
    if (!edge) return false;
    const index = Number(edge.index);
    const dir = normalizeDir(edge.dir, getLattice().sides);
    const total = rows * cols;
    if (!Number.isInteger(index) || index < 0 || index >= total) return false;
    if (!Number.isInteger(dir)) return false;
    if (rows === state.rows && cols === state.cols && !tileExists(index)) return false;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const next = neighbor(row, col, dir, rows, cols, getLattice(), false);
    if (!next) return true;
    const nextIndex = indexOf(next.row, next.col, cols);
    if (rows === state.rows && cols === state.cols) {
      return !tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex);
    }
    return false;
  }

  function isGluedBoundaryEdge(index, dir) {
    return !!gluedBoundaryPartner(index, dir);
  }

  function hasGluedBoundaryPairs() {
    return cloneGluedEdges().length > 0;
  }

  function clearPendingGlueEdge() {
    state.pendingGlueEdge = null;
    state.pendingGlueChains = null;
    state.backgroundGlueWarning = '';
    if (state.backgroundGlueFlicker && state.backgroundGlueFlicker.frame != null) {
      window.cancelAnimationFrame(state.backgroundGlueFlicker.frame);
    }
    state.backgroundGlueFlicker = null;
  }

  function removeGluedEdgesForBoundaryEdge(edge) {
    const key = boundaryEdgeKey(edge);
    if (!key) return;
    if (Array.isArray(state.gluedEdges) && state.gluedEdges.length) {
      state.gluedEdges = state.gluedEdges.filter((pair) => (
        boundaryEdgeKey(pair.first) !== key && boundaryEdgeKey(pair.second) !== key
      ));
    }
    if (state.pendingGlueEdge && boundaryEdgeKey(state.pendingGlueEdge) === key) clearPendingGlueEdge();
    if (state.pendingGlueChains && edgeInGlueChains(edge, state.pendingGlueChains)) clearPendingGlueEdge();
  }

  function removeGluedEdgesForTile(index) {
    if (Array.isArray(state.gluedEdges) && state.gluedEdges.length) {
      state.gluedEdges = state.gluedEdges.filter((pair) => (
        pair.first.index !== index && pair.second.index !== index
      ));
    }
    if (state.pendingGlueEdge && state.pendingGlueEdge.index === index) clearPendingGlueEdge();
    if (state.pendingGlueChains && (
      (state.pendingGlueChains.first || []).some((edge) => edge.index === index)
      || (state.pendingGlueChains.second || []).some((edge) => edge.index === index)
    )) clearPendingGlueEdge();
  }

  function pruneGluedEdges() {
    if (!Array.isArray(state.gluedEdges) || !state.gluedEdges.length) {
      state.gluedEdges = [];
      return;
    }
    const seen = new Set();
    state.gluedEdges = state.gluedEdges
      .map((pair) => {
        const first = cloneBoundaryEdge(pair.first);
        const second = cloneBoundaryEdge(pair.second);
        if (!first || !second) return null;
        if (sameBoundaryEdge(first, second)) return null;
        if (!isValidBoundaryEdge(first) || !isValidBoundaryEdge(second)) return null;
        const key = gluedPairKey({ first, second });
        if (!key || seen.has(key)) return null;
        seen.add(key);
        const orientation = normalizeGluePairOrientation(pair);
        return {
          first,
          second,
          group: normalizeGlueGroup(pair.group),
          reversed: orientation.reversed,
          firstArrowReversed: orientation.firstArrowReversed,
          secondArrowReversed: orientation.secondArrowReversed
        };
      })
      .filter(Boolean);
    if (state.pendingGlueEdge && !isValidBoundaryEdge(state.pendingGlueEdge)) clearPendingGlueEdge();
    prunePendingGlueChains();
  }

  function prunePendingGlueChains() {
    const chains = state.pendingGlueChains;
    if (!chains) return;
    const first = (chains.first || []).filter((edge) => isValidBoundaryEdge(edge));
    const second = (chains.second || []).filter((edge) => isValidBoundaryEdge(edge));
    if (!first.length && !second.length) {
      clearPendingGlueEdge();
      return;
    }
    chains.first = first;
    chains.second = second;
    if (!chains.first.length) chains.phase = 'first';
    else if (chains.second.length) chains.phase = 'second';
  }

  function isValidCutEdgeKey(key, rows = state.rows, cols = state.cols) {
    const parsed = parseCutEdgeKey(key);
    if (!parsed) return false;
    const total = rows * cols;
    if (parsed.left < 0 || parsed.left >= total || parsed.right < 0 || parsed.right >= total) return false;
    const lattice = getLattice();
    const leftRow = Math.floor(parsed.left / cols);
    const leftCol = parsed.left % cols;
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      const next = neighbor(leftRow, leftCol, dir, rows, cols, lattice, false);
      if (next && indexOf(next.row, next.col, cols) === parsed.right) return true;
    }
    return false;
  }

  function removeCutEdgesForTile(index) {
    if (state.cutEdges instanceof Set && state.cutEdges.size > 0) {
      state.cutEdges.forEach((key) => {
        const parsed = parseCutEdgeKey(key);
        if (parsed && (parsed.left === index || parsed.right === index)) state.cutEdges.delete(key);
      });
    }
    removeGluedEdgesForTile(index);
  }

  function pruneCutEdges() {
    if (state.cutEdges instanceof Set && state.cutEdges.size > 0) {
      state.cutEdges.forEach((key) => {
        const parsed = parseCutEdgeKey(key);
        if (!parsed || !isValidCutEdgeKey(key) || !tileExists(parsed.left) || !tileExists(parsed.right)) {
          state.cutEdges.delete(key);
        }
      });
    }
    pruneGluedEdges();
  }

  function clearTileForRemoval(index) {
    if (index < 0 || index >= state.tiles.length) return;
    state.tiles[index] = null;
    delete state.vertexDecorations[index];
    removeCutEdgesForTile(index);
    removeGluedEdgesForTile(index);
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
    state.backgroundHoverEdge = null;
  }

  function clearRemovedTileContents() {
    if (!isGluedBoundaryMode()) return;
    cloneRemovedTileSet().forEach((index) => {
      if (index < 0 || index >= state.tiles.length) return;
      state.tiles[index] = null;
      delete state.vertexDecorations[index];
      removeCutEdgesForTile(index);
      removeGluedEdgesForTile(index);
    });
    state.pickedComponent = null;
    state.pickedAnchor = null;
    state.pickHoverHit = null;
  }

  function toggleBackgroundTile(index) {
    if (!isGluedBoundaryMode() || index < 0 || index >= state.rows * state.cols) return false;
    clearBackgroundBilliard(false);
    clearStandardDualGraphInput();
    const removing = !state.removedTiles.has(index);
    if (removing) {
      state.removedTiles.add(index);
      clearTileForRemoval(index);
    } else {
      state.removedTiles.delete(index);
    }
    pruneGluedEdges();
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function toggleBackgroundBoundary(edge) {
    if (!isGluedBoundaryMode() || !edge) return false;
    const key = cutEdgeKey(edge.index, edge.nextIndex);
    if (!key) return false;
    if (!tileExists(edge.index) || !tileExists(edge.nextIndex)) return false;
    clearBackgroundBilliard(false);
    clearStandardDualGraphInput();
    if (state.cutEdges.has(key)) {
      state.cutEdges.delete(key);
    } else {
      removeGluedEdgesForBoundaryEdge({ index: edge.index, dir: edge.dir });
      removeGluedEdgesForBoundaryEdge({ index: edge.nextIndex, dir: getLattice().opposite[edge.dir] });
      state.cutEdges.add(key);
    }
    state.backgroundHoverEdge = null;
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function toggleGlueBoundary(edge) {
    if (!isGluedBoundaryMode() || !edge) return false;
    const boundaryEdge = {
      index: edge.index,
      dir: edge.dir
    };
    if (!isValidBoundaryEdge(boundaryEdge)) return false;
    clearBackgroundBilliard(false);
    clearStandardDualGraphInput();

    const existingPair = gluedPairForBoundaryEdge(boundaryEdge);
    if (existingPair) {
      state.gluedEdges = cloneGluedEdges().filter((pair) => gluedPairKey(pair) !== gluedPairKey(existingPair));
      if (state.pendingGlueEdge && (
        sameBoundaryEdge(state.pendingGlueEdge, existingPair.first)
        || sameBoundaryEdge(state.pendingGlueEdge, existingPair.second)
      )) clearPendingGlueEdge();
      state.backgroundHoverEdge = null;
      pruneHalfEdgeDecorations();
      state.edits += 1;
      updateReport(false);
      return true;
    }

    if (!state.pendingGlueEdge || !isValidBoundaryEdge(state.pendingGlueEdge)) {
      state.pendingGlueEdge = cloneBoundaryEdge(boundaryEdge);
      state.backgroundHoverEdge = null;
      updateReport(false);
      return true;
    }

    if (sameBoundaryEdge(state.pendingGlueEdge, boundaryEdge)) {
      clearPendingGlueEdge();
      state.backgroundHoverEdge = null;
      updateReport(false);
      return true;
    }

    const first = cloneBoundaryEdge(state.pendingGlueEdge);
    const second = cloneBoundaryEdge(boundaryEdge);
    if (!first || !second) {
      clearPendingGlueEdge();
      updateReport(false);
      return false;
    }

    removeGluedEdgesForBoundaryEdge(first);
    removeGluedEdgesForBoundaryEdge(second);
    state.gluedEdges.push({
      first,
      second,
      group: nextGlueGroup(),
      reversed: false,
      firstArrowReversed: false,
      secondArrowReversed: true
    });
    clearPendingGlueEdge();
    pruneGluedEdges();
    state.backgroundHoverEdge = null;
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function gluedPairForBoundaryEdge(edge) {
    const key = boundaryEdgeKey(edge);
    if (!key) return null;
    return cloneGluedEdges().find((pair) => (
      boundaryEdgeKey(pair.first) === key || boundaryEdgeKey(pair.second) === key
    )) || null;
  }

  function toggleGlueBoundaryMulti(edge) {
    if (!isGluedBoundaryMode() || !edge) return false;
    const boundaryEdge = cloneBoundaryEdge({ index: edge.index, dir: edge.dir });
    if (!boundaryEdge || !isValidBoundaryEdge(boundaryEdge)) return false;
    clearBackgroundBilliard(false);
    clearStandardDualGraphInput();

    const existingPair = gluedPairForBoundaryEdge(boundaryEdge);
    if (existingPair && !hasPendingGlueChains()) {
      state.gluedEdges = cloneGluedEdges().filter((pair) => gluedPairKey(pair) !== gluedPairKey(existingPair));
      state.backgroundHoverEdge = null;
      pruneHalfEdgeDecorations();
      state.edits += 1;
      updateReport(false);
      return true;
    }
    if (!isUngluedBackgroundBoundaryEdge(boundaryEdge)) return false;

    const chains = ensurePendingGlueChains();
    updatePendingGlueChainFromClick(chains, boundaryEdge);
    state.backgroundHoverEdge = null;
    syncBackgroundModeControls();
    updateReport(false);
    return true;
  }

  function reverseGluedBoundaryGroupAt(edge) {
    if (!edge || !hasGluedBoundaryPairs()) return false;
    const pairs = cloneGluedEdges();
    const hitKey = boundaryEdgeKey({ index: edge.index, dir: edge.dir });
    const hitIndex = pairs.findIndex((pair) => (
      boundaryEdgeKey(pair.first) === hitKey || boundaryEdgeKey(pair.second) === hitKey
    ));
    if (hitIndex < 0) return false;
    const hitSide = boundaryEdgeKey(pairs[hitIndex].first) === hitKey ? 'first' : 'second';
    const group = gluePairGroup(pairs[hitIndex], hitIndex);
    const groupPairs = pairs
      .map((pair, index) => ({ pair, index }))
      .filter((entry) => gluePairGroup(entry.pair, entry.index) === group);
    if (!groupPairs.length) return false;
    const nextReversed = !groupPairs.some((entry) => entry.pair.reversed);
    const nextEdges = groupPairs.map((entry) => cloneBoundaryEdge(entry.pair[hitSide])).reverse();
    groupPairs.forEach((entry, index) => {
      let firstArrowReversed = gluePairFirstArrowReversed(entry.pair);
      let secondArrowReversed = gluePairSecondArrowReversed(entry.pair);
      entry.pair[hitSide] = nextEdges[index];
      if (hitSide === 'first') firstArrowReversed = !firstArrowReversed;
      else secondArrowReversed = !secondArrowReversed;
      entry.pair.firstArrowReversed = firstArrowReversed;
      entry.pair.secondArrowReversed = secondArrowReversed;
      entry.pair.reversed = nextReversed;
    });
    clearBackgroundBilliard(false);
    clearStandardDualGraphInput();
    state.gluedEdges = pairs;
    pruneGluedEdges();
    state.backgroundHoverEdge = null;
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function beginSecondGlueBoundaryChain() {
    if (!isGluedBoundaryMode() || !isBackgroundGlueAction() || !state.backgroundMultiEdges) return;
    const chains = state.pendingGlueChains;
    const firstCount = chains && Array.isArray(chains.first) ? chains.first.length : 0;
    if (!chains || firstCount === 0) return;
    if (chains.phase === 'second') {
      commitPendingGlueChains(chains);
      return;
    }
    chains.phase = 'second';
    chains.second = [];
    chains.secondStart = null;
    chains.secondReversed = !!state.backgroundChainReversed;
    state.backgroundHoverEdge = null;
    syncBackgroundModeControls();
    updateReport(false);
  }

  function selectBackgroundCusp(hit) {
    if (!hit || !hit.id) return false;
    state.selectedBackgroundCusp = state.selectedBackgroundCusp === hit.id ? null : hit.id;
    state.backgroundHoverCusp = hit;
    updateReport(false);
    return true;
  }

  function ensurePendingGlueChains() {
    if (!state.pendingGlueChains) {
      state.pendingGlueChains = {
        phase: 'first',
        first: [],
        second: [],
        firstStart: null,
        secondStart: null,
        firstReversed: !!state.backgroundChainReversed,
        secondReversed: !!state.backgroundChainReversed
      };
    }
    return state.pendingGlueChains;
  }

  function hasPendingGlueChains() {
    const chains = state.pendingGlueChains;
    return !!(chains && (
      (Array.isArray(chains.first) && chains.first.length)
      || (Array.isArray(chains.second) && chains.second.length)
    ));
  }

  function updatePendingGlueChainFromClick(chains, edge) {
    if (!chains || !edge) return false;
    const phase = chains.phase === 'second' ? 'second' : 'first';
    const startKey = phase === 'second' ? 'secondStart' : 'firstStart';
    const chainKey = phase === 'second' ? 'second' : 'first';
    const existingChain = Array.isArray(chains[chainKey]) ? chains[chainKey] : [];

    if (!chains[startKey] || !existingChain.length) {
      setPendingGlueChainStart(chains, phase, edge);
      return true;
    }

    const lengthDelta = pendingGlueChainLengthDelta(existingChain, edge);
    if (lengthDelta !== 0) {
      applyPendingGlueChainLengthDelta(lengthDelta);
      return true;
    }

    if (updatePendingGlueChainDirectionFromClick(existingChain, edge)) {
      rebuildPendingGlueChainsFromSettings();
      return true;
    }

    if (existingChain.length === 1) {
      const expectedForward = nextBackgroundBoundaryComponentEdge(existingChain[0]);
      const expectedBackward = previousBackgroundBoundaryComponentEdge(existingChain[0]);
      if (sameBoundaryEdge(edge, expectedForward) || sameBoundaryEdge(edge, expectedBackward)) {
        state.backgroundChainReversed = sameBoundaryEdge(edge, expectedBackward);
        state.backgroundChainLength = normalizeBackgroundChainLength(2);
        rebuildPendingGlueChainsFromSettings();
        return true;
      }
    }

    setPendingGlueChainStart(chains, phase, edge);
    return true;
  }

  function updatePendingGlueChainDirectionFromClick(chain, edge) {
    if (!Array.isArray(chain) || !chain.length || !edge) return false;
    const start = chain[0];
    const currentReversed = activePendingGlueChainReversed();
    const forward = nextBackgroundBoundaryComponentEdge(start);
    const backward = previousBackgroundBoundaryComponentEdge(start);
    if (currentReversed && sameBoundaryEdge(edge, forward)) {
      setActivePendingGlueChainReversed(false);
      if (state.backgroundChainLength < 2) state.backgroundChainLength = normalizeBackgroundChainLength(2);
      return true;
    }
    if (!currentReversed && sameBoundaryEdge(edge, backward)) {
      setActivePendingGlueChainReversed(true);
      if (state.backgroundChainLength < 2) state.backgroundChainLength = normalizeBackgroundChainLength(2);
      return true;
    }
    return false;
  }

  function setPendingGlueChainStart(chains, phase, edge) {
    const start = cloneBoundaryEdge(edge);
    if (!chains || !isUngluedBackgroundBoundaryEdge(start)) return false;
    const reversed = pendingGlueChainReversed(chains, phase);
    const result = buildBackgroundBoundaryChainResult(start, state.backgroundChainLength, reversed);
    const chain = result.chain;
    if (!chain.length) {
      startBackgroundGlueFlicker(result.attempt || [start]);
      if (phase === 'second') {
        if (!chains.secondStart || !chains.second.length) {
          chains.secondStart = start;
          chains.second = [];
        }
      } else if (!chains.firstStart || !chains.first.length) {
        chains.phase = 'first';
        chains.firstStart = start;
        chains.first = [];
        chains.secondStart = null;
        chains.second = [];
      }
      setBackgroundGlueWarning(result.warning || 'coincide happens');
      return false;
    }
    if (phase === 'second' && chainsOverlap(chain, chains.first)) {
      startBackgroundGlueFlicker(overlappingChainEdges(chain, chains.first));
      if (!chains.secondStart || !chains.second.length) {
        chains.secondStart = start;
        chains.second = [];
      }
      setBackgroundGlueWarning('coincide happens');
      return false;
    }
    if (phase === 'first') updateFirstGlueChainSpaceWarning(chain);
    else clearBackgroundGlueWarning();
    if (phase === 'second') {
      chains.secondStart = start;
      chains.second = chain;
      chains.secondReversed = reversed;
    } else {
      chains.phase = 'first';
      chains.firstStart = start;
      chains.first = chain;
      chains.firstReversed = reversed;
      chains.secondStart = null;
      chains.second = [];
    }
    return true;
  }

  function updateFirstGlueChainSpaceWarning(chain) {
    const totalBoundaryEdges = countUngluedBackgroundBoundaryEdges();
    if (Array.isArray(chain) && totalBoundaryEdges > 0 && chain.length > totalBoundaryEdges / 2) {
      setBackgroundGlueWarning('there is no space for making a second chain');
      return;
    }
    clearBackgroundGlueWarning();
  }

  function pendingGlueChainLengthDelta(chain, edge) {
    if (!Array.isArray(chain) || !chain.length || !edge) return 0;
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized) return 0;
    if (chain.length > 1 && sameBoundaryEdge(normalized, chain[chain.length - 1])) return -1;
    const tail = chain[chain.length - 1];
    const extension = activePendingGlueChainReversed()
      ? previousBackgroundBoundaryComponentEdge(tail)
      : nextBackgroundBoundaryComponentEdge(tail);
    if (sameBoundaryEdge(normalized, extension)) return 1;
    return 0;
  }

  function applyPendingGlueChainLengthDelta(delta) {
    const previousLength = normalizeBackgroundChainLength(state.backgroundChainLength);
    state.backgroundChainLength = normalizeBackgroundChainLength(previousLength + delta);
    rebuildPendingGlueChainsFromSettings();
    if (state.backgroundGlueWarning === 'coincide happens') {
      state.backgroundChainLength = previousLength;
      rebuildPendingGlueChainsFromSettings();
      setBackgroundGlueWarning('coincide happens');
    }
  }

  function pendingGlueChainReversed(chains, phase) {
    if (!chains) return !!state.backgroundChainReversed;
    if (phase === 'second') return !!chains.secondReversed;
    return !!chains.firstReversed;
  }

  function activePendingGlueChainReversed() {
    const chains = state.pendingGlueChains;
    const phase = chains && chains.phase === 'second' ? 'second' : 'first';
    return pendingGlueChainReversed(chains, phase);
  }

  function setActivePendingGlueChainReversed(reversed) {
    const chains = ensurePendingGlueChains();
    if (chains.phase === 'second') chains.secondReversed = !!reversed;
    else chains.firstReversed = !!reversed;
    state.backgroundChainReversed = !!reversed;
  }

  function pendingGlueStatusText() {
    if (!isBackgroundGlueAction()) return '';
    if (state.backgroundGlueWarning) return state.backgroundGlueWarning;
    const chains = state.pendingGlueChains;
    if (chains && ((chains.first || []).length || (chains.second || []).length)) {
      const firstCount = (chains.first || []).length;
      const secondCount = (chains.second || []).length;
      const expectedCount = normalizeBackgroundChainLength(state.backgroundChainLength);
      const firstShortText = firstCount < expectedCount ? ` (${firstCount}/${expectedCount} available)` : '';
      if (chains.phase === 'second') {
        const secondShortText = secondCount > 0 && secondCount < expectedCount ? ` (${secondCount}/${expectedCount} available)` : '';
        return `glue boundary: second chain ${secondCount}/${expectedCount} edge${expectedCount === 1 ? '' : 's'}${secondShortText}; choose start edge, then finish`;
      }
      return `glue boundary: first chain ${firstCount} edge${firstCount === 1 ? '' : 's'}${firstShortText}; choose start edge or adjust length`;
    }
    if (state.pendingGlueEdge) return 'glue boundary: choose the matching edge';
    return '';
  }

  function selectedBackgroundCuspStatusText(background = null) {
    if (!state.selectedBackgroundCusp) return '';
    const vertex = selectedBackgroundCusp(background);
    if (!vertex) return '';
    const angle = formatCuspAngle(vertex);
    const corners = (vertex.corners || []).map(formatCuspCorner).join(', ');
    const vertexCount = vertex.corners.length;
    const vertexText = `${vertexCount} identified vert${vertexCount === 1 ? 'ex' : 'ices'}`;
    if (isBackgroundConeCusp(vertex)) {
      return `${vertex.label || 'cusp'}: ${vertexText}, cone angle ${angle}; ${corners}`;
    }
    return `${vertex.label || 'vertex'}: ${vertexText}, not a cusp, total angle ${angle}; ${corners}`;
  }

  function selectedBackgroundCusp(background = null) {
    const key = state.selectedBackgroundCusp;
    if (!key) return null;
    if (!shouldShowBackgroundCusps()) {
      state.selectedBackgroundCusp = null;
      return null;
    }
    const vertices = computeDisplayedBackgroundCuspVertices();
    const vertex = vertices.find((entry) => entry.id === key) || null;
    if (!vertex) state.selectedBackgroundCusp = null;
    return vertex;
  }

  function resetBackgroundBilliardState() {
    return {
      tileIndex: -1,
      position: null,
      direction: null,
      aimPoint: null,
      hitPoints: [],
      trailPoints: [],
      trailColorMode: 'blue',
      playing: false,
      frame: null,
      lastTime: 0
    };
  }

  function backgroundBilliardState() {
    if (!state.backgroundBilliard || typeof state.backgroundBilliard !== 'object') {
      state.backgroundBilliard = resetBackgroundBilliardState();
    }
    return state.backgroundBilliard;
  }

  function stopBackgroundBilliard(redraw = true) {
    const billiard = backgroundBilliardState();
    if (billiard.frame != null) {
      window.cancelAnimationFrame(billiard.frame);
      billiard.frame = null;
    }
    billiard.playing = false;
    billiard.lastTime = 0;
    syncBackgroundBilliardControls();
    syncBackgroundBilliardStatusLine();
    syncMainCanvasCursor();
    if (redraw) draw(analyze());
  }

  function clearBackgroundBilliard(redraw = true) {
    const current = backgroundBilliardState();
    if (current.frame != null) window.cancelAnimationFrame(current.frame);
    state.backgroundBilliard = resetBackgroundBilliardState();
    syncBackgroundBilliardControls();
    syncMainCanvasCursor();
    if (redraw) updateReport(false);
  }

  function remapBackgroundBilliardAfterResize(oldGeometry) {
    const billiard = backgroundBilliardState();
    if (!oldGeometry || !geometry || !billiard.position || billiard.tileIndex < 0) return;
    const oldCell = oldGeometry.cells && oldGeometry.cells[billiard.tileIndex];
    const nextCell = geometry.cells && geometry.cells[billiard.tileIndex];
    if (!oldCell || !nextCell || !Number.isFinite(oldGeometry.radius) || oldGeometry.radius <= 0) {
      clearBackgroundBilliard(false);
      return;
    }
    const scale = geometry.radius / oldGeometry.radius;
    const oldPosition = billiard.position;
    billiard.position = {
      x: nextCell.x + ((billiard.position.x - oldCell.x) * scale),
      y: nextCell.y + ((billiard.position.y - oldCell.y) * scale)
    };
    if (billiard.aimPoint) {
      billiard.aimPoint = {
        x: nextCell.x + ((billiard.aimPoint.x - oldCell.x) * scale),
        y: nextCell.y + ((billiard.aimPoint.y - oldCell.y) * scale)
      };
    }
    billiard.hitPoints = [];
    billiard.trailPoints = oldPosition ? [{ ...billiard.position }] : [];
    trimBackgroundBilliardTrail();
  }

  function syncBackgroundBilliardControls() {
    const billiard = backgroundBilliardState();
    const show = isGluedBoundaryMode() && state.inputMode === 'background' && isBackgroundBilliardAction();
    if (refs.backgroundBilliardRow) refs.backgroundBilliardRow.hidden = !show;
    if (refs.backgroundBilliardSpeedRow) refs.backgroundBilliardSpeedRow.hidden = !show;
    if (refs.backgroundBilliardTrailRow) refs.backgroundBilliardTrailRow.hidden = !show;
    if (refs.backgroundBilliardArrowRow) refs.backgroundBilliardArrowRow.hidden = !show;
    if (refs.backgroundBilliardHitRow) refs.backgroundBilliardHitRow.hidden = !show;
    if (refs.backgroundBilliardPlay) {
      let playLabel = 'add point';
      let playDisabled = true;
      if (billiard.playing) {
        playLabel = 'stop';
        playDisabled = false;
      } else if (billiard.position && !billiard.direction) {
        playLabel = 'choose direction';
      } else if (billiard.position && billiard.direction) {
        playLabel = 'play';
        playDisabled = false;
      }
      refs.backgroundBilliardPlay.textContent = playLabel;
      refs.backgroundBilliardPlay.disabled = !show || playDisabled;
    }
    if (refs.backgroundBilliardClear) {
      refs.backgroundBilliardClear.disabled = !show || (!billiard.position && !billiard.direction && !billiard.hitPoints.length && !billiard.trailPoints.length);
    }
    if (refs.backgroundBilliardSpeed) {
      const speed = normalizeBackgroundBilliardSpeed(state.backgroundBilliardSpeed);
      refs.backgroundBilliardSpeed.value = speed.toFixed(2);
      if (refs.backgroundBilliardSpeedValue) refs.backgroundBilliardSpeedValue.textContent = speed.toFixed(2);
    }
    if (refs.backgroundBilliardTrail) {
      const trailLength = normalizeBackgroundBilliardTrailLength(state.backgroundBilliardTrailLength);
      refs.backgroundBilliardTrail.value = String(Math.round(trailLength));
      if (refs.backgroundBilliardTrailValue) refs.backgroundBilliardTrailValue.textContent = formatBackgroundBilliardTrailLength(trailLength);
    }
    if (refs.backgroundBilliardArrow) {
      const arrowLength = normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength);
      refs.backgroundBilliardArrow.value = String(Math.round(arrowLength));
      if (refs.backgroundBilliardArrowValue) refs.backgroundBilliardArrowValue.textContent = String(Math.round(arrowLength));
    }
    if (refs.backgroundBilliardHitMarkers) {
      refs.backgroundBilliardHitMarkers.value = normalizeBackgroundBilliardHitMarkers(state.backgroundBilliardHitMarkers);
    }
  }

  function toggleBackgroundBilliardPlayback() {
    const billiard = backgroundBilliardState();
    if (billiard.playing) {
      stopBackgroundBilliard(true);
      return;
    }
    if (!billiard.position || !billiard.direction || billiard.tileIndex < 0 || !tileExists(billiard.tileIndex)) return;
    if (!Array.isArray(billiard.trailPoints) || !billiard.trailPoints.length) {
      billiard.trailPoints = [{ x: billiard.position.x, y: billiard.position.y, colorMode: billiard.trailColorMode === 'purple' ? 'purple' : 'blue' }];
    }
    billiard.playing = true;
    billiard.lastTime = 0;
    syncBackgroundBilliardControls();
    syncBackgroundBilliardStatusLine();
    syncMainCanvasCursor();
    billiard.frame = window.requestAnimationFrame(stepBackgroundBilliardAnimation);
  }

  function stepBackgroundBilliardAnimation(timestamp) {
    const billiard = backgroundBilliardState();
    if (!billiard.playing) {
      billiard.frame = null;
      syncBackgroundBilliardControls();
      return;
    }
    if (!billiard.lastTime) billiard.lastTime = timestamp;
    const elapsed = clamp(timestamp - billiard.lastTime, 0, 48);
    billiard.lastTime = timestamp;
    advanceBackgroundBilliard(normalizeBackgroundBilliardSpeed(state.backgroundBilliardSpeed) * elapsed);
    syncBackgroundBilliardStatusLine();
    draw(analyze());
    if (billiard.playing) billiard.frame = window.requestAnimationFrame(stepBackgroundBilliardAnimation);
    else {
      syncBackgroundBilliardControls();
      syncBackgroundBilliardStatusLine();
    }
  }

  function handleBackgroundBilliardClick(clientX, clientY) {
    if (!isGluedBoundaryMode()) return false;
    const point = clientPointToBoardPoint(clientX, clientY);
    const billiard = backgroundBilliardState();
    if (!billiard.position || billiard.playing) {
      const hit = tileHitAtBoardPoint(point, 1);
      if (!hit || !tileExists(hit.index)) return false;
      stopBackgroundBilliard(false);
      state.backgroundBilliard = {
        ...resetBackgroundBilliardState(),
        tileIndex: hit.index,
        position: { x: point.x, y: point.y },
        trailPoints: [{ x: point.x, y: point.y, colorMode: 'blue' }],
        trailColorMode: 'blue',
        aimPoint: null
      };
      syncBackgroundBilliardControls();
      updateReport(false);
      return true;
    }

    const dx = point.x - billiard.position.x;
    const dy = point.y - billiard.position.y;
    if (Math.hypot(dx, dy) < Math.max(4, geometry.radius * 0.12)) return false;
    billiard.direction = normalizeVector(dx, dy, 1, 0);
    billiard.aimPoint = { x: point.x, y: point.y };
    syncBackgroundBilliardControls();
    updateReport(false);
    return true;
  }

  function updateBackgroundBilliardAim(clientX, clientY, redraw = true) {
    const billiard = backgroundBilliardState();
    if (!isBackgroundBilliardAction() || billiard.playing || !billiard.position || billiard.direction) {
      if (billiard.aimPoint && (!isBackgroundBilliardAction() || billiard.playing)) {
        billiard.aimPoint = null;
        if (redraw) draw(analyze());
        return true;
      }
      return false;
    }
    const point = clientPointToBoardPoint(clientX, clientY);
    const next = { x: point.x, y: point.y };
    if (billiard.aimPoint && Math.hypot(billiard.aimPoint.x - next.x, billiard.aimPoint.y - next.y) < 0.5) return false;
    billiard.aimPoint = next;
    if (redraw) draw(analyze());
    return true;
  }

  function backgroundTileHitIndex(clientX, clientY) {
    const hit = tileHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY), 1);
    return hit ? hit.index : -1;
  }

  function backgroundBilliardStatusText() {
    if (!isBackgroundBilliardAction()) return '';
    const billiard = backgroundBilliardState();
    if (!billiard.position) return 'geodesic: click inside an existing tile to place the point';
    if (!billiard.direction) return 'geodesic: click a second point to choose direction';
    const boundaryHits = backgroundBilliardBoundaryHitCount(billiard);
    return `geodesic: ${billiard.playing ? 'playing' : 'ready'}, ${boundaryHits} hit${boundaryHits === 1 ? '' : 's'}`;
  }

  function backgroundBilliardBoundaryHitCount(billiard) {
    const hits = billiard && Array.isArray(billiard.hitPoints) ? billiard.hitPoints : [];
    return hits.filter((point) => point.kind === 'boundary').length;
  }

  function syncBackgroundBilliardStatusLine() {
    if (!refs.statusLine) return;
    if (!isGluedBoundaryMode() || state.inputMode !== 'background') return;
    const statusText = pendingGlueStatusText() || backgroundBilliardStatusText();
    if (!statusText) return;
    refs.statusLine.textContent = statusText;
    refs.statusLine.classList.remove('mosaic-status-good', 'mosaic-status-bad');
  }

  function advanceBackgroundBilliard(distance) {
    const billiard = backgroundBilliardState();
    if (!billiard.position || !billiard.direction || billiard.tileIndex < 0 || !Number.isFinite(distance) || distance <= 0) return;
    appendBackgroundBilliardTrailPoint(billiard.position);
    let remaining = distance;
    let guard = 0;
    while (remaining > 0.001 && guard < BACKGROUND_BILLIARD_MAX_COLLISIONS_PER_FRAME) {
      guard += 1;
      const hit = nextBackgroundBilliardEdgeHit(billiard);
      if (!hit) {
        billiard.position = {
          x: billiard.position.x + billiard.direction.x * remaining,
          y: billiard.position.y + billiard.direction.y * remaining
        };
        appendBackgroundBilliardTrailPoint(billiard.position);
        return;
      }
      if (hit.distance > remaining) {
        billiard.position = {
          x: billiard.position.x + billiard.direction.x * remaining,
          y: billiard.position.y + billiard.direction.y * remaining
        };
        appendBackgroundBilliardTrailPoint(billiard.position);
        return;
      }
      billiard.position = {
        x: hit.point.x,
        y: hit.point.y
      };
      appendBackgroundBilliardTrailPoint(billiard.position);
      const transitioned = applyBackgroundBilliardBoundaryHit(billiard, hit);
      remaining -= Math.max(hit.distance, 0);
      if (!transitioned) {
        stopBackgroundBilliard(false);
        return;
      }
    }
    if (guard >= BACKGROUND_BILLIARD_MAX_COLLISIONS_PER_FRAME) {
      stopBackgroundBilliard(false);
    }
  }

  function nextBackgroundBilliardEdgeHit(billiard) {
    const cell = geometry && geometry.cells ? geometry.cells[billiard.tileIndex] : null;
    if (!cell || !billiard.position || !billiard.direction) return null;
    const lattice = getLattice();
    let best = null;
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      const segment = edgeSegmentPoints(cell.x, cell.y, dir, geometry.radius);
      const rayHit = raySegmentIntersection(billiard.position, billiard.direction, segment.start, segment.end);
      if (!rayHit) continue;
      if (rayHit.rayDistance < 0.0008) continue;
      if (!best || rayHit.rayDistance < best.distance) {
        best = {
          index: billiard.tileIndex,
          dir,
          point: rayHit.point,
          edgeT: rayHit.segmentT,
          distance: rayHit.rayDistance,
          segment
        };
      }
    }
    return best;
  }

  function applyBackgroundBilliardBoundaryHit(billiard, hit) {
    const lattice = getLattice();
    const next = backgroundBilliardNeighbor(hit.index, hit.dir);
    if (next) {
      const epsilon = Math.max(0.02, geometry.radius * 0.0008);
      billiard.tileIndex = next.index;
      billiard.position = {
        x: hit.point.x + billiard.direction.x * epsilon,
        y: hit.point.y + billiard.direction.y * epsilon
      };
      return true;
    }

    const pair = gluedPairForBoundaryEdge({ index: hit.index, dir: hit.dir });
    if (pair) {
      const hitEdge = { index: hit.index, dir: hit.dir };
      const hitIsFirst = sameBoundaryEdge(hitEdge, pair.first);
      const partner = hitIsFirst ? pair.second : pair.first;
      if (!partner || !isValidBoundaryEdge(partner)) return false;
      const firstReverse = gluePairFirstArrowReversed(pair);
      const secondReverse = gluePairSecondArrowReversed(pair);
      const transfer = backgroundBilliardGluedTransfer(
        hit,
        partner,
        billiard.direction,
        hitIsFirst ? firstReverse : secondReverse,
        hitIsFirst ? secondReverse : firstReverse
      );
      if (!transfer) return false;
      const epsilon = Math.max(0.02, geometry.radius * 0.0008);
      recordBackgroundBilliardHit(hit.point, 'glued');
      billiard.tileIndex = partner.index;
      appendBackgroundBilliardTrailPoint(transfer.point, true);
      if (firstReverse === secondReverse) {
        billiard.trailColorMode = billiard.trailColorMode === 'purple' ? 'blue' : 'purple';
      }
      billiard.position = {
        x: transfer.point.x + transfer.direction.x * epsilon,
        y: transfer.point.y + transfer.direction.y * epsilon
      };
      billiard.direction = transfer.direction;
      recordBackgroundBilliardHit(transfer.point, 'glued');
      return true;
    }

    recordBackgroundBilliardHit(hit.point, 'boundary');
    billiard.direction = reflectVectorAcrossSegment(billiard.direction, hit.segment);
    const epsilon = Math.max(0.02, geometry.radius * 0.0008);
    billiard.position = {
      x: hit.point.x + billiard.direction.x * epsilon,
      y: hit.point.y + billiard.direction.y * epsilon
    };
    return true;
  }

  function backgroundBilliardNeighbor(index, dir) {
    if (!tileExists(index)) return null;
    const lattice = getLattice();
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const next = neighbor(row, col, dir, state.rows, state.cols, lattice, false);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    if (!tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex)) return null;
    return { index: nextIndex, dir: lattice.opposite[dir] };
  }

  function backgroundBilliardGluedTransfer(hit, partner, direction, currentReverse, partnerReverse) {
    const partnerSegment = boundaryEdgeSegment(partner, 1);
    if (!partnerSegment) return null;
    const firstBasis = orientedEdgeBasis(hit.segment, currentReverse, hit.index);
    const secondBasis = orientedEdgeBasis(partnerSegment, partnerReverse, partner.index);
    const tangentComponent = (direction.x * firstBasis.tangent.x) + (direction.y * firstBasis.tangent.y);
    const inwardComponent = (direction.x * firstBasis.inward.x) + (direction.y * firstBasis.inward.y);
    const nextDirection = normalizeVector(
      (secondBasis.tangent.x * tangentComponent) - (secondBasis.inward.x * inwardComponent),
      (secondBasis.tangent.y * tangentComponent) - (secondBasis.inward.y * inwardComponent),
      secondBasis.inward.x,
      secondBasis.inward.y
    );
    const t = clamp(hit.edgeT, 0, 1);
    const sourceT = currentReverse ? 1 - t : t;
    const partnerT = partnerReverse ? 1 - sourceT : sourceT;
    return {
      point: {
        x: partnerSegment.start.x + (partnerSegment.end.x - partnerSegment.start.x) * partnerT,
        y: partnerSegment.start.y + (partnerSegment.end.y - partnerSegment.start.y) * partnerT
      },
      direction: nextDirection
    };
  }

  function orientedEdgeBasis(segment, reverse, index = -1) {
    const start = reverse ? segment.end : segment.start;
    const end = reverse ? segment.start : segment.end;
    const tangent = normalizeVector(end.x - start.x, end.y - start.y, 1, 0);
    const midpoint = {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2
    };
    const cell = geometry && geometry.cells ? geometry.cells[index] : null;
    const inward = cell
      ? normalizeVector(cell.x - midpoint.x, cell.y - midpoint.y, -tangent.y, tangent.x)
      : normalizeVector(-tangent.y, tangent.x, 0, 1);
    return {
      tangent,
      inward
    };
  }

  function reflectVectorAcrossSegment(vector, segment) {
    const tangent = normalizeVector(segment.end.x - segment.start.x, segment.end.y - segment.start.y, 1, 0);
    const dot = (vector.x * tangent.x) + (vector.y * tangent.y);
    return normalizeVector(
      (2 * dot * tangent.x) - vector.x,
      (2 * dot * tangent.y) - vector.y,
      -vector.x,
      -vector.y
    );
  }

  function raySegmentIntersection(origin, direction, start, end) {
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const cross = (direction.x * sy) - (direction.y * sx);
    if (Math.abs(cross) < 0.000001) return null;
    const qx = start.x - origin.x;
    const qy = start.y - origin.y;
    const rayDistance = ((qx * sy) - (qy * sx)) / cross;
    const segmentT = ((qx * direction.y) - (qy * direction.x)) / cross;
    if (rayDistance < 0 || segmentT < -0.000001 || segmentT > 1.000001) return null;
    return {
      rayDistance,
      segmentT: clamp(segmentT, 0, 1),
      point: {
        x: origin.x + direction.x * rayDistance,
        y: origin.y + direction.y * rayDistance
      }
    };
  }

  function appendBackgroundBilliardTrailPoint(point, breakBefore = false) {
    const billiard = backgroundBilliardState();
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    if (!Array.isArray(billiard.trailPoints)) billiard.trailPoints = [];
    const last = billiard.trailPoints[billiard.trailPoints.length - 1];
    if (!breakBefore && last && Math.hypot(last.x - point.x, last.y - point.y) < 0.25) return;
    billiard.trailPoints.push({
      x: point.x,
      y: point.y,
      breakBefore: !!breakBefore,
      colorMode: billiard.trailColorMode === 'purple' ? 'purple' : 'blue'
    });
    trimBackgroundBilliardTrail();
  }

  function trimBackgroundBilliardTrail() {
    const billiard = backgroundBilliardState();
    if (!Array.isArray(billiard.trailPoints) || billiard.trailPoints.length <= 1) return;
    const trailLength = normalizeBackgroundBilliardTrailLength(state.backgroundBilliardTrailLength);
    if (isInfiniteBackgroundBilliardTrailLength(trailLength)) return;
    let remaining = trailLength;
    if (remaining <= 0) {
      billiard.trailPoints = billiard.position
        ? [{ x: billiard.position.x, y: billiard.position.y, colorMode: billiard.trailColorMode === 'purple' ? 'purple' : 'blue' }]
        : [];
      return;
    }
    const kept = [{ ...billiard.trailPoints[billiard.trailPoints.length - 1] }];
    for (let index = billiard.trailPoints.length - 2; index >= 0; index -= 1) {
      const current = billiard.trailPoints[index];
      const next = kept[kept.length - 1];
      const segmentLength = next.breakBefore ? 0 : Math.hypot(next.x - current.x, next.y - current.y);
      if (segmentLength <= remaining) {
        kept.push({ ...current });
        remaining -= segmentLength;
        continue;
      }
      if (segmentLength > 0.001 && remaining > 0) {
        const ratio = remaining / segmentLength;
        kept.push({
          x: next.x + (current.x - next.x) * ratio,
          y: next.y + (current.y - next.y) * ratio,
          colorMode: next.colorMode || current.colorMode || 'blue'
        });
      }
      break;
    }
    billiard.trailPoints = kept.reverse();
    if (billiard.trailPoints.length) billiard.trailPoints[0].breakBefore = false;
  }

  function recordBackgroundBilliardHit(point, kind = 'boundary') {
    const billiard = backgroundBilliardState();
    if (!point) return;
    billiard.hitPoints.push({ x: point.x, y: point.y, kind });
    if (billiard.hitPoints.length > BACKGROUND_BILLIARD_MAX_HITS) {
      billiard.hitPoints.splice(0, billiard.hitPoints.length - BACKGROUND_BILLIARD_MAX_HITS);
    }
  }

  function formatCuspAngle(cusp) {
    const degrees = Number(cusp && cusp.angleDegrees);
    if (!Number.isFinite(degrees)) return '-';
    const rounded = Math.abs(degrees - Math.round(degrees)) < 1e-6
      ? Math.round(degrees)
      : Number(degrees.toFixed(2));
    const piText = formatPiMultiple(cusp.angleRadians);
    return piText ? `${rounded}deg (${piText})` : `${rounded}deg`;
  }

  function formatPiMultiple(radians) {
    const ratio = Number(radians) / Math.PI;
    if (!Number.isFinite(ratio)) return '';
    const denominator = 6;
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) > 1e-6) return '';
    const divisor = gcd(Math.abs(numerator), denominator);
    const top = numerator / divisor;
    const bottom = denominator / divisor;
    if (top === 0) return '0';
    if (bottom === 1) return top === 1 ? 'pi' : `${top}pi`;
    return top === 1 ? `pi/${bottom}` : `${top}pi/${bottom}`;
  }

  function formatCuspCorner(corner) {
    if (!corner) return '';
    return `r${corner.row + 1}c${corner.col + 1}:v${corner.vertex + 1}`;
  }

  function showBackgroundGlueHint(message) {
    if (refs.statusLine && message) refs.statusLine.textContent = message;
  }

  function setBackgroundGlueWarning(message) {
    state.backgroundGlueWarning = message || '';
  }

  function clearBackgroundGlueWarning() {
    state.backgroundGlueWarning = '';
  }

  function startBackgroundGlueFlicker(edges) {
    const flickerEdges = (Array.isArray(edges) ? edges : [])
      .map(cloneBoundaryEdge)
      .filter(Boolean);
    if (!flickerEdges.length) return;
    if (state.backgroundGlueFlicker && state.backgroundGlueFlicker.frame != null) {
      window.cancelAnimationFrame(state.backgroundGlueFlicker.frame);
    }
    state.backgroundGlueFlicker = {
      edges: flickerEdges,
      start: performance.now(),
      duration: 2700,
      flashes: 3,
      frame: null
    };
    tickBackgroundGlueFlicker();
  }

  function tickBackgroundGlueFlicker() {
    const flicker = state.backgroundGlueFlicker;
    if (!flicker) return;
    const elapsed = performance.now() - flicker.start;
    if (elapsed >= flicker.duration) {
      state.backgroundGlueFlicker = null;
      draw(analyze());
      return;
    }
    draw(analyze());
    flicker.frame = window.requestAnimationFrame(tickBackgroundGlueFlicker);
  }

  function edgeInGlueChains(edge, chains = state.pendingGlueChains) {
    if (!chains) return false;
    return (chains.first || []).some((item) => sameBoundaryEdge(item, edge))
      || (chains.second || []).some((item) => sameBoundaryEdge(item, edge));
  }

  function chainsOverlap(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || !left.length || !right.length) return false;
    const keys = new Set(left.map(boundaryEdgeKey).filter(Boolean));
    return right.some((edge) => keys.has(boundaryEdgeKey(edge)));
  }

  function overlappingChainEdges(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right)) return [];
    const rightKeys = new Set(right.map(boundaryEdgeKey).filter(Boolean));
    const leftKeys = new Set(left.map(boundaryEdgeKey).filter(Boolean));
    return left
      .filter((edge) => rightKeys.has(boundaryEdgeKey(edge)))
      .concat(right.filter((edge) => leftKeys.has(boundaryEdgeKey(edge))));
  }

  function commitPendingGlueChains(chains) {
    if (!chains || chains.first.length !== chains.second.length || chains.first.length === 0) return false;
    if (chains.first.length !== normalizeBackgroundChainLength(state.backgroundChainLength)) return false;
    clearBackgroundBilliard(false);
    const group = nextGlueGroup();
    const firstChain = commitReadyGlueChain(chains.first);
    const secondChain = commitReadyGlueChain(chains.second);
    if (firstChain.length !== secondChain.length || firstChain.length === 0) return false;
    const secondArrowOrder = secondChain.slice().reverse();
    const nextPairs = firstChain.map((first, index) => ({
      first: cloneBoundaryEdge(first),
      second: cloneBoundaryEdge(secondArrowOrder[index]),
      group,
      reversed: false,
      firstArrowReversed: false,
      secondArrowReversed: true
    })).filter((pair) => (
      pair.first
      && pair.second
      && !sameBoundaryEdge(pair.first, pair.second)
      && isUngluedBackgroundBoundaryEdge(pair.first)
      && isUngluedBackgroundBoundaryEdge(pair.second)
    ));
    if (nextPairs.length !== firstChain.length) {
      setBackgroundGlueWarning('coincide happens');
      startBackgroundGlueFlicker(firstChain.concat(secondChain));
      syncBackgroundModeControls();
      updateReport(false);
      return false;
    }

    nextPairs.forEach((pair) => {
      removeGluedEdgesForBoundaryEdge(pair.first);
      removeGluedEdgesForBoundaryEdge(pair.second);
    });
    state.gluedEdges.push(...nextPairs);
    clearPendingGlueEdge();
    pruneGluedEdges();
    state.backgroundHoverEdge = null;
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function commitReadyGlueChain(chain) {
    if (!Array.isArray(chain) || chain.length < 2) return Array.isArray(chain) ? chain.slice() : [];
    if (sameBoundaryEdge(chain[0], chain[chain.length - 1])) return chain.slice(0, -1);
    return chain.slice();
  }

  function isBackgroundBoundaryChainContinuation(left, right) {
    const normalizedLeft = cloneBoundaryEdge(left);
    const normalizedRight = cloneBoundaryEdge(right);
    if (!isUngluedBackgroundBoundaryEdge(normalizedLeft) || !isUngluedBackgroundBoundaryEdge(normalizedRight)) return false;
    return sameBoundaryEdge(nextBackgroundBoundaryComponentEdge(normalizedLeft), normalizedRight)
      || sameBoundaryEdge(previousBackgroundBoundaryComponentEdge(normalizedLeft), normalizedRight);
  }

  function buildBackgroundBoundaryChainResult(start, length = state.backgroundChainLength, reversed = state.backgroundChainReversed) {
    const first = cloneBoundaryEdge(start);
    if (!isUngluedBackgroundBoundaryEdge(first)) return { chain: [], warning: '', attempt: [] };
    const targetLength = normalizeBackgroundChainLength(length);
    const chain = [first];
    const seen = new Set([boundaryEdgeKey(first)]);
    let current = first;
    for (let index = 1; index < targetLength; index += 1) {
      const next = reversed
        ? previousBackgroundBoundaryComponentEdge(current)
        : nextBackgroundBoundaryComponentEdge(current);
      const nextKey = boundaryEdgeKey(next);
      if (!next || !nextKey) return { chain: [], warning: 'coincide happens', attempt: chain };
      if (seen.has(nextKey)) {
        return { chain: [], warning: 'coincide happens', attempt: chain.concat([next]) };
      }
      chain.push(next);
      seen.add(nextKey);
      current = next;
    }
    return { chain, warning: '', attempt: chain };
  }

  function buildBackgroundBoundaryChain(start, length = state.backgroundChainLength, reversed = state.backgroundChainReversed) {
    return buildBackgroundBoundaryChainResult(start, length, reversed).chain;
  }

  function rebuildPendingGlueChainsFromSettings() {
    const chains = state.pendingGlueChains;
    if (!chains) return;
    clearBackgroundGlueWarning();
    if (chains.firstStart) {
      const firstResult = buildBackgroundBoundaryChainResult(chains.firstStart, state.backgroundChainLength, pendingGlueChainReversed(chains, 'first'));
      chains.first = firstResult.chain;
      if (firstResult.warning) {
        setBackgroundGlueWarning(firstResult.warning);
        startBackgroundGlueFlicker(firstResult.attempt || [chains.firstStart]);
      }
    }
    if (chains.secondStart) {
      const secondResult = buildBackgroundBoundaryChainResult(chains.secondStart, state.backgroundChainLength, pendingGlueChainReversed(chains, 'second'));
      chains.second = secondResult.chain;
      if (secondResult.warning || chainsOverlap(chains.second, chains.first)) {
        setBackgroundGlueWarning(secondResult.warning || 'coincide happens');
        startBackgroundGlueFlicker(secondResult.warning
          ? secondResult.attempt || [chains.secondStart]
          : overlappingChainEdges(chains.second, chains.first));
        chains.second = [];
      }
    }
    if (!state.backgroundGlueWarning && chains.first.length) updateFirstGlueChainSpaceWarning(chains.first);
  }

  function rotateTile(index, steps) {
    if (!tileExists(index) || isTileEmpty(state.tiles[index])) return;
    const next = rotateTileValue(state.tiles[index], steps);
    if (tilesEqual(state.tiles[index], next)) return;
    clearStandardDualGraphInput();
    state.tiles[index] = next;
    state.edits += 1;
    updateReport(false);
  }

  function editExistingTile(index, direction) {
    if (!tileExists(index)) return;
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
    clearStandardDualGraphInput();
    state.tiles[index] = cloneTile(next);
    state.edits += 1;
    updateReport(false);
  }

  function reverseTilePairs(index) {
    const tile = normalizeTile(state.tiles[index]);
    if (tile.length < 2) return;
    const next = tile.slice().reverse();
    if (tilesEqual(tile, next)) return;
    clearStandardDualGraphInput();
    state.tiles[index] = cloneTile(next);
    state.edits += 1;
    updateReport(false);
  }

  function applyDrawTileAction(index, direction) {
    if (index < 0) return false;
    if (!tileExists(index)) return false;
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
    if (!tileExists(index)) return;
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
    clearStandardDualGraphInput();
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
    if (index < 0 || !tileExists(index) || isTileEmpty(tile)) return;
    if (tilesEqual(state.tiles[index], tile)) return;
    clearStandardDualGraphInput();
    state.tiles[index] = cloneTile(tile);
    delete state.vertexDecorations[index];
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
  }

  function deleteTile(index) {
    if (index < 0 || !tileExists(index) || isTileEmpty(state.tiles[index])) return;
    clearStandardDualGraphInput();
    state.tiles[index] = null;
    delete state.vertexDecorations[index];
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
  }

  function moveTile(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (!tileExists(fromIndex) || !tileExists(toIndex)) return;
    const tile = state.tiles[fromIndex];
    if (isTileEmpty(tile)) return;
    clearStandardDualGraphInput();
    const decoration = vertexDecorationValue(fromIndex);
    state.tiles[toIndex] = cloneTile(tile);
    state.tiles[fromIndex] = null;
    delete state.vertexDecorations[fromIndex];
    delete state.vertexDecorations[toIndex];
    if (decoration > 0 && isVertexTileValue(state.tiles[toIndex])) state.vertexDecorations[toIndex] = decoration;
    pruneHalfEdgeDecorations();
    state.edits += 1;
    updateReport(false);
  }

  function beginDrawGesture(event) {
    const point = clientPointToBoardPoint(event.clientX, event.clientY);
    const tileHit = tileHitTest(event.clientX, event.clientY, 1.02);

    if (!tileHit || !tileExists(tileHit.index)) {
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
      if (!tileHit || !tileExists(tileHit.index)) return;

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
        clearStandardDualGraphInput();
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
          clearStandardDualGraphInput();
          state.tiles[current.index] = cloneTile(state.tiles[current.index] || []);
        } else {
          clearStandardDualGraphInput();
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
    if (changed) {
      clearStandardDualGraphInput();
      state.edits += 1;
    }
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
    if (!hit || !tileExists(hit.index)) return false;
    return state.drawAction === 'edge' && isVertexTileValue(state.tiles[hit.index]);
  }

  function toggleVertexTileAtIndex(index) {
    if (!isDualGraph() || index < 0 || index >= state.tiles.length || !tileExists(index)) return false;
    const tile = state.tiles[index];
      if (isVertexTileValue(tile)) {
        clearStandardDualGraphInput();
        state.tiles[index] = null;
        delete state.vertexDecorations[index];
        pruneHalfEdgeDecorations();
      } else if (isTileEmpty(tile)) {
        // Creating a vertex on an empty tile - auto-connect to open ends
        clearStandardDualGraphInput();
        const openEnds = findOpenEndsPointingToTile(index);
        state.tiles[index] = vertexTileFromDirs(openEnds);
        delete state.vertexDecorations[index];
        pruneHalfEdgeDecorations();
      } else {
        clearStandardDualGraphInput();
        state.tiles[index] = vertexTileFromDirs(maskToDirs(tileToMask(tile)));
        delete state.vertexDecorations[index];
        pruneHalfEdgeDecorations();
      }
    state.edits += 1;
    updateReport(false);
    return true;
  }

  function findOpenEndsPointingToTile(targetIndex) {
    const lattice = getLattice();
    const cell = geometry.cells[targetIndex];
    if (!cell || !tileExists(targetIndex)) return [];

    const openDirs = [];

    // Check each direction from the target tile
    for (let dir = 0; dir < lattice.sides; dir++) {
      // Find the neighbor in this direction
      const neighborInfo = connectedNeighbor(cell.row, cell.col, dir, lattice);
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
      if (!tileExists(tileIndex)) return null;
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
      if (!tileExists(tileIndex)) return null;
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

  function isBackgroundBoundaryAction() {
    if (state.wanderSelectingStart) return false;
    return state.backgroundAction === 'boundary'
      || state.backgroundAction === 'glue-boundary'
      || state.backgroundAction === 'reverse-glue';
  }

  function isBackgroundGlueAction() {
    if (state.wanderSelectingStart) return false;
    return state.backgroundAction === 'glue-boundary';
  }

  function isBackgroundReverseGlueAction() {
    if (state.wanderSelectingStart) return false;
    return state.backgroundAction === 'reverse-glue';
  }

  function isBackgroundBilliardAction() {
    if (state.wanderSelectingStart) return false;
    return state.backgroundAction === 'billiard';
  }

  function isClosedBackgroundSurface(report = null) {
    if (!isGluedBoundaryMode()) return false;
    const background = report && report.background ? report.background : analyzeBackgroundSpace();
    return !!(background && background.closedSurface);
  }

  function shouldShowBackgroundCusps(report = null) {
    if (!state.showCusps || !isGluedBoundaryMode()) return false;
    const background = report && report.background ? report.background : analyzeBackgroundSpace();
    if (!background || background.existing <= 0) return false;
    return hasRealBlackBackgroundBoundaryEdges() || !!background.closedSurface;
  }

  function backgroundEdgeHitTest(clientX, clientY) {
    if (!isGluedBoundaryMode()) return null;
    const hit = isBackgroundGlueAction() || isBackgroundReverseGlueAction()
      ? boundaryEdgeHitTest(clientX, clientY)
      : sharedEdgeHitTest(clientX, clientY);
    if (!hit) return null;
    if (isBackgroundReverseGlueAction() && !gluedPairForBoundaryEdge({ index: hit.index, dir: hit.dir })) return null;
    return hit;
  }

  function sameBackgroundEdgeHit(left, right) {
    if (!left || !right) return left === right;
    if (left.nextIndex == null || right.nextIndex == null) return boundaryEdgeKey(left) === boundaryEdgeKey(right);
    return cutEdgeKey(left.index, left.nextIndex) === cutEdgeKey(right.index, right.nextIndex);
  }

  function sameBackgroundCuspHit(left, right) {
    if (!left || !right) return left === right;
    return left.id === right.id;
  }

  function handlePointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (state.wanderSelectingStart) {
      handleWanderStartPointerDown(event);
      event.preventDefault();
      return;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (state.wrapped && activePointers.size >= 2) {
      clearLongPressTimer();
      pointerState = null;
      startPinch();
      refs.canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (state.inputMode === 'background') {
      beginBackgroundGesture(event);
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
      const hit = decorationHitFromPoint(event.clientX, event.clientY);
      pointerState = {
        id: event.pointerId,
        index: hit && hit.type === 'vertex' ? hit.index : -1,
        decorationHit: hit,
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
    const existingTile = hit >= 0 && tileExists(hit) ? state.tiles[hit] : null;
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

    if (state.inputMode === 'background') {
      updateBackgroundGesture(event);
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
    if (state.inputMode === 'background') {
      finishBackgroundGesture(event);
      clearPointerState(event);
      return;
    }
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
        const hit = decorationHitFromPoint(event.clientX, event.clientY);
        if (sameDecorationHit(hit, pointerState.decorationHit)) scheduleDecorationClick(hit);
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
    if (!pointerState.moved && hit === pointerState.index && hit >= 0 && tileExists(hit) && !longPressFired) {
      if (!isTileEmpty(state.tiles[hit])) editExistingTile(hit, 1);
      else if (!isTileEmpty(state.selectedTile)) placeTile(hit, state.selectedTile);
    }
    clearEditorDrag();
    clearPointerState(event);
  }

  function beginBackgroundGesture(event) {
    const isBilliard = isBackgroundBilliardAction();
    const cusp = isBilliard ? null : backgroundCuspHitTest(event.clientX, event.clientY);
    const edge = !isBilliard && isBackgroundBoundaryAction()
      ? backgroundEdgeHitTest(event.clientX, event.clientY)
      : null;
    const hit = isBilliard
      ? backgroundTileHitIndex(event.clientX, event.clientY)
      : (isBackgroundBoundaryAction()
      ? -1
      : hitTest(event.clientX, event.clientY, { includeRemoved: true }));
    pointerState = {
      id: event.pointerId,
      index: hit,
      backgroundEdge: edge,
      backgroundCusp: cusp,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false
    };
    clearDrawDebugHit(false);
    if (isBilliard) updateBackgroundBilliardAim(event.clientX, event.clientY, false);
    const edgeChanged = !sameBackgroundEdgeHit(edge, state.backgroundHoverEdge);
    const cuspChanged = !sameBackgroundCuspHit(cusp, state.backgroundHoverCusp);
    if (hit !== state.hoverIndex || edgeChanged || cuspChanged) {
      state.hoverIndex = hit;
      state.backgroundHoverEdge = edge;
      state.backgroundHoverCusp = cusp;
      syncMainCanvasCursor();
      draw(analyze());
    }
    refs.canvas.setPointerCapture(event.pointerId);
  }

  function updateBackgroundGesture(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    const dx = event.clientX - pointerState.x;
    const dy = event.clientY - pointerState.y;
    if (Math.hypot(dx, dy) > 10) pointerState.moved = true;
    const isBilliard = isBackgroundBilliardAction();
    const cusp = isBilliard ? null : backgroundCuspHitTest(event.clientX, event.clientY);
    const edge = !isBilliard && isBackgroundBoundaryAction()
      ? backgroundEdgeHitTest(event.clientX, event.clientY)
      : null;
    const hit = isBilliard
      ? backgroundTileHitIndex(event.clientX, event.clientY)
      : (isBackgroundBoundaryAction()
      ? -1
      : hitTest(event.clientX, event.clientY, { includeRemoved: true }));
    const aimChanged = isBilliard ? updateBackgroundBilliardAim(event.clientX, event.clientY, false) : false;
    const edgeChanged = !sameBackgroundEdgeHit(edge, state.backgroundHoverEdge);
    const cuspChanged = !sameBackgroundCuspHit(cusp, state.backgroundHoverCusp);
    if (hit !== state.hoverIndex || edgeChanged || cuspChanged || aimChanged) {
      state.hoverIndex = hit;
      state.backgroundHoverEdge = edge;
      state.backgroundHoverCusp = cusp;
      syncMainCanvasCursor();
      draw(analyze());
    }
  }

  function finishBackgroundGesture(event) {
    if (!pointerState || event.pointerId !== pointerState.id) return;
    if (isBackgroundBilliardAction()) {
      if (!pointerState.moved && isOverCanvas(event.clientX, event.clientY)) {
        handleBackgroundBilliardClick(event.clientX, event.clientY);
      }
      return;
    }
    const cusp = isOverCanvas(event.clientX, event.clientY)
      ? backgroundCuspHitTest(event.clientX, event.clientY)
      : null;
    const edge = isOverCanvas(event.clientX, event.clientY) && isBackgroundBoundaryAction()
      ? backgroundEdgeHitTest(event.clientX, event.clientY)
      : null;
    const hit = isOverCanvas(event.clientX, event.clientY) && !isBackgroundBoundaryAction()
      ? hitTest(event.clientX, event.clientY, { includeRemoved: true })
      : -1;
    if (!pointerState.moved && cusp && sameBackgroundCuspHit(cusp, pointerState.backgroundCusp)) {
      selectBackgroundCusp(cusp);
    } else if (!pointerState.moved && isBackgroundBoundaryAction() && sameBackgroundEdgeHit(edge, pointerState.backgroundEdge)) {
      if (isBackgroundReverseGlueAction()) {
        reverseGluedBoundaryGroupAt(edge);
      } else if (isBackgroundGlueAction()) {
        if (state.backgroundMultiEdges) toggleGlueBoundaryMulti(edge);
        else toggleGlueBoundary(edge);
      }
      else toggleBackgroundBoundary(edge);
    } else if (!pointerState.moved && hit === pointerState.index && hit >= 0) {
      toggleBackgroundTile(hit);
    }
  }

  function clearPointerState(event) {
    clearLongPressTimer();
    if (event) activePointers.delete(event.pointerId);
    if (activePointers.size < 2) pinchState = null;
    if (event && pointerState && event.pointerId === pointerState.id && refs.canvas.releasePointerCapture) {
      try { refs.canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    pointerState = null;
    syncMainCanvasCursor();
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
    const active = state.tiles.reduce((count, tile, index) => count + (!tileExists(index) || isTileEmpty(tile) ? 0 : 1), 0);
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
      if (!tileExists(index)) continue;
      normalizeTile(state.tiles[index]).forEach((pair, pairIndex) => {
        const left = ensurePort(index, pair[0]);
        const right = ensurePort(index, pair[1]);
        arcPortIds[index][pairIndex] = left;
        connectPorts(left, right);
      });
    }

    portMeta.forEach((port, id) => {
      const next = connectedSurfaceNeighbor(port.index, port.dir, lattice);
      if (!next) {
        openEnds += 1;
        return;
      }
      const nextId = portIds.get(portKey(next.index, next.dir));
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
      background: analyzeBackgroundSpace(),
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
    const active = state.tiles.reduce((count, tile, index) => count + (!tileExists(index) || isTileEmpty(tile) ? 0 : 1), 0);
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
      if (!tileExists(index) || isTileEmpty(state.tiles[index])) continue;
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
      const next = connectedSurfaceNeighbor(port.index, port.dir, lattice);
      if (!next) {
        openEnds += 1;
        return;
      }
      const nextId = portIds.get(`p:${next.index}:${next.dir}`);
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
      background: analyzeBackgroundSpace(),
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

  function analyzeBackgroundSpace() {
    const total = state.rows * state.cols;
    const lattice = getLattice();
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    let existing = 0;
    let removed = 0;
    let unmatchedBoundaries = 0;

    for (let index = 0; index < total; index += 1) {
      if (!tileExists(index)) {
        removed += 1;
        continue;
      }
      existing += 1;
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (!next) {
          const partner = gluedBoundaryPartner(index, dir);
          if (partner && tileExists(partner.index)) {
            union(parent, rank, index, partner.index);
            continue;
          }
          unmatchedBoundaries += 1;
          continue;
        }
        const nextIndex = indexOf(next.row, next.col, state.cols);
        if (!tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex)) {
          const partner = gluedBoundaryPartner(index, dir);
          if (partner && tileExists(partner.index)) {
            union(parent, rank, index, partner.index);
            continue;
          }
          unmatchedBoundaries += 1;
          continue;
        }
        if (index < nextIndex) union(parent, rank, index, nextIndex);
      }
    }

    const componentRoots = new Set();
    for (let index = 0; index < total; index += 1) {
      if (tileExists(index)) componentRoots.add(find(parent, index));
    }

    const boundaryComponents = countBackgroundBoundaryComponents();
    const backgroundBase = {
      total,
      existing,
      unmatchedBoundaries,
      boundaryComponents,
      components: componentRoots.size
    };
    const surface = analyzeBackgroundSurface(backgroundBase);

    return {
      total,
      existing,
      removed,
      cutEdges: cloneCutEdgeSet().size,
      gluedEdges: cloneGluedEdges().length,
      unmatchedBoundaries,
      boundaryComponents,
      components: componentRoots.size,
      closedSurface: surface.closedSurface,
      genus: surface.genus,
      nonorientableGenus: surface.nonorientableGenus,
      orientable: surface.orientable,
      surfaceType: surface.surfaceType,
      surfaceTypeHtml: surface.surfaceTypeHtml,
      surfaceTypeTooltip: surface.surfaceTypeTooltip,
      cusps: surface.cusps,
      eulerCharacteristic: surface.eulerCharacteristic
    };
  }

  function countBackgroundBoundaryComponents() {
    const lattice = getLattice();
    const boundaryEdges = [];
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const edge = { index, dir };
        if (isUngluedBackgroundBoundaryEdge(edge)) boundaryEdges.push(edge);
      }
    }
    const unvisited = new Set(boundaryEdges.map(boundaryEdgeKey));
    const maxSteps = Math.max(1, state.rows * state.cols * lattice.sides + cloneGluedEdges().length * 2);
    let components = 0;
    boundaryEdges.forEach((start) => {
      const startKey = boundaryEdgeKey(start);
      if (!unvisited.has(startKey)) return;
      components += 1;
      let current = cloneBoundaryEdge(start);
      const localVisited = new Set();
      for (let guard = 0; current && guard < maxSteps; guard += 1) {
        const currentKey = boundaryEdgeKey(current);
        if (!currentKey || localVisited.has(currentKey)) break;
        localVisited.add(currentKey);
        unvisited.delete(currentKey);
        const next = nextBackgroundBoundaryComponentEdge(current);
        if (!next) break;
        const nextKey = boundaryEdgeKey(next);
        if (nextKey === startKey) {
          unvisited.delete(nextKey);
          break;
        }
        if (!unvisited.has(nextKey)) break;
        current = next;
      }
    });
    return components;
  }

  function countUngluedBackgroundBoundaryEdges() {
    const lattice = getLattice();
    let count = 0;
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        if (isUngluedBackgroundBoundaryEdge({ index, dir })) count += 1;
      }
    }
    return count;
  }

  function computeBackgroundOrientability() {
    const result = {
      edits: state.edits,
      computed: true,
      orientable: true,
      componentColors: new Map()
    };
    const total = state.rows * state.cols;
    const parent = Array.from({ length: total }, (_, index) => index);
    const rank = Array(total).fill(0);
    const parity = Array(total).fill(0);
    const lattice = getLattice();

    for (let index = 0; index < total; index += 1) {
      if (!tileExists(index)) continue;
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, false);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, state.cols);
        if (index >= nextIndex || !tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex)) continue;
        if (!unionParity(parent, rank, parity, index, nextIndex, 0)) result.orientable = false;
      }
    }

    cloneGluedEdges().forEach((pair) => {
      if (!isValidBoundaryEdge(pair.first) || !isValidBoundaryEdge(pair.second)) return;
      if (!tileExists(pair.first.index) || !tileExists(pair.second.index)) return;
      const requiredDifference = pair.reversed ? 1 : 0;
      if (!unionParity(parent, rank, parity, pair.first.index, pair.second.index, requiredDifference)) {
        result.orientable = false;
      }
    });

    const roots = new Map();
    for (let index = 0; index < total; index += 1) {
      if (!tileExists(index)) continue;
      const info = findParity(parent, parity, index);
      if (!roots.has(info.root)) roots.set(info.root, { root: info.root, color: info.value });
    }
    result.componentColors = roots;
    return result;
  }

  function nextBackgroundBoundaryComponentEdge(edge) {
    const lattice = getLattice();
    let current = cloneBoundaryEdge(edge);
    const maxSteps = Math.max(1, state.rows * state.cols * lattice.sides + cloneGluedEdges().length * 2);
    for (let guard = 0; current && guard < maxSteps; guard += 1) {
      const nextEdge = {
        index: current.index,
        dir: normalizeDir(current.dir + 1, lattice.sides)
      };
      if (isUngluedBackgroundBoundaryEdge(nextEdge)) return nextEdge;
      current = backgroundBoundaryEdgeTransition(nextEdge);
    }
    return null;
  }

  function previousBackgroundBoundaryComponentEdge(edge) {
    const lattice = getLattice();
    let current = cloneBoundaryEdge(edge);
    const maxSteps = Math.max(1, state.rows * state.cols * lattice.sides + cloneGluedEdges().length * 2);
    for (let guard = 0; current && guard < maxSteps; guard += 1) {
      const previousEdge = {
        index: current.index,
        dir: normalizeDir(current.dir - 1, lattice.sides)
      };
      if (isUngluedBackgroundBoundaryEdge(previousEdge)) return previousEdge;
      current = backgroundBoundaryEdgeTransition(previousEdge);
    }
    return null;
  }

  function isUngluedBackgroundBoundaryEdge(edge) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized || !isValidBoundaryEdge(normalized)) return false;
    const partner = gluedBoundaryPartner(normalized.index, normalized.dir);
    return !(partner && tileExists(partner.index) && isValidBoundaryEdge(partner));
  }

  function backgroundBoundaryEdgeTransition(edge) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized || !tileExists(normalized.index)) return null;
    const gluedPartner = gluedBoundaryPartner(normalized.index, normalized.dir);
    if (gluedPartner && tileExists(gluedPartner.index) && isValidBoundaryEdge(gluedPartner)) {
      return cloneBoundaryEdge(gluedPartner);
    }
    const lattice = getLattice();
    const row = Math.floor(normalized.index / state.cols);
    const col = normalized.index % state.cols;
    const next = neighbor(row, col, normalized.dir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    if (!tileExists(nextIndex) || hasCutEdgeBetween(normalized.index, nextIndex)) return null;
    return {
      index: nextIndex,
      dir: lattice.opposite[normalized.dir]
    };
  }

  function analyzeBackgroundSurface(background) {
    const connectedSurface = !!(
      background
      && isGluedBoundaryMode()
      && background.existing > 0
      && background.components === 1
    );
    const closedSurface = !!(connectedSurface && background.unmatchedBoundaries === 0);
    if (!connectedSurface) {
      return {
        closedSurface: false,
        genus: null,
        nonorientableGenus: null,
        orientable: null,
        surfaceType: '',
        surfaceTypeHtml: '-',
        surfaceTypeTooltip: '',
        cusps: null,
        eulerCharacteristic: null,
        quotientVertices: [],
        cuspVertices: []
      };
    }

    const quotient = computeBackgroundQuotientVertices();
    const faces = background.existing;
    const edges = countBackgroundSurfaceEdges(background);
    const vertices = quotient.vertices.length;
    const cuspVertices = computeBackgroundSurfaceCuspVertices(quotient.vertices);
    const eulerCharacteristic = vertices - edges + faces;
    const orientability = backgroundOrientabilityForClassification();
    const orientable = orientability ? !!orientability.orientable : true;
    const boundaryComponents = Math.max(0, Number(background.boundaryComponents) || 0);
    const genusValue = orientable
      ? (2 - boundaryComponents - eulerCharacteristic) / 2
      : null;
    const nonorientableGenusValue = orientable
      ? null
      : (2 - boundaryComponents - eulerCharacteristic);
    const genus = numericTopologyInvariant(genusValue);
    const nonorientableGenus = numericTopologyInvariant(nonorientableGenusValue);
    const classification = formatBackgroundSurfaceClassification({
      orientable,
      genus,
      nonorientableGenus,
      boundaryComponents,
      cusps: cuspVertices.length,
      closedSurface,
      eulerCharacteristic
    });

    return {
      closedSurface,
      genus,
      nonorientableGenus,
      orientable,
      surfaceType: classification.plain,
      surfaceTypeHtml: classification.html,
      surfaceTypeTooltip: classification.tooltip,
      cusps: cuspVertices.length,
      eulerCharacteristic,
      quotientVertices: quotient.vertices,
      cuspVertices
    };
  }

  function analyzeClosedBackgroundSurface(background) {
    const surface = analyzeBackgroundSurface(background);
    if (!surface.closedSurface) {
      return {
        closedSurface: false,
        genus: null,
        nonorientableGenus: null,
        orientable: surface.orientable,
        surfaceType: '',
        surfaceTypeHtml: '-',
        surfaceTypeTooltip: '',
        cusps: null,
        eulerCharacteristic: null,
        quotientVertices: [],
        cuspVertices: []
      };
    }
    return surface;
  }

  function countBackgroundSurfaceEdges(background = null) {
    const lattice = getLattice();
    let internalEdges = 0;
    let gluedEdges = 0;
    let boundaryEdges = 0;
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, state.cols);
        if (index < nextIndex && tileExists(nextIndex) && !hasCutEdgeBetween(index, nextIndex)) {
          internalEdges += 1;
        }
      }
    }
    cloneGluedEdges().forEach((pair) => {
      if (isValidBoundaryEdge(pair.first) && isValidBoundaryEdge(pair.second)) gluedEdges += 1;
    });
    if (background && background.unmatchedBoundaries > 0) {
      boundaryEdges = countUngluedBackgroundBoundaryEdges();
    }
    return internalEdges + gluedEdges + boundaryEdges;
  }

  function computeBackgroundSurfaceCuspVertices(vertices = null) {
    if (!hasRealBlackBackgroundBoundaryEdges()) {
      return backgroundCuspVerticesFromQuotient(vertices || computeBackgroundQuotientVertices().vertices);
    }
    return computeDisplayedBackgroundCuspVertices()
      .filter(isBackgroundConeCusp)
      .sort(compareBackgroundCusps);
  }

  function backgroundOrientabilityForClassification() {
    const cached = state.backgroundOrientability;
    if (cached && cached.edits === state.edits && cached.computed) return cached;
    return computeBackgroundOrientability();
  }

  function numericTopologyInvariant(value) {
    if (!Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    return Math.abs(value - rounded) < 1e-6 ? rounded : Number(value.toFixed(3));
  }

  function formatBackgroundSurfaceClassification(surface) {
    const orientable = !!(surface && surface.orientable);
    const boundaryComponents = Math.max(0, Number(surface && surface.boundaryComponents) || 0);
    const cusps = Math.max(0, Number(surface && surface.cusps) || 0);
    const genus = surface ? surface.genus : null;
    const nonorientableGenus = surface ? surface.nonorientableGenus : null;
    const compact = orientable
      ? formatOrientableSurfaceSymbol(genus, boundaryComponents, cusps)
      : formatNonorientableSurfaceSymbol(nonorientableGenus, boundaryComponents, cusps);
    const tooltip = orientable
      ? formatOrientableSurfaceTooltip(genus, boundaryComponents, cusps)
      : formatNonorientableSurfaceTooltip(nonorientableGenus, boundaryComponents, cusps);
    return {
      plain: compact.plain,
      html: `<span class="tooltip-label" tabindex="0" data-tooltip="${escapeHtmlAttribute(tooltip)}">${compact.html}</span>`,
      tooltip
    };
  }

  function formatOrientableSurfaceSymbol(genus, boundaryComponents, cusps) {
    const g = formatTopologyNumber(genus);
    const b = formatTopologyNumber(boundaryComponents);
    if (boundaryComponents === 0) {
      const cuspSuffix = cusps > 0 ? `,${formatTopologyNumber(cusps)}` : '';
      return {
        plain: `M_${g}${cuspSuffix}`,
        html: `&#x1D4DC;<sub>${g}${cuspSuffix}</sub>`
      };
    }
    const cuspPlain = cusps > 0 ? `^${formatTopologyNumber(cusps)}` : '';
    const cuspHtml = cusps > 0 ? `<sup>${formatTopologyNumber(cusps)}</sup>` : '';
    return {
      plain: `Sigma_${g},${b}${cuspPlain}`,
      html: `&Sigma;<sub>${g},${b}</sub>${cuspHtml}`
    };
  }

  function formatNonorientableSurfaceSymbol(nonorientableGenus, boundaryComponents, cusps) {
    const h = formatTopologyNumber(nonorientableGenus);
    const b = formatTopologyNumber(boundaryComponents);
    const cuspPlain = cusps > 0 ? `^${formatTopologyNumber(cusps)}` : '';
    const cuspHtml = cusps > 0 ? `<sup>${formatTopologyNumber(cusps)}</sup>` : '';
    return {
      plain: `N_${h},${b}${cuspPlain}`,
      html: `N<sub>${h},${b}</sub>${cuspHtml}`
    };
  }

  function formatOrientableSurfaceTooltip(genus, boundaryComponents, cusps) {
    const base = Number(genus) === 0 ? 'S^2' : `T_${formatTopologyNumber(genus)}`;
    const holesText = boundaryComponents === 0
      ? 'no holes'
      : `${boundaryComponents} hole${boundaryComponents === 1 ? '' : 's'}`;
    const cuspText = `${cusps} cusp${cusps === 1 ? '' : 's'}`;
    return `${base} with ${holesText}, ${cuspText}`;
  }

  function formatNonorientableSurfaceTooltip(nonorientableGenus, boundaryComponents, cusps) {
    const holesText = boundaryComponents === 0
      ? 'no holes'
      : `${boundaryComponents} hole${boundaryComponents === 1 ? '' : 's'}`;
    const cuspText = `${cusps} cusp${cusps === 1 ? '' : 's'}`;
    return `P_${formatTopologyNumber(nonorientableGenus)} with ${holesText}, ${cuspText}`;
  }

  function formatTopologyNumber(value) {
    if (value == null) return '?';
    return Number.isFinite(Number(value)) ? String(value) : '?';
  }

  function formatBackgroundGenusEulerPair(background) {
    if (!background || background.eulerCharacteristic == null) return '-';
    const genusValue = background.orientable === false
      ? background.nonorientableGenus
      : background.genus;
    return `(${formatTopologyNumber(genusValue)}, ${formatTopologyNumber(background.eulerCharacteristic)})`;
  }

  function escapeHtmlAttribute(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function computeBackgroundQuotientVertices() {
    const lattice = getLattice();
    const cornerCount = state.rows * state.cols * lattice.sides;
    const parent = Array.from({ length: cornerCount }, (_, index) => index);
    const rank = Array(cornerCount).fill(0);
    const cornerId = (index, vertex) => (index * lattice.sides) + modulo(vertex, lattice.sides);

    const unionSurfaceEdgeCorners = (left, right, reversed = false) => {
      if (!left || !right) return;
      union(parent, rank, cornerId(left.index, left.start), cornerId(right.index, reversed ? right.start : right.end));
      union(parent, rank, cornerId(left.index, left.end), cornerId(right.index, reversed ? right.end : right.start));
    };

    const logicalVertexIds = new Map();
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let vertex = 0; vertex < lattice.sides; vertex += 1) {
        const key = tileCornerLogicalVertexKey(index, vertex);
        if (logicalVertexIds.has(key)) union(parent, rank, cornerId(index, vertex), logicalVertexIds.get(key));
        else logicalVertexIds.set(key, cornerId(index, vertex));
      }
      const row = Math.floor(index / state.cols);
      const col = index % state.cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, state.cols);
        if (index >= nextIndex || !tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex)) continue;
        unionSurfaceEdgeCorners(
          orientedBoundaryEdgeCorners(index, dir),
          orientedBoundaryEdgeCorners(nextIndex, lattice.opposite[dir])
        );
      }
    }

    cloneGluedEdges().forEach((pair) => {
      const first = cloneBoundaryEdge(pair.first);
      const second = cloneBoundaryEdge(pair.second);
      if (!isValidBoundaryEdge(first) || !isValidBoundaryEdge(second)) return;
      unionSurfaceEdgeCorners(
        orientedBoundaryEdgeCorners(first.index, first.dir),
        orientedBoundaryEdgeCorners(second.index, second.dir),
        !!pair.reversed
      );
    });

    const roots = new Map();
    const cornerAngle = tileCornerAngle();
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let vertex = 0; vertex < lattice.sides; vertex += 1) {
        const root = find(parent, cornerId(index, vertex));
        if (!roots.has(root)) {
          roots.set(root, {
            id: '',
            angleRadians: 0,
            corners: []
          });
        }
        const cell = geometry && geometry.cells ? geometry.cells[index] : null;
        const point = cell ? tileCornerPoint(index, vertex) : null;
        roots.get(root).angleRadians += cornerAngle;
        roots.get(root).corners.push({
          index,
          row: Math.floor(index / state.cols),
          col: index % state.cols,
          vertex,
          point
        });
      }
    }

    const vertices = Array.from(roots.values()).map((entry) => {
      const key = backgroundCuspKey(entry);
      return {
        ...entry,
        id: key,
        representative: entry.corners[0] || null,
        angleDegrees: entry.angleRadians * 180 / Math.PI
      };
    }).sort(compareBackgroundCusps);
    vertices.forEach((entry, index) => {
      entry.label = `V${index + 1}`;
    });
    return { vertices };
  }

  function computeBackgroundCuspVertices() {
    return backgroundCuspVerticesFromQuotient(computeBackgroundQuotientVertices().vertices);
  }

  function computeBackgroundMarkedBoundaryVertices() {
    const gluedKeys = gluedBoundaryLogicalVertexKeySet();
    if (!gluedKeys.size) return computeBackgroundCuspVertices();
    const vertices = computeBackgroundQuotientVertices().vertices
      .filter((entry) => (
        isBackgroundConeCusp(entry)
        || (entry.corners || []).some((corner) => gluedKeys.has(tileCornerLogicalVertexKey(corner.index, corner.vertex)))
      ))
      .sort(compareBackgroundCusps);
    let cuspIndex = 0;
    let vertexIndex = 0;
    vertices.forEach((entry) => {
      if (isBackgroundConeCusp(entry)) {
        cuspIndex += 1;
        entry.label = `C${cuspIndex}`;
      } else {
        vertexIndex += 1;
        entry.label = `B${vertexIndex}`;
      }
    });
    return vertices;
  }

  function computeDisplayedBackgroundCuspVertices() {
    if (!hasRealBlackBackgroundBoundaryEdges()) return computeBackgroundMarkedBoundaryVertices();
    const blackBoundaryKeys = realBlackBoundaryLogicalVertexKeySet();
    const displayed = computeBackgroundMarkedBoundaryVertices()
      .filter((entry) => !(entry.corners || []).some((corner) => (
        blackBoundaryKeys.has(tileCornerLogicalVertexKey(corner.index, corner.vertex))
      )))
      .sort(compareBackgroundCusps);
    labelBackgroundDisplayedVertices(displayed);
    return displayed;
  }

  function labelBackgroundDisplayedVertices(vertices) {
    let cuspIndex = 0;
    let vertexIndex = 0;
    vertices.forEach((entry) => {
      if (isBackgroundConeCusp(entry)) {
        cuspIndex += 1;
        entry.label = `C${cuspIndex}`;
      } else {
        vertexIndex += 1;
        entry.label = `B${vertexIndex}`;
      }
    });
  }

  function backgroundCuspVerticesFromQuotient(vertices) {
    const cusps = (vertices || [])
      .filter(isBackgroundConeCusp)
      .sort(compareBackgroundCusps);
    cusps.forEach((entry, index) => {
      entry.label = `C${index + 1}`;
    });
    return cusps;
  }

  function gluedBoundaryLogicalVertexKeySet() {
    const keys = new Set();
    cloneGluedEdges().forEach((pair) => {
      [pair.first, pair.second].forEach((edge) => {
        boundaryEdgeLogicalVertexKeys(edge).forEach((key) => {
          if (key) keys.add(key);
        });
      });
    });
    return keys;
  }

  function hasRealBlackBackgroundBoundaryEdges() {
    const lattice = getLattice();
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        if (isRealBlackBackgroundBoundaryEdge({ index, dir })) return true;
      }
    }
    return false;
  }

  function realBlackBoundaryLogicalVertexKeySet() {
    const keys = new Set();
    const lattice = getLattice();
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const edge = { index, dir };
        if (!isRealBlackBackgroundBoundaryEdge(edge)) continue;
        boundaryEdgeLogicalVertexKeys(edge).forEach((key) => {
          if (key) keys.add(key);
        });
      }
    }
    return keys;
  }

  function isRealBlackBackgroundBoundaryEdge(edge) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized) return false;
    return isBackgroundBoundaryEdge(normalized.index, normalized.dir)
      && !isGluedBoundaryEdge(normalized.index, normalized.dir);
  }

  function isBackgroundConeCusp(vertex) {
    const angle = Number(vertex && vertex.angleRadians);
    return Number.isFinite(angle) && Math.abs(angle - (Math.PI * 2)) > 1e-6;
  }

  function compareBackgroundCusps(left, right) {
    const a = left.representative || {};
    const b = right.representative || {};
    return (a.index - b.index) || (a.vertex - b.vertex) || String(left.id).localeCompare(String(right.id));
  }

  function backgroundCuspKey(cusp) {
    return (cusp.corners || [])
      .map((corner) => `${corner.index}:${corner.vertex}`)
      .sort()
      .join('|');
  }

  function boundaryEdgeLogicalVertexKeys(edge) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized || !isValidBoundaryEdge(normalized)) return [];
    const corners = orientedBoundaryEdgeCorners(normalized.index, normalized.dir);
    return [
      tileCornerLogicalVertexKey(corners.index, corners.start),
      tileCornerLogicalVertexKey(corners.index, corners.end)
    ];
  }

  function tileCornerLogicalVertexKey(index, vertex) {
    const lattice = getLattice();
    const normalizedVertex = modulo(vertex, lattice.sides);
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    if (lattice.shape === 'square') {
      const offsets = [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ];
      const offset = offsets[normalizedVertex] || [0, 0];
      return `s:${row + offset[0]}:${col + offset[1]}`;
    }
    const axial = offsetToAxial(row, col);
    const vertexOffsets = [
      [1, 1],
      [0, 2],
      [-1, 1],
      [-1, -1],
      [0, -2],
      [1, -1]
    ];
    const offset = vertexOffsets[normalizedVertex] || [0, 0];
    return `h:${(2 * axial.q) + axial.r + offset[0]}:${(3 * axial.r) + offset[1]}`;
  }

  function orientedBoundaryEdgeCorners(index, dir) {
    const lattice = getLattice();
    if (lattice.shape === 'square') {
      return {
        index,
        start: modulo(dir + 1, lattice.sides),
        end: modulo(dir + 2, lattice.sides)
      };
    }
    return {
      index,
      start: modulo(dir - 1, lattice.sides),
      end: modulo(dir, lattice.sides)
    };
  }

  function tileCornerAngle() {
    const lattice = getLattice();
    return lattice.shape === 'square' ? Math.PI / 2 : (2 * Math.PI / 3);
  }

  function tileCornerPoint(index, vertex) {
    if (!geometry || !geometry.cells || !geometry.cells[index]) return null;
    const cell = geometry.cells[index];
    const points = tilePoints(cell.x, cell.y, geometry.radius * 0.96);
    return points[modulo(vertex, getLattice().sides)] || null;
  }

  function tileCenterPoint(index) {
    if (!geometry || !geometry.cells || !geometry.cells[index]) return null;
    const cell = geometry.cells[index];
    return { x: cell.x, y: cell.y };
  }

  function updateReport(manualCheck) {
    pruneVertexDecorations();
    validateWanderBoardState();
    const report = analyze();
    if (isDualGraph()) pruneHalfEdgeDecorations();
    normalizePickedComponent(report);
    updateStatisticsChart(report);

    refs.statusBadge.textContent = report.label;
    refs.statusBadge.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusBadge.classList.toggle('mosaic-status-bad', report.openEnds > 0);
    refs.statusLine.textContent = manualCheck ? `checked: ${report.message}` : report.message;
    refs.statusLine.classList.toggle('mosaic-status-good', report.label === 'closed');
    refs.statusLine.classList.toggle('mosaic-status-bad', report.openEnds > 0);

    refs.infoLine.textContent = `${getLattice().label}, ${isDualGraph() ? 'dual graph' : 'knot/link'}, ${boundaryModeLabel()} / ${report.active} filled`;
    syncBackgroundModeControls();
    if (isGluedBoundaryMode() && state.inputMode === 'background') {
      const background = report.background || analyzeBackgroundSpace();
      if (!shouldShowBackgroundCusps(report)) {
        state.selectedBackgroundCusp = null;
        state.backgroundHoverCusp = null;
      }
      refs.statusBadge.textContent = 'background';
      refs.statusBadge.classList.remove('mosaic-status-good', 'mosaic-status-bad');
      const glueText = background.gluedEdges > 0
        ? `, ${background.gluedEdges} glued pair${background.gluedEdges === 1 ? '' : 's'}`
        : '';
      const surfaceText = background.surfaceType
        ? `, ${background.surfaceType}, χ=${formatTopologyNumber(background.eulerCharacteristic)}, ${background.cusps} cusp${background.cusps === 1 ? '' : 's'}`
        : '';
    const pendingGlueText = pendingGlueStatusText();
      refs.statusLine.textContent = pendingGlueText || backgroundBilliardStatusText() || selectedBackgroundCuspStatusText(background) || `${background.existing} existing tile${background.existing === 1 ? '' : 's'}, ${background.components} component${background.components === 1 ? '' : 's'}, ${background.unmatchedBoundaries} unmatched boundar${background.unmatchedBoundaries === 1 ? 'y' : 'ies'}${glueText}${surfaceText}`;
      refs.statusLine.classList.remove('mosaic-status-good', 'mosaic-status-bad');
    }

    updatePickControls();
    updateDisplayControls();
    updateSeifertSurfaceChart(report);
    if (!isDualGraph()) updateKnotCard(report);
    else updateDualGraphCard(report);
    refreshExport();
    draw(report);
  }

  function updateStatisticsChart(report) {
    if (!refs.out || !refs.out.tiles) return;
    if (isGluedBoundaryMode() && state.inputMode === 'background') {
      const background = report.background || analyzeBackgroundSpace();
      if (refs.out.cardLabel) refs.out.cardLabel.textContent = 'Background Space Statistics';
      if (refs.out.tilesLabel) refs.out.tilesLabel.textContent = 'Existing tiles';
      if (refs.out.openEndsLabel) refs.out.openEndsLabel.textContent = 'Unmatched boundaries';
      if (refs.out.boundaryComponentsLabel) refs.out.boundaryComponentsLabel.textContent = 'Boundary components';
      if (refs.out.boundaryComponentsRow) refs.out.boundaryComponentsRow.hidden = false;
      if (refs.out.orientableLabel) refs.out.orientableLabel.textContent = 'Orientable';
      if (refs.out.orientableRow) refs.out.orientableRow.hidden = false;
      if (refs.out.componentsLabel) refs.out.componentsLabel.textContent = 'Components';
      if (refs.out.componentsRow) refs.out.componentsRow.hidden = false;
      const hasSurfaceClassification = background.components === 1 && background.existing > 0;
      if (refs.out.surfaceTypeRow) refs.out.surfaceTypeRow.hidden = !hasSurfaceClassification;
      if (refs.out.genusRow) refs.out.genusRow.hidden = !hasSurfaceClassification;
      if (refs.out.cuspsRow) refs.out.cuspsRow.hidden = !hasSurfaceClassification;
      refs.out.tiles.textContent = `${background.existing}/${background.total}`;
      refs.out.openEnds.textContent = String(background.unmatchedBoundaries);
      if (refs.out.boundaryComponents) refs.out.boundaryComponents.textContent = String(background.boundaryComponents);
      syncBackgroundOrientabilityStatistic(background);
      refs.out.components.textContent = String(background.components);
      if (refs.out.surfaceType) refs.out.surfaceType.innerHTML = hasSurfaceClassification ? (background.surfaceTypeHtml || '-') : '-';
      if (refs.out.genusLabel) refs.out.genusLabel.textContent = background.orientable === false ? '(h, χ)' : '(g, χ)';
      if (refs.out.genus) refs.out.genus.textContent = hasSurfaceClassification
        ? formatBackgroundGenusEulerPair(background)
        : '-';
      if (refs.out.cusps) refs.out.cusps.textContent = hasSurfaceClassification ? String(background.cusps) : '-';
      return;
    }

    if (refs.out.cardLabel) refs.out.cardLabel.textContent = 'Statistics';
    if (refs.out.tilesLabel) refs.out.tilesLabel.textContent = 'Filled tiles';
    if (refs.out.openEndsLabel) refs.out.openEndsLabel.textContent = 'Open ends';
    if (refs.out.boundaryComponentsRow) refs.out.boundaryComponentsRow.hidden = true;
    if (refs.out.orientableRow) refs.out.orientableRow.hidden = true;
    if (refs.out.componentsLabel) refs.out.componentsLabel.textContent = 'Components';
    if (refs.out.componentsRow) refs.out.componentsRow.hidden = false;
    if (refs.out.surfaceTypeRow) refs.out.surfaceTypeRow.hidden = true;
    if (refs.out.genusRow) refs.out.genusRow.hidden = true;
    if (refs.out.cuspsRow) refs.out.cuspsRow.hidden = true;
    refs.out.tiles.textContent = `${report.active}/${report.total}`;
    refs.out.openEnds.textContent = String(report.openEnds);
    refs.out.components.textContent = String(report.components);
  }

  function syncBackgroundOrientabilityStatistic(background = null) {
    if (!refs.out || !refs.out.orientable) return;
    if (background && background.orientable != null) {
      refs.out.orientable.textContent = background.orientable ? 'yes' : 'no';
      refs.out.orientable.classList.toggle('mosaic-status-good', !!background.orientable);
      refs.out.orientable.classList.toggle('mosaic-status-bad', !background.orientable);
    } else {
      refs.out.orientable.textContent = '-';
      refs.out.orientable.classList.remove('mosaic-status-good', 'mosaic-status-bad');
    }
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
    if (refs.randomHalfEdgeLabels) refs.randomHalfEdgeLabels.disabled = !isDecorationMode();
    if (refs.clearDecorations) refs.clearDecorations.disabled = !isDecorationMode();
    if (refs.halfEdgeLabelStyle) refs.halfEdgeLabelStyle.disabled = !isDecorationMode();
    if (refs.clearVertexDecorations) refs.clearVertexDecorations.disabled = !isDecorationMode();
    if (refs.clearHalfEdgeDecorations) refs.clearHalfEdgeDecorations.disabled = !isDecorationMode();
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
    refs.inputMode.disabled = !!state.displayPickInputLocked || !!state.wanderSelectingStart;
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
      link.href = candidate.href || diagramInfoHrefFromName(candidate.name, candidate.kind || summary.kind);
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
    const dtOption = refs.knotCodeKind.querySelector('option[value="dt"]');
    const braidOption = refs.knotCodeKind.querySelector('option[value="braid"]');
    const hasDt = !!(summary && typeof summary.dt === 'string' && summary.dt.trim());
    const hasBraid = !!(summary && Array.isArray(summary.braid));
    if (dtOption) dtOption.disabled = !hasDt;
    if (braidOption) braidOption.disabled = !hasBraid;
    if (!hasDt && state.knotCodeKind === 'dt') {
      state.knotCodeKind = 'pd';
    }
    if (!hasBraid && state.knotCodeKind === 'braid') {
      state.knotCodeKind = 'pd';
    }
    refs.knotCodeKind.value = state.knotCodeKind;
  }

  function updateDualGraphCard(report) {
    if (!refs.dualGraphStatus || !refs.dualGraphCanvas) return;

    const graphData = collectDualGraphData(report);

    if (!graphData.isValid) {
      setDualGraphStatusContent(graphData.reason || 'Not available', false);
      if (refs.dualGraphInvariantsRow) refs.dualGraphInvariantsRow.hidden = true;
      if (refs.dualGraphInvariants) refs.dualGraphInvariants.innerHTML = '<span class="hint">-</span>';
      refs.dualGraphCanvasWrap.style.display = 'none';
      refs.dualGraphPlaceholder.style.display = 'block';
      state.dualGraphLayout = null;
      state.dualGraphData = null;
      state.dualGraphAnimating = false;
      state.dualGraphDragging = null;
      state.dualGraphLayoutTimings = {};
      clearDualGraphDegenerationChart();
      state.riemannSurfaceModel = null;
      state.selectedRiemannVertex = null;
      syncDualGraphCanvasVisibility();
      return;
    }

    setDualGraphStatusContent('', true);
    if (refs.dualGraphInvariantsRow) refs.dualGraphInvariantsRow.hidden = false;
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
      state.dualGraphLayoutTimings = {};
      clearDualGraphDegenerationChart();
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
      syncDualGraphLayoutControls();
    }

    state.dualGraphData = graphData;
    const degenerationSourceKey = dualGraphDegenerationSourceKey(graphData);
    if (state.dualGraphDegenerationSourceKey && state.dualGraphDegenerationSourceKey !== degenerationSourceKey) {
      clearDualGraphDegenerationChart();
    }
    syncDualGraphDegenerationControls(graphData);
    syncDualGraphCanvasVisibility();
    renderVisibleDualGraphVisualizations(graphData);
  }

  function setDualGraphStatusContent(text, showExport) {
    if (refs.dualGraphStatusText) {
      refs.dualGraphStatusText.textContent = showExport ? '' : (text || '-');
      refs.dualGraphStatusText.hidden = !!showExport;
    } else if (refs.dualGraphStatus) {
      refs.dualGraphStatus.textContent = showExport ? '' : (text || '-');
    }
    if (refs.exportDualGraph) refs.exportDualGraph.hidden = !showExport;
  }

  function syncDualGraphCanvasVisibility() {
    const hasLayoutView = state.showDualGraphCanvas || state.showRiemannSurfaceCanvas;
    if (refs.showDualGraphCanvas) refs.showDualGraphCanvas.checked = state.showDualGraphCanvas;
    if (refs.showRiemannSurfaceCanvas) refs.showRiemannSurfaceCanvas.checked = state.showRiemannSurfaceCanvas;
    if (refs.showAlgebraicCurveCanvas) refs.showAlgebraicCurveCanvas.checked = state.showAlgebraicCurveCanvas;
    if (refs.showAlgebraicTangentHandles) refs.showAlgebraicTangentHandles.checked = state.showAlgebraicTangentHandles;
    syncAlgebraicEnergyTermControls();
    syncDualGraphVisualizationButtons();
    if (refs.dualGraphViewWrap) refs.dualGraphViewWrap.hidden = !state.showDualGraphCanvas;
    if (refs.riemannSurfaceViewWrap) refs.riemannSurfaceViewWrap.hidden = !state.showRiemannSurfaceCanvas;
    if (refs.algebraicCurveViewWrap) refs.algebraicCurveViewWrap.hidden = !state.showAlgebraicCurveCanvas;
    if (refs.dualGraphLayoutControls) refs.dualGraphLayoutControls.hidden = !hasLayoutView;
    syncDualGraphLayoutControls();
    if (refs.optimizeAlgebraicCurve) refs.optimizeAlgebraicCurve.disabled = !state.showAlgebraicCurveCanvas || !state.dualGraphData;

    if (!hasLayoutView) {
      state.dualGraphAnimating = false;
      state.dualGraphDragging = null;
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
      syncDualGraphLayoutControls();
    }
    if (!state.showDualGraphCanvas && refs.dualGraphCanvas) refs.dualGraphCanvas.style.cursor = 'default';
    if (!state.showAlgebraicCurveCanvas && refs.algebraicCurveCanvas) refs.algebraicCurveCanvas.style.cursor = 'default';
    if (!state.showRiemannSurfaceCanvas) {
      state.riemannSurfaceModel = null;
      state.selectedRiemannVertex = null;
    }
    if (!state.showAlgebraicCurveCanvas) {
      stopAlgebraicCurveOptimization();
      state.algebraicCurveModel = null;
      state.algebraicCurveDragging = null;
      if (refs.algebraicCurveCanvas) refs.algebraicCurveCanvas.style.cursor = 'default';
    }

    if (refs.computeLayout) refs.computeLayout.disabled = !hasLayoutView || !state.dualGraphData;
    if (refs.resetLayout) refs.resetLayout.disabled = !hasLayoutView || !state.dualGraphData;
    syncAlgebraicOptimizationControls();
  }

  function toggleDualGraphVisualizationView(view) {
    if (view === 'dual') state.showDualGraphCanvas = !state.showDualGraphCanvas;
    if (view === 'rs') state.showRiemannSurfaceCanvas = !state.showRiemannSurfaceCanvas;
    if (view === 'algebraic') state.showAlgebraicCurveCanvas = !state.showAlgebraicCurveCanvas;
    syncDualGraphCanvasVisibility();
    if (state.dualGraphData) renderVisibleDualGraphVisualizations(state.dualGraphData);
  }

  function syncDualGraphVisualizationButtons() {
    if (!refs.dualGraphViewButtons) return;
    refs.dualGraphViewButtons.forEach((button) => {
      const view = button.dataset.dualGraphView;
      const active = (view === 'dual' && state.showDualGraphCanvas)
        || (view === 'rs' && state.showRiemannSurfaceCanvas)
        || (view === 'algebraic' && state.showAlgebraicCurveCanvas);
      button.classList.toggle('active', !!active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderVisibleDualGraphVisualizations(graphData) {
    if (state.showDualGraphCanvas) renderDualGraphVisualization(graphData);
    if (state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(graphData);
    if (state.showAlgebraicCurveCanvas) renderAlgebraicCurveVisualization(graphData);
  }

  function setDualGraphLayoutMethod(method) {
    const nextMethod = normalizeDualGraphLayoutMethod(method);
    if (nextMethod === state.dualGraphLayoutMethod) {
      syncDualGraphLayoutControls();
      return;
    }

    state.dualGraphLayoutMethod = nextMethod;
    state.dualGraphAnimating = false;
    state.dualGraphDragging = null;
    state.dualGraphLayout = null;
    syncDualGraphLayoutControls();
    if (state.dualGraphData && isDualGraphVisualizationVisible()) {
      runSelectedDualGraphLayout();
    }
  }

  function runSelectedDualGraphLayout() {
    if (!state.dualGraphData) return;

    if (state.dualGraphLayoutMethod === 'force') {
      ensureDualGraphLayout(state.dualGraphData);
      if (state.dualGraphAnimating) {
        state.dualGraphAnimating = false;
        if (state.dualGraphLayout && Number.isFinite(state.dualGraphLayout.startedAt)) {
          state.dualGraphLayoutTimings.force = layoutNow() - state.dualGraphLayout.startedAt;
          state.dualGraphLayout.startedAt = null;
        }
        syncDualGraphLayoutControls();
      } else {
        state.dualGraphAnimating = true;
        if (state.dualGraphLayout) state.dualGraphLayout.startedAt = layoutNow();
        syncDualGraphLayoutControls();
        animateDualGraphLayout();
      }
      return;
    }

    state.dualGraphAnimating = false;
    const size = dualGraphLayoutSize();
    const startedAt = layoutNow();
    state.dualGraphLayout = calculateGraphLayout(state.dualGraphData, size.width, size.height, state.dualGraphLayoutMethod);
    state.dualGraphLayoutTimings[state.dualGraphLayoutMethod] = layoutNow() - startedAt;
    syncDualGraphLayoutControls();
    renderVisibleDualGraphVisualizations(state.dualGraphData);
  }

  function syncDualGraphLayoutControls() {
    if (refs.dualGraphLayoutMethod) refs.dualGraphLayoutMethod.value = state.dualGraphLayoutMethod;
    if (refs.computeLayout) {
      refs.computeLayout.textContent = state.dualGraphLayoutMethod === 'force' && state.dualGraphAnimating
        ? 'Stop'
        : 'Compute layout';
    }
    syncDualGraphLayoutTime();
  }

  function syncDualGraphLayoutTime() {
    if (!refs.dualGraphLayoutTime) return;
    const timings = state.dualGraphLayoutTimings || {};
    const labels = [
      ['force', 'Force'],
      ['shell', 'Shell'],
      ['spectral', 'Spectral'],
      ['kamada-kawai', 'Kamada-Kawai']
    ];
    const measured = labels
      .filter(([key]) => Number.isFinite(timings[key]))
      .map(([key, label]) => `${label} ${formatLayoutDuration(timings[key])}`);
    refs.dualGraphLayoutTime.textContent = measured.length ? measured.join(' | ') : '-';
  }

  function formatLayoutDuration(ms) {
    if (!Number.isFinite(ms)) return '-';
    if (ms < 10) return `${ms.toFixed(2)}ms`;
    if (ms < 100) return `${ms.toFixed(1)}ms`;
    return `${Math.round(ms)}ms`;
  }

  function layoutNow() {
    return (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? performance.now()
      : Date.now();
  }

  function isDualGraphVisualizationVisible() {
    return state.showDualGraphCanvas || state.showRiemannSurfaceCanvas || state.showAlgebraicCurveCanvas;
  }

  function ensureDualGraphLayout(graphData) {
    if (state.dualGraphLayout) return state.dualGraphLayout;
    const size = dualGraphLayoutSize();
    const startedAt = layoutNow();
    state.dualGraphLayout = calculateGraphLayout(graphData, size.width, size.height, state.dualGraphLayoutMethod);
    state.dualGraphLayoutTimings[state.dualGraphLayoutMethod] = layoutNow() - startedAt;
    syncDualGraphLayoutControls();
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

  function collectDualGraphData(report, options = {}) {
    if (options.standardGraph) return dualGraphDataFromStandardGraph(options.standardGraph, options);
    if (isDualGraph() && state.standardDualGraphInput && (!report || report.active === 0)) {
      return dualGraphDataFromStandardGraph(state.standardDualGraphInput, options);
    }
    const topology = collectDualGraphTopologyFromCanvas(report, options);
    if (!topology.isValid) return topology;
    const standardGraph = standardDualGraphFromCanvasTopology(topology);
    return dualGraphDataFromStandardGraph(standardGraph, { source: topology });
  }

  function collectDualGraphTopologyFromCanvas(report, options = {}) {
    const requireSingleComponent = options.requireSingleComponent !== false;
    // Check prerequisites: exactly one component and at least one vertex
    if (requireSingleComponent && report.components !== 1) {
      return { isValid: false, reason: 'Requires exactly one component' };
    }

    const lattice = getLattice();
    const vertices = [];
    const edges = [];
    const legs = [];

    // Collect vertices
    for (let index = 0; index < state.tiles.length; index += 1) {
      if (tileExists(index) && isVertexTileValue(state.tiles[index])) {
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
          const next = connectedSurfaceNeighbor(current.index, current.dir, lattice);

          if (!next) {
            // Open end - this is a leg
            legs.push({
              vertex: vertex.index,
              spoke: startDir,
              label: halfEdgeDecorationValue(`${vertex.index}:${startDir}`),
              path: path.slice()
            });
            break;
          }

          const nextIndex = next.index;
          const opposite = next.dir;

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
                label: halfEdgeDecorationValue(`${vertex.index}:${startDir}`),
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
              label: halfEdgeDecorationValue(`${vertex.index}:${startDir}`),
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

  function standardDualGraphFromCanvasTopology(topology) {
    const vertexIdBySource = new Map();
    const sourceByVertexId = new Map();
    const genera = topology.vertices.map((vertex, vertexIndex) => {
      vertexIdBySource.set(vertex.index, vertexIndex);
      sourceByVertexId.set(vertexIndex, vertex);
      return vertexDecorationValue(vertex.index);
    });
    const legs = genera.map(() => []);
    const edges = [];
    const decorations = {};
    const halfEdgeMeta = {};
    let nextHalfEdge = 1;

    const addHalfEdge = (vertexIndex, meta, decoration = '') => {
      const halfEdge = nextHalfEdge;
      nextHalfEdge += 1;
      legs[vertexIndex].push(halfEdge);
      halfEdgeMeta[halfEdge] = { ...meta, vertex: vertexIndex, halfEdge };
      const label = normalizeHalfEdgeDecoration(decoration);
      if (label) decorations[halfEdge] = label;
      return halfEdge;
    };

    topology.edges.forEach((edge, edgeIndex) => {
      const from = vertexIdBySource.get(edge.from);
      const to = vertexIdBySource.get(edge.to);
      if (from == null || to == null) return;
      const fromHalfEdge = addHalfEdge(from, {
        kind: 'edge',
        edgeIndex,
        branch: 'from',
        sourceVertex: edge.from,
        spoke: edge.fromSpoke,
        key: `${edge.from}:${edge.fromSpoke}`,
        path: cloneDualGraphPath(edge.path)
      });
      const toHalfEdge = addHalfEdge(to, {
        kind: 'edge',
        edgeIndex,
        branch: 'to',
        sourceVertex: edge.to,
        spoke: edge.toSpoke,
        key: `${edge.to}:${edge.toSpoke}`,
        path: cloneDualGraphPath(edge.path)
      });
      edges.push([fromHalfEdge, toHalfEdge]);
    });

    topology.legs.forEach((leg, legIndex) => {
      const vertex = vertexIdBySource.get(leg.vertex);
      if (vertex == null) return;
      addHalfEdge(vertex, {
        kind: 'leg',
        legIndex,
        sourceVertex: leg.vertex,
        spoke: leg.spoke,
        key: halfEdgeDecorationKey(leg),
        path: cloneDualGraphPath(leg.path)
      }, leg.label);
    });

    return {
      genera,
      legs,
      edges,
      decorations,
      meta: {
        source: 'mosaic-canvas',
        vertices: Array.from(sourceByVertexId.entries()).map(([index, vertex]) => ({
          index,
          sourceIndex: vertex.index,
          row: vertex.row,
          col: vertex.col,
          spokes: normalizeVertexTile(state.tiles[vertex.index])
        })),
        halfEdges: halfEdgeMeta
      }
    };
  }

  function dualGraphDataFromStandardGraph(input, options = {}) {
    const normalized = normalizeStandardDualGraphInput(input);
    if (!normalized.isValid) return normalized;

    const meta = normalized.meta || {};
    const vertexMeta = new Map();
    if (Array.isArray(meta.vertices)) {
      meta.vertices.forEach((vertex) => {
        if (!vertex || !Number.isInteger(Number(vertex.index))) return;
        vertexMeta.set(Number(vertex.index), vertex);
      });
    }
    const halfEdgeMeta = meta.halfEdges && typeof meta.halfEdges === 'object' ? meta.halfEdges : {};
    const source = options.source && options.source.isValid ? options.source : null;
    const sourceVertices = source
      ? new Map(source.vertices.map((vertex, vertexIndex) => [vertexIndex, vertex]))
      : new Map();

    const vertices = normalized.genera.map((genus, index) => {
      const fromMeta = vertexMeta.get(index) || {};
      const fromSource = sourceVertices.get(index) || {};
      return {
        index,
        genus,
        row: Number.isInteger(Number(fromMeta.row)) ? Number(fromMeta.row) : fromSource.row,
        col: Number.isInteger(Number(fromMeta.col)) ? Number(fromMeta.col) : fromSource.col,
        sourceIndex: Number.isInteger(Number(fromMeta.sourceIndex)) ? Number(fromMeta.sourceIndex) : fromSource.index,
        spokes: Array.isArray(fromMeta.spokes) ? fromMeta.spokes.slice() : []
      };
    });

    const halfEdgeVertex = new Map();
    normalized.legs.forEach((halfEdges, vertex) => {
      halfEdges.forEach((halfEdge) => {
        halfEdgeVertex.set(halfEdge, vertex);
      });
    });

    const pairedHalfEdges = new Set();
    const edges = normalized.edges.map((pair, edgeIndex) => {
      const fromHalfEdge = pair[0];
      const toHalfEdge = pair[1];
      pairedHalfEdges.add(fromHalfEdge);
      pairedHalfEdges.add(toHalfEdge);
      const fromMeta = halfEdgeMeta[fromHalfEdge] || {};
      const toMeta = halfEdgeMeta[toHalfEdge] || {};
      return {
        from: halfEdgeVertex.get(fromHalfEdge),
        to: halfEdgeVertex.get(toHalfEdge),
        fromHalfEdge,
        toHalfEdge,
        fromSpoke: Number.isInteger(Number(fromMeta.spoke)) ? Number(fromMeta.spoke) : null,
        toSpoke: Number.isInteger(Number(toMeta.spoke)) ? Number(toMeta.spoke) : null,
        path: cloneDualGraphPath(fromMeta.path || toMeta.path || []),
        halfEdges: [fromHalfEdge, toHalfEdge]
      };
    });

    const decorationLabels = normalized.decorations || {};
    const externalLegs = [];
    normalized.legs.forEach((halfEdges, vertex) => {
      halfEdges.forEach((halfEdge) => {
        if (pairedHalfEdges.has(halfEdge)) return;
        const metaEntry = halfEdgeMeta[halfEdge] || {};
        const key = metaEntry.key || `${vertex}:${halfEdge}`;
        externalLegs.push({
          vertex,
          halfEdge,
          key,
          spoke: Number.isInteger(Number(metaEntry.spoke)) ? Number(metaEntry.spoke) : null,
          label: normalizeHalfEdgeDecoration(decorationLabels[halfEdge]),
          path: cloneDualGraphPath(metaEntry.path || [])
        });
      });
    });

    return {
      isValid: true,
      vertices,
      edges,
      legs: externalLegs,
      standardGraph: standardDualGraphPlain(normalized),
      standardDecorations: { ...normalized.decorations },
      standardText: formatStandardDualGraphText(normalized)
    };
  }

  function normalizeStandardDualGraphInput(input) {
    if (Array.isArray(input)) {
      input = {
        genera: input[0],
        legs: input[1],
        edges: input[2],
        decorations: input[3] || {}
      };
    }
    const graph = input && input.graph && typeof input.graph === 'object' && !Array.isArray(input.graph)
      ? input.graph
      : input;
    if (!graph || typeof graph !== 'object') {
      return { isValid: false, reason: 'dual graph standard input required' };
    }

    const generaInput = Array.isArray(graph.genera) ? graph.genera : graph.vertices;
    const legsInput = Array.isArray(graph.legs) ? graph.legs : graph.halfEdges;
    const edgesInput = Array.isArray(graph.edges) ? graph.edges : [];
    if (!Array.isArray(generaInput) || !Array.isArray(legsInput)) {
      return { isValid: false, reason: 'dual graph requires genera and legs lists' };
    }
    if (generaInput.length !== legsInput.length) {
      return { isValid: false, reason: 'genera and legs lists must have the same length' };
    }

    const genera = generaInput.map((value) => normalizeVertexDecoration(value));
    const seenHalfEdges = new Set();
    const legs = legsInput.map((entries) => {
      const list = Array.isArray(entries) ? entries : [];
      return list.map((value) => {
        const halfEdge = Number(value);
        if (!Number.isInteger(halfEdge)) return null;
        if (seenHalfEdges.has(halfEdge)) return null;
        seenHalfEdges.add(halfEdge);
        return halfEdge;
      }).filter((value) => value != null);
    });
    const lostHalfEdges = legsInput.some((entries, index) => (
      Array.isArray(entries) && entries.length !== legs[index].length
    ));
    if (lostHalfEdges) return { isValid: false, reason: 'half-edge labels must be unique integers' };

    const edges = [];
    const pairedHalfEdges = new Set();
    for (const entry of edgesInput) {
      const pair = Array.isArray(entry) ? entry : [];
      if (pair.length !== 2) return { isValid: false, reason: 'each edge must pair exactly two half-edges' };
      const left = Number(pair[0]);
      const right = Number(pair[1]);
      if (!Number.isInteger(left) || !Number.isInteger(right)) {
        return { isValid: false, reason: 'edge half-edge labels must be integers' };
      }
      if (!seenHalfEdges.has(left) || !seenHalfEdges.has(right)) {
        return { isValid: false, reason: 'edges must use half-edges from the legs lists' };
      }
      if (pairedHalfEdges.has(left) || pairedHalfEdges.has(right)) {
        return { isValid: false, reason: 'a half-edge can appear in at most one edge pair' };
      }
      pairedHalfEdges.add(left);
      pairedHalfEdges.add(right);
      edges.push([left, right]);
    }

    const decorationsInput = input.decorations || graph.decorations || input.labels || graph.labels || {};
    const decorations = {};
    if (decorationsInput && typeof decorationsInput === 'object') {
      Object.entries(decorationsInput).forEach(([key, value]) => {
        const halfEdge = Number(key);
        const label = normalizeHalfEdgeDecoration(value);
        if (Number.isInteger(halfEdge) && seenHalfEdges.has(halfEdge) && label) decorations[halfEdge] = label;
      });
    }

    return {
      isValid: true,
      genera,
      legs,
      edges,
      decorations,
      meta: input.meta || graph.meta || null
    };
  }

  function standardDualGraphPlain(graph) {
    return {
      genera: graph.genera.map((value) => Number(value) || 0),
      legs: graph.legs.map((entries) => entries.slice()),
      edges: graph.edges.map((pair) => pair.slice(0, 2))
    };
  }

  function cloneDualGraphPath(path) {
    return Array.isArray(path)
      ? path.map((step) => ({ ...step }))
      : [];
  }

  function formatStandardDualGraphText(graph) {
    const plain = standardDualGraphPlain(graph);
    return `Graph : ${formatNumberList(plain.genera)} ${formatNestedNumberList(plain.legs)} ${formatEdgePairList(plain.edges)}`;
  }

  function formatNumberList(values) {
    return `[${values.join(', ')}]`;
  }

  function formatNestedNumberList(lists) {
    return `[${lists.map(formatNumberList).join(', ')}]`;
  }

  function formatEdgePairList(edges) {
    return `[${edges.map((edge) => `(${edge[0]}, ${edge[1]})`).join(', ')}]`;
  }

  function dualGraphInvariants(graphData) {
    const vertices = graphData.vertices.length;
    const edges = graphData.edges.length;
    const halfEdges = graphData.legs.length;
    const components = countDualGraphComponents(graphData);
    const valences = dualGraphVertexValences(graphData);
    const cycleRank = Math.max(0, edges - vertices + components);
    const vertexDetails = graphData.vertices.map((vertex) => {
      const genus = Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0;
      const valence = valences.get(vertex.index) || 0;
      return {
        index: vertex.index,
        row: vertex.row,
        col: vertex.col,
        genus,
        valence,
        stability: (2 * genus) - 2 + valence,
        stackDimension: (3 * genus) - 3 + valence
      };
    });
    const vertexGenus = vertexDetails.reduce((total, vertex) => total + vertex.genus, 0);
    const firstBetti = cycleRank + vertexGenus;
    const genus = vertexGenus + cycleRank;
    const eulerCharacteristic = (2 * components) - (2 * genus) - halfEdges;
    const unstableVertices = vertexDetails.filter((vertex) => vertex.stability <= 0);
    const stackStratumDimension = vertexDetails.reduce((total, vertex) => (
      total + vertex.stackDimension
    ), 0);

    return {
      vertices,
      edges,
      halfEdges,
      components,
      cycleRank,
      vertexGenus,
      vertexDetails,
      firstBetti,
      genus,
      eulerCharacteristic,
      isStable: unstableVertices.length === 0,
      unstableVertices,
      stackStratumDimension
    };
  }

  function formatDualGraphInvariants(graphData) {
    const inv = dualGraphInvariants(graphData);
    const stableLabel = inv.isStable ? 'yes' : 'no';
    const stableTitle = inv.isStable
      ? 'Every vertex satisfies 2g(v) - 2 + n(v) > 0'
      : `Unstable vertices: ${inv.unstableVertices.map(formatDualGraphVertexLabel).join(', ')}`;
    return `<dl class="slice-invariant-list">
      <dt>g</dt><dd>${inv.genus}</dd>
      <dt>n</dt><dd>${inv.halfEdges}</dd>
      <dt>b<sub>1</sub></dt><dd>${inv.firstBetti}</dd>
      <dt title="Every vertex satisfies 2g(v) - 2 + n(v) > 0">stable</dt><dd title="${stableTitle}">${stableLabel}</dd>
      <dt title="Stack stratum dimension: sum_v (3g(v) - 3 + n(v))">dim</dt><dd>${inv.stackStratumDimension}</dd>
    </dl>`;
  }

  function formatDualGraphVertexLabel(vertex) {
    if (Number.isInteger(Number(vertex.row)) && Number.isInteger(Number(vertex.col))) {
      return `r${Number(vertex.row) + 1}c${Number(vertex.col) + 1}`;
    }
    return `v${vertex.index}`;
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

  function syncDualGraphDegenerationControls(graphData) {
    if (!refs.computeDegenerations || !refs.dualGraphDegenerationsStatus) return;
    const inv = graphData && graphData.isValid ? dualGraphInvariants(graphData) : null;
    refs.computeDegenerations.disabled = !(inv && inv.isStable);
    if (refs.exportDegenerations) refs.exportDegenerations.disabled = !state.dualGraphDegenerations.length;
    if (refs.emphasizeDegenerations) refs.emphasizeDegenerations.disabled = !state.dualGraphDegenerations.length;
    if (refs.dualGraphDegenerationInitialLayout) refs.dualGraphDegenerationInitialLayout.disabled = !(inv && inv.isStable);
    if (refs.dualGraphDegenerationForce) refs.dualGraphDegenerationForce.disabled = !(inv && inv.isStable);
    syncDualGraphDegenerationEmphasisControls();
    syncDualGraphDegenerationWidePlacement();
    if (!inv) {
      refs.dualGraphDegenerationsStatus.textContent = 'stable graph required';
      return;
    }
    if (!inv.isStable) {
      refs.dualGraphDegenerationsStatus.textContent = 'not stable';
      return;
    }
    if (state.dualGraphDegenerations.length || state.dualGraphDegenerationSourceKey === dualGraphDegenerationSourceKey(graphData)) {
      refs.dualGraphDegenerationsStatus.textContent = `${state.dualGraphDegenerations.length} divisor graph${state.dualGraphDegenerations.length === 1 ? '' : 's'}`;
    } else {
      refs.dualGraphDegenerationsStatus.textContent = 'ready';
    }
  }

  function clearDualGraphDegenerationChart() {
    clearDualGraphDegenerationHoverTimer();
    clearDualGraphDegenerationAnimations();
    state.dualGraphDegenerations = [];
    state.dualGraphDegenerationLayouts = new Map();
    state.dualGraphDegenerationCurrentLayouts = new Map();
    state.dualGraphDegenerationSourceKey = '';
    if (refs.dualGraphDegenerationsGrid) refs.dualGraphDegenerationsGrid.textContent = '';
    if (refs.dualGraphDegenerationsStatus) refs.dualGraphDegenerationsStatus.textContent = 'stable graph required';
    if (refs.exportDegenerations) refs.exportDegenerations.disabled = true;
    if (refs.emphasizeDegenerations) refs.emphasizeDegenerations.disabled = true;
    if (refs.dualGraphDegenerationInitialLayout) refs.dualGraphDegenerationInitialLayout.disabled = true;
    if (refs.dualGraphDegenerationForce) refs.dualGraphDegenerationForce.disabled = true;
    syncDualGraphDegenerationEmphasisControls();
  }

  function computeAndRenderDualGraphDegenerations() {
    if (!state.dualGraphData || !state.dualGraphData.isValid) return;
    const inv = dualGraphInvariants(state.dualGraphData);
    if (!inv.isStable) {
      clearDualGraphDegenerationChart();
      syncDualGraphDegenerationControls(state.dualGraphData);
      return;
    }
    const sourceKey = dualGraphDegenerationSourceKey(state.dualGraphData);
    state.dualGraphDegenerationSourceKey = sourceKey;
    state.dualGraphDegenerations = enumerateDualGraphDivisorDegenerations(state.dualGraphData);
    state.dualGraphDegenerationLayouts = new Map();
    state.dualGraphDegenerationCurrentLayouts = new Map();
    renderDualGraphDegenerationChart({ runInitialForce: true });
    syncDualGraphDegenerationControls(state.dualGraphData);
  }

  function syncDualGraphDegenerationEmphasisControls() {
    if (refs.emphasizeDegenerations) {
      refs.emphasizeDegenerations.checked = !!state.emphasizeDegenerations;
      refs.emphasizeDegenerations.disabled = !state.dualGraphDegenerations.length;
    }
    if (!refs.dualGraphDegenerationEmphasisStyle) return;
    refs.dualGraphDegenerationEmphasisStyle.disabled = !state.dualGraphDegenerations.length || !state.emphasizeDegenerations;
    refs.dualGraphDegenerationEmphasisStyle.value = state.emphasizeDegenerations
      ? normalizeDualGraphDegenerationEmphasisStyle(state.dualGraphDegenerationEmphasisStyle)
      : 'none';
    if (refs.dualGraphDegenerationEmphasisStyle.options && refs.dualGraphDegenerationEmphasisStyle.options.none) {
      refs.dualGraphDegenerationEmphasisStyle.options.none.disabled = state.emphasizeDegenerations;
    }
  }

  function exportDualGraphDegenerations() {
    const report = analyze();
    const payload = buildDualGraphDegenerationsExport(report);
    refs.exportOut.value = formatConciseDualGraphPayload(payload);
    if (refs.exportCard) refs.exportCard.classList.remove('collapsed');
    if (refs.exportOut) {
      refs.exportOut.focus();
      refs.exportOut.select();
    }
    if (refs.statusLine) {
      refs.statusLine.textContent = isSuccessfulConciseDualGraphExport(payload)
        ? 'boundary divisor export ready'
        : (payload.reason || 'boundary divisor export unavailable');
    }
  }

  function isSuccessfulConciseDualGraphExport(payload) {
    return typeof payload === 'string'
      || Array.isArray(payload)
      || !!(payload && Array.isArray(payload.divisors) && !payload.reason);
  }

  function buildDualGraphDegenerationsExport(report) {
    const graphData = state.dualGraphData && state.dualGraphData.isValid
      ? state.dualGraphData
      : collectDualGraphData(report);
    if (!graphData.isValid) {
      return {
        reason: graphData.reason || 'dual graph unavailable',
        divisors: []
      };
    }
    const inv = dualGraphInvariants(graphData);
    if (!inv.isStable) {
      return {
        reason: 'source dual graph is not stable',
        source: conciseStandardDualGraphExport(graphData),
        divisors: []
      };
    }
    const currentSourceKey = dualGraphDegenerationSourceKey(graphData);
    const divisors = state.dualGraphDegenerationSourceKey === currentSourceKey && state.dualGraphDegenerations.length
      ? state.dualGraphDegenerations
      : enumerateDualGraphDivisorDegenerations(graphData);
    return conciseDualGraphDivisorExport(divisors);
  }

  function conciseDualGraphDivisorExport(divisors) {
    const records = divisors.map((degeneration) => exportStandardDualGraphRecord(degeneration.graphData));
    const graphs = records.map((record) => record.text);
    const decorationKeys = records.map((record) => stableDecorationKey(record.decorations));
    const firstDecorationKey = decorationKeys[0] || '{}';
    const hasDecorations = firstDecorationKey !== '{}';
    const sharedDecorations = decorationKeys.every((key) => key === firstDecorationKey);
    if (!hasDecorations) return graphs;
    if (sharedDecorations) {
      return {
        decorations: { ...records[0].decorations },
        divisors: graphs
      };
    }
    return records.map((record) => conciseStandardDualGraphRecordExport(record));
  }

  function setDualGraphDegenerationsWide(enabled) {
    const canUseWide = isDualGraph() && window.matchMedia('(min-width: 960px)').matches;
    state.dualGraphDegenerationsWide = !!enabled && canUseWide;
    syncDualGraphDegenerationWidePlacement();
  }

  function syncDualGraphDegenerationWidePlacement() {
    const card = refs.dualGraphDegenerationsCard;
    const sideHost = refs.dualGraphDegenerationsSideHost;
    const wideHost = refs.dualGraphDegenerationsWideHost;
    if (!card || !sideHost || !wideHost) return;
    const canUseWide = isDualGraph() && window.matchMedia('(min-width: 960px)').matches;
    if (!canUseWide) state.dualGraphDegenerationsWide = false;
    const target = state.dualGraphDegenerationsWide ? wideHost : sideHost;
    if (card.parentElement !== target) target.appendChild(card);
    card.classList.toggle('wide', state.dualGraphDegenerationsWide);
    wideHost.hidden = !state.dualGraphDegenerationsWide;
    if (refs.toggleDegenerationsWide) {
      refs.toggleDegenerationsWide.textContent = state.dualGraphDegenerationsWide ? 'side' : 'wide';
      refs.toggleDegenerationsWide.setAttribute('aria-pressed', state.dualGraphDegenerationsWide ? 'true' : 'false');
      refs.toggleDegenerationsWide.disabled = !canUseWide;
    }
  }

  function renderDualGraphDegenerationChart(options = {}) {
    if (!refs.dualGraphDegenerationsGrid) return;
    clearDualGraphDegenerationHoverTimer();
    clearDualGraphDegenerationAnimations();
    state.dualGraphDegenerationCurrentLayouts = new Map();
    refs.dualGraphDegenerationsGrid.textContent = '';
    const initialLayout = normalizeDualGraphDegenerationInitialLayout(state.dualGraphDegenerationInitialLayout);
    state.dualGraphDegenerations.forEach((degeneration, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'dual-graph-degeneration-tile';
      tile.dataset.degenerationIndex = String(index);
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const caption = document.createElement('span');
      caption.className = 'dual-graph-degeneration-caption';
      caption.textContent = formatDualGraphDegenerationMultiplicity(degeneration);
      caption.title = degeneration.label;
      tile.append(canvas, caption);
      tile.addEventListener('mouseenter', () => scheduleDualGraphDegenerationForce(index, true));
      tile.addEventListener('mouseleave', () => stopDualGraphDegenerationForce(index));
      tile.addEventListener('click', () => promoteDualGraphDegenerationLayout(index));
      refs.dualGraphDegenerationsGrid.appendChild(tile);
      renderDualGraphDegenerationCanvas(canvas, degeneration, initialLayout);
    });
    if (state.dualGraphDegenerationForceEnabled && options.runInitialForce) {
      window.setTimeout(runInitialDualGraphDegenerationForce, 0);
    }
  }

  function formatDualGraphDegenerationMultiplicity(degeneration) {
    if (!degeneration || !degeneration.graphData) return '';
    const value = Number.isFinite(Number(degeneration.multiplicity))
      ? Number(degeneration.multiplicity)
      : dualGraphDegenerationMultiplicity(degeneration);
    return `mult ${value}`;
  }

  function dualGraphDegenerationMultiplicity(degeneration) {
    const graphData = degeneration && degeneration.graphData;
    if (!graphData || !Array.isArray(graphData.edges) || !graphData.edges.length) return 1;
    if (degeneration.sourceGraphData) {
      const structures = stableGraphContractionStructureCount(graphData, degeneration.sourceGraphData);
      if (structures > 0) return structures;
    }
    const edgeIndex = dualGraphDegenerationNewEdgeIndex(degeneration);
    if (edgeIndex < 0 || edgeIndex >= graphData.edges.length) return 1;
    return stableGraphEdgeEndpointMultiplicity(graphData, edgeIndex);
  }

  function dualGraphDegenerationNewEdgeIndex(degeneration) {
    const edges = degeneration && degeneration.emphasis && degeneration.emphasis.edges;
    if (Array.isArray(edges) && Number.isInteger(Number(edges[0]))) return Number(edges[0]);
    const graphData = degeneration && degeneration.graphData;
    return graphData && Array.isArray(graphData.edges) ? graphData.edges.length - 1 : -1;
  }

  function stableGraphEdgeEndpointMultiplicity(graphData, edgeIndex) {
    const edge = graphData.edges[edgeIndex];
    if (!edge) return 1;
    const key = stableEdgeMultiplicityKey(edge);
    return graphData.edges.reduce((total, item) => (
      total + (stableEdgeMultiplicityKey(item) === key ? 1 : 0)
    ), 0);
  }

  function stableGraphContractionStructureCount(specialGraph, sourceGraph) {
    if (!specialGraph || !sourceGraph || !Array.isArray(specialGraph.edges)) return 0;
    let total = 0;
    specialGraph.edges.forEach((edge, edgeIndex) => {
      const contracted = contractStableGraphEdge(specialGraph, edgeIndex);
      if (contracted) total += stableGraphIsomorphismCount(sourceGraph, contracted);
    });
    return total;
  }

  function contractStableGraphEdge(graphData, edgeIndex) {
    const edge = graphData && graphData.edges && graphData.edges[edgeIndex];
    if (!edge) return null;
    if (edge.from === edge.to) {
      return {
        vertices: graphData.vertices.map((vertex) => ({
          ...vertex,
          genus: vertex.index === edge.from ? stableGraphVertexGenus(vertex) + 1 : stableGraphVertexGenus(vertex)
        })),
        edges: graphData.edges
          .filter((_, index) => index !== edgeIndex)
          .map((item) => ({ ...item })),
        legs: graphData.legs.map((leg) => ({ ...leg }))
      };
    }

    const keep = edge.from;
    const drop = edge.to;
    const dropVertex = graphData.vertices.find((vertex) => vertex.index === drop);
    const dropGenus = dropVertex ? stableGraphVertexGenus(dropVertex) : 0;
    const moveVertex = (vertexIndex) => vertexIndex === drop ? keep : vertexIndex;
    return {
      vertices: graphData.vertices
        .filter((vertex) => vertex.index !== drop)
        .map((vertex) => ({
          ...vertex,
          genus: vertex.index === keep ? stableGraphVertexGenus(vertex) + dropGenus : stableGraphVertexGenus(vertex)
        })),
      edges: graphData.edges
        .filter((_, index) => index !== edgeIndex)
        .map((item) => ({
          ...item,
          from: moveVertex(item.from),
          to: moveVertex(item.to)
        })),
      legs: graphData.legs.map((leg) => ({
        ...leg,
        vertex: moveVertex(leg.vertex)
      }))
    };
  }

  function stableGraphIsomorphismCount(sourceGraph, targetGraph) {
    if (!stableGraphSameSize(sourceGraph, targetGraph)) return 0;
    const sourceVertices = sourceGraph.vertices || [];
    const targetVertices = targetGraph.vertices || [];
    const sourceLegs = stableGraphExternalLegsByVertex(sourceGraph);
    const targetLegs = stableGraphExternalLegsByVertex(targetGraph);
    const candidates = new Map();

    sourceVertices.forEach((sourceVertex) => {
      const sourceSignature = stableGraphVertexSignature(sourceVertex, sourceLegs);
      let options = targetVertices
        .filter((targetVertex) => stableGraphVertexSignature(targetVertex, targetLegs) === sourceSignature)
        .map((targetVertex) => targetVertex.index);
      candidates.set(sourceVertex.index, options);
    });
    if (Array.from(candidates.values()).some((list) => !list.length)) return 0;

    const targetEdgeCounts = stableGraphVertexPairCounts(targetGraph);
    const order = sourceVertices
      .map((vertex) => vertex.index)
      .sort((left, right) => {
        const diff = (candidates.get(left) || []).length - (candidates.get(right) || []).length;
        return diff || String(left).localeCompare(String(right));
      });
    const assigned = new Map();
    const usedTargets = new Set();

    const search = (position) => {
      if (position >= order.length) {
        return stableGraphEdgeMappingMultiplicity(sourceGraph, targetGraph, assigned);
      }
      let total = 0;
      const sourceIndex = order[position];
      for (const targetIndex of candidates.get(sourceIndex) || []) {
        if (usedTargets.has(targetIndex)) continue;
        assigned.set(sourceIndex, targetIndex);
        usedTargets.add(targetIndex);
        if (stableGraphPartialEdgeMappingFeasible(sourceGraph, assigned, targetEdgeCounts)) {
          total += search(position + 1);
        }
        assigned.delete(sourceIndex);
        usedTargets.delete(targetIndex);
      }
      return total;
    };

    return search(0);
  }

  function stableGraphSameSize(left, right) {
    return !!(left && right)
      && (left.vertices || []).length === (right.vertices || []).length
      && (left.edges || []).length === (right.edges || []).length
      && (left.legs || []).length === (right.legs || []).length;
  }

  function stableGraphExternalLegsByVertex(graphData) {
    const byVertex = new Map((graphData.vertices || []).map((vertex) => [vertex.index, []]));
    (graphData.legs || []).forEach((leg, legIndex) => {
      if (!byVertex.has(leg.vertex)) byVertex.set(leg.vertex, []);
      byVertex.get(leg.vertex).push(stableGraphExternalLegIdentity(leg, legIndex));
    });
    byVertex.forEach((legs) => legs.sort());
    return byVertex;
  }

  function stableGraphExternalLegIdentity(leg, legIndex) {
    const halfEdge = leg && leg.halfEdge;
    if (halfEdge !== null && halfEdge !== undefined && Number.isInteger(Number(halfEdge))) {
      return `h${Number(halfEdge)}`;
    }
    const key = leg && leg.key ? String(leg.key) : '';
    if (key) return `k${key}`;
    const label = leg && leg.label ? String(leg.label) : '';
    if (label) return `label:${label}`;
    return `leg${legIndex}`;
  }

  function stableGraphVertexSignature(vertex, externalLegsByVertex) {
    const legs = externalLegsByVertex.get(vertex.index) || [];
    return `g${stableGraphVertexGenus(vertex)}|legs:${legs.join(',')}`;
  }

  function stableGraphVertexGenus(vertex) {
    return Number.isInteger(Number(vertex && vertex.genus)) ? Number(vertex.genus) : 0;
  }

  function stableGraphVertexPairCounts(graphData) {
    const counts = new Map();
    (graphData.edges || []).forEach((edge) => {
      const key = stableGraphVertexPairKey(edge.from, edge.to);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function stableGraphVertexPairKey(left, right) {
    const values = [String(left), String(right)].sort();
    return `${values[0]}:${values[1]}`;
  }

  function stableGraphPartialEdgeMappingFeasible(sourceGraph, vertexMap, targetEdgeCounts) {
    const mappedCounts = new Map();
    for (const edge of sourceGraph.edges || []) {
      if (!vertexMap.has(edge.from) || !vertexMap.has(edge.to)) continue;
      const key = stableGraphVertexPairKey(vertexMap.get(edge.from), vertexMap.get(edge.to));
      const nextCount = (mappedCounts.get(key) || 0) + 1;
      if (nextCount > (targetEdgeCounts.get(key) || 0)) return false;
      mappedCounts.set(key, nextCount);
    }
    return true;
  }

  function stableGraphEdgeMappingMultiplicity(sourceGraph, targetGraph, vertexMap) {
    const targetCounts = stableGraphVertexPairCounts(targetGraph);
    const sourceGroups = stableGraphEdgeGroups(sourceGraph);
    let total = 1;

    for (const group of sourceGroups.values()) {
      const targetKey = stableGraphVertexPairKey(vertexMap.get(group.left), vertexMap.get(group.right));
      const targetCount = targetCounts.get(targetKey) || 0;
      if (targetCount !== group.count) return 0;
      total *= factorialNumber(group.count);
      if (group.left === group.right) total *= 2 ** group.count;
    }
    return total;
  }

  function stableGraphEdgeGroups(graphData) {
    const groups = new Map();
    (graphData.edges || []).forEach((edge) => {
      const key = stableGraphVertexPairKey(edge.from, edge.to);
      if (!groups.has(key)) {
        groups.set(key, {
          left: edge.from,
          right: edge.to,
          count: 0
        });
      }
      groups.get(key).count += 1;
    });
    return groups;
  }

  function factorialNumber(value) {
    let result = 1;
    for (let factor = 2; factor <= value; factor += 1) result *= factor;
    return result;
  }

  function scheduleDualGraphDegenerationForce(index, hover = false) {
    clearDualGraphDegenerationHoverTimer();
    state.dualGraphDegenerationHoverTimer = window.setTimeout(() => {
      state.dualGraphDegenerationHoverTimer = null;
      promoteDualGraphDegenerationLayout(index, { hover });
    }, 1000);
  }

  function runInitialDualGraphDegenerationForce() {
    if (!state.dualGraphDegenerationForceEnabled || !refs.dualGraphDegenerationsGrid) return;
    const count = Math.min(DEGENERATION_FORCE_LIMIT, state.dualGraphDegenerations.length);
    for (let index = 0; index < count; index += 1) {
      promoteDualGraphDegenerationLayout(index, {
        timed: true,
        duration: DEGENERATION_FORCE_DURATION_MS,
        fromInitial: true
      });
    }
  }

  function clearDualGraphDegenerationHoverTimer() {
    if (state.dualGraphDegenerationHoverTimer !== null) {
      window.clearTimeout(state.dualGraphDegenerationHoverTimer);
      state.dualGraphDegenerationHoverTimer = null;
    }
  }

  function promoteDualGraphDegenerationLayout(index, options = {}) {
    const degeneration = state.dualGraphDegenerations[index];
    if (!degeneration || !refs.dualGraphDegenerationsGrid) return;
    const tile = refs.dualGraphDegenerationsGrid.querySelector(`[data-degeneration-index="${index}"]`);
    const canvas = tile ? tile.querySelector('canvas') : null;
    if (!canvas) return;
    const animationOptions = typeof options === 'boolean' ? { hover: options } : options;
    animateDualGraphDegenerationForce(canvas, degeneration, animationOptions);
  }

  function renderDualGraphDegenerationCanvas(canvas, degeneration, method) {
    const graphData = degeneration.graphData;
    const layoutMethod = normalizeDualGraphDegenerationInitialLayout(method);
    const layoutKey = `${degeneration.id}:${layoutMethod}`;
    let layout = state.dualGraphDegenerationLayouts.get(layoutKey);
    if (!layout) {
      layout = calculateMiniInitialDegenerationLayout(graphData, canvas, degeneration, layoutMethod);
      state.dualGraphDegenerationLayouts.set(layoutKey, layout);
    }
    drawMiniDualGraph(canvas, graphData, layout, degeneration);
    state.dualGraphDegenerationCurrentLayouts.set(degeneration.id, cloneGraphLayout(layout));
  }

  function repaintDualGraphDegenerationCanvases() {
    if (!refs.dualGraphDegenerationsGrid) return;
    state.dualGraphDegenerations.forEach((degeneration, index) => {
      const tile = refs.dualGraphDegenerationsGrid.querySelector(`[data-degeneration-index="${index}"]`);
      const canvas = tile ? tile.querySelector('canvas') : null;
      const layout = state.dualGraphDegenerationCurrentLayouts.get(degeneration.id);
      if (!canvas || !layout) return;
      drawMiniDualGraph(canvas, degeneration.graphData, layout, degeneration);
    });
  }

  function calculateMiniInitialDegenerationLayout(graphData, canvas, degeneration, method) {
    const layoutMethod = normalizeDualGraphDegenerationInitialLayout(method);
    const layout = calculateGraphLayout(graphData, canvas.width, canvas.height, layoutMethod);
    if (layoutMethod === 'shell') stretchMiniDegenerationShellLayout(layout, graphData);
    if (layoutMethod === 'spectral' || layoutMethod === 'kamada-kawai') {
      compactGraphLayout(layout, MINI_SPECTRAL_LAYOUT_SCALE);
    }
    return layout;
  }

  function animateDualGraphDegenerationForce(canvas, degeneration, options = {}) {
    const graphData = degeneration.graphData;
    const animationKey = degeneration.id;
    const existing = state.dualGraphDegenerationAnimations.get(animationKey);
    if (existing) {
      if (options.timed) {
        existing.stopped = true;
        window.cancelAnimationFrame(existing.frameId);
        state.dualGraphDegenerationAnimations.delete(animationKey);
      } else {
        existing.hover = existing.hover || !!options.hover;
        return;
      }
    }
    const initialMethod = normalizeDualGraphDegenerationInitialLayout(state.dualGraphDegenerationInitialLayout);
    const initialLayout = state.dualGraphDegenerationLayouts.get(`${degeneration.id}:${initialMethod}`)
      || calculateMiniInitialDegenerationLayout(graphData, canvas, degeneration, initialMethod);
    state.dualGraphDegenerationLayouts.set(`${degeneration.id}:${initialMethod}`, initialLayout);
    const startLayout = cloneGraphLayout(initialLayout);
    let targetLayout = state.dualGraphDegenerationLayouts.get(`${degeneration.id}:force`);
    if (!targetLayout) {
      targetLayout = calculateMiniForceDegenerationLayout(graphData, canvas, degeneration, initialLayout);
      state.dualGraphDegenerationLayouts.set(`${degeneration.id}:force`, targetLayout);
    }

    let frame = 0;
    const maxFrames = 64;
    const endAt = options.timed && Number.isFinite(options.duration)
      ? layoutNow() + Math.max(0, options.duration)
      : null;
    const animation = {
      frameId: 0,
      hover: !!options.hover,
      timed: !!options.timed,
      stopped: false
    };
    const tick = () => {
      if (!state.dualGraphDegenerationAnimations.has(animationKey) || animation.stopped) return;
      if (frame < maxFrames) {
        const t = easeInOutCubic(Math.min(1, frame / maxFrames));
        const layout = interpolateGraphLayout(startLayout, targetLayout, t);
        drawMiniDualGraph(canvas, graphData, layout, degeneration);
        state.dualGraphDegenerationCurrentLayouts.set(degeneration.id, cloneGraphLayout(layout));
      } else {
        applyMiniDegenerationForces(targetLayout, graphData, 0.12);
        shrinkMiniDegenerationLegs(targetLayout, graphData, 0.1);
        stepGraphLayout(targetLayout, 0.72, 20);
        drawMiniDualGraph(canvas, graphData, targetLayout, degeneration);
        state.dualGraphDegenerationCurrentLayouts.set(degeneration.id, cloneGraphLayout(targetLayout));
        state.dualGraphDegenerationLayouts.set(`${degeneration.id}:force`, targetLayout);
      }
      frame += 1;
      if (animation.timed && endAt !== null && layoutNow() >= endAt) {
        drawMiniDualGraph(canvas, graphData, targetLayout, degeneration);
        state.dualGraphDegenerationCurrentLayouts.set(degeneration.id, cloneGraphLayout(targetLayout));
        state.dualGraphDegenerationAnimations.delete(animationKey);
        return;
      }
      if (!animation.hover && !animation.timed && frame >= maxFrames) {
        drawMiniDualGraph(canvas, graphData, targetLayout, degeneration);
        state.dualGraphDegenerationCurrentLayouts.set(degeneration.id, cloneGraphLayout(targetLayout));
        state.dualGraphDegenerationAnimations.delete(animationKey);
        return;
      }
      animation.frameId = window.requestAnimationFrame(tick);
    };
    state.dualGraphDegenerationAnimations.set(animationKey, animation);
    animation.frameId = window.requestAnimationFrame(tick);
  }

  function stopDualGraphDegenerationForce(index) {
    clearDualGraphDegenerationHoverTimer();
    const degeneration = state.dualGraphDegenerations[index];
    if (!degeneration) return;
    const animation = state.dualGraphDegenerationAnimations.get(degeneration.id);
    if (!animation) return;
    if (animation.timed) {
      animation.hover = false;
      return;
    }
    animation.stopped = true;
    window.cancelAnimationFrame(animation.frameId);
    state.dualGraphDegenerationAnimations.delete(degeneration.id);
  }

  function clearDualGraphDegenerationAnimations() {
    state.dualGraphDegenerationAnimations.forEach((animation) => {
      if (animation) {
        animation.stopped = true;
        window.cancelAnimationFrame(animation.frameId);
      }
    });
    state.dualGraphDegenerationAnimations.clear();
  }

  function calculateMiniForceDegenerationLayout(graphData, canvas, degeneration, sourceLayout = null) {
    const initialMethod = normalizeDualGraphDegenerationInitialLayout(state.dualGraphDegenerationInitialLayout);
    const layout = cloneGraphLayout(
      sourceLayout || state.dualGraphDegenerationLayouts.get(`${degeneration.id}:${initialMethod}`)
      || calculateMiniInitialDegenerationLayout(graphData, canvas, degeneration, initialMethod)
    );
    shrinkMiniDegenerationLegs(layout, graphData, 0.58);
    for (let iteration = 0; iteration < 110; iteration += 1) {
      const alpha = 0.16 * (1 - (iteration / 140));
      applyMiniDegenerationForces(layout, graphData, alpha);
      shrinkMiniDegenerationLegs(layout, graphData, 0.18);
      stepGraphLayout(layout, 0.68, 26);
    }
    shrinkMiniDegenerationLegs(layout, graphData, 0.42);
    return layout;
  }

  function stretchMiniDegenerationShellLayout(layout, graphData) {
    if (!layout || !graphData) return;
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    layout.nodes.forEach((node) => {
      if (node.type === 'vertex') {
        node.x = cx + ((node.x - cx) * 2.15);
        node.y = cy + ((node.y - cy) * 2.15);
      }
    });
    graphData.legs.forEach((leg, legIndex) => {
      const legNode = layout.nodeMap.get(`l${legIndex}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);
      if (!legNode || !vertexNode) return;
      const vector = normalizeVector(legNode.x - vertexNode.x, legNode.y - vertexNode.y, 1, 0);
      const length = 38;
      legNode.x = vertexNode.x + (vector.x * length);
      legNode.y = vertexNode.y + (vector.y * length);
    });
    layout.nodes.forEach((node) => {
      node.x = clamp(node.x, 10, layout.width - 10);
      node.y = clamp(node.y, 10, layout.height - 10);
      node.vx = 0;
      node.vy = 0;
    });
  }

  function shrinkMiniDegenerationLegs(layout, graphData, amount) {
    graphData.legs.forEach((leg, legIndex) => {
      const legNode = layout.nodeMap.get(`l${legIndex}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);
      if (!legNode || !vertexNode) return;
      const target = 34;
      const dx = legNode.x - vertexNode.x;
      const dy = legNode.y - vertexNode.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nextX = vertexNode.x + (dx / dist) * target;
      const nextY = vertexNode.y + (dy / dist) * target;
      legNode.x += (nextX - legNode.x) * amount;
      legNode.y += (nextY - legNode.y) * amount;
      legNode.vx *= 0.5;
      legNode.vy *= 0.5;
    });
  }

  function applyMiniDegenerationForces(layout, graphData, alpha) {
    const nodes = layout.nodes;
    const forceAlpha = Number.isFinite(alpha) ? Math.max(0, alpha) : 1;
    const repulsionStrength = 620 * forceAlpha;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);
        const force = repulsionStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    graphData.edges.forEach((edge, edgeIndex) => {
      const fromNode = layout.nodeMap.get(`v${edge.from}`);
      const toNode = layout.nodeMap.get(`v${edge.to}`);
      if (!fromNode || !toNode) return;
      if (edge.from === edge.to) {
        const node0 = layout.nodeMap.get(`e${edgeIndex}_0`);
        const node1 = layout.nodeMap.get(`e${edgeIndex}_1`);
        const node2 = layout.nodeMap.get(`e${edgeIndex}_2`);
        if (node0 && node1 && node2) {
          applySpringForce(fromNode, node0, 0.026 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
          applySpringForce(node0, node1, 0.026 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
          applySpringForce(node1, node2, 0.026 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
          applySpringForce(node2, fromNode, 0.026 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
        }
        return;
      }
      const edgeNode = layout.nodeMap.get(`e${edgeIndex}`);
      if (edgeNode) {
        applySpringForce(fromNode, edgeNode, 0.036 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
        applySpringForce(toNode, edgeNode, 0.036 * forceAlpha, MINI_FORCE_EDGE_LENGTH);
      }
    });

    graphData.legs.forEach((leg, legIndex) => {
      const legNode = layout.nodeMap.get(`l${legIndex}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);
      if (!legNode || !vertexNode) return;
      applySpringForce(vertexNode, legNode, 0.03 * forceAlpha, 34);
    });

    const centerX = layout.width / 2;
    const centerY = layout.height / 2;
    nodes.forEach((node) => {
      node.vx += (centerX - node.x) * 0.002 * forceAlpha;
      node.vy += (centerY - node.y) * 0.002 * forceAlpha;
    });
  }

  function cloneGraphLayout(layout) {
    const nodes = layout.nodes.map((node) => ({ ...node, vx: 0, vy: 0, fixed: false }));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return {
      nodes,
      nodeMap,
      width: layout.width,
      height: layout.height,
      method: layout.method
    };
  }

  function interpolateGraphLayout(fromLayout, toLayout, amount) {
    const t = clamp(amount, 0, 1);
    const nodes = fromLayout.nodes.map((fromNode) => {
      const toNode = toLayout.nodeMap.get(fromNode.id) || fromNode;
      return {
        ...fromNode,
        x: fromNode.x + ((toNode.x - fromNode.x) * t),
        y: fromNode.y + ((toNode.y - fromNode.y) * t),
        vx: 0,
        vy: 0,
        fixed: false
      };
    });
    return {
      nodes,
      nodeMap: new Map(nodes.map((node) => [node.id, node])),
      width: fromLayout.width,
      height: fromLayout.height,
      method: toLayout.method
    };
  }

  function easeInOutCubic(t) {
    const value = clamp(t, 0, 1);
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function stepGraphLayout(layout, damping = 0.85, margin = 16) {
    layout.nodes.forEach((node) => {
      if (node.fixed) return;
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= damping;
      node.vy *= damping;
      node.x = clamp(node.x, margin, layout.width - margin);
      node.y = clamp(node.y, margin, layout.height - margin);
    });
  }

  function drawMiniDualGraph(canvas, graphData, layout, degeneration = null) {
    const ctx = canvas.getContext('2d');
    const emphasis = miniDegenerationEmphasis(degeneration);
    const emphasisStyle = emphasis.style;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    graphData.edges.forEach((edge, edgeIndex) => {
      const highlighted = emphasis.edges.has(edgeIndex);
      ctx.strokeStyle = highlighted
        ? dualGraphEmphasisStrokeColor(emphasisStyle)
        : '#2563eb';
      ctx.lineWidth = 2.1;
      drawLayoutEdgePath(ctx, layout, edge, edgeIndex);
    });
    graphData.legs.forEach((leg, legIndex) => {
      const legNode = layout.nodeMap.get(`l${legIndex}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);
      if (!legNode || !vertexNode) return;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(vertexNode.x, vertexNode.y);
      ctx.lineTo(legNode.x, legNode.y);
      ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      circle(ctx, legNode.x, legNode.y, 4.4);
      const label = leg.label || '';
      if (label) drawPlainTextLabel(ctx, legNode.x + 7, legNode.y - 7, label, '#991b1b', 11, 'left');
      ctx.fillStyle = '#fca5a5';
    });
    graphData.vertices.forEach((vertex) => {
      const node = layout.nodeMap.get(`v${vertex.index}`);
      if (!node) return;
      drawMiniDualGraphVertex(ctx, node.x, node.y, vertex.genus || 0, emphasis.vertices.has(vertex.index), emphasisStyle);
    });
    ctx.restore();
  }

  function stableEdgeMultiplicityKey(edge) {
    return edge.from === edge.to
      ? `loop:${edge.from}`
      : (edge.from < edge.to ? `${edge.from}:${edge.to}` : `${edge.to}:${edge.from}`);
  }

  function miniDegenerationEmphasis(degeneration) {
    const active = !!(state.emphasizeDegenerations && degeneration && degeneration.emphasis);
    return {
      vertices: new Set(active ? degeneration.emphasis.vertices || [] : []),
      edges: new Set(active ? degeneration.emphasis.edges || [] : []),
      legs: new Set(),
      style: active ? normalizeDualGraphDegenerationEmphasisStyle(state.dualGraphDegenerationEmphasisStyle) : 'none'
    };
  }

  function drawLayoutEdgePath(ctx, layout, edge, edgeIndex) {
    const fromNode = layout.nodeMap.get(`v${edge.from}`);
    const toNode = layout.nodeMap.get(`v${edge.to}`);
    if (!fromNode || !toNode) return;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    if (edge.from === edge.to) {
      const node0 = layout.nodeMap.get(`e${edgeIndex}_0`);
      const node1 = layout.nodeMap.get(`e${edgeIndex}_1`);
      const node2 = layout.nodeMap.get(`e${edgeIndex}_2`);
      if (!node0 || !node1 || !node2) return;
      ctx.quadraticCurveTo(node0.x, node0.y, (node0.x + node1.x) / 2, (node0.y + node1.y) / 2);
      ctx.quadraticCurveTo(node1.x, node1.y, (node1.x + node2.x) / 2, (node1.y + node2.y) / 2);
      ctx.quadraticCurveTo(node2.x, node2.y, fromNode.x, fromNode.y);
    } else {
      const edgeNode = layout.nodeMap.get(`e${edgeIndex}`);
      if (edgeNode) ctx.quadraticCurveTo(edgeNode.x, edgeNode.y, toNode.x, toNode.y);
      else ctx.lineTo(toNode.x, toNode.y);
    }
    ctx.stroke();
  }

  function drawMiniDualGraphVertex(ctx, x, y, genus, highlighted = false, emphasisStyle = 'orange') {
    const colors = highlighted
      ? dualGraphEmphasisVertexColors(emphasisStyle)
      : { fill: '#1e40af', stroke: '#1e3a8a', text: '#ffffff' };
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.8;
    circle(ctx, x, y, 8);
    ctx.stroke();
    if (genus > 0) {
      ctx.fillStyle = colors.text;
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(genus), x, y + 0.2);
    }
    ctx.restore();
  }

  function dualGraphEmphasisStrokeColor(style) {
    return normalizeDualGraphDegenerationEmphasisStyle(style) === 'black' ? '#111827' : '#b45309';
  }

  function dualGraphEmphasisVertexColors(style) {
    return normalizeDualGraphDegenerationEmphasisStyle(style) === 'black'
      ? { fill: '#111827', stroke: '#030712', text: '#ffffff' }
      : { fill: '#f59e0b', stroke: '#92400e', text: '#3b2503' };
  }

  function enumerateDualGraphDivisorDegenerations(graphData) {
    const base = normalizedStableGraphFromDualGraph(graphData);
    const degenerations = [];
    const seen = new Set();

    base.vertices.forEach((vertex) => {
      if (vertex.genus > 0) {
        addDualGraphDegeneration(degenerations, seen, createNonseparatingDegeneration(base, vertex), base);
      }
      separatingVertexDegenerations(base, vertex).forEach((degeneration) => {
        addDualGraphDegeneration(degenerations, seen, degeneration, base);
      });
    });

    return degenerations;
  }

  function dualGraphDegenerationSourceKey(graphData) {
    return stableGraphCanonicalKey(normalizedStableGraphFromDualGraph(graphData));
  }

  function addDualGraphDegeneration(target, seen, degeneration, sourceGraphData = null) {
    if (!degeneration) return;
    const key = stableGraphCanonicalKey(degeneration.graphData);
    if (seen.has(key)) return;
    seen.add(key);
    degeneration.id = `deg${target.length}`;
    degeneration.sourceGraphData = sourceGraphData ? cloneStableGraph(sourceGraphData) : null;
    degeneration.multiplicity = dualGraphDegenerationMultiplicity(degeneration);
    target.push(degeneration);
  }

  function normalizedStableGraphFromDualGraph(graphData) {
    return {
      vertices: graphData.vertices.map((vertex) => ({
        index: vertex.index,
        genus: Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0
      })),
      edges: graphData.edges.map((edge) => ({
        from: edge.from,
        to: edge.to,
        halfEdges: Array.isArray(edge.halfEdges) ? edge.halfEdges.slice(0, 2) : undefined
      })),
      legs: graphData.legs.map((leg) => ({
        vertex: leg.vertex,
        halfEdge: Number.isInteger(Number(leg.halfEdge)) ? Number(leg.halfEdge) : null,
        label: leg.label || '',
        key: halfEdgeDecorationKey(leg)
      }))
    };
  }

  function createNonseparatingDegeneration(base, vertex) {
    const graphData = cloneStableGraph(base);
    const target = graphData.vertices.find((item) => item.index === vertex.index);
    if (!target || target.genus <= 0) return null;
    target.genus -= 1;
    const edgeIndex = graphData.edges.length;
    graphData.edges.push({ from: target.index, to: target.index });
    return {
      kind: 'nonseparating',
      label: `v${vertex.index + 1}: g ${vertex.genus}->${target.genus} + loop`,
      emphasis: {
        vertices: [target.index],
        edges: [edgeIndex],
        legs: []
      },
      graphData
    };
  }

  function separatingVertexDegenerations(base, vertex) {
    const flags = stableGraphFlagsAtVertex(base, vertex.index);
    if (!flags.length && vertex.genus === 0) return [];
    const results = [];
    const subsets = flagSubsets(flags.length);

    for (let leftGenus = 0; leftGenus <= vertex.genus; leftGenus += 1) {
      const rightGenus = vertex.genus - leftGenus;
      for (const subset of subsets) {
        if (!isCanonicalStableSplitSubset(subset, flags.length, leftGenus, rightGenus)) continue;
        if (!stableVertexCondition(leftGenus, subset.size + 1)) continue;
        if (!stableVertexCondition(rightGenus, flags.length - subset.size + 1)) continue;
        results.push(createSeparatingDegeneration(base, vertex, leftGenus, rightGenus, flags, subset));
      }
    }

    return results.filter(Boolean);
  }

  function createSeparatingDegeneration(base, vertex, leftGenus, rightGenus, flags, subset) {
    const leftIndex = nextSyntheticVertexIndex(base);
    const rightIndex = leftIndex + 1;
    const graphData = {
      vertices: base.vertices
        .filter((item) => item.index !== vertex.index)
        .map((item) => ({ ...item }))
        .concat([
          { index: leftIndex, genus: leftGenus },
          { index: rightIndex, genus: rightGenus }
        ]),
      edges: [],
      legs: []
    };

    base.edges.forEach((edge, edgeIndex) => {
      if (edge.from !== vertex.index && edge.to !== vertex.index) {
        graphData.edges.push({ ...edge });
        return;
      }
      const from = edge.from === vertex.index
        ? splitTargetForFlag(flags, subset, `e:${edgeIndex}:from`, leftIndex, rightIndex)
        : edge.from;
      const to = edge.to === vertex.index
        ? splitTargetForFlag(flags, subset, `e:${edgeIndex}:to`, leftIndex, rightIndex)
        : edge.to;
      graphData.edges.push({ from, to });
    });

    base.legs.forEach((leg, legIndex) => {
      if (leg.vertex !== vertex.index) {
        graphData.legs.push({ ...leg });
        return;
      }
      graphData.legs.push({
        ...leg,
        vertex: splitTargetForFlag(flags, subset, `l:${legIndex}`, leftIndex, rightIndex)
      });
    });
    const bridgeIndex = graphData.edges.length;
    graphData.edges.push({ from: leftIndex, to: rightIndex });
    return {
      kind: 'separating',
      label: `v${vertex.index + 1}: sep g ${leftGenus}+${rightGenus}, ${subset.size}|${flags.length - subset.size} flags`,
      emphasis: {
        vertices: [leftIndex, rightIndex],
        edges: [bridgeIndex],
        legs: []
      },
      graphData
    };
  }

  function cloneStableGraph(graphData) {
    return {
      vertices: graphData.vertices.map((vertex) => ({ ...vertex })),
      edges: graphData.edges.map((edge) => ({ ...edge })),
      legs: graphData.legs.map((leg) => ({ ...leg }))
    };
  }

  function stableGraphFlagsAtVertex(graphData, vertexIndex) {
    const flags = [];
    graphData.edges.forEach((edge, edgeIndex) => {
      if (edge.from === vertexIndex) flags.push({ key: `e:${edgeIndex}:from` });
      if (edge.to === vertexIndex) flags.push({ key: `e:${edgeIndex}:to` });
    });
    graphData.legs.forEach((leg, legIndex) => {
      if (leg.vertex === vertexIndex) flags.push({ key: `l:${legIndex}` });
    });
    return flags;
  }

  function splitTargetForFlag(flags, subset, key, leftIndex, rightIndex) {
    const index = flags.findIndex((flag) => flag.key === key);
    if (index < 0) return rightIndex;
    return subset.has(index) ? leftIndex : rightIndex;
  }

  function isCanonicalStableSplitSubset(subset, flagCount, leftGenus, rightGenus) {
    if (flagCount === 0) return leftGenus <= rightGenus;
    if (leftGenus !== rightGenus) return leftGenus < rightGenus;
    return subsetSignature(subset, flagCount) <= subsetSignature(complementSubset(subset, flagCount), flagCount);
  }

  function nextSyntheticVertexIndex(graphData) {
    return graphData.vertices.reduce((max, vertex) => Math.max(max, vertex.index), -1) + 1;
  }

  function stableVertexCondition(genus, valence) {
    return (2 * genus) - 2 + valence > 0;
  }

  function flagSubsets(count) {
    const subsets = [new Set()];
    for (let index = 0; index < count; index += 1) {
      const currentLength = subsets.length;
      for (let entry = 0; entry < currentLength; entry += 1) {
        const next = new Set(subsets[entry]);
        next.add(index);
        subsets.push(next);
      }
    }
    return subsets;
  }

  function complementSubset(subset, count) {
    const complement = new Set();
    for (let index = 0; index < count; index += 1) {
      if (!subset.has(index)) complement.add(index);
    }
    return complement;
  }

  function subsetSignature(subset, count) {
    let text = '';
    for (let index = 0; index < count; index += 1) {
      text += subset.has(index) ? '1' : '0';
    }
    return text;
  }

  function stableGraphCanonicalKey(graphData) {
    const vertices = graphData.vertices
      .map((vertex) => `${vertex.index}:${Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0}`)
      .sort()
      .join('|');
    const edges = graphData.edges
      .map((edge) => edge.from <= edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`)
      .sort()
      .join('|');
    const legs = graphData.legs
      .map((leg) => `${leg.vertex}:${Number.isInteger(Number(leg.halfEdge)) ? Number(leg.halfEdge) : (leg.key || '')}`)
      .sort()
      .join('|');
    return `${vertices}::${edges}::${legs}`;
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

  function dualGraphVertexValences(graphData) {
    const valences = new Map(graphData.vertices.map((vertex) => [vertex.index, 0]));

    graphData.edges.forEach((edge) => {
      if (valences.has(edge.from)) valences.set(edge.from, valences.get(edge.from) + 1);
      if (valences.has(edge.to)) valences.set(edge.to, valences.get(edge.to) + 1);
    });
    graphData.legs.forEach((leg) => {
      if (valences.has(leg.vertex)) valences.set(leg.vertex, valences.get(leg.vertex) + 1);
    });

    return valences;
  }

  function buildDualGraphExport(report, lattice) {
    const graphData = collectDualGraphData(report);
    if (!graphData.isValid) {
      return {
        isValid: false,
        status: graphData.reason || 'Not available',
        format: 'Graph : [genera] [half-edges at vertices] [(edge half-edge pairs)]',
        graph: null,
        text: '',
        decorations: {},
        vertices: [],
        edges: [],
        legs: []
      };
    }
    const standard = exportStandardDualGraphRecord(graphData);

    return {
      isValid: true,
      status: `${graphData.vertices.length} vertices, ${graphData.edges.length} edges, ${graphData.legs.length} legs`,
      format: standard.format,
      graph: standard.graph,
      text: standard.text,
      decorations: standard.decorations,
      vertices: graphData.vertices.map((vertex) => ({
        index: vertex.index,
        row: Number.isInteger(Number(vertex.row)) ? Number(vertex.row) + 1 : null,
        col: Number.isInteger(Number(vertex.col)) ? Number(vertex.col) + 1 : null,
        sourceIndex: Number.isInteger(Number(vertex.sourceIndex)) ? Number(vertex.sourceIndex) : null,
        genus: Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0,
        spokes: dualGraphVertexSpokes(vertex).map((dir) => ({
          dir,
          name: lattice.dirNames[dir]
        })),
        layout: dualGraphNodeExport(`v${vertex.index}`)
      })),
      edges: graphData.edges.map((edge, edgeIndex) => ({
        index: edgeIndex,
        from: edge.from,
        to: edge.to,
        halfEdges: Array.isArray(edge.halfEdges) ? edge.halfEdges.slice(0, 2) : [edge.fromHalfEdge, edge.toHalfEdge].filter((value) => Number.isInteger(Number(value))),
        fromSpoke: dualGraphSpokeExport(edge.fromSpoke, lattice),
        toSpoke: dualGraphSpokeExport(edge.toSpoke, lattice),
        path: exportDualGraphPath(edge.path, lattice),
        layoutControls: edge.from === edge.to
          ? [`e${edgeIndex}_0`, `e${edgeIndex}_1`, `e${edgeIndex}_2`].map(dualGraphNodeExport).filter(Boolean)
          : [dualGraphNodeExport(`e${edgeIndex}`)].filter(Boolean)
      })),
      legs: graphData.legs.map((leg, legIndex) => ({
        index: legIndex,
        vertex: leg.vertex,
        halfEdge: leg.halfEdge,
        spoke: dualGraphSpokeExport(leg.spoke, lattice),
        key: halfEdgeDecorationKey(leg),
        label: leg.label || '',
        path: exportDualGraphPath(leg.path, lattice),
        layout: dualGraphNodeExport(`l${legIndex}`)
      }))
    };
  }

  function buildDualGraphOnlyExport(report) {
    const graphData = collectDualGraphData(report);
    if (!graphData.isValid) {
      return {
        reason: graphData.reason || 'dual graph unavailable',
        graph: '',
        decorations: {}
      };
    }

    return conciseStandardDualGraphExport(graphData);
  }

  function dualGraphVertexSpokes(vertex) {
    if (Array.isArray(vertex.spokes) && vertex.spokes.length) return vertex.spokes.slice();
    const sourceIndex = Number(vertex.sourceIndex);
    if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < state.tiles.length) {
      return normalizeVertexTile(state.tiles[sourceIndex]);
    }
    return [];
  }

  function dualGraphSpokeExport(dir, lattice) {
    const value = Number(dir);
    if (!Number.isInteger(value)) return { dir: null, name: '' };
    return {
      dir: value,
      name: lattice.dirNames[value] || ''
    };
  }

  function exportStandardDualGraphRecord(graphData) {
    const graph = standardDualGraphFromGraphData(graphData);
    const normalized = normalizeStandardDualGraphInput(graph);
    if (!normalized.isValid) {
      return {
        format: 'Graph : [genera] [half-edges at vertices] [(edge half-edge pairs)]',
        graph: null,
        text: '',
        decorations: {}
      };
    }
    return {
      format: 'Graph : [genera] [half-edges at vertices] [(edge half-edge pairs)]',
      graph: standardDualGraphPlain(normalized),
      text: formatStandardDualGraphText(normalized),
      decorations: { ...normalized.decorations }
    };
  }

  function conciseStandardDualGraphExport(graphData) {
    return conciseStandardDualGraphRecordExport(exportStandardDualGraphRecord(graphData));
  }

  function conciseStandardDualGraphRecordExport(standard) {
    const decorations = standard.decorations || {};
    return Object.keys(decorations).length
      ? { graph: standard.text, decorations }
      : standard.text;
  }

  function formatConciseDualGraphPayload(payload) {
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload) && payload.every((entry) => typeof entry === 'string')) {
      return payload.join('\n');
    }
    return JSON.stringify(payload, null, 2);
  }

  function stableDecorationKey(decorations) {
    const entries = Object.entries(decorations || {})
      .sort(([left], [right]) => Number(left) - Number(right));
    return JSON.stringify(Object.fromEntries(entries));
  }

  function standardDualGraphFromGraphData(graphData) {
    const vertexOrder = graphData.vertices.map((vertex) => vertex.index);
    const vertexPosition = new Map(vertexOrder.map((index, position) => [index, position]));
    const genera = graphData.vertices.map((vertex) => (
      Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0
    ));
    const legs = genera.map(() => []);
    const edges = [];
    const decorations = {};
    let nextHalfEdge = 1;
    const usedHalfEdges = new Set();
    const reservedHalfEdges = new Set();
    graphData.edges.forEach((edge) => {
      const edgeHalfEdges = Array.isArray(edge.halfEdges) ? edge.halfEdges : [edge.fromHalfEdge, edge.toHalfEdge];
      edgeHalfEdges.forEach((halfEdge) => {
        const value = Number(halfEdge);
        if (Number.isInteger(value)) reservedHalfEdges.add(value);
      });
    });
    graphData.legs.forEach((leg) => {
      const value = Number(leg.halfEdge);
      if (Number.isInteger(value)) reservedHalfEdges.add(value);
    });

    const allocateHalfEdge = (preferred) => {
      const candidate = Number(preferred);
      if (Number.isInteger(candidate) && !usedHalfEdges.has(candidate)) {
        usedHalfEdges.add(candidate);
        nextHalfEdge = Math.max(nextHalfEdge, candidate + 1);
        return candidate;
      }
      while (usedHalfEdges.has(nextHalfEdge) || reservedHalfEdges.has(nextHalfEdge)) nextHalfEdge += 1;
      const halfEdge = nextHalfEdge;
      usedHalfEdges.add(halfEdge);
      nextHalfEdge += 1;
      return halfEdge;
    };

    graphData.edges.forEach((edge) => {
      const from = vertexPosition.get(edge.from);
      const to = vertexPosition.get(edge.to);
      if (from == null || to == null) return;
      const edgeHalfEdges = Array.isArray(edge.halfEdges) ? edge.halfEdges : [edge.fromHalfEdge, edge.toHalfEdge];
      const fromHalfEdge = allocateHalfEdge(edgeHalfEdges[0]);
      const toHalfEdge = allocateHalfEdge(edgeHalfEdges[1]);
      legs[from].push(fromHalfEdge);
      legs[to].push(toHalfEdge);
      edges.push([fromHalfEdge, toHalfEdge]);
    });

    graphData.legs.forEach((leg) => {
      const vertex = vertexPosition.get(leg.vertex);
      if (vertex == null) return;
      const halfEdge = allocateHalfEdge(leg.halfEdge);
      legs[vertex].push(halfEdge);
      const label = normalizeHalfEdgeDecoration(leg.label);
      if (label) decorations[halfEdge] = label;
    });

    return { genera, legs, edges, decorations };
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

      const label = leg.label || halfEdgeDecorationValue(halfEdgeDecorationKey(leg));
      if (label) drawPlainTextLabel(ctx, legNode.x, legNode.y - 14, label, '#991b1b', 10);
    });

    // Draw vertices on top
    graphData.vertices.forEach((vertex) => {
      const node = layout.nodeMap.get(`v${vertex.index}`);
      if (node) {
        drawDualGraphVertex(ctx, node.x, node.y, Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0);
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

  function renderAlgebraicCurveVisualization(graphData, updateEnergyStatus = true) {
    if (!state.showAlgebraicCurveCanvas) return;
    const canvas = refs.algebraicCurveCanvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayWidth = Math.round(rect.width) || canvas.width || 300;
    const displayHeight = Math.round(rect.height) || canvas.height || 280;
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

    ensureDualGraphLayout(graphData);
    const model = calculateAlgebraicCurveModel(graphData, width, height);
    state.algebraicCurveModel = model;
    if (!model.curves.length) return;

    model.curves.forEach((curve) => drawAlgebraicCurve(ctx, curve, true));
    model.curves.forEach((curve) => drawAlgebraicCurve(ctx, curve, false));
    drawAlgebraicUnexpectedCrossings(ctx, model);
    drawAlgebraicCurveLabels(ctx, model);
    drawAlgebraicIntersections(ctx, model);
    if (state.showAlgebraicTangentHandles) drawAlgebraicTangentHandles(ctx, model);
    drawAlgebraicMarkedPoints(ctx, model, width, height);
    if (updateEnergyStatus && !state.algebraicOptimizationRunning) {
      syncAlgebraicEnergyStatus(algebraicCurveEnergy(model, width, height), null, false);
    }
  }

  function calculateAlgebraicCurveModel(graphData, width, height) {
    const layout = state.dualGraphLayout || ensureDualGraphLayout(graphData);
    const layoutMap = layout && layout.nodeMap ? layout.nodeMap : new Map();
    const sourcePoints = [];
    const vertexSources = new Map();

    graphData.vertices.forEach((vertex) => {
      const node = layoutMap.get(`v${vertex.index}`);
      const point = node
        ? { x: node.x, y: node.y }
        : { x: vertex.col, y: vertex.row };
      vertexSources.set(vertex.index, point);
      sourcePoints.push(point);
    });

    const edgeSources = graphData.edges.map((edge, edgeIndex) => {
      const source = algebraicEdgeSource(edge, edgeIndex, layoutMap, vertexSources);
      sourcePoints.push(source);
      return source;
    });
    const mapPoint = algebraicCanvasMapper(sourcePoints, width, height);
    const radius = clamp(Math.min(width, height) * 0.16, 28, 52);
    const curves = graphData.vertices.map((vertex, index) => {
      const center = mapPoint(vertexSources.get(vertex.index) || { x: vertex.col, y: vertex.row });
      return {
        vertexIndex: vertex.index,
        label: `C${index + 1}`,
        center,
        radius,
        color: algebraicCurveColor(index),
        decoration: Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0,
        incidences: [],
        pathPoints: []
      };
    });
    const curveMap = new Map(curves.map((curve) => [curve.vertexIndex, curve]));
    const intersections = [];
    const markedPoints = [];

    const addIncidence = (vertexIndex, incidence) => {
      const curve = curveMap.get(vertexIndex);
      if (curve) curve.incidences.push(incidence);
    };

    graphData.edges.forEach((edge, edgeIndex) => {
      const pointId = `edge:${edgeIndex}`;
      const point = algebraicPointWithOverride(pointId, mapPoint(edgeSources[edgeIndex]), width, height);
      const intersection = {
        id: pointId,
        x: point.x,
        y: point.y,
        edgeIndex,
        kind: edge.from === edge.to ? 'self' : 'node',
        vertexIndex: edge.from
      };
      intersections.push(intersection);

      if (edge.from === edge.to) {
        const curve = curveMap.get(edge.from);
        const center = curve ? curve.center : intersection;
        const tangentKey = algebraicTangentKey(pointId);
        const primaryTangent = algebraicTangentWithOverride(tangentKey, normalizeVector(intersection.x - center.x, intersection.y - center.y, 1, 0));
        const secondaryTangent = algebraicOrientedPerpendicular(primaryTangent, {
          x: Math.cos(algebraicSpokeAngle(edge.toSpoke, 0)),
          y: Math.sin(algebraicSpokeAngle(edge.toSpoke, Math.PI / 2))
        });
        intersection.tangentKey = tangentKey;
        intersection.tangent = primaryTangent;
        addIncidence(edge.from, {
          kind: 'loop',
          edgeIndex,
          branch: 0,
          tangentKey,
          spoke: edge.fromSpoke,
          point: intersection,
          tangent: primaryTangent
        });
        addIncidence(edge.to, {
          kind: 'loop',
          edgeIndex,
          branch: 1,
          tangentKey,
          spoke: edge.toSpoke,
          point: intersection,
          tangent: secondaryTangent
        });
        return;
      }

      const fromCurve = curveMap.get(edge.from);
      const toCurve = curveMap.get(edge.to);
      const tangentKey = algebraicTangentKey(pointId);
      const edgeTangent = algebraicTangentWithOverride(tangentKey, normalizeVector(
        (toCurve ? toCurve.center.x : intersection.x + 1) - (fromCurve ? fromCurve.center.x : intersection.x),
        (toCurve ? toCurve.center.y : intersection.y) - (fromCurve ? fromCurve.center.y : intersection.y),
        1,
        0
      ));
      const toFallback = toCurve
        ? normalizeVector(intersection.x - toCurve.center.x, intersection.y - toCurve.center.y, -edgeTangent.y, edgeTangent.x)
        : { x: -edgeTangent.y, y: edgeTangent.x };
      const normalTangent = algebraicOrientedPerpendicular(edgeTangent, toFallback);
      intersection.tangentKey = tangentKey;
      intersection.tangent = edgeTangent;
      addIncidence(edge.from, {
        kind: 'edge',
        edgeIndex,
        tangentKey,
        spoke: edge.fromSpoke,
        point: intersection,
        tangent: edgeTangent
      });
      addIncidence(edge.to, {
        kind: 'edge',
        edgeIndex,
        tangentKey,
        spoke: edge.toSpoke,
        point: intersection,
        tangent: normalTangent
      });
    });

    relaxAlgebraicPoints(curves, intersections, [], width, height);
    curves.forEach((curve) => {
      curve.pathPoints = algebraicCurvePathPoints(curve, width, height);
    });
    placeAlgebraicMarksOnCurves(graphData, curves, markedPoints, width, height);

    const model = { curves, intersections, markedPoints, unexpectedCrossings: [] };
    model.unexpectedCrossings = algebraicUnexpectedCrossings(model, width, height);
    return model;
  }

  function placeAlgebraicMarksOnCurves(graphData, curves, markedPoints, width, height) {
    const curveMap = new Map(curves.map((curve) => [curve.vertexIndex, curve]));
    const legsByVertex = new Map();
    graphData.legs.forEach((leg, legIndex) => {
      if (!legsByVertex.has(leg.vertex)) legsByVertex.set(leg.vertex, []);
      legsByVertex.get(leg.vertex).push({ leg, legIndex });
    });

    legsByVertex.forEach((entries, vertexIndex) => {
      const curve = curveMap.get(vertexIndex);
      const samples = curve ? algebraicCurveSamples(curve.pathPoints, 18) : [];
      entries.forEach(({ leg, legIndex }, entryIndex) => {
        const sampled = sampleAlgebraicMarkOnCurve(samples, vertexIndex, legIndex, entryIndex, entries.length)
          || { x: curve ? curve.center.x : 0, y: curve ? curve.center.y : 0, tangent: { x: 1, y: 0 } };
        const pointId = `leg:${legIndex}`;
        const target = algebraicPointWithOverride(pointId, sampled, width, height);
        const point = projectPointToSamples(target, samples) || sampled;
        const tangentKey = algebraicTangentKey(pointId);
        const overrideTangent = algebraicOptionalTangentOverride(tangentKey);
        const tangent = overrideTangent || point.tangent || sampled.tangent || normalizeVector(
          Math.cos(algebraicSpokeAngle(leg.spoke, 0)),
          Math.sin(algebraicSpokeAngle(leg.spoke, 0)),
          1,
          0
        );
        markedPoints.push({
          id: pointId,
          x: point.x,
          y: point.y,
          legIndex,
          label: leg.label || halfEdgeDecorationValue(halfEdgeDecorationKey(leg)) || `p${legIndex + 1}`,
          vertexIndex,
          tangentKey,
          tangent
        });
      });
    });
  }

  function sampleAlgebraicMarkOnCurve(samples, vertexIndex, legIndex, entryIndex, entryCount) {
    if (!samples.length) return null;
    if (samples.length === 1) {
      return { x: samples[0].x, y: samples[0].y, tangent: { x: 1, y: 0 } };
    }

    const random = seededRandom((vertexIndex + 1) * 1009 + (legIndex + 1) * 9173);
    const low = 0.14;
    const high = 0.86;
    const base = entryCount > 1 ? (entryIndex + 0.5) / entryCount : random();
    const jitter = (random() - 0.5) * Math.min(0.22, 0.48 / Math.max(entryCount, 1));
    const t = clamp(low + (high - low) * clamp(base + jitter, 0, 1), low, high);
    const position = t * (samples.length - 1);
    const index = clamp(Math.round(position), 0, samples.length - 1);
    const previous = samples[Math.max(0, index - 1)];
    const current = samples[index];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    return {
      x: current.x,
      y: current.y,
      tangent: normalizeVector(next.x - previous.x, next.y - previous.y, 1, 0)
    };
  }

  function projectPointToSamples(point, samples) {
    if (!point || !samples || !samples.length) return null;
    if (samples.length === 1) {
      return { x: samples[0].x, y: samples[0].y, tangent: { x: 1, y: 0 } };
    }

    let bestIndex = 0;
    let bestDistance = Infinity;
    samples.forEach((sample, index) => {
      const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const previous = samples[Math.max(0, bestIndex - 1)];
    const current = samples[bestIndex];
    const next = samples[Math.min(samples.length - 1, bestIndex + 1)];
    return {
      x: current.x,
      y: current.y,
      tangent: normalizeVector(next.x - previous.x, next.y - previous.y, 1, 0)
    };
  }

  function algebraicEdgeSource(edge, edgeIndex, layoutMap, vertexSources) {
    if (edge.from === edge.to) {
      const loopNode = layoutMap.get(`e${edgeIndex}_1`)
        || layoutMap.get(`e${edgeIndex}_0`)
        || layoutMap.get(`e${edgeIndex}_2`);
      if (loopNode) return { x: loopNode.x, y: loopNode.y };
      const center = vertexSources.get(edge.from) || { x: 0, y: 0 };
      const angle = (edgeIndex * Math.PI * 0.72) - Math.PI / 2;
      return {
        x: center.x + Math.cos(angle) * 44,
        y: center.y + Math.sin(angle) * 44
      };
    }

    const edgeNode = layoutMap.get(`e${edgeIndex}`);
    if (edgeNode) return { x: edgeNode.x, y: edgeNode.y };
    const from = vertexSources.get(edge.from) || { x: 0, y: 0 };
    const to = vertexSources.get(edge.to) || from;
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
  }

  function algebraicLegSource(leg, legIndex, layoutMap, vertexSources) {
    const legNode = layoutMap.get(`l${legIndex}`);
    if (legNode) return { x: legNode.x, y: legNode.y };
    const center = vertexSources.get(leg.vertex) || { x: 0, y: 0 };
    const angle = algebraicSpokeAngle(leg.spoke, legIndex * Math.PI * 0.5);
    return {
      x: center.x + Math.cos(angle) * 54,
      y: center.y + Math.sin(angle) * 54
    };
  }

  function algebraicCanvasMapper(points, width, height) {
    const padding = clamp(Math.min(width, height) * 0.16, 34, 56);
    const bounds = pointBounds(points);
    const sourceWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const sourceHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const targetWidth = Math.max(width - (padding * 2), 1);
    const targetHeight = Math.max(height - (padding * 2), 1);
    const scale = points.length <= 1 ? 1 : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const sourceCenter = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
    const targetCenter = { x: width / 2, y: height / 2 };
    return (point) => ({
      x: targetCenter.x + ((point.x - sourceCenter.x) * scale),
      y: targetCenter.y + ((point.y - sourceCenter.y) * scale)
    });
  }

  function startAlgebraicCurveOptimization(graphData) {
    const canvas = refs.algebraicCurveCanvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width) || canvas.width || 300;
    const height = Math.round(rect.height) || canvas.height || 280;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const baseModel = calculateAlgebraicCurveModel(graphData, width, height);
    const points = algebraicOptimizablePoints(baseModel);
    if (!points.length) {
      syncAlgebraicEnergyStatus(algebraicCurveEnergy(baseModel, width, height), null, false, 'no movable points', baseModel, width, height);
      return;
    }

    stopAlgebraicCurveOptimization();
    const bestEnergy = algebraicCurveEnergy(baseModel, width, height);
    state.algebraicOptimizationRunning = true;
    state.algebraicOptimization = {
      graphData,
      width,
      height,
      points,
      bestOverrides: { ...state.algebraicPointOverrides },
      bestTangentOverrides: { ...state.algebraicTangentOverrides },
      bestEnergy,
      currentEnergy: bestEnergy,
      step: Math.max(8, Math.min(width, height) * 0.1),
      angleStep: Math.PI / 9,
      iteration: 0,
      staleIterations: 0,
      random: seededRandom(Math.round(bestEnergy * 1000) + points.length * 7919)
    };
    syncAlgebraicOptimizationControls();
    animateAlgebraicCurveOptimization();
  }

  function stopAlgebraicCurveOptimization() {
    if (state.algebraicOptimizationFrame != null) {
      cancelAnimationFrame(state.algebraicOptimizationFrame);
    }
    state.algebraicOptimizationFrame = null;
    state.algebraicOptimizationRunning = false;
    state.algebraicOptimization = null;
    syncAlgebraicOptimizationControls();
  }

  function animateAlgebraicCurveOptimization() {
    const opt = state.algebraicOptimization;
    if (!state.algebraicOptimizationRunning || !opt || !state.dualGraphData || !state.showAlgebraicCurveCanvas) {
      stopAlgebraicCurveOptimization();
      return;
    }

    const attemptsPerFrame = 5;
    let accepted = false;
    for (let attempt = 0; attempt < attemptsPerFrame; attempt += 1) {
      const result = algebraicOptimizationStep(opt);
      accepted = accepted || result.accepted;
      if (result.done) {
        state.algebraicPointOverrides = opt.bestOverrides;
        state.algebraicTangentOverrides = opt.bestTangentOverrides;
        renderAlgebraicCurveVisualization(opt.graphData, false);
        syncAlgebraicEnergyStatus(opt.bestEnergy, null, false, '', state.algebraicCurveModel, opt.width, opt.height);
        stopAlgebraicCurveOptimization();
        return;
      }
    }

    state.algebraicPointOverrides = opt.bestOverrides;
    state.algebraicTangentOverrides = opt.bestTangentOverrides;
    renderAlgebraicCurveVisualization(opt.graphData, false);
    syncAlgebraicEnergyStatus(opt.currentEnergy, opt.bestEnergy, accepted, '', state.algebraicCurveModel, opt.width, opt.height);
    state.algebraicOptimizationFrame = requestAnimationFrame(animateAlgebraicCurveOptimization);
  }

  function algebraicOptimizationStep(opt) {
    opt.iteration += 1;
    const candidateOverrides = { ...opt.bestOverrides };
    const candidateTangentOverrides = { ...opt.bestTangentOverrides };
    const count = opt.iteration < 120 ? Math.min(opt.points.length, 2) : 1;
    for (let move = 0; move < count; move += 1) {
      const point = opt.points[Math.floor(opt.random() * opt.points.length)];
      const current = candidateOverrides[point.id] || { x: point.x, y: point.y };
      const angle = opt.random() * Math.PI * 2;
      const distance = opt.step * (0.2 + opt.random() * 0.85);
      candidateOverrides[point.id] = {
        x: clamp(current.x + Math.cos(angle) * distance, 10, opt.width - 10),
        y: clamp(current.y + Math.sin(angle) * distance, 10, opt.height - 10)
      };
    }
    const tangentMoveCount = Math.max(1, Math.min(3, Math.ceil(opt.points.length / 3)));
    for (let move = 0; move < tangentMoveCount; move += 1) {
      const point = opt.points[Math.floor(opt.random() * opt.points.length)];
      const key = algebraicTangentKey(point.id);
      const current = candidateTangentOverrides[key] || point.tangent || { x: 1, y: 0 };
      const delta = (opt.random() - 0.5) * 2 * opt.angleStep;
      candidateTangentOverrides[key] = rotateVector(current, delta);
    }

    const previousOverrides = state.algebraicPointOverrides;
    const previousTangentOverrides = state.algebraicTangentOverrides;
    state.algebraicPointOverrides = candidateOverrides;
    state.algebraicTangentOverrides = candidateTangentOverrides;
    const candidate = calculateAlgebraicCurveModel(opt.graphData, opt.width, opt.height);
    const energy = algebraicCurveEnergy(candidate, opt.width, opt.height);
    state.algebraicPointOverrides = previousOverrides;
    state.algebraicTangentOverrides = previousTangentOverrides;
    opt.currentEnergy = energy;

    if (energy < opt.bestEnergy) {
      opt.bestEnergy = energy;
      opt.bestOverrides = candidateOverrides;
      opt.bestTangentOverrides = candidateTangentOverrides;
      opt.staleIterations = 0;
      opt.step = Math.min(opt.step * 1.012, Math.min(opt.width, opt.height) * 0.13);
      opt.angleStep = Math.min(opt.angleStep * 1.01, Math.PI / 5);
      return { accepted: true, done: false };
    }

    opt.staleIterations += 1;
    opt.step *= 0.985;
    opt.angleStep *= 0.987;
    const done = opt.iteration >= 420 || opt.step < 0.8 || opt.staleIterations > 160;
    return { accepted: false, done };
  }

  function syncAlgebraicOptimizationControls() {
    if (refs.optimizeAlgebraicCurve) {
      refs.optimizeAlgebraicCurve.textContent = state.algebraicOptimizationRunning ? 'Stop optimization' : 'Timed optimization';
      refs.optimizeAlgebraicCurve.disabled = !state.showAlgebraicCurveCanvas || !state.dualGraphData;
    }
    if (!state.algebraicOptimizationRunning && refs.algebraicEnergyStatus) {
      const model = state.algebraicCurveModel;
      if (!model || !refs.algebraicCurveCanvas) {
        refs.algebraicEnergyStatus.textContent = '';
      }
    }
  }

  function syncAlgebraicEnergyStatus(currentEnergy, bestEnergy, accepted, suffix = '', modelForBreakdown = null, width = null, height = null) {
    if (!refs.algebraicEnergyStatus) return;
    const displayEnergy = Number.isFinite(bestEnergy) ? bestEnergy : currentEnergy;
    const energyText = Number.isFinite(displayEnergy) ? displayEnergy.toFixed(1) : '-';
    const hasTrial = Number.isFinite(bestEnergy) && Number.isFinite(currentEnergy) && Math.abs(currentEnergy - bestEnergy) > 0.05;
    const trialText = Number.isFinite(currentEnergy) ? currentEnergy.toFixed(1) : '-';
    const breakdownModel = modelForBreakdown || state.algebraicCurveModel;
    const breakdownWidth = Number.isFinite(width) ? width : (refs.algebraicCurveCanvas ? refs.algebraicCurveCanvas.width : null);
    const breakdownHeight = Number.isFinite(height) ? height : (refs.algebraicCurveCanvas ? refs.algebraicCurveCanvas.height : null);
    const breakdown = breakdownModel && Number.isFinite(breakdownWidth) && Number.isFinite(breakdownHeight)
      ? algebraicEnergyBreakdownText(breakdownModel, breakdownWidth, breakdownHeight)
      : '';
    const text = hasTrial && !accepted
      ? `energy ${energyText} / trial ${trialText}`
      : `energy ${energyText}`;
    const parts = [text];
    if (breakdown) parts.push(breakdown);
    if (suffix) parts.push(suffix);
    refs.algebraicEnergyStatus.textContent = parts.join(' - ');
  }

  function syncAlgebraicEnergyTermControls() {
    if (!refs.algebraicEnergyTermInputs) return;
    refs.algebraicEnergyTermInputs.forEach((input) => {
      const term = input.dataset.algebraicEnergyTerm;
      if (Object.prototype.hasOwnProperty.call(state.algebraicEnergyTerms, term)) {
        input.checked = !!state.algebraicEnergyTerms[term];
      }
    });
  }

  function algebraicOptimizablePoints(model) {
    const points = (model.intersections || []).concat(model.markedPoints || []);
    return points
      .filter((point) => point && point.id && !state.algebraicUserPointLocks[point.id]);
  }

  function algebraicCurveEnergy(model, width, height) {
    const totals = algebraicCurveEnergyParts(model, width, height);
    const terms = state.algebraicEnergyTerms || {};
    return Object.entries(totals).reduce((sum, [term, value]) => (
      terms[term] === false ? sum : sum + value
    ), 0);
  }

  function algebraicEnergyBreakdownText(model, width, height) {
    const totals = algebraicCurveEnergyParts(model, width, height);
    const terms = state.algebraicEnergyTerms || {};
    return ['bend', 'length', 'crossing', 'spacing', 'boundary']
      .filter((term) => terms[term] !== false)
      .map((term) => `${term} ${totals[term].toFixed(1)}`)
      .join(', ');
  }

  function algebraicCurveEnergyParts(model, width, height) {
    const energy = {
      bend: 0,
      length: 0,
      crossing: 0,
      spacing: 0,
      boundary: 0
    };
    model.curves.forEach((curve) => {
      const samples = algebraicCurveSamples(curve.pathPoints, 10);
      for (let index = 1; index + 1 < samples.length; index += 1) {
        const left = normalizeVector(samples[index].x - samples[index - 1].x, samples[index].y - samples[index - 1].y, 1, 0);
        const right = normalizeVector(samples[index + 1].x - samples[index].x, samples[index + 1].y - samples[index].y, left.x, left.y);
        const angle = Math.acos(clamp((left.x * right.x) + (left.y * right.y), -1, 1));
        energy.bend += angle * angle * 120;
      }
      for (let index = 0; index + 1 < samples.length; index += 1) {
        energy.length += Math.hypot(samples[index + 1].x - samples[index].x, samples[index + 1].y - samples[index].y) * 0.006;
      }
    });

    (model.unexpectedCrossings || []).forEach(() => {
      energy.crossing += 160;
    });
    const points = (model.intersections || []).concat(model.markedPoints || []);
    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const distance = Math.hypot(points[left].x - points[right].x, points[left].y - points[right].y);
        if (distance < 24) energy.spacing += (24 - distance) * 8;
      }
    }
    points.forEach((point) => {
      const edgeDistance = Math.min(point.x, width - point.x, point.y, height - point.y);
      if (edgeDistance < 16) energy.boundary += (16 - edgeDistance) * 10;
    });
    return energy;
  }

  function algebraicPointWithOverride(id, point, width, height) {
    const override = state.algebraicPointOverrides ? state.algebraicPointOverrides[id] : null;
    if (!override) return point;
    return {
      x: clamp(Number(override.x), 8, width - 8),
      y: clamp(Number(override.y), 8, height - 8)
    };
  }

  function algebraicTangentWithOverride(id, fallback) {
    const override = state.algebraicTangentOverrides ? state.algebraicTangentOverrides[id] : null;
    if (!override) return fallback;
    return normalizeVector(Number(override.x), Number(override.y), fallback.x, fallback.y);
  }

  function algebraicOptionalTangentOverride(id) {
    const override = state.algebraicTangentOverrides ? state.algebraicTangentOverrides[id] : null;
    if (!override) return null;
    return normalizeVector(Number(override.x), Number(override.y), 1, 0);
  }

  function rotateVector(vector, angle) {
    const source = normalizeVector(Number(vector.x), Number(vector.y), 1, 0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return normalizeVector(
      source.x * cos - source.y * sin,
      source.x * sin + source.y * cos,
      source.x,
      source.y
    );
  }

  function algebraicOrientedPerpendicular(tangent, preferred) {
    const normal = normalizeVector(-tangent.y, tangent.x, 0, 1);
    const preferredDirection = preferred
      ? normalizeVector(preferred.x, preferred.y, normal.x, normal.y)
      : normal;
    return ((normal.x * preferredDirection.x) + (normal.y * preferredDirection.y)) < 0
      ? { x: -normal.x, y: -normal.y }
      : normal;
  }

  function algebraicTangentKey(pointId) {
    return `${pointId}:tangent`;
  }

  function relaxAlgebraicPoints(curves, intersections, markedPoints, width, height) {
    const nodes = intersections.concat(markedPoints);
    const movable = nodes.filter((node) => !state.algebraicPointOverrides[node.id]);
    if (!movable.length) return;

    for (let pass = 0; pass < 12; pass += 1) {
      const deltas = new Map(movable.map((node) => [node.id, { x: 0, y: 0, count: 0 }]));
      curves.forEach((curve) => {
        const ordered = algebraicSimpleIncidenceOrder(curve.incidences, curve.center);
        for (let index = 1; index + 1 < ordered.length; index += 1) {
          const current = ordered[index];
          if (!deltas.has(current.point.id)) continue;
          const previous = ordered[index - 1].point;
          const next = ordered[index + 1].point;
          const target = {
            x: (previous.x + next.x) / 2,
            y: (previous.y + next.y) / 2
          };
          const delta = deltas.get(current.point.id);
          delta.x += (target.x - current.point.x) * 0.14;
          delta.y += (target.y - current.point.y) * 0.14;
          delta.count += 1;
        }
      });

      movable.forEach((node) => {
        const delta = deltas.get(node.id);
        if (!delta || !delta.count) return;
        node.x = clamp(node.x + delta.x / delta.count, 10, width - 10);
        node.y = clamp(node.y + delta.y / delta.count, 10, height - 10);
      });
    }
  }

  function algebraicIncidenceAngle(incidence, center) {
    if (Number.isInteger(incidence.spoke)) {
      return normalizeAngle(algebraicSpokeAngle(incidence.spoke, 0));
    }
    return normalizeAngle(Math.atan2(incidence.point.y - center.y, incidence.point.x - center.x));
  }

  function algebraicSpokeAngle(spoke, fallback) {
    const lattice = getLattice();
    const normalized = normalizeDir(spoke, lattice.sides);
    return Number.isInteger(normalized) && Number.isFinite(lattice.angles[normalized])
      ? lattice.angles[normalized]
      : fallback;
  }

  function algebraicIncidenceTieBreak(incidence) {
    if (incidence.kind === 'loop') return 10000 + (incidence.edgeIndex * 2) + (incidence.branch || 0);
    if (incidence.kind === 'edge') return 20000 + incidence.edgeIndex;
    if (incidence.kind === 'leg') return 30000 + incidence.legIndex;
    return 40000;
  }

  function algebraicCurvePathPoints(curve, width, height) {
    const ordered = algebraicSimpleIncidenceOrder(curve.incidences, curve.center);
    const anchors = ordered.map((incidence, index) => {
      const tangent = algebraicRouteTangent(ordered, index, curve.center);
      incidence.renderTangent = tangent;
      return {
        x: incidence.point.x,
        y: incidence.point.y,
        tangent,
        incidence
      };
    });
    if (!anchors.length) {
      const tangent = algebraicEscapeDirection(curve.center, null, width, height, -1);
      const start = algebraicCanvasExitPoint(curve.center, { x: -tangent.x, y: -tangent.y }, width, height);
      const end = algebraicCanvasExitPoint(curve.center, tangent, width, height);
      return [
        { ...start, tangent },
        { x: curve.center.x, y: curve.center.y, tangent },
        { ...end, tangent }
      ];
    }

    const startDirection = algebraicEscapeDirection(anchors[0], anchors[1] || curve.center, width, height, -1);
    const endDirection = algebraicEscapeDirection(anchors[anchors.length - 1], anchors[anchors.length - 2] || curve.center, width, height, 1);
    const start = algebraicCanvasExitPoint(anchors[0], startDirection, width, height);
    const end = algebraicCanvasExitPoint(anchors[anchors.length - 1], endDirection, width, height);
    return [
      { ...start, tangent: startDirection },
      ...anchors,
      { ...end, tangent: endDirection }
    ];
  }

  function algebraicEscapeDirection(anchor, neighbor, width, height, side) {
    const away = neighbor
      ? normalizeVector(anchor.x - neighbor.x, anchor.y - neighbor.y, side, 0)
      : normalizeVector(anchor.x - width / 2, anchor.y - height / 2, side, 0);
    const boundary = normalizeVector(anchor.x - width / 2, anchor.y - height / 2, away.x, away.y);
    const candidates = [];
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16;
      candidates.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    candidates.push(away, boundary);
    let best = away;
    let bestScore = Infinity;
    candidates.forEach((candidate) => {
      const direction = normalizeVector(candidate.x, candidate.y, away.x, away.y);
      const exit = algebraicCanvasExitPoint(anchor, direction, width, height);
      const exitDistance = Math.hypot(exit.x - anchor.x, exit.y - anchor.y);
      const awayScore = 1 - ((direction.x * away.x) + (direction.y * away.y));
      const boundaryScore = 1 - ((direction.x * boundary.x) + (direction.y * boundary.y));
      const score = exitDistance * 0.018 + awayScore * 18 + boundaryScore * 7;
      if (score < bestScore) {
        bestScore = score;
        best = direction;
      }
    });
    return best;
  }

  function algebraicSimpleIncidenceOrder(incidences, center) {
    if (incidences.length <= 2) return incidences.slice();
    const ordered = incidences.slice().sort((left, right) => (
      algebraicIncidenceAngle(left, center) - algebraicIncidenceAngle(right, center)
      || algebraicIncidenceTieBreak(left) - algebraicIncidenceTieBreak(right)
    ));
    if (ordered.length > 6) return algebraicNearestRoute(ordered);

    const candidates = algebraicPermutations(ordered);
    let best = ordered;
    let bestScore = Infinity;
    candidates.forEach((candidate) => {
      const score = algebraicRouteScore(candidate);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    return best;
  }

  function algebraicNearestRoute(items) {
    const remaining = items.slice();
    const route = [remaining.shift()];
    while (remaining.length) {
      const last = route[route.length - 1];
      let bestIndex = 0;
      let bestDistance = Infinity;
      remaining.forEach((candidate, index) => {
        const distance = Math.hypot(candidate.point.x - last.point.x, candidate.point.y - last.point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      route.push(remaining.splice(bestIndex, 1)[0]);
    }
    return route;
  }

  function algebraicPermutations(items) {
    const result = [];
    const used = new Array(items.length).fill(false);
    const current = [];
    const build = () => {
      if (current.length === items.length) {
        result.push(current.slice());
        return;
      }
      for (let index = 0; index < items.length; index += 1) {
        if (used[index]) continue;
        used[index] = true;
        current.push(items[index]);
        build();
        current.pop();
        used[index] = false;
      }
    };
    build();
    return result;
  }

  function algebraicRouteScore(route) {
    let length = 0;
    let turn = 0;
    let duplicatePenalty = 0;
    for (let index = 0; index + 1 < route.length; index += 1) {
      const current = route[index].point;
      const next = route[index + 1].point;
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      length += distance;
      if (distance < 1.2) duplicatePenalty += 2000;
    }
    for (let index = 1; index + 1 < route.length; index += 1) {
      const previous = route[index - 1].point;
      const current = route[index].point;
      const next = route[index + 1].point;
      const left = normalizeVector(current.x - previous.x, current.y - previous.y, 1, 0);
      const right = normalizeVector(next.x - current.x, next.y - current.y, left.x, left.y);
      turn += Math.acos(clamp((left.x * right.x) + (left.y * right.y), -1, 1));
    }
    return length + (turn * 30) + duplicatePenalty;
  }

  function algebraicRouteTangent(route, index, center) {
    const current = route[index];
    if (current.tangent) {
      return normalizeVector(current.tangent.x, current.tangent.y, 1, 0);
    }
    const previous = route[index - 1];
    const next = route[index + 1];
    let tangent = null;

    if (previous && next) {
      tangent = normalizeVector(
        next.point.x - previous.point.x,
        next.point.y - previous.point.y,
        current.point.x - center.x,
        current.point.y - center.y
      );
    } else if (next) {
      tangent = normalizeVector(
        next.point.x - current.point.x,
        next.point.y - current.point.y,
        current.point.x - center.x,
        current.point.y - center.y
      );
    } else if (previous) {
      tangent = normalizeVector(
        current.point.x - previous.point.x,
        current.point.y - previous.point.y,
        current.point.x - center.x,
        current.point.y - center.y
      );
    }

    const intended = algebraicIncidenceTangent(current, center, index);
    if (!tangent || Math.hypot(tangent.x, tangent.y) < 0.001) return intended;
    if (((tangent.x * intended.x) + (tangent.y * intended.y)) < 0) {
      tangent = { x: -tangent.x, y: -tangent.y };
    }
    return normalizeVector(
      tangent.x + intended.x * 0.22,
      tangent.y + intended.y * 0.22,
      intended.x,
      intended.y
    );
  }

  function algebraicIncidenceTangent(incidence, center, fallbackIndex) {
    if (incidence.tangent) return normalizeVector(incidence.tangent.x, incidence.tangent.y, 1, 0);
    const angle = algebraicSpokeAngle(incidence.spoke, Math.atan2(incidence.point.y - center.y, incidence.point.x - center.x) + fallbackIndex * 0.47);
    return normalizeVector(Math.cos(angle), Math.sin(angle), 1, 0);
  }

  function algebraicCanvasExitPoint(point, direction, width, height) {
    const margin = Math.max(width, height) * 0.24;
    const dx = Math.abs(direction.x) < 0.001 ? 0.001 * Math.sign(direction.x || 1) : direction.x;
    const dy = Math.abs(direction.y) < 0.001 ? 0.001 * Math.sign(direction.y || 1) : direction.y;
    const candidates = [
      ((-margin) - point.x) / dx,
      ((width + margin) - point.x) / dx,
      ((-margin) - point.y) / dy,
      ((height + margin) - point.y) / dy
    ].filter((value) => value > 0);
    const distance = candidates.length ? Math.min(...candidates) : Math.max(width, height);
    return {
      x: point.x + direction.x * distance,
      y: point.y + direction.y * distance
    };
  }

  function drawAlgebraicCurve(ctx, curve, outline) {
    if (!curve.pathPoints || curve.pathPoints.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline ? 'rgba(255, 253, 248, 0.94)' : curve.color;
    ctx.lineWidth = outline ? 7 : 3;
    if (!outline) ctx.globalAlpha = 0.92;
    drawAlgebraicClosedSpline(ctx, curve.pathPoints);
    ctx.restore();
  }

  function drawAlgebraicClosedSpline(ctx, points) {
    const count = points.length;
    if (count < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 0; index + 1 < count; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      const handle = clamp(distance * 0.34, 18, 92);
      const currentTangent = current.tangent || normalizeVector(next.x - current.x, next.y - current.y, 1, 0);
      const nextTangent = next.tangent || currentTangent;
      ctx.bezierCurveTo(
        current.x + currentTangent.x * handle,
        current.y + currentTangent.y * handle,
        next.x - nextTangent.x * handle,
        next.y - nextTangent.y * handle,
        next.x,
        next.y
      );
    }
    ctx.stroke();
  }

  function algebraicUnexpectedCrossings(model, width, height) {
    const segments = [];
    model.curves.forEach((curve, curveIndex) => {
      const samples = algebraicCurveSamples(curve.pathPoints, 16);
      for (let index = 0; index + 1 < samples.length; index += 1) {
        const start = samples[index];
        const end = samples[index + 1];
        if (Math.hypot(end.x - start.x, end.y - start.y) < 0.1) continue;
        segments.push({
          curveIndex,
          segmentIndex: index,
          start,
          end
        });
      }
    });

    const expected = (model.intersections || []).concat(model.markedPoints || []);
    const crossings = [];
    for (let left = 0; left < segments.length; left += 1) {
      for (let right = left + 1; right < segments.length; right += 1) {
        const a = segments[left];
        const b = segments[right];
        if (a.curveIndex === b.curveIndex && Math.abs(a.segmentIndex - b.segmentIndex) <= 1) continue;
        const hit = segmentIntersection(a.start, a.end, b.start, b.end);
        if (!hit) continue;
        if (hit.x < 0 || hit.x > width || hit.y < 0 || hit.y > height) continue;
        if (expected.some((point) => Math.hypot(point.x - hit.x, point.y - hit.y) < 8)) continue;
        if (crossings.some((point) => Math.hypot(point.x - hit.x, point.y - hit.y) < 9)) continue;
        const over = algebraicCrossingOverSegment(model, a, b);
        crossings.push({
          x: hit.x,
          y: hit.y,
          underTangent: normalizeVector((over === a ? b : a).end.x - (over === a ? b : a).start.x, (over === a ? b : a).end.y - (over === a ? b : a).start.y, 1, 0),
          overTangent: normalizeVector(over.end.x - over.start.x, over.end.y - over.start.y, 1, 0),
          overColor: model.curves[over.curveIndex] ? model.curves[over.curveIndex].color : '#2563eb'
        });
      }
    }
    return crossings;
  }

  function algebraicCrossingOverSegment(model, a, b) {
    const leftCurve = model.curves[a.curveIndex];
    const rightCurve = model.curves[b.curveIndex];
    const leftWeight = (leftCurve ? leftCurve.vertexIndex : 0) + a.segmentIndex;
    const rightWeight = (rightCurve ? rightCurve.vertexIndex : 0) + b.segmentIndex;
    return leftWeight % 2 <= rightWeight % 2 ? a : b;
  }

  function algebraicCurveSamples(points, stepsPerSegment) {
    const samples = [];
    for (let index = 0; index + 1 < points.length; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      const handle = clamp(distance * 0.34, 18, 92);
      const currentTangent = current.tangent || normalizeVector(next.x - current.x, next.y - current.y, 1, 0);
      const nextTangent = next.tangent || currentTangent;
      const controlA = {
        x: current.x + currentTangent.x * handle,
        y: current.y + currentTangent.y * handle
      };
      const controlB = {
        x: next.x - nextTangent.x * handle,
        y: next.y - nextTangent.y * handle
      };
      for (let step = 0; step <= stepsPerSegment; step += 1) {
        if (index > 0 && step === 0) continue;
        samples.push(cubicPoint(current, controlA, controlB, next, step / stepsPerSegment));
      }
    }
    return samples;
  }

  function segmentIntersection(a, b, c, d) {
    const r = { x: b.x - a.x, y: b.y - a.y };
    const s = { x: d.x - c.x, y: d.y - c.y };
    const denominator = (r.x * s.y) - (r.y * s.x);
    if (Math.abs(denominator) < 0.0001) return null;
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const t = ((dx * s.y) - (dy * s.x)) / denominator;
    const u = ((dx * r.y) - (dy * r.x)) / denominator;
    if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
    return {
      x: a.x + r.x * t,
      y: a.y + r.y * t
    };
  }

  function projectPointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = (dx * dx) + (dy * dy);
    if (lengthSq < 0.0001) {
      return {
        point: { x: start.x, y: start.y },
        t: 0,
        distance: Math.hypot(point.x - start.x, point.y - start.y)
      };
    }
    const rawT = (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / lengthSq;
    const t = clamp(rawT, 0, 1);
    const projected = {
      x: start.x + (dx * t),
      y: start.y + (dy * t)
    };
    return {
      point: projected,
      t,
      distance: Math.hypot(point.x - projected.x, point.y - projected.y)
    };
  }

  function drawAlgebraicUnexpectedCrossings(ctx, model) {
    if (!model.unexpectedCrossings || !model.unexpectedCrossings.length) return;
    ctx.save();
    ctx.strokeStyle = '#fffdf8';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    model.unexpectedCrossings.forEach((crossing) => {
      const tangent = crossing.underTangent || { x: 1, y: 0 };
      const gap = 8;
      ctx.beginPath();
      ctx.moveTo(crossing.x - tangent.x * gap, crossing.y - tangent.y * gap);
      ctx.lineTo(crossing.x + tangent.x * gap, crossing.y + tangent.y * gap);
      ctx.stroke();
    });
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    model.unexpectedCrossings.forEach((crossing) => {
      const tangent = crossing.overTangent || { x: 1, y: 0 };
      const length = 10;
      ctx.strokeStyle = crossing.overColor || '#2563eb';
      ctx.beginPath();
      ctx.moveTo(crossing.x - tangent.x * length, crossing.y - tangent.y * length);
      ctx.lineTo(crossing.x + tangent.x * length, crossing.y + tangent.y * length);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawAlgebraicCurveLabels(ctx, model) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    model.curves.forEach((curve) => {
      const text = String(Math.max(0, curve.decoration || 0));
      const position = algebraicCurveLabelPosition(curve);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fffdf8';
      ctx.strokeText(text, position.x, position.y);
      ctx.fillStyle = curve.color;
      ctx.fillText(text, position.x, position.y);
    });
    ctx.restore();
  }

  function algebraicCurveLabelPosition(curve) {
    const points = (curve.pathPoints || []).filter((point) => point && point.incidence);
    if (!points.length) return curve.center;
    let best = points[0];
    let bestDistance = -Infinity;
    points.forEach((point) => {
      const distance = Math.hypot(point.x - curve.center.x, point.y - curve.center.y);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = point;
      }
    });
    const tangent = best.tangent || { x: 1, y: 0 };
    const normal = normalizeVector(-tangent.y, tangent.x, 0, 1);
    const away = normalizeVector(best.x - curve.center.x, best.y - curve.center.y, normal.x, normal.y);
    const side = ((normal.x * away.x) + (normal.y * away.y)) < 0 ? -1 : 1;
    return {
      x: best.x + normal.x * side * 11,
      y: best.y + normal.y * side * 11
    };
  }

  function drawAlgebraicTangentHandles(ctx, model) {
    const handles = algebraicTangentHandles(model);
    if (!handles.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(17, 17, 17, 0.62)';
    ctx.fillStyle = '#111111';
    ctx.lineWidth = 1.4;
    handles.forEach((handleInfo) => {
      const mark = handleInfo.mark;
      const tangent = handleInfo.tangent;
      const handle = {
        x: mark.x + tangent.x * 22,
        y: mark.y + tangent.y * 22
      };
      handleInfo.handle = handle;
      ctx.beginPath();
      ctx.moveTo(mark.x, mark.y);
      ctx.lineTo(handle.x, handle.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function algebraicTangentHandles(model) {
    const handlesByKey = new Map();
    (model.intersections || []).concat(model.markedPoints || []).forEach((point) => {
      if (!point.tangentKey || !point.tangent) return;
      if (!point.kind) return;
      handlesByKey.set(point.tangentKey, {
        mark: point,
        tangentKey: point.tangentKey,
        tangent: point.tangent,
        curveIndex: point.vertexIndex
      });
    });
    (model.curves || []).forEach((curve) => {
      (curve.incidences || []).forEach((incidence) => {
        if (!incidence.tangentKey || !incidence.point) return;
        if (handlesByKey.has(incidence.tangentKey)) return;
        handlesByKey.set(incidence.tangentKey, {
          mark: incidence.point,
          tangentKey: incidence.tangentKey,
          tangent: incidence.tangent || incidence.renderTangent || algebraicIntersectionFallbackTangent(curve, incidence.point),
          curveIndex: curve.vertexIndex
        });
      });
    });
    return Array.from(handlesByKey.values());
  }

  function algebraicIntersectionFallbackTangent(curve, mark) {
    if (!curve) return { x: 1, y: 0 };
    return normalizeVector(mark.x - curve.center.x, mark.y - curve.center.y, 1, 0);
  }

  function drawAlgebraicIntersections(ctx, model) {
    ctx.save();
    ctx.lineWidth = 1.5;
    model.intersections.forEach((mark) => {
      const radius = mark.kind === 'self' ? 5.4 : 4.6;
      ctx.fillStyle = '#fffdf8';
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (mark.kind === 'self') {
        ctx.beginPath();
        ctx.moveTo(mark.x - radius * 0.58, mark.y - radius * 0.58);
        ctx.lineTo(mark.x + radius * 0.58, mark.y + radius * 0.58);
        ctx.moveTo(mark.x - radius * 0.58, mark.y + radius * 0.58);
        ctx.lineTo(mark.x + radius * 0.58, mark.y - radius * 0.58);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(mark.x, mark.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  function drawAlgebraicMarkedPoints(ctx, model, width, height) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    model.markedPoints.forEach((mark) => {
      const curve = model.curves.find((item) => item.vertexIndex === mark.vertexIndex);
      const center = curve ? curve.center : { x: width / 2, y: height / 2 };
      const direction = normalizeVector(mark.x - center.x, mark.y - center.y, 1, 0);
      const labelX = clamp(mark.x + direction.x * 14, 12, width - 12);
      const labelY = clamp(mark.y + direction.y * 14, 12, height - 12);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fffdf8';
      ctx.strokeText(mark.label, labelX, labelY);
      ctx.fillStyle = '#991b1b';
      ctx.fillText(mark.label, labelX, labelY);
    });
    ctx.restore();
  }

  function algebraicCurveColor(index) {
    const colors = [
      '#2563eb',
      '#b23a48',
      '#1f7a8c',
      '#6a4c93',
      '#c47f17',
      '#047857',
      '#be185d',
      '#4b5563'
    ];
    return colors[index % colors.length];
  }

  function normalizeAngle(angle) {
    const full = Math.PI * 2;
    return ((angle % full) + full) % full;
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
        genus: Number.isInteger(Number(vertex.genus)) ? Number(vertex.genus) : 0,
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
        genus: Number.isInteger(Number(source.genus)) ? Number(source.genus) : 0,
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
      legsByVertex.get(leg.vertex).push({
        leg,
        label: leg.label || halfEdgeDecorationValue(halfEdgeDecorationKey(leg)) || String(index + 1)
      });
    });
    legsByVertex.forEach((entries, vertexIndex) => {
      const surface = surfaces.get(vertexIndex);
      if (!surface) return;
      const samples = sampleRiemannSurfaceInterior(surface, entries.length + surface.genus + 5);
      entries.forEach((entry, index) => {
        const point = samples.marked[index] || sampleRiemannSurfacePoint(surface, index + 17, 0.46);
        surface.marks.push({
          label: entry.label,
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
      if (mark.label) drawPlainTextLabel(ctx, mark.x + 8, mark.y - 8, mark.label, '#991b1b', 10, 'left');
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

  function handleRiemannSurfacePointerDown(event) {
    if (!state.showRiemannSurfaceCanvas || !state.riemannSurfaceModel || !state.dualGraphData || !refs.riemannSurfaceCanvas) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const canvas = refs.riemannSurfaceCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const hit = hitRiemannSurfaceComponent(state.riemannSurfaceModel, x, y, pointerHitRadius(event, 4, 18));
    state.selectedRiemannVertex = hit;
    if (state.showRiemannSurfaceCanvas) renderRiemannSurfaceVisualization(state.dualGraphData);
    event.preventDefault();
  }

  function hitRiemannSurfaceComponent(model, x, y, hitPadding = 4) {
    const surfaces = orderedRiemannSurfaces(model).slice().reverse();
    for (const surface of surfaces) {
      const bodyHit = Math.hypot(x - surface.x, y - surface.y) <= surfaceCoreRadius(surface) + Math.max(0, hitPadding - 4);
      if (bodyHit) return surface.vertexIndex;
      for (const arm of surface.arms) {
        if ((arm.nodes || []).some((node) => Math.hypot(x - node.x, y - node.y) <= node.radius + hitPadding)) {
          return surface.vertexIndex;
        }
      }
    }
    return null;
  }

  function handleAlgebraicCurvePointerDown(event) {
    if (!state.showAlgebraicCurveCanvas || !state.algebraicCurveModel || !refs.algebraicCurveCanvas) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const hit = algebraicCurvePointerHit(event);
    if (!hit) return;
    stopAlgebraicCurveOptimization();
    state.algebraicCurveDragging = hit;
    try { refs.algebraicCurveCanvas.setPointerCapture(event.pointerId); } catch (_) {}
    refs.algebraicCurveCanvas.style.cursor = hit.kind === 'tangent' ? 'crosshair' : 'grabbing';
    event.preventDefault();
  }

  function handleAlgebraicCurvePointerMove(event) {
    if (!state.showAlgebraicCurveCanvas || !refs.algebraicCurveCanvas) return;
    const point = algebraicCanvasPointFromEvent(event);
    if (!point) return;

    if (state.algebraicCurveDragging) {
      const drag = state.algebraicCurveDragging;
      if (drag.kind === 'point') {
        state.algebraicPointOverrides[drag.id] = {
          x: point.x,
          y: point.y
        };
      } else if (drag.kind === 'mark') {
        const projected = projectPointToAlgebraicCurve(point, drag.vertexIndex);
        if (projected) {
          state.algebraicPointOverrides[drag.id] = {
            x: projected.x,
            y: projected.y
          };
        }
      } else if (drag.kind === 'tangent') {
        const anchor = drag.anchor;
        state.algebraicTangentOverrides[drag.id] = normalizeVector(point.x - anchor.x, point.y - anchor.y, drag.tangent.x, drag.tangent.y);
      }
      if (state.dualGraphData) renderAlgebraicCurveVisualization(state.dualGraphData);
      event.preventDefault();
      return;
    }

    const hit = algebraicCurvePointerHit(event);
    refs.algebraicCurveCanvas.style.cursor = hit
      ? (hit.kind === 'tangent' ? 'crosshair' : 'grab')
      : 'default';
  }

  function handleAlgebraicCurvePointerUp(event) {
    if (state.algebraicCurveDragging) {
      state.algebraicCurveDragging = null;
      if (event && event.pointerId != null && refs.algebraicCurveCanvas) {
        try { refs.algebraicCurveCanvas.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      if (refs.algebraicCurveCanvas) refs.algebraicCurveCanvas.style.cursor = 'default';
    }
  }

  function handleAlgebraicCurveContextMenu(event) {
    if (!state.showAlgebraicCurveCanvas || !state.showAlgebraicTangentHandles || !state.algebraicCurveModel) return;
    const hit = algebraicCurvePointerHit(event);
    if (!hit || hit.kind !== 'tangent') return;
    event.preventDefault();
    const current = algebraicTangentWithOverride(hit.id, hit.tangent || { x: 1, y: 0 });
    state.algebraicTangentOverrides[hit.id] = {
      x: -current.x,
      y: -current.y
    };
    if (state.dualGraphData) renderAlgebraicCurveVisualization(state.dualGraphData);
  }

  function algebraicCurvePointerHit(event) {
    const point = algebraicCanvasPointFromEvent(event);
    const model = state.algebraicCurveModel;
    if (!point || !model) return null;
    if (state.showAlgebraicTangentHandles) {
      for (const handleInfo of algebraicTangentHandles(model)) {
        const mark = handleInfo.mark;
        const handle = {
          x: mark.x + handleInfo.tangent.x * 22,
          y: mark.y + handleInfo.tangent.y * 22
        };
        if (Math.hypot(point.x - handle.x, point.y - handle.y) <= pointerHitRadius(event, 8, 24)) {
          return {
            kind: 'tangent',
            id: handleInfo.tangentKey,
            anchor: { x: mark.x, y: mark.y },
            tangent: handleInfo.tangent
          };
        }
      }
    }
    for (const mark of model.markedPoints || []) {
      if (Math.hypot(point.x - mark.x, point.y - mark.y) <= pointerHitRadius(event, 8, 22)) {
        return {
          kind: 'mark',
          id: mark.id,
          tangentKey: mark.tangentKey,
          vertexIndex: mark.vertexIndex
        };
      }
    }
    for (const mark of model.intersections || []) {
      if (Math.hypot(point.x - mark.x, point.y - mark.y) <= pointerHitRadius(event, 8, 22)) {
        return {
          kind: 'point',
          id: mark.id
        };
      }
    }
    return null;
  }

  function projectPointToAlgebraicCurve(point, vertexIndex) {
    const model = state.algebraicCurveModel;
    if (!model || !point) return null;
    const curve = (model.curves || []).find((item) => item.vertexIndex === vertexIndex);
    if (!curve || !curve.pathPoints || curve.pathPoints.length < 2) return null;
    const samples = algebraicCurveSamples(curve.pathPoints, 22);
    return projectPointToSamples(point, samples);
  }

  function algebraicCanvasPointFromEvent(event) {
    const canvas = refs.algebraicCurveCanvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
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

  function calculateGraphLayout(graphData, width, height, method = 'force') {
    // Initialize layout with virtual nodes for edges and loops
    const padding = 40;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - padding;

    const nodes = [];
    const nodeMap = new Map();
    const layoutMethod = normalizeDualGraphLayoutMethod(method);
    const vertexPositions = initialDualGraphVertexPositions(graphData, width, height, padding, layoutMethod);

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

    const layout = { nodes, nodeMap, width, height, method: layoutMethod };
    if (layoutMethod === 'spectral' || layoutMethod === 'kamada-kawai') {
      compactGraphLayout(layout, COMPACT_DUAL_GRAPH_LAYOUT_SCALE);
    }
    return layout;
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

  function initialDualGraphVertexPositions(graphData, width, height, padding, method = 'force') {
    const layoutMethod = normalizeDualGraphLayoutMethod(method);
    if (layoutMethod === 'shell') return shellDualGraphVertexPositions(graphData, width, height, padding);
    if (layoutMethod === 'spectral') return spectralDualGraphVertexPositions(graphData, width, height, padding);
    if (layoutMethod === 'kamada-kawai') return kamadaKawaiDualGraphVertexPositions(graphData, width, height, padding);

    const positions = new Map();
    if (!geometry || !Array.isArray(geometry.cells) || !graphData.vertices.length) return positions;

    const samples = graphData.vertices
      .map((vertex) => {
        const sourceIndex = Number.isInteger(Number(vertex.sourceIndex)) ? Number(vertex.sourceIndex) : vertex.index;
        const cell = geometry.cells[sourceIndex];
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

  function shellDualGraphVertexPositions(graphData, width, height, padding) {
    const positions = new Map();
    const vertices = graphData.vertices.map((vertex) => vertex.index);
    if (!vertices.length) return positions;

    const centerX = width / 2;
    const centerY = height / 2;
    if (vertices.length === 1) {
      positions.set(vertices[0], { x: centerX, y: centerY });
      return positions;
    }

    const adjacency = dualGraphVertexAdjacency(graphData);
    const root = vertices
      .map((index) => ({ index, degree: (adjacency.get(index) || new Set()).size }))
      .sort((left, right) => right.degree - left.degree || left.index - right.index)[0].index;
    const distances = dualGraphShortestDistancesFrom(root, vertices, adjacency);
    const shells = new Map();
    vertices.forEach((index) => {
      const distance = Number.isFinite(distances.get(index)) ? distances.get(index) : 0;
      if (!shells.has(distance)) shells.set(distance, []);
      shells.get(distance).push(index);
    });

    const orderedShells = Array.from(shells.entries()).sort((left, right) => left[0] - right[0]);
    const usableRadius = Math.max(Math.min(width, height) / 2 - padding, 1);
    const shellGap = usableRadius / Math.max(orderedShells.length, 1);
    orderedShells.forEach(([distance, members], shellIndex) => {
      members.sort((left, right) => left - right);
      if (distance === 0 && members.length === 1) {
        positions.set(members[0], { x: centerX, y: centerY });
        return;
      }
      const shellRadius = clamp(shellGap * Math.max(shellIndex, 1), 18, usableRadius);
      members.forEach((index, memberIndex) => {
        const angle = (Math.PI * -0.5) + (Math.PI * 2 * memberIndex / members.length);
        positions.set(index, {
          x: centerX + Math.cos(angle) * shellRadius,
          y: centerY + Math.sin(angle) * shellRadius
        });
      });
    });
    return positions;
  }

  function spectralDualGraphVertexPositions(graphData, width, height, padding) {
    const positions = new Map();
    const vertices = graphData.vertices.map((vertex) => vertex.index);
    if (!vertices.length) return positions;
    if (vertices.length === 1) {
      positions.set(vertices[0], { x: width / 2, y: height / 2 });
      return positions;
    }

    const matrix = dualGraphLaplacianMatrix(graphData, vertices);
    const eig = jacobiSymmetricEigen(matrix);
    const order = eig.values
      .map((value, index) => ({ value, index }))
      .sort((left, right) => left.value - right.value);
    const xVector = eig.vectors.map((row) => row[order[Math.min(1, order.length - 1)].index]);
    const yVector = eig.vectors.map((row) => row[order[Math.min(2, order.length - 1)].index]);
    const mapped = mapNormalizedCoordinates(vertices, xVector, yVector, width, height, padding);
    mapped.forEach((position, index) => positions.set(index, position));
    return positions;
  }

  function kamadaKawaiDualGraphVertexPositions(graphData, width, height, padding) {
    const vertices = graphData.vertices.map((vertex) => vertex.index);
    const positions = spectralDualGraphVertexPositions(graphData, width, height, padding);
    if (vertices.length <= 2) return positions;

    const adjacency = dualGraphVertexAdjacency(graphData);
    const distances = dualGraphAllPairsDistances(vertices, adjacency);
    const usable = Math.max(Math.min(width, height) - (padding * 2), 1);
    const idealScale = usable / Math.max(1, graphDiameter(distances));
    const entries = vertices.map((index) => ({
      index,
      x: (positions.get(index) || { x: width / 2 }).x,
      y: (positions.get(index) || { y: height / 2 }).y
    }));
    const n = entries.length;
    const maxIterations = Math.min(500, Math.max(120, n * n * 10));
    const step = 0.09;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const forces = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
      let maxForce = 0;
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const distance = distances[i][j];
          if (!Number.isFinite(distance) || distance <= 0) continue;
          const dx = entries[j].x - entries[i].x;
          const dy = entries[j].y - entries[i].y;
          const length = Math.hypot(dx, dy) || 0.0001;
          const ideal = idealScale * distance;
          const spring = 1 / (distance * distance);
          const force = spring * (length - ideal);
          const fx = (dx / length) * force;
          const fy = (dy / length) * force;
          forces[i].x += fx;
          forces[i].y += fy;
          forces[j].x -= fx;
          forces[j].y -= fy;
        }
      }

      for (let i = 0; i < n; i += 1) {
        const magnitude = Math.hypot(forces[i].x, forces[i].y);
        maxForce = Math.max(maxForce, magnitude);
        entries[i].x = clamp(entries[i].x + forces[i].x * step, padding, width - padding);
        entries[i].y = clamp(entries[i].y + forces[i].y * step, padding, height - padding);
      }
      if (maxForce < 0.01) break;
    }

    const fitted = fitPositionsToCanvas(entries, width, height, padding);
    fitted.forEach((position, index) => positions.set(index, position));
    return positions;
  }

  function dualGraphVertexAdjacency(graphData) {
    const adjacency = new Map();
    graphData.vertices.forEach((vertex) => adjacency.set(vertex.index, new Set()));
    graphData.edges.forEach((edge) => {
      if (!adjacency.has(edge.from) || !adjacency.has(edge.to) || edge.from === edge.to) return;
      adjacency.get(edge.from).add(edge.to);
      adjacency.get(edge.to).add(edge.from);
    });
    return adjacency;
  }

  function dualGraphShortestDistancesFrom(root, vertices, adjacency) {
    const distances = new Map(vertices.map((index) => [index, Infinity]));
    if (!distances.has(root)) return distances;
    distances.set(root, 0);
    const queue = [root];
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      const nextDistance = distances.get(current) + 1;
      (adjacency.get(current) || new Set()).forEach((next) => {
        if (nextDistance >= distances.get(next)) return;
        distances.set(next, nextDistance);
        queue.push(next);
      });
    }
    return distances;
  }

  function dualGraphAllPairsDistances(vertices, adjacency) {
    const raw = vertices.map((index) => dualGraphShortestDistancesFrom(index, vertices, adjacency));
    return raw.map((row) => vertices.map((index) => row.get(index)));
  }

  function graphDiameter(distances) {
    let diameter = 1;
    distances.forEach((row) => {
      row.forEach((distance) => {
        if (Number.isFinite(distance)) diameter = Math.max(diameter, distance);
      });
    });
    return diameter;
  }

  function dualGraphLaplacianMatrix(graphData, vertices) {
    const n = vertices.length;
    const indexMap = new Map(vertices.map((index, position) => [index, position]));
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    graphData.edges.forEach((edge) => {
      if (edge.from === edge.to) return;
      const from = indexMap.get(edge.from);
      const to = indexMap.get(edge.to);
      if (from == null || to == null) return;
      matrix[from][from] += 1;
      matrix[to][to] += 1;
      matrix[from][to] -= 1;
      matrix[to][from] -= 1;
    });
    return matrix;
  }

  function jacobiSymmetricEigen(matrix) {
    const n = matrix.length;
    const a = matrix.map((row) => row.slice());
    const vectors = Array.from({ length: n }, (_, row) => (
      Array.from({ length: n }, (_, col) => row === col ? 1 : 0)
    ));
    if (n <= 1) return { values: a.map((row, index) => row[index] || 0), vectors };

    const maxIterations = Math.min(1200, Math.max(40, n * n * 2));
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      let p = 0;
      let q = 1;
      let max = Math.abs(a[p][q]);
      for (let row = 0; row < n; row += 1) {
        for (let col = row + 1; col < n; col += 1) {
          const value = Math.abs(a[row][col]);
          if (value > max) {
            max = value;
            p = row;
            q = col;
          }
        }
      }
      if (max < 1e-9) break;

      const app = a[p][p];
      const aqq = a[q][q];
      const apq = a[p][q];
      const angle = 0.5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(angle);
      const s = Math.sin(angle);

      for (let row = 0; row < n; row += 1) {
        if (row === p || row === q) continue;
        const arp = a[row][p];
        const arq = a[row][q];
        a[row][p] = (c * arp) - (s * arq);
        a[p][row] = a[row][p];
        a[row][q] = (s * arp) + (c * arq);
        a[q][row] = a[row][q];
      }

      a[p][p] = (c * c * app) - (2 * s * c * apq) + (s * s * aqq);
      a[q][q] = (s * s * app) + (2 * s * c * apq) + (c * c * aqq);
      a[p][q] = 0;
      a[q][p] = 0;

      for (let row = 0; row < n; row += 1) {
        const vrp = vectors[row][p];
        const vrq = vectors[row][q];
        vectors[row][p] = (c * vrp) - (s * vrq);
        vectors[row][q] = (s * vrp) + (c * vrq);
      }
    }

    return {
      values: a.map((row, index) => row[index]),
      vectors
    };
  }

  function mapNormalizedCoordinates(vertices, xs, ys, width, height, padding) {
    const fallbackRadius = Math.max(Math.min(width, height) / 2 - padding, 1);
    if (!hasCoordinateSpread(xs) || !hasCoordinateSpread(ys)) {
      return new Map(vertices.map((index, i) => {
        const angle = (Math.PI * -0.5) + (Math.PI * 2 * i / vertices.length);
        return [index, {
          x: width / 2 + Math.cos(angle) * fallbackRadius,
          y: height / 2 + Math.sin(angle) * fallbackRadius
        }];
      }));
    }

    const entries = vertices.map((index, i) => ({ index, x: xs[i], y: ys[i] }));
    return fitPositionsToCanvas(entries, width, height, padding);
  }

  function hasCoordinateSpread(values) {
    if (!values.length) return false;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Number.isFinite(min) && Number.isFinite(max) && Math.abs(max - min) > 1e-8;
  }

  function fitPositionsToCanvas(entries, width, height, padding) {
    const positions = new Map();
    if (!entries.length) return positions;
    if (entries.length === 1) {
      positions.set(entries[0].index, { x: width / 2, y: height / 2 });
      return positions;
    }

    const minX = Math.min(...entries.map((entry) => entry.x));
    const maxX = Math.max(...entries.map((entry) => entry.x));
    const minY = Math.min(...entries.map((entry) => entry.y));
    const maxY = Math.max(...entries.map((entry) => entry.y));
    const sourceWidth = Math.max(maxX - minX, 1e-6);
    const sourceHeight = Math.max(maxY - minY, 1e-6);
    const targetWidth = Math.max(width - (padding * 2), 1);
    const targetHeight = Math.max(height - (padding * 2), 1);
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const sourceCenterX = (minX + maxX) / 2;
    const sourceCenterY = (minY + maxY) / 2;
    const targetCenterX = width / 2;
    const targetCenterY = height / 2;
    entries.forEach((entry) => {
      positions.set(entry.index, {
        x: clamp(targetCenterX + ((entry.x - sourceCenterX) * scale), padding, width - padding),
        y: clamp(targetCenterY + ((entry.y - sourceCenterY) * scale), padding, height - padding)
      });
    });
    return positions;
  }

  function compactGraphLayout(layout, scale) {
    const amount = Number.isFinite(scale) ? clamp(scale, 0.05, 4) : 1;
    if (amount === 1 || !layout || !Array.isArray(layout.nodes)) return layout;
    const centerX = layout.width / 2;
    const centerY = layout.height / 2;
    layout.nodes.forEach((node) => {
      node.x = centerX + ((node.x - centerX) * amount);
      node.y = centerY + ((node.y - centerY) * amount);
      node.vx = 0;
      node.vy = 0;
    });
    return layout;
  }

  function runForceSimulation(layout, graphData, iterations = 100) {
    // Deprecated - use animateDualGraphLayout instead
  }

  function animateDualGraphLayout() {
    if (!state.dualGraphAnimating || !state.dualGraphLayout || !state.dualGraphData) return;
    if (!isDualGraphVisualizationVisible()) {
      state.dualGraphAnimating = false;
      if (Number.isFinite(state.dualGraphLayout.startedAt)) {
        state.dualGraphLayoutTimings.force = layoutNow() - state.dualGraphLayout.startedAt;
        state.dualGraphLayout.startedAt = null;
      }
      if (refs.computeLayout) refs.computeLayout.textContent = 'Compute layout';
      syncDualGraphLayoutControls();
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
    } else if (Number.isFinite(layout.startedAt)) {
      state.dualGraphLayoutTimings.force = layoutNow() - layout.startedAt;
      layout.startedAt = null;
      syncDualGraphLayoutControls();
    }
  }

  function applyForces(layout, graphData, alpha) {
    const nodes = layout.nodes;
    const forceAlpha = Number.isFinite(alpha) ? Math.max(0, alpha) : 1;

    // Strong repulsion between all nodes
    const repulsionStrength = 2000 * forceAlpha;
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
    const edgeStrength = 0.1 * forceAlpha;
    const edgeLength = 80;
    graphData.edges.forEach((edge, i) => {
      const fromNode = layout.nodeMap.get(`v${edge.from}`);
      const toNode = layout.nodeMap.get(`v${edge.to}`);

      if (!fromNode || !toNode) return;

      if (edge.from === edge.to) {
        // Loop: connect vertex -> node0 -> node1 -> node2 -> vertex
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
    const legStrength = 0.08 * forceAlpha;
    const legLength = 60;
    graphData.legs.forEach((leg, i) => {
      const legNode = layout.nodeMap.get(`l${i}`);
      const vertexNode = layout.nodeMap.get(`v${leg.vertex}`);

      if (!legNode || !vertexNode) return;
      applySpringForce(vertexNode, legNode, legStrength, legLength);
    });

    // Weak center force
    const centerStrength = 0.005 * forceAlpha;
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

  function handleDualGraphPointerDown(event) {
    if (!state.showDualGraphCanvas || !state.dualGraphLayout) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const canvas = refs.dualGraphCanvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Find node under cursor
    const hitRadius = pointerHitRadius(event, 15, 30);
    for (const node of state.dualGraphLayout.nodes) {
      if (!isVisibleDualGraphNode(node)) continue;
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        state.dualGraphDragging = node;
        node.fixed = true;
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
        canvas.style.cursor = 'grabbing';
        event.preventDefault();
        break;
      }
    }
  }

  function handleDualGraphPointerMove(event) {
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
      event.preventDefault();
    } else {
      const hitRadius = pointerHitRadius(event, 15, 30);
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

  function handleDualGraphPointerUp(event) {
    if (state.dualGraphDragging) {
      state.dualGraphDragging.fixed = false;
      state.dualGraphDragging = null;
      if (event && event.pointerId != null && refs.dualGraphCanvas) {
        try { refs.dualGraphCanvas.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      if (refs.dualGraphCanvas) {
        refs.dualGraphCanvas.style.cursor = 'default';
      }
    }
  }

  function isVisibleDualGraphNode(node) {
    return !!node && node.type !== 'edge';
  }

  function normalizeKnotCandidates(result, kind = '') {
    if (Array.isArray(result.candidates) && result.candidates.length) {
      return result.candidates
        .map((candidate) => {
          if (!candidate || typeof candidate !== 'object') return null;
          const name = String(candidate.name || '').trim();
          const label = String(candidate.label || candidate.displayName || name).trim();
          if (!name && !label) return null;
          const candidateKind = candidate.kind || kind || inferDiagramInfoKind(name);
          return {
            name,
            label: label || name,
            href: candidate.href || (name ? diagramInfoHrefFromName(name, candidateKind) : ''),
            kind: candidateKind
          };
        })
        .filter(Boolean);
    }
    if (!result.name || !result.href) return [];
    return [{
      name: result.name,
      label: result.name,
      href: result.href,
      kind: kind || inferDiagramInfoKind(result.name)
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

  function diagramInfoHrefFromName(name, kind = '') {
    const plainName = String(name || '').replace(/^knot\s+/, '').replace(/^.*\(([^)]+)\).*$/, '$1');
    if ((kind || inferDiagramInfoKind(plainName)) === 'link') return linkInfoHrefFromName(plainName);
    return knotInfoHrefFromName(plainName);
  }

  function knotInfoHrefFromName(name) {
    const plainName = String(name || '').replace(/^knot\s+/, '').replace(/^.*\(([^)]+)\).*$/, '$1');
    return `https://knotinfo.org/diagram_display.php?${encodeURIComponent(plainName)}`;
  }

  function linkInfoHrefFromName(name) {
    const plainName = String(name || '').replace(/^link\s+/, '').replace(/^.*\(([^)]+)\).*$/, '$1');
    if (!plainName || /search/i.test(plainName)) return linkInfoSearchHref();
    return `https://knotinfo.org/linkinfo/diagram_display.php?${encodeURIComponent(plainName)}`;
  }

  function linkInfoSearchHref() {
    return 'https://knotinfo.org/linkinfo/search-general.php';
  }

  function inferDiagramInfoKind(name) {
    return /^L\d/i.test(String(name || '').trim()) ? 'link' : 'knot';
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
    if (report.openEnds > 0) {
      return {
        status: 'not a knot/link',
        name: `${report.components} components, ${report.openEnds} open ends`,
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad',
        kind: report.components > 1 ? 'link' : 'knot'
      };
    }
    if (state.wrapped || hasGluedBoundaryPairs()) {
      return {
        status: `${state.wrapped ? 'wrapped' : 'glued-boundary'} ${report.components > 1 ? 'link' : 'knot'} candidate`,
        name: 'further exploration remains experimental',
        candidates: [],
        pd: '',
        dt: '',
        braid: null,
        href: '',
        linkText: '',
        tone: 'bad',
        kind: report.components > 1 ? 'link' : 'knot'
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
        kind: report.components > 1 ? 'link' : 'knot',
        showDetails: true
      };
    }

    const isLink = report.components > 1;
    const result = engine.identify({
      rows: state.rows,
      cols: state.cols,
      lattice: state.lattice,
      wrapped: state.wrapped,
      method: 'invariants',
      tiles: state.tiles.map((tile) => normalizeTile(tile).map((pair) => pair.slice(0, 2)))
    });
    const kind = result.kind || (isLink ? 'link' : 'knot');
    const linkFallback = isLink && result.ok && !result.name;

    return {
      status: result.status || (isLink ? 'link code generated' : 'code generated'),
      name: result.name || (linkFallback ? `${report.components} component link` : ''),
      candidates: normalizeKnotCandidates(result, kind),
      pd: result.pd || '',
      dt: result.dt || '',
      braid: Array.isArray(result.braid) ? result.braid.slice() : null,
      href: result.href || (isLink ? linkInfoSearchHref() : ''),
      linkText: result.linkText || (isLink ? 'LinkInfo search' : 'more data'),
      tone: result.tone || (result.name ? 'good' : 'bad'),
      kind,
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
    const graphData = isDualGraph() ? collectDualGraphData(report, { requireSingleComponent: false }) : null;

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
      if (shouldDrawSeifertBackground() && graphData && graphData.isValid) drawHalfEdgeDecorationLabels(ctx, graphData, palette);
      drawDrawDebugOverlay(ctx, palette, report);
      drawPickHoverOverlay(ctx, palette, report);
      ctx.restore();
      drawDragGhost(ctx, palette);
      drawMainWanderMarker(ctx, palette);
      renderWanderChart();
      return;
    }

    drawBoardCopy(ctx, report, palette, { x: 0, y: 0, copyCol: 0, copyRow: 0 }, null);
    if (shouldDrawSeifertBackground() && graphData && graphData.isValid) drawHalfEdgeDecorationLabels(ctx, graphData, palette);
    drawDrawDebugOverlay(ctx, palette, report);
    drawBackgroundHoverOverlay(ctx, palette);
    drawBackgroundCuspOverlay(ctx, palette, report);
    drawBackgroundBilliardOverlay(ctx, palette);
    drawPickHoverOverlay(ctx, palette, report);
    drawDragGhost(ctx, palette);
    drawMainWanderMarker(ctx, palette);
    renderWanderChart();
  }

  function drawBoardCopy(ctx, report, palette, offset, pickedLift) {
    ctx.save();
    ctx.translate(offset.x, offset.y);
    for (let index = 0; index < state.tiles.length; index += 1) {
      drawTile(ctx, index, report, palette, offset, pickedLift);
    }
    drawSeifertBoundaryComponents(ctx);
    drawBackgroundBoundaries(ctx);
    ctx.restore();
  }

  function drawBackgroundHoverOverlay(ctx, palette) {
    if (!isGluedBoundaryMode() || state.inputMode !== 'background') return;
    if (state.wanderSelectingStart) return;
    drawPendingGlueChains(ctx);
    if (state.pendingGlueEdge) {
      const pendingSegment = boundaryEdgeSegment(state.pendingGlueEdge);
      if (pendingSegment) {
        ctx.save();
        ctx.lineCap = 'round';
        drawHoverEdgeSegment(ctx, pendingSegment, palette.accent2, hoverEdgeLineWidth(geometry.radius) * 1.25);
        ctx.restore();
      }
    }
    if (!state.backgroundHoverEdge) return;
    const hit = state.backgroundHoverEdge;
    const radius = geometry.radius;
    const lineWidth = hoverEdgeLineWidth(radius);
    ctx.save();
    ctx.lineCap = 'round';
    if (hit.nextIndex == null) {
      const segment = boundaryEdgeSegment(hit);
      if (segment) drawHoverEdgeSegment(ctx, segment, palette.accent, lineWidth);
    } else {
      const cell = geometry.cells[hit.index];
      const nextCell = geometry.cells[hit.nextIndex];
      if (cell && nextCell) {
        pairedTileEdgeSegmentsBetweenCells(cell, nextCell, hit.dir, radius).forEach((edgeSegment) => {
          drawHoverEdgeSegment(ctx, edgeSegment, palette.accent, lineWidth);
        });
      }
    }
    ctx.restore();
  }

  function drawBackgroundCuspOverlay(ctx, palette, report) {
    if (!shouldShowBackgroundCusps(report)) return;
    const vertices = computeDisplayedBackgroundCuspVertices();
    if (!vertices.length) return;
    const selectedKey = state.selectedBackgroundCusp;
    const hoverKey = state.backgroundHoverCusp && state.backgroundHoverCusp.id;
    ctx.save();
    vertices.forEach((vertex) => {
      const active = vertex.id === selectedKey;
      const hover = vertex.id === hoverKey;
      drawBackgroundCuspMarker(ctx, vertex, palette, active, hover);
      if (active) drawBackgroundCuspCornerHighlights(ctx, vertex, palette);
    });
    ctx.restore();
  }

  function drawBackgroundBilliardOverlay(ctx, palette) {
    if (!isGluedBoundaryMode() || state.inputMode !== 'background' || !isBackgroundBilliardAction()) return;
    const billiard = backgroundBilliardState();
    const radius = geometry.radius;
    ctx.save();
    drawBackgroundBilliardTrail(ctx, billiard, radius);
    const visibleHits = visibleBackgroundBilliardHits(billiard);
    if (visibleHits.length) {
      ctx.fillStyle = '#d11f1f';
      visibleHits.forEach((point) => {
        circle(ctx, point.x, point.y, Math.max(2.2, radius * 0.055));
      });
    }
    if (billiard.position) {
      if (billiard.direction) {
        drawBackgroundBilliardDirectionArrow(ctx, billiard, radius);
      } else if (billiard.aimPoint) {
        ctx.strokeStyle = 'rgba(31,122,140,0.58)';
        ctx.lineWidth = Math.max(1.1, radius * 0.032);
        ctx.setLineDash([Math.max(3, radius * 0.09), Math.max(3, radius * 0.09)]);
        ctx.beginPath();
        ctx.moveTo(billiard.position.x, billiard.position.y);
        ctx.lineTo(billiard.aimPoint.x, billiard.aimPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#111111';
      circle(ctx, billiard.position.x, billiard.position.y, Math.max(2.6, radius * 0.07));
      ctx.strokeStyle = '#fffdf8';
      ctx.lineWidth = Math.max(1, radius * 0.028);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackgroundBilliardDirectionArrow(ctx, billiard, radius) {
    if (!billiard || !billiard.position || !billiard.direction) return;
    const arrowLength = normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength);
    if (arrowLength <= 0) return;
    const tail = {
      x: billiard.position.x,
      y: billiard.position.y
    };
    const head = {
      x: tail.x + billiard.direction.x * arrowLength,
      y: tail.y + billiard.direction.y * arrowLength
    };
    const lineWidth = Math.max(1.6, radius * 0.045);
    const headLength = Math.min(Math.max(5, radius * 0.14), arrowLength * 0.46);
    const headHalfAngle = Math.PI / 7;
    const directionAngle = Math.atan2(billiard.direction.y, billiard.direction.x);
    const leftAngle = directionAngle + Math.PI - headHalfAngle;
    const rightAngle = directionAngle + Math.PI + headHalfAngle;
    ctx.save();
    ctx.strokeStyle = '#1f7a8c';
    ctx.fillStyle = '#1f7a8c';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(
      head.x + Math.cos(leftAngle) * headLength,
      head.y + Math.sin(leftAngle) * headLength
    );
    ctx.lineTo(
      head.x + Math.cos(rightAngle) * headLength,
      head.y + Math.sin(rightAngle) * headLength
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBackgroundBilliardTrail(ctx, billiard, radius) {
    const trail = Array.isArray(billiard.trailPoints) ? billiard.trailPoints : [];
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineWidth = Math.max(1.7, radius * 0.048);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = 1; index < trail.length; index += 1) {
      const previous = trail[index - 1];
      const point = trail[index];
      if (point.breakBefore) continue;
      ctx.strokeStyle = backgroundBilliardTrailColor(point.colorMode || previous.colorMode);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function backgroundBilliardTrailColor(mode) {
    return mode === 'purple' ? 'rgba(111,66,193,0.82)' : 'rgba(31,122,210,0.78)';
  }

  function visibleBackgroundBilliardHits(billiard) {
    const mode = normalizeBackgroundBilliardHitMarkers(state.backgroundBilliardHitMarkers);
    if (mode === 'none') return [];
    const hits = Array.isArray(billiard.hitPoints) ? billiard.hitPoints : [];
    return hits.filter((point) => point.kind === 'boundary' || point.kind === 'glued');
  }

  function drawBackgroundCuspMarker(ctx, vertex, palette, active, hover) {
    if (!vertex || !Array.isArray(vertex.corners)) return;
    const radius = geometry.radius;
    const markerScale = normalizeBackgroundCuspMarkerScale(state.backgroundCuspMarkerScale);
    const markerRadius = Math.max(0.8, radius * 0.11 * markerScale);
    const markerStroke = Math.max(0.55, Math.min(radius * 0.025, markerRadius * 0.38));
    const cusp = isBackgroundConeCusp(vertex);
    const positions = backgroundCuspDisplayPositions(vertex);
    ctx.save();
    positions.forEach((entry) => {
      const point = entry.point;
      if (!point) return;
      ctx.fillStyle = cusp ? 'rgba(255,253,248,0.94)' : 'rgba(128,128,128,0.30)';
      circle(ctx, point.x, point.y, markerRadius * 1.28);
      ctx.strokeStyle = cusp
        ? (active || hover ? 'rgba(47,52,55,0.62)' : 'rgba(47,52,55,0.45)')
        : (active || hover ? 'rgba(92,92,92,0.86)' : 'rgba(92,92,92,0.58)');
      ctx.lineWidth = markerStroke;
      ctx.stroke();
      ctx.fillStyle = cusp ? '#fffdf8' : 'rgba(132,132,132,0.68)';
      circle(ctx, point.x, point.y, markerRadius);
      ctx.strokeStyle = cusp ? '#fffdf8' : 'rgba(255,253,248,0.80)';
      ctx.lineWidth = Math.max(0.45, markerStroke * 0.75);
      ctx.stroke();
      if (active || hover) {
        drawPlainTextLabel(
          ctx,
          point.x,
          point.y - markerRadius * 2.2,
          vertex.label || '',
          cusp ? (active ? '#b23a48' : palette.accent) : '#666666',
          Math.max(8, radius * 0.18)
        );
      }
    });
    ctx.restore();
  }

  function drawBackgroundCuspCornerHighlights(ctx, cusp, palette) {
    const radius = geometry.radius;
    const positions = backgroundCuspDisplayPositions(cusp);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    positions.forEach((entry) => {
      backgroundCuspAngleFans(entry).forEach((fan, index) => {
        drawBackgroundCuspAngleFan(
          ctx,
          fan,
          index % 2 === 0 ? '#b23a48' : '#1f7a8c',
          radius
        );
      });
    });
    ctx.restore();
  }

  function backgroundCuspAngleFans(entry) {
    if (!entry || !entry.point || !Array.isArray(entry.corners)) return [];
    return entry.corners
      .map((corner) => backgroundCuspCornerFan(entry.point, corner))
      .filter(Boolean);
  }

  function backgroundCuspCornerFan(origin, corner) {
    const center = tileCenterPoint(corner && corner.index);
    if (!origin || !center || !corner) return null;
    const lattice = getLattice();
    const vertex = modulo(corner.vertex, lattice.sides);
    const points = tilePoints(center.x, center.y, geometry.radius * 0.96);
    const current = points[vertex];
    const previous = points[modulo(vertex - 1, lattice.sides)];
    const next = points[modulo(vertex + 1, lattice.sides)];
    if (!current || !previous || !next) return null;
    return {
      origin,
      from: normalizeVector(previous.x - current.x, previous.y - current.y, -1, 0),
      to: normalizeVector(next.x - current.x, next.y - current.y, 1, 0)
    };
  }

  function resizeWanderCanvas() {
    if (!refs.wanderCanvas) return;
    const host = refs.wanderCanvas.parentElement || refs.wanderCard || refs.canvasWrap;
    const hostWidth = host ? (host.clientWidth || host.getBoundingClientRect().width || 420) : 420;
    const widthAvailable = Math.max(260, Math.floor(hostWidth));
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    const logicalWidth = Math.ceil(widthAvailable);
    const logicalHeight = Math.ceil(state.wanderWide
      ? clamp(widthAvailable * 0.62, 320, 680)
      : clamp(widthAvailable * 0.78, 260, 420));
    const radius = clamp(widthAvailable / (state.wanderWide ? 15 : 9), 18, state.wanderWide ? 42 : 34);
    refs.wanderCanvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.wanderCanvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.wanderCanvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    refs.wanderCanvas.style.width = `${logicalWidth}px`;
    refs.wanderCanvas.style.height = `${logicalHeight}px`;
    wanderGeometry = {
      width: logicalWidth,
      height: logicalHeight,
      radius,
      dpr
    };
    updateWanderTileCenters();
  }

  function updateWanderTileCenters() {
    if (!wanderGeometry || !Array.isArray(state.wanderTiles)) return;
    const center = wanderCanvasCenter();
    const spacing = wanderTileSpacing(wanderGeometry.radius);
    state.wanderTiles.forEach((tile) => {
      const point = wanderCoverPoint(tile.coverQ, tile.coverR, spacing);
      tile.x = center.x + point.x + state.wanderCameraX;
      tile.y = center.y + point.y + state.wanderCameraY;
    });
  }

  function wanderCanvasCenter() {
    return wanderGeometry
      ? { x: wanderGeometry.width / 2, y: wanderGeometry.height / 2 }
      : { x: 0, y: 0 };
  }

  function visibleWanderTiles() {
    const visibleByPosition = new Map();
    state.wanderTiles.forEach((tile) => {
      visibleByPosition.set(wanderDisplayPositionKey(tile), tile);
    });
    return state.wanderTiles.filter((tile) => visibleByPosition.get(wanderDisplayPositionKey(tile)) === tile);
  }

  function isVisibleWanderTile(tile) {
    if (!tile) return false;
    return visibleWanderTiles().includes(tile);
  }

  function wanderDisplayPositionKey(tile) {
    return tile ? `${tile.coverQ},${tile.coverR}` : '';
  }

  function wanderTileSpacing(radius) {
    const lattice = getLattice();
    return lattice.shape === 'square'
      ? { x: radius * 2, y: radius * 2 }
      : { x: Math.sqrt(3) * radius, y: 1.5 * radius };
  }

  function wanderCoverPoint(q, r, spacing) {
    const lattice = getLattice();
    if (lattice.shape === 'square') return { x: q * spacing.x, y: r * spacing.y };
    return {
      x: spacing.x * (q + r / 2),
      y: spacing.y * r
    };
  }

  function renderWanderChart() {
    if (!refs.wanderCanvas) return;
    if (!wanderGeometry) resizeWanderCanvas();
    if (!wanderGeometry) return;
    updateWanderTileCenters();
    const ctx = refs.wanderCanvas.getContext('2d');
    const palette = getPalette();
    ctx.setTransform(wanderGeometry.dpr, 0, 0, wanderGeometry.dpr, 0, 0);
    ctx.clearRect(0, 0, wanderGeometry.width, wanderGeometry.height);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, wanderGeometry.width, wanderGeometry.height);

    if (!state.wanderOpen || !isGluedBoundaryMode()) {
      drawWanderEmptyMessage(ctx, 'available in glued boundary mode', palette);
      return;
    }
    if (!state.wanderTiles.length) {
      drawWanderEmptyMessage(ctx, state.wanderSelectingStart ? 'select a tile on the main canvas' : 'select a start tile', palette);
      return;
    }

    const visibleTiles = visibleWanderTiles();
    const smokeSources = wanderSmokeSourceTiles(visibleTiles);
    drawWanderConnectors(ctx, palette, visibleTiles);
    visibleTiles.forEach((tile) => drawWanderTile(ctx, tile, palette));
    drawWanderSmokeLayers(ctx, palette, visibleTiles, smokeSources);
    drawWanderHover(ctx, palette);
    drawWanderCurrentMarker(ctx, palette);
  }

  function drawWanderEmptyMessage(ctx, text, palette) {
    ctx.save();
    ctx.fillStyle = palette.muted;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, wanderGeometry.width / 2, wanderGeometry.height / 2);
    ctx.restore();
  }

  function drawWanderConnectors(ctx, palette, tiles = visibleWanderTiles()) {
    const visibleIds = new Set(tiles.map((tile) => tile.id));
    const byId = new Map(state.wanderTiles.map((tile) => [tile.id, tile]));
    ctx.save();
    ctx.lineWidth = Math.max(1.2, wanderGeometry.radius * 0.035);
    ctx.lineCap = 'round';
    tiles.forEach((tile) => {
      if (!tile.parentId || !visibleIds.has(tile.parentId)) return;
      const parent = byId.get(tile.parentId);
      if (!parent) return;
      ctx.strokeStyle = tile.via === 'glued' ? 'rgba(31,122,140,0.55)' : 'rgba(122,111,101,0.42)';
      if (tile.via === 'glued' && ctx.setLineDash) ctx.setLineDash([Math.max(3, wanderGeometry.radius * 0.12), Math.max(3, wanderGeometry.radius * 0.1)]);
      else if (ctx.setLineDash) ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(tile.x, tile.y);
      ctx.stroke();
    });
    if (ctx.setLineDash) ctx.setLineDash([]);
    ctx.restore();
  }

  function drawWanderTile(ctx, tile, palette) {
    if (!tile || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) return;
    const radius = wanderGeometry.radius;
    const active = tile.id === state.wanderCurrentId;
    const empty = isTileEmpty(tile.tile);
    const points = tilePoints(tile.x, tile.y, radius * 0.96);
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = active ? 'rgba(61,107,79,0.08)' : (empty ? '#f8f5ee' : '#fffdf8');
    ctx.strokeStyle = active ? palette.accent : palette.border;
    ctx.lineWidth = active ? 2 : 1;
    ctx.fill();
    ctx.stroke();
    if (isDualGraph() && isVertexTileValue(tile.tile)) drawGraphTile(ctx, { x: tile.x, y: tile.y }, tile.tile, palette, radius);
    else drawPipe(ctx, { x: tile.x, y: tile.y }, tile.tile, palette, radius);
    drawWanderBlackBoundaries(ctx, tile);
    drawPlainTextLabel(ctx, tile.x, tile.y + radius * 0.66, formatWanderSourceTile(tile.sourceIndex), palette.muted, Math.max(8, radius * 0.18));
    ctx.restore();
  }

  function addWanderSmokeMark(tile) {
    if (!tile) return;
    if (!Array.isArray(state.wanderSmokeMarks)) state.wanderSmokeMarks = [];
    state.wanderSmokeMarks = state.wanderSmokeMarks.filter((mark) => mark.tileId !== tile.id);
    state.wanderSmokeMarks.push({
      tileId: tile.id,
      coverQ: tile.coverQ,
      coverR: tile.coverR,
      createdAt: Date.now()
    });
  }

  function refreshWanderTileVisibility(tile) {
    if (!tile || !Array.isArray(state.wanderTiles)) return null;
    const index = state.wanderTiles.findIndex((entry) => entry.id === tile.id);
    if (index < 0) return tile;
    const [freshTile] = state.wanderTiles.splice(index, 1);
    state.wanderTiles.push(freshTile);
    return freshTile;
  }

  function wanderSmokeSourceTiles(visibleTiles) {
    const sourceIds = new Set();
    const visibleById = new Map(visibleTiles.map((tile) => [tile.id, tile]));
    const visibleByPosition = new Map(visibleTiles.map((tile) => [wanderDisplayPositionKey(tile), tile]));
    (Array.isArray(state.wanderSmokeMarks) ? state.wanderSmokeMarks : []).forEach((mark) => {
      const markedTile = visibleById.get(mark.tileId)
        || visibleByPosition.get(`${mark.coverQ},${mark.coverR}`);
      if (markedTile) sourceIds.add(markedTile.id);
    });
    visibleTiles.forEach((tile) => {
      if (hasHiddenWanderTileAtPosition(tile)) sourceIds.add(tile.id);
    });
    return visibleTiles.filter((tile) => sourceIds.has(tile.id));
  }

  function hasHiddenWanderTileAtPosition(tile) {
    if (!tile) return false;
    const key = wanderDisplayPositionKey(tile);
    return state.wanderTiles.some((other) => other.id !== tile.id && wanderDisplayPositionKey(other) === key);
  }

  function drawWanderSmokeLayers(ctx, palette, visibleTiles, smokeSources) {
    if (!smokeSources.length || !wanderGeometry) return;
    smokeSources.forEach((source) => {
      drawWanderSmokeLayer(ctx, source);
      const protectedTiles = smokeProtectedWanderTilesForSource(visibleTiles, source);
      drawWanderConnectors(ctx, palette, protectedTiles);
      protectedTiles.forEach((tile) => drawWanderTile(ctx, tile, palette));
    });
  }

  function smokeProtectedWanderTilesForSource(visibleTiles, source) {
    if (!source) return [];
    const protectedIds = new Set([source.id]);
    visibleTiles.forEach((tile) => {
      if (isWanderTileConnectedAcrossSmokeEdge(source, tile)) protectedIds.add(tile.id);
    });
    return visibleTiles.filter((tile) => protectedIds.has(tile.id));
  }

  function isWanderTileConnectedAcrossSmokeEdge(source, target) {
    if (!source || !target || source.id === target.id) return false;
    const lattice = getLattice();
    for (let visibleDir = 0; visibleDir < lattice.sides; visibleDir += 1) {
      const step = wanderCoverStep(visibleDir);
      if (source.coverQ + step.q !== target.coverQ || source.coverR + step.r !== target.coverR) continue;
      if (wanderTransitionMatchesTile(wanderTransition(source, visibleDir), target)) return true;
    }
    return false;
  }

  function wanderTransitionMatchesTile(transition, tile) {
    if (!transition || transition.kind === 'boundary' || !tile) return false;
    const transform = tileTransform(transition.transform);
    return tile.coverQ === transition.coverQ
      && tile.coverR === transition.coverR
      && tile.sourceIndex === transition.sourceIndex
      && normalizeTransformRotation(tile.rotation) === transform.rotation
      && !!tile.flip === !!transform.flip;
  }

  function drawWanderSmokeLayer(ctx, tile) {
    if (!tile || !wanderGeometry) return;
    const radius = wanderGeometry.radius;
    const colors = wanderSmokePalette();
    const shape = normalizeWanderSmokeShape(state.wanderSmokeShape);
    ctx.save();
    ctx.globalAlpha *= normalizeWanderSmokeOpacity(state.wanderSmokeOpacity);
    if (shape === 'puff') drawWanderSmokeCloud(ctx, tile, radius, colors);
    else drawWanderSmokeTile(ctx, tile, radius, colors);
    ctx.restore();
  }

  function drawWanderSmokeTile(ctx, tile, radius, colors) {
    if (!tile) return;
    const stops = normalizedWanderSmokeGradientStops();
    const alphas = normalizedWanderSmokeAlphas();
    const rgb = wanderSmokeRgbStops();
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const steps = 32;
    const centerPolygon = wanderSmokeTilePolygon(tile, radius, 0);
    if (centerPolygon.length >= 3) {
      drawWanderSmokePath(ctx, centerPolygon);
      ctx.fillStyle = tileSmokeColorAt(0, stops, rgb, alphas);
      ctx.fill();
    }
    for (let index = 1; index <= steps; index += 1) {
      const innerAmount = (index - 1) / steps;
      const outerAmount = index / steps;
      const innerPolygon = wanderSmokeTilePolygon(tile, radius, innerAmount);
      const outerPolygon = wanderSmokeTilePolygon(tile, radius, outerAmount);
      if (innerPolygon.length < 3 || outerPolygon.length < 3) continue;
      const color = tileSmokeColorAt((innerAmount + outerAmount) * 0.5, stops, rgb, alphas);
      if (!color) continue;
      drawWanderSmokeRingPath(ctx, outerPolygon, innerPolygon);
      ctx.fillStyle = color;
      ctx.fill('evenodd');
    }
    ctx.restore();
  }

  function tileSmokeColorAt(amount, stops, rgb, alphas) {
    const t = clamp(amount, 0, 1);
    if (t <= stops.inner) return smokeRgba(rgb.inner, alphas.inner);
    if (t <= stops.mid) {
      const mix = (t - stops.inner) / Math.max(0.001, stops.mid - stops.inner);
      return smokeRgba(lerpRgb(rgb.inner, rgb.mid, mix), lerpNumber(alphas.inner, alphas.mid, mix));
    }
    const mix = (t - stops.mid) / Math.max(0.001, stops.edge - stops.mid);
    return smokeRgba(lerpRgb(rgb.mid, rgb.outer, mix), lerpNumber(alphas.mid, alphas.edge, mix));
  }

  function drawWanderSmokeCloud(ctx, tile, radius, colors) {
    if (!tile) return;
    const angles = getLattice().angles;
    const thickness = normalizeWanderSmokeThickness(state.wanderSmokeThickness);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    if (wanderRealBoundaryVisibleDirs(tile).length) {
      drawWanderSmokePath(ctx, wanderSmokeTilePolygon(tile, radius));
      ctx.clip();
    }
    angles.forEach((angle, index) => {
      const offset = radius * thickness * (0.56 + (index % 2) * 0.08);
      const puffRadius = radius * thickness * (0.62 + (index % 3) * 0.08);
      drawWanderSmokePuff(
        ctx,
        tile.x + Math.cos(angle) * offset,
        tile.y + Math.sin(angle) * offset,
        puffRadius,
        colors
      );
    });
    drawWanderSmokePuff(ctx, tile.x, tile.y, radius * thickness * 0.72, colors);
    ctx.restore();
  }

  function wanderSmokeTilePolygon(tile, radius, amount = 1) {
    if (!tile) return [];
    const thickness = normalizeWanderSmokeThickness(state.wanderSmokeThickness);
    const baseScale = 0.96;
    const outerScale = baseScale + (0.32 * thickness);
    const scale = baseScale + ((outerScale - baseScale) * clamp(amount, 0, 1));
    let points = tilePoints(tile.x, tile.y, radius * scale);
    wanderRealBoundaryVisibleDirs(tile).forEach((visibleDir) => {
      const segment = edgeSegmentPoints(tile.x, tile.y, visibleDir, radius * 0.96);
      points = clipPolygonToInteriorSide(points, segment, { x: tile.x, y: tile.y });
    });
    return points;
  }

  function wanderRealBoundaryVisibleDirs(tile) {
    if (!tile || !tileExists(tile.sourceIndex)) return [];
    const lattice = getLattice();
    const transform = tileTransform(tile);
    const dirs = [];
    for (let sourceDir = 0; sourceDir < lattice.sides; sourceDir += 1) {
      if (!isBackgroundBoundaryEdge(tile.sourceIndex, sourceDir) || isGluedBoundaryEdge(tile.sourceIndex, sourceDir)) continue;
      dirs.push(transformDir(sourceDir, transform));
    }
    return dirs;
  }

  function drawWanderSmokePath(ctx, points) {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }

  function drawWanderSmokeRingPath(ctx, outerPoints, innerPoints) {
    ctx.beginPath();
    outerPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    innerPoints.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }

  function clipPolygonToInteriorSide(points, segment, insidePoint) {
    if (!Array.isArray(points) || points.length < 3 || !segment || !insidePoint) return points || [];
    const edgeX = segment.end.x - segment.start.x;
    const edgeY = segment.end.y - segment.start.y;
    const sideValue = (point) => (
      (edgeX * (point.y - segment.start.y)) - (edgeY * (point.x - segment.start.x))
    );
    const insideSign = sideValue(insidePoint) >= 0 ? 1 : -1;
    const epsilon = 0.000001;
    const isInside = (point) => sideValue(point) * insideSign >= -epsilon;
    const intersection = (from, to) => {
      const fromSide = sideValue(from);
      const toSide = sideValue(to);
      const denominator = fromSide - toSide;
      const amount = Math.abs(denominator) < epsilon ? 0 : clamp(fromSide / denominator, 0, 1);
      return {
        x: from.x + ((to.x - from.x) * amount),
        y: from.y + ((to.y - from.y) * amount)
      };
    };
    const clipped = [];
    let previous = points[points.length - 1];
    let previousInside = isInside(previous);
    points.forEach((current) => {
      const currentInside = isInside(current);
      if (currentInside) {
        if (!previousInside) clipped.push(intersection(previous, current));
        clipped.push(current);
      } else if (previousInside) {
        clipped.push(intersection(previous, current));
      }
      previous = current;
      previousInside = currentInside;
    });
    return clipped;
  }

  function drawWanderSmokePuff(ctx, x, y, radius, colors) {
    const gradient = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(0.58, colors.mid);
    gradient.addColorStop(1, colors.outer);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function smokeRgba(rgb, alpha) {
    return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${clamp(alpha, 0, 1)})`;
  }

  function scaleSmokeRgb(rgb) {
    const brightness = normalizeWanderSmokeBrightness(state.wanderSmokeBrightness);
    return rgb.map((channel) => clamp(channel * brightness, 0, 255));
  }

  function lerpRgb(from, to, amount) {
    const t = clamp(amount, 0, 1);
    return [
      lerpNumber(from[0], to[0], t),
      lerpNumber(from[1], to[1], t),
      lerpNumber(from[2], to[2], t)
    ];
  }

  function lerpNumber(from, to, amount) {
    const t = clamp(amount, 0, 1);
    return from + ((to - from) * t);
  }

  function wanderSmokeRgbStops() {
    let base;
    switch (normalizeWanderSmokeColor(state.wanderSmokeColor)) {
      case 'yellow':
        base = [232, 194, 75];
        break;
      case 'gray':
        base = [158, 158, 158];
        break;
      case 'white':
        base = [235, 231, 223];
        break;
      case 'blue':
      default:
        base = [126, 190, 235];
        break;
    }
    const scaled = scaleSmokeRgb(base);
    return { inner: scaled, mid: scaled, outer: scaled };
  }

  function wanderSmokePalette() {
    const alpha = normalizedWanderSmokeAlphas();
    const rgb = wanderSmokeRgbStops();
    switch (normalizeWanderSmokeColor(state.wanderSmokeColor)) {
      case 'blue':
        return {
          inner: smokeRgba(rgb.inner, alpha.inner),
          mid: smokeRgba(rgb.mid, alpha.mid),
          outer: smokeRgba(rgb.outer, alpha.edge),
          rim: 'rgba(78,142,196,0.38)'
        };
      case 'yellow':
        return {
          inner: smokeRgba(rgb.inner, alpha.inner),
          mid: smokeRgba(rgb.mid, alpha.mid),
          outer: smokeRgba(rgb.outer, alpha.edge),
          rim: 'rgba(190,144,36,0.36)'
        };
      case 'gray':
        return {
          inner: smokeRgba(rgb.inner, alpha.inner),
          mid: smokeRgba(rgb.mid, alpha.mid),
          outer: smokeRgba(rgb.outer, alpha.edge),
          rim: 'rgba(112,112,112,0.34)'
        };
      case 'white':
      default:
        return {
          inner: smokeRgba(rgb.inner, alpha.inner),
          mid: smokeRgba(rgb.mid, alpha.mid),
          outer: smokeRgba(rgb.outer, alpha.edge),
          rim: 'rgba(190,184,174,0.34)'
        };
    }
  }

  function drawWanderBlackBoundaries(ctx, tile) {
    if (!tile || !tileExists(tile.sourceIndex)) return;
    const lattice = getLattice();
    const radius = wanderGeometry.radius;
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = hoverEdgeLineWidth(radius);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let dir = 0; dir < lattice.sides; dir += 1) {
      if (!isBackgroundBoundaryEdge(tile.sourceIndex, dir) || isGluedBoundaryEdge(tile.sourceIndex, dir)) continue;
      const visibleDir = transformDir(dir, tileTransform(tile));
      drawBackgroundBoundarySegment(ctx, edgeSegmentPoints(tile.x, tile.y, visibleDir, radius * 0.96));
    }
    ctx.restore();
  }

  function drawWanderHover(ctx, palette) {
    const hover = state.wanderHoverEdge;
    if (!hover) return;
    const tile = wanderTileById(hover.id);
    if (!tile || !isVisibleWanderTile(tile)) return;
    const segment = edgeSegmentPoints(tile.x, tile.y, hover.dir, wanderGeometry.radius * 0.96);
    ctxSaveStrokeHover(palette, segment, hover.kind === 'glued' ? '#1f7a8c' : (hover.kind === 'boundary' ? '#b23a48' : palette.accent));
  }

  function ctxSaveStrokeHover(palette, segment, color) {
    const ctx = refs.wanderCanvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color || palette.accent;
    ctx.lineWidth = Math.max(2, wanderGeometry.radius * 0.07);
    ctx.lineCap = 'round';
    drawHoverEdgeSegment(ctx, segment, ctx.strokeStyle, ctx.lineWidth);
    ctx.restore();
  }

  function drawWanderCurrentMarker(ctx, palette) {
    const current = currentWanderTile();
    if (!current) return;
    const marker = wanderAnimatedMarkerPosition('wander', current);
    ctx.save();
    drawWanderCylinderMarker(ctx, marker.x, marker.y, wanderGeometry.radius, false, palette);
    ctx.restore();
  }

  function drawMainWanderMarker(ctx, palette) {
    const current = currentWanderTile();
    if (!current || !state.wanderOpen || !isGluedBoundaryMode()) return;
    if (!tileExists(current.sourceIndex)) return;
    const cell = geometry && geometry.cells ? geometry.cells[current.sourceIndex] : null;
    if (!cell) return;
    const marker = wanderAnimatedMarkerPosition('main', current, cell);
    drawWanderCylinderMarker(ctx, marker.x, marker.y, geometry.radius, false, palette);
  }

  function drawWanderCylinderMarker(ctx, x, y, radius, bounce, palette) {
    const scale = normalizeWanderMarkerRadius(state.wanderMarkerRadius);
    const markerRadius = radius * scale;
    const width = Math.max(8, markerRadius * 0.24);
    const height = Math.max(6, markerRadius * 0.16);
    const topHeight = Math.max(3, height * 0.46);
    const baseColor = '#9fd7ff';
    const sideColor = '#5aaee8';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = Math.max(1, markerRadius * 0.045);
    ctx.shadowOffsetY = Math.max(1, markerRadius * 0.025);
    ctx.fillStyle = sideColor;
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1, markerRadius * 0.028);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.5, y - height * 0.12);
    ctx.lineTo(x - width * 0.5, y + height * 0.52);
    ctx.ellipse(x, y + height * 0.52, width * 0.5, topHeight * 0.5, 0, Math.PI, 0, true);
    ctx.lineTo(x + width * 0.5, y - height * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(x, y - height * 0.12, width * 0.5, topHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function wanderAnimatedMarkerPosition(kind, current, mainCell = null) {
    const fallback = kind === 'main'
      ? { x: mainCell ? mainCell.x : 0, y: mainCell ? mainCell.y : 0 }
      : { x: current.x, y: current.y };
    const animation = state.wanderAnimation;
    if (!animation || animation.targetTileId !== current.id) return fallback;
    const points = kind === 'main' ? animation.main : animation.wander;
    if (!points || !points.from || !points.to) return fallback;
    const progress = clamp((performance.now() - animation.startedAt) / Math.max(1, animation.duration), 0, 1);
    if (animation.kind === 'bounce') {
      const leg = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const eased = easeInOutCubic(leg);
      return lerpPoint(points.from, points.to, eased);
    }
    return lerpPoint(points.from, points.to, easeInOutCubic(progress));
  }

  function startWanderMarkerAnimation(animation) {
    stopWanderMarkerAnimation(false);
    if (!animation || !animation.wander || !animation.wander.from || !animation.wander.to) return;
    state.wanderAnimation = {
      ...animation,
      startedAt: performance.now(),
      frame: null
    };
    draw(analyze());
    const tick = () => {
      const current = state.wanderAnimation;
      if (!current) return;
      const progress = (performance.now() - current.startedAt) / Math.max(1, current.duration);
      draw(analyze());
      if (progress >= 1) {
        const done = state.wanderAnimation;
        state.wanderAnimation = null;
        draw(analyze());
        if (done && done.recenterTileId != null) {
          maybeRecenterWanderCamera(wanderTileById(done.recenterTileId), true);
        }
        return;
      }
      current.frame = window.requestAnimationFrame(tick);
    };
    state.wanderAnimation.frame = window.requestAnimationFrame(tick);
  }

  function stopWanderMarkerAnimation(redraw = true) {
    const animation = state.wanderAnimation;
    if (animation && animation.frame != null) window.cancelAnimationFrame(animation.frame);
    state.wanderAnimation = null;
    if (redraw) draw(analyze());
  }

  function maybeRecenterWanderCamera(tile, animate = true) {
    if (!tile || !wanderGeometry) return false;
    updateWanderTileCenters();
    const margin = Math.max(wanderGeometry.radius * 1.35, 34);
    const outOfScope = tile.x < margin
      || tile.x > wanderGeometry.width - margin
      || tile.y < margin
      || tile.y > wanderGeometry.height - margin;
    if (!outOfScope) return false;
    const center = wanderCanvasCenter();
    const dx = center.x - tile.x;
    const dy = center.y - tile.y;
    startWanderCameraAnimation(state.wanderCameraX + dx, state.wanderCameraY + dy, animate);
    return true;
  }

  function startWanderCameraAnimation(targetX, targetY, animate = true) {
    stopWanderCameraAnimation(false);
    if (!animate) {
      state.wanderCameraX = targetX;
      state.wanderCameraY = targetY;
      updateWanderTileCenters();
      draw(analyze());
      return;
    }
    const fromX = state.wanderCameraX;
    const fromY = state.wanderCameraY;
    if (Math.hypot(targetX - fromX, targetY - fromY) < 0.5) return;
    state.wanderCameraAnimation = {
      fromX,
      fromY,
      targetX,
      targetY,
      startedAt: performance.now(),
      duration: WANDER_CAMERA_ANIMATION_MS,
      frame: null
    };
    const tick = () => {
      const animation = state.wanderCameraAnimation;
      if (!animation) return;
      const progress = clamp((performance.now() - animation.startedAt) / Math.max(1, animation.duration), 0, 1);
      const eased = easeInOutCubic(progress);
      state.wanderCameraX = animation.fromX + ((animation.targetX - animation.fromX) * eased);
      state.wanderCameraY = animation.fromY + ((animation.targetY - animation.fromY) * eased);
      updateWanderTileCenters();
      draw(analyze());
      if (progress >= 1) {
        state.wanderCameraAnimation = null;
        state.wanderCameraX = animation.targetX;
        state.wanderCameraY = animation.targetY;
        updateWanderTileCenters();
        draw(analyze());
        return;
      }
      animation.frame = window.requestAnimationFrame(tick);
    };
    state.wanderCameraAnimation.frame = window.requestAnimationFrame(tick);
  }

  function stopWanderCameraAnimation(redraw = true) {
    const animation = state.wanderCameraAnimation;
    if (animation && animation.frame != null) window.cancelAnimationFrame(animation.frame);
    state.wanderCameraAnimation = null;
    if (redraw) draw(analyze());
  }

  function buildWanderMoveAnimation(fromTile, toTile) {
    if (!fromTile || !toTile) return null;
    return {
      kind: 'move',
      targetTileId: toTile.id,
      recenterTileId: toTile.id,
      duration: WANDER_MOVE_ANIMATION_MS,
      wander: {
        from: { x: fromTile.x, y: fromTile.y },
        to: { x: toTile.x, y: toTile.y }
      },
      main: {
        from: mainMarkerPointForSource(fromTile.sourceIndex),
        to: mainMarkerPointForSource(toTile.sourceIndex)
      }
    };
  }

  function buildWanderBounceAnimation(tile, visibleDir) {
    if (!tile) return null;
    const wanderBouncePoint = wanderEdgeBouncePoint(tile, visibleDir);
    const mainBouncePoint = mainEdgeBouncePoint(tile.sourceIndex, inverseTransformDir(visibleDir, tileTransform(tile)));
    return {
      kind: 'bounce',
      targetTileId: tile.id,
      duration: WANDER_BOUNCE_ANIMATION_MS,
      wander: {
        from: { x: tile.x, y: tile.y },
        to: wanderBouncePoint || { x: tile.x, y: tile.y }
      },
      main: {
        from: mainMarkerPointForSource(tile.sourceIndex),
        to: mainBouncePoint || mainMarkerPointForSource(tile.sourceIndex)
      }
    };
  }

  function wanderEdgeBouncePoint(tile, visibleDir) {
    if (!tile || !wanderGeometry) return null;
    return pointAlongDirection(tile.x, tile.y, visibleDir, wanderGeometry.radius * WANDER_BOUNCE_EDGE_RATIO);
  }

  function mainEdgeBouncePoint(sourceIndex, sourceDir) {
    if (!geometry || !geometry.cells || !tileExists(sourceIndex)) return null;
    const cell = geometry.cells[sourceIndex];
    if (!cell) return null;
    return pointAlongDirection(cell.x, cell.y, sourceDir, geometry.radius * WANDER_BOUNCE_EDGE_RATIO);
  }

  function mainMarkerPointForSource(sourceIndex) {
    const cell = geometry && geometry.cells ? geometry.cells[sourceIndex] : null;
    return cell ? { x: cell.x, y: cell.y } : null;
  }

  function pointAlongDirection(x, y, dir, distance) {
    const angle = getLattice().angles[normalizeDir(dir, getLattice().sides)] || 0;
    return {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance
    };
  }

  function lerpPoint(from, to, amount) {
    if (!from || !to) return from || to || { x: 0, y: 0 };
    return {
      x: from.x + ((to.x - from.x) * amount),
      y: from.y + ((to.y - from.y) * amount)
    };
  }

  function easeInOutCubic(value) {
    const t = clamp(value, 0, 1);
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function handleWanderPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    if (!isGluedBoundaryMode()) return;
    focusWanderCanvas();
    if (!state.wanderTiles.length) {
      return;
    }
    const hit = wanderEdgeHitTest(event.clientX, event.clientY);
    if (!hit) {
      const tileHit = wanderTileHitTest(event.clientX, event.clientY);
      if (tileHit) {
        const refreshed = refreshWanderTileVisibility(tileHit.tile) || tileHit.tile;
        state.wanderCurrentId = refreshed.id;
        state.wanderBounce = null;
        addWanderSmokeMark(refreshed);
        syncWanderStatus();
        focusWanderCanvas();
        draw(analyze());
      }
      return;
    }
    stepWanderFromEdge(hit);
  }

  function handleWanderPointerMove(event) {
    if (!state.wanderOpen || !state.wanderTiles.length || !isGluedBoundaryMode()) return;
    const hit = wanderEdgeHitTest(event.clientX, event.clientY);
    const next = hit
      ? {
        id: hit.id,
        dir: hit.dir,
        kind: wanderTransition(hit.tile, hit.dir).kind
      }
      : null;
    if (sameWanderHoverEdge(state.wanderHoverEdge, next)) return;
    state.wanderHoverEdge = next;
    renderWanderChart();
  }

  function handleWanderKeyDown(event) {
    if (!state.wanderOpen || state.wanderSelectingStart || !state.wanderTiles.length || !isGluedBoundaryMode()) return;
    if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableWanderKeyTarget(event.target)) return;
    const current = currentWanderTile();
    const dir = wanderDirectionForKey(event.key);
    if (!current || dir == null) return;
    event.preventDefault();
    stepWanderFromEdge({ id: current.id, tile: current, dir });
  }

  function isEditableWanderKeyTarget(target) {
    const element = target && target.nodeType === 1 ? target : (target && target.parentElement);
    if (!element) return false;
    if (element.isContentEditable) return true;
    return !!element.closest('input, textarea, select, [contenteditable="true"]');
  }

  function wanderDirectionForKey(key) {
    const normalized = String(key || '').toLowerCase();
    const lattice = getLattice();
    if (lattice.shape === 'square') {
      if (normalized === 'd' || normalized === 'arrowright') return 0;
      if (normalized === 's' || normalized === 'arrowdown') return 1;
      if (normalized === 'a' || normalized === 'arrowleft') return 2;
      if (normalized === 'w' || normalized === 'arrowup') return 3;
      return null;
    }
    if (normalized === 'd') return 0;
    if (normalized === 'x') return 1;
    if (normalized === 'z') return 2;
    if (normalized === 'a') return 3;
    if (normalized === 'w') return 4;
    if (normalized === 'e') return 5;
    return null;
  }

  function stepWanderFromEdge(hit) {
    if (!hit || !hit.tile) return false;
    focusWanderCanvas();
    const transition = wanderTransition(hit.tile, hit.dir);
    state.wanderCurrentId = hit.tile.id;
    state.wanderHoverEdge = null;
    if (!transition || transition.kind === 'boundary') {
      const animation = buildWanderBounceAnimation(hit.tile, hit.dir);
      state.wanderBounce = {
        tileId: hit.tile.id,
        sourceIndex: hit.tile.sourceIndex,
        dir: hit.dir,
        reason: transition && transition.reason ? transition.reason : 'boundary'
      };
      syncWanderStatus(`boundary bounce at ${formatWanderSourceTile(hit.tile.sourceIndex)}`);
      startWanderMarkerAnimation(animation);
      return false;
    }

    const existing = findMatchingWanderTile(transition);
    if (existing) {
      const animation = buildWanderMoveAnimation(hit.tile, existing);
      const refreshed = refreshWanderTileVisibility(existing) || existing;
      state.wanderCurrentId = refreshed.id;
      state.wanderBounce = null;
      addWanderSmokeMark(refreshed);
      syncWanderStatus();
      startWanderMarkerAnimation(animation);
      return true;
    }

    const nextTile = {
      id: state.wanderNextId++,
      sourceIndex: transition.sourceIndex,
      tile: transformTileValue(state.tiles[transition.sourceIndex], transition.transform),
      rotation: transition.transform.rotation,
      flip: transition.transform.flip,
      coverQ: transition.coverQ,
      coverR: transition.coverR,
      parentId: hit.tile.id,
      fromDir: hit.dir,
      via: transition.kind,
      glueGroup: transition.glueGroup == null ? null : transition.glueGroup
    };
    state.wanderTiles.push(nextTile);
    refreshWanderTileVisibility(nextTile);
    addWanderSmokeMark(nextTile);
    state.wanderCurrentId = nextTile.id;
    state.wanderBounce = null;
    updateWanderTileCenters();
    const animation = buildWanderMoveAnimation(hit.tile, nextTile);
    syncWanderStatus(transition.kind === 'glued'
      ? `glued to ${formatWanderSourceTile(nextTile.sourceIndex)}`
      : `moved to ${formatWanderSourceTile(nextTile.sourceIndex)}`);
    startWanderMarkerAnimation(animation);
    return true;
  }

  function wanderTransition(tile, visibleDir) {
    if (!tile || !Number.isInteger(visibleDir)) return { kind: 'boundary', reason: 'miss' };
    const lattice = getLattice();
    const sourceDir = inverseTransformDir(visibleDir, tileTransform(tile));
    const direct = backgroundBilliardNeighbor(tile.sourceIndex, sourceDir);
    const step = wanderCoverStep(visibleDir);
    const coverQ = tile.coverQ + step.q;
    const coverR = tile.coverR + step.r;
    if (direct) {
      return {
        kind: 'ordinary',
        sourceIndex: direct.index,
        sourceEntryDir: direct.dir,
        transform: tileTransform(tile),
        coverQ,
        coverR
      };
    }

    const pair = gluedPairForBoundaryEdge({ index: tile.sourceIndex, dir: sourceDir });
    if (!pair) return { kind: 'boundary', reason: 'real boundary' };
    const hitIsFirst = sameBoundaryEdge({ index: tile.sourceIndex, dir: sourceDir }, pair.first);
    const partner = hitIsFirst ? pair.second : pair.first;
    if (!partner || !tileExists(partner.index)) {
      return { kind: 'boundary', reason: 'blocked glued partner' };
    }
    const firstReverse = gluePairFirstArrowReversed(pair);
    const secondReverse = gluePairSecondArrowReversed(pair);
    const currentReverse = hitIsFirst ? firstReverse : secondReverse;
    const partnerReverse = hitIsFirst ? secondReverse : firstReverse;
    const flip = !!tile.flip !== (currentReverse === partnerReverse);
    const visibleEntryDir = lattice.opposite[visibleDir];
    const transform = {
      rotation: transformRotationForVisibleDir(partner.dir, visibleEntryDir, flip),
      flip
    };
    const pairIndex = cloneGluedEdges().findIndex((candidate) => gluedPairKey(candidate) === gluedPairKey(pair));
    return {
      kind: 'glued',
      sourceIndex: partner.index,
      sourceEntryDir: partner.dir,
      transform,
      coverQ,
      coverR,
      glueGroup: gluePairGroup(pair, pairIndex)
    };
  }

  function tileTransform(tile) {
    return {
      rotation: normalizeTransformRotation(tile && tile.rotation),
      flip: !!(tile && tile.flip)
    };
  }

  function transformRotationForVisibleDir(sourceDir, visibleDir, flip) {
    const sides = getLattice().sides;
    return normalizeTransformRotation(flip
      ? visibleDir + sourceDir
      : visibleDir - sourceDir, sides);
  }

  function normalizeTransformRotation(rotation, sides = getLattice().sides) {
    const value = Number(rotation);
    return modulo(Number.isFinite(value) ? Math.trunc(value) : 0, sides);
  }

  function transformDir(dir, transform) {
    const sides = getLattice().sides;
    const source = normalizeDir(dir, sides);
    const rotation = normalizeTransformRotation(transform && transform.rotation, sides);
    return (transform && transform.flip)
      ? modulo(rotation - source, sides)
      : modulo(source + rotation, sides);
  }

  function inverseTransformDir(dir, transform) {
    const sides = getLattice().sides;
    const visible = normalizeDir(dir, sides);
    const rotation = normalizeTransformRotation(transform && transform.rotation, sides);
    return (transform && transform.flip)
      ? modulo(rotation - visible, sides)
      : modulo(visible - rotation, sides);
  }

  function transformTileValue(tile, transform) {
    if (tile == null) return null;
    const normalizedTransform = tileTransform(transform || {});
    if (isVertexTileValue(tile)) {
      return vertexTileFromDirs(normalizeVertexTile(tile).map((dir) => transformDir(dir, normalizedTransform)));
    }
    return normalizeTile(tile).map((pair) => [
      transformDir(pair[0], normalizedTransform),
      transformDir(pair[1], normalizedTransform)
    ]);
  }

  function wanderCoverStep(visibleDir) {
    const lattice = getLattice();
    if (lattice.shape === 'square') {
      const offsets = getOffsets(0, lattice);
      return { q: offsets[visibleDir][1], r: offsets[visibleDir][0] };
    }
    const delta = HEX_AXIAL_DELTAS[visibleDir] || [0, 0];
    return { q: delta[0], r: delta[1] };
  }

  function wanderEdgeHitTest(clientX, clientY) {
    const hit = wanderTileHitTest(clientX, clientY);
    if (!hit) return null;
    const dx = hit.point.x - hit.tile.x;
    const dy = hit.point.y - hit.tile.y;
    if (Math.hypot(dx, dy) < wanderGeometry.radius * 0.34) return null;
    const dir = nearestDirectionFromVector(dx, dy);
    if (dir < 0) return null;
    return {
      id: hit.tile.id,
      tile: hit.tile,
      dir,
      point: hit.point
    };
  }

  function wanderTileHitTest(clientX, clientY) {
    if (!wanderGeometry || !state.wanderTiles.length) return null;
    const point = clientPointToWanderPoint(clientX, clientY);
    const tiles = visibleWanderTiles();
    for (let index = tiles.length - 1; index >= 0; index -= 1) {
      const tile = tiles[index];
      if (!Number.isFinite(tile.x) || !Number.isFinite(tile.y)) continue;
      const radius = wanderGeometry.radius * 0.96;
      if (Math.abs(point.x - tile.x) > radius || Math.abs(point.y - tile.y) > radius) continue;
      if (pointInPolygon(point, tilePoints(tile.x, tile.y, radius))) {
        return { tile, id: tile.id, point };
      }
    }
    return null;
  }

  function clientPointToWanderPoint(clientX, clientY) {
    const rect = refs.wanderCanvas.getBoundingClientRect();
    const scaleX = wanderGeometry.width / Math.max(1, rect.width);
    const scaleY = wanderGeometry.height / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function currentWanderTile() {
    return wanderTileById(state.wanderCurrentId);
  }

  function focusWanderCanvas() {
    if (!refs.wanderCanvas || !state.wanderOpen || !isGluedBoundaryMode()) return;
    if (typeof refs.wanderCanvas.focus === 'function') refs.wanderCanvas.focus({ preventScroll: true });
  }

  function wanderTileById(id) {
    return state.wanderTiles.find((tile) => tile.id === id) || null;
  }

  function findMatchingWanderTile(transition) {
    if (!transition) return null;
    const transform = tileTransform(transition.transform);
    return state.wanderTiles.find((tile) => (
      tile.coverQ === transition.coverQ
      && tile.coverR === transition.coverR
      && tile.sourceIndex === transition.sourceIndex
      && normalizeTransformRotation(tile.rotation) === transform.rotation
      && !!tile.flip === !!transform.flip
    )) || null;
  }

  function sameWanderHoverEdge(left, right) {
    if (!left || !right) return left === right;
    return left.id === right.id && left.dir === right.dir && left.kind === right.kind;
  }

  function currentWanderBoardKey() {
    const glued = cloneGluedEdges().map((pair, index) => ({
      first: boundaryEdgeKey(pair.first),
      second: boundaryEdgeKey(pair.second),
      group: gluePairGroup(pair, index),
      reversed: !!pair.reversed,
      firstArrowReversed: gluePairFirstArrowReversed(pair),
      secondArrowReversed: gluePairSecondArrowReversed(pair)
    }));
    return JSON.stringify({
      rows: state.rows,
      cols: state.cols,
      lattice: state.lattice,
      boundaryMode: state.boundaryMode,
      tiles: state.tiles,
      removed: Array.from(cloneRemovedTileSet()).sort((a, b) => a - b),
      cuts: Array.from(cloneCutEdgeSet()).sort(),
      glued
    });
  }

  function validateWanderBoardState() {
    if (!state.wanderOpen && !state.wanderTiles.length && !state.wanderSelectingStart) return;
    if (!isGluedBoundaryMode()) {
      resetWanderPath('', false);
      return;
    }
    if (state.wanderTiles.length && state.wanderBoardKey && state.wanderBoardKey !== currentWanderBoardKey()) {
      resetWanderPath('wander reset: board changed', true);
    }
  }

  function drawBackgroundCuspAngleFan(ctx, fan, color, radius) {
    if (!fan || !fan.origin || !fan.from || !fan.to) return;
    const startAngle = Math.atan2(fan.from.y, fan.from.x);
    const sweep = signedAngleBetween(fan.from, fan.to);
    const fanRadius = Math.max(8, radius * 0.31);
    const innerRadius = Math.max(3.5, radius * 0.08);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(
      fan.origin.x + (fan.from.x * innerRadius),
      fan.origin.y + (fan.from.y * innerRadius)
    );
    ctx.lineTo(
      fan.origin.x + (fan.from.x * fanRadius),
      fan.origin.y + (fan.from.y * fanRadius)
    );
    ctx.arc(
      fan.origin.x,
      fan.origin.y,
      fanRadius,
      startAngle,
      startAngle + sweep,
      sweep < 0
    );
    ctx.lineTo(
      fan.origin.x + (fan.to.x * innerRadius),
      fan.origin.y + (fan.to.y * innerRadius)
    );
    ctx.arc(
      fan.origin.x,
      fan.origin.y,
      innerRadius,
      startAngle + sweep,
      startAngle,
      sweep >= 0
    );
    ctx.closePath();
    ctx.fillStyle = color === '#1f7a8c' ? 'rgba(31,122,140,0.24)' : 'rgba(178,58,72,0.24)';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.1, radius * 0.03);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function backgroundCuspDisplayPositions(cusp) {
    if (!cusp || !Array.isArray(cusp.corners) || !geometry) return [];
    const clusters = new Map();
    cusp.corners.forEach((corner) => {
      const point = tileCornerPoint(corner.index, corner.vertex);
      if (!point) return;
      const key = tileCornerLogicalVertexKey(corner.index, corner.vertex);
      let cluster = clusters.get(key);
      if (!cluster) {
        cluster = { point: { x: point.x, y: point.y }, corners: [] };
        clusters.set(key, cluster);
      }
      cluster.corners.push(corner);
      cluster.point = averagePoints(cluster.corners
        .map((item) => tileCornerPoint(item.index, item.vertex))
        .filter(Boolean));
    });
    return Array.from(clusters.values());
  }

  function drawPendingGlueChains(ctx) {
    const chains = state.pendingGlueChains;
    if (!chains && !state.backgroundGlueFlicker) return;
    ctx.save();
    const first = chains ? chains.first || [] : [];
    const second = chains ? chains.second || [] : [];
    const color = pendingGlueColor();
    first.forEach((edge, index) => {
      drawPendingGlueEdge(ctx, edge, color, false);
    });
    second.forEach((edge, index) => {
      drawPendingGlueEdge(ctx, edge, color, true);
    });
    drawBackgroundGlueFlicker(ctx);
    ctx.restore();
  }

  function drawPendingGlueEdge(ctx, edge, color, reverse, alpha = 0.78, widthScale = 1) {
    const segment = boundaryEdgeSegment(edge);
    if (!segment) return;
    const lineWidth = hoverEdgeLineWidth(geometry.radius) * 1.25 * widthScale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawBackgroundBoundarySegment(ctx, segment);
    drawSegmentArrow(ctx, segment, reverse, color, lineWidth);
    ctx.restore();
  }

  function pendingGlueColor() {
    return gluedBoundaryColor(nextGlueGroup());
  }

  function drawBackgroundGlueFlicker(ctx) {
    const flicker = state.backgroundGlueFlicker;
    if (!flicker || !Array.isArray(flicker.edges) || !flicker.edges.length) return;
    const elapsed = performance.now() - flicker.start;
    const phase = Math.floor((elapsed / flicker.duration) * flicker.flashes * 2);
    if (phase % 2 !== 0) return;
    flicker.edges.forEach((edge) => {
      drawPendingGlueEdge(ctx, edge, '#b23a48', false, 1, 3.2);
    });
  }

  function drawBackgroundBoundaries(ctx) {
    if (!isGluedBoundaryMode()) return;
    const lattice = getLattice();
    const radius = geometry.radius;
    const lineWidth = hoverEdgeLineWidth(radius);
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let index = 0; index < state.rows * state.cols; index += 1) {
      if (!tileExists(index)) continue;
      const cell = geometry.cells[index];
      if (!cell) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        if (!isBackgroundBoundaryEdge(index, dir) || isGluedBoundaryEdge(index, dir)) continue;
        const next = neighbor(cell.row, cell.col, dir, state.rows, state.cols, lattice, state.wrapped);
        if (next) {
          const nextIndex = indexOf(next.row, next.col, state.cols);
          if (tileExists(nextIndex)) {
            if (!hasCutEdgeBetween(index, nextIndex)) continue;
            const nextCell = geometry.cells[nextIndex];
            if (!nextCell) continue;
            pairedTileEdgeSegmentsBetweenCells(cell, nextCell, dir, radius).forEach((edgeSegment) => {
              drawBackgroundBoundarySegment(ctx, edgeSegment);
            });
            continue;
          }
        }
        const segment = edgeSegmentPoints(cell.x, cell.y, dir, radius * 0.96);
        drawBackgroundBoundarySegment(ctx, segment);
      }
    }
    drawGluedBoundaryPairs(ctx);
    ctx.restore();
  }

  function drawGluedBoundaryPairs(ctx) {
    const pairs = cloneGluedEdges();
    if (!pairs.length) return;
    pairs.forEach((pair, pairIndex) => {
      const color = gluedBoundaryColor(gluePairGroup(pair, pairIndex));
      drawGluedBoundaryEdge(ctx, pair.first, color, gluePairFirstArrowReversed(pair));
      drawGluedBoundaryEdge(ctx, pair.second, color, gluePairSecondArrowReversed(pair));
    });
  }

  function drawGluedBoundaryEdge(ctx, edge, color, reverse) {
    const segment = boundaryEdgeSegment(edge);
    if (!segment) return;
    const lineWidth = hoverEdgeLineWidth(geometry.radius) * 1.15;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawBackgroundBoundarySegment(ctx, segment);
    drawSegmentArrow(ctx, segment, reverse, color, lineWidth);
    ctx.restore();
  }

  function drawSegmentArrow(ctx, segment, reverse, color, lineWidth) {
    const start = reverse ? segment.end : segment.start;
    const end = reverse ? segment.start : segment.end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return;
    const ux = dx / length;
    const uy = dy / length;
    const size = Math.max(5.5, geometry.radius * 0.15);
    const tip = {
      x: start.x + dx * 0.62,
      y: start.y + dy * 0.62
    };
    const base = {
      x: tip.x - ux * size,
      y: tip.y - uy * size
    };
    const normal = { x: -uy, y: ux };
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(base.x + normal.x * size * 0.46, base.y + normal.y * size * 0.46);
    ctx.lineTo(base.x - normal.x * size * 0.46, base.y - normal.y * size * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1, lineWidth * 0.58);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function gluedBoundaryColor(pairIndex) {
    return GLUED_BOUNDARY_COLORS[modulo(pairIndex, GLUED_BOUNDARY_COLORS.length)];
  }

  function gluePairGroup(pair, fallback) {
    const group = normalizeGlueGroup(pair && pair.group);
    return group == null ? fallback : group;
  }

  function boundaryEdgeSegment(edge, radiusScale = 0.96) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized) return null;
    const cell = geometry.cells[normalized.index];
    if (!cell) return null;
    return edgeSegmentPoints(cell.x, cell.y, normalized.dir, geometry.radius * radiusScale);
  }

  function drawBackgroundBoundarySegment(ctx, segment) {
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  function drawHoverEdgeSegment(ctx, segment, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  function hoverEdgeLineWidth(radius = geometry.radius) {
    return Math.max(1.8, radius * 0.055);
  }

  function pairedTileEdgeSegmentsBetweenCells(cell, nextCell, dir, radius) {
    const lattice = getLattice();
    return [
      edgeSegmentPoints(cell.x, cell.y, dir, radius * 0.96),
      edgeSegmentPoints(nextCell.x, nextCell.y, lattice.opposite[dir], radius * 0.96)
    ];
  }

  function isBackgroundBoundaryEdge(index, dir) {
    if (!tileExists(index)) return false;
    const lattice = getLattice();
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return true;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    return !tileExists(nextIndex) || hasCutEdgeBetween(index, nextIndex);
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

  function drawHalfEdgeDecorationLabels(ctx, graphData, palette) {
    if (!graphData || !graphData.legs || !graphData.legs.length) return;
    graphData.legs.forEach((leg) => {
      if (state.decorationHoverHit && state.decorationHoverHit.type === 'half-edge' && state.decorationHoverHit.key === halfEdgeDecorationKey(leg)) {
        drawHalfEdgeDecorationHover(ctx, leg, palette);
      }
      const label = leg.label || halfEdgeDecorationValue(halfEdgeDecorationKey(leg));
      if (!label) return;
      const point = halfEdgeDecorationLabelPoint(leg);
      if (!point) return;
      drawTextBadge(ctx, point.x, point.y, label, palette, Math.max(8, geometry.radius * 0.2));
    });
  }

  function drawHalfEdgeDecorationHover(ctx, leg, palette) {
    const end = halfEdgeDecorationEnd(leg);
    const point = halfEdgeDecorationMarkPoint(leg);
    const cell = end && geometry.cells[end.index];
    if (!point || !cell) return;
    const radius = geometry.radius;
    ctx.save();
    ctx.fillStyle = 'rgba(217,119,6,0.18)';
    circle(ctx, point.x, point.y, Math.max(7, radius * 0.18));
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = Math.max(1.5, radius * 0.04);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    circle(ctx, point.x, point.y, Math.max(3.5, radius * 0.075));
    ctx.strokeStyle = 'rgba(255,253,248,0.95)';
    ctx.lineWidth = Math.max(1, radius * 0.025);
    ctx.stroke();
    ctx.restore();
  }

  function drawTextBadge(ctx, x, y, value, palette, fontSize) {
    const text = String(value || '');
    if (!text) return;
    ctx.save();
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(text);
    const paddingX = Math.max(4, fontSize * 0.36);
    const paddingY = Math.max(2.5, fontSize * 0.24);
    const width = Math.max(fontSize + 5, metrics.width + paddingX * 2);
    const height = Math.max(fontSize + 4, fontSize + paddingY * 2);
    const radius = Math.min(4, height * 0.28);
    const left = x - width / 2;
    const top = y - height / 2;
    roundedRectPath(ctx, left, top, width, height, radius);
    ctx.fillStyle = 'rgba(255,253,248,0.96)';
    ctx.fill();
    ctx.strokeStyle = palette.accent2;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = palette.text;
    ctx.fillText(text, x, y + fontSize * 0.03);
    ctx.restore();
  }

  function drawPlainTextLabel(ctx, x, y, value, color, fontSize, align = 'center') {
    const text = String(value || '');
    if (!text) return;
    ctx.save();
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2.5, fontSize * 0.32);
    ctx.strokeStyle = 'rgba(255,253,248,0.92)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
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
    drawHoverEdgeSegment(ctx, segment, color, width);
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
    const markerWidth = hoverEdgeLineWidth(radius);
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
    const exists = tileExists(index);
    const tile = state.tiles[index];
    const mask = tileToMask(tile);
    const hasTile = exists && !isTileEmpty(tile);
    const points = tilePoints(cell.x, cell.y, radius * 0.96);
    const isDragTarget = !!state.drag && index === state.dragPreviewIndex;
    const isDragSource = exists && !!state.drag && state.drag.active && state.drag.type === 'canvas' && state.drag.sourceIndex === index;
    const displayTile = isDragTarget && !isTileEmpty(state.drag.tile) ? state.drag.tile : tile;
    const arcComponents = !isDragTarget && report.arcComponents
      ? report.arcComponents[index]
      : null;
    const spokeComponents = !isDragTarget && report.spokeComponents
      ? report.spokeComponents[index]
      : null;
    const isHover = exists && (isTilingMode() || (state.inputMode === 'draw' && !isDrawGestureAction()))
      && index === state.hoverIndex;
    const isDecorationHover = isDecorationMode() && index === state.hoverIndex;
    const isBackgroundHover = isGluedBoundaryMode() && state.inputMode === 'background' && index === state.hoverIndex;

    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = !exists
      ? '#e6e0d6'
      : (isDragTarget ? 'rgba(61,107,79,0.12)' : (isDragSource ? '#eee7dd' : (hasTile ? '#fffdf8' : '#f8f5ee')));
    ctx.strokeStyle = (isHover || isDecorationHover || isBackgroundHover || isDragTarget) ? palette.accent : palette.border;
    ctx.lineWidth = (isHover || isDecorationHover || isBackgroundHover || isDragTarget) ? 2 : 1;
    ctx.fill();
    ctx.stroke();

    if (!exists) {
      drawRemovedTileMark(ctx, cell, palette);
      if (state.showCoords) drawCellLabel(ctx, cell, palette);
      return;
    }

    if (shouldDrawSeifertSurfaceTile(displayTile)) {
      drawSeifertSurfaceTile(ctx, cell, displayTile, radius);
    }

    const drawTileLinework = shouldDrawSeifertBackground();
    if (drawTileLinework && isDualGraph() && isVertexTileValue(displayTile)) {
      drawGraphTile(ctx, cell, displayTile, palette, null, spokeComponents, {
        tileIndex: index,
        copy: offset,
        pickedLift
      });
      if (!isDragTarget && !isDragSource) {
        drawVertexDecoration(ctx, cell, vertexDecorationValue(index), palette, radius);
      }
    } else if (drawTileLinework) {
      drawPipe(ctx, cell, displayTile, palette, null, arcComponents, {
        tileIndex: index,
        copy: offset,
        pickedLift
      });
    }

    if (drawTileLinework && state.showErrors && !isDragTarget) drawOpenEndMarks(ctx, index, cell, mask, palette);
    if (state.showCoords) drawCellLabel(ctx, cell, palette);
  }

  function drawRemovedTileMark(ctx, cell, palette) {
    if (!isGluedBoundaryMode()) return;
    const radius = geometry.radius;
    ctx.save();
    ctx.strokeStyle = palette.muted;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = Math.max(1, radius * 0.035);
    ctx.beginPath();
    ctx.moveTo(cell.x - radius * 0.18, cell.y - radius * 0.18);
    ctx.lineTo(cell.x + radius * 0.18, cell.y + radius * 0.18);
    ctx.moveTo(cell.x + radius * 0.18, cell.y - radius * 0.18);
    ctx.lineTo(cell.x - radius * 0.18, cell.y + radius * 0.18);
    ctx.stroke();
    ctx.restore();
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

  function shouldDrawSeifertSurfaceTile(tile) {
    return !!(
      canShowSeifertSurface()
      && state.showSeifertSurface
      && !isTileEmpty(tile)
      && (isVertexTileValue(tile) || normalizeTile(tile).length)
    );
  }

  function shouldDrawSeifertBackground() {
    return !(canShowSeifertSurface() && state.showSeifertSurface && !state.showSeifertBackground);
  }

  function drawSeifertSurfaceTile(ctx, cell, tile, radius) {
    if (isVertexTileValue(tile)) drawSeifertSurfaceDisk(ctx, cell, tile, radius);
    else drawSeifertSurfaceBands(ctx, cell, tile, radius);
  }

  function seifertBandPixelWidth(radius) {
    return Math.max(6, radius * normalizeSeifertBandWidth(state.seifertBandWidth));
  }

  function seifertSurfaceOutlineWidth(radius) {
    return Math.max(0.65, radius * 0.016);
  }

  function seifertSurfaceFillColor() {
    return normalizeSeifertSurfaceColor(state.seifertSurfaceColor);
  }

  function seifertSurfaceStrokeColor(alpha = 0.62) {
    return colorWithAlpha(darkenHexColor(seifertSurfaceFillColor(), 0.58), alpha);
  }

  function drawSeifertSurfaceBands(ctx, cell, tile, radius) {
    const arcs = normalizeTile(tile);
    if (!arcs.length) return;
    const bandWidth = seifertBandPixelWidth(radius);
    const outlineWidth = seifertSurfaceOutlineWidth(radius);

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    arcs.forEach((pair) => {
      const path = getArcPath(cell, pair, radius);
      if (path) drawSeifertSurfaceBandRibbon(ctx, path, bandWidth, outlineWidth);
    });
    ctx.restore();
  }

  function drawSeifertSurfaceDisk(ctx, cell, tile, radius) {
    const dirs = normalizeVertexTile(tile);
    const points = seifertSurfaceBoundaryPoints(cell, dirs, radius);
    if (points.length < 2) {
      drawSeifertSurfaceCore(ctx, cell, radius, seifertDiskFallbackRadius(radius));
      return;
    }
    drawSeifertSurfaceArcDisk(ctx, cell, points, radius);
  }

  function seifertSurfaceBoundaryPoints(cell, dirs, radius) {
    if (!dirs.length) return [];
    const bandWidth = seifertBandPixelWidth(radius);
    const edgeDistance = edgeConnectionDistance(radius);
    const sideHalf = seifertSurfaceSideHalfLength(radius);
    const halfWidth = clamp(bandWidth * 0.5, radius * 0.05, sideHalf * 0.9);
    const lattice = getLattice();
    const points = [];
    dirs.forEach((dir) => {
      const normalized = normalizeDir(dir, lattice.sides);
      const angle = lattice.angles[normalized];
      const center = edgePoint(cell.x, cell.y, normalized, edgeDistance);
      const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
      [-1, 1].forEach((side) => {
        const x = center.x + tangent.x * halfWidth * side;
        const y = center.y + tangent.y * halfWidth * side;
        points.push({
          x,
          y,
          dir: normalized,
          edgeCenter: center,
          edgeTangent: tangent,
          angle: moduloAngle(Math.atan2(y - cell.y, x - cell.x))
        });
      });
    });
    return points.sort((left, right) => left.angle - right.angle);
  }

  function seifertSurfaceSideHalfLength(radius) {
    const lattice = getLattice();
    const points = tilePoints(0, 0, radius, lattice);
    if (lattice.shape === 'square') return radius;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) * 0.5;
  }

  function drawSeifertSurfaceArcDisk(ctx, cell, points, radius) {
    if (points.length === 2 && points[0].dir === points[1].dir) {
      drawSeifertSurfaceSingleMouthDisk(ctx, cell, points[0], points[1], radius);
      return;
    }
    const segments = points.map((current, index) => ({
      current,
      next: points[(index + 1) % points.length],
      segment: seifertSurfaceBoundarySegment(cell, current, points[(index + 1) % points.length])
    }));
    ctx.save();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = seifertSurfaceOutlineWidth(radius);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    segments.forEach(({ current, next, segment }) => appendSeifertSurfaceBoundarySegment(ctx, current, next, segment));
    ctx.closePath();
    ctx.fill();
    segments.forEach(({ current, next, segment }) => {
      if (segment.edgeCoincident) return;
      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      appendSeifertSurfaceBoundarySegment(ctx, current, next, segment);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawSeifertSurfaceSingleMouthDisk(ctx, cell, current, next, radius) {
    const segment = seifertSameEdgeSemicircle(cell, current, next);
    if (!segment) {
      drawSeifertSurfaceCore(ctx, cell, radius, seifertDiskFallbackRadius(radius));
      return;
    }
    ctx.save();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = seifertSurfaceOutlineWidth(radius);
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.arc(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, segment.anticlockwise);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, segment.anticlockwise);
    ctx.stroke();
    ctx.restore();
  }

  function seifertSurfaceBoundarySegment(cell, current, next) {
    if (current.dir === next.dir) {
      return { type: 'line', edgeCoincident: true };
    }
    const guide = seifertSurfaceBoundaryGuidePoint(cell, current, next);
    const circle = seifertSurfacePerpendicularCircle(current, next, guide);
    return circle || { type: 'line', edgeCoincident: false };
  }

  function appendSeifertSurfaceBoundarySegment(ctx, current, next, segment) {
    if (!segment || segment.type === 'line') {
      ctx.lineTo(next.x, next.y);
      return;
    }
    appendSeifertSurfaceArcSegment(ctx, current, next, segment);
  }

  function appendSeifertSurfaceArcSegment(ctx, current, next, circle) {
    const startAngle = Math.atan2(current.y - circle.center.y, current.x - circle.center.x);
    const endAngle = Math.atan2(next.y - circle.center.y, next.x - circle.center.x);
    const guideAngle = Math.atan2(circle.guide.y - circle.center.y, circle.guide.x - circle.center.x);
    const ccwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, false);
    const cwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, true);
    const anticlockwise = cwHasGuide && !ccwHasGuide;
    ctx.arc(circle.center.x, circle.center.y, circle.radius, startAngle, endAngle, anticlockwise);
  }

  function seifertSurfacePerpendicularCircle(current, next, guide) {
    const tangentA = current.edgeTangent || edgeTangentFromDir(current.dir);
    const tangentB = next.edgeTangent || edgeTangentFromDir(next.dir);

    const center = lineIntersection(current, tangentA, next, tangentB);
    if (!center) return null;
    const radiusA = Math.hypot(current.x - center.x, current.y - center.y);
    const radiusB = Math.hypot(next.x - center.x, next.y - center.y);
    const tolerance = Math.max(0.5, geometry.radius * 0.015);
    if (
      Number.isFinite(radiusA)
      && Number.isFinite(radiusB)
      && radiusA >= 0.001
      && Math.abs(radiusA - radiusB) <= tolerance
      && radiusA <= geometry.radius * 16
    ) {
      return { type: 'arc', center, radius: (radiusA + radiusB) * 0.5, guide };
    }
    return null;
  }

  function edgeTangentFromDir(dir) {
    const angle = getLattice().angles[normalizeDir(dir, getLattice().sides)];
    return { x: -Math.sin(angle), y: Math.cos(angle) };
  }

  function seifertSurfaceBoundaryGuidePoint(cell, current, next) {
    const gap = moduloAngle(next.angle - current.angle);
    const lattice = getLattice();
    const mouthGap = Math.PI / lattice.sides;
    if (current.dir === next.dir && gap <= mouthGap) return current.edgeCenter;
    return { x: cell.x, y: cell.y };
  }

  function angleOnCircularSweep(startAngle, endAngle, testAngle, anticlockwise) {
    const sweep = anticlockwise
      ? moduloAngle(startAngle - endAngle)
      : moduloAngle(endAngle - startAngle);
    const offset = anticlockwise
      ? moduloAngle(startAngle - testAngle)
      : moduloAngle(testAngle - startAngle);
    return offset <= sweep + 0.0001;
  }

  function drawSeifertSurfaceBandRibbon(ctx, path, bandWidth, outlineWidth) {
    if (path.type === 'line') {
      drawSeifertSurfaceLineRibbon(ctx, path, bandWidth, outlineWidth);
    } else if (path.type === 'arc') {
      drawSeifertSurfaceCircularRibbon(ctx, path, bandWidth, outlineWidth);
    } else {
      drawSeifertSurfaceQuadraticRibbon(ctx, path, bandWidth, outlineWidth);
    }
  }

  function drawSeifertSurfaceLineRibbon(ctx, path, bandWidth, outlineWidth) {
    const halfWidth = bandWidth / 2;
    const tangent = normalizeVector(path.end.x - path.start.x, path.end.y - path.start.y, 1, 0);
    const normal = { x: -tangent.y, y: tangent.x };
    const startLeft = offsetPoint(path.start, normal, halfWidth);
    const endLeft = offsetPoint(path.end, normal, halfWidth);
    const endRight = offsetPoint(path.end, normal, -halfWidth);
    const startRight = offsetPoint(path.start, normal, -halfWidth);

    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(endLeft.x, endLeft.y);
    ctx.lineTo(endRight.x, endRight.y);
    ctx.lineTo(startRight.x, startRight.y);
    ctx.closePath();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.fill();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = outlineWidth;
    ctx.beginPath();
    ctx.moveTo(startLeft.x, startLeft.y);
    ctx.lineTo(endLeft.x, endLeft.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startRight.x, startRight.y);
    ctx.lineTo(endRight.x, endRight.y);
    ctx.stroke();
  }

  function drawSeifertSurfaceCircularRibbon(ctx, path, bandWidth, outlineWidth) {
    const halfWidth = bandWidth / 2;
    const innerRadius = Math.max(0.5, path.arcRadius - halfWidth);
    const outerRadius = path.arcRadius + halfWidth;

    ctx.beginPath();
    ctx.arc(path.center.x, path.center.y, outerRadius, path.startAngle, path.endAngle, path.anticlockwise);
    ctx.arc(path.center.x, path.center.y, innerRadius, path.endAngle, path.startAngle, !path.anticlockwise);
    ctx.closePath();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.fill();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = outlineWidth;
    ctx.beginPath();
    ctx.arc(path.center.x, path.center.y, outerRadius, path.startAngle, path.endAngle, path.anticlockwise);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(path.center.x, path.center.y, innerRadius, path.startAngle, path.endAngle, path.anticlockwise);
    ctx.stroke();
  }

  function drawSeifertSurfaceQuadraticRibbon(ctx, path, bandWidth, outlineWidth) {
    const samples = sampleQuadraticRibbon(path, bandWidth / 2, 18);
    if (!samples.left.length || !samples.right.length) return;
    ctx.beginPath();
    samples.left.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    for (let index = samples.right.length - 1; index >= 0; index -= 1) {
      const point = samples.right[index];
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.fill();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = outlineWidth;
    strokeSeifertSurfacePolyline(ctx, samples.left);
    strokeSeifertSurfacePolyline(ctx, samples.right);
  }

  function strokeSeifertSurfacePolyline(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  function sampleQuadraticRibbon(path, halfWidth, steps) {
    const left = [];
    const right = [];
    const count = Math.max(2, Math.round(steps));
    for (let index = 0; index <= count; index += 1) {
      const t = index / count;
      const point = quadraticPoint(path.start, path.control, path.end, t);
      const tangent = quadraticTangent(path.start, path.control, path.end, t);
      const normal = normalizeVector(-tangent.y, tangent.x, 0, 1);
      left.push(offsetPoint(point, normal, halfWidth));
      right.push(offsetPoint(point, normal, -halfWidth));
    }
    return { left, right };
  }

  function quadraticPoint(start, control, end, t) {
    const u = 1 - t;
    return {
      x: (u * u * start.x) + (2 * u * t * control.x) + (t * t * end.x),
      y: (u * u * start.y) + (2 * u * t * control.y) + (t * t * end.y)
    };
  }

  function quadraticTangent(start, control, end, t) {
    return {
      x: (2 * (1 - t) * (control.x - start.x)) + (2 * t * (end.x - control.x)),
      y: (2 * (1 - t) * (control.y - start.y)) + (2 * t * (end.y - control.y))
    };
  }

  function offsetPoint(point, normal, distance) {
    return {
      x: point.x + normal.x * distance,
      y: point.y + normal.y * distance
    };
  }

  function seifertSameEdgeSemicircle(cell, current, next) {
    const center = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2
    };
    const radius = Math.hypot(current.x - next.x, current.y - next.y) / 2;
    if (!Number.isFinite(radius) || radius < 0.001) return null;
    const startAngle = Math.atan2(current.y - center.y, current.x - center.x);
    const endAngle = Math.atan2(next.y - center.y, next.x - center.x);
    const guideAngle = Math.atan2(cell.y - center.y, cell.x - center.x);
    const ccwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, false);
    const cwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, true);
    return {
      type: 'arc',
      center,
      radius,
      startAngle,
      endAngle,
      anticlockwise: cwHasGuide && !ccwHasGuide
    };
  }

  function seifertDiskFallbackRadius(radius) {
    return clamp(seifertBandPixelWidth(radius) * 0.82, radius * 0.18, radius * 0.55);
  }

  function drawSeifertSurfaceCore(ctx, cell, radius, coreRadius) {
    ctx.save();
    ctx.fillStyle = seifertSurfaceFillColor();
    ctx.strokeStyle = seifertSurfaceStrokeColor();
    ctx.lineWidth = seifertSurfaceOutlineWidth(radius);
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function analyzeSeifertSurface() {
    const lattice = getLattice();
    const radius = geometry && geometry.radius ? geometry.radius : 24;
    const pieces = [];
    const mouths = [];
    const mouthByPort = new Map();
    const surfaceParent = [];
    const surfaceRank = [];
    const boundaryParent = [];
    const boundaryRank = [];
    const boundaryEdges = [];
    const gluePairs = [];
    let disks = 0;
    let bands = 0;

    const addSurfacePiece = (kind, index, data = {}) => {
      const id = pieces.length;
      pieces.push({ id, kind, index, mouths: [], ...data });
      surfaceParent[id] = id;
      surfaceRank[id] = 0;
      if (kind === 'disk') disks += 1;
      if (kind === 'band') bands += 1;
      return pieces[id];
    };

    const addBoundaryNode = (pieceId, point = null) => {
      const id = boundaryParent.length;
      boundaryParent[id] = id;
      boundaryRank[id] = 0;
      return { id, pieceId, point };
    };

    const addMouth = (piece, dir) => {
      const normalized = normalizeDir(dir, lattice.sides);
      const negative = seifertMouthEndpointPoint(piece.index, normalized, -1, radius);
      const positive = seifertMouthEndpointPoint(piece.index, normalized, 1, radius);
      const mouth = {
        id: mouths.length,
        pieceId: piece.id,
        index: piece.index,
        dir: normalized,
        glued: false,
        partner: null,
        nodes: {
          '-1': addBoundaryNode(piece.id, negative).id,
          '1': addBoundaryNode(piece.id, positive).id
        },
        points: {
          '-1': negative,
          '1': positive
        }
      };
      mouths.push(mouth);
      piece.mouths.push(mouth);
      const key = seifertPortKey(mouth.index, mouth.dir);
      if (!mouthByPort.has(key)) mouthByPort.set(key, []);
      mouthByPort.get(key).push(mouth);
      return mouth;
    };

    const addBoundaryEdge = (left, right, pieceId, geometry = null) => {
      boundaryEdges.push({ left, right, pieceId, geometry });
      union(boundaryParent, boundaryRank, left, right);
    };

    for (let index = 0; index < state.tiles.length; index += 1) {
      if (!tileExists(index) || isTileEmpty(state.tiles[index])) continue;
      const tile = state.tiles[index];
      if (isVertexTileValue(tile)) {
        const piece = addSurfacePiece('disk', index, {
          dirs: normalizeVertexTile(tile)
        });
        piece.dirs.forEach((dir) => addMouth(piece, dir));
        continue;
      }
      normalizeTile(tile).forEach((pair, pairIndex) => {
        const cell = geometry && geometry.cells ? geometry.cells[index] : null;
        const piece = addSurfacePiece('band', index, {
          pair,
          pairIndex,
          path: cell ? getArcPath(cell, pair, radius) : null
        });
        addMouth(piece, pair[0]);
        addMouth(piece, pair[1]);
      });
    }

    mouths.forEach((mouth) => {
      if (mouth.glued) return;
      const next = connectedSurfaceNeighbor(mouth.index, mouth.dir, lattice);
      if (!next) return;
      const candidates = mouthByPort.get(seifertPortKey(next.index, next.dir)) || [];
      const partner = candidates.find((candidate) => candidate.id !== mouth.id && !candidate.glued);
      if (!partner) return;
      mouth.glued = true;
      partner.glued = true;
      mouth.partner = partner.id;
      partner.partner = mouth.id;
      gluePairs.push({ left: mouth.pieceId, right: partner.pieceId });
      union(surfaceParent, surfaceRank, mouth.pieceId, partner.pieceId);
      seifertGlueBoundaryMouths(mouth, partner, boundaryParent, boundaryRank);
    });

    pieces.forEach((piece) => {
      if (piece.kind === 'disk') {
        addSeifertDiskBoundaryEdges(piece, addBoundaryNode, addBoundaryEdge, radius);
      } else {
        addSeifertBandBoundaryEdges(piece, addBoundaryEdge, radius);
      }
    });

    const componentStats = new Map();
    pieces.forEach((piece) => {
      const root = find(surfaceParent, piece.id);
      if (!componentStats.has(root)) {
        componentStats.set(root, {
          root,
          pieces: 0,
          disks: 0,
          bands: 0,
          glues: 0,
          openEnds: 0,
          boundaryComponents: 0,
          eulerCharacteristic: 0,
          genus: null
        });
      }
      const stats = componentStats.get(root);
      stats.pieces += 1;
      if (piece.kind === 'disk') stats.disks += 1;
      if (piece.kind === 'band') stats.bands += 1;
    });

    gluePairs.forEach((pair) => {
      const root = find(surfaceParent, pair.left);
      const stats = componentStats.get(root);
      if (stats) stats.glues += 1;
    });

    mouths.forEach((mouth) => {
      if (mouth.glued) return;
      const root = find(surfaceParent, mouth.pieceId);
      const stats = componentStats.get(root);
      if (stats) stats.openEnds += 1;
    });

    const boundaryRootToSurfaceRoot = new Map();
    const boundaryRootToIndex = new Map();
    boundaryEdges.forEach((edge) => {
      const boundaryRoot = find(boundaryParent, edge.left);
      if (!boundaryRootToIndex.has(boundaryRoot)) boundaryRootToIndex.set(boundaryRoot, boundaryRootToIndex.size);
      if (!boundaryRootToSurfaceRoot.has(boundaryRoot)) {
        boundaryRootToSurfaceRoot.set(boundaryRoot, find(surfaceParent, edge.pieceId));
      }
    });
    boundaryRootToSurfaceRoot.forEach((surfaceRoot) => {
      const stats = componentStats.get(surfaceRoot);
      if (stats) stats.boundaryComponents += 1;
    });

    const components = Array.from(componentStats.values()).map((stats) => {
      stats.eulerCharacteristic = stats.pieces - stats.glues;
      stats.genus = numericTopologyInvariant((2 - stats.boundaryComponents - stats.eulerCharacteristic) / 2);
      return stats;
    });

    const eulerCharacteristic = components.reduce((total, item) => total + item.eulerCharacteristic, 0);
    const genus = components.length
      ? numericTopologyInvariant(components.reduce((total, item) => total + (Number(item.genus) || 0), 0))
      : null;
    const boundaryComponents = components.reduce((total, item) => total + item.boundaryComponents, 0);
    const openEnds = components.reduce((total, item) => total + item.openEnds, 0);

    return {
      active: pieces.length,
      disks,
      bands,
      gluedMouths: gluePairs.length,
      openEnds,
      components: components.length,
      connected: pieces.length > 0 && components.length === 1,
      boundaryComponents,
      eulerCharacteristic,
      genus,
      orientable: true,
      componentGenus: components.map((item) => item.genus),
      componentStats: components,
      boundaryColors: Array.from({ length: boundaryComponents }, (_, index) => seifertBoundaryColor(index)),
      boundarySegments: boundaryEdges
        .filter((edge) => edge.geometry)
        .map((edge) => ({
          ...edge.geometry,
          boundary: boundaryRootToIndex.get(find(boundaryParent, edge.left)) || 0
        })),
      status: pieces.length === 0 ? 'empty' : (openEnds ? 'open' : 'closed')
    };
  }

  function addSeifertDiskBoundaryEdges(piece, addBoundaryNode, addBoundaryEdge, radius) {
    if (!piece.mouths.length) {
      const node = addBoundaryNode(piece.id, null).id;
      addBoundaryEdge(node, node, piece.id, seifertIsolatedDiskBoundaryGeometry(piece, radius));
      return;
    }
    const lattice = getLattice();
    const mouthGap = Math.PI / lattice.sides;
    const points = [];
    piece.mouths.forEach((mouth) => {
      [-1, 1].forEach((side) => {
        const point = mouth.points[String(side)] || seifertMouthEndpointPoint(piece.index, mouth.dir, side, radius);
        const coordinate = point || { x: 0, y: 0 };
        points.push({
          ...coordinate,
          dir: mouth.dir,
          side,
          mouth,
          node: mouth.nodes[String(side)],
          angle: seifertBoundaryPointAngle(piece.index, point)
        });
      });
    });
    points.sort((left, right) => left.angle - right.angle);
    points.forEach((current, index) => {
      const next = points[(index + 1) % points.length];
      const gap = moduloAngle(next.angle - current.angle);
      const mouthInterval = current.mouth === next.mouth && gap <= mouthGap + 0.0001;
      if (!mouthInterval || !current.mouth.glued) {
        addBoundaryEdge(
          current.node,
          next.node,
          piece.id,
          mouthInterval ? null : seifertDiskBoundaryGeometry(piece, current, next)
        );
      }
    });
  }

  function addSeifertBandBoundaryEdges(piece, addBoundaryEdge, radius) {
    if (piece.mouths.length < 2) return;
    const left = piece.mouths[0];
    const right = piece.mouths[1];
    const sidePairs = seifertBandBoundarySidePairs(piece, left, right, radius);
    sidePairs.forEach((pair) => {
      addBoundaryEdge(
        left.nodes[String(pair.leftSide)],
        right.nodes[String(pair.rightSide)],
        piece.id,
        seifertBandSideGeometry(piece.path, pair.pathSide, radius)
      );
    });
    piece.mouths.forEach((mouth) => {
      if (!mouth.glued) addBoundaryEdge(mouth.nodes['-1'], mouth.nodes['1'], piece.id);
    });
  }

  function seifertBandBoundarySidePairs(piece, left, right, radius) {
    const path = piece.path;
    if (!path) return [
      { leftSide: -1, rightSide: -1, pathSide: -1 },
      { leftSide: 1, rightSide: 1, pathSide: 1 }
    ];
    const halfWidth = seifertMouthHalfWidth(radius);
    const startNormal = seifertPathNormal(path, false);
    const endNormal = seifertPathNormal(path, true);
    return [-1, 1].map((side) => ({
      leftSide: seifertNearestMouthSide(left, offsetPoint(path.start, startNormal, halfWidth * side)),
      rightSide: seifertNearestMouthSide(right, offsetPoint(path.end, endNormal, halfWidth * side)),
      pathSide: side
    }));
  }

  function seifertPathNormal(path, atEnd) {
    let tangent = { x: 1, y: 0 };
    if (path.type === 'line') {
      tangent = normalizeVector(path.end.x - path.start.x, path.end.y - path.start.y, 1, 0);
    } else if (path.type === 'arc') {
      const angle = atEnd ? path.endAngle : path.startAngle;
      tangent = path.anticlockwise
        ? { x: Math.sin(angle), y: -Math.cos(angle) }
        : { x: -Math.sin(angle), y: Math.cos(angle) };
    } else {
      tangent = atEnd
        ? normalizeVector(path.end.x - path.control.x, path.end.y - path.control.y, 1, 0)
        : normalizeVector(path.control.x - path.start.x, path.control.y - path.start.y, 1, 0);
    }
    return normalizeVector(-tangent.y, tangent.x, 0, 1);
  }

  function seifertIsolatedDiskBoundaryGeometry(piece, radius) {
    const cell = geometry && geometry.cells ? geometry.cells[piece.index] : null;
    if (!cell) return null;
    return {
      type: 'circle',
      x: cell.x,
      y: cell.y,
      radius: seifertDiskFallbackRadius(radius)
    };
  }

  function seifertDiskBoundaryGeometry(piece, current, next) {
    const cell = geometry && geometry.cells ? geometry.cells[piece.index] : null;
    if (!cell) return null;
    if (current.dir === next.dir) return seifertSameEdgeSemicircle(cell, current, next);
    const segment = seifertSurfaceBoundarySegment(cell, current, next);
    if (segment && segment.type === 'arc') {
      const startAngle = Math.atan2(current.y - segment.center.y, current.x - segment.center.x);
      const endAngle = Math.atan2(next.y - segment.center.y, next.x - segment.center.x);
      const guideAngle = Math.atan2(segment.guide.y - segment.center.y, segment.guide.x - segment.center.x);
      const ccwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, false);
      const cwHasGuide = angleOnCircularSweep(startAngle, endAngle, guideAngle, true);
      return {
        type: 'arc',
        center: segment.center,
        radius: segment.radius,
        startAngle,
        endAngle,
        anticlockwise: cwHasGuide && !ccwHasGuide
      };
    }
    return {
      type: 'line',
      start: { x: current.x, y: current.y },
      end: { x: next.x, y: next.y }
    };
  }

  function seifertBandSideGeometry(path, side, radius) {
    if (!path) return null;
    return {
      type: 'polyline',
      points: sampleSeifertPathSide(path, seifertMouthHalfWidth(radius) * side, 24)
    };
  }

  function sampleSeifertPathSide(path, offset, steps) {
    const points = [];
    const count = Math.max(2, Math.round(steps));
    for (let index = 0; index <= count; index += 1) {
      const t = index / count;
      const point = seifertPathPoint(path, t);
      const tangent = seifertPathTangent(path, t);
      const normal = normalizeVector(-tangent.y, tangent.x, 0, 1);
      points.push(offsetPoint(point, normal, offset));
    }
    return points;
  }

  function seifertPathPoint(path, t) {
    if (path.type === 'line') {
      return {
        x: path.start.x + (path.end.x - path.start.x) * t,
        y: path.start.y + (path.end.y - path.start.y) * t
      };
    }
    if (path.type === 'arc') {
      const sweep = path.anticlockwise
        ? -moduloAngle(path.startAngle - path.endAngle)
        : moduloAngle(path.endAngle - path.startAngle);
      const angle = path.startAngle + sweep * t;
      return {
        x: path.center.x + Math.cos(angle) * path.arcRadius,
        y: path.center.y + Math.sin(angle) * path.arcRadius
      };
    }
    return quadraticPoint(path.start, path.control, path.end, t);
  }

  function seifertPathTangent(path, t) {
    if (path.type === 'line') return normalizeVector(path.end.x - path.start.x, path.end.y - path.start.y, 1, 0);
    if (path.type === 'arc') {
      const sweep = path.anticlockwise
        ? -moduloAngle(path.startAngle - path.endAngle)
        : moduloAngle(path.endAngle - path.startAngle);
      const angle = path.startAngle + sweep * t;
      return path.anticlockwise
        ? { x: Math.sin(angle), y: -Math.cos(angle) }
        : { x: -Math.sin(angle), y: Math.cos(angle) };
    }
    return quadraticTangent(path.start, path.control, path.end, t);
  }

  function seifertGlueBoundaryMouths(left, right, boundaryParent, boundaryRank) {
    const used = new Set();
    [-1, 1].forEach((side) => {
      const match = seifertNearestMouthSide(right, left.points[String(side)], used);
      used.add(match);
      union(boundaryParent, boundaryRank, left.nodes[String(side)], right.nodes[String(match)]);
    });
  }

  function seifertNearestMouthSide(mouth, point, used = null) {
    let best = null;
    [-1, 1].forEach((side) => {
      if (used && used.has(side)) return;
      const endpoint = mouth.points[String(side)];
      const distance = endpoint && point ? Math.hypot(endpoint.x - point.x, endpoint.y - point.y) : Math.abs(side);
      if (!best || distance < best.distance) best = { side, distance };
    });
    return best ? best.side : 1;
  }

  function seifertMouthEndpointPoint(index, dir, side, radius) {
    const cell = geometry && geometry.cells ? geometry.cells[index] : null;
    if (!cell) return null;
    const normalized = normalizeDir(dir, getLattice().sides);
    const angle = getLattice().angles[normalized];
    const center = edgePoint(cell.x, cell.y, normalized, edgeConnectionDistance(radius));
    const tangent = { x: -Math.sin(angle), y: Math.cos(angle) };
    const halfWidth = seifertMouthHalfWidth(radius);
    return {
      x: center.x + tangent.x * halfWidth * side,
      y: center.y + tangent.y * halfWidth * side
    };
  }

  function seifertMouthHalfWidth(radius) {
    const sideHalf = seifertSurfaceSideHalfLength(radius);
    return clamp(seifertBandPixelWidth(radius) * 0.5, radius * 0.05, sideHalf * 0.9);
  }

  function seifertBoundaryPointAngle(index, point) {
    const cell = geometry && geometry.cells ? geometry.cells[index] : null;
    if (!cell || !point) return 0;
    return moduloAngle(Math.atan2(point.y - cell.y, point.x - cell.x));
  }

  function seifertPortKey(index, dir) {
    return `${index}:${normalizeDir(dir, getLattice().sides)}`;
  }

  function seifertBoundaryColor(index) {
    return SEIFERT_BOUNDARY_COLOR_PALETTE[modulo(index, SEIFERT_BOUNDARY_COLOR_PALETTE.length)];
  }

  function updateSeifertSurfaceChart() {
    if (!refs.seifertStats) return;
    const visible = canShowSeifertSurface() && !!state.showSeifertSurface;
    const analysis = visible ? analyzeSeifertSurface() : null;
    const stats = refs.seifertStats;
    if (!analysis || !analysis.active) {
      if (stats.pieces) stats.pieces.textContent = '-';
      if (stats.components) stats.components.textContent = '-';
      if (stats.connected) {
        stats.connected.textContent = '-';
        stats.connected.classList.remove('mosaic-status-good', 'mosaic-status-bad');
      }
      if (stats.boundary) stats.boundary.textContent = '-';
      if (stats.openEnds) {
        stats.openEnds.textContent = '-';
        stats.openEnds.classList.remove('mosaic-status-good', 'mosaic-status-bad');
      }
      if (stats.genusEuler) stats.genusEuler.textContent = '-';
      if (stats.boundaryColors) {
        stats.boundaryColors.hidden = true;
        stats.boundaryColors.innerHTML = '';
      }
      return;
    }
    if (stats.pieces) stats.pieces.textContent = `${analysis.disks} disk${analysis.disks === 1 ? '' : 's'}, ${analysis.bands} band${analysis.bands === 1 ? '' : 's'}`;
    if (stats.components) stats.components.textContent = String(analysis.components);
    if (stats.connected) {
      stats.connected.textContent = analysis.connected ? 'yes' : 'no';
      stats.connected.classList.toggle('mosaic-status-good', !!analysis.connected);
      stats.connected.classList.toggle('mosaic-status-bad', !analysis.connected);
    }
    if (stats.boundary) stats.boundary.textContent = String(analysis.boundaryComponents);
    if (stats.openEnds) {
      stats.openEnds.textContent = String(analysis.openEnds);
      stats.openEnds.classList.toggle('mosaic-status-good', analysis.openEnds === 0);
      stats.openEnds.classList.toggle('mosaic-status-bad', analysis.openEnds > 0);
    }
    if (stats.genusEuler) stats.genusEuler.textContent = `(${formatSeifertGenus(analysis)}, ${formatTopologyNumber(analysis.eulerCharacteristic)})`;
    if (stats.boundaryColors) {
      stats.boundaryColors.hidden = !(state.colorSeifertBoundaries && analysis.boundaryComponents > 1);
      stats.boundaryColors.innerHTML = state.colorSeifertBoundaries
        ? analysis.boundaryColors.map((color, index) => `<span class="mosaic-boundary-chip" style="--boundary-color: ${escapeHtmlAttribute(color)}" title="boundary ${index + 1}"></span>`).join('')
        : '';
    }
  }

  function formatSeifertGenus(analysis) {
    if (!analysis || analysis.genus == null) return '?';
    if (analysis.componentGenus && analysis.componentGenus.length > 1) {
      return `${formatTopologyNumber(analysis.genus)} total`;
    }
    return formatTopologyNumber(analysis.genus);
  }

  function drawSeifertBoundaryComponents(ctx) {
    if (!(canShowSeifertSurface() && state.showSeifertSurface && state.colorSeifertBoundaries)) return;
    const analysis = analyzeSeifertSurface();
    if (!analysis.boundarySegments || !analysis.boundarySegments.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(seifertSurfaceOutlineWidth(geometry.radius) * 1.6, 1.25);
    analysis.boundarySegments.forEach((segment) => {
      ctx.strokeStyle = seifertBoundaryColor(segment.boundary || 0);
      drawSeifertBoundarySegment(ctx, segment);
    });
    ctx.restore();
  }

  function drawSeifertBoundarySegment(ctx, segment) {
    if (!segment) return;
    ctx.beginPath();
    if (segment.type === 'circle') {
      ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
    } else if (segment.type === 'arc') {
      ctx.arc(segment.center.x, segment.center.y, segment.radius, segment.startAngle, segment.endAngle, segment.anticlockwise);
    } else if (segment.type === 'polyline') {
      if (!segment.points || !segment.points.length) return;
      segment.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
    } else if (segment.type === 'line') {
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
    } else {
      return;
    }
    ctx.stroke();
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

  function hitTest(clientX, clientY, options = {}) {
    if (!geometry) return -1;
    const includeRemoved = !!options.includeRemoved;
    const point = state.wrapped
      ? screenPointToWorld(clientPointToLogical(clientX, clientY))
      : clientPointToLogical(clientX, clientY);
    const offsets = state.wrapped ? getBoardCopyOffsets() : [{ x: 0, y: 0 }];

    for (const offset of offsets) {
      const x = point.x - offset.x;
      const y = point.y - offset.y;
      for (let index = 0; index < geometry.cells.length; index += 1) {
        if (!includeRemoved && !tileExists(index)) continue;
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

  function sharedEdgeHitTest(clientX, clientY) {
    if (!geometry) return null;
    return sharedEdgeHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY));
  }

  function boundaryEdgeHitTest(clientX, clientY) {
    if (!geometry) return null;
    return boundaryEdgeHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY));
  }

  function backgroundCuspHitTest(clientX, clientY) {
    if (!geometry || !shouldShowBackgroundCusps()) return null;
    return backgroundCuspHitAtBoardPoint(clientPointToBoardPoint(clientX, clientY));
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

  function sharedEdgeHitAtBoardPoint(point) {
    const offsets = state.wrapped ? getBoardCopyOffsets() : [{ x: 0, y: 0 }];
    const lattice = getLattice();
    let best = null;
    const maxDistance = Math.max(6, geometry.radius * 0.18);
    for (const offset of offsets) {
      const local = {
        x: point.x - offset.x,
        y: point.y - offset.y
      };
      for (let index = 0; index < geometry.cells.length; index += 1) {
        if (!tileExists(index)) continue;
        const cell = geometry.cells[index];
        if (!cell) continue;
        if (Math.abs(local.x - cell.x) > geometry.radius * 1.18 || Math.abs(local.y - cell.y) > geometry.radius * 1.18) continue;
        for (let dir = 0; dir < lattice.sides; dir += 1) {
          const next = neighbor(cell.row, cell.col, dir, state.rows, state.cols, lattice, state.wrapped);
          if (!next) continue;
          const nextIndex = indexOf(next.row, next.col, state.cols);
          if (index > nextIndex || !tileExists(nextIndex)) continue;
          const segment = edgeSegmentPoints(cell.x, cell.y, dir, geometry.radius * 0.96);
          const projection = projectPointToSegment(local, segment.start, segment.end);
          if (projection.distance > maxDistance) continue;
          if (!best || projection.distance < best.distance) {
            best = {
              index,
              dir,
              nextIndex,
              offset,
              distance: projection.distance,
              point: projection.point
            };
          }
        }
      }
    }
    return best;
  }

  function boundaryEdgeHitAtBoardPoint(point) {
    const offsets = state.wrapped ? getBoardCopyOffsets() : [{ x: 0, y: 0 }];
    const lattice = getLattice();
    let best = null;
    const maxDistance = Math.max(6, geometry.radius * 0.18);
    for (const offset of offsets) {
      const local = {
        x: point.x - offset.x,
        y: point.y - offset.y
      };
      for (let index = 0; index < geometry.cells.length; index += 1) {
        if (!tileExists(index)) continue;
        const cell = geometry.cells[index];
        if (!cell) continue;
        if (Math.abs(local.x - cell.x) > geometry.radius * 1.25 || Math.abs(local.y - cell.y) > geometry.radius * 1.25) continue;
        for (let dir = 0; dir < lattice.sides; dir += 1) {
          if (!isBackgroundBoundaryEdge(index, dir)) continue;
          const segment = edgeSegmentPoints(cell.x, cell.y, dir, geometry.radius * 0.96);
          const projection = projectPointToSegment(local, segment.start, segment.end);
          if (projection.distance > maxDistance) continue;
          if (!best || projection.distance < best.distance) {
            best = {
              index,
              dir,
              offset,
              distance: projection.distance,
              point: projection.point
            };
          }
        }
      }
    }
    return best;
  }

  function backgroundCuspHitAtBoardPoint(point) {
    const vertices = computeDisplayedBackgroundCuspVertices();
    const maxDistance = Math.max(7, geometry.radius * 0.2);
    let best = null;
    vertices.forEach((vertex) => {
      backgroundCuspDisplayPositions(vertex).forEach((entry) => {
        const displayPoint = entry.point;
        if (!displayPoint) return;
        const distance = Math.hypot(point.x - displayPoint.x, point.y - displayPoint.y);
        if (distance > maxDistance) return;
        if (!best || distance < best.distance) {
          best = {
            id: vertex.id,
            label: vertex.label,
            distance
          };
        }
      });
    });
    return best;
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
    const next = connectedNeighbor(cell.row, cell.col, exitDir, lattice);
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
        if (!tileExists(index)) continue;
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
    const next = connectedSurfaceNeighbor(index, dir, lattice);
    if (!next) return false;
    return !!(tileToMask(state.tiles[next.index]) & (1 << next.dir));
  }

  function connectedNeighbor(row, col, dir, lattice = getLattice()) {
    const index = indexOf(row, col, state.cols);
    if (!tileExists(index)) return null;
    const next = neighbor(row, col, dir, state.rows, state.cols, lattice, state.wrapped);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, state.cols);
    if (hasCutEdgeBetween(index, nextIndex)) return null;
    return tileExists(nextIndex) ? next : null;
  }

  function connectedSurfaceNeighbor(index, dir, lattice = getLattice()) {
    if (!tileExists(index)) return null;
    const row = Math.floor(index / state.cols);
    const col = index % state.cols;
    const direct = connectedNeighbor(row, col, dir, lattice);
    if (direct) {
      const nextIndex = indexOf(direct.row, direct.col, state.cols);
      return {
        index: nextIndex,
        row: direct.row,
        col: direct.col,
        dir: lattice.opposite[dir]
      };
    }
    const partner = gluedBoundaryPartner(index, dir);
    if (!partner || !tileExists(partner.index)) return null;
    return {
      index: partner.index,
      row: Math.floor(partner.index / state.cols),
      col: partner.index % state.cols,
      dir: partner.dir
    };
  }

  function refreshExport() {
    const report = analyze();
    const lattice = getLattice();
    const backgroundBilliard = backgroundBilliardForExport();
    const seifertSurface = canShowSeifertSurface() ? seifertSurfaceForExport(analyzeSeifertSurface()) : null;
    const payload = {
      name: 'Mosaic Calculator',
      lattice: state.lattice,
      diagramType: state.diagramType,
      boundary: state.boundaryMode,
      wrappedViewMode: state.wrappedViewMode,
      inputMode: state.inputMode,
      backgroundAction: state.backgroundAction,
      backgroundMultiEdges: !!state.backgroundMultiEdges,
      backgroundCuspMarkerScale: normalizeBackgroundCuspMarkerScale(state.backgroundCuspMarkerScale),
      backgroundBilliardSpeed: normalizeBackgroundBilliardSpeed(state.backgroundBilliardSpeed),
      backgroundBilliardTrailLength: normalizeBackgroundBilliardTrailLength(state.backgroundBilliardTrailLength),
      backgroundBilliardArrowLength: normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength),
      backgroundBilliardHitMarkers: normalizeBackgroundBilliardHitMarkers(state.backgroundBilliardHitMarkers),
      backgroundBilliard: backgroundBilliard || undefined,
      clickMode: state.editMode,
      drawAction: state.drawAction,
      knotCodeKind: state.knotCodeKind,
      drawLayer: state.drawLayer,
      drawStyle: state.drawStyle,
      halfEdgeLabelStyle: state.halfEdgeLabelStyle,
      halfEdgeDecorations: { ...state.halfEdgeDecorations },
      clearVertexDecorations: !!state.clearVertexDecorations,
      clearHalfEdgeDecorations: !!state.clearHalfEdgeDecorations,
      display: {
        showOpenEnds: state.showErrors,
        showCoords: state.showCoords,
        colorComponents: state.colorComponents,
        pick: state.displayPick,
        cusps: state.showCusps,
        showSeifertSurface: !!state.showSeifertSurface,
        showSeifertBackground: !!state.showSeifertBackground,
        colorSeifertBoundaries: !!state.colorSeifertBoundaries,
        seifertBandWidth: normalizeSeifertBandWidth(state.seifertBandWidth),
        seifertSurfaceColor: normalizeSeifertSurfaceColor(state.seifertSurfaceColor),
        drawAction: state.drawAction,
        knotCodeKind: state.knotCodeKind,
        drawStyle: state.drawStyle,
        halfEdgeLabelStyle: state.halfEdgeLabelStyle,
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
      backgroundSpace: backgroundSpaceForExport(report),
      removedTiles: removedTilesForExport(),
      cutEdges: cutEdgesForExport(),
      gluedEdges: gluedEdgesForExport(),
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
      dualGraph: isDualGraph() ? buildDualGraphExport(report, lattice) : null,
      seifertSurface
    };
    refs.exportOut.value = JSON.stringify(payload, null, 2);
  }

  function seifertSurfaceForExport(analysis) {
    if (!analysis) return null;
    return {
      status: analysis.status,
      disks: analysis.disks,
      bands: analysis.bands,
      gluedMouths: analysis.gluedMouths,
      openEnds: analysis.openEnds,
      components: analysis.components,
      connected: analysis.connected,
      boundaryComponents: analysis.boundaryComponents,
      orientable: analysis.orientable,
      genus: analysis.genus,
      componentGenus: analysis.componentGenus,
      eulerCharacteristic: analysis.eulerCharacteristic
    };
  }

  function removedTilesForExport() {
    return Array.from(cloneRemovedTileSet()).sort((left, right) => left - right).map((index) => ({
      row: Math.floor(index / state.cols) + 1,
      col: (index % state.cols) + 1,
      index
    }));
  }

  function backgroundSpaceForExport(report) {
    return {
      ...(report.background || analyzeBackgroundSpace()),
      action: state.backgroundAction,
      multiEdges: !!state.backgroundMultiEdges,
      chainLength: normalizeBackgroundChainLength(state.backgroundChainLength),
      chainReversed: !!state.backgroundChainReversed,
      cuspMarkerScale: normalizeBackgroundCuspMarkerScale(state.backgroundCuspMarkerScale),
      billiardSpeed: normalizeBackgroundBilliardSpeed(state.backgroundBilliardSpeed),
      billiardTrailLength: normalizeBackgroundBilliardTrailLength(state.backgroundBilliardTrailLength),
      billiardArrowLength: normalizeBackgroundBilliardArrowLength(state.backgroundBilliardArrowLength),
      billiardHitMarkers: normalizeBackgroundBilliardHitMarkers(state.backgroundBilliardHitMarkers)
    };
  }

  function backgroundBilliardForExport() {
    const billiard = backgroundBilliardState();
    if (!billiard.position || billiard.tileIndex < 0 || !tileExists(billiard.tileIndex)) return null;
    const cell = geometry && geometry.cells ? geometry.cells[billiard.tileIndex] : null;
    if (!cell || !Number.isFinite(geometry.radius) || geometry.radius <= 0) return null;
    const direction = billiard.direction && Number.isFinite(billiard.direction.x) && Number.isFinite(billiard.direction.y)
      ? normalizeVector(billiard.direction.x, billiard.direction.y, 1, 0)
      : null;
    const angleRadians = direction ? Math.atan2(direction.y, direction.x) : null;
    return {
      tile: {
        row: Math.floor(billiard.tileIndex / state.cols) + 1,
        col: (billiard.tileIndex % state.cols) + 1,
        index: billiard.tileIndex
      },
      local: {
        x: roundExportNumber((billiard.position.x - cell.x) / geometry.radius, 6),
        y: roundExportNumber((billiard.position.y - cell.y) / geometry.radius, 6)
      },
      angleRadians: angleRadians == null ? undefined : roundExportNumber(angleRadians, 6),
      angleDegrees: angleRadians == null ? undefined : roundExportNumber(angleRadians * 180 / Math.PI, 4)
    };
  }

  function cutEdgesForExport() {
    return Array.from(cloneCutEdgeSet()).sort().map((key) => {
      const parsed = parseCutEdgeKey(key);
      if (!parsed) return null;
      const leftRow = Math.floor(parsed.left / state.cols);
      const leftCol = parsed.left % state.cols;
      const rightRow = Math.floor(parsed.right / state.cols);
      const rightCol = parsed.right % state.cols;
      return {
        left: {
          row: leftRow + 1,
          col: leftCol + 1,
          index: parsed.left
        },
        right: {
          row: rightRow + 1,
          col: rightCol + 1,
          index: parsed.right
        }
      };
    }).filter(Boolean);
  }

  function gluedEdgesForExport() {
    return cloneGluedEdges().map((pair, pairIndex) => ({
      id: pairIndex + 1,
      group: gluePairGroup(pair, pairIndex),
      color: gluedBoundaryColor(gluePairGroup(pair, pairIndex)),
      orientation: pair.reversed ? 'reversed' : 'opposite',
      reversed: !!pair.reversed,
      firstArrowReversed: gluePairFirstArrowReversed(pair),
      secondArrowReversed: gluePairSecondArrowReversed(pair),
      first: boundaryEdgeForExport(pair.first),
      second: boundaryEdgeForExport(pair.second)
    })).filter((pair) => pair.first && pair.second);
  }

  function boundaryEdgeForExport(edge) {
    const normalized = cloneBoundaryEdge(edge);
    if (!normalized) return null;
    const row = Math.floor(normalized.index / state.cols);
    const col = normalized.index % state.cols;
    const lattice = getLattice();
    return {
      row: row + 1,
      col: col + 1,
      index: normalized.index,
      dir: normalized.dir,
      edge: lattice.dirNames[normalized.dir]
    };
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
    refs.exportOut.value = formatConciseDualGraphPayload(buildDualGraphOnlyExport(report));
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
    const boundaryMode = normalizeBoundaryMode(wrapped);
    refs.gridRows.value = rows;
    refs.gridCols.value = cols;
    refs.diagramType.value = state.diagramType;
    refs.inputMode.value = state.inputMode;
    refs.latticeSelect.value = latticeName;
    if (refs.boundaryMode) refs.boundaryMode.value = boundaryMode;
    if (refs.wrapBoard) refs.wrapBoard.checked = boundaryMode === 'wrapped';
    refs.editMode.value = state.editMode;
    refs.drawAction.value = state.drawAction;
    refs.knotCodeKind.value = state.knotCodeKind;
    refs.drawLayer.value = state.drawLayer;
    refs.drawStyle.value = state.drawStyle;
    if (refs.backgroundAction) refs.backgroundAction.value = state.backgroundAction;
    if (refs.halfEdgeLabelStyle) refs.halfEdgeLabelStyle.value = normalizeHalfEdgeLabelStyle(state.halfEdgeLabelStyle);
    if (refs.clearVertexDecorations) refs.clearVertexDecorations.checked = !!state.clearVertexDecorations;
    if (refs.clearHalfEdgeDecorations) refs.clearHalfEdgeDecorations.checked = !!state.clearHalfEdgeDecorations;
    refs.colorComponents.checked = state.colorComponents;
    refs.displayPick.checked = state.displayPick;
    if (refs.showCusps) refs.showCusps.checked = state.showCusps;
    syncSeifertSurfaceControls();
    syncDualGraphInvariantVisibility();
    if (refs.showDualGraphCanvas) refs.showDualGraphCanvas.checked = state.showDualGraphCanvas;
    if (refs.showRiemannSurfaceCanvas) refs.showRiemannSurfaceCanvas.checked = state.showRiemannSurfaceCanvas;
    if (refs.showAlgebraicCurveCanvas) refs.showAlgebraicCurveCanvas.checked = state.showAlgebraicCurveCanvas;
    if (refs.dualGraphDegenerationInitialLayout) refs.dualGraphDegenerationInitialLayout.value = normalizeDualGraphDegenerationInitialLayout(state.dualGraphDegenerationInitialLayout);
    if (refs.dualGraphDegenerationForce) refs.dualGraphDegenerationForce.checked = !!state.dualGraphDegenerationForceEnabled;
    syncDualGraphDegenerationEmphasisControls();
    if (refs.showRiemannDebugCircles) refs.showRiemannDebugCircles.checked = state.showRiemannDebugCircles;
    if (refs.showRiemannBezierCurve) refs.showRiemannBezierCurve.checked = state.showRiemannBezierCurve;
    syncAlgebraicEnergyTermControls();
    syncDualGraphCanvasVisibility();
    syncRiemannNodeControls();
    refs.wrappedViewMode.value = state.wrappedViewMode;
    syncBackgroundPresetControls();
    syncImportPresetControls();
    updateInputModePanels();
    updateDrawModeControls();
    syncBackgroundModeControls();
    updateInputModeLock();
    updateDisplayControls();
    updatePickControls();
    syncMainCanvasCursor();
  }

  function updateInputModePanels() {
    refs.inputPanels.forEach((panel) => {
      const modes = (panel.dataset.inputPanel || '').split(/\s+/);
      panel.hidden = !modes.includes(state.inputMode);
    });
  }

  function syncBackgroundModeControls() {
    const occupiedAction = !!state.wanderSelectingStart;
    const glueAction = !occupiedAction && isBackgroundGlueAction();
    const billiardAction = !occupiedAction && isBackgroundBilliardAction();
    const hasGlue = hasGluedBoundaryPairs();
    if (refs.backgroundOccupiedOption) {
      refs.backgroundOccupiedOption.hidden = !occupiedAction;
      refs.backgroundOccupiedOption.disabled = !occupiedAction;
    }
    if (refs.backgroundReverseGlueOption) {
      refs.backgroundReverseGlueOption.hidden = !hasGlue;
      refs.backgroundReverseGlueOption.disabled = !hasGlue;
    }
    if (!hasGlue && state.backgroundAction === 'reverse-glue') state.backgroundAction = 'tile';
    if (refs.backgroundAction) {
      refs.backgroundAction.value = occupiedAction ? 'occupied' : state.backgroundAction;
      refs.backgroundAction.disabled = occupiedAction;
    }
    const chains = state.pendingGlueChains;
    const firstCount = chains && Array.isArray(chains.first) ? chains.first.length : 0;
    const secondCount = chains && Array.isArray(chains.second) ? chains.second.length : 0;
    const expectedCount = normalizeBackgroundChainLength(state.backgroundChainLength);
    const canUseChainButton = !!(
      glueAction
      && state.backgroundMultiEdges
      && chains
      && firstCount === expectedCount
      && (chains.phase === 'first' || secondCount === expectedCount)
    );
    if (refs.backgroundMultiEdges) refs.backgroundMultiEdges.checked = !!state.backgroundMultiEdges;
    if (refs.backgroundMultiEdgeRow) refs.backgroundMultiEdgeRow.hidden = !glueAction;
    if (refs.backgroundChainSettingsRow) refs.backgroundChainSettingsRow.hidden = !glueAction || !state.backgroundMultiEdges;
    if (refs.backgroundChainLength) {
      refs.backgroundChainLength.max = String(Math.max(1, state.rows * state.cols * getLattice().sides));
      refs.backgroundChainLength.value = String(normalizeBackgroundChainLength(state.backgroundChainLength));
    }
    if (refs.backgroundChainReversed) {
      refs.backgroundChainReversed.checked = activePendingGlueChainReversed();
    }
    if (refs.backgroundBilliardRow) refs.backgroundBilliardRow.hidden = !billiardAction;
    if (refs.backgroundBeginSecondChain) {
      refs.backgroundBeginSecondChain.hidden = !glueAction || !state.backgroundMultiEdges;
      refs.backgroundBeginSecondChain.textContent = chains && chains.phase === 'second' ? 'finish' : 'begin second';
      refs.backgroundBeginSecondChain.disabled = !canUseChainButton;
    }
    if (refs.backgroundCuspMarkerRow) refs.backgroundCuspMarkerRow.hidden = !isGluedBoundaryMode();
    if (refs.backgroundCuspMarkerScale) {
      const scale = normalizeBackgroundCuspMarkerScale(state.backgroundCuspMarkerScale);
      refs.backgroundCuspMarkerScale.value = scale.toFixed(2);
      if (refs.backgroundCuspMarkerScaleValue) refs.backgroundCuspMarkerScaleValue.textContent = scale.toFixed(2);
    }
    syncBackgroundBilliardControls();
  }

  function openWanderChart() {
    if (!isGluedBoundaryMode()) return;
    state.wanderOpen = true;
    if (refs.wanderCard) refs.wanderCard.classList.remove('collapsed');
    syncWanderControls();
    resizeWanderCanvas();
    renderWanderChart();
    syncMainCanvasCursor();
    focusWanderCanvas();
  }

  function beginWanderStartSelection() {
    if (!isGluedBoundaryMode()) return;
    if (state.wanderSelectingStart) {
      cancelWanderStartSelection();
      return;
    }
    enterWanderStartSelection();
  }

  function enterWanderStartSelection() {
    if (!isGluedBoundaryMode()) return;
    state.wanderOpen = true;
    if (!state.wanderSelectingStart) {
      state.wanderSelectionReturnInputMode = state.inputMode;
      state.wanderSelectionReturnBackgroundAction = state.backgroundAction;
    }
    state.wanderSelectingStart = true;
    applyWanderSelectionInputMode();
    syncWanderControls();
    renderWanderChart();
    syncMainCanvasCursor();
    if (refs.statusLine) refs.statusLine.textContent = 'wander: click an existing tile on the main canvas';
  }

  function cancelWanderStartSelection(message = 'wander start cancelled') {
    if (!state.wanderSelectingStart) return;
    state.wanderSelectingStart = false;
    restoreWanderSelectionInputMode();
    syncWanderControls(message);
    renderWanderChart();
    syncMainCanvasCursor();
  }

  function restoreWanderSelectionInputMode() {
    const returnMode = state.wanderSelectionReturnInputMode || state.inputMode;
    const returnAction = state.wanderSelectionReturnBackgroundAction || state.backgroundAction;
    state.wanderSelectionReturnInputMode = '';
    state.wanderSelectionReturnBackgroundAction = '';
    state.inputMode = normalizeInputMode(returnMode);
    state.backgroundAction = normalizeBackgroundAction(returnAction);
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    updateInputModePanels();
    updateInputModeLock();
    syncBackgroundModeControls();
  }

  function applyWanderSelectionInputMode() {
    state.inputMode = 'background';
    state.hoverIndex = -1;
    state.backgroundHoverEdge = null;
    state.backgroundHoverCusp = null;
    state.decorationHoverHit = null;
    if (state.backgroundBilliard) state.backgroundBilliard.aimPoint = null;
    clearDrawDebugHit(false);
    if (refs.inputMode) refs.inputMode.value = state.inputMode;
    updateInputModePanels();
    updateInputModeLock();
    syncBackgroundModeControls();
  }

  function setWanderWide(enabled) {
    stopWanderMarkerAnimation(false);
    stopWanderCameraAnimation(false);
    state.wanderWide = !!enabled;
    syncWanderPlacement();
    resizeWanderCanvas();
    renderWanderChart();
    focusWanderCanvas();
  }

  function resetWanderPath(message = '', keepOpen = false) {
    stopWanderMarkerAnimation(false);
    stopWanderCameraAnimation(false);
    const wasSelecting = state.wanderSelectingStart;
    state.wanderTiles = [];
    state.wanderCurrentId = null;
    state.wanderHoverEdge = null;
    state.wanderBounce = null;
    state.wanderStartIndex = -1;
    state.wanderSmokeMarks = [];
    state.wanderNextId = 1;
    state.wanderBoardKey = '';
    state.wanderCameraX = 0;
    state.wanderCameraY = 0;
    state.wanderSelectingStart = false;
    if (wasSelecting) restoreWanderSelectionInputMode();
    if (!keepOpen) state.wanderOpen = false;
    syncWanderControls(message);
    renderWanderChart();
    syncMainCanvasCursor();
  }

  function resetWanderForBoardChange(message = 'wander reset: board changed') {
    if (!state.wanderOpen && !state.wanderTiles.length) return;
    resetWanderPath(message, state.wanderOpen && isGluedBoundaryMode());
  }

  function syncWanderControls(message = '') {
    const available = isGluedBoundaryMode();
    if (!available) {
      state.wanderSelectingStart = false;
      state.wanderOpen = false;
    }
    if (refs.wanderOpenRow) refs.wanderOpenRow.hidden = !available;
    if (refs.openWander) refs.openWander.disabled = !available;
    if (refs.wanderCard) refs.wanderCard.hidden = !available || !state.wanderOpen;
    if (refs.wanderChooseStart) {
      refs.wanderChooseStart.disabled = !available;
      refs.wanderChooseStart.textContent = state.wanderSelectingStart ? 'cancel' : 'select';
    }
    if (refs.wanderReset) refs.wanderReset.disabled = !available || (!state.wanderTiles.length && !state.wanderSelectingStart);
    syncWanderMarkerRadiusControl();
    syncWanderSmokeControls();
    syncWanderPlacement();
    syncWanderStatus(message);
  }

  function normalizeWanderMarkerRadius(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 2, 0.55, 2.5);
  }

  function syncWanderMarkerRadiusControl() {
    const value = normalizeWanderMarkerRadius(state.wanderMarkerRadius);
    state.wanderMarkerRadius = value;
    if (refs.wanderMarkerRadius) refs.wanderMarkerRadius.value = value.toFixed(2);
    if (refs.wanderMarkerRadiusValue) refs.wanderMarkerRadiusValue.textContent = value.toFixed(2);
  }

  function normalizeWanderSmokeColor(value) {
    const normalized = String(value || '').toLowerCase();
    return ['white', 'blue', 'yellow', 'gray'].includes(normalized) ? normalized : 'white';
  }

  function normalizeWanderSmokeShape(value) {
    const normalized = String(value || '').toLowerCase();
    return normalized === 'puff' ? 'puff' : 'tile';
  }

  function normalizeWanderSmokeBrightness(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 1, 0.25, 1.8);
  }

  function normalizeWanderSmokeThickness(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 2, 0.35, 2.5);
  }

  function normalizeWanderSmokeOpacity(value) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : 1, 0.15, 1);
  }

  function normalizeWanderSmokeGradientStop(value, fallback) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : fallback, 0, 1);
  }

  function normalizedWanderSmokeGradientStops() {
    const inner = clamp(normalizeWanderSmokeGradientStop(state.wanderSmokeGradientInner, 0), 0, 0.9);
    const edge = clamp(normalizeWanderSmokeGradientStop(state.wanderSmokeGradientEdge, 1), 0.1, 1);
    const minMid = Math.min(0.98, inner + 0.01);
    const maxMid = Math.max(minMid, edge - 0.01);
    const mid = clamp(normalizeWanderSmokeGradientStop(state.wanderSmokeGradientMid, 0.5), minMid, maxMid);
    return {
      inner: Math.min(inner, mid - 0.01),
      mid,
      edge: Math.max(edge, mid + 0.01)
    };
  }

  function normalizeWanderSmokeAlpha(value, fallback) {
    const parsed = Number(value);
    return clamp(Number.isFinite(parsed) ? parsed : fallback, 0, 1);
  }

  function normalizedWanderSmokeAlphas() {
    return {
      inner: normalizeWanderSmokeAlpha(state.wanderSmokeAlphaInner, 1),
      mid: normalizeWanderSmokeAlpha(state.wanderSmokeAlphaMid, 0.5),
      edge: normalizeWanderSmokeAlpha(state.wanderSmokeAlphaEdge, 0)
    };
  }

  function bindWanderSmokeGradientControl(input, key) {
    if (!input) return;
    input.addEventListener('input', () => {
      state[key] = normalizeWanderSmokeGradientStop(input.value, key === 'wanderSmokeGradientMid' ? 0.5 : (key === 'wanderSmokeGradientEdge' ? 1 : 0));
      syncWanderSmokeControls();
      draw(analyze());
      focusWanderCanvas();
    });
  }

  function bindWanderSmokeAlphaControl(input, key) {
    if (!input) return;
    input.addEventListener('input', () => {
      state[key] = normalizeWanderSmokeAlpha(input.value, key === 'wanderSmokeAlphaMid' ? 0.5 : (key === 'wanderSmokeAlphaEdge' ? 0 : 1));
      syncWanderSmokeControls();
      draw(analyze());
      focusWanderCanvas();
    });
  }

  function syncWanderSmokeControls() {
    state.wanderSmokeColor = normalizeWanderSmokeColor(state.wanderSmokeColor);
    state.wanderSmokeBrightness = normalizeWanderSmokeBrightness(state.wanderSmokeBrightness);
    state.wanderSmokeShape = normalizeWanderSmokeShape(state.wanderSmokeShape);
    state.wanderSmokeThickness = normalizeWanderSmokeThickness(state.wanderSmokeThickness);
    state.wanderSmokeOpacity = normalizeWanderSmokeOpacity(state.wanderSmokeOpacity);
    const gradientStops = normalizedWanderSmokeGradientStops();
    state.wanderSmokeGradientInner = gradientStops.inner;
    state.wanderSmokeGradientMid = gradientStops.mid;
    state.wanderSmokeGradientEdge = gradientStops.edge;
    const alphas = normalizedWanderSmokeAlphas();
    state.wanderSmokeAlphaInner = alphas.inner;
    state.wanderSmokeAlphaMid = alphas.mid;
    state.wanderSmokeAlphaEdge = alphas.edge;
    const available = isGluedBoundaryMode();
    if (refs.wanderSmokeColor) {
      refs.wanderSmokeColor.value = state.wanderSmokeColor;
      refs.wanderSmokeColor.disabled = !available;
    }
    if (refs.wanderSmokeBrightness) {
      refs.wanderSmokeBrightness.value = state.wanderSmokeBrightness.toFixed(2);
      refs.wanderSmokeBrightness.disabled = !available;
    }
    if (refs.wanderSmokeBrightnessValue) refs.wanderSmokeBrightnessValue.textContent = state.wanderSmokeBrightness.toFixed(2);
    if (refs.wanderSmokeShape) {
      refs.wanderSmokeShape.value = state.wanderSmokeShape;
      refs.wanderSmokeShape.disabled = !available;
    }
    if (refs.wanderSmokeThickness) {
      refs.wanderSmokeThickness.value = state.wanderSmokeThickness.toFixed(2);
      refs.wanderSmokeThickness.disabled = !available;
    }
    if (refs.wanderSmokeThicknessValue) refs.wanderSmokeThicknessValue.textContent = state.wanderSmokeThickness.toFixed(2);
    if (refs.wanderSmokeOpacity) {
      refs.wanderSmokeOpacity.value = state.wanderSmokeOpacity.toFixed(2);
      refs.wanderSmokeOpacity.disabled = !available;
    }
    if (refs.wanderSmokeOpacityValue) refs.wanderSmokeOpacityValue.textContent = state.wanderSmokeOpacity.toFixed(2);
    if (refs.wanderSmokeGradientInner) {
      refs.wanderSmokeGradientInner.value = state.wanderSmokeGradientInner.toFixed(2);
      refs.wanderSmokeGradientInner.disabled = !available;
    }
    if (refs.wanderSmokeGradientInnerValue) refs.wanderSmokeGradientInnerValue.textContent = state.wanderSmokeGradientInner.toFixed(2);
    if (refs.wanderSmokeGradientMid) {
      refs.wanderSmokeGradientMid.value = state.wanderSmokeGradientMid.toFixed(2);
      refs.wanderSmokeGradientMid.disabled = !available;
    }
    if (refs.wanderSmokeGradientMidValue) refs.wanderSmokeGradientMidValue.textContent = state.wanderSmokeGradientMid.toFixed(2);
    if (refs.wanderSmokeGradientEdge) {
      refs.wanderSmokeGradientEdge.value = state.wanderSmokeGradientEdge.toFixed(2);
      refs.wanderSmokeGradientEdge.disabled = !available;
    }
    if (refs.wanderSmokeGradientEdgeValue) refs.wanderSmokeGradientEdgeValue.textContent = state.wanderSmokeGradientEdge.toFixed(2);
    if (refs.wanderSmokeAlphaInner) {
      refs.wanderSmokeAlphaInner.value = state.wanderSmokeAlphaInner.toFixed(2);
      refs.wanderSmokeAlphaInner.disabled = !available;
    }
    if (refs.wanderSmokeAlphaInnerValue) refs.wanderSmokeAlphaInnerValue.textContent = state.wanderSmokeAlphaInner.toFixed(2);
    if (refs.wanderSmokeAlphaMid) {
      refs.wanderSmokeAlphaMid.value = state.wanderSmokeAlphaMid.toFixed(2);
      refs.wanderSmokeAlphaMid.disabled = !available;
    }
    if (refs.wanderSmokeAlphaMidValue) refs.wanderSmokeAlphaMidValue.textContent = state.wanderSmokeAlphaMid.toFixed(2);
    if (refs.wanderSmokeAlphaEdge) {
      refs.wanderSmokeAlphaEdge.value = state.wanderSmokeAlphaEdge.toFixed(2);
      refs.wanderSmokeAlphaEdge.disabled = !available;
    }
    if (refs.wanderSmokeAlphaEdgeValue) refs.wanderSmokeAlphaEdgeValue.textContent = state.wanderSmokeAlphaEdge.toFixed(2);
  }

  function syncWanderStatus(message = '') {
    if (!refs.wanderStatus) return;
    if (message) {
      refs.wanderStatus.textContent = message;
      return;
    }
    if (!isGluedBoundaryMode()) {
      refs.wanderStatus.textContent = 'available in glued boundary mode';
      return;
    }
    if (state.wanderSelectingStart) {
      refs.wanderStatus.textContent = 'click an existing tile on the main canvas';
      return;
    }
    if (!state.wanderTiles.length) {
      refs.wanderStatus.textContent = 'select a start tile on the main canvas';
      return;
    }
    if (state.wanderBounce) {
      refs.wanderStatus.textContent = `boundary bounce at ${formatWanderSourceTile(state.wanderBounce.sourceIndex)}`;
      return;
    }
    const current = currentWanderTile();
    refs.wanderStatus.textContent = current
      ? `current: ${formatWanderSourceTile(current.sourceIndex)}; click an edge to wander`
      : 'click an edge to wander';
  }

  function syncWanderPlacement() {
    const card = refs.wanderCard;
    const sideHost = refs.wanderSideHost;
    const wideHost = refs.wanderWideHost;
    if (!card || !sideHost || !wideHost) return;
    const available = isGluedBoundaryMode() && state.wanderOpen;
    const target = state.wanderWide ? wideHost : sideHost;
    if (card.parentElement !== target) target.appendChild(card);
    card.classList.toggle('wide', state.wanderWide);
    wideHost.hidden = !(available && state.wanderWide);
    sideHost.hidden = !(available && !state.wanderWide);
    if (refs.wanderToggleWide) {
      refs.wanderToggleWide.textContent = state.wanderWide ? 'side' : 'wide';
      refs.wanderToggleWide.setAttribute('aria-pressed', state.wanderWide ? 'true' : 'false');
      refs.wanderToggleWide.disabled = !isGluedBoundaryMode();
    }
  }

  function formatWanderSourceTile(index) {
    if (!Number.isInteger(index) || index < 0) return 'tile -';
    return `r${Math.floor(index / state.cols) + 1}c${(index % state.cols) + 1}`;
  }

  function handleWanderStartPointerDown(event) {
    const hit = tileHitTest(event.clientX, event.clientY, 0.96);
    const index = hit ? hit.index : -1;
    if (index < 0 || !tileExists(index)) {
      syncWanderStatus('wander: choose an existing tile');
      renderWanderChart();
      return;
    }
    startWanderAtTile(index);
  }

  function startWanderAtTile(index) {
    if (!tileExists(index)) return false;
    stopWanderMarkerAnimation(false);
    stopWanderCameraAnimation(false);
    const wasSelecting = state.wanderSelectingStart;
    state.wanderOpen = true;
    state.wanderSelectingStart = false;
    state.wanderStartIndex = index;
    state.wanderNextId = 2;
    state.wanderCurrentId = 1;
    state.wanderHoverEdge = null;
    state.wanderBounce = null;
    state.wanderSmokeMarks = [];
    state.wanderCameraX = 0;
    state.wanderCameraY = 0;
    state.wanderBoardKey = currentWanderBoardKey();
    state.wanderTiles = [{
      id: 1,
      sourceIndex: index,
      tile: cloneTile(state.tiles[index]),
      rotation: 0,
      coverQ: 0,
      coverR: 0,
      parentId: null,
      fromDir: null,
      via: 'start'
    }];
    addWanderSmokeMark(state.wanderTiles[0]);
    if (wasSelecting) restoreWanderSelectionInputMode();
    syncWanderControls(`wander started at ${formatWanderSourceTile(index)}`);
    resizeWanderCanvas();
    renderWanderChart();
    focusWanderCanvas();
    draw(analyze());
    return true;
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
    if (refs.inputBackgroundOption) {
      refs.inputBackgroundOption.hidden = !isGluedBoundaryMode();
      refs.inputBackgroundOption.disabled = !isGluedBoundaryMode();
    }
    if (refs.diagramTypeRow) refs.diagramTypeRow.hidden = false;
    if (!isGluedBoundaryMode() && state.inputMode === 'background') {
      state.inputMode = 'draw';
      refs.inputMode.value = state.inputMode;
    }
    if (!isDualGraph() && state.inputMode === 'decoration') {
      state.inputMode = 'draw';
      refs.inputMode.value = state.inputMode;
    }
    if (refs.inputDecorationOption) {
      refs.inputDecorationOption.hidden = !isDualGraph();
      refs.inputDecorationOption.disabled = !isDualGraph();
    }
    if (!isDecorationMode() && state.decorationHoverHit) {
      state.decorationHoverHit = null;
      syncMainCanvasCursor();
    }
    updatePickControls();
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
    syncBackgroundModeControls();
  }

  function syncSeifertSurfaceControls() {
    const surfaceAvailable = canShowSeifertSurface();
    const width = normalizeSeifertBandWidth(state.seifertBandWidth);
    const color = normalizeSeifertSurfaceColor(state.seifertSurfaceColor);
    state.seifertBandWidth = width;
    state.seifertSurfaceColor = color;
    if (refs.showSeifertSurfaceRow) refs.showSeifertSurfaceRow.hidden = !surfaceAvailable;
    if (refs.showSeifertSurface) {
      refs.showSeifertSurface.disabled = !surfaceAvailable;
      refs.showSeifertSurface.textContent = state.showSeifertSurface ? 'Close surface' : 'Open surface';
      refs.showSeifertSurface.setAttribute('aria-pressed', state.showSeifertSurface ? 'true' : 'false');
    }
    const chartVisible = surfaceAvailable && !!state.showSeifertSurface;
    if (refs.seifertSurfaceCard) {
      refs.seifertSurfaceCard.hidden = !chartVisible;
      if (chartVisible) refs.seifertSurfaceCard.classList.remove('collapsed');
    }
    if (refs.showSeifertBackgroundRow) refs.showSeifertBackgroundRow.hidden = !chartVisible;
    if (refs.showSeifertBackground) {
      refs.showSeifertBackground.disabled = !chartVisible;
      refs.showSeifertBackground.checked = !!state.showSeifertBackground;
    }
    if (refs.colorSeifertBoundariesRow) refs.colorSeifertBoundariesRow.hidden = !chartVisible;
    if (refs.colorSeifertBoundaries) {
      refs.colorSeifertBoundaries.disabled = !chartVisible;
      refs.colorSeifertBoundaries.checked = !!state.colorSeifertBoundaries;
    }
    if (refs.seifertSurfaceColorRow) refs.seifertSurfaceColorRow.hidden = !chartVisible;
    if (refs.seifertSurfaceColor) {
      refs.seifertSurfaceColor.disabled = !chartVisible;
      refs.seifertSurfaceColor.value = color;
    }
    if (refs.seifertBandWidthRow) refs.seifertBandWidthRow.hidden = !chartVisible;
    if (refs.seifertBandWidth) {
      refs.seifertBandWidth.disabled = !chartVisible;
      refs.seifertBandWidth.value = width.toFixed(2);
    }
    if (refs.seifertBandWidthValue) refs.seifertBandWidthValue.textContent = width.toFixed(2);
  }

  function updateDisplayControls() {
    syncSeifertSurfaceControls();
    if (refs.wrappedViewRow) {
      refs.wrappedViewRow.hidden = !state.wrapped;
      refs.wrappedViewMode.disabled = !state.wrapped;
    }
    if (refs.showCuspsRow) refs.showCuspsRow.hidden = !isGluedBoundaryMode();
    if (refs.showCusps) refs.showCusps.disabled = !isGluedBoundaryMode();
    if (!isGluedBoundaryMode()) {
      state.backgroundHoverCusp = null;
      state.selectedBackgroundCusp = null;
    } else if (!shouldShowBackgroundCusps()) {
      state.backgroundHoverCusp = null;
      state.selectedBackgroundCusp = null;
    }
    if (refs.knotCard) refs.knotCard.hidden = isDualGraph();
    if (refs.dualGraphCard) refs.dualGraphCard.hidden = !isDualGraph();
    if (refs.dualGraphDegenerationsCard) refs.dualGraphDegenerationsCard.hidden = !isDualGraph();
    syncDualGraphDegenerationWidePlacement();
    syncWanderControls();
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

  function normalizeBoundaryMode(mode) {
    if (mode === true || mode === 'true' || mode === 'wrapped') return 'wrapped';
    if (mode === 'glued' || mode === 'glue' || mode === 'background') return 'glued';
    return 'grid';
  }

  function boundaryModeLabel() {
    if (state.boundaryMode === 'wrapped') return 'wrapped';
    if (state.boundaryMode === 'glued') return 'glued';
    return 'grid';
  }

  function syncInputModeForBoundaryChange(oldMode, nextMode) {
    if (nextMode === 'glued' && oldMode !== 'glued') {
      if (state.inputMode !== 'background') state.backgroundReturnInputMode = state.inputMode;
      state.inputMode = 'background';
      return;
    }
    if (oldMode === 'glued' && nextMode !== 'glued' && state.inputMode === 'background') {
      state.inputMode = normalizeInputMode(state.backgroundReturnInputMode || 'draw');
    }
  }

  function isDualGraph() {
    return state.diagramType === 'dual';
  }

  function canShowSeifertSurface() {
    return state.diagramType === 'link' || state.diagramType === 'dual';
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
    if (mode === 'background') return isGluedBoundaryMode() ? 'background' : 'draw';
    return ['draw', 'tiling', 'pick', 'import'].includes(mode) ? mode : 'draw';
  }

  function normalizeBackgroundAction(action) {
    if (action === 'boundary' || action === 'add-boundary' || action === 'addBoundary') return 'boundary';
    if (
      action === 'glue-boundary'
      || action === 'glueBoundary'
      || action === 'glued-boundary'
      || action === 'gluedBoundary'
    ) return 'glue-boundary';
    if (
      action === 'reverse-glue'
      || action === 'reverseGlue'
      || action === 'reverse-arrows'
      || action === 'reverseArrows'
    ) return hasGluedBoundaryPairs() ? 'reverse-glue' : 'tile';
    if (action === 'billiard' || action === 'billiards') return 'billiard';
    return 'tile';
  }

  function normalizeSeifertBandWidth(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_SEIFERT_BAND_WIDTH;
    return clamp(number, MIN_SEIFERT_BAND_WIDTH, MAX_SEIFERT_BAND_WIDTH);
  }

  function normalizeSeifertSurfaceColor(value, fallback = DEFAULT_SEIFERT_SURFACE_COLOR) {
    return normalizeHexColor(value, fallback);
  }

  function normalizeHexColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  function colorWithAlpha(color, alpha) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${clamp(alpha, 0, 1)})`;
  }

  function darkenHexColor(color, factor) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;
    const amount = clamp(factor, 0, 1);
    return rgbToHex(
      Math.round(rgb.r * amount),
      Math.round(rgb.g * amount),
      Math.round(rgb.b * amount)
    );
  }

  function hexToRgb(color) {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(color || '').trim());
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    };
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((channel) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
  }

  function normalizeBackgroundCuspMarkerScale(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_BACKGROUND_CUSP_MARKER_SCALE;
    return clamp(number, 0.35, 1.4);
  }

  function normalizeBackgroundBilliardSpeed(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_BACKGROUND_BILLIARD_SPEED;
    return clamp(number, 0.02, 0.38);
  }

  function normalizeBackgroundBilliardTrailLength(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_BACKGROUND_BILLIARD_TRAIL_LENGTH;
    return clamp(Math.round(number), 0, DEFAULT_BACKGROUND_BILLIARD_TRAIL_INFINITY);
  }

  function isInfiniteBackgroundBilliardTrailLength(value) {
    return normalizeBackgroundBilliardTrailLength(value) >= DEFAULT_BACKGROUND_BILLIARD_TRAIL_INFINITY;
  }

  function formatBackgroundBilliardTrailLength(value) {
    return isInfiniteBackgroundBilliardTrailLength(value) ? '\u221e' : String(Math.round(normalizeBackgroundBilliardTrailLength(value)));
  }

  function normalizeBackgroundBilliardArrowLength(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULT_BACKGROUND_BILLIARD_ARROW_LENGTH;
    return clamp(Math.round(number), 0, 40);
  }

  function normalizeBackgroundBilliardHitMarkers(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'none') return 'none';
    if (normalized === 'boundary' || normalized === 'boundary-glued' || normalized === 'glued') return 'boundary';
    return DEFAULT_BACKGROUND_BILLIARD_HIT_MARKERS;
  }

  function normalizeBackgroundChainLength(value) {
    const number = Number(value);
    const lattice = getLattice();
    const maxLength = Math.max(1, state.rows * state.cols * lattice.sides);
    if (!Number.isFinite(number)) return 1;
    return clamp(Math.round(number), 1, maxLength);
  }

  function normalizeDualGraphLayoutMethod(method) {
    const value = String(method || '').toLowerCase();
    if (value === 'shell') return 'shell';
    if (value === 'spectral') return 'spectral';
    if (value === 'kamada' || value === 'kamada-kawai' || value === 'kamada_kawai' || value === 'kk') return 'kamada-kawai';
    return 'force';
  }

  function normalizeDualGraphDegenerationInitialLayout(method) {
    const value = normalizeDualGraphLayoutMethod(method);
    return value === 'force' ? 'shell' : value;
  }

  function normalizeDualGraphDegenerationEmphasisStyle(style) {
    return String(style || '').toLowerCase() === 'black' ? 'black' : 'orange';
  }

  function normalizeDrawLayer(layer) {
    return layer === 'below' ? 'below' : 'above';
  }

  function normalizeDrawStyle(style) {
    return ['none', 'debug', 'shade'].includes(style) ? style : 'shade';
  }

  function normalizeHalfEdgeLabelStyle(style) {
    return ['number', 'letter', 'point', 'roman'].includes(style) ? style : 'number';
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

  function findParity(parent, parity, item) {
    if (parent[item] === item) return { root: item, value: 0 };
    const info = findParity(parent, parity, parent[item]);
    parity[item] ^= info.value;
    parent[item] = info.root;
    return {
      root: parent[item],
      value: parity[item]
    };
  }

  function unionParity(parent, rank, parity, left, right, difference) {
    const leftInfo = findParity(parent, parity, left);
    const rightInfo = findParity(parent, parity, right);
    const requiredDifference = Number(difference) & 1;
    if (leftInfo.root === rightInfo.root) {
      return (leftInfo.value ^ rightInfo.value) === requiredDifference;
    }
    let rootLeft = leftInfo.root;
    let rootRight = rightInfo.root;
    let valueLeft = leftInfo.value;
    let valueRight = rightInfo.value;
    if (rank[rootLeft] < rank[rootRight]) {
      const tempRoot = rootLeft;
      rootLeft = rootRight;
      rootRight = tempRoot;
      const tempValue = valueLeft;
      valueLeft = valueRight;
      valueRight = tempValue;
    }
    parent[rootRight] = rootLeft;
    parity[rootRight] = valueLeft ^ valueRight ^ requiredDifference;
    if (rank[rootLeft] === rank[rootRight]) rank[rootLeft] += 1;
    return true;
  }

  function gcd(left, right) {
    let a = Math.abs(Math.trunc(left));
    let b = Math.abs(Math.trunc(right));
    while (b) {
      const next = a % b;
      a = b;
      b = next;
    }
    return a || 1;
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

  function signedAngleBetween(from, to) {
    const angle = Math.atan2((from.x * to.y) - (from.y * to.x), (from.x * to.x) + (from.y * to.y));
    if (!Number.isFinite(angle)) return 0;
    if (angle > Math.PI) return angle - (Math.PI * 2);
    if (angle < -Math.PI) return angle + (Math.PI * 2);
    return angle;
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

  function roundExportNumber(value, decimals = 4) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    const scale = 10 ** Math.max(0, Math.trunc(decimals));
    const rounded = Math.round(number * scale) / scale;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function debounce(callback, delay) {
    let timer = null;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback.apply(this, args), delay);
    };
  }
})();
