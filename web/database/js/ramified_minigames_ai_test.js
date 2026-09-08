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

function plainGomokuPreset(size = 15) {
  return {
    id: `plain-gomoku-${size}`,
    label: `Plain Gomoku ${size}`,
    lattice: 'square',
    rows: size,
    cols: size,
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

function testGomokuProfilesAndStaticPathCounts() {
  const plain = game.beginGomokuGame(plainGomokuPreset(15));
  const counts = ai.gomokuFivePathCounts(plain, { rules: game });
  assert.strictEqual(counts[0], 3, 'a plain-board corner belongs to three five-paths');
  assert.strictEqual(counts[112], 20, 'a plain-board center belongs to twenty five-paths');

  const wrapped = game.beginGomokuGame('boundary-glue-board');
  const wrappedCounts = ai.gomokuFivePathCounts(wrapped, { rules: game });
  assert.ok(wrappedCounts.every((count) => count === 20), 'the wrapped 15x15 board has twenty five-paths at every tile');

  const repeated = game.beginGomokuGame('gomoku-tic-tac-toe');
  const repeatedCounts = ai.gomokuFivePathCounts(repeated, { rules: game });
  assert.ok(repeatedCounts.every((count) => count === 12), 'the 3x3 torus counts distinct paths rather than tile multiplicity');

  const rubik = game.beginGomokuGame('rubiks-cube-3x3x3');
  const rubikCounts = ai.gomokuFivePathCounts(rubik, { rules: game });
  const rubikFaceCenters = [16, 49, 52, 55, 58, 88];
  assert.deepStrictEqual(
    rubikFaceCenters.map((index) => rubikCounts[index]),
    [34, 34, 34, 34, 34, 34],
    'all six symmetric Rubik cube face centers have the same complete five-path count'
  );
  const rubikTopology = ai.__test.buildTopology(rubik, game);
  assert.strictEqual(
    ai.__test.winningWindows(rubik, rubikTopology, game, 5).incident.get(16).length,
    12,
    'the legacy Aggressive topology remains unchanged'
  );

  const forced = game.beginGomokuGame({ ...stripPreset(5), rows: 5, id: 'profile-forced' });
  forced.stones = [0, 1, 2, 3].map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  forced.nextStoneId = 5;
  forced.round = 4;
  forced.turn = 'black';
  const legacyDefault = ai.chooseMove(forced, { rules: game, seed: 31, softBudgetMs: 20, hardBudgetMs: 40 });
  const aggressive = ai.chooseMove(forced, { rules: game, profile: 'aggressive', seed: 31, softBudgetMs: 20, hardBudgetMs: 40 });
  const challenging = ai.chooseMove(forced, { rules: game, profile: 'challenging', seed: 31, softBudgetMs: 40, hardBudgetMs: 80 });
  assert.deepStrictEqual(legacyDefault.move, aggressive.move, 'omitting the profile preserves the legacy Aggressive move');
  assert.strictEqual(legacyDefault.diagnostics.reason, aggressive.diagnostics.reason);
  assert.strictEqual(aggressive.diagnostics.profile, 'aggressive');
  assert.strictEqual(challenging.diagnostics.profile, 'challenging');
  assert.strictEqual(challenging.move.index, 4);
  assert.strictEqual(challenging.diagnostics.pruningTier, 1);

  const defense = game.beginGomokuGame({ ...stripPreset(5), rows: 5, id: 'profile-defense' });
  defense.stones = [0, 1, 2, 3].map((index, offset) => ({ id: offset + 1, index, color: 'white' }));
  defense.nextStoneId = 5;
  defense.round = 4;
  defense.turn = 'black';
  const challengingDefense = ai.chooseMove(defense, {
    rules: game,
    profile: 'challenging',
    seed: 37,
    softBudgetMs: 40,
    hardBudgetMs: 80
  });
  assert.strictEqual(challengingDefense.move.index, 4);
  assert.strictEqual(challengingDefense.diagnostics.pruningTier, 2);
}

function testIncrementalGomokuPositionAndThreats() {
  const state = game.beginGomokuGame(plainGomokuPreset(9));
  state.stones = [29, 20, 30, 40].map((index, offset) => ({
    id: offset + 1,
    index,
    color: offset % 2 ? 'white' : 'black'
  }));
  state.round = state.stones.length;
  state.turn = 'black';
  const topology = ai.__test.buildTopology(state, game);
  const position = ai.__test.createGomokuPosition(state, topology, game);
  const initial = {
    occupancy: Array.from(position.occupancyCodes),
    black: Array.from(position.blackCounts),
    white: Array.from(position.whiteCounts),
    hash: position.zobristHash
  };
  const first = ai.__test.applyGomokuOccupancy(position, 31, 'black');
  const second = ai.__test.applyGomokuOccupancy(position, 41, 'white');
  assert.ok(first && second);
  const rebuiltState = game.cloneGameState(state);
  rebuiltState.stones.push({ id: 5, index: 31, color: 'black' }, { id: 6, index: 41, color: 'white' });
  rebuiltState.round += 2;
  const rebuilt = ai.__test.createGomokuPosition(rebuiltState, topology, game);
  assert.deepStrictEqual(Array.from(position.occupancyCodes), Array.from(rebuilt.occupancyCodes));
  assert.deepStrictEqual(Array.from(position.blackCounts), Array.from(rebuilt.blackCounts));
  assert.deepStrictEqual(Array.from(position.whiteCounts), Array.from(rebuilt.whiteCounts));
  assert.strictEqual(position.zobristHash, rebuilt.zobristHash);
  ai.__test.undoGomokuOccupancy(position, second);
  ai.__test.undoGomokuOccupancy(position, first);
  assert.deepStrictEqual(Array.from(position.occupancyCodes), initial.occupancy);
  assert.deepStrictEqual(Array.from(position.blackCounts), initial.black);
  assert.deepStrictEqual(Array.from(position.whiteCounts), initial.white);
  assert.strictEqual(position.zobristHash, initial.hash);
  assert.strictEqual(position.deltaStack.length, 0);

  const threatState = game.beginGomokuGame(plainGomokuPreset(9));
  threatState.stones = [29, 30].map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  threatState.round = 2;
  threatState.turn = 'black';
  const threatTopology = ai.__test.buildTopology(threatState, game);
  const threatPosition = ai.__test.createGomokuPosition(threatState, threatTopology, game);
  const openThree = ai.__test.analyzeGomokuThreatMove(threatPosition, 31, 'black');
  assert.strictEqual(openThree.openThreeCount, 1, 'ordinary ..XXX.. is one traditional open three');
  assert.deepStrictEqual(openThree.openThreeGains.slice().sort((a, b) => a - b), [28, 32]);

  const openFourState = game.beginGomokuGame(plainGomokuPreset(9));
  openFourState.stones = [29, 30, 31].map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  openFourState.round = 3;
  openFourState.turn = 'black';
  const openFourPosition = ai.__test.createGomokuPosition(openFourState, threatTopology, game);
  const openFour = ai.__test.analyzeGomokuThreatMove(openFourPosition, 32, 'black');
  assert.strictEqual(openFour.openFour, true);
  assert.deepStrictEqual(openFour.winningCells, [28, 33]);

  const ramified = game.beginGomokuGame('gomoku-small-holes');
  ramified.stones = [19, 35].map((index, offset) => ({ id: offset + 1, index, color: 'black' }));
  ramified.round = 2;
  ramified.turn = 'black';
  const ramifiedTopology = ai.__test.buildTopology(ramified, game);
  const ramifiedPosition = ai.__test.createGomokuPosition(ramified, ramifiedTopology, game);
  const branchedThree = ai.__test.analyzeGomokuThreatMove(ramifiedPosition, 51, 'black');
  assert.strictEqual(branchedThree.openThreeCount, 2, 'distinct ramified continuation tiles create separate open threes');
  assert.ok(new Set(branchedThree.openThreeGains).size >= 2);
}

function testIncrementalGomokuAcrossBundledPresets() {
  game.presetListForMode('gomoku').forEach((preset) => {
    const state = game.beginGomokuGame(preset);
    const topology = ai.__test.buildTopology(state, game);
    const position = ai.__test.createGomokuPosition(state, topology, game);
    const initialHash = position.zobristHash;
    const deltas = [];
    const stones = [];
    topology.playable.slice(0, Math.min(6, topology.playable.length)).forEach((index, offset) => {
      const color = offset % 2 ? 'white' : 'black';
      const delta = ai.__test.applyGomokuOccupancy(position, index, color);
      assert.ok(delta, `incremental Gomoku apply succeeds for ${preset.id}`);
      deltas.push(delta);
      stones.push({ id: offset + 1, index, color });
      const rebuiltState = game.cloneGameState(state);
      rebuiltState.stones = stones.map((stone) => ({ ...stone }));
      rebuiltState.round = stones.length;
      const rebuilt = ai.__test.createGomokuPosition(rebuiltState, topology, game);
      assert.deepStrictEqual(Array.from(position.blackCounts), Array.from(rebuilt.blackCounts), `black windows match for ${preset.id}`);
      assert.deepStrictEqual(Array.from(position.whiteCounts), Array.from(rebuilt.whiteCounts), `white windows match for ${preset.id}`);
      assert.strictEqual(position.zobristHash, rebuilt.zobristHash, `hash matches for ${preset.id}`);
    });
    while (deltas.length) ai.__test.undoGomokuOccupancy(position, deltas.pop());
    assert.strictEqual(position.zobristHash, initialHash, `undo restores hash for ${preset.id}`);
    assert.strictEqual(position.deltaStack.length, 0, `undo clears delta stack for ${preset.id}`);
  });
}

function testStrictAndSafeGomokuPruning() {
  const state = game.beginGomokuGame(plainGomokuPreset(9));
  state.stones = [29, 20, 30, 40].map((index, offset) => ({
    id: offset + 1,
    index,
    color: offset % 2 ? 'white' : 'black'
  }));
  state.round = state.stones.length;
  state.turn = 'black';
  const topology = ai.__test.buildTopology(state, game);
  const position = ai.__test.createGomokuPosition(state, topology, game);
  const context = (safePruning) => ({
    hardDeadline: Date.now() + 5000,
    safePruning,
    timedOut: false,
    fallbackCandidates: []
  });
  const strict = ai.__test.challengingGomokuCandidates(position, 1, context(false), { root: true });
  const safeContext = context(true);
  const safe = ai.__test.challengingGomokuCandidates(position, 1, safeContext, { root: true });
  assert.ok(strict.tier < 8, 'fixture produces a tactical pruning tier');
  assert.strictEqual(strict.fallback.length, 0);
  assert.ok(safe.records.length >= strict.records.length);
  assert.ok(safeContext.fallbackCandidates.length > 0, 'safe pruning retains lower-tier fallback moves');
}

function testBundledPresetMoveLegality() {
  game.presetListForMode('gomoku').forEach((preset) => {
    const state = game.beginGomokuGame(preset);
    const selected = ai.chooseMove(state, { rules: game, softBudgetMs: 5, hardBudgetMs: 12, seed: 7 });
    assert.ok(selected.move, `Gomoku AI should return a move for ${preset.id}`);
    assert.ok(game.placeGomokuStone(state, selected.move.index).changed, `Gomoku AI move should be legal for ${preset.id}`);
    const challenging = ai.chooseMove(state, {
      rules: game,
      profile: 'challenging',
      softBudgetMs: 20,
      hardBudgetMs: 35,
      seed: 9
    });
    assert.ok(challenging.move, `Challenging Gomoku AI should return a move for ${preset.id}`);
    assert.ok(game.placeGomokuStone(state, challenging.move.index).changed, `Challenging Gomoku move should be legal for ${preset.id}`);
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
  assert.strictEqual((html.match(/value="local-ai-aggressive"/g) || []).length, 2, 'Aggressive is offered only for the two Gomoku sides');
  assert.ok(html.includes('id="gomoku-five-path-counts"'));
  assert.ok(html.includes('id="gomoku-ai-think-time" min="100" max="3000" step="100" value="1000"'));
  assert.ok(html.includes('id="gomoku-safe-pruning"'));
  const worker = fs.readFileSync(require.resolve('./ramified_minigames_ai_worker.js'), 'utf8');
  assert.ok(worker.includes('profile: request.profile'));
  assert.ok(worker.includes('safePruning: request.safePruning'));
  assert.ok(!html.includes('id="online-turn-feedback-row"'));
  assert.ok(!html.includes('id="chinese-checkers-ai-sight-style"'));
  assert.ok(!html.includes('id="chinese-checkers-ai-sight-duration"'));
  assert.ok(!html.includes('id="chinese-checkers-ai-sight-preview"'));
  const strategy = fs.readFileSync(require.resolve('../analysis/ramified_minigames_local_ai_strategy.md'), 'utf8');
  assert.ok(strategy.includes('routes are **not FIFO queues**'));
  assert.ok(strategy.includes('earliest occupied route position'));
  assert.ok(strategy.includes('No geometric-center or legal-hole-count bonus is permitted'));
}

function testChineseCheckersAiSightAndPauseReasonContract() {
  const geom = { radius: 20, cells: [{ x: 10, y: 15 }, { x: 50, y: 15 }] };
  const event = {
    kind: 'chineseCheckersMove',
    actor: 'ai',
    color: 'red',
    from: 0,
    to: 1,
    path: [0, 1],
    segments: [{ from: 0, to: 1, path: [0, 1], transitions: [] }],
    moveTime: 100,
    jumpPause: 0,
    leadInDuration: 1000,
    duration: 1100
  };
  const leadIn = game.__test.chineseCheckersMoveAnimationFrame(geom, event, 0.5);
  assert.strictEqual(leadIn.kind, 'lead-in');
  assert.deepStrictEqual(leadIn.point, { x: 10, y: 15 });
  const travel = game.__test.chineseCheckersMoveAnimationFrame(geom, event, 0.95);
  assert.notStrictEqual(travel.kind, 'lead-in');
  const humanFrame = game.__test.chineseCheckersMoveAnimationFrame(geom, { ...event, actor: 'human', leadInDuration: 0, duration: 100 }, 0.1);
  assert.notStrictEqual(humanFrame.kind, 'lead-in', 'human Chinese Checkers moves do not receive an AI sight hold');
  ['crosshair', 'corners', 'rings'].forEach((style) => {
    const sight = game.__test.chineseCheckersAiSightGeometry({ x: 10, y: 15 }, 12, style, 0.25);
    assert.strictEqual(sight.style, style);
    assert.ok(sight.lines.length + sight.circles.length >= 4);
  });
  const sightAt = (progress, reducedMotion = false) => game.__test.chineseCheckersAiSightGeometry(
    { x: 10, y: 15 },
    12,
    'rings',
    progress,
    reducedMotion
  );
  const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.001, `${label}: ${actual}`);
  near(sightAt(0).scale, 1.95, 'sight begins large');
  near(sightAt(0).alpha, 0, 'sight begins transparent');
  near(sightAt(0.22).scale, 1.213, 'sight shrinks during fade-in');
  near(sightAt(0.22).alpha, 0.88, 'sight reaches full opacity');
  near(sightAt(0.56).scale, 1, 'sight settles at its normal size');
  near(sightAt(0.82).scale, 1, 'sight holds at its normal size');
  near(sightAt(0.91).scale, 0.9825, 'sight tightens slightly during fade-out');
  near(sightAt(0.91).alpha, 0.44, 'sight fades evenly before travel');
  near(sightAt(1).scale, 0.965, 'sight ends with a slight tightening');
  near(sightAt(1).alpha, 0, 'sight is transparent when travel begins');
  near(sightAt(0.22, true).scale, 1, 'reduced motion disables the shrink');
  const settledRings = sightAt(0.56);
  near(settledRings.circles[0].radius, 12 * 0.84, 'settled inner ring preserves its geometry');
  near(settledRings.circles[1].radius, 12 * 1.26, 'settled outer ring preserves its geometry');
  assert.deepStrictEqual(
    game.__test.chineseCheckersAiSightConfig(),
    { color: 'red', style: 'rings', duration: 1000 },
    'the AI sight is a fixed red, 1000 ms concentric target'
  );
  assert.strictEqual(game.__test.normalizeChineseCheckersAiSightStyle('unknown'), 'rings');
  assert.strictEqual(game.__test.normalizeChineseCheckersAiSightDuration(100), 200);
  assert.strictEqual(game.__test.normalizeChineseCheckersAiSightDuration(524), 500);
  assert.strictEqual(game.__test.normalizeChineseCheckersAiSightDuration(1200), 1000);
  assert.ok(game.__test.chineseCheckersMovingInfo({ color: 'red' }).includes('moving'));
  assert.strictEqual(
    game.__test.chineseCheckersAnimationHintColor(
      { gameMode: 'chinese-checkers', turn: 'yellow' },
      { event: { kind: 'chineseCheckersMove', color: 'red' } }
    ),
    'red',
    'Chinese Checkers source and destination hints retain the moving color during animation'
  );
  assert.strictEqual(
    game.__test.chineseCheckersAnimationHintColor(
      { gameMode: 'chinese-checkers', turn: 'yellow' },
      { event: { kind: 'connectFourDrop', color: 'red' } }
    ),
    '',
    'unrelated animations do not override Chinese Checkers turn hints'
  );
  game.__test.setLocalAiPauseReasonForTest('history');
  assert.strictEqual(game.__test.resumeLocalAiAfterReplacementHumanMove(), true);
  assert.strictEqual(game.__test.getLocalAiRuntimeState().pauseReason, '');
  game.__test.setLocalAiPauseReasonForTest('manual');
  assert.strictEqual(game.__test.resumeLocalAiAfterReplacementHumanMove(), false);
  assert.strictEqual(game.__test.getLocalAiRuntimeState().pauseReason, 'manual');
  game.__test.setLocalAiPauseReasonForTest('error');
  assert.strictEqual(game.__test.resumeLocalAiAfterReplacementHumanMove(), false);
  game.__test.setLocalAiPauseReasonForTest('');
}

function run() {
  ai.__test.clearCaches();
  testNonContiguousFirstBlockerLandings();
  testOverlappingRouteUpdateAndSkippedSuffix();
  testBoundaryAndCyclicRoutes();
  testCachedTraversalAndUndoRandomized();
  testThreatClassifications();
  testForcedWinsAndChineseCheckersMove();
  testGomokuProfilesAndStaticPathCounts();
  testIncrementalGomokuPositionAndThreats();
  testIncrementalGomokuAcrossBundledPresets();
  testStrictAndSafeGomokuPruning();
  testConnectFourForcedWinAndCompleteDefense();
  testBundledPresetMoveLegality();
  testControllerUiAndStrategyContract();
  testChineseCheckersAiSightAndPauseReasonContract();
  console.log('ramified_minigames_ai_test: all tests passed');
}

run();
