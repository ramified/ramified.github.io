'use strict';
const assert = require('assert');
const P = require('./mosaic_poincare');
const U = require('./mosaic_poincare_uniformization');
const metric = require('./mosaic_hyperbolic_metric');
const { squareSurface, hexSurface } = require('./mosaic_poincare_test');
const near = (a, b, tolerance) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < tolerance, `${JSON.stringify(a)} != ${JSON.stringify(b)}`);

// The normalized Riemann map of the disk is the identity, not an arbitrary
// boundary-to-circle parameterization. Test both the map and its inverse.
const circle = n => Array.from({ length: n }, (_, i) => ({ x: Math.cos((i + 0.173) * 2 * Math.PI / n), y: Math.sin((i + 0.173) * 2 * Math.PI / n) }));
const disk = new U.RiemannMap(circle(512));
for (const point of [{ x: 0, y: 0 }, { x: 0.3, y: -0.6 }, { x: -0.8, y: 0.1 }]) {
  near(disk.forward(point), point, 1e-6);
  near(disk.inverse(disk.forward(point)), point, 1e-8);
}

// Independent exact example: the right half of the unit disk. Its complete
// metric has density 10/3 at z=1/2; the ambient disk has density 8/3 there.
// This specifically detects the original restricted-ambient-metric mistake.
const halfBoundary = [];
for (let i = 0; i < 512; i++) {
  const a = -Math.PI / 2 + i * Math.PI / 512;
  halfBoundary.push({ x: Math.cos(a), y: Math.sin(a) });
}
for (let i = 0; i < 512; i++) halfBoundary.push({ x: 0, y: 1 - 2 * i / 512 });
const half = new U.RiemannMap(halfBoundary, { x: 0.5, y: 0 });
const h = 1e-5;
const dx = half.forward({ x: 0.5 + h, y: 0 }), dy = half.forward({ x: 0.5, y: h });
assert.ok(Math.abs(2 * dx.x / h - 10 / 3) < 1e-3);
assert.ok(Math.abs(dx.x - dy.y) / h < 1e-3 && Math.abs(dx.y + dy.x) / h < 1e-3, 'Cauchy–Riemann equations');
let previousDistance = 0;
for (const x of [0.1, 0.01, 0.001]) {
  const point = half.forward({ x, y: 0 });
  const distance = P.distance({ x: 0, y: 0 }, point);
  assert.ok(distance > previousDistance + 1);
  previousDistance = distance;
  near(half.inverse(point), { x, y: 0 }, 1e-8);
}

const borderedHex = hexSurface();
const partner = borderedHex.tiles[0].links[0];
borderedHex.tiles[partner.index].links[partner.dir] = null;
borderedHex.tiles[0].links[0] = null;
const regularBorderedHex = { lattice: 'hexagonal', tiles: [0, 1].map(index => ({ index, links: Array(6).fill(null) })) };
[0, 2, 4, 1, 5, 3].forEach((dir, i) => {
  if (!i) return;
  regularBorderedHex.tiles[0].links[i] = { index: 1, dir, sameDirection: false };
  regularBorderedHex.tiles[1].links[dir] = { index: 0, dir: i, sameDirection: false };
});
for (const surface of [squareSurface(true), borderedHex, regularBorderedHex]) {
  const result = metric.solve(surface, { refinement: 2 });
  assert.equal(result.status, 'ready');
  const development = new P.Development(result);
  const center = P.interpolate(development.seed.vertices, [0.3, 0.3, 0.4]);
  development.resetNeighborhood(development.seed, center);
  while (development.expand(100)) {}
  const map = new U.InteriorMap(development, center);
  assert.ok(map.planes.length > 0);
  assert.ok(map.boundaryError < 0.01 && map.refinementError < 0.01);
  near(map.forward(center), { x: 0, y: 0 }, 1e-8);
  // Slit maps have two boundary branches. Rendering must take the limit
  // approached from INSIDE, or ideal-boundary edges become spurious chords.
  let angleSum = 0, previous = null;
  for (let i = 0; i <= 128; i++) {
    const edge = U.radialBoundary(map.planes, i * 2 * Math.PI / 128);
    const world = P.fromOrigin(edge, center), ideal = map.forward(world, true);
    const inside = map.map.forward({ x: edge.x * 0.998, y: edge.y * 0.998 });
    const length = Math.hypot(inside.x, inside.y);
    near(ideal, { x: inside.x / length, y: inside.y / length }, 0.025);
    if (previous) {
      const angle = Math.atan2(previous.x * ideal.y - previous.y * ideal.x, previous.x * ideal.x + previous.y * ideal.y);
      assert.ok(angle > -0.01, 'boundary angle must preserve order');
      angleSum += angle;
    }
    previous = ideal;
  }
  assert.ok(Math.abs(angleSum - 2 * Math.PI) < 0.01, 'one turn around the ideal circle');
  for (const copy of development.visible.slice(0, 25)) {
    const point = P.interpolate(copy.vertices, [1 / 3, 1 / 3, 1 / 3]);
    near(map.inverse(map.forward(point)), point, 1e-7);
  }
  for (const copy of development.visible) {
    const triangle = result.mesh.triangles[copy.triangleId];
    const rendered = copy.vertices.map((p, i) => map.renderPoint(p, result.mesh.vertices[triangle.ids[i]].boundary));
    assert.ok(rendered.every(p => Math.hypot(p.x, p.y) <= 1 + 1e-10));
    if (surface === regularBorderedHex && P.distance(P.interpolate(copy.vertices, [1 / 3, 1 / 3, 1 / 3]), center) > 3) {
      const size = Math.max(...rendered.map((p, i) => Math.hypot(p.x - rendered[(i + 1) % 3].x, p.y - rendered[(i + 1) % 3].y)));
      assert.ok(size < 0.2, 'distant boundary triangles must not span the disk through a wrong slit branch');
    }
    triangle.edgeIds.forEach((id, opposite) => {
      if (result.mesh.edges[id].triangles.length !== 1) return;
      const weights = [0.5, 0.5, 0.5]; weights[opposite] = 0;
      const point = P.interpolate(copy.vertices, weights), ideal = map.forward(point, true);
      assert.ok(Math.abs(Math.hypot(ideal.x, ideal.y) - 1) < 1e-12, 'physical boundary rendered at infinity');
    });
  }
}

const ray = new U.DiskGeodesic({ x: 0.2, y: -0.1 }, { x: 0.6, y: 0.8 });
for (let i = 0; i < 120; i++) {
  ray.advance(0.1);
  assert.ok(ray.position.x ** 2 + ray.position.y ** 2 < 1);
  assert.ok(Math.abs(P.distance(ray.start, ray.position) - ray.length) < 1e-7, 'unit hyperbolic speed');
}
assert.equal(ray.advance(100), false);
assert.equal(ray.length, 12);
assert.ok(ray.position.x ** 2 + ray.position.y ** 2 < 1, 'precision stop before the ideal circle');
console.log('mosaic Poincare uniformization tests passed');
