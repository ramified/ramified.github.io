(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_hex_bad_mobius_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-hex-bad-mobius-strip",
  "label": "hex bad M\u00f6bius strip",
  "lattice": "hexagonal",
  "size": "6x7",
  "surface": "N_0,2^10",
  "holes": "top",
  "glue": "g0~:6,7,E=1,1,W; g0~:6,7,NE=1,1,SW; g0~:5,7,E=2,1,W; g0~:4,7,SE=3,1,NW; g0~:4,7,E=3,1,W; g0~:4,7,NE=3,1,SW; g0~:3,7,E=4,1,W; g0~:2,7,SE=5,1,NW; g0~:2,7,E=5,1,W; g0~:2,7,NE=5,1,SW; g0~:1,7,E=6,1,W"
};
});
