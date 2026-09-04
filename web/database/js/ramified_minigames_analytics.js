(function(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RamifiedMinigamesAnalytics = api;
})(typeof window !== 'undefined' ? window : null, function(root) {
  'use strict';

  const SAMPLE_INTERVAL_MS = 15000;
  const IDLE_AFTER_MS = 120000;
  const MAX_SAMPLE_MS = 30000;
  const MAX_SECONDS_PER_EVENT = 60;
  const VALID_GAME_MODES = new Set([
    '2048',
    'billiards',
    'chinese-checkers',
    'connect-four',
    'fide-chess',
    'go',
    'gomoku',
    'hex',
    'lianliankan',
    'reversi',
    'sokoban'
  ]);

  function normalizeBaseUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      url.pathname = url.pathname.replace(/\/+$/, '');
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/+$/, '');
    } catch (_) {
      return '';
    }
  }

  function normalizeGameMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return VALID_GAME_MODES.has(mode) ? mode : 'unknown';
  }

  function trackingPreferenceAllows(navigatorObject) {
    const nav = navigatorObject || {};
    return nav.doNotTrack !== '1'
      && nav.msDoNotTrack !== '1'
      && nav.globalPrivacyControl !== true;
  }

  function createTracker(options = {}) {
    const win = options.window || root;
    const doc = options.document || (win && win.document);
    const nav = options.navigator || (win && win.navigator) || {};
    const clock = options.clock || (() => (
      win && win.performance && typeof win.performance.now === 'function'
        ? win.performance.now()
        : Date.now()
    ));
    const baseUrl = normalizeBaseUrl(options.baseUrl || (win && win.RAMIFIED_MINIGAMES_ONLINE_URL));
    if (!win || !doc || !baseUrl || !trackingPreferenceAllows(nav)) return null;

    const endpoint = `${baseUrl}/api/analytics`;
    const pendingSeconds = new Map();
    let currentMode = readGameMode(doc);
    let lastSampleAt = clock();
    let lastActivityAt = lastSampleAt;
    let previouslyVisible = doc.visibilityState !== 'hidden';
    let timer = null;
    let stopped = false;

    function queueSeconds(mode, seconds) {
      const normalized = normalizeGameMode(mode);
      pendingSeconds.set(normalized, (pendingSeconds.get(normalized) || 0) + Math.max(0, Number(seconds) || 0));
    }

    function sample() {
      const now = clock();
      const elapsed = Math.max(0, Math.min(MAX_SAMPLE_MS, now - lastSampleAt));
      if (previouslyVisible && now - lastActivityAt <= IDLE_AFTER_MS) queueSeconds(currentMode, elapsed / 1000);
      lastSampleAt = now;
      previouslyVisible = doc.visibilityState !== 'hidden';
    }

    function send(payload, beacon = false) {
      const body = JSON.stringify(payload);
      if (beacon && typeof nav.sendBeacon === 'function') {
        try {
          if (nav.sendBeacon(endpoint, body)) return;
        } catch (_) {
          // Fall back to a keepalive request.
        }
      }
      if (typeof win.fetch !== 'function') return;
      try {
        const request = win.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body,
          credentials: 'omit',
          keepalive: true
        });
        if (request && typeof request.catch === 'function') request.catch(() => {});
      } catch (_) {
        // Analytics must never interfere with play.
      }
    }

    function flush(beacon = false) {
      pendingSeconds.forEach((seconds, mode) => {
        let wholeSeconds = Math.floor(seconds);
        pendingSeconds.set(mode, seconds - wholeSeconds);
        while (wholeSeconds > 0) {
          const activeSeconds = Math.min(MAX_SECONDS_PER_EVENT, wholeSeconds);
          send({ type: 'heartbeat', gameMode: mode, activeSeconds }, beacon);
          wholeSeconds -= activeSeconds;
        }
      });
    }

    function noteActivity() {
      lastActivityAt = clock();
    }

    function handleVisibilityChange() {
      sample();
      if (doc.visibilityState === 'hidden') flush(true);
    }

    function handleModeChange() {
      sample();
      flush();
      currentMode = readGameMode(doc);
      lastActivityAt = clock();
    }

    function handlePageHide() {
      sample();
      flush(true);
    }

    function stop() {
      if (stopped) return;
      stopped = true;
      handlePageHide();
      if (timer != null && typeof win.clearInterval === 'function') win.clearInterval(timer);
      doc.removeEventListener('visibilitychange', handleVisibilityChange);
      doc.removeEventListener('pointerdown', noteActivity, true);
      doc.removeEventListener('keydown', noteActivity, true);
      doc.removeEventListener('touchstart', noteActivity, true);
      const select = doc.getElementById('game-mode-select');
      if (select) select.removeEventListener('change', handleModeChange);
      win.removeEventListener('pagehide', handlePageHide);
    }

    doc.addEventListener('visibilitychange', handleVisibilityChange);
    doc.addEventListener('pointerdown', noteActivity, true);
    doc.addEventListener('keydown', noteActivity, true);
    doc.addEventListener('touchstart', noteActivity, true);
    const select = doc.getElementById('game-mode-select');
    if (select) select.addEventListener('change', handleModeChange);
    win.addEventListener('pagehide', handlePageHide);
    if (typeof win.setInterval === 'function') {
      timer = win.setInterval(() => {
        sample();
        flush();
      }, SAMPLE_INTERVAL_MS);
    }
    send({ type: 'visit', gameMode: currentMode });

    return { sample, flush, noteActivity, stop };
  }

  function readGameMode(doc) {
    const select = doc && doc.getElementById ? doc.getElementById('game-mode-select') : null;
    return normalizeGameMode(select && select.value);
  }

  function initialize() {
    return createTracker();
  }

  if (root && root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initialize, { once: true });
    else initialize();
  }

  return {
    MAX_SECONDS_PER_EVENT,
    normalizeBaseUrl,
    normalizeGameMode,
    trackingPreferenceAllows,
    createTracker
  };
});
