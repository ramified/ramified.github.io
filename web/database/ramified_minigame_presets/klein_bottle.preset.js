(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.klein_bottle = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "klein-bottle",
  "label": "Klein bottle",
  "lattice": "square",
  "size": "4x4",
  "surface": "N_2",
  "glue": "g3~:1..4,4,E=4..1,1,W; g4:1,3..1,N=4,3..1,S; g4:1,4,N=4,4,S"
};
});
