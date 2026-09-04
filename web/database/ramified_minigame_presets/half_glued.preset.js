// Save this file as ramified_minigame_presets/half_glued.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Billiard"
//   ],
//   "id": "half-glued",
//   "label": "half-glued",
//   "labelZh": "半粘合",
//   "key": "half_glued",
//   "wrappedView": {
//     "x": "repeat",
//     "y": "repeat"
//   },
//   "file": "half_glued.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["half_glued"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "half-glued",
    "label": "half-glued",
    "labelZh": "半粘合",
    "wrappedView": {
      "x": "repeat",
      "y": "repeat"
    },
    "lattice": "square",
    "size": "4x4",
    "surface": "Sigma_1,1",
    "glue": "g0:1,1..2,N=4,3..4,S; g1:3..4,1,W=1..2,4,E",
    "billiards": {
      "balls": [
        {
          "id": "cue",
          "kind": "cue",
          "at": {
            "row": 2,
            "col": 2,
            "x": 0.4527619236249885,
            "y": 0.4445357644356744
          }
        },
        {
          "id": "1",
          "kind": "target",
          "number": 1,
          "at": {
            "row": 1,
            "col": 2,
            "x": -0.442812198794049,
            "y": 0.4512624480745366
          }
        },
        {
          "id": "2",
          "kind": "target",
          "number": 2,
          "at": {
            "row": 1,
            "col": 4,
            "x": -0.47797671891347815,
            "y": 0.4241239045606343
          }
        },
        {
          "id": "3",
          "kind": "target",
          "number": 3,
          "at": {
            "row": 3,
            "col": 2,
            "x": -0.44823978823536065,
            "y": 0.47580270380878126
          }
        },
        {
          "id": "4",
          "kind": "target",
          "number": 4,
          "at": {
            "row": 3,
            "col": 4,
            "x": -0.46712114249262543,
            "y": 0.44866416029487877
          }
        }
      ],
      "pockets": [
        {
          "id": "p1",
          "vertex": {
            "row": 1,
            "col": 4,
            "corner": "NE"
          }
        },
        {
          "id": "p2",
          "vertex": {
            "row": 2,
            "col": 4,
            "corner": "SE"
          }
        },
        {
          "id": "p3",
          "vertex": {
            "row": 1,
            "col": 1,
            "corner": "NW"
          }
        },
        {
          "id": "p4",
          "vertex": {
            "row": 1,
            "col": 2,
            "corner": "NE"
          }
        }
      ]
    }
  };
});
