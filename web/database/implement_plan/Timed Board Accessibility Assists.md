# Timed Board Accessibility Assists

## Summary

Add transient canvas assists to Connect Four, Gomoku, and Go in [ramified_minigames_setup.js](G:/我的大学材料/文件/个人练习/文件类/github/ramified.github.io/web/database/js/ramified_minigames_setup.js). A relevant board position becomes “reached” after a 500 ms pointer dwell or a 1,000 ms primary-button hold.

## Implementation Changes

- Track dwell and long-press candidates by logical board position. Movement within the same position preserves the timer; leaving it, changing positions, blurring, cancelling, beginning an animation, or changing game state clears it.
- Use the full tile/intersection hit area, but activate only when it contains a relevant piece or Connect Four input hole.
- A completed long press suppresses the subsequent click, remains visible while held, and clears on release. Short presses retain normal game behavior.
- Connect Four holes draw the exact `connectFourDropTarget` route, including glued-edge transport, as a translucent light-red beam beneath pieces. Its width equals the configured token diameter.
- Reached Connect Four and Gomoku pieces emit separate rays in every legal axial direction and every square-board diagonal direction supported by the win rules. Rays extend at most 3 or 4 additional positions respectively, pass through empty or same-color positions, and stop before opponents, removed cells, cut edges, or unavailable boundaries.
- Preserve partial rays as requested. Deduplicate equivalent diagonal branches while retaining distinct routes across transported/glued topology and existing cyclic-reuse rules.
- Reached Go stones use the existing topology-aware group search. Draw green outline/halo highlights around every group stone and small filled green circles with light borders at every unique liberty.
- Render assists on the stable board layer beneath pieces where appropriate, while keeping group outlines and liberty dots visible above the pieces. Suppress assists during move animations and active drags.
- Update the setup-script cache version in [ramified_minigames.html](G:/我的大学材料/文件/个人练习/文件类/github/ramified.github.io/web/database/ramified_minigames.html), preserving its current unrelated edits.

## Interfaces And State

- Add an exported pure 

  ```
  placementReachAssist(state, index)
  ```

   helper returning one of:

  - Connect Four drop assist: path, transitions, landing point, and cycle status.
  - Connect Four/Gomoku ray assist: origin, color, step limit, and topology-aware routes.
  - Go assist: group indices and liberty indices.

- Keep timers, pointer IDs, and active assist data as transient UI state. Do not add fields to game saves, exports, records, undo snapshots, or online messages.

- No new settings, controls, visible instructions, or localization strings are required.

## Test Plan

- Extend [ramified_minigames_setup_test.js](G:/我的大学材料/文件/个人练习/文件类/github/ramified.github.io/web/database/js/ramified_minigames_setup_test.js) with deterministic timer controls covering 499/500 ms dwell and 999/1,000 ms press thresholds, same-position movement, cancellation, release clearing, click suppression, and unaffected short clicks.
- Unit-test direct, blocked, partial, diagonal, hexagonal, cut-edge, removed-cell, glued, reflected/rotated, branching, and cyclic routes for Connect Four and Gomoku.
- Test Go group/liberty discovery on ordinary and glued boards, including shared-liberty deduplication.
- Verify canvas styling and layering in center, vertex, polished-vertex, rotated Connect Four, fit-viewport, fullscreen, desktop, and mobile layouts with browser screenshots and touch-style long presses.
- Run the setup and import/export test suites. The current dirty baseline already fails `testGoCaptureSuicideKoAndScoring` (`ready` versus expected `gameover`); preserve unrelated work and verify this feature introduces no additional failures.

## Assumptions

- “Beginning from the piece” means the reached piece is the first point of each ray, not an interior point in every possible winning window.
- Opponent and unavailable-boundary blocks produce truncated visible rays rather than hiding the direction.
- Existing same-color pieces do not block a ray.
- These assists are visual-only and available whenever the relevant board is stable and visible, including preset-starting pieces and settled postgame boards.