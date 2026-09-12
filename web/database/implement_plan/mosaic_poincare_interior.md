# Complete-interior preview

The former disk panel developed the solver's geodesic-boundary metric into an
ambient Poincaré disk. For a bordered surface this is a proper region Ω of that
disk. Its physical boundary is at finite distance. Restricting the ambient disk
metric to Ω does **not** give the complete Poincaré metric of Ω.

The corrected panel defaults to **Complete interior (approximation)** and keeps
**Reflecting boundary metric** as a separate option. On closed surfaces the two
metrics coincide, so the original live lifted billiard remains available.

## Numerical construction

1. Use the ready discrete solve as a conformal starting geometry. Develop the
   finite neighborhood with the existing radius-5 / 10,000-copy limits.
2. Extract physical boundary lifts. In Klein coordinates each geodesic gives a
   supporting half-plane containing the launch point. Intersect the discovered
   half-planes with the ambient disk. Undiscovered lifts make this an outer
   approximation of the actual developed interior; the rendering frontier is
   never used as a physical boundary.
3. Sample the resulting circular boundary and apply the Marshall–Rohde geodesic
   algorithm, a composition of conformal slit maps. Normalize the launch point
   to zero and the derivative to be positive real. Compute an analytic inverse.
4. Compare maps using 512 and 1,024 angular samples, plus ideal endpoints. Reject
   unresolved cases. The displayed refinement difference measures sampling
   stability, **not** the error from missing boundary lifts or the starting mesh.
5. Recover boundary correspondence using inverse images approaching the ideal
   circle. Exact forward evaluation on a slit can choose the wrong boundary
   branch. The artwork uses an interpolated outer 5% radial collar to reconcile
   the physical boundary with the nearby sampled Jordan curve; this rendering
   interpolation is **not conformal**. Interior analytic mapping, artwork
   interpolation, and geodesic integration are separate operations.

Conceptually the new metric is F*ds²_D, where F uniformizes Ω. The implementation
approximates F on a finite domain; it does not solve a new complete metric on the
quotient mesh, certify deck invariance, or claim exact conformality of the artwork.
Increasing boundary sampling alone cannot remove the finite-neighborhood error.

## Motion and state

On bordered surfaces, **Start interior geodesic** launches a separate disk
geodesic using the position and direction captured when the panel opens. With no
board ball it starts in the first triangle. The path advances by hyperbolic
arclength: z(s)=T_a^{-1}(v tanh(s/2)). It has no boundary collision or reflection;
the numerical run stops at length 12 while still inside the disk. This path is
not projected back into the board simulator. The existing board billiard and its
clock continue to use the original reflecting metric.

Switching models, reopening, restarting/clearing the board ball, or changing the
metric clears numerical mapping and trajectory state. Artwork is drawn in
bounded batches. The complete preview freezes its sampled boundary domain during
camera movement, so panning cannot silently change the metric of an active path.
All uniformization and independent trajectory data remain outside board exports.

## Current limits

- The starting solver still requires χ<0. Disk and annulus interiors also admit
  complete Poincaré metrics but need another starting solver; they are explicitly
  unsupported here, rather than declared non-hyperbolic.
- FEM development is unavailable. A failed or stale discrete solve is not used.
- The artwork's original hyperboloid barycentric map and its boundary collar are
  approximations. Features near the ideal circle may be omitted or distorted.
- The finite set of boundary lifts is not a global uniformization certificate.
  This is a numerical interior preview, not exact disk-based board physics.
  More than 512 distinct sampled boundary lifts is rejected to bound computation.

## Validation

Run `node js/mosaic_poincare_uniformization_test.js` and
`node js/mosaic_poincare_integration_test.js`, plus the existing Poincaré geometry,
hyperbolic metric, hyperbolic integration, calculator, and glue-flap suites.
The dedicated tests include disk identity, analytic inverse, Cauchy–Riemann
equations, the exact complete metric of a half-disk, boundary correspondence,
finite-distance geodesic positions, reflection separation, model switching,
and invalidation while a new metric is being computed.

Browser checks: open a bordered square or hexagonal surface; choose the complete
view; check full artwork, ideal boundary, start/pause/resume, pan/recenter,
follow, mesh and wide layout. Switch to the reflecting view and check that its
finite geodesic boundaries remain visible. Closed surfaces retain their live
board trajectory. Drawing may finish progressively after opening or resizing.

## References

- Mazzeo and Taylor, [Curvature and Uniformization](https://arxiv.org/abs/math/0105016):
  completeness and the Poincaré metric of an open surface.
- Marshall and Rohde, [Convergence of the Zipper algorithm for conformal mapping](https://sites.math.washington.edu/~rohde/papers/zipper.pdf),
  Section 1: the geodesic algorithm and its elementary maps.
