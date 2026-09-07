const assert = require('assert');
const fs = require('fs');
const game = require('./ramified_minigames_setup.js');
const ai = require('./ramified_minigames_ai.js');

function stripPreset(cols = 4) {
  return {
    id: `ai-strip-${cols}`,
    label: `AI strip ${cols}`,
    lattice: 'square',
    rows: 1,
    cols,
    surface: 'test',
    removedTiles: [],
    cutEdges: [],
    gluedEdges: []
  };
}

function connectState(preset, holes, tokens = [], fallDir = game.DIRS.E) {
  const state = game.beginConnectFourGame(preset, { holes, fallDir });
  state.tokens = tokens.map((index, offset) => ({ id: offset + 1, index, color: offset % 2 ? 'yellow' : 'red' }));
  state.nextTokenId = state.tokens.length + 1;
  state.round = state.tokens.length;
  state.turn = state.tokens.length % 2 ? 'yellow' : 'red';
  return state;
}

function routePosition(state) {
  const topology = ai.__test.buildTopology(state, game);
  return { topology, position: ai.__test.createConnectFourPosition(state, topology) };
}

function testNonContiguousFirstBlockerLandings() {
  const preset = stripPreset(4);
  let state = connectState(preset, [0], [2]);
  let { position } = routePosition(state);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), 1, 'B occupied and C empty must land at A');

  state = connectState(preset, [0], [1]);
  position = routePosition(state).position;
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), 0, 'A occupied must land on the input hole');

  state = connectState(preset, [0], [0]);
  position = routePosition(state).position;
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), null, 'occupied input hole must be rejected');
  assert.deepStrictEqual(ai.__test.legalConnectFourMoves(position), []);
}

function testOverlappingRouteUpdateAndSkippedSuffix() {
  const state = connectState(stripPreset(4), [0, 1]);
  const { position } = routePosition(state);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), 3);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 1), 3);
  const delta = ai.__test.applyConnectFourOccupancy(position, 2, 'red');
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), 1);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 1), 1, 'overlapping arrival must update the other hole');
  assert.strictEqual(ai.__test.prefixHolesForTile(position, 3).size, 0, 'tiles behind the nearer blocker are unreachable');
  ai.__test.undoConnectFourOccupancy(position, delta);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 0), 3);
  assert.strictEqual(ai.__test.cachedConnectFourLanding(position, 1), 3);
}

function torusPreset() {
  const source = game.PRESETS.find((preset) => preset.id === 'gomoku-tic-tac-toe');
  assert.ok(source, 'torus preset is available');
  return JSON.parse(JSON.stringify(source));
}

function testBoundaryAndCyclicRoutes() {
  let state = connectState(stripPreset(4), [0]);
  let data = routePosition(state);
  const boundary = data.topology.connectFourRoutes.routes.get(0);
  assert.strictEqual(boundary.termination, 'boundary');
  assert.strictEqual(ai.__test.cachedConnectFourLanding(data.position, 0), 3);

  state = connectState(torusPreset(), [0], [], game.DIRS.E);
  data = routePosition(state);
  const cycle = data.topology.connectFourRoutes.routes.get(0);
  assert.strictEqual(cycle.termination, 'cycle');
  assert.strictEqual(ai.__test.cachedConnectFourLanding(data.position, 0), null, 'unblocked cycle is rejected');
  state.tokens = [{ id: 1, index: 2, color: 'red' }];
  data = routePosition(state);
  assert.notStrictEqual(ai.__test.cachedConnectFourLanding(data.position, 0), null, 'a blocker before repetition makes a cyclic route usable');
}

function normalizeLanding(value) {
  return Number.isInteger(value) ? value : null;
}

function testCachedTraversalAndUndoRandomized() {
  let state = connectState({ ...stripPreset(7), rows: 6, id: 'ai-standard' }, Array.from({ length: 7 }, (_, index) => index), [], game.DIRS.S);
  const { topology, position } = routePosition(state);
  const initial = Array.from(position.dynamic.entries()).map(([hole, entry]) => [hole, { ...entry }]);
  const landingSnapshot = () => Array.from(position.landingToHoles.entries())
    .map(([tile, holes]) => [tile, Array.from(holes).sort((a, b) => a - b)])
    .sort((left, right) => left[0] - right[0]);
  const initialLandings = landingSnapshot();
  const initialOccupancy = Array.from(position.occupancy.entries());
  const initialCodes = Array.from(position.occupancyCodes);
  const initialHash = position.zobristHash;
  const deltas = [];
  for (let turn = 0; turn < 20 && state.phase !== 'gameover'; turn += 1) {
    const legal = ai.__test.legalConnectFourMoves(position);
    legal.forEach((hole) => {
      const full = game.connectFourDropTarget(state, hole, state.fallDir);
      const expected = full.cycle ? null : full.index;
      assert.strictEqual(normalizeLanding(ai.__test.cachedConnectFourLanding(position, hole)), normalizeLanding(expected));
    });
    if (!legal.length) break;
    const hole = legal[(turn * 5 + 1) % legal.length];
    const result = game.placeConnectFourToken(state, hole);
    assert.ok(result.changed);
    deltas.push(ai.__test.applyConnectFourOccupancy(position, result.token.index, result.token.color));
    state = result.state;
  }
  while (deltas.length) ai.__test.undoConnectFourOccupancy(position, deltas.pop());
  assert.deepStrictEqual(Array.from(position.dynamic.entries()), initial, 'search undo restores every first-blocker entry');
  assert.deepStrictEqual(landingSnapshot(), initialLandings, 'search undo restores reverse landing maps');
  assert.deepStrictEqual(Array.from(position.occupancy.entries()), initialOccupancy, 'search undo restores occupancy');
  assert.deepStrictEqual(Array.from(position.occupancyCodes), initialCodes, 'search undo restores typed occupancy');
  assert.strictEqual(position.zobristHash, initialHash, 'search undo restores the incremental position hash');
  assert.strictEqual(position.deltaStack.length, 0);
  assert.ok(topology.connectFourRoutes.tileReverse.size > 0);
}

function testThreatClassifications() {
  const state = connectState({ ...stripPreset(4), rows: 4, id: 'threat-grid' }, [0], [], game.DIRS.E);
  state.tokens = [
    { id: 1, index: 2, color: 'yellow' },
    { id: 2, index: 4, color: 'red' },
    { id: 3, index: 8, color: 'red' },
    { id: 4, index: 12, color: 'red' }
  ];
  state.nextTokenId = 5;
  state.turn = 'red';
  const { position } = routePosition(state);
  const current = ai.__test.classifyConnectFourThreat(state, position, 1, 'red', game);
  assert.strictEqual(current.score, 6000);
  assert.ok(current.currentHoles.has(0));
  const latentPoisoned = ai.__test.classifyConnectFourThreat(state, position, 0, 'red', game);
  assert.strictEqual(latentPoisoned.score, 1400);
  assert.ok(latentPoisoned.prefixHoles.has(0));
  assert.ok(latentPoisoned.poisonedInputs.has(0));
  const unreachable = ai.__test.classifyConnectFourThreat(state, position, 3, 'red', game);
  assert.strictEqual(unreachable.score, 0);
  assert.strictEqual(unreachable.permanentlyUnreachable, true);
}

function testForcedWinsAndChineseCheckersMove() {
  const gomoku = game.beginGomokuGame({ ...stripPreset(5), rows: 5, id: 'ai-gomoku' });
  gomoku.stones = [0, 1, 2, 3].map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  gomoku.nextStoneId = 5;
  gomoku.round = 4;
  gomoku.turn = 'black';
  const gomokuMove = ai.chooseMove(gomoku, { rules: game, softBudgetMs: 30, hardBudgetMs: 60 });
  assert.strictEqual(gomokuMove.move.index, 4);
  assert.strictEqual(gomokuMove.diagnostics.reason, 'forced-win');
  assert.deepStrictEqual(gomokuMove.diagnostics.move, gomokuMove.move);
  assert.ok(Object.prototype.hasOwnProperty.call(gomokuMove.diagnostics, 'scoreComponents'));
  assert.ok(Object.prototype.hasOwnProperty.call(gomokuMove.diagnostics, 'routeDeltas'));

  const checkers = game.beginChineseCheckersGame('classic-chinese-checkers');
  const checkersMove = ai.chooseMove(checkers, { rules: game, softBudgetMs: 30, hardBudgetMs: 60 });
  assert.ok(checkersMove.move && Number.isInteger(checkersMove.move.from) && Number.isInteger(checkersMove.move.to));
  assert.ok(game.placeChineseCheckerMarble(checkers, checkersMove.move.from, checkersMove.move.to, { stepwise: false }).changed);
}

function testBundledPresetMoveLegality() {
  game.presetListForMode('gomoku').forEach((preset) => {
    const state = game.beginGomokuGame(preset);
    const selected = ai.chooseMove(state, { rules: game, softBudgetMs: 5, hardBudgetMs: 12, seed: 7 });
    assert.ok(selected.move, `Gomoku AI should return a move for ${preset.id}`);
    assert.ok(game.placeGomokuStone(state, selected.move.index).changed, `Gomoku AI move should be legal for ${preset.id}`);
  });
  game.presetListForMode('connect-four').forEach((preset) => {
    const state = game.beginConnectFourGame(preset);
    const { position } = routePosition(state);
    const legal = ai.__test.legalConnectFourMoves(position);
    const selected = ai.chooseMove(state, { rules: game, softBudgetMs: 5, hardBudgetMs: 12, seed: 11 });
    if (!legal.length) {
      assert.strictEqual(selected.move, null, `Connect Four AI should report no move for blocked ${preset.id}`);
      return;
    }
    assert.ok(selected.move, `Connect Four AI should return a move for ${preset.id}`);
    assert.ok(game.placeConnectFourToken(state, selected.move.index).changed, `Connect Four AI move should be legal for ${preset.id}`);
  });
  game.presetListForMode('chinese-checkers').forEach((preset) => {
    const state = game.beginChineseCheckersGame(preset);
    const selected = ai.chooseMove(state, { rules: game, softBudgetMs: 5, hardBudgetMs: 12, seed: 13 });
    assert.ok(selected.move, `Chinese Checkers AI should return a move for ${preset.id}`);
    assert.ok(game.placeChineseCheckerMarble(state, selected.move.from, selected.move.to, { stepwise: false }).changed,
      `Chinese Checkers AI move should be legal for ${preset.id}`);
  });
}

function testConnectFourForcedWinAndCompleteDefense() {
  const makeState = (color, turn) => {
    const state = game.beginConnectFourGame('connect-four-6x7');
    state.tokens = [35, 28, 21].map((index, offset) => ({ id: offset + 1, index, color }));
    state.nextTokenId = 4;
    state.round = 3;
    state.turn = turn;
    return state;
  };
  const winningState = makeState('red', 'red');
  const win = ai.chooseMove(winningState, { rules: game, softBudgetMs: 20, hardBudgetMs: 40, seed: 17 });
  assert.strictEqual(win.move.index, 0);
  assert.strictEqual(win.diagnostics.reason, 'forced-win');
  const defendedState = makeState('yellow', 'red');
  const defense = ai.chooseMove(defendedState, { rules: game, softBudgetMs: 20, hardBudgetMs: 40, seed: 19 });
  assert.strictEqual(defense.move.index, 0);
  assert.strictEqual(defense.diagnostics.reason, 'forced-block');
  const defended = game.placeConnectFourToken(defendedState, defense.move.index);
  const { position } = routePosition(defended.state);
  assert.strictEqual(ai.__test.immediateConnectFourWins(defended.state, position, game, 'yellow').length, 0);
}

function testControllerUiAndStrategyContract() {
  const html = fs.readFileSync(require.resolve('../ramified_minigames.html'), 'utf8');
  assert.ok(html.includes('id="gomoku-black-controller"'));
  assert.ok(html.includes('id="connect-four-yellow-controller"'));
  assert.ok(html.includes('id="local-ai-pause"'));
  assert.ok(html.includes('value="local-ai-challenging"'));
  const strategy = fs.readFileSync(require.resolve('../analysis/ramified_minigames_local_ai_strategy.md'), 'utf8');
  assert.ok(strategy.includes('routes are **not FIFO queues**'));
  assert.ok(strategy.includes('earliest occupied route position'));
  assert.ok(strategy.includes('No geometric-center or legal-hole-count bonus is permitted'));
}

function run() {
  ai.__test.clearCaches();
  testNonContiguousFirstBlockerLandings();
  testOverlappingRouteUpdateAndSkippedSuffix();
  testBoundaryAndCyclicRoutes();
  testCachedTraversalAndUndoRandomized();
  testThreatClassifications();
  testForcedWinsAndChineseCheckersMove();
  testConnectFourForcedWinAndCompleteDefense();
  testBundledPresetMoveLegality();
  testControllerUiAndStrategyContract();
  console.log('ramified_minigames_ai_test: all tests passed');
}

run();
