// Save this file as ramified_minigame_presets/rubik_s_cube_2_2_2.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Tile Matching",
//     "Billiard"
//   ],
//   "id": "rubik-s-cube-2-2-2",
//   "label": "Rubik's Cube 2*2*2",
//   "labelZh": "2阶魔方",
//   "key": "rubik_s_cube_2_2_2",
//   "file": "rubik_s_cube_2_2_2.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["rubik_s_cube_2_2_2"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "rubik-s-cube-2-2-2",
    "label": "Rubik's Cube 2*2*2",
    "labelZh": "2阶魔方",
    "lattice": "square",
    "size": "6x8",
    "surface": "M_0,8",
    "removed": "1,1; 1,2; 1,5; 1,6; 1,7; 1,8; 2,1; 2,2; 2,5; 2,6; 2,7; 2,8; 5,1; 5,2; 5,5; 5,6; 5,7; 5,8; 6,1; 6,2; 6,5; 6,6; 6,7; 6,8",
    "glue": "g0:1..2,4,E=3,6..5,N; g3:3,2..1,N=2..1,3,W; g4:1,3..4,N=3,8..7,N; g5:4..3,1,W=4..3,8,E; g6:6,3..4,S=4,8..7,S; g7:4,6..5,S=6..5,4,E; g8:5..6,3,W=4,2..1,S",
    "billiards": {
      "balls": [
        {
          "id": "1",
          "kind": "target",
          "number": 1,
          "at": {
            "row": 3,
            "col": 4,
            "x": -0.019249501947041447,
            "y": 0.44371985615306153
          }
        },
        {
          "id": "2",
          "kind": "target",
          "number": 2,
          "at": {
            "row": 4,
            "col": 4,
            "x": -0.4022059355005202,
            "y": -0.3351801438469385
          }
        },
        {
          "id": "3",
          "kind": "target",
          "number": 3,
          "at": {
            "row": 3,
            "col": 4,
            "x": -0.4022059355005202,
            "y": 0.22261985615306154
          }
        },
        {
          "id": "4",
          "kind": "target",
          "number": 4,
          "at": {
            "row": 4,
            "col": 3,
            "x": 0.21483763094600106,
            "y": -0.11408014384693854
          }
        },
        {
          "id": "5",
          "kind": "target",
          "number": 5,
          "at": {
            "row": 3,
            "col": 3,
            "x": 0.21483763094600106,
            "y": 0.44371985615306153
          }
        },
        {
          "id": "6",
          "kind": "target",
          "number": 6,
          "at": {
            "row": 3,
            "col": 3,
            "x": 0.21483763094600106,
            "y": 0.0015198561530615495
          }
        },
        {
          "id": "cue",
          "kind": "cue",
          "at": {
            "row": 3,
            "col": 7,
            "x": 0.4745654881447851,
            "y": 0.4541753622415055
          }
        }
      ],
      "pockets": [
        {
          "id": "p1",
          "vertex": {
            "row": 4,
            "col": 6,
            "corner": "SE"
          }
        },
        {
          "id": "p2",
          "vertex": {
            "row": 4,
            "col": 4,
            "corner": "SE"
          }
        },
        {
          "id": "p3",
          "vertex": {
            "row": 4,
            "col": 1,
            "corner": "SW"
          }
        },
        {
          "id": "p4",
          "vertex": {
            "row": 1,
            "col": 3,
            "corner": "NW"
          }
        },
        {
          "id": "p5",
          "vertex": {
            "row": 2,
            "col": 4,
            "corner": "SE"
          }
        },
        {
          "id": "p6",
          "vertex": {
            "row": 1,
            "col": 4,
            "corner": "NE"
          }
        },
        {
          "id": "p7",
          "vertex": {
            "row": 2,
            "col": 3,
            "corner": "SW"
          }
        },
        {
          "id": "p8",
          "vertex": {
            "row": 4,
            "col": 2,
            "corner": "SE"
          }
        }
      ]
    }
  };
});