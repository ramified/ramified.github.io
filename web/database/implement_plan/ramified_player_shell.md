# 游戏入口与旧版调试页

> 本文说明当前实现结构。需求进度、未修复问题、验收条件和下一轮任务请统一查看 [玩家体验需求与修复跟踪](ramified_player_requirements.md)；本文列出的现有入口不代表它们已经符合最终玩家体验要求。

- `ramified_minigames.html`：面向玩家的入口。主菜单只有开始游戏、继续游戏、设置；选游戏、预设、显示、联机、导入导出和统计都在游戏框内切换。
- `ramified_minigames_archive.html`：保留原卡片布局和调试功能。与主页面共用游戏引擎，不是引擎代码的冻结副本。
- `css/ramified_minigames_player.css`：游戏外框与菜单布局。默认最大 960×720、4:3，在小窗口内等比例缩放；浏览器全屏使用原有全屏入口。
- 菜单与设置填满游戏外框；黑底白字标题栏固定在页顶，主菜单和游戏菜单按钮居中。长内容在页面内部滚动，不改变菜单包装层尺寸。窄屏操作面板在设置按钮下方的可用空间内滚动。
- `js/ramified_minigames_player.js`：页面切换、原控件迁移、菜单输入隔离、本地存档。左上角设置内提供返回菜单和全屏，原有撤销等按钮放在“操作”内。
- `RamifiedMinigames.player`：共享引擎提供的小型接口。规则和棋盘绘制仍由原引擎负责，旧版不会启用玩家页面逻辑。

## 存档范围

本地游戏在一步操作稳定完成后，使用原来的状态导出格式保存到当前浏览器的 `localStorage`。跨刷新恢复棋局和 AI 玩家配置；不保存撤销栈，也不把联网房间作为本地存档。菜单内往返直接保留内存中的棋局与撤销栈。打开菜单或设置会阻止本地 AI 开始下一步，正在播放的一步动画可以完成。

## 验证

```text
node js/ramified_minigames_player_test.js
node js/ramified_minigames_i18n_test.js
node js/ramified_minigames_import_export_test.js
node js/ramified_minigames_touch_test.js
node js/ramified_minigames_glue_flap_test.js
node js/ramified_minigames_ai_test.js
node js/ramified_minigames_sfx_test.js
```

另行运行的 `ramified_minigames_setup_test.js` 在 Hex 同一格悬停计时测试处失败；本次修改前的 HEAD 引擎也复现相同失败。此问题未混入本次 UI 改动。

浏览器检查覆盖中文与英文、开始/继续、2048 和推箱子的键盘操作、围棋计分控件、连连看专用控件、全屏进出以及旧版入口。联机只检查入口及原控件迁移，未进行真实双人对局。本次没有发布到 itch.io，也未改变棋盘美术或边界粘合表现。

菜单布局另在桌面、390×844 iframe 和浏览器全屏内检查；菜单包装层与设置页面的宽高均保持覆盖可用区域。窄屏检查包括主菜单、游戏菜单、设置、选游戏、导入导出，以及点击推箱子向右按钮完成一步推动。
