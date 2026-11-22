/* Study shell only. Board drawing, piece art, gluing and animation use the original engine. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const tk = (key, fallback, parameters) => window.SiteI18n?.t(key, parameters) || fallback;
  document.addEventListener('DOMContentLoaded', () => {
    const engine = window.RamifiedMinigames.player;
    const menu = byId('player-menu');
    const settings = byId('fullscreen-settings-overlay');
    const mute = byId('study-mute');
    const sound = byId('fullscreen-sound-enabled');
    const topologyGomoku = byId('study-topology-gomoku');
    function syncTopologyGomoku() {
      // beginSetup writes the selected mode before awaiting the board load;
      // state().mode reads that selection, rather than the previous live game.
      const state = engine.state();
      topologyGomoku.hidden = menu.hidden || byId('player-setup').hidden
        || byId('player-board-setup').hidden || !state.browsing || state.mode !== 'gomoku';
    }
    let layoutFrame = 0;
    let badgeFrame = 0;
    function paintPlayerBadges() {
      if (badgeFrame) return;
      badgeFrame = requestAnimationFrame(() => {
        badgeFrame = 0;
        for (const stone of document.querySelectorAll('#player-setup-players .player-stone, #player-setup-options .player-stone')) {
          const colorClass = [...stone.classList].find(name => name.startsWith('player-stone-'));
          if (!colorClass) continue;
          let canvas = stone.querySelector('canvas');
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'study-player-piece';
            canvas.setAttribute('aria-hidden', 'true');
            stone.append(canvas);
          }
          const color = colorClass.slice('player-stone-'.length);
          if (engine.paintPlayerPiece(canvas, color)) canvas.dataset.color = color;
        }
      });
    }
    const badgeObserver = new MutationObserver(paintPlayerBadges);
    for (const id of ['player-setup-players', 'player-setup-options']) {
      badgeObserver.observe(byId(id), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    function refresh() {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = 0;
        engine.refreshPresentation();
        paintPlayerBadges();
      });
    }
    const layoutObserver = new ResizeObserver(refresh);
    layoutObserver.observe(document.querySelector('.mosaic-layout'));
    // Game UI can change the wrapper's padding without resizing the outer stage.
    layoutObserver.observe(byId('canvas-wrap'), { box: 'content-box' });
    function watchDpr() {
      const query = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      query.addEventListener('change', () => { watchDpr(); refresh(); }, { once: true });
    }
    watchDpr();
    // Some browsers and device emulation do not dispatch resolution changes.
    // This inexpensive fallback repaints only when the actual DPR changes.
    let observedDpr = devicePixelRatio;
    setInterval(() => {
      if (document.hidden || observedDpr === devicePixelRatio) return;
      observedDpr = devicePixelRatio;
      refresh();
    }, 500);
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
    syncMute();
    function unlockSound(event) {
      if (event.isTrusted && sound.checked) window.RamifiedMinigameSfx?.unlock();
    }
    // Touch activates on pointerup. Capture also covers a first board click.
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) {
      document.addEventListener(type, unlockSound, true);
    }
    mute.addEventListener('click', unlockSound);
    const workshop = byId('study-workshop-content');
    for (const node of [byId('debug-toggle')?.closest('.mosaic-debug-actions'), byId('debug-tools'), byId('ramified-import-export-card')]) {
      if (!node) continue;
      node.classList.remove('collapsed', 'calculator-card-user-hidden');
      node.removeAttribute('aria-hidden');
      workshop.append(node);
    }
    byId('player-action-controls').prepend(byId('fullscreen-billiards-spin'));
    const moveRow = byId('move-row');
    const directions = byId('study-sokoban-directions');
    const actionControls = byId('player-action-controls');
    const sokobanHud = byId('study-sokoban-hud');
    const sokobanControls = byId('study-sokoban-controls');
    const sokobanUndo = byId('study-sokoban-undo');
    sokobanUndo.addEventListener('click', () => engine.undoSokobanPresentation());
    byId('study-sokoban-reset').addEventListener('click', () => engine.restartSokobanPresentation());
    function syncSokoban() {
      const puzzle = menu.hidden && settings.hidden ? engine.sokobanPresentation() : null;
      const hidden = !puzzle;
      const layoutChanged = sokobanHud.hidden !== hidden;
      sokobanHud.hidden = sokobanControls.hidden = hidden;
      if (layoutChanged && puzzle) engine.refreshPresentation();
      if (!puzzle) {
        if (moveRow.parentElement === directions) actionControls.prepend(moveRow);
        return;
      }
      if (moveRow.parentElement !== directions) directions.append(moveRow);
      const goal = puzzle.bridges ? tk('player.sokobanBridgeGoal', 'Cover all targets with boxes or bridge blocks.')
        : tk('player.sokobanGoal', 'Push boxes onto all the targets.');
      const progress = tk('player.sokobanProgress', 'Targets {{covered}}/{{total}} · Moves {{moves}}', { ...puzzle, total: puzzle.targets });
      if (byId('study-sokoban-goal').textContent !== goal) byId('study-sokoban-goal').textContent = goal;
      if (byId('study-sokoban-progress').textContent !== progress) byId('study-sokoban-progress').textContent = progress;
      byId('study-sokoban-bridge').hidden = !puzzle.bridges;
      byId('study-sokoban-glue').hidden = !puzzle.glued;
      sokobanUndo.disabled = !puzzle.canUndo;
    }
    byId('player-actions').addEventListener('toggle', refresh);
    byId('study-online').addEventListener('click', () => {
      engine.closeSettings();
      byId('player-online-open').click();
    });
    byId('study-again').addEventListener('click', () => engine.replayPresentation());
    byId('study-result-menu').addEventListener('click', () => byId('fullscreen-settings-open').click());
    const stats = document.createElement('details');
    stats.id = 'study-stats';
    const statsTitle = document.createElement('summary');
    statsTitle.dataset.i18n = 'study.statistics';
    statsTitle.textContent = tk('study.statistics');
    stats.append(statsTitle);
    byId('player-settings-extra').prepend(stats);
    const statsCard = byId('score-value').closest('.card');
    statsCard.querySelector('.card-head')?.remove();
    stats.append(statsCard);
    byId('study-hud').append(byId('score-value').closest('.stat-row'));
    const config = document.createElement('details');
    config.id = 'study-options';
    const configTitle = document.createElement('summary');
    configTitle.dataset.i18n = 'study.gameSettings';
    configTitle.textContent = tk('study.gameSettings');
    config.append(configTitle);
    byId('player-settings-extra').append(config);
    const setupNode = byId('player-setup-controls').firstElementChild;
    if (setupNode) config.append(setupNode);
    // Keep the original PNG artwork and original six-game pagination.
    byId('player-game-list').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const buttons = [...byId('player-game-list').children].filter(button => !button.hidden && !button.disabled);
      const index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const columns = getComputedStyle(byId('player-game-list')).gridTemplateColumns.split(' ').length;
      const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns })[event.key];
      buttons[(index + delta + buttons.length) % buttons.length].focus();
    });
    function syncTurn() {
      const status = byId('study-status');
      const state = engine.presentationInfo();
      const shell = engine.state();
      status.hidden = !shell.active || shell.browsing || !menu.hidden || !settings.hidden;
      if (state.restartPending) {
        status.hidden = true; // The restored toolbar owns its confirmation text.
        return;
      }
      const finished = ['gameover', 'complete'].includes(state.phase);
      const levelResult = finished && !!shell.sokobanLevelId;
      byId('study-again').hidden = byId('study-result-menu').hidden = !finished || levelResult;
      document.body.classList.toggle('study-finished', finished && !levelResult);
      if (!state.turn || finished) {
        status.dataset.message = '';
        status.textContent = finished ? tk('study.finished') : '';
        return;
      }
      const sideKeys = { black: 'study.side.black', white: 'study.side.white', red: 'study.side.red', yellow: 'study.side.yellow', blue: 'study.side.blue', green: 'study.side.green', purple: 'study.side.purple' };
      const message = tk('study.turn', '{{side}} to play', { side: tk(sideKeys[state.turn], state.turn) });
      if (status.dataset.message === message) return;
      status.dataset.message = message;
      status.replaceChildren();
      const mark = document.createElement('span');
      mark.className = 'study-turn';
      mark.setAttribute('aria-hidden', 'true');
      mark.style.setProperty('--turn-ink', ({ white: '#FAFBF8', black: '#222222', red: '#D83A3A', yellow: '#F0C84B', blue: '#4285D4', green: '#3B9955', purple: '#835B88' })[state.turn] || '#222222');
      const text = document.createElement('span');
      text.textContent = message;
      status.append(mark, text);
    }
    function syncPage() {
      syncTopologyGomoku();
      const open = !menu.hidden;
      const settingsOpen = !settings.hidden;
      document.body.classList.toggle('study-settings-open', settingsOpen);
      mute.hidden = open || settingsOpen;
      if (!settingsOpen) byId('study-workshop').open = false;
      const state = engine.state();
      document.body.dataset.studyGame = state.mode;
      byId('study-hud').hidden = open || settingsOpen || state.mode !== '2048';
      syncSokoban();
      syncTurn();
      paintPlayerBadges();
    }
    new MutationObserver(syncPage).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(syncPage).observe(settings, { attributes: true, attributeFilter: ['hidden'] });
    for (const id of ['player-setup', 'player-board-setup']) {
      new MutationObserver(syncTopologyGomoku).observe(byId(id), { attributes: true, attributeFilter: ['hidden'] });
    }
    new MutationObserver(syncTurn).observe(byId('fullscreen-action-status'), { childList: true, attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('ramified-player-state', syncPage);
    document.addEventListener('site-language-change', () => {
      for (const node of topologyGomoku.querySelectorAll('[data-i18n]')) node.textContent = tk(node.dataset.i18n);
      syncMute(); syncSokoban(); syncTurn(); refresh();
    });
    syncPage();
    refresh();
  });
})();
