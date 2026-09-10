(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MosaicPoincare = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  'use strict';
  const EPS = 1e-12;
  const TOLERANCE = 1e-4;
  const origin = () => ({ x: 0, y: 0 });
  const norm2 = p => p.x * p.x + p.y * p.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const mix = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  function multiply(a, b) { return { x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x }; }
  function divide(a, b) {
    const d = norm2(b);
    if (d < EPS * EPS) throw new Error('Disk coordinates reached numerical infinity.');
    return { x: (a.x * b.x + a.y * b.y) / d, y: (a.y * b.x - a.x * b.y) / d };
  }
  // T_a(z) = (z-a)/(1-conj(a)z). All camera motion uses disk isometries.
  function toOrigin(z, a) {
    return divide({ x: z.x - a.x, y: z.y - a.y }, { x: 1 - a.x * z.x - a.y * z.y, y: a.y * z.x - a.x * z.y });
  }
  function fromOrigin(z, a) { return toOrigin(z, { x: -a.x, y: -a.y }); }
  function distance(a, b) {
    const denominator = (1 - norm2(a)) * (1 - norm2(b));
    if (!(denominator > 0)) return Infinity;
    return 2 * Math.asinh(Math.hypot(a.x - b.x, a.y - b.y) / Math.sqrt(denominator));
  }
  function barycentric(p, local) {
    const [a, b, c] = local;
    const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(d) < EPS) throw new Error('Degenerate source triangle.');
    const u = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / d;
    const v = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / d;
    return [u, v, 1 - u - v];
  }
  function interpolate(vertices, weights) {
    let t = 0, x = 0, y = 0;
    vertices.forEach((p, i) => {
      const d = 1 - norm2(p);
      if (!(d > EPS * EPS)) throw new Error('Disk coordinates reached numerical infinity.');
      t += weights[i] * (1 + norm2(p)) / d;
      x += weights[i] * 2 * p.x / d;
      y += weights[i] * 2 * p.y / d;
    });
    // Avoid cancellation in t²-x²-y² by evaluating the Lorentz norm in a
    // nearby frame. Interpolation is equivariant under every disk isometry.
    if (t > 1e4) {
      const a = vertices[0];
      return fromOrigin(interpolate(vertices.map(p => toOrigin(p, a)), weights), a);
    }
    const length = Math.sqrt(Math.max(EPS, t * t - x * x - y * y));
    return { x: x / (t + length), y: y / (t + length) };
  }
  function mapPoint(copy, triangle, local) { return interpolate(copy.vertices, barycentric(local, triangle.local)); }
  function sideLength(result, triangle, a, b) {
    return result.edgeLengths[triangle.edgeIds[3 - a - b]];
  }
  function thirdVertex(a, b, ac, bc, side) {
    const ab = distance(a, b);
    if (!(ab > EPS && ac > 0 && bc > 0) || ab + ac <= bc || ab + bc <= ac || ac + bc <= ab) {
      throw new Error('Invalid hyperbolic triangle lengths.');
    }
    const cosine = Math.max(-1, Math.min(1, (Math.cosh(ab) * Math.cosh(ac) - Math.cosh(bc)) / (Math.sinh(ab) * Math.sinh(ac))));
    const q = toOrigin(b, a);
    const rotation = { x: q.x / Math.hypot(q.x, q.y), y: q.y / Math.hypot(q.x, q.y) };
    const r = Math.tanh(ac / 2);
    return fromOrigin(multiply(rotation, { x: r * cosine, y: side * r * Math.sqrt(Math.max(0, 1 - cosine * cosine)) }), a);
  }
  function seedTriangle(result, triangleId = 0) {
    const triangle = result.mesh.triangles[triangleId];
    const a = origin(), b = { x: Math.tanh(sideLength(result, triangle, 0, 1) / 2), y: 0 };
    return { triangleId, vertices: [a, b, thirdVertex(a, b, sideLength(result, triangle, 0, 2), sideLength(result, triangle, 1, 2), 1)] };
  }
  function adjacent(result, copy, opposite) {
    const triangle = result.mesh.triangles[copy.triangleId];
    const edge = result.mesh.edges[triangle.edgeIds[opposite]];
    if (edge.triangles.length === 1) return null;
    if (edge.triangles.length !== 2) throw new Error('The triangulation has a non-manifold edge.');
    const nextId = edge.triangles.find(id => id !== triangle.id);
    const next = result.mesh.triangles[nextId];
    if (!next) throw new Error('Invalid triangle adjacency.');
    const i = (opposite + 1) % 3, j = (opposite + 2) % 3;
    const a = copy.vertices[i], b = copy.vertices[j];
    const ni = next.ids.indexOf(triangle.ids[i]), nj = next.ids.indexOf(triangle.ids[j]);
    const nk = 3 - ni - nj;
    const side = cross(toOrigin(b, a), toOrigin(copy.vertices[opposite], a)) > 0 ? -1 : 1;
    const vertices = [];
    vertices[ni] = a; vertices[nj] = b;
    vertices[nk] = thirdVertex(a, b, sideLength(result, next, ni, nk), sideLength(result, next, nj, nk), side);
    return { triangleId: nextId, vertices };
  }
  function matching(a, b) {
    return a.triangleId === b.triangleId && a.vertices.every((p, i) => distance(p, b.vertices[i]) <= TOLERANCE);
  }
  function locate(result, tileIndex, point) {
    for (const id of result.mesh.tileTriangles[tileIndex] || []) {
      if (Math.min(...barycentric(point, result.mesh.triangles[id].local)) >= -1e-7) return id;
    }
    return null;
  }
  class Development {
    constructor(result, triangleId = 0) {
      if (!result || result.method !== 'discrete' || result.status !== 'ready' || !Array.isArray(result.edgeLengths)) {
        throw new Error('A ready discrete hyperbolic metric is required.');
      }
      this.result = result;
      this.copies = [];
      this.byTriangle = new Map();
      this.warnings = new Set();
      this.seed = this.insert(seedTriangle(result, triangleId));
      this.resetNeighborhood(this.seed, origin());
    }
    insert(candidate) {
      const previous = this.byTriangle.get(candidate.triangleId) || [];
      const match = previous.find(copy => matching(copy, candidate));
      if (match) return match;
      const copy = { ...candidate, id: this.copies.length, neighbors: new Map() };
      this.copies.push(copy);
      previous.push(copy);
      this.byTriangle.set(copy.triangleId, previous);
      return copy;
    }
    neighbor(copy, opposite) {
      if (copy.neighbors.has(opposite)) return copy.neighbors.get(opposite);
      const candidate = adjacent(this.result, copy, opposite);
      if (!candidate) { copy.neighbors.set(opposite, null); return null; }
      const next = this.insert(candidate);
      const currentTriangle = this.result.mesh.triangles[copy.triangleId];
      const nextTriangle = this.result.mesh.triangles[next.triangleId];
      const reverse = nextTriangle.edgeIds.indexOf(currentTriangle.edgeIds[opposite]);
      const existing = next.neighbors.get(reverse);
      if (existing && existing !== copy && !matching(existing, copy)) this.warnings.add('Numerical loop closure exceeds tolerance.');
      copy.neighbors.set(opposite, next);
      next.neighbors.set(reverse, copy);
      return next;
    }
    // Test the topologically contractible vertex fans, not arbitrary group words.
    verifyVertexFans() {
      const mesh = this.result.mesh;
      let maximum = 0;
      for (const vertex of mesh.vertices) {
        if (vertex.boundary) continue;
        const incident = mesh.triangles.filter(t => t.ids.includes(vertex.id));
        if (!incident.length) continue;
        let current = seedTriangle(this.result, incident[0].id), previousEdge = -1;
        const start = current;
        for (let n = 0; n < incident.length; n++) {
          const triangle = mesh.triangles[current.triangleId];
          const v = triangle.ids.indexOf(vertex.id);
          const opposite = [0, 1, 2].find(i => i !== v && triangle.edgeIds[i] !== previousEdge);
          previousEdge = triangle.edgeIds[opposite];
          current = adjacent(this.result, current, opposite);
          if (!current) break;
        }
        if (!current || current.triangleId !== start.triangleId) maximum = Infinity;
        else maximum = Math.max(maximum, ...start.vertices.map((p, i) => distance(p, current.vertices[i])));
      }
      if (maximum > TOLERANCE) this.warnings.add('Numerical vertex-fan closure exceeds tolerance.');
      return maximum;
    }
    resetNeighborhood(seed, center, limit = 10000, radius = 5) {
      this.queue = [seed]; this.cursor = 0; this.queued = new Set([seed.id]);
      this.visible = []; this.center = center; this.limit = limit; this.radius = radius;
      this.truncated = false;
    }
    expand(budgetMs = 6) {
      const deadline = Date.now() + budgetMs;
      while (this.cursor < this.queue.length && Date.now() <= deadline) {
        const copy = this.queue[this.cursor++];
        this.visible.push(copy);
        for (let opposite = 0; opposite < 3; opposite++) {
          if (this.queued.size >= this.limit) { this.truncated = true; continue; }
          const candidate = adjacent(this.result, copy, opposite);
          if (!candidate) continue;
          const center = interpolate(candidate.vertices, [1 / 3, 1 / 3, 1 / 3]);
          if (distance(center, this.center) > this.radius) { this.truncated = true; continue; }
          const next = this.neighbor(copy, opposite);
          if (!this.queued.has(next.id)) { this.queued.add(next.id); this.queue.push(next); }
        }
      }
      return this.cursor < this.queue.length;
    }
    nearestCopy(point) {
      let best = this.seed, nearest = Infinity;
      for (const copy of this.visible) {
        const d = distance(point, interpolate(copy.vertices, [1 / 3, 1 / 3, 1 / 3]));
        if (d < nearest) { best = copy; nearest = d; }
      }
      return best;
    }
    rebase(center, active) {
      // Keep calculations well away from the ideal circle in follow mode.
      // Old copies outside the finite neighborhood can be regenerated later.
      const kept = this.copies.filter(copy => copy === active || copy === this.seed || copy.vertices.every(p => distance(p, center) < 12));
      const retained = new Set(kept);
      this.byTriangle = new Map();
      this.copies = kept;
      kept.forEach((copy, id) => {
        copy.id = id;
        copy.vertices = copy.vertices.map(p => toOrigin(p, center));
        for (const [edge, next] of copy.neighbors) if (next && !retained.has(next)) copy.neighbors.delete(edge);
        const list = this.byTriangle.get(copy.triangleId) || [];
        list.push(copy); this.byTriangle.set(copy.triangleId, list);
      });
      if (!retained.has(this.seed)) this.seed = active;
      this.resetNeighborhood(active, origin());
    }
  }
  class LiftedTrail {
    constructor(development, copy, local) {
      this.development = development; this.copy = copy; this.local = { ...local };
      this.points = []; this.error = ''; this.events = [];
      this.record();
    }
    record(color = 'blue', length = 0) {
      const p = mapPoint(this.copy, this.development.result.mesh.triangles[this.copy.triangleId], this.local);
      this.position = p;
      this.points.push({ ...p, color, length });
      if (this.points.length > 20000) this.points.shift();
    }
    move(tileIndex, target, color = 'blue', length = 0) {
      if (this.error) return false;
      const mesh = this.development.result.mesh;
      try {
        if (norm2(this.position) > 1 - 1e-9) throw new Error('Fixed-view precision limit reached near the ideal circle. Enable Follow ball to start a fresh lift here.');
        for (let n = 0; n < 256; n++) {
          const triangle = mesh.triangles[this.copy.triangleId];
          if (triangle.tileIndex !== tileIndex) throw new Error('Missing lifted seam transition.');
          const end = barycentric(target, triangle.local);
          if (Math.min(...end) >= -1e-8) {
            this.local = { ...target }; this.record(color, length); return true;
          }
          const start = barycentric(this.local, triangle.local);
          let opposite = -1, time = Infinity;
          for (let i = 0; i < 3; i++) {
            if (end[i] >= -1e-8) continue;
            const t = Math.max(0, start[i]) / (Math.max(0, start[i]) - end[i]);
            if (t < time) { time = t; opposite = i; }
          }
          const next = this.development.neighbor(this.copy, opposite);
          if (!next || mesh.triangles[next.triangleId].tileIndex !== tileIndex) throw new Error('Trajectory left its source tile before a seam event.');
          this.local = mix(this.local, target, time);
          this.record(color, 0);
          this.copy = next;
        }
        throw new Error('Ambiguous trajectory at a mesh vertex.');
      } catch (error) { this.error = error.message; return false; }
    }
    crossEdge(nextTileIndex, target, color = 'blue') {
      if (this.error) return false;
      const mesh = this.development.result.mesh;
      const triangle = mesh.triangles[this.copy.triangleId];
      const weights = barycentric(this.local, triangle.local);
      for (let opposite = 0; opposite < 3; opposite++) {
        if (Math.abs(weights[opposite]) > 1e-6) continue;
        const candidate = adjacent(this.development.result, this.copy, opposite);
        if (!candidate) continue;
        const next = mesh.triangles[candidate.triangleId];
        if (next.tileIndex !== nextTileIndex || Math.min(...barycentric(target, next.local)) < -1e-6) continue;
        const p = mapPoint(candidate, next, target);
        if (distance(this.position, p) > TOLERANCE) continue;
        this.copy = this.development.neighbor(this.copy, opposite);
        this.local = { ...target };
        this.events.push({ kind: 'seam', triangleId: next.id });
        if (this.events.length > 1000) this.events.shift();
        this.record(color); return true;
      }
      this.error = 'Could not identify the lifted boundary crossing.';
      return false;
    }
    reflect() {
      this.events.push({ kind: 'reflection', triangleId: this.copy.triangleId });
      if (this.events.length > 1000) this.events.shift();
    }
    rebase(center) {
      this.development.rebase(center, this.copy);
      let gap = false;
      this.points = this.points.flatMap(p => {
        if (distance(p, center) >= 12) { gap = true; return []; }
        const point = { ...p, ...toOrigin(p, center), breakBefore: !!p.breakBefore || gap };
        gap = false; return [point];
      });
      this.position = mapPoint(this.copy, this.development.result.mesh.triangles[this.copy.triangleId], this.local);
    }
    trim(length, infinite = false) {
      if (infinite) return;
      let sum = 0, i = this.points.length - 1;
      for (; i > 0; i--) { sum += this.points[i].length; if (sum > length) break; }
      if (i > 0) this.points.splice(0, i);
      if (length <= 0) this.points = this.points.slice(-1);
    }
  }
  class Camera {
    constructor(center = origin()) { this.center = center; this.rotation = { x: 1, y: 0 }; }
    project(p) { return multiply(toOrigin(p, this.center), this.rotation); }
    unproject(p) { return fromOrigin(divide(p, this.rotation), this.center); }
    pan(from, to) {
      const transform = p => fromOrigin(toOrigin(this.project(p), from), to);
      const center = this.unproject(fromOrigin(toOrigin(origin(), to), from));
      const direction = transform(fromOrigin({ x: 0.001, y: 0 }, center));
      const r = Math.hypot(direction.x, direction.y);
      this.center = center; this.rotation = { x: direction.x / r, y: direction.y / r };
    }
  }
  return { TOLERANCE, toOrigin, fromOrigin, distance, barycentric, interpolate, mapPoint, seedTriangle, adjacent, locate, matching, Development, LiftedTrail, Camera };
});
