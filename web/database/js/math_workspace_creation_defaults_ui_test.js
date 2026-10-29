'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');

async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');
    const {client}=session,read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!document.querySelector('[data-design-picker]')&&!!window.MathWorkspaceAssetsTest),20000);
    const experiments=await read(()=>[...document.querySelector('[data-design-picker]').options].map(option=>option.value));
    assert(['principal-assets','asset-subjects','favorite-stars'].every(id=>experiments.includes(id)),'creation experiments remain available alongside other Design Lab panels');
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
    assert.equal(await read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)),.05,'default unselected stars use the approved 5 percent');
    await read(()=>{
      document.querySelector('#workspace-create-dialog').close();
      window.openFavoritePicker=()=>{
        document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));
        [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();
      };
      const picker=document.querySelector('[data-design-picker]');picker.value='favorite-stars';picker.dispatchEvent(new Event('change'));
      document.querySelector('[data-favorite-star-preset="faint"]').click();
      document.querySelector('[data-design-experiment="favorite-stars"]').scrollIntoView({block:'center'});
    });
    await read(()=>document.querySelector('[data-favorite-star-percent="idle"]').focus());
    for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    assert.deepEqual(await read(()=>[...document.querySelectorAll('[data-favorite-star-percent]')].map(input=>input.value)),['9','25','25'],'idle percentage can change independently with keyboard');
    await read(()=>document.querySelector('[data-favorite-star-percent="selected"]').focus());
    for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
    assert.deepEqual(await read(()=>[...document.querySelectorAll('[data-favorite-star-percent]')].map(input=>input.getAttribute('aria-valuetext'))),['9%','24%','25%'],'selected percentage can change independently with keyboard');
    await read(()=>document.querySelector('[data-favorite-star-percent="hover"]').focus());
    for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    assert.deepEqual(await read(()=>['--workspace-create-favorite-opacity','--workspace-create-favorite-selected-opacity','--workspace-create-favorite-hover-opacity'].map(name=>Number(document.body.style.getPropertyValue(name)))),[.09,.24,.26],'all three percentages update independently');
    await read(()=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedStarSettings=JSON.parse(text);}}});
      document.querySelector('[data-design-copy="favorite-stars"]').click();
    });
    await waitFor(()=>read(()=>!!window.copiedStarSettings));
    assert.deepEqual(await read(()=>copiedStarSettings),{favoriteStars:{opacityPercent:9,selectedOpacityPercent:24,hoverOpacityPercent:26}},'copied settings use independent percentages');
    await read(()=>document.querySelector('[data-favorite-star-preset="faint"]').click());
    const starsScreenshot=await client.send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-favorite-stars-lab.png'),Buffer.from(starsScreenshot.data,'base64'));
    assert.equal(await read(()=>document.querySelector('[data-favorite-star-preset="faint"]').getAttribute('aria-pressed')),'true');
    await read(()=>openFavoritePicker());
    await waitFor(()=>read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)===.08));
    await read(()=>document.querySelector('[data-create-favorite="matrix"]').click());
    await waitFor(()=>read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)===.25));
    await read(()=>{document.querySelector('#workspace-create-dialog').close();document.querySelector('[data-favorite-star-preset="original"]').click();openFavoritePicker();});
    await waitFor(()=>read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)===.6));
    await read(()=>{document.querySelector('#workspace-create-dialog').close();document.querySelector('[data-design-reset="favorite-stars"]').click();openFavoritePicker();});
    await waitFor(()=>read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)===.75));
    await read(()=>{document.querySelector('#workspace-create-dialog').close();document.querySelector('[data-favorite-star-preset="faint"]').click();});
    await read(()=>{document.querySelector('#workspace-create-dialog').close();document.querySelector('[data-design-exit]').click();});
    await read(()=>openFavoritePicker());
    await waitFor(()=>read(()=>Number(getComputedStyle(document.querySelector('[data-create-favorite="matrix"]')).opacity)===.75));
    assert.equal(await read(()=>document.body.style.getPropertyValue('--workspace-create-favorite-opacity')),'','exit removes temporary star styles');
    assert.equal(await read(()=>document.body.style.getPropertyValue('--workspace-create-favorite-hover-opacity')),'','exit also restores card hover styling');
    await read(()=>document.querySelector('#workspace-create-dialog').close());
    assert.equal(await read(()=>MathWorkspaceAssetIcons.renderType('mosaic-diagram').querySelectorAll('[data-mosaic-piece]').length),2);
    console.log('PASS approved icons, lighter favorite stars, Design Lab presets, reset and exit restoration');
  }finally{
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
