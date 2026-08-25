// Save this file as ramified_minigame_presets/hex_torus_5_5.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex (Nash)"
//   ],
//   "id": "hex-torus-5-5",
//   "label": "hex torus 5*5",
//   "key": "hex_torus_5_5",
//   "file": "hex_torus_5_5.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["hex_torus_5_5"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "hex-torus-5-5",
    "label": "hex torus 5*5",
    "lattice": "hexagonal",
    "size": "5x7",
    "surface": "M_1",
    "removed": "1,6; 1,7; 2,6; 2,7; 3,1; 3,7; 4,1; 4,7; 5,1; 5,2",
    "glue": "g0:1,1,NW=5,3,SE; g0:1,1,NE=5,4,SW; g0:1,2,NW=5,4,SE; g0:1,2,NE=5,5,SW; g0:1,3,NW=5,5,SE; g0:1,3,NE=5,6,SW; g0:1,4,NW=5,6,SE; g0:1,4,NE=5,7,SW; g0:1,5,NW=5,7,SE; g1:5,3,W=5,7,E; g1:4,2,SW=5,7,NE; g1:4,2,W=4,6,E; g1:3,2,SW=4,6,NE; g1:3,2,W=3,6,E; g1:2,1,SW=3,6,NE; g1:2,1,W=2,5,E; g1:1,1,SW=2,5,NE; g1:1,1,W=1,5,E; g2:1,5,NE=5,3,SW",
    "hex": {
      "homology": {
        "version": 1,
        "fingerprint": "v1:1772:5688853b:cf050f8f",
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
          }
        ],
        "signatures": [
          [
            11,
            1,
            0
          ],
          [
            18,
            -1,
            0
          ],
          [
            19,
            -1,
            0
          ],
          [
            32,
            1,
            0
          ],
          [
            33,
            1,
            0
          ],
          [
            41,
            1,
            -1
          ],
          [
            44,
            1,
            0
          ],
          [
            45,
            1,
            -1
          ],
          [
            46,
            1,
            -1
          ],
          [
            48,
            0,
            -1
          ],
          [
            49,
            0,
            -1
          ],
          [
            51,
            0,
            -1
          ],
          [
            52,
            0,
            -1
          ],
          [
            54,
            0,
            -1
          ],
          [
            58,
            -1,
            1
          ],
          [
            65,
            0,
            1
          ],
          [
            68,
            1,
            -1
          ],
          [
            69,
            0,
            -1
          ],
          [
            74,
            1,
            0
          ]
        ]
      }
    }
  };
});