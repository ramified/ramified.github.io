(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RamifiedMinigamesAI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const CONTROLLERS = Object.freeze({
    HUMAN: 'human',
    LOCAL_AI: 'local-ai-challenging',
    CHALLENGING: 'local-ai-challenging',
    GOMOKU_AGGRESSIVE: 'local-ai-aggressive',
    HIDDEN: 'hidden'
  });
  const WIN_SCORE = 1000000;
  const TOPOLOGY_CACHE_LIMIT = 8;
  const TRANSPOSITION_LIMIT = 50000;
  const topologyCache = new Map();
  const transpositions = new Map();
  const challengingGomokuTranspositions = new Map();
  const challengingGomokuThreatCache = new Map();
  const CHALLENGING_GOMOKU_CACHE_LIMIT = 60000;

  function sortedNumbers(value) {
    return Array.from(value instanceof Set ? value : (value || [])).map(Number).filter(Number.isInteger).sort((a, b) => a - b);
  }

  function stableValue(value) {
    if (value instanceof Set) return sortedNumbers(value);
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    Object.keys(value).sort().forEach((key) => {
      if (typeof value[key] !== 'function' && value[key] !== undefined) result[key] = stableValue(value[key]);
    });
    return result;
  }

  function boardSignature(state) {
    const preset = state && state.preset || {};
    return JSON.stringify(stableValue({
      gameMode: state && state.gameMode,
      lattice: preset.lattice,
      rows: preset.rows,
      cols: preset.cols,
      removed: sortedNumbers(state && state.removed || preset.removedTiles),
      cutEdges: preset.cutEdges || [],
      gluedEdges: preset.gluedEdges || [],
      gomokuWinLength: preset.gomokuWinLength,
      fallDir: state && state.fallDir,
      holes: sortedNumbers(state && state.holes),
      jumpRule: state && state.jumpRule,
      camps: state && state.camps,
      playerColors: state && state.playerColors
    }));
  }

  function fnv1a(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function positionHash(state) {
    const pieces = (state.stones || state.tokens || state.marbles || [])
      .map((piece) => `${piece.index}:${piece.color}`).sort().join('|');
    return fnv1a(`${boardSignature(state)}#${state.turn || ''}#${pieces}`).toString(16);
  }

  function connectFourColorCode(color) {
    return color === 'red' ? 1 : (color === 'yellow' ? 2 : 0);
  }

  function connectFourZobristValue(signature, tile, color) {
    return fnv1a(`${signature}#connect-four-piece#${tile}#${color}`);
  }

  function touchLru(map, key, value, limit) {
    if (map.has(key)) map.delete(key);
    map.set(key, value);
    while (map.size > limit) map.delete(map.keys().next().value);
    return value;
  }

  function playableIndices(state) {
    const count = Math.max(0, Number(state.preset.rows) * Number(state.preset.cols));
    const removed = state.removed instanceof Set ? state.removed : new Set(state.removed || []);
    const result = [];
    for (let index = 0; index < count; index += 1) if (!removed.has(index)) result.push(index);
    return result;
  }

  function buildTopology(state, rules) {
    const signature = boardSignature(state);
    if (topologyCache.has(signature)) return touchLru(topologyCache, signature, topologyCache.get(signature), TOPOLOGY_CACHE_LIMIT);
    const directions = rules.directionsForPreset(state.preset);
    const playable = playableIndices(state);
    const successor = new Map();
    const adjacency = new Map(playable.map((index) => [index, []]));
    const reverseAdjacency = new Map(playable.map((index) => [index, []]));
    playable.forEach((index) => {
      directions.forEach((dir) => {
        const next = rules.surfaceSuccessor(state, index, dir);
        successor.set(`${index}:${dir}`, next ? cloneTransition(next) : null);
        if (next && adjacency.has(next.index)) {
          if (!adjacency.get(index).includes(next.index)) adjacency.get(index).push(next.index);
          if (!reverseAdjacency.get(next.index).includes(index)) reverseAdjacency.get(next.index).push(index);
        }
      });
    });
    const topology = {
      signature,
      playable,
      playableSet: new Set(playable),
      directions,
      successor,
      adjacency,
      reverseAdjacency,
      centrality: state.gameMode === 'gomoku' ? graphCentrality(playable, adjacency) : new Map(),
      windowsByLength: new Map(),
      challengingGomokuWindowsByLength: new Map(),
      targetDistances: new Map(),
      connectFourRoutes: null,
      cacheHit: false
    };
    return touchLru(topologyCache, signature, topology, TOPOLOGY_CACHE_LIMIT);
  }

  function cloneTransition(next) {
    return {
      kind: next.kind,
      index: next.index,
      dir: next.dir,
      edge: next.edge ? { ...next.edge } : null,
      transport: next.transport ? { ...next.transport } : null
    };
  }

  function graphCentrality(playable, adjacency) {
    const result = new Map();
    playable.forEach((origin) => {
      const distance = new Map([[origin, 0]]);
      const queue = [origin];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        (adjacency.get(index) || []).forEach((next) => {
          if (distance.has(next)) return;
          distance.set(next, distance.get(index) + 1);
          queue.push(next);
        });
      }
      let total = 0;
      distance.forEach((value) => { total += value; });
      result.set(origin, distance.size > 1 ? (distance.size - 1) / Math.max(1, total) : 0);
    });
    return result;
  }

  function winningWindows(state, topology, rules, length) {
    if (topology.windowsByLength.has(length)) return topology.windowsByLength.get(length);
    const windows = [];
    const seen = new Set();
    const add = (sequence) => {
      if (sequence.length !== length) return;
      const forward = sequence.join(',');
      const reverse = sequence.slice().reverse().join(',');
      const key = forward < reverse ? forward : reverse;
      if (seen.has(key)) return;
      seen.add(key);
      const multiplicity = new Map();
      sequence.forEach((index) => multiplicity.set(index, (multiplicity.get(index) || 0) + 1));
      windows.push({ sequence: sequence.slice(), multiplicity });
    };
    const axisCount = Math.floor(topology.directions.length / 2);
    topology.playable.forEach((start) => {
      for (let dir = 0; dir < axisCount; dir += 1) {
        const sequence = [start];
        let index = start;
        let direction = dir;
        for (let step = 1; step < length; step += 1) {
          const next = topology.successor.get(`${index}:${direction}`);
          if (!next) break;
          sequence.push(next.index);
          index = next.index;
          direction = next.dir;
        }
        add(sequence);
      }
      if (String(state.preset.lattice || 'square').toLowerCase() === 'square' && typeof rules.gomokuDiagonalStepCandidates === 'function') {
        [
          [[0, 1], [1, 0]],
          [[2, 1], [1, 2]]
        ].forEach((orders) => {
          const visit = (index, currentOrders, sequence) => {
            if (sequence.length === length) {
              add(sequence);
              return;
            }
            rules.gomokuDiagonalStepCandidates(state, index, currentOrders).forEach((candidate) => {
              visit(candidate.index, candidate.orders, sequence.concat(candidate.index));
            });
          };
          visit(start, orders, [start]);
        });
      }
    });
    const incident = new Map(topology.playable.map((index) => [index, []]));
    windows.forEach((window, windowIndex) => window.multiplicity.forEach((_count, index) => {
      if (incident.has(index)) incident.get(index).push(windowIndex);
    }));
    const result = { windows, incident };
    topology.windowsByLength.set(length, result);
    return result;
  }

  function challengingGomokuWinningWindows(state, topology, rules, length) {
    if (topology.challengingGomokuWindowsByLength.has(length)) {
      return topology.challengingGomokuWindowsByLength.get(length);
    }
    const windows = [];
    const seen = new Set();
    const add = (sequence) => {
      if (sequence.length !== length) return;
      const forward = sequence.join(',');
      const reverse = sequence.slice().reverse().join(',');
      const key = forward < reverse ? forward : reverse;
      if (seen.has(key)) return;
      seen.add(key);
      const multiplicity = new Map();
      sequence.forEach((index) => multiplicity.set(index, (multiplicity.get(index) || 0) + 1));
      windows.push({ sequence: sequence.slice(), multiplicity });
    };
    topology.playable.forEach((start) => {
      topology.directions.forEach((initialDirection) => {
        const sequence = [start];
        let index = start;
        let direction = initialDirection;
        for (let step = 1; step < length; step += 1) {
          const next = topology.successor.get(`${index}:${direction}`);
          if (!next) break;
          sequence.push(next.index);
          index = next.index;
          direction = next.dir;
        }
        add(sequence);
      });
      if (String(state.preset.lattice || 'square').toLowerCase() === 'square' && typeof rules.gomokuDiagonalStepCandidates === 'function') {
        [
          [[0, 1], [1, 0]],
          [[1, 2], [2, 1]],
          [[2, 3], [3, 2]],
          [[3, 0], [0, 3]]
        ].forEach((orders) => {
          const visit = (index, currentOrders, sequence) => {
            if (sequence.length === length) {
              add(sequence);
              return;
            }
            rules.gomokuDiagonalStepCandidates(state, index, currentOrders).forEach((candidate) => {
              visit(candidate.index, candidate.orders, sequence.concat(candidate.index));
            });
          };
          visit(start, orders, [start]);
        });
      }
    });
    const incident = new Map(topology.playable.map((index) => [index, []]));
    windows.forEach((window, windowIndex) => window.multiplicity.forEach((_count, index) => {
      if (incident.has(index)) incident.get(index).push(windowIndex);
    }));
    const result = { windows, incident };
    topology.challengingGomokuWindowsByLength.set(length, result);
    return result;
  }

  function occupancyMap(state) {
    const map = new Map();
    (state.stones || state.tokens || state.marbles || []).forEach((piece) => map.set(piece.index, piece.color));
    return map;
  }

  function opposite(color, gameMode) {
    if (gameMode === 'connect-four') return color === 'red' ? 'yellow' : 'red';
    return color === 'black' ? 'white' : 'black';
  }

  function expired(context, hard = false) {
    context.nodes += 1;
    if ((context.nodes & 127) !== 0) return false;
    const limit = hard ? context.hardDeadline : context.softDeadline;
    if (Date.now() >= limit) context.timedOut = true;
    return context.timedOut;
  }

  function legalGomokuMoves(state, topology, rules) {
    const occupied = occupancyMap(state);
    const all = topology.playable.filter((index) => !occupied.has(index));
    if (!occupied.size) {
      return all.sort((a, b) => (topology.centrality.get(b) || 0) - (topology.centrality.get(a) || 0) || a - b).slice(0, 5);
    }
    const candidate = new Set();
    const frontier = Array.from(occupied.keys());
    let layer = frontier.slice();
    const visited = new Set(layer);
    for (let depth = 0; depth < 2; depth += 1) {
      const nextLayer = [];
      layer.forEach((index) => (topology.adjacency.get(index) || []).forEach((next) => {
        if (!occupied.has(next)) candidate.add(next);
        if (!visited.has(next)) { visited.add(next); nextLayer.push(next); }
      }));
      layer = nextLayer;
    }
    const length = Number(state.preset.gomokuWinLength) || 5;
    const data = winningWindows(state, topology, rules, length);
    data.windows.forEach((window) => {
      const counts = windowCounts(window, occupied);
      if ((counts[state.turn] || 0) >= length - 2 || (counts[opposite(state.turn, 'gomoku')] || 0) >= length - 2) {
        window.multiplicity.forEach((_count, index) => { if (!occupied.has(index)) candidate.add(index); });
      }
    });
    return Array.from(candidate.size ? candidate : all);
  }

  function windowCounts(window, occupied) {
    const counts = {};
    window.multiplicity.forEach((multiplicity, index) => {
      const color = occupied.get(index);
      if (color) counts[color] = (counts[color] || 0) + multiplicity;
    });
    return counts;
  }

  function gomokuStaticScore(state, topology, rules, perspective) {
    if (state.phase === 'gameover') {
      if (!state.winner) return 0;
      return state.winner === perspective ? WIN_SCORE - (state.round || 0) : -WIN_SCORE + (state.round || 0);
    }
    const length = Number(state.preset.gomokuWinLength) || 5;
    const occupied = occupancyMap(state);
    const opponent = opposite(perspective, 'gomoku');
    let score = 0;
    let ownNear = 0;
    winningWindows(state, topology, rules, length).windows.forEach((window) => {
      const counts = windowCounts(window, occupied);
      const own = counts[perspective] || 0;
      const theirs = counts[opponent] || 0;
      if (own && theirs) return;
      if (own) {
        score += gomokuWindowValue(own, length);
        if (own === length - 1) ownNear += 1;
      } else if (theirs) score -= 1.15 * gomokuWindowValue(theirs, length);
    });
    if (ownNear >= 2) score += 20000;
    return score;
  }

  function gomokuWindowValue(count, length) {
    if (count >= length) return WIN_SCORE;
    if (count === length - 1) return 30000;
    if (count === length - 2) return 2000;
    if (count === length - 3) return 150;
    return 10 * count;
  }

  function immediateGomokuWins(state, moves, rules, color) {
    const source = rules.cloneGameState(state);
    source.turn = color;
    return moves.filter((index) => {
      const result = rules.placeGomokuStone(source, index);
      return result.changed && result.state.phase === 'gameover' && result.state.winner === color;
    });
  }

  function orderGomokuMoves(state, moves, topology, rules, limit) {
    const color = state.turn;
    const opponent = opposite(color, 'gomoku');
    const wins = new Set(immediateGomokuWins(state, moves, rules, color));
    const blocks = new Set(immediateGomokuWins(state, moves, rules, opponent));
    return moves.map((index) => {
      const result = rules.placeGomokuStone(state, index);
      const score = result.changed ? gomokuStaticScore(result.state, topology, rules, color) : -Infinity;
      return { index, score: (wins.has(index) ? WIN_SCORE * 2 : 0) + (blocks.has(index) ? WIN_SCORE : 0) + score };
    }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map((item) => item.index);
  }

  function gomokuNegamax(state, depth, alpha, beta, topology, rules, context) {
    if (expired(context) || depth <= 0 || state.phase === 'gameover') return gomokuStaticScore(state, topology, rules, state.turn);
    let moves = legalGomokuMoves(state, topology, rules);
    moves = orderGomokuMoves(state, moves, topology, rules, depth >= 2 ? 16 : 28);
    if (!moves.length) return 0;
    let best = -Infinity;
    for (const index of moves) {
      const result = rules.placeGomokuStone(state, index);
      if (!result.changed) continue;
      const value = result.state.phase === 'gameover' && result.state.winner === state.turn
        ? WIN_SCORE - (state.round || 0)
        : -gomokuNegamax(result.state, depth - 1, -beta, -alpha, topology, rules, context);
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (alpha >= beta || context.timedOut) break;
    }
    return Number.isFinite(best) ? best : gomokuStaticScore(state, topology, rules, state.turn);
  }

  function chooseGomoku(state, topology, rules, context) {
    let moves = legalGomokuMoves(state, topology, rules);
    const wins = immediateGomokuWins(state, moves, rules, state.turn);
    if (wins.length) return rankedResult(wins.map((index) => ({ move: { index }, score: WIN_SCORE })), 'forced-win', context);
    const opponent = opposite(state.turn, 'gomoku');
    const threats = immediateGomokuWins(state, topology.playable.filter((index) => !occupancyMap(state).has(index)), rules, opponent);
    if (threats.length) {
      moves = moves.filter((index) => {
        const result = rules.placeGomokuStone(state, index);
        if (!result.changed) return false;
        const replies = legalGomokuMoves(result.state, topology, rules);
        return immediateGomokuWins(result.state, replies, rules, opponent).length === 0;
      });
      if (!moves.length) moves = threats.slice();
    }
    moves = orderGomokuMoves(state, moves, topology, rules, 28);
    let completed = moves.map((index) => ({ move: { index }, score: 0 }));
    for (let depth = 1; depth <= 3 && Date.now() < context.softDeadline; depth += 1) {
      const ranked = [];
      for (const index of moves) {
        const result = rules.placeGomokuStone(state, index);
        if (!result.changed) continue;
        const score = result.state.phase === 'gameover'
          ? WIN_SCORE
          : -gomokuNegamax(result.state, depth - 1, -Infinity, Infinity, topology, rules, context);
        ranked.push({ move: { index }, score });
        if (context.timedOut) break;
      }
      if (!context.timedOut && ranked.length) { completed = ranked; context.completedDepth = depth; }
    }
    return rankedResult(completed, threats.length ? 'forced-block' : 'search', context);
  }

  function gomokuColorCode(color) {
    return color === 'black' ? 1 : (color === 'white' ? 2 : 0);
  }

  function gomokuOpponentCode(code) {
    return code === 1 ? 2 : 1;
  }

  function gomokuZobristValue(signature, tile, code) {
    return fnv1a(`${signature}#challenging-gomoku#${tile}#${code}`);
  }

  function createGomokuPosition(state, topology, rules) {
    const length = Number(state.preset.gomokuWinLength) || 5;
    const data = challengingGomokuWinningWindows(state, topology, rules, length);
    const size = Math.max(0, Number(state.preset.rows) * Number(state.preset.cols));
    const occupancyCodes = new Uint8Array(size);
    const blackCounts = new Uint8Array(data.windows.length);
    const whiteCounts = new Uint8Array(data.windows.length);
    let zobristHash = 0;
    (state.stones || []).forEach((stone) => {
      const index = Number(stone.index);
      const code = gomokuColorCode(stone.color);
      if (!Number.isInteger(index) || !code || !topology.playableSet.has(index)) return;
      occupancyCodes[index] = code;
      zobristHash = (zobristHash ^ gomokuZobristValue(topology.signature, index, code)) >>> 0;
    });
    data.windows.forEach((window, windowIndex) => {
      window.multiplicity.forEach((multiplicity, index) => {
        if (occupancyCodes[index] === 1) blackCounts[windowIndex] += multiplicity;
        else if (occupancyCodes[index] === 2) whiteCounts[windowIndex] += multiplicity;
      });
    });
    return {
      topology,
      length,
      windows: data.windows,
      incident: data.incident,
      occupancyCodes,
      blackCounts,
      whiteCounts,
      zobristHash,
      round: Number(state.round) || (state.stones || []).length,
      emptyCount: topology.playable.length - (state.stones || []).length,
      deltaStack: []
    };
  }

  function applyGomokuOccupancy(position, index, color) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    if (!code || !position.topology.playableSet.has(index) || position.occupancyCodes[index]) return null;
    const windowIndices = (position.incident.get(index) || []).slice();
    windowIndices.forEach((windowIndex) => {
      const multiplicity = position.windows[windowIndex].multiplicity.get(index) || 0;
      if (code === 1) position.blackCounts[windowIndex] += multiplicity;
      else position.whiteCounts[windowIndex] += multiplicity;
    });
    const delta = { index, code, windowIndices };
    position.occupancyCodes[index] = code;
    position.zobristHash = (position.zobristHash ^ gomokuZobristValue(position.topology.signature, index, code)) >>> 0;
    position.round += 1;
    position.emptyCount -= 1;
    position.deltaStack.push(delta);
    return delta;
  }

  function undoGomokuOccupancy(position, delta) {
    const change = delta || position.deltaStack[position.deltaStack.length - 1];
    if (!change || position.occupancyCodes[change.index] !== change.code) return false;
    change.windowIndices.forEach((windowIndex) => {
      const multiplicity = position.windows[windowIndex].multiplicity.get(change.index) || 0;
      if (change.code === 1) position.blackCounts[windowIndex] -= multiplicity;
      else position.whiteCounts[windowIndex] -= multiplicity;
    });
    position.occupancyCodes[change.index] = 0;
    position.zobristHash = (position.zobristHash ^ gomokuZobristValue(position.topology.signature, change.index, change.code)) >>> 0;
    position.round -= 1;
    position.emptyCount += 1;
    if (position.deltaStack[position.deltaStack.length - 1] === change) position.deltaStack.pop();
    else {
      const stackIndex = position.deltaStack.lastIndexOf(change);
      if (stackIndex >= 0) position.deltaStack.splice(stackIndex, 1);
    }
    return true;
  }

  function gomokuPositionHasWin(position, index, color) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const counts = code === 1 ? position.blackCounts : position.whiteCounts;
    return (position.incident.get(index) || []).some((windowIndex) => counts[windowIndex] >= position.length);
  }

  function gomokuWinningCells(position, color, windowIndices = null) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const opponentCode = gomokuOpponentCode(code);
    const ownCounts = code === 1 ? position.blackCounts : position.whiteCounts;
    const opponentCounts = opponentCode === 1 ? position.blackCounts : position.whiteCounts;
    const result = new Set();
    const visitWindow = (window, windowIndex) => {
      if (opponentCounts[windowIndex]) return;
      const own = ownCounts[windowIndex];
      window.multiplicity.forEach((multiplicity, index) => {
        if (!position.occupancyCodes[index] && own + multiplicity >= position.length) result.add(index);
      });
    };
    if (windowIndices) {
      Array.from(new Set(windowIndices)).forEach((windowIndex) => visitWindow(position.windows[windowIndex], windowIndex));
    } else position.windows.forEach(visitWindow);
    return result;
  }

  function gomokuFivePathCounts(state, options = {}) {
    const rules = options.rules || (typeof globalThis !== 'undefined' ? globalThis.RamifiedMinigames : null);
    if (!rules || !state || state.gameMode !== 'gomoku') return [];
    const topology = buildTopology(state, rules);
    const length = Number(state.preset.gomokuWinLength) || 5;
    const data = challengingGomokuWinningWindows(state, topology, rules, length);
    const size = Math.max(0, Number(state.preset.rows) * Number(state.preset.cols));
    const counts = Array(size).fill(null);
    topology.playable.forEach((index) => { counts[index] = (data.incident.get(index) || []).length; });
    return counts;
  }

  function gomokuLocalCandidateSet(position, focusIndex) {
    const result = new Set();
    (position.incident.get(focusIndex) || []).forEach((windowIndex) => {
      position.windows[windowIndex].multiplicity.forEach((_multiplicity, index) => {
        if (!position.occupancyCodes[index]) result.add(index);
      });
    });
    return result;
  }

  function gomokuLiveTwoCount(position, color) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const opponentCode = gomokuOpponentCode(code);
    const ownCounts = code === 1 ? position.blackCounts : position.whiteCounts;
    const opponentCounts = opponentCode === 1 ? position.blackCounts : position.whiteCounts;
    const signatures = new Set();
    position.windows.forEach((window, windowIndex) => {
      if (opponentCounts[windowIndex] || ownCounts[windowIndex] !== Math.max(1, position.length - 3)) return;
      const support = [];
      let emptyTiles = 0;
      window.multiplicity.forEach((multiplicity, index) => {
        if (position.occupancyCodes[index] === code) support.push(`${index}x${multiplicity}`);
        else if (!position.occupancyCodes[index]) emptyTiles += 1;
      });
      if (emptyTiles >= 2 && support.length) signatures.add(support.sort().join('|'));
    });
    return signatures.size;
  }

  function gomokuPreScore(position, index, color) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const opponentCode = gomokuOpponentCode(code);
    const ownCounts = code === 1 ? position.blackCounts : position.whiteCounts;
    const opponentCounts = opponentCode === 1 ? position.blackCounts : position.whiteCounts;
    let score = (position.incident.get(index) || []).length;
    (position.incident.get(index) || []).forEach((windowIndex) => {
      if (!opponentCounts[windowIndex]) score += Math.pow(6, ownCounts[windowIndex]);
      if (!ownCounts[windowIndex]) score += 1.1 * Math.pow(6, opponentCounts[windowIndex]);
    });
    return score;
  }

  function countOpenThreeRealizations(records) {
    const used = new Set();
    let count = 0;
    const ordered = records.slice().sort((left, right) => left.gain - right.gain);
    for (let index = 0; index < ordered.length; index += 1) {
      if (used.has(index)) continue;
      let pair = -1;
      for (let other = index + 1; other < ordered.length; other += 1) {
        if (used.has(other)) continue;
        if (ordered[index].winningCells.includes(ordered[other].gain)
          && ordered[other].winningCells.includes(ordered[index].gain)) {
          pair = other;
          break;
        }
      }
      used.add(index);
      if (pair >= 0) used.add(pair);
      count += 1;
    }
    return count;
  }

  function analyzeGomokuThreatMove(position, index, color) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const cacheKey = `${position.topology.signature}#${position.zobristHash}#${code}#${index}`;
    if (challengingGomokuThreatCache.has(cacheKey)) {
      return touchLru(
        challengingGomokuThreatCache,
        cacheKey,
        challengingGomokuThreatCache.get(cacheKey),
        CHALLENGING_GOMOKU_CACHE_LIMIT
      );
    }
    const delta = applyGomokuOccupancy(position, index, code);
    if (!delta) return null;
    let profile;
    try {
      const winNow = gomokuPositionHasWin(position, index, code);
      const winningCells = winNow
        ? []
        : Array.from(gomokuWinningCells(position, code, position.incident.get(index) || [])).sort((a, b) => a - b);
      const openThreeRecords = [];
      if (!winNow && winningCells.length < 2) {
        const extensions = Array.from(gomokuLocalCandidateSet(position, index))
          .sort((left, right) => gomokuPreScore(position, right, code) - gomokuPreScore(position, left, code) || left - right)
          .slice(0, 20);
        extensions.forEach((gain) => {
          const extensionDelta = applyGomokuOccupancy(position, gain, code);
          if (!extensionDelta) return;
          try {
            if (gomokuPositionHasWin(position, gain, code)) return;
            const nextWinningCells = Array.from(
              gomokuWinningCells(position, code, position.incident.get(gain) || [])
            ).sort((a, b) => a - b);
            if (nextWinningCells.length >= 2) openThreeRecords.push({ gain, winningCells: nextWinningCells });
          } finally {
            undoGomokuOccupancy(position, extensionDelta);
          }
        });
      }
      profile = {
        index,
        winNow,
        winningCells,
        rushFourCount: winningCells.length,
        openFour: winningCells.length >= 2,
        openThreeCount: countOpenThreeRealizations(openThreeRecords),
        openThreeGains: openThreeRecords.map((record) => record.gain),
        openTwoCount: gomokuLiveTwoCount(position, code),
        opponentOpenTwoCount: gomokuLiveTwoCount(position, gomokuOpponentCode(code)),
        preScore: gomokuPreScore(position, index, code)
      };
    } finally {
      undoGomokuOccupancy(position, delta);
    }
    return touchLru(challengingGomokuThreatCache, cacheKey, profile, CHALLENGING_GOMOKU_CACHE_LIMIT);
  }

  function challengingGomokuBaseCandidates(position, color, limit = 48) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    if (position.emptyCount === position.topology.playable.length) {
      return position.topology.playable.slice()
        .sort((left, right) => (position.incident.get(right) || []).length - (position.incident.get(left) || []).length
          || (position.topology.centrality.get(right) || 0) - (position.topology.centrality.get(left) || 0)
          || left - right)
        .slice(0, 12);
    }
    const candidates = new Set();
    position.windows.forEach((window, windowIndex) => {
      if (!position.blackCounts[windowIndex] && !position.whiteCounts[windowIndex]) return;
      window.multiplicity.forEach((_multiplicity, index) => {
        if (!position.occupancyCodes[index]) candidates.add(index);
      });
    });
    position.topology.playable.slice()
      .filter((index) => !position.occupancyCodes[index])
      .sort((left, right) => (position.incident.get(right) || []).length - (position.incident.get(left) || []).length || left - right)
      .slice(0, 12)
      .forEach((index) => candidates.add(index));
    return Array.from(candidates)
      .sort((left, right) => gomokuPreScore(position, right, code) - gomokuPreScore(position, left, code) || left - right)
      .slice(0, limit);
  }

  function gomokuTierThree(profile) {
    return !!(profile && (profile.openFour
      || (profile.rushFourCount >= 1 && profile.rushFourCount + profile.openThreeCount >= 2)));
  }

  function gomokuTierFive(profile) {
    return !!(profile && (profile.rushFourCount >= 1 || profile.openThreeCount >= 2));
  }

  function challengingGomokuTierReason(tier) {
    return `challenging-tier-${tier}`;
  }

  function rankChallengingTier(position, records, color, tier) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    if (tier === 8) {
      return records.slice().sort((left, right) => {
        const leftOpponentSafe = left.profile.opponentOpenTwoCount < 2 ? 1 : 0;
        const rightOpponentSafe = right.profile.opponentOpenTwoCount < 2 ? 1 : 0;
        const leftOwnDouble = left.profile.openTwoCount >= 2 ? 1 : 0;
        const rightOwnDouble = right.profile.openTwoCount >= 2 ? 1 : 0;
        const leftNet = left.profile.openTwoCount - left.profile.opponentOpenTwoCount;
        const rightNet = right.profile.openTwoCount - right.profile.opponentOpenTwoCount;
        return rightOpponentSafe - leftOpponentSafe
          || rightOwnDouble - leftOwnDouble
          || rightNet - leftNet
          || (position.incident.get(right.index) || []).length - (position.incident.get(left.index) || []).length
          || right.profile.preScore - left.profile.preScore
          || left.index - right.index;
      });
    }
    return records.slice().sort((left, right) => {
      const leftThreat = left.profile.rushFourCount * 100 + left.profile.openThreeCount * 10 + left.profile.openTwoCount;
      const rightThreat = right.profile.rushFourCount * 100 + right.profile.openThreeCount * 10 + right.profile.openTwoCount;
      return rightThreat - leftThreat
        || gomokuPreScore(position, right.index, code) - gomokuPreScore(position, left.index, code)
        || left.index - right.index;
    });
  }

  function challengingGomokuDefenseRecords(position, color, dangerRecords, predicate, ownProfiles, context) {
    if (!dangerRecords.length) return [];
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const opponentCode = gomokuOpponentCode(code);
    const pool = new Set();
    dangerRecords.forEach((record) => {
      pool.add(record.index);
      (record.profile.winningCells || []).forEach((index) => pool.add(index));
      (record.profile.openThreeGains || []).forEach((index) => pool.add(index));
    });
    const examined = [];
    for (const index of pool) {
      if (position.occupancyCodes[index]) continue;
      if (Date.now() >= context.hardDeadline && examined.length) break;
      const delta = applyGomokuOccupancy(position, index, code);
      if (!delta) continue;
      let remaining = 0;
      try {
        for (const danger of dangerRecords) {
          if (position.occupancyCodes[danger.index]) continue;
          const updated = analyzeGomokuThreatMove(position, danger.index, opponentCode);
          if (predicate(updated)) remaining += 1;
        }
      } finally {
        undoGomokuOccupancy(position, delta);
      }
      const profile = ownProfiles.get(index) || analyzeGomokuThreatMove(position, index, code);
      if (profile) examined.push({ index, profile, remainingThreats: remaining });
    }
    if (!examined.length) {
      return dangerRecords.map((record) => ({
        index: record.index,
        profile: ownProfiles.get(record.index) || analyzeGomokuThreatMove(position, record.index, code),
        remainingThreats: dangerRecords.length - 1
      })).filter((record) => record.profile);
    }
    const minimum = Math.min(...examined.map((record) => record.remainingThreats));
    return examined.filter((record) => record.remainingThreats === minimum);
  }

  function challengingGomokuCandidates(position, color, context, options = {}) {
    const code = typeof color === 'number' ? color : gomokuColorCode(color);
    const opponentCode = gomokuOpponentCode(code);
    const ownWinning = Array.from(gomokuWinningCells(position, code)).sort((a, b) => a - b);
    const base = challengingGomokuBaseCandidates(position, code, options.root ? 48 : 24);
    const allCandidates = new Set(base);
    ownWinning.forEach((index) => allCandidates.add(index));
    const opponentWinning = Array.from(gomokuWinningCells(position, opponentCode)).sort((a, b) => a - b);
    opponentWinning.forEach((index) => allCandidates.add(index));
    const ownProfiles = new Map();
    const opponentProfiles = new Map();
    for (const index of Array.from(allCandidates)) {
      if (position.occupancyCodes[index]) continue;
      if (Date.now() >= context.hardDeadline && ownProfiles.size) {
        context.timedOut = true;
        break;
      }
      const own = analyzeGomokuThreatMove(position, index, code);
      const theirs = analyzeGomokuThreatMove(position, index, opponentCode);
      if (own) ownProfiles.set(index, own);
      if (theirs) opponentProfiles.set(index, theirs);
    }
    const ownRecords = Array.from(ownProfiles, ([index, profile]) => ({ index, profile }));
    const opponentRecords = Array.from(opponentProfiles, ([index, profile]) => ({ index, profile }));
    const opponentTierThree = opponentRecords.filter((record) => gomokuTierThree(record.profile));
    const opponentTierFive = opponentRecords.filter((record) => !gomokuTierThree(record.profile) && gomokuTierFive(record.profile));
    const layers = new Map();
    layers.set(1, ownWinning.map((index) => ({ index, profile: ownProfiles.get(index) || analyzeGomokuThreatMove(position, index, code) })));
    layers.set(2, opponentWinning.map((index) => ({ index, profile: ownProfiles.get(index) || analyzeGomokuThreatMove(position, index, code) })));
    layers.set(3, ownRecords.filter((record) => gomokuTierThree(record.profile)));
    const earlierThanFour = [1, 2, 3].some((candidateTier) => (layers.get(candidateTier) || []).length);
    layers.set(4, earlierThanFour
      ? []
      : challengingGomokuDefenseRecords(position, code, opponentTierThree, gomokuTierThree, ownProfiles, context));
    layers.set(5, ownRecords.filter((record) => !gomokuTierThree(record.profile) && gomokuTierFive(record.profile)));
    const earlierThanSix = [1, 2, 3, 4, 5].some((candidateTier) => (layers.get(candidateTier) || []).length);
    layers.set(6, earlierThanSix
      ? []
      : challengingGomokuDefenseRecords(position, code, opponentTierFive, gomokuTierFive, ownProfiles, context));
    layers.set(7, ownRecords.filter((record) => !gomokuTierFive(record.profile) && record.profile.openThreeCount >= 1));
    layers.set(8, ownRecords);
    let tier = 8;
    for (let candidateTier = 1; candidateTier <= 8; candidateTier += 1) {
      if ((layers.get(candidateTier) || []).length) { tier = candidateTier; break; }
    }
    let selected = rankChallengingTier(position, layers.get(tier) || [], code, tier);
    const fallback = [];
    if (context.safePruning && tier >= 3 && tier < 8) {
      for (let nextTier = tier + 1; nextTier <= 8; nextTier += 1) {
        const ranked = rankChallengingTier(position, layers.get(nextTier) || [], code, nextTier)
          .filter((record) => !selected.some((entry) => entry.index === record.index));
        if (ranked.length) {
          ranked.slice(0, 2).forEach((record) => fallback.push(record));
          break;
        }
      }
      rankChallengingTier(position, layers.get(8) || [], code, 8)
        .filter((record) => !selected.some((entry) => entry.index === record.index)
          && !fallback.some((entry) => entry.index === record.index))
        .slice(0, 2)
        .forEach((record) => fallback.push(record));
      selected = selected.concat(fallback);
    }
    const cap = options.root ? 32 : 18;
    if (tier > 2) selected = selected.slice(0, cap);
    if (options.root) {
      context.pruningTier = tier;
      context.prePruneCandidates = ownRecords.length;
      context.postPruneCandidates = selected.length;
      context.fallbackCandidates = fallback.map((record) => record.index);
    }
    return { tier, records: selected, prePruneCandidates: ownRecords.length, fallback };
  }

  function challengingGomokuWindowValue(count, length) {
    if (count >= length) return WIN_SCORE;
    if (count === length - 1) return 50000;
    if (count === length - 2) return 3200;
    if (count === length - 3) return 220;
    return Math.max(0, count) * 12;
  }

  function challengingGomokuEvaluation(position, perspective) {
    const code = typeof perspective === 'number' ? perspective : gomokuColorCode(perspective);
    const opponentCode = gomokuOpponentCode(code);
    const ownCounts = code === 1 ? position.blackCounts : position.whiteCounts;
    const opponentCounts = opponentCode === 1 ? position.blackCounts : position.whiteCounts;
    let score = 0;
    position.windows.forEach((_window, windowIndex) => {
      const own = ownCounts[windowIndex];
      const theirs = opponentCounts[windowIndex];
      if (own && theirs) return;
      if (own) score += challengingGomokuWindowValue(own, position.length);
      else if (theirs) score -= challengingGomokuWindowValue(theirs, position.length);
    });
    score += 80 * (gomokuLiveTwoCount(position, code) - gomokuLiveTwoCount(position, opponentCode));
    return score;
  }

  function challengingGomokuExpired(context) {
    context.nodes += 1;
    if (context.timedOut) return true;
    if ((context.nodes & 63) !== 0 && Date.now() < context.hardDeadline) return false;
    if (Date.now() >= context.hardDeadline) context.timedOut = true;
    return context.timedOut;
  }

  function challengingGomokuNegamax(position, color, depth, alpha, beta, context, quiescenceDepth = 4) {
    if (challengingGomokuExpired(context)) return challengingGomokuEvaluation(position, color);
    const selection = challengingGomokuCandidates(position, color, context);
    if (!selection.records.length) return 0;
    if (depth <= 0 && (quiescenceDepth <= 0 || selection.tier >= 7)) {
      return challengingGomokuEvaluation(position, color);
    }
    const transpositionKey = `${position.topology.signature}#${position.zobristHash}#${color}#${depth}#${quiescenceDepth}#${context.safePruning ? 1 : 0}`;
    const cached = challengingGomokuTranspositions.get(transpositionKey);
    if (cached && cached.depth >= depth) {
      context.cacheHits += 1;
      return cached.score;
    }
    let best = -Infinity;
    for (const record of selection.records) {
      const delta = applyGomokuOccupancy(position, record.index, color);
      if (!delta) continue;
      let score;
      try {
        score = gomokuPositionHasWin(position, record.index, color)
          ? WIN_SCORE - position.round
          : -challengingGomokuNegamax(
            position,
            gomokuOpponentCode(color),
            Math.max(0, depth - 1),
            -beta,
            -alpha,
            context,
            depth > 0 ? quiescenceDepth : quiescenceDepth - 1
          );
      } finally {
        undoGomokuOccupancy(position, delta);
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta || context.timedOut) break;
    }
    if (!Number.isFinite(best)) best = challengingGomokuEvaluation(position, color);
    if (!context.timedOut) touchLru(
      challengingGomokuTranspositions,
      transpositionKey,
      { depth, score: best },
      TRANSPOSITION_LIMIT
    );
    return best;
  }

  function chooseChallengingGomoku(state, topology, rules, context) {
    const position = createGomokuPosition(state, topology, rules);
    const color = gomokuColorCode(state.turn);
    const root = challengingGomokuCandidates(position, color, context, { root: true });
    if (!root.records.length) return { move: null, diagnostics: diagnostics(context, 'challenging-no-move', []) };
    const initial = root.records.map((record) => {
      const delta = applyGomokuOccupancy(position, record.index, color);
      if (!delta) return null;
      let score;
      try {
        score = gomokuPositionHasWin(position, record.index, color)
          ? WIN_SCORE
          : -challengingGomokuEvaluation(position, gomokuOpponentCode(color));
      } finally {
        undoGomokuOccupancy(position, delta);
      }
      return { move: { index: record.index }, score, pathCount: (position.incident.get(record.index) || []).length };
    }).filter(Boolean);
    let completed = initial;
    if (root.tier === 1) {
      context.completedDepth = 1;
      return challengingRankedResult(completed, challengingGomokuTierReason(1), context);
    }
    for (let depth = 1; depth <= 6 && Date.now() < context.softDeadline; depth += 1) {
      const ranked = [];
      for (const record of root.records) {
        const delta = applyGomokuOccupancy(position, record.index, color);
        if (!delta) continue;
        let score;
        try {
          score = gomokuPositionHasWin(position, record.index, color)
            ? WIN_SCORE - position.round
            : -challengingGomokuNegamax(
              position,
              gomokuOpponentCode(color),
              depth - 1,
              -Infinity,
              Infinity,
              context,
              depth >= 2 ? 4 : 0
            );
        } finally {
          undoGomokuOccupancy(position, delta);
        }
        ranked.push({ move: { index: record.index }, score, pathCount: (position.incident.get(record.index) || []).length });
        if (context.timedOut) break;
      }
      if (!context.timedOut && ranked.length === root.records.length) {
        completed = ranked;
        context.completedDepth = depth;
      }
      if (context.timedOut) break;
    }
    return challengingRankedResult(completed, challengingGomokuTierReason(root.tier), context);
  }

  function challengingRankedResult(ranked, reason, context) {
    const sorted = ranked.filter((item) => item && item.move && Number.isFinite(item.score))
      .sort((left, right) => right.score - left.score || (right.pathCount || 0) - (left.pathCount || 0) || left.move.index - right.move.index);
    if (!sorted.length) return { move: null, diagnostics: diagnostics(context, reason, []) };
    const best = sorted[0];
    const tied = sorted.filter((item) => item.score === best.score && (item.pathCount || 0) === (best.pathCount || 0));
    const chosen = tied.length > 1 ? tied[Math.floor(seededUnit(context.seed) * tied.length) % tied.length] : best;
    return { move: chosen.move, diagnostics: diagnostics(context, reason, sorted.slice(0, 5), chosen.score, chosen.move) };
  }

  function buildConnectFourRoutes(state, topology) {
    if (topology.connectFourRoutes) return topology.connectFourRoutes;
    const routes = new Map();
    const tileReverse = new Map();
    sortedNumbers(state.holes).forEach((hole) => {
      const entries = [{ index: hole, dir: state.fallDir, transition: null }];
      const seenStates = new Map([[`${hole}:${state.fallDir}`, 0]]);
      let index = hole;
      let dir = state.fallDir;
      let termination = 'boundary';
      let cycleStart = null;
      let repeatedState = null;
      const guard = topology.playable.length * Math.max(1, topology.directions.length) + 1;
      for (let step = 0; step < guard; step += 1) {
        const next = topology.successor.get(`${index}:${dir}`);
        if (!next) break;
        const key = `${next.index}:${next.dir}`;
        if (seenStates.has(key)) {
          termination = 'cycle';
          cycleStart = seenStates.get(key);
          repeatedState = { index: next.index, dir: next.dir };
          break;
        }
        entries.push({ index: next.index, dir: next.dir, transition: cloneTransition(next) });
        seenStates.set(key, entries.length - 1);
        index = next.index;
        dir = next.dir;
      }
      const earliest = new Map();
      entries.forEach((entry, position) => {
        if (!earliest.has(entry.index)) earliest.set(entry.index, position);
      });
      const route = { hole, entries, earliest, termination, cycleStart, repeatedState };
      routes.set(hole, route);
      earliest.forEach((position, tile) => {
        if (!tileReverse.has(tile)) tileReverse.set(tile, []);
        tileReverse.get(tile).push({ hole, position });
      });
    });
    topology.connectFourRoutes = { routes, tileReverse, signature: topology.signature };
    return topology.connectFourRoutes;
  }

  function createConnectFourPosition(state, topology) {
    const routeData = buildConnectFourRoutes(state, topology);
    const occupancy = occupancyMap(state);
    const occupancyCodes = new Int8Array(Math.max(0, Number(state.preset.rows) * Number(state.preset.cols)));
    let zobristHash = 0;
    occupancy.forEach((color, tile) => {
      occupancyCodes[tile] = connectFourColorCode(color);
      zobristHash ^= connectFourZobristValue(topology.signature, tile, color);
    });
    const dynamic = new Map();
    const landingToHoles = new Map();
    routeData.routes.forEach((route, hole) => {
      let firstBlocker = Infinity;
      for (let position = 1; position < route.entries.length; position += 1) {
        if (occupancy.has(route.entries[position].index)) { firstBlocker = position; break; }
      }
      const entry = connectFourDynamicEntry(route, occupancy, firstBlocker);
      dynamic.set(hole, entry);
      addLandingHole(landingToHoles, entry.landing, hole, entry.usable);
    });
    return { occupancy, occupancyCodes, routeData, dynamic, landingToHoles, zobristHash: zobristHash >>> 0, deltaStack: [], routeDeltaCount: 0 };
  }

  function connectFourDynamicEntry(route, occupancy, firstBlocker) {
    if (occupancy.has(route.hole)) return { firstBlocker, landing: null, landingPosition: -1, activePrefixEnd: -1, usable: false, reason: 'occupied-hole' };
    if (Number.isFinite(firstBlocker)) {
      return { firstBlocker, landing: route.entries[firstBlocker - 1].index, landingPosition: firstBlocker - 1, activePrefixEnd: firstBlocker - 1, usable: true, reason: '' };
    }
    if (route.termination === 'cycle') return { firstBlocker, landing: null, landingPosition: -1, activePrefixEnd: route.entries.length - 1, usable: false, reason: 'cycle' };
    const landingPosition = route.entries.length - 1;
    return { firstBlocker, landing: route.entries[landingPosition].index, landingPosition, activePrefixEnd: landingPosition, usable: true, reason: '' };
  }

  function addLandingHole(map, landing, hole, usable) {
    if (!usable || !Number.isInteger(landing)) return;
    if (!map.has(landing)) map.set(landing, new Set());
    map.get(landing).add(hole);
  }

  function removeLandingHole(map, landing, hole) {
    if (!Number.isInteger(landing) || !map.has(landing)) return;
    map.get(landing).delete(hole);
    if (!map.get(landing).size) map.delete(landing);
  }

  function applyConnectFourOccupancy(position, tile, color) {
    const previousColor = position.occupancy.get(tile);
    const delta = {
      tile,
      previousColor,
      previousCode: position.occupancyCodes[tile],
      previousHash: position.zobristHash,
      routes: []
    };
    if (previousColor != null) position.zobristHash ^= connectFourZobristValue(position.routeData.signature, tile, previousColor);
    position.occupancy.set(tile, color);
    position.occupancyCodes[tile] = connectFourColorCode(color);
    position.zobristHash = (position.zobristHash ^ connectFourZobristValue(position.routeData.signature, tile, color)) >>> 0;
    (position.routeData.tileReverse.get(tile) || []).forEach(({ hole, position: routePosition }) => {
      const route = position.routeData.routes.get(hole);
      const previous = position.dynamic.get(hole);
      if (routePosition > 0 && routePosition >= previous.firstBlocker && tile !== hole) return;
      removeLandingHole(position.landingToHoles, previous.landing, hole);
      delta.routes.push({ hole, previous: { ...previous } });
      const firstBlocker = routePosition > 0 ? Math.min(previous.firstBlocker, routePosition) : previous.firstBlocker;
      const next = connectFourDynamicEntry(route, position.occupancy, firstBlocker);
      position.dynamic.set(hole, next);
      addLandingHole(position.landingToHoles, next.landing, hole, next.usable);
    });
    position.deltaStack.push(delta);
    position.routeDeltaCount += delta.routes.length;
    return delta;
  }

  function undoConnectFourOccupancy(position, delta) {
    const expected = position.deltaStack.pop();
    const applied = delta || expected;
    if (!applied) return;
    for (let index = applied.routes.length - 1; index >= 0; index -= 1) {
      const item = applied.routes[index];
      const current = position.dynamic.get(item.hole);
      removeLandingHole(position.landingToHoles, current.landing, item.hole);
      position.dynamic.set(item.hole, { ...item.previous });
      addLandingHole(position.landingToHoles, item.previous.landing, item.hole, item.previous.usable);
    }
    if (applied.previousColor == null) position.occupancy.delete(applied.tile);
    else position.occupancy.set(applied.tile, applied.previousColor);
    position.occupancyCodes[applied.tile] = applied.previousCode;
    position.zobristHash = applied.previousHash;
  }

  function cachedConnectFourLanding(position, hole) {
    const entry = position.dynamic.get(hole);
    return entry && entry.usable ? entry.landing : null;
  }

  function legalConnectFourMoves(position) {
    const result = [];
    position.dynamic.forEach((entry, hole) => { if (entry.usable && Number.isInteger(entry.landing)) result.push(hole); });
    return result.sort((a, b) => a - b);
  }

  function prefixHolesForTile(position, tile) {
    const holes = new Set();
    (position.routeData.tileReverse.get(tile) || []).forEach(({ hole, position: routePosition }) => {
      const dynamic = position.dynamic.get(hole);
      if (dynamic && routePosition <= dynamic.activePrefixEnd) holes.add(hole);
    });
    return holes;
  }

  function classifyConnectFourThreat(state, position, tile, side, rules, options = {}) {
    const currentHoles = new Set(position.landingToHoles.get(tile) || []);
    const prefixHoles = prefixHolesForTile(position, tile);
    const poisonedInputs = new Set();
    if (!currentHoles.size && prefixHoles.size && options.includePoison !== false) {
      const opponentState = rules.cloneGameState(state);
      opponentState.turn = opposite(side, 'connect-four');
      legalConnectFourMoves(position).forEach((hole) => {
        const result = rules.placeConnectFourToken(opponentState, hole);
        if (!result.changed || result.state.phase === 'gameover' || result.token.index === tile) return;
        const delta = applyConnectFourOccupancy(position, result.token.index, result.token.color);
        const activatedHoles = Array.from(position.landingToHoles.get(tile) || []);
        const winning = activatedHoles.some((replyHole) => {
          const replyState = rules.cloneGameState(result.state);
          replyState.turn = side;
          const reply = rules.placeConnectFourToken(replyState, replyHole);
          return reply.changed && reply.state.phase === 'gameover' && reply.state.winner === side;
        });
        undoConnectFourOccupancy(position, delta);
        if (winning) poisonedInputs.add(hole);
      });
    }
    const permanentlyUnreachable = !currentHoles.size && !prefixHoles.size;
    const baseScore = currentHoles.size ? 6000 : (prefixHoles.size ? 200 : 0);
    const poisonScore = currentHoles.size || permanentlyUnreachable ? 0 : Math.min(3600, poisonedInputs.size * 1200);
    return { tile, side, currentHoles, prefixHoles, poisonedInputs, permanentlyUnreachable, score: baseScore + poisonScore };
  }

  function connectFourEvaluation(state, topology, position, rules, perspective) {
    if (state.phase === 'gameover') {
      if (!state.winner) return 0;
      return state.winner === perspective ? WIN_SCORE - (state.round || 0) : -WIN_SCORE + (state.round || 0);
    }
    const opponent = opposite(perspective, 'connect-four');
    let ownScore = 0;
    let opponentScore = 0;
    const ownReachable = new Set();
    const opponentReachable = new Set();
    winningWindows(state, topology, rules, 4).windows.forEach((window) => {
      const counts = windowCounts(window, position.occupancy);
      const own = counts[perspective] || 0;
      const theirs = counts[opponent] || 0;
      if (own && theirs) return;
      const empty = Array.from(window.multiplicity.keys()).filter((index) => !position.occupancy.has(index));
      if (own === 1) ownScore += 5;
      else if (own === 2) ownScore += 80;
      else if (own === 3 && empty.length === 1) {
        const threat = classifyConnectFourThreat(state, position, empty[0], perspective, rules);
        ownScore += threat.score;
        if (threat.currentHoles.size) ownReachable.add(empty[0]);
      }
      if (theirs === 1) opponentScore += 5;
      else if (theirs === 2) opponentScore += 80;
      else if (theirs === 3 && empty.length === 1) {
        const threat = classifyConnectFourThreat(state, position, empty[0], opponent, rules, { includePoison: false });
        opponentScore += threat.score;
        if (threat.currentHoles.size) opponentReachable.add(empty[0]);
      }
    });
    ownScore += Math.min(40000, Math.max(0, ownReachable.size - 1) * 20000);
    opponentScore += Math.min(40000, Math.max(0, opponentReachable.size - 1) * 20000);
    return ownScore - 1.2 * opponentScore;
  }

  function immediateConnectFourWins(state, position, rules, color) {
    const source = rules.cloneGameState(state);
    source.turn = color;
    return legalConnectFourMoves(position).filter((hole) => {
      const result = rules.placeConnectFourToken(source, hole);
      return result.changed && result.state.phase === 'gameover' && result.state.winner === color;
    });
  }

  function connectFourSearch(state, position, topology, rules, context, depth, alpha, beta) {
    if (expired(context) || depth <= 0 || state.phase === 'gameover') return connectFourEvaluation(state, topology, position, rules, state.turn);
    const key = `${topology.signature}|${position.zobristHash}|${state.turn}|${depth}`;
    const cached = transpositions.get(key);
    if (cached && cached.depth >= depth) { context.cacheHits += 1; return cached.score; }
    const moves = orderConnectFourMoves(state, position, topology, rules);
    let best = -Infinity;
    let bestMove = null;
    for (const hole of moves) {
      const result = rules.placeConnectFourToken(state, hole);
      if (!result.changed || cachedConnectFourLanding(position, hole) !== result.token.index) continue;
      const delta = applyConnectFourOccupancy(position, result.token.index, result.token.color);
      const score = result.state.phase === 'gameover' && result.state.winner === state.turn
        ? WIN_SCORE - (state.round || 0)
        : -connectFourSearch(result.state, position, topology, rules, context, depth - 1, -beta, -alpha);
      undoConnectFourOccupancy(position, delta);
      if (score > best) { best = score; bestMove = hole; }
      alpha = Math.max(alpha, score);
      if (alpha >= beta || context.timedOut) break;
    }
    if (Number.isFinite(best) && !context.timedOut) {
      touchLru(transpositions, key, { depth, score: best, bestMove }, TRANSPOSITION_LIMIT);
    }
    return Number.isFinite(best) ? best : connectFourEvaluation(state, topology, position, rules, state.turn);
  }

  function orderConnectFourMoves(state, position, topology, rules) {
    const color = state.turn;
    const wins = new Set(immediateConnectFourWins(state, position, rules, color));
    const blocks = new Set(immediateConnectFourWins(state, position, rules, opposite(color, 'connect-four')));
    return legalConnectFourMoves(position).map((hole) => {
      const result = rules.placeConnectFourToken(state, hole);
      if (!result.changed) return { hole, score: -Infinity };
      const delta = applyConnectFourOccupancy(position, result.token.index, result.token.color);
      const staticScore = connectFourEvaluation(result.state, topology, position, rules, color);
      undoConnectFourOccupancy(position, delta);
      return { hole, score: (wins.has(hole) ? WIN_SCORE * 2 : 0) + (blocks.has(hole) ? WIN_SCORE : 0) + staticScore };
    }).sort((a, b) => b.score - a.score || a.hole - b.hole).map((item) => item.hole);
  }

  function chooseConnectFour(state, topology, rules, context) {
    const position = createConnectFourPosition(state, topology);
    context.routeDeltas = 0;
    let moves = legalConnectFourMoves(position);
    const wins = immediateConnectFourWins(state, position, rules, state.turn);
    if (wins.length) return rankedResult(wins.map((hole) => ({ move: { index: hole }, score: WIN_SCORE })), 'forced-win', context);
    const opponent = opposite(state.turn, 'connect-four');
    const threats = immediateConnectFourWins(state, position, rules, opponent);
    if (threats.length) {
      moves = moves.filter((hole) => {
        const result = rules.placeConnectFourToken(state, hole);
        if (!result.changed) return false;
        const delta = applyConnectFourOccupancy(position, result.token.index, result.token.color);
        const safe = immediateConnectFourWins(result.state, position, rules, opponent).length === 0;
        undoConnectFourOccupancy(position, delta);
        return safe;
      });
      if (!moves.length) moves = threats.slice();
    }
    moves = orderConnectFourMoves(state, position, topology, rules).filter((hole) => moves.includes(hole));
    let completed = moves.map((hole) => ({ move: { index: hole }, score: 0 }));
    for (let depth = 1; depth <= 7 && Date.now() < context.softDeadline; depth += 1) {
      const ranked = [];
      for (const hole of moves) {
        const result = rules.placeConnectFourToken(state, hole);
        if (!result.changed) continue;
        const delta = applyConnectFourOccupancy(position, result.token.index, result.token.color);
        const score = result.state.phase === 'gameover'
          ? WIN_SCORE
          : -connectFourSearch(result.state, position, topology, rules, context, depth - 1, -Infinity, Infinity);
        undoConnectFourOccupancy(position, delta);
        ranked.push({ move: { index: hole }, score });
        if (context.timedOut) break;
      }
      if (!context.timedOut && ranked.length) { completed = ranked; context.completedDepth = depth; }
    }
    context.routeDeltas = position.routeDeltaCount;
    return rankedResult(completed, threats.length ? 'forced-block' : 'search', context);
  }

  function targetDistanceTable(state, topology, color) {
    if (topology.targetDistances.has(color)) return topology.targetDistances.get(color);
    const targets = state.camps && state.camps.targets && state.camps.targets[color] instanceof Set
      ? Array.from(state.camps.targets[color]) : [];
    const distances = new Map();
    targets.forEach((target) => {
      const map = new Map([[target, 0]]);
      const queue = [target];
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const index = queue[cursor];
        (topology.reverseAdjacency.get(index) || []).forEach((previous) => {
          if (map.has(previous)) return;
          map.set(previous, map.get(index) + 1);
          queue.push(previous);
        });
      }
      distances.set(target, map);
    });
    const table = { targets, distances };
    topology.targetDistances.set(color, table);
    return table;
  }

  function assignmentDistance(state, topology, color) {
    const marbles = (state.marbles || []).filter((marble) => marble.color === color);
    const table = targetDistanceTable(state, topology, color);
    const count = Math.min(marbles.length, table.targets.length);
    if (!count) return { total: 0, largest: 0 };
    if (count > 15) {
      const values = marbles.slice(0, count).map((marble) => Math.min(...table.targets.map((target) => table.distances.get(target).get(marble.index) ?? 999)));
      return { total: values.reduce((sum, value) => sum + value, 0), largest: Math.max(...values) };
    }
    let dp = new Map([[0, { total: 0, largest: 0 }]]);
    for (let marbleIndex = 0; marbleIndex < count; marbleIndex += 1) {
      const next = new Map();
      dp.forEach((value, mask) => {
        table.targets.forEach((target, targetIndex) => {
          if (mask & (1 << targetIndex)) return;
          const distance = table.distances.get(target).get(marbles[marbleIndex].index) ?? 999;
          const candidate = { total: value.total + distance, largest: Math.max(value.largest, distance) };
          const nextMask = mask | (1 << targetIndex);
          const previous = next.get(nextMask);
          if (!previous || candidate.total < previous.total || (candidate.total === previous.total && candidate.largest < previous.largest)) next.set(nextMask, candidate);
        });
      });
      dp = next;
    }
    let best = null;
    dp.forEach((value) => { if (!best || value.total < best.total || (value.total === best.total && value.largest < best.largest)) best = value; });
    return best || { total: 999 * count, largest: 999 };
  }

  function chineseCheckersMoves(state, rules, color) {
    const source = rules.cloneGameState(state);
    source.turn = color || state.turn;
    const moves = [];
    (source.marbles || []).filter((marble) => marble.color === source.turn).forEach((marble) => {
      rules.chineseCheckerMoveMap(source, marble.index).forEach((move, to) => {
        moves.push({ from: marble.index, to, move });
      });
    });
    return moves;
  }

  function chineseCheckersColorScore(state, topology, rules, color) {
    const assignment = assignmentDistance(state, topology, color);
    const targets = state.camps && state.camps.targets && state.camps.targets[color] instanceof Set ? state.camps.targets[color] : new Set();
    const starts = state.camps && state.camps.starts && state.camps.starts[color] instanceof Set ? state.camps.starts[color] : new Set();
    const marbles = (state.marbles || []).filter((marble) => marble.color === color);
    const targetCount = marbles.filter((marble) => targets.has(marble.index)).length;
    const startCount = marbles.filter((marble) => starts.has(marble.index)).length;
    let mobility = 0;
    marbles.forEach((marble) => { mobility += Math.min(30, rules.chineseCheckerMoveMap(state, marble.index).size); });
    return -100 * assignment.total + 450 * targetCount - 180 * startCount - 35 * assignment.largest + Math.min(120, 4 * mobility);
  }

  function chineseCheckersVector(state, topology, rules) {
    const vector = {};
    (state.playerColors || []).forEach((color) => { vector[color] = chineseCheckersColorScore(state, topology, rules, color); });
    return vector;
  }

  function orderChineseCheckersMoves(state, moves, topology, rules, color, limit) {
    const before = chineseCheckersColorScore(state, topology, rules, color);
    const targets = state.camps && state.camps.targets && state.camps.targets[color] instanceof Set ? state.camps.targets[color] : new Set();
    const starts = state.camps && state.camps.starts && state.camps.starts[color] instanceof Set ? state.camps.starts[color] : new Set();
    return moves.map((item) => {
      const result = rules.placeChineseCheckerMarble(state, item.from, item.to, { stepwise: false });
      if (!result.changed) return { item, score: -Infinity };
      let score = chineseCheckersColorScore(result.state, topology, rules, color) - before;
      if (!targets.has(item.from) && targets.has(item.to)) score += 450;
      if (starts.has(item.from) && !starts.has(item.to)) score += 180;
      score += 12 * ((item.move && item.move.segments || []).length);
      if (targets.has(item.from) && !targets.has(item.to) && score <= 0) score -= 500;
      return { item, score };
    }).sort((a, b) => b.score - a.score || a.item.from - b.item.from || a.item.to - b.item.to).slice(0, limit).map((entry) => entry.item);
  }

  function chooseChineseCheckers(state, topology, rules, context) {
    const color = state.turn;
    let moves = chineseCheckersMoves(state, rules, color);
    moves = orderChineseCheckersMoves(state, moves, topology, rules, color, 24);
    const ranked = [];
    for (const item of moves) {
      const result = rules.placeChineseCheckerMarble(state, item.from, item.to, { stepwise: false });
      if (!result.changed) continue;
      let vector = chineseCheckersVector(result.state, topology, rules);
      if (result.state.phase !== 'gameover' && Date.now() < context.softDeadline) {
        const nextColor = result.state.turn;
        const replies = orderChineseCheckersMoves(result.state, chineseCheckersMoves(result.state, rules, nextColor), topology, rules, nextColor, 12);
        let selected = null;
        replies.forEach((reply) => {
          const child = rules.placeChineseCheckerMarble(result.state, reply.from, reply.to, { stepwise: false });
          if (!child.changed) return;
          const childVector = chineseCheckersVector(child.state, topology, rules);
          if (!selected || (childVector[nextColor] || -Infinity) > (selected[nextColor] || -Infinity)) selected = childVector;
          expired(context);
        });
        if (selected) vector = selected;
      }
      ranked.push({ move: { from: item.from, to: item.to }, score: result.state.winner === color ? WIN_SCORE : (vector[color] || 0) });
      if (context.timedOut) break;
    }
    context.completedDepth = 2;
    return rankedResult(ranked, 'maxn-search', context);
  }

  function seededUnit(seed) {
    let value = (Number(seed) || 1) >>> 0;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 4294967296;
  }

  function rankedResult(ranked, reason, context) {
    const sorted = ranked.filter((item) => item && item.move && Number.isFinite(item.score)).sort((a, b) => b.score - a.score);
    if (!sorted.length) return { move: null, diagnostics: diagnostics(context, reason, []) };
    const best = sorted[0].score;
    const band = Math.max(25, Math.abs(best) * 0.02);
    const near = sorted.filter((item) => best - item.score <= band).slice(0, 3);
    let chosen = near[0];
    if (!/^forced-/.test(reason) && near.length > 1) {
      const roll = seededUnit(context.seed);
      chosen = roll < 0.75 ? near[0] : (roll < 0.95 ? near[Math.min(1, near.length - 1)] : near[Math.min(2, near.length - 1)]);
    }
    return { move: chosen.move, diagnostics: diagnostics(context, reason, sorted.slice(0, 5), chosen.score, chosen.move) };
  }

  function diagnostics(context, reason, ranked, score, move) {
    const elapsedTimeMs = Date.now() - context.startedAt;
    return {
      move: move || null,
      reason,
      reasonCode: reason,
      score: Number.isFinite(score) ? score : null,
      scoreComponents: {
        selected: Number.isFinite(score) ? score : null,
        candidates: ranked.map((item) => item.score)
      },
      depth: context.completedDepth || 0,
      completedDepth: context.completedDepth || 0,
      nodeCount: context.nodes,
      nodes: context.nodes,
      elapsedTimeMs,
      elapsedMs: elapsedTimeMs,
      cacheHits: context.cacheHits,
      routeDeltas: context.routeDeltas || 0,
      timedOut: context.timedOut,
      positionHash: context.positionHash,
      profile: context.profile || null,
      pruningTier: Number.isInteger(context.pruningTier) ? context.pruningTier : null,
      prePruneCandidates: Number.isInteger(context.prePruneCandidates) ? context.prePruneCandidates : null,
      postPruneCandidates: Number.isInteger(context.postPruneCandidates) ? context.postPruneCandidates : null,
      fallbackCandidates: Array.isArray(context.fallbackCandidates) ? context.fallbackCandidates.slice() : [],
      candidates: ranked.map((item) => ({ move: item.move, score: item.score }))
    };
  }

  function normalizeGomokuProfile(value) {
    return value === 'challenging' || value === CONTROLLERS.CHALLENGING ? 'challenging' : 'aggressive';
  }

  function chooseMove(state, options = {}) {
    const rules = options.rules || (typeof globalThis !== 'undefined' ? globalThis.RamifiedMinigames : null);
    if (!rules || !state || state.phase === 'setup' || state.phase === 'gameover') return { move: null, diagnostics: { reason: 'unavailable' } };
    const startedAt = Date.now();
    const gomokuProfile = state.gameMode === 'gomoku' ? normalizeGomokuProfile(options.profile) : '';
    const budgets = state.gameMode === 'connect-four'
      ? [150, 240]
      : (state.gameMode === 'chinese-checkers'
        ? [220, 320]
        : (gomokuProfile === 'challenging' ? [850, 1000] : [180, 280]));
    const context = {
      startedAt,
      softDeadline: startedAt + (Number(options.softBudgetMs) || budgets[0]),
      hardDeadline: startedAt + (Number(options.hardBudgetMs) || budgets[1]),
      seed: Number(options.seed) || fnv1a(positionHash(state)),
      positionHash: positionHash(state),
      profile: gomokuProfile || 'challenging',
      safePruning: gomokuProfile === 'challenging' && !!options.safePruning,
      nodes: 0,
      cacheHits: 0,
      completedDepth: 0,
      timedOut: false
    };
    const topology = buildTopology(state, rules);
    if (state.gameMode === 'gomoku') {
      return gomokuProfile === 'challenging'
        ? chooseChallengingGomoku(state, topology, rules, context)
        : chooseGomoku(state, topology, rules, context);
    }
    if (state.gameMode === 'connect-four') return chooseConnectFour(state, topology, rules, context);
    if (state.gameMode === 'chinese-checkers') return chooseChineseCheckers(state, topology, rules, context);
    return { move: null, diagnostics: diagnostics(context, 'unsupported-game', []) };
  }

  return {
    CONTROLLERS,
    boardSignature,
    positionHash,
    gomokuFivePathCounts,
    chooseMove,
    __test: {
      buildTopology,
      winningWindows,
      challengingGomokuWinningWindows,
      createGomokuPosition,
      applyGomokuOccupancy,
      undoGomokuOccupancy,
      gomokuWinningCells,
      gomokuLiveTwoCount,
      analyzeGomokuThreatMove,
      challengingGomokuCandidates,
      challengingGomokuEvaluation,
      buildConnectFourRoutes,
      createConnectFourPosition,
      cachedConnectFourLanding,
      legalConnectFourMoves,
      applyConnectFourOccupancy,
      undoConnectFourOccupancy,
      prefixHolesForTile,
      classifyConnectFourThreat,
      connectFourEvaluation,
      immediateConnectFourWins,
      clearCaches() {
        topologyCache.clear();
        transpositions.clear();
        challengingGomokuTranspositions.clear();
        challengingGomokuThreatCache.clear();
      },
      cacheSizes() {
        return {
          topology: topologyCache.size,
          transpositions: transpositions.size,
          challengingGomokuTranspositions: challengingGomokuTranspositions.size,
          challengingGomokuThreats: challengingGomokuThreatCache.size
        };
      }
    }
  };
});
