# Fast local workspace testing

Double-click `math_workspace.html` to use the checked-in classic-script build. Opening the page does not require Node, a build command, a server or uploading the site. Keep the accompanying `js` and `css` directories beside the page. Calculator templates, original styles, presets and worker scripts are packaged at build time; MathJax is included locally. Existing external services, such as number-field lookup, still require a connection.

For development, run these commands from the toolkit's `database/` root. The live wrapper supplies the active calculator sources to the archive's builder:

```powershell
npm --prefix archive/math_workspace_version1 ci
node js/build_math_workspace_native_editors.mjs --watch
```

Refresh the page after the watcher reports a successful build. It consumes the original calculator HTML/scripts, so canvas and card fixes are included without editing a second copy. A content hash in the script URL prevents an old cached bundle from concealing a fix.

```powershell
node js/build_math_workspace_native_editors.mjs
node js/build_math_workspace_native_editors.mjs --check
node js/math_workspace_assets_test.js
```

Commit the generated `archive/math_workspace_version1/js/math_workspace/dist` files, live v8 bundle, manifest, and updated HTML cache hashes together with source changes. The wrapper's `--check` detects a stale build without rewriting it. Open `math_workspace_browser_test.html` beside this document to run temporary native-editor regressions without reading or changing saved projects. These checks are supporting evidence, not the full visual/touch/parity gate.

If browser storage is unavailable, editing still works; use Export → Whole project JSON to keep a downloadable copy. The status bar reports local-storage failures.

The page shows a loading notice and keeps controls disabled until startup connects them. Blocked or unavailable IndexedDB does not leave startup waiting indefinitely. A script-load or initialization failure is displayed explicitly.

The optional `open_math_workspace.cmd` launcher serves the toolkit root on `127.0.0.1:8765` and opens the archived page. This also makes its links to active calculators accessible. The equivalent PowerShell launcher is `open_math_workspace.ps1`. Nothing is uploaded.

If PowerShell script execution is restricted, run this once from PowerShell instead:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Run the server command from the `database/` root, then open `http://127.0.0.1:8765/archive/math_workspace_version1/math_workspace.html`. Refreshing the page picks up changes.
