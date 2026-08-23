# Revised Implementation Plan — Lianliankan for Mosaic Calculator

# 1. Project Goal

Implement a playable **Lianliankan / tile-link matching game** using the existing Mosaic Calculator board and boundary-glue concepts where useful.

The main rule is:

> Two identical tiles can be removed when they can be connected by an orthogonal path with at most two turns.

Valid paths:

```text
0 turns:
A ───────── A

1 turn:
A ─────┐
       │
       A

2 turns:
A ─────┐
       │
       └───── A
```

Invalid:

```text
3+ turns
```

Paths may travel through empty playable cells.

Paths **must never travel through ordinary space outside the board**.

Configured **boundary glue transitions are allowed**, because they are part of the board topology rather than outside-board movement.

---

# 2. AI Usage Strategy

The development process must intentionally control model usage.

Target allocation:

```text
70–85% of development turns:
GPT-5.6 Terra — High

15–30% of important turns:
GPT-5.6 Sol — High
```

The goal is:

1. keep weekly usage low,
2. avoid wasting Sol turns on routine implementation,
3. still use Sol for the parts where an architectural mistake would be expensive.

---

# 3. Default Model: Terra 5.6 High

Use **Terra 5.6 High by default**.

Terra should perform most implementation work.

Use Terra for:

- repository exploration
- locating existing Mosaic functions
- ordinary JavaScript implementation
- board data structures
- tile generation
- kana/kanji rendering
- tile-selection behavior
- UI controls
- CSS
- connection-line rendering
- empty-cell support
- match removal
- refresh button
- shuffle implementation
- deadlock UI
- ordinary unit tests
- ordinary behavioral tests
- straightforward bug fixes
- documentation
- cleanup and refactoring after tests pass

Do not switch to Sol merely because a task involves code.

Stay on Terra while:

```text
implementation is clear
AND
tests behave as expected
AND
no topology ambiguity exists
```

---

# 4. When to Escalate to Sol 5.6 High

Use **Sol 5.6 High only for high-value reasoning turns**.

Escalate when one or more of these conditions occurs.

## Architecture

Use Sol to review the initial architecture before significant implementation begins.

Especially review:

```text
Board
Topology
Boundary Glue
Pathfinder
Game State
Refresh
```

---

## Boundary Glue

Use Sol when implementing or changing:

- half-edge mapping
- direction translation
- reversed glue orientation
- glue cycles
- movement across glued boundaries
- turn counting through glue

This is the highest-risk part of the feature.

---

## Pathfinder

Use Sol for:

- initial pathfinder design
- states involving `(cell, direction, turnCount)`
- cycle prevention
- path reconstruction
- determining whether glue changes direction
- bugs where a valid path is rejected
- bugs where an invalid path is accepted
- 2-turn edge cases

---

## Difficult Test Failures

Escalate to Sol if:

```text
the same failure survives two reasonable Terra fixes
```

or:

```text
fixing one test causes another previously passing test to fail
```

or:

```text
the observed path does not match the expected topology
```

Do not repeatedly ask Terra to guess at a difficult topology bug.

---

## Refresh Correctness

Use Sol if refresh/shuffle behavior creates:

- impossible states
- infinite retry loops
- changed symbol counts
- reappearing removed tiles
- persistent deadlocks despite recovery attempts

---

## Final Verification

Use Sol once near the end for a final review of:

- gameplay rules
- pathfinding
- topology
- deadlock behavior
- refresh behavior
- regression risk

Do not spend multiple Sol turns repeatedly reviewing unchanged code.

---

# 5. Model Handoff Rule

Before switching from Terra to Sol, give Sol a focused handoff.

Do not ask Sol to rediscover the whole project.

Provide:

```text
1. Relevant implementation
2. Exact failing behavior
3. Expected behavior
4. Relevant tests
5. Current hypothesis
```

Example:

```text
We are implementing a Lianliankan pathfinder.

Rule:
- maximum 2 turns
- no outside-board routing
- boundary glue is allowed
- glue itself should not necessarily count as a turn

These three tests pass:
...

This test fails:
...

Current implementation:
...

Please identify the underlying architectural problem before proposing a patch.
```

This keeps expensive Sol turns focused.

---

# 6. Safety Strategy Before Modification

Do not begin by modifying many existing Mosaic files.

First identify:

- current board representation
- square-lattice directions
- neighbor calculation
- boundary representation
- glue representation
- half-edge representation
- glued-partner lookup
- rendering entry points

Prefer adding an isolated game module rather than heavily rewriting Mosaic Calculator internals.

Before major changes:

```text
create checkpoint / branch
↓
run current tests
↓
record baseline behavior
↓
make one conceptual change
↓
run tests again
```

Avoid combining topology changes, UI changes, and game-state changes into one large modification.

---

# 7. Core Architecture

Keep five concepts separate:

```text
Tile Identity
      ↓
Board State
      ↓
Board Topology
      ↓
Pathfinder
      ↓
Game Rules
      ↓
Renderer / Input
```

Recommended conceptual modules:

```text
game/
    gameState
    board
    topology
    pathfinder
    matcher
    deadlock
    refresh
    symbols
    renderer
    input
```

Existing project conventions may determine the exact filenames.

---

# 8. Tile Representation

Start with text glyphs.

Recommended default:

**Hiragana from the gojūon table.**

Example:

```text
あ い う え お
か き く け こ
さ し す せ そ
た ち つ て と
```

Kanji can be added as another symbol pack later.

Never determine matches from rendered DOM text.

Use an internal identity:

```js
{
  id: "hiragana_ka",
  glyph: "か"
}
```

Matching uses:

```js
tileA.id === tileB.id
```

---

# 9. Board Cell Model

The architecture must support empty locations immediately.

For example:

```js
{
  playable: true,
  tile: null
}
```

or an equivalent structure.

An empty cell:

- is still part of the board,
- may be traversed,
- cannot be selected,
- is not an obstacle.

Initial intentionally-empty board positions can be implemented later.

However, removed tiles will already create empty cells during gameplay, so the pathfinder must support them from the first version.

---

# 10. No Outside-Board Routing

This project deliberately differs from many traditional Lianliankan implementations.

Do **not** create an extra empty border around the board.

Do **not** allow:

```text
      ┌─────────────┐
      │             │
A X X X X X X X X A
```

where the path leaves the board.

An ordinary board boundary must behave as:

```text
blocked
```

unless that specific boundary edge has a configured glue transition.

This behavior requires dedicated regression tests.

---

# 11. Boundary Glue

Use a **boundary-glue board as the default experimental configuration**.

The existing Mosaic concept can be reused conceptually:

```text
(cell, edge)
     ↕
glue partner
```

Example:

```text
Cell 12 East Edge
        ↕
Cell 35 West Edge
```

A topology function should expose something similar to:

```js
nextStep(cell, direction)
```

It may return:

```text
normal neighboring cell
```

or:

```text
glued boundary destination
```

or:

```text
blocked
```

The pathfinder should not need to know how glue data is stored internally.

---

# 12. Important Glue Rule

A boundary-glue transition is **not outside-board movement**.

Think of it as:

```text
current cell
     ↓
boundary edge
     ↓
glue transition
     ↓
another board edge
     ↓
destination cell
```

The path never occupies external space.

---

# 13. Direction Through Glue

The topology layer must determine the outgoing direction after crossing glue.

Do not assume screen-space direction remains identical.

Depending on the glue configuration:

```text
East
```

might emerge as:

```text
West
North
South
```

etc.

Therefore topology movement should ideally return both:

```js
{
  cell: destination,
  direction: mappedDirection
}
```

This is important for correct turn counting.

---

# 14. Core Pathfinder State

Use a state equivalent to:

```js
{
  cell,
  direction,
  turns
}
```

Conceptually:

```text
current position
+
current travel direction
+
number of turns already used
```

Continuing in the same logical direction:

```text
turns += 0
```

Changing direction:

```text
turns += 1
```

Reject:

```text
turns > 2
```

---

# 15. Recommended Search Algorithm

Because boundary glue may create non-trivial topology, use a **direction-aware graph search** rather than relying only on rectangular corner formulas.

Recommended state:

```text
(cell, direction, turnCount)
```

Maintain visited states:

```text
visited[cell][direction][turnCount]
```

This prevents infinite traversal through glue cycles.

Pseudo-behavior:

```text
start at tile A

for each possible initial direction:
    attempt movement

for each search state:
    consider four directions

    if direction changes:
        turns += 1

    reject if turns > 2

    ask topology.nextStep(...)

    if blocked:
        skip

    if destination contains another tile:
        only allow it when destination == B

    if destination is empty:
        continue search

    if destination == B:
        reconstruct and return path
```

---

# 16. Deterministic Path Preference

If several paths are valid, prefer:

```text
1. fewer turns
2. shorter path
3. deterministic direction order
```

For example:

```text
N
E
S
W
```

or reuse the existing square-lattice direction order.

Tests must receive predictable paths.

---

# 17. Returned Path

Do not return only:

```js
true
```

Return the actual path.

Example:

```js
{
  valid: true,
  turns: 2,

  cells: [...],

  points: [
    start,
    bend1,
    bend2,
    target
  ]
}
```

The renderer should consume this path.

It should not calculate the route again.

---

# 18. Matching Rule

A pair may be removed only when:

```text
A != B

AND

A has a tile

AND

B has a tile

AND

A.tile.id == B.tile.id

AND

findConnection(A, B) succeeds
```

---

# 19. Selection Behavior

## First tile

Click occupied tile A:

```text
selected = A
```

Highlight it.

---

## Same tile again

Click A again:

```text
selected = null
```

---

## Different symbol

Select:

```text
あ
```

then click:

```text
か
```

Recommended behavior:

```text
selected = か
```

Do not run expensive pathfinding.

---

## Matching symbol

Select A.

Click matching B.

Run:

```text
findConnection(A, B)
```

If valid:

```text
show path
↓
remove both tiles
↓
cells become empty
↓
clear selection
↓
check completion
↓
check available matches
```

If invalid:

```text
board remains unchanged
```

and B may become the new selection.

---

# 20. Match Animation

Recommended:

```text
confirm valid match
↓
draw path
↓
brief visual delay
↓
remove tiles
↓
remove path
```

Approximately 100–300 ms is sufficient.

Keep animation timing separate from game rules so automated tests do not depend on real waiting.

---

# 21. Initial Board Generation

Generate tiles in matching groups.

Initially, pairs are simplest.

Example:

```text
あ あ
い い
う う
か か
```

Shuffle their positions afterward.

The initial board should preferably contain at least one valid legal match.

After generation:

```js
findAnyLegalMatch()
```

If no match exists:

```text
reshuffle before presenting the board
```

within a bounded retry count.

---

# 22. Available-Match Detection

Implement:

```js
findAnyLegalMatch()
```

Efficient strategy:

```text
group remaining tiles by ID
↓
ignore groups containing fewer than 2 tiles
↓
test pairs inside each group
↓
stop as soon as one valid connection is found
```

Return:

```js
{
  a,
  b,
  path
}
```

or:

```js
null
```

The same function can later power a Hint feature.

---

# 23. Deadlock Detection

After every successful match:

```text
remainingTileCount == 0?
```

If yes:

```text
Game Complete
```

Stop there.

Otherwise run:

```js
findAnyLegalMatch()
```

If it returns `null`:

display:

> No more matches are available. Refresh the board to continue.

Show a visible:

**Refresh**

button.

Do not silently shuffle the board.

The player decides when to refresh.

---

# 24. Refresh Behavior

Refresh means:

> Rearrange the remaining tiles without resetting game progress.

Refresh must preserve:

- number of remaining tiles
- exact count of each symbol
- removed tiles
- board dimensions
- playable cells
- board topology
- glue configuration

Refresh must NOT:

- resurrect removed tiles
- create new symbols
- delete remaining symbols
- modify glue
- reset the game

---

# 25. Empty Cells During Refresh

Initial recommended behavior:

> Shuffle only among currently occupied cells.

Therefore existing empty cells stay empty.

Example:

Before:

```text
あ . か
い . あ
か い .
```

After refresh:

```text
か . あ
あ . い
い か .
```

The empty locations are preserved.

A future mode may allow tiles to move into empty playable locations.

That is not required initially.

---

# 26. Refresh Recovery Guarantee

After refresh:

```text
shuffle
↓
findAnyLegalMatch()
```

If no match exists:

```text
shuffle again
```

Use a bounded retry count.

For example:

```text
maximum 50 attempts
```

Do not allow an infinite loop.

If random shuffling repeatedly fails, use a deterministic recovery strategy when possible.

Example:

```text
identify a remaining matching symbol
↓
identify two positions known to be connectable
↓
place that pair there
↓
redistribute displaced tiles
```

Then verify again.

---

# 27. Testing Strategy

Testing should be implemented before significant UI polish.

Test categories:

```text
A. Pathfinder
B. Boundary topology
C. Matching rules
D. Deadlock detection
E. Refresh
F. Input/UI
G. Regression
```

Use very small deterministic boards.

Do not depend heavily on random large-board tests.

Use seeded RNG for shuffle tests when possible.

---

# 28. Core Pathfinder Tests

## P01 — Horizontal straight connection

```text
A . . A
```

Expected:

```text
valid
0 turns
```

---

## P02 — Vertical straight connection

```text
A
.
.
A
```

Expected:

```text
valid
0 turns
```

---

## P03 — One turn

Create a path requiring exactly one bend.

Expected:

```text
valid
1 turn
```

---

## P04 — Two turns

Create a path requiring exactly two bends.

Expected:

```text
valid
2 turns
```

---

## P05 — Three turns rejected

Create a layout where the shortest valid-looking route requires three turns.

Expected:

```text
invalid
```

---

## P06 — Occupied tile blocks path

```text
A X A
```

Expected:

```text
straight path blocked
```

If no ≤2-turn alternative exists:

```text
invalid
```

---

## P07 — Empty cells are traversable

```text
A . . A
```

Empty cells must not block movement.

---

## P08 — Outside-board routing rejected

Create a case that would only be solvable by traveling around the exterior.

Expected:

```text
invalid
```

This is a mandatory regression test.

---

# 29. Boundary Glue Tests

## G01 — Normal boundary is blocked

Attempt to cross an unglued boundary.

Expected:

```text
blocked
```

---

## G02 — Configured glue works

Cross a glued boundary.

Expected:

```text
arrive at configured partner
```

---

## G03 — Glue is not arbitrary exterior space

Only configured glue transitions may cross board boundaries.

---

## G04 — Direction mapping

Verify movement direction after glue matches the topology definition.

---

## G05 — Correct turn counting

A glue crossing must not automatically add a turn merely because the rendered path appears on another part of the board.

Turn counting should follow logical direction after topology mapping.

---

## G06 — Glue cycle terminates

Create a cyclic glue configuration.

Expected:

```text
search terminates
```

No infinite loop.

---

# 30. Matching Tests

## M01

Different symbols:

```text
あ != か
```

Expected:

```text
cannot match
```

---

## M02

Same symbol, blocked route.

Expected:

```text
cannot match
```

---

## M03

Same symbol, valid route.

Expected:

```text
both tiles removed
```

---

## M04

Removed positions become empty.

Expected:

```text
tile == null
```

and the positions can subsequently be traversed.

---

## M05

Click selected tile again.

Expected:

```text
deselected
```

---

# 31. Deadlock Tests

## D01

At least one legal pair exists.

Expected:

```text
no Refresh warning
```

---

## D02

Remaining tiles exist but no legal pair exists.

Expected:

```text
No more matches are available.
Refresh button visible.
```

---

## D03

No tiles remain.

Expected:

```text
completion message
```

not a deadlock warning.

---

## D04

Deadlock detection runs after every successful removal.

---

# 32. Refresh Tests

## R01 — Preserve counts

Before refresh:

```text
あ × 2
い × 4
か × 2
```

After refresh:

```text
exactly the same counts
```

---

## R02 — Removed tiles stay removed

Remove a pair.

Refresh.

Expected:

```text
removed pair does not return
```

---

## R03 — Preserve topology

Refresh must not change:

```text
board shape
glue map
playable cells
```

---

## R04 — Preserve empty positions

Under the initial policy, empty positions remain empty after refresh.

---

## R05 — Recover from deadlock

Starting from a recoverable deadlock:

```text
Refresh
```

Expected:

```text
findAnyLegalMatch() != null
```

---

## R06 — No infinite retry

Force random shuffle to repeatedly fail.

Expected:

```text
bounded retry
+
controlled deterministic recovery
```

---

# 33. Development Sequence and Model Assignment

## Phase 0 — Repository Inspection

**Model: Terra 5.6 High**

Tasks:

- inspect Mosaic architecture
- locate relevant files
- identify direction definitions
- identify neighbor functions
- identify boundary/glue representation
- identify rendering integration points
- run existing tests

Do not modify major logic yet.

Deliver a short technical map of the codebase.

---

## Phase 1 — Architecture Review

**Model: Sol 5.6 High**

This should be one focused Sol session.

Review:

```text
Board
Topology
Pathfinder
Game State
Refresh
```

Confirm:

- no outside-board movement
- glue abstraction is sufficient
- direction transformation is defined
- turn counting is unambiguous
- proposed search cannot loop

Do not use this turn for UI details.

---

## Phase 2 — Pure Game Model

**Model: Terra 5.6 High**

Implement:

- board state
- tile IDs
- empty cells
- kana symbol set
- matching rules
- game state

Add basic tests.

---

## Phase 3 — Rectangular Pathfinder

**Model: Terra 5.6 High**

Implement:

```text
0-turn
1-turn
2-turn
blocked cells
no outside routing
path reconstruction
```

Run P01–P08.

If all pass:

```text
continue with Terra
```

If topology/path-direction assumptions become unclear:

```text
escalate to Sol
```

---

## Phase 4 — Boundary Glue Pathfinder

**Model: Sol 5.6 High for design/review**

Use Sol to review or design:

```text
topology.nextStep()
direction mapping
visited state
turn counting
cycle handling
```

Then:

**Model: Terra 5.6 High for implementation**

Terra writes the code and tests according to the Sol-reviewed design.

This separation is important for usage efficiency.

---

## Phase 5 — Boundary Glue Tests

**Model: Terra 5.6 High**

Implement G01–G06.

If all pass:

```text
continue
```

If a subtle glue/pathfinding test fails twice:

```text
Sol 5.6 High
```

should diagnose it.

Return to Terra for mechanical implementation of the fix where possible.

---

## Phase 6 — UI and Gameplay

**Model: Terra 5.6 High**

Implement:

- kana tiles
- selection state
- tile highlighting
- connection rendering
- match animation
- removal
- completion UI

Run matching behavior tests.

No Sol usage should normally be needed here.

---

## Phase 7 — Deadlock Detection

**Model: Terra 5.6 High**

Implement:

```js
findAnyLegalMatch()
```

and:

- deadlock detection
- no-match message
- Refresh button

Run D01–D04.

---

## Phase 8 — Refresh

**Model: Terra 5.6 High**

Implement:

- remaining-tile shuffle
- preservation of empty cells
- preservation of symbol counts
- bounded retry
- recovery verification

Run R01–R06.

Escalate to Sol only if recovery correctness proves difficult.

---

## Phase 9 — Full Regression Test

**Model: Terra 5.6 High**

Run:

```text
existing Mosaic tests
+
Lianliankan tests
+
manual smoke test
```

Fix ordinary failures with Terra.

---

## Phase 10 — Final Review

**Model: Sol 5.6 High**

Perform one focused final review.

Ask Sol to specifically search for:

```text
incorrect >2-turn acceptance
incorrect rejection of valid paths
outside-board leakage
boundary-glue direction bugs
glue cycles
incorrect deadlock detection
refresh state corruption
regressions to Mosaic functionality
```

Do not ask for cosmetic rewrites.

Only change code when Sol identifies a concrete issue.

After fixes:

**Return to Terra 5.6 High** to rerun tests.

---

# 34. Usage Budget Guideline

Target overall AI usage:

```text
Terra High
████████████████░░░░
70–85%

Sol High
███░░
15–30%
```

A typical implementation might look like:

```text
Terra   Repository inspection
Sol     Architecture review

Terra   Game model
Terra   Pathfinder implementation
Terra   Pathfinder tests

Sol     Boundary-glue review
Terra   Glue implementation
Terra   Glue tests

Terra   UI
Terra   Match behavior
Terra   Deadlock detection
Terra   Refresh
Terra   Regression fixes

Sol     Final correctness review
Terra   Final test run
```

Sol should therefore act primarily as:

```text
Architect
Topology specialist
Difficult-debugging specialist
Final reviewer
```

Terra should act primarily as:

```text
Main developer
Test writer
UI developer
Routine debugger
Refactoring agent
```

---

# 35. Stop Conditions to Save Usage

Do not continue asking a model for additional improvements when:

```text
all specified tests pass
AND
existing Mosaic behavior still passes
AND
the requested feature works
```

Avoid prompts such as:

```text
"Can you improve this further?"
"Can you rewrite everything more elegantly?"
"Can you review it again?"
```

unless there is a concrete problem.

Do not perform repeated Sol reviews of unchanged code.

One architectural review plus one final review should normally be sufficient.

---

# 36. Failure-Prevention Rule

Never fix a failing test by weakening the test unless the expected behavior itself is proven wrong.

For every bug:

```text
reproduce
↓
identify root cause
↓
add or confirm regression test
↓
apply smallest appropriate fix
↓
rerun affected tests
↓
rerun full suite
```

For topology/pathfinding bugs, if the root cause is uncertain:

```text
do not patch around symptoms
```

Escalate to Sol.

---

# 37. Definition of Done

The implementation is complete only when:

- [ ] Identical tiles connect with 0 turns.
- [ ] Identical tiles connect with 1 turn.
- [ ] Identical tiles connect with 2 turns.
- [ ] Routes requiring 3+ turns are rejected.
- [ ] Occupied cells block paths.
- [ ] Empty cells are traversable.
- [ ] Paths cannot travel through normal outside-board space.
- [ ] Unglued boundaries block movement.
- [ ] Configured boundary glue works.
- [ ] Glue direction mapping is correct.
- [ ] Glue cycles cannot cause infinite searches.
- [ ] Different symbols cannot match.
- [ ] Valid matching tiles are removed.
- [ ] Removed cells become empty.
- [ ] Hiragana tiles display correctly.
- [ ] The game detects completion.
- [ ] The game detects when no legal pair remains.
- [ ] The player is prompted to Refresh after a deadlock.
- [ ] Refresh preserves remaining symbol counts.
- [ ] Refresh does not restore removed tiles.
- [ ] Refresh preserves topology.
- [ ] Refresh preserves empty positions under the initial policy.
- [ ] Refresh produces a legal move when recovery is possible.
- [ ] Existing Mosaic functionality does not regress.
- [ ] Automated behavioral tests cover all critical rules.
- [ ] Terra performs the majority of implementation work.
- [ ] Sol usage is reserved for high-risk reasoning and final verification.

---

# 38. Final Instruction to the Development AI

Optimize for **correctness first and model usage second**.

Use:

> **GPT-5.6 Terra High as the normal implementation model.**

Escalate to:

> **GPT-5.6 Sol High only when architectural, topology, pathfinding, difficult debugging, or final verification work justifies the additional usage.**

Do not sacrifice a known correctness issue merely to preserve the usage budget.

At the same time, do not spend Sol turns on mechanical coding that Terra can reliably complete.

The intended workflow is:

```text
Terra builds
↓
tests expose uncertainty
↓
Sol reasons when necessary
↓
Terra implements the resolved approach
↓
tests verify
↓
Sol performs one final high-value review
```

This is the default development policy for this feature.