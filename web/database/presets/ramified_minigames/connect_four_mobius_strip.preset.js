(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_mobius_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-mobius-strip",
  "label": "M\u00f6bius strip",
  "lattice": "square",
  "size": "6x7",
  "surface": "N_1,1",
  "holes": "top",
  "glue": "g0~:6..1,7,E=1..6,1,W"
};
});
