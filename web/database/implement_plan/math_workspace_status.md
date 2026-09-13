# Mathematical workspace implementation status

The additional static page is `math_workspace.html`. Existing calculators remain available. This is an incremental implementation, not an all-family parity release.

## Implemented foundation

Assets, revision history, linked independent views, declarative recipes, worker execution and cancellation, atomic recipe application, undo/redo, transitive stale-result handling, dependency-safe deletion, IndexedDB autosave, versioned JSON validation, collision-remapped imports and selected-asset dependency exports are implemented. Interface strings have paired English and Simplified Chinese keys.

The registry in `js/math_workspace/kernel.mjs` is the executable operation inventory. `assets/math_workspace_catalog.json` includes native acceptance recipes and source control evidence. Source controls still marked `needs-semantic-review` are not audited capabilities and do not satisfy the parity release gate.

## Current migration coverage

- Partitions, hook data, tableaux and selected representation decompositions; exact symmetric-function basis operations and finite specialisation.
- Root systems, Cartan matrices, roots and selected weight/representation computations.
- Exact rational matrices; explicit numerical conversion, QR, SVD, polar and Bruhat decompositions, matrix exponential and reusable factors. Numerical algorithms retain the legacy calculator's tolerance and limitations.
- Rational point/frame conversions, standard polytopes, exact affine two-dimensional sections, sphere sections and existing toric analysis.
- Selected variety/Hodge, line-sheaf cohomology and zero-differential complex constructions; these remain formal specifications with stated limitations.
- Existing strand engines and permutation conversion; surface snapshot homology; symbolic category presentations and functors.
- Local ramification calculations, saved external results, and lookup through the existing LMFDB proxy.
- Selected legacy JSON adapters retain the original payload in whole-project exports. They reject unsupported options rather than claiming complete legacy import parity.

## Remaining release work

Complete the semantic capability audit and migrate all remaining native editors, specialised displays, operations, presets and export formats. In particular, full matrix coefficient domains/canonical forms, Dynkin and representation workflows, mosaic geometry/topology tools, sheaf/maps/classes/complexes, and specialised category and place interactions remain incomplete. Extend mathematically checked cross-family conversions. Execute generated SageMath/Macaulay2 examples in those systems before marking exports verified. Neither CAS execution nor live remote-service availability is claimed by offline fixtures.

## Verification

Run `node js/math_workspace/workspace_test.mjs`, `python js/math_workspace/extract_legacy.py --check`, and `node js/math_workspace/build_catalog.mjs --check`. Regenerate the catalog without `--check` after registry changes. Run the relevant original calculator regression tests after extraction changes. Browser verification additionally covers worker execution, linked views, editing/staleness, persistence and both interface languages.

Theorem Graph and Ramified Minigames remain separate applications. No old calculator should be retired while its migration status remains partial.
