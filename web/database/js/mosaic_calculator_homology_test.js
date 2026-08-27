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
state.homologyCordChains = { [generator.id]: { points: [] } };
calculator.__test.resetBackgroundHomologyCords(false, generator.id);
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
assert.deepStrictEqual(state.homologyGeneratorVisibility, {});
assert.deepStrictEqual(state.homologySideSelections, {});

// Transient tracing does not become part of the serialized mosaic.
state.backgroundAction = 'homology-representative';
state.homologyKnotPick = true;
state.homologyKnotResult = pickedKnot;
state.homologyCordMode = true;
const exported = calculator.__test.buildFullExport();
assert.strictEqual(exported.backgroundAction, 'tile');
assert.strictEqual(exported.backgroundSpace.action, 'tile');
assert.strictEqual(JSON.stringify(exported).includes('homologyTrace'), false);
assert.strictEqual(JSON.stringify(exported).includes('homologyKnot'), false);
assert.strictEqual(JSON.stringify(exported).includes('homologyCord'), false);

// Cusp display keeps quotient identity even when disconnected tile-local
// vertices occupy one logical canvas corner.  Their visual markers are nudged
// into the respective incident sectors so both can be selected.
calculator.__test.setTestBoard({
  rows: 4,
  cols: 4,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [5, 10]
});
calculator.__test.setTestGeometry({
  radius: 10,
  width: 80,
  height: 80,
  cells: Array.from({ length: 16 }, (_, index) => ({
    row: Math.floor(index / 4),
    col: index % 4,
    x: 10 + (index % 4) * 20,
    y: 10 + Math.floor(index / 4) * 20
  }))
});
const quotientVertices = calculator.__test.computeBackgroundQuotientVertices().vertices;
const firstCentral = quotientVertices.find((vertex) => vertex.corners.some((corner) => corner.index === 6 && corner.vertex === 3));
const secondCentral = quotientVertices.find((vertex) => vertex.corners.some((corner) => corner.index === 9 && corner.vertex === 1));
assert.ok(firstCentral && secondCentral);
assert.notStrictEqual(firstCentral.id, secondCentral.id);
const cuspLayout = calculator.__test.backgroundCuspDisplayLayout([firstCentral, secondCentral]);
const firstDisplay = cuspLayout.get(firstCentral.id)[0];
const secondDisplay = cuspLayout.get(secondCentral.id)[0];
assert.strictEqual(firstDisplay.displayKey, secondDisplay.displayKey);
assert.ok(firstDisplay.markerPoint && secondDisplay.markerPoint);
assert.ok(Math.hypot(
  firstDisplay.markerPoint.x - secondDisplay.markerPoint.x,
  firstDisplay.markerPoint.y - secondDisplay.markerPoint.y
) > 1);

// Cusp filtering also uses exact local corners. A black-boundary corner on a
// diagonal tile must not hide an unrelated glued cusp drawn at the same
// logical canvas coordinate.
calculator.__test.setTestBoard({
  rows: 2,
  cols: 2,
  lattice: 'square',
  boundary: 'glued',
  removedTiles: [1, 2],
  gluedEdges: [
    { first: { index: 0, dir: 0 }, second: { index: 0, dir: 1 }, reversed: false }
  ]
});
calculator.__test.setTestGeometry({
  radius: 10,
  width: 40,
  height: 40,
  cells: [
    { row: 0, col: 0, x: 10, y: 10 },
    null,
    null,
    { row: 1, col: 1, x: 30, y: 30 }
  ]
});
const displayedCusps = calculator.__test.computeDisplayedBackgroundCuspVertices();
assert.ok(displayedCusps.some((vertex) => (
  vertex.corners.some((corner) => corner.index === 0 && corner.vertex === 2)
)));
assert.strictEqual(displayedCusps.some((vertex) => (
  vertex.corners.some((corner) => corner.index === 3 && corner.vertex === 0)
)), false);

console.log('mosaic_calculator_homology_test: all tests passed');
