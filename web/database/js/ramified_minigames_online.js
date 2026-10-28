(() => {
  'use strict';
  const tk = (key, fallback, params) => window.SiteI18n?.t(key, params) || fallback;
  const allowed = new Set(['hex', 'gomoku', 'go', 'connect-four', 'reversi', 'chinese-checkers', 'fide-chess', 'billiards']);
  window.RamifiedOnlinePlayer = { allowed, create(engine, ui) {
    const el = id => document.getElementById(id);
    let flow = '', serial = 0, creationId = '', lobbySocket = null, reconnectTimer = null;
    let players = [], rooms = [], previousRound = '', stopped = false, requestBusy = false;
    let lastPresence = '', lastRoomKey = '', lastSeatKey = '', creationFingerprint = '';
    const gameName = mode => engine.games().find(game => game.mode === mode)?.label || mode;
    const roleName = role => ({
      black: tk('status.black', 'Black'), white: tk('status.white', 'White'),
      red: tk('status.red', 'Red'), yellow: tk('status.yellow', 'Yellow'),
      blue: tk('lobby.blue', 'Blue'), green: tk('lobby.green', 'Green'),
      purple: tk('lobby.purple', 'Purple'), orange: tk('lobby.orange', 'Orange'),
      'player-1': tk('lobby.player1', 'Player 1'), 'player-2': tk('lobby.player2', 'Player 2')
    })[role] || role;
    function setFlow(next) {
      flow = next;
      document.body.classList.toggle('player-online-preparing', !!flow);
      el('player-time-fields').hidden = !flow;
      ui.sync();
    }
    function timeSummary(config = {}) {
      if (config.mode === 'total') return tk('lobby.totalMinutesSummary', '{{minutes}} minutes per side', { minutes: Number((config.totalSeconds / 60).toFixed(2)) });
      if (config.mode === 'move') return tk('lobby.moveSummary', '{{seconds}} seconds per action', { seconds: config.moveSeconds });
      if (config.mode === 'byoyomi') return tk('lobby.byoMinutesSummary', '{{minutes}} minutes + 3 × {{period}} seconds', { minutes: Number((config.totalSeconds / 60).toFixed(2)), period: config.periodSeconds });
      return tk('lobby.unlimited', 'Unlimited');
    }
    function modeFields() {
      const mode = el('player-time-mode').value;
      el('player-time-main-row').hidden = !['total', 'byoyomi'].includes(mode);
      el('player-time-action-row').hidden = !['move', 'byoyomi'].includes(mode);
      el('player-time-action-label').dataset.i18n = mode === 'byoyomi' ? 'lobby.periodSeconds' : 'lobby.actionSeconds';
      el('player-time-action-label').textContent = mode === 'byoyomi' ? tk('lobby.periodSeconds', 'Period length (seconds)') : tk('lobby.actionSeconds', 'Time per action (seconds)');
    }
    function configurationSummary(proposal) {
      const c = proposal.configuration || {}, parts = [proposal.summary];
      const option = (id, value) => Array.from(el(id)?.options || []).find(item => item.value === String(value))?.textContent;
      if (c.rows && c.cols) parts.push(tk('lobby.dimensions', '{{rows}} × {{cols}}', { rows: c.rows, cols: c.cols }));
      for (const [id, value] of [['boundary-glue-mode', c.boundary], ['boundary-glue-shape', c.shape], ['connect-four-fall-dir', c.fallDir], ['chinese-checkers-jump-rule', c.jumpRule]]) {
        if (value != null && option(id, value)) parts.push(option(id, value));
      }
      if (c.komi != null) parts.push(tk('lobby.komi', 'Komi: {{value}}', { value: c.komi }));
      if (c.pieRule != null) parts.push(c.pieRule ? tk('lobby.pieOn', 'Pie rule on') : tk('lobby.pieOff', 'Pie rule off'));
      if (c.playerColors) parts.push(c.playerColors.map(roleName).join(', '));
      if (c.ballCount != null) parts.push(tk('lobby.balls', '{{count}} balls', { count: c.ballCount }));
      return parts.filter(Boolean).join(' · ');
    }
    function readTime() {
      const mode = el('player-time-mode').value;
      const config = { mode };
      const number = (id, scale = 1) => {
        const raw = el(id).value.trim();
        const value = Number(raw);
        const n = scale === 60 ? Math.round(value * scale) : value;
        if (!raw || !Number.isFinite(value)) throw new Error('time');
        if (!Number.isInteger(n) || n < 1 || n > 86400) throw new Error('time');
        return n;
      };
      if (['total', 'byoyomi'].includes(mode)) config.totalSeconds = number('player-time-main', 60);
      if (mode === 'move') config.moveSeconds = number('player-time-action');
      if (mode === 'byoyomi') config.periodSeconds = number('player-time-action');
      return config;
    }
    function appendText(parent, tag, text) {
      const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
    }
    function renderPlayers() {
      const list = el('player-lobby-players'); list.replaceChildren();
      if (!players.length) appendText(list, 'li', tk('lobby.connecting', 'Connecting…'));
      for (const player of players) appendText(list, 'li', player.playerName);
    }
    function renderRooms() {
      const list = el('player-lobby-rooms'); list.replaceChildren();
      if (!rooms.length) appendText(list, 'p', tk('lobby.empty', 'No rooms available.'));
      for (const room of rooms) {
        const row = document.createElement('div'); row.className = 'player-lobby-room';
        appendText(row, 'p', tk('lobby.roomTitle', '{{game}} · {{code}}', { game: gameName(room.gameMode), code: room.roomCode }));
        appendText(row, 'p', tk('lobby.host', 'Host: {{name}}', { name: room.hostName || tk('lobby.noHost', 'None') }));
        appendText(row, 'p', (room.members || []).map(member => member.playerName).join(', '));
        appendText(row, 'p', timeSummary(room.timeControl));
        const occupied = (room.members || []).reduce((sum, member) => sum + member.roles.length, 0);
        appendText(row, 'p', tk('lobby.seatCount', '{{occupied}} / {{total}} seats occupied', { occupied, total: occupied + (room.unclaimedRoles || []).length }));
        appendText(row, 'p', roundLabel(room.roundState));
        const button = appendText(row, 'button', tk('lobby.join', 'Enter room'));
        button.className = 'btn'; button.type = 'button'; button.dataset.roomCode = room.roomCode;
        button.disabled = requestBusy;
        button.addEventListener('click', () => join(room.roomCode)); list.append(row);
      }
    }
    function roundLabel(state) {
      return state === 'playing' ? tk('lobby.playing', 'Playing') : state === 'finished' || state === 'rematch-vote' ? tk('lobby.finished', 'Round ended') : tk('lobby.waiting', 'Waiting for players to choose seats and get ready');
    }
    async function refresh() {
      const info = engine.onlineInfo();
      if (!info.baseUrl) { ui.message(tk('lobby.unavailable', 'Online play is unavailable. You can go back or retry.')); return; }
      const ticket = serial;
      try {
        const response = await fetch(`${info.baseUrl}/api/rooms`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('rooms');
        const data = await response.json();
        if (ticket !== serial || ui.page() !== 'lobby') return;
        rooms = data.rooms || []; renderRooms(); ui.message();
      } catch (_) { if (ticket === serial && ui.page() === 'lobby') ui.message(tk('lobby.loadError', 'Could not load the lobby. Refresh to retry, or go back.')); }
    }
    function presence() {
      if (lobbySocket?.readyState !== WebSocket.OPEN) return;
      const info = engine.onlineInfo();
      const data = JSON.stringify({ type: 'presence', playerName: info.playerName, roomCode: info.roomCode });
      if (data !== lastPresence) { lastPresence = data; lobbySocket.send(data); }
    }
    function connectLobby() {
      if (stopped || lobbySocket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(lobbySocket.readyState)) return;
      const info = engine.onlineInfo();
      if (!info.baseUrl) return;
      const url = new URL(`${info.baseUrl}/ws/lobby`); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('clientId', info.clientId);
      try { lobbySocket = new WebSocket(url); } catch (_) { retryLobby(); return; }
      const socket = lobbySocket;
      socket.addEventListener('open', () => { lastPresence = ''; presence(); });
      socket.addEventListener('message', event => {
        if (socket !== lobbySocket) return;
        try { const value = JSON.parse(event.data); if (value.type === 'lobbyPresence') { players = value.players; renderPlayers(); } } catch (_) {}
      });
      socket.addEventListener('close', () => { if (socket === lobbySocket) { lobbySocket = null; retryLobby(); } });
    }
    function retryLobby() { clearTimeout(reconnectTimer); if (!stopped) reconnectTimer = setTimeout(connectLobby, 3000); }
    function open() {
      ++serial; ui.save();
      if (engine.onlineInfo().joined) { renderRoom(true); ui.show('room', 'home'); return; }
      ui.show('lobby', 'home');
      el('player-lobby-name').value = engine.onlineInfo().playerName || '';
      renderPlayers(); connectLobby(); refresh();
    }
    function prepare(change = false) {
      if (requestBusy || !engine.onlineEnter()) return;
      ++serial; creationId = crypto.randomUUID(); creationFingerprint = '';
      const config = change ? engine.onlineInfo().timeControl || {} : {};
      el('player-time-mode').value = config.mode || 'unlimited';
      el('player-time-main').value = config.totalSeconds ? config.totalSeconds / 60 : 10;
      el('player-time-action').value = config.moveSeconds || config.periodSeconds || 30;
      modeFields(); setFlow(change ? 'change' : 'create'); ui.games();
    }
    async function join(code) {
      if (requestBusy) return;
      const ticket = ++serial; requestBusy = true; ui.save(); renderRooms();
      ui.message(tk('lobby.connecting', 'Connecting…'));
      try {
        const joined = await engine.onlineJoin(code, { isCurrent: () => ticket === serial });
        if (!joined || ticket !== serial) return;
        renderRoom(true); ui.show('room', 'lobby'); presence();
      } catch (_) {
        if (ticket !== serial) return;
        engine.onlineLeave(); ui.show('lobby', 'home');
        ui.message(tk('lobby.joinError', 'Could not enter this room. Choose a room to retry, or go back.'));
      } finally { if (ticket === serial) { requestBusy = false; renderRooms(); } }
    }
    async function submit() {
      if (!flow || requestBusy) return;
      let config;
      try { config = readTime(); } catch (_) { ui.show('board-options', 'setup'); ui.message(tk('lobby.timeUnitsError', 'Enter a total time up to 1440 minutes (at least 1 second), and whole seconds from 1 to 86400 per action or period.')); return; }
      const ticket = serial; requestBusy = true; ui.sync();
      try {
        const snapshot = engine.onlinePreparedSnapshot();
        const fingerprint = JSON.stringify({ snapshot: { ...snapshot, exportedAt: '' }, config });
        if (creationFingerprint && fingerprint !== creationFingerprint) creationId = crypto.randomUUID();
        creationFingerprint = fingerprint;
        if (flow === 'change') {
          if (!engine.onlineSend({ type: 'proposeConfiguration', gameMode: snapshot.gameMode, snapshot, timeControl: config, summary: snapshot.preset.label || snapshot.preset.id })) throw new Error('send');
          engine.onlineCancelSetup(); setFlow(''); ui.show('room', 'home');
        } else {
          const room = await engine.onlineCreate(snapshot, config, creationId);
          if (ticket !== serial) return;
          engine.onlineCancelSetup(); setFlow(''); requestBusy = false;
          await join(room.roomCode);
        }
      } catch (_) {
        if (ticket === serial) ui.message(tk('lobby.createError', 'Could not apply the configuration. Retry or go back; your previous game is unchanged.'));
      } finally { if (ticket === serial) requestBusy = false; ui.sync(); }
    }
    function renderRoom(force = false) {
      const info = engine.onlineInfo();
      const key = JSON.stringify([info.roomCode, info.gameMode, info.loadFailed, info.members, info.roomRoles, info.roles, info.roundState, info.readyClientIds, info.proposal, info.hostId, info.outcome, window.SiteI18n?.getLocale()]);
      if (!force && key === lastRoomKey) return;
      lastRoomKey = key;
      const host = info.hostId === info.clientId;
      el('player-room-summary').textContent = tk('lobby.roomSummary', '{{game}} · {{code}} · Host: {{name}}', { game: gameName(info.gameMode), code: info.roomCode || '', name: info.hostName || tk('lobby.noHost', 'None') });
      el('player-room-state').textContent = info.outcome?.type === 'timeout'
        ? tk('lobby.timeout', 'Time expired: {{sides}}. Round ended.', { sides: info.outcome.losers.map(roleName).join(', ') })
        : info.outcome?.type === 'aborted' ? tk('lobby.aborted', 'All players left. This round ended without a winner.') : roundLabel(info.roundState);
      el('player-room-time').textContent = timeSummary(info.timeControl);
      const members = el('player-room-members'); members.replaceChildren();
      for (const member of info.members || []) appendText(members, 'li', tk('lobby.member', '{{name}} — {{seats}}{{connection}}{{ready}}', { name: member.playerName, seats: member.roles.length ? member.roles.map(roleName).join(', ') : tk('lobby.spectator', 'Spectator'), connection: member.online ? '' : tk('lobby.reconnecting', ' (reconnecting)'), ready: info.readyClientIds?.includes(member.clientId) ? tk('lobby.readySuffix', ' (ready)') : '' }));
      const seatKey = JSON.stringify([info.roomCode, info.gameMode, info.roomRoles, info.roles, info.unclaimedRoles, !!info.proposal, info.roundState, window.SiteI18n?.getLocale()]);
      if (seatKey !== lastSeatKey) {
        lastSeatKey = seatKey;
        const options = el('player-room-seat-options'); options.replaceChildren();
        for (const role of [...new Set([...Object.keys(info.roomRoles || {}), ...(info.unclaimedRoles || [])])]) {
          const label = document.createElement('label'), input = document.createElement('input');
          input.type = info.gameMode === 'chinese-checkers' ? 'checkbox' : 'radio'; input.name = 'online-seat'; input.value = role;
          input.checked = (info.roles || []).includes(role);
          input.disabled = !!info.proposal || !!info.roomRoles[role] && !input.checked || info.roundState === 'playing' && (info.roles || []).length > 0;
          label.append(input); appendText(label, 'span', roleName(role)); options.append(label);
        }
      }
      el('player-room-claim').disabled = !!info.proposal;
      el('player-room-ready').disabled = !info.roles?.length || info.roundState !== 'waiting' || !!info.proposal;
      el('player-room-ready').textContent = info.readyClientIds?.includes(info.clientId) ? tk('lobby.unready', 'Cancel ready') : tk('lobby.ready', 'Ready');
      el('player-room-change').hidden = !host;
      el('player-room-watch').disabled = !!info.loadFailed;
      el('player-room-retry').hidden = !info.loadFailed;
      const proposal = info.proposal;
      el('player-room-proposal').hidden = !proposal;
      if (proposal) el('player-room-proposal-text').textContent = tk('lobby.proposal', 'Start a new round with {{game}} / {{board}} / {{time}}? No response within 60 seconds cancels the proposal.', { game: gameName(proposal.gameMode), board: configurationSummary(proposal), time: timeSummary(proposal.timeControl) });
      el('player-proposal-accept').hidden = el('player-proposal-reject').hidden = host || !info.roles?.length;
      el('player-proposal-accept').disabled = proposal?.accepted.includes(info.clientId) || false;
      el('player-proposal-cancel').hidden = !host;
    }
    function clockText() {
      const info = engine.onlineInfo(), clock = info.clock, config = info.timeControl || {};
      el('player-online-clock').hidden = !info.joined || !clock || config.mode === 'unlimited';
      if (!clock || config.mode === 'unlimited') return;
      const now = (info.serverNow || Date.now()) + Date.now() - (info.clockReceivedAt || Date.now());
      const elapsed = info.roundState === 'playing' ? Math.max(0, now - Math.max(clock.at, clock.resumeAt || 0)) : 0;
      const format = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
      el('player-online-clock').textContent = Object.entries(clock.seats).map(([role, value]) => {
        const cost = clock.active.includes(role) ? elapsed : 0;
        let ms = config.mode === 'move' ? value.period - cost : value.main - cost, periods = value.periods;
        if (config.mode === 'byoyomi' && ms <= 0) {
          ms = value.period + ms;
          while (ms <= 0 && periods > 1) { periods--; ms += config.periodSeconds * 1000; }
          return tk('lobby.byoClock', '{{side}} {{time}} × {{periods}}', { side: roleName(role), time: format(ms), periods });
        }
        return tk('lobby.clock', '{{side}} {{time}}', { side: roleName(role), time: format(ms) });
      }).join('   ');
    }
    function back(page) {
      if (flow && page === 'games') { ++serial; requestBusy = false; engine.onlineCancelSetup(); setFlow(''); open(); return true; }
      if (page === 'room') { ui.setOpen(false); return true; }
      if (page === 'lobby') { ++serial; requestBusy = false; engine.onlineLeave(); setFlow(''); ui.show('home'); return true; }
      return false;
    }
    el('player-online-open').addEventListener('click', open);
    el('player-lobby-create').addEventListener('click', () => prepare(false));
    el('player-lobby-refresh').addEventListener('click', () => { connectLobby(); refresh(); });
    el('player-lobby-rename').addEventListener('click', () => { engine.onlineRename(el('player-lobby-name').value); presence(); });
    el('player-time-mode').addEventListener('change', modeFields);
    el('player-room-claim').addEventListener('click', () => engine.onlineSend({ type: 'claimRoles', rolesRequested: Array.from(el('player-room-seat-options').querySelectorAll('input:checked'), input => input.value) }));
    el('player-room-ready').addEventListener('click', () => { const i = engine.onlineInfo(); engine.onlineSend({ type: 'setReady', ready: !i.readyClientIds?.includes(i.clientId) }); });
    el('player-room-watch').addEventListener('click', () => ui.setOpen(false));
    el('player-room-retry').addEventListener('click', () => engine.onlineSend({ type: 'resync' }));
    el('player-room-change').addEventListener('click', () => prepare(true));
    el('player-room-leave').addEventListener('click', () => { ++serial; engine.onlineLeave(); setFlow(''); open(); });
    el('player-proposal-accept').addEventListener('click', () => engine.onlineSend({ type: 'configurationResponse', proposalId: engine.onlineInfo().proposal?.id, accept: true }));
    el('player-proposal-reject').addEventListener('click', () => engine.onlineSend({ type: 'configurationResponse', proposalId: engine.onlineInfo().proposal?.id, accept: false }));
    el('player-proposal-cancel').addEventListener('click', () => engine.onlineSend({ type: 'cancelConfiguration' }));
    document.addEventListener('ramified-online-state', event => {
      const info = engine.onlineInfo(); presence(); renderRoom(); clockText(); ui.sync();
      if (event.detail.type === 'departed' && ['room', 'home'].includes(ui.page())) { ui.show('lobby', 'home'); refresh(); }
      if (event.detail.type === 'error') {
        if (info.loadFailed && !flow) ui.show('room', 'home');
        ui.message(tk('lobby.operationError', 'The room could not accept this action. Check the current room state and retry.'));
      }
      const round = `${info.roundId}:${info.roundState}`;
      if (previousRound !== round && info.joined && !flow) {
        if (info.roundState === 'playing' && ui.page() === 'room' && !info.proposal) ui.setOpen(false);
        if (info.roundState === 'finished' || info.roundState === 'waiting') ui.show('room', 'home');
      }
      if (info.proposal && !flow && info.roles?.length && info.hostId !== info.clientId && !info.proposal.accepted.includes(info.clientId)) ui.show('room', 'home');
      previousRound = round;
    });
    document.addEventListener('site-language-change', () => { modeFields(); renderPlayers(); renderRooms(); renderRoom(true); clockText(); });
    window.addEventListener('pagehide', () => { stopped = true; clearTimeout(reconnectTimer); lobbySocket?.close(); });
    window.addEventListener('pageshow', () => { stopped = false; connectLobby(); });
    setInterval(() => { presence(); clockText(); }, 250);
    setInterval(() => { if (ui.page() === 'lobby') refresh(); if (lobbySocket?.readyState === WebSocket.OPEN) lobbySocket.send('{"type":"ping"}'); }, 15000);
    // Start presence for the entire game collection, including the main menu.
    setTimeout(connectLobby, 0); modeFields();
    return { open, prepare, back, submit, flow: () => flow, busy: () => requestBusy, renderRoom,
      home() {
        ++serial; requestBusy = false; engine.onlineCancelSetup();
        if (!engine.onlineInfo().joined) engine.onlineLeave();
        setFlow(''); ui.show('home');
      },
      cancelRequest() { ++serial; requestBusy = false; ui.sync(); } };
  } };
})();
