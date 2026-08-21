const assert = require('assert');
const ImportExportPanel = require('./import_export_panel.js');

class FakeElement {
  constructor(attributes = {}) {
    this.attributes = { ...attributes };
    this.listeners = {};
    this.hidden = false;
    this.disabled = false;
    this.readOnly = false;
    this.value = '';
    this.textContent = '';
    this.tabIndex = 0;
    this.files = [];
    this.options = [];
    this.children = [];
    this.clicked = false;
  }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler);
  }

  async emit(type, event = {}) {
    const payload = {
      target: this,
      currentTarget: this,
      key: '',
      preventDefault() { this.defaultPrevented = true; },
      ...event
    };
    for (const handler of this.listeners[type] || []) await handler(payload);
    return payload;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  focus() {
    this.focused = true;
  }

  select() {
    this.selected = true;
  }

  click() {
    this.clicked = true;
  }

  appendChild(child) {
    this.children.push(child);
    if (child && child.tagName === 'OPTION') {
      this.options.push(child);
      if (!this.value) this.value = child.value;
    }
    return child;
  }

  remove(index) {
    if (Number.isInteger(index)) this.options.splice(index, 1);
    else this.removed = true;
  }
}

function buildHarness(options = {}) {
  const exportTab = new FakeElement({ 'data-import-export-tab': 'export', 'aria-selected': 'true' });
  const importTab = new FakeElement({ 'data-import-export-tab': 'import', 'aria-selected': 'false' });
  const exportPanel = new FakeElement({ 'data-import-export-panel': 'export' });
  const importPanel = new FakeElement({ 'data-import-export-panel': 'import' });
  const catalogPanel = new FakeElement({ 'data-import-source-panel': 'catalog' });
  const filePanel = new FakeElement({ 'data-import-source-panel': 'file' });
  const status = new FakeElement();
  const exportKind = new FakeElement();
  exportKind.value = 'status';
  const exportFormat = new FakeElement();
  exportFormat.value = 'dsl';
  const exportFormatRow = new FakeElement();
  const exportContent = new FakeElement();
  const exportContentValue = new FakeElement();
  const exportFormatValue = new FakeElement();
  const exportOutput = new FakeElement();
  const exportRefresh = new FakeElement();
  const exportCopy = new FakeElement();
  const exportDownload = new FakeElement();
  const importSource = new FakeElement();
  importSource.value = 'catalog';
  const importKind = new FakeElement();
  importKind.value = options.importKind || '';
  const importCatalog = new FakeElement();
  importCatalog.value = 'classic';
  const importInput = new FakeElement();
  const importFile = new FakeElement();
  const importFilename = new FakeElement();
  const importContentValue = new FakeElement();
  const importFormatValue = new FakeElement();
  const importApply = new FakeElement();
  const importClear = new FakeElement();
  const selectors = new Map([
    ['[data-import-export-status]', status]
  ]);
  const root = new FakeElement();
  root.querySelector = (selector) => selectors.get(selector) || null;
  root.querySelectorAll = (selector) => {
    if (selector === '[data-import-export-tab]') return [exportTab, importTab];
    if (selector === '[data-import-export-panel]') return [exportPanel, importPanel];
    if (selector === '[data-import-source-panel]') return [catalogPanel, filePanel];
    return [];
  };
  const refs = {
    root,
    exportTab,
    importTab,
    exportPanel,
    importPanel,
    catalogPanel,
    filePanel,
    status,
    exportKind,
    exportContent,
    exportContentValue,
    exportFormat,
    exportFormatValue,
    exportFormatRow,
    exportOutput,
    exportRefresh,
    exportCopy,
    exportDownload,
    importSource,
    importKind,
    importContentValue,
    importFormatValue,
    importCatalog,
    importInput,
    importFile,
    importFilename,
    importApply,
    importClear
  };
  const controller = ImportExportPanel.mount(root, {
    id: options.id,
    eventRoot: options.eventRoot,
    translate: options.translate,
    exportOptions: {
      content: options.metadataUi ? exportContent : null,
      contentValue: options.metadataUi ? exportContentValue : null,
      kind: exportKind,
      format: exportFormat,
      formatValue: options.metadataUi ? exportFormatValue : null,
      formatRow: exportFormatRow,
      output: exportOutput,
      refresh: exportRefresh,
      copy: exportCopy,
      download: exportDownload
    },
    importOptions: {
      kind: importKind,
      contentValue: options.metadataUi ? importContentValue : null,
      formatValue: options.metadataUi ? importFormatValue : null,
      source: importSource,
      catalog: importCatalog,
      input: importInput,
      file: importFile,
      filename: importFilename,
      apply: importApply,
      clear: importClear
    },
    defaultExporter: options.defaultExporter,
    exporters: options.exporters,
    importers: options.importers,
    exportState: options.exportState || (() => '{"ok":true}'),
    readImport: options.readImport || ((context) => context.importText),
    validateImport: options.validateImport || ((text) => JSON.parse(text)),
    applyImport: options.applyImport || (() => undefined),
    confirmReplace: options.confirmReplace || (() => true),
    importDetectionDelay: options.importDetectionDelay,
    getFilename: options.getFilename || (() => 'ramified-minigame-status.json')
  });
  return { controller, refs };
}

async function run() {
  const originalDocument = global.document;
  const originalWindow = global.window;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const documentListeners = {};
  let downloadedLink = null;
  let downloadedBlob = null;
  let copiedText = '';
  global.document = {
    activeElement: null,
    body: { appendChild(link) { downloadedLink = link; } },
    documentElement: { appendChild(link) { downloadedLink = link; } },
    createElement(tag) {
      const element = new FakeElement();
      element.tagName = String(tag || '').toUpperCase();
      return element;
    },
    addEventListener(type, handler) { (documentListeners[type] ||= []).push(handler); },
    removeEventListener(type, handler) {
      documentListeners[type] = (documentListeners[type] || []).filter((item) => item !== handler);
    }
  };
  global.window = {};
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText(text) { copiedText = text; return Promise.resolve(); } } }
  });
  URL.createObjectURL = (blob) => {
    downloadedBlob = blob;
    return 'blob:test';
  };
  URL.revokeObjectURL = () => {};

  try {
    let locale = 'en';
    const messages = {
      en: {
        'io.exportRefreshed': 'Export refreshed.',
        'io.detectedFormat': '{{format}} detected',
        'io.detectedContent': '{{content}} detected',
        'io.importDetected': '{{content}} · {{format}} is ready to import.',
        'content.diagram': 'Young diagram',
        'format.partition': 'Partition text'
      },
      zh: {
        'io.exportRefreshed': '已刷新导出。',
        'io.detectedFormat': '已检测为 {{format}}',
        'io.detectedContent': '已检测为 {{content}}',
        'io.importDetected': '已识别 {{content}} · {{format}}，可以导入。',
        'content.diagram': '杨图',
        'format.partition': '分拆文本'
      }
    };
    const applied = [];
    let allowReplace = false;
    const { controller, refs } = buildHarness({
      translate(key) { return (messages[locale] && messages[locale][key]) || ''; },
      applyImport(value) { applied.push(value); },
      confirmReplace() { return allowReplace; }
    });

    assert.strictEqual(refs.exportPanel.hidden, false);
    assert.strictEqual(refs.importPanel.hidden, true);
    await refs.importTab.emit('click');
    assert.strictEqual(refs.exportPanel.hidden, true);
    assert.strictEqual(refs.importPanel.hidden, false);
    const keyboardEvent = await refs.importTab.emit('keydown', { key: 'ArrowLeft' });
    assert.strictEqual(keyboardEvent.defaultPrevented, true);
    assert.strictEqual(refs.exportTab.getAttribute('aria-selected'), 'true');
    assert.strictEqual(refs.exportTab.focused, true);

    refs.exportKind.value = 'background';
    await refs.exportKind.emit('change');
    assert.strictEqual(refs.exportFormatRow.hidden, false);
    refs.exportKind.value = 'status';
    await refs.exportKind.emit('change');
    assert.strictEqual(refs.exportFormatRow.hidden, true);

    await refs.exportRefresh.emit('click');
    assert.strictEqual(refs.exportOutput.value, '{"ok":true}');
    assert.strictEqual(refs.exportCopy.disabled, false);
    assert.strictEqual(refs.status.textContent, 'Export refreshed.');
    await refs.exportCopy.emit('click');
    assert.strictEqual(copiedText, '{"ok":true}');
    await refs.exportDownload.emit('click');
    assert.ok(downloadedLink && downloadedLink.clicked);
    assert.strictEqual(downloadedLink.download, 'ramified-minigame-status.json');

    refs.importSource.value = 'paste';
    await refs.importSource.emit('change');
    refs.importInput.value = '{"round":7}';
    await refs.importInput.emit('input');
    await refs.importApply.emit('click');
    assert.deepStrictEqual(applied, []);
    assert.ok(refs.status.textContent.includes('not changed'));
    allowReplace = true;
    await refs.importApply.emit('click');
    assert.deepStrictEqual(applied, [{ round: 7 }]);

    refs.importSource.value = 'file';
    await refs.importSource.emit('change');
    refs.importFile.files = [{ name: 'saved-game.json', text: () => Promise.resolve('{"round":8}') }];
    await refs.importFile.emit('change');
    assert.strictEqual(refs.importFilename.textContent, 'saved-game.json');
    assert.strictEqual(refs.importInput.value, '{"round":8}');
    assert.strictEqual(refs.importInput.readOnly, true);
    assert.strictEqual(applied.length, 1, 'selecting a file must not apply it');
    await refs.importApply.emit('click');
    assert.deepStrictEqual(applied[1], { round: 8 });
    await refs.importClear.emit('click');
    assert.strictEqual(refs.importInput.value, '');
    assert.strictEqual(refs.importFilename.textContent, '');

    controller.notify('io.exportRefreshed', {}, 'success');
    locale = 'zh';
    for (const handler of documentListeners['site-language-change'] || []) handler({ detail: { locale: 'zh-CN' } });
    assert.strictEqual(refs.status.textContent, '已刷新导出。');
    assert.strictEqual(controller.context().tab, 'export');
    controller.destroy();

    const opened = [];
    const sourceCard = new FakeElement();
    const panelCard = new FakeElement();
    panelCard.classList = { remove(name) { panelCard.removedClass = name; } };
    panelCard.querySelector = () => null;
    global.window.CalculatorCards = {
      openCard(card, options) { opened.push({ card, options }); }
    };
    const delegatedListeners = {};
    const eventRoot = {
      addEventListener(type, handler) { (delegatedListeners[type] ||= []).push(handler); },
      removeEventListener() {},
      contains() { return true; }
    };
    const external = buildHarness({
      id: 'unit-panel',
      eventRoot,
      defaultExporter: 'state',
      exporters: {
        state() { return { text: '{"state":1}', filename: 'state.json', mimeType: 'application/json' }; }
      }
    });
    external.refs.root.closest = (selector) => selector === '.card' ? panelCard : null;
    const produced = await external.controller.runExport('state', { trigger: { closest: () => sourceCard } });
    assert.strictEqual(produced, '{"state":1}');
    assert.strictEqual(external.refs.exportOutput.focused, true);
    assert.strictEqual(opened.length, 1);
    assert.strictEqual(opened[0].options.protectedCard, sourceCard);
    assert.strictEqual(external.controller.context().exporter, 'state');
    downloadedLink = null;
    await external.controller.downloadExport();
    assert.ok(downloadedLink && downloadedLink.clicked);
    assert.strictEqual(downloadedLink.download, 'state.json');
    assert.strictEqual(downloadedBlob.type, 'application/json;charset=utf-8');

    let dynamicRuns = 0;
    external.controller.registerExporter('dynamic', () => {
      dynamicRuns += 1;
      return { text: 'dynamic text', filename: 'dynamic.txt', mimeType: 'text/plain' };
    });
    const dynamicTrigger = new FakeElement({ 'data-import-export-trigger': 'dynamic' });
    dynamicTrigger.closest = (selector) => selector === '[data-import-export-trigger]' ? dynamicTrigger : sourceCard;
    for (const handler of delegatedListeners.click || []) handler({ target: dynamicTrigger });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(dynamicRuns, 1, 'delegated exporters must work for buttons added after mount');
    assert.strictEqual(external.refs.exportOutput.value, 'dynamic text');
    downloadedLink = null;
    await external.controller.downloadExport();
    assert.strictEqual(downloadedLink.download, 'dynamic.txt');
    assert.strictEqual(downloadedBlob.type, 'text/plain;charset=utf-8');
    external.controller.destroy();

    locale = 'en';
    let metadataValidations = 0;
    const metadataApplied = [];
    const metadata = buildHarness({
      metadataUi: true,
      translate(key) { return (messages[locale] && messages[locale][key]) || ''; },
      defaultExporter: 'state',
      importKind: 'diagram',
      importDetectionDelay: 0,
      exporters: {
        state: {
          label: 'Calculator state',
          formats: [{ id: 'json', label: 'JSON', mimeType: 'application/json' }],
          produce() { return { text: '{"state":1}', filename: 'state.json', mimeType: 'application/json' }; }
        },
        report: {
          label: 'Computed report',
          formats: [{ id: 'plain', label: 'Plain text' }, { id: 'latex', label: 'LaTeX' }],
          produce(context) { return { text: context.exportFormat, filename: `report.${context.exportFormat === 'latex' ? 'tex' : 'txt'}` }; }
        }
      },
      importers: {
        diagram: {
          label: 'Young diagram',
          detectContent: true,
          format: { mode: 'detect', label: 'Automatically detect' },
          read(context) { return context.importText; },
          validate(text) { metadataValidations += 1; return { text }; },
          describe() { return { contentKey: 'content.diagram', formatKey: 'format.partition' }; },
          apply(prepared) { metadataApplied.push(prepared); },
          replacesState: false
        }
      }
    });
    assert.strictEqual(metadata.refs.exportContent.options.length, 2);
    assert.strictEqual(metadata.refs.exportContent.value, 'state');
    assert.strictEqual(metadata.refs.exportFormat.hidden, true);
    assert.strictEqual(metadata.refs.exportFormatValue.textContent, 'JSON');
    metadata.refs.exportContent.value = 'report';
    await metadata.refs.exportContent.emit('change');
    assert.strictEqual(metadata.refs.exportFormat.hidden, false);
    assert.deepStrictEqual(metadata.refs.exportFormat.options.map((entry) => entry.value), ['plain', 'latex']);
    metadata.refs.exportFormat.value = 'latex';
    await metadata.refs.exportFormat.emit('change');
    await metadata.refs.exportRefresh.emit('click');
    assert.strictEqual(metadata.refs.exportOutput.value, 'latex');
    assert.strictEqual(metadata.controller.context().exporter, 'report');
    assert.strictEqual(metadata.controller.context().exportFormat, 'latex');
    metadata.controller.registerExporter('late', () => ({ text: 'late', filename: 'late.svg' }), {
      label: 'Late diagram',
      formats: [{ id: 'svg', label: 'SVG' }]
    });
    assert.ok(metadata.refs.exportContent.options.some((entry) => entry.value === 'late' && entry.textContent === 'Late diagram'));

    metadata.refs.importSource.value = 'paste';
    await metadata.refs.importSource.emit('change');
    metadata.refs.importInput.value = '4,2,1';
    await metadata.refs.importInput.emit('input');
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.strictEqual(metadataValidations, 1);
    assert.strictEqual(metadata.refs.importFormatValue.textContent, 'Partition text detected');
    assert.strictEqual(metadata.refs.importFormatValue.getAttribute('data-state'), 'detected');
    assert.strictEqual(metadata.refs.importContentValue.textContent, 'Young diagram detected');
    locale = 'zh';
    for (const handler of documentListeners['site-language-change'] || []) handler({ detail: { locale: 'zh-CN' } });
    assert.strictEqual(metadata.refs.importContentValue.textContent, '已检测为 杨图');
    assert.strictEqual(metadata.refs.importFormatValue.textContent, '已检测为 分拆文本');
    assert.strictEqual(metadata.refs.status.textContent, '已识别 杨图 · 分拆文本，可以导入。');
    locale = 'en';
    for (const handler of documentListeners['site-language-change'] || []) handler({ detail: { locale: 'en' } });
    await metadata.refs.importApply.emit('click');
    assert.strictEqual(metadataValidations, 1, 'unchanged detected input should reuse the prepared validation');
    assert.deepStrictEqual(metadataApplied, [{ text: '4,2,1' }]);
    metadata.controller.destroy();

    const pendingDetections = new Map();
    const staleDetection = buildHarness({
      metadataUi: true,
      importKind: 'auto',
      importDetectionDelay: 0,
      importers: {
        auto: {
          label: 'Imported data',
          format: { mode: 'detect', label: 'Automatically detect' },
          read(context) { return context.importText; },
          validate(text) { return new Promise((resolve) => pendingDetections.set(text, resolve)); },
          describe(prepared) { return { format: prepared.format }; },
          apply() {},
          replacesState: false
        }
      }
    });
    staleDetection.refs.importSource.value = 'paste';
    await staleDetection.refs.importSource.emit('change');
    staleDetection.refs.importInput.value = 'first';
    await staleDetection.refs.importInput.emit('input');
    await new Promise((resolve) => setTimeout(resolve, 2));
    staleDetection.refs.importInput.value = 'second';
    await staleDetection.refs.importInput.emit('input');
    await new Promise((resolve) => setTimeout(resolve, 2));
    pendingDetections.get('second')({ format: 'Second format' });
    await Promise.resolve();
    await Promise.resolve();
    pendingDetections.get('first')({ format: 'First format' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(staleDetection.refs.importFormatValue.textContent, 'Second format detected', 'stale detection must not overwrite the newest result');
    staleDetection.controller.destroy();

    const typedApplied = [];
    let typedConfirmations = 0;
    let typedAllowed = false;
    const typed = buildHarness({
      importKind: 'replace',
      importers: {
        replace: {
          read(context) { return context.importText; },
          validate(text) { return JSON.parse(text); },
          apply(value) { typedApplied.push(['replace', value]); },
          replacesState: true,
          hasMeaningfulState() { return true; }
        },
        merge: {
          read(context) { return context.importText; },
          validate(text) { return JSON.parse(text); },
          apply(value) { typedApplied.push(['merge', value]); },
          replacesState: false,
          hasMeaningfulState() { return true; }
        }
      },
      confirmReplace() {
        typedConfirmations += 1;
        return typedAllowed;
      }
    });
    typed.refs.importSource.value = 'paste';
    await typed.refs.importSource.emit('change');
    typed.refs.importInput.value = '{"safe":true}';
    await typed.refs.importInput.emit('input');
    await typed.refs.importApply.emit('click');
    assert.deepStrictEqual(typedApplied, [], 'cancelled replacement must not mutate state');
    assert.strictEqual(typedConfirmations, 1);
    typedAllowed = true;
    await typed.refs.importApply.emit('click');
    assert.deepStrictEqual(typedApplied, [['replace', { safe: true }]]);
    typed.refs.importKind.value = 'merge';
    await typed.refs.importKind.emit('change');
    typed.refs.importInput.value = '{"added":1}';
    await typed.refs.importInput.emit('input');
    await typed.refs.importApply.emit('click');
    assert.deepStrictEqual(typedApplied[1], ['merge', { added: 1 }]);
    assert.strictEqual(typedConfirmations, 2, 'merge imports must not ask for replacement confirmation');
    typed.controller.destroy();
  } finally {
    global.document = originalDocument;
    global.window = originalWindow;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }

  console.log('import_export_panel_test: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
