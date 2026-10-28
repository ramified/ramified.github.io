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
    let slotAction = null;
    let restoring = false;
    let saveTimer = null;
    let gameListPage = 0;
    let setupBusy = false;
    let setupRequest = 0;
    let preparationLayout = null;
    let online = null;
    let previewFrame = null;
    let chessCategory = null;
    const chessBoards = new Map();
    const levelIds = window.RAMIFIED_MINIGAME_PRESETS.presets.filter(entry => entry.gameTypes.includes('Sokoban')).map(entry => entry.id);
    const slots = window.RamifiedSaveSlots.create(levelIds, {
      getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value)
    });
    let levelsParent = 'games';
    let pendingLevelId = null;
    const saveChecks = new Map();
    engine.setSokobanProgress([]);

    function saveStatus(index, slot = slots.slot(index)) {
      if (slots.error() === 'read') return 'unreadable';
      if (!slot) return 'empty';
      if (!slot.game) return slot.sokoban.completed.length ? 'progress' : 'noGame';
      const key = JSON.stringify(slot.game);
      let check = saveChecks.get(index);
      if (!check || check.key !== key) {
        check = { key, status: 'checking' };
        saveChecks.set(index, check);
        engine.inspectSave(slot.game).then(result => { check.status = result.status; }, error => {
          check.status = error.saveDependency ? 'unavailable' : 'invalid';
        }).finally(() => {
          if (saveChecks.get(index) === check) sync();
        });
      }
      return check.status;
    }

    function saveStatusText(status) {
      switch (status) {
        case 'checking': return tk('player.saveChecking', 'Checking saved game…');
        case 'ready': return tk('player.saveReady', 'In progress');
        case 'ended': return tk('player.saveEnded', 'Finished');
        case 'progress': return tk('player.saveProgressOnly', 'Level progress only');
        case 'noGame': return tk('player.slotNoGame', 'No current game');
        case 'invalid': return tk('player.saveInvalid', 'This game cannot be restored. The saved data is kept.');
        case 'unavailable': return tk('player.saveUnavailable', 'Game resources could not load. Return and select this save to retry.');
        case 'unreadable': return tk('player.slotReadError', 'Some save data could not be read. The original data has been kept.');
        default: return tk('player.slotEmpty', 'Empty');
      }
    }

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
    byId('player-toolbar').prepend(byId('fullscreen-action-shell'));
    byId('player-action-controls').append(byId('fullscreen-lianliankan-actions'));
    const language = document.querySelector('body > header .site-language-control');
    if (language) byId('player-language').append(language);

    function sync() {
      const state = engine.state();
      byId('player-return-to-setup').hidden = !state.browsing || !menu.hidden;
      if (!restoring && activeSlot !== null && !state.online && state.solved && state.sokobanLevelId) save();
      syncLevels(state);
      if (page === 'slots') syncSlots(state);
      if (page === 'games') syncGameEntry(state);
      if (page === 'slot-confirm') syncSlotConfirmation();
      if (page === 'confirm') byId('player-replace-text').textContent = tk('player.replaceSlot', 'Start a new game in save {{number}}? This replaces its current game. Sokoban progress is kept.', { number: selectedSlot + 1 });
      const returnKey = online?.flow() ? 'player.chooseGame' : engine.onlineInfo().joined ? 'lobby.room'
        : selectedSlot !== null || activeSlot !== null ? 'player.chooseGame' : 'player.chooseSave';
      byId('player-menu-button').dataset.i18n = returnKey;
      byId('player-menu-button').textContent = tk(returnKey);
      byId('player-new').disabled = !state.ready || restoring || setupBusy;
      byId('player-online-open').disabled = !state.ready || restoring || setupBusy;
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
      byId('player-more').disabled = setupBusy || !state.ready || state.setupError || !(online?.flow() || state.mode === 'billiards' || layout?.fields.some((id) => !byId(id).hidden));
      byId('player-begin').disabled = setupBusy || online?.busy() || !state.ready || state.setupError || state.canStart === false;
      const beginKey = online?.flow() === 'change' ? 'lobby.propose' : online?.flow() ? 'lobby.create' : 'player.start';
      byId('player-begin').dataset.i18n = beginKey;
      byId('player-begin').textContent = tk(beginKey);
      byId('player-confirm-new').disabled = setupBusy || !state.ready || state.setupError || state.canStart === false;
      byId('player-board-previous').disabled = byId('player-board-next').disabled = setupBusy || !state.ready;
      for (const button of byId('player-game-list').children) button.disabled = setupBusy || restoring || !state.canPrepare || state.online && !online?.flow();
      syncGameListPage(state);
      if (layout) {
        byId('player-setup-players').hidden = !layout.colors || !!online?.flow();
        byId('player-setup-options').hidden = !layout.main || !!online?.flow() && state.mode === 'billiards';
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

    function levelName(id) {
      return {
        'classic-fans': tk('presets.fans', 'Classic fans'),
        'pedestrian': tk('presets.pedestrian', 'Pedestrian'),
        'classic-fans-glue': tk('presets.fansGlue', 'Glued fans'),
        'ice-test': tk('presets.ice', 'Ice test'),
        'curling-on-cube': tk('presets.curlCube', 'Curling on cube'),
        'easy-energy-bridge': tk('presets.easyEnergy', 'Easy energy bridge'),
        'energy-test': tk('presets.energy', 'Energy test'),
        'cross': tk('presets.cross', 'Cross'),
        'expand': tk('presets.expand', 'Expand'),
        'orbox-b': tk('presets.orbox', 'Orbox B'),
        'orbox-b-glued': tk('presets.orboxGlue', 'Orbox B glued'),
        'loop': tk('presets.loop', 'Loop'),
        'curling': tk('presets.curling', 'Curling'),
        'remote-rotate': tk('presets.remoteRotate', 'Remote rotate'),
        'remote-control': tk('presets.remoteControl', 'Remote control'),
        'islands': tk('presets.islands', 'Islands'),
        'expand2': tk('presets.expand2', 'Expand 2'),
        'expand3': tk('presets.expand3', 'Expand 3'),
        'bridges-blocking': tk('presets.bridges', 'Blocking bridges'),
      }[id] || id;
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
          const preview = document.createElement('canvas');
          preview.className = 'player-level-preview';
          preview.setAttribute('aria-hidden', 'true');
          const name = document.createElement('span');
          name.className = 'player-level-name';
          button.append(number, preview, name, status);
          engine.paintSokobanLevelPreview(id, preview).then(ok => {
            if (!ok) throw new Error('preview');
            button.dataset.preview = 'ready';
          }).catch(() => {
            preview.hidden = true;
            button.dataset.preview = 'error';
            const note = document.createElement('span');
            note.dataset.i18n = 'player.levelPreviewError';
            note.textContent = tk('player.levelPreviewError', 'Preview unavailable');
            button.append(note);
          });
          button.addEventListener('click', () => chooseLevel(id));
          byId('player-level-list').append(button);
        }
        const unlocked = progress.unlocked.includes(id), completed = progress.completed.includes(id);
        const label = completed ? tk('player.levelCompleted', 'Completed') : unlocked ? tk('player.levelAvailable', 'Available') : tk('player.levelLocked', 'Locked');
        button.dataset.completed = String(completed);
        button.querySelector('.player-level-state').textContent = label;
        button.querySelector('.player-level-name').textContent = levelName(id);
        button.setAttribute('aria-label', tk('player.levelNamedLabel', 'Level {{number}}: {{name}} — {{status}}', { number: index + 1, name: levelName(id), status: label }));
        button.disabled = !unlocked || setupBusy || !state.canPrepare || state.online;
      });
    }

    function showLevels(parent = levelsParent) {
      ++setupRequest;
      setupBusy = false;
      engine.cancelSetup();
      pendingLevelId = null;
      levelsParent = parent;
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
          for (const name of ['name', 'summary', 'status', 'progress']) {
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
        const status = saveStatus(index, slot);
        row.querySelector('.player-slot-status').textContent = saveStatusText(status);
        row.dataset.saveStatus = status;
        const progress = row.querySelector('.player-slot-progress');
        const completed = slot?.sokoban.completed.length || 0;
        progress.hidden = !slot || (!completed && mode !== 'sokoban');
        progress.textContent = tk('player.slotProgress', 'Sokoban: {{completed}}/{{total}} completed', { completed, total: levelIds.length });
        const busy = setupBusy || restoring || !state.canPrepare || state.online;
        byId(`player-slot-${number}`).disabled = busy;
        byId(`player-slot-${number}`).setAttribute('aria-label', tk('player.slotStatusLabel', 'Save {{number}} — {{detail}} — {{status}}', { number, detail, status: saveStatusText(status) }));
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

    function showSlots() {
      ++setupRequest;
      setupBusy = false; restoring = false;
      engine.cancelSetup();
      save();
      pendingLevelId = null; selectedSlot = null; slotAction = null;
      show('slots', 'home');
    }

    function selectSlot(index) {
      if (setupBusy || restoring || !engine.state().canPrepare || engine.state().online) return;
      if (saveChecks.get(index)?.status === 'unavailable') saveChecks.delete(index);
      selectedSlot = index;
      showGames({ resetPage: true });
    }

    function syncGameEntry(state) {
      if (online?.flow()) { byId('player-continue').hidden = true; byId('player-games').classList.remove('has-saved-game'); return; }
      const saved = slots.slot(selectedSlot)?.game;
      const status = saveStatus(selectedSlot);
      const button = byId('player-continue');
      button.hidden = !saved;
      button.disabled = !saved || !['ready', 'ended'].includes(status) || restoring || setupBusy || !state.canPrepare || state.online;
      const feedback = byId('player-save-status');
      feedback.hidden = !saved && status !== 'unreadable';
      feedback.textContent = saveStatusText(status);
      byId('player-games').classList.toggle('has-saved-game', !!saved);
      const label = engine.games().find(item => item.mode === saved?.payload.gameMode)?.label || '';
      byId('player-continue-game').textContent = label;
      const actionLabel = byId('player-continue-label');
      actionLabel.dataset.i18n = status === 'ended' ? 'player.viewResult' : 'player.continueLast';
      actionLabel.textContent = status === 'ended' ? tk('player.viewResult', 'View result') : tk('player.continueLast', 'Continue last game');
      button.setAttribute('aria-label', status === 'ended'
        ? tk('player.viewSavedResult', 'View result: {{game}}', { game: label })
        : tk('player.continueSavedGame', 'Continue last game: {{game}}', { game: label }));
    }

    async function continueSelectedGame() {
      if (selectedSlot === null || setupBusy || restoring || !engine.state().canPrepare || engine.state().online) return;
      if (!['ready', 'ended'].includes(saveStatus(selectedSlot))) return;
      save();
      const index = selectedSlot;
      const slot = slots.slot(index);
      if (!slot?.game) return;
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
      if (action === 'restart') selectSlot(index);
      else showSlots();
    });

    function setOpen(open) {
      // Canceling another slot's preparation must not redirect the live game's next level.
      if (!open && !engine.state().browsing) selectedSlot = activeSlot;
      menu.hidden = !open;
      document.body.classList.toggle('player-menu-open', open);
      engine.setMenuOpen(open);
      syncModalInput();
      byId('player-return-to-setup').hidden = open || !engine.state().browsing;
      if (!open) canvas.focus();
    }

    function show(next, parent = page, focusId = null) {
      page = next;
      backPage = parent;
      pages.forEach((node) => { node.hidden = node.id !== `player-${next}`; });
      byId('player-back').hidden = next === 'home';
      const titleKeys = {
        home: 'meta.heading', games: 'player.chooseGame',
        setup: PREPARATION_LAYOUTS[engine.state().mode]?.title || 'player.gameOptions', 'chess-category': 'games.chess', 'board-options': 'player.moreOptions', confirm: 'player.start',
        levels: 'player.chooseLevel',
        slots: 'player.chooseSave', 'slot-confirm': 'player.chooseSave',
        online: 'online.title', lobby: 'online.title', room: 'lobby.room'
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
      if (online?.flow()) { online.cancelRequest(); showGames(); return; }
      if (engine.onlineInfo().joined) { online.open(); return; }
      if (menu.hidden || selectedSlot === null) selectedSlot = activeSlot;
      showGames();
    });
    byId('player-home-button').addEventListener('click', () => {
      engine.closeSettings(); save(); ++setupRequest;
      setupBusy = false; restoring = false;
      if (engine.state().online) { online.home(); return; }
      engine.cancelSetup(); show('home');
    });
    document.addEventListener('ramified-player-sokoban-action', event => {
      const state = engine.state();
      if (state.online || !state.solved || !state.sokobanLevelId) return;
      selectedSlot = activeSlot;
      const next = levelIds[levelIds.indexOf(state.sokobanLevelId) + 1];
      if (event.detail.action === 'sokoban-next' && next) {
        levelsParent = 'games';
        chooseLevel(next, { next: true });
      } else showLevels('games');
    });
    function goBack() {
      if (online?.busy()) online.cancelRequest();
      if (online?.back(page)) return;
      if (page === 'slot-confirm') { showSlots();
      } else if (page === 'slots') {
        ++setupRequest; restoring = false; setupBusy = false; selectedSlot = null;
        show('home');
      } else if (page === 'levels') {
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        pendingLevelId = null;
        if (levelsParent === 'games') showGames();
        else show(levelsParent, 'home');
      } else if (page === 'confirm' && pendingLevelId) {
        showLevels();
      } else if (page === 'setup') {
        if (!online?.flow() && engine.state().mode === 'fide-chess' && !setupBusy) {
          chessBoards.set(chessCategory, engine.state().presetId);
          show('chess-category', 'games');
          return;
        }
        ++setupRequest;
        setupBusy = false;
        if (online?.flow()) engine.onlineCancelSetup(); else engine.cancelSetup();
        showGames();
      } else if (page === 'chess-category') {
        ++setupRequest;
        setupBusy = false;
        engine.cancelSetup();
        showGames();
      } else if (page === 'board-options') show('setup', 'games', 'player-more');
      else if (page === 'confirm') show('setup', 'games');
      else if (page === 'games') showSlots();
      else show(backPage, 'home');
    }
    byId('player-back').addEventListener('click', goBack);
    byId('player-fullscreen').addEventListener('click', () => {
      engine.closeSettings();
      engine.fullscreen();
    });
    byId('player-view-board').addEventListener('click', () => setOpen(false));
    byId('player-edit-balls').addEventListener('click', () => setOpen(false));
    byId('player-return-to-setup').addEventListener('click', () => show('setup', 'games', 'player-more'));
    for (const button of byId('player-chess-category').querySelectorAll('[data-chess-category]')) {
      button.addEventListener('click', () => chooseGame('fide-chess', button.dataset.chessCategory));
    }
    byId('player-settings').addEventListener('click', () => engine.settings());
    function showGames({ resetPage = false } = {}) {
      if (selectedSlot === null && !online?.flow()) { showSlots(); return; }
      ++setupRequest;
      setupBusy = false; restoring = false;
      if (online?.flow()) engine.onlineCancelSetup(); else engine.cancelSetup();
      pendingLevelId = null;
      save();
      if (resetPage) gameListPage = 0;
      updateGameList();
      show('games', 'slots');
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
      const all = Array.from(byId('player-game-list').children);
      const buttons = all.filter(button => !online?.flow() || window.RamifiedOnlinePlayer.allowed.has(button.dataset.gameMode));
      all.forEach(button => { button.hidden = true; });
      const lastPage = Math.max(0, Math.ceil(buttons.length / GAMES_PER_PAGE) - 1);
      gameListPage = Math.max(0, Math.min(gameListPage, lastPage));
      buttons.forEach((button, index) => { button.hidden = Math.floor(index / GAMES_PER_PAGE) !== gameListPage; });
      const busy = setupBusy || restoring || !state.canPrepare || state.online && !online?.flow();
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
      if (setupBusy || restoring || !engine.state().canPrepare || engine.state().online && !online?.flow()) return;
      if (selectedSlot === null && !online?.flow()) { showSlots(); return; }
      if (online?.flow() && mode === 'fide-chess') category = 'game';
      if (mode === 'sokoban') { showLevels('games'); return; }
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
        const loading = online?.flow() ? engine.onlinePrepare(mode) : resumeChess
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
        showGames();
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
        else showGames();
        message(tk('player.startError', 'The game could not start. Check the board settings. Your previous save is unchanged.'));
      }
    }
    function requestStart() {
      if (setupBusy || !engine.state().ready || engine.state().setupError) return;
      if (online?.flow()) { online.submit(); return; }
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
    byId('player-new').addEventListener('click', () => {
      if (engine.state().online) { setOpen(false); return; }
      showSlots();
    });
    byId('player-continue').addEventListener('click', continueSelectedGame);

    // Capture before game shortcuts, but leave settings key binding capture alone.
    window.addEventListener('keydown', (event) => {
      if (!byId('fullscreen-settings-overlay').hidden) return;
      if (!menu.hidden) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (page !== 'home') goBack();
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
          : page === 'home' ? 'player-settings' : 'player-back';
        byId(target).focus();
      }
    }).observe(byId('fullscreen-settings-overlay'), { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('pagehide', () => save());
    online = window.RamifiedOnlinePlayer.create(engine, { show, setOpen, sync, save, message, page: () => page, games: () => showGames({ resetPage: true }) });
    engine.fit();
    show('home');
  });
})();
