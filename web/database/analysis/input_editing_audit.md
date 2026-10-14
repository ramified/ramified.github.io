# Input editing audit — 2026-10-14

## Findings and repairs

| Area | Cause | Repair |
| --- | --- | --- |
| Minigames board size and rectangle dimensions | Input events normalize incomplete numbers and refill controls from the resulting preview/model. | Hold incomplete numeric drafts, preserve valid raw edits, and protect size fields from later render writes. |
| Go komi | Formatting can rewrite the field while a negative or decimal value is still being typed. | Draft-aware input handling and model-to-control synchronization. |
| Theorem graph title | The state accessor trims titles, then control synchronization writes the trimmed result into the focused field. | Preserve the textbox draft, selection, and composition while keeping the model's normalized preview. |
| Theorem graph node/arrow detail text | Live detail updates can normalize text and synchronize title fields. | Protect directly related live detail handlers and the title render paths. |
| Slicing dimension, radius, and tolerance | Empty number strings are coerced to zero/defaults and rendered back; scalar pair updates also normalize numeric formatting. | Retain the previous valid model during incomplete input and guard the numeric render writers. |
| Young Diagrams grid size | A later layout/canvas resize refills a focused empty number field. | Track the draft and suppress layout-driven writes until commit. |
| Matrix finite-field prime and symbolic field parameters | Field-control refresh supplies defaults to a focused empty input; a partial prime can be normalized during a preview read. | Preserve focused blanks and the last usable prime while editing, retaining explicit stepping and final normalization. |
| Legacy minigames room code | Online-control synchronization uppercases/trims the active draft. | Keep the raw draft while editing and canonicalize at commit. |

The shared implementation lives in `js/calculator_input_settings.js`. The editing contract and future-change requirements live in `implement_plan/input_editing_principles.md` and `AGENTS.md`.

## Audit method and coverage

A source inventory identified 1,310 `.value` assignments across 21 active JavaScript files. This is a candidate inventory, not 1,310 bugs: many writes initialize controls, update readonly output, or operate on selects and range sliders. Those behaviors were retained.

The browser audit visits 14 active calculator/player/debug interfaces and probes currently visible, enabled editable fields after opening available cards. It compares the browser-accepted draft before/after the input handler, waits for delayed updates, and checks focus and DOM identity. Native URL/email whitespace sanitization is distinguished from application rewriting. Disabled controls and frozen historical demos are outside those probes.

The persistent real-keyboard regression separately checks:

- title `daily ` followed by `task`, in English and Simplified Chinese;
- insertion in the middle of a title with preserved caret;
- Chinese composition without publishing partial text;
- grid `6 → empty → 7`, including a delayed resize;
- decimal input in the slicing calculator;
- minigames board `6 → empty → 7` and prefix `1 → 15`;
- negative decimal Go komi;
- hidden finite-field prime editing during refresh and explicit next-prime stepping;
- numeric editing inside the rebuilt native workspace's shadow DOM.

The unit test checks empty numeric drafts, delayed model writes, text spaces, selection, commit fallback, composition, explicit reset, and duplicate commit prevention. These tests are a repeatable gate for future changes; the audit is not a claim that every possible dynamic mathematical state has been enumerated.

## Validation commands

```sh
node js/calculator_input_drafts_test.js
node js/calculator_input_drafts_ui_test.js
node js/calculator_input_settings_test.js
node js/theorem_graph_calculator_regression_test.js
node js/ramified_minigames_i18n_test.js
node js/build_math_workspace_native_editors.mjs --check
```

Additional relevant calculator, minigame, and workspace checks accompany the changes. Previously reported broad-suite failures in Hex hover timing, the mosaic billiards editor, and Lianliankan catalog expectations are separate from this input repair.
