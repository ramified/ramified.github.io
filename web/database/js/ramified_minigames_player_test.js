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
  console.log('ramified_minigames_player_test: shortcut defaults, startup, menu preservation and save/restore passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
