/*
 * Integral cellular homology for glued square and hexagonal mosaic backgrounds.
 *
 * The module deliberately knows nothing about the DOM or canvas.  Mosaic
 * Calculator passes it a small topology snapshot, and the same code can run in
 * a Worker or under Node's test runner.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BackgroundHomology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const LATTICES = {
    square: {
      id: 'square',
      shape: 'square',
      sides: 4,
      opposite: [2, 3, 0, 1],
      dirNames: ['E', 'S', 'W', 'N']
    },
    hexagonal: {
      id: 'hexagonal',
      shape: 'hex',
      sides: 6,
      opposite: [3, 4, 5, 0, 1, 2],
      dirNames: ['E', 'SE', 'SW', 'W', 'NW', 'NE']
    }
  };

  function modulo(value, size) {
    return ((value % size) + size) % size;
  }

  function indexOf(row, col, cols) {
    return row * cols + col;
  }

  function latticeFor(snapshot) {
    const id = snapshot && snapshot.lattice;
    return LATTICES[id] || LATTICES.square;
  }

  function edgeKey(index, dir) {
    return `${index}:${dir}`;
  }

  function cutKey(left, right) {
    return left < right ? `${left}:${right}` : `${right}:${left}`;
  }

  function abs(value) {
    return value < 0n ? -value : value;
  }

  function normalizeSnapshot(source) {
    const input = source && typeof source === 'object' ? source : {};
    const lattice = latticeFor(input);
    const rows = Math.max(0, Math.trunc(Number(input.rows) || 0));
    const cols = Math.max(0, Math.trunc(Number(input.cols) || 0));
    const total = rows * cols;
    const removed = new Set((Array.isArray(input.removedTiles) ? input.removedTiles : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < total));
    const active = Array.isArray(input.activeTiles)
      ? Array.from({ length: total }, (_, index) => !!input.activeTiles[index])
      : Array.from({ length: total }, (_, index) => !removed.has(index));
    const cuts = new Set();
    (Array.isArray(input.cutEdges) ? input.cutEdges : []).forEach((entry) => {
      if (typeof entry === 'string' && /^\d+:\d+$/.test(entry)) {
        cuts.add(entry);
        return;
      }
      const left = Number(entry && (entry.leftIndex ?? entry.left));
      const right = Number(entry && (entry.rightIndex ?? entry.right));
      if (Number.isInteger(left) && Number.isInteger(right) && left >= 0 && right >= 0 && left !== right) {
        cuts.add(cutKey(left, right));
      }
    });
    const normalizeBoundaryEdge = (edge) => {
      if (!edge || typeof edge !== 'object') return null;
      const index = Number(edge.index);
      const dir = Number(edge.dir);
      if (!Number.isInteger(index) || index < 0 || index >= total || !Number.isInteger(dir)) return null;
      return { index, dir: modulo(dir, lattice.sides) };
    };
    const gluedEdges = (Array.isArray(input.gluedEdges) ? input.gluedEdges : [])
      .map((pair) => {
        const first = normalizeBoundaryEdge(pair && pair.first);
        const second = normalizeBoundaryEdge(pair && pair.second);
        if (!first || !second || edgeKey(first.index, first.dir) === edgeKey(second.index, second.dir)) return null;
        return {
          first,
          second,
          reversed: !!(pair && (pair.reversed === true || pair.orientation === 'reversed')),
          group: Number.isInteger(Number(pair && pair.group)) ? Number(pair.group) : null
        };
      })
      .filter(Boolean);
    return { lattice, rows, cols, total, active, cuts, gluedEdges };
  }

  function offsetToAxial(row, col) {
    return { q: col - Math.floor(row / 2), r: row };
  }

  function neighbor(row, col, dir, rows, cols, lattice) {
    if (lattice.shape === 'square') {
      const offsets = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      const delta = offsets[dir];
      const nextRow = row + delta[0];
      const nextCol = col + delta[1];
      if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
      return { row: nextRow, col: nextCol };
    }
    const deltas = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    const axial = offsetToAxial(row, col);
    const delta = deltas[dir];
    const nextRow = axial.r + delta[1];
    const nextCol = axial.q + delta[0] + Math.floor(nextRow / 2);
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return null;
    return { row: nextRow, col: nextCol };
  }

  function logicalVertexKey(index, vertex, normalized) {
    const { lattice, cols } = normalized;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const normalizedVertex = modulo(vertex, lattice.sides);
    if (lattice.shape === 'square') {
      const offsets = [[0, 0], [0, 1], [1, 1], [1, 0]];
      const offset = offsets[normalizedVertex];
      return `s:${row + offset[0]}:${col + offset[1]}`;
    }
    const axial = offsetToAxial(row, col);
    const offsets = [[1, 1], [0, 2], [-1, 1], [-1, -1], [0, -2], [1, -1]];
    const offset = offsets[normalizedVertex];
    return `h:${(2 * axial.q) + axial.r + offset[0]}:${(3 * axial.r) + offset[1]}`;
  }

  function orientedCorners(index, dir, lattice) {
    if (lattice.shape === 'square') {
      return { index, start: modulo(dir + 1, lattice.sides), end: modulo(dir + 2, lattice.sides) };
    }
    return { index, start: modulo(dir - 1, lattice.sides), end: modulo(dir, lattice.sides) };
  }

  function createDisjointSet(size) {
    const parent = Array.from({ length: size }, (_, index) => index);
    const rank = Array(size).fill(0);
    const find = (item) => {
      let node = item;
      while (parent[node] !== node) {
        parent[node] = parent[parent[node]];
        node = parent[node];
      }
      return node;
    };
    const union = (left, right) => {
      let a = find(left);
      let b = find(right);
      if (a === b) return false;
      if (rank[a] < rank[b]) [a, b] = [b, a];
      parent[b] = a;
      if (rank[a] === rank[b]) rank[a] += 1;
      return true;
    };
    return { parent, find, union };
  }

  function isBoundarySide(index, dir, normalized) {
    if (!normalized.active[index]) return false;
    const row = Math.floor(index / normalized.cols);
    const col = index % normalized.cols;
    const next = neighbor(row, col, dir, normalized.rows, normalized.cols, normalized.lattice);
    if (!next) return true;
    const nextIndex = indexOf(next.row, next.col, normalized.cols);
    return !normalized.active[nextIndex] || normalized.cuts.has(cutKey(index, nextIndex));
  }

  function buildCellComplex(source) {
    const normalized = normalizeSnapshot(source);
    const { lattice, rows, cols, total, active, cuts } = normalized;
    const cornerCount = total * lattice.sides;
    const corners = createDisjointSet(cornerCount);
    const cornerId = (index, vertex) => index * lattice.sides + modulo(vertex, lattice.sides);
    const unionSides = (left, right, reversed) => {
      const a = orientedCorners(left.index, left.dir, lattice);
      const b = orientedCorners(right.index, right.dir, lattice);
      corners.union(cornerId(a.index, a.start), cornerId(b.index, reversed ? b.start : b.end));
      corners.union(cornerId(a.index, a.end), cornerId(b.index, reversed ? b.end : b.start));
    };

    const logicalCorners = new Map();
    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      for (let vertex = 0; vertex < lattice.sides; vertex += 1) {
        const key = logicalVertexKey(index, vertex, normalized);
        const id = cornerId(index, vertex);
        if (logicalCorners.has(key)) corners.union(id, logicalCorners.get(key));
        else logicalCorners.set(key, id);
      }
      const row = Math.floor(index / cols);
      const col = index % cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, rows, cols, lattice);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, cols);
        if (index >= nextIndex || !active[nextIndex] || cuts.has(cutKey(index, nextIndex))) continue;
        unionSides({ index, dir }, { index: nextIndex, dir: lattice.opposite[dir] }, false);
      }
    }

    const pairedSides = new Map();
    const attachSidePair = (first, second, reversed, kind, group = null) => {
      if (!first || !second || !isBoundarySide(first.index, first.dir, normalized) || !isBoundarySide(second.index, second.dir, normalized)) return;
      const firstKey = edgeKey(first.index, first.dir);
      const secondKey = edgeKey(second.index, second.dir);
      if (pairedSides.has(firstKey) || pairedSides.has(secondKey)) return;
      pairedSides.set(firstKey, { partner: { ...second }, reversed: !!reversed, kind, group });
      pairedSides.set(secondKey, { partner: { ...first }, reversed: !!reversed, kind, group });
      unionSides(first, second, reversed);
    };
    normalized.gluedEdges.forEach((pair) => attachSidePair(pair.first, pair.second, pair.reversed, 'glued', pair.group));

    const roots = new Map();
    const cornerToVertex = Array(cornerCount).fill(-1);
    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      for (let vertex = 0; vertex < lattice.sides; vertex += 1) {
        const id = cornerId(index, vertex);
        const root = corners.find(id);
        if (!roots.has(root)) roots.set(root, []);
        roots.get(root).push({ index, vertex });
      }
    }
    const vertices = Array.from(roots.values())
      .sort((left, right) => {
        const a = left[0];
        const b = right[0];
        return a.index - b.index || a.vertex - b.vertex;
      })
      .map((vertexCorners, id) => ({ id, label: `V${id + 1}`, corners: vertexCorners }));
    vertices.forEach((vertex) => {
      vertex.corners.forEach((corner) => { cornerToVertex[cornerId(corner.index, corner.vertex)] = vertex.id; });
    });

    // Internal sides are a quotient edge too.  Add them after vertex
    // identification so one side lookup drives every face boundary below.
    const internalPairs = new Map();
    const addInternalPair = (first, second) => {
      const firstKey = edgeKey(first.index, first.dir);
      const secondKey = edgeKey(second.index, second.dir);
      if (internalPairs.has(firstKey) || internalPairs.has(secondKey)) return;
      internalPairs.set(firstKey, { partner: { ...second }, reversed: false, kind: 'internal', group: null });
      internalPairs.set(secondKey, { partner: { ...first }, reversed: false, kind: 'internal', group: null });
    };
    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      const row = Math.floor(index / cols);
      const col = index % cols;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const next = neighbor(row, col, dir, rows, cols, lattice);
        if (!next) continue;
        const nextIndex = indexOf(next.row, next.col, cols);
        if (index >= nextIndex || !active[nextIndex] || cuts.has(cutKey(index, nextIndex))) continue;
        addInternalPair({ index, dir }, { index: nextIndex, dir: lattice.opposite[dir] });
      }
    }

    const sidePairs = new Map([...internalPairs, ...pairedSides]);
    const sideToEdge = new Map();
    const edges = [];
    const vertexForLocalCorner = (index, vertex) => cornerToVertex[cornerId(index, vertex)];
    const localSideEndpoints = (index, dir) => {
      const cornerInfo = orientedCorners(index, dir, lattice);
      return {
        start: vertexForLocalCorner(index, cornerInfo.start),
        end: vertexForLocalCorner(index, cornerInfo.end)
      };
    };

    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const key = edgeKey(index, dir);
        if (sideToEdge.has(key)) continue;
        const side = { index, dir };
        const pair = sidePairs.get(key) || null;
        const endpoints = localSideEndpoints(index, dir);
        const edge = {
          id: edges.length,
          label: `e${edges.length + 1}`,
          source: endpoints.start,
          target: endpoints.end,
          kind: pair ? pair.kind : 'boundary',
          group: pair ? pair.group : null,
          sides: [{ ...side }]
        };
        edges.push(edge);
        sideToEdge.set(key, {
          edge: edge.id,
          sign: 1,
          localStart: endpoints.start,
          localEnd: endpoints.end
        });
        if (pair) {
          const partnerKey = edgeKey(pair.partner.index, pair.partner.dir);
          const partnerEndpoints = localSideEndpoints(pair.partner.index, pair.partner.dir);
          const sign = pair.reversed ? 1 : -1;
          edge.sides.push({ ...pair.partner });
          sideToEdge.set(partnerKey, {
            edge: edge.id,
            sign,
            localStart: partnerEndpoints.start,
            localEnd: partnerEndpoints.end
          });
        }
      }
    }

    const faces = [];
    for (let index = 0; index < total; index += 1) {
      if (!active[index]) continue;
      const chain = new Map();
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const side = sideToEdge.get(edgeKey(index, dir));
        if (!side) continue;
        chain.set(side.edge, (chain.get(side.edge) || 0n) + BigInt(side.sign));
      }
      faces.push({
        id: faces.length,
        tileIndex: index,
        chain: Array.from(chain.entries())
          .filter((entry) => entry[1] !== 0n)
          .map(([edge, coefficient]) => ({ edge, coefficient }))
      });
    }

    // Integral cellular boundary matrices.  The sparse chains on faces and
    // the explicit matrices intentionally coexist: the former is convenient
    // for representatives, while the latter makes the chain complex visible
    // to callers and tests.
    const boundary1 = Array.from({ length: vertices.length }, () => Array(edges.length).fill(0n));
    edges.forEach((edge, edgeIndex) => {
      boundary1[edge.source][edgeIndex] -= 1n;
      boundary1[edge.target][edgeIndex] += 1n;
    });
    const boundary2 = Array.from({ length: edges.length }, () => Array(faces.length).fill(0n));
    faces.forEach((face, faceIndex) => {
      face.chain.forEach(({ edge, coefficient }) => { boundary2[edge][faceIndex] += coefficient; });
    });
    const components = graphComponentCount(vertices.length, edges);
    return {
      lattice: lattice.id,
      rows,
      cols,
      vertices,
      edges,
      faces,
      boundary1,
      boundary2,
      cornerToVertex,
      sideToEdge,
      componentCount: components,
      activeTileCount: faces.length
    };
  }

  function graphComponentCount(vertexCount, edges) {
    if (!vertexCount) return 0;
    const dsu = createDisjointSet(vertexCount);
    edges.forEach((edge) => {
      if (edge.source >= 0 && edge.target >= 0) dsu.union(edge.source, edge.target);
    });
    const roots = new Set();
    for (let index = 0; index < vertexCount; index += 1) roots.add(dsu.find(index));
    return roots.size;
  }

  function zeroVector(length) {
    return Array(length).fill(0n);
  }

  function addScaled(target, source, scale) {
    if (scale === 0n) return target;
    for (let index = 0; index < target.length; index += 1) target[index] += source[index] * scale;
    return target;
  }

  function edgeKindRank(kind) {
    if (kind === 'internal') return 0;
    if (kind === 'boundary') return 1;
    return 2;
  }

  function buildGraphCycleBasis(complex) {
    const ordered = complex.edges.slice().sort((left, right) => (
      edgeKindRank(left.kind) - edgeKindRank(right.kind)
      || left.id - right.id
    ));
    const forest = createDisjointSet(complex.vertices.length);
    const tree = new Set();
    ordered.forEach((edge) => {
      if (edge.source !== edge.target && forest.union(edge.source, edge.target)) tree.add(edge.id);
    });
    const adjacency = Array.from({ length: complex.vertices.length }, () => []);
    complex.edges.forEach((edge) => {
      if (!tree.has(edge.id)) return;
      adjacency[edge.source].push({ vertex: edge.target, edge: edge.id, coefficient: 1n });
      adjacency[edge.target].push({ vertex: edge.source, edge: edge.id, coefficient: -1n });
    });
    adjacency.forEach((items) => items.sort((left, right) => left.edge - right.edge || left.vertex - right.vertex));
    const treePath = (from, to) => {
      if (from === to) return [];
      const queue = [from];
      const previous = Array(complex.vertices.length).fill(null);
      previous[from] = { vertex: from, edge: -1, coefficient: 0n };
      for (let offset = 0; offset < queue.length; offset += 1) {
        const current = queue[offset];
        if (current === to) break;
        adjacency[current].forEach((step) => {
          if (previous[step.vertex]) return;
          previous[step.vertex] = { vertex: current, edge: step.edge, coefficient: step.coefficient };
          queue.push(step.vertex);
        });
      }
      if (!previous[to]) return null;
      const result = [];
      let current = to;
      while (current !== from) {
        const step = previous[current];
        // `coefficient` describes the tree edge from predecessor to current.
        result.push({ edge: step.edge, coefficient: step.coefficient });
        current = step.vertex;
      }
      return result.reverse();
    };
    const nonTreeEdges = complex.edges.filter((edge) => !tree.has(edge.id)).sort((left, right) => left.id - right.id);
    const cycles = nonTreeEdges.map((edge) => {
      const chain = zeroVector(complex.edges.length);
      chain[edge.id] = 1n;
      const returnPath = treePath(edge.target, edge.source);
      if (returnPath === null) throw new Error('spanning forest path is missing');
      returnPath.forEach((step) => { chain[step.edge] += step.coefficient; });
      return { edge: edge.id, chain };
    });
    return { tree, nonTreeEdges, cycles };
  }

  function identity(size) {
    return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => (row === col ? 1n : 0n)));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => row.slice());
  }

  function swapRows(matrix, left, right) {
    if (left !== right) [matrix[left], matrix[right]] = [matrix[right], matrix[left]];
  }

  function swapColumns(matrix, left, right) {
    if (left === right) return;
    matrix.forEach((row) => { [row[left], row[right]] = [row[right], row[left]]; });
  }

  function addRow(matrix, target, source, factor) {
    if (factor === 0n) return;
    for (let column = 0; column < matrix[target].length; column += 1) matrix[target][column] += factor * matrix[source][column];
  }

  function addColumn(matrix, target, source, factor) {
    if (factor === 0n) return;
    matrix.forEach((row) => { row[target] += factor * row[source]; });
  }

  function negateRow(matrix, row) {
    for (let column = 0; column < matrix[row].length; column += 1) matrix[row][column] = -matrix[row][column];
  }

  function negateColumn(matrix, column) {
    matrix.forEach((row) => { row[column] = -row[column]; });
  }

  // U * original * V = diagonal.  U inverse is maintained alongside U so
  // representatives can be returned in the original graph-cycle coordinates.
  function smithNormalForm(input) {
    const rows = input.length;
    const cols = rows ? input[0].length : 0;
    const matrix = cloneMatrix(input);
    const left = identity(rows);
    const leftInverse = identity(rows);
    const right = identity(cols);
    const rowSwap = (a, b) => {
      swapRows(matrix, a, b);
      swapRows(left, a, b);
      swapColumns(leftInverse, a, b);
    };
    const rowAdd = (target, source, factor) => {
      addRow(matrix, target, source, factor);
      addRow(left, target, source, factor);
      // U^{-1} <- U^{-1} (I - factor E_target,source).
      addColumn(leftInverse, source, target, -factor);
    };
    const rowNegate = (row) => {
      negateRow(matrix, row);
      negateRow(left, row);
      negateColumn(leftInverse, row);
    };
    let pivotIndex = 0;
    while (pivotIndex < rows && pivotIndex < cols) {
      let pivot = null;
      for (let row = pivotIndex; row < rows; row += 1) {
        for (let col = pivotIndex; col < cols; col += 1) {
          if (matrix[row][col] === 0n) continue;
          if (!pivot || abs(matrix[row][col]) < abs(matrix[pivot.row][pivot.col])) pivot = { row, col };
        }
      }
      if (!pivot) break;
      rowSwap(pivotIndex, pivot.row);
      swapColumns(matrix, pivotIndex, pivot.col);
      swapColumns(right, pivotIndex, pivot.col);

      let reduced = false;
      while (!reduced) {
        let changed = true;
        while (changed) {
          changed = false;
          for (let row = pivotIndex + 1; row < rows; row += 1) {
            const value = matrix[row][pivotIndex];
            if (value === 0n) continue;
            const divisor = matrix[pivotIndex][pivotIndex];
            const quotient = value / divisor;
            rowAdd(row, pivotIndex, -quotient);
            if (matrix[row][pivotIndex] !== 0n && abs(matrix[row][pivotIndex]) < abs(matrix[pivotIndex][pivotIndex])) {
              rowSwap(row, pivotIndex);
            }
            changed = true;
          }
          for (let col = pivotIndex + 1; col < cols; col += 1) {
            const value = matrix[pivotIndex][col];
            if (value === 0n) continue;
            const divisor = matrix[pivotIndex][pivotIndex];
            const quotient = value / divisor;
            addColumn(matrix, col, pivotIndex, -quotient);
            addColumn(right, col, pivotIndex, -quotient);
            if (matrix[pivotIndex][col] !== 0n && abs(matrix[pivotIndex][col]) < abs(matrix[pivotIndex][pivotIndex])) {
              swapColumns(matrix, col, pivotIndex);
              swapColumns(right, col, pivotIndex);
            }
            changed = true;
          }
        }
        let nonDivisible = null;
        const divisor = matrix[pivotIndex][pivotIndex];
        for (let row = pivotIndex + 1; row < rows && !nonDivisible; row += 1) {
          for (let col = pivotIndex + 1; col < cols; col += 1) {
            if (matrix[row][col] % divisor !== 0n) {
              nonDivisible = { row, col };
              break;
            }
          }
        }
        if (!nonDivisible) {
          reduced = true;
        } else {
          // Inject the offending entry into the pivot row; the Euclidean
          // reduction above then replaces the pivot by the relevant gcd.
          rowAdd(pivotIndex, nonDivisible.row, 1n);
        }
      }
      if (matrix[pivotIndex][pivotIndex] < 0n) rowNegate(pivotIndex);
      pivotIndex += 1;
    }
    const diagonal = [];
    for (let index = 0; index < Math.min(rows, cols); index += 1) diagonal.push(matrix[index][index]);
    return { diagonal, left, leftInverse, right, matrix };
  }

  function multiplyMatrixVector(matrix, vector) {
    return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0n));
  }

  function analyzeCellComplex(complex) {
    const graph = buildGraphCycleBasis(complex);
    const relationMatrix = Array.from({ length: graph.cycles.length }, () => Array(complex.faces.length).fill(0n));
    complex.faces.forEach((face, faceIndex) => {
      face.chain.forEach(({ edge, coefficient }) => {
        const graphIndex = graph.nonTreeEdges.findIndex((entry) => entry.id === edge);
        if (graphIndex >= 0) relationMatrix[graphIndex][faceIndex] += coefficient;
      });
    });
    const snf = smithNormalForm(relationMatrix);
    const rank = snf.diagonal.filter((value) => value !== 0n).length;
    const generators = [];
    let freeNumber = 0;
    let torsionNumber = 0;
    for (let index = 0; index < graph.cycles.length; index += 1) {
      const factor = index < rank ? snf.diagonal[index] : 0n;
      if (index < rank && factor === 1n) continue;
      const graphCoordinates = snf.leftInverse.map((row) => row[index]);
      const edgeChain = zeroVector(complex.edges.length);
      graphCoordinates.forEach((coefficient, graphIndex) => addScaled(edgeChain, graph.cycles[graphIndex].chain, coefficient));
      const torsion = index < rank;
      const id = torsion ? `t${++torsionNumber}` : `a${++freeNumber}`;
      generators.push({
        id,
        kind: torsion ? 'torsion' : 'free',
        order: torsion ? factor : null,
        snfIndex: index,
        graphCoordinates,
        edgeChain
      });
    }
    const freeRank = generators.filter((entry) => entry.kind === 'free').length;
    const torsion = generators.filter((entry) => entry.kind === 'torsion').map((entry) => entry.order);
    return {
      complex,
      graph,
      relationMatrix,
      snf,
      rank,
      generators,
      freeRank,
      torsion,
      group: formatGroup(freeRank, torsion)
    };
  }

  function analyze(source) {
    return analyzeCellComplex(buildCellComplex(source));
  }

  // The knot line work runs through tile interiors, while the displayed
  // generators live in the quotient tile-edge complex.  This subdivision
  // makes both descriptions cellular without changing the background's H_1.
  function buildBarycentricSubdivision(complex) {
    if (!complex) throw new Error('a quotient cell complex is required');
    const vertexCount = complex.vertices.length;
    const edgeCount = complex.edges.length;
    const faceCount = complex.faces.length;
    const vertices = [];
    for (let index = 0; index < vertexCount; index += 1) vertices.push({ id: vertices.length, kind: 'corner', source: index });
    for (let index = 0; index < edgeCount; index += 1) vertices.push({ id: vertices.length, kind: 'midpoint', source: index });
    for (let index = 0; index < faceCount; index += 1) vertices.push({ id: vertices.length, kind: 'center', source: index });
    const midpoint = (edge) => vertexCount + edge;
    const center = (face) => vertexCount + edgeCount + face;
    const edges = [];
    const halfEdges = [];
    const radialBySide = new Map();
    const cornerRadialByFaceCorner = new Map();
    const addEdge = (source, target, meta) => {
      const edge = { id: edges.length, source, target, ...meta };
      edges.push(edge);
      return edge.id;
    };
    complex.edges.forEach((edge) => {
      halfEdges[edge.id] = {
        start: addEdge(edge.source, midpoint(edge.id), { kind: 'half', quotientEdge: edge.id, part: 'start' }),
        end: addEdge(midpoint(edge.id), edge.target, { kind: 'half', quotientEdge: edge.id, part: 'end' })
      };
    });
    const faceByTile = new Map(complex.faces.map((face) => [face.tileIndex, face.id]));
    complex.faces.forEach((face) => {
      const faceCenter = center(face.id);
      const lattice = LATTICES[complex.lattice];
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const side = complex.sideToEdge.get(edgeKey(face.tileIndex, dir));
        if (!side) continue;
        const radial = addEdge(midpoint(side.edge), faceCenter, {
          kind: 'radial', face: face.id, index: face.tileIndex, dir
        });
        radialBySide.set(edgeKey(face.tileIndex, dir), radial);
        const localCorners = orientedCorners(face.tileIndex, dir, lattice);
        [[localCorners.start, side.localStart], [localCorners.end, side.localEnd]].forEach(([localCorner, corner]) => {
          // Local corners must not be merged here: in a quotient face several
          // occurrences can share one quotient vertex but remain distinct
          // barycentric spokes in the attaching polygon.
          const key = `${face.id}:${localCorner}`;
          if (!cornerRadialByFaceCorner.has(key)) {
            cornerRadialByFaceCorner.set(key, addEdge(faceCenter, corner, {
              kind: 'corner-radial', face: face.id, corner
            }));
          }
        });
      }
    });
    const faces = [];
    const addTriangle = (chain) => {
      const combined = new Map();
      chain.forEach(({ edge, coefficient }) => {
        combined.set(edge, (combined.get(edge) || 0n) + coefficient);
      });
      faces.push({ id: faces.length, chain: Array.from(combined.entries())
        .filter((entry) => entry[1] !== 0n)
        .map(([edge, coefficient]) => ({ edge, coefficient })) });
    };
    complex.faces.forEach((face) => {
      const lattice = LATTICES[complex.lattice];
      for (let dir = 0; dir < lattice.sides; dir += 1) {
        const side = complex.sideToEdge.get(edgeKey(face.tileIndex, dir));
        if (!side) continue;
        const localCorners = orientedCorners(face.tileIndex, dir, lattice);
        const radial = radialBySide.get(edgeKey(face.tileIndex, dir));
        const startCorner = cornerRadialByFaceCorner.get(`${face.id}:${localCorners.start}`);
        const endCorner = cornerRadialByFaceCorner.get(`${face.id}:${localCorners.end}`);
        const half = halfEdges[side.edge];
        const localStartToMid = side.sign > 0 ? { edge: half.start, coefficient: 1n } : { edge: half.end, coefficient: -1n };
        const midToLocalEnd = side.sign > 0 ? { edge: half.end, coefficient: 1n } : { edge: half.start, coefficient: -1n };
        addTriangle([
          { edge: startCorner, coefficient: 1n }, localStartToMid, { edge: radial, coefficient: 1n }
        ]);
        addTriangle([
          { edge: radial, coefficient: -1n }, midToLocalEnd, { edge: endCorner, coefficient: -1n }
        ]);
      }
    });
    const boundary2 = Array.from({ length: edges.length }, () => Array(faces.length).fill(0n));
    faces.forEach((face) => face.chain.forEach(({ edge, coefficient }) => { boundary2[edge][face.id] += coefficient; }));
    const subdivisionMap = Array.from({ length: edges.length }, () => Array(edgeCount).fill(0n));
    halfEdges.forEach((half, edge) => {
      subdivisionMap[half.start][edge] = 1n;
      subdivisionMap[half.end][edge] = 1n;
    });
    return {
      vertices,
      edges,
      faces,
      halfEdges,
      radialBySide,
      faceByTile,
      boundary2,
      subdivisionMap
    };
  }

  function solveIntegerSystem(matrix, vector) {
    if (!matrix.length) return vector.every((value) => value === 0n) ? [] : null;
    const columns = matrix[0].length;
    if (vector.length !== matrix.length || matrix.some((row) => row.length !== columns)) return null;
    const snf = smithNormalForm(matrix);
    return solveIntegerSystemFromSmith(snf, vector);
  }

  // Arc-loop classification asks for several reductions against the same
  // subdivision boundary matrix.  The Smith form is the expensive part, so
  // keep the linear solve separate and allow callers to cache that form.
  function solveIntegerSystemFromSmith(snf, vector) {
    if (!snf || !Array.isArray(snf.matrix) || !Array.isArray(snf.left) || !Array.isArray(snf.right)) return null;
    const rows = snf.matrix.length;
    const columns = snf.right.length;
    if (vector.length !== rows) return null;
    const transformed = multiplyMatrixVector(snf.left, vector);
    const solutionInDiagonalCoordinates = Array(columns).fill(0n);
    const limit = Math.min(rows, columns);
    for (let index = 0; index < limit; index += 1) {
      const divisor = snf.matrix[index][index];
      if (divisor === 0n) {
        if (transformed[index] !== 0n) return null;
      } else {
        if (transformed[index] % divisor !== 0n) return null;
        solutionInDiagonalCoordinates[index] = transformed[index] / divisor;
      }
    }
    for (let index = limit; index < transformed.length; index += 1) {
      if (transformed[index] !== 0n) return null;
    }
    return multiplyMatrixVector(snf.right, solutionInDiagonalCoordinates);
  }

  function classifyChain(analysis, sourceChain) {
    if (!analysis || !analysis.complex) return { valid: false, reason: 'compute homology first' };
    const chain = Array.from({ length: analysis.complex.edges.length }, (_, index) => BigInt((sourceChain || [])[index] || 0));
    if (!isCycle(chain, analysis.complex)) return { valid: false, reason: 'the selected chain does not define a cellular cycle' };
    const graphCoordinates = analysis.graph.nonTreeEdges.map((edge) => chain[edge.id]);
    const smithCoordinates = multiplyMatrixVector(analysis.snf.left, graphCoordinates);
    const coordinates = [];
    analysis.generators.forEach((generator) => {
      let value = smithCoordinates[generator.snfIndex];
      if (generator.kind === 'torsion') value = moduloBigInt(value, generator.order);
      coordinates.push({ id: generator.id, kind: generator.kind, order: generator.order, coefficient: value });
    });
    return { valid: true, chain, graphCoordinates, smithCoordinates, coordinates, expression: formatExpression(coordinates) };
  }

  // arcLoop entries are oriented interior tile arcs: { index, fromDir, toDir }.
  // They meet at quotient-edge midpoints, including distant glued seams.
  function classifyArcLoop(analysis, arcLoop) {
    if (!analysis || !analysis.complex) return { valid: false, reason: 'compute homology first' };
    const arcs = Array.isArray(arcLoop) ? arcLoop : [];
    if (!arcs.length) return { valid: false, reason: 'select a closed knot component' };
    const subdivision = analysis.subdivision || buildBarycentricSubdivision(analysis.complex);
    analysis.subdivision = subdivision;
    const chain = zeroVector(subdivision.edges.length);
    const lattice = LATTICES[analysis.complex.lattice];
    const normalizedArcs = [];
    for (const arc of arcs) {
      const index = Number(arc && arc.index);
      const fromDir = modulo(Number(arc && arc.fromDir), lattice.sides);
      const toDir = modulo(Number(arc && arc.toDir), lattice.sides);
      const from = subdivision.radialBySide.get(edgeKey(index, fromDir));
      const to = subdivision.radialBySide.get(edgeKey(index, toDir));
      if (!Number.isInteger(index) || from == null || to == null || fromDir === toDir) {
        return { valid: false, reason: 'the selected knot contains an invalid tile arc' };
      }
      chain[from] += 1n;
      chain[to] -= 1n;
      normalizedArcs.push({ index, fromDir, toDir });
    }
    const boundary = zeroVector(subdivision.vertices.length);
    chain.forEach((coefficient, edge) => {
      if (coefficient === 0n) return;
      boundary[subdivision.edges[edge].source] -= coefficient;
      boundary[subdivision.edges[edge].target] += coefficient;
    });
    if (boundary.some((value) => value !== 0n)) return { valid: false, reason: 'the selected knot component is not closed in the quotient' };
    if (!subdivision.arcReductionSmith) {
      const relationMatrix = subdivision.subdivisionMap.map((row, rowIndex) => row.concat(subdivision.boundary2[rowIndex]));
      subdivision.arcReductionSmith = smithNormalForm(relationMatrix);
    }
    const solution = solveIntegerSystemFromSmith(subdivision.arcReductionSmith, chain);
    if (!solution) return { valid: false, reason: 'could not reduce the knot to the quotient cell complex' };
    const quotientChain = solution.slice(0, analysis.complex.edges.length);
    const classified = classifyChain(analysis, quotientChain);
    return {
      ...classified,
      arcLoop: normalizedArcs,
      subdivisionChain: chain,
      quotientChain
    };
  }

  function formatGroup(freeRank, torsion) {
    const terms = [];
    if (freeRank === 1) terms.push('Z');
    else if (freeRank > 1) terms.push(`Z^${freeRank}`);
    torsion.forEach((order) => terms.push(`Z/${order.toString()}`));
    return terms.length ? terms.join(' ⊕ ') : '0';
  }

  function isCycle(chain, complex) {
    const boundary = zeroVector(complex.vertices.length);
    chain.forEach((coefficient, edgeIndex) => {
      if (coefficient === 0n) return;
      const edge = complex.edges[edgeIndex];
      if (!edge) return;
      boundary[edge.source] -= coefficient;
      boundary[edge.target] += coefficient;
    });
    return boundary.every((value) => value === 0n);
  }

  function normalizePathStep(step, complex) {
    if (!step || typeof step !== 'object') return null;
    const index = Number(step.index);
    const dir = Number(step.dir);
    if (!Number.isInteger(index) || !Number.isInteger(dir)) return null;
    const side = complex.sideToEdge.get(edgeKey(index, modulo(dir, LATTICES[complex.lattice].sides)));
    if (!side) return null;
    const direction = step.direction === -1 || step.reverse === true ? -1 : 1;
    return {
      edge: side.edge,
      coefficient: BigInt(side.sign * direction),
      start: direction > 0 ? side.localStart : side.localEnd,
      end: direction > 0 ? side.localEnd : side.localStart,
      index,
      dir: modulo(dir, LATTICES[complex.lattice].sides),
      direction
    };
  }

  function classifyPath(analysis, path) {
    if (!analysis || !analysis.complex) return { valid: false, reason: 'compute homology first' };
    const steps = (Array.isArray(path) ? path : []).map((step) => normalizePathStep(step, analysis.complex));
    if (!steps.length || steps.some((step) => !step)) return { valid: false, reason: 'select one or more valid tile edges' };
    for (let index = 1; index < steps.length; index += 1) {
      if (steps[index - 1].end !== steps[index].start) return { valid: false, reason: 'the selected edges are not a continuous quotient path' };
    }
    if (steps[steps.length - 1].end !== steps[0].start) return { valid: false, reason: 'the selected path is not closed in the quotient' };
    const chain = zeroVector(analysis.complex.edges.length);
    steps.forEach((step) => { chain[step.edge] += step.coefficient; });
    const classified = classifyChain(analysis, chain);
    return classified.valid ? { ...classified, path: steps } : classified;
  }

  function moduloBigInt(value, modulus) {
    const result = value % modulus;
    return result < 0n ? result + modulus : result;
  }

  function formatExpression(coordinates) {
    const terms = coordinates
      .filter((entry) => entry.coefficient !== 0n)
      .map((entry) => {
        const value = entry.coefficient;
        if (value === 1n) return entry.id;
        if (value === -1n) return `-${entry.id}`;
        return `${value.toString()}${entry.id}`;
      });
    return terms.length ? terms.join(' + ').replace(/\+ -/g, '- ') : '0';
  }

  function serialize(value) {
    if (typeof value === 'bigint') return value.toString();
    if (Array.isArray(value)) return value.map(serialize);
    if (value && typeof value === 'object') {
      const result = {};
      Object.keys(value).forEach((key) => {
        if (key === 'sideToEdge') return;
        result[key] = serialize(value[key]);
      });
      return result;
    }
    return value;
  }

  return {
    LATTICES,
    buildCellComplex,
    analyzeCellComplex,
    analyze,
    buildBarycentricSubdivision,
    classifyChain,
    classifyArcLoop,
    classifyPath,
    formatGroup,
    formatExpression,
    isCycle,
    serialize
  };
});
