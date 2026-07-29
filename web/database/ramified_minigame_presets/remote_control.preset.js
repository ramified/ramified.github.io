// Save this file as ramified_minigame_presets/remote_control.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "remote-control",
//   "label": "remote control",
//   "key": "remote_control",
//   "file": "remote_control.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["remote_control"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "remote-control",
    "label": "remote control",
    "lattice": "square",
    "size": "13x13",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 1,7; 1,8; 1,9; 1,10; 1,13; 2,13; 3,13; 4,1; 4,13; 5,1; 5,13; 6,1; 6,13; 7,1; 7,13; 8,1; 8,13; 9,1; 9,13; 10,1; 10,13; 11,1; 12,1; 13,1; 13,4; 13,5; 13,6; 13,7; 13,8; 13,9; 13,10; 13,11; 13,12; 13,13",
    "sokoban": {
      "sea": "4,4; 4,5; 4,6; 4,7; 4,8; 4,9; 4,10; 5,4; 5,5; 5,9; 5,10; 6,4; 6,7; 6,10; 7,4; 7,6; 7,8; 7,10; 8,4; 8,6; 8,7; 8,10; 9,4; 9,5; 9,9; 9,10; 10,4; 10,5; 10,6; 10,7; 10,8; 10,9; 10,10",
      "targets": "7,7; 8,2; 8,5",
      "energyBridges": "7,7; 9,6; 12,6",
      "players": "11,5"
    }
  };
});