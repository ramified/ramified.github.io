'use strict';

const assert = require('assert');
const homology = require('./background_homology.js');

function squarePair(firstDir, secondDir, reversed = false) {
  return {
    first: { index: 0, dir: firstDir },
    second: { index: 0, dir: secondDir },
    reversed
  };
}

function squareBoard(gluedEdges = []) {
  return { lattice: 'square', rows: 1, cols: 1, gluedEdges };
}

function analysisFor(gluedEdges = []) {
  return homology.analyze(squareBoard(gluedEdges));
}

function faceChain(complex, face = complex.faces[0]) {
  const chain = Array(complex.edges.length).fill(0n);
  face.chain.forEach(({ edge, coefficient }) => { chain[edge] += coefficient; });
  return chain;
}

function testCellularBoundariesAreCycles() {
  const complex = homology.buildCellComplex(squareBoard([
    squarePair(0, 2),
    squarePair(1, 3)
  ]));
  complex.faces.forEach((face) => assert.strictEqual(homology.isCycle(faceChain(complex, face), complex), true));
  const product = complex.boundary1.map((row) => complex.boundary2[0].map((_, column) => (
    row.reduce((sum, value, edge) => sum + value * complex.boundary2[edge][column], 0n)
  )));
  assert.deepStrictEqual(product, complex.boundary1.map(() => complex.boundary2[0].map(() => 0n)));
}

function testStandardIntegralGroups() {
  // Disk, cylinder/annulus, Möbius band, torus, RP^2 and Klein bottle.
  assert.strictEqual(analysisFor().group, '0');
  assert.strictEqual(analysisFor([squarePair(0, 2)]).group, 'Z');
  assert.strictEqual(analysisFor([squarePair(0, 2, true)]).group, 'Z');
  assert.strictEqual(analysisFor([squarePair(0, 2), squarePair(1, 3)]).group, 'Z^2');
  assert.strictEqual(analysisFor([squarePair(0, 2, true), squarePair(1, 3, true)]).group, 'Z/2');
  assert.strictEqual(analysisFor([squarePair(0, 2), squarePair(1, 3, true)]).group, 'Z ⊕ Z/2');
}

function testGenusTwoSurface() {
  // Two hexagons with all ten outer sides paired orientation-reversingly as
  // maps of edges (the `reversed: false` convention) form an orientable
  // closed genus-two quotient: chi = 2 - 6 + 2 = -2.
  const analysis = homology.analyze({
    lattice: 'hexagonal',
    rows: 1,
    cols: 2,
    gluedEdges: [
      { first: { index: 0, dir: 1 }, second: { index: 0, dir: 2 }, reversed: false },
      { first: { index: 0, dir: 3 }, second: { index: 0, dir: 5 }, reversed: false },
      { first: { index: 0, dir: 4 }, second: { index: 1, dir: 0 }, reversed: false },
      { first: { index: 1, dir: 1 }, second: { index: 1, dir: 4 }, reversed: false },
      { first: { index: 1, dir: 2 }, second: { index: 1, dir: 5 }, reversed: false }
    ]
  });
  assert.strictEqual(analysis.complex.vertices.length - analysis.complex.edges.length + analysis.complex.faces.length, -2);
  assert.strictEqual(analysis.group, 'Z^4');
}

function testTorusSeamCoordinatesAndFaceBoundary() {
  const analysis = analysisFor([squarePair(0, 2), squarePair(1, 3)]);
  assert.strictEqual(homology.classifyPath(analysis, [{ index: 0, dir: 0 }]).expression, 'a1');
  assert.strictEqual(homology.classifyPath(analysis, [{ index: 0, dir: 1 }]).expression, 'a2');
  assert.strictEqual(homology.classifyPath(analysis, [{ index: 0, dir: 2 }]).expression, '-a1');
  assert.strictEqual(homology.classifyPath(analysis, [
    { index: 0, dir: 0 },
    { index: 0, dir: 2 }
  ]).expression, '0');
  assert.strictEqual(homology.classifyPath(analysis, [
    { index: 0, dir: 0 },
    { index: 0, dir: 1 },
    { index: 0, dir: 2 },
    { index: 0, dir: 3 }
  ]).expression, '0');
}

function testTorsionCoordinates() {
  const analysis = analysisFor([squarePair(0, 2, true), squarePair(1, 3, true)]);
  const first = homology.classifyPath(analysis, [{ index: 0, dir: 0 }, { index: 0, dir: 1 }]);
  const doubled = homology.classifyPath(analysis, [
    { index: 0, dir: 0 }, { index: 0, dir: 1 },
    { index: 0, dir: 0 }, { index: 0, dir: 1 }
  ]);
  assert.strictEqual(first.valid, true);
  assert.strictEqual(first.expression, 't1');
  assert.strictEqual(doubled.expression, '0');
}

function testInteriorKnotArcLoops() {
  const torus = analysisFor([squarePair(0, 2), squarePair(1, 3)]);
  const subdivision = homology.buildBarycentricSubdivision(torus.complex);
  subdivision.faces.forEach((face) => assert.strictEqual(homology.isCycle(faceChain(subdivision, face), subdivision), true));
  const forward = homology.classifyArcLoop(torus, [{ index: 0, fromDir: 0, toDir: 2 }]);
  const reverse = homology.classifyArcLoop(torus, [{ index: 0, fromDir: 2, toDir: 0 }]);
  assert.strictEqual(forward.valid, true);
  assert.strictEqual(forward.expression, 'a2');
  assert.strictEqual(reverse.expression, '-a2');
  assert.strictEqual(homology.isCycle(forward.quotientChain, torus.complex), true);

  const rp2 = analysisFor([squarePair(0, 2, true), squarePair(1, 3, true)]);
  const torsion = homology.classifyArcLoop(rp2, [{ index: 0, fromDir: 0, toDir: 2 }]);
  assert.strictEqual(torsion.valid, true);
  assert.strictEqual(torsion.expression, 't1');
  assert.strictEqual(homology.classifyArcLoop(rp2, [
    { index: 0, fromDir: 0, toDir: 2 },
    { index: 0, fromDir: 0, toDir: 2 }
  ]).expression, '0');
  assert.strictEqual(homology.classifyArcLoop(torus, [{ index: 0, fromDir: 0, toDir: 1 }]).valid, false);
}

function testInvalidPathsAreExplained() {
  const analysis = analysisFor([squarePair(0, 2), squarePair(1, 3)]);
  assert.strictEqual(homology.classifyPath(analysis, []).valid, false);
  assert.strictEqual(homology.classifyPath(analysis, [{ index: 0, dir: 0 }, { index: 0, dir: 1 }]).valid, true);
  const disk = analysisFor();
  assert.strictEqual(homology.classifyPath(disk, [{ index: 0, dir: 0 }]).valid, false);
}

[
  testCellularBoundariesAreCycles,
  testStandardIntegralGroups,
  testGenusTwoSurface,
  testTorusSeamCoordinatesAndFaceBoundary,
  testTorsionCoordinates,
  testInteriorKnotArcLoops,
  testInvalidPathsAreExplained
].forEach((test) => test());

console.log('background_homology_test: all tests passed');
