# Preserved editor workflow gates

The baseline is each original calculator, not the shared-asset operation registry. All families remain **parity pending**. The checked-in build takes the original canvas, cards, scripts and styles directly from their source pages. A passing mount/save test does not establish mathematical or visual parity.

The central View contains the original main canvas as a large card, with its toolbar and overlays. Supporting cards occupy the Inspector. Hiding a card retains its controls and mathematical data. Add card restores it; original conditional visibility still applies.

## Verified integration checks (2026-09-14)

- All 40 workspace contract/math tests and all 20 opt-in browser integration checks pass. Browser checks include object construction, two-instance isolation, Inspector visibility/order, editable session reopening, discrete movement, focused shortcuts, stopping continuous motion on tab deactivation, a packaged toric worker, matrix inverse restoration, family mounting and packaged Mosaic presets.
- Manual browser interaction confirms the original drag handle moves Source Data below Slide Position while the canvas stays in the View. This order survives reload and the visible project Export/Import workflow. A mixed project containing one partition asset and four calculator sessions retains its asset, tabs, tesseract and Inspector order after reopening.
- Create object constructs and displays a partition through the dialog. English and Simplified Chinese labels for Main canvas, Inspector and Add card update together.
- Build freshness, original slicing touch/toric regressions, toric mathematics, matrix mathematics, input-settings behavior and coverage checks pass. These are targeted checks; unexercised rows below remain pending.

## Higher-dimensional Slicing

Compare these workflows in `higher_dimensional_slice_calculator.html` and a native slicing tab. `math_workspace_browser_test.html` covers a subset programmatically; visual, touch and direct-file gates remain separate.

| Workflow | Original controls | Representative input and acceptance |
|---|---|---|
| Regular polytopes | Source Data → add object → regular polytope; family, size | In dimension 4 add a tesseract of size 1: 16 projected vertices, 32 edges; central frame shows a square section. Exercise 5-cell, 16-cell, 24-cell, 120-cell, 600-cell separately with original limits. |
| Simplex | Source Data → simplex | Add in dimension 4; retain the original projected vertices, edges and changing section as the frame moves. |
| Sphere | Source Data → sphere | Add a unit sphere; central section is a circle, tangent and outside frames retain the original degenerate/empty behavior. |
| Cartesian frames | Source Data → Cartesian frame | Add a second frame and change its matrix; only the selected frame changes. |
| Points and vectors | Source Data → point/vector; coordinate editing | Enter a nonzero vector; endpoint, labels, projection and section visibility agree with baseline. |
| Matrix actions | Source Data → matrix; input/preset/target controls | Use a diagonal matrix on a selected supported object; preserve object/target selection and editable matrix drafts. |
| Dynkin context and roots | Source Data → Dynkin type, then roots | Create type A context and its roots; selection, root/weight information and displayed coordinates agree. |
| Lattices | Source Data → lattice; basis and bounds | Use an identity basis in dimension 2; integer points and enumeration limits agree. |
| Voronoi diagrams | Source Data → Voronoi diagram; lattice reference | Select the square lattice; display its square Voronoi cell, including projection/slicing controls and existing caps. |
| Implicit formulas | Source Data → formula set | Use the original sphere/plane defaults; preserve exact versus numerical modes and unsupported cases. |
| Tropical polynomials | Source Data → tropical polynomial | Use the default polynomial; walls, districts and district selection agree with baseline. |
| Weyl chambers | Source Data → Weyl chambers; Dynkin reference | Select an A-type context; walls, chambers, selected chamber and supported KL computations retain their status and limits. |
| Object styling and selection | Source Data → object/name/style/visible | Rename one of two objects, change colour/opacity/point/line size and layer visibility; the other object remains unchanged. |
| Object deletion and canvas clearing | Source Data → del; main canvas → clear | Delete selected object; clear returns to the original Cartesian-frame baseline. |
| Discrete translation | Slide Position → direction, discrete, step, +/− | Move by one step along an ambient direction, then a frame direction; exported position agrees with displayed frame. |
| Continuous translation and rotation | Slide Position → continuous, speeds; held buttons/shortcuts | Hold and release; motion stops on release, blur, tab deactivation and close. Check independent tabs. |
| Direct frame editing | Slide Position → direct input/manual/import | Enter nontrivial position and frame columns, including rational inputs; retain validation and active frame selection. |
| Frame repair/reset | Slide Position → Schmidt, auto-Schmidt, reset checkboxes | Use nonorthogonal columns; repair agrees with baseline, and position/direction reset selections remain independent. |
| Mouse and touch canvas interaction | Main canvas; Touch drag mode | Pick points and drag for translation/rotation; test pointer cancellation, touch rotation and typing protection. |
| Projection/slice overlays | Main canvas; Source Data visible layers | Toggle projection and section separately; preserve labels, picking and all working overlays. |
| Viewport settings | Viewport → zoom, axes/grid/labels/bound, box/disk/radius | Change zoom and clipping shape while retaining the mathematical objects and frame. |
| Debugging and tolerance | Debug Chart → counts, diagnostics, exact sphere guide, tolerance | Counts agree with the tesseract example; numerical tolerance and warnings retain original meaning. |
| Rational toric cones | Toric Cone → Build, preset, ray input/import | In dimension 2 apply positive orthant: two extreme rays, dimension 2; rational generators normalize exactly as before. |
| Toric faces and orbits | Toric Cone → Faces / Orbits | Select a face of the positive orthant; highlight, face inclusion and orbit data agree. |
| Affine toric varieties | Toric Cone → Affine Variety | Compare singular simplicial and smooth orthant presets; retain actual supported semigroup/class data and limits. |
| Toric fans | Source Data → toric variety; Toric Variety card | Exercise affine/projective/weighted projective presets and original fan editing; compare cones, fan validation and supported invariants. |
| Lattice/equivariant information | Lattice / Equivariant Bundles | Pick an integral point for a toric character and a Dynkin weight; preserve context-dependent information and dimension display. |
| Background frame details | Background Space Details | Position, frame, active columns, Gram matrix and affine formula match exported data. |
| Legacy import/export | Import / Export; object export; copy frame/position | Roundtrip full state, active object, position, matrix and frame data through original adapters; compare JSON and displayed geometry. |
| Settings and shortcuts | Original settings dialog | Rebind supported controls, edit multiple bindings, and preserve input-field protection independently in two tabs. |
| Inspector layout | Drag handle, Hide, Add card, ↑/↓ | Reorder visible cards; hide and restore without losing values; reload project and compare card order, visibility and expanded state. |
| Session lifecycle | Workspace tabs, Close, Undo, project Export/Import | Open two slicing editors; preserve independent objects, frames and settings; reopen a mixed asset/session project. |
| Original unavailable controls | Viewport → reset orbit and current 3D placeholders | Preserve their existing placeholder/conditional status. The original reset-orbit handler explicitly reports that Three.js orbit controls are not implemented. Do not count it as a migrated 3D camera. |

## Remaining families

| Family | Current integration checks | Full gate still required |
|---|---|---|
| Young diagrams | Original controls, isolated state, save/reopen | Canvas editing, generalized diagrams, hooks/tableaux, branching, symmetric functions, weights/orbits/BWB, all exports and input methods |
| Double Young | Original controls and canvases, save/reopen | All decomposition/branching/Schubert/weight-slice workflows and production demonstrations |
| Dynkin | Original diagram and controls, save/reopen | Diagram edits, types/ranks, selection/root/weight and representation workflows, exports |
| Strands | Original canvas and controls, save/reopen | All supported words/relations/reductions/bases/matrices, input modes, undo and exports |
| Matrices | Grid editing, inverse computation and restored result | Every coefficient domain, canonical form, factorization, polynomial action, preset and export format |
| Varieties/sheaves/maps/classes | Original editor and save/reopen | All working specifications, diagrams, cohomology/classes/maps/formulas and import/export behavior |
| Sheaf complexes | Original editor and save/reopen | Complex chart editing, differential/maps, snake/diagram interactions and all supported computations |
| Mosaic | Original editor, save/reopen and packaged preset loading | Every working topology/geometry/metric/knot/dual-graph/degeneration workflow, animation and exports |
| Categories | Original editor and save/reopen | All presentations, functors, variance, formula/diagram editing, presets and exports |
| Place ramification | Original editor and save/reopen | Field/place diagrams, supported computations and legacy exports; verify live service separately |

The original production-process HTML is a reference document, not a second engine. Theorem Graph and Ramified Minigames remain separate; their applications have not been changed. No calculator link or old URL is retired by these changes.

## Environment gates

- Open the committed `math_workspace.html` directly in Windows Chrome and Edge, with no server or Node installation. Run creation, canvas manipulation, computation, export and reopening workflows. Browser automation in this environment rejects file navigation, so these two checks are not claimed complete.
- With storage unavailable, keep editing and export a project; verify the visible storage notice.
- Run `npm run workspace:check` to reject stale bundles and `npm run workspace:test` for project/math contracts. Run the opt-in browser regression page and the relevant original calculator tests.
- Only mark a family complete after every working row has a recorded comparison with its original page. Broader all-family parity and shared-asset interchange remain pending.
