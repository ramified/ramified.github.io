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
      ArrowUp: DIRS.N,
      KeyD: DIRS.E,
      KeyS: DIRS.S,
      KeyA: DIRS.W,
      KeyW: DIRS.N
    },
    hexagonal: {
      ArrowRight: HEX_DIRS.E,
      ArrowLeft: HEX_DIRS.W
    }
  };
  // Dormant legacy mapping from the old WEADZX hex controls; active hex movement uses arrow chords.
  const LEGACY_HEX_LETTER_DIRS = {
    KeyW: HEX_DIRS.NW,
    KeyE: HEX_DIRS.NE,
    KeyA: HEX_DIRS.W,
    KeyD: HEX_DIRS.E,
    KeyZ: HEX_DIRS.SW,
    KeyX: HEX_DIRS.SE
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
  const SWIPE_MIN_DISTANCE = 10;
  const GAME_MODES = {
    NUMBER_2048: '2048',
    GOMOKU: 'gomoku',
    CONNECT_FOUR: 'connect-four',
    GO: 'go',
    REVERSI: 'reversi',
    CHINESE_CHECKERS: 'chinese-checkers',
    SOKOBAN: 'sokoban'
  };
  const BOUNDARY_GLUE_BOARD_PRESET_ID = 'boundary-glue-board';
  const BOUNDARY_GLUE_MODES = {
    TORUS: 'torus',
    KLEIN_BOTTLE: 'klein-bottle',
    RP2: 'rp2',
    OPEN: 'open',
    RANDOM: 'random'
  };
  const BOUNDARY_GLUE_MODE_LABELS = {
    [BOUNDARY_GLUE_MODES.TORUS]: 'torus',
    [BOUNDARY_GLUE_MODES.KLEIN_BOTTLE]: 'Klein bottle',
    [BOUNDARY_GLUE_MODES.RP2]: 'RP^2',
    [BOUNDARY_GLUE_MODES.OPEN]: 'open/classic',
    [BOUNDARY_GLUE_MODES.RANDOM]: 'random boundary glue'
  };
  const BOUNDARY_GLUE_MIN_BOARD_SIZE = 2;
  const BOUNDARY_GLUE_MAX_BOARD_SIZE = 25;
  const SOKOBAN_DECORATION_FIELDS = ['players', 'boxes', 'targets', 'walls', 'ice', 'energyBridges'];
  const SOKOBAN_OBJECT_SCALE_DEFAULT = 70;
  const SOKOBAN_OBJECT_SCALE_MIN = 54;
  const SOKOBAN_OBJECT_SCALE_MAX = 96;
  const SOKOBAN_ENERGY_GLOW_INNER_DEFAULT = 55;
  const SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT = 82;
  const SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT = 38;
  const SOKOBAN_BEAM_WIDTH_DEFAULT = 70;
  const SOKOBAN_BEAM_OPACITY_DEFAULT = 34;
  const GOMOKU_WIN_LENGTH = 5;
  const GOMOKU_COLORS = ['black', 'white'];
  const GOMOKU_DEFAULT_BOARD_SIZE = 15;
  const GOMOKU_MIN_BOARD_SIZE = 5;
  const GOMOKU_MAX_BOARD_SIZE = 25;
  const OFFICIAL_GOMOKU_DEFAULT_WIN_LENGTH_PRESETS = new Set(['gomoku-tic-tac-toe']);
  const GO_COLORS = ['black', 'white'];
  const GO_DEFAULT_KOMI = 6.5;
  const GO_SCORING_METHODS = ['influence', 'nearest'];
  const GO_SCORING_METHOD_DEFAULT = 'influence';
  const REVERSI_COLORS = ['black', 'white'];
  const REVERSI_DEFAULT_BOARD_SIZE = 8;
  const REVERSI_MIN_BOARD_SIZE = 4;
  const REVERSI_MAX_BOARD_SIZE = 24;
  const CHINESE_CHECKERS_DEFAULT_COLORS = ['red', 'yellow'];
  const CHINESE_CHECKERS_MOVE_TIME_DEFAULT = 100;
  const CHINESE_CHECKERS_JUMP_PAUSE_DEFAULT = 120;
  const REVERSI_INVALID_MARK_DURATION = 460;
  const PLACEMENT_KNOWN_COLORS = ['black', 'white', 'red', 'yellow', 'blue', 'green'];
  const PLACEMENT_COLOR_ORDER = new Map(PLACEMENT_KNOWN_COLORS.map((color, index) => [color, index]));
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

  function connectFourTopRowHoles(cols) {
    return Array.from({ length: cols }, (_, index) => ({ row: 1, col: index + 1 }));
  }

  const PRESET_FOLDER_URL = 'ramified_minigame_presets/';
  const PRESET_GROUP_ORDER = ['2048', 'Gomoku', 'Connect Four', 'Go', 'Reversi', 'Chinese Checkers', 'Sokoban'];

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

  const PRESETS = [];
  let presetRegistry = [];
  let presetDefaultByMode = {};
  let presetGameModeOrder = [];
  let presetCatalogReady = false;
  let presetCatalogError = '';

  const IMPORTED_PRESET_ID = 'imported-preset';
  const IMPORT_PRESET_CHOICE_ID = 'import-preset';
  const RANDOM_GAME_MODE_CHOICE_ID = '__random-game-setup';
  const RANDOM_PRESET_CHOICE_ID = '__random-preset';
  const MIN_IMPORTED_BOARD = 1;
  const MAX_IMPORTED_BOARD = 25;

  const refs = {};
  let game = null;
  let geometry = null;
  let currentAnimation = null;
  let placementFeedbacks = [];
  let placementFeedbackFrameId = null;
  let eventQueue = [];
  let eventIndex = 0;
  let stepPaused = false;
  let animationFrameId = null;
  let debugMode = false;
  let undoStack = [];
  let redoStack = [];
  let importedPreset = null;
  let noMoveDirs = new Set();
  let eventQueueChangedBoard = false;
  let pendingBonusGameOver = false;
  let hoveredGlue = null;
  let swipeGesture = null;
  let suppressNextCanvasClick = false;
  let suppressCanvasClickTimer = null;
  let heldArrowKeys = new Set();
  let activeHexVerticalKey = null;
  let chineseCheckersSelectedPlayers = null;
  let chineseCheckersSelectedPlayersPresetKey = '';

  function init() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.gameMode = document.getElementById('game-mode-select');
    refs.select = document.getElementById('surface-preset-select');
    refs.importToggle = document.getElementById('import-preset-toggle');
    refs.importTools = document.getElementById('import-preset-tools');
    refs.importKeepGameMode = document.getElementById('import-keep-game-mode');
    refs.importGameMode = document.getElementById('import-game-mode');
    refs.importSource = document.getElementById('import-preset-source');
    refs.importCatalogRow = document.getElementById('import-preset-catalog-row');
    refs.importCatalog = document.getElementById('import-preset-catalog');
    refs.importInput = document.getElementById('import-preset-input');
    refs.applyImportPreset = document.getElementById('apply-import-preset');
    refs.placementDisplayRow = document.getElementById('gomoku-display-row');
    refs.gomokuDisplay = document.getElementById('gomoku-display-style');
    refs.gomokuSizeRow = document.getElementById('gomoku-size-row');
    refs.gomokuSize = document.getElementById('gomoku-board-size');
    refs.boundaryGlueModeRow = document.getElementById('boundary-glue-mode-row');
    refs.boundaryGlueMode = document.getElementById('boundary-glue-mode');
    refs.boundaryGlueShapeRow = document.getElementById('boundary-glue-shape-row');
    refs.boundaryGlueShape = document.getElementById('boundary-glue-shape');
    refs.boundaryGlueRectRow = document.getElementById('boundary-glue-rect-row');
    refs.boundaryGlueRows = document.getElementById('boundary-glue-rows');
    refs.boundaryGlueCols = document.getElementById('boundary-glue-cols');
    refs.goKomiRow = document.getElementById('go-komi-row');
    refs.goKomi = document.getElementById('go-komi');
    refs.goActionRow = document.getElementById('go-action-row');
    refs.goPass = document.getElementById('go-pass');
    refs.goScoreView = document.getElementById('go-score-view');
    refs.goScoringMethod = document.getElementById('go-scoring-method');
    refs.goMarkDead = document.getElementById('go-mark-dead');
    refs.goEditTerritory = document.getElementById('go-edit-territory');
    refs.goScoreCompareRow = document.getElementById('go-score-compare-row');
    refs.goScoreCompare = document.getElementById('go-score-compare');
    refs.goConfirmScore = document.getElementById('go-confirm-score');
    refs.connectFourFall = document.getElementById('connect-four-fall-dir');
    refs.connectFourAlignFall = document.getElementById('connect-four-align-fall');
    refs.chineseCheckersMoveTime = document.getElementById('chinese-checkers-move-time');
    refs.chineseCheckersMoveTimeValue = document.getElementById('chinese-checkers-move-time-value');
    refs.chineseCheckersJumpPause = document.getElementById('chinese-checkers-jump-pause');
    refs.chineseCheckersJumpPauseValue = document.getElementById('chinese-checkers-jump-pause-value');
    refs.chineseCheckersFullHints = document.getElementById('chinese-checkers-full-hints');
    refs.chineseCheckersPlayerOptions = document.getElementById('chinese-checkers-player-options');
    refs.chineseCheckersEndJumpRow = document.getElementById('chinese-checkers-end-jump-row');
    refs.chineseCheckersEndJump = document.getElementById('chinese-checkers-end-jump');
    refs.boxStyle = document.getElementById('number-box-style');
    refs.highlightNewBoxes = document.getElementById('highlight-new-boxes');
    refs.begin = document.getElementById('begin-game');
    refs.canvasStartOverlay = document.getElementById('canvas-start-overlay');
    refs.canvasStartTitle = document.getElementById('canvas-start-title');
    refs.canvasStartContext = document.getElementById('canvas-start-context');
    refs.canvasStartRules = document.getElementById('canvas-start-rules');
    refs.canvasStartBegin = document.getElementById('canvas-start-begin');
    refs.setupAlert = document.getElementById('game-setup-alert');
    refs.speed = document.getElementById('animation-speed');
    refs.speedValue = document.getElementById('animation-speed-value');
    refs.stepMode = document.getElementById('step-mode');
    refs.nextStep = document.getElementById('next-step');
    refs.debugToggle = document.getElementById('debug-toggle');
    refs.debugTools = document.getElementById('debug-tools');
    refs.debugTileValue = document.getElementById('debug-tile-value');
    refs.sokobanObjectSize = document.getElementById('sokoban-object-size');
    refs.sokobanObjectSizeValue = document.getElementById('sokoban-object-size-value');
    refs.sokobanGlowInner = document.getElementById('sokoban-glow-inner');
    refs.sokobanGlowInnerValue = document.getElementById('sokoban-glow-inner-value');
    refs.sokobanGlowOuter = document.getElementById('sokoban-glow-outer');
    refs.sokobanGlowOuterValue = document.getElementById('sokoban-glow-outer-value');
    refs.sokobanGlowBlur = document.getElementById('sokoban-glow-blur');
    refs.sokobanGlowBlurValue = document.getElementById('sokoban-glow-blur-value');
    refs.sokobanBeamWidth = document.getElementById('sokoban-beam-width');
    refs.sokobanBeamWidthValue = document.getElementById('sokoban-beam-width-value');
    refs.sokobanBeamOpacity = document.getElementById('sokoban-beam-opacity');
    refs.sokobanBeamOpacityValue = document.getElementById('sokoban-beam-opacity-value');
    refs.undo = document.getElementById('undo-step');
    refs.redo = document.getElementById('redo-step');
    refs.exportState = document.getElementById('export-state');
    refs.importState = document.getElementById('import-state');
    refs.debugExport = document.getElementById('debug-export-output');
    refs.exportStateKind = document.getElementById('export-state-kind');
    refs.exportBackgroundFormatRow = document.getElementById('export-background-format-row');
    refs.exportBackgroundFormat = document.getElementById('export-background-format');
    refs.moveButtons = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-move-dir]')) : [];
    refs.moveGroups = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-move-lattice]')) : [];
    refs.moveRow = document.getElementById('move-row');
    refs.mode2048Controls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="2048"]')) : [];
    refs.modeGomokuControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="gomoku"]')) : [];
    refs.modeConnectFourControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="connect-four"]')) : [];
    refs.modeGoControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="go"]')) : [];
    refs.modeChineseCheckersControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="chinese-checkers"]')) : [];
    refs.modeSokobanControls = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-mode-control="sokoban"]')) : [];
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
    bindCards();
    if (!refs.canvas || !refs.ctx || !refs.select) return;

    if (refs.gameMode) refs.gameMode.addEventListener('change', handleGameModeChange);
    refs.select.addEventListener('change', handlePresetSelectChange);
    if (refs.importToggle) refs.importToggle.addEventListener('click', toggleImportTools);
    if (refs.importKeepGameMode) refs.importKeepGameMode.addEventListener('change', syncImportExportControls);
    if (refs.importGameMode) refs.importGameMode.addEventListener('change', syncImportExportControls);
    if (refs.importSource) refs.importSource.addEventListener('change', syncImportExportControls);
    if (refs.applyImportPreset) refs.applyImportPreset.addEventListener('click', importPresetFromUi);
    if (refs.gomokuDisplay) refs.gomokuDisplay.addEventListener('change', render);
    if (refs.gomokuSize) refs.gomokuSize.addEventListener('change', handleGomokuSizeChange);
    if (refs.gomokuSize) refs.gomokuSize.addEventListener('input', handleGomokuSizeChange);
    if (refs.boundaryGlueMode) refs.boundaryGlueMode.addEventListener('change', handleBoundaryGlueBoardChange);
    if (refs.boundaryGlueShape) refs.boundaryGlueShape.addEventListener('change', handleBoundaryGlueShapeChange);
    [refs.boundaryGlueRows, refs.boundaryGlueCols].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', handleBoundaryGlueBoardChange);
      input.addEventListener('input', handleBoundaryGlueBoardChange);
    });
    if (refs.goKomi) refs.goKomi.addEventListener('change', handleGoKomiChange);
    if (refs.goKomi) refs.goKomi.addEventListener('input', handleGoKomiChange);
    if (refs.goPass) refs.goPass.addEventListener('click', passGoFromUi);
    if (refs.goScoreView) refs.goScoreView.addEventListener('change', handleGoScoreViewChange);
    if (refs.goScoringMethod) refs.goScoringMethod.addEventListener('change', handleGoScoringMethodChange);
    if (refs.goMarkDead) refs.goMarkDead.addEventListener('change', handleGoMarkDeadChange);
    if (refs.goEditTerritory) refs.goEditTerritory.addEventListener('change', handleGoEditTerritoryChange);
    if (refs.goConfirmScore) refs.goConfirmScore.addEventListener('click', confirmGoScoreFromUi);
    if (refs.connectFourFall) refs.connectFourFall.addEventListener('change', handleConnectFourFallChange);
    if (refs.connectFourAlignFall) refs.connectFourAlignFall.addEventListener('change', handleConnectFourAlignFallChange);
    if (refs.chineseCheckersMoveTime) refs.chineseCheckersMoveTime.addEventListener('input', syncChineseCheckersTimingOutput);
    if (refs.chineseCheckersJumpPause) refs.chineseCheckersJumpPause.addEventListener('input', syncChineseCheckersTimingOutput);
    if (refs.chineseCheckersFullHints) refs.chineseCheckersFullHints.addEventListener('change', handleChineseCheckersFullHintsChange);
    if (refs.chineseCheckersPlayerOptions) refs.chineseCheckersPlayerOptions.addEventListener('change', handleChineseCheckersPlayerOptionsChange);
    if (refs.chineseCheckersEndJump) refs.chineseCheckersEndJump.addEventListener('click', endChineseCheckersJumpFromUi);
    if (refs.boxStyle) refs.boxStyle.addEventListener('change', render);
    if (refs.highlightNewBoxes) refs.highlightNewBoxes.addEventListener('change', render);
    if (refs.begin) refs.begin.addEventListener('click', beginGameFromUi);
    if (refs.canvasStartBegin) refs.canvasStartBegin.addEventListener('click', handleCanvasStartBeginClick);
    if (refs.speed) refs.speed.addEventListener('input', syncSpeedOutput);
    if (refs.stepMode) refs.stepMode.addEventListener('change', syncControls);
    if (refs.sokobanObjectSize) refs.sokobanObjectSize.addEventListener('input', () => {
      syncSokobanObjectSizeOutput();
      render();
    });
    [refs.sokobanGlowInner, refs.sokobanGlowOuter, refs.sokobanGlowBlur].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        syncSokobanEnergyGlowOutput();
        render();
      });
    });
    [refs.sokobanBeamWidth, refs.sokobanBeamOpacity].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        syncSokobanBeamOutput();
        render();
      });
    });
    if (refs.nextStep) refs.nextStep.addEventListener('click', playNextStep);
    if (refs.debugToggle) refs.debugToggle.addEventListener('click', toggleDebugMode);
    if (refs.undo) refs.undo.addEventListener('click', undoPreviousStep);
    if (refs.redo) refs.redo.addEventListener('click', redoPreviousUndo);
    if (refs.exportState) refs.exportState.addEventListener('click', exportFromUi);
    if (refs.importState) refs.importState.addEventListener('click', importDebugState);
    if (refs.exportStateKind) refs.exportStateKind.addEventListener('change', syncImportExportControls);
    if (refs.exportBackgroundFormat) refs.exportBackgroundFormat.addEventListener('change', syncImportExportControls);
    if (refs.canvas) {
      refs.canvas.addEventListener('click', handleCanvasClick);
      refs.canvas.addEventListener('mousemove', handleCanvasHover);
      refs.canvas.addEventListener('mouseleave', clearGlueHover);
      refs.canvas.addEventListener('blur', clearGlueHover);
      refs.canvas.addEventListener('pointerdown', handleCanvasPointerDown);
      refs.canvas.addEventListener('pointermove', handleCanvasPointerMove);
      refs.canvas.addEventListener('pointerup', handleCanvasPointerUp);
      refs.canvas.addEventListener('pointercancel', handleCanvasPointerCancel);
      refs.canvas.addEventListener('lostpointercapture', handleCanvasLostPointerCapture);
    }
    refs.moveButtons.forEach((button) => {
      button.addEventListener('click', () => handleDirectionalButton(button));
    });
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);
    window.addEventListener('blur', clearKeyboardState);
    window.addEventListener('resize', render);

    syncSpeedOutput();
    syncSokobanObjectSizeOutput();
    syncSokobanEnergyGlowOutput();
    syncSokobanBeamOutput();
    syncChineseCheckersTimingOutput();
    syncDebugModeUi();
    setPresetSelectLoading();
    const catalogLoad = ensurePresetCatalogLoaded();
    if (catalogLoad && typeof catalogLoad.then === 'function') {
      catalogLoad
        .then(finishPresetCatalogInit)
        .catch(handlePresetCatalogError);
    } else {
      finishPresetCatalogInit();
    }
  }

  function bindCards() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    document.querySelectorAll('.card-head').forEach((head) => {
      head.addEventListener('click', (event) => {
        if (event.target && event.target.closest && event.target.closest('button,input,select,textarea,a')) return;
        const card = head.closest ? head.closest('.card') : null;
        if (card) card.classList.toggle('collapsed');
      });
    });
  }

  function resetToPreview() {
    hideCanvasStartPrompt();
    if (!presetCatalogReady || !PRESETS.length) {
      game = null;
      geometry = null;
      clearCanvas();
      syncStatus('loading presets', presetCatalogError || 'loading ramified minigame presets', presetCatalogError ? 'error' : 'setup');
      syncControls();
      return;
    }
    stopPlayback();
    resetSwipeGesture();
    clearSuppressedCanvasClick();
    clearKeyboardState();
    game = createSelectedGameState(selectedPreset(), selectedGameOptions({ glueRng: Math.random }));
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

  function finishPresetCatalogInit() {
    syncGameModeSelectOptions();
    syncImportGameModeSelectOptions();
    if (importPresetFromUrlParams()) return;
    if (applyRandomSetupChoice(randomSetupChoice(), { focus: false })) return;
    syncBoardSizeInputForGameMode();
    const preferred = refs.select && presetSelectHasValue(refs.select.value)
      ? refs.select.value
      : defaultPresetIdForMode(selectedGameMode());
    syncPresetSelectOptions(preferred);
    resetToPreview();
  }

  function importPresetFromUrlParams() {
    if (typeof window === 'undefined' || !window.location || typeof URLSearchParams === 'undefined') return false;
    const params = new URLSearchParams(window.location.search || '');
    const encoded = params.get('minigamePreset');
    if (!encoded) return false;
    try {
      const payload = JSON.parse(base64UrlDecodeUtf8(encoded));
      importedPreset = presetFromImportPayload(payload);
      const mode = gameModeFromUrlParam(params.get('mode')) || gameModeFromPresetGroup(importedPreset);
      applyImportedPresetMode(importedPreset, mode);
      if (refs.gameMode) refs.gameMode.value = mode;
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = importedPreset.id;
      setImportToolsVisible(false);
      resetToPreview();
      syncStatus('preset imported from link', previewInfo(game.preset), 'setup');
    } catch (error) {
      const fallback = defaultPresetIdForMode(selectedGameMode());
      syncPresetSelectOptions(fallback);
      resetToPreview();
      syncStatus('link import failed', error && error.message ? error.message : 'invalid minigame preset link', 'error');
    }
    return true;
  }

  function base64UrlDecodeUtf8(encoded) {
    const source = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = source + '='.repeat((4 - (source.length % 4)) % 4);
    if (typeof Buffer !== 'undefined') return Buffer.from(padded, 'base64').toString('utf8');
    if (typeof atob === 'function') {
      const binary = atob(padded);
      if (typeof TextDecoder !== 'undefined') {
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
      }
      return decodeURIComponent(Array.from(binary, (char) => (
        `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
      )).join(''));
    }
    throw new Error('base64url decoding is unavailable');
  }

  function gameModeFromUrlParam(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === GAME_MODES.CHINESE_CHECKERS || mode === 'chinesecheckers' || mode === 'chinese checkers') return GAME_MODES.CHINESE_CHECKERS;
    if (mode === GAME_MODES.SOKOBAN) return GAME_MODES.SOKOBAN;
    if (mode === GAME_MODES.CONNECT_FOUR || mode === 'connectfour' || mode === 'connect four') return GAME_MODES.CONNECT_FOUR;
    if (mode === GAME_MODES.REVERSI || mode === 'othello') return GAME_MODES.REVERSI;
    if (mode === GAME_MODES.GOMOKU) return GAME_MODES.GOMOKU;
    if (mode === GAME_MODES.GO) return GAME_MODES.GO;
    if (mode === GAME_MODES.NUMBER_2048 || mode === 'number-2048' || mode === '2048') return GAME_MODES.NUMBER_2048;
    return '';
  }

  function gameModeFromPresetGroup(preset) {
    const gameTypes = presetGameTypesForModes(preset);
    const gameType = String(gameTypes[0] || '').trim().toLowerCase();
    if (gameType.includes('sokoban')) return GAME_MODES.SOKOBAN;
    if (gameType.includes('chinese')) return GAME_MODES.CHINESE_CHECKERS;
    if (gameType.includes('connect')) return GAME_MODES.CONNECT_FOUR;
    if (gameType.includes('reversi') || gameType.includes('othello')) return GAME_MODES.REVERSI;
    if (gameType.includes('gomoku')) return GAME_MODES.GOMOKU;
    if (gameType === 'go') return GAME_MODES.GO;
    return GAME_MODES.NUMBER_2048;
  }

  function gameModesForPreset(preset) {
    const modes = [];
    presetGameTypesForModes(preset).forEach((gameType) => {
      const mode = gameTypeToGameMode(gameType);
      if (!modes.includes(mode)) modes.push(mode);
    });
    return modes.length ? modes : [GAME_MODES.NUMBER_2048];
  }

  function gameTypeToGameMode(gameType) {
    const normalized = String(gameType || '').trim().toLowerCase();
    if (normalized.includes('sokoban')) return GAME_MODES.SOKOBAN;
    if (normalized.includes('chinese')) return GAME_MODES.CHINESE_CHECKERS;
    if (normalized.includes('connect')) return GAME_MODES.CONNECT_FOUR;
    if (normalized.includes('reversi') || normalized.includes('othello')) return GAME_MODES.REVERSI;
    if (normalized.includes('gomoku')) return GAME_MODES.GOMOKU;
    if (normalized === 'go') return GAME_MODES.GO;
    return GAME_MODES.NUMBER_2048;
  }

  function presetGameTypesForModes(preset, options = {}) {
    if (!preset) return ['2048'];
    if (
      options.allowEmpty
      && Array.isArray(preset.gameTypes)
      && !preset.gameTypes.length
      && preset.groups == null
      && preset.group == null
    ) {
      return [];
    }
    return cleanPresetGameTypes(preset.gameTypes, preset.groups, preset.group);
  }

  function gameTypeForGameMode(mode) {
    if (mode === GAME_MODES.SOKOBAN) return 'Sokoban';
    if (mode === GAME_MODES.CHINESE_CHECKERS) return 'Chinese Checkers';
    if (mode === GAME_MODES.REVERSI) return 'Reversi';
    if (mode === GAME_MODES.GO) return 'Go';
    if (mode === GAME_MODES.GOMOKU) return 'Gomoku';
    if (mode === GAME_MODES.CONNECT_FOUR) return 'Connect Four';
    return '2048';
  }

  function handlePresetCatalogError(error) {
    presetCatalogReady = false;
    presetCatalogError = error && error.message ? error.message : 'could not load presets';
    syncStatus('preset load failed', presetCatalogError, 'error');
    syncControls();
  }

  function clearCanvas() {
    if (!refs.canvas || !refs.ctx) return;
    refs.canvas.width = Math.max(1, refs.canvas.clientWidth || 720);
    refs.canvas.height = Math.max(1, refs.canvas.clientHeight || 360);
    refs.ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);
  }

  function ensurePresetCatalogLoaded() {
    if (presetCatalogReady) return null;
    const globalItems = globalPresetCatalogItems();
    if (globalItems) {
      installPresetCatalog(globalItems);
      return null;
    }
    const nodeItems = loadNodePresetCatalogItems();
    if (nodeItems) {
      installPresetCatalog(nodeItems);
      return null;
    }
    return loadBrowserPresetCatalogItems().then((items) => {
      installPresetCatalog(items);
    });
  }

  function installPresetCatalog(catalogInput) {
    const catalog = normalizePresetCatalogItems(catalogInput);
    const items = catalog.items;
    const seen = new Set();
    const nextPresets = [];
    const nextRegistry = [];
    items.forEach((item) => {
      if (!item || !item.entry || !item.spec) return;
      const preset = normalizePresetPayload(item.spec, { registryEntry: item.entry });
      if (!preset.id || seen.has(preset.id)) return;
      seen.add(preset.id);
      nextPresets.push(preset);
      nextRegistry.push(item.entry);
    });
    if (!nextPresets.length) throw new Error('No ramified minigame presets were loaded.');
    PRESETS.splice(0, PRESETS.length, ...nextPresets);
    presetRegistry = nextRegistry;
    presetDefaultByMode = resolvePresetDefaultMap(catalog.defaultFor, nextPresets);
    presetGameModeOrder = orderedCatalogGameModes(catalog.defaultFor, nextPresets, catalog.gameOrder);
    presetCatalogReady = true;
    presetCatalogError = '';
  }

  function globalPresetCatalogItems() {
    const root = presetRoot();
    const catalog = normalizeMinigamePresetCatalog(root.RAMIFIED_MINIGAME_PRESETS);
    const registry = catalog.entries;
    if (!registry.length) return null;
    const items = [];
    for (const entry of registry) {
      const spec = readPreloadedPresetSpec(entry);
      if (!spec) return null;
      items.push({ entry, spec });
    }
    return { items, defaultFor: catalog.defaultFor, gameOrder: catalog.gameOrder };
  }

  function loadBrowserPresetCatalogItems() {
    if (typeof document === 'undefined' || !document.createElement) {
      return Promise.reject(new Error('Preset loading requires a browser document or Node require.'));
    }
    const root = presetRoot();
    const catalog = normalizeMinigamePresetCatalog(root.RAMIFIED_MINIGAME_PRESETS);
    const registry = catalog.entries;
    if (!registry.length) {
      return Promise.reject(new Error('No presets are registered in ramified_minigame_presets/presets.js.'));
    }
    return Promise.all(registry.map((entry) => loadBrowserPresetSpec(entry).then((spec) => ({ entry, spec }))))
      .then((items) => ({ items, defaultFor: catalog.defaultFor, gameOrder: catalog.gameOrder }));
  }

  function loadBrowserPresetSpec(entry) {
    const preloaded = readPreloadedPresetSpec(entry);
    if (preloaded) return Promise.resolve(preloaded);
    if (!entry.file) return Promise.reject(new Error(`Preset "${entry.label}" has no file.`));
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${PRESET_FOLDER_URL}${presetUrlPath(entry.file)}`;
      script.onload = () => {
        const spec = readPreloadedPresetSpec(entry);
        if (spec) resolve(spec);
        else reject(new Error(`Preset file loaded, but did not register key "${entry.key}".`));
      };
      script.onerror = () => reject(new Error(`Could not load ${entry.file}.`));
      document.head.appendChild(script);
    });
  }

  function readPreloadedPresetSpec(entry) {
    if (!entry) return null;
    if (entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data)) return entry.data;
    if (entry.json) return JSON.parse(entry.json);
    const root = presetRoot();
    const store = root.RAMIFIED_MINIGAME_PRESET_DATA;
    return store && store[entry.key] && typeof store[entry.key] === 'object' && !Array.isArray(store[entry.key])
      ? store[entry.key]
      : null;
  }

  function loadNodePresetCatalogItems() {
    if (typeof module === 'undefined' || !module.exports || typeof require !== 'function' || typeof __dirname !== 'string') {
      return null;
    }
    const path = require('path');
    const folder = path.join(__dirname, '..', PRESET_FOLDER_URL);
    const catalog = normalizeMinigamePresetCatalog(require(path.join(folder, 'presets.js')));
    return {
      defaultFor: catalog.defaultFor,
      gameOrder: catalog.gameOrder,
      items: catalog.entries.map((entry) => ({
        entry,
        spec: entry.data || (entry.json ? JSON.parse(entry.json) : require(path.join(folder, entry.file)))
      }))
    };
  }

  function normalizePresetCatalogItems(catalogInput) {
    if (Array.isArray(catalogInput)) return { items: catalogInput, defaultFor: {}, gameOrder: [] };
    if (catalogInput && typeof catalogInput === 'object') {
      return {
        items: Array.isArray(catalogInput.items) ? catalogInput.items : [],
        defaultFor: catalogInput.defaultFor && typeof catalogInput.defaultFor === 'object' ? catalogInput.defaultFor : {},
        gameOrder: normalizePresetGameOrder(catalogInput.gameOrder, catalogInput.defaultFor)
      };
    }
    return { items: [], defaultFor: {}, gameOrder: [] };
  }

  function normalizeMinigamePresetCatalog(registry) {
    const source = registry && typeof registry === 'object' && !Array.isArray(registry)
      ? registry
      : { presets: registry };
    return {
      entries: normalizeMinigamePresetRegistry(source.presets),
      defaultFor: normalizePresetDefaultMap(source.defaultFor),
      gameOrder: normalizePresetGameOrder(source.gameOrder, source.defaultFor)
    };
  }

  function normalizePresetGameOrder(value, defaultFor = null) {
    const ordered = [];
    const pushMode = (mode) => {
      const normalized = gameModeFromUrlParam(mode);
      if (normalized && !ordered.includes(normalized)) ordered.push(normalized);
    };
    if (Array.isArray(value)) value.forEach(pushMode);
    if (!ordered.length && defaultFor && typeof defaultFor === 'object' && !Array.isArray(defaultFor)) {
      Object.keys(defaultFor).forEach(pushMode);
    }
    return ordered;
  }

  function normalizeMinigamePresetRegistry(registry) {
    const rawEntries = Array.isArray(registry) ? registry : [];
    return rawEntries
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
        const id = cleanPresetId(entry.id || entry.key);
        const label = cleanPresetString(entry.label || entry.name || id || 'Preset');
        const key = cleanPresetKey(entry.key || id);
        const file = cleanPresetFile(entry.file || `${key}.preset.js`);
        if (!id || !key) return null;
        return {
          id,
          key,
          file,
          label,
          gameTypes: cleanPresetGameTypes(entry.gameTypes, entry.groups, entry.group),
          data: entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data) ? entry.data : null,
          json: cleanPresetString(entry.json || '')
        };
      })
      .filter(Boolean);
  }

  function presetRoot() {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return {};
  }

  function presetUrlPath(file) {
    return cleanPresetFile(file).split('/').map(encodeURIComponent).join('/');
  }

  function cleanPresetFile(file) {
    const value = cleanPresetString(file).replace(/\\/g, '/');
    if (!value || /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('/') || value.includes('..')) return '';
    return value.replace(/^\.?\//, '');
  }

  function cleanPresetKey(value) {
    const key = cleanPresetString(value).replace(/[^A-Za-z0-9_$]/g, '_');
    return /^[A-Za-z_$]/.test(key) ? key : '';
  }

  function cleanPresetId(value) {
    return cleanPresetString(value)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function cleanPresetString(value) {
    return String(value || '').trim();
  }

  function cleanPresetGameType(value) {
    const gameType = cleanPresetString(value);
    if (!gameType) return '2048';
    const normalized = gameType.toLowerCase();
    if (normalized === '2048' || normalized === 'number-2048') return '2048';
    if (normalized === 'gomoku') return 'Gomoku';
    if (normalized === 'go') return 'Go';
    if (normalized === 'reversi' || normalized === 'othello') return 'Reversi';
    if (normalized === 'connect-four' || normalized === 'connectfour' || normalized === 'connect four') return 'Connect Four';
    if (normalized === 'chinese-checkers' || normalized === 'chinesecheckers' || normalized === 'chinese checkers') return 'Chinese Checkers';
    if (normalized === 'sokoban') return 'Sokoban';
    return gameType;
  }

  function cleanPresetGameTypes(value, legacyGroups, legacyGroup) {
    const primary = cleanPresetGameTypeList(value);
    const legacyList = primary.length ? primary : cleanPresetGameTypeList(legacyGroups);
    const raw = legacyList.length ? legacyList : cleanPresetGameTypeList(legacyGroup);
    return raw.length ? raw : ['2048'];
  }

  function cleanPresetGameTypeList(value) {
    const raw = Array.isArray(value) ? value : (value == null || value === '' ? [] : [value]);
    const gameTypes = [];
    raw.forEach((item) => {
      if (!cleanPresetString(item)) return;
      const gameType = cleanPresetGameType(item);
      if (gameType && !gameTypes.includes(gameType)) gameTypes.push(gameType);
    });
    return gameTypes;
  }

  function normalizePresetDefaultMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([rawMode, rawPresetId]) => {
      const mode = gameModeFromUrlParam(rawMode);
      const presetId = cleanPresetId(rawPresetId);
      if (mode && presetId) result[mode] = presetId;
    });
    return result;
  }

  function resolvePresetDefaultMap(defaultFor, presets) {
    const presetList = Array.isArray(presets) ? presets : [];
    const ids = new Set(presetList.map((preset) => preset.id));
    const result = {};
    Object.entries(defaultFor && typeof defaultFor === 'object' ? defaultFor : {}).forEach(([mode, presetId]) => {
      if (ids.has(presetId)) {
        result[mode] = presetId;
        return;
      }
      const requestedId = cleanPresetId(presetId);
      const requestedLabel = cleanPresetString(presetId).toLowerCase();
      const fallback = presetList.find((preset) => (
        gameModesForPreset(preset).includes(mode)
        && (
          cleanPresetId(preset.label) === requestedId
          || cleanPresetString(preset.label).toLowerCase() === requestedLabel
        )
      ));
      if (fallback) result[mode] = fallback.id;
    });
    return result;
  }

  function setPresetSelectLoading() {
    if (!refs.select) return;
    refs.select.disabled = true;
    if (!document.createElement || !refs.select.appendChild) {
      refs.select.value = '';
      return;
    }
    refs.select.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Loading presets...';
    refs.select.appendChild(option);
    refs.select.value = '';
  }

  function orderedCatalogGameModes(defaultFor = null, presets = PRESETS, gameOrder = null) {
    if (defaultFor == null && presetGameModeOrder.length) return presetGameModeOrder.slice();
    const defaultSource = defaultFor || presetDefaultByMode;
    const ordered = [];
    const pushMode = (mode) => {
      const normalized = gameModeFromUrlParam(mode);
      if (normalized && !ordered.includes(normalized)) ordered.push(normalized);
    };
    (Array.isArray(gameOrder) ? gameOrder : []).forEach(pushMode);
    Object.keys(defaultSource && typeof defaultSource === 'object' ? defaultSource : {}).forEach(pushMode);
    (Array.isArray(presets) ? presets : []).forEach((preset) => {
      gameModesForPreset(preset).forEach(pushMode);
    });
    return ordered.length ? ordered : [GAME_MODES.NUMBER_2048];
  }

  function appendSelectOption(select, value, label) {
    if (!select || !document.createElement || !select.appendChild) return null;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
    return option;
  }

  function syncGameModeSelectOptions() {
    if (!refs.gameMode) return;
    const orderedModes = orderedCatalogGameModes();
    const previous = gameModeFromUrlParam(refs.gameMode.value);
    if (document.createElement && refs.gameMode.appendChild) {
      refs.gameMode.innerHTML = '';
      orderedModes.forEach((mode) => appendSelectOption(refs.gameMode, mode, gameTypeForGameMode(mode)));
      appendSelectOption(refs.gameMode, RANDOM_GAME_MODE_CHOICE_ID, 'Random setup');
    }
    refs.gameMode.value = orderedModes.includes(previous) ? previous : (orderedModes[0] || GAME_MODES.NUMBER_2048);
  }

  function syncImportGameModeSelectOptions() {
    if (!refs.importGameMode) return;
    const orderedModes = orderedCatalogGameModes();
    const previous = gameModeFromUrlParam(refs.importGameMode.value);
    const current = selectedGameMode();
    if (document.createElement && refs.importGameMode.appendChild) {
      refs.importGameMode.innerHTML = '';
      orderedModes.forEach((mode) => appendSelectOption(refs.importGameMode, mode, gameTypeForGameMode(mode)));
    }
    refs.importGameMode.value = orderedModes.includes(previous)
      ? previous
      : (orderedModes.includes(current) ? current : (orderedModes[0] || GAME_MODES.NUMBER_2048));
  }

  function randomCatalogItem(items, rng = Math.random) {
    if (!Array.isArray(items) || !items.length) return null;
    const roll = Number((typeof rng === 'function' ? rng : Math.random)());
    const bounded = Number.isFinite(roll) ? Math.max(0, Math.min(roll, 0.999999999999)) : 0;
    return items[Math.floor(bounded * items.length)];
  }

  function randomPresetForMode(mode = selectedGameMode(), rng = Math.random) {
    return randomCatalogItem(presetListForMode(mode), rng);
  }

  function randomSetupChoice(rng = Math.random) {
    const modes = orderedCatalogGameModes().filter((mode) => presetListForMode(mode).length);
    const mode = randomCatalogItem(modes, rng);
    if (!mode) return null;
    const preset = randomPresetForMode(mode, rng);
    return preset ? { mode, preset } : null;
  }

  function applyRandomSetupChoice(choice, options = {}) {
    if (!choice || !refs.gameMode || !refs.select) return false;
    refs.gameMode.value = choice.mode;
    syncBoardSizeInputForGameMode();
    syncImportGameModeSelectOptions();
    if (refs.importGameMode) refs.importGameMode.value = choice.mode;
    syncPresetSelectOptions(choice.preset.id);
    setImportToolsVisible(false);
    resetToPreview();
    if (options.focus !== false && refs.canvas) refs.canvas.focus();
    return true;
  }

  function resolveRandomSetupFromUi(rng = Math.random) {
    return applyRandomSetupChoice(randomSetupChoice(rng));
  }

  function resolveRandomPresetFromUi(rng = Math.random) {
    const preset = randomPresetForMode(selectedGameMode(), rng);
    if (!preset || !refs.select) return false;
    refs.select.value = preset.id;
    setImportToolsVisible(false);
    resetToPreview();
    if (refs.canvas) refs.canvas.focus();
    return true;
  }

  function syncPresetSelectOptions(preferredValue) {
    if (!refs.select) return;
    const previous = preferredValue != null ? String(preferredValue) : refs.select.value;
    const mode = selectedGameMode();
    if (document.createElement && refs.select.appendChild) {
      refs.select.innerHTML = '';
      appendSelectOption(refs.select, RANDOM_PRESET_CHOICE_ID, 'Random preset');
      presetOptionGroups(mode).forEach((group) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.label;
        group.presets.forEach((preset) => {
          const option = document.createElement('option');
          option.value = preset.id;
          option.textContent = preset.label;
          optgroup.appendChild(option);
        });
        refs.select.appendChild(optgroup);
      });
      if (importedPreset && presetMatchesGameMode(importedPreset, mode)) {
        const customGroup = document.createElement('optgroup');
        customGroup.label = 'Custom';
        const importedOption = document.createElement('option');
        importedOption.value = IMPORTED_PRESET_ID;
        importedOption.textContent = importedPreset.label || 'imported preset';
        customGroup.appendChild(importedOption);
        refs.select.appendChild(customGroup);
      }
    }
    const fallback = defaultPresetIdForMode(mode) || (presetListForMode(mode)[0] && presetListForMode(mode)[0].id) || '';
    refs.select.value = presetSelectHasValue(previous) ? previous : fallback;
    refs.select.disabled = !presetCatalogReady || !PRESETS.length;
  }

  function presetOptionGroups(mode = selectedGameMode()) {
    const groups = new Map();
    presetListForMode(mode).forEach((preset) => {
      const group = presetGameTypeLabelForMode(preset, mode);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(preset);
    });
    const ordered = [];
    PRESET_GROUP_ORDER.forEach((label) => {
      if (groups.has(label)) {
        ordered.push({ label, presets: groups.get(label) });
        groups.delete(label);
      }
    });
    Array.from(groups.keys()).sort().forEach((label) => {
      ordered.push({ label, presets: groups.get(label) });
    });
    return ordered;
  }

  function presetListForMode(mode = selectedGameMode()) {
    return PRESETS.filter((preset) => presetMatchesGameMode(preset, mode));
  }

  function presetMatchesGameMode(preset, mode = selectedGameMode()) {
    return gameModesForPreset(preset).includes(mode || GAME_MODES.NUMBER_2048);
  }

  function presetGameTypeLabelForMode(preset, mode) {
    const matching = presetGameTypesForModes(preset).find((gameType) => gameTypeToGameMode(gameType) === mode);
    return cleanPresetGameType(matching || gameTypeForGameMode(mode));
  }

  function presetSelectHasValue(value) {
    if (!value) return false;
    if (value === RANDOM_PRESET_CHOICE_ID) return false;
    if (value === IMPORTED_PRESET_ID && importedPreset) return presetMatchesGameMode(importedPreset, selectedGameMode());
    if (refs.select && refs.select.options) {
      return Array.from(refs.select.options).some((option) => option.value === value);
    }
    return presetListForMode(selectedGameMode()).some((preset) => preset.id === value);
  }

  function defaultPresetIdForMode(mode) {
    const targetMode = mode || GAME_MODES.NUMBER_2048;
    if (presetDefaultByMode[targetMode]) return presetDefaultByMode[targetMode];
    const fallbackPreset = presetListForMode(targetMode)[0] || PRESETS[0];
    return (fallbackPreset && fallbackPreset.id) || '';
  }

  function beginGameFromUi() {
    hideCanvasStartPrompt();
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
    if (selectedGameMode() === GAME_MODES.SOKOBAN) {
      const preview = isSokobanGame(game) ? game : createSokobanState(selectedPreset(), selectedGameOptions({ glueRng: Math.random }));
      const issue = sokobanSetupIssue(preview);
      if (issue) {
        showSetupAlert(issue);
        syncStatus('finish Sokoban setup', issue, 'warn');
        render();
        syncControls();
        if (refs.canvas) refs.canvas.focus();
        return;
      }
    }
    stopPlayback();
    resetSwipeGesture();
    clearSuppressedCanvasClick();
    clearKeyboardState();
    game = beginSelectedGame(selectedPreset(), selectedGameOptions({
      rng: Math.random,
      glueRng: Math.random,
      holes: connectFourHoles
    }));
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
    } else if (isGoGame(game)) {
      syncStatus(`${game.preset.label} Go`, goTurnInfo(game), 'ready');
    } else if (isReversiGame(game)) {
      syncStatus(`${game.preset.label} Reversi`, reversiTurnInfo(game), 'ready');
    } else if (isChineseCheckersGame(game)) {
      syncStatus(`${game.preset.label} Chinese Checkers`, chineseCheckersTurnInfo(game), 'ready');
    } else if (isSokobanGame(game)) {
      syncStatus(`${game.preset.label} Sokoban`, sokobanTurnInfo(game), 'ready');
    } else {
      syncStatus(`${game.preset.label} game seed`, 'use arrow keys, buttons, or swipe/drag to slide', 'ready');
    }
    syncControls();
    if (refs.canvas) refs.canvas.focus();
  }

  function stopGameFromUi() {
    const previous = game;
    hideCanvasStartPrompt();
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
      resetSwipeGesture();
      clearSuppressedCanvasClick();
      clearKeyboardState();
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

  function resetCurrentGameFromShortcut() {
    if (!game) return false;
    const previous = game;
    if (previous.phase === 'setup') {
      resetToPreview();
      if (refs.canvas) refs.canvas.focus();
      return true;
    }
    hideCanvasStartPrompt();
    stopPlayback();
    resetSwipeGesture();
    clearSuppressedCanvasClick();
    clearKeyboardState();
    if (refs.gameMode) refs.gameMode.value = gameModeValue(previous);
    const options = selectedGameOptions({ rng: Math.random, glueRng: Math.random });
    if (isConnectFourGame(previous)) {
      options.holes = new Set(previous.holes || []);
      options.cycleHoles = new Set();
      options.fallDir = Number.isInteger(previous.fallDir) ? previous.fallDir : selectedConnectFourFallDir(previous.preset);
    }
    if (isGoGame(previous)) {
      options.komi = normalizeGoKomi(previous.komi);
      options.scoringMethod = normalizeGoScoringMethod(previous.scoringMethod);
    }
    if (isChineseCheckersGame(previous)) {
      options.playerColors = chineseCheckersPlayerColors(previous);
    }
    game = beginSelectedGame(previous.preset || selectedPreset(), options);
    game.phase = 'ready';
    clearUndoHistory();
    clearDebugExport();
    clearSetupAlert();
    clearNoMoveTrial();
    eventQueueChangedBoard = false;
    if (isChineseCheckersGame(game)) setChineseCheckersSelectedPlayers(chineseCheckersPlayerColors(game), game.preset);
    syncConnectFourFallInputFromGame();
    syncGoKomiInputFromGame();
    syncGoScoringMethodInputFromGame();
    render();
    syncStatus('reset complete', `${gameTypeForGameMode(gameModeValue(game))} restarted`, 'ready');
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
    return true;
  }

  function handleGameModeChange() {
    if (refs.gameMode && refs.gameMode.value === RANDOM_GAME_MODE_CHOICE_ID) {
      resolveRandomSetupFromUi();
      return;
    }
    syncBoardSizeInputForGameMode();
    syncDefaultPresetForGameMode();
    if (refs.importGameMode) refs.importGameMode.value = selectedGameMode();
    resetToPreview();
  }

  function syncDefaultPresetForGameMode() {
    if (!refs.select) return;
    syncPresetSelectOptions(defaultPresetIdForMode(selectedGameMode()));
  }

  function handleGomokuSizeChange() {
    const dimensions = selectedBoardDimensions();
    if (refs.gomokuSize) refs.gomokuSize.value = String(dimensions.rows);
    if (selectedPresetUsesDynamicBoardSize()) {
      resetToPreview();
    }
  }

  function handleBoundaryGlueShapeChange() {
    syncBoundaryGlueBoardControls();
    if (selectedPresetUsesDynamicBoardSize()) resetToPreview();
  }

  function handleBoundaryGlueBoardChange() {
    syncBoundaryGlueBoardControls();
    if (selectedPresetUsesDynamicBoardSize()) resetToPreview();
  }

  function handleGoKomiChange() {
    if (refs.goKomi) refs.goKomi.value = formatKomi(selectedGoKomi());
    if (isGoGame(game) && game.phase === 'setup') {
      game.komi = selectedGoKomi();
      syncStatusForCurrentGame();
      render();
      syncControls();
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

  function handleConnectFourAlignFallChange() {
    hoveredGlue = null;
    syncGlueHoverCursor();
    render();
  }

  function handlePresetSelectChange() {
    if (refs.select && refs.select.value === RANDOM_PRESET_CHOICE_ID) {
      resolveRandomPresetFromUi();
      return;
    }
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
    hideCanvasStartPrompt();
    if (!refs.importTools) return;
    refs.importTools.hidden = false;
    if (force && refs.importSource) refs.importSource.value = 'paste';
    if (refs.importToggle) refs.importToggle.setAttribute('aria-expanded', 'true');
    syncImportExportControls();
    if (selectedImportSource() === 'paste' && refs.importInput) refs.importInput.focus();
  }

  function toggleImportTools() {
    setImportToolsVisible(true);
  }

  function importPresetFromUi() {
    const importMode = selectedImportGameMode();
    const targetMode = shouldKeepCurrentGameModeOnImport() ? selectedGameMode() : importMode;
    try {
      if (selectedImportSource() === 'catalog') {
        const preset = resolvePreset(refs.importCatalog ? refs.importCatalog.value : defaultPresetIdForMode(importMode));
        if (shouldKeepCurrentGameModeOnImport()) {
          importedPreset = clonePreset(preset);
          applyImportedPresetMode(importedPreset, targetMode);
          ensureImportedPresetOption(importedPreset);
          if (refs.select) refs.select.value = IMPORTED_PRESET_ID;
        } else {
          importedPreset = null;
          if (refs.gameMode) refs.gameMode.value = importMode;
          syncPresetSelectOptions(preset.id);
          if (refs.select) refs.select.value = preset.id;
        }
        resetToPreview();
        syncImportExportControls();
        syncStatus('preset imported', previewInfo(game.preset), 'setup');
        return;
      }
      if (!refs.importInput) return;
      importedPreset = presetFromImportText(refs.importInput.value);
      applyImportedPresetMode(importedPreset, targetMode);
      if (!shouldKeepCurrentGameModeOnImport() && refs.gameMode) refs.gameMode.value = importMode;
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = IMPORTED_PRESET_ID;
      resetToPreview();
      syncImportExportControls();
      syncStatus('preset imported', previewInfo(game.preset), 'setup');
      setImportToolsVisible(false);
    } catch (error) {
      syncStatus('import failed', error && error.message ? error.message : 'invalid preset JSON', 'error');
    }
  }

  function selectedImportGameMode() {
    return gameModeFromUrlParam(refs.importGameMode && refs.importGameMode.value) || selectedGameMode();
  }

  function selectedImportSource() {
    return refs.importSource && refs.importSource.value === 'paste' ? 'paste' : 'catalog';
  }

  function shouldKeepCurrentGameModeOnImport() {
    return !refs.importKeepGameMode || !!refs.importKeepGameMode.checked;
  }

  function applyImportedPresetMode(preset, mode) {
    if (!preset) return;
    const gameType = gameTypeForGameMode(mode);
    const gameTypes = presetGameTypesForModes(preset, { allowEmpty: true });
    preset.gameTypes = gameTypes.includes(gameType)
      ? [gameType, ...gameTypes.filter((item) => item !== gameType)]
      : [gameType, ...gameTypes];
    delete preset.group;
    delete preset.groups;
  }

  function syncImportExportControls() {
    if (refs.importGameMode && !refs.importGameMode.value) refs.importGameMode.value = selectedGameMode();
    syncImportCatalogOptions();
    const pasteSource = selectedImportSource() === 'paste';
    if (refs.importCatalogRow) refs.importCatalogRow.hidden = pasteSource;
    if (refs.importInput) refs.importInput.hidden = !pasteSource;
    const backgroundExport = selectedExportKind() === 'background';
    if (refs.exportBackgroundFormatRow) refs.exportBackgroundFormatRow.hidden = !backgroundExport;
  }

  function syncImportCatalogOptions() {
    if (!refs.importCatalog) return;
    const mode = selectedImportGameMode();
    const previous = refs.importCatalog.value;
    const presets = presetListForMode(mode);
    if (document.createElement && refs.importCatalog.appendChild) {
      refs.importCatalog.innerHTML = '';
      presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.label;
        refs.importCatalog.appendChild(option);
      });
    }
    const fallback = defaultPresetIdForMode(mode) || (presets[0] && presets[0].id) || '';
    refs.importCatalog.value = presets.some((preset) => preset.id === previous) ? previous : fallback;
    refs.importCatalog.disabled = !presetCatalogReady || !presets.length;
  }

  function selectedExportKind() {
    return refs.exportStateKind && refs.exportStateKind.value === 'background' ? 'background' : 'status';
  }

  function selectedBackgroundExportFormat() {
    return refs.exportBackgroundFormat && refs.exportBackgroundFormat.value === 'verbose' ? 'verbose' : 'dsl';
  }

  function ensureImportedPresetOption(preset) {
    if (!refs.select || !preset) return;
    syncPresetSelectOptions(preset.id || IMPORTED_PRESET_ID);
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
    const key = normalizeKeyboardKey(event.code || event.key);
    if (handleGameShortcutKey(event, key)) return;
    if (!game || !isDirectionalMoveGame(game)) return;
    if (!keyboardKeyHandledByPreset(key, game.preset)) return;
    const reserved = shouldReserveDirectionalKeyboardInput(key);
    if (event.repeat) {
      if (reserved && event.preventDefault) event.preventDefault();
      return;
    }
    if (!canAcceptDirectionalMove()) {
      if (reserved && event.preventDefault) event.preventDefault();
      clearKeyboardState();
      return;
    }
    rememberKeyboardKey(key);
    const dir = dirFromHeldKeyboardKey(key, game.preset);
    if (reserved && event.preventDefault) event.preventDefault();
    if (!Number.isInteger(dir)) return;
    clearKeyboardState();
    playDirectionalMove(dir);
  }

  function handleKeyup(event) {
    forgetKeyboardKey(normalizeKeyboardKey(event.code || event.key));
  }

  function handleGameShortcutKey(event, key) {
    if (!game || isEditableKeyboardTarget(event) || event.ctrlKey || event.metaKey || event.altKey) return false;
    if (key === 'KeyZ') {
      if (!undoStack.length) return false;
      if (event.preventDefault) event.preventDefault();
      if (!event.repeat) undoPreviousStep();
      return true;
    }
    if (key === 'KeyY') {
      if (!redoStack.length) return false;
      if (event.preventDefault) event.preventDefault();
      if (!event.repeat) redoPreviousUndo();
      return true;
    }
    if (key === 'KeyR') {
      if (event.preventDefault) event.preventDefault();
      if (!event.repeat) resetCurrentGameFromShortcut();
      return true;
    }
    return false;
  }

  function isEditableKeyboardTarget(event) {
    const target = event && event.target;
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tagName = String(target.tagName || '').toUpperCase();
    if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
    if (tagName === 'INPUT') {
      const type = String(target.type || '').toLowerCase();
      return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(type);
    }
    if (typeof target.getAttribute === 'function') {
      const editable = target.getAttribute('contenteditable');
      return editable === '' || String(editable).toLowerCase() === 'true';
    }
    return false;
  }

  function keyboardKeyHandledByPreset(key, preset) {
    const lattice = latticeForPreset(preset);
    if (lattice.shape === 'hex') return isArrowKey(key);
    return Number.isInteger(dirFromKey(key, preset));
  }

  function shouldReserveDirectionalKeyboardInput(key) {
    return !!game
      && isDirectionalMoveGame(game)
      && game.phase !== 'setup'
      && game.phase !== 'gameover'
      && keyboardKeyHandledByPreset(key, game.preset);
  }

  function rememberKeyboardKey(key) {
    if (!isArrowKey(key)) return;
    heldArrowKeys.add(key);
    if (key === 'ArrowUp' || key === 'ArrowDown') activeHexVerticalKey = key;
  }

  function forgetKeyboardKey(key) {
    if (!isArrowKey(key)) return;
    heldArrowKeys.delete(key);
    if (activeHexVerticalKey !== key) return;
    if (heldArrowKeys.has('ArrowDown')) activeHexVerticalKey = 'ArrowDown';
    else if (heldArrowKeys.has('ArrowUp')) activeHexVerticalKey = 'ArrowUp';
    else activeHexVerticalKey = null;
  }

  function clearKeyboardState() {
    heldArrowKeys = new Set();
    activeHexVerticalKey = null;
  }

  function dirFromHeldKeyboardKey(key, preset) {
    const lattice = latticeForPreset(preset);
    if (lattice.shape !== 'hex') return dirFromKey(key, preset);
    if (key === 'ArrowLeft') {
      if (activeHexVerticalKey === 'ArrowUp') return HEX_DIRS.NW;
      if (activeHexVerticalKey === 'ArrowDown') return HEX_DIRS.SW;
      return HEX_DIRS.W;
    }
    if (key === 'ArrowRight') {
      if (activeHexVerticalKey === 'ArrowUp') return HEX_DIRS.NE;
      if (activeHexVerticalKey === 'ArrowDown') return HEX_DIRS.SE;
      return HEX_DIRS.E;
    }
    return null;
  }

  function isArrowKey(key) {
    return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
  }

  function handleDirectionalButton(button) {
    if (!isDirectionalMoveGame(game)) return;
    const dir = game ? dirFromName(button.getAttribute('data-move-dir'), game.preset) : null;
    if (!Number.isInteger(dir) || !canAcceptDirectionalMove()) return;
    playDirectionalMove(dir);
    if (refs.canvas) refs.canvas.focus();
  }

  function handleCanvasPointerDown(event) {
    if (event.isPrimary === false) return;
    if (Number.isInteger(event.button) && event.button !== 0) return;
    if (!isDirectionalMoveGame(game) || !canAcceptDirectionalMove()) {
      resetSwipeGesture();
      return;
    }
    swipeGesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY
    };
    captureSwipePointer(event.pointerId);
  }

  function handleCanvasPointerMove(event) {
    if (!activeSwipeEvent(event)) return;
    swipeGesture.lastX = event.clientX;
    swipeGesture.lastY = event.clientY;
    const dx = swipeGesture.lastX - swipeGesture.startX;
    const dy = swipeGesture.lastY - swipeGesture.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_MIN_DISTANCE && event.preventDefault) {
      event.preventDefault();
    }
  }

  function handleCanvasPointerUp(event) {
    if (!activeSwipeEvent(event)) return;
    const endX = Number.isFinite(event.clientX) ? event.clientX : swipeGesture.lastX;
    const endY = Number.isFinite(event.clientY) ? event.clientY : swipeGesture.lastY;
    const dx = endX - swipeGesture.startX;
    const dy = endY - swipeGesture.startY;
    const pointerId = swipeGesture.pointerId;
    const dir = dirFromSwipeVector(dx, dy, game && game.preset);
    releaseSwipePointer(pointerId);
    resetSwipeGesture();
    if (!Number.isInteger(dir)) return;
    suppressUpcomingCanvasClick();
    if (event.preventDefault) event.preventDefault();
    if (!isDirectionalMoveGame(game) || !canAcceptDirectionalMove()) return;
    playDirectionalMove(dir);
    if (refs.canvas) refs.canvas.focus();
  }

  function handleCanvasPointerCancel(event) {
    if (!activeSwipeEvent(event)) return;
    releaseSwipePointer(swipeGesture.pointerId);
    resetSwipeGesture();
  }

  function handleCanvasLostPointerCapture(event) {
    if (!activeSwipeEvent(event)) return;
    resetSwipeGesture();
  }

  function activeSwipeEvent(event) {
    return !!swipeGesture
      && (swipeGesture.pointerId == null || event.pointerId == null || event.pointerId === swipeGesture.pointerId);
  }

  function captureSwipePointer(pointerId) {
    if (pointerId == null || !refs.canvas || typeof refs.canvas.setPointerCapture !== 'function') return;
    try {
      refs.canvas.setPointerCapture(pointerId);
    } catch (error) {
      // Pointer capture can fail if the pointer is already gone.
    }
  }

  function releaseSwipePointer(pointerId) {
    if (pointerId == null || !refs.canvas || typeof refs.canvas.releasePointerCapture !== 'function') return;
    try {
      refs.canvas.releasePointerCapture(pointerId);
    } catch (error) {
      // Some browsers release capture automatically on pointerup/cancel.
    }
  }

  function resetSwipeGesture() {
    swipeGesture = null;
  }

  function suppressUpcomingCanvasClick() {
    suppressNextCanvasClick = true;
    if (suppressCanvasClickTimer) clearTimeout(suppressCanvasClickTimer);
    suppressCanvasClickTimer = setTimeout(() => {
      suppressNextCanvasClick = false;
      suppressCanvasClickTimer = null;
    }, 700);
  }

  function clearSuppressedCanvasClick() {
    suppressNextCanvasClick = false;
    if (suppressCanvasClickTimer) {
      clearTimeout(suppressCanvasClickTimer);
      suppressCanvasClickTimer = null;
    }
  }

  function dirFromSwipeVector(dx, dy, preset) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_DISTANCE) return null;
    const lattice = latticeForPreset(preset);
    if (lattice.shape !== 'hex') {
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? DIRS.E : DIRS.W;
      return dy > 0 ? DIRS.S : DIRS.N;
    }
    const angle = Math.atan2(dy, dx);
    let bestDir = 0;
    let bestDelta = Infinity;
    lattice.angles.forEach((dirAngle, dir) => {
      const delta = Math.abs(Math.atan2(Math.sin(angle - dirAngle), Math.cos(angle - dirAngle)));
      if (delta < bestDelta) {
        bestDelta = delta;
        bestDir = dir;
      }
    });
    return bestDir;
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

  function isDirectionalMoveGame(state) {
    return is2048Game(state) || isSokobanGame(state);
  }

  function canAcceptDirectionalMove() {
    if (!game) return false;
    if (is2048Game(game)) return canAcceptMove();
    return isSokobanGame(game)
      && game.phase !== 'setup'
      && game.phase !== 'animating'
      && game.phase !== 'gameover'
      && !stepPaused
      && !eventQueue.length
      && !currentAnimation;
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

  function playDirectionalMove(dir) {
    if (isSokobanGame(game)) {
      playSokobanMove(dir);
      return;
    }
    playRound(dir);
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

  function startReversiFlipAnimation(result) {
    if (!result || !result.changed || !result.disc || !Array.isArray(result.flippedDiscs)) return;
    const flips = reversiFlipAnimationItems(result);
    currentAnimation = {
      event: {
        kind: 'reversiFlip',
        disc: {
          id: result.disc.id,
          index: result.disc.index,
          color: result.disc.color
        },
        flips,
        lines: (result.lines || []).map(cloneReversiLine)
      },
      startedAt: now(),
      duration: eventDuration({
        kind: 'reversiFlip',
        flips
      })
    };
    tickAnimation();
  }

  function reversiFlipAnimationItems(result) {
    const distances = new Map();
    (result.lines || []).forEach((line) => {
      (line.flips || []).forEach((index, offset) => {
        const distance = offset + 1;
        if (!distances.has(index) || distance < distances.get(index)) distances.set(index, distance);
      });
    });
    return (result.flippedDiscs || [])
      .map((disc) => ({
        id: disc.id,
        index: disc.index,
        fromColor: disc.fromColor,
        toColor: disc.toColor,
        distance: distances.get(disc.index) || 1
      }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index || a.id - b.id);
  }

  function startReversiInvalidMoveFeedback(target) {
    if (!target || !Number.isInteger(target.index)) return;
    startPlacementFeedback({
      kind: 'reversiInvalid',
      index: target.index,
      startedAt: now(),
      duration: REVERSI_INVALID_MARK_DURATION
    });
  }

  function startPlacementFeedback(feedback) {
    placementFeedbacks = activePlacementFeedbacks();
    placementFeedbacks.push(feedback);
    render();
    schedulePlacementFeedbackTick();
  }

  function schedulePlacementFeedbackTick() {
    if (placementFeedbackFrameId != null || !placementFeedbacks.length) return;
    placementFeedbackFrameId = requestFrame(tickPlacementFeedbacks);
  }

  function tickPlacementFeedbacks() {
    placementFeedbackFrameId = null;
    placementFeedbacks = activePlacementFeedbacks();
    render();
    schedulePlacementFeedbackTick();
  }

  function activePlacementFeedbacks() {
    const current = now();
    return placementFeedbacks.filter((feedback) => {
      const duration = Number.isFinite(feedback.duration) ? Math.max(1, feedback.duration) : REVERSI_INVALID_MARK_DURATION;
      return current - feedback.startedAt < duration;
    });
  }

  function clearPlacementFeedbacks() {
    placementFeedbacks = [];
    if (placementFeedbackFrameId != null) cancelFrame(placementFeedbackFrameId);
    placementFeedbackFrameId = null;
  }

  function startChineseCheckersMoveAnimation(result) {
    if (!result || !result.changed || !result.marble || !result.move) return;
    const segments = cloneChineseCheckerMoveSegments(result.move.segments);
    const event = {
      kind: 'chineseCheckersMove',
      marbleId: result.marble.id,
      color: result.marble.color,
      from: result.marble.from,
      to: result.marble.index,
      path: (result.move.path || [result.marble.from, result.marble.index]).slice(),
      segments,
      moveTime: selectedChineseCheckersMoveTime(),
      jumpPause: selectedChineseCheckersJumpPause()
    };
    event.duration = eventDuration(event);
    currentAnimation = {
      event,
      startedAt: now(),
      duration: event.duration
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
    if (event.kind === 'connectFourDrop' || event.kind === 'reversiFlip' || event.kind === 'chineseCheckersMove') {
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
    clearPlacementFeedbacks();
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
    if (isGoGame(game)) return 'export or import Go status';
    if (isReversiGame(game)) return 'export or import Reversi status';
    if (isChineseCheckersGame(game)) return 'export or import Chinese Checkers status';
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

  function handleCanvasStartBeginClick(event) {
    if (event && event.preventDefault) event.preventDefault();
    hideCanvasStartPrompt();
    beginGameFromUi();
  }

  function hideCanvasStartPrompt() {
    if (refs.canvasStartOverlay) refs.canvasStartOverlay.hidden = true;
  }

  function showCanvasStartPrompt() {
    if (!refs.canvasStartOverlay || !game || game.phase !== 'setup') return;
    const copy = canvasStartPromptCopy(game);
    if (refs.canvasStartTitle) refs.canvasStartTitle.textContent = copy.title;
    if (refs.canvasStartContext) refs.canvasStartContext.textContent = copy.context;
    if (refs.canvasStartRules) refs.canvasStartRules.textContent = copy.rules;
    refs.canvasStartOverlay.hidden = false;
    syncStatus('begin from canvas', copy.status, 'setup');
  }

  function canvasStartPromptCopy(state) {
    const mode = gameModeValue(state);
    const gameName = gameTypeForGameMode(mode);
    const presetLabel = state && state.preset && state.preset.label ? state.preset.label : 'selected background';
    let rules = 'Read the quick rule, then begin the selected game on this glued mosaic.';
    if (mode === GAME_MODES.GOMOKU) {
      rules = 'Place black and white stones on empty board points. The first player to make a line of five wins.';
    } else if (mode === GAME_MODES.CONNECT_FOUR) {
      const holes = isConnectFourGame(state) && state.holes ? state.holes.size : 0;
      rules = holes
        ? 'Drop red and yellow tokens through white input holes. Connect four along any board line to win.'
        : 'Click tiles to mark white input holes, then begin. Drop tokens through those holes and connect four to win.';
    } else if (mode === GAME_MODES.GO) {
      rules = 'Place stones on empty points; surrounded opposing groups are captured. Pass when both players are done.';
    } else if (mode === GAME_MODES.REVERSI) {
      rules = 'Place a disc to bracket opposing discs along a line and flip them. Most discs at the end wins.';
    } else if (mode === GAME_MODES.CHINESE_CHECKERS) {
      rules = 'Select one of your marbles, then move or jump through connected cells. Race into the opposite camp.';
    } else if (mode === GAME_MODES.SOKOBAN) {
      rules = 'Move every player together. Push one box at a time onto the targets across the glued board.';
    } else {
      rules = 'Slide boxes with arrow keys, move buttons, or a swipe. Matching powers of two merge across the glued board.';
    }
    return {
      title: `${gameName} quick rules`,
      context: `${gameName} on ${presetLabel}`,
      rules,
      status: 'quick rules shown; begin here or use the setup panel'
    };
  }

  function handleSetupCanvasStartClick(event) {
    if (!game || game.phase !== 'setup' || currentAnimation) return false;
    if (refs.select && refs.select.value === IMPORT_PRESET_CHOICE_ID && !importedPreset) return false;
    if (debugMode && is2048Game(game)) {
      hideCanvasStartPrompt();
      return false;
    }
    if (isConnectFourGame(game) && tileFromCanvasEvent(event)) {
      hideCanvasStartPrompt();
      return false;
    }
    if (canvasClickHitsGlueBoundary(event)) {
      hideCanvasStartPrompt();
      syncStatusForCurrentGame();
      return true;
    }
    showCanvasStartPrompt();
    if (refs.canvas) refs.canvas.focus();
    return true;
  }

  function canvasClickHitsGlueBoundary(event) {
    const preset = game ? game.preset : selectedPreset();
    return !!hoveredGlueBoundaryAtPoint(preset, geometry, canvasPointFromEvent(event));
  }

  function handleCanvasClick(event) {
    if (suppressNextCanvasClick) {
      clearSuppressedCanvasClick();
      if (event.preventDefault) event.preventDefault();
      return;
    }
    if (handleSetupCanvasStartClick(event)) return;
    if (game && game.phase !== 'setup') hideCanvasStartPrompt();
    if (isGomokuGame(game)) {
      handleGomokuCanvasClick(event);
      return;
    }
    if (isConnectFourGame(game)) {
      handleConnectFourCanvasClick(event);
      return;
    }
    if (isGoGame(game)) {
      handleGoCanvasClick(event);
      return;
    }
    if (isReversiGame(game)) {
      handleReversiCanvasClick(event);
      return;
    }
    if (isChineseCheckersGame(game)) {
      handleChineseCheckersCanvasClick(event);
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

  function handleGoCanvasClick(event) {
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
    const stone = goStoneAt(game, target.index);
    if (isGoDeadMarkModeActive() && stone) {
      handleGoDeadGroupCanvasClick(target);
      return;
    }
    if (isGoTerritoryEditModeActive()) {
      handleGoTerritoryOverrideCanvasClick(target);
      return;
    }
    if (isGoDeadMarkModeActive()) {
      handleGoDeadGroupCanvasClick(target);
      return;
    }
    if (game.scoringReview) {
      syncStatus('Go score review', 'mark dead groups or confirm score', 'ready');
      return;
    }
    const result = placeGoStone(game, target.index);
    if (!result.changed) {
      syncStatus('Go move rejected', result.message || `${target.label} is unavailable`, phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Go ${result.stone.color} at ${target.label}`);
    game = result.state;
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function passGoFromUi() {
    if (!isGoGame(game) || currentAnimation) return;
    const result = passGoTurn(game);
    if (!result.changed) {
      syncStatus('Go pass rejected', result.message || 'pass is unavailable', phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Go ${game.turn} pass`);
    game = result.state;
    if (game.scoringReview) activateGoScoringReviewControls();
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function confirmGoScoreFromUi() {
    if (!isGoGame(game) || currentAnimation || game.phase === 'setup' || game.phase === 'gameover') return;
    const result = confirmGoScore(game);
    if (!result.changed) {
      syncStatus('Go score unavailable', result.message || 'score cannot be confirmed yet', phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot('Go confirm score');
    game = result.state;
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoDeadGroupCanvasClick(target) {
    if (!isGoGame(game) || !target) return;
    const result = toggleGoDeadGroup(game, target.index);
    if (!result.changed) {
      syncStatus('Go dead group', result.message || 'click a stone group to mark it dead or alive', phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Go ${result.markedDead ? 'mark' : 'unmark'} ${result.color} group`);
    game = result.state;
    syncStatus(
      result.markedDead ? 'dead group marked' : 'dead group restored',
      `${result.count} ${goColorLabel(result.color)} stone${result.count === 1 ? '' : 's'}; confirm score when ready`,
      'ready'
    );
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoScoreViewChange() {
    render();
    syncControls();
    if (isGoGame(game)) syncStatusForCurrentGame();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoScoringMethodChange() {
    const method = selectedGoScoringMethod();
    if (isGoGame(game)) {
      const previous = normalizeGoScoringMethod(game.scoringMethod);
      if (previous !== method) {
        if (game.phase !== 'setup') pushUndoSnapshot('Go scoring method');
        game.scoringMethod = method;
        game.finalScore = null;
        if (game.phase !== 'gameover') game.territory = scoreGoGame(game).territory;
      }
      syncStatus('Go scoring method', method === 'nearest' ? 'nearest-stone Voronoi selected' : 'inverse-square influence selected', phaseBadge(game.phase));
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoMarkDeadChange() {
    if (refs.goMarkDead && refs.goMarkDead.checked && refs.goScoreView) refs.goScoreView.checked = true;
    render();
    syncControls();
    if (isGoGame(game)) {
      syncStatus(
        refs.goMarkDead && refs.goMarkDead.checked ? 'Go dead group marking' : `Go move ${game.round || 0}`,
        refs.goMarkDead && refs.goMarkDead.checked ? 'click a stone to toggle its whole group' : goTurnInfo(game),
        phaseBadge(game.phase)
      );
    }
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoEditTerritoryChange() {
    if (refs.goEditTerritory && refs.goEditTerritory.checked && refs.goScoreView) refs.goScoreView.checked = true;
    render();
    syncControls();
    if (isGoGame(game)) {
      syncStatus(
        refs.goEditTerritory && refs.goEditTerritory.checked ? 'Go territory editing' : `Go move ${game.round || 0}`,
        refs.goEditTerritory && refs.goEditTerritory.checked ? 'click empty or dead points to cycle ownership' : goTurnInfo(game),
        phaseBadge(game.phase)
      );
    }
    if (refs.canvas) refs.canvas.focus();
  }

  function handleGoTerritoryOverrideCanvasClick(target) {
    if (!isGoGame(game) || !target) return;
    const result = toggleGoTerritoryOverride(game, target.index);
    if (!result.changed) {
      syncStatus('Go territory edit', result.message || 'click an empty or dead scoring point', phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot('Go territory override');
    game = result.state;
    syncStatus('territory override', `${target.label}: ${result.owner === 'auto' ? 'automatic' : result.owner}`, 'ready');
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleReversiCanvasClick(event) {
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
    const result = placeReversiDisc(game, target.index);
    if (!result.changed) {
      startReversiInvalidMoveFeedback(target);
      syncStatus('Reversi move rejected', result.message || `${target.label} is unavailable`, phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Reversi ${result.disc.color} at ${target.label}`);
    game = result.state;
    startReversiFlipAnimation(result);
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function handleChineseCheckersCanvasClick(event) {
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
    const marble = chineseCheckerMarbleAt(game, target.index);
    if (isChineseCheckersJumping(game)) {
      handleChineseCheckersJumpContinuationClick(target, marble);
      return;
    }
    if (!Number.isInteger(game.selectedIndex)) {
      if (!marble || marble.color !== game.turn) {
        syncStatus('Chinese Checkers selection', 'select one of your marbles', 'ready');
        return;
      }
      game.selectedIndex = target.index;
      syncStatus('Chinese Checkers selected', chineseCheckersTurnInfo(game), 'ready');
      render();
      refreshDebugExportIfNeeded();
      return;
    }
    if (marble && marble.color === game.turn) {
      game.selectedIndex = target.index === game.selectedIndex ? null : target.index;
      syncStatus('Chinese Checkers selected', chineseCheckersTurnInfo(game), 'ready');
      render();
      refreshDebugExportIfNeeded();
      return;
    }
    const from = game.selectedIndex;
    const result = moveChineseCheckerMarble(game, from, target.index, {
      stepwise: !shouldUseChineseCheckersFullChainHints()
    });
    if (!result.changed) {
      syncStatus('Chinese Checkers move rejected', result.message || `${target.label} is unavailable`, phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Chinese Checkers ${game.turn} move`);
    game = result.state;
    startChineseCheckersMoveAnimation(result);
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
  }

  function handleChineseCheckersJumpContinuationClick(target, marble) {
    const chain = game && game.jumpChain;
    if (!chain || !Number.isInteger(chain.currentIndex)) return;
    if (marble && marble.color === game.turn && target.index !== chain.currentIndex) {
      syncStatus('Chinese Checkers jumping', 'continue this jump or use end jump', 'ready');
      return;
    }
    const result = moveChineseCheckerMarble(game, chain.currentIndex, target.index, { stepwise: true });
    if (!result.changed) {
      syncStatus('Chinese Checkers jump rejected', result.message || `${target.label} is unavailable`, phaseBadge(game.phase));
      return;
    }
    pushUndoSnapshot(`Chinese Checkers ${game.turn} jump`);
    game = result.state;
    startChineseCheckersMoveAnimation(result);
    syncStatusForCurrentGame();
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
    const displayPoint = {
      x: ((event.clientX || 0) - left) * (geometry.width / Math.max(1, width)),
      y: ((event.clientY || 0) - top) * (geometry.height / Math.max(1, height))
    };
    return displayPointToGeometryPoint(displayPoint, geometry);
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

  function createHistorySnapshot(label) {
    if (!game) return null;
    return {
      label: label || 'step',
      game: cloneGameState(game),
      eventQueue: clonePlain(eventQueue),
      eventIndex,
      stepPaused,
      status: statusSnapshot()
    };
  }

  function trimHistoryStack(stack) {
    if (stack.length > UNDO_LIMIT) stack.splice(0, stack.length - UNDO_LIMIT);
  }

  function pushUndoSnapshot(label) {
    const snapshot = createHistorySnapshot(label);
    if (!snapshot) return;
    undoStack.push(snapshot);
    trimHistoryStack(undoStack);
    redoStack = [];
    syncControls();
  }

  function pushRedoSnapshot(label) {
    const snapshot = createHistorySnapshot(label);
    if (!snapshot) return;
    redoStack.push(snapshot);
    trimHistoryStack(redoStack);
    syncControls();
  }

  function pushUndoSnapshotForRedo(label) {
    const snapshot = createHistorySnapshot(label);
    if (!snapshot) return;
    undoStack.push(snapshot);
    trimHistoryStack(undoStack);
    syncControls();
  }

  function restoreHistorySnapshot(snapshot, status, info) {
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
    syncGoKomiInputFromGame();
    syncGoScoringMethodInputFromGame();
    if (isChineseCheckersGame(game)) setChineseCheckersSelectedPlayers(chineseCheckersPlayerColors(game), game.preset);
    if (isGoGame(game) && game.scoringReview) activateGoScoringReviewControls();
    syncStatus(status, info, phaseBadge(game.phase));
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function undoPreviousStep() {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      syncControls();
      return;
    }
    pushRedoSnapshot(snapshot.label || 'previous step');
    restoreHistorySnapshot(
      snapshot,
      'undo complete',
      `restored before ${snapshot.label || 'previous step'}`
    );
  }

  function redoPreviousUndo() {
    const snapshot = redoStack.pop();
    if (!snapshot) {
      syncControls();
      return;
    }
    pushUndoSnapshotForRedo(snapshot.label || 'previous step');
    restoreHistorySnapshot(
      snapshot,
      'redo complete',
      `reapplied ${snapshot.label || 'previous step'}`
    );
  }

  function clearUndoHistory() {
    undoStack = [];
    redoStack = [];
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

  function exportFromUi() {
    if (selectedExportKind() === 'background') {
      exportBackgroundPreset();
      return;
    }
    exportDebugState();
  }

  function exportDebugState() {
    if (!game || !refs.debugExport) return;
    refs.debugExport.value = JSON.stringify(debugExportPayload(), null, 2);
    const info = debugExportInfo(game);
    syncStatus('status exported', info, debugMode ? 'debug' : phaseBadge(game.phase));
    refs.debugExport.focus();
    refs.debugExport.select();
  }

  function exportBackgroundPreset() {
    if (!game || !refs.debugExport) return;
    const preset = backgroundPresetForExport();
    const payload = selectedBackgroundExportFormat() === 'verbose'
      ? preset
      : compactBackgroundPresetForExport(preset);
    refs.debugExport.value = JSON.stringify(payload, null, 2);
    syncStatus('background exported', previewInfo(preset), phaseBadge(game.phase));
    refs.debugExport.focus();
    refs.debugExport.select();
  }

  function backgroundPresetForExport() {
    const source = game ? game.preset : selectedPreset();
    const preset = {
      id: source.id,
      label: source.label,
      lattice: source.lattice || 'square',
      rows: source.rows,
      cols: source.cols,
      surface: source.surface,
      removedTiles: (source.removedTiles || []).map((tile) => ({ row: tile.row, col: tile.col })),
      cutEdges: (source.cutEdges || []).map((edge) => ({
        left: { row: edge.left.row, col: edge.left.col },
        right: { row: edge.right.row, col: edge.right.col }
      })),
      gluedEdges: (source.gluedEdges || []).map(cloneGluePair)
    };
    const holes = backgroundConnectFourHolesForExport(source);
    if (holes.length) {
      preset.connectFourHoles = holes;
      preset.inputHoles = holes.map((tile) => ({ ...tile }));
    }
    if (Number.isInteger(source.gomokuWinLength)) preset.gomokuWinLength = source.gomokuWinLength;
    if (Number.isFinite(source.goKomi)) preset.goKomi = normalizeGoKomi(source.goKomi);
    if (source.pieceSets) preset.pieceSets = clonePlain(source.pieceSets);
    if (Array.isArray(source.reversiOpening)) preset.reversiOpening = source.reversiOpening.map((entry) => ({ ...entry }));
    if (source.chineseCheckersCamps) {
      preset.chineseCheckersCamps = chineseCheckersCampsToTileRefs(
        normalizeChineseCheckersCamps(source.chineseCheckersCamps, source, initialRemovedSet(source)),
        source.cols
      );
    }
    if (Array.isArray(source.chineseCheckersPlayers)) preset.chineseCheckersPlayers = source.chineseCheckersPlayers.map(normalizePlacementColor).filter(Boolean);
    const sokoban = sokobanPresetDecorationsForExport(source);
    if (sokoban) preset.sokoban = sokoban;
    return preset;
  }

  function backgroundConnectFourHolesForExport(preset) {
    const holes = isConnectFourGame(game)
      ? Array.from(game.holes || []).map((index) => rowCol(index, preset.cols))
      : (preset.connectFourHoles || []).map((tile) => ({ row: tile.row, col: tile.col }));
    return holes
      .filter((tile) => Number.isInteger(tile.row) && Number.isInteger(tile.col))
      .sort((left, right) => indexOf(left.row, left.col, preset.cols) - indexOf(right.row, right.col, preset.cols));
  }

  function compactBackgroundPresetForExport(preset) {
    const compact = {
      id: preset.id,
      label: preset.label,
      lattice: preset.lattice || 'square',
      size: `${preset.rows}x${preset.cols}`,
      surface: preset.surface
    };
    const removed = compactTileListForExport(preset.removedTiles, preset.rows, preset.cols, { rect: true });
    const holes = compactTileListForExport(preset.connectFourHoles, preset.rows, preset.cols, { top: true });
    const cuts = compactCutListForExport(preset.cutEdges);
    const glue = compactGlueListForExport(preset.gluedEdges, preset);
    if (removed) compact.removed = removed;
    if (cuts) compact.cuts = cuts;
    if (glue) compact.glue = glue;
    if (holes) compact.holes = holes;
    if (Number.isInteger(preset.gomokuWinLength)) compact.gomokuWinLength = preset.gomokuWinLength;
    if (Number.isFinite(preset.goKomi)) compact.goKomi = normalizeGoKomi(preset.goKomi);
    if (preset.pieceSets) compact.pieceSets = clonePlain(preset.pieceSets);
    if (Array.isArray(preset.reversiOpening)) compact.reversiOpening = preset.reversiOpening.map((entry) => ({ ...entry }));
    if (preset.chineseCheckersCamps) compact.chineseCheckersCamps = clonePlain(preset.chineseCheckersCamps);
    if (Array.isArray(preset.chineseCheckersPlayers)) compact.chineseCheckersPlayers = preset.chineseCheckersPlayers.slice();
    const sokoban = sokobanPresetDecorationsForExport(preset, true);
    if (sokoban) compact.sokoban = sokoban;
    return compact;
  }

  function compactTileListForExport(tiles, rows, cols, options = {}) {
    if (!Array.isArray(tiles) || !tiles.length) return '';
    const normalized = tiles
      .map((tile) => ({ row: Number(tile.row), col: Number(tile.col) }))
      .filter((tile) => Number.isInteger(tile.row) && Number.isInteger(tile.col))
      .sort((left, right) => indexOf(left.row, left.col, cols) - indexOf(right.row, right.col, cols));
    if (!normalized.length) return '';
    if (options.top && normalized.length === cols && normalized.every((tile, index) => tile.row === 1 && tile.col === index + 1)) {
      return 'top';
    }
    if (options.rect) {
      const rowsUsed = normalized.map((tile) => tile.row);
      const colsUsed = normalized.map((tile) => tile.col);
      const minRow = Math.min(...rowsUsed);
      const maxRow = Math.max(...rowsUsed);
      const minCol = Math.min(...colsUsed);
      const maxCol = Math.max(...colsUsed);
      const expected = (maxRow - minRow + 1) * (maxCol - minCol + 1);
      const keys = new Set(normalized.map((tile) => `${tile.row},${tile.col}`));
      let full = expected === normalized.length && expected > 1;
      for (let row = minRow; row <= maxRow && full; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          if (!keys.has(`${row},${col}`)) {
            full = false;
            break;
          }
        }
      }
      if (full) return `rect(${formatCompactNumberRange(minRow, maxRow)},${formatCompactNumberRange(minCol, maxCol)})`;
    }
    return normalized.map((tile) => `${tile.row},${tile.col}`).join('; ');
  }

  function compactCutListForExport(cutEdges) {
    if (!Array.isArray(cutEdges) || !cutEdges.length) return '';
    return cutEdges
      .map((edge) => `${edge.left.row},${edge.left.col}=${edge.right.row},${edge.right.col}`)
      .join('; ');
  }

  function compactGlueListForExport(gluedEdges, preset) {
    if (!Array.isArray(gluedEdges) || !gluedEdges.length) return '';
    const groups = new Map();
    gluedEdges.forEach((pair, pairIndex) => {
      const group = Number.isInteger(Number(pair.group)) ? Number(pair.group) : pairIndex;
      const reversed = !!pair.reversed;
      const firstArrow = Object.prototype.hasOwnProperty.call(pair, 'firstArrowReversed') ? !!pair.firstArrowReversed : reversed;
      const secondArrow = Object.prototype.hasOwnProperty.call(pair, 'secondArrowReversed') ? !!pair.secondArrowReversed : true;
      const key = `${group}|${reversed ? 1 : 0}|${firstArrow ? 1 : 0}|${secondArrow ? 1 : 0}`;
      if (!groups.has(key)) groups.set(key, { group, reversed, firstArrow, secondArrow, pairs: [] });
      groups.get(key).pairs.push(pair);
    });
    const entries = [];
    groups.forEach((entry) => {
      const prefix = compactGluePrefix(entry.group, entry.reversed, entry.firstArrow, entry.secondArrow);
      const first = compactBoundaryEdgesForExport(entry.pairs.map((pair) => pair.first), preset);
      const second = compactBoundaryEdgesForExport(entry.pairs.map((pair) => pair.second), preset);
      if (first && second) {
        entries.push(`${prefix}${first}=${second}`);
        return;
      }
      entry.pairs.forEach((pair) => {
        entries.push(`${prefix}${compactBoundaryEdgeForExport(pair.first, preset)}=${compactBoundaryEdgeForExport(pair.second, preset)}`);
      });
    });
    return entries.join('; ');
  }

  function compactGluePrefix(group, reversed, firstArrow, secondArrow) {
    if (!reversed) return `g${group}:`;
    if (firstArrow && secondArrow) return `g${group}~:`;
    return `g${group}~${firstArrow ? 1 : 0}${secondArrow ? 1 : 0}:`;
  }

  function compactBoundaryEdgesForExport(edges, preset) {
    if (!Array.isArray(edges) || !edges.length) return '';
    if (edges.length === 1) return compactBoundaryEdgeForExport(edges[0], preset);
    const dir = Number(edges[0].dir);
    if (!edges.every((edge) => Number(edge.dir) === dir)) return '';
    const rowCompact = compactCoordinateSequence(edges.map((edge) => Number(edge.row)));
    const colCompact = compactCoordinateSequence(edges.map((edge) => Number(edge.col)));
    if (!rowCompact || !colCompact) return '';
    return `${rowCompact},${colCompact},${boundaryDirNameForExport(dir, preset)}`;
  }

  function compactBoundaryEdgeForExport(edge, preset) {
    return `${edge.row},${edge.col},${boundaryDirNameForExport(edge.dir, preset)}`;
  }

  function compactCoordinateSequence(values) {
    if (!values.length) return '';
    if (values.length === 1 || values.every((value) => value === values[0])) return String(values[0]);
    const step = values[1] - values[0];
    if (Math.abs(step) !== 1) return '';
    for (let index = 2; index < values.length; index += 1) {
      if (values[index] - values[index - 1] !== step) return '';
    }
    return `${values[0]}..${values[values.length - 1]}`;
  }

  function formatCompactNumberRange(start, end) {
    return start === end ? String(start) : `${start}..${end}`;
  }

  function boundaryDirNameForExport(dir, preset) {
    const lattice = latticeForPreset(preset);
    return lattice.dirNames[modulo(Number(dir), lattice.sides)] || String(dir);
  }

  function importDebugState() {
    if (!refs.debugExport) {
      syncStatus('status import unavailable', 'status textarea unavailable', 'error');
      return;
    }
    try {
      const imported = gameStateFromDebugImportText(refs.debugExport.value);
      if (game) pushUndoSnapshot('status import');
      stopPlayback();
      importedPreset = imported.state.preset;
      if (refs.gameMode) refs.gameMode.value = gameModeValue(imported.state);
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = importedPreset.id;
      game = imported.state;
      if (isChineseCheckersGame(game)) setChineseCheckersSelectedPlayers(chineseCheckersPlayerColors(game), game.preset);
      if (isGoGame(game) && game.scoringReview) activateGoScoringReviewControls();
      eventQueue = imported.eventQueue;
      eventIndex = imported.eventIndex;
      stepPaused = imported.stepPaused;
      currentAnimation = null;
      clearNoMoveTrial();
      eventQueueChangedBoard = false;
      game.phase = stepPaused ? 'paused' : (eventQueue.length ? 'ready' : imported.phase);
      if (game.phase !== 'gameover') game.ending = '';
      syncConnectFourFallInputFromGame();
      syncGoKomiInputFromGame();
      syncGoScoringMethodInputFromGame();
      render();
      const info = debugExportInfo(game);
      syncStatus('status imported', info, debugMode ? 'debug' : phaseBadge(game.phase));
      syncControls();
      refreshDebugExportIfNeeded();
      if (refs.canvas) refs.canvas.focus();
    } catch (error) {
      syncStatus('status import failed', error && error.message ? error.message : 'invalid status JSON', 'error');
    }
  }

  function refreshDebugExportIfNeeded() {
    if (!refs.debugExport || !refs.debugExport.value) return;
    if (selectedExportKind() !== 'status') return;
    refs.debugExport.value = JSON.stringify(debugExportPayload(), null, 2);
  }

  function clearDebugExport() {
    if (refs.debugExport) refs.debugExport.value = '';
  }

  function debugExportPayload() {
    const preset = game.preset;
    const presetPayload = {
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
    };
    if (Array.isArray(preset.connectFourHoles)) {
      presetPayload.connectFourHoles = preset.connectFourHoles.map((tile) => ({ ...tile }));
    }
    if (Number.isInteger(preset.gomokuWinLength)) presetPayload.gomokuWinLength = preset.gomokuWinLength;
    if (Number.isFinite(preset.goKomi)) presetPayload.goKomi = normalizeGoKomi(preset.goKomi);
    if (preset.pieceSets) presetPayload.pieceSets = clonePlain(preset.pieceSets);
    if (Array.isArray(preset.reversiOpening)) presetPayload.reversiOpening = preset.reversiOpening.map((entry) => ({ ...entry }));
    if (preset.chineseCheckersCamps) presetPayload.chineseCheckersCamps = clonePlain(preset.chineseCheckersCamps);
    if (Array.isArray(preset.chineseCheckersPlayers)) presetPayload.chineseCheckersPlayers = preset.chineseCheckersPlayers.slice();
    const presetSokoban = sokobanPresetDecorationsForExport(preset);
    if (presetSokoban) presetPayload.sokoban = presetSokoban;
    const base = {
      exportedAt: new Date().toISOString(),
      gameMode: game.gameMode || GAME_MODES.NUMBER_2048,
      preset: presetPayload,
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
    if (isGoGame(game)) {
      const goScore = scoreGoGame(game);
      return {
        ...base,
        turn: game.turn || 'black',
        komi: normalizeGoKomi(game.komi),
        passes: game.passes || 0,
        captures: {
          black: Math.max(0, Number(game.captures && game.captures.black) || 0),
          white: Math.max(0, Number(game.captures && game.captures.white) || 0)
        },
        territory: { ...((game.finalScore && game.finalScore.territory) || goScore.territory || { black: 0, white: 0, neutral: 0 }) },
        finalScore: game.finalScore ? clonePlain(game.finalScore) : null,
        winner: game.winner || '',
        resultDismissed: !!game.resultDismissed,
        nextStoneId: game.nextStoneId || 1,
        previousBoardSignature: game.previousBoardSignature || '',
        deadStoneIds: Array.from(goDeadStoneIdSet(game)).sort((a, b) => a - b),
        scoringReview: !!game.scoringReview,
        scoringMethod: normalizeGoScoringMethod(game.scoringMethod),
        territoryOverrides: goTerritoryOverridesExport(game),
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
    if (isReversiGame(game)) {
      return {
        ...base,
        turn: game.turn || 'black',
        passCount: game.passCount || 0,
        winner: game.winner || '',
        finalScore: game.finalScore ? clonePlain(game.finalScore) : null,
        resultDismissed: !!game.resultDismissed,
        nextDiscId: game.nextDiscId || 1,
        discs: (game.discs || [])
          .map((disc) => discExport(disc, preset.cols))
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
    if (isChineseCheckersGame(game)) {
      return {
        ...base,
        turn: game.turn || 'red',
        winner: game.winner || '',
        winningLine: (game.winningLine || []).slice(),
        resultDismissed: !!game.resultDismissed,
        nextMarbleId: game.nextMarbleId || 1,
        selectedIndex: Number.isInteger(game.selectedIndex) ? game.selectedIndex : null,
        jumpChain: cloneChineseCheckersJumpChain(game.jumpChain),
        playerColors: chineseCheckersPlayerColors(game),
        camps: chineseCheckersCampsExport(game.camps, preset.cols),
        marbles: (game.marbles || [])
          .map((marble) => marbleExport(marble, preset.cols))
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
    if (isSokobanGame(game)) {
      return {
        ...base,
        winner: game.winner || '',
        resultDismissed: !!game.resultDismissed,
        nextPlayerId: game.nextPlayerId || 1,
        nextBoxId: game.nextBoxId || 1,
        moves: game.moves || game.round || 0,
        pushes: game.pushes || 0,
        players: (game.players || [])
          .map((player) => sokobanActorExport(player, preset.cols))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        boxes: (game.boxes || [])
          .map((box) => sokobanActorExport(box, preset.cols))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        targets: sokobanTileSetEntries(game.targets, preset.cols),
        walls: sokobanTileSetEntries(game.walls, preset.cols),
        ice: sokobanTileSetEntries(game.ice, preset.cols),
        energyBridges: sokobanTileSetEntries(game.energyBridges, preset.cols),
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

  function discExport(disc, cols) {
    return {
      id: disc.id,
      index: disc.index,
      ...rowCol(disc.index, cols),
      color: disc.color
    };
  }

  function marbleExport(marble, cols) {
    return {
      id: marble.id,
      index: marble.index,
      ...rowCol(marble.index, cols),
      color: marble.color
    };
  }

  function sokobanActorExport(actor, cols) {
    return {
      id: actor.id,
      index: actor.index,
      ...rowCol(actor.index, cols)
    };
  }

  function debugExportInfo(state) {
    if (isGomokuGame(state)) {
      return `${state.stones.length} stone${state.stones.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    if (isConnectFourGame(state)) {
      return `${state.tokens.length} token${state.tokens.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    if (isGoGame(state)) {
      return `${state.stones.length} stone${state.stones.length === 1 ? '' : 's'}, komi ${formatKomi(state.komi)}`;
    }
    if (isReversiGame(state)) {
      return `${state.discs.length} disc${state.discs.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    if (isChineseCheckersGame(state)) {
      return `${state.marbles.length} marble${state.marbles.length === 1 ? '' : 's'}, ${state.removed.size} removed`;
    }
    if (isSokobanGame(state)) {
      return `${state.players.length} player${state.players.length === 1 ? '' : 's'}, ${state.boxes.length} box${state.boxes.length === 1 ? '' : 'es'}, ${state.targets.size} target${state.targets.size === 1 ? '' : 's'}`;
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
      if (state.winningLine.length < gomokuWinLengthForPreset(preset)) {
        const recomputedWinLine = recomputeGomokuWinningLine(state);
        if (recomputedWinLine.length) state.winningLine = recomputedWinLine;
      }
      return {
        state,
        phase: state.phase,
        eventQueue: [],
        eventIndex: 0,
        stepPaused: false
      };
    }
    if (normalizeStatusGameMode(payload) === GAME_MODES.GO) {
      const stones = normalizeStatusGoStones(payload.stones, preset, removed);
      const nextStoneId = Math.max(
        normalizeNonnegativeInteger(payload.nextStoneId, 1),
        stones.reduce((max, stone) => Math.max(max, stone.id + 1), 1)
      );
      const phase = normalizeStatusPhase(payload.phase);
      const winner = normalizeGoWinner(payload.winner);
      const captures = payload.captures && typeof payload.captures === 'object' ? payload.captures : {};
      const deadStoneIds = normalizeStatusGoDeadStoneIds(payload.deadStoneIds, stones);
      const scoringMethod = normalizeGoScoringMethod(payload.scoringMethod);
      const territoryOverrides = normalizeStatusGoTerritoryOverrides(payload.territoryOverrides, preset, removed, stones, deadStoneIds);
      const state = {
        gameMode: GAME_MODES.GO,
        preset,
        phase,
        removed,
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        stones,
        nextStoneId,
        turn: normalizeGoTurn(payload.turn, stones.length),
        komi: normalizeGoKomi(payload.komi != null ? payload.komi : preset.goKomi),
        passes: Math.max(0, normalizeNonnegativeInteger(payload.passes, 0)),
        captures: {
          black: Math.max(0, normalizeNonnegativeInteger(captures.black, 0)),
          white: Math.max(0, normalizeNonnegativeInteger(captures.white, 0))
        },
        previousBoardSignature: sanitizeImportedText(payload.previousBoardSignature || '', ''),
        winner: phase === 'gameover' ? winner : '',
        territory: payload.territory && typeof payload.territory === 'object'
          ? {
            black: Math.max(0, Number(payload.territory.black) || 0),
            white: Math.max(0, Number(payload.territory.white) || 0),
            neutral: Math.max(0, Number(payload.territory.neutral) || 0)
          }
          : { black: 0, white: 0, neutral: 0 },
        deadStoneIds,
        scoringReview: phase !== 'gameover' && !!payload.scoringReview,
        scoringMethod,
        territoryOverrides,
        finalScore: payload.finalScore && typeof payload.finalScore === 'object' ? clonePlain(payload.finalScore) : null,
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, stones.length),
        ending: phase === 'gameover' ? 'go-score' : '',
        debugMessage: ''
      };
      if (state.scoringReview) state.territory = scoreGoGame(state).territory;
      if (state.phase === 'gameover' && !state.finalScore) {
        state.finalScore = scoreGoGame(state);
        state.territory = state.finalScore.territory;
      }
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
      const holes = normalizeConnectFourHoleSet(
        Object.prototype.hasOwnProperty.call(payload, 'holes') ? payload.holes : preset.connectFourHoles,
        preset,
        removed
      );
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
    if (normalizeStatusGameMode(payload) === GAME_MODES.REVERSI) {
      const discs = normalizeStatusReversiDiscs(payload.discs, preset, removed);
      const nextDiscId = Math.max(
        normalizeNonnegativeInteger(payload.nextDiscId, 1),
        discs.reduce((max, disc) => Math.max(max, disc.id + 1), 1)
      );
      const phase = normalizeStatusPhase(payload.phase);
      const winner = normalizeReversiWinner(payload.winner);
      const state = {
        gameMode: GAME_MODES.REVERSI,
        preset,
        phase,
        removed,
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        discs,
        nextDiscId,
        turn: normalizeReversiTurn(payload.turn, discs.length),
        passCount: Math.max(0, normalizeNonnegativeInteger(payload.passCount, 0)),
        winner: phase === 'gameover' ? winner : '',
        finalScore: payload.finalScore && typeof payload.finalScore === 'object' ? clonePlain(payload.finalScore) : null,
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, Math.max(0, discs.length - 4)),
        ending: phase === 'gameover' ? 'reversi-score' : '',
        debugMessage: ''
      };
      if (state.phase === 'gameover' && !state.finalScore) state.finalScore = reversiDiscCounts(state);
      return {
        state,
        phase: state.phase,
        eventQueue: [],
        eventIndex: 0,
        stepPaused: false
      };
    }
    if (normalizeStatusGameMode(payload) === GAME_MODES.CHINESE_CHECKERS) {
      const marbles = normalizeStatusChineseCheckersMarbles(payload.marbles, preset, removed);
      const nextMarbleId = Math.max(
        normalizeNonnegativeInteger(payload.nextMarbleId, 1),
        marbles.reduce((max, marble) => Math.max(max, marble.id + 1), 1)
      );
      const phase = normalizeStatusPhase(payload.phase);
      const winner = normalizeChineseCheckersWinner(payload.winner);
      const pieceSets = normalizePieceSets(preset.pieceSets, preset, removed);
      const camps = normalizeChineseCheckersCamps(
        payload.camps || preset.chineseCheckersCamps,
        preset,
        removed,
        pieceSets
      );
      const playerColors = normalizeChineseCheckersPlayers(
        payload.playerColors || payload.chineseCheckersPlayers || preset.chineseCheckersPlayers,
        camps
      );
      const importedJumpChain = normalizeStatusChineseCheckersJumpChain(payload.jumpChain, marbles, preset, removed);
      const jumpChain = phase === 'gameover' ? null : importedJumpChain;
      const jumpingMarble = jumpChain ? marbles.find((marble) => marble.id === jumpChain.marbleId) : null;
      const state = {
        gameMode: GAME_MODES.CHINESE_CHECKERS,
        preset,
        phase,
        removed,
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        marbles,
        nextMarbleId,
        camps,
        playerColors,
        selectedIndex: jumpChain ? jumpChain.currentIndex : (validBoardIndex({ preset }, Number(payload.selectedIndex)) ? Number(payload.selectedIndex) : null),
        jumpChain,
        turn: jumpChain && jumpingMarble ? jumpingMarble.color : normalizeChineseCheckersTurn(payload.turn, playerColors),
        winner: phase === 'gameover' ? normalizeChineseCheckersWinner(winner, playerColors) : '',
        winningLine: [],
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, 0),
        ending: phase === 'gameover' ? 'chinese-checkers-win' : '',
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
    if (normalizeStatusGameMode(payload) === GAME_MODES.SOKOBAN) {
      const walls = normalizeStatusSokobanTileSet(normalizeStatusSokobanEntries(payload, preset, 'walls'), preset, removed);
      const targets = normalizeStatusSokobanTileSet(normalizeStatusSokobanEntries(payload, preset, 'targets'), preset, removed);
      const ice = normalizeStatusSokobanTileSet(normalizeStatusSokobanEntries(payload, preset, 'ice'), preset, removed);
      const energyBridges = normalizeStatusSokobanTileSet(normalizeStatusSokobanEntries(payload, preset, 'energyBridges'), preset, removed);
      const players = normalizeStatusSokobanActors(normalizeStatusSokobanEntries(payload, preset, 'players'), preset, removed, 'player', walls);
      const boxes = normalizeStatusSokobanActors(normalizeStatusSokobanEntries(payload, preset, 'boxes'), preset, removed, 'box', walls);
      const playerTiles = new Set(players.map((player) => player.index));
      boxes.forEach((box, index) => {
        if (playerTiles.has(box.index)) throw new Error(`status Sokoban box ${index + 1} overlaps a player`);
      });
      const nextPlayerId = Math.max(
        normalizeNonnegativeInteger(payload.nextPlayerId, 1),
        players.reduce((max, player) => Math.max(max, player.id + 1), 1)
      );
      const nextBoxId = Math.max(
        normalizeNonnegativeInteger(payload.nextBoxId, 1),
        boxes.reduce((max, box) => Math.max(max, box.id + 1), 1)
      );
      const moves = normalizeNonnegativeInteger(payload.moves != null ? payload.moves : payload.round, 0);
      const phase = normalizeStatusPhase(payload.phase);
      const state = {
        gameMode: GAME_MODES.SOKOBAN,
        preset,
        phase,
        removed,
        boxes,
        newBoxIds: new Set(),
        nextBoxId,
        score: 0,
        players,
        nextPlayerId,
        targets,
        walls,
        ice,
        energyBridges,
        moves,
        pushes: normalizeNonnegativeInteger(payload.pushes, 0),
        winner: '',
        winningLine: [],
        resultDismissed: !!payload.resultDismissed,
        round: normalizeNonnegativeInteger(payload.round, moves),
        ending: '',
        debugMessage: ''
      };
      if (phase === 'gameover' && (payload.winner === 'solved' || sokobanSolved(state))) {
        state.winner = 'solved';
        state.ending = 'sokoban-win';
      }
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
    const removedTileSet = new Set(removedTiles.map((tile) => indexOf(tile.row, tile.col, cols)));
    const connectFourHoles = normalizeImportedRemovedTiles(
      Array.isArray(source.connectFourHoles) ? source.connectFourHoles : ((base && base.connectFourHoles) || []),
      rows,
      cols
    ).filter((tile) => !removedTileSet.has(indexOf(tile.row, tile.col, cols)));
    const cutEdges = normalizeImportedCutEdges(
      Array.isArray(source.cutEdges) ? source.cutEdges : ((base && base.cutEdges) || []),
      shell
    );
    shell.cutEdges = cutEdges;
    const gluedEdges = normalizeImportedGluedEdges(
      Array.isArray(source.gluedEdges) ? source.gluedEdges : ((base && !base.randomGlue && base.gluedEdges) || []),
      shell
    );
    const statusPreset = {
      id: IMPORTED_PRESET_ID,
      sourceId,
      label: sanitizeImportedText(source.label || (base && base.label) || 'imported status', 'imported status'),
      lattice,
      rows,
      cols,
      surface: sanitizeImportedText(source.surface || (base && base.surface) || `${latticeForPreset(shell).label} status`, `${latticeForPreset(shell).label} status`),
      removedTiles,
      connectFourHoles,
      cutEdges,
      gluedEdges,
      gomokuWinLength: normalizePresetGomokuWinLength(
        source.gomokuWinLength != null ? source.gomokuWinLength : (base && base.gomokuWinLength),
        sourceId || (base && base.id)
      )
    };
    const pieceSetSource = source.pieceSets || (base && base.pieceSets);
    const pieceSets = normalizePieceSets(pieceSetSource, statusPreset, new Set(removedTileSet));
    if (pieceSetsHaveEntries(pieceSets)) statusPreset.pieceSets = pieceSetsToTileRefs(pieceSets, cols);
    const goKomi = source.goKomi != null ? source.goKomi : (source.komi != null ? source.komi : (base && base.goKomi));
    if (goKomi != null) statusPreset.goKomi = normalizeGoKomi(goKomi);
    const reversiOpening = Array.isArray(source.reversiOpening) ? source.reversiOpening : (base && base.reversiOpening);
    if (Array.isArray(reversiOpening)) statusPreset.reversiOpening = reversiOpening.map((entry) => ({ ...entry }));
    const campSource = source.chineseCheckersCamps || source.camps || (base && base.chineseCheckersCamps);
    if (campSource && typeof campSource === 'object' && !Array.isArray(campSource)) {
      statusPreset.chineseCheckersCamps = chineseCheckersCampsToTileRefs(
        normalizeChineseCheckersCamps(campSource, statusPreset, new Set(removedTileSet), pieceSets),
        cols
      );
    }
    const chinesePlayers = source.chineseCheckersPlayers || source.playerColors || (base && base.chineseCheckersPlayers);
    if (chinesePlayers != null) statusPreset.chineseCheckersPlayers = normalizeChineseCheckersPlayers(chinesePlayers, pieceSets);
    const sokobanSource = source.sokoban || (base && base.sokoban);
    const sokobanDecorations = normalizeSokobanDecorations(sokobanSource, statusPreset, new Set(removedTileSet));
    if (sokobanDecorationHasEntries(sokobanDecorations)) {
      statusPreset.sokoban = sokobanDecorationsToTileRefs(sokobanDecorations, cols);
    }
    return statusPreset;
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

  function normalizeStatusSokobanEntries(payload, preset, field) {
    const direct = firstSokobanFieldValue(payload, field);
    if (direct !== undefined) return direct;
    const nested = payload && payload.sokoban && typeof payload.sokoban === 'object' && !Array.isArray(payload.sokoban)
      ? firstSokobanFieldValue(payload.sokoban, field)
      : undefined;
    if (nested !== undefined) return nested;
    return preset && preset.sokoban ? firstSokobanFieldValue(preset.sokoban, field) : [];
  }

  function normalizeStatusSokobanTileSet(entries, preset, removed) {
    return normalizeSokobanTileSet(entries, preset, removed);
  }

  function normalizeStatusSokobanActors(entries, preset, removed, label, blockers = new Set()) {
    const source = typeof entries === 'string'
      ? parseCompactTileList(entries, preset.rows, preset.cols)
      : (Array.isArray(entries) ? entries : []);
    const usedIds = new Set();
    const occupied = new Set();
    return source.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status Sokoban ${label} ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status Sokoban ${label} ${index + 1} is on a removed tile`);
      if (blockers.has(tileIndex)) throw new Error(`status Sokoban ${label} ${index + 1} is on a wall`);
      if (occupied.has(tileIndex)) throw new Error(`status Sokoban ${label} ${index + 1} overlaps another ${label}`);
      occupied.add(tileIndex);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status Sokoban ${label} id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex };
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

  function normalizeStatusGoStones(entries, preset, removed) {
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
      const color = normalizeGoColor(entry && entry.color);
      if (!color) throw new Error(`status stone ${index + 1} color must be black or white`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status stone id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, color };
    });
  }

  function normalizeStatusGoDeadStoneIds(entries, stones) {
    const validIds = new Set((stones || []).map((stone) => stone.id));
    const ids = new Set();
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const id = Number(entry);
      if (Number.isInteger(id) && validIds.has(id)) ids.add(id);
    });
    return ids;
  }

  function normalizeStatusReversiDiscs(entries, preset, removed) {
    if (!Array.isArray(entries)) throw new Error('status discs must be an array');
    const usedIds = new Set();
    const occupied = new Set();
    return entries.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status disc ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status disc ${index + 1} is on a removed tile`);
      if (occupied.has(tileIndex)) throw new Error(`status disc ${index + 1} shares an occupied tile`);
      occupied.add(tileIndex);
      const color = normalizeReversiColor(entry && entry.color);
      if (!color) throw new Error(`status disc ${index + 1} color must be black or white`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status disc id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, color };
    });
  }

  function normalizeStatusChineseCheckersMarbles(entries, preset, removed) {
    if (!Array.isArray(entries)) throw new Error('status marbles must be an array');
    const usedIds = new Set();
    const occupied = new Set();
    return entries.map((entry, index) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) throw new Error(`status marble ${index + 1} has an invalid tile`);
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(tileIndex)) throw new Error(`status marble ${index + 1} is on a removed tile`);
      if (occupied.has(tileIndex)) throw new Error(`status marble ${index + 1} shares an occupied tile`);
      occupied.add(tileIndex);
      const color = normalizeChineseCheckersColor(entry && entry.color);
      if (!color) throw new Error(`status marble ${index + 1} color is invalid`);
      const id = normalizePositiveInteger(entry && entry.id, index + 1);
      if (usedIds.has(id)) throw new Error(`status marble id ${id} is duplicated`);
      usedIds.add(id);
      return { id, index: tileIndex, color };
    });
  }

  function normalizeStatusChineseCheckersJumpChain(value, marbles, preset, removed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const marbleId = Number(value.marbleId);
    const moving = Number.isInteger(marbleId) ? marbles.find((marble) => marble.id === marbleId) : null;
    if (!moving) return null;
    const startIndex = Number(value.startIndex);
    const currentIndex = Number(value.currentIndex);
    const stateLike = { preset };
    if (!validBoardIndex(stateLike, startIndex) || !validBoardIndex(stateLike, currentIndex)) return null;
    if (removed.has(startIndex) || removed.has(currentIndex) || moving.index !== currentIndex) return null;
    return {
      marbleId,
      startIndex,
      currentIndex,
      segments: cloneChineseCheckerMoveSegments(value.segments)
    };
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
    if (value === GAME_MODES.CHINESE_CHECKERS || value === 'chinese checkers' || value === 'chinesecheckers') {
      return GAME_MODES.CHINESE_CHECKERS;
    }
    if (value === GAME_MODES.SOKOBAN) {
      return GAME_MODES.SOKOBAN;
    }
    if (value === GAME_MODES.CONNECT_FOUR || value === 'connectfour' || value === 'connect four') {
      return GAME_MODES.CONNECT_FOUR;
    }
    if (value === GAME_MODES.REVERSI || value === 'othello') {
      return GAME_MODES.REVERSI;
    }
    if (value === GAME_MODES.GO) {
      return GAME_MODES.GO;
    }
    if (value === GAME_MODES.GOMOKU || (Array.isArray(payload && payload.stones) && !Array.isArray(payload && payload.boxes))) {
      return GAME_MODES.GOMOKU;
    }
    if (Array.isArray(payload && payload.tokens) && !Array.isArray(payload && payload.boxes)) {
      return GAME_MODES.CONNECT_FOUR;
    }
    if (Array.isArray(payload && payload.discs) && !Array.isArray(payload && payload.boxes)) {
      return GAME_MODES.REVERSI;
    }
    if (Array.isArray(payload && payload.marbles) && !Array.isArray(payload && payload.boxes)) {
      return GAME_MODES.CHINESE_CHECKERS;
    }
    if ((payload && payload.sokoban && typeof payload.sokoban === 'object')
      || (Array.isArray(payload && payload.players) && Array.isArray(payload && payload.boxes))) {
      return GAME_MODES.SOKOBAN;
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

  function normalizeOptionalGomokuWinLength(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 3 ? number : undefined;
  }

  function normalizePresetGomokuWinLength(value, presetId) {
    const normalized = normalizeOptionalGomokuWinLength(value);
    if (officialGomokuDefaultWinLengthPreset(presetId) && normalized && normalized < GOMOKU_WIN_LENGTH) {
      return undefined;
    }
    return normalized;
  }

  function officialGomokuDefaultWinLengthPreset(presetId) {
    return OFFICIAL_GOMOKU_DEFAULT_WIN_LENGTH_PRESETS.has(cleanPresetId(presetId));
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
      .slice(0, gomokuWinLengthForPreset(preset));
  }

  function normalizeGoColor(value) {
    const color = String(value || '').trim().toLowerCase();
    return GO_COLORS.includes(color) ? color : '';
  }

  function normalizeGoTurn(value, stoneCount) {
    const color = normalizeGoColor(value);
    if (color) return color;
    return stoneCount % 2 === 0 ? 'black' : 'white';
  }

  function normalizeGoWinner(value) {
    return normalizeGoColor(value);
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

  function normalizeChineseCheckersWinningLine(entries, preset) {
    if (!Array.isArray(entries)) return [];
    const total = preset.rows * preset.cols;
    return entries
      .map((entry) => Number(entry))
      .filter((index) => Number.isInteger(index) && index >= 0 && index < total);
  }

  function normalizeReversiColor(value) {
    const color = String(value || '').trim().toLowerCase();
    return REVERSI_COLORS.includes(color) ? color : '';
  }

  function normalizeReversiTurn(value, discCount) {
    const color = normalizeReversiColor(value);
    if (color) return color;
    return discCount % 2 === 0 ? 'black' : 'white';
  }

  function normalizeReversiWinner(value) {
    return normalizeReversiColor(value);
  }

  function normalizeChineseCheckersColor(value) {
    return normalizePlacementColor(value);
  }

  function normalizeChineseCheckersTurn(value, playerColors = CHINESE_CHECKERS_DEFAULT_COLORS) {
    const color = normalizeChineseCheckersColor(value);
    const players = normalizeChineseCheckersPlayers(playerColors);
    if (color && players.includes(color)) return color;
    return players[0] || 'red';
  }

  function normalizeChineseCheckersWinner(value, playerColors = null) {
    const color = normalizeChineseCheckersColor(value);
    if (!color) return '';
    const players = playerColors ? normalizeChineseCheckersPlayers(playerColors) : [];
    return !players.length || players.includes(color) ? color : '';
  }

  function normalizePlacementColor(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return '';
    return text.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  }

  function comparePlacementColors(left, right) {
    const leftOrder = PLACEMENT_COLOR_ORDER.has(left) ? PLACEMENT_COLOR_ORDER.get(left) : PLACEMENT_KNOWN_COLORS.length;
    const rightOrder = PLACEMENT_COLOR_ORDER.has(right) ? PLACEMENT_COLOR_ORDER.get(right) : PLACEMENT_KNOWN_COLORS.length;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left).localeCompare(String(right));
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
    if (isGoGame(game)) {
      if (game.phase === 'setup') {
        syncStatus(`${game.preset.label} Go preview`, `${previewInfo(game.preset)}; komi ${formatKomi(game.komi)}`, 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        if (game.winner) syncStatus(`${goColorLabel(game.winner)} wins`, goFinalScoreText(game), 'over');
        else syncStatus('Go draw', goFinalScoreText(game), 'over');
        return;
      }
      syncStatus(`Go move ${game.round || 0}`, goTurnInfo(game), phaseBadge(game.phase));
      return;
    }
    if (isReversiGame(game)) {
      if (game.phase === 'setup') {
        syncStatus(`${game.preset.label} Reversi preview`, previewInfo(game.preset), 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        if (game.winner) syncStatus(`${reversiColorLabel(game.winner)} wins`, reversiFinalScoreText(game), 'over');
        else syncStatus('Reversi draw', reversiFinalScoreText(game), 'over');
        return;
      }
      syncStatus(`Reversi move ${game.round || 0}`, reversiTurnInfo(game), phaseBadge(game.phase));
      return;
    }
    if (isChineseCheckersGame(game)) {
      if (game.phase === 'setup') {
        syncStatus(`${game.preset.label} Chinese Checkers preview`, previewInfo(game.preset), 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        syncStatus(`${chineseCheckersColorLabel(game.winner)} wins`, `${game.round || 0} move${game.round === 1 ? '' : 's'}`, 'over');
        return;
      }
      syncStatus(`Chinese Checkers move ${game.round || 0}`, chineseCheckersTurnInfo(game), phaseBadge(game.phase));
      return;
    }
    if (isSokobanGame(game)) {
      if (game.phase === 'setup') {
        const issue = sokobanSetupIssue(game);
        syncStatus(`${game.preset.label} Sokoban preview`, issue ? `${previewInfo(game.preset)}; ${issue}` : previewInfo(game.preset), issue ? 'warn' : 'setup');
        return;
      }
      if (game.phase === 'gameover') {
        syncStatus('Sokoban solved', sokobanTurnInfo(game), 'over');
        return;
      }
      syncStatus(`Sokoban move ${game.moves || 0}`, sokobanTurnInfo(game), phaseBadge(game.phase));
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
    syncStatus(statusText || `round ${game.round}`, 'use arrow keys, buttons, or swipe/drag to slide', phaseBadge(game.phase));
  }

  function goFinalScoreText(state) {
    const score = state.finalScore || scoreGoGame(state);
    return `black ${score.black}, white ${score.white}`;
  }

  function reversiFinalScoreText(state) {
    const score = state.finalScore || reversiDiscCounts(state);
    return `black ${score.black}, white ${score.white}`;
  }

  function phaseBadge(phase) {
    if (phase === 'setup') return 'setup';
    if (phase === 'animating') return 'moving';
    if (phase === 'paused') return 'step';
    if (phase === 'gameover') return 'over';
    if (phase === 'ready') return 'ready';
    return phase || '';
  }

  function connectFourAlignFallEnabled() {
    return !refs.connectFourAlignFall || !!refs.connectFourAlignFall.checked;
  }

  function connectFourDisplayRotationAngle() {
    if (!connectFourAlignFallEnabled()) return 0;
    const activeConnectFour = isConnectFourGame(game) || selectedGameMode() === GAME_MODES.CONNECT_FOUR;
    if (!activeConnectFour) return 0;
    const preset = isConnectFourGame(game) ? game.preset : selectedPreset();
    const fallDir = isConnectFourGame(game) && Number.isInteger(game.fallDir)
      ? game.fallDir
      : selectedConnectFourFallDir(preset);
    const lattice = latticeForPreset(preset);
    const fallAngle = lattice.angles[modulo(fallDir, lattice.sides)] || 0;
    return normalizeAngle((Math.PI / 2) - fallAngle);
  }

  function normalizeAngle(angle) {
    let result = angle;
    while (result > Math.PI) result -= Math.PI * 2;
    while (result <= -Math.PI) result += Math.PI * 2;
    return result;
  }

  function applyDisplayRotationToGeometry(geom, angle) {
    const baseWidth = geom.width;
    const baseHeight = geom.height;
    geom.baseWidth = baseWidth;
    geom.baseHeight = baseHeight;
    const normalized = normalizeAngle(angle || 0);
    if (Math.abs(normalized) < 1e-8) {
      geom.displayTransform = null;
      return geom;
    }
    const centerX = baseWidth / 2;
    const centerY = baseHeight / 2;
    const cos = Math.cos(normalized);
    const sin = Math.sin(normalized);
    const corners = [
      rotatePointAround({ x: 0, y: 0 }, centerX, centerY, cos, sin),
      rotatePointAround({ x: baseWidth, y: 0 }, centerX, centerY, cos, sin),
      rotatePointAround({ x: baseWidth, y: baseHeight }, centerX, centerY, cos, sin),
      rotatePointAround({ x: 0, y: baseHeight }, centerX, centerY, cos, sin)
    ];
    const minX = Math.min(...corners.map((point) => point.x));
    const minY = Math.min(...corners.map((point) => point.y));
    const maxX = Math.max(...corners.map((point) => point.x));
    const maxY = Math.max(...corners.map((point) => point.y));
    geom.width = Math.ceil(maxX - minX);
    geom.height = Math.ceil(maxY - minY);
    geom.displayTransform = {
      angle: normalized,
      cos,
      sin,
      centerX,
      centerY,
      minX,
      minY
    };
    return geom;
  }

  function rotatePointAround(point, centerX, centerY, cos, sin) {
    const x = point.x - centerX;
    const y = point.y - centerY;
    return {
      x: centerX + (x * cos) - (y * sin),
      y: centerY + (x * sin) + (y * cos)
    };
  }

  function applyGeometryDisplayTransform(ctx, geom) {
    const transform = geom && geom.displayTransform;
    if (!transform) return;
    ctx.translate(-transform.minX, -transform.minY);
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.angle);
    ctx.translate(-transform.centerX, -transform.centerY);
  }

  function displayPointToGeometryPoint(point, geom) {
    const transform = geom && geom.displayTransform;
    if (!point || !transform) return point;
    const shiftedX = point.x + transform.minX - transform.centerX;
    const shiftedY = point.y + transform.minY - transform.centerY;
    return {
      x: transform.centerX + (shiftedX * transform.cos) + (shiftedY * transform.sin),
      y: transform.centerY - (shiftedX * transform.sin) + (shiftedY * transform.cos)
    };
  }

  function render() {
    if (!refs.canvas || !refs.ctx) return;
    const preset = game ? game.preset : selectedPreset();
    if (!preset) return;
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
    applyDisplayRotationToGeometry(geometry, connectFourDisplayRotationAngle());
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

    ctx.save();
    applyGeometryDisplayTransform(ctx, geometry);
    const vertexDisplay = isPlacementGame(game) && placementDisplayStyle() === 'vertex';
    if (!vertexDisplay) {
      geometry.cells.forEach((cell, index) => {
        if (cell) drawTile(ctx, geometry, cell.row, cell.col, removed.has(index), explosionMode);
      });
    }

    drawBackgroundBoundaries(ctx, geometry, preset, removed);
    drawGlueEdges(ctx, geometry, preset, hoveredGlue);
    if (isPlacementGame(game)) {
      if (vertexDisplay) drawPlacementVertexBoard(ctx, geometry, game);
      else if (isConnectFourGame(game)) drawConnectFourHoles(ctx, geometry, game);
      if (!isConnectFourDropAnimation() && !isChineseCheckersGame(game)) drawPlacementWinningLine(ctx, geometry, game);
      if (isGoGame(game)) drawGoScoreOverlay(ctx, geometry, game);
      drawPlacementSelectionOverlays(ctx, geometry, game);
      drawPlacementPieces(ctx, geometry, placementPieces(game));
      if (isGoGame(game)) drawGoDeadStoneMarks(ctx, geometry, game);
      drawPlacementAnimationOverlays(ctx, geometry);
      drawPlacementFeedbackOverlays(ctx, geometry);
    } else {
      if (isSokobanGame(game)) {
        drawSokobanGame(ctx, geometry, game);
      } else {
        drawNumberBoxes(ctx, geometry, game ? game.boxes : []);
        drawAnimationOverlays(ctx, geometry);
        drawDebugDirectionIndicators(ctx, geometry);
      }
    }
    ctx.restore();
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

  function drawSokobanGame(ctx, geom, state) {
    if (!isSokobanGame(state)) return;
    const objectScale = selectedSokobanObjectScale();
    drawSokobanIndexSet(ctx, geom, state.targets, 'target');
    drawSokobanIndexSet(ctx, geom, state.ice, 'ice', objectScale);
    drawSokobanEnergyBeams(ctx, geom, state);
    drawSokobanIndexSet(ctx, geom, state.energyBridges, 'energyBridge', objectScale);
    drawSokobanIndexSet(ctx, geom, state.walls, 'wall', objectScale);
    (state.boxes || []).forEach((box) => drawSokobanBox(ctx, geom, box.index, objectScale));
    (state.players || []).forEach((player) => drawSokobanPlayer(ctx, geom, player.index));
  }

  function drawSokobanIndexSet(ctx, geom, indices, kind, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    if (!(indices instanceof Set) || !indices.size) return;
    Array.from(indices).sort((a, b) => a - b).forEach((index) => {
      if (kind === 'target') drawSokobanTarget(ctx, geom, index);
      else if (kind === 'ice') drawSokobanIce(ctx, geom, index, objectScale);
      else if (kind === 'energyBridge') drawSokobanEnergyBridge(ctx, geom, index, objectScale);
      else if (kind === 'wall') drawSokobanWall(ctx, geom, index, objectScale);
    });
  }

  function drawSokobanTileShape(ctx, geom, index, scale = 0.8) {
    const cell = geom.cells[index];
    if (!cell) return false;
    const points = tilePoints(cell.x, cell.y, geom.radius * scale, geom.lattice);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    return true;
  }

  function drawSokobanTarget(ctx, geom, index) {
    const cell = geom.cells[index];
    if (!cell) return;
    ctx.save();
    ctx.strokeStyle = '#c47f17';
    ctx.fillStyle = 'rgba(196,127,23,0.14)';
    ctx.lineWidth = Math.max(1.5, geom.radius * 0.08);
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, geom.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cell.x - geom.radius * 0.28, cell.y);
    ctx.lineTo(cell.x + geom.radius * 0.28, cell.y);
    ctx.moveTo(cell.x, cell.y - geom.radius * 0.28);
    ctx.lineTo(cell.x, cell.y + geom.radius * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function drawSokobanIce(ctx, geom, index, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    const cell = geom.cells[index];
    if (!cell) return;
    const half = geom.radius * objectScale;
    ctx.save();
    if (drawSokobanTileShape(ctx, geom, index, objectScale)) {
      ctx.fillStyle = 'rgba(142,202,230,0.36)';
      ctx.strokeStyle = 'rgba(33,94,122,0.45)';
      ctx.lineWidth = Math.max(1, geom.radius * 0.045);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(33,94,122,0.48)';
    ctx.lineWidth = Math.max(1, geom.radius * 0.035);
    for (let offset = -0.34; offset <= 0.36; offset += 0.34) {
      ctx.beginPath();
      ctx.moveTo(cell.x - half * 0.58, cell.y + half * offset);
      ctx.lineTo(cell.x + half * 0.58, cell.y + half * (offset - 0.24));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSokobanEnergyBridge(ctx, geom, index, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    const cell = geom.cells[index];
    if (!cell) return;
    drawSokobanCrate(ctx, cell, geom.radius, objectScale, { glow: selectedSokobanEnergyGlow() }, geom.lattice);
  }

  function drawSokobanEnergyBeams(ctx, geom, state) {
    const beams = sokobanEnergyBeamObjects(state);
    if (!beams.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    beams.forEach((beam) => drawSokobanEnergyBeam(ctx, geom, state, beam));
    ctx.restore();
  }

  function drawSokobanEnergyBeam(ctx, geom, state, beam) {
    const beamStyle = selectedSokobanBeamStyle();
    const lineWidth = Math.max(4, geom.radius * 2 * beamStyle.width);
    const haloWidth = Math.max(lineWidth * 1.18, geom.radius * 0.44);
    const segments = placementLineRenderSegments(state, geom, beam.start, beam.end, beam.route);
    ctx.save();
    ctx.shadowColor = `rgba(34,197,94,${Math.min(0.55, beamStyle.opacity + 0.16).toFixed(2)})`;
    ctx.shadowBlur = Math.max(5, geom.radius * 0.18);
    ctx.strokeStyle = `rgba(34,197,94,${Math.max(0.08, beamStyle.opacity * 0.55).toFixed(2)})`;
    ctx.lineWidth = haloWidth;
    segments.forEach((segment) => {
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(22,163,74,${beamStyle.opacity.toFixed(2)})`;
    ctx.lineWidth = lineWidth;
    segments.forEach((segment) => {
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
      ctx.stroke();
    });
    ctx.fillStyle = `rgba(34,197,94,${Math.max(0.06, beamStyle.opacity * 0.42).toFixed(2)})`;
    ctx.strokeStyle = `rgba(22,163,74,${Math.max(0.12, beamStyle.opacity * 0.7).toFixed(2)})`;
    ctx.lineWidth = Math.max(1, geom.radius * 0.035);
    beam.interior.forEach((index) => {
      if (!drawSokobanTileShape(ctx, geom, index, 0.58)) return;
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawSokobanWall(ctx, geom, index, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    const cell = geom.cells[index];
    if (!cell) return;
    ctx.save();
    if (drawSokobanTileShape(ctx, geom, index, objectScale)) {
      ctx.fillStyle = '#6c6257';
      ctx.strokeStyle = '#2f2118';
      ctx.lineWidth = Math.max(1.3, geom.radius * 0.055);
      ctx.fill();
      ctx.stroke();
    }
    drawSokobanBrickPattern(ctx, geom, index, objectScale);
    ctx.restore();
  }

  function drawSokobanBrickPattern(ctx, geom, index, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    const cell = geom.cells[index];
    if (!cell) return;
    const half = geom.radius * objectScale;
    ctx.save();
    drawSokobanTileShape(ctx, geom, index, objectScale);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,253,248,0.35)';
    ctx.lineWidth = Math.max(1, geom.radius * 0.035);
    const rows = 4;
    const rowHeight = (half * 2) / rows;
    for (let row = 1; row < rows; row += 1) {
      const y = cell.y - half + rowHeight * row;
      ctx.beginPath();
      ctx.moveTo(cell.x - half, y);
      ctx.lineTo(cell.x + half, y);
      ctx.stroke();
    }
    for (let row = 0; row < rows; row += 1) {
      const y0 = cell.y - half + rowHeight * row;
      const y1 = y0 + rowHeight;
      const offset = row % 2 === 0 ? 0 : rowHeight * 0.55;
      for (let x = cell.x - half + offset; x < cell.x + half; x += rowHeight * 1.1) {
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSokobanBox(ctx, geom, index, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100) {
    const cell = geom.cells[index];
    if (!cell) return;
    drawSokobanCrate(ctx, cell, geom.radius, objectScale, {}, geom.lattice);
  }

  function drawSokobanCrate(ctx, cell, radius, objectScale = SOKOBAN_OBJECT_SCALE_DEFAULT / 100, options = {}, lattice = LATTICES.square) {
    const side = radius * 2 * objectScale;
    const glow = options.glow && typeof options.glow === 'object'
      ? options.glow
      : (options.glow ? {
        inner: SOKOBAN_ENERGY_GLOW_INNER_DEFAULT / 100,
        outer: SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT / 100,
        blur: SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT / 100
      } : null);
    ctx.save();
    if (glow && glow.outer > 0) {
      ctx.shadowColor = `rgba(34,197,94,${clampNumber(glow.outer, 0, 1).toFixed(2)})`;
      ctx.shadowBlur = Math.max(1, radius * clampNumber(glow.blur, 0, 1));
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
    drawSokobanCratePath(ctx, cell, radius, objectScale, lattice);
    ctx.fillStyle = '#b8793f';
    ctx.strokeStyle = '#5d351e';
    ctx.lineWidth = Math.max(1.5, radius * 0.055);
    ctx.fill();
    ctx.stroke();
    if (glow && glow.inner > 0) {
      const innerAlpha = clampNumber(glow.inner, 0, 1);
      ctx.save();
      ctx.shadowBlur = 0;
      drawSokobanCratePath(ctx, cell, radius, objectScale, lattice);
      ctx.clip();
      const gradient = ctx.createRadialGradient
        ? ctx.createRadialGradient(cell.x, cell.y, side * 0.08, cell.x, cell.y, side * 0.55)
        : null;
      if (gradient && typeof gradient.addColorStop === 'function') {
        gradient.addColorStop(0, `rgba(34,197,94,${(innerAlpha * 0.52).toFixed(2)})`);
        gradient.addColorStop(0.62, `rgba(34,197,94,${(innerAlpha * 0.22).toFixed(2)})`);
        gradient.addColorStop(1, 'rgba(34,197,94,0)');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = `rgba(34,197,94,${(innerAlpha * 0.24).toFixed(2)})`;
      }
      ctx.fillRect(cell.x - side / 2, cell.y - side / 2, side, side);
      ctx.restore();
    }
    if (glow && glow.outer > 0) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(34,197,94,${Math.min(0.95, clampNumber(glow.outer, 0, 1) + 0.06).toFixed(2)})`;
      ctx.lineWidth = Math.max(1.2, radius * 0.045);
      drawSokobanCratePath(ctx, cell, radius, objectScale, lattice);
      ctx.stroke();
    }
    drawSokobanCrateMark(ctx, cell, radius, objectScale, lattice);
    ctx.restore();
  }

  function drawSokobanCratePath(ctx, cell, radius, objectScale, lattice) {
    if (lattice && lattice.shape === 'hex') {
      const points = tilePoints(cell.x, cell.y, radius * objectScale, lattice);
      ctx.beginPath();
      points.forEach((point, pointIndex) => {
        if (pointIndex === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      return;
    }
    const side = radius * 2 * objectScale;
    roundedRectPath(ctx, cell.x - side / 2, cell.y - side / 2, side, side, Math.min(5, radius * 0.12));
  }

  function drawSokobanCrateMark(ctx, cell, radius, objectScale, lattice) {
    if (lattice && lattice.shape === 'hex') {
      drawSokobanSnowflakeMark(ctx, cell, radius * objectScale * 0.64, radius);
      return;
    }
    const side = radius * 2 * objectScale;
    ctx.strokeStyle = 'rgba(255,253,248,0.36)';
    ctx.lineWidth = Math.max(1, radius * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cell.x - side * 0.32, cell.y - side * 0.32);
    ctx.lineTo(cell.x + side * 0.32, cell.y + side * 0.32);
    ctx.moveTo(cell.x + side * 0.32, cell.y - side * 0.32);
    ctx.lineTo(cell.x - side * 0.32, cell.y + side * 0.32);
    ctx.stroke();
  }

  function drawSokobanSnowflakeMark(ctx, cell, length, radius) {
    ctx.strokeStyle = 'rgba(255,253,248,0.46)';
    ctx.lineWidth = Math.max(1, radius * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    [0, Math.PI / 3, (2 * Math.PI) / 3].forEach((angle) => {
      const dx = Math.cos(angle) * length;
      const dy = Math.sin(angle) * length;
      ctx.moveTo(cell.x - dx, cell.y - dy);
      ctx.lineTo(cell.x + dx, cell.y + dy);
    });
    ctx.stroke();
  }

  function drawSokobanPlayer(ctx, geom, index) {
    const cell = geom.cells[index];
    if (!cell) return;
    const r = geom.radius;
    const headY = cell.y - r * 0.38;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawBodyPath = () => {
      ctx.beginPath();
      ctx.moveTo(cell.x, cell.y - r * 0.2);
      ctx.lineTo(cell.x, cell.y + r * 0.28);
      ctx.moveTo(cell.x - r * 0.36, cell.y - r * 0.02);
      ctx.lineTo(cell.x + r * 0.36, cell.y - r * 0.02);
      ctx.moveTo(cell.x, cell.y + r * 0.28);
      ctx.lineTo(cell.x - r * 0.34, cell.y + r * 0.56);
      ctx.moveTo(cell.x, cell.y + r * 0.28);
      ctx.lineTo(cell.x + r * 0.34, cell.y + r * 0.56);
    };

    ctx.strokeStyle = 'rgba(255,253,248,0.92)';
    ctx.lineWidth = Math.max(4, r * 0.16);
    drawBodyPath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cell.x, headY, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#111111';
    ctx.fillStyle = '#fffdf8';
    ctx.lineWidth = Math.max(2, r * 0.075);
    ctx.beginPath();
    ctx.arc(cell.x, headY, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawBodyPath();
    ctx.stroke();
    ctx.restore();
  }

  function drawPlacementWinningLine(ctx, geom, state) {
    if (isChineseCheckersGame(state)) return;
    if (!state || !state.winningLine || !state.winningLine.length) return;
    const highlightCounts = placementWinningLineIndexCounts(state);
    const segments = placementWinningLineSegments(state, geom);
    ctx.save();
    if (segments.length) {
      const repeatGap = Math.max(3, geom.radius * 0.12);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(17,17,17,0.22)';
      drawWinningLooseSegments(ctx, segments, Math.max(5, geom.radius * 0.22), repeatGap);
      ctx.strokeStyle = '#b23a48';
      drawWinningLooseSegments(ctx, segments, Math.max(2.6, geom.radius * 0.1), repeatGap);
    }
    ctx.fillStyle = 'rgba(196,127,23,0.2)';
    ctx.strokeStyle = 'rgba(196,127,23,0.78)';
    ctx.lineWidth = Math.max(1.4, geom.radius * 0.06);
    highlightCounts.forEach((count, index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.46, 0, Math.PI * 2);
      ctx.fill();
      const maxRadius = geom.radius * 0.78;
      const baseRadius = geom.radius * 0.5;
      const radiusStep = count > 1
        ? Math.min(geom.radius * 0.12, (maxRadius - baseRadius) / Math.max(1, count - 1))
        : 0;
      for (let occurrence = 0; occurrence < count; occurrence += 1) {
        const radius = baseRadius + radiusStep * occurrence;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function placementWinningLineIndexCounts(state) {
    const counts = new Map();
    const line = Array.isArray(state && state.winningLine) ? state.winningLine : [];
    line.forEach((index) => {
      if (!Number.isInteger(index)) return;
      counts.set(index, (counts.get(index) || 0) + 1);
    });
    return counts;
  }

  function drawWinningLooseSegments(ctx, segments, baseWidth, repeatGap) {
    segments.forEach((segment) => {
      const reuseCount = Math.max(1, segment.count || 1);
      const offsets = winningSegmentRepeatOffsets(segment, reuseCount, repeatGap);
      ctx.lineWidth = baseWidth;
      offsets.forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(segment.start.x + offset.x, segment.start.y + offset.y);
        ctx.lineTo(segment.end.x + offset.x, segment.end.y + offset.y);
        ctx.stroke();
      });
    });
  }

  function winningSegmentRepeatOffsets(segment, reuseCount, repeatGap) {
    const count = Math.max(1, Math.floor(reuseCount || 1));
    if (count === 1) return [{ x: 0, y: 0 }];
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return [{ x: 0, y: 0 }];
    const gap = Math.max(1, repeatGap || 1);
    const normal = { x: -dy / length, y: dx / length };
    return Array.from({ length: count }, (_, index) => {
      const distance = (index - (count - 1) / 2) * gap;
      return {
        x: normal.x * distance,
        y: normal.y * distance
      };
    });
  }

  function placementWinningLineSegments(state, geom) {
    const line = Array.isArray(state && state.winningLine) ? state.winningLine : [];
    const routes = placementWinningLineDiagonalRoutes(state, line);
    const keyed = [];
    const counts = new Map();
    for (let index = 0; index + 1 < line.length; index += 1) {
      const route = routes ? routes[index] : null;
      placementLineRenderSegments(state, geom, line[index], line[index + 1], route).forEach((segment) => {
        const key = segment.key || placementSegmentPointKey(segment);
        if (!key) return;
        if (!counts.has(key)) {
          keyed.push({ ...segment, key });
          counts.set(key, 0);
        }
        counts.set(key, counts.get(key) + 1);
      });
    }
    return keyed.map((segment) => ({ ...segment, count: counts.get(segment.key) || 1 }));
  }

  function placementLineRenderSegments(state, geom, fromIndex, toIndex, preferredRoute = null) {
    const from = placementPiecePoint(geom, fromIndex);
    const to = placementPiecePoint(geom, toIndex);
    if (!from || !to) return [];
    const route = preferredRoute || placementLineTransitionRoute(state, fromIndex, toIndex);
    if (!route || !route.transitions.length || !route.transitions.some((transition) => transition.glued)) {
      if (route && route.kind === 'diagonal') return placementDiagonalHalfLineSegments(state, geom, route);
      return samePoint(from, to) ? [] : [keyedPlacementSegment(from, to)];
    }
    if (route.kind === 'diagonal') return placementDiagonalHalfLineSegments(state, geom, route);
    return placementGluedAxisLineSegments(state, geom, route, from, to);
  }

  function placementWinningLineDiagonalRoutes(state, line) {
    if (!state || !state.preset || !Array.isArray(line) || line.length < 2) return null;
    const axes = gomokuDiagonalAxes(state.preset);
    for (const axis of axes) {
      const forward = placementMatchDiagonalRouteSequence(state, line, axis.forward);
      if (forward) return forward;
      const backward = placementMatchDiagonalRouteSequence(state, line, axis.backward);
      if (backward) return backward;
    }
    return null;
  }

  function placementMatchDiagonalRouteSequence(state, line, orders) {
    const search = (position, currentOrders) => {
      if (position + 1 >= line.length) return [];
      const candidates = gomokuDiagonalStepCandidates(state, line[position], currentOrders);
      for (const candidate of candidates) {
        if (candidate.index !== line[position + 1] || !candidate.route) continue;
        const rest = search(position + 1, candidate.orders);
        if (rest) return [candidate.route].concat(rest);
      }
      return null;
    };
    return search(0, normalizeDiagonalOrders(orders));
  }

  function placementGluedAxisLineSegments(state, geom, route, from, to) {
    const segments = [];
    let anchor = from;
    route.transitions.forEach((transition) => {
      if (!transition.glued || !transition.edge) return;
      const outgoing = placementTransitionBoundaryPoint(state, geom, route, transition, false);
      if (anchor && outgoing && !samePoint(anchor, outgoing)) {
        segments.push(keyedPlacementSegment(anchor, outgoing));
      }
      anchor = placementTransitionBoundaryPoint(state, geom, route, transition, true);
    });
    if (anchor && !samePoint(anchor, to)) segments.push(keyedPlacementSegment(anchor, to));
    return segments;
  }

  function placementDiagonalHalfLineSegments(state, geom, route) {
    if (!route || !Array.isArray(route.transitions) || route.transitions.length < 2) return [];
    const from = placementPiecePoint(geom, route.start);
    const to = placementPiecePoint(geom, route.end);
    if (!from || !to) return [];
    const startVertex = placementDiagonalEndpointVertex(state, geom, route, false);
    const endVertex = placementDiagonalEndpointVertex(state, geom, route, true);
    const segments = [];
    if (startVertex && !samePoint(from, startVertex)) {
      segments.push(keyedPlacementSegment(from, startVertex, placementDiagonalEndpointKey(route.start, startVertex)));
    }
    if (endVertex && !samePoint(to, endVertex)) {
      segments.push(keyedPlacementSegment(endVertex, to, placementDiagonalEndpointKey(route.end, endVertex)));
    }
    return segments;
  }

  function placementDiagonalEndpointVertex(state, geom, route, entry) {
    const transitions = route && Array.isArray(route.transitions) ? route.transitions : [];
    if (!transitions.length) return null;
    if (!entry) {
      const first = transitions[0];
      const companion = Number.isInteger(first.companionBefore)
        ? first.companionBefore
        : route.directions && route.directions.length > 1
          ? route.directions[1]
          : null;
      if (!Number.isInteger(first.outDir)) return null;
      if (!Number.isInteger(companion)) {
        return edgeMidpointFromIndex(geom, route.start, first.outDir);
      }
      return edgePointTowardDir(geom, route.start, first.outDir, companion);
    }
    const last = transitions[transitions.length - 1];
    const edgeDir = Number.isInteger(last.dir) ? oppositeDir(state.preset, last.dir) : null;
    const companion = Number.isInteger(last.companionAfter)
      ? last.companionAfter
      : route.directions && route.directions.length > 1
        ? oppositeDir(state.preset, route.directions[0])
        : null;
    if (!Number.isInteger(edgeDir)) return null;
    if (!Number.isInteger(companion)) {
      return edgeMidpointFromIndex(geom, route.end, edgeDir);
    }
    return edgePointTowardDir(geom, route.end, edgeDir, companion);
  }

  function keyedPlacementSegment(start, end, key) {
    return {
      start,
      end,
      key: key || placementSegmentPointKey({ start, end })
    };
  }

  function placementDiagonalEndpointKey(index, point) {
    return `diag:${index}:${pointCoordinateKey(point)}`;
  }

  function placementSegmentPointKey(segment) {
    if (!segment || !segment.start || !segment.end) return '';
    const startKey = pointCoordinateKey(segment.start);
    const endKey = pointCoordinateKey(segment.end);
    return startKey <= endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
  }

  function pointCoordinateKey(point) {
    return `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;
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

  function drawGoScoreOverlay(ctx, geom, state) {
    if (!shouldShowGoScoreAnnotations(state)) return;
    const score = scoreGoGame(state);
    const ownership = score.ownership || { black: [], white: [], neutral: [] };
    ctx.save();
    drawGoOwnedRegion(ctx, geom, ownership.black, 'rgba(17,17,17,0.13)', 'rgba(17,17,17,0.34)');
    drawGoOwnedRegion(ctx, geom, ownership.white, 'rgba(247,241,231,0.58)', 'rgba(141,127,112,0.46)');
    drawGoOwnedRegion(ctx, geom, ownership.neutral, 'rgba(196,127,23,0.13)', 'rgba(196,127,23,0.32)');
    ctx.restore();
  }

  function drawGoOwnedRegion(ctx, geom, indices, fillStyle, strokeStyle) {
    (Array.isArray(indices) ? indices : []).forEach((index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = Math.max(1, geom.radius * 0.035);
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawGoDeadStoneMarks(ctx, geom, state) {
    if (!shouldShowGoScoreAnnotations(state)) return;
    const deadIds = goDeadStoneIdSet(state);
    if (!deadIds.size) return;
    ctx.save();
    ctx.lineCap = 'round';
    (state.stones || []).forEach((stone) => {
      if (!deadIds.has(stone.id)) return;
      const point = placementPiecePoint(geom, stone.index);
      if (!point) return;
      const radius = geom.radius * 0.51;
      ctx.fillStyle = 'rgba(255,253,248,0.56)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      const size = geom.radius * 0.3;
      ctx.strokeStyle = '#b23a48';
      ctx.lineWidth = Math.max(2, geom.radius * 0.075);
      ctx.beginPath();
      ctx.moveTo(point.x - size, point.y - size);
      ctx.lineTo(point.x + size, point.y + size);
      ctx.moveTo(point.x + size, point.y - size);
      ctx.lineTo(point.x - size, point.y + size);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlacementSelectionOverlays(ctx, geom, state) {
    if (!isChineseCheckersGame(state)) return;
    ctx.save();
    drawChineseCheckersTurnHighlights(ctx, geom, state);
    if (!Number.isInteger(state.selectedIndex)) {
      ctx.restore();
      return;
    }
    const selectedPoint = placementPiecePoint(geom, state.selectedIndex);
    const moveMap = chineseCheckersHintMoveMap(state, state.selectedIndex);
    ctx.lineWidth = Math.max(1.5, geom.radius * 0.06);
    ctx.strokeStyle = 'rgba(31,122,140,0.86)';
    ctx.fillStyle = 'rgba(31,122,140,0.16)';
    if (selectedPoint) {
      ctx.beginPath();
      ctx.arc(selectedPoint.x, selectedPoint.y, geom.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(47,133,90,0.18)';
    ctx.strokeStyle = 'rgba(47,133,90,0.82)';
    moveMap.forEach((move, index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * (move.kind === 'jump' ? 0.34 : 0.26), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawChineseCheckersTurnHighlights(ctx, geom, state) {
    const color = normalizePlacementColor(state.turn);
    if (!color || state.phase === 'gameover') return;
    const colors = placementPieceColors(color);
    const target = chineseCheckersCampSet(state.camps, 'targets', color);
    ctx.save();
    ctx.lineWidth = Math.max(1.4, geom.radius * 0.052);
    ctx.strokeStyle = colors.stroke;
    ctx.fillStyle = colors.fallback;
    ctx.globalAlpha = 0.22;
    Array.from(target).forEach((index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.53, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 0.74;
    Array.from(target).forEach((index) => {
      const point = placementPiecePoint(geom, index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.53, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.8, geom.radius * 0.065);
    (state.marbles || []).forEach((marble) => {
      if (marble.color !== color || !chineseCheckersHintMoveMap(state, marble.index).size) return;
      const point = placementPiecePoint(geom, marble.index);
      if (!point) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, geom.radius * 0.59, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlacementPieceAtIndex(ctx, geom, piece) {
    const point = placementPiecePoint(geom, piece.index);
    if (!point) return;
    drawPlacementPieceAtPoint(ctx, geom, point, piece);
  }

  function drawPlacementPieceAtPoint(ctx, geom, point, piece, options = {}) {
    const scale = Number.isFinite(options.scale) ? Math.max(0.02, options.scale) : 1;
    const squashX = Number.isFinite(options.squashX) ? Math.max(0.02, options.squashX) : 1;
    const alpha = Number.isFinite(options.alpha) ? Math.max(0, Math.min(1, options.alpha)) : 1;
    const radius = geom.radius * 0.43 * scale;
    const colors = placementPieceColors(piece.color);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(point.x, point.y);
    ctx.scale(squashX, 1);
    ctx.shadowColor = 'rgba(45,34,22,0.2)';
    ctx.shadowBlur = Math.max(1.5, geom.radius * 0.1);
    ctx.shadowOffsetY = Math.max(0.8, geom.radius * 0.035);
    const gradient = ctx.createRadialGradient
      ? ctx.createRadialGradient(
        -radius * 0.26,
        -radius * 0.32,
        radius * 0.12,
        0,
        0,
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
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();
  }

  function drawPlacementAnimationOverlays(ctx, geom) {
    if (!currentAnimation || !currentAnimation.event) return;
    const event = currentAnimation.event;
    if (event.kind === 'reversiFlip') {
      drawReversiFlipAnimation(ctx, geom, event, currentAnimation.progress || 0);
      return;
    }
    if (event.kind === 'chineseCheckersMove') {
      drawChineseCheckersMoveAnimation(ctx, geom, event, currentAnimation.progress || 0);
      return;
    }
    if (event.kind !== 'connectFourDrop') return;
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

  function drawReversiFlipAnimation(ctx, geom, event, rawProgress) {
    const progress = Math.max(0, Math.min(1, rawProgress || 0));
    const placedPoint = placementPiecePoint(geom, event.disc && event.disc.index);
    if (placedPoint && event.disc) {
      const local = Math.max(0, Math.min(1, progress / 0.28));
      drawPlacementPieceAtPoint(ctx, geom, placedPoint, event.disc, {
        alpha: Math.max(0.18, local),
        scale: 0.38 + easeInOut(local) * 0.62
      });
    }
    const flips = Array.isArray(event.flips) ? event.flips : [];
    const maxDistance = flips.reduce((max, flip) => Math.max(max, flip.distance || 1), 1);
    flips.forEach((flip) => {
      const point = placementPiecePoint(geom, flip.index);
      if (!point) return;
      const waveStart = 0.16 + ((flip.distance || 1) - 1) * (0.42 / Math.max(1, maxDistance));
      const local = Math.max(0, Math.min(1, (progress - waveStart) / 0.46));
      const color = local < 0.5 ? flip.fromColor : flip.toColor;
      const squash = Math.max(0.07, Math.abs(Math.cos(local * Math.PI)));
      drawPlacementPieceAtPoint(ctx, geom, point, {
        id: flip.id,
        index: flip.index,
        color
      }, {
        squashX: squash
      });
    });
  }

  function drawPlacementFeedbackOverlays(ctx, geom) {
    const current = now();
    placementFeedbacks = placementFeedbacks.filter((feedback) => {
      const duration = Number.isFinite(feedback.duration) ? Math.max(1, feedback.duration) : REVERSI_INVALID_MARK_DURATION;
      const age = current - feedback.startedAt;
      if (age >= duration) return false;
      const progress = Math.max(0, Math.min(1, age / duration));
      if (feedback.kind === 'reversiInvalid') drawReversiInvalidMoveFeedback(ctx, geom, feedback.index, progress);
      return true;
    });
  }

  function drawReversiInvalidMoveFeedback(ctx, geom, index, progress) {
    const point = placementPiecePoint(geom, index);
    if (!point) return;
    const eased = easeOut(progress);
    const alpha = Math.max(0, 1 - eased);
    const size = geom.radius * (0.42 + eased * 0.28);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = '#b23a48';
    ctx.lineWidth = Math.max(2.4, geom.radius * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(point.x - size, point.y - size);
    ctx.lineTo(point.x + size, point.y + size);
    ctx.moveTo(point.x + size, point.y - size);
    ctx.lineTo(point.x - size, point.y + size);
    ctx.stroke();
    ctx.restore();
  }

  function drawChineseCheckersMoveAnimation(ctx, geom, event, rawProgress) {
    const frame = chineseCheckersMoveAnimationFrame(geom, event, rawProgress);
    if (!frame) return;
    const piece = {
      id: event.marbleId,
      index: event.to,
      color: event.color
    };
    if (frame.kind === 'glued') {
      drawGluedPlacementPiece(ctx, geom, frame.transition, frame.progress, piece);
      return;
    }
    if (frame.point) {
      drawPlacementPieceAtPoint(ctx, geom, frame.point, piece, {
        scale: frame.paused ? 1 : 1 + Math.sin(Math.max(0, Math.min(1, rawProgress || 0)) * Math.PI) * 0.08
      });
      if (frame.paused) drawChineseCheckersPauseMarker(ctx, geom, frame.point, frame.pauseProgress);
    }
  }

  function chineseCheckersMoveAnimationFrame(geom, event, rawProgress) {
    const progress = Math.max(0, Math.min(1, rawProgress || 0));
    const segments = Array.isArray(event.segments) && event.segments.length
      ? event.segments
      : [{ path: Array.isArray(event.path) ? event.path.slice() : [event.from, event.to], transitions: [] }];
    const moveTime = Number.isFinite(event.moveTime) ? Math.max(1, event.moveTime) : selectedChineseCheckersMoveTime();
    const jumpPause = Number.isFinite(event.jumpPause) ? Math.max(0, event.jumpPause) : selectedChineseCheckersJumpPause();
    const totalDuration = Number.isFinite(event.duration) && event.duration > 0
      ? event.duration
      : eventDuration(event);
    let cursor = progress * totalDuration;
    for (let index = 0; index < segments.length; index += 1) {
      const travel = Math.max(1, chineseCheckersSegmentTransitionCount(segments[index]) * moveTime);
      if (cursor <= travel || index === segments.length - 1) {
        const local = Math.max(0, Math.min(1, cursor / travel));
        return placementSegmentAnimationFrame(geom, segments[index], local);
      }
      cursor -= travel;
      if (index < segments.length - 1 && jumpPause > 0) {
        if (cursor <= jumpPause) {
          const point = placementPiecePoint(geom, segments[index].to);
          return {
            kind: 'point',
            point,
            paused: true,
            pauseProgress: Math.max(0, Math.min(1, cursor / jumpPause))
          };
        }
        cursor -= jumpPause;
      }
    }
    return null;
  }

  function drawChineseCheckersPauseMarker(ctx, geom, point, rawProgress) {
    if (!point) return;
    const progress = Math.max(0, Math.min(1, rawProgress || 0));
    const pulse = Math.sin(progress * Math.PI);
    ctx.save();
    ctx.fillStyle = `rgba(31,122,140,${0.08 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, geom.radius * (0.46 + pulse * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, geom.radius * 0.045);
    for (let ring = 0; ring < 3; ring += 1) {
      const local = (progress + ring / 3) % 1;
      const alpha = (1 - local) * 0.34;
      const radius = geom.radius * (0.48 + easeOut(local) * 0.76);
      ctx.strokeStyle = `rgba(31,122,140,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function chineseCheckersMoveTransitionCount(segments) {
    return (segments || []).reduce((sum, segment) => sum + chineseCheckersSegmentTransitionCount(segment), 0);
  }

  function chineseCheckersSegmentTransitionCount(segment) {
    return Math.max(1, Array.isArray(segment && segment.transitions) && segment.transitions.length
      ? segment.transitions.length
      : (Array.isArray(segment && segment.path) ? Math.max(1, segment.path.length - 1) : 1));
  }

  function placementSegmentAnimationFrame(geom, segment, rawProgress) {
    const progress = Math.max(0, Math.min(1, rawProgress || 0));
    const transitions = Array.isArray(segment.transitions) ? segment.transitions : [];
    if (transitions.length) {
      const scaled = progress * transitions.length;
      const segmentIndex = Math.min(transitions.length - 1, Math.floor(scaled));
      const local = Math.max(0, Math.min(1, scaled - segmentIndex));
      const transition = transitions[segmentIndex];
      if (transition && transition.glued) return { kind: 'glued', transition, progress: local };
      const from = placementPiecePoint(geom, transition.from);
      const to = placementPiecePoint(geom, transition.to);
      if (!from || !to) return null;
      return { kind: 'point', point: lerpPoint(from, to, local) };
    }
    const path = Array.isArray(segment.path) && segment.path.length ? segment.path : [segment.from, segment.to];
    const centers = path.map((index) => placementPiecePoint(geom, index)).filter(Boolean);
    if (!centers.length) return null;
    if (centers.length === 1) return { kind: 'point', point: centers[0] };
    const scaled = progress * (centers.length - 1);
    const segmentIndex = Math.min(centers.length - 2, Math.floor(scaled));
    const local = Math.max(0, Math.min(1, scaled - segmentIndex));
    return { kind: 'point', point: lerpPoint(centers[segmentIndex], centers[segmentIndex + 1], local) };
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

  function clonePlacementSegment(segment) {
    return {
      ...(segment || {}),
      path: Array.isArray(segment && segment.path) ? segment.path.slice() : [],
      transitions: Array.isArray(segment && segment.transitions)
        ? segment.transitions.map(clonePlacementTransition)
        : []
    };
  }

  function cloneChineseCheckerMoveSegments(segments) {
    return Array.isArray(segments) ? segments.map(clonePlacementSegment) : [];
  }

  function cloneReversiLine(line) {
    return {
      ...(line || {}),
      flips: Array.isArray(line && line.flips) ? line.flips.slice() : [],
      transitions: Array.isArray(line && line.transitions)
        ? line.transitions.map(clonePlacementTransition)
        : [],
      routes: Array.isArray(line && line.routes)
        ? line.routes.map((route) => ({
          ...(route || {}),
          directions: Array.isArray(route && route.directions) ? route.directions.slice() : [],
          transitions: Array.isArray(route && route.transitions)
            ? route.transitions.map(clonePlacementTransition)
            : []
        }))
        : []
    };
  }

  function placementPieces(state) {
    if (isConnectFourGame(state)) return state.tokens || [];
    if (isReversiGame(state)) return state.discs || [];
    if (isChineseCheckersGame(state)) return state.marbles || [];
    return state && state.stones ? state.stones : [];
  }

  function hiddenPlacementPieceIds() {
    const hidden = new Set();
    if (!currentAnimation || !currentAnimation.event) return hidden;
    const event = currentAnimation.event;
    if (event.kind === 'connectFourDrop' && event.tokenId != null) hidden.add(event.tokenId);
    if (event.kind === 'reversiFlip') {
      if (event.disc && event.disc.id != null) hidden.add(event.disc.id);
      (event.flips || []).forEach((flip) => {
        if (flip.id != null) hidden.add(flip.id);
      });
    }
    if (event.kind === 'chineseCheckersMove' && event.marbleId != null) hidden.add(event.marbleId);
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
    if (color === 'blue') {
      return {
        fallback: '#2f6fd6',
        stroke: '#174187',
        stops: [
          { offset: 0, color: '#9ec8ff' },
          { offset: 0.66, color: '#2f6fd6' },
          { offset: 1, color: '#174187' }
        ]
      };
    }
    if (color === 'green') {
      return {
        fallback: '#2f855a',
        stroke: '#1f573b',
        stops: [
          { offset: 0, color: '#9fe3bd' },
          { offset: 0.66, color: '#2f855a' },
          { offset: 1, color: '#1f573b' }
        ]
      };
    }
    const fallback = color && color !== 'black' ? fallbackPlacementColor(color) : null;
    if (fallback) return fallback;
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

  function fallbackPlacementColor(color) {
    const normalized = normalizePlacementColor(color);
    if (!normalized) return null;
    let hash = 0;
    for (let index = 0; index < normalized.length; index += 1) {
      hash = ((hash * 31) + normalized.charCodeAt(index)) >>> 0;
    }
    const hue = hash % 360;
    return {
      fallback: `hsl(${hue}, 58%, 45%)`,
      stroke: `hsl(${hue}, 64%, 25%)`,
      stops: [
        { offset: 0, color: `hsl(${hue}, 78%, 76%)` },
        { offset: 0.66, color: `hsl(${hue}, 58%, 45%)` },
        { offset: 1, color: `hsl(${hue}, 64%, 25%)` }
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
        : (isGoGame(state)
          ? (state.winner ? `${goColorLabel(state.winner)} wins` : 'Go draw')
          : (isReversiGame(state)
            ? (state.winner ? `${reversiColorLabel(state.winner)} wins` : 'Reversi draw')
            : (isChineseCheckersGame(state)
              ? `${chineseCheckersColorLabel(state.winner)} wins`
              : (isSokobanGame(state)
                ? 'Sokoban solved'
                : (state.ending === 'bonus' ? 'bonus ending' : 'game over'))))));
    ctx.fillText(title, geom.width / 2, y + height * 0.36);
    ctx.fillStyle = '#6c6257';
    ctx.font = `${Math.max(12, Math.round(geom.radius * 0.34))}px "JetBrains Mono", monospace`;
    const detail = isGomokuGame(state)
      ? `${state.round || 0} move${state.round === 1 ? '' : 's'}`
      : (isConnectFourGame(state)
        ? `${state.round || 0} drop${state.round === 1 ? '' : 's'}`
        : (isGoGame(state)
          ? goFinalScoreText(state)
          : (isReversiGame(state)
            ? reversiFinalScoreText(state)
            : (isChineseCheckersGame(state)
              ? `${state.round || 0} move${state.round === 1 ? '' : 's'}`
              : (isSokobanGame(state)
                ? `${state.moves || state.round || 0} move${(state.moves || state.round) === 1 ? '' : 's'}   ${state.pushes || 0} push${state.pushes === 1 ? '' : 'es'}`
                : `score ${state.score || 0}   highest ${highestValue(state)}`)))));
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
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.NUMBER_2048 });
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
    const state = createGameState(presetOrId, options);
    const rng = options.rng || Math.random;
    spawnNumbers(state, 2, rng, spawnInitialValue, []);
    state.phase = 'ready';
    return state;
  }

  function createGomokuState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.GOMOKU });
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
    const state = createGomokuState(presetOrId, options);
    state.phase = 'ready';
    return state;
  }

  function createConnectFourState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.CONNECT_FOUR });
    const fallDir = Number.isInteger(options.fallDir)
      ? modulo(options.fallDir, latticeForPreset(preset).sides)
      : selectedConnectFourFallDir(preset);
    const removed = initialRemovedSet(preset);
    const holeEntries = Object.prototype.hasOwnProperty.call(options, 'holes') && options.holes != null
      ? options.holes
      : preset.connectFourHoles;
    const holes = normalizeConnectFourHoleSet(holeEntries, preset, removed);
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

  function createGoState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.GO });
    const state = {
      gameMode: GAME_MODES.GO,
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
      komi: normalizeGoKomi(Object.prototype.hasOwnProperty.call(options, 'komi') ? options.komi : preset.goKomi),
      passes: 0,
      captures: { black: 0, white: 0 },
      previousBoardSignature: '',
      winner: '',
      territory: { black: 0, white: 0, neutral: 0 },
      deadStoneIds: new Set(),
      scoringReview: false,
      scoringMethod: normalizeGoScoringMethod(options.scoringMethod),
      territoryOverrides: new Map(),
      finalScore: null,
      resultDismissed: false,
      round: 0,
      ending: ''
    };
    initializeGoStones(state);
    return state;
  }

  function beginGoGame(presetOrId, options = {}) {
    const state = createGoState(presetOrId, options);
    state.phase = 'ready';
    return state;
  }

  function createReversiState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.REVERSI });
    const state = {
      gameMode: GAME_MODES.REVERSI,
      preset,
      phase: 'setup',
      removed: initialRemovedSet(preset),
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      score: 0,
      discs: [],
      nextDiscId: 1,
      turn: 'black',
      passCount: 0,
      winner: '',
      finalScore: null,
      resultDismissed: false,
      round: 0,
      ending: ''
    };
    initializeReversiOpening(state);
    return state;
  }

  function beginReversiGame(presetOrId, options = {}) {
    const state = createReversiState(presetOrId, options);
    state.phase = 'ready';
    return state;
  }

  function createChineseCheckersState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.CHINESE_CHECKERS });
    const removed = initialRemovedSet(preset);
    const pieceSets = normalizePieceSets(preset.pieceSets, preset, removed);
    const camps = normalizeChineseCheckersCamps(preset.chineseCheckersCamps, preset, removed, pieceSets);
    const playerColors = normalizeChineseCheckersPlayers(
      options.chineseCheckersPlayers || options.playerColors || preset.chineseCheckersPlayers || preset.playerColors,
      camps
    );
    const state = {
      gameMode: GAME_MODES.CHINESE_CHECKERS,
      preset,
      phase: 'setup',
      removed,
      boxes: [],
      newBoxIds: new Set(),
      nextBoxId: 1,
      score: 0,
      marbles: [],
      nextMarbleId: 1,
      camps,
      playerColors,
      selectedIndex: null,
      jumpChain: null,
      turn: playerColors[0] || 'red',
      winner: '',
      winningLine: [],
      resultDismissed: false,
      round: 0,
      ending: ''
    };
    initializeChineseCheckersMarbles(state);
    return state;
  }

  function beginChineseCheckersGame(presetOrId, options = {}) {
    const state = createChineseCheckersState(presetOrId, options);
    state.phase = 'ready';
    return state;
  }

  function createSokobanState(presetOrId, options = {}) {
    const preset = materializePreset(resolvePreset(presetOrId), { ...options, gameMode: GAME_MODES.SOKOBAN });
    const removed = initialRemovedSet(preset);
    const setup = normalizeSokobanSetup(preset, removed);
    return {
      gameMode: GAME_MODES.SOKOBAN,
      preset,
      phase: 'setup',
      removed,
      boxes: setup.boxes,
      newBoxIds: new Set(),
      nextBoxId: setup.nextBoxId,
      score: 0,
      players: setup.players,
      nextPlayerId: setup.nextPlayerId,
      targets: setup.targets,
      walls: setup.walls,
      ice: setup.ice,
      energyBridges: setup.energyBridges,
      moves: 0,
      pushes: 0,
      round: 0,
      winner: '',
      winningLine: [],
      resultDismissed: false,
      ending: '',
      debugMessage: ''
    };
  }

  function beginSokobanGame(presetOrId, options = {}) {
    const state = createSokobanState(presetOrId, options);
    state.phase = 'ready';
    return state;
  }

  function moveSokobanPlayers(sourceState, dir) {
    if (!isSokobanGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Sokoban game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const rawDirection = Number(dir);
    const direction = Number.isInteger(rawDirection) ? modulo(rawDirection, latticeForPreset(sourceState.preset).sides) : rawDirection;
    if (!Number.isInteger(direction) || !directionsForPreset(sourceState.preset).includes(direction)) {
      return { changed: false, state: sourceState, message: 'invalid direction' };
    }
    const setupIssue = sokobanSetupIssue(sourceState);
    if (setupIssue) return { changed: false, state: sourceState, message: setupIssue };

    const context = sokobanMovementContext(sourceState);
    if (context.boxesOverlap) return { changed: false, state: sourceState, message: 'boxes overlap' };
    if (context.playersOverlap) return { changed: false, state: sourceState, message: 'players overlap' };
    const playerPlans = [];
    const boxPlans = [];
    const bridgePlans = [];
    const beamPlans = [];
    const pushedBoxIds = new Set();
    const pushedBridgeIndices = new Set();
    const pushedBeamIds = new Set();

    for (const player of sourceState.players || []) {
      const plan = sokobanPlanPlayerMove(sourceState, context, player, direction, pushedBoxIds, pushedBridgeIndices, pushedBeamIds);
      if (!plan.changed && plan.message) return { changed: false, state: sourceState, message: plan.message };
      playerPlans.push(plan.player);
      boxPlans.push(...plan.boxes);
      bridgePlans.push(...plan.bridges);
      beamPlans.push(...plan.beams);
    }

    const playerPathIssue = sokobanValidatePlayerPathBlockers(sourceState, context, playerPlans, boxPlans, bridgePlans, beamPlans);
    if (playerPathIssue) return { changed: false, state: sourceState, message: playerPathIssue };

    const finalBridgeResult = sokobanFinalEnergyBridges(sourceState, bridgePlans, beamPlans);
    if (!finalBridgeResult.ok) return { changed: false, state: sourceState, message: finalBridgeResult.message };
    const finalEnergyBridges = finalBridgeResult.energyBridges;

    const finalStateLike = cloneGameState(sourceState);
    const playerPlanById = new Map(playerPlans.map((plan) => [plan.id, plan]));
    const boxPlanById = new Map(boxPlans.map((plan) => [plan.id, plan]));
    finalStateLike.players.forEach((player) => {
      const plan = playerPlanById.get(player.id);
      if (plan) player.index = plan.to;
    });
    finalStateLike.boxes.forEach((box) => {
      const plan = boxPlanById.get(box.id);
      if (plan) box.index = plan.to;
    });
    finalStateLike.energyBridges = finalEnergyBridges;
    const finalContext = sokobanMovementContext(finalStateLike);

    const finalPlayers = new Map();
    for (const player of finalStateLike.players || []) {
      if (finalPlayers.has(player.index)) {
        return { changed: false, state: sourceState, message: 'players collide' };
      }
      finalPlayers.set(player.index, player.id);
    }
    const finalBoxIndices = new Map();
    for (const box of finalStateLike.boxes || []) {
      if (finalBoxIndices.has(box.index)) {
        return { changed: false, state: sourceState, message: 'boxes collide' };
      }
      finalBoxIndices.set(box.index, box.id);
    }
    for (const finalPlayerIndex of finalPlayers.keys()) {
      if (finalBoxIndices.has(finalPlayerIndex)) {
        return { changed: false, state: sourceState, message: 'player and box collide' };
      }
      if (finalEnergyBridges.has(finalPlayerIndex)) {
        return { changed: false, state: sourceState, message: 'player and energy bridge collide' };
      }
      if (sokobanBeamFootprintAt(finalContext, finalPlayerIndex).length) {
        return { changed: false, state: sourceState, message: 'player and energy beam collide' };
      }
    }
    for (const finalBoxIndex of finalBoxIndices.keys()) {
      if (finalEnergyBridges.has(finalBoxIndex)) {
        return { changed: false, state: sourceState, message: 'box and energy bridge collide' };
      }
      if (sokobanBeamFootprintAt(finalContext, finalBoxIndex).length) {
        return { changed: false, state: sourceState, message: 'box and energy beam collide' };
      }
    }

    const changed = playerPlans.some((plan) => plan.from !== plan.to)
      || boxPlans.some((plan) => plan.from !== plan.to)
      || bridgePlans.some((plan) => plan.from !== plan.to)
      || beamPlans.some((plan) => sokobanNumberListKey(plan.fromEndpoints) !== sokobanNumberListKey(plan.toEndpoints));
    if (!changed) return { changed: false, state: sourceState, message: 'no move' };

    const state = cloneGameState(sourceState);
    state.players.forEach((player) => {
      const plan = playerPlanById.get(player.id);
      if (plan) player.index = plan.to;
    });
    state.boxes.forEach((box) => {
      const plan = boxPlanById.get(box.id);
      if (plan) box.index = plan.to;
    });
    state.energyBridges = finalEnergyBridges;
    state.moves = Math.max(0, Number(sourceState.moves) || Number(sourceState.round) || 0) + 1;
    const pushCount = boxPlans.length + bridgePlans.length + beamPlans.length;
    state.pushes = Math.max(0, Number(sourceState.pushes) || 0) + pushCount;
    state.round = state.moves;
    state.resultDismissed = false;
    state.debugMessage = '';
    if (sokobanSolved(state)) {
      state.phase = 'gameover';
      state.winner = 'solved';
      state.ending = 'sokoban-win';
    } else {
      state.phase = 'ready';
      state.winner = '';
      state.ending = '';
    }
    return { changed: true, state, players: playerPlans, boxes: boxPlans, bridges: bridgePlans, beams: beamPlans, pushes: pushCount };
  }

  function playSokobanMove(dir) {
    const result = moveSokobanPlayers(game, dir);
    if (!result.changed) {
      game.debugMessage = result.message || 'move rejected';
      syncStatus('Sokoban blocked', result.message || 'move rejected', phaseBadge(game.phase));
      render();
      syncControls();
      return;
    }
    pushUndoSnapshot(`Sokoban move ${game.moves + 1}: ${dirLabel(dir, game.preset)}`);
    game = result.state;
    clearNoMoveTrial();
    if (game.phase === 'gameover') {
      syncStatus('Sokoban solved', sokobanTurnInfo(game), 'over');
    } else {
      syncStatus(`Sokoban move ${game.moves}`, sokobanTurnInfo(game), 'ready');
    }
    render();
    syncControls();
    refreshDebugExportIfNeeded();
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
    const winLength = gomokuWinLengthForPreset(state.preset);
    const lattice = latticeForPreset(state.preset);
    const axisCount = Math.floor(lattice.sides / 2);
    for (let axis = 0; axis < axisCount; axis += 1) {
      const backward = gomokuLineSteps(state, index, oppositeDir(state.preset, axis), targetColor, winLength);
      const forward = gomokuLineSteps(state, index, axis, targetColor, winLength);
      const line = backward.slice().reverse().concat([index], forward);
      if (line.length >= winLength) {
        return {
          color: targetColor,
          axis,
          line: line.slice(0, winLength)
        };
      }
    }
    const diagonalAxes = gomokuDiagonalAxes(state.preset);
    for (const axis of diagonalAxes) {
      const backwardPaths = gomokuDiagonalLinePaths(state, index, axis.backward, targetColor, winLength);
      const forwardPaths = gomokuDiagonalLinePaths(state, index, axis.forward, targetColor, winLength);
      for (const backward of backwardPaths) {
        for (const forward of forwardPaths) {
          const line = backward.slice().reverse().concat([index], forward);
          if (line.length >= winLength) {
            return {
              color: targetColor,
              axis: axis.name,
              diagonal: true,
              line: line.slice(0, winLength)
            };
          }
        }
      }
    }
    return null;
  }

  function recomputeGomokuWinningLine(state) {
    if (!isGomokuGame(state) || state.phase !== 'gameover' || !state.winner) return [];
    const winner = normalizeGomokuWinner(state.winner);
    if (!winner) return [];
    for (const stone of state.stones || []) {
      if (!stone || stone.color !== winner) continue;
      const win = findGomokuWin(state, stone.index, winner);
      if (win && Array.isArray(win.line) && win.line.length) return win.line;
    }
    return [];
  }

  function gomokuLineSteps(state, startIndex, dir, color, winLength = gomokuWinLengthForPreset(state && state.preset)) {
    const indices = [];
    let index = startIndex;
    let direction = dir;
    for (let step = 1; step < winLength; step += 1) {
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

  function gomokuDiagonalLinePaths(state, startIndex, orders, color, winLength = gomokuWinLengthForPreset(state && state.preset)) {
    const paths = [[]];
    const search = (index, path, currentOrders) => {
      if (path.length >= winLength - 1) return;
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
    const transitions = [];
    const actualDirections = [];
    for (let step = 0; step < 2; step += 1) {
      const outDir = directions[step];
      const next = surfaceSuccessor(state, index, outDir);
      if (!next) return null;
      actualDirections.push(outDir);
      const record = placementTransitionRecord(index, outDir, next);
      directions = transportedDirectionsAfterStep(state, directions, step, outDir, next);
      record.companionBefore = step > 0
        ? oppositeDir(state.preset, transitions[step - 1].dir)
        : order[step + 1];
      record.companionAfter = step + 1 < order.length
        ? directions[step + 1]
        : (step > 0 ? oppositeDir(state.preset, directions[step - 1]) : null);
      transitions.push(record);
      index = next.index;
    }
    return {
      index,
      orders: normalizeDiagonalOrders([directions, [directions[1], directions[0]]]),
      route: {
        kind: 'diagonal',
        start: startIndex,
        end: index,
        directions: actualDirections,
        transitions
      }
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

  function gomokuWinLengthForPreset(preset) {
    return normalizeOptionalGomokuWinLength(preset && preset.gomokuWinLength) || GOMOKU_WIN_LENGTH;
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

  function placeGoStone(sourceState, index) {
    if (!isGoGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Go game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    if (sourceState.scoringReview) {
      return { changed: false, state: sourceState, message: 'confirm the score or undo before playing' };
    }
    const target = Number(index);
    if (!validBoardIndex(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'tile is outside the board' };
    }
    if (sourceState.removed.has(target)) {
      return { changed: false, state: sourceState, message: 'tile is removed' };
    }
    if (goStoneAt(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'intersection already has a stone' };
    }

    const beforeSignature = goBoardSignature(sourceState);
    const state = cloneGameState(sourceState);
    const color = GO_COLORS.includes(state.turn) ? state.turn : 'black';
    const stone = { id: state.nextStoneId, index: target, color };
    state.nextStoneId += 1;
    state.stones.push(stone);

    const opponent = oppositeGoColor(color);
    const capturedIds = new Set();
    adjacentExistingIndices(state, target).forEach((neighborIndex) => {
      const neighborStone = goStoneAt(state, neighborIndex);
      if (!neighborStone || neighborStone.color !== opponent || capturedIds.has(neighborStone.id)) return;
      const group = goGroupAt(state, neighborIndex);
      if (group.liberties.size > 0) return;
      group.stones.forEach((item) => capturedIds.add(item.id));
    });
    if (capturedIds.size) {
      state.stones = state.stones.filter((item) => !capturedIds.has(item.id));
      state.captures[color] = (state.captures[color] || 0) + capturedIds.size;
    }

    const ownGroup = goGroupAt(state, target);
    if (ownGroup.liberties.size === 0) {
      return { changed: false, state: sourceState, message: 'suicide is not legal' };
    }
    const afterSignature = goBoardSignature(state);
    if (sourceState.previousBoardSignature && afterSignature === sourceState.previousBoardSignature) {
      return { changed: false, state: sourceState, message: 'simple ko forbids this recapture' };
    }

    state.previousBoardSignature = beforeSignature;
    state.passes = 0;
    state.deadStoneIds = new Set();
    state.scoringReview = false;
    state.territoryOverrides = new Map();
    state.territory = { black: 0, white: 0, neutral: 0 };
    state.finalScore = null;
    state.round += 1;
    state.resultDismissed = false;
    state.ending = '';
    if (!emptyGoIndices(state).length) {
      finishGoByScore(state);
    } else {
      state.phase = 'ready';
      state.turn = opponent;
    }

    return {
      changed: true,
      state,
      stone: { ...stone },
      capturedIds: Array.from(capturedIds).sort((a, b) => a - b)
    };
  }

  function passGoTurn(sourceState) {
    if (!isGoGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Go game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    if (sourceState.scoringReview) {
      return { changed: false, state: sourceState, message: 'confirm the score or undo before passing' };
    }
    const state = cloneGameState(sourceState);
    state.previousBoardSignature = goBoardSignature(sourceState);
    state.passes = (state.passes || 0) + 1;
    state.round += 1;
    state.resultDismissed = false;
    state.finalScore = null;
    if (state.passes >= 2) {
      state.phase = 'ready';
      state.turn = oppositeGoColor(state.turn);
      state.scoringReview = true;
      state.territory = scoreGoGame(state).territory;
      state.ending = '';
    } else {
      state.phase = 'ready';
      state.turn = oppositeGoColor(state.turn);
      state.scoringReview = false;
      state.ending = '';
    }
    return { changed: true, state };
  }

  function confirmGoScore(sourceState) {
    if (!isGoGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Go game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const state = cloneGameState(sourceState);
    finishGoByScore(state);
    return { changed: true, state };
  }

  function finishGoByScore(state) {
    const finalScore = scoreGoGame(state);
    state.finalScore = finalScore;
    state.territory = finalScore.territory;
    state.winner = finalScore.black === finalScore.white ? '' : (finalScore.black > finalScore.white ? 'black' : 'white');
    state.phase = 'gameover';
    state.scoringReview = false;
    state.ending = 'go-score';
  }

  function scoreGoGame(state, options = {}) {
    const analysis = goScoringAnalysis(state, options);
    return {
      black: analysis.black,
      white: analysis.white,
      komi: analysis.komi,
      method: analysis.method,
      stones: analysis.stones,
      territory: analysis.territory,
      deadStones: analysis.deadStones,
      ownership: analysis.ownership,
      ownerByIndex: analysis.ownerByIndex,
      sourceByIndex: analysis.sourceByIndex
    };
  }

  function goScoringAnalysis(state, options = {}) {
    const method = normalizeGoScoringMethod(options.method || (state && state.scoringMethod));
    const includeOverrides = options.includeOverrides !== false;
    const deadIds = goDeadStoneIdSet(state);
    const counts = goStoneCounts(state, deadIds);
    const scoringIndices = goScoringEmptyIndices(state, deadIds);
    const scoringSet = new Set(scoringIndices);
    const ownerMap = new Map();
    const sourceMap = new Map();
    const ambiguous = [];
    const visited = new Set();
    scoringIndices.forEach((start) => {
      if (visited.has(start)) return;
      const region = goScoringEmptyRegion(state, start, visited, deadIds);
      if (region.adjacentColors.size === 1) {
        const color = Array.from(region.adjacentColors)[0];
        region.indices.forEach((index) => {
          ownerMap.set(index, color);
          sourceMap.set(index, 'enclosed');
        });
      } else {
        ambiguous.push(...region.indices);
      }
    });
    const heuristicOwners = method === 'nearest'
      ? goNearestStoneTerritoryOwners(state, ambiguous, deadIds)
      : goInfluenceTerritoryOwners(state, ambiguous, deadIds);
    ambiguous.forEach((index) => {
      ownerMap.set(index, normalizeGoTerritoryOwner(heuristicOwners.get(index)) || 'neutral');
      sourceMap.set(index, method);
    });
    if (includeOverrides) {
      goTerritoryOverrideMap(state, scoringSet).forEach((owner, index) => {
        ownerMap.set(index, owner);
        sourceMap.set(index, 'manual');
      });
    }
    const territory = { black: 0, white: 0, neutral: 0 };
    const ownership = { black: [], white: [], neutral: [], dead: [] };
    const ownerByIndex = {};
    const sourceByIndex = {};
    scoringIndices.forEach((index) => {
      const owner = normalizeGoTerritoryOwner(ownerMap.get(index)) || 'neutral';
      territory[owner] += 1;
      ownership[owner].push(index);
      ownerByIndex[index] = owner;
      sourceByIndex[index] = sourceMap.get(index) || 'neutral';
    });
    const deadStones = { black: 0, white: 0 };
    (state.stones || []).forEach((stone) => {
      if (!deadIds.has(stone.id)) return;
      ownership.dead.push(stone.index);
      if (stone.color === 'white') deadStones.white += 1;
      else deadStones.black += 1;
    });
    Object.keys(ownership).forEach((key) => ownership[key].sort((a, b) => a - b));
    return {
      black: counts.black + territory.black,
      white: counts.white + territory.white + (Number(state.komi) || 0),
      komi: Number(state.komi) || 0,
      method,
      stones: counts,
      territory,
      deadStones,
      ownership,
      ownerByIndex,
      sourceByIndex
    };
  }

  function goInfluenceTerritoryOwners(state, indices, deadIds) {
    const owners = new Map();
    const candidates = Array.from(new Set(indices || []));
    if (!candidates.length) return owners;
    const candidateSet = new Set(candidates);
    const totals = new Map(candidates.map((index) => [index, { black: 0, white: 0 }]));
    goLiveStones(state, deadIds).forEach((stone) => {
      const distances = goScoringDistancesFromSources(state, [stone], deadIds);
      candidateSet.forEach((index) => {
        const distance = distances.get(index);
        if (!Number.isFinite(distance)) return;
        const total = totals.get(index);
        total[stone.color] += 1 / ((distance + 1) ** 2);
      });
    });
    candidates.forEach((index) => {
      const total = totals.get(index) || { black: 0, white: 0 };
      if (Math.abs(total.black - total.white) < 1e-9) owners.set(index, 'neutral');
      else owners.set(index, total.black > total.white ? 'black' : 'white');
    });
    return owners;
  }

  function goNearestStoneTerritoryOwners(state, indices, deadIds) {
    const owners = new Map();
    const candidates = Array.from(new Set(indices || []));
    if (!candidates.length) return owners;
    const blackDistances = goScoringDistancesFromSources(state, goLiveStones(state, deadIds, 'black'), deadIds);
    const whiteDistances = goScoringDistancesFromSources(state, goLiveStones(state, deadIds, 'white'), deadIds);
    candidates.forEach((index) => {
      const blackDistance = blackDistances.has(index) ? blackDistances.get(index) : Infinity;
      const whiteDistance = whiteDistances.has(index) ? whiteDistances.get(index) : Infinity;
      if (!Number.isFinite(blackDistance) && !Number.isFinite(whiteDistance)) {
        owners.set(index, 'neutral');
      } else if (blackDistance === whiteDistance) {
        owners.set(index, 'neutral');
      } else {
        owners.set(index, blackDistance < whiteDistance ? 'black' : 'white');
      }
    });
    return owners;
  }

  function goScoringDistancesFromSources(state, sources, deadIds) {
    const distances = new Map();
    const queue = [];
    (Array.isArray(sources) ? sources : []).forEach((stone) => {
      if (!stone || !Number.isInteger(stone.index) || distances.has(stone.index)) return;
      distances.set(stone.index, 0);
      queue.push(stone.index);
    });
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const distance = distances.get(index);
      adjacentExistingIndices(state, index).forEach((nextIndex) => {
        if (distances.has(nextIndex)) return;
        if (goScoringStoneAt(state, nextIndex, deadIds)) return;
        distances.set(nextIndex, distance + 1);
        queue.push(nextIndex);
      });
    }
    return distances;
  }

  function goLiveStones(state, deadIds = goDeadStoneIdSet(state), color = '') {
    return (state && Array.isArray(state.stones) ? state.stones : [])
      .filter((stone) => !deadIds.has(stone.id) && GO_COLORS.includes(stone.color) && (!color || stone.color === color));
  }

  function goEmptyRegion(state, start, visited) {
    const adjacentColors = new Set();
    const indices = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const index = queue.shift();
      indices.push(index);
      adjacentExistingIndices(state, index).forEach((nextIndex) => {
        const stone = goStoneAt(state, nextIndex);
        if (stone) {
          adjacentColors.add(stone.color);
          return;
        }
        if (visited.has(nextIndex)) return;
        visited.add(nextIndex);
        queue.push(nextIndex);
      });
    }
    return { indices, adjacentColors };
  }

  function goScoringEmptyRegion(state, start, visited, deadIds) {
    const adjacentColors = new Set();
    const indices = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const index = queue.shift();
      indices.push(index);
      adjacentExistingIndices(state, index).forEach((nextIndex) => {
        const stone = goScoringStoneAt(state, nextIndex, deadIds);
        if (stone) {
          adjacentColors.add(stone.color);
          return;
        }
        if (visited.has(nextIndex)) return;
        visited.add(nextIndex);
        queue.push(nextIndex);
      });
    }
    return { indices, adjacentColors };
  }

  function goGroupAt(state, startIndex) {
    const startStone = goStoneAt(state, startIndex);
    if (!startStone) return { stones: [], liberties: new Set() };
    const stones = [];
    const liberties = new Set();
    const visited = new Set([startIndex]);
    const queue = [startIndex];
    while (queue.length) {
      const index = queue.shift();
      const stone = goStoneAt(state, index);
      if (!stone || stone.color !== startStone.color) continue;
      stones.push(stone);
      adjacentExistingIndices(state, index).forEach((nextIndex) => {
        const neighbor = goStoneAt(state, nextIndex);
        if (!neighbor) {
          liberties.add(nextIndex);
          return;
        }
        if (neighbor.color !== startStone.color || visited.has(nextIndex)) return;
        visited.add(nextIndex);
        queue.push(nextIndex);
      });
    }
    return { stones, liberties };
  }

  function goBoardSignature(state) {
    return (state.stones || [])
      .map((stone) => `${stone.index}:${stone.color}`)
      .sort()
      .join('|');
  }

  function emptyGoIndices(state) {
    const occupied = new Set((state.stones || []).map((stone) => stone.index));
    return emptyPlayableIndices(state, occupied);
  }

  function goScoringEmptyIndices(state, deadIds = goDeadStoneIdSet(state)) {
    const occupied = new Set((state.stones || [])
      .filter((stone) => !deadIds.has(stone.id))
      .map((stone) => stone.index));
    return emptyPlayableIndices(state, occupied);
  }

  function goStoneAt(state, index) {
    if (!state || !Array.isArray(state.stones)) return null;
    return state.stones.find((stone) => stone.index === index) || null;
  }

  function goScoringStoneAt(state, index, deadIds = goDeadStoneIdSet(state)) {
    const stone = goStoneAt(state, index);
    return stone && !deadIds.has(stone.id) ? stone : null;
  }

  function oppositeGoColor(color) {
    return color === 'white' ? 'black' : 'white';
  }

  function goColorLabel(color) {
    return color === 'white' ? 'white' : 'black';
  }

  function goStoneCounts(state, deadIds = new Set()) {
    return (state.stones || []).reduce((counts, stone) => {
      if (deadIds.has(stone.id)) return counts;
      if (stone.color === 'white') counts.white += 1;
      else counts.black += 1;
      return counts;
    }, { black: 0, white: 0 });
  }

  function goTurnInfo(state) {
    if (state && state.scoringReview) return 'score review; mark dead groups or confirm score';
    return `${goColorLabel(state.turn)} to play; komi ${formatKomi(state.komi)}`;
  }

  function goDeadStoneIdSet(state) {
    const valid = new Set((state && state.stones ? state.stones : []).map((stone) => stone.id));
    const source = state && state.deadStoneIds instanceof Set
      ? Array.from(state.deadStoneIds)
      : (Array.isArray(state && state.deadStoneIds) ? state.deadStoneIds : []);
    const ids = new Set();
    source.forEach((entry) => {
      const id = Number(entry);
      if (Number.isInteger(id) && valid.has(id)) ids.add(id);
    });
    return ids;
  }

  function normalizeGoScoringMethod(value) {
    const method = String(value || '').trim().toLowerCase();
    return GO_SCORING_METHODS.includes(method) ? method : GO_SCORING_METHOD_DEFAULT;
  }

  function normalizeGoTerritoryOwner(value) {
    const owner = String(value || '').trim().toLowerCase();
    return owner === 'black' || owner === 'white' || owner === 'neutral' ? owner : '';
  }

  function goTerritoryOverrideEntriesFromValue(value) {
    const entries = [];
    const add = (index, ownerValue) => {
      const target = Number(index);
      const owner = normalizeGoTerritoryOwner(ownerValue);
      if (Number.isInteger(target) && target >= 0 && owner) entries.push([target, owner]);
    };
    if (value instanceof Map) {
      value.forEach((owner, index) => add(index, owner));
    } else if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (Array.isArray(entry)) add(entry[0], entry[1]);
        else if (entry && typeof entry === 'object') add(entry.index, entry.owner != null ? entry.owner : entry.color);
      });
    } else if (value && typeof value === 'object') {
      Object.keys(value).forEach((key) => {
        const entry = value[key];
        add(key, entry && typeof entry === 'object' ? (entry.owner != null ? entry.owner : entry.color) : entry);
      });
    }
    return entries;
  }

  function cloneGoTerritoryOverrides(value) {
    const overrides = new Map();
    goTerritoryOverrideEntriesFromValue(value).forEach(([index, owner]) => {
      overrides.set(index, owner);
    });
    return overrides;
  }

  function goTerritoryOverrideMap(state, scoringSet = null) {
    const overrides = new Map();
    goTerritoryOverrideEntriesFromValue(state && state.territoryOverrides).forEach(([index, owner]) => {
      if (scoringSet && !scoringSet.has(index)) return;
      if (!scoringSet && state && state.preset && !validBoardIndex(state, index)) return;
      overrides.set(index, owner);
    });
    return overrides;
  }

  function goTerritoryOverridesExport(state) {
    const deadIds = goDeadStoneIdSet(state);
    const scoringSet = isGoGame(state) ? new Set(goScoringEmptyIndices(state, deadIds)) : null;
    const overrides = goTerritoryOverrideMap(state, scoringSet);
    return Array.from(overrides.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([index, owner]) => ({
        index,
        ...rowCol(index, state.preset.cols),
        owner
      }));
  }

  function normalizeStatusGoTerritoryOverrides(entries, preset, removed, stones, deadIds) {
    const stateLike = {
      gameMode: GAME_MODES.GO,
      preset,
      removed,
      stones
    };
    const scoringSet = new Set(goScoringEmptyIndices(stateLike, deadIds));
    const overrides = new Map();
    const add = (tileValue, ownerValue) => {
      const owner = normalizeGoTerritoryOwner(ownerValue);
      if (!owner) return;
      const tile = normalizeImportedTileRef(tileValue, preset.rows, preset.cols);
      if (!tile) return;
      const index = indexOf(tile.row, tile.col, preset.cols);
      if (scoringSet.has(index)) overrides.set(index, owner);
    };
    if (Array.isArray(entries)) {
      entries.forEach((entry) => {
        if (Array.isArray(entry)) {
          add(entry[0], entry[1]);
        } else if (entry && typeof entry === 'object') {
          add(entry, entry.owner != null ? entry.owner : entry.color);
        }
      });
    } else if (entries && typeof entries === 'object') {
      Object.keys(entries).forEach((key) => {
        const entry = entries[key];
        const entryHasTile = entry && typeof entry === 'object' && (
          entry.index != null || entry.row != null || entry.col != null
        );
        add(entryHasTile ? entry : key, entry && typeof entry === 'object' ? (entry.owner != null ? entry.owner : entry.color) : entry);
      });
    }
    return overrides;
  }

  function toggleGoTerritoryOverride(sourceState, index) {
    if (!isGoGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Go game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const target = Number(index);
    if (!validBoardIndex(sourceState, target) || sourceState.removed.has(target)) {
      return { changed: false, state: sourceState, message: 'click an existing scoring point' };
    }
    const deadIds = goDeadStoneIdSet(sourceState);
    const scoringSet = new Set(goScoringEmptyIndices(sourceState, deadIds));
    if (!scoringSet.has(target)) {
      return { changed: false, state: sourceState, message: 'only empty or dead points can be edited' };
    }
    const state = cloneGameState(sourceState);
    const overrides = goTerritoryOverrideMap(state, scoringSet);
    const current = overrides.get(target) || 'auto';
    const next = current === 'auto'
      ? 'black'
      : (current === 'black' ? 'white' : (current === 'white' ? 'neutral' : 'auto'));
    if (next === 'auto') overrides.delete(target);
    else overrides.set(target, next);
    state.territoryOverrides = overrides;
    state.finalScore = null;
    state.territory = scoreGoGame(state).territory;
    state.resultDismissed = false;
    return { changed: true, state, owner: next };
  }

  function compareGoScoringMethods(state) {
    const influence = timedGoScore(state, 'influence');
    const nearest = timedGoScore(state, 'nearest');
    const keys = new Set([
      ...Object.keys(influence.score.ownerByIndex || {}),
      ...Object.keys(nearest.score.ownerByIndex || {})
    ]);
    let disagreements = 0;
    keys.forEach((key) => {
      const influenceOwner = (influence.score.ownerByIndex || {})[key] || 'neutral';
      const nearestOwner = (nearest.score.ownerByIndex || {})[key] || 'neutral';
      if (influenceOwner !== nearestOwner) disagreements += 1;
    });
    return { influence, nearest, disagreements };
  }

  function timedGoScore(state, method) {
    const startedAt = now();
    const score = scoreGoGame(state, { method, includeOverrides: false });
    return {
      method,
      ms: Math.max(0, now() - startedAt),
      score
    };
  }

  function toggleGoDeadGroup(sourceState, index) {
    if (!isGoGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Go game' };
    }
    if (sourceState.phase !== 'ready') {
      return { changed: false, state: sourceState, message: 'dead groups can be marked after the game begins' };
    }
    const stone = goStoneAt(sourceState, index);
    if (!stone) return { changed: false, state: sourceState, message: 'click a Go stone to mark its group' };
    const group = goGroupAt(sourceState, index);
    const groupIds = group.stones.map((item) => item.id);
    if (!groupIds.length) return { changed: false, state: sourceState, message: 'click a Go stone to mark its group' };
    const state = cloneGameState(sourceState);
    const deadIds = goDeadStoneIdSet(state);
    const allDead = groupIds.every((id) => deadIds.has(id));
    groupIds.forEach((id) => {
      if (allDead) deadIds.delete(id);
      else deadIds.add(id);
    });
    state.deadStoneIds = deadIds;
    state.territoryOverrides = goTerritoryOverrideMap(state, new Set(goScoringEmptyIndices(state, deadIds)));
    state.finalScore = null;
    state.territory = scoreGoGame(state).territory;
    state.resultDismissed = false;
    return {
      changed: true,
      state,
      color: stone.color,
      count: groupIds.length,
      markedDead: !allDead
    };
  }

  function placeReversiDisc(sourceState, index) {
    if (!isReversiGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Reversi game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const target = Number(index);
    if (!validBoardIndex(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'tile is outside the board' };
    }
    if (sourceState.removed.has(target)) {
      return { changed: false, state: sourceState, message: 'tile is removed' };
    }
    if (reversiDiscAt(sourceState, target)) {
      return { changed: false, state: sourceState, message: 'tile already has a disc' };
    }
    const color = REVERSI_COLORS.includes(sourceState.turn) ? sourceState.turn : 'black';
    const lines = reversiFlipLinesForMove(sourceState, target, color);
    const flips = reversiFlipIndicesFromLines(lines);
    if (!flips.length) {
      return { changed: false, state: sourceState, message: 'move must bracket at least one disc' };
    }

    const state = cloneGameState(sourceState);
    const disc = { id: state.nextDiscId, index: target, color };
    state.nextDiscId += 1;
    state.discs.push(disc);
    const flipSet = new Set(flips);
    const flippedDiscs = [];
    state.discs.forEach((item) => {
      if (flipSet.has(item.index)) {
        flippedDiscs.push({
          id: item.id,
          index: item.index,
          fromColor: item.color,
          toColor: color
        });
        item.color = color;
      }
    });
    state.round += 1;
    state.passCount = 0;
    state.resultDismissed = false;
    state.ending = '';

    const opponent = oppositeReversiColor(color);
    if (reversiHasLegalMove(state, opponent)) {
      state.turn = opponent;
      state.phase = 'ready';
    } else if (reversiHasLegalMove(state, color)) {
      state.turn = color;
      state.passCount = 1;
      state.phase = 'ready';
    } else {
      finishReversiByScore(state);
    }

    return {
      changed: true,
      state,
      disc: { ...disc },
      flips: flips.slice(),
      lines: lines.map(cloneReversiLine),
      flippedDiscs
    };
  }

  function reversiFlipsForMove(state, index, color) {
    if (!isReversiGame(state) || state.removed.has(index) || reversiDiscAt(state, index)) return [];
    return reversiFlipIndicesFromLines(reversiFlipLinesForMove(state, index, color));
  }

  function reversiFlipLinesForMove(state, index, color) {
    if (!isReversiGame(state) || state.removed.has(index) || reversiDiscAt(state, index)) return [];
    const flips = new Set();
    const lines = [];
    directionsForPreset(state.preset).forEach((dir) => {
      const line = reversiFlipLineInDirection(state, index, dir, color);
      if (line && line.flips.length) lines.push(line);
    });
    gomokuDiagonalAxes(state.preset).forEach((axis) => {
      reversiDiagonalFlipLines(state, index, axis.forward, color, axis.name).forEach((line) => lines.push(line));
      reversiDiagonalFlipLines(state, index, axis.backward, color, axis.name).forEach((line) => lines.push(line));
    });
    const seen = new Set();
    return lines.filter((line) => {
      const key = `${line.kind}:${line.terminal}:${line.flips.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      line.flips.forEach((flipIndex) => flips.add(flipIndex));
      return true;
    });
  }

  function reversiFlipIndicesFromLines(lines) {
    const flips = new Set();
    (lines || []).forEach((line) => {
      (line.flips || []).forEach((flipIndex) => flips.add(flipIndex));
    });
    return Array.from(flips).sort((a, b) => a - b);
  }

  function reversiFlipsInDirection(state, startIndex, startDir, color) {
    const line = reversiFlipLineInDirection(state, startIndex, startDir, color);
    return line ? line.flips.slice() : [];
  }

  function reversiFlipLineInDirection(state, startIndex, startDir, color) {
    const opponent = oppositeReversiColor(color);
    const captured = [];
    const transitions = [];
    const seen = new Set();
    let index = startIndex;
    let direction = startDir;
    while (true) {
      const key = `${index}:${direction}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const next = surfaceSuccessor(state, index, direction);
      if (!next) return null;
      transitions.push(placementTransitionRecord(index, direction, next));
      index = next.index;
      direction = next.dir;
      const disc = reversiDiscAt(state, index);
      if (!disc) return null;
      if (disc.color === opponent) {
        captured.push(index);
        continue;
      }
      if (disc.color === color && captured.length) {
        return {
          kind: 'axis',
          dir: startDir,
          flips: captured,
          terminal: index,
          transitions
        };
      }
      return null;
    }
  }

  function reversiDiagonalFlipLines(state, startIndex, orders, color, axisName) {
    const opponent = oppositeReversiColor(color);
    const lines = [];
    const seenLines = new Set();
    const search = (index, captured, currentOrders, routes, seenStates) => {
      const candidates = gomokuDiagonalStepCandidates(state, index, currentOrders);
      candidates.forEach((candidate) => {
        const stateKey = `${candidate.index}:${diagonalOrdersKey(candidate.orders)}`;
        if (seenStates.has(stateKey)) return;
        const disc = reversiDiscAt(state, candidate.index);
        if (!disc) return;
        if (disc.color === opponent) {
          const nextSeen = new Set(seenStates);
          nextSeen.add(stateKey);
          search(
            candidate.index,
            captured.concat(candidate.index),
            candidate.orders,
            routes.concat(candidate.route),
            nextSeen
          );
          return;
        }
        if (disc.color === color && captured.length) {
          const key = `${candidate.index}:${captured.join(',')}`;
          if (seenLines.has(key)) return;
          seenLines.add(key);
          lines.push({
            kind: 'diagonal',
            axis: axisName,
            flips: captured.slice(),
            terminal: candidate.index,
            routes: routes.concat(candidate.route)
          });
        }
      });
    };
    search(
      startIndex,
      [],
      normalizeDiagonalOrders(orders),
      [],
      new Set([`${startIndex}:${diagonalOrdersKey(orders)}`])
    );
    return lines;
  }

  function reversiHasLegalMove(state, color) {
    return emptyReversiIndices(state).some((index) => reversiFlipsForMove(state, index, color).length > 0);
  }

  function finishReversiByScore(state) {
    const finalScore = reversiDiscCounts(state);
    state.finalScore = finalScore;
    state.winner = finalScore.black === finalScore.white ? '' : (finalScore.black > finalScore.white ? 'black' : 'white');
    state.phase = 'gameover';
    state.ending = 'reversi-score';
  }

  function initializeGoStones(state) {
    const entries = placementStartsFromPieceSets(state.preset, GO_COLORS);
    const occupied = new Set();
    entries.forEach((entry) => {
      if (state.removed.has(entry.index) || occupied.has(entry.index)) return;
      occupied.add(entry.index);
      state.stones.push({ id: state.nextStoneId, index: entry.index, color: entry.color });
      state.nextStoneId += 1;
    });
  }

  function initializeReversiOpening(state) {
    const rows = state.preset.rows;
    const cols = state.preset.cols;
    const pieceSetOpening = placementStartsFromPieceSets(state.preset, REVERSI_COLORS);
    const opening = pieceSetOpening.length
      ? pieceSetOpening
      : normalizeReversiOpeningEntries(state.preset.reversiOpening, state.preset);
    if (!opening.length) {
      opening.push(...centeredReversiOpening(rows, cols));
    }
    const occupied = new Set();
    opening.forEach((entry) => {
      const index = entry.index;
      if (state.removed.has(index)) return;
      if (occupied.has(index)) return;
      occupied.add(index);
      state.discs.push({ id: state.nextDiscId, index, color: entry.color });
      state.nextDiscId += 1;
    });
  }

  function centeredReversiOpening(rows, cols) {
    const rowCount = Number(rows);
    const colCount = Number(cols);
    if (!Number.isInteger(rowCount) || !Number.isInteger(colCount) || rowCount < 2 || colCount < 2) return [];
    const rowSpan = rowCount % 2 === 0 ? 2 : 3;
    const colSpan = colCount % 2 === 0 ? 2 : 3;
    if (rowCount < rowSpan || colCount < colSpan) return [];
    const startRow = Math.floor((rowCount - rowSpan) / 2) + 1;
    const startCol = Math.floor((colCount - colSpan) / 2) + 1;
    const opening = [];
    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        opening.push({
          index: indexOf(startRow + rowOffset, startCol + colOffset, colCount),
          color: (rowOffset + colOffset) % 2 === 0 ? 'white' : 'black'
        });
      }
    }
    return opening;
  }

  function placementStartsFromPieceSets(preset, allowedColors = null) {
    const removed = initialRemovedSet(preset);
    const pieceSets = normalizePieceSets(preset && preset.pieceSets, preset, removed);
    const allowed = Array.isArray(allowedColors) ? new Set(allowedColors) : null;
    const entries = [];
    pieceSetColors(pieceSets, ['starts']).forEach((color) => {
      if (allowed && !allowed.has(color)) return;
      Array.from(pieceSets.starts[color] || []).forEach((index) => entries.push({ index, color }));
    });
    return entries.sort((left, right) => left.index - right.index || comparePlacementColors(left.color, right.color));
  }

  function normalizeReversiOpeningEntries(entries, preset) {
    if (!Array.isArray(entries)) return [];
    const removed = initialRemovedSet(preset);
    return entries
      .map((entry) => {
        const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
        const color = normalizeReversiColor(entry && entry.color);
        if (!tile || !color) return null;
        const index = indexOf(tile.row, tile.col, preset.cols);
        return removed.has(index) ? null : { index, color };
      })
      .filter(Boolean)
      .sort((left, right) => left.index - right.index);
  }

  function emptyReversiIndices(state) {
    const occupied = new Set((state.discs || []).map((disc) => disc.index));
    return emptyPlayableIndices(state, occupied);
  }

  function reversiDiscAt(state, index) {
    if (!state || !Array.isArray(state.discs)) return null;
    return state.discs.find((disc) => disc.index === index) || null;
  }

  function oppositeReversiColor(color) {
    return color === 'white' ? 'black' : 'white';
  }

  function reversiColorLabel(color) {
    return color === 'white' ? 'white' : 'black';
  }

  function reversiDiscCounts(state) {
    return (state.discs || []).reduce((counts, disc) => {
      if (disc.color === 'white') counts.white += 1;
      else counts.black += 1;
      return counts;
    }, { black: 0, white: 0 });
  }

  function reversiTurnInfo(state) {
    return state.passCount
      ? `${reversiColorLabel(state.turn)} to move; opponent passed`
      : `${reversiColorLabel(state.turn)} to move`;
  }

  function moveChineseCheckerMarble(sourceState, fromIndex, toIndex, options = {}) {
    if (!isChineseCheckersGame(sourceState)) {
      return { changed: false, state: sourceState, message: 'not a Chinese Checkers game' };
    }
    if (sourceState.phase === 'setup') {
      return { changed: false, state: sourceState, message: 'begin the game first' };
    }
    if (sourceState.phase === 'gameover') {
      return { changed: false, state: sourceState, message: 'game is already over' };
    }
    const from = Number(fromIndex);
    const to = Number(toIndex);
    if (!validBoardIndex(sourceState, from) || !validBoardIndex(sourceState, to)) {
      return { changed: false, state: sourceState, message: 'move is outside the board' };
    }
    if (sourceState.removed.has(to)) {
      return { changed: false, state: sourceState, message: 'target tile is removed' };
    }
    if (chineseCheckerMarbleAt(sourceState, to)) {
      return { changed: false, state: sourceState, message: 'target tile is occupied' };
    }
    const marble = chineseCheckerMarbleAt(sourceState, from);
    if (!marble || marble.color !== sourceState.turn) {
      return { changed: false, state: sourceState, message: 'select one of your marbles' };
    }
    const activeJump = isChineseCheckersJumping(sourceState);
    if (activeJump) {
      const chain = sourceState.jumpChain;
      if (chain.marbleId !== marble.id || chain.currentIndex !== from) {
        return { changed: false, state: sourceState, message: 'continue the selected jump' };
      }
    }
    const stepwise = !!options.stepwise || activeJump;
    const legal = activeJump
      ? chineseCheckerImmediateJumpMap(sourceState, from)
      : (stepwise ? chineseCheckerStepwiseMoveMap(sourceState, from) : chineseCheckerMoveMap(sourceState, from));
    const move = legal.get(to);
    if (!move) {
      return { changed: false, state: sourceState, message: activeJump ? 'target is not a legal next jump' : 'target is not a legal step or jump' };
    }

    const state = cloneGameState(sourceState);
    const moving = chineseCheckerMarbleAt(state, from);
    const movedMarble = {
      id: moving.id,
      from,
      index: to,
      color: moving.color
    };
    moving.index = to;
    state.resultDismissed = false;
    state.winningLine = [];
    const chainSegments = activeJump
      ? cloneChineseCheckerMoveSegments(sourceState.jumpChain && sourceState.jumpChain.segments).concat(cloneChineseCheckerMoveSegments(move.segments))
      : cloneChineseCheckerMoveSegments(move.segments);
    if (chineseCheckersPlayerWins(state, moving.color)) {
      state.selectedIndex = null;
      state.jumpChain = null;
      state.round += 1;
      state.phase = 'gameover';
      state.winner = moving.color;
      state.ending = 'chinese-checkers-win';
    } else if (stepwise && move.kind === 'jump' && chineseCheckerImmediateJumpMap(state, to).size) {
      state.selectedIndex = to;
      state.jumpChain = {
        marbleId: moving.id,
        startIndex: activeJump && sourceState.jumpChain ? sourceState.jumpChain.startIndex : from,
        currentIndex: to,
        segments: chainSegments
      };
      state.phase = 'ready';
      state.turn = moving.color;
      state.ending = '';
    } else {
      state.selectedIndex = null;
      state.jumpChain = null;
      state.round += 1;
      state.phase = 'ready';
      state.turn = nextChineseCheckersColor(state, moving.color);
      state.ending = '';
    }
    return { changed: true, state, move: cloneChineseCheckerMove(move), marble: movedMarble };
  }

  function chineseCheckerMoveMap(state, fromIndex) {
    const moves = new Map();
    if (!chineseCheckerMarbleAt(state, fromIndex)) return moves;
    chineseCheckerStepMap(state, fromIndex).forEach((move, index) => {
      moves.set(index, move);
    });
    const occupied = chineseCheckerOccupiedSet(state, fromIndex);
    chineseCheckerJumpMap(state, fromIndex, occupied).forEach((move, index) => {
      moves.set(index, move);
    });
    return moves;
  }

  function chineseCheckerStepwiseMoveMap(state, fromIndex) {
    const moves = new Map();
    if (!chineseCheckerMarbleAt(state, fromIndex)) return moves;
    chineseCheckerStepMap(state, fromIndex).forEach((move, index) => {
      moves.set(index, move);
    });
    chineseCheckerImmediateJumpMap(state, fromIndex).forEach((move, index) => {
      moves.set(index, move);
    });
    return moves;
  }

  function chineseCheckerStepMap(state, fromIndex) {
    const moves = new Map();
    const marble = chineseCheckerMarbleAt(state, fromIndex);
    if (!marble) return moves;
    const occupied = chineseCheckerOccupiedSet(state, fromIndex);
    directionsForPreset(state.preset).forEach((dir) => {
      const step = surfaceSuccessor(state, fromIndex, dir);
      if (step && step.index !== fromIndex && !occupied.has(step.index) && !state.removed.has(step.index)) {
        moves.set(step.index, {
          kind: 'step',
          path: [fromIndex, step.index],
          segments: [chineseCheckerMoveSegment(fromIndex, step.index, [fromIndex, step.index], [
            placementTransitionRecord(fromIndex, dir, step)
          ], null)]
        });
      }
    });
    return moves;
  }

  function chineseCheckerImmediateJumpMap(state, fromIndex) {
    const moves = new Map();
    const marble = chineseCheckerMarbleAt(state, fromIndex);
    if (!marble) return moves;
    const occupied = chineseCheckerOccupiedSet(state, fromIndex);
    directionsForPreset(state.preset).forEach((dir) => {
      const segment = chineseCheckerSuperJumpSegment(state, fromIndex, dir, occupied);
      if (!segment) return;
      moves.set(segment.to, {
        kind: 'jump',
        path: [fromIndex, segment.to],
        segments: [segment]
      });
    });
    return moves;
  }

  function chineseCheckerOccupiedSet(state, fromIndex) {
    const occupied = new Set((state.marbles || []).map((item) => item.index));
    occupied.delete(fromIndex);
    return occupied;
  }

  function chineseCheckerJumpMap(state, fromIndex, occupied) {
    const moves = new Map();
    const queue = [{ index: fromIndex, path: [fromIndex], segments: [] }];
    const seenLandings = new Set([fromIndex]);
    while (queue.length) {
      const current = queue.shift();
      directionsForPreset(state.preset).forEach((dir) => {
        const segment = chineseCheckerSuperJumpSegment(state, current.index, dir, occupied);
        if (!segment || seenLandings.has(segment.to)) return;
        const path = current.path.concat(segment.to);
        const segments = current.segments.concat(segment);
        seenLandings.add(segment.to);
        const move = { kind: 'jump', path, segments };
        moves.set(segment.to, move);
        queue.push({ index: segment.to, path, segments });
      });
    }
    return moves;
  }

  function chineseCheckerSuperJumpSegment(state, fromIndex, startDir, occupied) {
    const preset = state && state.preset;
    const guardLimit = Math.max(1, preset.rows * preset.cols * directionsForPreset(preset).length + 1);
    const path = [fromIndex];
    const transitions = [];
    const seen = new Set();
    let index = fromIndex;
    let direction = startDir;
    let midpoint = null;
    for (let distance = 1; distance <= guardLimit; distance += 1) {
      const key = `${index}:${direction}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const next = surfaceSuccessor(state, index, direction);
      if (!next) return null;
      transitions.push(placementTransitionRecord(index, direction, next));
      index = next.index;
      direction = next.dir;
      path.push(index);
      const occupiedHere = occupied.has(index);
      if (!midpoint) {
        if (occupiedHere) midpoint = { index, distance };
        continue;
      }
      if (occupiedHere) return null;
      if (distance === midpoint.distance * 2) {
        if (index === fromIndex || state.removed.has(index) || occupied.has(index)) return null;
        return chineseCheckerMoveSegment(fromIndex, index, path, transitions, midpoint.index);
      }
    }
    return null;
  }

  function chineseCheckerMoveSegment(from, to, path, transitions, jumped) {
    return {
      from,
      to,
      path: Array.isArray(path) ? path.slice() : [from, to],
      jumped: Number.isInteger(jumped) ? jumped : null,
      transitions: Array.isArray(transitions) ? transitions.map(clonePlacementTransition) : []
    };
  }

  function cloneChineseCheckerMove(move) {
    return {
      ...(move || {}),
      path: Array.isArray(move && move.path) ? move.path.slice() : [],
      segments: cloneChineseCheckerMoveSegments(move && move.segments)
    };
  }

  function cloneChineseCheckersJumpChain(chain) {
    if (!chain || typeof chain !== 'object') return null;
    return {
      marbleId: Number.isInteger(chain.marbleId) ? chain.marbleId : null,
      startIndex: Number.isInteger(chain.startIndex) ? chain.startIndex : null,
      currentIndex: Number.isInteger(chain.currentIndex) ? chain.currentIndex : null,
      segments: cloneChineseCheckerMoveSegments(chain.segments)
    };
  }

  function chineseCheckersPlayerWins(state, color) {
    const target = chineseCheckersCampSet(state.camps, 'targets', color);
    if (!target || !target.size) return false;
    const occupiedByColor = new Set((state.marbles || [])
      .filter((marble) => marble.color === color)
      .map((marble) => marble.index));
    return Array.from(target).every((index) => occupiedByColor.has(index));
  }

  function initializeChineseCheckersMarbles(state) {
    const occupied = new Set();
    chineseCheckersPlayerColors(state).forEach((color) => {
      const camp = chineseCheckersCampSet(state.camps, 'starts', color);
      Array.from(camp).sort((a, b) => a - b).forEach((index) => {
        if (occupied.has(index) || state.removed.has(index)) return;
        occupied.add(index);
        state.marbles.push({ id: state.nextMarbleId, index, color });
        state.nextMarbleId += 1;
      });
    });
  }

  function normalizePieceSets(value, preset, removed) {
    const result = { starts: {}, targets: {} };
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    ['starts', 'targets'].forEach((section) => {
      const container = source[section];
      if (!container || typeof container !== 'object' || Array.isArray(container)) return;
      Object.entries(container).forEach(([rawColor, entries]) => {
        const color = normalizePlacementColor(rawColor);
        if (!color) return;
        const set = normalizeTileSet(entries, preset, removed);
        if (set.size) result[section][color] = set;
      });
    });
    return result;
  }

  function pieceSetsFromPieces(pieces, preset, removed) {
    const result = { starts: {}, targets: {} };
    (Array.isArray(pieces) ? pieces : []).forEach((piece) => {
      if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return;
      const tile = normalizeImportedTileRef(piece.tile || piece, preset.rows, preset.cols);
      if (!tile) return;
      const index = indexOf(tile.row, tile.col, preset.cols);
      if (removed.has(index)) return;
      const role = normalizePieceSetRole(piece.role || piece.kind || piece.type) || 'start';
      const color = normalizePlacementColor(piece.color || piece.side || piece.player) || 'black';
      const section = role === 'target' ? 'targets' : 'starts';
      if (!result[section][color]) result[section][color] = new Set();
      result[section][color].add(index);
    });
    return result;
  }

  function normalizePieceSetRole(role) {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'target' || value === 'goal' || value === 'arrival' || value === 'finish') return 'target';
    if (value === 'start' || value === 'piece' || value === 'stone' || value === 'disc' || value === 'marble') return 'start';
    return '';
  }

  function pieceSetsHaveEntries(pieceSets) {
    return !!(pieceSets && ['starts', 'targets'].some((section) => (
      pieceSets[section]
      && Object.values(pieceSets[section]).some((entries) => pieceSetEntryCount(entries) > 0)
    )));
  }

  function pieceSetColors(pieceSets, sections = ['starts', 'targets']) {
    const colors = new Set();
    sections.forEach((section) => {
      const container = pieceSets && pieceSets[section];
      if (!container || typeof container !== 'object') return;
      Object.entries(container).forEach(([color, entries]) => {
        if (pieceSetEntryCount(entries) > 0) colors.add(color);
      });
    });
    return Array.from(colors).sort(comparePlacementColors);
  }

  function pieceSetEntryCount(entries) {
    if (entries instanceof Set) return entries.size;
    if (Array.isArray(entries)) return entries.length;
    return 0;
  }

  function pieceSetsToTileRefs(pieceSets, cols) {
    const result = { starts: {}, targets: {} };
    ['starts', 'targets'].forEach((section) => {
      pieceSetColors(pieceSets, [section]).forEach((color) => {
        const entries = Array.from(pieceSets[section][color] || [])
          .sort((a, b) => a - b)
          .map((index) => rowCol(index, cols));
        if (entries.length) result[section][color] = entries;
      });
    });
    return result;
  }

  function normalizeChineseCheckersCamps(value, preset, removed, pieceSets = null) {
    const fallback = defaultChineseCheckersCamps(preset);
    const pieceSetCamps = pieceSetsHaveEntries(pieceSets) ? pieceSets : null;
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    if (pieceSetCamps) return clonePieceSetMaps(pieceSetCamps);
    if (source && (source.starts || source.targets)) {
      const normalized = normalizePieceSets(source, preset, removed);
      if (pieceSetsHaveEntries(normalized)) return normalized;
    }
    const legacy = { starts: {}, targets: {} };
    const legacySource = source || fallback;
    const legacyColors = new Set(CHINESE_CHECKERS_DEFAULT_COLORS);
    Object.keys(legacySource).forEach((key) => {
      const match = key.match(/^(.+?)(Start|Target)$/);
      if (match) {
        const color = normalizePlacementColor(match[1]);
        if (color) legacyColors.add(color);
      }
    });
    Array.from(legacyColors).sort(comparePlacementColors).forEach((color) => {
      const start = normalizeTileSet(legacySource[`${color}Start`] || fallback.starts[color], preset, removed);
      const target = normalizeTileSet(legacySource[`${color}Target`] || fallback.targets[color], preset, removed);
      if (start.size) legacy.starts[color] = start;
      if (target.size) legacy.targets[color] = target;
    });
    return legacy;
  }

  function clonePieceSetMaps(pieceSets) {
    const result = { starts: {}, targets: {} };
    ['starts', 'targets'].forEach((section) => {
      const container = pieceSets && pieceSets[section];
      if (!container || typeof container !== 'object') return;
      Object.entries(container).forEach(([rawColor, set]) => {
        const color = normalizePlacementColor(rawColor);
        if (!color) return;
        const values = set instanceof Set ? Array.from(set) : (Array.isArray(set) ? set : []);
        const normalized = new Set(values.filter((index) => Number.isInteger(index)));
        if (normalized.size) result[section][color] = normalized;
      });
    });
    return result;
  }

  function cloneChineseCheckersCamps(camps) {
    return clonePieceSetMaps(camps);
  }

  function chineseCheckersCampsToTileRefs(camps, cols) {
    return pieceSetsToTileRefs(camps, cols);
  }

  function chineseCheckersCampsExport(camps, cols) {
    return chineseCheckersCampsToTileRefs(camps, cols);
  }

  function defaultChineseCheckersCamps(preset) {
    const rows = preset.rows;
    const cols = preset.cols;
    return {
      starts: {
        red: [
          { row: 1, col: 1 },
          { row: 1, col: Math.min(2, cols) },
          { row: Math.min(2, rows), col: 1 },
          { row: Math.min(2, rows), col: Math.min(2, cols) }
        ],
        yellow: [
          { row: Math.max(1, rows - 1), col: Math.max(1, cols - 1) },
          { row: Math.max(1, rows - 1), col: cols },
          { row: rows, col: Math.max(1, cols - 1) },
          { row: rows, col: cols }
        ]
      },
      targets: {
        red: [
          { row: Math.max(1, rows - 1), col: Math.max(1, cols - 1) },
          { row: Math.max(1, rows - 1), col: cols },
          { row: rows, col: Math.max(1, cols - 1) },
          { row: rows, col: cols }
        ],
        yellow: [
          { row: 1, col: 1 },
          { row: 1, col: Math.min(2, cols) },
          { row: Math.min(2, rows), col: 1 },
          { row: Math.min(2, rows), col: Math.min(2, cols) }
        ]
      }
    };
  }

  function normalizeTileSet(entries, preset, removed) {
    const values = entries instanceof Set ? Array.from(entries) : entries;
    const tiles = Array.isArray(values) ? values : [];
    const result = new Set();
    tiles.forEach((entry) => {
      const tile = normalizeImportedTileRef(entry, preset.rows, preset.cols);
      if (!tile) return;
      const tileIndex = indexOf(tile.row, tile.col, preset.cols);
      if (!removed.has(tileIndex)) result.add(tileIndex);
    });
    return result;
  }

  function createEmptySokobanDecorations() {
    return SOKOBAN_DECORATION_FIELDS.reduce((decorations, field) => {
      decorations[field] = new Set();
      return decorations;
    }, {});
  }

  function sokobanFieldKeys(field) {
    if (field === 'players') return ['players', 'player', 'sokobanPlayers', 'sokobanPlayer'];
    if (field === 'boxes') return ['boxes', 'box', 'sokobanBoxes', 'sokobanBox'];
    if (field === 'targets') return ['targets', 'target', 'goals', 'goal', 'sokobanTargets', 'sokobanGoals'];
    if (field === 'walls') return ['walls', 'wall', 'sokobanWalls', 'sokobanWall'];
    if (field === 'ice') return ['ice', 'icyGround', 'icy', 'sokobanIce'];
    if (field === 'energyBridges') return ['energyBridges', 'energyBridge', 'bridges', 'bridge', 'sokobanEnergyBridges'];
    return [field];
  }

  function firstSokobanFieldValue(source, field) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
    for (const key of sokobanFieldKeys(field)) {
      if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    }
    return undefined;
  }

  function normalizeSokobanTileSet(entries, preset, removed) {
    if (typeof entries === 'string') {
      return normalizeTileSet(parseCompactTileList(entries, preset.rows, preset.cols), preset, removed);
    }
    return normalizeTileSet(entries, preset, removed);
  }

  function normalizeSokobanDecorations(value, preset, removed) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const decorations = createEmptySokobanDecorations();
    SOKOBAN_DECORATION_FIELDS.forEach((field) => {
      decorations[field] = normalizeSokobanTileSet(firstSokobanFieldValue(source, field), preset, removed);
    });
    decorations.walls.forEach((index) => {
      decorations.players.delete(index);
      decorations.boxes.delete(index);
    });
    decorations.players.forEach((index) => {
      decorations.boxes.delete(index);
    });
    return decorations;
  }

  function normalizeSokobanSetup(preset, removed) {
    const decorations = normalizeSokobanDecorations(preset && preset.sokoban, preset, removed);
    const players = actorsFromSokobanSet(decorations.players, 'player');
    const boxes = actorsFromSokobanSet(decorations.boxes, 'box');
    return {
      players,
      boxes,
      nextPlayerId: players.reduce((max, player) => Math.max(max, player.id + 1), 1),
      nextBoxId: boxes.reduce((max, box) => Math.max(max, box.id + 1), 1),
      targets: decorations.targets,
      walls: decorations.walls,
      ice: decorations.ice,
      energyBridges: decorations.energyBridges
    };
  }

  function actorsFromSokobanSet(set, kind) {
    return Array.from(set instanceof Set ? set : [])
      .sort((a, b) => a - b)
      .map((index, offset) => ({ id: offset + 1, index, kind }));
  }

  function sokobanTileSetEntries(set, cols) {
    return Array.from(set instanceof Set ? set : [])
      .sort((a, b) => a - b)
      .map((index) => ({ index, ...rowCol(index, cols) }));
  }

  function sokobanDecorationsToTileRefs(decorations, cols) {
    const result = {};
    SOKOBAN_DECORATION_FIELDS.forEach((field) => {
      const entries = sokobanTileSetEntries(decorations && decorations[field], cols)
        .map((tile) => ({ row: tile.row, col: tile.col }));
      if (entries.length) result[field] = entries;
    });
    return result;
  }

  function sokobanDecorationHasEntries(decorations) {
    return SOKOBAN_DECORATION_FIELDS.some((field) => decorations && decorations[field] instanceof Set && decorations[field].size);
  }

  function sokobanPresetDecorationsForExport(preset, compact = false) {
    if (!preset || !preset.sokoban) return null;
    const decorations = normalizeSokobanDecorations(preset.sokoban, preset, initialRemovedSet(preset));
    if (!sokobanDecorationHasEntries(decorations)) return null;
    const verbose = sokobanDecorationsToTileRefs(decorations, preset.cols);
    if (!compact) return verbose;
    const result = {};
    SOKOBAN_DECORATION_FIELDS.forEach((field) => {
      const value = compactTileListForExport(verbose[field], preset.rows, preset.cols);
      if (value) result[field] = value;
    });
    return Object.keys(result).length ? result : null;
  }

  function sokobanActorAt(state, index) {
    if (!state || !Array.isArray(state.players)) return null;
    return state.players.find((player) => player.index === index) || null;
  }

  function sokobanBoxAt(state, index) {
    if (!state || !Array.isArray(state.boxes)) return null;
    return state.boxes.find((box) => box.index === index) || null;
  }

  function sokobanTileBlocked(state, index) {
    return !validBoardIndex(state, index)
      || state.removed.has(index)
      || (state.walls instanceof Set && state.walls.has(index));
  }

  function sokobanEnergyBeamObjects(state) {
    if (!isSokobanGame(state)) return [];
    const bridgeSet = state.energyBridges instanceof Set ? state.energyBridges : new Set();
    const bridges = Array.from(bridgeSet).sort((a, b) => a - b);
    const beams = [];
    const seen = new Set();
    bridges.forEach((start) => {
      if (!sokobanEnergyBridgeEndpointOpen(state, start)) return;
      directionsForPreset(state.preset).forEach((dir) => {
        const route = sokobanEnergyBridgeRoute(state, start, dir, bridgeSet);
        if (!route) return;
        const key = sokobanEnergyBeamKey(route);
        if (seen.has(key)) return;
        seen.add(key);
        beams.push({
          id: `beam:${key}`,
          start: route.start,
          end: route.end,
          endpoints: [route.start, route.end],
          interior: route.interior.slice(),
          footprint: [route.start].concat(route.interior, route.end),
          dir: route.dir,
          endDir: route.endDir,
          route: {
            kind: 'axis',
            start: route.start,
            end: route.end,
            directions: route.transitions.map((transition) => transition.outDir),
            transitions: route.transitions
          }
        });
      });
    });
    return beams;
  }

  function sokobanEnergyBridgeRoute(state, startIndex, initialDir, bridgeSet) {
    let index = startIndex;
    let dir = initialDir;
    const interior = [];
    const transitions = [];
    const seen = new Set([`${index}:${dir}`]);
    for (let guard = 0; guard < EVENT_GUARD; guard += 1) {
      const next = surfaceSuccessor(state, index, dir);
      if (!next) return null;
      const transition = placementTransitionRecord(index, dir, next);
      if (bridgeSet.has(next.index)) {
        if (next.index === startIndex || !interior.length || !sokobanEnergyBridgeEndpointOpen(state, next.index)) return null;
        transitions.push(transition);
        return {
          start: startIndex,
          end: next.index,
          dir: initialDir,
          endDir: next.dir,
          interior,
          transitions
        };
      }
      if (sokobanEnergyBridgeGapBlocked(state, next.index)) return null;
      transitions.push(transition);
      interior.push(next.index);
      index = next.index;
      dir = next.dir;
      const stateKey = `${index}:${dir}`;
      if (seen.has(stateKey)) return null;
      seen.add(stateKey);
    }
    return null;
  }

  function sokobanEnergyBridgeEndpointOpen(state, index) {
    return !sokobanTileBlocked(state, index)
      && !sokobanBoxAt(state, index)
      && !sokobanActorAt(state, index);
  }

  function sokobanEnergyBridgeGapBlocked(state, index) {
    return sokobanTileBlocked(state, index)
      || sokobanBoxAt(state, index)
      || sokobanActorAt(state, index)
      || (state.energyBridges instanceof Set && state.energyBridges.has(index));
  }

  function sokobanEnergyBeamKey(route) {
    return [
      sokobanNumberListKey(route.start < route.end ? [route.start, route.end] : [route.end, route.start]),
      sokobanNumberListKey(route.interior)
    ].join('|');
  }

  function sokobanNumberListKey(values) {
    return Array.from(values || [])
      .slice()
      .sort((a, b) => a - b)
      .join(',');
  }

  function sokobanMovementContext(state) {
    const boxesByIndex = new Map();
    const boxesById = new Map();
    let boxesOverlap = false;
    (state.boxes || []).forEach((box) => {
      if (boxesByIndex.has(box.index)) boxesOverlap = true;
      boxesByIndex.set(box.index, box);
      boxesById.set(box.id, box);
    });
    const playersByIndex = new Map();
    const playersById = new Map();
    let playersOverlap = false;
    (state.players || []).forEach((player) => {
      if (playersByIndex.has(player.index)) playersOverlap = true;
      playersByIndex.set(player.index, player);
      playersById.set(player.id, player);
    });
    const beams = sokobanEnergyBeamObjects(state);
    const beamInteriorMap = new Map();
    const beamFootprintMap = new Map();
    const activeBridgeIndices = new Set();
    beams.forEach((beam) => {
      beam.endpoints.forEach((index) => activeBridgeIndices.add(index));
      beam.interior.forEach((index) => {
        const entries = beamInteriorMap.get(index) || [];
        entries.push(beam);
        beamInteriorMap.set(index, entries);
      });
      beam.footprint.forEach((index) => {
        const entries = beamFootprintMap.get(index) || [];
        entries.push(beam);
        beamFootprintMap.set(index, entries);
      });
    });
    return {
      boxesByIndex,
      boxesById,
      boxesOverlap,
      playersByIndex,
      playersById,
      playersOverlap,
      beams,
      beamInteriorMap,
      beamFootprintMap,
      activeBridgeIndices,
      allBridgeIndices: new Set(state.energyBridges || [])
    };
  }

  function sokobanBeamFootprintAt(context, index) {
    return (context && context.beamFootprintMap && context.beamFootprintMap.get(index)) || [];
  }

  function sokobanInteriorBeamsAt(context, index) {
    return (context && context.beamInteriorMap && context.beamInteriorMap.get(index)) || [];
  }

  function sokobanMovementObjectAt(context, index) {
    const box = context.boxesByIndex.get(index);
    if (box) return { kind: 'box', box };
    const beams = sokobanInteriorBeamsAt(context, index);
    if (beams.length > 1) return { kind: 'beamOverlap', beams };
    if (beams.length === 1) return { kind: 'beam', beam: beams[0] };
    if (context.allBridgeIndices.has(index)) return { kind: 'energyBridge', index };
    return null;
  }

  function sokobanIndexBlockedForMover(state, context, index, options = {}) {
    if (sokobanTileBlocked(state, index)) return true;
    const box = context.boxesByIndex.get(index);
    if (box && box.id !== options.ignoreBoxId) return true;
    const footprints = sokobanBeamFootprintAt(context, index);
    if (footprints.some((beam) => {
      if (beam.id === options.ignoreBeamId) return false;
      return !(Number.isInteger(options.ignoreBeamEndpointIndex) && beam.endpoints.includes(options.ignoreBeamEndpointIndex));
    })) {
      return true;
    }
    const ownEndpoints = options.ownBridgeEndpoints || new Set();
    if (context.allBridgeIndices.has(index)
      && index !== options.ignoreBridgeIndex
      && !ownEndpoints.has(index)) {
      return true;
    }
    if (!options.ignorePlayers) {
      const player = context.playersByIndex.get(index);
      if (player && player.id !== options.ignorePlayerId) return true;
    }
    return false;
  }

  function sokobanPlanPlayerMove(state, context, player, direction, pushedBoxIds, pushedBridgeIndices, pushedBeamIds) {
    const next = surfaceSuccessor(state, player.index, direction);
    if (!next || sokobanTileBlocked(state, next.index)) {
      return { changed: false, message: 'player blocked' };
    }
    const object = sokobanMovementObjectAt(context, next.index);
    if (!object) {
      const trace = sokobanTraceSlidingTile(state, context, player.index, direction, {
        ignorePlayerId: player.id,
        ignorePlayers: true
      });
      if (!trace || trace.cycle) {
        return { changed: false, message: trace && trace.cycle ? 'player slide cycles before stopping' : 'player blocked' };
      }
      return {
        changed: true,
        player: { id: player.id, from: player.index, to: trace.to, path: trace.path, dir: direction },
        boxes: [],
        bridges: [],
        beams: []
      };
    }
    if (object.kind === 'box') {
      if (pushedBoxIds.has(object.box.id)) {
        return { changed: false, message: 'two players push the same box' };
      }
      const trace = sokobanTraceSlidingTile(state, context, object.box.index, next.dir, {
        ignoreBoxId: object.box.id,
        ignorePlayers: true
      });
      if (!trace || trace.cycle) {
        return { changed: false, message: trace && trace.cycle ? 'box slide cycles before stopping' : 'box blocked' };
      }
      pushedBoxIds.add(object.box.id);
      const playerStays = (state.ice instanceof Set && state.ice.has(player.index))
        || (state.ice instanceof Set && state.ice.has(object.box.index));
      return {
        changed: true,
        player: {
          id: player.id,
          from: player.index,
          to: playerStays ? player.index : object.box.index,
          path: playerStays ? [] : [object.box.index],
          boxId: object.box.id,
          dir: direction
        },
        boxes: [{
          id: object.box.id,
          from: object.box.index,
          to: trace.to,
          dir: next.dir,
          path: trace.path,
          steps: trace.steps
        }],
        bridges: [],
        beams: []
      };
    }
    if (object.kind === 'energyBridge') {
      if (pushedBridgeIndices.has(object.index)) {
        return { changed: false, message: 'two players push the same energy bridge' };
      }
      const trace = sokobanTraceSlidingTile(state, context, object.index, next.dir, {
        ignoreBridgeIndex: object.index,
        ignoreBeamEndpointIndex: object.index,
        ignorePlayers: true
      });
      if (!trace || trace.cycle) {
        return { changed: false, message: trace && trace.cycle ? 'energy bridge slide cycles before stopping' : 'energy bridge blocked' };
      }
      pushedBridgeIndices.add(object.index);
      const playerStays = (state.ice instanceof Set && state.ice.has(player.index))
        || (state.ice instanceof Set && state.ice.has(object.index));
      return {
        changed: true,
        player: {
          id: player.id,
          from: player.index,
          to: playerStays ? player.index : object.index,
          path: playerStays ? [] : [object.index],
          bridgeFrom: object.index,
          dir: direction
        },
        boxes: [],
        bridges: [{
          from: object.index,
          to: trace.to,
          dir: next.dir,
          path: trace.path,
          steps: trace.steps
        }],
        beams: []
      };
    }
    if (object.kind === 'beamOverlap') {
      return { changed: false, message: 'energy beams overlap there' };
    }
    if (object.kind === 'beam') {
      if (pushedBeamIds.has(object.beam.id)) {
        return { changed: false, message: 'two players push the same energy beam' };
      }
      const trace = sokobanTraceSlidingBeam(state, context, object.beam, next.dir);
      if (!trace || trace.cycle) {
        return { changed: false, message: trace && trace.cycle ? 'energy beam slide cycles before stopping' : 'energy beam blocked' };
      }
      pushedBeamIds.add(object.beam.id);
      const playerStays = (state.ice instanceof Set && state.ice.has(player.index))
        || sokobanBeamObjectOnIce(state, object.beam);
      return {
        changed: true,
        player: {
          id: player.id,
          from: player.index,
          to: playerStays ? player.index : next.index,
          path: playerStays ? [] : [next.index],
          beamId: object.beam.id,
          dir: direction
        },
        boxes: [],
        bridges: [],
        beams: [{
          id: object.beam.id,
          fromEndpoints: object.beam.endpoints.slice(),
          toEndpoints: trace.beam.endpoints.slice(),
          from: object.beam.footprint.slice(),
          to: trace.beam.footprint.slice(),
          dir: next.dir,
          steps: trace.steps
        }]
      };
    }
    return { changed: false, message: 'player blocked' };
  }

  function sokobanTraceSlidingTile(state, context, fromIndex, dir, options = {}) {
    let index = fromIndex;
    let direction = dir;
    const steps = [];
    const path = [];
    const seen = new Set([`${index}:${direction}`]);
    for (let guard = 0; guard < EVENT_GUARD; guard += 1) {
      const next = surfaceSuccessor(state, index, direction);
      if (!next || sokobanIndexBlockedForMover(state, context, next.index, options)) {
        return steps.length ? { to: index, dir: direction, steps, path } : null;
      }
      steps.push(placementTransitionRecord(index, direction, next));
      path.push(next.index);
      index = next.index;
      direction = next.dir;
      if (!(state.ice instanceof Set && state.ice.has(index))) {
        return { to: index, dir: direction, steps, path };
      }
      const stateKey = `${index}:${direction}`;
      if (seen.has(stateKey)) return { cycle: true, steps, path };
      seen.add(stateKey);
    }
    return { cycle: true, steps, path };
  }

  function sokobanTraceSlidingBeam(state, context, sourceBeam, dir) {
    const originalEndpoints = new Set(sourceBeam.endpoints);
    let beam = { ...sourceBeam, originalEndpoints };
    let direction = dir;
    let bridgeSet = new Set(state.energyBridges || []);
    const steps = [];
    const seen = new Set([`${sokobanNumberListKey(beam.footprint)}:${direction}`]);
    for (let guard = 0; guard < EVENT_GUARD; guard += 1) {
      const step = sokobanTranslateBeamStep(state, context, beam, direction, originalEndpoints, bridgeSet);
      if (!step) return steps.length ? { beam, steps } : null;
      steps.push(step);
      beam = { ...step.beam, id: sourceBeam.id, originalEndpoints };
      bridgeSet = step.energyBridges;
      direction = step.dir;
      if (!sokobanBeamObjectOnIce(state, beam)) return { beam, steps };
      const stateKey = `${sokobanNumberListKey(beam.footprint)}:${direction}`;
      if (seen.has(stateKey)) return { cycle: true, beam, steps };
      seen.add(stateKey);
    }
    return { cycle: true, beam, steps };
  }

  function sokobanTranslateBeamStep(state, context, beam, dir, originalEndpoints, currentBridgeSet) {
    const destination = new Map();
    const destinationSet = new Set();
    const records = new Map();
    for (const index of beam.footprint) {
      const next = surfaceSuccessor(state, index, dir);
      if (!next) return null;
      if (destinationSet.has(next.index)) return null;
      if (sokobanIndexBlockedForMover(state, context, next.index, {
        ignoreBeamId: beam.id,
        ignorePlayers: true,
        blockBridgeEndpoints: true,
        ownBridgeEndpoints: originalEndpoints
      })) {
        return null;
      }
      destination.set(index, next.index);
      destinationSet.add(next.index);
      records.set(index, placementTransitionRecord(index, dir, next));
    }
    const newStart = destination.get(beam.start);
    const newEnd = destination.get(beam.end);
    const newInterior = beam.interior.map((index) => destination.get(index));
    const nextBridgeSet = new Set(currentBridgeSet || state.energyBridges || []);
    beam.endpoints.forEach((index) => nextBridgeSet.delete(index));
    nextBridgeSet.add(newStart);
    nextBridgeSet.add(newEnd);
    const nextState = {
      ...state,
      energyBridges: nextBridgeSet
    };
    const matched = sokobanMatchingBeam(nextState, newStart, newEnd, newInterior);
    if (!matched) return null;
    const reference = records.get(beam.start) || records.values().next().value;
    return {
      from: beam.footprint.slice(),
      to: matched.footprint.slice(),
      fromEndpoints: beam.endpoints.slice(),
      toEndpoints: matched.endpoints.slice(),
      transitions: Array.from(records.values()),
      dir: reference ? reference.dir : dir,
      beam: matched,
      energyBridges: nextBridgeSet
    };
  }

  function sokobanMatchingBeam(state, start, end, interior) {
    const endpointKey = sokobanNumberListKey([start, end]);
    const interiorKey = sokobanNumberListKey(interior);
    return sokobanEnergyBeamObjects(state).find((beam) => (
      sokobanNumberListKey(beam.endpoints) === endpointKey
      && sokobanNumberListKey(beam.interior) === interiorKey
    )) || null;
  }

  function sokobanBeamObjectOnIce(state, beam) {
    return !!(state.ice instanceof Set
      && beam
      && Array.isArray(beam.endpoints)
      && beam.endpoints.length === 2
      && beam.endpoints.every((index) => state.ice.has(index)));
  }

  function sokobanFinalEnergyBridges(state, bridgePlans, beamPlans) {
    const bridgeMoves = new Map();
    const addMove = (from, to) => {
      if (!Number.isInteger(from) || !Number.isInteger(to)) return { ok: false, message: 'energy bridge move is invalid' };
      if (bridgeMoves.has(from) && bridgeMoves.get(from) !== to) {
        return { ok: false, message: 'energy bridge moves conflict' };
      }
      bridgeMoves.set(from, to);
      return { ok: true };
    };
    for (const plan of bridgePlans || []) {
      const added = addMove(plan.from, plan.to);
      if (!added.ok) return added;
    }
    for (const plan of beamPlans || []) {
      for (let index = 0; index < plan.fromEndpoints.length; index += 1) {
        const added = addMove(plan.fromEndpoints[index], plan.toEndpoints[index]);
        if (!added.ok) return added;
      }
    }
    const finalEnergyBridges = new Set();
    for (const index of state.energyBridges || []) {
      const finalIndex = bridgeMoves.has(index) ? bridgeMoves.get(index) : index;
      if (finalEnergyBridges.has(finalIndex)) {
        return { ok: false, message: 'energy bridges collide' };
      }
      finalEnergyBridges.add(finalIndex);
    }
    return { ok: true, energyBridges: finalEnergyBridges };
  }

  function sokobanValidatePlayerPathBlockers(state, context, playerPlans, boxPlans, bridgePlans, beamPlans) {
    const movingPlayerIds = new Set(playerPlans
      .filter((plan) => plan.from !== plan.to)
      .map((plan) => plan.id));
    const nonMovingPlayerAt = (index) => {
      const player = context.playersByIndex.get(index);
      return player && !movingPlayerIds.has(player.id) ? player : null;
    };
    for (const plan of playerPlans) {
      for (const index of plan.path || []) {
        const blocker = nonMovingPlayerAt(index);
        if (blocker && blocker.id !== plan.id) return 'player blocked';
      }
    }
    for (const plan of boxPlans) {
      for (const index of plan.path || []) {
        if (nonMovingPlayerAt(index)) return 'box blocked';
      }
    }
    for (const plan of bridgePlans) {
      for (const index of plan.path || []) {
        if (nonMovingPlayerAt(index)) return 'energy bridge blocked';
      }
    }
    for (const plan of beamPlans) {
      for (const step of plan.steps || []) {
        for (const index of step.to || []) {
          if (nonMovingPlayerAt(index)) return 'energy beam blocked';
        }
      }
    }
    return '';
  }

  function sokobanSolved(state) {
    const cargo = sokobanCargoIndices(state);
    return isSokobanGame(state)
      && cargo.length > 0
      && state.targets instanceof Set
      && state.targets.size > 0
      && cargo.every((index) => state.targets.has(index));
  }

  function sokobanCargoIndices(state) {
    const indices = [];
    (state && state.boxes || []).forEach((box) => {
      if (Number.isInteger(box.index)) indices.push(box.index);
    });
    if (state && state.energyBridges instanceof Set) {
      state.energyBridges.forEach((index) => {
        if (Number.isInteger(index)) indices.push(index);
      });
    }
    return indices;
  }

  function sokobanSetupIssue(state) {
    if (!isSokobanGame(state)) return '';
    if (!Array.isArray(state.players) || !state.players.length) return 'add at least one Sokoban player';
    if (!sokobanCargoIndices(state).length) return 'add at least one Sokoban box or energy bridge';
    if (!(state.targets instanceof Set) || !state.targets.size) return 'add at least one Sokoban target';
    const playerTiles = new Set();
    for (const player of state.players) {
      if (sokobanTileBlocked(state, player.index)) return 'a Sokoban player is blocked by a wall or removed tile';
      if (playerTiles.has(player.index)) return 'Sokoban players overlap';
      playerTiles.add(player.index);
    }
    const boxTiles = new Set();
    for (const box of state.boxes) {
      if (sokobanTileBlocked(state, box.index)) return 'a Sokoban box is blocked by a wall or removed tile';
      if (boxTiles.has(box.index)) return 'Sokoban boxes overlap';
      if (playerTiles.has(box.index)) return 'Sokoban players and boxes overlap';
      boxTiles.add(box.index);
    }
    for (const index of state.energyBridges || []) {
      if (sokobanTileBlocked(state, index)) return 'a Sokoban energy bridge is blocked by a wall or removed tile';
      if (playerTiles.has(index)) return 'Sokoban players and energy bridges overlap';
      if (boxTiles.has(index)) return 'Sokoban boxes and energy bridges overlap';
    }
    return '';
  }

  function sokobanTurnInfo(state) {
    const moves = Math.max(0, Number(state && state.moves) || Number(state && state.round) || 0);
    const pushes = Math.max(0, Number(state && state.pushes) || 0);
    const players = Array.isArray(state && state.players) ? state.players.length : 0;
    const boxes = sokobanCargoIndices(state).length;
    return `${players} player${players === 1 ? '' : 's'}, ${boxes} box${boxes === 1 ? '' : 'es'}, ${moves} move${moves === 1 ? '' : 's'}, ${pushes} push${pushes === 1 ? '' : 'es'}`;
  }

  function chineseCheckerMarbleAt(state, index) {
    if (!state || !Array.isArray(state.marbles)) return null;
    return state.marbles.find((marble) => marble.index === index) || null;
  }

  function chineseCheckersMarbleCounts(state) {
    return (state.marbles || []).reduce((counts, marble) => {
      const color = normalizePlacementColor(marble.color) || 'black';
      counts[color] = (counts[color] || 0) + 1;
      return counts;
    }, {});
  }

  function normalizeChineseCheckersPlayers(value, camps = null) {
    const result = [];
    const add = (colorValue) => {
      const color = normalizePlacementColor(colorValue);
      if (color && !result.includes(color)) result.push(color);
    };
    if (Array.isArray(value)) value.forEach(add);
    else if (typeof value === 'string') value.split(/[,\s]+/).forEach(add);
    if (!result.length && camps && typeof camps === 'object') {
      pieceSetColors(camps, ['starts']).forEach(add);
      pieceSetColors(camps, ['targets']).forEach(add);
    }
    if (!result.length) CHINESE_CHECKERS_DEFAULT_COLORS.forEach(add);
    return result;
  }

  function chineseCheckersPlayerColors(state) {
    return normalizeChineseCheckersPlayers(state && state.playerColors, state && state.camps);
  }

  function nextChineseCheckersColor(state, color) {
    const players = chineseCheckersPlayerColors(state);
    if (!players.length) return normalizePlacementColor(color) || 'red';
    const normalized = normalizePlacementColor(color);
    const currentIndex = Math.max(0, players.indexOf(normalized));
    return players[(currentIndex + 1) % players.length] || players[0];
  }

  function chineseCheckersCampSet(camps, section, color) {
    const normalizedColor = normalizePlacementColor(color);
    const container = camps && camps[section];
    const set = normalizedColor && container && container[normalizedColor];
    return set instanceof Set ? set : new Set();
  }

  function chineseCheckersColorLabel(color) {
    return normalizePlacementColor(color) || 'unknown';
  }

  function chineseCheckersTurnInfo(state) {
    if (isChineseCheckersJumping(state)) {
      return `${chineseCheckersColorLabel(state.turn)} jumping; choose next jump or end jump`;
    }
    const selected = Number.isInteger(state.selectedIndex) ? '; marble selected' : '';
    return `${chineseCheckersColorLabel(state.turn)} to move${selected}`;
  }

  function isChineseCheckersJumping(state) {
    if (!isChineseCheckersGame(state) || !state.jumpChain) return false;
    const chain = state.jumpChain;
    if (!Number.isInteger(chain.marbleId) || !Number.isInteger(chain.currentIndex)) return false;
    const marble = (state.marbles || []).find((item) => item.id === chain.marbleId) || null;
    return !!(marble && marble.index === chain.currentIndex && marble.color === state.turn);
  }

  function shouldUseChineseCheckersFullChainHints() {
    return !refs.chineseCheckersFullHints || !!refs.chineseCheckersFullHints.checked;
  }

  function chineseCheckersHintMoveMap(state, fromIndex) {
    if (isChineseCheckersJumping(state)) {
      const chain = state.jumpChain;
      return chain && chain.currentIndex === fromIndex ? chineseCheckerImmediateJumpMap(state, fromIndex) : new Map();
    }
    return shouldUseChineseCheckersFullChainHints()
      ? chineseCheckerMoveMap(state, fromIndex)
      : chineseCheckerStepwiseMoveMap(state, fromIndex);
  }

  function endChineseCheckersJumpFromUi() {
    if (!isChineseCheckersGame(game) || !isChineseCheckersJumping(game) || currentAnimation) return;
    pushUndoSnapshot(`Chinese Checkers ${game.turn} end jump`);
    game = finishChineseCheckersJump(game);
    syncStatusForCurrentGame();
    render();
    syncControls();
    refreshDebugExportIfNeeded();
    if (refs.canvas) refs.canvas.focus();
  }

  function finishChineseCheckersJump(sourceState) {
    const state = cloneGameState(sourceState);
    if (!isChineseCheckersJumping(state)) return state;
    const chain = state.jumpChain;
    const moving = (state.marbles || []).find((marble) => marble.id === chain.marbleId) || null;
    const color = moving ? moving.color : state.turn;
    state.selectedIndex = null;
    state.jumpChain = null;
    state.round += 1;
    state.resultDismissed = false;
    state.winningLine = [];
    if (moving && chineseCheckersPlayerWins(state, color)) {
      state.phase = 'gameover';
      state.winner = color;
      state.ending = 'chinese-checkers-win';
    } else {
      state.phase = 'ready';
      state.turn = nextChineseCheckersColor(state, color);
      state.ending = '';
    }
    return state;
  }

  function emptyChineseCheckersIndices(state) {
    const occupied = new Set((state.marbles || []).map((marble) => marble.index));
    return emptyPlayableIndices(state, occupied);
  }

  function adjacentExistingIndices(state, index) {
    const indices = new Set();
    directionsForPreset(state.preset).forEach((dir) => {
      const next = surfaceSuccessor(state, index, dir);
      if (next && !state.removed.has(next.index)) indices.add(next.index);
    });
    return Array.from(indices);
  }

  function emptyPlayableIndices(state, occupied) {
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!state.removed.has(index) && !occupied.has(index)) empty.push(index);
    }
    return empty;
  }

  function validBoardIndex(state, index) {
    return Number.isInteger(index) && index >= 0 && index < state.preset.rows * state.preset.cols;
  }

  function normalizeGoKomi(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return GO_DEFAULT_KOMI;
    return Math.max(-99, Math.min(99, Math.round(number * 2) / 2));
  }

  function formatKomi(value) {
    const komi = normalizeGoKomi(value);
    return Number.isInteger(komi) ? String(komi) : komi.toFixed(1);
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
    const maxVacatePasses = proposals.length + 1;
    while (!stable && passes < maxVacatePasses) {
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
    if (isGoGame(source)) {
      return {
        gameMode: GAME_MODES.GO,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        stones: (source.stones || []).map((stone) => ({ id: stone.id, index: stone.index, color: stone.color })),
        nextStoneId: source.nextStoneId || 1,
        turn: GO_COLORS.includes(source.turn) ? source.turn : 'black',
        komi: normalizeGoKomi(source.komi),
        passes: Math.max(0, Number(source.passes) || 0),
        captures: {
          black: Math.max(0, Number(source.captures && source.captures.black) || 0),
          white: Math.max(0, Number(source.captures && source.captures.white) || 0)
        },
        previousBoardSignature: source.previousBoardSignature || '',
        winner: GO_COLORS.includes(source.winner) ? source.winner : '',
        territory: source.territory ? { ...source.territory } : { black: 0, white: 0, neutral: 0 },
        deadStoneIds: goDeadStoneIdSet(source),
        scoringReview: !!source.scoringReview && source.phase !== 'gameover',
        scoringMethod: normalizeGoScoringMethod(source.scoringMethod),
        territoryOverrides: cloneGoTerritoryOverrides(source.territoryOverrides),
        finalScore: source.finalScore ? clonePlain(source.finalScore) : null,
        resultDismissed: !!source.resultDismissed,
        round: source.round || 0,
        ending: source.ending || '',
        debugMessage: source.debugMessage || ''
      };
    }
    if (isReversiGame(source)) {
      return {
        gameMode: GAME_MODES.REVERSI,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        discs: (source.discs || []).map((disc) => ({ id: disc.id, index: disc.index, color: disc.color })),
        nextDiscId: source.nextDiscId || 1,
        turn: REVERSI_COLORS.includes(source.turn) ? source.turn : 'black',
        passCount: Math.max(0, Number(source.passCount) || 0),
        winner: REVERSI_COLORS.includes(source.winner) ? source.winner : '',
        finalScore: source.finalScore ? clonePlain(source.finalScore) : null,
        resultDismissed: !!source.resultDismissed,
        round: source.round || 0,
        ending: source.ending || '',
        debugMessage: source.debugMessage || ''
      };
    }
    if (isChineseCheckersGame(source)) {
      return {
        gameMode: GAME_MODES.CHINESE_CHECKERS,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: [],
        newBoxIds: new Set(),
        nextBoxId: 1,
        score: 0,
        marbles: (source.marbles || []).map((marble) => ({ id: marble.id, index: marble.index, color: marble.color })),
        nextMarbleId: source.nextMarbleId || 1,
        camps: cloneChineseCheckersCamps(source.camps),
        playerColors: chineseCheckersPlayerColors(source),
        selectedIndex: Number.isInteger(source.selectedIndex) ? source.selectedIndex : null,
        jumpChain: cloneChineseCheckersJumpChain(source.jumpChain),
        turn: normalizeChineseCheckersTurn(source.turn, chineseCheckersPlayerColors(source)),
        winner: normalizeChineseCheckersWinner(source.winner, chineseCheckersPlayerColors(source)),
        winningLine: [],
        resultDismissed: !!source.resultDismissed,
        round: source.round || 0,
        ending: source.ending || '',
        debugMessage: source.debugMessage || ''
      };
    }
    if (isSokobanGame(source)) {
      return {
        gameMode: GAME_MODES.SOKOBAN,
        preset: source.preset,
        phase: source.phase,
        removed: new Set(source.removed),
        boxes: (source.boxes || []).map((box) => ({ id: box.id, index: box.index })),
        newBoxIds: new Set(),
        nextBoxId: source.nextBoxId || 1,
        score: 0,
        players: (source.players || []).map((player) => ({ id: player.id, index: player.index })),
        nextPlayerId: source.nextPlayerId || 1,
        targets: new Set(source.targets || []),
        walls: new Set(source.walls || []),
        ice: new Set(source.ice || []),
        energyBridges: new Set(source.energyBridges || []),
        moves: Math.max(0, Number(source.moves) || Number(source.round) || 0),
        pushes: Math.max(0, Number(source.pushes) || 0),
        winner: source.winner === 'solved' ? 'solved' : '',
        winningLine: [],
        resultDismissed: !!source.resultDismissed,
        round: Math.max(0, Number(source.round) || Number(source.moves) || 0),
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
    if (isGoGame(state)) return emptyGoIndices(state);
    if (isReversiGame(state)) return emptyReversiIndices(state);
    if (isChineseCheckersGame(state)) return emptyChineseCheckersIndices(state);
    if (isSokobanGame(state)) return emptySokobanIndices(state);
    const occupied = new Set((state.boxes || []).map((box) => box.index));
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!state.removed.has(index) && !occupied.has(index)) empty.push(index);
    }
    return empty;
  }

  function emptySokobanIndices(state) {
    const occupied = new Set((state.players || []).concat(state.boxes || []).map((actor) => actor.index));
    (state.energyBridges || new Set()).forEach((index) => occupied.add(index));
    sokobanEnergyBeamObjects(state).forEach((beam) => {
      beam.footprint.forEach((index) => occupied.add(index));
    });
    const total = state.preset.rows * state.preset.cols;
    const empty = [];
    for (let index = 0; index < total; index += 1) {
      if (!sokobanTileBlocked(state, index) && !occupied.has(index)) empty.push(index);
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
    if (!state || isPlacementGame(state) || !state.boxes) return [];
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
    if (isSokobanGame(state)) return '';
    const stacks = stackedTileDetails(state);
    if (!stacks.length) return '';
    const count = stacks.reduce((sum, stack) => sum + stack.boxIds.length, 0);
    const tiles = stacks.slice(0, 3).map((stack) => `r${stack.row} c${stack.col}`).join(', ');
    return `warning: ${count} stacked boxes on ${stacks.length} tile${stacks.length === 1 ? '' : 's'} (${tiles}${stacks.length > 3 ? ', ...' : ''})`;
  }

  function gameWarnings(state) {
    if (isPlacementGame(state)) return [];
    if (isSokobanGame(state)) {
      const issue = sokobanSetupIssue(state);
      return issue ? [{ kind: 'sokoban-setup', message: issue }] : [];
    }
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
    if (refs.select && refs.select.value === RANDOM_PRESET_CHOICE_ID) return resolvePreset(defaultPresetIdForMode(selectedGameMode()));
    const preset = resolvePreset(refs.select ? refs.select.value : BOUNDARY_GLUE_BOARD_PRESET_ID);
    if (!preset) return null;
    return preset;
  }

  function selectedGomokuPresetIsDynamic() {
    return selectedPresetUsesDynamicBoardSize();
  }

  function selectedPresetUsesDynamicBoardSize(preset = null) {
    if (!refs.select) return false;
    const source = preset || resolvePreset(refs.select.value);
    if (!source) return false;
    return isBoundaryGlueBoardPreset(source) || (dynamicBoardSizeMode(selectedGameMode()) && !!source.dynamicGomokuSize);
  }

  function selectedPresetIsBoundaryGlueBoard(preset = null) {
    const source = preset || selectedPreset();
    return isBoundaryGlueBoardPreset(source);
  }

  function isBoundaryGlueBoardPreset(preset) {
    return !!(preset && (preset.boundaryGlueBoard || preset.id === BOUNDARY_GLUE_BOARD_PRESET_ID));
  }

  function selectedGameMode() {
    const value = refs.gameMode ? refs.gameMode.value : GAME_MODES.NUMBER_2048;
    if (value === GAME_MODES.CHINESE_CHECKERS) return GAME_MODES.CHINESE_CHECKERS;
    if (value === GAME_MODES.REVERSI) return GAME_MODES.REVERSI;
    if (value === GAME_MODES.GO) return GAME_MODES.GO;
    if (value === GAME_MODES.GOMOKU) return GAME_MODES.GOMOKU;
    if (value === GAME_MODES.CONNECT_FOUR) return GAME_MODES.CONNECT_FOUR;
    if (value === GAME_MODES.SOKOBAN) return GAME_MODES.SOKOBAN;
    return GAME_MODES.NUMBER_2048;
  }

  function placementDisplayStyle() {
    const value = refs.gomokuDisplay ? refs.gomokuDisplay.value : 'vertex';
    return value === 'vertex' ? 'vertex' : 'center';
  }

  function selectedGomokuBoardSize() {
    return selectedBoardSize();
  }

  function selectedBoardSize() {
    return selectedBoardDimensions().rows;
  }

  function defaultBoardSizeForMode(mode) {
    if (mode === GAME_MODES.NUMBER_2048) return 4;
    if (mode === GAME_MODES.GO) return 19;
    if (mode === GAME_MODES.REVERSI) return 10;
    return GOMOKU_DEFAULT_BOARD_SIZE;
  }

  function defaultBoardDimensionsForMode(mode) {
    const size = defaultBoardSizeForMode(mode);
    return { rows: size, cols: size };
  }

  function normalizeEvenBoardSize(value) {
    let size = clampInteger(value, REVERSI_MIN_BOARD_SIZE, REVERSI_MAX_BOARD_SIZE, REVERSI_DEFAULT_BOARD_SIZE);
    if (size % 2 !== 0) size += size < REVERSI_MAX_BOARD_SIZE ? 1 : -1;
    return size;
  }

  function syncBoardSizeInputForGameMode() {
    const defaults = defaultBoardDimensionsForMode(selectedGameMode());
    if (refs.gomokuSize) refs.gomokuSize.value = String(defaults.rows);
    if (refs.boundaryGlueRows) refs.boundaryGlueRows.value = String(defaults.rows);
    if (refs.boundaryGlueCols) refs.boundaryGlueCols.value = String(defaults.cols);
  }

  function dynamicBoardSizeMode(mode) {
    return mode === GAME_MODES.GOMOKU || mode === GAME_MODES.GO || mode === GAME_MODES.REVERSI;
  }

  function selectedGoKomi() {
    return normalizeGoKomi(refs.goKomi ? refs.goKomi.value : GO_DEFAULT_KOMI);
  }

  function selectedGoScoringMethod() {
    return normalizeGoScoringMethod(refs.goScoringMethod ? refs.goScoringMethod.value : GO_SCORING_METHOD_DEFAULT);
  }

  function selectedGameOptions(base = {}) {
    const options = { ...base };
    options.gameMode = selectedGameMode();
    if (selectedPresetUsesDynamicBoardSize()) {
      const dimensions = selectedBoardDimensions();
      options.boardRows = dimensions.rows;
      options.boardCols = dimensions.cols;
      options.boardSize = dimensions.rows;
    }
    if (selectedPresetIsBoundaryGlueBoard()) {
      options.boundaryGlueMode = selectedBoundaryGlueMode();
    }
    if (selectedGameMode() === GAME_MODES.GO) {
      options.komi = selectedGoKomi();
      options.scoringMethod = selectedGoScoringMethod();
    }
    if (selectedGameMode() === GAME_MODES.CHINESE_CHECKERS) {
      options.playerColors = selectedChineseCheckersPlayerColors(selectedPreset());
    }
    return options;
  }

  function selectedBoardDimensions() {
    const mode = selectedGameMode();
    const defaults = defaultBoardDimensionsForMode(mode);
    if (selectedPresetIsBoundaryGlueBoard() && selectedBoundaryGlueShape() === 'rectangle') {
      return {
        rows: normalizeBoundaryGlueBoardSize(refs.boundaryGlueRows ? refs.boundaryGlueRows.value : defaults.rows, defaults.rows),
        cols: normalizeBoundaryGlueBoardSize(refs.boundaryGlueCols ? refs.boundaryGlueCols.value : defaults.cols, defaults.cols)
      };
    }
    const value = refs.gomokuSize ? refs.gomokuSize.value : defaults.rows;
    const size = selectedPresetIsBoundaryGlueBoard()
      ? normalizeBoundaryGlueBoardSize(value, defaults.rows)
      : clampInteger(value, GOMOKU_MIN_BOARD_SIZE, GOMOKU_MAX_BOARD_SIZE, defaults.rows);
    return { rows: size, cols: size };
  }

  function normalizeBoundaryGlueBoardSize(value, fallback) {
    return clampInteger(value, BOUNDARY_GLUE_MIN_BOARD_SIZE, BOUNDARY_GLUE_MAX_BOARD_SIZE, fallback);
  }

  function selectedBoundaryGlueMode() {
    return normalizeBoundaryGlueMode(refs.boundaryGlueMode ? refs.boundaryGlueMode.value : BOUNDARY_GLUE_MODES.TORUS);
  }

  function selectedBoundaryGlueShape() {
    return refs.boundaryGlueShape && refs.boundaryGlueShape.value === 'rectangle' ? 'rectangle' : 'square';
  }

  function normalizeBoundaryGlueMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === BOUNDARY_GLUE_MODES.KLEIN_BOTTLE || mode === 'klein' || mode === 'klein bottle') {
      return BOUNDARY_GLUE_MODES.KLEIN_BOTTLE;
    }
    if (mode === BOUNDARY_GLUE_MODES.RP2 || mode === 'rp^2' || mode === 'rp²' || mode === 'projective plane' || mode === 'real projective plane') {
      return BOUNDARY_GLUE_MODES.RP2;
    }
    if (mode === BOUNDARY_GLUE_MODES.OPEN || mode === 'classic' || mode === 'open/classic' || mode === 'none') {
      return BOUNDARY_GLUE_MODES.OPEN;
    }
    if (mode === BOUNDARY_GLUE_MODES.RANDOM || mode === 'random-boundary-glue' || mode === 'random boundary glue') {
      return BOUNDARY_GLUE_MODES.RANDOM;
    }
    return BOUNDARY_GLUE_MODES.TORUS;
  }

  function syncBoundaryGlueBoardControls() {
    const active = selectedPresetIsBoundaryGlueBoard();
    if (refs.boundaryGlueMode) {
      refs.boundaryGlueMode.value = selectedBoundaryGlueMode();
      refs.boundaryGlueMode.disabled = !active;
    }
    if (refs.boundaryGlueShape) refs.boundaryGlueShape.disabled = !active;
    const defaults = defaultBoardDimensionsForMode(selectedGameMode());
    const shape = selectedBoundaryGlueShape();
    if (refs.gomokuSize) {
      const value = shape === 'rectangle'
        ? normalizeBoundaryGlueBoardSize(refs.gomokuSize.value || defaults.rows, defaults.rows)
        : selectedBoardDimensions().rows;
      refs.gomokuSize.value = String(value);
    }
    if (refs.boundaryGlueRows) {
      refs.boundaryGlueRows.min = String(BOUNDARY_GLUE_MIN_BOARD_SIZE);
      refs.boundaryGlueRows.max = String(BOUNDARY_GLUE_MAX_BOARD_SIZE);
      refs.boundaryGlueRows.step = '1';
      refs.boundaryGlueRows.disabled = !active || shape !== 'rectangle';
      refs.boundaryGlueRows.value = String(normalizeBoundaryGlueBoardSize(refs.boundaryGlueRows.value || defaults.rows, defaults.rows));
    }
    if (refs.boundaryGlueCols) {
      refs.boundaryGlueCols.min = String(BOUNDARY_GLUE_MIN_BOARD_SIZE);
      refs.boundaryGlueCols.max = String(BOUNDARY_GLUE_MAX_BOARD_SIZE);
      refs.boundaryGlueCols.step = '1';
      refs.boundaryGlueCols.disabled = !active || shape !== 'rectangle';
      refs.boundaryGlueCols.value = String(normalizeBoundaryGlueBoardSize(refs.boundaryGlueCols.value || defaults.cols, defaults.cols));
    }
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
    if (!presetCatalogReady || !PRESETS.length) return;
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

  function syncGoKomiInputFromGame() {
    if (!refs.goKomi || !isGoGame(game)) return;
    refs.goKomi.value = formatKomi(game.komi);
  }

  function syncGoScoringMethodInputFromGame() {
    if (!refs.goScoringMethod || !isGoGame(game)) return;
    refs.goScoringMethod.value = normalizeGoScoringMethod(game.scoringMethod);
  }

  function createSelectedGameState(presetOrId, options = {}) {
    const mode = selectedGameMode();
    if (mode === GAME_MODES.CHINESE_CHECKERS) return createChineseCheckersState(presetOrId, options);
    if (mode === GAME_MODES.REVERSI) return createReversiState(presetOrId, options);
    if (mode === GAME_MODES.GO) return createGoState(presetOrId, options);
    if (mode === GAME_MODES.GOMOKU) return createGomokuState(presetOrId, options);
    if (mode === GAME_MODES.CONNECT_FOUR) return createConnectFourState(presetOrId, options);
    if (mode === GAME_MODES.SOKOBAN) return createSokobanState(presetOrId, options);
    return createGameState(presetOrId, options);
  }

  function beginSelectedGame(presetOrId, options = {}) {
    const mode = selectedGameMode();
    if (mode === GAME_MODES.CHINESE_CHECKERS) return beginChineseCheckersGame(presetOrId, options);
    if (mode === GAME_MODES.REVERSI) return beginReversiGame(presetOrId, options);
    if (mode === GAME_MODES.GO) return beginGoGame(presetOrId, options);
    if (mode === GAME_MODES.GOMOKU) return beginGomokuGame(presetOrId, options);
    if (mode === GAME_MODES.CONNECT_FOUR) return beginConnectFourGame(presetOrId, options);
    if (mode === GAME_MODES.SOKOBAN) return beginSokobanGame(presetOrId, options);
    return beginGame(presetOrId, options);
  }

  function isGomokuGame(state) {
    return !!state && state.gameMode === GAME_MODES.GOMOKU;
  }

  function isConnectFourGame(state) {
    return !!state && state.gameMode === GAME_MODES.CONNECT_FOUR;
  }

  function isGoGame(state) {
    return !!state && state.gameMode === GAME_MODES.GO;
  }

  function isReversiGame(state) {
    return !!state && state.gameMode === GAME_MODES.REVERSI;
  }

  function isChineseCheckersGame(state) {
    return !!state && state.gameMode === GAME_MODES.CHINESE_CHECKERS;
  }

  function isSokobanGame(state) {
    return !!state && state.gameMode === GAME_MODES.SOKOBAN;
  }

  function isPlacementGame(state) {
    return isGomokuGame(state)
      || isConnectFourGame(state)
      || isGoGame(state)
      || isReversiGame(state)
      || isChineseCheckersGame(state);
  }

  function is2048Game(state) {
    return !state || !state.gameMode || state.gameMode === GAME_MODES.NUMBER_2048;
  }

  function gameModeValue(state) {
    if (isChineseCheckersGame(state)) return GAME_MODES.CHINESE_CHECKERS;
    if (isReversiGame(state)) return GAME_MODES.REVERSI;
    if (isGoGame(state)) return GAME_MODES.GO;
    if (isGomokuGame(state)) return GAME_MODES.GOMOKU;
    if (isConnectFourGame(state)) return GAME_MODES.CONNECT_FOUR;
    if (isSokobanGame(state)) return GAME_MODES.SOKOBAN;
    return GAME_MODES.NUMBER_2048;
  }

  function presetFromImportText(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('paste a preset JSON object');
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      const extracted = extractReturnedPresetObjectText(raw);
      if (!extracted) throw new Error('preset JSON could not be parsed');
      try {
        payload = JSON.parse(extracted);
      } catch (_) {
        throw new Error('preset JSON could not be parsed');
      }
    }
    return presetFromImportPayload(payload);
  }

  function extractReturnedPresetObjectText(source) {
    const text = String(source || '');
    const returnIndex = text.search(/\breturn\b/);
    if (returnIndex < 0) return '';
    const start = text.indexOf('{', returnIndex);
    if (start < 0) return '';
    let depth = 0;
    let quote = '';
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = '';
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(start, index + 1);
      }
    }
    return '';
  }

  function presetFromImportPayload(payload) {
    return normalizePresetPayload(payload, { imported: true });
  }

  function normalizePresetPayload(payload, options = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('preset must be a JSON object');
    }
    const registryEntry = options.registryEntry && typeof options.registryEntry === 'object' ? options.registryEntry : {};
    const rawSource = payload.preset && typeof payload.preset === 'object' && !Array.isArray(payload.preset)
      ? payload.preset
      : payload;
    const source = applyPresetGenerator({ ...registryEntry, ...rawSource });
    const size = parseCompactSize(firstPresentValue(source, ['size']) || firstPresentValue(payload, ['size']));
    const lattice = normalizeImportedLattice(firstPresentValue(source, ['lattice']) || firstPresentValue(payload, ['lattice']) || 'square');
    const rows = normalizeImportedBoardSize(firstPresentValue(source, ['rows']) || firstPresentValue(payload, ['rows']) || (size && size.rows), 'rows');
    const cols = normalizeImportedBoardSize(firstPresentValue(source, ['cols']) || firstPresentValue(payload, ['cols']) || (size && size.cols), 'cols');
    const shell = { lattice, rows, cols, removedTiles: [], cutEdges: [], gluedEdges: [] };
    const removedTiles = normalizeImportedRemovedTiles(
      importedPresetValues(payload, source, ['removed', 'removedTiles', 'backgroundRemovedTiles'], 'tiles', shell),
      rows,
      cols
    );
    shell.removedTiles = removedTiles;
    const removedSet = new Set(removedTiles.map((tile) => indexOf(tile.row, tile.col, cols)));
    const connectFourHoles = normalizeImportedRemovedTiles(
      importedPresetValues(payload, source, ['connectFourHoles', 'holes', 'inputHoles'], 'holes', shell),
      rows,
      cols
    ).filter((tile) => !removedSet.has(indexOf(tile.row, tile.col, cols)));
    const cutEdges = normalizeImportedCutEdges(
      importedPresetValues(payload, source, ['cuts', 'cutEdges', 'backgroundCutEdges', 'boundaries'], 'cuts', shell),
      shell
    );
    shell.cutEdges = cutEdges;
    const gluedEdges = normalizeImportedGluedEdges(
      importedPresetValues(payload, source, ['glue', 'gluedEdges', 'backgroundGluedEdges', 'gluedBoundaries'], 'glue', shell),
      shell
    );
    const backgroundSpace = payload.backgroundSpace && typeof payload.backgroundSpace === 'object' ? payload.backgroundSpace : {};
    const sourceId = sanitizeImportedText(firstPresentValue(source, ['id']) || firstPresentValue(payload, ['id']) || registryEntry.id || '', '');
    const label = sanitizeImportedText(
      firstPresentValue(source, ['label', 'name'])
        || firstPresentValue(payload, ['label', 'name'])
        || registryEntry.label
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
    const gameTypesValue = firstPresentValue(source, ['gameTypes'])
      || firstPresentValue(payload, ['gameTypes'])
      || registryEntry.gameTypes;
    const legacyGroupsValue = firstPresentValue(source, ['groups'])
      || firstPresentValue(payload, ['groups'])
      || registryEntry.groups;
    const legacyGroupValue = firstPresentValue(source, ['group'])
      || firstPresentValue(payload, ['group'])
      || registryEntry.group;
    const hasGameTypeMetadata = gameTypesValue != null || legacyGroupsValue != null || legacyGroupValue != null;
    const normalized = {
      id: options.imported ? IMPORTED_PRESET_ID : cleanPresetId(sourceId || registryEntry.id || label),
      sourceId: options.imported ? sourceId : '',
      label,
      gameTypes: options.imported && !hasGameTypeMetadata
        ? []
        : cleanPresetGameTypes(gameTypesValue, legacyGroupsValue, legacyGroupValue),
      lattice,
      rows,
      cols,
      surface,
      removedTiles,
      connectFourHoles,
      cutEdges,
      gluedEdges,
      gomokuWinLength: normalizePresetGomokuWinLength(
        firstPresentValue(source, ['gomokuWinLength']) || firstPresentValue(payload, ['gomokuWinLength']),
        sourceId || registryEntry.id
      )
    };
    const pieceSetSource = firstPresentValue(source, ['pieceSets']) || firstPresentValue(payload, ['pieceSets']);
    let pieceSets = normalizePieceSets(pieceSetSource, shell, removedSet);
    if (!pieceSetsHaveEntries(pieceSets)) {
      pieceSets = pieceSetsFromPieces(
        importedPresetValues(payload, source, ['pieces'], 'pieces', shell),
        shell,
        removedSet
      );
    }
    if (pieceSetsHaveEntries(pieceSets)) normalized.pieceSets = pieceSetsToTileRefs(pieceSets, cols);
    const goKomi = firstPresentValue(source, ['goKomi', 'komi']) || firstPresentValue(payload, ['goKomi', 'komi']);
    if (goKomi != null) normalized.goKomi = normalizeGoKomi(goKomi);
    const reversiOpening = firstPresentValue(source, ['reversiOpening']) || firstPresentValue(payload, ['reversiOpening']);
    if (Array.isArray(reversiOpening)) normalized.reversiOpening = reversiOpening.map((entry) => ({ ...entry }));
    const campSource = firstPresentValue(source, ['chineseCheckersCamps', 'camps'])
      || firstPresentValue(payload, ['chineseCheckersCamps', 'camps']);
    if (campSource && typeof campSource === 'object' && !Array.isArray(campSource)) {
      normalized.chineseCheckersCamps = chineseCheckersCampsToTileRefs(
        normalizeChineseCheckersCamps(campSource, shell, removedSet),
        cols
      );
    }
    const chinesePlayers = firstPresentValue(source, ['chineseCheckersPlayers', 'playerColors'])
      || firstPresentValue(payload, ['chineseCheckersPlayers', 'playerColors']);
    if (chinesePlayers != null) normalized.chineseCheckersPlayers = normalizeChineseCheckersPlayers(chinesePlayers, normalized.pieceSets);
    const sokobanSource = firstPresentValue(source, ['sokoban']) || firstPresentValue(payload, ['sokoban']);
    const sokobanDecorations = normalizeSokobanDecorations(sokobanSource, shell, removedSet);
    if (sokobanDecorationHasEntries(sokobanDecorations)) {
      normalized.sokoban = sokobanDecorationsToTileRefs(sokobanDecorations, cols);
    }
    if (source.randomGlue === true || payload.randomGlue === true) normalized.randomGlue = true;
    if (source.dynamicGomokuSize === true || payload.dynamicGomokuSize === true) normalized.dynamicGomokuSize = true;
    const dynamicLabel = firstPresentValue(source, ['dynamicGomokuLabelPrefix']) || firstPresentValue(payload, ['dynamicGomokuLabelPrefix']);
    if (dynamicLabel) normalized.dynamicGomokuLabelPrefix = sanitizeImportedText(dynamicLabel, '');
    if (source.boundaryGlueBoard === true || payload.boundaryGlueBoard === true) normalized.boundaryGlueBoard = true;
    if (source.boundaryGlueMaterialized === true || payload.boundaryGlueMaterialized === true) {
      normalized.boundaryGlueMaterialized = true;
    }
    const boundaryGlueMode = firstPresentValue(source, ['boundaryGlueMode']) || firstPresentValue(payload, ['boundaryGlueMode']);
    if (boundaryGlueMode) normalized.boundaryGlueMode = normalizeBoundaryGlueMode(boundaryGlueMode);
    return normalized;
  }

  function applyPresetGenerator(source) {
    const generator = cleanPresetString(source.generator || source.macro || '').toLowerCase();
    if (!generator) return source;
    if (generator === 'rubikscube' || generator === 'rubiks-cube' || generator === 'rubiks') {
      const cubeSize = normalizePositiveInteger(source.cubeSize || source.n || source.generatorSize, 0);
      if (!cubeSize) throw new Error('rubiksCube preset generator needs cubeSize');
      return {
        ...createRubiksCubePreset(cubeSize, source.id, source.label),
        ...source
      };
    }
    throw new Error(`Unknown preset generator "${source.generator}".`);
  }

  function parseCompactSize(value) {
    if (value == null || value === '') return null;
    if (Array.isArray(value) && value.length >= 2) {
      return { rows: Number(value[0]), cols: Number(value[1]) };
    }
    if (value && typeof value === 'object') {
      return { rows: Number(value.rows), cols: Number(value.cols) };
    }
    const match = String(value).trim().match(/^(\d+)\s*x\s*(\d+)$/i);
    if (!match) throw new Error(`Invalid compact size "${value}". Use "rowsxcols".`);
    return { rows: Number(match[1]), cols: Number(match[2]) };
  }

  function importedPresetValues(payload, source, keys, kind, preset) {
    const results = [];
    const backgroundSpace = payload.backgroundSpace && typeof payload.backgroundSpace === 'object'
      ? payload.backgroundSpace
      : null;
    [source, payload, backgroundSpace].filter(Boolean).forEach((container) => {
      keys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(container, key)) return;
        const value = container[key];
        if (Array.isArray(value)) {
          results.push(...value);
        } else if (typeof value === 'string') {
          results.push(...parseCompactPresetList(value, kind, preset));
        }
      });
    });
    return results;
  }

  function parseCompactPresetList(value, kind, preset) {
    if (kind === 'tiles') return parseCompactTileList(value, preset.rows, preset.cols);
    if (kind === 'holes') return parseCompactTileList(value, preset.rows, preset.cols, { top: true });
    if (kind === 'cuts') return parseCompactCutList(value, preset);
    if (kind === 'glue') return parseCompactGlueList(value, preset);
    return [];
  }

  function parseCompactTileList(value, rows, cols, options = {}) {
    const text = String(value || '').trim();
    if (!text) return [];
    if (options.top && text.toLowerCase() === 'top') return connectFourTopRowHoles(cols);
    const tiles = [];
    splitCompactList(text).forEach((entry) => {
      const rect = entry.match(/^rect\(([^,]+),([^)]+)\)$/i);
      if (rect) {
        expandTileCoordinates(parseCompactRange(rect[1]), parseCompactRange(rect[2]), rows, cols).forEach((tile) => tiles.push(tile));
        return;
      }
      const parts = entry.split(',').map((part) => part.trim());
      if (parts.length !== 2) throw new Error(`Invalid tile ref "${entry}". Use row,col.`);
      expandTileCoordinates(parseCompactRange(parts[0]), parseCompactRange(parts[1]), rows, cols).forEach((tile) => tiles.push(tile));
    });
    return tiles;
  }

  function parseCompactCutList(value, preset) {
    const cuts = [];
    splitCompactList(value).forEach((entry) => {
      const sides = entry.split('=').map((part) => part.trim());
      if (sides.length !== 2) throw new Error(`Invalid cut "${entry}". Use row,col=row,col.`);
      const left = parseCompactTileList(sides[0], preset.rows, preset.cols);
      const right = parseCompactTileList(sides[1], preset.rows, preset.cols);
      if (left.length !== right.length) throw new Error(`Cut "${entry}" has mismatched ranges.`);
      left.forEach((tile, index) => cuts.push({ left: tile, right: right[index] }));
    });
    return cuts;
  }

  function parseCompactGlueList(value, preset) {
    const glued = [];
    let autoGroup = 0;
    splitCompactList(value).forEach((entry) => {
      const match = entry.match(/^(?:g(\d+)(~[01]{0,2})?:)?(.+)$/i);
      if (!match) throw new Error(`Invalid glue "${entry}".`);
      const group = match[1] == null ? autoGroup : Number(match[1]);
      const flags = match[2] || '';
      const body = match[3].trim();
      const sides = body.split('=').map((part) => part.trim());
      if (sides.length !== 2) throw new Error(`Invalid glue "${entry}". Use edge=edge.`);
      const first = parseCompactBoundaryList(sides[0], preset);
      const second = parseCompactBoundaryList(sides[1], preset);
      if (first.length !== second.length) throw new Error(`Glue "${entry}" has mismatched ranges.`);
      first.forEach((edge, index) => {
        const pair = { group, first: edge, second: second[index] };
        if (flags) {
          pair.reversed = true;
          if (flags.length >= 2) pair.firstArrowReversed = flags[1] === '1';
          if (flags.length >= 3) pair.secondArrowReversed = flags[2] === '1';
        }
        glued.push(pair);
      });
      autoGroup += 1;
    });
    return glued;
  }

  function parseCompactBoundaryList(value, preset) {
    const parts = String(value || '').split(',').map((part) => part.trim());
    if (parts.length !== 3) throw new Error(`Invalid boundary edge "${value}". Use row,col,dir.`);
    const rows = parseCompactRange(parts[0]);
    const cols = parseCompactRange(parts[1]);
    const dir = normalizeImportedDir(parts[2], preset);
    if (!Number.isInteger(dir)) throw new Error(`Invalid boundary direction "${parts[2]}".`);
    return expandBoundaryCoordinates(rows, cols, dir, preset.rows, preset.cols);
  }

  function splitCompactList(value) {
    return String(value || '')
      .split(/[;\n]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function parseCompactRange(value) {
    const text = String(value || '').trim();
    const range = text.match(/^(-?\d+)\s*\.\.\s*(-?\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const step = start <= end ? 1 : -1;
      const values = [];
      for (let current = start; step > 0 ? current <= end : current >= end; current += step) values.push(current);
      return values;
    }
    if (/^-?\d+$/.test(text)) return [Number(text)];
    throw new Error(`Invalid range "${value}".`);
  }

  function expandTileCoordinates(rowValues, colValues, rows, cols) {
    const tiles = [];
    rowValues.forEach((row) => {
      colValues.forEach((col) => {
        assertCompactTileInBounds(row, col, rows, cols);
        tiles.push({ row, col });
      });
    });
    return tiles;
  }

  function expandBoundaryCoordinates(rowValues, colValues, dir, rows, cols) {
    const edges = [];
    if (rowValues.length > 1 && colValues.length > 1) {
      if (rowValues.length !== colValues.length) {
        throw new Error('Boundary row and column ranges must have the same length when both vary.');
      }
      rowValues.forEach((row, index) => {
        const col = colValues[index];
        assertCompactTileInBounds(row, col, rows, cols);
        edges.push({ row, col, dir });
      });
      return edges;
    }
    rowValues.forEach((row) => {
      colValues.forEach((col) => {
        assertCompactTileInBounds(row, col, rows, cols);
        edges.push({ row, col, dir });
      });
    });
    return edges;
  }

  function assertCompactTileInBounds(row, col, rows, cols) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 1 || row > rows || col < 1 || col > cols) {
      throw new Error(`Tile ${row},${col} is outside the ${rows}x${cols} board.`);
    }
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
    const letterCode = normalizeKeyboardKey(key);
    return Object.prototype.hasOwnProperty.call(keyMap, letterCode) ? keyMap[letterCode] : null;
  }

  function normalizeKeyboardKey(key) {
    const rawKey = String(key || '');
    return rawKey.length === 1 ? `Key${rawKey.toUpperCase()}` : rawKey;
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
    if (preset.boundaryGlueBoard && !preset.boundaryGlueMaterialized) {
      return generateBoundaryGlueBoardPreset(preset, options);
    }
    if (preset.dynamicGomokuSize) {
      applyDynamicBoardSize(preset, options.boardSize || preset.rows);
    }
    if (preset.randomGlue) {
      preset.gluedEdges = generateRandomBoundaryGlue(preset, options.glueRng || Math.random);
    }
    return preset;
  }

  function applyGomokuBoardSize(preset, size) {
    return applyDynamicBoardSize(preset, size);
  }

  function applyDynamicBoardSize(preset, size) {
    const boardSize = clampInteger(size, REVERSI_MIN_BOARD_SIZE, GOMOKU_MAX_BOARD_SIZE, GOMOKU_DEFAULT_BOARD_SIZE);
    preset.rows = boardSize;
    preset.cols = boardSize;
    const labelPrefix = preset.dynamicGomokuLabelPrefix || (preset.randomGlue ? 'random glue' : 'classic');
    preset.label = `${labelPrefix} ${boardSize}*${boardSize}`;
    return preset;
  }

  function gomokuSizedPreset(presetOrId, size) {
    return applyGomokuBoardSize(clonePreset(resolvePreset(presetOrId)), size);
  }

  function sizedDynamicPreset(presetOrId, size) {
    return applyDynamicBoardSize(clonePreset(resolvePreset(presetOrId)), size);
  }

  function gomokuRandomGluePreset(size) {
    const preset = gomokuSizedPreset(BOUNDARY_GLUE_BOARD_PRESET_ID, size);
    preset.gluedEdges = [];
    return preset;
  }

  function generateBoundaryGlueBoardPreset(source, options = {}) {
    const mode = normalizeBoundaryGlueMode(options.boundaryGlueMode || source.boundaryGlueMode || BOUNDARY_GLUE_MODES.TORUS);
    const defaults = defaultBoardDimensionsForMode(options.gameMode || gameModeFromPresetGroup(source));
    const sourceIsCatalogBoundaryBoard = source.id === BOUNDARY_GLUE_BOARD_PRESET_ID;
    const rawRows = firstDefinedValue(options.boardRows, options.rows, options.boardSize);
    const rawCols = firstDefinedValue(options.boardCols, options.cols, options.boardSize);
    const rows = normalizeBoundaryGlueBoardSize(
      rawRows != null ? rawRows : (sourceIsCatalogBoundaryBoard ? defaults.rows : source.rows),
      defaults.rows
    );
    const cols = normalizeBoundaryGlueBoardSize(
      rawCols != null ? rawCols : (sourceIsCatalogBoundaryBoard ? defaults.cols : source.cols),
      defaults.cols
    );
    const preset = {
      ...source,
      id: BOUNDARY_GLUE_BOARD_PRESET_ID,
      label: `${BOUNDARY_GLUE_MODE_LABELS[mode]} ${rows}x${cols}`,
      lattice: 'square',
      rows,
      cols,
      surface: BOUNDARY_GLUE_MODE_LABELS[mode],
      boundaryGlueBoard: true,
      boundaryGlueMaterialized: true,
      boundaryGlueMode: mode,
      removedTiles: [],
      cutEdges: [],
      connectFourHoles: [],
      gluedEdges: []
    };
    if (mode === BOUNDARY_GLUE_MODES.TORUS) preset.gluedEdges = generateTorusBoundaryGlue(rows, cols);
    else if (mode === BOUNDARY_GLUE_MODES.KLEIN_BOTTLE) preset.gluedEdges = generateKleinBoundaryGlue(rows, cols);
    else if (mode === BOUNDARY_GLUE_MODES.RP2) preset.gluedEdges = generateProjectivePlaneBoundaryGlue(rows, cols);
    else if (mode === BOUNDARY_GLUE_MODES.RANDOM) preset.gluedEdges = generateRandomBoundaryGlue(preset, options.glueRng || Math.random);
    return preset;
  }

  function firstDefinedValue(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== '');
  }

  function generateTorusBoundaryGlue(rows, cols) {
    const gluedEdges = [];
    for (let row = 1; row <= rows; row += 1) {
      gluedEdges.push(gluePair(0, { row, col: cols, dir: DIRS.E }, { row, col: 1, dir: DIRS.W }));
    }
    for (let col = 1; col <= cols; col += 1) {
      gluedEdges.push(gluePair(1, { row: 1, col, dir: DIRS.N }, { row: rows, col, dir: DIRS.S }));
    }
    return gluedEdges;
  }

  function generateKleinBoundaryGlue(rows, cols) {
    const gluedEdges = [];
    for (let row = 1; row <= rows; row += 1) {
      gluedEdges.push(gluePair(
        0,
        { row, col: cols, dir: DIRS.E },
        { row: rows - row + 1, col: 1, dir: DIRS.W },
        { reversed: true }
      ));
    }
    for (let col = 1; col <= cols; col += 1) {
      gluedEdges.push(gluePair(1, { row: 1, col, dir: DIRS.N }, { row: rows, col, dir: DIRS.S }));
    }
    return gluedEdges;
  }

  function generateProjectivePlaneBoundaryGlue(rows, cols) {
    const gluedEdges = [];
    for (let row = 1; row <= rows; row += 1) {
      gluedEdges.push(gluePair(
        0,
        { row, col: cols, dir: DIRS.E },
        { row: rows - row + 1, col: 1, dir: DIRS.W },
        { reversed: true }
      ));
    }
    for (let col = 1; col <= cols; col += 1) {
      gluedEdges.push(gluePair(
        1,
        { row: 1, col, dir: DIRS.N },
        { row: rows, col: cols - col + 1, dir: DIRS.S },
        { reversed: true }
      ));
    }
    return gluedEdges;
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
      connectFourHoles: (source.connectFourHoles || []).map((tile) => ({ ...tile })),
      gluedEdges: (source.gluedEdges || []).map(cloneGluePair),
      pieceSets: source.pieceSets ? clonePlain(source.pieceSets) : undefined,
      chineseCheckersPlayers: Array.isArray(source.chineseCheckersPlayers) ? source.chineseCheckersPlayers.slice() : undefined,
      chineseCheckersCamps: source.chineseCheckersCamps ? clonePlain(source.chineseCheckersCamps) : undefined,
      sokoban: source.sokoban ? clonePlain(source.sokoban) : undefined
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
    if (isGoGame(game)) {
      const counts = goStoneCounts(game);
      const scoreView = shouldShowGoScoreAnnotations(game);
      const score = scoreView ? scoreGoGame(game) : null;
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Turn';
      if (refs.highestLabel) refs.highestLabel.textContent = scoreView ? 'Black score' : 'Black stones';
      if (refs.existingLabel) refs.existingLabel.textContent = scoreView ? 'White score' : 'White stones';
      if (refs.removedLabel) refs.removedLabel.textContent = scoreView ? 'Neutral' : 'Komi';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Moves';
      if (refs.score) {
        refs.score.textContent = game.phase === 'gameover'
          ? (game.winner ? `${goColorLabel(game.winner)} wins` : 'draw')
          : (game.scoringReview ? 'review' : goColorLabel(game.turn));
      }
      if (refs.highest) refs.highest.textContent = scoreView ? String(score.black) : String(counts.black);
      if (refs.existing) refs.existing.textContent = scoreView ? String(score.white) : String(counts.white);
      if (refs.removed) refs.removed.textContent = scoreView ? String(score.territory.neutral) : formatKomi(game.komi);
      if (refs.round) refs.round.textContent = String(game.round || 0);
      return;
    }
    if (isReversiGame(game)) {
      const counts = reversiDiscCounts(game);
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Turn';
      if (refs.highestLabel) refs.highestLabel.textContent = 'Black discs';
      if (refs.existingLabel) refs.existingLabel.textContent = 'White discs';
      if (refs.removedLabel) refs.removedLabel.textContent = 'Removed tiles';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Moves';
      if (refs.score) {
        refs.score.textContent = game.phase === 'gameover'
          ? (game.winner ? `${reversiColorLabel(game.winner)} wins` : 'draw')
          : reversiColorLabel(game.turn);
      }
      if (refs.highest) refs.highest.textContent = String(counts.black);
      if (refs.existing) refs.existing.textContent = String(counts.white);
      if (refs.removed) refs.removed.textContent = String(game.removed.size);
      if (refs.round) refs.round.textContent = String(game.round || 0);
      return;
    }
    if (isChineseCheckersGame(game)) {
      const counts = chineseCheckersMarbleCounts(game);
      const players = chineseCheckersPlayerColors(game);
      const first = players[0] || 'red';
      const second = players[1] || '';
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Turn';
      if (refs.highestLabel) refs.highestLabel.textContent = `${chineseCheckersColorLabel(first)} marbles`;
      if (refs.existingLabel) refs.existingLabel.textContent = second ? `${chineseCheckersColorLabel(second)} marbles` : 'Other marbles';
      if (refs.removedLabel) refs.removedLabel.textContent = 'Removed tiles';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Moves';
      if (refs.score) {
        refs.score.textContent = game.phase === 'gameover'
          ? (game.winner ? `${chineseCheckersColorLabel(game.winner)} wins` : 'draw')
          : chineseCheckersColorLabel(game.turn);
      }
      if (refs.highest) refs.highest.textContent = String(counts[first] || 0);
      if (refs.existing) {
        const otherCount = second
          ? (counts[second] || 0)
          : Object.entries(counts).reduce((sum, [color, count]) => sum + (color === first ? 0 : count), 0);
        refs.existing.textContent = String(otherCount);
      }
      if (refs.removed) refs.removed.textContent = String(game.removed.size);
      if (refs.round) refs.round.textContent = String(game.round || 0);
      return;
    }
    if (isSokobanGame(game)) {
      const players = Array.isArray(game.players) ? game.players.length : 0;
      const boxes = Array.isArray(game.boxes) ? game.boxes.length : 0;
      const targets = game.targets instanceof Set ? game.targets.size : 0;
      const walls = game.walls instanceof Set ? game.walls.size : 0;
      if (refs.scoreLabel) refs.scoreLabel.textContent = game.phase === 'gameover' ? 'Result' : 'Players';
      if (refs.highestLabel) refs.highestLabel.textContent = 'Boxes';
      if (refs.existingLabel) refs.existingLabel.textContent = 'Targets';
      if (refs.removedLabel) refs.removedLabel.textContent = 'Walls';
      if (refs.roundLabel) refs.roundLabel.textContent = 'Moves';
      if (refs.score) refs.score.textContent = game.phase === 'gameover' ? 'solved' : String(players);
      if (refs.highest) refs.highest.textContent = String(boxes);
      if (refs.existing) refs.existing.textContent = String(targets);
      if (refs.removed) refs.removed.textContent = String(walls);
      if (refs.round) refs.round.textContent = String(game.moves || game.round || 0);
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
    const catalogAvailable = presetCatalogReady && PRESETS.length > 0;
    const mode2048 = catalogAvailable && is2048Game(game) && selectedGameMode() === GAME_MODES.NUMBER_2048;
    const modeGomoku = catalogAvailable && (isGomokuGame(game) || selectedGameMode() === GAME_MODES.GOMOKU);
    const modeConnectFour = catalogAvailable && (isConnectFourGame(game) || selectedGameMode() === GAME_MODES.CONNECT_FOUR);
    const modeGo = catalogAvailable && (isGoGame(game) || selectedGameMode() === GAME_MODES.GO);
    const modeReversi = catalogAvailable && (isReversiGame(game) || selectedGameMode() === GAME_MODES.REVERSI);
    const modeChineseCheckers = catalogAvailable && (isChineseCheckersGame(game) || selectedGameMode() === GAME_MODES.CHINESE_CHECKERS);
    const modeSokoban = catalogAvailable && (isSokobanGame(game) || selectedGameMode() === GAME_MODES.SOKOBAN);
    const modeDirectional = mode2048 || modeSokoban;
    const modePlacement = modeGomoku || modeConnectFour || modeGo || modeReversi || modeChineseCheckers;
    const boundaryGlueBoard = catalogAvailable && selectedPresetIsBoundaryGlueBoard();
    const boundaryRectangle = boundaryGlueBoard && selectedBoundaryGlueShape() === 'rectangle';
    syncConnectFourFallOptions();
    if (refs.begin) {
      refs.begin.textContent = game && game.phase !== 'setup' ? 'stop the game' : 'begin the game';
      refs.begin.disabled = !catalogAvailable;
    }
    if (refs.select) refs.select.disabled = !catalogAvailable;
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
    if (refs.modeGoControls) {
      refs.modeGoControls.forEach((control) => {
        control.hidden = !modeGo;
      });
    }
    if (refs.modeChineseCheckersControls) {
      refs.modeChineseCheckersControls.forEach((control) => {
        control.hidden = !modeChineseCheckers;
      });
    }
    if (refs.modeSokobanControls) {
      refs.modeSokobanControls.forEach((control) => {
        control.hidden = !modeSokoban;
      });
    }
    syncBoundaryGlueBoardControls();
    if (refs.boundaryGlueModeRow) refs.boundaryGlueModeRow.hidden = !boundaryGlueBoard;
    if (refs.boundaryGlueShapeRow) refs.boundaryGlueShapeRow.hidden = !boundaryGlueBoard;
    if (refs.boundaryGlueRectRow) refs.boundaryGlueRectRow.hidden = !boundaryGlueBoard || !boundaryRectangle;
    if (refs.gomokuSizeRow) refs.gomokuSizeRow.hidden = !selectedPresetUsesDynamicBoardSize() || boundaryRectangle;
    if (refs.gomokuSize) {
      refs.gomokuSize.min = boundaryGlueBoard ? String(BOUNDARY_GLUE_MIN_BOARD_SIZE) : String(GOMOKU_MIN_BOARD_SIZE);
      refs.gomokuSize.max = boundaryGlueBoard ? String(BOUNDARY_GLUE_MAX_BOARD_SIZE) : String(GOMOKU_MAX_BOARD_SIZE);
      refs.gomokuSize.step = '1';
    }
    if (refs.placementDisplayRow) refs.placementDisplayRow.hidden = !modePlacement;
    if (refs.connectFourFall) refs.connectFourFall.disabled = modeConnectFour && game && game.phase !== 'setup';
    syncGoScoringControls(modeGo);
    syncChineseCheckersControls(modeChineseCheckers);
    syncSokobanObjectSizeOutput();
    syncSokobanEnergyGlowOutput();
    syncSokobanBeamOutput();
    if (refs.nextStep) refs.nextStep.disabled = !mode2048 || !(isStepMode() && stepPaused && eventQueue.length && !currentAnimation);
    if (refs.undo) refs.undo.disabled = !undoStack.length;
    if (refs.redo) refs.redo.disabled = !redoStack.length;
    if (refs.exportState) refs.exportState.disabled = !game;
    if (refs.importState) refs.importState.disabled = false;
    syncDebugModeUi();
    syncImportExportControls();
    const activeLattice = catalogAvailable ? latticeForPreset(game ? game.preset : selectedPreset()).id : '';
    if (refs.moveGroups) {
      refs.moveGroups.forEach((group) => {
        group.hidden = !modeDirectional || group.getAttribute('data-move-lattice') !== activeLattice;
      });
    }
    if (refs.moveRow) refs.moveRow.hidden = !modeDirectional;
    if (refs.moveButtons) {
      const disabled = !modeDirectional || !canAcceptDirectionalMove();
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

  function selectedSokobanObjectScale() {
    const value = refs.sokobanObjectSize ? Number(refs.sokobanObjectSize.value) : SOKOBAN_OBJECT_SCALE_DEFAULT;
    return clampInteger(value, SOKOBAN_OBJECT_SCALE_MIN, SOKOBAN_OBJECT_SCALE_MAX, SOKOBAN_OBJECT_SCALE_DEFAULT) / 100;
  }

  function syncSokobanObjectSizeOutput() {
    if (!refs.sokobanObjectSize || !refs.sokobanObjectSizeValue) return;
    const percent = Math.round(selectedSokobanObjectScale() * 100);
    refs.sokobanObjectSize.value = String(percent);
    refs.sokobanObjectSizeValue.textContent = `${percent}%`;
  }

  function selectedSokobanEnergyGlow() {
    const inner = refs.sokobanGlowInner ? Number(refs.sokobanGlowInner.value) : SOKOBAN_ENERGY_GLOW_INNER_DEFAULT;
    const outer = refs.sokobanGlowOuter ? Number(refs.sokobanGlowOuter.value) : SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT;
    const blur = refs.sokobanGlowBlur ? Number(refs.sokobanGlowBlur.value) : SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT;
    return {
      inner: clampInteger(inner, 0, 100, SOKOBAN_ENERGY_GLOW_INNER_DEFAULT) / 100,
      outer: clampInteger(outer, 0, 100, SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT) / 100,
      blur: clampInteger(blur, 0, 100, SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT) / 100
    };
  }

  function syncSokobanEnergyGlowOutput() {
    const glow = selectedSokobanEnergyGlow();
    if (refs.sokobanGlowInner && refs.sokobanGlowInnerValue) {
      refs.sokobanGlowInner.value = String(Math.round(glow.inner * 100));
      refs.sokobanGlowInnerValue.textContent = `${Math.round(glow.inner * 100)}%`;
    }
    if (refs.sokobanGlowOuter && refs.sokobanGlowOuterValue) {
      refs.sokobanGlowOuter.value = String(Math.round(glow.outer * 100));
      refs.sokobanGlowOuterValue.textContent = `${Math.round(glow.outer * 100)}%`;
    }
    if (refs.sokobanGlowBlur && refs.sokobanGlowBlurValue) {
      refs.sokobanGlowBlur.value = String(Math.round(glow.blur * 100));
      refs.sokobanGlowBlurValue.textContent = `${Math.round(glow.blur * 100)}%`;
    }
  }

  function selectedSokobanBeamStyle() {
    const width = refs.sokobanBeamWidth ? Number(refs.sokobanBeamWidth.value) : SOKOBAN_BEAM_WIDTH_DEFAULT;
    const opacity = refs.sokobanBeamOpacity ? Number(refs.sokobanBeamOpacity.value) : SOKOBAN_BEAM_OPACITY_DEFAULT;
    return {
      width: clampInteger(width, 20, 110, SOKOBAN_BEAM_WIDTH_DEFAULT) / 100,
      opacity: clampInteger(opacity, 5, 80, SOKOBAN_BEAM_OPACITY_DEFAULT) / 100
    };
  }

  function syncSokobanBeamOutput() {
    const beam = selectedSokobanBeamStyle();
    if (refs.sokobanBeamWidth && refs.sokobanBeamWidthValue) {
      refs.sokobanBeamWidth.value = String(Math.round(beam.width * 100));
      refs.sokobanBeamWidthValue.textContent = `${Math.round(beam.width * 100)}%`;
    }
    if (refs.sokobanBeamOpacity && refs.sokobanBeamOpacityValue) {
      refs.sokobanBeamOpacity.value = String(Math.round(beam.opacity * 100));
      refs.sokobanBeamOpacityValue.textContent = `${Math.round(beam.opacity * 100)}%`;
    }
  }

  function syncGoScoringControls(modeGo) {
    const activeGo = !!modeGo && isGoGame(game);
    const liveGo = activeGo && game.phase !== 'setup' && game.phase !== 'gameover';
    const readyGo = activeGo && game.phase === 'ready';
    const annotations = activeGo && shouldShowGoScoreAnnotations(game);
    if (refs.goScoringMethod) refs.goScoringMethod.disabled = !modeGo || !activeGo || !!currentAnimation || game.phase === 'gameover';
    if (refs.goPass) refs.goPass.disabled = !readyGo || !!game.scoringReview || !!currentAnimation;
    if (refs.goScoreView) refs.goScoreView.disabled = !liveGo || !!currentAnimation;
    if (refs.goMarkDead) refs.goMarkDead.disabled = !liveGo || !!currentAnimation;
    if (refs.goEditTerritory) refs.goEditTerritory.disabled = !liveGo || !!currentAnimation;
    if (refs.goConfirmScore) refs.goConfirmScore.disabled = !liveGo || !!currentAnimation;
    if (refs.goScoreCompareRow) refs.goScoreCompareRow.hidden = !modeGo || !annotations;
    syncGoScoreCompareOutput(annotations);
  }

  function activateGoScoringReviewControls() {
    if (refs.goScoreView) refs.goScoreView.checked = true;
    if (refs.goMarkDead) refs.goMarkDead.checked = true;
  }

  function isGoDeadMarkModeActive() {
    return !!(
      isGoGame(game)
      && game.phase === 'ready'
      && refs.goMarkDead
      && refs.goMarkDead.checked
    );
  }

  function isGoTerritoryEditModeActive() {
    return !!(
      isGoGame(game)
      && game.phase === 'ready'
      && refs.goEditTerritory
      && refs.goEditTerritory.checked
    );
  }

  function shouldShowGoScoreAnnotations(state) {
    return !!(
      isGoGame(state)
      && (
        state.scoringReview
        || (refs.goScoreView && refs.goScoreView.checked)
        || (refs.goMarkDead && refs.goMarkDead.checked)
        || (refs.goEditTerritory && refs.goEditTerritory.checked)
      )
    );
  }

  function syncGoScoreCompareOutput(visible) {
    if (!refs.goScoreCompare) return;
    if (!visible || !isGoGame(game)) {
      refs.goScoreCompare.textContent = 'score view off';
      return;
    }
    const compare = compareGoScoringMethods(game);
    refs.goScoreCompare.textContent = [
      formatGoCompareScore('influence', compare.influence),
      formatGoCompareScore('nearest', compare.nearest),
      `${compare.disagreements} disagreement${compare.disagreements === 1 ? '' : 's'}`
    ].join('; ');
  }

  function formatGoCompareScore(label, entry) {
    const score = entry && entry.score ? entry.score : { black: 0, white: 0 };
    const ms = entry && Number.isFinite(entry.ms) ? entry.ms : 0;
    return `${label} ${ms.toFixed(2)} ms B ${formatGoScoreNumber(score.black)} W ${formatGoScoreNumber(score.white)}`;
  }

  function formatGoScoreNumber(value) {
    const number = Number(value) || 0;
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function syncChineseCheckersTimingOutput() {
    if (refs.chineseCheckersMoveTime && refs.chineseCheckersMoveTimeValue) {
      refs.chineseCheckersMoveTime.value = String(selectedChineseCheckersMoveTime());
      refs.chineseCheckersMoveTimeValue.textContent = `${refs.chineseCheckersMoveTime.value} ms/edge`;
    }
    if (refs.chineseCheckersJumpPause && refs.chineseCheckersJumpPauseValue) {
      refs.chineseCheckersJumpPause.value = String(selectedChineseCheckersJumpPause());
      refs.chineseCheckersJumpPauseValue.textContent = `${refs.chineseCheckersJumpPause.value} ms`;
    }
  }

  function selectedChineseCheckersMoveTime() {
    return clampInteger(
      refs.chineseCheckersMoveTime ? Number(refs.chineseCheckersMoveTime.value) : CHINESE_CHECKERS_MOVE_TIME_DEFAULT,
      40,
      160,
      CHINESE_CHECKERS_MOVE_TIME_DEFAULT
    );
  }

  function selectedChineseCheckersJumpPause() {
    return clampInteger(
      refs.chineseCheckersJumpPause ? Number(refs.chineseCheckersJumpPause.value) : CHINESE_CHECKERS_JUMP_PAUSE_DEFAULT,
      0,
      240,
      CHINESE_CHECKERS_JUMP_PAUSE_DEFAULT
    );
  }

  function syncChineseCheckersControls(modeChineseCheckers) {
    syncChineseCheckersTimingOutput();
    syncChineseCheckersPlayerOptions(modeChineseCheckers);
    const activeJump = isChineseCheckersJumping(game);
    if (refs.chineseCheckersEndJumpRow) refs.chineseCheckersEndJumpRow.hidden = !modeChineseCheckers || !activeJump;
    if (refs.chineseCheckersEndJump) refs.chineseCheckersEndJump.disabled = !modeChineseCheckers || !activeJump || !!currentAnimation;
    if (refs.chineseCheckersFullHints) refs.chineseCheckersFullHints.disabled = !!activeJump;
  }

  function syncChineseCheckersPlayerOptions(modeChineseCheckers) {
    if (!refs.chineseCheckersPlayerOptions) return;
    refs.chineseCheckersPlayerOptions.textContent = '';
    if (!modeChineseCheckers || !presetCatalogReady || !PRESETS.length) return;
    const preset = game && isChineseCheckersGame(game) ? game.preset : selectedPreset();
    const available = chineseCheckersAvailablePlayerColors(preset);
    const selected = isChineseCheckersGame(game)
      ? chineseCheckersPlayerColors(game)
      : selectedChineseCheckersPlayerColors(preset);
    const selectedSet = new Set(selected);
    const setupEditable = !game || (isChineseCheckersGame(game) && game.phase === 'setup');
    available.forEach((color) => {
      const label = document.createElement('label');
      label.className = 'opt-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = color;
      input.checked = selectedSet.has(color);
      input.disabled = !setupEditable || (input.checked && selectedSet.size <= 1);
      label.appendChild(input);
      label.appendChild(document.createTextNode(chineseCheckersColorLabel(color)));
      refs.chineseCheckersPlayerOptions.appendChild(label);
    });
  }

  function handleChineseCheckersFullHintsChange() {
    if (isChineseCheckersJumping(game)) {
      if (refs.chineseCheckersFullHints) refs.chineseCheckersFullHints.checked = false;
      syncStatus('finish jump first', 'end or continue the current jump before changing hint mode', 'ready');
      syncControls();
      return;
    }
    render();
    if (isChineseCheckersGame(game)) syncStatusForCurrentGame();
  }

  function handleChineseCheckersPlayerOptionsChange(event) {
    if (selectedGameMode() !== GAME_MODES.CHINESE_CHECKERS) return;
    if (game && isChineseCheckersGame(game) && game.phase !== 'setup') {
      syncChineseCheckersPlayerOptions(true);
      return;
    }
    const available = chineseCheckersAvailablePlayerColors(selectedPreset());
    const inputs = refs.chineseCheckersPlayerOptions
      ? Array.from(refs.chineseCheckersPlayerOptions.querySelectorAll('input[type=checkbox]'))
      : [];
    let selected = inputs.filter((input) => input.checked).map((input) => normalizePlacementColor(input.value)).filter(Boolean);
    selected = selected.filter((color, index) => available.includes(color) && selected.indexOf(color) === index);
    if (!selected.length) {
      if (event && event.target && event.target.type === 'checkbox') event.target.checked = true;
      selected = selectedChineseCheckersPlayerColors(selectedPreset());
      syncStatus('player required', 'leave at least one Chinese Checkers player active', 'warn');
      syncChineseCheckersPlayerOptions(true);
      return;
    }
    setChineseCheckersSelectedPlayers(selected, selectedPreset());
    if (isChineseCheckersGame(game) && game.phase === 'setup') {
      game = createSelectedGameState(selectedPreset(), selectedGameOptions({ glueRng: Math.random }));
      game.phase = 'setup';
      clearUndoHistory();
      clearDebugExport();
      render();
      syncStatusForCurrentGame();
      syncControls();
      refreshDebugExportIfNeeded();
    }
  }

  function chineseCheckersAvailablePlayerColors(preset) {
    if (!preset) return CHINESE_CHECKERS_DEFAULT_COLORS.slice();
    const removed = initialRemovedSet(preset);
    const pieceSets = normalizePieceSets(preset.pieceSets, preset, removed);
    const camps = normalizeChineseCheckersCamps(preset.chineseCheckersCamps, preset, removed, pieceSets);
    return normalizeChineseCheckersPlayers(preset.chineseCheckersPlayers || preset.playerColors, camps);
  }

  function selectedChineseCheckersPlayerColors(preset) {
    const available = chineseCheckersAvailablePlayerColors(preset);
    const key = chineseCheckersPlayerSelectionKey(preset, available);
    if (chineseCheckersSelectedPlayers && chineseCheckersSelectedPlayersPresetKey === key) {
      const selected = chineseCheckersSelectedPlayers.filter((color) => available.includes(color));
      if (selected.length) return selected;
    }
    return available.length ? available : CHINESE_CHECKERS_DEFAULT_COLORS.slice();
  }

  function setChineseCheckersSelectedPlayers(colors, preset) {
    const available = chineseCheckersAvailablePlayerColors(preset);
    const selected = colors
      .map(normalizePlacementColor)
      .filter((color, index, list) => color && available.includes(color) && list.indexOf(color) === index);
    chineseCheckersSelectedPlayers = selected.length ? selected : selectedChineseCheckersPlayerColors(preset);
    chineseCheckersSelectedPlayersPresetKey = chineseCheckersPlayerSelectionKey(preset, available);
  }

  function chineseCheckersPlayerSelectionKey(preset, available = chineseCheckersAvailablePlayerColors(preset)) {
    return `${preset && preset.id ? preset.id : ''}|${preset && preset.rows ? preset.rows : 0}|${preset && preset.cols ? preset.cols : 0}|${available.join(',')}`;
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
    if (event.kind === 'reversiFlip') {
      const distance = (event.flips || []).reduce((max, flip) => Math.max(max, flip.distance || 1), 1);
      return Math.min(1050, Math.max(300, 230 + distance * 90));
    }
    if (event.kind === 'chineseCheckersMove') {
      const moveTime = Number.isFinite(event.moveTime) ? event.moveTime : selectedChineseCheckersMoveTime();
      const jumpPause = Number.isFinite(event.jumpPause) ? event.jumpPause : selectedChineseCheckersJumpPause();
      const segments = Array.isArray(event.segments) && event.segments.length ? event.segments : [];
      const steps = chineseCheckersMoveTransitionCount(segments);
      const pauses = Math.max(0, segments.length - 1);
      return Math.max(80, (Math.max(1, steps) * moveTime) + (pauses * jumpPause));
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

  function easeOut(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - ((1 - clamped) ** 3);
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

  function clampNumber(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
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
    if (isGoGame(state)) {
      const score = scoreGoGame(state);
      return {
        gameMode: GAME_MODES.GO,
        stones: (state.stones || [])
          .map((stone) => ({ id: stone.id, index: stone.index, color: stone.color }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        turn: state.turn,
        komi: normalizeGoKomi(state.komi),
        passes: state.passes || 0,
        captures: { ...(state.captures || { black: 0, white: 0 }) },
        winner: state.winner || '',
        territory: { ...((state.finalScore && state.finalScore.territory) || score.territory || { black: 0, white: 0, neutral: 0 }) },
        deadStoneIds: Array.from(goDeadStoneIdSet(state)).sort((a, b) => a - b),
        scoringReview: !!state.scoringReview,
        scoringMethod: normalizeGoScoringMethod(state.scoringMethod),
        territoryOverrides: goTerritoryOverridesExport(state),
        finalScore: state.finalScore ? clonePlain(state.finalScore) : null,
        round: state.round || 0
      };
    }
    if (isReversiGame(state)) {
      return {
        gameMode: GAME_MODES.REVERSI,
        discs: (state.discs || [])
          .map((disc) => ({ id: disc.id, index: disc.index, color: disc.color }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        turn: state.turn,
        passCount: state.passCount || 0,
        winner: state.winner || '',
        finalScore: state.finalScore ? clonePlain(state.finalScore) : null,
        round: state.round || 0
      };
    }
    if (isChineseCheckersGame(state)) {
      return {
        gameMode: GAME_MODES.CHINESE_CHECKERS,
        marbles: (state.marbles || [])
          .map((marble) => ({ id: marble.id, index: marble.index, color: marble.color }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        camps: chineseCheckersCampsExport(state.camps, state.preset.cols),
        playerColors: chineseCheckersPlayerColors(state),
        selectedIndex: Number.isInteger(state.selectedIndex) ? state.selectedIndex : null,
        jumpChain: cloneChineseCheckersJumpChain(state.jumpChain),
        turn: state.turn,
        winner: state.winner || '',
        winningLine: (state.winningLine || []).slice(),
        round: state.round || 0
      };
    }
    if (isSokobanGame(state)) {
      return {
        gameMode: GAME_MODES.SOKOBAN,
        players: (state.players || [])
          .map((player) => ({ id: player.id, index: player.index }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        boxes: (state.boxes || [])
          .map((box) => ({ id: box.id, index: box.index }))
          .sort((a, b) => a.index - b.index || a.id - b.id),
        targets: Array.from(state.targets || []).sort((a, b) => a - b),
        walls: Array.from(state.walls || []).sort((a, b) => a - b),
        ice: Array.from(state.ice || []).sort((a, b) => a - b),
        energyBridges: Array.from(state.energyBridges || []).sort((a, b) => a - b),
        removed: Array.from(state.removed).sort((a, b) => a - b),
        moves: state.moves || state.round || 0,
        pushes: state.pushes || 0,
        winner: state.winner || '',
        round: state.round || state.moves || 0
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

  const nodeStartupPresetItems = loadNodePresetCatalogItems();
  if (nodeStartupPresetItems) installPresetCatalog(nodeStartupPresetItems);

  const api = {
    DIRS,
    CONNECT_FOUR_WIN_LENGTH,
    GAME_MODES,
    GOMOKU_WIN_LENGTH,
    HEX_DIRS,
    LATTICES,
    PRESETS,
    BOUNDARY_GLUE_BOARD_PRESET_ID,
    BOUNDARY_GLUE_MODES,
    RANDOM_GAME_MODE_CHOICE_ID,
    RANDOM_PRESET_CHOICE_ID,
    SOKOBAN_ENERGY_GLOW_INNER_DEFAULT,
    SOKOBAN_ENERGY_GLOW_OUTER_DEFAULT,
    SOKOBAN_ENERGY_GLOW_BLUR_DEFAULT,
    SOKOBAN_BEAM_WIDTH_DEFAULT,
    SOKOBAN_BEAM_OPACITY_DEFAULT,
    SOKOBAN_OBJECT_SCALE_DEFAULT,
    beginGame,
    beginChineseCheckersGame,
    beginConnectFourGame,
    beginGoGame,
    beginGomokuGame,
    beginReversiGame,
    beginSokobanGame,
    blastNeighborIndices,
    cloneGameState,
    connectFourCyclingHoleIndices,
    connectFourDropTarget,
    connectFourOpenHoleIndices,
    countUnmatchedBoundaries,
    createGameState,
    createChineseCheckersState,
    createConnectFourState,
    createGoState,
    createGomokuState,
    createReversiState,
    createSokobanState,
    createRng,
    centeredReversiOpening,
    directNeighborIndex,
    dirFromKey,
    directionsForPreset,
    emptyExistingIndices,
    explosionModeDirections,
    findGomokuWin,
    findConnectFourWin,
    fullBoardWithoutAdjacentMerge,
    generateBoundaryGlueBoardPreset,
    generateTorusBoundaryGlue,
    generateKleinBoundaryGlue,
    generateProjectivePlaneBoundaryGlue,
    generateRandomBoundaryGlue,
    hoveredGlueBoundaryAtPoint,
    hoveredGlueEdgeKeys,
    indexOf,
    isGameOver,
    isExplosionModeActive,
    isSokobanGame,
    latticeForPreset,
    base64UrlDecodeUtf8,
    extractReturnedPresetObjectText,
    gameModeFromPresetGroup,
    gameModeFromUrlParam,
    gameStateFromDebugImportPayload,
    orderedCatalogGameModes,
    placementLineRenderSegments,
    placementWinningLineSegments,
    placementLineTransitionRoute,
    passGoTurn,
    placeChineseCheckerMarble: moveChineseCheckerMarble,
    placeGoStone,
    placeGomokuStone,
    placeConnectFourToken,
    placeReversiDisc,
    moveSokobanPlayers,
    reversiFlipsForMove,
    chineseCheckerMoveMap,
    scoreGoGame,
    normalizePresetPayload,
    presetFromImportPayload,
    presetFromImportText,
    randomPresetForMode,
    randomSetupChoice,
    rowCol,
    simulateRound,
    sokobanEnergyBeamObjects,
    sokobanSolved,
    sokobanSetupIssue,
    spawnInitialValue,
    spawnRoundValue,
    stateSummary,
    surfaceSuccessor
  };

  if (typeof window !== 'undefined') window.RamifiedMinigames = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
})();
