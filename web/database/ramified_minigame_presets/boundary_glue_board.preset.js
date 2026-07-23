(function(root, factory) {
  const preset = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = preset;
  if (root) {
    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};
    root.RAMIFIED_MINIGAME_PRESET_DATA.boundary_glue_board = preset;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {
  return {
    id: 'boundary-glue-board',
    label: 'boundary glue board',
    lattice: 'square',
    size: '4x4',
    surface: 'torus',
    boundaryGlueBoard: true,
    boundaryGlueMode: 'torus'
  };
});
