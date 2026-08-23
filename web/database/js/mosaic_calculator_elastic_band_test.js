'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const calculator = require('./mosaic_calculator.js');
const elastic = calculator.__test;

function closedChain(logicalPoints, generatorId = 'test') {
  const points = logicalPoints.map(({ x, y }) => ({
    x,
    y,
    optimizationDirection: { x: 0, y: 0 }
  }));
  points.push({
    x: logicalPoints[0].x,
    y: logicalPoints[0].y,
    optimizationDirection: { x: 0, y: 0 }
  });
  return {
    generatorId,
    fingerprint: generatorId,
    solverSpace: 'planar',
    points,
    deck: { x: 0, y: 0 },
    closure: elastic.homologyCordAffineIdentity()
  };
}

function bandLength(subject) {
  return subject.points.slice(1).reduce((length, point, index) => (
    length + Math.hypot(point.x - subject.points[index].x, point.y - subject.points[index].y)
  ), 0);
}

function coordinates(subject) {
  return subject.points.map(({ x, y }) => ({ x, y }));
}

function assertFinite(subject) {
  subject.points.forEach((point) => {
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  });
}

function assertClosed(subject) {
  assert.deepStrictEqual(
    coordinates(subject).at(-1),
    coordinates(subject)[0],
    'the Euclidean closure copy must exactly equal particle zero'
  );
}

function stepMany(subject, count, options = { stepSize: 0.4 }) {
  for (let index = 0; index < count; index += 1) {
    elastic.stepPlanarElasticBand(subject, options);
    assertClosed(subject);
  }
}

function assertPointNear(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual.x - expected.x) <= tolerance, `${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) <= tolerance, `${actual.y} != ${expected.y}`);
}

// Normalized neighboring directions do not redistribute an unequally spaced
// point that is already on the straight segment between its neighbors.
const straight = closedChain([
  { x: -2, y: 0 },
  { x: 0.1, y: 0 },
  { x: 4.7, y: 0 }
]);
const straightDirections = elastic.computePlanarElasticBandDirections(
  elastic.snapshotPlanarElasticBand(straight),
  -1
);
assert.deepStrictEqual(straightDirections[1], { x: 0, y: 0 });

// A corner and a longer zig-zag shorten under the single explicit update.
const v = closedChain([{ x: 0, y: 0 }, { x: 1, y: 1.5 }, { x: 2, y: 0 }]);
const vInitialLength = bandLength(v);
const vInitialApex = v.points[1].y;
elastic.stepPlanarElasticBand(v, { stepSize: 0.5 });
assert.ok(v.points[1].y < vInitialApex);
assert.ok(bandLength(v) < vInitialLength);

const zigzag = closedChain([
  { x: 0, y: 0 },
  { x: 1, y: 1.5 },
  { x: 2, y: -1.25 },
  { x: 3, y: 1.1 },
  { x: 4, y: 0 }
]);
const zigzagInitialLength = bandLength(zigzag);
let zigzagPreviousLength = zigzagInitialLength;
for (let index = 0; index < 160; index += 1) {
  elastic.stepPlanarElasticBand(zigzag, { stepSize: 0.35 });
  const length = bandLength(zigzag);
  assert.ok(length <= zigzagPreviousLength + 1e-12);
  zigzagPreviousLength = length;
}
assertClosed(zigzag);
assert.ok(bandLength(zigzag) < zigzagInitialLength * 0.45);

const safeStepBand = closedChain([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]);
const cappedStep = elastic.stepPlanarElasticBand(safeStepBand, { stepSize: 10 });
assert.ok(Math.abs(cappedStep.safeStep - 0.15) < 1e-12);
const strongStepBand = closedChain([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]);
const strongStep = elastic.stepPlanarElasticBand(strongStepBand, {
  stepSize: 10,
  contractionRatio: 0.2
});
assert.ok(Math.abs(strongStep.safeStep - 0.6) < 1e-12);
assert.strictEqual(strongStep.contractionRatio, 0.2);

// Reversing traversal order produces the same synchronous Jacobi update in
// reverse, showing that no point observes an already-updated neighbor.
const traversalPoints = [
  { x: -1.5, y: 0.25 },
  { x: 0.2, y: 2.1 },
  { x: 2.7, y: 0.8 },
  { x: 1.4, y: -1.9 }
];
const forward = closedChain(traversalPoints);
const reverse = closedChain(traversalPoints.slice().reverse());
elastic.stepPlanarElasticBand(forward, { stepSize: 0.8 });
elastic.stepPlanarElasticBand(reverse, { stepSize: 0.8 });
coordinates(forward).slice(0, -1).forEach((point, index, updated) => {
  assertPointNear(point, coordinates(reverse)[updated.length - 1 - index]);
});

// The adapter discards portal copies and all quotient-surface metadata. Its
// output depends only on visible local x/y coordinates.
const frameA = { matrix: { a: 1, b: 0, c: 0, d: 1 }, offset: { x: 10, y: -4 } };
const frameB = { matrix: { a: 1, b: 0, c: 0, d: 1 }, offset: { x: -30, y: 12 } };
const localPoints = [{ x: 1, y: 2 }, { x: 4, y: 6 }, { x: 8, y: 3 }, { x: 99, y: 99 }];
function surfaceChain(frame, deck, closure) {
  const points = localPoints.map((point, index) => ({
    x: point.x + frame.offset.x,
    y: point.y + frame.offset.y,
    frame,
    tileIndex: index,
    chartVertex: index + 20,
    portal: false
  }));
  points.splice(2, 0, {
    x: points[1].x,
    y: points[1].y,
    frame,
    tileIndex: 77,
    portal: true
  });
  return { generatorId: 'surface', fingerprint: 'surface', points, deck, closure };
}
const adaptedA = elastic.makePlanarElasticBandChain(surfaceChain(
  frameA,
  { x: 500, y: -200 },
  { matrix: { a: 0, b: -1, c: 1, d: 0 }, offset: { x: 7, y: 8 } }
));
const adaptedB = elastic.makePlanarElasticBandChain(surfaceChain(
  frameB,
  { x: -900, y: 600 },
  { matrix: { a: -1, b: 0, c: 0, d: -1 }, offset: { x: -3, y: 2 } }
));
assert.deepStrictEqual(coordinates(adaptedA), coordinates(adaptedB));
assert.deepStrictEqual(adaptedA.deck, { x: 0, y: 0 });
assert.deepStrictEqual(adaptedA.closure, elastic.homologyCordAffineIdentity());
assert.strictEqual(adaptedA.points.length, localPoints.length);
adaptedA.points.forEach((point) => {
  assert.deepStrictEqual(Object.keys(point).sort(), ['optimizationDirection', 'x', 'y']);
});
assertClosed(adaptedA);

// Zero-length edges stay finite. If every edge is zero, the prescribed
// global step is exactly zero and the loop remains unchanged.
const partialDegenerate = closedChain([
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 2 }
]);
stepMany(partialDegenerate, 200, { stepSize: 2 });
assertFinite(partialDegenerate);

const fullyDegenerate = closedChain([
  { x: 3, y: -2 },
  { x: 3, y: -2 },
  { x: 3, y: -2 }
]);
const fullyDegenerateBefore = coordinates(fullyDegenerate);
const degenerateResult = elastic.stepPlanarElasticBand(fullyDegenerate, { stepSize: 10 });
assert.strictEqual(degenerateResult.safeStep, 0);
assert.deepStrictEqual(coordinates(fullyDegenerate), fullyDegenerateBefore);

// Thousands of updates remain finite at a small scale, and no remeshing can
// change the particle count.
const longRun = closedChain([
  { x: 0, y: 0 },
  { x: 0.0004, y: 0.0001 },
  { x: 0.0007, y: -0.0002 },
  { x: 0.0002, y: -0.0005 }
]);
const longRunCount = longRun.points.length;
const longRunInitialLength = bandLength(longRun);
stepMany(longRun, 5000, { stepSize: 1 });
assertFinite(longRun);
assert.strictEqual(longRun.points.length, longRunCount);
assert.ok(bandLength(longRun) <= longRunInitialLength + 1e-12);
assert.ok(Math.max(...longRun.points.map((point) => Math.hypot(point.x, point.y))) < 0.01);

// A held particle is copied from the snapshot, while the other particles
// continue moving. It immediately rejoins the contraction after release.
const held = closedChain([
  { x: 0, y: 0 },
  { x: 1, y: 2 },
  { x: 3, y: 0 },
  { x: 1.5, y: -1 }
]);
const heldBefore = { x: held.points[1].x, y: held.points[1].y };
const neighborBefore = { x: held.points[2].x, y: held.points[2].y };
elastic.stepPlanarElasticBand(held, { stepSize: 0.5, heldIndex: 1 });
assert.deepStrictEqual({ x: held.points[1].x, y: held.points[1].y }, heldBefore);
assert.notDeepStrictEqual({ x: held.points[2].x, y: held.points[2].y }, neighborBefore);
elastic.stepPlanarElasticBand(held, { stepSize: 0.5 });
assert.notDeepStrictEqual({ x: held.points[1].x, y: held.points[1].y }, heldBefore);

const dragged = closedChain([{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 3, y: -1 }]);
assert.strictEqual(elastic.movePlanarElasticBandPoint(dragged, 1, { x: 7, y: 8 }), true);
assert.deepStrictEqual({ x: dragged.points[1].x, y: dragged.points[1].y }, { x: 7, y: 8 });
assert.strictEqual(elastic.movePlanarElasticBandPoint(dragged, dragged.points.length - 1, { x: -4, y: 3 }), true);
assert.deepStrictEqual({ x: dragged.points[0].x, y: dragged.points[0].y }, { x: -4, y: 3 });
assertClosed(dragged);

// Real 3x3 hexagonal-hole construction: after adaptation the band ignores
// the removed tile, enters its planar region, and keeps a fixed point count.
const hexRadius = 40;
const hexMargin = 28;
const hexWidth = Math.sqrt(3) * hexRadius;
const hexCells = [];
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 3; col += 1) {
    const q = col - Math.floor(row / 2);
    hexCells.push({
      row,
      col,
      q,
      r: row,
      x: hexMargin + (hexWidth / 2) + (hexWidth * (q + (row / 2))),
      y: hexMargin + hexRadius + (row * 1.5 * hexRadius)
    });
  }
}
calculator.__test.setTestBoard({ rows: 3, cols: 3, lattice: 'hexagonal', boundary: 'glued', removedTiles: [4] });
calculator.__test.setTestGeometry({ radius: hexRadius, width: 320, height: 320, cells: hexCells });
const holeAnalysis = calculator.analyzeBackgroundHomology();
const holeGenerator = holeAnalysis.generators[0];
const holeSurfaceChain = elastic.makeHomologyCordChain(
  holeGenerator,
  elastic.homologyChainDisplayEntries(holeAnalysis, holeGenerator),
  holeAnalysis
);
const holeBand = elastic.makePlanarElasticBandChain(holeSurfaceChain);
assert.ok(holeBand);
const holeInitialLength = bandLength(holeBand);
const holeParticleCount = holeBand.points.length;
let holePreviousLength = holeInitialLength;
for (let index = 0; index < 1500; index += 1) {
  elastic.stepPlanarElasticBand(holeBand, { stepSize: 1.2 });
  const length = bandLength(holeBand);
  assert.ok(length <= holePreviousLength + 1e-9);
  holePreviousLength = length;
}
assertClosed(holeBand);
const removedCenter = hexCells[4];
const nearestToRemovedCenter = Math.min(...holeBand.points.map((point) => (
  Math.hypot(point.x - removedCenter.x, point.y - removedCenter.y)
)));
assert.ok(bandLength(holeBand) < holeInitialLength * 0.75);
assert.ok(nearestToRemovedCenter < hexRadius * Math.sqrt(3) / 2);
assert.strictEqual(holeBand.points.length, holeParticleCount);

// A selected glued edge still builds the initial representative, but the
// runtime band receives ordinary Euclidean closure and no gluing metadata.
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [1, 2, 3],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 2 }, reversed: false },
    { first: { index: 0, dir: 1 }, second: { index: 0, dir: 3 }, reversed: false }
  ]
});
calculator.__test.setTestGeometry({ radius: 10, width: 20, height: 20, cells: [{ x: 10, y: 10 }] });
const gluedAnalysis = { complex: { sideToEdge: new Map([
  ['0:0', { localStart: true }],
  ['0:2', { localStart: true }]
]) } };
const gluedEntries = [{
  coefficient: 1n,
  reverse: false,
  edge: { id: 0, source: 0, target: 0 },
  side: { index: 0, dir: 0 },
  segment: { start: { x: 20, y: 0 }, end: { x: 20, y: 20 } }
}];
const gluedSurface = elastic.makeHomologyCordChain({ id: 'a1', edgeChain: [1n] }, gluedEntries, gluedAnalysis);
assert.ok(gluedSurface && Math.hypot(gluedSurface.deck.x, gluedSurface.deck.y) > 0);
const gluedBand = elastic.makePlanarElasticBandChain(gluedSurface);
assert.deepStrictEqual(gluedBand.deck, { x: 0, y: 0 });
assert.deepStrictEqual(gluedBand.closure, elastic.homologyCordAffineIdentity());
assertClosed(gluedBand);
gluedBand.points.forEach((point) => {
  assert.strictEqual('tileIndex' in point, false);
  assert.strictEqual('frame' in point, false);
  assert.strictEqual('portal' in point, false);
});
const gluedInitialLength = bandLength(gluedBand);
elastic.stepPlanarElasticBand(gluedBand, { stepSize: 0.5 });
assert.ok(bandLength(gluedBand) < gluedInitialLength);

// A cylinder has an H_1 basis generator represented by exactly one real
// boundary edge. Its elastic copy is trimmed and inset into the tile instead
// of being rejected or left directly on the cell boundary.
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [1, 2, 3],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 2 }, reversed: false }
  ]
});
calculator.__test.setTestGeometry({ radius: 10, width: 20, height: 20, cells: [{ x: 10, y: 10 }] });
const cylinderAnalysis = calculator.analyzeBackgroundHomology();
const cylinderGenerator = cylinderAnalysis.generators[0];
const cylinderEntries = elastic.homologyChainDisplayEntries(cylinderAnalysis, cylinderGenerator);
assert.strictEqual(cylinderEntries.length, 1);
assert.strictEqual(cylinderEntries[0].edge.kind, 'boundary');
const cylinderSurfaceChain = elastic.makeHomologyCordChain(
  cylinderGenerator,
  cylinderEntries,
  cylinderAnalysis
);
const cylinderBand = elastic.makePlanarElasticBandChain(cylinderSurfaceChain);
assert.ok(cylinderSurfaceChain && cylinderBand, 'the one-boundary-edge basis must be relaxable');
cylinderSurfaceChain.points.forEach((point) => {
  const local = elastic.homologyCordPointLocal(point);
  assert.ok(local.x > 0 && local.x < 20 && local.y > 0 && local.y < 20,
    'every material particle must be deformed into the tile interior');
});
assertClosed(cylinderBand);
elastic.state.homologyAnalysis = cylinderAnalysis;
elastic.state.homologyTopologyKey = elastic.backgroundHomologyTopologyKey();
elastic.state.homologyGeneratorVisibility = {};
elastic.state.showHomology = true;
elastic.state.homologyCordChains = {};
assert.deepStrictEqual(elastic.prepareBackgroundHomologyCordChains(), {
  ready: true,
  visible: 1,
  relaxable: 1,
  unsupported: 0
}, 'the UI preparation layer must not trigger the unsupported-cord fallback');

// The same rule applies when one real-boundary edge is part of a longer
// circuit. Multiple real-boundary circuits retain their exact corner handoff.
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  gluedEdges: [
    { first: { index: 0, dir: 3 }, second: { index: 1, dir: 3 }, reversed: true }
  ]
});
calculator.__test.setTestGeometry({ radius: 10, width: 40, height: 40, cells: [
  { x: 10, y: 10 }, { x: 30, y: 10 }, { x: 10, y: 30 }, { x: 30, y: 30 }
] });
const mixedBoundaryAnalysis = calculator.analyzeBackgroundHomology();
const mixedBoundaryGenerator = mixedBoundaryAnalysis.generators[0];
const mixedBoundaryEntries = elastic.homologyChainDisplayEntries(
  mixedBoundaryAnalysis,
  mixedBoundaryGenerator
);
assert.strictEqual(mixedBoundaryEntries.filter((entry) => entry.edge.kind === 'boundary').length, 1);
assert.ok(mixedBoundaryEntries.some((entry) => entry.edge.kind === 'internal'));
assert.ok(elastic.makePlanarElasticBandChain(elastic.makeHomologyCordChain(
  mixedBoundaryGenerator,
  mixedBoundaryEntries,
  mixedBoundaryAnalysis
)), 'a mixed circuit with one real-boundary edge must remain relaxable');
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [1, 2, 3],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 2 }, reversed: false },
    { first: { index: 0, dir: 1 }, second: { index: 0, dir: 3 }, reversed: false }
  ]
});
calculator.__test.setTestGeometry({ radius: 10, width: 20, height: 20, cells: [{ x: 10, y: 10 }] });

// Exercise the exact requestAnimationFrame adapter: it uses a fixed number of
// steps and deliberately reports continuing work while at least one band exists.
elastic.state.homologyCordChains = { [gluedBand.generatorId]: gluedBand };
elastic.state.homologyCordDrag = null;
elastic.state.homologyCordRelaxSpeed = 1;
elastic.state.homologyCordContractionStrength = 0.1;
assert.strictEqual(elastic.state.homologyCordIterationsPerFrame, 20,
  'the default animation budget is five times the previous four iterations per frame');
const animationLength = bandLength(gluedBand);
const animationCount = gluedBand.points.length;
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands(), true);
assert.ok(bandLength(gluedBand) < animationLength);
assert.strictEqual(gluedBand.points.length, animationCount);

const speedComparisonPoints = coordinates(gluedBand).slice(0, -1);
const normalSpeedBand = closedChain(speedComparisonPoints, 'normal-speed');
const highSpeedBand = closedChain(speedComparisonPoints, 'high-speed');
elastic.state.homologyCordChains = { [normalSpeedBand.generatorId]: normalSpeedBand };
elastic.state.homologyCordRelaxSpeed = 1;
elastic.advanceBackgroundHomologyPlanarBands();
elastic.state.homologyCordChains = { [highSpeedBand.generatorId]: highSpeedBand };
elastic.state.homologyCordRelaxSpeed = 3;
elastic.advanceBackgroundHomologyPlanarBands();
assert.ok(bandLength(highSpeedBand) < bandLength(normalSpeedBand),
  'the speed slider must scale the number of solver steps per frame');

// Particle hit-testing uses the same planar x/y values and maps the closing
// duplicate to canonical particle zero.
elastic.state.homologyCordMode = true;
elastic.state.showHomology = true;
elastic.state.homologyCordChains = { [gluedBand.generatorId]: gluedBand };
elastic.refs.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 20, height: 20 }) };
const hitPoint = gluedBand.points[1];
const hit = elastic.homologyCordAtPoint(hitPoint.x, hitPoint.y);
assert.ok(hit && hit.chain === gluedBand);

// Removed solver entry points must not survive as functions or test exports.
const sourceText = fs.readFileSync(path.join(__dirname, 'mosaic_calculator.js'), 'utf8');
const htmlText = fs.readFileSync(path.join(__dirname, '..', 'mosaic_calculator.html'), 'utf8');
assert.ok(htmlText.includes('id="homology-cord-contraction-strength"'));
assert.ok(htmlText.includes('id="homology-cord-relax-speed" min="0.1" max="6"'));
[
  'homologyCordElasticBandCandidates',
  'relaxHomologyCordElasticBandIteration',
  'resampleHomologyCordElasticBand',
  'advanceBackgroundHomologyCordElasticBandChains'
].forEach((name) => {
  assert.strictEqual(elastic[name], undefined, `${name} is no longer exported`);
  assert.strictEqual(sourceText.includes(`function ${name}`), false, `${name} is removed from active code`);
});
[
  'stableIterations',
  'remeshCooldown',
  'lastOptimization'
].forEach((name) => assert.strictEqual(sourceText.includes(name), false, `${name} state is removed`));

console.log('mosaic_calculator_elastic_band_test: minimal planar elastic-band tests passed');
