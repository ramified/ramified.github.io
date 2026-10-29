# Workspace source separation validation

Date: 2026-10-29. Original source commit: `e52c35cc6e6b8fc7843f704cece92fe491808465`.
The user approved this newer commit as the baseline after C0; the older R hash
is superseded for this migration. C0 is already part of that commit; its history
was preserved rather than rewritten.

## C1: input and output roots

- `MATH_WORKSPACE_OUTPUT_ROOT` defaults to `sourceRoot`.
- The archive still owns its dist/runtime/toolchain outputs.
- Only liveBundle and liveHtml now use outputRoot.
- Default-output-root build on original sources retained the baseline bytes.

Current build.mjs references (one-based lines):

| Line | Root use | Category |
| --- | --- | --- |
| 24 | Read MATH_WORKSPACE_SOURCE_ROOT; default archive root | Source configuration |
| 25 | Default outputRoot to sourceRoot | Output configuration |
| 30 | read(): calculator files from sourceRoot, workspace/toolchain from root | Read source |
| 216 | Recursively enumerate preset directories below sourceRoot | Read source |
| 232 | Stable logical esbuild filename, plus relative sourceFile | Module resolution metadata |
| 234 | Load sourceFile through read(); resolve dependencies below sourceRoot | Read source |
| 258 | liveBundle below outputRoot | Write output |
| 259 | liveHtml below outputRoot | Write output |

## C2: complete, unchanged copies

- 140 files, 11,712,343 raw bytes, preserving relative paths.
- Union: 139 read() calculator inputs; 12 worker-metafile inputs (all already
  among those 139); no extra calculator input from the main metafile; 79 files
  from the actually enumerated directories, including one extra README.
- Directories: presets/category, presets/ramified_minigames, and its sokoban child.
- Workspace-owned archive modules and pinned dependencies remain in the archive;
  they are not calculator copies, despite being physically under web/database.
- Every original/copy pair matched both raw bytes and git hash-object.
- SOURCE_MANIFEST.json lists every path, input origin, raw SHA-256 and Git hash.

## C3–C4: copied-source build and tests

- Live wrapper reads js/math_workspace/sources and writes web/database.
- esbuild retains original logical filenames while onLoad reads sourceRoot.
  This prevents physical relocation from changing comments in embedded worker code.
- Actual esbuild output bytes (not a Windows checkout file): 15892726 bytes.
- SHA-256: `6a87938ecd2bdf8246cd3c71db2ca6c84041d5643c6e4369ed5942fc087f2b1f`.
- Original-source and copied-source output buffers are byte-for-byte equal.
- C0 tests on original source: 40 passed, 0 failed, 0 skipped.
- The same tests on the copies: 40 passed, 0 failed, 0 skipped; every name and
  status matches C0. See SOURCE_TEST_BASELINE.json.
- npm run workspace:check passed with SOURCE_ROOT pointing at the copies and
  OUTPUT_ROOT pointing at web/database.
- Existing duplicate-object-key warnings were left unchanged.

No calculator source, test case/assertion, color, style, function name, runtime
logic, published bundle, live HTML, core.autocrlf, or .gitattributes was changed
by this migration. No push or deployment was performed.
