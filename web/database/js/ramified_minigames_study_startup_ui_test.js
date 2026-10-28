'use strict';
const assert = require('assert');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer();
  let session;
  try {
    session = await launchBrowser('about:blank');
    const { client } = session;
    const read = expression => evaluate(client, expression);
    await client.send('Page.enable');
    // Isolate startup state/copy from the separately loaded web fonts.
    await client.send('Network.enable');
    await client.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*js/ramified_minigames_study_engine.js*', requestStage: 'Request' }] });
    let paused;
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Fetch.requestPaused') paused = message.params.requestId;
    });
    const snapshot = () => read(`(() => {
      const q = selector => document.querySelector(selector);
      const box = selector => { const r = q(selector).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
      return {
        locale: document.documentElement.lang, page: document.body.dataset.studyPage,
        header: getComputedStyle(q('.player-menu-header')).display,
        title: q('.study-introduction h2').textContent, tabTitle: document.title,
        buttons: [...q('#player-home').querySelectorAll('button')].map(button => button.textContent),
        titleBox: box('.study-introduction h2'), playBox: box('#player-new')
      };
    })()`);
    for (const width of [1280, 360]) {
      await client.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      for (const test of [
        { query: 'en', saved: 'zh-CN', browser: 'zh-CN', expected: 'en' },
        { query: 'zh-CN', saved: 'en', browser: 'en', expected: 'zh-CN' },
        { query: '', saved: 'zh-CN', browser: 'en', expected: 'zh-CN' },
        { query: '', saved: null, browser: 'zh-CN', expected: 'zh-CN' },
        { query: '', saved: null, browser: 'en', expected: 'en' }
      ]) {
        const { identifier } = await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `
          localStorage.removeItem('ramified.site.language');
          if (${JSON.stringify(test.saved)} !== null) localStorage.setItem('ramified.site.language', ${JSON.stringify(test.saved)});
          Object.defineProperty(navigator, 'languages', { value: [${JSON.stringify(test.browser)}] });
        ` });
        paused = null;
        await client.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/ramified_minigames_study.html${test.query ? '?lang=' + test.query : ''}` });
        await waitFor(() => paused, 15000, 'delayed engine request');
        await delay(100);
        assert.equal(await read('document.readyState'), 'loading', 'measure before DOMContentLoaded');
        const before = await snapshot();
        const chinese = test.expected === 'zh-CN';
        assert.equal(before.locale, test.expected, 'shared language preference precedence: ' + JSON.stringify(test));
        assert.equal(before.page, 'home');
        assert.equal(before.header, 'none', 'no transient menu heading');
        assert.equal(before.title, chinese ? '歧趣游境' : 'Ramified Minigames');
        assert.equal(before.tabTitle, chinese ? '歧趣游境｜Ramified Minigames' : 'Ramified Minigames');
        assert.deepStrictEqual(before.buttons, chinese ? ['开始', '联机', '设置'] : ['Play', 'Online', 'Settings']);
        await client.send('Fetch.continueRequest', { requestId: paused });
        await waitFor(() => read('document.readyState === "complete" && !!window.RamifiedMinigames?.player.state().ready'), 30000, 'game initialized');
        assert.deepStrictEqual(await snapshot(), before, 'home layout and copy remain unchanged after initialization');
        await read('document.querySelector("#player-settings").click()');
        const otherLocale = chinese ? 'en' : 'zh-CN';
        await read(`(() => { const control = document.querySelector('[data-language-switch]'); control.value = '${otherLocale}'; control.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        assert.equal(await read('SiteI18n.getLocale()'), otherLocale, 'language control is bound after body parsing');
        await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      }
    }
    console.log('Study startup: delayed engine, stable home/title/copy, desktop/mobile, query/saved/browser language precedence and language control passed.');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
