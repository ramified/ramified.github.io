# Ramified Minigames i18n requirements

When changing `ramified_minigames.html`, `js/ramified_minigames_setup.js`, the minigame preset catalog, or a minigame-specific engine/UI:

1. Read `implement_plan/ramified_i18n_principles.md` before editing user-visible behavior.
2. Treat English and Simplified Chinese as part of the feature's definition of done, even when the request does not mention translation.
3. Give new static text, placeholders, titles, and accessibility labels explicit `data-i18n*` keys.
4. Give new dynamic text stable `tk()` keys. Use parameters for variable sentences; do not add new `tr()`, `__patterns`, or `__fragments` dependencies.
5. Add non-empty English and Chinese entries together. Identical values are allowed for intentional English names, abbreviations, brands, and notation.
6. Use `lang="en" data-i18n-ignore` for intentionally untranslated static text, or the exact `__intentionalEnglish` source allowlist for unavoidable legacy dynamic text. Never use substring suppression.
7. Run `node js/ramified_minigames_i18n_test.js` and the relevant minigame tests.
8. When `js/i18n/ramified_minigames_locales.js` changes, bump its cache query in `ramified_minigames.html`.

Do not turn an ordinary feature request into a full legacy translation audit unless the user asks for one. Convert newly added and directly modified user-visible strings.

# Editable input requirements

When changing a calculator's editable text or number controls:

1. Read `implement_plan/input_editing_principles.md` first.
2. Keep the user's raw draft separate from normalized model values. Empty numbers, signs, decimal points, exponent prefixes, trailing spaces, and IME composition are legitimate editing states.
3. Use `CalculatorInputSettings.listenEditable()` for new or directly modified live textbox handlers, or preserve the same draft/selection/composition contract explicitly. Existing plain change/blur handlers can remain commit handlers; mark `commitHandled: true` when appropriate.
4. Use `CalculatorInputSettings.syncEditableValue()` for render or asynchronous updates to a draft-aware field. Never normalize or replace a focused field merely to make an intermediate draft valid. Do not rebuild the focused control on each keystroke.
5. Normalize at a commit boundary. A valid preview may update while typing; an incomplete or invalid number must not replace the last valid model value.
6. Run `node js/calculator_input_drafts_test.js`, `node js/calculator_input_drafts_ui_test.js`, and relevant calculator tests. The UI test uses an isolated browser and real keystrokes; setting `.value` once is not sufficient to test sequential editing.
7. Rebuild and check the live workspace bundle when shared input behavior or a bundled calculator changes, and bump affected page script cache queries.
