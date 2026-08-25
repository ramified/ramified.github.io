// Save this file as ramified_minigame_presets/hex_with_three_slits.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex"
//   ],
//   "id": "hex-with-three-slits",
//   "label": "hex with three slits",
//   "key": "hex_with_three_slits",
//   "file": "hex_with_three_slits.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["hex_with_three_slits"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "hex-with-three-slits",
    "label": "hex with three slits",
    "lattice": "hexagonal",
    "size": "12x17",
    "surface": "Sigma_1,4",
    "removed": "1,1; 1,13; 1,14; 1,15; 1,16; 1,17; 2,13; 2,14; 2,15; 2,16; 2,17; 3,1; 3,14; 3,15; 3,16; 3,17; 4,1; 4,14; 4,15; 4,16; 4,17; 5,1; 5,2; 5,15; 5,16; 5,17; 6,1; 6,2; 6,15; 6,16; 6,17; 7,1; 7,2; 7,3; 7,16; 7,17; 8,1; 8,2; 8,3; 8,16; 8,17; 9,1; 9,2; 9,3; 9,4; 9,17; 10,1; 10,2; 10,3; 10,4; 10,17; 11,1; 11,2; 11,3; 11,4; 11,5; 12,1; 12,2; 12,3; 12,4; 12,5",
    "cuts": "9,14=10,13; 3,5=4,4; 6,9=7,9",
    "glue": "g0:12,6,W=12,17,E; g0:11,6,SW=12,17,NE; g0:11,6,W=11,17,E; g0:10,5,SW=11,17,NE; g0:10,5,W=10,16,E; g0:9,5,SW=10,16,NE; g0:9,5,W=9,16,E; g0:8,4,SW=9,16,NE; g0:8,4,W=8,15,E; g0:7,4,SW=8,15,NE; g0:7,4,W=7,15,E; g0:6,3,SW=7,15,NE; g0:6,3,W=6,14,E; g0:5,3,SW=6,14,NE; g0:5,3,W=5,14,E; g0:4,2,SW=5,14,NE; g0:4,2,W=4,13,E; g0:3,2,SW=4,13,NE; g0:3,2,W=3,13,E; g0:2,1,SW=3,13,NE; g0:2,1,W=2,12,E; g1:1,2,NW=12,7,SE; g1:1,2,NE=12,8,SW; g1:1,3,NW=12,8,SE; g1:1,3,NE=12,9,SW; g1:1,4,NW=12,9,SE; g1:1,4,NE=12,10,SW; g1:1,5,NW=12,10,SE; g1:1,5,NE=12,11,SW; g1:1,6,NW=12,11,SE; g1:1,6,NE=12,12,SW; g1:1,7,NW=12,12,SE; g1:1,7,NE=12,13,SW; g1:1,8,NW=12,13,SE; g1:1,8,NE=12,14,SW; g1:1,9,NW=12,14,SE; g1:1,9,NE=12,15,SW; g1:1,10,NW=12,15,SE; g1:1,10,NE=12,16,SW; g1:1,11,NW=12,16,SE; g1:1,11,NE=12,17,SW; g1:1,12,NW=12,17,SE",
    "hex": {
      "seeds": [
        {
          "row": 1,
          "col": 2,
          "color": "red"
        },
        {
          "row": 1,
          "col": 3,
          "color": "red"
        },
        {
          "row": 1,
          "col": 4,
          "color": "red"
        },
        {
          "row": 1,
          "col": 5,
          "color": "red"
        },
        {
          "row": 1,
          "col": 6,
          "color": "red"
        },
        {
          "row": 1,
          "col": 7,
          "color": "red"
        },
        {
          "row": 1,
          "col": 8,
          "color": "red"
        },
        {
          "row": 1,
          "col": 9,
          "color": "red"
        },
        {
          "row": 1,
          "col": 10,
          "color": "red"
        },
        {
          "row": 1,
          "col": 11,
          "color": "red"
        },
        {
          "row": 1,
          "col": 12,
          "color": "red"
        },
        {
          "row": 2,
          "col": 1,
          "color": "blue"
        },
        {
          "row": 3,
          "col": 2,
          "color": "blue"
        },
        {
          "row": 4,
          "col": 2,
          "color": "blue"
        },
        {
          "row": 5,
          "col": 3,
          "color": "blue"
        },
        {
          "row": 6,
          "col": 3,
          "color": "blue"
        },
        {
          "row": 7,
          "col": 4,
          "color": "blue"
        },
        {
          "row": 8,
          "col": 4,
          "color": "blue"
        },
        {
          "row": 9,
          "col": 5,
          "color": "blue"
        },
        {
          "row": 10,
          "col": 5,
          "color": "blue"
        },
        {
          "row": 11,
          "col": 6,
          "color": "blue"
        },
        {
          "row": 12,
          "col": 6,
          "color": "blue"
        }
      ],
      "homology": {
        "version": 1,
        "fingerprint": "v1:4126:40b5316a:4e97852e",
        "generators": [
          {
            "id": "a1",
            "kind": "free",
            "order": null
          },
          {
            "id": "a2",
            "kind": "free",
            "order": null
          },
          {
            "id": "a3",
            "kind": "free",
            "order": null
          },
          {
            "id": "a4",
            "kind": "free",
            "order": null
          },
          {
            "id": "a5",
            "kind": "free",
            "order": null
          }
        ],
        "signatures": [
          [
            30,
            0,
            1,
            0,
            0,
            0
          ],
          [
            31,
            0,
            1,
            0,
            0,
            0
          ],
          [
            34,
            0,
            0,
            -1,
            0,
            -1
          ],
          [
            38,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            39,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            43,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            44,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            48,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            49,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            52,
            0,
            -1,
            -1,
            0,
            -1
          ],
          [
            72,
            0,
            1,
            0,
            0,
            0
          ],
          [
            77,
            0,
            -1,
            0,
            0,
            0
          ],
          [
            107,
            0,
            1,
            0,
            0,
            0
          ],
          [
            108,
            0,
            1,
            0,
            0,
            0
          ],
          [
            131,
            1,
            -1,
            0,
            1,
            -1
          ],
          [
            136,
            -1,
            1,
            0,
            -1,
            1
          ],
          [
            140,
            0,
            1,
            0,
            0,
            0
          ],
          [
            145,
            0,
            -1,
            0,
            0,
            0
          ],
          [
            167,
            1,
            -1,
            0,
            1,
            -1
          ],
          [
            172,
            -1,
            1,
            0,
            -1,
            1
          ],
          [
            174,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            176,
            0,
            1,
            0,
            0,
            0
          ],
          [
            177,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            178,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            181,
            0,
            -1,
            -1,
            -1,
            -1
          ],
          [
            203,
            1,
            -1,
            0,
            1,
            -1
          ],
          [
            204,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            206,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            207,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            208,
            0,
            0,
            -1,
            -1,
            -1
          ],
          [
            212,
            0,
            1,
            1,
            1,
            1
          ],
          [
            216,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            219,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            232,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            235,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            236,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            237,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            250,
            0,
            1,
            0,
            0,
            1
          ],
          [
            254,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            255,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            257,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            258,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            261,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            270,
            -1,
            1,
            1,
            0,
            2
          ],
          [
            292,
            0,
            1,
            0,
            0,
            1
          ],
          [
            296,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            297,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            299,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            300,
            0,
            -1,
            0,
            0,
            -1
          ],
          [
            301,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            302,
            1,
            -1,
            -1,
            0,
            -2
          ],
          [
            331,
            1,
            0,
            -1,
            0,
            -1
          ],
          [
            332,
            1,
            0,
            -1,
            0,
            -1
          ],
          [
            363,
            0,
            0,
            -1,
            0,
            -1
          ],
          [
            368,
            0,
            0,
            1,
            0,
            1
          ],
          [
            399,
            0,
            0,
            -1,
            0,
            -1
          ],
          [
            400,
            0,
            0,
            -1,
            0,
            -1
          ],
          [
            418,
            0,
            0,
            -1,
            0,
            -1
          ]
        ]
      }
    }
  };
});