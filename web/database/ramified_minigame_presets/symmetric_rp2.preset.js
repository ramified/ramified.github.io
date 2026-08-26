// Save this file as ramified_minigame_presets/symmetric_rp2.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Hex"
//   ],
//   "id": "symmetric-rp2",
//   "label": "symmetric RP2",
//   "key": "symmetric_rp2",
//   "file": "symmetric_rp2.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["symmetric_rp2"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "symmetric-rp2",
    "label": "symmetric RP2",
    "lattice": "hexagonal",
    "size": "7x7",
    "surface": "N_1,0^6",
    "removed": "1,1; 1,2; 1,7; 2,1; 2,7; 3,1; 5,1; 6,1; 6,7; 7,1; 7,2; 7,7",
    "glue": "g0:7,3,SW=7,3,W; g1:1,3,NW=1,3,NE; g2:4,7,E=4,7,SE; g3~00:1,4,NW=7,6,SW; g3~00:1,4,NE=7,5,SE; g3~00:1,5,NW=7,5,SW; g3~00:1,5,NE=7,4,SE; g3~00:1,6,NW=7,4,SW; g3~00:1,6,NE=7,3,SE; g4~00:1,6,E=6,2,SW; g4~00:2,6,NE=6,2,W; g4~00:2,6,E=5,2,SW; g4~00:3,7,NE=5,2,W; g4~00:3,7,E=4,1,SW; g4~00:4,7,NE=4,1,W; g5~00:5,7,E=4,1,NW; g5~00:5,7,SE=3,2,W; g5~00:6,6,E=3,2,NW; g5~00:6,6,SE=2,2,W; g5~00:7,6,E=2,2,NW; g5~00:7,6,SE=1,3,W",
    "hex": {
      "homology": {
        "version": 1,
        "fingerprint": "v1:1937:767affe5:488e7b39",
        "generators": [
          {
            "id": "t1",
            "kind": "torsion",
            "order": 2
          }
        ],
        "signatures": [
          [
            34,
            1
          ],
          [
            35,
            1
          ],
          [
            52,
            1
          ],
          [
            53,
            1
          ],
          [
            67,
            1
          ],
          [
            70,
            1
          ],
          [
            71,
            1
          ],
          [
            72,
            1
          ],
          [
            73,
            1
          ],
          [
            74,
            1
          ],
          [
            81,
            1
          ],
          [
            82,
            1
          ],
          [
            83,
            1
          ],
          [
            84,
            1
          ]
        ]
      }
    }
  };
});