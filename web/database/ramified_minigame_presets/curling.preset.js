// Save this file as ramified_minigame_presets/curling.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "curling",
//   "label": "curling",
//   "key": "curling",
//   "file": "curling.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["curling"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "curling",
    "label": "curling",
    "lattice": "square",
    "size": "6x10",
    "surface": "Sigma_0,2",
    "removed": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 1,7; 2,1; 2,2; 2,3; 2,4; 2,5; 2,6; 2,7; 6,1",
    "glue": "g0:3,2..7,N=6,2..7,S",
    "sokoban": {
      "targets": "4,3; 4,5; 4,7; 6,2",
      "ice": "3,2; 3,3; 3,4; 3,5; 3,6; 3,7; 4,2; 4,3; 4,4; 4,5; 4,6; 4,7; 5,2; 5,3; 5,4; 5,5; 5,6; 5,7",
      "energyBridges": "2,9",
      "boxes": "3,9; 4,9; 5,9",
      "players": "2,10"
    }
  };
});