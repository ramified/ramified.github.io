'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.matrix=api.createObjectAsset('matrix',{data:{rows:2,cols:2,dataType:'real',entries:[['1','2'],['0','3']]}});
      window.input=panels.open('matrix-input',key(matrix),'main');
      window.view=panels.open('matrix-view',key(matrix),'side');
    });
    assert.equal(await read(()=>view.computation.refs.matrix),await read(()=>key(matrix)));
    assert.equal(await read(()=>getComputedStyle(view.propertyRenderer.host).display),'none','Matrix Display uses a result surface instead of an embedded editor');
    assert.equal(await read(()=>[...view.propertyRenderer.editor.inspectorShadow.querySelectorAll('input,select,textarea')].filter(control=>control.getClientRects().length).length),4,'Open exposes the working cell grid without setup controls');
    assert.deepEqual(await read(()=>[...view.propertyRenderer.editor.inspectorShadow.querySelectorAll('#matrix-grid .matrix-cell')].map(cell=>cell.value)),['1','2','0','3'],'Matrix Display reuses the original cell-grid UI');
    assert.equal(await read(()=>input.node.querySelectorAll('[data-object-reference="field"]').length),1,'Modify has one Field row');
    assert.deepEqual(await read(()=>[...input.controls.children].filter(row=>!row.hidden).map(row=>row.querySelector('.input-label')?.textContent)),['Name','Construction','Field'],'construction precedes its dependent Field row');
    assert(await read(()=>{const row=input.controls.querySelector('[data-object-reference="field"]').closest('label');return Math.abs(row.querySelector('span').getBoundingClientRect().top-row.querySelector('select').getBoundingClientRect().top)<12;}),'Field label and choice occupy a single row');
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.editor.shadow.querySelector('.matrix-toolbar-group')).display),'none','field details belong to the Field editor');
    assert.equal(await read(()=>[...input.activeRenderer.editor.shadow.querySelectorAll('.calculator-input-settings-trigger')].some(node=>node.getClientRects().length>0)),false,'Modify has no settings button');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===matrix.id).data.field.startsWith('field:')),true,'legacy coefficient settings become a real Field asset');
    await read(()=>{
      const item=document.querySelector('[data-asset-key="'+key(matrix)+'"]');item.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:100}));
    });
    assert.deepEqual(await read(()=>[...document.querySelector('#workspace-assets-context-menu').children].map(node=>node.querySelector('button')?.textContent||node.textContent).map(text=>text.trim()).map(text=>text.replace(/\s*[›▸▶]$/,''))),['Open','Modify','Properties','Rename','Delete']);
    assert.equal(await read(()=>[...document.querySelectorAll('#workspace-assets-context-menu button')].some(button=>button.textContent.trim()==='Input')),false,'Input is not a property');
    await read(()=>{[...document.querySelectorAll('#workspace-assets-context-menu>button')].find(button=>button.textContent==='Open').click();window.opened=[...panels.panels.values()].at(-1);});
    assert.equal(await read(()=>opened.definition.id),'matrix-view','Open uses the working display');
    await read(()=>panels.move(opened,'hidden'));
    assert.equal(await read(()=>input.node.querySelector('.workspace-input-guidance,[data-open-related-panel],[data-edit-linked-matrix]')),null,'Input panels do not add property-navigation buttons');
    assert.equal(await read(()=>MathWorkspacePanelRegistry.suggest([key(matrix)],api.localAssetSnapshot().assets).some(p=>p.id==='matrix-view')),true,'Matrix Display is discoverable through asset properties');
    assert.match(await read(()=>view.propertyRenderer.editor.readObjectResult().text),/1.*2/s);
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.editor.shadow.querySelector('#matrix-summary')).display),'none');
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.editor.shadow.querySelector('.panel-title-text')).display),'none','the inner Matrix Canvas heading is removed');
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.editor.shadow.querySelector('.matrix-editor')).display),'none','Modify contains setup controls without repeating the cell grid');
    assert.equal(await read(()=>input.node.querySelector('[data-object-reference="asset"]').closest('.workspace-object-reference').hidden),true,'Modify does not repeat the selected Matrix row');
    assert(await read(()=>input.activeRenderer.host.getBoundingClientRect().height<300),'a small matrix editor must not reserve a canvas-sized blank area');
    await read(()=>input.activeRenderer.editor.inspectorShadow.querySelector('[data-preset="zero"]').click());
    assert.deepEqual(await read(()=>[...view.propertyRenderer.editor.inspectorShadow.querySelectorAll('.matrix-cell')].map(cell=>cell.value)),['0','0','0','0'],'Modify presets update the separate working display');
    await read(()=>{api.updateObjectAsset({kind:'matrix',id:matrix.id},{data:{...api.localAssetSnapshot().assets.find(a=>a.id===matrix.id).data,entries:[['1','2'],['0','3']]}});input.node.querySelector('[aria-label="Edit Field"]').click();window.fieldInput=[...panels.panels.values()].find(p=>p.definition.id==='field-input');window.fieldAsset=api.localAssetSnapshot().assets.find(a=>key(a)===fieldInput.assetKey);window.shared=api.createObjectAsset('matrix',{data:{rows:2,cols:2,entries:[['1','0'],['0','1']],field:key(fieldAsset)}});window.sharedView=panels.open('matrix-view',key(shared),'side');fieldInput.coefficientType.value='finite-field';fieldInput.coefficientType.dispatchEvent(new Event('change'));});
    const keyEvent=async(key,code,modifiers=0)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code,modifiers,windowsVirtualKeyCode:key==='a'?65:key==='Backspace'?8:0});};
    await read(()=>{window.prime=fieldInput.fieldControls.finiteFieldPrime;prime.scrollIntoView({block:'center'});prime.focus();});
    await keyEvent('a','KeyA',2);await keyEvent('Backspace','Backspace');
    assert.equal(await read(()=>prime.value),'');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===fieldAsset.id).data.finiteFieldPrime),7);
    await client.send('Input.insertText',{text:'1'});
    assert.equal(await read(()=>prime.value),'1');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===fieldAsset.id).data.finiteFieldPrime),7,'an unfinished prime preserves the last valid field');
    await client.send('Input.insertText',{text:'3'});
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===fieldAsset.id).data.finiteFieldPrime),13);
    for(const variable of ['view','sharedView'])assert.match(await evaluate(client,variable+'.propertyRenderer.editor.readObjectResult().text'),/GF\(13\)/,'shared Field changes update every display');
    assert.match(await read(()=>panels.exportText(key(shared),'sage')),/GF\(13\)/,'CAS exports resolve the current Field asset');
    await read(()=>{prime.blur();window.imported=api.createObjectAsset('matrix');panels.importText(key(imported),panels.exportText(key(shared)));});
    assert.equal(await read(()=>{const asset=api.localAssetSnapshot().assets.find(a=>a.id===imported.id);return MathWorkspaceSlicing.materialize(asset,api.localAssetSnapshot().assets).data.finiteFieldPrime;}),13,'single-object export carries the linked field');
    await read(()=>{
      window.lattice=api.createObjectAsset('lattice',{data:{ambientDimension:3,basisRows:[[2,1,0],[0,3,0],[0,0,4]]}});
      window.li=panels.open('lattice-input',key(lattice),'side');
    });
    assert.equal(await read(()=>li.activeRenderer.editor.inspectorShadow.querySelectorAll('[data-object-matrix-row]').length),0,'Lattice Input does not construct an inline matrix editor');
    assert.equal(await read(()=>getComputedStyle(li.activeRenderer.inspectorHost).display),'none');
    const basis=await read(()=>lattice.data.basisRows);
    await read(()=>{li.node.querySelector('[aria-label="Edit Basis matrix"]').click();window.linked=api.localAssetSnapshot().assets.find(a=>key(a)===api.localAssetSnapshot().assets.find(a=>a.id===lattice.id).data.matrix);window.basisInput=[...panels.panels.values()].find(p=>p.definition.id==='matrix-input'&&p.assetKey===key(linked));});
    assert.deepEqual(await read(()=>linked.data.entries.map(row=>row.map(Number))),basis,'opening the linked editor preserves the full basis and its orientation');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===lattice.id).data.basisMode),'matrix-object');
    await read(()=>{li.node.querySelector('[aria-label="Edit Basis matrix"]').click();});
    assert.equal(await read(()=>[...panels.panels.values()].filter(p=>p.definition.id==='matrix-input'&&p.assetKey===key(linked)).length),1);
    await read(()=>{window.basisView=panels.open('matrix-view',key(linked),'main');window.cell=basisView.propertyRenderer.editor.inspectorShadow.querySelector('.matrix-cell');cell.scrollIntoView({block:'center'});cell.focus();});
    await keyEvent('a','KeyA',2);await keyEvent('Backspace','Backspace');
    assert.equal(await read(()=>cell.value),'');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===linked.id).data.entries[0][0]),'2');
    for(const text of ['2','.','5'])await client.send('Input.insertText',{text});
    assert.equal(await read(()=>cell.value),'2.5');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===linked.id).data.entries[0][0]),'2.5');
    assert.equal(await read(()=>li.activeRenderer.editor.objectIO('geometry').picks.length>0),true,'the linked matrix still feeds native lattice geometry');
    await read(()=>{cell.blur();api.updateObjectAsset({kind:'matrix',id:matrix.id},{name:'RenamedMatrix',data:{...matrix.data,entries:[['7','2'],['0','3']]}});});
    assert.match(await read(()=>view.propertyRenderer.editor.readObjectResult().text.normalize('NFKD').replace(/\s/g,'')),/RenamedMatrix/);
    assert.match(await read(()=>panels.exportText('property:'+view.computation.id,'rows')),/7/);
    await read(()=>{window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:3}});api.updateObjectAsset({kind:'matrix',id:matrix.id},{data:{...matrix.data,construction:{lie:key(lie),basis:'simple-roots'}}});});
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.host).display),'none','a derived matrix input does not contain a disabled matrix preview');
    assert.equal(await read(()=>getComputedStyle(input.activeRenderer.inspectorHost).display),'none');
    assert.deepEqual(await read(()=>[...input.controls.children].filter(row=>!row.hidden).map(row=>row.querySelector('.input-label')?.textContent)),['Name','Construction','Lie type'],'Lie constructions replace the Field row with the Lie type row');
    assert.equal(await read(()=>view.computation.status),'current');
    const rows=await read(()=>view.propertyRenderer.editor.objectIO('export','rows'));
    await read(()=>{const backup=panels.exportText('workspace');panels.importText('workspace',backup);});
    assert.equal(await read(()=>panels.panels.get(view.id).propertyRenderer.editor.objectIO('export','rows')),rows,'the separate display survives a full workspace restore');
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===lattice.id).data.matrix),await read(()=>key(linked)),'restoration preserves the linked basis matrix');
    await read(()=>{input=panels.panels.get(input.id);});
    await read(()=>{panels.move(input,'main');api.selectCanvasTab(input.id);input.node.scrollIntoView({block:'start'});});
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-focused-inputs.png'),Buffer.from(shot.data,'base64'));
    await read(()=>{const display=panels.panels.get(view.id);panels.move(display,'main');api.selectCanvasTab(display.id);display.node.scrollIntoView({block:'start'});});
    assert(await read(()=>{const display=panels.panels.get(view.id);return display.propertyRenderer.inspectorHost.getBoundingClientRect().top-display.references.getBoundingClientRect().bottom<70;}),'the matrix display does not stretch empty form rows into blank subpanels');
    const displayShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-matrix-display.png'),Buffer.from(displayShot.data,'base64'));
    const layouts=await read(()=>{
      const asset=api.createObjectAsset('matrix',{data:{rows:2,cols:2,dataType:'real'}}),panel=panels.open('matrix-view',key(asset),'main'),results=[];
      for(const width of [240,320,600])for(const cols of [2,4,6,8]){
        panel.node.style.width=width+'px';api.updateObjectAsset({kind:'matrix',id:asset.id},{data:{rows:2,cols,dataType:'real',entries:Array.from({length:2},()=>Array.from({length:cols},(_,i)=>String(i+1)))}});
        const root=panel.propertyRenderer.editor.inspectorShadow,cells=[...root.querySelectorAll('.matrix-cell')],rects=cells.map(cell=>cell.getBoundingClientRect()),surface=root.querySelector('.matrix-editor');
        results.push({width,cols,minWidth:Math.min(...rects.map(rect=>rect.width)),overlap:rects.slice(0,cols-1).some((rect,index)=>rect.right>rects[index+1].left-3),scrolls:surface.scrollWidth>surface.clientWidth+1});
      }
      window.narrowDisplay=panel;panel.node.style.width='320px';panel.node.scrollIntoView({block:'start'});return results;
    });
    for(const layout of layouts){assert.equal(layout.overlap,false,JSON.stringify(layout));assert(layout.minWidth>=41,JSON.stringify(layout));if(layout.width===240&&layout.cols===8)assert.equal(layout.scrolls,true,'large matrices scroll before cells become too narrow');}
    const narrowShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-matrix-narrow.png'),Buffer.from(narrowShot.data,'base64'));
    console.log('math_workspace_input_panels_ui_test: flat inputs, independent displays, linked matrix preservation, panel reuse, drafts and derived matrices passed');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
