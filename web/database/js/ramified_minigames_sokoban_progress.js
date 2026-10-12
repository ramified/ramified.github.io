(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RamifiedSokobanProgress = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  const SAVE_KEY = 'ramified.minigames.sokoban.progress.v1';

  function normalize(ids, saved) {
    const valid = new Set(ids);
    const list = value => Array.isArray(value) ? value.filter(id => valid.has(id)) : [];
    const completed = new Set(saved?.version === 1 ? list(saved.completed) : []);
    const unlocked = new Set([...ids.slice(0, 3), ...completed,
      ...(saved?.version === 1 ? list(saved.unlocked) : [])]);
    // Recover a partially written/older progress record without relocking a level.
    for (const id of ids) {
      if (unlocked.size >= Math.min(ids.length, 3 + completed.size)) break;
      unlocked.add(id);
    }
    return { version: 1, unlocked: ids.filter(id => unlocked.has(id)), completed: ids.filter(id => completed.has(id)) };
  }

  function complete(ids, saved, id) {
    const next = normalize(ids, saved);
    if (!next.unlocked.includes(id) || next.completed.includes(id)) return next;
    next.completed.push(id);
    const unlock = ids.find(candidate => !next.unlocked.includes(candidate));
    if (unlock) next.unlocked.push(unlock);
    return normalize(ids, next);
  }

  function create(ids, storage) {
    let failed = false, saved;
    try { saved = JSON.parse(storage.getItem(SAVE_KEY) || 'null'); }
    catch (_) { failed = true; }
    let progress = normalize(ids, saved);
    const persist = () => {
      try { storage.setItem(SAVE_KEY, JSON.stringify(progress)); failed = false; }
      catch (_) { failed = true; }
    };
    return {
      snapshot: () => normalize(ids, progress),
      failed: () => failed,
      complete(id) {
        const next = complete(ids, progress, id);
        const changed = next.completed.length !== progress.completed.length;
        progress = next;
        if (changed || failed) persist();
        return changed;
      }
    };
  }
  return { SAVE_KEY, normalize, complete, create };
});
