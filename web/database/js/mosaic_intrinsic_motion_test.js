'use strict';
const assert = require('assert');
const C = require('./mosaic_complete_interior.js');
const M = require('./mosaic_hyperbolic_metric.js');
const P = require('./mosaic_poincare.js');
const F = require('./mosaic_poincare_test.js');
const fs = require('fs'), vm = require('vm'), path = require('path');
function prepare(result, direction = { x: 1, y: 0.47 }) {
  const c = new C.Controller(); c.prepare(result, { tileIndex: 0, local: F.center(result.mesh.triangles[0]), direction });
  while (c.prepareStep(c.generation, 100)) {}
  assert.equal(c.status, 'ready', c.condition); return c;
}
const near = (a, b, tolerance = 1e-5) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < tolerance, JSON.stringify({ a, b }));
for (const surface of [F.squareSurface(), F.hexSurface(), F.squareSurface(true)]) {
  const result = M.solve(surface, { refinement: 2 }), c = prepare(result), metric = c.metric;
  const launch = c.savedLaunch;
  c.play(); c.advance(100);
  assert.equal(c.condition, ''); assert.ok(Math.abs(c.length - 100) < 1e-9); assert.ok(c.playing);
  assert.strictEqual(c.metric, metric, 'coordinate changes never rebuild the metric');
  assert.ok(c.development.copies.length < 600, 'motion retains a bounded local neighborhood');
  assert.ok(c.trail.length <= 6000, 'history is bounded independently of total arclength');
  if (metric.bordered) {
    assert.ok(c.snapshot().collar.logDistance < -90, 'logarithmic state survives unrepresentable board distances');
    c.advance(10); assert.ok(c.snapshot().collar.logDistance < -100);
  } else {
    assert.ok(c.frame > 100, 'many well-conditioned chart changes exercised');
    assert.equal(c.launchPose.copy, undefined, 'saved launch must not retain old neighbor graphs');
    assert.ok(c.development.queue.every(copy => c.coverage.has(copy)));
  }
  const position = { ...c.pose.local }, length = c.length;
  c.pause(); c.advance(1); near(c.pose.local, position); assert.equal(c.length, length);
  c.restart(); assert.strictEqual(c.metric, metric); assert.equal(c.length, 0); near(c.pose.local, launch.local);
  const n = Math.hypot(launch.direction.x, launch.direction.y);
  near(c.pose.direction, { x: launch.direction.x / n, y: launch.direction.y / n }); assert.ok(!c.playing);
  const fresh = prepare(result); fresh.play(); c.play(); c.advance(0.9);
  for (let i = 0; i < 90; i++) fresh.advance(0.01);
  assert.equal(c.condition, ''); assert.equal(fresh.condition, ''); assert.equal(c.pose.triangleId, fresh.pose.triangleId);
  near(c.pose.local, fresh.pose.local, 2e-4); near(c.pose.direction, fresh.pose.direction, 2e-4);
  // Reverse the current tangent; short-time reversibility checks the metric
  // gradient and tangent transfers, not just position interpolation.
  const back = { ...c.pose.direction }; c.launch({ tileIndex: c.pose.tileIndex, local: c.pose.local, direction: { x: -back.x, y: -back.y } });
  c.play(); c.advance(0.9); assert.equal(c.condition, ''); assert.equal(c.pose.tileIndex, launch.tileIndex); near(c.pose.local, launch.local, 5e-4);
  c.clear(); assert.equal(c.pose, null); assert.equal(c.trail.length, 0);
  const token = c.prepare(result); c.invalidate('test topology change'); assert.equal(c.prepareStep(token), false); assert.equal(c.metric, null);
}
// Exact vertex hits on the closed atlas must still cross the complete fan.
{
  const result = M.solve(F.squareSurface(), { refinement: 2 }), c = prepare(result);
  for (let vertex = 0; vertex < 3; vertex++) {
    c.restart(); const target = c.pose.copy.vertices[vertex], ray = P.toOrigin(target, c.pose.disk), j = c.pose.jacobian, det = j[0] * j[3] - j[1] * j[2];
    const length = P.distance(c.pose.disk, target) + 0.08;
    c.launch({ tileIndex: c.pose.tileIndex, local: c.pose.local, direction: { x: (j[3] * ray.x - j[1] * ray.y) / det, y: (j[0] * ray.y - j[2] * ray.x) / det } });
    c.play(); c.advance(length); assert.equal(c.condition, ''); assert.ok(Math.abs(c.length - length) < 1e-9);
  }
}
// Fixed and following cameras own separate previews and preserve a closed
// geodesic's screen coordinates through multiple numerical chart changes.
{
  const scope = { MosaicPoincare: P, MosaicPoincareUniformization: require('./mosaic_poincare_uniformization.js'), MosaicIntrinsicMetric: require('./mosaic_intrinsic_metric.js') };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mosaic_poincare_view.js'), 'utf8'), scope);
  const View = scope.MosaicPoincareView.View;
  const result = M.solve(F.squareSurface(), { refinement: 2 }), c = prepare(result), control = prepare(result), billiard = {};
  function settle(v) { for (let i = 0; i < 1000 && !v.ensure(); i++) assert.ok(!v.previewError, v.previewError); assert.ok(v.previewReady); }
  function view(follow) {
    const v = Object.create(View.prototype);
    Object.assign(v, { options: { controller: c, snapshot: () => ({ result, metric: 'complete-interior', method: 'discrete', status: 'ready', eligible: true, billiard }) },
      follow: { checked: follow }, status: {}, solve: {}, play: {}, restart: {}, model: {}, explanation: {}, schedule() {}, isOpen: () => true });
    v.reset(); settle(v); return v;
  }
  const fixed = view(false), follow = view(true), launch = { ...c.pose.disk }, ray = { ...c.ray };
  const expand = fixed.development.expand;
  fixed.previewReady = false; fixed.interiorMap = null; fixed.development.expand = () => true;
  assert.equal(fixed.ensure(), false);
  assert.equal(fixed.play.disabled, false, 'preview preparation cannot disable shared play');
  fixed.previewError = 'test unavailable preview';
  assert.equal(fixed.ensure(), false); assert.equal(fixed.play.disabled, false);
  fixed.previewError = ''; fixed.development.expand = expand; settle(fixed);
  c.play(); control.play(); c.advance(2.4); control.advance(2.4);
  settle(fixed); settle(follow);
  const expected = P.fromOrigin({ x: ray.x * Math.tanh(1.2), y: ray.y * Math.tanh(1.2) }, launch);
  assert.ok(P.distance(fixed.interiorPath.position, expected) < 1e-7);
  assert.notStrictEqual(fixed.development, follow.development);
  assert.notStrictEqual(fixed.development, c.development);
  assert.equal(c.pose.copy.id, control.pose.copy.id); near(c.pose.local, control.pose.local, 1e-10);
  const length = c.length;
  fixed.camera.pan({ x: 0, y: 0 }, { x: 0.1, y: -0.2 }); follow.resetCamera();
  settle(fixed); settle(follow); assert.equal(c.length, length);
  fixed.interiorMap.renderPoint = () => { throw new Error('test preview precision failure'); };
  assert.throws(() => fixed.ensure(), /preview precision/);
  c.advance(0.2); control.advance(0.2); assert.ok(c.playing); near(c.pose.local, control.pose.local, 1e-10);
}
console.log('intrinsic motion tests passed (closed/bordered s=100, bounded charts/history, frame partition, restart, reversal, vertex fans, stale metrics)');
