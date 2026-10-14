(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.n_queens_torus_puzzle = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    id: 'n-queens-torus-puzzle',
    label: 'N queens puzzle on torus',
    lattice: 'square',
    rows: 5,
    cols: 5,
    defaultBoardSize: 5,
    dynamicGomokuSize: true,
    dynamicGomokuLabelPrefix: 'toroidal N queens puzzle',
    surface: 'toroidal n-queens puzzle',
    boundaryGlueMode: 'torus',
    fideChessVariant: 'kingless-puzzle',
    fideChessPuzzle: 'n-queens',
    fideChessPuzzleGenerator: 'n-queens',
    fideChessPuzzleTorus: true
  };
});
