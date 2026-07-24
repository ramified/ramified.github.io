// Save this file as ramified_minigame_presets/bridges_blocking.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "bridges-blocking",
//   "label": "bridges_blocking",
//   "key": "bridges_blocking",
//   "file": "bridges_blocking.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["bridges_blocking"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "bridges-blocking",
    "label": "bridges_blocking",
    "lattice": "square",
    "size": "7x7",
    "surface": "Sigma_0,1",
    "sokoban": {
      "targets": "1,1; 1,4; 1,7; 4,1; 4,7; 7,1; 7,4; 7,7",
      "energyBridges": "2,4; 3,3; 3,5; 4,2; 4,6; 5,3; 5,5; 6,4",
      "players": "6,6"
    }
  };
});