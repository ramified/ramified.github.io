'use strict';

const assert = require('assert');
const calculator = require('./mosaic_calculator.js');
const elastic = calculator.__test;

function chain(points, deck = { x: 3, y: 0 }) {
  return {
    deck,
    points: points.map((point) => ({ portal: false, tileIndex: 0, ox: 0, oy: 0, ...point }))
  };
}

function candidates(subject, options = { stepSize: 0.2, maximumMove: 1 }) {
  return elastic.homologyCordElasticBandCandidates(subject, options).candidates;
}

// Milestone 1: normalized-neighbor contraction is zero on every straight
// line, including strongly unequal parameterisation.
const straight = chain([{ x: 0, y: 0 }, { x: 0.1, y: 0 }, { x: 2.8, y: 0 }, { x: 3, y: 0 }]);
const straightNext = candidates(straight);
assert.deepStrictEqual(straightNext.map(({ x, y }) => ({ x, y })), straight.points.map(({ x, y }) => ({ x, y })));
assert.deepStrictEqual(elastic.computeHomologyCordContractionDirection(
  { x: 0, y: 0 }, { x: 0.1, y: 0 }, { x: 2.8, y: 0 }
), { x: 0, y: 0 });

const v = chain([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
const vNext = candidates(v);
assert.ok(vNext[1].y < v.points[1].y, 'a V corner contracts along its angle bisector');
assert.ok(elastic.homologyCordSnapshotLength(vNext) < elastic.homologyCordSnapshotLength(elastic.homologyCordSnapshot(v)));

const degenerate = chain([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
assert.ok(candidates(degenerate).every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));

// Milestone 2: closure is affine and exact; p0 is free to translate.
const affine = chain([{ x: 1, y: 2 }, { x: 1.5, y: 2.8 }, { x: 2.5, y: 2.2 }, { x: 5, y: -2 }]);
affine.closure = { matrix: { a: 1, b: 0, c: 0, d: -1 }, offset: { x: 4, y: 0 } };
const affineNext = candidates(affine);
assert.ok(elastic.homologyCordClosureError(affine, affineNext[0], affineNext[affineNext.length - 1]) < 1e-10);
assert.notDeepStrictEqual(affineNext[0], affine.points[0], 'the canonical endpoint is not pinned');

// Milestone 3: accepted updates are length monotonic, deterministic, and
// backtrack an oversized raw step instead of depending on velocity damping.
function optimise(subject, iterations, stepSize) {
  const lengths = [];
  for (let index = 0; index < iterations; index += 1) {
    const result = elastic.relaxHomologyCordElasticBandIteration(subject, null, {
      stepSize,
      maximumMove: 10,
      maxBacktracking: 12,
      lengthTolerance: 1e-10,
      stableIterations: 100
    });
    assert.ok(result.accepted, 'the optimizer accepts a backtracked step');
    lengths.push(result.length);
  }
  return lengths;
}
const oversized = chain([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: -1 }, { x: 3, y: 0 }]);
const lengths = optimise(oversized, 12, 8);
lengths.slice(1).forEach((length, index) => assert.ok(length <= lengths[index] + 1e-10));
assert.ok(oversized.lastOptimization.attempts > 0, 'oversized step used backtracking');
const deterministicLeft = chain([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: -1 }, { x: 3, y: 0 }]);
const deterministicRight = chain([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: -1 }, { x: 3, y: 0 }]);
optimise(deterministicLeft, 20, 0.4);
optimise(deterministicRight, 20, 0.4);
assert.deepStrictEqual(
  deterministicLeft.points.map(({ x, y }) => ({ x, y })),
  deterministicRight.points.map(({ x, y }) => ({ x, y }))
);

// Equal optimization budgets produce the same result regardless of how the
// iterations are grouped into animation frames.
function optimiseInFrames(subject, frameCount, iterationsPerFrame, stepSize) {
  for (let frame = 0; frame < frameCount; frame += 1) {
    optimise(subject, iterationsPerFrame, stepSize);
  }
}
const frameBudgetOne = chain([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: -1 }, { x: 3, y: 0 }]);
const frameBudgetFour = chain([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: -1 }, { x: 3, y: 0 }]);
optimiseInFrames(frameBudgetOne, 24, 1, 0.4);
optimiseInFrames(frameBudgetFour, 6, 4, 0.4);
assert.deepStrictEqual(
  frameBudgetOne.points.map(({ x, y }) => ({ x, y })),
  frameBudgetFour.points.map(({ x, y }) => ({ x, y }))
);

// Continuing well after convergence must not introduce coordinate or length
// drift on an equilibrium cord.
const longRun = chain([{ x: 0, y: 0 }, { x: 0.25, y: 0 }, { x: 2.5, y: 0 }, { x: 3, y: 0 }]);
const longRunInitial = longRun.points.map(({ x, y }) => ({ x, y }));
for (let index = 0; index < 60; index += 1) {
  const result = elastic.relaxHomologyCordElasticBandIteration(longRun, null, {
    stepSize: 0.4,
    maximumMove: 1,
    maxBacktracking: 8,
    stableIterations: 5
  });
  assert.ok(result.accepted);
}
assert.strictEqual(longRun.settled, true);
assert.deepStrictEqual(longRun.points.map(({ x, y }) => ({ x, y })), longRunInitial);

// Milestone 4: a real boundary keeps the tangential component and discards
// the normal component.  This is projection, not a reflected velocity.
const boundarySlide = elastic.projectHomologyCordBoundaryDisplacement(
  { x: 2, y: 1 },
  { x: 5, y: -4 },
  { segment: { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } } }
);
assert.deepStrictEqual(boundarySlide, { x: 5, y: 0 });

// Milestone 5: portal maps use an affine tangent/normal frame.  The tangent
// rotates with the target edge and reverses when the gluing reverses it.
const source = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
const target = { start: { x: 20, y: 0 }, end: { x: 20, y: 10 } };
const portal = elastic.homologyCordAffinePortalTransform(source, target, true, { x: 5, y: -5 }, { x: 25, y: 5 }, 0);
assert.deepStrictEqual(portal.mapVector({ x: 3, y: 0 }), { x: 0, y: 3 });
assert.deepStrictEqual(portal.mapVector({ x: 0, y: 2 }), { x: 2, y: 0 });
const reversedPortal = elastic.homologyCordAffinePortalTransform(source, target, false, { x: 5, y: -5 }, { x: 25, y: 5 }, 0);
assert.deepStrictEqual(reversedPortal.mapVector({ x: 3, y: 0 }), { x: 0, y: -3 });
assert.deepStrictEqual(portal.mapPosition({ x: 4, y: 2 }), { x: 22, y: 4 });

// Milestone 6: remeshing is geometric and independent of rest length.
calculator.__test.setTestBoard({ rows: 2, cols: 2, lattice: 'square', boundary: 'glued' });
const insertChain = chain([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }], { x: 10, y: 0 });
insertChain.minimumParticleCount = 3;
insertChain.topologySignature = insertChain.initialTopologySignature = 'a1|1';
insertChain.portalItinerary = [];
assert.strictEqual(elastic.resampleHomologyCordElasticBand(insertChain, null, { minSpacing: 1, maxSpacing: 2, skipValidation: true }), true);
assert.strictEqual(insertChain.points.length, 4);
assert.ok(Math.abs(elastic.homologyCordMaterialLength(insertChain) - 10) < 1e-10);
const removeChain = chain([{ x: 0, y: 0 }, { x: 4.99, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }], { x: 10, y: 0 });
removeChain.minimumParticleCount = 3;
removeChain.topologySignature = removeChain.initialTopologySignature = 'a1|1';
removeChain.portalItinerary = [];
assert.strictEqual(elastic.resampleHomologyCordElasticBand(removeChain, null, { minSpacing: 3, maxSpacing: 6, skipValidation: true }), true);
assert.strictEqual(removeChain.points.length, 3);

// Milestone 7: the exact cellular representative is immutable and a changed
// portal crossing route is rejected rather than treated as the same class.
assert.strictEqual(elastic.homologyCordSameItinerary(
  [{ fromTile: 0, fromDir: 0, toTile: 1, toDir: 2, parameter: 0.5 }],
  [{ fromTile: 0, fromDir: 0, toTile: 1, toDir: 2, parameter: 0.1 }]
), true);
assert.strictEqual(elastic.homologyCordSameItinerary(
  [{ fromTile: 0, fromDir: 0, toTile: 1, toDir: 2 }],
  [{ fromTile: 0, fromDir: 1, toTile: 1, toDir: 3 }]
), false);

// Actual-board trace: a cross-tile segment must cross the paired shared edge
// at one matching parameter; moving the endpoint to an unrelated tile fails.
calculator.__test.setTestBoard({ rows: 2, cols: 2, lattice: 'square', boundary: 'glued' });
calculator.__test.setTestGeometry({ radius: 10, cells: [
  { x: 10, y: 10 }, { x: 30, y: 10 }, { x: 10, y: 30 }, { x: 30, y: 30 }
] });
const localTrace = [
  { x: 15, y: 10, tileIndex: 0, portal: false, frame: elastic.homologyCordAffineIdentity() },
  { x: 25, y: 10, tileIndex: 1, portal: false, frame: elastic.homologyCordAffineIdentity() }
];
assert.ok(elastic.homologyCordSegmentTrace(localTrace[0], localTrace[1], { complex: { sideToEdge: new Map() } }));
const tunneled = { ...localTrace[1], tileIndex: 3 };
assert.strictEqual(elastic.homologyCordSegmentTrace(localTrace[0], tunneled, { complex: { sideToEdge: new Map() } }), null);

// A real self-glued one-tile torus uses the selected side's actual opposite
// partner, yielding translation holonomy and a nonempty closure itinerary.
calculator.__test.setTestBoard({
  rows: 2, cols: 2, lattice: 'square', boundary: 'glued', removedTiles: [1, 2, 3],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 2 }, reversed: false },
    { first: { index: 0, dir: 1 }, second: { index: 0, dir: 3 }, reversed: false }
  ]
});
calculator.__test.setTestGeometry({ radius: 10, cells: [{ x: 10, y: 10 }] });
const constructionAnalysis = { complex: { sideToEdge: new Map([
  ['0:0', { localStart: true }], ['0:2', { localStart: true }]
]) } };
const constructionEntries = [
  { coefficient: 1n, reverse: false, edge: { id: 0, source: 0, target: 0 }, side: { index: 0, dir: 0 }, segment: { start: { x: 20, y: 0 }, end: { x: 20, y: 20 } } }
];
const constructed = elastic.makeHomologyCordChain({ id: 'a1', edgeChain: [1n] }, constructionEntries, constructionAnalysis);
assert.ok(constructed);
assert.ok(Math.abs(constructed.closure.matrix.a - 1) < 1e-10);
assert.ok(Math.abs(constructed.closure.matrix.b) < 1e-10);
assert.ok(Math.abs(constructed.closure.matrix.c) < 1e-10);
assert.ok(Math.abs(constructed.closure.matrix.d - 1) < 1e-10);
assert.ok(Math.abs(constructed.closure.offset.x - 20) < 1e-10);
assert.ok(Math.abs(constructed.closure.offset.y) < 1e-10);
assert.deepStrictEqual(constructed.portalItinerary, [
  { fromTile: 0, fromDir: 0, toTile: 0, toDir: 2 }
]);
assert.ok(elastic.homologyCordClosureError(constructed, constructed.points[0], constructed.points[constructed.points.length - 1]) < 1e-8);
assert.ok(elastic.homologyCordPointLocal(constructed.points[1]).y > elastic.homologyCordPointLocal(constructed.points[0]).y);
const liftedEastPoint = elastic.applyHomologyCordClosure(constructed, { x: 20, y: 6 });
assert.ok(Math.abs(liftedEastPoint.x - 40) < 1e-10);
assert.ok(Math.abs(liftedEastPoint.y - 6) < 1e-10);
assert.deepStrictEqual(elastic.homologyCordPhysicalIndices({ points: [{ portal: false }, { portal: true }, { portal: false }] }), [0, 2]);

// Integration: a cellular generator around a genuine missing-tile boundary
// must become a material cord instead of silently falling back to static
// cellular sides. Its first optimizer step is valid and decreases length.
const holeCells = [];
for (let row = 0; row < 3; row += 1) {
  for (let col = 0; col < 3; col += 1) holeCells.push({ x: 10 + (20 * col), y: 10 + (20 * row) });
}
calculator.__test.setTestBoard({ rows: 3, cols: 3, lattice: 'square', boundary: 'glued', removedTiles: [4] });
calculator.__test.setTestGeometry({ radius: 10, width: 60, height: 60, cells: holeCells });
const holeAnalysis = calculator.analyzeBackgroundHomology();
const holeGenerator = holeAnalysis.generators[0];
const holeEntries = elastic.homologyChainDisplayEntries(holeAnalysis, holeGenerator);
const holeChain = elastic.makeHomologyCordChain(holeGenerator, holeEntries, holeAnalysis);
assert.ok(holeChain, 'a real-boundary generator constructs a draggable material cord');
assert.ok(elastic.homologyCordPhysicalIndices(holeChain).length > 3);
const holeInitialLength = elastic.homologyCordSnapshotLength(elastic.homologyCordSnapshot(holeChain));
const holeStep = elastic.relaxHomologyCordElasticBandIteration(holeChain, holeAnalysis, {
  stepSize: 0.12,
  maximumMove: 1,
  maxBacktracking: 10,
  projectCandidate(candidate, position, proposal) {
    if (position === proposal.candidates.length - 1) return candidate;
    return elastic.constrainHomologyCordElasticBandCandidate(holeChain, proposal.snapshot[position], candidate, holeAnalysis);
  },
  validateSegments(candidatePoints) {
    return elastic.homologyCordCandidateSegmentsAreValid(candidatePoints, holeChain, holeAnalysis);
  },
  validateTopology(candidatePoints) {
    return elastic.homologyCordTopologyIsValid(holeChain, candidatePoints, holeAnalysis);
  }
});
assert.strictEqual(holeStep.accepted, true);
assert.ok(holeStep.length < holeInitialLength);

// An inadmissible drag is transactional: it restores the valid chain rather
// than leaving a state that causes every optimizer backtracking step to fail.
const dragChain = elastic.makeHomologyCordChain(holeGenerator, holeEntries, holeAnalysis);
const dragMaterial = elastic.homologyCordPhysicalIndices(dragChain);
const dragSnapshot = elastic.homologyCordSnapshot(dragChain).map((point) => ({
  x: point.x,
  y: point.y,
  tileIndex: point.tileIndex,
  chartVertex: point.chartVertex,
  frame: point.frame
}));
assert.strictEqual(elastic.moveHomologyCordMaterialPoint(dragChain, dragMaterial[1], { x: 44, y: 23 }, holeAnalysis), false);
assert.deepStrictEqual(elastic.homologyCordSnapshot(dragChain).map((point) => ({
  x: point.x,
  y: point.y,
  tileIndex: point.tileIndex,
  chartVertex: point.chartVertex,
  frame: point.frame
})), dragSnapshot);
assert.strictEqual(elastic.homologyCordCandidateSegmentsAreValid(elastic.homologyCordSnapshot(dragChain), dragChain, holeAnalysis), true);
assert.strictEqual(elastic.homologyCordTopologyIsValid(dragChain, elastic.homologyCordSnapshot(dragChain), holeAnalysis), true);

// Exercise the actual per-frame integration used by requestAnimationFrame.
const animationChain = elastic.makeHomologyCordChain(holeGenerator, holeEntries, holeAnalysis);
const animationInitialLength = elastic.homologyCordSnapshotLength(elastic.homologyCordSnapshot(animationChain));
elastic.state.homologyAnalysis = holeAnalysis;
elastic.state.homologyTopologyKey = elastic.backgroundHomologyTopologyKey();
elastic.state.homologyCordChains = { [holeGenerator.id]: animationChain };
elastic.state.homologyCordDrag = null;
assert.strictEqual(elastic.advanceBackgroundHomologyCordElasticBandChains(), true);
assert.strictEqual(animationChain.lastOptimization.accepted, true);
assert.ok(elastic.homologyCordSnapshotLength(elastic.homologyCordSnapshot(animationChain)) < animationInitialLength);

elastic.state.homologyCordChains = { [holeGenerator.id]: holeChain };
elastic.state.homologyCordMode = true;
elastic.state.showHomology = true;
elastic.refs.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 60, height: 60 }) };
const draggableIndex = elastic.homologyCordPhysicalIndices(holeChain)[2];
const draggablePoint = elastic.homologyCordPointLocal(holeChain.points[draggableIndex]);
const draggableHit = elastic.homologyCordAtPoint(draggablePoint.x, draggablePoint.y);
assert.ok(draggableHit && draggableHit.chain === holeChain, 'a visible material point is available to pointer dragging');

// A quotient-vertex closure may join distant tile charts without a selected
// glued edge. The canonical closure copy must still live in a valid chart.
calculator.__test.setTestBoard({
  rows: 4,
  cols: 4,
  lattice: 'square',
  boundary: 'glued',
  gluedEdges: [
    { first: { row: 1, col: 1, dir: 3 }, second: { row: 4, col: 3, dir: 1 }, reversed: false },
    { first: { row: 1, col: 2, dir: 3 }, second: { row: 4, col: 4, dir: 1 }, reversed: false },
    { first: { row: 3, col: 1, dir: 2 }, second: { row: 1, col: 4, dir: 0 }, reversed: false },
    { first: { row: 4, col: 1, dir: 2 }, second: { row: 2, col: 4, dir: 0 }, reversed: false }
  ]
});
const quotientCells = [];
for (let row = 0; row < 4; row += 1) {
  for (let col = 0; col < 4; col += 1) quotientCells.push({ x: 10 + (20 * col), y: 10 + (20 * row) });
}
calculator.__test.setTestGeometry({ radius: 10, width: 80, height: 80, cells: quotientCells });
const quotientAnalysis = calculator.analyzeBackgroundHomology();
quotientAnalysis.generators.forEach((generator) => {
  assert.ok(elastic.makeHomologyCordChain(
    generator,
    elastic.homologyChainDisplayEntries(quotientAnalysis, generator),
    quotientAnalysis
  ), `${generator.id} constructs across its quotient closure`);
});

console.log('mosaic_calculator_elastic_band_test: milestone 1-7 tests passed');
