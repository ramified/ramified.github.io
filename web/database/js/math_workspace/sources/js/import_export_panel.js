(() => {
  'use strict';

  const DEFAULT_MESSAGES = {
    'io.panelReady': 'Choose an import or export action.',
    'io.exportRefreshed': 'Export preview refreshed.',
    'io.exportCopied': 'Export copied to the clipboard.',
    'io.exportDownloaded': 'Export downloaded.',
    'io.nothingToCopy': 'Generate an export before copying.',
    'io.nothingToDownload': 'Generate an export before downloading.',
    'io.clipboardUnavailable': 'Clipboard access is unavailable.',
    'io.fileReading': 'Reading {{filename}}…',
    'io.fileReady': '{{filename}} is ready to import.',
    'io.fileRequired': 'Choose a local file first.',
    'io.importRequired': 'Paste data to import.',
    'io.importComplete': 'Import complete.',
    'io.importCancelled': 'Import cancelled; the current game was not changed.',
    'io.importCleared': 'Import input cleared.',
    'io.autoDetect': 'Automatically detect',
    'io.detectedFormat': '{{format}} detected',
    'io.detectedContent': '{{content}} detected',
    'io.importDetected': '{{content}} · {{format}} is ready to import.',
    'io.builtInPreset': 'Built-in preset',
    'io.operationFailed': '{{message}}'
  };

  function interpolate(value, parameters) {
    return String(value || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, name) => {
      const replacement = parameters && Object.prototype.hasOwnProperty.call(parameters, name)
        ? parameters[name]
        : '';
      return String(replacement ?? '');
    });
  }

  function resolveElement(root, value, fallbackSelector) {
    if (value && typeof value === 'object') return value;
    const selector = typeof value === 'string' ? value : fallbackSelector;
    return selector && root && root.querySelector ? root.querySelector(selector) : null;
  }

  function elements(root, selector) {
    return root && root.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
  }

  function normalizeResult(result) {
    if (typeof result === 'string') return { text: result };
    if (result && typeof result === 'object') return { ...result, text: String(result.text ?? '') };
    return { text: '' };
  }

  function humanize(value) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  }

  function normalizeFormats(formats) {
    return (Array.isArray(formats) ? formats : [])
      .map((entry) => {
        if (typeof entry === 'string') return { id: entry, label: humanize(entry) };
        if (!entry || typeof entry !== 'object') return null;
        const id = String(entry.id || entry.value || '').trim();
        if (!id) return null;
        return { ...entry, id, label: String(entry.label || humanize(id)) };
      })
      .filter(Boolean);
  }

  function normalizeExporter(name, value, metadata = {}) {
    const key = String(name || '').trim();
    const descriptor = typeof value === 'function'
      ? { ...metadata, produce: value }
      : { ...(value && typeof value === 'object' ? value : {}), ...metadata };
    const produce = descriptor.produce || descriptor.producer;
    if (!key || typeof produce !== 'function') return null;
    const formats = normalizeFormats(descriptor.formats);
    return {
      ...descriptor,
      name: key,
      label: String(descriptor.label || humanize(key || 'export')),
      formats,
      defaultFormat: String(descriptor.defaultFormat || formats[0]?.id || ''),
      produce
    };
  }

  function safeFilename(value) {
    const filename = String(value || 'export.json').trim() || 'export.json';
    return filename.replace(/[\\/:*?"<>|]+/g, '-');
  }

  function readFileText(file) {
    if (!file) return Promise.reject(new Error(DEFAULT_MESSAGES['io.fileRequired']));
    if (typeof file.text === 'function') return Promise.resolve(file.text()).then(String);
    if (typeof FileReader === 'undefined') return Promise.reject(new Error('File reading is unavailable.'));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
      reader.addEventListener('error', () => reject(reader.error || new Error('Could not read the selected file.')));
      reader.readAsText(file);
    });
  }

  function copyText(text, output) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      return Promise.resolve(navigator.clipboard.writeText(text));
    }
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined' || !output) {
        reject(new Error(DEFAULT_MESSAGES['io.clipboardUnavailable']));
        return;
      }
      const activeElement = document.activeElement;
      if (output.focus) output.focus();
      if (output.select) output.select();
      try {
        if (document.execCommand && document.execCommand('copy')) resolve();
        else reject(new Error(DEFAULT_MESSAGES['io.clipboardUnavailable']));
      } catch (error) {
        reject(error);
      } finally {
        if (activeElement && activeElement.focus) activeElement.focus();
      }
    });
  }

  function downloadText(text, filename, mimeType = 'application/json') {
    if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      throw new Error('Downloads are unavailable.');
    }
    const type = String(mimeType || 'application/json').split(';')[0] || 'application/json';
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename(filename);
    link.hidden = true;
    const parent = document.body || document.documentElement;
    if (parent && parent.appendChild) parent.appendChild(link);
    link.click();
    if (link.remove) link.remove();
    URL.revokeObjectURL(url);
  }

  function mount(root, config = {}) {
    if (!root || typeof root.querySelector !== 'function') return null;
    root.setAttribute('data-import-export-mounted', 'true');

    const exportOptions = config.exportOptions || {};
    const importOptions = config.importOptions || {};
    const exporters = new Map();
    Object.entries(config.exporters || {}).forEach(([name, value]) => {
      const descriptor = normalizeExporter(name, value);
      if (descriptor) exporters.set(name, descriptor);
    });
    const importers = new Map(Object.entries(config.importers || {}));
    const eventRoot = config.eventRoot || (typeof document !== 'undefined' ? document : root);
    if (config.id) root.setAttribute('data-import-export-id', String(config.id));
    const refs = {
      tabs: elements(root, '[data-import-export-tab]'),
      panels: elements(root, '[data-import-export-panel]'),
      sourcePanels: elements(root, '[data-import-source-panel]'),
      status: resolveElement(root, config.status, '[data-import-export-status]'),
      exportContent: resolveElement(root, exportOptions.content, '[data-export-content]'),
      exportContentValue: resolveElement(root, exportOptions.contentValue, '[data-export-content-value]'),
      exportKind: resolveElement(root, exportOptions.kind, '[data-export-kind]'),
      exportFormat: resolveElement(root, exportOptions.format, '[data-export-format]'),
      exportFormatValue: resolveElement(root, exportOptions.formatValue, '[data-export-format-value]'),
      exportFormatRow: resolveElement(root, exportOptions.formatRow, '[data-export-format-row]'),
      exportOutput: resolveElement(root, exportOptions.output, '[data-export-output]'),
      exportRefresh: resolveElement(root, exportOptions.refresh, '[data-export-action="refresh"]'),
      exportCopy: resolveElement(root, exportOptions.copy, '[data-export-action="copy"]'),
      exportDownload: resolveElement(root, exportOptions.download, '[data-export-action="download"]'),
      importSource: resolveElement(root, importOptions.source, '[data-import-source]'),
      importKind: resolveElement(root, importOptions.kind, '[data-import-kind]'),
      importContentValue: resolveElement(root, importOptions.contentValue, '[data-import-content-value]'),
      importFormatValue: resolveElement(root, importOptions.formatValue, '[data-import-format-value]'),
      importCatalog: resolveElement(root, importOptions.catalog, '[data-import-catalog]'),
      importInput: resolveElement(root, importOptions.input, '[data-import-input]'),
      importFile: resolveElement(root, importOptions.file, '[data-import-file]'),
      importFilename: resolveElement(root, importOptions.filename, '[data-import-filename]'),
      importApply: resolveElement(root, importOptions.apply, '[data-import-action="apply"]'),
      importClear: resolveElement(root, importOptions.clear, '[data-import-action="clear"]')
    };
    const state = {
      activeTab: 'export',
      previousSource: refs.importSource ? String(refs.importSource.value || 'catalog') : 'catalog',
      pasteText: refs.importInput ? String(refs.importInput.value || '') : '',
      fileText: '',
      fileName: '',
      file: null,
      busy: false,
      activeExporter: String(config.defaultExporter || ''),
      artifact: { text: '', filename: '', mimeType: 'application/json' },
      validationRevision: 0,
      validationTimer: null,
      validationCache: null,
      detectedImport: null,
      selectingExporter: false,
      disabledBeforeBusy: new Map(),
      status: { key: 'io.panelReady', parameters: {}, type: 'idle' },
      listeners: []
    };

    function translate(key, parameters) {
      let translated = '';
      if (typeof config.translate === 'function') {
        try { translated = config.translate(key, parameters) || ''; } catch (_error) { translated = ''; }
      }
      return interpolate(translated || DEFAULT_MESSAGES[key] || '', parameters);
    }

    function notify(key, parameters = {}, type = 'info', detail = {}) {
      state.status = { key, parameters, type };
      if (refs.status) {
        refs.status.textContent = translate(key, parameters);
        refs.status.setAttribute('data-state', type);
      }
      if (typeof config.onStatus === 'function') {
        config.onStatus({ key, parameters, type, message: translate(key, parameters), ...detail });
      }
    }

    function renderStatus() {
      const parameters = state.status.key === 'io.importDetected' ? detectionSummary() : state.status.parameters;
      notify(state.status.key, parameters, state.status.type, { languageChange: true });
      syncExporterPresentation();
      syncImportPresentation();
    }

    function metadataLabel(descriptor, fallback = '') {
      if (!descriptor) return String(fallback || '');
      if (descriptor.labelKey) return translate(descriptor.labelKey) || String(descriptor.label || fallback || '');
      return String(descriptor.label || fallback || '');
    }

    function setValueText(element, value) {
      if (!element) return;
      element.textContent = String(value || '');
    }

    function selectHasOption(select, value) {
      return !!(select && Array.from(select.options || []).some((entry) => String(entry.value) === String(value)));
    }

    function appendSelectOption(select, value, label) {
      if (!select || selectHasOption(select, value) || typeof document === 'undefined' || !document.createElement) return;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (select.appendChild) select.appendChild(option);
    }

    function replaceSelectOptions(select, options, selected) {
      if (!select || !select.options || typeof document === 'undefined' || !document.createElement) return;
      const current = String(selected || select.value || '');
      while (select.options.length) select.remove(0);
      options.forEach((entry) => appendSelectOption(select, entry.id, metadataLabel(entry, entry.id)));
      select.value = selectHasOption(select, current) ? current : String(options[0]?.id || '');
    }

    function exporterDescriptor(name = state.activeExporter) {
      return exporters.get(String(name || '')) || null;
    }

    function exporterAvailable(descriptor) {
      if (!descriptor || typeof descriptor.isAvailable !== 'function') return true;
      try { return descriptor.isAvailable(context()) !== false; } catch (_error) { return false; }
    }

    function syncExporterOptions() {
      if (!refs.exportContent) return;
      exporters.forEach((descriptor, name) => {
        appendSelectOption(refs.exportContent, name, metadataLabel(descriptor, humanize(name)));
      });
      Array.from(refs.exportContent.options || []).forEach((entry) => {
        const descriptor = exporterDescriptor(entry.value);
        if (!descriptor) return;
        entry.textContent = metadataLabel(descriptor, humanize(entry.value));
        entry.disabled = !exporterAvailable(descriptor);
      });
      if (!exporters.has(state.activeExporter)) state.activeExporter = String(config.defaultExporter || exporters.keys().next().value || '');
      if (selectHasOption(refs.exportContent, state.activeExporter)) refs.exportContent.value = state.activeExporter;
    }

    function syncExporterPresentation() {
      syncExporterOptions();
      const descriptor = exporterDescriptor();
      const multiple = exporters.size > 1;
      if (refs.exportContent) refs.exportContent.hidden = !multiple;
      if (refs.exportContentValue) {
        refs.exportContentValue.hidden = multiple;
        setValueText(refs.exportContentValue, metadataLabel(descriptor, humanize(state.activeExporter || 'export')));
      }
      if (!descriptor) return;
      const formats = descriptor?.formats || [];
      if (refs.exportFormat && formats.length > 1) {
        refs.exportFormat.hidden = false;
        replaceSelectOptions(refs.exportFormat, formats, refs.exportFormat.value || descriptor.defaultFormat);
      } else if (refs.exportFormat) {
        refs.exportFormat.hidden = true;
      }
      if (refs.exportFormatValue) {
        refs.exportFormatValue.hidden = formats.length > 1;
        const format = formats.find((entry) => entry.id === descriptor?.defaultFormat) || formats[0];
        setValueText(refs.exportFormatValue, metadataLabel(format, format?.id || ''));
      }
      if (refs.exportFormatRow) refs.exportFormatRow.hidden = false;
    }

    function selectedImporter() {
      const key = refs.importKind ? String(refs.importKind.value || '') : '';
      return importers.get(key) || (config.importMetadata && typeof config.importMetadata === 'object' ? config.importMetadata : null);
    }

    function importFormatMetadata(importer) {
      const format = importer?.format;
      if (typeof format === 'string') return { mode: 'fixed', label: format };
      if (format && typeof format === 'object') return format;
      return { mode: 'fixed', label: 'JSON' };
    }

    function syncImportPresentation() {
      const importer = selectedImporter();
      const source = importSource();
      const detected = state.detectedImport || {};
      const detectedContent = detected.contentKey ? translate(detected.contentKey) : detected.content;
      const detectedFormat = detected.formatKey ? translate(detected.formatKey) : detected.format;
      if (refs.importContentValue) {
        let content = source === 'catalog' && (importer?.catalogLabel || importer?.catalogLabelKey)
          ? metadataLabel({ label: importer.catalogLabel, labelKey: importer.catalogLabelKey })
          : metadataLabel(importer, 'Imported data');
        if (source !== 'catalog' && importer?.detectContent && !detectedContent) content = `${translate('io.autoDetect')} (${content})`;
        if (detectedContent && importer?.detectContent) content = translate('io.detectedContent', { content: detectedContent });
        setValueText(refs.importContentValue, content);
        refs.importContentValue.setAttribute('data-state', detectedContent && importer?.detectContent ? 'detected' : importer?.detectContent ? 'automatic' : 'fixed');
      }
      if (refs.importFormatValue) {
        const format = importFormatMetadata(importer);
        let label = source === 'catalog'
          ? translate('io.builtInPreset')
          : format.mode === 'detect'
            ? translate('io.autoDetect')
            : metadataLabel(format, format.label || 'JSON');
        if (detectedFormat && source !== 'catalog') label = translate('io.detectedFormat', { format: detectedFormat });
        setValueText(refs.importFormatValue, label);
        refs.importFormatValue.setAttribute('data-state', detectedFormat && source !== 'catalog' ? 'detected' : format.mode === 'detect' ? 'automatic' : 'fixed');
      }
    }

    function listen(target, type, handler, options) {
      if (!target || !target.addEventListener) return;
      target.addEventListener(type, handler, options);
      state.listeners.push([target, type, handler, options]);
    }

    function tabName(tab) {
      return tab && tab.getAttribute ? tab.getAttribute('data-import-export-tab') : '';
    }

    function panelName(panel) {
      return panel && panel.getAttribute ? panel.getAttribute('data-import-export-panel') : '';
    }

    function activateTab(name, options = {}) {
      const requested = refs.tabs.some((tab) => tabName(tab) === name) ? name : 'export';
      state.activeTab = requested;
      refs.tabs.forEach((tab) => {
        const active = tabName(tab) === requested;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (active && options.focus && tab.focus) tab.focus();
      });
      refs.panels.forEach((panel) => { panel.hidden = panelName(panel) !== requested; });
      return requested;
    }

    function sourceCard(trigger) {
      return trigger && trigger.closest ? trigger.closest('.card') : null;
    }

    function panelCard() {
      return root.closest ? root.closest('.card') : null;
    }

    function openForExport(trigger, options = {}) {
      activateTab('export');
      const card = panelCard();
      if (card) {
        if (typeof window !== 'undefined' && window.CalculatorCards && typeof window.CalculatorCards.openCard === 'function') {
          const origin = sourceCard(trigger);
          window.CalculatorCards.openCard(card, {
            reason: options.reason || 'import-export-action',
            protectedCard: origin && origin !== card ? origin : null
          });
        } else {
          card.classList?.remove?.('collapsed');
          const head = card.querySelector?.('.card-head');
          if (head) head.setAttribute('aria-expanded', 'true');
        }
      }
      if (options.focus !== false && refs.exportOutput && refs.exportOutput.focus) refs.exportOutput.focus();
    }

    function handleTabKeydown(event) {
      const current = refs.tabs.indexOf(event.currentTarget || event.target);
      if (current < 0 || !refs.tabs.length) return;
      let target = current;
      if (event.key === 'ArrowRight') target = (current + 1) % refs.tabs.length;
      else if (event.key === 'ArrowLeft') target = (current - 1 + refs.tabs.length) % refs.tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = refs.tabs.length - 1;
      else return;
      if (event.preventDefault) event.preventDefault();
      activateTab(tabName(refs.tabs[target]), { focus: true });
    }

    function importSource() {
      const value = refs.importSource ? String(refs.importSource.value || '') : 'paste';
      return ['catalog', 'paste', 'file'].includes(value) ? value : 'paste';
    }

    function saveCurrentDraft() {
      if (!refs.importInput) return;
      if (state.previousSource === 'paste') state.pasteText = String(refs.importInput.value || '');
      if (state.previousSource === 'file') state.fileText = String(refs.importInput.value || '');
    }

    function syncImportSource(options = {}) {
      if (!options.initial) saveCurrentDraft();
      const source = importSource();
      refs.sourcePanels.forEach((panel) => {
        const sourceName = panel.getAttribute ? panel.getAttribute('data-import-source-panel') : '';
        panel.hidden = sourceName !== source;
      });
      if (refs.importInput) {
        refs.importInput.hidden = source === 'catalog';
        refs.importInput.readOnly = source === 'file';
        refs.importInput.value = source === 'file' ? state.fileText : state.pasteText;
      }
      if (refs.importClear) refs.importClear.hidden = source === 'catalog';
      state.previousSource = source;
      if (!options.keepValidation) invalidateImportValidation();
      syncImportPresentation();
      updateActionAvailability();
    }

    function syncExportFormat() {
      const descriptor = exporterDescriptor();
      if (descriptor && descriptor.formats.length) {
        syncExporterPresentation();
        return;
      }
      if (refs.exportFormatRow) refs.exportFormatRow.hidden = !refs.exportKind || refs.exportKind.value !== 'background';
    }

    function selectedExportFormat() {
      const descriptor = exporterDescriptor();
      const formats = descriptor?.formats || [];
      if (formats.length > 1 && refs.exportFormat) return String(refs.exportFormat.value || descriptor.defaultFormat || '');
      return String(descriptor?.defaultFormat || formats[0]?.id || (refs.exportFormat ? refs.exportFormat.value : ''));
    }

    function context(extra = {}) {
      return {
        tab: state.activeTab,
        exportKind: refs.exportKind ? refs.exportKind.value : '',
        exportFormat: selectedExportFormat(),
        exporter: state.activeExporter,
        importKind: refs.importKind ? String(refs.importKind.value || '') : '',
        importSource: importSource(),
        catalogId: refs.importCatalog ? refs.importCatalog.value : '',
        importText: refs.importInput ? String(refs.importInput.value || '') : '',
        importFile: state.file,
        importFileName: state.fileName,
        ...extra
      };
    }

    function setBusy(value) {
      state.busy = !!value;
      root.setAttribute('aria-busy', state.busy ? 'true' : 'false');
      const controls = [refs.exportRefresh, refs.exportCopy, refs.exportDownload, refs.importApply, refs.importClear]
        .filter(Boolean);
      if (state.busy) {
        state.disabledBeforeBusy.clear();
        controls.forEach((control) => {
          state.disabledBeforeBusy.set(control, !!control.disabled);
          control.disabled = true;
        });
        return;
      }
      controls.forEach((control) => {
        control.disabled = state.disabledBeforeBusy.get(control) || false;
      });
      state.disabledBeforeBusy.clear();
      updateActionAvailability();
    }

    function updateActionAvailability() {
      if (state.busy) return;
      const exportText = refs.exportOutput ? String(refs.exportOutput.value || '') : '';
      if (refs.exportCopy) refs.exportCopy.disabled = !exportText;
      if (refs.exportDownload) refs.exportDownload.disabled = !exportText;
      if (refs.importApply) {
        const source = importSource();
        const hasValue = source === 'catalog'
          ? !!(refs.importCatalog && !refs.importCatalog.disabled && refs.importCatalog.value)
          : !!(refs.importInput && String(refs.importInput.value || '').trim());
        refs.importApply.disabled = !hasValue;
      }
    }

    function presentExport(result, options = {}) {
      const artifact = normalizeResult(result);
      state.artifact = {
        text: artifact.text,
        filename: String(artifact.filename || ''),
        mimeType: String(artifact.mimeType || 'application/json')
      };
      if (refs.exportOutput) refs.exportOutput.value = artifact.text;
      updateActionAvailability();
      openForExport(options.trigger, { focus: options.focus !== false, reason: options.reason });
      if (artifact.statusKey) {
        notify(artifact.statusKey, artifact.statusParameters || {}, artifact.statusType || 'success');
      } else if (options.announce !== false) {
        notify('io.exportRefreshed', {}, 'success');
      }
      return artifact.text;
    }

    function registerExporter(name, producer, metadata = {}) {
      const key = String(name || '').trim();
      const descriptor = normalizeExporter(key, producer, metadata);
      if (!descriptor) return false;
      exporters.set(key, descriptor);
      if (!state.activeExporter) state.activeExporter = key;
      syncExporterPresentation();
      return true;
    }

    async function runExport(name, options = {}) {
      const key = String(name || state.activeExporter || '').trim();
      const descriptor = exporterDescriptor(key);
      if (!descriptor || !exporterAvailable(descriptor)) {
        const error = new Error(descriptor
          ? `${metadataLabel(descriptor, humanize(key))} is not available yet.`
          : `Unknown export action: ${key || 'default'}`);
        if (refs.exportOutput) refs.exportOutput.value = '';
        state.artifact = { text: '', filename: '', mimeType: 'application/json' };
        openForExport(options.trigger, { focus: false });
        notify('io.operationFailed', { message: error.message }, 'error', { error });
        return '';
      }
      state.activeExporter = key;
      if (refs.exportContent && selectHasOption(refs.exportContent, key) && refs.exportContent.value !== key) {
        refs.exportContent.value = key;
        if (refs.exportContent.dispatchEvent && typeof Event !== 'undefined') {
          state.selectingExporter = true;
          try { refs.exportContent.dispatchEvent(new Event('change', { bubbles: true })); }
          finally { state.selectingExporter = false; }
        }
      }
      syncExporterPresentation();
      setBusy(true);
      try {
        const result = await descriptor.produce(context({ action: 'export', trigger: options.trigger || null }));
        return presentExport(result, options);
      } catch (error) {
        if (refs.exportOutput) refs.exportOutput.value = '';
        state.artifact = { text: '', filename: '', mimeType: 'application/json' };
        updateActionAvailability();
        openForExport(options.trigger, { focus: false });
        notify('io.operationFailed', { message: error && error.message ? error.message : 'Export failed.' }, 'error', { error });
        return '';
      } finally {
        setBusy(false);
      }
    }

    async function refreshExport(options = {}) {
      if (state.activeExporter && exporters.has(state.activeExporter)) {
        return runExport(state.activeExporter, { ...options, focus: !!options.focus });
      }
      if (typeof config.exportState !== 'function') return '';
      setBusy(true);
      try {
        const result = normalizeResult(await config.exportState(context({ action: 'refresh' })));
        state.artifact = {
          text: result.text,
          filename: String(result.filename || ''),
          mimeType: String(result.mimeType || 'application/json')
        };
        if (refs.exportOutput) refs.exportOutput.value = result.text;
        updateActionAvailability();
        if (options.focus && refs.exportOutput && refs.exportOutput.focus) refs.exportOutput.focus();
        if (result.statusKey) notify(result.statusKey, result.statusParameters || {}, result.statusType || 'success');
        else if (options.announce !== false) notify('io.exportRefreshed', {}, 'success');
        return result.text;
      } catch (error) {
        if (refs.exportOutput) refs.exportOutput.value = '';
        notify('io.operationFailed', { message: error && error.message ? error.message : 'Export failed.' }, 'error', { error });
        return '';
      } finally {
        setBusy(false);
      }
    }

    async function exportText() {
      const current = refs.exportOutput ? String(refs.exportOutput.value || '') : '';
      return current || refreshExport({ announce: false });
    }

    async function copyExport() {
      const text = await exportText();
      if (!text) {
        notify('io.nothingToCopy', {}, 'error');
        return false;
      }
      setBusy(true);
      try {
        await copyText(text, refs.exportOutput);
        notify('io.exportCopied', {}, 'success');
        return true;
      } catch (error) {
        notify('io.operationFailed', {
          message: error && error.message ? error.message : translate('io.clipboardUnavailable')
        }, 'error', { error });
        return false;
      } finally {
        setBusy(false);
      }
    }

    async function downloadExport() {
      const text = await exportText();
      if (!text) {
        notify('io.nothingToDownload', {}, 'error');
        return false;
      }
      setBusy(true);
      try {
        const filename = state.artifact.filename || (typeof config.getFilename === 'function'
          ? config.getFilename(context({ text }))
          : 'export.json');
        downloadText(text, filename, state.artifact.mimeType);
        notify('io.exportDownloaded', {}, 'success');
        return true;
      } catch (error) {
        notify('io.operationFailed', { message: error && error.message ? error.message : 'Download failed.' }, 'error', { error });
        return false;
      } finally {
        setBusy(false);
      }
    }

    function importFingerprint() {
      return JSON.stringify({
        kind: refs.importKind ? String(refs.importKind.value || '') : '',
        source: importSource(),
        catalog: refs.importCatalog ? String(refs.importCatalog.value || '') : '',
        text: refs.importInput ? String(refs.importInput.value || '') : '',
        fileName: state.fileName
      });
    }

    function invalidateImportValidation() {
      state.validationRevision += 1;
      if (state.validationTimer != null && typeof clearTimeout === 'function') clearTimeout(state.validationTimer);
      state.validationTimer = null;
      state.validationCache = null;
      state.detectedImport = null;
      syncImportPresentation();
    }

    async function describePreparedImport(prepared, importer) {
      let description = null;
      if (importer && typeof importer.describe === 'function') description = await importer.describe(prepared, context({ action: 'describe-import' }));
      else if (typeof config.describeImport === 'function') description = await config.describeImport(prepared, context({ action: 'describe-import' }));
      if (!description || typeof description !== 'object') return {};
      return {
        content: description.content ? String(description.content) : '',
        contentKey: description.contentKey ? String(description.contentKey) : '',
        format: description.format ? String(description.format) : '',
        formatKey: description.formatKey ? String(description.formatKey) : ''
      };
    }

    async function prepareImport(extra = {}) {
      const fingerprint = importFingerprint();
      if (!extra.force && state.validationCache && state.validationCache.fingerprint === fingerprint) return state.validationCache.request;
      const source = importSource();
      const text = refs.importInput ? String(refs.importInput.value || '').trim() : '';
      if (source === 'file' && !text) throw new Error(translate('io.fileRequired'));
      if (source === 'paste' && !text) throw new Error(translate('io.importRequired'));
      const importer = importers.get(refs.importKind ? String(refs.importKind.value || '') : '') || null;
      const raw = importer && typeof importer.read === 'function'
        ? await importer.read(context(extra))
        : typeof config.readImport === 'function'
          ? await config.readImport(context(extra))
        : context(extra);
      const prepared = importer && typeof importer.validate === 'function'
        ? await importer.validate(raw, context(extra))
        : typeof config.validateImport === 'function'
          ? await config.validateImport(raw, context(extra))
        : raw;
      if (fingerprint !== importFingerprint()) {
        const error = new Error('Import input changed while it was being validated.');
        error.code = 'STALE_IMPORT_VALIDATION';
        throw error;
      }
      const description = await describePreparedImport(prepared, importer || selectedImporter());
      const request = { prepared, importer, description };
      state.validationCache = { fingerprint, request };
      state.detectedImport = description;
      syncImportPresentation();
      return request;
    }

    function detectionSummary() {
      const importer = selectedImporter();
      const format = importFormatMetadata(importer);
      return {
        content: state.detectedImport?.contentKey ? translate(state.detectedImport.contentKey) : state.detectedImport?.content || metadataLabel(importer, 'Imported data'),
        format: state.detectedImport?.formatKey ? translate(state.detectedImport.formatKey) : state.detectedImport?.format || (importSource() === 'catalog'
          ? translate('io.builtInPreset')
          : metadataLabel(format, format.label || translate('io.autoDetect')))
      };
    }

    async function validateImportPreview(options = {}) {
      const revision = state.validationRevision;
      try {
        await prepareImport({ action: options.action || 'validate-preview' });
        if (revision !== state.validationRevision) return false;
        if (options.announce !== false) notify('io.importDetected', detectionSummary(), 'success');
        return true;
      } catch (error) {
        if (revision !== state.validationRevision || error?.code === 'STALE_IMPORT_VALIDATION') return false;
        if (!options.silentErrors) notify('io.operationFailed', { message: error && error.message ? error.message : 'Import validation failed.' }, 'error', { error });
        return false;
      }
    }

    function scheduleImportDetection() {
      invalidateImportValidation();
      if (importSource() !== 'paste' || !refs.importInput || !String(refs.importInput.value || '').trim()) return;
      if (typeof setTimeout !== 'function') return;
      state.validationTimer = setTimeout(() => {
        state.validationTimer = null;
        validateImportPreview({ action: 'detect-paste', silentErrors: true });
      }, Number(config.importDetectionDelay ?? 350));
    }

    async function applyImport() {
      const selectedImporter = importers.get(refs.importKind ? String(refs.importKind.value || '') : '') || null;
      if (typeof config.applyImport !== 'function' && !(selectedImporter && typeof selectedImporter.apply === 'function')) return false;
      if (state.validationTimer != null && typeof clearTimeout === 'function') clearTimeout(state.validationTimer);
      state.validationTimer = null;
      setBusy(true);
      try {
        const request = await prepareImport({ action: 'import' });
        const importer = request.importer;
        const replacesState = importer ? importer.replacesState !== false : true;
        const meaningful = importer && typeof importer.hasMeaningfulState === 'function'
          ? await importer.hasMeaningfulState(context({ action: 'import' }))
          : true;
        const confirmed = replacesState && meaningful && typeof config.confirmReplace === 'function'
          ? await config.confirmReplace(request.prepared, context({ action: 'import' }))
          : true;
        if (confirmed === false) {
          notify('io.importCancelled', {}, 'info');
          return false;
        }
        const apply = importer && typeof importer.apply === 'function' ? importer.apply : config.applyImport;
        if (typeof apply !== 'function') throw new Error('No import action is configured.');
        const result = await apply(request.prepared, context({ action: 'import' }));
        if (result && result.statusKey) {
          notify(result.statusKey, result.statusParameters || {}, result.statusType || 'success');
        } else {
          notify('io.importComplete', {}, 'success');
        }
        return true;
      } catch (error) {
        notify('io.operationFailed', { message: error && error.message ? error.message : 'Import failed.' }, 'error', { error });
        return false;
      } finally {
        setBusy(false);
      }
    }

    async function handleFileChange() {
      const file = refs.importFile && refs.importFile.files && refs.importFile.files[0];
      state.file = file || null;
      state.fileName = file ? String(file.name || '') : '';
      state.fileText = '';
      if (refs.importFilename) refs.importFilename.textContent = state.fileName;
      if (!file) {
        if (refs.importInput && importSource() === 'file') refs.importInput.value = '';
        updateActionAvailability();
        return;
      }
      notify('io.fileReading', { filename: state.fileName }, 'info');
      setBusy(true);
      try {
        state.fileText = await readFileText(file);
        if (refs.importInput && importSource() === 'file') refs.importInput.value = state.fileText;
        updateActionAvailability();
        invalidateImportValidation();
        await prepareImport({ action: 'validate-file' });
        notify('io.fileReady', { filename: state.fileName }, 'success');
      } catch (error) {
        notify('io.operationFailed', { message: error && error.message ? error.message : 'File validation failed.' }, 'error', { error });
      } finally {
        setBusy(false);
      }
    }

    function clearImport() {
      const source = importSource();
      if (source === 'file') {
        state.file = null;
        state.fileName = '';
        state.fileText = '';
        if (refs.importFile) refs.importFile.value = '';
        if (refs.importFilename) refs.importFilename.textContent = '';
      } else {
        state.pasteText = '';
      }
      if (refs.importInput) refs.importInput.value = '';
      invalidateImportValidation();
      updateActionAvailability();
      notify('io.importCleared', {}, 'info');
    }

    function handleContextChange(options = {}) {
      syncExportFormat();
      syncExporterPresentation();
      syncImportPresentation();
      if (options.clearExport) {
        if (refs.exportOutput) refs.exportOutput.value = '';
        state.artifact = { text: '', filename: '', mimeType: 'application/json' };
      }
      updateActionAvailability();
      if (typeof config.onContextChange === 'function') config.onContextChange(context());
    }

    function delegatedTrigger(event) {
      const trigger = event && event.target && event.target.closest
        ? event.target.closest('[data-import-export-trigger]')
        : null;
      if (!trigger || (eventRoot.contains && !eventRoot.contains(trigger))) return null;
      if (trigger.getAttribute('data-import-export-running') === 'true') return null;
      const targetId = trigger.getAttribute('data-import-export-target');
      if (targetId && config.id && targetId !== String(config.id)) return null;
      const name = trigger.getAttribute('data-import-export-trigger');
      if (!exporters.has(name)) return null;
      return { trigger, name };
    }

    function prepareDelegatedExport(event) {
      if (!delegatedTrigger(event)) return;
      if (refs.exportOutput) refs.exportOutput.value = '';
      state.artifact = { text: '', filename: '', mimeType: 'application/json' };
      updateActionAvailability();
    }

    function handleDelegatedExport(event) {
      const delegated = delegatedTrigger(event);
      if (!delegated) return;
      const { trigger, name } = delegated;
      Promise.resolve().then(() => runExport(name, { trigger, focus: true }));
    }

    refs.tabs.forEach((tab) => {
      listen(tab, 'click', () => activateTab(tabName(tab)));
      listen(tab, 'keydown', handleTabKeydown);
    });
    listen(refs.importSource, 'change', () => {
      syncImportSource();
      handleContextChange();
    });
    listen(refs.importKind, 'change', () => {
      invalidateImportValidation();
      handleContextChange();
    });
    listen(refs.importCatalog, 'change', () => {
      invalidateImportValidation();
      handleContextChange();
    });
    listen(refs.importInput, 'input', () => {
      if (importSource() === 'paste') state.pasteText = String(refs.importInput.value || '');
      scheduleImportDetection();
      updateActionAvailability();
    });
    listen(refs.importInput, 'blur', () => {
      if (importSource() === 'paste' && refs.importInput && String(refs.importInput.value || '').trim()) {
        validateImportPreview({ action: 'validate-paste', silentErrors: false });
      }
    });
    listen(refs.importFile, 'change', handleFileChange);
    listen(refs.importApply, 'click', applyImport);
    listen(refs.importClear, 'click', clearImport);
    listen(refs.exportRefresh, 'click', () => refreshExport({ focus: false }));
    listen(refs.exportCopy, 'click', copyExport);
    listen(refs.exportDownload, 'click', downloadExport);
    listen(refs.exportContent, 'change', () => {
      state.activeExporter = String(refs.exportContent.value || state.activeExporter || '');
      handleContextChange({ clearExport: !state.selectingExporter });
    });
    listen(refs.exportKind, 'change', () => handleContextChange({ clearExport: true }));
    listen(refs.exportFormat, 'change', () => handleContextChange({ clearExport: true }));
    // Clear stale text before a legacy inline click handler generates a new export.
    // The bubble listener then presents what that handler produced, or reports an
    // accessible error when it produced nothing.
    listen(eventRoot, 'click', prepareDelegatedExport, true);
    listen(eventRoot, 'click', handleDelegatedExport);
    if (typeof document !== 'undefined') listen(document, 'site-language-change', renderStatus);

    const selectedTab = refs.tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    activateTab(tabName(selectedTab) || 'export');
    syncImportSource({ initial: true });
    syncExporterPresentation();
    syncExportFormat();
    updateActionAvailability();
    renderStatus();

    return {
      activateTab,
      applyImport,
      clearImport,
      context,
      downloadExport,
      copyExport,
      notify,
      presentExport,
      registerExporter,
      refreshExport,
      runExport,
      sync() {
        syncImportSource({ initial: true, keepValidation: true });
        syncExportFormat();
        updateActionAvailability();
      },
      destroy() {
        if (state.validationTimer != null && typeof clearTimeout === 'function') clearTimeout(state.validationTimer);
        state.listeners.forEach(([target, type, handler, options]) => {
          if (target.removeEventListener) target.removeEventListener(type, handler, options);
        });
        state.listeners = [];
      }
    };
  }

  const api = { mount };
  if (typeof globalThis !== 'undefined') globalThis.ImportExportPanel = api;
  if (typeof window !== 'undefined') window.ImportExportPanel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
