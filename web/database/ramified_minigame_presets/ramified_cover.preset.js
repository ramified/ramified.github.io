// Save this file as ramified_minigame_presets/ramified_cover.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Tile Matching"
//   ],
//   "id": "ramified-cover",
//   "label": "ramified cover",
//   "key": "ramified_cover",
//   "file": "ramified_cover.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["ramified_cover"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "ramified-cover",
    "label": "ramified cover",
    "lattice": "square",
    "size": "4x9",
    "surface": "Sigma_1,1^2",
    "removed": "rect(1..4,5)",
    "cuts": "2,3=3,3; 2,4=3,4; 2,8=3,8; 2,9=3,9",
    "glue": "g0:2,8..9,S=3,3..4,N; g1:2,3..4,S=3,8..9,N",
    "lianliankan": {
      "initiallyEmpty": [
        {
          "row": 2,
          "col": 2
        },
        {
          "row": 2,
          "col": 3
        },
        {
          "row": 2,
          "col": 7
        },
        {
          "row": 2,
          "col": 8
        },
        {
          "row": 3,
          "col": 2
        },
        {
          "row": 3,
          "col": 3
        },
        {
          "row": 3,
          "col": 7
        },
        {
          "row": 3,
          "col": 8
        }
      ]
    }
  };
});