// Save this file as ramified_minigame_presets/tunnels.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Gomoku",
//     "Connect Four",
//     "Go"
//   ],
//   "id": "tunnels",
//   "label": "tunnels",
//   "key": "tunnels",
//   "file": "tunnels.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["tunnels"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "tunnels",
    "label": "tunnels",
    "lattice": "square",
    "size": "19x19",
    "surface": "Sigma_4,8",
    "removed": "1,1; 1,8; 1,14; 1,19; 2,1; 2,8; 2,14; 2,19; 3,1; 3,8; 3,14; 3,19; 4,1; 4,8; 4,14; 4,19; 6,1; 6,8; 6,14; 6,19; 7,1; 7,8; 7,14; 7,19; 8,1; 8,8; 8,14; 8,19; 9,1; 9,8; 9,14; 9,19; 10,1; 10,8; 10,14; 10,19; 12,1; 12,8; 12,14; 12,19; 13,1; 13,8; 13,14; 13,19; 14,1; 14,8; 14,14; 14,19; 15,1; 15,8; 15,14; 15,19; 16,1; 16,8; 16,14; 17,1; 17,8; 17,14; 18,1; 18,8; 18,14; 19,1; 19,8; 19,14",
    "glue": "g0:12..15,18,E=12..15,15,W; g1:16..19,19,E=16..19,15,W; g2:1..4,18,E=1..4,15,W; g3:1..4,13,E=1..4,9,W; g4:1..4,7,E=1..4,2,W; g5:6..10,18,E=6..10,15,W; g6:6..10,13,E=6..10,9,W; g7:6..10,7,E=6..10,2,W; g8:19,19..15,S=1,13..9,N; g9:19,13..9,S=1,6..2,N; g10:12..19,13,E=12..19,9,W; g11:12..19,7,E=12..19,2,W; g12:5,19,E=5,1,W; g13:11,19,E=11,1,W",
    "holes": "1,7; 1,15; 1,16; 1,17; 1,18; 5,1; 5,8; 5,14; 5,19; 11,1; 11,8; 11,14; 11,19; 16,19"
  };
});