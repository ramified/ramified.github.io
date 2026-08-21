const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'place_ramification_calculator.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, 'place_ramification_calculator.js'), 'utf8');

[
  'ramification-input-mode', 'generic-base-kind', 'generic-q', 'generic-generator',
  'generic-polynomial', 'generic-compute', 'Runs locally in your browser'
].forEach((needle) => assert.ok(html.includes(needle), `missing generic calculator control: ${needle}`));

[
  'function computeGenericExtension()', 'function normalizedGenericField()',
  "source: 'polynomial-extension'", 'version: 2', 'extraFinitePlaces',
  "field.source === 'generic'", 'browserNumberFieldDecomposition', 'bad prime (local data unavailable)'
].forEach((needle) => assert.ok(script.includes(needle), `missing generic calculator behavior: ${needle}`));

assert.ok(script.includes("rawSource === 'polynomial-extension'"), 'v2 polynomial exports must import');
assert.ok(script.includes("field.source === 'generic' ? 'finite places'"), 'function-field UI must not call places primes');
assert.ok(!script.includes('RAMIFICATION_CAS_URL'), 'browser-only calculator must not require a CAS endpoint');
console.log('place_ramification_calculator_test: generic UI and v2 export contract present');
