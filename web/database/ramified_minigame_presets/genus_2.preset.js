// Save this file as ramified_minigame_presets/genus_2.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048",
//     "Billiard"
//   ],
//   "id": "genus-2",
//   "label": "genus 2",
//   "labelZh": "亏格 2",
//   "key": "genus_2",
//   "file": "genus_2.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["genus_2"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "genus-2",
    "label": "genus 2",
    "labelZh": "亏格 2",
    "lattice": "square",
    "size": "4x4",
    "surface": "M_2,1",
    "glue": "g0:4..3,4,E=1,3..4,N; g2:1,2..1,N=4..3,1,W; g3:4,1..2,S=2..1,1,W; g4:2..1,4,E=4,4..3,S",
    "billiards": {
      "balls": [
        {
          "id": "cue",
          "kind": "cue",
          "at": {
            "row": 3,
            "col": 2,
            "x": -0.4753785305183776,
            "y": 0.4323809944327146
          }
        },
        {
          "id": "1",
          "kind": "target",
          "number": 1,
          "at": {
            "row": 2,
            "col": 3,
            "x": 0.12915605325925794,
            "y": -0.21172793015284674
          }
        },
        {
          "id": "2",
          "kind": "target",
          "number": 2,
          "at": {
            "row": 1,
            "col": 3,
            "x": 0.28257762971886113,
            "y": 0.3735400360269405
          }
        },
        {
          "id": "3",
          "kind": "target",
          "number": 3,
          "at": {
            "row": 2,
            "col": 4,
            "x": -0.4349646814594493,
            "y": -0.28622696436028017
          }
        },
        {
          "id": "4",
          "kind": "target",
          "number": 4,
          "at": {
            "row": 1,
            "col": 3,
            "x": 0.4359992061784642,
            "y": -0.041191997793272206
          }
        },
        {
          "id": "5",
          "kind": "target",
          "number": 5,
          "at": {
            "row": 1,
            "col": 4,
            "x": -0.28154310499984614,
            "y": 0.29904100181950705
          }
        },
        {
          "id": "6",
          "kind": "target",
          "number": 6,
          "at": {
            "row": 2,
            "col": 4,
            "x": 0.0009145838218435065,
            "y": -0.3607259985677136
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
