'use strict';
const assert = require('assert');
const metric = require('./mosaic_hyperbolic_metric.js');
const P = require('./mosaic_poincare.js');

function squareSurface(bordered = false) {
  const pairs = [
    [[0, 0], [2, 0], false], [[0, 1], [1, 3], true], [[0, 2], [3, 2], false], [[0, 3], [2, 3], false],
    [[1, 0], [1, 2], true], [[1, 1], [2, 1], false], [[2, 2], [3, 0], true], [[3, 1], [3, 3], true]
  ];
  return pairedSurface('square', 4, 4, bordered ? pairs.slice(1) : pairs);
}
function hexSurface() {
  return pairedSurface('hexagonal', 2, 6, [
    [[0, 0], [1, 0], true], [[0, 1], [0, 4], false], [[0, 2], [0, 5], true],
    [[0, 3], [1, 1], true], [[1, 2], [1, 4], true], [[1, 3], [1, 5], true]
  ]);
}
function pairedSurface(lattice, count, sides, pairs) {
  const tiles = Array.from({ length: count }, (_, index) => ({ index, links: Array(sides).fill(null) }));
  for (const [a, b, sameDirection] of pairs) {
    tiles[a[0]].links[a[1]] = { index: b[0], dir: b[1], sameDirection };
    tiles[b[0]].links[b[1]] = { index: a[0], dir: a[1], sameDirection };
  }
  return { lattice, tiles };
}
function center(triangle) {
  return { x: triangle.local.reduce((n, p) => n + p.x, 0) / 3, y: triangle.local.reduce((n, p) => n + p.y, 0) / 3 };
}
function run() {
  for (const surface of [squareSurface(), squareSurface(true), hexSurface()]) {
    const result = metric.solve(surface, { refinement: 2, maxIterations: 100 });
    assert.equal(result.status, 'ready');
    const d = new P.Development(result);
    assert.ok(d.verifyVertexFans() < P.TOLERANCE);
    for (const triangle of result.mesh.triangles) {
      const copy = P.seedTriangle(result, triangle.id);
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(P.distance(copy.vertices[(i + 1) % 3], copy.vertices[(i + 2) % 3]) - result.edgeLengths[triangle.edgeIds[i]]) < 1e-9);
        const next = P.adjacent(result, copy, i);
        if (!next) { assert.equal(result.mesh.edges[triangle.edgeIds[i]].triangles.length, 1); continue; }
        const nt = result.mesh.triangles[next.triangleId];
        const shared = triangle.ids.filter(id => nt.ids.includes(id));
        for (const id of shared) assert.ok(P.distance(copy.vertices[triangle.ids.indexOf(id)], next.vertices[nt.ids.indexOf(id)]) < 1e-9);
        const reverse = nt.edgeIds.indexOf(triangle.edgeIds[i]);
        assert.ok(P.matching(copy, P.adjacent(result, next, reverse)));
      }
    }
    d.resetNeighborhood(d.seed, { x: 0, y: 0 }, 750, 5);
    while (d.expand(20)) { /* bounded neighborhood */ }
    assert.ok(d.visible.length <= 750);
    assert.ok(d.truncated);
    assert.ok([...d.byTriangle.values()].some(copies => copies.length > 1), 'noncontractible loops produce distinct lifts');
    for (const copies of d.byTriangle.values()) {
      for (let i = 0; i < copies.length; i++) for (let j = i + 1; j < copies.length; j++) assert.ok(!P.matching(copies[i], copies[j]));
    }
    // Walk many mesh edges. This includes ordinary, identified, and self-glued
    // tile seams; the event endpoint must map to exactly the same disk point.
    let copy = d.seed, triangle = result.mesh.triangles[copy.triangleId];
    const trail = new P.LiftedTrail(d, copy, center(triangle));
    let crossings = 0, random = 12345;
    for (let n = 0; n < 1000; n++) {
      if (P.distance({ x: 0, y: 0 }, trail.position) > 4) trail.rebase(trail.position);
      triangle = result.mesh.triangles[trail.copy.triangleId];
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const opposite = random % 3;
      const next = d.neighbor(trail.copy, opposite);
      const indices = [(opposite + 1) % 3, (opposite + 2) % 3];
      const edgePoint = { x: (triangle.local[indices[0]].x + triangle.local[indices[1]].x) / 2, y: (triangle.local[indices[0]].y + triangle.local[indices[1]].y) / 2 };
      assert.ok(trail.move(triangle.tileIndex, edgePoint), trail.error);
      if (!next) {
        const old = trail.copy; trail.reflect(); assert.strictEqual(trail.copy, old);
        assert.ok(trail.move(triangle.tileIndex, center(triangle)), trail.error); continue;
      }
      const nt = result.mesh.triangles[next.triangleId];
      const targetPoints = indices.map(i => nt.local[nt.ids.indexOf(triangle.ids[i])]);
      const target = { x: (targetPoints[0].x + targetPoints[1].x) / 2, y: (targetPoints[0].y + targetPoints[1].y) / 2 };
      const before = { ...trail.position };
      // Same-tile self-gluings have distinct source coordinates, unlike an
      // internal mesh edge, and require an explicit boundary event.
      if (nt.tileIndex !== triangle.tileIndex || Math.hypot(target.x - edgePoint.x, target.y - edgePoint.y) > 1e-7) {
        assert.ok(trail.crossEdge(nt.tileIndex, target), trail.error); crossings++;
        assert.ok(P.distance(before, trail.position) < P.TOLERANCE);
      }
      assert.ok(trail.move(nt.tileIndex, center(nt)), trail.error);
    }
    assert.ok(crossings > 0);
  }
  const a = { x: 0.23, y: -0.17 }, b = { x: -0.35, y: 0.19 };
  const camera = new P.Camera({ x: 0.41, y: 0.1 });
  assert.ok(Math.abs(P.distance(a, b) - P.distance(camera.project(a), camera.project(b))) < 1e-12);
  const from = camera.project(a), to = { x: 0.1, y: 0.3 };
  camera.pan(from, to);
  assert.ok(P.distance(camera.project(a), to) < 1e-10);
  assert.ok(P.distance(camera.unproject(camera.project(b)), b) < 1e-10);
  const vertices = [a, b, { x: 0.1, y: 0.55 }], weights = [0.2, 0.3, 0.5];
  assert.ok(P.distance(camera.project(P.interpolate(vertices, weights)), P.interpolate(vertices.map(p => camera.project(p)), weights)) < 1e-10);
  assert.throws(() => new P.Development({ method: 'fem', status: 'ready' }), /discrete/);
  assert.throws(() => new P.Development({ method: 'discrete', status: 'warning' }), /ready/);
  console.log('mosaic Poincare geometry and lifted trajectory tests passed');
}
if (require.main === module) run();
module.exports = { squareSurface, hexSurface, center };
