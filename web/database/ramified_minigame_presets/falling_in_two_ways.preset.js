// Save this file as ramified_minigame_presets/falling_in_two_ways.preset.js
// Add/edit the matching row in ramified_minigame_presets/presets.js; gameTypes lives there.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["falling_in_two_ways"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "falling-in-two-ways",
    "label": "falling in two ways",
    "lattice": "hexagonal",
    "size": "8x8",
    "surface": "Sigma_7.5,10",
    "cuts": "1,1=2,1; 1,2=2,1; 1,2=2,2; 1,3=2,3; 1,3=2,2; 1,4=2,3; 1,4=2,4; 1,5=2,4; 1,5=2,5; 1,6=2,5; 1,6=2,6; 1,7=2,6; 1,7=2,7; 1,8=2,7; 1,8=2,8",
    "glue": "g0:2,8,E=2,1,W; g0:2,8,SE=3,1,NW; g0:3,8,E=3,1,W; g0:4,8,NE=3,1,SW; g0:4,8,E=4,1,W; g0:4,8,SE=5,1,NW; g0:5,8,E=5,1,W; g0:6,8,NE=5,1,SW; g0:6,8,E=6,1,W; g0:6,8,SE=7,1,NW; g0:7,8,E=7,1,W; g0:8,8,NE=7,1,SW; g0:8,8,E=8,1,W; g1:1,8,E=1,1,W; g2:1,2,SE=2,1,NE; g3:1,3,SE=2,2,NE; g4:1,4,SE=2,3,NE; g5:1,5,SE=2,4,NE; g6:1,6,SE=2,5,NE; g7:1,7,SE=2,6,NE; g8:1,8,SE=2,7,NE; g9:1,1,SE=2,8,NE",
    "holes": "1,1; 1,2; 1,3; 1,4; 1,5; 1,6; 1,7; 1,8; 2,1; 2,2; 2,3; 2,4; 2,5; 2,6; 2,7; 2,8"
  };
});
