# 游戏入口与旧版调试页

> 本文说明当前实现结构。需求进度、未修复问题、验收条件和下一轮任务请统一查看 [玩家体验需求与修复跟踪](ramified_player_requirements.md)；本文列出的现有入口不代表它们已经符合最终玩家体验要求。

- `ramified_minigames.html`：面向玩家的入口。主菜单只有开始游戏、继续游戏、设置；选游戏、准备页／选关、显示和联机在游戏框内切换。R11 已移除玩家菜单中的导入导出、独立统计、旧版链接和长段说明。
- `ramified_minigames_archive.html`：保留原卡片布局和调试功能。与主页面共用游戏引擎，不是引擎代码的冻结副本。
- `css/ramified_minigames_player.css`：游戏外框与菜单布局。默认最大 960×720、4:3，在小窗口内等比例缩放；浏览器全屏使用原有全屏入口。
- 菜单与设置填满游戏外框；黑底白字标题栏固定在页顶，主菜单和游戏菜单按钮居中。长内容在页面内部滚动，不改变菜单包装层尺寸。窄屏操作面板在设置按钮下方的可用空间内滚动。
- `js/ramified_minigames_player.js`：页面切换、原控件迁移、菜单输入隔离、本地存档。左上角设置内提供返回菜单和全屏；设置右侧的“对局控制栏”包含撤销、重做、重置；方向键等专用控件保留在左下角“游戏操作”内。
- `RamifiedMinigames.player`：共享引擎提供的小型接口。规则和棋盘绘制仍由原引擎负责，旧版不会启用玩家页面逻辑。
- R08：开始游戏先进入游戏列表；推箱子以外十款游戏使用共用准备页，预览两侧箭头、下方必要选项、可选“更多”和固定底部开始按钮。同次准备按棋盘保留参数，新进入恢复默认值；逐款配置见 [R08 实施记录](ramified_R08_start_flow.md)。推箱子直接进入数字选关，首次开放前三关，详见 [R10 实施记录](ramified_R10_sokoban_flow.md)。
- R16：游戏列表复用 `assets/ramified_minigames/board_game_stickers` 的 11 张 PNG。每个原生按钮包含放大的图片和本地化名称；每页两行三列，左右箭头翻页，首尾方向禁用。窄屏保留同一分页结构，准备页返回／语言切换保留页码，图片失败也能按名称进入游戏。

## 存档范围

本地游戏在一步操作稳定完成后，使用原来的状态导出格式保存到当前浏览器的 `localStorage`。跨刷新恢复棋局和 AI 玩家配置；不保存撤销栈，也不把联网房间作为本地存档。菜单内往返直接保留内存中的棋局与撤销栈。打开菜单或设置会阻止本地 AI 开始下一步，正在播放的一步动画可以完成。

整个游戏集保留一份进度。`beginSetup / cancelSetup / commitSetup` 将新局准备与当前棋局分开；预览借用原渲染，当前棋局、撤销／重做及相关控件值保留在内存中。浏览不覆盖存档，返回或失败恢复原局；仅在正式开局前确认替换，成功后自动保存新局。具体范围见 [R08 实施记录](ramified_R08_start_flow.md)。

推箱子的解锁和完成记录独立持久保存，开始新局不会清空；三份存档和从头开始尚未实施，登记于需求表 R17。按用户确认，匿名统计继续采集，玩家设置中不显示说明；旧版页面保留原入口及内容。

## 验证

```text
node js/ramified_minigames_player_test.js
node js/ramified_minigames_player_ui_test.js
node js/ramified_minigames_i18n_test.js
node js/ramified_minigames_import_export_test.js
node js/ramified_minigames_touch_test.js
node js/ramified_minigames_glue_flap_test.js
node js/ramified_minigames_ai_test.js
node js/ramified_minigames_sfx_test.js
```

`player_ui_test` 使用仓库现有的独立 Edge／Chromium 浏览器测试工具，需要 Node 22+ 和已安装的 Edge／Chromium，不使用用户浏览器存档。可设置 `RAMIFIED_UI_SCREENSHOTS` 输出布局截图；默认仅运行断言。

另行运行的 `ramified_minigames_setup_test.js` 在 Hex 同一格悬停计时测试处失败；本次修改前的 HEAD 引擎也复现相同失败。此问题未混入本次 UI 改动。

浏览器检查覆盖中文与英文、开始/继续、2048 和推箱子的键盘操作、围棋计分控件、连连看专用控件、全屏进出以及旧版入口。联机只检查入口及原控件迁移，未进行真实双人对局。本次没有发布到 itch.io，也未改变棋盘美术或边界粘合表现。

菜单布局另在桌面、390×844 iframe 和浏览器全屏内检查；菜单包装层与设置页面的宽高均保持覆盖可用区域。窄屏检查包括主菜单、游戏菜单、设置、选游戏、导入导出，以及点击推箱子向右按钮完成一步推动。
