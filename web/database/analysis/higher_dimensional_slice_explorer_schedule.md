# Higher-Dimensional Slice Calculator Schedule

This is the implementation schedule for a broad higher-dimensional slice calculator. The first buildable goal is a generic slide-position playground for testing affine 2D/3D slices in `R^n`. The first research module after that is a tropical hypersurface slice calculator. Later modules can reuse the same source/layer, slide-position, viewport, and background-space infrastructure for Lie algebra weight slices, toric fans, Newton subdivisions, and tropical intersections.

## Current V1 Summary

The current implemented V1 is a standalone page at `higher_dimensional_slice_calculator.html`, backed by `js/higher_dimensional_slice_explorer.js`. It has the six-card right-side layout, compact Source Data add/modify modes, Cartesian-frame default object, regular-polytopes including 120-cell and 600-cell, the separate non-regular simplex source, sphere, Cartesian frame, point, formula-set, and tropical-polynomial sources.

The current renderer supports moving-frame projection, exact 2D slice layers for regular polytopes/simplex/spheres, exact/numeric 2D formula slices, and exact 2D tropical curve slices. It also includes rational parameter input, direct rational position/frame input, continuous/discrete directional movement, frame-plane rotation, Gram-Schmidt repair, canvas picking, import/export, runtime diagnostics, and an `index.html` card with a GIF preview.

The current build does not yet implement lattice or Voronoi sources, generic 3D rendering, or tropical exact 3D rendering.

## Guiding Model

Fix the ambient coordinate basis:

```text
e_1, ..., e_n
```

The moving affine slice is controlled by:

```text
p in R^n
v_1, ..., v_n
```

The first two frame vectors define the active 2D slice:

```text
x = p + y_1 v_1 + y_2 v_2
```

The first three frame vectors define the active 3D slice:

```text
x = p + y_1 v_1 + y_2 v_2 + y_3 v_3
```

The default frame is orthonormal. The default rotation operation is a frame-plane rotation, not an ambient-coordinate rotation:

```text
v_i' = cos(theta) v_i + sin(theta) v_j
v_j' = -sin(theta) v_i + cos(theta) v_j
```

All other `v_k` stay fixed. This should feel like smoothly changing the direction the slice is facing. Gram-Schmidt repair keeps the frame orthonormal after direct edits or numerical drift. Non-orthogonal `GL(n)/B` and flag-variety controls are future extensions.

## Right-Side Card Layout

The app should use a large viewport on the left and six dense cards on the right:

```text
Source Data
Slide Position
Viewport
Debug Chart
Background Space Details
Import / Export
```

The organizing principle is:

- `Source Data` controls adding, selecting, naming, deleting, styling, hiding, and exporting mathematical objects.
- `Slide Position` controls the affine frame data used by the current projection layer and exact 2D slice layer.
- `Viewport` controls only the screen camera and canvas display.
- `Debug Chart` reports correctness checks, projection/slice diagnostics, and optional exact guides.
- `Background Space Details` displays `p`, the frame matrix, and affine formula explicitly.
- `Import / Export` saves and restores full experiments.

### Source Data Card

Purpose: separate object creation from object modification. This card manages source objects/layers and per-object visibility for projection and exact 2D slice layers. The mode split should keep the card compact: add mode hides object/style rows, and modify mode hides the add-type row.

Rows:

| Row         | Planned Function                         | UI Tools                                 |
| ----------- | ---------------------------------------- | ---------------------------------------- |
| Mode        | Choose creation or editing workflow; always visible | segmented control: `add object`, `modify object` |
| Add type    | Add-mode only; choose concrete source object and create it with an automatic unique name | select menu: `regular polytope in R^n`, `simplex in R^n`, `sphere S^{n-1}`, `Cartesian frame`, `point in R^n`, `formula set`, `tropical polynomial`; when regular polytope is selected, show a family select before the `add` button; planned later: `lattice`, `Lie slice data` |
| Object      | Modify-mode only; choose, delete, or export the active object/layer | select menu, small `del` button, `export` button |
| Object name | Rename active object                     | compact text input                       |
| Params      | Modify the active object's mathematical parameters | regular polytope/simplex/sphere: size slider plus number; Cartesian frame: basis selector plus length slider/number; point: compact coordinate controls |
| Style       | Set visual style of active object        | color swatch, opacity slider, point-size slider, line-width slider |
| Visibility  | Hide/show active object layers and labels | independent toggle buttons `proj`, `slice`; checkbox `labels` |
| Status      | Report current source-data action; always visible | compact inline warning/status text       |

Initial object types:

- `regular polytope in R^n`: a family source whose first families are regular simplex, hypercube, cross-polytope, plus named 3D and 4D regular polytopes. The projection layer shows generated vertices and edges, and the exact 2D slice layer shows filled polygon cross-sections.
- `simplex in R^n`: standard basis vertices plus one balanced negative vertex.
- `sphere S^{n-1}`: radius-parameter sphere in `R^n`, drawn as a projection circle and as an exact 2D slice circle/point/empty result. Nonempty circle slices are visually filled with a translucent disk.
- `Cartesian frame`: rays from the origin along either fixed ambient `e_i` directions or the moving frame `v_i` directions.
- `point in R^n`: one editable ambient coordinate tuple `(a_1, ..., a_n)`.

Modify-mode parameter behavior:

- Regular polytope and simplex store `scale`; sphere stores `radius`. The regular-polytope params row adds a family selector plus the compact `size` slider/text input. The slider uses default `1`, range `0.05..6`, and step `0.05`; the text input accepts positive rational values outside that slider range.
- Cartesian frame stores `basis: "ambient" | "moving"` and `length`; the UI provides a basis select labelled `ambient e_i` / `moving v_i` plus length slider and rational text input. The text input accepts any positive finite rational value, even above the slider maximum.
- Point stores `position: [...]`; the UI shows only a compact tuple of text controls, visually `( input, ..., input )` with no visible `a =` or `a_i =` labels. Text entry accepts integers, decimals, and simple rational values such as `1/3`, `-5/2`, or `8`, with no text-entry coordinate bounds. Scrolling over a coordinate changes it by `0.1`, clamps to `[-6, 6]`, and prevents page scrolling for that wheel event. `Enter` or blur commits; `Escape` cancels.
- Older imported `fan` objects should normalize to an ambient Cartesian frame so saved experiments from the temporary preview stage remain usable.

Modify-mode visibility behavior:

- `proj` and `slice` are independent per-object buttons, so an object can show projection only, exact slice only, both, or neither.
- `visibleProjection` and `visibleSlice` are stored in object JSON. Older `visible` imports migrate to `visibleProjection`; `visibleSlice` defaults to `false` unless explicitly saved.
- New regular-polytope/simplex/sphere objects default to both `proj` and `slice` on. New point and Cartesian frame objects default to projection on and slice off.
- The `slice` button is disabled or muted for point/Cartesian frame and in 3D frame mode, while preserving the stored `visibleSlice` value for future 2D use.

Add-mode behavior:

- The selected add type is drawn as a temporary light-yellow projection preview in the main canvas.
- If the selected add type is regular polytope, the add-row family selector controls both the preview family and the newly created object. The family selector uses special names such as `cube`, `tesseract`, `dodecahedron`, `24-cell`, `120-cell`, or `600-cell` when available in the current dimension.
- This preview is not part of the object list, visible counts, active object, import/export state, or saved state.
- Pressing `add` creates the selected type using the current ambient dimension `n`, assigns an automatic unique name, selects it, and switches to modify mode.

Canvas picking behavior:

- Clicking a visible persisted object's projected point or exact-slice pick target selects that object and switches Source Data to modify mode.
- Ray-only sources such as Cartesian frame expose the ray origin and displayed ray tips as pickable targets.
- The lower-left canvas HUD reports the picked target as `picked: object name / v_i  x=[ambient coords]  y=[frame coords]`.
- Empty canvas clicks clear the picked-target readout without changing the active object.

Later object types:

- `lattice`: basis/Gram/Dynkin/number-field lattice inputs and Voronoi diagrams.
- `formula set`: linear equalities/inequalities and quadratic-form sources in variables `x_1, ..., x_n`.
- `tropical`: tropical polynomial/hypersurface.
- `Lie`: weight/root/lattice slices, reusing ideas from `double_young_diagram.html`.

### Slide Position Card

Purpose: control the affine slice map `y -> p + y_1 v_1 + y_2 v_2`. The current build is intentionally 2D-only; no 2D/3D selector is shown. Ambient dimension `n` is controlled from a compact overlay at the top-right of the main canvas.

Rows:

| Row              | Planned Function                         | UI Tools                                 |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| Input mode       | Choose how `p` and frame data are changed | segmented control: `move`, `direct input`; default `move` |
| Active direction | Move-mode only; select ambient or moving-frame direction for keyboard/button movement | wrapped buttons `e1 ... en` and `v1 ... vn`; default `v3` when available |
| Quick move       | Move-mode only; move `p` along selected direction or reset it to the origin | hold/click buttons `-`, `+`, `reset p`   |
| Motion           | Move-mode only; choose continuous or discrete movement behavior | segmented control `continuous`, `discrete`; default `continuous` |
| Speed            | Move-mode continuous only; set held-key/button speeds | two sliders: translation speed `0.05..4` units/sec, rotation speed `1..180` deg/sec |
| Step             | Move-mode discrete only; set one-press increments | two sliders: translation distance `0.01..2`, rotation angle `0.5..45` degrees |
| Rotation pair    | Move-mode only; choose frame-plane rotation pair | two select menus choosing `(v_i, v_j)`   |
| Direct input     | Direct-input mode only; edit or import affine-frame data | nested segmented control: `manual input`, `import`; manual mode has rational `p` tuple plus editable `n x n` grid whose columns are `v_i`; import mode has a matrix rows textarea compatible with `matrix_calculator.html` `Rows` export |
| Frame repair     | Keep frame orthonormal                   | `Schmidt` button and `auto-Schmidt` checkbox; direct-input apply always runs Schmidt |
| Reset            | Reset frame                              | `reset frame` button                     |

Keyboard controls:

- `W`, `ArrowUp`, or `+`: translate `p` positively along the selected `e_i` or `v_i` direction.
- `S`, `ArrowDown`, or `-`: translate `p` negatively along the selected `e_i` or `v_i` direction.
- `A` or `ArrowLeft`: rotate negatively in the selected frame-plane pair.
- `D` or `ArrowRight`: rotate positively in the selected frame-plane pair.
- In continuous mode, held keys/buttons ramp linearly from `0` to the selected speed over `180ms`, then decelerate linearly after release.
- In discrete mode, each key press or click applies exactly one selected distance or angle.
- Number keys set the rotation pair: `1` and `2` fill the first selectbox, while `3...n` fill the second selectbox. If the pair would become equal, the other selectbox moves to the lowest available distinct frame vector.
- Keyboard movement, rotation, and number-key shortcuts are ignored while a text input, textarea, or select menu has focus.
- Direct position sliders are intentionally omitted; manual direct-input position cells accept rational text and wheel-step editing like point-source params.
- Direct-input mode validates finite rational entries for `p` and the frame matrix. Rank-deficient, malformed, or non-finite matrices are rejected with a Debug Chart warning and must not overwrite the last valid frame.

### Viewport Card

Purpose: control the screen view only. Nothing in this card changes `p`, `v_i`, or the mathematical slice.

Rows:

| Row             | Planned Function                     | UI Tools                                 |
| --------------- | ------------------------------------ | ---------------------------------------- |
| Screen zoom     | Zoom the canvas/screen view          | zoom slider plus reset screen view button |
| Display toggles | Show or hide common visual aids      | checkboxes: `axes`, `grid`, `labels`, `bounding box` |
| 3D camera       | Control only the screen orbit camera | reset orbit camera button, camera distance slider |
| Canvas box      | Set visible coordinate box           | box-radius slider plus exact number input |

Important distinction:

- 3D viewport dragging rotates the screen camera.
- Slide Position move-mode frame rotation changes the mathematical slice directions.

### Debug Chart Card

Purpose: show correctness checks, visible counts, warnings, and optional exact guides.

Rows:

| Row                 | Planned Function                         | UI Tools                                 |
| ------------------- | ---------------------------------------- | ---------------------------------------- |
| Visible counts      | Count visible objects and projection/slice primitives | compact read-only key/value grid with projection points/edges/rays and slice polygons/circles/points |
| Preview diagnostics | Show active projection and exact 2D slice state | compact read-only key/value grid         |
| Runtime diagnostics | Show current render and exact-slice cost | read-only draw runtime, exact-slice runtime, halfspace count, and halfspace build time |
| Sphere debug        | Show an optional exact sphere-intersection guide for checking affine-frame intuition | checkbox: `exact S^n guide`              |
| Tolerance           | Tune numerical predicates                | tolerance slider plus exact number input |
| Warnings            | Report empty slices, degeneracy, parse issues | compact warning/status text area         |

The exact `S^n` guide is a debug feature. For `S^{n-1}` in `R^n`, its intersection with a 2D affine frame plane should display as a circle, point, or empty set when the frame is in the right relative position. This is a diagnostic guide, not a general exact slice renderer.

### Background Space Details Card

Purpose: explicitly display the current ambient-space data, not just diagnostics.

Rows:

| Row                 | Planned Function                         | UI Tools                                 |
| ------------------- | ---------------------------------------- | ---------------------------------------- |
| Position vector     | Show current center                      | read-only monospace `p = [...]`          |
| Frame matrix        | Show full frame with columns `v_1, ..., v_n` | read-only compact matrix with `v_i` column labels and `e_i` row labels |
| Active frame matrix | Show columns used by current projection frame | read-only compact matrix with `v_1,v_2` column labels |
| Gram matrix         | Show `V^T V` or max orthogonality error  | read-only matrix or compact key/value row |
| Affine formula      | Show the current slice map               | read-only monospace formula `x = p + y_1v_1 + ...` |
| Copy row            | Copy reusable background-space data      | buttons: `copy p`, `copy frame`, `copy frame JSON` |

This card is the place to inspect the current frame coordinates as a matrix and the current position as a vector.

### Import / Export Card

Purpose: save and restore complete experiments, not only source object data.

Rows:

| Row            | Planned Function                         | UI Tools                                 |
| -------------- | ---------------------------------------- | ---------------------------------------- |
| Export         | Save current app state                   | buttons: `copy state JSON`, `download state JSON` |
| Import         | Paste complete state or exported object JSON | compact monospace textarea               |
| Apply import   | Load pasted state, add object JSON, replace active object, or reset | `import full state`, `import as new object`, `replace active object`, `reset demo` buttons |
| Future sharing | Later permalink/share support            | disabled row or planned placeholder      |

Full state should include:

- all source objects/layers;
- per-object visibility and style;
- ambient dimension;
- position vector `p`;
- frame matrix;
- frame dimension;
- viewport settings;
- debug settings.

## Data Model For Generic Geometry

Initial generic object schema:

```json
{
  "kind": "geometry",
  "ambientDimension": 4,
  "objectType": "regular-polytope",
  "family": "hypercube",
  "scale": 1,
  "points": [
    [1, 0, 0, 0]
  ],
  "edges": [[0, 1]]
}
```

Additional v1 source-object data:

```json
{
  "objectType": "sphere",
  "kind": "sphere",
  "ambientDimension": 4,
  "center": [0, 0, 0, 0],
  "radius": 1
}
```

```json
{
  "objectType": "cartesian-frame",
  "kind": "geometry",
  "ambientDimension": 4,
  "origin": [0, 0, 0, 0],
  "basis": "ambient",
  "length": 4
}
```

```json
{
  "objectType": "point",
  "kind": "geometry",
  "ambientDimension": 4,
  "position": [0, 0, 0, 0]
}
```

Each source object/layer should wrap this data with:

```json
{
  "id": "object-1",
  "name": "regular polytope in R^4",
  "kind": "geometry",
  "visibleProjection": true,
  "visibleSlice": true,
  "showLabels": false,
  "style": {
    "color": "#2f7d70",
    "opacity": 0.85,
    "pointSize": 3,
    "lineWidth": 2
  },
  "data": {}
}
```

Active object export from Source Data writes this wrapper to the Import / Export textarea:

```json
{
  "version": 1,
  "kind": "slice-explorer-object",
  "object": {}
}
```

Older imported states that contain `renderMode` should be tolerated, but new exports should not include it.
Older imported objects with `kind: "fan"` or `objectType: "fan"` should be converted to `{ "objectType": "cartesian-frame", "basis": "ambient" }`.
Older imported objects with `objectType: "cube"` should be converted to `{ "objectType": "regular-polytope", "family": "hypercube" }`.
Older imported simplex objects should remain the existing separate simplex source, not regular-polytope data.
Older imported objects with `visible` should migrate it to `visibleProjection`; `visibleSlice` should default to `false`.
Older imported numeric `activeDirection` values should migrate to `{ "basis": "ambient", "index": value }`; imported `frameDimension: 3` should be forced to `2` until the 3D renderer is implemented.
Older imported `moveStep` should migrate to `translationStep`; older imported `rotationAngleDeg` should migrate to `rotationStep`. Missing motion fields should use continuous mode with translation speed `1`, rotation speed `60`, translation step `0.1`, and rotation step `8`.

## PR-Sized Build Steps

### 1. Schedule Rewrite

Status: implemented in current V1.

Goal: make this file the source of truth before implementation.

Acceptance:

- The six cards are named and specified row by row.
- The current renderer is explicitly labelled as projection plus exact 2D slice for supported generic objects.
- Position and frame controls are described under `Slide Position`.
- `Background Space Details` explicitly includes position vector and frame matrices.
- The document records implemented, partially implemented, and planned work without implying unbuilt features are available.

### 2. Static Page Shell

Status: implemented in current V1.

Files:

- `higher_dimensional_slice_calculator.html`
- `js/higher_dimensional_slice_explorer.js`

Goal: create the page shell and all right-side cards with placeholder behavior.

Acceptance:

- The page uses the existing applet visual language from `css/site.css`.
- The first viewport appears on the left.
- The six right-side cards exist in the order specified above.
- All card rows fit compactly on desktop and stack cleanly on mobile.
- Tropical polynomial sources parse `u_i` monomial notation and render exact 2D tropical curve slices.

### 3. Slide Position Move Engine

Status: implemented in current V1.

Goal: make `p` and the orthonormal frame interactive through move mode.

Implement:

- `n`, `p`, `V`, fixed `sliceDim = 2`, selected movement direction, motion mode, translation speed/step, rotation speed/step, and rotation pair.
- Direction buttons for both ambient `e_i` and moving-frame `v_i`.
- Frame-plane rotation using the formula above.
- Continuous movement via `requestAnimationFrame` with a `180ms` linear speed ramp.
- Discrete movement with one exact translation distance or rotation angle per press/click.
- Keyboard translation with `W/S`, `ArrowUp/ArrowDown`, and `+/-`.
- Keyboard rotation with `A/D` and `ArrowLeft/ArrowRight`.
- Number-key shortcuts for the rotation pair: `1`/`2` update the first selectbox and `3...n` update the second.
- Gram-Schmidt repair and reset frame.

Acceptance:

- `p` and `V` update the Background Space Details card immediately.
- Default direction is `v3` when `n >= 3`, otherwise the largest available `v_i`.
- Default rotation pair is `(v1, v3)` when `n >= 3`, otherwise `(v1, v2)`.
- `V^T V` stays close to the identity after rotations.
- Keyboard movement, rotation, and number-key shortcuts do not trigger while typing.
- Old imported `moveStep` and `rotationAngleDeg` fields load into the new motion controls.

### 4. Source Object Manager

Status: implemented in current V1.

Goal: support multiple mathematical objects before implementing hard rendering.

Implement:

- object list;
- add/modify mode split;
- compact add mode: type select plus add button only;
- compact modify mode: object, name, params, style, and visibility rows only;
- concrete add-object types;
- delete active object;
- export active object JSON to Import / Export;
- active object selection;
- active object naming;
- per-object projection/slice visibility;
- per-object style.

Acceptance:

- Multiple objects can coexist.
- Turning both `proj` and `slice` off removes the object from visible counts.
- Add mode hides modify-only rows.
- Modify mode hides add-only rows.
- Source Data does not contain a raw object JSON editor.
- Source Data does not expose unimplemented render modes.

### 5. Generic Source Types

Status: implemented in current V1.

Goal: provide non-tropical objects to test slide-position, projection, and exact 2D slicing.

Required source types:

- regular polytope in current `R^n`;
- simplex in current `R^n`;
- sphere `S^{n-1}` in current `R^n`;
- Cartesian frame in current `R^n`;
- point in current `R^n`.

Acceptance:

- Source types are created through Source Data add mode.
- Created objects use the current ambient dimension `n`.
- The initial/reset demo object is a Cartesian frame, and the default add type is Cartesian frame.
- Regular polytope, simplex, and sphere expose a size control that changes the rendered geometry.
- Regular polytope exposes a family selector: all `n` get regular simplex, hypercube, and cross-polytope; `R^3` uses tetrahedron/cube/octahedron plus dodecahedron and icosahedron; `R^4` uses 5-cell/tesseract/16-cell plus 24-cell, 120-cell, and 600-cell.
- Size, radius, Cartesian-frame length, and point coordinates accept rational text input. Size/radius/length must remain positive, while point coordinate text entry is unbounded.
- Cartesian frame can switch between fixed ambient basis rays and moving frame rays.
- Point exposes compact tuple coordinate controls, including wheel-step editing with clamp range `[-6, 6]`.
- Old fan JSON imports as an ambient Cartesian frame.
- Old cube JSON imports as regular-polytope hypercube; old simplex JSON remains the separate simplex source.

### 6. Generic 2D Projection And Exact Slice Renderer

Status: implemented in current V1.

Goal: test 2D frame projection and exact 2D intersection for basic generic objects before tropical rendering.

Implement:

- projection of points, edges, and rays to `(v_1, v_2)`;
- analytic 2D sphere projection as a circle rather than sampled points;
- exact regular-polytope slice, using analytic inequalities for hypercube/cross-polytope, generated convex-facet halfspaces for regular simplex, dodecahedron, icosahedron, and 24-cell, and optimized dual halfspaces for 120-cell/600-cell;
- exact simplex slice by clipping the affine plane against the inequalities for `conv(s e_1, ..., s e_n, -s/n(1,...,1))`;
- exact sphere slice using the perpendicular distance from the center to `p + span(v_1, v_2)`, rendered as a filled translucent disk plus outline when nonempty;
- independent per-object `proj` and `slice` visibility layers;
- point rendering as one pickable projected vertex;
- Cartesian frame rendering as displayed rays from the origin;
- light-yellow add-object preview for the selected add type;
- canvas click picking for persisted projected vertices, ray tips, exact slice polygon vertices, and sphere slice centers/tangent points;
- optional exact `S^n` guide from the Debug Chart.

Acceptance:

- Regular polytope, simplex, sphere, Cartesian frame, and point remain visible during frame rotation.
- UI labels identify this as projection plus exact 2D slice.
- Hypercube `R^4` with identity frame and `p=0` slices to the square `[-s, s]^2`; moving `p` outside the cube gives an empty slice.
- Cross-polytope `R^2` with identity frame and `p=0` slices to the diamond `|y_1| + |y_2| <= s`.
- Simplex `R^2` with identity frame slices to the full triangle.
- Sphere exact slice gives filled circle, tangent point, or empty result according to perpendicular distance.
- Projection-only, slice-only, both, and hidden states work per object.
- Add preview is visible in add mode and absent from state/export JSON.
- Vertex picking switches to modify mode and shows ambient plus frame coordinates.
- Clicking empty canvas clears the picked-vertex readout.
- Exact sphere guide gives circle, point, or empty results as expected.

### 7. Slide Position Input Modes

Status: implemented in current V1.

Goal: make `Slide Position` more than motion controls by adding direct affine-frame input.

Implement:

- add an `input mode` row with exactly two modes: `move` and `direct input`;
- keep all current translation/rotation controls inside move mode;
- direct-input mode has exactly two submodes: `manual input` and `import`;
- manual direct input combines a rational position-vector editor for `p` and a compact rational `n x n` frame-matrix grid whose columns are `v_i`;
- import direct input accepts row format compatible with the `matrix_calculator.html` `Rows` export and preserves current `p`;
- applying manual or import input validates dimensions and finite rational values, then Gram-Schmidt orthogonalizes the frame-matrix columns;
- reject malformed, non-finite, or rank-deficient frame matrices with a Debug Chart warning, keep the last valid frame, and never partially commit malformed `p` text;
- refresh Background Space Details immediately after successful apply.

Acceptance:

- Mode labels are exactly `move` and `direct input`.
- Direct-input submode labels are exactly `manual input` and `import`.
- Move mode preserves existing keyboard and button behavior.
- Direct input accepts rational entries such as `1/3`, `-5/2`, `8`, and decimals.
- Manual `p` inputs and frame-matrix cells support wheel-step editing by `0.1`, clamped to `[-6, 6]` for wheel edits, while rational text entry remains unbounded.
- Frame matrices display columns as `v_i` in both manual input and Background Space Details.
- A full-rank matrix applies and becomes an orthonormal frame.
- A rank-deficient matrix is rejected without mutating the current frame.

### 8. Lattice Sources And Voronoi Diagrams

Status: planned.

Goal: add lattice objects as a major source type before 3D rendering.

Implement:

- add Source Data type `lattice`;
- support matrix-basis input first, where columns are lattice basis vectors in ambient `R^n`;
- support Dynkin lattice presets such as `A_n`, `D_n`, `E_6`, `E_7`, and `E_8` after matrix input is stable;
- plan number-field integer-ring lattice input as a later lattice subgoal;
- render bounded projected lattice points and selected short vectors in frame coordinates;
- render the exact 2D slice of the Voronoi cell using inequalities `<x, lambda> <= ||lambda||^2 / 2` from relevant short lattice vectors;
- cache enumeration and halfspace data per lattice object and ambient dimension;
- report lattice point enumeration count, Voronoi halfspace count, halfspace build time, and draw time in Debug Chart.

Acceptance:

- Matrix-basis lattice objects import/export and render nonblank projections.
- Dynkin presets create the expected ambient dimensions and basis metadata.
- The origin Voronoi cell renders as a filled exact 2D slice when nonempty.
- Runtime diagnostics make expensive enumeration visible.
- Large or degenerate lattice inputs warn without crashing.

### 9. Formula, Inequality, And Quadratic Sources

Status: implemented.

Goal: add mathematical source objects described by equations, inequalities, and especially quadratic forms in coordinates `x_1, ..., x_n`.

Implement:

- add Source Data type `formula set`, slice-visible and projection-inert in this build;
- each formula-set object stores one relation and has params modes `formula` and `import Q`;
- formula text accepts calculator-like syntax, variables `x1`/`x_1`, relation symbols `=`, `<=`, `>=`, `<`, and `>`, and exact-renders polynomial formulas of degree at most 2;
- parse broader functions and powers, including `sqrt`, `abs`, trigonometric functions, `exp`, `ln`, `log`, and `log_a`; non-polynomial formulas render through a numerical implicit-region fallback instead of replacing the exact polynomial path;
- `import Q` accepts matrix-calculator `Rows` for a symmetric displayed matrix `Q`, relation `=`, `<=`, or `>=`, and rational RHS, interpreted as `x^T Q x relation rhs`;
- substitute `x = p + y_1v_1 + y_2v_2` for exact 2D rendering;
- draw linear inequalities through the existing half-plane clipping path, linear equalities as clipped segments or empty sets, and quadratic relations as conic boundaries with filled inequality regions inside the slice box;
- report malformed formulas, nonsymmetric matrices, wrong Q dimensions, non-finite entries, and numerical fallback status in Debug Chart / Source status.

Acceptance:

- Linear inequalities clip to exact 2D polygons through the existing half-plane path.
- Linear equalities render exact 2D lines or empty results.
- Quadratic-form objects accept rational matrix entries.
- Quadratic equality/inequality slices update as `p` and the frame move.
- Strict `<` and `>` are accepted and rendered as closed `<=` and `>=` boundaries with a status warning.
- Malformed formulas preserve the last valid object state and show a warning.

### 10. Tropical Polynomial Parser, Model, And 2D Slice Rendering

Status: implemented.

Goal: add tropical input after generic 2D slice mechanics and before generic 3D rendering, including exact 2D tropical curve slices.

Default convention:

```text
F(X) = max_i(c_i + <a_i, X>)
```

Term model:

```json
{ "coefficient": 0, "exponent": [1, 0, 0], "label": "u1" }
```

Readable examples:

```text
p^0 + u1 + u2
p^0 + u1 + u2 + u3
p^0 + u1 + u2 + p^2 u1^2 + u1u2 + p^2 u2^2
p^0 + u1 + u2 + u3 + u4 + p^{-1} u1u2
```

Acceptance:

- Parser handles constants, negative coefficients, repeated monomials, whitespace, JSON terms, malformed input, and rejects tropical `x_i` notation with a `u_i` warning.
- Tropical objects use the same Source Data object manager.
- Last valid state is preserved after parse errors.
- `max` and `min` conventions are selectable and affect repeated-term merging and curve dominance.
- Exact 2D tropical curve segments render inside the current slice box and update as `p` and the frame move.

### 11. Generic 3D Renderer

Status: implemented in Step 10 for 2D.

Goal: test 3D frame projection before exact 3D intersection and tropical surfaces.

Implement:

- local vendored Three.js;
- projected points, edges, rays, axes, labels, and bounding box;
- 3D screen orbit controls in the Viewport card.

Acceptance:

- 3D mode renders nonblank views for generic source types.
- Screen orbit camera does not mutate `p` or `V`.
- Frame rotations still alter the mathematical projection smoothly.

### 12. Exact 2D Tropical Slice

Status: planned.

Goal: construct the tropical curve in a moving 2D affine slice.

Restrict:

```text
F_slice(y) = max_i(c_i + <a_i, p> + y_1<a_i, v_1> + y_2<a_i, v_2>)
```

Algorithm:

- compute pairwise equality lines;
- clip by display rectangle;
- clip by dominance half-planes;
- draw remaining segments as the tropical curve.

Acceptance:

- `p^0 + u1 + u2` gives the standard tropical line with three rays.
- Moving `p` changes restricted constants continuously.
- Rotating the frame changes the curve smoothly.
- Degenerate terms produce diagnostics instead of crashes.

### 13. Exact 3D Tropical Slice

Status: planned.

Goal: construct tropical surfaces in moving 3D affine slices.

Algorithm:

- restrict terms to `(v_1, v_2, v_3)`;
- compute pairwise equality planes;
- intersect each plane with a bounded cube;
- clip polygons by dominance halfspaces;
- render transparent polygons and edges in Three.js.

Acceptance:

- `p^0 + u1 + u2 + u3` gives the expected tropical plane.
- 4D tropical examples can be viewed through moving 3D slices.
- Empty slices and degenerate coincidences are reported gracefully.

### 14. Polish And Integration

Status: partially implemented.

Goal: make the applet usable and discoverable.

Implemented:

- complete-enough import/export state for current generic objects;
- `index.html` card titled `Higher-Dimensional Slice Calculator`;
- GIF preview using `gif/higher_dimensional_slice_explorer_gif_1.gif`;
- public page renamed to `higher_dimensional_slice_calculator.html`.

Remaining deliverables:

- known-limits note;
- browser verification for desktop and mobile sizes;
- final pass after direct input, lattice, formula, tropical, and 3D features land.

Acceptance:

- The app does not depend on external network resources at runtime.
- Every generic source type has a clear purpose.
- The UI stays compact and does not overlap at mobile or desktop widths.

## Future Modules

- Lie algebra weight slices reusing selected math from `double_young_diagram.html`.
- Toric fan and cone complex viewers.
- Newton polytope and regular subdivision panels.
- Tropical stable intersection experiments.
- Slab/projection diagnostics for approximate high-dimensional inspection.
- Non-orthogonal frame mode via `GL(n)/B`.
- Orthogonal geodesic controls via `SO(n)`.

## Important Defaults

- Build generic frame/slice mechanics first.
- Start/reset with a Cartesian frame object selected, and use Cartesian frame as the default add type.
- Use `v3` as the default move-mode direction when available.
- Use `(v1, v3)` as the default rotation pair when available.
- Use continuous move mode by default, with discrete controls available for exact increments.
- Accept rational text in object parameter inputs; sliders remain bounded convenience controls.
- Test 2D thoroughly before direct-input, lattice, formula, and tropical parser work.
- Add tropical polynomial parsing/modeling before generic 3D rendering.
- Test 3D generic rendering before tropical 3D surfaces.
- Use exact slicing for tropical hypersurfaces.
- Keep slab mode as a later diagnostic, not the main mathematical object.
- Prefer sliders for continuous controls, paired with exact number inputs.
- Keep the name broad: tropical hypersurfaces are the first major module, not the whole app.
