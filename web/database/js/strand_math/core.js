(function (scope, factory) {
  'use strict';

  const root = scope.StrandMath = scope.StrandMath || {};
  const api = factory(root);
  Object.assign(root, api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONVENTION = Object.freeze({
    id: 'burau-compatible-v',
    parameter: 'v',
    t: 'v^2',
    delta: 'v+v^-1',
    heckeQuadratic: 'H_i^2=1+(v^-1-v)H_i',
    braidToHecke: 'sigma_i=vH_i',
    heckeToTl: 'H_i=v^-1-e_i'
  });

  class CalculationError extends Error {
    constructor(code, message, details) {
      super(message);
      this.name = 'CalculationError';
      this.code = code;
      this.details = details || null;
    }
  }

  class OperationBudget {
    constructor(limits) {
      const options = limits || {};
      this.remaining = Math.max(1, Number(options.operations) || 500000);
      this.maxTerms = Math.max(1, Number(options.terms) || 12000);
      this.deadline = Date.now() + Math.max(50, Number(options.timeoutMs) || 3500);
    }

    tick(cost) {
      this.remaining -= cost || 1;
      if (this.remaining < 0 || Date.now() > this.deadline) {
        throw new CalculationError('computation-limit', 'The calculation exceeded the browser work limit. Use a shorter word or a smaller rank.');
      }
    }

    checkTerms(count) {
      if (count > this.maxTerms) {
        throw new CalculationError('computation-limit', `The calculation produced more than ${this.maxTerms} sparse terms.`);
      }
    }
  }

  function integerCoefficient(value) {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === 'string' && /^[-+]?\d+$/.test(value.trim())) return BigInt(value.trim());
    throw new TypeError('Laurent coefficients must be integers.');
  }

  class LaurentPolynomial {
    constructor(terms) {
      this.terms = new Map();
      if (terms instanceof LaurentPolynomial) {
        terms.terms.forEach((coefficient, exponent) => this.setTerm(exponent, coefficient));
      } else if (terms instanceof Map || Array.isArray(terms)) {
        for (const [exponent, coefficient] of terms) this.setTerm(exponent, coefficient);
      } else if (terms && typeof terms === 'object') {
        Object.entries(terms).forEach(([exponent, coefficient]) => this.setTerm(Number(exponent), coefficient));
      }
    }

    static from(value) {
      if (value instanceof LaurentPolynomial) return value;
      if (value == null) return LaurentPolynomial.zero();
      return LaurentPolynomial.monomial(0, value);
    }

    static zero() {
      return new LaurentPolynomial();
    }

    static one() {
      return LaurentPolynomial.monomial(0, 1n);
    }

    static monomial(exponent, coefficient) {
      const out = new LaurentPolynomial();
      out.setTerm(exponent, coefficient == null ? 1n : coefficient);
      return out;
    }

    setTerm(exponent, coefficient) {
      const cleanExponent = Number(exponent);
      if (!Number.isInteger(cleanExponent)) throw new TypeError('Laurent exponents must be integers.');
      const cleanCoefficient = integerCoefficient(coefficient);
      if (cleanCoefficient === 0n) this.terms.delete(cleanExponent);
      else this.terms.set(cleanExponent, cleanCoefficient);
      return this;
    }

    clone() {
      return new LaurentPolynomial(this);
    }

    isZero() {
      return this.terms.size === 0;
    }

    equals(other) {
      const right = LaurentPolynomial.from(other);
      if (this.terms.size !== right.terms.size) return false;
      for (const [exponent, coefficient] of this.terms) {
        if (right.terms.get(exponent) !== coefficient) return false;
      }
      return true;
    }

    add(other) {
      const out = this.clone();
      LaurentPolynomial.from(other).terms.forEach((coefficient, exponent) => {
        out.setTerm(exponent, (out.terms.get(exponent) || 0n) + coefficient);
      });
      return out;
    }

    sub(other) {
      return this.add(LaurentPolynomial.from(other).neg());
    }

    neg() {
      return new LaurentPolynomial([...this.terms].map(([exponent, coefficient]) => [exponent, -coefficient]));
    }

    mul(other, budget) {
      const right = LaurentPolynomial.from(other);
      if (this.isZero() || right.isZero()) return LaurentPolynomial.zero();
      const out = LaurentPolynomial.zero();
      for (const [leftExponent, leftCoefficient] of this.terms) {
        for (const [rightExponent, rightCoefficient] of right.terms) {
          budget?.tick();
          const exponent = leftExponent + rightExponent;
          out.setTerm(exponent, (out.terms.get(exponent) || 0n) + leftCoefficient * rightCoefficient);
        }
      }
      return out;
    }

    pow(power, budget) {
      if (!Number.isInteger(power) || power < 0) throw new TypeError('Laurent powers must be nonnegative integers.');
      let out = LaurentPolynomial.one();
      let factor = this;
      let exponent = power;
      while (exponent > 0) {
        if (exponent % 2 === 1) out = out.mul(factor, budget);
        exponent = Math.floor(exponent / 2);
        if (exponent) factor = factor.mul(factor, budget);
      }
      return out;
    }

    shift(exponent) {
      if (!Number.isInteger(exponent)) throw new TypeError('Laurent shifts must be integers.');
      return new LaurentPolynomial([...this.terms].map(([current, coefficient]) => [current + exponent, coefficient]));
    }

    bar() {
      return new LaurentPolynomial([...this.terms].map(([exponent, coefficient]) => [-exponent, coefficient]));
    }

    positivePart() {
      return new LaurentPolynomial([...this.terms].filter(([exponent]) => exponent > 0));
    }

    key() {
      return [...this.terms]
        .sort(([left], [right]) => left - right)
        .map(([exponent, coefficient]) => `${exponent}:${coefficient}`)
        .join(',');
    }

    orderedTerms() {
      return [...this.terms].sort(([left], [right]) => right - left);
    }

    toLatex() {
      if (this.isZero()) return '0';
      return this.orderedTerms().map(([exponent, coefficient], index) => {
        const negative = coefficient < 0n;
        const magnitude = negative ? -coefficient : coefficient;
        let body;
        if (exponent === 0) body = String(magnitude);
        else {
          const scalar = magnitude === 1n ? '' : String(magnitude);
          const power = exponent === 1 ? 'v' : `v^{${exponent}}`;
          body = `${scalar}${power}`;
        }
        if (index === 0) return negative ? `-${body}` : body;
        return negative ? `-${body}` : `+${body}`;
      }).join('');
    }

    toString() {
      if (this.isZero()) return '0';
      return this.orderedTerms().map(([exponent, coefficient], index) => {
        const negative = coefficient < 0n;
        const magnitude = negative ? -coefficient : coefficient;
        let body;
        if (exponent === 0) body = String(magnitude);
        else body = `${magnitude === 1n ? '' : magnitude}v${exponent === 1 ? '' : `^${exponent}`}`;
        if (index === 0) return negative ? `-${body}` : body;
        return negative ? ` - ${body}` : ` + ${body}`;
      }).join('');
    }

    toJSON() {
      return this.orderedTerms()
        .slice()
        .reverse()
        .map(([exponent, coefficient]) => [exponent, String(coefficient)]);
    }
  }

  function defaultBasisKey(basis) {
    if (typeof basis === 'string') return basis;
    if (basis && typeof basis.key === 'string') return basis.key;
    return JSON.stringify(basis);
  }

  class LinearCombination {
    constructor(basisType, terms) {
      this.basisType = basisType;
      this.terms = new Map();
      if (terms instanceof LinearCombination) {
        terms.terms.forEach((term) => this.addTerm(term.basis, term.coefficient));
      } else if (Array.isArray(terms)) {
        terms.forEach((term) => this.addTerm(term.basis, term.coefficient));
      }
    }

    static single(basisType, basis, coefficient) {
      return new LinearCombination(basisType).addTerm(basis, coefficient == null ? LaurentPolynomial.one() : coefficient);
    }

    clone() {
      return new LinearCombination(this.basisType, this);
    }

    isZero() {
      return this.terms.size === 0;
    }

    addTerm(basis, coefficient) {
      const polynomial = LaurentPolynomial.from(coefficient);
      if (polynomial.isZero()) return this;
      const key = defaultBasisKey(basis);
      const previous = this.terms.get(key);
      const next = previous ? previous.coefficient.add(polynomial) : polynomial;
      if (next.isZero()) this.terms.delete(key);
      else this.terms.set(key, { basis: previous?.basis || basis, coefficient: next });
      return this;
    }

    add(other, scale) {
      if (!(other instanceof LinearCombination)) throw new TypeError('Expected a linear combination.');
      if (other.basisType !== this.basisType) throw new TypeError(`Cannot add ${other.basisType} to ${this.basisType}.`);
      const multiplier = scale == null ? LaurentPolynomial.one() : LaurentPolynomial.from(scale);
      other.terms.forEach((term) => this.addTerm(term.basis, term.coefficient.mul(multiplier)));
      return this;
    }

    sub(other) {
      return this.add(other, LaurentPolynomial.monomial(0, -1n));
    }

    scale(coefficient, budget) {
      const multiplier = LaurentPolynomial.from(coefficient);
      const out = new LinearCombination(this.basisType);
      this.terms.forEach((term) => out.addTerm(term.basis, term.coefficient.mul(multiplier, budget)));
      return out;
    }

    equals(other) {
      if (!(other instanceof LinearCombination) || other.basisType !== this.basisType || other.terms.size !== this.terms.size) return false;
      for (const [key, term] of this.terms) {
        if (!term.coefficient.equals(other.terms.get(key)?.coefficient)) return false;
      }
      return true;
    }

    sortedTerms(compare) {
      const terms = [...this.terms.values()];
      if (compare) terms.sort((left, right) => compare(left.basis, right.basis));
      else terms.sort((left, right) => defaultBasisKey(left.basis).localeCompare(defaultBasisKey(right.basis)));
      return terms;
    }

    toJSON() {
      return {
        basisType: this.basisType,
        terms: this.sortedTerms().map((term) => ({ basis: term.basis, coefficient: term.coefficient.toJSON() }))
      };
    }
  }

  const V = LaurentPolynomial.monomial(1, 1n);
  const V_INVERSE = LaurentPolynomial.monomial(-1, 1n);
  const DELTA = V.add(V_INVERSE);

  return {
    CONVENTION,
    CalculationError,
    OperationBudget,
    LaurentPolynomial,
    LinearCombination,
    V,
    V_INVERSE,
    DELTA,
    defaultBasisKey
  };
});
