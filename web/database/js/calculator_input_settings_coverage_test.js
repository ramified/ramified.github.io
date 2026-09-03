const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = {
  'young_diagrams.html': 'young-diagram',
  'double_young_diagram.html': 'double-young-diagram',
  'higher_dimensional_slice_calculator.html': 'higher-dimensional-slice',
  'mosaic_calculator.html': 'mosaic',
  'matrix_calculator.html': 'matrix',
  'dynkin_diagram_calculator.html': 'dynkin-diagram',
  'category_calculator.html': 'category',
  'theorem_graph_calculator.html': 'theorem-graph',
  'sheaf_complex_calculator.html': 'sheaf-complex',
  'sheaf_calculator.html': 'sheaf',
  'place_ramification_calculator.html': 'place-ramification',
  'strand_diagram_calculator.html': 'strand-diagram',
  'ramified_minigames.html': 'ramified-minigames'
};
const simpleProfiles = fs.readFileSync(path.join(__dirname, 'calculator_input_profiles.js'), 'utf8');
const cardSource = fs.readFileSync(path.join(__dirname, 'calculator_cards.js'), 'utf8');
const complexSources = [
  'higher_dimensional_slice_explorer.js',
  'mosaic_calculator.js',
  'theorem_graph_calculator.js',
  'ramified_minigames_setup.js'
].map((file) => fs.readFileSync(path.join(__dirname, file), 'utf8')).join('\n');

Object.entries(targets).forEach(([file, pageId]) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(html.includes('js/calculator_input_settings.js'), `${file} must load the shared settings module`);
  assert.ok(
    simpleProfiles.includes(`pageId: '${pageId}'`) || complexSources.includes(`pageId: '${pageId}'`) || complexSources.includes(`pageId: "${pageId}"`),
    `${file} must register pageId ${pageId}`
  );
  assert.ok(html.includes('data-shortcut-primary') || file === 'dynkin_diagram_calculator.html' || file === 'ramified_minigames.html' || file === 'sheaf_calculator.html', `${file} must mark contextual primary actions`);
});

assert.strictEqual(new Set(Object.values(targets)).size, Object.keys(targets).length, 'pageId values must be unique');
assert.ok(cardSource.includes('card.dataset.cardSettingsId = card.id || `card-${index + 1}`'), 'Every initialized card must receive a stable settings ID');
[
  'index.html',
  'citations.html',
  'guide.html',
  'ramified_minigames_guide.html',
  'ramified_minigames_production_history.html'
].forEach((file) => {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) return;
  assert.ok(!fs.readFileSync(target, 'utf8').includes('js/calculator_input_settings.js'), `${file} must remain outside keyboard-settings coverage`);
});

assert.ok(!complexSources.includes("window.addEventListener('keydown', handleGlobalKeyDown)"), 'Theorem Graph legacy shortcut listener must be removed');
assert.ok(!complexSources.includes("document.addEventListener('keydown', handleWanderKeyDown)"), 'Mosaic legacy shortcut listener must be removed');
assert.ok(!complexSources.includes('window.addEventListener("keydown", handleKeyboardDown)'), 'Higher Slice legacy shortcut listener must be removed');
assert.ok(complexSources.includes("pageId: 'ramified-minigames'"), 'Minigames must use the shared dispatcher');

console.log(`calculator_input_settings_coverage_test: ${Object.keys(targets).length} target pages covered with unique pageIds`);

const matrixHtml = fs.readFileSync(path.join(root, 'matrix_calculator.html'), 'utf8');
assert.ok(matrixHtml.includes('data-card-settings-id="polynomial-action" data-card-advanced="true"'), 'Polynomial action must be the default-hidden advanced card');
assert.strictEqual((matrixHtml.match(/data-card-advanced="true"/g) || []).length, 1, 'Only one card is advanced initially');
