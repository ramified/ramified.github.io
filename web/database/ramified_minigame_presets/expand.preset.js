// Save this file as ramified_minigame_presets/expand.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "expand",
//   "label": "expand",
//   "key": "expand",
//   "file": "expand.preset.js"
// };
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["expand"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "expand",
    "label": "expand",
    "lattice": "square",
    "size": "7x7",
    "surface": "Sigma_0,1",
    "sokoban": {
      "targets": "1,1; 1,7; 4,4; 7,1; 7,7",
      "energyBridges": "3,3; 3,5; 4,4; 5,3; 5,5",
      "players": "6,6"
    }
  };
});