# Math Workspace 精简架构契约

## 适用范围

- [CONFIRMED] 本契约覆盖 `Assets Explorer -> per-Asset Input Instance -> Asset-bound Property Cards`，并继续包含 `Sheaf Complex View -> Homology command` 纵向样板；依据 live workspace 控制器、native editor 构建源、Assets/Autosave 定向测试和浏览器验收。
- [UNKNOWN] 未经定向测试或浏览器验收的其他 calculator family 行为，不外推到本契约之外。

## 核心定义

- [CONFIRMED] **Asset** 是 `assetState.snapshot.assets` 中的数学对象记录；当前 kind 为 `variety | sheaf | map`，记录包含稳定身份、raw name、plain name、type、data、dependencies、properties。
- [CONFIRMED] **View** 是 Asset 图的可视投影；Sheaf Complex View 只选择一组 Asset key，并按 key 保存该 session 的二维布局。
- [CONFIRMED] **Card** 是 Inspector 中的 UI/命令表面；五类 native Property Card（Hodge、Betti、Homology、Characteristic Classes、Sheaf Cohomology）各自通过一个有界的私有 Slot/session 展示，不是第二个 Asset 仓库。
- [CONFIRMED] **Session** 是一个已挂载 native editor 及其 canvas host、Inspector host、UI 状态和可选投影状态；关闭 canvas 只停车，不销毁对应 session。
- [CONFIRMED] `assets-properties-${cardType}` 是每个 Property Card 类型唯一的 Card-only 私有 renderer session；普通 `sheaf-complexes` session 是 canvas/View session。
- [PARTIAL] native runtime 能编码 model/UI/storage snapshot，但 live 控制器没有暴露或调用通用 capture/restore；当前 Session 实际只保证页面存活期间保留。

## 状态权威所有者

| 状态 | 权威所有者 | 结论 |
|---|---|---|
| Asset 数学结构、依赖、名称 | `assetState.snapshot.assets[]` | CONFIRMED |
| Homology、basis 等对象数学属性 | 对应 Asset 的 `properties` | CONFIRMED |
| Sheaf Complex 中显示哪些对象 | `session.assetProjection.keys` | CONFIRMED |
| Sheaf Complex 视图状态 | `session.assetProjection.layout[key]`（variety/sheaf 位置；map 的 `labelT/labelOffset` 与 curve geometry）及 `activeRef` | CONFIRMED |
| Sheaf Complex canonical scene | 每个 workspace-native Sheaf session 的 880×280 scene；layout/curve 均只在此坐标系计算 | CONFIRMED |
| Sheaf Complex screen geometry | session-local uniform scale + centered offsets；仅由当前 stage bounds 派生，不写回 canonical state | CONFIRMED |
| Card 显隐、折叠、排序、控件瞬态 | native editor session / dock | CONFIRMED |
| 当前 Property Card 目标 | 对应 Slot 的 `activeInstanceKey` -> immutable Instance `targetRef` | CONFIRMED |
| Input draft、dirty、validation、autosave/conflict 状态 | `(targetRef, "input")` 对应的稳定 Input Instance；仅存于页面内存 | CONFIRMED |
| Committed Asset model | `assetState.snapshot.assets[]`；只能由带固定 target/baseRevision 的 command 原子修改 | CONFIRMED |
| Derived/property stale 状态 | 对应 Property Card Instance；只有受影响且可见的 Slot 在 Asset commit 后重投影 | CONFIRMED |
| Property Card 显隐、折叠、顺序、宽窄状态 | 对应 Slot；native dock 是当前 renderer projection | CONFIRMED |
| Assets Input / Import-Export 显隐、折叠、顺序、pin、宽窄状态 | 对应 workspace-owned Slot；Card DOM 只是 projection | CONFIRMED |
| Assets 选择、排序、布局、草稿 | `assetState` | CONFIRMED |
| native projected varieties/sheaves/maps | adapter 生成的临时 projection | CONFIRMED |
| reload 后的上述状态 | 无已接通的 live owner | UNKNOWN |

## Stable ID 规则

- [CONFIRMED] Asset 的规范 key 是 `${kind}:${id}`；所有依赖和 Card 绑定均应以 `{kind,id}` 或该 key 表达。
- [CONFIRMED] display name 不参与身份；rename 不改变 key。
- [CONFIRMED] 新对象 id 使用共享单调计数器和 kind 前缀：`Xn`、`En`、`Mn`。
- [CONFIRMED] native projection id 由 `kind + Asset id` 确定性生成，并经过字符清理；native id 不是外部权威身份。
- [PARTIAL] stable ID 在当前页面 session 内成立；当前没有 Asset import/export/reload 路径证明跨 session 稳定。
- [CONFIRMED] View layout、selection、dependency closure、Property Card 目标不得以名称作为关联键。
- [CONFIRMED] Card Instance 的规范 key 是 `asset:${kind}:${id}:${cardType}`；同一 `(targetRef, cardType)` 在页面 session 内复用稳定 Instance。
- [CONFIRMED] Input Instance 的规范 key 是 `asset:${kind}:${id}:input`；rename 不改变 Instance identity，A/B 各自保留 draft、validation、autosave status、generation 和 conflict。
- [CONFIRMED] Import / Export 是无 `targetRef`、无 Card Instance 的 utility Slot；不得伪造对象绑定。

## 名称规则

- [CONFIRMED] `asset.name` 是用户输入的 raw LaTeX/name 字符串，也是写入 native projection 的名称源。
- [CONFIRMED] `asset.plainName` 由 `plainAssetName()` 派生，用于排序、可访问名称、状态文本和纯文本拖拽。
- [CONFIRMED] Assets View 以文本节点构造 `\(...\)`，再由 MathJax typeset；rendered name 不是可写状态。
- [CONFIRMED] rename/save 必须同时更新 raw `name` 与派生 `plainName`。
- [CONFIRMED] Input Card 标题只从 Input Slot 的 `activeInstanceKey -> immutable targetRef -> Asset record` 派生；不得读取 Explorer selection。绑定时为 `rendered name · Input`，ARIA/plain fallback 为 `plainName · Input`；unbound modify 为 `Assets · Input`，Create mode 为 `New <Kind> · Input`。
- [CONFIRMED] Property Card 标题只从对应 Slot active Instance 的 targetRef 派生，格式为 `rendered name · Card label`；rename 只更新标题，不更换 Instance identity。
- [PARTIAL] plain 转换只识别少量包装命令并做字符剥离，不是完整 LaTeX-to-text 语义转换。
- [CONFIRMED] 唯一性比较使用 plain/canonical name；因此 raw 拼写不同不保证可同时存在。

## Adapter、Command、Event 边界

- [CONFIRMED] Adapter 只负责 `Asset snapshot -> native projection`，以及 `native -> properties/layout capture`；不得把 native payload 反向覆盖 Asset。
- [CONFIRMED] authority extension 每次 apply 都从 Asset records 重建 projected varieties/sheaves/maps；View 不保留第二份 base/endpoint 数学真相。
- [CONFIRMED] Property command 携带 sourceRef、基准 revision、reason，以及按 stable owner ref 分组的增量 `set`/`unset` patch；它是 Card 数学属性写回 Asset 的唯一显式路径。
- [CONFIRMED] save、rename、cascade delete 是 Asset controller command；删除用 revision 防止确认期间的陈旧提交。
- [CONFIRMED] runtime 的 input/change/click/pointerup/keyup 提交通知触发 `onChange`；pointerenter/leave、focus、pointerdown/mousedown 和 move 等交互瞬态不触发投影写回，pointerup 的通用通知晚于 document drag finish；每个提交事件携带其开始时捕获的 binding token，投影与 retarget 期间用 `applyingAssets` / `retargeting` 抑制误写回。
- [CONFIRMED] Adapter 以投影完成后的允许字段为 baseline，只为实际变化的 owner 生成 patch；command 在任何写入前验证 source、全部 owners、dependency scope、revision 与字段 allowlist。
- [CONFIRMED] 多 owner command 全部验证后原子应用，snapshot revision 只增加一次，并通过一次统一 refresh 重建 native projection。
- [CONFIRMED] View session 的 `onChange` 只捕获 canvas-local layout/selection/curve geometry，随后从 Asset 权威图重新投影；不得用缺省 `null` activeRef 清空刚产生的 native selection。
- [CONFIRMED] 已在正确 pane 中显示且 active 的 canvas session 不得因 pane focus 的重复 pointerdown 再次调用 `setCanvasActive(true)`；activation 只发生在停车态进入可见 pane 时，避免原生 resize lifecycle 在活动 drag 中重建标签。
- [CONFIRMED] split、Inspector、Card、viewport 或 responsive resize 只能更新该 session 的 uniform scene transform；canvas/DOM/MathJax、stroke/dash/arrow、handle/hit geometry 必须整体缩放，screen pointer/drop 必须 inverse-transform 后再修改 canonical layout。
- [CONFIRMED] Property Card callback 只有在 token、Slot bound instance、Instance card type 与 captured command `sourceRef` 全部一致时才可进入 CARD-001 command 提交。
- [CONFIRMED] runtime 将 drag/pin/move/collapse/hide 标记为 `card-chrome` interaction；Property Slot 只同步 presentation/visibility/order，不执行 property capture/writeback。Input/utility chrome 同样只修改 Slot，不进入 autosave。

## Input draft 与 autosave 边界

- [CONFIRMED] Input draft 是 Input Instance 的内存状态。每次 `input` 立即更新 draft/dirty/generation，但不修改 Asset、revision、canvas projection 或 Property Card computation。
- [CONFIRMED] 文本与数字使用 450ms trailing debounce 和 1500ms max-wait；select/checkbox/radio 及合法 reference picker/drop 使用同一 coordinator queue 立即验证。
- [CONFIRMED] 浏览器默认 timer 通过闭包调用 `window.setTimeout/clearTimeout`，避免把原生 timer 作为 coordinator 方法调用时丢失 Window receiver；真实 Edge/CDP rapid-input 路径已覆盖。
- [CONFIRMED] blur、Input Card 隐藏、Inspector source 切换或显式 Input retarget 会 flush 当前有效 draft；无效 draft 只停放在原 Instance，不阻止切换。
- [CONFIRMED] autosave command 在出队时固定捕获 `instanceKey`、immutable `targetRef`、`baseRevision`、`rendererEpoch` 和 `taskGeneration`；提交不读取 Explorer selection 或当前 renderer target。
- [CONFIRMED] 只有完整验证成功且 revision 匹配才能一次性更新 Asset、revision++ 一次并统一 refresh 一次；规范化后语义不变时不增加 revision、不刷新、不失效 Property 结果。
- [CONFIRMED] revision conflict 不部分提交，保留 draft 并将对应 Instance 标记为 `Conflict`。删除/cascade delete 会同步删除 Input Instance、取消 timer 并推进 generation，使旧 callback 失效。
- [CONFIRMED] DOM handler、debounce、reference picker focus、MathJax 和可扩展异步 callback 均以 `instanceKey + rendererEpoch + taskGeneration` 校验；任一不匹配即丢弃。
- [CONFIRMED] 有效 Asset commit 只把依赖闭包实际受影响的 Property Instances 标记 stale；只重投影其中当前可见的 Slot，隐藏 Instance 保持 stale 到其后续显示/聚焦。
- [CONFIRMED] 上述 coordinator/runtime 行为已有 deterministic executable tests，且 per-Asset autosave 人工验收已 PASS；CARD-003 Milestone B1 已完成。

## Assets Card shell 与绑定身份

- [CONFIRMED] Assets Input 与 Import / Export 复用共享 `CalculatorCards` 的 drag/pin/collapse chrome；move/hide 由同一个 workspace dock adapter 提供。五个 Property Cards 继续复用 private native session 内相同的 calculator chrome/dock，不为 cardType 建立独立按钮实现。
- [CONFIRMED] Slot 拥有 `visible/order/collapsed/pinned/displayMode`。retarget、rename、autosave 和 renderer reprojection 不创建第二个 shell，也不重置这些状态；move 边界按钮由当前可见 Assets Slot 顺序计算 disabled。
- [CONFIRMED] native dock 的 Property move/hide action 路由到外层 Slot host；hide 后 `slot.visible` 是 Add Card checkbox 的唯一真相。Import / Export 保持 targetless utility Card。
- [CONFIRMED] executable identity test 与真实 Edge/CDP test 覆盖七类 Assets Cards 的标准控制、A/B/title/draft 同步、rename identity、MathJax/plain/ARIA、unbound/Create/create-success、retarget presentation、utility isolation、chrome 零 revision/autosave/writeback。CARD-003 Milestone B1.1 为 PASS。

## Sheaf Complex Canvas Appearance

- [CONFIRMED] `canvas-appearance-card` 属于具体 Sheaf Complex canvas session；它以 stable Asset key 绑定 canvas selection，不读取 Assets Explorer selection。
- [CONFIRMED] workspace Input Card 不再含 Curve/Label 控件。map 外观由 session layout 保存 `curve/labelT/labelOffset/defaultBendPx/modified`，variety/sheaf 保存既有 `labelX/labelY`；Asset model、Input Instance 与 properties 不持有这些状态。
- [CONFIRMED] Card 修改只调用轻量 canvas render/overlay update；drag pointermove 在同一帧同步 Card 并仅 capture session layout。runtime 的 interaction transaction 防止同一事件再发出无分类 change，不进入 Asset projection、autosave、CARD-001 或 derived recompute。
- [CONFIRMED] Card 使用标准 dock shell，新 session 默认可见；visibility/order/collapse/pin/displayMode 与 target 在页内 close/reopen 期间由同一 session 保留。两个 native Sheaf Complex runtime sessions 对同一 Asset 的选择和外观相互隔离。
- [PASS] C1 的真实 Edge/CDP、自动回归、可复现 build/check 与最终人工交互验收均已通过。
- [CONFIRMED] C1.1 名称大小写问题不是 Asset/raw/plain/title-builder 数据变异，而是共享 `.card-head` 的 `text-transform: uppercase` 继承到 MathJax 容器；workspace 只对对象名称的 `mjx-container` 设 `text-transform:none`，静态 Card 类型标签维持既有样式。
- [CONFIRMED] C1.1 Curve 行重叠来自 workspace Card 复制了 standalone 的 `map-curve-tools + Reset` 双列结构。workspace Reset 及专用 listener 已删除；Curve/Label 两行改用同一父 grid/subgrid，描述、range 和 output/unit 列共同派生且可收缩。
- [AWAITING MANUAL VERIFICATION] C1.1 的定向 Edge/CDP、C1/drag 回归和可复现 build/check 已 PASS；等待最终可见复验。

## Standalone isolation

- [CONFIRMED] workspace Asset adapter 仅由 build source 注入 native bundle；standalone `sheaf_complex_calculator.js` 不含 workspace adapter 标识。
- [CONFIRMED] standalone HTML 不加载 workspace native bundle，也不加载退休的 workspace bridge。
- [CONFIRMED] workspace native editor 运行于独立 Shadow DOM/document facade；其 local/session storage 是 session-local Map。
- [CONFIRMED] 浏览器验收证明 workspace 内多 Slot、普通 calculator inspector Card 与 standalone Sheaf 页面可同时正常运行，控制台无 error/warning；standalone HTML 的实际 script 列表不含 workspace runtime/bundle。
- [UNKNOWN] dispose 后 runtime resource 清理仍未做长期/压力验证。

## 不可违反的系统不变量

- [CONFIRMED] 一个数学事实只能由 Asset record 持有；View、Card session 和 native projection 不得成为并行权威仓库。
- [CONFIRMED] 所有对象关联必须使用 stable Asset ref，不得使用 display name 或 native id。
- [CONFIRMED] View 只能回写 layout；Card 只能经显式 command 回写数学 properties。
- [CONFIRMED] 结构编辑改变数学签名时必须失效旧 Homology；非派生偏好可以保留。
- [CONFIRMED] projected Sheaf canvas 上的对象属性 Card 必须绑定一个 stable Asset ref；无 ref 的 Card 不得产生数学写入。
- [CONFIRMED] 每种 native Property Card 最多存在一个可见 renderer Slot；不同 cardType 的 Slot 可同时绑定不同 Asset。
- [CONFIRMED] 只有显式 `Assets > Properties > <Card>` 操作可以 retarget 对应 Slot；普通 click、Ctrl/Shift selection 与 marquee 在 Milestone A 不改变任何 Property Card 目标。
- [CONFIRMED] retarget 必须先验证目标兼容性，失败时回滚 Slot/session 绑定且不得发布新 Instance。
- [CONFIRMED] 一个 Homology command 可以影响 source 及其 dependency closure 内的多个 Asset，且必须原子提交全部受影响 owner。
- [CONFIRMED] properties patch 只能增量 set 或显式 unset 已声明字段；不得用 capture 结果整体替换 `record.properties`，也不得删除未知或无关字段。
- [CONFIRMED] Input draft、committed Asset model 与 derived/property computations 是三层独立状态；按键热路径不得跨越 draft -> committed/derived 边界。
- [CONFIRMED] standalone 页面不得依赖 workspace adapter、bundle 或消息桥。
- [CONFIRMED] native bundle、manifest hash 与 HTML cache query 必须来自同一次可复现构建。
- [UNKNOWN] Asset/Session 跨 reload 的持久化契约尚未定义，不能假定为系统不变量。
