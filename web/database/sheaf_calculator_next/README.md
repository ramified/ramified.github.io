# Sheaf Calculator Next

Fresh rebuild workspace for `sheaf_calculator.html`.

## Contents

- `analysis/`: concise behavior, rule, button-dependency, and migration notes.
- `analysis/type_hierarchy.md`: provisional type tree plus notes separating types from traits/closure rules.
- `analysis/computation_coverage.md`: tables of implemented Hodge, Betti, polyvector, sheaf cohomology, and class-formula coverage.
- `data/`: structured inventories from the original calculator.
- `index.html`: new static page using the existing shared stylesheet `../css/site.css`.
- `js/app.js`: typed object model and UI logic.

No custom CSS page is used for the new website.

## Model Direction

Objects use two layers:

- `basic`: properties shared by the object kind.
- `details`: additional properties for special types.

Examples:

- product projection is a special type of variety map.
- sheaf map composition is a special type of sheaf map.
- tangent sheaf is a special locally free sheaf/vector bundle when the base geometry supports it.

The original `sheaf_calculator.html`, `js/sheaf_calculator.js`, and shared CSS are not modified.
