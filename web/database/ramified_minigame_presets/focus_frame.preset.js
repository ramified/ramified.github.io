// Save this file as ramified_minigame_presets/focus_frame.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Reversi"
//   ],
//   "id": "focus-frame",
//   "label": "focus frame",
//   "key": "focus_frame",
//   "file": "focus_frame.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["focus_frame"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "focus-frame",
    "label": "focus frame",
    "lattice": "square",
    "size": "10x10",
    "surface": "Sigma_3,4",
    "cuts": "2,3=3,3; 2,8=3,8; 3,2=3,3; 3,8=3,9; 8,2=8,3; 8,3=9,3; 8,8=8,9; 8,8=9,8",
    "glue": "g0:1,10..1,N=10,10..1,S; g1:10..1,10,E=10..1,1,W",
    "pieceSets": {
      "starts": {
        "black": [
          {
            "row": 5,
            "col": 5
          },
          {
            "row": 6,
            "col": 6
          }
        ],
        "white": [
          {
            "row": 5,
            "col": 6
          },
          {
            "row": 6,
            "col": 5
          }
        ]
      },
      "targets": {}
    }
  };
});