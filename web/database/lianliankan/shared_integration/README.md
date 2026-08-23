# Lianliankan Shared Minigames Merge Map

This folder records the production integration points for Lianliankan. The implementation uses
the existing Ramified Minigames page, canvas, controls, status band, statistics strip, undo stack,
and import/export panel. It does not add a second chart UI or load `lianliankan/lianliankan.css`.

The standalone `lianliankan/index.html`, `lianliankan/lianliankan_app.js`, and
`lianliankan/lianliankan.css` remain only as an isolated engine demo. They are not part of the
shared-page runtime.

## Copy Order

1. Copy the pure engine and adapter files:

   ```text
   lianliankan/lianliankan_engine.js
   lianliankan/mosaic_adapter.js
   ```

2. In `ramified_minigames.html`, find the final Billiards module scripts and insert these two
   scripts before the inline online-play configuration and before `js/ramified_minigames_setup.js`:

   ```html
   <script src="lianliankan/lianliankan_engine.js?v=20260823-1"></script>
   <script src="lianliankan/mosaic_adapter.js?v=20260823-1"></script>
   ```

3. Copy the Lianliankan additions in `js/ramified_minigames_setup.js` at the stable anchors below.
   Search for the function or constant name rather than relying on line numbers.

## Shared JavaScript Anchors

| Stable anchor | Lianliankan addition |
| --- | --- |
| `const Billiards =` | Load `Lianliankan` and `LianliankanMosaicAdapter` beside the other optional engines. |
| `const GAME_MODES =` | Register `LIANLIANKAN: 'lianliankan'`. |
| `gameModeFromUrlParam()` and `gameTypeForGameMode()` | Recognize and label the mode. |
| `gameModesForPreset()` | Offer Lianliankan for square-lattice presets only. |
| `defaultPresetIdForMode()` | Prefer `boundary-glue-board`. |
| `canvasStartPromptCopy()` | Add the at-most-two-turn rule without changing the overlay markup. |
| `createSelectedGameState()` / `beginSelectedGame()` | Dispatch to `createLianliankanState()` / `beginLianliankanGame()`. |
| `handleCanvasClick()` | Dispatch occupied-cell selection to `handleLianliankanCanvasClick()`. |
| `render()` after `drawGlueEdges()` | Draw kana tiles and the engine-returned path on the existing canvas geometry. |
| `syncStatusForCurrentGame()` | Report selection, remaining tiles, completion, and deadlock. |
| `syncStats()` | Reuse the five existing statistic rows. |
| `syncControls()` | Relabel the existing Begin button to `Refresh remaining tiles` only during deadlock. |
| `cloneGameState()` | Use adapter cloning so the existing undo/redo stack works. |
| `debugExportPayload()` / `gameStateFromDebugImportPayload()` / `stateSummary()` | Serialize game data through the existing panel without changing panel UI or formats for other games. |
| final public `api` object | Export the Lianliankan state factory and predicate for tests. |

To find every production insertion after branches have moved, search:

```powershell
rg -n "Lianliankan|LIANLIANKAN|lianliankan" js/ramified_minigames_setup.js ramified_minigames.html
```

## CSS Contract

No shared CSS changes are required. Lianliankan tiles and paths are canvas-rendered inside the
existing board. Existing responsive canvas sizing, fullscreen behavior, cards, toolbars, status,
and import/export styling remain untouched.

Do not add this to the shared page:

```html
<link rel="stylesheet" href="lianliankan/lianliankan.css">
```

## Behavior Boundaries

- The mode is single-player and is not added to `ONLINE_SUPPORTED_GAME_MODES`.
- Ordinary outside-board travel remains blocked.
- Existing Mosaic cut edges and explicit glue pairs are preserved by the adapter.
- Glue direction mapping remains `opposite(partner half-edge direction)`.
- A successful match is shown for 220 ms, then committed.
- Deadlock refresh preserves occupied positions, remaining symbols, removed cells, and topology.
- No Lianliankan-only import/export controls, chart controls, or page sections are introduced.

## Verification

Run from `web/database`:

```powershell
node lianliankan/lianliankan_engine_test.js
node lianliankan/ramified_minigames_integration_test.js
node js/ramified_minigames_import_export_test.js
node --check js/ramified_minigames_setup.js
```

The broad `js/ramified_minigames_setup_test.js` currently reaches an unrelated existing Go test
failure at `testGoCaptureSuicideKoAndScoring` (`ready` versus expected `gameover`). The dedicated
Lianliankan and shared import/export contracts pass independently.
