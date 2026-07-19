// Save this file as ramified_minigame_presets/xi.preset.js
// Add/edit the matching row in ramified_minigame_presets/presets.js; gameTypes lives there.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["xi"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "xi",
    "label": "囍",
    "lattice": "square",
    "size": "14x11",
    "surface": "Sigma_0,27",
    "removed": "1,1; 1,2; 1,4; 1,5; 1,6; 1,7; 1,8; 1,10; 1,11; 3,1; 3,2; 3,4; 3,5; 3,6; 3,7; 3,8; 3,10; 3,11; 5,1; 5,2; 5,4; 5,5; 5,6; 5,7; 5,8; 5,10; 5,11; 6,6; 7,2; 7,3; 7,4; 7,6; 7,8; 7,9; 7,10; 8,6; 9,1; 9,2; 9,4; 9,5; 9,6; 9,7; 9,8; 9,10; 9,11; 11,1; 11,2; 11,4; 11,5; 11,6; 11,7; 11,8; 11,10; 11,11; 12,6; 13,2; 13,3; 13,4; 13,6; 13,8; 13,9; 13,10; 14,6",
    "glue": "g0:4,1..2,N=2,1..2,S; g3:4,10..11,N=2,10..11,S; g4:6,1..2,N=4,1..2,S; g5:6,4..5,N=4,4..5,S; g6:6,7..8,N=4,7..8,S; g7:6,10..11,N=4,10..11,S; g8:10,1..2,N=8,1..2,S; g9:12,1..2,N=10,1..2,S; g10:12,4..5,N=10,4..5,S; g11:12,7..8,N=10,7..8,S; g12:12,10..11,N=10,10..11,S; g13:8,2..4,N=6,2..4,S; g14:8,8..10,N=6,8..10,S; g15:14,2..4,N=12,2..4,S; g16:14,8..10,N=12,8..10,S; g17:10,10..11,N=8,10..11,S; g18:4,4..8,N=2,4..8,S; g19:10,4..5,N=8,4..5,S; g20:10,7..8,N=8,7..8,S; g21:10,6,N=4,6,S",
    "holes": "1,3; 1,9; 2,1; 2,2; 2,4; 2,5; 2,6; 2,7; 2,8; 2,10; 2,11"
  };
});
