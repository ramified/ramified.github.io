'use strict';

// Diagnostic companion to the normal fail-fast suites. Invoke every declared
// test, in source order, so the first old failure cannot hide later failures.
// This does not replace running each suite's normal entry point after repairs.
const fs = require('fs');
const path = require('path');
const Module = require('module');

async function audit() {
  let failures = 0;
  for (const name of ['ramified_minigames_setup_test.js', 'billiards/topological_billiards_test.js', 'mosaic_calculator_test.js']) {
    const file = path.join(__dirname, name);
    let source = fs.readFileSync(file, 'utf8');
    const names = [...source.matchAll(/^(?:async )?function (test\w+)\(/gm)].map(match => match[1]);
    // The setup suite already guards its entry point with require.main.
    if (name.startsWith('billiards/')) source = source.replace(/^run\(\);\s*$/m, '');
    if (name === 'mosaic_calculator_test.js') {
      const entry = source.indexOf('for (const test of tests) {');
      if (entry < 0) throw new Error('Calculator test entry point changed; update the audit adapter.');
      source = source.slice(0, entry);
    }
    source += `\nmodule.exports.audit = {${names.join(',')}};`;
    const loaded = new Module(file, module);
    loaded.filename = file;
    loaded.paths = Module._nodeModulePaths(path.dirname(file));
    loaded._compile(source, file);
    let passed = 0;
    for (const [testName, test] of Object.entries(loaded.exports.audit)) {
      try { await test(); passed++; }
      catch (error) {
        failures++;
        console.error(`FAIL ${name}: ${testName}\n${error.stack}`);
      }
    }
    console.log(`${name}: ${passed}/${names.length} passed`);
  }
  if (failures) process.exitCode = 1;
}

audit().catch(error => { console.error(error); process.exitCode = 1; });
