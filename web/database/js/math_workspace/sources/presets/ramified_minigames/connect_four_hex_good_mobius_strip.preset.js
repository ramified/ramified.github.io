(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_hex_good_mobius_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-hex-good-mobius-strip",
  "label": "hex good M\u00f6bius strip",
  "lattice": "hexagonal",
  "size": "7x7",
  "surface": "N_0,2",
  "holes": "top",
  "glue": "g0~00:7,1,W=1,7,E; g0~00:7,1,NW=2,7,NE; g0~00:6,1,W=2,7,E; g0~00:5,1,SW=2,7,SE; g0~00:5,1,W=3,7,E; g0~00:5,1,NW=4,7,NE; g0~00:4,1,W=4,7,E; g0~00:3,1,SW=4,7,SE; g0~00:3,1,W=5,7,E; g0~00:3,1,NW=6,7,NE; g0~00:2,1,W=6,7,E; g0~00:1,1,SW=6,7,SE; g0~00:1,1,W=7,7,E"
};
});
