# Minigames fullscreen 尺寸根因与验证记录

日期：2026-09-27。修改前基线：`f71e0fdb8ffdd54a0c219cd0330d940cbe1d2dca`。

## 结论与证据边界

已在实际 Edge/Chromium 布局引擎中，先复现错误矩形，再修改实现。
已证实三处缺陷：fullscreen 样式的选择器列表兼容性、gutter 重复扣除，以及可视区域缩小时仍在整个容器中居中。
`fitCanvasDisplaySize()` 的 contain 公式正确，未修改。

**没有物理 iPad/Safari，也未运行 Firefox 或桌面 Safari。不能把这些结果称为 iPad 实机验收通过。**
用户尚未提供 iPadOS/Safari 版本。选择器失效和 viewport 差异测试是受控故障注入，不是 Safari 仿真；不能据此断言用户设备一定走了其中某条路径。实机应使用本文末尾的诊断开关确认。

## 1. 完整尺寸链

1. `toggleCanvasFullscreen()` 的 target 是 `refs.canvasWrap || refs.canvas`；本页实际进入全屏的元素经 DOM 检查为 `#canvas-wrap`，不是 canvas 或外层 `.canvas-panel`。
2. 标准 `requestFullscreen` 或前缀 `webkitRequestFullscreen` 请求进入全屏。浏览器将 target 放进 top layer；页面样式控制其尺寸、padding 和内部布局。
3. `currentFullscreenElement()` 读取标准/前缀状态；`syncCanvasDisplayModeUi()` 同步 body class。
4. `render()` → `canvasRenderSizing()` → `immersiveCanvasAvailableBox()`：读取 wrap 矩形、viewport 和实际 padding/border，求可见内容矩形。
5. `buildGeometry()` 等现有游戏布局代码计算逻辑绘制尺寸；`canvas.style.aspectRatio` 保存该比例。
6. `applyCanvasDisplaySize()` → `fitCanvasDisplaySize()`，把结果写入 `--canvas-display-width/height`，**不是直接写 canvas.style.width/height**。
7. CSS 必须真正消费这两个变量。浏览器 cascade/layout 后，`render()` 读取 `canvas.getBoundingClientRect()`。
8. `canvasBackingMetrics()` 根据实际 CSS rect 和 DPR 计算 buffer；`resizeCanvasBacking()` 设置 canvas.width/height。buffer 不能修复错误的显示矩形。
9. action shell 布局后，必要时保留顶部 gutter，再次 render；最终的尺寸与位置应同时落在 available rect 内。

本页没有 canvas 与 wrap 之间的中间容器。DOM 祖先为 canvas → wrap → section.canvas-panel → main.mosaic-layout → body → html。进入 top layer 后，不能把页面背景的 main/body 高度误当成全屏可用高度。

### 样式及其他脚本检查

- 本页内联 CSS：`#mosaic-canvas`、fit viewport、fullscreen、gutter、媒体查询、action shell。
- `css/site.css`：全局 border-box、`.canvas-panel` overflow、wrap padding 16px（窄屏 12px）、全局 canvas `width:100% !important; height:auto !important`。
- `css/site_i18n.css`、`css/import_export_panel.css`：未发现覆盖本 canvas 尺寸的规则。
- 页面引用的 card/input/i18n/import-export、音效、AI、analytics 脚本，以及 setup 的可选游戏模块路径经过检索；本 canvas 的 fullscreen display-size 写入路径在 setup 中。没有证据表明另一个已加载脚本在之后改写上述显示尺寸变量。
- 不修改全站 `css/site.css`，避免影响其他 calculator。

## 2. 第一处错误矩形：选择器失效路径

在修改生产源码之前，将页面内存中的 `:fullscreen` 替换为一个不支持的伪类，保留 `:-webkit-full-screen`，随后请求真实浏览器 fullscreen。这验证普通选择器列表中一项无效时，整条规则丢失的路径。

旧规则把 fit viewport、标准 fullscreen、前缀 fullscreen 放在同一个逗号列表中。列表被丢弃后，CSSOM 中不再有消费显示尺寸变量的规则；全局 `canvas { width:100% !important; height:auto !important }` 胜出。

实测，固定 4×4 方形棋盘、DPR=2：

| 阶段 | 修改前：选择器失效 | 修改后：同一受控条件 |
| --- | --- | --- |
| inner / visual | 1366×900 / 1366×900 | 相同 |
| 实际 fullscreen target | canvas-wrap | canvas-wrap |
| wrap rect | 1366×900 @ (0,0) | 相同 |
| wrap display / padding | block / 16px | flex / 0px |
| available | 1302×836（旧代码双扣 padding） | 1366×900 |
| fit / CSS 变量 | 836×836 | 900×900 |
| canvas computed / DOM rect | **1334×1334 @ (16,16)** | **900×900 @ (233,0)** |
| canvas bottom / visible bottom | **1350 / 900** | **900 / 900** |
| drawing buffer | 2668×2668 | 1800×1800 |

**第一处越界 DOM 是 `#mosaic-canvas`，不是 wrap。** 返回的 contain 尺寸并未成为显示尺寸；buffer 随错误 rect 放大，只是后果。

背景依据：[WebKit Safari 16.4 发布说明](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)说明该版本新增 iPadOS/macOS 无前缀 Fullscreen API 和 `:fullscreen`；[Selectors Level 4](https://www.w3.org/TR/selectors-4/#invalid)定义普通选择器列表的失效规则。实际设备版本仍需确认。

## 3. Gutter 的独立错误

旧实现：固定 padding-top=56px；JS 把 paddingTop+paddingBottom 同时从上下两端扣除；CSS 又有 `max-height:calc(100% - 56px)`。这不是一套一致的内容矩形。

旧版标准 Edge 在 900×900 下观察到 gutter=56、available height=788，而 action shell bottom=64。固定 padding 连操作栏实际底边都没有覆盖，还发生重复扣除。

新版只按每一边自己的 padding+border 求 content rect；删除 canvas 上第二次 gutter max-height 扣除。最终方向确定后实测 action shell bottom，再加原有 10px 控件间距作为 padding。

实测 900×900、方形棋盘、操作栏显示：

```text
shell top=10, height=54, bottom=64
→ gutter=64+10=74
→ available=(0,74), 900×826
→ fit=826×826
→ canvas=(37,74), bottom=900
→ buffer=1652×1652 (DPR=2)
```

隐藏操作栏后释放 gutter。将 shell min-height 在全屏中动态改成 98px、不发送 window resize，ResizeObserver 仍使 gutter 增至 118px，并保持 canvas 在可见区域内。

## 4. 宽高正确但位置错误的路径

修完样式后，另做受控测试：wrap=1366×900，但 visual API 返回 `(20,0),1000×600`。这不是设备实测值。

```text
available=(20,0),1000×600
→ fit=600×600
→ 旧 flex 在整个 wrap 居中
→ canvas=(383,150),600×600，bottom=750 > 600
```

此场景第一处超出可视区域的 DOM 是 wrap（它的全屏布局尺寸大于注入的 visual rect）；仅限制 canvas 尺寸仍不够。

现在 fullscreen canvas 的 left/top 与 width/height 都由**同一个 available rect**决定，通过 absolute positioning 放在 wrap 中，不使用 transform 或缩放 hack：

```text
available=(20,0),1000×600
→ fit=600×600
→ canvas=(220,0),600×600，bottom=600
```

也测试了 offsetTop=170，仅发送 visualViewport.scroll：canvas 保持在新的可见边界内。没有凭猜测替换 viewport API 选择策略；保留原来的策略并暴露各 API 原始读数，等待实机证据。

## 5. 事件时序及稳定性

事件不是跨浏览器保证固定顺序的单链。代码中的处理关系为：

```text
button → requestFullscreen / webkitRequestFullscreen
  ├─ Promise resolved → sync UI → render immediately + next rAF
  └─ fullscreenchange / webkitfullscreenchange → sync UI → render + next rAF
window.resize / orientationchange / visualViewport.resize / scroll
  → clear old gutter → render + next rAF
render → apply display size/position → read actual rect → update buffer
  → rAF positionFullscreenActionBar
      → measure final shell → gutter changed? → render
ResizeObserver(wrap or shell)
  → render or reposition controls → repeat only if geometry changed
```

现场采集的事件包含 gutter-change → applyCanvasDisplaySize → ResizeObserver → applyCanvasDisplaySize → positionFullscreenActionBar，再稳定停止。测试等待额外 350ms 后确认最后一条尺寸事件时间不再变化，避免 observer/gutter 循环。

诊断事件区分 window.resize、visualViewport.resize/scroll、orientationchange、API 请求和 gutter 修改。前缀 API 返回 void 的分支也做了浏览器回归，但不是旧 Safari 引擎实测。

## 6. 为什么前两次修复仍可能失败

- `b1108a29` 修改 viewport 来源，加入 dvh/dvw 和额外 max-height，但消费 JS 尺寸的 CSS 仍处于可整体失效的混合选择器列表里。正确计算不能抵消 width:100% 的最终 cascade。
- `f71e0fd` 加入 orientationchange、可视区域 offset 和 gutter 后重绘，仍未修选择器；还把两边 padding 总和用于每一边，导致双扣。
- 两次都只约束可用宽高，没有保证最终 canvas 的位置在相同矩形内；flex 仍按整个 wrap 居中。
- 两次修改后 setup 引用的 cache query 仍为 20260913-2。本次同步升级到 20260927-1。此前是否实际命中旧缓存没有网络证据，不能作为已证实根因。

## 7. 修改范围及关键差异

生产文件：

1. `ramified_minigames.html`：使用已同步的 body fullscreen class；canvas 在 available rect 中定位；实测 gutter 变量；调试面板 CSS；setup/locales 缓存升级。
2. `js/ramified_minigames_setup.js`：每边独立 inset、全屏 canvas 坐标、实测 gutter、布局变化收敛、opt-in diagnostics。
3. `js/i18n/ramified_minigames_locales.js`：诊断标题的英文/简体中文键。

新增：`js/ramified_minigames_fullscreen_test.js` 与本报告。未修改游戏规则、contain 公式、全站 CSS、历史计算器或 Math Workspace。

```diff
- #canvas-wrap:fullscreen #mosaic-canvas,
- #canvas-wrap:-webkit-full-screen #mosaic-canvas
+ body.canvas-fullscreen-active #mosaic-canvas
  { width:var(--canvas-display-width,100%) !important;
    height:var(--canvas-display-height,auto) !important; }
- padding-top:56px;
- max-height:calc(100% - 56px); /* canvas: second gutter deduction */
+ padding-top:var(--fullscreen-action-gutter-height,0px);
+ /* canvas left/top center it inside the same measured available rect */
```

## 8. 回归结果

- 新 fullscreen 浏览器测试 PASS：标准、单一伪类可用的两种解析路径、前缀 void API；每种六次 viewport 状态、操作栏开/关；退出与 fit viewport；square/wide/tall 棋盘；动态 toolbar；受控 viewport offset/scroll；布局收敛；debug opt-in。
- 断言最终 canvas 四边都在 visible rect 内（1px tolerance）、实际尺寸等于请求尺寸、比例正确、buffer 不小于显示尺寸、gutter 模式不与操作栏重叠。不是只断言 height <= viewport height。
- `ramified_minigames_i18n_test.js` PASS：354 referenced keys，907 entries。
- `ramified_minigames_touch_test.js` PASS。
- `ramified_minigames_import_export_test.js` PASS。
- `ramified_minigames_sfx_test.js` PASS。
- `ramified_minigames_setup_test.js` FAIL：Hex same-tile dwell timer；用内存读取 HEAD 的原始 setup/HTML 重跑，**同一失败**。仅在内存跳过该测试进行补充检查，又遇到 `testNoSpawnAfterNoop`，HEAD 也同样失败。未修改/删除断言，不能宣称全套通过。
- `ramified_minigames_glue_flap_test.js` FAIL：写死 20260911-1 缓存字符串；HEAD HTML 已是 20260913-2，同样失败。未扩大范围修改旧测试。
- Node syntax 与 `git diff --check` 通过（Git 有现有行尾转换提示）。

## 9. iPad 实机交接（待验收）

本次是本地 commit，不自动 push 或部署。部署此提交后，打开：

`https://ramified.github.io/web/database/ramified_minigames.html?fullscreenDebug=1`

进入 fullscreen 后固定诊断面板显示 inner、screen、visual/offset/scale、实际 target/API、选择器支持、wrap、available、logical、fit、requested、canvas 四边、action bottom/padding、buffer、firstOverflow。
该面板 fixed、pointer-events:none、不参与布局，仅显式参数启用。控制台 `RamifiedMinigames.getFullscreenDiagnostics()` 返回完整 computed styles、祖先矩形、client/scroll 尺寸和最近事件。

请提供 iPadOS/Safari 版本、游戏/预设，以及横屏、竖屏、操作栏开/关、旋转后的截图。重点比较 canvas bottom/right 和 visible bottom/right；若 wrap 或 visual 读数异常，应以这份数据继续定位，不再盲改 API。普通 URL 不创建诊断面板。
