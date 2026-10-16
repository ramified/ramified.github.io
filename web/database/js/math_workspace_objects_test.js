'use strict';
const assert = require('node:assert/strict');
const model = require('./math_workspace_objects.js');
const rows = text => model.normalize('young', 'partition', { partition: text });
assert.deepEqual(rows('4, 2, 1'), { rows: [4, 2, 1], partition: '4, 2, 1' });
assert.deepEqual(rows(''), { rows: [], partition: '' });
for (const draft of ['4,', '-', '1e', '2, 4', '-1', '26']) assert.throws(() => rows(draft));
assert.deepEqual(model.normalize('young', 'generalized', { partition: '2, 0, -1' }).rows, [2, 0, -1]);
assert.throws(() => model.normalize('lie', 'simple', { family: 'D', rank: 2 }));
assert.equal(model.normalize('lie', 'simple', { family: 'E6', rank: 3 }).rank, 6);
const assets = [
  { kind: 'young', id: 'a', type: 'partition', data: rows('2,1') },
  { kind: 'young', id: 'b', type: 'partition', data: rows('1') },
  { kind: 'lie', id: 'g', type: 'simple', data: { family: 'A', rank: 3 } },
  { kind: 'variety', id: 'x', type: 'grassmannian', data: { r: 2, n: 4 } }
];
const c = { type: 'lr', refs: { lambda: 'young:a', mu: 'young:b', lie: 'lie:g' } };
const first = model.contextFor(c, assets);
const branching = { type: 'branching', refs: { lambda: 'young:a' } };
assert.deepEqual(model.contextFor(branching, assets).missing, ['Young diagram μ']);
assert.deepEqual(model.contextFor({ ...branching, rule: 'sum-gl' }, assets).missing, []);
assert.equal(model.contextFor({ ...branching, rule: 'sum-gl', refs: { ...branching.refs, mu: 'young:b' } }, assets).objects.mu, undefined, 'single-input rules ignore a retained second reference');
assert.deepEqual(first.missing, []);
assert.equal(first.objects.lambda.id, 'a');
assert.notEqual(model.contextFor({ ...c, refs: { ...c.refs, lambda: 'young:b', mu: 'young:a' } }, assets).signature, first.signature, 'ordered references distinguish asymmetric operations');
assert.deepEqual(model.contextFor({ ...c, refs: { ...c.refs, mu: 'young:a' } }, assets).missing, [], 'the same object can occupy both input roles');
assets[2].data.rank = 4;
assert.notEqual(model.contextFor(c, assets).signature, first.signature, 'changing the Lie asset invalidates dependent calculations');
assert.deepEqual(model.contextFor(c, assets.filter(a => a.id !== 'b')).missing, ['Young diagram μ'], 'deletion leaves a missing reference, not an implicit substitute');
assets[0].type = 'generalized';
assert(model.contextFor(c, assets).missing.includes('Young diagram λ'), 'ordinary engines never coerce generalized objects');
assets[0].type = 'partition';
const cup = { type: 'grassmannian', refs: { lambda: 'young:a', mu: 'young:b', space: 'variety:x' } };
assert.deepEqual(model.contextFor(cup, assets).missing, []);
assets[3].data.r = 1;
assert(model.contextFor(cup, assets).missing.some(text => text.includes('must fit')), 'Grassmannian bounds come from its Asset');
console.log('math_workspace_objects_test: typed objects, ordered references, shared Lie inputs, invalidation and Grassmannian bounds passed');
