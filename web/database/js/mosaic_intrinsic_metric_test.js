'use strict';
const assert = require('assert');
const I = require('./mosaic_intrinsic_metric.js');
const P = require('./mosaic_poincare.js');
const M = require('./mosaic_hyperbolic_metric.js');
const F = require('./mosaic_poincare_test.js');

// An analytic benchmark independent of the calculator's uniformization solve:
// a disk of Euclidean radius R inside the ambient hyperbolic disk has defining
// function W=(R²-|z|²)/(R(1-|z|²)). Geodesic polygons approximate its boundary.
function disk(rings, sectors) {
  const points = [{ x: 0, y: 0 }], vertices = [{ id: 0, boundary: false }];
  for (let k = 1; k <= rings; k++) for (let j = 0; j < sectors; j++) {
    points.push({ x: 0.6 * k / rings * Math.cos(j * 2 * Math.PI / sectors), y: 0.6 * k / rings * Math.sin(j * 2 * Math.PI / sectors) });
    vertices.push({ id: vertices.length, boundary: k === rings });
  }
  const triangles = [], edges = [], lookup = new Map();
  function triangle(ids) {
    const t = { id: triangles.length, tileIndex: 0, ids, local: ids.map(id => points[id]), edgeIds: [] };
    for (let i = 0; i < 3; i++) {
      const a = Math.min(ids[(i + 1) % 3], ids[(i + 2) % 3]), b = Math.max(ids[(i + 1) % 3], ids[(i + 2) % 3]), key = `${a},${b}`;
      let id = lookup.get(key);
      if (id == null) { id = edges.length; lookup.set(key, id); edges.push({ id, a, b, triangles: [] }); }
      edges[id].triangles.push(t.id); t.edgeIds.push(id);
    }
    triangles.push(t);
  }
  const id = (k, j) => 1 + (k - 1) * sectors + j % sectors;
  for (let j = 0; j < sectors; j++) triangle([0, id(1, j), id(1, j + 1)]);
  for (let k = 1; k < rings; k++) for (let j = 0; j < sectors; j++) {
    triangle([id(k, j), id(k + 1, j), id(k + 1, j + 1)]);
    triangle([id(k, j), id(k + 1, j + 1), id(k, j + 1)]);
  }
  return { status: 'ready', method: 'discrete', mesh: { vertices, triangles, edges }, edgeLengths: edges.map(e => P.distance(points[e.a], points[e.b])) };
}
function solve(result, options) {
  const metric = new I.Metric(result, options); while (metric.step(100)) {}
  assert.equal(metric.status, 'ready'); assert.ok(metric.residual < 1e-8);
  return metric;
}
const errors = [];
for (const rings of [3, 6, 10]) {
  const result = disk(rings, rings * 8), metric = solve(result, { refinement: 0 });
  let maximum = 0;
  for (const t of result.mesh.triangles) {
    const w = [1 / 3, 1 / 3, 1 / 3], z = P.interpolate(t.local, w), r2 = z.x * z.x + z.y * z.y;
    if (r2 > 0.45 ** 2) continue;
    const expected = (0.36 - r2) / (0.6 * (1 - r2));
    const actual = metric.value(metric.baseCharts[t.id], P.interpolate(metric.baseCharts[t.id].vertices, w));
    maximum = Math.max(maximum, Math.abs(actual / expected - 1));
  }
  errors.push(maximum);
}
assert.ok(errors[1] < errors[0] * 0.6 && errors[2] < errors[1] * 0.6, errors.join(', '));
assert.ok(errors[2] < 0.01, 'fine analytic-disk interior metric-scale error below 1%');

const result = M.solve(F.squareSurface(true), { refinement: 2 }), metric = solve(result);
assert.equal(metric.mesh.triangles.length, result.mesh.triangles.length * 4);
let seams = 0, boundaries = 0;
for (const t of result.mesh.triangles) {
  const copy = metric.baseCharts[t.id];
  for (let i = 0; i < 3; i++) {
    const w = [0.5, 0.5, 0.5]; w[i] = 0;
    const point = P.interpolate(copy.vertices, w), next = P.adjacent(result, copy, i);
    if (next) {
      const a = metric.value(copy, point), b = metric.value(next, point);
      assert.ok(Math.abs(a - b) < 1e-8, `fixed metric seam disagreement ${a}, ${b}`); seams++;
    } else {
      const frame = I.boundaryFrame(copy, t, i);
      for (const d of [1e-4, 1e-6]) {
        const z = I.fromFermi(frame, d, frame.length / 2), q = I.fermi(frame, z);
        assert.ok(Math.abs(q.d / d - 1) < 1e-8);
        assert.ok(Math.abs(metric.value(copy, z) / Math.tanh(d) - 1) < 1e-8);
      }
      boundaries++;
    }
  }
}
assert.ok(seams > 10 && boundaries > 0);
console.log(`fixed intrinsic metric tests passed (${seams} seams, ${boundaries} boundary edges; analytic errors ${errors.map(e => (100 * e).toFixed(2) + '%').join(', ')})`);
module.exports = { disk, solve };
