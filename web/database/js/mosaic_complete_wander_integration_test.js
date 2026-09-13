'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const P = require('./mosaic_poincare.js');
const U = require('./mosaic_poincare_uniformization.js');
const C = require('./mosaic_complete_interior.js');
const I = require('./mosaic_intrinsic_metric.js');
const M = require('./mosaic_hyperbolic_metric.js');
const F = require('./mosaic_poincare_test.js');
const mosaic = require('./mosaic_calculator.js').__test;
const scope = { MosaicPoincare: P, MosaicPoincareUniformization: U, MosaicIntrinsicMetric: I };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'mosaic_poincare_view.js'), 'utf8'), scope);
const View = scope.MosaicPoincareView.View;
const preset = JSON.parse(JSON.stringify(mosaic.backgroundSpacePresets.find(p => p.id === 'genus-2').payload));
preset.gluedEdges.pop();
mosaic.setTestBoard({ ...preset, backgroundMetric: 'complete-interior' });
const cells = Array.from({ length: 16 }, (_, i) => ({ row: Math.floor(i / 4), col: i % 4, x: 20 + i % 4 * 20, y: 20 + Math.floor(i / 4) * 20 }));
mosaic.setTestGeometry({ width: 100, height: 100, radius: 10, cells });
const result = M.solve(mosaic.hyperbolicMetricSurfaceSnapshot(), { refinement: 2 });
mosaic.state.hyperbolicMetricResult = result; mosaic.state.hyperbolicMetricStatus = 'ready';
mosaic.state.backgroundBilliard = { tileIndex: 5, position: { x: 41.3, y: 42.1 }, direction: { x: 1, y: 0.47 },
  trailPoints: [], hitPoints: [], frame: null, playing: false, launch: { tileIndex: 5, local: { x: 0.13, y: 0.21 }, direction: { x: 1, y: 0.47 } } };
mosaic.ensureCompleteSession();
const controller = mosaic.completeMotion;
while (controller.prepareStep(controller.generation, 100)) {}
assert.equal(controller.status, 'ready', controller.condition);
function view(exploration) {
  const v = Object.create(View.prototype);
  Object.assign(v, { options: { snapshot: mosaic.poincareSnapshot, controller, exploration }, follow: { checked: exploration },
    mesh: { checked: false }, status: {}, solve: {}, play: {}, restart: {}, model: {}, explanation: {}, schedule() {}, isOpen: () => true });
  v.reset(); for (let i = 0; i < 1000 && !v.ensure(); i++) assert.ok(!v.previewError, v.previewError);
  assert.ok(v.previewReady); return v;
}
const panel = view(false), wander = view(true);
assert.notStrictEqual(panel.development, wander.development); assert.notStrictEqual(panel.interiorMap, wander.interiorMap);
assert.notStrictEqual(panel.development, controller.development);
assert.equal(wander.follow.checked, true); assert.equal(panel.follow.checked, false);
controller.play(); mosaic.advanceBackgroundBilliard(0.4);
const snapshot = controller.snapshot();
for (let i = 0; i < 20; i++) { panel.ensure(); wander.ensure(); }
assert.equal(controller.length, snapshot.length, 'view refresh rate cannot advance motion');
panel.reset(); panel.ensure(); wander.resetCamera();
assert.equal(controller.length, snapshot.length); assert.equal(controller.playing, true);
assert.equal(wander.follow.checked, true);
const neighbor = [...wander.development.seed.neighbors].find(([, next]) => next && wander.development.visible.includes(next));
wander.selection = wander.development.seed;
assert.ok(wander.exploreNeighbor(neighbor[0])); assert.equal(wander.follow.checked, false);
assert.equal(controller.pose.copy.id, snapshot.copyId, 'exploration cannot change the active lifted sheet');
assert.equal(controller.length, snapshot.length);
const boundaryCopy = wander.development.visible.find(copy => result.mesh.triangles[copy.triangleId].edgeIds.some(id => result.mesh.edges[id].triangles.length === 1));
wander.selectCopy(boundaryCopy);
const physical = result.mesh.triangles[boundaryCopy.triangleId].edgeIds.findIndex(id => result.mesh.edges[id].triangles.length === 1);
assert.equal(wander.exploreNeighbor(physical), false); assert.match(wander.status.textContent, /physical boundaries/);
panel.isOpen = wander.isOpen = () => false;
mosaic.advanceBackgroundBilliard(0.3); assert.ok(controller.length > snapshot.length);
const local = mosaic.poincareSnapshot().sample.local;
assert.ok(Math.hypot(local.x - controller.pose.local.x, local.y - controller.pose.local.y) < 1e-10);
assert.ok(mosaic.state.backgroundBilliard.trailPoints.some(p => p.breakBefore), 'identified seams split the main-layout trail');
const current = { ...mosaic.state.backgroundBilliard.position };
mosaic.projectCompleteMotion(); assert.deepEqual(mosaic.state.backgroundBilliard.position, current);
controller.pause(); const stopped = controller.length; mosaic.advanceBackgroundBilliard(0.5); assert.equal(controller.length, stopped);
// The renderer must size its private artwork buffer even if Wander already
// resized the destination canvas to the expected backing dimensions.
{
  const ctx = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  panel.isOpen = () => true;
  panel.canvas = { width: 600, height: 400, getBoundingClientRect: () => ({ width: 600, height: 400 }), getContext: () => ctx };
  panel.background = { width: 300, height: 150, getContext: () => ctx };
  panel.options.artwork = () => ({ key: 'art' }); panel.paintBackground = () => false;
  panel.render(); assert.equal(panel.background.width, 600); assert.equal(panel.background.height, 400);
  assert.equal(controller.length, stopped);
}
const generation = controller.generation;
mosaic.state.tiles[0] = [[0, 2]]; mosaic.ensureCompleteSession(); assert.equal(controller.generation, generation, 'artwork does not invalidate geometry');
for (const mode of ['flat', 'hyperbolic', 'complete-interior']) {
  mosaic.state.backgroundMetric = mode;
  assert.equal(mosaic.buildFullExport().backgroundMetric, mode);
  assert.equal(mosaic.buildCompactBackgroundExport(false).metric || 'flat', mode);
  const imported = mosaic.normalizeExportImportPayload({ lattice: 'square', size: '4x4', metric: mode });
  assert.equal(mosaic.normalizeBackgroundMetric(imported.metric), mode);
  for (const type of ['all', 'background', 'minigame']) for (const format of ['dsl', 'verbose']) {
    mosaic.setTestExportControls({ type, format, id: 'shared_interior_test' });
    const importedText = mosaic.prepareExportImportText(mosaic.buildExportText()).normalizedPayload;
    assert.equal(mosaic.normalizeBackgroundMetric(importedText.backgroundMetric || importedText.metric || (importedText.backgroundSpace && importedText.backgroundSpace.metric)), mode, `${type}/${format}`);
  }
  const serialized = JSON.stringify(mosaic.buildFullExport());
  assert.ok(!/copyId|trailSegments|edgeLengths|boundaryTable|jacobian/.test(serialized));
}
assert.equal(mosaic.normalizeBackgroundMetric(undefined), 'flat');
mosaic.state.backgroundMetric = 'complete-interior';
const oldToken = controller.generation;
mosaic.state.hyperbolicMetricStatus = 'computing'; mosaic.ensureCompleteSession();
assert.equal(controller.playing, false); assert.equal(controller.prepareStep(oldToken), false); assert.equal(controller.map, null);
mosaic.clearBackgroundBilliard(false); assert.equal(controller.trail.length, 0);
const html = fs.readFileSync(path.join(__dirname, '..', 'mosaic_calculator.html'), 'utf8');
assert.match(html, /id="wander-follow"[^>]*checked/);
for (const id of ['wander-view-mode', 'wander-disk-controls', 'wander-tile-controls', 'wander-restart', 'wander-recenter', 'poincare-restart']) assert.ok(html.includes(`id="${id}"`));
assert.ok(!fs.readFileSync(path.join(__dirname, 'mosaic_poincare_view.js'), 'utf8').includes('.advance('), 'renderer has no motion clock');
// Exercise the actual main-canvas clock and stale worker response guards.
{
  const context = new Proxy({ measureText: () => ({ width: 5 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
  global.document = { documentElement: {}, getElementById: () => null, querySelectorAll: () => [] };
  global.getComputedStyle = () => ({ getPropertyValue: () => '' });
  global.window = { requestAnimationFrame: () => 1, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false }) };
  mosaic.refs.canvas = { style: {}, getContext: () => context };
  mosaic.state.hyperbolicMetricResult = result; mosaic.state.hyperbolicMetricStatus = 'ready';
  mosaic.state.backgroundBilliard = { tileIndex: 5, position: { x: 41.3, y: 42.1 }, direction: { x: 1, y: 0.47 },
    trailPoints: [], hitPoints: [], frame: null, playing: false, launch: { tileIndex: 5, local: { x: 0.13, y: 0.21 }, direction: { x: 1, y: 0.47 } } };
  // Prepare synchronously; the browser timer is suppressed in this harness.
  delete global.window;
  mosaic.ensureCompleteSession(); while (controller.prepareStep(controller.generation, 100)) {}
  global.window = { requestAnimationFrame: () => 1, cancelAnimationFrame() {}, matchMedia: () => ({ matches: false }) };
  controller.play(); mosaic.state.backgroundBilliard.playing = true; mosaic.state.backgroundBilliard.lastTime = 1000;
  mosaic.stepBackgroundBilliardAnimation(1400);
  assert.ok(Math.abs(controller.length - 0.4) < 1e-9, 'default speed is 1 hyperbolic unit/s with no 48ms frame clamp');
  mosaic.toggleBackgroundBilliardPlayback(); const length = controller.length;
  mosaic.stepBackgroundBilliardAnimation(1600); assert.equal(controller.length, length);
  const retained = { ...mosaic.state.backgroundBilliard.position }, direction = { ...mosaic.state.backgroundBilliard.direction };
  mosaic.setBackgroundMetric('flat');
  assert.deepEqual(mosaic.state.backgroundBilliard.position, retained); assert.deepEqual(mosaic.state.backgroundBilliard.direction, direction);
  assert.equal(mosaic.state.backgroundBilliard.trailPoints.length, 1); assert.equal(controller.playing, false);
  const workers = [];
  global.Worker = class {
    constructor() { this.events = {}; workers.push(this); }
    addEventListener(name, callback) { this.events[name] = callback; }
    postMessage(message) { this.message = message; }
    terminate() {}
  };
  mosaic.setBackgroundMetric('complete-interior');
  const worker = workers[workers.length - 1]; assert.ok(worker);
  mosaic.cancelHyperbolicMetricWorker();
  worker.events.message({ data: { type: 'result', requestId: worker.message.requestId, result } });
  assert.equal(mosaic.state.hyperbolicMetricResult, null, 'obsolete solver result cannot prepare a shared map');
  delete global.Worker; delete global.window; delete global.document; delete global.getComputedStyle;
}
console.log('shared main-canvas / Wander integration tests passed');
