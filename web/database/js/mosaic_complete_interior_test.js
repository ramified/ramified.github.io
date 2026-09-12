'use strict';
const assert = require('assert');
const P = require('./mosaic_poincare.js');
const M = require('./mosaic_hyperbolic_metric.js');
const C = require('./mosaic_complete_interior.js');
const F = require('./mosaic_poincare_test.js');
function prepare(result, direction = { x: 1, y: 0.47 }) {
  const controller = new C.Controller();
  controller.prepare(result, { tileIndex: result.mesh.triangles[0].tileIndex, local: F.center(result.mesh.triangles[0]), direction });
  while (controller.prepareStep(controller.generation, 100)) {}
  assert.equal(controller.status, 'ready', controller.condition);
  return controller;
}
function near(a, b, tolerance = 1e-7) { assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < tolerance, JSON.stringify({ a, b })); }
let collars = 0, crossings = 0, selfGlued = 0;
for (const surface of [F.squareSurface(), F.squareSurface(true), F.hexSurface()]) {
  const result = M.solve(surface, { refinement: 2 });
  const controller = prepare(result);
  for (const triangle of result.mesh.triangles) {
    const copy = P.seedTriangle(result, triangle.id);
    for (const weights of [[0.2, 0.3, 0.5], [0, 0.65, 0.35], [1, 0, 0]]) {
      const point = P.interpolate(copy.vertices, weights);
      const inverse = C.inverseTriangle(copy, triangle, point);
      assert.ok(P.distance(P.mapPoint(copy, triangle, inverse.local), point) < 1e-8);
      weights.forEach((w, i) => assert.ok(Math.abs(w - inverse.weights[i]) < 1e-8));
      const camera = new P.Camera({ x: 0.6, y: -0.23 });
      const moved = { ...copy, vertices: copy.vertices.map(p => camera.project(p)) };
      near(C.inverseTriangle(moved, triangle, camera.project(point)).local, inverse.local);
    }
  }
  if (controller.map.planes.length) {
    for (const copy of controller.development.visible) {
      const t = result.mesh.triangles[copy.triangleId];
      const edge = t.edgeIds.findIndex(id => result.mesh.edges[id].triangles.length === 1);
      if (edge < 0) continue;
      const weights = [0.495, 0.495, 0.495]; weights[edge] = 0.01;
      const source = P.interpolate(copy.vertices, weights), disk = controller.map.renderPoint(source);
      try {
        const pose = controller.checkedPose(disk, { copy, source });
        assert.ok(P.distance(pose.source, source) < 1e-4); collars++;
      } catch (error) {
        assert.match(error.message, /fold|degenerate|precision|agreement|inversion|ambiguous|coverage/i);
      }
      if (collars >= 12) break;
    }
  }
  controller.play(); controller.advance(2);
  assert.ok(controller.length > 0.5, controller.condition);
  assert.ok(P.distance(controller.launchPose.disk, controller.pose.disk) - controller.length < 1e-7);
  near(controller.forward(controller.pose.copy, controller.pose.local), controller.pose.disk);
  // Tangent pushed forward must point in the same direction as the disk ray.
  const pose = controller.pose, d = pose.direction;
  const probe = controller.forward(pose.copy, { x: pose.local.x + d.x * 1e-7, y: pose.local.y + d.y * 1e-7 });
  const a = P.toOrigin(probe, pose.disk), b = P.toOrigin(controller.at(controller.length + 1e-6), pose.disk);
  assert.ok((a.x * b.x + a.y * b.y) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y) > 0.9999);
  for (let i = 1; i < controller.trail.length; i++) {
    const entry = controller.trail[i], previous = controller.trail[i - 1];
    assert.ok(P.distance(entry, previous) <= C.LIMITS.step + 1e-7);
    if (entry.crossing) {
      crossings++;
      assert.ok(P.distance(entry, previous) < 1e-7);
      if (entry.tileIndex === previous.tileIndex && entry.breakBefore) selfGlued++;
      assert.equal(result.mesh.edges[entry.crossing.edgeId].triangles.length, 2, 'physical boundaries never reflect');
    }
  }
  const position = controller.snapshot().position, length = controller.length;
  controller.pause(); controller.advance(1); near(controller.snapshot().position, position); assert.equal(controller.length, length);
  const map = controller.map; controller.restart(); assert.strictEqual(controller.map, map); assert.equal(controller.length, 0);
  controller.play(); controller.advance(20); assert.equal(controller.playing, false); assert.ok(controller.condition);
  assert.ok(controller.length <= 12); assert.ok(Number.isFinite(controller.pose.disk.x));
  assert.ok(Math.min(...controller.pose.weights) >= -1e-7);
  controller.clear(); assert.equal(controller.pose, null); assert.equal(controller.trail.length, 0);
  const stale = controller.prepare(result); controller.invalidate('test invalidation');
  assert.equal(controller.prepareStep(stale), false); assert.equal(controller.map, null);
}
assert.ok(collars >= 5, 'actual displayed collar inversion exercised');
assert.ok(crossings > 10);
{
  const result = M.solve(F.squareSurface(), { refinement: 2 });
  let launch;
  for (const t of result.mesh.triangles) {
    for (let edge = 0; edge < 3; edge++) {
      const n = P.adjacent(result, P.seedTriangle(result, t.id), edge);
      if (!n) continue;
      const nt = result.mesh.triangles[n.triangleId];
      if (nt.tileIndex !== t.tileIndex) continue;
      const i = (edge + 1) % 3, j = (edge + 2) % 3;
      const ni = nt.ids.indexOf(t.ids[i]);
      if (Math.hypot(t.local[i].x - nt.local[ni].x, t.local[i].y - nt.local[ni].y) < 1e-6) continue;
      const middle = { x: (t.local[i].x + t.local[j].x) / 2, y: (t.local[i].y + t.local[j].y) / 2 };
      const center = F.center(t), direction = { x: middle.x - center.x, y: middle.y - center.y };
      launch = { tileIndex: t.tileIndex, local: { x: center.x + 0.8 * direction.x, y: center.y + 0.8 * direction.y }, direction }; break;
    }
    if (launch) break;
  }
  assert.ok(launch);
  const c = new C.Controller(); c.prepare(result, launch); while (c.prepareStep(c.generation, 100)) {}
  c.play(); c.advance(0.5);
  assert.ok(c.trail.some((p, i) => i && p.breakBefore && p.tileIndex === c.trail[i - 1].tileIndex), c.condition);
  selfGlued++;
}
const result = M.solve(F.squareSurface(true), { refinement: 2 });
const a = prepare(result), b = prepare(result); a.play(); b.play();
a.advance(0.9); for (let i = 0; i < 90; i++) b.advance(0.01);
near(a.pose.disk, b.pose.disk); near(a.pose.local, b.pose.local); assert.equal(a.pose.copy.id, b.pose.copy.id);
// Reject a fold and a two-valued inverse rather than silently selecting a sheet.
a.map = { renderPoint: p => ({ x: p.x, y: -p.y }), inverse: p => ({ x: p.x, y: -p.y }) };
assert.throws(() => a.inverseDisplay({ x: 0.1, y: 0.2 }, { x: 0.1, y: -0.2 }), /fold/);
a.map = { renderPoint: p => ({ x: p.x * p.x - p.y * p.y, y: 2 * p.x * p.y }), inverse: () => ({ x: -0.3, y: 0 }) };
assert.throws(() => a.inverseDisplay({ x: 0.09, y: 0 }, { x: 0.3, y: 0 }), /ambiguous/);
console.log(`shared complete-interior geometry/motion tests passed (${collars} collars, ${crossings} crossings, ${selfGlued} self-glued)`);
