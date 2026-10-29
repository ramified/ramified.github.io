'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.space=api.createObjectAsset('mosaic-space');
      window.first=api.createObjectAsset('mosaic-diagram',{data:{space:key(space)}});
      window.second=api.createObjectAsset('mosaic-diagram',{data:{space:key(space)}});
      window.get=a=>api.localAssetSnapshot().assets.find(b=>key(b)===key(a));
      window.diagram=panels.open('mosaic-diagram-input',key(first),'main');
      window.editor=p=>p.activeRenderer?.editor||p.propertyRenderer.editor;
      window.doc=p=>editor(p).environment.document;
      window.native=p=>editor(p).environment.window.MosaicCalculator.__test;
      window.change=(p,id,value)=>{const node=doc(p).getElementById(id);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));};
      window.originalSpace=JSON.stringify(get(space).data);window.originalSecond=JSON.stringify(get(second).data);
    });
    assert.deepEqual(await read(()=>[...doc(diagram).getElementById('input-mode').options].map(option=>option.value)),['draw','tiling','background','decoration','pick']);
    assert.deepEqual(await read(()=>[...doc(diagram).getElementById('background-action').options].map(option=>option.value)),['decoration']);
    await read(()=>change(diagram,'input-mode','background'));
    assert.equal(await read(()=>native(diagram).state.backgroundAction),'decoration');
    await read(()=>change(diagram,'background-decoration-kind','chess-white-king-vector-c'));
    // Use the rendered canvas's hit testing to click the center of a real tile.
    const clickTile=async(panel,index)=>{
      const point=await read((name,index)=>{const p=window[name],t=native(p),canvas=doc(p).getElementById('mosaic-canvas');canvas.scrollIntoView({block:'center'});const r=canvas.getBoundingClientRect(),hits=[];for(let y=Math.max(0,r.top)+4;y<Math.min(innerHeight,r.bottom);y+=6)for(let x=Math.max(0,r.left)+4;x<Math.min(innerWidth,r.right);x+=6)if(t.hitTest(x,y,{includeRemoved:true})===index)hits.push({x,y});if(!hits.length)throw new Error('No visible target tile '+index);return hits[Math.floor(hits.length/2)];},panel,index);
      await client.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
      await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
    };
    await clickTile('diagram',12);
    await waitFor(()=>read(()=>get(first).data.pieces.length===1));
    assert.equal(await read(()=>JSON.stringify(get(space).data)),await read(()=>originalSpace));
    assert.equal(await read(()=>JSON.stringify(get(second).data)),await read(()=>originalSecond));
    await read(()=>change(diagram,'grid-rows','7'));
    assert.equal(await read(()=>native(diagram).state.rows),5,'disabled background controls cannot alter a diagram editor');
    await read(()=>{
      window.stats=panels.open('mosaic-statistics',key(first),'side');
      window.diagramStats=panels.open('mosaic-diagram-statistics',key(first),'side');
      window.statsSignature=stats.computation.signature;
      window.savedFirst=JSON.stringify(get(first).data);
      window.background=panels.open('mosaic-space-input',key(space),'main');
    });
    assert.equal(await read(()=>stats.computation.refs.asset),await read(()=>key(space)),'legacy diagram-bound background properties resolve to Space');
    assert.deepEqual(await read(()=>[...doc(background).getElementById('background-action').options].map(option=>option.value)),['tile','boundary','glue-boundary','reverse-glue']);
    assert.equal(await read(()=>!!doc(background).getElementById('background-metric-toggle')),false,'metric selector is absent from Space modification');
    await read(()=>{window.metricPanel=panels.open('mosaic-metric',key(first),'side');window.poincarePanel=panels.open('mosaic-poincare',key(first),'side');});
    assert.equal(await read(()=>metricPanel.computation.refs.asset),await read(()=>key(space)),'hyperbolic metric binds to shared Space');
    assert.equal(await read(()=>doc(metricPanel).getElementById('background-metric-toggle').isConnected),true);
    await read(()=>change(metricPanel,'background-metric-toggle','complete-interior'));
    await waitFor(()=>read(()=>get(space).data.backgroundMetric==='complete-interior'));
    assert.equal(await read(()=>get(first).data.backgroundMetric),undefined,'Diagram record does not absorb the shared geometry');
    assert.equal(await read(()=>native(poincarePanel).state.backgroundMetric),'complete-interior','Poincaré reads the shared Space metric');
    await read(()=>change(poincarePanel,'poincare-model','flat'));
    await waitFor(()=>read(()=>get(space).data.backgroundMetric==='flat'));
    assert.equal(await read(()=>native(metricPanel).state.backgroundMetric),'flat','Hyperbolic Metric reads Poincaré changes');
    await read(()=>{window.wanderPanel=panels.open('mosaic-wander',key(space),'side');change(wanderPanel,'wander-view-mode','complete-interior');});
    assert.equal(await read(()=>native(wanderPanel).getWanderViewMode()),'complete-interior');
    assert.equal(await read(()=>get(space).data.backgroundMetric),'flat','Universal Cover mode remains local to its panel');
    await read(()=>api.updateObjectAsset(space,{data:{...get(space).data,rows:6}}));
    assert.equal(await read(()=>native(wanderPanel).state.backgroundMetric),'complete-interior','Universal Cover keeps its local view mode after a Space refresh');
    assert.equal(await read(()=>get(space).data.backgroundMetric),'flat');
    await read(()=>api.updateObjectAsset(space,{data:{...get(space).data,rows:5}}));
    assert(await read(()=>doc(background).getElementById('diagram-type-row').hidden));
    assert.equal(await read(()=>native(background).state.inputMode),'background');
    await clickTile('background',12);
    await waitFor(()=>read(()=>get(space).data.removedTiles.length===1));
    assert(await read(()=>diagram.inputIssues.length>0),'occupied removed tiles suspend the piece-only diagram');
    assert.equal(await read(()=>JSON.stringify(get(first).data)),await read(()=>savedFirst));
    assert.equal(await read(()=>JSON.stringify(get(second).data)),await read(()=>originalSecond));
    assert.equal(await read(()=>diagramStats.computation.status),'invalid');
    assert.equal(await read(()=>stats.computation.status),'current','background properties remain usable when decorations are incompatible');
    await clickTile('background',12);
    await waitFor(()=>read(()=>get(space).data.removedTiles.length===0));
    assert.equal(await read(()=>diagram.inputIssues.length),0);
    assert.equal(await read(()=>get(first).data.pieces.length),1,'recovering the tile restores the piece');
    const edgePoints=await read(()=>{
      const canvas=doc(background).getElementById('mosaic-canvas');canvas.scrollIntoView({block:'center'});
      const g=native(background).billiardsEditorGeometry(),r=canvas.getBoundingClientRect(),a=g.cells[12];
      const b=g.cells.filter(cell=>cell!==a).sort((b,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(a.x-c.x,a.y-c.y))[0];
      return [0.45,0.5,0.55].map(t=>({x:r.left+(a.x+(b.x-a.x)*t)*r.width/g.width,y:r.top+(a.y+(b.y-a.y)*t)*r.height/g.height}));
    });
    const click=async point=>{await client.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});};
    await read(()=>change(background,'background-action','boundary'));
    await click(edgePoints[1]);await waitFor(()=>read(()=>get(space).data.cutEdges.length===1));
    await click(edgePoints[1]);await waitFor(()=>read(()=>get(space).data.cutEdges.length===0));
    await click(edgePoints[1]);await waitFor(()=>read(()=>get(space).data.cutEdges.length===1));
    await read(()=>{change(background,'background-action','glue-boundary');const multi=doc(background).getElementById('background-multi-edges');if(multi.checked)multi.click();});
    await click(edgePoints[0]);await click(edgePoints[2]);
    await waitFor(()=>read(()=>get(space).data.gluedEdges.length===1));
    assert.equal(await read(()=>JSON.stringify(get(first).data)),await read(()=>savedFirst),'cutting and gluing shared boundaries preserves decoration records');
    assert.equal(await read(()=>JSON.stringify(get(second).data)),await read(()=>originalSecond));
    await read(()=>{window.statsSignature=stats.computation.signature;api.updateObjectAsset(first,{data:{...get(first).data,pieces:[]}});});
    assert.equal(await read(()=>stats.computation.signature),await read(()=>statsSignature),'decoration changes do not invalidate background computations');
    const extra=await read(()=>MathWorkspaceMosaic.propertyPanels.filter(p=>p.label.includes('experimental')).map(def=>{
      const p=panels.open(def.id,key(space),'side');const result={id:def.id,mounted:!!p.propertyRenderer,status:p.computation.status,source:p.computation.refs.asset};panels.move(p,'hidden');return result;
    }));
    const spaceKey=await read(()=>key(space));
    assert(extra.every(p=>p.mounted&&p.status==='current'&&p.source===spaceKey),'experimental panels bind directly to Space: '+JSON.stringify(extra));
    await read(()=>{
      const backup=JSON.parse(panels.exportText('workspace'));
      backup.panels.find(panel=>panel.type==='mosaic-statistics').computation.refs.asset=key(first);
      window.beforeRestore=JSON.stringify(api.localAssetSnapshot().assets.map(asset=>[key(asset),asset.data]));
      panels.importText('workspace',JSON.stringify(backup));
    });
    assert.equal(await read(()=>[...panels.panels.values()].find(panel=>panel.definition.id==='mosaic-statistics').computation.refs.asset),spaceKey,'legacy background bindings migrate on restore');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets.map(asset=>[key(asset),asset.data]))),await read(()=>beforeRestore),'legacy panel migration preserves source records');
    assert.deepEqual(errors,[]);
    console.log('PASS Mosaic ownership: actual pieces, shared tile/boundary/glue edits, geometry property, isolated writes, property dependencies, experimental panels and legacy backup migration');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
