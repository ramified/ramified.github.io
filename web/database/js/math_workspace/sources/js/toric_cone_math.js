(function toricConeMathModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ToricConeMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createToricConeMath() {
  "use strict";

  const DEFAULT_LIMITS = Object.freeze({
    maxGenerators: 32,
    maxCones: 128,
    maxFaces: 4096,
    maxCandidates: 500000,
  });

  class ComplexityError extends Error {
    constructor(message) {
      super(message);
      this.name = "ComplexityError";
    }
  }

  function absBigInt(value) {
    return value < 0n ? -value : value;
  }

  function gcdBigInt(left, right) {
    let a = absBigInt(left);
    let b = absBigInt(right);
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function lcmBigInt(left, right) {
    if (left === 0n || right === 0n) return 0n;
    return absBigInt((left / gcdBigInt(left, right)) * right);
  }

  class Rational {
    constructor(numerator = 0n, denominator = 1n) {
      let num = typeof numerator === "bigint" ? numerator : BigInt(numerator);
      let den = typeof denominator === "bigint" ? denominator : BigInt(denominator);
      if (den === 0n) throw new Error("Rational denominator cannot be zero.");
      if (num === 0n) {
        this.num = 0n;
        this.den = 1n;
        return;
      }
      if (den < 0n) {
        num = -num;
        den = -den;
      }
      const divisor = gcdBigInt(num, den);
      this.num = num / divisor;
      this.den = den / divisor;
    }

    static from(value) {
      if (value instanceof Rational) return value;
      if (typeof value === "bigint") return new Rational(value);
      return parseRational(value);
    }

    add(value) {
      const other = Rational.from(value);
      return new Rational(this.num * other.den + other.num * this.den, this.den * other.den);
    }

    sub(value) {
      const other = Rational.from(value);
      return new Rational(this.num * other.den - other.num * this.den, this.den * other.den);
    }

    mul(value) {
      const other = Rational.from(value);
      return new Rational(this.num * other.num, this.den * other.den);
    }

    div(value) {
      const other = Rational.from(value);
      if (other.num === 0n) throw new Error("Division by zero.");
      return new Rational(this.num * other.den, this.den * other.num);
    }

    neg() { return new Rational(-this.num, this.den); }
    isZero() { return this.num === 0n; }
    sign() { return this.num < 0n ? -1 : this.num > 0n ? 1 : 0; }
    equals(value) {
      const other = Rational.from(value);
      return this.num === other.num && this.den === other.den;
    }
    toNumber() { return Number(this.num) / Number(this.den); }
    toString() { return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`; }
  }

  function pow10(exponent) {
    let result = 1n;
    for (let index = 0; index < exponent; index += 1) result *= 10n;
    return result;
  }

  function parseRational(value) {
    if (value instanceof Rational) return value;
    if (typeof value === "bigint") return new Rational(value);
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Coordinate must be finite.");
      value = String(value);
    }
    const text = String(value ?? "").trim();
    if (!text) throw new Error("Coordinate is empty.");
    const fraction = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/);
    if (fraction) return parseDecimalRational(fraction[1]).div(parseDecimalRational(fraction[2]));
    return parseDecimalRational(text);
  }

  function parseDecimalRational(text) {
    const match = String(text).trim().match(/^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
    if (!match || (!match[2] && !match[3])) throw new Error(`Invalid rational coordinate: ${text}.`);
    const sign = match[1] === "-" ? -1n : 1n;
    const whole = match[2] || "0";
    const fraction = match[3] || "";
    const exponent = Number(match[4] || 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) throw new Error("Coordinate exponent is too large.");
    let numerator = sign * BigInt(`${whole}${fraction}` || "0");
    let denominator = pow10(fraction.length);
    if (exponent >= 0) numerator *= pow10(exponent);
    else denominator *= pow10(-exponent);
    return new Rational(numerator, denominator);
  }

  function primitiveVector(coordinates, dimension) {
    if (!Array.isArray(coordinates) || coordinates.length !== dimension) {
      throw new Error(`Generator needs exactly ${dimension} coordinates.`);
    }
    const rationals = coordinates.map(parseRational);
    let commonDenominator = 1n;
    rationals.forEach((entry) => { commonDenominator = lcmBigInt(commonDenominator, entry.den); });
    let integers = rationals.map((entry) => entry.num * (commonDenominator / entry.den));
    let divisor = 0n;
    integers.forEach((entry) => { divisor = gcdBigInt(divisor, entry); });
    const zero = divisor === 0n;
    if (!zero) integers = integers.map((entry) => entry / divisor);
    return {
      zero,
      integers,
      exact: integers.map((entry) => entry.toString()),
      numeric: integers.map(Number),
      key: integers.join(","),
    };
  }

  function zeroRational() { return new Rational(0n); }
  function oneRational() { return new Rational(1n); }
  function rationalMatrix(matrix) { return matrix.map((row) => row.map(Rational.from)); }

  function rref(input, columnCount = input[0]?.length || 0) {
    const matrix = rationalMatrix(input);
    const rowCount = matrix.length;
    let pivotRow = 0;
    const pivots = [];
    for (let column = 0; column < columnCount && pivotRow < rowCount; column += 1) {
      let selected = pivotRow;
      while (selected < rowCount && matrix[selected][column].isZero()) selected += 1;
      if (selected >= rowCount) continue;
      if (selected !== pivotRow) [matrix[selected], matrix[pivotRow]] = [matrix[pivotRow], matrix[selected]];
      const pivot = matrix[pivotRow][column];
      for (let col = 0; col < columnCount; col += 1) matrix[pivotRow][col] = matrix[pivotRow][col].div(pivot);
      for (let row = 0; row < rowCount; row += 1) {
        if (row === pivotRow) continue;
        const factor = matrix[row][column];
        if (factor.isZero()) continue;
        for (let col = 0; col < columnCount; col += 1) {
          matrix[row][col] = matrix[row][col].sub(factor.mul(matrix[pivotRow][col]));
        }
      }
      pivots.push(column);
      pivotRow += 1;
    }
    return { matrix, pivots, rank: pivots.length };
  }

  function matrixRank(input, columnCount = input[0]?.length || 0) {
    return rref(input, columnCount).rank;
  }

  function solveLinear(matrixInput, rhsInput, variableCount = matrixInput[0]?.length || 0) {
    const rowCount = matrixInput.length;
    if (!rowCount) {
      return {
        consistent: true,
        rank: 0,
        pivots: [],
        particular: Array.from({ length: variableCount }, zeroRational),
        nullity: variableCount,
      };
    }
    const augmented = matrixInput.map((row, index) => [
      ...row.map(Rational.from),
      Rational.from(rhsInput[index] ?? 0),
    ]);
    const reduced = rref(augmented, variableCount + 1);
    for (const row of reduced.matrix) {
      const leftZero = row.slice(0, variableCount).every((entry) => entry.isZero());
      if (leftZero && !row[variableCount].isZero()) return { consistent: false };
    }
    const pivots = reduced.pivots.filter((column) => column < variableCount);
    const particular = Array.from({ length: variableCount }, zeroRational);
    pivots.forEach((column, row) => { particular[column] = reduced.matrix[row][variableCount]; });
    return {
      consistent: true,
      rank: pivots.length,
      pivots,
      particular,
      nullity: variableCount - pivots.length,
    };
  }

  function nullspace(matrixInput, variableCount = matrixInput[0]?.length || 0) {
    if (!matrixInput.length) {
      return Array.from({ length: variableCount }, (_, index) =>
        Array.from({ length: variableCount }, (_, column) => new Rational(index === column ? 1n : 0n))
      );
    }
    const reduced = rref(matrixInput, variableCount);
    const pivotSet = new Set(reduced.pivots);
    const free = [];
    for (let column = 0; column < variableCount; column += 1) if (!pivotSet.has(column)) free.push(column);
    return free.map((freeColumn) => {
      const vector = Array.from({ length: variableCount }, zeroRational);
      vector[freeColumn] = oneRational();
      reduced.pivots.forEach((pivotColumn, row) => {
        vector[pivotColumn] = reduced.matrix[row][freeColumn].neg();
      });
      return vector;
    });
  }

  function dotRational(left, right) {
    let total = zeroRational();
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      total = total.add(Rational.from(left[index]).mul(right[index]));
    }
    return total;
  }

  function transpose(matrix, columnCount = matrix[0]?.length || 0) {
    return Array.from({ length: columnCount }, (_, column) => matrix.map((row) => row[column]));
  }

  function selectIndependentBasis(vectors, dimension) {
    const basis = [];
    let rank = 0;
    for (const vector of vectors) {
      const candidate = [...basis, vector];
      const nextRank = matrixRank(candidate, dimension);
      if (nextRank > rank) {
        basis.push(vector);
        rank = nextRank;
      }
    }
    return basis;
  }

  function coordinatesInBasis(vector, basis, ambientDimension) {
    const dimension = basis.length;
    if (!dimension) return [];
    const matrix = Array.from({ length: ambientDimension }, (_, row) => basis.map((entry) => entry[row]));
    const solved = solveLinear(matrix, vector, dimension);
    if (!solved.consistent) throw new Error("Generator is outside its computed span.");
    return solved.particular;
  }

  function makeBudget(limits) {
    return {
      candidates: 0,
      tick(count = 1) {
        this.candidates += count;
        if (this.candidates > limits.maxCandidates) {
          throw new ComplexityError(`Exact cone analysis exceeded ${limits.maxCandidates.toLocaleString()} candidate checks.`);
        }
      },
    };
  }

  function forEachCombination(count, size, budget, callback) {
    if (size < 0 || size > count) return false;
    if (size === 0) {
      budget.tick();
      return callback([]) === true;
    }
    const choice = [];
    function visit(start) {
      if (choice.length === size) {
        budget.tick();
        return callback(choice.slice()) === true;
      }
      const remaining = size - choice.length;
      for (let index = start; index <= count - remaining; index += 1) {
        choice.push(index);
        if (visit(index + 1)) return true;
        choice.pop();
      }
      return false;
    }
    return visit(0);
  }

  function isNonnegative(vector) {
    return vector.every((entry) => Rational.from(entry).sign() >= 0);
  }

  function findPositiveDependence(relativeVectors, dimension, budget) {
    const count = relativeVectors.length;
    for (let size = 2; size <= Math.min(dimension + 1, count); size += 1) {
      let witness = null;
      forEachCombination(count, size, budget, (indices) => {
        const matrix = Array.from({ length: dimension + 1 }, (_, row) =>
          indices.map((index) => row < dimension ? relativeVectors[index][row] : oneRational())
        );
        if (matrixRank(matrix, size) !== size) return false;
        const solved = solveLinear(matrix, [...Array(dimension).fill(0), 1], size);
        if (solved.consistent && isNonnegative(solved.particular)) {
          witness = indices;
          return true;
        }
        return false;
      });
      if (witness) return witness;
    }
    return null;
  }

  function conicCombinationWitness(targetIndex, vectors, dimension, budget) {
    const others = vectors.map((vector, index) => ({ vector, index })).filter((entry) => entry.index !== targetIndex);
    const target = vectors[targetIndex];
    for (let size = 1; size <= Math.min(dimension, others.length); size += 1) {
      let witness = null;
      forEachCombination(others.length, size, budget, (selection) => {
        const chosen = selection.map((index) => others[index]);
        const matrix = Array.from({ length: dimension }, (_, row) => chosen.map((entry) => entry.vector[row]));
        if (matrixRank(matrix, size) !== size) return false;
        const solved = solveLinear(matrix, target, size);
        if (solved.consistent && isNonnegative(solved.particular)) {
          witness = chosen.map((entry) => entry.index);
          return true;
        }
        return false;
      });
      if (witness) return witness;
    }
    return null;
  }

  function canonicalIntegerVector(vector) {
    let denominator = 1n;
    vector.forEach((entry) => { denominator = lcmBigInt(denominator, Rational.from(entry).den); });
    let values = vector.map((entry) => {
      const value = Rational.from(entry);
      return value.num * (denominator / value.den);
    });
    let divisor = 0n;
    values.forEach((entry) => { divisor = gcdBigInt(divisor, entry); });
    if (divisor) values = values.map((entry) => entry / divisor);
    const first = values.find((entry) => entry !== 0n) || 1n;
    if (first < 0n) values = values.map((entry) => -entry);
    return values;
  }

  function negateVector(vector) {
    return vector.map((entry) => Rational.from(entry).neg());
  }

  function enumerateFacets(relativeRays, dimension, budget) {
    if (dimension === 0) return [];
    if (dimension === 1) {
      const coordinate = Rational.from(relativeRays[0][0]);
      return [{ rayIndices: [], normal: [new Rational(coordinate.sign() >= 0 ? 1n : -1n)] }];
    }
    const facets = new Map();
    forEachCombination(relativeRays.length, dimension - 1, budget, (indices) => {
      const selected = indices.map((index) => relativeRays[index]);
      if (matrixRank(selected, dimension) !== dimension - 1) return false;
      const kernel = nullspace(selected, dimension);
      if (kernel.length !== 1) return false;
      let normal = kernel[0];
      let values = relativeRays.map((ray) => dotRational(normal, ray));
      const hasPositive = values.some((entry) => entry.sign() > 0);
      const hasNegative = values.some((entry) => entry.sign() < 0);
      if (hasPositive && hasNegative) return false;
      if (!hasPositive && !hasNegative) return false;
      if (hasNegative) {
        normal = negateVector(normal);
        values = values.map((entry) => entry.neg());
      }
      const rayIndices = [];
      values.forEach((entry, index) => { if (entry.isZero()) rayIndices.push(index); });
      if (matrixRank(rayIndices.map((index) => relativeRays[index]), dimension) !== dimension - 1) return false;
      const key = rayIndices.join(",");
      if (!facets.has(key)) {
        const primitive = canonicalIntegerVector(normal);
        const oriented = dotRational(primitive, relativeRays.find((ray) => dotRational(primitive, ray).sign() !== 0) || relativeRays[0]).sign() < 0
          ? primitive.map((entry) => -entry)
          : primitive;
        facets.set(key, { rayIndices, normal: oriented.map((entry) => new Rational(entry)) });
      }
      return false;
    });
    return Array.from(facets.values());
  }

  function intersectSorted(left, right) {
    const rightSet = new Set(right);
    return left.filter((entry) => rightSet.has(entry));
  }

  function enumerateFaces(rayCount, facets, relativeRays, dimension, limits) {
    const full = Array.from({ length: rayCount }, (_, index) => index);
    const byKey = new Map();
    const addFace = (indices) => {
      const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
      const key = sorted.join(",");
      if (byKey.has(key)) return false;
      if (byKey.size >= limits.maxFaces) throw new ComplexityError(`Cone face lattice exceeded ${limits.maxFaces.toLocaleString()} faces.`);
      byKey.set(key, sorted);
      return true;
    };
    addFace([]);
    addFace(full);
    facets.forEach((facet) => addFace(facet.rayIndices));
    let changed = true;
    while (changed) {
      changed = false;
      const current = Array.from(byKey.values());
      for (const face of current) {
        for (const facet of facets) {
          if (addFace(intersectSorted(face, facet.rayIndices))) changed = true;
        }
      }
    }
    return Array.from(byKey.values()).map((rayIndices) => ({
      rayIndices,
      dimension: rayIndices.length ? matrixRank(rayIndices.map((index) => relativeRays[index]), dimension) : 0,
    })).sort((left, right) => left.dimension - right.dimension || left.rayIndices.length - right.rayIndices.length || left.rayIndices.join(",").localeCompare(right.rayIndices.join(",")));
  }

  function determinantBigInt(input) {
    const size = input.length;
    if (!size) return 1n;
    const matrix = input.map((row) => row.map((entry) => BigInt(entry)));
    let sign = 1n;
    let previous = 1n;
    for (let pivotIndex = 0; pivotIndex < size - 1; pivotIndex += 1) {
      let pivotRow = pivotIndex;
      while (pivotRow < size && matrix[pivotRow][pivotIndex] === 0n) pivotRow += 1;
      if (pivotRow >= size) return 0n;
      if (pivotRow !== pivotIndex) {
        [matrix[pivotRow], matrix[pivotIndex]] = [matrix[pivotIndex], matrix[pivotRow]];
        sign = -sign;
      }
      const pivot = matrix[pivotIndex][pivotIndex];
      for (let row = pivotIndex + 1; row < size; row += 1) {
        for (let column = pivotIndex + 1; column < size; column += 1) {
          matrix[row][column] = (matrix[row][column] * pivot - matrix[row][pivotIndex] * matrix[pivotIndex][column]) / previous;
        }
      }
      previous = pivot;
      if (previous === 0n) return 0n;
    }
    return sign * matrix[size - 1][size - 1];
  }

  function gcdMaximalMinors(rays, ambientDimension, faceDimension, budget) {
    if (faceDimension === 0) return 1n;
    let divisor = 0n;
    forEachCombination(ambientDimension, faceDimension, budget, (rows) => {
      const minor = rows.map((row) => rays.map((ray) => ray[row]));
      divisor = gcdBigInt(divisor, determinantBigInt(minor));
      return divisor === 1n;
    });
    return absBigInt(divisor);
  }

  function cloneBigIntMatrix(matrix) {
    return matrix.map((row) => row.map((entry) => BigInt(entry)));
  }

  function identityBigInt(size) {
    return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => row === column ? 1n : 0n));
  }

  function swapRows(matrix, left, right) {
    if (left !== right) [matrix[left], matrix[right]] = [matrix[right], matrix[left]];
  }

  function swapColumns(matrix, left, right) {
    if (left === right) return;
    matrix.forEach((row) => { [row[left], row[right]] = [row[right], row[left]]; });
  }

  function addRow(matrix, target, source, factor) {
    if (factor === 0n) return;
    for (let column = 0; column < matrix[target].length; column += 1) matrix[target][column] += factor * matrix[source][column];
  }

  function addColumn(matrix, target, source, factor) {
    if (factor === 0n) return;
    matrix.forEach((row) => { row[target] += factor * row[source]; });
  }

  function negateRow(matrix, row) {
    for (let column = 0; column < matrix[row].length; column += 1) matrix[row][column] = -matrix[row][column];
  }

  function smithNormalForm(input, columnCount = input[0]?.length || 0) {
    const rows = input.length;
    const columns = columnCount;
    const matrix = rows ? cloneBigIntMatrix(input) : [];
    const left = identityBigInt(rows);
    const right = identityBigInt(columns);
    const rowSwap = (a, b) => { swapRows(matrix, a, b); swapRows(left, a, b); };
    const rowAdd = (target, source, factor) => { addRow(matrix, target, source, factor); addRow(left, target, source, factor); };
    const rowNegate = (row) => { negateRow(matrix, row); negateRow(left, row); };
    let pivotIndex = 0;
    while (pivotIndex < rows && pivotIndex < columns) {
      let pivot = null;
      for (let row = pivotIndex; row < rows; row += 1) {
        for (let column = pivotIndex; column < columns; column += 1) {
          if (matrix[row][column] === 0n) continue;
          if (!pivot || absBigInt(matrix[row][column]) < absBigInt(matrix[pivot.row][pivot.column])) pivot = { row, column };
        }
      }
      if (!pivot) break;
      rowSwap(pivotIndex, pivot.row);
      swapColumns(matrix, pivotIndex, pivot.column);
      swapColumns(right, pivotIndex, pivot.column);
      let reduced = false;
      while (!reduced) {
        let changed = true;
        while (changed) {
          changed = false;
          for (let row = pivotIndex + 1; row < rows; row += 1) {
            const value = matrix[row][pivotIndex];
            if (value === 0n) continue;
            const divisor = matrix[pivotIndex][pivotIndex];
            const quotient = value / divisor;
            rowAdd(row, pivotIndex, -quotient);
            if (matrix[row][pivotIndex] !== 0n && absBigInt(matrix[row][pivotIndex]) < absBigInt(matrix[pivotIndex][pivotIndex])) rowSwap(row, pivotIndex);
            changed = true;
          }
          for (let column = pivotIndex + 1; column < columns; column += 1) {
            const value = matrix[pivotIndex][column];
            if (value === 0n) continue;
            const divisor = matrix[pivotIndex][pivotIndex];
            const quotient = value / divisor;
            addColumn(matrix, column, pivotIndex, -quotient);
            addColumn(right, column, pivotIndex, -quotient);
            if (matrix[pivotIndex][column] !== 0n && absBigInt(matrix[pivotIndex][column]) < absBigInt(matrix[pivotIndex][pivotIndex])) {
              swapColumns(matrix, column, pivotIndex);
              swapColumns(right, column, pivotIndex);
            }
            changed = true;
          }
        }
        let nonDivisible = null;
        const divisor = matrix[pivotIndex][pivotIndex];
        for (let row = pivotIndex + 1; row < rows && !nonDivisible; row += 1) {
          for (let column = pivotIndex + 1; column < columns; column += 1) {
            if (matrix[row][column] % divisor !== 0n) {
              nonDivisible = { row, column };
              break;
            }
          }
        }
        if (!nonDivisible) reduced = true;
        else rowAdd(pivotIndex, nonDivisible.row, 1n);
      }
      if (matrix[pivotIndex][pivotIndex] < 0n) rowNegate(pivotIndex);
      pivotIndex += 1;
    }
    return {
      diagonal: Array.from({ length: Math.min(rows, columns) }, (_, index) => matrix[index][index]),
      left,
      right,
      matrix,
    };
  }

  function formatAbelianGroup(freeRank, torsion) {
    const parts = [];
    if (freeRank === 1) parts.push("Z");
    else if (freeRank > 1) parts.push(`Z^${freeRank}`);
    torsion.forEach((order) => parts.push(`Z/${order}Z`));
    return parts.length ? parts.join(" + ") : "0";
  }

  function classGroup(rayVectors, ambientDimension) {
    if (!rayVectors.length) return { freeRank: 0, torsion: [], display: "0", smithDiagonal: [] };
    const smith = smithNormalForm(rayVectors, ambientDimension);
    const nonzero = smith.diagonal.filter((entry) => entry !== 0n).map(absBigInt);
    const torsion = nonzero.filter((entry) => entry > 1n).map((entry) => entry.toString());
    const freeRank = rayVectors.length - nonzero.length;
    return {
      freeRank,
      torsion,
      display: formatAbelianGroup(freeRank, torsion),
      smithDiagonal: nonzero.map((entry) => entry.toString()),
    };
  }

  function multiplyBigIntMatrixVector(matrix, vector) {
    return matrix.map((row) => row.reduce((total, entry, index) => total + entry * vector[index], 0n));
  }

  function canonicalDivisorAnalysis(rayVectors, ambientDimension) {
    if (!rayVectors.length) {
      return { divisor: "0", qGorenstein: true, gorenstein: true, index: 1, supportVector: Array(ambientDimension).fill("0") };
    }
    const rational = solveLinear(rayVectors, Array(rayVectors.length).fill(1), ambientDimension);
    if (!rational.consistent) {
      return { divisor: rayVectors.map((_, index) => `-D_${index + 1}`).join(" "), qGorenstein: false, gorenstein: false, index: null, supportVector: null };
    }
    const smith = smithNormalForm(rayVectors, ambientDimension);
    const transformed = multiplyBigIntMatrixVector(smith.left, Array(rayVectors.length).fill(1n));
    const rank = smith.diagonal.filter((entry) => entry !== 0n).length;
    for (let index = rank; index < transformed.length; index += 1) {
      if (transformed[index] !== 0n) {
        return { divisor: rayVectors.map((_, ray) => `-D_${ray + 1}`).join(" "), qGorenstein: false, gorenstein: false, index: null, supportVector: null };
      }
    }
    let indexValue = 1n;
    for (let index = 0; index < rank; index += 1) {
      const diagonal = absBigInt(smith.diagonal[index]);
      const needed = diagonal / gcdBigInt(diagonal, transformed[index]);
      indexValue = lcmBigInt(indexValue, needed);
    }
    return {
      divisor: rayVectors.map((_, index) => `-D_${index + 1}`).join(" "),
      qGorenstein: true,
      gorenstein: indexValue === 1n,
      index: Number(indexValue) <= Number.MAX_SAFE_INTEGER ? Number(indexValue) : indexValue.toString(),
      supportVector: rational.particular.map((entry) => entry.toString()),
    };
  }

  function exactVectorToSerializable(vector) {
    return vector.map((entry) => Rational.from(entry).toString());
  }

  function numericVector(vector) {
    return vector.map((entry) => Rational.from(entry).toNumber());
  }

  function exactSlicePoint(x, y) {
    const coordinates = [Rational.from(x), Rational.from(y)];
    return {
      exact: exactVectorToSerializable(coordinates),
      numeric: numericVector(coordinates),
    };
  }

  function slicePointKey(point) {
    return `${Rational.from(point[0]).toString()},${Rational.from(point[1]).toString()}`;
  }

  function cleanExactPolygon(points) {
    const cleaned = [];
    points.forEach((point) => {
      if (!cleaned.length || slicePointKey(cleaned[cleaned.length - 1]) !== slicePointKey(point)) cleaned.push(point);
    });
    if (cleaned.length > 1 && slicePointKey(cleaned[0]) === slicePointKey(cleaned[cleaned.length - 1])) cleaned.pop();
    return cleaned;
  }

  function clipExactPolygon(points, aValue, bValue, cValue, budget = null) {
    if (!points.length) return [];
    const a = Rational.from(aValue);
    const b = Rational.from(bValue);
    const c = Rational.from(cValue);
    const evaluate = (point) => a.mul(point[0]).add(b.mul(point[1])).add(c);
    const result = [];
    for (let index = 0; index < points.length; index += 1) {
      if (budget) budget.tick();
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const startValue = evaluate(start);
      const endValue = evaluate(end);
      const startInside = startValue.sign() >= 0;
      const endInside = endValue.sign() >= 0;
      if (startInside) result.push(start);
      if (startInside === endInside) continue;
      const parameter = startValue.div(startValue.sub(endValue));
      result.push([
        Rational.from(start[0]).add(parameter.mul(Rational.from(end[0]).sub(start[0]))),
        Rational.from(start[1]).add(parameter.mul(Rational.from(end[1]).sub(start[1]))),
      ]);
    }
    return cleanExactPolygon(result);
  }

  function exactPolygonAreaTwice(points) {
    let area = zeroRational();
    for (let index = 0; index < points.length; index += 1) {
      const next = points[(index + 1) % points.length];
      area = area.add(Rational.from(points[index][0]).mul(next[1]).sub(Rational.from(points[index][1]).mul(next[0])));
    }
    return area;
  }

  function farthestExactPair(points) {
    let best = [];
    let bestDistance = zeroRational();
    for (let left = 0; left < points.length; left += 1) {
      for (let right = left + 1; right < points.length; right += 1) {
        const dx = Rational.from(points[left][0]).sub(points[right][0]);
        const dy = Rational.from(points[left][1]).sub(points[right][1]);
        const distance = dx.mul(dx).add(dy.mul(dy));
        if (distance.sub(bestDistance).sign() > 0) {
          bestDistance = distance;
          best = [points[left], points[right]];
        }
      }
    }
    return best;
  }

  function exactSliceRow(normal, position, frame) {
    const rationalNormal = normal.map(Rational.from);
    return {
      a: dotRational(rationalNormal, frame[0]),
      b: dotRational(rationalNormal, frame[1]),
      c: dotRational(rationalNormal, position),
    };
  }

  function sliceCone(analysis, positionInput, frameInput, options = {}) {
    if (!analysis?.valid) return { kind: "empty", exact: true, reason: "invalid-cone" };
    const ambientDimension = analysis.ambientDimension;
    const position = (Array.isArray(positionInput) ? positionInput : []).map(Rational.from);
    const frame = (Array.isArray(frameInput) ? frameInput : []).slice(0, 2).map((vector) =>
      (Array.isArray(vector) ? vector : []).map(Rational.from)
    );
    if (position.length !== ambientDimension || frame.length !== 2 || frame.some((vector) => vector.length !== ambientDimension)) {
      throw new Error(`Toric slice needs one position and two frame vectors in rank ${ambientDimension}.`);
    }
    if (matrixRank(frame, ambientDimension) !== 2) throw new Error("Toric slice frame vectors must be independent.");
    const radius = parseRational(options.clipRadius ?? 4);
    if (radius.sign() <= 0) throw new Error("Toric slice clip radius must be positive.");
    const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
    const budget = makeBudget(limits);
    let polygon = [
      [radius.neg(), radius.neg()],
      [radius, radius.neg()],
      [radius, radius],
      [radius.neg(), radius],
    ];
    const rows = [];
    for (const equation of analysis.hRepresentation?.spanEquations || []) {
      const row = exactSliceRow((equation.normal || []).map(parseRational), position, frame);
      rows.push({ ...row, equality: true });
    }
    for (const inequality of analysis.hRepresentation?.inequalities || []) {
      const row = exactSliceRow((inequality.normalAmbient || []).map(parseRational), position, frame);
      rows.push({ ...row, equality: false });
    }
    for (const row of rows) {
      polygon = clipExactPolygon(polygon, row.a, row.b, row.c, budget);
      if (!polygon.length) return { kind: "empty", exact: true, candidateChecks: budget.candidates };
      if (row.equality) {
        polygon = clipExactPolygon(polygon, row.a.neg(), row.b.neg(), row.c.neg(), budget);
        if (!polygon.length) return { kind: "empty", exact: true, candidateChecks: budget.candidates };
      }
    }
    const unique = [];
    const seen = new Set();
    cleanExactPolygon(polygon).forEach((point) => {
      const key = slicePointKey(point);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(point);
      }
    });
    if (!unique.length) return { kind: "empty", exact: true, candidateChecks: budget.candidates };
    if (unique.length >= 3 && !exactPolygonAreaTwice(unique).isZero()) {
      return { kind: "polygon", exact: true, vertices: unique.map((point) => exactSlicePoint(point[0], point[1])), candidateChecks: budget.candidates };
    }
    const endpoints = farthestExactPair(unique);
    if (endpoints.length === 2 && slicePointKey(endpoints[0]) !== slicePointKey(endpoints[1])) {
      return { kind: "segment", exact: true, vertices: endpoints.map((point) => exactSlicePoint(point[0], point[1])), candidateChecks: budget.candidates };
    }
    return { kind: "point", exact: true, point: exactSlicePoint(unique[0][0], unique[0][1]), candidateChecks: budget.candidates };
  }

  function coordinateFunctionals(basis, ambientDimension) {
    const dimension = basis.length;
    return Array.from({ length: dimension }, (_, coordinate) => {
      const rhs = Array.from({ length: dimension }, (_, index) => index === coordinate ? 1 : 0);
      const solved = solveLinear(basis, rhs, ambientDimension);
      if (!solved.consistent) throw new Error("Could not construct relative coordinate functionals.");
      return solved.particular;
    });
  }

  function ambientFunctional(relativeNormal, functionals, ambientDimension) {
    return Array.from({ length: ambientDimension }, (_, coordinate) => {
      let value = zeroRational();
      relativeNormal.forEach((coefficient, index) => {
        value = value.add(Rational.from(coefficient).mul(functionals[index][coordinate]));
      });
      return value;
    });
  }

  function faceKey(rayIndices, extremeRays) {
    if (!rayIndices.length) return "0";
    return rayIndices.map((index) => extremeRays[index].id).sort().join("|");
  }

  function subset(left, right) {
    const rightSet = new Set(right);
    return left.every((entry) => rightSet.has(entry));
  }

  function analyzeValidCone(normalized, unique, relativeUnique, basis, dimension, ambientDimension, limits, budget) {
    const redundant = new Map();
    for (let index = 0; index < relativeUnique.length; index += 1) {
      const witness = conicCombinationWitness(index, relativeUnique, dimension, budget);
      if (witness) redundant.set(index, witness);
    }
    const extremeUniqueIndices = relativeUnique.map((_, index) => index).filter((index) => !redundant.has(index));
    const extremeRays = extremeUniqueIndices.map((uniqueIndex, index) => ({
      id: unique[uniqueIndex].id,
      label: unique[uniqueIndex].label,
      sourceIndex: unique[uniqueIndex].sourceIndex,
      uniqueIndex,
      rayIndex: index,
      primitive: unique[uniqueIndex].primitive.exact,
      numeric: unique[uniqueIndex].primitive.numeric,
    }));
    const relativeRays = extremeUniqueIndices.map((index) => relativeUnique[index]);
    const facetsRaw = enumerateFacets(relativeRays, dimension, budget);
    const facesRaw = enumerateFaces(extremeRays.length, facetsRaw, relativeRays, dimension, limits);
    const faceDetails = facesRaw.map((face) => {
      const rays = face.rayIndices.map((index) => extremeRays[index].primitive.map(BigInt));
      const simplicial = face.rayIndices.length === face.dimension;
      const multiplicity = simplicial ? gcdMaximalMinors(rays, ambientDimension, face.dimension, budget) : null;
      const smooth = simplicial && multiplicity === 1n;
      return {
        key: faceKey(face.rayIndices, extremeRays),
        dimension: face.dimension,
        codimension: ambientDimension - face.dimension,
        rayIndices: face.rayIndices,
        rayIds: face.rayIndices.map((index) => extremeRays[index].id),
        rayLabels: face.rayIndices.map((index) => extremeRays[index].label),
        simplicial,
        smooth,
        multiplicity: multiplicity == null ? null : multiplicity.toString(),
        orbitDimension: ambientDimension - face.dimension,
      };
    });
    faceDetails.forEach((face) => {
      face.facets = faceDetails.filter((candidate) => candidate.dimension === face.dimension - 1 && subset(candidate.rayIndices, face.rayIndices)).map((candidate) => candidate.key);
      face.cofaces = faceDetails.filter((candidate) => candidate.dimension === face.dimension + 1 && subset(face.rayIndices, candidate.rayIndices)).map((candidate) => candidate.key);
      face.orbitClosureFaceKeys = faceDetails.filter((candidate) => subset(face.rayIndices, candidate.rayIndices)).map((candidate) => candidate.key);
    });
    const faceByKey = new Map(faceDetails.map((face) => [face.key, face]));
    const singularFaces = faceDetails.filter((face) => !face.smooth && face.dimension > 0 && face.facets.every((key) => faceByKey.get(key)?.smooth));
    const fullFace = faceDetails.find((face) => face.dimension === dimension && face.rayIndices.length === extremeRays.length) || faceDetails[faceDetails.length - 1];
    const functionals = coordinateFunctionals(basis.map((vector) => vector.map((entry) => new Rational(entry))), ambientDimension);
    const inequalities = facetsRaw.map((facet, index) => {
      const ambient = ambientFunctional(facet.normal, functionals, ambientDimension);
      return {
        id: `facet-${index + 1}`,
        faceKey: faceKey(facet.rayIndices, extremeRays),
        rayIds: facet.rayIndices.map((rayIndex) => extremeRays[rayIndex].id),
        normalRelative: exactVectorToSerializable(facet.normal),
        normalAmbient: exactVectorToSerializable(ambient),
        normalNumeric: numericVector(ambient),
      };
    });
    const spanEquations = nullspace(basis.map((vector) => vector.map((entry) => new Rational(entry))), ambientDimension).map((normal) => ({
      normal: exactVectorToSerializable(normal),
      numeric: numericVector(normal),
    }));
    const rayVectors = extremeRays.map((ray) => ray.primitive.map(BigInt));
    const divisorClassGroup = classGroup(rayVectors, ambientDimension);
    const canonical = canonicalDivisorAnalysis(rayVectors, ambientDimension);
    let quotientLattice = null;
    if (dimension === ambientDimension && fullFace?.simplicial && !fullFace.smooth) {
      const matrix = Array.from({ length: ambientDimension }, (_, row) => rayVectors.map((ray) => ray[row]));
      const diagonal = smithNormalForm(matrix, ambientDimension).diagonal.map(absBigInt).filter((entry) => entry > 1n).map((entry) => entry.toString());
      quotientLattice = { invariantFactors: diagonal, display: diagonal.length ? diagonal.map((entry) => `Z/${entry}Z`).join(" + ") : "0" };
    }
    const torusVariables = Math.max(0, ambientDimension - dimension);
    const polynomialVariables = dimension;
    let smoothCoordinateRing = null;
    if (fullFace?.smooth) {
      const variables = [];
      if (polynomialVariables === 1) variables.push("x_1");
      else if (polynomialVariables > 1) variables.push(`x_1,...,x_${polynomialVariables}`);
      if (torusVariables === 1) variables.push(`t_${polynomialVariables + 1}^{+/-1}`);
      else if (torusVariables > 1) variables.push(`t_${polynomialVariables + 1}^{+/-1},...,t_${ambientDimension}^{+/-1}`);
      smoothCoordinateRing = variables.length ? `k[${variables.join(", ")}]` : "k";
    }
    return {
      status: "computed",
      valid: true,
      pointed: true,
      dimension,
      codimension: ambientDimension - dimension,
      enteredGeneratorCount: normalized.length,
      uniqueGeneratorCount: unique.length,
      extremeRayCount: extremeRays.length,
      facetCount: facetsRaw.length,
      faceCount: faceDetails.length,
      generators: normalized.map((entry) => ({
        id: entry.id,
        label: entry.label,
        coordinates: entry.coordinates,
        primitive: entry.primitive?.exact || null,
        numeric: entry.primitive?.numeric || null,
        status: entry.error ? "invalid" : entry.primitive.zero ? "zero" : entry.duplicateOf ? "duplicate" : redundant.has(entry.uniqueIndex) ? "redundant" : "extremal",
        duplicateOf: entry.duplicateOf || null,
        redundancyWitness: redundant.has(entry.uniqueIndex) ? redundant.get(entry.uniqueIndex).map((index) => unique[index].id) : [],
        error: entry.error || "",
      })),
      extremeRays,
      facets: inequalities,
      faces: faceDetails,
      selectedFaceDefault: fullFace?.key || "0",
      hRepresentation: { inequalities, spanEquations },
      simplicial: !!fullFace?.simplicial,
      smooth: !!fullFace?.smooth,
      multiplicity: fullFace?.multiplicity ?? null,
      qFactorial: !!fullFace?.simplicial,
      factorial: !!fullFace?.smooth,
      classGroup: divisorClassGroup,
      canonical,
      singularFaceKeys: singularFaces.map((face) => face.key),
      quotientLattice,
      semigroupRing: `k[sigma^vee intersect M]`,
      smoothCoordinateRing,
      torusFactorRank: torusVariables,
      metrics: { candidateChecks: budget.candidates },
      warnings: normalized.filter((entry) => entry.duplicateOf).map((entry) => `${entry.label} duplicates ${entry.duplicateOf}.`).concat(
        Array.from(redundant.entries()).map(([index]) => `${unique[index].label} is a redundant generator, not an extremal ray.`)
      ),
      issues: [],
    };
  }

  function normalizeInputGenerators(rawGenerators, ambientDimension) {
    const normalized = [];
    const uniqueByKey = new Map();
    const unique = [];
    (Array.isArray(rawGenerators) ? rawGenerators : []).forEach((raw, sourceIndex) => {
      const entry = {
        id: String(raw?.id || `generator-${sourceIndex + 1}`),
        label: String(raw?.label || `u_${sourceIndex + 1}`),
        coordinates: Array.isArray(raw?.coordinates) ? raw.coordinates.map((value) => String(value)) : [],
        sourceIndex,
      };
      try {
        entry.primitive = primitiveVector(entry.coordinates, ambientDimension);
        if (!entry.primitive.zero) {
          if (uniqueByKey.has(entry.primitive.key)) {
            entry.duplicateOf = uniqueByKey.get(entry.primitive.key).id;
          } else {
            entry.uniqueIndex = unique.length;
            uniqueByKey.set(entry.primitive.key, entry);
            unique.push(entry);
          }
        }
      } catch (error) {
        entry.error = error.message;
      }
      normalized.push(entry);
    });
    return { normalized, unique };
  }

  function analyzeCone(input = {}, requestedLimits = {}) {
    const ambientDimension = Math.max(2, Math.min(8, Math.round(Number(input.ambientDimension) || 2)));
    const limits = { ...DEFAULT_LIMITS, ...(requestedLimits || {}) };
    const rawGenerators = Array.isArray(input.generators) ? input.generators : [];
    const { normalized, unique } = normalizeInputGenerators(rawGenerators, ambientDimension);
    const basicGenerators = normalized.map((entry) => ({
      id: entry.id,
      label: entry.label,
      coordinates: entry.coordinates,
      primitive: entry.primitive?.exact || null,
      numeric: entry.primitive?.numeric || null,
      status: entry.error ? "invalid" : entry.primitive?.zero ? "zero" : entry.duplicateOf ? "duplicate" : "generator",
      duplicateOf: entry.duplicateOf || null,
      error: entry.error || "",
    }));
    if (rawGenerators.length > limits.maxGenerators) {
      return {
        status: "capped",
        valid: false,
        ambientDimension,
        generators: basicGenerators,
        issues: [`Cone has ${rawGenerators.length} generators; the exact browser limit is ${limits.maxGenerators}.`],
        warnings: [],
      };
    }
    const invalidEntries = normalized.filter((entry) => entry.error || entry.primitive?.zero);
    const budget = makeBudget(limits);
    try {
      const vectors = unique.map((entry) => entry.primitive.integers);
      const basis = selectIndependentBasis(vectors, ambientDimension);
      const dimension = basis.length;
      if (!unique.length) {
        if (invalidEntries.length) {
          return {
            status: "invalid",
            valid: false,
            pointed: true,
            ambientDimension,
            dimension: 0,
            codimension: ambientDimension,
            generators: basicGenerators,
            issues: invalidEntries.map((entry) => entry.error || `${entry.label} is the zero vector, not a ray.`),
            warnings: [],
          };
        }
        return analyzeValidCone(normalized, unique, [], [], 0, ambientDimension, limits, budget);
      }
      const relativeVectors = vectors.map((vector) => coordinatesInBasis(vector, basis, ambientDimension));
      const dependence = findPositiveDependence(relativeVectors, dimension, budget);
      if (invalidEntries.length || dependence) {
        const issues = invalidEntries.map((entry) => entry.error || `${entry.label} is the zero vector, not a ray.`);
        if (dependence) issues.push(`The cone contains a line: ${dependence.map((index) => unique[index].label).join(", ")} have a nonnegative dependence summing to zero.`);
        return {
          status: "invalid",
          valid: false,
          pointed: !dependence,
          ambientDimension,
          dimension,
          codimension: ambientDimension - dimension,
          generators: basicGenerators,
          issues,
          warnings: normalized.filter((entry) => entry.duplicateOf).map((entry) => `${entry.label} duplicates ${entry.duplicateOf}.`),
          metrics: { candidateChecks: budget.candidates },
        };
      }
      return {
        ambientDimension,
        ...analyzeValidCone(normalized, unique, relativeVectors, basis, dimension, ambientDimension, limits, budget),
      };
    } catch (error) {
      if (!(error instanceof ComplexityError)) throw error;
      return {
        status: "capped",
        valid: false,
        ambientDimension,
        generators: basicGenerators,
        issues: [error.message],
        warnings: [],
        metrics: { candidateChecks: budget.candidates },
      };
    }
  }

  function presetGenerators(kind, ambientDimension) {
    const dimension = Math.max(2, Math.min(8, Math.round(Number(ambientDimension) || 2)));
    const generator = (index, coordinates) => ({ id: `generator-${index + 1}`, label: `u_${index + 1}`, coordinates: coordinates.map(String) });
    if (kind === "positive-orthant") {
      return Array.from({ length: dimension }, (_, index) => generator(index, Array.from({ length: dimension }, (_, coordinate) => coordinate === index ? 1 : 0)));
    }
    if (kind === "singular-simplicial") {
      const entries = [
        Array.from({ length: dimension }, (_, index) => index === 0 ? 1 : 0),
        Array.from({ length: dimension }, (_, index) => index === 0 ? 1 : index === 1 ? 2 : 0),
      ];
      for (let index = 2; index < dimension; index += 1) entries.push(Array.from({ length: dimension }, (_, coordinate) => coordinate === index ? 1 : 0));
      return entries.map((coordinates, index) => generator(index, coordinates));
    }
    if (kind === "square-cone" && dimension >= 3) {
      return [
        [1, 1, 1], [-1, 1, 1], [-1, -1, 1], [1, -1, 1],
      ].map((base, index) => generator(index, [...base, ...Array(dimension - 3).fill(0)]));
    }
    return [];
  }

  function primitiveKey(vector) {
    return vector.map((entry) => String(entry)).join(",");
  }

  function sameSet(left, right) {
    if (left.size !== right.size) return false;
    for (const entry of left) if (!right.has(entry)) return false;
    return true;
  }

  function subsetSet(left, right) {
    for (const entry of left) if (!right.has(entry)) return false;
    return true;
  }

  function faceRayKeySet(analysis, face) {
    return new Set((face?.rayIndices || []).map((index) => primitiveKey(analysis.extremeRays[index].primitive)));
  }

  function analysisHasFace(analysis, rayKeys) {
    return (analysis.faces || []).some((face) => sameSet(faceRayKeySet(analysis, face), rayKeys));
  }

  function quotientVector(vector, annihilator) {
    return annihilator.map((functional) => dotRational(functional, vector));
  }

  function conesMeetInSharedFace(left, right, ambientDimension, budget) {
    const leftRays = left.extremeRays.map((ray) => ({ key: primitiveKey(ray.primitive), vector: ray.primitive.map(BigInt) }));
    const rightRays = right.extremeRays.map((ray) => ({ key: primitiveKey(ray.primitive), vector: ray.primitive.map(BigInt) }));
    const rightKeys = new Set(rightRays.map((ray) => ray.key));
    const sharedKeys = new Set(leftRays.filter((ray) => rightKeys.has(ray.key)).map((ray) => ray.key));
    if (!analysisHasFace(left, sharedKeys) || !analysisHasFace(right, sharedKeys)) {
      return { compatible: false, sharedKeys: Array.from(sharedKeys), reason: "shared rays do not form a face of both cones" };
    }
    const sharedVectors = leftRays.filter((ray) => sharedKeys.has(ray.key)).map((ray) => ray.vector);
    const annihilator = nullspace(sharedVectors, ambientDimension);
    const combined = [];
    leftRays.filter((ray) => !sharedKeys.has(ray.key)).forEach((ray) => {
      const quotient = quotientVector(ray.vector, annihilator);
      if (quotient.some((entry) => !entry.isZero())) combined.push(quotient);
    });
    rightRays.filter((ray) => !sharedKeys.has(ray.key)).forEach((ray) => {
      const quotient = quotientVector(ray.vector, annihilator).map((entry) => entry.neg());
      if (quotient.some((entry) => !entry.isZero())) combined.push(quotient);
    });
    if (!combined.length) return { compatible: true, sharedKeys: Array.from(sharedKeys) };
    const quotientDimension = annihilator.length;
    const basis = selectIndependentBasis(combined, quotientDimension);
    const relative = combined.map((vector) => coordinatesInBasis(vector, basis, quotientDimension));
    const dependence = findPositiveDependence(relative, basis.length, budget);
    return dependence
      ? { compatible: false, sharedKeys: Array.from(sharedKeys), reason: "the cone intersection is larger than their shared face" }
      : { compatible: true, sharedKeys: Array.from(sharedKeys) };
  }

  function fanConeFromRays(id, label, rays, indices) {
    return {
      id,
      label,
      generators: indices.map((rayIndex, index) => ({
        id: `${id}-generator-${index + 1}`,
        label: rays[rayIndex].label,
        coordinates: rays[rayIndex].coordinates.slice(),
      })),
    };
  }

  function presetFan(kind, ambientDimension) {
    const dimension = Math.max(2, Math.min(8, Math.round(Number(ambientDimension) || 2)));
    const coordinateRay = (index) => Array.from({ length: dimension }, (_, coordinate) => coordinate === index ? 1 : 0);
    if (kind === "affine-space") {
      const rays = Array.from({ length: dimension }, (_, index) => ({ label: `rho_${index + 1}`, coordinates: coordinateRay(index).map(String) }));
      return [fanConeFromRays("cone-1", "sigma_1", rays, rays.map((_, index) => index))];
    }
    const lastCoordinates = Array.from({ length: dimension }, (_, index) => (
      kind === "weighted-projective-space" && index === dimension - 1 ? -2 : -1
    ));
    const rays = [
      ...Array.from({ length: dimension }, (_, index) => ({ label: `rho_${index + 1}`, coordinates: coordinateRay(index).map(String) })),
      { label: `rho_${dimension + 1}`, coordinates: lastCoordinates.map(String) },
    ];
    return rays.map((_, omitted) => fanConeFromRays(
      `cone-${omitted + 1}`,
      `sigma_${omitted + 1}`,
      rays,
      rays.map((entry, index) => index).filter((index) => index !== omitted)
    ));
  }

  function analyzeFan(input = {}, requestedLimits = {}) {
    const ambientDimension = Math.max(2, Math.min(8, Math.round(Number(input.ambientDimension) || 2)));
    const limits = { ...DEFAULT_LIMITS, ...(requestedLimits || {}) };
    const rawCones = Array.isArray(input.cones) ? input.cones : [];
    if (rawCones.length > limits.maxCones) {
      return {
        status: "capped",
        valid: false,
        ambientDimension,
        issues: [`Fan has ${rawCones.length} entered cones; the exact browser limit is ${limits.maxCones}.`],
        warnings: [],
      };
    }
    const coneAnalyses = rawCones.map((cone, index) => ({
      id: String(cone?.id || `cone-${index + 1}`),
      label: String(cone?.label || `sigma_${index + 1}`),
      sourceId: String(cone?.sourceId || ""),
      analysis: analyzeCone({ ambientDimension, generators: cone?.generators || [] }, limits),
    }));
    const issues = [];
    const warnings = [];
    coneAnalyses.forEach((cone) => {
      if (!cone.analysis.valid) issues.push(`${cone.label}: ${(cone.analysis.issues || [cone.analysis.status]).join(" ")}`);
    });
    if (issues.length) {
      return { status: "invalid", valid: false, ambientDimension, coneCount: rawCones.length, cones: coneAnalyses, issues, warnings };
    }

    const budget = makeBudget(limits);
    try {
      for (let left = 0; left < coneAnalyses.length; left += 1) {
        for (let right = left + 1; right < coneAnalyses.length; right += 1) {
          budget.tick();
          const intersection = conesMeetInSharedFace(coneAnalyses[left].analysis, coneAnalyses[right].analysis, ambientDimension, budget);
          if (!intersection.compatible) {
            issues.push(`${coneAnalyses[left].label} and ${coneAnalyses[right].label} do not meet in a common face: ${intersection.reason}.`);
          }
        }
      }

      const globalRayMap = new Map();
      coneAnalyses.forEach((cone) => cone.analysis.extremeRays.forEach((ray) => {
        const key = primitiveKey(ray.primitive);
        if (!globalRayMap.has(key)) {
          globalRayMap.set(key, {
            key,
            label: ray.label,
            primitive: ray.primitive.slice(),
            numeric: ray.numeric.slice(),
            coneIds: [],
          });
        }
        globalRayMap.get(key).coneIds.push(cone.id);
      }));
      const rays = Array.from(globalRayMap.values()).map((ray, index) => ({ ...ray, rayIndex: index, divisorLabel: `D_${index + 1}` }));
      const rayIndexByKey = new Map(rays.map((ray) => [ray.key, ray.rayIndex]));
      const faceMap = new Map();
      const ensureFace = (rayKeys, dimension, coneId) => {
        const key = rayKeys.slice().sort().join("|") || "0";
        if (!faceMap.has(key)) faceMap.set(key, { key, dimension, rayKeys: rayKeys.slice().sort(), coneIds: [] });
        const face = faceMap.get(key);
        if (coneId && !face.coneIds.includes(coneId)) face.coneIds.push(coneId);
      };
      ensureFace([], 0, "");
      coneAnalyses.forEach((cone) => cone.analysis.faces.forEach((face) => {
        ensureFace(Array.from(faceRayKeySet(cone.analysis, face)), face.dimension, cone.id);
      }));
      if (faceMap.size > limits.maxFaces) throw new ComplexityError(`Fan face lattice exceeded ${limits.maxFaces.toLocaleString()} faces.`);
      const faces = Array.from(faceMap.values()).map((face) => ({
        ...face,
        rayIndices: face.rayKeys.map((key) => rayIndexByKey.get(key)),
        rayLabels: face.rayKeys.map((key) => rays[rayIndexByKey.get(key)]?.label || key),
        orbitDimension: ambientDimension - face.dimension,
      })).sort((left, right) => left.dimension - right.dimension || left.key.localeCompare(right.key));

      const distinctCones = [];
      const seenConeKeys = new Set();
      coneAnalyses.forEach((cone) => {
        const rayKeys = new Set(cone.analysis.extremeRays.map((ray) => primitiveKey(ray.primitive)));
        const key = Array.from(rayKeys).sort().join("|") || "0";
        if (seenConeKeys.has(key)) {
          warnings.push(`${cone.label} duplicates an already selected cone and is ignored in fan counts.`);
          return;
        }
        seenConeKeys.add(key);
        distinctCones.push({ ...cone, key, rayKeys, dimension: cone.analysis.dimension });
      });
      const maximalCones = distinctCones.filter((cone) => !distinctCones.some((candidate) => (
        candidate !== cone && cone.rayKeys.size < candidate.rayKeys.size && subsetSet(cone.rayKeys, candidate.rayKeys)
      )));
      const fanDimension = maximalCones.reduce((maximum, cone) => Math.max(maximum, cone.dimension), 0);
      const pure = maximalCones.every((cone) => cone.dimension === fanDimension);
      const fullDimensional = fanDimension === ambientDimension;
      const facetAdjacencies = faces.filter((face) => face.dimension === ambientDimension - 1).map((face) => ({
        faceKey: face.key,
        count: maximalCones.filter((cone) => face.rayKeys.every((key) => cone.rayKeys.has(key))).length,
      }));
      const complete = issues.length === 0 && fullDimensional && pure && maximalCones.length > 0 && facetAdjacencies.every((entry) => entry.count === 2);
      const smooth = coneAnalyses.every((cone) => cone.analysis.smooth);
      const simplicial = coneAnalyses.every((cone) => cone.analysis.simplicial);
      const classGroupValue = classGroup(rays.map((ray) => ray.primitive.map(BigInt)), ambientDimension);
      return {
        status: issues.length ? "invalid" : "computed",
        valid: issues.length === 0,
        compatible: issues.length === 0,
        ambientDimension,
        dimension: fanDimension,
        coneCount: distinctCones.length,
        maximalConeCount: maximalCones.length,
        rayCount: rays.length,
        faceCount: faces.length,
        orbitCount: faces.length,
        cones: coneAnalyses,
        maximalConeIds: maximalCones.map((cone) => cone.id),
        rays,
        faces,
        pure,
        fullDimensional,
        complete,
        smooth,
        simplicial,
        qFactorial: simplicial,
        locallyFactorial: smooth,
        classGroup: classGroupValue,
        canonicalDivisor: rays.length ? `-${rays.map((ray) => ray.divisorLabel).join(" - ")}` : "0",
        issues,
        warnings,
        metrics: { candidateChecks: budget.candidates },
      };
    } catch (error) {
      if (!(error instanceof ComplexityError)) throw error;
      return {
        status: "capped",
        valid: false,
        ambientDimension,
        coneCount: rawCones.length,
        cones: coneAnalyses,
        issues: [error.message],
        warnings,
        metrics: { candidateChecks: budget.candidates },
      };
    }
  }

  return {
    DEFAULT_LIMITS,
    Rational,
    parseRational,
    primitiveVector,
    analyzeCone,
    analyzeFan,
    sliceCone,
    presetGenerators,
    presetFan,
    _internal: {
      determinantBigInt,
      matrixRank,
      nullspace,
      smithNormalForm,
      solveLinear,
    },
  };
});
