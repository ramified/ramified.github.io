(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_hex_usual_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-hex-usual-strip",
  "label": "hex usual strip",
  "lattice": "hexagonal",
  "size": "6x7",
  "surface": "Sigma_0,2",
  "holes": "top",
  "glue": "g0:1,7,E=1,1,W; g0:2,7,NE=1,1,SW; g0:2,7,E=2,1,W; g0:2,7,SE=3,1,NW; g0:3,7,E=3,1,W; g0:4,7,NE=3,1,SW; g0:4,7,E=4,1,W; g0:4,7,SE=5,1,NW; g0:5,7,E=5,1,W; g0:6,7,NE=5,1,SW; g0:6,7,E=6,1,W"
};
});
