(() => {
  'use strict';

  const DIRS = { E: 0, S: 1, W: 2, N: 3 };
  const DIR_FROM_NAME = { E: DIRS.E, S: DIRS.S, W: DIRS.W, N: DIRS.N };
  const DIR_FROM_KEY = {
    ArrowRight: DIRS.E,
    ArrowDown: DIRS.S,
    ArrowLeft: DIRS.W,
    ArrowUp: DIRS.N
  };
  const OFFSETS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const OPPOSITE = [DIRS.W, DIRS.N, DIRS.E, DIRS.S];
  const GLUE_COLORS = ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'];
  const MAX_COMPLETED_GLUINGS = 3;
  const PUSH_CHAIN_LIMIT = 50;
  const EVENT_GUARD = 900;

  const PRESETS = [
    {
      id: 'classic-4x4',
      label: '4*4 classic',
      rows: 4,
      cols: 4,
      surface: 'square grid',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    {
      id: 'half-glued',
      label: 'half-glued',
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
    }
  ];

  const refs = {};
  let game = null;
  let geometry = null;
  let currentAnimation = null;
  let eventQueue = [];
  let eventIndex = 0;
  let stepPaused = false;
  let animationFrameId = null;

  function init() {
    refs.canvas = document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas ? refs.canvas.getContext('2d') : null;
    refs.select = document.getElementById('surface-preset-select');
    refs.boxStyle = document.getElementById('number-box-style');
    refs.begin = document.getElementById('begin-game');
    refs.speed = document.getElementById('animation-speed');
    refs.speedValue = document.getElementById('animation-speed-value');
    refs.stepMode = document.getElementById('step-mode');
    refs.nextStep = document.getElementById('next-step');
    refs.moveButtons = document.querySelectorAll ? Array.from(document.querySelectorAll('[data-move-dir]')) : [];
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
    if (refs.boxStyle) refs.boxStyle.addEventListener('change', render);
    if (refs.begin) refs.begin.addEventListener('click', beginGameFromUi);
    if (refs.speed) refs.speed.addEventListener('input', syncSpeedOutput);
    if (refs.stepMode) refs.stepMode.addEventListener('change', syncControls);
    if (refs.nextStep) refs.nextStep.addEventListener('click', playNextStep);
    refs.moveButtons.forEach((button) => {
      button.addEventListener('click', () => handleDirectionalButton(button));
    });
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', render);

    syncSpeedOutput();
    resetToPreview();
  }

  function resetToPreview() {
    stopPlayback();
    game = createGameState(selectedPreset());
    game.phase = 'setup';
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    render();
    syncStatus(`${game.preset.label} preview`, previewInfo(game.preset), 'setup');
    syncControls();
  }

  function beginGameFromUi() {
    stopPlayback();
    game = beginGame(selectedPreset(), { rng: Math.random });
    currentAnimation = null;
    eventQueue = [];
    eventIndex = 0;
    stepPaused = false;
    game.phase = 'ready';
    render();
    syncStatus(`${game.preset.label} game seed`, 'use arrow keys to slide', 'ready');
    syncControls();
    if (refs.canvas) refs.canvas.focus();
  }

  function handleKeydown(event) {
    const dir = DIR_FROM_KEY[event.key];
    if (!Number.isInteger(dir)) return;
    if (!canAcceptMove()) return;
    event.preventDefault();
    playRound(dir);
  }

  function handleDirectionalButton(button) {
    const dir = DIR_FROM_NAME[button.getAttribute('data-move-dir')];
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

  function playRound(dir) {
    const result = simulateRound(game, dir, { rng: Math.random, spawn: true });
    if (!result.changed) {
      if (result.debugMessages && result.debugMessages.length) {
        game.debugMessage = result.debugMessages[0];
        syncStatus('push-chain debug', result.debugMessages[0], 'debug');
        render();
        return;
      }
      if (isGameOver(game)) {
        game.phase = 'gameover';
        syncStatus('game over', 'no empty tile and no changing move', 'over');
        syncControls();
        render();
        return;
      }
      syncStatus('no move', 'board unchanged', game.phase === 'gameover' ? 'over' : 'ready');
      render();
      return;
    }
    game.round += 1;
    eventQueue = result.events;
    eventIndex = 0;
    const step = isStepMode();
    stepPaused = step;
    game.phase = step ? 'paused' : 'animating';
    syncStatus(`round ${game.round}: ${dirLabel(dir)}`, `${eventQueue.length} event${eventQueue.length === 1 ? '' : 's'}`, step ? 'step' : 'moving');
    syncControls();
    if (step) {
      render();
      return;
    }
    playNextEvent();
  }

  function playNextStep() {
    if (!eventQueue.length || currentAnimation) return;
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
    if (isGameOver(game)) {
      game.phase = 'gameover';
      syncStatus('game over', 'no empty tile and no changing move', 'over');
    } else {
      game.phase = 'ready';
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
  }

  function render() {
    if (!refs.canvas || !refs.ctx) return;
    const preset = game ? game.preset : selectedPreset();
    const removed = game ? game.removed : initialRemovedSet(preset);
    const wrap = refs.canvas.parentElement;
    const widthAvailable = Math.max(280, Math.floor(wrap ? wrap.clientWidth : refs.canvas.clientWidth || 720));
    const margin = widthAvailable < 430 ? 18 : 28;
    const dpr = Math.min(Math.max((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 1), 2.5);
    const size = Math.min(Math.max((widthAvailable - margin * 2) / preset.cols, 24), 58);
    const radius = size / 2;
    const logicalWidth = Math.ceil((preset.cols * size) + margin * 2);
    const logicalHeight = Math.ceil((preset.rows * size) + margin * 2);
    refs.canvas.width = Math.max(1, Math.ceil(logicalWidth * dpr));
    refs.canvas.height = Math.max(1, Math.ceil(logicalHeight * dpr));
    refs.canvas.style.aspectRatio = `${logicalWidth} / ${logicalHeight}`;
    refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    geometry = {
      width: logicalWidth,
      height: logicalHeight,
      margin,
      radius,
      size,
      rows: preset.rows,
      cols: preset.cols,
      cells: []
    };

    const ctx = refs.ctx;
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    for (let row = 1; row <= preset.rows; row += 1) {
      for (let col = 1; col <= preset.cols; col += 1) {
        const index = indexOf(row, col, preset.cols);
        geometry.cells[index] = {
          row,
          col,
          x: margin + radius + ((col - 1) * size),
          y: margin + radius + ((row - 1) * size)
        };
        drawTile(ctx, geometry, row, col, removed.has(index));
      }
    }

    drawBackgroundBoundaries(ctx, geometry, preset, removed);
    drawGlueEdges(ctx, geometry, preset);
    drawNumberBoxes(ctx, geometry, game ? game.boxes : []);
    drawAnimationOverlays(ctx, geometry);
    if (game && game.phase === 'gameover') drawGameOverPopup(ctx, geometry, game);
    syncStats();
  }

  function drawTile(ctx, geom, row, col, removed) {
    const cell = geom.cells[indexOf(row, col, geom.cols)];
    const points = squarePoints(cell.x, cell.y, geom.radius * 0.96);
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
        for (let dir = 0; dir < 4; dir += 1) {
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
        else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, move.value, 1);
      });
      return;
    }
    if (event.kind === 'move') {
      const from = geom.cells[event.from];
      const to = geom.cells[event.to];
      if (!from || !to) return;
      if (event.glued) drawGluedMove(ctx, geom, event, progress);
      else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, event.value, 1);
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
        else drawBoxAtPoint(ctx, lerpPoint(from, to, progress), geom.radius, move.value, 1);
      });
      if (progress > 0.68) {
        const pulse = 1 + Math.sin((progress - 0.68) / 0.32 * Math.PI) * 0.18;
        drawBoxAtIndex(ctx, geom, event.to, event.newValue, pulse);
      }
      return;
    }
    if (event.kind === 'explode') {
      drawExplosionFlash(ctx, geom, event.center, progress, event.value);
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
    if (event.kind === 'merge') event.removeBoxIds.forEach((id) => hidden.add(id));
    if (event.kind === 'merge' && !event.targetBoxId) hidden.add(event.boxId);
    if (event.kind === 'spawn') hidden.add(event.boxId);
    return hidden;
  }

  function drawBoxAtIndex(ctx, geom, index, value, scale) {
    const cell = geom.cells[index];
    if (!cell) return;
    drawBoxAtPoint(ctx, cell, geom.radius, value, scale);
  }

  function drawBoxAtPoint(ctx, point, radius, value, scale) {
    const style = refs.boxStyle ? refs.boxStyle.value : 'paper';
    if (style === 'ink') drawInkBox(ctx, point, radius, value, scale);
    else if (style === 'color') drawColorBox(ctx, point, radius, value, scale);
    else drawPaperBox(ctx, point, radius, value, scale);
  }

  function drawGluedMove(ctx, geom, move, progress) {
    const from = geom.cells[move.from];
    const to = geom.cells[move.to];
    if (!from || !to || !move.edge) return;
    const outgoing = dirVector(move.edge.dir, geom.size);
    const incoming = dirVector(move.dir, geom.size);
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

  function drawBoxClippedToTile(ctx, geom, index, point, value) {
    const cell = geom.cells[index];
    if (!cell) return;
    ctx.save();
    clipToTile(ctx, cell, geom.radius * 0.96);
    drawBoxAtPoint(ctx, point, geom.radius, value, 1);
    ctx.restore();
  }

  function clipToTile(ctx, cell, radius) {
    const points = squarePoints(cell.x, cell.y, radius);
    ctx.beginPath();
    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.clip();
  }

  function drawPaperBox(ctx, point, radius, value, scale = 1) {
    const side = radius * 1.24 * scale;
    const x = point.x - side / 2;
    const y = point.y - side / 2;
    ctx.save();
    ctx.fillStyle = '#efe4cb';
    ctx.strokeStyle = '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.04);
    ctx.shadowColor = 'rgba(45,34,22,0.18)';
    ctx.shadowBlur = radius * 0.1;
    ctx.shadowOffsetY = radius * 0.05;
    ctx.fillRect(x, y, side, side);
    ctx.shadowColor = 'transparent';
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, point, radius, value, '#2f2118', scale);
    ctx.restore();
  }

  function drawInkBox(ctx, point, radius, value, scale = 1) {
    const side = radius * 1.18 * scale;
    const x = point.x - side / 2;
    const y = point.y - side / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(255,253,248,0.88)';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1.8, radius * 0.06);
    ctx.fillRect(x, y, side, side);
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, point, radius, value, '#111111', scale);
    ctx.restore();
  }

  function drawColorBox(ctx, point, radius, value, scale = 1) {
    const side = radius * 1.26 * scale;
    const x = point.x - side / 2;
    const y = point.y - side / 2;
    ctx.save();
    ctx.fillStyle = valueColor(value);
    ctx.strokeStyle = value <= 2 ? '#8b6f3e' : '#8b3a2a';
    ctx.lineWidth = Math.max(1.2, radius * 0.045);
    ctx.fillRect(x, y, side, side);
    ctx.strokeRect(x, y, side, side);
    drawBoxText(ctx, point, radius, value, value >= 8 ? '#fffdf8' : '#2f2118', scale);
    ctx.restore();
  }

  function drawBoxText(ctx, point, radius, value, color, scale = 1) {
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.max(12, Math.round(radius * 0.72 * Math.min(1, scale)))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), point.x, point.y + radius * 0.02);
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
    ctx.fillText('game over', geom.width / 2, y + height * 0.36);
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

  function createGameState(presetOrId) {
    const preset = resolvePreset(presetOrId);
    return {
      preset,
      phase: 'setup',
      removed: initialRemovedSet(preset),
      boxes: [],
      nextBoxId: 1,
      score: 0,
      round: 0
    };
  }

  function beginGame(presetOrId, options = {}) {
    const state = createGameState(presetOrId);
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
    const active = new Map(state.boxes.map((box) => [box.id, {
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
      const pushMerges = [];
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
          addExplosionEvents(state, events, result.center, result.value, result.removeBoxIds);
          result.removeBoxIds.forEach((id) => active.delete(id));
          changed = true;
        }
      });
      const moveEvents = [];
      moves.forEach((result) => {
        const boxId = result.boxId || (result.actor && result.actor.id);
        const box = findBox(state, boxId);
        if (!box || state.removed.has(result.transition.index)) {
          if (result.actor) active.delete(result.actor.id);
          return;
        }
        const from = Number.isInteger(result.from)
          ? result.from
          : (result.actor ? result.actor.index : box.index);
        const value = Number.isFinite(result.value)
          ? result.value
          : (result.actor ? result.actor.value : box.value);
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
      if (moveEvents.length) events.push({ kind: 'moveGroup', moves: moveEvents });
      pushMerges.forEach((merge) => addPushedMergeEvent(state, events, merge, mergeLocked, active));
      if (moveEvents.length || pushMerges.length) {
        active.forEach((actor) => {
          actor.waiting = false;
        });
      }
    }

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
        const residentProposal = resident ? byActor.get(resident.id) : null;
        const residentVacates = !!(residentProposal && batchIds.has(resident.id) && willVacate.get(resident.id));
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
    const groups = groupByTarget(proposals);
    groups.forEach((group) => {
      const target = group[0].target;
      const resident = boxAt(state, target);
      const residentProposal = resident ? byActor.get(resident.id) : null;
      const residentVacates = !!(residentProposal && batchIds.has(resident.id) && willVacate.get(resident.id));
      const includeResident = !!(resident && !residentVacates);
      if (group.length > 1) {
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
            removeBoxIds
          });
        });
        return;
      }

      const proposal = group[0];
      if (includeResident) {
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

  function addExplosionEvents(state, events, center, value, removeBoxIds) {
    const centerIds = new Set(removeBoxIds);
    const centerBox = boxAt(state, center);
    if (centerBox) centerIds.add(centerBox.id);
    const large = value > 64;
    const clearIndices = large ? blastNeighborIndices(state, center) : [];
    const clearBoxIds = boxesAtIndices(state, clearIndices).map((box) => box.id);
    events.push({ kind: 'explode', center, value, large });
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
      dir: OPPOSITE[partner.dir],
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
    for (let dir = 0; dir < 4; dir += 1) {
      const next = surfaceSuccessor(state, center, dir);
      if (next && next.index !== center && !state.removed.has(next.index)) out.add(next.index);
    }
    return Array.from(out);
  }

  function isGameOver(state) {
    if (!state || emptyExistingIndices(state).length) return false;
    return [DIRS.E, DIRS.S, DIRS.W, DIRS.N].every((dir) => !simulateRound(state, dir, { spawn: false }).changed);
  }

  function cloneGameState(source) {
    return {
      preset: source.preset,
      phase: source.phase,
      removed: new Set(source.removed),
      boxes: source.boxes.map((box) => ({ id: box.id, index: box.index, value: box.value })),
      nextBoxId: source.nextBoxId,
      score: source.score,
      round: source.round
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

  function findBox(state, id) {
    return state.boxes.find((box) => box.id === id) || null;
  }

  function boxAt(state, index) {
    return state.boxes.find((box) => box.index === index) || null;
  }

  function removeBox(state, id) {
    state.boxes = state.boxes.filter((box) => box.id !== id);
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
    return resolvePreset(refs.select ? refs.select.value : 'torus');
  }

  function resolvePreset(presetOrId) {
    if (presetOrId && typeof presetOrId === 'object') return presetOrId;
    return PRESETS.find((preset) => preset.id === presetOrId) || PRESETS[0];
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
        for (let dir = 0; dir < 4; dir += 1) {
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
    if (refs.statusBadge) refs.statusBadge.textContent = badge || '';
    if (refs.statusLine) refs.statusLine.textContent = status || '';
    if (refs.infoLine) refs.infoLine.textContent = info || '';
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
    if (refs.moveButtons) {
      const disabled = !canAcceptMove();
      refs.moveButtons.forEach((button) => {
        button.disabled = disabled;
      });
    }
  }

  function syncSpeedOutput() {
    if (!refs.speed || !refs.speedValue) return;
    refs.speedValue.textContent = `${refs.speed.value} ms`;
  }

  function eventDuration(event) {
    const base = refs.speed ? Number(refs.speed.value) || 260 : 260;
    if (event.kind === 'explode') return Math.max(120, base * 0.85);
    if (event.kind === 'removeTile' || event.kind === 'clearNumbers') return Math.max(90, base * 0.55);
    if (event.kind === 'spawn') return Math.max(100, base * 0.72);
    return base;
  }

  function isStepMode() {
    return !!(refs.stepMode && refs.stepMode.checked);
  }

  function highestValue(state) {
    return state.boxes.reduce((max, box) => Math.max(max, box.value), 0);
  }

  function existingTileCount(state) {
    return (state.preset.rows * state.preset.cols) - state.removed.size;
  }

  function dirLabel(dir) {
    if (dir === DIRS.E) return 'right';
    if (dir === DIRS.S) return 'down';
    if (dir === DIRS.W) return 'left';
    return 'up';
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
    const points = squarePoints(cell.x, cell.y, geom.radius * 0.96);
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

  function neighbor(row, col, dir, preset) {
    const nextRow = row + OFFSETS[dir][0];
    const nextCol = col + OFFSETS[dir][1];
    if (nextRow < 1 || nextRow > preset.rows || nextCol < 1 || nextCol > preset.cols) return null;
    return { row: nextRow, col: nextCol };
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

  function dirVector(dir, length) {
    return {
      x: OFFSETS[dir][1] * length,
      y: OFFSETS[dir][0] * length
    };
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
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
    PRESETS,
    beginGame,
    blastNeighborIndices,
    cloneGameState,
    createGameState,
    createRng,
    directNeighborIndex,
    emptyExistingIndices,
    indexOf,
    isGameOver,
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
