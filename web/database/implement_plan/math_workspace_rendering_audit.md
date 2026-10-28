# 工作区数学排版集成检查

日期：2026-10-28。检查对象：当前 `math_workspace.html` 的 12 个原生计算器工厂、主显示区、侧栏、移出的独立卡片，以及代表性的真实属性输出。

## 根因与修复

原生计算器运行在 Shadow DOM 中。页面实际使用 MathJax CHTML，旧运行时只复制了 `MJX-SVG-styles`，导致 CHTML 的字形、空白和矩阵布局规则无法进入嵌入面板。

进一步检查发现，复制 CHTML `<style>.textContent` 仍不完整。MathJax 会通过 `CSSStyleSheet.insertRule()` 动态添加字形和矩阵规则。一次 A4 Parabolic 检查中，页面样式表有 253 条规则，而只复制文本的副本只有 77 条。

修复位于共享 `editors/runtime.mjs`：

- 支持 CHTML 和 SVG 两类样式。
- 从 CSSOM 序列化全部规则。
- 排版前同步已有规则，排版后同步新字形规则。
- 更新已有样式副本，避免后续计算出现新字形时缺字。
- 覆盖主显示区、侧栏和独立卡片。

没有通过单独增大矩阵 padding 或插入人工空格掩盖问题。

## 12 个引擎的实际检查

下面数字是回归测试固定初始状态下的 CHTML 字形／矩阵单元格数量，不代表每种计算器所有输入下的数量。测试还在隔离浏览器中移除影子根内的公式样式，复现缺字和矩阵退化，再检查同步恢复。

| 引擎 | 初始字形 | 初始矩阵单元格 | 检查结论 |
| --- | ---: | ---: | --- |
| 高维切片 `slice` | 127 | 0 | 默认数学输出受影响；修复后通过 |
| Young `young` | 0 | 0 | 默认输出未产生 CHTML；另测 Borel–Weil–Bott 动态公式通过 |
| Double Young `double-young` | 0 | 0 | 默认输出未产生 CHTML；主区／侧栏公式探针通过 |
| Production `production` | 0 | 0 | 默认输出未产生 CHTML；主区／侧栏公式探针通过 |
| Dynkin `dynkin` | 322 | 38 | 字形、间距和矩阵布局受影响；修复后通过 |
| Strands `strand` | 61 | 0 | 默认数学输出受影响；修复后通过 |
| Matrix `matrix` | 16 | 4 | 字形和矩阵布局受影响；独立卡片也通过 |
| Varieties / Sheaves `sheaf` | 40 | 0 | 默认数学输出受影响；修复后通过 |
| Complexes `complex` | 42 | 0 | 默认数学输出受影响；修复后通过 |
| Mosaic `mosaic` | 19 | 0 | 默认数学输出受影响；修复后通过 |
| Categories `category` | 32 | 0 | 默认数学输出受影响；修复后通过 |
| Ramification `ramification` | 68 | 0 | 默认数学输出受影响；修复后通过 |

因此，这不是单独的 Parabolic 样式问题。9 个引擎的默认页已经包含受影响的真实 CHTML 输出。其余 3 个不能因为默认字形数为零就视为完成：它们也通过统一公式探针，其中 Young 另验证了真实的延迟计算公式。

## 真实属性输出与原版对照

- **Parabolic**：同为 A4、标记顶点 1 和 3。工作区与原版生成的 TeX 公式完全相同；矩阵行数一致，列 padding 一致，行间距差异小于 1 CSS 像素；Fraktur 字形和数学空白恢复。维数仍为 16，幂零根基维数仍为 8。
- **Young Statistics / Pair Statistics**：当前输出路径不产生 CHTML 字形，不能把原生 HTML/SVG 输出计为此缺陷的实际缺字案例。
- **Young Weight / Borel–Weil–Bott**：触发真实计算后生成 36 个 CHTML 字形，未发现缺失字形规则。
- **Matrix Invariants / Inverse**：实际字形和矩阵单元格检查通过。
- **Variety & Sheaf Overview、Complex Operations、Field Invariants、Mosaic Statistics**：实际数学标签和属性输出检查通过。
- **动态公式**：新增 Fraktur / calligraphic 字形后仍能正确显示；不会累积重复样式节点。
- **SVG 输出**：本地 SVG MathJax 配置的字形路径和样式回归通过。

## AR / Starting Function 交互

- 移除顶部 Vertex 下拉框。
- 可直接点击任意顶点，包括未标记顶点；使用原版主图的单选／多选逻辑。
- 显示图、Vertex Data、AR / Starting Function 同步该焦点，并按对象隔离。
- 与主图共享选择模式：单选替换标记，多选切换标记且至少保留一个；标记写回同一对象，更新表头高亮、坐标过滤、Parabolic 和缩略图。
- Vertex Data 跟随最后点击的顶点，即使多选中刚刚取消了该顶点的标记。
- 开启 AR 时可自动补充方向数据，不必先进入其他面板；非适用 Lie 类型仍受原有数学限制。
- AR 表头的边可以反向，修改写回同一对象；缩略图继续忽略 quiver 方向。
- 转置后的顶点点击、原有拖动布局代码和滚动控件保留。
- 原生宽屏按钮继续由工作区“移至主区域”的布局操作替代。

## 回归入口与边界

`node js/math_workspace_math_rendering_ui_test.js`

测试检查字形实际生成内容、字体、空白宽度、矩阵单元格显示类型、行位置、真实鼠标点击、原版公式及行列间距对照。另运行原有根系、低秩、属性面板、输入草稿测试，并重建／检查工作区 bundle。

这是共享排版层和代表性面板的集成检查，不是所有计算任务、所有语言、所有窄屏尺寸的完整视觉审计。各计算器自绘 HTML/SVG 的个别布局差异，需要继续使用其原有测试和按面板比较。
