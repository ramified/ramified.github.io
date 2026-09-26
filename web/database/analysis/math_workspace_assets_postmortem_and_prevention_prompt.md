# Math Workspace Assets Work: Postmortem and Prevention Prompt

## Purpose

This document explains why the Assets and native-calculator work required repeated user corrections, even when several individual fixes appeared reasonable in isolation. It is not a blame document. The main failure was process and architecture: implementation repeatedly began before the intended state model, UI ownership, terminology, and end-to-end acceptance criteria were stable.

The central lesson is:

> A feature that connects several mature interfaces should be treated as an integration project, not as a sequence of local UI patches.

## Short Answer

The same bugs returned because the implementation was usually tested at the level of the most recent patch, while the user was evaluating the complete workflow. Local fixes therefore passed narrow tests but broke, omitted, or misunderstood behavior at another layer.

The work involved at least five interacting systems:

1. the workspace shell and its split-view/tab layout;
2. historical standalone calculators;
3. reconstructed workspace-native calculator sessions;
4. the Assets collection, editor, selection, and dependency graph; and
5. Inspector cards that could belong to Assets or any calculator while remaining visible together.

These systems did not initially have a written ownership contract. As a result, fields and UI surfaces were sometimes owned by the wrong layer, state was copied instead of shared or projected deliberately, and tests checked that code existed rather than that the user's complete interaction produced the expected screen and state.

## What Made the Work Difficult

### 1. The scope changed from a feature into an architecture migration

The first request was an Assets explorer. The work later expanded to include:

- rebuilding all ten calculator families for workspace-native use;
- keeping historical standalone calculators independent;
- separating canvas sessions from Inspector card sessions;
- showing cards from multiple calculators simultaneously;
- per-session canvas sizing and responsive split view;
- reusing Sheaf Complex property cards for Assets;
- drag-and-pick reference fields;
- projecting Assets into Sheaf Complex canvases;
- synchronizing edits, dependencies, names, positions, and deletions; and
- preserving raw LaTeX separately from plain and rendered names.

Each expansion changed assumptions made by earlier work. For example, a calculator session was first treated as one combined canvas-and-Inspector unit. Later, canvas tabs and card sessions had to be independent. Code built on the first model then required repeated correction.

The implementation should have paused when the scope crossed that boundary and written a new architecture contract before continuing.

### 2. The historical calculators were not used as executable specifications early enough

The user repeatedly pointed out that behavior already existed in the original calculator. Examples included automatic field updates, allowable references, object placement, card chrome, and subtype-specific logic.

Reconstructing only visible markup and selected event handlers missed latent invariants such as:

- changing a variety subtype also changes or constrains its dimension;
- constructed sheaves derive their base variety from dependencies;
- map endpoint editing must preserve the other endpoint;
- product and sheaf operations have self-reference and cycle rules;
- canvas placement depends on object type and relationships; and
- wide cards, card headers, and dock behavior have calculator-specific assumptions.

The original HTML and JavaScript should have been inspected as a behavioral reference before designing the workspace-native interface. A reconstruction needs a compatibility inventory, not just copied UI fragments.

### 3. Key terms were ambiguous and were not frozen

Several words acquired different meanings during the discussion:

- **Collect** was implemented as “copy the Sheaf canvas graph into Assets,” while the user meant “show all related Assets on the Sheaf canvas.”
- **Independent Inspector** could mean visually separate, separately owned, or able to display cards from several sessions at once.
- **Open a calculator** could mean opening a canvas, creating a session, choosing an Inspector source, or showing cards.
- **Current selection** could refer to Assets selection, the native calculator's active object, or the Add-card picker source.
- **Same UI** could mean shared visual tokens, identical markup, identical interaction, or all three.

Once implementation began, these meanings were inferred from the most recent sentence instead of being recorded as a glossary with observable examples.

### 4. State ownership was defined too late

The implementation needed an explicit ownership table from the beginning:

| State | Owner | Lifetime | Consumers |
| --- | --- | --- | --- |
| Assets records and stable IDs | Assets session | page session | explorer, Input card, projections |
| Raw LaTeX name | Assets record | page session | editor, MathJax rendering, projection |
| Plain name | derived from raw name | recomputed | sorting, accessibility, fallback |
| Canvas membership and positions | each Sheaf Complex session | page session | that session's canvas only |
| Property analysis data | Assets property session keyed by Asset reference | page session | reused native property cards |
| Card visibility/order/pin/collapse | each card session | page session | shared Inspector |
| Canvas height | each view session | page session | workspace layout |

Without this table, bugs appeared as state crossed boundaries:

- changing one map endpoint erased the other;
- changing a sheaf's base failed validation after a rerender;
- a saved base changed in Assets but not on the canvas;
- cards from one calculator displaced cards from another;
- closing a canvas risked losing card state; and
- a legacy plain sheaf name reached the canvas as `E_2` instead of the intended `\mathcal{E}_{2}`.

These were not isolated event-handler mistakes. They were symptoms of unclear authoritative state and incomplete projection rules.

### 5. The implementation mixed three representations of mathematical names

Mathematical labels require at least three explicit representations:

1. **raw**: `\mathcal{E}_{2}` for editing and persistence;
2. **plain**: `E_2` for sorting, accessibility, and fallback; and
3. **rendered**: MathJax output for visual display.

Any function that silently substitutes one representation for another creates a delayed bug. The latest sheaf-label problem exposed exactly this: legacy automatic records stored a plain value, and the canvas renderer faithfully rendered that plain value. The renderer itself was not stripping `\mathcal`; the source record lacked it.

The contract should have required field names such as `rawName` and `plainName`, rather than the ambiguous `name`, at every bridge boundary.

### 6. The generated native bundle made integration changes hard to reason about

Workspace-only behavior was injected into a generated bundle, including a large adapter fragment. This protected standalone calculators, but it also created a second implementation surface:

- source calculator behavior;
- build-time instrumentation;
- generated workspace-native bundle; and
- workspace controller orchestration.

A bug could originate in any layer. A string-based injected adapter is especially difficult to review, test, and evolve. It encouraged narrow patches rather than a typed, separately testable integration module.

A stronger design would keep workspace adapters in ordinary source modules with explicit interfaces, then let the build include those modules without modifying historical standalone sources.

### 7. Tests were too structural and not sufficiently behavioral

Many tests correctly checked isolation and the presence of required functions. Those tests were valuable, but assertions such as “source contains this function” cannot prove that:

- a particular click changes the correct card list;
- cards from several sessions remain visible together;
- a drag payload survives browser drag events;
- selecting a map domain preserves the codomain;
- a base-variety edit repositions a sheaf; or
- a LaTeX name visually renders with the expected style.

The missing layer was a state-transition matrix exercised in a real browser. Each important workflow needed assertions about:

```text
initial state -> user action -> authoritative state -> visible result -> retained state
```

Visual regressions also needed comparison at representative wide and narrow widths. Layout bugs such as nested white Inspector shells, inherited margins, artificial minimum widths, and empty-state movement are difficult to catch with source tests.

### 8. Fixes were often symptom-level rather than invariant-level

Examples of symptom fixes include hiding a wrapper, overriding a margin, preserving one field during one rerender, or converting one legacy label at one call site. These can be appropriate emergency repairs, but repeated symptom patches accumulate unless followed by an invariant-level correction.

For example, the invariant for reference fields should be:

> Rerendering any reference control must be a pure view operation. It must never erase another draft field. Picker filtering, drop acceptance, and save validation must use the same eligibility function.

Once that invariant is encoded and tested, domain/codomain and base-variety problems become much less likely to recur.

## What Should Have Happened Instead

### Phase 1: Baseline audit

Before editing:

1. inventory all standalone calculator entry points and dependencies;
2. identify the exact original behaviors to preserve;
3. capture screenshots and interaction traces for representative calculators;
4. map workspace shell, canvas, Inspector, card, and session ownership; and
5. list all existing tests and what they do not cover.

The output should be a short baseline report approved before architecture work starts.

### Phase 2: Freeze vocabulary and invariants

Define terms such as `canvas tab`, `calculator session`, `card session`, `Inspector source`, `Asset record`, `projection`, `collect`, and `active object`.

Then write non-negotiable invariants. For this project, they include:

- standalone calculator files are not runtime dependencies of the workspace;
- standalone behavior is unchanged;
- canvas visibility and Inspector card visibility are independent;
- cards from multiple sources may be visible simultaneously;
- every Asset has a stable identity independent of its name;
- raw LaTeX is never replaced by its plain form in persistent state;
- reference controls do not mutate state until a valid choice is made;
- save-time validation and UI eligibility share one rule;
- projections are deterministic and dependency-aware; and
- closing a view does not destroy its session state.

### Phase 3: Build one vertical slice

Before rebuilding ten families, complete one representative calculator end to end:

- independent canvas and Inspector surfaces;
- card-only session;
- close/reopen persistence;
- responsive layout;
- source isolation; and
- browser-level tests.

Only after the vertical slice passes should the pattern be generalized.

For Assets integration, the first slice should have been one variety and one direct sheaf, with create, rename, base change, projection, drag, property-card opening, deletion, and LaTeX rendering all covered.

### Phase 4: Test the state-transition matrix

Tests should cover combinations, not only features individually.

| Area | Required transitions |
| --- | --- |
| Canvas | open, focus, split, close, reopen, resize |
| Inspector | add card, hide, reorder, pin, collapse, retain across canvas changes |
| Multiple sources | show cards from two calculators and Assets simultaneously |
| Assets editor | create, modify subtype, modify references, rename, delete |
| Projection | collect, drop, edit after projection, delete after projection |
| References | click pick, keyboard pick, valid drop, invalid drop, stale save |
| Names | raw edit, plain sorting, MathJax display, legacy normalization |
| Responsive layout | wide, normal desktop, narrow/stacked |

Every row should assert authoritative state and visible output.

### Phase 5: Ship in bounded milestones

Large architectural requests should be divided into reviewable milestones. A milestone should not start until the previous one has a stable contract and browser-tested acceptance criteria. This avoids repairing several layers simultaneously when the user discovers a foundational mismatch.

## Reusable Prevention Prompt

The following prompt can be placed before future Math Workspace implementation requests. Replace the bracketed sections with feature-specific details.

```text
You are modifying math_workspace.html and its workspace-owned implementation.
Treat this as an integration change across mature calculators, not as an isolated
UI patch.

Goal
----
[Describe the user-visible outcome in one paragraph.]

Required working method
-----------------------
1. Before editing, inspect the relevant original standalone HTML, JavaScript,
   CSS, and tests. Treat the original calculator as an executable behavioral
   specification. Do not infer its behavior only from visible markup.
2. Produce a compact baseline/architecture note containing:
   - the files and dependency path involved;
   - the authoritative owner and lifetime of every affected state field;
   - the exact meaning of important terms in this request;
   - existing behaviors that must remain unchanged;
   - risks and browser workflows that must be tested.
3. Do not modify historical standalone calculator files or make the workspace
   load them at runtime. Workspace-only behavior must live in workspace-owned
   source or a clearly separated build adapter.
4. Keep these concepts independent unless this request explicitly connects them:
   canvas tab visibility, calculator session lifetime, Inspector card visibility,
   Inspector card source, active object, and split-view focus.
5. Use stable object IDs for relationships. Keep raw LaTeX, plain text, and
   rendered MathJax as distinct representations. Never persist a display or
   accessibility fallback in place of the raw mathematical value.
6. Centralize each behavioral rule. Picker filtering, drag/drop acceptance, and
   save validation must call the same eligibility logic. Dependency closure and
   cascade deletion must also have one authoritative implementation.
7. Preserve complete drafts across rerenders. Rendering a control must not mutate
   another field or committed model state.
8. Implement one complete vertical slice first. Demonstrate the full workflow in
   a browser before generalizing it to all calculator families or object types.
9. Add behavior tests for each state transition, not only source-presence tests.
   Test initial state -> action -> model state -> visible result -> close/reopen
   retention. Include wide, normal desktop, narrow, and split-view cases.
10. When a requirement is ambiguous, especially verbs such as collect, open,
    show, select, link, or synchronize, stop before implementation and restate
    the observable before/after behavior with an example.

Non-negotiable invariants
-------------------------
[List the invariants. Example: cards from multiple calculator sessions may remain
visible together; closing a canvas never destroys its cards or mathematical state.]

Interaction contract
--------------------
For each interaction, use this format:
- Initial state:
- User action:
- Model changes:
- Visible result:
- State that must remain unchanged:
- Persistence/lifetime:
- Invalid or empty case:

Acceptance matrix
-----------------
[List object types, view modes, widths, and transitions that must pass.]

Delivery requirements
---------------------
- Explain the root cause of any discovered regression before patching it.
- Prefer an invariant-level fix over a call-site workaround.
- Rebuild and cache-bump only affected workspace assets.
- Run all relevant unit/regression/isolation tests.
- Browser-test the exact workflows in the acceptance matrix.
- Report changed files, tests, and any remaining limitation.
```

## Review Checklist for Future Changes

Before accepting a change, ask:

- Did the implementation reuse the complete original behavior or only imitate its visible controls?
- Is every state field owned by exactly one model?
- Can canvas and cards change independently without accidental side effects?
- Are raw LaTeX and plain text kept separate?
- Are derived values recomputed from dependencies?
- Can rerendering erase an unsaved field?
- Does one validation rule serve picker, drag/drop, and save?
- Are tests observing the screen and model after real interactions?
- Was the workflow tested after close/reopen and in split view?
- Was the standalone calculator verified independently?

If any answer is unknown, the feature is not yet ready to ship.

