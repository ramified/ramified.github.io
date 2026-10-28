/* Additional labels for the isolated design study. Shared catalogs stay unchanged. */
(() => {
  'use strict';
  const pairs = {
    'study.title': ['Games on glued spaces', '粘合空间上的游戏'],
    'study.intro': ['Games on boards whose edges are glued together.', '棋盘边缘相连的小游戏。'],
    'study.menu': ['Menu', '菜单'],
    'study.again': ['Again', '再来'],
    'study.turn': ['{{side}} to play', '轮到{{side}}'],
    'study.finished': ['Game finished', '本局结束'],
    'study.side.black': ['Black', '黑方'],
    'study.side.white': ['White', '白方'],
    'study.side.red': ['Red', '红方'],
    'study.side.yellow': ['Yellow', '黄方'],
    'study.side.blue': ['Blue', '蓝方'],
    'study.side.green': ['Green', '绿方'],
    'study.side.purple': ['Purple', '紫方'],
    'common.undo': ['Undo', '撤销'],
    'common.redo': ['Redo', '重做'],
    'study.saves': ['Saved games', '管理存档'],
    'study.statistics': ['Statistics', '本局统计'],
    'study.gameSettings': ['Game settings', '本局设置'],
    'online.notConfigured': ['Online play is unavailable right now. You can still play on this device.', '联机暂不可用，可以先在这台设备上玩。'],
    'games.random': ['Random board', '随机棋盘'],
    'study.soundQuestion': ['Sound on?', '开启声音？'],
    'study.enableSound': ['Turn on', '开启'],
    'study.notNow': ['Not now', '暂不开启'],
    'player.start': ['Play', '开始'],
    'online.title': ['Online', '联机'],
    'player.more': ['Options', '选项'],
    'setup.randomSetup': ['Random board', '随机棋盘'],
    'study.gluing': ['Glued edges connect: leave one side and return through its matching edge. The marks show which edges match.', '粘合边彼此相连：从一边离开，会从配对的边返回。边上的标记告诉你如何连接。'],
    'study.original': ['Original page', '原版页面'],
    'study.home': ['Home', '首页'],
    'study.workshop': ['Workshop', '工作坊'],
    'study.workshopHelp': ['Editing, sound experiments and file tools. These are optional; close this section to return to ordinary settings.', '编辑、音效实验与文件工具。无需使用也能玩；收起后即可继续常规设置。'],
    'study.muted': ['Sound off', '声音已关闭'],
    'study.unmuted': ['Sound on', '声音已开启'],
    'study.gamesHelp': ['Choose a game, then preview its board before starting.', '选择游戏，预览棋盘后再开始。']
  };
  for (const [index, locale] of ['en', 'zh-CN'].entries()) {
    window.SiteI18n.register('ramified-minigames', locale,
      Object.fromEntries(Object.entries(pairs).map(([key, pair]) => [key, pair[index]])));
  }
})();
