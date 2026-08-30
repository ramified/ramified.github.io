# Ramified Minigames — Topological Billiards Implementation Plan

## Implementation Status Record — 2026-08-30

This section records the audited state of the implementation. It does not replace
the requirements below. Update the audit date, status tables, verification results,
and next priorities whenever billiards behavior changes.

### Status Summary

| Version | Status | Summary |
| --- | --- | --- |
| V0 — geometry and rotation | **Mostly complete** | The canonical state, local-cover images, finite-radius seam rendering, glue transport, quaternion orientation, and debug texture are implemented. Pixel-level seam continuity and closed-loop orientation holonomy are not yet covered by the required automated tests. |
| V1 — playable billiards | **Playable, but technically incomplete** | Cue input, multiple balls, collisions through glued images, friction, pockets, scoring, turn lifecycle, restart, and deterministic simulation are implemented. The production engine does not yet have continuous collision detection. |
| V2 — spin and 2.5D rendering | **Mostly implemented** | Contact-point spin, sliding/rolling behavior, persistent orientation, spherical textures, and three aim-assistance levels are present. Several required spin and split-rendering acceptance tests are still missing. |
| V3 — optional advanced physics | **Mostly not implemented** | Online action synchronization and game records exist, but tangential collision friction, spin throw, detailed cushion physics, bank prediction, sound, and richer pool rules do not. |

The current user-facing result is best described as a **playable V2-like beta**, not
as a completed V2 under the strict definitions in Sections 40 and 41.

### Production Architecture

The browser page lazily loads:

- `js/billiards/topological_billiards_math.js` for affine, vector, and quaternion math;
- `js/billiards/topological_billiards_physics.js` as the reference surface/physics implementation and deterministic test harness;
- `js/billiards/topological_billiards_renderer.js` for spherical textures and ball drawing;
- `js/billiards/topological_billiards_native.js` for the production mosaic atlas, game state, physics, rendering coordination, rules, setup tools, and import/export;
- `js/billiards/topological_billiards_simulation_worker.js` for off-main-thread shot simulation;
- `js/ramified_minigames_setup.js` for DOM controls, pointer input, playback, status, records, and online integration.

Important: `topological_billiards_physics.js` contains continuous collision detection,
but the live page advances games through `topological_billiards_native.js`. The native
engine currently integrates a complete `1 / 240` step and then resolves overlapping
balls. Therefore the reference high-speed CCD test must not be treated as proof that
the production game has CCD.

`js/billiards/README.md` is currently stale. It names a nonexistent
`topological_billiards_game.js` and says billiards does not add branches to
`ramified_minigames_setup.js`. Use the module list above until that README is updated.

### Implemented User-Facing Capabilities

- Billiards is registered as a Ramified Minigames mode and uses the shared mosaic canvas.
- Square and hexagonal presets, removed tiles, cut edges, ordinary adjacency, rotated glues, and orientation-reversing glues are supported.
- Six catalog entries currently advertise Billiards: boundary glue board, twisted torus, genus 2, half-glued, Rubik's Cube 2x2x2, and usual strip.
- Setup mode can place, move, and erase one cue ball and numbered target balls.
- Setup mode can add or remove quotient-vertex pockets and place 6-, 10-, or 15-ball racks with a direction preview.
- Placement validation rejects physical-boundary intersections, pocket intersections, ball overlaps, and short self-image overlaps.
- The cue is aimed by dragging away from the intended direction; drag length controls power.
- A cue-ball contact pad provides center, topspin, backspin/draw, sidespin, and combined-spin input.
- Friction can be adjusted from 50% to 250%.
- Beginner aim assistance follows glued transitions to the first ball, pocket, wall, or detected loop; Normal and Expert show progressively shorter guides.
- Solo rules count pocketed targets and shots.
- Competitive rules track two scores and turns, retain the turn after scoring, pass after a miss or scratch, provide ball in hand after a scratch, and resolve wins or draws.
- Deterministic shots run at `1 / 240` seconds in a Web Worker, with a chunked main-thread fallback, then play from sampled trajectory frames.
- Status, preset, and game-record import/export are supported.
- Online billiards actions and competitive-turn snapshots are validated by the shared room worker.
- Static and dynamic billiards UI text has non-empty English and Simplified Chinese entries.

### V0 Acceptance-Test Status

| Test | Status | Current evidence / remaining work |
| --- | --- | --- |
| V0.1 Ordinary Motion | **Verified** | Deterministic frictionless motion is covered by `testOrdinaryMotionAndDeterminism`. |
| V0.2 Translation Seam | **Verified in logic** | Canonical transport and pre-crossing finite-radius images are tested. There is no browser pixel comparison. |
| V0.3 Rotational Glue | **Verified in logic** | Position, velocity, angular velocity, and orientation transport are covered by rotation tests. |
| V0.4 Orientation-Reversing Glue | **Verified in logic** | The `diag(A, det(A))` lift and normalized quaternion transport are tested. Mirrored output is not checked with a rendered-pixel test. |
| V0.5 Seam Pixel Continuity | **Not fully verified** | The renderer clips complementary images to their tiles, and seam image counts are tested. Add a canvas-pixel test for gaps, overlap, opacity, and one-frame disappearance. |
| V0.6 Repeated Seam Traversal | **Verified in reference engine** | A 12,000-step test checks speed, quaternion norm, crossing count, and the single physical-ball invariant. Add equivalent long-running native-engine coverage. |
| V0.7 Closed Topological Loop | **Partial** | Aim tracing detects closed loops, but no test transports a moving ball around a known loop and verifies final position, velocity, and orientation holonomy. |

### V1 Acceptance-Test Status

| Test | Status | Current evidence / remaining work |
| --- | --- | --- |
| V1.1 Head-On Equal-Mass Collision | **Verified in reference engine; exercised natively** | The reference test checks velocity transfer, momentum, and energy. Native tests check basic collision transfer. |
| V1.2 Glancing Collision | **Implemented but unverified** | The normal-impulse solver should handle glancing contact, but there is no dedicated no-sticking/no-energy-growth regression. |
| V1.3 Seam Collision | **Verified** | Reference and native tests cover collisions through ordinary, reflected, and orientation-preserving glued images. |
| V1.4 High-Speed Collision | **Missing in production** | Reference CCD passes, but native gameplay uses post-step overlap detection and can tunnel with imported extreme speed parameters. Implement native CCD or route production through the tested CCD solver. |
| V1.5 No Self-Collision | **Verified in reference engine** | Collision pairs contain distinct canonical balls, and setup rejects ambiguous short self-image overlaps. Add a native moving-ball regression. |
| V1.6 Collision Conservation | **Verified in reference engine only** | Add native frictionless restitution-1 momentum and energy assertions. |
| V1.7 Image Independence | **Partial** | Transform round trips and collisions through several glue charts are tested, but the exact same collision has not been run through two equivalent chart choices and compared canonically. |

### V2 Acceptance-Test Status

| Test | Status | Current evidence / remaining work |
| --- | --- | --- |
| V2.1 Center Strike | **Implemented, partially tested** | Center contact uses the torque formula and should produce minimal immediate cue spin. Add an explicit assertion for that result. |
| V2.2 Topspin | **Implemented and sign-tested** | Above-center contact produces forward-spin angular velocity. Follow behavior after collision is not tested. |
| V2.3 Backspin | **Implemented and sign-tested** | Below-center contact produces draw angular velocity. Frictional decay and draw after a collision need a dedicated regression. |
| V2.4 Sidespin | **Implemented and sign-tested** | Side contact produces vertical-axis spin without an ad hoc direction change. |
| V2.5 Combined Spin | **Implemented but unverified** | Diagonal contact feeds both torque components, but there is no dedicated combined-spin/quaternion-rendering test. |
| V2.6 Sliding-to-Rolling Transition | **Verified in reference engine** | Contact-point slip is tested to converge toward rolling. Add native continuity assertions around the transition. |
| V2.7 Orientation Persists at Rest | **Verified in reference engine** | Orientation is not reset when velocity and angular velocity reach zero. |
| V2.8 Spin Through Glue | **Verified in reference engine; shared math used natively** | Angular velocity and quaternion orientation use the lifted glue transform. Add a native extended-play regression. |
| V2.9 Split Rendering During Spin | **Implemented in logic, not pixel-verified** | Both pieces are derived from one canonical orientation and clipped separately. Add a rendered-pixel or browser screenshot regression for marking alignment. |

### Debugging and Architecture Gaps

- The live Atlas debug option mainly displays quotient vertex/cone information.
- The Orientation debug option supplies the asymmetric texture required by Section 7.
- The live debug view does not yet expose all items requested in Section 26: image transform IDs, velocity and angular-velocity vectors, collision normal/time-of-impact history, seam intersections, orientation axes, contact-point slip, or sliding/rolling/stopped state.
- `topological_billiards_native.js` combines atlas construction, game rules, physics, rendering helpers, setup editing, aiming, and serialization. This diverges from the module-boundary recommendation in Section 25.
- The native atlas constructs its own affine glue maps from preset edge frames instead of using a shared neutral transformation module with the Mosaic Calculator. Behavior is tested, but the shared-code goal in Section 24 remains architectural debt.

### Verification Snapshot — 2026-08-30

The following commands passed:

```text
node js/billiards/topological_billiards_test.js
node js/billiards/topological_billiards_worker_test.js
node js/ramified_minigames_import_export_test.js
node js/ramified_minigames_i18n_test.js
```

The broad command below currently fails at an unrelated Hex same-tile hover/dwell
assertion in `js/ramified_minigames_setup_test.js:118`:

```text
node js/ramified_minigames_setup_test.js
```

Do not count that unrelated failure as a billiards regression, but rerun the broad
suite after its Hex failure is fixed.

### Next Priorities

1. Add continuous ball-ball collision detection to the production native engine and a native high-speed tunneling regression.
2. Add the missing V0.5 pixel-continuity and V0.7 closed-loop holonomy tests.
3. Add native glancing-collision, conservation, self-image, and chart-independence regressions.
4. Add center-hit, follow/draw, combined-spin, native sliding-transition, and split-rendering tests.
5. Expand the live debug overlay enough to diagnose topology and physics failures from Section 39.
6. Update `js/billiards/README.md`, then consider splitting `topological_billiards_native.js` along the boundaries in Section 25.
7. Defer optional V3 physics until the production V0-V2 acceptance gaps above are closed.

---

## 1. Project Goal

Implement a billiards game for:

- Ramified Minigames: https://ramified.github.io/web/database/ramified_minigames.html
- Reuse, where appropriate, the existing geodesic / glued-boundary machinery from:
  https://ramified.github.io/web/database/mosaic_calculator.html

The game must not treat a billiard ball as a point.

A billiard ball must have:

- finite radius;
- linear velocity;
- angular velocity;
- persistent 3D orientation;
- friction and rolling behavior;
- ball-ball collisions;
- continuous crossing of glued boundaries;
- correct rendering when only part of the ball has crossed a glued boundary;
- optional cue-ball spin;
- deterministic and testable behavior.

The defining feature of the game should be **billiards on glued/topological surfaces**, rather than merely reproducing an ordinary pool simulator.

---

# 2. Core Design Principle

Keep exactly **one canonical physical state per ball**.

Never create multiple physical balls simply because one ball is visible on both sides of a glued boundary.

A ball should conceptually use a state similar to:

```js
BallState = {
    id,

    face,
    position: [x, y],
    velocity: [vx, vy],

    angularVelocity: [wx, wy, wz],
    orientation: quaternion,

    radius,
    mass,

    active: true
}
```

The distinction is:

- `position` tells us where the center of the ball is;
- `velocity` tells us how the center moves;
- `angularVelocity` tells us how the ball is currently rotating;
- `orientation` tells us how the physical ball is currently oriented in 3D.

A numbered billiard ball makes the distinction between angular velocity and orientation visible, so orientation must be modeled correctly rather than approximated with a single 2D texture angle.

---

# 3. Architectural Rule: Physics State vs. Render Images

A ball crossing a glued edge must **not** be split into multiple physical objects.

Instead:

```text
one canonical physical ball
          |
          +---- render image on current face
          |
          +---- render image across glued edge
          |
          +---- additional nearby images if necessary
```

The additional images are temporary coordinate representations of the same ball.

They may be used for:

1. rendering;
2. collision detection;
3. pocket/contact queries;

but they must never independently integrate physics.

This rule is essential for preventing duplicated balls, double collisions, disagreement between copies, and seam-related numerical instability.

---

# 4. Coordinate Transport Across a Glue

Assume a glued-edge coordinate transformation has the form

\[
p' = Ap+b
\]

where \(A\) is the linear part of the gluing map.

Transport the ball center and velocity by

\[
p' = Ap+b
\]

and

\[
v' = Av.
\]

For the ball's 3D rotational state, extend the 2D orthogonal transformation to

\[
\widetilde A =
\begin{pmatrix}
A_{11} & A_{12} & 0\\
A_{21} & A_{22} & 0\\
0 & 0 & \det(A)
\end{pmatrix}.
\]

This construction has

\[
\det(\widetilde A)=+1,
\]

so it is a proper 3D rotation even when the original 2D gluing reverses orientation.

Use this transformation to transport:

\[
\omega'=\widetilde A\omega
\]

and the ball orientation quaternion:

\[
q'=Q(\widetilde A)q.
\]

The implementation should document this as the chosen intrinsic rendering convention for the abstract glued surface.

Do not mirror the texture of a numbered ball when crossing an orientation-reversing seam.

The number may rotate to another part of the ball, but it must not become a mirror-reflected glyph.

---

# 5. Local Universal-Cover Representation

Implement a reusable routine that constructs a small set of nearby images of a ball.

Conceptually:

```js
findNearbyBallImages(ball, queryRegion)
```

Each returned image should contain enough information to map between the canonical ball state and the local chart:

```js
{
    ballId,
    face,
    transformFromCanonical,
    inverseTransform,
    position,
    velocity,
    orientation,
    angularVelocity
}
```

Generate these images through a bounded BFS/graph traversal through nearby glued edges.

Do not generate the entire universal cover.

Only generate transformations whose images can intersect the relevant local query region.

This local-cover system should eventually be shared by:

- seam rendering;
- ball-ball collisions;
- pocket detection;
- aim prediction;
- debugging tools.

Avoid implementing separate gluing logic for each subsystem.

---

# 6. Finite-Radius Seam Crossing

A ball begins to require a neighboring render image when its disk intersects a glued edge, even though its center has not crossed the edge.

For radius \(R\), generate the corresponding image whenever

\[
d(p,\text{edge}) < R + \epsilon.
\]

Render both coordinate images and clip each against its face polygon.

Before the center crosses:

```text
Face A: canonical image
Face B: transported image
```

After the center crosses:

```text
Face A: transported image
Face B: canonical image
```

The transition should be visually indistinguishable.

When the ball center crosses the edge, change the canonical face and transport its state.

Do not wait until the entire disk has crossed.

Do not teleport the complete rendered ball at once.

---

# 7. Ball Orientation and Numbered-Ball Rendering

The physics remains primarily 2D, but ball orientation is 3D.

This should be treated as a **2.5D renderer**, not necessarily as a full 3D game.

The initial implementation may remain on Canvas/WebGL according to what best matches the existing project.

For a visible screen-space point inside a rendered ball,

\[
X^2+Y^2\le 1,
\]

associate it with the visible unit hemisphere:

\[
s =
\left(
X,
Y,
\sqrt{1-X^2-Y^2}
\right).
\]

Transform this direction into ball-local coordinates using the inverse quaternion orientation.

Use the ball-local direction to sample a spherical texture.

The texture may eventually contain standard pool-ball markings and numbers.

## Required Debug Texture

Before implementing polished billiard textures, create a deliberately asymmetric debug texture containing:

- an equator;
- at least one meridian;
- a clearly directional arrow;
- an off-center dot;
- a large number or letter.

This texture is mandatory during physics development.

It should make incorrect rotation immediately visible.

---

# 8. Quaternion Integration

Update ball orientation from angular velocity every physics step.

Conceptually:

```js
orientation =
    integrateQuaternion(
        orientation,
        angularVelocity,
        dt
    );
```

Normalize the quaternion periodically or after every integration step.

Do not derive orientation from current linear velocity.

Orientation is persistent state.

A stationary ball may have:

```text
velocity = 0
angularVelocity = 0
```

while still retaining an arbitrary orientation from previous motion.

---

# 9. Ball-Ball Collision Detection Across Glued Boundaries

Collision detection must operate in a common local chart.

For balls A and B, do not test only:

\[
|p_A-p_B|.
\]

Instead, inspect appropriate nearby images of B relative to A and search for:

\[
\min_g |p_A-g(p_B)|.
\]

A collision occurs when the physical separation reaches

\[
R_A+R_B.
\]

## Continuous Collision Detection

Do not rely only on overlap at the end of a frame.

For a local image of B, define relative position and velocity:

\[
r=p_B-p_A
\]

\[
u=v_B-v_A.
\]

Solve

\[
|r+ut|^2=(R_A+R_B)^2
\]

for the earliest valid collision time

\[
0\le t\le\Delta t.
\]

This is required to prevent fast balls from tunneling through each other.

---

# 10. Ball Collision Response

Start with impulse-based equal-sphere collision response.

Let

\[
n=
\frac{p_B-p_A}
{|p_B-p_A|}.
\]

Use a normal restitution coefficient \(e\) and calculate the normal impulse.

The first playable version may ignore tangential ball-ball friction.

Once the basic system is stable, tangential impulse may be added so spin can affect ball-ball contact.

If B was represented through a transported image, calculate the collision in the local chart and transport the resulting velocity/angular-velocity update back into B's canonical chart using the inverse transformation.

Never update the temporary image as though it were a separate ball.

---

# 11. Self-Image Protection

A physical ball must never collide with its own glued image.

However, the engine should detect cases in which the chosen ball radius is too large relative to the topology.

If a ball disk overlaps itself through a short identification, the physical interpretation becomes ambiguous.

For V1, it is acceptable to reject obviously invalid configurations and show a development warning such as:

```text
Ball radius is too large for this surface identification.
```

A mathematically stronger injectivity-radius calculation can be considered later.

---

# 12. Cue Input Model

The user should not directly manipulate angular-velocity sliders.

Expose three intuitive controls:

1. aim direction;
2. shot power;
3. cue contact point.

The cue contact point should be selected on a small cue-ball diagram.

Examples:

```text
center      -> approximately neutral hit
above       -> topspin / follow
below       -> backspin / draw
left/right  -> sidespin
diagonal    -> combined spin
```

The default contact point must be the center.

Advanced spin controls may initially remain collapsed or optional.

---

# 13. Cue Physics

Let the shot direction be \(d\).

Let the surface normal be

\[
n=(0,0,1)
\]

and define a transverse horizontal direction

\[
l=n\times d.
\]

Let horizontal cue offset be \(s\) and vertical cue offset be \(h\).

Construct an approximate contact vector

\[
r=
-\sqrt{R^2-s^2-h^2}\,d
+s\,l
+h\,n.
\]

Let cue impulse be

\[
J=P\,d
\]

where \(P\) is determined by drag distance / selected shot power.

Then apply

\[
\Delta v=\frac{J}{m}
\]

and

\[
\Delta\omega=I^{-1}(r\times J).
\]

For a solid sphere:

\[
I=\frac25mR^2.
\]

Do not implement topspin and backspin as ad-hoc post-collision rules.

They should arise from angular velocity.

---

# 14. Cloth Friction and Rolling

For a ball touching the table, use contact point

\[
r_c=-Rn.
\]

The velocity of the contact point relative to the table is approximately

\[
u=v+\omega\times r_c.
\]

When

\[
|u|>\epsilon,
\]

the ball is sliding.

Apply friction opposing \(u\).

The friction impulse/force must affect both:

- linear velocity;
- angular velocity.

As sliding decreases, the ball should naturally approach rolling:

\[
u\approx0.
\]

Pure rolling should approximately satisfy

\[
\omega_{\text{roll}}
=
\frac{n\times v}{R}.
\]

A small rolling resistance may then gradually stop the ball.

Avoid applying arbitrary exponential damping to all state variables unless used only as a temporary V0 approximation.

---

# 15. Fixed-Step Simulation

Use a fixed physics timestep.

Recommended structure:

```js
accumulator += realFrameTime;

while (accumulator >= PHYSICS_DT) {
    stepPhysics(PHYSICS_DT);
    accumulator -= PHYSICS_DT;
}

render(interpolation);
```

This improves:

- reproducibility;
- collision reliability;
- automated testing;
- replay debugging.

Physics results should not significantly depend on monitor refresh rate.

---

# 16. Versioned Implementation Strategy

## Version 0 — Geometry and Rotation Prototype

### Purpose

Prove the difficult mathematical foundations before building a game.

### Include

- one ball;
- finite radius;
- one or two very simple glued surfaces;
- canonical state;
- local glued images;
- seam clipping;
- velocity transport;
- quaternion orientation;
- asymmetric debug ball texture;
- constant velocity;
- optional simple rolling relationship;
- orientation-preserving and orientation-reversing seams.

### Exclude

- cue UI;
- pockets;
- game rules;
- multiple balls;
- realistic friction;
- ball-ball collisions;
- polished graphics.

### Required Surfaces

At minimum test:

1. square torus-style translation gluing;
2. a surface containing an orientation-reversing identification, such as a Möbius-type test case.

### V0 Exit Requirement

Do not begin V1 until all V0 behavior tests pass.

---

# 17. V0 Behavior Tests

## Test V0.1 — Ordinary Motion

Given a ball away from all seams and no friction, after time \(t\):

\[
p(t)\approx p_0+vt.
\]

Expected:

- no unexplained acceleration;
- no orientation discontinuity;
- deterministic result.

---

## Test V0.2 — Translation Seam

Send a ball perpendicular through a translation-glued boundary.

Expected:

- velocity is unchanged apart from coordinate transport;
- no visual jump;
- part of the ball appears on the destination side before the center crosses;
- total visible disk represents one continuous ball.

---

## Test V0.3 — Rotational Glue

Cross a glue involving a rotation.

Expected:

- position is transported correctly;
- velocity direction rotates correctly;
- debug texture orientation rotates consistently;
- no temporary mirrored texture.

---

## Test V0.4 — Orientation-Reversing Glue

Cross an orientation-reversing seam.

Expected:

- 2D motion follows the glue;
- 3D ball orientation follows the selected lifted rotation convention;
- letters/numbers remain ordinary letters/numbers rather than mirrored glyphs;
- angular velocity is transported consistently.

---

## Test V0.5 — Seam Pixel Continuity

Place the center slightly less than one radius away from a seam.

Expected:

- visible pieces on both faces reconstruct one disk on the quotient surface;
- no gap;
- no double-opacity overlap;
- no one-frame disappearance.

---

## Test V0.6 — Repeated Seam Traversal

Allow the ball to cross glued boundaries hundreds or thousands of times.

Expected:

- quaternion remains normalized within tolerance;
- speed does not drift when no friction exists;
- radius does not visually change;
- no accumulation of duplicate image objects;
- no memory growth caused by old images.

---

## Test V0.7 — Closed Topological Loop

Move the ball through a known closed glued path.

Expected:

- final position/velocity agree with the known identification;
- final orientation agrees with the accumulated glue transformations;
- an orientation-reversing loop produces the expected holonomy under the chosen convention.

---

# 18. Version 1 — Playable Topological Billiards

## Include

Everything in V0 plus:

- multiple balls;
- continuous ball-ball collision detection;
- collision through glued images;
- simple friction;
- basic rolling;
- cue aiming;
- pull-back shot strength;
- center-hit shots;
- pockets/targets;
- turn lifecycle;
- reset/restart;
- deterministic replay/debug seed if applicable.

### Recommended Initial Game Rule

Do not immediately reproduce complete 8-ball rules.

Start with a simple mode such as:

```text
Pocket all target balls in as few shots as possible.
```

This makes topology and physics the main feature.

---

# 19. V1 Collision Behavior Tests

## Test V1.1 — Head-On Equal-Mass Collision

One moving ball hits one stationary equal-mass ball centrally.

Expected for nearly elastic collision:

- most forward velocity transfers to the target ball;
- cue ball nearly stops;
- momentum error remains within tolerance.

---

## Test V1.2 — Glancing Collision

Strike a stationary ball off-center.

Expected:

- velocities separate along physically sensible directions;
- no sticking;
- no explosive speed gain.

---

## Test V1.3 — Seam Collision

Put A and B on opposite visual sides of a glued seam but physically close on the quotient surface.

Expected:

- collision occurs at the same physical separation as an ordinary same-face collision;
- no delay until both centers are on the same displayed face.

---

## Test V1.4 — High-Speed Collision

Move a ball far enough during one rendered frame that discrete overlap testing would miss the collision.

Expected:

- continuous collision detection still finds it;
- balls do not tunnel through each other.

---

## Test V1.5 — No Self-Collision

Place a ball near its own glued image.

Expected:

- the ball never generates an impulse against itself.

---

## Test V1.6 — Collision Conservation

With friction disabled and restitution set to 1:

Expected:

- total linear momentum should remain constant within numerical tolerance;
- kinetic-energy error should remain small and bounded.

---

## Test V1.7 — Image Independence

Run the same physical collision represented through two equivalent choices of local chart.

Expected:

- canonical post-collision states agree within tolerance.

This is a critical topology test.

---

# 20. Version 2 — Spin and 2.5D Billiard Rendering

## Include

Everything in V1 plus:

- accurate cue contact point;
- topspin;
- backspin;
- sidespin;
- combined spin;
- sliding-to-rolling transition;
- persistent numbered-ball orientation;
- spherical texture rendering;
- polished billiard textures;
- optional spin UI;
- better aiming assistance;
- sound/visual polish if desired.

---

# 21. V2 Spin Behavior Tests

## Test V2.1 — Center Strike

Strike through the approximate center.

Expected:

- large linear impulse;
- minimal immediate spin from the cue;
- cloth friction subsequently causes rolling behavior.

---

## Test V2.2 — Topspin

Strike above center.

Expected:

- angular velocity sign corresponds to forward spin;
- debug texture visibly demonstrates forward rotation;
- follow behavior appears naturally after suitable collisions.

---

## Test V2.3 — Backspin

Strike below center.

Expected:

- initial rotational direction opposes ordinary forward rolling;
- friction gradually reduces sliding;
- draw behavior can occur if collision happens before backspin is lost.

---

## Test V2.4 — Sidespin

Strike left or right of center.

Expected:

- substantial vertical-axis angular velocity;
- numbered/debug texture visibly rotates around the appropriate axis;
- linear direction is not arbitrarily changed at cue impact.

---

## Test V2.5 — Combined Spin

Strike diagonally away from center.

Expected:

- angular velocity contains both rolling-axis and vertical-axis components;
- rendered texture follows the complete quaternion orientation without decomposition artifacts.

---

## Test V2.6 — Sliding-to-Rolling Transition

Launch a ball with incompatible linear and angular velocity.

Expected:

- contact-point slip decreases;
- state approaches \(u=0\);
- no abrupt change of velocity at the sliding/rolling transition.

---

## Test V2.7 — Orientation Persists at Rest

Roll a numbered ball, then allow it to stop.

Expected:

- the number remains at its final physical orientation;
- stopping must not reset the texture.

---

## Test V2.8 — Spin Through Glue

Send a spinning numbered ball through a glued seam.

Expected:

- center trajectory is continuous;
- angular velocity transforms correctly;
- texture orientation transforms correctly;
- no mirrored number;
- no spin reset.

---

## Test V2.9 — Split Rendering During Spin

Place a spinning ball partly across a seam.

Expected:

- both visible pieces represent the same physical orientation;
- markings line up according to the gluing transform;
- the two pieces must not appear to rotate independently.

---

# 22. Version 3 — Optional Advanced Physics

Do not implement this version unless V0–V2 are stable and there is a clear gameplay benefit.

Possible additions:

- tangential friction during ball-ball collision;
- spin-induced throw;
- detailed cushion friction;
- realistic restitution curves;
- more accurate rolling resistance;
- advanced aiming aids;
- bank/kick prediction;
- richer pool rules;
- multiplayer synchronization;
- replay system.

Explicitly exclude jump shots and masse physics unless the game later becomes a genuine 3D rigid-body simulation.

Do not let V3 delay a stable V1/V2 release.

---

# 23. Game UI Requirements

Keep the default UI simple.

The player should primarily interact with:

### Aim

Move/rotate the cue around the cue ball.

### Power

Click/touch and drag the cue backward.

Longer pull:

\[
\rightarrow
\]

larger cue impulse.

Release to strike.

### Spin

Default:

```text
Center
```

Advanced option:

show a small cue-ball contact diagram.

The player selects a point on the diagram instead of manipulating angular-velocity components directly.

### Aim Assistance

Suggested modes:

**Beginner**
- show the predicted cue-ball path until first contact.

**Normal**
- show a shorter aim line.

**Expert**
- show cue direction only.

Do not initially predict the entire multi-collision solution, because that would remove too much of the gameplay challenge.

---

# 24. Integration With Existing Ramified Code

Before writing new physics code, the AI must inspect the existing implementation and identify:

1. how faces/tiles are represented;
2. how glued-edge pairs are represented;
3. the exact transformation used by the Mosaic Calculator geodesic;
4. how direction vectors are transported;
5. how polygons are rendered and clipped;
6. how Ramified Minigames registers new games/modes;
7. existing resize, pointer, touch, animation-loop and save/load conventions.

Reuse existing geometry/gluing code where possible.

Do not duplicate the geodesic transformation logic with a slightly different implementation.

If reuse is difficult, extract the shared mathematical transformation into a neutral module used by both systems.

Preserve existing Mosaic Calculator behavior unless modification is unavoidable.

---

# 25. Recommended Internal Module Boundaries

Adapt filenames to the repository's existing conventions.

Conceptually separate:

```text
billiards/
    ball-state
    quaternion
    glue-transport
    local-cover
    collision-detection
    collision-response
    cloth-friction
    cue-physics
    spherical-ball-renderer
    billiards-game
    billiards-debug
    tests/
```

Avoid creating one giant billiards file containing rendering, topology, collision, UI and game rules.

Pure mathematical functions should be isolated whenever practical so they can be unit-tested without a browser.

---

# 26. Debugging Requirements

Provide an optional Billiards Debug Mode capable of displaying selected information such as:

- canonical ball center;
- current canonical face;
- local-cover images;
- image transformation IDs;
- velocity vectors;
- angular-velocity vector;
- collision normals;
- collision time-of-impact;
- seam intersections;
- quaternion/orientation axes;
- contact-point sliding velocity;
- current state: sliding / rolling / stopped.

Debug rendering must be removable or disabled for normal gameplay.

Do not rely only on visual inspection for correctness.

---

# 27. Deterministic Test Harness

Create a small deterministic simulation harness.

It should allow a test to specify:

```js
surface
initialBallStates
dt
numberOfSteps
physicsParameters
```

and obtain final canonical states.

Tests should use numerical tolerances rather than exact floating-point equality.

Whenever a difficult physics bug is discovered, first add a minimal regression test reproducing it, then fix it.

---

# 28. Performance Requirements

Correctness has priority during V0.

After correctness is established:

- avoid generating unnecessary universal-cover images;
- reuse temporary objects where profiling shows allocation pressure;
- keep broad-phase collision detection separate from narrow-phase CCD;
- avoid spherical texture calculations for balls that are off-screen;
- cache static ball textures;
- avoid physics tied to display frame rate.

A reasonable V1 target is smooth play with a normal pool-sized collection of balls on modern desktop browsers.

Mobile optimization may follow after correctness.

Do not sacrifice mathematical correctness for premature micro-optimization.

---

# 29. AI Development Workflow

The AI should work milestone-by-milestone rather than attempting the entire game in one large change.

For every milestone:

1. inspect the relevant existing code;
2. state the specific invariant being implemented;
3. make the smallest coherent implementation;
4. add automated tests;
5. run existing tests;
6. run the new behavior tests;
7. inspect the prototype visually where appropriate;
8. fix regressions before adding another subsystem;
9. summarize what changed and what remains unverified.

Do not proceed from V0 to V1, or V1 to V2, while required tests in the current version are failing.

---

# 30. Recommended ChatGPT / Codex Model Strategy

## Primary Recommendation

Use a **GPT-5.6 Terra High + GPT-5.6 Sol High mixed workflow**.

This project does not require Sol High for every implementation step.

Most coding is ordinary enough for Terra High once the mathematical architecture has been specified.

Reserve Sol High for problems where deeper reasoning materially reduces the chance of architectural or mathematical errors.

---

# 31. Use GPT-5.6 Sol High For

Use Sol High for:

- initial architecture review;
- derivation/review of glue transport;
- orientation-reversing transformations;
- quaternion convention review;
- local universal-cover design;
- continuous collision detection design;
- difficult collision bugs;
- physics sign/convention bugs;
- spin/friction derivations;
- topology-related edge cases;
- review before declaring V0 complete;
- review before declaring V1 complete;
- review before declaring V2 complete.

A good Sol High task should normally be a **bounded reasoning/review task**, not a request to rewrite the entire project.

Example:

```text
Review the implementation of orientation transport through
orientation-reversing glued edges. Check the mathematics,
quaternion multiplication order, coordinate conventions, and
the attached tests. Do not refactor unrelated code.
```

---

# 32. Use GPT-5.6 Terra High For

Use Terra High as the default implementation model.

Appropriate tasks include:

- repository inspection;
- extracting reusable geometry helpers;
- implementing BallState;
- writing quaternion utility code from an already-approved design;
- implementing local-cover traversal;
- Canvas/WebGL rendering;
- clipping;
- cue UI;
- pointer/touch controls;
- implementing formulas already approved by Sol;
- writing unit tests;
- regression tests;
- refactoring;
- fixing ordinary JavaScript errors;
- integration with Ramified Minigames;
- documentation;
- polishing UI.

Terra should receive precise, milestone-sized tasks with explicit acceptance tests.

Avoid vague prompts such as:

```text
Make the billiards game complete.
```

Prefer:

```text
Implement V0 seam rendering according to the approved plan.
Do not add collision physics yet.
Add and run tests V0.2, V0.3 and V0.5.
```

---

# 33. Optional Lower-Cost Model Use

If GPT-5.6 Luna or a lower reasoning setting is available in the chosen environment, it may be used for highly mechanical tasks such as:

- renaming;
- formatting;
- repetitive test-case expansion;
- simple documentation;
- straightforward CSS cleanup.

Do not use the lowest-cost model for topology, quaternion, CCD or spin-physics decisions merely to save usage.

A wrong low-level architectural decision can cost more usage to repair than using Sol once for review.

---

# 34. Weekly Usage Budget

The user wants total project usage to remain below approximately **25% of the weekly allowance**.

Therefore the operational target should be **20% or less**, leaving approximately 5 percentage points as a safety buffer.

Suggested weekly ceiling:

```text
GPT-5.6 Terra High:
approximately <= 12% of weekly allowance

GPT-5.6 Sol High:
approximately <= 5% of weekly allowance

Other / lower-cost work:
approximately <= 3% of weekly allowance

Planned total:
approximately <= 20%

Untouched safety reserve:
approximately >= 5%
```

These percentages are operational guardrails, not assumptions about a fixed token conversion between models.

Check the actual product usage indicator.

If observed usage differs materially from the estimate, use the observed meter as authoritative.

---

# 35. Usage-Saving Rules

To stay under the budget:

1. Do not ask Sol to regenerate entire files when only a mathematical review is needed.
2. Prefer Terra High for implementation after the architecture is settled.
3. Give the AI exact filenames and failing tests whenever known.
4. Avoid repeatedly pasting the entire repository into unrelated conversations.
5. Maintain one concise project architecture note so models do not repeatedly rediscover decisions.
6. Ask for focused diffs rather than broad rewrites.
7. Run deterministic automated tests before asking a higher-capability model to diagnose a bug.
8. Provide Sol with the smallest reproducible failing case.
9. Do not use Pro, Ultra, Max or Extra High by default.
10. Stop nonessential AI work when actual weekly usage reaches approximately 20%.
11. Preserve the remaining approximately 5% for unexpected critical debugging.

---

# 36. Recommended Model Assignment by Milestone

| Milestone | Default Model | Sol Review? |
|---|---|---|
| Existing-code inspection | Terra High | No |
| V0 architecture | Sol High | Yes |
| BallState + quaternion utilities | Terra High | Brief Sol review |
| Glue transport | Terra High | Yes |
| Local universal cover | Terra High | Yes |
| Seam rendering | Terra High | Only if tests fail unexpectedly |
| V0 acceptance review | Sol High | Yes |
| Multi-ball implementation | Terra High | No initially |
| CCD | Terra High | Yes |
| Collision response | Terra High | Yes |
| V1 UI / cue controls | Terra High | Usually no |
| V1 acceptance review | Sol High | Yes |
| Spin/friction equations | Sol High | Yes |
| Spin implementation | Terra High | Review difficult failures only |
| Spherical texture renderer | Terra High | Usually no |
| V2 acceptance review | Sol High | Yes |
| CSS / visual polish | Terra High or lower | No |

---

# 37. Important Model Escalation Rule

Do not escalate to Sol High simply because Terra produced one coding error.

Escalate when the problem involves one or more of:

- unclear mathematical invariants;
- repeated failure after a minimal reproduction exists;
- disagreement between multiple coordinate charts;
- orientation/sign ambiguity;
- conservation-law failure;
- non-deterministic physics;
- collision-order instability;
- architecture likely to require significant redesign.

Ordinary syntax, DOM, CSS and straightforward integration problems should remain with Terra.

---

# 38. Recommended Development Sessions

Avoid trying to finish all versions in one AI session.

A good sequence is:

### Session A
Repository inspection and shared gluing API.

### Session B
V0 BallState, quaternion and single-ball physics.

### Session C
V0 local cover and split seam rendering.

### Session D
V0 orientation-reversing tests and Sol review.

### Session E
V1 multi-ball CCD.

### Session F
V1 collision response and seam collisions.

### Session G
Cue UI, pockets and playable game loop.

### Session H
V1 regression review.

### Session I
V2 cue spin and friction.

### Session J
V2 spherical numbered-ball renderer.

### Session K
V2 integration, regression testing and polish.

A session may be split further if actual weekly usage approaches the budget.

---

# 39. Stop Conditions

The AI must stop adding features and fix the current layer if any of the following occurs:

- the ball visibly teleports across a seam;
- a ball exists as two independent physical states;
- a ball collides with itself;
- numbered texture becomes mirrored unexpectedly;
- the result changes substantially with display refresh rate;
- high-speed balls tunnel through other balls;
- energy grows significantly without an energy source;
- friction accelerates a resting ball;
- crossing a seam changes speed when the glue should be isometric;
- repeated loops cause quaternion drift;
- two equivalent local charts give different physical outcomes.

These are architecture/physics failures, not polish issues.

---

# 40. Definition of a Successful V1

V1 is successful when a player can:

1. enter a supported glued mosaic;
2. see finite-radius billiard balls;
3. aim the cue;
4. choose shot strength;
5. strike the cue ball;
6. watch it cross glued boundaries continuously;
7. collide correctly with balls located through glued boundaries;
8. observe friction bringing balls to rest;
9. pocket/score target balls;
10. restart and play repeatedly without simulation corruption.

Advanced spin is not required for V1.

---

# 41. Definition of a Successful V2

V2 is successful when:

- cue contact location produces meaningful topspin/backspin/sidespin;
- sliding naturally transitions toward rolling;
- numbered ball markings visibly represent the actual 3D orientation;
- orientation survives every glued-boundary transformation;
- split seam images show one consistent physical ball;
- spin and orientation remain stable through extended play;
- all V0 and V1 regression tests continue to pass.

---

# 42. Final Design Priority

When choosing between realism and topological clarity, use this priority:

1. mathematical/topological consistency;
2. deterministic and stable physics;
3. understandable player interaction;
4. useful billiard spin behavior;
5. visual realism;
6. obscure real-world billiard effects.

The game should feel like:

**a physically understandable billiards game whose unique strategic challenge comes from the topology of the glued surface.**

It should not become a highly detailed ordinary pool simulator in which the topology is merely decorative.
