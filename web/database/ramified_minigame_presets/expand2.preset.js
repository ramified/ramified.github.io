// Save this file as ramified_minigame_presets/expand2.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "expand2",
//   "label": "expand2",
//   "key": "expand2",
//   "file": "expand2.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["expand2"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "expand2",
    "label": "expand2",
    "lattice": "square",
    "size": "7x7",
    "surface": "Sigma_0,1",
    "sokoban": {
      "targets": "1,1; 1,7; 2,2; 2,6; 4,4; 6,2; 6,6; 7,1; 7,7",
      "energyBridges": "2,2; 2,6; 3,3; 3,5; 4,4; 5,3; 5,5; 6,2; 6,6",
      "players": "7,7"
    }
  };
});