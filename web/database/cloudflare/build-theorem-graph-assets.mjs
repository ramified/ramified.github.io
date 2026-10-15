import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const output = path.resolve(here, '.theorem-assets');
// Only an explicit allowlist is published: no source repository, credentials,
// deployment configuration, tests, or unrelated calculators.
const files = [
  'theorem_graph_calculator.html', 'theorem_graph_ai_guide.html',
  'css/site.css', 'css/import_export_panel.css', 'css/theorem_graph_personal.css',
  'js/calculator_cards.js', 'js/calculator_input_settings.js',
  'js/theorem_graph_cloud_config.js', 'js/theorem_graph_storage.js',
  'js/theorem_graph_personal.js', 'js/theorem_graph_calculator.js',
  'js/import_export_panel.js', 'js/import_export_page_adapters.js',
  ...(await fs.readdir(path.join(root, 'presets/theorem_graph')))
    .filter(file => file.endsWith('.js')).map(file => `presets/theorem_graph/${file}`)
];
if (path.dirname(output) !== here || path.basename(output) !== '.theorem-assets') throw new Error('Invalid build directory.');
await fs.rm(output, { recursive: true, force: true });
for (const file of files) {
  let content = await fs.readFile(path.join(root, file));
  if (file === 'theorem_graph_calculator.html') {
    content = Buffer.from(content.toString('utf8')
      .replace('<script id="theorem-preset-registry"', '<script>window.THEOREM_GRAPH_API_BASE = "/api/theorem";</script>\n<script id="theorem-preset-registry"')
      .replace('href="index.html"', 'href="https://ramified.github.io/web/database/index.html"'));
  }
  const target = path.join(output, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}
console.log(`Built ${files.length} personal-editor assets in ${output}`);
