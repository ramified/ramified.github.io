// Save this file as ramified_minigame_presets/twisted_torus.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Billiard"
//   ],
//   "id": "twisted-torus",
//   "label": "twisted torus",
//   "labelZh": "扭曲环面",
//   "key": "twisted_torus",
//   "file": "twisted_torus.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["twisted_torus"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "twisted-torus",
    "label": "twisted torus",
    "labelZh": "扭曲环面",
    "lattice": "square",
    "size": "4x4",
    "surface": "M_2,1",
    "glue": "g0:1,1..3,N=4,2..4,S; g1:1..3,4,E=2..4,1,W; g2:1,4,N=4,1,S; g3:4,4,E=1,1,W",
    "billiards": {
      "balls": [
        {
          "id": "cue",
          "kind": "cue",
          "at": {
            "row": 2,
            "col": 2,
            "x": -0.4319566223731965,
            "y": 0.4228247109785266
          }
        },
        {
          "id": "1",
          "kind": "target",
          "number": 1,
          "at": {
            "row": 2,
            "col": 3,
            "x": 0.054878567208685114,
            "y": 0.45108103547076545
          }
        },
        {
          "id": "2",
          "kind": "target",
          "number": 2,
          "at": {
            "row": 2,
            "col": 3,
            "x": 0.43496921912609987,
            "y": 0.22509002608102294
          }
        },
        {
          "id": "3",
          "kind": "target",
          "number": 3,
          "at": {
            "row": 3,
            "col": 3,
            "x": 0.4406378483257971,
            "y": -0.3327463089226361
          }
        },
        {
          "id": "4",
          "kind": "target",
          "number": 4,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.18494012895648537,
            "y": -0.0009009833087195718
          }
        },
        {
          "id": "5",
          "kind": "target",
          "number": 5,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.17927149975678813,
            "y": 0.44126268168762134
          }
        },
        {
          "id": "6",
          "kind": "target",
          "number": 6,
          "at": {
            "row": 3,
            "col": 4,
            "x": -0.1736028705570909,
            "y": -0.11657365331603775
          }
        }
      ],
      "pockets": [
        {
          "id": "p1",
          "vertex": {
            "row": 1,
            "col": 1,
            "corner": "NW"
          }
        }
      ]
    }
  };
});