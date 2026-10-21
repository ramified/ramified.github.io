'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;window.one=api.createObjectAsset('young',{data:{rows:[1]}});window.zero=api.createObjectAsset('young',{data:{rows:[]}});});
    for(const [family,rank] of [['B',1],['C',1],['D',2]]){
      await read((family,rank)=>{
        window.g=api.createObjectAsset('lie',{data:{family,rank}});
        window.d=api.createObjectAsset('dynkin',{data:{lie:key(g),vertices:Array.from({length:rank},(_,i)=>i+1),quiver:{}}});
        window.s=api.createObjectAsset('strands',{data:{lie:key(g),generators:[{family:'coxeter',index:0}]}});
        window.opened=['lie-view','dynkin-cartan','dynkin-invariants'].map(type=>panels.open(type,key(g),'side'));
        opened.push(...['dynkin-view','dynkin-input','dynkin-vertex','dynkin-parabolic','dynkin-starting'].map(type=>panels.open(type,key(d),'side')));
        opened.push(...['strands-view','strands-input','strands-info'].map(type=>panels.open(type,key(s),'side')));
        window.weight=panels.open('weight','','side',{refs:{lambda:key(one),lie:key(g)}});opened.push(weight);
        window.lr=panels.open('lr','','side',{refs:{lambda:key(one),mu:key(one),nu:key(zero),lie:key(g)}});opened.push(lr);
        const root=lr.propertyRenderer.editor.inspectorShadow,fixed=root.getElementById('fixed-rank-mode');fixed.checked=true;fixed.dispatchEvent(new Event('change',{bubbles:true}));root.getElementById('compute-schur').click();
      },family,rank);
      const statuses=await read(()=>opened.map(p=>[p.definition.id,p.computation?.status||'',p.message.textContent]));
      for(const [type,status,message] of statuses){assert.notEqual(status,'missing',family+rank+' '+type+': '+message);assert(!/error|undefined|supports.*rank/i.test(message),family+rank+' '+type+': '+message);}
      assert.deepEqual(await read(()=>opened[0].propertyRenderer.editor.objectIO('geometry').edges),[],'degenerate diagrams have no edges');
      assert.equal(await read(()=>opened[0].propertyRenderer.editor.objectIO('geometry').vertices.length),rank);
      assert.deepEqual(await read(()=>opened[1].propertyRenderer.editor.readObjectResult().cartan),rank===1?[[2]]:[[2,0],[0,2]]);
      assert.match(await read(()=>lr.propertyRenderer.editor.inspectorShadow.getElementById('schur-out').textContent),/Coefficient = 1/);
      assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===key(g)).data.family),family);
      await read(()=>{const ar=opened.find(p=>p.definition.id==='dynkin-starting');ar.propertyRenderer.editor.inspectorShadow.getElementById('dynkin-starting-ar-mode').click();});
      assert.equal(await read(()=>opened.find(p=>p.definition.id==='dynkin-starting').propertyRenderer.editor.captureAssetProperties().arMode),true,'edgeless quivers support AR mode');
      if(family==='C'){
        await read(()=>{api.updateObjectAsset({kind:'lie',id:g.id},{data:{family:'C',rank:2}});window.input=panels.open('lie-input',key(g),'side');input.rank.focus();});
        for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
        for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
        assert.equal(await read(()=>input.rank.value),'');
        assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===key(g)).data.rank),2);
        await client.send('Input.insertText',{text:'1'});await read(()=>input.rank.blur());
        assert.equal(await read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===key(g)).data.rank),1);
      }
      if(family==='D'){
        await read(()=>{window.r=api.createObjectAsset('roots',{data:{ambientDimension:2,lie:key(g)}});window.geo=panels.open('geometry-view',key(r),'main');});
        assert.equal(await read(()=>geo.computation.status),'current');
        const basis=await read(()=>MathWorkspaceSlicing.math('lie-matrix',{lie:{family:'D',rank:2},basis:'simple-roots'}));
        assert.deepEqual(basis,[[1,1],[-1,1]],'D2 geometry uses the disconnected D root basis, not A2');
      }
    }
    await read(()=>{window.backup=panels.exportText('workspace');panels.importText('workspace',backup);});
    assert.equal(await read(()=>api.localAssetSnapshot().assets.filter(a=>a.kind==='lie'&&((['B','C'].includes(a.data.family)&&a.data.rank===1)||(a.data.family==='D'&&a.data.rank===2))).length),3);
    assert.deepEqual(errors,[]);
    console.log('PASS B1/C1/D2 native views, markings, empty quivers, properties, strands, Young/LR, D2 geometry and backup restoration');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
