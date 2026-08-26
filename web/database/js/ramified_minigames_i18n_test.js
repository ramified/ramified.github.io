'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'ramified_minigames.html'), 'utf8');
const setup = fs.readFileSync(path.join(__dirname, 'ramified_minigames_setup.js'), 'utf8');
const localeSource = fs.readFileSync(path.join(__dirname, 'i18n', 'ramified_minigames_locales.js'), 'utf8');
const catalogs = {};

vm.runInNewContext(localeSource, {
  window: {
    RAMIFIED_MINIGAMES_I18N_LEGACY_SOURCES: {},
    SiteI18n: {
      register(namespace, locale, messages) {
        if (namespace === 'ramified-minigames') catalogs[locale] = messages;
      }
    }
  },
  document: { addEventListener() {} }
});

const english = catalogs.en;
const chinese = catalogs['zh-CN'];
assert.ok(english, 'English minigame catalog must register');
assert.ok(chinese, 'Simplified Chinese minigame catalog must register');

function explicitHtmlKeys(source) {
  const keys = [];
  for (const match of source.matchAll(/<[^>]+>/g)) {
    const tag = match[0];
    if (/\bdata-i18n-ignore(?:\s|=|>)/.test(tag)) continue;
    for (const attribute of tag.matchAll(/\bdata-i18n(?:-aria-label|-placeholder|-title)?="([^"]+)"/g)) {
      keys.push(attribute[1]);
    }
  }
  return keys;
}

function literalTkKeys(source) {
  return Array.from(source.matchAll(/\btk\(\s*(['"])([^'"]+)\1/g), (match) => match[2]);
}

function placeholders(value) {
  return Array.from(String(value || '').matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g), (match) => match[1]).sort();
}

const usedKeys = Array.from(new Set([
  ...explicitHtmlKeys(html),
  ...literalTkKeys(setup)
])).sort();

usedKeys.forEach((key) => {
  assert.strictEqual(typeof english[key], 'string', `missing English locale key ${key}`);
  assert.ok(english[key].trim(), `empty English locale key ${key}`);
  assert.strictEqual(typeof chinese[key], 'string', `missing Simplified Chinese locale key ${key}`);
  assert.ok(chinese[key].trim(), `empty Simplified Chinese locale key ${key}`);
});

const publicKeys = Array.from(new Set([
  ...Object.keys(english),
  ...Object.keys(chinese)
])).filter((key) => !key.startsWith('__')).sort();

publicKeys.forEach((key) => {
  assert.strictEqual(typeof english[key], 'string', `English catalog is missing public key ${key}`);
  assert.strictEqual(typeof chinese[key], 'string', `Chinese catalog is missing public key ${key}`);
  assert.deepStrictEqual(
    placeholders(chinese[key]),
    placeholders(english[key]),
    `translation parameters differ for ${key}`
  );
});

const intentionalEnglish = chinese.__intentionalEnglish;
assert.ok(Array.isArray(intentionalEnglish), '__intentionalEnglish must be an array');
intentionalEnglish.forEach((source, index) => {
  assert.strictEqual(typeof source, 'string', `intentional English entry ${index} must be a string`);
  assert.ok(source.trim(), `intentional English entry ${index} must not be empty`);
  assert.strictEqual(source, source.trim(), `intentional English entry ${index} must be an exact trimmed source`);
});
assert.strictEqual(new Set(intentionalEnglish).size, intentionalEnglish.length, 'intentional English entries must be unique');

assert.ok(html.includes('id="check-translation"'));
assert.ok(html.includes('data-i18n="debug.checkTranslation"'));
assert.ok(html.includes('data-i18n-aria-label="access.checkTranslation"'));

console.log(`ramified_minigames_i18n_test: ${usedKeys.length} referenced keys and ${publicKeys.length} catalog entries passed`);
