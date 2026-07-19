(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_top_fight = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-top-fight",
  "label": "top fight",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_1,1",
  "holes": "top",
  "glue": "g0:6,3,S=6,7,E; g1:6,1,W=6,5,S; g2:6,2,S=5,7,E; g3:5,1,W=6,6,S; g4:4,1,W=6,7,S; g5:6,1,S=4,7,E"
};
});
