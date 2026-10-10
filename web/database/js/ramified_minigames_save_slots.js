(function(root, factory) {
  const api = factory(typeof module !== 'undefined' && module.exports
    ? require('./ramified_minigames_sokoban_progress.js') : root.RamifiedSokobanProgress);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RamifiedSaveSlots = api;
})(typeof window !== 'undefined' ? window : null, function(progress) {
  'use strict';
  const SAVE_KEY = 'ramified.minigames.player.slots.v1';
  const LEGACY_SAVE_KEY = 'ramified.minigames.player.save.v1';
  const SLOT_COUNT = 3;
  const copy = value => JSON.parse(JSON.stringify(value));
  const validGame = value => value?.version === 1 && value.payload && typeof value.payload === 'object'
    && !Array.isArray(value.payload) && typeof value.payload.gameMode === 'string';

  function create(ids, storage) {
    const emptySlot = () => ({ game: null, sokoban: progress.normalize(ids, null) });
    let state = { version: 1, slots: Array(SLOT_COUNT).fill(null) };
    let error = '', blocked = false, lastWritten = null;
    const slotIndex = index => Number.isInteger(index) && index >= 0 && index < SLOT_COUNT;
    function write(next, strict = false) {
      const text = JSON.stringify(next);
      if (text === lastWritten) { state = next; return true; }
      if (!blocked) {
        try {
          storage.setItem(SAVE_KEY, text);
          lastWritten = text; state = next; error = '';
          return true;
        } catch (_) { error = 'write'; }
      }
      // Autosave remains usable in this tab; destructive actions require a successful write.
      if (!strict) state = next;
      return false;
    }
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== null) {
        const loaded = JSON.parse(raw);
        if (loaded?.version !== 1 || !Array.isArray(loaded.slots) || loaded.slots.length !== SLOT_COUNT
          || !loaded.slots.every(slot => slot === null || (slot && typeof slot === 'object'
            && (slot.game === null || validGame(slot.game)) && slot.sokoban?.version === 1))) throw Error('Invalid slots');
        state = { version: 1, slots: loaded.slots.map(slot => slot && ({ game: slot.game, sokoban: progress.normalize(ids, slot.sokoban) })) };
        lastWritten = raw;
      } else {
        // Copy old data once; leave the original keys intact as a recovery backup.
        let game = null, oldProgress = null;
        try { game = JSON.parse(storage.getItem(LEGACY_SAVE_KEY) || 'null'); } catch (_) { error = 'legacy'; }
        try { oldProgress = JSON.parse(storage.getItem(progress.SAVE_KEY) || 'null'); } catch (_) { error = 'legacy'; }
        if (validGame(game) || oldProgress?.version === 1) {
          state.slots[0] = { game: validGame(game) ? game : null, sokoban: progress.normalize(ids, oldProgress) };
          write(state);
        }
      }
    } catch (_) {
      // Never overwrite unreadable or newer-format data with an empty collection.
      blocked = true; error = 'read';
    }
    return {
      hasAny: () => state.slots.some(Boolean),
      slots: () => copy(state.slots),
      slot: index => slotIndex(index) ? copy(state.slots[index]) : null,
      progress: index => progress.normalize(ids, slotIndex(index) ? state.slots[index]?.sokoban : null),
      error: () => error,
      save(index, game, completedId = null) {
        if (!slotIndex(index) || !validGame(game)) return false;
        const next = copy(state), slot = next.slots[index] || emptySlot();
        slot.game = copy(game);
        if (completedId) slot.sokoban = progress.complete(ids, slot.sokoban, completedId);
        next.slots[index] = slot;
        return write(next);
      },
      clear(index, restart = false) {
        if (!slotIndex(index)) return false;
        const next = copy(state);
        next.slots[index] = restart ? emptySlot() : null;
        return write(next, true);
      }
    };
  }
  return { SAVE_KEY, LEGACY_SAVE_KEY, SLOT_COUNT, create };
});
