# Lianliankan for Mosaic Calculator

This folder implements `implement_plan/Lianliankan for Mosaic Calculator.md`. The production game
is integrated into `../ramified_minigames.html` through the existing shared controller, canvas,
controls, styles, undo stack, and state panel. The standalone page remains an engine demo only.

## Contents

- `lianliankan_engine.js` - pure board model, square topology, glue-aware pathfinder,
  matching, selection, deadlock detection, refresh, and deterministic recovery.
- `mosaic_adapter.js` - adapter for normalized Mosaic preset data and canvas path segments.
- `index.html`, `lianliankan.css`, `lianliankan_app.js` - standalone engine demo; not loaded by the shared page.
- `lianliankan_engine_test.js` - deterministic tests for P01-P08, G01-G06, M01-M05,
  D01-D04, R01-R06, and the Mosaic adapter.
- `ramified_minigames_integration_test.js` - shared state, undo-clone, mode, and status round-trip contract.
- `shared_integration/README.md` - exact copy-paste anchors and the no-new-CSS contract.

## Run

The production game is selected from the Game control in:

```text
ramified_minigames.html
```

Run the tests from the `web/database` directory:

```powershell
node lianliankan/lianliankan_engine_test.js
node lianliankan/ramified_minigames_integration_test.js
```

## Implemented rules

- Identical internal tile IDs match; rendered glyph text is never used as identity.
- Empty playable cells can be traversed, while occupied cells block a path.
- Paths use at most two turns and prefer fewer turns, then fewer steps, then N/E/S/W order.
- Ordinary exterior space is blocked. No padded empty border is created.
- Explicit Mosaic glue pairs can cross a boundary. The outgoing direction is the opposite
  of the partner half-edge direction, matching `surfaceSuccessor()` in Ramified Minigames.
- Glue crossings do not themselves count as turns, and `(cell, direction, turns)` visitation
  makes glue cycles finite.
- Completion takes precedence over deadlock.
- Refresh shuffles only currently occupied cells, preserves counts and topology, retries at
  most 50 times by default, and then attempts deterministic recovery.

## Shared UI scope

The engine currently accepts square lattices because the game rule is orthogonal. The adapter
expects preset glue/cut/removal data to have already been normalized into arrays, as
`normalizePresetPayload()` does in `js/ramified_minigames_setup.js`. Compact Mosaic DSL strings
should continue to be parsed by the existing import layer before calling this adapter.

The production runtime does not load `lianliankan.css` and does not add a separate chart,
toolbar, metrics section, or import/export panel. Kana tiles and connection paths render on the
existing shared canvas.
