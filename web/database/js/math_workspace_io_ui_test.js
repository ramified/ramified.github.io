'use strict';
const assert = require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate} = require('./math_workspace_drag_regression_test.js');
async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client} = session, read = (fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest; window.panels=MathWorkspaceObjectPanels;
      window.key=a=>a.kind+':'+a.id;
      window.y=api.createObjectAsset('young',{data:{partition:'3,2'}});
      window.f=api.createObjectAsset('frame',{data:{ambientDimension:3}});
      window.s=api.createObjectAsset('sphere',{data:{ambientDimension:3,radius:3}});
      window.m=api.createObjectAsset('matrix',{data:{rows:2,cols:2,entries:[['1/2','2'],['3','4']]}});
      window.v=api.createObjectAsset('variety');
      window.e=api.createObjectAsset('sheaf',{data:{base:key(v),rank:'2'}});
      window.yp=panels.open('young-input',key(y),'main');
      window.mi=panels.open('matrix-input',key(m),'side');
      // Preserve a legacy saved duplicate independently of ordinary editor reuse.
      window.hiddenInput=panels.open('young-input',key(y),'side',{id:'object-panel-9000'});panels.move(hiddenInput,'hidden');
      window.c=api.createObjectAsset('category');window.functor=api.createObjectAsset('functor',{data:{domain:key(c),codomain:key(c)}});
      window.diagram=panels.open('category-diagram',key(functor),'side');
      diagram.propertyRenderer.editor.objectIO('layout',[{id:key(c),x:.3,y:.7}]);
      window.scene=panels.open('slicing-scene',key(s),'main');scene.computation.refs.frame=key(f);panels.refresh();
      scene.propertyRenderer.editor.objectIO('view',{viewport:{...scene.propertyRenderer.editor.objectIO('view').viewport,zoom:1.7},layers:[]});
      window.display=panels.open('slicing-display','','side');display.computation.refs.view=scene.id;panels.refresh();
      mi.node.classList.add('collapsed','is-pinned');panels.syncPresentation(mi.id);
      api.openCanvas('sheaf-complexes'); api.closeCanvas('sheaf-complexes'); // Closed canvas sessions are still part of a complete backup.
      api.openCanvas('mosaic');api.closeCanvas('mosaic');api.openCanvas('places');api.closeCanvas('places');
      api.bindAssetInputInstance({kind:'variety',id:v.id});
      api.updateAssetInputDraft(api.activeAssetInputInstance(),{name:'unfinished ',data:{dimension:''}},{schedule:false});
      api.bindAssetPropertySlot('hodge',{kind:'variety',id:v.id},{focus:false,promote:false});
      api.selectCanvasTab(yp.id);api.setSplitView(true);api.selectCanvasTab(scene.id);
      window.saved=panels.exportText('workspace');window.savedData=JSON.parse(saved);
    });
    assert.equal(await read(()=>savedData.schema),'ramified-math-workspace');
    assert.equal(await read(()=>savedData.assets.length),9);
    assert.equal(await read(()=>savedData.calculators.some(c=>c.id==='sheaf-complexes')),true);
    assert.equal(await read(()=>panels.ioEntries().some(e=>e.id==='workspace'&&e.canImport)),true);
    assert.deepEqual(await read(()=>panels.exportFormats('workspace').map(f=>f.id)),['json']);
    for (const id of ['frame','sphere','variety','sheaf','category','functor']) {
      const formats=await read(kind=>panels.exportFormats(key(savedData.assets.find(a=>a.kind===kind))).map(f=>f.id),id);
      assert(!formats.includes('sage')&&!formats.includes('macaulay2'),'unsupported '+id+' must not offer CAS formats');
    }
    assert.deepEqual(await read(()=>panels.exportFormats(key(y)).filter(f=>['sage','macaulay2'].includes(f.id)).map(f=>f.id)),['sage']);
    assert.match(await read(()=>panels.exportText(key(y),'sage')),/ = Partition\(\[3, 2\]\)/);
    for (const format of ['sage','macaulay2']) {
      const code=await read(fmt=>panels.exportText(key(m),fmt),format);
      assert.match(code,/A = (Matrix|matrix)/);assert.doesNotMatch(code,/json|HashTable|workspace_data/);
    }
    assert.match(await read(()=>{try{panels.exportText(key(e),'macaulay2');return '';}catch(error){return error.message;}}),/no supported native definition/);
    const before=await read(()=>api.localAssetSnapshot().assets);
    for (const invalid of ['version','duplicate','reference','field-reference','panel']) {
      const error=await read(mode=>{
        const bad=JSON.parse(saved);
        if(mode==='version')bad.version=99;
        if(mode==='duplicate')bad.assets.push(bad.assets[0]);
        if(mode==='reference')bad.assets.find(a=>a.kind==='sheaf').data.base='variety:missing';
        if(mode==='field-reference')bad.assets.find(a=>a.kind==='matrix').data.field='field:missing';
        if(mode==='panel')bad.panels[0].type='missing';
        try {panels.importText('workspace',JSON.stringify(bad));return '';} catch(error){return error.message;}
      },invalid);
      assert(error,invalid+' must be rejected'); assert.deepEqual(await read(()=>api.localAssetSnapshot().assets),before,'invalid backups leave all objects unchanged');
    }
    await read(()=>{api.updateObjectAsset({kind:'young',id:y.id},{data:{partition:'1'}});api.createObjectAsset('category');panels.move(yp,'side');panels.importText('workspace',saved);});
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.map(a=>({kind:a.kind,id:a.id,type:a.type,name:a.name,data:a.data,properties:a.properties}))),before.map(a=>({kind:a.kind,id:a.id,type:a.type,name:a.name,data:a.data,properties:a.properties})));
    assert.deepEqual(await read(()=>[...panels.panels.keys()]),await read(()=>savedData.panels.map(p=>p.id)));
    assert.equal(await read(()=>panels.panels.get(yp.id).location),'main');
    assert.equal(await read(()=>panels.panels.get(mi.id).node.classList.contains('is-pinned')),true);
    assert.equal(await read(()=>panels.panels.get(mi.id).collapsed),true);
    assert.equal(await read(()=>panels.panels.get(scene.id).propertyRenderer.editor.objectIO('view').viewport.zoom),1.7);
    assert.equal(await read(()=>panels.panels.get(display.id).computation.refs.view),await read(()=>scene.id));
    assert.equal(await read(()=>panels.panels.get(hiddenInput.id).location),'hidden');
    assert.deepEqual(await read(()=>{const point=panels.panels.get(diagram.id).propertyRenderer.editor.captureAssetLayout().find(item=>item.key===key(c)).point;return {x:point.x,y:point.y};}),{x:.3,y:.7});
    assert.equal(await read(()=>api.activeAssetInputInstance().draft.name),'unfinished ');
    assert.equal(await read(()=>api.activeAssetInputInstance().draft.data.dimension),'');
    assert.equal(await read(()=>api.sessions.has('sheaf-complexes')),true);
    assert.deepEqual(await read(()=>[...api.sessions.keys()]),['sheaf-complexes','mosaic','places']);
    assert.equal(await read(()=>api.assetsCardState.slots.get('hodge').visible),true);
    assert.deepEqual(await read(()=>JSON.parse(panels.exportText('workspace')).workspace.panes),await read(()=>savedData.workspace.panes));
    assert.deepEqual(await read(()=>JSON.parse(panels.exportText('workspace')).workspace.inspectorOrder),await read(()=>savedData.workspace.inspectorOrder));
    // A failure inside a native restorer must roll back objects and panels too.
    const rollback=await read(()=>{const bad=JSON.parse(saved);bad.panels.find(p=>p.renderers.length).renderers[0].snapshot.model={$kind:'invalid'};try{panels.importText('workspace',JSON.stringify(bad));return '';}catch(error){return error.message;}});
    assert.match(rollback,/previous workspace was restored/);
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.kind==='young').data.partition),'3, 2');
    await read(()=>{
      const exporter=document.querySelector('#workspace-io-exporter');exporter.value=key(y);exporter.dispatchEvent(new Event('change'));
      const format=document.querySelector('#workspace-io-format');format.value='sage';format.dispatchEvent(new Event('change'));
    });
    assert.match(await read(()=>document.querySelector('#workspace-io-output').value),/ = Partition\(\[3, 2\]\)/);
    await read(()=>{const exporter=document.querySelector('#workspace-io-exporter');exporter.value=key(e);exporter.dispatchEvent(new Event('change'));});
    assert.deepEqual(await read(()=>[...document.querySelector('#workspace-io-format').options].filter(o=>['sage','macaulay2'].includes(o.value)).map(o=>o.value)),[],'the live menu removes unsupported CAS formats when the target changes');
    assert.equal(await read(()=>JSON.parse(document.querySelector('#workspace-io-output').value).kind),'sheaf','a removed format falls back to the normal JSON export');
    await read(()=>{const importer=document.querySelector('#workspace-io-importer');importer.value='workspace';importer.dispatchEvent(new Event('change'));});
    assert.match(await read(()=>document.querySelector('#workspace-io-target').textContent),/replaces this workspace/);
    // Import into a fresh document, with none of the original renderer instances available.
    const portable=await read(()=>saved);
    await client.send('Page.reload');await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),portable);
    assert.equal(await read(()=>MathWorkspaceAssetsTest.localAssetSnapshot().assets.length),9);
    assert.equal(await read(()=>[...MathWorkspaceObjectPanels.panels.values()].find(p=>p.definition.slicingScene).propertyRenderer.editor.objectIO('view').viewport.zoom),1.7);
    assert.equal(await read(()=>MathWorkspaceAssetsTest.activeAssetInputInstance().draft.data.dimension),'');
    await read(()=>new Promise(resolve=>setTimeout(resolve,600)));
    assert.equal(await read(()=>MathWorkspaceAssetsTest.activeAssetInputInstance().draft.data.dimension),'','restored drafts remain separate from model values after the autosave delay');
    console.log('math_workspace_io_ui_test: complete workspace replacement, references, panels, view state, drafts, native sessions, rollback and CAS formats passed');
  } finally { if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve)); }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
