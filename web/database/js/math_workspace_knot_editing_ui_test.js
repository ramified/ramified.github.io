'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
const {catalog,fixture,multiFixture}=require('./math_workspace_knot_operations_test.js');
async function run(){const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    const english=async selector=>assert.equal(await read(selector=>[...document.querySelectorAll(selector)].some(node=>/\p{Script=Han}/u.test(node.textContent+' '+[...node.querySelectorAll('[aria-label],[title]')].map(child=>(child.getAttribute('aria-label')||'')+' '+(child.getAttribute('title')||'')).join(' '))),selector),false,'normal editor text and accessibility labels remain English: '+selector);
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!document.querySelector('[data-knot-hover-choice]')),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(item=>key(item)===key(a));
      window.linked=f=>{
        const space=api.createObjectAsset('mosaic-space',{data:f.space.data}),diagram=api.createObjectAsset('mosaic-diagram',{data:{...f.diagram.data,space:key(space)}}),knot=api.createObjectAsset('knot',{data:{source:key(diagram)}});
        return {space,diagram,knot,view:panels.open('knot-view',key(knot),'main')};
      };
      window.k=api.createObjectAsset('knot',{data:MathWorkspaceTopology.presets.knot[1].data});window.view=panels.open('knot-view',key(k),'main');window.original=JSON.stringify(get(k).data);
    });
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotHover),'halo','approved halo is the default');
    assert.equal(await read(()=>view.renderArea.querySelector('.workspace-knot-crossing-highlight circle').getAttribute('r')),'12','halo uses the same radius as ring');
    await english('[data-panel-type="knot-view"]');
    const clickCross=async(index=0,which='view')=>{
      const point=await read((which,index)=>{const p=which==='view'?view:window[which].view,r=p.renderArea.querySelector('[data-knot-crossing-hit="'+index+'"] circle[fill="transparent"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};},which,index);
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});for(const type of ['mousePressed','mouseReleased'])await client.send('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
    };
    await clickCross();assert.notEqual(await read(()=>JSON.stringify(get(k).data)),await read(()=>original));
    await read(()=>view.renderArea.querySelector('[data-knot-simplify]').click());
    assert(await read(()=>!!view.renderArea.querySelector('[data-knot-preview]')));assert.equal(await read(()=>get(k).data.pd.length),3,'simplification preview does not commit');
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.crossingCount),'0');
    await english('[data-panel-type="knot-view"]');
    await read(()=>view.renderArea.querySelector('[data-knot-undo]').click());
    assert.equal(await read(()=>!!view.renderArea.querySelector('[data-knot-preview]')),false,'a simplification preview can be undone without committing');
    await read(()=>view.renderArea.querySelector('[data-knot-simplify]').click());
    assert.equal(await read(()=>JSON.parse(panels.exportText('workspace')).assets.find(a=>key(a)===key(k)).data.pd.length),3,'backup excludes preview');
    await read(()=>view.renderArea.querySelector('[data-knot-apply-preview]').click());assert.equal(await read(()=>get(k).data.circles),1);assert.equal(await read(()=>get(k).data.pd.length),0);
    await read(()=>{view.renderArea.querySelector('[data-knot-undo]').click();view.renderArea.querySelector('[data-knot-undo]').click();});assert.equal(await read(()=>JSON.stringify(get(k).data)),await read(()=>original),'undo restores original knot');
    await read(()=>view.renderArea.querySelector('[data-knot-crossing-hit="0"]').focus());
    for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    assert.notEqual(await read(()=>JSON.stringify(get(k).data)),await read(()=>original),'keyboard activates a crossing');
    await read(()=>view.renderArea.querySelector('[data-knot-undo]').click());
    await read(f=>{window.synced=linked(f);window.sibling=api.createObjectAsset('knot',{data:{source:key(synced.diagram)}});window.beforeSource=JSON.stringify(get(synced.diagram).data);},fixture(catalog[0].payload));
    await read(()=>synced.view.renderArea.querySelector('[data-knot-sync-mosaic]').click());
    await clickCross(0,'synced');
    assert(await read(()=>!!document.querySelector('[data-knot-detach-dialog]')),'unchecked sync asks before editing a follower');
    await read(()=>document.querySelector('[data-knot-cancel-edit]').click());
    assert.equal(await read(()=>JSON.stringify(get(synced.diagram).data)),await read(()=>beforeSource));
    assert.equal(await read(()=>synced.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),false,'cancel preserves the user choice');
    await clickCross(0,'synced');await read(()=>document.querySelector('[data-knot-preview-only]').click());
    await read(()=>{synced.view.renderArea.querySelector('[data-knot-sync-mosaic]').click();synced.view.renderArea.querySelector('[data-knot-apply-preview]').click();});
    assert.equal(await read(()=>!!document.querySelector('[data-knot-detach-dialog]')),false,'reenabled sync can apply an exact single-flip preview');
    assert.notEqual(await read(()=>JSON.stringify(get(synced.diagram).data)),await read(()=>beforeSource),'source is updated');
    assert.equal(await read(()=>get(synced.knot).data.source),await read(()=>key(synced.diagram)));
    assert.deepEqual(await read(()=>get(synced.knot).data),await read(()=>get(sibling).data),'all source followers update');
    assert.equal(await read(()=>synced.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),true);
    await read(()=>synced.view.renderArea.querySelector('[data-knot-undo]').click());assert.equal(await read(()=>JSON.stringify(get(synced.diagram).data)),await read(()=>beforeSource));
    await clickCross(0,'synced');assert.notEqual(await read(()=>JSON.stringify(get(synced.diagram).data)),await read(()=>beforeSource),'direct click writes source when sync is enabled');
    await read(()=>synced.view.renderArea.querySelector('[data-knot-undo]').click());
    await read(f=>{window.multi=linked(f);window.multiBefore=JSON.stringify(get(multi.knot).data);window.multiSource=JSON.stringify(get(multi.diagram).data);},multiFixture());
    await clickCross(1,'multi');assert(await read(()=>!!document.querySelector('[data-knot-detach-dialog]')));
    await english('[data-knot-detach-dialog]');
    assert.deepEqual(await read(()=>[...document.querySelectorAll('[data-knot-detach-dialog] button')].map(button=>button.textContent)),['Make independent and apply','Preview only','Cancel']);
    const dialogPosition=await read(()=>{const d=document.querySelector('[data-knot-detach-dialog]'),r=d.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,vw:document.documentElement.clientWidth,vh:innerHeight};});
    assert(Math.abs(dialogPosition.x+dialogPosition.width/2-dialogPosition.vw/2)<2&&Math.abs(dialogPosition.y+dialogPosition.height/2-dialogPosition.vh/2)<2,'confirmation is centered: '+JSON.stringify(dialogPosition));
    const dialogShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-knot-sync-dialog.png'),Buffer.from(dialogShot.data,'base64'));
    assert.equal(await read(()=>multi.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),true,'checkbox remains checked while asking');
    await read(()=>document.querySelector('[data-knot-cancel-edit]').click());assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>multiBefore));assert.equal(await read(()=>JSON.stringify(get(multi.diagram).data)),await read(()=>multiSource));
    await clickCross(1,'multi');await read(()=>document.querySelector('[data-knot-preview-only]').click());
    const previewShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-knot-edit-preview.png'),Buffer.from(previewShot.data,'base64'));
    assert(await read(()=>!!multi.view.renderArea.querySelector('[data-knot-preview]')));
    await english('[data-panel-type="knot-view"]');
    assert.equal(await read(()=>multi.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),true,'preview keeps synchronization choice and link');
    assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>multiBefore));
    await clickCross(0,'multi');
    await read(()=>multi.view.renderArea.querySelector('[data-knot-apply-preview]').click());
    assert.equal(await read(()=>!!document.querySelector('[data-knot-detach-dialog]')),false,'combined preview can become synchronizable');
    assert.equal(await read(()=>get(multi.knot).data.source),await read(()=>key(multi.diagram)));
    assert.notEqual(await read(()=>JSON.stringify(get(multi.diagram).data)),await read(()=>multiSource));
    await read(()=>multi.view.renderArea.querySelector('[data-knot-undo]').click());
    assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>multiBefore));
    await clickCross(1,'multi');await read(()=>document.querySelector('[data-knot-preview-only]').click());
    await read(()=>{
      const change=MathWorkspaceKnotOperations.prepareMosaicFlip(get(multi.knot),api.localAssetSnapshot().assets,0);if(!change.ok)throw new Error(change.reason);api.updateObjectAsset(change.ref,{data:change.data});
    });
    assert(await read(()=>multi.view.renderArea.querySelector('[data-knot-apply-preview]').disabled),'source changes disable stale preview application');
    assert(await read(()=>!!multi.view.renderArea.querySelector('[data-knot-preview]')),'stale preview is preserved for review');
    await english('[data-panel-type="knot-view"]');
    await read(()=>multi.view.renderArea.querySelector('[data-knot-discard-preview]').click());
    assert.equal(await read(()=>!!multi.view.renderArea.querySelector('[data-knot-preview]')),false);
    await read(()=>api.updateObjectAsset(multi.diagram,{data:JSON.parse(multiSource)}));
    assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>multiBefore));
    await clickCross(1,'multi');
    await read(()=>{const change=MathWorkspaceKnotOperations.prepareMosaicFlip(get(multi.knot),api.localAssetSnapshot().assets,0);api.updateObjectAsset(change.ref,{data:change.data});window.externalUpdate=JSON.stringify(get(multi.knot).data);});
    await read(()=>document.querySelector('[data-knot-detach-apply]').click());
    assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>externalUpdate),'stale confirmation cannot overwrite an intervening source update');
    assert.equal(await read(()=>get(multi.knot).data.source),await read(()=>key(multi.diagram)));
    await read(()=>api.updateObjectAsset(multi.diagram,{data:JSON.parse(multiSource)}));
    await clickCross(1,'multi');await read(()=>document.querySelector('[data-knot-detach-apply]').click());
    assert.equal(await read(()=>get(multi.knot).data.source),'');assert.equal(await read(()=>multi.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),false);
    assert.equal(await read(()=>JSON.stringify(get(multi.diagram).data)),await read(()=>multiSource));
    await read(()=>multi.view.renderArea.querySelector('[data-knot-undo]').click());assert.equal(await read(()=>JSON.stringify(get(multi.knot).data)),await read(()=>multiBefore));assert.equal(await read(()=>multi.view.renderArea.querySelector('[data-knot-sync-mosaic]').checked),true);
    // Simplification is previewed; committing it cannot silently alter Mosaic.
    await read(()=>panels.reveal(synced.view));await clickCross(0,'synced');
    await read(()=>synced.view.renderArea.querySelector('[data-knot-simplify]').click());
    assert.equal(await read(()=>synced.view.renderArea.querySelector('[data-knot-drawing]').dataset.crossingCount),'0');
    await read(()=>synced.view.renderArea.querySelector('[data-knot-apply-preview]').click());assert(await read(()=>!!document.querySelector('[data-knot-detach-dialog]')));
    await read(()=>document.querySelector('[data-knot-preview-only]').click());assert(await read(()=>!!synced.view.renderArea.querySelector('[data-knot-preview]')));
    // Restoring a backup discards in-memory previews and histories.
    await read(()=>{const backup=panels.exportText('workspace');panels.importText('workspace',backup);window.synced.view=[...panels.panels.values()].find(p=>p.definition.id==='knot-view'&&p.computation.refs.asset===key(synced.knot));});
    assert.equal(await read(()=>!!synced.view.renderArea.querySelector('[data-knot-preview]')),false);
    await read(()=>{const picker=document.querySelector('[data-design-picker]');picker.value='knot-hover';picker.dispatchEvent(new Event('change'));});
    for(const id of ['halo','ticks','ring']){
      await read(id=>document.querySelector('[data-knot-hover-choice="'+id+'"]').click(),id);assert.equal(await read(()=>synced.view.renderArea.querySelector('[data-knot-drawing]').dataset.knotHover),id);
      if(id!=='ticks')assert.equal(await read(()=>synced.view.renderArea.querySelector('.workspace-knot-crossing-highlight circle').getAttribute('r')),'12','ring and halo circle sizes match');
    }
    await read(()=>document.querySelector('#workspace-design-lab button[aria-label="Move to main area"]').click());
    const shot=await client.send('Page.captureScreenshot',{format:'png'});const filename=path.join(os.tmpdir(),'math-workspace-knot-hover.png');fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));console.log('Screenshot: '+filename);
    await read(()=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.hoverSettings=JSON.parse(text);}}});
      document.querySelector('[data-knot-hover-choice="halo"]').click();document.querySelector('[data-design-copy="knot-hover"]').click();
    });await waitFor(()=>read(()=>!!window.hoverSettings));
    assert.deepEqual(await read(()=>hoverSettings),{knotInteraction:{hover:'halo'}});
    await read(()=>{document.querySelector('[data-knot-hover-choice="ticks"]').click();document.querySelector('[data-design-exit]').click();});assert.equal(await read(()=>MathWorkspaceKnotEditing.hover()),'halo');
    await english('[data-panel-type="knot-view"]');
    console.log('PASS actual crossing clicks, synchronized followers, R1/R2 previews, cancel/preview/detach, undo, backups and hover designs');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
