'use strict';

const assert = require('assert');
const { createHeadlessDomHarness } = require('./ramified_minigames_setup_test.js');

async function run() {
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
  console.log('ramified_minigames_player_test: startup, menu preservation and save/restore passed');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
