'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!document.querySelector('[data-design-picker]')),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(b=>key(a)===key(b));
      window.k=api.createObjectAsset('knot');window.g=api.createObjectAsset('dual-graph');window.ki=panels.open('knot-input',key(k),'side');window.gi=panels.open('dual-graph-input',key(g),'side');
      window.choose=(panel,id)=>{const index=MathWorkspaceTopology.presets[get(panel===ki?k:g).kind].findIndex(p=>p.id===id),select=panel.controls.querySelector('[data-topology-preset]');if(index<0)throw new Error('Missing preset '+id);select.value=String(index);select.dispatchEvent(new Event('change',{bubbles:true}));};
    });
    assert.deepEqual(await read(()=>MathWorkspaceAssetIcons.topologyPreview()),{knot:'trefoil-rounded','dual-graph':'weighted-loop-label'});
    assert.equal(await read(()=>MathWorkspaceAssetIcons.renderType('dual-graph').querySelectorAll('text').length),0,'approved graph icon has no genus label');
    assert.deepEqual(await read(()=>[...gi.controls.querySelector('[data-topology-preset]').options].filter(option=>option.value!=='').map(option=>option.textContent)),['M_g,n stable graph','Random stable curve'],'graph preset menu retains only the two general generators');
    const expected={'hopf-link':[2,2],'solomon-link':[4,2],'whitehead-link':[5,2],trefoil:[3,1],'figure-eight':[4,1]};
    for(const [id,[crossings,components]]of Object.entries(expected)){
      await read(id=>choose(ki,id),id);assert.equal(await read(()=>get(k).data.pd.length),crossings);assert.equal(await read(()=>MathWorkspaceTopology.knotInfo(get(k).data).componentCount),components);assert.equal(await read(()=>get(k).data.source),'');
    }
    await read(()=>choose(gi,'moduli'));
    const before=await read(()=>JSON.stringify(get(g).data));
    await read(()=>{const c=gi.controls;c.querySelector('[data-topology-preset-g]').value='0';c.querySelector('[data-topology-preset-n]').value='2';c.querySelector('[data-topology-load-preset]').click();});assert.equal(await read(()=>JSON.stringify(get(g).data)),before);assert.match(await read(()=>gi.message.textContent),/2g - 2/);
    await read(()=>{const c=gi.controls;c.querySelector('[data-topology-preset-g]').value='2';c.querySelector('[data-topology-preset-n]').value='5';c.querySelector('[data-topology-load-preset]').click();});assert.deepEqual(await read(()=>[get(g).data.genera,get(g).data.legs]),[[2],[[1,2,3,4,5]]]);
    await read(()=>choose(gi,'random-stable-curve'));
    for(let i=0;i<12;i++){
      await read(()=>gi.controls.querySelector('[data-topology-load-preset]').click());assert.equal(await read(()=>gi.message.textContent),'','random generation must succeed, not retain an older valid graph');assert.equal(await read(()=>MathWorkspaceTopology.graphInfo(get(g).data).stable),true);assert.equal(await read(()=>MathWorkspaceTopology.graphInfo(get(g).data).components),1);
    }
    await read(()=>{window.generated=JSON.stringify(get(g).data);panels.refresh();});assert.equal(await read(()=>JSON.stringify(get(g).data)),await read(()=>generated),'refresh does not regenerate a random preset');assert.deepEqual(await read(()=>get(g).dependencies),[]);
    await read(()=>{api.openCanvas('assets');const picker=document.querySelector('[data-design-picker]');picker.value='topology-icons';picker.dispatchEvent(new Event('change'));window.beforeIcons=JSON.stringify(api.localAssetSnapshot().assets);});
    assert.equal(await read(()=>document.querySelectorAll('[data-topology-icon-choice]').length),8);
    assert(await read(()=>[...document.querySelectorAll('[data-topology-icon-kind="knot"] [data-trefoil-curve="cubic"]')].every(svg=>[...svg.querySelectorAll('path')].every(p=>p.getAttribute('d').includes('C')&&!p.getAttribute('d').includes('L')))),'smooth refinements use cubic curves rather than polygonal segments');
    for(const [kind,choice]of [['knot','trefoil-smooth'],['knot','trefoil-rounded'],['knot','trefoil-open'],['dual-graph','weighted-loop-label'],['dual-graph','weighted-loop-disc'],['dual-graph','weighted-loop-cutout']]){
      await read((kind,choice)=>document.querySelector('[data-topology-icon-kind="'+kind+'"][data-topology-icon-choice="'+choice+'"]').click(),kind,choice);
      assert.equal(await read(kind=>document.querySelector('[data-asset-kind="'+kind+'"] [data-topology-shape]')?.getAttribute('data-topology-shape'),kind),choice);
    }
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeIcons),'preview never changes mathematical assets');
    await read(()=>{document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent==='New…').click();});
    assert.equal(await read(()=>document.querySelector('[data-create-kind="knot"] [data-topology-shape]')?.getAttribute('data-topology-shape')),'trefoil-open');assert.equal(await read(()=>document.querySelector('[data-create-kind="dual-graph"] [data-topology-shape]')?.getAttribute('data-topology-shape')),'weighted-loop-cutout');await read(()=>document.querySelector('#workspace-create-dialog').close());
    await read(()=>document.querySelector('#workspace-design-lab button[aria-label="Move to main area"]').click());
    const screenshot=await client.send('Page.captureScreenshot',{format:'png'});const filename=path.join(os.tmpdir(),'math-workspace-topology-icons-lab.png');fs.writeFileSync(filename,Buffer.from(screenshot.data,'base64'));console.log('Screenshot: '+filename);
    await read(()=>document.querySelector('[data-topology-icon-kind="dual-graph"]').closest('section').scrollIntoView({block:'start'}));
    const graphShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-weighted-icons-lab.png'),Buffer.from(graphShot.data,'base64'));
    await read(()=>document.querySelector('[data-design-exit]').click());assert.deepEqual(await read(()=>MathWorkspaceAssetIcons.topologyPreview()),{knot:'trefoil-rounded','dual-graph':'weighted-loop-label'});assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeIcons));
    await read(()=>{window.saved=panels.exportText('workspace');panels.importText('workspace',saved);});assert.equal(await read(()=>JSON.stringify(get(g).data)),await read(()=>generated),'random result survives backup restore');
    console.log('PASS Mosaic presets, stable graph parameters/random generation, topology icon choices and temporary preview lifecycle');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
