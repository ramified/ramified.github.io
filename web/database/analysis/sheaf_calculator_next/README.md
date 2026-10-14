# Sheaf Calculator Next

Research notes and structured inventories for a proposed rebuild of [the Sheaf Calculator](../../sheaf_calculator.html).

## Contents

- Markdown files in this folder: concise behavior, rule, button-dependency, and migration notes.
- [type_hierarchy.md](type_hierarchy.md): provisional type tree plus notes separating types from traits/closure rules.
- [computation_coverage.md](computation_coverage.md): tables of implemented Hodge, Betti, polyvector, sheaf cohomology, and class-formula coverage.
- `data/`: structured inventories from the original calculator.

There is currently no rebuild page, application JavaScript, or custom stylesheet in this folder. The model direction below is a proposal, not a claim of implemented behavior.

## Model Direction

Objects use two layers:

- `basic`: properties shared by the object kind.
- `details`: additional properties for special types.

Examples:

- product projection is a special type of variety map.
- sheaf map composition is a special type of sheaf map.
- tangent sheaf is a special locally free sheaf/vector bundle when the base geometry supports it.

The original `sheaf_calculator.html`, `js/sheaf_calculator.js`, and shared CSS are not modified.
