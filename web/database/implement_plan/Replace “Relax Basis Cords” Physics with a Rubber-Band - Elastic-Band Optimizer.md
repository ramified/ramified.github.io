# Implementation Plan: Replace “Relax Basis Cords” Physics with a Rubber-Band / Elastic-Band Optimizer

## 0. Execution Strategy: Two-Model Workflow

This task must be executed using a **two-model workflow** to balance implementation reliability with limited weekly usage.

Use:

- **GPT-5.6 Sol High** for architecture analysis, difficult geometric/topological decisions, and final critical review.
- **GPT-5.6 Terra High** for the majority of implementation, test writing, incremental fixes, and routine refactoring.
- Do **not** use GPT-5.5 Extreme High unless both Sol and Terra fail to resolve a specific blocker.

The objective is to keep total usage comfortably below approximately **25% of the weekly allowance**, ideally around **15–20%**, leaving reserve capacity for unexpected debugging.

The implementation must therefore be divided into gated milestones instead of one large autonomous rewrite.

---

# 0.1 Model Responsibilities

## GPT-5.6 Sol High — Pass 1: Architecture Review

Before modifying any code, Sol High must inspect the existing implementation and produce an exact implementation map.

It must inspect at minimum:

- the current `relax basis cords` mechanism;
- `advanceBackgroundHomologyCordChains()`;
- `makeHomologyCordChain()`;
- `homologyCordPhysicalIndices()`;
- `constrainHomologyCordParticleToSurface()`;
- portal/glued-edge handling;
- real-boundary handling;
- deck-vector closure logic;
- current remeshing;
- generator/homology representation;
- rendering copies versus physical/material particles;
- dragging;
- convergence detection;
- debug-force rendering;
- any existing tests related to basis cords.

Sol must answer these questions before implementation begins:

1. What code belongs specifically to the old spring solver?
2. What code is generic surface/topology infrastructure and must remain?
3. How is the basis generator's topology currently represented?
4. Is the deck vector alone sufficient to preserve the generator class?
5. How are portal crossings represented internally?
6. Can portal mappings rotate or reverse vectors, or are they guaranteed to be translations?
7. What invariants can be automatically checked after every optimization step?
8. Which existing functions can safely be reused by the Rubber-Band solver?
9. Which functions currently mix physics, topology, and rendering responsibilities and should be separated?
10. Which existing behavior tests could regress?

Sol High must **not perform the full refactor during this pass**.

Its output should be a concise implementation map and any necessary corrections to this plan.

If Sol discovers that an assumption in this document is false, the implementation should follow the actual codebase rather than blindly following the plan.

---

# 0.2 GPT-5.6 Terra High — Main Implementation

After the Sol architecture review, Terra High performs the implementation.

Terra must work milestone by milestone.

For every milestone:

1. inspect the relevant existing code;
2. make the smallest coherent change;
3. add or update behavior tests;
4. run the relevant test suite;
5. inspect failures;
6. fix regressions;
7. only proceed when the milestone passes.

Terra must **not proceed to the next milestone while tests introduced by the current milestone are failing**.

Terra must not perform unrelated cleanup.

Terra must preserve the old solver as a temporary fallback until the new solver passes the complete acceptance suite.

---

# 0.3 GPT-5.6 Sol High — Final Review

After Terra completes all milestones and all tests pass, Sol High performs a second review.

This review must focus specifically on subtle failures that ordinary unit tests may miss:

- topology changes;
- incorrect homology preservation;
- portal-frame errors;
- orientation-reversing portal errors;
- accidental use of visual portal copies as physical particles;
- endpoint/deck-closure mistakes;
- invalid segment shortcuts;
- boundary tunneling;
- incorrect remeshing across portals;
- order dependence;
- frame-rate dependence;
- false convergence;
- monotonic-length violations;
- degenerate zero-length segments;
- interactions between dragging and optimization;
- leftover spring-state dependencies.

Sol should review the final diff rather than rewriting the implementation from scratch.

If Sol finds issues, hand those specific findings back to Terra High for fixes.

After Terra fixes them, rerun the complete test suite.

A second full Sol review is unnecessary unless the corrections substantially change the solver architecture.

---

# 0.4 Usage Discipline

To reduce token and weekly quota consumption:

- Keep implementation in the same workspace/session when possible.
- Do not repeatedly request complete repository-wide explanations.
- Inspect only relevant functions/files after the initial architecture pass.
- Do not regenerate this entire plan during implementation.
- Refer back to this document instead.
- Avoid repeatedly asking Sol to implement mechanical changes.
- Use Terra for test fixes, naming changes, helper extraction, and routine refactoring.
- Reserve Sol for geometry/topology decisions and final review.
- Avoid GPT-5.5 Extreme High unless there is a clearly identified unresolved blocker.

Do not use a stronger model merely because a test fails once.

First diagnose the failure with Terra.

---

# 1. Objective

Replace the current mass-spring simulation used by **Relax Basis Cords** with a deterministic Rubber-Band / Elastic-Band optimization method inspired by `pp-ElasticBand` and the classical Elastic Bands algorithm.

The new mechanism should behave like a geometric rubber band:

- continuously shorten the basis cord;
- naturally smooth corners;
- slide along real boundaries instead of bouncing;
- pass continuously through glued edges / portals;
- preserve the topology represented by the basis generator;
- converge without oscillation;
- avoid velocity explosion;
- avoid artificial spring stiffness;
- avoid heuristic spring freezing;
- depend primarily on geometry rather than simulated mass or frame rate.

This is **not intended to be a physically accurate elastic rope simulation**.

The primary objective is geometric optimization:

\[
L(P)=\sum_{i=0}^{n-1}\|p_{i+1}-p_i\|
\]

subject to the quotient-surface, boundary, portal, and topology constraints of the Mosaic Calculator.

---

# 2. Important Interpretation of `pp-ElasticBand`

Use `pp-ElasticBand` as an architectural reference, but do **not** copy its implementation literally.

The useful idea is that an internal particle \(p_i\) receives a contraction direction from its two neighbors:

\[
F_i^{internal}
=
k_c
\left(
\frac{p_{i-1}-p_i}{\|p_{i-1}-p_i\|}
+
\frac{p_{i+1}-p_i}{\|p_{i+1}-p_i\|}
\right).
\]

This is exactly the negative gradient direction of local polyline length.

Equivalently:

\[
-\nabla_{p_i}L
=
\frac{p_{i-1}-p_i}{\|p_{i-1}-p_i\|}
+
\frac{p_{i+1}-p_i}{\|p_{i+1}-p_i\|}.
\]

This is the behavior we want.

Do not interpret this vector as a Newtonian force.

It is an **optimization/descent direction**.

---

# 3. Remove the Current Spring-Dynamics Model

The new solver must no longer rely on:

- particle mass;
- Hooke stretch springs;
- shrinking spring rest length;
- spring stiffness increasing during shrinkage;
- discrete spring-based bending forces;
- velocity integration;
- velocity damping;
- speed limits;
- kinetic-energy convergence;
- strain-based stall detection;
- `shrinkFrozen`;
- `shrinkFloor`;
- time-based shrink-progress heuristics.

Phase out responsibilities currently handled by mechanisms such as:

- `annealHomologyCordRestLength()`;
- `recordHomologyCordShrinkProgress()`;
- Hooke-force calculations;
- bending-force calculations;
- velocity integration;
- speed clamping;
- kinetic settling.

Do not delete the old implementation immediately.

During development, support something equivalent to:

```text
old solver:
    springPhysics

new solver:
    elasticBand
```

The old path should remain available until the new implementation passes the complete behavioral acceptance suite.

---

# 4. Preserve Existing Surface Infrastructure

Reuse existing infrastructure wherever it is correct.

Likely reusable concepts include:

- `makeHomologyCordChain()`;
- `homologyCordPhysicalIndices()`;
- material-particle representation;
- `tileIndex`;
- chart/projected coordinates;
- portal mapping;
- surface constraints;
- drag handling;
- rendering;
- basis-generator association;
- generator IDs;
- topology-analysis infrastructure.

Portal display copies must remain non-physical.

Only the reduced logical/material chain participates in optimization.

The invariant is:

```text
rendering copies != optimization particles
```

---

# 5. Introduce a Separate Elastic-Band Solver

Create a clearly separated solver such as:

```js
advanceHomologyCordElasticBand(chain, analysis, options)
```

or:

```js
relaxHomologyCordElasticBand(chain, analysis)
```

Recommended helper decomposition:

```js
computeHomologyCordContractionDirection()
computeHomologyCordEndpointContraction()
computeHomologyCordSafeStep()
applyHomologyCordElasticBandStep()
validateHomologyCordStep()
resampleHomologyCordElasticBand()
measureHomologyCordConvergence()
```

The core solver must be testable independently from rendering and `requestAnimationFrame`.

---

# 6. Internal Contraction Rule

For every ordinary interior material particle:

```text
previous ---- current ---- next
```

compute:

```js
uPrev = normalize(previous - current);
uNext = normalize(next - current);

direction = uPrev + uNext;
```

Then propose:

```js
candidate =
    current +
    stepSize * contractionGain * direction;
```

Do not multiply by spring stretch.

Do not use rest length.

Do not use velocity.

Do not use acceleration.

For a straight line:

```text
A -------- P -------- B
```

the unit directions cancel:

\[
u_{prev}+u_{next}=0.
\]

For a corner:

```text
A
 \
  P
 /
B
```

the vector points approximately toward the angle bisector and decreases local path length.

This behavior replaces both the old stretch-spring contraction and most of the old bending behavior.

---

# 7. Do Not Add a Separate Bending Force Initially

The first implementation should not include:

\[
p_{i-1}-2p_i+p_{i+1}
\]

as a bending term.

Normalized-neighbor contraction already straightens the polyline.

It also avoids false curvature caused by unequal particle spacing.

Only add optional smoothing later if tests demonstrate a real need.

If smoothing is added, prefer an angle-based regularizer such as:

\[
E_{bend}
=
w_b
\left(
1-\hat t_{i-1}\cdot\hat t_i
\right).
\]

This is outside the first implementation milestone.

---

# 8. Correct Treatment of the Lifted Closed Loop

A basis cord is closed on the quotient surface but may appear open in the lifted representation.

If the existing representation uses deck vector \(D\), enforce:

\[
p_N=p_0+D.
\]

Do not enforce this with a closure spring.

Treat it as an exact geometric constraint.

The two lifted endpoints represent the same logical point under the deck transformation.

For the canonical endpoint \(p_0\), compute contraction using:

- the first outgoing direction;
- the final incoming direction at \(p_N\).

For example:

\[
d_0
=
\frac{p_1-p_0}{\|p_1-p_0\|}
+
\frac{p_{N-1}-p_N}{\|p_{N-1}-p_N\|}.
\]

Apply:

\[
p_0'=p_0+\Delta,
\]

then:

\[
p_N'=p_0'+D.
\]

Do not pin the first point unless it is actively being dragged.

After every accepted iteration:

\[
\|(p_N-p_0)-D\|<\epsilon_D.
\]

If the architecture review shows that the true closure relation requires a more general transformation than translation by \(D\), use the actual quotient-surface transformation instead.

---

# 9. Elastic-Band Bubble Semantics

Borrow the conceptual bubble mechanism from Elastic Bands.

Each particle should have a local region in which it can move safely without causing a discontinuous path change.

For this project, a bubble means **local admissible motion on the quotient surface**.

A safe radius may depend on:

- distance to the nearest real/unpaired boundary;
- maximum configured movement;
- neighboring segment lengths.

For example:

```js
safeRadius = Math.min(
    maxMoveRadius,
    boundaryClearance,
    0.4 * previousSegmentLength,
    0.4 * nextSegmentLength
);
```

Then clamp the proposed displacement:

```js
delta = clampLength(
    contractionDirection * stepSize,
    safeRadius
);
```

The bubble should:

- prevent large discontinuous jumps;
- preserve local connectivity;
- reduce topology-changing shortcuts;
- improve numerical stability.

A glued edge is **not** a physical obstacle.

Do not shrink a bubble merely because it intersects a legitimate portal.

---

# 10. Replace Boundary Reflection with Boundary Projection

The old solver's velocity reflection belongs to physical dynamics.

The Rubber-Band optimizer must instead use geometric projection.

Procedure:

1. Compute unconstrained displacement.
2. Test the resulting candidate.
3. If it remains inside the valid surface, accept it.
4. If it crosses a glued edge, map it through the portal.
5. If it crosses a real boundary, project movement onto the admissible boundary tangent.
6. Preserve the tangential component whenever possible.

Conceptually:

\[
d_{allowed}
=
d-(d\cdot n)n
\]

when the normal component points outside the surface.

Expected behavior:

```text
        desired movement
              ↘

------------------------- wall
           ●  → → →     actual movement
```

The cord slides.

It does not bounce.

---

# 11. Portal Behavior

Portal boundaries must be transparent to the optimizer.

When a candidate crosses a glued edge:

```text
source tile
    ↓
portal transform
    ↓
target tile
```

continue the same logical motion on the neighboring chart.

Do not:

- bounce from the portal;
- stop at the seam;
- create a fixed seam point;
- create another physical particle;
- let rendering copies influence optimization.

After portal mapping there is still exactly one logical particle.

If portal transforms rotate or reverse vector orientation, displacement and contraction vectors must be transformed consistently.

Do not assume all chart transitions are pure translations unless the architecture review proves that they are.

---

# 12. Simultaneous Particle Updates

Do not update particle \(i\) and immediately use its new value to compute \(i+1\).

Use an iteration snapshot.

Example:

```js
const oldPositions = material.map(copyPosition);

const proposed = material.map((point, i) =>
    computeCandidate(oldPositions, i)
);

validateAndApply(proposed);
```

This Jacobi-style update gives:

- deterministic behavior;
- independence from iteration direction;
- easier tests;
- clearer convergence properties.

Do not switch to Gauss-Seidel unless there is a measured reason.

---

# 13. Use Backtracking Instead of Velocity Damping

A valid Rubber-Band step should normally reduce total cord length.

Calculate:

```js
oldLength = materialLength(oldState);
newLength = materialLength(candidateState);
```

If:

```text
newLength > oldLength + tolerance
```

reduce the step:

```text
step *= 0.5
```

and retry.

Example:

```js
for (let attempt = 0; attempt < maxBacktracking; attempt++) {
    candidate = propose(step);

    if (
        candidateIsValid(candidate) &&
        candidateLength <= currentLength + lengthTolerance
    ) {
        accept(candidate);
        break;
    }

    step *= 0.5;
}
```

The desired invariant is:

\[
L_{k+1}\le L_k+\epsilon_L.
\]

This replaces the old need for:

- damping;
- tiny physical time steps;
- speed clamping;
- spring stiffness tuning.

---

# 14. Geometry-Based Resampling

Remeshing must no longer depend on shrinking rest length.

Maintain geometric particle spacing instead.

Define:

```text
minSpacing
targetSpacing
maxSpacing
```

For example:

```text
minSpacing    = 0.4 R
targetSpacing = 0.7 R
maxSpacing    = 1.2 R
```

These initial values may be tuned experimentally.

## Particle insertion

If:

\[
\|p_{i+1}-p_i\|>maxSpacing,
\]

insert a particle near the geometric midpoint.

The midpoint must respect the developed/portal-aware surface path.

## Particle removal

Consider removing \(p_i\) when adjacent segments are very short and removal:

- does not cross a real boundary;
- does not invalidate a portal path;
- does not change topology;
- does not produce a segment longer than `maxSpacing`.

For example:

\[
\|p_i-p_{i-1}\|
+
\|p_{i+1}-p_i\|
<
2\,minSpacing.
\]

Never reduce below the minimum stable particle count.

Resampling should approximately preserve length:

\[
|L_{before}-L_{after}|<\epsilon_{remesh}.
\]

---

# 15. Preserve Topology Explicitly

This is a hard requirement.

A shorter cord is incorrect if it silently changes the basis generator.

Preserve at minimum:

- generator identity;
- closure/deck relation;
- continuous portal traversal;
- homology coordinates or equivalent topological representation.

Do not assume that Euclidean deck displacement is necessarily the only topology invariant.

Where available, validate:

```js
candidateHomology = computeCordHomology(candidate);

if (!equal(candidateHomology, generator.homology)) {
    rejectCandidate();
}
```

If full homology reconstruction is expensive, perform it at least:

- after resampling;
- after changes in portal itinerary;
- periodically;
- before declaring convergence.

The safe-step/bubble mechanism should reduce accidental topology changes but must not replace explicit validation.

---

# 16. Segment Validity, Not Only Particle Validity

Two valid endpoint positions do not guarantee a valid connecting segment.

Every neighboring pair must define a legitimate local path.

Validate that each segment:

- remains inside the appropriate chart; or
- crosses only legitimate portals;
- does not cut across a real boundary;
- does not jump between unrelated tiles.

If invalid:

1. reject the candidate and backtrack; or
2. insert an intermediate material particle when appropriate.

This check is essential.

---

# 17. Convergence

Remove convergence logic based on:

- kinetic velocity;
- spring strain;
- `shrinkFrozen`;
- elapsed physical time.

Track:

```text
totalLength
maximumParticleDisplacement
maximumContractionResidual
```

Declare convergence when:

\[
\frac{|L_{k-m}-L_k|}
{\max(L_k,\epsilon)}
<
\epsilon_L
\]

and:

\[
\max_i
\|p_i^{k+1}-p_i^k\|
<
\epsilon_x.
\]

Require several consecutive stable iterations.

Suggested initial parameters:

```text
relativeLengthTolerance = 1e-4
positionTolerance       = radius * 1e-4
stableIterations        = 5
```

Tune using behavior tests.

---

# 18. Animation Model

Do not interpret elapsed frame time as physical simulation time.

Instead run a fixed optimization budget:

```js
for (let i = 0; i < iterationsPerFrame; i++) {
    relaxHomologyCordElasticBandIteration(...);
}
```

Example:

```text
iterationsPerFrame = 4
```

Continue animation while:

```text
!chain.settled || userIsDragging
```

The final result should be approximately independent of 30 FPS, 60 FPS, or 120 FPS.

---

# 19. Dragging

While a material point is held:

- the selected logical particle follows the pointer;
- other particles may continue optimizing;
- the solver must not move the held particle;
- boundary and portal rules still apply.

After release:

- clear the fixed state;
- resume contraction immediately;
- do not restore old spring rest lengths;
- do not restore old velocity;
- do not introduce momentum.

---

# 20. Debug Visualization

Remove the semantic concept of `net force` from the new solver.

Expose optimization-specific data such as:

```text
Contraction direction
Proposed displacement
Accepted displacement
Boundary correction
Portal-transformed displacement
Local length before/after
Iteration residual
```

Optional debug arrows:

```text
raw contraction direction
accepted displacement
removed boundary-normal component
```

Use terminology such as:

```text
optimization direction
```

rather than:

```text
force
```

---

# 21. Configuration Parameters

Retire user-facing controls based on:

```text
Mass
Stretch spring
Bend spring
Closure spring
Damping
Shrink rate
Physical substeps
```

Replace internally with:

```text
Contraction gain
Step size
Iterations per frame
Minimum spacing
Target spacing
Maximum spacing
Maximum local move
Length tolerance
Position tolerance
Backtracking attempts
```

Initially expose only simple controls such as:

```text
Relax speed
Point spacing
```

until advanced controls are genuinely needed.

---

# 22. Gated Implementation Milestones

The AI must follow these milestones in order.

Do not combine them into one large change.

## Milestone 1 — Euclidean contraction

Implement only:

- normalized-neighbor contraction;
- simultaneous updates;
- no walls;
- no portals;
- no remeshing.

Required tests:

- straight-line equilibrium;
- V-shaped contraction;
- zig-zag straightening;
- unequal-spacing collinearity;
- zero-length robustness.

Do not proceed until all pass.

---

## Milestone 2 — Exact loop/deck closure

Implement exact endpoint relationship.

Required tests:

- exact deck closure;
- whole-loop translation;
- no artificial endpoint pinning.

Do not proceed until all pass.

---

## Milestone 3 — Backtracking and deterministic convergence

Add:

- total-length checks;
- adaptive backtracking;
- geometric convergence;
- deterministic iteration budget.

Required tests:

- monotonic length;
- deliberately oversized initial step;
- deterministic reruns;
- frame-rate independence.

Do not proceed until all pass.

---

## Milestone 4 — Real boundaries

Replace collision/reflection behavior with geometric projection/sliding.

Required tests:

- boundary sliding;
- obstacle/corner tightening;
- no boundary penetration;
- no bouncing.

Do not proceed until all pass.

---

## Milestone 5 — Portals

Integrate quotient-surface portal transitions.

Required tests:

- portal crossing;
- vector-direction consistency;
- orientation reversal if supported;
- visual copies remain non-physical;
- continuous length across seam.

Do not proceed until all pass.

---

## Milestone 6 — Geometric resampling

Replace spring-rest-length remeshing.

Required tests:

- insertion;
- removal;
- remeshing around portals;
- length preservation;
- no oscillation between insertion/removal states.

Do not proceed until all pass.

---

## Milestone 7 — Explicit topology validation

Validate generator class throughout optimization.

Required tests:

- all basis generators preserve homology;
- portal-itinerary changes remain topologically valid;
- rejected topology-changing shortcuts do not enter the chain.

This milestone is a hard blocker.

---

## Milestone 8 — Remove legacy spring state

Only now remove or deprecate obsolete fields such as:

```text
restLength
referenceRestLength
hardRestLength
shrinkFloor
shrinkFrozen
shrinkWindow
relaxation vx/vy
mass
spring constants
damping
physical substeps
```

Before deletion, search the repository for every use.

Do not delete state still needed by unrelated code.

Run the entire test suite afterwards.

---

# 23. Behavioral Tests

## Test A — Straight Cord Is an Equilibrium

```text
A ---- P1 ---- P2 ---- B
```

Expected:

- contraction approximately zero;
- no perpendicular drift;
- total length constant within tolerance;
- no oscillation.

Also test:

```text
A -------- P1 -- P2 -------- B
```

Unequal spacing must not create artificial curvature.

---

## Test B — V-Shaped Corner

```text
A
 \
  P
 /
B
```

Expected:

- P moves into the angle;
- direction matches normalized-neighbor sum;
- total length decreases;
- no overshoot.

---

## Test C — Zig-Zag Straightening

```text
A /\/\ B
```

Expected:

- corners flatten;
- length is monotonic within tolerance;
- path approaches straight;
- result does not depend on iteration order.

---

## Test D — Unequal Collinear Spacing

Three collinear particles with strongly unequal spacing.

Expected:

- no false bending;
- path stays straight.

---

## Test E — Exact Deck Closure

Verify every iteration:

\[
\|(p_N-p_0)-D\|<\epsilon.
\]

Expected:

- no closure drift;
- no endpoint spring behavior.

---

## Test F — Whole-Loop Translation

Create geometry where lateral movement reduces total length.

Expected:

- logical closure pair moves together;
- first point is not artificially pinned.

---

## Test G — Real Boundary Sliding

Expected:

- no surface escape;
- outward displacement removed;
- tangent movement preserved;
- no bounce.

---

## Test H — Tightening Around a Boundary Corner

Expected:

- cord moves toward a taut local configuration;
- contact points slide;
- no penetration;
- stable local minimum.

---

## Test I — Portal Crossing

Expected:

- correct paired tile;
- correct `tileIndex`;
- no bounce;
- no duplicate logical particle;
- no seam pin;
- continuous length.

---

## Test J — Portal Direction Consistency

Transform the contraction/displacement direction through the portal.

Expected:

- same geometric tangent direction on the quotient surface;
- correct handling of reversed orientation if applicable.

---

## Test K — Visual Portal Copies Are Non-Physical

Expected:

- one logical optimizer particle;
- renderer may show several copies;
- copies contain no independent optimization state.

---

## Test L — Oversized Step

Use deliberately excessive `stepSize`.

Expected:

- backtracking stabilizes it;
- no NaN;
- no explosion;
- no velocity clamp.

---

## Test M — Frame-Rate Independence

Compare simulated:

```text
30 FPS
60 FPS
120 FPS
```

using equal optimization iteration counts.

Expected final states within tolerance.

---

## Test N — Determinism

Run identical input multiple times.

Expected:

- same final topology;
- same final length;
- same particle count;
- positions equal within tolerance.

---

## Test O — Particle Insertion

Expected:

- long links subdivide;
- valid surface metadata;
- no topology change;
- negligible length error.

---

## Test P — Particle Removal

Expected:

- redundant points disappear;
- path geometry remains nearly unchanged;
- topology remains unchanged.

---

## Test Q — Remeshing Near Portal

Expected:

- correct chart/tile metadata;
- no duplicate seam particles;
- path remains continuous.

---

## Test R — Degenerate Segment

Two adjacent particles nearly coincide.

Expected:

- no division by zero;
- no NaN;
- solver recovers or resamples.

Use an epsilon guard.

---

## Test S — Drag and Release

Expected while dragging:

- selected point follows pointer;
- optimizer does not move it;
- other points may relax.

Expected after release:

- immediate contraction;
- no inherited momentum;
- no overshoot.

---

## Test T — Homology Preservation

For every basis generator:

1. record class before relaxation;
2. run to convergence;
3. recompute class.

Assert:

```text
homologyBefore == homologyAfter
```

A shorter result that fails this test is invalid.

---

## Test U — Long-Run Stability

Continue running well after convergence.

Expected:

- no coordinate drift;
- no topology change;
- no remesh oscillation;
- no gradual length increase.

---

# 24. Quantitative Invariants

Automatically assert wherever practical:

## Length

\[
L_{k+1}\le L_k+\epsilon_L.
\]

## Closure

\[
\|(p_N-p_0)-D\|<\epsilon_D.
\]

## Finite positions

```js
Number.isFinite(point.x)
Number.isFinite(point.y)
```

for every logical particle.

## Surface validity

Every material point must belong to a valid surface/chart state.

## Segment validity

Every adjacent pair must represent a valid continuous surface path.

## Topology

\[
H_1(\text{relaxed cord})
=
H_1(\text{original generator}).
\]

## Spacing

Outside explicitly allowed exceptions:

\[
d_{min}
\lesssim
\|p_{i+1}-p_i\|
\lesssim
d_{max}.
\]

## Convergence

When:

```text
chain.settled === true
```

both must hold:

```text
relative length improvement < tolerance
maximum accepted displacement < tolerance
```

---

# 25. Final Acceptance Criteria

The implementation is complete only when:

1. Relax Basis Cords no longer requires Hooke spring dynamics.
2. Shortening is driven by normalized-neighbor contraction.
3. Straight cords produce approximately zero contraction.
4. Bent cords shorten naturally.
5. Accepted steps are approximately length-monotonic.
6. Real boundaries cause sliding rather than bouncing.
7. Glued boundaries behave as continuous portals.
8. Closure/deck relations are preserved exactly.
9. Generator topology/homology is preserved.
10. Remeshing depends on geometry instead of rest length.
11. Results are approximately frame-rate independent.
12. Dragging introduces no momentum.
13. No mass, damping, speed limit, spring stiffness, or `shrinkFrozen` tuning is required.
14. Degenerate segments do not produce NaNs.
15. Visual behavior resembles a tightening geometric rubber band rather than a vibrating rope.
16. Existing unrelated Mosaic Calculator behavior still passes its regression tests.
17. Sol High final review reports no unresolved topology or portal correctness issue.

---

# 26. Final Handoff Protocol

After Terra High believes implementation is complete, prepare a concise handoff for Sol High containing:

```text
1. Files changed
2. Old solver components removed/replaced
3. New solver entry points
4. Portal handling changes
5. Boundary handling changes
6. Resampling changes
7. Topology validation mechanism
8. Tests added
9. Tests currently passing
10. Known limitations or uncertain assumptions
```

Do not send Sol a long chronological transcript.

Send the current code state, diff, relevant tests, and the concise handoff.

Sol should review the actual implementation rather than reasoning only from the summary.

If Sol reports concrete defects, return those defects to Terra as a bounded fix list.

Terra should modify only what is necessary, rerun all affected tests, then run the full suite.

---

# 27. Development Safety Rules

Throughout the task:

- Do not rewrite unrelated modules.
- Do not remove the old solver before the replacement passes acceptance tests.
- Do not silently weaken or delete failing tests.
- Do not change topology rules merely to make optimization easier.
- Do not treat rendering duplicates as material particles.
- Do not assume portal transforms are translations without verifying the code.
- Do not use Euclidean straight-line shortcuts across invalid surface regions.
- Do not declare success based only on visual appearance.
- Do not proceed past a milestone with failing new tests.
- Do not replace deterministic logic with random perturbations to escape convergence problems.
- Prefer rejecting/backtracking an invalid step over applying a questionable geometric shortcut.
- Preserve a working rollback point before each high-risk milestone.

---

# 28. Core Design Principle

The old solver asks:

> “What physical force would a shrinking elastic spring apply to these masses?”

The new solver must ask:

> “What small continuous deformation decreases the length of this curve while keeping it on the same quotient surface and in the same topological class?”

Treat the new Relax Basis Cords mechanism as a:

**constrained curve-shortening / Rubber-Band optimizer**

rather than a physical rope simulation.

That distinction should guide all implementation decisions.