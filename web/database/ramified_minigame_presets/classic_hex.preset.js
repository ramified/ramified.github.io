// Save this file as ramified_minigame_presets/classic_hex.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex"
//   ],
//   "id": "classic-hex",
//   "label": "classic hex",
//   "key": "classic_hex",
//   "file": "classic_hex.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["classic_hex"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "classic-hex",
    "label": "classic hex",
    "lattice": "hexagonal",
    "size": "12x17",
    "surface": "Sigma_1,1",
    "removed": "1,1; 1,13; 1,14; 1,15; 1,16; 1,17; 2,13; 2,14; 2,15; 2,16; 2,17; 3,1; 3,14; 3,15; 3,16; 3,17; 4,1; 4,14; 4,15; 4,16; 4,17; 5,1; 5,2; 5,15; 5,16; 5,17; 6,1; 6,2; 6,15; 6,16; 6,17; 7,1; 7,2; 7,3; 7,16; 7,17; 8,1; 8,2; 8,3; 8,16; 8,17; 9,1; 9,2; 9,3; 9,4; 9,17; 10,1; 10,2; 10,3; 10,4; 10,17; 11,1; 11,2; 11,3; 11,4; 11,5; 12,1; 12,2; 12,3; 12,4; 12,5",
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
        "fingerprint": "v1:4025:e7822915:d4ddbca9",
        "generators": [
          { "id": "a1", "kind": "free", "order": null },
          { "id": "a2", "kind": "free", "order": null }
        ],
        "signatures": [
          [30, 1, -1],
          [31, 1, -1],
          [34, 1, -1],
          [72, 1, -1],
          [77, -1, 1],
          [108, 1, -1],
          [109, 1, -1],
          [141, 1, -1],
          [146, -1, 1],
          [175, 0, -1],
          [177, 1, -1],
          [178, 0, -1],
          [179, 0, -1],
          [182, -1, 0],
          [205, 0, -1],
          [207, 0, -1],
          [208, 0, -1],
          [209, 0, -1],
          [213, 1, 0],
          [217, -1, 0],
          [218, -1, 0],
          [221, -1, 0],
          [234, 0, -1],
          [237, 0, -1],
          [238, 0, -1],
          [239, 0, -1],
          [252, 1, 0],
          [256, -1, 0],
          [257, -1, 0],
          [259, -1, 0],
          [260, -1, 0],
          [263, -1, 0],
          [272, 0, 1],
          [294, 1, 0],
          [298, -1, 0],
          [299, -1, 0],
          [301, 0, -1],
          [302, -1, 0],
          [303, 0, -1],
          [304, 0, -1],
          [333, 1, -1],
          [334, 1, -1],
          [366, 1, -1],
          [371, -1, 1],
          [402, 1, -1],
          [403, 1, -1],
          [421, 1, -1]
        ]
      }
    }
  };
});
