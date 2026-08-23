const assert = require('assert');
const engine = require('./place_ramification_engine.js');

function compute(base, polynomial, selection, limits) {
  return engine.compute({
    schemaVersion: 1,
    base,
    extension: { kind: 'polynomial', generator: 'alpha', polynomial },
    selection: selection || { bound: 7, includeInfinite: false },
    limits
  });
}

function place(result, id) {
  const found = result.places.find((item) => item.id === id || item.label === id);
  assert.ok(found, `missing place ${id}`);
  return found;
}

const qResult = compute({ kind: 'Q' }, 'x^2-2', { bound: 7, includeInfinite: false });
assert.strictEqual(qResult.engine.arithmetic, 'browser-local');
assert.strictEqual(qResult.extension.irreducibility, 'certified');
assert.strictEqual(place(qResult, 'Q:2').behavior, 'ramified');
assert.deepStrictEqual(place(qResult, 'Q:2').components.map(({ e, f }) => [e, f]), [[2, 1]]);
assert.strictEqual(place(qResult, 'Q:3').behavior, 'inert');
assert.strictEqual(place(qResult, 'Q:7').behavior, 'split');

const repeated = compute({ kind: 'Q' }, 'x^2+1', { bound: 2, includeInfinite: false });
assert.strictEqual(place(repeated, 'Q:2').status, 'unresolved');
assert.strictEqual(place(repeated, 'Q:2').reasonCode, 'repeated-reduction');
assert.strictEqual(place(repeated, 'Q:2').components[0].e, null);

const relative = compute(
  { kind: 'lmfdb', label: '2.2.5.1', coeffs: [-1, -1, 1], zk: ['1', 'a'] },
  'x^2-(a+1)/2',
  { bound: 7, includeInfinite: true }
);
assert.strictEqual(relative.base.label, '2.2.5.1');
assert.ok(relative.places.some((item) => item.id.startsWith('nf:')));
assert.ok(relative.places.some((item) => item.status === 'unresolved'));
assert.ok(relative.places.every((item) => item.status === 'resolved' || item.components.every((component) => component.e == null && component.f == null)));

const functionField = compute(
  { kind: 'Fqt', q: '3' },
  'x^2-t',
  { functionPlaces: ['t', 't-1', 't+1'], includeInfinite: true }
);
assert.strictEqual(place(functionField, 't').behavior, 'ramified');
assert.strictEqual(place(functionField, 't').certificate, 'Eisenstein criterion');
assert.strictEqual(place(functionField, 't-1').behavior, 'split');
assert.strictEqual(place(functionField, 't+1').behavior, 'inert');
assert.strictEqual(place(functionField, 'Fqt:infinity').behavior, 'ramified');

const autoCandidate = compute(
  { kind: 'Fqt', q: '3' },
  'x^2-t',
  { functionPlaces: [], includeInfinite: false }
);
assert.ok(autoCandidate.places.some((item) => item.label === 't'), 'discriminant factor t must be added automatically');

const inseparable = compute(
  { kind: 'Fqt', q: '2' },
  'x^2-t',
  { functionPlaces: ['t', 't+1'], includeInfinite: true }
);
assert.strictEqual(inseparable.extension.flavor, 'purely inseparable');
assert.ok(inseparable.places.every((item) => item.behavior === 'inseparable'));
assert.ok(inseparable.places.every((item) => item.components[0].e === 2));

const primePower = compute(
  { kind: 'Fqt', q: '4' },
  'x^2+x+t',
  { functionPlaces: ['t'], includeInfinite: false }
);
assert.strictEqual(primePower.base.q, '4');

for (const [base, polynomial, pattern] of [
  [{ kind: 'Q' }, 'sin(x)+1', /identifier/i],
  [{ kind: 'Q' }, 'x^2=2', /assignments/i],
  [{ kind: 'Q' }, '1/x+x^2', /denominator/i],
  [{ kind: 'Q' }, 'x^2+a', /identifier/i],
  [{ kind: 'lmfdb', coeffs: [-1, -1, 1] }, 'x^2+t', /identifier/i],
  [{ kind: 'Fqt', q: '6' }, 'x^2-t', /prime power/i]
]) {
  assert.throws(() => compute(base, polynomial, { bound: 3, functionPlaces: ['t'], includeInfinite: false }), pattern);
}

assert.throws(
  () => compute({ kind: 'Fqt', q: '31' }, 'x^8+x+t', { functionPlaces: ['t+1'], includeInfinite: false }, { operationBudget: 1000, timeoutMs: 1000 }),
  (error) => error.code === 'computation-too-large'
);

console.log('place_ramification_engine_test: certified local and unresolved relative arithmetic pass');
