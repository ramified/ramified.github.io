'use strict';

const assert = require('assert');
const calculator = require('./mosaic_calculator.js');

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

const analysis = calculator.analyzeBackgroundHomology();
assert.strictEqual(analysis.group, 'Z^2');
assert.strictEqual(calculator.__test.backgroundHomologyGroupLatex(analysis), '\\(\\mathbb{Z}^{2}\\)');
assert.strictEqual(
  calculator.__test.backgroundHomologyGroupLatex({ freeRank: 1, torsion: [2n] }),
  '\\(\\mathbb{Z}\\oplus\\mathbb{Z}/2\\mathbb{Z}\\)'
);
assert.strictEqual(calculator.classifyBackgroundCircle([{ index: 0, dir: 0 }]).expression, 'a1');
assert.strictEqual(calculator.classifyBackgroundCircle([
  { index: 0, dir: 0 },
  { index: 0, dir: 1 },
  { index: 0, dir: 2 },
  { index: 0, dir: 3 }
]).expression, '0');

// Display representatives are deterministic and independent from the class.
const state = calculator.__test.state;
state.homologyAnalysis = analysis;
state.homologyTopologyKey = calculator.__test.backgroundHomologyTopologyKey();
const generator = analysis.generators.find((entry) => entry.id === 'a1');
const quotientEdgeId = generator.edgeChain.findIndex((coefficient, edgeId) => (
  coefficient !== 0n && analysis.complex.edges[edgeId].sides.length === 2
));
const quotientEdge = analysis.complex.edges[quotientEdgeId];
const defaultSide = calculator.__test.selectedHomologyEdgeSide(generator.id, quotientEdge);
assert.deepStrictEqual(defaultSide, { index: 0, dir: 0 });
state.homologySideSelections[`${generator.id}:${quotientEdgeId}`] = { index: 0, dir: 2 };
assert.deepStrictEqual(calculator.__test.selectedHomologyEdgeSide(generator.id, quotientEdge), { index: 0, dir: 2 });
assert.strictEqual(calculator.classifyBackgroundCircle([{ index: 0, dir: 0 }]).expression, 'a1');
state.homologyGeneratorVisibility[generator.id] = false;
assert.strictEqual(calculator.__test.homologyGeneratorVisible(generator.id), false);
const gluedEntry = { edge: { kind: 'glued' } };
const internalEntry = { edge: { kind: 'internal' } };
state.homologyLabelPosition = 'middle';
assert.strictEqual(calculator.__test.homologyLabelEntry([gluedEntry, internalEntry]), internalEntry);
state.homologyLabelPosition = 'side';
assert.strictEqual(calculator.__test.homologyLabelEntry([gluedEntry, internalEntry]), gluedEntry);

// Cord layout is transient, keyed per generator/quotient edge, and cannot
// affect the exact cellular classification used above.
state.homologyGeneratorVisibility[generator.id] = true;
state.showHomology = true;
assert.strictEqual(calculator.__test.hasVisibleHomologyGenerators(), true);
assert.strictEqual(calculator.__test.homologyCordKey(generator.id, quotientEdgeId), `${generator.id}:${quotientEdgeId}`);
state.homologyCords = { [`${generator.id}:${quotientEdgeId}`]: { control: { x: 1, y: 2 } } };
state.homologyCordChains = { [generator.id]: { points: [] } };
calculator.__test.resetBackgroundHomologyCords(false, generator.id);
assert.deepStrictEqual(state.homologyCords, {});
assert.deepStrictEqual(state.homologyCordChains, {});
assert.strictEqual(calculator.classifyBackgroundCircle([{ index: 0, dir: 0 }]).expression, 'a1');
const cordA = { key: 'a1:10' };
const cordB = { key: 'a1:11' };
const transitions = calculator.__test.homologyCordTransitions([
  { coefficient: 1n, edge: { id: 10, source: 0, target: 1 } },
  { coefficient: 1n, edge: { id: 11, source: 1, target: 0 } }
], new Map([[10, cordA], [11, cordB]]));
assert.deepStrictEqual(transitions.map((entry) => [entry.from.cord.key, entry.to.cord.key]), [['a1:10', 'a1:11'], ['a1:11', 'a1:10']]);
const orderedCord = calculator.__test.orderedHomologyCordEntries([
  { coefficient: 1n, edge: { id: 10, source: 0, target: 1 } },
  { coefficient: 1n, edge: { id: 11, source: 1, target: 0 } }
]);
assert.deepStrictEqual(orderedCord.map((entry) => entry.entry.edge.id), [10, 11]);
assert.strictEqual(calculator.__test.orderedHomologyCordEntries([
  { coefficient: 1n, edge: { id: 10, source: 0, target: 1 } },
  { coefficient: 1n, edge: { id: 11, source: 0, target: 1 } }
]), null);
assert.deepStrictEqual(
  calculator.__test.homologyCordPhysicalIndices({ points: [{ portal: false }, { portal: true }, { portal: false }] }),
  [0, 2]
);
const remeshChain = {
  points: Array.from({ length: 12 }, (_, index) => ({
    x: index,
    y: 0,
    vx: 1,
    vy: 0,
    ox: 0,
    oy: 0,
    tileIndex: -1,
    chartVertex: -1,
    portal: false
  })),
  deck: { x: 0, y: 0 },
  restLength: 1,
  referenceRestLength: 1,
  hardRestLength: 0,
  shrinkFloor: 0,
  minimumParticleCount: 6
};
const naturalLengthBefore = remeshChain.restLength * (remeshChain.points.length - 1);
assert.strictEqual(calculator.__test.remeshHomologyCordChain(remeshChain, { complex: { vertices: [] } }), true);
assert.strictEqual(remeshChain.points.length, 10);
assert.ok(Math.abs((remeshChain.restLength * (remeshChain.points.length - 1)) - naturalLengthBefore) < 1e-9);
assert.ok(remeshChain.points.every((point) => point.portal === false));
const annealChain = { points: remeshChain.points, deck: { x: 0, y: 0 }, restLength: 10, hardRestLength: 2, shrinkFloor: 2, shrinkFrozen: false };
calculator.__test.annealHomologyCordRestLength(annealChain, 1);
assert.ok(annealChain.restLength < 10 && annealChain.restLength >= 2);

// A picked interior knot component is reduced through the barycentric complex
// to the same displayed H_1 basis, without relying on a tile-edge trace.
state.tiles[0] = [[0, 2]];
state.pickedComponent = 0;
const pickedKnot = calculator.classifySelectedBackgroundKnot();
assert.strictEqual(pickedKnot.valid, true);
assert.strictEqual(pickedKnot.expression, 'a2');
assert.strictEqual(pickedKnot.arcLoop.length, 1);
state.tiles[0] = [[0, 1]];
state.pickedComponent = 0;
assert.strictEqual(calculator.classifySelectedBackgroundKnot().valid, false);
state.tiles[0] = [[0, 2]];
state.pickedComponent = 0;
state.homologyKnotPick = true;
state.homologyKnotResult = pickedKnot;
state.homologyKnotLineworkKey = 'stale';
calculator.__test.clearBackgroundHomologyKnot();
assert.strictEqual(state.homologyKnotPick, false);
assert.strictEqual(state.homologyKnotResult, null);

calculator.__test.clearBackgroundHomologyDisplay();
assert.strictEqual(state.showHomology, false);
assert.strictEqual(state.homologyCordMode, false);
assert.deepStrictEqual(state.homologyCords, {});
assert.deepStrictEqual(state.homologyGeneratorVisibility, {});
assert.deepStrictEqual(state.homologySideSelections, {});

// Transient tracing does not become part of the serialized mosaic.
state.backgroundAction = 'homology-representative';
state.homologyKnotPick = true;
state.homologyKnotResult = pickedKnot;
state.homologyCordMode = true;
state.homologyCords = { 'a1:0': { control: { x: 10, y: 10 } } };
const exported = calculator.__test.buildFullExport();
assert.strictEqual(exported.backgroundAction, 'tile');
assert.strictEqual(exported.backgroundSpace.action, 'tile');
assert.strictEqual(JSON.stringify(exported).includes('homologyTrace'), false);
assert.strictEqual(JSON.stringify(exported).includes('homologyKnot'), false);
assert.strictEqual(JSON.stringify(exported).includes('homologyCord'), false);

console.log('mosaic_calculator_homology_test: all tests passed');
