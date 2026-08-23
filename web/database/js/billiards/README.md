# Topological Billiards Architecture

The billiards mode is deliberately separate from the legacy minigame controller. It
uses the existing page shell, canvas sizing, card styles, and status area without
adding billiards branches to `ramified_minigames_setup.js`.

## Invariants

- A ball has exactly one canonical physical state.
- Local-cover images contain affine coordinate transforms and never integrate state.
- A 2D orthogonal glue `A` transports rotation through `diag(A, det(A))`, a proper
  3D rotation. Orientation-reversing chart maps therefore do not mirror textures.
- Physics advances at `1 / 240` seconds. Rendering refresh rate never changes the
  integration timestep.
- Ball collisions are solved in a common local chart and applied back to canonical
  states through the image transform inverse.

## Modules

- `topological_billiards_math.js`: affine, vector, quaternion, and lifted-glue math.
- `topological_billiards_physics.js`: surfaces, canonical transport, bounded local
  cover, CCD, impulse response, cloth friction, cue physics, pockets, and the test
  harness.
- `topological_billiards_renderer.js`: clipped seam images, spherical textures,
  aim tracing, pockets, glue markers, and debug overlays.
- `topological_billiards_game.js`: DOM controls, pointer interaction, fixed-step
  accumulator, lifecycle, and status display.
- `topological_billiards_test.js`: deterministic V0-V2 behavior regressions.

The predefined surfaces are an open rectangle, translation torus, Mobius band,
Klein bottle, and quarter-turn square. New surfaces should be expressed as directed
orthogonal affine seam maps and paired with their exact inverses.
