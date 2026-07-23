# Ramified minigame presets

Use one registry file plus one `.preset.js` file per saved minigame background. Add game membership and file metadata to `presets.js`, then put only the compact board/background object in the matching preset file.

Coordinates are 1-based. Tiles use `row,col`; boundary edges use `row,col,dir`. Square directions are `E/S/W/N`; hex directions are `E/SE/SW/W/NW/NE`.

Example:

`presets.js` row:

```js
{ id: 'boundary-glue-board', label: 'boundary glue board', key: 'boundary_glue_board', file: 'boundary_glue_board.preset.js', gameTypes: ['2048', 'Gomoku', 'Go', 'Reversi'] }
```

`boundary_glue_board.preset.js` data:

```js
{
  id: 'boundary-glue-board',
  label: 'boundary glue board',
  lattice: 'square',
  size: '4x4',
  surface: 'torus',
  boundaryGlueBoard: true,
  boundaryGlueMode: 'torus'
}
```

Concise helpers:

- `size: 'rowsxcols'` sets board dimensions.
- `gameTypes` belongs in `presets.js` only. Use multiple entries such as `['Connect Four', 'Gomoku']` there for shared presets.
- `removed: 'rect(6..10,6..10)'` removes a rectangle.
- `holes: 'top'` makes Connect Four input holes along the top row.
- Glue ranges expand pairwise, e.g. `1..4,4,E=1..4,1,W`.
- `g0~:` marks reversed glue. `g0~00:` also sets both glue-arrow display flags to false.
- Procedural presets can use macros such as `generator: 'rubiksCube', cubeSize: 3`.
