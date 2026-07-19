(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_random_glue = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-random-glue",
  "label": "random glue n*n",
  "lattice": "square",
  "size": "15x15",
  "surface": "random boundary glue",
  "randomGlue": true,
  "dynamicGomokuSize": true,
  "dynamicGomokuLabelPrefix": "random glue"
};
});
