'use strict';
const assert = require('assert');
const vm = require('vm');
const progressApi = require('./ramified_minigames_sokoban_progress.js');
const { createHeadlessDomHarness } = require('./ramified_minigames_setup_test.js');
const catalog = require('../ramified_minigame_presets/presets.js');
const levels = catalog.presets.filter(p => p.gameTypes.includes('Sokoban'));
const ids = levels.map(p => p.id);

async function run() {
  assert.deepStrictEqual(ids, ['classic-fans', 'pedestrian', 'classic-fans-glue', 'ice-test', 'curling-on-cube', 'easy-energy-bridge', 'energy-test', 'cross', 'expand', 'expand2', 'expand3', 'bridges-blocking', 'orbox-b', 'orbox-b-glued', 'loop', 'curling', 'remote-rotate', 'remote-control', 'islands']);
  for (const level of levels) {
    assert(level.file.startsWith('sokoban/'));
    assert.strictEqual(require('../ramified_minigame_presets/' + level.file).id, level.id);
  }
  let stored;
  const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const progress = progressApi.create(ids, storage);
  assert.deepStrictEqual(progress.snapshot().unlocked, ids.slice(0, 3));
  assert.strictEqual(progress.complete(ids[4]), false, 'locked levels cannot award progress');
  assert.strictEqual(progress.complete(ids[1]), true);
  assert.deepStrictEqual(progress.snapshot().unlocked, ids.slice(0, 4), 'out-of-order win opens the first locked level');
  assert.strictEqual(progress.complete(ids[1]), false, 'repeat/undo/redo win awards nothing');
  assert.strictEqual(progress.complete(ids[0]), true);
  assert.deepStrictEqual(progress.snapshot().unlocked, ids.slice(0, 5));
  assert.deepStrictEqual(progressApi.create(ids, storage).snapshot(), progress.snapshot(), 'refresh persists IDs');
  const reordered = [...ids].reverse();
  const retained = progressApi.normalize(reordered, progress.snapshot());
  assert(progress.snapshot().unlocked.every(id => retained.unlocked.includes(id)), 'future reordering does not revoke IDs');
  for (const id of ids) progress.complete(id);
  assert.strictEqual(progress.snapshot().completed.length, 19);
  assert.strictEqual(progress.snapshot().unlocked.length, 19);
  assert.strictEqual(progress.complete(ids[18]), false);
  assert.deepStrictEqual(progressApi.normalize(ids.slice(0, 2), null).unlocked, ids.slice(0, 2));
  const unavailable = progressApi.create(ids, { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); } });
  assert(unavailable.failed());
  assert(unavailable.complete(ids[0]));
  assert.strictEqual(unavailable.snapshot().unlocked.length, 4, 'storage failure keeps session progress');
  assert(unavailable.failed());

  const h = createHeadlessDomHarness({ playerShell: true, gameMode: 'gomoku', preset: 'boundary-glue-board' });
  const engine = h.context.window.RamifiedMinigames, player = engine.player;
  for (const id of ids) {
    assert.strictEqual(await player.beginSetup('sokoban', { presetId: id }), true, id + ': load');
    assert.strictEqual(engine.sokobanSetupIssue(engine.__test.getGame()), '', id + ': valid setup');
    assert.strictEqual(player.commitSetup({ sokobanLevelId: id }), true, id + ': start');
    assert.strictEqual(player.state().sokobanLevelId, id);
  }
  await player.beginSetup('sokoban', { presetId: ids[0] }); player.commitSetup({ sokobanLevelId: ids[0] });
  let state = engine.__test.getGame();
  for (const dir of 'EWSSNWWENN') state = engine.moveSokobanPlayers(state, engine.DIRS[dir]).state;
  assert.strictEqual(state.winner, 'solved', 'real first-level solution');
  assert.strictEqual(state.playerSokobanLevelId, ids[0], 'movement clones retain official identity');
  engine.__test.setGame(state);
  const saved = JSON.parse(JSON.stringify(player.snapshot()));
  assert.strictEqual(saved.version, 1);
  assert.strictEqual(saved.sokobanLevelId, ids[0]);
  await player.beginSetup('gomoku'); player.cancelSetup();
  assert.strictEqual(player.state().sokobanLevelId, ids[0], 'canceled browsing keeps identity');
  await player.restore(saved);
  assert.strictEqual(player.state().solved, true);
  assert.strictEqual(player.state().sokobanLevelId, ids[0]);
  assert.strictEqual(h.elements.get('canvas-start-begin').textContent, 'Next level');
  const again = JSON.parse(JSON.stringify(player.snapshot()));
  await player.restore(again);
  assert.strictEqual(player.state().sokobanLevelId, ids[0], 'multiple save/restore cycles retain ID');
  // Use a solved-state fixture to check the final-level prompt separately from puzzle difficulty.
  player.setSokobanProgress(ids.slice(0, 16));
  await player.restore({ ...saved, sokobanLevelId: ids[18] });
  assert.strictEqual(h.elements.get('canvas-start-title').textContent, 'Level 19 complete');
  assert.strictEqual(h.elements.get('canvas-start-begin').textContent, 'Choose a level');
  assert.strictEqual(h.elements.get('canvas-start-close').hidden, true);
  player.setSokobanProgress(ids);
  assert.strictEqual(h.elements.get('canvas-start-title').textContent, 'All levels complete');
  delete again.sokobanLevelId;
  await player.restore(again);
  assert.strictEqual(player.state().sokobanLevelId, null, 'legacy/imported states do not claim campaign identity');
  assert.strictEqual(engine.gameStateFromDebugImportPayload(saved.payload).state.playerSokobanLevelId, undefined);

  const mosaic = require('./mosaic_calculator.js').__test;
  for (const entry of levels) {
    const data = require('../ramified_minigame_presets/' + entry.file);
    const imported = mosaic.normalizeExportImportPayload(mosaic.materializeMinigamePresetForMosaic(entry, data));
    assert(imported.rows > 0 && imported.cols > 0, entry.id + ': calculator import');
  }
  mosaic.setTestBoard({ rows: 4, cols: 4 });
  mosaic.setTestExportControls({ type: 'minigame', format: 'dsl', label: 'New Sokoban Level', group: 'Sokoban' });
  let source = mosaic.buildExportText();
  assert.match(source, /Save this file as ramified_minigame_presets\/sokoban\/new_sokoban_level\.preset\.js/);
  const scope = { module: { exports: {} }, globalThis: {} }; vm.runInNewContext(source, scope);
  const exported = scope.module.exports;
  assert.strictEqual(exported.id, 'new-sokoban-level');
  const entry = mosaic.minigamePresetRegistryEntry();
  mosaic.setTestBoard(mosaic.normalizeExportImportPayload(mosaic.materializeMinigamePresetForMosaic(entry, exported)));
  mosaic.setTestExportControls({ type: 'minigame', format: 'dsl', label: 'New Sokoban Level', group: 'Sokoban' });
  assert(mosaic.minigamePresetRegistryEntry().file.startsWith('sokoban/'));
  mosaic.setTestExportControls({ type: 'minigame', group: 'Gomoku' });
  assert(!mosaic.minigamePresetRegistryEntry().file.includes('/'), 'other game exports remain at root');
  console.log('ramified_minigames_sokoban_test: catalog, distinct clears, persistence, 19 starts, real solve, identity and exporter passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
