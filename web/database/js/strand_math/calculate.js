(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  scope.calculateStrandWord = api.calculateStrandWord;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (math) {
  'use strict';

  const {
    CONVENTION,
    CalculationError,
    OperationBudget,
    LaurentPolynomial,
    LinearCombination,
    V,
    V_INVERSE,
    DELTA,
    identityPermutation,
    permutationBasis,
    rightMultiplySimple,
    reducedWord,
    heckeIdentity,
    heckeMultiplyByGeneratorFactor,
    standardToKl,
    heckeStandardToTl,
    tlIdentity,
    tlMultiplyByGeneratorFactor,
    evaluateBurauWord,
    evaluateTlCombinationMatrix,
    matrixToLinearCombination,
    matrixToJSON
  } = math;

  const SUPPORTED_FAMILIES = new Set(['coxeter', 'braid', 'hecke', 'kl', 'tl']);
  const TARGET_BASES = Object.freeze({
    symmetric: ['permutation'],
    braid: ['freely-reduced-word'],
    hecke: ['standard', 'kl'],
    tl: ['diagram'],
    burau: ['matrix-unit', 'vector']
  });
  const DEFAULT_BASES = Object.freeze({
    symmetric: 'permutation',
    braid: 'freely-reduced-word',
    hecke: 'standard',
    tl: 'diagram',
    burau: 'matrix-unit'
  });
  const calculationCache = new Map();

  function normalizeRecord(value) {
    if (!value || typeof value !== 'object') throw new CalculationError('invalid-generator', 'Every generator must declare a family and index.');
    const family = String(value.family || '').toLowerCase();
    const index = Number(value.index);
    if (!SUPPORTED_FAMILIES.has(family) || !Number.isInteger(index)) {
      throw new CalculationError('invalid-generator', 'Every generator must declare a supported family and integer index.');
    }
    const record = { family, index };
    if (family === 'braid' || family === 'hecke') record.sign = value.sign === -1 ? -1 : 1;
    return record;
  }

  function normalizeWord(word, rank) {
    if (!Array.isArray(word)) throw new CalculationError('invalid-word', 'The strand word must be an array.');
    return word.map(normalizeRecord).map((record) => {
      if (record.index < 1 || record.index >= rank) {
        throw new CalculationError('invalid-generator', `Generator index ${record.index} is outside 1,...,${rank - 1}.`);
      }
      return record;
    });
  }

  function detectSourceFamily(records) {
    if (!records.length) return 'identity';
    const families = new Set(records.map((record) => record.family));
    if (families.size > 1) {
      throw new CalculationError(
        'mixed-generator-families',
        'This word contains generators from different algebraic objects. Choose a target and an explicit interpretation/conversion.'
      );
    }
    return records[0].family;
  }

  function assertRoute(sourceFamily, target) {
    const routes = {
      identity: ['symmetric', 'braid', 'hecke', 'tl', 'burau'],
      coxeter: ['symmetric'],
      braid: ['symmetric', 'braid', 'hecke', 'tl', 'burau'],
      hecke: ['hecke', 'tl', 'burau'],
      kl: ['hecke', 'tl', 'burau'],
      tl: ['tl', 'burau']
    };
    if (!routes[sourceFamily]?.includes(target)) {
      throw new CalculationError('unsupported-conversion', `Conversion from ${sourceFamily} generators to ${target} is not supported.`);
    }
  }

  function validateOptions(options) {
    const settings = options || {};
    const rank = Number(settings.rank);
    if (!Number.isInteger(rank) || rank < 1) throw new CalculationError('invalid-rank', 'Rank must be a positive integer.');
    const type = settings.type || 'A';
    if (type !== 'A') throw new CalculationError('type-a-only', 'Calculation currently supported for type A only.');
    const target = String(settings.target || 'tl');
    if (!TARGET_BASES[target]) throw new CalculationError('unsupported-target', `Unknown calculation target: ${target}.`);
    const basis = String(settings.basis || DEFAULT_BASES[target]);
    if (!TARGET_BASES[target].includes(basis)) {
      throw new CalculationError('unsupported-basis', `Basis ${basis} is not available for target ${target}.`);
    }
    if (settings.convention && settings.convention !== CONVENTION.id) {
      throw new CalculationError('unsupported-convention', `Unsupported convention: ${settings.convention}.`);
    }
    return { rank, type, target, basis, includeTrace: settings.includeTrace !== false, limits: settings.limits };
  }

  function evaluateSymmetric(rank, records, budget) {
    let permutation = identityPermutation(rank);
    for (const record of records) {
      budget.tick();
      permutation = rightMultiplySimple(permutation, record.index);
    }
    return LinearCombination.single('permutation', permutationBasis(permutation), LaurentPolynomial.one());
  }

  function freelyReduceBraid(records, budget) {
    const stack = [];
    for (const record of records) {
      budget.tick();
      const previous = stack[stack.length - 1];
      if (previous && previous.index === record.index && previous.sign === -record.sign) stack.pop();
      else stack.push({ family: 'braid', index: record.index, sign: record.sign });
    }
    const key = stack.map((record) => `${record.index}:${record.sign}`).join(',') || 'identity';
    return LinearCombination.single('braid-word', { key, word: stack }, LaurentPolynomial.one());
  }

  function toHeckeStandard(rank, records, sourceFamily, budget, relationsUsed) {
    let out = heckeIdentity(rank);
    for (const record of records) {
      let identityCoefficient = LaurentPolynomial.zero();
      let generatorCoefficient = LaurentPolynomial.one();
      if (sourceFamily === 'braid' && record.sign === 1) {
        generatorCoefficient = V;
        relationsUsed.add('braid-to-hecke');
      } else if (sourceFamily === 'braid') {
        identityCoefficient = LaurentPolynomial.one().sub(LaurentPolynomial.monomial(-2, 1n));
        generatorCoefficient = V_INVERSE;
        relationsUsed.add('braid-inverse-to-hecke');
      } else if (sourceFamily === 'hecke' && record.sign === -1) {
        identityCoefficient = V.sub(V_INVERSE);
        relationsUsed.add('hecke-inverse');
      } else if (sourceFamily === 'kl') {
        identityCoefficient = V;
        relationsUsed.add('kl-generator-expansion');
      }
      out = heckeMultiplyByGeneratorFactor(
        out,
        record.index,
        identityCoefficient,
        generatorCoefficient,
        budget,
        relationsUsed
      );
    }
    return out;
  }

  function toTl(rank, records, sourceFamily, budget, relationsUsed) {
    if (sourceFamily === 'hecke' || sourceFamily === 'kl') {
      return heckeStandardToTl(toHeckeStandard(rank, records, sourceFamily, budget, relationsUsed), rank, budget, relationsUsed);
    }
    let out = tlIdentity(rank);
    for (const record of records) {
      let identityCoefficient = LaurentPolynomial.zero();
      let generatorCoefficient = LaurentPolynomial.one();
      if (sourceFamily === 'braid') {
        identityCoefficient = LaurentPolynomial.one();
        generatorCoefficient = record.sign === -1 ? V_INVERSE.neg() : V.neg();
        relationsUsed.add(record.sign === -1 ? 'braid-inverse-to-tl' : 'braid-to-tl');
      }
      out = tlMultiplyByGeneratorFactor(
        out,
        record.index,
        identityCoefficient,
        generatorCoefficient,
        budget,
        relationsUsed
      );
    }
    return out;
  }

  function sourceWordLatex(records) {
    if (!records.length) return '1';
    return records.map((record) => {
      if (record.family === 'braid') return `\\sigma_{${record.index}}${record.sign === -1 ? '^{-1}' : ''}`;
      if (record.family === 'hecke') return `H_{${record.index}}${record.sign === -1 ? '^{-1}' : ''}`;
      if (record.family === 'kl') return `b_{${record.index}}`;
      if (record.family === 'tl') return `e_{${record.index}}`;
      return `s_{${record.index}}`;
    }).join('\\,');
  }

  function mappedWordLatex(records, sourceFamily, target) {
    if (!records.length) return '1';
    return records.map((record) => {
      const index = record.index;
      if (target === 'symmetric') return `s_{${index}}`;
      if (target === 'hecke') {
        if (sourceFamily === 'braid' && record.sign === 1) return `vH_{${index}}`;
        if (sourceFamily === 'braid') return `(v^{-1}H_{${index}}+1-v^{-2})`;
        if (sourceFamily === 'kl') return `(H_{${index}}+v)`;
        if (record.sign === -1) return `(H_{${index}}+v-v^{-1})`;
        return `H_{${index}}`;
      }
      if (target === 'tl') {
        if (sourceFamily === 'braid') return record.sign === -1 ? `(1-v^{-1}e_{${index}})` : `(1-ve_{${index}})`;
        if (sourceFamily === 'kl') return `(\\delta-e_{${index}})`;
        if (sourceFamily === 'hecke') return record.sign === -1 ? `(v-e_{${index}})` : `(v^{-1}-e_{${index}})`;
        return `e_{${index}}`;
      }
      if (target === 'burau') return `\\rho(${sourceWordLatex([record])})`;
      return sourceWordLatex([record]);
    }).join('');
  }

  function relationForConversion(sourceFamily, target) {
    if (target === 'symmetric') return sourceFamily === 'braid' ? 'braid-to-symmetric' : 'coxeter-multiplication';
    if (target === 'braid') return 'braid-free-cancellation';
    if (target === 'hecke') return sourceFamily === 'kl' ? 'kl-generator-expansion' : 'braid-to-hecke';
    if (target === 'tl') return sourceFamily === 'kl' ? 'kl-through-hecke-to-tl' : `${sourceFamily}-to-tl`;
    if (target === 'burau') return sourceFamily === 'braid' ? 'burau-generator' : 'tl-to-burau';
    return 'basis-expansion';
  }

  function annotationForRelation(relationId) {
    const annotations = {
      'coxeter-multiplication': '\\text{Coxeter multiplication}',
      'braid-to-symmetric': '\\text{forget crossings}',
      'braid-free-cancellation': '\\sigma_i\\sigma_i^{-1}=1',
      'braid-to-hecke': '\\sigma_i=vH_i',
      'braid-inverse-to-hecke': '\\sigma_i^{-1}=v^{-1}H_i+1-v^{-2}',
      'kl-generator-expansion': 'b_i=H_i+v',
      'braid-to-tl': '\\sigma_i=1-ve_i,\\quad\\sigma_i^{-1}=1-v^{-1}e_i',
      'braid-inverse-to-tl': '\\sigma_i^{-1}=1-v^{-1}e_i',
      'tl-to-tl': '\\text{TL multiplication}',
      'kl-through-hecke-to-tl': 'b_i=H_i+v,\\ H_i=v^{-1}-e_i',
      'burau-generator': '\\text{unreduced Burau representation}',
      'burau-inverse-generator': '\\rho(\\sigma_i^{-1})=\\rho(\\sigma_i)^{-1}',
      'tl-to-burau': 'e_i=v^{-1}(I-\\rho(\\sigma_i))',
      'hecke-length-increase': 'H_wH_i=H_{ws_i}\\quad(\\ell(ws_i)>\\ell(w))',
      'hecke-length-decrease': 'H_wH_i=H_{ws_i}+(v^{-1}-v)H_w\\quad(\\ell(ws_i)<\\ell(w))',
      'hecke-to-tl': 'H_i=v^{-1}-e_i',
      'hecke-inverse': 'H_i^{-1}=H_i+v-v^{-1}',
      'tl-diagram-stacking': 'D_1D_2=\\delta^kD',
      'tl-loop-removal': '\\text{each closed loop contributes }\\delta=v+v^{-1}',
      'standard-basis-expansion': '\\text{standard Hecke basis}',
      'kl-basis-change': '\\text{KL canonical basis}',
      'tl-diagram-basis': '\\text{canonical TL diagram basis}',
      'permutation-basis': '\\text{permutation basis}',
      'matrix-unit-basis': '\\text{matrix-unit basis}',
      'vector-basis': '\\text{standard vector basis}',
      'braid-word-result': '\\text{freely reduced; not canonical}'
    };
    return annotations[relationId] || `\\text{${relationId.replace(/-/g, ' ')}}`;
  }

  function finalRelation(target, basis) {
    if (target === 'symmetric') return 'permutation-basis';
    if (target === 'braid') return 'braid-word-result';
    if (target === 'hecke') return basis === 'kl' ? 'kl-basis-change' : 'standard-basis-expansion';
    if (target === 'tl') return 'tl-diagram-basis';
    return basis === 'vector' ? 'vector-basis' : 'matrix-unit-basis';
  }

  function createTrace(records, sourceFamily, target, basis, result, intermediate) {
    const relationId = relationForConversion(sourceFamily, target);
    const trace = [{
      lhsLatex: sourceWordLatex(records),
      rhsLatex: mappedWordLatex(records, sourceFamily, target),
      relationId,
      annotationLatex: annotationForRelation(relationId)
    }];
    if (intermediate) {
      trace.push({
        rhsLatex: formatLinearCombinationLatex(intermediate, 'standard'),
        relationId: 'standard-basis-expansion',
        annotationLatex: annotationForRelation('standard-basis-expansion')
      });
    }
    const lastRelation = finalRelation(target, basis);
    trace.push({
      rhsLatex: formatLinearCombinationLatex(result, basis),
      relationId: lastRelation,
      annotationLatex: annotationForRelation(lastRelation),
      final: true
    });
    return trace;
  }

  function basisLatex(basis, basisType) {
    if (basisType === 'permutation') return `[${basis.values.join(',')}]`;
    if (basisType === 'standard') return `H_{[${basis.values.join(',')}]} `;
    if (basisType === 'kl') return `\\underline{H}_{[${basis.values.join(',')}]}`;
    if (basisType === 'diagram') {
      const pairs = basis.pairs.map(([left, right]) => `${left + 1}\\!-${right + 1}`).join(',');
      return `D_{\\{${pairs}\\}}`;
    }
    if (basisType === 'matrix-unit') return `E_{${basis.row}${basis.column}}`;
    return `e_{${basis.row}}^{(${basis.column})}`;
  }

  function polynomialTimesBasisLatex(coefficient, label) {
    if (coefficient.equals(LaurentPolynomial.one())) return label;
    if (coefficient.equals(LaurentPolynomial.monomial(0, -1n))) return `-${label}`;
    const latex = coefficient.toLatex();
    const wrapped = coefficient.terms.size > 1 ? `(${latex})` : latex;
    return `${wrapped}${label}`;
  }

  function joinSignedLatex(parts) {
    return parts.reduce((out, part, index) => {
      if (!index) return part;
      return part.startsWith('-') ? `${out}${part}` : `${out}+${part}`;
    }, '') || '0';
  }

  function formatLinearCombinationLatex(combination, basis) {
    if (combination.basisType === 'braid-word') {
      const word = combination.terms.values().next().value?.basis.word || [];
      return sourceWordLatex(word);
    }
    if (basis === 'vector' || combination.basisType === 'burau-vector') {
      const columns = new Map();
      combination.terms.forEach((term) => {
        if (!columns.has(term.basis.column)) columns.set(term.basis.column, []);
        columns.get(term.basis.column).push(term);
      });
      const rows = [...columns].sort(([left], [right]) => left - right).map(([column, terms]) => {
        terms.sort((left, right) => left.basis.row - right.basis.row);
        const expansion = joinSignedLatex(terms.map((term) => polynomialTimesBasisLatex(term.coefficient, `e_{${term.basis.row}}`)));
        return `\\rho(\\beta)e_{${column}}=${expansion}`;
      });
      return `\\left\\{\\begin{aligned}${rows.join('\\\\')}\\end{aligned}\\right.`;
    }
    const basisType = basis || combination.basisType;
    const parts = combination.sortedTerms((left, right) => {
      if (left.values && right.values) return right.values.join(',').localeCompare(left.values.join(','));
      return left.key.localeCompare(right.key);
    }).map((term) => polynomialTimesBasisLatex(term.coefficient, basisLatex(term.basis, basisType)));
    return joinSignedLatex(parts);
  }

  function formatLinearCombinationPlain(combination, basis) {
    if (combination.basisType === 'braid-word') {
      const word = combination.terms.values().next().value?.basis.word || [];
      return word.length ? word.map((record) => `sigma_${record.index}${record.sign === -1 ? '^-1' : ''}`).join(' ') : '1';
    }
    return combination.sortedTerms().map((term) => {
      let label;
      if (basis === 'standard') label = `H_[${term.basis.values.join(',')}]`;
      else if (basis === 'kl') label = `Hbar_[${term.basis.values.join(',')}]`;
      else if (basis === 'diagram') label = `D_{${term.basis.key}}`;
      else if (basis === 'matrix-unit') label = `E_${term.basis.row},${term.basis.column}`;
      else if (basis === 'vector') label = `rho(beta)e_${term.basis.column}:e_${term.basis.row}`;
      else label = `[${term.basis.values?.join(',') || term.basis.key}]`;
      return `${term.coefficient.toString()} ${label}`;
    }).join(' + ').replace(/\+ -/g, '- ') || '0';
  }

  function formatAlignedTrace(trace) {
    const rows = trace.map((step, index) => {
      const lhs = index === 0 ? step.lhsLatex : '';
      const rhs = step.final ? `\\boxed{${step.rhsLatex}}` : step.rhsLatex;
      return `${lhs} &=${rhs} &&${step.annotationLatex || ''}`;
    });
    return `\\[\n\\begin{aligned}\n${rows.join('\\\\\n')}\n\\end{aligned}\n\\]`;
  }

  function formatMatrixLatex(matrix) {
    return `\\begin{pmatrix}${matrix.map((row) => row.map((entry) => entry.toLatex()).join('&')).join('\\\\')}\\end{pmatrix}`;
  }

  function calculateStrandWord(word, options) {
    const settings = validateOptions(options);
    const records = normalizeWord(word, settings.rank);
    const sourceFamily = detectSourceFamily(records);
    assertRoute(sourceFamily, settings.target);
    const cacheKey = JSON.stringify({
      word: records,
      rank: settings.rank,
      type: settings.type,
      target: settings.target,
      basis: settings.basis,
      convention: CONVENTION.id,
      limits: settings.limits || null
    });
    if (calculationCache.has(cacheKey)) {
      const cached = calculationCache.get(cacheKey);
      return settings.includeTrace ? cached : { ...cached, trace: [] };
    }

    const budget = new OperationBudget(settings.limits);
    const relationsUsed = new Set();
    const warnings = [];
    let result;
    let intermediate = null;
    let matrix = null;

    if (settings.target === 'symmetric') {
      result = evaluateSymmetric(settings.rank, records, budget);
    } else if (settings.target === 'braid') {
      result = freelyReduceBraid(records, budget);
      warnings.push('Only adjacent inverse cancellation is applied; this braid word is not a canonical normal form.');
    } else if (settings.target === 'hecke') {
      intermediate = toHeckeStandard(settings.rank, records, sourceFamily, budget, relationsUsed);
      result = settings.basis === 'kl' ? standardToKl(intermediate, settings.rank, budget) : intermediate;
      if (settings.basis === 'standard') intermediate = null;
    } else if (settings.target === 'tl') {
      result = toTl(settings.rank, records, sourceFamily, budget, relationsUsed);
    } else if (sourceFamily === 'braid') {
      matrix = evaluateBurauWord(settings.rank, records, budget, relationsUsed);
      result = matrixToLinearCombination(matrix, settings.basis);
    } else {
      const tl = sourceFamily === 'identity' ? tlIdentity(settings.rank) : toTl(settings.rank, records, sourceFamily, budget, relationsUsed);
      matrix = evaluateTlCombinationMatrix(tl, settings.rank, budget, relationsUsed);
      result = matrixToLinearCombination(matrix, settings.basis);
    }

    const trace = createTrace(records, sourceFamily, settings.target, settings.basis, result, intermediate);
    trace.forEach((step) => relationsUsed.add(step.relationId));
    const output = {
      sourceFamily,
      target: settings.target,
      basis: settings.basis,
      result,
      trace,
      relationsUsed: [...relationsUsed].sort(),
      warnings,
      metadata: {
        rank: settings.rank,
        type: 'A',
        parameter: CONVENTION.parameter,
        t: CONVENTION.t,
        delta: CONVENTION.delta,
        convention: CONVENTION.id,
        wordOrder: 'left-to-right-product',
        matrix
      }
    };
    calculationCache.set(cacheKey, output);
    return settings.includeTrace ? output : { ...output, trace: [] };
  }

  function serializeCalculation(calculation) {
    if (!calculation) return null;
    return {
      sourceFamily: calculation.sourceFamily,
      target: calculation.target,
      basis: calculation.basis,
      convention: calculation.metadata.convention,
      parameter: calculation.metadata.parameter,
      t: calculation.metadata.t,
      delta: calculation.metadata.delta,
      rank: calculation.metadata.rank,
      wordOrder: calculation.metadata.wordOrder,
      result: calculation.result.toJSON(),
      trace: calculation.trace.map((step) => ({ ...step })),
      relationsUsed: calculation.relationsUsed.slice(),
      warnings: calculation.warnings.slice(),
      matrix: calculation.metadata.matrix ? matrixToJSON(calculation.metadata.matrix) : null
    };
  }

  function clearCalculationCache() {
    calculationCache.clear();
  }

  const conversionRegistry = Object.freeze({
    braid_to_symmetric: { source: 'braid', target: 'symmetric', outputBasis: 'permutation', linear: false },
    braid_to_hecke: { source: 'braid', target: 'hecke', outputBasis: 'standard', linear: true },
    braid_to_tl: { source: 'braid', target: 'tl', outputBasis: 'diagram', linear: true },
    braid_to_burau: { source: 'braid', target: 'burau', outputBasis: 'matrix-unit', linear: true },
    hecke_to_tl: { source: 'hecke', target: 'tl', outputBasis: 'diagram', linear: true },
    hecke_standard_to_kl: { source: 'hecke-standard', target: 'hecke', outputBasis: 'kl', linear: true },
    kl_to_hecke_standard: { source: 'kl', target: 'hecke', outputBasis: 'standard', linear: true },
    kl_to_tl: { source: 'kl', target: 'tl', outputBasis: 'diagram', linear: true },
    tl_to_burau: { source: 'tl', target: 'burau', outputBasis: 'matrix-unit', linear: true }
  });

  const api = {
    SUPPORTED_FAMILIES,
    TARGET_BASES,
    DEFAULT_BASES,
    conversionRegistry,
    normalizeRecord,
    normalizeWord,
    detectSourceFamily,
    toHeckeStandard,
    toTl,
    evaluateSymmetric,
    freelyReduceBraid,
    sourceWordLatex,
    mappedWordLatex,
    formatLinearCombinationLatex,
    formatLinearCombinationPlain,
    formatAlignedTrace,
    formatMatrixLatex,
    relationLatex: annotationForRelation,
    calculateStrandWord,
    serializeCalculation,
    clearCalculationCache
  };
  return api;
});
