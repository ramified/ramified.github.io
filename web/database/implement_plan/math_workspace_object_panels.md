# Mathematical object panels

## Numbers and shared scalar parameters

New… includes Number, with its own Modify and Display panels. A Number owns
a Field reference (a shared rational field by default), a symbolic or valued
mode, its value draft, and the choice to substitute that value in calculations.
The existing coefficient engine handles exact fractions, decimals, complex
values, prime fields, rational functions, and number-field elements. The
positive assumption applies to symbolic parameters.

Curves and symmetric products of curves have one Genus parameter; abstract
and locally free sheaves have one Rank parameter. Each uses the same
Value / Asset source selector. Its data is a discriminated union:
`{kind: 'literal', value: '2'}` or `{kind: 'reference', ref: 'number:N1'}`.
Only the selected source is stored. Save as Number promotes a literal, and
Edit opens the shared asset. Switching to Value copies a known integer;
a purely symbolic reference starts an empty draft and remains the saved
source until a valid value is entered. These are
ID-based dependencies, so renaming a Number preserves its uses, edits refresh
the native properties, and deletion previews include dependent objects.
Genus and rank require characteristic zero and, when valued, integers at
least zero and one respectively. Incompatible edits leave the model intact.
The ppav genus remains the existing numerical dimension parameter.
Old backups with genus/genusNumber or rank/rankNumber pairs are migrated,
with the old active reference taking precedence over its unused literal.
Incomplete drafts remain separate from saved values and survive backup.

The standalone sheaf calculators remain unchanged. Workspace projections
resolve scalar references and render the Number's mathematical name; native
internal symbols never become asset identities. Workspace backups and Number
JSON exports retain the field dependency. Import validates before publication
and never rewrites a shared field to match an imported Number.

Run `math_workspace_numbers_ui_test.js` for real sequential edits, exact field
values, genus/Hodge and rank updates, symbolic substitution, creation from the
picker and genus field, reference removal, backup/import, and deletion closure.
Also run the input draft suites, the creation/catalog tests, and the existing
matrix/field and Homology browser regressions. Rebuild and check the native
bundle after changing the coefficient or sheaf adapters.

## Mosaic ownership

Mosaic Space owns the background grid, removed/recovered tiles, boundary cuts,
gluing and background geometry. Its Modify panel offers only background tools;
the Hyperbolic Metric and Poincaré Disk property panels set the shared metric.
Mosaic Diagram owns knot/link or dual graph data and decorations, including
chess pieces. Its Pieces mode reuses the native decoration tools; grid controls
are disabled, topology tools are absent, and the shared-space reference has an
Edit action. A shared Space change affects every referencing Diagram without
rewriting its decoration record. Native projections that have not changed do
not write normalized copies back into Assets.

`MathWorkspaceMosaic.propertyPanels` and `editTools` centralize ownership.
Background Statistics, Cellular Homology, Poincaré Disk and the experimental
metric, local geometry, homology cords and universal-cover panels bind Space.
Diagram Statistics, Knot / Link, Dual Graph and Seifert Surface bind Diagram.
Experimental controls use the existing engine and its availability rules;
property interactions do not write source assets. Existing background-property
panels bound to a Diagram resolve to its Space, including restored panels.
The metric selectors in Hyperbolic Metric and Poincaré Disk are the exception:
they update the shared Space metric. Universal Cover's complete-interior view
mode remains local to that panel and does not change the Space asset.

Compatibility checks include piece-only and other decorated diagrams. Grid
changes or removal of occupied tiles suspend incompatible editors/calculations,
preserve the records, and recover when the background becomes compatible.
Run `math_workspace_mosaic_test.js`, `math_workspace_mosaic_ui_test.js`, and
`math_workspace_mosaic_ownership_ui_test.js`. The ownership browser test uses
actual canvas clicks for chess placement, tile removal/recovery, boundary
creation/removal and gluing, and checks shared records and property bindings.
Rebuild/check the native bundle when changing `editors/mosaic_panels.mjs`.

## Workspace polish and Design Lab

Fan and cone negative rays use the approved 0.7 length; Frame keeps both full
negative axes. New cone and fan names use `\sigma` and `\Sigma`, with the existing
unique-name numbering. Cartan matrices use 19px Georgia, zero row/column gaps,
linked spacing, stroke 2 parentheses, zero opacity 0.2, and no diagonal highlights
or indices. The completed Cartan and icon geometry Design Lab experiments have
been removed. The shared Design Lab, Principal asset types, and Asset subject
assignments experiments remain.
The approved creation experiment is removed: `formula` is labelled Equations,
with inequalities mentioned in its description, and Mosaic Space/Diagram use
the matching hex field icons, with two full-color pieces only on Diagram.
`math_workspace_cartan_ui_test.js` verifies the approved preset and panel removal.

Marked Dynkin icons show the referenced Lie diagram, all marked vertices, edge
multiplicities and stored quiver directions for the native renderer's supported
ranks (up to 12). Invalid/missing references and larger ranks use D5 with vertex
2 marked as the generic representative. Exact and generic colors remain separate.
`dynkin_diagram_geometry.js` owns the Cartan matrices and vertex placement shared
by the native display and SVG thumbnails. Asset IDs and data remain unchanged.
Run `math_workspace_dynkin_icons_ui_test.js` for all layouts, types, live parent
updates, native geometry equivalence and the creation preview.

Assets Modify and property-reference Edit use the same pane placement as Open:
when Assets is visible in a main pane, the requested editor opens in the opposite
split pane. Repeated edits preserve the Assets pane. Docked sidebar Assets stays
docked without forcing an extra split. Legacy variety/sheaf/map editors retain
their Inspector placement. `math_workspace_modify_split_ui_test.js` covers both
pane orientations, closed editor reuse, property Edit, docked Assets and restore.

Lie types open an unmarked Dynkin diagram using the shared native renderer,
and their icons show family/rank notation such as E₆, independent of asset names.
The `dynkin` object is labelled Marked Dynkin diagram: it stores a Lie reference,
selected vertices and optional quiver directions. Its IDs and backup format are
unchanged. Lie displays cannot alter those markings and retain the renderer's
rank limits. `math_workspace_lie_display_ui_test.js` covers display routing,
notation, live updates, unmarked geometry, split placement and restoration.

Low-rank audit: D3 is supported directly in Dynkin and Strands, preserving D
vertex/generator numbering and existing Young weight labels. Its Cartan matrix and
positive roots agree with A3 after swapping the first two vertex coordinates;
it has 12 roots, dimension 15 and Weyl order 24. A1 and B2/C2 are regression
tested; B2/C2 keep their distinct long/short-root numbering. A0 remains available
for the one-strand identity, outside positive-rank Dynkin/Young views.
B1/C1 and D2 are supported without changing asset identities or family labels.
Rank-one B/C use Cartan matrix [2], including dual Coxeter number 2 for B1.
D2 uses diag(2,2), two disconnected vertices, independent marked/quiver data,
and a product parabolic description. Its signed generators commute. Young
dimension and fixed-rank decomposition engines retain their existing weight
conventions, with product dimensions for D2. Root geometry also accepts D2/D3;
the geometric canvas still requires ambient dimension at least 2. Run
`dynkin_diagram_calculator_test.js`, `young_low_rank_test.js`, the Lie display
suite and `math_workspace_degenerate_lie_ui_test.js`.

Asset icons are derived by `MathWorkspaceAssetIcons`: nonempty ordinary Young
diagrams fit within 5 by 5; generalized diagrams have at most five rows and a
total signed span of six cells. Empty diagrams retain the generic Young icon.
Small Strands use the same `StrandDrawing` routines as the full editor. Other
single-letter mathematical labels use MathJax, with a generic fallback.
Generic icons use #a8510b without a corner marker. Details columns scroll
inside the Assets view when docked; they cannot widen the sidebar or page.
Strands viewport redraws build the current diagram data before rendering.

The Design Lab is a transient movable panel in the production workspace. Open
`math_workspace.html?designLab=1` or press Ctrl+Alt+Shift+D outside editable
controls. Its appearance overrides and panel placement never enter workspace
backups. Copy design settings exports a candidate preset; Exit removes the
overrides. There is no second workspace implementation or authentication gate.
An Experiment selector shows one experiment at a time while keeping each mounted
experiment's state when switching. Removing a selected experiment moves to the
next available one. `math_workspace_creation_defaults_ui_test.js` checks the
approved picker and selector behavior.

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

New… uses one searchable creation dialog. Display type is the primary filter,
derived from each asset kind's existing Open view; Lie and marked Dynkin share
one browsing group. All displays is the default. Display and Subject use compact
dropdowns on one row, including mobile. Subject retains overlapping tags and
defaults to All subjects. Display, subject,
and search intersect. Search includes current subject assignments and display
group names alongside names, subtypes, and aliases. Every kind appears once in
a compact, responsive icon grid. Descriptions are available on hover and focus.
Stay open is unchecked by default; when checked, creation preserves the dialog,
search, display, subject and scroll position for successive additions. Closing after an
addition focuses the last created object's Input; cancellation without creating
restores the previous focus. Run the icon/creation unit tests and
`math_workspace_polish_ui_test.js` in addition to affected workspace suites.
`math_workspace_creation_grid_ui_test.js` checks visible grid density, combined
display/subject selection, grid/dropdown keyboard navigation, successive creation of the
same type, Stay open defaults, retained filters/scroll, desktop/mobile sizing
and focus on the last created object's Input after dismissal.

Design Lab's Asset subject assignments experiment edits global asset-type
membership, not individual saved objects. Its searchable list and subject
checkboxes use the same creation catalog. Types may have multiple subjects or
none; Unassigned only helps review the latter, which stay discoverable under
All subjects. Changes refresh the creation dialog immediately. Reset and Exit
restore defaults; Copy settings exports a versioned `subjectsByKind` mapping
containing every asset kind and stable subject IDs. Preview settings never enter
workspace backups. `math_workspace_subject_assignments_ui_test.js` covers draft
editing/IME, filtering, live reassignment, export, reset, exit/remount, backup
isolation, and responsive layout. Run `math_workspace_creation_test.js` for
catalog coverage, view routing, dynamic subject search, and assignment validation.
The approved subject mapping is now the default, including Point in Linear
algebra, Fan in Representation theory, and Matrix only in Linear algebra.
Reset and Exit restore this approved configuration.

Generic Young icons depict (3,1); generic Strands icons depict the A2 braid
sigma1 sigma2^-1 on three strands. These are type representatives and leave
Asset data unchanged. Exact Strands icons require fewer than five strands and
fewer than five compressed rows, regardless of generator count. Exact icons use
the accent color and generic icons use #a8510b. Every strand, including
KL/TL glyphs, uses the same ink in a thumbnail, with soft curves and round ends.
Thumbnail rows greedily group consecutive generators with disjoint physical
tracks, otherwise starting a new row, without backfilling or rewriting the word.
Signed generators keep their mirrored crossings together. The full calculator's
spacing, colors and style controls retain their existing behavior.
Design Lab has a separate strandStroke slider (4–24, default 19 at the 256px
thumbnail backing size); overrides remain local to the tab and reset on exit.
Creation icons refresh when appearance settings change. Run
`math_workspace_asset_icons_test.js` for the row examples and drawing semantics,
and `math_workspace_strand_icons_ui_test.js` for all five layouts, representative
geometry, uniform ink, live stroke changes, backup isolation and picker previews.
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
Dynkin and Strands support B/C rank >=1 and D rank >=2. The Strands view bounds its generator
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

Opening an Asset in the main area keeps Assets visible in the other split pane,
including when Assets is already on the right. If Assets is docked in the sidebar,
Open preserves that placement without introducing another main pane. Modify and
property actions retain their existing placement rules.

Variety, Sheaf and Map Open actions use `sheaf-view`, a display surface extracted
from the existing native Sheaf overview. It shares the workspace Sheaf Complex
renderer, authoritative asset projection, arrows, labels and pointer geometry.
The display includes transitive dependencies (base varieties and map endpoints),
keeps missing references explicit, and never publishes mathematical changes from
canvas gestures. Each overview owns its positions and curves; asset updates and
workspace backups preserve them. Content framing keeps small diagrams readable
in a split pane without changing saved coordinates. Toric varieties also have
this overview; their existing geometric projection panels remain available.
Category and Functor Open actions continue using the original Category canvas,
with functor endpoints included automatically.

Asset Open reuses one Sheaf overview and one Category overview, adding roots to
their saved `refs.nodes` sets without replacing previous members. Reopening an
object selects its existing drawing; reopening a closed overview retains its
members and layout. `refs.active` records the selected object independently of
membership. Assets selection highlights a drawn object without adding undrawn
objects. Clicking, keyboard-activating or dragging an overview label selects the
corresponding Asset without retargeting Modify/property panels. Selection and
membership survive workspace backups; old single-object Sheaf displays seed
membership from `refs.asset`.

Run `node js/math_workspace_open_display_ui_test.js` for asset Open actions,
both split orientations, sheaf/map dependencies, category/functor canvases,
label refresh, layout preservation, backups, narrow screens and sidebar Assets.
