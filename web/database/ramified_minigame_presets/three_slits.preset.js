// Save this file as ramified_minigame_presets/three_slits.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Go"
//   ],
//   "id": "three-slits",
//   "label": "three_slits",
//   "key": "three_slits",
//   "file": "three_slits.preset.js"
// }
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["three_slits"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "three-slits",
    "label": "three_slits",
    "lattice": "square",
    "size": "19x19",
    "surface": "Sigma_13,3",
    "cuts": "10,8=11,8; 10,9=11,9; 10,10=11,10; 10,11=11,11; 10,12=11,12; 16,4=17,4; 16,5=17,5; 16,6=17,6; 16,7=17,7; 16,8=17,8; 16,9=17,9; 16,10=17,10; 16,11=17,11; 16,12=17,12; 16,13=17,13; 16,14=17,14; 16,15=17,15; 16,16=17,16; 4,6=5,6; 4,7=5,7; 4,8=5,8; 4,9=5,9; 4,10=5,10; 4,11=5,11; 4,12=5,12; 4,13=5,13; 4,14=5,14",
    "glue": "g0:1,1..19,N=19,1..19,S; g1:19..1,1,W=19..1,19,E"
  };
});