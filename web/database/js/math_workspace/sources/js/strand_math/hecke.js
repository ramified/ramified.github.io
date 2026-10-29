(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const {
    LaurentPolynomial,
    LinearCombination,
    V,
    V_INVERSE,
    identityPermutation,
    permutationBasis,
    rightMultiplySimple,
    permutationLength,
    reducedWord,
    bruhatLeq,
    comparePermutationBasis
  } = math;

  const barBasisCache = new Map();

  function heckeIdentity(rank) {
    return LinearCombination.single('hecke-standard', permutationBasis(identityPermutation(rank)), LaurentPolynomial.one());
  }

  function heckeBasis(values, coefficient) {
    return LinearCombination.single('hecke-standard', permutationBasis(values), coefficient == null ? LaurentPolynomial.one() : coefficient);
  }

  function heckeMultiplyRightSimple(combination, generator, budget, relationsUsed) {
    const out = new LinearCombination('hecke-standard');
    combination.terms.forEach((term) => {
      budget?.tick();
      const values = term.basis.values;
      const next = rightMultiplySimple(values, generator);
      const increases = permutationLength(next, budget) > permutationLength(values, budget);
      out.addTerm(permutationBasis(next), term.coefficient);
      if (increases) {
        relationsUsed?.add('hecke-length-increase');
      } else {
        relationsUsed?.add('hecke-length-decrease');
        out.addTerm(term.basis, term.coefficient.mul(V_INVERSE.sub(V), budget));
      }
    });
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function heckeMultiplyByGeneratorFactor(combination, generator, identityCoefficient, generatorCoefficient, budget, relationsUsed) {
    const out = combination.scale(identityCoefficient || LaurentPolynomial.zero(), budget);
    const generatorPart = heckeMultiplyRightSimple(combination, generator, budget, relationsUsed)
      .scale(generatorCoefficient == null ? LaurentPolynomial.one() : generatorCoefficient, budget);
    out.add(generatorPart);
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function heckeMultiply(left, right, budget, relationsUsed) {
    const out = new LinearCombination('hecke-standard');
    for (const rightTerm of right.terms.values()) {
      let partial = left.clone();
      for (const generator of reducedWord(rightTerm.basis.values, budget)) {
        partial = heckeMultiplyRightSimple(partial, generator, budget, relationsUsed);
      }
      out.add(partial.scale(rightTerm.coefficient, budget));
      budget?.checkTerms(out.terms.size);
    }
    return out;
  }

  function heckeBarBasis(rank, values, budget) {
    const cacheKey = `${rank}|${values.join(',')}`;
    if (barBasisCache.has(cacheKey)) return barBasisCache.get(cacheKey).clone();
    let out = heckeIdentity(rank);
    const inverseAdjustment = V.sub(V_INVERSE);
    for (const generator of reducedWord(values, budget)) {
      out = heckeMultiplyByGeneratorFactor(
        out,
        generator,
        inverseAdjustment,
        LaurentPolynomial.one(),
        budget
      );
    }
    barBasisCache.set(cacheKey, out.clone());
    return out;
  }

  function heckeBar(combination, rank, budget) {
    const out = new LinearCombination('hecke-standard');
    combination.terms.forEach((term) => {
      out.add(heckeBarBasis(rank, term.basis.values, budget).scale(term.coefficient.bar(), budget));
    });
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function assertBruhatTriangular(combination, topValues, budget) {
    for (const term of combination.terms.values()) {
      if (!bruhatLeq(term.basis.values, topValues, budget)) {
        throw new Error(`Hecke expansion escaped the Bruhat interval below ${topValues.join(',')}.`);
      }
    }
  }

  return {
    heckeIdentity,
    heckeBasis,
    heckeMultiplyRightSimple,
    heckeMultiplyByGeneratorFactor,
    heckeMultiply,
    heckeBarBasis,
    heckeBar,
    assertBruhatTriangular,
    compareHeckeBasis: comparePermutationBasis
  };
});
