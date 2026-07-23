(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.sokoban_square = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    id: 'sokoban-square',
    label: 'Sokoban square',
    gameTypes: ['Sokoban'],
    lattice: 'square',
    size: '5x5',
    surface: 'square Sokoban room',
    sokoban: {
      players: [{ row: 3, col: 2 }],
      boxes: [{ row: 3, col: 3 }],
      targets: [{ row: 3, col: 4 }],
      walls: [
        { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },
        { row: 2, col: 1 }, { row: 2, col: 5 },
        { row: 3, col: 1 }, { row: 3, col: 5 },
        { row: 4, col: 1 }, { row: 4, col: 5 },
        { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }
      ],
      ice: [{ row: 2, col: 3 }],
      energyBridges: [{ row: 4, col: 3 }]
    }
  };
});
