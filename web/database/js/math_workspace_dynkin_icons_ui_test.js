'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.g=api.createObjectAsset('lie',{data:{family:'D',rank:5}});window.d=api.createObjectAsset('dynkin',{data:{lie:key(g),vertices:[2]}});
      window.fallback=api.createObjectAsset('dynkin',{data:{lie:'',vertices:[1]}});
      window.examples=[['B',3],['C',3],['G2',2],['F4',4],['E6',6],['E7',7],['E8',8],['D',2],['B',1],['C',1],['A',12]].map(([family,rank])=>{const lie=api.createObjectAsset('lie',{data:{family,rank}});return api.createObjectAsset('dynkin',{data:{lie:key(lie),vertices:[1]}});});
      window.a=api.createObjectAsset('lie',{data:{family:'A',rank:3}});window.q=api.createObjectAsset('dynkin',{data:{lie:key(a),vertices:[1,3],quiver:{'0-1':1,'1-2':-1}}});
      window.icon=asset=>document.querySelector('[data-asset-key="'+key(asset)+'"] .workspace-asset-icon');
      window.shape=asset=>{const svg=icon(asset).querySelector('svg');return{nodes:[...svg.querySelectorAll('circle')].map(n=>({x:+n.getAttribute('cx'),y:+n.getAttribute('cy'),marked:n.dataset.marked==='true'})),edges:[...svg.querySelectorAll('[data-dynkin-edge]')].map(e=>[e.dataset.dynkinEdge,+e.dataset.multiplicity]),arrows:[...svg.querySelectorAll('[data-dynkin-arrow-target]')].map(e=>+e.dataset.dynkinArrowTarget)};};
      api.openCanvas('assets');window.before=JSON.stringify(api.localAssetSnapshot().assets);
    });
    for(const layout of ['icons','list','details','tiles','content']){
      await read(layout=>{api.state.layout=layout;api.applyAssetSnapshot(api.localAssetSnapshot());},layout);
      assert.equal(await read(()=>icon(d).dataset.iconSource),'diagram');assert.equal(await read(()=>icon(fallback).dataset.iconSource),'generic');
      assert.deepEqual(await read(()=>shape(d)),await read(()=>shape(fallback)),layout+' fallback uses D5 with vertex 2 marked');
      assert.deepEqual(await read(()=>shape(d).nodes.map(n=>n.marked)),[false,true,false,false,false]);
      assert.deepEqual(await read(()=>shape(q).arrows),[]);assert.deepEqual(await read(()=>shape(q).nodes.map(n=>n.marked)),[true,false,true]);
      assert(await read(()=>examples.every(asset=>icon(asset).dataset.iconSource==='diagram')));
      assert.notEqual(await read(()=>getComputedStyle(icon(d)).color),await read(()=>getComputedStyle(icon(fallback)).color));
    }
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>before),'read-only rendering leaves Assets untouched');
    const unorientedIcon=await read(()=>icon(q).querySelector('svg').outerHTML);
    for(const quiver of [null,{'0-1':-1,'1-2':1},{'0-1':1}]){
      await read(quiver=>api.updateObjectAsset({kind:'dynkin',id:q.id},{data:{...api.localAssetSnapshot().assets.find(asset=>asset.id===q.id).data,quiver}}),quiver);
      assert.equal(await read(()=>icon(q).querySelector('svg').outerHTML),unorientedIcon,'quiver changes, including directions needing repair, leave the icon stable');
    }
    await read(()=>{api.state.layout='icons';api.applyAssetSnapshot(api.localAssetSnapshot());window.native=panels.open('dynkin-view',key(d),'side');});
    assert.deepEqual(await read(()=>shape(d).nodes.map(n=>[n.x,n.y])),await read(()=>native.propertyRenderer.editor.objectIO('geometry').vertices.map(n=>[n.x,n.y])),'icon uses the native display geometry');
    await read(()=>api.updateObjectAsset({kind:'dynkin',id:d.id},{data:{lie:key(g),vertices:[1,4],quiver:null}}));
    assert.deepEqual(await read(()=>shape(d).nodes.map(n=>n.marked)),[true,false,false,true,false]);
    await read(()=>api.updateObjectAsset({kind:'lie',id:g.id},{data:{family:'A',rank:5}}));
    assert.equal(await read(()=>new Set(shape(d).nodes.map(n=>n.y)).size),1,'a parent type change refreshes the icon');
    await read(()=>api.updateObjectAsset({kind:'lie',id:g.id},{data:{family:'A',rank:13}}));
    assert.equal(await read(()=>icon(d).dataset.iconSource),'generic');
    await read(()=>{document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(b=>b.textContent==='New…').click();});
    assert.deepEqual(await read(()=>[...document.querySelector('[data-create-kind="dynkin"] svg').querySelectorAll('circle')].map(n=>n.dataset.marked==='true')),[false,true,false,false,false],'creation uses the same generic D5 thumbnail');
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-dynkin-icons.png'),Buffer.from(shot.data,'base64'));
    assert.deepEqual(errors,[]);
    console.log('PASS actual Dynkin icons, D5 vertex-2 fallback, all layouts/families, stable thumbnails without quiver arrows, native geometry, parent/marking updates and creation previews');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
