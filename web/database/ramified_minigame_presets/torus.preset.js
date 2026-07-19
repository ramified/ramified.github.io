(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.torus = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "torus",
  "label": "torus",
  "lattice": "square",
  "size": "4x4",
  "surface": "M_1",
  "glue": "g3:4..1,4,E=4..1,1,W; g4:1,3..1,N=4,3..1,S; g4:1,4,N=4,4,S"
};
});
