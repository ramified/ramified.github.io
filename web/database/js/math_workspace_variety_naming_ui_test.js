'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');

(async()=>{
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    const initial=await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.k=api.assetKey;
      window.get=ref=>api.localAssetSnapshot().assets.find(a=>k(a)===k(ref));
      window.moduli=Array.from({length:3},()=>api.createObjectAsset('variety',{type:'ppav-moduli',data:{genus:'2'}}));
      window.Q=api.createObjectAsset('variety',{type:'projective',name:'Q',data:{dimension:'2'}});
      window.Y=api.createObjectAsset('variety',{type:'projective',name:'Y_{1}',data:{dimension:'1'}});
      window.productData={first:k(Q),second:k(Y)};
      window.products=Array.from({length:3},()=>api.createObjectAsset('variety',{type:'product',data:productData}));
      window.manual=api.createObjectAsset('variety',{type:'product',name:'Z_{own}',data:productData});
      return {moduli:moduli.map(a=>get(a).name),products:products.map(a=>get(a).name)};
    });
    assert.deepEqual(initial.moduli,['\\mathcal{A}_{2}','(\\mathcal{A}_{2})_{2}','(\\mathcal{A}_{2})_{3}'],'NAME-001: index the whole moduli expression');
    assert.deepEqual(initial.products,['Q\\times Y_{1}','(Q\\times Y_{1})_{2}','(Q\\times Y_{1})_{3}'],'NAME-001: index the whole product');
    const replace=async(selector,text)=>{
      await read(selector=>{const input=document.querySelector(selector);input.focus();input.select();},selector);
      await client.send('Input.insertText',{text});
    };
    const save=()=>read(()=>document.querySelector('[data-assets-editor]').requestSubmit());
    await read(()=>api.assetRequest('select-for-modify',{ref:moduli[1]}));
    await replace('[data-assets-field="genus"]','3');await save();
    assert.equal(await read(()=>get(moduli[1]).name),'\\mathcal{A}_{3}');
    assert.equal(await read(()=>get(moduli[2]).name),'(\\mathcal{A}_{2})_{3}','a gap keeps the existing copy number');
    await replace('[data-assets-field="genus"]','2');await save();
    assert.equal(await read(()=>get(moduli[1]).name),'(\\mathcal{A}_{2})_{2}');

    await read(()=>api.assetRequest('prepare-create',{kind:'variety'}));
    await read(()=>{const type=document.querySelector('[data-assets-subtype]');type.value='ppav-moduli';type.dispatchEvent(new Event('change',{bubbles:true}));});
    await replace('[data-assets-field="genus"]','2');
    assert.equal(await read(()=>document.querySelector('[data-assets-name]').value),'(\\mathcal{A}_{2})_{4}','unbound Input previews the legal unique name');
    await save();
    assert.equal(await read(()=>get(api.activeAssetInputInstance().targetRef).name),'(\\mathcal{A}_{2})_{4}');

    await read(()=>api.assetRequest('select-for-modify',{ref:Y}));
    await replace('[data-assets-name]','Y_{2}');await save();
    assert.deepEqual(await read(()=>products.map(a=>get(a).name)),['Q\\times Y_{2}','(Q\\times Y_{2})_{2}','(Q\\times Y_{2})_{3}'],'factor renaming updates automatic product names');
    assert.deepEqual(await read(()=>[get(manual).name,get(manual).autoName]),['Z_{own}',''],'factor renaming preserves a manual product name');
    const nested=await read(()=>[0,1].map(()=>api.createObjectAsset('variety',{type:'product',data:{first:k(Q),second:k(products[0])}}).name));
    assert.deepEqual(nested,['Q\\times Q\\times Y_{2}','(Q\\times Q\\times Y_{2})_{2}']);

    // Both clean Input drafts must follow a legacy automatic-name repair.
    await read(()=>api.assetRequest('select-for-modify',{ref:moduli[2]}));
    await read(()=>api.assetRequest('select-for-modify',{ref:products[2]}));
    const backup=await read(()=>MathWorkspaceObjectPanels.exportText('workspace'));
    const expected=await read(()=>api.localAssetSnapshot().assets.map(a=>[a.id,a.name,a.autoName]));
    await client.send('Page.reload');await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),backup);
    assert.deepEqual(await read(()=>MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>[a.id,a.name,a.autoName])),expected,'backup roundtrip preserves automatic/manual names');
    const legacy=JSON.parse(backup),targets=legacy.assets.filter(a=>['(\\mathcal{A}_{2})_{3}','(Q\\times Y_{2})_{3}'].includes(a.name));
    assert.equal(targets.length,2);
    for(const asset of targets){
      asset.name=asset.autoName=asset.name.slice(1,-5)+'_{3}';
      for(const input of legacy.assetCards.instances.filter(i=>i.cardType==='input'&&i.targetRef.id===asset.id)){
        input.draft.name=input.draft.autoName=asset.name;
        const definition=JSON.parse(input.baseDefinition);definition.name=definition.autoName=asset.name;input.baseDefinition=JSON.stringify(definition);
      }
    }
    const importedNames=()=>read(()=>({assets:MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>[a.id,a.name,a.autoName]),input:document.querySelector('[data-assets-name]').value}));
    await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),JSON.stringify(legacy));
    assert.deepEqual((await importedNames()).assets,expected,'legacy automatic copy numbers are repaired without renumbering');
    assert.equal((await importedNames()).input,'(Q\\times Y_{2})_{3}','active clean product draft follows the repair');
    await read(id=>MathWorkspaceAssetsTest.assetRequest('select-for-modify',{ref:{kind:'variety',id}}),targets.find(a=>a.type==='ppav-moduli').id);
    assert.equal((await importedNames()).input,'(\\mathcal{A}_{2})_{3}','clean moduli draft also follows the repair');
    const dirty=JSON.parse(JSON.stringify(legacy)),active=dirty.assetCards.instances.find(i=>i.cardType==='input'&&i.targetRef.id===targets.find(a=>a.type==='product').id);
    active.dirty=true;active.draft.name='\\mathcal{unfinished';active.draft.autoName='';
    await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),JSON.stringify(dirty));
    assert.equal((await importedNames()).input,'\\mathcal{unfinished','legacy repair preserves an unsaved custom draft');
    assert.deepEqual((await importedNames()).assets,expected);
    await read(text=>MathWorkspaceObjectPanels.importText('workspace',text),backup);
    await waitFor(()=>read(()=>!!window.MathJax?.typesetPromise),20000);
    await read(async()=>{await MathJax.startup.promise;const host=document.querySelector('[data-assets-content]');await MathJax.typesetPromise([host]);await MathWorkspaceAssetIcons.typeset(host);});
    assert.equal(await read(()=>!!document.querySelector('[data-assets-content] mjx-merror,[data-assets-content] [data-mjx-error]')),false,'all automatic names render without MathJax errors');
    const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
    const shot=await client.send('Page.captureScreenshot',{format:'png'}),file=path.join(os.tmpdir(),'math-workspace-variety-naming.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));
    console.log('Screenshot: '+file);
    console.log('PASS NAME-001: moduli, products, nested products, real editing, stable numbering, custom names, legacy drafts, MathJax and backup');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
