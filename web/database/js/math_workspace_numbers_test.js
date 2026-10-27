'use strict';
const assert = require('node:assert/strict');
const numbers = require('./math_workspace_numbers.js');
const genus = numbers.references('variety', 'curve')[0], rank = numbers.references('sheaf', 'locally-free')[0];
const literal = value => ({ kind: 'literal', value }), reference = ref => ({ kind: 'reference', ref });

assert.deepEqual(numbers.normalizeInputs('variety', 'curve', { genus: '1', genusNumber: 'number:N1' }), { genus: reference('number:N1') });
assert.deepEqual(numbers.normalizeInputs('sheaf', 'locally-free', { rank: '3', rankNumber: '' }), { rank: literal('3') });
assert.deepEqual(numbers.normalizeInputs('variety', 'curve', { genus: literal('+002 '), genusNumber: 'number:obsolete' }), { genus: literal('2') });
assert.equal(numbers.referenceKey({ genus: literal('2') }, genus), '');
assert.equal(numbers.referenceKey({ genus: reference('number:N1') }, genus), 'number:N1');
for (const value of ['', '+', '-', '2.', '2e', '3/2', '-1']) assert.throws(() => numbers.normalizeInput(literal(value), genus), /integer/);
assert.throws(() => numbers.normalizeInput(literal('0'), rank), /integer/);
assert.throws(() => numbers.normalizeInput(reference(''), genus), /Choose/);
assert.throws(() => numbers.normalizeInputs('variety', 'curve', { genus: { kind: 'unknown', value: '2' } }), /one value/);
assert.deepEqual(numbers.migrateInputs('variety', 'curve', { genus: literal('+ ') }), { genus: literal('+ ') }, 'migration preserves incomplete drafts');
assert.deepEqual(numbers.normalizeInput(literal('9007199254740993'), genus), literal('9007199254740993'), 'integer literals are exact');

const field = { kind: 'field', id: 'Q', data: { dataType: 'rational' } };
const number = { kind: 'number', id: 'N1', name: 'g', data: { field: 'field:Q', hasValue: true, value: '4', replaceWithValue: true } };
const curve = { kind: 'variety', type: 'curve', data: { genus: reference('number:N1') } };
// The coefficient engine has separate integration coverage; this fixture isolates source selection.
numbers.setKernel(value => ({ integer: /^\d+$/.test(value) ? value : null, text: value, latex: value }));
const graph = [field, number, curve];
assert.equal(numbers.project(curve, graph).data.genus, '4');
assert.deepEqual(curve.data.genus, reference('number:N1'), 'projection never overwrites the source');
assert.equal(numbers.literalValue(curve, genus, graph), '4');
number.data.replaceWithValue = false;
assert.equal(numbers.scalar(curve, genus, graph), numbers.symbol(number));
assert.equal(numbers.literalValue(curve, genus, graph), '4', 'detaching a known symbolic value copies its integer');
number.data.hasValue = false;
assert.equal(numbers.literalValue(curve, genus, graph), '', 'unknown symbols cannot become an invented literal');
number.data.hasValue=true;number.data.value='3/2';
assert.equal(numbers.literalValue(curve,genus,graph),'','a fractional genus reference can be replaced by a blank repair draft');
assert.deepEqual(curve.data.genus,reference('number:N1'),'switching input modes does not silently change the saved reference');
assert.equal(numbers.project({ ...curve, data: { genus: literal('7') } }, graph).data.genus, '7');
assert.throws(() => numbers.validateGraph([field, curve]), /existing Number/);
console.log('Number parameters: exclusive sources, legacy migration, exact literals, draft preservation and native projection passed');
