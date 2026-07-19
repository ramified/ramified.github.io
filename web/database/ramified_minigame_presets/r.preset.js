// Save this file as ramified_minigame_presets/r.preset.js
// Add/edit the matching row in ramified_minigame_presets/presets.js; gameTypes lives there.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["r"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "r",
    "label": "R",
    "lattice": "square",
    "size": "7x7",
    "surface": "Sigma_1,3^1",
    "removed": "1,7; 3,3; 3,4; 3,5; 5,7; 6,4; 7,4",
    "glue": "g0:2,3..5,S=4,3..5,N; g1:3,6,W=3,2,E; g2:4,7,S=6,7,N; g3:7..6,3,E=7..6,5,W",
    "holes": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 2,7"
  };
});
