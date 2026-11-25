# Math Workspace UI 打磨：交接说明（2026-11-25）

给下一个会话用。页面是 `math_workspace.html`（用户口头称 “workshop.html”）。所有改动都**未提交**（本机 PATH 里没有 git）。

## 一、最初 22 项清单的进度

已完成：1–3（字体加载、三种字体角色、5 级字号）、4（Matrix 预设 4×2）、5（rows × cols 行）、6（Matrix Display：单元格仍为 42–72px，测试要求不小于 41px；列间距在 7px 放不下时才缩到 4px，由 CSS 按列数和容器宽度计算；标题行可换行。1024px 窗口分屏下 5 × 5 不再横向滚动；窗格比 42px 单元格的下限还窄时仍会滚动）、7（环下拉框改为 “R = ℂ”；`js/math_workspace.js` 的 `assetDefinitionFor` 里，mosaic-diagram 的 “on …” 和 knot/dual-graph 的 “follows …” 改用被引用资产的显示名，不再显示 “mosaic-space:M8” 这样的内部键；新增 `synchronizeReferenceDefinitions()`，被引用资产改名后同步刷新这些描述）、11（统一 96px 标签列）、13（去掉嵌套卡片内边距）、16（统一配色）、17（棕红只留给映射和删除）、18（按钮只剩主/次两种）、19（按钮首字母大写）。

第二批（2026-11-25）也已完成：
- 8：图标视图的类型标签最多换两行，不再截断；卡片内容顶对齐（`css/math_workspace.css`）。
- 9：Complexes & Filtrations 工具栏改为左对齐。原来写的 `flex-start` 被运行时 `[data-surface-role="view"]` 的 `flex-end` 规则压过，已提高选择器优先级（`diagram_display_panel.mjs`，已重建）。
- 10：Knot/拓扑定义 JSON 改为紧凑格式，纯数值数组保持在一行；Trefoil 从 23 行变为 8 行（`js/math_workspace_topology_ui.js` 的 `compactJson`）。
- 12：Source / Preset / Definition 改用与 Name 相同的 96px 左侧标签列，说明文字与控件左缘对齐。
- 14：卡片头部按钮的点击区域改为 28×28，间距 4px。
- 15：Import / Export 的空状态行（`#workspace-status:empty`）不再占位，可见空白从 46px 降到 16px。
- 20：`plainAssetName` 把 TeX 希腊字母命令转换成字形（“Δ · Modify”、“λ · Modify”）。名称唯一性仍按原 TeX 拼写比较（`texPlainName`）。
- 21：在 headless 和带经典滚动条的浏览器中都没复现（页面宽度前后都不变）。仍加了 `html { scrollbar-gutter: stable; }` 作为预防。
- 22：Add panel 弹出层现在按 Esc 或在外部按下鼠标即可关闭，Esc 关闭后焦点回到按钮。
截图与指标：`C:\Users\bbh8149\AppData\Local\Temp\claude\5eff3bb36e3487ea\6493a29d-77b2-496e-8aa5-5e726bae60d0\scratchpad\shots\compare_ui\`（compare_*.png、metrics_diff.md）。脚本是 `shoot_ui.mjs` / `compose_ui.mjs`。headless 下 MathJax CDN 没有加载，所以截图里的公式显示为原始 TeX。

其他遗留：只有 Matrix、Mosaic 和工作区自己的面板用上了 96px 标签列，Sheaf、Strand 等编辑器未检查；窄屏未验证；画布里由 JS 画出的颜色（如 Mosaic 六边形底色）仍偏暖。

## 二、改动在哪里

- 工作区自己的 CSS（可直接改）：`css/math_workspace.css`、`css/ramified_theme.css`、`css/ramified_ui_refine.css`，以及新增的 `css/math_workspace_typography.css`（字体/字号/标签列变量）和 `css/math_workspace_palette.css`（配色、按钮、图标颜色）。
- `math_workspace.html`：Google Fonts 非阻塞加载；以上样式表的链接与缓存参数。**改了 CSS/JS 要同步改 `?v=` 参数。**
- 编辑器（shadow DOM）来自 `js/math_workspace/sources/` 下的私有副本。规则：只用 `var(--ws-*, 原值)` 包装，回退值必须和原来完全一致，副本里不定义 `--ws-*`；每次改动记录到 `js/math_workspace/DIVERGENCE.md`。
- 构建工具里工作区专用的面板 CSS：`archive/math_workspace_version1/js/math_workspace/editors/runtime.mjs`（编辑面板 modify surface 的布局，如 rows × cols 行）、`dock.mjs`、`linear_category_panels.mjs`。
- 改完副本或构建工具后必须重建：`node js/build_math_workspace_native_editors.mjs`，再 `node js/build_math_workspace_native_editors.mjs --check`（会自动更新 html 里编辑器包的哈希）。偶尔遇到 Windows 文件锁报 `UNKNOWN: unknown error, open`，重跑即可。
- **冻结、不要改：** `css/site.css`、`css/import_export_panel.css` 和各经典计算器页面。需要覆盖时在工作区自己的 CSS 里写（`import_export_panel.css` 用了 `!important`，覆盖也要 `!important`）。
- 其他 JS 改动：`js/math_workspace_objects.js`（环选项 “R = ℂ”）、`js/math_workspace_asset_icons.js`（通用图标默认色 `#4f5a64`）。

## 三、用户已定的设计决定

- 字体：界面 Source Sans 3，标题/公式 STIX Two Text，代码/数据 JetBrains Mono；编辑器正文也统一（数学一致性测试改为按 em 比较）。
- 字号：12 / 13 / 15 / 20 / 24px；标签列 96px，长标签换行。
- Assets 视图：类型图标灰色墨水、数据图标青绿；New object 对话框：全部青绿。
- 按钮：主按钮青绿实心，次要按钮深色文字 + 浅灰边框；首字母大写用 CSS `::first-letter`，不改文字本身。
- “+ / edit” 必须和下拉框同一行（`reference_layout` 测试规定）。

## 四、测试

常用（应通过）：`node js/math_workspace_<名字>_ui_test.js`，名字包括 math_rendering、reference_layout、input_panels、panel_picker、creation_grid、io_ui、knot_editing、strand_icons、empty_create_lab；以及 `math_workspace_mosaic_ui_test.js`、`math_workspace_topology_ui_test.js`、`math_workspace_io_test.js`、`math_workspace_asset_icons_test.js`。io_ui、mosaic、topology 连续批量跑时偶尔失败，单独重跑通过。

改动前就失败（已在原版上确认）：layout、polish、viewport、asset_views、tooltips、linear_category、diagram_display、strands_sidebar、sheaf_input、modify_split、open_display、mosaic_ownership、rings_ui（多为 “reading 'editor' / 'mount'”）；slicing_ui（第 21 行 status 为 'missing'，已在原版包上确认）；knot_editing_ui（第 10 行等待 `[data-knot-hover-choice]` 超时：只有 `js/math_workspace_knot_hover_lab.js` 会创建它，而本地改动从 `math_workspace.html` 删掉了 favorite_stars_lab、topology_icons_lab、knot_smoothing_lab、knot_hover_lab、design_lab_theme、subject_assignments、principal_assets 这几个脚本标签。上面“应通过”列表里的 knot_editing 已不成立；empty_create_lab、principal_assets、subject_assignments 的 UI 测试也会因此失败。用户已确认删除是有意的（2026-11-25），这四个测试需要按无 Design Lab 的页面更新）。

## 六、与 origin/main 的合并（2026-11-25）

已把上游提交 1e3cf98（空主区的 Open Assets / New object / Add panel、标签栏 “+”、菜单键盘操作）快进合入，本地未提交改动叠加在上面。唯一冲突是 `math_workspace.js` 的脚本标签，已改为 `?v=20261125-empty-main-reference-names-1`。合并后重建编辑器包，哈希不变，`--check` 通过；empty_main、panel_picker、drag_regression、assets、mosaic、reference_layout、input_panels、io_ui、asset_icons、diagnostics 测试通过。合并前的备份在 `git stash list` 里（两条）。math_rendering 第 82 行偶发失败，原版也会。object_type_icons 第 62 行（缺 MathJax 时的图标形状）失败，未在原版上验证。

## 五、工具

- 本地预览：`.claude/launch.json` 里的 `database-static`（端口 8765），它调用的静态服务器脚本放在临时目录，重启后可能丢失，需要时重写一个简单的 node 静态服务器即可。
- 截图脚本（临时目录，可能已被清理）：`C:\Users\bbh8149\AppData\Local\Temp\claude\482a04f57c86d5ee\9a8fdf01-2419-4b22-b50a-28b365a59e95\scratchpad\` 下的 `shoot.mjs`（headless Edge，创建同一组示例对象，2× 截图各面板）、`compose.mjs`（前后对比拼图：`node compose.mjs <before目录> <after目录> <输出名>`）、`layout_metrics.mjs`、`annotate.mjs`。
- 第 6 项的截图脚本：`C:\Users\bbh8149\AppData\Local\Temp\claude\5eff3bb36e3487ea\6493a29d-77b2-496e-8aa5-5e726bae60d0\scratchpad\` 下的 `shoot_matrix.mjs`（1280/1100/1024 分屏、长名称、窄窗格，并输出 metrics.json）和 `compose_m6.mjs`。注意：`captureBeyondViewport: true` 会去掉页面滚动条，导致重新排版、截图被裁切；截取视口内的元素时用 `false`。
- 用 GPT：把提示词写进 UTF-8 文件再管道传入，避免 PowerShell 拆分引号：`Get-Content -Raw -Encoding utf8 <文件> | codex exec --skip-git-repo-check --sandbox read-only -m gpt-6.2-sol -`（可加 `-i 图片.png`）。Codex 只读，只返回修改方案，由代理应用；适合机械的批量替换和看图验证。
