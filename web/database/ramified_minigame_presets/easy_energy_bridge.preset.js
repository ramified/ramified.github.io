// Save this file as ramified_minigame_presets/easy_energy_bridge.preset.js
// Add this entry to ramified_minigame_presets/presets.js:
// {
//   "gameTypes": [
//     "Sokoban"
//   ],
//   "id": "easy-energy-bridge",
//   "label": "easy energy bridge",
//   "key": "easy_energy_bridge",
//   "file": "easy_energy_bridge.preset.js"
// },
// Store gameTypes in presets.js only; do not repeat them in this preset file.
(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA["easy_energy_bridge"] = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    "id": "easy-energy-bridge",
    "label": "easy energy bridge",
    "lattice": "square",
    "size": "3x5",
    "surface": "Sigma_0,1",
    "removed": "1,1; 1,2; 3,1; 3,2",
    "sokoban": {
      "targets": "1,3; 3,5",
      "energyBridges": "1,3; 3,3",
      "players": "2,1"
    },
    "billiards": {
      "pockets": []
    }
  };
});