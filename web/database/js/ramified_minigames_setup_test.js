const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const game = require('./ramified_minigames_setup.js');

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

function stateWithBoxes(presetId, boxes) {
  const state = game.createGameState(presetId);
  state.boxes = boxes;
  state.nextBoxId = boxes.reduce((max, item) => Math.max(max, item.id + 1), 1);
  return state;
}

function testInitialSpawnWeights() {
  const rng = game.createRng([0, 0.99, 0, 0.99]);
  const state = game.beginGame('classic-4x4', { rng });
  assert.strictEqual(state.boxes.length, 2);
  assert.deepStrictEqual(state.boxes.map((item) => item.value), [4, 4]);
  assert.ok(state.boxes.every((item) => item.value <= 4));
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

function testGluedBoxRejoinsNextMovementStep() {
  const state = stateWithBoxes('torus', [
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
  const merge = result.events.find((event) => event.kind === 'merge');
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
  assert.ok(result.events.some((event) => event.kind === 'merge' && event.newValue === 8));
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
  const state = stateWithBoxes('torus', [box(1, 1, 1, 2)]);
  const result = game.simulateRound(state, game.DIRS.E, { spawn: false });
  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.state.boxes.length, 0);
  assert.ok(result.state.removed.has(game.indexOf(1, 4, 4)));
  assert.ok(result.events.some((event) => event.kind === 'explode'));
}

function testKleinAndRamifiedSuccessors() {
  const klein = game.createGameState('klein-bottle');
  const kleinStep = game.surfaceSuccessor(klein, game.indexOf(1, 4, 4), game.DIRS.E);
  assert.strictEqual(kleinStep.kind, 'glued');
  assert.strictEqual(kleinStep.index, game.indexOf(4, 1, 4));
  assert.strictEqual(kleinStep.dir, game.DIRS.E);

  const ramified = game.createGameState('ramified-cover');
  const ramifiedStep = game.surfaceSuccessor(ramified, game.indexOf(2, 3, 9), game.DIRS.S);
  assert.strictEqual(ramifiedStep.kind, 'glued');
  assert.strictEqual(ramifiedStep.index, game.indexOf(3, 9, 9));
  assert.strictEqual(ramifiedStep.dir, game.DIRS.S);
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
  assert.ok(result.state.removed.has(game.indexOf(2, 2, 3)));
  assert.ok(result.events.some((event) => event.kind === 'explode' && event.value === 2));
}

function testLargeExplosionClearsSurfaceNeighbors() {
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
  assert.ok(result.state.removed.has(game.indexOf(2, 2, 3)));
  assert.deepStrictEqual(result.state.boxes, []);
  const clear = result.events.find((event) => event.kind === 'clearNumbers');
  assert.ok(clear);
  assert.ok(clear.indices.includes(game.indexOf(1, 2, 3)));
  assert.ok(clear.indices.includes(game.indexOf(2, 3, 3)));
  assert.ok(!result.state.removed.has(game.indexOf(1, 2, 3)));
  assert.ok(!result.state.removed.has(game.indexOf(2, 3, 3)));
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
}

function makeElement(id, extra = {}) {
  return {
    id,
    value: '',
    checked: false,
    disabled: false,
    textContent: '',
    style: {},
    clientWidth: 720,
    parentElement: null,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
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
  const canvas = makeElement('mosaic-canvas', {
    parentElement: wrap,
    getContext() {
      return ctx;
    },
    focus() {}
  });
  [
    canvas,
    makeElement('surface-preset-select', { value: 'torus' }),
    makeElement('number-box-style', { value: 'paper' }),
    makeElement('begin-game'),
    makeElement('animation-speed', { value: '80' }),
    makeElement('animation-speed-value'),
    makeElement('step-mode', { checked: true }),
    makeElement('next-step'),
    makeElement('status-badge'),
    makeElement('status-line'),
    makeElement('info-line'),
    makeElement('score-value'),
    makeElement('highest-tile-value'),
    makeElement('existing-tile-value'),
    makeElement('removed-tile-value'),
    makeElement('round-value')
  ].forEach((element) => elements.set(element.id, element));
  moveButtons.forEach((button) => elements.set(button.id, button));

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
      addEventListener(type, handler) {
        documentListeners[type] = handler;
        if (type === 'DOMContentLoaded') handler();
      },
      querySelectorAll(selector) {
        return selector === '[data-move-dir]' ? moveButtons : [];
      }
    },
    window: {
      devicePixelRatio: 1,
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

  elements.get('begin-game').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'ready');
  assert.strictEqual(elements.get('highest-tile-value').textContent, '2');
  assert.strictEqual(moveButtons.some((button) => button.disabled), false);

  moveButtons.find((button) => button.getAttribute('data-move-dir') === 'E').listeners.click();
  assert.strictEqual(elements.get('status-badge').textContent, 'step');
  assert.strictEqual(elements.get('next-step').disabled, false);
  assert.strictEqual(moveButtons.every((button) => button.disabled), true);
  assert.strictEqual(elements.get('animation-speed-value').textContent, '80 ms');
}

function run() {
  testInitialSpawnWeights();
  testRoundSpawnWeights();
  testNoSpawnAfterNoop();
  testGameOverWhenFullAndBlocked();
  testOrdinaryMergeOnce();
  testMoveEventsAreGroupedByTick();
  testGluedBoxRejoinsNextMovementStep();
  testGluedMergeCarriesPortalAnimationMove();
  testStoppedBlockerCanBePushedAfterGlue();
  testPushedBlockCanMerge();
  testPushChainLimitDebug();
  testPushLoopBreaksWhenItReturnsToActorDirection();
  testTorusGlueLoopExplosion();
  testKleinAndRamifiedSuccessors();
  testStationaryDifferentBlocks();
  testSimultaneousDifferentExplosion();
  testLargeExplosionClearsSurfaceNeighbors();
  testSpawnAfterValidRound();
  testHeadlessDomStepControls();
  console.log('ramified_minigames_setup_test: all tests passed');
}

run();
