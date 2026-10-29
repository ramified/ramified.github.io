(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_tic_tac_toe = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-tic-tac-toe",
  "label": "Tic-tac-toe",
  "lattice": "square",
  "size": "3x3",
  "surface": "M_1",
  "glue": "g0:3,1..3,S=1,1..3,N; g1:3..1,3,E=3..1,1,W"
};
});
