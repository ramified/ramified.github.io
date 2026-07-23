// Save this file as ramified_minigame_presets/cross.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "cross",
//   "label": "cross",
//   "key": "cross",
//   "file": "cross.preset.js"
// };
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["cross"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "cross",
    "label": "cross",
    "lattice": "square",
    "size": "4x4",
    "surface": "M_1",
    "glue": "g0:1..4,4,E=1..4,1,W; g1:1,1..4,N=4,1..4,S",
    "sokoban": {
      "targets": "3,2",
      "energyBridges": "2,3",
      "players": "4,1"
    }
  };
});