// Save this file as ramified_minigame_presets/hex_rhombus.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Chinese Checkers"
//   ],
//   "id": "hex-rhombus",
//   "label": "hex rhombus",
//   "key": "hex_rhombus",
//   "file": "hex_rhombus.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["hex_rhombus"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "hex-rhombus",
    "label": "hex rhombus",
    "lattice": "hexagonal",
    "size": "9x9",
    "surface": "Sigma_0,1",
    "pieceSets": {
      "starts": {
        "red": [
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
            "row": 2,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          }
        ],
        "yellow": [
          {
            "row": 8,
            "col": 7
          },
          {
            "row": 8,
            "col": 8
          },
          {
            "row": 8,
            "col": 9
          },
          {
            "row": 9,
            "col": 8
          },
          {
            "row": 9,
            "col": 9
          }
        ],
        "blue": [
          {
            "row": 1,
            "col": 8
          },
          {
            "row": 1,
            "col": 9
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
            "row": 2,
            "col": 9
          }
        ],
        "green": [
          {
            "row": 8,
            "col": 1
          },
          {
            "row": 8,
            "col": 2
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
          }
        ]
      },
      "targets": {
        "red": [
          {
            "row": 8,
            "col": 7
          },
          {
            "row": 8,
            "col": 8
          },
          {
            "row": 8,
            "col": 9
          },
          {
            "row": 9,
            "col": 8
          },
          {
            "row": 9,
            "col": 9
          }
        ],
        "yellow": [
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
            "row": 2,
            "col": 1
          },
          {
            "row": 2,
            "col": 2
          }
        ],
        "blue": [
          {
            "row": 8,
            "col": 1
          },
          {
            "row": 8,
            "col": 2
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
          }
        ],
        "green": [
          {
            "row": 1,
            "col": 8
          },
          {
            "row": 1,
            "col": 9
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
            "row": 2,
            "col": 9
          }
        ]
      }
    }
  };
});