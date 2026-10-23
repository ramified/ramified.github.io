'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');

async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');
    const {client}=session,read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!document.querySelector('[data-design-picker]')&&!!window.MathWorkspaceAssetsTest),20000);
    assert.deepEqual(await read(()=>[...document.querySelector('[data-design-picker]').options].map(option=>option.value)),['principal-assets','asset-subjects']);
    assert.equal(await read(()=>document.querySelectorAll('[data-design-experiment]:not([hidden])').length),1);
    await read(()=>{
      const picker=document.querySelector('[data-design-picker]');picker.value='asset-subjects';picker.dispatchEvent(new Event('change'));
      document.querySelector('[data-assignment-kind="matrix"]').click();
    });
    assert.equal(await read(()=>document.querySelector('[data-design-experiment="asset-subjects"]').hidden),false);
    await read(()=>{
      const picker=document.querySelector('[data-design-picker]');picker.value='principal-assets';picker.dispatchEvent(new Event('change'));
      picker.value='asset-subjects';picker.dispatchEvent(new Event('change'));
    });
    assert.equal(await read(()=>document.querySelector('[data-design-experiment="asset-subjects"] .workspace-subject-detail strong').textContent),'Matrix');
    await read(()=>{
      MathWorkspaceAssetsTest.openCanvas('assets');
      document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));
      [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();
    });
    assert.deepEqual(await read(()=>{
      const formula=document.querySelector('[data-create-kind="formula"]'),space=document.querySelector('[data-create-kind="mosaic-space"]'),diagram=document.querySelector('[data-create-kind="mosaic-diagram"]');
      const pieces=[...diagram.querySelectorAll('[data-mosaic-piece]')];
      return [formula.querySelector('strong').textContent,formula.title.includes('inequalities'),space.querySelectorAll('[data-mosaic-piece]').length,pieces.length,pieces.every(piece=>piece.getAttribute('fill')==='currentColor'&&!piece.hasAttribute('fill-opacity')),getComputedStyle(space.querySelector('.workspace-create-icon')).color===getComputedStyle(diagram.querySelector('.workspace-create-icon')).color];
    }),['Equations',true,0,2,true,true]);
    const screenshot=await client.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-approved-creation.png'),Buffer.from(screenshot.data,'base64'));
    await read(()=>{document.querySelector('#workspace-create-dialog').close();document.querySelector('[data-design-exit]').click();});
    assert.equal(await read(()=>MathWorkspaceAssetIcons.renderType('mosaic-diagram').querySelectorAll('[data-mosaic-piece]').length),2);
    console.log('PASS approved Equations and Mosaic icons, Design Lab selector, and experiment state');
  }finally{
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
