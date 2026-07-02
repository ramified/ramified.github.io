# Ramified Minigame Mechanics

This note describes the current 2048-like minigame rules on ramified mosaic background spaces, and the rule adjustments that make the animation easier to understand as a physical-world model.

## Board Model

The board is a finite set of existing tiles. Some tiles may be removed. A tile can have direct neighbors through the lattice, or boundary edges can be glued to boundary edges elsewhere.

Square presets have four directions: `E, S, W, N`.

Hexagonal presets have six directions: `E, SE, SW, W, NW, NE`.

When a box moves in a direction, its surface successor is either:

- a direct neighbor tile,
- a glued partner tile with a possibly changed direction,
- or no successor, meaning the box stops at the boundary.

## Round Model

A round starts when the user gives one direction. Every active box tries to move. Boxes keep moving through later ticks until they stop, merge, explode, or are removed from the active set.

Each tick has these phases:

1. Active boxes propose their next successor tile.
2. The resolver classifies proposals.
3. Events are emitted for animation.
4. The game state is mutated according to those events.

Animation events are deliberately separated from state mutation so debug mode, undo, and step-by-step mode can show the transition.

## Current Interactions

### Stop

A box stops if it has no valid successor.

### Move

A box moves if its target tile is empty or is occupied by a box that has already safely vacated the tile.

### Merge

Equal-value boxes can merge into a target tile when that target is available. The merged value is doubled, score increases by the new value, and the resulting box is locked against merging again in the same round.

### Push

When a moving box hits a resident box with a different value, the resolver tries to push a chain of boxes forward. A push can continue through direct or glued successors. A push can also end in a pushed merge, explosion, or block.

### Explosion

Some collisions involving incompatible groups or repeated gluing can remove numbers and/or tiles. Large explosions can clear neighboring numbers.

### Bounce

A bounce is animation-only. The boxes move toward the collision face or glued boundary and return to their original tiles. No round advancement, score, spawn, or tile mutation should happen.

## Physical-World Priority

The visual model should feel like boxes are solid objects. Collision detection should happen before merge detection whenever a merge target is still physically occupied during the same tick.

This means:

1. Detect reciprocal swaps first. If two boxes target each other's current tiles in the same tick, they bounce instead of crossing through each other.
2. Detect incompatible moving-box collisions before occupied-target merge handling. If two different-valued moving boxes target the same tile, they collide and explode; a third box that is vacating that tile in the same tick should be allowed to finish its move.
3. Before an occupied-target explosion, check whether the resident blocker can actually vacate during this tick. If it cannot vacate, either because it has no successor or because its successor is blocked by another hard box, the incoming boxes are blocked by that resident and should bounce rather than explode.
4. Detect occupied-target conflicts before same-value group merges. If two equal boxes target a tile that contains a third box that is moving away in the same tick, the equal boxes should not merge through that third box. The collision at the still-occupied tile wins.
5. Only allow a merge into a tile when the target is physically empty for that tick, or the merge is with a stationary resident box already on that tile.

This is game-operator precedence, not JavaScript operator precedence. The important order is:

1. reciprocal swap bounce;
2. incompatible same-target moving collision/explosion;
3. hard-blocked occupied target bounce;
4. impossible same-value merge into a vacating occupied tile;
5. legal merge;
6. ordinary move or stop.

Explosion removal should be applied after same-tick vacating moves. Otherwise, the explosion sees the old resident box still sitting on the center tile and can incorrectly delete it.

## Bug To Fix

In the current resolver, a resident box that is also moving can be treated as having already vacated its tile. Then two equal boxes can merge into that resident's current tile during the same tick. Visually, this looks like the merge passes through the resident box, which breaks the physical-world interpretation.

For the given test case, clicking `up` creates a target tile occupied by a moving resident. Collision should be resolved before the equal-value merge. The correct physical behavior is a bounce or block-style collision animation, with the boxes remaining in their original tiles unless a later tick makes the target truly available.

## Implementation Direction

The resolver should add a collision pass before merge creation:

- keep the existing reciprocal-swap bounce;
- add an occupied-target collision for same-value two-box merge attempts when the target has any resident box, even if that resident has a proposal to move away;
- emit `bounceGroup` for the incoming proposals and the moving resident proposal;
- stop all actors participating in that occupied-target collision for this round, so the resident cannot move into an incoming box's original tile while the incoming boxes bounce.
- defer explosion tile removal until after same-tick vacating movements are committed, and remove only the declared collision participants rather than every box currently at the explosion center.

This preserves the useful 2048 merge rule while preventing physically impossible merges through an occupied tile.
