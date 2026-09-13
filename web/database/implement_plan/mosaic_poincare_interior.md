# Fixed intrinsic complete-interior motion

The main canvas, Poincare panel and Wander consume one shared trajectory. Motion
is computed on the finite quotient surface. Each disk view owns its own finite
preview, camera, development and artwork buffers. Views never advance motion,
choose its metric, change its local chart, or impose a trajectory length limit.

## Metric

`js/mosaic_intrinsic_metric.js` is a browser/Node module. Closed surfaces reuse
the ready discrete hyperbolic triangle metric. Its vertex-fan closure is checked
before launch. Triangle interiors have curvature -1; the discrete solver leaves
small numerical angle residuals at vertices.

For a bordered surface, the existing metric g0 has reachable geodesic boundaries.
The correction seeks g = exp(2u) g0 with Delta_g0 u = exp(2u) - 1. It is solved
once on the quotient mesh, including all glued identifications, independently of
launch position and cameras. The numerical method is:

1. Subdivide every source triangle into four correction elements, sharing edge
   midpoint unknowns across ordinary and glued edges. This refines the scalar
   correction; it does not rerun or change the source discrete metric.
2. Assemble sparse finite-element stiffness and lumped mass using three-point
   quadrature of the source triangle's hyperbolic metric. The source mapping is
   normalized hyperboloid interpolation, evaluated in a nearby disk chart.
3. Compute a positive defining function rho from (-Delta_g0 + 1) rho = 1, with
   rho = 0 on the physical boundary. Write u = -log(rho) + v. Boundary values of
   v use the estimated normal derivative of rho. A damped Newton/PCG solve finds
   the regular correction. The displayed residual is a scaled algebraic solve
   residual, NOT a bound on curvature, metric scale, or long-time trajectory error.
4. Evaluate the positive field W = rho exp(-v), so g = g0/W^2. Identified points
   share nodal values. Piecewise field gradients are handled by adaptive motion
   steps; the field is not claimed to be a globally exact curvature -1 metric.
5. In a fixed small physical-boundary collar, use the analytic asymptotic model
   W = tanh(d), where d is inward g0-distance from the geodesic boundary. It is
   used for d <= 0.001 and joined to the computed field with a quintic blend for
   0.001 < d < 0.002. Boundary vertex fans use the same geodesic lifts, including
   triangles touching a boundary only at a vertex. This is part of the FIXED
   approximate metric, not an artwork interpolation and not a camera-dependent
   change. It enforces completeness but introduces a modeling error in the join;
   solver residual alone does not estimate that error.

The benchmark disk in `mosaic_intrinsic_metric_test.js` compares the correction
against W=(R^2-|z|^2)/(R(1-|z|^2)). On geodesic polygon meshes with 3, 6 and 10
radial rings, maximum relative W errors on |z| <= 0.45 decrease approximately
4.55%, 1.81%, 0.79%. These are an interior convergence experiment, not a universal
accuracy guarantee for arbitrary boards or the boundary join.

## Motion

`js/mosaic_complete_interior.js` exports the intrinsic `Controller`. The old
`FrozenController` remains available for finite-map regression tests; the app
does not use it for motion.

Preparation requires the same ready discrete solve and supported topology as
before. Preparation is incremental, and metric/topology invalidation rejects
stale work. Appearance changes do not rebuild the metric.

Authoritative state includes source triangle/tile, local position and direction,
local disk chart, speed supplied by the main clock, and accumulated arclength.
Closed motion follows exact disk geodesic segments. Bordered motion integrates
the geodesic equation for the fixed field using RK4 step doubling, at most 0.02
hyperbolic units per accepted step. Position and angle comparisons refine steps;
seam and vertex-fan transitions are resolved before committing. Failed geometric
or integration checks pause at the last accepted state.

Motion generates only needed neighboring triangles. It rebases after traveling
0.75 base-hyperbolic units from the chart center or growing beyond 512 local
copies, retaining nearby copies and the current lift. Position and tangent are
transformed together. There is no radius-5, 10,000-copy, or arclength-12 motion
stop. Restart retains the fixed metric and restores the stored launch.

Below inward distance 0.0005, the analytic end uses (log(d), boundary arclength,
heading) as motion coordinates. It returns to ordinary coordinates above
0.00075. The logarithmic distance continues evolving when the board position
rounds to its limiting boundary point. It never reflects. Physical-boundary
vertex transitions follow the boundary's identified topology.

The main canvas projects local coordinates directly. Paired seam coordinates
split the board trail, including self-gluings. Motion history retains at most
6,000 entries independently of accumulated arclength. The speed slider still
maps its default 0.20 to 1 hyperbolic unit/second. Flat and reflecting motion
retain their previous behavior.

## Independent disk previews

Each `MosaicPoincareView.View` develops a radius-5, at most 10,000-copy preview.
Its maps and copies are independent of the controller and of the other view.
Closed previews use the source hyperbolic development. Bordered previews still
use a finite zipper uniformization of discovered boundary half-planes, including
its display interpolation. That is a CONFORMAL VISUAL APPROXIMATION to the same
underlying conformal surface, not an exact isometric development of the new
numerical metric. Its finite-domain error has not been eliminated by the motion
refactor. It is labeled independently and never feeds back into physics.

A fixed camera remains anchored while motion rebases. Follow requests fresh
preview coverage as needed. A preview may take time to build, be unavailable,
or lose the ball below display precision without pausing motion. Very deep
boundary excursions can no longer be resolved by this finite artwork map;
logarithmic motion still continues. The preview retains up to 1,500 trail entries.
The 512-boundary-lift cap applies only to constructing a bordered preview.

Wander keeps Tile exploration and Complete interior choices. Complete interior
activates shared motion and defaults to Follow ball. Manual panning or selecting
copies disables follow; reset changes the view rather than the ball. Main and
companion play/pause/restart continue to address the same controller.

## Compatibility and limitations

- Only `complete-interior` is persisted. Numerical maps, meshes and trajectories
  never enter board exports. `hyperbolic` retains its reflecting meaning.
- A connected orientable surface with chi < 0 and a ready discrete solve is
  still required. Disk/annulus support and FEM as a starting metric are not added.
- The bordered correction is an approximation with finite-element and boundary
  model error. A converged algebraic solve is not a certified uniformization.
- Adaptive integration controls local errors. Long chaotic paths are not promised
  to agree globally to a fixed tolerance for arbitrarily long times.
- Preview error and missing artwork do not imply a motion failure. Motion failures
  still report unresolved chart transitions, degeneracy or failed integration.

## Validation

Run the existing eight suites plus the two new intrinsic suites:

```
node js/mosaic_poincare_test.js
node js/mosaic_poincare_uniformization_test.js
node js/mosaic_poincare_integration_test.js
node js/mosaic_hyperbolic_metric_test.js
node js/mosaic_hyperbolic_integration_test.js
node js/mosaic_calculator_glue_flap_test.js
node js/mosaic_complete_interior_test.js
node js/mosaic_complete_wander_integration_test.js
node js/mosaic_intrinsic_metric_test.js
node js/mosaic_intrinsic_motion_test.js
```

The intrinsic tests include an analytic metric benchmark and refinement trend,
426 ordinary/glued edge checks on a bordered fixture, boundary asymptotics,
closed square/hexagonal and bordered motion through arclength 100, bounded chart
and history storage, logarithmic distance below -100, frame partitioning,
short-time reversal, restart/clear, vertex hits and stale metric invalidation.
The prior frozen-map tests retain collar inverse, fold rejection and lookup-cycle
regressions. Main/Wander integration checks the actual clock and independent views.
Camera tests also check fixed-screen geodesic coordinates across chart changes,
separate preview ownership, and usable motion controls during preview preparation
or failure. Headless Edge checks cover closed and bordered square examples with
pipes, shared play/pause, Wander keyboard panning and recentering, wide layout,
resizing, both 10,000-copy previews, and continued motion with both cards closed.

Also run `node js/mosaic_calculator_test.js`. The known baseline failure is
`testBilliardsPaletteDropAndRackDirection`; report it separately.

## References

- Mazzeo and Taylor, [Curvature and Uniformization](https://arxiv.org/abs/math/0105016):
  curvature equation and boundary expansion of the complete conformal metric.
- Marshall and Rohde, [Convergence of the Zipper algorithm](https://arxiv.org/abs/math/0605532):
  numerical conformal maps of sampled planar domains, used for preview only.
