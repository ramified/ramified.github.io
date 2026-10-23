'use strict';
const assert=require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    session=await launchBrowser(origin+'/mosaic_calculator.html');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    for(const workspace of [false,true]) for(const target of ['tile','outside','removed']){
      const payload={rows:3,cols:3,lattice:'square',boundary:'glued',inputMode:'background',backgroundAction:'decoration',tiles:[],removedTiles:target==='removed'?[{row:3,col:3}]:[],cutEdges:[],gluedEdges:[],billiards:{ballRadius:0.05,pockets:[]}};
      if(workspace){
        await client.send('Page.navigate',{url:origin+'/math_workspace.html'});
        await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
        await read(payload=>{
          window.api=MathWorkspaceAssetsTest;window.key=a=>a.kind+':'+a.id;
          window.space=api.createObjectAsset('mosaic-space',{data:payload});
          window.diagram=api.createObjectAsset('mosaic-diagram',{data:MathWorkspaceMosaic.fromPayload('mosaic-diagram',payload,key(space))});
          window.panel=MathWorkspaceObjectPanels.open('mosaic-diagram-input',key(diagram),'main');
          window.rackDoc=panel.activeRenderer.editor.environment.document;
          window.rackNative=panel.activeRenderer.editor.environment.window.MosaicCalculator.__test;
          window.spaceBefore=JSON.stringify(space.data);
        },payload);
      }else{
        await client.send('Page.navigate',{url:origin+'/mosaic_calculator.html'});
        await waitFor(()=>read(()=>!!window.MosaicCalculator?.__test.refs.canvas),20000);
        await read(payload=>{document.getElementById('import-input').value=JSON.stringify(payload);document.getElementById('generate-import').click();window.rackDoc=document;window.rackNative=MosaicCalculator.__test;},payload);
      }
      await read(()=>{
        for(const [id,value] of [['input-mode','background'],['background-action','decoration'],['background-decoration-kind','billiards-rack-6']]){
          const control=rackDoc.getElementById(id);control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));
        }
        rackDoc.getElementById('mosaic-canvas').scrollIntoView({block:'center'});
      });
      const points=await read(target=>{
        const g=rackNative.billiardsEditorGeometry(),r=rackDoc.getElementById('mosaic-canvas').getBoundingClientRect(),center=g.cells[4],angle=46*Math.PI/180;
        const screen=point=>({x:r.left+point.x*r.width/g.width,y:r.top+point.y*r.height/g.height});
        const direction=target==='outside'?{x:g.width-2,y:center.y}:target==='removed'?g.cells[8]:{x:center.x+0.7*g.radius*Math.cos(angle),y:center.y+0.7*g.radius*Math.sin(angle)};
        return [screen(center),screen(direction)];
      },target);
      const click=async(point,modifiers=0)=>{await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,modifiers});await client.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point,modifiers});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point,modifiers});};
      if(target!=='tile'){
        assert.equal(await read(point=>rackNative.hitTest(point.x,point.y),points[1]),-1,'direction target is not an available tile');
        await click(points[1]);
        assert.equal(await read(()=>rackNative.state.billiardsRack),null,'rack center still requires an available tile');
      }
      await click(points[0]);
      await waitFor(()=>read(()=>!!rackNative.state.billiardsRack));
      assert.equal(await read(()=>rackNative.currentBilliardsEditorState().balls.length),0,'center click only starts the placement draft');
      await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...points[1],modifiers:workspace?2:0});
      assert.equal(await read(()=>rackNative.state.billiardsHover?.action),'direction','direction preview remains visible outside available tiles');
      await click(points[1],workspace?2:0);
      await waitFor(()=>read(()=>!rackNative.state.billiardsRack&&rackNative.currentBilliardsEditorState().balls.length===6));
      const block=await read(()=>rackNative.buildMinigamePresetExport().billiards);
      assert.equal(block.rack.count,6);
      // Browser pointer coordinates have finite precision after canvas scaling.
      const expectedAngle=target==='outside'?0:target==='removed'?45:workspace?46:45;
      assert(Math.abs(block.rack.angle-expectedAngle)<0.001,'direction respects snapping and Ctrl bypass: '+block.rack.angle);
      assert.equal(block.ballRadius,0.05);assert.equal(block.tileEdgeLengthM,undefined,'legacy radius remains authoritative');
      if(workspace){
        await waitFor(()=>read(()=>api.localAssetSnapshot().assets.find(a=>key(a)===key(diagram)).data.billiards.rack?.count===6));
        assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets.find(a=>key(a)===key(space)).data)),await read(()=>spaceBefore));
      }
      console.log('PASS '+(workspace?'Workspace diagram':'Standalone Mosaic')+': rack direction on '+target);
    }
    assert.deepEqual(errors,[]);
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
