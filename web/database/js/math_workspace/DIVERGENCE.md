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

### 2026-11-24 · Typography tokens with unchanged fallbacks

UI DOM typography in the copies now reads workspace tokens, following the B3a
pattern: every wrapper is `var(--ws-*, <original literal>)`, no `--ws-*` value
is defined in the copies, and standalone pages would render exactly as before.
The values live in `css/math_workspace_typography.css` on the live page and
inherit into the shadow roots.

- Family by role, not by original face: `--ws-font-ui` (labels, buttons,
  selects, plain inputs, help, tables, badges, eyebrow labels),
  `--ws-font-code` (export/import textareas, TeX and generator inputs, matrix
  cells and result tables, vectors, keyboard bindings), `--ws-font-display`
  (dialog headings and serif math tokens such as strand relation operators).
- Size by original px (rem at 16px): `< 11.5` xs, `< 13.9` sm, `< 17.5` md,
  `< 22` lg, otherwise xl. `em`, `%`, `clamp()`, `inherit` and icon glyph
  sizes (×, ▾, arrows, drag handles, pins) are unchanged.
- Uppercase UI labels: `text-transform` → `--ws-label-transform`; the same
  rule's non-zero `letter-spacing` → `--ws-label-tracking`.
- Unchanged: canvas `ctx.font`, SVG export text, MathJax fonts, the production
  page's own `var(--sans)` / `var(--mono)`, colors, spacing and layout.
- The copied `site.css` `body` rule (`.editor-body`) also uses the UI tokens
  (user decision, 2026-11-24: full unification). MathJax scales formulas to
  the surrounding text, so workspace formulas are proportionally smaller than
  in the classic calculators; `math_workspace_math_rendering_ui_test.js` now
  compares the Dynkin Parabolic matrix spacing in em instead of px.
- Widths: `.matrix-inline-row` columns/gap read `--ws-inline-columns` /
  `--ws-inline-gap` (the workspace's shared label column);
  `.matrix-preset-buttons` reads `--ws-preset-display` (adds an inert
  `grid-template-columns` that only applies when the workspace switches it to
  grid) and `--ws-preset-btn-padding`; `.canvas-size-inline` reads
  `--ws-inline-indent` / `--ws-inline-rule`. Fallbacks are the original values.
- Mosaic `.mosaic-inline-row` uses `--ws-inline-columns` and `--ws-inline-gap`
  for its grid columns and column gap, with the original fallbacks
  `116px minmax(0, 1fr)` and `10px`. Its `.input-label` `white-space` reads
  `--ws-inline-label-wrap` (fallback `nowrap`) so the two labels wider than
  the shared column ("Contraction multiplier", "Glide damping / s⁻¹") wrap.
- Added declarations whose fallback is `inherit` (identical to the original
  cascade): `font-family: var(--ws-font-ui, inherit)` on `.canvas-size-inline`,
  `.opt-row` and `.calculator-input-settings-content`, and
  `font-size: var(--ws-text-sm, inherit)` on
  `.canvas-size-inline`. These UI labels previously inherited the editor body
  face.

| File | ui | code | display | xs | sm | md | lg/xl | label |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `category_calculator.html` | 5 | 3 | 0 | 1 | 10 | 3 | 0 | 0 |
| `double_young_diagram.html` | 18 | 4 | 0 | 4 | 20 | 4 | 0 | 0 |
| `double_young_diagram_production_process.html` | 0 | 0 | 0 | 0 | 5 | 5 | 0 | 6 |
| `dynkin_diagram_calculator.html` | 10 | 2 | 2 | 0 | 9 | 7 | 0 | 0 |
| `higher_dimensional_slice_calculator.html` | 21 | 9 | 0 | 23 | 9 | 1 | 0 | 5 |
| `matrix_calculator.html` | 4 | 4 | 0 | 2 | 9 | 0 | 0 | 4 |
| `mosaic_calculator.html` | 21 | 1 | 0 | 7 | 28 | 6 | 0 | 0 |
| `place_ramification_calculator.html` | 6 | 2 | 0 | 1 | 7 | 4 | 0 | 0 |
| `sheaf_calculator.html` | 28 | 2 | 2 | 10 | 62 | 12 | 0 | 2 |
| `sheaf_complex_calculator.html` | 26 | 2 | 2 | 9 | 63 | 12 | 0 | 2 |
| `strand_diagram_calculator.html` | 15 | 3 | 4 | 5 | 20 | 7 | 2 | 1 |
| `young_diagrams.html` (inline `style=`) | 7 | 0 | 0 | 0 | 5 | 2 | 0 | 0 |
| `css/import_export_panel.css` | 3 | 1 | 0 | 0 | 5 | 2 | 0 | 0 |
| `css/site.css` | 40 | 2 | 1 | 9 | 41 | 7 | 2 | 14 |
| `js/young_diagrams.js` (DOM `style.cssText` only) | 9 | 0 | 0 | 0 | 11 | 0 | 0 | 0 |

### 2026-10-31 · BUILD-001: duplicate debug/test API keys

In the copied `js/double_young_diagram.js`, keep one `decomposePlethysm`
entry in `window.__dbg`. In copied `js/mosaic_calculator.js`, keep one
`normalizeBackgroundMetric` and one `setTestGeometry` entry in `api.__test`.
Each removed entry referred to the same function as its retained entry;
function definitions and calculator algorithms are unchanged.

### 2026-11-25 · Palette tokens with unchanged fallbacks

Each hard-coded warm palette literal in the private calculator copies' CSS (`#fffdf8`, `#fbfaf7`, `#fff7f3`, `#3d6b4f`, `#1a1612`, `#7a6f65`, and `rgba(61,107,79,0.08|0.12|0.13)`) is wrapped as `var(--ws-TOKEN, <original literal>)` so standalone pages render unchanged; deliberate danger/map colours (`#8b3a2a`, `rgba(139,58,42,…)`), shadows (`rgba(26,22,18,…)`), and existing `var(--ws-…)` values are left alone.

| File | surface | accent/accent-tint | text/muted | danger-tint |
| --- | ---: | ---: | ---: | ---: |
| category_calculator.html | 1 | 1 | 0 | 0 |
| double_young_diagram.html | 3 | 1 | 0 | 0 |
| dynkin_diagram_calculator.html | 3 | 1 | 5 | 0 |
| higher_dimensional_slice_calculator.html | 2 | 0 | 0 | 0 |
| matrix_calculator.html | 0 | 0 | 0 | 0 |
| mosaic_calculator.html | 7 | 2 | 0 | 0 |
| place_ramification_calculator.html | 1 | 1 | 0 | 0 |
| sheaf_calculator.html | 2 | 1 | 0 | 2 |
| sheaf_complex_calculator.html | 2 | 3 | 0 | 2 |
| strand_diagram_calculator.html | 3 | 0 | 0 | 0 |
| **Total** | **24** | **10** | **5** | **4** |

- `css/site.css`: the `:root` palette (`--bg`, `--surface`, `--border`, `--text`, `--muted`, `--accent`, `--accent2`) reads `--ws-bg`, `--ws-surface-strong`, `--ws-border`, `--ws-text`, `--ws-muted`, `--ws-accent`, `--ws-accent2`; `canvas` background and the settings dialog's `rgba(255,253,248,0.99)` background read `--ws-surface`; three `rgba(61,107,79,0.08)` tints read `--ws-accent-tint-08`; `.btn:hover` reads `--ws-accent-hover`; `.btn-ghost` colour/border and its hover background/colour/border read `--ws-ghost-*` (fallbacks reproduce the brown accent2 ghost button exactly).
- Buttons (items 18/19): `.btn` letter-spacing reads `--ws-btn-tracking` (fallback `0.04em`) and gains `font-weight: var(--ws-btn-weight, normal)`; a new `.btn::first-letter { text-transform: var(--ws-btn-case, none) }` gives Sentence case without changing label text; `.calculator-input-add` ("Add key") reads `--ws-ghost-bg`, `--ws-ghost-color`, `--ws-ghost-border`, `--ws-btn-font`, `--ws-btn-weight`, each falling back to the value the original cascade produced.
- Values are defined only on the live page in `css/math_workspace_palette.css`. Canvas drawing colours set in JavaScript (for example Mosaic tile fills) are unchanged.
