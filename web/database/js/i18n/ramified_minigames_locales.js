(() => {
  'use strict';

  const pairs = {
    'meta.title': ['Ramified Minigames', '歧趣游境｜Ramified Minigames'],
    'meta.heading': ['Ramified Minigames', '歧趣游境'],
    'common.language': ['Language', '语言'],
    'common.english': ['English', 'English'],
    'common.chinese': ['Simplified Chinese', '中文'],
    'common.toolkit': ['Pure Math Toolkit', '纯数工具箱'],
    'common.mosaicCalculator': ['Mosaic Calculator', '马赛克'],
    'common.tagline': ['glued-boundary game prototypes', '边界粘合的经典游戏'],
    'common.feedback': ['Send feedback', '反馈'],
    'common.footer': ['Browser-side minigames on glued mosaic background spaces.', '在浏览器中体验黎曼面上的小游戏。'],
    'common.normal': ['normal', '普通'],
    'common.fitViewport': ['fit viewport', '适应窗口'],
    'common.fullscreen': ['fullscreen', '全屏'],
    'common.actions': ['Actions', '操作'],
    'common.undo': ['undo', '撤销'],
    'common.redo': ['redo', '重做'],
    'common.preview': ['preview', '预览'],
    'common.import': ['import', '导入'],
    'common.export': ['export', '导出'],
    'common.refresh': ['refresh', '刷新'],
    'common.copy': ['copy', '复制'],
    'common.download': ['download', '下载'],
    'common.hint': ['Hint', '提示'],
    'common.showHint': ['Show hint', '显示提示'],
    'common.refreshRemainingTiles': ['Refresh remaining tiles', '刷新剩余方块'],
    'common.reset': ['Reset', '重置'],
    'common.resetGame': ['Reset game', '重置游戏'],
    'common.confirmReset': ['Confirm reset', '确认重置'],
    'common.confirmResetGame': ['Confirm reset game', '确认重置游戏'],
    'common.clear': ['clear', '清除'],
    'common.edit': ['edit', '编辑'],
    'common.debug': ['debug', '调试'],
    'common.empty': ['empty', '空'],
    'common.yes': ['yes', '是'],
    'common.no': ['no', '否'],
    'common.loadingPresets': ['Loading presets...', '正在加载预设…'],
    'common.importedPreset': ['imported preset', '已导入的预设'],
    'common.restartQuestion': ['Restart this game?', '重新开始本局？'],
    'common.randomPreset': ['Random preset', '随机预设'],
    'common.selectedBackground': ['selected background', '所选背景'],
    'common.stale': ['stale', '已过期'],
    'common.canvasSpark': ['canvas spark', '画布火花'],
    'debug.checkTranslation': ['check translation', '检查翻译'],

    'access.canvasPanel': ['Ramified minigame canvas panel', '歧趣游境画布面板'],
    'access.status': ['Ramified minigame status', '歧趣游境游戏状态'],
    'access.canvasView': ['Canvas view', '画布视图'],
    'access.canvas': ['Ramified minigame mosaic canvas', '歧趣游境马赛克画布'],
    'access.checkTranslation': ['Check Chinese translations', '检查中文翻译'],
    'access.fullscreenControls': ['Fullscreen action controls', '全屏操作控件'],
    'access.openFullscreenBar': ['Open fullscreen action bar', '打开全屏操作栏'],
    'access.fullscreenBar': ['Fullscreen action bar', '全屏操作栏'],
    'access.undoMove': ['Undo move', '撤销'],
    'access.redoMove': ['Redo move', '重做'],
    'access.exitFullscreen': ['Exit fullscreen', '退出全屏'],
    'access.restartGame': ['Restart game', '重新开始游戏'],
    'access.startPrompt': ['Canvas start prompt', '画布开始提示'],
    'access.setup': ['Ramified minigame setup', '歧趣游境游戏设置'],
    'access.moveHistory': ['Move history', '操作历史'],
    'access.surfacePreset': ['Surface preset', '表面预设'],
    'access.numberBoxStyle': ['Number box style', '数字方块样式'],
    'access.squareControls': ['Square directional controls', '方格方向控件'],
    'access.hexControls': ['Hexagonal directional controls', '六角格方向控件'],
    'access.onlineRoomCode': ['Online room code', '在线房间代码'],
    'access.onlineRooms': ['Available online rooms', '可用在线房间'],
    'access.onlinePlayerName': ['Online player name', '在线玩家昵称'],
    'access.onlinePlayerSide': ['Online player side', '在线玩家阵营'],
    'access.presetSource': ['Preset import source', '预设导入来源'],
    'access.importCatalog': ['Import catalog preset', '导入目录预设'],
    'access.exportKind': ['Export kind', '导出类型'],
    'access.exportContent': ['Export content', '导出内容'],
    'access.exportFormat': ['Background export format', '背景导出格式'],
    'access.exportOutput': ['Current game status or preset export', '当前游戏状态或预设导出'],
    'access.importPayload': ['Imported preset or status', '导入的预设或状态'],
    'access.importFile': ['Choose a JSON file to import', '选择要导入的 JSON 文件'],
    'access.ioTabs': ['Import and export', '导入与导出'],
    'access.pinCard': ['pin card', '固定卡片'],
    'access.moveUp': ['Move up', '向上移动'],
    'access.moveDown': ['Move down', '向下移动'],
    'access.moveLeft': ['Move left', '向左移动'],
    'access.moveRight': ['Move right', '向右移动'],
    'access.moveEast': ['Move east', '向东移动'],
    'access.moveWest': ['Move west', '向西移动'],
    'access.moveNortheast': ['Move northeast', '向东北移动'],
    'access.moveNorthwest': ['Move northwest', '向西北移动'],
    'access.moveSoutheast': ['Move southeast', '向东南移动'],
    'access.moveSouthwest': ['Move southwest', '向西南移动'],
    'access.moveUpKeys': ['Move up (ArrowUp/W)', '向上移动（上箭头/W）'],
    'access.moveDownKeys': ['Move down (ArrowDown/S)', '向下移动（下箭头/S）'],
    'access.moveLeftKeys': ['Move left (ArrowLeft/A)', '向左移动（左箭头/A）'],
    'access.moveRightKeys': ['Move right (ArrowRight/D)', '向右移动（右箭头/D）'],
    'access.moveEastKeys': ['Move east (ArrowRight)', '向东移动（右箭头）'],
    'access.moveWestKeys': ['Move west (ArrowLeft)', '向西移动（左箭头）'],
    'access.moveNortheastKeys': ['Move northeast (ArrowUp+ArrowRight)', '向东北移动（上箭头+右箭头）'],
    'access.moveNorthwestKeys': ['Move northwest (ArrowUp+ArrowLeft)', '向西北移动（上箭头+左箭头）'],
    'access.moveSoutheastKeys': ['Move southeast (ArrowDown+ArrowRight)', '向东南移动（下箭头+右箭头）'],
    'access.moveSouthwestKeys': ['Move southwest (ArrowDown+ArrowLeft)', '向西南移动（下箭头+左箭头）'],
    'access.boundaryMode': ['Boundary glue mode', '边界粘合模式'],
    'access.boundaryShape': ['Boundary board shape', '边界棋盘形状'],
    'access.boardRows': ['Boundary board rows', '边界棋盘行数'],
    'access.boardColumns': ['Boundary board columns', '边界棋盘列数'],
    'access.placementDisplay': ['Placement display', '落子显示样式'],
    'access.coordinates': ['Show board coordinates', '显示棋盘坐标'],
    'access.billiardsRules': ['Billiards rules', '台球规则'],
    'access.billiardsBallPalette': ['Billiards ball palette', '台球球组选择板'],
    'access.billiardsRacks': ['Billiards rack choices', '台球球框选择'],
    'access.billiardsAssistance': ['Billiards aim assistance', '台球瞄准辅助'],
    'access.billiardsFriction': ['Billiards table friction', '台球桌面摩擦力'],
    'access.tileSet': ['Tile Matching tile set', '连连看图案组'],
    'access.billiardsCueContact': ['Cue ball contact point', '母球击点'],
    'access.pieceRadius': ['Placement piece radius', '落子棋子半径'],
    'access.chessDisplay': ['Chess piece display', '国际象棋棋子显示'],
    'access.squareBoardSize': ['Square board size', '方形棋盘大小'],
    'access.goKomi': ['Go white komi', '围棋白方贴目'],
    'access.goScoring': ['Go scoring method', '围棋计分方法'],
    'access.connectFall': ['Connect Four fall direction', '四子棋落子方向'],
    'access.checkersMoveTime': ['Chinese Checkers move time per edge', '跳棋每条边的移动时间'],
    'access.checkersPause': ['Chinese Checkers pause at multi-jump landings', '跳棋连跳落点停顿时间'],
    'access.checkersJumpRule': ['Chinese Checkers jump rule', '跳棋跳跃规则'],
    'access.checkersPlayers': ['Chinese Checkers players', '跳棋玩家'],
    'access.turnNotice': ['Online turn notice duration', '在线回合提示时长'],
    'access.debugValue': ['Debug tile value', '调试方块数值'],
    'access.debugTool': ['Debug tile tool', '调试方块工具'],
    'access.bombStyle': ['Bomb art style', '炸弹图案样式'],
    'access.hexNeighborDelay': ['Hex neighbor hint delay', 'Hex 相邻格提示延迟'],
    'access.hexNeighborSize': ['Hex neighbor marker size', 'Hex 相邻格标记大小'],
    'access.hexNeighborStroke': ['Hex neighbor marker stroke width', 'Hex 相邻格标记线宽'],
    'access.sokobanSize': ['Sokoban object size', '推箱子物体大小'],
    'access.innerGlow': ['Energy Bridge inner glow', '能量桥内发光'],
    'access.outerGlow': ['Energy Bridge outer glow', '能量桥外发光'],
    'access.glowBlur': ['Energy Bridge glow blur', '能量桥发光模糊'],
    'access.beamWidth': ['Energy beam width', '能量光束宽度'],
    'access.beamOpacity': ['Energy beam opacity', '能量光束透明度'],
    'access.importGame': ['Import game', '导入游戏'],
    'access.undoTitle': ['Undo', '撤销'],
    'access.redoTitle': ['Redo', '重做'],
    'access.restartTitle': ['Restart', '重新开始'],

    'setup.canvas': ['Mosaic Canvas', '马赛克画布'],
    'setup.prototypeStatus': ['Prototype status', '原型状态'],
    'setup.setup': ['setup', '设置'],
    'setup.ready': ['Ready to begin?', '准备好了吗？'],
    'setup.begin': ['begin the game', '开始游戏'],
    'setup.stop': ['stop the game', '停止游戏'],
    'setup.choosePreset': ['choose a preset', '请选择预设'],
    'setup.notStarted': ['game not started', '游戏尚未开始'],
    'setup.gameSetup': ['Game Setup', '游戏设置'],
    'setup.game': ['Game', '游戏'],
    'setup.preset': ['Preset', '预设'],
    'setup.boundary': ['Boundary', '边界'],
    'setup.shape': ['Shape', '形状'],
    'setup.display': ['Display', '显示'],
    'setup.coordinates': ['coordinates', '坐标'],
    'setup.rules': ['Rules', '规则'],
    'setup.setupTool': ['Setup tool', '布置工具'],
    'setup.assistance': ['Assistance', '辅助'],
    'setup.friction': ['Friction', '摩擦力'],
    'setup.cueContact': ['Cue contact', '球杆击点'],
    'setup.power': ['Power', '力度'],
    'setup.view': ['View', '视图'],
    'setup.labels': ['Labels', '标签'],
    'setup.piece': ['Piece', '棋子'],
    'setup.pieces': ['Pieces', '棋子'],
    'setup.threats': ['Threats', '威胁'],
    'setup.boardN': ['Board n', '棋盘 n'],
    'setup.rowsCols': ['Rows / cols', '行数／列数'],
    'setup.komi': ['Komi', '贴目'],
    'setup.action': ['Action', '操作'],
    'setup.score': ['Score', '得分'],
    'setup.method': ['Method', '方法'],
    'setup.dead': ['Dead', '死子'],
    'setup.edit': ['Edit', '编辑'],
    'setup.compare': ['Compare', '比较'],
    'setup.finish': ['Finish', '结束'],
    'setup.fall': ['Fall', '落子方向'],
    'setup.board': ['Board', '棋盘'],
    'setup.moveTime': ['Move time', '移动时间'],
    'setup.jumpPause': ['Jump pause', '连跳停顿'],
    'setup.hints': ['Hints', '提示'],
    'setup.players': ['Players', '玩家'],
    'setup.jump': ['Jump', '跳跃'],
    'setup.boxUi': ['Box UI', '方块样式'],
    'setup.newBoxes': ['New boxes', '新方块'],
    'setup.speed': ['Speed', '速度'],
    'setup.turnNotice': ['Turn notice', '回合提示'],
    'setup.tileValue': ['Tile value', '方块数值'],
    'setup.tileTool': ['Tile tool', '方块工具'],
    'setup.bombArt': ['Bomb art', '炸弹图案'],
    'setup.hexNeighborDelay': ['Neighbor delay', '相邻格延迟'],
    'setup.hexNeighborSize': ['Neighbor size', '相邻格大小'],
    'setup.hexNeighborStroke': ['Neighbor stroke', '相邻格线宽'],
    'setup.objectSize': ['Object size', '物体大小'],
    'setup.innerGlow': ['Inner glow', '内发光'],
    'setup.outerGlow': ['Outer glow', '外发光'],
    'setup.glowBlur': ['Glow blur', '发光模糊'],
    'setup.beamWidth': ['Beam width', '光束宽度'],
    'setup.beamOpacity': ['Beam opacity', '光束透明度'],
    'setup.move': ['Move', '移动'],
    'setup.billiardsSolo': ['solo', '单人'],
    'setup.billiardsCompetitive': ['two-player', '双人对战'],
    'setup.billiardsCueBall': ['cue ball', '母球'],
    'setup.billiardsNextTarget': ['next numbered target', '下一个编号目标球'],
    'setup.billiardsBalls': ['Balls', '球组'],
    'setup.billiardsNumberedBall': ['ball {{number}}', '{{number}}号球'],
    'setup.billiardsPocket': ['pocket', '袋口'],
    'setup.billiardsPlaced': ['placed', '已放置'],
    'setup.billiardsRacks': ['Racks', '球框'],
    'setup.billiardsRack6': ['6-ball rack', '6球三角框'],
    'setup.billiardsRack10': ['10-ball rack', '10球三角框'],
    'setup.billiardsRack15': ['15-ball rack', '15球三角框'],
    'setup.billiardsBeginner': ['beginner', '初学'],
    'setup.billiardsNormal': ['normal', '普通'],
    'setup.billiardsExpert': ['expert', '专家'],
    'setup.billiardsCenter': ['center', '中心'],
    'setup.billiardsContactTop': ['top', '上方'],
    'setup.billiardsContactTopLeft': ['top left', '左上'],
    'setup.billiardsContactTopRight': ['top right', '右上'],
    'setup.billiardsContactSide': ['side', '侧面'],
    'setup.billiardsContactSideLeft': ['side left', '左侧'],
    'setup.billiardsContactSideRight': ['side right', '右侧'],
    'setup.billiardsContactDraw': ['draw', '下方'],
    'setup.billiardsContactDrawLeft': ['draw left', '左下'],
    'setup.billiardsContactDrawRight': ['draw right', '右下'],
    'setup.billiardsAtlas': ['atlas', '图册'],
    'setup.billiardsOrientation': ['orientation', '方向'],
    'status.billiardsCalculating': ['calculating shot', '正在计算击球'],
    'status.billiardsPhysics': ['deterministic physics is running', '正在运行确定性物理模拟'],
    'status.billiardsWaitingPlayback': ['Move received; waiting for local Billiards playback.', '已收到操作；正在等待本地台球回放。'],
    'setup.moveNumbers': ['move numbers', '显示手数'],
    'setup.minigameSymbols': ['minigame symbols', '小游戏棋子'],
    'setup.mosaicCalculator': ['mosaic calculator', '画布样式'],
    'setup.attackedBackground': ['attacked background', '标出受攻击背景'],
    'setup.pass': ['pass', '停一手'],
    'setup.scoreView': ['score view', '计分视图'],
    'setup.scoreViewOff': ['score view off', '计分视图已关闭'],
    'setup.influenceField': ['influence field', '影响场'],
    'setup.nearestStone': ['nearest stone', '最近棋子'],
    'setup.markGroups': ['mark groups', '标记死棋'],
    'setup.editTerritory': ['edit territory', '编辑领地'],
    'setup.confirmScore': ['confirm score', '确认计分'],
    'setup.fallDown': ['fall down', '向下落子'],
    'setup.fullChainHints': ['full-chain hints', '显示完整连跳提示'],
    'setup.endJump': ['end jump', '结束连跳'],
    'setup.paperSquare': ['paper square', '纸片方块'],
    'setup.inkOutline': ['ink outline', '墨线轮廓'],
    'setup.valueColor': ['value color', '数值配色'],
    'setup.highlight': ['highlight', '高亮'],
    'setup.addRemoveHoles': ['add/remove holes', '添加／移除孔洞'],
    'setup.stepByStep': ['step-by-step', '逐步执行'],
    'setup.nextStep': ['next step', '下一步'],
    'setup.numberEmpty': ['number / empty', '数字／空白'],
    'setup.blueBomb': ['place blue bomb', '放置蓝色炸弹'],
    'setup.redBomb': ['place red bomb', '放置红色炸弹'],
    'setup.clearBomb': ['clear bomb', '清除炸弹'],
    'setup.readyOnline': ['Ready to create or join an online room.', '可以创建或加入在线房间。'],
    'setup.beginFromCanvas': ['begin from canvas', '从画布开始'],
    'setup.rulesStatus': ['quick rules shown; begin here or use the setup panel', '已显示规则；可在此开始，也可使用设置面板'],
    'setup.defaultRules': ['Read the quick rule, then begin the selected game on this glued mosaic.', '阅读规则，然后在此粘合镶嵌上开始所选游戏。'],
    'setup.billiardsSoloRules': ['Pull back from the white cue ball and release to shoot. Balls cross glued edges and rebound from unglued boundaries. Pocket every numbered ball; a scratch gives you ball in hand.', '从白色母球向后拖动并松开击球。球会穿过粘合边，并从未粘合的边界反弹。将所有编号球打入袋中；母球落袋后可以自由摆放母球。'],
    'setup.billiardsCompetitiveRules': ['Pull back from the white cue ball and release to shoot. Balls cross glued edges and rebound from unglued boundaries. Each pocketed numbered ball scores one point and keeps your turn; a miss or scratch passes play, and a scratch gives the opponent ball in hand. After every numbered ball is pocketed, the higher score wins and equal scores draw.', '从白色母球向后拖动并松开击球。球会穿过粘合边，并从未粘合的边界反弹。每打入一个编号球得一分并继续击球；未进球或母球落袋时交换回合，母球落袋还会让对手获得自由球。所有编号球入袋后，得分较高者获胜，同分则为和局。'],
    'setup.gomokuRules': ['Place black and white stones on empty board points. The first player to make a line of five wins.', '在空棋盘交点轮流放置黑白棋子，率先连成五子者获胜。'],
    'setup.connectRules': ['Drop red and yellow tokens through white input holes. Connect four along any board line to win.', '从白色入口投入红黄棋子，沿棋盘任意直线连成四子即可获胜。'],
    'setup.connectSetupRules': ['Click tiles to mark white input holes, then begin. Drop tokens through those holes and connect four to win.', '点击方格标记白色入口后开始游戏；从入口投入棋子并连成四子即可获胜。'],
    'setup.goRules': ['Place stones on empty points; surrounded opposing groups are captured. Pass when both players are done.', '在空交点落子；完全包围对方棋群即可提子。双方结束时请选择停一手。'],
    'setup.reversiRules': ['Place a disc to bracket opposing discs along a line and flip them. Most discs at the end wins.', '落子夹住直线上的对方棋子并将其翻转，终局棋子较多者获胜。'],
    'setup.checkersRules': ['Select one of your marbles, then move or jump through connected cells. Race into the opposite camp.', '选择己方弹珠，沿相邻格移动或连续跳跃，率先进入对面营地。'],
    'setup.hexRules': [
      'Red and blue alternately fill tiles. Create a connected loop with nonzero integral H₁ to win; the pie rule lets Blue swap colors after Red’s first tile.',
      '红蓝双方轮流占据格子。率先形成一个在整数系数第一同调群 H₁ 中代表非零类的连通闭环者获胜；红方首步后，蓝方可按交换规则（pie rule）交换双方颜色。'
      ],
    'setup.checkersJumpRule': ['Jump rule', '跳跃规则'],
    'setup.checkersJumpUnlimited': ['unlimited mirror jump', '不限距离镜像跳跃'],
    'setup.checkersJumpAdjacent': ['adjacent jump only', '仅可跳过相邻棋子'],
    'setup.checkersJumpAdjacentOrTwo': ['adjacent or distance-two jump', '相邻或距离二的跳跃'],
    'setup.playAgain': ['play again', '再来一局'],
    'setup.viewBoard': ['view completed board', '查看完成棋盘'],
    'setup.resultReplayRules': ['Start another round with the same game settings.', '使用相同的游戏设置开始新一局。'],
    'online.prepared': ["I'm prepared", '我准备好了'],
    'online.notPrepared': ['not prepared', '取消准备'],
    'online.suggestRematch': ['suggest rematch', '建议再来一局'],
    'online.acceptRematch': ['accept rematch', '接受再来一局'],
    'online.waitingPlayers': ['waiting for players', '等待玩家'],
    'setup.sokobanRules': ['Move every player together. Push one box at a time onto the targets across the glued board.', '同时移动所有玩家，每次推动一个箱子，穿过粘合棋盘将箱子推到目标上。'],
    'setup.queensRules': ['Rearrange all queens so no queen threatens another across the transported square-board routes.', '重新排列所有后，使任意两个后都不会沿传送后的方格路径互相攻击。'],
    'setup.chessRules': ['Move FIDE chess pieces across transported square-board routes. Checkmate wins; stalemate and dead positions draw.', '沿传送后的方格路径移动国际象棋棋子；将死获胜，逼和与死局为和棋。'],
    'setup.lianliankanRules': ['Match identical tiles through empty cells with an orthogonal path that turns at most twice. Only configured boundary glue may cross the board edge.', '用最多转弯两次的正交路径穿过空格连接相同方块；只有已配置的边界粘合可以跨越棋盘边缘。'],
    'setup.2048Rules': ['Slide boxes with arrow keys, move buttons, or a swipe. Matching powers of two merge; explosions leave clickable bombs. Red bombs clear adjacent numbers and trigger adjacent bombs.', '使用方向键、移动按钮或滑动来移动方块；相同的数字会合并，爆炸后会留下可点击的炸弹。红色炸弹会清除相邻数字并引爆相邻炸弹。'],
    'setup.refreshRemainingTiles': ['Refresh remaining tiles', '刷新剩余方块'],
    'setup.tileSet': ['Tile set', '图案组'],
    'setup.chineseCharacters': ['Chinese characters', '汉字'],
    'setup.japaneseCharacters': ['Japanese characters', '日文假名'],
    'setup.youngDiagrams3x3': ['Young diagrams (3×3)', '杨图（3×3）'],
    'setup.hexStandardPieRule': [
      'standard pie rule',
      '标准交换规则'
      ],
    'setup.hexPieRule': [
      'Pie rule',
      '交换规则'
      ],
    'setup.hexSwapColors': [
      'swap colors',
      '交换颜色'
      ],

    'games.hex': ['Hex (Nash)', '六贯棋'],
    'games.gomoku': ['Gomoku', '五子棋'],
    'games.go': ['Go', '围棋'],
    'games.connectFour': ['Connect Four', '四子棋'],
    'games.reversi': ['Reversi', '黑白棋'],
    'games.checkers': ['Chinese Checkers', '跳棋'],
    'games.sokoban': ['Sokoban', '推箱子'],
    'games.chess': ['FIDE Chess', '国际象棋'],
    'games.billiards': ['Billiard', '台球'],
    'games.lianliankan': ['Tile Matching', '连连看'],
    'games.random': ['Random setup', '随机设置'],
    'games.torus': ['torus', '环面'],
    'games.klein': ['Klein bottle', '克莱因瓶'],
    'games.open': ['open/classic', '开放／经典'],
    'games.randomBoundary': ['random boundary glue', '随机边界粘合'],
    'games.square': ['square', '正方形'],
    'games.rectangle': ['rectangle', '矩形'],
    'games.gridded': ['gridded board', '网格棋盘'],
    'games.polished': ['polished gridded board', '精绘网格棋盘'],
    'games.tileBoard': ['tile board', '方块棋盘'],
    'games.classical': ['classical board', '经典棋盘'],
    'games.billiardsTable': ['billiards table', '台球桌'],
    'games.down': ['down', '下'],
    'games.right': ['right', '右'],
    'games.left': ['left', '左'],
    'games.up': ['up', '上'],
    'games.east': ['east', '东'],
    'games.west': ['west', '西'],
    'games.southeast': ['southeast', '东南'],
    'games.southwest': ['southwest', '西南'],
    'games.northwest': ['northwest', '西北'],
    'games.northeast': ['northeast', '东北'],

    'presets.boundary': ['boundary glue board', '边界粘合棋盘'],
    'presets.fide': ['FIDE chess 8x8', '国际象棋 8×8'],
    'presets.fires': ['between two fires', '两面夹击'],
    'presets.queens': ['N queens puzzle', 'N 皇后谜题'],
    'presets.queensTorus': ['N queens puzzle on torus', '环面上的 N 皇后谜题'],
    'presets.classic4': ['4*4 classic', '4×4 经典'],
    'presets.twistedTorus': ['twisted torus', '扭曲环面'],
    'presets.genus2': ['genus 2', '亏格 2'],
    'presets.random4': ['random glue 4*4', '4×4 随机粘合'],
    'presets.halfGlued': ['half-glued', '半粘合'],
    'presets.ramifiedCover': ['ramified cover', '分歧覆叠'],
    'presets.usualStrip': ['usual strip', '普通带'],
    'presets.mobius': ['Möbius strip', '莫比乌斯带'],
    'presets.hexClassic': ['hex classic 4*4', '六角格 4×4 经典'],
    'presets.tictactoe': ['Tic-tac-toe', '井字棋'],
    'presets.strangeCorner': ['strange corner', '奇异角点'],
    'presets.smallHoles': ['small holes', '小孔'],
    'presets.bigHole': ['big hole', '大孔'],
    'presets.reflex': ['reflex angle', '优角'],
    'presets.wormhole': ['wormhole', '虫洞'],
    'presets.genus4': ['genus 4', '亏格 4'],
    'presets.trefoil': ['trefoil', '三叶结'],
    'presets.connect67': ['Connect Four 6*7', '四子棋 6×7'],
    'presets.highHit': ['high hit', '高位击落'],
    'presets.highHit2': ['high hit2', '高位击落 2'],
    'presets.horizontal': ['all horizontal', '全部水平'],
    'presets.topFight': ['top fight', '顶部争夺'],
    'presets.exchange': ['exchange', '交换'],
    'presets.across': ['across', '穿越'],
    'presets.hexStrip': ['hex usual strip', '普通六角带'],
    'presets.twoWays': ['falling in two ways', '双向下落'],
    'presets.badMobius': ['hex bad Möbius strip', '不良粘合Möbius strip'],
    'presets.goodMobius': ['hex good Möbius strip', '良好粘合Möbius strip'],
    'presets.threeSlits': ['three_slits', '三条狭缝'],
    'presets.rhombus': ['hex rhombus', '六角菱形'],
    'presets.strip99': ['hex strip 9*9', '六角带 9×9'],
    'presets.tunnels': ['tunnels', '隧道'],
    'presets.classicCheckers': ['classic chinese checkers', '经典跳棋'],
    'presets.octaHoles': ['octahedron with square holes', '带方孔的八面体'],
    'presets.octaGlues': ['octahedron with square glues', '方形粘合的八面体'],
    'presets.dodeca': ['dodecahedron with pentagon holes', '带五边形孔的十二面体'],
    'presets.focus': ['focus frame', '取景框'],
    'presets.fans': ['classic_fans', '经典风扇'],
    'presets.pedestrian': ['Pedestrian', '行人'],
    'presets.fansGlue': ['classic_fans_glue', '风扇粘合'],
    'presets.ice': ['ice_test', '滑冰测试'],
    'presets.curlCube': ['curling on Cube', '立方体冰壶'],
    'presets.energy': ['energy_test', '能量桥测试'],
    'presets.cross': ['cross', '十字'],
    'presets.expand': ['expand', '扩展'],
    'presets.expand2': ['expand2', '扩展 2'],
    'presets.expand3': ['expand3', '扩展 3'],
    'presets.bridges': ['bridges_blocking', '能量桥阻挡(无解?)'],
    'presets.orbox': ['Orbox B', 'Orbox B'],
    'presets.orboxGlue': ['Orbox B glued', 'Orbox B+传送门'],
    'presets.loop': ['loop', '环路'],
    'presets.curling': ['curling', '冰壶'],
    'presets.glueTest': ['glue_test', '粘合测试'],
    'presets.remoteRotate': ['remote rotate', '远程旋转'],
    'presets.remoteControl': ['remote control', '远程控制'],
    'presets.islands': ['islands', '岛屿'],
    'presets.knightsCube': ["knights on Rubik's Cube", '魔方上的骑士'],
    'presets.queensCover': ['queens on double cover', '二重覆叠上的皇后'],

    'online.title': ['Online Play', '在线游戏'],
    'online.room': ['Room', '房间'],
    'online.name': ['Name', '昵称'],
    'online.side': ['Side', '阵营'],
    'online.roomCode': ['room code', '房间代码'],
    'online.playerName': ['player name', '玩家昵称'],
    'online.create': ['create room', '创建房间'],
    'online.search': ['search room', '搜索房间'],
    'online.join': ['join room', '加入房间'],
    'online.leave': ['leave room', '离开房间'],
    'online.confirmColors': ['confirm colors', '确认颜色'],
    'online.keepColors': ['keep unclaimed colors', '保留无人选择的颜色'],
    'online.beginColors': ['begin claimed colors', '按已选颜色开始'],
    'online.notConfigured': ['Online Worker URL is not configured.', '尚未配置在线服务地址。'],
    'online.autoSide': ['auto side', '自动分配阵营'],

    'io.title': ['Import / Export', '导入／导出'],
    'io.tabExport': ['Export', '导出'],
    'io.tabImport': ['Import', '导入'],
    'io.keepMode': ['keep current game type', '保留当前游戏类型'],
    'io.importGame': ['Import game', '导入游戏'],
    'io.source': ['Source', '来源'],
    'io.catalog': ['Catalog', '目录'],
    'io.catalogPreset': ['Catalog preset', '目录预设'],
    'io.pastePreset': ['Paste preset', '粘贴预设'],
    'io.pasteJson': ['Paste JSON', '粘贴 JSON'],
    'io.localFile': ['Local file', '本地文件'],
    'io.chooseFile': ['Choose JSON file', '选择 JSON 文件'],
    'io.pastePlaceholder': ['Paste preset, status, or game-record JSON', '粘贴预设、状态或游戏记录 JSON'],
    'io.exportLabel': ['Export', '导出'],
    'io.exportKind': ['Export kind', '导出类型'],
    'io.exportContent': ['Export content', '导出内容'],
    'io.editInMosaicCalculator': ['edit in Mosaic calculator', '在马赛克计算器中编辑'],
    'io.importContent': ['Import content', '导入内容'],
    'io.importPayloadContent': ['Preset or game status', '预设或游戏状态'],
    'io.backgroundPreset': ['Background preset', '背景预设'],
    'io.fullStatus': ['Full current status', '完整当前状态'],
    'io.gameRecord': ['Game record', '游戏记录'],
    'io.format': ['Format', '格式'],
    'io.dsl': ['DSL-style', 'DSL 格式'],
    'io.verboseJson': ['Verbose JSON', '完整 JSON'],
    'io.autoDetect': ['Automatically detect', '自动检测'],
    'io.detectedFormat': ['{{format}} detected', '已检测为 {{format}}'],
    'io.detectedContent': ['{{content}} detected', '已检测为 {{content}}'],
    'io.importDetected': ['{{content}} · {{format}} is ready to import.', '已识别 {{content}} · {{format}}，可以导入。'],
    'io.builtInPreset': ['Built-in preset', '内置预设'],
    'io.panelReady': ['Choose an import or export action.', '请选择导入或导出操作。'],
    'io.exportRefreshed': ['Export preview refreshed.', '已刷新导出预览。'],
    'io.exportCopied': ['Export copied to the clipboard.', '已将导出内容复制到剪贴板。'],
    'io.exportDownloaded': ['Export downloaded.', '已下载导出文件。'],
    'io.nothingToCopy': ['Generate an export before copying.', '请先生成导出预览，再进行复制。'],
    'io.nothingToDownload': ['Generate an export before downloading.', '请先生成导出预览，再进行下载。'],
    'io.clipboardUnavailable': ['Clipboard access is unavailable.', '无法访问剪贴板。'],
    'io.fileReading': ['Reading {{filename}}…', '正在读取 {{filename}}…'],
    'io.fileReady': ['{{filename}} is ready to import.', '{{filename}} 已通过验证，可以导入。'],
    'io.fileRequired': ['Choose a JSON file first.', '请先选择 JSON 文件。'],
    'io.importRequired': ['Paste JSON to import.', '请粘贴要导入的 JSON。'],
    'io.importComplete': ['Import complete.', '导入完成。'],
    'io.importCancelled': ['Import cancelled; the current game was not changed.', '已取消导入；当前游戏未更改。'],
    'io.importCleared': ['Import input cleared.', '已清除导入内容。'],
    'io.operationFailed': ['{{message}}', '{{message}}'],
    'io.replaceConfirm': ['Importing will replace the active game. Continue?', '导入将替换当前游戏。是否继续？'],
    'io.recordsAvailable': ['Game records are available for Hex, Billiard, Gomoku, Go, Connect Four, Reversi, and FIDE Chess.', '游戏记录支持六贯棋、台球、五子棋、围棋、四子棋、黑白棋和国际象棋。'],
    'io.gameUnavailable': ['The game is not ready to export.', '游戏尚未准备好，无法导出。'],

    'status.stats': ['Game Stats', '游戏统计'],
    'status.result': ['Result', '结果'],
    'status.turn': ['Turn', '轮到'],
    'status.highest': ['Highest tile', '最高方块'],
    'status.existing': ['Existing tiles', '现有方块'],
    'status.blocked': ['Blocked tiles', '阻塞方块'],
    'status.removed': ['Removed tiles', '已移除方块'],
    'status.round': ['Round', '回合'],
    'status.moves': ['Moves', '步数'],
    'status.drops': ['Drops', '落子数'],
    'status.blackStones': ['Black stones', '黑子'],
    'status.whiteStones': ['White stones', '白子'],
    'status.redTokens': ['Red tokens', '红色棋子'],
    'status.yellowTokens': ['Yellow tokens', '黄色棋子'],
    'status.blackDiscs': ['Black discs', '黑棋'],
    'status.whiteDiscs': ['White discs', '白棋'],
    'status.blackScore': ['Black score', '黑方得分'],
    'status.whiteScore': ['White score', '白方得分'],
    'status.neutral': ['Neutral', '中立区域'],
    'status.boxes': ['Boxes', '箱子'],
    'status.targets': ['Targets', '目标'],
    'status.walls': ['Walls', '墙壁'],
    'status.solved': ['solved', '已解开'],
    'status.placed': ['Placed', '已放置'],
    'status.waiting': ['Waiting', '待放置'],
    'status.arrange': ['Arrange', '摆放'],
    'status.whitePieces': ['White pieces', '白方棋子'],
    'status.blackPieces': ['Black pieces', '黑方棋子'],
    'status.check': ['Check', '将军'],
    'status.players': ['Players', '玩家'],
    'status.otherMarbles': ['Other marbles', '其他弹珠']
    , 'status.draw': ['draw', '和局']
    , 'status.review': ['review', '计分确认']
    , 'status.none': ['none', '无']
    , 'status.puzzle': ['Puzzle', '谜题']
    , 'status.black': ['Black', '黑方']
    , 'status.white': ['White', '白方']
    , 'status.red': ['Red', '红方']
    , 'status.yellow': ['Yellow', '黄方']
    , 'status.green': ['Green', '绿方']
    , 'status.blue': ['Blue', '蓝方']
    , 'status.orange': ['Orange', '橙方']
    , 'status.purple': ['Purple', '紫方']
    , 'status.gameOver': ['game over', '游戏结束']
    , 'status.bonusEnding': ['bonus ending', '奖励结局']
    , 'status.sokobanSolved': ['Sokoban solved', '推箱子完成']
    , 'status.lianliankanMatch': ['Tile Matching match', '连连看配对']
    , 'status.lianliankanComplete': ['Tile Matching complete', '连连看完成']
    , 'status.lianliankanHint': ['Tile Matching hint', '连连看提示']
    , 'status.connectedPathFound': ['connected path found', '已找到连接路径']
    , 'status.hintPathShown': ['a legal path is shown', '已显示一条可用路径']
    , 'status.resetQuestion': ['Reset this game?', '重置本局游戏？']
    , 'status.resetComplete': ['reset complete', '重置完成']
    , 'status.lianliankanRestarted': ['Tile Matching restarted', '连连看已重新开始']
    , 'status.useRefreshToContinue': ['use Refresh to continue', '请刷新后继续']
    , 'status.noLianliankanMatches': ['No more tile matches are available', '没有可用的配对']
    , 'status.matches': ['Matches', '配对次数']
    , 'status.tilesLeft': ['Tiles left', '剩余方块']
    , 'status.legalMatch': ['Legal match', '存在可配对方块']
    , 'status.refreshes': ['Refreshes', '刷新次数']
    , 'status.pairsCleared': ['Pairs cleared', '已消除对数']
    , 'status.complete': ['complete', '完成']
    , 'runtime.playerNumber': ['Player {{number}}', '玩家 {{number}}']
    , 'runtime.spectator': ['spectator', '旁观者']
    , 'runtime.winner': ['{{side}} wins', '{{side}}获胜！']
    , 'runtime.drawResult': ['{{game}} draw', '{{game}}和局']
    , 'runtime.gameComplete': ['Game complete', '游戏完成']
    , 'runtime.gameCompleteForGame': ['{{game}} complete', '{{game}}完成']
    , 'runtime.restarted': ['{{game}} restarted', '{{game}}已重新开始']
    , 'runtime.moveStatus': ['{{game}} move {{count}}', '{{game}}第{{count}}步']
    , 'runtime.dropStatus': ['{{game}} drop {{count}}', '{{game}}第{{count}}次落子']
    , 'runtime.shotStatus': ['{{game}} shot {{count}}', '{{game}}第{{count}}杆']
    , 'runtime.billiardsSetupSummary': ['{{targets}}, {{pockets}}{{issue}}', '{{targets}}，{{pockets}}{{issue}}']
    , 'runtime.billiardsIssueSuffix': ['; {{issue}}', '；{{issue}}']
    , 'runtime.billiardsTargetOne': ['{{count}} target', '{{count}}个目标球']
    , 'runtime.billiardsTargetMany': ['{{count}} targets', '{{count}}个目标球']
    , 'runtime.billiardsPocketOne': ['{{count}} pocket', '{{count}}个袋口']
    , 'runtime.billiardsPocketMany': ['{{count}} pockets', '{{count}}个袋口']
    , 'runtime.billiardsShotOne': ['{{count}} shot', '{{count}}杆']
    , 'runtime.billiardsShotMany': ['{{count}} shots', '{{count}}杆']
    , 'runtime.billiardsTargetsRemaining': ['{{targets}} remaining', '剩余{{targets}}']
    , 'runtime.billiardsPractice': ['practice', '练习模式']
    , 'runtime.billiardsPocketed': ['{{targets}} pocketed', '已进{{targets}}']
    , 'runtime.billiardsBallInHand': ['Billiards ball in hand', '台球自由球']
    , 'runtime.billiardsPlaceCue': ['{{player}} places the cue ball', '{{player}}放置母球']
    , 'runtime.billiardsDraw': ['Billiards draw', '台球和局']
    , 'runtime.billiardsScoreSolo': ['{{targets}} in {{shots}}', '{{targets}}，共{{shots}}']
    , 'runtime.billiardsScorePlayer': ['Player {{number}} {{score}}', '玩家{{number}}：{{score}}']
    , 'runtime.billiardsCueRequired': ['place exactly one cue ball', '必须且只能放置一个母球']
    , 'runtime.billiardsPointInsideTile': ['choose a point inside an existing tile', '请选择现有方块内的位置']
    , 'runtime.billiardsPhysicalBoundary': ['ball intersects a physical boundary', '球与实体边界相交']
    , 'runtime.billiardsPocketCollision': ['ball intersects a pocket', '球与袋口相交']
    , 'runtime.billiardsBallCollision': ['ball overlaps another ball', '球与另一颗球重叠']
    , 'runtime.billiardsSelfCollision': ['ball overlaps its own short glued image', '球与自身的粘合像重叠']
    , 'runtime.billiardsRackNoFit': ['rack does not fit on this tile', '球框无法放入此方块']
    , 'runtime.billiardsRackCollision': ['rack does not fit: {{issue}}', '球框无法放置：{{issue}}']
    , 'runtime.billiardsRackDirection': ['choose a second point to set the rack direction', '请点击第二个点设置球框方向']
    , 'runtime.billiardsRackCenter': ['rack center selected', '已选择球框中心']
    , 'runtime.billiardsRackChooseDirection': ['click a second point to set the rack direction', '请点击第二个点设置球框方向']
    , 'runtime.billiardsRackChooseCenter': ['click to set the rack center', '点击设置球框中心']
    , 'runtime.billiardsHoverBlocked': ['cannot: {{reason}}', '无法放置：{{reason}}']
    , 'runtime.billiardsHoverRemovePocket': ['click to remove pocket', '点击移除袋口']
    , 'runtime.billiardsHoverErasePocket': ['click to erase pocket', '点击擦除袋口']
    , 'runtime.billiardsHoverEraseBall': ['click to erase ball', '点击擦除球']
    , 'runtime.billiardsHoverMove': ['drop to move', '松开以移动']
    , 'runtime.billiardsHoverAddPocket': ['click to add pocket', '点击添加袋口']
    , 'runtime.billiardsHoverPlaceCue': ['click to place cue ball', '点击放置母球']
    , 'runtime.billiardsHoverPlaceBall': ['click to place ball {{number}}', '点击放置{{number}}号球']
    , 'runtime.billiardsCueHintTitle': ['Aim from the white cue ball', '从白色母球瞄准']
    , 'runtime.billiardsCueHint': ['Click the white cue ball and drag away from the intended shot; it travels in the opposite direction.', '点击白色母球，并向目标反方向拖动；母球会沿相反方向前进。']
    , 'runtime.puzzleStatus': ['{{game}} puzzle {{count}}', '{{game}}谜题第{{count}}步']
    , 'runtime.toMove': ['to move', '行棋']
    , 'runtime.toPlay': ['to play', '落子']
    , 'runtime.toDrop': ['to drop', '落子']
    , 'runtime.toShoot': ['to shoot', '击球']
    , 'runtime.jumping': ['jumping', '连跳中']
    , 'runtime.roleAction': ['{{role}} {{action}}', '{{role}}{{action}}']
    , 'runtime.komiSuffix': ['; komi {{komi}}', '；贴目 {{komi}}']
    , 'runtime.fallingSuffix': ['; falling {{direction}}', '；向{{direction}}落子']
    , 'runtime.jumpSuffix': ['; choose next jump or end jump', '；请选择下一跳或结束连跳']
  };

  const english = {};
  const chinese = {};
  Object.entries(pairs).forEach(([key, values]) => {
    english[key] = values[0];
    chinese[key] = values[1];
  });
  // These stable aliases let legacy HTML/JS find a key even after its editable
  // English wording changes above. Translation edits belong in `pairs` only.
  english.__sources = window.RAMIFIED_MINIGAMES_I18N_LEGACY_SOURCES || {};
  chinese.__intentionalEnglish = ['CD'];
  english.__patterns = [
    ['^(.+) to move$', '$1 to move'],
    ['^(.+) quick rules$', '$1 quick rules'],
    ['^(.+) on (.+)$', '$1 on $2'],
    ['^(.+) wins!?$', '$1 wins'],
    ['^winner: (.+)$', 'winner: $1'],
    ['^[Rr]oom (.+)$', 'Room $1'],
    ['^(\\d+) moves$', '$1 moves'],
    ['^(\\d+) move$', '$1 move'],
    ['^(\\d+) drops$', '$1 drops'],
    ['^(\\d+) drop$', '$1 drop'],
    ['^(\\d+) pushes$', '$1 pushes'],
    ['^(\\d+) push$', '$1 push'],
    ['^(\\d+) tiles$', '$1 tiles'],
    ['^score: (.+)$', 'score: $1'],
    ['^turn: (.+)$', 'turn: $1'],
    ['^(.+) marbles$', '$1 marbles'],
    ['^(.+) pieces$', '$1 pieces'],
    ['^(.+) stones$', '$1 stones'],
    ['^(.+) discs$', '$1 discs']
    ];
  chinese.__patterns = [
    ['^(.+) to move$', '轮到$1'],
    ['^(.+) quick rules$', '$1规则'],
    ['^(.+) on (.+)$', '$1｜$2'],
    ['^(.+) wins!?$', '$1获胜！'],
    ['^(.+) restarted$', '$1已重新开始'],
    ['^winner: (.+)$', '获胜者：$1'],
    ['^[Rr]oom (.+)$', '房间 $1'],
    ['^(\\d+) moves$', '$1 步'],
    ['^(\\d+) move$', '$1 步'],
    ['^(\\d+) drops$', '$1 次落子'],
    ['^(\\d+) drop$', '$1 次落子'],
    ['^(\\d+) pushes$', '$1 次推动'],
    ['^(\\d+) push$', '$1 次推动'],
    ['^(\\d+) tiles$', '$1 个方块'],
    ['^score: (.+)$', '得分：$1'],
    ['^turn: (.+)$', '轮到：$1'],
    ['^(.+) marbles$', '$1弹珠'],
    ['^(.+) pieces$', '$1棋子'],
    ['^(.+) stones$', '$1棋子'],
    ['^(.+) discs$', '$1棋子'],
    ['^connected to (.+)$', '已连接至 $1'],
    ['^joined room (.+)$', '已加入房间 $1'],
    ['^created room (.+)$', '已创建房间 $1'],
    ['^Copied\\.?$', '已复制。'],
    ['^Copy failed\\.?$', '复制失败。']
    , ['^(.+) draw$', '$1和局']
    , ['^score (\\d+)   highest (\\d+)$', '得分 $1　最高方块 $2']
    , ['^(.+) in check$', '$1被将军']
    , ['^(.+) Sokoban preview$', '$1推箱子预览']
    , ['^(\\d+) ms/edge$', '$1 毫秒／边']
    , ['^(\\d+) tiles; paths may turn at most twice$', '$1 个方块；路径最多允许转弯两次']
    , ['^(\\d+) matches cleared the board$', '已配对 $1 次，棋盘已清空']
    , ['^(\\d+) tiles remain; use Refresh to continue$', '还剩 $1 个方块；请刷新后继续']
    , ['^(\\d+) tiles remaining$', '还剩 $1 个方块']
    , ['^(.+) selected; (\\d+) tiles remaining$', '已选择 $1；还剩 $2 个方块']
    , ['^Tile Matching match (\\d+)$', '连连看｜已配对 $1 次']
    , ['^(\\d+) tiles, (\\d+) matches, (\\d+) refreshes$', '$1 个方块，$2 次配对，$3 次刷新']
    , ['^(\\d+) pair cleared$', '已消除 $1 对']
    , ['^(\\d+) pairs cleared$', '已消除 $1 对']
    , ['^(\\d+)x(\\d+), (.+), (\\d+) unmatched, (\\d+) removed, (\\d+) cut, (\\d+) glued$', '$1×$2，$3，$4 条未匹配边，$5 个已移除，$6 条切边，$7 条粘合边']
    ];
  chinese.__fragments = {
    'Online play unavailable.': '在线游戏不可用。',
    'Waiting for colors.': '正在等待颜色选择。',
    'waiting for opponent approval': '正在等待对手同意',
    'waiting for opponent': '正在等待对手',
    'Ready to create or join an online room.': '可以创建或加入在线房间。',
    'game not started': '游戏尚未开始',
    'begin from canvas': '从画布开始',
    'quick rules shown': '已显示规则',
    'may swap colors': '可交换颜色',
    'to move': '行动',
    'game over': '游戏结束',
    'wins': '获胜',
    'draw': '和局',
    'in check': '被将军',
    'unmatched': '未匹配',
    'removed': '已移除',
    'glued': '已粘合',
    'cut': '切边',
    'moves': '步',
    'move': '步',
    'drops': '次落子',
    'drop': '次落子',
    'pushes': '次推动',
    'push': '次推动',
    'score': '得分',
    'highest': '最高方块',
    'Room': '房间',
    'Player': '玩家'
    , 'Chinese Checkers': '跳棋'
    , 'Hex (Nash)': '六贯棋'
    , 'Gomoku': '五子棋'
    , 'Connect Four': '四子棋'
    , 'Reversi': '黑白棋'
    , 'Sokoban': '推箱子'
    , 'Billiards': '台球'
    , 'Billiard': '台球'
    , 'Tile Matching': '连连看'
    , 'FIDE Chess': '国际象棋'
    , 'Black': '黑方'
    , 'White': '白方'
    , 'Red': '红方'
    , 'Yellow': '黄方'
    , 'Green': '绿方'
    , 'Blue': '蓝方'
    , 'Orange': '橙方'
    , 'Purple': '紫方'
    , 'black': '黑方'
    , 'white': '白方'
    , 'red': '红方'
    , 'yellow': '黄方'
    , 'green': '绿方'
    , 'blue': '蓝方'
    , 'orange': '橙方'
    , 'purple': '紫方'
    , 'pawn': '兵'
    , 'rook': '车'
    , 'knight': '马'
    , 'bishop': '象'
    , 'queen': '后'
    , 'king': '王'
    , 'piece': '棋子'
  };
  // English fragments are identity mappings by default. If a dynamically
  // assembled English phrase needs correction, change its replacement here.
  english.__fragments = {
    'Online play unavailable.': 'Online play unavailable.',
    'Waiting for colors.': 'Waiting for colors.',
    'waiting for opponent approval': 'waiting for opponent approval',
    'waiting for opponent': 'waiting for opponent',
    'game not started': 'game not started',
    'begin from canvas': 'begin from canvas',
    'quick rules shown': 'quick rules shown',
    'to move': 'to move',
    'game over': 'game over',
    'wins': 'wins',
    'draw': 'draw',
    'in check': 'in check'
  };

  window.SiteI18n.register('ramified-minigames', 'en', english);
  window.SiteI18n.register('ramified-minigames', 'zh-CN', chinese);

  document.addEventListener('DOMContentLoaded', () => {
    window.SiteI18n.init({
      namespace: 'ramified-minigames',
      defaultLocale: 'en',
      supportedLocales: ['en', 'zh-CN']
    });
  });
})();
