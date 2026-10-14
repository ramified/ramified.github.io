(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.fide_chess_8x8 = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    id: 'fide-chess-8x8',
    label: 'FIDE chess 8x8',
    lattice: 'square',
    rows: 8,
    cols: 8,
    surface: 'classic chessboard'
  };
});
