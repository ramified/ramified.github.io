'use strict';

const assert = require('assert');
const i18n = require('./site_i18n.js');

i18n.register('test', 'en', {
  greeting: 'Hello, {{name}}!',
  fallback: 'English fallback',
  __sources: { fallback: 'Old fallback text' }
});
i18n.register('test', 'zh-CN', {
  greeting: '你好，{{name}}！',
  __patterns: [['^(\\d+) moves$', '$1 步']]
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

delete global.window;
console.log('site_i18n_test: all tests passed');
