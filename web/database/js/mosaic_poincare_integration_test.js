'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const mosaic = require('./mosaic_calculator.js').__test;
const metric = require('./mosaic_hyperbolic_metric.js');
const P = require('./mosaic_poincare.js');
const scope = { MosaicPoincare: P };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mosaic_poincare_view.js'), 'utf8'), scope);
const View = scope.MosaicPoincareView.View;

function setup(bordered = false) {
  const preset = JSON.parse(JSON.stringify(mosaic.backgroundSpacePresets.find(p => p.id === 'genus-2').payload));
  if (bordered) preset.gluedEdges.pop();
  mosaic.setTestBoard({ ...preset, backgroundMetric: 'hyperbolic' });
  const cells = Array.from({ length: 16 }, (_, i) => ({ row: Math.floor(i / 4), col: i % 4, x: 20 + i % 4 * 20, y: 20 + Math.floor(i / 4) * 20 }));
  mosaic.setTestGeometry({ width: 100, height: 100, radius: 10, cells });
  const result = metric.solve(mosaic.hyperbolicMetricSurfaceSnapshot(), { refinement: 2 });
  assert.equal(result.status, 'ready');
  mosaic.state.hyperbolicMetricResult = result; mosaic.state.hyperbolicMetricStatus = 'ready';
  const position = { x: 41.3, y: 42.1 }, direction = { x: Math.cos(0.47), y: Math.sin(0.47) };
  mosaic.state.backgroundBilliard = { tileIndex: 5, position, direction, trailPoints: [], hitPoints: [], trailColorMode: 'blue', frame: null,
    launch: mosaic.backgroundBilliardLaunchFromPosition(5, position, direction) };
  const view = Object.create(View.prototype);
  Object.assign(view, { options: { snapshot: mosaic.poincareSnapshot }, solve: {}, status: {}, follow: { checked: false }, isOpen: () => true, schedule: () => {} });
  mosaic.setPoincareView(view);
  assert.ok(view.ensure());
  return view;
}

for (const bordered of [false, true]) {
  const view = setup(bordered);
  view.follow.checked = true;
  for (let i = 0; i < 2000; i++) {
    mosaic.advanceHyperbolicBackgroundBilliard(0.7);
    if (bordered && view.trace.error) {
      // The existing interpolated RK solver can overshoot a tile corner. A
      // companion must pause its lift rather than invent an unreported seam.
      const sample = mosaic.poincareSnapshot().sample;
      assert.ok(Math.abs(sample.local.x) > 1 || Math.abs(sample.local.y) > 1);
      assert.match(view.trace.error, /source tile|seam/);
      break;
    }
    assert.equal(view.trace.error, '', `${bordered ? 'bordered' : 'closed'} step ${i}: ${view.trace.error}; local ${JSON.stringify(view.trace.local)}; ball ${JSON.stringify(mosaic.poincareSnapshot().sample)}`);
  }
  assert.ok(view.trace.events.some(e => e.kind === 'seam'));
  if (bordered) assert.ok(view.trace.events.some(e => e.kind === 'reflection'));
  assert.ok(view.trace.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x * p.x + p.y * p.y < 1));
  const exported = JSON.stringify(mosaic.buildFullExport());
  assert.ok(!exported.includes('triangleId') && !exported.includes('poincare') && !exported.includes('edgeLengths'));
  mosaic.restartBackgroundBilliardFromLaunch();
  assert.equal(view.trace, null);
  view.ensure();
  assert.equal(view.trace.points.length, 1);
  // Opening in mid-flight starts at the current sample, not at stale history.
  mosaic.setPoincareView(null);
  mosaic.advanceHyperbolicBackgroundBilliard(3);
  mosaic.setPoincareView(view); view.reset(); view.ensure();
  assert.equal(view.trace.points.length, 1);
  const sample = mosaic.poincareSnapshot().sample;
  assert.equal(view.result.mesh.triangles[view.trace.copy.triangleId].tileIndex, sample.tileIndex);
  assert.deepEqual(view.trace.local, sample.local);
  mosaic.state.hyperbolicMetricMethod = 'fem';
  assert.equal(view.ensure(), false); assert.match(view.status.textContent, /discrete/); assert.equal(view.solve.hidden, false);
  mosaic.state.hyperbolicMetricMethod = 'discrete'; mosaic.state.hyperbolicMetricStatus = 'computing';
  assert.equal(view.ensure(), false); assert.equal(view.development, null);
  mosaic.state.hyperbolicMetricStatus = 'ready'; view.ensure();
  const old = view.development;
  mosaic.state.hyperbolicMetricResult = { ...mosaic.state.hyperbolicMetricResult };
  view.ensure(); assert.notStrictEqual(view.development, old);
  mosaic.clearBackgroundBilliard(false); assert.equal(view.trace, null);
  mosaic.setPoincareView(null);
}
const html = fs.readFileSync(path.join(__dirname, '..', 'mosaic_calculator.html'), 'utf8');
for (const id of ['poincare-card', 'poincare-canvas', 'poincare-open', 'poincare-close', 'poincare-wide', 'poincare-recenter', 'poincare-follow', 'poincare-mesh', 'poincare-use-discrete']) assert.ok(html.includes(`id="${id}"`));
console.log('mosaic Poincare calculator integration tests passed');
