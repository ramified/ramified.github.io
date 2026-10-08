'use strict';

// Uses the repository's isolated Edge/Chromium harness (Node 22+).
// Optional: RAMIFIED_UI_SCREENSHOTS=/path/to/output node js/ramified_minigames_player_ui_test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, mouse, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer();
  let session;
  try {
    session = await launchBrowser(`http://127.0.0.1:${server.address().port}/ramified_minigames.html`);
    const { client } = session;
    const errors = [];
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    });
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    const read = expression => evaluate(client, expression);
    const ready = () => waitFor(() => read('window.RamifiedMinigames?.player.state().ready && !document.querySelector("#player-board-next").disabled'), 15000, 'player ready');
    const click = async selector => {
      const point = await waitFor(() => read(`(() => {
        const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find(n => n.getClientRects().length && !n.disabled);
        if (!node) return null;
        node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const rect = node.getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        return node.contains(document.elementFromPoint(x, y)) ? { x, y } : null;
      })()`), 5000, `click ${selector}`);
      await mouse(client, 'mousePressed', point.x, point.y, 1);
      await mouse(client, 'mouseReleased', point.x, point.y, 0);
    };
    const key = async (key, code, virtualKey) => {
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
    };
    const set = (id, value) => read(`(() => { const n = document.getElementById(${JSON.stringify(id)}); n.value = ${JSON.stringify(value)}; n.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const board = () => read(`(() => { const p = RamifiedMinigames.__test.getGame().preset; return [p.id, p.rows, p.cols, p.boundaryGlueMode]; })()`);
    const resize = async width => {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: width > 600 ? 900 : 844, deviceScaleFactor: 1, mobile: false });
      await delay(100);
    };
    const shot = async name => {
      if (!process.env.RAMIFIED_UI_SCREENSHOTS) return;
      await read(`Promise.all([...document.querySelectorAll('#player-game-list img')].filter(img => img.getClientRects().length).map(img => img.decode().catch(() => {})))`);
      const output = path.resolve(process.env.RAMIFIED_UI_SCREENSHOTS);
      fs.mkdirSync(output, { recursive: true });
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(data, 'base64'));
    };
    const dimensions = () => read(`(() => {
      const ids = ['player-board-previous', 'player-board-preview', 'player-board-next', 'player-board-name', 'player-setup-players', 'player-begin', 'player-more', 'player-menu'];
      return Object.fromEntries(ids.map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [id, { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height }]; }));
    })()`);
    const menuHome = async () => {
      await click('#fullscreen-settings-open'); await click('#player-menu-button'); await click('#player-home-button');
    };
    const visibleGames = () => read(`[...document.querySelectorAll('#player-game-list > button:not([hidden])')].map(button => button.dataset.gameMode)`);
    const revealGame = async mode => {
      while (await read(`document.querySelector('[data-game-mode="${mode}"]').hidden`)) {
        const before = await read(`(() => { const buttons = [...document.querySelector('#player-game-list').children]; return buttons.findIndex(b => b.dataset.gameMode === '${mode}') < buttons.findIndex(b => !b.hidden); })()`);
        await click(before ? '#player-games-previous' : '#player-games-next');
      }
    };
    const checkGamePage = async count => {
      const layout = await read(`(() => {
        const page = document.querySelector('#player-games'), bounds = page.getBoundingClientRect();
        const buttons = [...document.querySelectorAll('#player-game-list > button:not([hidden])')];
        return { count: buttons.length, columns: new Set(buttons.map(b => Math.round(b.getBoundingClientRect().x))).size,
          rows: new Set(buttons.map(b => Math.round(b.getBoundingClientRect().y))).size,
          contained: buttons.every(b => { const r = b.getBoundingClientRect(); return r.x >= bounds.x && r.right <= bounds.right && r.y >= bounds.y && r.bottom <= bounds.bottom; }),
          labelsFit: buttons.every(b => { const n = b.querySelector('.player-game-name'); return n.scrollWidth <= n.clientWidth && n.scrollHeight <= n.clientHeight + 1; }),
          noScroll: page.scrollWidth <= page.clientWidth && page.scrollHeight <= page.clientHeight,
          arrows: ['player-games-previous', 'player-games-next'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.y >= bounds.y && r.bottom <= bounds.bottom; }) };
      })()`);
      assert.deepStrictEqual(layout, { count, columns: 3, rows: 2, contained: true, labelsFit: true, noScroll: true, arrows: [true, true] });
    };
    await resize(1280);
    await ready();
    assert.strictEqual(await read('document.querySelector("#player-continue").disabled'), true);
    await click('#player-new');
    await waitFor(() => read(`(() => {
      const images = [...document.querySelectorAll('#player-game-list img')];
      return images.length === 11 && images.every(img => img.complete && img.naturalWidth > 0);
    })()`), 15000, 'all game pictures loaded');
    const gameChoices = await read(`(() => {
      window.originalGamePictures = [...document.querySelectorAll('#player-game-list img')];
      return [...document.querySelectorAll('#player-game-list > button')].map(button => {
        const img = button.querySelector('img'), style = getComputedStyle(img);
        return { mode: button.dataset.gameMode, file: img.getAttribute('src').split('/').pop(), alt: img.alt,
          width: img.clientWidth, height: img.clientHeight, fit: style.objectFit, label: button.textContent.trim() };
      });
    })()`);
    assert.strictEqual(gameChoices.length, 11);
    for (const game of gameChoices) {
      const file = game.mode === 'fide-chess' ? 'chess.png' : game.mode.replaceAll('-', '_') + '.png';
      assert.strictEqual(game.file, file, `${game.mode}: matching picture`);
      assert.strictEqual(game.alt, '', 'visible game name labels the decorative picture');
      assert.strictEqual(game.fit, 'contain');
      if (game.width) assert(Math.min(game.width, game.height) > 150, 'desktop pictures are larger than the old 80px size');
      assert(game.label);
    }
    assert.deepStrictEqual(await visibleGames(), gameChoices.slice(0, 6).map(game => game.mode));
    assert.strictEqual(await read('document.querySelector("#player-games-previous").disabled'), true);
    await checkGamePage(6);
    await shot('games-desktop-en');
    await read('SiteI18n.setLocale("zh-CN")');
    assert.strictEqual(await read(`window.originalGamePictures.every((img, index) => img === document.querySelectorAll('#player-game-list img')[index])`), true, 'language changes keep pictures in place');
    assert.deepStrictEqual(await read(`[...document.querySelectorAll('#player-game-list .player-game-name')].map(node => node.textContent)`), await read('RamifiedMinigames.player.games().map(game => game.label)'));
    await shot('games-desktop-zh');
    await read('document.querySelector("#player-games-next").focus()');
    await key('Enter', 'Enter', 13);
    assert.deepStrictEqual(await visibleGames(), gameChoices.slice(6).map(game => game.mode));
    assert.strictEqual(await read('document.querySelector("#player-games-next").disabled'), true);
    assert.strictEqual(await read('document.activeElement.dataset.gameMode'), gameChoices[6].mode, 'end-page arrow transfers focus to a visible game');
    await checkGamePage(5); await shot('games-desktop-page-2');
    await read('SiteI18n.setLocale("en")');
    assert.deepStrictEqual(await visibleGames(), gameChoices.slice(6).map(game => game.mode), 'language change keeps page');
    await read('SiteI18n.setLocale("zh-CN")');
    await click('#player-games-previous');
    for (const width of [390, 320]) {
      await resize(width);
      await checkGamePage(6); await shot(`games-${width}-page-1`);
      await click('#player-games-next'); await checkGamePage(5);
      await click(`#player-game-list [data-game-mode="${gameChoices.at(-1).mode}"] img`); await ready();
      assert.strictEqual(await read('RamifiedMinigames.player.state().mode'), gameChoices.at(-1).mode);
      await click('#player-back');
      assert.deepStrictEqual(await visibleGames(), gameChoices.slice(6).map(game => game.mode), 'Back keeps the selected game page');
      await shot(`games-${width}-page-2`);
      await read('SiteI18n.setLocale("en")');
      await checkGamePage(5); await shot(`games-${width}-en-page-2`);
      await click('#player-games-previous'); await checkGamePage(6);
      await read('SiteI18n.setLocale("zh-CN")');
    }
    await resize(1280);
    await read('SiteI18n.setLocale("en")');
    await read(`document.querySelector('#player-game-list > button').focus()`);
    await key('Tab', 'Tab', 9);
    assert.strictEqual(await read('document.activeElement.dataset.gameMode'), gameChoices[1].mode);
    await key('Enter', 'Enter', 13); await ready();
    assert.strictEqual(await read('RamifiedMinigames.player.state().mode'), gameChoices[1].mode);
    await click('#player-back');
    for (const game of gameChoices) {
      await revealGame(game.mode);
      await click(`#player-game-list [data-game-mode="${game.mode}"] img`); await ready();
      if (game.mode === 'fide-chess') {
        assert.strictEqual(await read('document.querySelector("#player-chess-category").hidden'), false);
        await click('[data-chess-category="game"]'); await ready();
      }
      if (game.mode === 'sokoban') assert.strictEqual(await read('document.querySelector("#player-levels").hidden'), false, 'Sokoban opens the level list without changing the live board');
      else assert.strictEqual(await read('RamifiedMinigames.player.state().mode'), game.mode, 'picture click opens its game');
      await click('#player-back');
      if (game.mode === 'fide-chess') await click('#player-back');
    }
    await revealGame('gomoku');
    // A failed image retains the button's name and click target.
    await read(`document.querySelector('[data-game-mode="gomoku"] img').src = 'assets/ramified_minigames/board_game_stickers/missing-ui-test.png'`);
    await waitFor(() => read(`getComputedStyle(document.querySelector('[data-game-mode="gomoku"] img')).visibility === 'hidden'`), 5000, 'missing picture fallback');
    assert.strictEqual(await read(`document.querySelector('[data-game-mode="gomoku"] .player-game-name').textContent`), 'Gomoku');
    await click('[data-game-mode="gomoku"]'); await ready();
    await read(`(() => { const img = document.querySelector('[data-game-mode="gomoku"] img'); img.src = 'assets/ramified_minigames/board_game_stickers/gomoku.png'; img.style.visibility = ''; })()`);
    assert.deepStrictEqual(await board(), ['boundary-glue-board', 15, 15, 'open']);
    assert.strictEqual(await read('document.querySelector("#player-second-controller").textContent'), 'AI — Challenging');
    const layout = await dimensions();
    assert(layout['player-board-previous'].right <= layout['player-board-preview'].x);
    assert(layout['player-board-next'].x >= layout['player-board-preview'].right);
    assert(Math.abs(layout['player-board-previous'].y + layout['player-board-previous'].height / 2 - layout['player-board-preview'].y - layout['player-board-preview'].height / 2) < 2);
    assert(layout['player-board-name'].y >= layout['player-board-preview'].bottom);
    assert(layout['player-setup-players'].y >= layout['player-board-name'].bottom);
    assert(layout['player-begin'].x > layout['player-more'].right);
    await shot('desktop-en');

    await click('#player-first-previous');
    assert.strictEqual(await read('document.querySelector("#gomoku-black-controller").value'), 'local-ai-aggressive');
    await click('#player-first-next');
    assert.strictEqual(await read('document.querySelector("#gomoku-black-controller").value'), 'human');
    await read('document.querySelector("#player-second-next").focus()');
    await key('Enter', 'Enter', 13);
    assert.strictEqual(await read('document.querySelector("#gomoku-white-controller").value'), 'local-ai-aggressive');
    await click('#player-second-previous');
    await click('#player-more');
    assert.strictEqual(await read('document.querySelector("#player-board-options").hidden'), false);
    assert.strictEqual(await read('document.activeElement.id'), 'boundary-glue-mode');
    await set('boundary-glue-shape', 'rectangle');
    await set('boundary-glue-rows', '9'); await set('boundary-glue-cols', '13'); await set('boundary-glue-mode', 'torus');
    await shot('more-en');
    await key('Escape', 'Escape', 27);
    assert.strictEqual(await read('document.activeElement.id'), 'player-more');
    assert.strictEqual(await read('RamifiedMinigames.player.state().browsing'), true);
    const afterMore = await dimensions();
    assert.deepStrictEqual(afterMore['player-begin'], layout['player-begin'], 'More must not move the start button');
    assert.deepStrictEqual(afterMore['player-board-preview'], layout['player-board-preview'], 'More must not resize the preview');
    await click('#player-board-next'); await ready();
    await click('#player-board-previous'); await ready();
    assert.deepStrictEqual(await board(), ['boundary-glue-board', 9, 13, 'torus']);
    await read('SiteI18n.setLocale("zh-CN")');
    assert.strictEqual(await read('document.querySelector("#player-second-controller").textContent'), 'AI—挑战');
    await shot('desktop-zh');

    for (const width of [390, 320]) {
      await resize(width);
      assert.strictEqual(await read('document.documentElement.scrollWidth <= innerWidth && document.querySelector(".player-setup-main").scrollWidth <= document.querySelector(".player-setup-main").clientWidth'), true, 'no horizontal overflow');
      const sizes = await dimensions();
      assert.strictEqual(sizes['player-board-previous'].y, sizes['player-board-next'].y, 'both board arrows stay aligned on narrow screens');
      assert(sizes['player-begin'].bottom <= sizes['player-menu'].bottom);
      assert(sizes['player-begin'].right <= sizes['player-menu'].right);
      await read('document.querySelector(".player-setup-main").scrollTop = 0'); await delay(100); await shot(`narrow-${width}-top`);
      await click('#player-second-next'); await click('#player-second-previous'); await shot(`narrow-${width}-players`);
      await click('#player-more'); await set('boundary-glue-cols', '13'); await click('#player-back');
      assert.deepStrictEqual(await board(), ['boundary-glue-board', 9, 13, 'torus']);
    }
    await read('SiteI18n.setLocale("en")');
    await click('#player-second-next'); await shot('narrow-320-en');
    assert.strictEqual(await read('document.querySelector(".player-setup-main").scrollWidth <= document.querySelector(".player-setup-main").clientWidth'), true);
    const longestWordFits = () => read(`(() => {
      const output = document.querySelector('#player-second-controller');
      const context = document.createElement('canvas').getContext('2d');
      context.font = getComputedStyle(output).font;
      return output.textContent.split(/[\\s—]+/).every(word => context.measureText(word).width <= output.clientWidth);
    })()`);
    assert.strictEqual(await longestWordFits(), true, 'Aggressive must not break inside the word');
    await click('#player-second-previous');
    assert.strictEqual(await longestWordFits(), true, 'Challenging must not break inside the word');
    await read('SiteI18n.setLocale("zh-CN")');
    await resize(1280);
    await click('#player-begin');
    assert.strictEqual(await read('RamifiedMinigames.player.state().active && !RamifiedMinigames.player.state().browsing'), true);
    assert.deepStrictEqual(await board(), ['boundary-glue-board', 9, 13, 'torus']);
    await read('window.retainedPlayerGame = RamifiedMinigames.__test.getGame()');
    await menuHome(); await click('#player-new'); await click('[data-game-mode="gomoku"]'); await ready();
    await click('#player-more'); await set('gomoku-board-size', '7'); await click('#player-back');
    await click('#player-back'); await click('#player-back'); await click('#player-continue');
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame() === window.retainedPlayerGame'), true, 'cancel from More keeps the old game');

    // Connect Four shares the same page geometry, with its own defaults and controllers.
    await menuHome(); await click('#player-new'); await click('[data-game-mode="connect-four"]'); await ready();
    await read('SiteI18n.setLocale("en")');
    assert.deepStrictEqual((await board()).slice(0, 3), ['connect-four-6x7', 6, 7]);
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").value'), 'S');
    assert.strictEqual(await read('document.querySelector("#player-menu-title").textContent'), 'Connect Four');
    assert.strictEqual(await read('document.querySelector("#player-first-label").textContent'), 'Red');
    assert.strictEqual(await read('document.querySelector("#player-second-label").textContent'), 'Yellow');
    assert.strictEqual(await read('document.querySelector("#player-first-controller").textContent'), 'Human');
    assert.strictEqual(await read('document.querySelector("#player-second-controller").textContent'), 'AI — Challenging');
    assert.strictEqual(await read('document.querySelector("#player-first-next").getAttribute("aria-label")'), 'Next red player type');
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-row").parentElement.id'), 'player-board-fields');
    assert.strictEqual(await read('document.querySelector("#connect-four-align-row").closest(".player-page").id'), 'player-display', 'original display control remains accessible');
    const connectLayout = await dimensions();
    for (const id of ['player-board-preview', 'player-setup-players', 'player-more', 'player-begin']) {
      assert.deepStrictEqual(connectLayout[id], layout[id], `${id}: same geometry as Gomoku`);
    }
    await click('#player-board-preview');
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().tokens.length'), 0, 'preview is read-only');
    await click('#player-first-next'); await click('#player-first-next');
    assert.strictEqual(await read('document.querySelector("#connect-four-red-controller").value'), 'human', 'only Human and Challenging cycle');
    await read('document.querySelector("#player-second-next").focus()'); await key('Enter', 'Enter', 13);
    assert.strictEqual(await read('document.querySelector("#connect-four-yellow-controller").value'), 'human');
    await click('#player-second-previous');
    await shot('connect-four-desktop-en');
    await click('#player-more');
    assert.strictEqual(await read('document.activeElement.id'), 'connect-four-fall-dir');
    await set('connect-four-fall-dir', 'W'); await key('Escape', 'Escape', 27);
    assert.strictEqual(await read('document.activeElement.id'), 'player-more');
    const browseTo = async id => {
      const count = await read('RamifiedMinigames.player.presets().length');
      for (let i = 0; i < count && await read('RamifiedMinigames.player.state().presetId') !== id; i++) {
        await click('#player-board-next'); await ready();
      }
      assert.strictEqual(await read('RamifiedMinigames.player.state().presetId'), id);
    };
    await browseTo('connect-four-hex-good-mobius-strip');
    await click('#player-more');
    assert.deepStrictEqual(await read(`[...document.querySelector('#connect-four-fall-dir').options].filter(o => !o.disabled).map(o => o.value)`), ['E', 'W', 'SE', 'SW', 'NW', 'NE']);
    await set('connect-four-fall-dir', 'NE'); await click('#player-back');
    await browseTo('connect-four-6x7');
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").value'), 'W');
    await browseTo('connect-four-hex-good-mobius-strip');
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").value'), 'NE');
    assert.strictEqual(await read('document.querySelector("#connect-four-yellow-controller").value'), 'local-ai-challenging');
    await click('#player-back'); await click('[data-game-mode="connect-four"]'); await ready();
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").value'), 'S', 'reentering uses approved defaults');
    for (const locale of ['en', 'zh-CN']) {
      await read(`SiteI18n.setLocale('${locale}')`);
      assert.strictEqual(await read('document.querySelector("#player-board-name").textContent'), locale === 'en' ? 'Connect Four 6*7' : '四子棋 6×7');
      assert.strictEqual(await read('document.querySelector("#player-second-next").getAttribute("aria-label")'), locale === 'en' ? 'Next yellow player type' : '下一个黄方玩家类型');
      for (const width of [1280, 390, 320]) {
        await resize(width);
        const sizes = await dimensions();
        assert(sizes['player-begin'].bottom <= sizes['player-menu'].bottom);
        assert(sizes['player-begin'].right <= sizes['player-menu'].right);
        assert.strictEqual(await read('document.querySelector(".player-setup-main").scrollWidth <= document.querySelector(".player-setup-main").clientWidth'), true);
        await read('document.querySelector(".player-setup-main").scrollTop = 0'); await shot(`connect-four-${width}-${locale}-top`);
        await click('#player-second-next'); await click('#player-second-previous'); await shot(`connect-four-${width}-${locale}-players`);
        await click('#player-more');
        assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").selectedOptions[0].textContent'), locale === 'en' ? 'down' : '下');
        await shot(`connect-four-${width}-${locale}-more`); await click('#player-back');
      }
    }
    await resize(1280);
    await click('#player-begin'); await click('#player-cancel-new');
    assert.strictEqual(await read('RamifiedMinigames.player.snapshot().payload.gameMode'), 'gomoku', 'canceling replacement preserves the old save');
    assert.strictEqual(await read('document.querySelector("#connect-four-yellow-controller").value'), 'local-ai-challenging');
    await click('#player-begin'); await click('#player-confirm-new');
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().fallDir === RamifiedMinigames.DIRS.S'), true);
    // The middle input hole is at the top of this ordinary board. Use a real pointer click.
    const drop = await read(`(() => { const r = document.querySelector('#mosaic-canvas').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 12 }; })()`);
    await mouse(client, 'mousePressed', drop.x, drop.y, 1); await mouse(client, 'mouseReleased', drop.x, drop.y, 0);
    await waitFor(() => read('RamifiedMinigames.__test.getGame().round === 2 && RamifiedMinigames.player.state().canPrepare && !!RamifiedMinigames.player.snapshot()'), 20000, 'human drop and yellow AI response');
    assert.deepStrictEqual(await read('RamifiedMinigames.__test.getGame().tokens.map(t => t.color).sort()'), ['red', 'yellow']);
    await menuHome();
    await client.send('Page.reload'); await ready();
    await waitFor(() => read('!document.querySelector("#player-continue").disabled'), 5000, 'saved four-in-a-row');
    await click('#player-continue');
    await waitFor(() => read('RamifiedMinigames.player.state().mode === "connect-four" && document.querySelector("#player-menu").hidden'), 15000, 'restore four-in-a-row');
    assert.strictEqual(await read('document.querySelector("#connect-four-yellow-controller").value'), 'local-ai-challenging');
    assert.strictEqual(await read('RamifiedMinigames.__test.getGame().round'), 2);

    await menuHome(); await click('#player-settings'); await click('#player-fullscreen');
    await waitFor(() => read('!!document.fullscreenElement'), 5000, 'fullscreen');
    await click('#player-new'); await checkGamePage(6); await shot('games-fullscreen');
    await click('#player-games-next'); await checkGamePage(5); await click('#player-games-previous');
    await click('[data-game-mode="gomoku"]'); await ready();
    assert.strictEqual(await read('document.querySelector("#player-menu").clientWidth === innerWidth'), true);
    await click('#player-more'); await click('#player-back'); await shot('fullscreen');
    await click('#player-back'); await click('[data-game-mode="connect-four"]'); await ready();
    assert.strictEqual(await read('document.querySelector("#player-menu").clientWidth === innerWidth'), true);
    await shot('connect-four-fullscreen'); await click('#player-more'); await set('connect-four-fall-dir', 'W'); await click('#player-back');
    assert.strictEqual(await read('document.querySelector("#connect-four-fall-dir").value'), 'W');
    await read('document.exitFullscreen()');
    await click('#player-back'); await revealGame('sokoban'); await click('[data-game-mode="sokoban"]'); await ready();
    assert.strictEqual(await read('document.querySelector("#player-board-fields").children.length'), 0, 'original controls return for other games');
    await click('#player-level-1'); await click('#player-confirm-new');
    await click('#player-actions > summary');
    const beforeMove = await read('RamifiedMinigames.__test.getGame().round');
    await click('#player-action-controls [data-move-dir="E"]');
    await waitFor(() => read(`RamifiedMinigames.__test.getGame().round > ${beforeMove}`), 5000, 'Sokoban move');
    await require('./ramified_minigames_preparation_ui_checks.js')({ client, mouse, read, click, ready, set, resize, shot, menuHome, revealGame });
    assert.deepStrictEqual(errors, []);
    console.log('ramified_minigames_player_ui_test: pagination, Gomoku/Connect Four preparation, defaults, direction retention, AI play/save, i18n, keyboard, cancel, narrow/fullscreen and Sokoban passed');
  } finally {
    if (session) {
      session.client.close();
      // The shared cleanup recursively removes only the disposable test profile.
      const profile = path.resolve(session.profile), temp = path.resolve(os.tmpdir());
      assert(profile.startsWith(temp + path.sep) && path.basename(profile).startsWith('math-workspace-drag-'));
      await stopBrowser(session.browser, profile);
    }
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
