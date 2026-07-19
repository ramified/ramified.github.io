(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.ramified_cover = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "ramified-cover",
  "label": "ramified cover",
  "lattice": "square",
  "size": "4x9",
  "surface": "ramified cover",
  "removed": "1..4,5",
  "cuts": "2,3=3,3; 2,4=3,4; 2,8=3,8; 2,9=3,9",
  "glue": "g0:2,8..9,S=3,3..4,N; g1:2,3..4,S=3,8..9,N"
};
});
