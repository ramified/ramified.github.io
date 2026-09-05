# Topological Billiards Implementation Plan

**Revision:** Realism-First Rewrite  
**Date:** 2026-09-05  
**Status:** Proposed replacement for the previous implementation plan  
**Primary goal:** Preserve the project's topological mechanics while making the billiards simulation approach real-world cue sports as closely as practical in a deterministic browser game.

---

## 0. Executive Summary

The current game already has a strong topological foundation: finite-radius balls, glued-edge transport, local-image collision handling, ball orientation, cloth friction, cue contact offset, multiple balls, pockets, turns, scoring, deterministic fixed-step simulation, and atlas/orientation visualization.

However, its billiards physics are still closer to a stylized 2.5D simulation than a high-fidelity cue-sports simulator. In particular:

- the production/native solver does not yet use continuous collision detection (CCD);
- ball-ball collision response is essentially normal-impulse-only;
- ball-ball tangential friction and spin-induced/cut-induced throw are missing;
- cushion impact lacks a detailed spin/friction/compliance model;
- pockets are capture regions rather than geometric jaws/throats/shelves;
- cue input is reduced mainly to aim, power, and contact point;
- there is no cue elevation, genuine swerve/jump/masse physics, or airborne ball state;
- "stroke styles" such as 推、打、点、搓 are not physically distinct inputs;
- the production physics code and the more advanced reference physics path have diverged.

This revision changes the project philosophy:

> **Realistic billiards physics is no longer an optional V3 extension. It is a core product goal.**

The implementation should still remain incremental. The recommended order is:

1. unify the production and reference physics kernels;
2. add robust event-based CCD;
3. calibrate cloth sliding/rolling/spinning;
4. add frictional ball-ball collision and throw;
5. add realistic cushion/jaw interaction;
6. upgrade cue-stick impact, miscues, squirt, and advanced cue controls;
7. replace capture-radius pockets with physical pocket geometry where applicable;
8. add full local 3D elevation, airborne motion, jump shots, swerve, and masse;
9. calibrate equipment profiles against real measurements and reference shots;
10. expose the complexity through layered UI rather than fake "magic stroke" modifiers.

The ordinary rectangular-table limit should become a serious billiards simulator. The topological game should then inherit that same local physics without special-casing seams.

---

# 1. Product Vision

## 1.1 Target experience

The player should be able to use the same ideas that matter on a real table:

- center-ball hit;
- follow;
- draw;
- stun;
- left/right english;
- combined high/low side spin;
- speed control;
- throw;
- spin transfer;
- rail spin;
- multi-rail position play;
- cue elevation;
- swerve;
- jump shots;
- masse;
- realistic pocket acceptance/rejection;
- realistic differences between cloth, balls, cushions, pockets, and cues.

The game should not merely animate these effects. They should emerge from the same physical state that drives the simulation.

## 1.2 Topological identity

The defining feature remains the topological playing surface.

The physics engine must support:

- glued boundaries;
- translating and rotating edge identifications;
- orientation-reversing identifications;
- local universal-cover images;
- deterministic seam crossings;
- finite-radius ball collisions through glued neighborhoods;
- canonical ball state independent of the current chart;
- correct orientation/spin transport through seam maps.

Realism must be added **without** reverting to ordinary rectangular-table special cases.

## 1.3 Ordinary-table limit

A critical design rule:

> When the topology is configured as an ordinary rectangular billiards table, the simulation should behave like a credible real billiards simulator.

This becomes the primary calibration environment because real measurements, videos, research literature, and reference simulators are easiest to compare on ordinary tables.

Once local collision/contact models are validated there, the same models should operate on topological surfaces.

---

# 2. Non-Negotiable Physics Principles

## 2.1 One canonical physical state per ball

Never create independent physical clones for seam images.

Each real ball has one canonical state. Local images exist only for:

- collision queries;
- rendering;
- aiming visualization;
- local chart calculations.

This prevents duplicated momentum, self-collision bugs, and chart-dependent physics.

## 2.2 Physics variables, not named-stroke magic

Do **not** implement realistic cue sports as:

```js
if (strokeType === "push") addExtraFollow();
if (strokeType === "spin") multiplySpin(1.4);
if (strokeType === "stun") forceNinetyDegreeExit();
```

Stroke names are UI concepts or presets.

The physical ground truth should be continuous quantities such as:

- cue direction;
- cue elevation;
- cue velocity at impact;
- effective cue mass;
- tip position on the cue ball;
- tip radius;
- tip/ball friction;
- contact impulse or short-duration contact force;
- cue deflection/squirt calibration;
- ball position/velocity/spin;
- cloth, cushion, ball, and pocket parameters.

If two different player gestures produce the same physical cue state at first contact, then an instantaneous-impact model should produce the same initial cue-ball state.

## 2.3 Follow-through is not a post-impact force

A real cue tip contacts the cue ball for a very short time. Once the cue ball has separated from the tip, the player's later follow-through cannot continue accelerating it.

Therefore:

- follow-through may be measured as part of input technique;
- it may help infer cue speed and delivery quality;
- it may be shown in coaching UI;
- it must **not** directly add force after separation.

This avoids a common but physically incorrect game mechanic.

## 2.4 Determinism

Given identical:

- initial state;
- physics version;
- equipment profile;
- shot input;
- topology;
- rules profile;

the simulation should reproduce the same event sequence and final state within a documented numerical tolerance.

Every replay must store the physics/profile version.

## 2.5 Energy must not appear from nowhere

For passive contacts:

- restitution must not create net kinetic energy;
- friction must not accelerate a resting system;
- seam transport must preserve speed except where a physical collision occurs;
- quaternion normalization must not alter translational energy;
- repeated micro-collisions must not pump energy into the system.

Cue impact is the primary external source of mechanical energy.

---

# 3. Current Production Audit

As of this revision, the current user-facing game already exposes:

- ball-count selection;
- assistance controls;
- friction control;
- cue contact control;
- power control;
- atlas/orientation views.

The production native engine already contains:

- 2D ball position and velocity;
- 3D angular velocity;
- quaternion orientation;
- fixed-step integration;
- finite-radius ball-ball overlap resolution;
- boundary collision;
- cloth slip/rolling-style friction;
- spin decay;
- glued-boundary transport;
- local-image collision support;
- simple pocket capture;
- cue torque from an off-center contact point.

Important realism gaps remain.

## 3.1 Production CCD gap

The advanced/reference physics path contains continuous-collision ideas, but the production native path still advances a full fixed step and then resolves overlap.

High-speed tunneling therefore remains a correctness risk.

## 3.2 Ball-ball collision gap

Current production response is primarily a normal impulse.

Missing or incomplete:

- tangential contact impulse;
- angular-velocity update from ball-ball friction;
- cut-induced throw;
- spin-induced throw;
- realistic speed dependence of throw;
- realistic frictional dissipation.

## 3.3 Cushion gap

Current rail response is essentially:

- positional correction;
- normal-velocity reflection;
- restitution.

Missing:

- tangential friction;
- contact-height effects;
- spin transfer;
- rail-induced throw;
- speed/spin-dependent rebound;
- compliant cushion behavior;
- realistic jaw geometry.

## 3.4 Cue-impact gap

Current cue input is roughly:

```text
aim
power
contact.x
contact.y
```

Missing:

- cue elevation;
- cue velocity as a physical unit;
- cue/tip mass and geometry;
- miscues;
- tip friction/friction cone;
- cue deflection/squirt;
- elevated-cue vertical impulse;
- swerve;
- jump;
- masse;
- dynamic delivery data.

## 3.5 Pocket gap

Current pockets behave approximately as capture zones.

Missing:

- jaw collisions;
- pocket facing angles;
- shelf depth;
- throat geometry;
- rattling;
- rejection at excessive speed/angle;
- realistic corner vs side pocket behavior.

## 3.6 Architecture gap

Physics responsibilities are concentrated too heavily in the production native module.

The new plan should converge on **one authoritative physics kernel** used by:

- live play;
- Worker simulation;
- replay;
- tests;
- trajectory prediction;
- AI;
- calibration tools.

There should not be a "more correct reference physics engine" and a separate production solver with different behavior.

---

# 4. Realism Levels and Compatibility Profiles

Introduce explicit physics profiles.

```ts
type PhysicsProfileId =
  | "legacy"
  | "realistic"
  | "research";
```

## 4.1 `legacy`

Purpose:

- preserve old levels/replays;
- make regressions easy to compare;
- provide a low-cost fallback.

Behavior:

- approximately current production physics.

## 4.2 `realistic`

This becomes the eventual default.

Must include:

- CCD/event solver;
- calibrated cloth states;
- frictional ball-ball collisions;
- throw;
- realistic cushion spin interaction;
- cue/tip friction and miscues;
- realistic pockets;
- elevated cue;
- swerve;
- jump/masse after the 3D milestone.

## 4.3 `research`

Optional high-cost profile for development and calibration.

May use:

- more expensive iterative ball-ball models;
- compliant cushion solver;
- smaller error tolerances;
- high-accuracy contact integration;
- extended debug telemetry.

The research profile is useful for generating reference trajectories and validating the faster realistic profile.

---

# 5. Units and Scale

## 5.1 Use SI internally

Prefer:

- distance: meters;
- mass: kilograms;
- time: seconds;
- velocity: m/s;
- angular velocity: rad/s;
- force: newtons;
- impulse: N·s;
- inertia: kg·m².

Rendering can use arbitrary atlas units, but the physics layer should have one documented world-scale conversion.

## 5.2 Ball parameters

For a homogeneous sphere:

\[
I = \frac{2}{5}mR^2
\]

Define a reusable ball profile:

```ts
interface BallProfile {
  id: string;
  radius: number;
  mass: number;
  ballBallRestitution: number;
  ballBallFriction: number;
  clothMaterialId: string;
}
```

Do not scatter these constants through collision code.

## 5.3 Equipment profiles

Add structured profiles for:

```ts
interface TablePhysicsProfile {
  id: string;

  cloth: {
    slidingFriction: number;
    rollingResistance: number;
    spinResistance: number;
    transitionTolerance: number;
  };

  cushion: {
    model: "simple" | "frictional" | "compliant";
    restitution: number;
    friction: number;
    noseHeight: number;
    stiffness?: number;
    damping?: number;
  };

  pockets: PocketPhysicsProfile;

  gravity: number;
}
```

Example profiles may later include:

- tournament pool;
- slower club cloth;
- Chinese 8-ball style cloth/table;
- snooker-like equipment;
- experimental low-friction surface.

The exact parameter values should be calibrated, not guessed from "feel".

---

# 6. Canonical Ball State

Expand the state model.

```ts
type MotionState =
  | "stationary"
  | "spinning"
  | "sliding"
  | "rolling"
  | "airborne"
  | "pocketed";

interface BallState {
  id: number;

  // Intrinsic surface coordinates
  position: Vec2;

  // Height above the local cloth surface.
  // Zero or R-based convention must be chosen and documented.
  height: number;

  // Tangential + local-normal components
  velocity: Vec3;

  angularVelocity: Vec3;

  orientation: Quaternion;

  radius: number;
  mass: number;

  motionState: MotionState;

  active: boolean;

  // Optional numerical bookkeeping
  lastEventId?: number;
  sleepCounter?: number;
}
```

## 6.1 Why explicit motion state helps

Real billiard balls pass through distinct regimes:

- sliding;
- rolling without slipping;
- spinning in place;
- combined rolling/spinning;
- airborne.

A state machine improves:

- numerical stability;
- analytical integration opportunities;
- debugging;
- prediction;
- testing.

Do not make state labels the source of physics. The state should be derived from contact conditions.

---

# 7. Coordinate Frames and Topological Transport

## 7.1 Tangent-space transport

For a seam identification with 2D orthogonal map \(A\):

\[
x' = Ax + b
\]

transport tangential vectors as:

\[
v_t' = Av_t
\]

The same local geometry rule must be used for:

- velocity;
- collision normals;
- aiming rays;
- cushion normals;
- local-image transforms.

## 7.2 Axial vectors / spin

Angular velocity is an axial vector.

Continue to use a properly documented 3D lift for orientation/spin transport so that orientation-reversing 2D maps do not mirror the rendered ball texture.

The existing idea of a proper 3D lift remains useful:

\[
\tilde A =
\begin{pmatrix}
A & 0 \\
0 & \det A
\end{pmatrix}
\]

with care about the distinction between:

- local chart orientation;
- physical "height above cloth";
- axial-vector transport.

## 7.3 Height on non-orientable surfaces

A globally embedded 3D "up vector" may not exist for an orientation-reversing topological surface.

For gameplay, define:

> **height as a scalar distance above the local cloth patch.**

At a seam:

- height remains unchanged;
- vertical speed relative to the local cloth remains unchanged;
- tangential position/velocity transform by the seam map;
- ball orientation/spin uses the intrinsic axial-vector transport convention.

This is a game-physics convention, but it is internally coherent and allows jump/masse mechanics on non-orientable surfaces.

Document it explicitly.

## 7.4 Seam crossing while airborne

Airborne seam crossing must:

1. detect the crossing time;
2. integrate to the exact crossing event;
3. transform tangential position/velocity;
4. keep local cloth distance and normal-relative vertical velocity;
5. transform spin/orientation;
6. continue the remaining event interval;
7. never duplicate the physical ball.

---

# 8. The Authoritative Event Solver

This is the first major engineering milestone.

## 8.1 Replace "integrate then repair overlap"

Use an event-based loop inside each outer simulation interval.

Pseudo-code:

```ts
function simulateInterval(dt) {
  let remaining = dt;
  let eventBudget = MAX_EVENTS_PER_INTERVAL;

  while (remaining > TIME_EPS && eventBudget-- > 0) {
    const event = findEarliestEvent(remaining);

    if (!event) {
      integrateFreeMotion(remaining);
      remaining = 0;
      break;
    }

    integrateFreeMotion(event.time);
    resolveEvent(event);
    remaining -= event.time;
  }

  if (eventBudget <= 0) {
    handleEventBudgetExhaustion();
  }
}
```

## 8.2 Event types

At minimum:

```ts
type PhysicsEvent =
  | BallBallTOI
  | BallCushionTOI
  | BallJawTOI
  | SeamCrossing
  | ClothLanding
  | PocketDrop
  | MotionTransition;
```

Later:

- cue-tip impact can be represented as an initial event;
- simultaneous-contact clusters may require grouped resolution.

## 8.3 Ball-ball CCD

For constant-velocity segments:

\[
r = x_B - x_A
\]

\[
u = v_B - v_A
\]

Solve:

\[
\|r + ut\|^2 = (R_A + R_B)^2
\]

and select the earliest valid \(t\) in the interval.

Because cloth friction changes velocity, either:

### Option A — segmented analytic motion

Use analytical motion within each sliding/rolling regime and solve TOI against that trajectory where practical.

### Option B — conservative advancement

Use bounded micro-intervals based on maximum relative speed and separation.

### Option C — hybrid

Recommended:

- analytic CCD for ballistic/constant-velocity local segments;
- conservative advancement where friction/curvature makes a closed form inconvenient;
- exact event resolution once bracketed.

## 8.4 Topological CCD

Ball-ball TOI queries must consider local cover images.

Requirements:

- the event must identify the physical pair only once;
- image transforms must be carried with the contact;
- impulses must be transported into a common local frame;
- the canonical states must be updated exactly once;
- a ball must never collide with an image of itself unless the topology intentionally defines physical self-contact, which the current game should continue to forbid.

## 8.5 Deterministic event ordering

If two events occur within an epsilon:

1. group truly simultaneous contacts where necessary;
2. otherwise use stable deterministic tie-breaking by:
   - event time;
   - event type priority;
   - canonical ball IDs;
   - boundary/pocket IDs.

Never rely on JavaScript object iteration order for physical outcomes.

---

# 9. Cloth Contact and Ball Motion

The table cloth is responsible for a large part of cue-ball behavior.

## 9.1 Contact-point velocity

Let the cloth normal be \(\hat n\), and let the ball-to-cloth contact vector be:

\[
r_c = -R\hat n
\]

The velocity of the ball surface at the cloth contact is:

\[
u = v + \omega \times r_c
\]

The tangential component of \(u\) is the slip velocity.

## 9.2 Sliding

When:

\[
\|u_t\| > \epsilon_s
\]

the ball is sliding.

Use kinetic friction opposing the contact slip:

\[
F_f = -\mu_s N \frac{u_t}{\|u_t\|}
\]

with:

\[
N \approx mg
\]

while the ball remains on the cloth.

Update both:

\[
m\dot v = F_f
\]

and:

\[
I\dot\omega = r_c \times F_f
\]

This naturally converts:

- draw into rolling/backward motion;
- follow into rolling;
- side spin into coupled surface slip.

## 9.3 Rolling without slipping

Transition to rolling when the contact slip is sufficiently small and would not immediately diverge.

Rolling constraint:

\[
u_t \approx 0
\]

Then use a separate calibrated rolling-resistance model.

Do not simply reuse sliding friction.

## 9.4 Spinning resistance

A ball may have near-zero translational speed but substantial \(\omega_z\).

Use a separate spin-decay/contact torque model.

Avoid one universal exponential damping constant for all motion.

## 9.5 Static-friction handling

If rolling constraints are used:

- solve the static-friction impulse needed to maintain no-slip;
- clamp to the static-friction limit;
- if the limit is exceeded, return to sliding.

This will become important during:

- cloth landing;
- strong masse;
- unusual seam-local motion.

## 9.6 Sleep logic

A ball may sleep only when:

- translational speed is below threshold;
- contact slip is below threshold;
- spin magnitude is below threshold;
- it is not airborne;
- no collision event is imminent.

Sleep thresholds must scale sensibly with units and should not change the result of slow precision shots.

---

# 10. Frictional Ball-Ball Collision

This is one of the highest-value realism upgrades.

## 10.1 Contact kinematics

For two spheres A and B:

- find contact normal \(\hat n\);
- find the contact points;
- compute the velocity of each material point at contact, including spin.

For each ball:

\[
v_c = v + \omega \times r
\]

Relative contact velocity:

\[
v_{rel} = v_{c,B} - v_{c,A}
\]

Decompose:

\[
v_n = (v_{rel}\cdot \hat n)\hat n
\]

\[
v_t = v_{rel} - v_n
\]

## 10.2 Normal impulse

Resolve the normal component using a calibrated restitution model.

A simple initial form:

\[
J_n \propto -(1+e_b)(v_{rel}\cdot \hat n)
\]

with the correct effective-mass denominator.

Later, allow speed-dependent restitution if measurements justify it.

## 10.3 Tangential impulse

Calculate a tangential impulse opposing contact slip.

At minimum use a Coulomb-limited model:

\[
\|J_t\| \le \mu_b J_n
\]

and update both linear and angular velocity.

This is essential.

Without \(J_t\):

- side spin does not properly influence the object ball;
- cut-induced throw is missing;
- spin-induced throw is missing;
- cue-ball spin after contact is wrong.

## 10.4 Throw

The implementation must reproduce the correct qualitative signs for:

- cut-induced throw;
- outside english;
- inside english;
- speed dependence;
- spin dependence.

Do not implement "throw" as a separate angle bonus if a frictional contact model can produce it.

If a more accurate empirical/research model is needed, implement it behind a resolver interface.

## 10.5 Pluggable resolver

```ts
interface BallBallResolver {
  resolve(contact: BallBallContact, context: PhysicsContext): CollisionResult;
}
```

Candidate implementations:

```text
frictionless-elastic
frictional-impulse
mathavan-like
research-iterative
```

The realistic profile can initially use a fast frictional impulse model, then graduate to a validated higher-fidelity model if the browser budget permits.

## 10.6 Acceptance criteria

Must pass:

- head-on equal-mass transfer;
- cut shot without spin;
- cut shot with inside spin;
- cut shot with outside spin;
- stun collision;
- follow collision;
- draw collision;
- low-speed throw;
- high-speed throw;
- seam-crossing equivalent collision;
- energy/momentum sanity;
- no artificial spin generation in symmetric center-ball impact.

---

# 11. Cushion and Rail Physics

A realistic cushion model is the second major contact upgrade.

## 11.1 Why the current normal reflection is insufficient

A rail does not simply flip the normal component of velocity.

Real cushion behavior depends on:

- incoming speed;
- incoming side spin;
- top/bottom spin;
- contact height on the ball;
- cushion nose height;
- friction;
- compliance;
- damping;
- geometry.

This affects both:

- rebound angle;
- post-rail spin.

## 11.2 Contact geometry

Represent each cushion as a physical contact surface rather than only a mathematical wall.

At minimum store:

```ts
interface CushionSegment {
  id: string;
  geometry: LineSegment | CircularArc;
  noseHeight: number;
  materialId: string;
}
```

Pocket jaws should use the same contact system.

## 11.3 Cushion model stages

### Stage C1 — frictional impulse

Implement:

- normal restitution;
- tangential friction;
- rotational impulse;
- contact point at realistic nose height.

This already makes side spin meaningfully affect the rebound.

### Stage C2 — validated analytical/numerical model

Add a more detailed model inspired by published billiard-cushion analyses such as Mathavan/Jackson/Parkin.

### Stage C3 — compliant contact

For the research profile, optionally use a compliant/lumped-parameter model with finite compression time.

## 11.4 Required effects

The realistic model should reproduce:

- running english lengthening/shortening the angle as appropriate;
- reverse english;
- speed-dependent bank behavior;
- top/bottom spin interaction;
- post-cushion spin change;
- reasonable multi-rail behavior;
- no energy gain.

## 11.5 Calibration shots

Create a rail benchmark library:

- center-ball one-rail rebound at multiple speeds;
- left/right side spin at multiple offsets;
- follow/draw into rail;
- shallow-angle rail contact;
- near-perpendicular rail contact;
- two-rail and three-rail consistency.

Use the same tests across ordinary and glued seams.

---

# 12. Cue-Stick and Cue-Ball Contact

The cue model should produce the cue ball's initial linear and angular state from physically meaningful inputs.

## 12.1 Shot input schema

Replace the minimal payload with an extensible structure.

```ts
interface CueShotInput {
  aimDirection: Vec2;

  // Tip offset in cue-ball local coordinates
  tipOffset: Vec2;

  // Physical cue-axis elevation above the table
  elevation: number;

  // Cue speed immediately before contact
  cueSpeed: number;

  cueProfileId: string;
  tipProfileId: string;

  // Optional gesture metadata; must not directly modify post-impact physics
  strokeGesture?: {
    backswingDistance?: number;
    peakAcceleration?: number;
    deliveryDuration?: number;
    followThroughDistance?: number;
  };

  // UI preset only
  strokePreset?: string;
}
```

## 12.2 Cue profile

```ts
interface CueProfile {
  id: string;
  mass: number;
  effectiveImpactMass: number;
  tipRadius: number;
  squirtCalibration: number;
  shaftFlexProfile?: string;
}
```

## 12.3 Tip profile

```ts
interface CueTipProfile {
  id: string;
  friction: number;
  restitution: number;
  compliance?: number;
}
```

## 12.4 Impact model

Initial realistic version:

1. construct cue axis from aim + elevation;
2. find actual spherical contact point from tip offset;
3. determine local contact normal/tangent;
4. compute cue-ball impulse;
5. apply angular impulse:
   \[
   \Delta L = r \times J
   \]
6. enforce a tip friction limit;
7. detect miscue conditions;
8. output cue-ball \(v,\omega\).

Do not directly set "top spin", "back spin", or "side spin" by arbitrary multipliers.

## 12.5 Miscue model

At extreme offsets the cue cannot transmit arbitrarily large tangential force.

Use a friction-cone-like condition.

If the demanded tangential impulse exceeds the available tip friction:

- clamp/slide the contact;
- mark a miscue;
- change the actual impulse;
- optionally apply a visual/audio miscue response.

The playable contact disc should therefore expose a **realistic usable contact region**, not imply that every point on the projected ball is equally hittable.

## 12.6 Squirt / cue-ball deflection

Off-center hits produce cue-ball deflection.

A pure point-impulse sphere model may not reproduce real cue/shaft deflection sufficiently.

Use a calibrated model:

```ts
actualInitialDirection =
  nominalAimDirection
  + squirtCorrection(cueProfile, speed, tipOffset, elevation)
```

This correction belongs to the cue-impact model, not the cloth model.

It should:

- reverse sign with left/right offset;
- increase sensibly with offset;
- depend on cue profile;
- be benchmarked against real measurements.

## 12.7 Swerve

Swerve occurs after an elevated off-center hit due to:

- tilted spin axis;
- cloth contact;
- gravity/normal force;
- evolving slip.

Do **not** fake it by curving the aiming ray.

It should emerge from post-impact ball dynamics once local 3D cue elevation is implemented.

---

# 13. Chinese Cue-Stroke Terminology and UI

The terms below are useful for players, but they should be treated as **presets/intent labels**, not separate physical laws.

Terminology varies by region and coach.

## 13.1 推 — smooth/push-style delivery

Interpret as a smooth delivery style.

Possible UI preset characteristics:

- moderate cue speed;
- smooth acceleration gesture;
- stable contact;
- longer visual follow-through.

Important:

> If the cue speed, impact location, cue axis, and cue physical state at contact are identical, longer follow-through alone must not magically add more spin after the ball has left the tip.

Avoid confusion with an illegal prolonged-contact "push shot" in formal cue-sport rules.

## 13.2 打 — punch/positive strike

Possible characteristics:

- higher impact speed;
- more abrupt player gesture;
- shorter delivery time.

Again, the ball responds to the actual impact state, not to the Chinese label.

## 13.3 点 — short/poke delivery

Possible characteristics:

- short backswing;
- short follow-through;
- limited cue speed or a sharply timed impact depending on player input.

If implemented as an input mode, it should modify how the player's gesture maps to cue speed, not multiply the ball's post-impact velocity.

## 13.4 登 / 斯登 — stun

Stun is best treated as a **cue-ball state at object-ball contact**.

For a stun shot, the cue-ball surface motion at the cloth contact is close to the sliding/stun condition that produces the familiar near-90-degree separation behavior on a cut shot.

A "Stun" assistant may calculate a suggested:

- vertical tip offset;
- cue speed;

for a specified cue-ball-to-object-ball distance.

But the final result must emerge from:

- initial \(v,\omega\);
- cloth friction;
- travel distance;
- collision physics.

## 13.5 搓 — spin-heavy delivery

Use as a player-facing preset meaning:

- larger tip offset;
- deliberate spin-to-speed ratio;
- possibly a particular input sensitivity curve.

Do not implement "搓" as hidden extra spin.

The physics should come from the actual tip contact and cue speed.

## 13.6 扎 — masse

Masse is fundamentally different because it requires cue elevation and local 3D physics.

It must wait for the full elevated-cue/3D milestone and should then emerge from:

- cue elevation;
- off-center contact;
- vertical and tangential impulse;
- tilted angular velocity;
- cloth friction;
- gravity/normal force.

---

# 14. Full Local 3D Physics

To approach real cue sports, jump shots and masse can no longer remain permanently excluded.

## 14.1 Position representation

Keep topology intrinsically 2D, but give each ball a local height:

```text
surface coordinate: (x, y)
height above local cloth: h
```

Then:

```text
velocity = (vx, vy, vh)
```

This is better than assuming the topological surface is globally embedded in ordinary 3D space.

## 14.2 Cloth contact

When the ball is on the cloth:

- enforce non-penetration;
- compute normal force;
- compute tangential contact velocity;
- apply sliding/static/spin/rolling effects.

## 14.3 Airborne transition

A ball becomes airborne when the cue/collision produces sufficient local-normal velocity and it separates from the cloth.

During flight:

\[
\dot h = v_h
\]

\[
\dot v_h = -g
\]

Tangential components evolve without cloth friction except for air drag if ever included.

## 14.4 Landing

Detect time of impact with the cloth.

Resolve:

- normal restitution;
- tangential friction;
- spin interaction.

A jumping ball can therefore:

- bounce;
- skid;
- regain rolling;
- collide with balls while airborne.

## 14.5 3D ball-ball collision

For airborne interaction, contact distance must use:

\[
\Delta r =
(\Delta x,\Delta y,\Delta h)
\]

rather than only planar distance.

This allows one ball to jump over another if their 3D spheres do not overlap.

## 14.6 Jump shots

A jump shot should require:

- elevated cue;
- valid tip contact;
- sufficient upward cue-ball velocity;
- physically plausible contact.

Do not implement jump as a scripted parabola.

## 14.7 Masse

Masse should emerge from:

1. elevated off-axis cue contact;
2. highly tilted spin;
3. large cloth slip;
4. evolving frictional force;
5. curved center-of-mass trajectory.

No special "curve toward target" steering is allowed.

---

# 15. Pocket Geometry

## 15.1 Two pocket modes

Because topological boards may have unusual quotient vertices, support:

```ts
type PocketMode =
  | "abstract-topological"
  | "physical";
```

### Abstract-topological

Retains the existing quotient-vertex capture concept.

Use only where physical pocket construction is undefined or intentionally abstract.

### Physical

Used for realistic ordinary tables and any topological board where a meaningful pocket mouth can be generated.

## 15.2 Physical pocket components

A pocket should include:

- mouth width;
- two jaw/facing contacts;
- curved or segmented jaw geometry;
- shelf depth;
- throat;
- drop/capture boundary.

The ball must be able to:

- hit a jaw;
- rattle;
- rebound out;
- scrape one facing and enter;
- fail to drop at excessive speed;
- settle into the throat and then become pocketed.

## 15.3 Pocket event logic

Do not mark a ball inactive merely because its center enters a radius.

Instead:

1. resolve jaw/cushion contacts normally;
2. determine whether the ball center has crossed a physical drop boundary;
3. transition to pocket-fall state;
4. remove from table play only after a deterministic pocket event.

## 15.4 Topological quotient pockets

For a quotient vertex with several local incidences:

- render multiple local mouth representations if needed;
- maintain one canonical pocket ID;
- never pocket the same ball twice;
- transport jaw contacts through the same local-image machinery as other geometry.

---

# 16. Rule Profiles

Physics and rules must remain separate.

Suggested profiles:

```text
Practice / Sandbox
Simple Competitive
Chinese 8-Ball
WPA-style 8-Ball
9-Ball
10-Ball
Custom
```

Do not delay physics milestones on full rules support.

Rule-engine responsibilities:

- legal break;
- first contact;
- rail-after-contact requirements;
- fouls;
- ball in hand;
- called shot/pocket if applicable;
- win/loss conditions;
- illegal jump/masse restrictions by profile if desired.

Rules should consume physics events, not infer outcomes from animation.

---

# 17. Aiming and Prediction

## 17.1 Same kernel, no duplicate predictor physics

Trajectory prediction must use the same authoritative solver.

Do not maintain separate "aiming physics".

## 17.2 Assistance levels

Suggested modes:

### Off
No predictive lines.

### Geometry
Show only:
- initial aim ray;
- ghost-ball contact geometry.

### Basic Physics
Show approximate:
- first collision;
- basic cue-ball/object-ball paths.

### Advanced
Use actual:
- spin;
- throw;
- rail friction;
- current table profile;
- cue elevation;
- swerve where enabled.

### Research/Debug
Display event-by-event predicted trajectory and contact data.

## 17.3 Prediction uncertainty

For very high-spin, jaw, multi-contact, or masse shots, optionally communicate that prediction is sensitive.

Do not "correct" the player's shot invisibly to match the prediction.

---

# 18. Rendering Requirements

Rendering must remain downstream from physics.

## 18.1 Ball orientation

Continue quaternion-based orientation.

Visual rotation must match:

- rolling;
- side spin;
- draw/follow;
- seam holonomy;
- orientation-reversing transport.

## 18.2 Height

Once 3D local height exists:

- raise ball sprite/mesh;
- add consistent shadow;
- render airborne overlap correctly;
- avoid using visual height as physical state.

## 18.3 Cue

Render:

- cue aim;
- cue elevation;
- tip position;
- pre-shot stroke animation;
- miscue response;
- jump/masse stance abstraction if desired.

Animation must not change physics after shot input has been committed.

## 18.4 Contact visualization for debug

Optional overlays:

- ball-ball normal;
- tangential slip direction;
- impulse vectors;
- cushion normal;
- cushion tangent;
- cloth slip vector;
- spin axis;
- cue-axis vector;
- pocket jaw contacts.

---

# 19. Audio

For realism, audio should be event-driven.

Differentiate:

- cue-tip impact;
- soft ball-ball collision;
- hard ball-ball collision;
- cushion impact;
- jaw impact;
- pocket rattle;
- pocket drop;
- miscue.

Audio intensity should derive from impulse/relative impact speed, not random animation state.

This is lower priority than physics, but it greatly improves perceived realism after the core solver is correct.

---

# 20. Architecture Rewrite

The current production physics should be decomposed without changing the public game shell all at once.

Recommended layout:

```text
web/database/js/billiards/
  core/
    constants.js
    state.js
    profiles.js
    events.js

  topology/
    surface.js
    transport.js
    local_cover.js
    seam_events.js

  physics/
    engine.js
    integrator.js
    ccd.js
    cloth.js
    ball_ball.js
    cushion.js
    cue.js
    pocket.js
    airborne.js
    sleep.js
    energy.js

  rules/
    engine.js
    practice.js
    eight_ball.js
    nine_ball.js
    chinese_eight_ball.js

  prediction/
    predictor.js

  render/
    renderer.js
    atlas_renderer.js
    debug_overlay.js

  worker/
    billiards_worker.js

  tests/
    topology/
    ccd/
    cloth/
    ball_ball/
    cushion/
    cue/
    pockets/
    airborne/
    replay/
    integration/
```

## 20.1 Authoritative engine

`physics/engine.js` must become the only source of truth.

The live game, Worker, tests, and predictor import it.

If retaining `topological_billiards_native.js` temporarily, convert it into a façade/adaptor and progressively remove physics logic from it.

## 20.2 No duplicate affine-map code

Topology transforms must come from one shared module.

Renderer and physics must not each construct their own seam maps independently.

## 20.3 Resolver interfaces

Use explicit model interfaces:

```ts
interface ClothModel {}
interface BallBallResolver {}
interface CushionResolver {}
interface CueImpactModel {}
interface PocketModel {}
```

This enables:

- legacy comparison;
- realistic default;
- research solver;
- isolated benchmarks.

---

# 21. Shot Lifecycle

A shot should have a deterministic lifecycle.

```text
AIMING
  ↓
SHOT_INPUT_LOCKED
  ↓
CUE_CONTACT
  ↓
BALLS_MOVING
  ↓
EVENTS_RESOLVED
  ↓
ALL_BALLS_SETTLED
  ↓
RULE_EVALUATION
  ↓
TURN_TRANSITION
```

## 21.1 Commit point

Once the shot is committed, serialize:

```ts
{
  physicsVersion,
  topologyVersion,
  equipmentProfileId,
  rulesProfileId,
  initialState,
  cueShotInput
}
```

This is enough to reproduce the shot.

## 21.2 Event log

Optionally store:

```ts
[
  { t, type: "cue-ball", ... },
  { t, type: "ball-ball", ... },
  { t, type: "seam", ... },
  { t, type: "cushion", ... },
  { t, type: "pocket", ... }
]
```

This is invaluable for:

- replay debugging;
- determinism checks;
- bug reports;
- physics calibration.

---

# 22. Debug and Instrumentation

Add a developer panel.

## 22.1 Per-ball telemetry

Display:

- canonical position;
- local image/chart;
- height;
- velocity;
- speed;
- angular velocity;
- spin axis;
- orientation quaternion;
- motion state;
- cloth contact slip;
- kinetic energy.

## 22.2 Contact telemetry

For each event:

- event time;
- contact normal;
- contact tangent;
- relative contact velocity;
- normal impulse \(J_n\);
- tangential impulse \(J_t\);
- restitution;
- friction coefficient;
- pre/post energy;
- image transform used.

## 22.3 Cue telemetry

Display:

- nominal aim;
- actual post-squirt direction;
- tip offset;
- elevation;
- cue speed;
- impulse;
- angular impulse;
- miscue margin.

## 22.4 Topology telemetry

Display:

- current canonical chart;
- seam transform \(A,b\);
- local-cover image ID;
- transported velocity;
- transported spin;
- orientation lift;
- seam crossing time.

## 22.5 Numerical warnings

Flag:

- event budget exhaustion;
- residual penetration;
- impossible negative time of impact;
- quaternion drift;
- energy creation;
- NaN/Infinity;
- repeated zero-time contact loops;
- unresolvable simultaneous contact.

---

# 23. Calibration Strategy

Do not tune physics by visual intuition alone.

## 23.1 Calibration hierarchy

### Level 1 — fundamental constants
Use known or measured:

- ball radius;
- ball mass;
- gravity;
- table dimensions.

### Level 2 — isolated material tests
Estimate:

- sliding friction;
- rolling resistance;
- spin decay;
- ball-ball restitution;
- ball-ball friction;
- cushion restitution;
- cushion friction.

### Level 3 — canonical shots
Fit:

- draw distance;
- follow distance;
- stun arrival state;
- throw;
- one-rail rebound;
- side-spin rail response;
- swerve;
- jump threshold;
- pocket acceptance.

### Level 4 — multi-event shots
Validate:

- two/three rail position;
- break-like impacts;
- combinations;
- banks;
- kicks;
- masse paths.

## 23.2 Parameter fitting

Provide a small calibration harness:

```text
record reference shot
↓
simulate candidate parameters
↓
measure trajectory error
↓
optimize selected coefficients
↓
validate on held-out shots
```

Do not fit every parameter simultaneously.

Avoid overfitting one spectacular shot at the cost of normal shots.

## 23.3 Equipment presets

Each calibrated preset should include metadata:

```ts
{
  id,
  name,
  version,
  source,
  dateCalibrated,
  parameters,
  validationSummary
}
```

---

# 24. Reference Shot Test Suite

Create reproducible initial conditions rather than relying only on manual play.

## 24.1 Cloth tests

- pure sliding center-ball shot;
- pure rolling shot;
- pure vertical-axis spin;
- draw transitioning toward roll;
- follow transitioning toward roll;
- no spontaneous speed increase;
- stopping distance monotonic with friction.

## 24.2 Ball-ball tests

- equal-mass head-on collision;
- stationary object ball;
- both balls moving;
- grazing contact;
- stun cut shot;
- draw cut shot;
- follow cut shot;
- inside english;
- outside english;
- low-speed throw;
- high-speed throw;
- seam-equivalent collision.

## 24.3 Cushion tests

- perpendicular center-ball rebound;
- shallow angle;
- medium angle;
- running english;
- reverse english;
- follow into rail;
- draw into rail;
- multiple speeds;
- multi-rail consistency.

## 24.4 Cue tests

- center hit produces near-zero immediate spin;
- vertical offset produces correct draw/follow sign;
- horizontal offset produces correct side-spin sign;
- combined offset produces combined spin;
- larger offset increases spin until friction/miscue limit;
- miscues occur beyond usable contact envelope;
- squirt sign reverses left/right;
- squirt increases with offset in calibrated range.

## 24.5 Elevated-cue tests

- zero elevation produces no vertical launch;
- moderate elevation produces swerve but no jump below threshold;
- sufficient elevation/speed produces airborne motion;
- jump clearance respects 3D sphere overlap;
- masse curvature reverses appropriately with side;
- landing loses energy and returns to cloth state.

## 24.6 Pocket tests

- center-mouth slow shot drops;
- shallow jaw hit rebounds;
- fast jaw hit may reject;
- rattling sequence is deterministic;
- side/corner pocket geometry differs where configured;
- same canonical pocket cannot capture twice through multiple images.

---

# 25. Quantitative Acceptance Tests

Exact tolerances should be set only after calibration, but every subsystem needs explicit metrics.

Examples:

```text
CCD:
  zero missed collisions in randomized high-speed stress set

Determinism:
  identical event ordering across repeated runs

Energy:
  passive collision step never increases total mechanical energy
  beyond numerical tolerance

Topology:
  seam-crossed reference shot matches equivalent unfolded-plane shot
  within tolerance

Cloth:
  trajectory is stable when outer render frame rate changes

Ball-ball:
  throw sign and trend match reference data

Cushion:
  rebound angle/spin trend matches calibration set

Cue:
  output v/ω varies continuously with contact offset and cue speed

3D:
  no tunneling through cloth or other balls during jump
```

Store reference outputs in machine-readable fixtures.

---

# 26. Special Invariants for Topological Realism

These tests are unique to this project.

## 26.1 Chart independence

The same physical configuration represented in two equivalent charts must produce the same canonical event outcome.

## 26.2 Seam equivalence

A collision that occurs just before a seam and the equivalent unfolded collision just after the seam must agree after transport.

## 26.3 Spin transport

Spin and ball orientation must transport correctly through:

- translation seam;
- rotation seam;
- reflection/orientation-reversing seam.

## 26.4 Airborne seam equivalence

A jumping ball crossing a seam must preserve:

- local height;
- vertical kinetic state;
- tangential speed after transform;
- spin magnitude;
- physical trajectory continuity in the intrinsic simulation convention.

## 26.5 No self-image collision

A ball must never receive an impulse from another image of itself.

## 26.6 Quotient pocket uniqueness

A single canonical pocket represented by several local incidences must generate only one pocket event.

---

# 27. Performance Strategy

Realism cannot freeze the browser.

## 27.1 Broad phase

Use spatial acceleration for physical balls and local images:

- uniform grid;
- spatial hash;
- BVH if needed.

Do not test every ball against every local image at every event search.

## 27.2 Adaptive local cover

Generate only the seam images necessary for the current:

- collision horizon;
- ball speed;
- ball radius;
- prediction horizon.

## 27.3 Event caps

Use a high but finite event budget per outer interval.

If exceeded:

- preserve determinism;
- log the state;
- fall back safely;
- never silently skip a high-energy collision.

## 27.4 Worker

Keep simulation in a Worker where practical.

The main thread should primarily handle:

- input;
- rendering;
- UI.

## 27.5 Predictor budget

Aiming prediction may use:

- shorter horizon;
- lower local-cover depth;
- lower-cost physics profile;

but it must be labeled approximate if it differs from live physics.

For advanced prediction, use the same profile and accept the cost.

---

# 28. UI Design for Realism Without Overload

Expose complexity progressively.

## 28.1 Basic mode

Controls:

- aim;
- power;
- contact point.

Internally still uses realistic physics.

## 28.2 Advanced mode

Add:

- cue elevation;
- cue selection;
- tip/chalk profile if desired;
- fine speed control;
- spin/contact numeric readout.

## 28.3 Simulation mode

Optionally map mouse/touch/controller motion to:

- backswing;
- forward cue velocity;
- delivery timing.

The actual shot should still reduce to a physical impact state.

## 28.4 Stroke presets

Possible presets:

```text
Center
Follow
Draw
Stun
Left English
Right English
Spin-heavy / 搓
Smooth / 推
Punch / 打
Short / 点
Masse / 扎
Jump
```

Presets should simply populate or suggest continuous parameters.

Show the actual parameters so advanced players can understand what the preset means.

---

# 29. Roadmap

## R0 — Freeze and Measure the Current Engine

**Goal:** Create a safe baseline before changing physics.

Tasks:

- add `physicsVersion`;
- save representative current replays;
- add deterministic snapshot tests;
- document all current parameters;
- add event/energy telemetry;
- mark `legacy` profile;
- update README/module documentation;
- identify every production physics call site.

Exit gate:

- old behavior can be reproduced intentionally after later upgrades.

---

## R1 — One Physics Kernel + Production CCD

**Priority:** P0

Tasks:

- make one authoritative engine;
- migrate Worker/live play/tests to it;
- implement event-based TOI;
- ball-ball CCD;
- seam-crossing events;
- boundary CCD;
- deterministic event ordering;
- high-speed stress tests;
- remove post-step-only collision dependency.

Exit gate:

- no tunneling in the randomized stress suite;
- live and test solvers produce the same outcomes.

---

## R2 — Calibrated Cloth Motion

**Priority:** P0/P1

Tasks:

- explicit slip-contact calculation;
- sliding regime;
- rolling regime;
- spin-only decay;
- static-friction constraint or robust approximation;
- SI parameterization;
- remove arbitrary damping where it conflicts with the model;
- canonical cloth reference tests.

Exit gate:

- draw/follow/stun evolve continuously and repeatably;
- results are stable across render frame rates.

---

## R3 — Frictional Ball-Ball Contact and Throw

**Priority:** P1

Tasks:

- material-point contact velocity;
- tangential impulse;
- angular-velocity update;
- ball-ball friction parameter;
- cut-induced throw;
- spin-induced throw;
- resolver interface;
- reference-shot calibration.

Exit gate:

- side spin matters even before any cushion contact;
- throw signs/trends pass validation tests.

---

## R4 — Realistic Cushions and Jaws

**Priority:** P1

Tasks:

- cushion tangential friction;
- nose-height geometry;
- spin transfer;
- speed-dependent rebound if validated;
- line and circular-arc cushion geometry;
- jaw contacts;
- bank/kick benchmark suite;
- research resolver option.

Exit gate:

- running/reverse english visibly and quantitatively changes rebound;
- multi-rail behavior is stable and plausible.

---

## R5 — Real Cue Impact

**Priority:** P1/P2

Tasks:

- cue speed in physical units;
- cue mass/effective impact mass;
- cue-tip geometry;
- tip friction;
- usable contact envelope;
- miscues;
- combined tip offset;
- squirt calibration;
- richer shot payload;
- advanced cue UI;
- stroke presets mapped to physical values.

Exit gate:

- changing cue/tip/contact/speed produces continuous physical changes;
- no stroke preset applies a hidden post-impact bonus.

---

## R6 — Physical Pockets and Rules Integration

**Priority:** P2

Tasks:

- physical mouth;
- jaw geometry;
- shelf/throat;
- rattle/rejection;
- deterministic drop event;
- abstract-topological fallback;
- rule-event API;
- realistic table profile.

Exit gate:

- pocket success depends on speed/angle/contact rather than only a capture radius.

---

## R7 — Elevated Cue, Swerve, Jump, and Masse

**Priority:** P2/P3

Tasks:

- local height state;
- vertical velocity;
- airborne state;
- gravity;
- cloth landing;
- 3D sphere-sphere collision;
- elevated cue axis;
- vertical cue impulse;
- swerve;
- jump;
- masse;
- airborne seam transport;
- 3D prediction support.

Exit gate:

- jump and masse emerge from the same contact and cloth physics;
- no scripted curve or scripted jump path.

---

## R8 — Calibration, Equipment Profiles, and Competitive Polish

**Priority:** P2

Tasks:

- real-table calibration sets;
- pool/Chinese-8-ball equipment profiles;
- parameter-fit tools;
- replay metadata;
- advanced aiming;
- audiovisual impact polish;
- rules profiles;
- accessibility and input tuning.

Exit gate:

- ordinary-table behavior survives a documented comparison against reference measurements and known high-quality simulators.

---

## R9 — Research-Grade Refinement

Optional but consistent with the "as realistic as practical" target.

Possible work:

- higher-fidelity compliant ball-ball contact;
- speed-dependent ball restitution;
- detailed cushion deformation;
- cloth directional anisotropy;
- humidity/cloth wear presets;
- ball cleanliness/friction presets;
- cue-shaft dynamic model;
- tip compliance/contact-duration model;
- table roll/level imperfections;
- throw model refinements;
- parameter uncertainty modeling.

These should be added only when measured data justify the complexity.

---

# 30. Recommended Immediate Work Order

If implementation begins now, use this order:

```text
1. Snapshot current behavior
2. Unify physics kernel
3. Native/production CCD
4. Cloth state cleanup + calibration
5. Ball-ball tangential friction
6. Throw validation
7. Cushion tangential/spin model
8. Physical jaws
9. Cue/tip/miscue/squirt
10. Pocket throat/drop model
11. Local 3D height
12. Elevated cue
13. Swerve
14. Jump
15. Masse
16. Equipment calibration
17. Rules/polish
```

The key principle is:

> **Do not build advanced stroke UI before contacts, cloth, and cushions can physically respond to the spin that UI creates.**

---

# 31. Migration Notes for Current Files

## `topological_billiards_native.js`

Short term:

- keep public API;
- move simulation internals behind engine interfaces.

Move out in this order:

1. collision search;
2. ball-ball resolution;
3. cloth friction;
4. wall/cushion resolution;
5. pocket handling;
6. cue impulse;
7. integration.

Eventually it should become a thin adaptor or disappear.

## `topological_billiards_physics.js`

Preferred direction:

- evolve into, or delegate to, the authoritative engine;
- preserve useful CCD/reference logic;
- remove any code path that behaves differently only because it is "reference".

## `topological_billiards_math.js`

Keep and strengthen:

- seam transforms;
- local cover;
- quaternion math;
- vector/matrix utilities.

Do not let renderer or gameplay duplicate these transforms.

## `topological_billiards_renderer.js`

Keep rendering downstream.

Add support for:

- height;
- cue elevation;
- advanced debug overlays;
- physical pocket/jaw rendering.

## Worker

Worker should import exactly the same physics modules used by deterministic tests.

---

# 32. Data Versioning

Every saved/replayed game should carry:

```ts
interface SimulationVersionInfo {
  schemaVersion: string;
  physicsVersion: string;
  topologyVersion: string;
  equipmentProfileId: string;
  equipmentProfileVersion: string;
  rulesProfileId: string;
}
```

When physics changes:

- do not silently reinterpret old replays;
- either load the corresponding historical profile;
- or clearly mark the replay incompatible.

This is essential once calibration begins.

---

# 33. Stop Conditions / Red Flags

Stop the current milestone and fix the engine if any of these appear:

- high-speed balls tunnel through each other;
- frame rate changes shot outcome;
- a seam changes speed without a physical collision;
- a ball collides with its own image;
- equivalent charts produce different canonical outcomes;
- restitution/friction creates energy;
- cloth friction accelerates a resting ball;
- rolling motion flips unpredictably between states;
- side spin has the wrong throw sign;
- cushion spin response changes discontinuously with tiny input changes;
- a physical pocket captures through a jaw;
- a jump passes through another ball in 2D even though the 3D spheres should collide;
- an airborne orientation-reversing seam flips "height" below the cloth;
- quaternion norm drifts materially;
- a named stroke preset changes physics after cue-ball separation;
- predictor and live solver disagree because they use different physics code.

---

# 34. Definition of a Successful Realistic Release

A release should not be called "realistic" merely because it supports spin.

The realistic milestone is successful when:

1. **CCD is production-grade.**
   High-speed shots do not tunnel.

2. **Cloth motion is physical.**
   Sliding, rolling, draw, follow, and spin decay are distinct and calibrated.

3. **Ball-ball friction exists.**
   Spin and cut angle produce plausible throw.

4. **Cushion spin interaction exists.**
   Side spin materially changes real rebound behavior.

5. **Cue impact is physical.**
   Offset, speed, elevation, tip friction, miscues, and squirt are represented.

6. **Pockets have geometry.**
   Jaw hits and rattles matter.

7. **Elevated shots are genuinely 3D locally.**
   Swerve, jump, and masse emerge from physics.

8. **Topology remains exact.**
   Seams, local images, orientation transport, and canonical state remain chart-independent.

9. **Prediction uses the same engine.**

10. **Parameters are calibrated.**
    Defaults come from measurements/research/reference shots rather than visual guesswork.

11. **Replays are versioned and deterministic.**

12. **Stroke labels remain UI abstractions.**
    推、打、点、登、搓、扎 map to continuous physical parameters rather than magical result modifiers.

---

# 35. Suggested Physics API

A target API could look like:

```ts
interface BilliardsEngine {
  createState(config: GameConfig): SimulationState;

  commitShot(
    state: SimulationState,
    shot: CueShotInput
  ): ShotCommitResult;

  step(
    state: SimulationState,
    dt: number
  ): StepResult;

  simulateUntilRest(
    state: SimulationState,
    options?: SimulationOptions
  ): ShotResult;

  predict(
    state: SimulationState,
    shot: CueShotInput,
    options: PredictionOptions
  ): PredictionResult;
}
```

Resolver collection:

```ts
interface PhysicsModels {
  cloth: ClothModel;
  ballBall: BallBallResolver;
  cushion: CushionResolver;
  cue: CueImpactModel;
  pocket: PocketModel;
  airborne: AirborneModel;
}
```

Context:

```ts
interface PhysicsContext {
  gravity: number;
  table: TablePhysicsProfile;
  balls: Map<string, BallProfile>;
  cues: Map<string, CueProfile>;
  tips: Map<string, CueTipProfile>;
  topology: TopologicalSurface;
  models: PhysicsModels;
  tolerances: NumericalTolerances;
}
```

---

# 36. Example Shot Preset Layer

Presets should be transparent.

```ts
const PRESETS = {
  center: {
    tipOffset: [0, 0],
    elevation: 0
  },

  follow: {
    tipOffset: [0, +0.35],
    elevation: 0
  },

  draw: {
    tipOffset: [0, -0.35],
    elevation: 0
  },

  leftEnglish: {
    tipOffset: [-0.35, 0],
    elevation: 0
  },

  rightEnglish: {
    tipOffset: [+0.35, 0],
    elevation: 0
  },

  masseLeft: {
    tipOffset: [-0.45, -0.15],
    elevation: 55 * DEG
  }
};
```

Numbers above are **illustrative UI defaults only**, not proposed calibrated values.

A preset must never bypass the cue solver.

---

# 37. Realism vs Playability

High realism can make the game harder.

Do not reduce physical fidelity to solve a UI problem.

Instead provide:

- aim assistance;
- ghost ball;
- spin preview;
- suggested stun point;
- estimated cue speed;
- optional predicted rail path;
- optional pocket acceptance cone;
- slower input sensitivity;
- training mode;
- replay/shot analysis.

This lets beginners play while keeping one coherent physics engine.

---

# 38. Validation Against External References

Use several independent references.

No single simulator should define truth.

Recommended categories:

## 38.1 Published research

Especially useful for:

- cushion dynamics;
- frictional ball-ball collisions;
- cue-ball deflection;
- throw.

## 38.2 Open-source simulators

Useful for:

- algorithm comparison;
- event taxonomy;
- benchmark scenarios;
- parameter starting points.

Do not copy source code unless licenses are explicitly compatible.

## 38.3 Physical measurements

Best source for final tuning:

- high-frame-rate video;
- measured table/ball dimensions;
- timed rolling distances;
- controlled rail rebounds;
- controlled throw shots;
- cue-ball launch measurements.

## 38.4 Skilled-player sanity testing

Expert feedback is useful for:

- whether position-play responses feel credible;
- whether rail spin has the right qualitative sensitivity;
- whether masse/jump controls map sensibly.

It should supplement, not replace, quantitative validation.

---

# 39. Research References

The exact implementation should be independently coded and license-reviewed, but these are useful references for model selection and validation.

1. **Current Ramified topological billiards implementation plan**  
   https://github.com/ramified/ramified.github.io/blob/main/web/database/implement_plan/Topological%20Billiards%20Implementation%20Plan.md

2. **Current Ramified production billiards source**  
   https://github.com/ramified/ramified.github.io/blob/main/web/database/js/billiards/topological_billiards_native.js

3. **PoolTool documentation — ball/equipment parameters and event-driven physics architecture**  
   https://pooltool.readthedocs.io/

4. **Mathavan, Jackson, Parkin — cushion-impact analysis**  
   *A theoretical analysis of billiard ball dynamics under cushion impacts*  
   Proceedings of the Institution of Mechanical Engineers, Part C, 2010.

5. **Mathavan — frictional ball-ball collision modeling**  
   *Numerical simulations of frictional collisions of solid balls on a rough surface*  
   Sports Engineering, 2014.

6. **Tailuge/billiards** — browser-based open-source billiards simulation useful as a behavioral/architectural reference.  
   https://github.com/tailuge/billiards  
   Check its license before reusing any implementation code.

7. **Dr. Dave / Colorado State billiards resources**  
   Useful for experimental billiards phenomena, terminology, throw, squirt, swerve, and equipment behavior.  
   https://billiards.colostate.edu/

---

# 40. Final Priority Table

| Priority | Feature | Why it matters |
|---|---|---|
| P0 | One authoritative physics kernel | Prevents live/reference divergence |
| P0 | Production CCD/event solver | Fundamental collision correctness |
| P0 | Deterministic event ordering | Replays/tests/topology correctness |
| P1 | Calibrated cloth sliding/rolling/spin | Foundation of cue-ball control |
| P1 | Ball-ball tangential friction | Makes spin affect object-ball contact |
| P1 | Cut/spin-induced throw | Major real-world billiards behavior |
| P1 | Cushion friction/spin transfer | Makes english meaningful on rails |
| P1 | Cue tip/contact/miscue model | Makes input physically grounded |
| P2 | Squirt/deflection | Important for realistic side spin |
| P2 | Physical jaw/pocket geometry | Makes pocketing credible |
| P2 | Equipment profiles/calibration | Turns equations into believable behavior |
| P2 | Local 3D elevation | Required for advanced shots |
| P2 | Swerve | Required for elevated side spin |
| P2 | Jump | Requires genuine airborne motion |
| P2 | Masse | Requires elevated-cue + cloth dynamics |
| P3 | Compliant contact research models | Higher-end accuracy |
| P3 | Cue shaft/tip dynamics | Research-grade refinement |
| P3 | Cloth wear/environment profiles | Fine-grained realism |

---

# 41. The Core Design Rule

The project should be judged by this question:

> **If a real player changes only one physically meaningful thing—speed, tip position, side spin, draw/follow, cue elevation, cushion contact, equipment, or pocket angle—does the simulation respond for the same physical reason that a real table does?**

If the answer is yes, the game is moving toward realism.

If the answer is "because a named shot type adds a hidden modifier", the model should be redesigned.

The final architecture should therefore be:

```text
player intent
   ↓
cue delivery / physical shot parameters
   ↓
cue-tip ↔ cue-ball contact
   ↓
canonical ball linear + angular state
   ↓
cloth / ball / cushion / pocket / gravity contacts
   ↓
topological transport of the same physical state
   ↓
rules + rendering + audio
```

—not:

```text
player selects "special stroke"
   ↓
scripted special trajectory
```

That distinction should guide every future implementation decision.
