(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const {
    CalculationError,
    LaurentPolynomial,
    LinearCombination,
    V,
    permutationBasis,
    permutationLength,
    comparePermutationBasis,
    heckeBasis,
    heckeBar,
    heckeMultiplyByGeneratorFactor,
    assertBruhatTriangular
  } = math;

  const KL_MAX_RANK = 7;
  const canonicalCache = new Map();

  function ensureKlRank(rank) {
    if (rank > KL_MAX_RANK) {
      throw new CalculationError('kl-rank-limit', `Kazhdan--Lusztig calculations are limited to at most ${KL_MAX_RANK} strands.`);
    }
  }

  function canonicalBasis(rank, values, budget) {
    ensureKlRank(rank);
    const key = `${rank}|${values.join(',')}`;
    if (canonicalCache.has(key)) return canonicalCache.get(key).clone();

    let candidate = heckeBasis(values);
    let passes = 0;
    while (true) {
      budget?.tick();
      if (++passes > 20000) {
        throw new CalculationError('computation-limit', 'KL canonicalization did not converge within the work limit.');
      }
      const defect = heckeBar(candidate, rank, budget).sub(candidate.clone());
      if (defect.isZero()) break;
      const term = defect.sortedTerms(comparePermutationBasis)[0];
      const correction = term.coefficient.positivePart();
      if (correction.isZero()) {
        throw new Error(`Invalid anti-invariant KL defect at ${term.basis.key}.`);
      }
      const lower = canonicalBasis(rank, term.basis.values, budget);
      candidate.add(lower.scale(correction, budget));
      budget?.checkTerms(candidate.terms.size);
    }

    assertBruhatTriangular(candidate, values, budget);
    const leading = candidate.terms.get(values.join(','))?.coefficient;
    if (!leading?.equals(LaurentPolynomial.one())) throw new Error('KL basis lost its unit leading coefficient.');
    canonicalCache.set(key, candidate.clone());
    return candidate;
  }

  function klToStandard(combination, rank, budget) {
    ensureKlRank(rank);
    const out = new LinearCombination('hecke-standard');
    combination.terms.forEach((term) => {
      out.add(canonicalBasis(rank, term.basis.values, budget).scale(term.coefficient, budget));
    });
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function standardToKl(combination, rank, budget) {
    ensureKlRank(rank);
    const remainder = combination.clone();
    const out = new LinearCombination('kl');
    let passes = 0;
    while (!remainder.isZero()) {
      budget?.tick();
      if (++passes > 30000) throw new CalculationError('computation-limit', 'KL basis conversion exceeded the work limit.');
      const term = remainder.sortedTerms(comparePermutationBasis)[0];
      out.addTerm(permutationBasis(term.basis.values), term.coefficient);
      remainder.sub(canonicalBasis(rank, term.basis.values, budget).scale(term.coefficient, budget));
      budget?.checkTerms(remainder.terms.size + out.terms.size);
    }
    return out;
  }

  function multiplyKlGeneratorWord(rank, generators, budget, relationsUsed) {
    let out = math.heckeIdentity(rank);
    for (const generator of generators) {
      relationsUsed?.add('kl-generator-expansion');
      out = heckeMultiplyByGeneratorFactor(out, generator, V, LaurentPolynomial.one(), budget, relationsUsed);
    }
    return out;
  }

  function canonicalBasisIsBarInvariant(rank, values, budget) {
    const basis = canonicalBasis(rank, values, budget);
    return heckeBar(basis, rank, budget).equals(basis);
  }

  function clearKlCache() {
    canonicalCache.clear();
  }

  return {
    KL_MAX_RANK,
    ensureKlRank,
    canonicalBasis,
    klToStandard,
    standardToKl,
    multiplyKlGeneratorWord,
    canonicalBasisIsBarInvariant,
    clearKlCache,
    klLength: permutationLength
  };
});
