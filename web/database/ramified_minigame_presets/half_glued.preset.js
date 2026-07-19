(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.half_glued = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "half-glued",
  "label": "half-glued",
  "lattice": "square",
  "size": "4x4",
  "surface": "Sigma_1,1",
  "glue": "g0:1,1..2,N=4,3..4,S; g1:3..4,1,W=1..2,4,E"
};
});
