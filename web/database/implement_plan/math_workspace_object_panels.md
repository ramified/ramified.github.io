# Mathematical object panels

The Young diagram migration uses three separate records:

- **Asset**: a named mathematical object in the existing workspace asset store.
  Young diagrams own their row vector and ordinary/generalized type. Lie assets
  own their family and rank.
- **Computation**: a property operation with ordered, typed asset references,
  operation options, and a current/stale/missing result state.
- **Panel**: an Input or Property presentation, including its position, size,
  collapse state, and editor instance. Moving or closing a panel does not delete
  its asset or change its computation inputs.

`js/math_workspace_objects.js` owns the panel and computation records.
`js/math_workspace.js` provides the authoritative asset mutations and workspace
placement. State remains scoped to the current page session, like the existing
Assets explorer.

## Presentation

A Young Input occupying the full main area uses the existing Young Diagram
editor. In the side column or a split main area it uses one compact diagram from
the existing Double Young editor, initially 5 by 5. Larger objects expand the
grid. Grid resizing cannot clip an asset. Generalized signed rows retain their
signed editor at either size.

There is no Double Young workspace view. Two independent Inputs can occupy the
main area together. Properties can also move between the main area and side
column with their references and results intact.

## Property inputs and invalidation

Each Property selects explicit assets; its inputs do not follow the focused
main panel. Repeated references are allowed. Branching rules expose a second
Young input only for diagonal rules, retaining but ignoring that reference when
a single-input rule is selected. Grassmannian products derive their rectangle
from the selected Grassmannian asset.

Changing referenced mathematical data invalidates heavy results. Light
properties refresh immediately. Deletion retains the missing reference and
requires a replacement; it never substitutes another object. Export omits stale
results. Input import updates only its explicitly selected destination asset.

## Native adapters and checks

The adapters in
`archive/math_workspace_version1/js/math_workspace/editors/object_panels.mjs`
project assets into the existing calculator engines at bundle build time.
Standalone calculator source pages are unchanged.

Run `node js/math_workspace_objects_test.js` and
`node js/math_workspace_objects_ui_test.js` for typed references, native
calculations, input drafts, shared object updates, panel placement, and missing
inputs. Also run the existing asset, card identity, autosave, input draft, drag,
and canvas appearance regression tests. Rebuild with
`node js/build_math_workspace_native_editors.mjs` and verify with `--check`.
