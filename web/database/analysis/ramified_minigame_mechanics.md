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

When one tick contains ordinary moves and bounces, those animations should be bundled into the same visual step. A reciprocal-swap bounce should not consume a whole step before unrelated boxes move; all boxes in the tick have already decided their next local action.

The physical state should have at most one number box on each tile. If a debug or historical bug leaves multiple boxes stacked on one tile, that tile is treated as a hard invalid stack: the stacked boxes do not move independently, incoming boxes bounce, and debug editing the tile replaces or clears the whole stack.

A box that is classified as bouncing remains a blocker for the rest of the tick. Other boxes may not move into its starting tile during that same tick, because the bounce animation returns it to that tile. This has to be resolved as a fixed point before committing any movement: if a newly bouncing box blocks another mover, that other mover also bounces.

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
2. If two or more moving boxes target the same tile with no resident, they either merge when the values match or explode when the values are incompatible.
3. If the target has a resident that cannot actually vacate during this tick, the resident is a hard blocker. Incoming boxes matching the resident may merge with it; nonmatching incoming boxes bounce.
4. If the target has a resident that is leaving by reciprocal swap with one of the incoming boxes, the resident and all incoming boxes bounce.
5. If the target has a resident that vacates without a reciprocal swap, resolve the incoming same-target group as though the tile is becoming available: same values merge, incompatible values explode.
6. Single-box moves then follow the usual merge, push, move, or stop rules.

This is game-operator precedence, not JavaScript operator precedence. The important order is:

1. reciprocal swap bounce;
2. incompatible same-target moving collision/explosion;
3. hard-blocked occupied target merge-or-bounce;
4. resident reciprocal-swap group bounce;
5. legal merge;
6. ordinary move or stop.

Explosion removal should be applied after same-tick vacating moves. Otherwise, the explosion sees the old resident box still sitting on the center tile and can incorrectly delete it.

## Bug Cases

The resolver has to distinguish several visually similar occupied-target cases.

If a resident box is also moving, two equal boxes may merge through the resident only when the resident is vacating without a reciprocal swap. If the resident is swapping with one of the incoming boxes, the swap collision wins and the whole group bounces.

If a resident box cannot move away, it is a hard blocker. For example, if `2` and `4` target a tile containing a blocked `4`, the incoming `4` merges with the resident `4`, while the incoming `2` bounces.

## Implementation Direction

The resolver should classify multi-box target groups with an explicit condition grammar:

- keep the existing direct reciprocal-swap bounce;
- for multi-box groups, check whether the target has a resident;
- without a resident, merge equal pairs or explode incompatible groups;
- with a hard-blocking resident, merge one matching incoming box into the resident and bounce the nonmatching incoming boxes;
- with a reciprocal-swapping resident, bounce the resident and the whole incoming group;
- with a freely vacating resident, merge or explode the incoming group as if the tile is available;
- defer explosion tile removal until after same-tick vacating movements are committed, and remove only the declared collision participants rather than every box currently at the explosion center.

This preserves the useful 2048 merge rule while preventing physically impossible merges through an occupied tile.
