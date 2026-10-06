'use strict';

const assert = require('assert');
const { createHeadlessDomHarness } = require('./ramified_minigames_setup_test.js');
const { restartDefaultBindings } = require('./ramified_minigames_setup.js').__test;
const inputSettings = require('./calculator_input_settings.js');

async function run() {
  assert.deepStrictEqual(restartDefaultBindings(), ['r'], 'new players receive R for restart');
  assert.deepStrictEqual(restartDefaultBindings({ __global__: { undo: ['r'] } }), [], 'a custom global R must not be reassigned');
  assert.deepStrictEqual(restartDefaultBindings({ 'sokoban:square': { 'direction-0': ['r'] } }, 'sokoban:square'), [], 'a custom directional R must not be reassigned');
  assert.deepStrictEqual(restartDefaultBindings({ 'sokoban:square': { 'direction-0': ['r'] } }, 'hex:hexagonal'), ['r'], 'a different input profile keeps its own bindings');
  for (const binding of [[], ['t']]) {
    const session = { data: { profiles: { __global__: { restart: binding } } }, profile: () => 'sokoban:square' };
    const action = { id: 'restart', storageProfile: 'global', defaultBindings: restartDefaultBindings(session.data.profiles, session.profile()) };
    assert.deepStrictEqual(inputSettings.__test.actionBindings(session, action), binding, 'explicit unbinding and remapping override the new default');
  }
  for (const [mode, preset] of [['2048', 'ramified-cover'], ['sokoban', 'classic-fans'], ['gomoku', 'wormhole']]) {
    const harness = createHeadlessDomHarness({ playerShell: true, gameMode: mode, preset });
    const { context, elements } = harness;
    const engine = context.window.RamifiedMinigames;
    assert.strictEqual(engine.player.state().ready, true, `${mode}: catalog ready`);
    assert.strictEqual(engine.player.snapshot(), null, `${mode}: previews must not overwrite saves`);
    assert.strictEqual(elements.get('game-mode-select').value, mode, 'player startup must preserve the selected game');

    elements.get('begin-game').listeners.click();
    assert.strictEqual(engine.player.state().active, true, `${mode}: begin`);
    const originalState = engine.__test.getGame();
    engine.player.setMenuOpen(true);
    assert.strictEqual(engine.__test.getGame(), originalState, 'opening menus must preserve the live game');
    const saved = JSON.parse(JSON.stringify(engine.player.snapshot()));
    assert.ok(saved?.payload, `${mode}: stable game can be saved`);
    engine.player.prepare();
    assert.strictEqual(engine.player.state().active, false, `${mode}: new game preview`);
    assert.strictEqual(engine.player.snapshot(), null, 'a new preview must not replace the last game');
    await engine.player.restore(saved);
    assert.strictEqual(engine.player.state().active, true, `${mode}: restore`);
    const restored = JSON.parse(JSON.stringify(engine.player.snapshot()));
    for (const key of ['gameMode', 'round', 'phase', 'boxes', 'stones', 'sokoban', 'removed']) {
      assert.deepStrictEqual(restored.payload[key], saved.payload[key], `${mode}: preserved ${key}`);
    }
    const beforeInvalid = engine.__test.getGame();
    await assert.rejects(engine.player.restore({ version: 0 }));
    assert.strictEqual(engine.__test.getGame(), beforeInvalid, 'invalid save must not replace the game');
  }
  const harness = createHeadlessDomHarness({ playerShell: true, gameMode: 'gomoku', preset: 'boundary-glue-board' });
  const { context, elements, canvas } = harness;
  const engine = context.window.RamifiedMinigames;
  const player = engine.player;
  assert.strictEqual(await player.beginSetup('gomoku'), true);
  const preview = engine.__test.getGame();
  assert.strictEqual(preview.preset.id, 'boundary-glue-board');
  assert.strictEqual(preview.preset.boundaryGlueMode, 'open');
  assert.strictEqual(preview.preset.rows, 15);
  assert.strictEqual(preview.preset.cols, 15);
  assert.strictEqual(preview.preset.gluedEdges.length, 0);
  assert.strictEqual(elements.get('gomoku-black-controller').value, 'human');
  assert.strictEqual(elements.get('gomoku-white-controller').value, 'local-ai-challenging');
  assert.strictEqual(player.snapshot(), null, 'a first setup is not a saved game');
  // A chosen controller must survive browsing another board.
  elements.get('gomoku-white-controller').value = 'local-ai-aggressive';
  assert.strictEqual(await player.selectPreset('wormhole'), true);
  assert.strictEqual(elements.get('gomoku-white-controller').value, 'local-ai-aggressive');
  await player.selectPreset('boundary-glue-board');
  elements.get('boundary-glue-mode').value = 'random';
  elements.get('boundary-glue-mode').listeners.change();
  const randomBoard = JSON.stringify(engine.__test.getGame().preset.gluedEdges);
  assert.strictEqual(player.commitSetup(), true);
  assert.strictEqual(JSON.stringify(engine.__test.getGame().preset.gluedEdges), randomBoard, 'start uses the exact random board preview');

  // Start an ordinary board, make a move, then browse and cancel without losing undo.
  assert.strictEqual(await player.beginSetup('gomoku'), true);
  elements.get('gomoku-white-controller').value = 'human';
  assert.strictEqual(player.commitSetup(), true);
  player.setMenuOpen(false);
  canvas.listeners.click({ clientX: 57, clientY: 57 });
  assert.strictEqual(elements.get('undo-step').disabled, false);
  player.setMenuOpen(true);
  const original = engine.__test.getGame();
  const originalSave = JSON.stringify(player.snapshot().payload.stones);
  await player.beginSetup('gomoku');
  assert.strictEqual(JSON.stringify(player.snapshot().payload.stones), originalSave, 'browsing cannot overwrite the live save');
  elements.get('gomoku-board-size').value = '9';
  elements.get('gomoku-board-size').listeners.change();
  assert.strictEqual(engine.__test.getGame().preset.rows, 9);
  player.cancelSetup();
  assert.strictEqual(engine.__test.getGame(), original, 'cancel restores the same live game object');
  assert.strictEqual(elements.get('gomoku-board-size').value, '15');
  assert.strictEqual(elements.get('gomoku-white-controller').value, 'human');
  assert.strictEqual(elements.get('undo-step').disabled, false, 'cancel preserves undo history');
  elements.get('undo-step').listeners.click();
  assert.strictEqual(engine.__test.getGame().round, 0);
  assert.strictEqual(elements.get('redo-step').disabled, false);
  const afterUndo = engine.__test.getGame();
  // A synchronous preview/render failure must roll back, not drop the live game.
  const drawing = canvas.getContext('2d');
  const fillRect = drawing.fillRect;
  let failOnce = true;
  drawing.fillRect = (...args) => {
    if (failOnce) { failOnce = false; throw new Error('preview failure'); }
    return fillRect(...args);
  };
  await assert.rejects(player.beginSetup('gomoku'), /preview failure/);
  drawing.fillRect = fillRect;
  assert.strictEqual(engine.__test.getGame(), afterUndo);
  assert.strictEqual(player.state().browsing, false);
  assert.strictEqual(elements.get('redo-step').disabled, false, 'failure preserves redo history');
  for (const mode of ['2048', 'sokoban', 'go', 'connect-four', 'reversi', 'chinese-checkers', 'fide-chess']) {
    assert.strictEqual(await player.beginSetup(mode), true, `${mode}: legacy setup remains accessible`);
    player.cancelSetup();
    assert.strictEqual(engine.__test.getGame(), afterUndo, `${mode}: cancellation preserves previous game`);
  }
  const lazy = createHeadlessDomHarness({ playerShell: true, gameMode: 'gomoku', preset: 'boundary-glue-board', preloadPresetData: false, loadLazyPresetScripts: true });
  const lazyEngine = lazy.context.window.RamifiedMinigames;
  assert.doesNotThrow(() => lazyEngine.player.fit(), 'initial layout must not render an unloaded preset');
  for (let i = 0; i < 5 && !lazyEngine.player.state().ready; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(await lazyEngine.player.beginSetup('gomoku'), true);
  assert.strictEqual(lazyEngine.player.commitSetup(), true);
  const retained = lazyEngine.__test.getGame();
  await lazyEngine.player.beginSetup('gomoku');
  const pendingBoard = lazyEngine.player.presets().find((item) => lazyEngine.PRESETS.find((preset) => preset.id === item.id).__lazyPreset);
  const pendingFile = lazy.context.window.RAMIFIED_MINIGAME_PRESETS.presets.find((preset) => preset.id === pendingBoard.id).file;
  const appendScript = lazy.context.document.head.appendChild;
  let delayedScript = null;
  lazy.context.document.head.appendChild = (script) => {
    if (script.src.includes(pendingFile)) { delayedScript = script; return script; }
    return appendScript(script);
  };
  const pending = lazyEngine.player.selectPreset(pendingBoard.id);
  assert.ok(delayedScript);
  lazyEngine.player.cancelSetup();
  appendScript(delayedScript);
  assert.strictEqual(await pending, false, 'a late load is ignored after cancellation');
  assert.strictEqual(lazyEngine.__test.getGame(), retained);
  assert.strictEqual(lazyEngine.player.state().browsing, false);
  console.log('ramified_minigames_player_test: defaults, draft preview, cancel/failure history, exact start and save/restore passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
