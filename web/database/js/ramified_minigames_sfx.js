(() => {
  'use strict';

  // The catalog is deliberately data-first: a future `source` field may point
  // to a decoded audio file without changing the preference format or UI.
  const VARIANTS = Object.freeze(['physical', 'clear', 'arcade']);
  const EMPTY_SOUND = 'assets/audio/empty.wav';
  const ACCEPTED_ACTION_SOUND = 'assets/audio/accepted-action.wav';
  const JUMP_SOUND = 'assets/audio/jump.wav';
  const FILE_SOURCES = Object.freeze({
  // Generic accepted action
    'shared-action': ACCEPTED_ACTION_SOUND,

  // Placement games
    'placement-place': ACCEPTED_ACTION_SOUND,

  // Chinese Checkers
    'checkers-move': ACCEPTED_ACTION_SOUND,
    'checkers-jump': EMPTY_SOUND,
    'checkers-land': JUMP_SOUND,
    'checkers-lake-hop': EMPTY_SOUND,

  // // Go
  //   'go-capture': ACCEPTED_ACTION_SOUND,

  // Reversi
    'reversi-flip': ACCEPTED_ACTION_SOUND,

  // // Tile Matching, if desired
  //   'tile-select': ACCEPTED_ACTION_SOUND,
  //   'tile-match': ACCEPTED_ACTION_SOUND,

  });
  const EVENTS = Object.freeze([
    ['shared-action', 'sfx.event.action', 'shared'], ['shared-invalid', 'sfx.event.invalid', 'shared'],
    ['shared-win', 'sfx.event.win', 'shared'], ['shared-draw', 'sfx.event.draw', 'shared'],
    ['shared-restart', 'sfx.event.restart', 'shared'], ['shared-undo', 'sfx.event.undo', 'shared'], ['shared-redo', 'sfx.event.redo', 'shared'],
    ['2048-slide', 'sfx.event.slide', '2048'], ['2048-merge', 'sfx.event.merge', '2048'], ['2048-bomb', 'sfx.event.bomb', '2048'], ['2048-gameover', 'sfx.event.gameover', '2048'],
    ['placement-place', 'sfx.event.place', 'placement'], ['go-capture', 'sfx.event.capture', 'go'], ['reversi-flip', 'sfx.event.flip', 'reversi'],
    ['chess-move', 'sfx.event.chessMove', 'fide-chess'], ['chess-capture', 'sfx.event.chessCapture', 'fide-chess'],
    ['checkers-move', 'sfx.event.checkersMove', 'chinese-checkers'], ['checkers-jump', 'sfx.event.checkersJump', 'chinese-checkers'], ['checkers-lake-hop', 'sfx.event.checkersLakeHop', 'chinese-checkers'], ['checkers-land', 'sfx.event.checkersLake', 'chinese-checkers'], ['checkers-goal', 'sfx.event.checkersGoal', 'chinese-checkers'], 
    ['tile-select', 'sfx.event.tileSelect', 'lianliankan'], ['tile-match', 'sfx.event.tileMatch', 'lianliankan'], ['tile-mismatch', 'sfx.event.tileMismatch', 'lianliankan'], ['tile-shuffle', 'sfx.event.tileShuffle', 'lianliankan'], ['tile-cleared', 'sfx.event.tileCleared', 'lianliankan'],
    ['sokoban-step', 'sfx.event.sokobanStep', 'sokoban'], ['sokoban-push', 'sfx.event.sokobanPush', 'sokoban'], ['sokoban-blocked', 'sfx.event.sokobanBlocked', 'sokoban'], ['sokoban-target', 'sfx.event.sokobanTarget', 'sokoban'], ['sokoban-solved', 'sfx.event.sokobanSolved', 'sokoban'],
    ['billiards-strike', 'sfx.event.billiardsStrike', 'billiards'], ['billiards-ball', 'sfx.event.billiardsBall', 'billiards'], ['billiards-cushion', 'sfx.event.billiardsCushion', 'billiards'], ['billiards-pocket', 'sfx.event.billiardsPocket', 'billiards'], ['billiards-foul', 'sfx.event.billiardsFoul', 'billiards']
    ].map(([id, labelKey, mode]) => Object.freeze({ id, labelKey, mode, variants: VARIANTS })));
  const EVENT_BY_ID = new Map(EVENTS.map((event) => [event.id, event]));
  const AUDITION_SEEDS = Object.freeze([
    ['marble-hop-1', 'marble', 'sfx.audition.marbleHopOne', '153421'], ['marble-hop-2', 'marble', 'sfx.audition.marbleHopTwo', '514231'], ['marble-hop-3', 'marble', 'sfx.audition.marbleHopThree', '352414'],
    ['stone-skip-1', 'stone', 'sfx.audition.stoneSkipOne', '841233'], ['stone-skip-2', 'stone', 'sfx.audition.stoneSkipTwo', '284531'], ['stone-skip-3', 'stone', 'sfx.audition.stoneSkipThree', '728154'],
    ['billiards-1', 'billiards', 'sfx.audition.billiardsOne', '451322'], ['billiards-2', 'billiards', 'sfx.audition.billiardsTwo', '162543'], ['billiards-3', 'billiards', 'sfx.audition.billiardsThree', '635214'],
    ['win-1', 'win', 'sfx.audition.winOne', '913542'], ['win-2', 'win', 'sfx.audition.winTwo', '476231'], ['win-3', 'win', 'sfx.audition.winThree', '829315']
    ].map(([id, category, labelKey, seed]) => Object.freeze({ id, category, labelKey, seed })));
  const AUDITION_BY_ID = new Map(AUDITION_SEEDS.map((item) => [item.id, item]));
  const lastPlayedAt = new Map();
  let context = null;
  let activeVoices = 0;

  function defaultVariants() {
    return Object.fromEntries(EVENTS.map((event) => [event.id, 'arcade']));
  }

  function normalizeVariants(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = defaultVariants();
    EVENTS.forEach((event) => {
      if (source[event.id] === 'soft') result[event.id] = 'physical';
      else if (VARIANTS.includes(source[event.id])) result[event.id] = source[event.id];
    });
    return result;
  }

  function normalizeSeeds(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = {};
    Object.keys(source).forEach((eventId) => {
      if (EVENT_BY_ID.has(eventId) && auditionSeedInfo(source[eventId])) result[eventId] = source[eventId];
    });
    return result;
  }

  function auditionSeedsForCategory(category) {
    return AUDITION_SEEDS.filter((item) => item.category === category);
  }

  function auditionSeedId(category, seed) {
    const normalized = String(seed == null ? '' : seed).replace(/\D/g, '').slice(0, 12);
    return ['marble', 'stone', 'billiards', 'win'].includes(category) && normalized ? `${category}:${normalized}` : '';
  }

  function auditionSeedInfo(seedId) {
    const builtIn = AUDITION_BY_ID.get(seedId);
    if (builtIn) return builtIn;
    const match = /^([a-z-]+):(\d{1,12})$/.exec(String(seedId || ''));
    if (!match || !['marble', 'stone', 'billiards', 'win'].includes(match[1])) return null;
    return { id: seedId, category: match[1], labelKey: '', seed: match[2] };
  }

  function eventsForMode(mode) {
    return EVENTS.filter((event) => event.mode === 'shared' || event.mode === mode || (event.mode === 'placement' && ['hex', 'gomoku', 'connect-four', 'go', 'reversi'].includes(mode)));
  }

  function audioContext() {
    if (context) return context;
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (typeof AudioContext !== 'function') return null;
    try { context = new AudioContext(); } catch (_) { return null; }
    return context;
  }

  function noiseBuffer(ctx, duration) {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
      return buffer;
  }

  function recipeFor(eventId, variant) {
    const physical = /billiards|sokoban|placement|chess|checkers/.test(eventId);
    const positive = /win|cleared|solved|target|goal|merge|match|pocket/.test(eventId);
    const negative = /invalid|mismatch|blocked|foul|gameover/.test(eventId);
    if (eventId === 'checkers-lake-hop') {
      if (variant === 'physical') return { waveform: 'triangle', frequency: 310, duration: 0.12, noise: true, sweep: -80 };
      if (variant === 'clear') return { waveform: 'sine', frequency: 520, duration: 0.09, noise: true, sweep: -125 };
      return { waveform: 'square', frequency: 610, duration: 0.08, noise: false, sweep: -180 };
    }
    if (variant === 'physical') return { waveform: 'sine', frequency: negative ? 175 : (positive ? 660 : (physical ? 255 : 390)), duration: positive ? 0.14 : 0.065, noise: physical || negative, sweep: negative ? -45 : -8 };
    if (variant === 'clear') return { waveform: physical ? 'triangle' : 'square', frequency: negative ? 180 : (positive ? 880 : (physical ? 330 : 510)), duration: positive ? 0.13 : 0.055, noise: physical, sweep: positive ? 110 : -15 };
    return { waveform: 'square', frequency: negative ? 150 : (positive ? 740 : 460), duration: positive ? 0.22 : 0.085, noise: false, sweep: positive ? 360 : (negative ? -75 : 55) };
  }

  function recipeForSeed(seedId) {
    const item = auditionSeedInfo(seedId);
    if (!item) return null;
    let hash = 0;
    for (const character of item.seed) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
      const variation = hash % 120;
    if (item.category === 'marble') return { waveform: 'triangle', frequency: 340 + variation, duration: 0.075 + (variation % 3) * 0.012, noise: true, sweep: -55 - (variation % 40) };
    if (item.category === 'stone') return { waveform: 'sine', frequency: 250 + variation, duration: 0.11 + (variation % 3) * 0.018, noise: true, sweep: -100 - (variation % 70) };
    if (item.category === 'billiards') return { waveform: 'square', frequency: 420 + variation, duration: 0.04 + (variation % 3) * 0.01, noise: true, sweep: -20 - (variation % 30) };
    return { waveform: 'square', frequency: 620 + variation, duration: 0.18 + (variation % 3) * 0.025, noise: false, sweep: 190 + (variation % 140) };
  }

  function playFileSound(eventId, preferences) {
    const source = FILE_SOURCES[eventId];
    if (!source) return false;

    const audio = new Audio(source);
    audio.volume = Math.max(
      0,
      Math.min(1, Number(preferences?.soundVolume ?? 1))
      );

    audio.play().catch(() => {});
    return true;
  }

  function play(eventId, preferences, options = {}) {
    if (!EVENT_BY_ID.has(eventId)) return false;
    const preview = !!options.preview;
    if (!preview && (!preferences || !preferences.soundEnabled || !(preferences.soundVolume > 0))) return false;
// Use a real audio file when one is assigned to this event.
    if (FILE_SOURCES[eventId]) {
      return playFileSound(eventId, preferences || { soundVolume: 1 });
    }
  // Existing generated Web Audio sounds continue below.

    const now = Date.now();
    const throttleMs = eventId.startsWith('billiards-') ? 70 : 28;
    if (!preview && now - (lastPlayedAt.get(eventId) || 0) < throttleMs) return false;
    if (activeVoices >= 12) return false;
    const ctx = audioContext();
    if (!ctx || typeof ctx.createOscillator !== 'function') return false;
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume().catch(() => {});
    const variant = normalizeVariants(preferences && preferences.soundVariants)[eventId];
    const savedSeed = normalizeSeeds(preferences && preferences.soundSeeds)[eventId];
    const recipe = recipeForSeed(options.seedId || savedSeed) || recipeFor(eventId, variant);
    const started = ctx.currentTime || 0;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, started);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, (preferences && preferences.soundVolume) || 1) * 0.15, started + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, started + recipe.duration);
    gain.connect(ctx.destination);
    const oscillator = ctx.createOscillator();
    oscillator.type = recipe.waveform;
    oscillator.frequency.setValueAtTime(recipe.frequency, started);
    if (recipe.sweep) oscillator.frequency.linearRampToValueAtTime(Math.max(55, recipe.frequency + recipe.sweep), started + recipe.duration);
    oscillator.connect(gain);
    activeVoices += 1;
    oscillator.onended = () => { activeVoices = Math.max(0, activeVoices - 1); };
    oscillator.start(started);
    oscillator.stop(started + recipe.duration);
    if (recipe.noise && typeof ctx.createBufferSource === 'function') {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer(ctx, recipe.duration);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.035, started);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, started + recipe.duration);
      noise.connect(noiseGain).connect(gain);
      noise.start(started); noise.stop(started + recipe.duration);
    }
    lastPlayedAt.set(eventId, now);
    return true;
  }

  globalThis.RamifiedMinigameSfx = Object.freeze({ EVENTS, VARIANTS, AUDITION_SEEDS, defaultVariants, normalizeVariants, normalizeSeeds, auditionSeedsForCategory, auditionSeedId, auditionSeedInfo, eventsForMode, play });
})();
