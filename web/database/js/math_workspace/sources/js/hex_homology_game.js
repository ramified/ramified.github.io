/*
 * Incremental Topological Hex engine.
 *
 * The board graph has one vertex per playable tile.  Its edges are tile
 * adjacencies, including glued-boundary portals.  A deterministic global
 * spanning forest turns every adjacency into a voltage in H_1 of the
 * quotient.  The per-colour weighted union-find then detects exactly the
 * homology class created by each newly completed fundamental cycle.
 */
(function(root, factory) {
  const api = factory(root && root.BackgroundHomology);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TopologicalHex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(browserHomology) {
  'use strict';

  const BackgroundHomology = browserHomology || (() => {
    if (typeof require !== 'function') return null;
    try { return require('./background_homology.js'); } catch (_) { return null; }
  })();

  const LATTICES = {
    square: { sides: 4, opposite: [2, 3, 0, 1], offsets: [[0, 1], [1, 0], [0, -1], [-1, 0]] },
    hexagonal: { sides: 6, opposite: [3, 4, 5, 0, 1, 2] }
  };
  const PLAYERS = ['red', 'blue'];
  const topologyCache = new Map();
  const TOPOLOGY_CACHE_LIMIT = 32;
  const HOMOLOGY_CACHE_VERSION = 1;
  const BOUNDARY_GLUE_HOMOLOGY_SCHEME = 'square-boundary-glue-v1';
  const TILE_LOCAL_VERTEX_SCHEME = 'tile-edge-quotient-v2';

  function modulo(value, size) {
    return ((value % size) + size) % size;
  }

  function indexOf(row, col, cols) {
    return row * cols + col;
  }

  function rowCol(index, cols) {
    return { row: Math.floor(index / cols), col: index % cols };
  }

  function latticeFor(preset) {
    return LATTICES[preset && preset.lattice] || LATTICES.square;
  }

  function cutKey(left, right) {
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function localKey(index, dir) {
    return `${index}:${dir}`;
  }

  function sidePairKey(leftIndex, leftDir, rightIndex, rightDir) {
    const left = localKey(leftIndex, leftDir);
    const right = localKey(rightIndex, rightDir);
    return left < right ? `${left}|${right}` : `${right}|${left}`;
  }

  function offsetToAxial(row, col) {
    return { q: col - Math.floor(row / 2), r: row };
  }

  function neighbor(index, dir, preset) {
    const lattice = latticeFor(preset);
    const { row, col } = rowCol(index, preset.cols);
    if (lattice === LATTICES.square) {
      const delta = lattice.offsets[dir];
      if (!delta) return null;
      const nextRow = row + delta[0];
      const nextCol = col + delta[1];
      if (nextRow < 0 || nextRow >= preset.rows || nextCol < 0 || nextCol >= preset.cols) return null;
      return indexOf(nextRow, nextCol, preset.cols);
    }
    const deltas = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    const axial = offsetToAxial(row, col);
    const delta = deltas[dir];
    if (!delta) return null;
    const nextRow = axial.r + delta[1];
    const nextCol = axial.q + delta[0] + Math.floor(nextRow / 2);
    if (nextRow < 0 || nextRow >= preset.rows || nextCol < 0 || nextCol >= preset.cols) return null;
    return indexOf(nextRow, nextCol, preset.cols);
  }

  function edgeIndex(edge, cols) {
    if (!edge || typeof edge !== 'object') return -1;
    const row = Number(edge.row);
    const col = Number(edge.col);
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 1 || col < 1) return -1;
    return indexOf(row - 1, col - 1, cols);
  }

  function normalizedGluePairs(preset) {
    const lattice = latticeFor(preset);
    const total = preset.rows * preset.cols;
    const pairs = [];
    (Array.isArray(preset.gluedEdges) ? preset.gluedEdges : []).forEach((pair) => {
      const firstIndex = edgeIndex(pair && pair.first, preset.cols);
      const secondIndex = edgeIndex(pair && pair.second, preset.cols);
      const firstDir = Number(pair && pair.first && pair.first.dir);
      const secondDir = Number(pair && pair.second && pair.second.dir);
      if (firstIndex < 0 || firstIndex >= total || secondIndex < 0 || secondIndex >= total) return;
      if (!Number.isInteger(firstDir) || !Number.isInteger(secondDir)) return;
      const first = { index: firstIndex, dir: modulo(firstDir, lattice.sides) };
      const second = { index: secondIndex, dir: modulo(secondDir, lattice.sides) };
      if (first.index === second.index && first.dir === second.dir) return;
      pairs.push({ first, second, reversed: !!(pair && pair.reversed), group: pair && pair.group });
    });
    return pairs;
  }

  function topologySnapshot(preset, removed = []) {
    const removedSet = removed instanceof Set ? removed : new Set(removed || []);
    const cutEdges = [];
    (Array.isArray(preset.cutEdges) ? preset.cutEdges : []).forEach((edge) => {
      const left = edgeIndex(edge && edge.left, preset.cols);
      const right = edgeIndex(edge && edge.right, preset.cols);
      if (left >= 0 && right >= 0 && left !== right) cutEdges.push({ leftIndex: left, rightIndex: right });
    });
    cutEdges.sort((left, right) => left.leftIndex - right.leftIndex || left.rightIndex - right.rightIndex);
    const gluedEdges = normalizedGluePairs(preset).map((pair) => ({
      first: { ...pair.first },
      second: { ...pair.second },
      reversed: pair.reversed,
      group: pair.group
    }));
    return {
      lattice: preset.lattice || 'square',
      rows: preset.rows,
      cols: preset.cols,
      removedTiles: Array.from(removedSet).filter(Number.isInteger).sort((left, right) => left - right),
      cutEdges,
      gluedEdges
    };
  }

  function buildTopology(preset, removed = [], options = {}) {
    if (!preset || !Number.isInteger(preset.rows) || !Number.isInteger(preset.cols) || preset.rows <= 0 || preset.cols <= 0) {
      return invalidTopology('The board dimensions are invalid.');
    }
    const snapshot = topologySnapshot(preset, removed);
    const cacheKey = JSON.stringify(snapshot);
    const cached = topologyCache.get(cacheKey);
    if (cached) return cached;
    const stored = topologyFromPresetHomology(preset, removed, snapshot);
    if (stored) return rememberTopology(cacheKey, stored);
    if (!BackgroundHomology) return invalidTopology('The homology engine is unavailable.');
    if (!snapshot.gluedEdges.length) return invalidTopology('Hex requires a glued boundary board.');

    let analysis;
    try {
      analysis = options && options.analysis ? options.analysis : BackgroundHomology.analyze(snapshot);
    } catch (error) {
      return rememberTopology(cacheKey, invalidTopology(error && error.message ? error.message : 'The quotient homology could not be computed.'));
    }
    const generators = (analysis.generators || []).map((generator) => ({
      id: generator.id,
      kind: generator.kind,
      order: generator.kind === 'torsion' ? safeBigIntNumber(generator.order) : null
    }));
    if (!generators.length) return rememberTopology(cacheKey, invalidTopology('This glued board has trivial H₁, so no Hex win is possible.', analysis));
    if (generators.some((generator) => generator.kind === 'torsion' && !generator.order)) {
      return rememberTopology(cacheKey, invalidTopology('This board has an unsupported torsion order.', analysis));
    }

    const graph = buildAdjacencyGraph(preset, removed, snapshot.gluedEdges);
    if (!graph.active.some(Boolean)) return rememberTopology(cacheKey, invalidTopology('The board has no playable tiles.', analysis));
    const topology = {
      valid: true,
      preset,
      snapshot,
      analysis,
      generators,
      total: preset.rows * preset.cols,
      active: graph.active,
      edges: graph.edges,
      incident: graph.incident,
      adjacency: graph.adjacency,
      treeEdges: new Set(),
      signatures: []
    };
    try {
      assignEdgeSignatures(topology);
    } catch (error) {
      return rememberTopology(cacheKey, invalidTopology(
        error && error.message ? error.message : 'Could not precompute Hex homology signatures.',
        analysis
      ));
    }
    return rememberTopology(cacheKey, topology);
  }

  // Presets store only the immutable information needed by the Hex runtime.
  // Zero edge signatures are omitted because they dominate ordinary boards.
  function serializeTopology(topology) {
    if (!topology || !topology.valid || !topology.snapshot) return null;
    const generators = normalizeStoredGenerators(topology.generators);
    if (!generators || !Array.isArray(topology.edges) || !Array.isArray(topology.signatures)) return null;
    const signatures = [];
    let signaturesValid = true;
    topology.signatures.forEach((signature, edgeId) => {
      const vector = normalizeStoredSignature(signature, generators);
      if (!vector) {
        signaturesValid = false;
        return;
      }
      if (!vector.some((value) => value !== 0)) return;
      signatures.push([edgeId, ...vector]);
    });
    if (!signaturesValid || topology.signatures.length !== topology.edges.length) return null;
    return {
      version: HOMOLOGY_CACHE_VERSION,
      vertexEquivalence: TILE_LOCAL_VERTEX_SCHEME,
      fingerprint: topologyFingerprint(topology.snapshot),
      generators,
      signatures
    };
  }

  function topologyFromPresetHomology(preset, removed = [], snapshot = topologySnapshot(preset, removed)) {
    const stored = preset && preset.hex && preset.hex.homology;
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
    if (Number(stored.version) !== HOMOLOGY_CACHE_VERSION) return null;
    if (stored.scheme === BOUNDARY_GLUE_HOMOLOGY_SCHEME) {
      return topologyFromBoundaryGlueScheme(preset, removed, snapshot, stored);
    }
    // Version-1 preset payloads predate tile-local quotient vertices.  They
    // remain valid on boards where every canvas vertex has one connected
    // vertex star, but must be recomputed when removed tiles or cuts split one
    // drawn coordinate into multiple topological points.
    if (stored.vertexEquivalence !== TILE_LOCAL_VERTEX_SCHEME && snapshotHasSplitCanvasVertex(snapshot)) return null;
    const fingerprintMatches = typeof stored.fingerprint === 'string'
      && stored.fingerprint === topologyFingerprint(snapshot);
    const legacySnapshotMatches = stored.snapshot
      && JSON.stringify(stored.snapshot) === JSON.stringify(snapshot);
    if (!fingerprintMatches && !legacySnapshotMatches) return null;
    const generators = normalizeStoredGenerators(stored.generators);
    if (!generators || !generators.length) return null;
    const graph = buildAdjacencyGraph(preset, removed, snapshot.gluedEdges);
    if (!graph.active.some(Boolean)) return null;
    const signatures = sparseStoredSignatures(stored.signatures, graph.edges.length, generators);
    if (!signatures) return null;
    return runtimeTopology(preset, snapshot, graph, generators, signatures);
  }

  function topologyFromBoundaryGlueScheme(preset, removed, snapshot, stored) {
    const mode = normalizeBoundaryGlueMode(stored.mode || preset.boundaryGlueMode || preset.surface);
    if (!mode || preset.lattice !== 'square' || snapshot.removedTiles.length || snapshot.cutEdges.length) return null;
    if (!matchesBoundaryGlueSnapshot(snapshot, mode)) return null;
    const graph = buildAdjacencyGraph(preset, removed, snapshot.gluedEdges);
    const generators = mode === 'torus'
      ? [{ id: 'a1', kind: 'free', order: null }, { id: 'a2', kind: 'free', order: null }]
      : (mode === 'klein-bottle'
        ? [{ id: 't1', kind: 'torsion', order: 2 }, { id: 'a1', kind: 'free', order: null }]
        : [{ id: 't1', kind: 'torsion', order: 2 }]);
    const signatures = graph.edges.map((edge) => {
      if (edge.kind !== 'glued') return Array(generators.length).fill(0);
      const horizontal = (edge.uDir === 0 || edge.uDir === 2) && (edge.vDir === 0 || edge.vDir === 2);
      const vertical = (edge.uDir === 1 || edge.uDir === 3) && (edge.vDir === 1 || edge.vDir === 3);
      if (!horizontal && !vertical) return null;
      if (mode === 'torus') return horizontal ? [1, 0] : [0, 1];
      if (mode === 'klein-bottle') return horizontal ? [0, 1] : [1, 0];
      return [1];
    });
    if (signatures.some((signature) => !signature)) return null;
    return runtimeTopology(preset, snapshot, graph, generators, signatures);
  }

  function runtimeTopology(preset, snapshot, graph, generators, signatures) {
    return {
      valid: true,
      preset,
      snapshot,
      analysis: null,
      generators,
      total: preset.rows * preset.cols,
      active: graph.active,
      edges: graph.edges,
      incident: graph.incident,
      adjacency: graph.adjacency,
      treeEdges: new Set(),
      signatures
    };
  }

  function normalizeStoredGenerators(source) {
    if (!Array.isArray(source) || !source.length) return null;
    const ids = new Set();
    const generators = [];
    for (const entry of source) {
      const id = String(entry && entry.id || '').trim();
      const kind = entry && entry.kind === 'torsion' ? 'torsion' : (entry && entry.kind === 'free' ? 'free' : '');
      const order = kind === 'torsion' ? Number(entry && entry.order) : null;
      if (!id || ids.has(id) || !kind || (kind === 'torsion' && (!Number.isSafeInteger(order) || order <= 1))) return null;
      ids.add(id);
      generators.push({ id, kind, order });
    }
    return generators;
  }

  function normalizeStoredSignature(source, generators) {
    if (!Array.isArray(source) || source.length !== generators.length) return null;
    const vector = source.map(Number);
    if (vector.some((value) => !Number.isSafeInteger(value))) return null;
    return normalizeVector({ generators }, vector);
  }

  function sparseStoredSignatures(source, edgeCount, generators) {
    if (!Array.isArray(source)) return null;
    const signatures = Array.from({ length: edgeCount }, () => Array(generators.length).fill(0));
    const seen = new Set();
    for (const entry of source) {
      if (!Array.isArray(entry) || entry.length !== generators.length + 1) return null;
      const edgeId = Number(entry[0]);
      const vector = normalizeStoredSignature(entry.slice(1), generators);
      if (!Number.isInteger(edgeId) || edgeId < 0 || edgeId >= edgeCount || seen.has(edgeId) || !vector) return null;
      seen.add(edgeId);
      signatures[edgeId] = vector;
    }
    return signatures;
  }

  function normalizeBoundaryGlueMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === 'torus') return 'torus';
    if (mode === 'klein' || mode === 'klein bottle' || mode === 'klein-bottle') return 'klein-bottle';
    if (mode === 'rp2' || mode === 'rp^2' || mode === 'rp²' || mode === 'projective plane' || mode === 'real projective plane') return 'rp2';
    return '';
  }

  function matchesBoundaryGlueSnapshot(snapshot, mode) {
    const rows = snapshot.rows;
    const cols = snapshot.cols;
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || snapshot.gluedEdges.length !== rows + cols) return false;
    const expected = new Set();
    for (let row = 0; row < rows; row += 1) {
      const otherRow = mode === 'torus' ? row : rows - row - 1;
      expected.add(boundaryGluePairKey(indexOf(row, cols - 1, cols), 0, indexOf(otherRow, 0, cols), 2, mode !== 'torus'));
    }
    for (let col = 0; col < cols; col += 1) {
      const otherCol = mode === 'rp2' ? cols - col - 1 : col;
      expected.add(boundaryGluePairKey(indexOf(0, col, cols), 3, indexOf(rows - 1, otherCol, cols), 1, mode === 'rp2'));
    }
    return snapshot.gluedEdges.every((pair) => expected.delete(boundaryGluePairKey(
      pair.first.index,
      pair.first.dir,
      pair.second.index,
      pair.second.dir,
      pair.reversed
    ))) && expected.size === 0;
  }

  function boundaryGluePairKey(firstIndex, firstDir, secondIndex, secondDir, reversed) {
    const first = `${firstIndex}:${firstDir}`;
    const second = `${secondIndex}:${secondDir}`;
    return `${first < second ? `${first}|${second}` : `${second}|${first}`}|${reversed ? 1 : 0}`;
  }

  function topologyFingerprint(snapshot) {
    const text = JSON.stringify(snapshot);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193);
      second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `v1:${text.length}:${(first >>> 0).toString(16).padStart(8, '0')}:${(second >>> 0).toString(16).padStart(8, '0')}`;
  }

  function snapshotHasSplitCanvasVertex(snapshot) {
    if (!BackgroundHomology || typeof BackgroundHomology.buildCellComplex !== 'function') return true;
    let complex;
    try {
      complex = BackgroundHomology.buildCellComplex(snapshot);
    } catch (_) {
      return true;
    }
    const vertexIdsByCanvasKey = new Map();
    (complex.vertices || []).forEach((vertex) => {
      (vertex.corners || []).forEach((corner) => {
        const key = canvasVertexKey(snapshot, corner.index, corner.vertex);
        if (!vertexIdsByCanvasKey.has(key)) vertexIdsByCanvasKey.set(key, new Set());
        vertexIdsByCanvasKey.get(key).add(vertex.id);
      });
    });
    return Array.from(vertexIdsByCanvasKey.values()).some((ids) => ids.size > 1);
  }

  // Canvas keys are used only to detect whether an old cache would have
  // collapsed distinct vertices.  They never identify vertices in the live
  // quotient complex.
  function canvasVertexKey(snapshot, index, vertex) {
    const lattice = latticeFor(snapshot);
    const { row, col } = rowCol(index, snapshot.cols);
    const normalizedVertex = modulo(vertex, lattice.sides);
    if (lattice === LATTICES.square) {
      const offset = [[0, 0], [0, 1], [1, 1], [1, 0]][normalizedVertex];
      return `s:${row + offset[0]}:${col + offset[1]}`;
    }
    const axial = offsetToAxial(row, col);
    const offset = [[1, 1], [0, 2], [-1, 1], [-1, -1], [0, -2], [1, -1]][normalizedVertex];
    return `h:${(2 * axial.q) + axial.r + offset[0]}:${(3 * axial.r) + offset[1]}`;
  }

  function rememberTopology(cacheKey, topology) {
    if (topologyCache.size >= TOPOLOGY_CACHE_LIMIT) topologyCache.delete(topologyCache.keys().next().value);
    topologyCache.set(cacheKey, topology);
    return topology;
  }

  function invalidTopology(reason, analysis = null) {
    return { valid: false, reason, analysis, total: 0, active: [], edges: [], incident: [], adjacency: [], generators: [] };
  }

  function buildAdjacencyGraph(preset, removed, gluePairs) {
    const lattice = latticeFor(preset);
    const total = preset.rows * preset.cols;
    const removedSet = removed instanceof Set ? removed : new Set(removed || []);
    const active = Array.from({ length: total }, (_, index) => !removedSet.has(index));
    const cuts = new Set();
    (Array.isArray(preset.cutEdges) ? preset.cutEdges : []).forEach((edge) => {
      const left = edgeIndex(edge && edge.left, preset.cols);
      const right = edgeIndex(edge && edge.right, preset.cols);
      if (left >= 0 && right >= 0 && left !== right) cuts.add(cutKey(left, right));
    });
    const glues = new Map();
    gluePairs.forEach((pair) => {
      glues.set(localKey(pair.first.index, pair.first.dir), { other: pair.second, pair });
      glues.set(localKey(pair.second.index, pair.second.dir), { other: pair.first, pair });
    });
    const edges = [];
    const incident = Array.from({ length: total }, () => []);
    const adjacency = Array.from({ length: total }, () => []);
    const seen = new Set();
    const addEdge = (u, uDir, v, vDir, kind, pair) => {
      const key = sidePairKey(u, uDir, v, vDir);
      if (seen.has(key)) return;
      seen.add(key);
      const edge = { id: edges.length, u, uDir, v, vDir, kind, reversed: !!(pair && pair.reversed) };
      edges.push(edge);
      incident[u].push(edge.id);
      if (v !== u) incident[v].push(edge.id);
      adjacency[u].push({ edgeId: edge.id, other: v, sign: 1 });
      adjacency[v].push({ edgeId: edge.id, other: u, sign: -1 });
    };

    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const direct = neighbor(index, dir, preset);
        if (direct != null && active[direct] && !cuts.has(cutKey(index, direct))) {
          addEdge(index, dir, direct, lattice.opposite[dir], 'direct', null);
          continue;
        }
        const glued = glues.get(localKey(index, dir));
        if (!glued || !active[glued.other.index]) continue;
        addEdge(index, dir, glued.other.index, glued.other.dir, 'glued', glued.pair);
      }
    }
    incident.forEach((ids) => ids.sort((left, right) => left - right));
    adjacency.forEach((items) => items.sort((left, right) => left.edgeId - right.edgeId || left.other - right.other));
    return { active, edges, incident, adjacency };
  }

  function assignEdgeSignatures(topology) {
    const visited = Array(topology.total).fill(false);
    const treeAdjacency = Array.from({ length: topology.total }, () => []);
    for (let root = 0; root < topology.total; root += 1) {
      if (!topology.active[root] || visited[root]) continue;
      visited[root] = true;
      const queue = [root];
      for (let offset = 0; offset < queue.length; offset += 1) {
        const current = queue[offset];
        topology.incident[current].forEach((edgeId) => {
          const edge = topology.edges[edgeId];
          const next = edge.u === current ? edge.v : edge.u;
          if (next === current || visited[next]) return;
          visited[next] = true;
          topology.treeEdges.add(edgeId);
          treeAdjacency[current].push({ edgeId, other: next });
          treeAdjacency[next].push({ edgeId, other: current });
          queue.push(next);
        });
      }
    }
    topology.signatures = topology.edges.map(() => zeroVector(topology));
    topology.edges.forEach((edge) => {
      if (topology.treeEdges.has(edge.id)) return;
      const traversals = [{ edgeId: edge.id, from: edge.u, to: edge.v }]
        .concat(treePath(treeAdjacency, edge.v, edge.u));
      const arcLoop = traversalsToArcLoop(topology, traversals);
      const classified = BackgroundHomology.classifyArcLoop(topology.analysis, arcLoop);
      if (!classified.valid) {
        throw new Error(classified.reason || `Could not classify Hex adjacency ${edge.id}.`);
      }
      topology.signatures[edge.id] = coordinatesFromClassification(topology, classified);
    });
  }

  function treePath(treeAdjacency, from, to) {
    if (from === to) return [];
    const previous = Array(treeAdjacency.length).fill(null);
    previous[from] = { vertex: from, edgeId: -1 };
    const queue = [from];
    for (let offset = 0; offset < queue.length; offset += 1) {
      const current = queue[offset];
      if (current === to) break;
      treeAdjacency[current].forEach((step) => {
        if (previous[step.other]) return;
        previous[step.other] = { vertex: current, edgeId: step.edgeId };
        queue.push(step.other);
      });
    }
    if (!previous[to]) throw new Error('The tile spanning forest is disconnected.');
    const result = [];
    for (let current = to; current !== from;) {
      const step = previous[current];
      result.push({ edgeId: step.edgeId, from: step.vertex, to: current });
      current = step.vertex;
    }
    return result.reverse();
  }

  function traversalsToArcLoop(topology, traversals) {
    if (!traversals.length) return [];
    return traversals.map((traversal, index) => {
      const previous = traversals[(index - 1 + traversals.length) % traversals.length];
      const incoming = traversalLocalSide(topology.edges[previous.edgeId], previous.from, previous.to, false);
      const outgoing = traversalLocalSide(topology.edges[traversal.edgeId], traversal.from, traversal.to, true);
      if (previous.to !== traversal.from || incoming == null || outgoing == null || incoming === outgoing) {
        throw new Error('The tile adjacency loop is not a valid interior arc loop.');
      }
      return { index: traversal.from, fromDir: incoming, toDir: outgoing };
    });
  }

  function traversalLocalSide(edge, from, to, outgoing) {
    if (!edge) return null;
    if (edge.u === from && edge.v === to) return outgoing ? edge.uDir : edge.vDir;
    if (edge.v === from && edge.u === to) return outgoing ? edge.vDir : edge.uDir;
    return null;
  }

  function safeBigIntNumber(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : 0;
  }

  function coordinatesFromClassification(topology, classified) {
    const byId = new Map((classified.coordinates || []).map((coordinate) => [coordinate.id, coordinate.coefficient]));
    return topology.generators.map((generator) => {
      const value = byId.get(generator.id) || 0n;
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error('A Hex homology coordinate exceeds safe integer range.');
      return number;
    });
  }

  function zeroVector(topology) {
    return Array(topology.generators.length).fill(0);
  }

  function normalizeVector(topology, vector) {
    return topology.generators.map((generator, index) => {
      const value = Number(vector && vector[index]);
      const integer = Number.isSafeInteger(value) ? value : 0;
      if (generator.kind !== 'torsion') return integer;
      return modulo(integer, generator.order);
    });
  }

  function addVectors(topology, left, right) {
    return normalizeVector(topology, topology.generators.map((_, index) => (left[index] || 0) + (right[index] || 0)));
  }

  function subtractVectors(topology, left, right) {
    return normalizeVector(topology, topology.generators.map((_, index) => (left[index] || 0) - (right[index] || 0)));
  }

  function negateVector(topology, vector) {
    return normalizeVector(topology, topology.generators.map((_, index) => -(vector[index] || 0)));
  }

  function isZeroVector(vector) {
    return !(vector || []).some((value) => value !== 0);
  }

  function formatClass(topology, vector) {
    const terms = [];
    normalizeVector(topology, vector).forEach((value, index) => {
      if (!value) return;
      const id = topology.generators[index].id;
      if (value === 1) terms.push(id);
      else if (value === -1) terms.push(`-${id}`);
      else terms.push(`${value}${id}`);
    });
    return terms.length ? terms.join(' + ').replace(/\+ -/g, '- ') : '0';
  }

  function directedSignature(topology, edgeId, from, to) {
    const edge = topology.edges[edgeId];
    const signature = topology.signatures[edgeId] || zeroVector(topology);
    if (edge && edge.u === from && edge.v === to) return signature.slice();
    if (edge && edge.v === from && edge.u === to) return negateVector(topology, signature);
    throw new Error('The requested traversal does not use this tile adjacency.');
  }

  function createRuntime(topology) {
    if (!topology || !topology.valid) throw new Error((topology && topology.reason) || 'Hex topology is unavailable.');
    const createPlayer = () => ({
      parent: Array(topology.total).fill(-1),
      rank: Array(topology.total).fill(0),
      potential: Array.from({ length: topology.total }, () => zeroVector(topology)),
      forest: Array.from({ length: topology.total }, () => [])
    });
    return { topology, players: { red: createPlayer(), blue: createPlayer() } };
  }

  function cloneRuntime(runtime) {
    const topology = runtime.topology;
    const clonePlayer = (player) => ({
      parent: player.parent.slice(),
      rank: player.rank.slice(),
      potential: player.potential.map((vector) => vector.slice()),
      forest: player.forest.map((edges) => edges.map((edge) => ({ ...edge })))
    });
    return { topology, players: { red: clonePlayer(runtime.players.red), blue: clonePlayer(runtime.players.blue) } };
  }

  function playerRuntime(runtime, color) {
    if (!runtime || !runtime.players || !PLAYERS.includes(color)) throw new Error('Unknown Hex player.');
    return runtime.players[color];
  }

  function find(runtime, color, index) {
    const player = playerRuntime(runtime, color);
    if (player.parent[index] < 0) return null;
    if (player.parent[index] === index) return { root: index, potential: zeroVector(runtime.topology) };
    const parent = player.parent[index];
    const above = find(runtime, color, parent);
    const potential = addVectors(runtime.topology, above.potential, player.potential[index]);
    player.parent[index] = above.root;
    player.potential[index] = potential;
    return { root: above.root, potential: potential.slice() };
  }

  function activate(runtime, color, index) {
    const player = playerRuntime(runtime, color);
    if (player.parent[index] >= 0) return false;
    player.parent[index] = index;
    player.rank[index] = 0;
    player.potential[index] = zeroVector(runtime.topology);
    return true;
  }

  function addForestEdge(player, left, right, edgeId) {
    player.forest[left].push({ other: right, edgeId });
    if (left !== right) player.forest[right].push({ other: left, edgeId });
  }

  function forestPath(player, from, to) {
    if (from === to) return [];
    const previous = Array(player.forest.length).fill(null);
    previous[from] = { vertex: from, edgeId: -1 };
    const queue = [from];
    for (let offset = 0; offset < queue.length; offset += 1) {
      const current = queue[offset];
      if (current === to) break;
      player.forest[current].forEach((step) => {
        if (previous[step.other]) return;
        previous[step.other] = { vertex: current, edgeId: step.edgeId };
        queue.push(step.other);
      });
    }
    if (!previous[to]) return null;
    const result = [];
    for (let current = to; current !== from;) {
      const step = previous[current];
      result.push({ edgeId: step.edgeId, from: step.vertex, to: current });
      current = step.vertex;
    }
    return result.reverse();
  }

  function connect(runtime, color, from, to, edgeId) {
    const topology = runtime.topology;
    const player = playerRuntime(runtime, color);
    const left = find(runtime, color, from);
    const right = find(runtime, color, to);
    if (!left || !right) throw new Error('Only active Hex vertices can be connected.');
    const signature = directedSignature(topology, edgeId, from, to);
    if (left.root === right.root) {
      const cycleClass = subtractVectors(topology, addVectors(topology, left.potential, signature), right.potential);
      if (isZeroVector(cycleClass)) return { merged: false, win: false, cycleClass };
      const path = forestPath(player, to, from);
      const traversals = [{ edgeId, from, to }].concat(path || []);
      return {
        merged: false,
        win: true,
        cycleClass,
        classExpression: formatClass(topology, cycleClass),
        witness: { traversals, arcLoop: traversalsToArcLoop(topology, traversals) }
      };
    }

    if (player.rank[left.root] < player.rank[right.root]) {
      player.parent[left.root] = right.root;
      player.potential[left.root] = subtractVectors(topology, right.potential, addVectors(topology, signature, left.potential));
    } else {
      player.parent[right.root] = left.root;
      player.potential[right.root] = subtractVectors(topology, addVectors(topology, left.potential, signature), right.potential);
      if (player.rank[left.root] === player.rank[right.root]) player.rank[left.root] += 1;
    }
    addForestEdge(player, from, to, edgeId);
    return { merged: true, win: false, cycleClass: zeroVector(topology) };
  }

  // `colourAt(index)` must include the newly activated tile before this runs.
  function registerPlacement(runtime, color, index, colourAt) {
    const topology = runtime.topology;
    if (!topology.active[index]) throw new Error('The selected Hex tile is unavailable.');
    if (!activate(runtime, color, index)) throw new Error('The selected Hex tile already belongs to this player.');
    const incident = topology.incident[index] || [];
    for (const edgeId of incident) {
      const edge = topology.edges[edgeId];
      const other = edge.u === index ? edge.v : edge.u;
      if (colourAt(other) !== color) continue;
      const result = connect(runtime, color, index, other, edgeId);
      if (result.win) return result;
    }
    return { merged: false, win: false, cycleClass: zeroVector(topology) };
  }

  return {
    PLAYERS,
    HOMOLOGY_CACHE_VERSION,
    BOUNDARY_GLUE_HOMOLOGY_SCHEME,
    TILE_LOCAL_VERTEX_SCHEME,
    buildTopology,
    topologySnapshot,
    serializeTopology,
    topologyFromPresetHomology,
    topologyFingerprint,
    createRuntime,
    cloneRuntime,
    registerPlacement,
    directedSignature,
    normalizeVector,
    addVectors,
    subtractVectors,
    isZeroVector,
    formatClass,
    traversalsToArcLoop,
    __test: {
      buildAdjacencyGraph,
      treePath,
      forestPath,
      connect,
      snapshotHasSplitCanvasVertex,
      topologyCache
    }
  };
});
