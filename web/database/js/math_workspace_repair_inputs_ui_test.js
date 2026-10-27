'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    const press=async(key,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code,modifiers,windowsVirtualKeyCode:key==='a'?65:0});};
    const replace=async(selector,text)=>{await read(selector=>document.querySelector(selector).focus(),selector);await press('a','KeyA',2);await client.send('Input.insertText',{text});};
    const commit=()=>read(()=>{document.activeElement.blur();api.flushAssetInputInstance(api.activeAssetInputInstance());});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.get=a=>api.localAssetSnapshot().assets.find(item=>key(item)===key(a));
      window.warning=a=>document.querySelector('[data-asset-key="'+key(a)+'"] .workspace-asset-warning');window.mode=field=>{const control=document.querySelector('[data-scalar-mode="'+field+'"]');control.value='literal';control.dispatchEvent(new Event('change',{bubbles:true}));};
      window.g=api.createObjectAsset('number',{name:'g',data:{hasValue:true,value:'2'}});
      window.curve=api.createObjectAsset('variety',{type:'curve',name:'C',data:{genus:{kind:'reference',ref:key(g)}}});
      window.sheaf=api.createObjectAsset('sheaf',{type:'locally-free',name:'E',data:{base:key(curve),rank:{kind:'reference',ref:key(g)}}});
      api.openCanvas('assets');api.bindAssetInputInstance(curve);api.updateObjectAsset(g,{data:{...get(g).data,value:'3/2'}});
    });
    assert(await read(()=>!!warning(curve)));assert(await read(()=>!!warning(sheaf)),'fractional rank warns on the sheaf');
    await read(()=>{api.bindAssetInputInstance(sheaf);api.bindAssetInputInstance(curve);});
    assert.equal(await read(()=>document.querySelector('[data-assets-reference="genus"]').dataset.assetsReferenceValue),await read(()=>key(g)),'reopening an invalid variety preserves its visible reference');
    assert.match(await read(()=>document.querySelector('[data-assets-editor-status]').textContent),/Needs repair.*integer/);
    await read(()=>mode('genus'));
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="genus"]').value),'','an invalid reference can be detached into an empty draft');
    assert.equal(await read(()=>get(curve).data.genus.kind),'reference');
    await read(()=>api.updateObjectAsset(g,{data:{...get(g).data,value:'5/2'}}));
    await replace('[data-scalar-value="genus"]','4');await commit();
    assert.deepEqual(await read(()=>get(curve).data.genus),{kind:'literal',value:'4'},'a pending repair survives upstream revision changes');
    assert.equal(await read(()=>api.activeAssetInputInstance().conflictState),null);assert.equal(await read(()=>warning(curve)),null);
    await read(()=>{api.bindAssetInputInstance(sheaf);mode('rank');api.updateObjectAsset(g,{data:{...get(g).data,value:'7/2'}});api.createObjectAsset('variety',{name:'X'});});
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="rank"]').value),'');
    await replace('[data-scalar-value="rank"]','3');await commit();
    assert.deepEqual(await read(()=>get(sheaf).data.rank),{kind:'literal',value:'3'});assert.equal(await read(()=>warning(sheaf)),null);
    await read(()=>api.bindAssetInputInstance(curve));await replace('[data-scalar-value="genus"]','1.5');await commit();
    assert.equal(await read(()=>get(curve).data.genus.value),'4','invalid direct drafts preserve the last usable model value');
    assert.match(await read(()=>warning(curve).getAttribute('aria-label')),/Unsaved draft.*integer/);
    await read(()=>api.updateObjectAsset(g,{data:{...get(g).data,value:'9/2'}}));
    assert.equal(await read(()=>document.querySelector('[data-scalar-value="genus"]').value),'1.5');
    await replace('[data-scalar-value="genus"]','2');await commit();
    assert.equal(await read(()=>get(curve).data.genus.value),'2');assert.equal(await read(()=>warning(curve)),null);
    await replace('[data-assets-name]','C_local');
    await read(()=>{api.cancelAssetInputAutosave(api.activeAssetInputInstance());api.updateObjectAsset(curve,{name:'C_remote'});api.flushAssetInputInstance(api.activeAssetInputInstance());});
    assert.equal(await read(()=>api.activeAssetInputInstance().autosaveStatus),'Conflict');
    assert.equal(await read(()=>get(curve).name),'C_remote');assert.equal(await read(()=>document.querySelector('[data-assets-conflict-actions]').hidden),false);
    await read(()=>document.querySelector('[data-assets-resolve="draft"]').click());
    assert.equal(await read(()=>get(curve).name),'C_local');assert.equal(await read(()=>api.activeAssetInputInstance().conflictState),null);
    await replace('[data-assets-name]','C_pending');
    await read(()=>{api.cancelAssetInputAutosave(api.activeAssetInputInstance());api.updateObjectAsset(curve,{name:'C_saved'});api.flushAssetInputInstance(api.activeAssetInputInstance());panels.importText('workspace',panels.exportText('workspace'));api.flushAssetInputInstance(api.activeAssetInputInstance());});
    assert.equal(await read(()=>api.activeAssetInputInstance().autosaveStatus),'Conflict','a backup preserves the draft’s actual base definition');
    await read(()=>document.querySelector('[data-assets-resolve="saved"]').click());
    assert.equal(await read(()=>document.querySelector('[data-assets-name]').value),'C_saved');assert.equal(await read(()=>api.activeAssetInputInstance().dirty),false);
    assert.deepEqual(errors,[]);console.log('Repair inputs: invalid genus/rank detachment, upstream edits, fractional draft badges, real conflict recovery and backup baselines passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
