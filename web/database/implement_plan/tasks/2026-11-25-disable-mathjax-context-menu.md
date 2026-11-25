# Disable MathJax's built-in context menu in Math Workspace

## Goal
Right-clicking an asset (or anywhere) in `math_workspace.html` must always open our own context menu
(`handleAssetsContextMenu` in `js/math_workspace.js:2987`), never MathJax's menu
("Show Math As / Copy to Clipboard / Math Settings / Accessibility / Language / About MathJax / MathJax Help").

## Cause
MathJax 3 attaches its own `contextmenu` handler to every typeset `mjx-container`. When the right-click lands on
rendered math inside an asset (asset names/icons render TeX), MathJax's menu wins. It is intermittent because it
only happens on typeset formulas, after MathJax finishes loading.

## Change
1. `math_workspace.html` (~line 117): in the inline `window.MathJax` config, add `enableMenu: false` to `options`.
   `js/math_workspace_loader.js:149` copies `mathConfig.options`, so the flag will reach MathJax; verify this.
2. Check whether any other code path in the workspace sets `window.MathJax`/`root.MathJax` config at runtime
   (e.g. `js/math_workspace_loader.js` default `mathConfig` when the page config is missing, or the bundled native
   editors `js/math_workspace_native_editors_v8.js` / `js/math_workspace_editors/*.js` loaded inside the workspace).
   If one of them can replace the config used in the workspace, make sure it also has `enableMenu: false`.
   Do not touch archived files under `archive/`, and do not edit standalone calculator pages.
3. Add a regression check to `js/math_workspace_principal_assets_ui_test.js` (or a small new
   `js/math_workspace_mathjax_menu_ui_test.js` following the existing UI-test style): after MathJax is ready,
   right-click on an `mjx-container` inside an asset item; assert the workspace asset context menu is shown and no
   MathJax menu (`.CtxtMenu_Menu` / `.CtxtMenu_MenuFrame`) appears. Also assert
   `MathJax.config.options.enableMenu === false` (or the equivalent runtime flag).
   If the test cannot load MathJax from the CDN in the test environment, make the assertion on the config instead
   and say so in the report.

## Constraints
- Minimal change; do not restructure context-menu code.
- No new user-visible strings, so no i18n changes expected.
- If any script file referenced from `math_workspace.html` changes, bump its `?v=` query.

## Acceptance
- `node js/math_workspace_principal_assets_ui_test.js` (and the new test if added) pass.
- Report: files changed, how the flag reaches MathJax, test output.
