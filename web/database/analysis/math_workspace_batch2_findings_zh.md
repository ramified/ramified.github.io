# Math Workspace 第二批核实结果

日期：2026-10-30。对象：当前工作区版本。此次只核实、记录；未修改生产功能。

复现脚本：`node analysis/math_workspace_batch2_audit.cjs`。证据：`math_workspace_batch2_audit_results.json`。脚本在临时本地服务器和隔离浏览器运行，测试资产不进入用户的正常浏览器。脚本成功退出表示证据采集成功，并不表示被审计功能通过测试。

## 清单

| 编号 | 项目 | 分类 | 优先级 | 核实结果 |
| --- | --- | --- | --- | --- |
| GEO-001 | 几何条件确认 | 已复现保存阻塞 | P1 | 理想层、法丛、余法丛、相对切丛、相对余切丛，五项均要求确认几何假设；普通 Input 无确认控件，提交后仍保留旧的 abstract 定义。 |
| DIV-001 | 除子线丛 O_X(D) | 编辑功能缺口 | P2 | 只有名称、类型、底空间，没有除子基／系数编辑器。已有非零系数能保存和投影，并非系数全部丢失。 |
| EXT-001 | 微分形式与外幂 | 专用构造与计算识别缺口 | P2 | Tangent/Cotangent 没有阶数开关。Schur 分拆 (1,1) 能表达二阶外幂并计算特征类，但普通路径未提供旧版外幂标记，上同调面板无法识别。 |
| TENSOR-001 | 高级张量积 | 已复现修改与计算不一致；同时缺少高级控件 | P1 | 修改普通表单 First sheaf 后，`first` 已变而 `parents[0]` 未变；引擎继续计算旧因子列表。普通表单也没有因子数量、完整因子列表及指数控件。 |
| OPS-001 | Hom、拉回／推出 | 运算选项缺口，部分功能正常 | P2 | 拉回／推出方向选择存在。普通／导出选项和 proper 条件没有对应控件；引擎仍支持这些参数。 |
| NAME-001 | 其他对象重复命名 | 已复现公式渲染错误 | P2 | ppav 模空间、末因子带下标的乘积仍生成双下标。所测 Grassmannian、射影空间、曲线对称积重复命名无 MathJax 错误。 |

## GEO-001：要求确认但没有确认入口

复现：创建普通层 → 在 Assets → Modify 切换到上述几何构造类型 → 选择已有映射 → Save now。

- 场景使用维数 2 到维数 3 的映射作为嵌入候选，以及维数 3 到维数 2 的映射作为相对构造候选。这里只审计声明假设的输入能力，不证明映射确实满足几何假设。
- 五种表单均无 checkbox，也无其他条件确认字段。
- 统一错误：`Confirm the geometric hypotheses in Input before using this construction.`
- 原资产类型仍为 `abstract`，草稿类型是选择的几何构造，构造无法提交。
- 根因位置：`js/math_workspace_sheaf_model.js` 的 `issues()` 要求 `confirmed === true`；`js/math_workspace.js` 的层表单不生成该字段。

## DIV-001：能保留已有数据，缺少编辑器

- 测试先提供 `divisorCoefficients: { hyperplane: '2' }`，等价于审计已有或导入的非零除子定义，不声称普通 UI 能创建该系数。
- 普通表单只显示 Name、Type、Base variety、Save now、Delete。
- 通过真实键盘改名、保存、重新打开，系数仍为 2；技术投影也保留 `{ hyperplane: '2' }`，层秩为 1。
- 因此这是编辑功能缺口，未在此例中复现数据丢失。

## EXT-001：普通 Schur 路径不完全替代旧版外幂

- 在三维射影空间 P 上建立余切层，再使用普通 Schur 类型、Partition = `1,1`。
- Characteristic Classes 返回 `ch(W) = 3 - 8H + 10H² - 22[p]/3`，常数项给出正确的秩 3。
- 同一对象的 Sheaf Cohomology 面板却提示：`Cohomology of abstract sheaf is not determined by the current input.`
- 对照：用旧版构造器实际生成的字段格式（`differentialWedge: true`, `differentialType: 'cotangent'`, `wedgeDegree: 2`）提供兼容性测试对象，面板返回 `(0, 0, ℂ, 0)`，即 H² 为一维、其余为零。
- 后一项是明确标注的历史数据兼容性探针；普通 Input 不暴露这些标记。
- 原版 `sheaf_complex_calculator.html` 有 exterior-power 开关和阶数控件；对应构造器会写入上述专用信息。

## TENSOR-001：界面改了，因子列表没改

复现数据：同一底空间上 E、F、G 的秩分别为 2、3、4。已有三因子张量积使用 `parents = [E,F,G]`、指数 `[1,1,1]`，结果秩 24。

1. 从普通 Input 打开该已有对象，界面只显示 First sheaf = E、Second sheaf = F。
2. 用引用选择器将 First sheaf 改为 G，提交。
3. 界面显示 First sheaf = G；已保存 `first` 也指向 G。
4. 但保存的 `parents` 仍为 `[E,F,G]`，引擎构造和结果秩仍为 24。按界面所表达的替换，G⊗F⊗G 应为秩 48。

根因：普通编辑器读写 `first/second`；原生构造适配器优先读取 `data.parents || [data.first,data.second]`，两套字段没有同步。

正常对照：提供三因子、指数 `[2,1,1]`、ordinary tensor 参数的对象，后端能算出秩 48，说明高级计算能力仍在。缺失的是一致的编辑入口和状态维护。

## OPS-001：基本方向正常，高级语义不可选

- 普通 Input 存在 Pullback / Pushforward 的 Operation 下拉框；不能将整个拉回／推出功能判为删除。
- 没有 ordinary functor、ordinary Hom、ordinary tensor 和 proper 选择控件。
- 引擎对照：默认 Hom 构造为 derived；提供 `exact: true` 时是 ordinary Hom。
- 推出提供 `proper: true` 与 `proper: false` 可分别构造 `Ri_*T` 和 `Ri_!T`，普通表单无法设置这项区别。
- 本轮没有穷尽这些对象的上同调结果；已确认参数与编辑入口差异，未据此断言所有默认计算错误。

## NAME-001：局部修复未覆盖其他对象

已复现：

- 第二个 genus 2 ppav 模空间：`\mathcal{A}_{2}_{2}`，MathJax 报 Double subscripts。
- 末因子名为 `Y_{1}` 的第二个乘积：`Q\times Y_{1}_{2}`，同样报 Double subscripts。

正常对照：本次的 Gr(2,4)、P⁴、Sym³(C) 的重复名称没有 MathJax 错误。不能把所有数学对象重复命名都归为已损坏。

## 是否只是入口迁移

在未通过测试 API 打开技术面板之前检查了普通面板目录和 Sheaf complexes 的 Add panel：旧 `sheaf-input` 不在公共目录，原 `input-card` 也没有作为该视图的可选卡片提供。不能用测试 API 可以直接打开旧面板来证明用户有正常替代入口。

审计中对引擎能力的查询明确使用技术面板；UI 字段、保存阻塞、引用修改、属性结果及 MathJax 错误另有独立证据。

建议修复顺序：TENSOR-001（静默产生旧结果）→ GEO-001（无法完成创建）→ NAME-001（公式显示错误）→ DIV-001 / EXT-001 / OPS-001（补齐专用编辑及构造信息）。
