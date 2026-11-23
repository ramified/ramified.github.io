/* Main-page presentation only. The online controller owns all room state/actions. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const el = id => document.getElementById(id);
    const room = el('player-room');
    const engine = window.RamifiedMinigames.player;
    const tk = (key, fallback, parameters) => window.SiteI18n?.t(key, parameters) || fallback;
    const options = el('player-room-seat-options');
    const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
    const copy = el('player-room-copy');
    const loading = el('player-room-loading'), menu = el('player-menu'), message = el('player-message');
    let pending = null, loadingTimer = 0, connectionError = null;

    function stopWaiting() {
      clearTimeout(loadingTimer);
      pending = null;
      loading.hidden = true;
      el('player-room-loading-text').textContent = '';
      delete document.body.dataset.roomConnectionPending;
    }
    function clearConnectionError() {
      connectionError = null;
      delete message.dataset.roomConnectionError;
    }
    function pendingTime(config = {}) {
      if (config.mode === 'total') return tk('lobby.totalMinutesSummary', '{{minutes}} minutes per side', { minutes: Number((config.totalSeconds / 60).toFixed(2)) });
      if (config.mode === 'move') return tk('lobby.moveSummary', '{{seconds}} seconds per action', { seconds: config.moveSeconds });
      if (config.mode === 'byoyomi') return tk('lobby.byoMinutesSummary', '{{minutes}} minutes + 3 × {{period}} seconds', { minutes: Number((config.totalSeconds / 60).toFixed(2)), period: config.periodSeconds });
      return tk('lobby.unlimited', 'Unlimited');
    }
    function paintWaiting() {
      if (!pending || loading.hidden) return;
      setText(el('player-room-loading-game'), engine.games().find(game => game.mode === pending.gameMode)?.label || tk('lobby.room', 'Room'));
      const text = pending.kind === 'creating' ? tk('study.roomCreating', 'Creating room…')
        : pending.kind === 'joining' ? tk('study.roomJoining', 'Joining room…') : tk('lobby.connecting', 'Connecting…');
      setText(el('player-room-loading-text'), text);
      setText(el('player-room-loading-status-measure'), pending.roundState === 'playing' ? tk('lobby.playing', 'Playing')
        : ['finished', 'rematch-vote'].includes(pending.roundState) ? tk('lobby.finished', 'Round ended') : tk('lobby.waiting', 'Waiting for players to choose seats and get ready'));
      setText(el('player-room-loading-host'), tk('lobby.host', 'Host: {{name}}', { name: pending.hostName || tk('lobby.noHost', 'None') }));
      setText(el('player-room-loading-time'), pendingTime(pending.timeControl));
      loading.style.setProperty('--loading-actions', pending.kind === 'joining' ? '2' : '3');
      loading.style.setProperty('--loading-members-size', pending.kind === 'joining' ? 'calc(1.4 * clamp(12px,var(--small),16px) + clamp(12px,1.4cqw,20px))' : '0px');
      const rows = el('player-room-loading-rows'), count = pending.seatCount || 2;
      if (rows.children.length !== count) {
        rows.replaceChildren();
        for (let i = 0; i < count; i++) {
          const row = document.createElement('div'); row.className = 'player-room-placeholder player-room-loading-row'; rows.append(row);
        }
      }
    }
    function startWaiting(detail) {
      clearConnectionError();
      if (pending?.kind === detail.kind) { pending = { ...pending, ...detail }; paintWaiting(); return; }
      stopWaiting();
      pending = detail;
      document.body.dataset.roomConnectionPending = 'true';
      loadingTimer = setTimeout(() => {
        if (!pending) return;
        loading.hidden = false;
        paintWaiting();
        if (!menu.hidden) el('player-back').focus();
      }, 200);
    }
    document.addEventListener('ramified-room-presentation', ({ detail }) => {
      if (detail.phase === 'start') startWaiting(detail);
      else {
        stopWaiting();
        if (detail.phase === 'error') {
          connectionError = { key: detail.key, params: detail.params, text: message.textContent };
          message.dataset.roomConnectionError = 'true';
        } else if (detail.phase === 'cancel') clearConnectionError();
        syncRoom();
      }
    });
    new MutationObserver(() => {
      if (pending && ![pending.sourcePage, 'room'].includes(document.body.dataset.studyPage)) stopWaiting();
    }).observe(document.body, { attributes: true, attributeFilter: ['data-study-page'] });
    new MutationObserver(() => {
      if (menu.hidden) stopWaiting();
    }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(() => {
      if (connectionError && (message.hidden || message.textContent !== connectionError.text)) clearConnectionError();
    }).observe(message, { childList: true, attributes: true, attributeFilter: ['hidden'] });

    function syncActions(info) {
      const selected = [...options.querySelectorAll('input:checked')].map(input => input.value);
      const confirmed = info.roles || [];
      const pending = selected.length !== confirmed.length || selected.some(role => !confirmed.includes(role));
      const claim = el('player-room-claim'), ready = el('player-room-ready');
      claim.hidden = !!info.proposal || !pending && confirmed.length > 0;
      ready.hidden = !!info.proposal || !claim.hidden;
      // Keep keyboard focus on the next visible primary action after confirmation.
      if ([claim, ready].includes(document.activeElement) && document.activeElement.hidden) {
        [claim, ready, el('player-room-watch')].find(button => !button.hidden && !button.disabled)?.focus();
      }
    }

    function syncRoom() {
      const info = engine.onlineInfo();
      if (!pending && info.connecting && !room.hidden && !menu.hidden) startWaiting({ kind: 'connecting', gameMode: info.gameMode, hostName: info.hostName, timeControl: info.timeControl, roundState: info.roundState, seatCount: options.querySelectorAll('input').length || 2, sourcePage: 'room' });
      if (pending?.kind === 'connecting' && !info.connecting) stopWaiting();
      const connectionFailed = !info.joined && !info.connecting && el('online-status').dataset.state === 'error';
      room.dataset.roomPresentation = info.loadFailed || connectionFailed ? 'failed' : info.connecting ? 'connecting' : 'ready';
      if (room.hidden) return;
      if (connectionFailed) { setText(el('player-room-state'), tk('lobby.joinError', 'Could not enter this room. Choose a room to retry, or go back.')); return; }
      if (!info.joined) return;
      setText(el('player-room-game'), engine.games().find(game => game.mode === info.gameMode)?.label || info.gameMode);
      setText(el('player-room-code'), info.roomCode || '');
      copy.setAttribute('aria-label', tk('lobby.inviteCopyCode', 'Copy room code {{code}}', { code: info.roomCode }));
      setText(el('player-room-host'), tk('lobby.host', 'Host: {{name}}', { name: info.hostName || tk('lobby.noHost', 'None') }));
      if (info.loadFailed) {
        setText(el('player-room-state'), tk('study.roomLoadFailed', 'Could not load the room. Refresh to retry.'));
        if (document.activeElement?.closest('.player-room-actions') && document.activeElement.id !== 'player-room-retry') el('player-back').focus();
        return;
      }
      for (const input of options.querySelectorAll('input')) {
        const card = input.closest('label');
        if (!card.classList.contains('player-seat-card')) {
          card.classList.add('player-seat-card');
          card.querySelector('span').classList.add('player-seat-color');
          const stone = document.createElement('span');
          const color = ({ 'player-1': 'black', 'player-2': 'white' })[input.value] || input.value;
          stone.className = `player-stone player-stone-${color}`;
          stone.setAttribute('aria-hidden', 'true');
          input.after(stone);
          const canvas = document.createElement('canvas');
          canvas.className = 'study-player-piece';
          stone.append(canvas);
          if (!engine.paintPlayerPiece(canvas, color)) canvas.remove();
          const details = document.createElement('span');
          details.className = 'player-seat-details';
          card.append(details);
          for (const className of ['player-seat-occupant', 'player-seat-status', 'player-seat-ready']) {
            const span = document.createElement('span');
            span.className = className;
            details.append(span);
          }
        }
        const member = (info.members || []).find(member => member.roles.includes(input.value));
        const confirmed = (info.roles || []).includes(input.value);
        const taken = !!info.roomRoles?.[input.value] && !confirmed;
        card.dataset.seatState = confirmed ? 'confirmed' : taken ? 'taken' : 'open';
        setText(card.querySelector('.player-seat-occupant'), member?.playerName || (confirmed ? info.playerName : '') || tk('study.roomOpen', 'Open'));
        setText(card.querySelector('.player-seat-status'), input.checked && !confirmed
          ? tk('study.roomSelected', 'Selected · confirm to join')
          : confirmed ? tk('study.roomConfirmed', '✓ Confirmed') : taken ? tk('study.roomTaken', 'Taken') : '');
        setText(card.querySelector('.player-seat-ready'), member
          ? member.online === false ? tk('lobby.reconnecting', ' (reconnecting)')
            : info.readyClientIds?.includes(member.clientId) ? tk('study.roomReady', 'Ready') : tk('study.roomNotReady', 'Not ready')
          : '');
      }
      const spectators = (info.members || []).filter(member => !member.roles.length);
      const members = el('player-room-members');
      members.replaceChildren();
      members.hidden = !spectators.length;
      if (spectators.length) {
        const line = document.createElement('li');
        line.textContent = tk('study.roomSpectators', 'Spectators: {{names}}', { names: spectators.map(member => member.playerName).join(', ') });
        members.append(line);
      }
      syncActions(info);
    }

    const inviteActions = el('player-room-invite-actions');
    const inviteStatus = el('player-room-link-status');
    const inviteFallback = el('player-room-link-fallback');
    const share = el('player-room-share-link');
    let inviteRoom = '';
    function syncInviteActions() {
      const info = engine.onlineInfo();
      inviteActions.hidden = !info.joined || info.loadFailed || ['finished', 'rematch-vote'].includes(info.roundState);
      if (inviteRoom !== info.roomCode) {
        inviteRoom = info.roomCode;
        inviteStatus.hidden = inviteFallback.hidden = true;
      }
    }
    function showInviteCopyStatus(key, fallback, url = '') {
      inviteStatus.dataset.i18n = key;
      setText(inviteStatus, tk(key, fallback));
      setText(inviteFallback, url);
      inviteStatus.hidden = false;
      inviteFallback.hidden = !url;
    }
    function inviteUrl(code) {
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('room', code);
      return url.href;
    }
    async function shareInvite(useShare) {
      const code = engine.onlineInfo().roomCode;
      if (!/^\d{6}$/.test(code)) return;
      const url = inviteUrl(code);
      try {
        if (useShare) await navigator.share({ url });
        else await navigator.clipboard.writeText(url);
        if (engine.onlineInfo().roomCode !== code) return;
        const info = engine.onlineInfo();
        if (!useShare && info.hostId === info.clientId && info.roundState === 'waiting') {
          showInviteCopyStatus('lobby.inviteHostCopied', 'Link copied. You’ll be ready when the seats fill.');
        } else if (!useShare) showInviteCopyStatus('lobby.inviteCopied', 'Invite link copied');
      } catch (error) {
        if (engine.onlineInfo().roomCode !== code || useShare && error?.name === 'AbortError') return;
        showInviteCopyStatus('lobby.inviteCopyFallback', 'Press and hold or select the link below to copy it.', url);
      }
      document.dispatchEvent(new CustomEvent('ramified-room-share-invite'));
    }
    share.hidden = typeof navigator.share !== 'function';
    share.addEventListener('click', () => shareInvite(true));
    el('player-room-copy-link').addEventListener('click', () => shareInvite(false));
    document.addEventListener('ramified-online-state', syncInviteActions);
    new MutationObserver(syncInviteActions).observe(room, { attributes: true, attributeFilter: ['hidden'] });

    copy.addEventListener('click', async () => {
      const code = engine.onlineInfo().roomCode;
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        if (engine.onlineInfo().roomCode !== code) return;
        el('player-room-copy-status').dataset.i18n = 'study.roomCopied';
        el('player-room-copy-status').textContent = tk('study.roomCopied', 'Copied');
      } catch (_) {
        el('player-room-copy-status').dataset.i18n = 'study.roomCopyFailed';
        el('player-room-copy-status').textContent = tk('study.roomCopyFailed', 'Could not copy. Select the room code to copy it.');
      }
    });
    options.addEventListener('change', syncRoom);
    // The existing controller rebuilds only the seat inputs when their state changes.
    // Decorate those labels in place; never replace an input or its pending choice.
    new MutationObserver(syncRoom).observe(options, { childList: true });
    new MutationObserver(syncRoom).observe(room, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('ramified-online-state', syncRoom);
    document.addEventListener('site-language-change', () => {
      paintWaiting();
      if (connectionError) { connectionError.text = tk(connectionError.key, undefined, connectionError.params); setText(message, connectionError.text); }
      syncRoom();
    });
    new MutationObserver(syncRoom).observe(el('online-status'), { childList: true });
    window.addEventListener('pagehide', stopWaiting);
    syncRoom();
  });
})();
