// Save this file as ramified_minigame_presets/between_two_fires.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "FIDE Chess"
//   ],
//   "id": "between-two-fires",
//   "label": "between two fires",
//   "key": "between_two_fires",
//   "file": "between_two_fires.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["between_two_fires"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "between-two-fires",
    "label": "between two fires",
    "lattice": "square",
    "size": "10x8",
    "surface": "M_1",
    "glue": "g0:1,1..8,N=10,1..8,S; g1:10..1,1,W=10..1,8,E",
    "pieceSets": {
      "starts": {
        "black": [
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
            "row": 1,
            "col": 5
          },
          {
            "row": 1,
            "col": 6
          },
          {
            "row": 1,
            "col": 7
          },
          {
            "row": 1,
            "col": 8
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
            "row": 2,
            "col": 5
          },
          {
            "row": 2,
            "col": 6
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
            "row": 3,
            "col": 5
          },
          {
            "row": 3,
            "col": 6
          },
          {
            "row": 3,
            "col": 7
          },
          {
            "row": 3,
            "col": 8
          }
        ],
        "white": [
          {
            "row": 8,
            "col": 1
          },
          {
            "row": 8,
            "col": 2
          },
          {
            "row": 8,
            "col": 3
          },
          {
            "row": 8,
            "col": 4
          },
          {
            "row": 8,
            "col": 5
          },
          {
            "row": 8,
            "col": 6
          },
          {
            "row": 8,
            "col": 7
          },
          {
            "row": 8,
            "col": 8
          },
          {
            "row": 9,
            "col": 1
          },
          {
            "row": 9,
            "col": 2
          },
          {
            "row": 9,
            "col": 3
          },
          {
            "row": 9,
            "col": 4
          },
          {
            "row": 9,
            "col": 5
          },
          {
            "row": 9,
            "col": 6
          },
          {
            "row": 9,
            "col": 7
          },
          {
            "row": 9,
            "col": 8
          },
          {
            "row": 10,
            "col": 1
          },
          {
            "row": 10,
            "col": 2
          },
          {
            "row": 10,
            "col": 3
          },
          {
            "row": 10,
            "col": 4
          },
          {
            "row": 10,
            "col": 5
          },
          {
            "row": 10,
            "col": 6
          },
          {
            "row": 10,
            "col": 7
          },
          {
            "row": 10,
            "col": 8
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
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 2,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 3,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 4,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 5,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 6,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 7,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 1,
        "col": 8,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 8,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 7,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 6,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 5,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 4,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 2,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 1,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 3,
        "col": 3,
        "role": "start",
        "color": "black",
        "kind": "pawn",
        "value": "P",
        "side": "black"
      },
      {
        "row": 8,
        "col": 8,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 7,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 6,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 5,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 8,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 8,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 7,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 6,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 5,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 10,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "pawn",
        "value": "P",
        "side": "white"
      },
      {
        "row": 9,
        "col": 1,
        "role": "start",
        "color": "white",
        "kind": "rook",
        "value": "R",
        "side": "white"
      },
      {
        "row": 9,
        "col": 8,
        "role": "start",
        "color": "white",
        "kind": "rook",
        "value": "R",
        "side": "white"
      },
      {
        "row": 2,
        "col": 8,
        "role": "start",
        "color": "black",
        "kind": "rook",
        "value": "R",
        "side": "black"
      },
      {
        "row": 2,
        "col": 1,
        "role": "start",
        "color": "black",
        "kind": "rook",
        "value": "R",
        "side": "black"
      },
      {
        "row": 9,
        "col": 7,
        "role": "start",
        "color": "white",
        "kind": "knight",
        "value": "N",
        "side": "white"
      },
      {
        "row": 9,
        "col": 2,
        "role": "start",
        "color": "white",
        "kind": "knight",
        "value": "N",
        "side": "white"
      },
      {
        "row": 2,
        "col": 2,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 2,
        "col": 7,
        "role": "start",
        "color": "black",
        "kind": "knight",
        "value": "N",
        "side": "black"
      },
      {
        "row": 2,
        "col": 3,
        "role": "start",
        "color": "black",
        "kind": "bishop",
        "value": "B",
        "side": "black"
      },
      {
        "row": 2,
        "col": 6,
        "role": "start",
        "color": "black",
        "kind": "bishop",
        "value": "B",
        "side": "black"
      },
      {
        "row": 9,
        "col": 3,
        "role": "start",
        "color": "white",
        "kind": "bishop",
        "value": "B",
        "side": "white"
      },
      {
        "row": 9,
        "col": 6,
        "role": "start",
        "color": "white",
        "kind": "bishop",
        "value": "B",
        "side": "white"
      },
      {
        "row": 9,
        "col": 4,
        "role": "start",
        "color": "white",
        "kind": "king",
        "value": "K",
        "style": "vector-c",
        "side": "white"
      },
      {
        "row": 2,
        "col": 4,
        "role": "start",
        "color": "black",
        "kind": "queen",
        "value": "Q",
        "style": "vector-c",
        "side": "black"
      },
      {
        "row": 2,
        "col": 5,
        "role": "start",
        "color": "black",
        "kind": "king",
        "value": "K",
        "style": "vector-c",
        "side": "black"
      },
      {
        "row": 9,
        "col": 5,
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