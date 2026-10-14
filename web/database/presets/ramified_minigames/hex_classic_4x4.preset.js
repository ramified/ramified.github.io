(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.hex_classic_4x4 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "hex-classic-4x4",
  "label": "hex classic 4*4",
  "lattice": "hexagonal",
  "size": "4x4",
  "surface": "hexagonal grid"
};
});
