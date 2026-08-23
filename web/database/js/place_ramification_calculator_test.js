const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const localEngine = require('./place_ramification_engine.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'place_ramification_calculator.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, 'place_ramification_calculator.js'), 'utf8');

[
  'Extension \\(E/F\\)', 'id="base-field-kind"', 'id="base-lmfdb-selector"',
  'id="extension-input-kind"', 'id="extension-lmfdb-selector"', 'id="polynomial-extension"',
  'id="generic-q-control"', '<span>\\(q\\)</span>', 'id="show-infinite"',
  'id="base-lmfdb-root-shortcut"', 'id="lmfdb-root-shortcut"',
  'place_ramification_engine.js', 'Places of \\(E\\) above places of \\(F\\)'
].forEach((needle) => assert.ok(html.includes(needle), 'missing extension workflow UI: ' + needle));

[
  'ramification-input-mode', 'generic-base-kind', 'Offline quadratic fallback',
  'value="quadratic"', 'id="quadratic-d"', 'id="quadratic-fallback"'
].forEach((needle) => assert.ok(!html.includes(needle), 'obsolete source-oriented UI remains: ' + needle));

[
  'lmfdb-root-n', 'lmfdb-root-d', 'lmfdb-zeta-n',
  'base-lmfdb-root-n', 'base-lmfdb-root-d', 'base-lmfdb-zeta-n'
].forEach((id) => {
  const tag = html.match(new RegExp('<input id="' + id + '"[^>]*>'))?.[0] || '';
  assert.ok(tag, 'missing shortcut parameter: ' + id);
  assert.ok(!/\smax=/.test(tag), id + ' must not have a user-facing upper bound');
});

[
  "source: 'field-extension'", 'version: 3', 'function lookupLmfdbSelector(role)',
  'function importedLmfdbField(definition)', 'function normalizedImportedLocalResponse(response)',
  'place_ramification_worker.js', 'localWorker.terminate()', 'lmfdb-local-decomposition-unavailable',
  'The configured LMFDB proxy does not support this field-name syntax yet.'
].forEach((needle) => assert.ok(script.includes(needle), 'missing extension behavior: ' + needle));

[
  'LMFDB_SHORTCUTS', 'searchLmfdbField', 'browserNumberFieldDecomposition',
  'parseBrowserIntegerPolynomial', 'state.inputMode', "source: 'quadratic'"
].forEach((needle) => assert.ok(!script.includes(needle), 'obsolete calculator branch remains: ' + needle));

assert.ok(!script.includes('RAMIFICATION_CAS_URL'), 'local arithmetic must not depend on a hosted CAS');

async function verifyRuntimeBehavior() {
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
  const elements = new Map(ids.map((id) => [id, fakeElement(id)]));
  const domListeners = {};
  const fetchQueries = [];
  const exampleButtons = ['number', 'relative', 'function'].map((example) => {
    const button = fakeElement('example-' + example);
    button.dataset.genericExample = example;
    return button;
  });
  const lmfdbOption = fakeElement('extension-lmfdb-option');
  elements.get('extension-input-kind').querySelector = (selector) =>
    selector === 'option[value="lmfdb"]' ? lmfdbOption : null;

  configureShortcutContainment(elements, 'extension', [
    'lmfdb-shortcut-editor', 'lmfdb-shortcut-panel', 'lmfdb-quadratic-shortcut',
    'lmfdb-root-shortcut', 'lmfdb-zeta-shortcut', 'lmfdb-square-fields',
    'lmfdb-root-fields', 'lmfdb-zeta-fields', 'lmfdb-square-d',
    'lmfdb-root-n', 'lmfdb-root-d', 'lmfdb-zeta-n', 'lmfdb-shortcut-close'
  ]);
  configureShortcutContainment(elements, 'base', [
    'base-lmfdb-shortcut-editor', 'base-lmfdb-shortcut-panel',
    'base-lmfdb-quadratic-shortcut', 'base-lmfdb-root-shortcut',
    'base-lmfdb-zeta-shortcut', 'base-lmfdb-square-fields',
    'base-lmfdb-root-fields', 'base-lmfdb-zeta-fields', 'base-lmfdb-square-d',
    'base-lmfdb-root-n', 'base-lmfdb-root-d', 'base-lmfdb-zeta-n',
    'base-lmfdb-shortcut-close'
  ]);

  const document = {
    body: fakeElement('body'),
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      if (selector === '[data-generic-example]') return exampleButtons;
      return [];
    },
    querySelector() { return null; },
    addEventListener(type, handler) { (domListeners[type] ||= []).push(handler); },
    removeEventListener() {},
    createElement() { return fakeElement('created'); }
  };
  const window = {
    RAMIFICATION_LMFDB_PROXY_URL: 'https://example.test',
    RamificationLocalEngine: localEngine,
    devicePixelRatio: 1,
    addEventListener() {}
  };
  let zeta7Attempts = 0;
  const context = vm.createContext({
    window,
    document,
    URL,
    console,
    fetch: async (url) => {
      const query = new URL(url).searchParams.get('q');
      fetchQueries.push(query);
      if (query === 'bad' || query === 'base-bad') {
        return mockResponse(false, 404, { error: 'Field not found.' });
      }
      if (query === 'Qzeta(7)' && zeta7Attempts++ === 0) {
        return mockResponse(false, 400, {
          error: 'Enter a monic integer polynomial in expanded form, such as x^3-x-1.'
        });
      }
      const label = query === 'Qzeta(7)' ? '6.0.16807.1' : '2.2.5.1';
      return mockResponse(true, 200, lmfdbPayload(query, label));
    }
  });
  window.window = window;
  window.document = document;
  vm.runInContext(script, context);

  domListeners.DOMContentLoaded.forEach((handler) => handler());
  await settleAsyncWork();
  assert.deepStrictEqual(fetchQueries, ['2.2.5.1'], 'default E/Q field must load automatically');
  let exported = parseExport(elements);
  assert.strictEqual(exported.version, 3);
  assert.strictEqual(exported.source, 'field-extension');
  assert.strictEqual(exported.base.kind, 'Q');
  assert.strictEqual(exported.extension.kind, 'lmfdb');
  assert.strictEqual(exported.extension.label, '2.2.5.1');

  const extensionQuery = elements.get('lmfdb-query');
  const extensionPanel = elements.get('lmfdb-shortcut-panel');
  const rootButton = elements.get('lmfdb-root-shortcut');
  rootButton.listeners.click();
  assert.strictEqual(extensionPanel.hidden, false);
  assert.strictEqual(elements.get('lmfdb-root-fields').hidden, false);
  elements.get('lmfdb-root-n').value = '9007199254740991';
  elements.get('lmfdb-root-d').value = '-3';
  extensionPanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(extensionQuery.value, 'Qroot(9007199254740991,-3)');
  assert.deepStrictEqual(extensionQuery.selection, [extensionQuery.value.length, extensionQuery.value.length]);
  assert.strictEqual(fetchQueries.length, 1, 'shortcut insertion must not search');

  rootButton.listeners.click();
  assert.strictEqual(elements.get('lmfdb-root-n').value, '9007199254740991', 'shortcut parameters must be retained');
  extensionPanel.listeners.keydown({ key: 'Escape', preventDefault() {} });
  assert.strictEqual(extensionPanel.hidden, true);
  assert.strictEqual(rootButton.focused, true, 'Escape must return focus to the shortcut');

  elements.get('lmfdb-zeta-shortcut').listeners.click();
  elements.get('lmfdb-zeta-n').value = '7';
  extensionPanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(extensionQuery.value, 'Qzeta(7)');
  const committedBeforeFailure = elements.get('ramification-export-out').value;
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.match(elements.get('lmfdb-search-status').textContent, /does not support this field-name syntax yet/);
  assert.strictEqual(elements.get('ramification-export-out').value, committedBeforeFailure, 'failed lookup must preserve the committed chart');

  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  exported = parseExport(elements);
  assert.strictEqual(exported.extension.label, '6.0.16807.1');
  assert.strictEqual(exported.extension.query, 'Qzeta(7)');

  extensionQuery.value = 'bad';
  extensionQuery.listeners.input({ target: extensionQuery });
  const committedZeta = elements.get('ramification-export-out').value;
  await elements.get('lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(elements.get('lmfdb-search-status').textContent, 'Field not found.');
  assert.strictEqual(elements.get('ramification-export-out').value, committedZeta);

  const baseKind = elements.get('base-field-kind');
  baseKind.value = 'lmfdb';
  baseKind.listeners.change({ target: baseKind });
  await settleAsyncWork();
  assert.strictEqual(elements.get('base-lmfdb-selector').hidden, false);
  assert.strictEqual(elements.get('extension-lmfdb-selector').hidden, true);
  assert.strictEqual(elements.get('polynomial-extension').hidden, false);
  assert.strictEqual(lmfdbOption.disabled, true);
  assert.strictEqual(parseExport(elements).base.kind, 'Q', 'changing a draft base must not alter the committed extension');

  const basePanel = elements.get('base-lmfdb-shortcut-panel');
  elements.get('base-lmfdb-quadratic-shortcut').listeners.click();
  elements.get('base-lmfdb-square-d').value = '5';
  basePanel.listeners.submit({ preventDefault() {} });
  assert.strictEqual(elements.get('base-lmfdb-query').value, 'Qsqrt(5)');
  assert.strictEqual(elements.get('base-lmfdb-query').focused, true);
  await elements.get('base-lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.match(elements.get('base-lmfdb-status').textContent, /Loaded 2\.2\.5\.1/);

  const committedBeforeBaseFailure = elements.get('ramification-export-out').value;
  setInput(elements, 'base-lmfdb-query', 'base-bad');
  await elements.get('base-lmfdb-search').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(elements.get('base-lmfdb-status').textContent, 'Field not found.');
  assert.strictEqual(elements.get('ramification-export-out').value, committedBeforeBaseFailure);

  setInput(elements, 'generic-polynomial', 'x^2-(a+1)/2');
  await elements.get('generic-compute').listeners.click();
  await settleAsyncWork();
  const relativeExportText = elements.get('ramification-export-out').value;
  exported = JSON.parse(relativeExportText);
  assert.strictEqual(exported.base.kind, 'lmfdb');
  assert.strictEqual(exported.base.label, '2.2.5.1');
  assert.ok(Array.isArray(exported.base.zk));
  assert.strictEqual(exported.extension.kind, 'polynomial');
  assert.strictEqual(exported.engine.arithmetic, 'browser-local');
  assert.ok(exported.places.every((place) =>
    place.status === 'resolved' || place.components.every((component) => component.e == null && component.f == null)
  ));

  baseKind.value = 'Fqt';
  baseKind.listeners.change({ target: baseKind });
  assert.strictEqual(elements.get('generic-q-control').hidden, false);
  assert.strictEqual(elements.get('prime-bound-control').hidden, true);
  assert.strictEqual(lmfdbOption.disabled, true);
  setInput(elements, 'generic-q', '3');
  setInput(elements, 'generic-polynomial', 'x^2-t');
  await elements.get('generic-compute').listeners.click();
  await settleAsyncWork();
  exported = parseExport(elements);
  assert.strictEqual(exported.base.kind, 'Fqt');
  assert.strictEqual(exported.selection.rationalPrimeBound, null);
  assert.ok(exported.places.some((place) => place.place === 't'), 'function-field discriminant places must be added automatically');

  baseKind.value = 'Q';
  baseKind.listeners.change({ target: baseKind });
  assert.strictEqual(elements.get('generic-q-control').hidden, true);
  assert.strictEqual(elements.get('prime-bound-control').hidden, false);
  assert.strictEqual(lmfdbOption.disabled, false);
  setInput(elements, 'generic-polynomial', 'x^2+1');
  elements.get('prime-bound').value = '2';
  elements.get('prime-bound').listeners.input({ target: elements.get('prime-bound') });
  await settleAsyncWork();
  exported = parseExport(elements);
  const unresolved = exported.places.find((place) => place.id === 'Q:2');
  assert.ok(unresolved);
  assert.strictEqual(unresolved.status, 'unresolved');
  assert.strictEqual(unresolved.g, null);
  assert.ok(unresolved.components.every((component) => component.e == null && component.f == null));
  assert.match(elements.get('decomposition-table').innerHTML, />\?</);

  let workerInstance = null;
  class PendingWorker {
    constructor() {
      this.listeners = {};
      this.terminated = false;
      workerInstance = this;
    }
    addEventListener(type, handler) { this.listeners[type] = handler; }
    postMessage() {}
    terminate() { this.terminated = true; }
  }
  window.Worker = PendingWorker;
  setInput(elements, 'generic-polynomial', 'x^2-2');
  const pendingComputation = elements.get('generic-compute').listeners.click();
  await settleAsyncWork();
  assert.strictEqual(elements.get('generic-compute').textContent, 'cancel');
  await elements.get('generic-compute').listeners.click();
  await pendingComputation;
  assert.strictEqual(workerInstance.terminated, true, 'cancelling must terminate the active worker');
  delete window.Worker;

  const adapter = window.SiteImportExportPageAdapter;
  const preparedV3 = adapter.validateImport('json', { text: relativeExportText });
  adapter.applyImport('json', preparedV3);
  exported = parseExport(elements);
  assert.strictEqual(exported.base.kind, 'lmfdb');
  assert.strictEqual(exported.extension.kind, 'polynomial');

  const legacyLmfdb = {
    calculator: 'Place ramification calculator',
    version: 1,
    source: 'LMFDB',
    query: '2.2.5.1',
    queryType: 'label',
    lmfdbLabel: '2.2.5.1',
    field: {
      degree: 2,
      coeffs: [-1, -1, 1],
      discriminant: 5,
      signature: '(2, 0)',
      ramifiedPrimes: [5],
      galoisLabel: '2T1'
    },
    primeBound: 7,
    showInfinite: false,
    raw: { local_algs: ['5.1.2'], frobs: [] }
  };
  adapter.applyImport('json', adapter.validateImport('json', { text: JSON.stringify(legacyLmfdb) }));
  exported = parseExport(elements);
  assert.strictEqual(exported.version, 3);
  assert.strictEqual(exported.base.kind, 'Q');
  assert.strictEqual(exported.extension.kind, 'lmfdb');
  assert.ok(exported.extension.fieldSnapshot);

  const legacyResponse = localEngine.compute({
    schemaVersion: 1,
    base: { kind: 'Q' },
    extension: { kind: 'polynomial', generator: 'alpha', polynomial: 'x^2-2' },
    selection: { bound: 3, includeInfinite: false }
  });
  const legacyPolynomial = {
    calculator: 'Place ramification calculator',
    version: 2,
    source: 'polynomial-extension',
    base: legacyResponse.base,
    extension: legacyResponse.extension,
    selection: { bound: 3, includeInfinite: false, extraFinitePlaces: [], hiddenPlaces: [] },
    response: legacyResponse
  };
  adapter.applyImport('json', adapter.validateImport('json', { text: JSON.stringify(legacyPolynomial) }));
  exported = parseExport(elements);
  assert.strictEqual(exported.version, 3);
  assert.strictEqual(exported.base.kind, 'Q');
  assert.strictEqual(exported.extension.kind, 'polynomial');

  assert.throws(
    () => adapter.validateImport('json', { text: JSON.stringify({ source: 'quadratic', squarefreeD: 5 }) }),
    /no longer supported/
  );
  assert.throws(
    () => adapter.validateImport('json', {
      text: JSON.stringify({
        version: 3,
        source: 'field-extension',
        base: { kind: 'Fqt', q: '3' },
        extension: {
          kind: 'lmfdb',
          fieldSnapshot: { label: '2.2.5.1', coeffs: [-1, -1, 1] }
        }
      })
    }),
    /only valid over Q/
  );
}

function configureShortcutContainment(elements, role, ids) {
  ids.forEach((id) => {
    const element = elements.get(id);
    if (element) element.shortcutRole = role;
  });
  const editorId = role === 'base' ? 'base-lmfdb-shortcut-editor' : 'lmfdb-shortcut-editor';
  elements.get(editorId).contains = (target) => target === elements.get(editorId) || target?.shortcutRole === role;
}

function setInput(elements, id, value) {
  const input = elements.get(id);
  input.value = value;
  input.listeners.input({ target: input });
}

function parseExport(elements) {
  return JSON.parse(elements.get('ramification-export-out').value);
}

function mockResponse(ok, status, payload) {
  return { ok, status, async json() { return payload; } };
}

function lmfdbPayload(query, label) {
  const cyclotomic = label === '6.0.16807.1';
  return {
    proxyApiVersion: 2,
    capabilities: ['natural-name-resolver', 'Qsqrt', 'Qroot', 'Qzeta'],
    query,
    queryType: /^Qzeta/i.test(query) ? 'cyclotomic' : /^Qsqrt/i.test(query) ? 'nickname' : 'label',
    normalizedInput: query,
    canonicalLabel: label,
    field: cyclotomic
      ? {
        label,
        degree: 6,
        coeffs: [1, 1, 1, 1, 1, 1, 1],
        r2: 3,
        disc_abs: 16807,
        disc_sign: 1,
        ramps: [7],
        local_algs: ['7.1.6'],
        galois_label: '6T1'
      }
      : {
        label,
        degree: 2,
        coeffs: [-1, -1, 1],
        r2: 0,
        disc_abs: 5,
        disc_sign: 1,
        ramps: [5],
        local_algs: ['5.1.2'],
        galois_label: '2T1'
      },
    extra: { label, frobs: [], zk: ['1', 'a'] },
    warnings: []
  };
}

function fakeElement(id) {
  const listeners = {};
  const classList = { add() {}, remove() {}, toggle() {} };
  const canvasTarget = {};
  const canvasContext = new Proxy(canvasTarget, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
  const defaults = {
    'lmfdb-query': '2.2.5.1',
    'base-lmfdb-query': '2.2.5.1',
    'base-field-kind': 'Q',
    'extension-input-kind': 'lmfdb',
    'prime-bound': '11',
    'generic-q': '3',
    'generic-generator': 'alpha',
    'generic-polynomial': 'x^2-2',
    'lmfdb-square-d': '2',
    'lmfdb-root-n': '3',
    'lmfdb-root-d': '2',
    'lmfdb-zeta-n': '5',
    'base-lmfdb-square-d': '2',
    'base-lmfdb-root-n': '3',
    'base-lmfdb-root-d': '2',
    'base-lmfdb-zeta-n': '5'
  };
  const initiallyHidden = id === 'generic-q-control'
    || id === 'base-lmfdb-selector'
    || id === 'polynomial-extension'
    || id.endsWith('-shortcut-panel')
    || id.endsWith('-fields');
  return {
    id,
    listeners,
    classList,
    style: {},
    dataset: {},
    attributes: {},
    parentElement: { clientWidth: 920 },
    value: defaults[id] || '',
    textContent: '',
    innerHTML: '',
    hidden: initiallyHidden,
    checked: id === 'show-infinite',
    disabled: false,
    width: 920,
    height: 340,
    addEventListener(type, handler) { listeners[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    querySelector() { return null; },
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
  .then(() => console.log('place_ramification_calculator_test: E/F workflow, proxy compatibility, and v3 imports pass'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
