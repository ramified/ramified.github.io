# Mathematical object panels

## Workspace polish and Design Lab

Asset icons are derived by `MathWorkspaceAssetIcons`: nonempty ordinary Young
diagrams fit within 5 by 5; generalized diagrams have at most five rows and a
total signed span of six cells. Empty diagrams retain the generic Young icon.
Small Strands use the same `StrandDrawing` routines as the full editor. Other
single-letter mathematical labels use MathJax, with a generic fallback.
Generic icons use a muted color without a corner marker. Details columns scroll
inside the Assets view when docked; they cannot widen the sidebar or page.
Strands viewport redraws build the current diagram data before rendering.

The Design Lab is a transient movable panel in the production workspace. Open
`math_workspace.html?designLab=1` or press Ctrl+Alt+Shift+D outside editable
controls. Its appearance overrides and panel placement never enter workspace
backups. Copy design settings exports a candidate preset; Exit removes the
overrides. There is no second workspace implementation or authentication gate.

LR has an optional `nu` target; its result is the multiplicity in the selected
stable/fixed-rank decomposition. Incomplete dimension checks cannot certify a
coefficient. Plethysm saves `{mode, degree}` in computation `settings`, separately
from native control `options`. New single-representation panels default to
Symmetric power at degree 2. Power modes bind matching Young assets without
rewriting shared objects. Old panels without settings restore in Advanced mode.

Automatically created defaults are collected as soon as their last owner releases
them, after the current synchronous binding transaction. Roots include user-created
assets, saved panel/slot bindings, dirty input drafts, and explicit scene objects;
dependencies are followed transitively. Hidden panels retain their bindings for
lossless reopening. Unused history caches do not retain defaults. Changing a power
degree therefore releases its previous outer diagram immediately unless another
owner uses it. Backup restoration waits until every binding is restored before
collecting old orphan defaults. Run `math_workspace_defaults_test.js` and
`math_workspace_default_cleanup_ui_test.js` for this lifecycle.

New… uses one searchable creation dialog. The declarative creation catalog has
overlapping subject tags; subject selection is a union and search narrows it.
Every kind appears once. Run the icon/creation unit tests and
`math_workspace_polish_ui_test.js` in addition to affected workspace suites.
The five polish blocks are implemented. Additional acceptance coverage in
`math_workspace_computations_creation_ui_test.js` checks LR target lifecycle
and exports, symmetric/exterior power identities and limits, backup validation,
and keyboard creation. Picker results retain their DOM when filtering is
unchanged, including the search field's blur commit. Cancellation restores the
previous focus; successful creation preserves the new object's input focus.

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

Modify panels edit the Asset; Display panels own presentation. A new Young
Display starts at 5 by 5 in every placement, including the main area. Larger
objects expand the grid without clipping data. Existing and restored grids stay
unchanged. One Young renderer handles ordinary and generalized signed diagrams;
moving between main, split and sidebar changes density without replacing its
DOM, focused draft or options. There is no Double Young workspace view.

The shell owns available panel height. New main canvases use the smaller of
680px and the viewport space below the page header, with a 240px lower bound for
very short screens. Explicit height drags keep the chosen height; backups store
this as `canvasHeightMode: "manual"`. Older backups without that flag use automatic
height while retaining their saved preferred height. Split panes share the actual
available pane height. Sidebar displays use a bounded viewport-relative height.

The native runtime observes each drawing area with ResizeObserver and coalesces
redraws into one animation frame. Toolbar wrapping is included in the measurement. Tabs and native controls have
bounded heights and may scroll locally, so they cannot consume the whole graph
area in a narrow split view.
Adapters in `editors/viewport_panels.mjs` fit the graph using both available width
and height; they preserve aspect ratio and existing logical hit coordinates.
Young renders at the fitted size with device-pixel-ratio backing resolution.
Dynkin fits its canonical drawing; Category, geometry and fit-mode Strands render
in the measured viewport. The weight slice uses the same native surface contract.
Mosaic fits its board, Place ramification scales its canvas and labels together,
and Sheaf Complex reuses its existing scene transform with a flexible stage.

Resize updates are presentation-only: they do not publish Asset edits or mark
computations stale. Observer callbacks ignore inactive/zero-sized surfaces, and
observers and queued frames are disposed with the renderer. Geometry camera/zoom
and explicit fixed-spacing Strands settings remain local view state. The promise
of no scrolling concerns the whole current graph in ordinary fit mode; forms,
large text/matrix results and an explicitly enlarged/zoomed view may still scroll.

Regression coverage: `math_workspace_viewport_ui_test.js` exercises main/split/
sidebar fitting, initial and restored Young grids, signed diagrams, real editing
and DPR-aware canvas clicks, unchanged Assets, all graph adapters and backups.
Existing layout, drag, asset-view and input-draft tests cover shared interactions.

Panel headers reuse `CalculatorCards` and the workspace move/hide tools. The
existing card picker renders property panels through its checkbox list: checking
creates or restores a panel, and unchecking hides the same instance. Multiple
instances appear as separate rows. Opening another instance remains available
through the main-area menu or an asset's Properties menu.
Input definitions and instances are excluded from Add panel. Open them from
Assets or the main-area menu. Reopening a hidden Input restores its instance.

## Matrix, Category and Functor assets

A Matrix owns its dimensions, entries and coefficient type/settings. Grid size
does not depend on the panel's placement. The existing grid, presets, Basic
Invariants, Computation and Action on Polynomial are reused. All three
properties reference one explicit Matrix; multi-matrix decomposition results
remain results. Raw invalid cell drafts stay local; valid values update the
asset, and changes invalidate dependent heavy results.

Category stores the existing object/morphism description and opposite flag.
Functor stores variance and explicit Category domain/codomain references;
endofunctors are allowed. Existing inline formula editing and presets are reused.
The diagram panel selects Category/Functor assets and includes functor endpoints.
Its positions and selection belong to the panel, so dragging or closing it does
not mutate the assets or retarget other Inputs. This remains a descriptive
category interface, with no new axiomatic or computational claims.

The dedicated IO card exposes original matrix formats, category LaTeX/plain
text/JSON presets and asset JSON. Category graph imports validate all IDs and
endpoints before adding assets, remap IDs and preserve layout in a new diagram.
Malformed references fail the whole import rather than silently dropping arrows.

## Property inputs and invalidation

Dynkin and Strands are also Assets. A Dynkin diagram stores an explicit Lie
reference, a nonempty set of one-based vertex numbers, and optional quiver
directions. Edge keys retain the standalone calculator's zero-based i-j
numbering. Ordinary quiver directions require ADE; showing arrows is local to
the Input view. Vertex Data and Starting Function can choose a focus within the
stored vertex set without changing it. AR mode requires stored directions and
never creates random mathematical data. Basic Invariants and Cartan Matrix
reference Lie directly; Vertex Data, Parabolic and Starting Function reference
the Dynkin object and resolve its Lie dependency.

Strands stores an explicit A–D Lie reference and the ordered typed generator
records (Coxeter, braid with sign, KL, TL). A_r projects to S_(r+1); B/C/D use
rank r. A0 preserves the existing one-strand identity. Group and count are
derived, never independently editable copies. Basic Info and Calculation
reference Strands; Basis references Lie directly; Relations needs no asset.
Display references an individual Strands Input view. Its direction, style,
spacing and sizing do not change the asset or invalidate calculations.

Lie assets no longer have a global rank-12 cap. Consumers validate their own
limits before mounting: the existing Dynkin/Young calculators keep rank <=12;
Dynkin and Strands require D rank >=4. The Strands view bounds its generator
palette allocation at Lie rank 1000. Unsupported inputs retain all mathematical
data and show a message. Shrinking/changing a shared Lie asset cannot silently
clip vertices, discard generators, replace references or rewrite quiver edges.

Both Inputs are absent from Add panel, and old independent Dynkin/Strands
workspace views are replaced by object panels. Headers, placement, collapse
and property checkboxes use the existing shared chrome. There is no inline
IO card. Central IO supports asset JSON (including a portable Lie snapshot),
LaTeX/plain exports and strict import of standalone Dynkin/Strands JSON. An
import resolves or creates a matching Lie asset, never overwriting a shared
Lie merely to match a file. It validates the whole word/vertex/quiver payload
before allocating assets; malformed data is rejected rather than filtered.

Each Property selects explicit assets; its inputs do not follow the focused
main panel. Repeated references are allowed. Branching rules expose a second
Young input only for diagonal rules, retaining but ignoring that reference when
a single-input rule is selected. Grassmannian products derive their rectangle
from the selected Grassmannian asset.

Changing referenced mathematical data invalidates heavy results. Light
properties refresh immediately. Deletion retains the missing reference and
requires a replacement; it never substitutes another object. Export omits stale
results. Import and export use the existing dedicated workspace card, with
explicit asset/property selectors independent of main-area focus. Input panels
contain no nested import/export section. Import updates only the selected
destination asset, and works even when its Input panel is closed.

## Native adapters and checks

The adapters in
`archive/math_workspace_version1/js/math_workspace/editors/object_panels.mjs`
project assets into the existing calculator engines at bundle build time.
Matrix/Category adapters are in the adjacent `linear_category_panels.mjs`.
Standalone pages retain their behavior; their directly modified input handlers
use the shared draft helper.

Run `node js/math_workspace_objects_test.js` and
`node js/math_workspace_objects_ui_test.js` for typed references, native
calculations, input drafts, shared object updates, panel placement, and missing
inputs. Also run the existing asset, card identity, autosave, input draft, drag,
and canvas appearance regression tests. Rebuild with
`node js/build_math_workspace_native_editors.mjs` and verify with `--check`.
Run `node js/math_workspace_linear_category_ui_test.js` for Matrix computations,
blank/sign/decimal drafts, Category formulas, endofunctors, view independence,
and graph import/export.
Run `node js/math_workspace_root_system_ui_test.js` for real Dynkin canvas
clicks, quiver flips, native Strands calculations, shared Lie invalidation,
independent view settings, rank drafts, placement, and atomic legacy imports.
Root adapters are in `editors/root_system_panels.mjs` next to the other adapters.

## Higher-dimensional slicing assets

`math_workspace_slicing.js` defines Frame, Polytope (regular polytope or simplex),
Sphere, Point, Vector, Roots, Lattice, Voronoi cell, Formula set, Tropical
polynomial, Weyl chambers, Rational cone and Fan assets. Matrix and Lie inputs
reuse their existing kinds. Toric varieties reuse Variety with subtype `toric`
and a reference to a Fan or affine Cone.

A Frame stores `position` and a complete square `basis` matrix, whose columns
are the ordered basis vectors. It is not just a two-plane. Arbitrary invertible
bases are retained; the derived slice is `p + span(v1,v2)`. Drawing temporarily
uses Gram–Schmidt coordinates of that plane, without writing them into the
asset. Slice results identify this coordinate basis explicitly. Direct basis
edits commit as a whole matrix; movement and explicit Schmidt actions update
the referenced Frame and all its consumers.

Roots/Weyl and constructed matrices reference Lie. Lattices use a manual basis,
a Matrix reference, Lie root/weight data, or number-field data. A Voronoi cell
references both a Lattice and a Point. Fans reference cone assets; Toric Variety
references a fan/cone. Projection / 2D Slice selects a Frame and explicit source
assets. Cone/Fan/Divisor and Lattice/Character properties have independent input
references. A scene is not the owner of these mathematical objects.

Every Input can occupy the main area or a side card using the existing shared
headers and checkbox picker. Inputs stay out of the panel list. Viewport,
object visibility, labels, colors and enumeration extent belong to each view;
the Display and Diagnostics properties select a particular view. Changing
dimensions never truncates another asset or replaces a missing reference.
The native slicing renderer supports dimensions 2–8; larger supplied Frame
data is preserved with an unsupported-view message.

Central IO exports assets with their dependency graph and imports standalone
slicing experiments atomically. Whole-experiment frame columns are transposed
into the asset's row storage, references are remapped, and source styles stay
in the imported view. A legacy moving Cartesian frame view references the same
Frame asset as the imported slice. A two-column `activeFrame` export cannot stand in
for a complete frame. Invalid dimensions, basis data, references and formulas
are rejected before publication. Inputs contain no separate IO card.

The workspace-only native adapter is `editors/slicing_panels.mjs`. The runtime
document facade resolves focused controls in both canvas and inspector shadows,
so a side Input retains incomplete drafts during unrelated asset updates.
Run `math_workspace_slicing_test.js` and `math_workspace_slicing_ui_test.js`,
the standalone slicing toric/touch tests, the input draft suites, the existing
object/asset regression suites, and the native bundle build/check.

## Contextual panel catalog

The main Open view menu contains Assets and the remaining standalone calculator
views. Mathematical properties are added through Add panel; their existing
Move to main area action remains available. Inputs stay out of Add panel.

`js/math_workspace_panel_catalog.js` is the declarative relationship catalog.
It assembles the asset kinds/subtypes, object panel definitions and native
Variety/Sheaf property registry without copying their existing declarations.
Each catalog panel records its role (input, property or view settings), route,
ordered input slots, compatible kinds/subtypes and optional inputs. Additional
relations describe explicit reference paths (Dynkin/Strands to Lie), node sets
(category diagrams and slicing scenes), and eligible target views. The runtime
catalog is exposed as `MathWorkspacePanelRegistry` for inspection. There is no
server database or second mathematical state store.
Toric varieties use the slicing properties; they are excluded from legacy
Sheaf properties because that adapter has no toric geometry projection.

Add panel no longer has a source selector. It uses the selected assets in
selection order, prefills compatible slots, and marks missing required inputs.
It never substitutes an unselected asset to complete a computation. Declared
reference paths may supply an already referenced asset. Two-input operations
take the first two distinct compatible selected assets; further inputs can be
changed explicitly inside the resulting panel. A slicing scene takes the first
selected Frame and the selected drawable objects. View settings target only
matching existing views. The asset Properties context menu uses the same
catalog for its single clicked asset.

The picker preserves the shared checkbox UI. Existing object panels are matched
by type, input references and branching rule, so unchecking/rechecking restores
the same instance. Selecting other assets proposes a different panel and leaves
existing bindings intact. Unrelated existing panels remain in a collapsible
group, and Import / Export is always available. Native Variety/Sheaf properties
retain their established per-type slot and per-asset instance model. Legacy
calculator panels are offered for the current calculator view.
Editing a panel's references also updates the open picker. Keyboard focus stays
on the same logical checkbox when adding, hiding or restoring a panel.

Run `node js/math_workspace_panel_catalog_test.js` for type restrictions,
ordered selection, dependency references, scenes and view targeting. Run
`node js/math_workspace_panel_picker_ui_test.js` for live selection changes,
input prefill, missing-input feedback, keyboard checkbox focus, stable panel
restoration, native properties and placement. The existing object, linear /
category, root-system and drag UI suites cover compatibility with shared cards.
