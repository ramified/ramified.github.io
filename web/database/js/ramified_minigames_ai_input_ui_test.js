'use strict';
const assert = require('node:assert/strict');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate, delay } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer();
  let session;
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    session = await launchBrowser(`${origin}/ramified_minigames_study.html`);
    const { client } = session;
    const read = expression => evaluate(client, expression);
    const errors = [];
    await client.send('Runtime.enable');
    client.socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    });
    const visible = id => read(`!!document.getElementById('${id}')?.getClientRects().length`);
    async function click(selector) {
      await waitFor(() => read(`(() => {const n=document.querySelector(${JSON.stringify(selector)});return n&&n.getClientRects().length&&!n.disabled})()`), 10000, selector);
      await read(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await delay(100);
    }
    async function clickCell(index) {
      const point = await read(`(() => {
        const g=RamifiedMinigames.__test.getGeometry(),cell=g.cells[${index}],t=g.displayTransform;
        let x=cell.x,y=cell.y;
        if(t){const dx=x-t.centerX,dy=y-t.centerY;x=t.centerX+dx*t.cos-dy*t.sin-t.minX;y=t.centerY+dx*t.sin+dy*t.cos-t.minY;}
        const r=document.querySelector('#mosaic-canvas').getBoundingClientRect();
        return {x:r.left+x*r.width/g.width,y:r.top+y*r.height/g.height};
      })()`);
      await client.send('Input.dispatchMouseEvent', { type:'mousePressed', button:'left', buttons:1, clickCount:1, ...point });
      await client.send('Input.dispatchMouseEvent', { type:'mouseReleased', button:'left', buttons:0, clickCount:1, ...point });
      await delay(60);
    }
    async function choose(mode) {
      while (!await read('document.querySelector("#player-games-previous").disabled')) await click('#player-games-previous');
      if (await read(`document.querySelector('[data-game-mode="${mode}"]').hidden`)) await click('#player-games-next');
      await click(`[data-game-mode="${mode}"]`);
      await waitFor(() => read('RamifiedMinigames.player.state().ready'), 30000, mode+' ready');
    }
    async function begin() {
      await click('#player-begin');
      if (await visible('player-confirm-new')) await click('#player-confirm-new');
      await waitFor(() => read('RamifiedMinigames.player.state().active && document.querySelector("#player-menu").hidden'), 10000, 'game active');
      if (await visible('study-notice')) await click('#study-sound-no');
    }
    async function humanCheckersMove() {
      const move = await read(`(() => {
        const api=RamifiedMinigames,g=api.__test.getGame();
        for(const marble of g.marbles.filter(p=>p.color==='black')) {
          const targets=[...api.chineseCheckerMoveMap(g,marble.index)].filter(([,move])=>move.kind==='step').map(([index])=>index);
          if(targets.length)return {from:marble.index,to:targets[0]};
        }
      })()`);
      assert(move, 'human has a legal move');
      await clickCell(move.from);
      await clickCell(move.to);
    }
    const pages = process.env.RAMIFIED_AI_INPUT_PAGE ? [process.env.RAMIFIED_AI_INPUT_PAGE] : ['ramified_minigames_study.html', 'ramified_minigames.html'];
    for (const page of pages) {
      await client.send('Page.navigate', { url: `${origin}/${page}` });
      await waitFor(() => read('!!window.RamifiedMinigames?.player.state().ready'), 60000, page+' loaded');
      await click('#player-new');
      if (await visible('player-slot-1')) await click('#player-slot-1');
      for (const mode of ['chinese-checkers', 'gomoku', 'connect-four']) {
        await choose(mode);
        if (mode === 'chinese-checkers') {
          const colors = await read('[...document.querySelectorAll("#chinese-checkers-player-options select")].map(n=>n.dataset.color)');
          assert(colors.includes('black'), 'fixture contains human black');
          for (const color of colors) await read(`(() => {const n=document.querySelector('#chinese-checkers-player-options select[data-color="${color}"]');n.value=${JSON.stringify(color === 'black' ? 'human' : 'local-ai-challenging')};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        }
        await begin();
        if (mode === 'chinese-checkers') {
          const before = await read('(()=>{const g=RamifiedMinigames.__test.getGame();return {turn:g.turn,selected:g.selectedIndex,round:g.round,ai:g.marbles.find(p=>p.color!=="black").index}})()');
          assert.equal(before.turn, 'black');
          await clickCell(before.ai);
          assert.deepEqual(await read('(()=>{const g=RamifiedMinigames.__test.getGame();return {turn:g.turn,selected:g.selectedIndex,round:g.round}})()'), { turn:before.turn, selected:before.selected, round:before.round }, 'clicking an AI marble must not hijack the opening turn');
          const human = await read('RamifiedMinigames.__test.getGame().marbles.find(p=>p.color==="black").index');
          await clickCell(human);
          const selected = await read('RamifiedMinigames.__test.getGame().selectedIndex');
          await clickCell(before.ai);
          assert.equal(await read('RamifiedMinigames.__test.getGame().selectedIndex'), selected, 'AI marble cannot replace the human selection');
          // Deselect, then make two human moves with real AI turns in between.
          await clickCell(human);
          for (let turn=0;turn<2;turn++) {
            const round = await read('RamifiedMinigames.__test.getGame().round');
            await humanCheckersMove();
            await waitFor(() => read(`(()=>{const g=RamifiedMinigames.__test.getGame(),ai=RamifiedMinigames.__test.getLocalAiRuntimeState();return g.round>${round}&&g.turn==='black'&&!ai.thinking&&RamifiedMinigames.player.state().canPrepare})()`), 60000, 'AI finishes and returns control to human');
          }
        } else {
          const field = mode === 'gomoku' ? 'stones' : 'tokens';
          for (let turn=0;turn<2;turn++) {
            const round = await read('RamifiedMinigames.__test.getGame().round');
            const target = await read(`(() => {const api=RamifiedMinigames,g=api.__test.getGame();return ${mode === 'gomoku' ? 'g.preset.rows*g.preset.cols>0?Array.from({length:g.preset.rows*g.preset.cols},(_,i)=>i).find(i=>!g.removed.has(i)&&!g.stones.some(s=>s.index===i)):null' : '[...g.holes].find(i=>{const t=api.connectFourDropTarget(g,i,g.fallDir);return Number.isInteger(t.index)&&!t.cycle&&!g.tokens.some(p=>p.index===t.index)})'};})()`);
            assert(Number.isInteger(target), mode+' has a legal human move');
            await clickCell(target);
            await waitFor(() => read(`(()=>{const g=RamifiedMinigames.__test.getGame(),ai=RamifiedMinigames.__test.getLocalAiRuntimeState();return g.round>=${round+2}&&!ai.thinking&&RamifiedMinigames.player.state().canPrepare})()`), 60000, mode+' AI reply');
            const snapshot = await read(`(()=>{const g=RamifiedMinigames.__test.getGame();return {round:g.round,turn:g.turn,ai:g.${field}.find(p=>p.color===${JSON.stringify(mode === 'gomoku' ? 'white' : 'yellow')}).index}})()`);
            await clickCell(snapshot.ai);
            assert.deepEqual(await read('(()=>{const g=RamifiedMinigames.__test.getGame();return {round:g.round,turn:g.turn}})()'), { round:snapshot.round, turn:snapshot.turn }, mode+' AI piece click leaves the human turn intact');
          }
        }
        await click('#fullscreen-settings-open');
        await click('#player-menu-button');
        console.log(`PASS ${page}: ${mode} opponent clicks and continued human/AI turns`);
      }
    }
    assert.deepEqual(errors, [], 'no browser exceptions');
  } finally {
    if (session) { session.client.close(); await stopBrowser(session.browser, session.profile); }
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
