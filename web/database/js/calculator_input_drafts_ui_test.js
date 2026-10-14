'use strict';

const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  let session;
  try {
    session = await launchBrowser(`${origin}/theorem_graph_calculator.html`);
    const { client } = session;
    await client.send('Page.enable'); await client.send('Runtime.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Page.javascriptDialogOpening') {
        client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
    });
    const read = expression => evaluate(client, expression);
    const navigate = async page => {
      await client.send('Page.navigate', { url: `${origin}/${page}` });
      await waitFor(() => read(`document.readyState === 'complete' && location.pathname === ${JSON.stringify('/' + page)}`));
      await delay(150);
    };
    const focus = async id => { await read(`document.getElementById(${JSON.stringify(id)}).focus()`); };
    const key = async (key, code, options = {}) => {
      const windowsVirtualKeyCode = key === 'Backspace' ? 8 : key === 'a' ? 65 : key === 'ArrowUp' ? 38 : 0;
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...options });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, ...options });
    };
    const clear = async id => { await focus(id); await key('a', 'KeyA', { modifiers: 2 }); await key('Backspace', 'Backspace'); };
    const value = id => read(`document.getElementById(${JSON.stringify(id)}).value`);
    const type = async (id, text) => {
      const numeric = await read(`document.getElementById(${JSON.stringify(id)}).type === 'number'`);
      for (const character of text) {
        if (numeric) {
          const code = /\d/.test(character) ? `Digit${character}` : character === '.' ? 'Period' : character === '-' ? 'Minus' : 'KeyE';
          const windowsVirtualKeyCode = /\d/.test(character) ? character.charCodeAt(0) : character === '.' ? 190 : character === '-' ? 189 : 69;
          await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: character, code, windowsVirtualKeyCode, text: character });
          await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: character, code, windowsVirtualKeyCode });
        } else await client.send('Input.insertText', { text: character });
      }
      return value(id);
    };

    for (const locale of ['en', 'zh-CN']) {
      await navigate('theorem_graph_calculator.html');
      await read(`window.SiteI18n?.setLocale(${JSON.stringify(locale)})`);
      await clear('graph-title');
      assert.equal(await value('graph-title'), '');
      assert.equal(await type('graph-title', 'daily '), 'daily ', 'a trailing space is part of the draft');
      assert.equal(await type('graph-title', 'task'), 'daily task');
      await read(`document.getElementById('graph-title').setSelectionRange(6, 6)`);
      assert.equal(await type('graph-title', 'my '), 'daily my task');
      assert.equal(await read(`document.getElementById('graph-title').selectionStart`), 9);
      await read(`document.getElementById('graph-title').blur()`);
      assert.equal(await value('graph-title'), 'daily my task');

      const previousTitle = await read('document.title');
      await read(`(() => { const input = document.getElementById('graph-title'); input.focus(); input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.value = '每日任务'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, data: '任务' })); })()`);
      assert.equal(await value('graph-title'), '每日任务');
      assert.equal(await read('document.title'), previousTitle, 'composition must not publish partial text');
      await read(`document.getElementById('graph-title').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '每日任务' }))`);
      await waitFor(() => read(`document.title.includes('每日任务')`));
      console.log(`PASS title spaces, caret, and IME (${locale})`);
    }

    await navigate('young_diagrams.html');
    await clear('grid-cols'); await type('grid-cols', '6');
    await read(`document.getElementById('grid-cols').blur()`);
    assert.equal(await value('grid-cols'), '6');
    await clear('grid-cols');
    await read(`window.dispatchEvent(new Event('resize'))`); await delay(250);
    assert.equal(await value('grid-cols'), '', 'layout refresh must preserve an empty numeric draft');
    assert.equal(await type('grid-cols', '7'), '7');
    await read(`document.getElementById('grid-cols').blur()`);
    assert.equal(await value('grid-cols'), '7');
    console.log('PASS delayed grid size editing');

    await navigate('higher_dimensional_slice_calculator.html');
    await clear('box-radius-number');
    assert.equal(await value('box-radius-number'), '');
    assert.equal(await type('box-radius-number', '1.5'), '1.5', 'decimal entry must survive normalization');
    await read(`document.getElementById('box-radius-number').blur()`);
    assert.equal(await value('box-radius-number'), '1.5');
    console.log('PASS decimal numeric editing');

    await navigate('archive/ramified_minigames/index.html');
    await waitFor(() => read('!!window.RamifiedMinigames'));
    await read(`(() => { const game = document.getElementById('game-mode-select'); game.value = 'gomoku'; game.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await delay(250);
    await read(`(() => { const preset = document.getElementById('surface-preset-select'); preset.value = 'boundary-glue-board'; preset.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await waitFor(() => read(`!document.getElementById('gomoku-board-size').disabled && document.getElementById('gomoku-board-size').getClientRects().length`));
    await clear('gomoku-board-size'); await type('gomoku-board-size', '6'); await delay(150);
    await read(`document.getElementById('gomoku-board-size').blur()`);
    await clear('gomoku-board-size'); await delay(150);
    assert.equal(await value('gomoku-board-size'), '');
    assert.equal(await type('gomoku-board-size', '7'), '7');
    await read(`document.getElementById('gomoku-board-size').blur()`);
    assert.equal(await value('gomoku-board-size'), '7');
    await clear('gomoku-board-size');
    assert.equal(await type('gomoku-board-size', '1'), '1', 'an intermediate digit below min must remain editable');
    assert.equal(await type('gomoku-board-size', '5'), '15');
    await read(`document.getElementById('gomoku-board-size').blur()`);

    await read(`(() => { const game = document.getElementById('game-mode-select'); game.value = 'go'; game.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await waitFor(() => read(`!document.getElementById('go-komi').disabled && document.getElementById('go-komi').getClientRects().length`));
    await clear('go-komi'); assert.equal(await type('go-komi', '-0.5'), '-0.5');
    await read(`document.getElementById('go-komi').blur()`);
    assert.equal(await value('go-komi'), '-0.5');

    await navigate('matrix_calculator.html');
    await read(`(() => { const type = document.getElementById('data-type-select'); type.value = 'finite-field'; type.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await clear('finite-field-prime');
    await read(`document.getElementById('data-type-select').dispatchEvent(new Event('change',{bubbles:true}))`);
    assert.equal(await value('finite-field-prime'), '', 'a refresh must not refill the prime draft');
    assert.equal(await type('finite-field-prime', '13'), '13');
    await read(`document.getElementById('finite-field-prime').blur()`);
    await focus('finite-field-prime'); await key('ArrowUp', 'ArrowUp');
    assert.equal(await value('finite-field-prime'), '17', 'explicit prime stepping must remain intact');
    console.log('PASS hidden matrix prime draft and explicit prime stepping');

    const pages = ['young_diagrams.html', 'double_young_diagram.html', 'higher_dimensional_slice_calculator.html',
      'dynkin_diagram_calculator.html', 'matrix_calculator.html', 'sheaf_calculator.html', 'sheaf_complex_calculator.html',
      'mosaic_calculator.html', 'category_calculator.html', 'theorem_graph_calculator.html', 'place_ramification_calculator.html',
      'strand_diagram_calculator.html', 'ramified_minigames.html', 'archive/ramified_minigames/index.html'];
    let audited = 0;
    for (const page of pages) {
      await navigate(page);
      let pageAudited = 0;
      const seen = new Set();
      const probe = async () => {
        const fields = await read(`(() => { const fields = [...document.querySelectorAll('input,textarea')].filter(node => !node.disabled && !node.readOnly && node.getClientRects().length && (node.tagName === 'TEXTAREA' || ['text','number','search','url','email','tel','password'].includes(node.type))); return fields.map((node,index) => { node.dataset.draftAudit=String(index); return {index,key:node.id || [node.closest('.card')?.id,node.name,node.className,index].join(':')}; }); })()`);
        for (const field of fields) {
          if (seen.has(field.key)) continue;
          const result = await read(`(async () => { const node = document.querySelector('[data-draft-audit="${field.index}"]'); if (!node || node.disabled || !node.getClientRects().length) return null; const old = node.value; node.focus(); node.value = node.type === 'number' ? '' : 'draft '; const draft = node.value; node.dispatchEvent(new InputEvent('input', { bubbles:true, inputType:'insertText', data:draft })); await new Promise(resolve => setTimeout(resolve,60)); const result = { id:node.id, draft, value:node.value, connected:node.isConnected, focused:document.activeElement===node }; node.blur(); node.value=old; node.dispatchEvent(new Event('change',{bubbles:true})); return result; })()`);
          if (!result) continue;
          seen.add(field.key); audited++; pageAudited++;
          assert.equal(result.value, result.draft, `${page} / ${result.id}: input must preserve the draft`);
          assert(result.connected && result.focused, `${page} / ${result.id}: input must preserve the editing element and focus`);
        }
      };
      await probe();
      // Some pages permit only one open card. Open and audit them individually.
      const cards = await read(`[...document.querySelectorAll('.card[id]')].filter(node=>node.querySelector('input,textarea')).map(node=>node.id)`);
      for (const card of cards) {
        await read(`(() => { const head=document.getElementById(${JSON.stringify(card)})?.querySelector('.card-head'); if(head?.getAttribute('aria-expanded')==='false') head.click(); })()`);
        await delay(150);
        await probe();
      }
      console.log(`PASS ${page}: ${pageAudited} editable fields`);
    }
    console.log(`PASS ${audited} editable-field probes across ${pages.length} active interfaces`);

    await navigate('math_workspace.html');
    await waitFor(() => read('!!window.MathWorkspaceAssetsTest && !!window.MathWorkspaceNativeEditors'));
    await read(`(() => { const select = document.getElementById('workspace-open-canvas'); select.value = 'young'; select.dispatchEvent(new Event('change', { bubbles:true })); })()`);
    await waitFor(() => read(`!!MathWorkspaceAssetsTest.sessions.get('young')?.editor.shadow.querySelector('#grid-cols')`));
    await read(`window.__draftNativeRoot = MathWorkspaceAssetsTest.sessions.get('young').editor.shadow`);
    await read(`window.__draftNativeRoot.querySelector('#grid-cols').focus()`);
    await key('a', 'KeyA', { modifiers: 2 }); await key('Backspace', 'Backspace');
    await delay(150);
    assert.equal(await read(`window.__draftNativeRoot.querySelector('#grid-cols').value`), '', 'native workspace must preserve the empty draft');
    await client.send('Input.dispatchKeyEvent', { type:'keyDown', key:'7', code:'Digit7', windowsVirtualKeyCode:55, text:'7' });
    await client.send('Input.dispatchKeyEvent', { type:'keyUp', key:'7', code:'Digit7', windowsVirtualKeyCode:55 });
    assert.equal(await read(`window.__draftNativeRoot.querySelector('#grid-cols').value`), '7');
    console.log('PASS native workspace shadow-DOM numeric editing');

    console.log('calculator_input_drafts_ui_test: real keystrokes, bilingual titles, middle insertion/caret, IME, delayed grid render, decimals, and board 6 -> empty -> 7 passed');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
