// All timestamps are server milliseconds. Merely reading a clock never refills it.
export function timeControl(value = {}) {
  const mode = value.mode || 'unlimited';
  if (!['unlimited', 'total', 'move', 'byoyomi'].includes(mode)) throw new Error('Invalid time control.');
  const result = { mode };
  for (const key of mode === 'total' ? ['totalSeconds'] : mode === 'move' ? ['moveSeconds'] : mode === 'byoyomi' ? ['totalSeconds', 'periodSeconds'] : []) {
    const n = Number(value[key]);
    if (!Number.isInteger(n) || n < 1 || n > 86400) throw new Error('Time must be a whole number from 1 to 86400 seconds.');
    result[key] = n;
  }
  return result;
}

export function activeClockRoles(room) {
  const s = room.snapshot || {};
  if (room.roundState !== 'playing' || s.scoringReview || ['gameover', 'complete', 'setup'].includes(s.phase)) return [];
  if (room.gameMode === 'chinese-checkers') {
    const roles = s.playerColors || s.chineseCheckersPlayers || Object.keys(room.roles);
    const pending = roles.filter(role => !(s.openingOrder || []).includes(role));
    if (pending.length) return pending;
  }
  return [s.ballInHandPlayer && s.ballInHand ? s.ballInHandPlayer : s.turn].filter(Boolean);
}

export function startClock(room, roles, now) {
  const config = timeControl(room.timeControl);
  room.clock = { at: now, active: activeClockRoles(room), seats: {} };
  for (const role of roles) room.clock.seats[role] = {
    main: (config.totalSeconds || 0) * 1000,
    period: (config.mode === 'move' ? config.moveSeconds : config.periodSeconds || 0) * 1000,
    periods: config.mode === 'byoyomi' ? 3 : 0
  };
}

export function remaining(config, seat) {
  if (config.mode === 'unlimited') return Infinity;
  if (config.mode === 'total') return seat.main;
  if (config.mode === 'move') return seat.period;
  return seat.main + seat.period + Math.max(0, seat.periods - 1) * config.periodSeconds * 1000;
}

export function settleClock(room, now) {
  const clock = room.clock;
  const config = timeControl(room.timeControl);
  if (!clock) return [];
  const elapsed = Math.max(0, now - Math.max(clock.at, clock.resumeAt || 0));
  const expired = [];
  if (room.roundState === 'playing' && config.mode !== 'unlimited') for (const role of clock.active) {
    const seat = clock.seats[role];
    if (!seat) continue;
    let cost = elapsed;
    if (config.mode !== 'move') {
      const mainCost = Math.min(cost, seat.main);
      seat.main -= mainCost;
      cost -= mainCost;
    }
    if (config.mode === 'move') seat.period = Math.max(0, seat.period - cost);
    if (config.mode === 'byoyomi' && cost > 0) {
      while (seat.periods > 0 && cost >= seat.period) {
        cost -= seat.period;
        seat.periods--;
        seat.period = seat.periods ? config.periodSeconds * 1000 : 0;
      }
      seat.period = Math.max(0, seat.period - cost);
    }
    if (remaining(config, seat) <= 0) expired.push(role);
  }
  clock.at = now;
  return expired;
}

export function finishClockAction(room, action, previous, now) {
  const clock = room.clock;
  if (!clock) return;
  const config = timeControl(room.timeControl);
  const history = ['history-undo', 'history-redo'].includes(action.type);
  // Cue placement belongs to the shot. Review operations are not new turns.
  const complete = !history && action.type !== 'billiards-place-cue'
    && !previous.scoringReview && !(room.gameMode === 'chinese-checkers' && room.snapshot.jumpChain);
  const role = action.role || action.shooter || previous.turn;
  const seat = clock.seats[role];
  if (history) for (const value of Object.values(clock.seats)) {
    // A completed move normally refills a move/byo period for the next turn.
    // Going back to that move must not turn this refill into free thinking time.
    value.period = Math.min(value.period, value.historyPeriodFloor ?? value.period);
  }
  if (complete && seat) {
    seat.historyPeriodFloor = Math.min(seat.historyPeriodFloor ?? seat.period, seat.period);
    if (config.mode === 'move') seat.period = config.moveSeconds * 1000;
    if (config.mode === 'byoyomi' && !seat.main && seat.periods) seat.period = config.periodSeconds * 1000;
  }
  if (action.type === 'pie-swap') [clock.seats.red, clock.seats.blue] = [clock.seats.blue, clock.seats.red];
  clock.active = activeClockRoles(room);
  clock.at = now;
  clock.resumeAt = now + Math.max(0, Number(action.animationMs) || 0);
}

export function clockDeadline(room) {
  if (!room.clock || room.roundState !== 'playing') return Infinity;
  const config = timeControl(room.timeControl);
  return Math.max(room.clock.at, room.clock.resumeAt || 0) + Math.min(Infinity,
    ...room.clock.active.filter(role => room.clock.seats[role]).map(role => remaining(config, room.clock.seats[role])));
}

export function endRound(room, outcome) {
  if (room.roundState === 'finished' && room.outcome) return;
  room.roundState = 'finished';
  room.readyToPlay = false;
  room.readyClientIds = [];
  room.rematch = null;
  room.outcome = outcome;
  if (room.clock) room.clock.active = [];
  // Outcome is protocol metadata; retain the original board and engine result.
  room.version++;
}
