const assert = require('assert');
const fs = require('fs');
const analytics = require('./ramified_minigames_analytics.js');

function fakeEnvironment() {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const selectListeners = new Map();
  const requests = [];
  const select = {
    value: 'gomoku',
    addEventListener(type, listener) { selectListeners.set(type, listener); },
    removeEventListener(type) { selectListeners.delete(type); }
  };
  const document = {
    visibilityState: 'visible',
    getElementById(id) { return id === 'game-mode-select' ? select : null; },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
    removeEventListener(type) { documentListeners.delete(type); }
  };
  const window = {
    document,
    navigator: { doNotTrack: '0' },
    fetch(_url, options) {
      requests.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true });
    },
    setInterval(listener) { this.interval = listener; return 1; },
    clearInterval() {},
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener(type) { windowListeners.delete(type); }
  };
  return { document, documentListeners, requests, select, selectListeners, window, windowListeners };
}

function testPrivacyPreferences() {
  assert.strictEqual(analytics.trackingPreferenceAllows({ doNotTrack: '1' }), false);
  assert.strictEqual(analytics.trackingPreferenceAllows({ globalPrivacyControl: true }), false);
  assert.strictEqual(analytics.trackingPreferenceAllows({ doNotTrack: '0' }), true);
}

function testActivePlaytimeAndModeAttribution() {
  const env = fakeEnvironment();
  let now = 0;
  const tracker = analytics.createTracker({
    window: env.window,
    document: env.document,
    navigator: env.window.navigator,
    baseUrl: 'https://analytics.example.test/',
    clock: () => now
  });
  assert.ok(tracker);
  assert.deepStrictEqual(env.requests, [{ type: 'visit', gameMode: 'gomoku' }]);

  now = 15000;
  tracker.sample();
  tracker.flush();
  assert.deepStrictEqual(env.requests[1], { type: 'heartbeat', gameMode: 'gomoku', activeSeconds: 15 });

  env.select.value = 'go';
  now = 20000;
  env.selectListeners.get('change')();
  assert.deepStrictEqual(env.requests[2], { type: 'heartbeat', gameMode: 'gomoku', activeSeconds: 5 });

  now = 35000;
  tracker.sample();
  tracker.flush();
  assert.deepStrictEqual(env.requests[3], { type: 'heartbeat', gameMode: 'go', activeSeconds: 15 });
  tracker.stop();
}

function testDisabledWithoutEndpointOrWithGpc() {
  const env = fakeEnvironment();
  assert.strictEqual(analytics.createTracker({ window: env.window, document: env.document, baseUrl: '' }), null);
  env.window.navigator.globalPrivacyControl = true;
  assert.strictEqual(analytics.createTracker({
    window: env.window,
    document: env.document,
    navigator: env.window.navigator,
    baseUrl: 'https://analytics.example.test'
  }), null);
  assert.deepStrictEqual(env.requests, []);
}

function testPageWiringAndDisclosure() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('data-i18n="analytics.notice"'));
  assert.ok(html.includes('js/ramified_minigames_analytics.js?v='));
  assert.ok(html.indexOf('window.RAMIFIED_MINIGAMES_ONLINE_URL') < html.indexOf('js/ramified_minigames_analytics.js'));
}

testPrivacyPreferences();
testActivePlaytimeAndModeAttribution();
testDisabledWithoutEndpointOrWithGpc();
testPageWiringAndDisclosure();
console.log('ramified_minigames_analytics_test: all tests passed');
