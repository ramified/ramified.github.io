// Save this file as ramified_minigame_presets/dodecahedron_with_pentagon_holes.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Gomoku",
//     "Go",
//     "Chinese Checkers"
//   ],
//   "id": "dodecahedron-with-pentagon-holes",
//   "label": "dodecahedron with pentagon holes",
//   "key": "dodecahedron_with_pentagon_holes",
//   "file": "dodecahedron_with_pentagon_holes.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["dodecahedron_with_pentagon_holes"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "dodecahedron-with-pentagon-holes",
    "label": "dodecahedron with pentagon holes",
    "lattice": "hexagonal",
    "size": "14x19",
    "surface": "Sigma_0,12",
    "removed": "1,1; 1,2; 1,4; 1,5; 1,6; 1,7; 1,8; 1,9; 1,10; 1,11; 1,12; 1,13; 1,14; 1,15; 1,16; 1,17; 1,18; 1,19; 2,1; 2,4; 2,5; 2,7; 2,8; 2,9; 2,10; 2,11; 2,12; 2,13; 2,14; 2,15; 2,16; 2,17; 2,18; 2,19; 3,1; 3,5; 3,8; 3,9; 3,11; 3,12; 3,13; 3,14; 3,15; 3,16; 3,17; 3,18; 3,19; 4,4; 4,8; 4,11; 4,12; 4,14; 4,15; 4,16; 4,17; 4,18; 4,19; 5,1; 5,8; 5,12; 5,15; 5,16; 5,18; 5,19; 6,1; 6,11; 6,15; 6,18; 6,19; 7,1; 7,2; 7,15; 7,19; 8,1; 8,5; 8,18; 8,19; 9,1; 9,2; 9,5; 9,9; 9,19; 10,1; 10,2; 10,4; 10,5; 10,8; 10,12; 10,19; 11,1; 11,2; 11,3; 11,4; 11,5; 11,6; 11,8; 11,9; 11,12; 11,16; 12,1; 12,2; 12,3; 12,4; 12,5; 12,6; 12,7; 12,8; 12,9; 12,11; 12,12; 12,15; 12,19; 13,1; 13,2; 13,3; 13,4; 13,5; 13,6; 13,7; 13,8; 13,9; 13,10; 13,11; 13,12; 13,13; 13,15; 13,16; 13,19; 14,1; 14,2; 14,3; 14,4; 14,5; 14,6; 14,7; 14,8; 14,9; 14,10; 14,11; 14,12; 14,13; 14,14; 14,15; 14,16; 14,18; 14,19",
    "glue": "g0:1,3,E=2,6,NW; g0:2,3,NE=2,6,W; g0:2,3,E=3,6,NW; g0:3,4,NE=3,6,W; g0:3,4,E=4,5,NW; g1:2,6,E=3,10,NW; g1:3,7,NE=3,10,W; g1:3,7,E=4,9,NW; g1:4,7,NE=4,9,W; g1:4,7,E=5,9,NW; g2:3,10,E=4,13,NW; g2:4,10,NE=4,13,W; g2:4,10,E=5,13,NW; g2:5,11,NE=5,13,W; g2:5,11,E=6,12,NW; g3:4,13,E=5,17,NW; g3:5,14,NE=5,17,W; g3:5,14,E=6,16,NW; g3:6,14,NE=6,16,W; g3:6,14,E=7,16,NW; g4:5,17,E=1,3,NW; g4:6,17,NE=1,3,W; g4:6,17,E=2,2,NW; g4:7,18,NE=2,2,W; g4:7,18,E=3,2,NW; g5:9,18,E=4,1,W; g5:10,18,NE=4,1,SW; g5:10,18,E=5,2,W; g5:11,19,NE=5,2,SW; g5:11,19,E=6,2,W; g6:8,4,SE=9,6,W; g6:9,4,E=9,6,SW; g6:9,4,SE=10,6,W; g6:10,3,E=10,6,SW; g6:10,3,SE=11,7,W; g7:12,10,W=11,7,SE; g7:11,10,SW=11,7,E; g7:11,10,W=10,7,SE; g7:10,9,SW=10,7,E; g7:10,9,W=9,8,SE; g9:14,17,W=13,14,SE; g9:13,17,SW=13,14,E; g9:13,17,W=12,14,SE; g9:12,16,SW=12,14,E; g9:12,16,W=11,15,SE; g10:10,3,W=14,17,SE; g10:9,3,SW=14,17,E; g10:9,3,W=13,18,SE; g10:8,2,SW=13,18,E; g10:8,2,W=12,18,SE; g11:13,14,W=12,10,SE; g11:12,13,SW=12,10,E; g11:12,13,W=11,11,SE; g11:11,13,SW=11,11,E; g11:11,13,W=10,11,SE",
    "pieceSets": {
      "starts": {
        "red": [
          {
            "row": 5,
            "col": 5
          },
          {
            "row": 5,
            "col": 6
          },
          {
            "row": 5,
            "col": 7
          },
          {
            "row": 6,
            "col": 5
          },
          {
            "row": 6,
            "col": 6
          },
          {
            "row": 7,
            "col": 6
          }
        ],
        "yellow": [
          {
            "row": 8,
            "col": 14
          },
          {
            "row": 9,
            "col": 14
          },
          {
            "row": 9,
            "col": 15
          },
          {
            "row": 10,
            "col": 13
          },
          {
            "row": 10,
            "col": 14
          },
          {
            "row": 10,
            "col": 15
          }
        ]
      },
      "targets": {
        "red": [
          {
            "row": 8,
            "col": 14
          },
          {
            "row": 9,
            "col": 14
          },
          {
            "row": 9,
            "col": 15
          },
          {
            "row": 10,
            "col": 13
          },
          {
            "row": 10,
            "col": 14
          },
          {
            "row": 10,
            "col": 15
          }
        ],
        "yellow": [
          {
            "row": 5,
            "col": 5
          },
          {
            "row": 5,
            "col": 6
          },
          {
            "row": 5,
            "col": 7
          },
          {
            "row": 6,
            "col": 5
          },
          {
            "row": 6,
            "col": 6
          },
          {
            "row": 7,
            "col": 6
          }
        ]
      }
    }
  };
});