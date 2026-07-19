// Save this file as ramified_minigame_presets/classic_chinese_checkers.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Chinese Checkers"
//   ],
//   "id": "classic-chinese-checkers",
//   "label": "classic chinese checkers",
//   "key": "classic_chinese_checkers",
//   "file": "classic_chinese_checkers.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["classic_chinese_checkers"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "classic-chinese-checkers",
    "label": "classic chinese checkers",
    "lattice": "hexagonal",
    "size": "17x13",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 1,8; 1,9; 1,10; 1,11; 1,12; 1,13; 2,1; 2,2; 2,3; 2,4; 2,5; 2,8; 2,9; 2,10; 2,11; 2,12; 2,13; 3,1; 3,2; 3,3; 3,4; 3,5; 3,9; 3,10; 3,11; 3,12; 3,13; 4,1; 4,2; 4,3; 4,4; 4,9; 4,10; 4,11; 4,12; 4,13; 6,13; 7,1; 7,13; 8,1; 8,12; 8,13; 9,1; 9,2; 9,12; 9,13; 10,1; 10,12; 10,13; 11,1; 11,13; 12,13; 14,1; 14,2; 14,3; 14,4; 14,9; 14,10; 14,11; 14,12; 14,13; 15,1; 15,2; 15,3; 15,4; 15,5; 15,9; 15,10; 15,11; 15,12; 15,13; 16,1; 16,2; 16,3; 16,4; 16,5; 16,8; 16,9; 16,10; 16,11; 16,12; 16,13; 17,1; 17,2; 17,3; 17,4; 17,5; 17,6; 17,8; 17,9; 17,10; 17,11; 17,12; 17,13",
    "pieceSets": {
      "starts": {
        "black": [
          {
            "row": 5,
            "col": 10
          },
          {
            "row": 5,
            "col": 11
          },
          {
            "row": 5,
            "col": 12
          },
          {
            "row": 5,
            "col": 13
          },
          {
            "row": 6,
            "col": 10
          },
          {
            "row": 6,
            "col": 11
          },
          {
            "row": 6,
            "col": 12
          },
          {
            "row": 7,
            "col": 11
          },
          {
            "row": 7,
            "col": 12
          },
          {
            "row": 8,
            "col": 11
          }
        ],
        "white": [
          {
            "row": 10,
            "col": 2
          },
          {
            "row": 11,
            "col": 2
          },
          {
            "row": 11,
            "col": 3
          },
          {
            "row": 12,
            "col": 1
          },
          {
            "row": 12,
            "col": 2
          },
          {
            "row": 12,
            "col": 3
          },
          {
            "row": 13,
            "col": 1
          },
          {
            "row": 13,
            "col": 2
          },
          {
            "row": 13,
            "col": 3
          },
          {
            "row": 13,
            "col": 4
          }
        ],
        "red": [
          {
            "row": 1,
            "col": 7
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
          },
          {
            "row": 4,
            "col": 5
          },
          {
            "row": 4,
            "col": 6
          },
          {
            "row": 4,
            "col": 7
          },
          {
            "row": 4,
            "col": 8
          }
        ],
        "yellow": [
          {
            "row": 14,
            "col": 5
          },
          {
            "row": 14,
            "col": 6
          },
          {
            "row": 14,
            "col": 7
          },
          {
            "row": 14,
            "col": 8
          },
          {
            "row": 15,
            "col": 6
          },
          {
            "row": 15,
            "col": 7
          },
          {
            "row": 15,
            "col": 8
          },
          {
            "row": 16,
            "col": 6
          },
          {
            "row": 16,
            "col": 7
          },
          {
            "row": 17,
            "col": 7
          }
        ],
        "blue": [
          {
            "row": 5,
            "col": 1
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
            "row": 5,
            "col": 4
          },
          {
            "row": 6,
            "col": 1
          },
          {
            "row": 6,
            "col": 2
          },
          {
            "row": 6,
            "col": 3
          },
          {
            "row": 7,
            "col": 2
          },
          {
            "row": 7,
            "col": 3
          },
          {
            "row": 8,
            "col": 2
          }
        ],
        "green": [
          {
            "row": 10,
            "col": 11
          },
          {
            "row": 11,
            "col": 11
          },
          {
            "row": 11,
            "col": 12
          },
          {
            "row": 12,
            "col": 10
          },
          {
            "row": 12,
            "col": 11
          },
          {
            "row": 12,
            "col": 12
          },
          {
            "row": 13,
            "col": 10
          },
          {
            "row": 13,
            "col": 11
          },
          {
            "row": 13,
            "col": 12
          },
          {
            "row": 13,
            "col": 13
          }
        ]
      },
      "targets": {
        "black": [
          {
            "row": 10,
            "col": 2
          },
          {
            "row": 11,
            "col": 2
          },
          {
            "row": 11,
            "col": 3
          },
          {
            "row": 12,
            "col": 1
          },
          {
            "row": 12,
            "col": 2
          },
          {
            "row": 12,
            "col": 3
          },
          {
            "row": 13,
            "col": 1
          },
          {
            "row": 13,
            "col": 2
          },
          {
            "row": 13,
            "col": 3
          },
          {
            "row": 13,
            "col": 4
          }
        ],
        "white": [
          {
            "row": 5,
            "col": 10
          },
          {
            "row": 5,
            "col": 11
          },
          {
            "row": 5,
            "col": 12
          },
          {
            "row": 5,
            "col": 13
          },
          {
            "row": 6,
            "col": 10
          },
          {
            "row": 6,
            "col": 11
          },
          {
            "row": 6,
            "col": 12
          },
          {
            "row": 7,
            "col": 11
          },
          {
            "row": 7,
            "col": 12
          },
          {
            "row": 8,
            "col": 11
          }
        ],
        "red": [
          {
            "row": 14,
            "col": 5
          },
          {
            "row": 14,
            "col": 6
          },
          {
            "row": 14,
            "col": 7
          },
          {
            "row": 14,
            "col": 8
          },
          {
            "row": 15,
            "col": 6
          },
          {
            "row": 15,
            "col": 7
          },
          {
            "row": 15,
            "col": 8
          },
          {
            "row": 16,
            "col": 6
          },
          {
            "row": 16,
            "col": 7
          },
          {
            "row": 17,
            "col": 7
          }
        ],
        "yellow": [
          {
            "row": 1,
            "col": 7
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
          },
          {
            "row": 4,
            "col": 5
          },
          {
            "row": 4,
            "col": 6
          },
          {
            "row": 4,
            "col": 7
          },
          {
            "row": 4,
            "col": 8
          }
        ],
        "blue": [
          {
            "row": 10,
            "col": 11
          },
          {
            "row": 11,
            "col": 11
          },
          {
            "row": 11,
            "col": 12
          },
          {
            "row": 12,
            "col": 10
          },
          {
            "row": 12,
            "col": 11
          },
          {
            "row": 12,
            "col": 12
          },
          {
            "row": 13,
            "col": 10
          },
          {
            "row": 13,
            "col": 11
          },
          {
            "row": 13,
            "col": 12
          },
          {
            "row": 13,
            "col": 13
          }
        ],
        "green": [
          {
            "row": 5,
            "col": 1
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
            "row": 5,
            "col": 4
          },
          {
            "row": 6,
            "col": 1
          },
          {
            "row": 6,
            "col": 2
          },
          {
            "row": 6,
            "col": 3
          },
          {
            "row": 7,
            "col": 2
          },
          {
            "row": 7,
            "col": 3
          },
          {
            "row": 8,
            "col": 2
          }
        ]
      }
    }
  };
});