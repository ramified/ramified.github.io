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
    evaluateReducedBurauWord,
    evaluateTlCombinationMatrix,
    evaluateTlCombinationLinkStateMatrix,
    identityMatrix,
    matrixToLinearCombination,
    matrixToJSON
  } = math;

  const SUPPORTED_FAMILIES = new Set(['coxeter', 'braid', 'hecke', 'kl', 'tl']);
  const SYMMETRIC_PRESENTATIONS = Object.freeze([
    'composition',
    'transpositions',
    'cycle',
    'one-line',
    'two-line',
    'matrix'
  ]);
  const TARGET_BASES = Object.freeze({
    symmetric: ['permutation', ...SYMMETRIC_PRESENTATIONS],
    braid: ['freely-reduced-word'],
    hecke: ['standard', 'kl'],
    tl: ['diagram'],
    burau: ['link-state', 'matrix-unit', 'vector']
  });
  const DEFAULT_BASES = Object.freeze({
    symmetric: 'permutation',
    braid: 'freely-reduced-word',
    hecke: 'standard',
    tl: 'diagram',
    burau: 'link-state'
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
    if (target === 'burau' && basis === 'link-state' && rank < 2) {
      throw new CalculationError('invalid-rank', 'The Burau link-state basis requires at least two strands.');
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

  function mappedWordLatex(records, sourceFamily, target, basis) {
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
      if (target === 'burau') return `${basis === 'link-state' ? '\\bar\\rho' : '\\rho'}(${sourceWordLatex([record])})`;
      return sourceWordLatex([record]);
    }).join('');
  }

  function relationForConversion(sourceFamily, target, basis) {
    if (sourceFamily === 'identity') return 'identity';
    if (target === 'symmetric') return sourceFamily === 'braid' ? 'braid-to-symmetric' : 'coxeter-multiplication';
    if (target === 'braid') return 'braid-free-cancellation';
    if (target === 'hecke') {
      if (sourceFamily === 'kl') return 'kl-generator-expansion';
      return sourceFamily === 'hecke' ? 'hecke-multiplication' : 'braid-to-hecke';
    }
    if (target === 'tl') return sourceFamily === 'kl' ? 'kl-through-hecke-to-tl' : `${sourceFamily}-to-tl`;
    if (target === 'burau') {
      if (sourceFamily === 'braid') return basis === 'link-state' ? 'reduced-burau-generator' : 'burau-generator';
      return basis === 'link-state' ? 'tl-to-reduced-burau' : 'tl-to-burau';
    }
    return 'basis-expansion';
  }

  function annotationForRelation(relationId) {
    const annotations = {
      identity: '\\text{identity}',
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
      'reduced-burau-generator': '\\bar\\rho(\\sigma_i)=I-v\\pi(e_i)',
      'reduced-burau-inverse-generator': '\\bar\\rho(\\sigma_i^{-1})=I-v^{-1}\\pi(e_i)',
      'tl-to-burau': 'e_i=v^{-1}(I-\\rho(\\sigma_i))',
      'tl-to-reduced-burau': '\\bar\\rho(\\sigma_i)=I-v\\pi(e_i)',
      'hecke-length-increase': 'H_wH_i=H_{ws_i}\\quad(\\ell(ws_i)>\\ell(w))',
      'hecke-length-decrease': 'H_wH_i=H_{ws_i}+(v^{-1}-v)H_w\\quad(\\ell(ws_i)<\\ell(w))',
      'hecke-multiplication': '\\text{Hecke multiplication}',
      'hecke-to-tl': 'H_i=v^{-1}-e_i',
      'hecke-inverse': 'H_i^{-1}=H_i+v-v^{-1}',
      'tl-diagram-stacking': 'D_1D_2=\\delta^kD',
      'tl-loop-removal': '\\text{each closed loop contributes }\\delta=v+v^{-1}',
      'standard-basis-expansion': '\\text{standard Hecke basis}',
      'kl-basis-change': '\\text{KL canonical basis}',
      'tl-diagram-basis': '\\text{canonical TL diagram basis}',
      'permutation-basis': '\\text{permutation basis}',
      'permutation-composition': '\\text{deterministic reduced composition word}',
      'permutation-transpositions': '\\text{adjacent-transposition expression}',
      'permutation-cycle': '\\text{disjoint-cycle notation}',
      'permutation-one-line': '\\text{one-line notation}',
      'permutation-two-line': '\\text{two-line notation}',
      'permutation-matrix': '\\text{permutation-matrix notation}',
      'matrix-unit-basis': '\\text{matrix-unit basis}',
      'vector-basis': '\\text{standard vector basis}',
      'link-state-basis': '\\text{link-state basis of }W_{n,n-2}',
      'braid-word-result': '\\text{freely reduced; not canonical}'
    };
    return annotations[relationId] || `\\text{${relationId.replace(/-/g, ' ')}}`;
  }

  function finalRelation(target, basis) {
    if (target === 'symmetric') {
      return SYMMETRIC_PRESENTATIONS.includes(basis) ? `permutation-${basis}` : 'permutation-basis';
    }
    if (target === 'braid') return 'braid-word-result';
    if (target === 'hecke') return basis === 'kl' ? 'kl-basis-change' : 'standard-basis-expansion';
    if (target === 'tl') return 'tl-diagram-basis';
    if (basis === 'link-state') return 'link-state-basis';
    return basis === 'vector' ? 'vector-basis' : 'matrix-unit-basis';
  }

  function semanticWord(records, sourceFamily) {
    return {
      kind: 'word',
      family: sourceFamily,
      records: records.map((record) => ({ ...record }))
    };
  }

  function semanticMappedProduct(records, sourceFamily, target) {
    return {
      kind: 'mapped-product',
      sourceFamily,
      target,
      records: records.map((record) => ({ ...record }))
    };
  }

  function semanticLinearCombination(combination, basis) {
    return {
      kind: 'linear-combination',
      basis,
      value: combination.toJSON()
    };
  }

  function createTrace(records, sourceFamily, target, basis, result, intermediate) {
    const relationId = relationForConversion(sourceFamily, target, basis);
    const trace = [{
      lhsLatex: sourceWordLatex(records),
      rhsLatex: mappedWordLatex(records, sourceFamily, target, basis),
      relationId,
      annotationLatex: annotationForRelation(relationId),
      semantic: {
        lhs: semanticWord(records, sourceFamily),
        rhs: semanticMappedProduct(records, sourceFamily, target)
      }
    }];
    if (intermediate) {
      trace.push({
        rhsLatex: formatLinearCombinationLatex(intermediate, 'standard'),
        relationId: 'standard-basis-expansion',
        annotationLatex: annotationForRelation('standard-basis-expansion'),
        semantic: {
          rhs: semanticLinearCombination(intermediate, 'standard')
        }
      });
    }
    const lastRelation = finalRelation(target, basis);
    trace.push({
      rhsLatex: formatLinearCombinationLatex(result, basis),
      relationId: lastRelation,
      annotationLatex: annotationForRelation(lastRelation),
      final: true,
      semantic: {
        rhs: semanticLinearCombination(result, basis)
      }
    });
    return trace;
  }

  function permutationCycles(values) {
    const visited = new Set();
    const cycles = [];
    values.forEach((_, offset) => {
      const start = offset + 1;
      if (visited.has(start)) return;
      const cycle = [];
      let current = start;
      while (!visited.has(current)) {
        visited.add(current);
        cycle.push(current);
        current = values[current - 1];
      }
      if (cycle.length > 1) cycles.push(cycle);
    });
    return cycles;
  }

  function compactCycleLatex(entries) {
    const compact = entries.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 10);
    return compact ? `(${entries.join('')})` : `(${entries.join('\\,')})`;
  }

  function compactCyclePlain(entries) {
    const compact = entries.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < 10);
    return compact ? `(${entries.join('')})` : `(${entries.join(' ')})`;
  }

  function permutationMatrixRows(values, plain) {
    return values.map((_, rowIndex) => values.map((image) => {
      const entry = image === rowIndex + 1 ? '1' : plain ? '0' : '';
      return entry;
    }));
  }

  function formatPermutationBasisLatex(basis, presentation) {
    const values = basis.values || [];
    if (presentation === 'composition') {
      const word = reducedWord(values);
      return word.length ? word.map((index) => `s_{${index}}`).join('\\,') : 'e';
    }
    if (presentation === 'transpositions') {
      const word = reducedWord(values);
      return word.length ? word.map((index) => compactCycleLatex([index, index + 1])).join('') : 'e';
    }
    if (presentation === 'cycle') {
      const cycles = permutationCycles(values);
      return cycles.length ? cycles.map(compactCycleLatex).join('') : '()';
    }
    if (presentation === 'one-line') return `(${values.join(',')})`;
    if (presentation === 'two-line') {
      const top = values.map((_, index) => index + 1).join('&');
      return `\\begin{pmatrix}${top}\\\\${values.join('&')}\\end{pmatrix}`;
    }
    if (presentation === 'matrix') {
      const body = permutationMatrixRows(values, false).map((row) => row.join('&')).join('\\\\');
      return values.length >= 8
        ? `\\left(\\begin{smallmatrix}${body}\\end{smallmatrix}\\right)`
        : `\\begin{pmatrix}${body}\\end{pmatrix}`;
    }
    return `[${values.join(',')}]`;
  }

  function formatPermutationBasisPlain(basis, presentation) {
    const values = basis.values || [];
    if (presentation === 'composition') {
      const word = reducedWord(values);
      return word.length ? word.map((index) => `s_${index}`).join(' ') : 'e';
    }
    if (presentation === 'transpositions') {
      const word = reducedWord(values);
      return word.length ? word.map((index) => compactCyclePlain([index, index + 1])).join('') : 'e';
    }
    if (presentation === 'cycle') {
      const cycles = permutationCycles(values);
      return cycles.length ? cycles.map(compactCyclePlain).join('') : '()';
    }
    if (presentation === 'one-line') return `(${values.join(',')})`;
    if (presentation === 'two-line') return `(${values.map((_, index) => index + 1).join(' ')} / ${values.join(' ')})`;
    if (presentation === 'matrix') {
      return `[${permutationMatrixRows(values, true).map((row) => row.join(' ')).join('; ')}]`;
    }
    return `[${values.join(',')}]`;
  }

  function basisLatex(basis, basisType) {
    if (basisType === 'permutation' || SYMMETRIC_PRESENTATIONS.includes(basisType)) {
      return formatPermutationBasisLatex(basis, basisType);
    }
    if (basisType === 'standard') return `H_{[${basis.values.join(',')}]} `;
    if (basisType === 'kl') return `\\underline{H}_{[${basis.values.join(',')}]}`;
    if (basisType === 'diagram') {
      const pairs = basis.pairs.map(([left, right]) => `${left + 1}\\!-${right + 1}`).join(',');
      return `D_{\\{${pairs}\\}}`;
    }
    if (basisType === 'matrix-unit') return `E_{${basis.row}${basis.column}}`;
    if (basisType === 'link-state') return `L_{${basis.row}}`;
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
    if (basis === 'vector' || basis === 'link-state' || combination.basisType === 'burau-vector' || combination.basisType === 'burau-link-state') {
      const linkState = basis === 'link-state' || combination.basisType === 'burau-link-state';
      const columns = new Map();
      combination.terms.forEach((term) => {
        if (!columns.has(term.basis.column)) columns.set(term.basis.column, []);
        columns.get(term.basis.column).push(term);
      });
      const rows = [...columns].sort(([left], [right]) => left - right).map(([column, terms]) => {
        terms.sort((left, right) => left.basis.row - right.basis.row);
        const expansion = joinSignedLatex(terms.map((term) => polynomialTimesBasisLatex(
          term.coefficient,
          linkState ? `L_{${term.basis.row}}` : `e_{${term.basis.row}}`
        )));
        return `${linkState ? '\\bar\\rho(\\beta)L' : '\\rho(\\beta)e'}_{${column}}=${expansion}`;
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
    if (combination.basisType === 'permutation') {
      return combination.sortedTerms().map((term) => {
        const label = formatPermutationBasisPlain(term.basis, basis);
        if (term.coefficient.equals(LaurentPolynomial.one())) return label;
        if (term.coefficient.equals(LaurentPolynomial.monomial(0, -1n))) return `-${label}`;
        return `${term.coefficient.toString()} ${label}`;
      }).join(' + ').replace(/\+ -/g, '- ') || '0';
    }
    return combination.sortedTerms().map((term) => {
      let label;
      if (basis === 'standard') label = `H_[${term.basis.values.join(',')}]`;
      else if (basis === 'kl') label = `Hbar_[${term.basis.values.join(',')}]`;
      else if (basis === 'diagram') label = `D_{${term.basis.key}}`;
      else if (basis === 'matrix-unit') label = `E_${term.basis.row},${term.basis.column}`;
      else if (basis === 'vector') label = `rho(beta)e_${term.basis.column}:e_${term.basis.row}`;
      else if (basis === 'link-state') label = `rho_bar(beta)L_${term.basis.column}:L_${term.basis.row}`;
      else label = `[${term.basis.values?.join(',') || term.basis.key}]`;
      return `${term.coefficient.toString()} ${label}`;
    }).join(' + ').replace(/\+ -/g, '- ') || '0';
  }

  function formatAlignedTrace(trace) {
    const rows = trace.map((step, index) => {
      const lhs = index === 0 ? step.lhsLatex : '';
      return `${lhs} &=${step.rhsLatex} &&${step.annotationLatex || ''}`;
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
    } else if (sourceFamily === 'identity') {
      matrix = identityMatrix(settings.basis === 'link-state' ? settings.rank - 1 : settings.rank);
      result = matrixToLinearCombination(matrix, settings.basis);
    } else if (sourceFamily === 'braid') {
      matrix = settings.basis === 'link-state'
        ? evaluateReducedBurauWord(settings.rank, records, budget, relationsUsed)
        : evaluateBurauWord(settings.rank, records, budget, relationsUsed);
      result = matrixToLinearCombination(matrix, settings.basis);
    } else {
      const tl = toTl(settings.rank, records, sourceFamily, budget, relationsUsed);
      matrix = settings.basis === 'link-state'
        ? evaluateTlCombinationLinkStateMatrix(tl, settings.rank, budget, relationsUsed)
        : evaluateTlCombinationMatrix(tl, settings.rank, budget, relationsUsed);
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
        matrix,
        matrixRepresentation: settings.basis === 'link-state' ? 'reduced-link-state' : 'unreduced'
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
      matrix: calculation.metadata.matrix ? matrixToJSON(calculation.metadata.matrix) : null,
      matrixRepresentation: calculation.metadata.matrixRepresentation || null
    };
  }

  function clearCalculationCache() {
    calculationCache.clear();
  }

  const conversionRegistry = Object.freeze({
    braid_to_symmetric: { source: 'braid', target: 'symmetric', outputBasis: 'permutation', linear: false },
    braid_to_hecke: { source: 'braid', target: 'hecke', outputBasis: 'standard', linear: true },
    braid_to_tl: { source: 'braid', target: 'tl', outputBasis: 'diagram', linear: true },
    braid_to_burau: { source: 'braid', target: 'burau', outputBasis: 'link-state', linear: true },
    hecke_to_tl: { source: 'hecke', target: 'tl', outputBasis: 'diagram', linear: true },
    hecke_standard_to_kl: { source: 'hecke-standard', target: 'hecke', outputBasis: 'kl', linear: true },
    kl_to_hecke_standard: { source: 'kl', target: 'hecke', outputBasis: 'standard', linear: true },
    kl_to_tl: { source: 'kl', target: 'tl', outputBasis: 'diagram', linear: true },
    tl_to_burau: { source: 'tl', target: 'burau', outputBasis: 'link-state', linear: true }
  });

  const api = {
    SUPPORTED_FAMILIES,
    SYMMETRIC_PRESENTATIONS,
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
    formatPermutationBasisLatex,
    formatPermutationBasisPlain,
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
