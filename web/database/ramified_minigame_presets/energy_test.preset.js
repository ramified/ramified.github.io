// Save this file as ramified_minigame_presets/energy_test.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "energy-test",
//   "label": "energy_test",
//   "key": "energy_test",
//   "file": "energy_test.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["energy_test"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "energy-test",
    "label": "energy_test",
    "lattice": "square",
    "size": "4x6",
    "surface": "Sigma_0,1",
    "removed": "3,1; 3,2; 3,5; 3,6; 4,1; 4,2; 4,5; 4,6",
    "sokoban": {
      "targets": "1,2; 4,4",
      "energyBridges": "2,2; 4,3",
      "players": "2,1"
    }
  };
});