# Ramified Minigames Integration Map

This document identifies the intended merge locations without changing the concurrently edited
Ramified Minigames files. Function names are the stable anchors; the line numbers below describe
the repository state inspected on 2026-08-23 and may move.

## Files to keep as modules

Keep these files intact during integration:

```text
lianliankan/lianliankan_engine.js
lianliankan/mosaic_adapter.js
```

They are UMD modules: browsers receive `window.Lianliankan` and
`window.LianliankanMosaicAdapter`, while Node tests use `module.exports`.

## `ramified_minigames.html`

1. In `#game-mode-select` (currently near line 1644), add a Lianliankan option.
2. Add any Lianliankan-only buttons/status controls beside the existing game setup controls.
   The essential controls are Refresh and, optionally, Hint.
3. Near the final scripts (currently lines 2158-2171), load:

```html
<script src="lianliankan/lianliankan_engine.js"></script>
<script src="lianliankan/mosaic_adapter.js"></script>
```

Load both before `js/ramified_minigames_setup.js`.

## `js/ramified_minigames_setup.js`

Add narrow dispatch branches at these existing anchors:

| Area | Stable anchor | Intended addition |
| --- | --- | --- |
| Registration | `GAME_MODES` near line 84 | Add `LIANLIANKAN: 'lianliankan'`. |
| Preset catalog | `PRESET_GROUP_ORDER` | Add the display group and allow suitable square presets. |
| State factory | `createSelectedGameState()` near line 23384 | Call `LianliankanMosaicAdapter.createGameFromMosaicPreset(normalizedPreset, options)`. |
| Start/stop | `beginGame()` near line 15521 | Treat the new state as a ready single-player game. |
| Input | `handleCanvasClick()` near line 6540 | Convert the hit cell to an index and call `Lianliankan.handleSelection()`. Use `{ deferMatch: true }` when the shared animation queue is used. |
| Rendering | `render()` near line 10433 | Draw kana tiles, selection, and the returned path. Consume `path.transitions`; do not run pathfinding again in the renderer. |
| Glue drawing | `drawGlueEdges()` near line 10814 | Reuse unchanged. The engine consumes the same explicit half-edge pairs. |
| Status | `syncStatusForCurrentGame()` near line 10154 | Show remaining tiles, matches, completion, and deadlock Refresh state. |
| Import | `gameStateFromDebugImportPayload()` near line 8887 | Restore tile IDs/glyphs and empty cells after the existing preset normalization. |
| Export | `stateSummary()` near line 25470 | Use `LianliankanMosaicAdapter.snapshot(game)`. |
| Public test API | final `api` object | Export the new state/type predicates needed by the main test suite. |

The existing `surfaceSuccessor()` implementation near line 22527 established the compatibility
rule used by the isolated engine:

```text
outgoing direction after glue = opposite(partner half-edge direction)
```

The explicit pairing of individual half-edges already carries chain reversal. The pathfinder does
not reinterpret `pair.reversed`; it follows the paired endpoint and its direction.

## Shared animation handoff

For a matching second click:

```js
const result = Lianliankan.handleSelection(game, index, { deferMatch: true });
if (result.kind === 'match') {
  // Draw result.path for roughly 100-300 ms using the shared animation queue.
  Lianliankan.commitPendingMatch(game);
}
```

For a non-matching glyph or blocked route, `handleSelection()` selects the newly clicked tile and
does not mutate any board tile.

## Preset requirements

Pass the normalized preset object to the adapter. Supported fields are:

```text
rows, cols (or size like "6x8")
lattice: "square"
removedTiles / backgroundRemovedTiles
cutEdges / backgroundCutEdges
gluedEdges / backgroundGluedEdges
```

Do not pass compact `removed`, `cuts`, or `glue` strings directly. Let the existing preset import
normalizer expand them first.

## Merge verification

After adding the dispatch branches:

```powershell
node lianliankan/lianliankan_engine_test.js
node js/ramified_minigames_setup_test.js
node js/mosaic_calculator_test.js
```

Then smoke-test open, torus, and direction-changing glue boards in the browser. Confirm that an
unglued exterior route remains impossible and that Refresh retains every empty cell.
