(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.genus_2 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "genus-2",
  "label": "genus 2",
  "lattice": "square",
  "size": "4x4",
  "surface": "M_2",
  "glue": "g0:4..3,4,E=1,3..4,N; g2:1,2..1,N=4..3,1,W; g3:4,1..2,S=2..1,1,W; g4:2..1,4,E=4,4..3,S"
};
});
