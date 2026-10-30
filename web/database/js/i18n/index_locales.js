(() => {
  'use strict';
  const pairs = {
    'index.title': ['Math Workspace | Pure Math Toolkit', '数学工作区 | Pure Math Toolkit'],
    'index.description': ['A browser-based workspace for creating and comparing mathematical objects, plus a theorem graph editor and games on glued surfaces.', '浏览器中的数学工作区，用于创建和比较数学对象，并提供定理依赖图和粘合空间上的小游戏。'],
    'index.navigation': ['Main', '主导航'],
    'index.language': ['Language', '语言'],
    'index.workspace': ['Math Workspace', '数学工作区'],
    'index.graphShort': ['Theorem Graph', '定理依赖图'],
    'index.gamesShort': ['Minigames', '小游戏'],
    'index.lead': ['Create, edit and compare mathematical objects, from Young diagrams and Lie types to lattices, fans and mosaic diagrams, in one window.', '在同一个窗口中创建、编辑和比较数学对象，从杨图、李型，到格、扇和镶嵌图。'],
    'index.openWorkspace': ['Open the workspace', '打开数学工作区'],
    'index.tutorial': ['Tutorial: in preparation', '使用教程尚在筹备'],
    'index.note': ['Some parts are still being fixed. The classic index at the bottom of this page has the same calculators as separate pages.', '部分功能仍在完善。如遇问题，可通过页底的旧版入口使用独立计算器。'],
    'index.more': ['Also on this site', '其他工具'],
    'index.graph': ['Theorem Graph Calculator', '定理依赖图工具'],
    'index.graphDescription': ['Build a dependency graph of theorem, lemma, conjecture and reference nodes, and see what rests on what.', '连接定理、引理、猜想与文献，梳理数学论证的依赖关系。'],
    'index.openGraph': ['Open Theorem Graph Calculator', '打开定理依赖图'],
    'index.games': ['Ramified Minigames', 'Ramified 小游戏'],
    'index.gamesDescription': ['Play 2048, Connect Four, Gomoku, Go, Reversi, Sokoban, Hex, chess, Chinese Checkers, billiards and tile matching on boards with glued edges.', '在带有粘合边界的棋盘上玩 2048、四子棋、五子棋、围棋、黑白棋、推箱子、六贯棋、国际象棋、跳棋、台球与连连看。'],
    'index.playGames': ['Play Ramified Minigames', '进入小游戏'],
    'index.classic': ['Classic index', '旧版计算器目录'],
    'index.classicDescription': ['The separate calculators and earlier prototypes, laid out the way they used to be.', '保留原有布局的独立计算器与早期原型。'],
    'index.openClassic': ['Open the classic index', '打开旧版目录'],
    'index.bibliography': ['Bibliography', '参考文献'],
    'index.resources': ['Databases and atlases worth knowing', '数学数据库与图集'],
    'index.feedback': ['Send feedback', '反馈问题'],
    'index.acknowledgements': ['Acknowledgements', '致谢'],
    'index.diagram.label': ['Sketch of the workspace: a main Assets area with object tiles on the left, and a Statistics panel for a Young diagram on the right.', '工作区示意图：左侧是 Assets 区域和各类数学对象的图块，右侧是杨图的 Statistics 面板。'],
    'index.diagram.title': ['Math Workspace sketch', '数学工作区示意图'],
    'index.diagram.description': ['Assets tiles for a Young diagram, a Lie type, a matrix and a mosaic diagram, beside a Statistics panel for the Young diagram λ = (3, 2, 1): size 6, hook length product 45, 16 standard tableaux, and 280 semistandard tableaux with entries at most 5.', '左侧是杨图、李型、矩阵和镶嵌图的图块；右侧是杨图 λ = (3, 2, 1) 的统计面板：大小 6，钩长乘积 45，标准杨表 16 个，元素不超过 5 的半标准杨表 280 个。'],
    'index.diagram.session': ['untitled session', '未命名会话'],
    'index.diagram.assets': ['Assets', '数学对象'],
    'index.diagram.variety': ['variety, P²', '代数簇 P²'],
    'index.diagram.young': ['Young diagram', '杨图'],
    'index.diagram.tableaux': ['35 standard tableaux', '35 个标准杨表'],
    'index.diagram.sheaf': ['Sheaf', '层'],
    'index.diagram.sheafSpace': ['O(1) on ', 'O(1) 于 '],
    'index.diagram.sheafP2': ['O(1) on P²', 'P² 上的 O(1)'],
    'index.diagram.matrix': ['Matrix', '矩阵'],
    'index.diagram.dynkin': ['Dynkin diagram', 'Dynkin 图'],
    'index.diagram.rank': ['A₄, rank 4', 'A₄，秩 4'],
    'index.diagram.roots': ['10 positive roots', '10 个正根'],
    'index.diagram.reference': ['Ref', '文献'],
    'index.diagram.lemma1': ['Lemma 1', '引理 1'],
    'index.diagram.lemma2': ['Lemma 2', '引理 2'],
    'index.diagram.theorem': ['Theorem', '定理'],
    'index.diagram.conjecture': ['Conjecture', '猜想'],
    'index.ack.youngTitle': ['Young Diagram Calculator', '杨图计算器'],
    'index.ack.young': [', the original combinatorics applet it follows most directly.', '，是本工具最直接参考的组合数学小程序。'],
    'index.ack.lieTitle': ['Young Diagram², slices, Dynkin diagrams', '杨图²、截面与 Dynkin 图'],
    'index.ack.lie': [' guided the two-dimensional slice view and influenced the Dynkin diagram calculator.', '为二维截面视图提供了参考，也启发了 Dynkin 图计算器的设计。'],
    'index.ack.gamesTitle': ['Slices, minigames, mosaics', '截面、小游戏与镶嵌图'],
    'index.ack.games': ['Interaction, puzzle and explainer ideas from ', '交互、谜题与讲解设计参考：'],
    'index.ack.and': [' and ', '以及 '],
    'index.ack.mosaicTitle': ['Mosaic Calculator', '镶嵌图计算器'],
    'index.ack.hexapipes': [' for the canvas interaction, ', '提供了画布交互方面的参考，'],
    'index.ack.knotfolio': [' for identifying drawn knots, and ', '提供了绘图识别纽结方面的参考，'],
    'index.ack.knotinfo': [' for naming conventions and database context.', '提供了命名规范与数据库方面的参考。'],
    'index.ack.sheafTitle': ['Sheaf Calculator', '层计算器'],
    'index.ack.cohomology': ['cohomology tables', '上同调表'],
    'index.ack.quiver': [', for arrow type controls and endpoint vocabulary.', '提供了箭头类型控件和端点术语方面的参考。'],
    'index.ack.placeTitle': ['Place Ramification Calculator', '素位分歧计算器'],
    'index.ack.lmfdb': [', for database style and number-theory organization.', '提供了数据库风格与数论内容组织方面的参考。']
  };
  for (const [index, locale] of ['en', 'zh-CN'].entries()) {
    window.SiteI18n.register('ramified-index', locale,
      Object.fromEntries(Object.entries(pairs).map(([key, pair]) => [key, pair[index]])));
  }
  function updateMetadata() {
    document.querySelectorAll('[data-i18n-content]').forEach(node => {
      node.content = window.SiteI18n.t(node.dataset.i18nContent);
    });
  }
  window.SiteI18n.init({ namespace: 'ramified-index', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'] });
  document.addEventListener('site-language-change', updateMetadata);
  updateMetadata();
})();
