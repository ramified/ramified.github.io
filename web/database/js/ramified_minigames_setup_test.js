const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const game = require('./ramified_minigames_setup.js');
const presetRegistrySource = require('../ramified_minigame_presets/presets.js');
const presetRegistry = presetRegistrySource.presets;
const presetDefaultFor = presetRegistrySource.defaultFor;
const presetDataByKey = Object.fromEntries(
  presetRegistry.map((entry) => [entry.key, require(`../ramified_minigame_presets/${entry.file}`)])
);

function billiardsPaletteCanvas() {
  const paintedFills = [];
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    direction: '',
    textAlign: '',
    textBaseline: '',
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() { paintedFills.push(this.fillStyle); },
    stroke() {},
    fillText() {}
  };
  return {
    width: 64,
    paintedFills,
    getContext() { return context; }
  };
}

function testBilliardsPaletteRepaintsAfterLazyLoad() {
  const ballOne = billiardsPaletteCanvas();
  const ballTwo = billiardsPaletteCanvas();
  const buttons = [
    { dataset: { ballKey: '1' }, querySelector: () => ballOne },
    { dataset: { ballKey: '2' }, querySelector: () => ballTwo }
  ];
  game.__test.redrawBilliardsBallPalette({
    querySelectorAll: () => buttons
  });
  assert.strictEqual(ballOne.paintedFills[0], '#f1c84c');
  assert.strictEqual(ballTwo.paintedFills[0], '#2f70bb');
  assert.notStrictEqual(ballOne.paintedFills[0], ballTwo.paintedFills[0]);
}

function testBilliardsCueGuidanceAndQuickRules() {
  assert.deepStrictEqual(
    game.__test.billiardsCueGuidanceFlags(true, false, 0, 100),
    { caption: false, highlight: true, transient: false }
  );
  assert.deepStrictEqual(
    game.__test.billiardsCueGuidanceFlags(true, true, 5000, 1000),
    { caption: true, highlight: true, transient: true }
  );
  assert.deepStrictEqual(
    game.__test.billiardsCueGuidanceFlags(true, true, 5000, 5000),
    { caption: false, highlight: false, transient: false }
  );
  assert.deepStrictEqual(
    game.__test.billiardsCueGuidanceFlags(false, false, 5000, 1000),
    { caption: false, highlight: false, transient: false }
  );

  const measureContext = {
    font: '',
    measureText(text) { return { width: Array.from(String(text)).length * 7 }; }
  };
  const caption = game.__test.billiardsCueCaptionLayout(
    measureContext,
    320,
    240,
    'Click the white cue ball and drag away from the intended shot; it travels in the opposite direction.'
  );
  assert.ok(caption.lines.length > 1);
  assert.strictEqual(caption.x + caption.width / 2, 160);
  assert.strictEqual(caption.y + caption.height, 228);
  assert.ok(caption.width <= 304);

  const preset = { id: 'billiards-rules-test', label: 'Billiards rules test' };
  const solo = game.__test.canvasStartPromptCopy({ gameMode: game.GAME_MODES.BILLIARDS, preset, rules: 'solo' });
  const competitive = game.__test.canvasStartPromptCopy({ gameMode: game.GAME_MODES.BILLIARDS, preset, rules: 'competitive' });
  assert.ok(solo.rules.includes('Pocket every numbered ball'));
  assert.ok(solo.rules.includes('glued edges'));
  assert.ok(competitive.rules.includes('Each pocketed numbered ball scores one point'));
  assert.ok(competitive.rules.includes('equal scores draw'));
  assert.ok(!solo.rules.includes('powers of two'));
  assert.ok(!competitive.rules.includes('powers of two'));

  const setupSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const nativeSource = fs.readFileSync(require.resolve('./billiards/topological_billiards_native.js'), 'utf8');
  assert.match(setupSource, /if \(!local\) \{\s+showBilliardsCueHint\(\);/);
  assert.match(setupSource, /drawCanvasFeedbackOverlays[\s\S]{0,600}drawBilliardsCueCaption\(/);
  assert.match(setupSource, /drawCanvasFeedbackOverlays[\s\S]{0,320}wrappedHexGlueContextOverlayActive[\s\S]{0,180}drawWrappedHexGlueContextOverlay/);
  assert.ok(!nativeSource.includes('view.cueHintLabel'));
}

function testBilliardsDisplaySpaceShotDrag() {
  const direct = game.__test.billiardsShotDragFromDisplayPoints({ x: 12, y: 10 }, { x: 2, y: 10 });
  assert.strictEqual(direct.distance, 10);
  assert.deepStrictEqual(direct.aim, { x: 1, y: 0 });

  const reflected = game.__test.billiardsShotDragFromDisplayPoints(
    { x: 12, y: 10 },
    { x: 2, y: 4 },
    { x: 'reflect-y' },
    1
  );
  assert.ok(Math.abs(reflected.distance - Math.sqrt(136)) < 1e-12);
  assert.ok(Math.abs(reflected.aim.x - (10 / Math.sqrt(136))) < 1e-12);
  assert.ok(Math.abs(reflected.aim.y + (6 / Math.sqrt(136))) < 1e-12);

  const shortDrag = game.__test.billiardsShotDragFromDisplayPoints({ x: 10, y: 10 }, { x: 9, y: 10 });
  assert.strictEqual(shortDrag.distance, 1);
  assert.strictEqual(shortDrag.aim, null);
}

function testQuickRulesFadeAndHexSameTileHoverPersistence() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('animation: canvas-start-sheet-fade-in 300ms ease-out both'));
  assert.ok(html.includes('@keyframes canvas-start-sheet-fade-in'));
  assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'));

  const { canvas, calls, advanceTimers } = createHeadlessDomHarness({
    gameMode: game.GAME_MODES.HEX,
    preset: 'classic-hex'
  });
  canvas.listeners.mousemove(pointerEvent(144, 144));
  const beforeDwell = calls.length;
  advanceTimers(399);
  assert.strictEqual(calls.length, beforeDwell, 'Hex neighbors wait for the configured dwell delay');
  canvas.listeners.mousemove(pointerEvent(145, 144));
  advanceTimers(1);
  assert.ok(calls.length > beforeDwell, 'movement inside the same Hex tile preserves the dwell timer');

  const afterHint = calls.length;
  canvas.listeners.mousemove(pointerEvent(146, 144));
  assert.strictEqual(calls.length, afterHint, 'movement inside the same Hex tile preserves visible neighbors');
  canvas.listeners.mousemove(pointerEvent(280, 280));
  assert.ok(calls.length > afterHint, 'leaving the Hex tile clears or changes its neighbor hint');
}

function tile(row, col) {
  return { row, col };
}

function registryEntryHasGameType(entry, gameType) {
  const values = [];
  if (Array.isArray(entry.gameTypes)) values.push(...entry.gameTypes);
  if (Array.isArray(entry.groups)) values.push(...entry.groups);
  if (entry.group) values.push(entry.group);
  return values.includes(gameType);
}

function box(id, row, col, value, cols = 4) {
  return { id, index: game.indexOf(row, col, cols), value };
}

function valuesAt(state, cols = state.preset.cols) {
  return state.boxes
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.value}`;
    })
    .sort();
}

function bombsAt(state, cols = state.preset.cols) {
  return (game.stateSummary(state).bombs || [])
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.kind}:${item.value}`;
    })
    .sort();
}

function indicesAt(indices, cols) {
  return (indices || [])
    .map((index) => {
      const pos = game.rowCol(index, cols);
      return `${pos.row},${pos.col}`;
    })
    .sort();
}

function stonesAt(state, cols = state.preset.cols) {
  return state.stones
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.color}`;
    })
    .sort();
}

function tokensAt(state, cols = state.preset.cols) {
  return state.tokens
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.color}`;
    })
    .sort();
}

function discsAt(state, cols = state.preset.cols) {
  return state.discs
    .map((item) => {
      const pos = game.rowCol(item.index, cols);
      return `${pos.row},${pos.col}:${item.color}`;
    })
    .sort();
}

function stackedTileSummaries(state) {
  const groups = new Map();
  state.boxes.forEach((item) => {
    const boxes = groups.get(item.index) || [];
    boxes.push(`${item.id}:${item.value}`);
    groups.set(item.index, boxes);
  });
  return Array.from(groups.entries())
    .filter((entry) => entry[1].length > 1)
    .map((entry) => `${entry[0]}=${entry[1].join('/')}`)
    .sort();
}

function allMergeEvents(events) {
  return events.flatMap((event) => {
    if (event.kind === 'merge') return [event];
    if (event.kind !== 'moveGroup') return [];
    return (event.merges || []).concat(event.postMerges || []);
  });
}

function allBounceMoves(events) {
  return events.flatMap((event) => {
    if (event.kind === 'bounceGroup') return event.moves || [];
    if (event.kind === 'moveGroup') return event.bounces || [];
    return [];
  });
}

function gluedEdgeSignature(edge) {
  return `${edge.group}:${edge.first.row},${edge.first.col},${edge.first.dir}>${edge.second.row},${edge.second.col},${edge.second.dir}`;
}

function assertLineMatchesEitherDirection(actual, expected) {
  assert.ok(Array.isArray(actual));
  const reversed = expected.slice().reverse();
  assert.ok(
    actual.length === expected.length
      && (actual.every((value, index) => value === expected[index])
        || actual.every((value, index) => value === reversed[index])),
    `expected ${actual.join(',')} to match ${expected.join(',')} in either direction`
  );
}

function indexMultiplicities(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function squareTestGeometry(rows, cols, size = 10) {
  const cells = [];
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      cells[game.indexOf(row, col, cols)] = {
        row,
        col,
        x: ((col - 0.5) * size),
        y: ((row - 0.5) * size)
      };
    }
  }
  return {
    rows,
    cols,
    width: cols * size,
    height: rows * size,
    radius: size / 2,
    size,
    lattice: game.LATTICES.square,
    cells
  };
}

function boundaryBoardOptions(options = {}) {
  const rows = options.rows || options.boardRows || 4;
  const cols = options.cols || options.boardCols || rows;
  return {
    boundaryGlueMode: options.mode || options.boundaryGlueMode || game.BOUNDARY_GLUE_MODES.TORUS,
    boardRows: rows,
    boardCols: cols,
    boardSize: rows,
    glueRng: options.glueRng
  };
}

function boundaryBoardState(options = {}) {
  return game.createGameState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryGomokuState(options = {}) {
  return game.createGomokuState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryGoState(options = {}) {
  return game.createGoState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryReversiState(options = {}) {
  return game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions(options));
}

function boundaryConnectFourPreset(options = {}) {
  return game.generateBoundaryGlueBoardPreset({
    id: 'boundary-connect-four-test',
    label: 'boundary connect four test',
    lattice: 'square',
    rows: options.rows || 4,
    cols: options.cols || 4,
    surface: 'test torus',
    boundaryGlueBoard: true,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.TORUS,
    connectFourHoles: []
  }, {
    gameMode: game.GAME_MODES.NUMBER_2048,
    boundaryGlueMode: options.mode || game.BOUNDARY_GLUE_MODES.TORUS,
    boardRows: options.rows || 4,
    boardCols: options.cols || 4,
    glueRng: options.glueRng
  });
}

function stateWithBoxes(presetId, boxes, options = {}) {
  const state = game.createGameState(presetId, options);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function boundaryStateWithBoxes(boxes, options = {}) {
  const state = boundaryBoardState(options);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function sokobanPreset(options = {}) {
  return game.normalizePresetPayload({
    id: options.id || 'sokoban-test',
    label: options.label || 'Sokoban test',
    gameTypes: ['Sokoban'],
    lattice: options.lattice || 'square',
    size: options.size || '3x4',
    surface: options.surface || 'test room',
    removed: options.removed || [],
    cuts: options.cuts || [],
    glue: options.glue || [],
    sokoban: options.sokoban || {}
  });
}

function readySokobanState(options = {}) {
  const state = game.beginSokobanGame(sokobanPreset(options));
  state.phase = 'ready';
  return state;
}

function sokobanActorsAt(actors, cols) {
  return actors
    .map((actor) => {
      const pos = game.rowCol(actor.index, cols);
      return `${pos.row},${pos.col}`;
    })
    .sort();
}

function sokobanBoxesAtZ(state) {
  return (game.stateSummary(state).boxes || [])
    .map((box) => {
      const pos = game.rowCol(box.index, state.preset.cols);
      return `${pos.row},${pos.col},${box.z}`;
    })
    .sort();
}

function sokobanBridgesAtZ(state) {
  return (game.stateSummary(state).energyBridges || [])
    .map((bridge) => {
      const pos = game.rowCol(bridge.index, state.preset.cols);
      return `${pos.row},${pos.col},${bridge.z}`;
    })
    .sort();
}

function sokobanBeamRouteSummary(state) {
  return game.sokobanEnergyBeamObjects(state)
    .map((beam) => {
      const path = (beam.path || []).map((index) => {
        const pos = game.rowCol(index, state.preset.cols);
        return `${pos.row},${pos.col}`;
      });
      return `${beam.z}:${path.join('>')}`;
    })
    .sort();
}

function sokobanCrossBeamOptions(includeColumn4VerticalGlue = false) {
  const gluedEdges = [];
  for (let row = 1; row <= 4; row += 1) {
    gluedEdges.push(gluePair(0, { row, col: 4, dir: game.DIRS.E }, { row, col: 1, dir: game.DIRS.W }));
  }
  const verticalGlueCols = includeColumn4VerticalGlue ? 4 : 3;
  for (let col = 1; col <= verticalGlueCols; col += 1) {
    gluedEdges.push(gluePair(1, { row: 1, col, dir: game.DIRS.N }, { row: 4, col, dir: game.DIRS.S }));
  }
  return {
    id: includeColumn4VerticalGlue ? 'cross-complete' : 'cross',
    label: includeColumn4VerticalGlue ? 'cross complete' : 'cross',
    lattice: 'square',
    size: '4x4',
    surface: 'Sigma_1,1',
    glue: gluedEdges,
    sokoban: {
      targets: [tile(3, 2)],
      energyBridges: [tile(2, 3)],
      players: [tile(4, 2)]
    }
  };
}

function sokobanHexRemovedNeighborGlueBeamOptions(includeInteriorGlue = true) {
  const gluedEdges = [
    gluePair(0, { row: 1, col: 2, dir: game.HEX_DIRS.E }, { row: 3, col: 1, dir: game.HEX_DIRS.W }),
    gluePair(0, { row: 2, col: 2, dir: game.HEX_DIRS.NE }, { row: 3, col: 1, dir: game.HEX_DIRS.SW }),
    gluePair(0, { row: 1, col: 4, dir: game.HEX_DIRS.W }, { row: 3, col: 1, dir: game.HEX_DIRS.E })
  ];
  if (includeInteriorGlue) {
    gluedEdges.splice(2, 0, gluePair(0, { row: 2, col: 3, dir: game.HEX_DIRS.NW }, { row: 3, col: 1, dir: game.HEX_DIRS.SE }));
  }
  return {
    id: includeInteriorGlue ? 'hex-removed-neighbor-glue' : 'hex-removed-neighbor-no-glue',
    label: includeInteriorGlue ? 'hex removed neighbor glue' : 'hex removed neighbor no glue',
    gameTypes: ['Sokoban'],
    lattice: 'hexagonal',
    rows: 3,
    cols: 4,
    surface: 'Sigma_0,1',
    removedTiles: [tile(1, 1), tile(1, 3), tile(2, 1), tile(3, 2), tile(3, 3)],
    cutEdges: [],
    gluedEdges,
    connectFourHoles: [],
    sokoban: {
      targets: [tile(1, 2), tile(1, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)],
      players: [tile(3, 4)]
    }
  };
}

function sokobanSharedEndpointBeamOptions() {
  return {
    id: 'shared-endpoint-beam',
    label: 'shared endpoint beam',
    gameTypes: ['Sokoban'],
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'Sigma_0,1',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    connectFourHoles: [],
    inputHoles: [],
    sokoban: {
      targets: [tile(1, 4)],
      energyBridges: [tile(2, 1), tile(2, 3), tile(4, 3)],
      players: [tile(3, 2)]
    }
  };
}

function sokobanZStackedBridgeSupportOptions() {
  const gluedEdges = [];
  for (let row = 1; row <= 10; row += 1) {
    gluedEdges.push(gluePair(0, { row, col: 10, dir: game.DIRS.E }, { row, col: 1, dir: game.DIRS.W }));
  }
  for (let col = 1; col <= 10; col += 1) {
    gluedEdges.push(gluePair(1, { row: 1, col, dir: game.DIRS.N }, { row: 10, col, dir: game.DIRS.S }));
  }
  const sea = [];
  for (let row = 1; row <= 10; row += 1) {
    for (let col = 1; col <= 10; col += 1) {
      if (row === 1 || row >= 5 || col === 1 || col >= 6) sea.push(tile(row, col));
    }
  }
  return {
    id: 'z-stacked-bridge-support',
    label: 'z stacked bridge support',
    gameTypes: ['Sokoban'],
    lattice: 'square',
    rows: 10,
    cols: 10,
    surface: 'M_1',
    removedTiles: [],
    cutEdges: [],
    gluedEdges,
    connectFourHoles: [],
    inputHoles: [],
    sokoban: {
      targets: [tile(3, 5)],
      sea,
      energyBridges: [tile(1, 3), tile(2, 3)],
      players: [tile(3, 3)]
    }
  };
}

function gluePair(group, first, second, options = {}) {
  return {
    group,
    reversed: !!options.reversed,
    firstArrowReversed: !!options.firstArrowReversed,
    secondArrowReversed: Object.prototype.hasOwnProperty.call(options, 'secondArrowReversed')
      ? !!options.secondArrowReversed
      : !options.reversed,
    first,
    second
  };
}

function testInitialSpawnWeights() {
  const rng = game.createRng([0, 0.99, 0, 0.99]);
  const state = game.beginGame('classic-4x4', { rng });
  assert.strictEqual(state.boxes.length, 2);
  assert.deepStrictEqual(state.boxes.map((item) => item.value), [4, 4]);
  assert.ok(state.boxes.every((item) => item.value <= 4));
  assert.deepStrictEqual(game.stateSummary(state).newBoxIds, [1, 2]);
}

function testRoundSpawnWeights() {
  assert.strictEqual(game.spawnRoundValue(() => 0.899), 2);
  assert.strictEqual(game.spawnRoundValue(() => 0.95), 4);
  assert.strictEqual(game.spawnRoundValue(() => 0.995), 8);
  assert.strictEqual(game.spawnRoundValue(() => 0.9992), 16);
  assert.strictEqual(game.spawnRoundValue(() => 0.9999), 32);
}

function testNoSpawnAfterNoop() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.events.length, 0);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:4']);
}

function testGameOverWhenFullAndBlocked() {
  const state = game.createGameState('classic-4x4');
  const values = [
    2, 4, 2, 4,
    4, 2, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2
  ];
  state.boxes = values.map((value, index) => ({ id: index + 1, index, value }));
  state.nextBoxId = 17;
  assert.strictEqual(game.emptyExistingIndices(state).length, 0);
  assert.strictEqual(game.isGameOver(state), true);
  assert.strictEqual(game.simulateRound(state, game.DIRS.W, { spawn: false }).changed, false);
}

function testBombKeepsFullBoardPlayable() {
  const state = game.createGameState('classic-4x4');
  const bombIndex = game.indexOf(2, 2, 4);
  const values = [
    2, 4, 2, 4,
    4, 0, 4, 2,
    2, 4, 2, 4,
    4, 2, 4, 2
  ];
  state.boxes = values
    .map((value, index) => value ? { id: index + 1, index, value } : null)
    .filter(Boolean);
  state.bombs = [{ index: bombIndex, kind: game.BOMB_KINDS.BLUE, value: 2 }];
  state.nextBoxId = 17;
  assert.strictEqual(game.emptyExistingIndices(state).length, 0);
  assert.strictEqual(game.isGameOver(state), false);
  game.directionsForPreset(state.preset).forEach((dir) => {
    assert.strictEqual(game.simulateRound(state, dir, { spawn: false }).changed, false);
  });
  state.bombs = [];
  state.boxes.push({ id: 17, index: bombIndex, value: 2 });
  state.nextBoxId = 18;
  assert.strictEqual(game.emptyExistingIndices(state).length, 0);
  assert.strictEqual(game.isGameOver(state), true);
}

function testOrdinaryMergeOnce() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 2),
    box(4, 1, 4, 2)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:4', '1,2:4']);
  assert.strictEqual(result.state.score, 8);
}

function testNewlyMergedTileBlocksLaterPush() {
  const state = stateWithBoxes('classic-4x4', [
    box(4, 4, 1, 4),
    box(1, 4, 2, 2),
    box(2, 4, 3, 2),
    box(3, 4, 4, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['4,2:4', '4,3:4', '4,4:4']);
  assert.strictEqual(result.state.score, 4);
  assert.ok(!allMergeEvents(result.events).some((event) => event.newValue === 8));
}

function testLongGluedChainConvergesBeforeBackMerge() {
  const preset = {
    id: 'long-glued-chain',
    label: 'long glued chain',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'long glued chain',
    removedTiles: [{ row: 4, col: 4 }],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 4, dir: game.DIRS.E }, second: { row: 2, col: 1, dir: game.DIRS.W } },
      { group: 0, first: { row: 2, col: 4, dir: game.DIRS.E }, second: { row: 3, col: 1, dir: game.DIRS.W } },
      { group: 0, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 4),
    box(4, 1, 4, 8),
    box(5, 2, 1, 16),
    box(6, 2, 2, 2),
    box(7, 2, 3, 8),
    box(8, 2, 4, 16),
    box(9, 3, 1, 2),
    box(10, 3, 2, 4),
    box(11, 3, 3, 16),
    box(12, 3, 4, 32),
    box(13, 4, 1, 64),
    box(14, 4, 2, 2),
    box(15, 4, 3, 32)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const merges = allMergeEvents(result.events);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(merges.length, 1);
  assert.strictEqual(merges[0].targetBoxId, 2);
  assert.deepStrictEqual(merges[0].removeBoxIds, [1]);
  assert.strictEqual(merges[0].newValue, 4);
  assert.deepStrictEqual(valuesAt(result.state), [
    '1,2:4',
    '1,3:4',
    '1,4:8',
    '2,1:16',
    '2,2:2',
    '2,3:8',
    '2,4:16',
    '3,1:2',
    '3,2:4',
    '3,3:16',
    '3,4:32',
    '4,1:64',
    '4,2:2',
    '4,3:32'
  ]);
  assert.strictEqual(allBounceMoves(result.events).length, 0);
}

function testFaceToFaceSwapBouncesWithoutMoving() {
  const preset = {
    id: 'face-to-face',
    label: 'face-to-face',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'swap collision',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 1, col: 1, dir: game.DIRS.N },
        second: { row: 1, col: 2, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:2']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => `${move.boxId}:${move.from}>${move.to}`).sort(), [
    `${1}:${game.indexOf(1, 1, 4)}>${game.indexOf(1, 2, 4)}`,
    `${2}:${game.indexOf(1, 2, 4)}>${game.indexOf(1, 1, 4)}`
  ]);
  assert.ok(result.events[0].moves.every((move) => move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testOccupiedMovingResidentBlocksGroupMerge() {
  const preset = {
    id: 'occupied-resident',
    label: 'occupied-resident',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'occupied resident',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 1, col: 2, dir: game.DIRS.N },
        second: { row: 1, col: 3, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 2, 4),
    box(2, 1, 3, 2),
    box(3, 2, 3, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:4', '1,3:2', '2,3:4']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId).sort(), [1, 2, 3]);
  assert.strictEqual(allMergeEvents(result.events).length, 0);
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testVacatingResidentSurvivesIncomingExplosion() {
  const preset = {
    id: 'vacating-resident-explosion',
    label: 'vacating-resident-explosion',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'vacating resident explosion',
    removedTiles: [
      { row: 1, col: 4 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 4, col: 4 }
    ],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 4, col: 3, dir: game.DIRS.S },
        second: { row: 2, col: 1, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(22, 1, 1, 2),
    box(21, 2, 1, 4),
    box(16, 4, 3, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['4,1:4']);
  assert.strictEqual(result.state.removed.has(game.indexOf(2, 1, 4)), false);
  assert.strictEqual(result.state.removed.has(game.indexOf(3, 1, 4)), false);
  assert.deepStrictEqual(bombsAt(result.state), ['2,1:blue:2']);
  const impactGroup = result.events.find((event) => event.kind === 'moveGroup' && event.explosions && event.explosions.length);
  assert.ok(impactGroup);
  assert.strictEqual(impactGroup.explosions[0].value, 2);
  assert.deepStrictEqual(impactGroup.explosions[0].moves.map((move) => move.boxId).sort((a, b) => a - b), [16, 22]);
  assert.ok(!result.events.some((event) => event.kind === 'explode' && event.value === 2));
  const bombPlacement = result.events.find((event) => event.kind === 'placeBomb' && event.index === game.indexOf(2, 1, 4));
  assert.ok(bombPlacement);
  assert.strictEqual(bombPlacement.bombKind, 'blue');
  assert.deepStrictEqual(bombPlacement.removeBoxIds.sort((a, b) => a - b), [16, 22]);
  assert.strictEqual(allBounceMoves(result.events).length, 0);
}

function testBlockedResidentPreventsGroupExplosion() {
  const preset = {
    id: 'blocked-resident-mixed',
    label: 'blocked-resident-mixed',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'blocked resident mixed',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 2, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 4, dir: game.DIRS.N }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 3, 4),
    box(2, 2, 4, 2),
    box(3, 1, 4, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:8', '2,4:2']);
  const merge = allMergeEvents(result.events)[0];
  assert.ok(merge);
  assert.strictEqual(merge.boxId, 3);
  assert.deepStrictEqual(merge.removeBoxIds, [1]);
  assert.strictEqual(merge.newValue, 8);
  const bounceMoves = allBounceMoves(result.events);
  assert.deepStrictEqual(bounceMoves.map((move) => move.boxId), [2]);
  assert.ok(bounceMoves.every((move) => move.to === game.indexOf(1, 4, 4)));
  assert.ok(bounceMoves[0].glued);
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
  assert.ok(!result.events.some((event) => event.kind === 'removeTile'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testSameValueGroupMergesThroughVacatingResident() {
  const preset = {
    id: 'vacating-resident-merge',
    label: 'vacating-resident-merge',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'vacating resident merge',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 3, col: 3, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 2, 1, 4, 3),
    box(2, 2, 2, 2, 3),
    box(3, 3, 3, 4, 3)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state, 3), ['2,2:8', '2,3:2']);
  const merge = allMergeEvents(result.events)[0];
  assert.ok(merge);
  assert.strictEqual(merge.targetBoxId, null);
  assert.deepStrictEqual(merge.moves.map((move) => move.boxId).sort((a, b) => a - b), [1, 3]);
  assert.strictEqual(allBounceMoves(result.events).length, 0);
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
}

function testStackedTileDoesNotExposeHiddenMerge() {
  const preset = {
    id: 'stacked-hidden-merge',
    label: 'stacked-hidden-merge',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'stacked hidden merge',
    removedTiles: [{ row: 4, col: 1 }],
    cutEdges: [],
    gluedEdges: []
  };
  const state = stateWithBoxes(preset, [
    box(71, 1, 1, 2),
    box(41, 2, 1, 16),
    box(43, 2, 1, 8),
    box(55, 2, 1, 4),
    box(70, 2, 1, 2),
    box(67, 3, 1, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '2,1:16', '2,1:2', '2,1:4', '2,1:8', '3,1:8']);
  assert.strictEqual(allMergeEvents(result.events).length, 0);
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
  assert.ok(result.events.every((event) => event.kind === 'bounceGroup'));
}

function testMoveIntoBouncingResidentDoesNotStack() {
  const preset = {
    id: 'bouncing-resident-target',
    label: 'bouncing-resident-target',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'bouncing resident target',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(8, 1, 2, 2),
    box(20, 1, 3, 2),
    box(6, 2, 2, 4),
    box(16, 2, 4, 4),
    box(13, 3, 2, 2),
    box(18, 3, 3, 2),
    box(14, 4, 1, 4),
    box(10, 4, 3, 4),
    box(19, 4, 4, 2)
  ]);
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,3:4', '2,4:8', '3,3:4', '4,1:4', '4,3:4', '4,4:2']);
  const indices = result.state.boxes.map((item) => item.index);
  assert.strictEqual(indices.length, new Set(indices).size);
  const mixedGroup = result.events.find((event) => event.kind === 'moveGroup' && event.bounces.some((move) => move.boxId === 10));
  assert.ok(mixedGroup);
  const blockedMove = mixedGroup.bounces.find((move) => move.boxId === 10);
  assert.strictEqual(blockedMove.from, game.indexOf(4, 3, 4));
  assert.strictEqual(blockedMove.to, game.indexOf(4, 4, 4));
  assert.strictEqual(blockedMove.value, 4);
}

function testMoveIntoLaterBouncingResidentDoesNotStack() {
  const preset = {
    id: 'later-bouncing-resident-target',
    label: 'later-bouncing-resident-target',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'later bouncing resident target',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(33, 1, 1, 8),
    box(32, 1, 2, 2),
    box(28, 1, 3, 4),
    box(34, 2, 2, 2),
    box(26, 2, 3, 16),
    box(27, 2, 4, 2),
    box(14, 3, 1, 4),
    box(31, 3, 2, 2),
    box(18, 3, 3, 16),
    box(30, 4, 1, 2),
    box(24, 4, 4, 8)
  ]);
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.N, { spawn: false });
  assert.strictEqual(result.changed, true);
  const indices = result.state.boxes.map((item) => item.index);
  assert.strictEqual(indices.length, new Set(indices).size);
  const mixedGroup = result.events.find((event) => event.kind === 'moveGroup' && event.bounces.some((move) => move.boxId === 18));
  assert.ok(mixedGroup);
  const blockedMove = mixedGroup.bounces.find((move) => move.boxId === 18);
  assert.strictEqual(blockedMove.from, game.indexOf(3, 3, 4));
  assert.strictEqual(blockedMove.to, game.indexOf(2, 3, 4));
  assert.strictEqual(blockedMove.value, 16);
}

function testBounceOnlyDirectionsDoNotPreventGameOver() {
  const preset = {
    id: 'bounce-only-terminal',
    label: 'bounce-only-terminal',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'bounce only terminal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 4, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 1, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 2, col: 4, dir: game.DIRS.E } },
      { group: 2, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 4, col: 3, dir: game.DIRS.S } },
      { group: 3, first: { row: 1, col: 4, dir: game.DIRS.N }, second: { row: 1, col: 1, dir: game.DIRS.W } },
      { group: 4, first: { row: 3, col: 1, dir: game.DIRS.W }, second: { row: 1, col: 4, dir: game.DIRS.E } },
      { group: 5, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 3, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 7, first: { row: 4, col: 1, dir: game.DIRS.W }, second: { row: 2, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(49, 1, 1, 2),
    box(24, 1, 2, 16),
    box(54, 1, 3, 4),
    box(55, 2, 2, 2),
    box(45, 2, 3, 8),
    box(52, 2, 4, 4),
    box(56, 3, 1, 8),
    box(36, 3, 2, 32),
    box(50, 3, 3, 4),
    box(57, 4, 1, 2),
    box(53, 4, 3, 2),
    box(26, 4, 4, 32)
  ]);
  state.score = 312;
  state.nextBoxId = 58;
  state.removed = new Set([
    game.indexOf(1, 4, 4),
    game.indexOf(2, 1, 4),
    game.indexOf(3, 4, 4),
    game.indexOf(4, 2, 4)
  ]);
  const results = Object.values(game.DIRS).map((dir) => game.simulateRound(state, dir, { spawn: false }));
  assert.ok(results.every((result) => result.changed === false));
  assert.ok(results.some((result) => result.events.some((event) => event.kind === 'bounceGroup')));
  assert.strictEqual(game.fullBoardWithoutAdjacentMerge(state), true);
  assert.deepStrictEqual(game.explosionModeDirections(state), []);
  assert.strictEqual(game.isGameOver(state), true);
}

function testExplosionModeForFullCycleBoard() {
  const state = boundaryBoardState();
  let id = 1;
  for (let row = 1; row <= 4; row += 1) {
    for (let col = 1; col <= 4; col += 1) {
      state.boxes.push({
        id,
        index: game.indexOf(row, col, 4),
        value: (row + col) % 2 ? 2 : 4
      });
      id += 1;
    }
  }
  state.nextBoxId = 17;
  assert.strictEqual(game.fullBoardWithoutAdjacentMerge(state), true);
  assert.deepStrictEqual(game.explosionModeDirections(state), [game.DIRS.E, game.DIRS.S, game.DIRS.W, game.DIRS.N]);
  assert.strictEqual(game.isExplosionModeActive(state), true);
  assert.strictEqual(game.isGameOver(state), false);

  const structuralRemovedSize = state.removed.size;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.ok(result.events.some((event) => event.kind === 'moveGroup'));
  assert.ok(result.events.some((event) => event.kind === 'explode' && event.value <= 4));
  assert.ok(result.events.some((event) => event.kind === 'placeBomb'));
  assert.ok(!result.events.some((event) => event.kind === 'removeTile'));
  assert.ok(!result.events.some((event) => event.kind === 'clearNumbers'));
  assert.strictEqual(result.state.removed.size, structuralRemovedSize);
  assert.ok((result.state.bombs || []).length > 0);
  assert.ok(result.state.boxes.length < state.boxes.length);
  assert.ok(result.state.boxes.every((item) => !game.bombAtIndex(result.state, item.index)));
  assert.strictEqual(game.isGameOver(result.state), false);
}

function testDownMoveAfterExplosionDoesNotStack() {
  const state = boundaryBoardState();
  state.phase = 'ready';
  state.round = 1;
  state.boxes = [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4),
    box(3, 1, 3, 8),
    box(4, 1, 4, 16),
    box(8, 2, 1, 256),
    box(7, 2, 2, 128),
    box(6, 2, 3, 64),
    box(5, 2, 4, 32),
    box(9, 3, 4, 512),
    box(13, 4, 1, 2),
    box(12, 4, 2, 2),
    box(11, 4, 3, 2),
    box(10, 4, 4, 2)
  ];
  state.nextBoxId = 14;

  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(Array.from(result.state.removed).sort((a, b) => a - b), []);
  assert.deepStrictEqual((result.state.bombs || []).map((bomb) => bomb.index).sort((a, b) => a - b), [
    game.indexOf(4, 1, 4),
    game.indexOf(4, 2, 4),
    game.indexOf(4, 3, 4),
    game.indexOf(4, 4, 4)
  ]);
  assert.deepStrictEqual(stackedTileSummaries(result.state), []);
  assert.ok(result.events.some((event) => (
    event.kind === 'moveGroup'
      && (event.bounces || []).some((move) => move.boxId === 5 && move.from === game.indexOf(2, 4, 4) && move.to === game.indexOf(3, 4, 4))
  )));
  assert.ok(!result.state.boxes.some((item) => result.state.removed.has(item.index)));
}

function testBlockedResidentWithSuccessorPreventsGroupExplosion() {
  const preset = {
    id: 'blocked-chain-resident',
    label: 'blocked-chain-resident',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'blocked chain resident',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 3, col: 4, dir: game.DIRS.E },
        second: { row: 4, col: 3, dir: game.DIRS.S }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(7, 4, 2, 32),
    box(9, 3, 4, 2),
    box(8, 4, 3, 4),
    box(6, 4, 4, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: true, rng: () => 0 });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['3,4:2', '4,2:32', '4,3:4', '4,4:8']);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].kind, 'bounceGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId).sort((a, b) => a - b), [7, 9]);
  assert.ok(result.events[0].moves.some((move) => move.boxId === 9 && move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
  assert.ok(!result.events.some((event) => event.kind === 'removeTile'));
  assert.ok(!result.events.some((event) => event.kind === 'spawn'));
}

function testExplosionMoverVacatesSourceForBounceResolution() {
  const preset = {
    id: 'explosion-vacates-source',
    label: 'explosion-vacates-source',
    lattice: 'square',
    rows: 2,
    cols: 4,
    surface: 'explosion vacates source',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 1, dir: game.DIRS.W }
      },
      {
        group: 1,
        first: { row: 2, col: 4, dir: game.DIRS.E },
        second: { row: 1, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2),
    box(3, 1, 3, 4),
    box(4, 1, 4, 4),
    box(5, 2, 4, 8)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const removedBoxes = result.state.boxes.filter((item) => result.state.removed.has(item.index));
  assert.deepStrictEqual(removedBoxes, []);
  assert.strictEqual(result.state.removed.has(game.indexOf(1, 2, 4)), false);
  assert.deepStrictEqual(bombsAt(result.state), ['1,2:blue:2']);
  assert.ok(!result.state.boxes.some((item) => item.id === 1 || item.id === 5));
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:8', '1,4:2']);
}

function randomGluePushedCollisionState(pushedValue) {
  const preset = {
    id: 'random-glue-pushed-collision',
    label: 'random glue pushed collision',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'random boundary glue',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 4, col: 2, dir: game.DIRS.S }, second: { row: 1, col: 2, dir: game.DIRS.N } },
      { group: 1, first: { row: 1, col: 4, dir: game.DIRS.E }, second: { row: 4, col: 1, dir: game.DIRS.W } },
      { group: 2, first: { row: 2, col: 1, dir: game.DIRS.W }, second: { row: 4, col: 4, dir: game.DIRS.S } },
      { group: 3, first: { row: 4, col: 4, dir: game.DIRS.E }, second: { row: 1, col: 4, dir: game.DIRS.N } },
      { group: 4, first: { row: 1, col: 1, dir: game.DIRS.W }, second: { row: 4, col: 1, dir: game.DIRS.S } },
      { group: 5, first: { row: 4, col: 3, dir: game.DIRS.S }, second: { row: 1, col: 1, dir: game.DIRS.N } },
      { group: 6, first: { row: 3, col: 4, dir: game.DIRS.E }, second: { row: 3, col: 1, dir: game.DIRS.W } },
      { group: 7, first: { row: 1, col: 3, dir: game.DIRS.N }, second: { row: 2, col: 4, dir: game.DIRS.E } }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(11, 1, 4, pushedValue),
    box(62, 2, 3, 8),
    box(72, 4, 1, 2),
    box(67, 4, 4, 4)
  ]);
  state.bombs = [
    { index: game.indexOf(1, 3, 4), kind: game.BOMB_KINDS.BLUE, value: 8 },
    { index: game.indexOf(2, 1, 4), kind: game.BOMB_KINDS.BLUE, value: 2 },
    { index: game.indexOf(3, 4, 4), kind: game.BOMB_KINDS.BLUE, value: 16 },
    { index: game.indexOf(4, 2, 4), kind: game.BOMB_KINDS.BLUE, value: 2 },
    { index: game.indexOf(4, 3, 4), kind: game.BOMB_KINDS.BLUE, value: 2 }
  ];
  state.nextBoxId = 73;
  state.score = 312;
  return state;
}

function testPushedMoveCollisionCreatesBomb() {
  const result = game.simulateRound(randomGluePushedCollisionState(32), game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:4', '4,1:2']);
  assert.deepStrictEqual(stackedTileSummaries(result.state), []);
  assert.ok(!result.state.boxes.some((item) => item.id === 11 || item.id === 62));
  assert.deepStrictEqual(bombsAt(result.state), [
    '1,3:blue:8',
    '2,1:blue:2',
    '2,4:blue:8',
    '3,4:blue:16',
    '4,2:blue:2',
    '4,3:blue:2'
  ]);

  const impactGroup = result.events.find((event) => event.kind === 'moveGroup' && event.explosions && event.explosions.length);
  assert.ok(impactGroup);
  assert.ok(impactGroup.moves.some((move) => move.boxId === 67 && move.to === game.indexOf(1, 4, 4)));
  const explosion = impactGroup.explosions.find((event) => event.center === game.indexOf(2, 4, 4));
  assert.ok(explosion);
  assert.strictEqual(explosion.value, 8);
  assert.deepStrictEqual(explosion.removeBoxIds.sort((a, b) => a - b), [11, 62]);
  assert.deepStrictEqual(explosion.moves.map((move) => move.boxId).sort((a, b) => a - b), [11, 62]);
  const bombPlacement = result.events.find((event) => event.kind === 'placeBomb' && event.index === game.indexOf(2, 4, 4));
  assert.ok(bombPlacement);
  assert.strictEqual(bombPlacement.value, 8);
  assert.deepStrictEqual(bombPlacement.removeBoxIds.sort((a, b) => a - b), [11, 62]);
}

function testPushedMoveCollisionCanMerge() {
  const result = game.simulateRound(randomGluePushedCollisionState(8), game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:4', '2,4:16', '4,1:2']);
  assert.deepStrictEqual(stackedTileSummaries(result.state), []);
  assert.deepStrictEqual(bombsAt(result.state), [
    '1,3:blue:8',
    '2,1:blue:2',
    '3,4:blue:16',
    '4,2:blue:2',
    '4,3:blue:2'
  ]);
  assert.strictEqual(result.state.score, 328);

  const merge = allMergeEvents(result.events).find((event) => event.to === game.indexOf(2, 4, 4));
  assert.ok(merge);
  assert.strictEqual(merge.newValue, 16);
  assert.deepStrictEqual(merge.moves.map((move) => move.boxId).sort((a, b) => a - b), [11, 62]);
  assert.ok(!result.events.some((event) => event.kind === 'explode'));
}

function testMergeAndMoveShareAnimationStep() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 3, 2),
    box(2, 1, 4, 2),
    box(3, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.events[0].kind, 'moveGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId), [3]);
  assert.deepStrictEqual(result.events[0].merges.map((event) => event.boxId), [2]);
  assert.deepStrictEqual(valuesAt(result.state), ['1,4:4', '2,4:4']);
  assert.strictEqual(result.state.score, 4);
}

function testMoveEventsAreGroupedByTick() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const groups = result.events.filter((event) => event.kind === 'moveGroup');
  assert.ok(groups.length >= 1);
  assert.strictEqual(groups[0].moves.length, 2);
  assert.ok(!result.events.some((event) => event.kind === 'move'));
  groups[0].moves.forEach((move) => {
    assert.ok(Number.isInteger(move.from));
    assert.ok(Number.isInteger(move.to));
    assert.ok(Number.isFinite(move.value));
  });
}

function testBouncesAndMovesShareTickAnimation() {
  const preset = {
    id: 'mixed-bounce-move-tick',
    label: 'mixed-bounce-move-tick',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'mixed bounce move tick',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 4, col: 1, dir: game.DIRS.S },
        second: { row: 4, col: 3, dir: game.DIRS.S }
      }
    ]
  };
  const state = stateWithBoxes(preset, [
    box(16, 4, 1, 2),
    box(25, 4, 3, 2),
    box(27, 3, 3, 2),
    box(22, 2, 2, 16)
  ]);
  const result = game.simulateRound(state, game.DIRS.S, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.events[0].kind, 'moveGroup');
  assert.deepStrictEqual(result.events[0].moves.map((move) => move.boxId), [22]);
  assert.deepStrictEqual(result.events[0].bounces.map((move) => move.boxId).sort((a, b) => a - b), [16, 25, 27]);
  assert.ok(result.events[0].bounces.some((move) => move.boxId === 16 && move.glued));
  assert.ok(!result.events[0].explosions.length);
}

function testGluedBoxRejoinsNextMovementStep() {
  const state = boundaryStateWithBoxes([
    box(1, 1, 4, 2),
    box(2, 2, 1, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const groups = result.events.filter((event) => event.kind === 'moveGroup');
  assert.ok(groups.length >= 2);
  assert.deepStrictEqual(groups[0].moves.map((move) => move.boxId).sort(), [1, 2]);
  assert.deepStrictEqual(groups[1].moves.map((move) => move.boxId).sort(), [1, 2]);
  const gluedMove = groups[0].moves.find((move) => move.boxId === 1);
  assert.strictEqual(gluedMove.glued, true);
  assert.strictEqual(gluedMove.edge.dir, game.DIRS.E);
  assert.strictEqual(gluedMove.dir, game.DIRS.E);
  assert.ok(groups[1].moves.some((move) => move.boxId === 1 && move.from === game.indexOf(1, 1, 4) && move.to === game.indexOf(1, 2, 4)));
}

function testGluedMergeCarriesPortalAnimationMove() {
  const preset = {
    id: 'glued-merge-test',
    label: 'glued-merge-test',
    rows: 1,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 2, dir: game.DIRS.E },
        second: { row: 1, col: 1, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(1, 2, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 1, 2), value: 2 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const merge = allMergeEvents(result.events)[0];
  assert.ok(merge);
  assert.strictEqual(merge.newValue, 4);
  assert.strictEqual(merge.moves.length, 1);
  assert.strictEqual(merge.moves[0].glued, true);
  assert.strictEqual(merge.moves[0].from, game.indexOf(1, 2, 2));
  assert.strictEqual(merge.moves[0].to, game.indexOf(1, 1, 2));
  assert.strictEqual(merge.moves[0].edge.dir, game.DIRS.E);
  assert.strictEqual(merge.moves[0].dir, game.DIRS.E);
}

function pushTurnPreset(rows = 2) {
  return {
    id: 'push-turn-test',
    label: 'push-turn-test',
    rows,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 1, dir: game.DIRS.E },
        second: { row: 1, col: 2, dir: game.DIRS.N }
      }
    ]
  };
}

function testStoppedBlockerCanBePushedAfterGlue() {
  const state = game.createGameState(pushTurnPreset());
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:2', '2,2:4']);
  const firstGroup = result.events.find((event) => event.kind === 'moveGroup');
  assert.ok(firstGroup);
  assert.strictEqual(firstGroup.moves.length, 2);
}

function testPushedBlockCanMerge() {
  const state = game.createGameState(pushTurnPreset());
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 },
    { id: 3, index: game.indexOf(2, 2, 2), value: 4 }
  ];
  state.nextBoxId = 4;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(valuesAt(result.state), ['1,2:2', '2,2:8']);
  assert.strictEqual(result.state.score, 8);
  assert.ok(allMergeEvents(result.events).some((event) => event.newValue === 8));
}

function testPushChainLimitDebug() {
  const rows = 53;
  const state = game.createGameState(pushTurnPreset(rows));
  state.boxes = [{ id: 1, index: game.indexOf(1, 1, 2), value: 2 }];
  for (let row = 1; row <= rows; row += 1) {
    state.boxes.push({ id: row + 1, index: game.indexOf(row, 2, 2), value: 100 + row });
  }
  state.nextBoxId = rows + 2;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.debugMessages.length, 1);
  assert.ok(result.debugMessages[0].includes('push-chain debug'));
  assert.ok(result.events.some((event) => event.kind === 'debug'));
}

function testPushLoopBreaksWhenItReturnsToActorDirection() {
  const preset = pushTurnPreset();
  preset.gluedEdges.push({
    group: 1,
    first: { row: 2, col: 2, dir: game.DIRS.S },
    second: { row: 1, col: 1, dir: game.DIRS.W }
  });
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(1, 1, 2), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 2), value: 4 },
    { id: 3, index: game.indexOf(2, 2, 2), value: 8 }
  ];
  state.nextBoxId = 4;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  const firstGroup = result.events.find((event) => event.kind === 'moveGroup');
  assert.ok(firstGroup);
  assert.strictEqual(firstGroup.moves.length, 3);
  assert.deepStrictEqual(
    firstGroup.moves.map((move) => `${move.boxId}:${move.from}>${move.to}`).sort(),
    ['1:0>1', '2:1>3', '3:3>0']
  );
}

function testTorusGlueLoopExplosion() {
  const state = boundaryStateWithBoxes([box(1, 1, 1, 2)]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.strictEqual(result.state.removed.has(game.indexOf(1, 4, 4)), false);
  assert.deepStrictEqual(bombsAt(result.state), ['1,4:blue:2']);
  assert.ok(result.events.some((event) => event.kind === 'explode'));
}

function testKleinAndRamifiedSuccessors() {
  const klein = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.KLEIN_BOTTLE });
  const kleinStep = game.surfaceSuccessor(klein, game.indexOf(1, 4, 4), game.DIRS.E);
  assert.strictEqual(kleinStep.kind, 'glued');
  assert.strictEqual(kleinStep.index, game.indexOf(4, 1, 4));
  assert.strictEqual(kleinStep.dir, game.DIRS.E);

  const ramified = game.createGameState('ramified-cover');
  const ramifiedStep = game.surfaceSuccessor(ramified, game.indexOf(2, 8, 9), game.DIRS.S);
  assert.strictEqual(ramifiedStep.kind, 'glued');
  assert.strictEqual(ramifiedStep.index, game.indexOf(3, 3, 9));
  assert.strictEqual(ramifiedStep.dir, game.DIRS.S);

  const ramifiedReturnStep = game.surfaceSuccessor(ramified, game.indexOf(2, 3, 9), game.DIRS.S);
  assert.strictEqual(ramifiedReturnStep.kind, 'glued');
  assert.strictEqual(ramifiedReturnStep.index, game.indexOf(3, 8, 9));
  assert.strictEqual(ramifiedReturnStep.dir, game.DIRS.S);
}

function testGlueHoverFindsMultiEdgeGroup() {
  const state = game.createGameState('ramified-cover');
  const geom = squareTestGeometry(4, 9);
  const hover = game.hoveredGlueBoundaryAtPoint(state.preset, geom, { x: 75, y: 19.8 }, { threshold: 1 });
  assert.ok(hover);
  assert.strictEqual(hover.group, 0);
  assert.strictEqual(hover.edgeKey, `${game.indexOf(2, 8, 9)}:${game.DIRS.S}`);
  assert.deepStrictEqual(Array.from(game.hoveredGlueEdgeKeys(state.preset, hover)).sort(), [
    `${game.indexOf(2, 8, 9)}:${game.DIRS.S}`,
    `${game.indexOf(2, 9, 9)}:${game.DIRS.S}`,
    `${game.indexOf(3, 3, 9)}:${game.DIRS.N}`,
    `${game.indexOf(3, 4, 9)}:${game.DIRS.N}`
  ].sort());
  assert.deepStrictEqual(Array.from(game.hoveredGluePairEdgeKeys(state.preset, hover)).sort(), [
    `${game.indexOf(2, 8, 9)}:${game.DIRS.S}`,
    `${game.indexOf(3, 3, 9)}:${game.DIRS.N}`
  ].sort());

  const drawCalls = [];
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get(target, property) {
      if (property in target) return target[property];
      target[property] = (...args) => drawCalls.push({ method: property, args });
      return target[property];
    },
    set(target, property, value) {
      drawCalls.push({ property, value });
      target[property] = value;
      return true;
    }
  });
  game.__test.drawGlueEdges(ctx, geom, state.preset, hover);
  assert.strictEqual(
    drawCalls.filter((call) => call.property === 'strokeStyle' && call.value === 'rgba(255,255,255,0.95)').length,
    4,
    'every pair in the two-pair chain keeps the existing white chain highlight'
  );
  const baseLineWidth = Math.max(1.8, geom.radius * 0.055) * 1.15;
  assert.strictEqual(
    drawCalls.filter((call) => call.property === 'lineWidth' && call.value === baseLineWidth * 4.2).length,
    2,
    'the hovered pair retains the full chain-highlight width'
  );
  assert.strictEqual(
    drawCalls.filter((call) => call.property === 'lineWidth' && call.value === baseLineWidth * 2.65).length,
    2,
    'other pairs in the chain use the reduced highlight width'
  );
  assert.strictEqual(
    drawCalls.filter((call) => call.property === 'strokeStyle' && call.value === 'rgba(255,209,102,0.96)').length,
    0,
    'pair-focused width contrast uses no gold accent'
  );
  const pairedHover = game.hoveredGlueBoundaryAtPoint(state.preset, geom, { x: 85, y: 19.8 }, { threshold: 1 });
  assert.ok(pairedHover);
  assert.notStrictEqual(pairedHover.pairIndex, hover.pairIndex, 'moving within the chain switches the full-width pair');
  assert.strictEqual(game.hoveredGlueBoundaryAtPoint(state.preset, geom, { x: 5, y: 5 }, { threshold: 1 }), null);
  drawCalls.length = 0;
  game.__test.drawGlueEdges(ctx, geom, state.preset, null);
  assert.strictEqual(
    drawCalls.filter((call) => call.property === 'strokeStyle' && call.value === 'rgba(255,209,102,0.96)').length,
    0,
    'clearing the hover leaves no gold accent'
  );
}

function testGenus2PresetFromExport() {
  const state = game.createGameState('genus-2');
  assert.strictEqual(state.preset.gluedEdges.length, 8);
  assert.strictEqual(state.preset.lattice, 'square');

  const eastToNorth = game.surfaceSuccessor(state, game.indexOf(4, 4, 4), game.DIRS.E);
  assert.strictEqual(eastToNorth.kind, 'glued');
  assert.strictEqual(eastToNorth.index, game.indexOf(1, 3, 4));
  assert.strictEqual(eastToNorth.dir, game.DIRS.S);

  const northToWest = game.surfaceSuccessor(state, game.indexOf(1, 2, 4), game.DIRS.N);
  assert.strictEqual(northToWest.kind, 'glued');
  assert.strictEqual(northToWest.index, game.indexOf(4, 1, 4));
  assert.strictEqual(northToWest.dir, game.DIRS.E);
}

function squareBoundaryKeys(rows = 4, cols = 4) {
  const keys = new Set();
  for (let col = 1; col <= cols; col += 1) {
    keys.add(`${game.indexOf(1, col, cols)}:${game.DIRS.N}`);
    keys.add(`${game.indexOf(rows, col, cols)}:${game.DIRS.S}`);
  }
  for (let row = 1; row <= rows; row += 1) {
    keys.add(`${game.indexOf(row, 1, cols)}:${game.DIRS.W}`);
    keys.add(`${game.indexOf(row, cols, cols)}:${game.DIRS.E}`);
  }
  return keys;
}

function gluedBoundaryKeys(preset) {
  const keys = new Set();
  preset.gluedEdges.forEach((pair) => {
    keys.add(`${game.indexOf(pair.first.row, pair.first.col, preset.cols)}:${pair.first.dir}`);
    keys.add(`${game.indexOf(pair.second.row, pair.second.col, preset.cols)}:${pair.second.dir}`);
  });
  return keys;
}

function glueGroupSummary(gluedEdges) {
  const groups = new Map();
  gluedEdges.forEach((pair) => {
    const group = Number(pair.group);
    const entry = groups.get(group) || { count: 0, reversedValues: new Set() };
    entry.count += 1;
    entry.reversedValues.add(!!pair.reversed);
    groups.set(group, entry);
  });
  return Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([group, entry]) => {
      const reversed = Array.from(entry.reversedValues);
      const flag = reversed.length > 1 ? 'mixed' : (reversed[0] ? 'reversed' : 'normal');
      return `${group}:${entry.count}:${flag}`;
    });
}

function testRandomGluePresetCoversBoundary() {
  const rng = game.createRng([0.97, 0.13, 0.53, 0.29, 0.71, 0.41, 0.19]);
  const state = game.createGameState('random-glue-4x4', { glueRng: rng });
  assert.strictEqual(state.preset.gluedEdges.length, 8);
  assert.deepStrictEqual(gluedBoundaryKeys(state.preset), squareBoundaryKeys());
}

function testRandomGluePresetIsDeterministicWithGlueRng() {
  const sequence = [0.8, 0.1, 0.6, 0.3, 0.95, 0.2];
  const first = game.createGameState('random-glue-4x4', { glueRng: game.createRng(sequence) });
  const second = game.createGameState('random-glue-4x4', { glueRng: game.createRng(sequence) });
  assert.deepStrictEqual(first.preset.gluedEdges, second.preset.gluedEdges);
  assert.strictEqual(game.PRESETS.find((preset) => preset.id === 'random-glue-4x4').gluedEdges.length, 0);
}

function testBoundaryGlueBoardPresetSizingAndGlueModes() {
  const source = game.PRESETS.find((preset) => preset.id === game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.ok(source && source.boundaryGlueBoard);

  const defaults2048 = game.createGameState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaults2048.rows, 4);
  assert.strictEqual(defaults2048.cols, 4);
  assert.strictEqual(defaults2048.boundaryGlueMode, game.BOUNDARY_GLUE_MODES.TORUS);
  assert.strictEqual(defaults2048.gluedEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(defaults2048.gluedEdges), ['0:4:normal', '1:4:normal']);

  const defaultsGomoku = game.createGomokuState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsGomoku.rows, 15);
  assert.strictEqual(defaultsGomoku.cols, 15);
  assert.strictEqual(defaultsGomoku.gluedEdges.length, 30);
  assert.deepStrictEqual(glueGroupSummary(defaultsGomoku.gluedEdges), ['0:15:normal', '1:15:normal']);

  const defaultsGo = game.createGoState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsGo.rows, 19);
  assert.strictEqual(defaultsGo.cols, 19);
  assert.strictEqual(defaultsGo.gluedEdges.length, 38);

  const defaultsReversi = game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID).preset;
  assert.strictEqual(defaultsReversi.rows, 10);
  assert.strictEqual(defaultsReversi.cols, 10);
  assert.strictEqual(defaultsReversi.gluedEdges.length, 20);

  const torusEdges = game.generateTorusBoundaryGlue(3, 5);
  assert.strictEqual(torusEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(torusEdges), ['0:3:normal', '1:5:normal']);
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: torusEdges }), squareBoundaryKeys(3, 5));

  const kleinEdges = game.generateKleinBoundaryGlue(3, 5);
  assert.strictEqual(kleinEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(kleinEdges), ['0:3:reversed', '1:5:normal']);
  assert.ok(kleinEdges.slice(0, 3).every((pair) => pair.reversed));
  assert.strictEqual(kleinEdges[0].first.row, 1);
  assert.strictEqual(kleinEdges[0].second.row, 3);
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: kleinEdges }), squareBoundaryKeys(3, 5));

  const projectiveEdges = game.generateProjectivePlaneBoundaryGlue(3, 5);
  assert.strictEqual(projectiveEdges.length, 8);
  assert.deepStrictEqual(glueGroupSummary(projectiveEdges), ['0:3:reversed', '1:5:reversed']);
  assert.ok(projectiveEdges.every((pair) => pair.reversed));
  assert.deepStrictEqual(gluedBoundaryKeys({ rows: 3, cols: 5, gluedEdges: projectiveEdges }), squareBoundaryKeys(3, 5));

  const torusState = boundaryBoardState({ rows: 3, cols: 5 });
  let step = game.surfaceSuccessor(torusState, game.indexOf(2, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(2, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(torusState, game.indexOf(1, 4, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const kleinState = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.KLEIN_BOTTLE, rows: 3, cols: 5 });
  step = game.surfaceSuccessor(kleinState, game.indexOf(1, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(3, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(kleinState, game.indexOf(1, 4, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const projectiveState = boundaryBoardState({ mode: game.BOUNDARY_GLUE_MODES.RP2, rows: 3, cols: 5 });
  step = game.surfaceSuccessor(projectiveState, game.indexOf(1, 5, 5), game.DIRS.E);
  assert.strictEqual(step.index, game.indexOf(3, 1, 5));
  assert.strictEqual(step.dir, game.DIRS.E);
  step = game.surfaceSuccessor(projectiveState, game.indexOf(1, 2, 5), game.DIRS.N);
  assert.strictEqual(step.index, game.indexOf(3, 4, 5));
  assert.strictEqual(step.dir, game.DIRS.N);

  const open = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.OPEN,
    boardRows: 3,
    boardCols: 5
  });
  assert.strictEqual(open.rows, 3);
  assert.strictEqual(open.cols, 5);
  assert.strictEqual(open.gluedEdges.length, 0);

  const randomA = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.RANDOM,
    boardRows: 3,
    boardCols: 5,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  const randomB = game.generateBoundaryGlueBoardPreset(source, {
    gameMode: game.GAME_MODES.GOMOKU,
    boundaryGlueMode: game.BOUNDARY_GLUE_MODES.RANDOM,
    boardRows: 3,
    boardCols: 5,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  assert.deepStrictEqual(randomA.gluedEdges, randomB.gluedEdges);
  assert.strictEqual(glueGroupSummary(randomA.gluedEdges).length, randomA.gluedEdges.length);
  assert.deepStrictEqual(gluedBoundaryKeys(randomA), squareBoundaryKeys(3, 5));

  const classic = boundaryGomokuState({ mode: game.BOUNDARY_GLUE_MODES.OPEN, rows: 9, cols: 9 });
  assert.strictEqual(classic.preset.rows, 9);
  assert.strictEqual(classic.preset.cols, 9);
  assert.strictEqual(classic.preset.label, 'open/classic 9x9');
  assert.strictEqual(classic.preset.gluedEdges.length, 0);
  assert.strictEqual(game.emptyExistingIndices(classic).length, 81);

  const state = boundaryGomokuState({
    mode: game.BOUNDARY_GLUE_MODES.RANDOM,
    rows: 9,
    cols: 9,
    glueRng: game.createRng([0.8, 0.1, 0.6, 0.3, 0.95, 0.2])
  });
  assert.strictEqual(state.preset.rows, 9);
  assert.strictEqual(state.preset.cols, 9);
  assert.strictEqual(state.preset.label, 'random boundary glue 9x9');
  assert.strictEqual(state.preset.gluedEdges.length, 18);
  assert.deepStrictEqual(gluedBoundaryKeys(state.preset), squareBoundaryKeys(9, 9));
  const base = game.PRESETS.find((preset) => preset.id === game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.ok(base.boundaryGlueBoard);
  assert.strictEqual(base.rows, 4);
  assert.strictEqual(base.gluedEdges.length, 0);

  const rectangle = boundaryGoState({ rows: 13, cols: 9 });
  assert.strictEqual(rectangle.preset.rows, 13);
  assert.strictEqual(rectangle.preset.cols, 9);
  assert.strictEqual(rectangle.preset.gluedEdges.length, 22);

  let ticTacToe = game.beginGomokuGame('gomoku-tic-tac-toe');
  [
    [1, 1],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3]
  ].forEach(([row, col]) => {
    ticTacToe = game.placeGomokuStone(ticTacToe, game.indexOf(row, col, 3)).state;
  });
  assert.strictEqual(ticTacToe.preset.gomokuWinLength, undefined);
  assert.strictEqual(ticTacToe.winner, 'black');
  assertLineMatchesEitherDirection(ticTacToe.winningLine, [1, 2, 0, 1, 2]);
  assert.deepStrictEqual(indexMultiplicities(ticTacToe.winningLine), { 0: 1, 1: 2, 2: 2 });
  assert.strictEqual(game.countUnmatchedBoundaries(ticTacToe.preset, ticTacToe.removed), 0);

  const strangeCorner = game.createGomokuState('gomoku-strange-corner');
  assert.strictEqual(strangeCorner.preset.gluedEdges.length, 10);
  assert.strictEqual(game.countUnmatchedBoundaries(strangeCorner.preset, strangeCorner.removed), 40);

  const smallHoles = game.createGomokuState('gomoku-small-holes');
  assert.strictEqual(smallHoles.preset.removedTiles.length, 9);
  assert.strictEqual(smallHoles.preset.gluedEdges.length, 18);
  assert.strictEqual(game.countUnmatchedBoundaries(smallHoles.preset, smallHoles.removed), 60);

  const bigHole = game.createGomokuState('gomoku-big-hole');
  assert.strictEqual(bigHole.preset.removedTiles.length, 25);
  assert.strictEqual(bigHole.preset.gluedEdges.length, 10);
  assert.strictEqual(game.countUnmatchedBoundaries(bigHole.preset, bigHole.removed), 60);

  const genusFour = game.createGomokuState('gomoku-m4-15x15');
  assert.strictEqual(genusFour.preset.label, 'genus 4');
  assert.strictEqual(genusFour.preset.rows, 15);
  assert.strictEqual(genusFour.preset.cols, 15);
  assert.strictEqual(genusFour.preset.surface, 'M_4,1');
  assert.strictEqual(genusFour.preset.removedTiles.length, 25);
  assert.strictEqual(genusFour.preset.gluedEdges.length, 40);
  assert.strictEqual(game.countUnmatchedBoundaries(genusFour.preset, genusFour.removed), 0);
  assert.deepStrictEqual(genusFour.preset.gluedEdges.slice(0, 5).map(gluedEdgeSignature), [
    '0:5,10,1>1,10,3',
    '0:5,9,1>1,9,3',
    '0:5,8,1>1,8,3',
    '0:5,7,1>1,7,3',
    '0:5,6,1>1,6,3'
  ]);
}

function testOfficialGomokuTorusUsesFiveInLineMultiplicity() {
  let state = game.beginGomokuGame('gomoku-tic-tac-toe');
  state = playGomokuMoves(state, [
    [1, 2], [2, 1],
    [2, 2], [2, 3],
    [3, 2]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.strictEqual(state.winningLine.length, 5);
  assert.deepStrictEqual(indexMultiplicities(state.winningLine), { 1: 1, 4: 2, 7: 2 });

  const winFromTop = game.findGomokuWin(state, game.indexOf(1, 2, 3), 'black');
  assert.ok(winFromTop);
  assert.deepStrictEqual(winFromTop.line, [7, 1, 4, 7, 1]);
  state.winningLine = winFromTop.line;
  const segments = game.placementWinningLineSegments(state, squareTestGeometry(3, 3));
  const repeatedSegments = segments.filter((segment) => segment.count === 2);
  assert.strictEqual(repeatedSegments.length, 2);
  assert.ok(repeatedSegments.some((segment) => segment.start.y > 24 && segment.end.y > 29));
  assert.ok(repeatedSegments.some((segment) => segment.start.y < 1 && segment.end.y <= 5));
}

function testOfficialGomokuTorusLegacyImportUpgradesWinLength() {
  const officialPreset = game.PRESETS.find((preset) => preset.id === 'gomoku-tic-tac-toe');
  assert.ok(officialPreset);
  const legacyPreset = JSON.parse(JSON.stringify(officialPreset));
  legacyPreset.gomokuWinLength = 3;
  assert.strictEqual(game.normalizePresetPayload(legacyPreset).gomokuWinLength, undefined);
  const { elements } = createHeadlessDomHarness();
  importHeadlessStatus(elements, {
    gameMode: 'gomoku',
    preset: legacyPreset,
    phase: 'gameover',
    ending: 'gomoku-win',
    round: 5,
    turn: 'black',
    winner: 'black',
    winningLine: [1, 4, 7],
    resultDismissed: true,
    nextStoneId: 6,
    stones: [
      { id: 1, row: 1, col: 2, color: 'black' },
      { id: 3, row: 2, col: 2, color: 'black' },
      { id: 2, row: 2, col: 3, color: 'white' },
      { id: 5, row: 3, col: 2, color: 'black' },
      { id: 4, row: 3, col: 3, color: 'white' }
    ]
  });
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.gomokuWinLength, undefined);
  assert.strictEqual(exported.winningLine.length, 5);
  assert.deepStrictEqual(indexMultiplicities(exported.winningLine), { 1: 2, 4: 1, 7: 2 });
}

function testCustomGomokuThreeInLinePresetStillWorks() {
  const preset = game.normalizePresetPayload({
    id: 'custom-three-line',
    label: 'custom three line',
    gameTypes: ['Gomoku'],
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'custom',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    gomokuWinLength: 3
  });
  assert.strictEqual(preset.gomokuWinLength, 3);
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2]);
}

function testGoCaptureSuicideKoAndScoring() {
  const preset = {
    id: 'go-3x3',
    label: 'go 3x3',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'go test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginGoGame(preset, { komi: 6.5 });
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(2, 3, 3), color: 'black' },
    { id: 4, index: game.indexOf(2, 2, 3), color: 'white' }
  ];
  state.nextStoneId = 5;
  state.turn = 'black';
  let result = game.placeGoStone(state, game.indexOf(3, 2, 3));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.captures.black, 1);
  assert.ok(!result.state.stones.some((stone) => stone.index === game.indexOf(2, 2, 3)));

  state = game.beginGoGame(preset);
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(2, 3, 3), color: 'black' },
    { id: 4, index: game.indexOf(3, 2, 3), color: 'black' }
  ];
  state.nextStoneId = 5;
  state.turn = 'white';
  result = game.placeGoStone(state, game.indexOf(2, 2, 3));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'suicide is not legal');

  state = game.beginGoGame(preset);
  state.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(3, 2, 3), color: 'black' },
    { id: 4, index: game.indexOf(2, 2, 3), color: 'white' }
  ];
  state.nextStoneId = 5;
  state.turn = 'black';
  state.previousBoardSignature = [
    `${game.indexOf(1, 2, 3)}:black`,
    `${game.indexOf(2, 1, 3)}:black`,
    `${game.indexOf(2, 3, 3)}:black`,
    `${game.indexOf(3, 2, 3)}:black`
  ].sort().join('|');
  result = game.placeGoStone(state, game.indexOf(2, 3, 3));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'simple ko forbids this recapture');

  state = game.beginGoGame(preset, { komi: 6.5 });
  state.stones = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(3, 3, 3), color: 'white' }
  ];
  state.nextStoneId = 3;
  result = game.passGoTurn(state);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.turn, 'white');
  result = game.passGoTurn(result.state);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'white');
  assert.strictEqual(result.state.finalScore.komi, 6.5);
}

function testGoGluedCaptureUsesSurfaceSuccessor() {
  const preset = {
    id: 'go-glued-capture',
    label: 'go glued capture',
    lattice: 'square',
    rows: 1,
    cols: 2,
    surface: 'go glued capture',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [
      { first: { row: 1, col: 1, dir: game.DIRS.E }, second: { row: 1, col: 2, dir: game.DIRS.W } }
    ]
  };
  const state = game.beginGoGame(preset);
  state.stones = [{ id: 1, index: game.indexOf(1, 1, 2), color: 'white' }];
  state.nextStoneId = 2;
  state.turn = 'black';
  const result = game.placeGoStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.captures.black, 1);
  assert.deepStrictEqual(result.state.stones.map((stone) => stone.color), ['black']);
}

function testReversiOpeningFlipsAndScoring() {
  let state = game.beginReversiGame(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions({
    mode: game.BOUNDARY_GLUE_MODES.OPEN,
    rows: 8,
    cols: 8
  }));
  assert.strictEqual(state.preset.rows, 8);
  assert.strictEqual(state.discs.length, 4);
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(3, 4, 8), 'black'), [game.indexOf(4, 4, 8)]);
  let result = game.placeReversiDisc(state, game.indexOf(3, 4, 8));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.flips.length, 1);
  assert.strictEqual(result.state.discs.find((disc) => disc.index === game.indexOf(4, 4, 8)).color, 'black');

  const linePreset = {
    id: 'reversi-line',
    label: 'reversi line',
    lattice: 'square',
    rows: 1,
    cols: 3,
    surface: 'line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  state = game.beginReversiGame(linePreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(1, 2, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  result = game.placeReversiDisc(state, game.indexOf(1, 3, 3));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'black');
  assert.deepStrictEqual(result.state.finalScore, { black: 3, white: 0 });
}

function testReversiCenteredOpeningDimensions() {
  const cases = [
    [8, 8, [
      '4,4:white', '4,5:black',
      '5,4:black', '5,5:white'
    ]],
    [9, 8, [
      '4,4:white', '4,5:black',
      '5,4:black', '5,5:white',
      '6,4:white', '6,5:black'
    ]],
    [8, 9, [
      '4,4:white', '4,5:black', '4,6:white',
      '5,4:black', '5,5:white', '5,6:black'
    ]],
    [9, 9, [
      '4,4:white', '4,5:black', '4,6:white',
      '5,4:black', '5,5:white', '5,6:black',
      '6,4:white', '6,5:black', '6,6:white'
    ]]
  ];
  cases.forEach(([rows, cols, expected]) => {
    const sortedExpected = expected.slice().sort();
    const pure = game.centeredReversiOpening(rows, cols).map((entry) => {
      const point = game.rowCol(entry.index, cols);
      return `${point.row},${point.col}:${entry.color}`;
    }).sort();
    assert.deepStrictEqual(pure, sortedExpected);

    const state = game.createReversiState(game.BOUNDARY_GLUE_BOARD_PRESET_ID, boundaryBoardOptions({
      mode: game.BOUNDARY_GLUE_MODES.OPEN,
      rows,
      cols
    }));
    assert.deepStrictEqual(discsAt(state), sortedExpected);
  });
}

function testReversiGluedFlipAndLoopGuard() {
  const gluedPreset = {
    id: 'reversi-glued',
    label: 'reversi glued',
    lattice: 'square',
    rows: 1,
    cols: 3,
    surface: 'glued',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 1, dir: game.DIRS.W } }
    ]
  };
  let state = game.beginReversiGame(gluedPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(1, 3, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(1, 2, 3), 'black'), [game.indexOf(1, 3, 3)]);

  const loopPreset = {
    ...gluedPreset,
    id: 'reversi-loop',
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 2, dir: game.DIRS.W } }
    ]
  };
  state = game.beginReversiGame(loopPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'white' },
    { id: 2, index: game.indexOf(1, 3, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  assert.deepStrictEqual(game.reversiFlipsForMove(state, game.indexOf(1, 1, 3), 'black'), []);
}

function testReversiDiagonalFlipsAndAnimationMetadata() {
  const diagonalPreset = {
    id: 'reversi-diagonal',
    label: 'reversi diagonal',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'diagonal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginReversiGame(diagonalPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 1, 4), color: 'black' },
    { id: 2, index: game.indexOf(2, 2, 4), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  let result = game.placeReversiDisc(state, game.indexOf(3, 3, 4));
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(result.flips, [game.indexOf(2, 2, 4)]);
  assert.ok(result.lines.some((line) => line.kind === 'diagonal'));
  assert.deepStrictEqual(result.flippedDiscs, [{
    id: 2,
    index: game.indexOf(2, 2, 4),
    fromColor: 'white',
    toColor: 'black'
  }]);

  const gluedPreset = {
    id: 'reversi-glued-diagonal',
    label: 'reversi glued diagonal',
    lattice: 'square',
    rows: 3,
    cols: 3,
    surface: 'glued diagonal',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 3, col: 1, dir: game.DIRS.W } }
    ]
  };
  state = game.beginReversiGame(gluedPreset);
  state.discs = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'white' }
  ];
  state.nextDiscId = 3;
  state.turn = 'black';
  result = game.placeReversiDisc(state, game.indexOf(1, 3, 3));
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(result.flips, [game.indexOf(2, 1, 3)]);
  const gluedLine = result.lines.find((line) => line.kind === 'diagonal');
  assert.ok(gluedLine);
  assert.ok(gluedLine.routes.some((route) => route.transitions.some((transition) => transition.glued)));
}

function testChineseCheckersSetupMovesJumpsAndWin() {
  const state = game.beginChineseCheckersGame('chinese-checkers-hex-rhombus-9x9');
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.strictEqual(state.marbles.length, 8);
  assert.strictEqual(state.camps.starts.red.size, 4);
  const firstMove = game.placeChineseCheckerMarble(state, game.indexOf(1, 2, 9), game.indexOf(1, 3, 9));
  assert.strictEqual(firstMove.changed, true);
  assert.strictEqual(firstMove.state.turn, 'yellow');

  const jumpPreset = {
    id: 'checkers-jump',
    label: 'checkers jump',
    lattice: 'square',
    rows: 1,
    cols: 5,
    surface: 'jump line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 5 }],
      yellowStart: [{ row: 1, col: 2 }, { row: 1, col: 4 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  let jumpState = game.beginChineseCheckersGame(jumpPreset);
  const moveMap = game.chineseCheckerMoveMap(jumpState, game.indexOf(1, 1, 5));
  assert.deepStrictEqual(moveMap.get(game.indexOf(1, 5, 5)).path, [
    game.indexOf(1, 1, 5),
    game.indexOf(1, 3, 5),
    game.indexOf(1, 5, 5)
  ]);
  const jumpResult = game.placeChineseCheckerMarble(jumpState, game.indexOf(1, 1, 5), game.indexOf(1, 5, 5));
  assert.strictEqual(jumpResult.changed, true);
  assert.strictEqual(jumpResult.state.phase, 'gameover');
  assert.strictEqual(jumpResult.state.winner, 'red');
  assert.deepStrictEqual(jumpResult.state.winningLine, []);

  jumpState = game.beginChineseCheckersGame({
    ...jumpPreset,
    removedTiles: [{ row: 1, col: 5 }]
  });
  const illegal = game.placeChineseCheckerMarble(jumpState, game.indexOf(1, 1, 5), game.indexOf(1, 5, 5));
  assert.strictEqual(illegal.changed, false);
  assert.strictEqual(illegal.message, 'target tile is removed');
}

function testChineseCheckersSuperJumpRulesAndSegments() {
  const superPreset = {
    id: 'checkers-super-jump',
    label: 'checkers super jump',
    lattice: 'square',
    rows: 1,
    cols: 5,
    surface: 'super jump line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 5 }],
      yellowStart: [{ row: 1, col: 3 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  let state = game.beginChineseCheckersGame(superPreset);
  let moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  let move = moveMap.get(game.indexOf(1, 5, 5));
  assert.ok(move);
  assert.strictEqual(move.kind, 'jump');
  assert.deepStrictEqual(move.path, [game.indexOf(1, 1, 5), game.indexOf(1, 5, 5)]);
  assert.strictEqual(move.segments[0].jumped, game.indexOf(1, 3, 5));
  assert.deepStrictEqual(move.segments[0].path, [
    game.indexOf(1, 1, 5),
    game.indexOf(1, 2, 5),
    game.indexOf(1, 3, 5),
    game.indexOf(1, 4, 5),
    game.indexOf(1, 5, 5)
  ]);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    chineseCheckersCamps: {
      ...superPreset.chineseCheckersCamps,
      yellowStart: [{ row: 1, col: 2 }]
    }
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    chineseCheckersCamps: {
      ...superPreset.chineseCheckersCamps,
      yellowStart: [{ row: 1, col: 3 }, { row: 1, col: 4 }]
    }
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  state = game.beginChineseCheckersGame({
    ...superPreset,
    removedTiles: [{ row: 1, col: 4 }]
  });
  moveMap = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 5));
  assert.strictEqual(moveMap.has(game.indexOf(1, 5, 5)), false);

  const gluedPreset = {
    id: 'checkers-super-glued',
    label: 'checkers super glued',
    lattice: 'square',
    rows: 1,
    cols: 6,
    surface: 'super glued line',
    removedTiles: [],
    cutEdges: [
      { left: { row: 1, col: 2 }, right: { row: 1, col: 3 } }
    ],
    gluedEdges: [
      { first: { row: 1, col: 2, dir: game.DIRS.E }, second: { row: 1, col: 4, dir: game.DIRS.W } }
    ],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 6 }],
      yellowStart: [{ row: 1, col: 4 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  state = game.beginChineseCheckersGame(gluedPreset);
  move = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 6)).get(game.indexOf(1, 6, 6));
  assert.ok(move);
  assert.strictEqual(move.segments[0].jumped, game.indexOf(1, 4, 6));
  assert.ok(move.segments[0].transitions.some((transition) => transition.glued));

  state = game.beginChineseCheckersGame(gluedPreset, { jumpRule: 'adjacent-or-two' });
  move = game.chineseCheckerMoveMap(state, game.indexOf(1, 1, 6)).get(game.indexOf(1, 6, 6));
  assert.ok(move);
  assert.strictEqual(move.segments[0].jumpDistance, 2);
  assert.ok(move.segments[0].transitions.some((transition) => transition.glued));
}

function testChineseCheckersJumpRules() {
  const preset = {
    id: 'checkers-jump-rules',
    label: 'checkers jump rules',
    lattice: 'square',
    rows: 1,
    cols: 9,
    surface: 'jump rules line',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersCamps: {
      redStart: [{ row: 1, col: 1 }],
      redTarget: [{ row: 1, col: 9 }],
      yellowStart: [{ row: 1, col: 2 }],
      yellowTarget: [{ row: 1, col: 1 }]
    }
  };
  const setPosition = (jumpRule, occupiedColumns) => {
    const state = game.beginChineseCheckersGame(preset, { jumpRule, playerColors: ['red'] });
    state.marbles = [
      { id: 1, index: game.indexOf(1, 1, 9), color: 'red' },
      ...occupiedColumns.map((col, index) => ({ id: index + 2, index: game.indexOf(1, col, 9), color: 'yellow' }))
    ];
    state.nextMarbleId = state.marbles.length + 1;
    state.turn = 'red';
    return state;
  };
  const from = game.indexOf(1, 1, 9);

  let state = setPosition('unlimited', [4]);
  assert.ok(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 7, 9)));

  state = setPosition('adjacent', [2]);
  assert.ok(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 3, 9)));
  state = setPosition('adjacent', [3]);
  assert.strictEqual(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 5, 9)), false);

  state = setPosition('adjacent-or-two', [3]);
  assert.ok(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 5, 9)));
  state = setPosition('adjacent-or-two', [4]);
  assert.strictEqual(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 7, 9)), false);

  state = setPosition('adjacent-or-two', [2, 4]);
  assert.ok(game.chineseCheckerMoveMap(state, from).has(game.indexOf(1, 5, 9)));

  state = setPosition('adjacent-or-two', [2, 5]);
  const firstJump = game.placeChineseCheckerMarble(state, from, game.indexOf(1, 3, 9), { stepwise: true });
  assert.strictEqual(firstJump.changed, true);
  assert.strictEqual(firstJump.state.jumpChain.jumpDistance, 1);
  const mixedJump = game.placeChineseCheckerMarble(firstJump.state, game.indexOf(1, 3, 9), game.indexOf(1, 7, 9), { stepwise: true });
  assert.strictEqual(mixedJump.changed, false);
  assert.strictEqual(mixedJump.message, 'target is not a legal next jump');
}

function testPieceSetsInitializePlacementGames() {
  const goState = game.beginGoGame({
    id: 'piece-set-go',
    label: 'piece set go',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'piece set go',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: {
        black: [{ row: 1, col: 1 }],
        white: [{ row: 5, col: 5 }]
      },
      targets: {}
    }
  });
  assert.deepStrictEqual(goState.stones.map((stone) => [stone.index, stone.color]), [
    [game.indexOf(1, 1, 5), 'black'],
    [game.indexOf(5, 5, 5), 'white']
  ]);

  const reversiState = game.beginReversiGame({
    id: 'piece-set-reversi',
    label: 'piece set reversi',
    lattice: 'square',
    rows: 4,
    cols: 4,
    surface: 'piece set reversi',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: {
        black: [{ row: 1, col: 1 }],
        white: [{ row: 1, col: 2 }]
      },
      targets: {}
    }
  });
  assert.deepStrictEqual(reversiState.discs.map((disc) => [disc.index, disc.color]), [
    [game.indexOf(1, 1, 4), 'black'],
    [game.indexOf(1, 2, 4), 'white']
  ]);

  const blackSolo = game.beginChineseCheckersGame({
    id: 'piece-set-checkers-black',
    label: 'piece set checkers black',
    lattice: 'square',
    rows: 1,
    cols: 2,
    surface: 'piece set checkers black',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    pieceSets: {
      starts: { black: [{ row: 1, col: 1 }] },
      targets: { black: [{ row: 1, col: 2 }] }
    }
  });
  assert.deepStrictEqual(blackSolo.playerColors, ['black']);
  assert.strictEqual(blackSolo.turn, 'black');
  assert.deepStrictEqual(blackSolo.marbles.map((marble) => marble.color), ['black']);
  const soloMove = game.placeChineseCheckerMarble(blackSolo, game.indexOf(1, 1, 2), game.indexOf(1, 2, 2));
  assert.strictEqual(soloMove.changed, true);
  assert.strictEqual(soloMove.state.phase, 'gameover');
  assert.strictEqual(soloMove.state.winner, 'black');
  assert.deepStrictEqual(soloMove.state.winningLine, []);

  const multi = game.beginChineseCheckersGame({
    id: 'piece-set-checkers-multi',
    label: 'piece set checkers multi',
    lattice: 'square',
    rows: 1,
    cols: 4,
    surface: 'piece set checkers multi',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    chineseCheckersPlayers: ['green', 'black'],
    pieceSets: {
      starts: {
        green: [{ row: 1, col: 1 }],
        black: [{ row: 1, col: 4 }]
      },
      targets: {
        green: [{ row: 1, col: 4 }],
        black: [{ row: 1, col: 1 }]
      }
    }
  });
  assert.deepStrictEqual(multi.playerColors, ['green', 'black']);
  assert.strictEqual(multi.turn, 'green');
  const firstMove = game.placeChineseCheckerMarble(multi, game.indexOf(1, 1, 4), game.indexOf(1, 2, 4));
  assert.strictEqual(firstMove.changed, true);
  assert.strictEqual(firstMove.state.turn, 'black');
}

function testHexClassicPreset() {
  const state = game.createGameState('hex-classic-4x4');
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.strictEqual(game.latticeForPreset(state.preset).sides, 6);
  assert.strictEqual(game.emptyExistingIndices(state).length, 16);
  assert.strictEqual(state.preset.gluedEdges.length, 0);
  assert.strictEqual(game.countUnmatchedBoundaries(state.preset, state.removed), 30);
}

function testColouredHexQFilePreset() {
  const state = game.createGameState('4-4-classic');
  assert.strictEqual(state.preset.id, '4-4-classic');
  assert.strictEqual(state.preset.lattice, 'hexagonal');
  assert.deepStrictEqual(state.preset.gluedEdges.map((pair) => [pair.first.dir, pair.second.dir]), [
    [game.HEX_DIRS.NW, game.HEX_DIRS.SE]
  ]);
  assert.deepStrictEqual(state.preset.pieceSets.starts.black, [{ row: 3, col: 1 }, { row: 4, col: 1 }]);
}

function testHexClassicSuccessors() {
  const state = game.createGameState('hex-classic-4x4');
  const center = game.indexOf(2, 2, 4);
  const expected = [
    [game.HEX_DIRS.E, 2, 3],
    [game.HEX_DIRS.SE, 3, 3],
    [game.HEX_DIRS.SW, 3, 2],
    [game.HEX_DIRS.W, 2, 1],
    [game.HEX_DIRS.NW, 1, 2],
    [game.HEX_DIRS.NE, 1, 3]
  ];
  expected.forEach(([dir, row, col]) => {
    const step = game.surfaceSuccessor(state, center, dir);
    assert.strictEqual(step.kind, 'direct');
    assert.strictEqual(step.index, game.indexOf(row, col, 4));
  });
}

function playGomokuMoves(state, moves) {
  return moves.reduce((current, move) => {
    const [row, col] = move;
    const result = game.placeGomokuStone(current, game.indexOf(row, col, current.preset.cols));
    assert.strictEqual(result.changed, true, result.message || `move ${row},${col} should be valid`);
    return result.state;
  }, state);
}

function testGomokuAlternatingPlacement() {
  let state = game.beginGomokuGame('classic-4x4');
  let result = game.placeGomokuStone(state, game.indexOf(1, 1, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.stone.color, 'black');
  assert.strictEqual(result.state.turn, 'white');
  assert.strictEqual(result.state.round, 1);
  result = game.placeGomokuStone(result.state, game.indexOf(1, 2, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.stone.color, 'white');
  assert.strictEqual(result.state.turn, 'black');
  assert.deepStrictEqual(stonesAt(result.state), ['1,1:black', '1,2:white']);
}

function testGomokuRejectsOccupiedAndRemovedTiles() {
  const preset = {
    id: 'gomoku-removed',
    label: 'gomoku removed',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [{ row: 1, col: 1 }],
    cutEdges: [],
    gluedEdges: []
  };
  let state = game.beginGomokuGame(preset);
  let result = game.placeGomokuStone(state, game.indexOf(1, 1, 2));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'tile is removed');
  result = game.placeGomokuStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, true);
  state = result.state;
  result = game.placeGomokuStone(state, game.indexOf(1, 2, 2));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'tile already has a stone');
  assert.deepStrictEqual(stonesAt(state), ['1,2:black']);
}

function testGomokuSquareHorizontalWin() {
  const preset = {
    id: 'gomoku-square-win',
    label: 'gomoku square win',
    lattice: 'square',
    rows: 2,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3], [2, 3],
    [1, 4], [2, 4],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2, 3, 4]);
}

function testGomokuHexAxisWin() {
  const preset = {
    id: 'gomoku-hex-win',
    label: 'gomoku hex win',
    lattice: 'hexagonal',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [3, 1], [1, 1],
    [3, 2], [1, 2],
    [3, 3], [1, 3],
    [3, 4], [1, 4],
    [3, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(3, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(3, 4, 5),
    game.indexOf(3, 5, 5)
  ]);
}

function testGomokuSquareDiagonalWin() {
  const preset = {
    id: 'gomoku-square-diagonal-win',
    label: 'gomoku square diagonal win',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [5, 1], [1, 1],
    [4, 2], [1, 2],
    [3, 3], [1, 3],
    [2, 4], [2, 1],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(5, 1, 5),
    game.indexOf(4, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(2, 4, 5),
    game.indexOf(1, 5, 5)
  ]);
}

function testGomokuDiagonalChecksAlternateStepOrders() {
  const preset = {
    id: 'gomoku-diagonal-branch-win',
    label: 'gomoku diagonal branch win',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 2, col: 4 }, right: { row: 2, col: 5 } }],
    gluedEdges: []
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [5, 1], [1, 1],
    [4, 2], [1, 2],
    [3, 3], [1, 3],
    [2, 4], [2, 1],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(5, 1, 5),
    game.indexOf(4, 2, 5),
    game.indexOf(3, 3, 5),
    game.indexOf(2, 4, 5),
    game.indexOf(1, 5, 5)
  ]);
}

function testGomokuDiagonalTransportsAfterRotatingGlue() {
  const preset = {
    id: 'gomoku-diagonal-transport-rotation',
    label: 'gomoku diagonal transport rotation',
    lattice: 'square',
    rows: 7,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 3, dir: game.DIRS.N }, second: { row: 3, col: 5, dir: game.DIRS.E } }
    ]
  };
  const state = game.createGomokuState(preset);
  const line = [
    game.indexOf(1, 3, 5),
    game.indexOf(4, 5, 5),
    game.indexOf(5, 4, 5),
    game.indexOf(6, 3, 5),
    game.indexOf(7, 2, 5)
  ];
  state.stones = line.map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  const win = game.findGomokuWin(state, line[0], 'black');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, line);

  const route = game.placementLineTransitionRoute(state, line[0], line[1]);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.N, game.DIRS.S]);
  assert.strictEqual(route.transitions[0].glued, true);
}

function testGomokuDiagonalTransportsAfterReflectingGlue() {
  const preset = {
    id: 'gomoku-diagonal-transport-reflection',
    label: 'gomoku diagonal transport reflection',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, reversed: true, first: { row: 5, col: 5, dir: game.DIRS.E }, second: { row: 5, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = game.createGomokuState(preset);
  const line = [
    game.indexOf(5, 5, 5),
    game.indexOf(4, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(2, 3, 5),
    game.indexOf(1, 4, 5)
  ];
  state.stones = line.map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  const win = game.findGomokuWin(state, line[0], 'black');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, line);

  const route = game.placementLineTransitionRoute(state, line[0], line[1]);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.E, game.DIRS.N]);
  assert.strictEqual(route.transitions[0].glued, true);
  assert.strictEqual(route.transitions[0].edge.reversed, true);
}

function testGomokuGluedEdgeWin() {
  const preset = {
    id: 'gomoku-glued-win',
    label: 'gomoku glued win',
    lattice: 'square',
    rows: 2,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 3 }, right: { row: 1, col: 4 } }],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 3, dir: game.DIRS.E }, second: { row: 1, col: 4, dir: game.DIRS.W } }
    ]
  };
  const state = playGomokuMoves(game.beginGomokuGame(preset), [
    [1, 1], [2, 1],
    [1, 2], [2, 2],
    [1, 3], [2, 3],
    [1, 4], [2, 4],
    [1, 5]
  ]);
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'black');
  assert.deepStrictEqual(state.winningLine, [0, 1, 2, 3, 4]);
  const route = game.placementLineTransitionRoute(state, game.indexOf(1, 3, 5), game.indexOf(1, 4, 5));
  assert.ok(route);
  assert.strictEqual(route.transitions.length, 1);
  assert.strictEqual(route.transitions[0].glued, true);
  assert.deepStrictEqual(
    route.transitions.map((transition) => [transition.from, transition.to, transition.edge && transition.edge.dir]),
    [[game.indexOf(1, 3, 5), game.indexOf(1, 4, 5), game.DIRS.E]]
  );
}

function testDiagonalGluedLineUsesBoundaryCorner() {
  const preset = {
    id: 'gomoku-diagonal-glued-render',
    label: 'gomoku diagonal glued render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 1, dir: game.DIRS.N }, second: { row: 2, col: 1, dir: game.DIRS.S } }
    ]
  };
  const state = game.createGomokuState(preset);
  state.winningLine = [game.indexOf(1, 1, 2), game.indexOf(2, 2, 2)];
  const geom = {
    cols: 2,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: [
      { row: 1, col: 1, x: 0, y: 0 },
      { row: 1, col: 2, x: 10, y: 0 },
      { row: 2, col: 1, x: 0, y: 10 },
      { row: 2, col: 2, x: 10, y: 10 }
    ]
  };
  const route = game.placementLineTransitionRoute(state, game.indexOf(1, 1, 2), game.indexOf(2, 2, 2));
  assert.ok(route);
  assert.strictEqual(route.kind, 'diagonal');
  assert.strictEqual(route.transitions[0].glued, true);
  const segments = game.placementLineRenderSegments(
    state,
    geom,
    game.indexOf(1, 1, 2),
    game.indexOf(2, 2, 2)
  );
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.notStrictEqual(segments[0].end.x, 0);
}

function testDiagonalGluedLineUsesCornerSharedWithPreviousTile() {
  const preset = {
    id: 'gomoku-diagonal-glued-second-step-render',
    label: 'gomoku diagonal glued second step render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [
      { left: { row: 1, col: 1 }, right: { row: 2, col: 1 } },
      { left: { row: 1, col: 2 }, right: { row: 2, col: 2 } }
    ],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 2, dir: game.DIRS.N }, second: { row: 2, col: 2, dir: game.DIRS.S } }
    ]
  };
  const state = game.createGomokuState(preset);
  const geom = {
    cols: 2,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: [
      { row: 1, col: 1, x: 0, y: 0 },
      { row: 1, col: 2, x: 10, y: 0 },
      { row: 2, col: 1, x: 0, y: 10 },
      { row: 2, col: 2, x: 10, y: 10 }
    ]
  };
  const from = game.indexOf(1, 1, 2);
  const to = game.indexOf(2, 2, 2);
  const route = game.placementLineTransitionRoute(state, from, to);
  assert.ok(route);
  assert.deepStrictEqual(route.directions, [game.DIRS.E, game.DIRS.N]);
  assert.strictEqual(route.transitions[1].glued, true);
  const segments = game.placementLineRenderSegments(state, geom, from, to);
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7 && segments[0].end.x < 5.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.ok(segments[1].start.x > 4.7 && segments[1].start.x < 5.7);
  assert.ok(segments[1].start.y > 14.7);
}

function testDiagonalLineCrossingTwoGluedEdgesUsesOnlyEndpointHalves() {
  const preset = {
    id: 'gomoku-diagonal-two-glued-render',
    label: 'gomoku diagonal two glued render',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'test',
    removedTiles: [],
    cutEdges: [
      { left: { row: 2, col: 1 }, right: { row: 2, col: 2 } }
    ],
    gluedEdges: [
      { group: 0, first: { row: 1, col: 1, dir: game.DIRS.N }, second: { row: 2, col: 1, dir: game.DIRS.S } },
      { group: 1, first: { row: 2, col: 1, dir: game.DIRS.E }, second: { row: 2, col: 2, dir: game.DIRS.W } }
    ]
  };
  const state = game.createGomokuState(preset);
  const geom = {
    cols: 2,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: [
      { row: 1, col: 1, x: 0, y: 0 },
      { row: 1, col: 2, x: 10, y: 0 },
      { row: 2, col: 1, x: 0, y: 10 },
      { row: 2, col: 2, x: 10, y: 10 }
    ]
  };
  const from = game.indexOf(1, 1, 2);
  const to = game.indexOf(2, 2, 2);
  const route = game.placementLineTransitionRoute(state, from, to);
  assert.ok(route);
  assert.strictEqual(route.kind, 'diagonal');
  assert.deepStrictEqual(route.directions, [game.DIRS.N, game.DIRS.E]);
  assert.ok(route.transitions.every((transition) => transition.glued));
  const segments = game.placementLineRenderSegments(state, geom, from, to);
  assert.strictEqual(segments.length, 2);
  assert.ok(segments[0].end.x > 4.7);
  assert.ok(segments[0].end.y < -4.7);
  assert.ok(segments[1].start.x > 4.7 && segments[1].start.x < 5.7);
  assert.ok(segments[1].start.y > 14.7);
}

function testImportedSelfGluedDiagonalWinRendersNoAxisSegments() {
  const preset = {
    id: 'imported-preset',
    label: '6x6 Sigma_0,1^1',
    lattice: 'square',
    rows: 6,
    cols: 6,
    surface: 'Sigma_0,1^1',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        reversed: false,
        firstArrowReversed: false,
        secondArrowReversed: true,
        first: { row: 1, col: 6, dir: game.DIRS.N },
        second: { row: 1, col: 6, dir: game.DIRS.E }
      }
    ],
    connectFourHoles: []
  };
  const state = game.createGomokuState(preset);
  state.phase = 'gameover';
  state.winner = 'black';
  state.winningLine = [16, 11, 5, 4, 9];
  state.stones = [
    { id: 5, index: 4, color: 'black' },
    { id: 1, index: 5, color: 'black' },
    { id: 7, index: 9, color: 'black' },
    { id: 3, index: 11, color: 'black' },
    { id: 9, index: 16, color: 'black' }
  ];
  const win = game.findGomokuWin(state, 16, 'black');
  assert.ok(win);
  assert.strictEqual(win.diagonal, true);
  assert.deepStrictEqual(win.line, state.winningLine);
  const geom = {
    cols: 6,
    radius: 5,
    size: 10,
    lattice: game.LATTICES.square,
    cells: Array.from({ length: 36 }, (_, index) => {
      const point = game.rowCol(index, 6);
      return {
        row: point.row,
        col: point.col,
        x: (point.col - 1) * 10,
        y: (point.row - 1) * 10
      };
    })
  };
  const pairRoute = game.placementLineTransitionRoute(state, 11, 5);
  assert.strictEqual(pairRoute.kind, 'axis');
  const segments = game.placementWinningLineSegments(state, geom);
  assert.strictEqual(segments.length, 8);
  segments.forEach((segment) => {
    assert.ok(Math.abs(segment.end.x - segment.start.x) > 0.1);
    assert.ok(Math.abs(segment.end.y - segment.start.y) > 0.1);
  });
}

function testGomokuCyclicReuseWin() {
  const state = boundaryGomokuState();
  state.phase = 'ready';
  state.stones = [1, 2, 3, 4].map((col, index) => ({
    id: index + 1,
    index: game.indexOf(1, col, 4),
    color: 'black'
  }));
  state.nextStoneId = 5;
  state.round = 4;
  const win = game.findGomokuWin(state, game.indexOf(1, 1, 4), 'black');
  assert.ok(win);
  assert.strictEqual(win.color, 'black');
  assert.deepStrictEqual(win.line, [
    game.indexOf(1, 1, 4),
    game.indexOf(1, 2, 4),
    game.indexOf(1, 3, 4),
    game.indexOf(1, 4, 4),
    game.indexOf(1, 1, 4)
  ]);
}

function connectFourPreset() {
  return {
    id: 'connect-four-test',
    label: 'connect four test',
    lattice: 'square',
    rows: 6,
    cols: 7,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
}

function connectFourTopHoles(count = 7, cols = 7) {
  return Array.from({ length: count }, (_, index) => game.indexOf(1, index + 1, cols));
}

function testPlacementReachAssistRoutesAndGroups() {
  const dropStart = game.indexOf(1, 1, 7);
  const connect = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: [dropStart]
  });
  const drop = game.placementReachAssist(connect, dropStart);
  assert.strictEqual(drop.kind, 'connect-four-drop');
  assert.strictEqual(drop.path[0], dropStart);
  assert.strictEqual(drop.landingIndex, game.indexOf(6, 1, 7));
  assert.strictEqual(drop.cycle, false);

  connect.tokens = [
    { id: 1, index: game.indexOf(3, 3, 7), color: 'red' },
    { id: 2, index: game.indexOf(3, 5, 7), color: 'yellow' }
  ];
  const connectRays = game.placementReachAssist(connect, game.indexOf(3, 3, 7));
  assert.strictEqual(connectRays.kind, 'rays');
  assert.strictEqual(connectRays.stepLimit, 3);
  assert.deepStrictEqual(connectRays.directions.map((direction) => direction.id), ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']);
  assert.ok(connectRays.routes.every((route) => route.directionId && route.oppositeDirectionId && route.axisId));
  assert.ok(connectRays.routes.some((route) => route.kind === 'axis' && route.path.includes(game.indexOf(3, 4, 7))));
  assert.ok(!connectRays.routes.some((route) => route.path.includes(game.indexOf(3, 5, 7))), 'opponents stop rays before their tile');

  const gomokuPreset = {
    id: 'reach-assist-gomoku', label: 'reach assist gomoku', lattice: 'square', rows: 5, cols: 5,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  };
  const gomoku = game.beginGomokuGame(gomokuPreset);
  const center = game.indexOf(3, 3, 5);
  gomoku.stones = [{ id: 1, index: center, color: 'black' }];
  const gomokuRays = game.placementReachAssist(gomoku, center);
  assert.strictEqual(gomokuRays.stepLimit, 4);
  assert.ok(gomokuRays.routes.some((route) => route.kind === 'diagonal'), 'square boards include diagonal rays');
  assert.ok(gomokuRays.routes.some((route) => route.directionId === 'NE' && route.axisId === 'SW-NE'));
  const gomokuGhost = game.indexOf(3, 2, 5);
  gomoku.turn = 'white';
  const virtualGomokuRays = game.placementReachAssist(gomoku, gomokuGhost);
  assert.strictEqual(virtualGomokuRays.kind, 'rays');
  assert.strictEqual(virtualGomokuRays.origin, gomokuGhost);
  assert.strictEqual(virtualGomokuRays.color, 'white', 'empty Gomoku points analyze the current-player ghost');
  assert.ok(!gomoku.stones.some((stone) => stone.index === gomokuGhost), 'hypothetical Gomoku analysis must not mutate the board');

  const cutGomoku = game.beginGomokuGame({
    id: 'reach-assist-cut', label: 'reach assist cut', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [],
    cutEdges: [{ left: { row: 2, col: 2 }, right: { row: 2, col: 3 } }], gluedEdges: []
  });
  const cutCenter = game.indexOf(2, 2, 3);
  cutGomoku.stones = [{ id: 1, index: cutCenter, color: 'black' }];
  const cutRays = game.placementReachAssist(cutGomoku, cutCenter);
  assert.ok(!cutRays.routes.some((route) => route.kind === 'axis' && route.path.includes(game.indexOf(2, 3, 3))), 'cut edges block axial rays');

  const hex = game.beginGomokuGame({
    id: 'reach-assist-hex', label: 'reach assist hex', lattice: 'hexagonal', rows: 5, cols: 5,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  const hexCenter = game.indexOf(3, 3, 5);
  hex.stones = [{ id: 1, index: hexCenter, color: 'black' }];
  const hexRays = game.placementReachAssist(hex, hexCenter);
  assert.deepStrictEqual(hexRays.directions.map((direction) => direction.id), ['E', 'SE', 'SW', 'W', 'NW', 'NE']);
  assert.strictEqual(hexRays.routes.filter((route) => route.kind === 'axis').length, 6);
  assert.strictEqual(hexRays.routes.filter((route) => route.kind === 'diagonal').length, 0);

  const go = game.beginGoGame({
    id: 'reach-assist-go', label: 'reach assist go', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  const goCenter = game.indexOf(2, 2, 3);
  const goRight = game.indexOf(2, 3, 3);
  go.stones = [
    { id: 1, index: goCenter, color: 'black' },
    { id: 2, index: goRight, color: 'black' }
  ];
  const group = game.placementReachAssist(go, goCenter);
  assert.strictEqual(group.kind, 'go-group');
  assert.deepStrictEqual(group.groupIndices, [goCenter, goRight]);
  assert.deepStrictEqual(group.libertyIndices, [
    game.indexOf(1, 2, 3), game.indexOf(1, 3, 3), game.indexOf(2, 1, 3), game.indexOf(3, 2, 3), game.indexOf(3, 3, 3)
  ]);

  const virtualGo = game.beginGoGame({
    id: 'reach-assist-go-virtual', label: 'reach assist go virtual', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  const virtualGoCenter = game.indexOf(2, 2, 3);
  const virtualGoRight = game.indexOf(2, 3, 3);
  virtualGo.stones = [{ id: 1, index: virtualGoCenter, color: 'black' }];
  virtualGo.nextStoneId = 2;
  const virtualGroup = game.placementReachAssist(virtualGo, virtualGoRight);
  assert.strictEqual(virtualGroup.kind, 'go-group');
  assert.strictEqual(virtualGroup.color, 'black');
  assert.deepStrictEqual(virtualGroup.groupIndices, [virtualGoCenter, virtualGoRight]);
  assert.deepStrictEqual(virtualGroup.libertyIndices, [
    game.indexOf(1, 2, 3), game.indexOf(1, 3, 3), game.indexOf(2, 1, 3), game.indexOf(3, 2, 3), game.indexOf(3, 3, 3)
  ]);
  assert.ok(!virtualGo.stones.some((stone) => stone.index === virtualGoRight), 'hypothetical Go analysis must not mutate the board');

  const virtualCapture = game.beginGoGame({
    id: 'reach-assist-go-capture', label: 'reach assist go capture', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  virtualCapture.stones = [
    { id: 1, index: game.indexOf(1, 1, 3), color: 'black' },
    { id: 2, index: game.indexOf(1, 2, 3), color: 'white' },
    { id: 3, index: game.indexOf(1, 3, 3), color: 'black' }
  ];
  virtualCapture.nextStoneId = 4;
  const captureGroup = game.placementReachAssist(virtualCapture, game.indexOf(2, 2, 3));
  assert.deepStrictEqual(captureGroup.groupIndices, [game.indexOf(2, 2, 3)]);
  assert.ok(captureGroup.libertyIndices.includes(game.indexOf(1, 2, 3)), 'virtual Go liberties reflect captured stones');
  assert.ok(virtualCapture.stones.some((stone) => stone.index === game.indexOf(1, 2, 3)), 'hypothetical capture leaves the live board unchanged');

  const illegalVirtualGo = game.beginGoGame({
    id: 'reach-assist-go-suicide', label: 'reach assist go suicide', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  illegalVirtualGo.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'white' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'white' },
    { id: 3, index: game.indexOf(2, 3, 3), color: 'white' },
    { id: 4, index: game.indexOf(3, 2, 3), color: 'white' }
  ];
  assert.strictEqual(game.placementReachAssist(illegalVirtualGo, game.indexOf(2, 2, 3)), null, 'suicide points do not get a hypothetical Go assist');

  const koVirtualGo = game.beginGoGame({
    id: 'reach-assist-go-ko', label: 'reach assist go ko', lattice: 'square', rows: 3, cols: 3,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  });
  koVirtualGo.stones = [
    { id: 1, index: game.indexOf(1, 2, 3), color: 'black' },
    { id: 2, index: game.indexOf(2, 1, 3), color: 'black' },
    { id: 3, index: game.indexOf(3, 2, 3), color: 'black' },
    { id: 4, index: game.indexOf(2, 2, 3), color: 'white' }
  ];
  koVirtualGo.previousBoardSignature = [
    `${game.indexOf(1, 2, 3)}:black`, `${game.indexOf(2, 1, 3)}:black`,
    `${game.indexOf(2, 3, 3)}:black`, `${game.indexOf(3, 2, 3)}:black`
  ].sort().join('|');
  assert.strictEqual(game.placementReachAssist(koVirtualGo, game.indexOf(2, 3, 3)), null, 'ko recaptures do not get a hypothetical Go assist');

  const gluedGo = game.beginGoGame({
    id: 'reach-assist-go-glued', label: 'reach assist go glued', lattice: 'square', rows: 1, cols: 2,
    surface: 'test', removedTiles: [],
    cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
    gluedEdges: [{ first: { row: 1, col: 1, dir: game.DIRS.E }, second: { row: 1, col: 2, dir: game.DIRS.W } }]
  });
  gluedGo.stones = [
    { id: 1, index: game.indexOf(1, 1, 2), color: 'black' },
    { id: 2, index: game.indexOf(1, 2, 2), color: 'black' }
  ];
  const gluedGroup = game.placementReachAssist(gluedGo, game.indexOf(1, 1, 2));
  assert.deepStrictEqual(gluedGroup.groupIndices, [game.indexOf(1, 1, 2), game.indexOf(1, 2, 2)]);
  assert.deepStrictEqual(gluedGroup.libertyIndices, []);

  const glued = game.beginConnectFourGame(boundaryConnectFourPreset(), {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 4, 4)]
  });
  glued.tokens = [{ id: 1, index: game.indexOf(1, 2, 4), color: 'yellow' }];
  const gluedDrop = game.placementReachAssist(glued, game.indexOf(1, 4, 4));
  assert.strictEqual(gluedDrop.transitions[0].glued, true);
  assert.strictEqual(gluedDrop.landingIndex, game.indexOf(1, 1, 4));

  glued.holes = new Set();
  glued.tokens = [{ id: 1, index: game.indexOf(1, 4, 4), color: 'red' }];
  const gluedRays = game.placementReachAssist(glued, game.indexOf(1, 4, 4));
  const eastRoute = gluedRays.routes.find((route) => route.directionId === 'E');
  assert.ok(eastRoute && eastRoute.transitions[0].glued, 'ray metadata survives a glued boundary transition');
  const gluedGeometry = game.__test.buildGeometry(glued.preset, 720, 16, 1);
  const eastTrack = game.__test.placementAssistRayTracks(glued, gluedGeometry, gluedRays)
    .find((track) => track.directionId === 'E');
  assert.ok(eastTrack && eastTrack.segments.length >= 2, 'a glued step keeps its ordered exit and re-entry fragments');
  assert.strictEqual(eastTrack.segments[0].startProgress, 0);
  assert.strictEqual(eastTrack.segments[eastTrack.segments.length - 1].endProgress, 1);
}

function testAnimatedPlacementRayHintHelpers() {
  assert.strictEqual(game.__test.placementAssistGrowDuration, 360);
  assert.strictEqual(game.__test.placementAssistGrowProgress(0), 0);
  assert.strictEqual(game.__test.placementAssistGrowProgress(0.5), 0.875);
  assert.strictEqual(game.__test.placementAssistGrowProgress(1), 1);
  assert.deepStrictEqual(game.__test.placementHintColorCounts({ lattice: 'square' }), { axis: 4, direction: 8 });
  assert.deepStrictEqual(game.__test.placementHintColorCounts({ lattice: 'hexagonal' }), { axis: 3, direction: 6 });
  assert.strictEqual(game.__test.normalizePlacementHintColorMode(), 'axis');
  assert.strictEqual(game.__test.normalizePlacementHintColorMode('uniform'), 'uniform');
  assert.strictEqual(game.__test.normalizePlacementHintColorMode('direction'), 'direction');

  const squareDirections = game.__test.placementHintDirectionDescriptors({ lattice: 'square' });
  const assist = { kind: 'rays', directions: squareDirections };
  assert.deepStrictEqual(Array.from(game.__test.placementHintHighlightedDirectionIds(assist, 'SE', 'single')), ['SE']);
  assert.deepStrictEqual(Array.from(game.__test.placementHintHighlightedDirectionIds(assist, 'SE', 'opposites')), ['SE', 'NW']);
  const east = squareDirections.find((direction) => direction.id === 'E');
  const west = squareDirections.find((direction) => direction.id === 'W');
  assert.strictEqual(game.__test.placementHintColorForRoute(east, 'uniform'), '#1f7a8c');
  assert.strictEqual(game.__test.placementHintColorForRoute(east, 'axis'), game.__test.placementHintColorForRoute(west, 'axis'));
  assert.notStrictEqual(game.__test.placementHintColorForRoute(east, 'direction'), game.__test.placementHintColorForRoute(west, 'direction'));

  const orderedFragments = [
    { start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, startProgress: 0, endProgress: 0.4 },
    { start: { x: 40, y: 0 }, end: { x: 50, y: 0 }, startProgress: 0.4, endProgress: 1 }
  ];
  assert.deepStrictEqual(game.__test.placementAssistVisibleSegments(orderedFragments, 0), []);
  const firstOnly = game.__test.placementAssistVisibleSegments(orderedFragments, 0.25);
  assert.strictEqual(firstOnly.length, 1);
  assert.strictEqual(firstOnly[0].end.x, 6.25);
  const throughGlue = game.__test.placementAssistVisibleSegments(orderedFragments, 0.7);
  assert.strictEqual(throughGlue.length, 2);
  assert.strictEqual(throughGlue[0].end.x, 10);
  assert.strictEqual(throughGlue[1].end.x, 45);
  assert.strictEqual(game.__test.placementAssistVisibleSegments(orderedFragments, 1).length, 2);

  const dropState = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: [game.indexOf(1, 1, 7)]
  });
  const dropAssist = game.placementReachAssist(dropState, game.indexOf(1, 1, 7));
  const dropGeometry = game.__test.buildGeometry(dropState.preset, 720, 16, 1);
  const dropTrack = game.__test.placementAssistDropTrack(dropState, dropGeometry, dropAssist);
  const markerRadius = dropGeometry.radius * 0.43;
  const markerLineWidth = game.__test.connectFourAssistMarkerLineWidth(markerRadius);
  const beamClipRadius = game.__test.connectFourAssistBeamClipRadius(markerRadius);
  const landingPoint = dropGeometry.cells[dropAssist.landingIndex];
  assert.strictEqual(dropTrack.segments.length, dropAssist.transitions.length);
  assert.ok(dropTrack.totalLength > 0);
  const dropStartFrame = game.__test.placementAssistDropFrame(dropTrack, 0, landingPoint, false);
  assert.deepStrictEqual(dropStartFrame.segments, []);
  assert.deepStrictEqual(dropStartFrame.markerPoint, dropTrack.segments[0].start);
  const dropMidFrame = game.__test.placementAssistDropFrame(dropTrack, 0.5, landingPoint, false);
  assert.ok(dropMidFrame.segments.length > 0);
  const dropMidBeamEnd = dropMidFrame.segments[dropMidFrame.segments.length - 1].end;
  assert.ok(Math.hypot(
    dropMidFrame.markerPoint.x - dropMidBeamEnd.x,
    dropMidFrame.markerPoint.y - dropMidBeamEnd.y
  ) < 0.001, 'the logical growing beam reaches the moving marker center');
  assert.ok(beamClipRadius < markerRadius - markerLineWidth / 2, 'the circular clip overlaps beneath the near-side dash');
  assert.ok(beamClipRadius > 0, 'the circular clip preserves a hollow center');
  const dropEndFrame = game.__test.placementAssistDropFrame(dropTrack, 1, landingPoint, false);
  assert.deepStrictEqual(dropEndFrame.markerPoint, { x: landingPoint.x, y: landingPoint.y });
  assert.strictEqual(dropEndFrame.markerVisible, true);

  const blockedDropState = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: [game.indexOf(1, 1, 7)]
  });
  blockedDropState.tokens = [{ id: 1, index: game.indexOf(3, 1, 7), color: 'yellow' }];
  const blockedAssist = game.placementReachAssist(blockedDropState, game.indexOf(1, 1, 7));
  const blockedTrack = game.__test.placementAssistDropTrack(blockedDropState, dropGeometry, blockedAssist);
  const blockedLandingPoint = dropGeometry.cells[game.indexOf(2, 1, 7)];
  const blockedFrame = game.__test.placementAssistDropFrame(blockedTrack, 1, blockedLandingPoint, false);
  assert.strictEqual(blockedAssist.landingIndex, game.indexOf(2, 1, 7));
  assert.deepStrictEqual(blockedFrame.markerPoint, { x: blockedLandingPoint.x, y: blockedLandingPoint.y });

  const markerArcs = [];
  const markerDashes = [];
  let markerStrokes = 0;
  let markerFills = 0;
  const markerContext = {
    save() {}, restore() {}, beginPath() {},
    arc(...args) { markerArcs.push(args); },
    stroke() { markerStrokes += 1; },
    fill() { markerFills += 1; },
    setLineDash(value) { markerDashes.push(value.slice()); }
  };
  game.__test.drawConnectFourAssistDashedMarker(markerContext, dropGeometry, dropState, { x: 12, y: 20 });
  assert.strictEqual(markerArcs.length, 1);
  assert.strictEqual(markerArcs[0][2], markerRadius);
  assert.strictEqual(markerStrokes, 1);
  assert.strictEqual(markerFills, 0, 'the dashed marker never fills its interior');
  assert.deepStrictEqual(markerDashes[0], game.__test.connectFourAssistMarkerDash(markerRadius));
  assert.deepStrictEqual(markerDashes[markerDashes.length - 1], []);
  assert.notStrictEqual(
    game.__test.connectFourAssistMarkerColors({ turn: 'red' }).stroke,
    game.__test.connectFourAssistMarkerColors({ turn: 'yellow' }).stroke
  );
  assert.strictEqual(game.__test.connectFourAssistMarkerColors({ turn: 'red' }).stroke, 'rgba(132, 31, 36, 0.98)');
  assert.strictEqual(game.__test.connectFourAssistMarkerColors({ turn: 'yellow' }).stroke, 'rgba(154, 113, 23, 0.98)');

  const clipCalls = [];
  const clipContext = {
    beginPath() { clipCalls.push({ method: 'beginPath' }); },
    rect(...args) { clipCalls.push({ method: 'rect', args }); },
    arc(...args) { clipCalls.push({ method: 'arc', args }); },
    clip(...args) { clipCalls.push({ method: 'clip', args }); }
  };
  game.__test.clipConnectFourAssistBeamOutsideMarkers(
    clipContext,
    dropGeometry,
    [dropTrack.segments[0].start, dropMidFrame.markerPoint],
    markerRadius
  );
  const beamClipArcs = clipCalls.filter((call) => call.method === 'arc');
  assert.strictEqual(beamClipArcs.length, 2, 'the beam is circularly clipped at its source and moving marker');
  assert.deepStrictEqual(beamClipArcs[0].args.slice(0, 2), [dropTrack.segments[0].start.x, dropTrack.segments[0].start.y]);
  assert.deepStrictEqual(beamClipArcs[1].args.slice(0, 2), [dropMidFrame.markerPoint.x, dropMidFrame.markerPoint.y]);
  assert.ok(beamClipArcs.every((call) => call.args[2] === beamClipRadius));
  assert.strictEqual(clipCalls.filter((call) => call.method === 'clip').length, 2);
  assert.ok(clipCalls.filter((call) => call.method === 'clip').every((call) => call.args[0] === 'evenodd'));

  clipCalls.length = 0;
  game.__test.clipConnectFourAssistBeamOutsideMarkers(
    clipContext,
    dropGeometry,
    [dropTrack.segments[0].start, { ...dropTrack.segments[0].start }],
    markerRadius
  );
  assert.strictEqual(
    clipCalls.filter((call) => call.method === 'arc').length,
    1,
    'coincident source and moving markers share one circular clip'
  );

  const gluedDropState = game.beginConnectFourGame(boundaryConnectFourPreset(), {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 4, 4)]
  });
  gluedDropState.tokens = [{ id: 1, index: game.indexOf(1, 2, 4), color: 'yellow' }];
  const gluedDropAssist = game.placementReachAssist(gluedDropState, game.indexOf(1, 4, 4));
  const gluedDropGeometry = game.__test.buildGeometry(gluedDropState.preset, 720, 16, 1);
  const gluedDropTrack = game.__test.placementAssistDropTrack(gluedDropState, gluedDropGeometry, gluedDropAssist);
  const gapIndex = gluedDropTrack.segments.findIndex((segment, index, segments) => {
    if (!index) return false;
    const previous = segments[index - 1];
    return Math.hypot(previous.end.x - segment.start.x, previous.end.y - segment.start.y) > 0.001;
  });
  assert.ok(gapIndex > 0, 'glued routes retain ordered exit and re-entry fragments');
  const beforeGap = gluedDropTrack.segments[gapIndex - 1];
  const afterGap = gluedDropTrack.segments[gapIndex];
  assert.deepStrictEqual(
    game.__test.placementAssistTrackPoint(gluedDropTrack, beforeGap.endProgress),
    beforeGap.end
  );
  const afterGapPoint = game.__test.placementAssistTrackPoint(gluedDropTrack, afterGap.startProgress + 0.000001);
  assert.ok(Math.hypot(afterGapPoint.x - afterGap.start.x, afterGapPoint.y - afterGap.start.y) < 0.01);

  const cycleDropState = game.beginConnectFourGame(boundaryConnectFourPreset(), {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 1, 4)]
  });
  const cycleDropAssist = game.placementReachAssist(cycleDropState, game.indexOf(1, 1, 4));
  const cycleDropGeometry = game.__test.buildGeometry(cycleDropState.preset, 720, 16, 1);
  const cycleDropTrack = game.__test.placementAssistDropTrack(cycleDropState, cycleDropGeometry, cycleDropAssist);
  assert.strictEqual(cycleDropAssist.cycle, true);
  assert.ok(cycleDropTrack.segments.length >= cycleDropAssist.transitions.length, 'the cycle closing transition is rendered');
  assert.strictEqual(
    game.__test.placementAssistDropFrame(cycleDropTrack, 0.999, null, true).markerVisible,
    true
  );
  assert.strictEqual(
    game.__test.placementAssistDropFrame(cycleDropTrack, 1, null, true).markerVisible,
    false
  );
  const completedCycleFrame = game.__test.placementAssistDropFrame(cycleDropTrack, 1, null, true);
  assert.deepStrictEqual(
    completedCycleFrame.segments[completedCycleFrame.segments.length - 1].end,
    cycleDropTrack.segments[cycleDropTrack.segments.length - 1].end,
    'the completed cyclic beam has no marker-shaped gap'
  );

  const zeroState = game.beginConnectFourGame({
    id: 'zero-drop', label: 'zero drop', lattice: 'square', rows: 1, cols: 1,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  }, { fallDir: game.DIRS.S, holes: [0] });
  const zeroAssist = game.placementReachAssist(zeroState, 0);
  const zeroGeometry = game.__test.buildGeometry(zeroState.preset, 240, 16, 1);
  const zeroPoint = zeroGeometry.cells[0];
  const zeroTrack = game.__test.placementAssistDropTrack(zeroState, zeroGeometry, zeroAssist);
  const zeroFrame = game.__test.placementAssistDropFrame(
    zeroTrack,
    0,
    zeroPoint,
    false
  );
  assert.strictEqual(zeroTrack.totalLength, 0);
  assert.deepStrictEqual(zeroFrame.markerPoint, { x: zeroPoint.x, y: zeroPoint.y });
  assert.strictEqual(zeroFrame.markerVisible, true);
  assert.strictEqual(game.__test.placementReachAssistIsAnimated(zeroAssist), false);

  const setupSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  assert.ok(setupSource.includes('const placementAssistRenderProgress = placementReachAssistRawProgress();'));
  assert.ok(setupSource.includes('drawPlacementReachAssistUnderlay(ctx, geometry, game, placementAssistRenderProgress);'));
  assert.ok(setupSource.includes('drawPlacementReachAssistOverlay(ctx, geometry, game, placementAssistRenderProgress);'));
}

function testConnectFourDropStopsAtBoundaryAndBlocker() {
  let state = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: [game.indexOf(1, 1, 7)]
  });
  let result = game.placeConnectFourToken(state, game.indexOf(1, 1, 7));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.color, 'red');
  assert.strictEqual(result.token.index, game.indexOf(6, 1, 7));
  assert.deepStrictEqual(result.drop.path, [
    game.indexOf(1, 1, 7),
    game.indexOf(2, 1, 7),
    game.indexOf(3, 1, 7),
    game.indexOf(4, 1, 7),
    game.indexOf(5, 1, 7),
    game.indexOf(6, 1, 7)
  ]);
  state = result.state;
  result = game.placeConnectFourToken(state, game.indexOf(1, 1, 7));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.color, 'yellow');
  assert.strictEqual(result.token.index, game.indexOf(5, 1, 7));
  assert.deepStrictEqual(tokensAt(result.state), ['5,1:yellow', '6,1:red']);
}

function testConnectFourCycleWarning() {
  const state = game.beginConnectFourGame(boundaryConnectFourPreset(), {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 1, 4)]
  });
  const result = game.placeConnectFourToken(state, game.indexOf(1, 1, 4));
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.cycle, true);
  assert.strictEqual(result.message, 'drop route cycles before stopping');
  assert.deepStrictEqual(result.cycleHoles, [game.indexOf(1, 1, 4)]);
  assert.strictEqual(state.tokens.length, 0);
}

function testConnectFourDropCarriesGluedRoute() {
  const state = game.beginConnectFourGame(boundaryConnectFourPreset(), {
    fallDir: game.DIRS.E,
    holes: [game.indexOf(1, 4, 4)]
  });
  state.tokens = [
    { id: 1, index: game.indexOf(1, 2, 4), color: 'yellow' }
  ];
  state.nextTokenId = 2;
  state.turn = 'red';
  const result = game.placeConnectFourToken(state, game.indexOf(1, 4, 4));
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.token.index, game.indexOf(1, 1, 4));
  assert.strictEqual(result.drop.blockedBy, game.indexOf(1, 2, 4));
  assert.deepStrictEqual(result.drop.path, [
    game.indexOf(1, 4, 4),
    game.indexOf(1, 1, 4)
  ]);
  assert.strictEqual(result.drop.transitions.length, 1);
  assert.strictEqual(result.drop.transitions[0].glued, true);
  assert.strictEqual(result.drop.transitions[0].edge.dir, game.DIRS.E);
}

function testConnectFourEndsWhenInputHolesFilled() {
  const preset = {
    id: 'connect-four-one-hole-test',
    label: 'connect four one hole test',
    lattice: 'square',
    rows: 1,
    cols: 1,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
  const state = game.beginConnectFourGame(preset, {
    fallDir: game.DIRS.S,
    holes: [0]
  });
  const result = game.placeConnectFourToken(state, 0);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.ending, 'draw');
  assert.strictEqual(result.state.winner, '');
  assert.deepStrictEqual(game.connectFourOpenHoleIndices(result.state), []);
}

function testConnectFourHorizontalWin() {
  let state = game.beginConnectFourGame(connectFourPreset(), {
    fallDir: game.DIRS.S,
    holes: connectFourTopHoles(4)
  });
  [
    [1, 1], [1, 1],
    [1, 2], [1, 2],
    [1, 3], [1, 3],
    [1, 4]
  ].forEach(([row, col]) => {
    const result = game.placeConnectFourToken(state, game.indexOf(row, col, 7));
    assert.strictEqual(result.changed, true, result.message || `drop ${row},${col}`);
    state = result.state;
  });
  assert.strictEqual(state.phase, 'gameover');
  assert.strictEqual(state.winner, 'red');
  assert.deepStrictEqual(state.winningLine, [
    game.indexOf(6, 1, 7),
    game.indexOf(6, 2, 7),
    game.indexOf(6, 3, 7),
    game.indexOf(6, 4, 7)
  ]);
}

function testConnectFourDiagonalWinDetection() {
  const state = game.createConnectFourState(connectFourPreset(), { fallDir: game.DIRS.S });
  state.phase = 'ready';
  state.tokens = [
    { id: 1, index: game.indexOf(6, 1, 7), color: 'red' },
    { id: 2, index: game.indexOf(5, 2, 7), color: 'red' },
    { id: 3, index: game.indexOf(4, 3, 7), color: 'red' },
    { id: 4, index: game.indexOf(3, 4, 7), color: 'red' }
  ];
  state.nextTokenId = 5;
  const win = game.findConnectFourWin(state, game.indexOf(3, 4, 7), 'red');
  assert.ok(win);
  assert.strictEqual(win.color, 'red');
  assert.deepStrictEqual(win.line, [
    game.indexOf(6, 1, 7),
    game.indexOf(5, 2, 7),
    game.indexOf(4, 3, 7),
    game.indexOf(3, 4, 7)
  ]);
}

function testConnectFourDiagonalTransportsAfterReflectingGlue() {
  const preset = {
    id: 'connect-four-diagonal-transport-reflection',
    label: 'connect four diagonal transport reflection',
    lattice: 'square',
    rows: 5,
    cols: 5,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      { group: 0, reversed: true, first: { row: 5, col: 5, dir: game.DIRS.E }, second: { row: 5, col: 1, dir: game.DIRS.W } }
    ]
  };
  const state = game.createConnectFourState(preset, { fallDir: game.DIRS.S });
  state.phase = 'ready';
  state.tokens = [
    { id: 1, index: game.indexOf(5, 5, 5), color: 'red' },
    { id: 2, index: game.indexOf(4, 1, 5), color: 'red' },
    { id: 3, index: game.indexOf(3, 2, 5), color: 'red' },
    { id: 4, index: game.indexOf(2, 3, 5), color: 'red' }
  ];
  state.nextTokenId = 5;
  const win = game.findConnectFourWin(state, game.indexOf(5, 5, 5), 'red');
  assert.ok(win);
  assertLineMatchesEitherDirection(win.line, [
    game.indexOf(5, 5, 5),
    game.indexOf(4, 1, 5),
    game.indexOf(3, 2, 5),
    game.indexOf(2, 3, 5)
  ]);
}

function testExtraBackgroundPresets() {
  [
    [game.BOUNDARY_GLUE_BOARD_PRESET_ID, 'boundary glue board'],
    ['twisted-torus', 'twisted torus'],
    ['gomoku-tic-tac-toe', 'Tic-tac-toe'],
    ['gomoku-strange-corner', 'strange corner'],
    ['gomoku-small-holes', 'small holes'],
    ['gomoku-big-hole', 'big hole'],
    ['gomoku-m4-15x15', 'genus 4'],
    ['rubiks-cube-2x2x2', "Rubik's Cube 2*2*2"],
    ['rubiks-cube-3x3x3', "Rubik's Cube 3*3*3"],
    ['connect-four-6x7', 'Connect Four 6*7'],
    ['connect-four-high-hit', 'high hit'],
    ['connect-four-high-hit-2', 'high hit2'],
    ['connect-four-all-horizontal', 'all horizontal'],
    ['connect-four-top-fight', 'top fight'],
    ['connect-four-exchange', 'exchange'],
    ['connect-four-across', 'across'],
    ['connect-four-usual-strip', 'usual strip'],
    ['connect-four-mobius-strip', 'M\u00f6bius strip'],
    ['connect-four-hex-usual-strip', 'hex usual strip'],
    ['connect-four-hex-bad-mobius-strip', 'hex bad M\u00f6bius strip'],
    ['connect-four-hex-good-mobius-strip', 'hex good M\u00f6bius strip'],
    ['usual-strip', 'usual strip'],
    ['mobius-strip', 'M\u00f6bius strip'],
    ['chinese-checkers-hex-rhombus-9x9', 'hex rhombus 9*9'],
    ['chinese-checkers-hex-strip-9x9', 'hex strip 9*9']
  ].forEach(([id, label]) => {
    assert.ok(presetRegistry.find((preset) => preset.id === id && preset.label === label));
    assert.ok(game.PRESETS.find((preset) => preset.id === id));
  });

  ['torus', 'klein-bottle', 'gomoku-classic', 'gomoku-random-glue'].forEach((id) => {
    assert.ok(!presetRegistry.some((preset) => preset.id === id), `${id} should not be registered`);
    assert.ok(!game.PRESETS.some((preset) => preset.id === id), `${id} should not be installed`);
  });

  assertPresetRegistryDefaults();

  const wrappedProfiles = {
    'between-two-fires': { x: 'repeat', y: 'repeat', preferenceKey: 'torus' },
    'n-queens-torus-puzzle': { x: 'repeat', y: 'repeat', preferenceKey: 'torus' },
    'three-slits': { x: 'repeat', y: 'repeat', preferenceKey: 'torus' },
    'half-glued': { x: 'repeat', y: 'repeat', preferenceKey: 'torus' },
    'hex-torus-5-5': { x: 'repeat', y: 'repeat', preferenceKey: 'torus' },
    'hex-klein-bottle-5-5': { x: 'repeat', y: 'reflect-x', preferenceKey: 'klein-bottle' },
    'usual-strip': { x: 'repeat', y: '', preferenceKey: 'cylinder' },
    'mobius-strip': { x: 'reflect-y', y: '', preferenceKey: 'mobius-strip' },
    'connect-four-hex-good-mobius-strip': { x: 'reflect-y', y: '', preferenceKey: 'mobius-strip' }
  };
  Object.entries(wrappedProfiles).forEach(([id, expected]) => {
    assert.deepStrictEqual(game.PRESETS.find((preset) => preset.id === id).wrappedView, expected);
    const sourceProfile = presetRegistry.find((preset) => preset.id === id).wrappedView;
    assert.strictEqual(sourceProfile.x, expected.x);
    assert.strictEqual(sourceProfile.y || '', expected.y);
  });
  assert.strictEqual(game.PRESETS.find((preset) => preset.id === 'half-glued').wrappedCoverFit, 'glued');
  ['classic-hex', 'hex-torus-5-5', 'hex-klein-bottle-5-5', 'hex-rp2-5-5', 'hex-with-three-slits'].forEach((id) => {
    const hexState = game.createHexState(id);
    assert.strictEqual(game.__test.wrappedHexCutoutMode(hexState, true), true, `${id} uses wrapped Hex cutouts`);
    assert.strictEqual(game.__test.wrappedHexCutoutMode(hexState, false), false, `${id} keeps ordinary Hex cells`);
    assert.strictEqual(hexState.preset.wrappedHexCutouts, undefined, `${id} needs no cutout metadata`);
  });
  assert.strictEqual(game.PRESETS.find((preset) => preset.id === 'n-queens-puzzle').wrappedView, undefined);
  const toroidalNQueens = game.createFideChessState('n-queens-torus-puzzle');
  assert.deepStrictEqual(toroidalNQueens.preset.wrappedView, wrappedProfiles['n-queens-torus-puzzle']);
  assert.strictEqual(toroidalNQueens.preset.gluedEdges.length, 10);

  const exchangePreset = game.createConnectFourState('connect-four-exchange').preset;
  assert.strictEqual(exchangePreset.cutEdges.length, 4);
  assert.strictEqual(exchangePreset.gluedEdges.length, 4);
  assert.strictEqual(exchangePreset.surface, 'Sigma_1.5,1^1');

  const across = game.createConnectFourState('connect-four-across');
  assert.ok(across.removed.has(game.indexOf(4, 4, 7)));
  assert.strictEqual(across.preset.gluedEdges.length, 2);

  const hexGood = game.createConnectFourState('connect-four-hex-good-mobius-strip');
  assert.strictEqual(hexGood.preset.lattice, 'hexagonal');
  assert.strictEqual(hexGood.preset.rows, 7);
  assert.strictEqual(hexGood.preset.cols, 7);
  assert.strictEqual(hexGood.preset.gluedEdges.length, 13);
  assert.deepStrictEqual(hexGood.preset.wrappedView, wrappedProfiles['connect-four-hex-good-mobius-strip']);

  [
    'connect-four-6x7',
    'connect-four-high-hit',
    'connect-four-high-hit-2',
    'connect-four-all-horizontal',
    'connect-four-top-fight',
    'connect-four-exchange',
    'connect-four-across',
    'connect-four-usual-strip',
    'connect-four-mobius-strip',
    'connect-four-hex-usual-strip',
    'connect-four-hex-bad-mobius-strip',
    'connect-four-hex-good-mobius-strip'
  ].forEach((id) => {
    const state = game.createConnectFourState(id);
    assert.deepStrictEqual(Array.from(state.holes).sort((a, b) => a - b), connectFourTopHoles(state.preset.cols, state.preset.cols));
    assert.deepStrictEqual(
      state.preset.connectFourHoles.map((tile) => game.indexOf(tile.row, tile.col, state.preset.cols)),
      connectFourTopHoles(state.preset.cols, state.preset.cols)
    );
  });
  assert.deepStrictEqual(Array.from(game.createConnectFourState('connect-four-6x7', { holes: [] }).holes), []);
  assert.deepStrictEqual(Array.from(game.beginConnectFourGame('connect-four-6x7').holes).sort((a, b) => a - b), connectFourTopHoles());

  const rubiks2 = game.createGameState('rubiks-cube-2x2x2');
  assert.strictEqual(rubiks2.preset.rows, 6);
  assert.strictEqual(rubiks2.preset.cols, 8);
  assert.strictEqual(rubiks2.preset.surface, 'M_0,8');
  assert.strictEqual(rubiks2.preset.removedTiles.length, 24);
  assert.strictEqual(rubiks2.preset.gluedEdges.length, 14);
  assert.deepStrictEqual(rubiks2.preset.gluedEdges.map(gluedEdgeSignature), [
    '6:3,1,2>3,8,0',
    '6:4,1,2>4,8,0',
    '9:3,2,3>2,3,2',
    '9:3,1,3>1,3,2',
    '10:2,4,0>3,5,3',
    '10:1,4,0>3,6,3',
    '12:4,5,1>5,4,0',
    '12:4,6,1>6,4,0',
    '13:1,4,3>3,7,3',
    '13:1,3,3>3,8,3',
    '14:4,8,1>6,3,1',
    '14:4,7,1>6,4,1',
    '15:5,3,2>4,2,1',
    '15:6,3,2>4,1,1'
  ]);
  assert.strictEqual(game.emptyExistingIndices(rubiks2).length, 24);
  assert.strictEqual(game.countUnmatchedBoundaries(rubiks2.preset, rubiks2.removed), 0);

  const rubiks3 = game.createGameState('rubiks-cube-3x3x3');
  assert.strictEqual(rubiks3.preset.rows, 9);
  assert.strictEqual(rubiks3.preset.cols, 12);
  assert.strictEqual(rubiks3.preset.surface, 'M_0,8');
  assert.strictEqual(rubiks3.preset.removedTiles.length, 54);
  assert.strictEqual(rubiks3.preset.gluedEdges.length, 21);
  assert.deepStrictEqual(rubiks3.preset.gluedEdges.map(gluedEdgeSignature), [
    '0:4,1,2>4,12,0',
    '0:5,1,2>5,12,0',
    '0:6,1,2>6,12,0',
    '1:4,3,3>3,4,2',
    '1:4,2,3>2,4,2',
    '1:4,1,3>1,4,2',
    '2:1,6,3>4,10,3',
    '2:1,5,3>4,11,3',
    '2:1,4,3>4,12,3',
    '3:3,6,0>4,7,3',
    '3:2,6,0>4,8,3',
    '3:1,6,0>4,9,3',
    '4:6,1,1>9,4,2',
    '4:6,2,1>8,4,2',
    '4:6,3,1>7,4,2',
    '5:6,7,1>7,6,0',
    '5:6,8,1>8,6,0',
    '5:6,9,1>9,6,0',
    '6:9,4,1>6,12,1',
    '6:9,5,1>6,11,1',
    '6:9,6,1>6,10,1'
  ]);
  assert.strictEqual(game.emptyExistingIndices(rubiks3).length, 54);
  assert.strictEqual(game.countUnmatchedBoundaries(rubiks3.preset, rubiks3.removed), 0);

  const usual = game.createGameState('usual-strip');
  assert.strictEqual(usual.preset.lattice, 'hexagonal');
  assert.strictEqual(usual.preset.rows, 4);
  assert.strictEqual(usual.preset.cols, 5);
  assert.strictEqual(usual.preset.gluedEdges.length, 7);
  assert.strictEqual(game.countUnmatchedBoundaries(usual.preset, usual.removed), 20);

  const mobius = game.createGameState('mobius-strip');
  assert.strictEqual(mobius.preset.lattice, 'hexagonal');
  assert.strictEqual(mobius.preset.surface, 'N_0,2^6');
  assert.strictEqual(mobius.preset.gluedEdges.length, 7);
  assert.ok(mobius.preset.gluedEdges.every((pair) => pair.reversed));
  assert.ok(mobius.preset.gluedEdges.every((pair) => pair.secondArrowReversed === false));
  assert.strictEqual(game.countUnmatchedBoundaries(mobius.preset, mobius.removed), 20);

  const twisted = game.createGameState('twisted-torus');
  assert.strictEqual(twisted.preset.rows, 4);
  assert.strictEqual(twisted.preset.cols, 4);
  assert.strictEqual(twisted.preset.surface, 'M_2,1');
  assert.strictEqual(twisted.preset.gluedEdges.length, 8);
  const twistedStep = game.surfaceSuccessor(twisted, game.indexOf(1, 1, 4), game.DIRS.N);
  assert.strictEqual(twistedStep.kind, 'glued');
  assert.strictEqual(twistedStep.index, game.indexOf(4, 2, 4));

  const halfGlued = game.createGameState('half-glued');
  assert.strictEqual(halfGlued.preset.surface, 'Sigma_1,1');
  assert.deepStrictEqual(halfGlued.preset.gluedEdges.map(gluedEdgeSignature), [
    '0:1,1,3>4,3,1',
    '0:1,2,3>4,4,1',
    '1:3,1,2>1,4,0',
    '1:4,1,2>2,4,0'
  ]);
}

function assertPresetRegistryDefaults() {
  assert.ok(presetRegistrySource && !Array.isArray(presetRegistrySource));
  assert.ok(presetDefaultFor && typeof presetDefaultFor === 'object' && !Array.isArray(presetDefaultFor));
  assert.ok(Array.isArray(presetRegistry));
  assert.ok(presetRegistry.every((preset) => !Object.prototype.hasOwnProperty.call(preset, 'defaultFor')));
  assert.deepStrictEqual(presetRegistrySource.gameOrder, [
    'gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban',
    'fide-chess', 'billiards', 'lianliankan'
  ]);
  const expected = {
    gomoku: game.BOUNDARY_GLUE_BOARD_PRESET_ID,
    go: 'three-slits',
    'connect-four': 'connect-four-exchange',
    '2048': 'ramified-cover',
    reversi: 'focus-frame',
    'chinese-checkers': 'octahedron-with-square-holes',
    sokoban: 'sokoban-square',
    'fide-chess': 'fide-chess-8x8',
    billiards: 'twisted-torus',
    lianliankan: 'rubiks-cube-2x2x2'
  };
  assert.deepStrictEqual(presetDefaultFor, expected);
  const expectedResolved = {
    gomoku: game.BOUNDARY_GLUE_BOARD_PRESET_ID,
    go: 'three-slits',
    'connect-four': 'connect-four-exchange',
    '2048': 'ramified-cover',
    reversi: 'focus-frame',
    'chinese-checkers': 'octahedron-with-square-holes',
    sokoban: 'sokoban-square',
    'fide-chess': 'fide-chess-8x8',
    billiards: 'twisted-torus',
    lianliankan: 'rubiks-cube-2x2x2'
  };
  Object.entries(expectedResolved).forEach(([mode, id]) => {
    const entry = presetRegistry.find((preset) => preset.id === id);
    assert.ok(entry, `missing default preset ${id}`);
    assert.ok(registryEntrySupportsMode(entry, mode), `${id} does not support ${mode}`);
  });
}

function registryEntrySupportsMode(entry, mode) {
  if (mode === '2048') return registryEntryHasGameType(entry, '2048');
  if (mode === 'gomoku') return registryEntryHasGameType(entry, 'Gomoku');
  if (mode === 'connect-four') return registryEntryHasGameType(entry, 'Connect Four');
  if (mode === 'go') return registryEntryHasGameType(entry, 'Go');
  if (mode === 'reversi') return registryEntryHasGameType(entry, 'Reversi');
  if (mode === 'chinese-checkers') return registryEntryHasGameType(entry, 'Chinese Checkers');
  if (mode === 'sokoban') return registryEntryHasGameType(entry, 'Sokoban');
  if (mode === 'fide-chess') return registryEntryHasGameType(entry, 'FIDE Chess');
  if (mode === 'billiards') return registryEntryHasGameType(entry, 'Billiard');
  if (mode === 'lianliankan') return registryEntryHasGameType(entry, 'Tile Matching');
  return false;
}

function testKeyboardMapping() {
  const squarePreset = game.createGameState('classic-4x4').preset;
  assert.strictEqual(game.dirFromKey('KeyW', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('KeyA', squarePreset), game.DIRS.W);
  assert.strictEqual(game.dirFromKey('KeyS', squarePreset), game.DIRS.S);
  assert.strictEqual(game.dirFromKey('KeyD', squarePreset), game.DIRS.E);
  assert.strictEqual(game.dirFromKey('w', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('ArrowUp', squarePreset), game.DIRS.N);
  assert.strictEqual(game.dirFromKey('ArrowLeft', squarePreset), game.DIRS.W);

  const hexPreset = game.createGameState('hex-classic-4x4').preset;
  assert.strictEqual(game.dirFromKey('ArrowLeft', hexPreset), game.HEX_DIRS.W);
  assert.strictEqual(game.dirFromKey('ArrowRight', hexPreset), game.HEX_DIRS.E);
  assert.strictEqual(game.dirFromKey('ArrowUp', hexPreset), null);
  assert.strictEqual(game.dirFromKey('ArrowDown', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyW', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyE', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyA', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyD', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyZ', hexPreset), null);
  assert.strictEqual(game.dirFromKey('KeyX', hexPreset), null);
}

function testHexMovePadUsesArrowGlyphs() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('--hex-move-size: 46px;'));
  assert.ok(html.includes('--hex-row-offset: 26px;'));
  assert.ok(html.includes('width: var(--hex-pad-width);'));
  assert.ok(html.includes('left: var(--hex-row-offset);'));
  assert.ok(html.includes('position: relative;'));
  assert.ok(html.includes('.hex-move-pad [data-move-dir="E"] { grid-column: 3; grid-row: 2; }'));
  assert.ok(html.includes('data-move-dir="N" aria-label="Move up" title="Move up (ArrowUp/W)">'));
  assert.ok(html.includes('data-move-dir="W" aria-label="Move left" title="Move left (ArrowLeft/A)">'));
  assert.ok(html.includes('data-move-dir="E" aria-label="Move right" title="Move right (ArrowRight/D)">'));
  assert.ok(html.includes('data-move-dir="S" aria-label="Move down" title="Move down (ArrowDown/S)">'));
  assert.ok(html.includes('data-move-dir="NW" aria-label="Move northwest" title="Move northwest (ArrowUp+ArrowLeft)">&#x2196;</button>'));
  assert.ok(html.includes('data-move-dir="NE" aria-label="Move northeast" title="Move northeast (ArrowUp+ArrowRight)">&#x2197;</button>'));
  assert.ok(html.includes('data-move-dir="W" aria-label="Move west" title="Move west (ArrowLeft)">&#x2190;</button>'));
  assert.ok(html.includes('data-move-dir="E" aria-label="Move east" title="Move east (ArrowRight)">&#x2192;</button>'));
  assert.ok(html.includes('data-move-dir="SW" aria-label="Move southwest" title="Move southwest (ArrowDown+ArrowLeft)">&#x2199;</button>'));
  assert.ok(html.includes('data-move-dir="SE" aria-label="Move southeast" title="Move southeast (ArrowDown+ArrowRight)">&#x2198;</button>'));
}

function testMosaicBackgroundExportAndMinigameImportControlsExist() {
  const minigameHtml = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const mosaicHtml = fs.readFileSync(require.resolve('../mosaic_calculator.html'), 'utf8');
  const minigameSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  assert.ok(!minigameHtml.includes('id="import-preset-toggle"'));
  assert.ok(minigameHtml.includes('id="game-mode-select"'));
  assert.ok(minigameHtml.includes('<option value="2048" selected>2048</option>'));
  assert.ok(minigameHtml.includes('<option value="gomoku">Gomoku</option>'));
  assert.ok(minigameHtml.includes('<option value="connect-four">Connect Four</option>'));
  assert.ok(minigameHtml.includes('<option value="go">Go</option>'));
  assert.ok(minigameHtml.includes('<option value="reversi">Reversi</option>'));
  assert.ok(minigameHtml.includes('<option value="chinese-checkers">Chinese Checkers</option>'));
  assert.ok(minigameHtml.includes('<option value="sokoban">Sokoban</option>'));
  assert.ok(minigameHtml.includes('<option value="__random-game-setup">Random setup</option>'));
  const gameSelectStart = minigameHtml.indexOf('id="game-mode-select"');
  const gameSelectEnd = minigameHtml.indexOf('</select>', gameSelectStart);
  const staticGameOptions = Array.from(minigameHtml.slice(gameSelectStart, gameSelectEnd).matchAll(/<option value="([^"]+)"/g), (match) => match[1]);
  assert.deepStrictEqual(staticGameOptions, ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban', game.RANDOM_GAME_MODE_CHOICE_ID]);
  assert.ok(minigameHtml.includes('<option value="">Loading presets...</option>'));
  assert.ok(minigameHtml.includes('id="boundary-glue-mode-row"'));
  assert.ok(minigameHtml.includes('id="boundary-glue-shape-row"'));
  assert.ok(minigameHtml.includes('id="boundary-glue-rect-row"'));
  assert.ok(minigameHtml.includes('<option value="rp2">RP^2</option>'));
  assert.ok(minigameHtml.includes('<option value="random">random boundary glue</option>'));
  assert.ok(minigameHtml.includes('<script src="ramified_minigame_presets/presets.js"></script>'));
  assert.ok(!minigameHtml.includes('<option value="twisted-torus">'));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, '2048')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Gomoku')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Connect Four')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Go')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Reversi')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Chinese Checkers')));
  assert.ok(presetRegistry.some((preset) => registryEntryHasGameType(preset, 'Sokoban')));
  assert.ok(presetRegistry.every((preset) => Array.isArray(preset.gameTypes) && preset.gameTypes.length >= 1));
  const presetDir = require('path').resolve(__dirname, '..', 'ramified_minigame_presets');
  const presetFilesWithGameTypes = fs.readdirSync(presetDir)
    .filter((file) => file.endsWith('.preset.js'))
    .filter((file) => fs.readFileSync(require('path').join(presetDir, file), 'utf8').includes('"gameTypes"'));
  assert.deepStrictEqual(presetFilesWithGameTypes, [
    'classic_chinese_checkers.preset.js',
    'dodecahedron_with_pentagon_holes.preset.js',
    'focus_frame.preset.js',
    'octahedron_with_square_glues.preset.js',
    'octahedron_with_square_holes.preset.js',
    'three_slits.preset.js',
    'tunnels.preset.js'
  ]);
  assert.ok(minigameHtml.includes('id="gomoku-size-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="sokoban-object-size" min="54" max="96" step="2" value="70"'));
  assert.ok(minigameHtml.includes('<output id="sokoban-object-size-value">70%</output>'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-inner" min="0" max="100" step="5" value="55"'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-outer" min="0" max="100" step="5" value="82"'));
  assert.ok(minigameHtml.includes('id="sokoban-glow-blur" min="0" max="100" step="5" value="38"'));
  assert.ok(minigameHtml.includes('id="sokoban-beam-width" min="20" max="110" step="5" value="70"'));
  assert.ok(minigameHtml.includes('id="sokoban-beam-opacity" min="5" max="80" step="5" value="34"'));
  assert.ok(minigameHtml.includes('id="gomoku-board-size"'));
  assert.ok(minigameHtml.includes('id="display-card-body"'));
  assert.ok(minigameHtml.includes('id="boundary-glue-wrapped-view-row"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-row"'));
  assert.ok(!minigameHtml.includes('id="gomoku-display-row" data-mode-control="gomoku"'));
  assert.ok(minigameHtml.includes('id="gomoku-display-style"'));
  assert.ok(minigameHtml.includes('id="show-board-coordinates"'));
  assert.ok(minigameHtml.includes('id="go-komi-row" data-mode-control="go"'));
  assert.ok(minigameHtml.includes('id="go-komi"'));
  assert.ok(minigameHtml.includes('id="go-action-row" data-mode-control="go"'));
  assert.ok(minigameHtml.includes('id="go-pass"'));
  assert.ok(minigameHtml.includes('<option value="vertex" selected>gridded board</option>'));
  assert.ok(minigameHtml.includes('<option value="center">tile board</option>'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-row" data-mode-control="connect-four"'));
  assert.ok(minigameHtml.includes('id="connect-four-fall-dir"'));
  assert.ok(minigameHtml.includes('id="connect-four-align-row" data-mode-control="connect-four"'));
  assert.ok(minigameHtml.includes('id="connect-four-align-fall" checked'));
  assert.ok(minigameHtml.includes('id="game-setup-alert"'));
  assert.ok(minigameHtml.includes('Import / Export'));
  assert.ok(minigameHtml.includes('Game Setup</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('Import / Export</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('Game Stats</span><em class="toggle-icon"'));
  assert.ok(minigameHtml.includes('id="import-game-mode"'));
  assert.ok(minigameHtml.includes('id="import-preset-source"'));
  assert.ok(minigameHtml.includes('id="import-preset-catalog"'));
  assert.ok(minigameHtml.includes('id="import-preset-input"'));
  assert.ok(minigameHtml.includes('id="apply-import-preset"'));
  assert.ok(minigameHtml.includes('id="export-state-kind"'));
  assert.ok(minigameHtml.includes('id="export-background-format"'));
  assert.ok(minigameHtml.includes('id="import-state-file"'));
  assert.ok(minigameHtml.includes('id="download-state"'));
  assert.ok(minigameHtml.includes('id="debug-export-output" data-export-output'));
  assert.ok(minigameHtml.includes('aria-label="Current game status or preset export" readonly'));
  const importExportSection = minigameHtml.slice(
    minigameHtml.indexOf('Import / Export'),
    minigameHtml.indexOf('Game Stats')
  );
  assert.ok(importExportSection.includes('class="import-export-tabs" role="tablist"'));
  assert.ok(importExportSection.includes('id="import-preset-tools" role="tabpanel"'));
  assert.ok(importExportSection.includes('data-import-export-panel="export"'));
  assert.ok(importExportSection.includes('data-import-export-panel="import"'));
  assert.ok(importExportSection.includes('data-import-source-panel="file"'));
  assert.ok(importExportSection.includes('class="import-export-actions"'));
  assert.ok(importExportSection.includes('class="mosaic-editor-input calculator-control minigame-status-export"'));
  assert.ok(!importExportSection.includes('mosaic-debug-panel'));
  assert.ok(minigameSource.includes("document.querySelectorAll('.card-head')"));
  assert.ok(minigameSource.includes("card.classList.toggle('collapsed')"));
  assert.ok(minigameHtml.includes('id="step-mode-row" data-mode-control="2048"'));
  assert.ok(minigameHtml.includes('<option value="">empty</option>'));
  assert.ok(minigameHtml.includes('id="debug-bomb-row" data-mode-control="2048"'));
  assert.ok(minigameHtml.includes('id="debug-bomb-tool"'));
  assert.ok(minigameHtml.includes('<option value="blue">place blue bomb</option>'));
  assert.ok(minigameHtml.includes('<option value="red">place red bomb</option>'));
  assert.ok(minigameHtml.includes('id="bomb-art-row" data-mode-control="2048"'));
  assert.ok(minigameHtml.includes('id="bomb-art-style"'));
  assert.ok(minigameHtml.includes('<option value="png-1" selected>PNG skull</option>'));
  assert.ok(minigameHtml.includes('<option value="png-3">PNG vortex</option>'));
  assert.ok(minigameHtml.includes('<option value="canvas-1">canvas spark</option>'));
  assert.ok(!minigameHtml.includes('<option value="canvas-2">canvas fuse</option>'));
  assert.ok(!minigameHtml.includes('<option value="canvas-3">canvas vortex</option>'));
  assert.ok(minigameHtml.includes('id="removed-tile-label">Blocked tiles</span>'));
  assert.ok(!mosaicHtml.includes('id="export-background-preset"'));
  assert.ok(mosaicHtml.includes('id="export-type"'));
  assert.ok(mosaicHtml.includes('<option value="minigame">For minigames</option>'));
  assert.ok(mosaicHtml.includes('id="export-format"'));
  assert.ok(mosaicHtml.includes('<option value="dsl" selected>DSL-style</option>'));
  assert.ok(mosaicHtml.includes('id="export-preset-id"'));
  assert.ok(mosaicHtml.includes('File key'));
  assert.ok(mosaicHtml.includes('Display name'));
  assert.ok(mosaicHtml.includes('id="export-preset-advanced"'));
  assert.ok(mosaicHtml.includes('id="export-preset-advanced-row" hidden'));
  assert.ok(!mosaicHtml.includes('id="export-preset-custom-key"'));
  assert.ok(mosaicHtml.includes('id="export-preset-group-row"'));
  assert.ok(mosaicHtml.includes('.export-meta-field[hidden]'));
  assert.ok(mosaicHtml.includes('Game type'));
  assert.ok(mosaicHtml.includes('id="export-preset-groups"'));
  assert.ok(mosaicHtml.includes('<select id="export-preset-group"'));
  assert.ok(mosaicHtml.includes('<option value="Connect Four">Connect Four</option>'));
  assert.ok(mosaicHtml.includes('id="export-test-link"'));
  assert.ok(mosaicHtml.includes('<script src="ramified_minigame_presets/presets.js"></script>'));
  assert.ok(mosaicHtml.includes('<option value="decoration">Add / remove decorations</option>'));
  assert.ok(mosaicHtml.includes('id="background-decoration-kind"'));
  assert.ok(mosaicHtml.includes('id="background-decoration-color"'));
}

function testCardHeadersCollapse() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  let clickHandler = null;
  let collapsed = false;
  const card = {
    classList: {
      toggle(name) {
        assert.strictEqual(name, 'collapsed');
        collapsed = !collapsed;
      }
    }
  };
  const head = {
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    },
    closest(selector) {
      return selector === '.card' ? card : null;
    }
  };
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Math,
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '.card-head' ? [head] : [];
      },
      addEventListener(type, handler) {
        if (type === 'DOMContentLoaded') handler();
      }
    },
    window: {
      addEventListener() {}
    }
  };
  vm.runInNewContext(source, context);
  assert.strictEqual(typeof clickHandler, 'function');
  clickHandler({ target: { closest: () => null } });
  assert.strictEqual(collapsed, true);
  clickHandler({ target: { closest: () => null } });
  assert.strictEqual(collapsed, false);
}

function testPresetFromMosaicBackgroundExport() {
  const payload = {
    schema: 'ramified-minigame-background-preset',
    version: 1,
    preset: {
      id: 'custom-square',
      label: 'custom square',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'M_1',
      removedTiles: [{ index: 0 }],
      cutEdges: [{ left: { row: 2, col: 2 }, right: { row: 2, col: 3 } }],
      gluedEdges: [
        {
          group: 5,
          orientation: 'reversed',
          first: { row: 1, col: 4, edge: 'E' },
          second: { row: 4, col: 1, dir: game.DIRS.W }
        }
      ]
    }
  };
  const preset = game.presetFromImportPayload(payload);
  assert.strictEqual(preset.id, 'imported-preset');
  assert.strictEqual(preset.sourceId, 'custom-square');
  assert.strictEqual(preset.label, 'custom square');
  assert.strictEqual(preset.lattice, 'square');
  assert.deepStrictEqual(preset.removedTiles, [{ row: 1, col: 1 }]);
  assert.deepStrictEqual(preset.cutEdges, [{ left: { row: 2, col: 2 }, right: { row: 2, col: 3 } }]);
  assert.strictEqual(preset.gluedEdges.length, 1);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.DIRS.E);
  assert.strictEqual(preset.gluedEdges[0].second.dir, game.DIRS.W);
  assert.strictEqual(preset.gluedEdges[0].reversed, true);
  const state = game.createGameState(preset);
  assert.strictEqual(state.removed.size, 1);
}

function testPresetFromFullMosaicCalculatorExport() {
  const preset = game.presetFromImportText(JSON.stringify({
    name: 'Mosaic Calculator',
    lattice: 'hexagonal',
    rows: 3,
    cols: 3,
    backgroundSpace: { surfaceType: 'hex disk' },
    removedTiles: [{ row: 2, col: 2 }],
    gluedEdges: [
      {
        first: { row: 1, col: 1, edge: 'NW' },
        second: { row: 3, col: 3, edge: 'SE' }
      }
    ]
  }));
  assert.strictEqual(preset.lattice, 'hexagonal');
  assert.strictEqual(preset.surface, 'hex disk');
  assert.deepStrictEqual(preset.removedTiles, [{ row: 2, col: 2 }]);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.HEX_DIRS.NW);
  assert.strictEqual(preset.gluedEdges[0].second.dir, game.HEX_DIRS.SE);
}

function testPresetFromMosaicPresetJsWrapper() {
  const source = [
    '// Save this file as ramified_minigame_presets/wrapped_export.preset.js',
    '// Add this entry to ramified_minigame_presets/presets.js:',
    '(function(root, factory) {',
    '  const preset = factory();',
    "  if (typeof module !== 'undefined' && module.exports) module.exports = preset;",
    '  if (root) {',
    '    root.RAMIFIED_MINIGAME_PRESET_DATA = root.RAMIFIED_MINIGAME_PRESET_DATA || {};',
    '    root.RAMIFIED_MINIGAME_PRESET_DATA.wrapped_export = preset;',
    '  }',
    "})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function() {",
    '  return {',
    '    "id": "wrapped-export",',
    '    "label": "Wrapped Export",',
    '    "lattice": "square",',
    '    "size": "4x4",',
    '    "surface": "wrapper test",',
    '    "holes": "top"',
    '  };',
    '});'
  ].join('\n');
  assert.ok(game.extractReturnedPresetObjectText(source).includes('"id": "wrapped-export"'));
  const preset = game.presetFromImportText(source);
  assert.strictEqual(preset.id, 'imported-preset');
  assert.strictEqual(preset.sourceId, 'wrapped-export');
  assert.strictEqual(preset.label, 'Wrapped Export');
  assert.deepStrictEqual(preset.gameTypes, []);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(preset.connectFourHoles.length, 4);
}

function testUrlMinigamePresetImport() {
  const payload = {
    id: 'url-connect',
    label: 'URL Connect',
    gameTypes: ['Connect Four'],
    lattice: 'square',
    size: '4x4',
    surface: 'url test',
    holes: 'top'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=connect-four`,
    randoms: [0.99, 0]
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'connect-four');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported from link');
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'URL Connect'
  )));
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.label, 'URL Connect');
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
  assert.strictEqual(exported.preset.connectFourHoles.length, 4);
}

function testUrlMinigamePresetImportInfersModeFromGroup() {
  const payload = {
    id: 'url-gomoku',
    label: 'URL Gomoku',
    group: 'Gomoku',
    lattice: 'square',
    size: '5x5',
    surface: 'url inferred'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({ locationSearch: `?minigamePreset=${encoded}` });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported from link');
  elements.get('begin-game').listeners.click();
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.id, 'imported-preset');
  assert.strictEqual(exported.preset.label, 'URL Gomoku');
  assert.strictEqual(exported.preset.gameTypes, undefined);
}

function testMultiGroupImportedPresetFiltering() {
  const payload = {
    id: 'url-shared',
    label: 'URL Shared',
    gameTypes: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '5x5',
    surface: 'shared surface'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=gomoku`
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');

  elements.get('game-mode-select').value = '2048';
  elements.get('game-mode-select').listeners.change();
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'URL Shared'
  )));

  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  assert.ok(!elements.get('surface-preset-select').options.some((option) => option.value === 'imported-preset'));
}

function testLegacyGroupsImportedPresetFiltering() {
  const payload = {
    id: 'url-shared-legacy',
    label: 'URL Shared Legacy',
    group: '2048',
    groups: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '5x5',
    surface: 'shared legacy surface'
  };
  const encoded = encodeBase64UrlJson(payload);
  const { elements } = createHeadlessDomHarness({
    locationSearch: `?minigamePreset=${encoded}&mode=gomoku`
  });
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
}

function testGameTypesTakePrecedenceOverLegacyGroups() {
  const preset = game.normalizePresetPayload({
    id: 'game-types-first',
    label: 'Game Types First',
    gameTypes: ['Connect Four'],
    group: '2048',
    groups: ['2048', 'Gomoku'],
    lattice: 'square',
    size: '4x4',
    surface: 'precedence'
  });
  assert.deepStrictEqual(preset.gameTypes, ['Connect Four']);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(game.gameModeFromPresetGroup(preset), game.GAME_MODES.CONNECT_FOUR);
}

function testCompactPresetDslParser() {
  const preset = game.normalizePresetPayload({
    id: 'compact-test',
    label: 'compact test',
    group: '2048',
    lattice: 'square',
    size: '4x4',
    surface: 'compact surface',
    removed: 'rect(2..3,2..3); 1,1',
    holes: 'top',
    cuts: '1,2=1,3',
    glue: 'g7:1..2,4,E=1..2,1,W; g8~00:1,1,N=4,4,S'
  });
  assert.strictEqual(preset.id, 'compact-test');
  assert.deepStrictEqual(preset.gameTypes, ['2048']);
  assert.strictEqual(preset.group, undefined);
  assert.strictEqual(preset.groups, undefined);
  assert.strictEqual(preset.rows, 4);
  assert.strictEqual(preset.cols, 4);
  assert.deepStrictEqual(preset.removedTiles, [
    { row: 1, col: 1 },
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 3, col: 2 },
    { row: 3, col: 3 }
  ]);
  assert.deepStrictEqual(preset.connectFourHoles, [
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 1, col: 4 }
  ]);
  assert.deepStrictEqual(preset.cutEdges, [{ left: { row: 1, col: 2 }, right: { row: 1, col: 3 } }]);
  assert.strictEqual(preset.gluedEdges.length, 3);
  assert.strictEqual(preset.gluedEdges[0].group, 7);
  assert.strictEqual(preset.gluedEdges[0].first.dir, game.DIRS.E);
  assert.strictEqual(preset.gluedEdges[2].reversed, true);
  assert.strictEqual(preset.gluedEdges[2].firstArrowReversed, false);
  assert.strictEqual(preset.gluedEdges[2].secondArrowReversed, false);

  const rubiks = game.normalizePresetPayload({
    id: 'compact-rubiks',
    label: 'compact Rubik',
    group: '2048',
    generator: 'rubiksCube',
    cubeSize: 2
  });
  assert.strictEqual(rubiks.rows, 6);
  assert.deepStrictEqual(rubiks.gameTypes, ['2048']);
  assert.strictEqual(rubiks.cols, 8);
  assert.strictEqual(rubiks.removedTiles.length, 24);
  assert.strictEqual(rubiks.gluedEdges.length, 14);

  assert.throws(
    () => game.normalizePresetPayload({
      id: 'bad-glue',
      label: 'bad glue',
      lattice: 'square',
      size: '2x2',
      glue: 'g0:1..2,1,E=1,2,W'
    }),
    /mismatched ranges/
  );
}

function testSpeedControlDefaults() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="animation-speed" min="40" max="400" step="20" value="80"'));
  assert.ok(html.includes('<output id="animation-speed-value">80 ms</output>'));
  assert.ok(html.includes('id="highlight-new-boxes" checked'));
}

function testStepPauseRendersAfterSelectingNextEvent() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const finishIndex = source.indexOf('function tickAnimation()');
  const finishEnd = source.indexOf('function finishEventQueue()', finishIndex);
  const body = source.slice(finishIndex, finishEnd);
  const clearIndex = body.indexOf('currentAnimation = null;');
  const pauseIndex = body.indexOf('stepPaused = eventIndex < eventQueue.length;', clearIndex);
  const renderIndex = body.indexOf('render();', pauseIndex);
  assert.ok(clearIndex >= 0);
  assert.ok(pauseIndex > clearIndex);
  assert.ok(renderIndex > pauseIndex);
}

function testStationaryDifferentBlocks() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 4)
  ]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: false });
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '1,2:4']);
}

function testSimultaneousDifferentExplosion() {
  const preset = {
    id: 'collision-test',
    label: 'collision-test',
    rows: 2,
    cols: 3,
    surface: 'test',
    removedTiles: [{ row: 1, col: 3 }],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 1, col: 2, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(2, 1, 3), value: 2 },
    { id: 2, index: game.indexOf(1, 2, 3), value: 4 }
  ];
  state.nextBoxId = 3;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.strictEqual(result.state.removed.has(game.indexOf(2, 2, 3)), false);
  assert.deepStrictEqual(bombsAt(result.state, 3), ['2,2:blue:2']);
  const impactGroup = result.events.find((event) => event.kind === 'moveGroup' && event.explosions && event.explosions.length);
  assert.ok(impactGroup);
  const explosion = impactGroup.explosions.find((event) => event.value === 2);
  assert.ok(explosion);
  assert.deepStrictEqual(explosion.removeBoxIds.sort((a, b) => a - b), [1, 2]);
  assert.deepStrictEqual(explosion.moves.map((move) => move.boxId).sort((a, b) => a - b), [1, 2]);
  assert.ok(explosion.moves.some((move) => move.glued));
  assert.ok(!result.events.some((event) => event.kind === 'explode' && event.value === 2));
}

function testLargeExplosionCreatesRedBombAndClickClearsSurfaceNeighbors() {
  const preset = {
    id: 'large-blast-test',
    label: 'large-blast-test',
    rows: 3,
    cols: 3,
    surface: 'test',
    removedTiles: [{ row: 1, col: 3 }, { row: 3, col: 3 }],
    cutEdges: [],
    gluedEdges: [
      {
        group: 0,
        first: { row: 3, col: 2, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const state = game.createGameState(preset);
  state.boxes = [
    { id: 1, index: game.indexOf(2, 1, 3), value: 128 },
    { id: 2, index: game.indexOf(3, 2, 3), value: 256 },
    { id: 3, index: game.indexOf(1, 2, 3), value: 4 },
    { id: 4, index: game.indexOf(2, 3, 3), value: 8 }
  ];
  state.nextBoxId = 5;
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.removed.has(game.indexOf(2, 2, 3)), false);
  assert.deepStrictEqual(valuesAt(result.state, 3), ['1,2:4', '2,3:8']);
  assert.deepStrictEqual(bombsAt(result.state, 3), ['2,2:red:128']);
  assert.ok(!result.events.some((event) => event.kind === 'clearNumbers'));
  const redExplosion = result.events
    .flatMap((event) => event.kind === 'moveGroup' ? (event.explosions || []) : (event.kind === 'explode' ? [event] : []))
    .find((event) => event.value === 128);
  assert.ok(redExplosion);
  assert.deepStrictEqual(indicesAt(redExplosion.rangeIndices, 3), ['1,2', '2,1', '2,3', '3,2']);
  const detonation = game.detonateBombAt(result.state, game.indexOf(2, 2, 3));
  assert.strictEqual(detonation.changed, true);
  assert.deepStrictEqual(indicesAt(detonation.rangeIndices, 3), ['1,2', '2,1', '2,3', '3,2']);
  assert.deepStrictEqual(detonation.clearedBoxIds.sort((a, b) => a - b), [3, 4]);
  assert.deepStrictEqual(indicesAt(detonation.clearedIndices, 3), ['1,2', '2,3']);
  assert.deepStrictEqual(valuesAt(detonation.state, 3), []);
  assert.deepStrictEqual(bombsAt(detonation.state, 3), []);
  assert.ok(!result.state.removed.has(game.indexOf(1, 2, 3)));
  assert.ok(!result.state.removed.has(game.indexOf(2, 3, 3)));
}

function testBlueBombClickRestoresWithoutMoveOrSpawn() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 2, 2, 4)
  ]);
  state.phase = 'ready';
  state.score = 12;
  state.round = 7;
  state.nextBoxId = 3;
  state.bombs = [{ index: game.indexOf(1, 2, 4), kind: game.BOMB_KINDS.BLUE, value: 2 }];
  const result = game.detonateBombAt(state, game.indexOf(1, 2, 4));
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(result.clearedBoxIds, []);
  assert.deepStrictEqual(result.rangeIndices, []);
  assert.deepStrictEqual(bombsAt(result.state), []);
  assert.deepStrictEqual(valuesAt(result.state), ['1,1:2', '2,2:4']);
  assert.strictEqual(result.state.score, 12);
  assert.strictEqual(result.state.round, 7);
  assert.strictEqual(result.state.nextBoxId, 3);
  assert.strictEqual(result.state.removed.has(game.indexOf(1, 2, 4)), false);
}

function testBombsBlockMovementSpawnAndGlue() {
  const direct = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2)
  ]);
  direct.bombs = [{ index: game.indexOf(1, 2, 4), kind: game.BOMB_KINDS.BLUE, value: 2 }];
  const blockedMove = game.simulateRound(direct, game.DIRS.E, { spawn: false });
  assert.strictEqual(blockedMove.changed, false);
  assert.deepStrictEqual(valuesAt(blockedMove.state), ['1,1:2']);

  const spawnState = stateWithBoxes('classic-4x4', [
    box(1, 2, 1, 2),
    box(2, 2, 2, 2)
  ]);
  spawnState.bombs = [{ index: game.indexOf(1, 1, 4), kind: game.BOMB_KINDS.BLUE, value: 2 }];
  const spawnResult = game.simulateRound(spawnState, game.DIRS.W, { spawn: true, rng: () => 0 });
  assert.strictEqual(spawnResult.changed, true);
  assert.ok(!spawnResult.state.boxes.some((item) => item.index === game.indexOf(1, 1, 4)));
  assert.ok(!game.emptyExistingIndices(spawnResult.state).includes(game.indexOf(1, 1, 4)));

  const gluedPreset = {
    id: 'bomb-glue-block',
    label: 'bomb glue block',
    lattice: 'square',
    rows: 2,
    cols: 2,
    surface: 'bomb glue block',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [
      {
        first: { row: 1, col: 2, dir: game.DIRS.E },
        second: { row: 2, col: 2, dir: game.DIRS.W }
      }
    ]
  };
  const glued = stateWithBoxes(gluedPreset, [
    box(1, 1, 2, 2, 2)
  ]);
  glued.bombs = [{ index: game.indexOf(2, 2, 2), kind: game.BOMB_KINDS.RED, value: 128 }];
  const gluedResult = game.simulateRound(glued, game.DIRS.E, { spawn: false });
  assert.strictEqual(gluedResult.changed, false);
  assert.deepStrictEqual(valuesAt(gluedResult.state, 2), ['1,2:2']);
}

function testBombStatusImportCloneAndSummary() {
  const imported = game.gameStateFromDebugImportPayload({
    gameMode: '2048',
    preset: { id: 'classic-4x4', rows: 4, cols: 4, label: 'classic 4x4', surface: 'test' },
    phase: 'ready',
    removed: [],
    boxes: [{ id: 1, row: 2, col: 2, value: 8 }],
    bombs: [{ row: 1, col: 1, kind: 'red', value: 128 }],
    nextBoxId: 2,
    score: 0,
    round: 0
  }).state;
  assert.deepStrictEqual(bombsAt(imported), ['1,1:red:128']);
  assert.deepStrictEqual(game.stateSummary(imported).bombs, [
    { index: game.indexOf(1, 1, 4), kind: 'red', value: 128 }
  ]);
  const clone = game.cloneGameState(imported);
  assert.deepStrictEqual(bombsAt(clone), ['1,1:red:128']);
  const detonated = game.detonateBombAt(clone, game.indexOf(1, 1, 4)).state;
  assert.deepStrictEqual(bombsAt(imported), ['1,1:red:128']);
  assert.deepStrictEqual(bombsAt(detonated), []);
}

function test2048BoxOrientationImportCloneAndSummary() {
  const orientation = { a: 0, b: 1, c: -1, d: 0 };
  const imported = game.gameStateFromDebugImportPayload({
    gameMode: '2048',
    preset: { id: 'oriented-box', rows: 2, cols: 2, lattice: 'square', label: 'oriented box', surface: 'test' },
    phase: 'ready',
    removed: [],
    boxes: [{ id: 1, row: 1, col: 1, value: 8, orientation }],
    nextBoxId: 2,
    score: 0,
    round: 0
  }).state;
  assert.deepStrictEqual(imported.boxes[0].orientation, orientation);
  assert.deepStrictEqual(game.cloneGameState(imported).boxes[0].orientation, orientation);
  assert.deepStrictEqual(game.stateSummary(imported).boxes[0].orientation, orientation);
  const spawned = game.beginGame({ id: 'spawn-orientation', rows: 2, cols: 2, lattice: 'square', label: 'spawn', surface: 'test' }, {
    rng: game.createRng([0, 0, 0, 0])
  });
  assert.deepStrictEqual(spawned.boxes.map((box) => box.orientation), [
    { a: 1, b: 0, c: 0, d: 1 },
    { a: 1, b: 0, c: 0, d: 1 }
  ]);
  const seamState = game.createGameState({
    id: 'oriented-seam', rows: 1, cols: 2, lattice: 'square', label: 'oriented seam', surface: 'test',
    gluedEdges: [{
      first: { row: 1, col: 2, dir: game.DIRS.E },
      second: { row: 1, col: 1, dir: game.DIRS.W },
      firstArrowReversed: false,
      secondArrowReversed: false
    }]
  });
  seamState.phase = 'ready';
  seamState.boxes = [{ id: 1, index: 1, value: 2, orientation: { a: 1, b: 0, c: 0, d: 1 } }];
  seamState.nextBoxId = 2;
  const seamResult = game.simulateRound(seamState, game.DIRS.E, { spawn: false });
  const seamMove = seamResult.events[0].moves[0];
  assert.deepStrictEqual(seamMove.orientationAfter, { a: 1, b: 0, c: 0, d: -1 }, 'a seam reflection transports the box frame');
}

function testSpawnAfterValidRound() {
  const state = stateWithBoxes('classic-4x4', [
    box(1, 1, 1, 2),
    box(2, 1, 2, 2)
  ]);
  const rng = game.createRng([0, 0.9999, 0, 0.9992]);
  const result = game.simulateRound(state, game.DIRS.W, { spawn: true, rng });
  const spawnEvents = result.events.filter((event) => event.kind === 'spawn');
  assert.strictEqual(spawnEvents.length, 2);
  assert.deepStrictEqual(spawnEvents.map((event) => event.value), [32, 16]);
  assert.deepStrictEqual(game.stateSummary(result.state).newBoxIds, spawnEvents.map((event) => event.boxId).sort((a, b) => a - b));
}

function makeElement(id, extra = {}) {
  const classes = new Set();
  return {
    id,
    tagName: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    attributes: {},
    dataset: {},
    textContent: '',
    label: '',
    children: [],
    options: [],
    style: {
      setProperty(name, value) {
        this[name] = String(value);
      },
      removeProperty(name) {
        delete this[name];
      }
    },
    clientWidth: 720,
    parentElement: null,
    listeners: {},
    get innerHTML() {
      return this._innerHTML || '';
    },
    set innerHTML(value) {
      this._innerHTML = String(value || '');
      this.children = [];
      this.options = [];
    },
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : !!force;
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || null;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    appendChild(child) {
      this.children.push(child);
      child.parentElement = this;
      if (child.tagName === 'OPTION') {
        this.options.push(child);
      } else if (Array.isArray(child.options)) {
        this.options.push(...child.options);
      }
      return child;
    },
    querySelectorAll(selector) {
      const matches = [];
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (
          selector === 'input[type=checkbox]'
          && node.tagName === 'INPUT'
          && node.type === 'checkbox'
        ) {
          matches.push(node);
        }
        (node.children || []).forEach(visit);
      };
      this.children.forEach(visit);
      return matches;
    },
    focus() {},
    select() {},
    ...extra
  };
}

function makeMoveButton(dir) {
  return makeElement(`move-${dir}`, {
    getAttribute(name) {
      return name === 'data-move-dir' ? dir : null;
    }
  });
}

function createHeadlessDomHarness(options = {}) {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const elements = new Map();
  const calls = [];
  let timerNow = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const scheduleTimer = (callback, delay) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, { callback, at: timerNow + Math.max(0, Number(delay) || 0) });
    return id;
  };
  const advanceTimers = (milliseconds) => {
    const until = timerNow + Math.max(0, Number(milliseconds) || 0);
    while (true) {
      const next = Array.from(timers.entries())
        .filter(([, timer]) => timer.at <= until)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!next) break;
      const [id, timer] = next;
      timers.delete(id);
      timerNow = timer.at;
      timer.callback();
    }
    timerNow = until;
  };
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        target[prop] = (text) => ({ width: String(text || '').length * 8 });
        return target[prop];
      }
      target[prop] = (...args) => {
        calls.push({ method: prop, args });
      };
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
  const wrap = makeElement('canvas-wrap', { clientWidth: 720 });
  const moveButtons = ['N', 'W', 'E', 'S', 'NW', 'NE', 'SW', 'SE'].map(makeMoveButton);
  const mode2048Controls = [
    makeElement('box-ui-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('new-boxes-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('speed-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('step-mode-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('debug-tile-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('debug-bomb-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('bomb-art-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('move-row', { attributes: { 'data-mode-control': '2048' } })
  ];
  const modeGomokuControls = [
    makeElement('gomoku-size-row', { hidden: true, attributes: { 'data-mode-control': 'gomoku' } })
  ];
  const modeConnectFourControls = [
    makeElement('connect-four-fall-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } }),
    makeElement('connect-four-align-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } })
  ];
  const modeGoControls = [
    makeElement('go-komi-row', { hidden: true, attributes: { 'data-mode-control': 'go' } }),
    makeElement('go-action-row', { hidden: true, attributes: { 'data-mode-control': 'go' } })
  ];
  const modeChineseCheckersControls = [
    makeElement('chinese-checkers-player-row', { hidden: true, attributes: { 'data-mode-control': 'chinese-checkers' } })
  ];
  const modeSokobanControls = [
    makeElement('sokoban-object-size-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-inner-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-outer-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-glow-blur-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-beam-width-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } }),
    makeElement('sokoban-beam-opacity-row', { hidden: true, attributes: { 'data-mode-control': 'sokoban' } })
  ];
  const canvas = makeElement('mosaic-canvas', {
    parentElement: wrap,
    getContext() {
      return ctx;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 288, height: 288 };
    },
    setPointerCapture(pointerId) {
      calls.push({ method: 'setPointerCapture', args: [pointerId] });
    },
    releasePointerCapture(pointerId) {
      calls.push({ method: 'releasePointerCapture', args: [pointerId] });
    }
  });
  [
    canvas,
    makeElement('game-mode-select', { value: options.gameMode || '2048' }),
    makeElement('surface-preset-select', { value: options.preset || 'classic-4x4' }),
    makeElement('import-preset-toggle'),
    makeElement('import-preset-tools'),
    makeElement('import-keep-game-mode', { checked: options.importKeepGameMode !== false }),
    makeElement('import-game-mode', { value: options.importGameMode || options.gameMode || '2048' }),
    makeElement('import-preset-source', { value: options.importSource || 'catalog' }),
    makeElement('import-preset-catalog-row'),
    makeElement('import-preset-catalog'),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('boundary-glue-mode-row', { hidden: true }),
    makeElement('boundary-glue-mode', { value: 'torus' }),
    makeElement('boundary-glue-wrapped-view-row', { hidden: true }),
    makeElement('boundary-glue-wrapped-view-mode', { value: 'usual' }),
    makeElement('boundary-glue-shape-row', { hidden: true }),
    makeElement('boundary-glue-shape', { value: 'square' }),
    makeElement('boundary-glue-rect-row', { hidden: true }),
    makeElement('boundary-glue-rows', { value: '15' }),
    makeElement('boundary-glue-cols', { value: '15' }),
    makeElement('gomoku-board-size', { value: '15' }),
    makeElement('display-card-body'),
    makeElement('gomoku-display-row'),
    makeElement('gomoku-display-style', { value: 'vertex' }),
    makeElement('show-board-coordinates'),
    makeElement('placement-hint-highlight-row', { hidden: true }),
    makeElement('placement-hint-highlight', { value: 'single' }),
    makeElement('placement-hint-colors-row', { hidden: true }),
    makeElement('placement-hint-colors', { value: 'axis' }),
    makeElement('placement-hint-colors-axis', { tagName: 'OPTION' }),
    makeElement('placement-hint-colors-direction', { tagName: 'OPTION' }),
    makeElement('go-komi', { value: '6.5' }),
    makeElement('go-pass'),
    makeElement('chinese-checkers-jump-rule', { value: 'unlimited' }),
    makeElement('chinese-checkers-player-options'),
    makeElement('connect-four-fall-dir', {
      value: 'S',
      options: ['S', 'E', 'W', 'N', 'SE', 'SW', 'NW', 'NE'].map((value) => ({ value, textContent: '', hidden: false, disabled: false }))
    }),
    makeElement('connect-four-align-fall', { checked: true }),
    makeElement('sokoban-object-size', { value: '70' }),
    makeElement('sokoban-object-size-value'),
    makeElement('sokoban-glow-inner', { value: '55' }),
    makeElement('sokoban-glow-inner-value'),
    makeElement('sokoban-glow-outer', { value: '82' }),
    makeElement('sokoban-glow-outer-value'),
    makeElement('sokoban-glow-blur', { value: '38' }),
    makeElement('sokoban-glow-blur-value'),
    makeElement('sokoban-beam-width', { value: '70' }),
    makeElement('sokoban-beam-width-value'),
    makeElement('sokoban-beam-opacity', { value: '34' }),
    makeElement('sokoban-beam-opacity-value'),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('highlight-new-boxes', { checked: true }),
    makeElement('begin-game'),
    makeElement('canvas-start-overlay', { hidden: true }),
    makeElement('canvas-start-title'),
    makeElement('canvas-start-context'),
    makeElement('canvas-start-rules'),
    makeElement('canvas-start-begin'),
    makeElement('canvas-start-close', { hidden: true }),
    makeElement('game-setup-alert', { hidden: true }),
    makeElement('animation-speed', { value: '80' }),
    makeElement('animation-speed-value'),
    makeElement('step-mode', { checked: !!options.stepMode }),
    makeElement('next-step'),
    makeElement('debug-toggle'),
    makeElement('debug-tools'),
    makeElement('check-translation', { checked: true }),
    makeElement('debug-tile-value', { value: '128' }),
    makeElement('debug-bomb-tool', { value: 'number' }),
    makeElement('bomb-art-style', { value: 'png-1' }),
    makeElement('hex-cover-offset-row', { hidden: true }),
    makeElement('hex-cover-offset-x', { value: '0' }),
    makeElement('hex-cover-offset-x-value'),
    makeElement('hex-cover-offset-y', { value: '0' }),
    makeElement('hex-cover-offset-y-value'),
    makeElement('undo-step'),
    makeElement('redo-step'),
    makeElement('export-state'),
    makeElement('import-state'),
    makeElement('debug-export-output'),
    makeElement('export-state-kind', { value: options.exportKind || 'status' }),
    makeElement('export-background-format-row', { hidden: true }),
    makeElement('export-background-format', { value: options.exportFormat || 'dsl' }),
    makeElement('status-badge'),
    makeElement('status-line'),
    makeElement('info-line'),
    makeElement('score-label'),
    makeElement('highest-tile-label'),
    makeElement('existing-tile-label'),
    makeElement('removed-tile-label'),
    makeElement('round-label'),
    makeElement('score-value'),
    makeElement('highest-tile-value'),
    makeElement('existing-tile-value'),
    makeElement('removed-tile-value'),
    makeElement('round-value'),
    makeElement('online-play-card'),
    makeElement('online-room-code'),
    makeElement('online-room-select', { tagName: 'SELECT', hidden: true }),
    makeElement('online-player-name'),
    makeElement('online-role-options'),
    makeElement('online-create-room'),
    makeElement('online-search-room'),
    makeElement('online-join-room'),
    makeElement('online-leave-room'),
    makeElement('online-confirm-roles'),
    makeElement('online-ready'),
    makeElement('online-chinese-start-row'),
    makeElement('online-keep-unclaimed-colors'),
    makeElement('online-start-claimed-colors'),
    makeElement('online-status'),
    makeElement('online-turn-feedback-duration', { value: '1000' }),
    makeElement('online-turn-feedback-duration-value'),
    makeElement('online-turn-feedback-preview')
  ].forEach((element) => elements.set(element.id, element));
  moveButtons.forEach((button) => elements.set(button.id, button));
  mode2048Controls.forEach((control) => elements.set(control.id, control));
  modeGomokuControls.forEach((control) => elements.set(control.id, control));
  modeConnectFourControls.forEach((control) => elements.set(control.id, control));
  modeGoControls.forEach((control) => elements.set(control.id, control));
  modeChineseCheckersControls.forEach((control) => elements.set(control.id, control));
  modeSokobanControls.forEach((control) => elements.set(control.id, control));

  const documentListeners = {};
  const windowListeners = {};
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Buffer,
    Math: Object.create(Math),
    performance: { now: () => timerNow },
    setTimeout(callback, delay) {
      return scheduleTimer(callback, delay);
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    URL,
    URLSearchParams,
    fetch: options.fetch || (() => Promise.reject(new Error('fetch not configured'))),
    document: {
      head: {
        appendChild(script) {
          const entry = presetRegistry.find((item) => String(script.src || '').includes(item.file));
          if (!entry || !options.loadLazyPresetScripts) {
            if (typeof script.onerror === 'function') script.onerror();
            return script;
          }
          context.window.RAMIFIED_MINIGAME_PRESET_DATA[entry.key] = presetDataByKey[entry.key];
          if (typeof script.onload === 'function') script.onload();
          return script;
        }
      },
      getElementById(id) {
        return elements.get(id) || null;
      },
      createElement(tagName) {
        return makeElement('', { tagName: String(tagName || '').toUpperCase() });
      },
      createTextNode(text) {
        return makeElement('', { tagName: '#text', textContent: String(text || '') });
      },
      addEventListener(type, handler) {
        documentListeners[type] = handler;
        if (type === 'DOMContentLoaded') handler();
      },
      querySelectorAll(selector) {
        if (selector === '[data-move-dir]') return moveButtons;
        if (selector === '[data-mode-control="2048"]') return mode2048Controls;
        if (selector === '[data-mode-control="gomoku"]') return modeGomokuControls;
        if (selector === '[data-mode-control="connect-four"]') return modeConnectFourControls;
        if (selector === '[data-mode-control="go"]') return modeGoControls;
        if (selector === '[data-mode-control="chinese-checkers"]') return modeChineseCheckersControls;
        if (selector === '[data-mode-control="sokoban"]') return modeSokobanControls;
        return [];
      }
    },
    window: {
      devicePixelRatio: 1,
      location: { search: options.locationSearch || '' },
      RAMIFIED_MINIGAMES_ONLINE_URL: options.onlineUrl || '',
      SiteI18n: options.siteI18n || null,
      RAMIFIED_MINIGAME_PRESETS: presetRegistrySource,
      RAMIFIED_MINIGAME_PRESET_DATA: options.preloadPresetData === false ? {} : presetDataByKey,
      localStorage: {
        _values: {},
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._values, key) ? this._values[key] : null;
        },
        setItem(key, value) {
          this._values[key] = String(value);
        },
        removeItem(key) {
          delete this._values[key];
        }
      },
      addEventListener(type, handler) {
        windowListeners[type] = handler;
      },
      matchMedia(query) {
        return {
          media: query,
          matches: !!options.reducedMotion && query === '(prefers-reduced-motion: reduce)',
          addEventListener() {},
          removeEventListener() {}
        };
      },
      requestAnimationFrame(handler) {
        calls.push({ method: 'requestAnimationFrame', args: [] });
        return scheduleTimer(() => handler(timerNow), 16);
      },
      cancelAnimationFrame(id) {
        timers.delete(id);
      }
    }
  };
  let randoms = (options.randoms || [0.5, 0.5, 0, 0.1, 0.2, 0.1, 0.3, 0.1]).slice();
  context.Math.random = () => (randoms.length ? randoms.shift() : 0.1);
  vm.runInNewContext(source, context);
  return {
    elements, canvas, moveButtons, documentListeners, windowListeners, calls, context,
    advanceTimers,
    pendingTimerCount: () => timers.size
  };
}

function fakeJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(payload))
  };
}

async function invokeHeadlessListener(element, type = 'click') {
  element.listeners[type]();
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function testTranslationCheckLifecycle() {
  const warningCalls = [];
  const auditCalls = [];
  const harness = createHeadlessDomHarness({
    siteI18n: {
      setTranslationWarnings(enabled, options) {
        warningCalls.push({ enabled, options });
      },
      auditTranslations(root, options) {
        auditCalls.push({ root, options });
        return [{ kind: 'untranslated-source' }];
      }
    }
  });
  const checkbox = harness.elements.get('check-translation');
  assert.strictEqual(checkbox.checked, false, 'translation checking is session-only and starts unchecked');
  assert.strictEqual(checkbox.disabled, true, 'translation checking is available only from the open debug panel');

  harness.elements.get('debug-toggle').listeners.click();
  assert.strictEqual(harness.elements.get('debug-tools').hidden, false);
  assert.strictEqual(checkbox.disabled, false);
  checkbox.checked = true;
  checkbox.listeners.change();
  assert.strictEqual(warningCalls.length, 1);
  assert.strictEqual(warningCalls[0].enabled, true);
  assert.strictEqual(warningCalls[0].options.locale, 'zh-CN');
  assert.strictEqual(auditCalls.length, 1, 'checking immediately audits the current UI');
  assert.strictEqual(auditCalls[0].root, harness.context.document);
  assert.strictEqual(auditCalls[0].options.locale, 'zh-CN');

  checkbox.checked = false;
  checkbox.listeners.change();
  assert.strictEqual(warningCalls[1].enabled, false);
  assert.strictEqual(warningCalls[1].options.locale, 'zh-CN');
  assert.strictEqual(auditCalls.length, 1, 'unchecking stops diagnostics without another audit');
}

async function testOnlineControlsVisibleForSinglePlayerModes() {
  const fetchCalls = [];
  let harness = createHeadlessDomHarness({
    onlineUrl: 'https://example.test/worker',
    fetch(url, init) {
      fetchCalls.push({ url, init });
      return Promise.resolve(fakeJsonResponse({ roomCode: '123456' }));
    }
  });
  harness.elements.get('game-mode-select').value = '2048';
  harness.elements.get('game-mode-select').listeners.change();
  assert.strictEqual(harness.elements.get('game-mode-select').value, '2048');
  assert.strictEqual(harness.elements.get('online-play-card').hidden, false);
  assert.strictEqual(harness.elements.get('online-create-room').disabled, false);
  assert.strictEqual(harness.elements.get('online-search-room').disabled, false);
  assert.strictEqual(harness.elements.get('online-join-room').disabled, true);
  await invokeHeadlessListener(harness.elements.get('online-create-room'));
  assert.strictEqual(fetchCalls.length, 0);
  assert.ok(harness.elements.get('online-status').textContent.includes('one-player game'));
  assert.strictEqual(harness.elements.get('status-line').textContent, 'online create unavailable');

  harness = createHeadlessDomHarness({
    gameMode: 'sokoban',
    onlineUrl: 'https://example.test/worker',
    fetch(url, init) {
      fetchCalls.push({ url, init });
      return Promise.resolve(fakeJsonResponse({ roomCode: '123456' }));
    }
  });
  harness.elements.get('game-mode-select').value = 'sokoban';
  harness.elements.get('game-mode-select').listeners.change();
  assert.strictEqual(harness.elements.get('online-play-card').hidden, false);
  assert.strictEqual(harness.elements.get('online-create-room').disabled, false);
  assert.strictEqual(harness.elements.get('online-search-room').disabled, false);
  await invokeHeadlessListener(harness.elements.get('online-create-room'));
  assert.strictEqual(fetchCalls.length, 0);
  assert.ok(harness.elements.get('online-status').textContent.includes('one-player game'));
}

async function testOnlineRoomSearchPopulatesSelect() {
  const fetchCalls = [];
  const harness = createHeadlessDomHarness({
    onlineUrl: 'https://example.test/worker',
    fetch(url, init) {
      fetchCalls.push({ url, init });
      return Promise.resolve(fakeJsonResponse({
        rooms: [
          { roomCode: '123456', gameMode: 'gomoku', summary: 'open game' },
          { roomCode: '777777', gameMode: 'go', summary: 'territory' }
        ]
      }));
    }
  });
  await invokeHeadlessListener(harness.elements.get('online-search-room'));
  const select = harness.elements.get('online-room-select');
  assert.strictEqual(fetchCalls.length, 1);
  assert.strictEqual(fetchCalls[0].url, 'https://example.test/worker/api/rooms');
  assert.strictEqual(fetchCalls[0].init, undefined);
  assert.strictEqual(select.hidden, false);
  assert.strictEqual(select.options.length, 2);
  assert.deepStrictEqual(select.options.map((option) => option.textContent), ['123456 - Gomoku', '777777 - Go']);
  assert.strictEqual(select.value, '123456');
  assert.strictEqual(harness.elements.get('online-room-code').value, '123456');
  assert.ok(harness.elements.get('online-status').textContent.includes('Found 2 online rooms'));
  select.value = '777777';
  select.listeners.change();
  assert.strictEqual(harness.elements.get('online-room-code').value, '777777');
}

async function testOnlineRoomSearchEmptyResults() {
  const harness = createHeadlessDomHarness({
    onlineUrl: 'https://example.test',
    fetch() {
      return Promise.resolve(fakeJsonResponse({ rooms: [] }));
    }
  });
  await invokeHeadlessListener(harness.elements.get('online-search-room'));
  assert.strictEqual(harness.elements.get('online-room-select').hidden, true);
  assert.strictEqual(harness.elements.get('online-room-select').options.length, 0);
  assert.ok(harness.elements.get('online-status').textContent.includes('No online rooms'));
}

async function testOnlineRoomSearchFailureHidesSelect() {
  const harness = createHeadlessDomHarness({
    onlineUrl: 'https://example.test',
    fetch() {
      return Promise.reject(new Error('network down'));
    }
  });
  await invokeHeadlessListener(harness.elements.get('online-search-room'));
  assert.strictEqual(harness.elements.get('online-room-select').hidden, true);
  assert.strictEqual(harness.elements.get('online-room-select').options.length, 0);
  assert.ok(harness.elements.get('online-status').textContent.includes('network down'));
}

function blockedBonusStatusPayload(withBomb = false) {
  return {
    preset: {
      label: withBomb ? 'bomb blocked bonus import' : 'bonus ending import',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'full blocked grid'
    },
    phase: 'ready',
    round: 11,
    score: 20,
    nextBoxId: 17,
    boxes: Array.from({ length: 16 }, (_, index) => {
      if (withBomb && index === 5) return null;
      const row = Math.floor(index / 4) + 1;
      const col = (index % 4) + 1;
      return { id: index + 1, row, col, value: (row + col) % 2 ? 2 : 4 };
    }).filter(Boolean),
    bombs: withBomb ? [{ row: 2, col: 2, kind: 'blue', value: 2 }] : [],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
}

function test2048BonusEndingEligibilityWithBombs() {
  const withBomb = game.gameStateFromDebugImportPayload(blockedBonusStatusPayload(true)).state;
  assert.strictEqual(game.emptyExistingIndices(withBomb).length, 0);
  assert.strictEqual(game.isGameOver(withBomb), false);
  assert.strictEqual(game.canOfferBonusEnding(withBomb), false);
  game.directionsForPreset(withBomb.preset).forEach((dir) => {
    assert.strictEqual(game.simulateRound(withBomb, dir, { spawn: false }).changed, false);
  });

  const withoutBomb = game.gameStateFromDebugImportPayload(blockedBonusStatusPayload(false)).state;
  assert.strictEqual(game.emptyExistingIndices(withoutBomb).length, 0);
  assert.strictEqual(game.isGameOver(withoutBomb), true);
  assert.strictEqual(game.canOfferBonusEnding(withoutBomb), true);
}

function pointerEvent(x, y, extra = {}) {
  return {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra
  };
}

function swipeCanvas(canvas, startX, startY, endX, endY, extra = {}) {
  const pointerId = extra.pointerId || 1;
  canvas.listeners.pointerdown(pointerEvent(startX, startY, { ...extra, pointerId }));
  canvas.listeners.pointermove(pointerEvent(endX, endY, { ...extra, pointerId }));
  const up = pointerEvent(endX, endY, { ...extra, pointerId });
  canvas.listeners.pointerup(up);
  return up;
}

function keyboardEvent(code, extra = {}) {
  return {
    code,
    key: code,
    repeat: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra
  };
}

function pressKey(documentListeners, code, extra = {}) {
  const event = keyboardEvent(code, extra);
  documentListeners.keydown(event);
  return event;
}

function releaseKey(documentListeners, code, extra = {}) {
  const event = keyboardEvent(code, extra);
  documentListeners.keyup(event);
  return event;
}

function enableHeadlessDebug(elements) {
  if (elements.get('debug-toggle').attributes['aria-pressed'] !== 'true') {
    elements.get('debug-toggle').listeners.click();
  }
}

function importHeadlessStatus(elements, payload) {
  enableHeadlessDebug(elements);
  elements.get('debug-export-output').value = JSON.stringify(payload);
  elements.get('import-state').listeners.click();
}

function encodeBase64UrlJson(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function singleSquareBoxStatus() {
  const preset = game.createGameState('classic-4x4').preset;
  return {
    preset,
    phase: 'ready',
    round: 0,
    score: 0,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 2, col: 2, value: 2 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
}

function singleHexBoxStatus() {
  const preset = game.createGameState('hex-classic-4x4').preset;
  return {
    preset,
    phase: 'ready',
    round: 0,
    score: 0,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 2, col: 2, value: 2 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
}

function testSquareWasdKeyboardControls() {
  [
    ['KeyW', 'up'],
    ['KeyA', 'left'],
    ['KeyS', 'down'],
    ['KeyD', 'right']
  ].forEach(([key, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleSquareBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testActiveSquareKeyboardPreventsPageScroll() {
  [
    ['ArrowUp', 'up'],
    ['ArrowLeft', 'left'],
    ['ArrowDown', 'down'],
    ['ArrowRight', 'right'],
    ['KeyW', 'up'],
    ['KeyA', 'left'],
    ['KeyS', 'down'],
    ['KeyD', 'right']
  ].forEach(([key, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleSquareBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testHexArrowKeyboardControls() {
  [
    [['ArrowLeft'], 'west'],
    [['ArrowRight'], 'east'],
    [['ArrowUp', 'ArrowLeft'], 'northwest'],
    [['ArrowUp', 'ArrowRight'], 'northeast'],
    [['ArrowDown', 'ArrowLeft'], 'southwest'],
    [['ArrowDown', 'ArrowRight'], 'southeast']
  ].forEach(([keys, label]) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    keys.forEach((key) => {
      const event = pressKey(documentListeners, key);
      assert.strictEqual(event.defaultPrevented, true);
    });
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testActiveHexKeyboardPreventsPageScroll() {
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach((key) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
  });
}

function testHexVerticalArrowAloneDoesNotMove() {
  ['ArrowUp', 'ArrowDown'].forEach((key) => {
    const { elements, documentListeners } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    const event = pressKey(documentListeners, key);
    assert.strictEqual(event.defaultPrevented, true);
    assert.strictEqual(elements.get('round-value').textContent, '0');
    assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  });
}

function testHexKeyboardStateClearsOnKeyupAndBlur() {
  let harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleHexBoxStatus());
  pressKey(harness.documentListeners, 'ArrowUp');
  releaseKey(harness.documentListeners, 'ArrowUp');
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: east');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleHexBoxStatus());
  pressKey(harness.documentListeners, 'ArrowDown');
  harness.windowListeners.blur();
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: east');
}

function testKeyboardPreventsScrollWhileBusyWithoutMovingAgain() {
  let harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, singleSquareBoxStatus());
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'moving');
  const animatingEvent = pressKey(harness.documentListeners, 'ArrowLeft');
  assert.strictEqual(animatingEvent.defaultPrevented, true);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');

  harness = createHeadlessDomHarness({ stepMode: true });
  importHeadlessStatus(harness.elements, singleSquareBoxStatus());
  pressKey(harness.documentListeners, 'ArrowRight');
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'step');
  const pausedEvent = pressKey(harness.documentListeners, 'ArrowLeft');
  assert.strictEqual(pausedEvent.defaultPrevented, true);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
}

function testKeyboardAllowsPageScrollOutsideActive2048() {
  let harness = createHeadlessDomHarness();
  let event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, {
    preset: { label: 'over', lattice: 'square', rows: 4, cols: 4, surface: 'over' },
    phase: 'gameover',
    ending: 'bonus',
    round: 5,
    score: 0,
    nextBoxId: 1,
    boxes: [],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '5');

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'gomoku';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'connect-four';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  event = pressKey(harness.documentListeners, 'ArrowDown');
  assert.strictEqual(event.defaultPrevented, false);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');
}

function testKeyboardShortcutsUndoRedoAndReset() {
  let harness = createHeadlessDomHarness();
  let { elements, canvas, documentListeners } = harness;
  elements.get('game-mode-select').value = 'gomoku';
  elements.get('game-mode-select').listeners.change();
  elements.get('begin-game').listeners.click();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 1);
  assert.strictEqual(elements.get('redo-step').disabled, true);

  event = pressKey(documentListeners, 'KeyZ');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(elements.get('redo-step').disabled, false);

  event = pressKey(documentListeners, 'KeyY');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 1);
  assert.strictEqual(elements.get('undo-step').disabled, false);

  event = pressKey(documentListeners, 'KeyZ', { target: { tagName: 'TEXTAREA' } });
  assert.strictEqual(event.defaultPrevented, false);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 1);

  event = pressKey(documentListeners, 'KeyR');
  assert.strictEqual(event.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'reset complete');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(exported.round, 0);
  assert.strictEqual(elements.get('undo-step').disabled, true);
  assert.strictEqual(elements.get('redo-step').disabled, true);

  harness = createHeadlessDomHarness();
  ({ elements, documentListeners } = harness);
  importHeadlessStatus(elements, singleSquareBoxStatus());
  pressKey(documentListeners, 'ArrowRight');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  event = pressKey(documentListeners, 'KeyR');
  assert.strictEqual(event.defaultPrevented, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'ready');
  assert.strictEqual(exported.round, 0);
}

function testSwipeRightMovesSquare2048() {
  const { elements, canvas, moveButtons } = createHeadlessDomHarness();
  assert.strictEqual(typeof canvas.listeners.pointerdown, 'function');
  assert.strictEqual(typeof canvas.listeners.pointermove, 'function');
  assert.strictEqual(typeof canvas.listeners.pointerup, 'function');
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('info-line').textContent, 'use arrow keys, buttons, or swipe/drag to slide');
  const up = swipeCanvas(canvas, 40, 40, 80, 40);
  assert.strictEqual(up.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
  assert.strictEqual(elements.get('status-badge').textContent, 'moving');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  assert.ok(moveButtons.every((button) => button.disabled));
}

function testShortSwipeDoesNotMove() {
  const { elements, canvas } = createHeadlessDomHarness();
  elements.get('begin-game').listeners.click();
  const up = swipeCanvas(canvas, 40, 40, 47, 43);
  assert.strictEqual(up.defaultPrevented, false);
  assert.strictEqual(elements.get('round-value').textContent, '0');
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
}

function testSwipeSuppressesFollowupClick() {
  const { elements, canvas } = createHeadlessDomHarness({ stepMode: true });
  elements.get('begin-game').listeners.click();
  enableHeadlessDebug(elements);
  swipeCanvas(canvas, 40, 40, 80, 40);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
  assert.strictEqual(elements.get('status-badge').textContent, 'step');
  const click = pointerEvent(57, 57);
  canvas.listeners.click(click);
  assert.strictEqual(click.defaultPrevented, true);
  assert.strictEqual(elements.get('status-line').textContent, 'round 1: right');
}

async function testTimedPlacementReachAssistInteractions() {
  const { elements, canvas, calls, advanceTimers, pendingTimerCount } = createHeadlessDomHarness();
  importHeadlessStatus(elements, {
    gameMode: 'go',
    preset: {
      label: 'reach assist input', lattice: 'square', rows: 3, cols: 3, surface: 'test',
      removedTiles: [], cutEdges: [], gluedEdges: []
    },
    phase: 'ready', turn: 'white', round: 1, nextStoneId: 2,
    stones: [{ id: 1, row: 2, col: 2, color: 'black', moveNumber: 1 }],
    removed: [], queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  const center = pointerEvent(144, 144);
  canvas.listeners.pointermove(center);
  assert.ok(pendingTimerCount() >= 1);
  const beforeDwell = calls.length;
  advanceTimers(499);
  assert.strictEqual(calls.length, beforeDwell, '499 ms must not reach the assist');
  canvas.listeners.pointermove(pointerEvent(144, 144));
  advanceTimers(1);
  assert.ok(calls.length > beforeDwell, 'same-position movement preserves the 500 ms dwell timer');

  canvas.listeners.pointermove(pointerEvent(144, 144));
  canvas.listeners.pointercancel(pointerEvent(144, 144));
  assert.strictEqual(pendingTimerCount(), 0, 'pointer cancellation clears pending assist timers');

  canvas.listeners.pointermove(pointerEvent(144, 144));
  advanceTimers(300);
  const pendingBeforePress = pendingTimerCount();
  const beforeHoverPressDwell = calls.length;
  canvas.listeners.pointerdown(pointerEvent(144, 144));
  assert.strictEqual(pendingTimerCount(), pendingBeforePress, 'pressing the hovered tile does not start a second dwell timer');
  advanceTimers(199);
  assert.strictEqual(calls.length, beforeHoverPressDwell, 'the shared hover-and-press dwell still waits 500 ms total');
  advanceTimers(1);
  assert.ok(calls.length > beforeHoverPressDwell, 'the original hover timer activates while the pointer remains pressed');
  canvas.listeners.pointerup(pointerEvent(144, 144));
  const hoverPressClick = pointerEvent(144, 144);
  canvas.listeners.click(hoverPressClick);
  assert.strictEqual(hoverPressClick.defaultPrevented, true, 'a press held through shared dwell activation suppresses its click');

  canvas.listeners.pointerdown(pointerEvent(144, 144));
  advanceTimers(499);
  canvas.listeners.pointerup(pointerEvent(144, 144));
  const shortClick = pointerEvent(144, 144);
  canvas.listeners.click(shortClick);
  assert.strictEqual(shortClick.defaultPrevented, false, 'a short press must retain normal clicks');

  canvas.listeners.pointerdown(pointerEvent(144, 144));
  advanceTimers(500);
  canvas.listeners.pointerup(pointerEvent(144, 144));
  const heldClick = pointerEvent(144, 144);
  canvas.listeners.click(heldClick);
  assert.strictEqual(heldClick.defaultPrevented, true, 'a completed press dwell suppresses its follow-up click');
}

async function testAnimatedPlacementRayHintInteractions() {
  const gomokuHarness = createHeadlessDomHarness();
  importHeadlessStatus(gomokuHarness.elements, {
    gameMode: 'gomoku',
    preset: {
      label: 'animated reach assist', lattice: 'square', rows: 3, cols: 3, surface: 'test',
      removedTiles: [], cutEdges: [], gluedEdges: []
    },
    phase: 'ready', turn: 'white', round: 1, nextStoneId: 2,
    stones: [{ id: 1, row: 2, col: 2, color: 'black', moveNumber: 1 }],
    removed: [], queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  gomokuHarness.canvas.listeners.pointermove(pointerEvent(156, 144));
  gomokuHarness.advanceTimers(500);
  assert.strictEqual(gomokuHarness.context.module.exports.__test.getPlacementReachDirectionId(), 'E');
  assert.ok(gomokuHarness.calls.some((call) => call.method === 'requestAnimationFrame'), 'ray assist schedules its grow animation');
  gomokuHarness.canvas.listeners.pointermove(pointerEvent(132, 144));
  assert.strictEqual(gomokuHarness.context.module.exports.__test.getPlacementReachDirectionId(), 'W', 'same-tile bearing changes the highlighted ray');
  gomokuHarness.canvas.listeners.pointermove(pointerEvent(144, 144));
  assert.strictEqual(gomokuHarness.context.module.exports.__test.getPlacementReachDirectionId(), 'W', 'the center dead zone retains the stable direction');

  const connectFourPayload = {
    gameMode: 'connect-four',
    preset: {
      label: 'animated drop assist', lattice: 'square', rows: 3, cols: 3, surface: 'test',
      removedTiles: [], cutEdges: [], gluedEdges: [], connectFourHoles: [{ row: 1, col: 2 }]
    },
    phase: 'ready', turn: 'red', round: 0, nextTokenId: 1, fallDirName: 'S',
    holes: [{ row: 1, col: 2 }], tokens: [],
    removed: [], queue: { eventIndex: 0, stepPaused: false, events: [] }
  };
  const connectFourHarness = createHeadlessDomHarness();
  importHeadlessStatus(connectFourHarness.elements, connectFourPayload);
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  connectFourHarness.calls.length = 0;
  connectFourHarness.canvas.listeners.pointermove(pointerEvent(144, 57));
  connectFourHarness.advanceTimers(500);
  assert.ok(
    connectFourHarness.calls.some((call) => call.method === 'requestAnimationFrame'),
    'Connect Four drop hints schedule the shared grow animation'
  );
  connectFourHarness.canvas.listeners.pointercancel(pointerEvent(144, 57));
  const framesAfterCancel = connectFourHarness.calls.filter((call) => call.method === 'requestAnimationFrame').length;
  connectFourHarness.advanceTimers(32);
  assert.strictEqual(
    connectFourHarness.calls.filter((call) => call.method === 'requestAnimationFrame').length,
    framesAfterCancel,
    'clearing a drop hint cancels its animation frame'
  );
  connectFourHarness.calls.length = 0;
  connectFourHarness.canvas.listeners.click(pointerEvent(144, 57));
  assert.ok(
    connectFourHarness.calls.some((call) => call.method === 'createRadialGradient'),
    'the committed Connect Four drop still renders a solid game token'
  );

  const reducedHarness = createHeadlessDomHarness({ reducedMotion: true });
  importHeadlessStatus(reducedHarness.elements, {
    gameMode: 'gomoku',
    preset: {
      label: 'reduced reach assist', lattice: 'square', rows: 3, cols: 3, surface: 'test',
      removedTiles: [], cutEdges: [], gluedEdges: []
    },
    phase: 'ready', turn: 'white', round: 1, nextStoneId: 2,
    stones: [{ id: 1, row: 2, col: 2, color: 'black', moveNumber: 1 }],
    removed: [], queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  reducedHarness.calls.length = 0;
  reducedHarness.canvas.listeners.pointermove(pointerEvent(156, 144));
  reducedHarness.advanceTimers(500);
  assert.ok(!reducedHarness.calls.some((call) => call.method === 'requestAnimationFrame'), 'reduced motion reveals rays without animation frames');

  const reducedDropHarness = createHeadlessDomHarness({ reducedMotion: true });
  importHeadlessStatus(reducedDropHarness.elements, connectFourPayload);
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
  reducedDropHarness.calls.length = 0;
  reducedDropHarness.canvas.listeners.pointermove(pointerEvent(144, 57));
  reducedDropHarness.advanceTimers(500);
  assert.ok(
    !reducedDropHarness.calls.some((call) => call.method === 'requestAnimationFrame'),
    'reduced motion reveals the finished drop beam and marker immediately'
  );

  assert.strictEqual(gomokuHarness.elements.get('placement-hint-highlight-row').hidden, false);
  assert.strictEqual(gomokuHarness.elements.get('placement-hint-colors-row').hidden, false);
  assert.strictEqual(gomokuHarness.elements.get('placement-hint-colors-axis').textContent, '4 colors — one per axis');
  assert.strictEqual(gomokuHarness.elements.get('placement-hint-colors-direction').textContent, '8 colors — one per direction');
  gomokuHarness.elements.get('placement-hint-highlight').value = 'opposites';
  gomokuHarness.elements.get('placement-hint-colors').value = 'direction';
  gomokuHarness.elements.get('export-state').listeners.click();
  const hintExport = JSON.parse(gomokuHarness.elements.get('debug-export-output').value);
  assert.ok(!Object.hasOwn(hintExport.settings, 'placementHintHighlight'));
  assert.ok(!Object.hasOwn(hintExport.settings, 'placementHintColors'));
}

function testPlacementHoverGuidanceRules() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="placement-preview-opacity" min="10" max="90" step="5" value="50"'));
  assert.ok(html.includes('data-i18n="setup.previewOpacity"'));
  assert.deepStrictEqual(game.__test.placementPreviewOpacityRange, { min: 10, max: 90, default: 50 });
  assert.ok(html.includes('id="placement-hint-highlight"'));
  assert.ok(html.includes('<option value="single" selected data-i18n="setup.hintHighlightSingle">'));
  assert.ok(html.includes('<option value="opposites" data-i18n="setup.hintHighlightOpposites">'));
  assert.ok(html.includes('id="placement-hint-colors"'));
  assert.ok(html.includes('<option value="uniform" data-i18n="setup.hintLineColorsUniform">'));
  assert.ok(html.includes('id="placement-hint-colors-axis" value="axis" selected'));

  const preset = {
    id: 'placement-hover-test', label: 'placement hover test', lattice: 'square', rows: 4, cols: 4,
    surface: 'test', removedTiles: [], cutEdges: [], gluedEdges: []
  };
  const gomoku = game.createGomokuState(preset);
  gomoku.phase = 'ready';
  assert.deepStrictEqual(game.__test.placementHoverPreview(gomoku, 0), { kind: 'ghost', index: 0, color: 'black' });
  gomoku.stones.push({ id: 1, index: 0, color: 'black', moveNumber: 1 });
  assert.strictEqual(game.__test.placementHoverPreview(gomoku, 0), null, 'occupied Gomoku points do not get a ghost');

  const go = game.createGoState(preset);
  go.phase = 'ready';
  game.__test.setGame(go);
  assert.deepStrictEqual(game.__test.placementHoverPreview(go, 0), { kind: 'ghost', index: 0, color: 'black' });

  const reversi = game.createReversiState(preset);
  reversi.phase = 'ready';
  assert.deepStrictEqual(game.__test.placementHoverPreview(reversi, 1), { kind: 'ghost', index: 1, color: 'black' });
  assert.strictEqual(game.__test.placementHoverPreview(reversi, 0), null, 'Reversi only previews moves that flip a disc');

  const connectFour = game.createConnectFourState({ ...preset, connectFourHoles: [{ row: 1, col: 1 }] });
  connectFour.phase = 'ready';
  assert.deepStrictEqual(game.__test.placementHoverPreview(connectFour, 0), { kind: 'connect-four-drop', index: 0, color: 'red' });
  assert.strictEqual(game.__test.placementHoverPreview(connectFour, 1), null, 'Connect Four only previews input holes');

  assert.strictEqual(game.__test.lianliankanTilesMatch({ id: 'A', glyph: 'A' }, { id: 'A', glyph: 'A' }), true);
  assert.strictEqual(game.__test.lianliankanTilesMatch({ id: 'A', matchKey: 'pair-a' }, { id: 'A', matchKey: 'pair-a' }), false);
  assert.strictEqual(game.__test.lianliankanTilesMatch({ id: 'A', matchKey: 'pair-a' }, { id: 'B', matchKey: 'pair-a' }), true);
}

function testHexCoverOffsetDiagnosticsAndConnectFourWrappedView() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="hex-cover-offset-row"'));
  assert.ok(html.includes('id="hex-cover-offset-x" min="-2" max="2" step="0.05" value="0"'));
  assert.ok(html.includes('id="hex-cover-offset-y" min="-2" max="2" step="0.05" value="0"'));
  assert.ok(html.includes('data-i18n="debug.hexCoverOffset"'));
  assert.ok(html.includes('data-i18n-aria-label="access.hexCoverOffsetX"'));
  assert.ok(html.includes('data-i18n-aria-label="access.hexCoverOffsetY"'));

  const { elements } = createHeadlessDomHarness();
  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = 'connect-four-hex-good-mobius-strip';
  elements.get('surface-preset-select').listeners.change();
  assert.ok(elements.get('display-card-body').children.includes(elements.get('boundary-glue-wrapped-view-row')));
  assert.strictEqual(elements.get('boundary-glue-wrapped-view-row').hidden, false, 'the good hex Möbius preset exposes Board view');
  assert.strictEqual(elements.get('boundary-glue-wrapped-view-mode').value, 'usual');

  elements.get('boundary-glue-wrapped-view-mode').value = 'wrapped';
  elements.get('boundary-glue-wrapped-view-mode').listeners.change({ target: elements.get('boundary-glue-wrapped-view-mode') });
  assert.strictEqual(elements.get('hex-cover-offset-row').hidden, true, 'the diagnostic remains debug-only');
  enableHeadlessDebug(elements);
  assert.strictEqual(elements.get('hex-cover-offset-row').hidden, false);
  assert.strictEqual(elements.get('hex-cover-offset-x').disabled, false);
  assert.strictEqual(elements.get('hex-cover-offset-y').disabled, false);
  elements.get('hex-cover-offset-x').value = '0.5';
  elements.get('hex-cover-offset-x').listeners.input();
  elements.get('hex-cover-offset-y').value = '-0.25';
  elements.get('hex-cover-offset-y').listeners.change();
  assert.strictEqual(elements.get('hex-cover-offset-x-value').textContent, '0.50 r');
  assert.strictEqual(elements.get('hex-cover-offset-y-value').textContent, '-0.25 r');
  elements.get('export-state').listeners.click();
  assert.ok(!elements.get('debug-export-output').value.includes('hexCoverOffset'), 'the diagnostic is not exported');

  elements.get('game-mode-select').value = 'go';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  elements.get('boundary-glue-mode').value = game.BOUNDARY_GLUE_MODES.TORUS;
  elements.get('boundary-glue-mode').listeners.change();
  assert.strictEqual(elements.get('boundary-glue-wrapped-view-row').hidden, false, 'Go exposes Board view on the Boundary Glue Board');
  elements.get('boundary-glue-mode').value = game.BOUNDARY_GLUE_MODES.RP2;
  elements.get('boundary-glue-mode').listeners.change();
  assert.strictEqual(elements.get('boundary-glue-wrapped-view-row').hidden, false, 'RP² exposes the reflected chart view');
}

function testWrappedNQueensTrayAndGlueHoverInteraction() {
  const originalWrappedViews = game.__test.getWrappedViewPreferences();
  const nQueens = game.beginFideChessGame('n-queens-torus-puzzle');
  const ordinaryGeometry = game.__test.buildGeometry(nQueens.preset, 720, 16, 1);
  game.__test.applyFideChessPuzzleTrayGeometry(ordinaryGeometry, nQueens);
  assert.ok(ordinaryGeometry.height > ordinaryGeometry.boardHeight, 'ordinary N-Queens reserves board-space for its tray');

  game.__test.setWrappedViewPreferences({ torus: 'wrapped' });
  const wrappedGeometry = game.__test.buildGeometry(nQueens.preset, 720, 0, 1);
  const wrappedWidth = wrappedGeometry.width;
  const wrappedHeight = wrappedGeometry.height;
  game.__test.applyFideChessPuzzleTrayGeometry(wrappedGeometry, nQueens, { screenOverlay: true });
  assert.strictEqual(wrappedGeometry.width, wrappedWidth, 'the wrapped tray does not expand each chart');
  assert.strictEqual(wrappedGeometry.height, wrappedHeight, 'the wrapped tray does not extend each chart below its board');
  const wrappedTray = game.__test.fideChessPuzzleTrayLayout(wrappedGeometry, nQueens);
  assert.ok(wrappedTray);
  assert.ok(wrappedTray.y + wrappedTray.height <= wrappedGeometry.height, 'the wrapped tray remains within the viewport');
  assert.ok(wrappedTray.y >= wrappedGeometry.height - wrappedTray.height - (wrappedGeometry.radius * 0.3) - 10, 'the wrapped tray is bottom anchored');
  assert.strictEqual(game.__test.wrappedFideChessPuzzleTrayOverlayActive(nQueens), true);
  assert.strictEqual(game.__test.glueHoverInteractionAvailable(nQueens.preset), false, 'wrapped seams are not cursor affordances');
  game.__test.setWrappedViewPreferences({ torus: 'usual' });
  assert.strictEqual(game.__test.wrappedFideChessPuzzleTrayOverlayActive(nQueens), false);
  assert.strictEqual(game.__test.glueHoverInteractionAvailable(nQueens.preset), true, 'ordinary glue arrows retain their cursor affordance');
  game.__test.setWrappedViewPreferences(originalWrappedViews);

  const { elements, canvas, calls } = createHeadlessDomHarness();
  elements.get('game-mode-select').value = 'fide-chess';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = 'n-queens-torus-puzzle';
  elements.get('surface-preset-select').listeners.change();
  elements.get('boundary-glue-wrapped-view-mode').value = 'wrapped';
  elements.get('boundary-glue-wrapped-view-mode').listeners.change({ target: elements.get('boundary-glue-wrapped-view-mode') });
  calls.length = 0;
  elements.get('begin-game').listeners.click();
  const collectCalls = calls.filter((call) => call.method === 'fillText' && call.args[0] === 'Collect');
  assert.strictEqual(collectCalls.length, 1, 'wrapped N-Queens paints one Collect control above all chart copies');
  const collectCenter = collectCalls[0].args;
  const [logicalWidth, logicalHeight] = canvas.style.aspectRatio.split('/').map((value) => Number(value.trim()));
  canvas.listeners.click(pointerEvent(
    collectCenter[1] * (288 / logicalWidth),
    collectCenter[2] * (288 / logicalHeight)
  ));
  assert.strictEqual(elements.get('status-line').textContent, 'Puzzle pieces collected', 'the fixed display-space Collect control receives its click');

  elements.get('game-mode-select').value = 'go';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  elements.get('boundary-glue-mode').value = game.BOUNDARY_GLUE_MODES.TORUS;
  elements.get('boundary-glue-mode').listeners.change();
  elements.get('boundary-glue-wrapped-view-mode').value = 'usual';
  elements.get('boundary-glue-wrapped-view-mode').listeners.change({ target: elements.get('boundary-glue-wrapped-view-mode') });
  canvas.listeners.mousemove({ clientX: 57, clientY: 29 });
  assert.strictEqual(canvas.style.cursor, 'help', 'visible ordinary glue arrows retain the help cursor');
  elements.get('boundary-glue-wrapped-view-mode').value = 'wrapped';
  elements.get('boundary-glue-wrapped-view-mode').listeners.change({ target: elements.get('boundary-glue-wrapped-view-mode') });
  canvas.listeners.mousemove({ clientX: 57, clientY: 29 });
  assert.notStrictEqual(canvas.style.cursor, 'help', 'hidden wrapped seams do not expose a help cursor');
  canvas.listeners.click(pointerEvent(57, 29));
  assert.strictEqual(elements.get('canvas-start-overlay').hidden, false, 'a hidden seam no longer consumes setup clicks');
}

function testUniversalBoardDisplayAndCoordinates() {
  assert.deepStrictEqual(
    [0, 7, 8, 24, 25].map((index) => game.goCoordinateFile(index)),
    ['A', 'H', 'J', 'Z', 'AA']
  );
  assert.deepStrictEqual(game.__test.hexCoverOffsetRange, { min: -2, max: 2, step: 0.05, default: 0 });
  assert.deepStrictEqual(game.__test.normalizeHexCoverOffset({ x: 3, y: -3 }), { x: 2, y: -2 });
  assert.deepStrictEqual(game.__test.normalizeHexCoverOffset({ x: 'bad', y: 1.5 }), { x: 0, y: 1.5 });
  const usualStrip = game.createBilliardsState('usual-strip');
  assert.strictEqual(Object.hasOwn(usualStrip.preset, 'wrappedCoverOffset'), false);
  const usualStripGeometry = game.__test.buildGeometry(usualStrip.preset, 1000, 0, 1);
  const usualStripDeck = game.__test.wrappedCoverDescriptor(
    usualStripGeometry,
    usualStrip.preset,
    { x: 'repeat' }
  );
  assert.strictEqual(usualStripDeck.seamDerived, true);
  assert.ok(Math.abs(usualStripDeck.x.x - (5 * Math.sqrt(3) * usualStripGeometry.radius)) < 0.001);
  assert.deepStrictEqual(usualStripDeck.debugOffset, { x: 0, y: 0 });
  const adjustedUsualStripDeck = game.__test.wrappedCoverDescriptor(
    usualStripGeometry,
    usualStrip.preset,
    { x: 'repeat' },
    { x: usualStripGeometry.radius * 0.5, y: -usualStripGeometry.radius * 0.25 }
  );
  assert.deepStrictEqual(
    game.__test.wrappedDeckCopyTransform(adjustedUsualStripDeck, 1, 0),
    {
      x: usualStripDeck.x.x + (usualStripGeometry.radius * 0.5),
      y: -usualStripGeometry.radius * 0.25,
      reflected: false,
      advanceX: usualStripDeck.x.x + (usualStripGeometry.radius * 0.5)
    }
  );
  const usualStripSeam = game.__test.wrappedCoverSeamResidual(usualStripGeometry, usualStrip.preset, usualStripDeck);
  assert.ok(usualStripSeam.max <= usualStripGeometry.radius * 0.0001, 'the derived usual-strip copies meet at every glued edge');
  const goodMobius = game.createConnectFourState('connect-four-hex-good-mobius-strip');
  const goodMobiusGeometry = game.__test.buildGeometry(goodMobius.preset, 1000, 0, 1);
  const goodMobiusDeck = game.__test.wrappedCoverDescriptor(
    goodMobiusGeometry,
    goodMobius.preset,
    { x: 'reflect-y' }
  );
  assert.strictEqual(goodMobiusDeck.seamDerived, true);
  assert.ok(
    game.__test.wrappedCoverSeamResidual(goodMobiusGeometry, goodMobius.preset, goodMobiusDeck).max
      <= goodMobiusGeometry.radius * 0.0001,
    'the good hex Möbius cover uses a fitted glide reflection'
  );
  const goodMobiusPoint = goodMobiusGeometry.cells[0];
  const reflectedCopy = game.__test.wrappedDeckCopyTransform(goodMobiusDeck, 1, 0);
  assert.strictEqual(reflectedCopy.reflected, true);
  assert.deepStrictEqual(
    game.__test.wrappedFundamentalCoordinates(
      reflectedCopy.x + goodMobiusPoint.x,
      reflectedCopy.y - goodMobiusPoint.y,
      goodMobiusGeometry.width,
      goodMobiusGeometry.height,
      goodMobiusDeck
    ),
    { x: goodMobiusPoint.x, y: goodMobiusPoint.y, copyU: 1, copyV: 0 }
  );
  const shiftedTorus = game.createHexState('hex-torus-5-5');
  const shiftedTorusGeometry = game.__test.buildGeometry(shiftedTorus.preset, 1000, 0, 1);
  const shiftedTorusDeck = game.__test.wrappedCoverDescriptor(shiftedTorusGeometry, shiftedTorus.preset, shiftedTorus.preset.wrappedView);
  assert.strictEqual(shiftedTorusDeck.seamDerived, true);
  assert.ok(Math.abs(shiftedTorusDeck.y.x) > 0.001, 'the shifted hex torus retains its skew period');
  assert.ok(game.__test.wrappedCoverSeamResidual(shiftedTorusGeometry, shiftedTorus.preset, shiftedTorusDeck).max <= shiftedTorusGeometry.radius * 0.0001);
  const shiftedPoint = shiftedTorusGeometry.cells[shiftedTorus.preset.cols + 1];
  const shiftedTransform = game.__test.wrappedDeckCopyTransform(shiftedTorusDeck, 1, 1);
  assert.deepStrictEqual(
    game.__test.wrappedFundamentalCoordinates(
      shiftedTransform.x + shiftedPoint.x,
      shiftedTransform.y + shiftedPoint.y,
      shiftedTorusGeometry.width,
      shiftedTorusGeometry.height,
      shiftedTorusDeck
    ),
    { x: shiftedPoint.x, y: shiftedPoint.y, copyU: 1, copyV: 1 }
  );
  const shiftedKlein = game.createHexState('hex-klein-bottle-5-5');
  const shiftedKleinGeometry = game.__test.buildGeometry(shiftedKlein.preset, 1000, 0, 1);
  const shiftedKleinDeck = game.__test.wrappedCoverDescriptor(shiftedKleinGeometry, shiftedKlein.preset, shiftedKlein.preset.wrappedView);
  assert.strictEqual(shiftedKleinDeck.seamDerived, true);
  assert.strictEqual(game.__test.wrappedDeckCopyTransform(shiftedKleinDeck, 0, 1).reflectX, true);
  assert.ok(game.__test.wrappedCoverSeamResidual(shiftedKleinGeometry, shiftedKlein.preset, shiftedKleinDeck).max <= shiftedKleinGeometry.radius * 0.0001);
  const halfGlued = game.createBilliardsState('half-glued');
  const halfGluedGeometry = game.__test.buildGeometry(halfGlued.preset, 1000, 0, 1);
  const halfGluedDeck = game.__test.wrappedCoverDescriptor(halfGluedGeometry, halfGlued.preset, halfGlued.preset.wrappedView);
  assert.strictEqual(halfGluedDeck.seamDerived, true);
  assert.deepStrictEqual(halfGluedDeck.x, { kind: 'repeat', x: halfGluedGeometry.radius * 8, y: -halfGluedGeometry.radius * 4 });
  assert.deepStrictEqual(halfGluedDeck.y, { x: halfGluedGeometry.radius * 4, y: halfGluedGeometry.radius * 8 });
  assert.ok(game.__test.wrappedCoverSeamResidual(halfGluedGeometry, halfGlued.preset, halfGluedDeck).max <= halfGluedGeometry.radius * 0.0001);
  const compatibleSquare = game.createGameState('between-two-fires');
  const compatibleSquareGeometry = game.__test.buildGeometry(compatibleSquare.preset, 1000, 0, 1);
  assert.strictEqual(
    game.__test.wrappedCoverDescriptor(compatibleSquareGeometry, compatibleSquare.preset, compatibleSquare.preset.wrappedView).seamDerived,
    false,
    'established square covers retain their rectangular compatibility placement'
  );
  const classicHex = game.createHexState('classic-hex');
  assert.strictEqual(game.__test.wrappedHexCutoutMode(classicHex, true), true);
  assert.strictEqual(game.__test.wrappedHexCutoutMode(classicHex, false), false);
  const firstClassicCutout = [...classicHex.removed][0];
  assert.strictEqual(game.__test.backgroundBoundarySourceEnabled(firstClassicCutout, new Set(), classicHex.removed), false);
  assert.strictEqual(game.__test.backgroundBoundarySourceEnabled(1, new Set(), classicHex.removed), true);
  assert.strictEqual(game.placeHexTile(classicHex, [...classicHex.removed][0]).changed, false, 'the visual cutout remains illegal');
  assert.strictEqual(game.__test.wrappedHexGlueContextOverlayActive(classicHex, true), true);
  assert.strictEqual(game.__test.wrappedHexGlueContextOverlayActive(classicHex, false), false);
  assert.strictEqual(game.__test.wrappedHexGlueContextOverlayActive(usualStrip, true), false);
  [
    [classicHex, 46],
    [shiftedTorus, 19],
    [shiftedKlein, 19]
  ].forEach(([state, sourceIndex]) => {
    const geom = game.__test.buildGeometry(state.preset, 1000, 0, 1);
    const deck = game.__test.wrappedCoverDescriptor(geom, state.preset, state.preset.wrappedView);
    const transform = game.__test.wrappedDeckCopyTransform(deck, -2, -2);
    const source = geom.cells[sourceIndex];
    const world = {
      x: transform.reflectX ? transform.x - source.x : transform.x + source.x,
      y: transform.reflected ? transform.y - source.y : transform.y + source.y
    };
    const target = game.__test.wrappedTileCandidateAtWorldPoint(geom, state, deck, world);
    assert.strictEqual(target.index, sourceIndex, `${state.preset.id} resolves a visible live chart beneath a cutout`);
    assert.strictEqual(target.copyU, -2);
    assert.strictEqual(target.copyV, -2);
  });
  const rectangularDeck = game.__test.wrappedCoverDescriptor(
    { width: 100, height: 80, lattice: { shape: 'square' } },
    { gluedEdges: [] },
    { x: 'repeat', y: 'repeat' }
  );
  assert.deepStrictEqual(rectangularDeck.x, { kind: 'repeat', x: 100, y: 0 });
  assert.deepStrictEqual(rectangularDeck.y, { x: 0, y: 80 });
  assert.deepStrictEqual(
    game.__test.wrappedDeckCopyTransform({ x: 'repeat' }, 2, 0, 100, 80, { x: 5, y: 7 }),
    { x: 210, y: 14, reflected: false, advanceX: 105 }
  );
  assert.deepStrictEqual(
    game.__test.wrappedDeckCopyTransform({ x: 'reflect-y' }, 1, 0, 100, 80, { x: 5, y: 7 }),
    { x: 105, y: 87, reflected: true, advanceX: 105 }
  );
  assert.deepStrictEqual(
    game.__test.wrappedDeckCopyTransform({ x: 'reflect-y' }, 2, 0, 100, 80, { x: 5, y: 7 }),
    { x: 210, y: 0, reflected: false, advanceX: 105 }
  );
  assert.deepStrictEqual(
    game.__test.wrappedFundamentalCoordinates(217, 16, 100, 80, { x: 'repeat' }, { x: 5, y: 7 }),
    { x: 7, y: 2, copyU: 2, copyV: 0 }
  );
  assert.deepStrictEqual(
    game.__test.wrappedFundamentalCoordinates(112, 85, 100, 80, { x: 'reflect-y' }, { x: 5, y: 7 }),
    { x: 7, y: 2, copyU: 1, copyV: 0 }
  );
  const { elements, calls } = createHeadlessDomHarness();
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.ok(elements.get('display-card-body').children.includes(elements.get('gomoku-display-row')));
  assert.ok(elements.get('display-card-body').children.includes(elements.get('boundary-glue-wrapped-view-row')));
  assert.strictEqual(elements.get('show-board-coordinates').checked, false);
  importHeadlessStatus(elements, {
    gameMode: 'go',
    preset: {
      label: 'coordinate square', lattice: 'square', rows: 4, cols: 4, surface: 'test',
      removedTiles: [{ row: 1, col: 1 }], cutEdges: [], gluedEdges: []
    },
    phase: 'ready', turn: 'black', round: 0, nextStoneId: 1,
    stones: [], removed: [{ row: 1, col: 1 }], queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  calls.length = 0;
  elements.get('gomoku-display-style').value = 'vertex';
  elements.get('show-board-coordinates').checked = true;
  elements.get('show-board-coordinates').listeners.change();
  const squareLabels = calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]);
  assert.ok(squareLabels.includes('A'));
  assert.ok(squareLabels.includes('D'));
  assert.ok(squareLabels.includes('1'));
  assert.ok(squareLabels.includes('4'));
  const griddedSquareFileA = calls.filter((call) => call.method === 'fillText' && call.args[0] === 'A');
  const griddedSquareRankFour = calls.filter((call) => call.method === 'fillText' && call.args[0] === '4');
  assert.strictEqual(griddedSquareFileA.length, 2);
  assert.strictEqual(griddedSquareRankFour.length, 2);
  elements.get('gomoku-display-style').value = 'center';
  calls.length = 0;
  elements.get('gomoku-display-style').listeners.change();
  const tileSquareFileA = calls.filter((call) => call.method === 'fillText' && call.args[0] === 'A');
  const tileSquareRankFour = calls.filter((call) => call.method === 'fillText' && call.args[0] === '4');
  assert.ok(griddedSquareFileA[0].args[2] > tileSquareFileA[0].args[2], 'a gridded file label follows its first visible tile');
  assert.deepStrictEqual(griddedSquareFileA[1].args.slice(1), tileSquareFileA[1].args.slice(1), 'an unchanged file endpoint stays in place');
  assert.ok(griddedSquareRankFour[0].args[1] > tileSquareRankFour[0].args[1], 'a gridded rank label follows its first visible tile');
  assert.deepStrictEqual(griddedSquareRankFour[1].args.slice(1), tileSquareRankFour[1].args.slice(1), 'an unchanged rank endpoint stays in place');
  elements.get('gomoku-display-style').value = 'polished-vertex';
  calls.length = 0;
  elements.get('gomoku-display-style').listeners.change();
  const polishedSquareFileA = calls.filter((call) => call.method === 'fillText' && call.args[0] === 'A');
  assert.ok(polishedSquareFileA[0].args[2] > tileSquareFileA[0].args[2], 'the polished gridded display also follows visible file endpoints');
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.settings.showBoardCoordinates, true);

  calls.length = 0;
  importHeadlessStatus(elements, {
    gameMode: 'go',
    preset: {
      label: 'coordinate square with empty axes', lattice: 'square', rows: 4, cols: 4, surface: 'test',
      removedTiles: [
        { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
        { row: 2, col: 3 }, { row: 3, col: 3 }, { row: 4, col: 3 }
      ],
      cutEdges: [], gluedEdges: []
    },
    phase: 'ready', turn: 'black', round: 0, nextStoneId: 1,
    stones: [],
    removed: [
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 2, col: 3 }, { row: 3, col: 3 }, { row: 4, col: 3 }
    ],
    settings: { showBoardCoordinates: true }, queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  const emptyAxisLabels = calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]);
  assert.ok(!emptyAxisLabels.includes('C'), 'a fully removed square file has no labels in the gridded display');
  assert.ok(!emptyAxisLabels.includes('4'), 'a fully removed square rank has no labels in the gridded display');

  calls.length = 0;
  importHeadlessStatus(elements, {
    gameMode: 'go',
    preset: {
      label: 'coordinate hex', lattice: 'hexagonal', rows: 4, cols: 4, surface: 'test',
      removedTiles: [{ row: 3, col: 1 }], cutEdges: [{ left: { row: 1, col: 1 }, right: { row: 1, col: 2 } }],
      gluedEdges: [{ first: { row: 3, col: 1, dir: game.HEX_DIRS.NW }, second: { row: 4, col: 1, dir: game.HEX_DIRS.SE } }]
    },
    phase: 'ready', turn: 'black', round: 0, nextStoneId: 1,
    stones: [], removed: [{ row: 3, col: 1 }], settings: { showBoardCoordinates: true }, queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  const hexFileLabels = calls.filter((call) => call.method === 'fillText' && /^[A-Z]+$/.test(call.args[0]));
  assert.deepStrictEqual(hexFileLabels.map((call) => call.args[0]), ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E', 'E']);
  assert.strictEqual(hexFileLabels.filter((call) => call.args[0] === 'A').length, 2, 'the black q_1 file stays labelled at both of its glued boundary edges');
  const hexRotations = calls.filter((call) => call.method === 'rotate').map((call) => call.args[0]);
  assert.deepStrictEqual(hexRotations, Array(10).fill(-Math.PI / 6));
  const hexTranslations = calls.filter((call) => call.method === 'translate').map((call) => call.args);
  assert.strictEqual(hexTranslations.length, 10);
  assert.ok(hexTranslations.every(([x, y]) => x !== 0 || y !== 0), 'hex file labels are translated from the canvas origin');
  elements.get('gomoku-display-style').value = 'center';
  calls.length = 0;
  elements.get('gomoku-display-style').listeners.change();
  const tileHexTranslations = calls.filter((call) => call.method === 'translate').map((call) => call.args);
  assert.strictEqual(tileHexTranslations.length, 10);
  assert.ok(hexTranslations[0][1] > tileHexTranslations[0][1], 'a gridded hex q-file label follows its first visible tile');
  assert.deepStrictEqual(hexTranslations[1], tileHexTranslations[1], 'an unchanged hex q-file endpoint stays in place');
  const hexLabels = calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]);
  assert.ok(hexLabels.includes('1'));
  assert.ok(hexLabels.includes('4'));
  assert.ok(!hexLabels.some((label) => /^[qr]-?\d+$/.test(label)));

  elements.get('gomoku-display-style').value = 'vertex';
  calls.length = 0;
  elements.get('gomoku-display-style').listeners.change();
  calls.length = 0;
  importHeadlessStatus(elements, {
    gameMode: 'go',
    preset: {
      label: 'coordinate hex with empty q-file', lattice: 'hexagonal', rows: 4, cols: 4, surface: 'test',
      removedTiles: [{ row: 3, col: 1 }, { row: 4, col: 1 }], cutEdges: [],
      gluedEdges: [{ first: { row: 3, col: 1, dir: game.HEX_DIRS.NW }, second: { row: 4, col: 1, dir: game.HEX_DIRS.SE } }]
    },
    phase: 'ready', turn: 'black', round: 0, nextStoneId: 1,
    stones: [], removed: [{ row: 3, col: 1 }, { row: 4, col: 1 }], settings: { showBoardCoordinates: true }, queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  const emptyHexFileLabels = calls.filter((call) => call.method === 'fillText').map((call) => call.args[0]);
  assert.ok(!emptyHexFileLabels.includes('A'), 'a fully removed hex q-file has no labels in the gridded display');

  elements.get('game-mode-select').value = '2048';
  elements.get('game-mode-select').listeners.change();
  elements.get('gomoku-display-style').value = 'vertex';
  calls.length = 0;
  elements.get('gomoku-display-style').listeners.change();
  assert.ok(calls.some((call) => call.method === 'lineTo'), 'the gridded style must render for 2048 too');
}

function testSwipeIgnoredOutsideAccepting2048() {
  let harness = createHeadlessDomHarness();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '0');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');

  harness = createHeadlessDomHarness();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: right');
  swipeCanvas(harness.canvas, 80, 40, 40, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-line').textContent, 'round 1: right');

  harness = createHeadlessDomHarness({ stepMode: true });
  harness.elements.get('begin-game').listeners.click();
  enableHeadlessDebug(harness.elements);
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  swipeCanvas(harness.canvas, 80, 40, 40, 40);
  assert.strictEqual(harness.elements.get('round-value').textContent, '1');
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'step');

  harness = createHeadlessDomHarness();
  importHeadlessStatus(harness.elements, {
    preset: { label: 'over', lattice: 'square', rows: 4, cols: 4, surface: 'over' },
    phase: 'gameover',
    ending: 'bonus',
    round: 5,
    score: 0,
    nextBoxId: 1,
    boxes: [],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  let exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.round, 5);

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'gomoku';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(exported.round, 0);

  harness = createHeadlessDomHarness();
  harness.elements.get('game-mode-select').value = 'connect-four';
  harness.elements.get('game-mode-select').listeners.change();
  harness.elements.get('begin-game').listeners.click();
  swipeCanvas(harness.canvas, 40, 40, 80, 40);
  harness.elements.get('export-state').listeners.click();
  exported = JSON.parse(harness.elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.tokens.length, 0);
  assert.strictEqual(exported.round, 0);
}

function testHexSwipeDirections() {
  [
    ['east', 36, 0],
    ['southeast', 24, 36],
    ['southwest', -24, 36],
    ['west', -36, 0],
    ['northwest', -24, -36],
    ['northeast', 24, -36]
  ].forEach(([label, dx, dy]) => {
    const { elements, canvas } = createHeadlessDomHarness();
    importHeadlessStatus(elements, singleHexBoxStatus());
    swipeCanvas(canvas, 100, 100, 100 + dx, 100 + dy);
    assert.strictEqual(elements.get('status-line').textContent, `round 1: ${label}`);
  });
}

function testDynamicPresetCatalogOptions() {
  const { elements } = createHeadlessDomHarness();
  const gameSelect = elements.get('game-mode-select');
  const select = elements.get('surface-preset-select');
  assert.deepStrictEqual(
    gameSelect.options.map((option) => option.value),
    ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban', game.RANDOM_GAME_MODE_CHOICE_ID]
  );
  assert.deepStrictEqual(game.orderedCatalogGameModes(), ['gomoku', 'go', 'connect-four', '2048', 'reversi', 'chinese-checkers', 'sokoban']);
  assert.strictEqual(select.disabled, false);
  assert.strictEqual(select.value, 'ramified-cover');
  assert.strictEqual(select.options[0].value, game.RANDOM_PRESET_CHOICE_ID);
  assert.strictEqual(select.options[0].textContent, 'Random preset');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['2048']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID && option.textContent === 'boundary glue board'));
  assert.ok(select.options.some((option) => option.value === 'ramified-cover'));
  assert.ok(!select.options.some((option) => ['torus', 'klein-bottle', 'gomoku-classic', 'gomoku-random-glue'].includes(option.value)));
  assert.ok(!select.options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!select.options.some((option) => option.value === 'import-preset'));
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-shape-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode').value, 'torus');
  assert.strictEqual(elements.get('gomoku-board-size').value, '5');

  gameSelect.value = 'gomoku';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Gomoku']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'gomoku-small-holes'));
  assert.ok(!select.options.some((option) => ['torus', 'gomoku-classic', 'gomoku-random-glue'].includes(option.value)));
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, false);
  elements.get('boundary-glue-shape').value = 'rectangle';
  elements.get('boundary-glue-shape').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, false);
  elements.get('boundary-glue-rows').value = '8';
  elements.get('boundary-glue-cols').value = '11';
  elements.get('boundary-glue-rows').listeners.change();
  let exported = null;
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.preset.rows, 8);
  assert.strictEqual(exported.preset.cols, 11);
  elements.get('boundary-glue-shape').value = 'square';
  elements.get('boundary-glue-shape').listeners.change();
  assert.strictEqual(elements.get('boundary-glue-rect-row').hidden, true);

  gameSelect.value = 'connect-four';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'connect-four-exchange');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Connect Four']
  );
  assert.ok(select.options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);

  gameSelect.value = 'go';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'three-slits');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Go']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'three-slits'));
  assert.strictEqual(elements.get('go-komi-row').hidden, false);
  assert.strictEqual(elements.get('go-action-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-board-size').value, '19');

  gameSelect.value = 'reversi';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'focus-frame');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Reversi']
  );
  assert.ok(select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(select.options.some((option) => option.value === 'focus-frame'));
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-board-size').value, '10');
  assert.strictEqual(elements.get('go-komi-row').hidden, true);

  gameSelect.value = 'chinese-checkers';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'octahedron-with-square-holes');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Chinese Checkers']
  );
  assert.ok(select.options.some((option) => option.value === 'octahedron-with-square-holes'));
  assert.ok(!select.options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!select.options.some((option) => option.value === 'gomoku-classic'));

  gameSelect.value = 'sokoban';
  gameSelect.listeners.change();
  assert.strictEqual(select.value, 'sokoban-square');
  assert.deepStrictEqual(
    select.children.filter((child) => child.tagName === 'OPTGROUP').map((child) => child.label),
    ['Sokoban']
  );
  assert.strictEqual(elements.get('sokoban-object-size').value, '70');
  assert.strictEqual(elements.get('sokoban-object-size-value').textContent, '70%');
  assert.strictEqual(elements.get('sokoban-object-size-row').hidden, false);
  assert.strictEqual(elements.get('sokoban-glow-inner-value').textContent, '55%');
  assert.strictEqual(elements.get('sokoban-glow-outer-value').textContent, '82%');
  assert.strictEqual(elements.get('sokoban-glow-blur-value').textContent, '38%');
  assert.strictEqual(elements.get('sokoban-beam-width-value').textContent, '70%');
  assert.strictEqual(elements.get('sokoban-beam-opacity-value').textContent, '34%');
  assert.strictEqual(elements.get('sokoban-glow-inner-row').hidden, false);
  assert.strictEqual(elements.get('sokoban-beam-width-row').hidden, false);
}

async function testChineseCheckersLazyPresetModeSwitch() {
  const harness = createHeadlessDomHarness({
    preloadPresetData: false,
    loadLazyPresetScripts: true
  });
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  const modeSelect = harness.elements.get('game-mode-select');
  modeSelect.value = 'chinese-checkers';
  modeSelect.listeners.change();
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  const localGame = harness.context.module.exports;
  assert.strictEqual(harness.elements.get('surface-preset-select').value, 'octahedron-with-square-holes');
  assert.ok(
    harness.elements.get('chinese-checkers-player-options').querySelectorAll('input[type=checkbox]').length > 0,
    'Chinese Checkers player options are populated after the lazy preset loads'
  );

  harness.elements.get('begin-game').listeners.click();
  const state = localGame.__test.getGame();
  assert.strictEqual(state.gameMode, 'chinese-checkers');
  assert.strictEqual(state.phase, 'ready');
  const marble = state.marbles.find((item) => item.color === state.turn);
  const target = localGame.chineseCheckerMoveMap(state, marble.index).keys().next().value;
  const move = localGame.placeChineseCheckerMarble(state, marble.index, target);
  assert.strictEqual(move.changed, true, 'a started lazy-loaded Chinese Checkers game accepts its opening move');
}

function testRandomSetupAndPresetOptions() {
  const firstSokobanPreset = game.randomPresetForMode('sokoban', () => 0);
  const middleSokobanPreset = game.randomPresetForMode('sokoban', () => 0.5);
  assert.ok(firstSokobanPreset);
  assert.ok(middleSokobanPreset);
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === firstSokobanPreset.id), 'sokoban'));
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === middleSokobanPreset.id), 'sokoban'));

  let rolls = [0.99, 0];
  const choice = game.randomSetupChoice(() => rolls.shift());
  assert.strictEqual(choice.mode, 'sokoban');
  assert.strictEqual(choice.preset.id, firstSokobanPreset.id);

  let harness = createHeadlessDomHarness({ randoms: [0.99, 0] });
  let gameSelect = harness.elements.get('game-mode-select');
  let presetSelect = harness.elements.get('surface-preset-select');
  assert.strictEqual(gameSelect.value, 'sokoban');
  assert.strictEqual(presetSelect.value, firstSokobanPreset.id);
  assert.strictEqual(harness.elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(harness.elements.get('begin-game').textContent, 'begin the game');

  harness = createHeadlessDomHarness({ randoms: [0.5, 0.5, 0.99, 0] });
  gameSelect = harness.elements.get('game-mode-select');
  presetSelect = harness.elements.get('surface-preset-select');
  gameSelect.value = game.RANDOM_GAME_MODE_CHOICE_ID;
  gameSelect.listeners.change();
  assert.strictEqual(gameSelect.value, 'sokoban');
  assert.strictEqual(presetSelect.value, firstSokobanPreset.id);
  assert.ok(![game.RANDOM_GAME_MODE_CHOICE_ID, game.RANDOM_PRESET_CHOICE_ID].includes(gameSelect.value));
  assert.ok(![game.RANDOM_GAME_MODE_CHOICE_ID, game.RANDOM_PRESET_CHOICE_ID].includes(presetSelect.value));

  harness = createHeadlessDomHarness({ randoms: [0.5, 0.5, 0.999] });
  gameSelect = harness.elements.get('game-mode-select');
  presetSelect = harness.elements.get('surface-preset-select');
  gameSelect.value = 'connect-four';
  gameSelect.listeners.change();
  presetSelect.value = game.RANDOM_PRESET_CHOICE_ID;
  presetSelect.listeners.change();
  assert.strictEqual(gameSelect.value, 'connect-four');
  assert.ok(registryEntrySupportsMode(presetRegistry.find((preset) => preset.id === presetSelect.value), 'connect-four'));
  assert.notStrictEqual(presetSelect.value, game.RANDOM_PRESET_CHOICE_ID);

  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const importGameStart = html.indexOf('id="import-game-mode"');
  const importGameEnd = html.indexOf('id="import-preset-source"', importGameStart);
  assert.ok(importGameStart >= 0 && importGameEnd > importGameStart);
  assert.ok(!html.slice(importGameStart, importGameEnd).includes(game.RANDOM_GAME_MODE_CHOICE_ID));
}

function testImportExportCardDefaultsAndCatalogImport() {
  const { elements } = createHeadlessDomHarness();
  assert.strictEqual(elements.get('import-game-mode').value, '2048');
  assert.strictEqual(elements.get('import-keep-game-mode').checked, true);
  assert.strictEqual(elements.get('import-preset-source').value, 'catalog');
  assert.strictEqual(elements.get('import-preset-catalog-row').hidden, false);
  assert.strictEqual(elements.get('import-preset-input').hidden, true);
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'classic-4x4'));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'connect-four-6x7'));

  elements.get('import-game-mode').value = 'connect-four';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'connect-four-6x7'));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'classic-4x4'));
  elements.get('import-preset-catalog').value = 'connect-four-6x7';
  elements.get('import-keep-game-mode').checked = false;
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('game-mode-select').value, 'connect-four');
  assert.strictEqual(elements.get('surface-preset-select').value, 'connect-four-6x7');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported');

  elements.get('import-game-mode').value = 'go';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'gomoku-classic'));

  elements.get('import-game-mode').value = 'reversi';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === game.BOUNDARY_GLUE_BOARD_PRESET_ID));
  assert.ok(!elements.get('import-preset-catalog').options.some((option) => option.value === 'gomoku-classic'));

  elements.get('import-game-mode').value = 'chinese-checkers';
  elements.get('import-game-mode').listeners.change();
  assert.ok(elements.get('import-preset-catalog').options.some((option) => option.value === 'chinese-checkers-hex-rhombus-9x9'));
}

function testImportExportCardPastedPresetMode() {
  const { elements } = createHeadlessDomHarness();
  elements.get('import-keep-game-mode').checked = false;
  elements.get('import-game-mode').value = 'gomoku';
  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  assert.strictEqual(elements.get('import-preset-catalog-row').hidden, true);
  assert.strictEqual(elements.get('import-preset-input').hidden, false);
  elements.get('import-preset-input').value = JSON.stringify({
    id: 'paste-test',
    label: 'Pasted Test',
    lattice: 'square',
    size: '5x5',
    surface: 'paste surface'
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('game-mode-select').value, 'gomoku');
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.ok(elements.get('surface-preset-select').options.some((option) => (
    option.value === 'imported-preset' && option.textContent === 'Pasted Test'
  )));
  elements.get('export-state-kind').value = 'status';
  elements.get('export-state').listeners.click();
  const exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.preset.gameTypes, undefined);
  assert.strictEqual(exported.preset.group, undefined);
  assert.strictEqual(exported.preset.groups, undefined);
}

function testNewPlacementGameStatusRoundTrips() {
  let harness = createHeadlessDomHarness();
  let { elements } = harness;
  elements.get('game-mode-select').value = 'go';
  elements.get('game-mode-select').listeners.change();
  elements.get('go-komi').value = '7.5';
  elements.get('go-komi').listeners.change();
  elements.get('begin-game').listeners.click();
  elements.get('go-pass').listeners.click();
  elements.get('go-pass').listeners.click();
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'go');
  assert.strictEqual(exported.komi, 7.5);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.winner, 'white');
  assert.ok(exported.finalScore);

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('debug-export-output').value = JSON.stringify(exported);
  elements.get('import-state').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'go');
  assert.strictEqual(exported.komi, 7.5);
  assert.strictEqual(elements.get('go-komi').value, '7.5');

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('game-mode-select').value = 'reversi';
  elements.get('game-mode-select').listeners.change();
  elements.get('begin-game').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'reversi');
  assert.strictEqual(exported.preset.rows, 8);
  assert.strictEqual(exported.discs.length, 4);

  harness = createHeadlessDomHarness();
  elements = harness.elements;
  elements.get('game-mode-select').value = 'chinese-checkers';
  elements.get('game-mode-select').listeners.change();
  assert.strictEqual(elements.get('chinese-checkers-jump-rule').disabled, false);
  elements.get('chinese-checkers-jump-rule').value = 'adjacent-or-two';
  elements.get('chinese-checkers-jump-rule').listeners.change();
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('chinese-checkers-jump-rule').disabled, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'chinese-checkers');
  assert.strictEqual(exported.jumpRule, 'adjacent-or-two');
  assert.strictEqual(exported.marbles.length, 8);
  assert.strictEqual(exported.camps.starts.red.length, 4);
  assert.strictEqual(exported.preset.pieceSets.targets.red.length, 4);
  assert.deepStrictEqual(exported.winningLine, []);

  elements.get('debug-export-output').value = JSON.stringify(exported);
  elements.get('import-state').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.jumpRule, 'adjacent-or-two');

  exported.winningLine = [0, 1, 2];
  elements.get('debug-export-output').value = JSON.stringify(exported);
  elements.get('import-state').listeners.click();
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.winningLine, []);
}

function testNewPlacementGameAnimationsStartFromUi() {
  const cellClick = (row, col) => ({
    clientX: 57 + ((col - 1) * 58),
    clientY: 57 + ((row - 1) * 58)
  });

  let harness = createHeadlessDomHarness();
  let { elements, canvas, calls } = harness;
  importHeadlessStatus(elements, {
    gameMode: 'reversi',
    preset: {
      id: 'ui-reversi-animation',
      label: 'ui reversi animation',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'ui reversi',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    phase: 'ready',
    round: 0,
    turn: 'black',
    discs: [
      { id: 1, row: 1, col: 1, color: 'black' },
      { id: 2, row: 2, col: 2, color: 'white' }
    ]
  });
  calls.length = 0;
  canvas.listeners.click(cellClick(3, 3));
  assert.ok(calls.some((call) => call.method === 'requestAnimationFrame'));

  harness = createHeadlessDomHarness();
  ({ elements, canvas, calls } = harness);
  importHeadlessStatus(elements, {
    gameMode: 'chinese-checkers',
    preset: {
      id: 'ui-checkers-animation',
      label: 'ui checkers animation',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'ui checkers',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      chineseCheckersPlayers: ['red', 'yellow'],
      pieceSets: {
        starts: {
          red: [{ row: 1, col: 1 }],
          yellow: [{ row: 1, col: 2 }]
        },
        targets: {
          red: [{ row: 1, col: 3 }],
          yellow: [{ row: 4, col: 4 }]
        }
      }
    },
    phase: 'ready',
    round: 0,
    turn: 'red',
    camps: {
      starts: {
        red: [{ row: 1, col: 1 }],
        yellow: [{ row: 1, col: 2 }]
      },
      targets: {
        red: [{ row: 1, col: 3 }],
        yellow: [{ row: 4, col: 4 }]
      }
    },
    marbles: [
      { id: 1, row: 1, col: 1, color: 'red' },
      { id: 2, row: 1, col: 2, color: 'yellow' }
    ]
  });
  canvas.listeners.click(cellClick(1, 1));
  calls.length = 0;
  canvas.listeners.click(cellClick(1, 3));
  assert.ok(calls.some((call) => call.method === 'requestAnimationFrame'));
}

function testUnifiedLocalResultCard() {
  const { elements } = createHeadlessDomHarness();
  elements.get('debug-export-output').value = JSON.stringify({
    gameMode: 'gomoku',
    preset: {
      id: 'result-card-gomoku',
      label: 'result card Gomoku',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'result card',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: []
    },
    phase: 'gameover',
    ending: 'gomoku-win',
    round: 5,
    turn: 'black',
    winner: 'black',
    resultDismissed: true,
    winningLine: [0, 1, 2, 3],
    stones: [
      { id: 1, row: 1, col: 1, color: 'black' },
      { id: 2, row: 2, col: 1, color: 'white' },
      { id: 3, row: 1, col: 2, color: 'black' },
      { id: 4, row: 2, col: 2, color: 'white' },
      { id: 5, row: 1, col: 3, color: 'black' },
      { id: 6, row: 2, col: 3, color: 'white' },
      { id: 7, row: 1, col: 4, color: 'black' }
    ]
  });
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('canvas-start-overlay').hidden, false);
  assert.strictEqual(elements.get('canvas-start-title').textContent, 'black wins');
  assert.strictEqual(elements.get('canvas-start-context').textContent, '5 moves');
  assert.strictEqual(elements.get('canvas-start-begin').textContent, 'play again');
  assert.strictEqual(elements.get('canvas-start-close').hidden, false);
  elements.get('canvas-start-close').listeners.click();
  assert.strictEqual(elements.get('canvas-start-overlay').hidden, true);
  elements.get('export-state').listeners.click();
  const afterClose = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(afterClose.phase, 'gameover');
  assert.strictEqual(afterClose.stones.length, 7);
  assert.strictEqual(afterClose.resultDismissed, true);
}

function testConnectFourResultCardAppearsAfterDropAnimation() {
  const harness = createHeadlessDomHarness();
  const { elements, canvas, advanceTimers } = harness;
  elements.get('debug-export-output').value = JSON.stringify({
    gameMode: 'connect-four',
    preset: {
      id: 'result-card-connect-four',
      label: 'result card Connect Four',
      lattice: 'square',
      rows: 6,
      cols: 7,
      surface: 'result card',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      connectFourHoles: [
        { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
        { row: 1, col: 5 }, { row: 1, col: 6 }, { row: 1, col: 7 }
      ]
    },
    phase: 'ready',
    round: 6,
    turn: 'red',
    fallDirName: 'S',
    holes: [
      { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 },
      { row: 1, col: 5 }, { row: 1, col: 6 }, { row: 1, col: 7 }
    ],
    tokens: [
      { id: 1, row: 6, col: 1, color: 'red' }, { id: 2, row: 5, col: 1, color: 'yellow' },
      { id: 3, row: 6, col: 2, color: 'red' }, { id: 4, row: 5, col: 2, color: 'yellow' },
      { id: 5, row: 6, col: 3, color: 'red' }, { id: 6, row: 5, col: 3, color: 'yellow' }
    ]
  });
  elements.get('import-state').listeners.click();
  canvas.listeners.click({ clientX: 159, clientY: 41 });
  assert.strictEqual(elements.get('status-line').textContent, 'red wins');
  assert.strictEqual(elements.get('canvas-start-overlay').hidden, true);
  advanceTimers(1000);
  assert.strictEqual(elements.get('canvas-start-overlay').hidden, false);
  assert.strictEqual(elements.get('canvas-start-title').textContent, 'red wins');
  assert.strictEqual(elements.get('canvas-start-begin').textContent, 'play again');
  elements.get('canvas-start-begin').listeners.click();
  elements.get('export-state').listeners.click();
  const restarted = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(restarted.phase, 'ready');
  assert.strictEqual(restarted.fallDirName, 'S');
  assert.strictEqual(restarted.holes.length, 7);
}

function testBackgroundExportFormats() {
  const { elements } = createHeadlessDomHarness();
  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  elements.get('surface-preset-select').value = 'connect-four-6x7';
  elements.get('surface-preset-select').listeners.change();
  elements.get('export-state-kind').value = 'background';
  elements.get('export-state-kind').listeners.change();
  assert.strictEqual(elements.get('export-background-format-row').hidden, false);

  elements.get('export-background-format').value = 'dsl';
  elements.get('export-state').listeners.click();
  const compact = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(compact.size, '6x7');
  assert.strictEqual(compact.gameTypes, undefined);
  assert.strictEqual(compact.group, undefined);
  assert.strictEqual(compact.groups, undefined);
  assert.strictEqual(compact.holes, 'top');
  assert.strictEqual(game.normalizePresetPayload(compact).connectFourHoles.length, 7);

  elements.get('export-background-format').value = 'verbose';
  elements.get('export-state').listeners.click();
  const verbose = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(verbose.rows, 6);
  assert.strictEqual(verbose.cols, 7);
  assert.strictEqual(verbose.gameTypes, undefined);
  assert.strictEqual(verbose.group, undefined);
  assert.strictEqual(verbose.groups, undefined);
  assert.strictEqual(verbose.connectFourHoles.length, 7);
  assert.strictEqual(verbose.tokens, undefined);
  assert.strictEqual(verbose.boxes, undefined);
}

function testFullStatusImportWithoutDebugMode() {
  const { elements } = createHeadlessDomHarness();
  assert.notStrictEqual(elements.get('debug-toggle').attributes['aria-pressed'], 'true');
  assert.strictEqual(elements.get('import-state').disabled, false);
  elements.get('debug-export-output').value = JSON.stringify({
    gameMode: '2048',
    preset: {
      label: 'status no debug',
      group: '2048',
      lattice: 'square',
      rows: 2,
      cols: 2,
      surface: 'status surface'
    },
    phase: 'ready',
    round: 3,
    score: 8,
    nextBoxId: 2,
    boxes: [{ id: 1, row: 1, col: 1, value: 8 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('round-value').textContent, '3');
  assert.strictEqual(elements.get('score-value').textContent, '8');
}

function testHeadlessDomStepControls() {
  const source = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const elements = new Map();
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      target[prop] = (...args) => {
        calls.push({ method: prop, args });
      };
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
  const wrap = makeElement('canvas-wrap', { clientWidth: 720 });
  const moveButtons = [makeMoveButton('N'), makeMoveButton('W'), makeMoveButton('E'), makeMoveButton('S')];
  const mode2048Controls = [
    makeElement('box-ui-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('new-boxes-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('speed-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('step-mode-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('debug-tile-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('debug-bomb-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('bomb-art-row', { attributes: { 'data-mode-control': '2048' } }),
    makeElement('move-row', { attributes: { 'data-mode-control': '2048' } })
  ];
  const modeGomokuControls = [
    makeElement('gomoku-size-row', { hidden: true, attributes: { 'data-mode-control': 'gomoku' } }),
    makeElement('gomoku-display-row', { hidden: true, attributes: { 'data-mode-control': 'gomoku' } })
  ];
  const modeConnectFourControls = [
    makeElement('connect-four-fall-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } }),
    makeElement('connect-four-align-row', { hidden: true, attributes: { 'data-mode-control': 'connect-four' } })
  ];
  const modeGoControls = [
    makeElement('go-komi-row', { hidden: true, attributes: { 'data-mode-control': 'go' } }),
    makeElement('go-action-row', { hidden: true, attributes: { 'data-mode-control': 'go' } })
  ];
  const canvas = makeElement('mosaic-canvas', {
    parentElement: wrap,
    getContext() {
      return ctx;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 288, height: 288 };
    }
  });
  [
    canvas,
    makeElement('game-mode-select', { value: '2048' }),
    makeElement('surface-preset-select', { value: game.BOUNDARY_GLUE_BOARD_PRESET_ID }),
    makeElement('import-preset-tools'),
    makeElement('import-keep-game-mode', { checked: true }),
    makeElement('import-game-mode', { value: '2048' }),
    makeElement('import-preset-source', { value: 'catalog' }),
    makeElement('import-preset-catalog-row'),
    makeElement('import-preset-catalog'),
    makeElement('import-preset-input'),
    makeElement('apply-import-preset'),
    makeElement('boundary-glue-mode-row', { hidden: true }),
    makeElement('boundary-glue-mode', { value: 'torus' }),
    makeElement('boundary-glue-shape-row', { hidden: true }),
    makeElement('boundary-glue-shape', { value: 'square' }),
    makeElement('boundary-glue-rect-row', { hidden: true }),
    makeElement('boundary-glue-rows', { value: '4' }),
    makeElement('boundary-glue-cols', { value: '4' }),
    makeElement('gomoku-board-size', { value: '15' }),
    makeElement('gomoku-display-style', { value: 'vertex' }),
    makeElement('go-komi', { value: '6.5' }),
    makeElement('go-pass'),
    makeElement('connect-four-fall-dir', {
      value: 'S',
      options: ['S', 'E', 'W', 'N', 'SE', 'SW', 'NW', 'NE'].map((value) => ({ value, textContent: '', hidden: false, disabled: false }))
    }),
    makeElement('connect-four-align-fall', { checked: true }),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('highlight-new-boxes', { checked: true }),
    makeElement('begin-game'),
    makeElement('game-setup-alert', { hidden: true }),
    makeElement('animation-speed', { value: '80' }),
    makeElement('animation-speed-value'),
    makeElement('step-mode', { checked: true }),
    makeElement('next-step'),
    makeElement('debug-toggle'),
    makeElement('debug-tools'),
    makeElement('debug-tile-value', { value: '128' }),
    makeElement('debug-bomb-tool', { value: 'number' }),
    makeElement('bomb-art-style', { value: 'png-1' }),
    makeElement('undo-step'),
    makeElement('redo-step'),
    makeElement('export-state'),
    makeElement('import-state'),
    makeElement('debug-export-output'),
    makeElement('export-state-kind', { value: 'status' }),
    makeElement('export-background-format-row', { hidden: true }),
    makeElement('export-background-format', { value: 'dsl' }),
    makeElement('status-badge'),
    makeElement('status-line'),
    makeElement('info-line'),
    makeElement('score-label'),
    makeElement('highest-tile-label'),
    makeElement('existing-tile-label'),
    makeElement('removed-tile-label'),
    makeElement('round-label'),
    makeElement('score-value'),
    makeElement('highest-tile-value'),
    makeElement('existing-tile-value'),
    makeElement('removed-tile-value'),
    makeElement('round-value')
  ].forEach((element) => elements.set(element.id, element));
  moveButtons.forEach((button) => elements.set(button.id, button));
  mode2048Controls.forEach((control) => elements.set(control.id, control));
  modeGomokuControls.forEach((control) => elements.set(control.id, control));
  modeConnectFourControls.forEach((control) => elements.set(control.id, control));
  modeGoControls.forEach((control) => elements.set(control.id, control));

  const documentListeners = {};
  const windowListeners = {};
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Math: Object.create(Math),
    performance: { now: () => 0 },
    setTimeout,
    clearTimeout,
    document: {
      getElementById(id) {
        return elements.get(id) || null;
      },
      createElement(tagName) {
        return makeElement('', { tagName: String(tagName || '').toUpperCase() });
      },
      addEventListener(type, handler) {
        documentListeners[type] = handler;
        if (type === 'DOMContentLoaded') handler();
      },
      querySelectorAll(selector) {
        if (selector === '[data-move-dir]') return moveButtons;
        if (selector === '[data-mode-control="2048"]') return mode2048Controls;
        if (selector === '[data-mode-control="gomoku"]') return modeGomokuControls;
        if (selector === '[data-mode-control="connect-four"]') return modeConnectFourControls;
        if (selector === '[data-mode-control="go"]') return modeGoControls;
        return [];
      }
    },
    window: {
      devicePixelRatio: 1,
      RAMIFIED_MINIGAME_PRESETS: presetRegistrySource,
      RAMIFIED_MINIGAME_PRESET_DATA: presetDataByKey,
      addEventListener(type, handler) {
        windowListeners[type] = handler;
      },
      requestAnimationFrame(handler) {
        calls.push({ method: 'requestAnimationFrame', args: [] });
        return 1;
      },
      cancelAnimationFrame() {}
    }
  };
  let randoms = [0, 0.1, 0.2, 0.1];
  context.Math.random = () => (randoms.length ? randoms.shift() : 0.1);
  vm.runInNewContext(source, context);

  assert.strictEqual(typeof canvas.listeners.mousemove, 'function');
  assert.strictEqual(typeof canvas.listeners.mouseleave, 'function');
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  canvas.listeners.mousemove({ clientX: 57, clientY: 29 });
  assert.strictEqual(canvas.style.cursor, 'help');
  canvas.listeners.mouseleave();
  assert.strictEqual(canvas.style.cursor, '');

  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '2');
  assert.strictEqual(moveButtons.some((button) => button.disabled), false);
  assert.strictEqual(elements.get('move-row').hidden, false);
  assert.strictEqual(elements.get('box-ui-row').hidden, false);

  elements.get('debug-toggle').listeners.click();
  assert.strictEqual(elements.get('debug-tools').hidden, false);
  assert.strictEqual(elements.get('debug-toggle').attributes['aria-pressed'], 'true');
  assert.strictEqual(elements.get('import-state').disabled, false);

  elements.get('debug-tile-value').value = '1';
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('status-line').textContent, 'debug value rejected');
  assert.strictEqual(elements.get('undo-step').disabled, true);

  elements.get('debug-tile-value').value = '128';
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  let exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.debugMode, true);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 128);
  assert.strictEqual(elements.get('undo-step').disabled, false);

  elements.get('debug-tile-value').value = '';
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(elements.get('status-line').textContent, 'debug: r1 c1 = empty');
  assert.strictEqual(exported.boxes.some((item) => item.row === 1 && item.col === 1), false);

  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 128);

  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 2);

  elements.get('debug-bomb-tool').value = 'blue';
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(elements.get('status-line').textContent, 'debug: r1 c1 = blue bomb');
  assert.deepStrictEqual(exported.bombs.map((bomb) => `${bomb.row},${bomb.col}:${bomb.kind}:${bomb.value}`), ['1,1:blue:2']);
  assert.strictEqual(exported.boxes.some((item) => item.row === 1 && item.col === 1), false);

  elements.get('debug-bomb-tool').value = 'clear';
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(elements.get('status-line').textContent, 'debug: r1 c1 bomb cleared');
  assert.deepStrictEqual(exported.bombs, []);

  elements.get('debug-bomb-tool').value = 'number';
  elements.get('debug-tile-value').value = '2';
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.boxes.find((item) => item.row === 1 && item.col === 1).value, 2);

  let preventedRepeat = false;
  documentListeners.keydown({
    key: 'ArrowRight',
    repeat: true,
    preventDefault() {
      preventedRepeat = true;
    }
  });
  assert.strictEqual(preventedRepeat, true);
  assert.strictEqual(elements.get('round-value').textContent, '0');

  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'E').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'step');
  assert.strictEqual(elements.get('next-step').disabled, false);
  assert.strictEqual(moveButtons.every((button) => button.disabled), true);
  assert.strictEqual(elements.get('animation-speed-value').textContent, '80 ms');

  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  assert.strictEqual(elements.get('import-preset-tools').hidden, false);
  assert.strictEqual(elements.get('import-preset-input').hidden, false);
  elements.get('import-preset-input').value = JSON.stringify({
    schema: 'ramified-minigame-background-preset',
    preset: {
      label: 'tiny import',
      lattice: 'square',
      size: '2x2',
      removed: '1,1',
      glue: 'g0:1,2,E=2,1,W'
    }
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  assert.strictEqual(elements.get('status-line').textContent, 'preset imported');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '3');
  assert.strictEqual(elements.get('import-preset-tools').hidden, false);

  elements.get('debug-export-output').value = JSON.stringify({
    preset: {
      label: 'status import',
      lattice: 'square',
      rows: 2,
      cols: 2,
      surface: 'debug status'
    },
    phase: 'ready',
    round: 7,
    score: 12,
    nextBoxId: 5,
    boxes: [
      { id: 1, row: 1, col: 1, value: 2 },
      { id: 2, row: 1, col: 1, value: 4 },
      { id: 3, row: 1, col: 2, value: 8 }
    ],
    removed: [{ row: 2, col: 2 }],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.ok(elements.get('info-line').textContent.includes('warning: 2 stacked boxes'));
  assert.strictEqual(elements.get('round-value').textContent, '7');
  assert.strictEqual(elements.get('score-value').textContent, '12');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.warnings[0].kind, 'stacked-boxes');
  assert.strictEqual(exported.boxes.length, 3);

  elements.get('debug-export-output').value = JSON.stringify({
    preset: {
      label: 'bomb blocked bonus import',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'full blocked grid with bomb'
    },
    phase: 'ready',
    round: 11,
    score: 20,
    nextBoxId: 17,
    boxes: Array.from({ length: 16 }, (_, index) => {
      if (index === 5) return null;
      const row = Math.floor(index / 4) + 1;
      const col = (index % 4) + 1;
      return { id: index + 1, row, col, value: (row + col) % 2 ? 2 : 4 };
    }).filter(Boolean),
    bombs: [{ row: 2, col: 2, kind: 'blue', value: 2 }],
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  ['N', 'W', 'E'].forEach((dir, index) => {
    moveButtons.find((button) => button.getAttribute('data-move-dir') === dir).listeners.click();
    assert.strictEqual(elements.get('status-line').textContent, 'no move');
    assert.strictEqual(elements.get('info-line').textContent, `${index + 1}/4 directions unchanged`);
  });
  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'S').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'bombs remain');
  assert.strictEqual(elements.get('info-line').textContent, 'detonate 1 bomb before bonus ending');
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'ready');
  assert.notStrictEqual(exported.ending, 'bonus');
  assert.strictEqual(exported.bombs.length, 1);

  elements.get('debug-export-output').value = JSON.stringify({
    preset: {
      label: 'bonus ending import',
      lattice: 'square',
      rows: 4,
      cols: 4,
      surface: 'full blocked grid'
    },
    phase: 'ready',
    round: 11,
    score: 20,
    nextBoxId: 17,
    boxes: Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4) + 1;
      const col = (index % 4) + 1;
      return { id: index + 1, row, col, value: (row + col) % 2 ? 2 : 4 };
    }),
    removed: [],
    queue: { eventIndex: 0, stepPaused: false, events: [] }
  });
  elements.get('import-state').listeners.click();
  ['N', 'W', 'E'].forEach((dir, index) => {
    moveButtons.find((button) => button.getAttribute('data-move-dir') === dir).listeners.click();
    assert.strictEqual(elements.get('status-line').textContent, 'no move');
    assert.strictEqual(elements.get('info-line').textContent, `${index + 1}/4 directions unchanged`);
  });
  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'S').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'bonus ending');
  assert.strictEqual(elements.get('info-line').textContent, 'all 4 directions unchanged');
  assert.strictEqual(elements.get('status-badge').textContent, 'over');
  assert.ok(moveButtons.every((button) => button.disabled));
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.phase, 'gameover');
  assert.strictEqual(exported.ending, 'bonus');

  elements.get('game-mode-select').value = 'gomoku';
  elements.get('game-mode-select').listeners.change();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('surface-preset-select').value, game.BOUNDARY_GLUE_BOARD_PRESET_ID);
  assert.strictEqual(elements.get('move-row').hidden, true);
  assert.strictEqual(elements.get('box-ui-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('boundary-glue-mode-row').hidden, false);
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.strictEqual(elements.get('step-mode-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-row').hidden, true);
  assert.strictEqual(elements.get('debug-bomb-row').hidden, true);
  assert.strictEqual(elements.get('bomb-art-row').hidden, true);
  assert.strictEqual(elements.get('debug-tile-value').disabled, true);
  assert.strictEqual(elements.get('debug-bomb-tool').disabled, true);
  assert.strictEqual(elements.get('bomb-art-style').disabled, true);
  elements.get('surface-preset-select').value = 'gomoku-m4-15x15';
  elements.get('surface-preset-select').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  assert.strictEqual(elements.get('gomoku-size-row').hidden, false);
  elements.get('gomoku-display-style').value = 'vertex';
  elements.get('gomoku-display-style').listeners.change();
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('score-label').textContent, 'Turn');
  assert.strictEqual(elements.get('score-value').textContent, 'black');
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('score-value').textContent, 'white');
  assert.strictEqual(elements.get('highest-tile-label').textContent, 'Black stones');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '0');
  assert.strictEqual(elements.get('round-value').textContent, '1');
  assert.strictEqual(elements.get('undo-step').disabled, false);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.deepStrictEqual(exported.stones.map((stone) => stone.color), ['black']);
  assert.strictEqual(exported.turn, 'white');
  const gomokuExport = exported;
  elements.get('undo-step').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 0);
  assert.strictEqual(elements.get('score-value').textContent, 'black');
  assert.strictEqual(elements.get('round-value').textContent, '0');
  elements.get('debug-export-output').value = JSON.stringify(gomokuExport);
  elements.get('import-state').listeners.click();
  assert.strictEqual(elements.get('status-line').textContent, 'status imported');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'gomoku');
  assert.strictEqual(exported.stones.length, 1);

  const clickCell = (row, col) => {
    canvas.listeners.click({
      clientX: 57 + ((col - 1) * 58),
      clientY: 57 + ((row - 1) * 58)
    });
  };
  elements.get('surface-preset-select').value = game.BOUNDARY_GLUE_BOARD_PRESET_ID;
  elements.get('surface-preset-select').listeners.change();
  elements.get('gomoku-board-size').value = '4';
  elements.get('gomoku-board-size').listeners.change();
  elements.get('begin-game').listeners.click();
  clickCell(1, 1);
  clickCell(2, 1);
  clickCell(1, 2);
  clickCell(2, 2);
  clickCell(1, 3);
  clickCell(2, 3);
  clickCell(1, 4);
  assert.strictEqual(elements.get('status-line').textContent, 'black wins');
  assert.strictEqual(elements.get('status-badge').textContent, 'over');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.resultDismissed, false);
  assert.strictEqual(exported.stones.length, 7);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.resultDismissed, false);
  assert.strictEqual(exported.stones.length, 7);

  elements.get('game-mode-select').value = 'connect-four';
  elements.get('game-mode-select').listeners.change();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('surface-preset-select').value, 'connect-four-exchange');
  assert.strictEqual(elements.get('connect-four-fall-row').hidden, false);
  assert.strictEqual(elements.get('connect-four-align-row').hidden, false);
  assert.strictEqual(elements.get('connect-four-align-fall').checked, true);
  assert.strictEqual(elements.get('gomoku-size-row').hidden, true);
  assert.strictEqual(elements.get('gomoku-display-row').hidden, false);
  assert.strictEqual(elements.get('move-row').hidden, true);
  elements.get('surface-preset-select').value = 'connect-four-6x7';
  elements.get('surface-preset-select').listeners.change();
  calls.length = 0;
  elements.get('connect-four-fall-dir').value = 'E';
  elements.get('connect-four-fall-dir').listeners.change();
  assert.ok(calls.some((call) => call.method === 'rotate' && Math.abs(call.args[0] - (Math.PI / 2)) < 1e-9));
  calls.length = 0;
  elements.get('connect-four-align-fall').checked = false;
  elements.get('connect-four-align-fall').listeners.change();
  assert.ok(!calls.some((call) => call.method === 'rotate' && Math.abs(call.args[0] - (Math.PI / 2)) < 1e-9));
  elements.get('connect-four-align-fall').checked = true;
  elements.get('connect-four-align-fall').listeners.change();
  elements.get('connect-four-fall-dir').value = 'S';
  elements.get('connect-four-fall-dir').listeners.change();
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  assert.strictEqual(elements.get('begin-game').textContent, 'stop the game');
  assert.strictEqual(elements.get('score-label').textContent, 'Turn');
  assert.strictEqual(elements.get('score-value').textContent, 'red');
  assert.strictEqual(elements.get('connect-four-fall-dir').disabled, true);
  canvas.listeners.click({ clientX: 36, clientY: 41 });
  assert.strictEqual(elements.get('status-line').textContent, 'Connect Four drop 1');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  assert.strictEqual(elements.get('score-value').textContent, 'yellow');
  assert.strictEqual(elements.get('highest-tile-label').textContent, 'Red tokens');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '1');
  assert.strictEqual(elements.get('existing-tile-value').textContent, '0');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.strictEqual(exported.gameMode, 'connect-four');
  assert.strictEqual(exported.tokens.length, 1);
  assert.strictEqual(exported.holes.length, 7);
  assert.strictEqual(exported.preset.connectFourHoles.length, 7);
  assert.strictEqual(exported.tokens[0].row, 6);
  assert.strictEqual(exported.tokens[0].col, 1);
  assert.strictEqual(exported.fallDirName, 'S');
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('begin-game').textContent, 'begin the game');
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');

  elements.get('import-preset-source').value = 'paste';
  elements.get('import-preset-source').listeners.change();
  elements.get('import-preset-input').value = JSON.stringify({
    id: 'connect-four-cycle-torus',
    label: 'Connect Four cycle torus',
    lattice: 'square',
    size: '4x4',
    surface: 'cycle torus',
    glue: 'g0:1..4,4,E=1..4,1,W; g1:1,1..4,N=4,1..4,S'
  });
  elements.get('apply-import-preset').listeners.click();
  assert.strictEqual(elements.get('surface-preset-select').value, 'imported-preset');
  elements.get('connect-four-fall-dir').value = 'E';
  elements.get('connect-four-fall-dir').listeners.change();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('begin-game').listeners.click();
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('status-line').textContent, 'Connect Four drop rejected');
  assert.strictEqual(elements.get('info-line').textContent, 'drop route cycles before stopping');
  assert.strictEqual(elements.get('game-setup-alert').hidden, false);
  assert.strictEqual(elements.get('game-setup-alert').textContent, 'Connect Four drop rejected: drop route cycles before stopping');
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[4, 1]]);
  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'setup');
  assert.strictEqual(elements.get('game-setup-alert').hidden, true);
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles.map((hole) => [hole.row, hole.col]), [[4, 1]]);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  elements.get('export-state').listeners.click();
  exported = JSON.parse(elements.get('debug-export-output').value);
  assert.deepStrictEqual(exported.cycleHoles, []);
}

function testSokobanPresetRegistryAndSetup() {
  const state = game.createSokobanState('sokoban-square');
  assert.strictEqual(state.gameMode, game.GAME_MODES.SOKOBAN);
  assert.strictEqual(state.players.length, 1);
  assert.strictEqual(state.boxes.length, 1);
  assert.strictEqual(state.targets.size, 1);
  assert.ok(state.walls.size > 0);
  assert.strictEqual(state.removed.has(game.indexOf(1, 1, state.preset.cols)), false);
  assert.strictEqual(game.sokobanSetupIssue(state), '');
  assert.strictEqual(game.gameModeFromPresetGroup(state.preset), game.GAME_MODES.SOKOBAN);
}

function testSokobanPlayerMovementAndMultiPlayerTransaction() {
  let state = readySokobanState({
    sokoban: {
      players: [tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.strictEqual(result.state.moves, 1);
  assert.strictEqual(result.state.pushes, 0);

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1), tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2', '2,3']);

  state = readySokobanState({
    sokoban: {
      players: [tile(1, 1), tile(2, 1)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.W);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1', '2,1']);
}

function testSokobanWallsAndBoxPushes() {
  let state = readySokobanState({
    sokoban: {
      players: [tile(2, 2)],
      boxes: [tile(3, 3)],
      targets: [tile(3, 4)],
      walls: [tile(2, 3)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(state.removed.has(game.indexOf(2, 3, state.preset.cols)), false);

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,3']);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(result.state.winner, 'solved');

  state = readySokobanState({
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 3)],
      walls: [tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,2']);
}

function testSokobanSolvedRequiresAllTargetsCovered() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 2), tile(3, 5)],
      targets: [tile(2, 2), tile(2, 3)]
    }
  });
  assert.strictEqual(game.sokobanSolved(state), false);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 2), tile(2, 3), tile(3, 5)],
      targets: [tile(2, 2), tile(2, 3)]
    }
  });
  assert.strictEqual(game.sokobanSolved(state), true);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 2), tile(2, 3)],
      targets: [tile(2, 2), tile(2, 3)],
      sea: [tile(2, 3)]
    }
  });
  assert.strictEqual(game.sokobanSolved(state), false);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 2), tile(3, 5)],
      targets: [tile(2, 2), tile(2, 3)],
      energyBridges: [tile(2, 3)]
    }
  });
  assert.strictEqual(game.sokobanSolved(state), true);
}

function testSokobanGluedEdgeMovementAndPush() {
  let state = readySokobanState({
    size: '2x2',
    glue: [
      gluePair(1, { row: 1, col: 2, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      players: [tile(1, 2)],
      boxes: [tile(2, 2)],
      targets: [tile(2, 1)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1']);

  state = readySokobanState({
    size: '1x2',
    glue: [
      gluePair(1, { row: 1, col: 2, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 1)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['1,1']);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(game.sokobanSolved(result.state), true);
}

function testSokobanStatusRoundTripAndCompactImport() {
  const compact = game.normalizePresetPayload({
    id: 'sokoban-compact',
    label: 'Sokoban Compact',
    gameTypes: ['Sokoban'],
    size: '3x4',
    sokoban: {
      players: '2,1; 2,2',
      boxes: '2,3',
      targets: '2,4',
      sea: '3,1',
      walls: '1,1',
      ice: '1,2',
      energyBridges: '1,3'
    }
  });
  assert.deepStrictEqual(compact.sokoban.players, [tile(2, 1), tile(2, 2)]);
  assert.deepStrictEqual(compact.sokoban.walls, [tile(1, 1)]);
  assert.deepStrictEqual(compact.sokoban.sea, [tile(3, 1)]);

  const state = game.beginSokobanGame(compact);
  const result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  const summary = game.stateSummary(result.state);
  assert.strictEqual(summary.gameMode, game.GAME_MODES.SOKOBAN);
  assert.strictEqual(summary.pushes, 1);
  assert.deepStrictEqual(summary.walls, [game.indexOf(1, 1, compact.cols)]);
  assert.deepStrictEqual(summary.sea, [game.indexOf(3, 1, compact.cols)]);

  const imported = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: compact,
    phase: 'ready',
    players: [{ id: 10, row: 2, col: 1 }],
    boxes: [{ id: 20, row: 2, col: 3 }],
    targets: [tile(2, 4)],
    sea: [tile(3, 1)],
    walls: [tile(1, 1)],
    moves: 4,
    pushes: 2
  }).state;
  assert.strictEqual(imported.gameMode, game.GAME_MODES.SOKOBAN);
  assert.deepStrictEqual(sokobanActorsAt(imported.players, imported.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(imported.boxes, imported.preset.cols), ['2,3']);
  assert.strictEqual(imported.nextPlayerId, 11);
  assert.strictEqual(imported.nextBoxId, 21);
  assert.strictEqual(imported.moves, 4);
  assert.strictEqual(imported.pushes, 2);
  assert.strictEqual(imported.walls.has(game.indexOf(1, 1, imported.preset.cols)), true);
  assert.strictEqual(imported.sea.has(game.indexOf(3, 1, imported.preset.cols)), true);
}

function testSokobanIcePlayerSlidingAndSkiingBlockers() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(3, 1)],
      targets: [tile(3, 2)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 4)],
      targets: [tile(3, 5)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,4']);
  assert.strictEqual(result.state.pushes, 0);
}

function testSokobanIceBoxFrictionRules() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 3), tile(2, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,5']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 2), tile(2, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(3, 5)],
      ice: [tile(2, 1)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,1']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['2,3']);
}

function testSokobanSeaTerrainAndUnderwaterCargo() {
  let normalized = game.normalizePresetPayload({
    id: 'sokoban-sea-overlap',
    label: 'Sokoban Sea Overlap',
    gameTypes: ['Sokoban'],
    size: '2x3',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(2, 2)],
      sea: [tile(1, 2), tile(1, 3)],
      ice: [tile(1, 3)],
      energyBridges: [tile(1, 2)]
    }
  });
  assert.deepStrictEqual(normalized.sokoban.sea, [tile(1, 2), tile(1, 3)]);
  assert.deepStrictEqual(normalized.sokoban.ice || [], []);
  assert.deepStrictEqual(normalized.sokoban.energyBridges || [], [tile(1, 2)]);

  let state = readySokobanState({
    size: '2x3',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 1)],
      targets: [tile(2, 2)],
      sea: [tile(1, 2)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1']);

  state = readySokobanState({
    size: '2x3',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 3)],
      sea: [tile(1, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['1,3']);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['1,3,-1']);
  assert.strictEqual(game.sokobanSolved(result.state), false);
  assert.strictEqual(result.state.phase, 'ready');
  result = game.moveSokobanPlayers(result.state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,3']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['1,3']);

  state = readySokobanState({
    size: '1x4',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 4)],
      ice: [tile(1, 2)],
      sea: [tile(1, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,1']);
  assert.deepStrictEqual(sokobanActorsAt(result.state.boxes, result.state.preset.cols), ['1,3']);
  assert.strictEqual(result.events.length, 1);

  state = readySokobanState({
    size: '1x3',
    sokoban: {
      players: [tile(1, 1)],
      targets: [tile(1, 3)],
      sea: [tile(1, 3)],
      energyBridges: [tile(1, 2)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['1,3']);
  assert.strictEqual(game.sokobanSolved(result.state), false);
  result = game.moveSokobanPlayers(result.state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,3']);

  state = readySokobanState({
    size: '1x4',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 3)],
      targets: [tile(1, 4)],
      sea: [tile(1, 3)],
      energyBridges: [tile(1, 2)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,2']);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['1,3,-1']);
  assert.deepStrictEqual(sokobanBridgesAtZ(result.state), ['1,3,0']);
  const bridgeSummary = game.stateSummary(result.state).energyBridges;
  assert.deepStrictEqual(bridgeSummary, [{ index: game.indexOf(1, 3, result.state.preset.cols), z: 0 }]);
  const bridgeImport = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: result.state.preset,
    phase: 'ready',
    players: [{ id: 1, row: 1, col: 2 }],
    boxes: [{ id: 1, row: 1, col: 3, z: -1 }],
    targets: [tile(1, 4)],
    sea: [tile(1, 3)],
    energyBridges: [{ row: 1, col: 3, z: 0 }]
  }).state;
  assert.deepStrictEqual(sokobanBridgesAtZ(bridgeImport), ['1,3,0']);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      targets: [tile(4, 5)],
      sea: [tile(3, 2), tile(3, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 1);
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['3,2', '3,4']);
  assert.strictEqual(result.beams.length, 1);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state).length, 0);

  state = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: {
      id: 'sokoban-beam-different-z-box',
      label: 'Sokoban Beam Different Z Box',
      lattice: 'square',
      rows: 4,
      cols: 5,
      surface: 'Sigma_0,1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      connectFourHoles: [],
      sokoban: {
        players: [tile(1, 3)],
        boxes: [tile(3, 3)],
        targets: [tile(4, 5)],
        sea: [tile(3, 3)],
        energyBridges: [tile(2, 2), tile(2, 4)]
      }
    },
    phase: 'ready',
    players: [{ id: 1, row: 1, col: 3 }],
    boxes: [{ id: 1, row: 3, col: 3, z: -1 }],
    targets: [tile(4, 5)],
    sea: [tile(3, 3)],
    energyBridges: [tile(2, 2), tile(2, 4)]
  }).state;
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['3,3,-1']);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state)[0].z, 0);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(4, 3)],
      boxes: [tile(3, 3)],
      targets: [tile(1, 5)],
      sea: [tile(2, 2), tile(2, 3), tile(2, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state)[0].z, -1);
  result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['2,3,0']);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state)[0].z, -1);

  state = readySokobanState({
    size: '1x4',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 4)],
      sea: [tile(1, 3)],
      energyBridges: [tile(1, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['1,3,0']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['1,3']);

  state = readySokobanState({
    size: '1x4',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(1, 2)],
      targets: [tile(1, 4)],
      energyBridges: [tile(1, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'box blocked');

  state = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: {
      id: 'sokoban-box-stack',
      label: 'Sokoban Box Stack',
      lattice: 'square',
      rows: 2,
      cols: 4,
      surface: 'Sigma_0,1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      connectFourHoles: [],
      sokoban: {
        players: [tile(1, 1)],
        boxes: [tile(1, 2)],
        targets: [tile(2, 4)],
        sea: [tile(1, 3)]
      }
    },
    phase: 'ready',
    players: [{ id: 1, row: 1, col: 1 }],
    boxes: [
      { id: 1, row: 1, col: 2, z: 0 },
      { id: 2, row: 1, col: 3, z: -1 }
    ],
    targets: [tile(2, 4)],
    sea: [tile(1, 3)]
  }).state;
  assert.deepStrictEqual(sokobanBoxesAtZ(state), ['1,2,0', '1,3,-1']);
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanBoxesAtZ(result.state), ['1,3,-1', '1,3,0']);
  assert.deepStrictEqual(game.stateSummary(result.state).boxes.map((box) => box.z).sort(), [-1, 0]);
}

function testSokobanZStackedEnergyBridgesOnSea() {
  let state = game.beginSokobanGame(game.normalizePresetPayload(sokobanZStackedBridgeSupportOptions()));
  assert.deepStrictEqual(sokobanBridgesAtZ(state), ['1,3,-1', '2,3,0']);

  let result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(sokobanBridgesAtZ(result.state), ['1,3,-1', '1,3,0']);

  result = game.moveSokobanPlayers(result.state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,3']);
  assert.deepStrictEqual(sokobanBridgesAtZ(result.state), ['1,3,-1', '10,3,-1']);

  const imported = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: {
      id: 'bridge-stack-import',
      label: 'Bridge Stack Import',
      lattice: 'square',
      rows: 2,
      cols: 3,
      surface: 'Sigma_0,1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      connectFourHoles: [],
      sokoban: {
        players: [tile(2, 1)],
        targets: [tile(2, 3)],
        sea: [tile(1, 2)]
      }
    },
    phase: 'ready',
    players: [{ id: 1, row: 2, col: 1 }],
    targets: [tile(2, 3)],
    sea: [tile(1, 2)],
    energyBridges: [
      { row: 1, col: 2, z: -1 },
      { row: 1, col: 2, z: 0 },
      { row: 1, col: 2, z: 0 }
    ]
  }).state;
  assert.deepStrictEqual(sokobanBridgesAtZ(imported), ['1,2,-1', '1,2,0']);
  assert.deepStrictEqual(game.stateSummary(imported).energyBridges.map((bridge) => bridge.z).sort(), [-1, 0]);

  const normalizedPreset = game.normalizePresetPayload({
    id: 'bridge-stack-preset',
    label: 'Bridge Stack Preset',
    gameTypes: ['Sokoban'],
    lattice: 'square',
    rows: 2,
    cols: 3,
    surface: 'Sigma_0,1',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 3)],
      sea: [tile(1, 2)],
      energyBridges: [
        { row: 1, col: 2, z: -1 },
        { row: 1, col: 2, z: 0 }
      ]
    }
  });
  state = game.beginSokobanGame(normalizedPreset);
  assert.deepStrictEqual(normalizedPreset.sokoban.energyBridges, [
    { row: 1, col: 2, z: -1 },
    { row: 1, col: 2, z: 0 }
  ]);
  assert.deepStrictEqual(sokobanBridgesAtZ(state), ['1,2,-1', '1,2,0']);
}

function testSokobanEnergyBeamFormationAndGluedRoutes() {
  let state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(3, 1)],
      targets: [tile(3, 2)],
      energyBridges: [tile(2, 2), tile(2, 5)]
    }
  });
  let beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.deepStrictEqual(beams[0].interior.map((index) => {
    const pos = game.rowCol(index, state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,3', '2,4']);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(1, 1)],
      boxes: [tile(2, 3)],
      targets: [tile(3, 2)],
      energyBridges: [tile(2, 2), tile(2, 5)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 0);

  const glued = game.createSokobanState(sokobanPreset({
    size: '1x4',
    glue: [
      gluePair(1, { row: 1, col: 4, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      energyBridges: [tile(1, 2), tile(1, 4)]
    }
  }));
  beams = game.sokobanEnergyBeamObjects(glued);
  assert.ok(beams.some((beam) => beam.interior.includes(game.indexOf(1, 1, glued.preset.cols))));

  state = readySokobanState({
    size: '2x3',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      energyBridges: [tile(1, 2), tile(1, 3)]
    }
  });
  beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.deepStrictEqual(beams[0].interior, []);

  state = readySokobanState({
    size: '2x3',
    glue: [
      gluePair(1, { row: 1, col: 3, dir: game.DIRS.E }, { row: 1, col: 1, dir: game.DIRS.W })
    ],
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      energyBridges: [tile(1, 1)]
    }
  });
  beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.deepStrictEqual(beams[0].endpoints, [
    game.indexOf(1, 1, state.preset.cols),
    game.indexOf(1, 1, state.preset.cols)
  ]);
  assert.deepStrictEqual(beams[0].interior.map((index) => {
    const pos = game.rowCol(index, state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['1,2', '1,3']);
}

function testSokobanEnergyBeamsRespectSeaZLevels() {
  let state = readySokobanState({
    size: '2x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      sea: [tile(1, 2), tile(1, 3)],
      energyBridges: [tile(1, 1), tile(1, 4)]
    }
  });
  let beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.strictEqual(beams[0].z, 0);
  assert.deepStrictEqual(beams[0].interior.map((index) => {
    const pos = game.rowCol(index, state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['1,2', '1,3']);

  state = readySokobanState({
    size: '2x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      sea: [tile(1, 1), tile(1, 2), tile(1, 3), tile(1, 4)],
      energyBridges: [tile(1, 1), tile(1, 4)]
    }
  });
  beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 1);
  assert.strictEqual(beams[0].z, -1);

  state = readySokobanState({
    size: '2x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      sea: [tile(1, 1), tile(1, 4)],
      energyBridges: [tile(1, 1), tile(1, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 0);

  state = readySokobanState({
    size: '2x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 2)],
      sea: [tile(1, 1), tile(1, 2), tile(1, 3)],
      energyBridges: [tile(1, 1), tile(1, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 0);
}

function testSokobanEnergyBridgesAreBoxLikeCargo() {
  let state = readySokobanState({
    size: '3x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(2, 3)],
      energyBridges: [tile(2, 2)]
    }
  });
  assert.strictEqual(game.sokobanSetupIssue(state), '');
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,3']);
  assert.strictEqual(result.bridges.length, 1);
  assert.strictEqual(result.beams.length, 0);
  assert.strictEqual(result.state.phase, 'gameover');
  assert.strictEqual(game.sokobanSolved(result.state), true);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(3, 5)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 1);
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['2,3', '2,4']);
  assert.strictEqual(result.bridges.length, 1);
  assert.strictEqual(result.beams.length, 0);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state).length, 1);

  state = readySokobanState({
    size: '3x5',
    sokoban: {
      players: [tile(3, 2)],
      targets: [tile(3, 5)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 1);
  result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.bridges.length, 1);
  assert.strictEqual(result.beams.length, 0);
  assert.strictEqual(game.sokobanEnergyBeamObjects(result.state).length, 0);
}

function testSokobanEnergyBeamPushesAndIceSliding() {
  let state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(4, 5)],
      targets: [tile(4, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  let result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['3,2', '3,4']);
  assert.strictEqual(result.state.pushes, 1);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(2, 1)],
      boxes: [tile(2, 2)],
      targets: [tile(4, 4)],
      energyBridges: [tile(1, 3), tile(3, 3)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(4, 5)],
      targets: [tile(4, 4)],
      walls: [tile(3, 3)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(result.blockers, [{
    kind: 'tile',
    reason: 'wall',
    index: game.indexOf(3, 3, state.preset.cols)
  }]);

  state = readySokobanState({
    size: '4x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(3, 3)],
      targets: [tile(4, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(result.blockers, [{
    kind: 'tile',
    reason: 'box',
    index: game.indexOf(3, 3, state.preset.cols),
    z: 0
  }]);

  state = readySokobanState({
    size: '5x5',
    sokoban: {
      players: [tile(1, 3)],
      boxes: [tile(5, 5)],
      targets: [tile(5, 4)],
      ice: [tile(2, 2), tile(2, 4), tile(3, 2), tile(3, 4)],
      energyBridges: [tile(2, 2), tile(2, 4)]
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['1,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['4,2', '4,4']);
}

function testSokobanStrictBeamGroupMovementAndBlockerDiagnostics() {
  let state = readySokobanState(sokobanCrossBeamOptions(false));
  const initialBeams = sokobanBeamRouteSummary(state);
  let result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'energy beam blocked');
  assert.deepStrictEqual(result.blockers, [{
    kind: 'edge',
    reason: 'boundary',
    index: game.indexOf(4, 4, state.preset.cols),
    dir: game.DIRS.S
  }]);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['4,2']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,3']);
  assert.deepStrictEqual(sokobanBeamRouteSummary(result.state), initialBeams);

  state = readySokobanState(sokobanCrossBeamOptions(true));
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['4,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,4']);
  const beams = game.sokobanEnergyBeamObjects(result.state);
  assert.strictEqual(beams.length, 2);
  assert.ok(beams.some((beam) => beam.interior.map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).join(';') === '2,1;2,2;2,3'));
  assert.ok(beams.some((beam) => beam.interior.map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).join(';') === '3,4;4,4;1,4'));

  state = game.beginSokobanGame(game.normalizePresetPayload(sokobanSharedEndpointBeamOptions()));
  state.phase = 'ready';
  result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,2']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['1,1', '1,3', '4,3']);
  assert.strictEqual(result.beams.length, 1);
  assert.deepStrictEqual(result.beams[0].fromEndpoints.map((index) => {
    const pos = game.rowCol(index, state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['2,1', '2,3']);
  assert.deepStrictEqual(result.beams[0].toEndpoints.map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['1,1', '1,3']);

  state = game.beginSokobanGame(game.normalizePresetPayload(sokobanHexRemovedNeighborGlueBeamOptions(true)));
  state.phase = 'ready';
  result = game.moveSokobanPlayers(state, game.HEX_DIRS.NW);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['1,2', '1,4']);
  const hexBeams = game.sokobanEnergyBeamObjects(result.state);
  assert.strictEqual(hexBeams.length, 1);
  assert.deepStrictEqual(hexBeams[0].interior.map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }), ['3,1']);

  state = game.beginSokobanGame(game.normalizePresetPayload(sokobanHexRemovedNeighborGlueBeamOptions(false)));
  state.phase = 'ready';
  result = game.moveSokobanPlayers(state, game.HEX_DIRS.NW);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'energy beam blocked');
  assert.deepStrictEqual(result.blockers, [{
    kind: 'tile',
    reason: 'removed',
    index: game.indexOf(1, 3, state.preset.cols)
  }]);
}

function testSokobanOverlappingBeamsDoNotBlockBeamMovement() {
  const state = readySokobanState({
    size: '5x5',
    sokoban: {
      players: [tile(1, 2)],
      targets: [tile(5, 5)],
      energyBridges: [tile(2, 1), tile(2, 5), tile(1, 3), tile(5, 3)]
    }
  });
  const beams = game.sokobanEnergyBeamObjects(state);
  assert.strictEqual(beams.length, 2);
  assert.strictEqual(beams.filter((beam) => beam.interior.includes(game.indexOf(2, 3, state.preset.cols))).length, 2);

  const result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.beams.length, 1);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['1,3', '3,1', '3,5', '5,3']);
}

function testSokobanBeamInteriorsCanCrossButStillBlockEnergyBridges() {
  let state = game.gameStateFromDebugImportPayload({
    gameMode: 'sokoban',
    preset: {
      id: 'expand',
      label: 'expand',
      lattice: 'square',
      rows: 7,
      cols: 7,
      surface: 'Sigma_0,1',
      removedTiles: [],
      cutEdges: [],
      gluedEdges: [],
      connectFourHoles: [],
      sokoban: {
        players: [tile(6, 6)],
        targets: [tile(1, 1), tile(1, 7), tile(4, 4), tile(7, 1), tile(7, 7)],
        energyBridges: [tile(3, 3), tile(3, 5), tile(4, 4), tile(5, 3), tile(5, 5)]
      }
    },
    phase: 'ready',
    removed: [],
    players: [{ id: 1, row: 4, col: 3 }],
    boxes: [],
    targets: [tile(1, 1), tile(1, 7), tile(4, 4), tile(7, 1), tile(7, 7)],
    walls: [],
    ice: [],
    energyBridges: [tile(2, 4), tile(4, 5), tile(5, 2), tile(5, 6), tile(7, 4)],
    moves: 47,
    pushes: 10
  }).state;
  let result = game.moveSokobanPlayers(state, game.DIRS.S);
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.beams.length, 1);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['5,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['2,4', '4,5', '6,2', '6,6', '7,4']);

  state = readySokobanState({
    id: 'test',
    label: 'test',
    size: '4x4',
    surface: 'Sigma_1,1',
    glue: 'g0:1,3..4,N=4,3..4,S; g1:1,4,E=1,1,W',
    sokoban: {
      sea: '1,1; 1,2; 1,3; 1,4; 2,4; 3,4; 4,4',
      targets: '4,4',
      energyBridges: '2,2; 4,3',
      players: '3,2'
    }
  });
  result = game.moveSokobanPlayers(state, game.DIRS.N);
  assert.strictEqual(result.changed, true);
  result = game.moveSokobanPlayers(result.state, game.DIRS.E);
  assert.strictEqual(result.changed, true);
  assert.deepStrictEqual(sokobanActorsAt(result.state.players, result.state.preset.cols), ['2,3']);
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['1,2', '4,4']);
  const underwaterBeams = game.sokobanEnergyBeamObjects(result.state);
  assert.strictEqual(underwaterBeams.length, 2);
  assert.strictEqual(underwaterBeams.every((beam) => beam.z === -1), true);
  const overlapIndex = game.indexOf(1, 4, result.state.preset.cols);
  assert.strictEqual(underwaterBeams.filter((beam) => beam.interior.includes(overlapIndex)).length, 2);

  state = readySokobanState({
    size: '4x4',
    sokoban: {
      players: [tile(2, 1)],
      targets: [tile(4, 4)],
      energyBridges: [tile(1, 3), tile(2, 2), tile(4, 3)]
    }
  });
  assert.strictEqual(game.sokobanEnergyBeamObjects(state).length, 1);
  result = game.moveSokobanPlayers(state, game.DIRS.E);
  assert.strictEqual(result.changed, false);
  assert.strictEqual(result.message, 'energy bridge blocked');
  assert.deepStrictEqual(Array.from(result.state.energyBridges).map((index) => {
    const pos = game.rowCol(index, result.state.preset.cols);
    return `${pos.row},${pos.col}`;
  }).sort(), ['1,3', '2,2', '4,3']);
}

function testFullscreenSettingsPreferencesAndMarkup() {
  const defaults = {
    soundEnabled: false,
    soundVolume: 1,
    showActionRow: true,
    showGameTools: true
  };
  assert.deepStrictEqual(game.__test.fullscreenSettingsDefaults, defaults);
  assert.deepStrictEqual(game.__test.normalizeFullscreenPreferences(null), defaults);
  assert.deepStrictEqual(game.__test.normalizeFullscreenPreferences({
    soundEnabled: true,
    soundVolume: 1.7,
    showActionRow: false,
    showGameTools: true
  }), {
    soundEnabled: true,
    soundVolume: 1,
    showActionRow: false,
    showGameTools: true
  });

  const wrappedDefaults = {
    torus: 'usual',
    'klein-bottle': 'usual',
    'projective-plane': 'usual',
    cylinder: 'usual',
    'mobius-strip': 'usual'
  };
  assert.deepStrictEqual(game.__test.normalizeWrappedViewPreferences(null), wrappedDefaults);
  assert.deepStrictEqual(game.__test.normalizeWrappedViewPreferences({ torus: 'wrapped', 'klein-bottle': 'wrapped' }), {
    torus: 'wrapped',
    'klein-bottle': 'wrapped',
    'projective-plane': 'usual',
    cylinder: 'usual',
    'mobius-strip': 'usual'
  });
  assert.deepStrictEqual(game.__test.normalizeWrappedViewPreferences({ torus: 'invalid', 'klein-bottle': 'usual' }), wrappedDefaults);
  assert.deepStrictEqual(game.__test.readWrappedViewPreferences({
    getItem(key) {
      assert.strictEqual(key, game.__test.wrappedViewStorageKey);
      return JSON.stringify({ torus: 'wrapped', 'klein-bottle': 'usual' });
    }
  }), { torus: 'wrapped', 'klein-bottle': 'usual', 'projective-plane': 'usual', cylinder: 'usual', 'mobius-strip': 'usual' });
  assert.deepStrictEqual(game.__test.readWrappedViewPreferences({ getItem() { return '{broken json'; } }), wrappedDefaults);
  assert.deepStrictEqual(game.__test.normalizeWrappedViewProfile({ x: 'repeat', y: 'repeat' }), {
    x: 'repeat', y: 'repeat', preferenceKey: 'torus'
  });
  assert.deepStrictEqual(game.__test.normalizeWrappedViewProfile({ x: 'reflect-y' }), {
    x: 'reflect-y', y: '', preferenceKey: 'mobius-strip'
  });
  assert.deepStrictEqual(game.__test.wrappedViewProfileForBoundaryMode(game.BOUNDARY_GLUE_MODES.RP2), {
    x: 'reflect-y', y: 'reflect-x', preferenceKey: 'projective-plane'
  });
  assert.deepStrictEqual(game.__test.normalizeWrappedViewProfile({ x: 'reflect-y', y: 'reflect-x' }), {
    x: 'reflect-y', y: 'reflect-x', preferenceKey: 'projective-plane'
  });
  assert.strictEqual(game.__test.normalizeWrappedViewProfile({ x: 'invalid' }), null);
  assert.deepStrictEqual(game.__test.wrappedFundamentalCoordinates(27, 14, 10, 8, game.BOUNDARY_GLUE_MODES.TORUS), {
    x: 7, y: 6, copyU: 2, copyV: 1
  });
  assert.deepStrictEqual(game.__test.wrappedFundamentalCoordinates(17, 14, 10, 8, game.BOUNDARY_GLUE_MODES.KLEIN_BOTTLE), {
    x: 7, y: 2, copyU: 1, copyV: 1
  });
  assert.deepStrictEqual(game.__test.wrappedFundamentalCoordinates(27, 6, 10, 8, { x: 'repeat' }), {
    x: 7, y: 6, copyU: 2, copyV: 0
  });
  assert.strictEqual(game.__test.wrappedFundamentalCoordinates(27, 14, 10, 8, { x: 'repeat' }), null);
  assert.deepStrictEqual(game.__test.wrappedFundamentalCoordinates(17, 6, 10, 8, { x: 'reflect-y' }), {
    x: 7, y: 2, copyU: 1, copyV: 0
  });
  assert.deepStrictEqual(game.__test.wrappedDeckCopyTransform(game.BOUNDARY_GLUE_MODES.RP2, 1, 1, 10, 8), {
    x: 20, y: 16, reflected: true, advanceX: 10, reflectX: true
  });
  assert.deepStrictEqual(game.__test.wrappedFundamentalCoordinates(17, 14, 10, 8, game.BOUNDARY_GLUE_MODES.RP2), {
    x: 3, y: 2, copyU: 1, copyV: 1
  });
  assert.deepStrictEqual(game.__test.wrappedCoverCopyRange({ minX: -21, maxX: 81, minY: -21, maxY: 81 }, 60, 60, {
    x: 'repeat', y: 'repeat'
  }), { minU: -1, maxU: 1, minV: -1, maxV: 1 });
  assert.deepStrictEqual(game.__test.wrappedCoverCopyRange({ minX: -21, maxX: 81, minY: -21, maxY: 81 }, 60, 60, {
    x: 'reflect-y'
  }), { minU: -1, maxU: 1, minV: 0, maxV: 0 });
  assert.strictEqual(game.__test.wrappedRenderPixelRatio(true, 1, 0.58, { kind: 'fideChessMove' }), 1);
  assert.strictEqual(game.__test.wrappedRenderPixelRatio(true, 1, 0.58, null), 2.5);
  assert.deepStrictEqual(game.__test.normalizeFullscreenPreferences({
    soundEnabled: 'yes',
    soundVolume: null,
    showActionRow: true,
    showGameTools: false
  }), {
    soundEnabled: false,
    soundVolume: 1,
    showActionRow: true,
    showGameTools: false
  });

  const storage = {
    value: null,
    getItem(key) {
      assert.strictEqual(key, game.__test.fullscreenSettingsStorageKey);
      return this.value;
    },
    setItem(key, value) {
      assert.strictEqual(key, game.__test.fullscreenSettingsStorageKey);
      this.value = value;
    }
  };
  const previousPreferences = game.__test.getFullscreenPreferences();
  try {
    const expected = {
      soundEnabled: true,
      soundVolume: 0.42,
      showActionRow: false,
      showGameTools: true
    };
    game.__test.setFullscreenPreferences(expected);
    assert.strictEqual(game.__test.persistFullscreenPreferences(storage), true);
    assert.deepStrictEqual(game.__test.readFullscreenPreferences(storage), expected);
    storage.value = '{broken json';
    assert.deepStrictEqual(game.__test.readFullscreenPreferences(storage), defaults);
    assert.deepStrictEqual(game.__test.readFullscreenPreferences({ getItem() { throw new Error('blocked'); } }), defaults);
  } finally {
    game.__test.setFullscreenPreferences(previousPreferences);
  }

  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const setupSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  assert.ok(html.includes('id="fullscreen-settings-open"'));
  assert.ok(html.includes('id="fullscreen-settings-dialog" role="dialog" aria-modal="true"'));
  assert.ok(html.includes('id="fullscreen-sound-enabled"'));
  assert.ok(html.includes('id="fullscreen-wrapped-view-mode"'));
  assert.ok(html.includes('id="boundary-glue-wrapped-view-mode"'));
  assert.ok(html.includes('id="fullscreen-sound-volume"'));
  assert.ok(html.includes('id="fullscreen-show-action-row"'));
  assert.ok(html.includes('id="fullscreen-show-game-tools"'));
  assert.ok(html.includes('id="fullscreen-settings-exit"'));
  assert.ok(html.includes('data-i18n="fullscreen.soundEffects"'));
  assert.ok(html.includes('data-i18n="setup.boardView"'));
  assert.ok(html.includes('data-i18n="setup.tileStyle"'));
  assert.ok(html.includes('data-i18n-aria-label="access.boardView"'));
  assert.ok(html.includes('data-i18n-aria-label="access.tileStyle"'));
  assert.ok(html.includes('data-i18n="wrapped.wrapped"'));
  assert.ok(setupSource.includes('if (fullscreenSettingsOpen) {'));
  assert.ok(setupSource.includes("if (key === 'Escape')"));
  assert.ok(!setupSource.includes('FULLSCREEN_ACTION_AUTO_COLLAPSE_MS'));
}

function testReusableLocalizationWiring() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  const setupSource = fs.readFileSync(require.resolve('./ramified_minigames_setup.js'), 'utf8');
  const localeSource = fs.readFileSync(require.resolve('./i18n/ramified_minigames_locales.js'), 'utf8');
  assert.ok(html.includes('css/site_i18n.css'));
  assert.ok(html.includes('css/import_export_panel.css'));
  assert.ok(html.includes('js/site_i18n.js'));
  assert.ok(html.includes('js/import_export_panel.js'));
  assert.ok(html.includes('js/i18n/ramified_minigames_legacy_sources.js'));
  assert.ok(html.includes('js/i18n/ramified_minigames_locales.js'));
  assert.ok(html.includes('data-language-switch'));
  assert.ok(html.includes('data-i18n="meta.heading"'));
  assert.ok(setupSource.includes("document.addEventListener('site-language-change'"));
  assert.ok(setupSource.includes('window.SiteI18n.translateSource'));
  assert.ok(localeSource.includes("'zh-CN'"));
  assert.ok(localeSource.includes('歧趣游境'));
  assert.ok(localeSource.includes('同时移动所有玩家'));
  assert.ok(localeSource.includes("'io.fileReady'"));
  assert.ok(localeSource.includes("'common.download'"));
  assert.ok(localeSource.includes("'setup.coordinates'"));
  assert.ok(localeSource.includes("'access.coordinates'"));
  assert.ok(localeSource.includes("'runtime.billiardsSetupSummary'"));
  assert.ok(localeSource.includes("'setup.billiardsRack15'"));
  assert.ok(localeSource.includes("'runtime.billiardsRackDirection': ['choose a second point to set the rack direction'"));
  assert.ok(setupSource.includes("kind: 'rack'"));
  assert.ok(setupSource.includes('function billiardsRackDirectionFromCanvasPoint'));
  assert.ok(!setupSource.includes('billiardsRackDirectionFromLocal'));
  assert.ok(!setupSource.includes('billiardsRackPreviewIsValid'));
  assert.ok(!html.includes('id="billiards-rack-15"'));
  assert.ok(html.includes('<option value="beginner" selected data-i18n="setup.billiardsBeginner">'));
  assert.ok(html.includes('id="fullscreen-billiards-spin"'));
  assert.ok(!html.includes('id="billiards-tool"'));
  assert.ok(!html.includes('id="go-liberty-dot-size"'));
  assert.ok(!html.includes('id="go-liberty-dot-border"'));
}

function testRuntimeChineseLocaleCatalog() {
  const localeSource = fs.readFileSync(require.resolve('./i18n/ramified_minigames_locales.js'), 'utf8');
  const legacySource = fs.readFileSync(require.resolve('./i18n/ramified_minigames_legacy_sources.js'), 'utf8');
  const siteI18nSource = fs.readFileSync(require.resolve('./site_i18n.js'), 'utf8');
  const document = {
    documentElement: { lang: '', dataset: {} },
    addEventListener() {},
    querySelectorAll() { return []; },
    createTreeWalker() { return { nextNode: () => null }; },
    dispatchEvent() {}
  };
  const window = {
    document,
    location: { href: 'https://example.test/' },
    navigator: { languages: ['en'], language: 'en' },
    localStorage: { getItem: () => null, setItem() {} },
    addEventListener() {}
  };
  const context = {
    window,
    document,
    localStorage: window.localStorage,
    URL,
    NodeFilter: { SHOW_TEXT: 4 },
    MutationObserver: function MutationObserver() { this.observe = () => {}; },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
  };
  vm.createContext(context);
  vm.runInContext(siteI18nSource, context);
  vm.runInContext(legacySource, context);
  vm.runInContext(localeSource, context);
  window.SiteI18n.init({ namespace: 'ramified-minigames', defaultLocale: 'en', supportedLocales: ['en', 'zh-CN'], locale: 'zh-CN' });
  window.SiteI18n.setLocale('zh-CN');
  assert.strictEqual(window.SiteI18n.t('runtime.winner', { side: window.SiteI18n.t('status.yellow') }), '黄方获胜！');
  assert.strictEqual(window.SiteI18n.t('runtime.restarted', { game: window.SiteI18n.t('games.checkers') }), '跳棋已重新开始');
  assert.strictEqual(window.SiteI18n.t('runtime.moveStatus', { game: window.SiteI18n.t('games.checkers'), count: 3 }), '跳棋第3步');
  assert.strictEqual(window.SiteI18n.t('runtime.roleAction', { role: window.SiteI18n.t('status.yellow'), action: window.SiteI18n.t('runtime.toMove') }), '黄方行棋');
  assert.strictEqual(window.SiteI18n.t('runtime.billiardsSetupSummary', {
    targets: window.SiteI18n.t('runtime.billiardsTargetMany', { count: 4 }),
    pockets: window.SiteI18n.t('runtime.billiardsPocketOne', { count: 1 }),
    issue: window.SiteI18n.t('runtime.billiardsIssueSuffix', { issue: window.SiteI18n.t('runtime.billiardsCueRequired') })
  }), '4个目标球，1个袋口；必须且只能放置一个母球');
  assert.strictEqual(window.SiteI18n.t('setup.billiardsContactTopLeft'), '左上');
  assert.strictEqual(window.SiteI18n.t('runtime.billiardsRackDirection'), '请点击第二个点设置球框方向');
  assert.strictEqual(window.SiteI18n.t('debug.hexCoverOffset'), '六边形覆盖偏移');
  assert.strictEqual(window.SiteI18n.t('debug.hexCoverOffsetValue', { value: '0.50' }), '0.50 r');
  assert.strictEqual(window.SiteI18n.t('access.hexCoverOffsetX'), '六边形覆盖水平偏移');
  assert.strictEqual(window.SiteI18n.t('access.hexCoverOffsetY'), '六边形覆盖垂直偏移');
  assert.strictEqual(window.SiteI18n.t('online.waitingTitle'), '在线对局等待中');
  assert.strictEqual(window.SiteI18n.t('online.readyPlayerCountOne'), '1 名玩家已准备');
  assert.strictEqual(window.SiteI18n.t('online.readyPlayerCountMany', { count: 0 }), '0 名玩家已准备');
  assert.strictEqual(window.SiteI18n.t('online.waitingReadyRule'), '当前所有玩家准备后，游戏才会开始。');
  assert.deepStrictEqual(game.__test.onlineWaitingPromptCopy({ readyClientIds: [], clientId: 'local' }), {
    title: 'Online game waiting',
    context: '0 players prepared',
    rules: 'Every current player must be prepared before the game begins.',
    action: "I'm prepared",
    status: ''
  });
  assert.strictEqual(
    game.__test.onlineWaitingPromptCopy({ readyClientIds: ['local'], clientId: 'local' }).context,
    '1 player prepared'
  );
  assert.strictEqual(
    game.__test.onlineWaitingPromptCopy({ readyClientIds: ['another', 'local'], clientId: 'local' }).action,
    'not prepared'
  );
  assert.strictEqual(window.SiteI18n.t('setup.billiardsSoloRules'), '从白色母球向后拖动并松开击球。球会穿过粘合边，并从未粘合的边界反弹。将所有编号球打入袋中；母球落袋后可以自由摆放母球。');
  assert.ok(window.SiteI18n.t('setup.billiardsCompetitiveRules').includes('所有编号球入袋后，得分较高者获胜，同分则为和局。'));
  assert.strictEqual(window.SiteI18n.translateSource('yellow wins'), '黄方获胜！');
  assert.strictEqual(window.SiteI18n.translateSource('Chinese Checkers restarted'), '跳棋已重新开始');
}

function testBilliardsQuickRulesAvailability() {
  const base = {
    gameMode: game.GAME_MODES.BILLIARDS,
    balls: [],
    pockets: []
  };
  assert.strictEqual(game.billiardsQuickRulesAvailable(base), false);
  assert.strictEqual(game.billiardsQuickRulesAvailable({
    ...base,
    balls: [{ kind: 'cue', active: true }],
    pockets: [{ id: 'p1' }]
  }), false);
  assert.strictEqual(game.billiardsQuickRulesAvailable({
    ...base,
    balls: [{ kind: 'target', number: 1, active: true }],
    pockets: [{ id: 'p1' }]
  }), false);
  assert.strictEqual(game.billiardsQuickRulesAvailable({
    ...base,
    balls: [{ kind: 'cue', active: true }, { kind: 'target', number: 1, active: true }],
    pockets: [{ id: 'p1' }]
  }), true);
}

function testBilliardsReplayRestoresRoundSetup() {
  const preset = {
    id: 'billiards-replay-round-setup',
    lattice: 'square',
    rows: 3,
    cols: 3,
    removedTiles: [],
    cutEdges: [],
    gluedEdges: [],
    billiards: {
      pockets: [{ vertex: { row: 1, col: 1, corner: 'NW' } }],
      balls: [
        { id: 'cue', kind: 'cue', at: { row: 1, col: 1, x: 0, y: 0 } },
        { id: '1', kind: 'target', number: 1, at: { row: 3, col: 3, x: 0, y: 0 } }
      ]
    }
  };
  const initial = game.createBilliardsState(preset);
  const started = require('./billiards/topological_billiards_native.js').begin(initial).state;
  const finished = require('./billiards/topological_billiards_native.js').cloneState(started);
  finished.phase = 'gameover';
  finished.balls.find((ball) => ball.kind === 'target').active = false;
  const replay = game.restartBilliardsRound(finished);
  assert.strictEqual(replay.phase, 'ready');
  assert.strictEqual(replay.balls.filter((ball) => ball.kind === 'cue' && ball.active).length, 1);
  assert.strictEqual(replay.balls.filter((ball) => ball.kind === 'target' && ball.active).length, 1);
  assert.deepStrictEqual(replay.initialSetup, started.initialSetup);
}

async function run() {
  testFullscreenSettingsPreferencesAndMarkup();
  testReusableLocalizationWiring();
  testRuntimeChineseLocaleCatalog();
  testBilliardsPaletteRepaintsAfterLazyLoad();
  testBilliardsCueGuidanceAndQuickRules();
  testBilliardsDisplaySpaceShotDrag();
  testQuickRulesFadeAndHexSameTileHoverPersistence();
  testBilliardsQuickRulesAvailability();
  testBilliardsReplayRestoresRoundSetup();
  testInitialSpawnWeights();
  testRoundSpawnWeights();
  testNoSpawnAfterNoop();
  testGameOverWhenFullAndBlocked();
  testBombKeepsFullBoardPlayable();
  test2048BoxOrientationImportCloneAndSummary();
  testOrdinaryMergeOnce();
  testNewlyMergedTileBlocksLaterPush();
  testLongGluedChainConvergesBeforeBackMerge();
  testFaceToFaceSwapBouncesWithoutMoving();
  testOccupiedMovingResidentBlocksGroupMerge();
  testVacatingResidentSurvivesIncomingExplosion();
  testBlockedResidentPreventsGroupExplosion();
  testSameValueGroupMergesThroughVacatingResident();
  testStackedTileDoesNotExposeHiddenMerge();
  testMoveIntoBouncingResidentDoesNotStack();
  testMoveIntoLaterBouncingResidentDoesNotStack();
  testBounceOnlyDirectionsDoNotPreventGameOver();
  testExplosionModeForFullCycleBoard();
  testDownMoveAfterExplosionDoesNotStack();
  testBlockedResidentWithSuccessorPreventsGroupExplosion();
  testExplosionMoverVacatesSourceForBounceResolution();
  testPushedMoveCollisionCreatesBomb();
  testPushedMoveCollisionCanMerge();
  testMergeAndMoveShareAnimationStep();
  testMoveEventsAreGroupedByTick();
  testBouncesAndMovesShareTickAnimation();
  testGluedBoxRejoinsNextMovementStep();
  testGluedMergeCarriesPortalAnimationMove();
  testStoppedBlockerCanBePushedAfterGlue();
  testPushedBlockCanMerge();
  testPushChainLimitDebug();
  testPushLoopBreaksWhenItReturnsToActorDirection();
  testTorusGlueLoopExplosion();
  testKleinAndRamifiedSuccessors();
  testGlueHoverFindsMultiEdgeGroup();
  testGenus2PresetFromExport();
  testRandomGluePresetCoversBoundary();
  testRandomGluePresetIsDeterministicWithGlueRng();
  testBoundaryGlueBoardPresetSizingAndGlueModes();
  test2048BonusEndingEligibilityWithBombs();
  testTranslationCheckLifecycle();
  await testOnlineControlsVisibleForSinglePlayerModes();
  await testOnlineRoomSearchPopulatesSelect();
  await testOnlineRoomSearchEmptyResults();
  await testOnlineRoomSearchFailureHidesSelect();
  testPlacementReachAssistRoutesAndGroups();
  testAnimatedPlacementRayHintHelpers();
  await testTimedPlacementReachAssistInteractions();
  await testAnimatedPlacementRayHintInteractions();
  testPlacementHoverGuidanceRules();
  testHexCoverOffsetDiagnosticsAndConnectFourWrappedView();
  testWrappedNQueensTrayAndGlueHoverInteraction();
  testUniversalBoardDisplayAndCoordinates();
  testGoCaptureSuicideKoAndScoring();
  testGoGluedCaptureUsesSurfaceSuccessor();
  testReversiOpeningFlipsAndScoring();
  testReversiCenteredOpeningDimensions();
  testReversiGluedFlipAndLoopGuard();
  testReversiDiagonalFlipsAndAnimationMetadata();
  testChineseCheckersSetupMovesJumpsAndWin();
  testChineseCheckersSuperJumpRulesAndSegments();
  testChineseCheckersJumpRules();
  testPieceSetsInitializePlacementGames();
  testHexClassicPreset();
  testColouredHexQFilePreset();
  testHexClassicSuccessors();
  testGomokuAlternatingPlacement();
  testGomokuRejectsOccupiedAndRemovedTiles();
  testGomokuSquareHorizontalWin();
  testGomokuHexAxisWin();
  testGomokuSquareDiagonalWin();
  testGomokuDiagonalChecksAlternateStepOrders();
  testGomokuDiagonalTransportsAfterRotatingGlue();
  testGomokuDiagonalTransportsAfterReflectingGlue();
  testGomokuGluedEdgeWin();
  testDiagonalGluedLineUsesBoundaryCorner();
  testDiagonalGluedLineUsesCornerSharedWithPreviousTile();
  testDiagonalLineCrossingTwoGluedEdgesUsesOnlyEndpointHalves();
  testImportedSelfGluedDiagonalWinRendersNoAxisSegments();
  testGomokuCyclicReuseWin();
  testOfficialGomokuTorusUsesFiveInLineMultiplicity();
  testOfficialGomokuTorusLegacyImportUpgradesWinLength();
  testCustomGomokuThreeInLinePresetStillWorks();
  testConnectFourDropStopsAtBoundaryAndBlocker();
  testConnectFourCycleWarning();
  testConnectFourDropCarriesGluedRoute();
  testConnectFourEndsWhenInputHolesFilled();
  testConnectFourHorizontalWin();
  testConnectFourDiagonalWinDetection();
  testConnectFourDiagonalTransportsAfterReflectingGlue();
  testSokobanPresetRegistryAndSetup();
  testSokobanPlayerMovementAndMultiPlayerTransaction();
  testSokobanWallsAndBoxPushes();
  testSokobanSolvedRequiresAllTargetsCovered();
  testSokobanGluedEdgeMovementAndPush();
  testSokobanStatusRoundTripAndCompactImport();
  testSokobanIcePlayerSlidingAndSkiingBlockers();
  testSokobanIceBoxFrictionRules();
  testSokobanSeaTerrainAndUnderwaterCargo();
  testSokobanZStackedEnergyBridgesOnSea();
  testSokobanEnergyBeamFormationAndGluedRoutes();
  testSokobanEnergyBeamsRespectSeaZLevels();
  testSokobanEnergyBridgesAreBoxLikeCargo();
  testSokobanEnergyBeamPushesAndIceSliding();
  testSokobanStrictBeamGroupMovementAndBlockerDiagnostics();
  testSokobanOverlappingBeamsDoNotBlockBeamMovement();
  testSokobanBeamInteriorsCanCrossButStillBlockEnergyBridges();
  testExtraBackgroundPresets();
  testKeyboardMapping();
  testHexMovePadUsesArrowGlyphs();
  testMosaicBackgroundExportAndMinigameImportControlsExist();
  testCardHeadersCollapse();
  testPresetFromMosaicBackgroundExport();
  testPresetFromFullMosaicCalculatorExport();
  testPresetFromMosaicPresetJsWrapper();
  testUrlMinigamePresetImport();
  testUrlMinigamePresetImportInfersModeFromGroup();
  testMultiGroupImportedPresetFiltering();
  testLegacyGroupsImportedPresetFiltering();
  testGameTypesTakePrecedenceOverLegacyGroups();
  testCompactPresetDslParser();
  testSpeedControlDefaults();
  testSquareWasdKeyboardControls();
  testActiveSquareKeyboardPreventsPageScroll();
  testHexArrowKeyboardControls();
  testActiveHexKeyboardPreventsPageScroll();
  testHexVerticalArrowAloneDoesNotMove();
  testHexKeyboardStateClearsOnKeyupAndBlur();
  testKeyboardPreventsScrollWhileBusyWithoutMovingAgain();
  testKeyboardAllowsPageScrollOutsideActive2048();
  testKeyboardShortcutsUndoRedoAndReset();
  testSwipeRightMovesSquare2048();
  testShortSwipeDoesNotMove();
  testSwipeSuppressesFollowupClick();
  testSwipeIgnoredOutsideAccepting2048();
  testHexSwipeDirections();
  testDynamicPresetCatalogOptions();
  await testChineseCheckersLazyPresetModeSwitch();
  testRandomSetupAndPresetOptions();
  testImportExportCardDefaultsAndCatalogImport();
  testImportExportCardPastedPresetMode();
  testNewPlacementGameStatusRoundTrips();
  testNewPlacementGameAnimationsStartFromUi();
  testUnifiedLocalResultCard();
  testConnectFourResultCardAppearsAfterDropAnimation();
  testBackgroundExportFormats();
  testFullStatusImportWithoutDebugMode();
  testStepPauseRendersAfterSelectingNextEvent();
  testStationaryDifferentBlocks();
  testSimultaneousDifferentExplosion();
  testLargeExplosionCreatesRedBombAndClickClearsSurfaceNeighbors();
  testBlueBombClickRestoresWithoutMoveOrSpawn();
  testBombsBlockMovementSpawnAndGlue();
  testBombStatusImportCloneAndSummary();
  testSpawnAfterValidRound();
  testHeadlessDomStepControls();
  console.log('ramified_minigames_setup_test: all tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
