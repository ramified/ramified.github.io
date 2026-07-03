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
        { group: 0, first: { row: 2, col: 3, dir: DIRS.S }, second: { row: 3, col: 9, dir: DIRS.N } },
        { group: 0, first: { row: 2, col: 4, dir: DIRS.S }, second: { row: 3, col: 8, dir: DIRS.N } },
        { group: 1, first: { row: 3, col: 3, dir: DIRS.N }, second: { row: 2, col: 8, dir: DIRS.S } },
        { group: 1, first: { row: 3, col: 4, dir: DIRS.N }, second: { row: 2, col: 9, dir: DIRS.S } }
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
  const MIN_IMPORTED_BOARD = 1;
  const MAX_IMPORTED_BOARD = 12;

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

  function init() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.select = document.getElementById('surface-preset-select');
    refs.importToggle = document.getElementById('import-preset-toggle');
    refs.importTools = document.getElementById('import-preset-tools');
    refs.importInput = document.getElementById('import-preset-input');
    refs.applyImportPreset = document.getElementById('apply-import-preset');
    refs.boxStyle = document.getElementById('number-box-style');
    refs.begin = document.getElementById('begin-game');
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
    refs.statusBadge = document.getElementById('status-badge');
    refs.statusLine = document.getElementById('status-line');
    refs.infoLine = document.getElementById('info-line');
    refs.score = document.getElementById('score-value');
    refs.highest = document.getElementById('highest-tile-value');
    refs.existing = document.getElementById('existing-tile-value');
    refs.removed = document.getElementById('removed-tile-value');
    refs.round = document.getElementById('round-value');
    if (!refs.canvas || !refs.ctx || !refs.select) return;

    refs.select.addEventListener('change', resetToPreview);
    if (refs.importToggle) refs.importToggle.addEventListener('click', toggleImportTools);
    if (refs.applyImportPreset) refs.applyImportPreset.addEventListener('click', importPresetFromUi);
    if (refs.boxStyle) refs.boxStyle.addEventListener('change', render);
    if (refs.begin) refs.begin.addEventListener('click', beginGameFromUi);
    if (refs.speed) refs.speed.addEventListener('input', syncSpeedOutput);
    if (refs.stepMode) refs.stepMode.addEventListener('change', syncControls);
    if (refs.nextStep) refs.nextStep.addEventListener('click', playNextStep);
    if (refs.debugToggle) refs.debugToggle.addEventListener('click', toggleDebugMode);
    if (refs.undo) refs.undo.addEventListener('click', undoPreviousStep);
    if (refs.exportState) refs.exportState.addEventListener('click', exportDebugState);
    if (refs.importState) refs.importState.addEventListener('click', importDebugState);
    if (refs.canvas) refs.canvas.addEventListener('click', handleCanvasClick);
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
    game = createGameState(selectedPreset(), { glueRng: Math.random });
    game.phase = 'setup';
    clearUndoHistory();
    clearDebugExport();
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    clearNoMoveTrial();
    eventQueueChangedBoard = false;
    render();
    syncStatus(`${game.preset.label} preview`, previewInfo(game.preset), 'setup');
    syncControls();
  }

  function beginGameFromUi() {
    stopPlayback();
    game = beginGame(selectedPreset(), { rng: Math.random, glueRng: Math.random });
    clearUndoHistory();
    clearDebugExport();
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    clearNoMoveTrial();
    eventQueueChangedBoard = false;
    game.phase = 'ready';
    render();
    syncStatus(`${game.preset.label} game seed`, 'use arrow keys to slide', 'ready');
    syncControls();
    if (refs.canvas) refs.canvas.focus();
  }

  function toggleImportTools() {
    if (!refs.importTools) return;
    refs.importTools.hidden = !refs.importTools.hidden;
    if (refs.importToggle) refs.importToggle.setAttribute('aria-expanded', refs.importTools.hidden ? 'false' : 'true');
    if (!refs.importTools.hidden && refs.importInput) refs.importInput.focus();
  }

  function importPresetFromUi() {
    if (!refs.importInput) return;
    try {
      importedPreset = presetFromImportText(refs.importInput.value);
      ensureImportedPresetOption(importedPreset);
      if (refs.select) refs.select.value = importedPreset.id;
      resetToPreview();
      syncStatus('preset imported', previewInfo(game.preset), 'setup');
      if (refs.importTools) refs.importTools.hidden = true;
      if (refs.importToggle) refs.importToggle.setAttribute('aria-expanded', 'false');
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
    const dir = game ? dirFromName(button.getAttribute('data-move-dir'), game.preset) : null;
    if (!Number.isInteger(dir) || !canAcceptMove()) return;
    playRound(dir);
    if (refs.canvas) refs.canvas.focus();
  }

  function canAcceptMove() {
    return !!game
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
      render();
      if (isStepMode()) {
        stepPaused = eventIndex < eventQueue.length;
        syncControls();
        return;
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
    if (event.kind !== 'spawn') applyEvent(game, event);
    currentAnimation = null;
    render();
    if (isStepMode()) {
      stepPaused = eventIndex < eventQueue.length;
      if (stepPaused) {
        game.phase = 'paused';
        syncStatus(`round ${game.round}: paused`, `${eventIndex}/${eventQueue.length} events`, 'step');
        syncControls();
        return;
      }
    }
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
      syncStatus(`round ${game.round} complete`, 'use arrow keys to slide', 'ready');
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
      syncStatus('debug mode', 'click a tile to assign the tile value', 'debug');
      if (refs.canvas) refs.canvas.focus();
    } else {
      syncStatusForCurrentGame();
    }
  }

  function syncDebugModeUi() {
    if (refs.debugToggle) {
      refs.debugToggle.classList.toggle('debug-active', debugMode);
      refs.debugToggle.setAttribute('aria-pressed', debugMode ? 'true' : 'false');
    }
    if (refs.debugTools) refs.debugTools.hidden = !debugMode;
    if (refs.debugTileValue) refs.debugTileValue.disabled = !debugMode;
  }

  function handleCanvasClick(event) {
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

  function tileFromCanvasEvent(event) {
    if (!refs.canvas || !geometry || !geometry.cells || !geometry.cells.length) return null;
    const rect = refs.canvas.getBoundingClientRect ? refs.canvas.getBoundingClientRect() : null;
    const width = rect && rect.width ? rect.width : geometry.width;
    const height = rect && rect.height ? rect.height : geometry.height;
    const left = rect ? rect.left : 0;
    const top = rect ? rect.top : 0;
    const x = ((event.clientX || 0) - left) * (geometry.width / Math.max(1, width));
    const y = ((event.clientY || 0) - top) * (geometry.height / Math.max(1, height));
    const radius = geometry.radius * 0.96;
    for (let index = 0; index < geometry.cells.length; index += 1) {
      const cell = geometry.cells[index];
      if (!cell) continue;
      if (pointInPolygon({ x, y }, tilePoints(cell.x, cell.y, radius, geometry.lattice))) {
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
    syncStatus('status exported', `${game.boxes.length} box${game.boxes.length === 1 ? '' : 'es'}, ${game.removed.size} removed`, debugMode ? 'debug' : phaseBadge(game.phase));
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
      render();
      syncStatus('status imported', `${game.boxes.length} box${game.boxes.length === 1 ? '' : 'es'}, ${game.removed.size} removed`, 'debug');
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
    return {
      exportedAt: new Date().toISOString(),
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
      score: game.score || 0,
      highest: highestValue(game),
      existingTiles: existingTileCount(game),
      nextBoxId: game.nextBoxId,
      boxes: game.boxes
        .map((box) => boxExport(box, preset.cols))
        .sort((a, b) => a.index - b.index || a.id - b.id),
      removed: Array.from(game.removed)
        .sort((a, b) => a - b)
        .map((index) => ({ index, ...rowCol(index, preset.cols) })),
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
    const boxes = normalizeStatusBoxes(payload.boxes, preset, removed);
    const nextBoxId = Math.max(
      normalizeNonnegativeInteger(payload.nextBoxId, 1),
      boxes.reduce((max, box) => Math.max(max, box.id + 1), 1)
    );
    const state = {
      preset,
      phase: normalizeStatusPhase(payload.phase),
      removed,
      boxes,
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

  function normalizeStatusPhase(value) {
    return ['setup', 'ready', 'paused', 'animating', 'gameover'].includes(value) ? value : 'ready';
  }

  function normalizeStatusEnding(value, phase) {
    if (phase !== 'gameover') return '';
    return value === 'bonus' ? 'bonus' : 'standard';
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
    syncStatus(`round ${game.round}`, 'use arrow keys to slide', phaseBadge(game.phase));
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
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    geometry.cells.forEach((cell, index) => {
      if (cell) drawTile(ctx, geometry, cell.row, cell.col, removed.has(index));
    });

    drawBackgroundBoundaries(ctx, geometry, preset, removed);
    drawGlueEdges(ctx, geometry, preset);
    drawNumberBoxes(ctx, geometry, game ? game.boxes : []);
    drawAnimationOverlays(ctx, geometry);
    if (game && game.phase === 'gameover') drawGameOverPopup(ctx, geometry, game);
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

  function drawTile(ctx, geom, row, col, removed) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const points = tilePoints(cell.x, cell.y, geom.radius * 0.96, geom.lattice);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = removed ? '#e9e0d0' : '#fbf5e8';
    ctx.strokeStyle = '#d8c9ac';
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

  function drawGlueEdges(ctx, geom, preset) {
    ctx.save();
    preset.gluedEdges.forEach((pair) => {
      const color = glueColor(pair);
      drawGlueHalf(ctx, geom, pair.first, color, glueFirstArrowReversed(pair));
      drawGlueHalf(ctx, geom, pair.second, color, glueSecondArrowReversed(pair));
    });
    ctx.restore();
  }

  function drawGlueHalf(ctx, geom, edge, color, reverse) {
    const segment = edgeSegment(geom, edge.row, edge.col, edge.dir);
    const lineWidth = Math.max(1.8, geom.radius * 0.055) * 1.15;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawBackgroundBoundarySegment(ctx, segment);
    drawSegmentArrow(ctx, segment, reverse, color, lineWidth, geom.radius);
    ctx.restore();
  }

  function drawNumberBoxes(ctx, geom, boxes) {
    if (!boxes.length) return;
    const hidden = hiddenBoxIdsForAnimation();
    boxes.forEach((box) => {
      if (hidden.has(box.id)) return;
      drawBoxAtIndex(ctx, geom, box.index, box.value, 1);
    });
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
      drawBoxAtIndex(ctx, geom, event.index, event.value, Math.max(0.12, progress));
    }
  }

  function hiddenBoxIdsForAnimation() {
    const hidden = new Set();
    if (!currentAnimation) return hidden;
    const event = currentAnimation.event;
    if (event.kind === 'move') hidden.add(event.boxId);
    if (event.kind === 'moveGroup') event.moves.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'moveGroup' && event.bounces) event.bounces.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'moveGroup' && event.explosions) {
      event.explosions.forEach((explosion) => hideExplosionBoxes(hidden, explosion));
    }
    if (event.kind === 'bounceGroup') event.moves.forEach((move) => hidden.add(move.boxId));
    if (event.kind === 'merge') event.removeBoxIds.forEach((id) => hidden.add(id));
    if (event.kind === 'merge' && !event.targetBoxId) hidden.add(event.boxId);
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

  function drawBoxAtIndex(ctx, geom, index, value, scale) {
    const cell = geom.cells[index];
    if (!cell) return;
    drawBoxAtPoint(ctx, cell, geom.radius, value, scale, geom.lattice);
  }

  function drawBoxAtPoint(ctx, point, radius, value, scale, lattice = LATTICES.square) {
    const style = refs.boxStyle ? refs.boxStyle.value : 'paper';
    if (style === 'ink') drawInkBox(ctx, point, radius, value, scale, lattice);
    else if (style === 'color') drawColorBox(ctx, point, radius, value, scale, lattice);
    else drawPaperBox(ctx, point, radius, value, scale, lattice);
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
    ctx.fillText(state.ending === 'bonus' ? 'bonus ending' : 'game over', geom.width / 2, y + height * 0.36);
    ctx.fillStyle = '#6c6257';
    ctx.font = `${Math.max(12, Math.round(geom.radius * 0.34))}px "JetBrains Mono", monospace`;
    ctx.fillText(`score ${state.score || 0}   highest ${highestValue(state)}`, geom.width / 2, y + height * 0.66);
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
      preset,
      phase: 'setup',
      removed: initialRemovedSet(preset),
      boxes: [],
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

  function simulateRound(sourceState, dir, options = {}) {
    const rng = options.rng || Math.random;
    const shouldSpawn = options.spawn !== false;
    const state = cloneGameState(sourceState);
    const events = [];
    const debugMessages = [];
    const mergeLocked = new Set();
    const stackedBoxIds = stackedBoxIdSet(state);
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
          addExplosionEvents(state, events, actor.index, actor.value, [actor.id]);
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
          addExplosionEvents(state, events, actor.index, actor.value, [actor.id]);
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
          addMergeEvent(state, events, result, mergeLocked, active);
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
      if (moveEvents.length || explosionAnimations.length) {
        events.push({
          kind: 'moveGroup',
          moves: moveEvents,
          bounces: bounceEvents,
          explosions: explosionAnimations
        });
      } else if (bounceEvents.length) {
        events.push({ kind: 'bounceGroup', moves: bounceEvents });
      }
      pushMerges.forEach((merge) => addPushedMergeEvent(state, events, merge, mergeLocked, active));
      explosions.forEach((explosion) => {
        addExplosionEvents(state, events, explosion.center, explosion.value, explosion.removeBoxIds, explosion.moves, {
          animate: !(explosion.moves && explosion.moves.length)
        });
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
    const clearIndices = large ? blastNeighborIndices(state, center) : [];
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
      event.moves.forEach((move) => applyEvent(targetState, move));
      return;
    }
    if (event.kind === 'bounceGroup') {
      return;
    }
    if (event.kind === 'move') {
      const box = findBox(targetState, event.boxId);
      if (box) box.index = event.to;
      return;
    }
    if (event.kind === 'merge') {
      event.removeBoxIds.forEach((id) => removeBox(targetState, id));
      let box = findBox(targetState, event.boxId);
      if (!box) {
        box = { id: event.boxId, index: event.to, value: event.newValue };
        targetState.boxes.push(box);
      }
      box.index = event.to;
      box.value = event.newValue;
      targetState.score += event.newValue;
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
    }
  }

  function spawnNumbers(state, requestedCount, rng, valuePicker, events) {
    let spawned = 0;
    while (spawned < requestedCount) {
      const empty = emptyExistingIndices(state);
      if (!empty.length) break;
      const index = empty[Math.floor(rng() * empty.length)];
      const value = valuePicker(rng);
      const box = { id: state.nextBoxId, index, value };
      state.nextBoxId += 1;
      state.boxes.push(box);
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
        color: partner.color
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
    const out = new Set();
    for (const dir of directionsForPreset(state.preset)) {
      const next = surfaceSuccessor(state, center, dir);
      if (next && next.index !== center && !state.removed.has(next.index)) out.add(next.index);
    }
    return Array.from(out);
  }

  function isGameOver(state) {
    if (!state || emptyExistingIndices(state).length) return false;
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
    return {
      preset: source.preset,
      phase: source.phase,
      removed: new Set(source.removed),
      boxes: source.boxes.map((box) => ({ id: box.id, index: box.index, value: box.value })),
      nextBoxId: source.nextBoxId,
      score: source.score,
      round: source.round,
      ending: source.ending || '',
      debugMessage: source.debugMessage || ''
    };
  }

  function emptyExistingIndices(state) {
    const occupied = new Set(state.boxes.map((box) => box.index));
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
    if (!state || !state.boxes) return [];
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
  }

  function removeBoxesAtIndex(state, index) {
    state.boxes = state.boxes.filter((box) => box.index !== index);
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
    return resolvePreset(refs.select ? refs.select.value : 'torus');
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
    if (preset.randomGlue) {
      preset.gluedEdges = generateRandomBoundaryGlue(preset, options.glueRng || Math.random);
    }
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

  function syncStats() {
    if (!game) return;
    if (refs.score) refs.score.textContent = String(game.score || 0);
    if (refs.highest) refs.highest.textContent = String(highestValue(game));
    if (refs.existing) refs.existing.textContent = String(existingTileCount(game));
    if (refs.removed) refs.removed.textContent = String(game.removed.size);
    if (refs.round) refs.round.textContent = String(game.round || 0);
  }

  function syncControls() {
    if (refs.nextStep) refs.nextStep.disabled = !(isStepMode() && stepPaused && eventQueue.length && !currentAnimation);
    if (refs.undo) refs.undo.disabled = !undoStack.length;
    if (refs.exportState) refs.exportState.disabled = !game;
    if (refs.importState) refs.importState.disabled = !debugMode;
    syncDebugModeUi();
    const activeLattice = latticeForPreset(game ? game.preset : selectedPreset()).id;
    if (refs.moveGroups) {
      refs.moveGroups.forEach((group) => {
        group.hidden = group.getAttribute('data-move-lattice') !== activeLattice;
      });
    }
    if (refs.moveButtons) {
      const disabled = !canAcceptMove();
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

  function eventDuration(event) {
    const base = refs.speed ? Number(refs.speed.value) || 260 : 260;
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
    return state.boxes.reduce((max, box) => Math.max(max, box.value), 0);
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
    return {
      boxes: state.boxes
        .map((box) => ({ id: box.id, index: box.index, value: box.value }))
        .sort((a, b) => a.index - b.index || a.id - b.id),
      removed: Array.from(state.removed).sort((a, b) => a - b),
      score: state.score,
      round: state.round,
      highest: highestValue(state)
    };
  }

  const api = {
    DIRS,
    HEX_DIRS,
    LATTICES,
    PRESETS,
    beginGame,
    blastNeighborIndices,
    cloneGameState,
    countUnmatchedBoundaries,
    createGameState,
    createRng,
    directNeighborIndex,
    dirFromKey,
    directionsForPreset,
    emptyExistingIndices,
    indexOf,
    isGameOver,
    latticeForPreset,
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
