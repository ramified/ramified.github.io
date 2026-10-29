(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_strange_corner = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-strange-corner",
  "label": "strange corner",
  "lattice": "square",
  "size": "15x15",
  "surface": "Sigma_0,1^4",
  "glue": "g0:1,15..13,N=1..3,15,E; g1:13..15,1,W=15,3..1,S; g2:15,15..14,S=15..14,15,E; g3:2..1,1,W=1,2..1,N"
};
});
