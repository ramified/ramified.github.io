'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    assert.deepEqual(await read(()=>MathWorkspaceCartan.settings()),{fontSize:19,fontFamily:'Georgia, serif',rowSpacing:0,columnSpacing:0,linkSpacing:true,bracketStroke:2,zeroOpacity:0.2,highlightDiagonal:false,showIndices:false});
    assert.equal(await read(()=>document.querySelectorAll('[data-design-experiment="cartan-matrix"],[data-design-experiment="icon-geometry"]').length),0);
    assert.equal(await read(()=>!!document.querySelector('[data-design-experiment="principal-assets"]')),true);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=asset=>asset.kind+':'+asset.id;
      window.lie=api.createObjectAsset('lie',{data:{family:'B',rank:3}});window.cartan=panels.open('dynkin-cartan',key(lie),'side');
      window.values=panel=>[...panel.cartanView.querySelectorAll('tbody tr')].map(row=>[...row.querySelectorAll('td')].map(cell=>Number(cell.textContent)));
      window.expected=DynkinDiagramGeometry.cartanMatrix('B',3);
    });
    assert.deepEqual(await read(()=>values(cartan)),await read(()=>expected));
    assert.equal(await read(()=>getComputedStyle(cartan.cartanView.querySelector('table')).fontFamily),'Georgia, serif');
    assert.equal(await read(()=>cartan.cartanView.querySelector('svg path').getAttribute('stroke-width')),'2');
    assert.equal(await read(()=>cartan.addCartan.disabled),false);
    assert.equal(await read(()=>cartan.propertyRenderer.inspectorHost.hidden),true,'the native output does not appear twice');
    await read(()=>cartan.addCartan.click());
    const created=await read(()=>api.localAssetSnapshot().assets.filter(asset=>asset.kind==='matrix').at(-1));
    assert.equal(created.data.dataType,'integer');assert.deepEqual(created.data.entries,await read(()=>expected.map(row=>row.map(String))));
    assert(!created.data.construction,'saved matrix is an independent snapshot');
    await read(()=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'A',rank:2}});window.main=panels.open('dynkin-cartan',key(lie),'main');window.before=JSON.stringify(api.localAssetSnapshot().assets);});
    assert.deepEqual(await read(()=>values(cartan)),[[2,-1],[-1,2]]);
    assert.deepEqual(await read(id=>api.localAssetSnapshot().assets.find(asset=>asset.id===id&&asset.kind==='matrix').data.entries,created.id),created.data.entries);
    const spacing=await read(()=>{
      const results=[];
      for(const fontFamily of ['"Times New Roman", serif','Georgia, serif','monospace'])for(const fontSize of [14,19,28])for(const gap of [0,6,12]){
        MathWorkspaceCartan.configure({...MathWorkspaceCartan.defaults,fontFamily,fontSize,rowSpacing:gap,columnSpacing:gap});
        const rows=cartan.cartanView.querySelectorAll('tbody tr'),a=rows[0].cells[0].getBoundingClientRect(),b=rows[0].cells[1].getBoundingClientRect(),c=rows[1].cells[0].getBoundingClientRect();
        results.push({fontFamily,fontSize,gap,width:a.width,height:a.height,horizontal:b.left-a.right,vertical:c.top-a.bottom});
      }
      MathWorkspaceCartan.configure();return results;
    });
    for(const result of spacing){assert(Math.abs(result.width-result.height)<0.05,'square matrix cells: '+JSON.stringify(result));assert(Math.abs(result.horizontal-result.gap)<0.05&&Math.abs(result.vertical-result.gap)<0.05,'row and column gaps use the same pixels: '+JSON.stringify(result));}
    await read(()=>MathWorkspaceCartan.configure({...MathWorkspaceCartan.defaults,fontSize:26,showIndices:true}));
    for(const name of ['cartan','main']){
      assert.equal(await read(name=>getComputedStyle(window[name].cartanView.querySelector('table')).fontSize,name),'26px');
      assert.equal(await read(name=>window[name].cartanView.querySelectorAll('th').length,name),4);
    }
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>before));
    assert.equal(await read(()=>panels.exportText('workspace').includes('zeroOpacity')),false,'lab settings stay out of backups');
    await read(()=>MathWorkspaceCartan.configure());
    assert.equal(await read(()=>getComputedStyle(cartan.cartanView.querySelector('table')).fontSize),'19px');
    assert.equal(await read(()=>cartan.cartanView.querySelectorAll('th').length),0);
    await read(()=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'E8',rank:8}});cartan.node.scrollIntoView({block:'center'});});
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-cartan-panel.png'),Buffer.from(shot.data,'base64'));
    await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:1,mobile:false});
    assert(await read(()=>[cartan,main].every(panel=>{const scroll=panel.cartanView.querySelector('.workspace-cartan-scroll');return scroll.clientWidth<=panel.node.clientWidth;})),'large matrices stay inside their panel at narrow widths');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(()=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'A',rank:0}});});
    assert.equal(await read(()=>cartan.addCartan.disabled),true,'empty matrices cannot be added as invalid matrix assets');
    await read(()=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'A',rank:13}});});
    assert.equal(await read(()=>cartan.addCartan.disabled),true,'unsupported inputs cannot save an old matrix');
    await read(()=>{api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'G2',rank:2}});window.saved=panels.exportText('workspace');panels.importText('workspace',saved);window.restored=[...panels.panels.values()].find(panel=>panel.definition.id==='dynkin-cartan');});
    assert.deepEqual(await read(()=>values(restored)),await read(()=>DynkinDiagramGeometry.cartanMatrix('G2',2)));
    assert.equal(await read(()=>restored.addCartan.disabled),false);
    await read(()=>document.querySelector('[data-design-exit]').click());
    assert.equal(await read(()=>getComputedStyle(restored.cartanView.querySelector('table')).fontSize),'19px');
    assert.deepEqual(errors,[]);
    console.log('PASS Cartan display, equal pixel gaps across fonts/sizes, committed Georgia preset, asset snapshots, retired experiments, narrow layout, input limits and restoration');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
