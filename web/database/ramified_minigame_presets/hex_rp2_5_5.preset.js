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
    "surface": "N_1,0^4",
    "removed": "1,6; 1,7; 2,6; 2,7; 3,1; 3,7; 4,1; 4,7; 5,1; 5,2",
    "glue": "g2~00:5,3,SE=1,5,NE; g2~00:5,4,SW=1,5,NW; g2~00:5,4,SE=1,4,NE; g2~00:5,5,SW=1,4,NW; g2~00:5,5,SE=1,3,NE; g2~00:5,6,SW=1,3,NW; g2~00:5,6,SE=1,2,NE; g2~00:5,7,SW=1,2,NW; g2~00:5,7,SE=1,1,NE; g4~00:1,1,W=5,7,NE; g4~00:1,1,SW=4,6,E; g4~00:2,1,W=4,6,NE; g4~00:2,1,SW=3,6,E; g4~00:3,2,W=3,6,NE; g4~00:3,2,SW=2,5,E; g4~00:4,2,W=2,5,NE; g4~00:4,2,SW=1,5,E; g5:5,3,W=5,3,SW; g6~00:1,1,NW=5,7,E",
    "hex": {
      "homology": {
        "version": 1,
        "fingerprint": "v1:1754:76bee095:b5ce6169",
        "generators": [
          {
            "id": "t1",
            "kind": "torsion",
            "order": 2
          }
        ],
        "signatures": [
          [
            21,
            1
          ],
          [
            22,
            1
          ],
          [
            25,
            1
          ],
          [
            36,
            1
          ],
          [
            37,
            1
          ],
          [
            49,
            1
          ],
          [
            50,
            1
          ],
          [
            59,
            1
          ],
          [
            60,
            1
          ],
          [
            70,
            1
          ]
        ]
      }
    }
  };
});