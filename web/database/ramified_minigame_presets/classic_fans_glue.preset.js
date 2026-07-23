// Save this file as ramified_minigame_presets/classic_fans_glue.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "classic-fans-glue",
//   "label": "classic_fans_glue",
//   "key": "classic_fans_glue",
//   "file": "classic_fans_glue.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["classic_fans_glue"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "classic-fans-glue",
    "label": "classic_fans_glue",
    "lattice": "square",
    "size": "10x10",
    "surface": "Sigma_11.5,1^1",
    "removed": "1,1; 1,2; 1,4; 1,5; 1,6; 1,8; 1,9; 1,10; 2,1; 2,2; 2,4; 2,5; 2,6; 2,8; 2,9; 2,10; 3,1; 3,2; 4,9; 4,10; 5,1; 5,2; 5,5; 5,6; 5,9; 5,10; 6,1; 6,2; 6,5; 6,6; 6,9; 6,10; 7,1; 7,2; 8,9; 8,10; 9,1; 9,2; 9,3; 9,5; 9,6; 9,7; 9,9; 9,10; 10,1; 10,2; 10,3; 10,5; 10,6; 10,7; 10,9; 10,10",
    "cuts": "3,4=4,4; 3,5=4,5; 3,6=3,7; 3,6=4,6; 3,8=4,8; 4,3=5,3; 4,4=4,5; 4,7=5,7; 5,3=5,4; 5,7=5,8; 6,3=6,4; 6,4=7,4; 6,7=6,8; 6,8=7,8; 7,4=8,4; 7,5=8,5; 7,6=7,7; 7,6=8,6; 7,8=8,8; 8,4=8,5",
    "glue": "g1:7,4,S=8,8,N; g3:3,4,S=8,4,N; g4:7,8,S=4,8,N; g5:3,8,S=4,4,N",
    "sokoban": {
      "targets": "1,3; 1,7; 3,6; 3,10; 4,1; 4,5; 5,3; 5,7; 6,4; 6,8; 7,6; 7,10; 8,1; 8,5; 10,4; 10,8",
      "boxes": "3,3; 3,5; 3,7; 3,8; 4,3; 4,4; 4,7; 4,8; 7,3; 7,4; 7,7; 7,8; 8,3; 8,4; 8,7; 8,8",
      "players": "3,4"
    }
  };
});