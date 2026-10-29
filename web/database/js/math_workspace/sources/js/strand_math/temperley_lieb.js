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
    V_INVERSE,
    DELTA,
    reducedWord
  } = math;

  class DisjointSet {
    constructor(size) {
      this.parent = Array.from({ length: size }, (_, index) => index);
      this.rank = Array(size).fill(0);
    }

    find(value) {
      let root = value;
      while (this.parent[root] !== root) root = this.parent[root];
      while (this.parent[value] !== value) {
        const next = this.parent[value];
        this.parent[value] = root;
        value = next;
      }
      return root;
    }

    union(left, right) {
      let a = this.find(left);
      let b = this.find(right);
      if (a === b) return;
      if (this.rank[a] < this.rank[b]) [a, b] = [b, a];
      this.parent[b] = a;
      if (this.rank[a] === this.rank[b]) this.rank[a] += 1;
    }
  }

  function canonicalPairs(pairs) {
    return pairs
      .map(([left, right]) => left < right ? [left, right] : [right, left])
      .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  }

  function diagramKey(pairs) {
    return canonicalPairs(pairs).map(([left, right]) => `${left}-${right}`).join(';');
  }

  function diagramBasis(rank, pairs, word) {
    const cleanPairs = canonicalPairs(pairs);
    return { rank, key: diagramKey(cleanPairs), pairs: cleanPairs, word: (word || []).slice() };
  }

  function tlIdentityDiagram(rank) {
    return diagramBasis(rank, Array.from({ length: rank }, (_, index) => [index, rank + index]), []);
  }

  function tlGeneratorDiagram(rank, generator) {
    if (!Number.isInteger(generator) || generator < 1 || generator >= rank) {
      throw new CalculationError('invalid-generator', `Generator index ${generator} is outside 1,...,${rank - 1}.`);
    }
    const pairs = [];
    for (let index = 0; index < rank; index++) {
      if (index === generator - 1) {
        pairs.push([generator - 1, generator]);
        pairs.push([rank + generator - 1, rank + generator]);
        index += 1;
      } else {
        pairs.push([index, rank + index]);
      }
    }
    return diagramBasis(rank, pairs, [generator]);
  }

  function stackTlDiagrams(top, bottom, budget) {
    if (top.rank !== bottom.rank) throw new TypeError('TL diagram ranks differ.');
    const rank = top.rank;
    const sets = new DisjointSet(4 * rank);
    const mapTop = (vertex) => vertex;
    const mapBottom = (vertex) => vertex < rank ? 2 * rank + vertex : 2 * rank + vertex;

    top.pairs.forEach(([left, right]) => {
      budget?.tick();
      sets.union(mapTop(left), mapTop(right));
    });
    bottom.pairs.forEach(([left, right]) => {
      budget?.tick();
      sets.union(mapBottom(left), mapBottom(right));
    });
    for (let index = 0; index < rank; index++) sets.union(rank + index, 2 * rank + index);

    const outerByComponent = new Map();
    for (let index = 0; index < rank; index++) {
      const topRoot = sets.find(index);
      const bottomRoot = sets.find(3 * rank + index);
      if (!outerByComponent.has(topRoot)) outerByComponent.set(topRoot, []);
      if (!outerByComponent.has(bottomRoot)) outerByComponent.set(bottomRoot, []);
      outerByComponent.get(topRoot).push(index);
      outerByComponent.get(bottomRoot).push(rank + index);
    }

    const allRoots = new Set(Array.from({ length: 4 * rank }, (_, index) => sets.find(index)));
    let loops = 0;
    const pairs = [];
    allRoots.forEach((root) => {
      const outer = outerByComponent.get(root) || [];
      if (!outer.length) loops += 1;
      else if (outer.length === 2) pairs.push(outer);
      else throw new Error('Invalid TL stacking component.');
    });

    return {
      loops,
      diagram: diagramBasis(rank, pairs, top.word.concat(bottom.word))
    };
  }

  function tlIdentity(rank) {
    return LinearCombination.single('tl-diagram', tlIdentityDiagram(rank), LaurentPolynomial.one());
  }

  function tlGenerator(rank, generator) {
    return LinearCombination.single('tl-diagram', tlGeneratorDiagram(rank, generator), LaurentPolynomial.one());
  }

  function tlMultiply(left, right, budget, relationsUsed) {
    const out = new LinearCombination('tl-diagram');
    for (const leftTerm of left.terms.values()) {
      for (const rightTerm of right.terms.values()) {
        budget?.tick();
        const product = stackTlDiagrams(leftTerm.basis, rightTerm.basis, budget);
        let coefficient = leftTerm.coefficient.mul(rightTerm.coefficient, budget);
        if (product.loops) {
          relationsUsed?.add('tl-loop-removal');
          coefficient = coefficient.mul(DELTA.pow(product.loops, budget), budget);
        }
        relationsUsed?.add('tl-diagram-stacking');
        out.addTerm(product.diagram, coefficient);
      }
    }
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function tlMultiplyByGeneratorFactor(combination, generator, identityCoefficient, generatorCoefficient, budget, relationsUsed) {
    const out = combination.scale(identityCoefficient || LaurentPolynomial.zero(), budget);
    const product = tlMultiply(combination, tlGenerator(combination.terms.values().next().value?.basis.rank || 0, generator), budget, relationsUsed)
      .scale(generatorCoefficient == null ? LaurentPolynomial.one() : generatorCoefficient, budget);
    out.add(product);
    budget?.checkTerms(out.terms.size);
    return out;
  }

  function evaluateTlGeneratorWord(rank, generators, factor, budget, relationsUsed) {
    let out = tlIdentity(rank);
    for (const generator of generators) {
      const coefficients = factor(generator);
      out = tlMultiplyByGeneratorFactor(
        out,
        generator,
        coefficients.identity,
        coefficients.generator,
        budget,
        relationsUsed
      );
    }
    return out;
  }

  function heckeStandardToTl(combination, rank, budget, relationsUsed) {
    const out = new LinearCombination('tl-diagram');
    for (const term of combination.terms.values()) {
      const evaluated = evaluateTlGeneratorWord(
        rank,
        reducedWord(term.basis.values, budget),
        () => ({ identity: V_INVERSE, generator: LaurentPolynomial.monomial(0, -1n) }),
        budget,
        relationsUsed
      );
      out.add(evaluated.scale(term.coefficient, budget));
      budget?.checkTerms(out.terms.size);
    }
    relationsUsed?.add('hecke-to-tl');
    return out;
  }

  function enumerateTlBasis(rank, budget) {
    const identity = tlIdentityDiagram(rank);
    const found = new Map([[identity.key, identity]]);
    const queue = [identity];
    while (queue.length) {
      const current = queue.shift();
      for (let generator = 1; generator < rank; generator++) {
        const next = stackTlDiagrams(current, tlGeneratorDiagram(rank, generator), budget).diagram;
        if (!found.has(next.key)) {
          found.set(next.key, next);
          queue.push(next);
          budget?.checkTerms(found.size);
        }
      }
    }
    return [...found.values()];
  }

  return {
    DisjointSet,
    canonicalPairs,
    diagramKey,
    diagramBasis,
    tlIdentityDiagram,
    tlGeneratorDiagram,
    stackTlDiagrams,
    tlIdentity,
    tlGenerator,
    tlMultiply,
    tlMultiplyByGeneratorFactor,
    evaluateTlGeneratorWord,
    heckeStandardToTl,
    enumerateTlBasis
  };
});
