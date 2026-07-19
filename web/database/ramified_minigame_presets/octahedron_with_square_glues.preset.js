// Save this file as ramified_minigame_presets/octahedron_with_square_glues.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Gomoku",
//     "Go",
//     "Chinese Checkers"
//   ],
//   "id": "octahedron-with-square-glues",
//   "label": "octahedron with square glues",
//   "key": "octahedron_with_square_glues",
//   "file": "octahedron_with_square_glues.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["octahedron_with_square_glues"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "octahedron-with-square-glues",
    "label": "octahedron with square glues",
    "lattice": "hexagonal",
    "size": "14x13",
    "surface": "M_6,6",
    "removed": "1,1; 1,6; 1,7; 1,8; 1,9; 1,10; 1,11; 1,12; 1,13; 2,1; 2,6; 2,7; 2,8; 2,9; 2,10; 2,11; 2,12; 2,13; 3,1; 3,2; 3,7; 3,8; 3,9; 3,10; 3,11; 3,12; 3,13; 4,1; 4,2; 4,7; 4,8; 4,9; 4,10; 4,11; 4,12; 4,13; 5,1; 5,2; 5,3; 5,8; 5,9; 5,10; 5,11; 5,12; 5,13; 6,1; 6,7; 6,8; 6,9; 6,10; 6,11; 6,12; 6,13; 7,1; 7,12; 7,13; 8,12; 8,13; 9,13; 10,1; 10,2; 10,3; 10,4; 10,13; 11,1; 11,2; 11,3; 11,4; 11,9; 12,1; 12,2; 12,3; 12,4; 12,8; 12,9; 12,10; 12,11; 12,12; 12,13; 13,1; 13,2; 13,3; 13,4; 13,5; 13,8; 13,9; 13,10; 13,11; 13,12; 13,13; 14,1; 14,2; 14,3; 14,4; 14,5; 14,7; 14,8; 14,9; 14,10; 14,11; 14,12; 14,13",
    "glue": "g0:2,5,E=7,11,NE; g0:3,6,NE=7,11,NW; g0:3,6,E=7,10,NE; g0:4,6,NE=7,10,NW; g0:4,6,E=7,9,NE; g0:5,7,NE=7,9,NW; g0:5,7,E=7,8,NE; g2:9,1,NW=1,2,W; g2:8,1,W=1,2,SW; g2:8,1,NW=2,2,W; g2:7,2,W=2,2,SW; g2:7,2,NW=3,3,W; g2:6,2,W=3,3,SW; g2:6,2,NW=4,3,W; g3:1,2,NE=11,13,E; g3:1,3,NW=11,13,NE; g3:1,3,NE=10,12,E; g3:1,4,NW=10,12,NE; g3:1,4,NE=9,12,E; g3:1,5,NW=9,12,NE; g3:1,5,NE=8,11,E; g4:9,4,SW=11,5,W; g4:9,3,SE=11,5,SW; g4:9,3,SW=12,5,W; g4:9,2,SE=12,5,SW; g4:9,2,SW=13,6,W; g4:9,1,SE=13,6,SW; g4:9,1,SW=14,6,W; g5:11,13,SW=14,6,SE; g5:11,12,SE=14,6,E; g5:11,12,SW=13,7,SE; g5:11,11,SE=13,7,E; g5:11,11,SW=12,7,SE; g5:11,10,SE=12,7,E; g5:11,10,SW=11,8,SE; g6:7,8,NW=6,6,E; g7:7,7,NE=5,7,SE; g8:7,11,E=1,5,E; g9:2,5,NE=8,11,NE; g10:11,8,E=10,9,SW; g11:10,8,SE=11,10,W; g12:11,5,NW=9,5,SW; g13:10,5,W=9,4,SE; g14:6,3,NW=4,3,SW; g15:5,4,W=6,2,NE; g16:14,6,SW=1,2,NW; g17:9,1,W=11,13,SE",
    "pieceSets": {
      "starts": {
        "red": [
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
            "col": 3
          },
          {
            "row": 3,
            "col": 4
          },
          {
            "row": 4,
            "col": 3
          }
        ],
        "yellow": [
          {
            "row": 7,
            "col": 7
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
      "targets": {
        "red": [
          {
            "row": 7,
            "col": 7
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
        ],
        "yellow": [
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
            "col": 3
          },
          {
            "row": 3,
            "col": 4
          },
          {
            "row": 4,
            "col": 3
          }
        ]
      }
    }
  };
});