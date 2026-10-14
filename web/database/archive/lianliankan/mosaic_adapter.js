(function(root, factory) {
  const engine = root && root.Lianliankan
    ? root.Lianliankan
    : (typeof module !== 'undefined' && module.exports ? require('./lianliankan_engine.js') : null);
  const api = factory(engine);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LianliankanMosaicAdapter = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function(engine) {
  'use strict';

  if (!engine) throw new Error('Lianliankan engine must load before the Mosaic adapter');

  function firstArray(source, keys) {
    for (const key of keys) {
      if (Array.isArray(source && source[key])) return source[key];
    }
    return [];
  }

  function dimensions(preset) {
    let rows = Number(preset && preset.rows);
    let cols = Number(preset && preset.cols);
    if ((!Number.isInteger(rows) || !Number.isInteger(cols)) && preset && typeof preset.size === 'string') {
      const match = preset.size.match(/^\s*(\d+)\s*[xX*]\s*(\d+)\s*$/);
      if (match) {
        rows = Number(match[1]);
        cols = Number(match[2]);
      }
    }
    if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
      throw new TypeError('A normalized Mosaic preset requires rows and cols (or size like 6x8)');
    }
    return { rows: rows, cols: cols };
  }

  function normalizedPresetData(preset) {
    if (!preset || typeof preset !== 'object') throw new TypeError('A Mosaic preset object is required');
    const lattice = String(preset.lattice || 'square').toLowerCase();
    if (lattice !== 'square' && lattice !== 'hexagonal') {
      throw new Error('Lianliankan requires a square or hexagonal Mosaic lattice');
    }
    const size = dimensions(preset);
    const background = preset.backgroundSpace && typeof preset.backgroundSpace === 'object'
      ? preset.backgroundSpace
      : {};
    return {
      lattice: lattice,
      rows: size.rows,
      cols: size.cols,
      removedTiles: firstArray(preset, ['removedTiles', 'backgroundRemovedTiles', 'removed']).length
        ? firstArray(preset, ['removedTiles', 'backgroundRemovedTiles', 'removed'])
        : firstArray(background, ['removedTiles', 'removed']),
      cutEdges: firstArray(preset, ['cutEdges', 'backgroundCutEdges', 'cuts']).length
        ? firstArray(preset, ['cutEdges', 'backgroundCutEdges', 'cuts'])
        : firstArray(background, ['cutEdges', 'cuts']),
      gluedEdges: firstArray(preset, ['gluedEdges', 'backgroundGluedEdges', 'glue']).length
        ? firstArray(preset, ['gluedEdges', 'backgroundGluedEdges', 'glue'])
        : firstArray(background, ['gluedEdges', 'glue'])
    };
  }

  function createGameFromMosaicPreset(preset, options) {
    const config = options || {};
    const normalized = normalizedPresetData(preset);
    return engine.createGame({
      lattice: normalized.lattice,
      rows: normalized.rows,
      cols: normalized.cols,
      removedTiles: normalized.removedTiles,
      cutEdges: normalized.cutEdges,
      gluedEdges: normalized.gluedEdges,
      tiles: config.tiles,
      initiallyEmpty: config.initiallyEmpty,
      generateTiles: config.generateTiles,
      symbols: config.symbols,
      rng: config.rng,
      ensureInitialMatch: config.ensureInitialMatch,
      maxShuffleAttempts: config.maxShuffleAttempts
    });
  }

  function tileArray(game) {
    return game.board.cells.map(function(cell) {
      if (!cell.tile) return null;
      const tile = { id: cell.tile.id, glyph: cell.tile.glyph };
      if (cell.tile.matchKey != null && cell.tile.matchKey !== cell.tile.id) tile.matchKey = cell.tile.matchKey;
      return tile;
    });
  }

  function tileEntries(game) {
    return game.board.cells.filter(function(cell) { return !!cell.tile; }).map(function(cell) {
      const entry = {
        index: cell.index,
        row: cell.row,
        col: cell.col,
        id: cell.tile.id,
        glyph: cell.tile.glyph
      };
      if (cell.tile.matchKey != null && cell.tile.matchKey !== cell.tile.id) entry.matchKey = cell.tile.matchKey;
      return entry;
    });
  }

  function decorateSharedState(game, preset) {
    game.gameMode = 'lianliankan';
    game.preset = preset;
    game.removed = new Set(game.board.cells.filter(function(cell) {
      return !cell.playable;
    }).map(function(cell) {
      return cell.index;
    }));
    game.boxes = [];
    game.newBoxIds = new Set();
    game.nextBoxId = 1;
    game.score = game.matches || 0;
    game.round = game.matches || 0;
    game.ending = '';
    game.resultDismissed = false;
    game.recordMoves = [];
    game.debugMessage = '';
    return game;
  }

  function syncSharedState(game) {
    if (!game) return game;
    game.score = game.matches || 0;
    game.round = game.matches || 0;
    return game;
  }

  function createSharedState(preset, options) {
    return decorateSharedState(createGameFromMosaicPreset(preset, options), preset);
  }

  function clonePlain(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function cloneSharedState(source) {
    if (!source || !source.board || !source.preset) throw new TypeError('A shared Lianliankan state is required');
  const cloned = createSharedState(source.preset, {
    tiles: tileArray(source),
    generateTiles: false,
    ensureInitialMatch: false
    });
    cloned.phase = source.phase;
    cloned.selectedIndex = Number.isInteger(source.selectedIndex) ? source.selectedIndex : null;
    cloned.pendingMatch = clonePlain(source.pendingMatch);
    cloned.matches = Math.max(0, Number(source.matches) || 0);
    cloned.refreshes = Math.max(0, Number(source.refreshes) || 0);
    cloned.resultDismissed = !!source.resultDismissed;
    cloned.recordMoves = clonePlain(source.recordMoves) || [];
    cloned.debugMessage = String(source.debugMessage || '');
    return syncSharedState(cloned);
  }

  function entryIndex(entry, rows, cols) {
    if (Number.isInteger(entry && entry.index)) return entry.index;
    const row = Number(entry && entry.row);
    const col = Number(entry && entry.col);
    if (
      !Number.isInteger(row)
      || !Number.isInteger(col)
      || row < 1
      || row > rows
      || col < 1
      || col > cols
    ) return -1;
    return engine.indexOf(row, col, cols);
  }

  function stateFromSnapshot(preset, payload) {
    const normalized = normalizedPresetData(preset);
    const tiles = Array(normalized.rows * normalized.cols).fill(null);
    const used = new Set();
    (Array.isArray(payload && payload.tiles) ? payload.tiles : []).forEach(function(entry) {
      const index = entryIndex(entry, normalized.rows, normalized.cols);
      if (index < 0 || index >= tiles.length) throw new RangeError('Lianliankan tile is outside the board');
      if (used.has(index)) throw new Error('Lianliankan status contains duplicate tile positions');
      used.add(index);
      const id = String(entry && entry.id || '');
      const glyph = entry && entry.glyph != null ? entry.glyph : id;
      tiles[index] = { id: id, glyph: String(glyph) };
      if (entry && entry.matchKey != null && String(entry.matchKey)) tiles[index].matchKey = String(entry.matchKey);
      if (!tiles[index].id) throw new TypeError('Lianliankan tiles require a non-empty id');
    });
    const state = createSharedState(preset, {
      tiles: tiles,
      generateTiles: false,
      ensureInitialMatch: false
    });
    used.forEach(function(index) {
      if (!state.board.cells[index].playable) throw new Error('Lianliankan tile occupies a removed cell');
    });
    state.matches = Math.max(0, Number(payload && payload.matches) || 0);
    state.refreshes = Math.max(0, Number(payload && payload.refreshes) || 0);
    state.resultDismissed = !!(payload && payload.resultDismissed);
    const selectedValue = payload && payload.selectedIndex;
    const selected = selectedValue == null || selectedValue === '' ? NaN : Number(selectedValue);
    state.selectedIndex = Number.isInteger(selected)
      && selected >= 0
      && selected < state.board.cells.length
      && !!state.board.cells[selected].tile
      ? selected
      : null;
    if (payload && payload.phase === 'setup') state.phase = 'setup';
    return syncSharedState(state);
  }

  function snapshot(game) {
    return {
      gameMode: 'lianliankan',
      rows: game.board.rows,
      cols: game.board.cols,
      phase: game.phase === 'animating' ? 'ready' : game.phase,
      selectedIndex: game.selectedIndex,
      matches: game.matches,
      refreshes: game.refreshes,
      resultDismissed: !!game.resultDismissed,
      tiles: tileEntries(game)
    };
  }

  function edgeMidpoint(cell, direction, geometry) {
    if (geometry && typeof geometry.edgePoint === 'function') {
      const index = Number.isInteger(cell.index) ? cell.index : geometry.cells.indexOf(cell);
      return geometry.edgePoint(index, direction);
    }
    const radius = Number(cell.radius || (geometry && geometry.radius) || 0);
    const lattice = geometry && geometry.lattice && typeof geometry.lattice === 'object'
      ? geometry.lattice
      : null;
    const hexagonal = !!(lattice && (lattice.shape === 'hex' || lattice.id === 'hexagonal'));
    const sides = hexagonal ? 6 : 4;
    const numericDirection = Number(direction);
    const normalizedDirection = Number.isFinite(numericDirection)
      ? ((Math.trunc(numericDirection) % sides) + sides) % sides
      : 0;
    // Square geometry stores the inradius, while hex geometry stores the
    // circumradius. Convert the latter to the center-to-edge distance.
    const edgeDistance = hexagonal ? radius * Math.cos(Math.PI / 6) : radius;
    if (!hexagonal) {
      const squareOffsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      return {
        x: cell.x + squareOffsets[normalizedDirection][0] * edgeDistance,
        y: cell.y + squareOffsets[normalizedDirection][1] * edgeDistance
      };
    }
    const latticeAngle = lattice && Array.isArray(lattice.angles)
      ? Number(lattice.angles[normalizedDirection])
      : NaN;
    const angle = Number.isFinite(latticeAngle)
      ? latticeAngle
      : normalizedDirection * ((Math.PI * 2) / sides);
    return {
      x: cell.x + Math.cos(angle) * edgeDistance,
      y: cell.y + Math.sin(angle) * edgeDistance
    };
  }

  function pathSegments(path, geometry) {
    if (!path || !Array.isArray(path.transitions) || !geometry || !Array.isArray(geometry.cells)) return [];
    const segments = [];
    path.transitions.forEach(function(transition) {
      const from = geometry.cells[transition.from];
      const to = geometry.cells[transition.to];
      if (!from || !to) return;
      if (transition.kind === 'glued' && transition.sourceEdge && transition.targetEdge) {
        segments.push({
          kind: 'glue-source',
          group: transition.group,
          from: { x: from.x, y: from.y },
          to: edgeMidpoint(from, transition.sourceEdge.dir, geometry)
        });
        segments.push({
          kind: 'glue-target',
          group: transition.group,
          from: edgeMidpoint(to, transition.targetEdge.dir, geometry),
          to: { x: to.x, y: to.y }
        });
      } else {
        segments.push({
          kind: 'direct',
          from: { x: from.x, y: from.y },
          to: { x: to.x, y: to.y }
        });
      }
    });
    return segments;
  }

  return Object.freeze({
    cloneSharedState: cloneSharedState,
    createGameFromMosaicPreset: createGameFromMosaicPreset,
    createSharedState: createSharedState,
    normalizedPresetData: normalizedPresetData,
    pathSegments: pathSegments,
    snapshot: snapshot,
    stateFromSnapshot: stateFromSnapshot,
    syncSharedState: syncSharedState,
    tileArray: tileArray,
    tileEntries: tileEntries
  });
});
