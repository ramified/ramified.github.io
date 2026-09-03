const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'matrix_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    Fraction, ExactScalar, ModScalar, RationalFunctionScalar, NumberFieldScalar,
    normalizeRationalFunctionVariables, rationalFunctionBuilder, parseFieldExpression,
    formatRationalFunction, rationalFunctionLatex, numberFieldLatex, formatLatexIdentifier, formatPowerVariable,
    exactDeterminant, exactInverse, exactCharacteristicPolynomial,
    parsePolynomialQExpression, polyQMonic, polyQKey, numberFieldBuilder,
    refs, polynomialActionVariables, polynomialParserBuilder, substitutePolynomial, formatPolynomialAction,
    exportPolynomialAction, defaultPolynomialVariables
  };
})();`);
  const sandbox = {
    console,
    navigator: {},
    window: {},
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelectorAll() { return []; }
    }
  };
  return vm.runInNewContext(source, sandbox, { filename: 'matrix_calculator.js' });
}

const api = loadCalculator();
const host = (value) => JSON.parse(JSON.stringify(value));

assert.strictEqual(api.formatLatexIdentifier('x1'), 'x_{1}');
assert.strictEqual(api.formatLatexIdentifier('x12'), 'x_{12}');
assert.strictEqual(api.formatLatexIdentifier('x_i'), 'x_{i}');
assert.strictEqual(api.formatLatexIdentifier('alpha'), 'alpha');
assert.strictEqual(api.formatPowerVariable('x1', 2, 'latex'), 'x_{1}^{2}');
assert.strictEqual(api.formatPowerVariable('x1', 2, 'python'), 'x1**2');
assert.strictEqual(api.rationalFunctionLatex(['t1', 'u_2']), '\\mathbb{Q}(t_{1},u_{2})');
assert.strictEqual(api.numberFieldLatex({ symbol: 'a12' }), '\\mathbb{Q}(a_{12})');

assert.deepStrictEqual(host(api.normalizeRationalFunctionVariables('t, u, v')), ['t', 'u', 'v']);
assert.throws(() => api.normalizeRationalFunctionVariables('t,t'), /unique/);
assert.throws(() => api.normalizeRationalFunctionVariables('t,2u'), /Invalid/);

const field = { kind: 'rational-function', variables: ['t', 'u'], variable: 'u', key: 't,u' };
const builder = api.rationalFunctionBuilder(field.variables);
const cancelled = api.parseFieldExpression('(t + u)/(t + u)', builder);
assert.strictEqual(cancelled.isOne(), true, 'multivariable rational functions must cancel exact common factors');
assert.ok(api.formatRationalFunction(api.parseFieldExpression('t + u', builder)).includes('u'));
const builder3 = api.rationalFunctionBuilder(['t', 'u', 'v']);
assert.strictEqual(api.parseFieldExpression('(t*u + v)/(t*u + v)', builder3).isOne(), true);

const t = api.parseFieldExpression('t', builder);
const u = api.parseFieldExpression('u', builder);
const one = api.RationalFunctionScalar.one(field.variables);
const determinant = api.exactDeterminant([[t, u], [one, t]]);
assert.strictEqual(determinant.sub(api.parseFieldExpression('t^2-u', builder)).isZero(), true);
const inverse = api.exactInverse([[t, u], [one, t]]);
assert.strictEqual(inverse.length, 2);
assert.strictEqual(api.exactCharacteristicPolynomial([[t, u], [one, t]]).length, 3);
assert.throws(() => api.exactInverse([[one, one], [one, one]]), /singular/);
assert.throws(() => api.exactInverse([[one, one]]), /square/);

const qField = { kind: 'rational' };
const variables = ['x1', 'x2'];
const guard = { deadline: Date.now() + 1500 };
const polynomial = api.parseFieldExpression('x1^2 + x2', api.polynomialParserBuilder(qField, variables, guard));
const oneQ = api.ExactScalar.one();
const zeroQ = api.ExactScalar.zero();
const acted = api.substitutePolynomial(polynomial, [[oneQ, oneQ], [zeroQ, oneQ]], guard);
assert.strictEqual(api.formatPolynomialAction(acted), 'x1^2 + (2)*x1*x2 + x2^2 + x2');
const actedLatex = 'x_{1}^{2} + 2x_{1}x_{2} + x_{2}^{2} + x_{2}';
assert.strictEqual(api.formatPolynomialAction(acted, 'latex'), actedLatex);
assert.strictEqual(api.exportPolynomialAction({ polynomial: acted, field: qField, mode: 'direct' }, 'latex'), actedLatex);

const inverseMatrix = api.exactInverse([[oneQ, oneQ], [zeroQ, oneQ]]);
const inverseActed = api.substitutePolynomial(polynomial, inverseMatrix, { deadline: Date.now() + 1500 });
assert.strictEqual(api.formatPolynomialAction(inverseActed), 'x1^2 - (2)*x1*x2 + x2^2 + x2');

const rfPolynomial = api.parseFieldExpression('t*x1 + u*x2', api.polynomialParserBuilder(field, variables, { deadline: Date.now() + 1500 }));
assert.ok(api.formatPolynomialAction(rfPolynomial).includes('x1'));
assert.strictEqual(api.formatPolynomialAction(rfPolynomial, 'latex'), 'tx_{1} + ux_{2}');
const additiveRfPolynomial = api.parseFieldExpression('(t+u)*x1', api.polynomialParserBuilder(field, variables, { deadline: Date.now() + 1500 }));
assert.match(api.formatPolynomialAction(additiveRfPolynomial, 'latex'), /^\\left\(.+ \+ .+\\right\)x_\{1\}$/);
const fractionalRfPolynomial = api.parseFieldExpression('((t+u)/(t-u))*x1', api.polynomialParserBuilder(field, variables, { deadline: Date.now() + 1500 }));
assert.match(api.formatPolynomialAction(fractionalRfPolynomial, 'latex'), /^\\frac\{.+\}\{.+\}x_\{1\}$/);
assert.doesNotMatch(api.formatPolynomialAction(fractionalRfPolynomial, 'latex'), /^\\left\(\\frac/);

const finitePolynomial = api.parseFieldExpression('3*x1 + x2', api.polynomialParserBuilder({ kind: 'finite-field', p: 5 }, variables, { deadline: Date.now() + 1500 }));
assert.strictEqual(api.formatPolynomialAction(finitePolynomial), '(3)*x1 + x2');
const complexPolynomial = api.parseFieldExpression('i*x1 + x2', api.polynomialParserBuilder({ kind: 'complex' }, variables, { deadline: Date.now() + 1500 }));
assert.match(api.formatPolynomialAction(complexPolynomial), /[iI]/);
const additiveComplexPolynomial = api.parseFieldExpression('(1+i)*x1', api.polynomialParserBuilder({ kind: 'complex' }, variables, { deadline: Date.now() + 1500 }));
assert.strictEqual(api.formatPolynomialAction(additiveComplexPolynomial, 'latex'), '\\left(1 + i\\right)x_{1}');
const nfModulus = api.polyQMonic(api.parsePolynomialQExpression('a^2-2', 'a'));
const numberField = { kind: 'number-field', symbol: 'a', modulus: nfModulus, modulusText: 'a^2-2', key: `a:${api.polyQKey(nfModulus)}` };
const numberPolynomial = api.parseFieldExpression('a*x1 + x2', api.polynomialParserBuilder(numberField, variables, { deadline: Date.now() + 1500 }));
assert.ok(api.formatPolynomialAction(numberPolynomial).includes('a'));
assert.strictEqual(api.formatPolynomialAction(numberPolynomial, 'latex'), 'ax_{1} + x_{2}');
const additiveNumberPolynomial = api.parseFieldExpression('(a+1)*x1', api.polynomialParserBuilder(numberField, variables, { deadline: Date.now() + 1500 }));
assert.strictEqual(api.formatPolynomialAction(additiveNumberPolynomial, 'latex'), '\\left(a + 1\\right)x_{1}');
assert.throws(() => api.parseFieldExpression('x1/x2', api.polynomialParserBuilder(qField, variables, { deadline: Date.now() + 1500 })), /Division by an expression/);
assert.throws(() => api.parseFieldExpression('x1^65', api.polynomialParserBuilder(qField, variables, { deadline: Date.now() + 1500 })), /at most 64/);
assert.throws(() => api.parseFieldExpression('z+x1', api.polynomialParserBuilder(qField, variables, { deadline: Date.now() + 1500 })), /Unknown symbol/);
api.refs.polynomialActionVariables = { value: 'x, t' };
assert.throws(() => api.polynomialActionVariables(field, 2), /clashes/);
api.refs.polynomialActionVariables = { value: 'x, x' };
assert.throws(() => api.polynomialActionVariables(qField, 2), /unique/);

['latex', 'python', 'sage', 'macaulay2', 'mathematica', 'matlab', 'rows'].forEach((format) => {
  const output = api.exportPolynomialAction({ polynomial: rfPolynomial, field, mode: 'direct' }, format);
  assert.ok(output.length > 0, `${format} polynomial export must be nonempty`);
});
assert.match(api.exportPolynomialAction({ polynomial: rfPolynomial, field, mode: 'direct' }, 'python'), /x1, x2 = symbols/);
assert.doesNotMatch(api.exportPolynomialAction({ polynomial: rfPolynomial, field, mode: 'direct' }, 'python'), /x_\{1\}/);
assert.match(api.exportPolynomialAction({ polynomial: rfPolynomial, field, mode: 'direct' }, 'sage'), /PolynomialRing\(K/);
assert.match(api.exportPolynomialAction({ polynomial: rfPolynomial, field, mode: 'direct' }, 'matlab'), /syms t u x1 x2/);

assert.deepStrictEqual(host(api.defaultPolynomialVariables(3)), ['x1', 'x2', 'x3']);
console.log('matrix_calculator_test: multivariable rational functions and polynomial actions passed');
