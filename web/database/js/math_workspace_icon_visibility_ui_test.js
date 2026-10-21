'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,delay}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!window.MathJax?.typesetPromise),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.item=api.createObjectAsset('field',{name:'\\mathcal{F}^{st}_{2}',data:{dataType:'complex'}});window.icon=()=>document.querySelector('[data-asset-key="field:'+item.id+'"] .workspace-icon-formula');});
    await waitFor(()=>read(()=>!!icon()?.querySelector('mjx-container')),10000);
    await read(()=>{
      window.matrices=[
        api.createObjectAsset('matrix',{data:{rows:4,cols:4,entries:Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>String(r*4+c-8)))}}),
        api.createObjectAsset('matrix',{data:{rows:3,cols:2,entries:[['1','2'],['3','0.5'],['5','6']]}}),
        api.createObjectAsset('matrix',{data:{rows:5,cols:2}})
      ];
    });
    await read(()=>api.openCanvas('sheaf-complexes'));
    await read(()=>api.updateObjectAsset({kind:'field',id:item.id},{data:{dataType:'real'}}));
    await delay(150);
    await read(()=>api.selectCanvasTab('assets'));
    await delay(150);
    const iconBox=await read(()=>{const box=icon().getBoundingClientRect();return {width:box.width,height:box.height,transform:icon().style.transform};});
    console.log('Returned icon:',JSON.stringify(iconBox));
    for(const layout of ['list','details','tiles','content','icons']) {
      await read(layout=>{api.state.layout=layout;api.openCanvas('sheaf-complexes');api.updateObjectAsset({kind:'field',id:item.id},{name:item.name});},layout);
      await delay(100);await read(()=>api.selectCanvasTab('assets'));await delay(100);
      const fitted=await read(()=>{const formula=icon().getBoundingClientRect(),box=icon().parentElement.getBoundingClientRect();return {width:formula.width,height:formula.height,maxWidth:box.width,maxHeight:box.height};});
      assert(fitted.width>5&&fitted.height>5&&fitted.width<=fitted.maxWidth+1&&fitted.height<=fitted.maxHeight+1,layout+' letter icon must fit after returning');
      const matrixIcons=await read(()=>matrices.map(asset=>{
        const host=document.querySelector('[data-asset-key="matrix:'+asset.id+'"] .workspace-asset-icon'),svg=host.querySelector('svg'),box=host.getBoundingClientRect(),image=svg.getBoundingClientRect();
        return {values:[...svg.querySelectorAll('text')].map(node=>node.textContent),source:host.dataset.iconSource,round:svg.querySelector('path').getAttribute('d').includes(' Q'),fits:image.width>5&&image.height>5&&image.width<=box.width+1&&image.height<=box.height+1};
      }));
      assert.deepEqual(matrixIcons[0].values,[...Array(4).keys()].flatMap(c=>Array.from({length:4},(_,r)=>String(r*4+c-8))),layout+' shows the actual integer matrix');
      assert.deepEqual(matrixIcons[1].values,Array(6).fill('*'),layout+' masks every entry of a noninteger 3 by 2 matrix');
      assert.deepEqual(matrixIcons[2].values,Array(4).fill('*'),layout+' uses the default 2 by 2 for an oversized matrix');
      assert.deepEqual(matrixIcons.map(icon=>icon.source),['diagram','generic','generic']);
      assert(matrixIcons.every(icon=>icon.round&&icon.fits),layout+' matrices have round parentheses and fit their icons');
    }
    const matrixShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-matrix-icons.png'),Buffer.from(matrixShot.data,'base64'));
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
    console.log('icon visibility after hidden updates, matrix thumbnails across five layouts, and centered responsive creation dialog passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
