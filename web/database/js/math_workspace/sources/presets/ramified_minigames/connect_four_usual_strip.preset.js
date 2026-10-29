(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_usual_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-usual-strip",
  "label": "usual strip",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_0,2",
  "holes": "top",
  "glue": "g0:1..6,7,E=1..6,1,W"
};
});
