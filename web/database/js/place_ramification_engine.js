(function (scope) {
  'use strict';

  const ENGINE_VERSION = '1.1.0';

  class EngineError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'EngineError';
      this.code = code;
    }
  }

  class Budget {
    constructor(options) {
      const settings = options || {};
      this.remaining = Math.max(1000, Number(settings.operationBudget) || 300000);
      this.deadline = Date.now() + Math.max(250, Number(settings.timeoutMs) || 4500);
    }

    tick(cost) {
      this.remaining -= cost || 1;
      if (this.remaining < 0 || Date.now() > this.deadline) {
        throw new EngineError('computation-too-large', 'The local computation exceeded its operation or time budget.');
      }
    }

    enumeration(count) {
      if (count > BigInt(Math.max(0, this.remaining))) {
        throw new EngineError('computation-too-large', 'The required finite-field search is too large for this browser computation.');
      }
    }
  }

  function bigintAbs(value) {
    return value < 0n ? -value : value;
  }

  function bigintGcd(a, b) {
    let x = bigintAbs(a);
    let y = bigintAbs(b);
    while (y) {
      const next = x % y;
      x = y;
      y = next;
    }
    return x;
  }

  function modBigint(value, modulus) {
    const out = value % modulus;
    return out < 0n ? out + modulus : out;
  }

  function intPolyTrim(poly) {
    const out = poly.slice();
    while (out.length > 1 && out[out.length - 1] === 0n) out.pop();
    return out.length ? out : [0n];
  }

  function intPolyIsZero(poly) {
    return intPolyTrim(poly).length === 1 && intPolyTrim(poly)[0] === 0n;
  }

  function intPolyAdd(left, right, sign, budget) {
    const length = Math.max(left.length, right.length);
    const out = Array(length).fill(0n);
    for (let index = 0; index < length; index++) {
      budget.tick();
      out[index] = (left[index] || 0n) + (sign || 1n) * (right[index] || 0n);
    }
    return intPolyTrim(out);
  }

  function intPolyMul(left, right, budget) {
    const out = Array(left.length + right.length - 1).fill(0n);
    for (let i = 0; i < left.length; i++) {
      for (let j = 0; j < right.length; j++) {
        budget.tick();
        out[i + j] += left[i] * right[j];
      }
    }
    return intPolyTrim(out);
  }

  function normalizeSymbolicRational(value) {
    let numerator = intPolyTrim(value.num);
    let denominator = intPolyTrim(value.den);
    if (intPolyIsZero(denominator)) throw new EngineError('division-by-zero', 'A coefficient denominator is zero.');
    if (intPolyIsZero(numerator)) return { num: [0n], den: [1n] };
    let content = 0n;
    numerator.concat(denominator).forEach((coefficient) => {
      content = bigintGcd(content, coefficient);
    });
    if (content > 1n) {
      numerator = numerator.map((coefficient) => coefficient / content);
      denominator = denominator.map((coefficient) => coefficient / content);
    }
    if (denominator[denominator.length - 1] < 0n) {
      numerator = numerator.map((coefficient) => -coefficient);
      denominator = denominator.map((coefficient) => -coefficient);
    }
    return { num: numerator, den: denominator };
  }

  function symbolicRational(value) {
    return normalizeSymbolicRational({ num: [BigInt(value)], den: [1n] });
  }

  function symbolicVariable() {
    return { num: [0n, 1n], den: [1n] };
  }

  function symbolicAdd(left, right, sign, budget) {
    return normalizeSymbolicRational({
      num: intPolyAdd(
        intPolyMul(left.num, right.den, budget),
        intPolyMul(right.num, left.den, budget),
        sign || 1n,
        budget
      ),
      den: intPolyMul(left.den, right.den, budget)
    });
  }

  function symbolicNegate(value) {
    return { num: value.num.map((coefficient) => -coefficient), den: value.den.slice() };
  }

  function symbolicMul(left, right, budget) {
    return normalizeSymbolicRational({
      num: intPolyMul(left.num, right.num, budget),
      den: intPolyMul(left.den, right.den, budget)
    });
  }

  function symbolicInverse(value) {
    if (intPolyIsZero(value.num)) throw new EngineError('division-by-zero', 'A coefficient expression divides by zero.');
    return normalizeSymbolicRational({ num: value.den, den: value.num });
  }

  function symbolicPow(value, exponent, budget) {
    let result = symbolicRational(1n);
    let base = value;
    let power = exponent;
    while (power > 0) {
      budget.tick();
      if (power % 2 === 1) result = symbolicMul(result, base, budget);
      power = Math.floor(power / 2);
      if (power) base = symbolicMul(base, base, budget);
    }
    return result;
  }

  function symbolicIsZero(value) {
    return intPolyIsZero(value.num);
  }

  function symbolicIsOne(value) {
    return intPolyTrim(intPolyAdd(value.num, value.den, -1n, { tick() {} })).every((coefficient) => coefficient === 0n);
  }

  function symbolicEquals(left, right, budget) {
    return intPolyIsZero(intPolyAdd(
      intPolyMul(left.num, right.den, budget),
      intPolyMul(right.num, left.den, budget),
      -1n,
      budget
    ));
  }

  function xPolyTrim(poly) {
    const out = poly.slice();
    while (out.length > 1 && symbolicIsZero(out[out.length - 1])) out.pop();
    return out.length ? out : [symbolicRational(0n)];
  }

  function xPolyAdd(left, right, sign, budget) {
    const length = Math.max(left.length, right.length);
    const out = [];
    for (let index = 0; index < length; index++) {
      out.push(symbolicAdd(left[index] || symbolicRational(0n), right[index] || symbolicRational(0n), sign || 1n, budget));
    }
    return xPolyTrim(out);
  }

  function xPolyMul(left, right, budget) {
    const out = Array.from({ length: left.length + right.length - 1 }, () => symbolicRational(0n));
    for (let i = 0; i < left.length; i++) {
      for (let j = 0; j < right.length; j++) {
        budget.tick();
        out[i + j] = symbolicAdd(out[i + j], symbolicMul(left[i], right[j], budget), 1n, budget);
      }
    }
    return xPolyTrim(out);
  }

  function xPolyPow(value, exponent, budget) {
    let result = [symbolicRational(1n)];
    let base = value;
    let power = exponent;
    while (power > 0) {
      budget.tick();
      if (power % 2 === 1) result = xPolyMul(result, base, budget);
      power = Math.floor(power / 2);
      if (power) base = xPolyMul(base, base, budget);
    }
    return result;
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const character = source[index];
      if (/\s/.test(character)) {
        index++;
        continue;
      }
      if (/\d/.test(character)) {
        let end = index + 1;
        while (end < source.length && /\d/.test(source[end])) end++;
        tokens.push({ type: 'number', value: source.slice(index, end) });
        index = end;
        continue;
      }
      if (/[A-Za-z_]/.test(character)) {
        let end = index + 1;
        while (end < source.length && /[A-Za-z0-9_]/.test(source[end])) end++;
        tokens.push({ type: 'identifier', value: source.slice(index, end) });
        index = end;
        continue;
      }
      if ('+-*/^()'.includes(character)) {
        tokens.push({ type: character, value: character });
        index++;
        continue;
      }
      throw new EngineError('invalid-expression', `Unsupported character "${character}" in the polynomial expression.`);
    }

    const withMultiplication = [];
    tokens.forEach((token) => {
      const previous = withMultiplication[withMultiplication.length - 1];
      const leftValue = previous && (previous.type === 'number' || previous.type === 'identifier' || previous.type === ')');
      const rightValue = token.type === 'number' || token.type === 'identifier' || token.type === '(';
      if (leftValue && rightValue) withMultiplication.push({ type: '*', value: '*' });
      withMultiplication.push(token);
    });
    withMultiplication.push({ type: 'eof', value: '' });
    return withMultiplication;
  }

  function parseFieldPolynomial(source, baseKind, budget) {
    const text = String(source || '').trim();
    if (!text) throw new EngineError('missing-polynomial', 'Enter an irreducible monic polynomial for E/F.');
    if (/[=;\[\]{}]/.test(text)) throw new EngineError('invalid-expression', 'Assignments, lists, and statement separators are not allowed.');
    const baseSymbol = baseKind === 'lmfdb' ? 'a' : baseKind === 'Fqt' ? 't' : '';
    const tokens = tokenizeExpression(text);
    let position = 0;

    function peek(type) {
      return tokens[position].type === type;
    }

    function consume(type) {
      const token = tokens[position];
      if (token.type !== type) throw new EngineError('invalid-expression', `Expected ${type} near "${token.value}".`);
      position++;
      return token;
    }

    function parsePrimary() {
      if (peek('number')) return [symbolicRational(BigInt(consume('number').value))];
      if (peek('identifier')) {
        const identifier = consume('identifier').value;
        if (identifier === 'x') return [symbolicRational(0n), symbolicRational(1n)];
        if (identifier === baseSymbol) return [symbolicVariable()];
        throw new EngineError('invalid-identifier', `The identifier "${identifier}" is not available over this base field.`);
      }
      if (peek('(')) {
        consume('(');
        const value = parseAdditive();
        consume(')');
        return value;
      }
      throw new EngineError('invalid-expression', `Expected a number, x${baseSymbol ? `, ${baseSymbol}` : ''}, or a parenthesized expression.`);
    }

    function parseUnary() {
      if (peek('+')) {
        consume('+');
        return parseUnary();
      }
      if (peek('-')) {
        consume('-');
        return parseUnary().map(symbolicNegate);
      }
      return parsePrimary();
    }

    function parsePower() {
      let value = parseUnary();
      while (peek('^')) {
        consume('^');
        let parenthesized = false;
        if (peek('(')) {
          consume('(');
          parenthesized = true;
        }
        if (!peek('number')) throw new EngineError('invalid-exponent', 'Exponents must be nonnegative integers.');
        const raw = BigInt(consume('number').value);
        if (parenthesized) consume(')');
        if (raw > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new EngineError('computation-too-large', 'The exponent is too large for the local polynomial representation.');
        }
        value = xPolyPow(value, Number(raw), budget);
      }
      return value;
    }

    function parseMultiplicative() {
      let value = parsePower();
      while (peek('*') || peek('/')) {
        const operation = tokens[position++].type;
        const right = parsePower();
        if (operation === '*') {
          value = xPolyMul(value, right, budget);
        } else {
          if (xPolyTrim(right).length !== 1) {
            throw new EngineError('x-in-denominator', 'The defining expression must be a polynomial in x; x cannot occur in a denominator.');
          }
          const inverse = symbolicInverse(right[0]);
          value = value.map((coefficient) => symbolicMul(coefficient, inverse, budget));
        }
      }
      return value;
    }

    function parseAdditive() {
      let value = parseMultiplicative();
      while (peek('+') || peek('-')) {
        const operation = tokens[position++].type;
        value = xPolyAdd(value, parseMultiplicative(), operation === '+' ? 1n : -1n, budget);
      }
      return value;
    }

    const coefficients = xPolyTrim(parseAdditive());
    consume('eof');
    if (coefficients.length < 3) throw new EngineError('degree-too-small', 'The extension polynomial must have degree at least 2.');
    if (!symbolicIsOne(coefficients[coefficients.length - 1])) {
      throw new EngineError('not-monic', 'The extension polynomial must be monic in x.');
    }
    return { source: text, baseKind, baseSymbol, degree: coefficients.length - 1, coefficients };
  }

  class PrimeField {
    constructor(prime, budget) {
      this.characteristic = prime;
      this.size = prime;
      this.degree = 1;
      this.budget = budget;
      this.zero = 0n;
      this.one = 1n;
    }

    normalize(value) { return modBigint(BigInt(value), this.characteristic); }
    fromInteger(value) { return this.normalize(value); }
    add(a, b) { this.budget.tick(); return this.normalize(a + b); }
    neg(a) { return this.normalize(-a); }
    sub(a, b) { return this.add(a, this.neg(b)); }
    mul(a, b) { this.budget.tick(); return this.normalize(a * b); }
    isZero(a) { return this.normalize(a) === 0n; }
    equals(a, b) { return this.normalize(a) === this.normalize(b); }
    pow(a, exponent) {
      let result = this.one;
      let base = this.normalize(a);
      let power = BigInt(exponent);
      while (power > 0n) {
        this.budget.tick();
        if (power & 1n) result = this.mul(result, base);
        power >>= 1n;
        if (power) base = this.mul(base, base);
      }
      return result;
    }
    inv(a) {
      if (this.isZero(a)) throw new EngineError('division-by-zero', 'Division by zero in a residue field.');
      return this.pow(a, this.size - 2n);
    }
    div(a, b) { return this.mul(a, this.inv(b)); }
    elementFromIndex(index) { return this.normalize(index); }
    key(a) { return String(this.normalize(a)); }
    display(a) { return String(this.normalize(a)); }
  }

  class ExtensionField {
    constructor(base, modulus, budget, symbol) {
      this.base = base;
      this.modulus = fieldPolyMonic(modulus, base);
      this.degree = this.modulus.length - 1;
      this.characteristic = base.characteristic;
      this.size = base.size ** BigInt(this.degree);
      this.budget = budget;
      this.symbol = symbol || 'u';
      this.zero = this.normalize([]);
      this.one = this.normalize([base.one]);
    }

    normalize(value) {
      const out = Array(this.degree).fill(null).map(() => this.base.zero);
      const source = Array.isArray(value) ? value : [value];
      for (let index = 0; index < Math.min(source.length, this.degree); index++) out[index] = source[index];
      return out;
    }

    fromInteger(value) { return this.normalize([this.base.fromInteger(value)]); }
    add(a, b) {
      this.budget.tick();
      const left = this.normalize(a);
      const right = this.normalize(b);
      return left.map((coefficient, index) => this.base.add(coefficient, right[index]));
    }
    neg(a) { return this.normalize(a).map((coefficient) => this.base.neg(coefficient)); }
    sub(a, b) { return this.add(a, this.neg(b)); }
    mul(a, b) {
      this.budget.tick();
      const left = this.normalize(a);
      const right = this.normalize(b);
      const product = Array(2 * this.degree - 1).fill(null).map(() => this.base.zero);
      for (let i = 0; i < this.degree; i++) {
        for (let j = 0; j < this.degree; j++) {
          product[i + j] = this.base.add(product[i + j], this.base.mul(left[i], right[j]));
        }
      }
      for (let degree = product.length - 1; degree >= this.degree; degree--) {
        const coefficient = product[degree];
        if (this.base.isZero(coefficient)) continue;
        for (let j = 0; j < this.degree; j++) {
          product[degree - this.degree + j] = this.base.sub(
            product[degree - this.degree + j],
            this.base.mul(coefficient, this.modulus[j])
          );
        }
      }
      return this.normalize(product);
    }
    isZero(a) { return this.normalize(a).every((coefficient) => this.base.isZero(coefficient)); }
    equals(a, b) { return this.isZero(this.sub(a, b)); }
    pow(a, exponent) {
      let result = this.one;
      let base = this.normalize(a);
      let power = BigInt(exponent);
      while (power > 0n) {
        this.budget.tick();
        if (power & 1n) result = this.mul(result, base);
        power >>= 1n;
        if (power) base = this.mul(base, base);
      }
      return result;
    }
    inv(a) {
      if (this.isZero(a)) throw new EngineError('division-by-zero', 'Division by zero in a residue field.');
      return this.pow(a, this.size - 2n);
    }
    div(a, b) { return this.mul(a, this.inv(b)); }
    elementFromIndex(index) {
      let value = BigInt(index);
      const coefficients = [];
      for (let degree = 0; degree < this.degree; degree++) {
        coefficients.push(this.base.elementFromIndex(value % this.base.size));
        value /= this.base.size;
      }
      return this.normalize(coefficients);
    }
    generator() {
      return this.normalize([this.base.zero, this.base.one]);
    }
    key(a) { return `[${this.normalize(a).map((coefficient) => this.base.key(coefficient)).join(',')}]`; }
    display(a) {
      const coefficients = this.normalize(a);
      const terms = [];
      for (let degree = coefficients.length - 1; degree >= 0; degree--) {
        if (this.base.isZero(coefficients[degree])) continue;
        const coefficient = this.base.display(coefficients[degree]);
        terms.push(degree === 0 ? coefficient : `${coefficient}*${this.symbol}${degree === 1 ? '' : `^${degree}`}`);
      }
      return terms.length ? terms.join('+') : '0';
    }
  }

  function fieldPolyTrim(poly, field) {
    const out = poly.slice();
    while (out.length > 1 && field.isZero(out[out.length - 1])) out.pop();
    return out.length ? out : [field.zero];
  }

  function fieldPolyDegree(poly, field) {
    return fieldPolyTrim(poly, field).length - 1;
  }

  function fieldPolyAdd(left, right, field, sign) {
    const length = Math.max(left.length, right.length);
    const out = [];
    for (let index = 0; index < length; index++) {
      const a = left[index] || field.zero;
      const b = right[index] || field.zero;
      out.push(sign === -1 ? field.sub(a, b) : field.add(a, b));
    }
    return fieldPolyTrim(out, field);
  }

  function fieldPolyMul(left, right, field) {
    const out = Array(left.length + right.length - 1).fill(null).map(() => field.zero);
    for (let i = 0; i < left.length; i++) {
      for (let j = 0; j < right.length; j++) out[i + j] = field.add(out[i + j], field.mul(left[i], right[j]));
    }
    return fieldPolyTrim(out, field);
  }

  function fieldPolyMonic(poly, field) {
    const value = fieldPolyTrim(poly, field);
    const inverse = field.inv(value[value.length - 1]);
    return value.map((coefficient) => field.mul(coefficient, inverse));
  }

  function fieldPolyDivmod(dividend, divisor, field) {
    const remainder = fieldPolyTrim(dividend, field).slice();
    const normalizedDivisor = fieldPolyTrim(divisor, field);
    if (normalizedDivisor.length === 1 && field.isZero(normalizedDivisor[0])) {
      throw new EngineError('division-by-zero', 'Polynomial division by zero.');
    }
    const quotient = Array(Math.max(1, remainder.length - normalizedDivisor.length + 1)).fill(null).map(() => field.zero);
    const leadingInverse = field.inv(normalizedDivisor[normalizedDivisor.length - 1]);
    for (let offset = remainder.length - normalizedDivisor.length; offset >= 0; offset--) {
      const coefficient = field.mul(remainder[normalizedDivisor.length - 1 + offset], leadingInverse);
      quotient[offset] = coefficient;
      if (field.isZero(coefficient)) continue;
      for (let index = 0; index < normalizedDivisor.length; index++) {
        remainder[index + offset] = field.sub(remainder[index + offset], field.mul(coefficient, normalizedDivisor[index]));
      }
    }
    return { quotient: fieldPolyTrim(quotient, field), remainder: fieldPolyTrim(remainder, field) };
  }

  function fieldPolyGcd(left, right, field) {
    let a = fieldPolyTrim(left, field);
    let b = fieldPolyTrim(right, field);
    while (!(b.length === 1 && field.isZero(b[0]))) {
      const remainder = fieldPolyDivmod(a, b, field).remainder;
      a = b;
      b = remainder;
    }
    return fieldPolyMonic(a, field);
  }

  function fieldPolyDerivative(poly, field) {
    if (poly.length < 2) return [field.zero];
    return fieldPolyTrim(poly.slice(1).map((coefficient, index) => field.mul(coefficient, field.fromInteger(index + 1))), field);
  }

  function fieldPolySquarefree(poly, field) {
    const derivative = fieldPolyDerivative(poly, field);
    if (derivative.length === 1 && field.isZero(derivative[0])) return false;
    return fieldPolyDegree(fieldPolyGcd(poly, derivative, field), field) === 0;
  }

  function fieldPolyEvaluate(poly, value, field) {
    let out = field.zero;
    for (let degree = poly.length - 1; degree >= 0; degree--) out = field.add(field.mul(out, value), poly[degree]);
    return out;
  }

  function factorMonicPolynomial(poly, field, budget) {
    let remaining = fieldPolyMonic(poly, field);
    const factors = [];
    let divisorDegree = 1;
    while (fieldPolyDegree(remaining, field) > 1 && divisorDegree <= Math.floor(fieldPolyDegree(remaining, field) / 2)) {
      const count = field.size ** BigInt(divisorDegree);
      budget.enumeration(count);
      let found = false;
      for (let code = 0n; code < count; code++) {
        budget.tick();
        let value = code;
        const candidate = [];
        for (let index = 0; index < divisorDegree; index++) {
          candidate.push(field.elementFromIndex(value % field.size));
          value /= field.size;
        }
        candidate.push(field.one);
        const divided = fieldPolyDivmod(remaining, candidate, field);
        if (divided.remainder.length === 1 && field.isZero(divided.remainder[0])) {
          factors.push(fieldPolyMonic(candidate, field));
          remaining = fieldPolyMonic(divided.quotient, field);
          found = true;
          divisorDegree = 1;
          break;
        }
      }
      if (!found) divisorDegree++;
    }
    if (fieldPolyDegree(remaining, field) > 0) factors.push(fieldPolyMonic(remaining, field));
    return factors;
  }

  function functionPlaceDegreeBound(selection, field) {
    const explicitValue = selection?.functionPlaceDegreeBound;
    const explicitBound = Number(explicitValue);
    if (explicitValue != null && Number.isFinite(explicitBound)) return Math.max(0, Math.floor(explicitBound));
    const legacyCardinality = Number(selection?.residueCardinalityBound);
    if (!Number.isFinite(legacyCardinality) || legacyCardinality < Number(field.size)) return 0;
    const cardinalityBound = BigInt(Math.floor(legacyCardinality));
    let degree = 0;
    for (let residueCardinality = field.size; residueCardinality <= cardinalityBound; residueCardinality *= field.size) degree++;
    return degree;
  }

  function monicIrreduciblesThroughDegree(field, degreeBound, budget) {
    const polynomials = [];
    for (let degree = 1; degree <= degreeBound; degree++) {
      const candidateCount = field.size ** BigInt(degree);
      budget.enumeration(candidateCount);
      for (let code = 0n; code < candidateCount; code++) {
        budget.tick();
        let value = code;
        const candidate = [];
        for (let index = 0; index < degree; index++) {
          candidate.push(field.elementFromIndex(value % field.size));
          value /= field.size;
        }
        candidate.push(field.one);
        if (degree > 1) {
          if (!fieldPolySquarefree(candidate, field)) continue;
          const factors = factorMonicPolynomial(candidate, field, budget);
          if (factors.length !== 1 || fieldPolyDegree(factors[0], field) !== degree) continue;
        }
        polynomials.push(candidate);
      }
    }
    return polynomials;
  }

  function modPow(base, exponent, modulus, budget) {
    let result = 1n;
    let value = modBigint(base, modulus);
    let power = exponent;
    while (power > 0n) {
      budget.tick();
      if (power & 1n) result = modBigint(result * value, modulus);
      power >>= 1n;
      if (power) value = modBigint(value * value, modulus);
    }
    return result;
  }

  function isPrimeBigint(value, budget) {
    const n = BigInt(value);
    if (n < 2n) return false;
    for (const small of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
      if (n === small) return true;
      if (n % small === 0n) return false;
    }
    let d = n - 1n;
    let shifts = 0;
    while ((d & 1n) === 0n) { d >>= 1n; shifts++; }
    for (const base of [2n, 3n, 5n, 7n, 11n, 13n, 17n]) {
      if (base >= n) continue;
      let x = modPow(base, d, n, budget);
      if (x === 1n || x === n - 1n) continue;
      let witness = true;
      for (let round = 1; round < shifts; round++) {
        x = modBigint(x * x, n);
        budget.tick();
        if (x === n - 1n) { witness = false; break; }
      }
      if (witness) return false;
    }
    return true;
  }

  function primePower(value, budget) {
    const q = BigInt(String(value));
    if (q < 2n) throw new EngineError('invalid-q', 'q must be a prime power at least 2.');
    if (isPrimeBigint(q, budget)) return { p: q, exponent: 1, q };
    let divisor = 2n;
    while (divisor * divisor <= q && q % divisor !== 0n) {
      budget.tick();
      divisor = divisor === 2n ? 3n : divisor + 2n;
    }
    if (divisor * divisor > q || !isPrimeBigint(divisor, budget)) {
      throw new EngineError('invalid-q', 'q must be a prime power.');
    }
    let remainder = q;
    let exponent = 0;
    while (remainder % divisor === 0n) {
      remainder /= divisor;
      exponent++;
    }
    if (remainder !== 1n) throw new EngineError('invalid-q', 'q must be a prime power.');
    return { p: divisor, exponent, q };
  }

  function buildConstantField(qValue, budget) {
    const data = primePower(qValue, budget);
    const prime = new PrimeField(data.p, budget);
    if (data.exponent === 1) return { field: prime, primePower: data, modulus: null };
    const count = prime.size ** BigInt(data.exponent);
    budget.enumeration(count);
    for (let code = 1n; code < count; code++) {
      budget.tick();
      let value = code;
      const candidate = [];
      for (let index = 0; index < data.exponent; index++) {
        candidate.push(prime.elementFromIndex(value % prime.size));
        value /= prime.size;
      }
      if (prime.isZero(candidate[0])) continue;
      candidate.push(prime.one);
      if (!fieldPolySquarefree(candidate, prime)) continue;
      const factors = factorMonicPolynomial(candidate, prime, budget);
      if (factors.length === 1 && fieldPolyDegree(factors[0], prime) === data.exponent) {
        return { field: new ExtensionField(prime, candidate, budget, 'c'), primePower: data, modulus: candidate };
      }
    }
    throw new EngineError('computation-too-large', 'Could not construct the requested finite constant field within the local budget.');
  }

  function evaluateIntegerPolynomial(poly, value, field) {
    let result = field.zero;
    for (let degree = poly.length - 1; degree >= 0; degree--) {
      result = field.add(field.mul(result, value), field.fromInteger(poly[degree]));
    }
    return result;
  }

  function reduceSymbolicRational(value, field, baseElement) {
    const numerator = evaluateIntegerPolynomial(value.num, baseElement, field);
    const denominator = evaluateIntegerPolynomial(value.den, baseElement, field);
    if (field.isZero(denominator)) throw new EngineError('nonintegral-presentation', 'A coefficient denominator vanishes at this base place.');
    return field.div(numerator, denominator);
  }

  function reduceExtensionPolynomial(parsed, field, baseElement) {
    return parsed.coefficients.map((coefficient) => reduceSymbolicRational(coefficient, field, baseElement));
  }

  function rationalPrimeValuation(value, prime) {
    if (value === 0n) return Number.POSITIVE_INFINITY;
    let remaining = bigintAbs(value);
    let valuation = 0;
    while (remaining % prime === 0n) {
      remaining /= prime;
      valuation++;
    }
    return valuation;
  }

  function qCoefficientValuation(coefficient, prime) {
    if (coefficient.num.length !== 1 || coefficient.den.length !== 1) {
      throw new EngineError('invalid-coefficient', 'Only rational coefficients are allowed over Q.');
    }
    return rationalPrimeValuation(coefficient.num[0], prime) - rationalPrimeValuation(coefficient.den[0], prime);
  }

  function placeBehavior(components, degree) {
    if (components.some((component) => component.e > 1)) return 'ramified';
    if (components.length === degree && components.every((component) => component.e === 1 && component.f === 1)) return 'split';
    if (components.length === 1 && components[0].e === 1 && components[0].f === degree) return 'inert';
    return 'unramified';
  }

  function splittingType(components) {
    return components.map((component) => component.e === 1 ? String(component.f) : `${component.e}:${component.f}`).join('+');
  }

  function resolvedPlace(spec, components, degree, certificate, behaviorOverride) {
    return {
      id: spec.id,
      scope: spec.scope || 'finite',
      label: spec.label,
      base: spec.base || spec.label,
      placeType: spec.placeType || 'finite',
      status: 'resolved',
      reasonCode: null,
      behavior: behaviorOverride || placeBehavior(components, degree),
      g: components.length,
      components,
      splittingType: splittingType(components),
      detail: spec.detail || `Certified by ${certificate}.`,
      source: 'browser local engine',
      certificate
    };
  }

  function unresolvedPlace(spec, reasonCode, detail) {
    return {
      id: spec.id,
      scope: spec.scope || 'finite',
      label: spec.label,
      base: spec.base || spec.label,
      placeType: spec.placeType || 'finite',
      status: 'unresolved',
      reasonCode,
      behavior: 'unresolved',
      g: null,
      components: [{ label: '?', e: null, f: null, source: reasonCode }],
      splittingType: '?',
      detail,
      source: 'browser local engine',
      certificate: null
    };
  }

  function factorComponents(poly, field, budget, source) {
    return factorMonicPolynomial(poly, field, budget).map((factor, index) => ({
      label: `\\mathfrak{P}_{${index + 1}}`,
      e: 1,
      f: fieldPolyDegree(factor, field),
      source
    }));
  }

  function analyzeReducedPlace(spec, polynomial, field, degree, budget) {
    if (!fieldPolySquarefree(polynomial, field)) {
      return {
        place: unresolvedPlace(spec, 'repeated-reduction', 'The reduction has repeated factors; the presentation does not certify the local ramification indices.'),
        irreducibleWitness: false
      };
    }
    const components = factorComponents(polynomial, field, budget, 'squarefree residue factorization');
    return {
      place: resolvedPlace(spec, components, degree, 'squarefree residue factorization'),
      irreducibleWitness: components.length === 1 && components[0].f === degree
    };
  }

  function primesUpTo(bound) {
    const limit = Math.max(2, Math.floor(Number(bound) || 11));
    const sieve = Array(limit + 1).fill(true);
    sieve[0] = false;
    sieve[1] = false;
    for (let p = 2; p * p <= limit; p++) {
      if (!sieve[p]) continue;
      for (let multiple = p * p; multiple <= limit; multiple += p) sieve[multiple] = false;
    }
    return sieve.map((value, index) => value ? index : 0).filter(Boolean);
  }

  function isRationalEisenstein(parsed, prime) {
    const p = BigInt(prime);
    for (let index = 0; index < parsed.degree; index++) {
      if (qCoefficientValuation(parsed.coefficients[index], p) < 1) return false;
    }
    return qCoefficientValuation(parsed.coefficients[0], p) === 1;
  }

  function computeOverQ(request, parsed, budget) {
    const selected = new Set(primesUpTo(request.selection?.bound));
    (request.selection?.extraRationalPrimes || []).forEach((value) => selected.add(Number(value)));
    const places = [];
    let irreducibleWitness = false;
    [...selected].sort((a, b) => a - b).forEach((prime) => {
      if (!Number.isSafeInteger(prime) || prime < 2 || !isPrimeBigint(BigInt(prime), budget)) {
        throw new EngineError('invalid-place', `${prime} is not a rational prime.`);
      }
      const spec = { id: `Q:${prime}`, label: `(${prime})`, base: `(${prime})` };
      if (isRationalEisenstein(parsed, prime)) {
        irreducibleWitness = true;
        places.push(resolvedPlace(spec, [{ label: '\\mathfrak{P}', e: parsed.degree, f: 1, source: 'Eisenstein criterion' }], parsed.degree, 'Eisenstein criterion', 'ramified'));
        return;
      }
      try {
        const field = new PrimeField(BigInt(prime), budget);
        const reduced = reduceExtensionPolynomial(parsed, field, field.zero);
        const analyzed = analyzeReducedPlace(spec, reduced, field, parsed.degree, budget);
        if (analyzed.irreducibleWitness) irreducibleWitness = true;
        places.push(analyzed.place);
      } catch (error) {
        if (error.code === 'nonintegral-presentation') {
          places.push(unresolvedPlace(spec, error.code, error.message));
          return;
        }
        throw error;
      }
    });
    if (request.selection?.includeInfinite !== false) {
      places.push(unresolvedPlace(
        { id: 'Q:infinity', scope: 'infinite', label: '\\infty', base: '\\infty', placeType: 'archimedean' },
        'archimedean-root-isolation-unavailable',
        'The local polynomial engine has not certified the real and complex embeddings of this presentation.'
      ));
    }
    return { places, irreducibleWitness };
  }

  function integerCoefficients(values) {
    if (!Array.isArray(values) || values.length < 2) throw new EngineError('invalid-base-field', 'The LMFDB base snapshot has no defining polynomial.');
    return intPolyTrim(values.map((value) => BigInt(String(value))));
  }

  function computeOverNumberField(request, parsed, budget) {
    const basePolynomial = integerCoefficients(request.base.coeffs);
    const selected = new Set(primesUpTo(request.selection?.bound));
    (request.selection?.extraRationalPrimes || []).forEach((value) => selected.add(Number(value)));
    const places = [];
    let irreducibleWitness = false;
    [...selected].sort((a, b) => a - b).forEach((prime) => {
      if (!Number.isSafeInteger(prime) || prime < 2 || !isPrimeBigint(BigInt(prime), budget)) {
        throw new EngineError('invalid-place', `${prime} is not a rational prime.`);
      }
      const primeField = new PrimeField(BigInt(prime), budget);
      const reducedBase = basePolynomial.map((coefficient) => primeField.fromInteger(coefficient));
      if (!fieldPolySquarefree(reducedBase, primeField)) {
        places.push(unresolvedPlace(
          { id: `nf:${prime}:unresolved`, label: `\\mathfrak{p}\\mid ${prime}`, base: `\\mathfrak{p}\\mid ${prime}` },
          'base-index-sensitive',
          `The defining polynomial of F has repeated reduction at ${prime}; the local engine cannot certify the individual base places from this presentation.`
        ));
        return;
      }
      const baseFactors = factorMonicPolynomial(reducedBase, primeField, budget);
      baseFactors.forEach((factor, factorIndex) => {
        const label = `\\mathfrak{p}_{${prime},${factorIndex + 1}}`;
        const spec = { id: `nf:${prime}:${factorIndex + 1}`, label, base: label };
        try {
          const residueField = factor.length === 2
            ? primeField
            : new ExtensionField(primeField, factor, budget, `u_${prime}_${factorIndex + 1}`);
          const baseElement = factor.length === 2
            ? primeField.neg(factor[0])
            : residueField.generator();
          const reducedExtension = reduceExtensionPolynomial(parsed, residueField, baseElement);
          const analyzed = analyzeReducedPlace(spec, reducedExtension, residueField, parsed.degree, budget);
          if (analyzed.irreducibleWitness) irreducibleWitness = true;
          analyzed.place.baseResidueDegree = factor.length - 1;
          places.push(analyzed.place);
        } catch (error) {
          if (error.code === 'nonintegral-presentation') {
            places.push(unresolvedPlace(spec, error.code, error.message));
            return;
          }
          throw error;
        }
      });
    });
    if (request.selection?.includeInfinite !== false) {
      places.push(unresolvedPlace(
        { id: 'nf:infinity', scope: 'infinite', label: '\\infty_F', base: '\\infty_F', placeType: 'archimedean' },
        'relative-archimedean-unavailable',
        'Relative archimedean decomposition requires certified embeddings of both F and E and remains unresolved locally.'
      ));
    }
    return { places, irreducibleWitness };
  }

  function mapIntegerPolynomialToField(poly, field) {
    return fieldPolyTrim(poly.map((coefficient) => field.fromInteger(coefficient)), field);
  }

  function functionRational(value, constantField) {
    const numerator = mapIntegerPolynomialToField(value.num, constantField);
    const denominator = mapIntegerPolynomialToField(value.den, constantField);
    if (denominator.length === 1 && constantField.isZero(denominator[0])) {
      throw new EngineError('division-by-zero', 'A rational-function coefficient denominator is zero.');
    }
    return { num: numerator, den: denominator };
  }

  function functionRatIsZero(value, field) {
    return value.num.length === 1 && field.isZero(value.num[0]);
  }

  function functionRatAdd(left, right, field, sign) {
    return {
      num: fieldPolyAdd(fieldPolyMul(left.num, right.den, field), fieldPolyMul(right.num, left.den, field), field, sign === -1 ? -1 : 1),
      den: fieldPolyMul(left.den, right.den, field)
    };
  }

  function functionRatNeg(value, field) {
    return { num: value.num.map((coefficient) => field.neg(coefficient)), den: value.den.slice() };
  }

  function functionRatMul(left, right, field) {
    return { num: fieldPolyMul(left.num, right.num, field), den: fieldPolyMul(left.den, right.den, field) };
  }

  function functionRatInv(value, field) {
    if (functionRatIsZero(value, field)) throw new EngineError('division-by-zero', 'Division by zero in F_q(t).');
    return { num: value.den, den: value.num };
  }

  function functionRatDiv(left, right, field) {
    return functionRatMul(left, functionRatInv(right, field), field);
  }

  function functionRatOne(field) {
    return { num: [field.one], den: [field.one] };
  }

  function functionRatZero(field) {
    return { num: [field.zero], den: [field.one] };
  }

  function functionResultant(left, right, field, budget) {
    const f = left.slice();
    const g = right.slice();
    const m = f.length - 1;
    const n = g.length - 1;
    if (n < 0 || m < 0) return functionRatZero(field);
    const size = m + n;
    const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => functionRatZero(field)));
    for (let row = 0; row < n; row++) {
      for (let degree = 0; degree <= m; degree++) matrix[row][row + degree] = f[degree];
    }
    for (let row = 0; row < m; row++) {
      for (let degree = 0; degree <= n; degree++) matrix[n + row][row + degree] = g[degree];
    }
    let determinant = functionRatOne(field);
    let sign = 1;
    for (let column = 0; column < size; column++) {
      budget.tick();
      let pivot = column;
      while (pivot < size && functionRatIsZero(matrix[pivot][column], field)) pivot++;
      if (pivot === size) return functionRatZero(field);
      if (pivot !== column) {
        const swap = matrix[pivot];
        matrix[pivot] = matrix[column];
        matrix[column] = swap;
        sign *= -1;
      }
      const pivotValue = matrix[column][column];
      determinant = functionRatMul(determinant, pivotValue, field);
      for (let row = column + 1; row < size; row++) {
        if (functionRatIsZero(matrix[row][column], field)) continue;
        const factor = functionRatDiv(matrix[row][column], pivotValue, field);
        for (let next = column; next < size; next++) {
          matrix[row][next] = functionRatAdd(matrix[row][next], functionRatMul(factor, matrix[column][next], field), field, -1);
        }
      }
    }
    return sign < 0 ? functionRatNeg(determinant, field) : determinant;
  }

  function functionDiscriminant(parsed, constantField, budget) {
    const polynomial = parsed.coefficients.map((coefficient) => functionRational(coefficient, constantField));
    const derivative = polynomial.slice(1).map((coefficient, index) => ({
      num: coefficient.num.map((value) => constantField.mul(value, constantField.fromInteger(index + 1))),
      den: coefficient.den.slice()
    }));
    return functionResultant(polynomial, derivative, constantField, budget);
  }

  function polynomialKey(poly, field) {
    return fieldPolyMonic(poly, field).map((coefficient) => field.key(coefficient)).join('|');
  }

  function polynomialText(poly, field, variable) {
    const monic = fieldPolyMonic(poly, field);
    const terms = [];
    for (let degree = monic.length - 1; degree >= 0; degree--) {
      if (field.isZero(monic[degree])) continue;
      const coefficient = field.display(monic[degree]).replace(/\*/g, '');
      const factor = coefficient === '1' ? '' : /[+-]/.test(coefficient.slice(1)) ? `(${coefficient})` : coefficient;
      const term = degree === 0 ? coefficient : `${factor}${variable}${degree === 1 ? '' : `^${degree}`}`;
      terms.push(term);
    }
    return terms.length ? terms.join('+').replace(/\+\-/g, '-') : '0';
  }

  function parseFunctionPlace(source, constantField, budget) {
    const parsed = parseFieldPolynomial(`x^2+(${source})`, 'Fqt', budget);
    const value = parsed.coefficients[0];
    if (value.den.length !== 1 || value.den[0] !== 1n) throw new EngineError('invalid-place', 'A finite function-field place must be a polynomial P(t).');
    const polynomial = mapIntegerPolynomialToField(value.num, constantField);
    if (fieldPolyDegree(polynomial, constantField) < 1) throw new EngineError('invalid-place', 'A finite function-field place must have positive degree.');
    if (!constantField.equals(polynomial[polynomial.length - 1], constantField.one)) {
      throw new EngineError('invalid-place', 'A finite function-field place must be monic.');
    }
    if (!fieldPolySquarefree(polynomial, constantField)) throw new EngineError('invalid-place', `${source} is not irreducible over the constant field.`);
    const factors = factorMonicPolynomial(polynomial, constantField, budget);
    if (factors.length !== 1 || fieldPolyDegree(factors[0], constantField) !== fieldPolyDegree(polynomial, constantField)) {
      throw new EngineError('invalid-place', `${source} is not irreducible over the constant field.`);
    }
    return { polynomial, label: source };
  }

  function polynomialMultiplicity(value, factor, field) {
    let polynomial = fieldPolyTrim(value, field);
    let multiplicity = 0;
    while (!(polynomial.length === 1 && field.isZero(polynomial[0]))) {
      const divided = fieldPolyDivmod(polynomial, factor, field);
      if (!(divided.remainder.length === 1 && field.isZero(divided.remainder[0]))) break;
      polynomial = divided.quotient;
      multiplicity++;
    }
    return { multiplicity, quotient: polynomial };
  }

  function functionValuation(value, placePolynomial, constantField) {
    if (value.num.length === 1 && constantField.isZero(value.num[0])) return Number.POSITIVE_INFINITY;
    return polynomialMultiplicity(value.num, placePolynomial, constantField).multiplicity
      - polynomialMultiplicity(value.den, placePolynomial, constantField).multiplicity;
  }

  function reduceFunctionRational(value, placePolynomial, constantField, residueField, theta) {
    const numerator = polynomialMultiplicity(value.num, placePolynomial, constantField);
    const denominator = polynomialMultiplicity(value.den, placePolynomial, constantField);
    const valuation = numerator.multiplicity - denominator.multiplicity;
    if (valuation > 0) return residueField.zero;
    if (valuation < 0) throw new EngineError('nonintegral-presentation', 'A coefficient has negative valuation at this function-field place.');
    const numeratorValue = fieldPolyEvaluate(numerator.quotient, theta, residueField);
    const denominatorValue = fieldPolyEvaluate(denominator.quotient, theta, residueField);
    if (residueField.isZero(denominatorValue)) throw new EngineError('nonintegral-presentation', 'A coefficient denominator remains singular at this place.');
    return residueField.div(numeratorValue, denominatorValue);
  }

  function isFunctionEisenstein(coefficients, placePolynomial, constantField) {
    for (let index = 0; index < coefficients.length - 1; index++) {
      if (functionValuation(coefficients[index], placePolynomial, constantField) < 1) return false;
    }
    return functionValuation(coefficients[0], placePolynomial, constantField) === 1;
  }

  function isPowerOfPrime(value, prime) {
    let remaining = BigInt(value);
    if (remaining < prime) return false;
    while (remaining % prime === 0n) remaining /= prime;
    return remaining === 1n;
  }

  function isPureTBinomial(parsed, characteristic, budget) {
    if (!isPowerOfPrime(BigInt(parsed.degree), characteristic)) return false;
    for (let index = 1; index < parsed.degree; index++) if (!symbolicIsZero(parsed.coefficients[index])) return false;
    return symbolicEquals(parsed.coefficients[0], normalizeSymbolicRational({ num: [0n, -1n], den: [1n] }), budget);
  }

  function functionInfinityValuation(value, field) {
    return fieldPolyDegree(value.den, field) - fieldPolyDegree(value.num, field);
  }

  function functionInfinityResidue(value, field) {
    const valuation = functionInfinityValuation(value, field);
    if (valuation > 0) return field.zero;
    if (valuation < 0) throw new EngineError('nonintegral-presentation', 'A coefficient has negative valuation at infinity.');
    return field.div(value.num[value.num.length - 1], value.den[value.den.length - 1]);
  }

  function computeOverFunctionField(request, parsed, budget) {
    const constant = buildConstantField(request.base.q, budget);
    const constantField = constant.field;
    const coefficientFunctions = parsed.coefficients.map((coefficient) => functionRational(coefficient, constantField));
    const candidates = new Map();

    function addCandidate(polynomial, label, source) {
      const monic = fieldPolyMonic(polynomial, constantField);
      if (fieldPolyDegree(monic, constantField) < 1) return;
      candidates.set(polynomialKey(monic, constantField), { polynomial: monic, label: label || polynomialText(monic, constantField, 't'), source });
    }

    monicIrreduciblesThroughDegree(
      constantField,
      functionPlaceDegreeBound(request.selection, constantField),
      budget
    ).forEach((polynomial) => addCandidate(polynomial, null, 'place-degree bound'));

    (request.selection?.functionPlaces || []).forEach((source) => {
      const parsedPlace = parseFunctionPlace(String(source), constantField, budget);
      addCandidate(parsedPlace.polynomial, parsedPlace.label, 'user-selected');
    });

    coefficientFunctions.forEach((coefficient) => {
      if (fieldPolyDegree(coefficient.den, constantField) < 1) return;
      factorMonicPolynomial(fieldPolyMonic(coefficient.den, constantField), constantField, budget)
        .forEach((factor) => addCandidate(factor, null, 'coefficient denominator'));
    });

    try {
      const discriminant = functionDiscriminant(parsed, constantField, budget);
      if (!functionRatIsZero(discriminant, constantField) && fieldPolyDegree(discriminant.num, constantField) > 0) {
        factorMonicPolynomial(fieldPolyMonic(discriminant.num, constantField), constantField, budget)
          .forEach((factor) => addCandidate(factor, null, 'polynomial discriminant'));
      }
    } catch (error) {
      if (error.code !== 'computation-too-large') throw error;
    }

    const pureInseparable = isPureTBinomial(parsed, constant.primePower.p, budget);
    const places = [];
    let irreducibleWitness = pureInseparable;
    candidates.forEach((candidate, key) => {
      const spec = { id: `Fqt:${key}`, label: candidate.label, base: candidate.label };
      if (pureInseparable) {
        places.push(resolvedPlace(spec, [{ label: '\\mathfrak{P}', e: parsed.degree, f: 1, source: 'purely inseparable x^(p^r)-t certificate' }], parsed.degree, 'purely inseparable x^(p^r)-t certificate', 'inseparable'));
        return;
      }
      if (isFunctionEisenstein(coefficientFunctions, candidate.polynomial, constantField)) {
        irreducibleWitness = true;
        places.push(resolvedPlace(spec, [{ label: '\\mathfrak{P}', e: parsed.degree, f: 1, source: 'Eisenstein criterion' }], parsed.degree, 'Eisenstein criterion', 'ramified'));
        return;
      }
      try {
        const residueField = candidate.polynomial.length === 2
          ? constantField
          : new ExtensionField(constantField, candidate.polynomial, budget, 'v');
        const theta = candidate.polynomial.length === 2
          ? constantField.neg(candidate.polynomial[0])
          : residueField.generator();
        const reduced = coefficientFunctions.map((coefficient) => reduceFunctionRational(coefficient, candidate.polynomial, constantField, residueField, theta));
        const analyzed = analyzeReducedPlace(spec, reduced, residueField, parsed.degree, budget);
        if (analyzed.irreducibleWitness) irreducibleWitness = true;
        places.push(analyzed.place);
      } catch (error) {
        if (error.code === 'nonintegral-presentation') {
          places.push(unresolvedPlace(spec, error.code, error.message));
          return;
        }
        throw error;
      }
    });

    if (request.selection?.includeInfinite !== false) {
      const spec = { id: 'Fqt:infinity', scope: 'infinite', label: '\\infty', base: '\\infty', placeType: 'infinite' };
      if (pureInseparable) {
        places.push(resolvedPlace(spec, [{ label: '\\mathfrak{P}_\\infty', e: parsed.degree, f: 1, source: 'purely inseparable x^(p^r)-t certificate' }], parsed.degree, 'purely inseparable x^(p^r)-t certificate', 'inseparable'));
      } else {
        try {
          const reduced = coefficientFunctions.map((coefficient) => functionInfinityResidue(coefficient, constantField));
          const analyzed = analyzeReducedPlace(spec, reduced, constantField, parsed.degree, budget);
          if (analyzed.irreducibleWitness) irreducibleWitness = true;
          places.push(analyzed.place);
        } catch (error) {
          const binomialT = parsed.coefficients.slice(1, -1).every(symbolicIsZero)
            && symbolicEquals(parsed.coefficients[0], normalizeSymbolicRational({ num: [0n, -1n], den: [1n] }), budget);
          if (binomialT) {
            irreducibleWitness = true;
            places.push(resolvedPlace(spec, [{ label: '\\mathfrak{P}_\\infty', e: parsed.degree, f: 1, source: 'binomial infinity valuation' }], parsed.degree, 'binomial infinity valuation', 'ramified'));
          } else if (error.code === 'nonintegral-presentation') {
            places.push(unresolvedPlace(spec, 'infinity-normalization-unavailable', 'The presentation is not integral at infinity and no certified normalization is available.'));
          } else {
            throw error;
          }
        }
      }
    }
    return { places, irreducibleWitness, constant };
  }

  function markUnverifiedIrreducibility(places) {
    return places.map((place) => {
      if (place.status !== 'resolved') return place;
      return unresolvedPlace(
        { id: place.id, scope: place.scope, label: place.label, base: place.base, placeType: place.placeType },
        'irreducibility-unverified',
        'The local engine did not find a rigorous irreducibility certificate for the defining polynomial, so this decomposition is not asserted as a field extension.'
      );
    });
  }

  function compute(request) {
    const input = request || {};
    if (input.schemaVersion !== 1) throw new EngineError('unsupported-schema', 'Unsupported local-engine request schema.');
    const base = input.base || {};
    if (!['Q', 'lmfdb', 'Fqt'].includes(base.kind)) throw new EngineError('invalid-base-field', 'Choose Q, an LMFDB number field, or F_q(t) as the base field.');
    const budget = new Budget(input.limits);
    const parsed = parseFieldPolynomial(input.extension?.polynomial, base.kind, budget);
    let result;
    if (base.kind === 'Q') result = computeOverQ(input, parsed, budget);
    else if (base.kind === 'lmfdb') result = computeOverNumberField(input, parsed, budget);
    else result = computeOverFunctionField(input, parsed, budget);
    const places = result.irreducibleWitness ? result.places : markUnverifiedIrreducibility(result.places);
    const unresolvedCount = places.filter((place) => place.status !== 'resolved').length;
    return {
      schemaVersion: 1,
      engine: {
        name: 'ramification-local',
        version: ENGINE_VERSION,
        arithmetic: 'browser-local',
        completeness: unresolvedCount ? 'partial' : 'exact'
      },
      base: {
        ...base,
        label: base.kind === 'Q' ? '\\mathbb{Q}' : base.kind === 'Fqt' ? `\\mathbb{F}_{${base.q}}(t)` : base.label
      },
      extension: {
        kind: 'polynomial',
        generator: input.extension?.generator || 'alpha',
        polynomial: parsed.source,
        degree: parsed.degree,
        irreducibility: result.irreducibleWitness ? 'certified' : 'unverified',
        flavor: base.kind === 'Fqt' && isPureTBinomial(parsed, result.constant?.primePower?.p || 2n, budget) ? 'purely inseparable' : 'separable'
      },
      places,
      warnings: unresolvedCount
        ? [`${unresolvedCount} place${unresolvedCount === 1 ? ' remains' : 's remain'} unresolved; no local invariants are asserted there.`]
        : []
    };
  }

  const api = {
    ENGINE_VERSION,
    EngineError,
    compute,
    parseFieldPolynomial
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  scope.RamificationLocalEngine = api;
})(typeof self !== 'undefined' ? self : globalThis);
