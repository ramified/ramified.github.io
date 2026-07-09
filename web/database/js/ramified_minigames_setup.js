(() => {
  'use strict';

  const DIRS = { E: 0, S: 1, W: 2, N: 3 };
  const HEX_DIRS = { E: 0, SE: 1, SW: 2, W: 3, NW: 4, NE: 5 };
  const LATTICES = {
    square: {
      id: 'square',
      label: 'square',
      shape: 'square',
      dirNames: ['E', 'S', 'W', 'N'],
      dirLabels: ['right', 'down', 'left', 'up'],
      opposite: [DIRS.W, DIRS.N, DIRS.E, DIRS.S],
      angles: [0, 90, 180, 270].map(toRadians),
      sides: 4
    },
    hexagonal: {
      id: 'hexagonal',
      label: 'hexagonal',
      shape: 'hex',
      dirNames: ['E', 'SE', 'SW', 'W', 'NW', 'NE'],
      dirLabels: ['east', 'southeast', 'southwest', 'west', 'northwest', 'northeast'],
      opposite: [HEX_DIRS.W, HEX_DIRS.NW, HEX_DIRS.NE, HEX_DIRS.E, HEX_DIRS.SE, HEX_DIRS.SW],
      angles: [0, 60, 120, 180, 240, 300].map(toRadians),
      vertexAngles: [30, 90, 150, 210, 270, 330].map(toRadians),
      sides: 6
    }
  };
  const KEY_DIRS = {
    square: {
      ArrowRight: DIRS.E,
      ArrowDown: DIRS.S,
      ArrowLeft: DIRS.W,
      ArrowUp: DIRS.N
    },
    hexagonal: {
      ArrowRight: HEX_DIRS.E,
      ArrowDown: HEX_DIRS.SE,
      ArrowLeft: HEX_DIRS.W,
      ArrowUp: HEX_DIRS.NW,
      KeyW: HEX_DIRS.NW,
      KeyE: HEX_DIRS.NE,
      KeyA: HEX_DIRS.W,
      KeyD: HEX_DIRS.E,
      KeyZ: HEX_DIRS.SW,
      KeyX: HEX_DIRS.SE
    }
  };
  const OFFSETS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const HEX_AXIAL_DELTAS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1]
  ];
  const GLUE_COLORS = ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'];
  const MAX_COMPLETED_GLUINGS = 3;
  const PUSH_CHAIN_LIMIT = 50;
  const EVENT_GUARD = 900;
  const UNDO_LIMIT = 100;
  const GAME_MODES = {
    NUMBER_2048: '2048',
    GOMOKU: 'gomoku',
    CONNECT_FOUR: 'connect-four'
  };
  const GOMOKU_WIN_LENGTH = 5;
  const GOMOKU_COLORS = ['black', 'white'];
  const GOMOKU_DEFAULT_BOARD_SIZE = 15;
  const GOMOKU_MIN_BOARD_SIZE = 5;
  const GOMOKU_MAX_BOARD_SIZE = 25;
  const CONNECT_FOUR_WIN_LENGTH = 4;
  const CONNECT_FOUR_COLORS = ['red', 'yellow'];

  function gluePair(group, first, second, options = {}) {
    const pair = { group, first, second };
    if (options.reversed) pair.reversed = true;
    if (Object.prototype.hasOwnProperty.call(options, 'firstArrowReversed')) {
      pair.firstArrowReversed = !!options.firstArrowReversed;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'secondArrowReversed')) {
      pair.secondArrowReversed = !!options.secondArrowReversed;
    }
    return pair;
  }

  function createRubiksCubePreset(size, id, label) {
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

    const exportedGroups = size === 2
      ? { outer: 6, leftTop: 9, topRight: 13, topMiddle: 10, bottomLeft: 15, bottomRight: 12, bottomFar: 14 }
      : { outer: 0, leftTop: 1, topRight: 2, topMiddle: 3, bottomLeft: 4, bottomRight: 5, bottomFar: 6 };
    const gluedEdges = [];
    const add = (group, first, second) => gluedEdges.push(gluePair(group, first, second));

    const addOuter = () => {
      for (let row = size + 1; row <= size * 2; row += 1) {
        add(exportedGroups.outer, { row, col: 1, dir: DIRS.W }, { row, col: cols, dir: DIRS.E });
      }
    };
    const addLeftTop = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          exportedGroups.leftTop,
          { row: size + 1, col: size - offset, dir: DIRS.N },
          { row: size - offset, col: size + 1, dir: DIRS.W }
        );
      }
    };
    const addTopRight = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          exportedGroups.topRight,
          { row: 1, col: size * 2 - offset, dir: DIRS.N },
          { row: size + 1, col: size * 3 + 1 + offset, dir: DIRS.N }
        );
      }
    };
    const addTopMiddle = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          exportedGroups.topMiddle,
          { row: size - offset, col: size * 2, dir: DIRS.E },
          { row: size + 1, col: size * 2 + 1 + offset, dir: DIRS.N }
        );
      }
    };
    const addBottomLeft = () => {
      for (let offset = 0; offset < size; offset += 1) {
        if (size === 2) {
          add(
            exportedGroups.bottomLeft,
            { row: size * 2 + 1 + offset, col: size + 1, dir: DIRS.W },
            { row: size * 2, col: size - offset, dir: DIRS.S }
          );
        } else {
          add(
            exportedGroups.bottomLeft,
            { row: size * 2, col: 1 + offset, dir: DIRS.S },
            { row: rows - offset, col: size + 1, dir: DIRS.W }
          );
        }
      }
    };
    const addBottomRight = () => {
      for (let offset = 0; offset < size; offset += 1) {
        add(
          exportedGroups.bottomRight,
          { row: size * 2, col: size * 2 + 1 + offset, dir: DIRS.S },
          { row: size * 2 + 1 + offset, col: size * 2, dir: DIRS.E }
        );
      }
    };
    const addBottomFar = () => {
      for (let offset = 0; offset < size; offset += 1) {
        if (size === 2) {
          add(
            exportedGroups.bottomFar,
            { row: size * 2, col: cols - offset, dir: DIRS.S },
            { row: rows, col: size + 1 + offset, dir: DIRS.S }
          );
        } else {
          add(
            exportedGroups.bottomFar,
            { row: rows, col: size + 1 + offset, dir: DIRS.S },
            { row: size * 2, col: cols - offset, dir: DIRS.S }
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
      lattice: 'square',
      rows,
      cols,
      surface: 'M_0,8',
      removedTiles,
      cutEdges: [],
      gluedEdges
    };
  }

  const PRESETS = [
    {
      id: 'classic-4x4',
      label: '4*4 classic',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'square grid',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    {
      id: 'twisted-torus',
      label: 'twisted torus',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'M_2,1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 0, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 2, dir: DIRS.S } },
        { group: 0, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 0, first: { row: 1, col: 3, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } },
        { group: 1, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 1, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 1, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 2, first: { row: 1, col: 4, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.S } },
        { group: 3, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 1, col: 1, dir: DIRS.W } }
      ]
    },
    {
      id: 'gomoku-random-glue',
      label: 'random glue n*n',
      lattice: 'square',
      rows: GOMOKU_DEFAULT_BOARD_SIZE,
      cols: GOMOKU_DEFAULT_BOARD_SIZE,
      surface: 'random boundary glue',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      randomGlue: true,
      dynamicGomokuSize: true
    },
    {
      id: 'connect-four-6x7',
      label: 'Connect Four 6*7',
      lattice: 'square',
      rows: 6,
      cols: 7,
      surface: 'six-row seven-column grid',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    {
      id: 'genus-2',
      label: 'genus 2',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'M_2',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 0, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 1, col: 3, dir: DIRS.N } },
        { group: 0, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 1, col: 4, dir: DIRS.N } },
        { group: 2, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 2, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 4, col: 1, dir: DIRS.S }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 4, col: 2, dir: DIRS.S }, second: { row: 1, col: 1, dir: DIRS.W } },
        { group: 4, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 4, col: 4, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 4, col: 3, dir: DIRS.S } }
      ]
    },
    {
      id: 'random-glue-4x4',
      label: 'random glue 4*4',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'random boundary glue',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      randomGlue: true
    },
    {
      id: 'half-glued',
      label: 'half-glued',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'half-glued',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 0, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 0, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } },
        { group: 1, first: { row: 4, col: 1, dir: DIRS.W }, second: { row: 1, col: 4, dir: DIRS.E } },
        { group: 1, first: { row: 3, col: 1, dir: DIRS.W }, second: { row: 2, col: 4, dir: DIRS.E } }
      ]
    },
    {
      id: 'torus',
      label: 'torus',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'M_1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 3, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 1, col: 1, dir: DIRS.W } },
        { group: 4, first: { row: 1, col: 3, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 2, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 4, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } }
      ]
    },
    {
      id: 'klein-bottle',
      label: 'Klein bottle',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'N_2',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, reversed: true, first: { row: 1, col: 4, dir: DIRS.E }, second: { row: 4, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 2, col: 4, dir: DIRS.E }, second: { row: 3, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 3, col: 4, dir: DIRS.E }, second: { row: 2, col: 1, dir: DIRS.W } },
        { group: 3, reversed: true, first: { row: 4, col: 4, dir: DIRS.E }, second: { row: 1, col: 1, dir: DIRS.W } },
        { group: 4, first: { row: 1, col: 3, dir: DIRS.N }, second: { row: 4, col: 3, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 2, dir: DIRS.N }, second: { row: 4, col: 2, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 1, dir: DIRS.N }, second: { row: 4, col: 1, dir: DIRS.S } },
        { group: 4, first: { row: 1, col: 4, dir: DIRS.N }, second: { row: 4, col: 4, dir: DIRS.S } }
      ]
    },
    {
      id: 'ramified-cover',
      label: 'ramified cover',
      lattice: 'square',
      rows: 4,
      cols: 9,
      surface: 'ramified cover',
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
        { group: 0, first: { row: 2, col: 8, dir: DIRS.S }, second: { row: 3, col: 3, dir: DIRS.N } },
        { group: 0, first: { row: 2, col: 9, dir: DIRS.S }, second: { row: 3, col: 4, dir: DIRS.N } },
        { group: 1, first: { row: 2, col: 3, dir: DIRS.S }, second: { row: 3, col: 8, dir: DIRS.N } },
        { group: 1, first: { row: 2, col: 4, dir: DIRS.S }, second: { row: 3, col: 9, dir: DIRS.N } }
      ]
    },
    createRubiksCubePreset(2, 'rubiks-cube-2x2x2', "Rubik's Cube 2*2*2"),
    createRubiksCubePreset(3, 'rubiks-cube-3x3x3', "Rubik's Cube 3*3*3"),
    {
      id: 'usual-strip',
      label: 'usual strip',
      lattice: 'hexagonal',
      rows: 4,
      cols: 5,
      surface: 'Sigma_0,2',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        gluePair(0, { row: 1, col: 1, dir: HEX_DIRS.W }, { row: 1, col: 5, dir: HEX_DIRS.E }),
        gluePair(0, { row: 1, col: 1, dir: HEX_DIRS.SW }, { row: 2, col: 5, dir: HEX_DIRS.NE }),
        gluePair(0, { row: 2, col: 1, dir: HEX_DIRS.W }, { row: 2, col: 5, dir: HEX_DIRS.E }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.NW }, { row: 2, col: 5, dir: HEX_DIRS.SE }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.W }, { row: 3, col: 5, dir: HEX_DIRS.E }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.SW }, { row: 4, col: 5, dir: HEX_DIRS.NE }),
        gluePair(0, { row: 4, col: 1, dir: HEX_DIRS.W }, { row: 4, col: 5, dir: HEX_DIRS.E })
      ]
    },
    {
      id: 'mobius-strip',
      label: 'M\u00f6bius strip',
      lattice: 'hexagonal',
      rows: 4,
      cols: 5,
      surface: 'N_0,2^6',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        gluePair(0, { row: 1, col: 1, dir: HEX_DIRS.W }, { row: 4, col: 5, dir: HEX_DIRS.E }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 1, col: 1, dir: HEX_DIRS.SW }, { row: 4, col: 5, dir: HEX_DIRS.NE }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 2, col: 1, dir: HEX_DIRS.W }, { row: 3, col: 5, dir: HEX_DIRS.E }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.NW }, { row: 2, col: 5, dir: HEX_DIRS.SE }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.W }, { row: 2, col: 5, dir: HEX_DIRS.E }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 3, col: 1, dir: HEX_DIRS.SW }, { row: 2, col: 5, dir: HEX_DIRS.NE }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false }),
        gluePair(0, { row: 4, col: 1, dir: HEX_DIRS.W }, { row: 1, col: 5, dir: HEX_DIRS.E }, { reversed: true, firstArrowReversed: false, secondArrowReversed: false })
      ]
    },
    {
      id: 'hex-classic-4x4',
      label: 'hex classic 4*4',
      lattice: 'hexagonal',
      rows: 4,
      cols: 4,
      surface: 'hexagonal grid',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    }
  ];

  const IMPORTED_PRESET_ID = 'imported-preset';
  const IMPORT_PRESET_CHOICE_ID = 'import-preset';
  const MIN_IMPORTED_BOARD = 1;
  const MAX_IMPORTED_BOARD = 25;

  const refs = {};
  let game = null;
  let geometry = null;
  let currentAnimation = null;
  let eventQueue = [];
  let eventIndex = 0;
  let stepPaused = false;
  let animationFrameId = null;
  let debugMode = false;
  let undoStack = [];
  let importedPreset = null;
  let noMoveDirs = new Set();
  let eventQueueChangedBoard = false;
  let pendingBonusGameOver = false;
  let hoveredGlue = null;

  function init() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.gameMode = document.getElementById('game-mode-select');
    refs.select = document.getElementById('surface-preset-select');
    refs.importToggle = document.getElementById('import-preset-toggle');
    refs.importTools = document.getElementById('import-preset-tools');
    refs.importInput = document.getElementById('import-preset-input');
    refs.applyImportPreset = document.getElementById('apply-import-preset');
    refs.gomokuDisplay = document.getElementById('gomoku-display-style');
    refs.gomokuSize = document.getElementById('gomoku-board-size');
    refs.connectFourFall = document.getElementById('connect-four-fall-dir');
    refs.boxStyle = document.getElementById('number-box-style');
    refs.highlightNewBoxes = document.getElementById('highlight-new-boxes');
    refs.begin = document.getElementById('begin-game');
    refs.setupAlert = document.getElementById('game-setup-alert');
    refs.speed = document.getElementById('animation-speed');
    refs.speedValue = document.getElementById('animation-speed-value');
    refs.stepMode = document.getElementById('step-mode');
    refs.nextStep = document.getElementById('next-step');
    refs.debugToggle = document.getElementById('debug-toggle');
    refs.debugTools = document.getElementById('debug-tools');
    refs.debugTileValue = document.getElementById('debug-tile-value');
    refs.undo = document.getElementById('undo-step');
    refs.exportState = document.getElementById('export-state');
    refs.importState = document.getElementById('import-state');
    refs.debugExport = document.getElementById('debug-export-output');
    refs.moveButtons = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-move-dir]')) : [];
    refs.moveGroups = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-move-lattice]')) : [];
    refs.mode2048Controls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="2048"]')) : [];
    refs.modeGomokuControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="gomoku"]')) : [];
    refs.modeConnectFourControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="connect-four"]')) : [];
    refs.statusBadge = document.getElementById('status-badge');
    refs.statusLine = document.getElementById('status-line');
    refs.infoLine = document.getElementById('info-line');
    refs.scoreLabel = document.getElementById('score-label');
    refs.highestLabel = document.getElementById('highest-tile-label');
    refs.existingLabel = document.getElementById('existing-tile-label');
    refs.removedLabel = document.getElementById('removed-tile-label');
    refs.roundLabel = document.getElementById('round-label');
    refs.score = document.getElementById('score-value');
    refs.highest = document.getElementById('highest-tile-value');
    refs.existing = document.getElementById('existing-tile-value');
    refs.removed = document.getElementById('removed-tile-value');
    refs.round = document.getElementById('round-value');
    if (!refs.canvas || !refs.ctx || !refs.select) return;

    if (refs.gameMode) refs.gameMode.addEventListener('change', handleGameModeChange);
    refs.select.addEventListener('change', handlePresetSelectChange);
    if (refs.importToggle) refs.importToggle.addEventListener('click', toggleImportTools);
    if (refs.applyImportPreset) refs.applyImportPreset.addEventListener('click', importPresetFromUi);
    if (refs.gomokuDisplay) refs.gomokuDisplay.addEventListener('change', render);
    if (refs.gomokuSize) refs.gomokuSize.addEventListener('change', handleGomokuSizeChange);
    if (refs.gomokuSize) refs.gomokuSize.addEventListener('input', handleGomokuSizeChange);
    if (refs.connectFourFall) refs.connectFourFall.addEventListener('change', handleConnectFourFallChange);
    if (refs.boxStyle) refs.boxStyle.addEventListener('change', render);
    if (refs.highlightNewBoxes) refs.highlightNewBoxes.addEventListener('change', render);
    if (refs.begin) refs.begin.addEventListener('click', beginGameFromUi);
    if (refs.speed) refs.speed.addEventListener('input', syncSpeedOutput);
    if (refs.stepMode) refs.stepMode.addEventListener('change', syncControls);
    if (refs.nextStep) refs.nextStep.addEventListener('click', playNextStep);
    if (refs.debugToggle) refs.debugToggle.addEventListener('click', toggleDebugMode);
    if (refs.undo) refs.undo.addEventListener('click', undoPreviousStep);
    if (refs.exportState) refs.exportState.addEventListener('click', exportDebugState);
    if (refs.importState) refs.importState.addEventListener('click', importDebugState);
    if (refs.canvas) {
      refs.canvas.addEventListener('click', handleCanvasClick);
      refs.canvas.addEventListener('mousemove', handleCanvasHover);
      refs.canvas.addEventListener('mouseleave', clearGlueHover);
      refs.canvas.addEventListener('blur', clearGlueHover);
    }
    refs.moveButtons.forEach((button) => {
      button.addEventListener('click', () => handleDirectionalButton(button));
    });
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', render);

    syncSpeedOutput();
    syncDebugModeUi();
    resetToPreview();
  }

  function resetToPreview() {
    stopPlayback();
    game = createSelectedGameState(selectedPreset(), { glueRng: Math.random });
    game.phase = 'setup';
    clearUndoHistory();
    clearDebugExport();
    clearSetupAlert();
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    clearNoMoveTrial();
    eventQueueChangedBoard = false;
    render();
    syncStatusForCurrentGame();
    syncControls();
  }

  function beginGameFromUi() {
    if (game && game.phase !== 'setup') {
      stopGameFromUi();
      return;
    }
    if (refs.select && refs.select.value === IMPORT_PRESET_CHOICE_ID && !importedPreset) {
      setImportToolsVisible(true);
      clearSetupAlert();
      syncStatus('import preset', 'paste a background preset JSON and generate', 'setup');
      syncControls();
      return;
    }
    const connectFourHoles = isConnectFourGame(game) ? new Set(game.holes || []) : new Set();
    if (selectedGameMode() === GAME_MODES.CONNECT_FOUR && !connectFourHoles.size) {
      showSetupAlert('click tiles to add input holes before beginning');
      syncStatus('add holes', 'click tiles to add input holes before beginning', 'warn');
      render();
      syncControls();
      if (refs.canvas) refs.canvas.focus();
      return;
    }
    stopPlayback();
    game = beginSelectedGame(selectedPreset(), {
      rng: Math.random,
      glueRng: Math.random,
      holes: connectFourHoles
    });
    clearUndoHistory();
    clearDebugExport();
    clearSetupAlert();
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    clearNoMoveTrial();
    eventQueueChangedBoard = false;
    game.phase = 'ready';
    render();
    if (isGomokuGame(game)) {
      syncStatus(`${game.preset.label} Gomoku`, gomokuTurnInfo(game), 'ready');
    } else if (isConnectFourGame(game)) {
      syncStatus(`${game.preset.label} Connect Four`, connectFourTurnInfo(game), 'ready');
    } else {
      syncStatus(`${game.preset.label} game seed`, 'use arrow keys to slide', 'ready');
    }
    syncControls();
    if (refs.canvas) refs.canvas.focus();
  }

  function stopGameFromUi() {
    const previous = game;
    stopPlayback();
    if (isConnectFourGame(previous)) {
      const holes = new Set(previous.holes || []);
      const cycleHoles = new Set(previous.cycleHoles || []);
      game = createConnectFourState(previous.preset, {
        fallDir: previous.fallDir,
        holes,
        cycleHoles
      });
      game.phase = 'setup';
      syncConnectFourFallInputFromGame();
      clearUndoHistory();
      clearDebugExport();
      clearSetupAlert();
      clearNoMoveTrial();
      eventQueueChangedBoard = false;
      render();
      syncStatusForCurrentGame();
      syncControls();
      if (refs.canvas) refs.canvas.focus();
      return;
    }
    resetToPreview();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGameModeChange() {
    syncDefaultPresetForGameMode();
    resetToPreview();
  }

  function syncDefaultPresetForGameMode() {
    if (!refs.select) return;
    const mode = selectedGameMode();
    if (mode === GAME_MODES.GOMOKU) refs.select.value = 'gomoku-random-glue';
    else if (mode === GAME_MODES.CONNECT_FOUR) refs.select.value = 'connect-four-6x7';
    else refs.select.value = 'classic-4x4';
  }

  function handleGomokuSizeChange() {
    if (refs.gomokuSize) refs.gomokuSize.value = String(selectedGomokuBoardSize());
    if (selectedGameMode() === GAME_MODES.GOMOKU && refs.select && refs.select.value === 'gomoku-random-glue') {
      resetToPreview();
    }
  }

  function handleConnectFourFallChange() {
    if (selectedGameMode() === GAME_MODES.CONNECT_FOUR && isConnectFourGame(game) && game.phase === 'setup') {
      game.fallDir = selectedConnectFourFallDir(game.preset);
      clearConnectFourCycleHoles();
      clearSetupAlert();
      syncStatusForCurrentGame();
      render();
      syncControls();
      return;
    }
    if (selectedGameMode() === GAME_MODES.CONNECT_FOUR) resetToPreview();
    else render();
  }

  function handlePresetSelectChange() {
    if (refs.select && refs.select.value === IMPORT_PRESET_CHOICE_ID) {
      stopPlayback();
      setImportToolsVisible(true);
      clearDebugExport();
      clearSetupAlert();
      syncStatus('import preset', 'paste a background preset JSON and generate', 'setup');
      syncControls();
      return;
    }
    setImportToolsVisible(false);
    resetToPreview();
  }

  function setImportToolsVisible(force) {
    if (!refs.importTools) return;
    const shouldShow = force === undefined ? refs.importTools.hidden : !!force;
    refs.importTools.hidden = !shouldShow;
    if (refs.importToggle) refs.importToggle.setAttribute('aria-expanded', refs.importTools.hidden ? 'false' : 'true');
    if (!refs.importTools.hidden && refs.importInput) refs.importInput.focus();
  }

  function toggleImportTools() {
    setImportToolsVisible();
  }

  function importPresetFromUi() {
    if (!refs.importInput) return;
    try {
      importedPreset = presetFromImportText(refs.importInput.value);
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = importedPreset.id;
      resetToPreview();
      syncStatus('preset imported', previewInfo(game.preset), 'setup');
      setImportToolsVisible(false);
    } catch (error) {
      syncStatus('import failed', error && error.message ? error.message : 'invalid preset JSON', 'error');
    }
  }

  function ensureImportedPresetOption(preset) {
    if (!refs.select || !preset) return;
    const options = refs.select.options ? Array.from(refs.select.options) : [];
    let option = options.find((item) => item.value === IMPORTED_PRESET_ID);
    if (!option && typeof document !== 'undefined' && document.createElement && refs.select.appendChild) {
      option = document.createElement('option');
      option.value = IMPORTED_PRESET_ID;
      refs.select.appendChild(option);
    }
    if (option) option.textContent = preset.label || 'imported preset';
  }

  function handleKeydown(event) {
    if (!is2048Game(game)) return;
    const dir = game ? dirFromKey(event.code || event.key, game.preset) : null;
    if (!Number.isInteger(dir)) return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (!canAcceptMove()) return;
    event.preventDefault();
    playRound(dir);
  }

  function handleDirectionalButton(button) {
    if (!is2048Game(game)) return;
    const dir = game ? dirFromName(button.getAttribute('data-move-dir'), game.preset) : null;
    if (!Number.isInteger(dir) || !canAcceptMove()) return;
    playRound(dir);
    if (refs.canvas) refs.canvas.focus();
  }

  function canAcceptMove() {
    return !!game
      && is2048Game(game)
      && game.phase !== 'setup'
      && game.phase !== 'animating'
      && game.phase !== 'gameover'
      && !stepPaused
      && !eventQueue.length;
  }

  function clearNoMoveTrial() {
    noMoveDirs = new Set();
    pendingBonusGameOver = false;
  }

  function recordNoMoveDirection(dir) {
    noMoveDirs.add(dir);
    return noMoveDirs.size >= directionsForPreset(game.preset).length;
  }

  function noMoveTrialText(state) {
    const total = directionsForPreset(state.preset).length;
    return `${noMoveDirs.size}/${total} directions unchanged`;
  }

  function finishGameAs(ending) {
    game.phase = 'gameover';
    game.ending = ending || 'standard';
    if (game.ending === 'bonus') {
      syncStatus('bonus ending', `all ${directionsForPreset(game.preset).length} directions unchanged`, 'over');
    } else {
      syncStatus('game over', 'no empty tile and no changing move', 'over');
    }
  }

  function playRound(dir) {
    const result = simulateRound(game, dir, { rng: Math.random, spawn: true });
    if (!result.changed) {
      const triedAllDirections = recordNoMoveDirection(dir);
      if (result.events && result.events.length) {
        eventQueue = result.events;
        eventIndex = 0;
        eventQueueChangedBoard = false;
        pendingBonusGameOver = triedAllDirections;
        const step = isStepMode();
        stepPaused = step;
        game.phase = step ? 'paused' : 'animating';
        syncStatus(`collision: ${dirLabel(dir, game.preset)}`, noMoveTrialText(game), step ? 'step' : 'moving');
        syncControls();
        if (step) render();
        else playNextEvent();
        return;
      }
      if (result.debugMessages && result.debugMessages.length) {
        game.debugMessage = result.debugMessages[0];
        syncStatus('push-chain debug', result.debugMessages[0], 'debug');
        render();
        return;
      }
      if (triedAllDirections) {
        finishGameAs('bonus');
        syncControls();
        render();
        return;
      }
      syncStatus('no move', noMoveTrialText(game), game.phase === 'gameover' ? 'over' : 'ready');
      render();
      return;
    }
    clearNoMoveTrial();
    game.ending = '';
    game.newBoxIds = new Set();
    pushUndoSnapshot(`round ${game.round + 1}: ${dirLabel(dir, game.preset)}`);
    game.round += 1;
    eventQueue = result.events;
    eventIndex = 0;
    eventQueueChangedBoard = true;
    const step = isStepMode();
    stepPaused = step;
    game.phase = step ? 'paused' : 'animating';
    syncStatus(`round ${game.round}: ${dirLabel(dir, game.preset)}`, `${eventQueue.length} event${eventQueue.length === 1 ? '' : 's'}`, step ? 'step' : 'moving');
    syncControls();
    if (step) {
      render();
      return;
    }
    playNextEvent();
  }

  function playNextStep() {
    if (!eventQueue.length || currentAnimation) return;
    pushUndoSnapshot(`event ${Math.min(eventIndex + 1, eventQueue.length)}/${eventQueue.length}`);
    stepPaused = false;
    playNextEvent();
  }

  function playNextEvent() {
    if (!eventQueue.length || eventIndex >= eventQueue.length) {
      finishEventQueue();
      return;
    }
    const event = eventQueue[eventIndex];
    eventIndex += 1;
    if (event.kind === 'debug') {
      if (game) game.debugMessage = event.message;
      syncStatus('push-chain debug', event.message, 'debug');
      if (isStepMode()) {
        stepPaused = eventIndex < eventQueue.length;
        if (stepPaused) {
          syncControls();
          render();
          return;
        }
      }
      playNextEvent();
      return;
    }
    currentAnimation = {
      event,
      startedAt: now(),
      duration: eventDuration(event)
    };
    if (event.kind === 'spawn') applyEvent(game, event);
    tickAnimation();
  }

  function startConnectFourDropAnimation(result) {
    if (!result || !result.changed || !result.drop || !result.token) return;
    currentAnimation = {
      event: {
        kind: 'connectFourDrop',
        tokenId: result.token.id,
        color: result.token.color,
        from: result.drop.path && result.drop.path.length ? result.drop.path[0] : result.token.index,
        to: result.token.index,
        path: (result.drop.path || [result.token.index]).slice(),
        transitions: (result.drop.transitions || []).map(clonePlacementTransition),
        stopDir: result.drop.dir,
        blockedBy: result.drop.blockedBy
      },
      startedAt: now(),
      duration: eventDuration({
        kind: 'connectFourDrop',
        path: result.drop.path || [],
        transitions: result.drop.transitions || []
      })
    };
    tickAnimation();
  }

  function tickAnimation() {
    if (!currentAnimation) return;
    const elapsed = now() - currentAnimation.startedAt;
    const progress = currentAnimation.duration <= 0 ? 1 : Math.min(1, elapsed / currentAnimation.duration);
    currentAnimation.progress = progress;
    render();
    if (progress < 1) {
      animationFrameId = requestFrame(tickAnimation);
      return;
    }
    const event = currentAnimation.event;
    if (event.kind === 'connectFourDrop') {
      currentAnimation = null;
      render();
      syncControls();
      refreshDebugExportIfNeeded();
      return;
    }
    if (event.kind !== 'spawn') applyEvent(game, event);
    currentAnimation = null;
    if (isStepMode()) {
      stepPaused = eventIndex < eventQueue.length;
      if (stepPaused) {
        game.phase = 'paused';
        syncStatus(`round ${game.round}: paused`, `${eventIndex}/${eventQueue.length} events`, 'step');
        syncControls();
        render();
        return;
      }
    }
    render();
    playNextEvent();
  }

  function finishEventQueue() {
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    currentAnimation = null;
    const changedBoard = eventQueueChangedBoard;
    eventQueueChangedBoard = false;
    if (pendingBonusGameOver) {
      pendingBonusGameOver = false;
      finishGameAs('bonus');
    } else if (changedBoard && isGameOver(game)) {
      finishGameAs('standard');
    } else {
      game.phase = 'ready';
      game.ending = '';
      syncReadyStatus(`round ${game.round} complete`);
    }
    syncControls();
    render();
  }

  function stopPlayback() {
    if (animationFrameId != null) cancelFrame(animationFrameId);
    animationFrameId = null;
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    eventQueueChangedBoard = false;
    pendingBonusGameOver = false;
  }

  function toggleDebugMode() {
    debugMode = !debugMode;
    syncDebugModeUi();
    syncControls();
    if (debugMode) {
      syncStatus('debug mode', debugModeInfo(), 'debug');
      if (refs.canvas) refs.canvas.focus();
    } else {
      syncStatusForCurrentGame();
    }
  }

  function debugModeInfo() {
    if (isGomokuGame(game)) return 'export or import Gomoku status';
    if (isConnectFourGame(game)) return 'export or import Connect Four status';
    return 'click a tile to assign the tile value';
  }

  function syncDebugModeUi() {
    if (refs.debugToggle) {
      refs.debugToggle.classList.toggle('debug-active', debugMode);
      refs.debugToggle.setAttribute('aria-pressed', debugMode ? 'true' : 'false');
    }
    if (refs.debugTools) refs.debugTools.hidden = !debugMode;
    if (refs.debugTileValue) refs.debugTileValue.disabled = !debugMode || !is2048Game(game);
  }

  function handleCanvasClick(event) {
    if (isGomokuGame(game)) {
      handleGomokuCanvasClick(event);
      return;
    }
    if (isConnectFourGame(game)) {
      handleConnectFourCanvasClick(event);
      return;
    }
    if (!debugMode || !game) return;
    if (currentAnimation) {
      syncStatus('debug waits', 'finish the active animation or undo first', 'debug');
      return;
    }
    const target = tileFromCanvasEvent(event);
    if (!target) return;
    if (game.removed.has(target.index)) {
      syncStatus('debug tile blocked', `${target.label} is removed`, 'debug');
      return;
    }
    const value = normalizedDebugTileValue();
    if (value === false) {
      syncStatus('debug value rejected', 'choose a power of two from 2 upward', 'debug');
      return;
    }
    stopPlayback();
    game.phase = 'ready';
    game.ending = '';
    clearNoMoveTrial();
    const existingBoxes = boxesAtIndex(game, target.index);
    const existing = existingBoxes[0] || null;
    if (value == null) {
      if (!existing) {
        syncStatus(`debug: ${target.label} already empty`, `${game.boxes.length} active box${game.boxes.length === 1 ? '' : 'es'}`, 'debug');
        return;
      }
      pushUndoSnapshot(`debug empty ${target.label}`);
      removeBoxesAtIndex(game, target.index);
      game.debugMessage = `debug: ${target.label} = empty`;
      syncStatus(`debug: ${target.label} = empty`, `${game.boxes.length} active box${game.boxes.length === 1 ? '' : 'es'}`, 'debug');
    } else if (existing) {
      pushUndoSnapshot(`debug set ${target.label}`);
      removeBoxesAtIndex(game, target.index);
      game.boxes.push({ id: existing.id, index: target.index, value });
    } else {
      pushUndoSnapshot(`debug set ${target.label}`);
      const box = { id: game.nextBoxId, index: target.index, value };
      game.nextBoxId += 1;
      game.boxes.push(box);
    }
    if (value != null) {
      game.debugMessage = `debug: ${target.label} = ${value}`;
      syncStatus(`debug: ${target.label} = ${value}`, `${game.boxes.length} active box${game.boxes.length === 1 ? '' : 'es'}`, 'debug');
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function handleCanvasHover(event) {
    if (!geometry || !geometry.cells || !geometry.cells.length) return;
    const preset = game ? game.preset : selectedPreset();
    setGlueHover(hoveredGlueBoundaryAtPoint(preset, geometry, canvasPointFromEvent(event)));
  }

  function setGlueHover(nextHover) {
    const normalized = nextHover ? {
      group: nextHover.group,
      groupKey: nextHover.groupKey,
      edgeKey: nextHover.edgeKey,
      pairIndex: nextHover.pairIndex,
      half: nextHover.half,
      presetKey: nextHover.presetKey || glueHoverPresetKey(game ? game.preset : selectedPreset())
    } : null;
    if (sameGlueHover(hoveredGlue, normalized)) return;
    hoveredGlue = normalized;
    syncGlueHoverCursor();
    render();
  }

  function clearGlueHover() {
    if (!hoveredGlue) return;
    hoveredGlue = null;
    syncGlueHoverCursor();
    render();
  }

  function sameGlueHover(left, right) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    return left.groupKey === right.groupKey && left.edgeKey === right.edgeKey && left.presetKey === right.presetKey;
  }

  function syncGlueHoverCursor() {
    if (refs.canvas && refs.canvas.style) refs.canvas.style.cursor = hoveredGlue ? 'help' : '';
  }

  function handleGomokuCanvasClick(event) {
    if (!game || currentAnimation || game.phase === 'setup') return;
    if (game.phase === 'gameover') {
      if (!game.resultDismissed) {
        game.resultDismissed = true;
        render();
        refreshDebugExportIfNeeded();
      }
      return;
    }
    const target = tileFromCanvasEvent(event);
    if (!target) return;
    const result = placeGomokuStone(game, target.index);
    if (!result.changed) {
      syncStatus('Gomoku move rejected', result.message || `${target.label} is unavailable`, phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Gomoku ${result.stone.color} at ${target.label}`);
    game = result.state;
    if (game.phase === 'gameover') {
      if (game.winner) syncStatus(`${gomokuColorLabel(game.winner)} wins`, `${game.round} move${game.round === 1 ? '' : 's'}`, 'over');
      else syncStatus('Gomoku draw', `${game.round} moves`, 'over');
    } else {
      syncStatus(`Gomoku move ${game.round}`, gomokuTurnInfo(game), 'ready');
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function handleConnectFourCanvasClick(event) {
    if (!game || currentAnimation) return;
    if (game.phase === 'setup') {
      const target = tileFromCanvasEvent(event);
      if (!target) return;
      toggleConnectFourHole(target);
      return;
    }
    if (game.phase === 'gameover') {
      if (!game.resultDismissed) {
        game.resultDismissed = true;
        render();
        refreshDebugExportIfNeeded();
      }
      return;
    }
    const target = tileFromCanvasEvent(event);
    if (!target) return;
    if (!connectFourHasHole(game, target.index)) {
      syncStatus('Connect Four input blocked', 'click a white input hole', 'ready');
      return;
    }
    const result = placeConnectFourToken(game, target.index);
    if (!result.changed) {
      showSetupAlert(`Connect Four drop rejected: ${result.message || `${target.label} is unavailable`}`);
      if (result.cycle) setConnectFourCycleHoles(result.cycleHoles && result.cycleHoles.length ? result.cycleHoles : [target.index]);
      else clearConnectFourCycleHoles();
      syncStatus('Connect Four drop rejected', result.message || `${target.label} is unavailable`, result.cycle ? 'warn' : phaseBadge(game.phase));
      render();
      syncControls();
      refreshDebugExportIfNeeded();
      return;
    }
    clearSetupAlert();
    pushUndoSnapshot(`Connect Four ${result.token.color} from ${target.label}`);
    game = result.state;
    startConnectFourDropAnimation(result);
    if (game.phase === 'gameover') {
      if (game.winner) syncStatus(`${connectFourColorLabel(game.winner)} wins`, `${game.round} drop${game.round === 1 ? '' : 's'}`, 'over');
      else syncStatus('Connect Four draw', `${game.round} drops`, 'over');
    } else {
      const routeInfo = result.drop && result.drop.path && result.drop.path.length > 1
        ? `${connectFourTurnInfo(game)}; fell ${result.drop.path.length - 1} step${result.drop.path.length === 2 ? '' : 's'}`
        : connectFourTurnInfo(game);
      syncStatus(`Connect Four drop ${game.round}`, routeInfo, 'ready');
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function toggleConnectFourHole(target) {
    if (!isConnectFourGame(game) || !target) return;
    if (game.removed.has(target.index)) {
      syncStatus('hole rejected', `${target.label} is removed`, 'warn');
      return;
    }
    pushUndoSnapshot(`toggle hole ${target.label}`);
    if (!game.holes) game.holes = new Set();
    if (!game.cycleHoles) game.cycleHoles = new Set();
    game.cycleHoles.delete(target.index);
    clearSetupAlert();
    if (game.holes.has(target.index)) {
      game.holes.delete(target.index);
      syncStatus('hole removed', `${target.label}; ${game.holes.size} input hole${game.holes.size === 1 ? '' : 's'}`, 'setup');
    } else {
      game.holes.add(target.index);
      syncStatus('hole added', `${target.label}; ${game.holes.size} input hole${game.holes.size === 1 ? '' : 's'}`, 'setup');
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function tileFromCanvasEvent(event) {
    const point = canvasPointFromEvent(event);
    if (!point) return null;
    const radius = geometry.radius * 0.96;
    for (let index = 0; index < geometry.cells.length; index += 1) {
      const cell = geometry.cells[index];
      if (!cell) continue;
      if (pointInPolygon(point, tilePoints(cell.x, cell.y, radius, geometry.lattice))) {
        return {
          index,
          row: cell.row,
          col: cell.col,
          label: `r${cell.row} c${cell.col}`
        };
      }
    }
    return null;
  }

  function canvasPointFromEvent(event) {
    if (!refs.canvas || !geometry || !geometry.cells || !geometry.cells.length) return null;
    const rect = refs.canvas.getBoundingClientRect ? refs.canvas.getBoundingClientRect() : null;
    const width = rect && rect.width ? rect.width : geometry.width;
    const height = rect && rect.height ? rect.height : geometry.height;
    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;
    return {
      x: ((event.clientX || 0) - left) * (geometry.width / Math.max(1, width)),
      y: ((event.clientY || 0) - top) * (geometry.height / Math.max(1, height))
    };
  }

  function normalizedDebugTileValue() {
    const rawValue = refs.debugTileValue ? refs.debugTileValue.value : '2';
    if (rawValue === '') return null;
    const raw = Number(rawValue);
    if (!Number.isSafeInteger(raw) || raw < 2 || !isPowerOfTwo(raw)) return false;
    return raw;
  }

  function isPowerOfTwo(value) {
    return Number.isSafeInteger(value) && value > 0 && Math.log2(value) % 1 === 0;
  }

  function pushUndoSnapshot(label) {
    if (!game) return;
    undoStack.push({
      label: label || 'step',
      game: cloneGameState(game),
      eventQueue: clonePlain(eventQueue),
      eventIndex,
      stepPaused,
      status: statusSnapshot()
    });
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    syncControls();
  }

  function undoPreviousStep() {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      syncControls();
      return;
    }
    stopPlayback();
    game = cloneGameState(snapshot.game);
    eventQueue = clonePlain(snapshot.eventQueue || []);
    eventIndex = Math.max(0, Math.min(Number(snapshot.eventIndex) || 0, eventQueue.length));
    stepPaused = !!snapshot.stepPaused && eventQueue.length > 0 && eventIndex < eventQueue.length;
    currentAnimation = null;
    clearNoMoveTrial();
    eventQueueChangedBoard = !!eventQueue.length;
    if (refs.select && game.preset && game.preset.id) refs.select.value = game.preset.id;
    if (refs.gameMode) refs.gameMode.value = gameModeValue(game);
    syncConnectFourFallInputFromGame();
    syncStatus('undo complete', `restored before ${snapshot.label || 'previous step'}`, phaseBadge(game.phase));
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function clearUndoHistory() {
    undoStack = [];
    syncControls();
  }

  function statusSnapshot() {
    return {
      badge: refs.statusBadge ? refs.statusBadge.textContent : '',
      status: refs.statusLine ? refs.statusLine.textContent : '',
      info: refs.infoLine ? refs.infoLine.textContent : ''
    };
  }

  function clonePlain(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function exportDebugState() {
    if (!game || !refs.debugExport) return;
    refs.debugExport.value = JSON.stringify(debugExportPayload(), null, 2);
    const info = debugExportInfo(game);
    syncStatus('status exported', info, debugMode ? 'debug' : phaseBadge(game.phase));
    refs.debugExport.focus();
    refs.debugExport.select();
  }

  function importDebugState() {
    if (!debugMode || !refs.debugExport) {
      syncStatus('status import unavailable', 'turn on debug mode first', 'debug');
      return;
    }
    try {
      const imported = gameStateFromDebugImportText(refs.debugExport.value);
      if (game) pushUndoSnapshot('status import');
      stopPlayback();
      importedPreset = imported.state.preset;
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = importedPreset.id;
      game = imported.state;
      eventQueue = imported.eventQueue;
      eventIndex = imported.eventIndex;
      stepPaused = imported.stepPaused;
      currentAnimation = null;
      clearNoMoveTrial();
      eventQueueChangedBoard = false;
      game.phase = stepPaused ? 'paused' : (eventQueue.length ? 'ready' : imported.phase);
      if (game.phase !== 'gameover') game.ending = '';
      if (refs.gameMode) refs.gameMode.value = gameModeValue(game);
      syncConnectFourFallInputFromGame();
      render();
      const info = debugExportInfo(game);
      syncStatus('status imported', info, 'debug');
      syncControls();
      refreshDebugExportIfNeeded();
      if (refs.canvas) refs.canvas.focus();
    } catch (error) {
      syncStatus('status import failed', error && error.message ? error.message : 'invalid status JSON', 'error');
    }
  }

  function refreshDebugExportIfNeeded() {
    if (!refs.debugExport || !refs.debugExport.value) return;
    refs.debugExport.value = JSON.stringify(debugExportPayload(), null, 2);
  }

  function clearDebugExport() {
    if (refs.debugExport) refs.debugExport.value = '';
  }

  function debugExportPayload() {
    const preset = game.preset;
    const base = {
      exportedAt: new Date().toISOString(),
      gameMode: game.gameMode || GAME_MODES.NUMBER_2048,
      preset: {
        id: preset.id,
        label: preset.label,
        lattice: preset.lattice || 'square',
        rows: preset.rows,
        cols: preset.cols,
        surface: preset.surface,
        removedTiles: (preset.removedTiles || []).map((tile) => ({ ...tile })),
        cutEdges: (preset.cutEdges || []).map((edge) => ({
          left: { ...edge.left },
          right: { ...edge.right }
        })),
        gluedEdges: (preset.gluedEdges || []).map(cloneGluePair)
      },
      phase: game.phase,
      ending: game.ending || '',
      debugMode,
      status: statusSnapshot(),
      warnings: gameWarnings(game),
      round: game.round || 0,
      removed: Array.from(game.removed)
        .sort((a, b) => a - b)
        .map((index) => ({ index, ...rowCol(index, preset.cols) }))
    };
    if (isGomokuGame(game)) {
      return {
        ...base,
        turn: game.turn || 'black',
        winner: game.winner || '',
        winningLine: (game.winningLine || []).slice(),
        resultDismissed: !!game.resultDismissed,
        nextStoneId: game.nextStoneId || 1,
        stones: (game.stones || [])
          .map((stone) => stoneExport(stone, preset.cols))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        queue: {
          eventIndex: 0,
          eventCount: 0,
          stepPaused: false,
          currentAnimation: null,
          events: []
        }
      };
    }
    if (isConnectFourGame(game)) {
      return {
        ...base,
        turn: game.turn || 'red',
        fallDir: game.fallDir,
        fallDirName: latticeForPreset(game.preset).dirNames[game.fallDir] || String(game.fallDir),
        holes: Array.from(game.holes || [])
          .sort((a, b) => a - b)
          .map((index) => ({ index, ...rowCol(index, preset.cols) })),
        cycleHoles: Array.from(game.cycleHoles || [])
          .sort((a, b) => a - b)
          .map((index) => ({ index, ...rowCol(index, preset.cols) })),
        winner: game.winner || '',
        winningLine: (game.winningLine || []).slice(),
        resultDismissed: !!game.resultDismissed,
        nextTokenId: game.nextTokenId || 1,
        dropWarning: game.dropWarning || '',
        tokens: (game.tokens || [])
          .map((token) => tokenExport(token, preset.cols))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        queue: {
          eventIndex: 0,
          eventCount: 0,
          stepPaused: false,
          currentAnimation: null,
          events: []
        }
      };
    }
    return {
      ...base,
      score: game.score || 0,
      highest: highestValue(game),
      existingTiles: existingTileCount(game),
      nextBoxId: game.nextBoxId,
      newBoxIds: Array.from(game.newBoxIds || []).sort((a, b) => a - b),
      boxes: game.boxes
        .map((box) => boxExport(box, preset.cols))
        .sort((a, b) => a.index - b.index || a.id - b.id),
      queue: {
        eventIndex,
        eventCount: eventQueue.length,
        stepPaused,
        currentAnimation: currentAnimation ? {
          kind: currentAnimation.event ? currentAnimation.event.kind : '',
          progress: currentAnimation.progress || 0
        } : null,
        events: clonePlain(eventQueue)
      }
    };
  }

  function boxExport(box, cols) {
    return {
      id: box.id,
      index: box.index,
      ...rowCol(box.index, cols),
      value: box.value
    };
  }

  function stoneExport(stone, cols) {
    return {
      id: stone.id,
      index: stone.index,
      ...rowCol(stone.index, cols),
      color: stone.color
    };
  }

  function tokenExport(token, cols) {
    return {
      id: token.id,
      index: token.index,
      ...rowCol(token.index, cols),
      color: token.color
    };
  }

  function debugExportInfo(state) {
    if (isGomokuGame(state)) {
      return `${state.stones.length} stone${state.stones.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    if (isConnectFourGame(state)) {
      return `${state.tokens.length} token${state.tokens.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    return `${state.boxes.length} box${state.boxes.length === 1 ? '' : 'es'}, ${state.removed.size} removed`;
  }

  function gameStateFromDebugImportText(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('paste a status JSON object');
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error('status JSON could not be parsed');
    }
    return gameStateFromDebugImportPayload(payload);
  }

  function gameStateFromDebugImportPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('status must be a JSON object');
    }
    const preset = presetFromStatusPayload(payload);
    const removed = normalizeStatusRemovedSet(payload, preset);
    if (normalizeStatusGameMode(payload) === GAME_MODES.GOMOKU) {
      const stones = normalizeStatusGomokuStones(payload.stones, preset, removed);
      const nextStoneId = Math.max(
        normalizeNonnegativeInteger(payload.nextStoneId, 1),
        stones.reduce((max, stone) => Math.max(max, stone.id + 1), 1)
      );
      const phase = normalizeStatusPhase(payload.phase);
      const winner = normalizeGomokuWinner(payload.winner);
      const state = {
        gameMode: GAME_MODES.GOMOKU,
        preset,
        phase,
        removed,
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        stones,
        nextStoneId,
        turn: normalizeGomokuTurn(payload.turn, stones.length),
        winner: phase === 'gameover' ? winner : '',
        winningLine: normalizeGomokuWinningLine(payload.winningLine, preset),
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, stones.length),
        ending: phase === 'gameover' ? normalizeGomokuEnding(payload.ending, winner) : '',
        debugMessage: ''
      };
      return {
        state,
        phase: state.phase,
        eventQueue: [],
        eventIndex: 0,
        stepPaused: false
      };
    }
    if (normalizeStatusGameMode(payload) === GAME_MODES.CONNECT_FOUR) {
      const tokens = normalizeStatusConnectFourTokens(payload.tokens, preset, removed);
      const nextTokenId = Math.max(
        normalizeNonnegativeInteger(payload.nextTokenId, 1),
        tokens.reduce((max, token) => Math.max(max, token.id + 1), 1)
      );
      const phase = normalizeStatusPhase(payload.phase);
      const winner = normalizeConnectFourWinner(payload.winner);
      const holes = normalizeConnectFourHoleSet(payload.holes, preset, removed);
      const cycleHoles = normalizeConnectFourHoleSet(payload.cycleHoles, preset, removed);
      const state = {
        gameMode: GAME_MODES.CONNECT_FOUR,
        preset,
        phase,
        removed,
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        tokens,
        nextTokenId,
        holes,
        cycleHoles: new Set(Array.from(cycleHoles).filter((index) => holes.has(index))),
        turn: normalizeConnectFourTurn(payload.turn, tokens.length),
        fallDir: normalizeConnectFourFallDir(payload.fallDirName != null ? payload.fallDirName : payload.fallDir, preset),
        winner: phase === 'gameover' ? winner : '',
        winningLine: normalizeConnectFourWinningLine(payload.winningLine, preset),
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, tokens.length),
        ending: phase === 'gameover' ? normalizeConnectFourEnding(payload.ending, winner) : '',
        dropWarning: sanitizeImportedText(payload.dropWarning || '', ''),
        debugMessage: ''
      };
      return {
        state,
        phase: state.phase,
        eventQueue: [],
        eventIndex: 0,
        stepPaused: false
      };
    }
    const boxes = normalizeStatusBoxes(payload.boxes, preset, removed);
    const nextBoxId = Math.max(
      normalizeNonnegativeInteger(payload.nextBoxId, 1),
      boxes.reduce((max, box) => Math.max(max, box.id + 1), 1)
    );
    const newBoxIds = normalizeStatusNewBoxIds(payload.newBoxIds, boxes);
    const state = {
      preset,
      phase: normalizeStatusPhase(payload.phase),
      removed,
      boxes,
      newBoxIds,
      nextBoxId,
      score: normalizeNonnegativeInteger(payload.score, 0),
      round: normalizeNonnegativeInteger(payload.round, 0),
      ending: normalizeStatusEnding(payload.ending, payload.phase),
      debugMessage: ''
    };
    const queue = payload.queue && typeof payload.queue === 'object' ? payload.queue : {};
    const eventQueueImport = Array.isArray(queue.events) ? clonePlain(queue.events) : [];
    const importedEventIndex = Math.max(0, Math.min(normalizeNonnegativeInteger(queue.eventIndex, 0), eventQueueImport.length));
    return {
      state,
      phase: state.phase,
      eventQueue: eventQueueImport,
      eventIndex: importedEventIndex,
      stepPaused: !!queue.stepPaused && eventQueueImport.length > 0 && importedEventIndex < eventQueueImport.length
    };
  }

  function presetFromStatusPayload(payload) {
    const source = payload.preset && typeof payload.preset === 'object' ? payload.preset : {};
    const sourceId = sanitizeImportedText(source.id || '', '');
    const base = sourceId ? PRESETS.find((preset) => preset.id === sourceId) : null;
    const lattice = normalizeImportedLattice(source.lattice || (base && base.lattice) || 'square');
    const rows = normalizeImportedBoardSize(source.rows || (base && base.rows), 'rows');
    const cols = normalizeImportedBoardSize(source.cols || (base && base.cols), 'cols');
    const shell = { lattice, rows, cols, removedTiles: [], cutEdges: [], gluedEdges: [] };
    const removedTiles = normalizeImportedRemovedTiles(
      Array.isArray(source.removedTiles) ? source.removedTiles : ((base && base.removedTiles) || []),
      rows,
      cols
    );
    shell.removedTiles = removedTiles;
    const cutEdges = normalizeImportedCutEdges(
      Array.isArray(source.cutEdges) ? source.cutEdges : ((base && base.cutEdges) || []),
      shell
    );
    shell.cutEdges = cutEdges;
    const gluedEdges = normalizeImportedGluedEdges(
      Array.isArray(source.gluedEdges) ? source.gluedEdges : ((base && !base.randomGlue && base.gluedEdges) || []),
      shell
    );
    return {
      id: IMPORTED_PRESET_ID,
      sourceId,
      label: sanitizeImportedText(source.label || (base && base.label) || 'imported status', 'imported status'),
      lattice,
      rows,
      cols,
      surface: sanitizeImportedText(source.surface || (base && base.surface) || `${latticeForPreset(shell).label} status`, `${latticeForPreset(shell).label} status`),
      removedTiles,
      cutEdges,
      gluedEdges
    };
  }

  function normalizeStatusRemovedSet(payload, preset) {
    const entries = Array.isArray(payload.removed)
      ? payload.removed
      : (Array.isArray(preset.removedTiles) ? preset.removedTiles : []);
    return new Set(normalizeImportedRemovedTiles(entries, preset.rows, preset.cols)
      .map((tile) => indexOf(tile.row, tile.col, preset.cols)));
  }

  function normalizeStatusBoxes(entries, preset, removed) {
    if (!Array.isArray(entries)) throw new Error('status boxes must be an array');
    const usedIds = new Set();
    return entries.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status box ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status box ${index + 1} is on a removed tile`);
      const value = Number(entry && entry.value);
      if (!isPowerOfTwo(value) || value < 2) throw new Error(`status box ${index + 1} value must be 2, 4, 8, ...`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status box id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, value };
    });
  }

  function normalizeStatusGomokuStones(entries, preset, removed) {
    if (!Array.isArray(entries)) throw new Error('status stones must be an array');
    const usedIds = new Set();
    const occupied = new Set();
    return entries.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status stone ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status stone ${index + 1} is on a removed tile`);
      if (occupied.has(tileIndex)) throw new Error(`status stone ${index + 1} shares an occupied tile`);
      occupied.add(tileIndex);
      const color = normalizeGomokuColor(entry && entry.color);
      if (!color) throw new Error(`status stone ${index + 1} color must be black or white`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status stone id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, color };
    });
  }

  function normalizeStatusConnectFourTokens(entries, preset, removed) {
    if (!Array.isArray(entries)) throw new Error('status tokens must be an array');
    const usedIds = new Set();
    const occupied = new Set();
    return entries.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status token ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status token ${index + 1} is on a removed tile`);
      if (occupied.has(tileIndex)) throw new Error(`status token ${index + 1} shares an occupied tile`);
      occupied.add(tileIndex);
      const color = normalizeConnectFourColor(entry && entry.color);
      if (!color) throw new Error(`status token ${index + 1} color must be red or yellow`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status token id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, color };
    });
  }

  function normalizeConnectFourHoleSet(entries, preset, removed) {
    const holes = new Set();
    const values = entries instanceof Set ? Array.from(entries) : entries;
    if (!values || !Array.isArray(values)) return holes;
    values.forEach((entry) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) return;
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (!removed.has(tileIndex)) holes.add(tileIndex);
    });
    return holes;
  }

  function normalizeStatusNewBoxIds(entries, boxes) {
    if (!Array.isArray(entries)) return new Set();
    const validIds = new Set(boxes.map((box) => box.id));
    const ids = new Set();
    entries.forEach((entry) => {
      const id = Number(entry);
      if (Number.isInteger(id) && validIds.has(id)) ids.add(id);
    });
    return ids;
  }

  function normalizeStatusPhase(value) {
    return ['setup', 'ready', 'paused', 'animating', 'gameover'].includes(value) ? value : 'ready';
  }

  function normalizeStatusGameMode(payload) {
    const value = String((payload && (payload.gameMode || payload.game)) || '').trim().toLowerCase();
    if (value === GAME_MODES.CONNECT_FOUR || value === 'connectfour' || value === 'connect four') {
      return GAME_MODES.CONNECT_FOUR;
    }
    if (value === GAME_MODES.GOMOKU || (Array.isArray(payload && payload.stones) && !Array.isArray(payload && payload.boxes))) {
      return GAME_MODES.GOMOKU;
    }
    if (Array.isArray(payload && payload.tokens) && !Array.isArray(payload && payload.boxes)) {
      return GAME_MODES.CONNECT_FOUR;
    }
    return GAME_MODES.NUMBER_2048;
  }

  function normalizeStatusEnding(value, phase) {
    if (phase !== 'gameover') return '';
    return value === 'bonus' ? 'bonus' : 'standard';
  }

  function normalizeGomokuColor(value) {
    const color = String(value || '').trim().toLowerCase();
    return GOMOKU_COLORS.includes(color) ? color : '';
  }

  function normalizeGomokuTurn(value, stoneCount) {
    const color = normalizeGomokuColor(value);
    if (color) return color;
    return stoneCount % 2 === 0 ? 'black' : 'white';
  }

  function normalizeGomokuWinner(value) {
    return normalizeGomokuColor(value);
  }

  function normalizeGomokuEnding(value, winner) {
    if (winner) return 'gomoku-win';
    return value === 'draw' ? 'draw' : '';
  }

  function normalizeGomokuWinningLine(entries, preset) {
    if (!Array.isArray(entries)) return [];
    const total = preset.rows * preset.cols;
    return entries
      .map((entry) => Number(entry))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < total)
      .slice(0, GOMOKU_WIN_LENGTH);
  }

  function normalizeConnectFourColor(value) {
    const color = String(value || '').trim().toLowerCase();
    return CONNECT_FOUR_COLORS.includes(color) ? color : '';
  }

  function normalizeConnectFourTurn(value, tokenCount) {
    const color = normalizeConnectFourColor(value);
    if (color) return color;
    return tokenCount % 2 === 0 ? 'red' : 'yellow';
  }

  function normalizeConnectFourWinner(value) {
    return normalizeConnectFourColor(value);
  }

  function normalizeConnectFourEnding(value, winner) {
    if (winner) return 'connect-four-win';
    return value === 'draw' ? 'draw' : '';
  }

  function normalizeConnectFourWinningLine(entries, preset) {
    if (!Array.isArray(entries)) return [];
    const total = preset.rows * preset.cols;
    return entries
      .map((entry) => Number(entry))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < total)
      .slice(0, CONNECT_FOUR_WIN_LENGTH);
  }

  function normalizeConnectFourFallDir(value, preset) {
    const dir = normalizeImportedDir(value, preset);
    return Number.isInteger(dir) ? dir : defaultConnectFourFallDir(preset);
  }

  function normalizePositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }

  function normalizeNonnegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : fallback;
  }

  function syncStatusForCurrentGame() {
    if (!game) return;
    if (isGomokuGame(game)) {
      if (game.phase === 'setup') {
        syncStatus(`${game.preset.label} Gomoku preview`, previewInfo(game.preset), 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        if (game.winner) syncStatus(`${gomokuColorLabel(game.winner)} wins`, `${game.round || 0} move${game.round === 1 ? '' : 's'}`, 'over');
        else syncStatus('Gomoku draw', `${game.round || 0} moves`, 'over');
        return;
      }
      syncStatus(`Gomoku move ${game.round || 0}`, gomokuTurnInfo(game), phaseBadge(game.phase));
      return;
    }
    if (isConnectFourGame(game)) {
      if (game.phase === 'setup') {
        syncStatus(`${game.preset.label} Connect Four preview`, `${previewInfo(game.preset)}; ${connectFourHoleInfo(game)}`, 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        if (game.winner) syncStatus(`${connectFourColorLabel(game.winner)} wins`, `${game.round || 0} drop${game.round === 1 ? '' : 's'}`, 'over');
        else syncStatus('Connect Four draw', `${game.round || 0} drops`, 'over');
        return;
      }
      syncStatus(`Connect Four drop ${game.round || 0}`, connectFourTurnInfo(game), phaseBadge(game.phase));
      return;
    }
    if (game.phase === 'setup') {
      syncStatus(`${game.preset.label} preview`, previewInfo(game.preset), 'setup');
      return;
    }
    if (game.phase === 'gameover') {
      if (game.ending === 'bonus') syncStatus('bonus ending', `all ${directionsForPreset(game.preset).length} directions unchanged`, 'over');
      else syncStatus('game over', 'no empty tile and no changing move', 'over');
      return;
    }
    if (eventQueue.length) {
      syncStatus(`round ${game.round}: ${game.phase === 'paused' ? 'paused' : 'moving'}`, `${eventIndex}/${eventQueue.length} events`, phaseBadge(game.phase));
      return;
    }
    syncReadyStatus(`round ${game.round}`);
  }

  function syncReadyStatus(statusText) {
    if (isExplosionModeActive(game)) {
      const labels = explosionModeDirections(game).map((dir) => dirLabel(dir, game.preset)).join(', ');
      syncStatus('explosion mode', `cycle move available: ${labels}`, 'ready');
      return;
    }
    syncStatus(statusText || `round ${game.round}`, 'use arrow keys to slide', phaseBadge(game.phase));
  }

  function phaseBadge(phase) {
    if (phase === 'setup') return 'setup';
    if (phase === 'animating') return 'moving';
    if (phase === 'paused') return 'step';
    if (phase === 'gameover') return 'over';
    if (phase === 'ready') return 'ready';
    return phase || '';
  }

  function render() {
    if (!refs.canvas || !refs.ctx) return;
    const preset = game ? game.preset : selectedPreset();
    if (hoveredGlue && !activeGlueHoverForPreset(preset, hoveredGlue)) {
      hoveredGlue = null;
      syncGlueHoverCursor();
    }
    const removed = game ? game.removed : initialRemovedSet(preset);
    const wrap = refs.canvas.parentElement;
    const widthAvailable = Math.max(280, Math.floor(wrap ? wrap.clientWidth : refs.canvas.clientWidth || 720));
    const margin = widthAvailable < 430 ? 18 : 28;
    const dpr = Math.min(Math.max((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 1), 2.5);
    geometry = buildGeometry(preset, widthAvailable, margin, dpr);
    const logicalWidth = geometry.width;
    const logicalHeight = geometry.height;
    refs.canvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.canvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ctx = refs.ctx;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const explosionMode = is2048Game(game) && isExplosionModeActive(game);
    ctx.fillStyle = explosionMode ? '#fff0ee' : '#fffdf8';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    const vertexDisplay = (isGomokuGame(game) && gomokuDisplayStyle() === 'vertex') || isConnectFourGame(game);
    if (!vertexDisplay) {
      geometry.cells.forEach((cell, index) => {
        if (cell) drawTile(ctx, geometry, cell.row, cell.col, removed.has(index), explosionMode);
      });
    }

    drawBackgroundBoundaries(ctx, geometry, preset, removed);
    drawGlueEdges(ctx, geometry, preset, hoveredGlue);
    if (isPlacementGame(game)) {
      if (vertexDisplay) drawPlacementVertexBoard(ctx, geometry, game);
      if (!isConnectFourDropAnimation()) drawPlacementWinningLine(ctx, geometry, game);
      drawPlacementPieces(ctx, geometry, placementPieces(game));
      drawPlacementAnimationOverlays(ctx, geometry);
    } else {
      drawNumberBoxes(ctx, geometry, game ? game.boxes : []);
      drawAnimationOverlays(ctx, geometry);
      drawDebugDirectionIndicators(ctx, geometry);
    }
    if (game && game.phase === 'gameover' && !currentAnimation && (!isPlacementGame(game) || !game.resultDismissed)) {
      drawGameOverPopup(ctx, geometry, game);
    }
    syncStats();
  }

  function buildGeometry(preset, widthAvailable, margin, dpr) {
    const lattice = latticeForPreset(preset);
    const cells = [];
    if (lattice.shape === 'hex') {
      const hexWidthFactor = Math.sqrt(3) * (preset.cols + 0.5);
      const radius = Math.min(Math.max((widthAvailable - margin * 2) / hexWidthFactor, 16), 48);
      const hexWidth = Math.sqrt(3) * radius;
      for (let row = 1; row <= preset.rows; row += 1) {
        for (let col = 1; col <= preset.cols; col += 1) {
          const rowZero = row - 1;
          const colZero = col - 1;
          const axial = offsetToAxial(rowZero, colZero);
          cells[indexOf(row, col, preset.cols)] = {
            row,
            col,
            q: axial.q,
            r: axial.r,
            x: margin + (hexWidth / 2) + (hexWidth * (axial.q + (axial.r / 2))),
            y: margin + radius + (rowZero * 1.5 * radius)
          };
        }
      }
      return {
        width: Math.ceil(hexWidth * (preset.cols + 0.5) + margin * 2),
        height: Math.ceil((2 * radius) + ((preset.rows - 1) * 1.5 * radius) + margin * 2),
        margin,
        radius,
        size: hexWidth,
        rows: preset.rows,
        cols: preset.cols,
        lattice,
        cells
      };
    }

    const size = Math.min(Math.max((widthAvailable - margin * 2) / preset.cols, 24), 58);
    const radius = size / 2;
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        cells[indexOf(row, col, preset.cols)] = {
          row,
          col,
          x: margin + radius + ((col - 1) * size),
          y: margin + radius + ((row - 1) * size)
        };
      }
    }
    return {
      width: Math.ceil((preset.cols * size) + margin * 2),
      height: Math.ceil((preset.rows * size) + margin * 2),
      margin,
      radius,
      size,
      rows: preset.rows,
      cols: preset.cols,
      lattice,
      cells
    };
  }

  function drawTile(ctx, geom, row, col, removed, explosionMode = false) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const points = tilePoints(cell.x, cell.y, geom.radius * 0.96, geom.lattice);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = removed ? '#e9e0d0' : (explosionMode ? '#ffe4de' : '#fbf5e8');
    ctx.strokeStyle = explosionMode && !removed ? '#e5b2a8' : '#d8c9ac';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    if (!removed) return;
    const mark = geom.radius * 0.28;
    ctx.strokeStyle = 'rgba(128,98,69,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cell.x - mark, cell.y - mark);
    ctx.lineTo(cell.x + mark, cell.y + mark);
    ctx.moveTo(cell.x + mark, cell.y - mark);
    ctx.lineTo(cell.x - mark, cell.y + mark);
    ctx.stroke();
  }

  function drawBackgroundBoundaries(ctx, geom, preset, removed) {
    const glued = gluedEdgeKeySet(preset);
    const cuts = cutEdgeKeySet(preset);
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.8, geom.radius * 0.055);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        const index = indexOf(row, col, preset.cols);
        if (removed.has(index)) continue;
        for (const dir of directionsForPreset(preset)) {
          if (glued.has(boundaryEdgeKey({ row, col, dir }, preset.cols))) continue;
          const next = neighbor(row, col, dir, preset);
          const boundary = !next
            || removed.has(indexOf(next.row, next.col, preset.cols))
            || cuts.has(cutKey(index, indexOf(next.row, next.col, preset.cols)));
          if (boundary) drawBackgroundBoundarySegment(ctx, edgeSegment(geom, row, col, dir));
        }
      }
    }
    ctx.restore();
  }

  function drawGlueEdges(ctx, geom, preset, hover) {
    const activeHover = activeGlueHoverForPreset(preset, hover);
    const activeGroup = activeHover && activeHover.groupKey;
    ctx.save();
    preset.gluedEdges.forEach((pair) => {
      const color = glueColor(pair);
      drawGlueHalf(ctx, geom, pair.first, color, glueFirstArrowReversed(pair));
      drawGlueHalf(ctx, geom, pair.second, color, glueSecondArrowReversed(pair));
    });
    if (activeGroup) {
      preset.gluedEdges.forEach((pair, pairIndex) => {
        if (gluePairGroupKey(pair, pairIndex) !== activeGroup) return;
        const color = glueColor(pair);
        drawGlueHalf(ctx, geom, pair.first, color, glueFirstArrowReversed(pair), { highlighted: true });
        drawGlueHalf(ctx, geom, pair.second, color, glueSecondArrowReversed(pair), { highlighted: true });
      });
    }
    ctx.restore();
  }

  function drawGlueHalf(ctx, geom, edge, color, reverse, options = {}) {
    const segment = edgeSegment(geom, edge.row, edge.col, edge.dir);
    const lineWidth = Math.max(1.8, geom.radius * 0.055) * 1.15;
    ctx.save();
    if (options.highlighted) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = lineWidth * 4.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawBackgroundBoundarySegment(ctx, segment);
    }
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = options.highlighted ? lineWidth * 2 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (options.highlighted) {
      ctx.shadowColor = 'rgba(17,17,17,0.22)';
      ctx.shadowBlur = Math.max(6, geom.radius * 0.16);
    }
    drawBackgroundBoundarySegment(ctx, segment);
    drawSegmentArrow(ctx, segment, reverse, color, options.highlighted ? lineWidth * 1.8 : lineWidth, geom.radius);
    ctx.restore();
  }

  function drawNumberBoxes(ctx, geom, boxes) {
    if (!boxes.length) return;
    const hidden = hiddenBoxIdsForAnimation();
    boxes.forEach((box) => {
      if (hidden.has(box.id)) return;
      drawBoxAtIndex(ctx, geom, box.index, box.value, 1, {
        highlight: shouldHighlightBox(box)
      });
    });
  }

  function drawPlacementWinningLine(ctx, geom, state) {
    if (!state || !state.winningLine || !state.winningLine.length) return;
    const unique = Array.from(new Set(state.winningLine));
    const segments = placementWinningLineSegments(state, geom);
    ctx.save();
    if (segments.length) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(17,17,17,0.22)';
      ctx.lineWidth = Math.max(5, geom.radius * 0.22);
      drawLooseSegments(ctx, segments);
      ctx.strokeStyle = '#b23a48';
      ctx.lineWidth = Math.max(2.6, geom.radius * 0.1);
      drawLooseSegments(ctx, segments);
    }
    ctx.fillStyle = 'rgba(196,127,23,0.2)';
    ctx.strokeStyle = 'rgba(196,127,23,0.78)';
    ctx.lineWidth = Math.max(1.4, geom.radius * 0.06);
    unique.forEach((index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawLooseSegments(ctx, segments) {
    ctx.beginPath();
    segments.forEach((segment) => {
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
    });
    ctx.stroke();
  }

  function placementWinningLineSegments(state, geom) {
    const line = Array.isArray(state && state.winningLine) ? state.winningLine : [];
    const segments = [];
    for (let index = 0; index + 1 < line.length; index += 1) {
      segments.push(...placementLineRenderSegments(state, geom, line[index], line[index + 1]));
    }
    return segments;
  }

  function placementLineRenderSegments(state, geom, fromIndex, toIndex) {
    const from = placementPiecePoint(geom, fromIndex);
    const to = placementPiecePoint(geom, toIndex);
    if (!from || !to) return [];
    const route = placementLineTransitionRoute(state, fromIndex, toIndex);
    if (!route || !route.transitions.length || !route.transitions.some((transition) => transition.glued)) {
      return samePoint(from, to) ? [] : [{ start: from, end: to }];
    }
    const segments = [];
    let anchor = from;
    route.transitions.forEach((transition) => {
      if (!transition.glued || !transition.edge) return;
      const outgoing = placementTransitionBoundaryPoint(state, geom, route, transition, false);
      if (anchor && outgoing && !samePoint(anchor, outgoing)) {
        segments.push({ start: anchor, end: outgoing });
      }
      anchor = placementTransitionBoundaryPoint(state, geom, route, transition, true);
    });
    if (anchor && !samePoint(anchor, to)) segments.push({ start: anchor, end: to });
    return segments;
  }

  function drawPlacementVertexBoard(ctx, geom, state) {
    const removed = state && state.removed ? state.removed : new Set();
    ctx.save();
    ctx.strokeStyle = 'rgba(92,76,54,0.24)';
    ctx.fillStyle = 'rgba(92,76,54,0.3)';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.8, geom.radius * 0.026);
    geometryCells(geom).forEach(({ cell, index }) => {
      if (removed.has(index)) return;
      const center = placementPiecePoint(geom, index);
      if (!center) return;
      directionsForPreset(state.preset).forEach((dir) => {
        const vector = dirVector(dir, (geom.size || geom.radius * 2) * 0.5, geom.lattice);
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + vector.x, center.y + vector.y);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(1.6, geom.radius * 0.052), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    if (isConnectFourGame(state)) drawConnectFourHoles(ctx, geom, state);
  }

  function drawConnectFourHoles(ctx, geom, state) {
    const holes = state && state.holes ? Array.from(state.holes) : [];
    if (!holes.length) return;
    ctx.save();
    holes.forEach((index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      const radius = geom.radius * 0.34;
      const cycles = !!(state.cycleHoles && state.cycleHoles.has(index));
      ctx.fillStyle = cycles ? '#fff1ef' : '#fffdf8';
      ctx.strokeStyle = cycles ? '#b42318' : '#111111';
      ctx.lineWidth = cycles ? Math.max(2.4, geom.radius * 0.095) : Math.max(2, geom.radius * 0.075);
      ctx.shadowColor = 'rgba(17,17,17,0.18)';
      ctx.shadowBlur = Math.max(2, geom.radius * 0.1);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
      ctx.strokeStyle = cycles ? 'rgba(180,35,24,0.95)' : 'rgba(31,122,140,0.62)';
      ctx.lineWidth = cycles ? Math.max(2.2, geom.radius * 0.08) : Math.max(1.3, geom.radius * 0.045);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.22, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlacementPieces(ctx, geom, pieces) {
    if (!pieces.length) return;
    const hidden = hiddenPlacementPieceIds();
    pieces.forEach((piece) => {
      if (hidden.has(piece.id)) return;
      drawPlacementPieceAtIndex(ctx, geom, piece);
    });
  }

  function drawPlacementPieceAtIndex(ctx, geom, piece) {
    const point = placementPiecePoint(geom, piece.index);
    if (!point) return;
    drawPlacementPieceAtPoint(ctx, geom, point, piece);
  }

  function drawPlacementPieceAtPoint(ctx, geom, point, piece) {
    const radius = geom.radius * 0.43;
    const colors = placementPieceColors(piece.color);
    ctx.save();
    ctx.shadowColor = 'rgba(45,34,22,0.2)';
    ctx.shadowBlur = Math.max(1.5, geom.radius * 0.1);
    ctx.shadowOffsetY = Math.max(0.8, geom.radius * 0.035);
    const gradient = ctx.createRadialGradient
      ? ctx.createRadialGradient(
        point.x - radius * 0.26,
        point.y - radius * 0.32,
        radius * 0.12,
        point.x,
        point.y,
        radius
      )
      : null;
    if (colors.stops) {
      if (gradient && gradient.addColorStop) {
        colors.stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
      }
    }
    ctx.strokeStyle = colors.stroke;
    ctx.fillStyle = gradient || colors.fallback;
    ctx.lineWidth = Math.max(1.1, geom.radius * 0.04);
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();
  }

  function drawPlacementAnimationOverlays(ctx, geom) {
    if (!currentAnimation || !currentAnimation.event || currentAnimation.event.kind !== 'connectFourDrop') return;
    const event = currentAnimation.event;
    const piece = {
      id: event.tokenId,
      index: event.to,
      color: event.color
    };
    const frame = connectFourDropAnimationFrame(geom, event, currentAnimation.progress || 0);
    if (!frame) return;
    if (frame.kind === 'glued') {
      drawGluedPlacementPiece(ctx, geom, frame.transition, frame.progress, piece);
      return;
    }
    if (frame.point) drawPlacementPieceAtPoint(ctx, geom, frame.point, piece);
  }

  function connectFourDropAnimationFrame(geom, event, rawProgress) {
    const progress = Math.max(0, Math.min(1, rawProgress || 0));
    const path = Array.isArray(event.path) && event.path.length ? event.path : [event.to];
    const transitions = Array.isArray(event.transitions) ? event.transitions : [];
    const centers = path.map((index) => placementPiecePoint(geom, index)).filter(Boolean);
    if (!centers.length) return null;
    const finalPoint = centers[centers.length - 1];
    const travelLimit = 0.76;
    if (progress <= travelLimit) {
      const travel = easeInOut(progress / travelLimit);
      if (transitions.length) {
        const scaled = travel * transitions.length;
        const segmentIndex = Math.min(transitions.length - 1, Math.floor(scaled));
        const local = Math.max(0, Math.min(1, scaled - segmentIndex));
        const transition = transitions[segmentIndex];
        if (transition && transition.glued) {
          return { kind: 'glued', transition, progress: local };
        }
        const from = placementPiecePoint(geom, transition.from);
        const to = placementPiecePoint(geom, transition.to);
        if (!from || !to) return { kind: 'point', point: finalPoint };
        return { kind: 'point', point: lerpPoint(from, to, local) };
      }
      if (centers.length === 1) return { kind: 'point', point: finalPoint };
      const scaled = travel * (centers.length - 1);
      const segmentIndex = Math.min(centers.length - 2, Math.floor(scaled));
      const local = scaled - segmentIndex;
      return { kind: 'point', point: lerpPoint(centers[segmentIndex], centers[segmentIndex + 1], local) };
    }
    const bounce = (progress - travelLimit) / (1 - travelLimit);
    const pulse = Math.sin(bounce * Math.PI);
    const vector = dirVector(event.stopDir, geom.radius * 0.42, geom.lattice);
    return { kind: 'point', point: {
      x: finalPoint.x + vector.x * pulse,
      y: finalPoint.y + vector.y * pulse
    } };
  }

  function drawGluedPlacementPiece(ctx, geom, transition, progress, piece) {
    const from = placementPiecePoint(geom, transition.from);
    const to = placementPiecePoint(geom, transition.to);
    if (!from || !to || !transition.edge) return;
    const outgoing = dirVector(transition.edge.dir, geom.size, geom.lattice);
    const incoming = dirVector(transition.dir, geom.size, geom.lattice);
    const exitPoint = {
      x: from.x + outgoing.x * progress,
      y: from.y + outgoing.y * progress
    };
    const entryPoint = {
      x: to.x - incoming.x * (1 - progress),
      y: to.y - incoming.y * (1 - progress)
    };
    drawPlacementPieceClippedToTile(ctx, geom, transition.from, exitPoint, piece);
    drawPlacementPieceClippedToTile(ctx, geom, transition.to, entryPoint, piece);
    drawGlueFlash(ctx, geom, { edge: transition.edge }, progress);
  }

  function drawPlacementPieceClippedToTile(ctx, geom, index, point, piece) {
    const cell = geom.cells[index];
    if (!cell) return;
    ctx.save();
    clipToTile(ctx, geom, cell, geom.radius * 0.96);
    drawPlacementPieceAtPoint(ctx, geom, point, piece);
    ctx.restore();
  }

  function placementPiecePoint(geom, index) {
    const cell = geom && geom.cells ? geom.cells[index] : null;
    if (!cell) return null;
    return { x: cell.x, y: cell.y };
  }

  function edgeMidpointFromIndex(geom, index, dir) {
    const segment = edgeSegmentFromIndex(geom, index, dir);
    if (!segment) return null;
    return {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2
    };
  }

  function placementTransitionBoundaryPoint(state, geom, route, transition, entry) {
    const edgeDir = entry ? oppositeDir(state.preset, transition.dir) : transition.edge.dir;
    if (!route || route.kind !== 'diagonal') {
      return edgeMidpointFromIndex(geom, entry ? transition.to : transition.from, edgeDir);
    }
    const index = route.transitions.indexOf(transition);
    const companion = Number.isInteger(entry ? transition.companionAfter : transition.companionBefore)
      ? (entry ? transition.companionAfter : transition.companionBefore)
      : diagonalTransitionCompanionDir(state, route, index);
    if (!Number.isInteger(companion)) {
      return edgeMidpointFromIndex(geom, entry ? transition.to : transition.from, edgeDir);
    }
    return edgePointTowardDir(geom, entry ? transition.to : transition.from, edgeDir, companion);
  }

  function diagonalTransitionCompanionDir(state, route, index) {
    if (!route || route.kind !== 'diagonal' || !Array.isArray(route.transitions)) return null;
    const next = route.transitions[index + 1];
    if (next && Number.isInteger(next.outDir)) return next.outDir;
    const previous = route.transitions[index - 1];
    if (previous && Number.isInteger(previous.dir)) return oppositeDir(state.preset, previous.dir);
    return null;
  }

  function edgePointTowardDir(geom, index, edgeDir, towardDir) {
    const segment = edgeSegmentFromIndex(geom, index, edgeDir);
    const center = placementPiecePoint(geom, index);
    if (!segment || !center) return null;
    const edgeVector = dirVector(edgeDir, 1, geom.lattice);
    const towardVector = dirVector(towardDir, 1, geom.lattice);
    const target = {
      x: edgeVector.x + towardVector.x,
      y: edgeVector.y + towardVector.y
    };
    if (Math.hypot(target.x, target.y) < 0.001) return edgeMidpointFromIndex(geom, index, edgeDir);
    const startScore = ((segment.start.x - center.x) * target.x) + ((segment.start.y - center.y) * target.y);
    const endScore = ((segment.end.x - center.x) * target.x) + ((segment.end.y - center.y) * target.y);
    return endScore >= startScore ? segment.end : segment.start;
  }

  function samePoint(a, b) {
    return !!(a && b && Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001);
  }

  function placementLineTransitionRoute(state, fromIndex, toIndex) {
    if (!state || !state.preset || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return null;
    for (const dir of directionsForPreset(state.preset)) {
      const route = placementRouteByDirections(state, fromIndex, [dir], { kind: 'axis', propagate: true });
      if (route && route.end === toIndex) return route;
    }
    const diagonalOrders = gomokuDiagonalAxes(state.preset)
      .flatMap((axis) => axis.forward.concat(axis.backward));
    for (const order of diagonalOrders) {
      const route = placementRouteByDirections(state, fromIndex, order, { kind: 'diagonal', propagate: false, transport: true });
      if (route && route.end === toIndex) return route;
    }
    return null;
  }

  function placementRouteByDirections(state, startIndex, dirs, options = {}) {
    let index = startIndex;
    let direction = dirs[0];
    let transportedDirs = dirs.slice();
    const transitions = [];
    const actualDirections = [];
    for (let step = 0; step < dirs.length; step += 1) {
      const outDir = options.transport ? transportedDirs[step] : (options.propagate ? direction : dirs[step]);
      const next = surfaceSuccessor(state, index, outDir);
      if (!next) return null;
      actualDirections.push(outDir);
      const record = placementTransitionRecord(index, outDir, next);
      if (options.transport) {
        const nextDirs = transportedDirectionsAfterStep(state, transportedDirs, step, outDir, next);
        record.companionBefore = step > 0
          ? oppositeDir(state.preset, transitions[step - 1].dir)
          : transportedDirs[step + 1];
        record.companionAfter = step + 1 < dirs.length
          ? nextDirs[step + 1]
          : (step > 0 ? oppositeDir(state.preset, nextDirs[step - 1]) : null);
        transportedDirs = nextDirs;
      }
      transitions.push(record);
      index = next.index;
      direction = next.dir;
    }
    return {
      kind: options.kind || 'axis',
      start: startIndex,
      end: index,
      directions: actualDirections.length ? actualDirections : dirs.slice(),
      transitions
    };
  }

  function placementTransitionRecord(fromIndex, outDir, transition) {
    return {
      from: fromIndex,
      to: transition.index,
      dir: transition.dir,
      outDir,
      kind: transition.kind,
      glued: transition.kind === 'glued',
      edge: transition.edge ? { ...transition.edge } : null
    };
  }

  function clonePlacementTransition(transition) {
    return {
      ...transition,
      edge: transition && transition.edge ? { ...transition.edge } : null
    };
  }

  function placementPieces(state) {
    if (isConnectFourGame(state)) return state.tokens || [];
    return state && state.stones ? state.stones : [];
  }

  function hiddenPlacementPieceIds() {
    const hidden = new Set();
    if (!currentAnimation || !currentAnimation.event) return hidden;
    const event = currentAnimation.event;
    if (event.kind === 'connectFourDrop' && event.tokenId != null) hidden.add(event.tokenId);
    return hidden;
  }

  function isConnectFourDropAnimation() {
    return !!(currentAnimation && currentAnimation.event && currentAnimation.event.kind === 'connectFourDrop');
  }

  function placementPieceColors(color) {
    if (color === 'white') {
      return {
        fallback: '#f7f1e7',
        stroke: '#8d7f70',
        stops: [
          { offset: 0, color: '#ffffff' },
          { offset: 0.72, color: '#f2eadc' },
          { offset: 1, color: '#c9bca9' }
        ]
      };
    }
    if (color === 'red') {
      return {
        fallback: '#d83a3a',
        stroke: '#841f24',
        stops: [
          { offset: 0, color: '#ff9a8f' },
          { offset: 0.64, color: '#d83a3a' },
          { offset: 1, color: '#841f24' }
        ]
      };
    }
    if (color === 'yellow') {
      return {
        fallback: '#f0c84b',
        stroke: '#9a7117',
        stops: [
          { offset: 0, color: '#fff1a6' },
          { offset: 0.68, color: '#f0c84b' },
          { offset: 1, color: '#b9851d' }
        ]
      };
    }
    return {
      fallback: '#171615',
      stroke: '#050505',
      stops: [
        { offset: 0, color: '#5d5a55' },
        { offset: 0.72, color: '#171615' },
        { offset: 1, color: '#050505' }
      ]
    };
  }

  function geometryCells(geom) {
    if (!geom || !Array.isArray(geom.cells)) return [];
    return geom.cells
      .map((cell, index) => ({ cell, index }))
      .filter((entry) => !!entry.cell);
  }

  function drawAnimationOverlays(ctx, geom) {
    if (!currentAnimation) return;
    const event = currentAnimation.event;
    const progress = easeInOut(currentAnimation.progress || 0);
    if (event.kind === 'moveGroup') {
      event.moves.forEach((move) => {
        const from = geom.cells[move.from];
        const to = geom.cells[move.to];
        if (!from || !to) return;
        if (move.glued) drawGluedMove(ctx, geom, move, progress);
        else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, move.value, 1, geom.lattice);
      });
      if (event.bounces) event.bounces.forEach((move) => drawBounceMove(ctx, geom, move, progress));
      if (event.merges) event.merges.forEach((merge) => drawMergeAnimation(ctx, geom, merge, progress));
      if (event.postMerges) event.postMerges.forEach((merge) => drawMergeAnimation(ctx, geom, merge, progress));
      if (event.explosions) event.explosions.forEach((explosion) => drawExplosionEvent(ctx, geom, explosion, progress));
      return;
    }
    if (event.kind === 'bounceGroup') {
      event.moves.forEach((move) => drawBounceMove(ctx, geom, move, progress));
      return;
    }
    if (event.kind === 'move') {
      const from = geom.cells[event.from];
      const to = geom.cells[event.to];
      if (!from || !to) return;
      if (event.glued) drawGluedMove(ctx, geom, event, progress);
      else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, event.value, 1, geom.lattice);
      return;
    }
    if (event.kind === 'merge') {
      drawMergeAnimation(ctx, geom, event, progress);
      return;
    }
    if (event.kind === 'explode') {
      drawExplosionEvent(ctx, geom, event, progress);
      return;
    }
    if (event.kind === 'removeTile') {
      drawRemovalFlash(ctx, geom, event.index, progress);
      return;
    }
    if (event.kind === 'clearNumbers') {
      event.indices.forEach((index) => drawRemovalFlash(ctx, geom, index, progress * 0.72));
      return;
    }
    if (event.kind === 'spawn') {
      drawBoxAtIndex(ctx, geom, event.index, event.value, Math.max(0.12, progress), {
        highlight: shouldHighlightNewBoxes()
      });
    }
  }

  function drawMergeAnimation(ctx, geom, event, progress) {
    const moves = event.moves || event.from.map((fromIndex) => ({
      from: fromIndex,
      to: event.to,
      value: event.value,
      glued: false
    }));
    moves.forEach((move) => {
      const from = geom.cells[move.from];
      const to = geom.cells[move.to];
      if (!from || !to) return;
      if (move.glued) drawGluedMove(ctx, geom, move, progress);
      else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, move.value, 1, geom.lattice);
    });
    if (progress > 0.68) {
      const pulse = 1 + Math.sin((progress - 0.68) / 0.32 * Math.PI) * 0.18;
      drawBoxAtIndex(ctx, geom, event.to, event.newValue, pulse);
    }
  }

  function drawDebugDirectionIndicators(ctx, geom) {
    if (!debugMode || !game) return;
    const event = debugDirectionEvent();
    if (!event) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (event.kind === 'moveGroup') {
      drawDebugMoveArrows(ctx, geom, event.moves || [], 'move');
      drawDebugMoveArrows(ctx, geom, event.bounces || [], 'bounce');
      (event.merges || []).forEach((merge) => drawDebugMoveArrows(ctx, geom, merge.moves || [], 'merge'));
      (event.postMerges || []).forEach((merge) => drawDebugMoveArrows(ctx, geom, merge.moves || [], 'merge'));
      (event.explosions || []).forEach((explosion) => drawDebugExplosionArrows(ctx, geom, explosion));
    } else if (event.kind === 'bounceGroup') {
      drawDebugMoveArrows(ctx, geom, event.moves || [], 'bounce');
    } else if (event.kind === 'move') {
      drawDebugMoveArrows(ctx, geom, [event], 'move');
    } else if (event.kind === 'merge') {
      drawDebugMoveArrows(ctx, geom, event.moves || [], 'merge');
    } else if (event.kind === 'explode') {
      drawDebugExplosionArrows(ctx, geom, event);
    } else if (event.kind === 'removeTile') {
      drawDebugTileTarget(ctx, geom, event.index, debugIndicatorColor('explode'));
    } else if (event.kind === 'clearNumbers') {
      (event.indices || []).forEach((index) => drawDebugTileTarget(ctx, geom, index, debugIndicatorColor('clear')));
    }
    ctx.restore();
  }

  function debugDirectionEvent() {
    if (currentAnimation && currentAnimation.event) return currentAnimation.event;
    if (stepPaused && eventQueue.length && eventIndex < eventQueue.length) return eventQueue[eventIndex];
    return null;
  }

  function drawDebugMoveArrows(ctx, geom, moves, status) {
    moves.forEach((move) => drawDebugMoveArrow(ctx, geom, move, status));
  }

  function drawDebugExplosionArrows(ctx, geom, event) {
    drawDebugMoveArrows(ctx, geom, event.moves || [], 'explode');
    drawDebugTileTarget(ctx, geom, event.center, debugIndicatorColor('explode'));
  }

  function drawDebugMoveArrow(ctx, geom, move, status) {
    if (!move || !Number.isInteger(move.from)) return;
    const from = geom.cells[move.from];
    if (!from) return;
    const color = debugIndicatorColor(status);
    if (move.glued && move.edge) {
      drawDebugCellArrow(ctx, geom, move.from, move.edge.dir, color, status);
      if (Number.isInteger(move.to) && Number.isInteger(move.dir)) {
        drawDebugCellArrow(ctx, geom, move.to, move.dir, color, status, { alpha: 0.72, scale: 0.78 });
      }
      return;
    }
    const dir = Number.isInteger(move.dir) ? move.dir : debugDirectionBetweenCells(geom, move.from, move.to);
    if (!Number.isInteger(dir)) return;
    drawDebugCellArrow(ctx, geom, move.from, dir, color, status);
  }

  function drawDebugCellArrow(ctx, geom, index, dir, color, status, options = {}) {
    const cell = geom.cells[index];
    if (!cell || !Number.isInteger(dir)) return;
    const scale = Number.isFinite(options.scale) ? options.scale : 1;
    const alpha = Number.isFinite(options.alpha) ? options.alpha : 1;
    const length = geom.radius * (status === 'bounce' ? 0.72 : 0.82) * scale;
    const startOffset = geom.radius * 0.14 * scale;
    const vector = dirVector(dir, 1, geom.lattice);
    const start = {
      x: cell.x + vector.x * startOffset,
      y: cell.y + vector.y * startOffset
    };
    const end = {
      x: cell.x + vector.x * length,
      y: cell.y + vector.y * length
    };
    drawDebugArrowLine(ctx, start, end, color, geom, alpha);
    if (status === 'bounce') {
      const returnEnd = {
        x: cell.x + vector.x * geom.radius * 0.24 * scale,
        y: cell.y + vector.y * geom.radius * 0.24 * scale
      };
      drawDebugArrowLine(ctx, end, returnEnd, color, geom, alpha * 0.76, true);
    }
  }

  function drawDebugArrowLine(ctx, start, end, color, geom, alpha = 1, dashed = false) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.01) return;
    const ux = dx / length;
    const uy = dy / length;
    const size = Math.max(5, geom.radius * 0.18);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, geom.radius * 0.07);
    if (dashed && ctx.setLineDash) ctx.setLineDash([size * 0.65, size * 0.45]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    const base = {
      x: end.x - ux * size,
      y: end.y - uy * size
    };
    const normal = { x: -uy, y: ux };
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(base.x + normal.x * size * 0.48, base.y + normal.y * size * 0.48);
    ctx.lineTo(base.x - normal.x * size * 0.48, base.y - normal.y * size * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDebugTileTarget(ctx, geom, index, color) {
    const cell = geom.cells[index];
    if (!cell) return;
    const radius = geom.radius * 0.42;
    ctx.save();
    ctx.globalAlpha *= currentAnimation ? 0.78 : 0.62;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, geom.radius * 0.07);
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    directionsForPreset(game.preset).forEach((dir) => {
      const vector = dirVector(dir, 1, geom.lattice);
      drawDebugArrowLine(ctx, {
        x: cell.x + vector.x * radius * 1.9,
        y: cell.y + vector.y * radius * 1.9
      }, {
        x: cell.x + vector.x * radius * 1.08,
        y: cell.y + vector.y * radius * 1.08
      }, color, geom, 0.48, false);
    });
    ctx.restore();
  }

  function debugDirectionBetweenCells(geom, fromIndex, toIndex) {
    const from = geom.cells[fromIndex];
    const to = geom.cells[toIndex];
    if (!from || !to) return null;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    let bestDir = null;
    let bestDistance = Infinity;
    geom.lattice.angles.forEach((candidateAngle, dir) => {
      const distance = Math.abs(Math.atan2(Math.sin(angle - candidateAngle), Math.cos(angle - candidateAngle)));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestDir = dir;
      }
    });
    return bestDir;
  }

  function debugIndicatorColor(status) {
    if (status === 'bounce') return '#c47f17';
    if (status === 'merge') return '#6a4c93';
    if (status === 'explode') return '#b23a48';
    if (status === 'clear') return '#8a4f7d';
    return '#1f7a8c';
  }

  function hiddenBoxIdsForAnimation() {
    const hidden = new Set();
    if (!currentAnimation) return hidden;
    const event = currentAnimation.event;
    if (event.kind === 'move') hidden.add(event.boxId);
    if (event.kind === 'moveGroup') event.moves.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'moveGroup' && event.bounces) event.bounces.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'moveGroup' && event.merges) event.merges.forEach((merge) => hideMergeBoxes(hidden, merge));
    if (event.kind === 'moveGroup' && event.postMerges) event.postMerges.forEach((merge) => hideMergeBoxes(hidden, merge));
    if (event.kind === 'moveGroup' && event.explosions) {
      event.explosions.forEach((explosion) => hideExplosionBoxes(hidden, explosion));
    }
    if (event.kind === 'bounceGroup') event.moves.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'merge') hideMergeBoxes(hidden, event);
    if (event.kind === 'explode') hideExplosionBoxes(hidden, event);
    if (event.kind === 'removeTile' && event.removeBoxIds) event.removeBoxIds.forEach((id) => hidden.add(id));
    if (event.kind === 'clearNumbers' && event.removeBoxIds) event.removeBoxIds.forEach((id) => hidden.add(id));
    if (event.kind === 'spawn') hidden.add(event.boxId);
    return hidden;
  }

  function hideExplosionBoxes(hidden, event) {
    if (event.removeBoxIds) event.removeBoxIds.forEach((id) => hidden.add(id));
    if (event.moves) event.moves.forEach((move) => hidden.add(move.boxId));
  }

  function hideMergeBoxes(hidden, event) {
    if (event.removeBoxIds) event.removeBoxIds.forEach((id) => hidden.add(id));
    if (!event.targetBoxId) hidden.add(event.boxId);
  }

  function drawBoxAtIndex(ctx, geom, index, value, scale, options = {}) {
    const cell = geom.cells[index];
    if (!cell) return;
    drawBoxAtPoint(ctx, cell, geom.radius, value, scale, geom.lattice, options);
  }

  function drawBoxAtPoint(ctx, point, radius, value, scale, lattice = LATTICES.square, options = {}) {
    const style = refs.boxStyle ? refs.boxStyle.value : 'paper';
    if (options.highlight) drawBoxHighlight(ctx, point, radius, scale, lattice);
    if (style === 'ink') drawInkBox(ctx, point, radius, value, scale, lattice);
    else if (style === 'color') drawColorBox(ctx, point, radius, value, scale, lattice);
    else drawPaperBox(ctx, point, radius, value, scale, lattice);
  }

  function drawBoxHighlight(ctx, point, radius, scale = 1, lattice = LATTICES.square) {
    const side = radius * 1.42 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(255,229,112,0.72)';
    ctx.strokeStyle = 'rgba(196,127,23,0.46)';
    ctx.lineWidth = Math.max(1.2, radius * 0.04);
    boxPath(ctx, point, side, lattice);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawExplosionEvent(ctx, geom, event, progress) {
    if (event.moves && event.moves.length) drawExplosionImpact(ctx, geom, event, progress);
    const flashProgress = event.moves && event.moves.length
      ? Math.max(0, (progress - 0.42) / 0.58)
      : progress;
    drawExplosionFlash(ctx, geom, event.center, flashProgress, event.value);
  }

  function drawGluedMove(ctx, geom, move, progress) {
    const from = geom.cells[move.from];
    const to = geom.cells[move.to];
    if (!from || !to || !move.edge) return;
    const outgoing = dirVector(move.edge.dir, geom.size, geom.lattice);
    const incoming = dirVector(move.dir, geom.size, geom.lattice);
    const exitPoint = {
      x: from.x + outgoing.x * progress,
      y: from.y + outgoing.y * progress
    };
    const entryPoint = {
      x: to.x - incoming.x * (1 - progress),
      y: to.y - incoming.y * (1 - progress)
    };
    drawBoxClippedToTile(ctx, geom, move.from, exitPoint, move.value);
    drawBoxClippedToTile(ctx, geom, move.to, entryPoint, move.value);
    drawGlueFlash(ctx, geom, move, progress);
  }

  function drawBounceMove(ctx, geom, move, progress) {
    const from = geom.cells[move.from];
    const to = geom.cells[move.to];
    if (!from || !to) return;
    const impact = Math.sin(progress * Math.PI) * 0.46;
    if (move.glued && move.edge) {
      const outgoing = dirVector(move.edge.dir, geom.size, geom.lattice);
      const point = {
        x: from.x + outgoing.x * impact,
        y: from.y + outgoing.y * impact
      };
      drawBoxClippedToTile(ctx, geom, move.from, point, move.value);
      drawGlueFlash(ctx, geom, move, progress);
      return;
    }
    drawBoxAtPoint(ctx, lerpPoint(from, to, impact), geom.radius, move.value, 1, geom.lattice);
  }

  function drawExplosionImpact(ctx, geom, event, progress) {
    const travel = Math.min(1, progress / 0.5);
    const squeeze = progress <= 0.42 ? 0 : Math.sin(Math.min(1, (progress - 0.42) / 0.34) * Math.PI);
    const fade = progress <= 0.78 ? 1 : Math.max(0, 1 - ((progress - 0.78) / 0.22));
    event.moves.forEach((move) => drawExplosionMove(ctx, geom, move, travel, squeeze, fade));
  }

  function drawExplosionMove(ctx, geom, move, travel, squeeze, alpha) {
    const from = geom.cells[move.from];
    const to = geom.cells[move.to];
    if (!from || !to) return;
    if (move.glued && move.edge && travel < 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawGluedMove(ctx, geom, move, travel);
      ctx.restore();
      return;
    }
    const point = move.glued ? to : lerpPoint(from, to, travel);
    drawSqueezedBoxAtPoint(ctx, point, geom.radius, move.value, squeeze, move.dir, geom.lattice, alpha);
  }

  function drawSqueezedBoxAtPoint(ctx, point, radius, value, squeeze, dir, lattice = LATTICES.square, alpha = 1) {
    const angle = (lattice.angles && lattice.angles[modulo(dir, lattice.sides)]) || 0;
    const compression = 1 - squeeze * 0.48;
    const expansion = 1 + squeeze * 0.16;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.scale(compression, expansion);
    ctx.rotate(-angle);
    drawBoxAtPoint(ctx, { x: 0, y: 0 }, radius, value, 1, lattice);
    ctx.restore();
  }

  function drawBoxClippedToTile(ctx, geom, index, point, value) {
    const cell = geom.cells[index];
    if (!cell) return;
    ctx.save();
    clipToTile(ctx, geom, cell, geom.radius * 0.96);
    drawBoxAtPoint(ctx, point, geom.radius, value, 1, geom.lattice);
    ctx.restore();
  }

  function clipToTile(ctx, geom, cell, radius) {
    const points = tilePoints(cell.x, cell.y, radius, geom.lattice);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
  }

  function drawPaperBox(ctx, point, radius, value, scale = 1, lattice = LATTICES.square) {
    const side = radius * 1.24 * scale;
    ctx.save();
    ctx.fillStyle = '#efe4cb';
    ctx.strokeStyle = '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.04);
    ctx.shadowColor = 'rgba(45,34,22,0.18)';
    ctx.shadowBlur = radius * 0.1;
    ctx.shadowOffsetY = radius * 0.05;
    boxPath(ctx, point, side, lattice);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    drawBoxText(ctx, point, radius, value, '#2f2118', scale, side * 0.82);
    ctx.restore();
  }

  function drawInkBox(ctx, point, radius, value, scale = 1, lattice = LATTICES.square) {
    const side = radius * 1.18 * scale;
    ctx.save();
    ctx.fillStyle = 'rgba(255,253,248,0.88)';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.8, radius * 0.06);
    boxPath(ctx, point, side, lattice);
    ctx.fill();
    ctx.stroke();
    drawBoxText(ctx, point, radius, value, '#111111', scale, side * 0.82);
    ctx.restore();
  }

  function drawColorBox(ctx, point, radius, value, scale = 1, lattice = LATTICES.square) {
    const side = radius * 1.26 * scale;
    ctx.save();
    ctx.fillStyle = valueColor(value);
    ctx.strokeStyle = value <= 2 ? '#8b6f3e' : '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.045);
    boxPath(ctx, point, side, lattice);
    ctx.fill();
    ctx.stroke();
    drawBoxText(ctx, point, radius, value, value >= 8 ? '#fffdf8' : '#2f2118', scale, side * 0.82);
    ctx.restore();
  }

  function boxPath(ctx, point, side, lattice) {
    if (lattice && lattice.shape === 'hex') {
      const radius = side / Math.sqrt(3);
      const points = hexPoints(point.x, point.y, radius, lattice);
      ctx.beginPath();
      points.forEach((corner, index) => {
        if (index === 0) ctx.moveTo(corner.x, corner.y);
        else ctx.lineTo(corner.x, corner.y);
      });
      ctx.closePath();
      return;
    }
    const x = point.x - side / 2;
    const y = point.y - side / 2;
    ctx.beginPath();
    ctx.rect(x, y, side, side);
  }

  function drawBoxText(ctx, point, radius, value, color, scale = 1, maxWidth = radius * 1.02 * scale) {
    const text = String(value);
    const maxFontSize = Math.max(12, Math.round(radius * 0.72 * Math.min(1, scale)));
    const minFontSize = Math.max(7, Math.round(radius * 0.26));
    const fontSize = fittedBoxTextSize(ctx, text, maxFontSize, minFontSize, maxWidth);
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, point.x, point.y + radius * 0.02, maxWidth);
  }

  function fittedBoxTextSize(ctx, text, maxFontSize, minFontSize, maxWidth) {
    for (let fontSize = maxFontSize; fontSize > minFontSize; fontSize -= 1) {
      ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      const measured = measureTextWidth(ctx, text, fontSize);
      if (measured <= maxWidth) return fontSize;
    }
    return minFontSize;
  }

  function measureTextWidth(ctx, text, fontSize) {
    if (ctx.measureText) {
      const metrics = ctx.measureText(text);
      if (metrics && Number.isFinite(metrics.width)) return metrics.width;
    }
    return text.length * fontSize * 0.62;
  }

  function drawGlueFlash(ctx, geom, event, progress) {
    if (!event.edge) return;
    const alpha = Math.sin(progress * Math.PI);
    if (alpha <= 0) return;
    const segment = edgeSegmentFromIndex(geom, event.edge.index, event.edge.dir);
    if (!segment) return;
    const color = event.edge.color || '#1f7a8c';
    ctx.save();
    ctx.globalAlpha = 0.28 + alpha * 0.52;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, geom.radius * 0.13);
    ctx.lineCap = 'round';
    drawBackgroundBoundarySegment(ctx, segment);
    ctx.restore();
  }

  function drawExplosionFlash(ctx, geom, index, progress, value) {
    const cell = geom.cells[index];
    if (!cell) return;
    const radius = geom.radius * (0.42 + progress * 1.15);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.64 * (1 - progress));
    ctx.fillStyle = value > 64 ? '#b23a48' : '#c47f17';
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRemovalFlash(ctx, geom, index, progress) {
    const cell = geom.cells[index];
    if (!cell) return;
    const radius = geom.radius * 0.9;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.45 * (1 - progress));
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(2, geom.radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(cell.x - radius * progress, cell.y - radius);
    ctx.lineTo(cell.x + radius, cell.y + radius * progress);
    ctx.moveTo(cell.x + radius * progress, cell.y - radius);
    ctx.lineTo(cell.x - radius, cell.y + radius * progress);
    ctx.stroke();
    ctx.restore();
  }

  function drawGameOverPopup(ctx, geom, state) {
    const width = Math.min(geom.width - 36, Math.max(190, geom.width * 0.5));
    const height = Math.min(130, Math.max(92, geom.height * 0.36));
    const x = (geom.width - width) / 2;
    const y = (geom.height - height) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(17,17,17,0.16)';
    ctx.fillRect(0, 0, geom.width, geom.height);
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.4, geom.radius * 0.045);
    roundedRectPath(ctx, x, y, width, height, Math.min(8, height * 0.08));
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#111111';
    ctx.font = `700 ${Math.max(20, Math.round(geom.radius * 0.72))}px "JetBrains Mono", monospace`;
    const title = isGomokuGame(state)
      ? (state.winner ? `${gomokuColorLabel(state.winner)} wins` : 'Gomoku draw')
      : (isConnectFourGame(state)
        ? (state.winner ? `${connectFourColorLabel(state.winner)} wins` : 'Connect Four draw')
        : (state.ending === 'bonus' ? 'bonus ending' : 'game over'));
    ctx.fillText(title, geom.width / 2, y + height * 0.36);
    ctx.fillStyle = '#6c6257';
    ctx.font = `${Math.max(12, Math.round(geom.radius * 0.34))}px "JetBrains Mono", monospace`;
    const detail = isGomokuGame(state)
      ? `${state.round || 0} move${state.round === 1 ? '' : 's'}`
      : (isConnectFourGame(state)
        ? `${state.round || 0} drop${state.round === 1 ? '' : 's'}`
        : `score ${state.score || 0}   highest ${highestValue(state)}`);
    ctx.fillText(detail, geom.width / 2, y + height * 0.66);
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

  function createGameState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), options);
    return {
      gameMode: GAME_MODES.NUMBER_2048,
      preset,
      phase: 'setup',
      removed: initialRemovedSet(preset),
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      score: 0,
      round: 0,
      ending: ''
    };
  }

  function beginGame(presetOrId, options = {}) {
    const state = createGameState(presetOrId, { glueRng: options.glueRng });
    const rng = options.rng || Math.random;
    spawnNumbers(state, 2, rng, spawnInitialValue, []);
    state.phase = 'ready';
    return state;
  }

  function createGomokuState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), options);
    return {
      gameMode: GAME_MODES.GOMOKU,
      preset,
      phase: 'setup',
      removed: initialRemovedSet(preset),
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      score: 0,
      stones: [],
      nextStoneId: 1,
      turn: 'black',
      winner: '',
      winningLine: [],
      resultDismissed: false,
      round: 0,
      ending: ''
    };
  }

  function beginGomokuGame(presetOrId, options = {}) {
    const state = createGomokuState(presetOrId, { glueRng: options.glueRng });
    state.phase = 'ready';
    return state;
  }

  function createConnectFourState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), options);
    const fallDir = Number.isInteger(options.fallDir)
      ? modulo(options.fallDir, latticeForPreset(preset).sides)
      : selectedConnectFourFallDir(preset);
    const removed = initialRemovedSet(preset);
    const holes = normalizeConnectFourHoleSet(options.holes, preset, removed);
    const cycleHoles = normalizeConnectFourHoleSet(options.cycleHoles, preset, removed);
    return {
      gameMode: GAME_MODES.CONNECT_FOUR,
      preset,
      phase: 'setup',
      removed,
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      score: 0,
      tokens: [],
      nextTokenId: 1,
      holes,
      cycleHoles: new Set(Array.from(cycleHoles).filter((index) => holes.has(index))),
      turn: 'red',
      fallDir,
      winner: '',
      winningLine: [],
      resultDismissed: false,
      round: 0,
      ending: '',
      dropWarning: ''
    };
  }

  function beginConnectFourGame(presetOrId, options = {}) {
    const state = createConnectFourState(presetOrId, {
      glueRng: options.glueRng,
      fallDir: Number.isInteger(options.fallDir)
        ? options.fallDir
        : selectedConnectFourFallDir(resolvePreset(presetOrId)),
      holes: options.holes,
      cycleHoles: options.cycleHoles
    });
    state.phase = 'ready';
    return state;
  }

  function placeGomokuStone(sourceState, index) {
    if (!isGomokuGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Gomoku game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const target = Number(index);
    if (!Number.isInteger(target) || target < 0 || target >= sourceState.preset.rows * sourceState.preset.cols) {
      return { changed: false, state: sourceState, message: 'tile is outside the board' };
    }
    if (sourceState.removed.has(target)) {
      return { changed: false, state: sourceState, message: 'tile is removed' };
    }
    if (gomokuStoneAt(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'tile already has a stone' };
    }

    const state = cloneGameState(sourceState);
    const color = GOMOKU_COLORS.includes(state.turn) ? state.turn : 'black';
    const stone = { id: state.nextStoneId, index: target, color };
    state.nextStoneId += 1;
    state.stones.push(stone);
    state.round += 1;
    state.winner = '';
    state.winningLine = [];
    state.resultDismissed = false;
    state.ending = '';

    const win = findGomokuWin(state, target, color);
    if (win) {
      state.phase = 'gameover';
      state.winner = color;
      state.winningLine = win.line;
      state.ending = 'gomoku-win';
    } else if (!emptyGomokuIndices(state).length) {
      state.phase = 'gameover';
      state.ending = 'draw';
    } else {
      state.phase = 'ready';
      state.turn = oppositeGomokuColor(color);
    }

    return {
      changed: true,
      state,
      stone: { ...stone },
      win
    };
  }

  function findGomokuWin(state, index, color) {
    if (!isGomokuGame(state)) return null;
    const targetColor = color || (gomokuStoneAt(state, index) || {}).color;
    if (!targetColor) return null;
    const lattice = latticeForPreset(state.preset);
    const axisCount = Math.floor(lattice.sides / 2);
    for (let axis = 0; axis < axisCount; axis += 1) {
      const backward = gomokuLineSteps(state, index, oppositeDir(state.preset, axis), targetColor);
      const forward = gomokuLineSteps(state, index, axis, targetColor);
      const line = backward.slice().reverse().concat([index], forward);
      if (line.length >= GOMOKU_WIN_LENGTH) {
        return {
          color: targetColor,
          axis,
          line: line.slice(0, GOMOKU_WIN_LENGTH)
        };
      }
    }
    const diagonalAxes = gomokuDiagonalAxes(state.preset);
    for (const axis of diagonalAxes) {
      const backwardPaths = gomokuDiagonalLinePaths(state, index, axis.backward, targetColor);
      const forwardPaths = gomokuDiagonalLinePaths(state, index, axis.forward, targetColor);
      for (const backward of backwardPaths) {
        for (const forward of forwardPaths) {
          const line = backward.slice().reverse().concat([index], forward);
          if (line.length >= GOMOKU_WIN_LENGTH) {
            return {
              color: targetColor,
              axis: axis.name,
              diagonal: true,
              line: line.slice(0, GOMOKU_WIN_LENGTH)
            };
          }
        }
      }
    }
    return null;
  }

  function gomokuLineSteps(state, startIndex, dir, color) {
    const indices = [];
    let index = startIndex;
    let direction = dir;
    for (let step = 1; step < GOMOKU_WIN_LENGTH; step += 1) {
      const next = surfaceSuccessor(state, index, direction);
      if (!next) break;
      const stone = gomokuStoneAt(state, next.index);
      if (!stone || stone.color !== color) break;
      indices.push(next.index);
      index = next.index;
      direction = next.dir;
    }
    return indices;
  }

  function gomokuDiagonalAxes(preset) {
    if (latticeForPreset(preset).shape !== 'square') return [];
    return [
      {
        name: 'NE-SW',
        forward: [[DIRS.N, DIRS.E], [DIRS.E, DIRS.N]],
        backward: [[DIRS.S, DIRS.W], [DIRS.W, DIRS.S]]
      },
      {
        name: 'SE-NW',
        forward: [[DIRS.S, DIRS.E], [DIRS.E, DIRS.S]],
        backward: [[DIRS.N, DIRS.W], [DIRS.W, DIRS.N]]
      }
    ];
  }

  function gomokuDiagonalLinePaths(state, startIndex, orders, color) {
    const paths = [[]];
    const search = (index, path, currentOrders) => {
      if (path.length >= GOMOKU_WIN_LENGTH - 1) return;
      const candidates = gomokuDiagonalStepCandidates(state, index, currentOrders);
      candidates.forEach((candidate) => {
        const stone = gomokuStoneAt(state, candidate.index);
        if (!stone || stone.color !== color) return;
        const nextPath = path.concat(candidate.index);
        paths.push(nextPath);
        search(candidate.index, nextPath, candidate.orders);
      });
    };
    search(startIndex, [], normalizeDiagonalOrders(orders));
    return paths.sort((a, b) => b.length - a.length);
  }

  function gomokuDiagonalStepCandidates(state, index, orders) {
    const candidates = [];
    const seen = new Set();
    orders.forEach((order) => {
      const candidate = diagonalStepCandidate(state, index, order);
      if (!candidate) return;
      const key = `${candidate.index}:${diagonalOrdersKey(candidate.orders)}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push(candidate);
    });
    return candidates;
  }

  function diagonalStepCandidate(state, startIndex, order) {
    let index = startIndex;
    let directions = order.slice(0, 2);
    if (directions.length !== 2 || !directions.every(Number.isInteger)) return null;
    for (let step = 0; step < 2; step += 1) {
      const outDir = directions[step];
      const next = surfaceSuccessor(state, index, outDir);
      if (!next) return null;
      directions = transportedDirectionsAfterStep(state, directions, step, outDir, next);
      index = next.index;
    }
    return {
      index,
      orders: normalizeDiagonalOrders([directions, [directions[1], directions[0]]])
    };
  }

  function transportedDirectionsAfterStep(state, directions, step, outDir, transition) {
    return directions.map((dir, index) => (
      index === step
        ? transition.dir
        : transportDirectionAcrossTransition(state, outDir, dir, transition)
    ));
  }

  function transportDirectionAcrossTransition(state, outDir, dir, transition) {
    if (!transition || transition.kind !== 'glued' || !transition.edge) return dir;
    const preset = state && state.preset;
    const lattice = latticeForPreset(preset);
    if (lattice.shape !== 'square') return dir;
    const oldNormal = modulo(outDir, lattice.sides);
    const newNormal = modulo(transition.dir, lattice.sides);
    const offset = modulo(dir - oldNormal, lattice.sides);
    if (offset === 0) return newNormal;
    if (offset === 2) return oppositeDir(preset, newNormal);
    const tangentSign = transition.edge.reversed ? -1 : 1;
    if (offset === 1) return modulo(newNormal + tangentSign, lattice.sides);
    if (offset === 3) return modulo(newNormal - tangentSign, lattice.sides);
    return dir;
  }

  function normalizeDiagonalOrders(orders) {
    const result = [];
    const seen = new Set();
    orders.forEach((order) => {
      if (!Array.isArray(order) || order.length !== 2 || !order.every(Number.isInteger)) return;
      const normalized = order.slice(0, 2);
      const key = normalized.join(',');
      if (seen.has(key)) return;
      seen.add(key);
      result.push(normalized);
    });
    return result;
  }

  function diagonalOrdersKey(orders) {
    return normalizeDiagonalOrders(orders)
      .map((order) => order.join(','))
      .sort()
      .join('|');
  }

  function gomokuStoneAt(state, index) {
    if (!state || !Array.isArray(state.stones)) return null;
    return state.stones.find((stone) => stone.index === index) || null;
  }

  function placeConnectFourToken(sourceState, index) {
    if (!isConnectFourGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Connect Four game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const target = Number(index);
    if (!Number.isInteger(target) || target < 0 || target >= sourceState.preset.rows * sourceState.preset.cols) {
      return { changed: false, state: sourceState, message: 'tile is outside the board' };
    }
    if (sourceState.removed.has(target)) {
      return { changed: false, state: sourceState, message: 'tile is removed' };
    }
    if (connectFourTokenAt(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'entry tile already has a token' };
    }
    const drop = connectFourDropTarget(sourceState, target, sourceState.fallDir);
    if (drop.cycle) {
      return {
        changed: false,
        state: sourceState,
        cycle: true,
        cycleHoles: connectFourCyclingHoleIndices(sourceState),
        drop,
        message: 'drop route cycles before stopping'
      };
    }

    const state = cloneGameState(sourceState);
    const color = CONNECT_FOUR_COLORS.includes(state.turn) ? state.turn : 'red';
    const token = { id: state.nextTokenId, index: drop.index, color };
    state.nextTokenId += 1;
    state.tokens.push(token);
    state.round += 1;
    state.winner = '';
    state.winningLine = [];
    state.resultDismissed = false;
    state.ending = '';
    state.dropWarning = '';
    state.cycleHoles = new Set();

    const win = findConnectFourWin(state, token.index, color);
    if (win) {
      state.phase = 'gameover';
      state.winner = color;
      state.winningLine = win.line;
      state.ending = 'connect-four-win';
    } else if (!connectFourOpenHoleIndices(state).length) {
      state.phase = 'gameover';
      state.ending = 'draw';
    } else {
      state.phase = 'ready';
      state.turn = oppositeConnectFourColor(color);
    }

    return {
      changed: true,
      state,
      token: { ...token },
      drop,
      win
    };
  }

  function connectFourDropTarget(state, startIndex, fallDir) {
    const seen = new Set();
    const path = [];
    const transitions = [];
    let index = startIndex;
    let direction = Number.isInteger(fallDir) ? fallDir : defaultConnectFourFallDir(state.preset);
    const guardLimit = Math.max(1, state.preset.rows * state.preset.cols * directionsForPreset(state.preset).length + 1);
    for (let guard = 0; guard < guardLimit; guard += 1) {
      const key = `${index}:${direction}`;
      if (seen.has(key)) {
        return { cycle: true, index, dir: direction, path, transitions };
      }
      seen.add(key);
      path.push(index);
      const next = surfaceSuccessor(state, index, direction);
      if (!next) return { cycle: false, index, dir: direction, path, transitions };
      if (connectFourTokenAt(state, next.index)) {
        return { cycle: false, index, dir: direction, path, transitions, blockedBy: next.index };
      }
      transitions.push(placementTransitionRecord(index, direction, next));
      index = next.index;
      direction = next.dir;
    }
    return { cycle: true, index, dir: direction, path, transitions };
  }

  function findConnectFourWin(state, index, color) {
    if (!isConnectFourGame(state)) return null;
    const targetColor = color || (connectFourTokenAt(state, index) || {}).color;
    if (!targetColor) return null;
    const lattice = latticeForPreset(state.preset);
    const axisCount = Math.floor(lattice.sides / 2);
    for (let axis = 0; axis < axisCount; axis += 1) {
      const backward = connectFourLineSteps(state, index, oppositeDir(state.preset, axis), targetColor);
      const forward = connectFourLineSteps(state, index, axis, targetColor);
      const line = backward.slice().reverse().concat([index], forward);
      if (line.length >= CONNECT_FOUR_WIN_LENGTH) {
        return {
          color: targetColor,
          axis,
          line: line.slice(0, CONNECT_FOUR_WIN_LENGTH)
        };
      }
    }
    const diagonalAxes = gomokuDiagonalAxes(state.preset);
    for (const axis of diagonalAxes) {
      const backwardPaths = connectFourDiagonalLinePaths(state, index, axis.backward, targetColor);
      const forwardPaths = connectFourDiagonalLinePaths(state, index, axis.forward, targetColor);
      for (const backward of backwardPaths) {
        for (const forward of forwardPaths) {
          const line = backward.slice().reverse().concat([index], forward);
          if (line.length >= CONNECT_FOUR_WIN_LENGTH) {
            return {
              color: targetColor,
              axis: axis.name,
              diagonal: true,
              line: line.slice(0, CONNECT_FOUR_WIN_LENGTH)
            };
          }
        }
      }
    }
    return null;
  }

  function connectFourLineSteps(state, startIndex, dir, color) {
    const indices = [];
    let index = startIndex;
    let direction = dir;
    for (let step = 1; step < CONNECT_FOUR_WIN_LENGTH; step += 1) {
      const next = surfaceSuccessor(state, index, direction);
      if (!next) break;
      const token = connectFourTokenAt(state, next.index);
      if (!token || token.color !== color) break;
      indices.push(next.index);
      index = next.index;
      direction = next.dir;
    }
    return indices;
  }

  function connectFourDiagonalLinePaths(state, startIndex, orders, color) {
    const paths = [[]];
    const search = (index, path, currentOrders) => {
      if (path.length >= CONNECT_FOUR_WIN_LENGTH - 1) return;
      const candidates = gomokuDiagonalStepCandidates(state, index, currentOrders);
      candidates.forEach((candidate) => {
        const token = connectFourTokenAt(state, candidate.index);
        if (!token || token.color !== color) return;
        const nextPath = path.concat(candidate.index);
        paths.push(nextPath);
        search(candidate.index, nextPath, candidate.orders);
      });
    };
    search(startIndex, [], normalizeDiagonalOrders(orders));
    return paths.sort((a, b) => b.length - a.length);
  }

  function connectFourTokenAt(state, index) {
    if (!state || !Array.isArray(state.tokens)) return null;
    return state.tokens.find((token) => token.index === index) || null;
  }

  function connectFourHasHole(state, index) {
    return !!(state && state.holes && state.holes.has(index));
  }

  function connectFourOpenHoleIndices(state) {
    const occupied = new Set((state.tokens || []).map((token) => token.index));
    return Array.from(state.holes || [])
      .filter((index) => !state.removed.has(index) && !occupied.has(index))
      .sort((a, b) => a - b);
  }

  function connectFourCyclingHoleIndices(state) {
    return connectFourOpenHoleIndices(state)
      .filter((index) => connectFourDropTarget(state, index, state.fallDir).cycle);
  }

  function setConnectFourCycleHoles(indices) {
    if (!isConnectFourGame(game)) return;
    const valid = normalizeConnectFourHoleSet(indices || [], game.preset, game.removed);
    game.cycleHoles = new Set(Array.from(valid).filter((index) => connectFourHasHole(game, index)));
  }

  function clearConnectFourCycleHoles() {
    if (isConnectFourGame(game)) game.cycleHoles = new Set();
  }

  function emptyConnectFourIndices(state) {
    const occupied = new Set((state.tokens || []).map((token) => token.index));
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!state.removed.has(index) && !occupied.has(index)) empty.push(index);
    }
    return empty;
  }

  function oppositeConnectFourColor(color) {
    return color === 'red' ? 'yellow' : 'red';
  }

  function connectFourColorLabel(color) {
    return color === 'yellow' ? 'yellow' : 'red';
  }

  function connectFourTurnInfo(state) {
    const dir = dirLabel(state.fallDir, state.preset);
    return `${connectFourColorLabel(state.turn)} to drop; falling ${dir}`;
  }

  function connectFourHoleInfo(state) {
    const count = state && state.holes ? state.holes.size : 0;
    return `${count} input hole${count === 1 ? '' : 's'}`;
  }

  function connectFourTokenCounts(state) {
    return (state.tokens || []).reduce((counts, token) => {
      if (token.color === 'yellow') counts.yellow += 1;
      else counts.red += 1;
      return counts;
    }, { red: 0, yellow: 0 });
  }

  function emptyGomokuIndices(state) {
    const occupied = new Set((state.stones || []).map((stone) => stone.index));
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!state.removed.has(index) && !occupied.has(index)) empty.push(index);
    }
    return empty;
  }

  function oppositeGomokuColor(color) {
    return color === 'black' ? 'white' : 'black';
  }

  function gomokuColorLabel(color) {
    return color === 'white' ? 'white' : 'black';
  }

  function gomokuTurnInfo(state) {
    return `${gomokuColorLabel(state.turn)} to move`;
  }

  function gomokuStoneCounts(state) {
    return (state.stones || []).reduce((counts, stone) => {
      if (stone.color === 'white') counts.white += 1;
      else counts.black += 1;
      return counts;
    }, { black: 0, white: 0 });
  }

  function simulateRound(sourceState, dir, options = {}) {
    const rng = options.rng || Math.random;
    const shouldSpawn = options.spawn !== false;
    const state = cloneGameState(sourceState);
    state.newBoxIds = new Set();
    const events = [];
    const debugMessages = [];
    const mergeLocked = new Set();
    const stackedBoxIds = stackedBoxIdSet(state);
    const explosionBlastRadius = explosionModeDirections(sourceState).length ? 2 : 0;
    const explosionEventOptions = (extra = {}) => (
      explosionBlastRadius > 0 ? { ...extra, blastRadius: explosionBlastRadius } : extra
    );
    const active = new Map(state.boxes
      .filter((box) => !stackedBoxIds.has(box.id))
      .map((box) => [box.id, {
        id: box.id,
        index: box.index,
        value: box.value,
        dir,
        k: 0
      }]));
    let changed = false;
    let guard = 0;

    while (active.size) {
      guard += 1;
      if (guard > EVENT_GUARD) {
        active.forEach((actor) => {
          addExplosionEvents(state, events, actor.index, actor.value, [actor.id], [], explosionEventOptions());
          active.delete(actor.id);
          changed = true;
        });
        break;
      }
      let readyActors = Array.from(active.values()).filter((actor) => !actor.waiting);
      if (!readyActors.length) {
        active.forEach((actor) => {
          actor.waiting = false;
        });
        readyActors = Array.from(active.values());
      }
      const batch = readyActors;
      const proposals = [];
      batch.forEach((actor) => {
        const transition = surfaceSuccessor(state, actor.index, actor.dir);
        if (!transition) {
          active.delete(actor.id);
          return;
        }
        if (transition.kind === 'glued' && actor.k >= MAX_COMPLETED_GLUINGS) {
          addExplosionEvents(state, events, actor.index, actor.value, [actor.id], [], explosionEventOptions());
          active.delete(actor.id);
          changed = true;
          return;
        }
        proposals.push({ actor, transition, target: transition.index });
      });
      if (!proposals.length) continue;

      const results = resolveBatch(state, proposals, active, mergeLocked, debugMessages);
      const moves = [];
      const bounces = [];
      const mergeEvents = [];
      const pushMerges = [];
      const explosions = [];
      const explodedBoxIds = new Set();
      results.forEach((result) => {
        const actor = result.actor;
        if (result.kind === 'stop') {
          active.delete(actor.id);
          return;
        }
        if (result.kind === 'wait') {
          actor.waiting = true;
          return;
        }
        if (result.kind === 'debug') {
          debugMessages.push(result.message);
          events.push({ kind: 'debug', message: result.message });
          active.delete(actor.id);
          return;
        }
        if (result.kind === 'move') {
          moves.push(result);
          changed = true;
          return;
        }
        if (result.kind === 'bounce') {
          bounces.push(...result.moves);
          result.actors.forEach((bounceActor) => active.delete(bounceActor.id));
          result.moves.forEach((move) => {
            const moveBoxId = move.boxId || (move.actor && move.actor.id);
            if (moveBoxId) active.delete(moveBoxId);
          });
          return;
        }
        if (result.kind === 'push') {
          moves.push(...result.moves);
          changed = true;
          return;
        }
        if (result.kind === 'pushMerge') {
          moves.push(...result.moves);
          pushMerges.push(result.merge);
          changed = true;
          return;
        }
        if (result.kind === 'merge') {
          addMergeEvent(state, mergeEvents, result, mergeLocked, active);
          changed = true;
          return;
        }
        if (result.kind === 'explode') {
          explosions.push(result);
          result.removeBoxIds.forEach((id) => {
            active.delete(id);
            explodedBoxIds.add(id);
          });
          changed = true;
        }
      });
      const moveEvents = [];
      const bouncingBoxIds = new Set(bounces.map((result) => result.boxId || (result.actor && result.actor.id)));
      const bounceEvents = bounces.map(animationMoveFromResult);
      const explosionAnimations = explosions
        .filter((explosion) => explosion.moves && explosion.moves.length)
        .map((explosion) => explosionAnimationEvent(
          explosion.center,
          explosion.value,
          explosion.removeBoxIds,
          explosion.moves
        ));
      const moveEntries = moves.map((result) => {
        const boxId = result.boxId || (result.actor && result.actor.id);
        if (explodedBoxIds.has(boxId)) return { result, boxId, skipped: true };
        const box = findBox(state, boxId);
        if (!box || state.removed.has(result.transition.index)) {
          return { result, boxId, box, skipped: true, deleteActor: !!result.actor };
        }
        const from = Number.isInteger(result.from)
          ? result.from
          : (result.actor ? result.actor.index : box.index);
        const value = Number.isFinite(result.value)
          ? result.value
          : (result.actor ? result.actor.value : box.value);
        return { result, boxId, box, from, value, skipped: false };
      });
      const blockedMoveIds = blockedMovesByBouncingResidents(state, moveEntries, bouncingBoxIds);
      extendBlockedMovesByOccupiedTargets(
        state,
        moveEntries,
        blockedMoveIds,
        extraMovingAwayBoxIds(pushMerges, explosions)
      );
      moveEntries.forEach((entry) => {
        if (entry.skipped) {
          if (entry.deleteActor && entry.result.actor) active.delete(entry.result.actor.id);
          return;
        }
        const { result, boxId, box, from, value } = entry;
        if (blockedMoveIds.has(boxId)) {
          bounceEvents.push(animationMoveFromResult({
            ...result,
            boxId,
            value,
            from,
            transition: result.transition
          }));
          if (result.actor) active.delete(result.actor.id);
          const activeActor = active.get(boxId);
          if (activeActor) active.delete(boxId);
          return;
        }
        const event = {
          kind: 'move',
          boxId,
          value,
          from,
          to: result.transition.index,
          dir: result.transition.dir,
          glued: result.transition.kind === 'glued',
          edge: result.transition.edge || null
        };
        moveEvents.push(event);
        box.index = result.transition.index;
        const activeActor = active.get(boxId);
        if (activeActor) {
          activeActor.index = result.transition.index;
          activeActor.dir = result.transition.dir;
          activeActor.waiting = false;
          if (result.transition.kind === 'glued') activeActor.k += 1;
        }
      });
      const pushedMergeEvents = [];
      pushMerges.forEach((merge) => addPushedMergeEvent(state, pushedMergeEvents, merge, mergeLocked, active));
      const hasMergeAnimations = mergeEvents.length || pushedMergeEvents.length;
      const hasNonMergeGroupAnimation = moveEvents.length || bounceEvents.length || explosionAnimations.length;
      const shouldBundleTick = moveEvents.length
        || explosionAnimations.length
        || (hasMergeAnimations && hasNonMergeGroupAnimation);
      if (shouldBundleTick) {
        events.push({
          kind: 'moveGroup',
          moves: moveEvents,
          bounces: bounceEvents,
          merges: mergeEvents,
          postMerges: pushedMergeEvents,
          explosions: explosionAnimations
        });
      } else if (bounceEvents.length) {
        events.push({ kind: 'bounceGroup', moves: bounceEvents });
      } else if (mergeEvents.length || pushedMergeEvents.length) {
        events.push(...mergeEvents, ...pushedMergeEvents);
      }
      explosions.forEach((explosion) => {
        addExplosionEvents(state, events, explosion.center, explosion.value, explosion.removeBoxIds, explosion.moves, explosionEventOptions({
          animate: !(explosion.moves && explosion.moves.length),
        }));
      });
      if (moveEvents.length || pushMerges.length) {
        active.forEach((actor) => {
          actor.waiting = false;
        });
      }
    }

    changed = gameStateChanged(sourceState, state);
    if (changed && shouldSpawn) {
      spawnNumbers(state, 2, rng, spawnRoundValue, events);
    }
    return { changed, events, state, debugMessages };
  }

  function resolveBatch(state, proposals, active, mergeLocked, debugMessages) {
    const batchIds = new Set(proposals.map((proposal) => proposal.actor.id));
    const byActor = new Map(proposals.map((proposal) => [proposal.actor.id, proposal]));
    const willVacate = new Map(proposals.map((proposal) => [proposal.actor.id, true]));
    let stable = false;
    let passes = 0;
    while (!stable && passes < 12) {
      stable = true;
      passes += 1;
      const nextWillVacate = new Map(willVacate);
      const groups = groupByTarget(proposals);
      groups.forEach((group) => {
        const target = group[0].target;
        const resident = boxAt(state, target);
        const targetStacked = boxesAtIndex(state, target).length > 1;
        const residentProposal = resident ? byActor.get(resident.id) : null;
        const residentVacates = !targetStacked
          && !!(residentProposal && batchIds.has(resident.id) && willVacate.get(resident.id));
        const includeResident = !!(resident && !residentVacates);
        if (group.length > 1) {
          group.forEach((proposal) => nextWillVacate.set(proposal.actor.id, true));
          return;
        }
        const proposal = group[0];
        if (!includeResident) {
          nextWillVacate.set(proposal.actor.id, true);
          return;
        }
        const canMerge = resident.value === proposal.actor.value && !mergeLocked.has(resident.id);
        nextWillVacate.set(proposal.actor.id, canMerge);
      });
      nextWillVacate.forEach((value, key) => {
        if (willVacate.get(key) !== value) stable = false;
      });
      willVacate.clear();
      nextWillVacate.forEach((value, key) => willVacate.set(key, value));
    }

    const results = [];
    const swapCollisions = reciprocalSwapCollisions(proposals);
    const collisionActorIds = new Set();
    swapCollisions.forEach((pair) => {
      pair.forEach((proposal) => collisionActorIds.add(proposal.actor.id));
      results.push({
        kind: 'bounce',
        actor: pair[0].actor,
        actors: pair.map((proposal) => proposal.actor),
        moves: pair.map((proposal) => moveResultFromActor(proposal.actor, proposal.transition))
      });
    });
    const residentSwaps = residentSwapCollisions(state, proposals, byActor, collisionActorIds);
    residentSwaps.forEach((collision) => {
      collision.proposals.forEach((proposal) => collisionActorIds.add(proposal.actor.id));
      results.push({
        kind: 'bounce',
        actor: collision.proposals[0].actor,
        actors: collision.proposals.map((proposal) => proposal.actor),
        moves: collision.proposals.map((proposal) => moveResultFromActor(proposal.actor, proposal.transition))
      });
    });
    const groups = groupByTarget(proposals);
    groups.forEach((group) => {
      if (group.some((proposal) => collisionActorIds.has(proposal.actor.id))) return;
      const target = group[0].target;
      const resident = boxAt(state, target);
      const targetStacked = boxesAtIndex(state, target).length > 1;
      const residentProposal = resident ? byActor.get(resident.id) : null;
      const residentVacates = !targetStacked
        && !!(residentProposal && batchIds.has(resident.id) && willVacate.get(resident.id));
      const includeResident = !!(resident && !residentVacates);
      if (group.length > 1) {
        if (includeResident) {
          if (targetStacked) {
            results.push({
              kind: 'bounce',
              actor: group[0].actor,
              actors: group.map((proposal) => proposal.actor),
              moves: group.map((proposal) => moveResultFromActor(proposal.actor, proposal.transition))
            });
            return;
          }
          const mergeProposal = mergeLocked.has(resident.id)
            ? null
            : group.find((proposal) => proposal.actor.value === resident.value);
          if (mergeProposal) {
            results.push({
              kind: 'merge',
              actor: mergeProposal.actor,
              movingActors: [mergeProposal.actor],
              moves: [moveResultFromActor(mergeProposal.actor, mergeProposal.transition)],
              target,
              value: mergeProposal.actor.value,
              newValue: mergeProposal.actor.value * 2,
              targetBoxId: resident.id
            });
          }
          const bounceGroup = mergeProposal ? group.filter((proposal) => proposal !== mergeProposal) : group;
          if (bounceGroup.length) {
            results.push({
              kind: 'bounce',
              actor: bounceGroup[0].actor,
              actors: bounceGroup.map((proposal) => proposal.actor),
              moves: bounceGroup.map((proposal) => moveResultFromActor(proposal.actor, proposal.transition))
            });
          }
          return;
        }
        if (!includeResident && group.length === 2 && group[0].actor.value === group[1].actor.value) {
          results.push({
            kind: 'merge',
            actor: group[0].actor,
            movingActors: group.map((proposal) => proposal.actor),
            moves: group.map((proposal) => moveResultFromActor(proposal.actor, proposal.transition)),
            target,
            value: group[0].actor.value,
            newValue: group[0].actor.value * 2,
            targetBoxId: null
          });
          return;
        }
        const participants = group.map((proposal) => proposal.actor.value);
        if (includeResident) participants.push(resident.value);
        const removeBoxIds = group.map((proposal) => proposal.actor.id);
        if (includeResident) removeBoxIds.push(resident.id);
        group.forEach((proposal) => {
          results.push({
            kind: 'explode',
            actor: proposal.actor,
            center: target,
            value: Math.min(...participants),
            removeBoxIds,
            moves: group.map((item) => moveResultFromActor(item.actor, item.transition))
          });
        });
        return;
      }

      const proposal = group[0];
      if (includeResident) {
        if (targetStacked) {
          results.push({
            kind: 'bounce',
            actor: proposal.actor,
            actors: [proposal.actor],
            moves: [moveResultFromActor(proposal.actor, proposal.transition)]
          });
          return;
        }
        if (boxIsStillMoving(resident, byActor, willVacate, active)) {
          results.push({ kind: 'wait', actor: proposal.actor });
          return;
        }
        if (resident.value === proposal.actor.value && !mergeLocked.has(resident.id)) {
          results.push({
            kind: 'merge',
            actor: proposal.actor,
            movingActors: [proposal.actor],
            moves: [moveResultFromActor(proposal.actor, proposal.transition)],
            target,
            value: proposal.actor.value,
            newValue: proposal.actor.value * 2,
            targetBoxId: resident.id
          });
        } else {
          const push = detectPushChain(state, proposal, resident, proposal.transition.dir, {
            active,
            byActor,
            willVacate,
            mergeLocked,
            debugMessages
          });
          if (push.kind === 'push') {
            results.push({
              kind: 'push',
              actor: proposal.actor,
              moves: [moveResultFromActor(proposal.actor, proposal.transition)].concat(push.moves)
            });
          } else if (push.kind === 'pushMerge') {
            results.push({
              kind: 'pushMerge',
              actor: proposal.actor,
              moves: [moveResultFromActor(proposal.actor, proposal.transition)].concat(push.moves),
              merge: push.merge
            });
          } else if (push.kind === 'explode') {
            results.push({
              kind: 'explode',
              actor: proposal.actor,
              center: push.center,
              value: push.value,
              removeBoxIds: push.removeBoxIds
            });
          } else if (push.kind === 'wait') {
            results.push({ kind: 'wait', actor: proposal.actor });
          } else if (push.kind === 'debug') {
            results.push({ kind: 'debug', actor: proposal.actor, message: push.message });
          } else {
            results.push({ kind: 'stop', actor: proposal.actor });
          }
        }
        return;
      }
      if (!willVacate.get(proposal.actor.id)) {
        results.push({ kind: 'stop', actor: proposal.actor });
        return;
      }
      results.push({ kind: 'move', actor: proposal.actor, transition: proposal.transition });
    });

    const seenExplosions = new Set();
    return results.filter((result) => {
      if (result.kind !== 'explode') return true;
      const key = `${result.center}:${result.value}:${result.removeBoxIds.slice().sort((a, b) => a - b).join(',')}`;
      if (seenExplosions.has(key)) return false;
      seenExplosions.add(key);
      return true;
    });
  }

  function reciprocalSwapCollisions(proposals) {
    const byActorStart = new Map();
    const targetCounts = new Map();
    proposals.forEach((proposal) => {
      byActorStart.set(proposal.actor.index, proposal);
      targetCounts.set(proposal.target, (targetCounts.get(proposal.target) || 0) + 1);
    });
    const collisions = [];
    const seenActors = new Set();
    proposals.forEach((proposal) => {
      if (seenActors.has(proposal.actor.id)) return;
      if (targetCounts.get(proposal.target) !== 1) return;
      const other = byActorStart.get(proposal.target);
      if (!other || other.actor.id === proposal.actor.id) return;
      if (targetCounts.get(other.target) !== 1) return;
      if (other.target !== proposal.actor.index) return;
      seenActors.add(proposal.actor.id);
      seenActors.add(other.actor.id);
      collisions.push([proposal, other]);
    });
    return collisions;
  }

  function moveTargetsBouncingResident(state, result, boxId, bouncingBoxIds) {
    if (!bouncingBoxIds.size) return false;
    return boxesAtIndex(state, result.transition.index).some((resident) => (
      resident.id !== boxId && bouncingBoxIds.has(resident.id)
    ));
  }

  function extraMovingAwayBoxIds(pushMerges, explosions) {
    const ids = new Set(pushMerges.map((merge) => merge.movingBoxId));
    explosions.forEach((explosion) => {
      (explosion.moves || []).forEach((move) => {
        const boxId = move.boxId || (move.actor && move.actor.id);
        if (boxId != null) ids.add(boxId);
      });
    });
    return ids;
  }

  function blockedMovesByBouncingResidents(state, moveEntries, initialBouncingBoxIds) {
    const blocked = new Set();
    const bouncing = new Set(initialBouncingBoxIds);
    let changed = true;
    while (changed) {
      changed = false;
      moveEntries.forEach((entry) => {
        if (entry.skipped || blocked.has(entry.boxId) || bouncing.has(entry.boxId)) return;
        if (!moveTargetsBouncingResident(state, entry.result, entry.boxId, bouncing)) return;
        blocked.add(entry.boxId);
        bouncing.add(entry.boxId);
        changed = true;
      });
    }
    return blocked;
  }

  function extendBlockedMovesByOccupiedTargets(state, moveEntries, blocked, extraMovingAwayIds = new Set()) {
    let changed = true;
    while (changed) {
      changed = false;
      const movingAway = new Set();
      extraMovingAwayIds.forEach((id) => movingAway.add(id));
      moveEntries.forEach((entry) => {
        if (entry.skipped || blocked.has(entry.boxId)) return;
        movingAway.add(entry.boxId);
      });
      moveEntries.forEach((entry) => {
        if (entry.skipped || blocked.has(entry.boxId)) return;
        const target = entry.result.transition.index;
        const residents = boxesAtIndex(state, target)
          .filter((resident) => resident.id !== entry.boxId);
        if (!residents.some((resident) => !movingAway.has(resident.id))) return;
        blocked.add(entry.boxId);
        changed = true;
      });
    }
    return blocked;
  }

  function residentSwapCollisions(state, proposals, byActor, excludedActorIds = new Set()) {
    const collisions = [];
    const seenActors = new Set();
    groupByTarget(proposals).forEach((group) => {
      if (group.length < 2) return;
      if (group.some((proposal) => excludedActorIds.has(proposal.actor.id))) return;
      const target = group[0].target;
      const resident = boxAt(state, target);
      if (!resident) return;
      const residentProposal = byActor.get(resident.id);
      if (!residentProposal || excludedActorIds.has(resident.id)) return;
      if (!group.some((proposal) => residentProposal.target === proposal.actor.index)) return;
      const collisionProposals = group.concat(residentProposal);
      if (collisionProposals.some((proposal) => seenActors.has(proposal.actor.id))) return;
      collisionProposals.forEach((proposal) => seenActors.add(proposal.actor.id));
      collisions.push({ target, resident, proposals: collisionProposals });
    });
    return collisions;
  }

  function detectPushChain(state, proposal, firstBox, firstDir, context) {
    const moves = [];
    const seen = new Set();
    let currentBox = firstBox;
    let expectedDir = firstDir;
    while (currentBox) {
      if (moves.length >= PUSH_CHAIN_LIMIT) {
        const message = `push-chain debug: exceeded ${PUSH_CHAIN_LIMIT} states from box ${proposal.actor.id}`;
        return { kind: 'debug', message };
      }
      if (context.mergeLocked.has(currentBox.id)) return { kind: 'blocked' };
      const stateKey = `${currentBox.id}:${expectedDir}`;
      if (seen.has(stateKey)) return { kind: 'blocked' };
      seen.add(stateKey);
      const transition = surfaceSuccessor(state, currentBox.index, expectedDir);
      if (!transition) return { kind: 'blocked' };
      const activeActor = context.active.get(currentBox.id);
      const completedGluings = activeActor ? activeActor.k : 0;
      if (transition.kind === 'glued' && completedGluings >= MAX_COMPLETED_GLUINGS) {
        return {
          kind: 'explode',
          center: currentBox.index,
          value: currentBox.value,
          removeBoxIds: [currentBox.id]
        };
      }
      const nextBox = boxAt(state, transition.index);
      const move = moveResultFromBox(currentBox, transition);
      if (!nextBox) {
        moves.push(move);
        return { kind: 'push', moves };
      }
      if (nextBox.id === proposal.actor.id && transition.dir === proposal.actor.dir) {
        moves.push(move);
        return { kind: 'push', moves, loop: true };
      }
      if (boxIsStillMoving(nextBox, context.byActor, context.willVacate, context.active)) {
        return { kind: 'wait' };
      }
      if (currentBox.value === nextBox.value && !context.mergeLocked.has(nextBox.id)) {
        return {
          kind: 'pushMerge',
          moves,
          merge: {
            movingBoxId: currentBox.id,
            targetBoxId: nextBox.id,
            from: currentBox.index,
            to: nextBox.index,
            move,
            value: currentBox.value,
            newValue: currentBox.value * 2
          }
        };
      }
      moves.push(move);
      currentBox = nextBox;
      expectedDir = transition.dir;
    }
    return { kind: 'blocked' };
  }

  function boxIsStillMoving(box, byActor, willVacate, active) {
    const proposal = byActor.get(box.id);
    if (proposal) return !!willVacate.get(box.id);
    return active.has(box.id);
  }

  function moveResultFromActor(actor, transition) {
    return {
      kind: 'move',
      actor,
      boxId: actor.id,
      value: actor.value,
      from: actor.index,
      transition
    };
  }

  function moveResultFromBox(box, transition) {
    return {
      kind: 'move',
      boxId: box.id,
      value: box.value,
      from: box.index,
      transition
    };
  }

  function animationMoveFromResult(result) {
    return {
      kind: 'move',
      boxId: result.boxId || (result.actor && result.actor.id),
      value: result.value,
      from: result.from,
      to: result.transition.index,
      dir: result.transition.dir,
      glued: result.transition.kind === 'glued',
      edge: result.transition.edge || null
    };
  }

  function explosionAnimationEvent(center, value, removeBoxIds, moves = []) {
    return {
      kind: 'explode',
      center,
      value,
      large: value > 64,
      removeBoxIds: Array.from(new Set(removeBoxIds)),
      moves: moves.map(animationMoveFromResult)
    };
  }

  function addMergeEvent(state, events, result, mergeLocked, active) {
    const keeperId = result.targetBoxId || result.movingActors[0].id;
    const removeBoxIds = result.targetBoxId
      ? result.movingActors.map((actor) => actor.id)
      : result.movingActors.slice(1).map((actor) => actor.id);
    const event = {
      kind: 'merge',
      boxId: keeperId,
      targetBoxId: result.targetBoxId,
      removeBoxIds,
      from: result.movingActors.map((actor) => actor.index),
      moves: (result.moves || result.movingActors.map((actor) => moveResultFromActor(actor, {
        kind: 'direct',
        index: result.target,
        dir: actor.dir
      }))).map(animationMoveFromResult),
      to: result.target,
      value: result.value,
      newValue: result.newValue
    };
    events.push(event);
    removeBoxIds.forEach((id) => removeBox(state, id));
    let keeper = findBox(state, keeperId);
    if (!keeper) {
      keeper = { id: keeperId, index: result.target, value: result.newValue };
      state.boxes.push(keeper);
    }
    keeper.index = result.target;
    keeper.value = result.newValue;
    state.score += result.newValue;
    mergeLocked.add(keeperId);
    result.movingActors.forEach((actor) => active.delete(actor.id));
    active.delete(keeperId);
  }

  function addPushedMergeEvent(state, events, merge, mergeLocked, active) {
    const event = {
      kind: 'merge',
      boxId: merge.targetBoxId,
      targetBoxId: merge.targetBoxId,
      removeBoxIds: [merge.movingBoxId],
      from: [merge.from],
      moves: merge.move ? [animationMoveFromResult(merge.move)] : [],
      to: merge.to,
      value: merge.value,
      newValue: merge.newValue
    };
    events.push(event);
    removeBox(state, merge.movingBoxId);
    const target = findBox(state, merge.targetBoxId);
    if (target) {
      target.index = merge.to;
      target.value = merge.newValue;
    }
    state.score += merge.newValue;
    mergeLocked.add(merge.targetBoxId);
    active.delete(merge.movingBoxId);
    active.delete(merge.targetBoxId);
  }

  function addExplosionEvents(state, events, center, value, removeBoxIds, moves = [], options = {}) {
    const centerIds = new Set(removeBoxIds);
    const large = value > 64;
    const blastRadius = Math.max(0, normalizeNonnegativeInteger(options.blastRadius, large ? 1 : 0));
    const clearIndices = blastRadius > 0 ? blastIndicesWithinDistance(state, center, blastRadius) : [];
    const clearBoxIds = boxesAtIndices(state, clearIndices).map((box) => box.id);
    if (options.animate !== false) events.push(explosionAnimationEvent(center, value, Array.from(centerIds), moves));
    events.push({ kind: 'removeTile', index: center, removeBoxIds: Array.from(centerIds), value });
    if (clearIndices.length) {
      events.push({
        kind: 'clearNumbers',
        indices: clearIndices,
        removeBoxIds: clearBoxIds
      });
    }
    Array.from(centerIds).concat(clearBoxIds).forEach((id) => removeBox(state, id));
    state.removed.add(center);
  }

  function applyEvent(targetState, event) {
    if (!targetState) return;
    if (event.kind === 'moveGroup') {
      (event.merges || []).forEach((merge) => applyMergeEvent(targetState, merge));
      applyMoveGroupEvent(targetState, event.moves || [], event);
      (event.postMerges || []).forEach((merge) => applyMergeEvent(targetState, merge));
      return;
    }
    if (event.kind === 'bounceGroup') {
      return;
    }
    if (event.kind === 'move') {
      if (targetState.removed.has(event.to)) return;
      if (boxesAtIndex(targetState, event.to).some((box) => box.id !== event.boxId)) return;
      const box = findBox(targetState, event.boxId);
      if (box) box.index = event.to;
      return;
    }
    if (event.kind === 'merge') {
      applyMergeEvent(targetState, event);
      return;
    }
    if (event.kind === 'removeTile') {
      event.removeBoxIds.forEach((id) => removeBox(targetState, id));
      targetState.removed.add(event.index);
      return;
    }
    if (event.kind === 'clearNumbers') {
      event.removeBoxIds.forEach((id) => removeBox(targetState, id));
      return;
    }
    if (event.kind === 'debug') {
      targetState.debugMessage = event.message;
      return;
    }
    if (event.kind === 'spawn') {
      if (!findBox(targetState, event.boxId) && !targetState.removed.has(event.index)) {
        targetState.boxes.push({ id: event.boxId, index: event.index, value: event.value });
        targetState.nextBoxId = Math.max(targetState.nextBoxId, event.boxId + 1);
      }
      if (!targetState.newBoxIds) targetState.newBoxIds = new Set();
      targetState.newBoxIds.add(event.boxId);
    }
  }

  function applyMergeEvent(targetState, event) {
    event.removeBoxIds.forEach((id) => removeBox(targetState, id));
    let box = findBox(targetState, event.boxId);
    if (!box) {
      box = { id: event.boxId, index: event.to, value: event.newValue };
      targetState.boxes.push(box);
    }
    box.index = event.to;
    box.value = event.newValue;
    targetState.score += event.newValue;
  }

  function applyMoveGroupEvent(targetState, moves, event = {}) {
    const extraMovingAway = moveGroupExtraMovingAwayBoxIds(event);
    const blocked = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      const movingAway = new Set();
      extraMovingAway.forEach((id) => {
        if (findBox(targetState, id)) movingAway.add(id);
      });
      moves.forEach((move) => {
        if (blocked.has(move.boxId)) return;
        if (!findBox(targetState, move.boxId) || targetState.removed.has(move.to)) return;
        movingAway.add(move.boxId);
      });
      moves.forEach((move) => {
        if (blocked.has(move.boxId)) return;
        if (!findBox(targetState, move.boxId) || targetState.removed.has(move.to)) {
          blocked.add(move.boxId);
          changed = true;
          return;
        }
        const residents = boxesAtIndex(targetState, move.to).filter((box) => box.id !== move.boxId);
        if (!residents.some((resident) => !movingAway.has(resident.id))) return;
        blocked.add(move.boxId);
        changed = true;
      });
    }
    moves.forEach((move) => {
      if (blocked.has(move.boxId)) return;
      const box = findBox(targetState, move.boxId);
      if (box) box.index = move.to;
    });
  }

  function moveGroupExtraMovingAwayBoxIds(event) {
    const ids = new Set();
    (event.explosions || []).forEach((explosion) => {
      (explosion.moves || []).forEach((move) => {
        if (move.boxId != null) ids.add(move.boxId);
      });
    });
    (event.postMerges || []).forEach((merge) => {
      (merge.moves || []).forEach((move) => {
        if (move.boxId != null) ids.add(move.boxId);
      });
      (merge.removeBoxIds || []).forEach((id) => ids.add(id));
    });
    return ids;
  }

  function spawnNumbers(state, requestedCount, rng, valuePicker, events) {
    let spawned = 0;
    state.newBoxIds = new Set();
    while (spawned < requestedCount) {
      const empty = emptyExistingIndices(state);
      if (!empty.length) break;
      const index = empty[Math.floor(rng() * empty.length)];
      const value = valuePicker(rng);
      const box = { id: state.nextBoxId, index, value };
      state.nextBoxId += 1;
      state.boxes.push(box);
      state.newBoxIds.add(box.id);
      if (events) events.push({ kind: 'spawn', boxId: box.id, index, value });
      spawned += 1;
    }
    return spawned;
  }

  function spawnInitialValue(rng) {
    return rng() < 0.9 ? 2 : 4;
  }

  function spawnRoundValue(rng) {
    const roll = rng();
    if (roll < 0.9) return 2;
    if (roll < 0.99) return 4;
    if (roll < 0.999) return 8;
    if (roll < 0.9997) return 16;
    return 32;
  }

  function surfaceSuccessor(state, index, dir) {
    const preset = state.preset;
    const direct = directNeighborIndex(state, index, dir);
    if (direct != null) return { kind: 'direct', index: direct, dir };
    const partner = gluedPartner(preset, index, dir);
    if (!partner || state.removed.has(partner.index)) return null;
    return {
      kind: 'glued',
      index: partner.index,
      dir: oppositeDir(preset, partner.dir),
      edge: {
        index,
        dir,
        color: partner.color,
        reversed: !!(partner.pair && partner.pair.reversed)
      }
    };
  }

  function directNeighborIndex(state, index, dir) {
    const preset = state.preset;
    const pos = rowCol(index, preset.cols);
    const next = neighbor(pos.row, pos.col, dir, preset);
    if (!next) return null;
    const nextIndex = indexOf(next.row, next.col, preset.cols);
    if (state.removed.has(nextIndex)) return null;
    if (cutEdgeKeySet(preset).has(cutKey(index, nextIndex))) return null;
    return nextIndex;
  }

  function gluedPartner(preset, index, dir) {
    const key = `${index}:${dir}`;
    for (const pair of preset.gluedEdges) {
      const first = normalizeBoundaryEdge(pair.first, preset.cols);
      const second = normalizeBoundaryEdge(pair.second, preset.cols);
      if (`${first.index}:${first.dir}` === key) return { ...second, color: glueColor(pair), pair };
      if (`${second.index}:${second.dir}` === key) return { ...first, color: glueColor(pair), pair };
    }
    return null;
  }

  function blastNeighborIndices(state, center) {
    return blastIndicesWithinDistance(state, center, 1);
  }

  function blastIndicesWithinDistance(state, center, maxDistance) {
    const out = new Set();
    const seen = new Set([center]);
    let frontier = [{ index: center, distance: 0 }];
    while (frontier.length) {
      const nextFrontier = [];
      frontier.forEach((item) => {
        if (item.distance >= maxDistance) return;
        for (const dir of directionsForPreset(state.preset)) {
          const next = surfaceSuccessor(state, item.index, dir);
          if (!next || next.index === center || state.removed.has(next.index) || seen.has(next.index)) continue;
          seen.add(next.index);
          out.add(next.index);
          nextFrontier.push({ index: next.index, distance: item.distance + 1 });
        }
      });
      frontier = nextFrontier;
    }
    return Array.from(out);
  }

  function fullBoardWithoutAdjacentMerge(state) {
    if (!state || emptyExistingIndices(state).length) return false;
    return !hasAdjacentEqualBoxes(state);
  }

  function hasAdjacentEqualBoxes(state) {
    const seen = new Set();
    for (const box of state.boxes) {
      for (const dir of directionsForPreset(state.preset)) {
        const next = surfaceSuccessor(state, box.index, dir);
        if (!next) continue;
        const other = boxAt(state, next.index);
        if (!other || other.id === box.id) continue;
        const key = box.index < next.index ? `${box.index}:${next.index}` : `${next.index}:${box.index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (other.value === box.value) return true;
      }
    }
    return false;
  }

  function explosionModeDirections(state) {
    if (!fullBoardWithoutAdjacentMerge(state)) return [];
    return directionsForPreset(state.preset).filter((dir) => explosionModeCycleIndices(state, dir).length > 0);
  }

  function isExplosionModeActive(state) {
    return !!(state && state.phase !== 'gameover' && explosionModeDirections(state).length);
  }

  function explosionModeCycleIndices(state, dir) {
    const occupied = new Set(state.boxes.map((box) => box.index));
    const globalSeen = new Set();
    const cycleIndices = new Set();
    state.boxes.forEach((box) => {
      const startKey = `${box.index}:${dir}`;
      if (globalSeen.has(startKey)) return;
      const localSeen = new Map();
      const path = [];
      let index = box.index;
      let direction = dir;
      let guard = 0;
      while (Number.isInteger(index) && occupied.has(index) && guard <= state.boxes.length * directionsForPreset(state.preset).length + 1) {
        const key = `${index}:${direction}`;
        if (localSeen.has(key)) {
          const cycle = path.slice(localSeen.get(key));
          const indices = Array.from(new Set(cycle.map((step) => step.index)));
          if (indices.length >= 2) indices.forEach((item) => cycleIndices.add(item));
          break;
        }
        if (globalSeen.has(key)) break;
        localSeen.set(key, path.length);
        path.push({ index, dir: direction });
        const next = surfaceSuccessor(state, index, direction);
        if (!next || !occupied.has(next.index)) break;
        index = next.index;
        direction = next.dir;
        guard += 1;
      }
      path.forEach((step) => globalSeen.add(`${step.index}:${step.dir}`));
    });
    return Array.from(cycleIndices).sort((a, b) => a - b);
  }

  function isGameOver(state) {
    if (!state || emptyExistingIndices(state).length) return false;
    if (explosionModeDirections(state).length) return false;
    return directionsForPreset(state.preset).every((dir) => !simulateRound(state, dir, { spawn: false }).changed);
  }

  function gameStateChanged(before, after) {
    if ((before.score || 0) !== (after.score || 0)) return true;
    if ((before.nextBoxId || 0) !== (after.nextBoxId || 0)) return true;
    if (before.removed.size !== after.removed.size) return true;
    for (const index of before.removed) {
      if (!after.removed.has(index)) return true;
    }
    if (before.boxes.length !== after.boxes.length) return true;
    const beforeBoxes = before.boxes
      .map((box) => `${box.id}:${box.index}:${box.value}`)
      .sort();
    const afterBoxes = after.boxes
      .map((box) => `${box.id}:${box.index}:${box.value}`)
      .sort();
    return beforeBoxes.some((entry, index) => entry !== afterBoxes[index]);
  }

  function cloneGameState(source) {
    if (isGomokuGame(source)) {
      return {
        gameMode: GAME_MODES.GOMOKU,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        stones: (source.stones || []).map((stone) => ({ id: stone.id, index: stone.index, color: stone.color })),
        nextStoneId: source.nextStoneId || 1,
        turn: GOMOKU_COLORS.includes(source.turn) ? source.turn : 'black',
        winner: GOMOKU_COLORS.includes(source.winner) ? source.winner : '',
        winningLine: Array.isArray(source.winningLine) ? source.winningLine.slice() : [],
        resultDismissed: !!source.resultDismissed,
        round: source.round || 0,
        ending: source.ending || '',
        debugMessage: source.debugMessage || ''
      };
    }
    if (isConnectFourGame(source)) {
      return {
        gameMode: GAME_MODES.CONNECT_FOUR,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        tokens: (source.tokens || []).map((token) => ({ id: token.id, index: token.index, color: token.color })),
        nextTokenId: source.nextTokenId || 1,
        holes: new Set(source.holes || []),
        cycleHoles: new Set(source.cycleHoles || []),
        turn: CONNECT_FOUR_COLORS.includes(source.turn) ? source.turn : 'red',
        fallDir: Number.isInteger(source.fallDir) ? source.fallDir : defaultConnectFourFallDir(source.preset),
        winner: CONNECT_FOUR_COLORS.includes(source.winner) ? source.winner : '',
        winningLine: Array.isArray(source.winningLine) ? source.winningLine.slice() : [],
        resultDismissed: !!source.resultDismissed,
        round: source.round || 0,
        ending: source.ending || '',
        dropWarning: source.dropWarning || '',
        debugMessage: source.debugMessage || ''
      };
    }
    return {
      gameMode: source.gameMode || GAME_MODES.NUMBER_2048,
      preset: source.preset,
      phase: source.phase,
      removed: new Set(source.removed),
      boxes: source.boxes.map((box) => ({ id: box.id, index: box.index, value: box.value })),
      newBoxIds: new Set(source.newBoxIds || []),
      nextBoxId: source.nextBoxId,
      score: source.score,
      round: source.round,
      ending: source.ending || '',
      debugMessage: source.debugMessage || ''
    };
  }

  function emptyExistingIndices(state) {
    if (isGomokuGame(state)) return emptyGomokuIndices(state);
    if (isConnectFourGame(state)) return emptyConnectFourIndices(state);
    const occupied = new Set((state.boxes || []).map((box) => box.index));
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!state.removed.has(index) && !occupied.has(index)) empty.push(index);
    }
    return empty;
  }

  function boxesAtIndices(state, indices) {
    const targets = new Set(indices);
    return state.boxes.filter((box) => targets.has(box.index));
  }

  function boxesAtIndex(state, index) {
    return state.boxes.filter((box) => box.index === index);
  }

  function stackedBoxIdSet(state) {
    const counts = new Map();
    state.boxes.forEach((box) => {
      counts.set(box.index, (counts.get(box.index) || 0) + 1);
    });
    const stacked = new Set();
    state.boxes.forEach((box) => {
      if ((counts.get(box.index) || 0) > 1) stacked.add(box.id);
    });
    return stacked;
  }

  function stackedTileDetails(state) {
    if (!state || isGomokuGame(state) || !state.boxes) return [];
    const groups = new Map();
    state.boxes.forEach((box) => {
      const group = groups.get(box.index) || [];
      group.push(box);
      groups.set(box.index, group);
    });
    return Array.from(groups.entries())
      .filter((entry) => entry[1].length > 1)
      .map(([index, boxes]) => ({
        index,
        ...rowCol(index, state.preset.cols),
        boxIds: boxes.map((box) => box.id),
        values: boxes.map((box) => box.value)
      }))
      .sort((a, b) => a.index - b.index);
  }

  function stackWarningText(state) {
    const stacks = stackedTileDetails(state);
    if (!stacks.length) return '';
    const count = stacks.reduce((sum, stack) => sum + stack.boxIds.length, 0);
    const tiles = stacks.slice(0, 3).map((stack) => `r${stack.row} c${stack.col}`).join(', ');
    return `warning: ${count} stacked boxes on ${stacks.length} tile${stacks.length === 1 ? '' : 's'} (${tiles}${stacks.length > 3 ? ', ...' : ''})`;
  }

  function gameWarnings(state) {
    if (isGomokuGame(state)) return [];
    const stackWarning = stackWarningText(state);
    const stacks = stackedTileDetails(state);
    return stackWarning
      ? [{ kind: 'stacked-boxes', message: stackWarning, tiles: stacks }]
      : [];
  }

  function findBox(state, id) {
    return state.boxes.find((box) => box.id === id) || null;
  }

  function boxAt(state, index) {
    return state.boxes.find((box) => box.index === index) || null;
  }

  function removeBox(state, id) {
    state.boxes = state.boxes.filter((box) => box.id !== id);
    if (state.newBoxIds) state.newBoxIds.delete(id);
  }

  function removeBoxesAtIndex(state, index) {
    const removedIds = state.boxes.filter((box) => box.index === index).map((box) => box.id);
    state.boxes = state.boxes.filter((box) => box.index !== index);
    if (state.newBoxIds) removedIds.forEach((id) => state.newBoxIds.delete(id));
  }

  function groupByTarget(proposals) {
    const groups = new Map();
    proposals.forEach((proposal) => {
      const group = groups.get(proposal.target) || [];
      group.push(proposal);
      groups.set(proposal.target, group);
    });
    return Array.from(groups.values());
  }

  function selectedPreset() {
    if (refs.select && refs.select.value === IMPORTED_PRESET_ID && importedPreset) return importedPreset;
    if (refs.select && refs.select.value === IMPORT_PRESET_CHOICE_ID && importedPreset) return importedPreset;
    if (refs.select && refs.select.value === 'gomoku-random-glue') return gomokuRandomGluePreset(selectedGomokuBoardSize());
    return resolvePreset(refs.select ? refs.select.value : 'torus');
  }

  function selectedGameMode() {
    const value = refs.gameMode ? refs.gameMode.value : GAME_MODES.NUMBER_2048;
    if (value === GAME_MODES.GOMOKU) return GAME_MODES.GOMOKU;
    if (value === GAME_MODES.CONNECT_FOUR) return GAME_MODES.CONNECT_FOUR;
    return GAME_MODES.NUMBER_2048;
  }

  function gomokuDisplayStyle() {
    const value = refs.gomokuDisplay ? refs.gomokuDisplay.value : 'center';
    return value === 'vertex' ? 'vertex' : 'center';
  }

  function selectedGomokuBoardSize() {
    const value = refs.gomokuSize ? Number(refs.gomokuSize.value) : GOMOKU_DEFAULT_BOARD_SIZE;
    return clampInteger(value, GOMOKU_MIN_BOARD_SIZE, GOMOKU_MAX_BOARD_SIZE, GOMOKU_DEFAULT_BOARD_SIZE);
  }

  function selectedConnectFourFallDir(preset = selectedPreset()) {
    const dir = refs.connectFourFall ? dirFromName(refs.connectFourFall.value, preset) : null;
    return Number.isInteger(dir) ? dir : defaultConnectFourFallDir(preset);
  }

  function defaultConnectFourFallDir(preset) {
    return latticeForPreset(preset).shape === 'hex' ? HEX_DIRS.SE : DIRS.S;
  }

  function syncConnectFourFallOptions() {
    if (!refs.connectFourFall) return;
    const preset = game ? game.preset : selectedPreset();
    const lattice = latticeForPreset(preset);
    const options = refs.connectFourFall.options ? Array.from(refs.connectFourFall.options) : [];
    options.forEach((option) => {
      const dir = dirFromName(option.value, preset);
      const valid = Number.isInteger(dir);
      option.hidden = !valid;
      option.disabled = !valid;
      if (valid) option.textContent = lattice.dirLabels[dir] || lattice.dirNames[dir] || option.value;
    });
    if (!Number.isInteger(dirFromName(refs.connectFourFall.value, preset))) {
      refs.connectFourFall.value = lattice.dirNames[defaultConnectFourFallDir(preset)];
    }
  }

  function syncConnectFourFallInputFromGame() {
    if (!refs.connectFourFall || !isConnectFourGame(game)) return;
    const lattice = latticeForPreset(game.preset);
    refs.connectFourFall.value = lattice.dirNames[game.fallDir] || lattice.dirNames[defaultConnectFourFallDir(game.preset)];
  }

  function createSelectedGameState(presetOrId, options = {}) {
    const mode = selectedGameMode();
    if (mode === GAME_MODES.GOMOKU) return createGomokuState(presetOrId, options);
    if (mode === GAME_MODES.CONNECT_FOUR) return createConnectFourState(presetOrId, options);
    return createGameState(presetOrId, options);
  }

  function beginSelectedGame(presetOrId, options = {}) {
    const mode = selectedGameMode();
    if (mode === GAME_MODES.GOMOKU) return beginGomokuGame(presetOrId, options);
    if (mode === GAME_MODES.CONNECT_FOUR) return beginConnectFourGame(presetOrId, options);
    return beginGame(presetOrId, options);
  }

  function isGomokuGame(state) {
    return !!state && state.gameMode === GAME_MODES.GOMOKU;
  }

  function isConnectFourGame(state) {
    return !!state && state.gameMode === GAME_MODES.CONNECT_FOUR;
  }

  function isPlacementGame(state) {
    return isGomokuGame(state) || isConnectFourGame(state);
  }

  function is2048Game(state) {
    return !state || !state.gameMode || state.gameMode === GAME_MODES.NUMBER_2048;
  }

  function gameModeValue(state) {
    if (isGomokuGame(state)) return GAME_MODES.GOMOKU;
    if (isConnectFourGame(state)) return GAME_MODES.CONNECT_FOUR;
    return GAME_MODES.NUMBER_2048;
  }

  function presetFromImportText(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('paste a preset JSON object');
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      throw new Error('preset JSON could not be parsed');
    }
    return presetFromImportPayload(payload);
  }

  function presetFromImportPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('preset must be a JSON object');
    }
    const source = payload.preset && typeof payload.preset === 'object' ? payload.preset : payload;
    const lattice = normalizeImportedLattice(firstPresentValue(source, ['lattice']) || firstPresentValue(payload, ['lattice']));
    const rows = normalizeImportedBoardSize(firstPresentValue(source, ['rows']) || firstPresentValue(payload, ['rows']), 'rows');
    const cols = normalizeImportedBoardSize(firstPresentValue(source, ['cols']) || firstPresentValue(payload, ['cols']), 'cols');
    const shell = { lattice, rows, cols, removedTiles: [], cutEdges: [], gluedEdges: [] };
    const removedTiles = normalizeImportedRemovedTiles(importedArrayValues(payload, source, ['removedTiles', 'backgroundRemovedTiles']), rows, cols);
    shell.removedTiles = removedTiles;
    const cutEdges = normalizeImportedCutEdges(importedArrayValues(payload, source, ['cutEdges', 'backgroundCutEdges', 'boundaries']), shell);
    shell.cutEdges = cutEdges;
    const gluedEdges = normalizeImportedGluedEdges(importedArrayValues(payload, source, ['gluedEdges', 'backgroundGluedEdges', 'gluedBoundaries']), shell);
    const backgroundSpace = payload.backgroundSpace && typeof payload.backgroundSpace === 'object' ? payload.backgroundSpace : {};
    const label = sanitizeImportedText(
      firstPresentValue(source, ['label', 'name'])
        || firstPresentValue(payload, ['label', 'name'])
        || 'imported preset',
      'imported preset'
    );
    const surface = sanitizeImportedText(
      firstPresentValue(source, ['surface'])
        || firstPresentValue(payload, ['surface'])
        || backgroundSpace.surfaceType
        || `${latticeForPreset(shell).label} background`,
      `${latticeForPreset(shell).label} background`
    );
    return {
      id: IMPORTED_PRESET_ID,
      sourceId: sanitizeImportedText(firstPresentValue(source, ['id']) || firstPresentValue(payload, ['id']) || '', ''),
      label,
      lattice,
      rows,
      cols,
      surface,
      removedTiles,
      cutEdges,
      gluedEdges
    };
  }

  function normalizeImportedLattice(value) {
    const key = String(value || '').trim().toLowerCase();
    if (key === 'hex' || key === 'hexagon' || key === 'hexagonal') return 'hexagonal';
    if (key === 'square' || key === 'grid') return 'square';
    if (LATTICES[key]) return key;
    throw new Error('imported lattice must be square or hexagonal');
  }

  function normalizeImportedBoardSize(value, label) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < MIN_IMPORTED_BOARD || number > MAX_IMPORTED_BOARD) {
      throw new Error(`imported ${label} must be between ${MIN_IMPORTED_BOARD} and ${MAX_IMPORTED_BOARD}`);
    }
    return number;
  }

  function importedArrayValues(payload, source, keys) {
    const results = [];
    const backgroundSpace = payload.backgroundSpace && typeof payload.backgroundSpace === 'object'
      ? payload.backgroundSpace
      : null;
    [source, payload, backgroundSpace].filter(Boolean).forEach((container) => {
      keys.forEach((key) => {
        if (Array.isArray(container[key])) results.push(...container[key]);
      });
    });
    return results;
  }

  function normalizeImportedRemovedTiles(entries, rows, cols) {
    const seen = new Set();
    const tiles = [];
    entries.forEach((entry) => {
      const tile = normalizeImportedTileRef(entry, rows, cols);
      if (!tile) return;
      const key = indexOf(tile.row, tile.col, cols);
      if (seen.has(key)) return;
      seen.add(key);
      tiles.push(tile);
    });
    return tiles.sort((a, b) => indexOf(a.row, a.col, cols) - indexOf(b.row, b.col, cols));
  }

  function normalizeImportedCutEdges(entries, preset) {
    const seen = new Set();
    const cuts = [];
    entries.forEach((entry) => {
      const cut = normalizeImportedCutEdge(entry, preset);
      if (!cut) return;
      const key = cutKey(indexOf(cut.left.row, cut.left.col, preset.cols), indexOf(cut.right.row, cut.right.col, preset.cols));
      if (seen.has(key)) return;
      seen.add(key);
      cuts.push(cut);
    });
    return cuts;
  }

  function normalizeImportedCutEdge(entry, preset) {
    let leftValue = null;
    let rightValue = null;
    if (Array.isArray(entry) && entry.length >= 2) {
      [leftValue, rightValue] = entry;
    } else if (entry && typeof entry === 'object') {
      leftValue = firstPresentValue(entry, ['left', 'a', 'from', 'first']);
      rightValue = firstPresentValue(entry, ['right', 'b', 'to', 'second']);
    }
    const left = normalizeImportedTileRef(leftValue, preset.rows, preset.cols);
    const right = normalizeImportedTileRef(rightValue, preset.rows, preset.cols);
    if (!left || !right) return null;
    if (indexOf(left.row, left.col, preset.cols) === indexOf(right.row, right.col, preset.cols)) return null;
    if (!areDirectNeighborTiles(left, right, preset)) return null;
    return { left, right };
  }

  function normalizeImportedGluedEdges(entries, preset) {
    const seen = new Set();
    const glued = [];
    entries.forEach((entry) => {
      const pair = normalizeImportedGluePair(entry, preset);
      if (!pair) return;
      const first = boundaryEdgeKey(pair.first, preset.cols);
      const second = boundaryEdgeKey(pair.second, preset.cols);
      const key = first < second ? `${first}|${second}` : `${second}|${first}`;
      if (seen.has(key)) return;
      seen.add(key);
      glued.push(pair);
    });
    return glued;
  }

  function normalizeImportedGluePair(entry, preset) {
    let firstValue = null;
    let secondValue = null;
    if (Array.isArray(entry) && entry.length >= 2) {
      [firstValue, secondValue] = entry;
    } else if (entry && typeof entry === 'object') {
      firstValue = firstPresentValue(entry, ['first', 'left', 'a', 'from']);
      secondValue = firstPresentValue(entry, ['second', 'right', 'b', 'to']);
    }
    const first = normalizeImportedBoundaryEdge(firstValue, preset);
    const second = normalizeImportedBoundaryEdge(secondValue, preset);
    if (!first || !second) return null;
    const orientation = entry && typeof entry === 'object' ? String(entry.orientation || '').toLowerCase() : '';
    return {
      group: normalizeImportedGroup(entry && entry.group),
      reversed: !!(entry && entry.reversed) || orientation === 'reversed',
      firstArrowReversed: entry && Object.prototype.hasOwnProperty.call(entry, 'firstArrowReversed')
        ? !!entry.firstArrowReversed
        : !!(entry && entry.reversed),
      secondArrowReversed: entry && Object.prototype.hasOwnProperty.call(entry, 'secondArrowReversed')
        ? !!entry.secondArrowReversed
        : true,
      first,
      second
    };
  }

  function normalizeImportedBoundaryEdge(value, preset) {
    if (!value || typeof value !== 'object') return null;
    const tile = normalizeImportedTileRef(value, preset.rows, preset.cols);
    if (!tile) return null;
    const dirValue = value.dir != null ? value.dir : value.edge;
    const dir = normalizeImportedDir(dirValue, preset);
    if (!Number.isInteger(dir)) return null;
    return { row: tile.row, col: tile.col, dir };
  }

  function normalizeImportedTileRef(value, rows, cols) {
    if (Number.isInteger(Number(value))) return tileRefFromIndex(Number(value), rows, cols);
    if (!value || typeof value !== 'object') return null;
    const row = Number(value.row);
    const col = Number(value.col);
    if (Number.isInteger(row) && Number.isInteger(col) && row >= 1 && row <= rows && col >= 1 && col <= cols) {
      return { row, col };
    }
    if (Number.isInteger(Number(value.index))) return tileRefFromIndex(Number(value.index), rows, cols);
    return null;
  }

  function tileRefFromIndex(index, rows, cols) {
    if (!Number.isInteger(index) || index < 0 || index >= rows * cols) return null;
    return rowCol(index, cols);
  }

  function normalizeImportedDir(value, preset) {
    const lattice = latticeForPreset(preset);
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      const named = lattice.dirNames.findIndex((name) => name === normalized);
      if (named >= 0) return named;
      if (!/^-?\d+$/.test(normalized)) return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return modulo(Math.trunc(number), lattice.sides);
  }

  function normalizeImportedGroup(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
  }

  function areDirectNeighborTiles(left, right, preset) {
    return directionsForPreset(preset).some((dir) => {
      const next = neighbor(left.row, left.col, dir, preset);
      return next && next.row === right.row && next.col === right.col;
    });
  }

  function firstPresentValue(source, keys) {
    if (!source || typeof source !== 'object') return undefined;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    }
    return undefined;
  }

  function sanitizeImportedText(value, fallback) {
    const text = String(value || '').trim();
    return text ? text.slice(0, 80) : fallback;
  }

  function latticeForPreset(preset) {
    return LATTICES[(preset && preset.lattice) || 'square'] || LATTICES.square;
  }

  function directionsForPreset(preset) {
    const lattice = latticeForPreset(preset);
    return Array.from({ length: lattice.sides }, (_, index) => index);
  }

  function dirFromName(name, preset) {
    const lattice = latticeForPreset(preset);
    const normalized = String(name || '').toUpperCase();
    const index = lattice.dirNames.findIndex((dirName) => dirName === normalized);
    return index >= 0 ? index : null;
  }

  function dirFromKey(key, preset) {
    const lattice = latticeForPreset(preset);
    const keyMap = KEY_DIRS[lattice.id] || KEY_DIRS.square;
    if (Object.prototype.hasOwnProperty.call(keyMap, key)) return keyMap[key];
    const rawKey = String(key || '');
    const letterCode = rawKey.length === 1 ? `Key${rawKey.toUpperCase()}` : rawKey;
    return Object.prototype.hasOwnProperty.call(keyMap, letterCode) ? keyMap[letterCode] : null;
  }

  function oppositeDir(preset, dir) {
    const lattice = latticeForPreset(preset);
    return lattice.opposite[modulo(dir, lattice.sides)];
  }

  function resolvePreset(presetOrId) {
    if (presetOrId && typeof presetOrId === 'object') return presetOrId;
    return PRESETS.find((preset) => preset.id === presetOrId) || PRESETS[0];
  }

  function materializePreset(source, options = {}) {
    const preset = clonePreset(source);
    if (preset.dynamicGomokuSize) {
      const size = clampInteger(options.boardSize || preset.rows, GOMOKU_MIN_BOARD_SIZE, GOMOKU_MAX_BOARD_SIZE, GOMOKU_DEFAULT_BOARD_SIZE);
      preset.rows = size;
      preset.cols = size;
      preset.label = `random glue ${size}*${size}`;
    }
    if (preset.randomGlue) {
      preset.gluedEdges = generateRandomBoundaryGlue(preset, options.glueRng || Math.random);
    }
    return preset;
  }

  function gomokuRandomGluePreset(size) {
    const preset = clonePreset(resolvePreset('gomoku-random-glue'));
    const boardSize = clampInteger(size, GOMOKU_MIN_BOARD_SIZE, GOMOKU_MAX_BOARD_SIZE, GOMOKU_DEFAULT_BOARD_SIZE);
    preset.rows = boardSize;
    preset.cols = boardSize;
    preset.label = `random glue ${boardSize}*${boardSize}`;
    preset.gluedEdges = [];
    return preset;
  }

  function clonePreset(source) {
    return {
      ...source,
      lattice: source.lattice || 'square',
      removedTiles: (source.removedTiles || []).map((tile) => ({ ...tile })),
      cutEdges: (source.cutEdges || []).map((edge) => ({
        left: { ...edge.left },
        right: { ...edge.right }
      })),
      gluedEdges: (source.gluedEdges || []).map(cloneGluePair)
    };
  }

  function cloneGluePair(pair) {
    return {
      ...pair,
      first: { ...pair.first },
      second: { ...pair.second }
    };
  }

  function generateRandomBoundaryGlue(preset, rng) {
    const edges = realBoundaryEdges(preset);
    shuffleInPlace(edges, rng || Math.random);
    const gluedEdges = [];
    for (let index = 0; index + 1 < edges.length; index += 2) {
      gluedEdges.push({
        group: Math.floor(index / 2),
        first: edges[index],
        second: edges[index + 1]
      });
    }
    return gluedEdges;
  }

  function realBoundaryEdges(preset) {
    const removed = initialRemovedSet(preset);
    const edges = [];
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        const index = indexOf(row, col, preset.cols);
        if (removed.has(index)) continue;
        for (const dir of directionsForPreset(preset)) {
          const next = neighbor(row, col, dir, preset);
          if (!next || removed.has(indexOf(next.row, next.col, preset.cols))) {
            edges.push({ row, col, dir });
          }
        }
      }
    }
    return edges;
  }

  function shuffleInPlace(items, rng) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor((rng ? rng() : Math.random()) * (index + 1));
      const temp = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = temp;
    }
    return items;
  }

  function initialRemovedSet(preset) {
    return new Set(preset.removedTiles.map((tile) => indexOf(tile.row, tile.col, preset.cols)));
  }

  function previewInfo(preset) {
    const removed = preset.removedTiles.length;
    const glued = preset.gluedEdges.length;
    const cuts = preset.cutEdges.length;
    const unmatched = countUnmatchedBoundaries(preset, initialRemovedSet(preset));
    return `${preset.rows}x${preset.cols}, ${preset.surface}, ${unmatched} unmatched, ${removed} removed, ${cuts} cut, ${glued} glued`;
  }

  function countUnmatchedBoundaries(preset, removed) {
    const glued = gluedEdgeKeySet(preset);
    const cuts = cutEdgeKeySet(preset);
    let count = 0;
    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        const index = indexOf(row, col, preset.cols);
        if (removed.has(index)) continue;
        for (const dir of directionsForPreset(preset)) {
          if (glued.has(boundaryEdgeKey({ row, col, dir }, preset.cols))) continue;
          const next = neighbor(row, col, dir, preset);
          const boundary = !next
            || removed.has(indexOf(next.row, next.col, preset.cols))
            || cuts.has(cutKey(index, indexOf(next.row, next.col, preset.cols)));
          if (boundary) count += 1;
        }
      }
    }
    return count;
  }

  function syncStatus(status, info, badge) {
    const warning = stackWarningText(game);
    const infoText = warning ? `${info || ''}${info ? ' | ' : ''}${warning}` : (info || '');
    if (refs.statusBadge) refs.statusBadge.textContent = badge || '';
    if (refs.statusLine) refs.statusLine.textContent = status || '';
    if (refs.infoLine) refs.infoLine.textContent = infoText;
    syncStats();
  }

  function showSetupAlert(text) {
    if (!refs.setupAlert) return;
    refs.setupAlert.textContent = text || '';
    refs.setupAlert.hidden = !text;
  }

  function clearSetupAlert() {
    showSetupAlert('');
  }

  function syncStats() {
    if (!game) return;
    if (isGomokuGame(game)) {
      const counts = gomokuStoneCounts(game);
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Turn';
      if (refs.highestLabel) refs.highestLabel.textContent = 'Black stones';
      if (refs.existingLabel) refs.existingLabel.textContent = 'White stones';
      if (refs.removedLabel) refs.removedLabel.textContent = 'Removed tiles';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Moves';
      if (refs.score) {
        refs.score.textContent = game.phase === 'gameover'
          ? (game.winner ? `${gomokuColorLabel(game.winner)} wins` : 'draw')
          : gomokuColorLabel(game.turn);
      }
      if (refs.highest) refs.highest.textContent = String(counts.black);
      if (refs.existing) refs.existing.textContent = String(counts.white);
      if (refs.removed) refs.removed.textContent = String(game.removed.size);
      if (refs.round) refs.round.textContent = String(game.round || 0);
      return;
    }
    if (isConnectFourGame(game)) {
      const counts = connectFourTokenCounts(game);
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Turn';
      if (refs.highestLabel) refs.highestLabel.textContent = 'Red tokens';
      if (refs.existingLabel) refs.existingLabel.textContent = 'Yellow tokens';
      if (refs.removedLabel) refs.removedLabel.textContent = 'Removed tiles';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Drops';
      if (refs.score) {
        refs.score.textContent = game.phase === 'gameover'
          ? (game.winner ? `${connectFourColorLabel(game.winner)} wins` : 'draw')
          : connectFourColorLabel(game.turn);
      }
      if (refs.highest) refs.highest.textContent = String(counts.red);
      if (refs.existing) refs.existing.textContent = String(counts.yellow);
      if (refs.removed) refs.removed.textContent = String(game.removed.size);
      if (refs.round) refs.round.textContent = String(game.round || 0);
      return;
    }
    if (refs.scoreLabel) refs.scoreLabel.textContent = 'Score';
    if (refs.highestLabel) refs.highestLabel.textContent = 'Highest tile';
    if (refs.existingLabel) refs.existingLabel.textContent = 'Existing tiles';
    if (refs.removedLabel) refs.removedLabel.textContent = 'Removed tiles';
    if (refs.roundLabel) refs.roundLabel.textContent = 'Round';
    if (refs.score) refs.score.textContent = String(game.score || 0);
    if (refs.highest) refs.highest.textContent = String(highestValue(game));
    if (refs.existing) refs.existing.textContent = String(existingTileCount(game));
    if (refs.removed) refs.removed.textContent = String(game.removed.size);
    if (refs.round) refs.round.textContent = String(game.round || 0);
  }

  function syncControls() {
    const mode2048 = is2048Game(game) && selectedGameMode() === GAME_MODES.NUMBER_2048;
    const modeGomoku = isGomokuGame(game) || selectedGameMode() === GAME_MODES.GOMOKU;
    const modeConnectFour = isConnectFourGame(game) || selectedGameMode() === GAME_MODES.CONNECT_FOUR;
    syncConnectFourFallOptions();
    if (refs.begin) refs.begin.textContent = game && game.phase !== 'setup' ? 'stop the game' : 'begin the game';
    if (refs.mode2048Controls) {
      refs.mode2048Controls.forEach((control) => {
        control.hidden = !mode2048;
      });
    }
    if (refs.modeGomokuControls) {
      refs.modeGomokuControls.forEach((control) => {
        control.hidden = !modeGomoku;
      });
    }
    if (refs.modeConnectFourControls) {
      refs.modeConnectFourControls.forEach((control) => {
        control.hidden = !modeConnectFour;
      });
    }
    if (refs.connectFourFall) refs.connectFourFall.disabled = modeConnectFour && game && game.phase !== 'setup';
    if (refs.nextStep) refs.nextStep.disabled = !mode2048 || !(isStepMode() && stepPaused && eventQueue.length && !currentAnimation);
    if (refs.undo) refs.undo.disabled = !undoStack.length;
    if (refs.exportState) refs.exportState.disabled = !game;
    if (refs.importState) refs.importState.disabled = !debugMode;
    syncDebugModeUi();
    const activeLattice = latticeForPreset(game ? game.preset : selectedPreset()).id;
    if (refs.moveGroups) {
      refs.moveGroups.forEach((group) => {
        group.hidden = !mode2048 || group.getAttribute('data-move-lattice') !== activeLattice;
      });
    }
    if (refs.moveButtons) {
      const disabled = !mode2048 || !canAcceptMove();
      refs.moveButtons.forEach((button) => {
        const dir = game ? dirFromName(button.getAttribute('data-move-dir'), game.preset) : null;
        button.disabled = disabled || !Number.isInteger(dir);
      });
    }
  }

  function syncSpeedOutput() {
    if (!refs.speed || !refs.speedValue) return;
    refs.speedValue.textContent = `${refs.speed.value} ms`;
  }

  function shouldHighlightNewBoxes() {
    return !refs.highlightNewBoxes || !!refs.highlightNewBoxes.checked;
  }

  function shouldHighlightBox(box) {
    return !!(box && game && game.newBoxIds && game.newBoxIds.has(box.id) && shouldHighlightNewBoxes());
  }

  function eventDuration(event) {
    const base = refs.speed ? Number(refs.speed.value) || 260 : 260;
    if (event.kind === 'connectFourDrop') {
      const steps = Array.isArray(event.transitions) && event.transitions.length
        ? event.transitions.length
        : (Array.isArray(event.path) ? Math.max(1, event.path.length - 1) : 1);
      return Math.min(900, Math.max(260, 150 + steps * 90));
    }
    if (event.kind === 'bounceGroup') return Math.max(100, base * 0.9);
    if (event.kind === 'explode') return Math.max(120, base * 0.85);
    if (event.kind === 'removeTile' || event.kind === 'clearNumbers') return Math.max(90, base * 0.55);
    if (event.kind === 'spawn') return Math.max(100, base * 0.72);
    return base;
  }

  function isStepMode() {
    return debugMode && !!(refs.stepMode && refs.stepMode.checked);
  }

  function highestValue(state) {
    return (state.boxes || []).reduce((max, box) => Math.max(max, box.value), 0);
  }

  function existingTileCount(state) {
    return (state.preset.rows * state.preset.cols) - state.removed.size;
  }

  function dirLabel(dir, preset) {
    const lattice = latticeForPreset(preset);
    return lattice.dirLabels[dir] || lattice.dirNames[dir] || String(dir);
  }

  function valueColor(value) {
    if (value <= 2) return '#d8b071';
    if (value <= 4) return '#cfa05f';
    if (value <= 8) return '#c47f17';
    if (value <= 16) return '#b85d3a';
    if (value <= 32) return '#b23a48';
    if (value <= 64) return '#8a4f7d';
    return '#1f7a8c';
  }

  function edgeSegment(geom, row, col, dir) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const lattice = geom.lattice || LATTICES.square;
    const points = tilePoints(cell.x, cell.y, geom.radius * 0.96, lattice);
    if (lattice.shape === 'hex') {
      return {
        start: points[modulo(dir - 1, lattice.sides)],
        end: points[modulo(dir, lattice.sides)]
      };
    }
    return {
      start: points[(dir + 1) % 4],
      end: points[(dir + 2) % 4]
    };
  }

  function edgeSegmentFromIndex(geom, index, dir) {
    const cell = geom.cells[index];
    if (!cell) return null;
    return edgeSegment(geom, cell.row, cell.col, dir);
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

  function tilePoints(x, y, radius, lattice) {
    return lattice && lattice.shape === 'hex'
      ? hexPoints(x, y, radius, lattice)
      : squarePoints(x, y, radius);
  }

  function neighbor(row, col, dir, preset) {
    const lattice = latticeForPreset(preset);
    if (lattice.shape === 'hex') return hexNeighbor(row, col, dir, preset.rows, preset.cols);
    const nextRow = row + OFFSETS[dir][0];
    const nextCol = col + OFFSETS[dir][1];
    if (nextRow < 1 || nextRow > preset.rows || nextCol < 1 || nextCol > preset.cols) return null;
    return { row: nextRow, col: nextCol };
  }

  function hexNeighbor(row, col, dir, rows, cols) {
    const axial = offsetToAxial(row - 1, col - 1);
    const delta = HEX_AXIAL_DELTAS[dir];
    if (!delta) return null;
    const nextQ = axial.q + delta[0];
    const nextR = axial.r + delta[1];
    const nextRow = nextR;
    const nextCol = nextQ + Math.floor(nextR / 2);
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
    return { row: nextRow + 1, col: nextCol + 1 };
  }

  function offsetToAxial(row, col) {
    return {
      q: col - Math.floor(row / 2),
      r: row
    };
  }

  function normalizeBoundaryEdge(edge, cols) {
    return {
      row: edge.row,
      col: edge.col,
      dir: edge.dir,
      index: indexOf(edge.row, edge.col, cols)
    };
  }

  function gluedEdgeKeySet(preset) {
    const keys = new Set();
    preset.gluedEdges.forEach((pair) => {
      keys.add(boundaryEdgeKey(pair.first, preset.cols));
      keys.add(boundaryEdgeKey(pair.second, preset.cols));
    });
    return keys;
  }

  function cutEdgeKeySet(preset) {
    const keys = new Set();
    preset.cutEdges.forEach((edge) => {
      keys.add(cutKey(indexOf(edge.left.row, edge.left.col, preset.cols), indexOf(edge.right.row, edge.right.col, preset.cols)));
    });
    return keys;
  }

  function boundaryEdgeKey(edge, cols) {
    return `${indexOf(edge.row, edge.col, cols)}:${edge.dir}`;
  }

  function cutKey(left, right) {
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function glueFirstArrowReversed(pair) {
    if (Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed')) return !!pair.firstArrowReversed;
    return !!pair.reversed;
  }

  function glueSecondArrowReversed(pair) {
    if (Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed')) return !!pair.secondArrowReversed;
    return true;
  }

  function glueColor(pair) {
    return GLUE_COLORS[((pair.group || 0) % GLUE_COLORS.length + GLUE_COLORS.length) % GLUE_COLORS.length];
  }

  function hoveredGlueBoundaryAtPoint(preset, geom, point, options = {}) {
    if (!preset || !geom || !point || !Array.isArray(preset.gluedEdges)) return null;
    const threshold = Number.isFinite(options.threshold)
      ? Math.max(0, options.threshold)
      : Math.max(8, (geom.radius || 0) * 0.2);
    let best = null;
    preset.gluedEdges.forEach((pair, pairIndex) => {
      [
        { half: 'first', edge: pair.first },
        { half: 'second', edge: pair.second }
      ].forEach((entry) => {
        if (!entry.edge) return;
        const segment = edgeSegment(geom, entry.edge.row, entry.edge.col, entry.edge.dir);
        if (!segment) return;
        const distance = pointSegmentDistance(point, segment.start, segment.end);
        if (distance > threshold) return;
        if (best && distance >= best.distance) return;
        best = {
          group: Number.isInteger(pair.group) ? pair.group : null,
          groupKey: gluePairGroupKey(pair, pairIndex),
          edgeKey: boundaryEdgeKey(entry.edge, preset.cols),
          pairIndex,
          half: entry.half,
          presetKey: glueHoverPresetKey(preset),
          distance,
          threshold
        };
      });
    });
    return best;
  }

  function hoveredGlueEdgeKeys(preset, hover) {
    const keys = new Set();
    if (!preset || !hover || !Array.isArray(preset.gluedEdges)) return keys;
    preset.gluedEdges.forEach((pair, pairIndex) => {
      if (gluePairGroupKey(pair, pairIndex) !== hover.groupKey) return;
      keys.add(boundaryEdgeKey(pair.first, preset.cols));
      keys.add(boundaryEdgeKey(pair.second, preset.cols));
    });
    return keys;
  }

  function activeGlueHoverForPreset(preset, hover) {
    if (!preset || !hover || hover.presetKey !== glueHoverPresetKey(preset)) return null;
    return hoveredGlueEdgeKeys(preset, hover).has(hover.edgeKey) ? hover : null;
  }

  function glueHoverPresetKey(preset) {
    if (!preset) return '';
    const glueSignature = Array.isArray(preset.gluedEdges)
      ? preset.gluedEdges.map((pair) => `${boundaryEdgeKey(pair.first, preset.cols)}>${boundaryEdgeKey(pair.second, preset.cols)}#${pair.group}`)
        .join('|')
      : '';
    return `${preset.id || ''}|${preset.rows || 0}|${preset.cols || 0}|${glueSignature}`;
  }

  function gluePairGroupKey(pair, pairIndex) {
    return Number.isInteger(pair && pair.group) ? `group:${pair.group}` : `pair:${pairIndex}`;
  }

  function pointSegmentDistance(point, start, end) {
    if (!point || !start || !end) return Infinity;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = (dx * dx) + (dy * dy);
    if (lengthSquared <= 0.000001) return Math.hypot(point.x - start.x, point.y - start.y);
    const t = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / lengthSquared));
    return Math.hypot(point.x - (start.x + (t * dx)), point.y - (start.y + (t * dy)));
  }

  function indexOf(row, col, cols) {
    return (row - 1) * cols + (col - 1);
  }

  function rowCol(index, cols) {
    return {
      row: Math.floor(index / cols) + 1,
      col: (index % cols) + 1
    };
  }

  function drawBackgroundBoundarySegment(ctx, segment) {
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }

  function drawSegmentArrow(ctx, segment, reverse, color, lineWidth, radius) {
    const start = reverse ? segment.end : segment.start;
    const end = reverse ? segment.start : segment.end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return;
    const ux = dx / length;
    const uy = dy / length;
    const size = Math.max(5.5, radius * 0.15);
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

  function lerpPoint(from, to, progress) {
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress
    };
  }

  function dirVector(dir, length, lattice = LATTICES.square) {
    const angle = lattice.angles[modulo(dir, lattice.sides)] || 0;
    return {
      x: Math.cos(angle) * length,
      y: Math.sin(angle) * length
    };
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const a = polygon[index];
      const b = polygon[previous];
      const crosses = ((a.y > point.y) !== (b.y > point.y))
        && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function modulo(value, size) {
    return ((value % size) + size) % size;
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isInteger(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  function requestFrame(callback) {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) return window.requestAnimationFrame(callback);
    return setTimeout(callback, 16);
  }

  function cancelFrame(id) {
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) window.cancelAnimationFrame(id);
    else clearTimeout(id);
  }

  function createRng(sequence) {
    let index = 0;
    return () => {
      const value = sequence[index % sequence.length];
      index += 1;
      return value;
    };
  }

  function stateSummary(state) {
    if (isGomokuGame(state)) {
      return {
        gameMode: GAME_MODES.GOMOKU,
        stones: (state.stones || [])
          .map((stone) => ({ id: stone.id, index: stone.index, color: stone.color }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        turn: state.turn,
        winner: state.winner || '',
        winningLine: (state.winningLine || []).slice(),
        resultDismissed: !!state.resultDismissed,
        round: state.round || 0
      };
    }
    if (isConnectFourGame(state)) {
      return {
        gameMode: GAME_MODES.CONNECT_FOUR,
        tokens: (state.tokens || [])
          .map((token) => ({ id: token.id, index: token.index, color: token.color }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        holes: Array.from(state.holes || []).sort((a, b) => a - b),
        cycleHoles: Array.from(state.cycleHoles || []).sort((a, b) => a - b),
        turn: state.turn,
        fallDir: state.fallDir,
        winner: state.winner || '',
        winningLine: (state.winningLine || []).slice(),
        resultDismissed: !!state.resultDismissed,
        round: state.round || 0
      };
    }
    return {
      boxes: state.boxes
        .map((box) => ({ id: box.id, index: box.index, value: box.value }))
        .sort((a, b) => a.index - b.index || a.id - b.id),
      newBoxIds: Array.from(state.newBoxIds || []).sort((a, b) => a - b),
      removed: Array.from(state.removed).sort((a, b) => a - b),
      score: state.score,
      round: state.round,
      highest: highestValue(state)
    };
  }

  const api = {
    DIRS,
    CONNECT_FOUR_WIN_LENGTH,
    GAME_MODES,
    GOMOKU_WIN_LENGTH,
    HEX_DIRS,
    LATTICES,
    PRESETS,
    beginGame,
    beginConnectFourGame,
    beginGomokuGame,
    blastNeighborIndices,
    cloneGameState,
    connectFourCyclingHoleIndices,
    connectFourDropTarget,
    connectFourOpenHoleIndices,
    countUnmatchedBoundaries,
    createGameState,
    createConnectFourState,
    createGomokuState,
    createRng,
    directNeighborIndex,
    dirFromKey,
    directionsForPreset,
    emptyExistingIndices,
    explosionModeDirections,
    findGomokuWin,
    findConnectFourWin,
    fullBoardWithoutAdjacentMerge,
    hoveredGlueBoundaryAtPoint,
    hoveredGlueEdgeKeys,
    indexOf,
    isGameOver,
    isExplosionModeActive,
    latticeForPreset,
    placementLineRenderSegments,
    placementLineTransitionRoute,
    placeGomokuStone,
    placeConnectFourToken,
    presetFromImportPayload,
    presetFromImportText,
    rowCol,
    simulateRound,
    spawnInitialValue,
    spawnRoundValue,
    stateSummary,
    surfaceSuccessor
  };

  if (typeof window !== 'undefined') window.RamifiedMinigames = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})();
