# Lianliankan for Mosaic Calculator

This folder is an isolated implementation of `implement_plan/Lianliankan for Mosaic Calculator.md`.
It deliberately does not modify `../ramified_minigames.html`, `../js/ramified_minigames_setup.js`,
or `../js/mosaic_calculator.js`, because those files are being changed on another branch.

## Contents

- `lianliankan_engine.js` - pure board model, square topology, glue-aware pathfinder,
  matching, selection, deadlock detection, refresh, and deterministic recovery.
- `mosaic_adapter.js` - adapter for normalized Mosaic preset data and canvas path segments.
- `index.html`, `lianliankan.css`, `lianliankan_app.js` - standalone playable canvas prototype.
- `lianliankan_engine_test.js` - deterministic tests for P01-P08, G01-G06, M01-M05,
  D01-D04, R01-R06, and the Mosaic adapter.
- `INTEGRATION.md` - exact future merge areas in Ramified Minigames.

## Run

The prototype has no build step and can be opened directly:

```text
lianliankan/index.html
```

Run the tests from the `web/database` directory:

```powershell
node lianliankan/lianliankan_engine_test.js
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

## Scope

The engine currently accepts square lattices because the game rule is orthogonal. The adapter
expects preset glue/cut/removal data to have already been normalized into arrays, as
`normalizePresetPayload()` does in `js/ramified_minigames_setup.js`. Compact Mosaic DSL strings
should continue to be parsed by the existing import layer before calling this adapter.
