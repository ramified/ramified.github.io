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
    OperationBudget,
    TARGET_BASES,
    DEFAULT_BASES,
    permutationBasis,
    reducedWord,
    formatPermutationBasisLatex,
    formatPermutationBasisPlain,
    canonicalPairs,
    diagramKey
  } = math;

  const DEFAULT_BASIS_PAGE_SIZE = 24;
  const MAX_BASIS_PAGE_SIZE = 96;
  const MAX_INDEXED_RANK = 128;

  function positiveRank(value) {
    const rank = Number(value);
    if (!Number.isInteger(rank) || rank < 1) {
      throw new CalculationError('invalid-rank', 'Rank must be a positive integer.');
    }
    return rank;
  }

  function basisPageSize(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_BASIS_PAGE_SIZE;
    return Math.max(1, Math.min(MAX_BASIS_PAGE_SIZE, Math.floor(parsed)));
  }

  function nonnegativeBigInt(value, fallback) {
    try {
      const out = BigInt(value == null ? fallback : value);
      return out < 0n ? 0n : out;
    } catch (_) {
      return BigInt(fallback);
    }
  }

  function factorialTable(rank, budget) {
    const values = [1n];
    for (let index = 1; index <= rank; index += 1) {
      budget?.tick();
      values.push(values[index - 1] * BigInt(index));
    }
    return values;
  }

  function catalanTable(rank, budget) {
    const values = [1n];
    for (let index = 0; index < rank; index += 1) {
      budget?.tick();
      const numerator = values[index] * 2n * BigInt(2 * index + 1);
      values.push(numerator / BigInt(index + 2));
    }
    return values;
  }

  function permutationAt(rank, ordinal, factorials, budget) {
    let index = nonnegativeBigInt(ordinal, 0);
    const pool = Array.from({ length: rank }, (_, offset) => offset + 1);
    const values = [];
    for (let remaining = rank; remaining > 0; remaining -= 1) {
      budget?.tick();
      const block = factorials[remaining - 1];
      const digit = Number(index / block);
      index %= block;
      values.push(pool.splice(digit, 1)[0]);
    }
    return values;
  }

  function circularMatchingAt(pairCount, ordinal, catalans, offset, budget) {
    if (!pairCount) return [];
    let index = nonnegativeBigInt(ordinal, 0);
    for (let leftPairs = 0; leftPairs < pairCount; leftPairs += 1) {
      budget?.tick();
      const rightPairs = pairCount - leftPairs - 1;
      const block = catalans[leftPairs] * catalans[rightPairs];
      if (index >= block) {
        index -= block;
        continue;
      }
      const rightCount = catalans[rightPairs];
      const partner = offset + 2 * leftPairs + 1;
      return [
        [offset, partner],
        ...circularMatchingAt(leftPairs, index / rightCount, catalans, offset + 1, budget),
        ...circularMatchingAt(rightPairs, index % rightCount, catalans, partner + 1, budget)
      ];
    }
    throw new RangeError('Temperley-Lieb basis ordinal is outside the Catalan range.');
  }

  function tlVertexFromBoundary(rank, vertex) {
    return vertex < rank ? vertex : rank + (2 * rank - 1 - vertex);
  }

  function tlMatchingAt(rank, ordinal, catalans, budget) {
    const circular = circularMatchingAt(rank, ordinal, catalans, 0, budget);
    return canonicalPairs(circular.map(([left, right]) => [
      tlVertexFromBoundary(rank, left),
      tlVertexFromBoundary(rank, right)
    ]));
  }

  function tlLabelLatex(pairs) {
    return `D_{\\{${pairs.map(([left, right]) => `${left + 1}\\!-${right + 1}`).join(',')}\\}}`;
  }

  function normalizedSettings(options) {
    const settings = options || {};
    const rank = positiveRank(settings.rank);
    const type = String(settings.type || 'A');
    if (type !== 'A') {
      throw new CalculationError('type-a-only', 'Basis calculation currently supported for type A only.');
    }
    const target = String(settings.target || 'tl');
    if (!TARGET_BASES[target]) {
      throw new CalculationError('unsupported-target', `Unknown calculation target: ${target}.`);
    }
    const basis = String(settings.basis || DEFAULT_BASES[target]);
    if (!TARGET_BASES[target].includes(basis)) {
      throw new CalculationError('unsupported-basis', `Basis ${basis} is not available for target ${target}.`);
    }
    if (target === 'burau' && basis === 'link-state' && rank < 2) {
      throw new CalculationError('invalid-rank', 'The Burau link-state basis requires at least two strands.');
    }
    return {
      rank,
      target,
      basis,
      offset: nonnegativeBigInt(settings.offset, 0),
      pageSize: basisPageSize(settings.pageSize),
      budget: new OperationBudget(settings.limits)
    };
  }

  function braidCatalog(settings) {
    const rank = settings.rank;
    return {
      kind: 'basis-catalog',
      rank,
      target: 'braid',
      basis: 'freely-reduced-word',
      finite: false,
      dimension: null,
      countLatex: `|B_{${rank}}|=\\infty`,
      definitionLatex: `\\sigma_{i_1}^{\\varepsilon_1}\\cdots\\sigma_{i_m}^{\\varepsilon_m},\\quad \\varepsilon_j\\in\\{\\pm1\\}`,
      resultFormLatex: `\\beta_{\\mathrm{out}}=\\operatorname{freeReduce}(\\beta)`,
      explanation: 'The braid group is infinite, so there is no finite list of basis elements for this output format.',
      algorithm: 'The engine scans the word from left to right with a stack and removes adjacent inverse pairs. It does not apply braid relations, so the resulting freely reduced word is deliberately noncanonical.',
      page: null,
      warnings: []
    };
  }

  function catalogMetadata(settings, dimension) {
    const { rank, target, basis } = settings;
    if (target === 'symmetric') {
      return {
        countLatex: `|S_{${rank}}|=${dimension}`,
        definitionLatex: `S_{${rank}}=\\{w:\\{1,\\ldots,${rank}\\}\\xrightarrow{\\sim}\\{1,\\ldots,${rank}\\}\\}`,
        resultFormLatex: `w\\in S_{${rank}}`,
        explanation: 'The selected row is an expression format for the same complete set of permutations, rather than a different algebraic basis.',
        algorithm: 'Pages are generated directly in lexicographic order by factoradic unranking; the full permutation array is never stored.'
      };
    }
    if (target === 'hecke' && basis === 'standard') {
      return {
        countLatex: `\\operatorname{rank}\\mathcal H(S_{${rank}})=${dimension}`,
        definitionLatex: `\\mathcal H(S_{${rank}})=\\bigoplus_{w\\in S_{${rank}}}\\mathbb Z[v,v^{-1}]H_w`,
        resultFormLatex: `x=\\sum_{w\\in S_{${rank}}}a_w(v)H_w`,
        explanation: 'Every standard basis element is indexed by one permutation.',
        algorithm: 'Permutation indices are unranked lazily; a deterministic reduced word for each permutation supplies its positive Hecke diagram.'
      };
    }
    if (target === 'hecke') {
      return {
        countLatex: `\\operatorname{rank}\\mathcal H(S_{${rank}})=${dimension}`,
        definitionLatex: `\\mathcal H(S_{${rank}})=\\bigoplus_{w\\in S_{${rank}}}\\mathbb Z[v,v^{-1}]\\underline H_w`,
        resultFormLatex: `x=\\sum_{w\\in S_{${rank}}}b_w(v)\\underline H_w`,
        explanation: 'The KL basis is indexed by the same permutations as the standard Hecke basis.',
        algorithm: rank <= 7
          ? 'The engine constructs each requested KL element lazily from bar invariance and Bruhat triangularity, then caches the transition data.'
          : 'The labels can be indexed at this rank, but exact KL expansion is intentionally limited to rank 7 in the calculation engine.'
      };
    }
    if (target === 'tl') {
      return {
        countLatex: `\\dim TL_{${rank}}=C_{${rank}}=${dimension}`,
        definitionLatex: `TL_{${rank}}=\\bigoplus_{P\\in NC_2(${2 * rank})}\\mathbb Z[v,v^{-1}]D_P`,
        resultFormLatex: `x=\\sum_{P\\in NC_2(${2 * rank})}a_P(v)D_P`,
        explanation: 'Each basis element is a canonical noncrossing pairing of the boundary points.',
        algorithm: 'Pages are generated by Catalan unranking: the partner of the first boundary point splits the matching into two smaller independent noncrossing matchings.'
      };
    }
    if (basis === 'link-state') {
      return {
        countLatex: `\\dim W_{${rank},${rank - 2}}=${dimension}`,
        definitionLatex: `W_{${rank},${rank - 2}}=\\bigoplus_{j=1}^{${rank - 1}}\\mathbb Z[v,v^{-1}]L_j`,
        resultFormLatex: `\\bar\\rho(\\beta)L_j=\\sum_{i=1}^{${rank - 1}}a_{ij}(v)L_i`,
        explanation: 'In L_j, boundary points j and j+1 form one cup; the other n-2 strands end on the platform. Diagrams with an additional platform turnback vanish in this quotient.',
        algorithm: 'The engine applies each Temperley-Lieb generator exactly: e_i L_i = delta L_i, e_i L_j = L_i for |i-j| = 1, and e_i L_j = 0 otherwise, then uses sigma_i = I - v e_i.'
      };
    }
    if (basis === 'matrix-unit') {
      return {
        countLatex: `\\dim M_{${rank}}(\\mathbb Z[v,v^{-1}])=${dimension}`,
        definitionLatex: `M_{${rank}}=\\bigoplus_{1\\leq i,j\\leq ${rank}}\\mathbb Z[v,v^{-1}]E_{ij}`,
        resultFormLatex: `\\rho(\\beta)=\\sum_{i,j}a_{ij}(v)E_{ij}`,
        explanation: 'Matrix units form the ambient coordinate basis used to display every unreduced Burau matrix.',
        algorithm: 'The engine multiplies exact Laurent-polynomial matrices and reads the nonzero entries as matrix-unit coefficients.'
      };
    }
    return {
      countLatex: `\\dim (\\mathbb Z[v,v^{-1}])^{${rank}}=${dimension}`,
      definitionLatex: `(\\mathbb Z[v,v^{-1}])^{${rank}}=\\bigoplus_{i=1}^{${rank}}\\mathbb Z[v,v^{-1}]e_i`,
      resultFormLatex: `\\rho(\\beta)e_j=\\sum_i a_{ij}(v)e_i`,
      explanation: 'The vector view expands each column of the Burau matrix in the standard vector basis.',
      algorithm: 'The engine multiplies the same exact Burau matrix, then reads one column at a time as coefficients of the vectors e_i.'
    };
  }

  function permutationItem(settings, values, ordinal) {
    const basis = permutationBasis(values);
    const word = reducedWord(values, settings.budget);
    if (settings.target === 'symmetric') {
      return {
        key: basis.key,
        kind: 'permutation',
        ordinal: ordinal.toString(),
        values,
        word,
        labelLatex: formatPermutationBasisLatex(basis, settings.basis),
        labelPlain: formatPermutationBasisPlain(basis, settings.basis)
      };
    }
    const kl = settings.basis === 'kl';
    return {
      key: basis.key,
      kind: kl ? 'hecke-kl' : 'hecke-standard',
      ordinal: ordinal.toString(),
      values,
      word,
      labelLatex: kl ? `\\underline{H}_{[${values.join(',')}]}` : `H_{[${values.join(',')}]}`,
      labelPlain: kl ? `Hbar_[${values.join(',')}]` : `H_[${values.join(',')}]`
    };
  }

  function basisItems(settings, dimension, tables) {
    const start = settings.offset >= dimension
      ? ((dimension - 1n) / BigInt(settings.pageSize)) * BigInt(settings.pageSize)
      : settings.offset;
    const end = start + BigInt(settings.pageSize) > dimension
      ? dimension
      : start + BigInt(settings.pageSize);
    const items = [];
    for (let ordinal = start; ordinal < end; ordinal += 1n) {
      settings.budget.tick();
      if (settings.target === 'symmetric' || settings.target === 'hecke') {
        const values = permutationAt(settings.rank, ordinal, tables.factorials, settings.budget);
        items.push(permutationItem(settings, values, ordinal));
      } else if (settings.target === 'tl') {
        const pairs = tlMatchingAt(settings.rank, ordinal, tables.catalans, settings.budget);
        const key = diagramKey(pairs);
        items.push({
          key,
          kind: 'tl-diagram',
          ordinal: ordinal.toString(),
          rank: settings.rank,
          pairs,
          labelLatex: tlLabelLatex(pairs),
          labelPlain: `D_{${pairs.map(([left, right]) => `${left + 1}-${right + 1}`).join(';')}}`
        });
      } else if (settings.basis === 'link-state') {
        const cupIndex = Number(ordinal) + 1;
        items.push({
          key: String(cupIndex),
          kind: 'burau-link-state',
          ordinal: ordinal.toString(),
          rank: settings.rank,
          row: cupIndex,
          cupIndex,
          labelLatex: `L_{${cupIndex}}`,
          labelPlain: `L_${cupIndex}`
        });
      } else if (settings.basis === 'matrix-unit') {
        const rank = BigInt(settings.rank);
        const row = Number(ordinal / rank) + 1;
        const column = Number(ordinal % rank) + 1;
        items.push({
          key: `${row},${column}`,
          kind: 'matrix-unit',
          ordinal: ordinal.toString(),
          row,
          column,
          labelLatex: `E_{${row}${column}}`,
          labelPlain: `E_${row},${column}`
        });
      } else {
        const row = Number(ordinal) + 1;
        items.push({
          key: String(row),
          kind: 'vector-unit',
          ordinal: ordinal.toString(),
          row,
          column: 1,
          labelLatex: `e_{${row}}`,
          labelPlain: `e_${row}`
        });
      }
    }
    const size = BigInt(settings.pageSize);
    const pageCount = (dimension + size - 1n) / size;
    const pageIndex = start / size;
    return {
      start: start.toString(),
      end: end.toString(),
      firstItem: (start + 1n).toString(),
      lastItem: end.toString(),
      index: (pageIndex + 1n).toString(),
      count: pageCount.toString(),
      size: settings.pageSize,
      hasPrevious: start > 0n,
      hasNext: end < dimension,
      previousStart: (start > size ? start - size : 0n).toString(),
      nextStart: end.toString(),
      items
    };
  }

  function buildBasisCatalog(options) {
    const settings = normalizedSettings(options);
    if (settings.target === 'braid') return braidCatalog(settings);
    if (settings.rank > MAX_INDEXED_RANK) {
      throw new CalculationError(
        'computation-limit',
        `Basis indexing is limited to rank ${MAX_INDEXED_RANK} to keep browser output responsive.`
      );
    }
    let dimension;
    const tables = {};
    if (settings.target === 'symmetric' || settings.target === 'hecke') {
      tables.factorials = factorialTable(settings.rank, settings.budget);
      dimension = tables.factorials[settings.rank];
    } else if (settings.target === 'tl') {
      tables.catalans = catalanTable(settings.rank, settings.budget);
      dimension = tables.catalans[settings.rank];
    } else {
      dimension = settings.basis === 'link-state'
        ? BigInt(settings.rank - 1)
        : settings.basis === 'matrix-unit'
          ? BigInt(settings.rank) * BigInt(settings.rank)
          : BigInt(settings.rank);
    }
    const metadata = catalogMetadata(settings, dimension.toString());
    return {
      kind: 'basis-catalog',
      rank: settings.rank,
      target: settings.target,
      basis: settings.basis,
      finite: true,
      dimension: dimension.toString(),
      ...metadata,
      page: basisItems(settings, dimension, tables),
      warnings: []
    };
  }

  return {
    DEFAULT_BASIS_PAGE_SIZE,
    MAX_BASIS_PAGE_SIZE,
    MAX_INDEXED_RANK,
    factorialTable,
    catalanTable,
    permutationAt,
    tlMatchingAt,
    buildBasisCatalog
  };
});
