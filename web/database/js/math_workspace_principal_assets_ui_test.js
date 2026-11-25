'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');

async function checkMathJaxMenu(client, read, assetKey) {
  const phase = await waitFor(() => read(() => {
    const phase = MathWorkspaceLoader.mathPhase;
    return phase === 'ready' || phase === 'error' ? phase : null;
  }), 30000, 'MathJax loading result');

  if (phase === 'error') {
    const attempts = await read(() => MathWorkspaceLoader.mathAttempts);
    assert.deepEqual(attempts.map(attempt => attempt.status), ['failed', 'failed'], 'MathJax should start if either source downloads');
    assert.equal(await read(() => window.MathJax.options.enableMenu), false);
    console.log('PASS MathJax menu config (both CDN downloads failed; rendered right-click skipped)');
    return;
  }

  assert.equal(await read(() => MathJax.config.options.enableMenu), false);
  const point = await waitFor(() => read(assetKey => {
    const formula = document.querySelector('[data-asset-key="' + assetKey + '"] .workspace-asset-name mjx-container');
    if (!formula) return null;
    formula.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = formula.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    return document.elementFromPoint(x, y)?.closest('mjx-container') === formula ? { x, y } : null;
  }, assetKey), 5000, 'visible MathJax formula in an asset name');
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'right', buttons: 2, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'right', buttons: 0, clickCount: 1 });
  assert(await read(() => document.querySelector('#workspace-assets-context-menu').checkVisibility()), 'right-click on rendered math opens the workspace asset menu');
  assert.equal(await read(() => document.querySelector('#workspace-assets-context-menu > button')?.textContent), 'Open');
  assert.equal(await read(() => !!document.querySelector('.CtxtMenu_Menu, .CtxtMenu_MenuFrame')), false, 'MathJax does not open its context menu');
  console.log('PASS right-click on rendered math opens the workspace asset menu');
}

async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('about:blank');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await client.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/math_workspace.html'});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&MathWorkspaceAssetsTest.state.ready),20000,'workspace assets');
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.registry=MathWorkspacePanelRegistry;window.key=asset=>asset.kind+':'+asset.id;
      window.young=api.createObjectAsset('young',{data:{rows:[2,1]}});window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.marked=api.createObjectAsset('dynkin',{data:{lie:key(lie),vertices:[1]}});
      window.select=(...assets)=>{assets.forEach((asset,index)=>api.selectAssetKey(key(asset),{ctrlKey:index>0}));if(document.querySelector('#workspace-card-picker').hidden)document.querySelector('#workspace-add-card').click();};
      window.option=id=>document.querySelector('#workspace-card-options > .workspace-card-option input[data-panel-type="'+id+'"]');
      window.properties=asset=>{document.querySelector('[data-asset-key="'+key(asset)+'"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:200}));const cascade=[...document.querySelectorAll('#workspace-assets-context-menu > .workspace-assets-menu-cascade')].find(node=>node.querySelector(':scope > button').textContent.startsWith('Properties'));return [...cascade.querySelectorAll('.workspace-assets-submenu > button')].map(button=>button.textContent);};
      select(lie);
    });
    assert.equal(await read(()=>registry.getPrincipals().enabled),true);
    assert.equal(await read(()=>registry.getPrincipals().types['asset:homology']),undefined);
    const waiting=await read(()=>Object.entries(registry.getPrincipals().types).filter(([,value])=>value==='wait').map(([id])=>id).sort());
    assert.deepEqual(waiting,[]);
    for(const kind of ['variety','sheaf','map'])assert.equal(await read(kind=>registry.getPrincipals().types['asset:homology-'+kind],kind),kind);
    assert(await read(()=>Object.keys(registry.getPrincipals().types).every(id=>registry.get(id).role==='property')),'only actual properties can have principal types');
    assert.equal(await read(()=>registry.getPrincipals().types['matrix-view']),undefined);
    assert.equal(await read(()=>!!option('weight')),false,'confirmed ownership applies on page load');
    assert.equal(await read(()=>!!option('dynkin-cartan')),true);
    const propertyNames=await read(()=>properties(lie));assert(!propertyNames.includes('Lie Algebra Weight'));assert(propertyNames.includes('Cartan Matrix'),'the asset Properties menu uses the same principal choices');
    assert(!propertyNames.includes('Dynkin diagram'));assert(!propertyNames.includes('Object Display'),'display panels never appear as Properties');
    await read(()=>select(young,lie));
    assert.equal(await read(()=>!!option('weight')),true);
    await read(()=>option('weight').click());
    assert.deepEqual(await read(()=>[...panels.panels.values()].find(panel=>panel.definition.id==='weight').computation.refs),await read(()=>({lambda:key(young),lie:key(lie)})),'supporting inputs continue to bind');
    await read(()=>{window.weight=[...panels.panels.values()].find(panel=>panel.definition.id==='weight');select(lie);});
    assert.equal(await read(()=>option('weight')),null);
    assert.equal(await read(()=>weight.closed),false,'filtering does not close existing panels');
    await read(()=>select(marked));
    assert.equal(await read(()=>option('dynkin-cartan')),null);
    assert.equal(await read(()=>option('dynkin-invariants')),null);
    assert.equal(await read(()=>!!option('dynkin-vertex')),true,'properties that use marks remain with marked diagrams');
    assert(!(await read(()=>registry.principalCandidates('dynkin-cartan'))).includes('dynkin'));
    await read(()=>select(lie));
    await read(()=>option('dynkin-cartan').click());
    assert.equal(await read(()=>[...panels.panels.values()].find(panel=>panel.definition.id==='dynkin-cartan').computation.refs.lie),await read(()=>key(lie)));
    assert.equal(await read(()=>panels.exportText('workspace').includes('principal-assets')),false,'principal settings stay out of workspace backups');
    await read(()=>{
      window.x=api.createObjectAsset('variety',{type:'projective',data:{dimension:'2'}});
      window.sheaf=api.createObjectAsset('sheaf',{type:'structure',data:{base:key(x)}});
      window.map=api.createObjectAsset('map',{type:'ordinary',data:{domain:key(x),codomain:key(x)}});
    });
    await read(()=>MathWorkspaceLoader.ensure(['complex']));
    for(const [name,label] of [['x','Variety Homology Classes'],['sheaf','Sheaf Class Relations'],['map','Map Pullback / Pushforward']]){
      assert((await read(name=>properties(window[name]),name)).includes(label),'asset menu identifies '+name+' interface');
      await read(name=>api.bindAssetPropertySlot('homology',{kind:window[name].kind,id:window[name].id},{selectTarget:false,focus:false,promote:false}),name);
      assert(await read((name,label)=>api.assetsCardState.slots.get('homology-'+window[name].kind).rendererSession.editor.inspectorShadow.querySelector('#homology-card .card-head').getAttribute('aria-label').includes(label),name,label),'panel title identifies the bound interface');
    }
    assert.deepEqual((await read(()=>[...api.assetsCardState.instances.values()].filter(instance=>instance.cardType.startsWith('homology-')).map(instance=>instance.targetRef.kind))).sort(),['map','sheaf','variety'],'the three interfaces retain independent bound instances');
    assert.equal(await read(()=>new Set(['variety','sheaf','map'].map(kind=>api.assetsCardState.slots.get('homology-'+kind).rendererSession)).size),3);
    assert(await read(()=>['variety','sheaf','map'].every(kind=>api.assetsCardState.slots.get('homology-'+kind).visible)),'all three interfaces stay open together');
    await read(()=>select(x,sheaf,map));
    assert.deepEqual((await read(()=>[...document.querySelectorAll('#workspace-card-options > .workspace-card-option input')].filter(input=>input.dataset.panelType?.startsWith('asset:homology-')).map(input=>input.dataset.panelType))).sort(),['asset:homology-map','asset:homology-sheaf','asset:homology-variety']);
    await read(()=>option('asset:homology-sheaf').click());
    assert.deepEqual(await read(()=>['variety','sheaf','map'].map(kind=>api.assetsCardState.slots.get('homology-'+kind).visible)),[true,false,true],'each panel can be hidden independently');
    await read(()=>option('asset:homology-sheaf').click());
    await read(()=>{document.querySelector('#workspace-card-picker').hidden=true;document.querySelector('#workspace-assets-context-menu').hidden=true;});
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-principal-assets.png'),Buffer.from(shot.data,'base64'));
    await checkMathJaxMenu(client, read, await read(()=>key(lie)));
    assert.deepEqual(errors,[]);
    console.log('PASS approved ownership, independent Homology panels, Lie-only relations and clean backups');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
