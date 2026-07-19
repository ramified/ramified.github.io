(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.usual_strip = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "usual-strip",
  "label": "usual strip",
  "lattice": "hexagonal",
  "size": "4x5",
  "surface": "Sigma_0,2",
  "glue": "g0:1,1,W=1,5,E; g0:1,1,SW=2,5,NE; g0:2,1,W=2,5,E; g0:3,1,NW=2,5,SE; g0:3,1,W=3,5,E; g0:3,1,SW=4,5,NE; g0:4,1,W=4,5,E"
};
});
