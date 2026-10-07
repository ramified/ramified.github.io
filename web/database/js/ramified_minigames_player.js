(() => {
  'use strict';
  const SAVE_KEY = 'ramified.minigames.player.save.v1';
  const GAMES_PER_PAGE = 6;
  const GAME_STICKERS = {
    hex: 'hex.png', gomoku: 'gomoku.png', go: 'go.png', 'connect-four': 'connect_four.png',
    '2048': '2048.png', reversi: 'reversi.png', 'chinese-checkers': 'chinese_checkers.png',
    sokoban: 'sokoban.png', 'fide-chess': 'chess.png', billiards: 'billiards.png', lianliankan: 'lianliankan.png'
  };
  const PREPARATION_LAYOUTS = {
    gomoku: {
      title: 'games.gomoku', colors: ['black', 'white'],
      fields: ['boundary-glue-mode-row', 'boundary-glue-shape-row', 'gomoku-size-row', 'boundary-glue-rect-row']
    },
    'connect-four': {
      title: 'games.connectFour', colors: ['red', 'yellow'], fields: ['connect-four-fall-row']
    }
  };
  const PLAYER_SIDES = {
    black: { label: 'status.black', previous: 'player.previousBlackController', next: 'player.nextBlackController' },
    white: { label: 'status.white', previous: 'player.previousWhiteController', next: 'player.nextWhiteController' },
    red: { label: 'status.red', previous: 'player.previousRedController', next: 'player.nextRedController' },
    yellow: { label: 'status.yellow', previous: 'player.previousYellowController', next: 'player.nextYellowController' }
  };
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
    let gameListPage = 0;
    let setupBusy = false;
    let setupRequest = 0;
    let preparationLayout = null;
    let previewFrame = null;

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
    const preparationRows = [...new Set(Object.values(PREPARATION_LAYOUTS).flatMap((layout) => layout.fields))].map((id) => {
      const node = byId(id);
      const anchor = document.createComment(id);
      node.before(anchor);
      return { node, anchor };
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
      byId('player-new').disabled = !state.ready || restoring || state.online || setupBusy;
      byId('player-continue').disabled = !state.ready || restoring || !(state.active || saved || state.online);
      const layout = state.browsing ? PREPARATION_LAYOUTS[state.mode] || null : null;
      if (preparationLayout !== layout) {
        preparationLayout = layout;
        preparationRows.forEach(({ node, anchor }) => {
          if (layout?.fields.includes(node.id)) byId('player-board-fields').append(node);
          else anchor.after(node);
        });
      }
      byId('player-board-setup').hidden = !layout;
      byId('player-setup').classList.toggle('player-board-page', !!layout);
      byId('player-setup-controls').hidden = !!layout;
      byId('player-view-board').hidden = !!layout;
      byId('player-board-fields').inert = setupBusy || !state.ready;
      byId('player-more').disabled = setupBusy || !state.ready || state.setupError || !layout?.fields.some((id) => !byId(id).hidden);
      byId('player-begin').disabled = setupBusy || !state.ready || state.setupError;
      byId('player-confirm-new').disabled = setupBusy || !state.ready || state.setupError;
      byId('player-board-previous').disabled = byId('player-board-next').disabled = setupBusy || !state.ready;
      for (const button of byId('player-game-list').children) button.disabled = setupBusy || !state.canPrepare || state.online;
      syncGameListPage(state);
      if (layout) {
        syncPlayerControllers(state);
        byId('player-board-name').textContent = engine.presets().find((preset) => preset.id === state.presetId)?.label || '';
        byId('player-board-preview').hidden = !state.ready || state.setupError;
        if (!previewFrame) previewFrame = requestAnimationFrame(() => {
          previewFrame = null;
          if (page === 'setup') engine.paintPreview(byId('player-board-preview'));
        });
      }
      byId('player-actions').hidden = !Array.from(byId('player-action-controls').children).some((node) => !node.hidden);
      if (!restoring && state.active && !state.online && !saveTimer) saveTimer = setTimeout(save, 250);
    }

    function syncPlayerControllers(state) {
      const labels = {
        human: ['ai.human', tk('ai.human', 'Human')],
        'local-ai-challenging': ['player.aiChallenging', tk('player.aiChallenging', 'AI — Challenging')],
        'local-ai-aggressive': ['player.aiAggressive', tk('player.aiAggressive', 'AI — Aggressive')]
      };
      for (const [index, slot] of ['first', 'second'].entries()) {
        const color = preparationLayout.colors[index];
        const side = PLAYER_SIDES[color];
        const control = byId(`${state.mode}-${color}-controller`);
        const output = byId(`player-${slot}-controller`);
        const label = byId(`player-${slot}-label`);
        label.dataset.i18n = side.label;
        label.textContent = tk(side.label, color);
        label.previousElementSibling.className = `player-stone player-stone-${color}`;
        const [key, text] = labels[control.value] || labels.human;
        output.dataset.i18n = key;
        output.textContent = text;
        for (const direction of ['previous', 'next']) {
          const button = byId(`player-${slot}-${direction}`);
          button.dataset.i18nAriaLabel = side[direction];
          button.setAttribute('aria-label', tk(side[direction]));
          button.disabled = setupBusy || !state.ready || state.setupError || control.disabled;
        }
      }
    }

    function changePlayerController(sideIndex, direction) {
      const state = engine.state();
      if (!preparationLayout) return;
      const color = preparationLayout.colors[sideIndex];
      const control = byId(`${state.mode}-${color}-controller`);
      if (setupBusy || !state.ready || state.setupError || !state.browsing || control.disabled) return;
      const options = Array.from(control.options).filter((option) => !option.disabled);
      const index = options.findIndex((option) => option.value === control.value);
      if (!options.length) return;
      control.value = options[(index + direction + options.length) % options.length].value;
      control.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
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

    function show(next, parent = page, focusId = null) {
      page = next;
      backPage = parent;
      pages.forEach((node) => { node.hidden = node.id !== `player-${next}`; });
      byId('player-back').hidden = next === 'home' || next === 'game-menu';
      const titleKeys = {
        home: 'meta.heading', 'game-menu': 'player.menu', games: 'player.chooseGame',
        setup: PREPARATION_LAYOUTS[engine.state().mode]?.title || 'player.gameOptions', 'board-options': 'player.moreOptions', confirm: 'player.start',
        display: 'setup.display', online: 'online.title', files: 'player.files', stats: 'status.stats'
      };
      byId('player-menu-title').dataset.i18n = titleKeys[next];
      byId('player-menu-title').textContent = window.SiteI18n.t(titleKeys[next]);
      message(storageFailed ? tk('player.saveError', 'This browser could not save progress. Keep this tab open, or export the game from the menu.') : '');
      setOpen(true);
      sync();
      const focus = (focusId && byId(focusId)) || Array.from(pages.find((node) => !node.hidden)?.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled)') || [])
        .find((node) => node.getClientRects().length);
      (focus || byId('player-back')).focus();
      pages.find((node) => !node.hidden)?.scrollTo(0, 0);
    }

    byId('player-menu-button').addEventListener('click', () => {
      engine.closeSettings();
      save();
      show(engine.state().browsing ? 'setup' : engine.state().active || engine.state().online ? 'game-menu' : 'home');
    });
    byId('player-resume').addEventListener('click', () => setOpen(false));
    byId('player-home-button').addEventListener('click', () => { save(); show('home'); });
    function goBack() {
      if (page === 'setup') {
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        show('games', newGameParent);
      } else if (page === 'board-options') show('setup', 'games', 'player-more');
      else if (page === 'confirm') show('setup', 'games');
      else if (page === 'games') show(newGameParent);
      else show(backPage, 'home');
    }
    byId('player-back').addEventListener('click', goBack);
    byId('player-fullscreen').addEventListener('click', () => {
      engine.closeSettings();
      engine.fullscreen();
    });
    byId('player-view-board').addEventListener('click', () => setOpen(false));
    byId('player-settings').addEventListener('click', () => engine.settings());
    byId('player-game-settings').addEventListener('click', () => engine.settings());
    function requestNewGame(parent) {
      newGameParent = parent;
      gameListPage = 0;
      save();
      updateGameList();
      show('games', parent);
    }
    function updateGameList() {
      for (const item of engine.games()) {
        let button = byId('player-game-list').querySelector(`[data-game-mode="${item.mode}"]`);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn';
          button.dataset.gameMode = item.mode;
          if (GAME_STICKERS[item.mode]) {
            const image = document.createElement('img');
            image.className = 'player-game-picture';
            image.src = `assets/ramified_minigames/board_game_stickers/${GAME_STICKERS[item.mode]}`;
            // The adjacent localized name labels the whole button, including its image.
            image.alt = '';
            image.setAttribute('aria-hidden', 'true');
            image.width = image.height = 240;
            image.decoding = 'sync';
            image.draggable = false;
            image.addEventListener('error', () => { image.style.visibility = 'hidden'; });
            button.append(image);
          }
          const label = document.createElement('span');
          label.className = 'player-game-name';
          button.append(label);
          button.addEventListener('click', () => chooseGame(item.mode));
          byId('player-game-list').append(button);
        }
        button.querySelector('.player-game-name').textContent = item.label;
      }
      syncGameListPage();
    }
    function syncGameListPage(state = engine.state()) {
      const buttons = Array.from(byId('player-game-list').children);
      const lastPage = Math.max(0, Math.ceil(buttons.length / GAMES_PER_PAGE) - 1);
      gameListPage = Math.max(0, Math.min(gameListPage, lastPage));
      buttons.forEach((button, index) => { button.hidden = Math.floor(index / GAMES_PER_PAGE) !== gameListPage; });
      const busy = setupBusy || !state.canPrepare || state.online;
      byId('player-games-previous').disabled = busy || gameListPage === 0;
      byId('player-games-next').disabled = busy || gameListPage === lastPage;
    }
    function changeGamesPage(direction) {
      if (page !== 'games' || byId(direction < 0 ? 'player-games-previous' : 'player-games-next').disabled) return;
      gameListPage += direction;
      syncGameListPage();
      // Keep keyboard focus usable when an end-of-list arrow becomes disabled.
      if (document.activeElement?.disabled || document.activeElement?.hidden) {
        byId('player-game-list').querySelector('button:not([hidden]):not(:disabled)')?.focus();
      }
    }
    byId('player-games-previous').addEventListener('click', () => changeGamesPage(-1));
    byId('player-games-next').addEventListener('click', () => changeGamesPage(1));
    async function chooseGame(mode) {
      if (setupBusy || !engine.state().canPrepare) return;
      save();
      const request = ++setupRequest;
      setupBusy = true;
      try {
        const loading = engine.beginSetup(mode);
        show('setup', 'games');
        const loaded = await loading;
        if (request !== setupRequest) return;
        if (!loaded) throw new Error('Setup could not be loaded');
        setupBusy = false;
        show('setup', 'games');
      } catch (_) {
        if (request !== setupRequest) return;
        engine.cancelSetup();
        show('games', newGameParent);
        message(tk('player.setupLoadError', 'This board could not be loaded. Your previous game is still available.'));
      } finally {
        if (request === setupRequest) { setupBusy = false; sync(); }
      }
    }
    async function changeBoard(direction) {
      if (setupBusy || !engine.state().ready) return;
      const presets = engine.presets();
      const index = presets.findIndex((preset) => preset.id === engine.state().presetId);
      const next = presets[(index + direction + presets.length) % presets.length];
      if (!next) return;
      const request = setupRequest;
      setupBusy = true;
      message();
      sync();
      try {
        const loaded = await engine.selectPreset(next.id);
        if (request !== setupRequest) return;
        if (!loaded) message(tk('player.setupLoadError', 'This board could not be loaded. Your previous game is still available.'));
      } catch (_) {
        if (request === setupRequest) message(tk('player.setupLoadError', 'This board could not be loaded. Your previous game is still available.'));
      } finally {
        if (request === setupRequest) { setupBusy = false; sync(); }
      }
    }
    function startPreparedGame() {
      if (setupBusy || !engine.state().browsing) return;
      try {
        if (!engine.commitSetup()) {
          show('setup', 'games');
          message(tk('player.startError', 'The game could not start. Check the board settings. Your previous save is unchanged.'));
          return;
        }
        setOpen(false);
        save();
        sync();
      } catch (_) {
        show('games', newGameParent);
        message(tk('player.startError', 'The game could not start. Check the board settings. Your previous save is unchanged.'));
      }
    }
    function requestStart() {
      if (setupBusy || !engine.state().ready || engine.state().setupError) return;
      if (saved) show('confirm', 'setup');
      else startPreparedGame();
    }
    byId('player-board-previous').addEventListener('click', () => changeBoard(-1));
    byId('player-board-next').addEventListener('click', () => changeBoard(1));
    byId('player-more').addEventListener('click', () => show('board-options', 'setup'));
    for (const [index, slot] of ['first', 'second'].entries()) {
      byId(`player-${slot}-previous`).addEventListener('click', () => changePlayerController(index, -1));
      byId(`player-${slot}-next`).addEventListener('click', () => changePlayerController(index, 1));
    }
    byId('player-begin').addEventListener('click', requestStart);
    document.addEventListener('ramified-player-start-request', requestStart);
    byId('player-confirm-new').addEventListener('click', startPreparedGame);
    byId('player-cancel-new').addEventListener('click', () => show('setup', 'games'));
    menu.querySelectorAll('[data-player-page]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.playerPage === 'setup' && !engine.state().online) {
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

    // Capture before game shortcuts, but leave settings key binding capture alone.
    window.addEventListener('keydown', (event) => {
      if (!byId('fullscreen-settings-overlay').hidden) return;
      if (!menu.hidden) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (page === 'game-menu') setOpen(false);
          else if (page !== 'home') goBack();
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
    document.addEventListener('site-language-change', () => {
      updateGameList();
      sync();
    });
    window.addEventListener('resize', sync);
    document.addEventListener('fullscreenchange', sync);
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
