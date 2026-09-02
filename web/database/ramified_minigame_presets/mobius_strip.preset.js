// Save this file as ramified_minigame_presets/mobius_strip.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "2048"
//   ],
//   "id": "mobius-strip",
//   "label": "Mobius strip",
//   "key": "mobius_strip",
//   "file": "mobius_strip.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["mobius_strip"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "mobius-strip",
    "label": "Mobius strip",
    "lattice": "hexagonal",
    "size": "5x4",
    "surface": "N_0,2",
    "glue": "g0~00:5,1,W=1,4,E; g0~00:5,1,NW=2,4,NE; g0~00:4,1,W=2,4,E; g0~00:3,1,SW=2,4,SE; g0~00:3,1,W=3,4,E; g0~00:3,1,NW=4,4,NE; g0~00:2,1,W=4,4,E; g0~00:1,1,SW=4,4,SE; g0~00:1,1,W=5,4,E"
  };
});