"use strict";

const assert = require("assert");
const Toric = require("./toric_cone_math.js");

function generator(id, coordinates, label = id) {
  return { id, label, coordinates: coordinates.map(String) };
}

function analyze(dimension, generators, limits) {
  return Toric.analyzeCone({ ambientDimension: dimension, generators }, limits);
}

function faceCounts(analysis) {
  const result = new Map();
  analysis.faces.forEach((face) => result.set(face.dimension, (result.get(face.dimension) || 0) + 1));
  return result;
}

{
  const normalized = Toric.primitiveVector(["1/2", "1.0", "0"], 3);
  assert.deepStrictEqual(normalized.exact, ["1", "2", "0"]);
  assert.strictEqual(normalized.zero, false);
  assert.strictEqual(Toric.parseRational("-1.25e-1").toString(), "-1/8");
}

{
  const zero = analyze(4, []);
  assert.strictEqual(zero.valid, true);
  assert.strictEqual(zero.dimension, 0);
  assert.strictEqual(zero.faceCount, 1);
  assert.strictEqual(zero.smoothCoordinateRing, "k[t_1^{+/-1},...,t_4^{+/-1}]");
  assert.strictEqual(zero.classGroup.display, "0");
}

for (let rank = 2; rank <= 8; rank += 1) {
  const orthant = analyze(rank, Toric.presetGenerators("positive-orthant", rank));
  assert.strictEqual(orthant.valid, true, `rank ${rank} orthant is valid`);
  assert.strictEqual(orthant.dimension, rank);
  assert.strictEqual(orthant.extremeRayCount, rank);
  assert.strictEqual(orthant.faceCount, 2 ** rank);
  assert.strictEqual(orthant.smooth, true);
  assert.strictEqual(orthant.classGroup.display, "0");
  assert.strictEqual(orthant.canonical.gorenstein, true);
  assert.strictEqual(orthant.faces.find((face) => face.key === "0").orbitClosureFaceKeys.length, orthant.faceCount);
  assert.strictEqual(orthant.faces.find((face) => face.key === orthant.selectedFaceDefault).orbitClosureFaceKeys.length, 1);
}

{
  const cone = analyze(2, [
    generator("e1", [1, 0]),
    generator("e2", [0, 1]),
    generator("diagonal", [1, 1]),
    generator("duplicate", [2, 0]),
  ]);
  assert.strictEqual(cone.valid, true);
  assert.strictEqual(cone.extremeRayCount, 2);
  assert.strictEqual(cone.generators.find((entry) => entry.id === "diagonal").status, "redundant");
  assert.strictEqual(cone.generators.find((entry) => entry.id === "duplicate").status, "duplicate");
}

{
  const invalid = analyze(2, [generator("right", [1, 0]), generator("left", [-1, 0])]);
  assert.strictEqual(invalid.valid, false);
  assert.strictEqual(invalid.pointed, false);
  assert.match(invalid.issues.join(" "), /contains a line/i);
}

{
  const invalid = analyze(3, [generator("zero", [0, 0, 0])]);
  assert.strictEqual(invalid.valid, false);
  assert.match(invalid.issues.join(" "), /zero vector/i);
}

{
  const lower = analyze(3, [generator("rho", [1, 0, 0])]);
  assert.strictEqual(lower.valid, true);
  assert.strictEqual(lower.dimension, 1);
  assert.strictEqual(lower.faceCount, 2);
  assert.strictEqual(lower.torusFactorRank, 2);
  assert.strictEqual(lower.smoothCoordinateRing, "k[x_1, t_2^{+/-1},...,t_3^{+/-1}]");
}

{
  const singular = analyze(2, [generator("u1", [1, 0]), generator("u2", [1, 2])]);
  assert.strictEqual(singular.valid, true);
  assert.strictEqual(singular.simplicial, true);
  assert.strictEqual(singular.smooth, false);
  assert.strictEqual(singular.multiplicity, "2");
  assert.strictEqual(singular.classGroup.display, "Z/2Z");
  assert.strictEqual(singular.canonical.gorenstein, true);
}

{
  const indexThree = analyze(2, [generator("u1", [1, 0]), generator("u2", [2, 3])]);
  assert.strictEqual(indexThree.canonical.qGorenstein, true);
  assert.strictEqual(indexThree.canonical.gorenstein, false);
  assert.strictEqual(indexThree.canonical.index, 3);
}

{
  const square = analyze(3, Toric.presetGenerators("square-cone", 3));
  const counts = faceCounts(square);
  assert.strictEqual(square.valid, true);
  assert.strictEqual(square.dimension, 3);
  assert.strictEqual(square.extremeRayCount, 4);
  assert.strictEqual(square.simplicial, false);
  assert.strictEqual(square.qFactorial, false);
  assert.strictEqual(square.smooth, false);
  assert.strictEqual(square.faceCount, 10);
  assert.strictEqual(counts.get(1), 4);
  assert.strictEqual(counts.get(2), 4);
  assert.strictEqual(square.classGroup.display, "Z + Z/2Z + Z/2Z");
  assert.strictEqual(square.canonical.gorenstein, true);
}

{
  const capped = analyze(2, [generator("u1", [1, 0]), generator("u2", [0, 1])], { maxCandidates: 1 });
  assert.strictEqual(capped.status, "capped");
  assert.match(capped.issues.join(" "), /candidate checks/i);
}

{
  const square = analyze(3, Toric.presetGenerators("square-cone", 3));
  assert.doesNotThrow(() => JSON.stringify(square));
}

{
  const orthant = analyze(3, Toric.presetGenerators("positive-orthant", 3));
  const polygon = Toric.sliceCone(orthant, ["0", "0", "1"], [["1", "0", "0"], ["0", "1", "0"]], { clipRadius: "2" });
  assert.strictEqual(polygon.kind, "polygon");
  assert.ok(polygon.vertices.every((vertex) => vertex.exact.every((coordinate) => !coordinate.includes("."))));

  const segment = Toric.sliceCone(orthant, ["0", "0", "0"], [["1", "0", "0"], ["0", "1", "-1"]], { clipRadius: "2" });
  assert.strictEqual(segment.kind, "segment");
  assert.deepStrictEqual(new Set(segment.vertices.flatMap((vertex) => vertex.exact.slice(1))), new Set(["0"]));

  const point = Toric.sliceCone(orthant, ["0", "0", "0"], [["1", "-1", "0"], ["0", "1", "-1"]], { clipRadius: "2" });
  assert.strictEqual(point.kind, "point");
  assert.deepStrictEqual(point.point.exact, ["0", "0"]);

  const empty = Toric.sliceCone(orthant, ["-1/3", "-1/3", "-1/3"], [["1", "-1", "0"], ["0", "1", "-1"]], { clipRadius: "2" });
  assert.strictEqual(empty.kind, "empty");
  assert.throws(
    () => Toric.sliceCone(orthant, ["0", "0", "1"], [["1", "0", "0"], ["0", "1", "0"]], { clipRadius: "2", limits: { maxCandidates: 1 } }),
    /candidate checks/i
  );
}

{
  const affine = Toric.analyzeFan({ ambientDimension: 3, cones: Toric.presetFan("affine-space", 3) });
  assert.strictEqual(affine.valid, true);
  assert.strictEqual(affine.complete, false);
  assert.strictEqual(affine.smooth, true);
  assert.strictEqual(affine.rayCount, 3);
  assert.strictEqual(affine.classGroup.display, "0");

  const projective = Toric.analyzeFan({ ambientDimension: 3, cones: Toric.presetFan("projective-space", 3) });
  assert.strictEqual(projective.valid, true);
  assert.strictEqual(projective.complete, true);
  assert.strictEqual(projective.smooth, true);
  assert.strictEqual(projective.maximalConeCount, 4);
  assert.strictEqual(projective.classGroup.display, "Z");

  const weighted = Toric.analyzeFan({ ambientDimension: 3, cones: Toric.presetFan("weighted-projective-space", 3) });
  assert.strictEqual(weighted.valid, true);
  assert.strictEqual(weighted.complete, true);
  assert.strictEqual(weighted.smooth, false);
  assert.strictEqual(weighted.simplicial, true);
}

{
  const incompatible = Toric.analyzeFan({
    ambientDimension: 2,
    cones: [
      { id: "sigma-1", generators: [generator("u1", [1, 0]), generator("u2", [0, 1])] },
      { id: "sigma-2", generators: [generator("v1", [1, 0]), generator("v2", [-1, 1])] },
    ],
  });
  assert.strictEqual(incompatible.valid, false);
  assert.match(incompatible.issues.join(" "), /do not meet in a common face/i);
}

console.log("toric_cone_math_test: all tests passed");
