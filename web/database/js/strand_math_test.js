const assert = require('assert');
const math = require('./strand_math/index.js');

const {
  CalculationError,
  OperationBudget,
  LaurentPolynomial,
  LinearCombination,
  V,
  V_INVERSE,
  DELTA,
  identityPermutation,
  permutationFromWord,
  permutationLength,
  bruhatLeq,
  heckeIdentity,
  heckeMultiplyRightSimple,
  heckeMultiply,
  canonicalBasis,
  canonicalBasisIsBarInvariant,
  standardToKl,
  klToStandard,
  tlIdentity,
  tlGenerator,
  tlMultiply,
  tlGeneratorDiagram,
  stackTlDiagrams,
  enumerateTlBasis,
  identityMatrix,
  matrixAdd,
  matrixScale,
  matrixMultiply,
  matrixEquals,
  burauGeneratorMatrix,
  tlGeneratorMatrix,
  evaluateBurauWord,
  evaluateTlCombinationMatrix,
  calculateStrandWord,
  formatAlignedTrace,
  serializeCalculation,
  makeBraidDiagram,
  makePermutationDiagram,
  makeTlDiagram,
  makeGridDiagram,
  pathToSvgData,
  diagramToTikz,
  buildDiagrammaticTrace,
  formatDiagrammaticTraceTikz
} = math;

function budget() {
  return new OperationBudget({ operations: 2000000, terms: 100000, timeoutMs: 30000 });
}

function poly(spec) {
  return new LaurentPolynomial(spec);
}

function braid(index, sign = 1) {
  return { family: 'braid', index, sign };
}

function hecke(index, sign = 1) {
  return { family: 'hecke', index, sign };
}

function kl(index) {
  return { family: 'kl', index };
}

function tl(index) {
  return { family: 'tl', index };
}

function matrixSubtract(left, right) {
  return matrixAdd(left, matrixScale(right, poly({ 0: -1 })));
}

function result(word, options) {
  return calculateStrandWord(word, { rank: 3, includeTrace: true, ...options });
}

function seededWords(count) {
  let seed = 1729;
  const words = [];
  for (let sample = 0; sample < count; sample++) {
    const word = [];
    const length = 1 + (sample % 7);
    for (let index = 0; index < length; index++) {
      seed = (seed * 48271) % 2147483647;
      word.push(braid(1 + (seed % 2), seed % 3 === 0 ? -1 : 1));
    }
    words.push(word);
  }
  return words;
}

function testLaurentAndSparseCore() {
  assert.ok(DELTA.mul(V).equals(poly({ 0: 1, 2: 1 })));
  assert.ok(poly({ '-2': 2, 0: -3, 4: 1 }).bar().equals(poly({ 2: 2, 0: -3, '-4': 1 })));
  assert.strictEqual(poly({ 1: 1, 0: -1 }).add(poly({ 1: -1, 0: 1 })).isZero(), true);
  const sparse = LinearCombination.single('test', { key: 'x' }, V);
  sparse.addTerm({ key: 'x' }, V.neg());
  assert.strictEqual(sparse.isZero(), true);
}

function testPermutationAndBruhat() {
  const left = permutationFromWord(3, [1, 2, 1], budget());
  const right = permutationFromWord(3, [2, 1, 2], budget());
  assert.deepStrictEqual(left, [3, 2, 1]);
  assert.deepStrictEqual(left, right);
  assert.deepStrictEqual(permutationFromWord(3, [1, 1], budget()), identityPermutation(3));
  assert.strictEqual(permutationLength(left), 3);
  assert.strictEqual(bruhatLeq([2, 1, 3], [3, 2, 1], budget()), true);
  assert.strictEqual(bruhatLeq([3, 2, 1], [2, 1, 3], budget()), false);
}

function heckeWord(generators) {
  let out = heckeIdentity(4);
  for (const generator of generators) out = heckeMultiplyRightSimple(out, generator, budget());
  return out;
}

function testHeckeRelations() {
  const h1 = heckeWord([1]);
  const square = heckeMultiply(h1, h1, budget());
  const expected = heckeIdentity(4).add(h1.scale(V_INVERSE.sub(V)));
  assert.ok(square.equals(expected), 'Hecke quadratic relation');
  assert.ok(heckeWord([1, 3]).equals(heckeWord([3, 1])), 'Hecke commutation');
  assert.ok(heckeWord([1, 2, 1]).equals(heckeWord([2, 1, 2])), 'Hecke braid relation');

  const inverse = result([hecke(1), hecke(1, -1)], { target: 'hecke', basis: 'standard' });
  assert.ok(inverse.result.equals(heckeIdentity(3)), 'Hecke inverse formula');
}

function testKlBasis() {
  const s1 = canonicalBasis(3, [2, 1, 3], budget());
  assert.ok(s1.terms.get('2,1,3').coefficient.equals(LaurentPolynomial.one()));
  assert.ok(s1.terms.get('1,2,3').coefficient.equals(V));
  assert.ok(canonicalBasisIsBarInvariant(3, [3, 2, 1], budget()));
  assert.ok(canonicalBasisIsBarInvariant(4, [3, 4, 1, 2], budget()));

  const canonical = canonicalBasis(4, [3, 4, 1, 2], budget());
  assert.ok(klToStandard(standardToKl(canonical, 4, budget()), 4, budget()).equals(canonical));

  const product = result([kl(1), kl(2), kl(1)], { target: 'hecke', basis: 'kl' });
  assert.strictEqual(product.result.terms.size, 2);
  assert.ok(product.result.terms.has('3,2,1'));
  assert.ok(product.result.terms.has('2,1,3'));
  assert.throws(
    () => calculateStrandWord([kl(1)], { rank: 8, target: 'hecke', basis: 'kl' }),
    (error) => error instanceof CalculationError && error.code === 'kl-rank-limit'
  );
}

function testTemperleyLieb() {
  const e1 = tlGenerator(4, 1);
  const e2 = tlGenerator(4, 2);
  const e3 = tlGenerator(4, 3);
  assert.ok(tlMultiply(e1, e1, budget()).equals(e1.scale(DELTA)), 'TL quadratic relation');
  assert.ok(tlMultiply(e1, e3, budget()).equals(tlMultiply(e3, e1, budget())), 'TL commutation');
  assert.ok(tlMultiply(tlMultiply(e1, e2, budget()), e1, budget()).equals(e1), 'TL triple relation');
  const stacked = stackTlDiagrams(tlGeneratorDiagram(3, 1), tlGeneratorDiagram(3, 1), budget());
  assert.strictEqual(stacked.loops, 1);
  assert.strictEqual(stacked.diagram.key, tlGeneratorDiagram(3, 1).key);
  assert.strictEqual(enumerateTlBasis(1, budget()).length, 1);
  assert.strictEqual(enumerateTlBasis(2, budget()).length, 2);
  assert.strictEqual(enumerateTlBasis(3, budget()).length, 5);
  assert.strictEqual(enumerateTlBasis(4, budget()).length, 14);
}

function testBurau() {
  const sigma1 = burauGeneratorMatrix(3, 1, 1);
  const sigma2 = burauGeneratorMatrix(3, 2, 1);
  const inverse1 = burauGeneratorMatrix(3, 1, -1);
  assert.ok(matrixEquals(matrixMultiply(sigma1, inverse1, budget()), identityMatrix(3)));
  assert.ok(matrixEquals(
    matrixMultiply(matrixMultiply(sigma1, sigma2, budget()), sigma1, budget()),
    matrixMultiply(matrixMultiply(sigma2, sigma1, budget()), sigma2, budget())
  ));
  const identityMinusSigma = matrixSubtract(identityMatrix(3), sigma1);
  assert.ok(matrixEquals(matrixScale(identityMinusSigma, V_INVERSE), tlGeneratorMatrix(3, 1)));
  assert.ok(matrixEquals(matrixSubtract(identityMatrix(3), matrixScale(tlGeneratorMatrix(3, 1), V)), sigma1));
}

function testCrossPaths() {
  for (const word of seededWords(24)) {
    const directTl = result(word, { target: 'tl', basis: 'diagram' });
    const heckeResult = result(word, { target: 'hecke', basis: 'standard' });
    const throughHecke = math.heckeStandardToTl(heckeResult.result, 3, budget());
    assert.ok(directTl.result.equals(throughHecke), `B -> TL equals B -> H -> TL for ${JSON.stringify(word)}`);

    const directMatrix = evaluateBurauWord(3, word, budget());
    const throughTlMatrix = evaluateTlCombinationMatrix(directTl.result, 3, budget());
    assert.ok(matrixEquals(directMatrix, throughTlMatrix), `B -> Burau equals B -> TL -> Burau for ${JSON.stringify(word)}`);
  }

  const braidRelationLeft = result([braid(1), braid(2), braid(1)], { target: 'hecke', basis: 'standard' });
  const braidRelationRight = result([braid(2), braid(1), braid(2)], { target: 'hecke', basis: 'standard' });
  assert.ok(braidRelationLeft.result.equals(braidRelationRight.result));
}

function testApiErrorsTraceAndSerialization() {
  const empty = calculateStrandWord([], { rank: 3, target: 'tl', basis: 'diagram' });
  assert.ok(empty.result.equals(tlIdentity(3)));
  assert.strictEqual(empty.sourceFamily, 'identity');
  const braidResult = result([braid(1), braid(1, -1)], { target: 'braid', basis: 'freely-reduced-word' });
  assert.strictEqual(braidResult.result.terms.values().next().value.basis.word.length, 0);
  assert.ok(braidResult.warnings[0].includes('not a canonical normal form'));

  assert.throws(
    () => calculateStrandWord([braid(1), tl(2)], { rank: 3, target: 'tl', basis: 'diagram' }),
    (error) => error.code === 'mixed-generator-families'
  );
  assert.throws(
    () => calculateStrandWord([tl(1)], { rank: 3, target: 'hecke', basis: 'standard' }),
    (error) => error.code === 'unsupported-conversion'
  );
  assert.throws(
    () => calculateStrandWord([braid(1)], { rank: 3, type: 'B', target: 'tl', basis: 'diagram' }),
    (error) => error.code === 'type-a-only'
  );
  assert.throws(
    () => calculateStrandWord(Array.from({ length: 20 }, () => kl(1)), {
      rank: 3,
      target: 'hecke',
      basis: 'standard',
      limits: { operations: 1, terms: 2, timeoutMs: 1000 }
    }),
    (error) => error.code === 'computation-limit'
  );

  const calculation = result([braid(1), braid(2), braid(1, -1)], { target: 'tl', basis: 'diagram' });
  assert.ok(calculation.trace.every((step) => step.relationId));
  assert.ok(formatAlignedTrace(calculation.trace).includes('\\begin{aligned}'));
  assert.ok(formatAlignedTrace(calculation.trace).includes('\\boxed{'));
  const serialized = serializeCalculation(calculation);
  assert.strictEqual(serialized.convention, 'burau-compatible-v');
  assert.strictEqual(serialized.parameter, 'v');
  assert.strictEqual(serialized.wordOrder, 'left-to-right-product');
}

function testAdvertisedRoutes() {
  const coxeterPermutation = calculateStrandWord(
    [{ family: 'coxeter', index: 1 }, { family: 'coxeter', index: 2 }],
    { rank: 3, target: 'symmetric', basis: 'permutation' }
  );
  assert.deepStrictEqual(coxeterPermutation.result.terms.values().next().value.basis.values, [2, 3, 1]);
  const braidPermutation = calculateStrandWord([braid(1), braid(2)], { rank: 3, target: 'symmetric', basis: 'permutation' });
  assert.ok(braidPermutation.result.equals(coxeterPermutation.result));

  const heckeTl = calculateStrandWord([hecke(1), hecke(2, -1)], { rank: 3, target: 'tl', basis: 'diagram' });
  const heckeBurau = calculateStrandWord([hecke(1)], { rank: 3, target: 'burau', basis: 'matrix-unit' });
  const klTl = calculateStrandWord([kl(1), kl(2)], { rank: 3, target: 'tl', basis: 'diagram' });
  const klBurau = calculateStrandWord([kl(1)], { rank: 3, target: 'burau', basis: 'vector' });
  const tlBurau = calculateStrandWord([tl(1), tl(2)], { rank: 3, target: 'burau', basis: 'matrix-unit' });
  [heckeTl, heckeBurau, klTl, klBurau, tlBurau].forEach((calculation) => assert.ok(!calculation.result.isZero()));

  for (const [target, basis] of [
    ['symmetric', 'permutation'],
    ['braid', 'freely-reduced-word'],
    ['hecke', 'standard'],
    ['hecke', 'kl'],
    ['tl', 'diagram'],
    ['burau', 'matrix-unit'],
    ['burau', 'vector']
  ]) {
    const identity = calculateStrandWord([], { rank: 3, target, basis });
    assert.strictEqual(identity.sourceFamily, 'identity');
    assert.ok(!identity.result.isZero());
  }
}

function testSemanticTraceRoutes() {
  const routes = [
    [[{ family: 'coxeter', index: 1 }], 'symmetric', 'permutation'],
    [[braid(1)], 'symmetric', 'permutation'],
    [[braid(1, -1)], 'braid', 'freely-reduced-word'],
    [[braid(1)], 'hecke', 'standard'],
    [[braid(1)], 'tl', 'diagram'],
    [[braid(1)], 'burau', 'matrix-unit'],
    [[hecke(1)], 'hecke', 'standard'],
    [[hecke(1)], 'tl', 'diagram'],
    [[hecke(1)], 'burau', 'vector'],
    [[kl(1)], 'hecke', 'standard'],
    [[kl(1)], 'hecke', 'kl'],
    [[kl(1)], 'tl', 'diagram'],
    [[kl(1)], 'burau', 'matrix-unit'],
    [[tl(1)], 'tl', 'diagram'],
    [[tl(1)], 'burau', 'vector']
  ];
  for (const [word, target, basis] of routes) {
    const calculation = calculateStrandWord(word, { rank: 3, target, basis, includeTrace: true });
    assert.strictEqual(calculation.trace[0].semantic.lhs.kind, 'word');
    assert.strictEqual(calculation.trace[0].semantic.rhs.kind, 'mapped-product');
    assert.strictEqual(calculation.trace.at(-1).semantic.rhs.kind, 'linear-combination');
    assert.doesNotThrow(() => JSON.stringify(serializeCalculation(calculation)));
  }
  for (const [target, basis] of [
    ['symmetric', 'permutation'],
    ['braid', 'freely-reduced-word'],
    ['hecke', 'standard'],
    ['hecke', 'kl'],
    ['tl', 'diagram'],
    ['burau', 'matrix-unit'],
    ['burau', 'vector']
  ]) {
    const identity = calculateStrandWord([], { rank: 3, target, basis, includeTrace: true });
    assert.deepStrictEqual(identity.trace[0].semantic.lhs.records, []);
    assert.doesNotThrow(() => JSON.stringify(serializeCalculation(identity)));
  }
}

function assertFiniteDiagram(diagram) {
  assert.ok(diagram.width > 0 && diagram.height > 0);
  for (const path of diagram.paths || []) {
    assert.ok(!/NaN|undefined|Infinity/.test(pathToSvgData(path)));
  }
  assert.ok(!/NaN|undefined|Infinity/.test(diagramToTikz(diagram)));
}

function testDiagrammaticGeometryAndTikz() {
  const permutation = makePermutationDiagram([2, 1, 3], 'up-down');
  assert.strictEqual(permutation.paths.length, 3);
  assert.strictEqual(permutation.overlays.length, 0);
  assertFiniteDiagram(permutation);

  const positive = makeBraidDiagram(3, [braid(1)], 'up-down', 'braid');
  const inverse = makeBraidDiagram(3, [braid(1, -1)], 'up-down', 'braid');
  assert.strictEqual(positive.overlays.length, 1);
  assert.strictEqual(inverse.overlays.length, 1);
  assert.notDeepStrictEqual(positive.overlays[0], inverse.overlays[0]);
  for (const direction of ['up-down', 'down-up', 'left-right', 'right-left']) {
    const oriented = makeBraidDiagram(4, [braid(1), braid(2, -1)], direction, 'braid');
    assert.strictEqual(oriented.direction, direction);
    assertFiniteDiagram(oriented);
  }

  const tlBasis = tlGeneratorDiagram(3, 1);
  const matching = makeTlDiagram(3, tlBasis.pairs, 'right-left');
  assert.strictEqual(matching.paths.length, 3);
  assert.ok(matching.paths.every((path) => path.role === 'tl'));

  const matrixUnit = makeGridDiagram(4, 2, 3, 'down-up', false);
  const vectorUnit = makeGridDiagram(4, 3, 1, 'left-right', true);
  assert.strictEqual(matrixUnit.cells.length, 16);
  assert.strictEqual(matrixUnit.cells.filter((cell) => cell.selected).length, 1);
  assert.strictEqual(vectorUnit.cells.length, 4);
  assert.strictEqual(vectorUnit.cells.filter((cell) => cell.selected).length, 1);
  assertFiniteDiagram(matrixUnit);
  assertFiniteDiagram(vectorUnit);

  const klCalculation = calculateStrandWord([kl(1), kl(2), kl(1)], {
    rank: 3,
    target: 'hecke',
    basis: 'kl',
    includeTrace: true
  });
  const klModel = buildDiagrammaticTrace(klCalculation, { scope: 'basis', direction: 'left-right' });
  const exactStandard = klToStandard(klCalculation.result, 3, budget());
  const klTerms = klModel.rows.at(-1).rhs.terms;
  assert.strictEqual(klTerms.length, exactStandard.terms.size);
  assert.ok(klTerms.every((term) => term.diagram?.kind === 'hecke'));

  const identity = calculateStrandWord([], { rank: 3, target: 'tl', basis: 'diagram', includeTrace: true });
  const identityModel = buildDiagrammaticTrace(identity, { scope: 'all', direction: 'up-down' });
  assert.strictEqual(identityModel.rows[0].rhs.kind, 'diagram');

  const latex = formatDiagrammaticTraceTikz(klCalculation, { scope: 'all', direction: 'right-left' });
  assert.ok(latex.startsWith('% Requires \\usepackage{tikz}'));
  assert.strictEqual((latex.match(/\\begin\{tikzpicture\}/g) || []).length, (latex.match(/\\end\{tikzpicture\}/g) || []).length);
  assert.ok(!/NaN|undefined|Infinity/.test(latex));

  const limited = buildDiagrammaticTrace(klCalculation, {
    scope: 'all',
    direction: 'up-down',
    limits: { rank: 24, compositionLength: 160, atoms: 1 }
  });
  assert.ok(limited.warnings.some((message) => message.includes('first 1 diagram atoms')));
  const limitedLatex = formatDiagrammaticTraceTikz(klCalculation, {
    scope: 'all',
    direction: 'up-down',
    limits: { rank: 24, compositionLength: 160, atoms: 1 }
  });
  assert.ok(limitedLatex.includes('% Diagrammatic fallback:'));
}

testLaurentAndSparseCore();
testPermutationAndBruhat();
testHeckeRelations();
testKlBasis();
testTemperleyLieb();
testBurau();
testCrossPaths();
testApiErrorsTraceAndSerialization();
testAdvertisedRoutes();
testSemanticTraceRoutes();
testDiagrammaticGeometryAndTikz();

console.log('strand_math_test: exact algebra, semantic traces, diagram geometry, TikZ, and limits pass');
