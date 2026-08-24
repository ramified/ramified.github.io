(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA['4_4_classic'] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "4-4-classic",
    "label": "4*4 classic",
    "lattice": "hexagonal",
    "size": "4x4",
    "surface": "Sigma_0,2",
    "glue": "g0:3,1,NW=4,1,SE",
    "pieceSets": {
      "starts": {
        "black": [{ "row": 3, "col": 1 }, { "row": 4, "col": 1 }],
        "white": [{ "row": 1, "col": 1 }, { "row": 2, "col": 1 }, { "row": 3, "col": 2 }, { "row": 4, "col": 2 }],
        "red": [{ "row": 1, "col": 2 }, { "row": 2, "col": 2 }, { "row": 3, "col": 3 }, { "row": 4, "col": 3 }],
        "yellow": [{ "row": 1, "col": 3 }, { "row": 2, "col": 3 }, { "row": 3, "col": 4 }, { "row": 4, "col": 4 }],
        "blue": [{ "row": 1, "col": 4 }, { "row": 2, "col": 4 }]
      },
      "targets": {}
    },
    "pieces": [
      { "row": 3, "col": 1, "role": "start", "color": "black", "side": "black" },
      { "row": 4, "col": 1, "role": "start", "color": "black", "side": "black" },
      { "row": 1, "col": 1, "role": "start", "color": "white", "side": "white" },
      { "row": 2, "col": 1, "role": "start", "color": "white", "side": "white" },
      { "row": 3, "col": 2, "role": "start", "color": "white", "side": "white" },
      { "row": 4, "col": 2, "role": "start", "color": "white", "side": "white" },
      { "row": 1, "col": 2, "role": "start", "color": "red" },
      { "row": 2, "col": 2, "role": "start", "color": "red" },
      { "row": 3, "col": 3, "role": "start", "color": "red" },
      { "row": 4, "col": 3, "role": "start", "color": "red" },
      { "row": 1, "col": 3, "role": "start", "color": "yellow" },
      { "row": 2, "col": 3, "role": "start", "color": "yellow" },
      { "row": 3, "col": 4, "role": "start", "color": "yellow" },
      { "row": 4, "col": 4, "role": "start", "color": "yellow" },
      { "row": 1, "col": 4, "role": "start", "color": "blue" },
      { "row": 2, "col": 4, "role": "start", "color": "blue" }
    ]
  };
});
