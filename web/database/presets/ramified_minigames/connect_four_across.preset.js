(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_across = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-across",
  "label": "across",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_1,1^1",
  "holes": "top",
  "removed": "4,4",
  "glue": "g0:3,4,S=5,4,N; g1:4,5,W=4,3,E"
};
});
