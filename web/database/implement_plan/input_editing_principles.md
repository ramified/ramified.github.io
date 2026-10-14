# Editable input contract

The recurring failures are **premature normalization / eager validation** and **loss of intermediate editing states**. When rendering a normalized model value back into the same textbox, they become input-state overwrite and sometimes caret jumping. These describe the behavior; there is no single universal name for all variants. The [React input troubleshooting guide](https://react.dev/reference/react-dom/components/input#my-input-caret-jumps-to-the-beginning-on-every-keystroke) documents the same feedback-loop problem, although this toolkit uses plain JavaScript.

## Draft, preview, and commit

The textbox owns a raw editing draft. The model owns a usable value. They need not be identical during editing.

- `6 → empty → 7` is a valid editing sequence. Keep the empty draft visible and retain the previous usable model value until `7` is available.
- `1` can be a prefix of `15`, even if the control's minimum is `2`. Do not clamp that prefix while typing.
- Signs, decimal points, and exponent prefixes may be incomplete. Do not turn an empty string into zero with `Number('')`, or immediately refill it with a minimum/default.
- `daily ` must remain in the textbox so the user can type `task` next. Trim outer whitespace only at commit; model/display labels may use a normalized preview without writing it back into the draft.
- Preserve the caret and selection for insertion, deletion, replacement, cut, and paste. Do not repeatedly assign `.value` or reconstruct the focused DOM element.
- Defer model publication during Chinese or other IME composition. Publish the final value once, respecting both browser event orders described by [InputEvent.isComposing](https://developer.mozilla.org/en-US/docs/Web/API/InputEvent/isComposing).

## Shared API

```js
CalculatorInputSettings.listenEditable(input, 'input', updatePreview);
CalculatorInputSettings.listenEditable(input, 'change', commitValue);
CalculatorInputSettings.syncEditableValue(input, modelValue);
```

`listenEditable()` protects the raw draft and selection around live handlers, holds incomplete/constraint-invalid numeric drafts without calling the model handler, and defers composition. It supports controls inside native workspace shadow roots. It does not alter range sliders, selects, checkboxes, or readonly outputs.

For an existing plain change or blur commit handler, use:

```js
CalculatorInputSettings.listenEditable(input, 'input', updatePreview, {
  commitHandled: true
});
```

For input-only controls, the shared helper invokes their model handler at change/blur without draft restoration. An empty or malformed number restores the last usable value at that boundary. Final domain validation remains the calculator's responsibility.

`syncEditableValue()` suppresses model-to-control writes while a focused draft is dirty or composing. An explicit Reset, Import, or Cancel action may use `{ force: true }`; ordinary rendering and validation must not use that escape hatch.

HTML number inputs can show an unfinished decimal even when their JavaScript value omits the decimal point. Avoid a value write after typing a decimal point. URL/email inputs also have native whitespace sanitization; compare the browser's accepted value before and after an application handler when auditing them.

## Required checks

Run the draft unit and browser regression tests listed in `AGENTS.md`. Include real sequential keystrokes, not only a single programmatic `.value = '7'` followed by an event. Check blank drafts, multi-digit entry, negative decimals, spaces, middle insertion, selection replacement, blur, IME, delayed rendering, and the bundled native editor where relevant.

For bundled changes, run `node js/build_math_workspace_native_editors.mjs` followed by the same command with `--check`. Commit source and generated bundle/manifest/cache hashes together. Update the affected HTML script cache queries.
