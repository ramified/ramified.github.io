'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-7,message+': '+actual+' vs '+expected);

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
    for (const type of ['category-diagram','sheaf-view']) {
      await read(type=>{
        const category=type==='category-diagram',kind=category?'category':'variety';
        window.a=api.createObjectAsset(kind,{name:category?'C':'X'});window.b=api.createObjectAsset(kind,{name:category?'D':'Y'});window.c=api.createObjectAsset(kind,{name:category?'E':'Z'});
        window.arrow=api.createObjectAsset(category?'functor':'map',{name:category?'F':'f',data:{domain:key(a),codomain:key(b)}});
        window.view=panels.open(type,key(arrow),'main',{refs:{nodes:[key(a),key(b),key(c),key(arrow)],active:key(arrow)}});
        window.editor=()=>view.propertyRenderer.editor;
        window.curve=()=>editor().captureAssetLayout().find(entry=>entry.key===key(arrow)).point;
        editor().positionAsset(a,{x:.32,y:.48});editor().positionAsset(b,{x:.72,y:.52});editor().positionAsset(c,{x:.65,y:.78});
        window.edit=category?panels.open('functor-input',key(arrow),'side'):null;
        window.setEndpoint=(endpoint,asset)=>{
          if(edit){const control=edit.node.querySelector('[data-object-reference="'+endpoint+'"]');control.value=key(asset);control.dispatchEvent(new Event('change'));}
          else {const item=api.localAssetSnapshot().assets.find(item=>key(item)===key(arrow));api.updateObjectAsset(arrow,{data:{...item.data,[endpoint]:key(asset)}});}
        };
        window.loopState=()=>{
          const root=editor().shadow,layout=editor().captureAssetLayout(),nativeId=root.querySelector('[data-object-kind="map"]').dataset.objectId;
          return {parent:layout.find(entry=>entry.key===key(a)).point,curve:curve(),controls:[...root.querySelectorAll('[data-map-id="'+nativeId+'"][data-map-control]')].map(node=>({id:node.dataset.mapControl,x:parseFloat(node.style.left),y:parseFloat(node.style.top)})),label:(()=>{const node=root.querySelector('[data-object-kind="map"]');return {x:parseFloat(node.style.left),y:parseFloat(node.style.top)};})(),metrics:editor().captureSceneGeometry().curveAnchor};
        };
      },type);
      assert.equal(await read(()=>curve().curve.type),'straight','ordinary arrow starts straight');
      await read(()=>setEndpoint('codomain',a));
      assert(await read(()=>curve().curve.type!=='straight' && curve().curve.anchors.length>=3),'changing C→D to C→C automatically creates loop anchors');
      await read(()=>{editor().objectIO('select',arrow);const control=editor().inspectorShadow.querySelector('[data-canvas-appearance-point-count]');control.value='4';control.dispatchEvent(new Event('input',{bubbles:true}));});
      assert.equal(await read(()=>curve().curve.anchors.length),5);
      // Customize the curve before moving its parent.
      const handle=await read(()=>{const r=editor().shadow.querySelector('[data-map-control]:not([disabled])').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await mouse(client,'mouseMoved',handle.x,handle.y,0);await mouse(client,'mousePressed',handle.x,handle.y,1);await mouse(client,'mouseMoved',handle.x+8,handle.y+7,1);await mouse(client,'mouseReleased',handle.x+8,handle.y+7,0);
      const before=await read(()=>loopState()),assets=await read(()=>JSON.stringify(api.localAssetSnapshot().assets));
      const parent=await read(()=>{const root=editor().shadow,node=root.querySelector('[data-workspace-asset-key="'+key(a)+'"]')||root.querySelector('[data-object-id="workspace-asset-variety-'+a.id+'"]'),r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
      await mouse(client,'mouseMoved',parent.x,parent.y,0);await mouse(client,'mousePressed',parent.x,parent.y,1);await mouse(client,'mouseMoved',parent.x+36,parent.y+14,1);
      const during=await read(()=>loopState());
      await mouse(client,'mouseReleased',parent.x+36,parent.y+14,0);
      const after=await read(()=>loopState());
      for (const [label,state] of [['during',during],['after',after]]) {
        const dx=state.parent.x-before.parent.x,dy=state.parent.y-before.parent.y;
        assert(Math.hypot(dx,dy)>.01,'parent actually moved');
        for (const collection of ['anchors','handles']) state.curve.curve[collection].forEach((point,index)=>{
          const endpoint=index===0||index===state.curve.curve[collection].length-1;
          near(point.x-before.curve.curve[collection][index].x,endpoint?dx:0,label+' '+collection+' x');
          near(point.y-before.curve.curve[collection][index].y,endpoint?dy:0,label+' '+collection+' y');
        });
        for(const control of state.controls){const previous=before.controls.find(item=>item.id===control.id),index=Number(control.id.split(':')[1]),endpoint=index===0||index===state.curve.curve.anchors.length-1;near(control.x-previous.x,endpoint?dx*880:0,label+' control line x');near(control.y-previous.y,endpoint?dy*280:0,label+' control line y');}
        near(state.curve.x,before.curve.x,label+' label position along curve');near(state.curve.y,before.curve.y,label+' label offset');
        // Visible path clipping can change as the loop bends. Its editable
        // endpoint handles must retain their vectors relative to the parent.
        for(const index of [0,state.curve.curve.handles.length-1])for(const axis of ['x','y'])near(state.curve.curve.handles[index][axis]-state.parent[axis],before.curve.curve.handles[index][axis]-before.parent[axis],label+' endpoint handle vector stays fixed');
      }
      assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),assets,'drag changes only presentation');
      await read(()=>api.updateObjectAsset(arrow,{name:arrow.kind+'_loop'}));
      assert.deepEqual(await read(()=>curve()),after.curve,'renaming preserves custom loop geometry');
      const backup=await read(()=>panels.exportText('workspace'));
      await read(text=>{const id=view.id;panels.importText('workspace',text);view=panels.panels.get(id);if(edit)edit=[...panels.panels.values()].find(panel=>panel.definition.id==='functor-input'&&panel.assetKey===key(arrow));},backup);
      assert.deepEqual(await read(()=>curve()),after.curve,'backup preserves the translated loop');
      // Moving either endpoint to another object rebuilds its default shape.
      await read(()=>setEndpoint('domain',c));
      assert.equal(await read(()=>curve().curve.type),'straight','C→C becomes E→C with an ordinary-arrow shape');
      await read(()=>setEndpoint('codomain',c));
      assert(await read(()=>curve().curve.anchors.length>=3 && curve().curve.type!=='straight'),'E→C becomes a visible E→E loop');
      await read(()=>setEndpoint('codomain',b));
      assert.equal(await read(()=>curve().curve.type),'straight','self-loop can return to an ordinary arrow');
      // Old backup geometry may have a straight or two-anchor self-loop.
      await read(()=>{setEndpoint('domain',a);setEndpoint('codomain',a);editor().objectIO('layout',[{key:key(arrow),point:{x:.5,y:-18,mode:'map-curve',curve:{type:'straight',anchors:[],handles:[]}}}]);});
      assert(await read(()=>curve().curve.type!=='straight' && curve().curve.anchors.length>=3),'legacy collapsed self-loop geometry is repaired');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS Functor/map self-loops: only endpoint anchors/handles follow parent dragging, interior controls stay fixed, endpoint edits regenerate curves, rename/backup preserve geometry');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
