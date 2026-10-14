'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mosaic = require('./mosaic_calculator.js').__test;
const root = path.resolve(__dirname, '..');
const htmlFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
  return entry.isDirectory() ? htmlFiles(file) : (entry.name.endsWith('.html') ? [file] : []);
});

// Resolve URLs using the page's HTML base, including nested legacy interfaces.
let checked = 0;
for (const file of htmlFiles(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const html = fs.readFileSync(file, 'utf8');
  const toolkitPrefix = '/web/database/';
  const pageUrl = new URL(relative, `https://local.test${toolkitPrefix}`);
  const base = new URL(html.match(/<base\s+href="([^"]+)"/)?.[1] || '', pageUrl);
  for (const [, value] of html.replace(/<base\b[^>]*>/gi, '').matchAll(/\b(?:src|href|data-preview-key)="([^"]+)"/g)) {
    if (/^(?:#|https?:|data:|javascript:|mailto:|tel:|\/\/)/i.test(value) || value.includes('{{')) continue;
    const url = new URL(value.replaceAll('&amp;', '&'), base);
    assert(url.pathname.startsWith(toolkitPrefix), `${relative}: ${value} escapes the toolkit directory`);
    assert(fs.existsSync(path.join(root, decodeURIComponent(url.pathname.slice(toolkitPrefix.length)))), `${relative}: missing ${value}`);
    checked++;
  }
}

for (const entry of require('../presets/ramified_minigames/presets.js').presets) {
  assert(fs.existsSync(path.join(root, 'presets/ramified_minigames', entry.file)), `Missing minigame preset: ${entry.file}`);
  const spec = require(path.join(root, 'presets/ramified_minigames', entry.file));
  const payload = mosaic.normalizeExportImportPayload(mosaic.materializeMinigamePresetForMosaic(entry, spec));
  assert(payload.rows > 0 && payload.cols > 0, `${entry.id}: moved preset must still materialize a board`);
}

// Old exported headers carry registry metadata used when importing shared boards.
const metadata = { id: 'header-compatibility', key: 'header_compatibility', file: 'header_compatibility.preset.js', gameTypes: ['Gomoku', 'Go'] };
const payload = { id: metadata.id, label: 'Shared board', lattice: 'square', size: '4x4' };
for (const folder of ['presets/ramified_minigames', 'ramified_minigame_presets']) {
  const source = `// Save this file as ${folder}/${metadata.file}\n// Add this entry to ${folder}/presets.js:\n${JSON.stringify(metadata, null, 2).split('\n').map(line => '// ' + line).join('\n')}\n(function () { return ${JSON.stringify(payload)}; })();`;
  const parsed = mosaic.parseExportImportText(source);
  assert.deepEqual(parsed.metadata, metadata, `${folder}: registry metadata must survive import`);
  assert.deepEqual(parsed.payload, payload, `${folder}: board data must survive import`);
}

console.log(`site_resource_paths_test: ${checked} local HTML references, minigame catalog files, and both export header formats passed`);
