# When Formulas Recalculate and Render

This report describes the formula lifecycle from the point of view of a mathematician using the calculator. It records which visible actions make the calculator calculate something, and what local calculation is actually made.

Important correction: the calculator does not usually recompute all invariants of all saved varieties and sheaves. The expensive refresh in the code is better called a **main refresh**, not a "full recomputation".

## 1. Five Kinds Of Refresh

| Name in this report | What the user sees | Mathematical meaning |
| --- | --- | --- |
| main refresh | charts may show a busy state, then the visible chart context updates | global consistency is refreshed, then only the active display object is calculated |
| characteristic display refresh | only the characteristic-class display changes | already-computed class data is reformatted or simplified again |
| step calculation | only the Step-by-Step Formula panel changes | one displayed formula is transformed by selected rules |
| rule-list refresh | only the available rules in the step panel change | the current formula is unchanged, but applicable rules are searched again |
| canvas redraw | only the picture of objects/arrows changes | no formula should change |

A main refresh is still the expensive ordinary refresh. But its mathematical calculation is local.

## 2. What A Main Refresh Calculates Locally

A main refresh has two parts.

Global bookkeeping:

- refresh constructed/dependent objects,
- synchronize parent/subobject relations,
- remove invalid sequence/map/sheaf references,
- reset symbolic variables and simplification caches,
- refresh canvas, controls, and export state.

Local mathematical calculation:

| Active situation after the user action | Local calculation actually made |
| --- | --- |
| Modify mode, a sheaf `F` is selected | compute data for the selected sheaf only: Hodge/Betti data of its base variety `X`, sheaf cohomology of `F` on `X`, and characteristic classes of `F` on `X` |
| Modify mode, a variety `X` is selected | compute data for the selected variety only: Hodge/Betti data of `X` and structure-sheaf-style cohomology on `X`; no sheaf characteristic classes |
| Modify mode, a map is selected | no Hodge/Betti/characteristic chart for every object; render the map-related Homology Classes panel and canvas/export context |
| Modify mode, a short exact sequence is selected | no invariant is computed for every term; render the sequence/canvas context and any active homology context |
| Modify mode, a rational number is selected | no variety/sheaf chart calculation; render number/status/canvas/export context |
| Create mode | usually no main Hodge/characteristic chart calculation; the calculator mainly updates the draft, canvas, controls, and active homology display |
| Step-by-Step Formula panel | not a main refresh; see the step-by-step section below |

So the main refresh is:

```text
refresh global consistency -> identify the active display object -> calculate only that active display object
```

If several main refresh requests happen quickly, the browser may wait briefly and run only the latest one.

## 3. Cache Mode For Main Calculations

The main canvas header has an always-visible checkbox:

```text
cache calculations
```

When this is checked, the calculator stores the main displayed calculation in memory and reuses it when the same mathematical situation appears again.

Hovering over the `cache calculations` text, or over the status line below the canvas, shows which selected varieties or sheaves are currently stored in the main calculation cache.

What is cached:

- the result for the active selected sheaf or variety,
- the Hodge/cohomology/characteristic data belonging to that active result,
- enough formula data to re-render the characteristic rows later.

What is not cached as source data:

- presets do not store the computed formulas themselves,
- only the cache-mode setting is exported/imported,
- reloading the page starts with an empty cache.

When cache can help:

| User action | Cache behavior |
| --- | --- |
| select a sheaf, then select another object, then select the same sheaf again | reuse the stored sheaf calculation if the mathematical data did not change |
| select a variety again | reuse the stored variety calculation if the mathematical data did not change |
| rename an object | reuse the stored calculation and re-render the displayed labels |
| drag labels or change canvas visibility | reuse the active calculation because canvas placement/visibility is not part of the cache key |
| change root display or term display | reuse the stored bundle/class data and re-render the displayed class rows |

On a known cache hit, selecting the object again should not show `computing update...`; it renders the cached result directly and marks the status as `cached`.

When cache should not be reused:

| Change | Why cache is bypassed |
| --- | --- |
| genus, dimension, degree, rank, twist, base variety, or construction changes | the mathematical object changed |
| homology class/rule data changes | simplification and class formulas may change |
| global number values or assumptions change | symbolic coefficients may change |
| `EXACT` or `proper` flags change | currently treated as part of the construction signature, even if often only notation changes |

The cache is still conservative for construction flags: it prefers recalculating over showing a stale formula when a switch might change the mathematics.

## 4. Visible Actions That Trigger A Main Refresh

The tables below give the visible action and the local calculation it causes.

### Opening, Loading, And Clearing

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| open the calculator page | main refresh | calculate the initially active display object, usually the default selected sheaf or variety |
| load a preset JSON | main refresh | calculate the object selected by the preset; if the preset opens in Create mode, mostly update draft/canvas context |
| click `clear` on the canvas | main refresh | no object invariant remains; clear charts/canvas/export context |
| click `show` when hidden objects exist | main refresh | calculate the currently active display object, although the mathematical data usually did not change |

### Selecting Objects

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| click a variety on the canvas | main refresh | calculate only that selected variety |
| click a sheaf on the canvas | main refresh | calculate only that selected sheaf on its base variety |
| click a map on the canvas | main refresh | no variety/sheaf chart calculation; render map homology context |
| click a short exact sequence on the canvas | main refresh | no all-term calculation; render sequence/canvas context |
| click a rational-number chip | main refresh | no variety/sheaf chart calculation; render number/status context |
| press Enter/Space on one of those selectable labels | main refresh | same as clicking the corresponding object |

This kind of refresh changes the object being inspected. It does not compute every saved object.

### Adding, Updating, And Deleting Objects

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| click `add` for a variety in Create mode | main refresh | usually stays in Create mode, so no main variety chart is computed until the object is inspected in Modify mode; canvas/homology context updates |
| click `add` for a sheaf in Create mode | main refresh | usually stays in Create mode, so no main sheaf chart is computed until the sheaf is inspected in Modify mode; canvas/homology context updates |
| click `add` for a map or construction in Create mode | main refresh | update constructed objects and canvas; calculate charts only if the action switches to a selected Modify context |
| click `update` for a selected variety in Modify mode | main refresh | recalculate only that variety |
| click `update` for a selected sheaf in Modify mode | main refresh | recalculate only that sheaf on its base variety |
| click `update` for a selected map, sequence, or number | main refresh | update map/sequence/number context; no all-object invariant calculation |
| click `delete` in Modify mode | main refresh | calculate the next active display object, if any |
| drag a canvas label outside the canvas to remove it | main refresh | calculate the next active display object, if any |

Typing in most input boxes only edits a draft. The calculation usually happens when the user clicks `add` or `update`.

### Switching The Input Context

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| switch between `Create` and `Modify` | main refresh | in Modify mode calculate the selected variety/sheaf if one is active; in Create mode usually no main chart calculation |
| change object kind in the Input card | main refresh | usually no mathematical calculation, only draft/canvas/control context |
| change the combined construction type | main refresh | usually no mathematical calculation, only draft/canvas/control context |
| change identification kind | main refresh | usually no mathematical calculation, only draft/canvas/control context |
| click `reset` for map picking | main refresh | usually no mathematical calculation, only draft/canvas/control context |

These are important optimization candidates: many change the editor state, not the mathematics.

### Picking Parents On The Canvas

When building a construction, the user often picks existing objects on the canvas. The current code runs a main refresh after many such picks.

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| pick product factors | main refresh | in Create mode mostly update draft/canvas; in Modify mode recalculate the selected product variety |
| pick blow-up base or center | main refresh | in Create mode mostly update draft/canvas; after update, recalculate the selected blow-up variety |
| pick ramified-cover base | main refresh | in Create mode mostly update draft/canvas; after update, recalculate the selected cover |
| pick Abel-Jacobi or Picard curve | main refresh | mostly update draft/canvas; if a selected sheaf/construction becomes active, calculate that active object |
| pick vector bundle for a Grassmannian map | main refresh | mostly update draft/canvas; after update, calculate the active construction if selected |
| pick sheaves/maps in a short exact sequence | main refresh | mostly update sequence draft/canvas; no all-term invariant calculation |
| pick a sheaf base variety | main refresh | in Create mode mostly update draft/canvas; in Modify mode recalculate the selected sheaf on the new base |
| pick the map or source sheaf for a pullback/pushforward sheaf | main refresh | in Create mode mostly update draft/canvas; in Modify mode recalculate the selected sheaf if the construction is updated |
| pick parents for direct sum, tensor, self operation, dual, internal Hom, Schur, ideal, normal, relative tangent/cotangent | main refresh | in Create mode mostly update draft/canvas; in Modify mode recalculate the selected sheaf construction |

For optimization, parent-picking before `add` is often draft work, not a reason to recalculate formulas.

### Construction Options That Currently Refresh Immediately

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| change sheaf base selector | main refresh | in Modify mode recalculate selected sheaf on the chosen base; in Create mode mostly draft/canvas |
| change pullback/pushforward operation | main refresh | in Modify mode recalculate selected map-operation sheaf; in Create mode mostly draft/canvas |
| change `EXACT` for pullback/pushforward notation | main refresh | currently recalculates active selected sheaf if in Modify mode, although it often only changes notation |
| change `proper` for pushforward notation | main refresh | currently recalculates active selected sheaf if in Modify mode, although it often only changes notation |
| change `EXACT` for tensor/internal Hom | main refresh | currently recalculates active selected sheaf if in Modify mode, although it often only changes notation |
| change self-sum/self-tensor multiplicity | main refresh | recalculate selected sheaf construction if in Modify mode |
| change Schur partition | main refresh | recalculate selected Schur sheaf if in Modify mode |
| change divisor coefficients | main refresh | recalculate selected divisor line bundle if in Modify mode |
| change Grassmannian-map parameters/checks | main refresh | mostly draft/canvas before add; after update, calculate the active construction |
| change Picard construction degree symbol/value | main refresh | mostly draft/canvas before add; after update, calculate the active construction |

The notation-only rows are strong candidates for a lighter formula-label refresh.

### Homology Classes And Rules

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| add/delete a homology class | main refresh | recalculate only the active displayed variety/sheaf if its formulas use that homology system |
| edit homology class symbol | main refresh | recalculate only the active displayed variety/sheaf, though symbol-only edits may only need display refresh |
| edit custom class degree/bidegree/mode | main refresh | recalculate only the active displayed variety/sheaf using that class system |
| add/delete a homology rule | main refresh | recalculate only the active displayed variety/sheaf if affected by the rule |
| enable/disable a displayed homology rule | main refresh | recalculate only the active displayed variety/sheaf if affected by the rule |
| assign a monomial relation and save | main refresh | recalculate only the active displayed variety/sheaf if affected by the relation |
| click `update all` for map/sheaf relations | main refresh | recalculate only the active displayed variety/sheaf if affected by those relations |
| add a sheaf Chern class to base homology | main refresh | recalculate the active displayed object if it uses the promoted class |
| add a map pullback/pushforward class to homology | main refresh | recalculate the active displayed object if it uses that map class |
| add curve symplectic basis | main refresh | recalculate only the active displayed object using that curve/Jacobian data |
| add Macdonald products | main refresh | recalculate only the active displayed object using that symmetric-product data |
| add Jacobian symplectic basis | main refresh | recalculate only the active displayed object using that Jacobian data |
| toggle Grassmannian Young basis | main refresh | recalculate only the active displayed Grassmannian-related object |

This is mathematically reasonable when the active chart uses those rules. It is too heavy when the changed homology data is not used by the active display object.

### Characteristic-Class Options

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| change the main characteristic-class basis selector | main refresh | recalculate only the selected sheaf's characteristic data |
| click `further simplify` or `reset simplify` | characteristic display refresh | re-simplify/reformat the already-computed characteristic rows for the selected sheaf |
| change root display form | characteristic display refresh | reformat already-computed characteristic rows |
| toggle `term` for a single class term | characteristic display refresh | display a different term from already-computed class data |
| change class term index | characteristic display refresh | display a different term from already-computed class data |

### Canvas Shape And Visibility

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| drag an object label and release it | main refresh | currently recalculates the active display object, although usually only canvas placement changed |
| drag a map control point and release it | main refresh | currently recalculates the active display object, although usually only arrow shape changed |
| move a map control point with keyboard arrows | main refresh | same as map control drag |
| change map point count or map label offset | main refresh | currently recalculates the active display object, although usually only arrow display changed |
| click standard map-curve button | main refresh | currently recalculates the active display object, although usually only arrow display changed |
| drag or move a short-exact-sequence tail | main refresh | currently recalculates the active display object, although usually only canvas display changed |
| hide/show objects on the canvas | main refresh | currently recalculates the active display object, although visibility usually does not change formulas |

These should usually become canvas redraws, not main refreshes.

## 5. Actions That Use Lighter Refreshes

### Draft Editing Before Add/Update

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| type a variety/sheaf/map name | draft refresh | no formula calculation |
| change variety dimension/genus/degree fields while drafting | draft refresh | no formula calculation until `add` or `update` |
| change sheaf rank or twist while drafting | draft refresh | no formula calculation until `add` or `update` |
| change rational-number name/value while drafting | draft refresh | no formula calculation until `add` or `update` |
| change repeat-name or repeat-style options | draft refresh | no formula calculation |

### Chart Visibility, Export, And Hodge Display

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| reveal/hide a chart card | display refresh | no formula calculation |
| click chart export buttons | export refresh | no formula calculation |
| change export format | export refresh | no formula calculation |
| toggle expanded Hodge display | Hodge display refresh | re-render already-computed Hodge data |
| change Hodge cell size or wide/narrow display | display refresh | no formula calculation |
| run a single Hodge query | local query | compute only the requested `h^{p,q}` entry for the active variety |
| toggle cohomology dimensions-only display | cohomology display refresh | re-render already-computed cohomology data |

### Homology Panel Display

| User action | Current refresh | Local calculation |
| --- | --- | --- |
| switch homology input mode formula/coefficients | homology panel render | no formula calculation |
| transpose homology expression display | homology panel render | no formula calculation |
| open/close a rule group | display state only | no formula calculation |
| type in a relation box | input state only | no formula calculation until saved |

## 6. Step-By-Step Formula: Local Calculation

The Step-by-Step Formula chart has its own lifecycle. It is a separate chart below the main canvas/input row, not a child of the main canvas panel. It should not rewrite the characteristic classes chart.

The stable visible part of this chart is the saved formula/rule list:

- `add formula` opens the formula editor,
- `edit` on a saved formula opens the formula editor with that formula loaded,
- `export` exports the checked saved formulas/rules,
- `delete` removes the checked saved formulas/rules,
- the `all` checkbox below `SAVED FORMULAS/RULES` controls all row checkboxes; empty means none are checked, checked means all are checked, and a partial mark means some but not all are checked,
- unchecked saved formulas are ignored by the saved-formula export and by later saved-rule application.

The larger formula editor is hidden until the user adds or edits a formula. The active calculation panel is hidden until the user starts or resumes an actual step-by-step computation.

Opening the formula editor does not discard an already computed step-by-step calculation. The previous calculation remains available. Closing the editor saves the editor's current formula, then returns to the existing step panel without recomputing. Clicking `compute step-by-step` for the edited formula intentionally starts a new step calculation and replaces the previous one.

### Click `add formula`

Local calculation:

1. clear the editor for a new formula,
2. show the formula editor,
3. list the available homology classes, characteristic classes, and functors for the chosen variety.

No characteristic classes chart is recalculated.

### Click `close editor`

Local calculation:

1. check whether the displayed token formula is allowed,
2. compute the formula polynomial for the chosen variety,
3. store or update it in the saved formula/rule list,
4. close the editor and re-render only the saved list.

If the formula is only a formula, it is saved for display/export/editing. For example, an uncomputed characteristic class formula is listed in the form `c(F)=...`. If it is a genuine single-left-side rewrite, it can also be used as a saved rule in later step calculations.

### Click `compute step-by-step`

Local calculation:

1. read the selected variety/formula/class family,
2. build the initial step formula,
3. search rules that apply to that formula,
4. hide the editor,
5. render the step formula and rule list,
6. remember the formula for temporary cached rules.

It does not calculate all saved objects and does not recalculate the characteristic chart.

### Click `apply rules`

Local calculation:

1. read the checked rules,
2. rewrite the current step formula,
3. record a new history line if the formula changed,
4. remember the new formula for cached rules,
5. search rules that now apply to the new formula,
6. re-render the step panel.

Intended order:

```text
apply rules -> compute next formula -> search rules for that next formula -> render the step panel
```

### Toggle `include cached rules`

Local calculation:

1. keep the current step formula unchanged,
2. search the rule list again with/without cached rules,
3. re-render only the rule list.

This should not re-render the formula itself and should not touch the characteristic chart.

### Other Step Controls

| User action | Local calculation |
| --- | --- |
| change `c(F)`, `ch(F)`, `td(F)`, `s(F)`, or `sqrt td(F)` target | restart only the step display and search rules again |
| toggle `term` or change step term index | change only the displayed step component and search rules again |
| click `restart` | rebuild the step formula from its starting formula |
| click `cancel last step` | restore the previous step formula and search rules again |
| hide/show a step history line | display/export change only, though the step panel is currently re-rendered |
| click `save formula/rule` | save the current step formula; if it is a single-left-side rewrite, also make it available as a saved rule |
| check/uncheck a saved formula/rule | choose whether it is exported; for saved rewrite rules, also choose whether it is offered to later step calculations |
| click the master checkbox | check all saved formulas/rules, unless all are already checked, in which case uncheck all |
| click `delete` | remove the checked saved formulas/rules and update the step rule list if a step calculation is open |
| click `export` | export the checked saved formulas/rules only; no formula is recalculated |
| click `check rules for switching` | add/check switching rules only for the current step session |

## 7. Cached Rules

Cached rules are temporary rules remembered from earlier step-by-step calculations in the same browser session. They are not user-entered permanent rules.

| Label | Meaning |
| --- | --- |
| `cached` | a previous step formula gives a direct rewrite |
| `cached pushforward` | a previous rewrite is pushed forward along a map to the current geometry |
| `cached pullback` | a previous rewrite is pulled back along a map to the current geometry |

Cached rules are considered only when `include cached rules` is checked.

## 8. Optimization Guide

The right optimization question is not "can we avoid full recomputation?" but:

```text
which local calculation is actually needed after this visible action?
```

Suggested invalidation rule:

```text
saved polynomial/geometric data changed -> main refresh for the active display object
only active characteristic display changed -> characteristic display refresh
only labels or functor notation changed -> formula-label/display refresh
only canvas placement changed -> canvas redraw
only step-rule availability changed -> step rule-list refresh
only a step formula changed -> step calculation
```

Strong optimization candidates:

| Current trigger | Better target |
| --- | --- |
| editing only `NAME` and saving | formula-label/display refresh |
| toggling `EXACT` when it only changes `f^*` versus `Lf^*` notation | formula-label/display refresh |
| toggling `proper` when it only changes `f_*` versus `f_!` notation | formula-label/display refresh |
| dragging labels/arrows on the canvas | canvas redraw |
| hiding/showing objects on the canvas | canvas redraw plus maybe homology panel visibility refresh |
| switching draft-building modes before any object is saved | draft/control refresh |
| changing homology data not used by the active display object | homology panel refresh, not active-object calculation |

## 9. Small Internal Glossary

The main report above is written in UI language. For maintenance, these are the corresponding internal names:

| User-facing idea | Internal name |
| --- | --- |
| main refresh | `recompute(...)` |
| main calculation cache | `mainResultCache` |
| characteristic display refresh | `refreshClassDisplayOnly(...)` |
| step panel render | `renderClassStepPanel()` |
| step rule-list refresh | `refreshClassStepRuleCandidatesOnly()` |
| characteristic chart render | `renderClassChart(...)` |
| MathJax rendering | `typeset(...)` |

Use this glossary only as a search aid. The intended behavior should be judged from the visible user action and the local calculation it needs.
