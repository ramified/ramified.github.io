**Files changed**

- [math_workspace.html](C:/Users/bbh8149/xiaoxiang_zhou/structured/github/ramified.github.io/web/database/math_workspace.html:117) sets `enableMenu: false`. The workspace loader passes the option to MathJax for either CDN source. Native editors keep their configs scoped to their own instances.
- [math_workspace_principal_assets_ui_test.js](C:/Users/bbh8149/xiaoxiang_zhou/structured/github/ramified.github.io/web/database/js/math_workspace_principal_assets_ui_test.js:5) adds the rendered-asset right-click regression and updates the suite for the retired Design Lab preview and on-demand editor loading.

**Tests** — The required UI suite passed with a local Edge launch workaround after the default launch crashed. `node --check` and `git diff --check` also passed.

**Open issue** — Both MathJax CDN downloads failed in this environment. The suite verified `enableMenu: false` through its config fallback. The rendered right-click remains unverified.