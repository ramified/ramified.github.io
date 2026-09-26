# Math Workspace 当前交接

## 当前实现阶段

- [CONFIRMED] CARD-003 Milestone A 的统一 scene scaling 主验收已人工 PASS：880×280 canonical scene + 每 session 独立 uniform View Transform 在 single/split/resize 中通过人工确认。
- [PASS] 独立低风险 VIEW-003 curved-arrow anchor 收尾：修复前定向 CDP 测试证明最终 path 被二次裁剪到 label 边界；workspace-only center-derived endpoint 与同帧 overlay 修复现已通过严格 Edge/CDP、相关回归、reproducible build/check 和人工验收。
- [PASS] CARD-003 Milestone A（Property Card ownership foundation）已完成自动与人工验收。完整 CARD-003 仍为 PARTIAL；selection-following/Assets Add Card picker 仍未实施。
- [PASS] CARD-003 Milestone B1（Per-Asset Drafts and Autosave Foundation）：稳定 Input Instance、draft/committed/derived 三层状态、450ms debounce/1500ms max-wait、固定 target/revision command、冲突/删除/stale callback guards 与选择性 Property refresh 已实现；Assets/独立 autosave tests 与人工验收均 PASS。B2/selection-following/Add Card picker 未开始。
- [PASS] CARD-003 Milestone B1.1（Assets Card Chrome and Binding Identity）：Input、Import/Export 与五个 Property Cards 使用共享 calculator chrome/dock；presentation 归 Slot；Input/Property 标题只从 active Instance 的 stable target 派生。定向 executable、真实 Edge/CDP、build/check 与回归均 PASS。
- [PASS] CARD-003 Milestone C1（Canvas Appearance Card）：workspace Input 已移除 Curve/Label，新 Card 归具体 canvas session，仅跟随该 canvas selection；自动、真实 Edge/CDP 与人工验收均 PASS。
- [AWAITING MANUAL VERIFICATION] CARD-003 C1.1 UI correctness cleanup：对象名称 MathJax 显示已保持大小写；workspace-only Reset 已删除，Curve/Label 使用共享响应式列布局。自动验证 PASS，等待人工复验。
- [CONFIRMED] `Assets -> Sheaf Complex projection -> Asset-bound Property/Homology Card` 同时保留 CARD-001 多 owner 原子提交纵向样板。
- [CONFIRMED] 实现尚未提交；工作树在本轮开始前已有改动/未跟踪文件。C1/C1.1 修改 live controller、workspace CSS、native build/runtime/dock、C1/C1.1/drag tests、生成 bundle/manifest/archived HTML、cache query 与三份项目记忆；Assets test 等既存 dirty 内容予以保留，未修改 standalone calculator source/HTML。

## 当前已经工作的纵向样板

- [CONFIRMED] 代码路径具备 Asset create/edit/rename/cascade-delete、typed refs、cycle validation 和 stable `{kind,id}` 关联。
- [CONFIRMED] Sheaf Complex session 能 collect 全图或 drop 单个 Asset，并投影 dependency closure。
- [CONFIRMED] View membership/layout 与 Asset 数学状态分离；layout、canvas-local active selection 与 map curve geometry 按 stable Asset key/ref 捕获并回投。
- [CONFIRMED] Hodge、Betti、Homology、Characteristic Classes、Sheaf Cohomology 各有一个有界 Slot 和私有 card-only renderer session；中央 registry 同时定义 label、native key 与 kind compatibility。
- [CONFIRMED] Slot 复用 `(targetRef, cardType)` stable Instance；显式 Properties action 只 retarget 指定 Slot，其他 Slot 保持原 owner/UI state，普通 Explorer selection 不跟随。
- [CONFIRMED] binding token、`applyingAssets`/`retargeting` guards、sourceRef validation 与 rollback 防止旧事件或失败 apply 写错 owner。
- [CONFIRMED] adapter 比较 projection baseline 与 Card 后 capture，只为实际变化 owner 生成 stable-ref 增量 patch。
- [CONFIRMED] property command 在写入前统一验证 source、revision、全部 owners、dependency scope 和字段 allowlist；一次成功 command 只增加一次 revision、统一刷新一次。
- [CONFIRMED] variety 同 owner、sheaf→base variety、map→双 endpoint 的 Homology 修改均有可执行测试覆盖。
- [CONFIRMED] standalone source 不含 workspace adapter，workspace 注入只存在于 native build extension。
- [CONFIRMED] 当前 native v8 bundle 的实际 SHA-256 与 manifest 及 HTML cache query 一致。
- [CONFIRMED] 当前 native v8 bundle SHA-256 为 `c6ad6b61a3ffbb2d0784c72bc49f6382dd1fad02eba6c816e685bd42edd4e9fe`；live/dist/manifest 一致，三个 native cache query 均为 `c6ad6b61a3ffbb2d`；workspace CSS query 已递增为 `20260926-3`。
- [CONFIRMED] Input 标题支持 bound MathJax + plain/ARIA fallback、A→B→A、rename stable identity、`Assets · Input` 空状态和三种 `New <Kind> · Input`；Property title 不读取 Explorer selection。
- [CONFIRMED] Card pin/move/collapse/hide/drag 只同步 Slot chrome，不增加 Asset revision、不触发 autosave/property writeback；Import/Export 是无对象 target 的 utility Slot。
- [CONFIRMED] Sheaf Complex workspace canvas 回归已有真实 headless Edge/CDP 测试：pointerdown 保持超过原生 80ms resize debounce 后，variety、sheaf、map 仍在 pointerup 前跟随；三类 click selection 保持；map 曲线控制柄在 pointermove 中更新并在 pointerup 后持久；layout、连线 bitmap redraw、五个 card-only sessions、单 Slot retarget、inactive 拒绝、reactivation 与 split-pane focus 均 PASS。
- [CONFIRMED] workspace Sheaf scene 使用固定 880×280 canonical coordinates；stage resize 仅更新 `scale=min(W1/W0,H1/H0)` 与居中 offset。canvas bitmap、MathJax/DOM labels、padding/border、strokes/dashes/arrowheads、handles 与 hit boxes 由同一 scene wrapper 等比缩放，pointer/drop 经最新 scene bounds inverse-transform。
- [CONFIRMED] curved-arrow 修复只存在于 workspace build extension：canonical start/end 每帧从 endpoint object centers 派生，screen endpoints 只经统一 scene transform；原有 stored curve anchors/handles、Asset revision/property state 与 standalone source 均未改变。
- [CONFIRMED] browser path 已实测 Hodge(X) 与 Homology(E) 并存、Homology 单独 retarget 到 f、普通选择 E 不改绑、选择 X 时从 E Card 写入 `7[p]` 后仍显示在 E 投影；Matrices 普通 Card 可继续加入并显示。

## 当前阻止扩展 number 的问题

- [CONFIRMED] CARD-001 已修复并通过自动与浏览器验收，不再阻止当前 Homology owners 扩展。
- [PARTIAL] CARD-002 的增量 patch/保留无关字段部分已完成；未来新增 property 字段仍需扩展并版本化 allowlist/schema。
- [PARTIAL] CARD-003：Milestone A、B1、B1.1 已完成；selection-following policy、Assets Add Card picker 与 reload persistence 尚未完成。
- [PARTIAL] BUILD-002：coordinator/command/diff/controller capture 已有可执行覆盖，真实 native editor 仍主要依赖浏览器路径，未形成全自动 DOM integration suite。

## 已知通过的测试

- [CONFIRMED] 修改前基线：`math_workspace_assets_test.js`、`sheaf_calculator_regression_test.js`、`site_import_export_coverage_test.js` 均 PASS。
- [CONFIRMED] 修复前新增的跨 owner executable test FAIL，证明 base variety 丢写。
- [CONFIRMED] 修复后上述三项均 PASS；Assets test 覆盖 10 类 command/patch 条件及 applyingAssets 抑制。
- [CONFIRMED] native reproducible build 与 `--check` PASS；仅报告既有其他 family duplicate-key warnings。
- [CONFIRMED] `git diff --check` PASS。
- [CONFIRMED] 新增 coordinator executable cases 覆盖五个 native card types、三 Slot coexistence、单 Slot retarget、stable-owner save、一次 revision/refresh、stale token、apply guard、rollback 与 incompatible target。
- [CONFIRMED] `node js/math_workspace_drag_regression_test.js` PASS；它启动本地静态 server 与已安装 Edge，经 CDP 发送真实 mouse/pointer 流并调用 workspace-native runtime/event facade。
- [CONFIRMED] curved-arrow 定向断言覆盖 canonical center、统一 scene transform 后的 screen endpoint、single/split/resize、20 次切换、source pointermove 同帧更新、control 相对位置、hit region 与 selection，全部 PASS。
- [CONFIRMED] `node js/math_workspace_autosave_regression_test.js` PASS；覆盖快速输入单提交、debounce 前模型不变、无效 draft parking、A/B 隔离/flush、固定 target、reference 立即提交、no-op、单 revision/refresh、conflict、delete cleanup、stale renderer/generation/MathJax 与 max-wait。
- [CONFIRMED] `node js/math_workspace_card_identity_test.js` PASS；覆盖 activeInstanceKey title owner、A/B/draft、rename identity、MathJax/plain、空/Create title、utility Slot、retarget presentation 与 chrome writeback suppression。
- [CONFIRMED] `node js/math_workspace_canvas_appearance_test.js` PASS；真实 Edge/CDP 覆盖 Input 去重、Card 注册/shell/title/MathJax/ARIA/empty state、三类对象、Explorer 隔离、Card↔canvas 实时同步、拖动节点稳定、双 session 隔离、零 revision/autosave/property refresh/recompute 与页内 close/reopen 恢复。
- [CONFIRMED] `node js/math_workspace_canvas_appearance_ui_test.js` PASS；修复前以继承的 `text-transform:uppercase` 稳定复现小写 `f` 的显示错误，修复后覆盖 `f/F`、`\varphi`、`\mathcal{E}_{2}`、`X_1` 的 MathJax/plain/ARIA、render 零写入、Reset DOM/Tab/listener 清除，以及 normal/split/narrow 的列对齐与无 overflow。
- [CONFIRMED] Edge/CDP browser test 覆盖七类 Assets Card 标准控件、move 边界 disabled、hide-checkbox 同步、retarget presentation、rapid browser autosave 与零 window errors，并继续通过全部 canvas drag/scene geometry 断言。
- [CONFIRMED] `node js/math_workspace_assets_test.js` 的 coordinator 行为覆盖进一步证明按键阶段零 Property apply，语义提交后只有受影响且可见的 Property Slot 重投影一次。
- [CONFIRMED] live/dist bundle 与 `build.json` 的 SHA-256 均为 `c6ad6b61a3ffbb2d0784c72bc49f6382dd1fad02eba6c816e685bd42edd4e9fe`；三个 workspace HTML native cache query 均为 `c6ad6b61a3ffbb2d`；`git diff --check` PASS。

## 尚未验证的行为

- [CONFIRMED] CARD-003 Milestone A 浏览器路径 PASS：创建 X/E/f，打开 Hodge(X)+Homology(E)，只将 Homology retarget 到 f，普通 click 不改绑；随后在 Explorer 选中 X 时从 Homology(E) 保存 `7[p]`，Card owner 与未相关 Hodge 均保持。
- [CONFIRMED] 第一次真实可见浏览器反馈：variety/sheaf/map 只在拖动结束后更新。根因是 pane pointerdown 对已 active session 重复 `renderCanvasView -> setCanvasActive(true) -> synthetic resize`，80ms debounce 在拖动中重建标签。
- [CONFIRMED] 第二次真实可见浏览器反馈：三类对象 click 后不保持选中，map 曲线控制点不可编辑。根因是 native selection/curve change 的 `onChange` 随即以 `activeRef=null` 从 Asset 重投影，清空 active IDs 并用 `curve:null` 重建 map。
- [CONFIRMED] 第三次真实可见浏览器反馈：split/resize 后 scene 局部错位。根因链为 `split toggle -> pane CSS width change`，原实现没有 stage ResizeObserver/统一 transform；canvas bitmap 被 CSS 非等比拉伸，而 DOM overlays 保留旧 px 坐标和固定 px 尺寸。
- [CONFIRMED] 上述三项与统一 scene scaling 的真实可见浏览器复验已由用户确认 PASS。
- [CONFIRMED] 独立 curved-arrow anchor 收尾的自动与最终人工验收均 PASS；终点因共用同一错误裁剪链而按相同 canonical-center 契约对称修复。
- [CONFIRMED] B1 人工验收已由用户确认 PASS；B1.1 的 executable、真实 Edge/CDP 与 build/check 验收均 PASS，不回退 B1 状态。
- [CONFIRMED] C1 自动与人工验收均 PASS。
- [AWAITING MANUAL VERIFICATION] C1.1 的标题大小写与 Curve 行布局自动验证 PASS；等待用户可见复验。
- [CONFIRMED] 浏览器控制台无 error/warning；Matrices 的 Basic Invariants Card 与 Property Cards 共存；standalone Sheaf 页面可加载且实际 scripts 不含 workspace runtime/bundle。
- [UNKNOWN] map promotion 的完整浏览器数学语义；Homology Slot 绑定 map 时正文仍展示其 dependency graph 中已有 class relations，本轮只验证 ownership/retarget，不扩展 CARD-001 数学 schema。
- [UNKNOWN] 页面 reload 后 Asset、View layout、Card UI 和 stable IDs 的预期契约。
- [UNKNOWN] Shadow DOM 下事件/样式泄漏及 dispose 后 runtime resource 清理。
- [UNKNOWN] live controller/CSS 手工 cache query 是否与所有未提交内容对应。

## 推荐首先处理的问题组

- 当前 C1 已 PASS；C1.1 已完成自动验证，等待人工复验并停止。不要自动进入 B2、普通 selection-following、Assets Add Card picker、number/field、CARD-002 schema、reload persistence、standalone 或其他 UI 重构。

## 当前工作树注意事项

- 保留现有用户改动；不要覆盖 `math_workspace.html`、`js/math_workspace.js`、Assets test、CSS、native builder/runtime、dist manifest/bundle 和 archived HTML。
- `js/build_math_workspace_native_editors.mjs` 与 native v6/v7/v8 文件当前含未跟踪项；不要假定它们已提交。
- `analysis/math_workspace_assets_postmortem_and_prevention_prompt.md` 与 `analysis/math_workspace_prompt_precision_guide_zh.md` 也是既存未跟踪文件，不属于本次三份记忆。
- 本轮未修改 standalone calculator、Number/Field、CARD-002 property schema、reload persistence 或其他 calculator family 源码。
