// Save this file as ramified_minigame_presets/pedestrian.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "pedestrian",
//   "label": "Pedestrian",
//   "key": "pedestrian",
//   "file": "pedestrian.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["pedestrian"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "pedestrian",
    "label": "Pedestrian",
    "lattice": "square",
    "size": "8x7",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,4; 1,5; 1,6; 1,7; 2,1; 2,2; 2,3; 2,4; 2,5; 2,6; 2,7; 3,1; 3,2; 3,4; 3,5; 3,6; 3,7; 4,1; 4,2; 4,4; 5,1; 5,2; 5,3; 5,4; 5,5; 5,6; 5,7; 6,3; 6,6; 6,7; 7,1; 7,2; 7,3; 7,4; 7,6; 7,7; 8,1; 8,2; 8,3; 8,4; 8,6; 8,7",
    "glue": "g0:1,3,S=3,3,N; g3:4,3,S=6,4,N; g5:6,2,E=6,4,W; g6:4,5,W=4,3,E; g7:4,5,S=6,5,N",
    "sokoban": {
      "targets": "1,3; 4,7; 6,1; 8,5",
      "boxes": "4,3; 4,6; 6,4; 6,5",
      "players": "4,5"
    }
  };
});