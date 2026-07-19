(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.chinese_checkers_hex_rhombus_9x9 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "chinese-checkers-hex-rhombus-9x9",
  "label": "hex rhombus 9*9",
  "lattice": "hexagonal",
  "size": "9x9",
  "surface": "hexagonal rhombus",
  "chineseCheckersPlayers": ["red", "yellow"],
  "pieceSets": {
    "starts": {
      "red": [
        { "row": 1, "col": 1 },
        { "row": 1, "col": 2 },
        { "row": 2, "col": 1 },
        { "row": 2, "col": 2 }
      ],
      "yellow": [
        { "row": 8, "col": 8 },
        { "row": 8, "col": 9 },
        { "row": 9, "col": 8 },
        { "row": 9, "col": 9 }
      ]
    },
    "targets": {
      "red": [
        { "row": 8, "col": 8 },
        { "row": 8, "col": 9 },
        { "row": 9, "col": 8 },
        { "row": 9, "col": 9 }
      ],
      "yellow": [
        { "row": 1, "col": 1 },
        { "row": 1, "col": 2 },
        { "row": 2, "col": 1 },
        { "row": 2, "col": 2 }
      ]
    }
  }
};
});
