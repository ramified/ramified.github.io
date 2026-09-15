import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { operations } from './kernel.mjs';
import { buildCatalog } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = buildCatalog(operations);
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const attr = (s, name) => s.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '';
for (const family of catalog.families) {
  family.migrationStatus = family.constructors.length || family.workingOperations.length ? 'partial' : 'not-started';
  family.acceptanceTest = 'node js/math_workspace/workspace_test.mjs';
  family.capabilities = [...family.constructors, ...family.workingOperations].map(op => ({ id: `${family.id}.${op.name}`, status: 'native', operation: op.name, version: op.version, acceptanceRecipe: op.example, validation: 'See operation smoke tests and workflow fixtures; native does not imply legacy parity.' }));
  // A source-control inventory is evidence to review, not an assertion that each
  // button is a separate mathematical feature or that disabled UI is unavailable.
  family.legacyEvidence = family.sources.filter(source => source.endsWith('.html')).flatMap(source => {
    const html = fs.readFileSync(path.join(root, source), 'utf8');
    const result = [];
    for (const match of html.matchAll(/<(button|select|canvas|input|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1\s*>|\/?>)/g)) {
      const [, tag, attrs, body = ''] = match, id = attr(attrs, 'id');
      if (!id) continue;
      const line = html.slice(0, match.index).split('\n').length;
      result.push({ id, source, line, element: tag, label: text(body) || attr(attrs, 'aria-label') || attr(attrs, 'title'), disabledInMarkup: /\bdisabled\b/.test(attrs), auditStatus: 'needs-semantic-review', migrationStatus: 'unmapped', destinationFamily: family.id });
    }
    return result;
  });
}
catalog.excludedApplications = ['theorem_graph_calculator.html', 'ramified_minigames.html'];
catalog.releaseGate = { complete: false, reason: 'Legacy evidence has not yet been fully mapped to working capability parity cases. See per-family limitations.' };
const output = `${JSON.stringify(catalog, null, 2)}\n`, target = path.join(root, 'assets/math_workspace_catalog.json');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(target, 'utf8') !== output) throw new Error('Catalog is stale: run node js/math_workspace/build_catalog.mjs');
} else fs.writeFileSync(target, output);
console.log(`${catalog.families.length} families, ${operations.size} native registry entries, ${catalog.families.reduce((n, f) => n + f.legacyEvidence.length, 0)} legacy controls to review; full parity: false`);
