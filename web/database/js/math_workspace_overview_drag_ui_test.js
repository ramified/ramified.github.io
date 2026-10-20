'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse} = require('./math_workspace_drag_regression_test.js');

async function run() {
  const server=await startServer(); let session;
  try {
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session, errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');
    client.socket.addEventListener('message',event=>{const msg=JSON.parse(String(event.data));if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest; window.panels=MathWorkspaceObjectPanels; window.key=a=>a.kind+':'+a.id;
      window.c=api.createObjectAsset('category',{name:'C'}); window.d=api.createObjectAsset('category',{name:'D'});
      window.f=api.createObjectAsset('functor',{name:'F',data:{domain:key(c),codomain:key(d)}});
      window.x=api.createObjectAsset('variety',{name:'X',type:'projective',data:{dimension:'2'}});
      window.y=api.createObjectAsset('variety',{name:'Y',type:'curve',data:{genus:'2'}});
      window.e=api.createObjectAsset('sheaf',{name:'E',type:'locally-free',data:{base:key(x),rank:'2'}});
      window.m=api.createObjectAsset('map',{name:'g',data:{domain:key(x),codomain:key(y)}});
      window.view=panels.open('category-diagram',key(f),'main');
      window.members=()=>[...new Set(Object.values(MathWorkspaceObjects.contextFor(view.computation,api.localAssetSnapshot().assets).objects).map(key))];
      window.functorPoint=()=>view.propertyRenderer.editor.captureAssetLayout().find(entry=>entry.key===key(f)).point;
      window.overviewUI=()=>{
        const root=view.propertyRenderer.editor.shadow,stage=root.querySelector('.sheaf-stage'),style=getComputedStyle(stage);
        return {stage:[style.border,style.backgroundColor,style.borderRadius],buttons:[...root.querySelectorAll('.canvas-corner-actions button')].map(button=>{const s=getComputedStyle(button);return [button.textContent,s.padding,s.fontSize,s.backgroundColor,s.borderRadius];})};
      };
    });
    const drag=async (assetName,outside=true)=>{
      const points=await read((name,outside)=>{
        const asset=window[name],root=view.propertyRenderer.editor.shadow;
        const label=root.querySelector('[data-workspace-asset-key="'+key(asset)+'"]') || [...root.querySelectorAll('[data-object-kind][data-object-id]')].find(el=>el.dataset.objectKind===asset.kind&&(el.dataset.objectId===key(asset)||el.dataset.objectId==='workspace-asset-'+asset.kind+'-'+asset.id));
        const r=label.getBoundingClientRect(),stage=root.querySelector('.category-stage,.sheaf-stage').getBoundingClientRect();
        return {x:r.left+r.width/2,y:r.top+r.height/2,endX:outside?stage.right+15:r.left+r.width/2+15,endY:r.top+r.height/2+10};
      },assetName,outside);
      await mouse(client,'mouseMoved',points.x,points.y,0); await mouse(client,'mousePressed',points.x,points.y,1);
      await mouse(client,'mouseMoved',points.endX,points.endY,1);
      await mouse(client,'mouseReleased',points.endX,points.endY,0);
    };
    assert.equal(await read(()=>view.controls.children.length),0,'category overview has no scene checkbox list');
    assert.equal(await read(()=>JSON.parse(view.propertyRenderer.editor.objectIO('export','preset')).functors.length),1,'Add / select binding does not duplicate the active object');
    assert.equal(await read(()=>!!view.node.querySelector('.workspace-object-reference')),false,'category overview has no object selector');
    assert.deepEqual(await read(()=>[...view.propertyRenderer.editor.shadow.querySelectorAll('.canvas-corner-actions button')].map(button=>button.textContent)),['clear','show','collect'],'both overviews use the same buttons');
    assert(await read(()=>{const root=view.propertyRenderer.editor.shadow,stage=root.querySelector('.sheaf-stage').getBoundingClientRect(),buttons=root.querySelector('.canvas-corner-actions').getBoundingClientRect();return Math.abs(buttons.left-stage.left-11)<2&&Math.abs(stage.bottom-buttons.bottom-11)<2;}),'category buttons are at the bottom left like sheaf buttons');
    const initialFunctor=await read(()=>functorPoint());
    await drag('f',false);
    const movedFunctor=await read(()=>functorPoint());
    assert.notDeepEqual(movedFunctor,initialFunctor,'functor dragging changes map label coordinates, not just DOM style');
    assert.equal(movedFunctor.mode,'map-curve','functor labels use map curve coordinates');
    await read(()=>api.updateObjectAsset({kind:c.kind,id:c.id},{name:'C2'}));
    assert.deepEqual(await read(()=>functorPoint()),movedFunctor,'functor label placement survives a shared Asset update');
    await client.send('Emulation.setDeviceMetricsOverride',{width:900,height:800,deviceScaleFactor:1,mobile:false});
    assert.deepEqual(await read(()=>functorPoint()),movedFunctor,'resizing does not reset functor labels');
    await client.send('Emulation.clearDeviceMetricsOverride');
    await read(()=>{
      const editor=view.propertyRenderer.editor;editor.objectIO('select',f);
      const control=editor.inspectorShadow.querySelector('[data-canvas-appearance-point-count]');
      control.value='2';control.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const curveBefore=await read(()=>functorPoint().curve);
    assert(curveBefore,'functors support the map curve controls');
    const handle=await read(()=>{const node=view.propertyRenderer.editor.shadow.querySelector('[data-map-control]:not([disabled])'),r=node.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
    await mouse(client,'mouseMoved',handle.x,handle.y,0);await mouse(client,'mousePressed',handle.x,handle.y,1);await mouse(client,'mouseMoved',handle.x+10,handle.y+10,1);await mouse(client,'mouseReleased',handle.x+10,handle.y+10,0);
    const curvedFunctor=await read(()=>functorPoint());
    assert.notDeepEqual(curvedFunctor.curve,curveBefore,'real dragging adjusts functor curve handles');
    assert(await read(()=>{const metrics=view.propertyRenderer.editor.captureSceneGeometry().curveAnchor;return Math.hypot(metrics.pathStart.x-metrics.sourceCenter.x,metrics.pathStart.y-metrics.sourceCenter.y)>7&&Math.hypot(metrics.pathEnd.x-metrics.targetCenter.x,metrics.pathEnd.y-metrics.targetCenter.y)>9;}),'painted arrows stop before the endpoint labels');
    assert(await read(()=>{
      const root=view.propertyRenderer.editor.shadow,bg=root.querySelector('.workspace-overview-label-backgrounds'),canvas=root.querySelector('#sheaf-canvas'),text=root.querySelector('.sheaf-canvas-labels');
      return +getComputedStyle(bg).zIndex < +getComputedStyle(canvas).zIndex && +getComputedStyle(canvas).zIndex < +getComputedStyle(text).zIndex && getComputedStyle(text.querySelector('.sheaf-canvas-label')).backgroundColor==='rgba(0, 0, 0, 0)' && bg.children.length===text.querySelectorAll('.sheaf-canvas-label').length;
    }),'arrows render above label backgrounds and below glyphs');
    assert.deepEqual(await read(()=>view.propertyRenderer.editor.objectIO('selection')),await read(()=>({kind:f.kind,id:f.id})),'curve handles retain functor selection and appearance binding');
    const categoryBackup=await read(()=>panels.exportText('workspace'));
    await read(text=>{const id=view.id;panels.importText('workspace',text);view=panels.panels.get(id);},categoryBackup);
    assert.deepEqual(await read(()=>functorPoint()),curvedFunctor,'backup preserves functor curve and label geometry');
    await read(()=>view.propertyRenderer.editor.objectIO('hide',key(f)));
    assert(await read(()=>functorPoint().hidden),'functor hide uses the same presentation state as maps');
    await waitFor(()=>read(()=>!view.propertyRenderer.editor.shadow.querySelector('#show-canvas').disabled));
    await read(()=>view.propertyRenderer.editor.shadow.querySelector('#show-canvas').click());
    assert.equal(await read(()=>functorPoint().hidden),false,'show restores the functor label');
    // An old category-renderer backup uses the encoded native state format.
    await read(()=>{
      const host=document.createElement('section');document.body.append(host);
      const old=MathWorkspaceNativeEditors.factories.category.mount(host,{id:'legacy-category-overview'});
      old.configureObjectPanel({mode:'io'});
      old.applyAssets({assets:api.localAssetSnapshot().assets.filter(a=>['category','functor'].includes(a.kind))},f);
      old.objectIO('layout',[{id:key(c),x:.24,y:.36},{id:key(d),x:.74,y:.56}]);
      const backup=JSON.parse(panels.exportText('workspace')),record=backup.panels.find(p=>p.id===view.id);
      const renderer=record.renderers.find(r=>r.role==='property');renderer.snapshot=old.capture();delete renderer.overviewLayout;old.dispose();
      const id=view.id;panels.importText('workspace',JSON.stringify(backup));view=panels.panels.get(id);
    });
    assert.equal(await read(()=>view.propertyRenderer.editor.captureAssetLayout().find(entry=>entry.key===key(c)).point.x),.24,'legacy category positions migrate to the shared scene');
    await read(()=>{window.stored=JSON.stringify(api.localAssetSnapshot().assets);});
    const categoryShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-category-shared-scene.png'),Buffer.from(categoryShot.data,'base64'));
    const categoryUI=await read(()=>overviewUI());
    await drag('d',false);
    assert.equal(await read(()=>members().length),3,'inside drag keeps membership');
    await drag('f');
    assert.deepEqual(await read(()=>members().sort()),await read(()=>[key(c),key(d)].sort()),'functor drag-out retains its endpoints');
    await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-workspace-collect-assets]').click());
    await drag('c');
    assert.deepEqual(await read(()=>members()),await read(()=>[key(d)]),'category drag-out also removes dependent functor');
    await read(()=>{view.propertyRenderer.editor.shadow.querySelector('#clear-canvas').click();});
    assert.deepEqual(await read(()=>members()),[],'clear also resets the Add / select reference');
    await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-workspace-collect-assets]').click());
    assert.equal(await read(()=>members().length),3,'collect restores category Assets');
    await read(()=>{window.categoryView=view;view=panels.open('sheaf-view',key(m),'main');const select=view.node.querySelector('[data-object-reference="asset"]');select.value=key(e);select.dispatchEvent(new Event('change'));});
    await waitFor(()=>read(()=>view.propertyRenderer.editor.captureSceneGeometry()?.view.scale>0));
    assert.deepEqual(await read(()=>overviewUI()),categoryUI,'category and sheaf overviews have identical stage and button styling');
    await drag('e',false);
    assert.equal(await read(()=>members().length),4);
    await drag('m');
    assert.equal(await read(()=>members().includes(key(m))),false,'map drag-out removes membership');
    assert.equal(await read(()=>members().length),3,'map drag-out keeps its endpoints and the sheaf');
    await drag('e');
    assert.equal(await read(()=>members().includes(key(e))),false,'sheaf drag-out removes membership');
    await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-workspace-collect-assets]').click());
    await drag('x');
    assert.deepEqual(await read(()=>members()),await read(()=>[key(y)]),'base drag-out removes dependent drawings');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>stored),'all gestures preserve Assets');
    await read(()=>api.updateObjectAsset({kind:y.kind,id:y.id},{name:'Y2'}));
    assert.deepEqual(await read(()=>members()),await read(()=>[key(y)]),'unrelated refresh does not restore removed members');
    const backup=await read(()=>panels.exportText('workspace'));
    await read(text=>{const id=view.id;panels.importText('workspace',text);view=panels.panels.get(id);},backup);
    assert.deepEqual(await read(()=>members()),await read(()=>[key(y)]),'removed membership survives backup restore');
    await read(()=>view.propertyRenderer.editor.shadow.querySelector('[data-workspace-collect-assets]').click());
    assert.equal(await read(()=>members().length),4,'collect restores sheaf Assets');
    await read(()=>{const loop=api.createObjectAsset('functor',{name:'L',data:{domain:key(c),codomain:key(c)}});view=panels.open('category-diagram',key(loop),'main');view.propertyRenderer.editor.objectIO('select',loop);});
    assert(await read(()=>{const path=view.propertyRenderer.editor.captureSceneGeometry().curveAnchor;return path && Number.isFinite(path.pathStart.x) && Number.isFinite(path.pathEnd.y) && Math.hypot(path.pathStart.x-path.sourceCenter.x,path.pathStart.y-path.sourceCenter.y)>7 && Math.hypot(path.pathEnd.x-path.targetCenter.x,path.pathEnd.y-path.targetCenter.y)>9;}),'self-loop arrows remain visible and stop outside their label');
    for (const pointCount of ['2','3','4']) {
      await read(count=>{const control=view.propertyRenderer.editor.inspectorShadow.querySelector('[data-canvas-appearance-point-count]');control.value=count;control.dispatchEvent(new Event('input',{bubbles:true}));},pointCount);
      assert(await read(count=>{
        const curve=view.propertyRenderer.editor.captureAssetLayout().find(entry=>entry.key.startsWith('functor:')).point.curve;
        const {width,height}=view.propertyRenderer.editor.captureSceneGeometry().canonical;
        return curve.anchors.length===Number(count)+1 && curve.handles.every((handle,index)=>{
          const anchor=curve.anchors[index],previous=curve.anchors[Math.max(0,index-1)],next=curve.anchors[Math.min(curve.anchors.length-1,index+1)];
          const oldScale=index===0||index===curve.anchors.length-1?1/3:1/6;
          const oldLength=Math.hypot((next.x-previous.x)*width,(next.y-previous.y)*height)*oldScale;
          const newLength=Math.hypot((handle.x-anchor.x)*width,(handle.y-anchor.y)*height);
          const spacing=Math.min(...[curve.anchors[index-1],curve.anchors[index+1]].filter(Boolean).map(point=>Math.hypot((point.x-anchor.x)*width,(point.y-anchor.y)*height)));
          return newLength>=oldLength*1.49 && newLength>=spacing*.499;
        });
      },pointCount),'multipoint self-loop handles are longer, including tight turns');
    }
    const loopGeometry=await read(()=>view.propertyRenderer.editor.captureAssetLayout());
    await read(()=>api.updateObjectAsset({kind:c.kind,id:c.id},{name:'C3'}));
    assert.deepEqual(await read(()=>view.propertyRenderer.editor.captureAssetLayout()),loopGeometry,'redraws do not repeatedly extend control handles');
    const loopBackup=await read(()=>panels.exportText('workspace'));
    await read(text=>{const id=view.id;panels.importText('workspace',text);view=panels.panels.get(id);},loopBackup);
    assert.deepEqual(await read(()=>view.propertyRenderer.editor.captureAssetLayout()),loopGeometry,'backup retains the longer control handles exactly');
    const loopShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-self-loop-long-handles.png'),Buffer.from(loopShot.data,'base64'));
    assert.deepEqual(errors,[]);
    console.log('PASS Shared overview UI, persistent functor/map labels, curve handle drags, show/collect/clear, drag-out, Assets preservation and old/new backups');
  } finally {
    if(session){session.client.close();await stopBrowser(session.browser,session.profile);}
    await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
