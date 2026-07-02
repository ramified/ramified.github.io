(() => {
  'use strict';

  const DIRS = { right: 0, down: 1, left: 2, up: 3 };
  const DIR_NAMES = ['E', 'S', 'W', 'N'];
  const OPPOSITE = [2, 3, 0, 1];
  const OFFSETS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const MAX_GLUE_CROSSINGS = 10;
  const MOVE_MS = 65;
  const MERGE_MS = 100;
  const EXPLODE_MS = 230;
  const SPAWN_MS = 170;
  const GLUE_COLORS = ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'];
  const TILE_COLORS = ['#efe4cb', '#e6d2a6', '#d8b071', '#c47f17', '#a8612a', '#b65f5f', '#b23a48', '#8a5aa6', '#6a4c93', '#2f6f9f', '#1f7a8c', '#2f855a'];
  const SPAWN_TABLE = [
    { value: 2, limit: 0.9 },
    { value: 4, limit: 0.99 },
    { value: 8, limit: 0.999 },
    { value: 16, limit: 0.9997 },
    { value: 32, limit: 1 }
  ];

  const SURFACE_PRESETS = [
    {
      id: 'classic-4x4',
      label: '4*4 classic',
      surfaceType: 'Sigma_0,1',
      rows: 4,
      cols: 4,
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    {
      id: 'half-glued',
      label: 'half-glued',
      surfaceType: 'Sigma_1,2',
      rows: 4,
      cols: 4,
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 0, first: { row: 1, col: 1, dir: 3 }, second: { row: 4, col: 3, dir: 1 } },
        { group: 0, first: { row: 1, col: 2, dir: 3 }, second: { row: 4, col: 4, dir: 1 } },
        { group: 1, first: { row: 4, col: 1, dir: 2 }, second: { row: 1, col: 4, dir: 0 } },
        { group: 1, first: { row: 3, col: 1, dir: 2 }, second: { row: 2, col: 4, dir: 0 } }
      ]
    },
    {
      id: 'torus',
      label: 'torus',
      surfaceType: 'M_1',
      rows: 4,
      cols: 4,
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, first: { row: 4, col: 4, dir: 0 }, second: { row: 4, col: 1, dir: 2 } },
        { group: 3, first: { row: 3, col: 4, dir: 0 }, second: { row: 3, col: 1, dir: 2 } },
        { group: 3, first: { row: 2, col: 4, dir: 0 }, second: { row: 2, col: 1, dir: 2 } },
        { group: 3, first: { row: 1, col: 4, dir: 0 }, second: { row: 1, col: 1, dir: 2 } },
        { group: 4, first: { row: 1, col: 3, dir: 3 }, second: { row: 4, col: 3, dir: 1 } },
        { group: 4, first: { row: 1, col: 2, dir: 3 }, second: { row: 4, col: 2, dir: 1 } },
        { group: 4, first: { row: 1, col: 1, dir: 3 }, second: { row: 4, col: 1, dir: 1 } },
        { group: 4, first: { row: 1, col: 4, dir: 3 }, second: { row: 4, col: 4, dir: 1 } }
      ]
    },
    {
      id: 'klein-bottle',
      label: 'Klein bottle',
      surfaceType: 'N_2,0',
      rows: 4,
      cols: 4,
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [
        { group: 3, reversed: true, first: { row: 1, col: 4, dir: 0 }, second: { row: 4, col: 1, dir: 2 } },
        { group: 3, reversed: true, first: { row: 2, col: 4, dir: 0 }, second: { row: 3, col: 1, dir: 2 } },
        { group: 3, reversed: true, first: { row: 3, col: 4, dir: 0 }, second: { row: 2, col: 1, dir: 2 } },
        { group: 3, reversed: true, first: { row: 4, col: 4, dir: 0 }, second: { row: 1, col: 1, dir: 2 } },
        { group: 4, first: { row: 1, col: 3, dir: 3 }, second: { row: 4, col: 3, dir: 1 } },
        { group: 4, first: { row: 1, col: 2, dir: 3 }, second: { row: 4, col: 2, dir: 1 } },
        { group: 4, first: { row: 1, col: 1, dir: 3 }, second: { row: 4, col: 1, dir: 1 } },
        { group: 4, first: { row: 1, col: 4, dir: 3 }, second: { row: 4, col: 4, dir: 1 } }
      ]
    },
    {
      id: 'ramified-cover',
      label: 'ramified cover',
      surfaceType: 'Sigma_2,1',
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
        { group: 0, first: { row: 2, col: 3, dir: 1 }, second: { row: 3, col: 9, dir: 3 } },
        { group: 0, first: { row: 2, col: 4, dir: 1 }, second: { row: 3, col: 8, dir: 3 } },
        { group: 1, first: { row: 3, col: 3, dir: 3 }, second: { row: 2, col: 8, dir: 1 } },
        { group: 1, first: { row: 3, col: 4, dir: 3 }, second: { row: 2, col: 9, dir: 1 } }
      ]
    }
  ];

  const refs = {};
  let state = null;
  let viewModel = null;
  let nextTileId = 1;
  let isAnimating = false;
  let geometry = null;
  let suppressCardToggleUntil = 0;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    collectRefs();
    populateSurfaceSelect();
    bindControls();
    bindCards();
    newGame('torus');
  }

  function collectRefs() {
    refs.canvas = document.getElementById('game-canvas') || document.getElementById('mosaic-canvas');
    refs.ctx = refs.canvas.getContext('2d');
    refs.surfaceSelect = document.getElementById('surface-select');
    refs.newGame = document.getElementById('new-game');
    refs.statusLine = document.getElementById('status-line');
    refs.statusBadge = document.getElementById('status-badge');
    refs.surfaceBadge = document.getElementById('surface-badge');
    refs.surfaceMeta = document.getElementById('surface-meta');
    refs.score = document.getElementById('score-value');
    refs.highest = document.getElementById('highest-value');
    refs.open = document.getElementById('open-value');
    refs.removed = document.getElementById('removed-value');
    refs.moveButtons = Array.from(document.querySelectorAll('[data-move]'));
  }

  function populateSurfaceSelect() {
    refs.surfaceSelect.textContent = '';
    SURFACE_PRESETS.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      refs.surfaceSelect.appendChild(option);
    });
    refs.surfaceSelect.value = 'torus';
  }

  function bindControls() {
    refs.newGame.addEventListener('click', () => newGame(refs.surfaceSelect.value));
    refs.surfaceSelect.addEventListener('change', () => newGame(refs.surfaceSelect.value));
    refs.moveButtons.forEach((button) => {
      button.addEventListener('click', () => slide(button.dataset.move));
    });
    refs.canvas.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', () => render());
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
    if (!side) return;
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

  function handleKeydown(event) {
    const keyToMove = {
      ArrowUp: 'up',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowLeft: 'left'
    };
    const move = keyToMove[event.key];
    if (!move) return;
    event.preventDefault();
    slide(move);
  }

  function newGame(presetId = 'torus', options = {}) {
    if (isAnimating) return;
    const preset = surfacePresetById(presetId) || surfacePresetById('torus') || SURFACE_PRESETS[0];
    state = modelFromPreset(preset);
    viewModel = null;
    nextTileId = 1;
    if (options.spawn !== false) spawnNumbers(state, 2);
    state.status = `${preset.label} ready`;
    state.gameOver = isGameOver(state);
    render();
    refs.canvas.focus({ preventScroll: true });
  }

  function modelFromPreset(preset) {
    const removed = new Set((preset.removedTiles || []).map((tile) => indexFromCoord(tile, preset.cols)));
    const cutEdges = new Set((preset.cutEdges || []).map((edge) => {
      const left = indexFromCoord(edge.left, preset.cols);
      const right = indexFromCoord(edge.right, preset.cols);
      return cutEdgeKey(left, right);
    }));
    const glueMap = new Map();
    (preset.gluedEdges || []).forEach((pair) => {
      const first = boundaryEdgeFromPreset(pair.first, preset.cols);
      const second = boundaryEdgeFromPreset(pair.second, preset.cols);
      if (!first || !second) return;
      const group = Number.isInteger(Number(pair.group)) ? Number(pair.group) : 0;
      glueMap.set(edgeKey(first.index, first.dir), { index: second.index, dir: second.dir, group, reversed: !!pair.reversed });
      glueMap.set(edgeKey(second.index, second.dir), { index: first.index, dir: first.dir, group, reversed: !!pair.reversed });
    });
    return {
      presetId: preset.id,
      label: preset.label,
      surfaceType: preset.surfaceType,
      rows: preset.rows,
      cols: preset.cols,
      removed,
      cutEdges,
      glueMap,
      cells: new Map(),
      score: 0,
      moveCount: 0,
      status: '',
      gameOver: false
    };
  }

  function surfacePresetById(id) {
    return SURFACE_PRESETS.find((preset) => preset.id === id) || null;
  }

  function indexFromCoord(coord, cols) {
    const row = Number(coord && coord.row);
    const col = Number(coord && coord.col);
    return Number.isInteger(row) && Number.isInteger(col) ? (row - 1) * cols + (col - 1) : -1;
  }

  function boundaryEdgeFromPreset(edge, cols) {
    const index = indexFromCoord(edge, cols);
    const dir = normalizeDir(edge && edge.dir);
    return index >= 0 && dir != null ? { index, dir } : null;
  }

  function normalizeDir(dir) {
    const value = Number(dir);
    if (!Number.isInteger(value)) return null;
    return ((value % 4) + 4) % 4;
  }

  function rowOf(model, index) {
    return Math.floor(index / model.cols);
  }

  function colOf(model, index) {
    return index % model.cols;
  }

  function edgeKey(index, dir) {
    return `${index}:${dir}`;
  }

  function cutEdgeKey(left, right) {
    if (!Number.isInteger(left) || !Number.isInteger(right) || left === right) return '';
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function inBounds(model, index) {
    return Number.isInteger(index) && index >= 0 && index < model.rows * model.cols;
  }

  function tileExists(model, index) {
    return inBounds(model, index) && !model.removed.has(index);
  }

  function directNeighbor(model, index, dir) {
    if (!tileExists(model, index)) return null;
    const nextRow = rowOf(model, index) + OFFSETS[dir][0];
    const nextCol = colOf(model, index) + OFFSETS[dir][1];
    if (nextRow < 0 || nextRow >= model.rows || nextCol < 0 || nextCol >= model.cols) return null;
    const nextIndex = nextRow * model.cols + nextCol;
    if (!tileExists(model, nextIndex) || model.cutEdges.has(cutEdgeKey(index, nextIndex))) return null;
    return nextIndex;
  }

  function surfaceSuccessor(model, index, dir) {
    const direct = directNeighbor(model, index, dir);
    if (direct != null) return { index: direct, dir, crossed: false };
    const partner = model.glueMap.get(edgeKey(index, dir));
    if (!partner || !tileExists(model, partner.index)) return null;
    return {
      index: partner.index,
      dir: OPPOSITE[partner.dir],
      crossed: true,
      group: partner.group
    };
  }

  function surfaceNeighborIndices(model, index) {
    const neighbors = new Set();
    for (let dir = 0; dir < 4; dir += 1) {
      const next = surfaceSuccessor(model, index, dir);
      if (next && next.index !== index) neighbors.add(next.index);
    }
    return Array.from(neighbors);
  }

  function cloneModel(source) {
    const clone = {
      presetId: source.presetId,
      label: source.label,
      surfaceType: source.surfaceType,
      rows: source.rows,
      cols: source.cols,
      removed: new Set(source.removed),
      cutEdges: new Set(source.cutEdges),
      glueMap: new Map(),
      cells: new Map(),
      score: source.score,
      moveCount: source.moveCount,
      status: source.status,
      gameOver: source.gameOver
    };
    source.glueMap.forEach((value, key) => clone.glueMap.set(key, { ...value }));
    source.cells.forEach((tile, index) => {
      clone.cells.set(index, { id: tile.id, value: tile.value, merged: false, actorId: null });
    });
    return clone;
  }

  function slide(moveName, options = {}) {
    if (!state || state.gameOver || isAnimating) return false;
    const dir = DIRS[moveName];
    if (dir == null) return false;
    const result = runMove(state, dir);
    if (!result.changed) {
      state.status = 'no movement';
      render();
      return false;
    }
    const shouldAnimate = options.animate !== false && canAnimate();
    if (!shouldAnimate) {
      state = result.model;
      if (options.spawn !== false) result.spawned = spawnNumbers(state, 2).length;
      state.moveCount += 1;
      state.gameOver = isGameOver(state);
      state.status = moveStatus(result);
      render();
      return true;
    }
    animateRound(result, options.spawn !== false);
    return true;
  }

  function runMove(inputModel, dir) {
    const model = cloneModel(inputModel);
    const result = {
      model,
      changed: false,
      moved: false,
      merges: 0,
      explosions: 0,
      largeExplosions: 0,
      crossings: 0,
      spawned: 0,
      events: []
    };
    const actors = new Map();
    orderedOccupiedIndices(model, dir).forEach((index, orderIndex) => {
      const tile = model.cells.get(index);
      if (!tile) return;
      const actor = { id: orderIndex + 1, index, value: tile.value, dir, k: 0, order: orderIndex, active: true, merged: false };
      actors.set(actor.id, actor);
      model.cells.set(index, { id: tile.id, value: tile.value, merged: false, actorId: actor.id });
    });
    const queue = Array.from(actors.keys());
    while (queue.length) {
      queue.sort((leftId, rightId) => {
        const left = actors.get(leftId);
        const right = actors.get(rightId);
        if (!left || !right) return 0;
        return left.k - right.k || left.order - right.order;
      });
      const actor = actors.get(queue.shift());
      if (actor && actor.active) processActor(model, actor, actors, queue, result);
    }
    stripActorIds(model);
    return result;
  }

  function orderedOccupiedIndices(model, dir) {
    return Array.from(model.cells.keys()).sort((left, right) => {
      const leftRow = rowOf(model, left);
      const rightRow = rowOf(model, right);
      const leftCol = colOf(model, left);
      const rightCol = colOf(model, right);
      if (dir === DIRS.right) return rightCol - leftCol || leftRow - rightRow;
      if (dir === DIRS.left) return leftCol - rightCol || leftRow - rightRow;
      if (dir === DIRS.down) return rightRow - leftRow || leftCol - rightCol;
      return leftRow - rightRow || leftCol - rightCol;
    });
  }

  function processActor(model, actor, actors, queue, result) {
    while (actor.active) {
      const currentTile = model.cells.get(actor.index);
      if (!currentTile || currentTile.actorId !== actor.id || currentTile.value !== actor.value) {
        actor.active = false;
        return;
      }
      const next = surfaceSuccessor(model, actor.index, actor.dir);
      if (!next) {
        actor.active = false;
        return;
      }
      if (next.crossed && actor.k + 1 > MAX_GLUE_CROSSINGS) {
        explodeAt(model, actor.index, actor.value, [actor.id], actors, result);
        return;
      }
      const destination = model.cells.get(next.index);
      if (!destination) {
        moveActorTo(model, actor, next, result);
        if (next.crossed) {
          queue.push(actor.id);
          return;
        }
        continue;
      }
      if (destination.value === actor.value && !destination.merged && !actor.merged) {
        mergeActorInto(model, actor, destination, next.index, actors, result);
        return;
      }
      if (destination.value !== actor.value) {
        explodeAt(model, next.index, Math.min(actor.value, destination.value), [actor.id, destination.actorId], actors, result);
        return;
      }
      actor.active = false;
      return;
    }
  }

  function moveActorTo(model, actor, next, result) {
    const current = model.cells.get(actor.index);
    const from = actor.index;
    model.cells.delete(from);
    actor.index = next.index;
    actor.dir = next.dir;
    if (next.crossed) actor.k += 1;
    model.cells.set(actor.index, { id: current ? current.id : nextTileId++, value: actor.value, merged: actor.merged, actorId: actor.id });
    result.changed = true;
    result.moved = true;
    if (next.crossed) result.crossings += 1;
    result.events.push({ type: 'move', from, to: actor.index, value: actor.value, crossed: !!next.crossed });
  }

  function mergeActorInto(model, actor, destination, destinationIndex, actors, result) {
    const from = actor.index;
    model.cells.delete(from);
    actor.active = false;
    if (destination.actorId != null) {
      const destinationActor = actors.get(destination.actorId);
      if (destinationActor) destinationActor.active = false;
    }
    const mergedValue = destination.value * 2;
    model.cells.set(destinationIndex, { id: destination.id || nextTileId++, value: mergedValue, merged: true, actorId: null });
    model.score += mergedValue;
    result.changed = true;
    result.merges += 1;
    result.events.push({ type: 'merge', from, to: destinationIndex, value: actor.value, resultValue: mergedValue });
  }

  function explodeAt(model, centerIndex, power, actorIds, actors, result) {
    const neighbors = power > 64 ? surfaceNeighborIndices(model, centerIndex) : [];
    const affected = [centerIndex, ...neighbors];
    actorIds.forEach((id) => clearActorNumber(model, id, actors));
    clearNumberAt(model, centerIndex, actors);
    model.removed.add(centerIndex);
    if (power > 64) {
      neighbors.forEach((index) => clearNumberAt(model, index, actors));
      result.largeExplosions += 1;
    }
    result.changed = true;
    result.explosions += 1;
    result.events.push({ type: 'explode', center: centerIndex, power, large: power > 64, affected });
  }

  function clearActorNumber(model, actorId, actors) {
    if (actorId == null) return;
    const actor = actors.get(actorId);
    if (!actor) return;
    actor.active = false;
    const current = model.cells.get(actor.index);
    if (current && current.actorId === actorId) model.cells.delete(actor.index);
  }

  function clearNumberAt(model, index, actors) {
    const tile = model.cells.get(index);
    if (tile && tile.actorId != null) {
      const actor = actors.get(tile.actorId);
      if (actor) actor.active = false;
    }
    model.cells.delete(index);
  }

  function stripActorIds(model) {
    model.cells.forEach((tile, index) => model.cells.set(index, { id: tile.id, value: tile.value, merged: false, actorId: null }));
  }

  function spawnNumbers(model, requestedCount) {
    const spawned = [];
    for (let count = 0; count < requestedCount; count += 1) {
      const empty = emptyExistingIndices(model);
      if (!empty.length) break;
      const index = empty[Math.floor(Math.random() * empty.length)];
      const tile = { id: nextTileId++, value: randomSpawnValue(), merged: false, actorId: null };
      model.cells.set(index, tile);
      spawned.push({ index, value: tile.value });
    }
    return spawned;
  }

  function randomSpawnValue() {
    const roll = Math.random();
    for (const entry of SPAWN_TABLE) {
      if (roll < entry.limit) return entry.value;
    }
    return 32;
  }

  function emptyExistingIndices(model) {
    const empty = [];
    for (let index = 0; index < model.rows * model.cols; index += 1) {
      if (tileExists(model, index) && !model.cells.has(index)) empty.push(index);
    }
    return empty;
  }

  function isGameOver(model) {
    if (emptyExistingIndices(model).length > 0) return false;
    return ![DIRS.right, DIRS.down, DIRS.left, DIRS.up].some((dir) => runMove(model, dir).changed);
  }

  function moveStatus(result) {
    const parts = [];
    if (result.merges) parts.push(`${result.merges} merge${result.merges === 1 ? '' : 's'}`);
    if (result.explosions) parts.push(`${result.explosions} explosion${result.explosions === 1 ? '' : 's'}`);
    if (result.crossings) parts.push(`${result.crossings} crossing${result.crossings === 1 ? '' : 's'}`);
    if (!parts.length && result.moved) parts.push('moved');
    if (result.spawned) parts.push(`${result.spawned} spawned`);
    if (result.model.gameOver) parts.push('game over');
    return parts.join(', ');
  }

  async function animateRound(result, shouldSpawn) {
    isAnimating = true;
    setControlsDisabled(true);
    try {
      const display = cloneModel(state);
      viewModel = display;
      state.status = 'moving...';
      updateControls();
      for (const event of result.events) {
        await animateEvent(display, event);
        applyDisplayEvent(display, event);
        drawScene(display);
      }
      state = result.model;
      let spawned = [];
      if (shouldSpawn) spawned = spawnNumbers(state, 2);
      result.spawned = spawned.length;
      state.moveCount += 1;
      state.gameOver = isGameOver(state);
      state.status = moveStatus(result);
      viewModel = state;
      if (spawned.length) await animateSpawn(state, spawned);
    } catch (error) {
      console.error(error);
      state = result.model;
      state.status = 'animation skipped';
    } finally {
      viewModel = null;
      isAnimating = false;
      setControlsDisabled(false);
      render();
    }
  }

  function animateEvent(display, event) {
    const duration = event.type === 'explode' ? EXPLODE_MS : (event.type === 'merge' ? MERGE_MS : MOVE_MS);
    return animate(duration, (progress) => {
      if (event.type === 'explode') {
        drawScene(display, { explosion: { index: event.center, progress, large: event.large, affected: event.affected } });
      } else {
        drawScene(display, {
          hidden: new Set([event.from]),
          moving: { from: event.from, to: event.to, value: event.value, progress, merge: event.type === 'merge' }
        });
      }
    });
  }

  function animateSpawn(model, spawned) {
    return animate(SPAWN_MS, (progress) => {
      drawScene(model, { spawning: spawned.map((entry) => ({ ...entry, progress })) });
    });
  }

  function animate(duration, drawFrame) {
    if (!canAnimate()) {
      drawFrame(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = () => {
        const now = performance.now();
        const progress = canAnimate() ? Math.min(1, (now - start) / duration) : 1;
        drawFrame(easeInOut(progress));
        if (progress < 1) scheduleFrame(frame);
        else resolve();
      };
      scheduleFrame(frame);
    });
  }

  function canAnimate() {
    return !(document.hidden || document.visibilityState === 'hidden');
  }

  function scheduleFrame(callback) {
    if (typeof window.setTimeout === 'function') {
      window.setTimeout(callback, 16);
      return;
    }
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
      return;
    }
    callback();
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function applyDisplayEvent(model, event) {
    if (event.type === 'move') {
      const tile = model.cells.get(event.from);
      model.cells.delete(event.from);
      model.cells.set(event.to, { id: tile ? tile.id : nextTileId++, value: event.value, merged: false, actorId: null });
    } else if (event.type === 'merge') {
      const destination = model.cells.get(event.to);
      model.cells.delete(event.from);
      model.cells.set(event.to, { id: destination ? destination.id : nextTileId++, value: event.resultValue, merged: false, actorId: null });
    } else if (event.type === 'explode') {
      event.affected.forEach((index) => model.cells.delete(index));
      model.removed.add(event.center);
    }
  }

  function setControlsDisabled(disabled) {
    refs.newGame.disabled = disabled;
    refs.surfaceSelect.disabled = disabled;
    refs.moveButtons.forEach((button) => { button.disabled = disabled; });
  }

  function render() {
    if (!state) return;
    resizeCanvas();
    updateControls();
    drawScene(viewModel || state);
  }

  function resizeCanvas() {
    const wrap = refs.canvas.parentElement;
    const cssWidth = Math.max(280, Math.floor(wrap ? wrap.clientWidth : refs.canvas.clientWidth || 640));
    const cssHeight = Math.max(220, Math.round(cssWidth * state.rows / state.cols));
    const ratio = window.devicePixelRatio || 1;
    const nextWidth = Math.round(cssWidth * ratio);
    const nextHeight = Math.round(cssHeight * ratio);
    if (refs.canvas.width !== nextWidth || refs.canvas.height !== nextHeight) {
      refs.canvas.width = nextWidth;
      refs.canvas.height = nextHeight;
    }
    refs.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    geometry = computeGeometry(cssWidth, cssHeight, state);
  }

  function computeGeometry(width, height, model) {
    const pad = Math.max(8, Math.min(16, width * 0.025));
    const gap = model.cols > 6 ? 4 : 6;
    const cell = Math.min(
      (width - pad * 2 - gap * (model.cols - 1)) / model.cols,
      (height - pad * 2 - gap * (model.rows - 1)) / model.rows
    );
    const boardWidth = cell * model.cols + gap * (model.cols - 1);
    const boardHeight = cell * model.rows + gap * (model.rows - 1);
    return {
      width,
      height,
      pad,
      gap,
      cell,
      x: (width - boardWidth) / 2,
      y: (height - boardHeight) / 2,
      boardWidth,
      boardHeight
    };
  }

  function updateControls() {
    refs.surfaceSelect.value = state.presetId;
    refs.score.textContent = String(state.score);
    refs.highest.textContent = String(highestTileValue(state));
    refs.open.textContent = String(emptyExistingIndices(state).length);
    refs.removed.textContent = String(state.removed.size);
    refs.statusLine.textContent = state.status || '';
    refs.statusBadge.textContent = state.gameOver ? 'game over' : (isAnimating ? 'moving' : 'ready');
    refs.surfaceBadge.textContent = state.surfaceType;
    refs.surfaceMeta.textContent = `${state.label}, ${state.rows}x${state.cols}, ${state.surfaceType}`;
  }

  function drawScene(model, overlay = {}) {
    if (!geometry) resizeCanvas();
    const ctx = refs.ctx;
    ctx.clearRect(0, 0, geometry.width, geometry.height);
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, geometry.width, geometry.height);
    drawBoardBackground(ctx, model);
    drawEdges(ctx, model);
    drawTiles(ctx, model, overlay);
    if (overlay.explosion) drawExplosion(ctx, overlay.explosion);
    if (overlay.moving) drawMovingTile(ctx, overlay.moving);
    if (overlay.spawning) overlay.spawning.forEach((entry) => drawSpawnTile(ctx, model, entry));
  }

  function drawBoardBackground(ctx, model) {
    ctx.save();
    ctx.fillStyle = 'rgba(216, 208, 196, 0.22)';
    roundRect(ctx, geometry.x - 8, geometry.y - 8, geometry.boardWidth + 16, geometry.boardHeight + 16, 4);
    ctx.fill();
    for (let index = 0; index < model.rows * model.cols; index += 1) {
      const rect = cellRect(index);
      if (tileExists(model, index)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.74)';
        ctx.strokeStyle = 'rgba(216, 208, 196, 0.9)';
        ctx.lineWidth = 1;
        roundRect(ctx, rect.x, rect.y, rect.size, rect.size, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(139, 58, 42, 0.08)';
        ctx.strokeStyle = 'rgba(139, 58, 42, 0.38)';
        ctx.setLineDash([4, 4]);
        roundRect(ctx, rect.x, rect.y, rect.size, rect.size, 3);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function drawEdges(ctx, model) {
    ctx.save();
    for (let index = 0; index < model.rows * model.cols; index += 1) {
      if (!tileExists(model, index)) continue;
      for (let dir = 0; dir < 4; dir += 1) {
        const glue = model.glueMap.get(edgeKey(index, dir));
        if (glue) drawEdgeMarker(ctx, index, dir, glueColor(glue.group), 0.78);
        else if (hasCutEdgeInDirection(model, index, dir)) drawEdgeMarker(ctx, index, dir, '#8b3a2a', 0.42);
      }
    }
    ctx.restore();
  }

  function drawTiles(ctx, model, overlay) {
    const hidden = overlay.hidden || new Set();
    model.cells.forEach((tile, index) => {
      if (hidden.has(index)) return;
      const spawning = overlay.spawning && overlay.spawning.find((entry) => entry.index === index);
      drawNumberTile(ctx, index, tile.value, spawning ? 0.62 + 0.38 * spawning.progress : 1);
    });
  }

  function drawMovingTile(ctx, moving) {
    const from = cellCenter(moving.from);
    const to = cellCenter(moving.to);
    const x = from.x + (to.x - from.x) * moving.progress;
    const y = from.y + (to.y - from.y) * moving.progress;
    drawNumberTileAt(ctx, x, y, moving.value, moving.merge ? 1 + 0.08 * moving.progress : 1);
  }

  function drawSpawnTile(ctx, model, entry) {
    drawNumberTile(ctx, entry.index, entry.value, 0.25 + 0.75 * entry.progress);
  }

  function drawExplosion(ctx, explosion) {
    const center = cellCenter(explosion.index);
    const radius = geometry.cell * (0.32 + 0.55 * explosion.progress);
    refs.ctx.save();
    refs.ctx.globalAlpha = 1 - explosion.progress * 0.72;
    refs.ctx.fillStyle = explosion.large ? '#8b3a2a' : '#c47f17';
    refs.ctx.beginPath();
    refs.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    refs.ctx.fill();
    if (explosion.large) {
      refs.ctx.strokeStyle = '#8b3a2a';
      refs.ctx.lineWidth = 2;
      explosion.affected.forEach((index) => {
        if (index !== explosion.index) {
          const next = cellCenter(index);
          refs.ctx.beginPath();
          refs.ctx.moveTo(center.x, center.y);
          refs.ctx.lineTo(next.x, next.y);
          refs.ctx.stroke();
        }
      });
    }
    refs.ctx.restore();
  }

  function drawNumberTile(ctx, index, value, scale = 1) {
    const center = cellCenter(index);
    drawNumberTileAt(ctx, center.x, center.y, value, scale);
  }

  function drawNumberTileAt(ctx, x, y, value, scale = 1) {
    const size = geometry.cell * 0.72 * scale;
    ctx.save();
    ctx.fillStyle = tileColor(value);
    ctx.strokeStyle = 'rgba(26, 22, 18, 0.16)';
    ctx.lineWidth = 1;
    roundRect(ctx, x - size / 2, y - size / 2, size, size, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = value >= 128 ? '#fffdf8' : '#1a1612';
    ctx.font = `700 ${Math.max(12, Math.min(24, size * 0.34))}px JetBrains Mono, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y + 1);
    ctx.restore();
  }

  function drawEdgeMarker(ctx, index, dir, color, alpha) {
    const rect = cellRect(index);
    const thickness = Math.max(3, geometry.cell * 0.055);
    const inset = geometry.cell * 0.18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    if (dir === DIRS.right) ctx.fillRect(rect.x + rect.size - thickness, rect.y + inset, thickness, rect.size - inset * 2);
    if (dir === DIRS.left) ctx.fillRect(rect.x, rect.y + inset, thickness, rect.size - inset * 2);
    if (dir === DIRS.up) ctx.fillRect(rect.x + inset, rect.y, rect.size - inset * 2, thickness);
    if (dir === DIRS.down) ctx.fillRect(rect.x + inset, rect.y + rect.size - thickness, rect.size - inset * 2, thickness);
    ctx.restore();
  }

  function cellRect(index) {
    const row = rowOf(state, index);
    const col = colOf(state, index);
    return {
      x: geometry.x + col * (geometry.cell + geometry.gap),
      y: geometry.y + row * (geometry.cell + geometry.gap),
      size: geometry.cell
    };
  }

  function cellCenter(index) {
    const rect = cellRect(index);
    return { x: rect.x + rect.size / 2, y: rect.y + rect.size / 2 };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
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

  function hasCutEdgeInDirection(model, index, dir) {
    if (!tileExists(model, index)) return false;
    const nextRow = rowOf(model, index) + OFFSETS[dir][0];
    const nextCol = colOf(model, index) + OFFSETS[dir][1];
    if (nextRow < 0 || nextRow >= model.rows || nextCol < 0 || nextCol >= model.cols) return false;
    return model.cutEdges.has(cutEdgeKey(index, nextRow * model.cols + nextCol));
  }

  function glueColor(group) {
    const index = Number.isInteger(Number(group)) ? Number(group) : 0;
    return GLUE_COLORS[((index % GLUE_COLORS.length) + GLUE_COLORS.length) % GLUE_COLORS.length];
  }

  function tileColor(value) {
    const index = Math.max(0, Math.min(TILE_COLORS.length - 1, Math.round(Math.log2(Math.max(2, value))) - 1));
    return TILE_COLORS[index];
  }

  function highestTileValue(model) {
    let highest = 0;
    model.cells.forEach((tile) => {
      highest = Math.max(highest, tile.value);
    });
    return highest;
  }

  function snapshot(model = state) {
    return {
      presetId: model.presetId,
      rows: model.rows,
      cols: model.cols,
      score: model.score,
      highest: highestTileValue(model),
      openTiles: emptyExistingIndices(model).length,
      removedTiles: model.removed.size,
      gameOver: model.gameOver,
      cells: Array.from(model.cells.entries()).map(([index, tile]) => ({
        index,
        row: rowOf(model, index) + 1,
        col: colOf(model, index) + 1,
        value: tile.value
      })).sort((left, right) => left.index - right.index)
    };
  }

  function setCellsForTest(entries) {
    if (!state || isAnimating) return;
    state.cells.clear();
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const index = entry.index != null ? Number(entry.index) : indexFromCoord(entry, state.cols);
      const value = Number(entry.value);
      if (!tileExists(state, index) || !Number.isFinite(value) || value <= 0) return;
      state.cells.set(index, { id: nextTileId++, value: Math.trunc(value), merged: false, actorId: null });
    });
    state.score = 0;
    state.gameOver = isGameOver(state);
    state.status = 'test position';
    render();
  }

  function successorForPreset(presetId, row, col, dirName) {
    const preset = surfacePresetById(presetId);
    if (!preset) return null;
    const model = modelFromPreset(preset);
    const dir = typeof dirName === 'string' ? DIRS[dirName] : normalizeDir(dirName);
    const index = indexFromCoord({ row, col }, model.cols);
    if (dir == null || !tileExists(model, index)) return null;
    const next = surfaceSuccessor(model, index, dir);
    if (!next) return null;
    return {
      row: rowOf(model, next.index) + 1,
      col: colOf(model, next.index) + 1,
      index: next.index,
      dir: next.dir,
      dirName: DIR_NAMES[next.dir],
      crossed: next.crossed
    };
  }

  window.RamifiedMinigames = {
    presets: SURFACE_PRESETS.map((preset) => ({ id: preset.id, label: preset.label })),
    newGame,
    slide,
    getState: () => snapshot(),
    setCellsForTest,
    _test: {
      runMove: (moveName) => {
        const dir = DIRS[moveName];
        if (dir == null) return null;
        const result = runMove(state, dir);
        return {
          changed: result.changed,
          moved: result.moved,
          merges: result.merges,
          explosions: result.explosions,
          largeExplosions: result.largeExplosions,
          crossings: result.crossings,
          events: result.events,
          state: snapshot(result.model)
        };
      },
      successor: successorForPreset,
      spawn: (count = 2) => {
        const spawned = spawnNumbers(state, Math.max(0, Math.trunc(Number(count) || 0)));
        state.gameOver = isGameOver(state);
        state.status = `${spawned.length} spawned`;
        render();
        return { spawned: spawned.length, state: snapshot() };
      },
      spawnValue: randomSpawnValue
    }
  };
})();
