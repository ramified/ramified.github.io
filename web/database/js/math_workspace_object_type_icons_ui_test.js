'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
const approved={filtration:'flag',complex:'differentials','field-extension':'quotient',polytope:'simplex',voronoi:'cell-patch',sphere:'sphere'};
async function run(){
  const server=await startServer();let session;
  try{
    const url='http://127.0.0.1:'+server.address().port+'/math_workspace.html';
    session=await launchBrowser(url);const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(kinds=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=asset=>asset.kind+':'+asset.id;
      window.examples=kinds.map(kind=>api.createObjectAsset(kind,{name:kind+' example'}));
      const symbols={filtration:'F_{9}',complex:'C_{9}','field-extension':'L_{9}',polytope:'P_{9}',voronoi:'V_{9}',sphere:'S^{2}'};
      window.namedExamples=kinds.map(kind=>api.createObjectAsset(kind,{name:symbols[kind]}));
      window.automatic=api.createObjectAsset('complex');
      window.icon=asset=>document.querySelector('[data-asset-key="'+key(asset)+'"] .workspace-asset-icon');
      window.openPicker=()=>{api.openCanvas('assets');document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();};
      api.openCanvas('assets');window.definitionsBefore=JSON.stringify(api.localAssetSnapshot().assets);
    },Object.keys(approved));
    await waitFor(()=>read(()=>namedExamples.every(asset=>!!icon(asset).querySelector('mjx-container'))&&!!icon(automatic).querySelector('mjx-container')),15000);
    assert.deepEqual(await read(()=>namedExamples.map(asset=>[icon(asset).dataset.iconSource,icon(asset).dataset.iconName])),[['name','F_{9}'],['name','C_{9}'],['name','L_{9}'],['name','P_{9}'],['name','V_{9}'],['name','S^{2}']],'single-letter mathematical names retain precedence');
    assert.equal(await read(()=>icon(automatic).dataset.iconSource),'name','automatic names retain precedence');
    for(const layout of ['icons','list','details','tiles','content']){
      await read(layout=>{api.state.layout=layout;api.openCanvas('assets');},layout);
      await waitFor(()=>read(()=>namedExamples.every(asset=>!!icon(asset).querySelector('mjx-container'))),10000);
      const icons=await read(()=>examples.map(asset=>{
        const host=icon(asset),svg=host.querySelector('svg'),box=host.getBoundingClientRect(),image=svg?.getBoundingClientRect(),ink=svg?.getBBox();
        return {kind:asset.kind,variant:host.dataset.iconVariant,source:host.dataset.iconSource,color:getComputedStyle(host).color,fits:!!image&&image.width>5&&image.height>5&&image.width<=box.width+1&&image.height<=box.height+1&&ink.x>=0&&ink.y>=0&&ink.x+ink.width<=40.5&&ink.y+ink.height<=40.5};
      }));
      assert.deepEqual(Object.fromEntries(icons.map(icon=>[icon.kind,icon.variant])),approved,layout+' uses the approved defaults');
      assert(icons.every(icon=>icon.source==='generic'&&icon.fits&&icon.color==='rgb(168, 81, 11)'),layout+' icons fit and use the generic ink: '+JSON.stringify(icons));
      assert(await read(()=>namedExamples.every(asset=>icon(asset).dataset.iconSource==='name'&&!icon(asset).dataset.iconVariant)),layout+' keeps name icons');
    }
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>definitionsBefore),'rendering never changes asset definitions');
    await read(()=>{api.state.layout='icons';api.openCanvas('assets');});
    const assetsShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-approved-object-icons-assets.png'),Buffer.from(assetsShot.data,'base64'));
    await read(()=>openPicker());
    for(const [kind,variant] of Object.entries(approved)){
      const result=await read(kind=>{
        const picker=document.querySelector('[data-create-kind="'+kind+'"] .workspace-asset-icon'),asset=examples.find(asset=>asset.kind===kind);
        return {variant:picker.dataset.iconVariant,sameGeometry:picker.querySelector('svg').outerHTML===icon(asset).querySelector('svg').outerHTML,sameColor:getComputedStyle(picker).color===getComputedStyle(icon(asset)).color};
      },kind);
      assert.deepEqual(result,{variant,sameGeometry:true,sameColor:true},kind+' agrees between picker and Assets');
    }
    const pickerShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-approved-object-icons-picker.png'),Buffer.from(pickerShot.data,'base64'));
    await client.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
    assert(await read(()=>{const dialog=document.querySelector('#workspace-create-dialog'),box=dialog.getBoundingClientRect(),list=dialog.querySelector('.workspace-create-results');return box.left>=10&&box.right<=innerWidth-10&&list.scrollWidth<=list.clientWidth+1;}),'mobile picker fits');
    await read(()=>document.querySelector('#workspace-create-dialog').close());
    await client.send('Emulation.clearDeviceMetricsOverride');
    // Both missing MathJax and asynchronous typesetting failures use the same
    // approved geometry as the picker, rather than the old character symbols.
    const offline=await read(kinds=>{
      const mathjax=window.MathJax;
      try{window.MathJax=null;return Object.fromEntries(kinds.map(kind=>[kind,MathWorkspaceAssetIcons.render({kind,name:'Q',data:{}}).dataset.iconVariant]));}
      finally{window.MathJax=mathjax;}
    },Object.keys(approved));
    assert.deepEqual(offline,approved,'missing MathJax uses the approved generic icons');
    const failed=await read(async kinds=>{
      const typeset=MathJax.typesetPromise,container=document.createElement('div');
      try{
        kinds.forEach(kind=>container.append(MathWorkspaceAssetIcons.render({kind,name:'Q',data:{}})));document.body.append(container);
        MathJax.typesetPromise=async()=>{throw new Error('Intentional typesetting failure');};
        await MathWorkspaceAssetIcons.typeset(container);
        return Object.fromEntries([...container.children].map(host=>[host.dataset.iconKind,host.dataset.iconVariant]));
      }finally{MathJax.typesetPromise=typeset;container.remove();}
    },Object.keys(approved));
    assert.deepEqual(failed,approved,'failed MathJax uses the approved generic icons');
    await read(()=>api.updateObjectAsset({kind:examples[1].kind,id:examples[1].id},{name:'Z_{2}'}));
    await waitFor(()=>read(()=>icon(examples[1]).dataset.iconSource==='name'&&!!icon(examples[1]).querySelector('mjx-container')),10000);
    assert.equal(await read(()=>icon(examples[1]).dataset.iconName),'Z_{2}','renaming to mathematical notation selects the name icon');
    await read(()=>examples.forEach(asset=>api.updateObjectAsset({kind:asset.kind,id:asset.id},{name:'Renamed '+asset.kind})));
    assert.deepEqual(await read(()=>Object.fromEntries(examples.map(asset=>[asset.kind,icon(asset).dataset.iconVariant]))),approved,'renaming to descriptive labels selects generic icons');
    await read(()=>{window.beforeLab=JSON.stringify(api.localAssetSnapshot().assets);document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,ctrlKey:true,altKey:true,shiftKey:true,code:'KeyD'}));});
    assert.deepEqual(await read(()=>[...document.querySelector('[data-design-picker]').options].map(option=>option.value)),['principal-assets','asset-subjects'],'the completed experiment is retired');
    await read(()=>document.querySelector('[data-design-exit]').click());
    assert.deepEqual(await read(()=>Object.fromEntries(examples.map(asset=>[asset.kind,icon(asset).dataset.iconVariant]))),approved,'leaving Design Lab retains approved defaults');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeLab),'Design Lab changes no asset data');
    const backup=await read(()=>panels.exportText('workspace'));assert(!backup.includes('iconsByKind')&&!backup.includes('iconVariant'),'backup needs no icon settings or migration');
    await client.send('Page.navigate',{url});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    assert.deepEqual(await read(kinds=>Object.fromEntries(kinds.map(kind=>[kind,MathWorkspaceAssetIcons.renderType(kind).dataset.iconVariant])),Object.keys(approved)),approved,'defaults survive reload without Design Lab');
    assert.deepEqual(errors,[]);console.log('PASS shared generic icons and S2 sphere, mathematical name precedence, missing/failed MathJax, five layouts, renaming, mobile, data isolation and reload');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
