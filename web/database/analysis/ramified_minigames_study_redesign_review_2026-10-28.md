# Ramified Minigames：审查与待确认设计稿

> Build 2026-10-28.5：继续按用户要求恢复 Game actions 原版向上展开的抽屉，以及左上角设置/撤销/重做/重开图标工具栏；撤掉底部文字按钮栏和新增方向按钮开关。原版控制样式从 canonical player CSS 提取，保留手机至少 44px 点击区域及关闭抽屉隐藏台球工具的修正。
>
> 修复跳棋首轮输入归属缺陷：真实鼠标复现了点击 AI 白子后 `turn` 从 black 变 white、`selectedIndex` 从 null 变 71、round 仍为 0 的卡局。首轮本可自由选择任一未行动颜色，但 UI 没有排除 AI 颜色；这种选择没有触发 AI 调度，随后输入又被 AI 回合检查拒绝。共享引擎现在忽略本地 AI 控制的棋子选择，保留人类颜色的自由选择及联机行为。原版页和实验页均修复，并更新正式/归档入口的共享脚本缓存版本。
>
> 新增 `node js/ramified_minigames_ai_input_ui_test.js`：修复前在实验页稳定失败；修复后在原版页、实验页验证所有三款本地 AI 游戏（跳棋、五子棋、四子棋）。测试点击对方棋子、保持己方选择，并继续完成两轮真实玩家/AI 行棋。六组场景均通过。全部 11 款 UI 回归、真实落点、DPR、图标工具栏、Game actions、i18n、AI/规则/存档/触控和 Mosaic 回归通过。真实双人联网及 Safari/iOS 仍未验证；未部署或推送。

> Build 2026-10-28.4：按用户后续要求，选关和开局准备界面继续回退。删除新增 Random board 按钮、预设列表及对应 JS；从原玩家 CSS 直接提取选关、居中预览、左右棋盘切换、玩家颜色标记和玩家选择器的布局，移除实验页的双栏、格子尺寸和手机隐藏棋盘名等覆盖。标题保留。预览沿用原引擎绘制，新增浏览器检查确认准备页预览与实际游戏画布像素一致，Sokoban 全部关卡预览成功。11 款逐款开局、手机/桌面准备页、真实落点、DPR 和 Mosaic 回归通过；i18n、玩家、推箱子（含 19 关开局和真实通关）、Mosaic 测试通过。未部署。
>
> 玩家选择栏原版只有纯色 CSS 圆点；针对用户指出的“不是游戏中的棋子”，现在保留原有 span/class 和原版布局，在标记内部用小 canvas 调用同一个 `drawPlacementPieceAtPoint()` 绘制。并恢复原版手机两列玩家选择。原绘制和规则函数本身未改，也没有另画一套图标或修改选择行为。

> 后续实施状态（Build 2026-10-28.3）：用户确认保留新标题画面，随后明确要求撤回棋盘、棋子和粘合表达的改造，并指出线描缩略图及选游戏效果不好。因此下文的线描网格、主题/棋子替换、粘合路径和首次教程提案已取消，以此处更新为准。
>
> 当前保留：新标题画面、固定舞台和容器单位、统一纸色外壳、暂停菜单/Workshop、Play 直达选游戏、原有存档隔离、可见 build、DPR 刷新修复。选游戏恢复原 PNG 素材、每页六款的大图分页；棋盘/棋子/粘合/动画函数与共享原引擎逐字一致，生成副本只增加外壳刷新和状态适配 API。没有修改共享 Mosaic 文件、游戏规则或控件 ID/class。
>
> 已删除：线描缩略图生成器、新主题选择器、新粘合条/路径绘制、首次粘合演示及相关样式。旧玩家外壳 CSS 不再加载；兼容样式以较低 CSS layer 单独生成，避免多套外壳互相覆盖。生成器支持 `--check`。
>
> 最新验证：11 款逐款开局；原图和分页、中英菜单、360/768/1280 布局、手机 44px 操作栏、DPR 1/2 单独变化刷新、Go/Gomoku 两宽度两种 DPR 的真实鼠标落点、键盘、Workshop、静音、全屏、存档隔离、浏览器异常检查与 Mosaic 隔离全部通过。i18n、玩家规则/存档、触控及 Mosaic 37 项导出回归通过；输入草稿单元和真实键盘 UI 回归通过。没有保存三宽度截图。
>
> 未部署或推送；线上暂不能认定为 Build .3。Chrome、Firefox、Safari/iOS、真实浏览器缩放矩阵及真实双人联网尚未验证。下面保留初始审查与设计讨论记录，不应把被撤回的方案当成待继续实现的任务。

日期：2026-10-28。范围：`ramified_minigames_study.html` 及其生成源、CSS/JS；不推广到正式小游戏页或 Mosaic。

本轮只审查和写设计文档，没有修改 HTML/CSS/JS，没有部署，没有改 ID/class，没有删除代码。取消每阶段三个宽度截图；保留逐款开局和布局尺寸检查。现有游戏实际为 11 款，包含连连看，保留在指定十款之后。

## 0. 审查结果（按严重程度）

| 级别 | 发现与证据 | 对设计的影响 / 后续处理 |
|---|---|---|
| 高 | 实验舞台 computed `aspect-ratio: auto`、`container-type: normal`。study CSS 用独立宽度和高度覆盖原玩家 4:3。内部混用 px、vw、dvh、rem。 | 未满足固定舞台及内部比例要求；先统一尺寸所有权，不能继续追加覆盖。 |
| 高 | 页面的约 2,046 行内联 CSS 上又叠加原玩家 CSS、study CSS。总计 923 条 CSSOM 样式规则、159 处 important 声明。 | 旧布局仍然参与层叠；清理实验页的生成方式，保留引擎需要的样式，外壳只保留一套。不能直接删共享 site.css。 |
| 高 | 生成器从正式 HTML/玩家 JS 通过字符串替换产生实验 HTML/玩家 JS。 | 只改生成结果会被下一次 build 覆盖；实现必须维护生成源并验证重建一致性。 |
| 中 | DPR 单独由 1 改成 2，CSS 尺寸不变时缓冲仍为 634×634；一次 resize 后更新为 1268×1268。 | 重绘公式正确，但缺少可靠的 DPR 单独变化刷新；补显示刷新通知，不改规则。此为模拟环境复现，真实跨屏还需验证。 |
| 中 | body 直属 footer 被 player CSS 的 `display:none !important` 隐藏，没有可见 build 标识。 | 发布时无法从界面辨认版本。实现阶段增加舞台页脚 build，生成器统一注入；当前尚未添加。 |
| 中 | 标题页有额外导航、介绍、粘合说明；SVG 中有 opacity .28 的第二枚棋子。 | 与“标题、事实副标题、三个按钮”及无影子棋子的要求冲突；移除这一介绍构图。 |
| 中 | 游戏缩略图来自 PNG sticker；选游戏内容内部滚动；首页 Play 先进入存档选择。 | 改为棋盘线描缩略图；Play 直接选游戏，存档入口保留在菜单。网格内部可滚动，整个页面不滚动。 |
| 中 | study 暗色 muted=#A6B1B5、border=#526359，首页为 #9AA5AB、#2E3A43；字体只声明族名，没有随实验页加载指定字体资源。 | 统一首页变量和字体加载；声明字体不代表用户机器确实有字体。 |
| 低 | 3 组同文件、同条件重复 selector：site.css 的 `.card`；inline 的 `body.canvas-fit-viewport .canvas-panel`；study 的 `.design-study #player-home > .btn`。 | 合并实验页可控部分；共享 `.card` 先保留，不能影响 Mosaic。重复声明不等同于双份游戏脚本。 |
| 观察项 | 340 条规则在抽样 DOM 状态中未匹配。study 自身仅 3 条 hover selector 未匹配。 | 不能报告为“340 条废代码”：抽样不覆盖所有悬停、输入设置、特殊局面和联网状态。删除须同时核查动态创建与其他页面用途。 |

未发现可以据此断言的游戏规则损坏、两套玩家脚本同时运行或静态点击坐标偏移。

### 线上与缓存

直接请求 https://ramified.github.io/web/database/ramified_minigames_study.html 及 study CSS/JS，附 cache-busting 查询和 `Cache-Control: no-cache`。

- 三份响应均 HTTP 200，`Age: 0`、`X-Cache: MISS`、`Cache-Control: max-age=600`。
- 规范化 CRLF/LF 后，三份线上内容与本地完全一致；原始字节比较的差异来自换行符，不能误报为旧部署。
- 对本次请求，没有发现这三份资源 CDN 返回旧内容。没有替用户浏览器清缓存，不能据此声称用户已有标签页也已刷新。
- 尚未增加可见版本号，也没有“线上显示新 build”的确认。遵守本轮先不写代码；设计确认后首先加入版本号并在部署后核对，不能把本地改动称为线上更新。
- 建议版本格式 `Build 2026-10-28.2`，由一次构建统一注入页脚与实验资源查询串。以后用实际构建版本，不能长期写死日期。

### CSS 扫描

| 来源 | CSSOM 样式规则 | important 声明 |
|---|---:|---:|
| site.css | 242 | 6 |
| site_i18n.css | 8 | 0 |
| import_export_panel.css | 35 | 85 |
| HTML 内联 CSS | 296 | 29 |
| ramified_minigames_player.css | 230 | 19 |
| ramified_minigames_study.css | 112 | 20 |
| 合计 | 923 | 159 |

`important` 是属性声明数，不是文本行数。全套加载 CSS 只有 site.css 一条 `:root`，没有重复 `:root`；body 上的变量覆盖和暗色媒体条件不是重复根声明问题。

未匹配例子包括 `#shape-badge`、`.generalized-canvas-inline`、`.canvas-size-inline` 和输入绑定设置 selector。前几类来自通用工具外壳，可考虑实验页不再携带；输入设置则可能按需创建，不能直接删除。`:hover` / `:focus-visible` 未匹配属于正常抽样限制。

### JS 尺寸、位置和 resize

检索覆盖启动 JS 与按需游戏模块。Minigames 脚本未找到对 `.style.width/height/left/top/transform` 的直接赋值。另查 CSS 自定义属性，发现实际尺寸写入：

| 文件与行 | 写入 / 监听 | 用途 |
|---|---|---|
| setup.js:10337–10338 | `--fullscreen-action-left/top` | 全屏操作栏位置 |
| setup.js:10438 | `--fullscreen-action-gutter-height` | 全屏操作栏预留空间 |
| setup.js:16495–16496 | `--canvas-display-width/height` | 画布 contain 尺寸 |
| setup.js:16508–16509 | `--canvas-display-left/top` | 全屏可见视口内定位 |
| setup.js:15452 附近 | `style.aspectRatio` | 逻辑画布宽高比 |
| setup.js:1468–1484 | window resize/orientationchange；visualViewport resize/scroll；ResizeObserver | 调度画布及全屏操作栏重排 |
| study_player.js:814 | window resize → sync | 同步玩家菜单和预览 |
| study.js:38 | details toggle 派发 window resize | 抽屉展开后重排；这是合成事件，不是新增监听器 |

ResizeObserver 观察 canvas-wrap 和操作栏，但非原生全屏状态会提前返回。没有找到独立 DPR 媒体查询监听。后续应让舞台负责布局、渲染器读取实际画布框，避免菜单展开触发全局 resize 的耦合。

Mosaic 使用独立 mosaic_calculator.js，另有 resize 监听（2467、3076）以及工具托盘、拖动浮层的位置写入；它不是本页重复加载的引擎。没有为清理 Minigames 而动这些写入。

### 画布与点击

现有正确链条：

`buildGeometry → geometry.cells / 旋转信息 → 绘制`

`client point → canvasDisplayPointFromEvent → canvasPointFromEvent → 逆旋转/包裹映射 → tileFromGeometryPoint → geometry.cells`

绘制与命中共享 geometry 数据；`placementPiecePoint` 读取相同 cell 的 x/y，命中使用相同 cell 和 tilePoints。绘制的正变换和点击的逆变换分别是 `applyGeometryDisplayTransform`、`displayPointToGeometryPoint`。因此不是所有调用都经过同名函数，但也不是两个独立计算的坐标系统。保留这一几何数据源，整理成清晰的正反变换接口；不能为视觉排版再加一套偏移。

正常 render 使用 canvasBackingMetrics：内部像素约等于实际 CSS 尺寸×渲染 DPR，并用 setTransform 映射逻辑坐标。实测 2048，1280×900 视口：

| 状态 | CSS 尺寸 | 内部像素 | context scale |
|---|---|---|---|
| DPR 1，正常 render | 634×634 | 634×634 | 1×1 |
| 单独切换 DPR 2，未触发 render | 634×634 | 634×634 | 1×1 |
| DPR 2，触发 resize/render | 634×634 | 1268×1268 | 2×2 |

交点/格心目前还受 display style 影响；最终主题应固定各游戏合适的棋盘表达，不能把格心游戏统一画成交点棋盘。当前未做逐交点实鼠标落子的全面覆盖，后续画布阶段补测边缘、中心、旋转后的落点。

### 本轮验证与界限

- `node js/ramified_minigames_study_ui_test.js`：11 款逐款开局；360/768/1280 布局包含关系；中英文菜单、Workshop、静音、键盘、全屏、独立存档和 Mosaic 页面隔离通过。没有保存截图。
- `node js/ramified_minigames_i18n_test.js`：573 个引用 key、1107 个目录项通过。
- `node js/ramified_minigames_setup_test.js`：通过。
- `node js/mosaic_calculator_test.js`：37 项通过。
- 本机浏览器检查使用隔离 Edge。Chrome、Firefox、Safari、iOS Safari、125%/150% 浏览器真实缩放及完整设备矩阵尚未验证；CDP 模拟 DPR 不等同于真机测试。
- 单独改变 DPR 的诊断分支取得像素数据后，后续键盘移动等待超时；没有把该分支报告为整套通过。正常全量回归通过，显式 resize 的 DPR 诊断分支及其后续键盘/菜单检查也通过。尚不能断言该次超时的原因。
- 未做真实双人联网、11 款完整胜负流程。没有改共享样式/绘制文件；现有 Mosaic 检查通过，但不能替代以后修改共享文件后的回归。

## 1. 待确认设计

### 设计变量

| 变量 | 日间 | 暗色（严格沿用首页） |
|---|---|---|
| paper | #F1F3EF | #12181D |
| panel | #FAFBF8 | #1A2229 |
| ink | #18212B | #E6EAE6 |
| muted | #55606B | #9AA5AB |
| rule | #CBD2CC | #2E3A43 |
| accent | #0E6B63 | #54B9AC |
| accent ink | #FFFFFF | #0B1513 |
| accent tint | #D3E8E3 | #1F3A38 |

标题 STIX Two Text / Noto Serif SC；界面 Source Sans 3 / Noto Sans SC，后接首页系统字体回退。加载字体不阻塞游戏初始化。所有数字使用 tabular-nums，2048 数字粗体无衬线。

舞台桌面 4:3，手机竖屏 9:16；宽度分别 min(100vw, 100dvh×4/3) 和 min(100vw, 100dvh×9/16)。舞台居中、container-type:size；满视口只负责居中和纸色，不参与内部字体比例。窄屏或窄长竖屏切换一次版式，内部布局不随窗口任意拉伸。

| 项目 | 桌面舞台 | 手机竖屏舞台 |
|---|---|---|
| 标题 | 5cqw，衬线 | 8cqw，衬线，可两行 |
| 分区标题 | 2.8cqw | 6cqw |
| 正文/按钮 | 1.8cqw | 4.5cqw |
| 次要文字 | 1.5cqw | 3.8cqw |
| 分数 | 4.5cqw | 10cqw |
| 常规间距 | 1 / 2 / 3 / 4cqw | 2 / 4 / 6 / 8cqw |
| 按钮高度 | 6cqw | 12.5cqw（360 宽为 45px） |
| 舞台内边距 | 3cqw | 4cqw |

这些是首版比例值，实测中文和短屏后调整。极矮视口下“固定比例完整容纳、全部按容器缩小、触控永远≥44px”存在几何冲突，不能宣称任意屏幕都同时满足；在用户要求的测试视口明确验收 44px。边线使用细实线，圆角约 0.3cqw；默认无阴影，确有层级需要时才用实心偏移。无渐变、发光、模糊、入场动效。

版本号是舞台页脚的一行小字，不挤占棋盘，不增加新的导航。标题页面除了规定内容，仅保留这项明确要求的 build 标识。

### 线框 1：标题

```text
┌────────────────────────────────────────────────┐
│      安静的棋盘线，仅作低对比度背景               │
│                                                │
│              Ramified Minigames                │
│ Games on boards whose edges are glued together.│
│                                                │
│                   [ Play ]                     │
│                   [ Online ]                   │
│                   [ Settings ]                 │
│                                                │
│                             Build 2026-10-28.2  │
└────────────────────────────────────────────────┘
```

中文副标题：“棋盘边缘相连的小游戏。”按钮：“开始 / 联机 / 设置”。Play 直接进游戏网格；保留已有存档数据，存档管理放入暂停菜单。没有介绍段落、外站导航或示意影子棋子。

### 线框 2：选游戏

```text
┌ 返回              选择游戏                     ┐
│                                                │
│  [线描2048]   [线描四子棋]  [线描五子棋]        │
│   2048         Connect Four  Gomoku             │
│   一句规则      一句规则      一句规则           │
│  ──────────   ───────────   ──────────          │
│  [线描围棋]   [线描黑白棋]  [线描推箱子]        │
│   Go           Reversi       Sokoban            │
│                                                │
│   ↓ 舞台内列表继续；页面本身不滚动               │
└────────────────────────────────────────────────┘
```

桌面三列；手机两列，内部滚动，不做等尺寸浮起圆角卡片。项目用线描棋盘、名称、一句规则，细横线区分。顺序：2048、Connect Four、Gomoku、Go、Reversi、Sokoban、Hex、Chess、Chinese Checkers、Billiard、连连看。

点游戏后，舞台原位换为选棋盘视图：返回、游戏名、棋盘预览、Random board / 随机棋盘、预设列表、Play / 开始。只在需要时显示现有玩家/玩法选择；尺寸、种子、细节参数进暂停菜单。Sokoban 保留现有关卡语义，不给没有可玩保证的随机局面新增生成逻辑。

| 游戏 | English | 中文 |
|---|---|---|
| 2048 | Slide and merge matching numbers. Reach 2048. | 滑动方块，合并相同数字，凑出 2048。 |
| Connect Four | Drop a piece and connect four in a row. | 放下棋子，先连成四子。 |
| Gomoku | Place stones and make a line of five. | 轮流落子，先连成五子。 |
| Go | Surround space and capture stones. | 围住地盘，也可以围吃对方棋子。 |
| Reversi | Trap opposing pieces to turn them into yours. | 夹住对方棋子，把它们翻成己方颜色。 |
| Sokoban | Push every box onto a marked spot. | 把每个箱子推到标记处。 |
| Hex | Join your two sides with a chain of pieces. | 用棋子连通属于你的两条边。 |
| Chess | Move your pieces and checkmate the king. | 调动棋子，将死对方的王。 |
| Chinese Checkers | Move your pieces into the opposite camp. | 把己方棋子移进对面的营地。 |
| Billiard | Aim the cue and take a shot. | 瞄准后出杆。 |
| 连连看 | Match pairs with a clear connecting path. | 连起相同的图案，消掉所有配对。 |

### 线框 3a：桌面对局

```text
┌ ● Blue to play                         1280    ┐
│                                                │
│             ┌── a → ───────────┐               │
│             │                  │               │
│          b ↑│      棋盘        │b ↑            │
│             │                  │               │
│             └── a → ───────────┘               │
│                                                │
│    Undo        Redo        Restart       Menu   │
└────────────────────────────────────────────────┘
```

状态栏只显示当局需要的信息：棋类显示带形状/标记的回合棋子和文字；2048 显示大分数，其他统计进菜单，不显示无关回合。结果横幅占棋盘外的状态区，提供 Again / 再来、Menu / 菜单；不覆盖棋盘。

围棋确认计分、跳棋结束连跳、Hex 换边等必要规则动作，在底栏附近按当前状态出现。台球瞄准/力度等必要操作仍然可以在对局中直接使用，不能为了四个按钮的形式把必需操作藏进暂停菜单；技术参数和辅助设置才进菜单。

### 线框 3b：手机竖屏对局

```text
┌──────────────────────┐
│  ● 轮到蓝方          │
│              1280    │
│                      │
│   ┌── a → ──────┐    │
│ b↑│             │b↑  │
│   │    棋盘     │    │
│   │             │    │
│   └── a → ──────┘    │
│                      │
│  当前动作的简短反馈   │
│                      │
│ 撤销  重做  重开 菜单 │
└──────────────────────┘
```

底栏四个稳定触控目标；方向键支持保留，2048/推箱子默认滑动，方向面板为菜单内可选显示。棋盘在剩余空间 contain，不被工具抽屉覆盖。

### 线框 4：暂停菜单

```text
┌────────────────────────────────────────────────┐
│     棋盘保持可辨，菜单外区域不做毛玻璃           │
│       ┌ 暂停                         继续 ┐     │
│       │ [声音 关闭] [显示粘合]            │     │
│       │ 棋盘主题   [纸与墨缩略图]         │     │
│       │ 本局设置    仅相关游戏项          │     │
│       │ 统计        存档        联机      │     │
│       │                                   │     │
│       │ ▸ Workshop / 工作坊               │     │
│       │                                   │     │
│       │ [重新开始]       [选择游戏]       │     │
│       └───────────────────────────────────┘     │
└────────────────────────────────────────────────┘
```

Esc/Menu 打开；焦点进入菜单并圈定，Esc/继续关闭后回到触发控件。手机浮层占舞台大部分，内容可在浮层内滚动。Workshop 默认折叠，收纳调试、翻译检查、音效实验、方块编辑、炸弹工具、种子和导入导出。普通玩家若有对应玩法的必要开关，按相关游戏显示，Bomb 编辑工具不会混进普通棋类设置。

所有原生控件统一 appearance、字体、边线、间距、焦点环；保留原有语义和键盘行为。Workshop 也使用明确中英文 key，不能因“开发工具”而省略翻译。

### 棋盘、粘合和反馈约定

- 默认主题纸与墨。Go/Gomoku 黑白交点落子；Reversi 格心黑白；2048 和 Sokoban 格心；其他双方游戏蓝 #2A5FA8 / 橙 #D9822B 并用实心/中心标记区分。多方跳棋沿用多方身份，不硬压成两色。
- 2048 数值升高时在同一青色色相中加深；逐档选择深/浅文字并实算至少 4.5:1；按位数测量并缩字。棋子半径约格距 .42，特殊形棋盘按几何适配。
- 删除默认影子棋子和棋盘外副本呈现。配对边始终显示相同颜色、同一字母及方向箭头；反向粘合以箭头表达。颜色不是唯一线索。
- 点按或键盘选中边条也能高亮配对，不依赖 hover。Show gluing / 显示粘合 默认只呈现基础边条；打开后给额外说明提示。
- 一步的实际路径使用已有 move/event 数据绘制，跨边处断开并标出出口/入口，约 1 秒消退；没有可靠路径数据的游戏先列缺口，不猜测路线或改变规则事件。
- 首次打开某游戏的微型“穿过去”演示只承担教程，可跳过；不添加奖励、积分或新的玩法系统。这是待实现的交互，不是现有功能。
- 反馈限操作发生时：2048 滑动/合并约 120ms，棋子落下、吃子淡出、末步圈及合法点。尊重 reduced-motion，保留静态末步/路径标记。
- 声音默认关闭；首次进入后的 Sound on? / 开启声音？使用可忽略的小提示，按用户要求一次即可；不出现在初始标题三按钮旁。
- 状态结果用 aria-live=polite，避免每次计时更新重复播报；焦点环、方向键、可访问名称及中文截断在每阶段验证。

## 实施顺序与阶段汇报

设计确认 → 清理与舞台排版（含可见 build）→ 画布尺寸/坐标刷新 → 标题/选游戏/暂停 → 中英文文案 → 粘合表达 → 操作反馈。

每阶段：说明修改、删除、剩余问题；11 款各开一局；检查布局和相关功能；不要求三宽度截图。涉及共享输入时执行输入草稿回归，涉及共享绘制时补 Mosaic 回归。真实浏览器/真机不可用的项目明确保留为未验证。

本轮修改：新增这份审查/设计文档。删除：无。待完成：可见版本号、线上新 build 验证、所有设计实现、跨浏览器与完整缩放矩阵。等待设计确认后再改页面代码。

## 附录：实际加载资源

以下清单由隔离浏览器在标题、11 款开局、菜单/设置抽样时采集，去掉本机服务器地址。没有同时加载 ramified_minigames_player.js 和 study_player.js，也没有加载 mosaic_calculator.js。原 player CSS 与 study CSS 则确实同时加载。


### 启动 CSS（5 份，另有一块内联 style）

- `css/site.css?v=20260903-1`
- `css/site_i18n.css`
- `css/import_export_panel.css?v=20260821-7`
- `css/ramified_minigames_player.css?v=20261028-preview-time-1`
- `css/ramified_minigames_study.css?v=20261028-1`

### 启动 JS（17 份，另有一块内联初始化）

- `presets/ramified_minigames/presets.js?v=20261008-3`
- `js/calculator_input_settings.js?v=20261014-input-drafts-1`
- `js/site_i18n.js?v=20260826-1`
- `js/i18n/ramified_minigames_legacy_sources.js?v=20260824-12`
- `js/i18n/ramified_minigames_locales.js?v=20261028-preview-time-1`
- `js/ramified_minigames_study_locales.js?v=20261028-1`
- `js/import_export_panel.js?v=20260821-7`
- `js/ramified_minigames_korean_audio.js?v=20260901-1`
- `js/ramified_minigames_sfx.js?v=20260913-2`
- `js/ramified_minigames_setup.js?v=20261028-preview-time-1`
- `js/ramified_minigames_sokoban_progress.js?v=20261008-3`
- `js/ramified_minigames_save_slots.js?v=20261010-1`
- `js/ramified_minigames_online.js?v=20261028-preview-time-1`
- `js/ramified_minigames_study_player.js?v=20261028-1`
- `js/ramified_minigames_ai.js?v=20260908-3`
- `js/ramified_minigames_analytics.js?v=20260904-1`
- `js/ramified_minigames_study.js?v=20261028-1`

### 本轮按需加载的 JS / preset

- `presets/ramified_minigames/ramified_cover.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/classic_fans.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/pedestrian.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/classic_fans_glue.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/ice_test.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/curling_on_cube.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/easy_energy_bridge.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/energy_test.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/cross.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/expand.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/orbox_b.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/orbox_b_glued.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/loop.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/curling.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/remote_rotate.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/remote_control.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/islands.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/expand2.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/expand3.preset.js?v=20260904-1`
- `presets/ramified_minigames/sokoban/bridges_blocking.preset.js?v=20260904-1`
- `presets/ramified_minigames/boundary_glue_board.preset.js?v=20260904-1`
- `presets/ramified_minigames/connect_four_6x7.preset.js?v=20260904-1`
- `presets/ramified_minigames/classic_hex.preset.js?v=20260904-1`
- `js/background_homology.js?v=20260827-1`
- `js/hex_homology_game.js?v=20260827-1`
- `presets/ramified_minigames/fide_chess_8x8.preset.js?v=20260904-1`
- `presets/ramified_minigames/small_classic.preset.js?v=20260904-1`
- `presets/ramified_minigames/half_glued.preset.js?v=20260904-1`
- `js/billiards/topological_billiards_math.js?v=20260823-1`
- `js/billiards/topological_billiards_physics.js?v=20260823-1`
- `js/billiards/topological_billiards_renderer.js?v=20260905-3`
- `js/billiards/topological_billiards_native.js?v=20261023-r13-rack-1`
- `archive/lianliankan/lianliankan_engine.js?v=20260830-1`
- `archive/lianliankan/mosaic_adapter.js?v=20260826-2`

### 条件 worker（源码引用，非每次开局都加载）

- `js/billiards/topological_billiards_simulation_worker.js?v=20261023-r13-rack-1`
- `js/hex_homology_worker.js?v=20260827-1`
- `js/ramified_minigames_ai_worker.js?v=20260909-3`

嵌套 worker 依赖及未访问预设不属于上述运行时完整性声明；这些按条件加载不是残留新旧外壳。
