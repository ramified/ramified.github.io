// Save this file as ramified_minigame_presets/loop.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "loop",
//   "label": "loop",
//   "key": "loop",
//   "file": "loop.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["loop"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "loop",
    "label": "loop",
    "lattice": "square",
    "size": "2x5",
    "surface": "Sigma_0,2",
    "glue": "g0:1..2,5,E=1..2,1,W",
    "sokoban": {
      "targets": "2,2",
      "ice": "1,1; 1,2; 1,3; 1,4; 1,5; 2,1; 2,2; 2,3; 2,4; 2,5",
      "boxes": "2,4",
      "players": "1,3"
    }
  };
});