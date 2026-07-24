// Save this file as ramified_minigame_presets/expand3.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "expand3",
//   "label": "expand3",
//   "key": "expand3",
//   "file": "expand3.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["expand3"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "expand3",
    "label": "expand3",
    "lattice": "hexagonal",
    "size": "7x7",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,7; 2,1; 2,7; 3,1; 5,1; 6,1; 6,7; 7,1; 7,2; 7,7",
    "sokoban": {
      "targets": "1,3; 1,6; 4,1; 4,7; 7,3; 7,6",
      "energyBridges": "3,4; 3,5; 4,3; 4,5; 5,4; 5,5",
      "players": "4,4"
    }
  };
});