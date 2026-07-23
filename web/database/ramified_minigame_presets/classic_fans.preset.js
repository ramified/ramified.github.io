// Save this file as ramified_minigame_presets/classic_fans.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "classic-fans",
//   "label": "classic_fans",
//   "key": "classic_fans",
//   "file": "classic_fans.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["classic_fans"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "classic-fans",
    "label": "classic_fans",
    "lattice": "square",
    "size": "6x6",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,4; 1,5; 1,6; 2,1; 2,2; 2,4; 2,5; 2,6; 3,1; 3,2; 4,5; 4,6; 5,1; 5,2; 5,3; 5,5; 5,6; 6,1; 6,2; 6,3; 6,5; 6,6",
    "sokoban": {
      "targets": "1,3; 3,6; 4,1; 6,4",
      "boxes": "3,3; 3,5; 4,3; 4,4",
      "players": "3,4"
    }
  };
});