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
    let copyTimer;

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
      if (room.hidden || !info.joined) return;
      setText(el('player-room-game'), engine.games().find(game => game.mode === info.gameMode)?.label || info.gameMode);
      setText(el('player-room-code'), info.roomCode || '');
      setText(el('player-room-host'), tk('lobby.host', 'Host: {{name}}', { name: info.hostName || tk('lobby.noHost', 'None') }));
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

    copy.addEventListener('click', async () => {
      const code = engine.onlineInfo().roomCode;
      if (!code) return;
      clearTimeout(copyTimer);
      try {
        await navigator.clipboard.writeText(code);
        if (engine.onlineInfo().roomCode !== code) return;
        copy.dataset.i18n = 'study.roomCopied';
        copy.textContent = tk('study.roomCopied', 'Copied');
        el('player-room-copy-status').dataset.i18n = 'study.roomCopied';
        el('player-room-copy-status').textContent = copy.textContent;
      } catch (_) {
        el('player-room-copy-status').dataset.i18n = 'study.roomCopyFailed';
        el('player-room-copy-status').textContent = tk('study.roomCopyFailed', 'Could not copy. Select the room code to copy it.');
      }
      copyTimer = setTimeout(() => {
        copy.dataset.i18n = 'study.roomCopy';
        copy.textContent = tk('study.roomCopy', 'Copy');
      }, 1800);
    });
    options.addEventListener('change', syncRoom);
    // The existing controller rebuilds only the seat inputs when their state changes.
    // Decorate those labels in place; never replace an input or its pending choice.
    new MutationObserver(syncRoom).observe(options, { childList: true });
    new MutationObserver(syncRoom).observe(room, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('ramified-online-state', syncRoom);
    document.addEventListener('site-language-change', syncRoom);
    syncRoom();
  });
})();
