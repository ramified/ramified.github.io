# Ramified Minigames Local AI Strategy

This document is the maintenance contract for the browser-local Gomoku, Connect Four, and Chinese Checkers AI. The rule engine in `js/ramified_minigames_setup.js` is always authoritative. The AI may cache and rank legal transitions, but it must validate the selected move through that engine before the UI commits it.

## Runtime contract

The UI sends a structured-cloned game state, request revision, position hash, time budgets, and deterministic session seed to one persistent worker. A response is accepted only when its request revision and position hash still match the live game. Starting, stopping, importing, changing history or setup, pausing, or entering an online room invalidates the request.

Static topology caches are keyed by a canonical JSON encoding of game mode, lattice, dimensions, removed tiles, cut and glued edges (including reversal), win length, fall direction, holes, jump rule, camps, and visible colors. Object keys and numeric sets are sorted. Eight topology entries and 50,000 transposition entries are retained with LRU eviction.

Each topology entry contains the playable mask, transported successor table, adjacency and reverse-adjacency lists, graph distances/centrality where relevant, winning windows, reverse window indices, fixed Connect Four routes, and Chinese Checkers target-distance tables. Dynamic positions use compact occupancy maps/arrays, a position hash, incremental line data, and reversible route deltas.

The search checks its deadline every 128 nodes. It returns the last fully completed iteration, or the best legal move from initial ordering if no iteration completes.

## Winning windows

For every playable start and applicable transported axis, enumerate an ordered sequence of the game win length. Square diagonal sequences use both step orders and propagate their directions across glued transitions. Deduplicate a sequence against its reverse, but preserve repeated tile indices. Store an index-to-multiplicity map and a reverse `tile -> windows` index.

Repeated indices are intentional. On a short cyclic surface, one stone can contribute more than once to the same traversed line. Terminal results are still confirmed by the existing win detector.

## Connect Four fixed-route invariant

Connect Four routes are **not FIFO queues**. Occupancy does not have to be contiguous, and insertion order does not determine a landing. The earliest occupied route position does.

For input hole `h` and fall direction `d`, follow transported successor states once:

```text
route = [(h,d)]
seen = {(h,d): 0}
while successor exists:
    next = transportedSuccessor(last)
    if (next.tile,next.direction) is in seen:
        termination = cycle
        cycleStart = seen[next]
        repeatedState = next
        stop without appending the repeated state
    append next
termination = boundary when no successor exists
```

Write the resulting route tiles as `r0 = h, r1, ..., rn`. Maintain:

```text
b = min { i >= 1 | ri is occupied }
```

Landing is calculated as follows:

```text
if r0 is occupied: reject occupied input
else if b is finite: land at r[b-1]
else if termination is boundary: land at rn
else: reject unblocked cyclic route
```

Therefore `hole -> A -> B -> C -> boundary` lands at `C` when empty, `B` when `C` is occupied, `A` when `B` is occupied even if `C` is empty, and the hole when `A` is occupied. An occupied hole is rejected. A cyclic route is rejected only if it reaches repetition without an earlier blocker.

### Incremental updates and undo

Precompute the earliest occurrence of each tile on each route and the reverse index `tile -> [(hole,position)]`. Dynamic state stores each hole's first blocker, landing, active-prefix endpoint, usable flag, plus `landing -> usable holes`.

On arrival at tile `x`:

```text
for each (hole,p) in reverse[x]:
    if p is after the existing first blocker: continue
    save {hole, oldFirstBlocker, oldLanding, oldPrefix, oldUsable}
    remove hole from old landing reverse map
    if p > 0: firstBlocker[hole] = min(firstBlocker[hole], p)
    recompute occupied-hole / blocker / boundary / cycle result
    add usable hole to new landing reverse map
save previous occupancy of x
occupy x
```

Search undo restores saved route entries and reverse-map memberships in reverse order, then restores occupancy. In real forward play the pointer only moves toward the entrance; search undo is the only operation that moves it away.

The active future landing set is the route prefix ending at the current landing. Every tile strictly behind the first blocker is unreachable from that hole. A token arriving through an overlapping route can introduce a nearer blocker and skip several formerly reachable tiles.

### Reachability-aware threats

For an uncontested three-token window with unique empty winning tile `t`, compute:

- `currentHoles(t)`: usable holes whose current landing is `t`.
- `prefixHoles(t)`: holes whose active prefix contains `t`.
- `activatingInputs(t)`: legal drops whose route deltas make `t` a current landing.
- `poisonedInputs(t,side)`: non-terminal opponent inputs, not landing on `t`, that activate an immediate winning drop for `side` at `t`.
- `permanentlyUnreachable`: no current or active-prefix route contains `t`.

Score the threat with a 6,000 base when playable now, otherwise 200 when latent in an active prefix, otherwise zero. For a non-current, non-unreachable threat, add 1,200 per distinct poisoned input, capped at 3,600. Deduplicate classifications and forks by winning tile, not by input hole. Ordinary window participation is still counted per window.

An additional distinct currently reachable winning tile is a fork worth 20,000, capped at 40,000. Multiple holes reaching one winning tile are not a fork.

No geometric-center or legal-hole-count bonus is permitted. Input holes are shared, and topology-independent line participation already belongs to the window evaluator.

## Evaluation and search constants

### Gomoku

- Budgets: 180 ms soft, 280 ms hard.
- Candidate cap: 28 root, 16 descendants.
- Window scores relative to win length `K`: `K-1 = 30000`, `K-2 = 2000`, `K-3 = 150`, earlier occupancy `10 * multiplicity`.
- Opponent windows are multiplied by 1.15.
- Two distinct `K-1` threats add 20,000.
- Terminal score is +/-1,000,000, adjusted by ply.
- Iterative alpha-beta negamax searches depths one through three. Immediate wins and complete immediate defenses precede search. Candidate generation uses forced cells, topology distance two around stones, high-occupancy windows, and graph centrality only for an empty-board opening/ties.

### Connect Four

- Budgets: 150 ms soft, 240 ms hard; iterative alpha-beta through depth seven.
- Uncontested one-token windows score 5; two-token windows score 80.
- Three-token windows use the reachability rules above.
- Opponent window score multiplier is 1.2.
- Terminal score is +/-1,000,000, adjusted by ply.
- Move ordering is immediate win, complete defense, reachable fork, transposition best, current threat, poisoned activation, then latent score.

### Chinese Checkers

- Budgets: 220 ms soft, 320 ms hard; root beam 24 and descendant beam 12.
- Use a deterministic minimum-cost marble-to-target-slot assignment over cached reverse graph distances.
- Per-color score: `-100 * assignmentDistance + 450 * targetOccupancy - 180 * startOccupancy - 35 * largestAssignedDistance + min(120, 4 * mobility)`.
- Leaving target camp costs 500 unless assignment improves or no alternative exists.
- Ordering bonuses: target entry 450, start exit 180, each jump segment 12, assignment-distance reduction 100 per unit.
- Depth-two MaxN carries one component per visible color; each moving color maximizes its own component.

## Controlled imperfection

Immediate wins and complete mandatory defenses are deterministic. Otherwise keep at most three moves within `max(25, 2% * abs(bestScore))` of the best completed score. A position/session-seeded PRNG chooses best/second/third with 75/20/5 percent probability. No move outside that band may be selected.

## Diagnostics and tuning

Internal results include reason code, chosen score, completed depth, nodes, elapsed time, cache hits, timeout flag, position hash, and the top candidate list. Route tests additionally inspect first-blocker pointers, landings, active prefixes, usable flags, reverse maps, and apply/undo deltas. These diagnostics are for tests and developer APIs and are not player-facing.

Any later weight or pruning change must update this document and add a dated tuning note explaining the motivating fixture or performance measurement.

### Tuning log

- 2026-09-08: Initial challenging profile. Replaced the rejected FIFO Connect Four model with fixed transported routes and earliest-blocker pointers; removed center and shared-hole-count bonuses; added current, latent, poisoned, and unreachable threat classes.
