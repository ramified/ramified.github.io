const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const math = require('./strand_math/index.js');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'strand_diagram_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    calculationTargetValue,
    calculationBasisValue,
    calculationSourceFamily,
    calculationWordFromState,
    calculationFingerprint,
    markCalculationStale,
    exportJson,
    importJson
  };
})();`);
  const sandbox = {
    console,
    window: { StrandMath: math, setTimeout() {} },
    document: { addEventListener() {} },
    navigator: {}
  };
  return vm.runInNewContext(source, sandbox, { filename: 'strand_diagram_calculator.js' });
}

function host(value) {
  return JSON.parse(JSON.stringify(value));
}

function braid(index, sign = 1) {
  return { family: 'braid', index, sign };
}

function testUiWordOrderAndStaleState() {
  const api = loadCalculator();
  api.state.groupType = 'symmetric';
  api.state.strandCount = 3;
  api.state.appliedSteps = [braid(1), braid(2), braid(1, -1)];
  assert.deepStrictEqual(host(api.calculationWordFromState()), [braid(1, -1), braid(2), braid(1)]);
  assert.strictEqual(api.calculationSourceFamily(), 'braid');

  const calculation = math.calculateStrandWord(api.calculationWordFromState(), {
    rank: 3,
    target: 'tl',
    basis: 'diagram'
  });
  api.state.calculationResult = calculation;
  api.state.calculationKey = api.calculationFingerprint();
  api.state.calculationStale = false;
  api.state.appliedSteps.push(braid(2));
  api.markCalculationStale();
  assert.strictEqual(api.state.calculationStale, true);
}

function testVersionThreeAndFourImports() {
  const api = loadCalculator();
  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 3,
    groupType: 'symmetric',
    strandCount: 3,
    appliedGenerators: [braid(1)]
  }));
  assert.strictEqual(api.state.calculationTarget, 'tl');
  assert.strictEqual(api.state.calculationBasis, 'diagram');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 3,
    appliedGenerators: [braid(2)],
    calculationSettings: {
      target: 'burau',
      basis: 'vector',
      convention: 'burau-compatible-v'
    },
    calculation: {
      target: 'burau',
      basis: 'vector',
      result: { untrusted: true }
    }
  }));
  assert.strictEqual(api.state.calculationTarget, 'burau');
  assert.strictEqual(api.state.calculationBasis, 'vector');
  assert.strictEqual(api.state.calculationResult, null, 'imported computed output is not trusted');
}

function testVersionFourCurrentCalculationExport() {
  const api = loadCalculator();
  api.state.groupType = 'symmetric';
  api.state.strandCount = 3;
  api.state.appliedSteps = [braid(1), braid(2)];
  api.state.calculationTarget = 'burau';
  api.state.calculationBasis = 'matrix-unit';
  api.state.calculationResult = math.calculateStrandWord(api.calculationWordFromState(), {
    rank: 3,
    target: 'burau',
    basis: 'matrix-unit'
  });
  api.state.calculationKey = api.calculationFingerprint();
  api.state.calculationStale = false;
  const exported = JSON.parse(api.exportJson());
  assert.strictEqual(exported.version, 4);
  assert.strictEqual(exported.calculation.convention, 'burau-compatible-v');
  assert.strictEqual(exported.calculation.parameter, 'v');
  assert.strictEqual(exported.calculation.wordOrder, 'left-to-right-product');
  assert.ok(exported.calculation.trace.length >= 2);

  api.state.calculationStale = true;
  const staleExport = JSON.parse(api.exportJson());
  assert.strictEqual(Object.prototype.hasOwnProperty.call(staleExport, 'calculation'), false);
}

function testHtmlIntegration() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'strand_diagram_calculator.html'), 'utf8');
  assert.ok(html.includes('id="strand-calculation-card"'));
  assert.ok(html.includes('id="strand-copy-calculation-latex"'));
  assert.ok(html.indexOf('js/strand_math/calculate.js') < html.indexOf('js/strand_diagram_calculator.js'));
}

testUiWordOrderAndStaleState();
testVersionThreeAndFourImports();
testVersionFourCurrentCalculationExport();
testHtmlIntegration();

console.log('strand_diagram_calculator_test: word order, stale state, card wiring, and JSON compatibility pass');
