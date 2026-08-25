// Save this file as ramified_minigame_presets/hex_klein_bottle_5_5.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex"
//   ],
//   "id": "hex-klein-bottle-5-5",
//   "label": "hex Klein bottle 5*5",
//   "key": "hex_klein_bottle_5_5",
//   "file": "hex_klein_bottle_5_5.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["hex_klein_bottle_5_5"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "hex-klein-bottle-5-5",
    "label": "hex Klein bottle 5*5",
    "lattice": "hexagonal",
    "size": "5x7",
    "surface": "N_2,0",
    "removed": "1,6; 1,7; 2,6; 2,7; 3,1; 3,7; 4,1; 4,7; 5,1; 5,2",
    "glue": "g1:5,3,W=5,7,E; g1:4,2,SW=5,7,NE; g1:4,2,W=4,6,E; g1:3,2,SW=4,6,NE; g1:3,2,W=3,6,E; g1:2,1,SW=3,6,NE; g1:2,1,W=2,5,E; g1:1,1,SW=2,5,NE; g1:1,1,W=1,5,E; g2~00:5,3,SE=1,5,NE; g2~00:5,4,SW=1,5,NW; g2~00:5,4,SE=1,4,NE; g2~00:5,5,SW=1,4,NW; g2~00:5,5,SE=1,3,NE; g2~00:5,6,SW=1,3,NW; g2~00:5,6,SE=1,2,NE; g2~00:5,7,SW=1,2,NW; g2~00:5,7,SE=1,1,NE; g3~00:1,1,NW=5,3,SW",
    "hex": {
      "homology": {
        "version": 1,
        "fingerprint": "v1:1762:5a999a10:9b06d324",
        "generators": [
          {
            "id": "t1",
            "kind": "torsion",
            "order": 2
          },
          {
            "id": "a1",
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
            1,
            0
          ],
          [
            19,
            1,
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
            42,
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
            49,
            0,
            -1
          ],
          [
            51,
            1,
            -1
          ],
          [
            53,
            1,
            -1
          ],
          [
            54,
            1,
            -1
          ],
          [
            59,
            0,
            1
          ],
          [
            62,
            1,
            -1
          ],
          [
            63,
            1,
            -1
          ],
          [
            64,
            0,
            -1
          ],
          [
            72,
            1,
            0
          ]
        ]
      }
    }
  };
});