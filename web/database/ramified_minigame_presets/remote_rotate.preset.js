// Save this file as ramified_minigame_presets/remote_rotate.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "remote-rotate",
//   "label": "remote rotate",
//   "key": "remote_rotate",
//   "file": "remote_rotate.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["remote_rotate"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "remote-rotate",
    "label": "remote rotate",
    "lattice": "square",
    "size": "10x10",
    "surface": "Sigma_1,1",
    "glue": "g1:10,9..10,S=1,8..9,N; g2:8..9,1,W=9..10,10,E",
    "sokoban": {
      "sea": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 1,7; 1,10; 2,1; 2,2; 2,5; 2,6; 2,7; 2,10; 3,1; 3,2; 3,3; 3,5; 3,7; 3,10; 4,1; 4,4; 4,7; 4,10; 5,1; 5,3; 5,5; 5,6; 5,7; 5,10; 6,1; 6,2; 6,3; 6,6; 6,7; 6,10; 7,1; 7,2; 7,3; 7,4; 7,5; 7,6; 7,7; 7,10; 10,1; 10,2; 10,3; 10,4; 10,5; 10,6; 10,7",
      "targets": "2,3; 3,6; 5,2; 6,5; 9,9",
      "energyBridges": "3,4; 4,3; 4,5; 5,4; 8,8",
      "players": "10,10"
    }
  };
});