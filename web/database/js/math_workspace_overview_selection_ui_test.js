'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');

async function run() {
  const server=await startServer();let session;
  try {
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');
    client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;});
    const click=async point=>{await mouse(client,'mouseMoved',point.x,point.y,0);await mouse(client,'mousePressed',point.x,point.y,1);await mouse(client,'mouseReleased',point.x,point.y,0);};
    const blank=()=>read(()=>{const r=view.propertyRenderer.editor.shadow.querySelector('.sheaf-stage').getBoundingClientRect();return {x:r.right-20,y:r.top+20};});
    const assertDeselected=async()=>{
      assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('selection')),null);
      assert.equal(await read(()=>view.propertyRenderer.editor.shadow.querySelectorAll('.sheaf-canvas-label.is-active,.is-map-domain,.is-map-codomain,[data-map-control]').length),0,'no highlights or curve controls remain');
      assert.equal(await read(()=>view.propertyRenderer.editor.captureCanvasAppearance().targetKey),'');
      assert.equal(await read(()=>view.computation.refs.active),'','explicit deselection is saved on the panel');
    };
    for (const type of ['category-diagram','sheaf-view']) {
      await read(type=>{
        const category=type==='category-diagram',kind=category?'category':'variety';
        const a=api.createObjectAsset(kind,{name:category?'C':'X'}),b=api.createObjectAsset(kind,{name:category?'D':'Y'});
        window.arrow=api.createObjectAsset(category?'functor':'map',{name:category?'F':'f',data:{domain:key(a),codomain:key(b)}});
        window.view=panels.open(type,key(arrow),'main');
        const editor=view.propertyRenderer.editor;editor.objectIO('select',arrow);
        const control=editor.inspectorShadow.querySelector('[data-canvas-appearance-point-count]');control.value='2';control.dispatchEvent(new Event('input',{bubbles:true}));
        window.geometry=()=>view.propertyRenderer.editor.captureAssetLayout().map(({key,point})=>({key,point}));
      },type);
      assert(await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-map-control]')));
      const before=await read(()=>geometry()),assets=await read(()=>JSON.stringify(api.localAssetSnapshot().assets));
      // A gesture beginning on empty space is not a click if it moves.
      const start=await blank();
      await mouse(client,'mouseMoved',start.x,start.y,0);await mouse(client,'mousePressed',start.x,start.y,1);await mouse(client,'mouseMoved',start.x-25,start.y+15,1);await mouse(client,'mouseReleased',start.x-25,start.y+15,0);
      assert.deepEqual(await read(()=>view.propertyRenderer.editor.objectIO('selection')),await read(()=>({kind:arrow.kind,id:arrow.id})),'blank-space dragging does not cancel selection');
      // Dragging a real handle must retain selection too.
      const handle=await read(()=>{const r=view.propertyRenderer.editor.shadow.querySelector('[data-map-control]:not([disabled])').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await mouse(client,'mouseMoved',handle.x,handle.y,0);await mouse(client,'mousePressed',handle.x,handle.y,1);await mouse(client,'mouseMoved',handle.x+10,handle.y+8,1);await mouse(client,'mouseReleased',handle.x+10,handle.y+8,0);
      assert.deepEqual(await read(()=>view.propertyRenderer.editor.objectIO('selection')),await read(()=>({kind:arrow.kind,id:arrow.id})),'handle dragging retains selection');
      const edited=await read(()=>geometry());assert.notDeepEqual(edited,before);
      await click(await blank());await assertDeselected();
      assert.deepEqual(await read(()=>geometry()),edited,'deselection preserves exact positions and curve shape');
      assert.equal(await read(()=>api.state.selected.size),0,'Assets selection clears with the drawing');
      assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),assets,'deselection preserves mathematical Assets');
      // Reprojection and backup must respect empty selection, including a
      // sheaf overview whose Add / select reference still names an object.
      await read(()=>api.updateObjectAsset({kind:arrow.kind,id:arrow.id},{name:arrow.kind+'_renamed'}));
      await assertDeselected();assert.deepEqual(await read(()=>geometry()),edited);
      const backup=await read(()=>panels.exportText('workspace'));
      await read(text=>{const id=view.id;panels.importText('workspace',text);view=panels.panels.get(id);},backup);
      await assertDeselected();assert.deepEqual(await read(()=>geometry()),edited);
      const label=await read(()=>{const root=view.propertyRenderer.editor.shadow,node=root.querySelector('[data-workspace-asset-key="'+key(arrow)+'"]')||root.querySelector('[data-object-kind="map"]'),r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await click(label);
      assert.deepEqual(await read(()=>view.propertyRenderer.editor.objectIO('selection')),await read(()=>({kind:arrow.kind,id:arrow.id})),'clicking the arrow label reselects it');
      assert(await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-map-control]')),'curve controls return on selection');
      await click(await blank());await assertDeselected();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS Both overviews: blank click clears selection/highlights/handles, preserves geometry and Assets, survives reproject/backup, and leaves drag gestures intact');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
