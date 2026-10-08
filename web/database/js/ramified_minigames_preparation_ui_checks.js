'use strict';

const assert = require('assert');
const { waitFor } = require('./math_workspace_drag_regression_test.js');

// Runs in the real browser session used by the player UI regression suite.
module.exports = async function checkPreparationPages({ client, mouse, read, click, ready, set, resize, shot, menuHome, revealGame }) {
  const defaults = [
    ['hex', 'classic-hex', 12, 17], ['go', 'boundary-glue-board', 19, 19],
    ['reversi', 'boundary-glue-board', 8, 8], ['2048', 'boundary-glue-board', 4, 4],
    ['chinese-checkers', 'small-classic', 13, 10], ['fide-chess', 'fide-chess-8x8', 8, 8],
    ['billiards', 'half-glued', 4, 4], ['lianliankan', 'boundary-glue-board', 6, 6]
  ];
  const state = () => read('RamifiedMinigames.player.state()');
  const exitPreparation = async mode => {
    await click('#player-back');
    if (mode === 'fide-chess') await click('#player-back');
  };
  for (const [mode, preset, rows, cols] of defaults) {
    await menuHome(); await click('#player-new'); await revealGame(mode);
    await click(`[data-game-mode="${mode}"]`);
    if (mode === 'fide-chess') {
      // Merely opening the category page must not load chess boards.
      assert.strictEqual(await read('document.querySelector("#player-chess-category").hidden'), false);
      await click('[data-chess-category="game"]');
    }
    await ready();
    assert.deepStrictEqual(await read('(() => { const p = RamifiedMinigames.__test.getGame().preset; return [p.id, p.rows, p.cols]; })()'), [preset, rows, cols], mode);
    assert.strictEqual(await read('document.querySelector("#player-setup-players").hidden'), true, mode + ': no artificial two-player row');
    for (const locale of ['en', 'zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      for (const width of [1280, 390, 320]) {
        await resize(width);
        await read('document.querySelector(".player-setup-main").scrollTop = 0');
        assert.strictEqual(await read(`(() => {
          const n = document.querySelector('.player-setup-main'), f = document.querySelector('.player-setup-footer').getBoundingClientRect(), m = document.querySelector('#player-menu').getBoundingClientRect();
          return n.scrollWidth <= n.clientWidth && f.bottom <= m.bottom + 1 && f.right <= m.right + 1;
        })()`), true, mode + ': bounded layout');
        if (mode === 'chinese-checkers') {
          assert.strictEqual(await read('getComputedStyle(document.querySelector("#chinese-checkers-player-options")).gridTemplateColumns.split(" ").length'), width > 600 ? 3 : 2);
          assert.strictEqual(await read('[...document.querySelectorAll("#chinese-checkers-player-options select")].every(n => n.getBoundingClientRect().width >= 90)'), true, 'player choices remain readable');
        }
        await shot(`preparation-${mode}-${width}-${locale}`);
        if (mode === 'chinese-checkers') {
          await read('document.querySelector("#chinese-checkers-player-options select:last-child").scrollIntoView({block:"end"})');
          await shot(`preparation-${mode}-${width}-${locale}-players`);
        }
        if (!await read('document.querySelector("#player-more").disabled')) {
          await click('#player-more'); await shot(`preparation-${mode}-${width}-${locale}-more`); await click('#player-back');
        }
      }
    }
    await resize(1280);
    // Fullscreen changes the containing element; invoke the same engine action with a user gesture.
    await client.send('Runtime.evaluate', { expression: 'RamifiedMinigames.player.fullscreen()', userGesture: true, awaitPromise: true });
    await waitFor(() => read('!!document.fullscreenElement'), 5000, mode + ': fullscreen');
    assert.strictEqual(await read('document.querySelector("#player-menu").clientWidth === innerWidth'), true);
    await shot(`preparation-${mode}-fullscreen`);
    await read('document.exitFullscreen()');
    if (mode === 'chinese-checkers') {
      assert.deepStrictEqual(await read('[...document.querySelectorAll("#chinese-checkers-player-options select")].map(n => [n.dataset.color, n.value])'),
        ['black', 'white', 'red', 'yellow', 'blue', 'green'].map(color => [color, color === 'black' ? 'human' : 'local-ai-challenging']));
      await read(`(() => { const n = document.querySelector('#chinese-checkers-player-options select[data-color="green"]'); n.value = 'hidden'; n.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    }
    if (mode === 'lianliankan') {
      await set('lianliankan-tile-set', 'japanese');
      assert.strictEqual(await read('document.querySelector("#lianliankan-tile-level-row").hidden'), false);
      await set('lianliankan-tile-level', 'japanese-katakana');
    }
    // Browse every board through the actual arrows, returning to the draft.
    const count = await read(`RamifiedMinigames.player.presets().filter(p => '${mode}' !== 'fide-chess' || p.fideChessVariant === 'game').length`);
    for (let i = 0; i < count; i++) {
      await click('#player-board-next'); await ready();
      assert.strictEqual((await state()).setupError, false, mode + ': preset load');
    }
    assert.strictEqual((await state()).presetId, preset, JSON.stringify(await read('({mode:RamifiedMinigames.player.state().mode,presets:RamifiedMinigames.player.presets(),options:[...document.querySelector("#surface-preset-select").options].map(o=>o.value)})')));
    assert.deepStrictEqual(await read('(() => { const p=RamifiedMinigames.__test.getGame().preset; return [p.rows,p.cols]; })()'), [rows, cols]);
    if (mode === 'chinese-checkers') {
      assert.strictEqual(await read('document.querySelector("#chinese-checkers-player-options select[data-color=green]").value'), 'hidden');
    }
    if (mode === 'lianliankan') {
      assert.strictEqual(await read('document.querySelector("#lianliankan-tile-set").value'), 'japanese');
      assert.strictEqual(await read('document.querySelector("#lianliankan-tile-level").value'), 'japanese-katakana');
    }
    if (mode === 'fide-chess') {
      await click('#player-back'); await click('[data-chess-category="kingless-puzzle"]'); await ready();
      assert.strictEqual((await state()).presetId, 'n-queens-puzzle');
      for (let i = 0; i < 4; i++) {
        assert.strictEqual(await read('RamifiedMinigames.__test.getGame().fideChessVariant'), 'kingless-puzzle');
        await click('#player-board-next'); await ready();
      }
      await click('#player-more'); await set('gomoku-board-size', '7'); await click('#player-back');
      await click('#player-back'); await click('[data-chess-category="game"]'); await ready();
      assert.strictEqual((await state()).presetId, 'fide-chess-8x8');
      await click('#player-back'); await click('[data-chess-category="kingless-puzzle"]'); await ready();
      assert.strictEqual(await read('RamifiedMinigames.__test.getGame().preset.rows'), 7, 'category round trip retains puzzle draft');
    }
    if (mode === 'billiards') {
      await click('#player-more'); await set('billiards-tile-length', '0.2'); await click('#player-edit-balls');
      assert.strictEqual(await read('document.querySelector("#player-menu").hidden'), true);
      if (!await read('document.querySelector("#player-actions").open')) await click('#player-actions > summary');
      assert.strictEqual(await read('document.querySelector("#billiards-ball-palette-row").hidden'), false);
      await shot('billiards-arrange-balls');
      await click('#billiards-ball-palette [data-ball-key="5"]');
      await click('#player-actions > summary');
      const beforeBalls = await read('JSON.stringify(RamifiedMinigames.__test.getGame().balls)');
      const point = await read(`(() => {
        const canvas = document.querySelector('#mosaic-canvas'), r = canvas.getBoundingClientRect(), choice = {kind:'target',number:5};
        for (let y = .15; y < .9; y += .1) for (let x = .15; x < .9; x += .1) {
          const event = {clientX:r.x+r.width*x,clientY:r.y+r.height*y};
          if (document.elementFromPoint(event.clientX,event.clientY) !== canvas) continue;
          const local = RamifiedMinigames.__test.billiardsPlacementLocalFromEvent(event,choice);
          if (local && TopologicalBilliardsNative.placeBall(RamifiedMinigames.__test.getGame(),choice,local.tileIndex,local.position).changed) return {x:event.clientX,y:event.clientY};
        }
        return null;
      })()`);
      assert(point, 'an unoccupied placement point exists');
      await mouse(client, 'mousePressed', point.x, point.y, 1); await mouse(client, 'mouseReleased', point.x, point.y, 0);
      const arranged = await read('JSON.stringify(RamifiedMinigames.__test.getGame().balls)');
      assert.notStrictEqual(arranged, beforeBalls, 'placing a numbered ball edits the original board');
      await click('#fullscreen-settings-open'); await click('#player-menu-button');
      await click('#player-board-next'); await ready(); await click('#player-board-previous'); await ready();
      assert.strictEqual(await read('document.querySelector("#billiards-tile-length").value'), '0.2', 'physical board dimensions survive browsing');
      assert.strictEqual(await read('JSON.stringify(RamifiedMinigames.__test.getGame().balls)'), arranged, 'browsing retains the arrangement');
      await click('#player-begin'); await click('#player-confirm-new');
      assert.strictEqual(await read('JSON.stringify(RamifiedMinigames.__test.getGame().balls)'), arranged, 'start uses the arrangement');
      await menuHome(); await click('#player-new'); await revealGame(mode); await click(`[data-game-mode="${mode}"]`); await ready();
    }
    // Leaving the preparation completely, then reentering, restores defaults.
    await exitPreparation(mode); await click(`[data-game-mode="${mode}"]`);
    if (mode === 'fide-chess') await click('[data-chess-category="game"]');
    await ready();
    assert.strictEqual((await state()).presetId, preset);
    if (mode === 'hex') await waitFor(() => read('RamifiedMinigames.__test.getGame().hexTopologyState !== "pending"'), 30000, 'Hex topology');
    const before = await read('JSON.stringify(RamifiedMinigames.__test.getGame().preset.gluedEdges)');
    await click('#player-begin'); await click('#player-confirm-new');
    await waitFor(() => read('!RamifiedMinigames.player.state().browsing && document.querySelector("#player-menu").hidden'), 10000, mode + ': actual start');
    assert.strictEqual(await read('JSON.stringify(RamifiedMinigames.__test.getGame().preset.gluedEdges)'), before);
    assert.strictEqual(await read('RamifiedMinigames.player.snapshot().payload.gameMode'), mode, mode + ': save');
    if (mode === 'chinese-checkers') {
      await menuHome(); await click('#player-new'); await revealGame(mode); await click(`[data-game-mode="${mode}"]`); await ready();
      await read(`(() => { const n = document.querySelector('#chinese-checkers-player-options select[data-color="black"]'); n.value = 'local-ai-challenging'; n.dispatchEvent(new Event('change', { bubbles:true })); })()`);
      await click('#player-begin'); await click('#player-confirm-new');
      await waitFor(() => read('RamifiedMinigames.__test.getGame().round > 0'), 20000, 'checkers AI makes an actual move');
    }
    console.log('Preparation verified:', mode);
  }
};
