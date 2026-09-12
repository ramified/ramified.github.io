'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mosaic = require('./mosaic_calculator.js').__test;

function squareCells() {
  return [
    { row: 0, col: 0, x: 20, y: 20 }, { row: 0, col: 1, x: 40, y: 20 },
    { row: 1, col: 0, x: 20, y: 40 }, { row: 1, col: 1, x: 40, y: 40 }
  ];
}

function setBoard(options = {}) {
  mosaic.setTestBoard({ rows: 2, cols: 2, lattice: 'square', boundary: 'glued', inputMode: 'background', backgroundAction: 'billiard', ...options });
  mosaic.setTestGeometry({ width: 60, height: 60, radius: 10, cells: squareCells() });
}

(function testEligibilityMessages() {
  setBoard();
  assert.strictEqual(mosaic.hyperbolicMetricEligibility({ existing: 4, components: 1, orientable: true, eulerCharacteristic: -2 }).supported, true);
  assert.match(mosaic.hyperbolicMetricEligibility({ existing: 4, components: 2, orientable: true, eulerCharacteristic: -2 }).reason, /connected/i);
  assert.match(mosaic.hyperbolicMetricEligibility({ existing: 4, components: 1, orientable: false, eulerCharacteristic: -2 }).reason, /orientable/i);
  assert.match(mosaic.hyperbolicMetricEligibility({ existing: 4, components: 1, orientable: true, eulerCharacteristic: 0, surfaceType: 'torus' }).reason, /torus/i);
})();

(function testPersistenceAndNoNumericalSerialization() {
  setBoard({ backgroundMetric: 'hyperbolic' });
  mosaic.state.hyperbolicMetricResult = { u: [1, 2, 3], residuals: [0], mesh: { vertices: [] } };
  const verbose = mosaic.buildFullExport();
  assert.strictEqual(verbose.backgroundMetric, 'hyperbolic');
  const encoded = JSON.stringify(verbose);
  assert.ok(!encoded.includes('hyperbolicMetricResult'));
  assert.ok(!encoded.includes('residuals'));
  const compact = mosaic.buildCompactBackgroundExport(false);
  assert.strictEqual(compact.metric, 'hyperbolic');
  mosaic.state.backgroundMetric = 'flat';
  assert.strictEqual(Object.prototype.hasOwnProperty.call(mosaic.buildCompactBackgroundExport(false), 'metric'), false);
  assert.strictEqual(mosaic.normalizeExportImportPayload({ lattice: 'square', size: '2x2', metric: 'hyperbolic' }).metric, 'hyperbolic');
})();

(function testFlatTrajectoryAndDeterministicRestart() {
  setBoard();
  const start = { x: 20, y: 20 };
  const direction = { x: 1, y: 0 };
  const launch = mosaic.backgroundBilliardLaunchFromPosition(0, start, direction);
  mosaic.state.backgroundBilliard = {
    tileIndex: 0, position: { ...start }, direction: { ...direction }, aimPoint: null,
    hitPoints: [], trailPoints: [], trailColorMode: 'blue', playing: false, frame: null, lastTime: 0, launch
  };
  mosaic.advanceBackgroundBilliard(2);
  assert.ok(Math.abs(mosaic.state.backgroundBilliard.position.x - 22) < 1e-9);
  assert.ok(Math.abs(mosaic.state.backgroundBilliard.position.y - 20) < 1e-9);
  mosaic.state.backgroundBilliard.hitPoints.push({ x: 1, y: 1 });
  mosaic.restartBackgroundBilliardFromLaunch();
  assert.deepStrictEqual(mosaic.state.backgroundBilliard.position, start);
  assert.strictEqual(mosaic.state.backgroundBilliard.hitPoints.length, 0);
})();

(function testConformalRk4BendsTrajectory() {
  setBoard({ backgroundMetric: 'hyperbolic' });
  mosaic.state.hyperbolicMetricStatus = 'ready';
  mosaic.state.hyperbolicMetricResult = {
    u: [0, 0, 1], residuals: [0, 0, 0],
    mesh: {
      refinement: 2,
      vertices: [{ mass: 1 }, { mass: 1 }, { mass: 1 }],
      tileTriangles: { 0: [0] },
      triangles: [{ id: 0, tileIndex: 0, ids: [0, 1, 2], local: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 1 }] }]
    }
  };
  const next = mosaic.hyperbolicGeodesicRk4(0, { x: 20, y: 20 }, { x: 1, y: 0 }, 1);
  assert.ok(next.direction.y > 0.01, 'a transverse conformal gradient should bend the geodesic');
})();

(function testMarkupAndBibliography() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'mosaic_calculator.html'), 'utf8');
  assert.match(html, /<select[^>]*id="background-metric-toggle"/);
  assert.ok(html.includes('value="complete-interior"'));
  assert.match(html, /id="hyperbolic-metric-debug-card"[^>]*data-card-advanced="true"/);
  assert.ok(html.includes('mosaic_hyperbolic_metric_worker.js') || fs.existsSync(path.join(__dirname, 'mosaic_hyperbolic_metric_worker.js')));
  ['hyperbolic-metric-solver', 'hyperbolic-metric-refinement', 'hyperbolic-metric-heatmap', 'hyperbolic-heatmap-legend'].forEach((id) => assert.ok(html.includes(`id="${id}"`)));

  const citations = fs.readFileSync(path.join(__dirname, '..', 'citations.html'), 'utf8');
  const ids = ['bibtex-bobenko-pinkall-springborn-discrete-conformal', 'bibtex-gu-guo-luo-sun-wu-uniformization-ii'];
  ids.forEach((id) => {
    assert.strictEqual((citations.match(new RegExp(`<script type="application/x-bibtex" id="${id}">`, 'g')) || []).length, 1);
    assert.ok(citations.includes(`data-bibtex-id="${id}"`));
  });
  ['10.2140/gt.2015.19.2155', '10.4310/jdg/1531188190', '1005.2698', '1401.4594'].forEach((value) => assert.ok(citations.includes(value)));
  assert.ok(/https:\/\/doi\.org\/10\.2140\/gt\.2015\.19\.2155" target="_blank" rel="noopener"/.test(citations));
  assert.ok(/@article\{BobenkoPinkallSpringborn2015DiscreteConformal,[\s\S]*author = [\s\S]*journal = [\s\S]*year = [\s\S]*doi =/.test(citations));
  assert.ok(/@article\{GuGuoLuoSunWu2018UniformizationII,[\s\S]*author = [\s\S]*journal = [\s\S]*year = [\s\S]*doi =/.test(citations));
})();

console.log('mosaic hyperbolic integration tests passed');
