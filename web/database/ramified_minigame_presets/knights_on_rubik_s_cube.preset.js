// Save this file as ramified_minigame_presets/knights_on_rubik_s_cube.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "FIDE Chess"
//   ],
//   "id": "knights-on-rubik-s-cube",
//   "label": "knights on Rubik's Cube",
//   "key": "knights_on_rubik_s_cube",
//   "file": "knights_on_rubik_s_cube.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["knights_on_rubik_s_cube"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "knights-on-rubik-s-cube",
    "label": "knights on Rubik's Cube",
    "lattice": "square",
    "size": "6x8",
    "surface": "M_0,8",
    "removed": "1,1; 1,2; 1,5; 1,6; 1,7; 1,8; 2,1; 2,2; 2,5; 2,6; 2,7; 2,8; 5,1; 5,2; 5,5; 5,6; 5,7; 5,8; 6,1; 6,2; 6,5; 6,6; 6,7; 6,8",
    "glue": "g6:3..4,1,W=3..4,8,E; g9:3,2..1,N=2..1,3,W; g10:2..1,4,E=3,5..6,N; g12:4,5..6,S=5..6,4,E; g13:1,4..3,N=3,7..8,N; g14:4,8..7,S=6,3..4,S; g15:5..6,3,W=4,2..1,S",
    "pieceSets": {
      "starts": {
        "black": [
          {
            "row": 1,
            "col": 3
          },
          {
            "row": 2,
            "col": 4
          },
          {
            "row": 3,
            "col": 2
          },
          {
            "row": 3,
            "col": 6
          },
          {
            "row": 4,
            "col": 1
          },
          {
            "row": 4,
            "col": 5
          },
          {
            "row": 5,
            "col": 3
          },
          {
            "row": 6,
            "col": 4
          }
        ]
      },
      "targets": {}
    },
    "pieces": [
      {
        "row": 1,
        "col": 3,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 2,
        "col": 4,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 5,
        "col": 3,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 6,
        "col": 4,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 3,
        "col": 2,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 4,
        "col": 1,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 4,
        "col": 5,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 3,
        "col": 6,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      }
    ]
  };
});