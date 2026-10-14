(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.connect_four_exchange = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "connect-four-exchange",
  "label": "exchange",
  "lattice": "square",
  "size": "6x7",
  "surface": "Sigma_1.5,1^1",
  "holes": "top",
  "cuts": "3,1=4,1; 3,2=4,2; 3,6=4,6; 3,7=4,7",
  "glue": "g0:3,7..6,S=4,2..1,N; g1:4,6..7,N=3,1..2,S"
};
});
