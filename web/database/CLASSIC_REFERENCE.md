# Classic calculator reference

The classic calculator pages and their JavaScript, CSS, workers, and presets
are frozen as a reference for investigating bugs. Do not update those sources
for Math Workspace features or fixes.

- Reference tag: `classic-reference-2026-10-28`
- Reference commit: `c3187ea5c5d9700dce6b85acf647840b1433056d` (main)
- Freeze date: 2026-10-28

Math Workspace development must use its own byte-for-byte source copies under
`js/math_workspace/sources/`, preserving the original relative paths. Subsequent
workspace-only changes belong in those copies and must be recorded in
`DIVERGENCE.md`; they must not be written back to the classic calculators.

Migration status: the source copies have not been created. The initial build
reproduction gate did not reproduce the published bundle: npm/pnpm dependency
path comments differ, and embedded worker source strings differ in CRLF/LF
line endings. Resolve that gate before copying files or changing the source
root. The existing build entry point remains unchanged.
