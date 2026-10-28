'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate,mouse}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.lie=api.createObjectAsset('lie',{name:'\\mathfrak{g}',data:{family:'E6'}});
      window.marked=api.createObjectAsset('dynkin',{data:{lie:key(lie),vertices:[1,3]}});
      api.openCanvas('assets');document.querySelector('[data-asset-key="'+key(lie)+'"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
      window.view=[...panels.panels.values()].find(p=>p.definition.id==='lie-view');
    });
    assert.equal(await read(()=>document.getElementById('workspace-canvas-panes').dataset.split),'true');
    assert.equal(await read(()=>view.computation.refs.lie),await read(()=>key(lie)));
    assert.equal(await read(()=>MathWorkspaceObjects.kindLabels.dynkin),'Marked Dynkin diagram');
    await waitFor(()=>read(()=>!!document.querySelector('[data-asset-key="'+key(lie)+'"] .workspace-asset-icon mjx-container')));
    assert.equal(await read(()=>document.querySelector('[data-asset-key="'+key(lie)+'"] .workspace-asset-icon').dataset.iconName),'E_{6}');
    assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('geometry').vertices.length),6);
    assert.deepEqual(await read(()=>view.propertyRenderer.editor.readObjectResult().vertices),[]);
    const diagramLayout=()=>{
      const editor=view.propertyRenderer.editor,canvas=editor.shadow.querySelector('#dynkin-canvas'),rect=canvas.getBoundingClientRect();
      const area=editor.shadow.querySelector('.workspace-native-content').getBoundingClientRect(),style=getComputedStyle(canvas);
      const nodes=editor.objectIO('geometry').vertices,scale=rect.width/900;
      const left=rect.left+(Math.min(...nodes.map(v=>v.x))-22)*scale,right=rect.left+(Math.max(...nodes.map(v=>v.x))+22)*scale;
      const top=rect.top+(Math.min(...nodes.map(v=>v.y))-22)*scale,bottom=rect.top+(Math.max(...nodes.map(v=>v.y))+22)*scale;
      return {transparent:canvas.getContext('2d').getImageData(0,0,1,1).data[3]===0&&style.backgroundColor==='rgba(0, 0, 0, 0)',
        borderless:style.borderTopWidth==='0px'&&style.boxShadow==='none',centered:Math.abs((left+right-area.left-area.right)/2)<1&&Math.abs((top+bottom-area.top-area.bottom)/2)<1,
        fits:left>=area.left&&right<=area.right&&top>=area.top&&bottom<=area.bottom,
        enlarged:scale>Math.min(area.width/900,area.height/360)};
    };
    await waitFor(async()=>Object.values(await read(diagramLayout)).every(Boolean));
    assert.deepEqual(await read(diagramLayout),{transparent:true,borderless:true,centered:true,fits:true,enlarged:true});
    // Every vertex has the unmarked light fill, including after a real click.
    const unmarked=()=>{
      const editor=view.propertyRenderer.editor,canvas=editor.shadow.querySelector('#dynkin-canvas'),ctx=canvas.getContext('2d'),scale=canvas.width/900;
      return editor.objectIO('geometry').vertices.every(v=>{const p=ctx.getImageData(Math.round(v.x*scale),Math.round((v.y+10)*scale),1,1).data;return p[0]>200&&p[1]>180;});
    };
    assert(await read(unmarked));
    const point=await read(()=>{const editor=view.propertyRenderer.editor,canvas=editor.shadow.querySelector('#dynkin-canvas'),r=canvas.getBoundingClientRect(),v=editor.objectIO('geometry').vertices[2];return{x:r.left+v.x*r.width/900,y:r.top+v.y*r.height/360};});
    await mouse(client,'mousePressed',point.x,point.y,1);await mouse(client,'mouseReleased',point.x,point.y,0);
    assert(await read(unmarked));
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===marked.id&&a.kind==='dynkin').data.vertices),[1,3]);
    await read(()=>{
      api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'D',rank:3}});
      api.updateObjectAsset({kind:'dynkin',id:marked.id},{data:{lie:key(lie),vertices:[1,3],quiver:{'0-1':1,'0-2':-1}}});
      window.markedView=panels.open('dynkin-view',key(marked),'main');
      window.cartan=panels.open('dynkin-cartan',key(lie),'side');
      window.invariants=panels.open('dynkin-invariants',key(lie),'side');
      window.vertex=panels.open('dynkin-vertex',key(marked),'side');
      window.parabolic=panels.open('dynkin-parabolic',key(marked),'side');
      window.ar=panels.open('dynkin-starting',key(marked),'side');
      window.strands=api.createObjectAsset('strands',{data:{lie:key(lie),generators:[{family:'coxeter',index:0},{family:'coxeter',index:2}]}});
      window.strandView=panels.open('strands-view',key(strands),'main');
      window.strandInfo=panels.open('strands-info',key(strands),'side');
    });
    for(const name of ['view','markedView','cartan','invariants','vertex','parabolic','ar','strandView','strandInfo'])assert.equal(await read(name=>window[name].computation.status,name),'current',name+' accepts D3');
    assert.deepEqual(await read(()=>cartan.propertyRenderer.editor.readObjectResult().cartan),[[2,-1,-1],[-1,2,0],[-1,0,2]]);
    assert.deepEqual(await read(()=>markedView.propertyRenderer.editor.readObjectResult().vertices),[1,3]);
    assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('geometry').vertices.length),3);
    assert.equal(await read(()=>strandInfo.propertyRenderer.editor.readObjectResult().strandCount),3);
    assert.equal(await read(()=>strandInfo.propertyRenderer.editor.readObjectResult().groupType),'D');
    // Reusing A3 internally without relabelling would change the orthogonal vector representation.
    await read(()=>{
      window.vector=api.createObjectAsset('young',{data:{rows:[1]}});window.trivial=api.createObjectAsset('young',{data:{rows:[]}});
      window.lr=panels.open('lr','','side',{refs:{lambda:key(vector),mu:key(vector),nu:key(trivial),lie:key(lie)}});
      const shadow=lr.propertyRenderer.editor.inspectorShadow,fixed=shadow.getElementById('fixed-rank-mode');fixed.checked=true;fixed.dispatchEvent(new Event('change',{bubbles:true}));shadow.getElementById('compute-schur').click();
    });
    assert.match(await read(()=>lr.propertyRenderer.editor.inspectorShadow.getElementById('schur-out').textContent),/Coefficient = 1/);
    assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>a.id===lie.id&&a.kind==='lie').data.family),'D');
    // Other supported low ranks retain their own numbering and root lengths.
    await read(()=>api.selectCanvasTab(view.id));
    await waitFor(async()=>Object.values(await read(diagramLayout)).every(Boolean));
    for(const [family,rank] of [['A',1],['B',2],['C',2]]){
      await read((family,rank)=>api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family,rank}}),family,rank);
      assert.equal(await read(()=>view.computation.status),'current');
      assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('geometry').vertices.length),rank);
      assert.deepEqual(await read(diagramLayout),{transparent:true,borderless:true,centered:true,fits:true,enlarged:true},family+rank+' display layout');
    }
    await read(()=>api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'B',rank:4}}));
    assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('geometry').vertices.length),4);
    assert(await read(unmarked));
    assert.equal(await read(()=>document.querySelector('[data-asset-key="'+key(lie)+'"] .workspace-asset-icon').dataset.iconName),'B_{4}');
    await read(()=>{window.backup=panels.exportText('workspace');panels.importText('workspace',backup);window.view=[...panels.panels.values()].find(p=>p.definition.id==='lie-view');});
    assert.equal(await read(()=>view.propertyRenderer.editor.objectIO('geometry').vertices.length),4);
    assert(await read(unmarked));
    await read(()=>api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'A',rank:2}}));
    await read(()=>{window.repairView=panels.open('dynkin-view',key(marked),'main');window.invalidBeforeRepair=JSON.stringify(api.localAssetSnapshot().assets.find(asset=>asset.id===marked.id).data);});
    assert.equal(await read(()=>repairView.dynkinRepair.hidden),false,'invalid legacy markings/directions have a recovery action in the display');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets.find(asset=>asset.id===marked.id).data)),await read(()=>invalidBeforeRepair),'invalid data stays intact until explicit repair');
    await read(()=>repairView.dynkinRepair.click());
    assert.deepEqual(await read(()=>api.localAssetSnapshot().assets.find(asset=>asset.id===marked.id).data),{lie:await read(()=>key(lie)),vertices:[1],quiver:null});
    assert.equal(await read(()=>repairView.computation.status),'current');assert.equal(await read(()=>repairView.dynkinRepair.hidden),true);
    await read(()=>api.updateObjectAsset({kind:'lie',id:lie.id},{data:{family:'A',rank:13}}));
    assert.equal(await read(()=>view.computation.status),'missing','unsupported ranks preserve the asset and report the renderer limit');
    assert.deepEqual(errors,[]);
    console.log('PASS Lie display, D3 marked/quiver/properties/strands/LR, low ranks A1/B2/C2, notation, shared updates, restoration and rank limits');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
