(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.chinese_checkers_hex_strip_9x9 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "chinese-checkers-hex-strip-9x9",
  "label": "hex strip 9*9",
  "lattice": "hexagonal",
  "size": "9x9",
  "surface": "glued hexagonal strip",
  "glue": "g0:1,1,W=1,9,E; g0:1,1,SW=2,9,NE; g0:2,1,W=2,9,E; g0:3,1,NW=2,9,SE; g0:3,1,W=3,9,E; g0:3,1,SW=4,9,NE; g0:4,1,W=4,9,E; g0:5,1,NW=4,9,SE; g0:5,1,W=5,9,E; g0:5,1,SW=6,9,NE; g0:6,1,W=6,9,E; g0:7,1,NW=6,9,SE; g0:7,1,W=7,9,E; g0:7,1,SW=8,9,NE; g0:8,1,W=8,9,E; g0:9,1,NW=8,9,SE; g0:9,1,W=9,9,E",
  "chineseCheckersPlayers": ["red", "yellow"],
  "pieceSets": {
    "starts": {
      "red": [
        { "row": 1, "col": 4 },
        { "row": 1, "col": 5 },
        { "row": 1, "col": 6 },
        { "row": 2, "col": 5 }
      ],
      "yellow": [
        { "row": 8, "col": 5 },
        { "row": 9, "col": 4 },
        { "row": 9, "col": 5 },
        { "row": 9, "col": 6 }
      ]
    },
    "targets": {
      "red": [
        { "row": 8, "col": 5 },
        { "row": 9, "col": 4 },
        { "row": 9, "col": 5 },
        { "row": 9, "col": 6 }
      ],
      "yellow": [
        { "row": 1, "col": 4 },
        { "row": 1, "col": 5 },
        { "row": 1, "col": 6 },
        { "row": 2, "col": 5 }
      ]
    }
  }
};
});
