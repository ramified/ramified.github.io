(function() {
  'use strict';

  const engine = window.Lianliankan;
  const adapter = window.LianliankanMosaicAdapter;
  if (!engine || !adapter) throw new Error('Lianliankan dependencies did not load');

  const refs = {
    canvas: document.getElementById('game-canvas'),
    rows: document.getElementById('rows'),
    cols: document.getElementById('cols'),
    topology: document.getElementById('topology'),
    newGame: document.getElementById('new-game'),
    hint: document.getElementById('hint'),
    refresh: document.getElementById('refresh'),
    statusBand: document.querySelector('.status-band'),
    status: document.getElementById('status'),
    tileCount: document.getElementById('tile-count'),
    matchCount: document.getElementById('match-count'),
    refreshCount: document.getElementById('refresh-count'),
    surfaceName: document.getElementById('surface-name')
  };
  const context = refs.canvas.getContext('2d');
  const TILE_PALETTE = ['#f4cb67', '#7ec6ba', '#e89b8e', '#a8bde2', '#d6a8cf', '#a8cf87', '#edb478', '#8fc5d8'];
  const GLUE_PALETTE = ['#087f72', '#b64848', '#b2830f', '#4d67a8', '#8b5791', '#467c46'];
  const MATCH_DELAY = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
  let game = null;
  let geometry = null;
  let activePath = null;
  let focusIndex = 0;
  let transientStatus = '';
  let transientTimer = null;
  let matchTimer = null;

  function clampInteger(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.max(minimum, Math.min(maximum, parsed));
  }

  function topologyLabel(value) {
    if (value === 'klein') return 'Klein bottle';
    if (value === 'open') return 'Open boundary';
    return 'Torus';
  }

  function glueFor(topology, rows, cols) {
    if (topology === 'torus') return engine.torusGlue(rows, cols);
    if (topology === 'klein') return engine.kleinBottleGlue(rows, cols);
    return [];
  }

  function startGame() {
    if (matchTimer != null) window.clearTimeout(matchTimer);
    if (transientTimer != null) window.clearTimeout(transientTimer);
    matchTimer = null;
    transientTimer = null;
    transientStatus = '';
    activePath = null;
    const rows = clampInteger(refs.rows.value, 2, 12, 6);
    const cols = clampInteger(refs.cols.value, 2, 12, 8);
    const topology = ['open', 'torus', 'klein'].includes(refs.topology.value) ? refs.topology.value : 'torus';
    refs.rows.value = String(rows);
    refs.cols.value = String(cols);
    refs.topology.value = topology;
    refs.canvas.style.aspectRatio = String(Math.max(1.2, Math.min(1.9, cols / rows)));
    game = adapter.createGameFromMosaicPreset({
      id: 'lianliankan-' + topology,
      lattice: 'square',
      rows: rows,
      cols: cols,
      gluedEdges: glueFor(topology, rows, cols)
    }, {
      rng: engine.createSeededRng(Date.now()),
      maxShuffleAttempts: 50
    });
    focusIndex = firstPlayableIndex();
    syncCanvasSize();
    render();
  }

  function firstPlayableIndex() {
    if (!game) return 0;
    const cell = game.board.cells.find(function(candidate) { return candidate.playable; });
    return cell ? cell.index : 0;
  }

  function syncCanvasSize() {
    const rect = refs.canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 960);
    const height = Math.max(260, rect.height || 640);
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (refs.canvas.width !== pixelWidth || refs.canvas.height !== pixelHeight) {
      refs.canvas.width = pixelWidth;
      refs.canvas.height = pixelHeight;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    geometry = createGeometry(width, height);
  }

  function createGeometry(width, height) {
    if (!game) return null;
    const margin = Math.max(22, Math.min(38, Math.min(width, height) * 0.06));
    const size = Math.min(
      (width - margin * 2) / game.board.cols,
      (height - margin * 2) / game.board.rows
    );
    const boardWidth = size * game.board.cols;
    const boardHeight = size * game.board.rows;
    const originX = (width - boardWidth) / 2;
    const originY = (height - boardHeight) / 2;
    const cells = game.board.cells.map(function(cell) {
      return {
        index: cell.index,
        row: cell.row,
        col: cell.col,
        x: originX + (cell.col - 0.5) * size,
        y: originY + (cell.row - 0.5) * size,
        radius: size / 2
      };
    });
    return {
      width: width,
      height: height,
      margin: margin,
      size: size,
      radius: size / 2,
      tileRadius: size * 0.41,
      originX: originX,
      originY: originY,
      boardWidth: boardWidth,
      boardHeight: boardHeight,
      cells: cells
    };
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

  function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    return Math.abs(hash);
  }

  function tileColor(tile) {
    return TILE_PALETTE[hashString(tile.id) % TILE_PALETTE.length];
  }

  function groupColor(group, fallback) {
    const key = String(group == null ? fallback : group);
    return GLUE_PALETTE[hashString(key) % GLUE_PALETTE.length];
  }

  function edgeEndpoints(cell, direction, inset) {
    const radius = geometry.radius - inset;
    if (direction === engine.DIRS.E) return [{ x: cell.x + radius, y: cell.y - radius }, { x: cell.x + radius, y: cell.y + radius }];
    if (direction === engine.DIRS.S) return [{ x: cell.x + radius, y: cell.y + radius }, { x: cell.x - radius, y: cell.y + radius }];
    if (direction === engine.DIRS.W) return [{ x: cell.x - radius, y: cell.y + radius }, { x: cell.x - radius, y: cell.y - radius }];
    return [{ x: cell.x - radius, y: cell.y - radius }, { x: cell.x + radius, y: cell.y - radius }];
  }

  function drawBoard() {
    context.fillStyle = '#e9eeeb';
    context.fillRect(0, 0, geometry.width, geometry.height);

    game.board.cells.forEach(function(cell) {
      const point = geometry.cells[cell.index];
      const gap = Math.max(2, geometry.size * 0.045);
      const x = point.x - geometry.radius + gap;
      const y = point.y - geometry.radius + gap;
      const side = geometry.size - gap * 2;
      roundedRectPath(context, x, y, side, side, Math.min(6, side * 0.1));
      context.fillStyle = cell.playable ? (cell.tile ? tileColor(cell.tile) : '#f7faf8') : '#56605d';
      context.fill();
      context.lineWidth = cell.index === game.selectedIndex ? Math.max(3, geometry.size * 0.06) : 1;
      context.strokeStyle = cell.index === game.selectedIndex ? '#142c27' : '#aab6b1';
      context.stroke();

      if (cell.tile) {
        context.fillStyle = '#17201e';
        context.font = '700 ' + Math.max(17, geometry.size * 0.48) + 'px "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(cell.tile.glyph, point.x, point.y + geometry.size * 0.025);
      }

      if (cell.index === focusIndex && document.activeElement === refs.canvas) {
        context.save();
        context.setLineDash([4, 3]);
        context.lineWidth = 2;
        context.strokeStyle = '#1468a0';
        roundedRectPath(context, x + 3, y + 3, side - 6, side - 6, Math.min(5, side * 0.08));
        context.stroke();
        context.restore();
      }
    });
  }

  function drawGlueEdges() {
    game.topology.gluedEdges.forEach(function(pair, pairIndex) {
      const color = groupColor(pair.group, pairIndex);
      [pair.first, pair.second].forEach(function(edge) {
        const cell = geometry.cells[edge.index];
        const points = edgeEndpoints(cell, edge.dir, 0);
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(points[1].x, points[1].y);
        context.lineCap = 'round';
        context.lineWidth = Math.max(4, geometry.size * 0.08);
        context.strokeStyle = color;
        context.stroke();
      });
    });
  }

  function drawActivePath() {
    if (!activePath) return;
    const segments = adapter.pathSegments(activePath, geometry);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    segments.forEach(function(segment) {
      context.beginPath();
      context.moveTo(segment.from.x, segment.from.y);
      context.lineTo(segment.to.x, segment.to.y);
      context.lineWidth = Math.max(7, geometry.size * 0.13);
      context.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      context.stroke();
      context.lineWidth = Math.max(3, geometry.size * 0.065);
      context.strokeStyle = '#c33f3f';
      context.stroke();
    });
  }

  function currentStatus() {
    if (transientStatus) return transientStatus;
    if (!game) return 'Preparing board';
    if (game.phase === 'animating') return 'Connecting';
    if (game.phase === 'complete') return 'Board complete.';
    if (game.phase === 'deadlock') return 'No more matches are available. Refresh the board to continue.';
    if (game.selectedIndex != null) return 'Tile selected';
    return 'Ready';
  }

  function syncStatus() {
    const remaining = game ? engine.remainingTileCount(game) : 0;
    refs.status.textContent = currentStatus();
    refs.statusBand.dataset.phase = game ? game.phase : 'setup';
    refs.tileCount.textContent = String(remaining);
    refs.matchCount.textContent = String(game ? game.matches : 0);
    refs.refreshCount.textContent = String(game ? game.refreshes : 0);
    refs.surfaceName.textContent = topologyLabel(refs.topology.value);
    refs.refresh.disabled = !game || game.phase === 'animating' || remaining === 0;
    refs.hint.disabled = !game || game.phase === 'animating' || !game.availableMatch;
    refs.canvas.setAttribute('aria-label', 'Lianliankan tile board, ' + remaining + ' tiles remaining, ' + currentStatus());
  }

  function render() {
    if (!game) return;
    if (!geometry) syncCanvasSize();
    context.clearRect(0, 0, geometry.width, geometry.height);
    drawBoard();
    drawGlueEdges();
    drawActivePath();
    syncStatus();
  }

  function setTransientStatus(message, duration) {
    transientStatus = message;
    if (transientTimer != null) window.clearTimeout(transientTimer);
    transientTimer = window.setTimeout(function() {
      transientStatus = '';
      transientTimer = null;
      render();
    }, duration || 800);
  }

  function selectCell(index) {
    if (!game || !game.board.cells[index] || !game.board.cells[index].playable) return;
    activePath = null;
    transientStatus = '';
    const result = engine.handleSelection(game, index, { deferMatch: true });
    if (result.kind === 'match') {
      activePath = result.path;
      render();
      matchTimer = window.setTimeout(function() {
        engine.commitPendingMatch(game);
        activePath = null;
        matchTimer = null;
        render();
      }, MATCH_DELAY);
      return;
    }
    if (result.kind === 'blocked') setTransientStatus('No connection within two turns.', 700);
    render();
  }

  function cellAtPointer(event) {
    if (!geometry) return null;
    const rect = refs.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const col = Math.floor((x - geometry.originX) / geometry.size) + 1;
    const row = Math.floor((y - geometry.originY) / geometry.size) + 1;
    if (row < 1 || row > game.board.rows || col < 1 || col > game.board.cols) return null;
    return engine.indexOf(row, col, game.board.cols);
  }

  function handlePointer(event) {
    const index = cellAtPointer(event);
    if (index == null) return;
    focusIndex = index;
    selectCell(index);
  }

  function moveKeyboardFocus(direction) {
    const current = engine.rowCol(focusIndex, game.board.cols);
    const offsets = {
      left: [0, -1],
      right: [0, 1],
      up: [-1, 0],
      down: [1, 0]
    };
    const offset = offsets[direction];
    const row = Math.max(1, Math.min(game.board.rows, current.row + offset[0]));
    const col = Math.max(1, Math.min(game.board.cols, current.col + offset[1]));
    const next = engine.indexOf(row, col, game.board.cols);
    if (game.board.cells[next].playable) focusIndex = next;
    render();
  }

  function handleKey(event) {
    const directionByKey = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down'
    };
    if (directionByKey[event.key]) {
      event.preventDefault();
      moveKeyboardFocus(directionByKey[event.key]);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCell(focusIndex);
      return;
    }
    if (event.key === 'Escape' && game.selectedIndex != null) {
      game.selectedIndex = null;
      render();
    }
  }

  function showHint() {
    if (!game || game.phase === 'animating') return;
    const match = engine.findAnyLegalMatch(game);
    if (!match) return;
    activePath = match.path;
    setTransientStatus('Hint shown', 800);
    render();
    window.setTimeout(function() {
      if (game.phase !== 'animating') activePath = null;
      render();
    }, 800);
  }

  function refreshRemaining() {
    if (!game || game.phase === 'animating') return;
    activePath = null;
    const result = engine.refreshGame(game, { rng: engine.createSeededRng(Date.now()), maxAttempts: 50 });
    if (!result.success) setTransientStatus('No recoverable match.', 900);
    render();
  }

  refs.newGame.addEventListener('click', startGame);
  refs.hint.addEventListener('click', showHint);
  refs.refresh.addEventListener('click', refreshRemaining);
  refs.canvas.addEventListener('click', handlePointer);
  refs.canvas.addEventListener('keydown', handleKey);
  refs.canvas.addEventListener('focus', render);
  refs.canvas.addEventListener('blur', render);
  window.addEventListener('resize', function() {
    syncCanvasSize();
    render();
  });
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(function() {
      syncCanvasSize();
      render();
    }).observe(refs.canvas);
  }

  startGame();
})();
