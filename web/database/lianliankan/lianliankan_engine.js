(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Lianliankan = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  'use strict';

  const DIRS = Object.freeze({ E: 0, S: 1, W: 2, N: 3 });
  const DIR_NAMES = Object.freeze(['E', 'S', 'W', 'N']);
  const DIRECTION_ORDER = Object.freeze([DIRS.N, DIRS.E, DIRS.S, DIRS.W]);
  const OFFSETS = Object.freeze([[0, 1], [1, 0], [0, -1], [-1, 0]]);
  const DEFAULT_MAX_SHUFFLE_ATTEMPTS = 50;
  const HIRAGANA_SYMBOLS = Object.freeze([
    ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
    ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
    ['sa', 'さ'], ['shi', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
    ['ta', 'た'], ['chi', 'ち'], ['tsu', 'つ'], ['te', 'て'], ['to', 'と'],
    ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
    ['ha', 'は'], ['hi', 'ひ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
    ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
    ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'], ['ra', 'ら'], ['ri', 'り'],
    ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'], ['wa', 'わ'], ['wo', 'を'], ['n', 'ん']
  ].map(function(entry) {
    return Object.freeze({ id: 'hiragana_' + entry[0], glyph: entry[1] });
  }));

  function positiveInteger(value, label) {
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new TypeError(label + ' must be a positive integer');
    }
    return normalized;
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

  function oppositeDirection(direction) {
    return (normalizeDirection(direction) + 2) % 4;
  }

  function normalizeDirection(value) {
    if (Number.isInteger(value) && value >= 0 && value < 4) return value;
    const name = String(value == null ? '' : value).trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(DIRS, name)) return DIRS[name];
    throw new TypeError('Invalid square-lattice direction: ' + value);
  }

  function normalizeIndex(ref, cols, total) {
    let index = null;
    if (Number.isInteger(ref)) {
      index = ref;
    } else if (ref && Number.isInteger(ref.index)) {
      index = ref.index;
    } else if (ref && Number.isInteger(ref.row) && Number.isInteger(ref.col)) {
      index = indexOf(ref.row, ref.col, cols);
    }
    if (!Number.isInteger(index) || index < 0 || index >= total) {
      throw new RangeError('Cell reference is outside the board');
    }
    return index;
  }

  function normalizeTile(tile) {
    if (tile == null) return null;
    if (typeof tile === 'string') return { id: tile, glyph: tile };
    if (!tile || typeof tile.id !== 'string' || !tile.id) {
      throw new TypeError('A tile requires a non-empty string id');
    }
    return {
      id: tile.id,
      glyph: String(tile.glyph == null ? tile.id : tile.glyph)
    };
  }

  function cloneTile(tile) {
    return tile ? { id: tile.id, glyph: tile.glyph } : null;
  }

  function createBoard(options) {
    const config = options || {};
    const rows = positiveInteger(config.rows, 'rows');
    const cols = positiveInteger(config.cols, 'cols');
    const total = rows * cols;
    const playable = Array(total).fill(true);

    if (Array.isArray(config.playable)) {
      if (config.playable.length !== total) throw new RangeError('playable must contain rows * cols entries');
      config.playable.forEach(function(value, index) { playable[index] = !!value; });
    }
    if (Array.isArray(config.playableIndices)) {
      playable.fill(false);
      config.playableIndices.forEach(function(ref) {
        playable[normalizeIndex(ref, cols, total)] = true;
      });
    }
    (config.removedTiles || []).forEach(function(ref) {
      playable[normalizeIndex(ref, cols, total)] = false;
    });

    const sourceTiles = Array.isArray(config.tiles) ? config.tiles : [];
    if (sourceTiles.length > total) throw new RangeError('tiles cannot exceed rows * cols entries');
    const cells = Array.from({ length: total }, function(_, index) {
      const position = rowCol(index, cols);
      return {
        index: index,
        row: position.row,
        col: position.col,
        playable: playable[index],
        tile: playable[index] ? normalizeTile(sourceTiles[index]) : null
      };
    });

    return { rows: rows, cols: cols, cells: cells };
  }

  function cloneBoard(board) {
    return createBoard({
      rows: board.rows,
      cols: board.cols,
      playable: board.cells.map(function(cell) { return cell.playable; }),
      tiles: board.cells.map(function(cell) { return cloneTile(cell.tile); })
    });
  }

  function normalizeEdge(edge, board) {
    if (!edge || typeof edge !== 'object') throw new TypeError('Glue endpoints must be edge objects');
    const directionValue = Object.prototype.hasOwnProperty.call(edge, 'dir') ? edge.dir : edge.edge;
    return {
      index: normalizeIndex(edge, board.cols, board.cells.length),
      dir: normalizeDirection(directionValue)
    };
  }

  function unorderedPairKey(first, second) {
    return first < second ? first + ':' + second : second + ':' + first;
  }

  function normalizeCutEdge(entry, board) {
    if (!entry || typeof entry !== 'object') throw new TypeError('Cut edges must be objects');
    const firstRef = entry.first || entry.left || entry.a || entry.from;
    const secondRef = entry.second || entry.right || entry.b || entry.to;
    if (firstRef != null && secondRef != null) {
      return unorderedPairKey(
        normalizeIndex(firstRef, board.cols, board.cells.length),
        normalizeIndex(secondRef, board.cols, board.cells.length)
      );
    }
    if (entry.cell != null && entry.dir != null) {
      const source = normalizeIndex(entry.cell, board.cols, board.cells.length);
      const position = rowCol(source, board.cols);
      const offset = OFFSETS[normalizeDirection(entry.dir)];
      const nextRow = position.row + offset[0];
      const nextCol = position.col + offset[1];
      if (nextRow < 1 || nextRow > board.rows || nextCol < 1 || nextCol > board.cols) {
        throw new RangeError('A cut edge requires two in-board cells');
      }
      return unorderedPairKey(source, indexOf(nextRow, nextCol, board.cols));
    }
    throw new TypeError('A cut edge requires two cell references');
  }

  function createSquareTopology(board, options) {
    if (!board || !Array.isArray(board.cells)) throw new TypeError('A board is required');
    const config = options || {};
    const cutEdges = new Set((config.cutEdges || []).map(function(entry) {
      return normalizeCutEdge(entry, board);
    }));
    const glueMap = new Map();
    const gluedEdges = (config.gluedEdges || []).map(function(pair, pairIndex) {
      if (!pair || !pair.first || !pair.second) throw new TypeError('Glue pair requires first and second endpoints');
      const first = normalizeEdge(pair.first, board);
      const second = normalizeEdge(pair.second, board);
      if (!board.cells[first.index].playable || !board.cells[second.index].playable) {
        throw new RangeError('Glue endpoints must belong to playable cells');
      }
      const normalized = {
        group: pair.group == null ? pairIndex : pair.group,
        reversed: !!pair.reversed,
        first: first,
        second: second
      };
      const firstKey = first.index + ':' + first.dir;
      const secondKey = second.index + ':' + second.dir;
      if (firstKey === secondKey) throw new Error('A glue edge cannot be paired with itself');
      if (glueMap.has(firstKey) || glueMap.has(secondKey)) throw new Error('A boundary half-edge can have only one glue partner');
      glueMap.set(firstKey, { edge: second, pair: normalized, pairIndex: pairIndex });
      glueMap.set(secondKey, { edge: first, pair: normalized, pairIndex: pairIndex });
      return normalized;
    });

    function directNeighbor(source, direction) {
      const position = rowCol(source, board.cols);
      const offset = OFFSETS[direction];
      const row = position.row + offset[0];
      const col = position.col + offset[1];
      if (row < 1 || row > board.rows || col < 1 || col > board.cols) return null;
      const destination = indexOf(row, col, board.cols);
      if (!board.cells[destination].playable) return null;
      if (cutEdges.has(unorderedPairKey(source, destination))) return null;
      return destination;
    }

    function nextStep(cellRef, directionValue) {
      const source = normalizeIndex(cellRef, board.cols, board.cells.length);
      if (!board.cells[source].playable) return null;
      const inputDirection = normalizeDirection(directionValue);
      const direct = directNeighbor(source, inputDirection);
      if (direct != null) {
        return {
          kind: 'direct',
          from: source,
          cell: direct,
          inputDirection: inputDirection,
          direction: inputDirection
        };
      }
      const partner = glueMap.get(source + ':' + inputDirection);
      if (!partner || !board.cells[partner.edge.index].playable) return null;
      return {
        kind: 'glued',
        from: source,
        cell: partner.edge.index,
        inputDirection: inputDirection,
        direction: oppositeDirection(partner.edge.dir),
        sourceEdge: { index: source, dir: inputDirection },
        targetEdge: { index: partner.edge.index, dir: partner.edge.dir },
        group: partner.pair.group,
        pairIndex: partner.pairIndex,
        reversed: partner.pair.reversed
      };
    }

    return {
      board: board,
      cutEdges: cutEdges,
      gluedEdges: gluedEdges,
      nextStep: nextStep
    };
  }

  function compareSearchStates(left, right) {
    return left.turns - right.turns
      || left.steps - right.steps
      || left.rank.localeCompare(right.rank)
      || left.serial - right.serial;
  }

  function buildPathResult(state, start, target) {
    const points = [start];
    for (let index = 1; index < state.transitions.length; index += 1) {
      const previous = state.transitions[index - 1];
      const current = state.transitions[index];
      if (current.inputDirection !== previous.direction) points.push(current.from);
    }
    if (points[points.length - 1] !== target) points.push(target);
    return {
      valid: true,
      turns: state.turns,
      steps: state.steps,
      cells: state.cells.slice(),
      points: points,
      transitions: state.transitions.slice()
    };
  }

  function findPath(board, topology, startRef, targetRef, options) {
    const config = options || {};
    const maxTurns = Number.isInteger(config.maxTurns) ? config.maxTurns : 2;
    const start = normalizeIndex(startRef, board.cols, board.cells.length);
    const target = normalizeIndex(targetRef, board.cols, board.cells.length);
    if (start === target || !board.cells[start].playable || !board.cells[target].playable) return null;
    if (!board.cells[start].tile || !board.cells[target].tile) return null;

    let serial = 0;
    const queue = [{
      cell: start,
      direction: null,
      turns: 0,
      steps: 0,
      rank: '',
      serial: serial,
      cells: [start],
      transitions: []
    }];
    const best = new Map();

    while (queue.length) {
      queue.sort(compareSearchStates);
      const current = queue.shift();
      if (current.cell === target) return buildPathResult(current, start, target);

      for (let orderIndex = 0; orderIndex < DIRECTION_ORDER.length; orderIndex += 1) {
        const inputDirection = DIRECTION_ORDER[orderIndex];
        const nextTurns = current.direction == null || inputDirection === current.direction
          ? current.turns
          : current.turns + 1;
        if (nextTurns > maxTurns) continue;
        const step = topology.nextStep(current.cell, inputDirection);
        if (!step) continue;
        const destination = step.cell;
        if (destination !== target && board.cells[destination].tile) continue;

        const nextSteps = current.steps + 1;
        const nextRank = current.rank + String(orderIndex);
        const stateKey = destination + ':' + step.direction + ':' + nextTurns;
        const previous = best.get(stateKey);
        if (previous && (previous.steps < nextSteps || (previous.steps === nextSteps && previous.rank <= nextRank))) {
          continue;
        }
        best.set(stateKey, { steps: nextSteps, rank: nextRank });
        serial += 1;
        queue.push({
          cell: destination,
          direction: step.direction,
          turns: nextTurns,
          steps: nextSteps,
          rank: nextRank,
          serial: serial,
          cells: current.cells.concat(destination),
          transitions: current.transitions.concat({
            kind: step.kind,
            from: current.cell,
            to: destination,
            inputDirection: inputDirection,
            direction: step.direction,
            sourceEdge: step.sourceEdge || null,
            targetEdge: step.targetEdge || null,
            group: step.group,
            pairIndex: step.pairIndex
          })
        });
      }
    }
    return null;
  }

  function findConnection(board, topology, firstRef, secondRef, options) {
    const first = normalizeIndex(firstRef, board.cols, board.cells.length);
    const second = normalizeIndex(secondRef, board.cols, board.cells.length);
    const firstTile = board.cells[first].tile;
    const secondTile = board.cells[second].tile;
    if (!firstTile || !secondTile || firstTile.id !== secondTile.id) return null;
    return findPath(board, topology, first, second, options);
  }

  function occupiedIndices(board) {
    return board.cells.filter(function(cell) { return cell.playable && cell.tile; }).map(function(cell) { return cell.index; });
  }

  function symbolCounts(board) {
    return occupiedIndices(board).reduce(function(counts, index) {
      const id = board.cells[index].tile.id;
      counts[id] = (counts[id] || 0) + 1;
      return counts;
    }, {});
  }

  function symbolCountSignature(board) {
    const counts = symbolCounts(board);
    return Object.keys(counts).sort().map(function(id) { return id + ':' + counts[id]; }).join('|');
  }

  function remainingTileCount(game) {
    return occupiedIndices(game.board).length;
  }

  function findAnyLegalMatch(game) {
    const groups = new Map();
    occupiedIndices(game.board).forEach(function(index) {
      const id = game.board.cells[index].tile.id;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(index);
    });
    for (const indices of groups.values()) {
      if (indices.length < 2) continue;
      for (let first = 0; first < indices.length - 1; first += 1) {
        for (let second = first + 1; second < indices.length; second += 1) {
          const path = findPath(game.board, game.topology, indices[first], indices[second]);
          if (path) return { a: indices[first], b: indices[second], path: path };
        }
      }
    }
    return null;
  }

  function updateGameStatus(game) {
    const remaining = remainingTileCount(game);
    if (remaining === 0) {
      game.phase = 'complete';
      game.availableMatch = null;
      return game.phase;
    }
    game.availableMatch = findAnyLegalMatch(game);
    game.phase = game.availableMatch ? 'ready' : 'deadlock';
    return game.phase;
  }

  function removeMatchedPair(game, first, second, path) {
    const connection = path || findConnection(game.board, game.topology, first, second);
    if (!connection) return null;
    game.board.cells[first].tile = null;
    game.board.cells[second].tile = null;
    game.selectedIndex = null;
    game.pendingMatch = null;
    game.matches += 1;
    updateGameStatus(game);
    return {
      kind: 'removed',
      a: first,
      b: second,
      path: connection,
      phase: game.phase,
      remaining: remainingTileCount(game)
    };
  }

  function handleSelection(game, cellRef, options) {
    const config = options || {};
    if (game.phase === 'animating') return { kind: 'ignored', reason: 'animating' };
    const index = normalizeIndex(cellRef, game.board.cols, game.board.cells.length);
    const cell = game.board.cells[index];
    if (!cell.playable || !cell.tile) return { kind: 'ignored', reason: 'empty' };
    if (game.selectedIndex == null) {
      game.selectedIndex = index;
      return { kind: 'selected', index: index };
    }
    if (game.selectedIndex === index) {
      game.selectedIndex = null;
      return { kind: 'deselected', index: index };
    }

    const previous = game.selectedIndex;
    const previousTile = game.board.cells[previous].tile;
    if (!previousTile || previousTile.id !== cell.tile.id) {
      game.selectedIndex = index;
      return { kind: 'selected', index: index, replaced: previous };
    }
    const path = findConnection(game.board, game.topology, previous, index);
    if (!path) {
      game.selectedIndex = index;
      return { kind: 'blocked', index: index, previous: previous };
    }
    if (config.deferMatch) {
      game.selectedIndex = null;
      game.pendingMatch = { a: previous, b: index, path: path };
      game.phase = 'animating';
      return { kind: 'match', a: previous, b: index, path: path, pending: true };
    }
    return removeMatchedPair(game, previous, index, path);
  }

  function commitPendingMatch(game) {
    if (!game.pendingMatch) return null;
    const pending = game.pendingMatch;
    return removeMatchedPair(game, pending.a, pending.b, pending.path);
  }

  function shuffleArray(values, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    for (let index = values.length - 1; index > 0; index -= 1) {
      const roll = Number(random());
      const bounded = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999999, roll)) : 0;
      const swapIndex = Math.floor(bounded * (index + 1));
      const value = values[index];
      values[index] = values[swapIndex];
      values[swapIndex] = value;
    }
    return values;
  }

  function assignTiles(board, indices, tiles) {
    indices.forEach(function(index, position) {
      board.cells[index].tile = cloneTile(tiles[position]);
    });
  }

  function deterministicRecovery(game) {
    const indices = occupiedIndices(game.board);
    if (indices.length < 2) return null;
    let connectable = null;
    for (let first = 0; first < indices.length - 1 && !connectable; first += 1) {
      for (let second = first + 1; second < indices.length; second += 1) {
        const path = findPath(game.board, game.topology, indices[first], indices[second]);
        if (path) {
          connectable = { a: indices[first], b: indices[second] };
          break;
        }
      }
    }
    if (!connectable) return null;

    const tiles = indices.map(function(index) { return cloneTile(game.board.cells[index].tile); });
    const pairById = new Map();
    tiles.forEach(function(tile) {
      if (!pairById.has(tile.id)) pairById.set(tile.id, []);
      pairById.get(tile.id).push(tile);
    });
    let matchingTiles = null;
    for (const candidates of pairById.values()) {
      if (candidates.length >= 2) {
        matchingTiles = candidates.slice(0, 2);
        break;
      }
    }
    if (!matchingTiles) return null;

    let needed = 2;
    const remainingTiles = tiles.filter(function(tile) {
      if (needed > 0 && tile.id === matchingTiles[0].id) {
        needed -= 1;
        return false;
      }
      return true;
    });
    const otherIndices = indices.filter(function(index) {
      return index !== connectable.a && index !== connectable.b;
    });
    game.board.cells[connectable.a].tile = cloneTile(matchingTiles[0]);
    game.board.cells[connectable.b].tile = cloneTile(matchingTiles[1]);
    assignTiles(game.board, otherIndices, remainingTiles);
    return findAnyLegalMatch(game);
  }

  function refreshGame(game, options) {
    const config = options || {};
    if (game.phase === 'animating') return { success: false, reason: 'animating', attempts: 0 };
    const indices = occupiedIndices(game.board);
    const originalTiles = indices.map(function(index) { return cloneTile(game.board.cells[index].tile); });
    const beforeCounts = symbolCountSignature(game.board);
    const maxAttempts = Number.isInteger(config.maxAttempts)
      ? Math.max(0, config.maxAttempts)
      : DEFAULT_MAX_SHUFFLE_ATTEMPTS;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      assignTiles(game.board, indices, shuffleArray(originalTiles.slice(), config.rng));
      const match = findAnyLegalMatch(game);
      if (match) {
        game.refreshes += 1;
        game.selectedIndex = null;
        game.availableMatch = match;
        game.phase = 'ready';
        return { success: true, attempts: attempt, recovered: false, match: match };
      }
    }

    const recoveredMatch = deterministicRecovery(game);
    if (symbolCountSignature(game.board) !== beforeCounts) {
      throw new Error('Refresh recovery changed symbol counts');
    }
    game.refreshes += 1;
    game.selectedIndex = null;
    game.availableMatch = recoveredMatch;
    game.phase = recoveredMatch ? 'ready' : (indices.length ? 'deadlock' : 'complete');
    return {
      success: !!recoveredMatch,
      attempts: maxAttempts,
      recovered: !!recoveredMatch,
      match: recoveredMatch
    };
  }

  function createPairedTiles(count, symbols) {
    const total = Math.max(0, Math.floor(count / 2) * 2);
    const pack = Array.isArray(symbols) && symbols.length ? symbols.map(normalizeTile) : HIRAGANA_SYMBOLS;
    const tiles = [];
    for (let pair = 0; pair < total / 2; pair += 1) {
      const symbol = pack[pair % pack.length];
      tiles.push(cloneTile(symbol), cloneTile(symbol));
    }
    return tiles;
  }

  function createGame(options) {
    const config = options || {};
    const board = config.board ? cloneBoard(config.board) : createBoard(config);
    const topology = createSquareTopology(board, {
      cutEdges: config.cutEdges || [],
      gluedEdges: config.gluedEdges || []
    });
    const hasTiles = board.cells.some(function(cell) { return !!cell.tile; });
    if (!hasTiles && config.generateTiles !== false) {
      let positions = board.cells.filter(function(cell) { return cell.playable; }).map(function(cell) { return cell.index; });
      if (Array.isArray(config.initiallyEmpty)) {
        const empty = new Set(config.initiallyEmpty.map(function(ref) {
          return normalizeIndex(ref, board.cols, board.cells.length);
        }));
        positions = positions.filter(function(index) { return !empty.has(index); });
      }
      if (positions.length % 2) positions = positions.slice(0, -1);
      const generated = shuffleArray(createPairedTiles(positions.length, config.symbols), config.rng);
      assignTiles(board, positions, generated);
    }

    const game = {
      board: board,
      topology: topology,
      phase: 'ready',
      selectedIndex: null,
      pendingMatch: null,
      availableMatch: null,
      matches: 0,
      refreshes: 0
    };
    updateGameStatus(game);
    if (game.phase === 'deadlock' && config.ensureInitialMatch !== false) {
      refreshGame(game, { rng: config.rng, maxAttempts: config.maxShuffleAttempts });
      game.refreshes = 0;
    }
    return game;
  }

  function createSeededRng(seed) {
    let state = (Number(seed) || 1) >>> 0;
    return function() {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function torusGlue(rowsValue, colsValue) {
    const rows = positiveInteger(rowsValue, 'rows');
    const cols = positiveInteger(colsValue, 'cols');
    const pairs = [];
    for (let row = 1; row <= rows; row += 1) {
      pairs.push({ group: 'horizontal', first: { row: row, col: 1, dir: DIRS.W }, second: { row: row, col: cols, dir: DIRS.E } });
    }
    for (let col = 1; col <= cols; col += 1) {
      pairs.push({ group: 'vertical', first: { row: 1, col: col, dir: DIRS.N }, second: { row: rows, col: col, dir: DIRS.S } });
    }
    return pairs;
  }

  function kleinBottleGlue(rowsValue, colsValue) {
    const rows = positiveInteger(rowsValue, 'rows');
    const cols = positiveInteger(colsValue, 'cols');
    const pairs = [];
    for (let row = 1; row <= rows; row += 1) {
      pairs.push({
        group: 'twisted-horizontal',
        reversed: true,
        first: { row: row, col: 1, dir: DIRS.W },
        second: { row: rows - row + 1, col: cols, dir: DIRS.E }
      });
    }
    for (let col = 1; col <= cols; col += 1) {
      pairs.push({ group: 'vertical', first: { row: 1, col: col, dir: DIRS.N }, second: { row: rows, col: col, dir: DIRS.S } });
    }
    return pairs;
  }

  return Object.freeze({
    DIRS: DIRS,
    DIR_NAMES: DIR_NAMES,
    DIRECTION_ORDER: DIRECTION_ORDER,
    HIRAGANA_SYMBOLS: HIRAGANA_SYMBOLS,
    DEFAULT_MAX_SHUFFLE_ATTEMPTS: DEFAULT_MAX_SHUFFLE_ATTEMPTS,
    cloneBoard: cloneBoard,
    commitPendingMatch: commitPendingMatch,
    createBoard: createBoard,
    createGame: createGame,
    createPairedTiles: createPairedTiles,
    createSeededRng: createSeededRng,
    createSquareTopology: createSquareTopology,
    deterministicRecovery: deterministicRecovery,
    findAnyLegalMatch: findAnyLegalMatch,
    findConnection: findConnection,
    findPath: findPath,
    handleSelection: handleSelection,
    indexOf: indexOf,
    kleinBottleGlue: kleinBottleGlue,
    normalizeDirection: normalizeDirection,
    occupiedIndices: occupiedIndices,
    oppositeDirection: oppositeDirection,
    refreshGame: refreshGame,
    remainingTileCount: remainingTileCount,
    removeMatchedPair: removeMatchedPair,
    rowCol: rowCol,
    shuffleArray: shuffleArray,
    symbolCounts: symbolCounts,
    torusGlue: torusGlue,
    updateGameStatus: updateGameStatus
  });
});
