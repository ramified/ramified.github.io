const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const activePages = Array.from(index.matchAll(/class="applet-link" href="([^"]+\.html)"/g), (match) => match[1]);
const expectedPages = [
  'young_diagrams.html',
  'double_young_diagram.html',
  'higher_dimensional_slice_calculator.html',
  'mosaic_calculator.html',
  'matrix_calculator.html',
  'sheaf_calculator.html',
  'dynkin_diagram_calculator.html',
  'category_calculator.html',
  'theorem_graph_calculator.html',
  'sheaf_complex_calculator.html',
  'place_ramification_calculator.html',
  'strand_diagram_calculator.html',
  'ramified_minigames.html'
];
const expectedExternalExporters = {
  'young_diagrams.html': ['borel-weil-bott', 'branching', 'latex', 'shape', 'svg', 'symmetric-functions', 'weight-spaces', 'weyl-orbit'],
  'double_young_diagram.html': ['grassmannian', 'kostka', 'kronecker', 'plethysm', 'schur', 'schur-functor', 'symmetric-polynomials'],
  'higher_dimensional_slice_calculator.html': ['active-object', 'frame', 'frame-json', 'position'],
  'mosaic_calculator.html': ['degenerations', 'dual-graph'],
  'matrix_calculator.html': ['operation'],
  'sheaf_calculator.html': ['classes', 'hodge', 'saved-formulas', 'step-classes'],
  'theorem_graph_calculator.html': ['current-node', 'selected-references'],
  'sheaf_complex_calculator.html': ['classes', 'complex-chart', 'hodge', 'saved-formulas', 'step-classes']
};

assert.deepStrictEqual(activePages.sort(), expectedPages.sort(), 'index.html active calculator coverage changed');

const adapter = fs.readFileSync(path.join(__dirname, 'import_export_page_adapters.js'), 'utf8');
const panelCss = fs.readFileSync(path.join(root, 'css', 'import_export_panel.css'), 'utf8');
assert.ok(adapter.includes('const compatibleImportInput = config.input'));
assert.ok(adapter.includes('const syncLegacyInput = () =>'));
assert.ok(adapter.includes("legacyInputs: { matrix: '#import-text' }"));
assert.ok(adapter.includes("row('Export content'"), 'generic panels must identify export content');
assert.ok(adapter.includes("row('Import content'"), 'generic panels must identify import content');
assert.ok(adapter.includes("row('Format'"), 'generic panels must identify import and export formats');
assert.ok(adapter.includes('exporterDescriptors[name]'), 'external exports must be registered as selectable content');
assert.ok(adapter.includes('describe(prepared)'), 'import adapters must report detected content and format');
assert.ok(panelCss.includes('margin-inline: auto'), 'shared tabs must remain centered');
assert.ok(panelCss.includes('@media (max-width: 520px)'), 'shared controls need a narrow-layout rule');
assert.ok(panelCss.includes('grid-template-columns: 116px minmax(0, 1fr)'), 'shared field rows must match calculator setup rows');
assert.ok(panelCss.includes('.import-export-panel select'), 'shared selects must not inherit native browser styling');
assert.ok(panelCss.includes('.import-export-panel .import-export-textarea'), 'adopted and generated textareas need one shared skin');
assert.ok(panelCss.includes('background: var(--bg) !important'), 'shared editors must use the calculator input background');
assert.ok(panelCss.includes("font-size: 0.78rem !important"), 'shared textareas must keep compact editor typography');
assert.ok(panelCss.includes('.import-export-filename:empty'), 'an empty file name must not reserve an extra text row');
assert.ok(panelCss.includes('.import-export-field-value'), 'fixed metadata needs a shared read-only presentation');
activePages.forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(html.includes('css/import_export_panel.css'), `${file} must load the shared panel CSS`);
  assert.ok(html.includes('js/import_export_panel.js'), `${file} must load the shared panel engine`);

  if (file === 'ramified_minigames.html') {
    assert.ok(html.includes('id="ramified-import-export-panel"'), `${file} must mount its localized panel`);
  } else {
    assert.ok(html.includes('js/import_export_page_adapters.js'), `${file} must load the shared page adapter`);
    assert.ok(adapter.includes(`'${file}': {`), `${file} must have a registered page adapter`);
  }

  const triggerMatches = Array.from(html.matchAll(/<button\b[^>]*data-import-export-trigger="([^"]+)"[^>]*>/g));
  triggerMatches.forEach((match) => {
    assert.ok(match[1].trim(), `${file} has an empty delegated exporter name`);
    assert.ok(/data-export-filename="[^"]+"/.test(match[0]), `${file} trigger ${match[1]} needs a stable filename`);
  });
  assert.deepStrictEqual(
    triggerMatches.map((match) => match[1]).sort(),
    (expectedExternalExporters[file] || []).slice().sort(),
    `${file} external exporter coverage changed`
  );
});

[
  'old_matrix_calculator.html',
  'ramified_minigames_guide.html',
  'ramified_minigames_production_history.html'
].forEach((file) => {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return;
  const html = fs.readFileSync(target, 'utf8');
  assert.ok(!html.includes('import_export_page_adapters.js'), `${file} must remain outside the active migration`);
});

console.log(`site_import_export_coverage_test: ${activePages.length} active calculators covered`);
