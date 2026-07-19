// Save this file as ramified_minigame_presets/trefoil.preset.js
// Add/edit the matching row in ramified_minigame_presets/presets.js; gameTypes lives there.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["trefoil"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "trefoil",
    "label": "trefoil",
    "lattice": "square",
    "size": "12x13",
    "surface": "Sigma_1,3",
    "removed": "1,1; 1,7; 1,8; 1,9; 1,10; 1,11; 1,12; 1,13; 2,1; 3,1; 4,1; 5,1; 6,1; 7,1; 7,7; 7,8; 7,9; 7,10; 7,11; 7,12; 7,13; 8,8; 8,9; 8,10; 8,11; 8,12; 8,13; 9,8; 9,9; 9,10; 9,11; 9,12; 9,13; 10,8; 10,9; 10,10; 10,11; 10,12; 10,13; 11,8; 11,9; 11,10; 11,11; 11,12; 11,13; 12,8; 12,9; 12,10; 12,11; 12,12; 12,13",
    "glue": "g0:12..8,7,E=6,12..8,S; g1:2,12..8,N=12..8,1,W; g2:6..2,13,E=6..2,2,W; g3:1,6..2,N=12,6..2,S"
  };
});
