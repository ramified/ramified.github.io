# Pure Math Toolkit folder guide

Open [index.html](index.html) for the active toolkit. Active calculator HTML pages stay at this level so their URLs remain stable.

| Location | Put here |
| --- | --- |
| `assets/` | Runtime media; GIF previews belong in `assets/gif/`, shared sounds in `assets/audio/`, and game-specific media in `assets/ramified_minigames/`. |
| `presets/` | Preset catalogs, grouped into `category/`, `ramified_minigames/`, and `theorem_graph/`. Each family keeps its registry and preset files together. |
| `analysis/` | Research, architecture, inventories, and investigation notes. Group related notes by feature; the sheaf rebuild notes live in `analysis/sheaf_calculator_next/`. |
| `implement_plan/` | Implementation plans, feature requirements, and the minigames i18n principles. |
| `archive/` | Historical versions and legacy interfaces; consult the [archive index](archive/README.md) before modifying or removing them. |
| `js/`, `css/` | Active scripts, tests, workers, generated bundles, and styles. |
| `cloudflare/` | Workers and deployment configuration. |
| `archive/lianliankan/` | Legacy standalone demo and integration notes; its engine and adapter still serve active minigames. |

New presets belong under their existing family, with stable IDs and keys. Keep board data in preset files and registration metadata in that family's `presets.js`. The minigames family retains its `sokoban/` level folder. Its README and the theorem graph README explain their formats.

Use lowercase folder names with underscores, and group files by purpose before adding a new top-level directory. Keep feature notes together and give historical snapshots a version or date. After moving resources, update both browser paths and Node/build paths, including export instructions.

## Reorganization map

| Former location | Current location |
| --- | --- |
| `lianliankan/` | `archive/lianliankan/` |
| `gif/` | `assets/gif/` |
| `category_presets/` | `presets/category/` |
| `ramified_minigame_presets/` | `presets/ramified_minigames/` |
| `theorem_graph_presets/` | `presets/theorem_graph/` |
| `mosaid_archieved/` and its dedicated scripts/styles | `archive/mosaic_calculator/` |
| `math_workspace_version1/` | `archive/math_workspace_version1/` |
| `sheaf_calculator_next/analysis/` and `data/` | `analysis/sheaf_calculator_next/` and its `data/` folder |
| `ramified_minigames_archive.html` | `archive/ramified_minigames/index.html` |
| `young_diagrams_with_only_claude_2026.05.05.html` | `archive/young_diagrams/2026-05-05.html` |

Moved resources use the new paths, without redirects at their former locations. Previously exported minigame presets with the old header comments remain importable.

## Live workspace build

The live workspace still uses the builder and pinned dependencies in `archive/math_workspace_version1/`. See its [build instructions](archive/math_workspace_version1/README.md). Keep that dependency in mind before treating the folder as disposable history.

Minigames changes must follow [AGENTS.md](AGENTS.md) and the [i18n principles](implement_plan/ramified_i18n_principles.md), including English and Simplified Chinese validation.
