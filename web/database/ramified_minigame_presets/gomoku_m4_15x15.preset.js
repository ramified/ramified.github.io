(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.gomoku_m4_15x15 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
  "id": "gomoku-m4-15x15",
  "label": "genus 4",
  "lattice": "square",
  "size": "15x15",
  "surface": "M_4,1",
  "removed": "rect(6..10,6..10)",
  "glue": "g0:5,10..6,S=1,10..6,N; g1:10..6,11,W=10..6,15,E; g2:6..10,5,E=6..10,1,W; g3:11,6..10,N=15,6..10,S; g4:15,15..11,S=1,15..11,N; g5:11..15,15,E=11..15,1,W; g6:5..1,1,W=5..1,15,E; g7:15,5..1,S=1,5..1,N"
};
});
