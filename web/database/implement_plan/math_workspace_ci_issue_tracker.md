# Math Workspace 输入与构造修复台账

初始范围为 `math_workspace.html` 的 Assets → Input 完全交输入；后续按用户要求扩展到图标、保存、层构造和运算选项。以下按批次保留修复前证据和验收结果。

交互约定：Dimension 是簇的维数 d；Equations 是方程数量 c；Degrees 是 c 个正整数；环境维数 N = d + c，只读。列表、方程数量和逐项次数控件双向联动。无效或未完成的草稿不发布到资产，不覆盖焦点、选区或 IME 输入。

| 编号 | 问题及证据 | 状态 | 验收 |
| --- | --- | --- | --- |
| CI-001 | 初始未绑定的新建表单：维数 3、次数 2,3，保存为维数 1、环境维数 3。浏览器操作及 JSON 导出均已复现。 | 已修复并验证 | 初始新建、目录创建、编辑均保持 d，按次数长度推导 N；重开、导出、备份恢复一致。 |
| CI-002 | 上述路径保存后，只读环境维数控件为空，资产仍有环境维数。 | 已修复并验证 | 新建、编辑、保存和恢复后，控件值与有效定义一致；不完整草稿不写入资产。 |
| CI-003 | 新版普通表单缺少旧版的方程数量、逐项次数滑块。 | 已补齐并验证 | 0–8 个方程、次数 1–99；数量、逐项次数和文本联动；空列表等价于 P^d；真实键盘输入、选区、IME、焦点不被联动破坏。 |

## 修复前基线

- 新增 `node js/math_workspace_complete_intersection_ui_test.js`：通过只读测试服务器将 `math_workspace.js` 替换为 `git show HEAD:./js/math_workspace.js` 的内容；未修改原版文件。初始回归断言失败，实际为 `['1','3','2, 3']`，预期为 `['3','5','2, 3']`。同一用例在修复版通过。
- 沙箱内的浏览器测试首次启动失败（DevTools port 超时）；获准在隔离浏览器中执行后，得到上述基线和后续验证结果。启动失败不算产品测试失败。
- 旧 autosave 单元回归原版和修复版均在第 55 行失败：`'A' !== 'A3'`。当时登记为 BASE-001；现已定位为测试依赖和冲突断言过时并修复，详见下节。

## 验证与变更

2026-10-30，本批验证：

- **通过** `node js/math_workspace_complete_intersection_ui_test.js`：真实按键输入、初始新建、目录创建、已有对象编辑、空次数、0 维、15 维与 8 个方程（环境维数 23）、次数 99、越界及未完成草稿、选区替换、IME、滑块焦点与 DOM 身份、重开、对象 JSON、跨页面备份恢复、390px 视口。无效初始 Add 不分配占位资产。
- **通过** `node js/math_workspace_variety_subtype_ui_test.js`。
- **通过** `node js/calculator_input_drafts_test.js`。
- **通过** `node js/calculator_input_drafts_ui_test.js`：43 个 editable-field probes，覆盖 14 个界面及 native shadow DOM。
- **通过** `node js/math_workspace_sheaf_model_test.js`。
- **通过** `node js/math_workspace_io_ui_test.js`。
- **通过** `node js/build_math_workspace_native_editors.mjs` 及 `--check`；重建的原生 JS 仅发生依赖路径注释变化，相关哈希和页面缓存查询同步更新，没有修改原生计算引擎逻辑。
- **通过** `node --check js/math_workspace.js` 与 `git diff --check`。

变更限于工作区完全交表单：未绑定的新建表单也计算环境维数；保存前检查维数和次数；界面保留被拒绝的原始维数草稿；滑块在原节点上同步；文本草稿使用现有 CalculatorInputSettings 契约。旧计算器源码、共享输入库及数学模型均未修改。

## 用户反馈跟进：控件顺序与 Assets 图标

- CI-003 补充：按用户反馈调整为 Equations → Degrees → 各方程 Degree 滑块。已在完全交 UI 回归中加入 DOM 顺序断言。
- **ICON-001（已修复并验证）**：Assets 中 `X_{2,2,2}` 的宽公式撑大图标内部隐式网格轨道；缩放只改变绘制尺寸，未改变轨道宽度，导致中心偏右约 27.73px。固定内部网格轨道为 `minmax(0, 1fr)` 后，同一用例连续 8 次适配的中心偏移均为 0。测试没有观察到静置时坐标随时间累积增加；已修复实际复现的居中错误。
- 新增 `node js/math_workspace_ci_icon_position_ui_test.js`：修复前中心断言失败；修复后通过重复适配、3/8 个方程、五种 Assets 布局、隐藏标签页更新及 390/900/1440px 视口。并发测试首次遇到 MathJax 就绪超时，单独重跑通过；未放宽断言或超时。
- `node js/math_workspace_icon_visibility_ui_test.js`、`node js/math_workspace_asset_icons_test.js`、`node js/math_workspace_complete_intersection_ui_test.js`、`node js/calculator_input_drafts_test.js`、`node js/calculator_input_drafts_ui_test.js` 均通过。
- 本次只修改表单排列和工作区 CSS；页面 CSS/脚本缓存版本同步提升到 `20261030-complete-intersection-2`。

## BASE-001：自动保存测试（已解决）

原因：旧 VM 测试夹具未加载真实的 `MathWorkspaceSheafModel` 和 `MathWorkspacePresentation`。缺少模型时，维数校验捕获异常并返回未知维数，正常草稿被判为 `The variety parameters must define a valid dimension.`，所以名称没有保存。补齐依赖后，还暴露出旧冲突用例的过时假设：只增加全局 revision 就应冲突；当前契约实际按同一资产的定义变化判断冲突。

修复内容：

- 单元测试加载真实的模型和 presentation 模块，不模拟放行校验；增加夹具有效性前置断言。
- 保留延迟、最大等待、草稿隔离、切换保存、过期回调、删除清理等原有断言。
- 明确分别断言：其他资产修改不冲突；目标资产被并发修改会冲突；冲突时不覆盖外部修改；Load saved version / Save my version 均正确解决冲突。
- 新增 `math_workspace_autosave_ui_test.js`：真实键盘输入，在不提交、不失去焦点的情况下等待页面计时器自动保存；检查控件身份、选区、无效草稿恢复、逐对象草稿、独立资产更新和真实冲突。对象切换使用真实 Tab 的焦点事件及 Modify 请求，两个冲突按钮使用真实鼠标点击，包含浏览器的 blur/change 行为。

验证：

- **通过** `node js/math_workspace_autosave_regression_test.js`。
- **通过** 将测试读取的 `math_workspace.js` 替换为 `git show HEAD:./js/math_workspace.js` 原版内容后运行同一修正测试，确认无需修改生产自动保存逻辑。
- **通过** `node js/math_workspace_autosave_ui_test.js`。
- **通过** 测试文件语法检查与 `git diff --check`。

本次仅修改测试和台账，未增加生产逻辑修改。BASE-001 已关闭；不代表自动保存的所有可能场景都经过穷尽验证。

## CI-004：完全交重复自动命名（已修复并验证）

修复前新增浏览器回归失败：第二、第三个同次数对象分别得到 `X_{2,3}_{2}`、`X_{2,3}_{3}`。现在对整个名称加括号后编号：`(X_{2,3})_{2}`、`(X_{2,3})_{3}`；空次数的完全交使用同一规则，例如 `(\mathbb{P}^{3})_{2}`。

- 已有合法自动编号保持稳定，即使更早编号空缺；次数改变后生成唯一名称；用户自定义名称保持所有权，不自动改写。
- 对明确标记为自动名称的旧双下标修复时优先保留原编号；不猜测没有 autoName 标记的用户名称。
- 旧备份恢复时同步修复资产和未修改的自动 Input 名称，保留尚未保存的自定义草稿。
- 图标仅为完全交增加对“括号内为原有安全单字母记号、外接正整数下标”的识别，避免修复后的名称退回通用图标。任意表达式和不支持命令仍使用原有回退规则。
- 页面脚本缓存更新：`math_workspace.js` → `20261030-complete-intersection-3`，`math_workspace_asset_icons.js` → `20261030-ci-copy-names-1`。

验证通过：

- `node js/math_workspace_ci_naming_ui_test.js`：连续创建、初始新建表单的真实按键输入、修改次数、编号空缺、自定义名、旧自动名称、旧备份中的干净／未保存草稿、MathJax 无错误、实际公式图标、重新打开及跨页面备份恢复。
- `node js/math_workspace_asset_icons_test.js`。
- `node js/math_workspace_variety_subtype_ui_test.js`。
- `node js/math_workspace_ci_icon_position_ui_test.js`。
- `node js/math_workspace_io_ui_test.js`。
- `node js/math_workspace_autosave_regression_test.js`。
- `node js/calculator_input_drafts_test.js` 与 `node js/calculator_input_drafts_ui_test.js`。
- JavaScript 语法检查与 `git diff --check`。

## 另行跟踪的构建问题

| 编号 | 状态 | 证据／后续工作 |
| --- | --- | --- |
| BUILD-001 | 已清理并验证 | workspace 的 double-young、mosaic 源码副本各保留一次对应函数登记，三个重复键警告消失；重建与 freshness 检查通过，详见末节。 |

## 第二批六项核实（原始审计及后续状态）

2026-10-30，已运行隔离浏览器证据采集。详细报告：`analysis/math_workspace_batch2_findings_zh.md`；复现脚本：`analysis/math_workspace_batch2_audit.cjs`；原始证据：`analysis/math_workspace_batch2_audit_results.json`。

| 编号 | 状态 | 核实结果 |
| --- | --- | --- |
| GEO-001 | 已修复并验证 | 普通 Input 补齐五种几何假设复选框；保存布尔值；换映射／类型重新确认；旧数据兼容与显式取消确认均通过回归。 |
| DIV-001 | 已补齐并验证 | 从实际底空间读取除子类，编辑整数／分数系数；保留无效草稿，支持旧类修复、实际特征类计算及备份恢复。 |
| EXT-001 | 已修复并验证 | Schur 按分拆和母层直接识别；射影空间切／余切丛的一般分拆用 Bott，其他底空间的外幂用现有 Hodge／多向量信息。外幂快捷控件覆盖 0 到 dim。 |
| TENSOR-001 | 修改／计算不一致已修复并验证 | 前两个选择器同步完整 parents 列表的对应项，保留额外因子、指数及 exact；连续保存不会恢复旧缓存。完整编辑界面的缺口另列 TENSOR-002。 |
| TENSOR-002 | 已补齐并验证 | 普通 Input 支持 0–6 个因子逐行选择、增删和指数编辑，包含符号表达式；零因子选择底空间。原始草稿、实际计算、依赖清理、旧缓存及备份恢复均有回归覆盖。 |
| OPS-001 | 已补齐并验证 | 张量积、Hom、拉回／推出可选择普通／导出模式；推出可设置 proper。此项修复模式／假设入口，不声称旧数值计算已经错误。 |
| PROP-001 | 已修复并验证 | 恢复或调整属性面板后不再把其他对象的自动规范化当作当前修改；越界提交仍被拒绝，详见本批补测。 |
| NAME-001 | 已修复并验证 | 模空间、乘积的副本编号作用于整个表达式；覆盖嵌套乘积、参数／因子改名、旧自动名称与 Input 草稿恢复，以及实际 MathJax 渲染。 |

原始审计没有改动生产功能；TENSOR-001 和 GEO-001 的后续修复如下，其余项目继续保留。

## TENSOR-001 / GEO-001：首批修复（2026-10-31）

修复前先建立 `js/math_workspace_tensor_geometry_ui_test.js`：正常模式在 First sheaf 修改后仍保留旧 parents 的断言失败；`--geometry-only` 模式在理想层缺少确认复选框的断言失败。

- **TENSOR-001**：修改 first／second 时复制 parents 并替换对应位置；完整 parents 作为显示别名的依据。保留第三个及后续因子、所有指数和 exact 设置。无 parents 的普通双因子张量积继续使用原有路径。
- **关联缓存问题**：补测发现，首次提交清掉保存对象的旧构造缓存后，草稿仍带着旧缓存；第二次保存会将其重新写回。现在同步清理草稿的构造元数据，保留原始输入文字和控件，不重建焦点控件。
- **GEO-001**：理想层、法丛、余法丛、相对切丛、相对余切丛各自显示对应假设的确认复选框，以 checked 布尔值保存。选择不同映射或切换几何类型后清除本次草稿确认；重选相同映射或改名保留确认。未经确认的草稿不会覆盖最后有效的对象。
- **旧数据**：没有 confirmed 字段、但有已保存构造的旧几何对象保持兼容并显示勾选。显式取消勾选不能再被旧构造缓存绕过。负余维数等既有几何校验继续生效。
- 已重建 live native bundle，同步归档 bundle／manifest／页面缓存哈希；live bundle 哈希为 `47d706dde65dd721`。主脚本与 sheaf model 缓存版本为 `20261030-sheaf-editing-1`。

验证通过：

- `node js/math_workspace_tensor_geometry_ui_test.js`：实际选择器编辑；秩 24 → 48 → 32；带指数用例 48 → 192；双因子用例；完整保留指数与额外因子；真实旧版 Input 生成的构造缓存；连续保存；五种几何构造的键盘勾选、保存、重开、正确原生映射及相对类型；更换映射／类型；改名；旧数据；跨页面备份恢复。
- `node js/math_workspace_sheaf_model_test.js`：几何确认、旧构造兼容、显式 false 拒绝及维数约束。
- `node js/math_workspace_autosave_regression_test.js`：新增连续自动保存不恢复旧构造缓存的断言。
- `node js/math_workspace_autosave_ui_test.js`。
- `node js/math_workspace_sheaf_input_ui_test.js`。
- `node js/math_workspace_io_ui_test.js`。
- `node js/math_workspace_complete_intersection_ui_test.js`：此前完全交的新建、滑块、原始草稿及备份恢复回归继续通过。
- `node js/calculator_input_drafts_test.js` 与 `node js/calculator_input_drafts_ui_test.js`，后者通过 14 个界面的 43 项真实输入探针及 native shadow DOM 检查。
- `node js/build_math_workspace_native_editors.mjs` 及 `--check`。首次构建遇到 Windows 临时写入错误，重试成功；既有 BUILD-001 警告仍在，未修改相关引擎。

首批修复后仍待处理的 TENSOR-002 已按用户后续要求补齐，见下。DIV-001、EXT-001、OPS-001、NAME-001 继续保留；原始审计证据文件保留，不用修复后的结果覆盖历史复现记录。

## TENSOR-002：完整因子与指数编辑（2026-10-31）

新增 `js/math_workspace_tensor_editor_ui_test.js`，修复前在“显示全部三个因子”的首个断言失败：实际 0 行，预期 3 行。

- 每个因子独立显示层选择器、指数文本框和 Remove factor 按钮；Add factor 添加新行，达到原引擎的 6 因子上限后禁用。删除任意行时同时删除其指数，其余行保持对应关系。
- 支持 0 和 1 个因子；空积为所选底空间上的结构层，并显示可编辑的底空间选择器。新行尚未选层时只保留为草稿，不覆盖最后有效对象。
- 所有因子参与引用校验、同底空间检查、依赖计算和备份引用验证。删除的层不再残留为隐藏依赖；零因子只依赖底空间。旧 first／second 数据仍可读取，并与完整列表保持同步。
- 指数使用原生引擎的表达式解析器严格校验，支持整数、符号表达式和既有形式幂语义。复用解析器但保留输入表达式，不在保存模型时展开符号。空白、未完成前缀和零分母等错误不再被默认为 1；继续使用最后有效模型。
- 通过 CalculatorInputSettings 的草稿／选区／IME 契约接入新文本框。按键输入不重建控件；保留末尾空格、光标和未完成表达式。旧版已展开的长指数也可继续编辑，没有新增长度截断。
- 普通空白 Create 表单支持添加及选择因子；从张量积切换到直和等其他构造时清掉旧列表和指数，防止额外因子隐藏参与新运算。
- 已检查 390px 视口下的行布局。截图由测试写入临时目录 `math-workspace-tensor-editor.png`。
- 重建 native bundle 并通过 `--check`；当前哈希 `c5c246ee704382aa`。主脚本、Objects、Sheaf model 和 CSS 的缓存查询更新为 `20261031-tensor-editor-1`。BUILD-001 的既有重复键警告未扩大处理。

验证通过：

- `node js/math_workspace_tensor_editor_ui_test.js`：0–6 因子、第三个及后续引用、逐项指数与删除配对、实际秩结果、混合底空间拒绝、依赖清理、连续按键／焦点／光标／IME／空格、无效表达式、旧长指数、重复保存缓存、未完成草稿跨页面恢复、空白新建、类型切换、窄屏。
- `node js/math_workspace_tensor_geometry_ui_test.js`：此前 TENSOR-001、GEO-001 继续通过。
- `node js/math_workspace_sheaf_model_test.js`：补充旧二元格式、零／单因子、默认指数、上限、无效指数、全部因子的底空间检查。
- `node js/math_workspace_sheaf_input_ui_test.js` 与 `node js/math_workspace_io_ui_test.js`。
- `node js/math_workspace_autosave_regression_test.js` 与 `node js/math_workspace_autosave_ui_test.js`。
- `node js/calculator_input_drafts_test.js` 与 `node js/calculator_input_drafts_ui_test.js`，后者通过 14 个界面的 43 项探针及 native shadow DOM。
- `node js/math_workspace_creation_test.js`、`node js/math_workspace_diagnostics_test.js`、JavaScript 语法检查、`git diff --check` 和构建 freshness 检查。

本批完成时仍待处理的 DIV-001、EXT-001、OPS-001 已按用户后续要求完成，见下；NAME-001 继续保留。

## EXT-001 / DIV-001 / OPS-001：Schur 识别及层选项（2026-10-31）

按用户补充要求，Schur 分拆的识别是主体，外幂快捷入口是其特例，不依赖用户提供 `differentialWedge` 标记才能识别普通 Schur 对象。

修复前 `math_workspace_sheaf_options_ui_test.js --schur-only` 返回的上同调维数为 null，预期 `[0,0,1,0]`；`--divisor-only` 的系数控件数量为 0，预期为 2。初次 Schur 探针使用了未公开的函数，修正为真实属性面板结果后记录上述失败。

- **结构性 Schur 识别**：射影空间上直接的切丛／余切丛及一般合法分拆使用 Bott 算法和 Weyl 维数公式；线性完全交按其射影空间同构处理。以分拆和母层决定计算，保留旧标记兼容，但不依赖它。
- **其他底空间**：余切丛的列分拆识别为微分形式，使用 Hodge 行；切丛的列分拆使用多向量数据／最高外幂线丛；已知线丛使用相应恒等关系。一般完全交上的其他 Schur 分拆如果现有信息不足，明确返回无法确定，不伪造零结果。此项不等于实现任意底空间、任意母丛的所有 Schur 上同调。
- **算法依据**：[Macaulay2 的 Bott 算法说明](https://www.macaulay2.com/doc/OLD/Macaulay2-1.20/share/doc/Macaulay2/BoijSoederberg/html/_bott_lp__List_cm__Z__Z_rp.html)。权重采用 `Omega^1=Q^*(-1)` 与 `T=Q(1)`；重复移位权重给出消失，其余按置换次数和 Weyl 公式给出维数。
- **高阶外幂**：外幂列支持到 15，不把 13 阶列误当作非法一般分拆。补测暴露原秩路径的大行列式展开耗时；改为 Newton 外幂特征递推和二项式秩，核对 `wedge^13 Omega_P14` 的一阶特征系数为 `-195H`。旧的卡住用例仅停止其隔离测试进程；改进后的完整回归成功退出。
- **外幂快捷控件**：普通 Tangent／Cotangent 提供 Exterior power 与 Exterior degree。0 阶、1 阶、最高阶和中间阶复用已有构造；保存来源类型和阶数，允许取消、重新选择底空间及备份恢复。超出新底空间范围的旧阶数保留为待修复选择，不默默改成另一个阶数。
- **除子编辑**：复用原生引擎的底空间除子类定义，含乘积的多基。系数严格接受整数或分数，约分并排除零；空白、未完成前缀、零分母只留在草稿。更换底空间后不丢弃旧类，显示未映射行，用户置 0 后才能完成提交。包括类型新建、聚焦、选区、IME 和恢复路径。
- **运算选项**：张量积、内部 Hom、拉回／推出提供 Derived / Ordinary；Ordinary 标明正合性假设。推出提供 proper 开关，沿用既有 `f_* / f_!` 参数约定。旧缓存中的 exact／derived／proper 在原字段缺失时用于显示默认值，明确输入的字段优先。没有新增 Tor／Ext 通用求解器，也没有声称这些模式在所有当前数值路径上有不同公式。
- **边界**：除子编辑保证系数及特征类的正确传递；不声称仅凭除子类数值即可确定一般除子线丛的全部上同调。
- 主脚本、Objects、Sheaf model 缓存查询更新为 `20261031-sheaf-options-1`；native bundle 已重建，哈希 `dd4167994090aacc`。既有 BUILD-001 警告继续保留。

验证：

- `math_workspace_sheaf_options_ui_test.js`：普通 Schur `(1,1)` 的维数 `[0,0,1,0]` 及特征系数 `-8,10,-22/3`；`S_(2) T_P2` 的 27 个截面、`S_(2,1) T_P2` 的 35 个截面、`S_(2,2) Omega_P2=O(-6)` 的 H² 维数 10；超秩列为零；K3 的外幂及信息不足情形；13 阶列；外幂快捷边界；乘积除子系数 2、3 和实际交叉项 6；真实连续输入／IME／无效草稿；模式布尔值和 proper；新建及跨页面恢复后的重新计算。
- `math_workspace_sheaf_model_test.js`：Bott 的所有小维列分拆、独立已知线丛／Euler 序列例子、消失与超秩、分数约分、未知类和无效系数。
- `math_workspace_autosave_regression_test.js`：旧缓存 ordinary／proper 默认值及明确字段优先；既有保存／冲突／缓存失效回归。
- 已通过 `math_workspace_sheaf_input_ui_test.js`、`math_workspace_io_ui_test.js`、`math_workspace_tensor_geometry_ui_test.js`、`math_workspace_creation_test.js`、`math_workspace_diagnostics_test.js`。
- 已通过 `calculator_input_drafts_test.js` 和 `calculator_input_drafts_ui_test.js`，含 43 项真实输入探针与 native shadow DOM。

相关补测发现并修复 **PROP-001**：恢复／调整属性 Inspector 时，原生投影中为其他对象自动规范化的数据会被误计为当前卡片的属性修改，触发 `Asset property command owner is outside the source dependency graph.`。新增浏览器断言在修复前失败；现在仅在原生属性命令生成阶段保留当前 source 及其依赖的修改，不缩小计算可用的投影对象，也不放宽提交端的所有权校验。恢复和窄屏调整后无此误报；测试中手工构造的越界命令仍被拒绝且不修改任何对象。

`math_workspace_assets_test.js` 原先的夹具遗漏类型／定义字段及真实 Sheaf model，使所有权断言前即报错。已补齐夹具，并将两个依赖旧生成格式／固定日期的静态断言改为检查源构建规则及缓存格式。未删减原子提交、拒绝越界／失效命令等行为断言；该完整单测现已通过。

最终 bundle 补测：新 `sheaf_options_ui_test`、既有 `sheaf_input_ui_test`、`io_ui_test`、Assets 原子提交单测及 build `--check` 均通过。三浏览器并发启动时，两个旧用例曾超过 20 秒页面就绪限制；逐个复跑均通过，没有放宽等待时间或断言。

本批完成时剩余 NAME-001 和 BUILD-001，已按用户后续要求处理，见下。

## NAME-001 / BUILD-001：名称分组与重复键清理（2026-10-31）

新增 `js/math_workspace_variety_naming_ui_test.js`，修复前首个断言失败：实际为 `\mathcal{A}_{2}_{2}`、`\mathcal{A}_{2}_{3}`，预期为 `(\mathcal{A}_{2})_{2}`、`(\mathcal{A}_{2})_{3}`。保留原始第二批审计，不覆盖历史证据。

- **名称分组**：完全交、ppav 模空间、乘积采用统一的副本编号分组规则。原始对象保持原名，副本把序号放到整个表达式外；嵌套乘积同样处理。其他类型的命名规则未扩展修改。
- **编辑及恢复**：参数或乘积因子名称变化时更新自动名称；编号空缺不重排已有副本；手写名称保持归属。旧备份中带明确 autoName 标记的双下标自动名称可修复，干净 Input 草稿同步修复，未保存的手写草稿保持原样。
- **重复登记**：只在 workspace 使用的 `sources/js/double_young_diagram.js` 中去掉第二次 `decomposePlethysm` 登记，在 `sources/js/mosaic_calculator.js` 中去掉第二次 `normalizeBackgroundMetric`、`setTestGeometry` 登记。函数定义和算法未改变；遵循源码副本隔离规则，变更记录于 `js/math_workspace/DIVERGENCE.md`。
- **构建与缓存**：重建 native bundle，版本哈希为 `cd265011f055f4a7`，主控制器缓存更新为 `20261031-name-copy-1`。构建和 `--check` 均未再报告这三条重复键警告。

验证通过：

- `node js/math_workspace_variety_naming_ui_test.js`：三份模空间与乘积、嵌套乘积、真实输入、参数修改、新建预览、编号空缺、因子改名、手写名称、备份跨页面恢复、旧自动名称及干净／未保存草稿、实际 MathJax 渲染。界面截图 `math-workspace-variety-naming.png`。
- `node js/math_workspace_ci_naming_ui_test.js`：原有完全交命名、旧名称修复及草稿保护回归。
- `node js/calculator_input_drafts_test.js`、`node js/calculator_input_drafts_ui_test.js`：43 项真实输入探针及 native shadow DOM。
- `mosaic_calculator_test.js` 以 Node 模块解析定向至修改后的 workspace 源码副本执行，导出及相关断言全部通过（报告 37 项导出测试）；未仅对未改动的经典源码运行测试。
- `node js/math_workspace_mosaic_ui_test.js`：共享空间、独立图、原生输入／属性、失效处理及备份恢复。
- `node js/math_workspace_assets_test.js`、JavaScript 语法检查、`git diff --check`、bundle 构建及 `--check`。

本台账中目前没有剩余的已确认未修复项。一般 Schur／除子线丛上同调的信息不足仍属于计算能力边界，见上一批说明。
