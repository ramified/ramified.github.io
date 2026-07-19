(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_classic = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-classic",
  "label": "classical n*n",
  "lattice": "square",
  "size": "15x15",
  "surface": "square grid",
  "dynamicGomokuSize": true,
  "dynamicGomokuLabelPrefix": "classical"
};
});
