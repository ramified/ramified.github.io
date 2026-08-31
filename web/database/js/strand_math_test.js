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
  linkStateTlGeneratorMatrix,
  reducedBurauGeneratorMatrix,
  evaluateBurauWord,
  evaluateReducedBurauWord,
  evaluateTlCombinationMatrix,
  evaluateTlCombinationLinkStateMatrix,
  calculateStrandWord,
  formatLinearCombinationPlain,
  formatAlignedTrace,
  serializeCalculation,
  makeBraidDiagram,
  makePermutationDiagram,
  makeTlDiagram,
  makeTlCompositionDiagram,
  makeGridDiagram,
  makeBurauLinkStateDiagram,
  minimalRankForIndices,
  pathToSvgData,
  diagramToTikz,
  buildDiagrammaticTrace,
  buildDiagrammaticRelations,
  buildSymbolicRelations,
  buildDiagrammaticPresentation,
  formatDiagrammaticTraceTikz,
  buildBasisCatalog
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

function testReducedBurauLinkStates() {
  const e1 = linkStateTlGeneratorMatrix(4, 1);
  const e2 = linkStateTlGeneratorMatrix(4, 2);
  const e3 = linkStateTlGeneratorMatrix(4, 3);
  assert.strictEqual(e1.length, 3);
  assert.ok(e1[0][0].equals(DELTA));
  assert.ok(e1[0][1].equals(LaurentPolynomial.one()));
  assert.ok(e1[0][2].isZero());
  assert.ok(matrixEquals(matrixMultiply(e1, e1, budget()), matrixScale(e1, DELTA)));
  assert.ok(matrixEquals(
    matrixMultiply(matrixMultiply(e1, e2, budget()), e1, budget()),
    e1
  ));
  assert.ok(matrixEquals(matrixMultiply(e1, e3, budget()), matrixMultiply(e3, e1, budget())));

  const sigma1 = reducedBurauGeneratorMatrix(4, 1, 1);
  const inverse1 = reducedBurauGeneratorMatrix(4, 1, -1);
  const sigma2 = reducedBurauGeneratorMatrix(4, 2, 1);
  assert.ok(matrixEquals(matrixMultiply(sigma1, inverse1, budget()), identityMatrix(3)));
  assert.ok(matrixEquals(
    matrixMultiply(matrixMultiply(sigma1, sigma2, budget()), sigma1, budget()),
    matrixMultiply(matrixMultiply(sigma2, sigma1, budget()), sigma2, budget())
  ));

  const word = [braid(1), braid(2, -1), braid(3), braid(1)];
  const direct = evaluateReducedBurauWord(4, word, budget());
  const tlResult = calculateStrandWord(word, { rank: 4, target: 'tl', basis: 'diagram' });
  const throughTl = evaluateTlCombinationLinkStateMatrix(tlResult.result, 4, budget());
  assert.ok(matrixEquals(direct, throughTl));

  const defaultResult = calculateStrandWord([braid(1)], { rank: 4, target: 'burau' });
  assert.strictEqual(defaultResult.basis, 'link-state');
  assert.strictEqual(defaultResult.result.basisType, 'burau-link-state');
  assert.strictEqual(defaultResult.metadata.matrix.length, 3);
  assert.strictEqual(defaultResult.metadata.matrixRepresentation, 'reduced-link-state');
  assert.ok(defaultResult.relationsUsed.includes('link-state-basis'));
  assert.ok(defaultResult.relationsUsed.includes('reduced-burau-generator'));
  const diagrammatic = buildDiagrammaticTrace(defaultResult);
  assert.strictEqual(diagrammatic.rows.at(-1).rhs.kind, 'vector-system');
  assert.ok(diagrammatic.rows.at(-1).rhs.rows.every((row) => row.lhs.diagram.kind === 'burau-link-state'));

  for (const direction of ['up-down', 'down-up', 'left-right', 'right-left']) {
    const diagram = makeBurauLinkStateDiagram(4, 2, direction);
    assert.strictEqual(diagram.paths.length, 3);
    assert.strictEqual(diagram.paths.filter((path) => path.endOnPlatform).length, 2);
    assert.strictEqual(diagram.platforms.length, 1);
    assert.strictEqual(diagram.platforms[0].points.length, 4);
    assertFiniteDiagram(diagram);
    assert.ok(diagramToTikz(diagram).includes('filldraw'));
  }

  const relationIds = buildDiagrammaticRelations(defaultResult).rows.map((row) => row.relationId);
  assert.ok(relationIds.includes('link-state-action'));
  assert.ok(relationIds.includes('reduced-burau-braid-check'));
  assert.ok(relationIds.includes('link-state-basis'));
  const unreduced = calculateStrandWord([braid(1)], { rank: 4, target: 'burau', basis: 'matrix-unit' });
  assert.strictEqual(unreduced.metadata.matrix.length, 4);
  assert.strictEqual(unreduced.metadata.matrixRepresentation, 'unreduced');
  assert.throws(
    () => calculateStrandWord([], { rank: 1, target: 'burau', basis: 'link-state' }),
    (error) => error instanceof CalculationError && error.code === 'invalid-rank'
  );
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
  assert.ok(!formatAlignedTrace(calculation.trace).includes('\\boxed{'));
  const serialized = serializeCalculation(calculation);
  assert.strictEqual(serialized.convention, 'burau-compatible-v');
  assert.strictEqual(serialized.parameter, 'v');
  assert.strictEqual(serialized.wordOrder, 'left-to-right-product');
}

function testSymmetricPresentations() {
  const word = [{ family: 'coxeter', index: 1 }, { family: 'coxeter', index: 2 }];
  const expected = {
    composition: ['s_{1}\\,s_{2}', 's_1 s_2'],
    transpositions: ['(12)(23)', '(12)(23)'],
    cycle: ['(123)', '(123)'],
    'one-line': ['(2,3,1)', '(2,3,1)'],
    'two-line': ['\\begin{pmatrix}1&2&3\\\\2&3&1\\end{pmatrix}', '(1 2 3 / 2 3 1)'],
    matrix: ['\\begin{pmatrix}&&1\\\\1&&\\\\&1&\\end{pmatrix}', '[0 0 1; 1 0 0; 0 1 0]']
  };

  Object.entries(expected).forEach(([basis, [latex, plain]]) => {
    const calculation = calculateStrandWord(word, { rank: 3, target: 'symmetric', basis, includeTrace: true });
    assert.strictEqual(calculation.trace.at(-1).rhsLatex, latex);
    assert.strictEqual(formatLinearCombinationPlain(calculation.result, basis), plain);
    assert.strictEqual(calculation.trace.at(-1).relationId, `permutation-${basis}`);
    assert.strictEqual(
      buildSymbolicRelations(calculation).groups.at(-1).rows.at(-1).relationId,
      `permutation-${basis}`
    );
    const diagrammatic = buildDiagrammaticTrace(calculation, { scope: 'basis', direction: 'up-down' });
    assert.strictEqual(diagrammatic.rows.at(-1).rhs.terms[0].diagram.kind, 'permutation');
    assert.ok(!formatDiagrammaticTraceTikz(calculation).includes('\\boxed{'));
  });

  const legacy = calculateStrandWord(word, { rank: 3, target: 'symmetric', basis: 'permutation' });
  assert.strictEqual(legacy.trace.at(-1).rhsLatex, '[2,3,1]');
  assert.strictEqual(legacy.trace.at(-1).relationId, 'permutation-basis');
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

function operandDiagrams(operand, out = []) {
  if (!operand) return out;
  if (operand.diagram) out.push(operand.diagram);
  for (const term of operand.terms || []) if (term.diagram) out.push(term.diagram);
  for (const factor of operand.factors || []) operandDiagrams(factor, out);
  if (operand.content) operandDiagrams(operand.content, out);
  for (const row of operand.rows || []) {
    if (row.lhs?.diagram) out.push(row.lhs.diagram);
    for (const term of row.terms || []) if (term.diagram) out.push(term.diagram);
  }
  return out;
}

function relationRowDiagrams(row) {
  return (row.equations || []).flatMap((equation) => [
    ...operandDiagrams(equation.lhs),
    ...operandDiagrams(equation.rhs)
  ]);
}

function matrixTermSignature(terms) {
  return terms.map((term) => ({
    row: term.basis?.row ?? term.diagram?.row,
    column: term.basis?.column ?? term.diagram?.column,
    coefficient: term.coefficient instanceof LaurentPolynomial ? term.coefficient.toJSON() : term.coefficient
  })).sort((left, right) => left.row - right.row || left.column - right.column);
}

function testDiagrammaticRelations() {
  assert.strictEqual(minimalRankForIndices([], 1), 1);
  assert.strictEqual(minimalRankForIndices([1], 2), 2);
  assert.strictEqual(minimalRankForIndices([1, 2], 2), 3);
  const expectedCatalogs = {
    symmetric: {
      basis: 'permutation',
      groups: [
        ['defining', ['coxeter-multiplication', 'coxeter-braid', 'coxeter-commutation']],
        ['interpretation', ['identity', 'permutation-basis']]
      ]
    },
    braid: {
      basis: 'freely-reduced-word',
      groups: [
        ['defining', ['braid-free-cancellation', 'braid-relation', 'braid-commutation']],
        ['interpretation', ['identity', 'braid-word-result']]
      ]
    },
    hecke: {
      basis: 'standard',
      groups: [
        ['defining', ['hecke-multiplication', 'hecke-braid', 'hecke-commutation']],
        ['consequences', ['hecke-inverse', 'hecke-length-increase', 'hecke-length-decrease']],
        ['interpretation', ['identity', 'standard-basis-expansion']]
      ]
    },
    tl: {
      basis: 'diagram',
      groups: [
        ['defining', ['tl-quadratic', 'tl-adjacent', 'tl-commutation', 'tl-loop-removal']],
        ['consequences', ['tl-diagram-stacking']],
        ['interpretation', ['identity', 'tl-diagram-basis']]
      ]
    },
    burau: {
      basis: 'matrix-unit',
      groups: [
        ['defining', ['burau-generator', 'burau-inverse-generator']],
        ['consequences', ['burau-inverse-check', 'burau-braid-check', 'burau-commutation-check']],
        ['interpretation', ['identity', 'matrix-unit-basis']]
      ]
    }
  };

  Object.entries(expectedCatalogs).forEach(([target, expected]) => {
    const calculation = calculateStrandWord([], { rank: 2, target, basis: expected.basis, includeTrace: true });
    const symbolic = buildSymbolicRelations(calculation);
    const diagrammatic = buildDiagrammaticRelations(calculation, { direction: 'up-down' });
    const signature = (model) => model.groups.map((group) => [group.id, group.rows.map((row) => row.relationId)]);
    assert.deepStrictEqual(signature(symbolic), expected.groups);
    assert.deepStrictEqual(signature(diagrammatic), expected.groups);
    assert.deepStrictEqual(diagrammatic.rows, diagrammatic.groups.flatMap((group) => group.rows));
    assert.ok(diagrammatic.rows.every((row) => !row.fallback && row.label && row.equations.length));
  });

  const symmetric = calculateStrandWord([], { rank: 1, target: 'symmetric', basis: 'permutation' });
  const symmetricModel = buildDiagrammaticRelations(symmetric, { direction: 'up-down' });
  assert.deepStrictEqual(
    symmetricModel.groups[0].rows.map((row) => row.rank),
    [2, 3, 4],
    'generic relations use their minimal illustrative ranks even for rank-one calculations'
  );
  const square = symmetricModel.rows.find((row) => row.relationId === 'coxeter-multiplication');
  assert.strictEqual(square.equations[0].lhs.kind, 'diagram');
  assert.strictEqual(square.equations[0].lhs.diagram.paths[0].curves.length, 2);

  const braidCalculation = calculateStrandWord([braid(1)], { rank: 2, target: 'braid', basis: 'freely-reduced-word' });
  const braidModel = buildDiagrammaticRelations(braidCalculation, { direction: 'up-down' });
  const cancellation = braidModel.rows.find((row) => row.relationId === 'braid-free-cancellation');
  assert.strictEqual(cancellation.equations.length, 2);
  assert.ok(cancellation.equations.every((equation) => equation.lhs.kind === 'diagram'));
  assert.ok(cancellation.equations.every((equation) => equation.lhs.diagram.paths[0].curves.length === 2));
  const adjacentBraid = braidModel.rows.find((row) => row.relationId === 'braid-relation');
  assert.strictEqual(adjacentBraid.rank, 3);
  assert.strictEqual(adjacentBraid.equations[0].lhs.diagram.overlays.length, 3);
  assert.strictEqual(adjacentBraid.equations[0].rhs.diagram.overlays.length, 3);

  const tlCalculation = calculateStrandWord([tl(1)], { rank: 2, target: 'tl', basis: 'diagram' });
  const model = buildDiagrammaticRelations(tlCalculation, { direction: 'up-down' });
  const quadratic = model.rows.find((row) => row.relationId === 'tl-quadratic');
  assert.strictEqual(quadratic.rank, 2);
  assert.strictEqual(quadratic.equations[0].lhs.diagram.kind, 'tl-composition');
  assert.strictEqual(quadratic.equations[0].rhs.terms[0].parts.coefficientLatex, '\\delta');
  assert.strictEqual(quadratic.equations[0].lhs.diagram.layers, 2);
  assert.strictEqual(quadratic.equations[0].lhs.diagram.paths.filter((path) => path.closed).length, 1);
  assert.strictEqual(quadratic.equations[0].lhs.diagram.paths.filter((path) => !path.closed).length, 2);
  const adjacentTl = model.rows.find((row) => row.relationId === 'tl-adjacent');
  assert.strictEqual(adjacentTl.rank, 3);
  assert.strictEqual(adjacentTl.equations.length, 2);
  assert.ok(adjacentTl.equations.every((equation) => equation.lhs.diagram.layers === 3));
  assert.strictEqual(model.rows.find((row) => row.relationId === 'tl-commutation').rank, 4);

  const stackingSymbolic = buildSymbolicRelations(tlCalculation).rows
    .find((row) => row.relationId === 'tl-diagram-stacking');
  assert.strictEqual(stackingSymbolic.equations[0].rhs.latex, 'D_P D_Q=\\delta^{k(P,Q)}D_{P\\star Q}');
  assert.ok(stackingSymbolic.hint.includes('each of the k(P,Q) closed circles'));
  const stackingDiagrammatic = model.rows.find((row) => row.relationId === 'tl-diagram-stacking');
  assert.strictEqual(stackingDiagrammatic.equations[0].lhs, null);
  assert.strictEqual(stackingDiagrammatic.equations[0].rhs.kind, 'symbolic');
  assert.strictEqual(stackingDiagrammatic.equations[0].rhs.latex, 'D_P D_Q=\\delta^{k(P,Q)}D_{P\\star Q}');
  assert.strictEqual(stackingDiagrammatic.hint, stackingSymbolic.hint);

  const loopRow = model.rows.find((row) => row.relationId === 'tl-loop-removal');
  const loop = relationRowDiagrams(loopRow)[0];
  assert.strictEqual(loop.kind, 'loop');
  assert.strictEqual(loop.rank, 0);
  assert.strictEqual(loop.paths[0].closed, true);
  assertFiniteDiagram(loop);

  const braidToTlCalculation = calculateStrandWord([braid(1)], { rank: 2, target: 'tl', basis: 'diagram' });
  const braidToTlModel = buildDiagrammaticRelations(braidToTlCalculation);
  const braidToTl = braidToTlModel.groups.find((group) => group.id === 'interpretation').rows
    .find((row) => row.relationId === 'braid-to-tl');
  assert.strictEqual(braidToTl.equations.length, 2);
  const positive = relationRowDiagrams({ equations: [braidToTl.equations[0]] })[0];
  const inverse = relationRowDiagrams({ equations: [braidToTl.equations[1]] })[0];
  assert.strictEqual(positive.overlays.length, 1);
  assert.strictEqual(inverse.overlays.length, 1);
  assert.notDeepStrictEqual(positive.overlays[0], inverse.overlays[0]);

  const klCalculation = calculateStrandWord([kl(1)], { rank: 2, target: 'hecke', basis: 'kl' });
  const klModel = buildDiagrammaticRelations(klCalculation);
  const klRow = klModel.rows.find((row) => row.relationId === 'kl-generator-expansion');
  const klTerms = klRow.equations[0].rhs.terms;
  assert.deepStrictEqual(klTerms.map((term) => term.coefficient), [LaurentPolynomial.one().toJSON(), V.toJSON()]);
  assert.ok(klTerms.every((term) => term.diagram?.kind === 'hecke'));

  const burauCalculation = calculateStrandWord([braid(1)], { rank: 2, target: 'burau', basis: 'matrix-unit' });
  const burauModel = buildDiagrammaticRelations(burauCalculation);
  assert.deepStrictEqual(
    burauModel.groups.at(-1).rows.map((row) => row.relationId),
    ['braid-to-burau', 'matrix-unit-basis']
  );
  const burauRow = burauModel.rows.find((row) => row.relationId === 'burau-generator');
  const expectedBurau = math.matrixToLinearCombination(burauGeneratorMatrix(2, 1, 1), 'matrix-unit').sortedTerms();
  assert.deepStrictEqual(matrixTermSignature(burauRow.equations[0].rhs.terms), matrixTermSignature(expectedBurau));
  const tlBurauCalculation = calculateStrandWord([tl(1)], { rank: 2, target: 'burau', basis: 'matrix-unit' });
  const tlBurauRow = buildDiagrammaticRelations(tlBurauCalculation).rows.find((row) => row.relationId === 'tl-to-burau');
  const expectedTl = math.matrixToLinearCombination(tlGeneratorMatrix(2, 1), 'matrix-unit').sortedTerms();
  assert.deepStrictEqual(matrixTermSignature(tlBurauRow.equations[0].rhs.terms), matrixTermSignature(expectedTl));

  for (const direction of ['up-down', 'down-up', 'left-right', 'right-left']) {
    const oriented = buildDiagrammaticRelations(tlCalculation, { direction });
    assert.strictEqual(oriented.direction, direction);
    oriented.rows.flatMap(relationRowDiagrams).forEach(assertFiniteDiagram);
  }

  const directComposition = makeTlCompositionDiagram(
    2,
    [tlGeneratorDiagram(2, 1), tlGeneratorDiagram(2, 1)],
    'left-right'
  );
  assert.strictEqual(directComposition.paths.filter((path) => path.closed).length, 1);
  assertFiniteDiagram(directComposition);

  const heckeToTl = calculateStrandWord([hecke(1)], { rank: 2, target: 'tl', basis: 'diagram' });
  assert.deepStrictEqual(
    buildSymbolicRelations(heckeToTl).groups.at(-1).rows.map((row) => row.relationId),
    ['hecke-to-tl', 'tl-diagram-basis']
  );
  const routeCases = [
    [[braid(1)], 'symmetric', 'permutation', ['braid-to-symmetric', 'permutation-basis']],
    [[braid(1)], 'hecke', 'standard', ['braid-to-hecke', 'braid-inverse-to-hecke', 'standard-basis-expansion']],
    [[kl(1)], 'hecke', 'kl', ['kl-generator-expansion', 'kl-basis-change']],
    [[braid(1)], 'tl', 'diagram', ['braid-to-tl', 'tl-diagram-basis']],
    [[hecke(1)], 'tl', 'diagram', ['hecke-to-tl', 'tl-diagram-basis']],
    [[kl(1)], 'tl', 'diagram', ['kl-through-hecke-to-tl', 'tl-diagram-basis']],
    [[braid(1)], 'burau', 'matrix-unit', ['braid-to-burau', 'matrix-unit-basis']],
    [[tl(1)], 'burau', 'matrix-unit', ['tl-to-burau', 'matrix-unit-basis']],
    [[hecke(1)], 'burau', 'matrix-unit', ['hecke-to-burau', 'matrix-unit-basis']],
    [[kl(1)], 'burau', 'vector', ['kl-to-burau', 'vector-basis']]
  ];
  routeCases.forEach(([word, target, basis, expected]) => {
    const calculation = calculateStrandWord(word, { rank: 2, target, basis });
    assert.deepStrictEqual(
      buildSymbolicRelations(calculation).groups.at(-1).rows.map((row) => row.relationId),
      expected
    );
  });
}

function testRelationProvenanceAndSharedBudget() {
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
    assert.strictEqual(identity.trace[0].relationId, 'identity');
    assert.ok(identity.relationsUsed.includes('identity'));
  }

  const heckeCalculation = calculateStrandWord([hecke(1)], {
    rank: 3,
    target: 'hecke',
    basis: 'standard',
    includeTrace: true
  });
  assert.strictEqual(heckeCalculation.trace[0].relationId, 'hecke-multiplication');
  assert.ok(heckeCalculation.relationsUsed.includes('hecke-multiplication'));
  assert.ok(!heckeCalculation.relationsUsed.includes('braid-to-hecke'));

  const presentation = buildDiagrammaticPresentation(heckeCalculation, {
    scope: 'all',
    direction: 'up-down',
    limits: { rank: 24, compositionLength: 160, atoms: 2 }
  });
  assert.ok(presentation.diagramAtoms <= 2);
  assert.ok(presentation.warnings.some((message) => message.includes('first 2 diagram atoms')));
  assert.strictEqual(presentation.trace.rows.length, heckeCalculation.trace.length);
  assert.ok(presentation.relations.rows.length > heckeCalculation.relationsUsed.length);
  assert.deepStrictEqual(
    presentation.relations.groups.map((group) => group.id),
    ['defining', 'consequences', 'interpretation']
  );
  assert.deepStrictEqual(
    buildDiagrammaticRelations(heckeCalculation, { scope: 'basis' }).rows.map((row) => row.relationId),
    buildDiagrammaticRelations(heckeCalculation, { scope: 'all' }).rows.map((row) => row.relationId)
  );

  const copyOptions = { scope: 'all', direction: 'up-down' };
  const copied = formatDiagrammaticTraceTikz(heckeCalculation, copyOptions);
  const copiedDiagramCount = (copied.match(/\\begin\{tikzpicture\}/g) || []).length;
  assert.strictEqual(copiedDiagramCount, buildDiagrammaticTrace(heckeCalculation, copyOptions).diagramAtoms);
  assert.ok(!copied.includes('Hecke quadratic multiplication'));
}

function testBasisCatalogs() {
  const symmetric = buildBasisCatalog({ rank: 3, target: 'symmetric', basis: 'one-line', pageSize: 2 });
  assert.strictEqual(symmetric.finite, true);
  assert.strictEqual(symmetric.dimension, '6');
  assert.strictEqual(symmetric.page.count, '3');
  assert.deepStrictEqual(symmetric.page.items.map((item) => item.values), [[1, 2, 3], [1, 3, 2]]);
  const symmetricLast = buildBasisCatalog({ rank: 3, target: 'symmetric', basis: 'cycle', pageSize: 2, offset: '4' });
  assert.deepStrictEqual(symmetricLast.page.items.at(-1).values, [3, 2, 1]);

  for (const basis of ['standard', 'kl']) {
    const heckeCatalog = buildBasisCatalog({ rank: 3, target: 'hecke', basis });
    assert.strictEqual(heckeCatalog.dimension, '6');
    assert.strictEqual(heckeCatalog.page.items.length, 6);
    assert.ok(heckeCatalog.page.items.every((item) => item.kind === `hecke-${basis}`));
  }

  const tlCatalog = buildBasisCatalog({ rank: 3, target: 'tl', basis: 'diagram' });
  assert.strictEqual(tlCatalog.dimension, '5');
  assert.deepStrictEqual(
    tlCatalog.page.items.map((item) => item.key).sort(),
    enumerateTlBasis(3, budget()).map((diagram) => diagram.key).sort()
  );

  const matrixUnits = buildBasisCatalog({ rank: 3, target: 'burau', basis: 'matrix-unit' });
  assert.strictEqual(matrixUnits.dimension, '9');
  assert.deepStrictEqual(
    matrixUnits.page.items.map((item) => [item.row, item.column]),
    [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]]
  );
  const vectors = buildBasisCatalog({ rank: 3, target: 'burau', basis: 'vector' });
  assert.strictEqual(vectors.dimension, '3');
  assert.deepStrictEqual(vectors.page.items.map((item) => item.row), [1, 2, 3]);
  const linkStates = buildBasisCatalog({ rank: 4, target: 'burau', basis: 'link-state' });
  assert.strictEqual(linkStates.dimension, '3');
  assert.deepStrictEqual(linkStates.page.items.map((item) => item.cupIndex), [1, 2, 3]);
  assert.ok(linkStates.explanation.includes('platform'));

  const braidCatalog = buildBasisCatalog({ rank: 3, target: 'braid', basis: 'freely-reduced-word' });
  assert.strictEqual(braidCatalog.finite, false);
  assert.strictEqual(braidCatalog.page, null);
  assert.ok(braidCatalog.algorithm.includes('stack'));
  assert.ok(braidCatalog.algorithm.includes('noncanonical'));

  assert.throws(
    () => buildBasisCatalog({ rank: 3, type: 'B', target: 'tl', basis: 'diagram' }),
    (error) => error instanceof CalculationError && error.code === 'type-a-only'
  );
}

testLaurentAndSparseCore();
testPermutationAndBruhat();
testHeckeRelations();
testKlBasis();
testTemperleyLieb();
testBurau();
testReducedBurauLinkStates();
testCrossPaths();
testApiErrorsTraceAndSerialization();
testSymmetricPresentations();
testAdvertisedRoutes();
testSemanticTraceRoutes();
testDiagrammaticGeometryAndTikz();
testDiagrammaticRelations();
testRelationProvenanceAndSharedBudget();
testBasisCatalogs();

console.log('strand_math_test: exact algebra, basis catalogs, diagram relations, TikZ, and limits pass');
