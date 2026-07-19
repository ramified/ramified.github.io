(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.twisted_torus = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "twisted-torus",
  "label": "twisted torus",
  "lattice": "square",
  "size": "4x4",
  "surface": "M_2,1",
  "glue": "g0:1,1..3,N=4,2..4,S; g1:1..3,4,E=2..4,1,W; g2:1,4,N=4,1,S; g3:4,4,E=1,1,W"
};
});
