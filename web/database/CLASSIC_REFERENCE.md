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

Migration status: the 140 source copies have been created and verified.
The approved migration source commit is
`e52c35cc6e6b8fc7843f704cece92fe491808465` (2026-10-29), distinct from
the earlier reference tag above. The live build entry point reads the copies
and writes the existing live output locations. The build also succeeds with
all corresponding originals unavailable in a disposable checkout.

See `js/math_workspace/DIVERGENCE.md` and
`js/math_workspace/SOURCE_VALIDATION.md` for provenance and validation.
