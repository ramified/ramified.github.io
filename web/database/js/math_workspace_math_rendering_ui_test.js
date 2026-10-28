'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    const base='http://127.0.0.1:'+server.address().port;
    session=await launchBrowser(base+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!window.MathJax?.typesetPromise),20000);
    const factoryIds=await read(()=>Object.keys(MathWorkspaceNativeEditors.factories));
    for(const id of factoryIds){
      const audit=await read(async id=>{
        const host=document.createElement('section'),inspector=document.createElement('section');for(const node of [host,inspector]){node.style.cssText='width:640px;height:700px;display:block';document.body.append(node);}
        const editor=MathWorkspaceNativeEditors.factories[id].mount(host,{id:'math-render-audit-'+id,inspectorHost:inspector});
        editor.setCanvasActive(true);editor.setInspectorActive(true);
        const formula='\\(\\dim\\mathfrak{p}\\quad\\mathbb{C}\\quad\\frac{a_1}{b^2}\\quad\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}\\)';
        const metrics=probe=>{
          const frak=[...probe.querySelectorAll('mjx-c')].find(node=>node.className.includes('TEX-FR')),rows=[...probe.querySelectorAll('mjx-mtr')].map(node=>node.getBoundingClientRect().top),spaces=[...probe.querySelectorAll('mjx-mspace')].map(node=>node.getBoundingClientRect().width);
          return {glyph:frak?getComputedStyle(frak,'::before').content:null,font:frak?getComputedStyle(frak,'::before').fontFamily:null,cell:probe.querySelector('mjx-mtd')?getComputedStyle(probe.querySelector('mjx-mtd')).display:null,rowsSeparated:rows.length===2&&rows[1]>rows[0]+5,spaces:spaces.some(width=>width>0)};
        };
        try{
          await editor.environment.window.MathJax.typesetPromise([editor.environment.document.body,editor.inspectorShadow.querySelector('.editor-body')]);
          const natural=()=>{const glyphs=[editor.shadow,editor.inspectorShadow].flatMap(root=>[...root.querySelectorAll('mjx-c')]).filter(node=>!node.closest('[data-rendering-audit-probe]')),cells=[editor.shadow,editor.inspectorShadow].flatMap(root=>[...root.querySelectorAll('mjx-mtd')]).filter(node=>!node.closest('[data-rendering-audit-probe]'));return {glyphs:glyphs.length,missing:glyphs.filter(node=>getComputedStyle(node,'::before').content==='none').length,cells:cells.length,brokenCells:cells.filter(node=>getComputedStyle(node).display!=='table-cell').length};};
          const naturalAfter=natural();
          const probes=[editor.shadow,editor.inspectorShadow].map(root=>{const probe=document.createElement('div');probe.dataset.renderingAuditProbe='';probe.textContent=formula;(root.querySelector('.editor-head')||root).append(probe);return probe;});
          await editor.environment.window.MathJax.typesetPromise(probes);
          const initial=probes.map(metrics);
          for(const root of [editor.shadow,editor.inspectorShadow])root.getElementById('MJX-CHTML-styles').remove();const withoutStyle=metrics(probes[0]),naturalWithoutStyles=natural();
          await editor.environment.window.MathJax.typesetPromise(probes);
          const restored=probes.map(metrics);
          const extra=document.createElement('div');extra.textContent='\\(\\mathfrak{Z}\\,\\mathcal{H}^{7}\\)';probes[0].after(extra);await editor.environment.window.MathJax.typesetPromise([extra]);
          const dynamicGlyph=[...extra.querySelectorAll('mjx-c')].filter(node=>node.className.includes('TEX-FR')).every(node=>!['none','normal','""'].includes(getComputedStyle(node,'::before').content));
          let detached=null;
          if(id==='matrix'){
            const target=document.createElement('section');target.style.cssText='width:640px;height:500px';document.body.append(target);
            editor.moveCardSurface(editor.listCards()[0].key,target);
            const probe=document.createElement('div');probe.textContent=formula;target.shadowRoot.append(probe);await editor.environment.window.MathJax.typesetPromise([probe]);detached=metrics(probe);
          }
          return {id,initial,withoutStyle,restored,dynamicGlyph,detached,naturalAfter,naturalWithoutStyles};
        }finally{editor.dispose();}
      },id);
      const valid=value=>value&&value.glyph&&!['none','normal','""'].includes(value.glyph)&&value.font.includes('MJXTEX-FR')&&value.cell==='table-cell'&&value.rowsSeparated&&value.spaces;
      assert(audit.initial.every(valid),id+' main/inspector render: '+JSON.stringify(audit));
      assert.equal(audit.withoutStyle.cell,'inline',id+' reproduces the missing-style matrix defect');
      assert.equal(audit.withoutStyle.glyph,'none',id+' reproduces missing Fraktur glyphs');
      assert(audit.restored.every(valid)&&audit.dynamicGlyph,id+' repairs missing styles and later glyphs');
      if(audit.detached)assert(valid(audit.detached),'detached matrix card receives formula styles');
      assert.equal(audit.naturalAfter.missing,0,id+' actual initial output has no missing glyph rules');assert.equal(audit.naturalAfter.brokenCells,0,id+' actual initial matrices use table layout');
      console.log('PASS CHTML '+id+': actual glyphs='+audit.naturalAfter.glyphs+', actual matrix cells='+audit.naturalAfter.cells+', missing without styles='+audit.naturalWithoutStyles.missing+'; main/inspector probes, dynamic glyphs'+(audit.detached?', detached card':''));
    }
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=asset=>asset.kind+':'+asset.id;
      window.g=api.createObjectAsset('lie',{data:{family:'A',rank:4}});window.d=api.createObjectAsset('dynkin',{data:{lie:key(g),vertices:[1,3]}});
      window.p=panels.open('dynkin-parabolic',key(d),'side');window.ar=panels.open('dynkin-starting',key(d),'main');window.vertex=panels.open('dynkin-vertex',key(d),'side');
      window.body=p.propertyRenderer.editor.inspectorShadow.querySelector('#dynkin-parabolic');window.mainAr=ar.propertyRenderer.editor.inspectorShadow;
      mainAr.querySelector('#dynkin-starting-ar-mode').click();
    });
    await waitFor(()=>read(()=>!!body.querySelector('mjx-mtd')&&!!mainAr.querySelector('[data-starting-vertex="1"]')),20000);
    assert.equal(await read(()=>mainAr.querySelector('[aria-label="Property vertex"]')),null);
    assert(await read(()=>api.localAssetSnapshot().assets.find(asset=>asset.id===d.id).data.quiver!==null),'AR mode adds directions without requiring another panel');
    const clickArVertex=async (transposed,index=1)=>{
      if(transposed)await read(()=>mainAr.querySelector('#dynkin-starting-transpose').click());
      const point=await read(async index=>{const node=mainAr.querySelector('[data-starting-vertex="'+index+'"]');node.scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);const rect=node.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};},index);
      await mouse(client,'mousePressed',point.x,point.y,1);await mouse(client,'mouseReleased',point.x,point.y,0);
    };
    const arSelection=()=>read(()=>({vertices:api.localAssetSnapshot().assets.find(asset=>asset.id===d.id).data.vertices,header:[...mainAr.querySelectorAll('.starting-vertex-label.is-selected')].map(node=>Number(node.dataset.startingVertex)+1),hidden:mainAr.querySelectorAll('.is-hidden-coordinate').length,parabolic:p.propertyRenderer.editor.readObjectResult().vertices}));
    await read(()=>mainAr.querySelector('#dynkin-ar-hide-unselected').click());
    const baseline=await arSelection();
    await clickArVertex(false);assert.equal(await read(()=>vertex.propertyRenderer.editor.readObjectResult().vertex),2,'AR follows the clicked vertex');
    assert.deepEqual((await arSelection()).vertices,[1,2,3],'AR multi-selection marks an unmarked vertex');
    assert.deepEqual((await arSelection()).header,[1,2,3],'AR header highlights follow the shared markings');
    assert.deepEqual((await arSelection()).parabolic,[1,2,3],'AR selection refreshes Parabolic');
    assert((await arSelection()).hidden<baseline.hidden,'AR selection updates hidden coordinates');
    const edge=await read(async()=>{const grid=mainAr.querySelector('.starting-vertex-grid');grid.scrollIntoView({block:'center'});await document.fonts.ready;await new Promise(resolve=>setTimeout(resolve,100));await new Promise(requestAnimationFrame);const a=grid.querySelector('[data-starting-vertex="0"]').getBoundingClientRect(),b=grid.querySelector('[data-starting-vertex="1"]').getBoundingClientRect();return {x:(a.left+a.right+b.left+b.right)/4,y:(a.top+a.bottom+b.top+b.bottom)/4};});
    const beforeDirection=await read(()=>api.localAssetSnapshot().assets.find(asset=>asset.id===d.id).data.quiver);
    const hitInfo=await read(point=>{window.arEdgeEvents=[];mainAr.addEventListener('click',event=>arEdgeEvents.push({tag:event.target.tagName,cls:event.target.getAttribute('class'),x:event.clientX,y:event.clientY}),true);const node=mainAr.elementFromPoint(point.x,point.y),grid=mainAr.querySelector('.starting-vertex-grid'),rect=grid.getBoundingClientRect();return {tag:node?.tagName,cls:node?.getAttribute('class'),grid:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,columns:grid.dataset.startingColumns}};},edge);
    await mouse(client,'mousePressed',edge.x,edge.y,1);await mouse(client,'mouseReleased',edge.x,edge.y,0);
    const afterDirection=await read(()=>api.localAssetSnapshot().assets.find(asset=>asset.id===d.id).data.quiver);
    assert.equal(Object.keys(beforeDirection).filter(key=>afterDirection[key]===-beforeDirection[key]).length,1,'AR header edges edit one shared quiver direction: '+JSON.stringify({beforeDirection,afterDirection,edge,hitInfo,events:await read(()=>arEdgeEvents)}));
    await clickArVertex(true);assert.equal(await read(()=>ar.propertyRenderer.editor.captureAssetProperties().vertex),2,'transposed AR headers remain interactive');
    assert.deepEqual((await arSelection()).vertices,[1,3],'repeating the click removes the mark in the transposed layout');
    assert.equal((await arSelection()).hidden,baseline.hidden,'unmarking restores the coordinate filter');
    assert.equal(await read(()=>vertex.propertyRenderer.editor.readObjectResult().vertex),2,'Vertex Data follows the last click even after unmarking');
    const workspace=await read(()=>{
      const matrix=body.querySelector('.parabolic-matrix-wrap'),rows=[...matrix.querySelectorAll('mjx-mtr')];
      return {tex:[...MathJax.startup.document.getMathItemsWithin(body)].map(item=>item.math).sort(),rowCount:rows.length,rowGaps:rows.slice(1).map((row,index)=>row.getBoundingClientRect().top-rows[index].getBoundingClientRect().top),cellPadding:[...matrix.querySelectorAll('mjx-mtd')].slice(0,5).map(node=>getComputedStyle(node).padding),rowsSeparated:rows.every((row,index)=>!index||row.getBoundingClientRect().top>rows[index-1].getBoundingClientRect().top),cell:getComputedStyle(matrix.querySelector('mjx-mtd')).display,frak:[...body.querySelectorAll('mjx-c')].filter(node=>node.className.includes('TEX-FR')).every(node=>getComputedStyle(node,'::before').content!=='none')};
    });
    assert(workspace.rowsSeparated&&workspace.frak&&workspace.cell==='table-cell');
    await read(()=>{window.display=panels.open('dynkin-view',key(d),'side');display.propertyRenderer.editor.shadow.querySelector('#dynkin-multi-select').click();});
    assert.equal(await read(()=>ar.propertyRenderer.editor.captureAssetProperties().multiSelect),false,'AR shares the display single-selection mode');
    await clickArVertex(false);
    assert.deepEqual((await arSelection()).vertices,[2],'single-selection replaces the object markings');
    assert.deepEqual((await arSelection()).header,[2]);
    assert.deepEqual((await arSelection()).parabolic,[2]);
    await clickArVertex(false);assert.deepEqual((await arSelection()).vertices,[2],'single-selection never removes its only vertex');
    const restoreSelection=legacyArMode=>read(legacyArMode=>{
      if(legacyArMode)ar.propertyRenderer.editor.objectIO('selection-mode',true);
      const ids={p:p.id,ar:ar.id,vertex:vertex.id,display:display.id},saved=panels.exportText('workspace');panels.importText('workspace',saved);
      for(const [name,id] of Object.entries(ids))window[name]=panels.panels.get(id);
      window.mainAr=ar.propertyRenderer.editor.inspectorShadow;window.body=p.propertyRenderer.editor.inspectorShadow.querySelector('#dynkin-parabolic');
    },legacyArMode);
    await restoreSelection(true);
    assert.equal(await read(()=>ar.propertyRenderer.editor.captureAssetProperties().multiSelect),false,'restoring a historical AR multi-select snapshot respects the main display single-selection mode');
    await clickArVertex(false,2);assert.deepEqual((await arSelection()).vertices,[3],'restored AR still replaces markings in single-selection');
    await read(()=>display.propertyRenderer.editor.shadow.querySelector('#dynkin-multi-select').click());
    assert.equal(await read(()=>ar.propertyRenderer.editor.captureAssetProperties().multiSelect),true,'AR also receives multi-selection changes without changing object data');
    await clickArVertex(false,2);assert.deepEqual((await arSelection()).vertices,[3],'multi-selection retains its last marked vertex');
    await restoreSelection();
    assert.equal(await read(()=>ar.propertyRenderer.editor.captureAssetProperties().multiSelect),true,'multi-selection with just one mark survives workspace restore');
    await clickArVertex(false);assert.deepEqual((await arSelection()).vertices,[2,3],'restored multi-selection adds to its existing mark');
    assert.deepEqual(await read(()=>display.propertyRenderer.editor.collectAssets().data.vertices),[2,3],'main display receives AR markings');
    const actualPanels=await read(async()=>{
      const y=api.createObjectAsset('young',{data:{rows:[3,1]}}),m=api.createObjectAsset('matrix',{data:{rows:2,cols:2,entries:[['1','2'],['0','1']],dataType:'rational'}}),v=api.createObjectAsset('variety'),s=api.createObjectAsset('sheaf',{data:{base:key(v),rank:'2'}}),c=api.createObjectAsset('complex'),e=api.createObjectAsset('field-extension',{data:{polynomial:'x^2-3'}}),space=api.createObjectAsset('mosaic-space');
      const specs=[['statistics',key(y)],['weight','',{refs:{lambda:key(y),lie:key(g)}}],['pair-statistics','',{refs:{lambda:key(y),mu:key(y),lie:key(g)}}],['matrix-invariants',key(m)],['matrix-computation',key(m)],['sheaf-view',key(s)],['complex-operations',key(c)],['field-extension-invariants',key(e)],['mosaic-statistics',key(space)]];
      const output=[];
      for(const [type,key,options] of specs){
        const panel=panels.open(type,key,'side',options),editor=panel.propertyRenderer;if(!editor)throw new Error('Missing actual property renderer: '+type+' ('+panel.message.textContent+')');
        const native=editor.editor;
        if(type==='matrix-computation'){const root=native.inspectorShadow;root.querySelector('#operation-select').value='inverse';root.querySelector('#compute-operation').click();}
        if(type==='weight')native.environment.document.querySelector('[aria-label="Borel-Weil-Bott controls"] [data-shortcut-primary]').click();
        await native.environment.window.MathJax.typesetPromise([native.environment.document.body,native.inspectorShadow.querySelector('.editor-body')]);
        const roots=[native.shadow,native.inspectorShadow],glyphs=roots.flatMap(root=>[...root.querySelectorAll('mjx-c')]),cells=roots.flatMap(root=>[...root.querySelectorAll('mjx-mtd')]);
        const result={type,glyphs:glyphs.length,missing:glyphs.filter(node=>getComputedStyle(node,'::before').content==='none').length,cells:cells.length,broken:cells.filter(node=>getComputedStyle(node).display!=='table-cell').length};
        if(type==='weight'&&glyphs.length===0)throw new Error('Borel-Weil-Bott formula did not render');
        output.push(result);
      }
      return output;
    });
    for(const item of actualPanels){assert.equal(item.missing,0,item.type+' missing mathematical glyphs');assert.equal(item.broken,0,item.type+' broken matrix cells');console.log('PASS actual property '+item.type+': glyphs='+item.glyphs+', matrix cells='+item.cells);}
    await read(()=>{panels.move(p,'main');p.node.scrollIntoView({block:'start'});});
    const screenshot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-parabolic-math-fixed.png'),Buffer.from(screenshot.data,'base64'));
    await client.send('Page.navigate',{url:base+'/dynkin_diagram_calculator.html'});await waitFor(()=>read(()=>!!window.SiteImportExportPageAdapter&&!!window.MathJax?.typesetPromise),20000);
    await read(()=>{const a=SiteImportExportPageAdapter;a.applyImport('',a.validateImport('',{text:JSON.stringify({calculator:'Dynkin diagram calculator',typeKey:'A',rank:4,selectedVertices:[1,3],multiSelect:true})}));document.getElementById('dynkin-parabolic').closest('.card').classList.remove('collapsed');});
    await waitFor(()=>read(()=>!!document.querySelector('#dynkin-parabolic mjx-mtd')),20000);
    assert.deepEqual(await read(()=>[...MathJax.startup.document.getMathItemsWithin(document.getElementById('dynkin-parabolic'))].map(item=>item.math).sort()),workspace.tex,'workspace retains exactly the original Parabolic formulas');
    assert.equal(await read(()=>document.querySelectorAll('#dynkin-parabolic .parabolic-matrix-wrap mjx-mtr').length),workspace.rowCount);
    const originalLayout=await read(()=>{const root=document.querySelector('#dynkin-parabolic .parabolic-matrix-wrap'),rows=[...root.querySelectorAll('mjx-mtr')];return {rowGaps:rows.slice(1).map((row,index)=>row.getBoundingClientRect().top-rows[index].getBoundingClientRect().top),cellPadding:[...root.querySelectorAll('mjx-mtd')].slice(0,5).map(node=>getComputedStyle(node).padding)};});
    assert.deepEqual(originalLayout.cellPadding,workspace.cellPadding,'matrix column padding matches the original calculator');
    assert(originalLayout.rowGaps.every((gap,index)=>Math.abs(gap-workspace.rowGaps[index])<1),'matrix row spacing matches the original calculator');
    await client.send('Page.navigate',{url:base+'/archive/math_workspace_version1/math_workspace.html'});await waitFor(()=>read(()=>!!window.MathWorkspaceNativeEditors&&!!window.MathJax?.typesetPromise),20000);
    const svgOutput=await read(async()=>{
      const host=document.createElement('section'),inspector=document.createElement('section');host.style.cssText=inspector.style.cssText='width:640px;height:600px';document.body.append(host,inspector);const editor=MathWorkspaceNativeEditors.factories.matrix.mount(host,{id:'svg-regression',inspectorHost:inspector});editor.setInspectorActive(true);
      try{const probe=document.createElement('div');probe.textContent='\\(\\mathfrak{p}\\quad\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}\\)';editor.inspectorShadow.querySelector('.editor-head').append(probe);await editor.environment.window.MathJax.typesetPromise([probe]);const svg=probe.querySelector('mjx-container[jax="SVG"] svg');return {style:!!editor.inspectorShadow.getElementById('MJX-SVG-styles'),width:svg?.getBoundingClientRect().width,paths:svg?.querySelectorAll('path').length};}finally{editor.dispose();}
    });
    assert(svgOutput.style&&svgOutput.width>20&&svgOutput.paths>0,'local SVG MathJax output remains supported');
    assert.deepEqual(errors,[]);
    console.log('PASS 12 native engines, both shadow surfaces, detached card, dynamic glyphs, Parabolic/original parity, shared AR single/multi selection, coordinate filters and transposed toggles');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
