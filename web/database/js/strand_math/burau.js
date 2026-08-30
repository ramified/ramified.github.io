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
    V_INVERSE
  } = math;

  function zeroMatrix(rank) {
    return Array.from({ length: rank }, () => Array.from({ length: rank }, () => LaurentPolynomial.zero()));
  }

  function identityMatrix(rank) {
    const out = zeroMatrix(rank);
    for (let index = 0; index < rank; index++) out[index][index] = LaurentPolynomial.one();
    return out;
  }

  function matrixClone(matrix) {
    return matrix.map((row) => row.map((entry) => entry.clone()));
  }

  function matrixAdd(left, right) {
    return left.map((row, rowIndex) => row.map((entry, columnIndex) => entry.add(right[rowIndex][columnIndex])));
  }

  function matrixScale(matrix, coefficient, budget) {
    return matrix.map((row) => row.map((entry) => entry.mul(coefficient, budget)));
  }

  function matrixMultiply(left, right, budget) {
    const rank = left.length;
    const out = zeroMatrix(rank);
    for (let row = 0; row < rank; row++) {
      for (let column = 0; column < rank; column++) {
        let entry = LaurentPolynomial.zero();
        for (let inner = 0; inner < rank; inner++) {
          budget?.tick();
          if (left[row][inner].isZero() || right[inner][column].isZero()) continue;
          entry = entry.add(left[row][inner].mul(right[inner][column], budget));
        }
        out[row][column] = entry;
      }
    }
    return out;
  }

  function matrixEquals(left, right) {
    if (left.length !== right.length) return false;
    return left.every((row, rowIndex) => row.every((entry, columnIndex) => entry.equals(right[rowIndex][columnIndex])));
  }

  function burauGeneratorMatrix(rank, generator, sign) {
    const out = identityMatrix(rank);
    const row = generator - 1;
    const t = LaurentPolynomial.monomial(2, 1n);
    const tInverse = LaurentPolynomial.monomial(-2, 1n);
    if (sign === -1) {
      out[row][row] = LaurentPolynomial.zero();
      out[row][row + 1] = LaurentPolynomial.one();
      out[row + 1][row] = tInverse;
      out[row + 1][row + 1] = LaurentPolynomial.one().sub(tInverse);
    } else {
      out[row][row] = LaurentPolynomial.one().sub(t);
      out[row][row + 1] = t;
      out[row + 1][row] = LaurentPolynomial.one();
      out[row + 1][row + 1] = LaurentPolynomial.zero();
    }
    return out;
  }

  function tlGeneratorMatrix(rank, generator) {
    const out = zeroMatrix(rank);
    const row = generator - 1;
    out[row][row] = V;
    out[row][row + 1] = V.neg();
    out[row + 1][row] = V_INVERSE.neg();
    out[row + 1][row + 1] = V_INVERSE;
    return out;
  }

  function evaluateBurauWord(rank, records, budget, relationsUsed) {
    let out = identityMatrix(rank);
    for (const record of records) {
      out = matrixMultiply(out, burauGeneratorMatrix(rank, record.index, record.sign), budget);
      relationsUsed?.add(record.sign === -1 ? 'burau-inverse-generator' : 'burau-generator');
    }
    return out;
  }

  function evaluateTlDiagramMatrix(diagram, budget) {
    let out = identityMatrix(diagram.rank);
    for (const generator of diagram.word) out = matrixMultiply(out, tlGeneratorMatrix(diagram.rank, generator), budget);
    return out;
  }

  function evaluateTlCombinationMatrix(combination, rank, budget, relationsUsed) {
    let out = zeroMatrix(rank);
    for (const term of combination.terms.values()) {
      const matrix = evaluateTlDiagramMatrix(term.basis, budget);
      out = matrixAdd(out, matrixScale(matrix, term.coefficient, budget));
    }
    relationsUsed?.add('tl-to-burau');
    return out;
  }

  function matrixToLinearCombination(matrix, basis) {
    const basisType = basis === 'vector' ? 'burau-vector' : 'matrix-unit';
    const out = new LinearCombination(basisType);
    for (let row = 0; row < matrix.length; row++) {
      for (let column = 0; column < matrix.length; column++) {
        if (matrix[row][column].isZero()) continue;
        out.addTerm({
          key: basis === 'vector' ? `${column + 1}:${row + 1}` : `${row + 1}:${column + 1}`,
          row: row + 1,
          column: column + 1
        }, matrix[row][column]);
      }
    }
    return out;
  }

  function matrixToJSON(matrix) {
    return matrix.map((row) => row.map((entry) => entry.toJSON()));
  }

  return {
    zeroMatrix,
    identityMatrix,
    matrixClone,
    matrixAdd,
    matrixScale,
    matrixMultiply,
    matrixEquals,
    burauGeneratorMatrix,
    tlGeneratorMatrix,
    evaluateBurauWord,
    evaluateTlDiagramMatrix,
    evaluateTlCombinationMatrix,
    matrixToLinearCombination,
    matrixToJSON
  };
});
