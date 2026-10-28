/* Presentation only. All actions still use the original controls and game engine. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const byId = id => document.getElementById(id);
    const tk = (key, fallback) => window.SiteI18n?.t(key) || fallback;
    const mute = byId('study-mute');
    const sound = byId('fullscreen-sound-enabled');
    function syncMute() {
      const key = sound.checked ? 'study.unmuted' : 'study.muted';
      mute.dataset.i18n = key;
      mute.textContent = tk(key);
      mute.setAttribute('aria-pressed', String(!sound.checked));
    }
    mute.addEventListener('click', () => {
      sound.checked = !sound.checked;
      sound.dispatchEvent(new Event('change', { bubbles: true }));
      syncMute();
    });
    sound.addEventListener('change', syncMute);
    document.addEventListener('site-language-change', syncMute);
    syncMute();

    // Move existing nodes so event handlers, references and mode visibility survive.
    const workshop = byId('study-workshop-content');
    const debug = byId('debug-tools');
    const debugActions = byId('debug-toggle')?.closest('.mosaic-debug-actions');
    if (debugActions) workshop.append(debugActions);
    if (debug) workshop.append(debug);
    // The existing floating billiards tools belong in the optional action drawer.
    const billiards = byId('fullscreen-billiards-spin');
    if (billiards) byId('player-action-controls').prepend(billiards);
    byId('player-actions').addEventListener('toggle', () => window.dispatchEvent(new Event('resize')));
    const io = byId('ramified-import-export-card');
    if (io) {
      io.classList.remove('collapsed', 'calculator-card-user-hidden');
      io.removeAttribute('aria-hidden');
      workshop.append(io);
    }
    // Expose only the two most useful existing stats, preserving their dynamic labels.
    for (const id of ['score-value', 'round-value']) {
      const row = byId(id)?.closest('.stat-row');
      if (row) byId('study-hud').append(row);
    }
    const menu = byId('player-menu');
    function syncPage() {
      const open = !menu.hidden;
      const settingsOpen = !byId('fullscreen-settings-overlay').hidden;
      document.body.classList.toggle('study-settings-open', settingsOpen);
      byId('study-hud').hidden = open || settingsOpen;
      mute.hidden = open || settingsOpen;
      // Workshop closes when leaving settings; never auto-enables debug or sound.
      if (!settingsOpen) byId('study-workshop').open = false;
    }
    new MutationObserver(syncPage).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(syncPage).observe(byId('fullscreen-settings-overlay'), { attributes: true, attributeFilter: ['hidden'] });
    syncPage();
  });
})();
