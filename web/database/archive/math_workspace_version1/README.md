# Mathematical Workspace — version 1 archive

This folder contains only the files introduced for the first Mathematical Workspace attempt. They were moved out of the main site so a future workspace can be developed separately and deliberately.

Open `math_workspace.html` directly to view this archived version. Its checked-in classic bundle, stylesheet, and local MathJax files are included here.

This is not an independently rebuildable project. The original calculator pages and scripts remain in the main site. This archive also owns the source builder and pinned toolchain used by the **current live workspace**; it must not be deleted while that dependency remains.

From the `database/` root, install the pinned dependencies with `npm --prefix archive/math_workspace_version1 ci`, then run:

```sh
node js/build_math_workspace_native_editors.mjs
node js/build_math_workspace_native_editors.mjs --check
```

The live build wrapper supplies the calculator source root. It updates the archive's generated workspace bundle, the live v8 bundle, build manifest, and HTML cache hashes together. Historical v1–v7 native bundles remain snapshots. The checked-in catalog remains a historical inventory, with its research-note references updated to their current locations.

Included material:

- workspace page, browser test, local-development notes, launchers, and package metadata;
- `css/math_workspace.css`, `js/math_workspace/`, and `assets/math_workspace_catalog.json`;
- workspace implementation status and parity notes.
