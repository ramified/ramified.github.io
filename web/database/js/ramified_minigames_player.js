(() => {
  'use strict';
  const GAMES_PER_PAGE = 6;
  const GAME_STICKERS = {
    hex: 'hex.png', gomoku: 'gomoku.png', go: 'go.png', 'connect-four': 'connect_four.png',
    '2048': '2048.png', reversi: 'reversi.png', 'chinese-checkers': 'chinese_checkers.png',
    sokoban: 'sokoban.png', 'fide-chess': 'chess.png', billiards: 'billiards.png', lianliankan: 'lianliankan.png'
  };
  const BOARD_FIELDS = ['boundary-glue-mode-row', 'boundary-glue-shape-row', 'gomoku-size-row', 'boundary-glue-rect-row'];
  const PREPARATION_LAYOUTS = {
    hex: { title: 'games.hex', fields: [...BOARD_FIELDS, 'hex-pie-rule-row'] },
    go: { title: 'games.go', fields: [...BOARD_FIELDS, 'go-komi-row'] },
    reversi: { title: 'games.reversi', fields: BOARD_FIELDS },
    '2048': { title: 'games.2048', fields: BOARD_FIELDS },
    'chinese-checkers': { title: 'games.checkers', fields: ['chinese-checkers-jump-rule-row'], main: ['chinese-checkers-players-row'] },
    'fide-chess': { title: 'games.chess', fields: BOARD_FIELDS },
    billiards: { title: 'games.billiards', fields: [...BOARD_FIELDS, 'billiards-physics-row', 'billiards-equipment-row', 'billiards-tile-length-row', 'billiards-friction-row'], main: ['billiards-rules-row'] },
    lianliankan: { title: 'games.lianliankan', fields: BOARD_FIELDS, main: ['lianliankan-tile-set-row', 'lianliankan-tile-level-row'] },
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
  const tk = (key, fallback, parameters) => window.SiteI18n?.t(key, parameters) || fallback;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = window.RamifiedMinigames.player;
    const byId = (id) => document.getElementById(id);
    const menu = byId('player-menu');
    const pages = Array.from(menu.querySelectorAll('.player-page'));
    const canvas = byId('mosaic-canvas');
    let page = 'home';
    let backPage = 'home';
    let activeSlot = null;
    let selectedSlot = null;
    let slotPurpose = 'continue';
    let slotGameMode = null;
    let slotAction = null;
    let restoring = false;
    let saveTimer = null;
    let newGameParent = 'home';
    let gameListPage = 0;
    let setupBusy = false;
    let setupRequest = 0;
    let preparationLayout = null;
    let previewFrame = null;
    let chessCategory = null;
    const chessBoards = new Map();
    const levelIds = window.RAMIFIED_MINIGAME_PRESETS.presets.filter(entry => entry.gameTypes.includes('Sokoban')).map(entry => entry.id);
    const slots = window.RamifiedSaveSlots.create(levelIds, {
      getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value)
    });
    let levelsParent = 'games';
    let pendingLevelId = null;
    engine.setSokobanProgress([]);

    function message(text = '') {
      byId('player-message').textContent = text;
      byId('player-message').hidden = !text;
    }

    // Move the existing nodes, preserving their listeners, IDs and styling.
    const cards = Array.from(document.querySelectorAll('.side > .card'));
    ['player-setup-controls', 'player-display', 'player-online'].forEach((id, index) => {
      const card = cards[index];
      if (!card) return;
      card.querySelector('.card-head')?.remove();
      card.classList.remove('card', 'collapsed', 'calculator-card-user-hidden');
      card.removeAttribute('aria-hidden');
      byId(id).append(card);
    });
    const preparationRows = [...new Set(Object.values(PREPARATION_LAYOUTS).flatMap((layout) => [...layout.fields, ...(layout.main || [])]))].map((id) => {
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

    function sync() {
      const state = engine.state();
      if (!restoring && activeSlot !== null && !state.online && state.solved && state.sokobanLevelId) save();
      syncLevels(state);
      if (page === 'slots') syncSlots(state);
      if (page === 'slot-confirm') syncSlotConfirmation();
      if (page === 'confirm') byId('player-replace-text').textContent = tk('player.replaceSlot', 'Start a new game in save {{number}}? This replaces its current game. Sokoban progress is kept.', { number: selectedSlot + 1 });
      byId('player-choose-level').hidden = activeSlot === null || state.mode !== 'sokoban' || state.online;
      byId('player-resume').disabled = activeSlot === null && !state.online;
      byId('player-new').disabled = !state.ready || restoring || state.online || setupBusy;
      byId('player-continue').disabled = !state.ready || restoring || !(slots.hasAny() || state.online);
      const layout = state.browsing ? PREPARATION_LAYOUTS[state.mode] || null : null;
      if (preparationLayout !== layout) {
        preparationLayout = layout;
        preparationRows.forEach(({ node, anchor }) => {
          if (layout?.fields.includes(node.id)) byId('player-board-fields').append(node);
          else if (layout?.main?.includes(node.id)) byId('player-setup-options').append(node);
          else anchor.after(node);
        });
      }
      byId('player-board-setup').hidden = !layout;
      byId('player-setup').classList.toggle('player-board-page', !!layout);
      byId('player-setup-controls').hidden = !!layout;
      byId('player-view-board').hidden = !!layout;
      byId('player-board-fields').inert = setupBusy || !state.ready;
      byId('player-edit-balls').hidden = !layout || state.mode !== 'billiards';
      byId('player-more').disabled = setupBusy || !state.ready || state.setupError || !(state.mode === 'billiards' || layout?.fields.some((id) => !byId(id).hidden));
      byId('player-begin').disabled = setupBusy || !state.ready || state.setupError || state.canStart === false;
      byId('player-confirm-new').disabled = setupBusy || !state.ready || state.setupError || state.canStart === false;
      byId('player-board-previous').disabled = byId('player-board-next').disabled = setupBusy || !state.ready;
      for (const button of byId('player-game-list').children) button.disabled = setupBusy || !state.canPrepare || state.online;
      syncGameListPage(state);
      if (layout) {
        byId('player-setup-players').hidden = !layout.colors;
        byId('player-setup-options').hidden = !layout.main;
        if (layout.colors) syncPlayerControllers(state);
        byId('player-board-name').textContent = engine.presets().find((preset) => preset.id === state.presetId)?.label || '';
        byId('player-board-preview').hidden = !state.ready || state.setupError;
        if (!previewFrame) previewFrame = requestAnimationFrame(() => {
          previewFrame = null;
          if (page === 'setup') engine.paintPreview(byId('player-board-preview'));
        });
      }
      byId('player-actions').hidden = !Array.from(byId('player-action-controls').children).some((node) => !node.hidden);
      if (!restoring && activeSlot !== null && state.active && !state.online && !saveTimer) {
        const owner = activeSlot;
        saveTimer = setTimeout(() => save(owner), 250);
      }
    }

    function syncLevels(state) {
      const progress = slots.progress(selectedSlot);
      levelIds.forEach((id, index) => {
        let button = byId(`player-level-${index + 1}`);
        if (!button) {
          button = document.createElement('button');
          button.type = 'button';
          button.id = `player-level-${index + 1}`;
          button.className = 'btn player-level';
          button.dataset.levelId = id;
          const number = document.createElement('span');
          number.className = 'player-level-number';
          number.textContent = String(index + 1);
          const status = document.createElement('span');
          status.className = 'player-level-state';
          button.append(number, status);
          button.addEventListener('click', () => chooseLevel(id));
          byId('player-level-list').append(button);
        }
        const unlocked = progress.unlocked.includes(id), completed = progress.completed.includes(id);
        const label = completed ? tk('player.levelCompleted', 'Completed') : unlocked ? tk('player.levelAvailable', 'Available') : tk('player.levelLocked', 'Locked');
        button.dataset.completed = String(completed);
        button.querySelector('.player-level-state').textContent = label;
        button.setAttribute('aria-label', tk('player.levelLabel', 'Level {{number}} — {{status}}', { number: index + 1, status: label }));
        button.disabled = !unlocked || setupBusy || !state.canPrepare || state.online;
      });
    }

    function showLevels(parent = levelsParent) {
      ++setupRequest;
      setupBusy = false;
      engine.cancelSetup();
      pendingLevelId = null;
      levelsParent = parent;
      if (parent === 'game-menu') selectedSlot = activeSlot;
      save();
      show('levels', parent);
    }

    async function chooseLevel(id, { next = false } = {}) {
      if (selectedSlot === null || setupBusy || !engine.state().canPrepare || engine.state().online || !slots.progress(selectedSlot).unlocked.includes(id)) return;
      save();
      const request = ++setupRequest;
      pendingLevelId = id;
      setupBusy = true;
      show('levels', levelsParent);
      message(tk('player.levelLoading', 'Loading level…'));
      try {
        const loaded = await engine.beginSetup('sokoban', { presetId: id });
        if (request !== setupRequest) return;
        if (!loaded) throw new Error('Level could not be loaded');
        setupBusy = false;
        const saved = slots.slot(selectedSlot)?.game;
        if (saved && !next && !['gameover', 'complete'].includes(saved.payload.phase)) show('confirm', 'levels');
        else startPreparedGame();
      } catch (_) {
        if (request !== setupRequest) return;
        showLevels();
        message(tk('player.levelLoadError', 'The level could not be loaded. Select it to retry, or go back. Your previous game is unchanged.'));
      } finally {
        if (request === setupRequest) { setupBusy = false; sync(); }
      }
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
      if (!preparationLayout?.colors) return;
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

    function save(owner = activeSlot) {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (restoring || owner === null || owner !== activeSlot) return;
      const snapshot = engine.snapshot();
      if (!snapshot) return; // Finish the current move before committing a save.
      const state = engine.state();
      const completedId = !state.online && state.solved ? state.sokobanLevelId : null;
      const before = slots.progress(owner).completed.length;
      const previous = slots.slot(owner)?.game;
      const comparable = value => value && JSON.stringify({ ...value, payload: { ...value.payload, exportedAt: '' } });
      if (!slots.error() && comparable(previous) === comparable(snapshot)
        && (!completedId || slots.progress(owner).completed.includes(completedId))) return;
      slots.save(owner, snapshot, completedId);
      if (slots.progress(owner).completed.length !== before) engine.setSokobanProgress(slots.progress(owner).completed);
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

    function syncSlots(state = engine.state()) {
      slots.slots().forEach((slot, index) => {
        const number = index + 1;
        let row = byId(`player-slot-row-${number}`);
        if (!row) {
          row = document.createElement('div'); row.id = `player-slot-row-${number}`; row.className = 'player-slot-row';
          const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'btn player-slot-choice'; choose.id = `player-slot-${number}`;
          for (const name of ['name', 'summary', 'progress']) {
            const span = document.createElement('span'); span.className = `player-slot-${name}`; choose.append(span);
          }
          choose.addEventListener('click', () => selectSlot(index));
          row.append(choose);
          const actions = document.createElement('div'); actions.className = 'player-slot-actions';
          for (const action of ['restart', 'delete']) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.id = `player-slot-${action}-${number}`;
            button.addEventListener('click', () => confirmSlotAction(index, action)); actions.append(button);
          }
          row.append(actions); byId('player-slot-list').append(row);
        }
        const name = tk('player.slotName', 'Save {{number}}', { number });
        const mode = slot?.game?.payload?.gameMode;
        const detail = slot ? engine.games().find(item => item.mode === mode)?.label || tk('player.slotNoGame', 'No current game') : tk('player.slotEmpty', 'Empty');
        row.querySelector('.player-slot-name').textContent = name;
        row.querySelector('.player-slot-summary').textContent = detail;
        const progress = row.querySelector('.player-slot-progress');
        const completed = slot?.sokoban.completed.length || 0;
        progress.hidden = !slot || (!completed && mode !== 'sokoban');
        progress.textContent = tk('player.slotProgress', 'Sokoban: {{completed}}/{{total}} completed', { completed, total: levelIds.length });
        const busy = setupBusy || restoring || !state.canPrepare || state.online;
        byId(`player-slot-${number}`).disabled = busy || (slotPurpose === 'continue' && !slot);
        byId(`player-slot-${number}`).setAttribute('aria-label', tk('player.slotLabel', 'Save {{number}} — {{detail}}', { number, detail }));
        for (const action of ['restart', 'delete']) {
          const button = byId(`player-slot-${action}-${number}`);
          button.hidden = !slot; button.disabled = busy;
          button.textContent = action === 'restart' ? tk('player.slotRestart', 'Restart save') : tk('player.slotDelete', 'Delete');
          button.setAttribute('aria-label', action === 'restart'
            ? tk('player.slotRestartLabel', 'Restart save {{number}}', { number })
            : tk('player.slotDeleteLabel', 'Delete save {{number}}', { number }));
        }
      });
    }

    function showSlots(purpose = slotPurpose, mode = slotGameMode) {
      ++setupRequest;
      setupBusy = false; restoring = false;
      engine.cancelSetup();
      save();
      pendingLevelId = null; selectedSlot = null; slotAction = null;
      slotPurpose = purpose; slotGameMode = mode;
      show('slots', purpose === 'new' ? 'games' : 'home');
    }

    async function selectSlot(index) {
      if (setupBusy || restoring || !engine.state().canPrepare || engine.state().online) return;
      save();
      if (slotPurpose === 'new') {
        selectedSlot = index;
        chooseGame(slotGameMode);
        return;
      }
      const slot = slots.slot(index);
      if (!slot) return;
      if (!slot.game) { requestNewGame('home', index); return; }
      const request = ++setupRequest;
      restoring = true;
      sync();
      try {
        if (activeSlot !== index || !engine.state().active) {
          const restored = await engine.restore(slot.game, { isCurrent: () => request === setupRequest });
          if (!restored || request !== setupRequest) return;
        }
        activeSlot = selectedSlot = index;
        engine.setSokobanProgress(slots.progress(index).completed);
        restoring = false;
        setOpen(false);
        save();
      } catch (_) {
        if (request === setupRequest) message(tk('player.loadError', 'The saved game could not be loaded. You can start a new game.'));
      } finally {
        if (request === setupRequest) { restoring = false; sync(); }
      }
    }

    function confirmSlotAction(index, action) {
      if (setupBusy || restoring || !engine.state().canPrepare || engine.state().online || !slots.slot(index)) return;
      save();
      slotAction = { index, action };
      show('slot-confirm', 'slots', 'player-slot-cancel');
    }

    function syncSlotConfirmation() {
      if (!slotAction) return;
      const { index, action } = slotAction;
      byId('player-slot-warning').textContent = action === 'restart'
        ? tk('player.slotRestartWarning', 'Restart save {{number}}? Its current game and Sokoban progress will be cleared, starting again with the first three levels. Other saves are unchanged.', { number: index + 1 })
        : tk('player.slotDeleteWarning', 'Delete save {{number}}? Its current game and Sokoban progress will be deleted. Other saves are unchanged.', { number: index + 1 });
      byId('player-slot-confirm-action').textContent = action === 'restart' ? tk('player.slotRestart', 'Restart save') : tk('player.slotDelete', 'Delete');
      byId('player-slot-confirm-action').dataset.i18n = action === 'restart' ? 'player.slotRestart' : 'player.slotDelete';
    }

    byId('player-slot-cancel').addEventListener('click', () => showSlots());
    byId('player-slot-confirm-action').addEventListener('click', () => {
      if (!slotAction || restoring || setupBusy || engine.state().online) return;
      const { index, action } = slotAction;
      if (!slots.clear(index, action === 'restart')) {
        message(tk('player.slotChangeError', 'The save could not be changed. Please try again.'));
        return;
      }
      clearTimeout(saveTimer); saveTimer = null;
      if (activeSlot === index) activeSlot = null;
      selectedSlot = null; slotAction = null;
      if (action === 'restart') {
        if (slotPurpose === 'new') { selectedSlot = index; chooseGame(slotGameMode); }
        else requestNewGame('home', index);
      } else showSlots();
    });

    function setOpen(open) {
      // Canceling another slot's preparation must not redirect the live game's next level.
      if (!open && !engine.state().browsing) selectedSlot = activeSlot;
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
        setup: PREPARATION_LAYOUTS[engine.state().mode]?.title || 'player.gameOptions', 'chess-category': 'games.chess', 'board-options': 'player.moreOptions', confirm: 'player.start',
        levels: 'player.chooseLevel',
        slots: 'player.chooseSave', 'slot-confirm': 'player.chooseSave',
        display: 'setup.display', online: 'online.title'
      };
      byId('player-menu-title').dataset.i18n = titleKeys[next];
      byId('player-menu-title').textContent = window.SiteI18n.t(titleKeys[next]);
      message(slots.error() === 'read' || slots.error() === 'legacy'
        ? tk('player.slotReadError', 'Some save data could not be read. The original data has been kept.')
        : slots.error() ? tk('player.saveError', 'This browser could not save progress. Keep this tab open.') : '');
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
      show(engine.state().browsing ? 'setup' : activeSlot !== null || engine.state().online ? 'game-menu' : 'home');
    });
    byId('player-resume').addEventListener('click', () => setOpen(false));
    byId('player-home-button').addEventListener('click', () => { save(); show('home'); });
    byId('player-choose-level').addEventListener('click', () => showLevels('game-menu'));
    document.addEventListener('ramified-player-sokoban-action', event => {
      const state = engine.state();
      if (state.online || !state.solved || !state.sokobanLevelId) return;
      const next = levelIds[levelIds.indexOf(state.sokobanLevelId) + 1];
      if (event.detail.action === 'sokoban-next' && next) {
        levelsParent = 'game-menu';
        chooseLevel(next, { next: true });
      } else showLevels('game-menu');
    });
    function goBack() {
      if (page === 'slot-confirm') { showSlots();
      } else if (page === 'slots') {
        ++setupRequest; restoring = false; setupBusy = false; selectedSlot = null;
        show(slotPurpose === 'new' ? 'games' : 'home', newGameParent);
      } else if (page === 'levels') {
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        pendingLevelId = null;
        if (levelsParent === 'slots') showSlots('new', 'sokoban');
        else show(levelsParent, 'home');
      } else if (page === 'confirm' && pendingLevelId) {
        showLevels();
      } else if (page === 'setup') {
        if (engine.state().mode === 'fide-chess' && !setupBusy) {
          chessBoards.set(chessCategory, engine.state().presetId);
          show('chess-category', 'games');
          return;
        }
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        showSlots('new', slotGameMode);
      } else if (page === 'chess-category') {
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        showSlots('new', 'fide-chess');
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
    byId('player-edit-balls').addEventListener('click', () => setOpen(false));
    for (const button of byId('player-chess-category').querySelectorAll('[data-chess-category]')) {
      button.addEventListener('click', () => chooseGame('fide-chess', button.dataset.chessCategory));
    }
    byId('player-settings').addEventListener('click', () => engine.settings());
    byId('player-game-settings').addEventListener('click', () => engine.settings());
    function requestNewGame(parent, index = null) {
      newGameParent = parent;
      gameListPage = 0;
      save();
      selectedSlot = index;
      slotGameMode = null;
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
    async function chooseGame(mode, category = null) {
      if (setupBusy || !engine.state().canPrepare) return;
      if (selectedSlot === null) { showSlots('new', mode); return; }
      slotGameMode = mode;
      if (mode === 'sokoban') { showLevels('slots'); return; }
      if (mode === 'fide-chess' && !category) {
        chessCategory = null;
        chessBoards.clear();
        show('chess-category', 'games');
        return;
      }
      save();
      const request = ++setupRequest;
      setupBusy = true;
      try {
        const resumeChess = mode === 'fide-chess' && engine.state().browsing && engine.state().mode === mode;
        chessCategory = category;
        const loading = resumeChess
          ? engine.selectPreset(chessBoards.get(category) || engine.defaultPreset(mode, category))
          : engine.beginSetup(mode, { category });
        show('setup', 'games');
        const loaded = await loading;
        if (request !== setupRequest) return;
        if (!loaded) throw new Error('Setup could not be loaded');
        setupBusy = false;
        show('setup', 'games');
      } catch (_) {
        if (request !== setupRequest) return;
        showSlots('new', mode);
        message(tk('player.setupLoadError', 'This board could not be loaded. Your previous game is still available.'));
      } finally {
        if (request === setupRequest) { setupBusy = false; sync(); }
      }
    }
    async function changeBoard(direction) {
      if (setupBusy || !engine.state().ready) return;
      const presets = engine.presets().filter(preset => engine.state().mode !== 'fide-chess' || preset.fideChessVariant === chessCategory);
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
      if (selectedSlot === null || setupBusy || !engine.state().browsing) return;
      try {
        restoring = true; // Ignore state events until the new game has an owner.
        if (!engine.commitSetup({ sokobanLevelId: pendingLevelId })) {
          restoring = false;
          if (pendingLevelId) showLevels();
          else show('setup', 'games');
          message(tk('player.startError', 'The game could not start. Check the board settings. Your previous save is unchanged.'));
          return;
        }
        activeSlot = selectedSlot;
        engine.setSokobanProgress(slots.progress(activeSlot).completed);
        restoring = false;
        pendingLevelId = null;
        setOpen(false);
        save();
        sync();
      } catch (_) {
        restoring = false;
        if (pendingLevelId) showLevels();
        else show('games', newGameParent);
        message(tk('player.startError', 'The game could not start. Check the board settings. Your previous save is unchanged.'));
      }
    }
    function requestStart() {
      if (setupBusy || !engine.state().ready || engine.state().setupError) return;
      if (slots.slot(selectedSlot)?.game) show('confirm', 'setup');
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
    byId('player-cancel-new').addEventListener('click', () => pendingLevelId ? showLevels() : show('setup', 'games'));
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
    byId('player-continue').addEventListener('click', () => {
      if (engine.state().online) { setOpen(false); return; }
      if (!restoring) showSlots('continue', null);
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
      if (!byId('fullscreen-settings-overlay').hidden && !byId('fullscreen-settings-display').hidden) {
        // The player page starts with language; the shared engine initially focuses sound.
        byId('player-language').querySelector('select')?.focus({ preventScroll: true });
        byId('fullscreen-settings-display').scrollTo(0, 0);
      } else if (byId('fullscreen-settings-overlay').hidden
        && (document.activeElement === document.body || document.activeElement?.closest('#fullscreen-settings-overlay'))) {
        const target = menu.hidden ? 'fullscreen-settings-open'
          : page === 'home' ? 'player-settings' : page === 'game-menu' ? 'player-game-settings' : 'player-back';
        byId(target).focus();
      }
    }).observe(byId('fullscreen-settings-overlay'), { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('pagehide', () => save());
    engine.fit();
    show('home');
  });
})();
