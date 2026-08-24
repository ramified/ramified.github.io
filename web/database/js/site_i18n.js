(() => {
  'use strict';

  const STORAGE_KEY = 'ramified.site.language';
  const catalogs = Object.create(null);
  const sourceIndexes = new Map();
  let config = {
    namespace: '',
    defaultLocale: 'en',
    supportedLocales: ['en'],
    locale: 'en'
  };
  let observer = null;
  let applying = false;
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();

  function normalizeLocale(value, supported = config.supportedLocales) {
    const raw = String(value || '').trim().replace('_', '-').toLowerCase();
    if (!raw) return '';
    const exact = supported.find((locale) => locale.toLowerCase() === raw);
    if (exact) return exact;
    if (raw === 'zh' || raw.startsWith('zh-')) {
      return supported.find((locale) => locale.toLowerCase() === 'zh-cn') || '';
    }
    const language = raw.split('-')[0];
    return supported.find((locale) => locale.toLowerCase().split('-')[0] === language) || '';
  }

  function namespaceCatalog(namespace, locale) {
    return catalogs[namespace] && catalogs[namespace][locale];
  }

  function register(namespace, locale, messages) {
    if (!namespace || !locale || !messages || typeof messages !== 'object') return;
    catalogs[namespace] ||= Object.create(null);
    catalogs[namespace][locale] = { ...(catalogs[namespace][locale] || {}), ...messages };
    sourceIndexes.clear();
  }

  function interpolate(value, parameters) {
    if (typeof value !== 'string') return '';
    return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, name) => {
      const replacement = parameters && Object.prototype.hasOwnProperty.call(parameters, name)
        ? parameters[name]
        : '';
      return String(replacement ?? '');
    });
  }

  function lookup(key, locale = config.locale) {
    const selected = namespaceCatalog(config.namespace, locale);
    const fallback = namespaceCatalog(config.namespace, config.defaultLocale);
    if (selected && typeof selected[key] === 'string') return selected[key];
    if (fallback && typeof fallback[key] === 'string') return fallback[key];
    return '';
  }

  function t(key, parameters) {
    return interpolate(lookup(key), parameters);
  }

  function sourceIndex(locale) {
    const cacheKey = `${config.namespace}\u0000${locale}`;
    if (sourceIndexes.has(cacheKey)) return sourceIndexes.get(cacheKey);
    const english = namespaceCatalog(config.namespace, config.defaultLocale) || {};
    const localized = namespaceCatalog(config.namespace, locale) || {};
    const legacySources = english.__sources && typeof english.__sources === 'object' ? english.__sources : {};
    const index = new Map();
    Object.keys(english).forEach((key) => {
      if (key.startsWith('__') || typeof english[key] !== 'string') return;
      const translated = typeof localized[key] === 'string' ? localized[key] : english[key];
      index.set(english[key], translated);
      if (typeof legacySources[key] === 'string') index.set(legacySources[key], translated);
    });
    sourceIndexes.set(cacheKey, index);
    return index;
  }

  function translateSource(value, locale = config.locale) {
    const text = String(value ?? '');
    if (!text) return text;
    const exact = sourceIndex(locale).get(text);
    if (exact) return exact;
    const catalog = namespaceCatalog(config.namespace, locale) || {};
    const patterns = Array.isArray(catalog.__patterns) ? catalog.__patterns : [];
    let translated = text;
    for (const item of patterns) {
      if (!Array.isArray(item) || item.length < 2) continue;
      try {
        const expression = new RegExp(item[0]);
        if (translated.match(expression)) {
          translated = translated.replace(expression, item[1]);
          break;
        }
      } catch (_error) {
        // Ignore malformed optional compatibility patterns.
      }
    }
    const fragments = catalog.__fragments && typeof catalog.__fragments === 'object' ? catalog.__fragments : {};
    return Object.entries(fragments)
      .sort((left, right) => right[0].length - left[0].length)
      .reduce((result, [source, replacement]) => result.split(source).join(replacement), translated);
  }

  function translateTextNode(node) {
    if (!node || !node.parentElement || node.parentElement.closest('[data-i18n-ignore], script, style, textarea')) return;
    const current = node.nodeValue || '';
    const previous = originals.get(node);
    if (!previous || (current !== previous.applied && !applying)) {
      originals.set(node, { source: current, applied: current });
    }
    const record = originals.get(node);
    const source = record ? record.source : current;
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    const core = source.slice(leading.length, source.length - trailing.length || undefined);
    const next = config.locale === config.defaultLocale ? source : `${leading}${translateSource(core)}${trailing}`;
    if (next !== current) {
      node.nodeValue = next;
      originals.set(node, { source, applied: next });
    }
  }

  function translateElement(element) {
    if (!element || element.nodeType !== 1 || element.matches('[data-i18n-ignore]')) return;
    const textKey = element.getAttribute('data-i18n');
    if (textKey) {
      const nextText = t(textKey);
      if (element.textContent !== nextText) element.textContent = nextText;
    }
    const attributes = [
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-title', 'title']
    ];
    attributes.forEach(([dataName, attribute]) => {
      const key = element.getAttribute(dataName);
      if (key) {
        const next = t(key);
        if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
      }
      else if (element.hasAttribute(attribute)) {
        const current = element.getAttribute(attribute) || '';
        const records = attributeOriginals.get(element) || Object.create(null);
        const previous = records[attribute];
        if (!previous || (current !== previous.applied && !applying)) {
          records[attribute] = { source: current, applied: current };
          attributeOriginals.set(element, records);
        }
        const record = records[attribute];
        const next = config.locale === config.defaultLocale ? record.source : translateSource(record.source);
        if (next !== current) element.setAttribute(attribute, next);
        records[attribute] = { source: record.source, applied: next };
      }
    });
  }

  function translate(root = document) {
    if (typeof document === 'undefined' || !root) return;
    applying = true;
    try {
      if (root.nodeType === 1) translateElement(root);
      const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
      elements.forEach(translateElement);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(translateTextNode);
    } finally {
      applying = false;
    }
  }

  function updateUrl(locale) {
    if (typeof window === 'undefined' || !window.history || !window.location) return;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function setLocale(value, options = {}) {
    const locale = normalizeLocale(value);
    if (!locale) return config.locale;
    const changed = locale !== config.locale;
    config.locale = locale;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dataset.locale = locale;
      translate(document);
      document.querySelectorAll('[data-language-switch]').forEach((control) => { control.value = locale; });
    }
    if (options.persist !== false && typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, locale); } catch (_error) { /* Storage can be unavailable. */ }
    }
    if (options.updateUrl !== false) updateUrl(locale);
    if (changed && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('site-language-change', { detail: { locale } }));
    }
    return locale;
  }

  function resolveInitialLocale() {
    if (typeof window === 'undefined') return config.defaultLocale;
    const query = normalizeLocale(new URL(window.location.href).searchParams.get('lang'));
    if (query) return query;
    try {
      const saved = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_error) { /* Storage can be unavailable. */ }
    const languages = Array.isArray(window.navigator.languages) ? window.navigator.languages : [window.navigator.language];
    for (const language of languages) {
      const browserLocale = normalizeLocale(language);
      if (browserLocale) return browserLocale;
    }
    return config.defaultLocale;
  }

  function init(options = {}) {
    config = {
      ...config,
      ...options,
      supportedLocales: Array.isArray(options.supportedLocales) && options.supportedLocales.length
        ? options.supportedLocales.slice()
        : config.supportedLocales
    };
    config.defaultLocale = normalizeLocale(config.defaultLocale) || config.supportedLocales[0] || 'en';
    config.locale = resolveInitialLocale();
    setLocale(config.locale, { persist: false, updateUrl: false });
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-language-switch]').forEach((control) => {
        control.value = config.locale;
        control.addEventListener('change', () => setLocale(control.value));
      });
      observer?.disconnect();
      observer = new MutationObserver((mutations) => {
        if (applying) return;
        mutations.forEach((mutation) => {
          if (mutation.type === 'characterData') translateTextNode(mutation.target);
          if (mutation.type === 'attributes') translateElement(mutation.target);
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 3) translateTextNode(node);
            else if (node.nodeType === 1) translate(node);
          });
        });
      });
      observer.observe(document.body || document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'title', 'placeholder']
      });
    }
    return config.locale;
  }

  const api = {
    register,
    init,
    t,
    setLocale,
    translate,
    translateSource,
    normalizeLocale,
    getLocale: () => config.locale
  };

  if (typeof window !== 'undefined') window.SiteI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
