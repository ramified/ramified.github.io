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
    if (lattice !== 'square') throw new Error('Lianliankan currently requires a square Mosaic lattice');
    const size = dimensions(preset);
    const background = preset.backgroundSpace && typeof preset.backgroundSpace === 'object'
      ? preset.backgroundSpace
      : {};
    return {
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
      rows: normalized.rows,
      cols: normalized.cols,
      removedTiles: normalized.removedTiles,
      cutEdges: normalized.cutEdges,
      gluedEdges: normalized.gluedEdges,
      tiles: config.tiles,
      initiallyEmpty: config.initiallyEmpty,
      symbols: config.symbols,
      rng: config.rng,
      ensureInitialMatch: config.ensureInitialMatch,
      maxShuffleAttempts: config.maxShuffleAttempts
    });
  }

  function snapshot(game) {
    return {
      gameMode: 'lianliankan',
      rows: game.board.rows,
      cols: game.board.cols,
      phase: game.phase,
      selectedIndex: game.selectedIndex,
      matches: game.matches,
      refreshes: game.refreshes,
      tiles: game.board.cells.filter(function(cell) { return !!cell.tile; }).map(function(cell) {
        return {
          row: cell.row,
          col: cell.col,
          id: cell.tile.id,
          glyph: cell.tile.glyph
        };
      })
    };
  }

  function edgeMidpoint(cell, direction, geometry) {
    if (geometry && typeof geometry.edgePoint === 'function') {
      return geometry.edgePoint(cell.index, direction);
    }
    const radius = Number(cell.radius || (geometry && geometry.radius) || 0);
    const offsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    return {
      x: cell.x + offsets[direction][0] * radius,
      y: cell.y + offsets[direction][1] * radius
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
    createGameFromMosaicPreset: createGameFromMosaicPreset,
    normalizedPresetData: normalizedPresetData,
    pathSegments: pathSegments,
    snapshot: snapshot
  });
});
