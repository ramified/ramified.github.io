(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports ? require('./mosaic_poincare.js') : root.MosaicPoincare);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MosaicIntrinsicMetric = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function(P) {
  'use strict';
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const local = (t, w) => t.local.reduce((p, v, i) => ({ x: p.x + w[i] * v.x, y: p.y + w[i] * v.y }), { x: 0, y: 0 });
  const multiply = (a, b) => ({ x: a.x * b.x - a.y * b.y, y: a.x * b.y + a.y * b.x });
  const norm = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  function weights(copy, point) {
    const vertices = copy.vertices.map(p => P.toOrigin(p, copy.vertices[0]));
    const z = P.toOrigin(point, copy.vertices[0]);
    const klein = p => ({ x: 2 * p.x / (1 + dot(p, p)), y: 2 * p.y / (1 + dot(p, p)) });
    const w = P.barycentric(klein(z), vertices.map(klein)).map((a, i) => a * (1 - dot(vertices[i], vertices[i])) / (1 + dot(vertices[i], vertices[i])));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map(a => a / sum);
  }
  function pcg(rows, rhs, tolerance = 1e-10) {
    const n = rhs.length, x = new Float64Array(n), r = Float64Array.from(rhs);
    const z = Float64Array.from(r, (v, i) => v / rows[i].get(i)), p = Float64Array.from(z);
    let rz = r.reduce((s, v, i) => s + v * z[i], 0);
    const scale = Math.max(1, norm(rhs));
    for (let k = 0; k < Math.max(100, n * 3); k++) {
      if (norm(r) <= tolerance * scale) return x;
      const ap = Float64Array.from(rows, row => [...row].reduce((s, [j, a]) => s + a * p[j], 0));
      const pap = p.reduce((s, v, i) => s + v * ap[i], 0);
      if (!(pap > 0)) throw new Error('The intrinsic metric linear solve lost positive definiteness.');
      const alpha = rz / pap;
      for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * ap[i]; z[i] = r[i] / rows[i].get(i); }
      const next = r.reduce((s, v, i) => s + v * z[i], 0), beta = next / rz;
      for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
      rz = next;
    }
    throw new Error('The intrinsic metric linear solve did not converge.');
  }
  function differential(copy, t, w) {
    const p = local(t, w), h = 1e-6;
    const z = P.mapPoint(copy, t, p);
    const a = P.mapPoint(copy, t, { x: p.x + h, y: p.y }), b = P.mapPoint(copy, t, { x: p.x - h, y: p.y });
    const c = P.mapPoint(copy, t, { x: p.x, y: p.y + h }), d = P.mapPoint(copy, t, { x: p.x, y: p.y - h });
    const j = [(a.x - b.x) / (2 * h), (c.x - d.x) / (2 * h), (a.y - b.y) / (2 * h), (c.y - d.y) / (2 * h)];
    const factor = 4 / (1 - dot(z, z)) ** 2;
    const g = [factor * (j[0] ** 2 + j[2] ** 2), factor * (j[0] * j[1] + j[2] * j[3]), factor * (j[1] ** 2 + j[3] ** 2)];
    const det = g[0] * g[2] - g[1] ** 2;
    if (!(det > 0)) throw new Error('Degenerate intrinsic metric triangle.');
    return { area: Math.sqrt(det), inverse: [g[2] / det, -g[1] / det, g[0] / det] };
  }
  function gradients(t) {
    const [a, b, c] = t.local, det = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    return [{ x: (b.y - c.y) / det, y: (c.x - b.x) / det }, { x: (c.y - a.y) / det, y: (a.x - c.x) / det }, { x: (a.y - b.y) / det, y: (b.x - a.x) / det }];
  }
  function bilinear(a, g, b) { return a.x * (g[0] * b.x + g[1] * b.y) + a.y * (g[1] * b.x + g[2] * b.y); }
  // Oriented Fermi coordinates: d is inward distance from a physical geodesic,
  // t is arclength along it. The triangle interior lies to the left.
  function boundaryFrame(copy, t, opposite) {
    let i = (opposite + 1) % 3, j = (opposite + 2) % 3;
    const make = () => {
      const a = copy.vertices[i], q = P.toOrigin(copy.vertices[j], a), n = Math.hypot(q.x, q.y);
      return { a, rotation: { x: q.x / n, y: -q.y / n } };
    };
    let f = make();
    if (multiply(P.toOrigin(copy.vertices[opposite], f.a), f.rotation).y < 0) { [i, j] = [j, i]; f = make(); }
    return { ...f, i, j, edgeId: t.edgeIds[opposite], triangleId: t.id, length: P.distance(copy.vertices[i], copy.vertices[j]) };
  }
  function fermi(frame, z) {
    const q = multiply(P.toOrigin(z, frame.a), frame.rotation), r2 = dot(q, q);
    return { d: Math.asinh(2 * q.y / (1 - r2)), t: Math.atanh(Math.max(-1 + 1e-15, Math.min(1 - 1e-15, 2 * q.x / (1 + r2)))) };
  }
  function fromFermi(frame, d, t) {
    const denominator = Math.cosh(d) * Math.cosh(t) + 1;
    const q = { x: Math.cosh(d) * Math.sinh(t) / denominator, y: Math.sinh(d) / denominator };
    return P.fromOrigin(multiply(q, { x: frame.rotation.x, y: -frame.rotation.y }), frame.a);
  }
  function refine(result) {
    const mesh = result.mesh, vertices = mesh.vertices.map(v => ({ id: v.id, boundary: v.boundary }));
    const midpoint = mesh.edges.map(e => { const id = vertices.length; vertices.push({ id, boundary: e.triangles.length === 1 }); return id; });
    const triangles = [], edges = [], lengths = [], lookup = new Map();
    for (const t of mesh.triangles) {
      const copy = P.seedTriangle(result, t.id), points = t.local.concat([0, 1, 2].map(i => local(t, [0, 1, 2].map(j => j === i ? 0 : 0.5))));
      const disk = copy.vertices.concat([0, 1, 2].map(i => P.interpolate(copy.vertices, [0, 1, 2].map(j => j === i ? 0 : 0.5))));
      const ids = t.ids.concat(t.edgeIds.map(id => midpoint[id]));
      for (const indices of [[0, 5, 4], [5, 1, 3], [4, 3, 2], [3, 4, 5]]) {
        const triangle = { id: triangles.length, parentId: t.id, tileIndex: t.tileIndex, ids: indices.map(i => ids[i]), local: indices.map(i => points[i]), edgeIds: [] };
        for (let opposite = 0; opposite < 3; opposite++) {
          const i = indices[(opposite + 1) % 3], j = indices[(opposite + 2) % 3];
          const a = Math.min(ids[i], ids[j]), b = Math.max(ids[i], ids[j]), key = `${a}:${b}`;
          let id = lookup.get(key);
          if (id == null) { id = edges.length; lookup.set(key, id); edges.push({ id, a, b, triangles: [] }); lengths.push(P.distance(disk[i], disk[j])); }
          edges[id].triangles.push(triangle.id); triangle.edgeIds.push(id);
        }
        triangles.push(triangle);
      }
    }
    return { ...result, mesh: { ...mesh, vertices, edges, triangles }, edgeLengths: lengths };
  }
  class Metric {
    constructor(result, options = {}) {
      this.result = result; this.bordered = result.mesh.vertices.some(v => v.boundary);
      this.work = this.bordered && options.refinement !== 0 ? refine(result) : result;
      this.mesh = this.work.mesh;
      this.baseCharts = result.mesh.triangles.map(t => P.seedTriangle(result, t.id));
      this.charts = this.mesh.triangles.map(t => P.seedTriangle(this.work, t.id));
      this.cells = result.mesh.triangles.map(() => []);
      this.mesh.triangles.forEach(t => this.cells[t.parentId == null ? t.id : t.parentId].push(t));
      this.cursor = 0; this.status = this.bordered ? 'assembling' : 'ready'; this.iterations = 0; this.residual = 0;
      this.rows = this.mesh.vertices.map(() => new Map()); this.mass = new Float64Array(this.rows.length); this.elements = [];
      this.boundaries = result.mesh.triangles.map(t => t.edgeIds.map((id, i) => result.mesh.edges[id].triangles.length === 1 ? boundaryFrame(this.baseCharts[t.id], t, i) : null).filter(Boolean));
      this.boundaryByEdge = new Map(this.boundaries.flat().map(f => [f.edgeId, f]));
      // The analytic end must agree on every triangle in a boundary vertex
      // fan, including triangles touching the boundary at only one vertex.
      this.nearBoundaries = result.mesh.triangles.map(t => {
        const boundaryIds = t.ids.filter(id => result.mesh.vertices[id].boundary);
        if (!boundaryIds.length) return [];
        const queue = [this.baseCharts[t.id]], seen = new Set([t.id]), frames = [];
        for (let k = 0; k < queue.length && k < 128; k++) {
          const copy = queue[k], triangle = result.mesh.triangles[copy.triangleId];
          for (let i = 0; i < 3; i++) {
            if (result.mesh.edges[triangle.edgeIds[i]].triangles.length === 1) frames.push(boundaryFrame(copy, triangle, i));
            else if (boundaryIds.some(id => triangle.ids.includes(id) && triangle.ids[i] !== id)) {
              const next = P.adjacent(result, copy, i);
              if (next && !seen.has(next.triangleId)) { seen.add(next.triangleId); queue.push(next); }
            }
          }
        }
        return frames;
      });
    }
    step(budget = 6) {
      const deadline = Date.now() + budget;
      while (this.status === 'assembling' && this.cursor < this.mesh.triangles.length && Date.now() <= deadline) {
        const t = this.mesh.triangles[this.cursor++], grad = gradients(t), [a, b, c] = t.local;
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
        const stiffness = Array.from({ length: 3 }, () => [0, 0, 0]);
        const quadrature = [[2 / 3, 1 / 6, 1 / 6], [1 / 6, 2 / 3, 1 / 6], [1 / 6, 1 / 6, 2 / 3]];
        let measure = 0, inverse = [0, 0, 0];
        for (const w of quadrature) {
          const parent = this.result.mesh.triangles[t.parentId == null ? t.id : t.parentId];
          const q = differential(this.baseCharts[parent.id], parent, P.barycentric(local(t, w), parent.local)), m = area * q.area / 3;
          measure += m; inverse = inverse.map((v, i) => v + m * q.inverse[i]);
          for (let i = 0; i < 3; i++) {
            this.mass[t.ids[i]] += m * w[i];
            for (let j = 0; j < 3; j++) stiffness[i][j] += m * bilinear(grad[i], q.inverse, grad[j]);
          }
        }
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const row = this.rows[t.ids[i]], id = t.ids[j]; row.set(id, (row.get(id) || 0) + stiffness[i][j]);
        }
        this.elements.push({ t, grad, measure, inverse: inverse.map(v => v / measure) });
      }
      if (this.status === 'assembling' && this.cursor === this.mesh.triangles.length) this.initialize();
      while (this.status === 'solving' && Date.now() <= deadline) this.iterate();
      return this.status !== 'ready';
    }
    initialize() {
      this.free = this.mesh.vertices.filter(v => !v.boundary).map(v => v.id);
      this.index = new Map(this.free.map((id, i) => [id, i]));
      const rows = this.free.map(id => new Map([...this.rows[id]].filter(([j]) => this.index.has(j)).map(([j, a]) => [this.index.get(j), a + (j === id ? this.mass[id] : 0)])));
      const interior = pcg(rows, Float64Array.from(this.free, id => this.mass[id]));
      this.rho = new Float64Array(this.mass.length);
      this.free.forEach((id, i) => { if (!(interior[i] > 0)) throw new Error('The boundary defining function is not positive. Refine the metric mesh.'); this.rho[id] = interior[i]; });
      const gradient2 = new Float64Array(this.mass.length), area = new Float64Array(this.mass.length);
      for (const e of this.elements) {
        const grad = e.grad.reduce((p, g, i) => ({ x: p.x + g.x * this.rho[e.t.ids[i]], y: p.y + g.y * this.rho[e.t.ids[i]] }), { x: 0, y: 0 });
        const value = bilinear(grad, e.inverse, grad);
        for (const id of e.t.ids) { gradient2[id] += e.measure * value; area[id] += e.measure; }
      }
      this.v = Float64Array.from(gradient2, (s, id) => 0.5 * Math.log(Math.max(1e-12, s / area[id])));
      this.constant = Float64Array.from(this.free, id => {
        const lap = -[...this.rows[id]].reduce((s, [j, a]) => s + a * this.rho[j], 0) / this.mass[id];
        return this.mass[id] * ((this.rho[id] * lap - gradient2[id] / area[id]) / this.rho[id] ** 2 - 1);
      });
      this.status = 'solving';
    }
    evaluate(v) {
      const rhs = Float64Array.from(this.free, (id, i) => [...this.rows[id]].reduce((s, [j, a]) => s + a * v[j], this.constant[i]) + this.mass[id] * Math.exp(2 * v[id]) / this.rho[id] ** 2);
      const rows = this.free.map(id => new Map([...this.rows[id]].filter(([j]) => this.index.has(j)).map(([j, a]) => [this.index.get(j), a + (id === j ? 2 * this.mass[id] * Math.exp(2 * v[id]) / this.rho[id] ** 2 : 0)])));
      const residual = rhs.reduce((maximum, x, i) => Math.max(maximum, Math.abs(x) / rows[i].get(i)), 0);
      return { rhs, rows, residual };
    }
    iterate() {
      const e = this.evaluate(this.v); this.residual = e.residual;
      if (e.residual < 1e-8) { this.status = 'ready'; return; }
      if (++this.iterations > 50) throw new Error('The fixed complete-interior metric did not converge.');
      const delta = pcg(e.rows, Float64Array.from(e.rhs, x => -x));
      for (let damping = 1; damping >= 1 / 1024; damping /= 2) {
        const next = Float64Array.from(this.v); this.free.forEach((id, i) => { next[id] += damping * delta[i]; });
        if (this.evaluate(next).residual < e.residual) { this.v = next; return; }
      }
      throw new Error('The fixed complete-interior metric Newton step failed.');
    }
    // Positive defining function W=e^-u. Its zero at the physical boundary is
    // structural; neither a finite Dirichlet value nor a reflecting wall is used.
    value(copy, point) {
      if (!this.bordered) return 1;
      const t = this.result.mesh.triangles[copy.triangleId], w = weights(copy, point), position = local(t, w);
      let cell, fieldWeights, best = -Infinity;
      for (const candidate of this.cells[t.id]) {
        const a = P.barycentric(position, candidate.local), margin = Math.min(...a);
        if (margin > best) { best = margin; cell = candidate; fieldWeights = a; }
        if (margin >= -1e-10) break;
      }
      const rho = fieldWeights.reduce((s, a, i) => s + a * this.rho[cell.ids[i]], 0), v = fieldWeights.reduce((s, a, i) => s + a * this.v[cell.ids[i]], 0);
      let value = Math.max(0, rho) * Math.exp(-v);
      if (this.nearBoundaries[t.id].length) {
        const z = P.mapPoint(this.baseCharts[t.id], t, position);
        for (const f of this.nearBoundaries[t.id]) {
          const q = fermi(f, z);
          if (q.d < 0.002 && q.t >= -1e-7 && q.t <= f.length + 1e-7) {
            const s = Math.max(0, Math.min(1, (q.d - 0.001) / 0.001)), blend = s * s * s * (10 + s * (-15 + 6 * s));
            value = (1 - blend) * Math.tanh(Math.max(0, q.d)) + blend * value;
          }
        }
      }
      return value;
    }
    sample(copy, point) {
      const value = this.value(copy, point);
      const h = Math.max(1e-10, Math.min(1e-6 * (1 - dot(point, point)), value * 0.01));
      const x = (this.value(copy, { x: point.x + h, y: point.y }) - this.value(copy, { x: point.x - h, y: point.y })) / (2 * h);
      const y = (this.value(copy, { x: point.x, y: point.y + h }) - this.value(copy, { x: point.x, y: point.y - h })) / (2 * h);
      return { value, gradient: { x, y } };
    }
  }
  return { Metric, weights, local, boundaryFrame, fermi, fromFermi, pcg, refine };
});
