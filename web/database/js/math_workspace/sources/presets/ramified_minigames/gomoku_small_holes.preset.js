(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_small_holes = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-small-holes",
  "label": "small holes",
  "lattice": "square",
  "size": "15x15",
  "surface": "Sigma_9,1^9",
  "removed": "4,4; 4,8; 4,12; 8,4; 8,8; 8,12; 12,4; 12,8; 12,12",
  "glue": "g0:3,12,S=5,12,N; g1:4,13,W=4,11,E; g2:3,8,S=5,8,N; g3:4,9,W=4,7,E; g4:4,5,W=4,3,E; g5:3,4,S=5,4,N; g6:7,4,S=9,4,N; g7:8,3,E=8,5,W; g8:8,9,W=8,7,E; g9:7,8,S=9,8,N; g10:8,11,E=8,13,W; g11:7,12,S=9,12,N; g12:11,12,S=13,12,N; g13:12,11,E=12,13,W; g14:11,8,S=13,8,N; g15:12,9,W=12,7,E; g16:11,4,S=13,4,N; g17:12,3,E=12,5,W"
};
});
