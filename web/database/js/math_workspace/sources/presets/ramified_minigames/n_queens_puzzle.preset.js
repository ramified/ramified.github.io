(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.n_queens_puzzle = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    id: 'n-queens-puzzle',
    label: 'N queens puzzle',
    lattice: 'square',
    rows: 8,
    cols: 8,
    defaultBoardSize: 8,
    dynamicGomokuSize: true,
    dynamicGomokuLabelPrefix: 'N queens puzzle',
    surface: 'open n-queens puzzle',
    fideChessVariant: 'kingless-puzzle',
    fideChessPuzzle: 'n-queens',
    fideChessPuzzleGenerator: 'n-queens'
  };
});
