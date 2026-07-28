// Save this file as ramified_minigame_presets/glue_test.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048"
//   ],
//   "id": "glue-test",
//   "label": "glue_test",
//   "key": "glue_test",
//   "file": "glue_test.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["glue_test"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "glue-test",
    "label": "glue_test",
    "lattice": "square",
    "size": "5x5",
    "surface": "Sigma_0,2",
    "glue": "g0:1,3..5,N=3..5,1,W",
    "sokoban": {
      "targets": "3,3; 4,4; 5,5",
      "energyBridges": "2,1; 3,4; 4,2",
      "players": "1,5"
    }
  };
});