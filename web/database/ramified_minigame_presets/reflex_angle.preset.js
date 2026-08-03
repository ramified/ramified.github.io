// Save this file as ramified_minigame_presets/reflex_angle.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Go"
//   ],
//   "id": "reflex-angle",
//   "label": "reflex angle",
//   "key": "reflex_angle",
//   "file": "reflex_angle.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["reflex_angle"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "reflex-angle",
    "label": "reflex angle",
    "lattice": "square",
    "size": "17x17",
    "surface": "Sigma_2,1^1",
    "removed": "rect(6..12,6..12)",
    "glue": "g0:1,1..5,N=17,13..17,S; g1:17..13,1,W=5..1,17,E; g2:1,6..17,N=17,1..12,S; g3:12..1,1,W=17..6,17,E"
  };
});