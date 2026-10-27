'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { startServer, launchBrowser, stopBrowser, waitFor, evaluate } = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server = await startServer(); let session;
  try {
    session = await launchBrowser('http://127.0.0.1:' + server.address().port + '/math_workspace.html');
    const { client } = session, read = (fn, ...args) => evaluate(client, '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')');
    const errors=[];
    await client.send('Runtime.enable');
    client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    const type = async value => { for (const text of value) await client.send('Input.insertText', { text }); };
    const key = async (key, code, modifiers=0) => {
      for(const type of ['keyDown','keyUp']) await client.send('Input.dispatchKeyEvent',{type,key,code,modifiers,windowsVirtualKeyCode:key==='a'?65:key==='Backspace'?8:0});
    };
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.get=ref=>api.localAssetSnapshot().assets.find(a=>key(a)===key(ref));
      api.openCanvas('assets');document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));
      [...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();
      document.querySelector('[data-create-kind="number"]').click();
      window.n=api.localAssetSnapshot().assets.find(a=>a.kind==='number');
      api.updateObjectAsset(n,{name:'g',data:{...get(n).data,hasValue:true,value:'2',replaceWithValue:true}});
      window.input=panels.open('number-input',key(n),'main');window.display=panels.open('number-view',key(n),'side');
    });
    assert.equal(await read(()=>get(n).dependencies[0].kind),'field');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===get(n).data.field).data.dataType),'rational');
    assert.match(await read(()=>display.computation.result.text),/g = 2/);

    // Actual sequential editing: incomplete fractions and signs never replace the model.
    await read(()=>input.numberControls.value.focus());
    await key('a','KeyA',2);await key('Backspace','Backspace');
    assert.equal(await read(()=>input.numberControls.value.value),'');
    assert.equal(await read(()=>get(n).data.value),'2');
    await type('-');assert.equal(await read(()=>get(n).data.value),'2');
    await type('1.25');
    assert.equal(await read(()=>input.numberControls.value.value),'-1.25');
    assert.equal(await read(()=>get(n).data.value),'-1.25');
    assert.match(await read(()=>display.computation.result.text),/-5\/4/);
    await type('/');assert.equal(await read(()=>get(n).data.value),'-1.25');
    await key('a','KeyA',2);await type('3/2');
    assert.equal(await read(()=>get(n).data.value),'3/2');
    await read(()=>input.name.focus());

    const cases=[
      ['rational','0.125',{},'1/8'],['real','-2.5',{},'-5/2'],['complex','1+2i',{},'1 + 2*I'],
      ['finite-field','3/2',{finiteFieldPrime:7},'5'],
      ['rational-function','(t^2-1)/(t-1)',{},'t + 1'],
      ['number-field','a^2',{numberFieldSymbol:'a',numberFieldPolynomial:'a^2-2'},'2'],
      ['number-field','b^2',{numberFieldSymbol:'b',numberFieldPolynomial:'x^2-3'},'3']
    ];
    for(const [dataType,value,extra,expected] of cases) {
      const result=await read((dataType,value,extra)=>{
        const f={kind:'field',id:'test',data:MathWorkspaceObjects.normalize('field','field',{dataType,...extra})};
        return MathWorkspaceNumbers.evaluate({kind:'number',id:'test',name:'b',data:{hasValue:true,value,field:key(f)}},[f]).text;
      },dataType,value,extra);
      assert.equal(result,expected,dataType+' uses the existing exact coefficient arithmetic');
    }
    assert.match(await read(()=>{try{const f={kind:'field',id:'f',data:MathWorkspaceObjects.normalize('field','field',{dataType:'finite-field'})};MathWorkspaceNumbers.evaluate({data:{hasValue:true,value:'1/7',field:key(f)}},[f]);return '';}catch(error){return error.message;}}),/zero/i);

    await read(()=>{
      api.updateObjectAsset(n,{data:{...get(n).data,value:'2'}});
      window.curve=api.createObjectAsset('variety',{type:'curve',name:'C',data:{genus:'1',genusNumber:key(n)}});
      window.sym=api.createObjectAsset('variety',{type:'symmetric-product-curve',name:'S',data:{genus:'1',power:'2',genusNumber:key(n)}});
      window.sheaf=api.createObjectAsset('sheaf',{type:'locally-free',name:'E',data:{base:key(curve),rank:'1',rankNumber:key(n)}});
      window.overview=panels.open('sheaf-view',key(sheaf),'side');
      api.bindAssetPropertySlot('hodge',curve,{focus:false,promote:false});
      window.hodge=()=>api.assetsCardState.slots.get('hodge').rendererSession.editor.inspectorShadow.querySelector('#hodge-card')?.textContent;
    });
    assert.equal(await read(()=>get(curve).dependencies.some(ref=>key(ref)===key(n))),true);
    assert.equal(await read(()=>overview.computation.status),'current');
    const hodge2=await read(()=>hodge());assert(hodge2,'Hodge property is mounted');
    assert.equal(await read(()=>MathWorkspaceNativeEditors.decodeState(overview.propertyRenderer.editor.capture().model).state.sheaves.find(a=>a.__workspaceAssetKey===key(sheaf)).rank),'2','rank is projected from the Number');
    await read(()=>api.updateObjectAsset(n,{data:{...get(n).data,value:'3'}}));
    assert.notEqual(await read(()=>hodge()),hodge2,'a shared number update recomputes Hodge numbers');
    assert.equal(await read(()=>MathWorkspaceNativeEditors.decodeState(overview.propertyRenderer.editor.capture().model).state.sheaves.find(a=>a.__workspaceAssetKey===key(sheaf)).rank),'3');
    await read(()=>api.updateObjectAsset(n,{data:{...get(n).data,replaceWithValue:false}}));
    assert.match(await read(()=>hodge()),/g/,'an assigned value can retain its symbol');
    await read(()=>api.updateObjectAsset(n,{data:{...get(n).data,replaceWithValue:true}}));
    assert.deepEqual(await read(()=>get(curve).data.genus),{kind:'reference',ref:await read(()=>key(n))});
    assert.equal(await read(()=>Object.hasOwn(get(curve).data,'genusNumber')),false,'the legacy pair becomes a single source');
    await read(()=>api.updateObjectAsset(n,{data:{...get(n).data,value:'3/2'}}));
    assert.equal(await read(()=>get(n).data.value),'3/2','a Number update does not depend on the validity of its consumers');
    assert.equal(await read(()=>api.localAssetSnapshot().diagnostics[key(curve)].valid),false);
    await read(()=>api.updateObjectAsset(n,{data:{...get(n).data,value:'3'}}));
    await read(()=>api.updateObjectAsset(n,{name:'h_{2}',data:{...get(n).data,hasValue:false,value:'0'}}));
    assert.equal(await read(()=>overview.computation.status),'current');
    assert.match(await read(()=>hodge()),/h/,'the native symbolic result uses the editable Number name');
    assert.doesNotMatch(await read(()=>hodge()),/w[0-9a-z]{10,}/,'internal reference symbols do not leak');
    await read(()=>{input.numberControls.mode.value='value';input.numberControls.mode.dispatchEvent(new Event('change'));input.numberControls.value.focus();});
    await key('a','KeyA',2);await key('Backspace','Backspace');
    await read(()=>api.updateObjectAsset(sym,{name:'S_2'}));
    assert.equal(await read(()=>input.numberValueRow.hidden),false,'an invalid mode transition keeps its editable draft visible during unrelated refreshes');
    assert.equal(await read(()=>input.numberControls.value.value),'');
    await type('12');assert.equal(await read(()=>get(n).data.value),'12');
    await read(()=>{input.name.focus();api.updateObjectAsset(n,{data:{...get(n).data,hasValue:false}});});
    await read(()=>{
      api.bindAssetInputInstance(curve);
      window.mode=kind=>{const control=document.querySelector('[data-scalar-mode="genus"]');control.value=kind;control.dispatchEvent(new Event('change',{bubbles:true}));};
      mode('literal');
    });
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="genus"]').value),'','a purely symbolic reference has no value to copy');
    assert.equal(await read(()=>get(curve).data.genus.kind),'reference','an empty value draft does not erase the saved source');
    await read(()=>document.querySelector('[data-scalar-value="genus"]').focus());
    await type('+');await read(()=>api.flushAssetInputInstance(api.activeAssetInputInstance()));
    assert.equal(await read(()=>get(curve).data.genus.kind),'reference','an incomplete sign is only a draft');
    await type('12 ');
    await waitFor(()=>read(()=>get(curve).data.genus.kind==='literal'));
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="genus"]').value),'+12 ','raw spacing and sign survive autosave');
    assert.equal(await read(()=>get(curve).data.genus.value),'12');
    assert(!await read(()=>get(curve).dependencies.some(ref=>key(ref)===key(n))),'clearing a reference releases the dependency');
    await read(()=>{
      mode('reference');
      document.querySelector('[data-assets-reference="genus"]').click();
      [...document.querySelectorAll('.workspace-reference-option')].find(node=>node.dataset.assetKey===key(n)).click();
    });
    await waitFor(()=>read(()=>get(curve).data.genus.ref===key(n)));
    assert.equal(await read(()=>document.querySelectorAll('.workspace-scalar-field[aria-label="Genus"]').length),1);
    assert.equal(await read(()=>document.querySelectorAll('[data-assets-reference="genusNumber"],[data-assets-field="genus"]').length),0);

    await read(()=>{
      window.saved=panels.exportText('workspace');window.before=api.localAssetSnapshot().assets;
      panels.importText('workspace',saved);
    });
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.map(({fingerprint,...asset})=>asset)),await read(()=>before.map(({fingerprint,...asset})=>asset)),'backup restores field, number, and dependent object records');
    await read(()=>{
      const legacy=JSON.parse(saved);
      for(const asset of legacy.assets)for(const spec of MathWorkspaceNumbers.references(asset.kind,asset.type).filter(spec=>spec.scalar)) {
        if(asset.data[spec.field].kind==='reference')asset.data[spec.legacyField]=asset.data[spec.field].ref;
        asset.data[spec.field]='1';
      }
      panels.importText('workspace',JSON.stringify(legacy));
    });
    assert.equal(await read(()=>get(curve).data.genus.ref),await read(()=>key(n)),'legacy backup keeps the active reference');
    assert.equal(await read(()=>Object.hasOwn(get(sheaf).data,'rankNumber')),false);
    const deletion=await read(()=>api.assetRequest('plan-delete',{refs:[{kind:n.kind,id:n.id}]}));
    const [curveId,sheafId]=await read(()=>[curve.id,sheaf.id]);
    assert(deletion.dependents.some(a=>a.id===curveId));
    assert(deletion.dependents.some(a=>a.id===sheafId));
    await read(()=>{
      const exported=JSON.parse(panels.exportText(key(n)));exported.data.hasValue=true;exported.data.value='4';exported.data.replaceWithValue=true;
      panels.importText(key(n),JSON.stringify(exported));
      window.finalDisplay=panels.open('number-view',key(n),'main');panels.open('number-input',key(n),'side');
    });
    assert.match(await read(()=>finalDisplay.computation.result.text),/= 4/);
    await read(()=>{
      window.inlineCurve=api.createObjectAsset('variety',{type:'curve',name:'D',data:{genus:'5'}});api.bindAssetInputInstance(inlineCurve);
      document.querySelector('[data-scalar-promote="genus"]').click();
    });
    await waitFor(()=>read(()=>get(inlineCurve).data.genus.kind==='reference'));
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===get(inlineCurve).data.genus.ref).data.value),'5','Save as Number promotes the current literal genus');
    await read(()=>{mode('literal');});
    assert.deepEqual(await read(()=>get(inlineCurve).data.genus),{kind:'literal',value:'5'},'detaching copies the current known value');
    await read(()=>document.querySelector('[data-scalar-value="genus"]').focus());
    await key('a','KeyA',2);await type('2e');
    await read(()=>{api.flushAssetInputInstance(api.activeAssetInputInstance());panels.importText('workspace',panels.exportText('workspace'));});
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="genus"]').value),'2e','backup preserves an incomplete parameter draft');
    assert.equal(await read(()=>get(inlineCurve).data.genus.value),'5');
    await read(()=>document.querySelector('[data-scalar-value="genus"]').focus());
    await key('a','KeyA',2);await type('6');await read(()=>document.querySelector('[data-scalar-value="genus"]').blur());
    assert.equal(await read(()=>get(inlineCurve).data.genus.value),'6');
    await read(()=>{api.bindAssetInputInstance(sheaf);const mode=document.querySelector('[data-scalar-mode="rank"]');mode.value='literal';mode.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.deepEqual(await read(()=>get(sheaf).data.rank),{kind:'literal',value:'4'},'rank uses the same source control');
    await read(()=>document.querySelector('[data-scalar-value="rank"]').focus());
    await key('a','KeyA',2);await type('0');await read(()=>api.flushAssetInputInstance(api.activeAssetInputInstance()));
    assert.equal(await read(()=>get(sheaf).data.rank.value),'4','an invalid rank does not overwrite the model');
    await key('a','KeyA',2);await type('12');await read(()=>document.querySelector('[data-scalar-value="rank"]').blur());
    assert.equal(await read(()=>get(sheaf).data.rank.value),'12');
    await read(()=>{api.bindAssetInputInstance(inlineCurve);document.querySelector('.workspace-scalar-field').scrollIntoView({block:'center'});});
    fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-number.png'),Buffer.from((await client.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    assert.deepEqual(errors,[]);
    console.log('Number assets: exact fields, sequential drafts, shared genus/rank, symbolic labels, reference picker, backup/import, and deletion passed');
  } finally { if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve)); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
