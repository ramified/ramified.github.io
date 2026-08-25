// Save this file as ramified_minigame_presets/hex_rp2_5_5.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex"
//   ],
//   "id": "hex-rp2-5-5",
//   "label": "hex RP2 5*5",
//   "key": "hex_rp2_5_5",
//   "file": "hex_rp2_5_5.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["hex_rp2_5_5"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "hex-rp2-5-5",
    "label": "hex RP2 5*5",
    "lattice": "hexagonal",
    "size": "5x7",
    "surface": "N_4,0^1",
    "removed": "1,6; 1,7; 2,6; 2,7; 3,1; 3,7; 4,1; 4,7; 5,1; 5,2",
    "glue": "g2~00:5,3,SE=1,5,NE; g2~00:5,4,SW=1,5,NW; g2~00:5,4,SE=1,4,NE; g2~00:5,5,SW=1,4,NW; g2~00:5,5,SE=1,3,NE; g2~00:5,6,SW=1,3,NW; g2~00:5,6,SE=1,2,NE; g2~00:5,7,SW=1,2,NW; g2~00:5,7,SE=1,1,NE; g3~00:1,1,NW=5,3,SW; g4~00:1,1,W=5,7,NE; g4~00:1,1,SW=4,6,E; g4~00:2,1,W=4,6,NE; g4~00:2,1,SW=3,6,E; g4~00:3,2,W=3,6,NE; g4~00:3,2,SW=2,5,E; g4~00:4,2,W=2,5,NE; g4~00:4,2,SW=1,5,E; g5~00:5,3,W=5,7,E",
    "hex": {
      "homology": {
        "version": 1,
        "fingerprint": "v1:1753:17439e23:efd16367",
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
          }
        ],
        "signatures": [
          [
            5,
            0,
            0,
            -1,
            -2
          ],
          [
            9,
            0,
            0,
            -1,
            -2
          ],
          [
            16,
            1,
            1,
            -1,
            -2
          ],
          [
            17,
            1,
            1,
            -1,
            -2
          ],
          [
            20,
            1,
            1,
            -1,
            -2
          ],
          [
            21,
            0,
            0,
            1,
            0
          ],
          [
            22,
            0,
            -1,
            1,
            1
          ],
          [
            33,
            1,
            1,
            -1,
            -2
          ],
          [
            34,
            0,
            1,
            0,
            -1
          ],
          [
            36,
            0,
            -1,
            1,
            1
          ],
          [
            37,
            0,
            -1,
            1,
            1
          ],
          [
            38,
            1,
            0,
            1,
            1
          ],
          [
            42,
            0,
            1,
            0,
            -1
          ],
          [
            44,
            0,
            1,
            0,
            -1
          ],
          [
            46,
            0,
            1,
            0,
            -1
          ],
          [
            47,
            0,
            1,
            0,
            -1
          ],
          [
            48,
            0,
            1,
            0,
            -1
          ],
          [
            49,
            1,
            -1,
            0,
            0
          ],
          [
            50,
            1,
            -1,
            0,
            0
          ],
          [
            59,
            1,
            -1,
            0,
            0
          ],
          [
            63,
            0,
            0,
            1,
            2
          ],
          [
            64,
            1,
            1,
            0,
            0
          ],
          [
            66,
            0,
            0,
            1,
            2
          ],
          [
            67,
            0,
            0,
            1,
            2
          ],
          [
            69,
            0,
            0,
            1,
            2
          ],
          [
            71,
            0,
            0,
            -1,
            -1
          ],
          [
            72,
            1,
            -1,
            1,
            2
          ],
          [
            74,
            0,
            0,
            -1,
            -2
          ]
        ]
      }
    }
  };
});