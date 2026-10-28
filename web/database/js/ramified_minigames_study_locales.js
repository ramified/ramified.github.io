/* Additional labels for the isolated design study. Shared catalogs stay unchanged. */
(() => {
  'use strict';
  const pairs = {
    'study.title': ['Games on glued spaces', '粘合空间上的游戏'],
    'study.intro': ['Familiar games on boards with unexpected connections.', '熟悉的游戏，不一样的棋盘连接。'],
    'study.gluing': ['Glued edges connect: leave one side and return through its matching edge. The marks show which edges match.', '粘合边彼此相连：从一边离开，会从配对的边返回。边上的标记告诉你如何连接。'],
    'study.original': ['Original page', '原版页面'],
    'study.home': ['Home', '首页'],
    'study.workshop': ['Workshop', '工作坊'],
    'study.workshopHelp': ['Editing, sound experiments and file tools. These are optional; close this section to return to ordinary settings.', '编辑、音效实验与文件工具。无需使用也能玩；收起后即可继续常规设置。'],
    'study.muted': ['Sound off', '声音已关闭'],
    'study.unmuted': ['Sound on', '声音已开启'],
    'study.gamesHelp': ['Choose a game, then preview its board before starting.', '选择游戏，预览棋盘后再开始。'],
    'study.rule.2048': ['Slide and merge equal numbers.', '滑动并合并相同数字。'],
    'study.rule.connect-four': ['Connect four pieces in a line.', '让四枚棋子连成一线。'],
    'study.rule.gomoku': ['Make a line of five stones.', '让五枚棋子连成一线。'],
    'study.rule.go': ['Surround territory and capture stones.', '围地并提取被包围的棋子。'],
    'study.rule.reversi': ['Bracket and flip opposing stones.', '夹住并翻转对方的棋子。'],
    'study.rule.sokoban': ['Push the crates onto their goals.', '将箱子推到目标位置。'],
    'study.rule.hex': ['Connect your two opposite sides.', '连接属于你的两条对边。'],
    'study.rule.fide-chess': ['Play chess or solve a position.', '进行棋局或解开棋题。'],
    'study.rule.chinese-checkers': ['Hop your pieces across the board.', '跳过棋子，穿越棋盘。'],
    'study.rule.billiards': ['Aim, set your spin and take a shot.', '瞄准、调整旋转并击球。'],
    'study.rule.lianliankan': ['Find pairs with a clear connecting path.', '找出可连通的一对图案。']
  };
  for (const [index, locale] of ['en', 'zh-CN'].entries()) {
    window.SiteI18n.register('ramified-minigames', locale,
      Object.fromEntries(Object.entries(pairs).map(([key, pair]) => [key, pair[index]])));
  }
})();
