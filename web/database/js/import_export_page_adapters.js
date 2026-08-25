(() => {
  'use strict';

  const PAGE = (location.pathname.split('/').pop() || '').toLowerCase();

  const CONFIGS = {
    'young_diagrams.html': {
      id: 'young-diagrams', output: '#export-out', controls: ['.action-row'],
      exportLabel: 'Calculator state', defaultFormat: 'json',
      accept: '.json,.txt,.tex,application/json,text/plain',
      importKinds: [{ value: 'state', label: 'Young diagram', format: { mode: 'detect', label: 'Automatically detect', acceptedFormats: ['JSON state', 'Partition text', 'ytableau LaTeX'] } }]
    },
    'double_young_diagram.html': {
      id: 'double-young-diagram', output: '#export-out', refresh: '#refresh-export', copy: '#copy-export',
      exportLabel: 'Calculator state', defaultFormat: 'json',
      importKinds: [{ value: 'state', label: 'Calculator state' }]
    },
    'higher_dimensional_slice_calculator.html': {
      id: 'higher-dimensional-slice', cardFrom: '#import-state', outputId: 'slice-export-out',
      exportLabel: 'Full calculator state', defaultFormat: 'json',
      accept: '.json,.txt,application/json,text/plain',
      legacyInputs: {
        state: '#import-state', 'object-new': '#import-state', 'object-replace': '#import-state', frame: '#direct-frame-import'
      },
      importKinds: [
        { value: 'state', label: 'Full calculator state' },
        { value: 'object-new', label: 'Object as new' },
        { value: 'object-replace', label: 'Replace active object' },
        { value: 'frame', label: 'Frame matrix', format: { mode: 'fixed', label: 'Matrix rows' } }
      ]
    },
    'mosaic_calculator.html': {
      id: 'mosaic', card: '#export-card', output: '#export-out', refresh: '#refresh-export', copy: '#copy-export',
      input: '#import-input',
      accept: '.json,.txt,application/json,text/plain',
      exportContent: '#export-type', exportFormat: '#export-format',
      controls: ['#export-preset-meta-row', '#export-precomputed-game-data-row', '#export-test-link-row'],
      importKinds: [{ value: 'chart', label: 'Mosaic chart or preset' }],
      catalog: '#import-preset-select', catalogContainer: '#mosaic-import-catalog-controls'
    },
    'matrix_calculator.html': {
      id: 'matrix', output: '#export-out', refresh: '#refresh-export', copy: '#copy-export',
      exportLabel: 'Matrices', exportFormat: '#export-format', inheritFormats: ['operation'], accept: '.txt,.tex,text/plain',
      legacyInputs: { matrix: '#import-text' },
      importKinds: [{ value: 'matrix', label: 'Matrix', format: { mode: 'detect', label: 'Automatically detect', acceptedFormats: ['Matrix rows', 'LaTeX matrix'] } }]
    },
    'sheaf_calculator.html': {
      id: 'sheaf', card: '#export-card', output: '#export-out', refresh: '#refresh-export', copy: '#copy-export',
      exportLabel: 'Calculator report', exportFormat: '#export-format',
      legacyInputs: { preset: '#import-preset-input', 'saved-formulas': '#class-step-import-input' },
      importKinds: [
        { value: 'preset', label: 'Calculator preset' },
        { value: 'saved-formulas', label: 'Saved formulas', replacesState: false }
      ]
    },
    'sheaf_complex_calculator.html': {
      id: 'sheaf-complex', card: '#export-card', output: '#export-out', refresh: '#refresh-export', copy: '#copy-export',
      exportLabel: 'Calculator report', exportFormat: '#export-format',
      legacyInputs: {
        preset: '#import-preset-input', 'saved-formulas': '#class-step-import-input', 'complex-chart': '#complex-chart-import-input'
      },
      importKinds: [
        { value: 'preset', label: 'Calculator preset' },
        { value: 'saved-formulas', label: 'Saved formulas', replacesState: false },
        { value: 'complex-chart', label: 'Complex chart', replacesState: false }
      ]
    },
    'dynkin_diagram_calculator.html': {
      id: 'dynkin', output: '#dynkin-export-out', refresh: '#dynkin-refresh-export', copy: '#dynkin-select-export',
      exportLabel: 'Calculator state', defaultFormat: 'json',
      importKinds: [{ value: 'state', label: 'Dynkin calculator state' }]
    },
    'category_calculator.html': {
      id: 'category', card: '#export-card', output: '#category-export-out', refresh: '#refresh-category-export', copy: '#copy-category-export',
      exportLabel: 'Category data', exportFormat: '#category-export-format', input: '#category-import-input', legacyImport: '#category-import-input', legacyApply: '#load-category-import',
      importKinds: [{ value: 'state', label: 'Category preset' }]
    },
    'theorem_graph_calculator.html': {
      id: 'theorem-graph', card: '#export-card', output: '#theorem-export-out', refresh: '#refresh-export', copy: '#copy-export',
      exportLabel: 'Theorem graph', defaultFormat: 'json',
      input: '#theorem-import-input',
      importKinds: [
        { value: 'preset', label: 'Preset catalog' },
        { value: 'json-current', label: 'Current tab' },
        { value: 'json-whole', label: 'Whole graph' },
        { value: 'json-node', label: 'Current node', replacesState: false }
      ], catalog: '#preset-select'
    },
    'place_ramification_calculator.html': {
      id: 'place-ramification', output: '#ramification-export-out', refresh: '#ramification-refresh-export', copy: '#ramification-select-export',
      exportLabel: 'Calculator state', defaultFormat: 'json',
      importKinds: [{ value: 'state', label: 'Place ramification state' }]
    },
    'strand_diagram_calculator.html': {
      id: 'strand', card: '#strand-export-card', output: '#strand-export-out', refresh: '#strand-refresh-export', copy: '#strand-copy-export',
      exportLabel: 'Strand diagram data', exportFormat: '#strand-export-format', input: '#strand-import-input', legacyImport: '#strand-import-input', legacyApply: '#strand-load-import',
      importKinds: [{ value: 'state', label: 'Strand preset' }]
    }
  };

  const EXPORTER_LABELS = {
    'active-object': 'Active object',
    'borel-weil-bott': 'Borel–Weil–Bott result',
    branching: 'Branching decomposition',
    classes: 'Class report',
    'complex-chart': 'Complex chart',
    'current-node': 'Current theorem node',
    degenerations: 'Dual-graph degenerations',
    'dual-graph': 'Dual graph',
    frame: 'Frame matrix',
    'frame-json': 'Frame data',
    grassmannian: 'Grassmannian cup product',
    hodge: 'Hodge report',
    kostka: 'Kostka tableaux',
    kronecker: 'Kronecker decomposition',
    latex: 'Young diagram',
    operation: 'Operation result',
    plethysm: 'Plethysm decomposition',
    position: 'Slice position',
    'saved-formulas': 'Saved formulas',
    schur: 'Littlewood–Richardson decomposition',
    'schur-functor': 'Schur functor decomposition',
    'selected-references': 'Selected references',
    shape: 'Partition shape',
    'step-classes': 'Step-class report',
    svg: 'Young diagram',
    'symmetric-functions': 'Symmetric-function result',
    'symmetric-polynomials': 'Symmetric-polynomial result',
    'weight-spaces': 'Weight-space decomposition',
    'weyl-orbit': 'Weyl orbit'
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function button(label, action, primary = false) {
    const node = element('button', primary ? 'btn' : 'btn btn-ghost', label);
    node.type = 'button';
    node.setAttribute(`data-${action.split(':')[0]}-action`, action.split(':')[1]);
    return node;
  }

  function row(label, control) {
    const wrap = element('div', 'import-export-field-row');
    const caption = element('span', 'input-label', label);
    wrap.append(caption, control);
    return wrap;
  }

  function option(value, label) {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
  }

  function metadataControl(select, valueAttribute) {
    const wrap = element('div', 'import-export-field-control');
    const value = element('span', 'import-export-field-value');
    value.setAttribute(valueAttribute, '');
    value.setAttribute('aria-live', 'polite');
    wrap.append(select, value);
    return { wrap, value };
  }

  function formatDescriptor(id, label) {
    const value = String(id || '').toLowerCase();
    if (value === 'json' || value === 'verbose' || value === 'dsl' || value.includes('json')) {
      return { id: String(id), label: String(label || 'JSON'), mimeType: 'application/json', extension: 'json' };
    }
    if (value === 'latex' || value === 'tikzcd') {
      return { id: String(id), label: String(label || 'LaTeX'), mimeType: 'application/x-tex', extension: 'tex' };
    }
    if (value === 'svg') return { id: String(id), label: String(label || 'SVG'), mimeType: 'image/svg+xml', extension: 'svg' };
    return { id: String(id), label: String(label || 'Plain text'), mimeType: 'text/plain', extension: 'txt' };
  }

  function formatsFromSelect(select) {
    return Array.from(select?.options || []).map((entry) => formatDescriptor(entry.value, entry.textContent));
  }

  function fixedFormatFromFilename(filename) {
    const extension = String(filename || '').split('.').pop().toLowerCase();
    if (extension === 'json') return formatDescriptor('json', 'JSON');
    if (extension === 'tex') return formatDescriptor('latex', 'LaTeX');
    if (extension === 'svg') return formatDescriptor('svg', 'SVG');
    return formatDescriptor('plain', 'Plain text');
  }

  function importDescription(config, kind, prepared) {
    const custom = window.SiteImportExportPageAdapter;
    if (custom && typeof custom.describeImport === 'function') return custom.describeImport(kind, prepared);
    if (config.id === 'young-diagrams') {
      const labels = { state: 'JSON state', shape: 'Partition text', ytableau: 'ytableau LaTeX' };
      return { content: 'Young diagram', format: labels[prepared?.kind] || 'Automatically detect' };
    }
    if (config.id === 'matrix') {
      const style = prepared?.parsed?.style === 'bulk input' ? 'Matrix rows' : prepared?.parsed?.style;
      return { content: 'Matrix', format: style || 'Automatically detect' };
    }
    const entry = (config.importKinds || []).find((item) => item.value === kind);
    return { content: entry?.label || 'Imported data', format: entry?.format?.label || 'JSON' };
  }

  function cardFor(config, output) {
    return document.querySelector(config.card)
      || document.querySelector(config.cardFrom)?.closest('.card')
      || output?.closest('.card')
      || null;
  }

  function moveControl(selector, target, legacyHost) {
    const node = legacyHost.querySelector(selector) || document.querySelector(selector);
    if (!node || !legacyHost.contains(node)) return;
    const container = node.closest('.mosaic-inline-row, .matrix-inline-row, .sheaf-inline-row, .category-field-row, .strand-field-row') || node;
    if (container && legacyHost.contains(container)) target.appendChild(container);
  }

  function copyCatalogOptions(source, target) {
    if (!source || !target) return;
    const selected = target.value;
    target.innerHTML = '';
    Array.from(source.options || []).forEach((entry) => target.appendChild(option(entry.value, entry.textContent)));
    if (Array.from(target.options).some((entry) => entry.value === selected)) target.value = selected;
    else target.value = source.value || '';
    target.disabled = !!source.disabled;
  }

  function makeFilename(config, exporterName = '') {
    const custom = window.SiteImportExportPageAdapter;
    if (custom && typeof custom.filename === 'function') return custom.filename(exporterName);
    const format = document.querySelector('#export-format, #category-export-format, #strand-export-format')?.value || '';
    const extension = format === 'json' || format.includes('json') || !format ? 'json' : (format === 'latex' ? 'tex' : 'txt');
    return `${config.id}-${exporterName || 'export'}.${extension}`;
  }

  function mimeForFilename(filename) {
    if (/\.json$/i.test(filename)) return 'application/json';
    if (/\.svg$/i.test(filename)) return 'image/svg+xml';
    if (/\.tex$/i.test(filename)) return 'application/x-tex';
    return 'text/plain';
  }

  function clickLegacy(node) {
    if (!node || node.disabled) return false;
    node.setAttribute('data-import-export-running', 'true');
    try { node.click(); } finally { node.removeAttribute('data-import-export-running'); }
    return true;
  }

  function jsonPayload(raw) {
    const text = String(raw?.text ?? raw ?? '').trim();
    if (!text) throw new Error('Paste or choose data to import.');
    return { text, data: JSON.parse(text), source: raw?.source || 'paste', value: raw?.value || '' };
  }

  function genericValidate(config, kind, raw) {
    const custom = window.SiteImportExportPageAdapter;
    if (custom && typeof custom.validateImport === 'function') return custom.validateImport(kind, raw);
    if (raw?.source === 'catalog') return raw;
    return jsonPayload(raw);
  }

  function setTheoremImportMode(kind) {
    const preset = kind === 'preset';
    const presetRadio = document.getElementById('import-mode-preset');
    const jsonRadio = document.getElementById('import-mode-json');
    if (presetRadio) presetRadio.checked = preset;
    if (jsonRadio) jsonRadio.checked = !preset;
    const scope = kind.endsWith('whole') ? 'whole' : kind.endsWith('node') ? 'node' : 'current';
    const scopeRadio = document.getElementById(`import-scope-${scope}`);
    if (scopeRadio) scopeRadio.checked = true;
    (preset ? presetRadio : jsonRadio)?.dispatchEvent(new Event('change', { bubbles: true }));
    scopeRadio?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function legacyImportError(config, kind) {
    const selector = config.id === 'category'
      ? '#category-export-message'
      : config.id === 'strand'
        ? '#strand-export-message'
        : config.id === 'theorem-graph'
          ? '#export-message'
          : config.id === 'mosaic'
            ? '#status-line'
            : (config.id === 'sheaf' || config.id === 'sheaf-complex')
              ? kind === 'preset'
                ? '#import-preset-message'
                : kind === 'saved-formulas'
                  ? '#class-step-import-message'
                  : '#complex-chart-import-message'
              : '';
    const message = selector ? document.querySelector(selector) : null;
    const failed = message && (
      message.classList.contains('is-error')
      || message.classList.contains('theorem-danger')
      || message.classList.contains('mosaic-status-bad')
    );
    return failed ? String(message.textContent || 'Import failed.').trim() || 'Import failed.' : '';
  }

  function assertLegacyImportSucceeded(config, kind) {
    const error = legacyImportError(config, kind);
    if (error) throw new Error(error);
  }

  async function genericApply(config, kind, prepared) {
    const custom = window.SiteImportExportPageAdapter;
    if (custom && typeof custom.applyImport === 'function') return custom.applyImport(kind, prepared);

    if (config.id === 'theorem-graph') {
      setTheoremImportMode(kind);
      if (kind === 'preset') {
        const catalog = document.getElementById('preset-select');
        if (catalog) catalog.value = prepared.value || '';
      } else {
        document.getElementById('theorem-import-input').value = prepared.text;
      }
      if (!clickLegacy(document.getElementById('load-import'))) {
        throw new Error('The theorem graph import action is unavailable.');
      }
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      assertLegacyImportSucceeded(config, kind);
      return;
    }

    if (config.id === 'mosaic') {
      if (prepared.source === 'catalog') {
        const catalog = document.getElementById('import-preset-select');
        if (catalog) catalog.value = prepared.value || '';
        if (window.MosaicCalculator && typeof window.MosaicCalculator.loadCatalogPreset === 'function') {
          await window.MosaicCalculator.loadCatalogPreset();
        } else {
          clickLegacy(document.getElementById('load-import-preset'));
        }
      } else {
        const input = document.getElementById('import-input');
        if (input) input.value = prepared.text;
        clickLegacy(document.getElementById('generate-import'));
      }
      assertLegacyImportSucceeded(config, kind);
      return;
    }

    if (config.id === 'sheaf' || config.id === 'sheaf-complex') {
      const map = {
        preset: ['import-preset-input', 'import-preset-apply'],
        'saved-formulas': ['class-step-import-input', 'class-step-import-apply'],
        'complex-chart': ['complex-chart-import-input', 'complex-chart-import-apply']
      };
      const ids = map[kind];
      if (!ids) throw new Error('This import kind is unavailable.');
      document.getElementById(ids[0]).value = prepared.text;
      clickLegacy(document.getElementById(ids[1]));
      assertLegacyImportSucceeded(config, kind);
      return;
    }

    const input = document.querySelector(config.legacyImport);
    if (!input) throw new Error('This calculator has no import adapter.');
    input.value = prepared.text;
    clickLegacy(document.querySelector(config.legacyApply));
    assertLegacyImportSucceeded(config, kind);
  }

  function meaningfulState(config) {
    const custom = window.SiteImportExportPageAdapter;
    if (custom && typeof custom.hasMeaningfulState === 'function') return custom.hasMeaningfulState();
    if (config.id === 'category') return Number(document.getElementById('category-count-badge')?.textContent || 0) > 0;
    if (config.id === 'matrix') {
      return Array.from(document.querySelectorAll('#matrix-grid input')).some((input) => String(input.value || '').trim() && String(input.value).trim() !== '0');
    }
    return true;
  }

  function confirmReplace() {
    return typeof window.confirm !== 'function' || window.confirm('Importing will replace current work. Continue?');
  }

  function upgrade(config) {
    if (!window.ImportExportPanel) return null;
    if (document.querySelector(`[data-import-export-id="${config.id}"]`)) return null;
    const custom = window.SiteImportExportPageAdapter || {};
    let output = document.querySelector(config.output);
    const compatibleImportInput = config.input ? document.querySelector(config.input) : null;
    const card = cardFor(config, output);
    const body = card?.querySelector('.card-body');
    if (!card || !body) return null;

    const headLabel = card.querySelector('.card-head-label');
    if (headLabel) headLabel.textContent = 'Import / Export';

    const legacyHost = element('div', 'import-export-legacy-host');
    legacyHost.hidden = true;
    while (body.firstChild) legacyHost.appendChild(body.firstChild);

    const root = element('div', 'import-export-panel');
    root.id = `${config.id}-import-export-panel`;
    const tabs = element('div', 'import-export-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Import and export');
    const exportTab = element('button', 'import-export-tab', 'Export');
    exportTab.type = 'button';
    exportTab.id = `${config.id}-export-tab`;
    exportTab.setAttribute('role', 'tab');
    exportTab.setAttribute('aria-selected', 'true');
    exportTab.setAttribute('aria-controls', `${config.id}-export-panel`);
    exportTab.setAttribute('data-import-export-tab', 'export');
    const importTab = element('button', 'import-export-tab', 'Import');
    importTab.type = 'button';
    importTab.id = `${config.id}-import-tab`;
    importTab.tabIndex = -1;
    importTab.setAttribute('role', 'tab');
    importTab.setAttribute('aria-selected', 'false');
    importTab.setAttribute('aria-controls', `${config.id}-import-panel`);
    importTab.setAttribute('data-import-export-tab', 'import');
    tabs.append(exportTab, importTab);

    const exportPanel = element('div', 'import-export-tabpanel');
    exportPanel.id = `${config.id}-export-panel`;
    exportPanel.setAttribute('role', 'tabpanel');
    exportPanel.setAttribute('aria-labelledby', exportTab.id);
    exportPanel.setAttribute('data-import-export-panel', 'export');

    const legacyContentSelect = config.exportContent ? legacyHost.querySelector(config.exportContent) : null;
    const exportContentSelect = legacyContentSelect || document.createElement('select');
    exportContentSelect.setAttribute('data-export-content', '');
    exportContentSelect.setAttribute('aria-label', 'Export content');
    const exportContentControl = metadataControl(exportContentSelect, 'data-export-content-value');
    exportPanel.appendChild(row('Export content', exportContentControl.wrap));

    const legacyFormatSelect = config.exportFormat ? legacyHost.querySelector(config.exportFormat) : null;
    const exportFormatSelect = legacyFormatSelect || document.createElement('select');
    exportFormatSelect.setAttribute('data-export-format', '');
    exportFormatSelect.setAttribute('aria-label', 'Export format');
    const exportFormatControl = metadataControl(exportFormatSelect, 'data-export-format-value');
    const exportFormatRow = row('Format', exportFormatControl.wrap);
    exportFormatRow.setAttribute('data-export-format-row', '');
    exportPanel.appendChild(exportFormatRow);

    (config.controls || []).forEach((selector) => moveControl(selector, exportPanel, legacyHost));

    if (!output) {
      output = document.createElement('textarea');
      output.id = config.outputId || `${config.id}-export-out`;
    }
    output.readOnly = true;
    output.value = '';
    output.setAttribute('data-export-output', '');
    output.setAttribute('aria-label', 'Export preview');
    output.classList.add('import-export-textarea');
    exportPanel.appendChild(output);

    const exportActions = element('div', 'import-export-actions');
    const refresh = button('refresh', 'export:refresh', true);
    const copy = button('copy', 'export:copy');
    const download = button('download', 'export:download');
    exportActions.append(refresh, copy, download);
    exportPanel.appendChild(exportActions);

    const importPanel = element('div', 'import-export-tabpanel');
    importPanel.id = `${config.id}-import-panel`;
    importPanel.hidden = true;
    importPanel.setAttribute('role', 'tabpanel');
    importPanel.setAttribute('aria-labelledby', importTab.id);
    importPanel.setAttribute('data-import-export-panel', 'import');

    const configuredKinds = config.importKinds || [{ value: 'state', label: 'Imported data' }];
    const kinds = (custom.importKinds || configuredKinds).map((entry) => ({
      ...(configuredKinds.find((configured) => configured.value === entry.value) || {}),
      ...entry
    }));
    const kindSelect = document.createElement('select');
    kindSelect.setAttribute('data-import-kind', '');
    kindSelect.setAttribute('aria-label', 'Import content');
    kinds.forEach((entry) => kindSelect.appendChild(option(entry.value, entry.label)));
    const importContentControl = metadataControl(kindSelect, 'data-import-content-value');
    kindSelect.hidden = kinds.length <= 1;
    importContentControl.value.hidden = kinds.length > 1;
    importPanel.appendChild(row('Import content', importContentControl.wrap));

    const importFormatValue = element('span', 'import-export-field-value');
    importFormatValue.setAttribute('data-import-format-value', '');
    importFormatValue.setAttribute('aria-live', 'polite');
    importPanel.appendChild(row('Format', importFormatValue));

    const catalogSource = config.catalog
      ? (legacyHost.querySelector(config.catalog) || document.querySelector(config.catalog))
      : null;
    const sourceSelect = document.createElement('select');
    sourceSelect.setAttribute('data-import-source', '');
    sourceSelect.setAttribute('aria-label', 'Import source');
    if (catalogSource) sourceSelect.appendChild(option('catalog', 'Catalog'));
    sourceSelect.append(option('paste', 'Paste text'), option('file', 'Local file'));
    sourceSelect.value = catalogSource ? 'catalog' : 'paste';
    importPanel.appendChild(row('Source', sourceSelect));

    let catalogSelect = null;
    const catalogContainer = config.catalogContainer
      ? (legacyHost.querySelector(config.catalogContainer) || document.querySelector(config.catalogContainer))
      : null;
    // Mosaic keeps its preset controls in the editor card, while this shared
    // Import/Export card is upgraded elsewhere.  Move an explicitly configured
    // catalog container from either location so the Import tab owns the live
    // staged controls instead of cloning the old concrete-level selector.
    if (catalogSource && catalogContainer) {
      catalogSelect = catalogSource;
      catalogSelect.setAttribute('data-import-catalog', '');
      catalogContainer.setAttribute('data-import-source-panel', 'catalog');
      importPanel.appendChild(catalogContainer);
    } else if (catalogSource) {
      catalogSelect = document.createElement('select');
      catalogSelect.setAttribute('data-import-catalog', '');
      catalogSelect.setAttribute('aria-label', 'Import catalog');
      copyCatalogOptions(catalogSource, catalogSelect);
      const catalogRow = row('Catalog', catalogSelect);
      catalogRow.setAttribute('data-import-source-panel', 'catalog');
      importPanel.appendChild(catalogRow);
      if (typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => copyCatalogOptions(catalogSource, catalogSelect)).observe(catalogSource, { childList: true, subtree: true, attributes: true });
      }
    }

    const fileRow = element('div', 'import-export-file-row');
    fileRow.hidden = true;
    fileRow.setAttribute('data-import-source-panel', 'file');
    const fileLabel = element('label', 'import-export-file-picker');
    fileLabel.appendChild(element('span', '', 'Choose local file'));
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = config.accept || '.json,application/json';
    file.setAttribute('data-import-file', '');
    fileLabel.appendChild(file);
    const filename = element('span', 'import-export-filename');
    filename.setAttribute('data-import-filename', '');
    filename.setAttribute('aria-live', 'polite');
    fileRow.append(fileLabel, filename);
    importPanel.appendChild(fileRow);

    const importInput = compatibleImportInput || document.createElement('textarea');
    importInput.classList.add('import-export-textarea');
    if (!importInput.placeholder) importInput.placeholder = 'Paste exported data';
    importInput.spellcheck = false;
    importInput.setAttribute('data-import-input', '');
    if (!importInput.getAttribute('aria-label')) importInput.setAttribute('aria-label', 'Imported data');
    if (catalogSource) importInput.hidden = true;
    importPanel.appendChild(importInput);

    const importActions = element('div', 'import-export-actions import-export-import-actions');
    const clear = button('clear', 'import:clear');
    const apply = button('import', 'import:apply', true);
    if (catalogSource) clear.hidden = true;
    importActions.append(clear, apply);
    importPanel.appendChild(importActions);

    const status = element('p', 'import-export-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('data-import-export-status', '');

    root.append(tabs, exportPanel, importPanel, status);
    body.append(root, legacyHost);

    const importerMap = {};
    kinds.forEach((entry) => {
      importerMap[entry.value] = {
        label: entry.label,
        labelKey: entry.labelKey,
        format: entry.format || { mode: 'fixed', label: 'JSON' },
        detectContent: !!entry.detectContent,
        read(context) {
          return context.importSource === 'catalog'
            ? { source: 'catalog', value: context.catalogId }
            : { source: context.importSource, text: context.importText };
        },
        validate(raw) { return genericValidate(config, entry.value, raw); },
        describe(prepared) { return importDescription(config, entry.value, prepared); },
        apply(prepared) { return genericApply(config, entry.value, prepared); },
        replacesState: entry.replacesState !== false,
        hasMeaningfulState() { return meaningfulState(config); }
      };
    });

    const legacyRefresh = document.querySelector(config.refresh);
    const runDefaultExporter = async (contentName) => {
      if (legacyContentSelect && legacyContentSelect.value !== contentName) {
        legacyContentSelect.value = contentName;
        legacyContentSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (custom && typeof custom.exportDefault === 'function') return custom.exportDefault();
      output.value = '';
      clickLegacy(legacyRefresh);
      const text = String(output.value || '');
      if (!text) throw new Error('No export is available yet.');
      const filenameValue = makeFilename(config, 'state');
      return { text, filename: filenameValue, mimeType: mimeForFilename(filenameValue) };
    };

    const sharedFormats = legacyFormatSelect
      ? formatsFromSelect(legacyFormatSelect)
      : [formatDescriptor(config.defaultFormat || 'json', config.defaultFormat === 'plain' ? 'Plain text' : 'JSON')];
    const mainContentEntries = legacyContentSelect
      ? Array.from(legacyContentSelect.options).map((entry) => ({ value: entry.value, label: entry.textContent }))
      : [{ value: 'default', label: config.exportLabel || 'Calculator data' }];
    const exporterDescriptors = {};
    mainContentEntries.forEach((entry) => {
      exporterDescriptors[entry.value] = {
        label: entry.label,
        formats: sharedFormats,
        defaultFormat: legacyFormatSelect?.value || sharedFormats[0]?.id,
        produce: () => runDefaultExporter(entry.value)
      };
    });

    const exporterOverrides = custom.exporters || {};
    const exporterTriggers = Array.from(document.querySelectorAll('[data-import-export-trigger]'));
    exporterTriggers.forEach((trigger) => {
      const name = trigger.getAttribute('data-import-export-trigger');
      if (!name) return;
      const override = exporterOverrides[name];
      const filenameValue = trigger.getAttribute('data-export-filename') || makeFilename(config, name);
      const inheritsFormats = (config.inheritFormats || []).includes(name);
      const formats = inheritsFormats ? sharedFormats : [fixedFormatFromFilename(filenameValue)];
      exporterDescriptors[name] = {
        label: trigger.getAttribute('data-export-label') || EXPORTER_LABELS[name] || name.replace(/[-_]+/g, ' '),
        formats,
        defaultFormat: inheritsFormats ? (legacyFormatSelect?.value || formats[0]?.id) : formats[0]?.id,
        isAvailable: () => !trigger.disabled && !trigger.hidden,
        async produce(context) {
          if (typeof override === 'function') return override(context);
          if (!context.trigger) {
            output.value = '';
            clickLegacy(trigger);
          }
          const text = String(output.value || '');
          if (!text) throw new Error('This export is not available yet.');
          const currentFilename = trigger.getAttribute('data-export-filename') || makeFilename(config, name);
          return { text, filename: currentFilename, mimeType: mimeForFilename(currentFilename) };
        }
      };
    });

    if (!legacyContentSelect) {
      mainContentEntries.forEach((entry) => exportContentSelect.appendChild(option(entry.value, entry.label)));
    }
    exporterTriggers.forEach((trigger) => {
      const name = trigger.getAttribute('data-import-export-trigger');
      if (!name || Array.from(exportContentSelect.options).some((entry) => entry.value === name)) return;
      exportContentSelect.appendChild(option(name, exporterDescriptors[name].label));
    });
    const defaultExporterName = legacyContentSelect?.value || mainContentEntries[0].value;

    const controller = window.ImportExportPanel.mount(root, {
      id: config.id,
      eventRoot: document,
      defaultExporter: defaultExporterName,
      exporters: exporterDescriptors,
      exportOptions: {
        content: exportContentSelect,
        contentValue: exportContentControl.value,
        format: exportFormatSelect,
        formatValue: exportFormatControl.value,
        formatRow: exportFormatRow,
        output, refresh, copy, download
      },
      importOptions: {
        kind: kindSelect,
        contentValue: importContentControl.value,
        formatValue: importFormatValue,
        source: sourceSelect, catalog: catalogSelect, input: importInput, file, filename, apply, clear
      },
      importers: importerMap,
      confirmReplace,
      onContextChange: custom.onContextChange
    });

    // Keep the common query/input surface and retained page-specific editors in
    // lockstep. Reusing an existing textarea preserves its ID, handlers, parser,
    // and third-party references; specialized editors elsewhere remain usable.
    const legacyInputs = { ...(config.legacyInputs || {}), ...(custom.legacyInputs || {}) };
    const legacyInputForKind = () => {
      const selector = legacyInputs[kindSelect.value];
      return selector ? document.querySelector(selector) : null;
    };
    const syncLegacyInput = () => {
      const target = legacyInputForKind();
      if (target && target !== importInput) target.value = importInput.value;
    };
    importInput.addEventListener('input', syncLegacyInput);
    Object.entries(legacyInputs).forEach(([kind, selector]) => {
      const legacyInput = document.querySelector(selector);
      if (!legacyInput || legacyInput === importInput) return;
      legacyInput.addEventListener('input', () => {
        if (kindSelect.value !== kind || sourceSelect.value !== 'paste') return;
        importInput.value = legacyInput.value;
        importInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    kindSelect.addEventListener('change', () => {
      const legacyInput = legacyInputForKind();
      if (!legacyInput || legacyInput === importInput || sourceSelect.value !== 'paste') return;
      importInput.value = legacyInput.value;
      importInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    if (config.id === 'theorem-graph') {
      kindSelect.addEventListener('change', () => {
        if (kindSelect.value === 'preset') sourceSelect.value = 'catalog';
        else if (sourceSelect.value === 'catalog') sourceSelect.value = 'paste';
        sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      sourceSelect.addEventListener('change', () => {
        const nextKind = sourceSelect.value === 'catalog'
          ? 'preset'
          : (kindSelect.value === 'preset' ? 'json-current' : kindSelect.value);
        if (nextKind === kindSelect.value) return;
        kindSelect.value = nextKind;
        kindSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    if (typeof MutationObserver !== 'undefined' && exporterTriggers.length) {
      const observer = new MutationObserver(() => controller.sync());
      exporterTriggers.forEach((trigger) => observer.observe(trigger, { attributes: true, attributeFilter: ['disabled', 'hidden'] }));
    }

    window.SiteImportExportPanel = controller;
    return controller;
  }

  function start() {
    const config = CONFIGS[PAGE];
    if (!config) return;
    document.documentElement.setAttribute('data-import-export-adapter-page', config.id);
    try {
      const controller = upgrade(config);
      document.documentElement.setAttribute('data-import-export-adapter-ready', controller ? 'true' : 'false');
    } catch (error) {
      document.documentElement.setAttribute('data-import-export-adapter-error', error?.message || String(error));
      console.error('Import/export adapter failed', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else window.setTimeout(start, 0);
})();
