// Save this file as ramified_minigame_presets/queens_on_double_cover.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "FIDE Chess"
//   ],
//   "id": "queens-on-double-cover",
//   "label": "queens on double cover",
//   "key": "queens_on_double_cover",
//   "file": "queens_on_double_cover.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["queens_on_double_cover"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "queens-on-double-cover",
    "label": "queens on double cover",
    "lattice": "square",
    "size": "8x17",
    "surface": "Sigma_2,1^4",
    "removed": "rect(1..8,9)",
    "cuts": "4,5=5,5; 4,6=5,6; 4,7=5,7; 4,8=5,8; 4,14=5,14; 4,15=5,15; 4,16=5,16; 4,17=5,17",
    "glue": "g0:4,14..17,S=5,5..8,N; g1:5,17..14,N=4,8..5,S",
    "pieceSets": {
      "starts": {
        "white": [
          {
            "row": 1,
            "col": 1
          },
          {
            "row": 1,
            "col": 2
          },
          {
            "row": 1,
            "col": 3
          },
          {
            "row": 1,
            "col": 4
          },
          {
            "row": 2,
            "col": 1
          },
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
            "col": 4
          },
          {
            "row": 3,
            "col": 1
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
            "col": 4
          },
          {
            "row": 4,
            "col": 1
          },
          {
            "row": 4,
            "col": 2
          },
          {
            "row": 4,
            "col": 3
          },
          {
            "row": 4,
            "col": 4
          }
        ]
      },
      "targets": {}
    },
    "pieces": [
      {
        "row": 1,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 1,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 1,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 1,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 2,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 2,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 2,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 2,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 3,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 3,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 3,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 3,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 4,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 4,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 4,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 4,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "white"
      }
    ]
  };
});
