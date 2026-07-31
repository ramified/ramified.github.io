// Save this file as ramified_minigame_presets/wormhole.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Gomoku",
//     "Go"
//   ],
//   "id": "wormhole",
//   "label": "wormhole",
//   "key": "wormhole",
//   "file": "wormhole.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["wormhole"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "wormhole",
    "label": "wormhole",
    "lattice": "square",
    "size": "15x15",
    "surface": "Sigma_4,1^4",
    "removed": "4,4; 4,12; 12,4; 12,12",
    "glue": "g0:3,12,S=13,4,N; g1:4,13,W=12,3,E; g2:5,12,N=11,4,S; g3:4,11,E=12,5,W; g4:4,5,W=12,11,E; g5:5,4,N=11,12,S; g6:4,3,E=12,13,W; g7:3,4,S=13,12,N"
  };
});