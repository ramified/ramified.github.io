'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try {
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    assert.equal(await read(()=>!!document.querySelector('#workspace-design-lab')),false);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.a=api.createObjectAsset('young',{name:'a',data:{rows:[2,1]}});window.b=api.createObjectAsset('young',{name:'b',data:{rows:[2,1]}});window.target=api.createObjectAsset('young',{name:'c',data:{rows:[3,2,1]}});window.empty=api.createObjectAsset('young',{name:'e',data:{rows:[]}});window.signed=api.createObjectAsset('young',{type:'generalized',data:{rows:[3,0,-3]}});window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.strand=api.createObjectAsset('strands',{data:{lie:key(lie),generators:[{family:'braid',index:1,sign:-1},{family:'kl',index:2}]}});});
    assert.equal(await read(()=>document.querySelector('[data-asset-key="'+key(empty)+'"] .workspace-asset-icon').dataset.iconSource),'generic');
    assert.equal(await read(()=>document.querySelector('[data-asset-key="'+key(signed)+'"] svg').querySelectorAll('rect').length),6);
    assert.equal(await read(()=>!!document.querySelector('[data-asset-key="'+key(strand)+'"] canvas')),true);
    // Both entry methods leave existing objects untouched and use the same panel.
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'D',code:'KeyD',modifiers:11});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'D',code:'KeyD',modifiers:0});
    await waitFor(()=>read(()=>!!document.querySelector('#workspace-design-lab')));
    assert.equal(await read(()=>new URL(location.href).searchParams.get('designLab')),'1');
    assert.equal(await read(()=>!!document.querySelector('[data-design-setting="marker"]')),false);
    assert.equal(await read(()=>getComputedStyle(document.querySelector('[data-asset-key="'+key(empty)+'"] .workspace-asset-icon'),'::after').content),'none');
    assert.equal(await read(()=>document.querySelectorAll('[data-design-setting]').length),0,'finished icon controls are removed');
    assert.equal(await read(()=>document.querySelector('[data-design-empty]').hidden),true);
    await read(()=>{
      window.labExperimentTitles=[...document.querySelectorAll('[data-design-experiment] > summary')].map(node=>node.textContent);
      window.originalDesign=MathWorkspaceAssetIcons.settings();window.destroyedDesign=0;window.removedDesign=0;
      window.unregisterColor=MathWorkspaceDesignLab.register({id:'test-color',title:'Color experiment',description:'Preview a temporary color.',mount(host,{renderWorkspace}){
        const button=document.createElement('button');button.type='button';button.textContent='Preview color';button.dataset.testDesignColor='';host.append(button);
        button.addEventListener('click',()=>{MathWorkspaceAssetIcons.configure({...MathWorkspaceAssetIcons.settings(),exactColor:'#13579b'});renderWorkspace();});
        return {reset(){MathWorkspaceAssetIcons.configure(originalDesign);},settings(){return {exactColor:MathWorkspaceAssetIcons.settings().exactColor};},destroy(){destroyedDesign++;}};
      }});
      window.unregisterOther=MathWorkspaceDesignLab.register({id:'test-other',title:'Another experiment',mount(host){host.textContent='Independent preview';return {reset(){removedDesign++;},destroy(){removedDesign++;}};}});
      const experiment=document.querySelector('[data-design-picker]');experiment.value='test-color';experiment.dispatchEvent(new Event('change'));
      document.querySelector('[data-test-design-color]').click();
    });
    assert.deepEqual(await read(()=>[...document.querySelectorAll('[data-design-experiment] > summary')].map(node=>node.textContent)),await read(()=>[...labExperimentTitles,'Color experiment','Another experiment']));
    assert.equal(await read(()=>document.querySelector('[data-design-empty]').hidden),true);
    assert.equal(await read(()=>getComputedStyle(document.querySelector('[data-asset-key="'+key(a)+'"] .workspace-asset-icon')).color),'rgb(19, 87, 155)');
    await read(()=>{window.copiedDesign='';Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async text=>{copiedDesign=text;}});document.querySelector('[data-design-copy="test-color"]').click();});
    await waitFor(()=>read(()=>!!copiedDesign));assert.deepEqual(await read(()=>JSON.parse(copiedDesign)),{exactColor:'#13579b'});
    await read(()=>document.querySelector('[data-design-reset="test-color"]').click());
    assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().exactColor),'');assert.equal(await read(()=>removedDesign),0,'reset affects only its own experiment');
    await read(()=>{unregisterOther();unregisterOther();document.querySelector('[data-test-design-color]').click();});
    assert.equal(await read(()=>removedDesign),2,'unregister resets and destroys once');
    assert.equal(await read(()=>document.querySelectorAll('[data-design-experiment]').length),await read(()=>labExperimentTitles.length+1));
    await read(()=>document.querySelector('#workspace-design-lab [data-workspace-card-action="move-area"]').click());
    const backup=await read(()=>panels.exportText('workspace'));const saved=JSON.parse(backup);
    assert(!JSON.stringify(saved.workspace).includes('workspace-design-lab'));assert(!backup.includes('#13579b'));
    await read(text=>panels.importText('workspace',text),backup);
    await read(()=>document.querySelector('[data-design-exit]').click());assert.equal(await read(()=>!!document.querySelector('#workspace-design-lab')),false);
    assert.equal(await read(()=>destroyedDesign),1);assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().exactColor),'');
    await read(()=>unregisterColor());assert.equal(await read(()=>destroyedDesign),1,'removing an inactive experiment does not destroy twice');
    // Searchable creation uses one subject at a time and restores focus.
    await read(()=>document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150})));
    await read(()=>[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent==='New…').click());
    assert.equal(await read(()=>document.querySelector('#workspace-create-dialog').open),true);
    await read(()=>{const select=document.querySelector('[data-create-subject]');select.value='representation';select.dispatchEvent(new Event('change'));});
    assert.equal(await read(()=>document.querySelectorAll('[data-create-kind="matrix"]').length),0);
    assert.equal(await read(()=>document.querySelectorAll('[data-create-kind="fan"]').length),1);
    assert.equal(await read(()=>document.querySelectorAll('.workspace-create-filters select').length),2);
    assert.equal(await read(()=>!!document.querySelector('[data-create-kind="field"]')),false);
    await read(()=>{document.querySelector('[data-create-clear]').click();const input=document.querySelector('[data-create-search]');input.value='braid';input.dispatchEvent(new Event('input'));});
    assert.deepEqual(await read(()=>[...document.querySelectorAll('[data-create-kind]')].map(b=>b.dataset.createKind)),['strands']);
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert.equal(await read(()=>document.querySelector('#workspace-create-dialog').open),false);
    // LR target 2, zero, and absent, with stable and fixed-rank modes.
    await read(()=>{window.lr=panels.open('lr','','side',{refs:{lambda:key(a),mu:key(b),nu:key(target),lie:key(lie)}});window.native=p=>p.propertyRenderer.editor.inspectorShadow;const fixed=native(lr).getElementById('fixed-rank-mode');fixed.checked=false;fixed.dispatchEvent(new Event('change',{bubbles:true}));native(lr).getElementById('compute-schur').click();});
    await waitFor(()=>read(()=>lr.computation.status==='current'));
    assert.match(await read(()=>native(lr).getElementById('schur-out').textContent),/Coefficient = 2/);
    await read(()=>{const select=lr.node.querySelector('[data-object-reference="nu"]');select.value=key(empty);select.dispatchEvent(new Event('change'));native(lr).getElementById('compute-schur').click();});
    assert.match(await read(()=>native(lr).getElementById('schur-out').textContent),/Coefficient = 0/);
    await read(()=>{const select=lr.node.querySelector('[data-object-reference="nu"]');select.value='';select.dispatchEvent(new Event('change'));native(lr).getElementById('compute-schur').click();});
    assert.equal(await read(()=>!!native(lr).querySelector('[data-lr-coefficient]')),false);
    await read(()=>{window.single=api.createObjectAsset('young',{data:{rows:[1]}});window.a1=api.createObjectAsset('lie',{data:{family:'A',rank:1}});window.fixedLR=panels.open('lr','','side',{refs:{lambda:key(single),mu:key(single),nu:key(empty),lie:key(a1)}});native(fixedLR).getElementById('compute-schur').click();});
    assert.match(await read(()=>native(fixedLR).getElementById('schur-out').textContent),/Coefficient = 1/);
    assert.match(await read(()=>native(fixedLR).getElementById('schur-out').textContent),/fixed/);
    // Simple powers use explicit default assets; equivalent Advanced bindings survive.
    await read(()=>{window.p=panels.open('plethysm',key(a),'side');});
    assert.equal(await read(()=>p.computation.settings.mode),'symmetric');assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===p.computation.refs.lambda).data.rows),[2]);
    const firstOuter=await read(()=>p.computation.refs.lambda);
    await read(()=>native(p).getElementById('compute-plethysm').click());
    assert.match(await read(()=>native(p).getElementById('plethysm-out').textContent),/Sym/);
    await read(()=>{p.powerMode.value='advanced';p.powerMode.dispatchEvent(new Event('change'));});assert.equal(await read(()=>p.computation.refs.lambda),firstOuter);
    await read(()=>{p.powerMode.value='exterior';p.powerMode.dispatchEvent(new Event('change'));});
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===p.computation.refs.lambda).data.rows),[1,1]);
    assert.equal(await read(id=>api.localAssetSnapshot().assets.some(a=>key(a)===id),firstOuter),false,'the released default outer diagram is collected');
    // Real sequential editing: blank remains blank, then 1 → 12, without focused replacement.
    await read(()=>p.powerDegree.focus());
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:0});
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    assert.equal(await read(()=>p.powerDegree.value),'');assert.equal(await read(()=>p.computation.settings.degree),2);
    await client.send('Input.insertText',{text:'1'});await client.send('Input.insertText',{text:'2'});
    assert.equal(await read(()=>p.powerDegree.value),'12');assert.equal(await read(()=>p.computation.settings.degree),12);
    await read(()=>{p.powerDegree.value='0';p.powerDegree.dispatchEvent(new Event('input'));p.powerDegree.blur();native(p).getElementById('compute-plethysm').click();});
    assert.match(await read(()=>native(p).getElementById('plethysm-out').textContent),/Sym|∧/);assert.equal(await read(()=>p.computation.status),'current');
    const portable=await read(()=>panels.exportText('workspace'));await read(text=>panels.importText('workspace',text),portable);
    assert.deepEqual(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='plethysm').computation.settings),{mode:'exterior',degree:0});
    assert.match(await read(()=>{const p=[...panels.panels.values()].find(p=>p.definition.id==='plethysm');return p.propertyRenderer.editor.inspectorShadow.getElementById('plethysm-out').textContent;}),/∧/);
    assert.match(await read(()=>{const p=[...panels.panels.values()].find(p=>p.definition.id==='lr'&&p.computation.refs.nu);return p.propertyRenderer.editor.inspectorShadow.getElementById('schur-out').textContent;}),/Coefficient = 1/);
    const uncertified=JSON.parse(portable), lrSaved=uncertified.panels.find(p=>p.type==='lr'&&p.computation.refs.nu);
    const entry=(object,name)=>object.entries.find(([key])=>key===name)[1];
    const lrState=entry(lrSaved.renderers.find(r=>r.role==='property').snapshot.model,'state');
    entry(lrState,'workspaceLRCompleteness').entries.find(([key])=>key==='warning')[1]='Incomplete candidate enumeration.';
    await read(text=>panels.importText('workspace',text),JSON.stringify(uncertified));
    assert.match(await read(()=>{const p=[...panels.panels.values()].find(p=>p.definition.id==='lr'&&p.computation.refs.nu);return p.propertyRenderer.editor.inspectorShadow.getElementById('schur-out').textContent;}),/not certified/);
    await read(()=>{window.p=[...panels.panels.values()].find(p=>p.definition.id==='plethysm');const ref=p.computation.refs.lambda;api.updateObjectAsset({kind:'young',id:ref.split(':')[1]},{data:{rows:[2,1]}});});
    assert.equal(await read(()=>p.computation.settings.mode),'advanced');
    const legacy=JSON.parse(portable);delete legacy.panels.find(p=>p.type==='plethysm').computation.settings;
    await read(text=>panels.importText('workspace',text),JSON.stringify(legacy));
    assert.equal(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='plethysm').computation.settings.mode),'advanced');
    await client.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1'});await waitFor(()=>read(()=>!!document.querySelector('#workspace-design-lab')),20000);
    assert(await read(()=>!!document.querySelector('[data-design-experiment="principal-assets"]')));
    assert.equal(await read(()=>document.querySelector('[data-design-empty]').hidden),true);
    const shot=await client.send('Page.captureScreenshot',{format:'png'});const filename=path.join(os.tmpdir(),'math-workspace-polish.png');fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));console.log('SCREENSHOT '+filename);
    assert.deepEqual(errors,[]);console.log('workspace polish: shared icons, lab entry/backup isolation, creation filtering, LR targets, power modes/drafts/restoration passed');
  } finally {if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
