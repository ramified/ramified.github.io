// Save this file as ramified_minigame_presets/ice_test.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "ice-test",
//   "label": "ice_test",
//   "key": "ice_test",
//   "file": "ice_test.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["ice_test"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "ice-test",
    "label": "ice_test",
    "lattice": "square",
    "size": "6x6",
    "surface": "Sigma_0,1",
    "sokoban": {
      "targets": "3,3; 3,4; 4,3; 4,4",
      "ice": "3,3; 3,4; 4,3; 4,4",
      "boxes": "2,4; 3,2; 4,5; 5,3",
      "players": "3,3"
    }
  };
});