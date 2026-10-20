'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,delay}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!window.MathJax?.typesetPromise),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.item=api.createObjectAsset('matrix',{name:'\\mathcal{F}^{st}_{2}',data:{rows:1,cols:1}});window.icon=()=>document.querySelector('[data-asset-key="matrix:'+item.id+'"] .workspace-icon-formula');});
    await waitFor(()=>read(()=>!!icon()?.querySelector('mjx-container')),10000);
    await read(()=>api.openCanvas('sheaf-complexes'));
    await read(()=>api.updateObjectAsset({kind:'matrix',id:item.id},{data:{rows:1,cols:1,entries:[['2']]}}));
    await delay(150);
    await read(()=>api.selectCanvasTab('assets'));
    await delay(150);
    const iconBox=await read(()=>{const box=icon().getBoundingClientRect();return {width:box.width,height:box.height,transform:icon().style.transform};});
    console.log('Returned icon:',JSON.stringify(iconBox));
    for(const layout of ['list','details','tiles','content','icons']) {
      await read(layout=>{api.state.layout=layout;api.openCanvas('sheaf-complexes');api.updateObjectAsset({kind:'matrix',id:item.id},{name:item.name});},layout);
      await delay(100);await read(()=>api.selectCanvasTab('assets'));await delay(100);
      const fitted=await read(()=>{const formula=icon().getBoundingClientRect(),box=icon().parentElement.getBoundingClientRect();return {width:formula.width,height:formula.height,maxWidth:box.width,maxHeight:box.height};});
      assert(fitted.width>5&&fitted.height>5&&fitted.width<=fitted.maxWidth+1&&fitted.height<=fitted.maxHeight+1,layout+' letter icon must fit after returning');
    }
    await read(()=>document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100})));
    await read(()=>[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent==='New…').click());
    const dimensions=await read(()=>{const dialog=document.querySelector('#workspace-create-dialog'),box=dialog.getBoundingClientRect(),head=dialog.querySelector('header');return {x:box.x,y:box.y,width:box.width,height:box.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,headerBackground:getComputedStyle(head).backgroundColor,overflow:dialog.scrollWidth>dialog.clientWidth};});
    const shot=await client.send('Page.captureScreenshot',{format:'png'}),filename=path.join(os.tmpdir(),'math-workspace-creation-dialog.png');fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));console.log('Dialog:',JSON.stringify(dimensions));console.log('SCREENSHOT '+filename);
    assert(iconBox.width>10&&iconBox.height>10,'letter icon must be visible immediately after returning to Assets');
    assert(Math.abs(dimensions.x+dimensions.width/2-dimensions.viewportWidth/2)<2,'creation dialog must be horizontally centered');
    assert(Math.abs(dimensions.y+dimensions.height/2-dimensions.viewportHeight/2)<2,'creation dialog must be vertically centered');
    assert.equal(dimensions.overflow,false);
    await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:false});
    const mobile=await read(()=>{const d=document.querySelector('#workspace-create-dialog'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,overflow:d.scrollWidth>d.clientWidth};});
    assert(mobile.left>=10&&mobile.right<=mobile.width-10&&mobile.top>=10&&mobile.bottom<=mobile.height-10);assert.equal(mobile.overflow,false);
    const mobileShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-creation-dialog-mobile.png'),Buffer.from(mobileShot.data,'base64'));
    console.log('icon visibility after hidden updates and centered responsive creation dialog passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
