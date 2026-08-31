const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const math = require('./strand_math/index.js');

function loadCalculator() {
  let source = fs.readFileSync(path.join(__dirname, 'strand_diagram_calculator.js'), 'utf8');
  source = source.replace(/\}\)\(\);\s*$/, `return {
    state,
    calculationTaskValue,
    setCalculationTask,
    basisTaskActive,
    relationReferenceCalculation,
    calculationTargetValue,
    calculationBasisValue,
    calculationSourceFamily,
    calculationWordFromState,
    calculationFingerprint,
    markCalculationStale,
    calculationPresentationModeValue,
    calculationPresentationScopeValue,
    setCalculationPresentation,
    calculationLatexForCopy,
    generatorChipMarkup,
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
  assert.strictEqual(api.state.calculationTask, 'strand');
  assert.strictEqual(api.state.relationTarget, 'tl');
  assert.strictEqual(api.state.basisTarget, 'tl');
  assert.strictEqual(api.state.basisBasis, 'diagram');
  assert.strictEqual(api.state.calculationBasis, 'diagram');
  assert.strictEqual(api.state.calculationPresentationMode, 'symbolic');
  assert.strictEqual(api.state.calculationPresentationScope, 'all');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 3,
    appliedGenerators: [braid(2)],
    calculationSettings: {
      target: 'burau',
      basis: 'vector',
      convention: 'burau-compatible-v',
      presentation: { mode: 'diagrammatic', scope: 'basis' }
    },
    calculation: {
      target: 'burau',
      basis: 'vector',
      result: { untrusted: true }
    }
  }));
  assert.strictEqual(api.state.calculationTarget, 'burau');
  assert.strictEqual(api.state.calculationBasis, 'vector');
  assert.strictEqual(api.state.basisTarget, 'burau');
  assert.strictEqual(api.state.basisBasis, 'vector');
  assert.strictEqual(api.state.calculationPresentationMode, 'diagrammatic');
  assert.strictEqual(api.state.calculationPresentationScope, 'basis');
  assert.strictEqual(api.state.calculationResult, null, 'imported computed output is not trusted');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 4,
    calculationSettings: { target: 'burau' }
  }));
  assert.strictEqual(api.state.calculationTarget, 'burau');
  assert.strictEqual(api.state.calculationBasis, 'link-state', 'Burau presets without an explicit basis use link states');
  assert.strictEqual(api.state.basisBasis, 'link-state');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 3,
    calculationSettings: { target: 'symmetric', basis: 'permutation' }
  }));
  assert.strictEqual(api.state.calculationTarget, 'symmetric');
  assert.strictEqual(api.state.calculationBasis, 'one-line', 'legacy permutation output maps to one-line notation');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 3,
    calculationSettings: {
      task: 'relations',
      target: 'tl',
      relationTarget: 'hecke',
      basis: 'diagram'
    }
  }));
  assert.strictEqual(api.state.calculationTask, 'relations');
  assert.strictEqual(api.state.calculationTarget, 'tl');
  assert.strictEqual(api.state.relationTarget, 'hecke');

  api.importJson(JSON.stringify({
    kind: 'strand-diagram-calculator',
    version: 4,
    groupType: 'symmetric',
    strandCount: 3,
    calculationSettings: {
      task: 'basis',
      target: 'tl',
      basis: 'diagram',
      basisTarget: 'hecke',
      basisBasis: 'kl'
    }
  }));
  assert.strictEqual(api.state.calculationTask, 'basis');
  assert.strictEqual(api.state.basisTarget, 'hecke');
  assert.strictEqual(api.state.basisBasis, 'kl');
}

function testRelationTaskPreservesStrandCalculation() {
  const api = loadCalculator();
  api.state.groupType = 'symmetric';
  api.state.strandCount = 3;
  api.state.appliedSteps = [braid(1)];
  api.state.calculationTarget = 'tl';
  api.state.calculationBasis = 'diagram';
  api.state.relationTarget = 'hecke';
  api.state.calculationResult = math.calculateStrandWord(api.calculationWordFromState(), {
    rank: 3,
    target: 'tl',
    basis: 'diagram'
  });
  api.state.calculationKey = api.calculationFingerprint();
  api.state.calculationStale = false;
  const key = api.state.calculationKey;

  api.setCalculationTask('relations');
  const reference = api.relationReferenceCalculation();
  assert.strictEqual(api.state.calculationTask, 'relations');
  assert.strictEqual(reference.target, 'hecke');
  assert.strictEqual(reference.sourceFamily, 'identity');
  assert.strictEqual(api.state.calculationTarget, 'tl');
  assert.strictEqual(api.state.calculationKey, key);
  assert.strictEqual(api.state.calculationStale, false);

  api.setCalculationTask('strand');
  assert.strictEqual(api.state.calculationKey, key);
  assert.strictEqual(api.state.calculationStale, false);
  assert.strictEqual(api.calculationTaskValue('unsupported'), 'strand');
}

function testBasisTaskPreservesStrandCalculation() {
  const api = loadCalculator();
  api.state.groupType = 'symmetric';
  api.state.strandCount = 3;
  api.state.appliedSteps = [braid(1)];
  api.state.calculationTarget = 'tl';
  api.state.calculationBasis = 'diagram';
  api.state.basisTarget = 'hecke';
  api.state.basisBasis = 'standard';
  api.state.calculationResult = math.calculateStrandWord(api.calculationWordFromState(), {
    rank: 3,
    target: 'tl',
    basis: 'diagram'
  });
  api.state.calculationKey = api.calculationFingerprint();
  api.state.calculationStale = false;
  const key = api.state.calculationKey;

  api.setCalculationTask('basis');
  assert.strictEqual(api.basisTaskActive(), true);
  assert.strictEqual(api.state.calculationTarget, 'tl');
  assert.strictEqual(api.state.basisTarget, 'hecke');
  assert.strictEqual(api.state.calculationKey, key);
  assert.strictEqual(api.state.calculationStale, false);
  api.setCalculationTask('strand');
  assert.strictEqual(api.state.calculationKey, key);
  assert.strictEqual(api.state.calculationStale, false);
}

function testSymmetricCalculationChoices() {
  const api = loadCalculator();
  const choices = ['composition', 'transpositions', 'cycle', 'one-line', 'two-line', 'matrix'];
  choices.forEach((basis) => assert.strictEqual(api.calculationBasisValue('symmetric', basis), basis));
  assert.strictEqual(api.calculationBasisValue('symmetric', 'permutation'), 'one-line');
  assert.strictEqual(api.calculationBasisValue('symmetric', 'unsupported'), 'composition');
  assert.strictEqual(api.calculationBasisValue('burau', ''), 'link-state');
  assert.strictEqual(api.calculationBasisValue('burau', 'matrix-unit'), 'matrix-unit');
  assert.strictEqual(api.calculationBasisValue('burau', 'vector'), 'vector');
}

function testPresentationDoesNotStaleCalculation() {
  const api = loadCalculator();
  api.state.groupType = 'symmetric';
  api.state.strandCount = 3;
  api.state.appliedSteps = [braid(1)];
  api.state.calculationTarget = 'tl';
  api.state.calculationBasis = 'diagram';
  api.state.calculationResult = math.calculateStrandWord(api.calculationWordFromState(), {
    rank: 3,
    target: 'tl',
    basis: 'diagram',
    includeTrace: true
  });
  api.state.calculationKey = api.calculationFingerprint();
  api.state.calculationStale = false;
  const fingerprint = api.calculationFingerprint();

  api.setCalculationPresentation('diagrammatic', 'basis');
  assert.strictEqual(api.state.calculationPresentationMode, 'diagrammatic');
  assert.strictEqual(api.state.calculationPresentationScope, 'basis');
  assert.strictEqual(api.calculationFingerprint(), fingerprint);
  assert.strictEqual(api.state.calculationStale, false);
  assert.ok(api.calculationLatexForCopy().startsWith('% Requires \\usepackage{tikz}'));

  api.state.calculationLatex = 'symbolic-latex';
  api.setCalculationPresentation('symbolic', 'all');
  assert.strictEqual(api.calculationLatexForCopy(), 'symbolic-latex');
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
  assert.strictEqual(exported.calculationSettings.task, 'strand');
  assert.strictEqual(exported.calculationSettings.relationTarget, 'tl');
  assert.strictEqual(exported.calculationSettings.basisTarget, 'tl');
  assert.strictEqual(exported.calculationSettings.basisBasis, 'diagram');
  assert.deepStrictEqual(host(exported.calculationSettings.presentation), { mode: 'symbolic', scope: 'all' });
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
  const source = fs.readFileSync(path.join(__dirname, 'strand_diagram_calculator.js'), 'utf8');
  assert.ok(html.includes('id="strand-calculation-card"'));
  assert.ok(html.includes('id="strand-calculation-task"'));
  assert.ok(html.includes('<option value="strand" selected>Current strand</option>'));
  assert.ok(html.includes('<option value="relations">Relations</option>'));
  assert.ok(html.includes('<option value="basis">Check basis</option>'));
  assert.ok(html.includes('id="strand-calculation-wide-host"'));
  assert.ok(html.includes('id="strand-calculation-wide"'));
  assert.ok(html.includes('data-card-wide="true"'));
  assert.ok(!html.includes('id="strand-calculation-relations-details"'));
  assert.ok(!html.includes('id="strand-calculation-details"'));
  assert.ok(!html.includes('<summary>relations</summary>'));
  assert.ok(!html.includes('<summary>calculation</summary>'));
  assert.ok(html.includes('id="strand-calculation-relations-surface" hidden'));
  assert.ok(html.includes('id="strand-calculation-basis-surface" hidden'));
  assert.ok(html.includes('id="strand-calculation-basis-page"'));
  assert.ok(html.includes('id="strand-calculation-surface"'));
  assert.ok(html.includes('id="strand-calculation-mode-control"'));
  assert.ok(html.includes('id="strand-calculation-scope-control"'));
  assert.ok(html.includes('data-calculation-mode="diagrammatic"'));
  assert.ok(html.includes('js/strand_math/diagrammatics.js'));
  assert.ok(html.includes('js/strand_math/basis_catalog.js'));
  assert.ok(html.includes('id="strand-copy-calculation-latex"'));
  assert.ok(html.includes('id="strand-calculation-matrix-label"'));
  assert.ok(html.includes('.strand-diagram-platform'));
  assert.ok(source.includes("{ value: 'link-state', label: 'Link-state basis' }"));
  assert.ok(source.includes("{ value: 'matrix-unit', label: 'Unreduced matrix-unit basis' }"));
  assert.ok(source.includes('makeBurauLinkStateDiagram'));
  assert.ok(html.indexOf('js/strand_math/calculate.js') < html.indexOf('js/strand_diagram_calculator.js'));

  const api = loadCalculator();
  const chip = api.generatorChipMarkup(braid(2, -1));
  assert.ok(chip.includes('aria-label="inverse braid generator sigma 2"'));
  assert.ok(chip.includes('\\(\\sigma_{2}^{-1}\\)'));
  assert.ok(html.includes('.strand-generator-chip mjx-container *'));
  assert.ok(html.includes('.strand-diagram-relation-equation'));
  assert.ok(html.includes('.strand-diagram-relation-equations.has-hint'));
  assert.ok(html.includes('.strand-diagram-relation-group-title'));
  assert.ok(html.includes('.strand-diagram-relation-sheet.is-symbolic'));
  assert.ok(html.includes('grid-template-columns: max-content 18px max-content max-content'));
  assert.ok(html.includes('.strand-diagram-trace-row {\n      display: contents;'));
  assert.ok(!html.includes('.strand-diagram-final'));
  assert.ok(!source.includes("classList.add('strand-diagram-final')"));
  ['Composition word', 'Transpositions', 'Cycle notation', 'One-line', 'Two-line', 'Matrix'].forEach((label) => {
    assert.ok(source.includes(`label: '${label}'`));
  });
  assert.ok(html.includes('<div class="strand-calculation-relations" id="strand-calculation-relations"></div>'));
  assert.ok(source.includes('buildDiagrammaticTrace(calculation'));
  assert.ok(!source.includes('buildDiagrammaticPresentation(calculation'));
  assert.ok(source.includes("section.dataset.relationGroup = group.id"));
  assert.ok(source.includes("item.setAttribute('aria-label', row.label"));
  assert.ok(source.includes('equations.title = row.hint'));
  assert.ok(source.includes("equations.setAttribute('aria-description', row.hint)"));
  assert.ok(source.includes("refs.calculationScopeControl.hidden = reference"));
  assert.ok(source.includes("refs.calculationRelationsSurface.hidden = !relations"));
  assert.ok(source.includes("refs.calculationBasisSurface.hidden = !basis"));
  assert.ok(source.includes("refs.calculationSurface.hidden = reference"));
  assert.ok(source.includes('buildBasisCatalog({'));
  assert.ok(source.includes('renderBasisReference()'));
  assert.ok(source.includes('CalculatorCards.setWide(refs.calculationCard, true'));
  assert.ok(source.includes('CalculatorCards.setCardCollapsed(refs.calculationCard, false'));
  assert.ok(source.includes('renderRelationReference()'));
}

testUiWordOrderAndStaleState();
testVersionThreeAndFourImports();
testRelationTaskPreservesStrandCalculation();
testBasisTaskPreservesStrandCalculation();
testSymmetricCalculationChoices();
testPresentationDoesNotStaleCalculation();
testVersionFourCurrentCalculationExport();
testHtmlIntegration();

console.log('strand_diagram_calculator_test: presentation, typeset controls, stale state, and JSON compatibility pass');
