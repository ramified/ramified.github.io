(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_high_hit_2 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-high-hit-2",
  "label": "high hit2",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_0,3",
  "holes": "top",
  "glue": "g0:6,7,S=3,7,E; g1:4,1,W=6,1,S"
};
});
