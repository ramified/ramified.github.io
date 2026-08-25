// Save this file as ramified_minigame_presets/rubiks_cube_3x3x3.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Tile Matching",
//     "Gomoku",
//     "Go"
//   ],
//   "id": "rubiks-cube-3x3x3",
//   "label": "Rubik's Cube 3*3*3",
//   "key": "rubiks_cube_3x3x3",
//   "file": "rubiks_cube_3x3x3.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["rubiks_cube_3x3x3"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "rubiks-cube-3x3x3",
    "label": "Rubik's Cube 3*3*3",
    "lattice": "square",
    "size": "9x12",
    "surface": "M_0,8",
    "removed": "1,1; 1,2; 1,3; 1,7; 1,8; 1,9; 1,10; 1,11; 1,12; 2,1; 2,2; 2,3; 2,7; 2,8; 2,9; 2,10; 2,11; 2,12; 3,1; 3,2; 3,3; 3,7; 3,8; 3,9; 3,10; 3,11; 3,12; 7,1; 7,2; 7,3; 7,7; 7,8; 7,9; 7,10; 7,11; 7,12; 8,1; 8,2; 8,3; 8,7; 8,8; 8,9; 8,10; 8,11; 8,12; 9,1; 9,2; 9,3; 9,7; 9,8; 9,9; 9,10; 9,11; 9,12",
    "glue": "g0:4..6,1,W=4..6,12,E; g1:4,3..1,N=3..1,4,W; g2:1,6..4,N=4,10..12,N; g3:3..1,6,E=4,7..9,N; g4:6,1..3,S=9..7,4,W; g5:6,7..9,S=7..9,6,E; g6:9,4..6,S=6,12..10,S",
    "lianliankan": {
      "initiallyEmpty": [
        {
          "row": 2,
          "col": 5
        },
        {
          "row": 5,
          "col": 2
        },
        {
          "row": 5,
          "col": 5
        },
        {
          "row": 5,
          "col": 8
        },
        {
          "row": 5,
          "col": 11
        },
        {
          "row": 8,
          "col": 5
        }
      ]
    }
  };
});