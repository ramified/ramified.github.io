(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MosaicHyperbolicMetric = api;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  'use strict';

  const VERSION = 'mosaic-hyperbolic-1';
  const TAU = Math.PI * 2;
  const EPS = 1e-12;

  class UnionFind {
    constructor(size) {
      this.parent = Array.from({ length: size }, (_, index) => index);
      this.rank = new Uint8Array(size);
    }
    find(value) {
      let root = value;
      while (this.parent[root] !== root) root = this.parent[root];
      while (this.parent[value] !== value) {
        const next = this.parent[value];
        this.parent[value] = root;
        value = next;
      }
      return root;
    }
    union(a, b) {
      a = this.find(a);
      b = this.find(b);
      if (a === b) return;
      if (this.rank[a] < this.rank[b]) [a, b] = [b, a];
      this.parent[b] = a;
      if (this.rank[a] === this.rank[b]) this.rank[a] += 1;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function refinementFor(tileCount, choice) {
    if (choice === 'auto' || choice == null) return tileCount <= 100 ? 3 : 2;
    return clamp(Math.round(Number(choice) || 2), 1, 4);
  }

  function polygonVertices(lattice) {
    if (lattice === 'square') {
      return [
        { x: 1, y: -1 }, { x: 1, y: 1 },
        { x: -1, y: 1 }, { x: -1, y: -1 }
      ];
    }
    // Ordered so side d is the calculator's oriented edge d: corner d-1 -> d.
    return Array.from({ length: 6 }, (_, index) => {
      const angle = (-30 + index * 60) * Math.PI / 180;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    });
  }

  function localKey(point) {
    return `${Math.round(point.x * 1e9)},${Math.round(point.y * 1e9)}`;
  }

  function triangleArea(a, b, c) {
    return Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) * 0.5;
  }

  function flatAngles(a, b, c) {
    const points = [a, b, c];
    return points.map((point, index) => {
      const q = points[(index + 1) % 3];
      const r = points[(index + 2) % 3];
      const ux = q.x - point.x;
      const uy = q.y - point.y;
      const vx = r.x - point.x;
      const vy = r.y - point.y;
      return Math.acos(clamp((ux * vx + uy * vy) / Math.max(EPS, Math.hypot(ux, uy) * Math.hypot(vx, vy)), -1, 1));
    });
  }

  function buildMesh(surface, refinementChoice) {
    if (!surface || !Array.isArray(surface.tiles)) throw new Error('A tile surface snapshot is required.');
    const vertices = polygonVertices(surface.lattice);
    const sides = vertices.length;
    const refinement = refinementFor(surface.tiles.length, refinementChoice);
    // A level is a refinement count, so even level 1 contains an interior edge
    // vertex. This avoids non-simplicial quotient triangles under self-gluing.
    const subdivision = refinement + 1;
    const tileMaps = new Map();
    const rawPoints = [];
    const rawTriangles = [];
    const tileByIndex = new Map();
    surface.tiles.forEach((tile) => {
      if (!tile || !Number.isInteger(tile.index) || tileByIndex.has(tile.index)) throw new Error('Malformed tile or duplicate tile index.');
      tileByIndex.set(tile.index, tile);
    });
    surface.tiles.forEach((tile) => {
      (Array.isArray(tile.links) ? tile.links : []).forEach((link, dir) => {
        if (!link) return;
        const partner = tileByIndex.get(link.index);
        const reciprocal = partner && Array.isArray(partner.links) ? partner.links[link.dir] : null;
        if (
          dir >= sides
          || !partner
          || !Number.isInteger(link.dir)
          || link.dir < 0
          || link.dir >= sides
          || !reciprocal
          || reciprocal.index !== tile.index
          || reciprocal.dir !== dir
          || !!reciprocal.sameDirection !== !!link.sameDirection
        ) throw new Error('Malformed or non-reciprocal glued-edge data.');
      });
    });

    function rawVertex(tileIndex, point) {
      let map = tileMaps.get(tileIndex);
      if (!map) {
        map = new Map();
        tileMaps.set(tileIndex, map);
      }
      const key = localKey(point);
      if (!map.has(key)) {
        map.set(key, rawPoints.length);
        rawPoints.push({ tileIndex, x: point.x, y: point.y });
      }
      return map.get(key);
    }

    surface.tiles.forEach((tile) => {
      for (let dir = 0; dir < sides; dir += 1) {
        const start = vertices[dir];
        const end = vertices[(dir + 1) % sides];
        const grid = new Map();
        const at = (i, j) => {
          const key = `${i}:${j}`;
          if (!grid.has(key)) {
            grid.set(key, rawVertex(tile.index, {
              x: (i * start.x + j * end.x) / subdivision,
              y: (i * start.y + j * end.y) / subdivision
            }));
          }
          return grid.get(key);
        };
        for (let i = 0; i < subdivision; i += 1) {
          for (let j = 0; j < subdivision - i; j += 1) {
            rawTriangles.push({ tileIndex: tile.index, ids: [at(i, j), at(i + 1, j), at(i, j + 1)] });
            if (i + j <= subdivision - 2) {
              rawTriangles.push({ tileIndex: tile.index, ids: [at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)] });
            }
          }
        }
      }
    });

    const union = new UnionFind(rawPoints.length);
    const sideRawVertex = (tileIndex, dir, step) => {
      const start = vertices[dir];
      const end = vertices[(dir + 1) % sides];
      return tileMaps.get(tileIndex).get(localKey({
        x: ((subdivision - step) * start.x + step * end.x) / subdivision,
        y: ((subdivision - step) * start.y + step * end.y) / subdivision
      }));
    };
    surface.tiles.forEach((tile) => {
      const links = Array.isArray(tile.links) ? tile.links : [];
      for (let dir = 0; dir < sides; dir += 1) {
        const link = links[dir];
        if (!link || !tileByIndex.has(link.index)) continue;
        if (tile.index > link.index || (tile.index === link.index && dir > link.dir)) continue;
        for (let step = 0; step <= subdivision; step += 1) {
          const otherStep = link.sameDirection ? step : subdivision - step;
          union.union(sideRawVertex(tile.index, dir, step), sideRawVertex(link.index, link.dir, otherStep));
        }
      }
    });

    const rootToVertex = new Map();
    const rawToVertex = new Int32Array(rawPoints.length);
    const meshVertices = [];
    rawPoints.forEach((point, rawIndex) => {
      const root = union.find(rawIndex);
      if (!rootToVertex.has(root)) {
        rootToVertex.set(root, meshVertices.length);
        meshVertices.push({ id: meshVertices.length, boundary: false, occurrences: [] });
      }
      const id = rootToVertex.get(root);
      rawToVertex[rawIndex] = id;
      meshVertices[id].occurrences.push({ tileIndex: point.tileIndex, x: point.x, y: point.y });
    });

    surface.tiles.forEach((tile) => {
      const links = Array.isArray(tile.links) ? tile.links : [];
      for (let dir = 0; dir < sides; dir += 1) {
        if (links[dir]) continue;
        for (let step = 0; step <= subdivision; step += 1) {
          meshVertices[rawToVertex[sideRawVertex(tile.index, dir, step)]].boundary = true;
        }
      }
    });

    const triangles = rawTriangles.map((triangle, index) => {
      const ids = triangle.ids.map((raw) => rawToVertex[raw]);
      const local = triangle.ids.map((raw) => ({ x: rawPoints[raw].x, y: rawPoints[raw].y }));
      const area = triangleArea(local[0], local[1], local[2]);
      return { id: index, tileIndex: triangle.tileIndex, ids, local, area, flatAngles: flatAngles(local[0], local[1], local[2]) };
    }).filter((triangle) => new Set(triangle.ids).size === 3 && triangle.area > EPS);
    triangles.forEach((triangle, index) => { triangle.id = index; });

    const edgeMap = new Map();
    triangles.forEach((triangle) => {
      for (let localEdge = 0; localEdge < 3; localEdge += 1) {
        const a = triangle.ids[localEdge];
        const b = triangle.ids[(localEdge + 1) % 3];
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!edgeMap.has(key)) {
          const pa = triangle.local[localEdge];
          const pb = triangle.local[(localEdge + 1) % 3];
          edgeMap.set(key, { a: Math.min(a, b), b: Math.max(a, b), flatLength: Math.hypot(pb.x - pa.x, pb.y - pa.y), triangles: [] });
        }
        edgeMap.get(key).triangles.push(triangle.id);
      }
    });
    const edges = Array.from(edgeMap.values());
    const meanLength = edges.reduce((sum, edge) => sum + edge.flatLength, 0) / Math.max(1, edges.length);
    edges.forEach((edge, index) => {
      edge.id = index;
      edge.lambda0 = Math.max(1e-8, edge.flatLength / Math.max(EPS, meanLength) * 0.25);
    });
    const edgeIndex = new Map(edges.map((edge) => [`${edge.a}:${edge.b}`, edge.id]));
    triangles.forEach((triangle) => {
      triangle.edgeIds = [
        edgeIndex.get(pairKey(triangle.ids[1], triangle.ids[2])),
        edgeIndex.get(pairKey(triangle.ids[2], triangle.ids[0])),
        edgeIndex.get(pairKey(triangle.ids[0], triangle.ids[1]))
      ];
    });
    const angleSums = new Float64Array(meshVertices.length);
    const mass = new Float64Array(meshVertices.length);
    triangles.forEach((triangle) => triangle.ids.forEach((id, local) => {
      angleSums[id] += triangle.flatAngles[local];
      mass[id] += triangle.area / 3;
    }));
    meshVertices.forEach((vertex, id) => {
      vertex.targetAngle = vertex.boundary ? Math.PI : TAU;
      vertex.flatAngle = angleSums[id];
      vertex.kappa = vertex.targetAngle - vertex.flatAngle;
      vertex.mass = mass[id];
    });
    const tileTriangles = {};
    triangles.forEach((triangle) => {
      if (!tileTriangles[triangle.tileIndex]) tileTriangles[triangle.tileIndex] = [];
      tileTriangles[triangle.tileIndex].push(triangle.id);
    });
    const chi = meshVertices.length - edges.length + triangles.length;
    const result = {
      version: VERSION,
      lattice: surface.lattice,
      refinement,
      vertices: meshVertices,
      edges,
      triangles,
      tileTriangles,
      eulerCharacteristic: chi,
      flatArea: triangles.reduce((sum, triangle) => sum + triangle.area, 0)
    };
    return result;
  }

  function pairKey(a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
  }

  function localPointForTriangleVertex(triangle, vertexId) {
    const local = triangle.ids.indexOf(vertexId);
    return local >= 0 ? triangle.local[local] : null;
  }

  function lambdaAtEdge(mesh, u, a, b) {
    const edge = mesh.edges.find((candidate) => candidate.a === Math.min(a, b) && candidate.b === Math.max(a, b));
    if (!edge) return null;
    return Math.exp(clamp((u[a] + u[b]) * 0.5, -24, 24)) * edge.lambda0;
  }

  function rebuildMeshEdgesAfterFlip(mesh, newPairKey, newLambda0) {
    const previous = new Map(mesh.edges.map((edge) => [pairKey(edge.a, edge.b), edge.lambda0]));
    previous.set(newPairKey, newLambda0);
    const edgeMap = new Map();
    mesh.triangles.forEach((triangle) => {
      for (let opposite = 0; opposite < 3; opposite += 1) {
        const a = triangle.ids[(opposite + 1) % 3];
        const b = triangle.ids[(opposite + 2) % 3];
        const key = pairKey(a, b);
        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            a: Math.min(a, b),
            b: Math.max(a, b),
            lambda0: previous.get(key),
            flatLength: Math.hypot(
              triangle.local[(opposite + 1) % 3].x - triangle.local[(opposite + 2) % 3].x,
              triangle.local[(opposite + 1) % 3].y - triangle.local[(opposite + 2) % 3].y
            ),
            triangles: []
          });
        }
        edgeMap.get(key).triangles.push(triangle.id);
      }
    });
    mesh.edges = Array.from(edgeMap.values());
    const edgeIndex = new Map();
    mesh.edges.forEach((edge, index) => {
      edge.id = index;
      if (!(edge.lambda0 > 0)) edge.lambda0 = Math.max(1e-8, edge.flatLength * 0.25);
      edgeIndex.set(pairKey(edge.a, edge.b), index);
    });
    mesh.triangles.forEach((triangle) => {
      triangle.edgeIds = [
        edgeIndex.get(pairKey(triangle.ids[1], triangle.ids[2])),
        edgeIndex.get(pairKey(triangle.ids[2], triangle.ids[0])),
        edgeIndex.get(pairKey(triangle.ids[0], triangle.ids[1]))
      ];
    });
  }

  function refreshFlatMeshData(mesh) {
    const angleSums = new Float64Array(mesh.vertices.length);
    const mass = new Float64Array(mesh.vertices.length);
    mesh.triangles.forEach((triangle) => {
      triangle.area = triangleArea(triangle.local[0], triangle.local[1], triangle.local[2]);
      triangle.flatAngles = flatAngles(triangle.local[0], triangle.local[1], triangle.local[2]);
      triangle.ids.forEach((id, local) => {
        angleSums[id] += triangle.flatAngles[local];
        mass[id] += triangle.area / 3;
      });
    });
    mesh.vertices.forEach((vertex, id) => {
      vertex.flatAngle = angleSums[id];
      vertex.kappa = vertex.targetAngle - vertex.flatAngle;
      vertex.mass = mass[id];
    });
  }

  function performIntrinsicDelaunayFlips(mesh, u, initialEvaluation, limit = 64) {
    let evaluation = initialEvaluation;
    let flips = 0;
    while (evaluation && flips < limit) {
      let candidate = null;
      for (const edge of mesh.edges) {
        if (edge.triangles.length !== 2) continue;
        const first = mesh.triangles[edge.triangles[0]];
        const second = mesh.triangles[edge.triangles[1]];
        // Keep tile seams in the interpolation atlas. Across a seam the same
        // intrinsic flip would need a developed neighbor chart.
        if (!first || !second || first.tileIndex !== second.tileIndex) continue;
        const firstOpposite = first.edgeIds.indexOf(edge.id);
        const secondOpposite = second.edgeIds.indexOf(edge.id);
        if (firstOpposite < 0 || secondOpposite < 0) continue;
        const angleSum = evaluation.triangleAngles[first.id][firstOpposite]
          + evaluation.triangleAngles[second.id][secondOpposite];
        if (angleSum <= Math.PI + 1e-8) continue;
        const c = first.ids[firstOpposite];
        const d = second.ids[secondOpposite];
        if (c === d || mesh.edges.some((item) => item.a === Math.min(c, d) && item.b === Math.max(c, d))) continue;
        candidate = { edge, first, second, c, d };
        break;
      }
      if (!candidate) break;
      const { edge, first, second, c, d } = candidate;
      const a = edge.a;
      const b = edge.b;
      const pointMap = new Map();
      [first, second].forEach((triangle) => triangle.ids.forEach((id, local) => pointMap.set(id, triangle.local[local])));
      const nextFirstIds = [c, d, a];
      const nextSecondIds = [d, c, b];
      const nextFirstLocal = nextFirstIds.map((id) => pointMap.get(id));
      const nextSecondLocal = nextSecondIds.map((id) => pointMap.get(id));
      if (!nextFirstLocal.every(Boolean) || !nextSecondLocal.every(Boolean)) break;
      const oldArea = first.area + second.area;
      const nextArea = triangleArea(...nextFirstLocal) + triangleArea(...nextSecondLocal);
      if (Math.abs(oldArea - nextArea) > Math.max(1e-8, oldArea * 1e-7)) break;
      const lambdaCA = lambdaAtEdge(mesh, u, c, a);
      const lambdaAD = lambdaAtEdge(mesh, u, a, d);
      const lambdaCB = lambdaAtEdge(mesh, u, c, b);
      const lambdaBD = lambdaAtEdge(mesh, u, b, d);
      const lambdaAB = lambdaAtEdge(mesh, u, a, b);
      if (![lambdaCA, lambdaAD, lambdaCB, lambdaBD, lambdaAB].every((value) => value > 0)) break;
      const lambdaCD = ((lambdaCA * lambdaBD) + (lambdaCB * lambdaAD)) / lambdaAB;
      const lambda0CD = lambdaCD / Math.exp(clamp((u[c] + u[d]) * 0.5, -24, 24));
      first.ids = nextFirstIds;
      first.local = nextFirstLocal;
      second.ids = nextSecondIds;
      second.local = nextSecondLocal;
      rebuildMeshEdgesAfterFlip(mesh, pairKey(c, d), lambda0CD);
      refreshFlatMeshData(mesh);
      evaluation = discreteResidual(mesh, u, true);
      flips += 1;
    }
    return { evaluation, flips };
  }

  function edgeLengths(mesh, u) {
    const lengths = new Float64Array(mesh.edges.length);
    for (let index = 0; index < mesh.edges.length; index += 1) {
      const edge = mesh.edges[index];
      const exponent = clamp((u[edge.a] + u[edge.b]) * 0.5, -24, 24);
      lengths[index] = 2 * Math.asinh(Math.exp(exponent) * edge.lambda0);
    }
    return lengths;
  }

  function hyperbolicTriangleAngles(lengths, triangle) {
    const a = lengths[triangle.edgeIds[0]];
    const b = lengths[triangle.edgeIds[1]];
    const c = lengths[triangle.edgeIds[2]];
    if (!(a + b > c + EPS && b + c > a + EPS && c + a > b + EPS)) return null;
    const sides = [a, b, c];
    const angles = [];
    for (let index = 0; index < 3; index += 1) {
      const opposite = sides[index];
      const adjacentA = sides[(index + 1) % 3];
      const adjacentB = sides[(index + 2) % 3];
      const denominator = Math.sinh(adjacentA) * Math.sinh(adjacentB);
      if (!(denominator > EPS)) return null;
      const cosine = (Math.cosh(adjacentA) * Math.cosh(adjacentB) - Math.cosh(opposite)) / denominator;
      angles.push(Math.acos(clamp(cosine, -1, 1)));
    }
    return angles;
  }

  function discreteResidual(mesh, u, includeAngles) {
    const lengths = edgeLengths(mesh, u);
    const sums = new Float64Array(mesh.vertices.length);
    const triangleAngles = includeAngles ? new Array(mesh.triangles.length) : null;
    for (let index = 0; index < mesh.triangles.length; index += 1) {
      const triangle = mesh.triangles[index];
      const angles = hyperbolicTriangleAngles(lengths, triangle);
      if (!angles) return null;
      if (triangleAngles) triangleAngles[index] = angles;
      for (let local = 0; local < 3; local += 1) sums[triangle.ids[local]] += angles[local];
    }
    const residual = new Float64Array(mesh.vertices.length);
    for (let index = 0; index < residual.length; index += 1) residual[index] = mesh.vertices[index].targetAngle - sums[index];
    return { residual, lengths, triangleAngles };
  }

  function residualNorm(values) {
    let max = 0;
    let square = 0;
    for (const value of values) {
      max = Math.max(max, Math.abs(value));
      square += value * value;
    }
    return { max, rms: Math.sqrt(square / Math.max(1, values.length)) };
  }

  function addSparse(rows, i, j, value) {
    rows[i].set(j, (rows[i].get(j) || 0) + value);
  }

  function discreteJacobian(mesh, u, base) {
    const rows = Array.from({ length: mesh.vertices.length }, () => new Map());
    const h = 2e-5;
    for (let triangleIndex = 0; triangleIndex < mesh.triangles.length; triangleIndex += 1) {
      const triangle = mesh.triangles[triangleIndex];
      const baseAngles = base.triangleAngles[triangleIndex];
      for (let varied = 0; varied < 3; varied += 1) {
        const vertexId = triangle.ids[varied];
        u[vertexId] += h;
        const lengths = edgeLengthsForTriangle(mesh, u, triangle);
        const plusAngles = hyperbolicTriangleAnglesLocal(lengths);
        u[vertexId] -= h;
        if (!plusAngles) continue;
        for (let angle = 0; angle < 3; angle += 1) {
          addSparse(rows, triangle.ids[angle], vertexId, -(plusAngles[angle] - baseAngles[angle]) / h);
        }
      }
    }
    // Numerical differentiation is almost symmetric; explicit symmetrization makes PCG deterministic.
    for (let i = 0; i < rows.length; i += 1) {
      const neighbors = Array.from(rows[i].keys());
      neighbors.forEach((j) => {
        if (j < i) return;
        const value = ((rows[i].get(j) || 0) + (rows[j].get(i) || 0)) * 0.5;
        rows[i].set(j, value);
        rows[j].set(i, value);
      });
      rows[i].set(i, Math.max(1e-8, rows[i].get(i) || 0) + 1e-9);
    }
    return rows;
  }

  function edgeLengthsForTriangle(mesh, u, triangle) {
    return triangle.edgeIds.map((edgeId) => {
      const edge = mesh.edges[edgeId];
      return 2 * Math.asinh(Math.exp(clamp((u[edge.a] + u[edge.b]) * 0.5, -24, 24)) * edge.lambda0);
    });
  }

  function hyperbolicTriangleAnglesLocal(sides) {
    if (!(sides[0] + sides[1] > sides[2] + EPS && sides[1] + sides[2] > sides[0] + EPS && sides[2] + sides[0] > sides[1] + EPS)) return null;
    return sides.map((opposite, index) => {
      const a = sides[(index + 1) % 3];
      const b = sides[(index + 2) % 3];
      return Math.acos(clamp((Math.cosh(a) * Math.cosh(b) - Math.cosh(opposite)) / Math.max(EPS, Math.sinh(a) * Math.sinh(b)), -1, 1));
    });
  }

  function sparseMultiply(rows, vector) {
    const out = new Float64Array(rows.length);
    for (let i = 0; i < rows.length; i += 1) rows[i].forEach((value, j) => { out[i] += value * vector[j]; });
    return out;
  }

  function dot(a, b) {
    let result = 0;
    for (let index = 0; index < a.length; index += 1) result += a[index] * b[index];
    return result;
  }

  function pcg(rows, rhs, tolerance, maxIterations) {
    const x = new Float64Array(rhs.length);
    let r = Float64Array.from(rhs);
    const z = new Float64Array(rhs.length);
    for (let i = 0; i < z.length; i += 1) z[i] = r[i] / Math.max(1e-10, Math.abs(rows[i].get(i) || 1));
    let p = Float64Array.from(z);
    let rz = dot(r, z);
    const threshold = Math.max(1e-24, tolerance * tolerance * Math.max(1, dot(rhs, rhs)));
    let iteration = 0;
    for (; iteration < maxIterations && dot(r, r) > threshold; iteration += 1) {
      const ap = sparseMultiply(rows, p);
      const denominator = dot(p, ap);
      if (!(denominator > 1e-20)) break;
      const alpha = rz / denominator;
      for (let i = 0; i < x.length; i += 1) {
        x[i] += alpha * p[i];
        r[i] -= alpha * ap[i];
        z[i] = r[i] / Math.max(1e-10, Math.abs(rows[i].get(i) || 1));
      }
      const next = dot(r, z);
      const beta = next / Math.max(1e-30, rz);
      for (let i = 0; i < p.length; i += 1) p[i] = z[i] + beta * p[i];
      rz = next;
    }
    return { x, iterations: iteration };
  }

  function initialDiscreteScale(mesh) {
    let low = -8;
    let high = 8;
    const probe = new Float64Array(mesh.vertices.length);
    for (let iteration = 0; iteration < 50; iteration += 1) {
      const mid = (low + high) * 0.5;
      probe.fill(mid);
      const evaluation = discreteResidual(mesh, probe, false);
      if (!evaluation) {
        high = mid;
        continue;
      }
      const sum = evaluation.residual.reduce((total, value) => total + value, 0);
      if (sum > 0) high = mid;
      else low = mid;
    }
    return (low + high) * 0.5;
  }

  function solveDiscrete(mesh, options) {
    const maxIterations = clamp(Math.round(Number(options.maxIterations) || 80), 4, 200);
    const tolerance = Number(options.tolerance) || 1e-6;
    const u = new Float64Array(mesh.vertices.length);
    u.fill(initialDiscreteScale(mesh));
    let evaluation = discreteResidual(mesh, u, true);
    let iterations = 0;
    let linearIterations = 0;
    let flips = 0;
    for (; evaluation && iterations < maxIterations; iterations += 1) {
      const surgery = performIntrinsicDelaunayFlips(mesh, u, evaluation);
      evaluation = surgery.evaluation;
      flips += surgery.flips;
      if (!evaluation) break;
      const norm = residualNorm(evaluation.residual);
      if (norm.max < tolerance) break;
      const jacobian = discreteJacobian(mesh, u, evaluation);
      const rhs = Float64Array.from(evaluation.residual, (value) => -value);
      const step = pcg(jacobian, rhs, 1e-8, Math.min(600, Math.max(40, u.length * 2)));
      linearIterations += step.iterations;
      let accepted = false;
      for (let damping = 1; damping >= 1 / 1024; damping *= 0.5) {
        const trial = Float64Array.from(u, (value, index) => clamp(value + damping * step.x[index], -24, 24));
        const next = discreteResidual(mesh, trial, true);
        if (next && residualNorm(next.residual).rms < norm.rms * (1 - 1e-4 * damping)) {
          u.set(trial);
          evaluation = next;
          accepted = true;
          break;
        }
      }
      if (!accepted) break;
    }
    if (!evaluation) throw new Error('The discrete metric produced a degenerate hyperbolic triangle.');
    const hyperbolicArea = evaluation.triangleAngles.reduce((sum, angles) => (
      sum + Math.PI - angles[0] - angles[1] - angles[2]
    ), 0);
    return finishResult(mesh, u, evaluation.residual, iterations, flips, {
      linearIterations,
      edgeLengths: Array.from(evaluation.lengths),
      metricArea: hyperbolicArea
    });
  }

  function buildFlatStiffness(mesh) {
    const rows = Array.from({ length: mesh.vertices.length }, () => new Map());
    mesh.triangles.forEach((triangle) => {
      for (let opposite = 0; opposite < 3; opposite += 1) {
        const j = (opposite + 1) % 3;
        const k = (opposite + 2) % 3;
        const weight = 0.5 / Math.tan(triangle.flatAngles[opposite]);
        const a = triangle.ids[j];
        const b = triangle.ids[k];
        addSparse(rows, a, a, weight);
        addSparse(rows, b, b, weight);
        addSparse(rows, a, b, -weight);
        addSparse(rows, b, a, -weight);
      }
    });
    return rows;
  }

  function femResidual(mesh, stiffness, u, withJacobian) {
    const residual = sparseMultiply(stiffness, u);
    const rows = withJacobian ? stiffness.map((row) => new Map(row)) : null;
    for (let i = 0; i < u.length; i += 1) {
      const density = mesh.vertices[i].mass * Math.exp(clamp(2 * u[i], -40, 40));
      residual[i] += density + mesh.vertices[i].kappa;
      if (rows) addSparse(rows, i, i, 2 * density + 1e-10);
    }
    return { residual, rows };
  }

  function solveFem(mesh, options) {
    const maxIterations = clamp(Math.round(Number(options.maxIterations) || 60), 4, 160);
    const tolerance = Number(options.tolerance) || 1e-6;
    const stiffness = buildFlatStiffness(mesh);
    const totalMass = mesh.vertices.reduce((sum, vertex) => sum + vertex.mass, 0);
    const totalKappa = mesh.vertices.reduce((sum, vertex) => sum + vertex.kappa, 0);
    if (!(totalKappa < 0)) throw new Error('FEM uniformization requires negative Euler characteristic.');
    const u = new Float64Array(mesh.vertices.length);
    u.fill(0.5 * Math.log(-totalKappa / Math.max(EPS, totalMass)));
    let evaluation = femResidual(mesh, stiffness, u, true);
    let iterations = 0;
    let linearIterations = 0;
    for (; iterations < maxIterations; iterations += 1) {
      const norm = residualNorm(evaluation.residual);
      if (norm.max < tolerance) break;
      const step = pcg(evaluation.rows, Float64Array.from(evaluation.residual, (value) => -value), 1e-9, Math.min(800, Math.max(50, u.length * 2)));
      linearIterations += step.iterations;
      let accepted = false;
      for (let damping = 1; damping >= 1 / 1024; damping *= 0.5) {
        const trial = Float64Array.from(u, (value, index) => clamp(value + damping * step.x[index], -20, 20));
        const next = femResidual(mesh, stiffness, trial, true);
        if (residualNorm(next.residual).rms < norm.rms * (1 - 1e-4 * damping)) {
          u.set(trial);
          evaluation = next;
          accepted = true;
          break;
        }
      }
      if (!accepted) break;
    }
    return finishResult(mesh, u, evaluation.residual, iterations, 0, { linearIterations, experimental: true });
  }

  function finishResult(mesh, u, residual, iterations, flips, extra) {
    const norm = residualNorm(residual);
    const area = Number.isFinite(extra && extra.metricArea)
      ? extra.metricArea
      : mesh.vertices.reduce((sum, vertex, index) => sum + vertex.mass * Math.exp(clamp(2 * u[index], -40, 40)), 0);
    const expectedArea = -TAU * mesh.eulerCharacteristic;
    const status = norm.max < 1e-6 ? 'ready' : (norm.max < 1e-3 ? 'warning' : 'error');
    const result = {
      solverVersion: VERSION,
      mesh,
      u: Array.from(u),
      residuals: Array.from(residual),
      maxResidual: norm.max,
      rmsResidual: norm.rms,
      iterations,
      flips,
      timingMs: 0,
      area,
      expectedArea,
      gaussBonnetError: area - expectedArea,
      status,
      warning: status === 'warning' ? 'Angle residual is usable but above the ready tolerance.' : (status === 'error' ? 'Uniformization did not converge.' : ''),
      ...extra
    };
    delete result.metricArea;
    return result;
  }

  function solve(surface, options = {}) {
    const start = Date.now();
    const mesh = buildMesh(surface, options.refinement == null ? 'auto' : options.refinement);
    if (!(mesh.eulerCharacteristic < 0)) throw new Error(`Hyperbolic uniformization requires χ < 0 (mesh χ = ${mesh.eulerCharacteristic}).`);
    const method = options.method === 'fem' ? 'fem' : 'discrete';
    const result = method === 'fem' ? solveFem(mesh, options) : solveDiscrete(mesh, options);
    result.method = method;
    result.timingMs = Date.now() - start;
    return result;
  }

  function barycentric(point, triangle) {
    const a = triangle.local[0];
    const b = triangle.local[1];
    const c = triangle.local[2];
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < EPS) return null;
    const wa = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
    const wb = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
    return [wa, wb, 1 - wa - wb];
  }

  function sample(result, tileIndex, point) {
    if (!result || !result.mesh || !Array.isArray(result.u)) return null;
    const triangleIds = result.mesh.tileTriangles[tileIndex] || [];
    let best = null;
    let bestMargin = -Infinity;
    for (const triangleId of triangleIds) {
      const triangle = result.mesh.triangles[triangleId];
      const weights = barycentric(point, triangle);
      if (!weights) continue;
      const margin = Math.min(...weights);
      if (margin > bestMargin) best = { triangle, weights };
      bestMargin = Math.max(bestMargin, margin);
      if (margin >= -1e-8) break;
    }
    if (!best) return null;
    const values = best.triangle.ids.map((id) => result.u[id]);
    const a = best.triangle.local[0];
    const b = best.triangle.local[1];
    const c = best.triangle.local[2];
    const determinant = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const gradient = Math.abs(determinant) < EPS ? { x: 0, y: 0 } : {
      x: ((values[1] - values[0]) * (c.y - a.y) - (values[2] - values[0]) * (b.y - a.y)) / determinant,
      y: (-(values[1] - values[0]) * (c.x - a.x) + (values[2] - values[0]) * (b.x - a.x)) / determinant
    };
    return {
      u: values.reduce((sum, value, index) => sum + value * best.weights[index], 0),
      gradient,
      triangleId: best.triangle.id,
      residual: best.triangle.ids.reduce((sum, id, index) => sum + Math.abs(result.residuals[id]) * best.weights[index], 0)
    };
  }

  return {
    VERSION,
    refinementFor,
    polygonVertices,
    buildMesh,
    solve,
    sample,
    __test: { discreteResidual, residualNorm, pcg, barycentric, performIntrinsicDelaunayFlips }
  };
});
