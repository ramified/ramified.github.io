const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'place_ramification_calculator.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, 'place_ramification_calculator.js'), 'utf8');

[
  'ramification-input-mode', 'generic-base-kind', 'generic-q-control', 'generic-q',
  'generic-generator', 'generic-polynomial', 'generic-compute', 'show-infinite',
  'lmfdb-quadratic-shortcut', 'lmfdb-root-shortcut', 'lmfdb-zeta-shortcut',
  'lmfdb-shortcut-panel', 'Enter a quadratic field.', 'Runs locally in your browser'
].forEach((needle) => assert.ok(html.includes(needle), `missing generic calculator control: ${needle}`));

['lmfdb-square-d', 'lmfdb-root-n', 'lmfdb-root-d', 'lmfdb-zeta-n'].forEach((id) => {
  const tag = html.match(new RegExp(`<input id="${id}"[^>]*>`))?.[0] || '';
  assert.ok(tag, `missing shortcut parameter: ${id}`);
  assert.ok(!/\smax=/.test(tag), `${id} must not have a user-facing upper bound`);
});

const baseKindIndex = html.indexOf('id="generic-base-kind"');
const qControlIndex = html.indexOf('id="generic-q-control" class="ramification-q-control" hidden');
const generatorIndex = html.indexOf('id="generic-generator"');
assert.ok(baseKindIndex >= 0 && qControlIndex > baseKindIndex && generatorIndex > qControlIndex,
  'q control must share the Base K row');
assert.ok(html.includes('<span>\\(q\\)</span>'), 'q control label must be lowercase');

[
  'Offline quadratic fallback', 'value="quadratic"', 'id="quadratic-d"',
  'id="quadratic-fallback"', 'data-d='
].forEach((needle) => assert.ok(!html.includes(needle), `obsolete quadratic UI remains: ${needle}`));

[
  'function computeGenericExtension()', 'function normalizedGenericField()',
  "source: 'polynomial-extension'", 'version: 2', 'extraFinitePlaces',
  "field.source === 'generic'", 'browserNumberFieldDecomposition', 'bad prime (local data unavailable)'
].forEach((needle) => assert.ok(script.includes(needle), `missing generic calculator behavior: ${needle}`));

assert.ok(script.includes("rawSource === 'polynomial-extension'"), 'v2 polynomial exports must import');
assert.ok(script.includes("field.source === 'generic' ? 'finite places'"), 'function-field UI must not call places primes');
assert.ok(!script.includes('RAMIFICATION_CAS_URL'), 'browser-only calculator must not require a CAS endpoint');

[
  "source: 'lmfdb'", "inputMode: 'lmfdb'", 'alias = `Qsqrt(${d})`',
  'alias = `Qroot(${n},${d})`', 'alias = `Qzeta(${n})`', 'input.focus()',
  'input.setSelectionRange(alias.length, alias.length)',
  "$('generic-q-control').hidden = state.generic.baseKind !== 'Fqt'",
  'Offline quadratic exports are no longer supported', 'bindCards();\n    searchLmfdbField();'
].forEach((needle) => assert.ok(script.includes(needle), `missing compact LMFDB behavior: ${needle}`));

[
  "source: 'quadratic'", 'state.rawD', 'normalizedQuadraticField',
  'quadraticFinitePlace', 'quadraticInfinitePlace', 'generic-q-row'
].forEach((needle) => assert.ok(!script.includes(needle), `obsolete quadratic behavior remains: ${needle}`));

async function verifyRuntimeBehavior() {
  const ids = [...script.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
  const elements = new Map([...new Set(ids)].map((id) => [id, fakeElement(id)]));
  const domListeners = {};
  const fetchQueries = [];
  const document = {
    body: fakeElement('body'),
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener(type, handler) { (domListeners[type] ||= []).push(handler); },
    removeEventListener() {},
    createElement() { return fakeElement('created'); }
  };
  const shortcutIds = [
    'lmfdb-quadratic-shortcut', 'lmfdb-root-shortcut', 'lmfdb-zeta-shortcut',
    'lmfdb-shortcut-panel', 'lmfdb-square-fields', 'lmfdb-root-fields', 'lmfdb-zeta-fields',
    'lmfdb-square-d', 'lmfdb-root-n', 'lmfdb-root-d', 'lmfdb-zeta-n',
    'lmfdb-shortcut-insert', 'lmfdb-shortcut-close', 'lmfdb-shortcut-error'
  ];
  shortcutIds.forEach((id) => { if (!elements.has(id)) elements.set(id, fakeElement(id)); });
  shortcutIds.forEach((id) => { elements.get(id).insideShortcutEditor = true; });
  elements.get('lmfdb-shortcut-editor').contains = (target) => target === elements.get('lmfdb-shortcut-editor') || Boolean(target?.insideShortcutEditor);
  const window = {
    RAMIFICATION_LMFDB_PROXY_URL: 'https://example.test',
    devicePixelRatio: 1,
    addEventListener() {}
  };
  const context = vm.createContext({
    window, document, URL, console,
    fetch: async (url) => {
      const query = new URL(url).searchParams.get('q');
      fetchQueries.push(query);
      if (query === 'bad') {
        return { ok: false, async json() { return { error: 'Field not found.' }; } };
      }
      return {
        ok: true,
        async json() {
          return {
            query,
            queryType: query.startsWith('Qsqrt') ? 'nickname' : 'label',
            field: {
              label: query === '2.2.5.1' ? '2.2.5.1' : '2.2.5.1',
              degree: 2,
              coeffs: [-5, 0, 1],
              r2: 0,
              disc_abs: 5,
              disc_sign: 1,
              ramps: [5],
              local_algs: [],
              galois_label: '2T1'
            },
            extra: { frobs: [] },
            warnings: []
          };
        }
      };
    }
  });
  window.window = window;
  window.document = document;
  vm.runInContext(script, context);

  domListeners.DOMContentLoaded.forEach((handler) => handler());
  await settleAsyncWork();
  assert.deepStrictEqual(fetchQueries, ['2.2.5.1'], 'default LMFDB field must load automatically');
  assert.ok(elements.get('ramification-export-out').value.includes('"source": "LMFDB"'), 'startup must render the LMFDB export');

  const queryInput = elements.get('lmfdb-query');
  const shortcutPanel = elements.get('lmfdb-shortcut-panel');
  const quadraticButton = elements.get('lmfdb-quadratic-shortcut');
  const rootButton = elements.get('lmfdb-root-shortcut');
  const zetaButton = elements.get('lmfdb-zeta-shortcut');
  const squareD = elements.get('lmfdb-square-d');
  const rootN = elements.get('lmfdb-root-n');
  const rootD = elements.get('lmfdb-root-d');
  const zetaN = elements.get('lmfdb-zeta-n');

  quadraticButton.listeners.click();
  assert.strictEqual(shortcutPanel.hidden, false);
  assert.strictEqual(elements.get('lmfdb-square-fields').hidden, false);
  assert.strictEqual(elements.get('lmfdb-root-fields').hidden, true);
  assert.strictEqual(quadraticButton.attributes['aria-expanded'], 'true');
  assert.strictEqual(squareD.focused, true);
  assert.strictEqual(squareD.selected, true);
  assert.strictEqual(squareD.value, '2');
  squareD.value = '5';
  shortcutPanel.listeners.keydown({ key: 'Enter', preventDefault() {} });
  assert.strictEqual(queryInput.value, 'Qsqrt(5)');
  assert.strictEqual(shortcutPanel.hidden, true);
  assert.deepStrictEqual(queryInput.selection, [8, 8]);
  assert.strictEqual(fetchQueries.length, 1, 'shortcut insertion must not search');

  quadraticButton.listeners.click();
  assert.strictEqual(squareD.value, '5', 'quadratic parameter must be retained');
  rootButton.listeners.click();
  assert.strictEqual(elements.get('lmfdb-square-fields').hidden, true);
  assert.strictEqual(elements.get('lmfdb-root-fields').hidden, false);
  assert.strictEqual(rootN.value, '3');
  assert.strictEqual(rootD.value, '2');
  shortcutPanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(queryInput.value, 'Qroot(3,2)');
  assert.strictEqual(fetchQueries.length, 1, 'n-th root insertion must not search');

  zetaButton.listeners.click();
  assert.strictEqual(zetaN.value, '5');
  shortcutPanel.listeners.keydown({ key: 'Enter', preventDefault() {} });
  assert.strictEqual(queryInput.value, 'Qzeta(5)');
  assert.strictEqual(fetchQueries.length, 1, 'cyclotomic insertion must not search');

  rootButton.listeners.click();
  rootN.value = '9007199254740991';
  rootD.value = '-3';
  shortcutPanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(queryInput.value, 'Qroot(9007199254740991,-3)', 'safe integers must not receive an upper degree restriction');
  assert.strictEqual(fetchQueries.length, 1);

  rootButton.listeners.click();
  rootN.value = '1';
  shortcutPanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(shortcutPanel.hidden, false, 'invalid input must leave the editor open');
  assert.match(elements.get('lmfdb-shortcut-error').textContent, /at least 2/);
  assert.strictEqual(queryInput.value, 'Qroot(9007199254740991,-3)');
  rootN.value = '9007199254740992';
  shortcutPanel.listeners.submit({ preventDefault() {} });
  assert.match(elements.get('lmfdb-shortcut-error').textContent, /safe integer/);

  shortcutPanel.listeners.keydown({ key: 'Escape', preventDefault() {} });
  assert.strictEqual(shortcutPanel.hidden, true);
  assert.strictEqual(rootButton.focused, true, 'Escape must return focus to the active shortcut');

  zetaButton.listeners.click();
  domListeners.click.forEach((handler) => handler({ target: fakeElement('outside') }));
  assert.strictEqual(shortcutPanel.hidden, true, 'outside click must close the editor');

  quadraticButton.listeners.click();
  quadraticButton.listeners.click();
  assert.strictEqual(shortcutPanel.hidden, true, 'clicking the active shortcut must close the editor');

  queryInput.value = 'Qsqrt(5)';
  queryInput.listeners.input({ target: queryInput });
  let prevented = false;
  queryInput.listeners.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
  await settleAsyncWork();
  assert.strictEqual(prevented, true);
  assert.strictEqual(fetchQueries.at(-1), 'Qsqrt(5)');

  queryInput.value = 'Qroot(3,2)';
  queryInput.listeners.input({ target: queryInput });
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(fetchQueries.at(-1), 'Qroot(3,2)');

  queryInput.value = 'Qsqrt-3';
  queryInput.listeners.input({ target: queryInput });
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(fetchQueries.at(-1), 'Qsqrt-3');

  queryInput.value = 'bad';
  queryInput.listeners.input({ target: queryInput });
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(elements.get('lmfdb-search-status').textContent, 'Field not found.');
  assert.strictEqual(elements.get('ramification-export-out').value, '', 'failed searches must leave an empty chart state');

  queryInput.value = 'Qsqrt5';
  queryInput.listeners.input({ target: queryInput });
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.ok(elements.get('ramification-export-out').value.includes('"source": "LMFDB"'), 'LMFDB retry must recover after an error');

  const baseKind = elements.get('generic-base-kind');
  baseKind.value = 'Fqt';
  baseKind.listeners.change({ target: baseKind });
  assert.strictEqual(elements.get('generic-q-control').hidden, false, 'q must appear for F_q(t)');
  baseKind.value = 'Q';
  baseKind.listeners.change({ target: baseKind });
  assert.strictEqual(elements.get('generic-q-control').hidden, true, 'q must stay hidden over Q');

  const infinity = elements.get('show-infinite');
  infinity.checked = false;
  infinity.listeners.change({ target: infinity });
  assert.ok(elements.get('ramification-export-out').value.includes('"showInfinite": false'), 'infinity toggle must update exports');

  assert.throws(
    () => window.SiteImportExportPageAdapter.validateImport('', { text: JSON.stringify({ source: 'quadratic', squarefreeD: 5 }) }),
    /no longer supported/
  );
}

function fakeElement(id) {
  const listeners = {};
  const classList = { add() {}, remove() {}, toggle() {} };
  const canvasContext = new Proxy({}, { get: () => () => {} });
  const defaults = {
    'lmfdb-query': '2.2.5.1', 'prime-bound': '11', 'generic-base-kind': 'Q',
    'generic-q': '3', 'generic-generator': 'alpha', 'generic-polynomial': 'x^2-2',
    'ramification-input-mode': 'lmfdb', 'lmfdb-square-d': '2', 'lmfdb-root-n': '3',
    'lmfdb-root-d': '2', 'lmfdb-zeta-n': '5'
  };
  return {
    id, listeners, classList, style: {}, dataset: {}, attributes: {}, parentElement: { clientWidth: 920 },
    value: defaults[id] || '', textContent: '', innerHTML: '',
    hidden: id === 'generic-q-control' || id === 'lmfdb-shortcut-panel' || id.endsWith('-fields'),
    checked: id === 'show-infinite', disabled: false, open: false, width: 920, height: 340,
    addEventListener(type, handler) { listeners[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    getContext() { return canvasContext; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 920, height: 340 }; },
    closest() { return null; },
    focus() { this.focused = true; },
    select() { this.selected = true; },
    setSelectionRange(start, end) { this.selection = [start, end]; },
    setCustomValidity(message) { this.validationMessage = message; },
    reportValidity() { this.reportedValidity = true; return !this.validationMessage; },
    contains(target) { return target === this; }
  };
}

async function settleAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

verifyRuntimeBehavior()
  .then(() => console.log('place_ramification_calculator_test: natural-name shortcuts and compact field inputs pass'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
