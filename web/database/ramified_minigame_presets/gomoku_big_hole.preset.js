(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_big_hole = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-big-hole",
  "label": "big hole",
  "lattice": "square",
  "size": "15x15",
  "surface": "Sigma_1,1^1",
  "removed": "rect(6..10,6..10)",
  "glue": "g0:5,10..6,S=11,10..6,N; g1:10..6,11,W=10..6,5,E"
};
});
