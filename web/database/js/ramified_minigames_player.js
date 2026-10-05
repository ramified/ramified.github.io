(() => {
  'use strict';
  const SAVE_KEY = 'ramified.minigames.player.save.v1';
  const tk = (key, fallback) => window.SiteI18n?.t(key) || fallback;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = window.RamifiedMinigames.player;
    const byId = (id) => document.getElementById(id);
    const menu = byId('player-menu');
    const pages = Array.from(menu.querySelectorAll('.player-page'));
    const canvas = byId('mosaic-canvas');
    let page = 'home';
    let backPage = 'home';
    let saved = null;
    let restoring = false;
    let saveTimer = null;
    let storageFailed = false;
    let lastSave = '';
    let newGameParent = 'home';

    function message(text = '') {
      byId('player-message').textContent = text;
      byId('player-message').hidden = !text;
    }

    try {
      const value = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (value?.version === 1 && value.payload) saved = value;
    } catch (_) {
      storageFailed = true;
    }

    // Move the existing nodes, preserving their listeners, IDs and styling.
    const cards = Array.from(document.querySelectorAll('.side > .card'));
    ['player-setup-controls', 'player-display', 'player-online', 'player-files', 'player-stats'].forEach((id, index) => {
      const card = cards[index];
      if (!card) return;
      card.querySelector('.card-head')?.remove();
      card.classList.remove('card', 'collapsed', 'calculator-card-user-hidden');
      card.removeAttribute('aria-hidden');
      byId(id).append(card);
    });
    const actionIds = [
      'move-row', 'go-action-row', 'go-score-view-row', 'go-scoring-method-row',
      'go-mark-dead-row', 'go-edit-territory-row', 'go-score-compare-row',
      'go-confirm-score-row', 'hex-pie-swap-row', 'chinese-checkers-end-jump-row',
      'local-ai-pause-row', 'billiards-ball-palette-row', 'billiards-spin-row',
      'billiards-cue-speed-row', 'billiards-elevation-row', 'billiards-stroke-row',
      'billiards-cue-profile-row', 'billiards-tip-profile-row', 'billiards-power-row'
    ];
    actionIds.forEach((id) => {
      const node = byId(id);
      if (node) byId('player-action-controls').append(node);
    });
    byId('player-toolbar').append(byId('fullscreen-action-shell'));
    byId('player-action-controls').append(byId('fullscreen-lianliankan-actions'));
    const language = document.querySelector('body > header .site-language-control');
    if (language) byId('player-language').append(language);
    const notice = document.querySelector('body > footer [data-i18n="analytics.notice"]');
    if (notice) {
      const paragraph = document.createElement('p');
      paragraph.append(notice);
      byId('player-settings-extra').append(paragraph);
    }

    function sync() {
      const state = engine.state();
      byId('player-new').disabled = !state.ready || restoring || state.online;
      byId('player-continue').disabled = !state.ready || restoring || !(state.active || saved || state.online);
      byId('player-actions').hidden = !Array.from(byId('player-action-controls').children).some((node) => !node.hidden);
      if (!restoring && state.active && !state.online && !saveTimer) saveTimer = setTimeout(save, 250);
    }

    function save() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (restoring) return;
      const snapshot = engine.snapshot();
      if (!snapshot) return; // Finish the current move before committing a save.
      saved = snapshot;
      const comparable = JSON.stringify({ ...snapshot, payload: { ...snapshot.payload, exportedAt: '' } });
      if (comparable === lastSave) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
        lastSave = comparable;
        storageFailed = false;
      } catch (_) { storageFailed = true; }
    }

    function syncModalInput() {
      const settingsOpen = !byId('fullscreen-settings-overlay').hidden;
      menu.inert = settingsOpen;
      if (settingsOpen) menu.setAttribute('aria-hidden', 'true');
      else menu.removeAttribute('aria-hidden');
      // The overlay is inside the fullscreen element; keep the game behind it inert.
      for (const child of byId('canvas-wrap').children) {
        if (child !== menu && child.id !== 'fullscreen-settings-overlay') child.inert = !menu.hidden || settingsOpen;
      }
    }

    function setOpen(open) {
      menu.hidden = !open;
      document.body.classList.toggle('player-menu-open', open);
      engine.setMenuOpen(open);
      syncModalInput();
      if (!open) canvas.focus();
    }

    function show(next, parent = page) {
      page = next;
      backPage = parent;
      pages.forEach((node) => { node.hidden = node.id !== `player-${next}`; });
      byId('player-back').hidden = next === 'home' || next === 'game-menu';
      const titleKeys = {
        home: 'meta.heading', 'game-menu': 'player.menu', setup: 'player.gameOptions', confirm: 'player.start',
        display: 'setup.display', online: 'online.title', files: 'player.files', stats: 'status.stats'
      };
      byId('player-menu-title').dataset.i18n = titleKeys[next];
      byId('player-menu-title').textContent = window.SiteI18n.t(titleKeys[next]);
      message(storageFailed ? tk('player.saveError', 'This browser could not save progress. Keep this tab open, or export the game from the menu.') : '');
      setOpen(true);
      sync();
      const focus = pages.find((node) => !node.hidden)?.querySelector('button:not(:disabled), select:not(:disabled), input:not(:disabled)');
      (focus || byId('player-back')).focus();
    }

    byId('player-menu-button').addEventListener('click', () => {
      engine.closeSettings();
      save();
      show(engine.state().active || engine.state().online ? 'game-menu' : 'home');
    });
    byId('player-resume').addEventListener('click', () => setOpen(false));
    byId('player-home-button').addEventListener('click', () => { save(); show('home'); });
    byId('player-back').addEventListener('click', () => show(backPage, 'home'));
    byId('player-fullscreen').addEventListener('click', () => {
      engine.closeSettings();
      engine.fullscreen();
    });
    byId('player-view-board').addEventListener('click', () => setOpen(false));
    byId('player-settings').addEventListener('click', () => engine.settings());
    byId('player-game-settings').addEventListener('click', () => engine.settings());
    function prepareNewGame() {
      save();
      if (engine.prepare()) show('setup', newGameParent);
    }
    function requestNewGame(parent) {
      newGameParent = parent;
      if (engine.state().active || saved) show('confirm', parent);
      else prepareNewGame();
    }
    byId('player-confirm-new').addEventListener('click', prepareNewGame);
    byId('player-cancel-new').addEventListener('click', () => show(newGameParent));
    menu.querySelectorAll('[data-player-page]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.playerPage === 'setup' && engine.state().active && !engine.state().online) {
          requestNewGame('game-menu');
          return;
        }
        show(button.dataset.playerPage, 'game-menu');
      });
    });
    byId('player-new').addEventListener('click', () => {
      requestNewGame('home');
    });
    byId('player-continue').addEventListener('click', async () => {
      if (engine.state().active || engine.state().online) { setOpen(false); return; }
      if (!saved || restoring) return;
      restoring = true;
      sync();
      try {
        await engine.restore(saved);
        setOpen(false);
      } catch (_) {
        message(tk('player.loadError', 'The saved game could not be loaded. You can start a new game.'));
      } finally {
        restoring = false;
        sync();
      }
    });
    byId('begin-game').addEventListener('click', () => {
      if (engine.state().active) { setOpen(false); save(); }
    });

    // Capture before game shortcuts, but leave settings key binding capture alone.
    window.addEventListener('keydown', (event) => {
      if (!byId('fullscreen-settings-overlay').hidden) return;
      if (!menu.hidden) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (page === 'game-menu') setOpen(false);
          else if (page !== 'home') show(backPage, 'home');
        } else if (event.key === 'Tab') {
          const focusable = Array.from(menu.querySelectorAll('button, select, input, textarea, a[href], summary'))
            .filter((node) => !node.disabled && node.getClientRects().length);
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        event.stopImmediatePropagation();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        engine.settings();
      }
    }, true);
    document.addEventListener('ramified-player-state', sync);
    document.addEventListener('site-language-change', sync);
    new MutationObserver(() => {
      syncModalInput();
      if (byId('fullscreen-settings-overlay').hidden
        && (document.activeElement === document.body || document.activeElement?.closest('#fullscreen-settings-overlay'))) {
        const target = menu.hidden ? 'fullscreen-settings-open'
          : page === 'home' ? 'player-settings' : page === 'game-menu' ? 'player-game-settings' : 'player-back';
        byId(target).focus();
      }
    }).observe(byId('fullscreen-settings-overlay'), { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('pagehide', save);
    engine.fit();
    show('home');
  });
})();
