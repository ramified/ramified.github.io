(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_all_horizontal = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-all-horizontal",
  "label": "all horizontal",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_1,5",
  "holes": "top",
  "glue": "g0:6,5,S=6,1,W; g1:5,7,E=6,3,S; g2:6,6,S=4,1,W; g3:3,7,E=6,2,S; g4:6,7,S=2,1,W; g5:1,7,E=6,1,S"
};
});
