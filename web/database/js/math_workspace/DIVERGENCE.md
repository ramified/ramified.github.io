# Workspace calculator source copies

- Source commit: `e52c35cc6e6b8fc7843f704cece92fe491808465`.
- Copy date: 2026-10-29 (Europe/Berlin).
- Original source root: `web/database/`.
- Copy root: `web/database/js/math_workspace/sources/`.
- Paths are preserved relative to the original source root.
- Inventory and original/copy hashes: [SOURCE_MANIFEST.json](SOURCE_MANIFEST.json).
- Build and test evidence: [SOURCE_VALIDATION.md](SOURCE_VALIDATION.md).

The user approved the newer source commit above as the migration baseline.
It is distinct from the earlier historical reference tag
`classic-reference-2026-10-28`, which remains at
`c3187ea5c5d9700dce6b85acf647840b1433056d`.

The copies initially match all 140 original files byte-for-byte and by
`git hash-object`. The initial copy bundle matched the approved baseline output bytes:
`6a87938ecd2bdf8246cd3c71db2ca6c84041d5643c6e4369ed5942fc087f2b1f`.

## Changes made only in the copies

### 2026-10-29 · B3a: UI CSS literals with unchanged fallbacks

Only literal colors in confirmed UI DOM CSS are wrapped. No --ws-* values
are defined. Every fallback preserves the original literal exactly.
Canvas, SVG, drawing labels/handles, palettes, presets, saved data colors,
and all standalone stylesheets remain unchanged.

| Context | Original literal | Variable | Occurrences |
| --- | --- | --- | ---: |
| A | `#8b3a2a` | `--ws-danger` | 1 |
| A | `#fff7f3` | `--ws-danger-tint` | 1 |
| A | `#fffdf8` | `--ws-surface` | 3 |
| A | `#ffffff` | `--ws-surface-strong` | 3 |
| B | `rgba(0,0,0,0.22)` | `--ws-shadow` | 9 |
| B | `rgba(61,107,79,0.06)` | `--ws-accent-tint` | 9 |

Files (paths relative to sources/):

- `double_young_diagram_production_process.html`: `#ffffff` × 2.
- `higher_dimensional_slice_calculator.html`: `#fffdf8` × 1, `#8b3a2a` × 1.
- `js/calculator_cards.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/dynkin_diagram_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/matrix_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/mosaic_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/place_ramification_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/sheaf_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/sheaf_complex_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/strand_diagram_calculator.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `js/young_diagrams.js`: `rgba(61,107,79,0.06)` × 1, `rgba(0,0,0,0.22)` × 1.
- `matrix_calculator.html`: `#fffdf8` × 2, `#ffffff` × 1, `#fff7f3` × 1.

The historical inventory/hash/test records describe the unchanged initial
copy. The current build is regenerated as part of B3a. The restoration proof
and validation report are stored outside the repository.

Record subsequent workspace-only source changes here. Do not write them back
to the frozen classic calculator pages, scripts, styles, workers, or presets.

### 2026-10-31 · Sheaf Display connector endpoints

The copied `js/sheaf_calculator.js` and `js/sheaf_complex_calculator.js` now
clip sheaf-to-base connector lines with the same label-boundary calculation
as straight Map arrows. The painted line stops at the labels instead of
extending to their centers; object positions and Map geometry are unchanged.

### 2026-10-31 · BUILD-001: duplicate debug/test API keys

In the copied `js/double_young_diagram.js`, keep one `decomposePlethysm`
entry in `window.__dbg`. In copied `js/mosaic_calculator.js`, keep one
`normalizeBackgroundMetric` and one `setTestGeometry` entry in `api.__test`.
Each removed entry referred to the same function as its retained entry;
function definitions and calculator algorithms are unchanged.
