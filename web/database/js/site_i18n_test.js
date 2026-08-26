'use strict';

const assert = require('assert');
const i18n = require('./site_i18n.js');

i18n.register('test', 'en', {
  greeting: 'Hello, {{name}}!',
  fallback: 'English fallback',
  acronym: 'CD',
  auditMissing: 'Audit missing',
  __sources: { fallback: 'Old fallback text' }
});
i18n.register('test', 'zh-CN', {
  greeting: '你好，{{name}}！',
  acronym: 'CD',
  __patterns: [['^(\\d+) moves$', '$1 步']],
  __intentionalEnglish: ['CD']
});

function makeWindow(href, storedLanguage, browserLanguages = ['en']) {
  const storage = new Map();
  if (storedLanguage) storage.set('ramified.site.language', storedLanguage);
  const calls = [];
  return {
    location: { href },
    history: {
      state: null,
      replaceState(_state, _title, url) { calls.push(url); }
    },
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    },
    navigator: { languages: browserLanguages, language: browserLanguages[0] },
    calls,
    storage
  };
}

global.window = makeWindow('https://example.test/game?mode=go&lang=zh-CN#board', 'en');
assert.strictEqual(i18n.init({ namespace: 'test', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'] }), 'zh-CN');
assert.strictEqual(i18n.t('greeting', { name: '林' }), '你好，林！');
assert.strictEqual(i18n.t('fallback'), 'English fallback');
assert.strictEqual(i18n.t('missing'), '');
assert.strictEqual(i18n.translateSource('12 moves'), '12 步');
assert.strictEqual(i18n.normalizeLocale('zh_Hans'), 'zh-CN');

i18n.setLocale('en');
assert.strictEqual(i18n.translateSource('Old fallback text'), 'English fallback');
assert.strictEqual(global.window.storage.get('ramified.site.language'), 'en');
assert.strictEqual(global.window.calls.at(-1), '/game?mode=go&lang=en#board');

global.window = makeWindow('https://example.test/game?mode=go', 'zh-CN', ['en']);
assert.strictEqual(i18n.init({ namespace: 'test', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'] }), 'zh-CN');

global.window = makeWindow('https://example.test/game', '', ['zh-TW', 'en']);
assert.strictEqual(i18n.init({ namespace: 'test', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'] }), 'zh-CN');

global.window = makeWindow('https://example.test/game?lang=unsupported', '', ['fr-FR']);
assert.strictEqual(i18n.init({ namespace: 'test', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'] }), 'en');

const warningMessages = [];
const originalConsoleWarn = console.warn;
console.warn = (...parts) => warningMessages.push(parts.map(String).join(' '));
try {
  i18n.setTranslationWarnings(false, { locale: 'zh-CN' });
  i18n.t('fallback');
  assert.deepStrictEqual(warningMessages, [], 'disabled diagnostics stay silent');

  i18n.setTranslationWarnings(true, { locale: 'zh-CN' });
  i18n.t('fallback');
  i18n.t('fallback');
  assert.strictEqual(warningMessages.filter((message) => message.includes('fallback')).length, 1, 'missing-key warnings are session-deduplicated');
  i18n.t('acronym');
  i18n.translateSource('CD');
  assert.ok(!warningMessages.some((message) => message.endsWith(' CD')), 'equal translations and exact allowlist entries stay silent');
  i18n.translateSource('CD player is ready');
  assert.strictEqual(warningMessages.filter((message) => message.includes('CD player is ready')).length, 1, 'allowlisting CD does not suppress a containing sentence');

  const keyedElement = {
    nodeType: 1,
    closest() { return null; },
    getAttribute(name) { return name === 'data-i18n' ? 'auditMissing' : null; },
    hasAttribute(name) { return name === 'data-i18n'; }
  };
  const ignoredElement = {
    nodeType: 1,
    closest(selector) { return selector.includes('data-i18n-ignore') ? this : null; },
    getAttribute(name) { return name === 'data-i18n' ? 'ignoredMissing' : null; },
    hasAttribute(name) { return name === 'data-i18n'; }
  };
  const auditRoot = {
    nodeType: 9,
    querySelectorAll() { return [keyedElement, ignoredElement]; }
  };
  const issues = i18n.auditTranslations(auditRoot, { locale: 'zh-CN' });
  assert.deepStrictEqual(issues.map((issue) => issue.key), ['auditMissing']);

  i18n.setTranslationWarnings(false, { locale: 'zh-CN' });
  i18n.translateSource('Another untranslated sentence');
  assert.ok(!warningMessages.some((message) => message.includes('Another untranslated sentence')));
  i18n.setTranslationWarnings(true, { locale: 'zh-CN' });
  i18n.translateSource('CD player is ready');
  assert.strictEqual(warningMessages.filter((message) => message.includes('CD player is ready')).length, 1, 'deduplication survives disable and re-enable');
} finally {
  i18n.setTranslationWarnings(false, { locale: 'zh-CN' });
  console.warn = originalConsoleWarn;
}

delete global.window;
console.log('site_i18n_test: all tests passed');
