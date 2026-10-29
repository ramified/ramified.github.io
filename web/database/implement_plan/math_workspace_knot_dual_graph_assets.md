# Knot / Dual Graph 独立资产实施计划

状态：已实现并完成专项与相关回归验证（2026-10-29）。以下保留需求与设计依据，实际入口和验证记录见第 10 节。

## 1. 已确认的目标

在 `math_workspace.html` 中新增两种正式资产：

- **Knot / Link**：用平面结图表示的结或链环。
- **Dual Graph**：保留顶点权重、边和标记腿等信息的对偶图。

二者都有自己的身份、名称、数学数据、Open、Modify 和 Properties。
Mosaic Diagram 是可选的生成来源，不再是它们必须依附的数据容器。
相应 Properties 也迁移到新资产，不能只增加资产入口而继续把属性绑定在 Mosaic 上。
这里的 Properties 指对象的数学信息与计算；图形展示和显示设置归 Open / View。
现有名为 Seifert Surface 的 Mosaic 表面展示不作为 Knot / Link 的 Property 迁移。

每个新资产支持两种互斥状态：

1. **关联来源**：引用一个 Mosaic Diagram，由来源决定数学数据；来源中相关内容变化时更新。
2. **独立**：拥有自己的数学定义，允许直接编辑；原 Mosaic Diagram 后续变化不再影响它。

关联模式不支持反向写回 Mosaic。直接编辑生成结果前先转为独立。
重新关联时，用所选来源的生成结果替换当前定义，不合并两份数学数据。

Knot 只接受平面结图，不支持曲面上的结。这个限制不自动施加到 Dual Graph。

## 2. 当前实现与需要改变的关系

当前 `js/math_workspace_mosaic.js` 只定义 `mosaic-space`、`mosaic-diagram` 两种资产。
Mosaic Diagram 引用 Mosaic Space；渲染器把背景和图案组合成旧计算器输入。

目前以下面板仍绑定 Mosaic Diagram：

| 现有入口 | 当前内容 | 目标归属 |
| --- | --- | --- |
| `mosaic-knot` | 结／链环识别、PD / DT / Braid 编码 | Knot / Link |
| `mosaic-dual` | 对偶图信息、不变量及图形视图 | Dual Graph |
| `mosaic-seifert` | 基于 Mosaic 的表面绘制、分片及拓扑统计 | 保留为 Mosaic 的表面展示，不迁为 Knot / Link 的 Property |

旧计算器还具有 Dual Graph 的 Riemann surface、代数曲线视图与 Boundary Divisors。
目前独立工作区属性目录没有完整暴露这些入口；拆分时要逐项检查，
将显示能力接到 Dual Graph 的 View，将数学信息与计算接到其 Properties。

继续属于 Mosaic 的内容包括背景统计、背景同调、度量、Poincaré Disk、Universal Cover
以及图案自身的统计，不把它们一并迁给 Knot 或 Dual Graph。

## 3. 数据设计

拟采用资产 kind：`knot`、`dual-graph`。具体字段在第一个实现阶段固定并加入测试。

### 3.1 数学定义与来源

- 来源只记录稳定的 Mosaic Diagram 资产引用，不依靠名称或面板实例。
- 独立资产不保存 `rows`、`cols`、格子内容、切割、粘边或完整 Mosaic payload。
- 关联资产也不复制整套背景；只存来源关系，以及必要的紧凑结果／最后有效结果。
- 最后有效结果仅用于保留数据和解除关联时的恢复，不得在来源失效时冒充当前有效结果。
- 颜色、缩放、布局、显示开关属于各自视图，不进入数学定义；不同视图可以独立设置。

### 3.2 Knot / Link

采用紧凑的平面结图表示，首选现有引擎已经生成的 PD 编码：

- 每个交叉点的四条半边及其循环顺序。
- 交叉处的上下穿越关系。
- 分支连接；额外记录没有交叉点的圆分支，防止 unlink 信息丢失。
- 如果某项性质需要定向，显式记录或提供分支定向，不让它依赖 Mosaic 的格子方向。

DT、Braid 和识别名称是派生信息，仅在能够计算时显示。
PD 编辑须验证半边配对、闭合性和表示的平面可实现性，不能把任意合法 JSON 当作平面结图。
直接编辑第一版提供带说明和示例的结图编码编辑器；独立资产的显示也必须能读取该表示。

从 Mosaic 生成前检查闭合性、交叉合法性以及是否使用周期识别／粘边连接。
第一版不把使用曲面连接的图案静默解释成平面结，也不通过删除粘边信息强行转换。
无法生成时说明原因，保留来源图案，不创建半成品资产。

### 3.3 Dual Graph

复用旧计算器已有的标准图表示，而不是重新保存 Mosaic：

- `genera`：顶点的 genus 权重。
- `legs`：每个顶点处的半边列表。
- `edges`：内部边的半边配对，支持自环和重边。
- `decorations`：腿／半边上的标记。

校验顶点和半边列表、配对唯一性、权重及标记；保留孤立顶点、外腿和非稳定图。
某项性质若仅适用于稳定图，在该性质入口说明条件，不能禁止资产本身存在。

与嵌入有关的功能若需要顶点处的循环顺序，必须保留这项必要结构；
不能仅凭抽象邻接关系声称恢复了原来的嵌入曲面。
本次不为了搬迁现有 Mosaic 表面展示而给抽象图强行添加背景或表面数据。

## 4. 创建、编辑与依赖行为

### 创建入口

- New… 中可以直接创建 Knot / Link 或 Dual Graph，不自动创建配套 Mosaic Space。
- Mosaic Diagram 提供“生成 Knot / Link”“生成 Dual Graph”操作。
- 从 Diagram 生成时默认关联该 Diagram；资产编辑器可切换为独立。
- 第一版提供少量使用新数据格式的独立示例／预设，例如 unknot、trefoil 和简单加权图。
  如果复用旧预设，先提取成紧凑数学数据，不把整个 Mosaic 预设塞进新资产。
- 普通 Open／Properties 操作不得反复创建重复资产。

### 来源切换

| 操作 | 预期行为 |
| --- | --- |
| 选择一个来源 Diagram | 先验证并生成成功，再建立关联；失败时保留原定义 |
| 关联状态下编辑 Diagram | 更新资产的生成结果及其相关属性 |
| 关联 → 独立 | 复制当前有效的紧凑数学定义，解除引用，启用直接编辑 |
| 独立 → 关联 | 验证所选来源后，替换定义并建立依赖 |
| 独立状态下编辑原 Diagram | 资产和属性不发生变化 |
| 来源重命名 | 资产引用保持有效 |

来源被删除、图案变得不闭合、背景不兼容或不再符合平面结限制时：

- 显示来源及具体原因，将依赖它的属性标为不可用／待修复，清除过期结果。
- 保留资产定义、来源引用和最后有效结果，不自动断开或替换成默认对象。
- 允许换来源或显式“使用最后有效结果转为独立”；没有有效结果时不能伪造一个。
- 修复来源后恢复正常更新。

依赖登记覆盖警告、删除影响范围、默认资产清理、导入导出和备份恢复。
更新只影响有关联的对象；两个独立对象、两个不同来源对象之间不得串写。

## 5. Properties 的迁移与 View 的区分

### Knot / Link

- 结／链环基本信息、分支与交叉点信息。
- 现有识别结果与候选列表。
- PD，以及可用时的 DT / Braid。

结图本身的绘制、颜色及布局属于 Knot / Link 的 View。

### Dual Graph

- 图的基本信息和现有不变量。
- Boundary Divisors 的计算与显示。

图布局、图形显示及现有 Riemann surface／代数曲线可视化属于 Dual Graph 的 View，
不因为它们当前和不变量放在同一旧面板中，就全部归为 Properties。

### 现有 Seifert Surface 展示

本轮保留它与 Mosaic Diagram 的关系，按 Mosaic 的表面展示入口处理，
不加入 Knot / Link 的 Properties，也不因用户打开该展示而自动生成 Knot 或 Dual Graph。

目前 `analyzeSeifertSurface()` 读取 Mosaic 的弧段、顶点和连接，
构造带与圆盘并统计所展示表面的分片、连通分支、边界、Euler characteristic 和 genus。
因此它并非完全没有计算，但这些统计描述的是当前构造的表面，
不能直接当作抽象结／链环的内在不变量，也不能把该 genus 标成 knot genus。

绘制、颜色、带宽和边界着色保留为视图选项，当前表面统计保留在该展示旁。
本次不强制将这些统计另拆为新资产的 Property，也不重写其表面算法。
若以后实现从独立结图构造真正的 Seifert surface，再单独设计构造、表示和 View；
不能仅凭旧面板名称作这一承诺。

### 目录与显示

更新能力表、Properties 菜单、面板选择器、主资产归属和 New… 分类。
Mosaic Diagram 不再列出结／链环和对偶图自身的 Properties；
保留生成结果资产的操作入口及其现有 Mosaic 表面展示。
Open 读取对象自身的数学表示；Modify 管理来源和独立定义；Properties 绑定新资产 ID。
多视图、隐藏后重开和已有面板复用继续遵守现有工作区约定。

## 6. 旧数据与旧面板兼容

- 现有 Mosaic Space／Diagram 的 ID、数学数据和相互引用保持不变。
- 旧备份中没有打开需要迁移的结／图属性面板时，不批量制造 Knot／Dual Graph。
- 需要迁移的旧结／图面板若引用 Mosaic Diagram，在导入前迁移成关联的新资产，并重绑对应面板。
- 同一 Diagram 的结相关面板复用同一个 Knot；图相关面板复用同一个 Dual Graph。
- 旧 `mosaic-seifert` 保留 Mosaic Diagram 绑定与展示设置，不触发结果资产创建。
- 迁移不要求旧来源当前一定可计算；失效对象保留来源并显示修复信息，不能使整份旧备份无法打开。
- 迁移函数须幂等，重复导入不能重复增殖资产；处理名称冲突而不覆盖现有资产。
- 保留可兼容的面板位置、视图设置、比较视图、草稿和备份引用。

## 7. 实施顺序

### 阶段 A：模型与计算边界

新增独立模块，定义 `knot`、`dual-graph`、紧凑表示、校验、来源解析和解除关联。
先完成 Mosaic → 紧凑表示的转换测试，明确平面限制、无交叉分支和图标记。
计算／渲染接口必须能够直接接受独立数据。
如需从旧计算器提取函数，保持计算逻辑可测试，避免在隐藏的可编辑 Mosaic 面板里维护第二份权威状态。

### 阶段 B：资产与编辑器

接入资产类型、默认名称与图标、New…、来源选择、生成操作、独立编辑和预设。
接入依赖图和诊断，验证背景或图案变化后的传播及故障恢复。
编辑控制遵守 `implement_plan/input_editing_principles.md`；
采用 `listenEditable()` / `syncEditableValue()` 或明确的提交边界，保留原始草稿和 IME 状态。

### 阶段 C：显示与属性迁移

逐项转移第 5 节列出的结／图能力，分别归入 Properties 与 View；
现有 Mosaic 表面展示按该节规定保留。
先验证独立资产修改后显示及性质正确，再移除旧的 Mosaic 属性归属。
继承现有可计算范围，超出范围时显示真实条件，不保留看起来有效的旧结果。

### 阶段 D：兼容与验收

实现旧面板迁移和备份往返测试。
修改工作区内置计算器适配器时，编辑其源文件并重建实际加载的 native bundle；
同步生成的 manifest／hash 和受影响 HTML 脚本缓存版本。
不直接手改生成 bundle，不把 standalone Mosaic 或 minigame 的入口改成新工作区行为。

## 8. 验收标准

新增模型测试与真实浏览器测试，至少验证：

1. 两种资产可以独立创建，数据中没有完整 Mosaic 背景。
2. Mosaic 生成结果与旧引擎一致；结的交叉上下关系、无交叉分支、图权重和腿标记不丢失。
3. 平面限制确实生效；无效生成不留下半成品资产。
4. 关联资产随来源更新，解除关联保留当前数学结果；独立编辑不反写来源。
5. 重新关联和换来源成功替换定义；失败保留之前的数据与编辑草稿。
6. 来源失效时显示警告、禁止过期属性结果；修复后恢复。
7. 迁移后的属性以新资产为主对象，独立编辑后重新计算；Mosaic 不再拥有对应结／图属性入口。
8. 图布局、结显示、曲线视图与适用时的除子功能分别完成实际可见性检查；
   旧 Mosaic 表面展示仍可使用，且没有误加为 Knot / Link 的 Property。
9. 两种模式和最后有效结果可保存恢复；旧面板迁移正确、幂等、无重复资产。
10. 修改面板使用真实连续键盘操作验证草稿、光标、空值和 IME；来源更新不覆盖正在编辑的草稿。

执行相关现有测试：

- `node js/calculator_input_drafts_test.js`
- `node js/calculator_input_drafts_ui_test.js`
- `node js/math_workspace_mosaic_test.js`
- `node js/math_workspace_mosaic_ui_test.js`
- `node js/math_workspace_mosaic_ownership_ui_test.js`
- 工作区对象、资产、创建入口、Properties 目录、依赖诊断、面板复用与备份相关测试。
- 受影响的 Mosaic／结／图计算测试，以及新增 Knot／Dual Graph 专项测试。
- `node js/build_math_workspace_native_editors.mjs`
- `node js/build_math_workspace_native_editors.mjs --check`

## 9. 本次范围之外

曲面上的结、结分类算法扩充、任意图到 Mosaic 的逆构造、双向同步、
大型预设库、完整新绘图工具和全站历史翻译审计不属于本次目标。
从独立结图重新实现 Seifert surface 构造、创建表面资产和计算 knot genus 也不属于本轮。
第一版必须有可用的独立定义编辑与对象显示，但不以完成全新的鼠标绘图编辑器为前提。

## 10. 实现与验证记录

### 已实现的入口

- New… → Knot / Link、Dual Graph；创建时不附带新 Mosaic。
- Mosaic Diagram 的 Modify 中新增 Generate Knot / Link、Generate Dual Graph。
  同一来源已有对应关联资产时复用它。
- 新资产 Modify 的 Source 可选择 Independent 或某个 Mosaic Diagram；
  Make independent 复制当前结果。来源失效时明确提供使用最后有效结果的操作。
- 独立定义通过 JSON 编辑器提交：Knot 使用 `pd` 和 `circles`；
  Dual Graph 使用 `genera`、`legs`、`edges`、`decorations`。
  Apply definition 是提交边界；未完成或错误的输入不会覆盖数学定义。
- Knot 的 Open 绘制平面结图，Properties 提供识别信息与 PD / DT / Braid。
- Dual Graph 的 Open 复用原图布局、RS 和代数曲线展示，
  Properties 提供不变量与 Boundary Divisors。
- `mosaic-seifert` 改为 Mosaic 的展示入口，继续使用原来的表面算法与 Diagram 绑定。

### 实际数据与边界

`js/math_workspace_topology.js` 提供独立模型、PD 平面性校验、纯 Mosaic 转换、
来源解析、最后有效结果同步和旧面板迁移；不依靠隐藏 Mosaic 编辑器维护权威数据。
`js/math_workspace_topology_ui.js` 提供编辑器、独立结图绘制与信息展示。
关联定义的 `source` 是稳定资产引用，`hasSnapshot` 标记是否有有效结果可供脱离来源。
独立定义不包含 Mosaic 背景字段或源引用。

当前结图展示采用保留 PD 循环顺序的分段线性布局；编辑入口是编码编辑器，
没有新增鼠标绘制工具。识别能力沿用现有引擎和表库；超过其能力时保留编码，显示未识别。
图展示仍使用已有 RS／代数曲线可视化，不把这些展示作为新增数学曲面资产。

### 验证结果

新增 `math_workspace_topology_test.js` 与 `math_workspace_topology_ui_test.js` 均通过。
专项覆盖平面性、无交叉分支、图权重和标记、周期／粘边／切边／六边形连接、
独立与关联切换、连续键盘草稿、来源失效恢复、实际图形、RS／代数曲线入口、
边界除子、生成结果复用、旧备份迁移及缺失来源的备份恢复。
浏览器中核对了独立结图和对偶图画面；原生图转换结果与新转换器进行了对比。

相关 Mosaic 模型和浏览器测试、对象和资产测试、创建目录与依赖选择测试、
属性目录／面板复用测试、依赖诊断、完整备份测试以及共享输入草稿单元／浏览器测试均通过。
原生 bundle 已从源文件重建，`--check` 通过；页面脚本缓存版本与生成 hash 已更新。
构建仍报告原有的重复对象键警告，不影响产物构建与一致性检查。

## 11. Mosaic 预设与图标候选补充（2026-10-29）

现已接入原 `mosaic_calculator.html` 的 Hopf、Solomon、Whitehead、Trefoil、Figure-eight 预设。
`build_math_workspace_topology_presets.mjs` 从原目录转换出独立 PD 数据，
输出 `math_workspace_topology_preset_data.js`；`--check` 验证生成数据未过期。
原来的 unknot、unlink 和简单图示例继续保留。

Dual Graph 预设增加 Random stable curve 和带 g、n 选择的 M_g,n stable graph。
随机预设仅在点击 Load preset 时调用原 Mosaic 生成器，并把结果保存为独立图；
刷新、打开视图或恢复备份不会重新随机生成。M_g,n 检查稳定条件，失败时保留原定义。
这两个预设与独立结预设均不创建 Mosaic 背景资产。

Design Lab 增加 Knot / Dual Graph icons 实验。每类提供当前符号和三种新方案：

- Knot / Link：Trefoil、Over / under crossing、Linked rings。
- Dual Graph：Weighted vertex + loop、Cycle + marked leg、Two vertices, three edges。

候选同时显示大图和小图，可临时预览到 Assets 与 New…；Reset 或退出 Design Lab 恢复当前图标。
Copy settings 可复制具体选择供确认；预览不改数学资产，也不写入工作区备份。
当前 graph／RS／代数曲线的展示组织方式按用户最新意见保留。

新增 `math_workspace_topology_presets_icons_ui_test.js`，验证全部预设、参数失败保留原值、
随机生成成功及稳定性、刷新与备份固定结果、八个图标候选、Assets／New… 预览及退出恢复。
相关模型、图标、创建入口、拓扑 UI 与共享输入草稿回归测试均通过。

## 12. 图标第二轮细化（2026-10-29）

根据用户选择的 `trefoil` 与 `weighted-loop`，Design Lab 当前改为每类展示原方案 Reference
及三种相近修改，不再混排上一轮的其他概念。旧图标标识仍兼容。

- Knot A `trefoil-smooth`：经典比例；B `trefoil-rounded`：更圆的瓣形；
  C `trefoil-open`：更开阔的中心。三者都使用解析切线连续的 cubic Bézier 段，保留三处上下穿越断口。
- Dual Graph A `weighted-loop-label`：实心顶点旁标 g；B `weighted-loop-disc`：空心顶点内标数字；
  C `weighted-loop-cutout`：实心顶点镂空 g。保留回环和两条腿的基本轮廓。

继续支持大／小尺寸比较、Assets 和 New… 临时预览与 Copy settings；退出恢复原图标。
两组画面已实际检查，图标单元测试、Design Lab 浏览器回归与创建入口浏览器回归通过。

用户最终选择 `trefoil-rounded` 与 `weighted-loop-label`，并要求移除后者的外置 g。
二者现已作为默认资产图标；图标保留原有标识兼容复制的设置，图形仅包含顶点、回环和两条腿。
Design Lab 退出／重置恢复这组已确认的默认图标，相关图标和浏览器回归通过。

## 13. Knot 展示平滑实验（2026-10-29）

Dual Graph 预设精简为 `M_g,n stable graph` 和 `Random stable curve` 两个通用生成器。

Design Lab 新增 `Knot smoothing · 曲线平滑`，保留原折线，并提供三种可比较的实现：
二次 Bézier 小圆角、三次 Bézier 宽圆角、相切圆弧倒角。可切换已有 Knot／Link 预设作为样例。
选择即时更新已打开及随后打开的 Knot 展示面板；Reset／退出恢复进入实验前的方案。
默认仍是原折线，等待用户选择；Copy settings 输出 `knotDrawing.smoothing`。

绘制代码提取至 `math_workspace_knot_drawing.js`，继续使用 PD 的平面布局。
平滑方案将交点中心移到端口对角线的交点，使交点两支各自共线；保持上下穿约定。
局部转角范围同时受相邻边长及非相邻线段距离约束，在不相交的局部范围内替换折线。
所有方案不修改 PD、来源关系或数学资产；独立圆环仍用椭圆绘制。

`math_workspace_knot_smoothing_ui_test.js` 对全部七个预设的三种 SVG 曲线采样，
检查实际几何交点数、分量数和上穿标记，另验证真实展示面板切换、复制设置、重置、退出及备份恢复。
原有拓扑 UI 和模型回归也通过。四种方案的对比画面已检查。

## 14. Cubic 默认与交点缺口修复（2026-10-29）

用户选择 `cubic` 作为默认。原交点绘制用粗背景色圆帽线遮挡，再覆盖较细的上穿线，
两端较宽的背景色圆帽会擦掉上穿线的衔接，造成悬空短线。
现改为在下穿的路径中直接跳过交点附近一段，上穿始终沿完整路径绘制，不再使用背景色补丁。
切开的子路径不使用 `Z` 闭合，避免错误地补出跨越缺口的长弦。

Design Lab 增加 `下穿缺口大小` 滑块，范围 0–24、默认 10，0 表示不留缺口；
拥挤交点按可用直线段长度自动收小。对比图和展示面板实时更新，复制设置包含 `gapSize`，
Reset／退出同时恢复曲线样式和缺口大小。

回归通过实际 SVG 栅格化，检查全部含交点预设的上穿线在两侧连续，
另检查缺口键盘调节、比较图联动、数学数据不变和恢复行为。拓扑 UI 与模型回归通过。

## 15. 交点编辑、Mosaic 同步与简化（2026-10-29）

用户最终默认值为 `cubic`、`gapSize: 24`。Knot 展示支持直接点击交点交换上下穿，
并支持交点聚焦后的 Enter／空格。提供撤销、同步修改 Mosaic 勾选和尝试简化。
Design Lab 新增 `Knot crossing hover · 交点悬停`，只比较细圆环、柔和光晕、四向短标记；
包含完整图与局部放大，可复制选择，退出恢复悬停样式。

`math_workspace_knot_operations.js` 提供无副作用的交换、R1／R2 消去和同步计划。
从编码器追溯 tile 与交点；对单次或多次交换寻找能表达目标上下关系的 tile 线段排序，
重新编码后检查所有交点、分量数以及沿分量经过交点的循环顺序，成功才提交一次 Mosaic 更新。
所有跟随该来源的资产一起刷新。无法表达单个交点交换时，不影响其他交点或先写入半成品。

无法同步时显示居中确认框：转为独立并应用／仅临时预览／取消此次修改。
只有确认独立后才解除关联、取消同步勾选；取消或预览保留原数据和勾选状态。
预览在内存保存，不进入资产或备份，提供应用、放弃和逐步撤销。
多步预览若整体可准确表达，仍可同步保存；简化改变对应关系时询问是否独立。
来源在预览或确认期间改变时，旧结果不能覆盖新数据；过期预览保留供检查。

简化仅消去 PD 平面图中的空单边面（R1）和满足上下穿条件的空双边面（R2），
保持分量数，必要时记录无交点圆环。先显示前后交点数与结果图，由用户应用或放弃；
界面说明该局部方法不保证全局最简。三叶结换一次交叉可消为圆环，Hopf 换一次可消为双圆。

模型测试覆盖全部 Mosaic 预设的交点同步、多交点 tile 的限制、组合修改和无副作用计划。
浏览器测试覆盖真实鼠标／键盘交换、多个跟随者、取消／预览／独立、撤销、
过期来源保护、简化与备份、悬停候选复制和退出恢复；原有拓扑、对象和曲线连续性测试通过。
已实际检查确认框、预览界面及三种悬停高亮的截图。

## 16. Halo 默认与正式界面语言（2026-10-29）

用户选择 `halo`，但要求圆的大小与 `ring` 一致：两者半径统一为 12，保留 halo 的柔和填充。
退出 Design Lab 恢复该默认方案。正式网页使用英文，Design Lab 内允许中文；
因此交点编辑按钮、确认框、预览、状态／错误、PD 标题、悬停提示和无障碍标签均改为英文。
同步计划返回的失败原因也统一为英文；实验候选的中文名称只在 Design Lab 使用。
浏览器回归验证默认值、两种圆的相同尺寸，以及正式编辑／预览／失效状态和确认框的语言。
