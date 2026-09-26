# Math Workspace 当前问题登记

仅登记 `Assets -> Sheaf Complex View -> Homology Card` 范围内有代码证据的问题。

## ASSET：Asset 权威模型

### ASSET-001 — 权威 Asset 图仅存在于页面内存
- 状态：OPEN；严重程度：HIGH
- 状态所有者：Asset、Session
- 可信度：CONFIRMED
- 证据：`assetState.snapshot`、id counter、metadata 均由 live controller 内存持有；Assets Import / Export 明示 unavailable；live controller 未接通 native snapshot capture/restore。
- 验收条件：明确 session-only 为产品契约，或让 Asset 图、revision、stable IDs 与必要 metadata 经受支持的保存/恢复往返后保持一致。
- 依赖：BUILD-001。

## VIEW：View projection/layout

### VIEW-001 — View membership 与 layout 不能跨页面 session 恢复
- 状态：OPEN；严重程度：MEDIUM
- 状态所有者：View、Session
- 可信度：CONFIRMED
- 证据：`session.assetProjection.keys/layout` 只在 `sessions` Map 内；runtime 虽有内部 snapshot 函数，live controller 未调用且 API 未暴露通用 capture/restore。
- 验收条件：重开同一受支持 session 后，投影 membership 与按 Asset key 的位置按明确契约恢复；若明确为临时 View，则 UI 和文档不得暗示持久化。
- 依赖：ASSET-001。

### VIEW-002 — workspace Sheaf canvas 的 authoring 语义不一致
- 状态：OPEN；严重程度：MEDIUM
- 状态所有者：View、Session、UI
- 可信度：CONFIRMED
- 证据：View `onChange` 捕获 layout 后立即从 Asset 图重投影；无 active ref 时 build extension 禁用 Input controls，但 picker 仍把 legacy Input Card 列为 available。
- 验收条件：Sheaf View 明确且一致地只做 projection/layout，或所有允许的 native authoring 都通过 Asset command 落到权威记录；不可出现可打开但不可形成权威修改的入口。
- 依赖：UI-001。

### VIEW-003 — curved-arrow endpoint anchor 与 object center 分离
- 状态：PASS；严重程度：LOW
- 状态所有者：View、Canvas geometry
- 可信度：CONFIRMED
- 证据：修复前定向 CDP 数值断言稳定失败：source canonical center 为 `(200, 90)`，最终 path start 为 `(约 218.8, 111.58)`。完整链为 `mapEndpointLabels -> mapRawCurveGeometry(center) -> mapCurveGeometry -> clipBezierPathByLabels(label edge)`；终点共用同一裁剪路径，controls/guides 则继续使用 raw path。workspace-only 修复让 path 两端每帧从当前 canonical object centers 派生，并在 source 实时拖动时同步受影响 map overlays；严格测试覆盖 single/split/resize、20 次切换、实时 source drag、controls/hit/selection 与 screen transform。Edge/CDP、reproducible `--check`、相关回归和最终人工验收均 PASS；standalone 未修改。
- 验收条件：定向回归在 single/split/resize/source live drag/20 次切换中证明 canonical 和 screen endpoints 无漂移，controls/hit/selection 无回归；随后完成人工复验。
- 依赖：统一 scene scaling 主验收已人工 PASS；不依赖 CARD-003 后续里程碑。

## CARD：Property/Homology Card

### CARD-001 — 跨 Asset 的 Homology 修改会被单目标 command 丢弃
- 状态：PASS；严重程度：CRITICAL
- 状态所有者：Card、Asset
- 可信度：CONFIRMED
- 证据：修复前可执行测试证明 sheaf capture 中的 base variety 变化未写入；修复后 adapter baseline diff 生成多 owner patches，command 先验证后一次提交。same-owner、sheaf→base、map→双端点、stale、owner 缺失、非法字段、单 revision/refresh 测试均通过；standalone regression 与最短浏览器路径通过。
- 验收条件：一次 Card command 原子提交所有实际改变的 Asset owners，并拒绝陈旧或越界 patch；sheaf/map promotion 往返后目标 variety 的 Homology 保持。
- 依赖：无；本轮验收条件已满足。

### CARD-002 — capture 白名单与全量替换不具可扩展性
- 状态：PARTIAL；严重程度：HIGH
- 状态所有者：Card、Asset、Adapter
- 可信度：CONFIRMED
- 证据：本轮已取消 properties 整体替换；adapter 只为实际变化的声明字段生成显式 `set`/`unset`，command 增量合并并保留未知/无关字段。剩余限制是字段 schema 仍显式限定为当前三类属性，尚未证明未来新增 Card 属性的版本化扩展。
- 验收条件：capture/command 使用有版本、可校验的增量 patch，或完整覆盖已声明 property schema；新增 Card 属性不会被任一无关 Card 事件删除。
- 依赖：当前字段的增量 patch 部分已完成；未来新增 property schema 仍需独立验收。

### CARD-003 — 多个可见 Property Cards 共享一个可变目标
- 状态：PARTIAL；严重程度：HIGH
- 状态所有者：Card、Session
- 可信度：CONFIRMED
- 证据：Milestone A、B1、B1.1、C1 已 PASS。C1 已将 workspace-only Curve/Label 控件迁移到 session-owned Canvas Appearance Card，stable-key target、实时双向同步、双 runtime session 隔离、零 Asset revision/autosave/property command/derived recompute 均由真实 Edge/CDP 与人工验收确认。
- 验收条件：Milestone A、B1、B1.1 已满足；完整 CARD-003 仍需另行实现普通 selection-following policy 与 Assets Add Card picker，并决定 reload persistence 契约。
- 依赖：CARD-001。

### CARD-003-C1 — Canvas Appearance Card
- 状态：PASS；严重程度：LOW
- 状态所有者：Sheaf Complex canvas Session / View layout
- 可信度：CONFIRMED（代码与自动验证）
- 证据：修复前真实 Edge/CDP 定向测试稳定因 Card 缺失失败。修复后 Input 去重、Card shell/title/empty state、map controls、canvas-only retarget、Card↔canvas 实时同步、pointer capture、双 session 隔离、close/reopen 恢复及零数学写入均 PASS；用户已完成人工验收；standalone 源文件未修改。
- 验收条件：已满足。

### CARD-003-C1.1 — Canvas Appearance UI correctness cleanup
- 状态：AWAITING MANUAL VERIFICATION；严重程度：LOW
- 状态所有者：Card title presentation / workspace-native Card layout
- 可信度：CONFIRMED（代码与自动验证）
- 证据：名称链中的 raw、plain 与 title builder 均保留大小写，根因为共享 header uppercase 继承到 MathJax；Curve 重叠根因为 workspace Reset 双列占宽。定向 Edge/CDP 已覆盖 `f/F`、`\varphi`、`\mathcal{E}_{2}`、`X_1`、三类标题、零模型写入、Reset DOM/Tab/listener 清除以及 normal/split/narrow 几何。
- 验收条件：人工确认小写 `f`、无 Reset、两行无重叠且 Curve/handle 同步正常。此项是 UI correctness cleanup，不改变 CARD-003 架构范围。

## INPUT：引用和草稿

### INPUT-001 — plain/canonical name 是启发式而非语义转换
- 状态：OPEN；严重程度：MEDIUM
- 状态所有者：Asset、Input、UI
- 可信度：CONFIRMED
- 证据：`plainAssetName()` 只特判少量包装命令并剥离字符；该结果同时用于唯一性、排序、ARIA 和纯文本拖拽。
- 验收条件：为支持的 raw LaTeX 定义确定性 plain-name 规范；唯一性与可访问文本对命令、上下标和转义字符有覆盖，并且 rendered name 仍只由 raw name 派生。
- 依赖：无。

## BUILD：bundle/cache

### BUILD-001 — 只有 native bundle 具内容哈希闭环
- 状态：OPEN；严重程度：LOW
- 状态所有者：Build、Session
- 可信度：CONFIRMED
- 证据：native bundle 实际 SHA-256 与 build manifest、HTML 16 位 query 一致；build source 已固定 esbuild `absWorkingDir`，wrapper build 与 `npm --prefix ... workspace:check` 可复现一致。controller 与 CSS query 仍为人工版本字符串，build source不校验它们。
- 验收条件：所有影响该纵向样板的可缓存资源都由可复现内容版本驱动或被自动 stale-check 覆盖。
- 依赖：无。

### BUILD-002 — 关键集成断言多数是源码字符串检查
- 状态：PARTIAL；严重程度：HIGH
- 状态所有者：Build、Adapter、Card、View
- 可信度：CONFIRMED
- 证据：Assets test 用可执行 fake editor/coordinator 覆盖多 Slot coexistence、retarget、stable-owner save、token/guard、rollback 与 compatibility；Card identity test 覆盖 stable title/Instance/Slot presentation，CDP test 挂载真实 Cards 与 Sheaf Complex native editor，覆盖七类 Assets shell、rapid autosave、三类对象 drag、layout/redraw、五个 private sessions 与 activation gate。其他 native editor family 仍未完整自动挂载。
- 验收条件：存在可执行的定向集成测试，证明 projection、Card mutation capture、跨 owner commit、layout round-trip 和 standalone isolation，而不仅证明符号存在。
- 依赖：CARD-001、CARD-002、VIEW-001、ISO 未验证项。

## ISO：standalone isolation

- 当前未登记有代码证据的 isolation 违规；standalone source/HTML 与 workspace 注入分离。
- runtime 的 Card 事件路由、Shadow DOM 样式和 standalone isolation 已由真实 Edge/CDP 与 coverage 回归确认；dispose 后的长期资源清理仍为 UNKNOWN，不记为 PASS。

## UI：交互和视觉

### UI-001 — 空投影时可打开无稳定 Asset 绑定的 legacy Cards
- 状态：OPEN；严重程度：MEDIUM
- 状态所有者：UI、Card、View
- 可信度：CONFIRMED
- 证据：property cards 只有在 `session.assetProjection.keys.size > 0` 时才标记 unavailable；空投影时 Homology Card 仍作为 legacy available，违背“对象 Card 必须由 Assets > Properties 绑定”的边界。
- 验收条件：所有对象属性 Card 在没有 stable Asset ref 时不可打开或不可提交，并向用户说明唯一入口；Card picker 状态与实际可操作性一致。
- 依赖：VIEW-002、CARD-003。

## 汇总

- 有已登记问题的组：6 个（ASSET、VIEW、CARD、INPUT、BUILD、UI）。
- CARD-001、统一 scene scaling、VIEW-003 curved-arrow anchor、CARD-003 Milestone A、B1 与 B1.1 均已 PASS；C1 自动验证 PASS、等待人工验收；完整 CARD-003 仍为 PARTIAL。B2、selection-following 与 Assets Add Card picker 未开始。
