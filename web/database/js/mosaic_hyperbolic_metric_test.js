'use strict';

const assert = require('assert');
const metric = require('./mosaic_hyperbolic_metric.js');

function pairedSquareSurface(tileCount) {
  const tiles = Array.from({ length: tileCount }, (_, index) => ({ index, links: new Array(4).fill(null) }));
  // A deterministic closed quotient. Each side is paired with the corresponding
  // side of the next tile, reversing the edge parameter.
  for (let index = 0; index < tileCount; index += 2) {
    for (let dir = 0; dir < 4; dir += 1) {
      tiles[index].links[dir] = { index: index + 1, dir, sameDirection: false };
      tiles[index + 1].links[dir] = { index, dir, sameDirection: false };
    }
  }
  return { lattice: 'square', tiles };
}

function borderedPairOfPants() {
  // Six squares in a strip, with top/bottom left unglued and horizontal ends paired.
  const tiles = Array.from({ length: 6 }, (_, index) => ({ index, links: new Array(4).fill(null) }));
  for (let index = 0; index < 5; index += 1) {
    tiles[index].links[1] = { index: index + 1, dir: 3, sameDirection: false };
    tiles[index + 1].links[3] = { index, dir: 1, sameDirection: false };
  }
  tiles[0].links[3] = { index: 5, dir: 1, sameDirection: false };
  tiles[5].links[1] = { index: 0, dir: 3, sameDirection: false };
  return { lattice: 'square', tiles };
}

function closedNegativeSurface() {
  return { lattice: 'square', tiles: [
    { index: 0, links: [{ index: 2, dir: 0, sameDirection: false }, { index: 1, dir: 3, sameDirection: true }, { index: 3, dir: 2, sameDirection: false }, { index: 2, dir: 3, sameDirection: false }] },
    { index: 1, links: [{ index: 1, dir: 2, sameDirection: true }, { index: 2, dir: 1, sameDirection: false }, { index: 1, dir: 0, sameDirection: true }, { index: 0, dir: 1, sameDirection: true }] },
    { index: 2, links: [{ index: 0, dir: 0, sameDirection: false }, { index: 1, dir: 1, sameDirection: false }, { index: 3, dir: 0, sameDirection: true }, { index: 0, dir: 3, sameDirection: false }] },
    { index: 3, links: [{ index: 2, dir: 2, sameDirection: true }, { index: 3, dir: 3, sameDirection: true }, { index: 0, dir: 2, sameDirection: false }, { index: 3, dir: 1, sameDirection: true }] }
  ] };
}

function borderedNegativeSurface() {
  const surface = JSON.parse(JSON.stringify(closedNegativeSurface()));
  const partner = surface.tiles[0].links[0];
  surface.tiles[0].links[0] = null;
  surface.tiles[partner.index].links[partner.dir] = null;
  return surface;
}

function closedHexagonalNegativeSurface() {
  return { lattice: 'hexagonal', tiles: [
    { index: 0, links: [{ index: 1, dir: 0, sameDirection: true }, { index: 0, dir: 4, sameDirection: false }, { index: 0, dir: 5, sameDirection: true }, { index: 1, dir: 1, sameDirection: true }, { index: 0, dir: 1, sameDirection: false }, { index: 0, dir: 2, sameDirection: true }] },
    { index: 1, links: [{ index: 0, dir: 0, sameDirection: true }, { index: 0, dir: 3, sameDirection: true }, { index: 1, dir: 4, sameDirection: true }, { index: 1, dir: 5, sameDirection: true }, { index: 1, dir: 2, sameDirection: true }, { index: 1, dir: 3, sameDirection: true }] }
  ] };
}

(function run() {
  assert.strictEqual(metric.refinementFor(100, 'auto'), 3);
  assert.strictEqual(metric.refinementFor(101, 'auto'), 2);
  assert.throws(() => metric.buildMesh({ lattice: 'square', tiles: [
    { index: 0, links: [{ index: 9, dir: 2, sameDirection: false }] }
  ] }, 2), /malformed/i);

  const closed = metric.buildMesh(pairedSquareSurface(2), 2);
  assert.ok(closed.vertices.length > 0 && closed.triangles.length > 0);
  assert.ok(closed.edges.every((edge) => edge.lambda0 > 0 && Number.isFinite(edge.lambda0)));

  const bordered = metric.buildMesh(borderedPairOfPants(), 2);
  assert.ok(bordered.vertices.some((vertex) => vertex.boundary));
  bordered.vertices.filter((vertex) => vertex.boundary).forEach((vertex) => assert.strictEqual(vertex.targetAngle, Math.PI));

  const reversedParameterMesh = metric.buildMesh({ lattice: 'square', tiles: [
    { index: 0, links: [{ index: 1, dir: 0, sameDirection: false }, null, null, null] },
    { index: 1, links: [{ index: 0, dir: 0, sameDirection: false }, null, null, null] }
  ] }, 1);
  assert.ok(reversedParameterMesh.vertices.some((vertex) => {
    const first = vertex.occurrences.find((point) => point.tileIndex === 0 && Math.abs(point.x - 1) < 1e-9 && Math.abs(point.y + 1) < 1e-9);
    const second = vertex.occurrences.find((point) => point.tileIndex === 1 && Math.abs(point.x - 1) < 1e-9 && Math.abs(point.y - 1) < 1e-9);
    return first && second;
  }), 'ordinary/glued quotienting must reverse the boundary parameter');

  const negativeBoundary = metric.buildMesh(borderedNegativeSurface(), 2);
  assert.ok(negativeBoundary.eulerCharacteristic < 0);
  assert.ok(negativeBoundary.vertices.some((vertex) => vertex.boundary));

  const result = metric.solve(closedNegativeSurface(), { method: 'fem', refinement: 2, maxIterations: 40 });
  assert.ok(Array.isArray(result.u));
  assert.ok(result.u.every(Number.isFinite));
  assert.ok(!Object.prototype.hasOwnProperty.call(result, 'serializedMetric'));

  const triangle = result.mesh.triangles[0];
  const center = {
    x: triangle.local.reduce((sum, point) => sum + point.x, 0) / 3,
    y: triangle.local.reduce((sum, point) => sum + point.y, 0) / 3
  };
  const sampled = metric.sample(result, triangle.tileIndex, center);
  assert.ok(sampled && Number.isFinite(sampled.u));

  const discrete = metric.solve(closedNegativeSurface(), { method: 'discrete', refinement: 2, maxIterations: 40 });
  assert.strictEqual(discrete.status, 'ready');
  assert.ok(discrete.edgeLengths.every((length) => length > 0 && Number.isFinite(length)));
  assert.ok(Math.abs(discrete.area - discrete.expectedArea) < 1e-5);
  assert.ok(discrete.mesh.vertices.some((vertex) => Math.abs(vertex.kappa) > 1e-5), 'the cone input should contain a nonzero flat defect');

  const repeated = metric.solve(closedNegativeSurface(), { method: 'discrete', refinement: 2, maxIterations: 40 });
  assert.deepStrictEqual(repeated.u, discrete.u, 'the discrete solve must be deterministic');

  const borderedSolve = metric.solve(borderedNegativeSurface(), { method: 'discrete', refinement: 2, maxIterations: 60 });
  assert.ok(['ready', 'warning'].includes(borderedSolve.status));
  assert.ok(Math.abs(borderedSolve.area - borderedSolve.expectedArea) < 1e-4);

  const hex = metric.solve(closedHexagonalNegativeSurface(), { method: 'discrete', refinement: 2, maxIterations: 60 });
  assert.ok(['ready', 'warning'].includes(hex.status));
  assert.ok(hex.u.every(Number.isFinite));

  console.log('mosaic hyperbolic metric tests passed');
})();
