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

function setSquareGeometry(rows, cols, radius = 10) {
  elastic.setTestGeometry({
    radius,
    width: cols * radius * 2,
    height: rows * radius * 2,
    cells: Array.from({ length: rows * cols }, (_, index) => ({
      row: Math.floor(index / cols),
      col: index % cols,
      x: radius + (index % cols) * radius * 2,
      y: radius + Math.floor(index / cols) * radius * 2
    }))
  });
}

function setHexGeometry(rows, cols, radius = 10) {
  const width = Math.sqrt(3) * radius;
  elastic.setTestGeometry({
    radius,
    width: width * (cols + 0.5),
    height: (2 * radius) + ((rows - 1) * 1.5 * radius),
    cells: Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        row,
        col,
        x: (width / 2) + (width * (col + ((row % 2) * 0.5))),
        y: radius + (row * 1.5 * radius)
      };
    })
  });
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

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const left = polygon[index];
    const right = polygon[previous];
    const intersects = ((left.y > point.y) !== (right.y > point.y))
      && (point.x < ((right.x - left.x) * (point.y - left.y) / (right.y - left.y)) + left.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = (dx * dx) + (dy * dy);
  const t = lengthSquared > 0
    ? Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / lengthSquared))
    : 0;
  return Math.hypot(point.x - start.x - (dx * t), point.y - start.y - (dy * t));
}

function distanceToPolygonBoundary(point, polygon) {
  return Math.min(...polygon.map((start, index) => (
    distanceToSegment(point, start, polygon[(index + 1) % polygon.length])
  )));
}

function assertBandAvoidsObstacles(subject, obstacles) {
  const logicalPoints = subject.points.slice(0, -1);
  (obstacles.polygons || []).forEach((polygon) => {
    logicalPoints.forEach((point) => {
      assert.strictEqual(pointInPolygon(point, polygon.points), false, 'a particle entered an obstacle');
    });
  });
  logicalPoints.forEach((point, index) => {
    const next = logicalPoints[(index + 1) % logicalPoints.length];
    assert.strictEqual(
      elastic.planarElasticBandSegmentCrossesObstacle(point, next, obstacles),
      false,
      'a band segment crossed an obstacle'
    );
  });
}

const responsibilityObstacle = {
  polygons: [{
    center: { x: 0, y: 0 },
    points: [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 }
    ]
  }],
  barriers: []
};

// Regression: neighboring candidates may move into an obstacle while the
// particle between them moves away. Only the responsible neighbors may be
// restricted; the legal outward displacement must survive.
const responsibilityPoints = [
  { x: 3.7646, y: 0 },
  { x: 0.7871, y: 1.3632 },
  { x: -1.6459, y: 2.8508 },
  { x: -1.7259, y: 0 },
  { x: -1.8639, y: -3.2283 },
  { x: 0.7475, y: -1.2947 }
];
const responsibilityBand = closedChain(responsibilityPoints, 'responsibility-left');
responsibilityBand.obstacles = responsibilityObstacle;
const outwardBefore = { x: responsibilityBand.points[3].x, y: responsibilityBand.points[3].y };
const responsibilityResult = elastic.stepPlanarElasticBand(responsibilityBand, { distanceContraction: 0.8 });
assert.strictEqual(responsibilityResult.resolved, true);
assert.ok(responsibilityBand.points[3].x < outwardBefore.x,
  'a leftward displacement away from the obstacle must not be collateral rollback');
assertBandAvoidsObstacles(responsibilityBand, responsibilityObstacle);

const mirroredResponsibilityBand = closedChain(
  responsibilityPoints.map((point) => ({ x: -point.x, y: point.y })),
  'responsibility-right'
);
mirroredResponsibilityBand.obstacles = responsibilityObstacle;
const mirroredBefore = mirroredResponsibilityBand.points[3].x;
assert.strictEqual(
  elastic.stepPlanarElasticBand(mirroredResponsibilityBand, { distanceContraction: 0.8 }).resolved,
  true
);
assert.ok(mirroredResponsibilityBand.points[3].x > mirroredBefore,
  'the mirrored rightward outward displacement must also survive');
assertBandAvoidsObstacles(mirroredResponsibilityBand, responsibilityObstacle);

// Neither endpoint alone crosses this obstacle, but their simultaneous move
// does. Shared backtracking must keep the largest valid part of both moves.
const sharedOld = [
  { index: 0, x: -3, y: -3 },
  { index: 1, x: -3, y: -3 },
  { index: 2, x: -3, y: -3 }
];
const sharedCandidate = [
  { x: -3, y: 1.2 },
  { x: 1.2, y: -3 },
  { x: -3, y: 1.2 }
];
const sharedResolution = elastic.resolvePlanarElasticBandCandidate(
  sharedOld,
  sharedCandidate,
  responsibilityObstacle
);
assert.strictEqual(sharedResolution.resolved, true);
assert.ok(sharedCandidate[0].y > sharedOld[0].y && sharedCandidate[1].x > sharedOld[1].x,
  'shared backtracking preserves a positive fraction instead of reverting both endpoints');
assert.strictEqual(
  elastic.planarElasticBandSegmentCrossesObstacle(sharedCandidate[0], sharedCandidate[1], responsibilityObstacle),
  false
);

// Even a malformed pre-existing crossing supplied directly to the low-level
// solver must terminate with bounded work. Production construction rejects
// this state before it reaches the animator.
const malformedPoints = [];
for (let index = 0; index < 100; index += 1) {
  if (index === 0) malformedPoints.push({ x: -2, y: 0 });
  else if (index === 1) malformedPoints.push({ x: 2, y: 0 });
  else malformedPoints.push({ x: 2 - (4 * (index - 2) / 98), y: 2 });
}
const malformedBand = closedChain(malformedPoints, 'malformed-crossing');
malformedBand.obstacles = responsibilityObstacle;
const malformedMetrics = {};
const malformedResult = elastic.stepPlanarElasticBandMacro(malformedBand, {
  distanceContraction: 0.8,
  substeps: 4,
  metrics: malformedMetrics
});
assert.strictEqual(typeof malformedResult.resolved, 'boolean');
if (malformedResult.resolved) assertBandAvoidsObstacles(malformedBand, responsibilityObstacle);
assert.ok(malformedMetrics.segmentQueries < malformedPoints.length * 20,
  'malformed input must use bounded local work instead of N full-chain passes');

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
const distanceStepBand = closedChain([{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 4 }]);
const distanceStepLength = bandLength(distanceStepBand);
const distanceStep = elastic.stepPlanarElasticBand(distanceStepBand, { distanceContraction: 0.8 });
assert.strictEqual(distanceStep.distanceContraction, 0.8);
assert.ok(bandLength(distanceStepBand) < distanceStepLength);

// Five runtime macro steps must be numerically equivalent to the previous
// twenty unconstrained Jacobi steps. The macro kernel directly applies T^4.
const macroSource = [
  { x: 0, y: 0 },
  { x: 1, y: 2 },
  { x: 3, y: -1 },
  { x: 4, y: 0.4 },
  { x: 2.5, y: 1.7 }
];
const legacyTwenty = closedChain(macroSource, 'legacy-twenty');
const fiveMacros = closedChain(macroSource, 'five-macros');
for (let index = 0; index < 20; index += 1) {
  elastic.stepPlanarElasticBand(legacyTwenty, { distanceContraction: 0.8 });
}
for (let index = 0; index < 5; index += 1) {
  elastic.stepPlanarElasticBandMacro(fiveMacros, { distanceContraction: 0.8, substeps: 4 });
}
coordinates(legacyTwenty).forEach((point, index) => assertPointNear(point, coordinates(fiveMacros)[index], 1e-10));
assert.ok(Math.abs(bandLength(legacyTwenty) - bandLength(fiveMacros)) <= 1e-10);

// A held point remains fixed across all four internal substeps.
const macroHeld = closedChain(macroSource, 'macro-held');
const macroHeldBefore = { x: macroHeld.points[2].x, y: macroHeld.points[2].y };
elastic.stepPlanarElasticBandMacro(macroHeld, {
  distanceContraction: 0.8,
  substeps: 4,
  heldIndex: 2
});
assert.deepStrictEqual({ x: macroHeld.points[2].x, y: macroHeld.points[2].y }, macroHeldBefore);

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

// A real 3x3 hexagonal hole becomes an expanded obstacle. The strong runtime
// update contracts the band onto that obstacle without changing its topology
// or particle count.
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
const holeBandCreatedBefore = elastic.homologyCordNow();
const holeBand = elastic.makePlanarElasticBandChain(holeSurfaceChain);
const holeBandCreatedAfter = elastic.homologyCordNow();
assert.ok(holeBand);
assert.ok(holeBand.relaxationNotBefore >= holeBandCreatedBefore + 300);
assert.ok(holeBand.relaxationNotBefore <= holeBandCreatedAfter + 300);
const holeInitialLength = bandLength(holeBand);
const holeParticleCount = holeBand.points.length;
assert.ok(holeParticleCount <= elastic.homologyCordPhysicalIndices(holeSurfaceChain).length + 4,
  'boundary-corner repair must not materially increase the runtime particle count');
assert.strictEqual(holeBand.obstacles.polygons.length, 1);
const expandedHole = holeBand.obstacles.polygons[0];
assert.ok(Math.abs(
  Math.hypot(expandedHole.points[0].x - expandedHole.center.x, expandedHole.points[0].y - expandedHole.center.y)
  - (hexRadius * 1.115)
) < 1e-9, 'the collision boundary must be slightly larger than the visible tile boundary');
const initialDistanceFromExpandedHole = Math.min(...holeBand.points.slice(0, -1).map((point) => (
  distanceToPolygonBoundary(point, expandedHole.points)
)));
assert.ok(initialDistanceFromExpandedHole >= hexRadius * 0.012,
  'new obstacle loops must begin visibly clear of the collision boundary');

const invalidAcrossHole = {
  generatorId: 'invalid-across-hole',
  fingerprint: 'invalid-across-hole',
  points: [
    { x: expandedHole.center.x - (hexRadius * 2), y: expandedHole.center.y },
    { x: expandedHole.center.x + (hexRadius * 2), y: expandedHole.center.y },
    { x: expandedHole.center.x, y: expandedHole.center.y - (hexRadius * 2) },
    { x: expandedHole.center.x - (hexRadius * 2), y: expandedHole.center.y }
  ].map((point) => ({
    ...point,
    frame: elastic.homologyCordAffineIdentity(),
    tileIndex: 0,
    portal: false
  }))
};
assert.strictEqual(
  elastic.makePlanarElasticBandChain(invalidAcrossHole),
  null,
  'an initially intersecting material segment must fall back instead of entering the runtime solver'
);
let holePreviousLength = holeInitialLength;
for (let index = 0; index < 1500; index += 1) {
  elastic.stepPlanarElasticBand(holeBand, { distanceContraction: 0.8 });
  const length = bandLength(holeBand);
  assert.ok(length <= holePreviousLength + 1e-8);
  holePreviousLength = length;
  assertBandAvoidsObstacles(holeBand, holeBand.obstacles);
}
assertClosed(holeBand);
const nearestToExpandedHole = Math.min(...holeBand.points.map((point) => (
  distanceToPolygonBoundary(point, expandedHole.points)
)));
assert.ok(bandLength(holeBand) < holeInitialLength * 0.7);
assert.ok(nearestToExpandedHole < hexRadius * 1e-3,
  'the settled centerline must lie almost directly against the expanded collision boundary');
assert.strictEqual(holeBand.points.length, holeParticleCount);

// A pointer sweep through the hole stops at first contact instead of
// teleporting to the opposite side. Moving an actual particle also preserves
// the two incident collision-free segments.
const dragIndex = holeBand.points.slice(0, -1).reduce((best, point, index, points) => (
  point.x < points[best].x ? index : best
), 0);
const dragStart = { x: holeBand.points[dragIndex].x, y: holeBand.points[dragIndex].y };
const dragTarget = {
  x: (expandedHole.center.x * 2) - dragStart.x,
  y: (expandedHole.center.y * 2) - dragStart.y
};
const constrainedDrag = elastic.constrainPlanarElasticBandPoint(
  dragStart,
  dragTarget,
  holeBand.obstacles
);
assert.strictEqual(pointInPolygon(constrainedDrag, expandedHole.points), false);
assert.strictEqual(
  elastic.planarElasticBandSegmentCrossesObstacle(dragStart, constrainedDrag, holeBand.obstacles),
  false
);
elastic.movePlanarElasticBandPoint(holeBand, dragIndex, dragTarget);
assertBandAvoidsObstacles(holeBand, holeBand.obstacles);

// Outer and cut edges are one-sided barriers shifted into the accessible tile.
// A glued edge is omitted because it is not a physical boundary.
const squareCells = [
  { x: 10, y: 10 }, { x: 30, y: 10 },
  { x: 10, y: 30 }, { x: 30, y: 30 }
];
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
  gluedEdges: [{
    first: { index: 0, dir: 3 },
    second: { index: 2, dir: 1 },
    reversed: false
  }]
});
calculator.__test.setTestGeometry({ radius: 10, width: 40, height: 40, cells: squareCells });
const squareObstacles = elastic.makePlanarElasticBandObstacles();
assert.ok(squareObstacles.barriers.some((barrier) => barrier.tileIndex === 0 && barrier.dir === 0));
assert.ok(squareObstacles.barriers.some((barrier) => barrier.tileIndex === 1 && barrier.dir === 2));
assert.strictEqual(squareObstacles.barriers.some((barrier) => (
  (barrier.tileIndex === 0 && barrier.dir === 3) || (barrier.tileIndex === 2 && barrier.dir === 1)
)), false, 'glued boundary edges must not become planar obstacles');
const outerBarrier = squareObstacles.barriers.find((barrier) => barrier.tileIndex === 0 && barrier.dir === 2);
const barrierMidpoint = {
  x: (outerBarrier.start.x + outerBarrier.end.x) / 2,
  y: (outerBarrier.start.y + outerBarrier.end.y) / 2
};
const initialBoundaryPoint = elastic.constrainInitialPlanarElasticBandPoint({
  x: barrierMidpoint.x - (outerBarrier.inward.x * 0.5),
  y: barrierMidpoint.y - (outerBarrier.inward.y * 0.5)
}, outerBarrier.tileIndex, { polygons: [], barriers: [outerBarrier] });
const initialBoundaryDistance = ((initialBoundaryPoint.x - outerBarrier.start.x) * outerBarrier.inward.x)
  + ((initialBoundaryPoint.y - outerBarrier.start.y) * outerBarrier.inward.y);
assert.ok(initialBoundaryDistance >= 0.25 - 1e-12,
  'initial real-boundary points must receive a 0.025R inward safety gap');
const outsideAttempt = elastic.constrainPlanarElasticBandPoint(
  { x: 10, y: 10 },
  { x: -10, y: 10 },
  { polygons: [], barriers: [outerBarrier] }
);
const outsideDistance = ((outsideAttempt.x - outerBarrier.start.x) * outerBarrier.inward.x)
  + ((outsideAttempt.y - outerBarrier.start.y) * outerBarrier.inward.y);
assert.ok(outsideDistance >= 0, 'outer-boundary motion must remain on the accessible side');

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
const straightMaterialPoints = gluedSurface.points.slice(0, -1);
const straightStart = straightMaterialPoints[0];
const straightEnd = straightMaterialPoints.at(-1);
const straightDx = straightEnd.x - straightStart.x;
const straightDy = straightEnd.y - straightStart.y;
straightMaterialPoints.forEach((point) => {
  assert.ok(Math.abs(((point.x - straightStart.x) * straightDy)
    - ((point.y - straightStart.y) * straightDx)) <= 1e-10,
  'a cellular side must be initialized as a straight sampled segment, without a synthetic bow');
});
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

// Exercise the runtime adapter: five macro steps replace twenty full collision
// passes while retaining four old Jacobi substeps per macro.
elastic.state.homologyCordChains = { [gluedBand.generatorId]: gluedBand };
elastic.state.homologyCordDrag = null;
elastic.state.homologyCordRelaxSpeed = 1;
assert.strictEqual(elastic.state.homologyCordIterationsPerFrame, 5,
  'the runtime budget must contain five four-substep macro iterations');
const animationLength = bandLength(gluedBand);
const animationCount = gluedBand.points.length;
const pausedCoordinates = coordinates(gluedBand);
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands({
  now: gluedBand.relaxationNotBefore - 1
}), true, 'a newly generated band remains pending during its 300ms presentation pause');
assert.deepStrictEqual(coordinates(gluedBand), pausedCoordinates,
  'the presentation pause must not perform hidden relaxation steps');
assert.ok(elastic.backgroundHomologyCordAnimationDelay(gluedBand.relaxationNotBefore - 1) >= 1,
  'the scheduler must wait instead of spinning requestAnimationFrame during the pause');
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands({
  now: gluedBand.relaxationNotBefore
}), true);
assert.ok(bandLength(gluedBand) < animationLength);
assert.strictEqual(gluedBand.points.length, animationCount);

const speedComparisonPoints = coordinates(gluedBand).slice(0, -1);
const normalSpeedBand = closedChain(speedComparisonPoints, 'normal-speed');
const highSpeedBand = closedChain(speedComparisonPoints, 'high-speed');
elastic.state.homologyCordChains = { [normalSpeedBand.generatorId]: normalSpeedBand };
elastic.state.homologyCordRelaxSpeed = 1;
elastic.advanceBackgroundHomologyPlanarBands();
elastic.state.homologyCordChains = { [highSpeedBand.generatorId]: highSpeedBand };
elastic.state.homologyCordRelaxSpeed = 10;
elastic.advanceBackgroundHomologyPlanarBands();
assert.ok(bandLength(highSpeedBand) < bandLength(normalSpeedBand),
  'the multiplier must strengthen each solver step without adding iterations');

const legacyCollisionBand = closedChain(responsibilityPoints, 'legacy-collision-budget');
legacyCollisionBand.obstacles = responsibilityObstacle;
const legacyMetrics = {};
for (let index = 0; index < 20; index += 1) {
  elastic.stepPlanarElasticBand(legacyCollisionBand, {
    distanceContraction: 0.8,
    metrics: legacyMetrics
  });
}
const macroCollisionBand = closedChain(responsibilityPoints, 'macro-collision-budget');
macroCollisionBand.obstacles = responsibilityObstacle;
const macroMetrics = {};
elastic.state.homologyCordChains = { [macroCollisionBand.generatorId]: macroCollisionBand };
elastic.state.homologyCordRelaxSpeed = 10;
elastic.state.homologyCordIterationsPerFrame = 5;
elastic.advanceBackgroundHomologyPlanarBands({ metrics: macroMetrics });
assert.strictEqual(legacyMetrics.fullCollisionPasses, 20);
assert.strictEqual(macroMetrics.fullCollisionPasses, 5);
assert.ok(macroMetrics.fullCollisionPasses <= legacyMetrics.fullCollisionPasses * 0.25);
assert.ok(macroMetrics.narrowPhaseChecks <= legacyMetrics.narrowPhaseChecks * 0.25,
  'representative obstacle narrow-phase work must remain at or below 25%');
assertBandAvoidsObstacles(macroCollisionBand, responsibilityObstacle);

// An equilibrium chain settles within five stable macro steps and then
// reports no more animation work. Explicit wake-up clears that state.
const settledBand = closedChain([
  { x: 3, y: -2 },
  { x: 3, y: -2 },
  { x: 3, y: -2 }
], 'settled-runtime');
elastic.state.homologyCordChains = { [settledBand.generatorId]: settledBand };
elastic.state.homologyCordRelaxSpeed = 10;
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands(), false);
assert.strictEqual(settledBand.settled, true);
elastic.markBackgroundHomologyCordsUnsettled(settledBand.generatorId);
assert.strictEqual(settledBand.settled, false);
assert.strictEqual(settledBand.stableMacroSteps, 0);

// Particle hit-testing uses the same planar x/y values and maps the closing
// duplicate to canonical particle zero.
elastic.state.homologyCordMode = true;
elastic.state.showHomology = true;
elastic.state.homologyCordChains = { [gluedBand.generatorId]: gluedBand };
elastic.refs.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 20, height: 20 }) };
const hitPoint = gluedBand.points[1];
const hit = elastic.homologyCordAtPoint(hitPoint.x, hitPoint.y);
assert.ok(hit && hit.chain === gluedBand);

// Quotient runtime: a one-tile torus keeps tile-local particles and one
// immutable ordered spring per pair of consecutive particles. Portal copies
// are drawing trace segments, never extra optimizer particles.
elastic.setTestBoard({
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
setSquareGeometry(1, 1);
const torusAnalysis = calculator.analyzeBackgroundHomology();
const torusGenerator = torusAnalysis.generators[0];
const torusSurface = elastic.makeHomologyCordChain(
  torusGenerator,
  elastic.homologyChainDisplayEntries(torusAnalysis, torusGenerator),
  torusAnalysis
);
const quotientCreatedBefore = elastic.homologyCordNow();
const torusBand = elastic.makeHomologyCordRuntimeChain(torusSurface, torusAnalysis);
const quotientCreatedAfter = elastic.homologyCordNow();
assert.ok(torusBand && torusBand.solverSpace === 'quotient');
assert.ok(torusSurface.initializationCertificate && torusSurface.initializationCertificate.valid);
assert.strictEqual(
  torusSurface.initializationCertificate.targetHomologySignature,
  torusSurface.initializationCertificate.constructionHomologySignature,
  'the sampled cellular circuit must have the requested generator H1 coordinates'
);
assert.ok(torusBand.initializationCertificate && torusBand.initializationCertificate.valid);
assert.strictEqual(
  torusBand.initializationCertificate.expectedPortalSignature,
  torusBand.initialFreeHomotopySignature,
  'the initial quotient word must come from the certified cellular construction'
);
const otherTorusGenerator = torusAnalysis.generators.find((generator) => generator.id !== torusGenerator.id);
assert.ok(otherTorusGenerator);
assert.strictEqual(elastic.makeHomologyCordChain(
  torusGenerator,
  elastic.homologyChainDisplayEntries(torusAnalysis, otherTorusGenerator),
  torusAnalysis
), null, 'entries from another generator must fail the H1 initialization certificate');
const uncertifiedTorusSurface = {
  ...torusSurface,
  initializationCertificate: null
};
assert.strictEqual(
  elastic.makeHomologyCordRuntimeChain(uncertifiedTorusSurface, torusAnalysis),
  null,
  'a complete homology analysis must not enter the runtime solver without its certificate'
);
assert.ok(torusBand.relaxationNotBefore >= quotientCreatedBefore + 300
  && torusBand.relaxationNotBefore <= quotientCreatedAfter + 300);
assert.strictEqual(torusBand.springs.length, torusBand.points.length - 1);
assert.strictEqual(torusBand.atlas.portals.size, 4);
assert.strictEqual(elastic.validateQuotientElasticBand(torusBand), true);
torusBand.points.slice(0, -1).forEach((point) => {
  torusBand.atlas.portals.forEach((portal) => {
    if (portal.fromTile !== point.tileIndex) return;
    const cell = { x: 10, y: 10 };
    const midpoint = {
      x: (portal.source.start.x + portal.source.end.x) * 0.5,
      y: (portal.source.start.y + portal.source.end.y) * 0.5
    };
    const inwardLength = Math.hypot(cell.x - midpoint.x, cell.y - midpoint.y);
    const inward = {
      x: (cell.x - midpoint.x) / inwardLength,
      y: (cell.y - midpoint.y) / inwardLength
    };
    const gap = ((point.x - portal.source.start.x) * inward.x)
      + ((point.y - portal.source.start.y) * inward.y);
    assert.ok(gap >= 10 * 0.025 - 1e-9,
      'every initial quotient particle must clear every glued side of its tile by 0.025R');
  });
});
const torusStar = Array.from(torusBand.atlas.vertexStars.values())[0];
assert.strictEqual(torusStar.manifold, true);
assert.ok(Math.abs(torusStar.totalAngle - Math.PI * 2) < 1e-12);
const portalSpringIndex = torusBand.springs.findIndex((spring) => spring.word.length > 0);
assert.ok(portalSpringIndex >= 0);
const torusTrace = elastic.traceQuotientSegment(
  torusBand.points[portalSpringIndex],
  torusBand.points[(portalSpringIndex + 1) % (torusBand.points.length - 1)],
  torusBand.springs[portalSpringIndex],
  torusBand
);
assert.strictEqual(torusTrace.valid, true);
assert.ok(torusTrace.crossings.length > 0);
assert.ok(torusTrace.segments.length >= 2);
assert.ok(torusTrace.segments.every((segment) => segment.tileIndex === 0));
torusTrace.crossings.forEach((crossing) => {
  assert.strictEqual(torusTrace.segments.some((segment) => (
    Math.hypot(segment.start.x - crossing.point.x, segment.start.y - crossing.point.y) < 1e-7
    && Math.hypot(segment.end.x - crossing.mapped.x, segment.end.y - crossing.mapped.y) < 1e-7
  )), false, 'drawing trace must not connect paired edge copies with a canvas-spanning shortcut');
});

// The runtime chart model reads the current quotient chain without changing it.
const torusChartSector = torusStar.sectors[0];
elastic.state.homologyAnalysis = torusAnalysis;
elastic.state.homologyTopologyKey = elastic.backgroundHomologyTopologyKey();
elastic.state.showHomology = true;
elastic.state.homologyCordMode = true;
elastic.state.homologyCordChains = { [torusGenerator.id]: torusBand };
elastic.state.homologyLocalChartRadius = 2;
elastic.state.homologyLocalChartMode = 'radial';
elastic.state.homologyLocalChartSelection = {
  topologyKey: elastic.backgroundHomologyTopologyKey(),
  vertexId: torusStar.vertexId,
  sectorId: torusChartSector.id,
  componentIndex: 0,
  tileIndex: torusChartSector.tileIndex,
  corner: torusChartSector.vertex
};
const torusChartModel = elastic.buildHomologyLocalChartModel();
assert.ok(torusChartModel && torusChartModel.component.valid);
assert.ok(torusChartModel.particles.length > torusBand.points.length - 1,
  'equivalent corners retain multiple local lifts of a material particle');
assert.ok(torusChartModel.cords.length > 0);
assert.ok(torusChartModel.glueArrows.length > 0);
assert.ok(torusChartModel.glueArrows.some((arrow) => arrow.color === '#1f7a8c'));
assert.ok(torusChartModel.glueArrows.every((arrow) => (
  ['#1f7a8c', '#b23a48', '#6a4c93', '#c47f17', '#2f855a', '#8a4f7d'].includes(arrow.color)
)));
assert.ok(torusChartModel.glueArrows.some((arrow) => arrow.outward));
assert.ok(torusChartModel.glueArrows.some((arrow) => !arrow.outward));
elastic.state.homologyCordChains = {};
elastic.state.homologyAnalysis = null;
elastic.state.homologyTopologyKey = '';
const geometryOnlyChartModel = elastic.buildHomologyLocalChartModel();
assert.ok(geometryOnlyChartModel && geometryOnlyChartModel.frames.length > 0,
  'local geometry remains available before computing a homology basis');
assert.strictEqual(geometryOnlyChartModel.particles.length, 0);
assert.ok(geometryOnlyChartModel.glueArrows.length > 0);
elastic.state.homologyLocalChartSelection = null;

const quotientInitialLength = elastic.quotientElasticBandLength(torusBand);
const quotientMetrics = {};
for (let index = 0; index < 5; index += 1) {
  const result = elastic.stepQuotientElasticBandMacro(torusBand, {
    distanceContraction: 0.8,
    substeps: 4,
    metrics: quotientMetrics
  });
  assert.strictEqual(result.resolved, true);
  assert.strictEqual(elastic.validateQuotientElasticBand(torusBand), true);
}
assert.strictEqual(quotientMetrics.fullCollisionPasses, 5);
assert.ok(elastic.quotientElasticBandLength(torusBand) < quotientInitialLength);
assert.ok(quotientMetrics.quotientActiveParticles < 5 * (torusBand.points.length - 1),
  'far particles must avoid per-particle portal tracing');

// Dragging a material point across a portal updates the two adjacent spring
// gauges with a cancellable inverse pair, preserving the cyclic word and
// closure holonomy exactly.
const gaugeBand = elastic.makeQuotientElasticBandChain(torusSurface, torusAnalysis);
const gaugeSignature = elastic.canonicalHomologyCordCyclicWord(
  elastic.homologyCordCyclicPortalWord(gaugeBand)
);
const rightmostIndex = gaugeBand.points.slice(0, -1).reduce((best, point, index, points) => (
  point.x > points[best].x ? index : best
), 0);
const rightmost = { ...gaugeBand.points[rightmostIndex] };
assert.strictEqual(elastic.movePlanarElasticBandPoint(gaugeBand, rightmostIndex, {
  x: rightmost.x + 8,
  y: rightmost.y
}), true);
assert.strictEqual(elastic.canonicalHomologyCordCyclicWord(
  elastic.homologyCordCyclicPortalWord(gaugeBand)
), gaugeSignature);
assert.strictEqual(elastic.validateQuotientElasticBand(gaugeBand), true);
assert.notStrictEqual(gaugeBand.points[rightmostIndex].x, rightmost.x + 8);

// A failed drag is one transaction: geometry, spring words, and runtime
// state all return to the state before the pointer move.
const rejectedDragBand = elastic.makeQuotientElasticBandChain(torusSurface, torusAnalysis);
const rejectedDragIndex = rejectedDragBand.points.slice(0, -1).reduce((best, point, index, points) => (
  point.x > points[best].x ? index : best
), 0);
const rejectedDragBefore = JSON.stringify({
  points: rejectedDragBand.points,
  springs: rejectedDragBand.springs,
  expectedHolonomy: rejectedDragBand.expectedHolonomy,
  discreteStateVersion: rejectedDragBand.discreteStateVersion,
  settled: rejectedDragBand.settled,
  stableMacroSteps: rejectedDragBand.stableMacroSteps
});
const rejectedDragSignature = rejectedDragBand.initialFreeHomotopySignature;
rejectedDragBand.initialFreeHomotopySignature = 'forced-invalid-signature';
assert.strictEqual(elastic.movePlanarElasticBandPoint(rejectedDragBand, rejectedDragIndex, {
  x: rejectedDragBand.points[rejectedDragIndex].x + 2,
  y: rejectedDragBand.points[rejectedDragIndex].y
}), false);
assert.strictEqual(JSON.stringify({
  points: rejectedDragBand.points,
  springs: rejectedDragBand.springs,
  expectedHolonomy: rejectedDragBand.expectedHolonomy,
  discreteStateVersion: rejectedDragBand.discreteStateVersion,
  settled: rejectedDragBand.settled,
  stableMacroSteps: rejectedDragBand.stableMacroSteps
}), rejectedDragBefore);
rejectedDragBand.initialFreeHomotopySignature = rejectedDragSignature;
assert.strictEqual(elastic.validateQuotientElasticBand(rejectedDragBand), true);

const heldQuotient = elastic.makeQuotientElasticBandChain(torusSurface, torusAnalysis);
const heldQuotientBefore = { ...heldQuotient.points[3] };
assert.strictEqual(elastic.stepQuotientElasticBandMacro(heldQuotient, {
  distanceContraction: 0.8,
  substeps: 4,
  heldIndex: 3
}).resolved, true);
assert.deepStrictEqual({
  x: heldQuotient.points[3].x,
  y: heldQuotient.points[3].y,
  tileIndex: heldQuotient.points[3].tileIndex
}, {
  x: heldQuotientBefore.x,
  y: heldQuotientBefore.y,
  tileIndex: heldQuotientBefore.tileIndex
});

// A single displacement can traverse several different portals, but the
// hard eight-crossing cap guarantees finite termination.
const multiPortal = elastic.traceQuotientMotion(
  torusBand,
  0,
  { x: 10, y: 10, tileIndex: 0 },
  { x: 55, y: 35 }
);
assert.strictEqual(multiPortal.valid, true);
assert.ok(multiPortal.crossings.length >= 3);
assert.ok(new Set(multiPortal.crossings.map((crossing) => crossing.portalId)).size >= 2);
const overLimit = elastic.traceQuotientMotion(
  torusBand,
  0,
  { x: 10, y: 10, tileIndex: 0 },
  { x: 255, y: 10 }
);
assert.strictEqual(overLimit.valid, false);
assert.strictEqual(overLimit.reason, 'portal-crossing-limit');
const invalidQuotientSurface = {
  ...torusSurface,
  points: torusSurface.points.map((point) => ({ ...point }))
};
invalidQuotientSurface.points[elastic.homologyCordPhysicalIndices(invalidQuotientSurface)[0]].tileIndex = 1;
assert.strictEqual(elastic.makeQuotientElasticBandChain(invalidQuotientSurface, torusAnalysis), null,
  'an initial quotient chain touching a removed tile must fall back before animation');

// Reversed self-gluing reflects the tangential coordinate while preserving a
// continuous normal displacement through the paired edge.
elastic.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [1, 2, 3],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 2 }, reversed: true }
  ]
});
setSquareGeometry(1, 1);
const mobiusAnalysis = calculator.analyzeBackgroundHomology();
const mobiusGenerator = mobiusAnalysis.generators[0];
const mobiusBand = elastic.makeQuotientElasticBandChain(elastic.makeHomologyCordChain(
  mobiusGenerator,
  elastic.homologyChainDisplayEntries(mobiusAnalysis, mobiusGenerator),
  mobiusAnalysis
), mobiusAnalysis);
assert.ok(mobiusBand);
const reflectedMotion = elastic.traceQuotientMotion(
  mobiusBand,
  0,
  { x: 10, y: 6, tileIndex: 0 },
  { x: 25, y: 6 }
);
assert.strictEqual(reflectedMotion.valid, true);
assertPointNear(reflectedMotion.point, { x: 5, y: 14 });

// The usual-strip generator changes charts at the endpoint of its bottom
// portal.  That endpoint crossing must remain in the spring word; otherwise
// the two distant display copies are mistaken for a disconnected segment.
// Its following boundary-corner switch must remain directly traceable even
// when the route crosses more than the motion transaction's portal cap.
elastic.setTestBoard({
  rows: 4,
  cols: 5,
  lattice: 'hexagonal',
  boundary: 'glued',
  gluedEdges: [
    [0, 3, 4, 0],
    [0, 2, 9, 5],
    [5, 3, 9, 0],
    [10, 4, 9, 1],
    [10, 3, 14, 0],
    [10, 2, 19, 5],
    [15, 3, 19, 0]
  ].map(([fromIndex, fromDir, toIndex, toDir]) => ({
    first: { index: fromIndex, dir: fromDir },
    second: { index: toIndex, dir: toDir }
  }))
});
setHexGeometry(4, 5);
const usualStripAnalysis = calculator.analyzeBackgroundHomology();
assert.strictEqual(usualStripAnalysis.group, 'Z');
const usualStripGenerator = usualStripAnalysis.generators[0];
const usualStripSurfaceChain = elastic.makeHomologyCordChain(
  usualStripGenerator,
  elastic.homologyChainDisplayEntries(usualStripAnalysis, usualStripGenerator),
  usualStripAnalysis
);
const usualStripBand = elastic.makeHomologyCordRuntimeChain(
  usualStripSurfaceChain,
  usualStripAnalysis
);
assert.ok(usualStripBand, 'usual strip must form one continuous quotient elastic cord');
assert.strictEqual(usualStripBand.solverSpace, 'quotient');
assert.ok(usualStripBand.springs.some((spring) => spring.word.includes('15:3>19:0')),
  'a portal crossing at a glued endpoint remains part of the spring itinerary');
usualStripBand.relaxationNotBefore = 0;
for (let step = 0; step < 50; step += 1) {
  assert.strictEqual(
    elastic.stepQuotientElasticBandMacro(usualStripBand, { distanceContraction: 0.05 }).resolved,
    true,
    `usual-strip quotient macro ${step} remains valid`
  );
  assert.strictEqual(elastic.validateQuotientElasticBand(usualStripBand), true);
}
assert.strictEqual(usualStripBand.fallbackToCellular, false);
assert.strictEqual(
  usualStripBand.springs.some((spring) => spring.vertexEvent?.constructionBridge),
  false,
  'the temporary boundary-corner bridge detaches after an inset route opens'
);

// A normal four-square 2pi vertex is traversed through its continuous sector
// fan. Cone shortcuts use the exact two-sided geodesic predicate.
elastic.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  gluedEdges: [
    { first: { index: 0, dir: 3 }, second: { index: 1, dir: 3 }, reversed: true }
  ]
});
setSquareGeometry(2, 2);
const vertexAnalysis = calculator.analyzeBackgroundHomology();
const vertexAtlas = elastic.makeHomologyCordQuotientAtlas(vertexAnalysis);
const centralStar = Array.from(vertexAtlas.vertexStars.values()).find((star) => (
  star.sectors.length === 4 && Math.abs(star.totalAngle - Math.PI * 2) < 1e-12
));
assert.ok(centralStar && centralStar.manifold);
const throughOrdinaryVertex = elastic.traceQuotientMotion(
  { atlas: vertexAtlas },
  0,
  { x: 15, y: 15, tileIndex: 0 },
  { x: 35, y: 35 }
);
assert.strictEqual(throughOrdinaryVertex.valid, true);
assert.strictEqual(throughOrdinaryVertex.point.tileIndex, 3);
assert.strictEqual(throughOrdinaryVertex.crossings.length, 0);
assert.strictEqual(elastic.homologyCordApexRouteAllowed(Math.PI, Math.PI / 2), false);
assert.strictEqual(elastic.homologyCordApexRouteAllowed(Math.PI * 2, Math.PI), true);
assert.strictEqual(elastic.homologyCordApexRouteAllowed(Math.PI * 3, Math.PI), true);
assert.strictEqual(elastic.homologyCordApexRouteAllowed(Math.PI * 3, Math.PI * 0.9), false);
const traversedStar = vertexAtlas.vertexStars.get(throughOrdinaryVertex.vertexEvents[0].vertexId);
const oldManifold = traversedStar.manifold;
traversedStar.manifold = false;
assert.strictEqual(elastic.traceQuotientMotion(
  { atlas: vertexAtlas },
  0,
  { x: 15, y: 15, tileIndex: 0 },
  { x: 35, y: 35 }
).reason, 'non-manifold-vertex');
traversedStar.manifold = oldManifold;

// Regression for portal-word intersection migrating through a normal vertex:
// this reflected seam used to fail at macro step 65 and then fall back.
const mixedGenerator = vertexAnalysis.generators[0];
const mixedSurfaceChain = elastic.makeHomologyCordChain(
  mixedGenerator,
  elastic.homologyChainDisplayEntries(vertexAnalysis, mixedGenerator),
  vertexAnalysis
);
const mixedBand = elastic.makeQuotientElasticBandChain(mixedSurfaceChain, vertexAnalysis);
assert.ok(mixedBand);
const mixedInitialLength = elastic.quotientElasticBandLength(mixedBand);
for (let index = 0; index < 120; index += 1) {
  assert.strictEqual(elastic.stepQuotientElasticBandMacro(mixedBand, {
    distanceContraction: 0.8,
    substeps: 4
  }).resolved, true);
}
assert.strictEqual(mixedBand.fallbackToCellular, false);
assert.strictEqual(elastic.validateQuotientElasticBand(mixedBand), true);
assert.strictEqual(
  mixedBand.initializationCertificate.expectedPortalSignature,
  mixedBand.initialFreeHomotopySignature
);
assert.deepStrictEqual(
  mixedBand.springs.flatMap((spring) => spring.word),
  ['0:3>1:3'],
  'near-boundary samples must not add geometrically inferred portals to the certified word'
);
assert.ok(elastic.quotientElasticBandLength(mixedBand) < mixedInitialLength * 0.6);

// If one particle cannot be traced, the macro commits the other valid
// particle transactions and leaves only the failed particle in place.
const isolatedBand = elastic.makeQuotientElasticBandChain(elastic.makeHomologyCordChain(
  mixedGenerator,
  elastic.homologyChainDisplayEntries(vertexAnalysis, mixedGenerator),
  vertexAnalysis
), vertexAnalysis);
const isolatedIndex = isolatedBand.springs.findIndex((spring) => spring.word.length > 0);
assert.ok(isolatedIndex >= 0);
const isolatedBefore = isolatedBand.points.map((point) => ({
  x: point.x,
  y: point.y,
  tileIndex: point.tileIndex
}));
const isolatedResult = elastic.stepQuotientElasticBandMacro(isolatedBand, {
  distanceContraction: 0.8,
  substeps: 4,
  traceMotion(chain, index, start, target, options) {
    if (index === isolatedIndex) {
      return { valid: false, point: { ...start }, crossings: [], vertexEvents: [], reason: 'test-local-failure' };
    }
    return elastic.traceQuotientMotion(chain, index, start, target, options);
  }
});
assert.strictEqual(isolatedResult.resolved, true);
assert.strictEqual(isolatedResult.partial, true);
assert.ok(isolatedResult.failedIndices.includes(isolatedIndex));
assert.deepStrictEqual({
  x: isolatedBand.points[isolatedIndex].x,
  y: isolatedBand.points[isolatedIndex].y,
  tileIndex: isolatedBand.points[isolatedIndex].tileIndex
}, isolatedBefore[isolatedIndex]);
assert.ok(isolatedBand.points.slice(0, -1).some((point, index) => (
  index !== isolatedIndex && (Math.hypot(
    point.x - isolatedBefore[index].x,
    point.y - isolatedBefore[index].y
  ) > 1e-8 || point.tileIndex !== isolatedBefore[index].tileIndex)
)), 'valid particles must continue when one local trace fails');
assert.strictEqual(elastic.validateQuotientElasticBand(isolatedBand), true);
assert.strictEqual(isolatedBand.fallbackToCellular, false);

// A carrier that is already globally invalid is stopped in its last quotient
// state. It is never replaced by the cellular drawing.
const failingBand = elastic.makeQuotientElasticBandChain(elastic.makeHomologyCordChain(
  mixedGenerator,
  elastic.homologyChainDisplayEntries(vertexAnalysis, mixedGenerator),
  vertexAnalysis
), vertexAnalysis);
failingBand.springs[0].word = ['missing-portal'];
failingBand.relaxationNotBefore = 0;
elastic.state.homologyCordChains = { [failingBand.generatorId]: failingBand };
elastic.state.homologyCordDrag = null;
elastic.state.homologyCordRelaxSpeed = 10;
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands({ now: 1e9 }), false);
assert.strictEqual(failingBand.quotientFailureCount, 1);
assert.strictEqual(failingBand.fallbackToCellular, false);
assert.strictEqual(elastic.advanceBackgroundHomologyPlanarBands({ now: 1e9 }), false);
assert.strictEqual(failingBand.quotientFailureCount, 1);
assert.strictEqual(failingBand.fallbackToCellular, false);
assert.strictEqual(failingBand.settled, true);

// An atlas containing a portal but failing its affine/inverse invariant must
// reject the elastic runtime instead of silently using the planar fast path.
const validAtlasFlag = vertexAtlas.valid;
vertexAtlas.valid = false;
assert.strictEqual(elastic.makeHomologyCordRuntimeChain(elastic.makeHomologyCordChain(
  mixedGenerator,
  elastic.homologyChainDisplayEntries(vertexAnalysis, mixedGenerator),
  vertexAnalysis
), vertexAnalysis), null);
vertexAtlas.valid = validAtlasFlag;

// Cut edges, unglued outer edges, and removed tiles remain one-sided
// obstacles even when another boundary pair activates the quotient solver.
elastic.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
  gluedEdges: [
    { first: { index: 0, dir: 3 }, second: { index: 1, dir: 3 }, reversed: true }
  ]
});
setSquareGeometry(2, 2);
const cutAtlas = elastic.makeHomologyCordQuotientAtlas(calculator.analyzeBackgroundHomology());
const cutBlocked = elastic.traceQuotientMotion(
  { atlas: cutAtlas },
  0,
  { x: 15, y: 10, tileIndex: 0 },
  { x: 35, y: 10 }
);
assert.strictEqual(cutBlocked.valid, true);
assert.strictEqual(cutBlocked.blocked, true);
assert.strictEqual(cutBlocked.point.tileIndex, 0);
const outerBlocked = elastic.traceQuotientMotion(
  { atlas: cutAtlas },
  0,
  { x: 10, y: 15, tileIndex: 0 },
  { x: -15, y: 15 }
);
assert.strictEqual(outerBlocked.valid, true);
assert.strictEqual(outerBlocked.blocked, true);
assert.strictEqual(outerBlocked.point.tileIndex, 0);

elastic.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [3],
  gluedEdges: [
    { first: { index: 0, dir: 3 }, second: { index: 1, dir: 3 }, reversed: true }
  ]
});
setSquareGeometry(2, 2);
const removedAtlas = elastic.makeHomologyCordQuotientAtlas(calculator.analyzeBackgroundHomology());
const removedBlocked = elastic.traceQuotientMotion(
  { atlas: removedAtlas },
  0,
  { x: 30, y: 15, tileIndex: 1 },
  { x: 30, y: 35 }
);
assert.strictEqual(removedBlocked.valid, true);
assert.strictEqual(removedBlocked.blocked, true);
assert.strictEqual(removedBlocked.point.tileIndex, 1);

// Every H1 basis generator of the 15x15 genus-4 preset must survive the
// certified cellular-to-quotient initialization. In particular, a1 ends at
// a glued removed-region corner and a2 needs more than eight ordinary tile
// chart transitions after its portal crossing.
const genusFourEntry = require('../ramified_minigame_presets/presets.js').presets.find((entry) => (
  entry.id === 'gomoku-m4-15x15'
));
const genusFourPayload = elastic.normalizeExportImportPayload(
  elastic.materializeMinigamePresetForMosaic(
    genusFourEntry,
    require('../ramified_minigame_presets/gomoku_m4_15x15.preset.js'),
    '2048'
  )
);
elastic.setTestBoard(genusFourPayload);
setSquareGeometry(15, 15);
const genusFourAnalysis = calculator.analyzeBackgroundHomology();
assert.strictEqual(genusFourAnalysis.group, 'Z^8');
const genusFourBands = new Map();
genusFourAnalysis.generators.forEach((generator) => {
  const surfaceChain = elastic.makeHomologyCordChain(
    generator,
    elastic.homologyChainDisplayEntries(genusFourAnalysis, generator),
    genusFourAnalysis
  );
  assert.ok(surfaceChain && surfaceChain.initializationCertificate.valid,
    `${generator.id} must retain its cellular H1 certificate`);
  const band = elastic.makeHomologyCordRuntimeChain(surfaceChain, genusFourAnalysis);
  assert.ok(band, `${generator.id} must initialize on the genus-4 quotient`);
  assert.strictEqual(surfaceChain.initializationFailureReason, '');
  assert.strictEqual(band.initializationCertificate.expectedPortalSignature, band.initialFreeHomotopySignature);
  assert.strictEqual(elastic.validateQuotientElasticBand(band), true);
  genusFourBands.set(generator.id, band);
});
assert.strictEqual(genusFourBands.size, 8);
assert.strictEqual(genusFourBands.get('a1').initialFreeHomotopySignature, '85:2>89:0');
assert.strictEqual(genusFourBands.get('a2').initialFreeHomotopySignature, '150:2>164:0');
['a1', 'a2'].forEach((generatorId) => {
  const band = genusFourBands.get(generatorId);
  for (let step = 0; step < 3; step += 1) {
    assert.strictEqual(elastic.stepQuotientElasticBandMacro(band, {
      distanceContraction: 0.08,
      substeps: 4
    }).resolved, true, `${generatorId} relaxation step ${step} remains valid`);
    assert.strictEqual(elastic.validateQuotientElasticBand(band), true);
  }
});

// The local-geometry debug chart unfolds only the clicked connected component.
// Closed stars target 2pi, boundary stars target pi, and malformed branching
// components are reported instead of being presented as a valid cone.
function syntheticLocalStar(count, options = {}) {
  const closed = !!options.closed;
  const angle = options.angle || Math.PI / 2;
  const sectors = Array.from({ length: count }, (_, id) => {
    const previous = id > 0 ? id - 1 : (closed ? count - 1 : null);
    const next = id + 1 < count ? id + 1 : (closed ? 0 : null);
    const neighbors = [previous, next].filter((value) => value != null);
    return {
      id,
      tileIndex: options.tileIndices ? options.tileIndices[id] : id,
      vertex: id,
      angle,
      neighbors,
      links: [
        previous == null ? null : { neighborId: previous, boundary: 'start', dir: 0 },
        next == null ? null : { neighborId: next, boundary: 'end', dir: 1 }
      ].filter(Boolean)
    };
  });
  return { vertexId: 7, sectors, cyclicComponents: [sectors.map((sector) => sector.id)] };
}

const ordinaryLocal = elastic.homologyLocalChartComponent(syntheticLocalStar(4, { closed: true }), 0);
assert.ok(ordinaryLocal.valid && ordinaryLocal.closed);
assert.ok(Math.abs(ordinaryLocal.totalAngle - (2 * Math.PI)) < 1e-12);
assert.ok(Math.abs(ordinaryLocal.alpha - 1) < 1e-12);
const coneLocal = elastic.homologyLocalChartComponent(syntheticLocalStar(8, { closed: true }), 3);
assert.ok(coneLocal.valid && Math.abs(coneLocal.totalAngle - (4 * Math.PI)) < 1e-12);
assert.ok(Math.abs(coneLocal.alpha - 0.5) < 1e-12);
const boundaryLocal = elastic.homologyLocalChartComponent(syntheticLocalStar(2), 0);
assert.ok(boundaryLocal.valid && boundaryLocal.open);
assert.ok(Math.abs(boundaryLocal.targetAngle - Math.PI) < 1e-12);

const disconnectedStar = syntheticLocalStar(1);
disconnectedStar.sectors.push({
  id: 1, tileIndex: 4, vertex: 1, angle: Math.PI / 2, neighbors: [], links: []
});
disconnectedStar.cyclicComponents = [[0], [1]];
assert.deepStrictEqual(elastic.homologyLocalChartComponent(disconnectedStar, 1).sectorIds, [1]);
assert.strictEqual(elastic.homologyLocalChartLiftFrames([
  { sector: { tileIndex: 2 }, sectorId: 0 },
  { sector: { tileIndex: 2 }, sectorId: 1 },
  { sector: { tileIndex: 3 }, sectorId: 2 }
], 2).length, 2, 'one particle keeps every matching corner lift');

const branchedStar = {
  vertexId: 9,
  sectors: [
    { id: 0, angle: Math.PI / 2, neighbors: [1, 2, 3], links: [] },
    { id: 1, angle: Math.PI / 2, neighbors: [0], links: [] },
    { id: 2, angle: Math.PI / 2, neighbors: [0], links: [] },
    { id: 3, angle: Math.PI / 2, neighbors: [0], links: [] }
  ],
  cyclicComponents: [[0, 1, 2, 3]]
};
assert.strictEqual(elastic.homologyLocalChartComponent(branchedStar, 0).valid, false);

const radialMap = elastic.mapHomologyLocalChartPolar(0.5, Math.PI, 0.5, 'radial', 1);
const conformalMap = elastic.mapHomologyLocalChartPolar(0.5, Math.PI, 0.5, 'conformal', 1);
assert.ok(Math.abs(radialMap.radius - 0.5) < 1e-12);
assert.ok(Math.abs(conformalMap.radius - Math.sqrt(0.5)) < 1e-12);
assert.strictEqual(elastic.mapHomologyLocalChartVector(0, 0, 1, 0, 0.5, 'conformal', 1).valid, false);
assert.strictEqual(elastic.mapHomologyLocalChartVector(0.5, 0, 1, 0, 0.5, 'radial', 1).valid, true);
const clippedLocalSegment = elastic.clipHomologyLocalChartSegment(
  { x: -2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }, 1
);
assertPointNear(clippedLocalSegment.start, { x: -1, y: 0 });
assertPointNear(clippedLocalSegment.end, { x: 1, y: 0 });

// Removed solver entry points must not survive as functions or test exports.
const sourceText = fs.readFileSync(path.join(__dirname, 'mosaic_calculator.js'), 'utf8');
const htmlText = fs.readFileSync(path.join(__dirname, '..', 'mosaic_calculator.html'), 'utf8');
assert.strictEqual(htmlText.includes('id="homology-cord-contraction-strength"'), false);
assert.ok(htmlText.includes('id="homology-cord-relax-speed" min="0.1" max="10" step="0.1" value="10"'));
assert.ok(htmlText.includes('js/mosaic_calculator.js?v=homology-local-chart-5'));
assert.ok(htmlText.includes('id="homology-local-chart-card"'));
assert.ok(htmlText.includes('id="homology-local-chart-wide"'));
assert.ok(htmlText.includes('data-card-wide-button="#homology-local-chart-wide"'));
assert.ok(htmlText.includes('data-card-wide-host="#homology-local-chart-wide-host"'));
assert.ok(htmlText.includes('data-card-side-host="#homology-local-chart-side-host"'));
assert.ok(sourceText.includes("refs.homologyLocalChartCard.dataset.cardWideState !== 'wide'"));
assert.ok(sourceText.includes('window.CalculatorCards.syncWideCards(document)'));
assert.ok(htmlText.includes('id="inspect-homology-local-vertex"'));
const drawCordSource = sourceText.slice(
  sourceText.indexOf('function drawBackgroundHomologyCords'),
  sourceText.indexOf('function drawHomologyCordSeamMarkers')
);
assert.strictEqual(drawCordSource.includes('scheduleBackgroundHomologyCordAnimation()'), false,
  'drawing a settled cord must not restart requestAnimationFrame');
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

console.log('mosaic_calculator_elastic_band_test: planar and quotient elastic-band tests passed');
