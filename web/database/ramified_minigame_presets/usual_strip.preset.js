// Save this file as ramified_minigame_presets/usual_strip.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Tile Matching",
//     "Billiard"
//   ],
//   "id": "usual-strip",
//   "label": "usual strip",
//   "key": "usual_strip",
//   "file": "usual_strip.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["usual_strip"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "usual-strip",
    "label": "usual strip",
    "lattice": "hexagonal",
    "size": "4x5",
    "surface": "Sigma_0,2",
    "glue": "g0:1,1,W=1,5,E; g0:1,1,SW=2,5,NE; g0:2,1,W=2,5,E; g0:3,1,NW=2,5,SE; g0:3,1,W=3,5,E; g0:3,1,SW=4,5,NE; g0:4,1,W=4,5,E",
    "billiards": {
      "balls": [
        {
          "id": "1",
          "kind": "target",
          "number": 1,
          "at": {
            "row": 3,
            "col": 4,
            "x": -0.0344365213984843,
            "y": -0.8117767138679324
          }
        },
        {
          "id": "2",
          "kind": "target",
          "number": 2,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.5235852110588606,
            "y": 0.4569122782853808
          }
        },
        {
          "id": "3",
          "kind": "target",
          "number": 3,
          "at": {
            "row": 3,
            "col": 4,
            "x": 0.3543230446337592,
            "y": -0.6010474092650324
          }
        },
        {
          "id": "4",
          "kind": "target",
          "number": 4,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.14670849693479848,
            "y": 0.22560127043869393
          }
        },
        {
          "id": "5",
          "kind": "target",
          "number": 5,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.1348256450266171,
            "y": 0.6676415828882807
          }
        },
        {
          "id": "6",
          "kind": "target",
          "number": 6,
          "at": {
            "row": 3,
            "col": 4,
            "x": 0.7430826106660027,
            "y": -0.39031810466213246
          }
        },
        {
          "id": "cue",
          "kind": "cue",
          "at": {
            "row": 2,
            "col": 2,
            "x": -0.4731139835189335,
            "y": 0.6849046374886711
          }
        }
      ],
      "pockets": [
        {
          "id": "p11",
          "vertex": {
            "row": 4,
            "col": 1,
            "corner": "NE"
          }
        },
        {
          "id": "p18",
          "vertex": {
            "row": 4,
            "col": 4,
            "corner": "NE"
          }
        },
        {
          "id": "p1",
          "vertex": {
            "row": 1,
            "col": 1,
            "corner": "SE"
          }
        },
        {
          "id": "p3",
          "vertex": {
            "row": 1,
            "col": 4,
            "corner": "SE"
          }
        }
      ]
    }
  };
});