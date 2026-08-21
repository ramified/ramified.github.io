const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ramified_minigames.html'), 'utf8');
const setup = fs.readFileSync(path.join(__dirname, 'ramified_minigames_setup.js'), 'utf8');
const locales = fs.readFileSync(path.join(__dirname, 'i18n', 'ramified_minigames_locales.js'), 'utf8');

assert.ok(html.includes('css/import_export_panel.css'));
assert.ok(html.includes('js/import_export_panel.js'));
assert.ok(html.includes('id="ramified-import-export-panel"'));
assert.ok(html.includes('role="tablist"'));
assert.ok(html.includes('data-import-export-tab="export"'));
assert.ok(html.includes('data-import-export-tab="import"'));
assert.ok(html.includes('data-import-source-panel="file"'));
assert.ok(html.includes('id="import-state-file"'));
assert.ok(html.includes('id="download-state"'));
assert.ok(html.includes('id="debug-export-output" data-export-output'));
assert.ok(html.includes('aria-label="Current game status or preset export" readonly'));
assert.ok(html.includes('data-export-content'));
assert.ok(html.includes('data-export-format-value'));
assert.ok(html.includes('data-import-content-value'));
assert.ok(html.includes('data-import-format-value'));

assert.ok(setup.includes('window.ImportExportPanel.mount'));
assert.ok(setup.includes("id: 'ramified-minigames'"));
assert.ok(setup.includes("defaultExporter: 'status'"));
assert.ok(setup.includes('exporters:'));
assert.ok(setup.includes("produce: () => exportSharedContent('background')"));
assert.ok(setup.includes("produce: () => exportSharedContent('record')"));
assert.ok(setup.includes('describeImport(prepared)'));
assert.ok(setup.includes('prepareImportRequest(request)'));
assert.ok(setup.includes('applyPreparedImport(prepared)'));
assert.ok(setup.includes('confirmActiveGameReplacement()'));
assert.ok(setup.includes("? 'ramified-minigame-background.json'"));
assert.ok(setup.includes("? 'ramified-minigame-record.json'"));
assert.ok(setup.includes(": 'ramified-minigame-status.json'"));
assert.ok(setup.includes("mimeType: 'application/json'"));
assert.ok(setup.includes("kind: 'ramified-minigame-record'"));

[
  'io.tabExport',
  'io.tabImport',
  'io.localFile',
  'io.chooseFile',
  'io.exportDownloaded',
  'io.fileReady',
  'io.exportContent',
  'io.importContent',
  'io.autoDetect',
  'io.detectedFormat',
  'io.replaceConfirm'
].forEach((key) => assert.ok(locales.includes(`'${key}'`), `missing locale key ${key}`));

console.log('ramified_minigames_import_export_test: all tests passed');
