// Save this file as ramified_minigame_presets/small_classic.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Chinese Checkers"
//   ],
//   "id": "small-classic",
//   "label": "small classic",
//   "labelZh": "小型经典",
//   "key": "small_classic",
//   "file": "small_classic.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["small_classic"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "small-classic",
    "label": "small classic",
    "labelZh": "小型经典",
    "lattice": "hexagonal",
    "size": "13x10",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,3; 1,4; 1,5; 1,7; 1,8; 1,9; 1,10; 2,1; 2,2; 2,3; 2,4; 2,7; 2,8; 2,9; 2,10; 3,1; 3,2; 3,3; 3,4; 3,8; 3,9; 3,10; 5,1; 6,1; 6,10; 7,1; 7,2; 7,10; 8,1; 8,10; 9,1; 11,1; 11,2; 11,3; 11,4; 11,8; 11,9; 11,10; 12,1; 12,2; 12,3; 12,4; 12,7; 12,8; 12,9; 12,10; 13,1; 13,2; 13,3; 13,4; 13,5; 13,7; 13,8; 13,9; 13,10",
    "pieceSets": {
      "starts": {
        "black": [
          {
            "row": 4,
            "col": 8
          },
          {
            "row": 4,
            "col": 9
          },
          {
            "row": 4,
            "col": 10
          },
          {
            "row": 5,
            "col": 9
          },
          {
            "row": 5,
            "col": 10
          },
          {
            "row": 6,
            "col": 9
          }
        ],
        "white": [
          {
            "row": 8,
            "col": 2
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
          }
        ],
        "red": [
          {
            "row": 1,
            "col": 6
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
          }
        ],
        "yellow": [
          {
            "row": 11,
            "col": 5
          },
          {
            "row": 11,
            "col": 6
          },
          {
            "row": 11,
            "col": 7
          },
          {
            "row": 12,
            "col": 5
          },
          {
            "row": 12,
            "col": 6
          },
          {
            "row": 13,
            "col": 6
          }
        ],
        "blue": [
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
            "row": 5,
            "col": 2
          },
          {
            "row": 5,
            "col": 3
          },
          {
            "row": 6,
            "col": 2
          }
        ],
        "green": [
          {
            "row": 8,
            "col": 9
          },
          {
            "row": 9,
            "col": 9
          },
          {
            "row": 9,
            "col": 10
          },
          {
            "row": 10,
            "col": 8
          },
          {
            "row": 10,
            "col": 9
          },
          {
            "row": 10,
            "col": 10
          }
        ]
      },
      "targets": {}
    },
    "pieces": [
      {
        "row": 4,
        "col": 1,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 4,
        "col": 2,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 4,
        "col": 3,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 5,
        "col": 3,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 5,
        "col": 2,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 6,
        "col": 2,
        "role": "start",
        "color": "blue"
      },
      {
        "row": 1,
        "col": 6,
        "role": "start",
        "color": "red"
      },
      {
        "row": 2,
        "col": 5,
        "role": "start",
        "color": "red"
      },
      {
        "row": 3,
        "col": 5,
        "role": "start",
        "color": "red"
      },
      {
        "row": 3,
        "col": 6,
        "role": "start",
        "color": "red"
      },
      {
        "row": 2,
        "col": 6,
        "role": "start",
        "color": "red"
      },
      {
        "row": 3,
        "col": 7,
        "role": "start",
        "color": "red"
      },
      {
        "row": 4,
        "col": 8,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 4,
        "col": 9,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 4,
        "col": 10,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 5,
        "col": 10,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 5,
        "col": 9,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 6,
        "col": 9,
        "role": "start",
        "color": "black",
        "side": "black"
      },
      {
        "row": 8,
        "col": 9,
        "role": "start",
        "color": "green"
      },
      {
        "row": 9,
        "col": 9,
        "role": "start",
        "color": "green"
      },
      {
        "row": 10,
        "col": 8,
        "role": "start",
        "color": "green"
      },
      {
        "row": 10,
        "col": 9,
        "role": "start",
        "color": "green"
      },
      {
        "row": 9,
        "col": 10,
        "role": "start",
        "color": "green"
      },
      {
        "row": 10,
        "col": 10,
        "role": "start",
        "color": "green"
      },
      {
        "row": 11,
        "col": 5,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 11,
        "col": 6,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 11,
        "col": 7,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 12,
        "col": 6,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 12,
        "col": 5,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 13,
        "col": 6,
        "role": "start",
        "color": "yellow"
      },
      {
        "row": 8,
        "col": 2,
        "role": "start",
        "color": "white",
        "side": "white"
      },
      {
        "row": 9,
        "col": 3,
        "role": "start",
        "color": "white",
        "side": "white"
      },
      {
        "row": 10,
        "col": 3,
        "role": "start",
        "color": "white",
        "side": "white"
      },
      {
        "row": 10,
        "col": 2,
        "role": "start",
        "color": "white",
        "side": "white"
      },
      {
        "row": 9,
        "col": 2,
        "role": "start",
        "color": "white",
        "side": "white"
      },
      {
        "row": 10,
        "col": 1,
        "role": "start",
        "color": "white",
        "side": "white"
      }
    ]
  };
});