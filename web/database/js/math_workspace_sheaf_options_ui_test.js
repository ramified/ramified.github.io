'use strict';
const assert = require('node:assert/strict');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html');
    const {client}=session,read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.k=api.assetKey;window.get=ref=>api.localAssetSnapshot().assets.find(a=>k(a)===k(ref));
      window.P=api.createObjectAsset('variety',{name:'P',type:'projective',data:{dimension:'3'}});
      window.L=api.createObjectAsset('variety',{name:'L',type:'projective',data:{dimension:'1'}});
      window.R=api.createObjectAsset('variety',{name:'R',type:'projective',data:{dimension:'1'}});
      window.X=api.createObjectAsset('variety',{name:'X',type:'product',data:{first:k(L),second:k(R)}});
      window.Omega=api.createObjectAsset('sheaf',{name:'C',type:'cotangent',data:{base:k(P)}});
      window.S=api.createObjectAsset('sheaf',{name:'S',type:'schur',data:{parent:k(Omega),partition:'1,1'}});
      window.D=api.createObjectAsset('sheaf',{name:'D',type:'divisor-line',data:{base:k(X)}});
      window.E=api.createObjectAsset('sheaf',{name:'E',type:'locally-free',data:{base:k(P),rank:'2'}});
      window.B=api.createObjectAsset('sheaf',{name:'B',type:'tensor',data:{first:k(E),second:k(E)}});
      window.panel=MathWorkspaceObjectPanels.open('sheaf-input',k(S),'main');
      window.native=ref=>{
        panel.computation.refs.asset=k(ref);MathWorkspaceObjectPanels.refresh();
        const editor=panel.propertyRenderer.editor,graph=editor.objectIO('input-graph');
        return {editor,graph,payload:graph.entries.find(e=>e.assetKey===k(ref)).data.workspaceSheafComplex.payload};
      };
      window.cohom=ref=>{
        api.bindAssetPropertySlot('sheaf-cohomology',ref,{focus:false,promote:false});
        const editor=api.assetsCardState.slots.get('sheaf-cohomology').rendererSession.editor;
        const model=MathWorkspaceNativeEditors.decodeState(editor.capture().model),result=(model.state||model).lastResult.cohomology;
        return {dimensions:result.dimensions?.map(d=>d.plain)||null,message:result.message};
      };
      window.classCoefficients=(ref,degree)=>{
        api.bindAssetPropertySlot('characteristic-classes',ref,{focus:false,promote:false});
        const editor=api.assetsCardState.slots.get('characteristic-classes').rendererSession.editor;
        const model=MathWorkspaceNativeEditors.decodeState(editor.capture().model),result=(model.state||model).lastResult;
        if(result.classComputationLimited)throw Error('Characteristic-class computation must complete');
        return [...result.bundle.chComps[degree].terms.values()].map(v=>String(v.num)+'/'+String(v.den)).sort();
      };
      window.select=ref=>api.assetRequest('select-for-modify',{ref});
      window.choose=(field,ref)=>{document.querySelector('[data-assets-reference="'+field+'"]').click();[...document.querySelectorAll('.workspace-reference-option')].find(n=>n.dataset.assetKey===k(ref)).click();};
    });
    const mode=process.argv[2];
    const save=()=>read(()=>document.querySelector('[data-assets-editor]').requestSubmit());
    const set=async(field,value)=>read(({field,value})=>{const input=document.querySelector('[data-assets-field="'+field+'"]');input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));},{field,value});
    const replaceCoefficient=async(index,text)=>{
      await read(index=>{const input=document.querySelectorAll('[data-assets-divisor-class]')[index];input.focus();input.select();},index);
      if(text)await client.send('Input.insertText',{text});else for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    };
    const blur=async()=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9});};
    if(!mode||mode==='--schur-only'){
      assert.deepEqual(await read(()=>cohom(S).dimensions),['0','0','1','0'],'EXT-001: unmarked Schur (1,1) of cotangent must identify differential forms');
      assert.deepEqual(await read(()=>classCoefficients(S,1)),['-8/1']);
      assert.deepEqual(await read(()=>classCoefficients(S,2)),['10/1']);
      assert.deepEqual(await read(()=>classCoefficients(S,3)),['-22/3'],'exterior character recurrence agrees with the known Omega_P3^2 character');
      await read(()=>{
        window.P2=api.createObjectAsset('variety',{name:'A',type:'projective',data:{dimension:'2'}});
        window.C2=api.createObjectAsset('sheaf',{name:'C_2',type:'cotangent',data:{base:k(P2)}});
        window.T2=api.createObjectAsset('sheaf',{name:'T_2',type:'tangent',data:{base:k(P2)}});
        window.K3=api.createObjectAsset('variety',{name:'K',type:'complete-intersection',data:{dimension:'2',ambientDimension:'3',degrees:'4'}});
        window.CK=api.createObjectAsset('sheaf',{name:'C_K',type:'cotangent',data:{base:k(K3)}});
      });
      for(const [parent,partition,expected] of [['C2','2',['0','0','0']],['C2','2,2',['0','0','10']],['C2','1,1,1',['0','0','0']],['T2','2',['27','0','0']],['T2','2,1',['35','0','0']],['CK','1,1',['1','0','1']]]){
        const actual=await read(({parent,partition})=>{const ref=api.createObjectAsset('sheaf',{type:'schur',data:{parent:k(window[parent]),partition}});return cohom(ref).dimensions;},{parent,partition});
        assert.deepEqual(actual,expected,'structural Schur '+parent+' '+partition);
      }
      assert.equal(await read(()=>{const ref=api.createObjectAsset('sheaf',{type:'schur',data:{parent:k(CK),partition:'2'}});return cohom(ref).dimensions;}),null,'unknown complete-intersection Schur cohomology is not guessed');
      const high=await read(()=>{
        const base=api.createObjectAsset('variety',{name:'Z',type:'projective',data:{dimension:'14'}}),parent=api.createObjectAsset('sheaf',{type:'cotangent',data:{base:k(base)}});
        const ref=api.createObjectAsset('sheaf',{type:'schur',data:{parent:k(parent),partition:Array(13).fill(1).join(',')}});
        return {dimensions:cohom(ref).dimensions,character:classCoefficients(ref,1)};
      });
      const highDimensions=Array(15).fill('0');highDimensions[13]='1';
      assert.deepEqual(high.dimensions,highDimensions,'long exterior columns use the same structural Schur recognition');
      assert.deepEqual(high.character,['-195/1'],'Newton character of wedge^13 Omega_P14 has c1=-195H');
      console.log('PASS structural Schur recognition, Bott dimensions and high exterior character');
      await read(()=>{select(Omega);});
      assert.equal(await read(()=>!!document.querySelector('[data-assets-field="differentialWedge"]')),true,'exterior-power shortcut must be editable');
      await read(()=>document.querySelector('[data-assets-field="differentialWedge"]').click());
      for(const [degree,expected] of [['2',['0','0','1','0']],['0',['1','0','0','0']],['3',['0','0','0','1']],['1',['0','1','0','0']]]){
        await set('wedgeDegree',degree);await save();
        assert.deepEqual(await read(()=>cohom(Omega).dimensions),expected,'cotangent shortcut degree '+degree);
        assert.equal(await read(()=>get(Omega).data.wedgeDegree),degree);
      }
      await read(()=>document.querySelector('[data-assets-field="differentialWedge"]').click());await save();
      assert.equal(await read(()=>native(Omega).payload.rank),'3','disabling the shortcut restores ordinary cotangent rank');
      await read(()=>{window.TP=api.createObjectAsset('sheaf',{name:'TP',type:'tangent',data:{base:k(P)}});select(TP);});
      await read(()=>document.querySelector('[data-assets-field="differentialWedge"]').click());await set('wedgeDegree','3');await save();
      assert.deepEqual(await read(()=>cohom(TP).dimensions),['35','0','0','0'],'top tangent wedge is anticanonical');
    }
    if(!mode||mode==='--divisor-only'){
      await read(()=>{select(D);});
      assert.equal(await read(()=>document.querySelectorAll('[data-assets-divisor-class]').length),2,'DIV-001: product divisor basis must expose both factors');
      await replaceCoefficient(0,'2');await replaceCoefficient(1,'3');await blur();await save();
      assert.deepEqual(await read(()=>Object.values(get(D).data.divisorCoefficients)),['2','3']);
      assert.deepEqual(await read(()=>native(D).payload.divisorCoefficients),await read(()=>get(D).data.divisorCoefficients),'actual native construction uses both edited coefficients');
      assert.deepEqual(await read(()=>classCoefficients(D,1)),['2/1','3/1']);
      assert.ok((await read(()=>classCoefficients(D,2))).includes('6/1'),'ch_2 includes the cross coefficient 2*3');
      await replaceCoefficient(0,'');await read(()=>{window.coefficientNode=document.querySelector('[data-assets-divisor-class]');});
      await read(()=>new Promise(resolve=>setTimeout(resolve,650)));
      assert.equal(await read(()=>coefficientNode.value),'');
      assert.equal(await read(()=>Object.values(get(D).data.divisorCoefficients)[0]),'2');
      await client.send('Input.insertText',{text:'1'});await client.send('Input.insertText',{text:'2'});
      await read(()=>new Promise(resolve=>setTimeout(resolve,650)));
      assert.deepEqual(await read(()=>[document.activeElement===coefficientNode,document.querySelector('[data-assets-divisor-class]')===coefficientNode,coefficientNode.value,coefficientNode.selectionStart]),[true,true,'12',2]);
      await read(()=>{coefficientNode.focus();coefficientNode.select();coefficientNode.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));});
      await client.send('Input.insertText',{text:'-1'});await read(()=>new Promise(resolve=>setTimeout(resolve,650)));
      assert.equal(await read(()=>Object.values(get(D).data.divisorCoefficients)[0]),'12','IME composition cannot publish early');
      await read(()=>{coefficientNode.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'-1'}));coefficientNode.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'-1'}));});
      await read(()=>new Promise(resolve=>setTimeout(resolve,650)));await client.send('Input.insertText',{text:'/'});
      await read(()=>new Promise(resolve=>setTimeout(resolve,650)));
      assert.equal(await read(()=>Object.values(get(D).data.divisorCoefficients)[0]),'-1');
      await client.send('Input.insertText',{text:'2'});await blur();await save();
      assert.equal(await read(()=>Object.values(get(D).data.divisorCoefficients)[0]),'-1/2');
      await replaceCoefficient(0,'1/0');await save();
      assert.equal(await read(()=>Object.values(get(D).data.divisorCoefficients)[0]),'-1/2');
      await replaceCoefficient(0,'2');await blur();await save();
      await read(()=>choose('base',P));
      assert.equal(await read(()=>get(D).data.base),await read(()=>k(X)),'unmapped nonzero divisor classes keep the previous valid model');
      assert.equal(await read(()=>document.querySelectorAll('[data-assets-divisor-class]').length),3,'unavailable legacy classes remain visible for repair');
      await replaceCoefficient(0,'2');await replaceCoefficient(1,'0');await replaceCoefficient(2,'0');await blur();await save();
      assert.equal(await read(()=>get(D).data.base),await read(()=>k(P)));
      assert.deepEqual(await read(()=>get(D).data.divisorCoefficients),{hyperplane:'2'});
      console.log('PASS actual divisor classes, characteristic coefficients and raw editing');
    }
    if(!mode||mode==='--ops-only'){
      await read(()=>{select(B);});
      assert.equal(await read(()=>!!document.querySelector('[data-assets-field="exact"]')),true,'OPS-001: expose ordinary/derived selection');
      for(const value of ['true','false','true']){
        await set('exact',value);await save();await save();
        assert.equal(await read(()=>native(B).payload.construction.derived),value!=='true');
        assert.equal(await read(()=>get(B).data.exact),value==='true');
      }
      await read(()=>{
        window.Hom=api.createObjectAsset('sheaf',{name:'H',type:'internal-hom',data:{first:k(E),second:k(E)}});select(Hom);
      });await set('exact','true');await save();
      assert.equal(await read(()=>native(Hom).payload.construction.exact),true);
      await read(()=>{
        window.i=api.createObjectAsset('map',{name:'i',data:{domain:k(L),codomain:k(P)}});
        window.EL=api.createObjectAsset('sheaf',{name:'EL',type:'locally-free',data:{base:k(L),rank:'2'}});
        window.op=api.createObjectAsset('sheaf',{name:'F',type:'map-operation',data:{map:k(i),parent:k(E),operation:'pullback'}});select(op);
      });await set('exact','true');await save();
      assert.equal(await read(()=>native(op).payload.construction.derived),false);
      await set('operation','pushforward');
      await read(()=>{document.querySelector('[data-assets-field="proper"]').click();choose('parent',EL);});await save();
      assert.deepEqual(await read(()=>[get(op).data.proper,native(op).payload.construction.proper,native(op).payload.construction.derived]),[false,false,false]);
      await read(()=>document.querySelector('[data-assets-field="proper"]').click());await save();
      assert.equal(await read(()=>native(op).payload.construction.proper),true);
      console.log('PASS ordinary/derived modes and proper pushforward');
    }
    if(!mode){
      await read(()=>{
        api.assetRequest('prepare-create',{kind:'sheaf'});const type=document.querySelector('[data-assets-subtype]');type.value='cotangent';type.dispatchEvent(new Event('change',{bubbles:true}));
        document.querySelector('[data-assets-field="differentialWedge"]').click();choose('base',P);window.newWedge=api.activeAssetInputInstance().targetRef;
      });await set('wedgeDegree','2');await save();
      assert.deepEqual(await read(()=>cohom(newWedge).dimensions),['0','0','1','0'],'unbound Create form preserves exterior-power choices');
      await read(()=>{
        api.assetRequest('prepare-create',{kind:'sheaf'});const type=document.querySelector('[data-assets-subtype]');type.value='divisor-line';type.dispatchEvent(new Event('change',{bubbles:true}));choose('base',X);window.newDivisor=api.activeAssetInputInstance().targetRef;
      });await replaceCoefficient(0,'2');await replaceCoefficient(1,'3');await blur();await save();
      assert.deepEqual(await read(()=>Object.values(get(newDivisor).data.divisorCoefficients)),['2','3']);
      const backup=await read(()=>MathWorkspaceObjectPanels.exportText('workspace'));
      const expected=await read(()=>api.localAssetSnapshot().assets.map(a=>({id:a.id,type:a.type,data:a.data})));
      const cohomRefs=await read(()=>[S,newWedge].map(ref=>({kind:ref.kind,id:ref.id})));
      const divisorRef=await read(()=>({kind:newDivisor.kind,id:newDivisor.id}));
      await client.send('Page.reload');await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels),20000);
      await read(text=>{MathWorkspaceObjectPanels.importText('workspace',text);},backup);
      assert.deepEqual(await read(()=>MathWorkspaceAssetsTest.localAssetSnapshot().assets.map(a=>({id:a.id,type:a.type,data:a.data}))),expected,'all new options and coefficients survive cross-page restore');
      for(const ref of cohomRefs){
        const actual=await read(ref=>{
          const api=MathWorkspaceAssetsTest;api.bindAssetPropertySlot('sheaf-cohomology',ref,{focus:false,promote:false});
          const editor=api.assetsCardState.slots.get('sheaf-cohomology').rendererSession.editor,model=MathWorkspaceNativeEditors.decodeState(editor.capture().model);
          return (model.state||model).lastResult.cohomology.dimensions.map(d=>d.plain);
        },ref);
        assert.deepEqual(actual,['0','0','1','0'],'actual Schur and shortcut computations agree after restore');
      }
      await read(ref=>{MathWorkspaceAssetsTest.assetRequest('select-for-modify',{ref});MathWorkspaceAssetsTest.openCanvas('assets');document.querySelector('[data-assets-editor]').scrollIntoView({block:'center'});},divisorRef);
      await client.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
      await read(async()=>{await new Promise(requestAnimationFrame);document.querySelector('[data-assets-editor]').scrollIntoView({block:'center'});});
      await read(()=>new Promise(resolve=>setTimeout(resolve,200)));
      assert.doesNotMatch(await read(()=>document.querySelector('#workspace-status').textContent),/Asset property command owner/,'restoring and resizing the inspector must not submit unrelated owners');
      const guard=await read(({source,other})=>{
        const api=MathWorkspaceAssetsTest,before=api.localAssetSnapshot();let message='';
        try{api.commitAssetPropertyCommand({sourceRef:source,revision:before.revision,reason:'homology',changes:[{ref:other,propertiesPatch:{set:{homology:{unexpected:true}},unset:[]}}]});}catch(error){message=error.message;}
        return {message,unchanged:JSON.stringify(api.localAssetSnapshot())===JSON.stringify(before)};
      },{source:divisorRef,other:cohomRefs[0]});
      assert.match(guard.message,/outside the source dependency graph/,'the controller must still reject an explicitly unauthorized property owner');
      assert.equal(guard.unchanged,true);
      assert.equal(await read(()=>[...document.querySelectorAll('[data-assets-divisor-class]')].every(n=>n.scrollWidth<=n.clientWidth+1)),true,'coefficient controls fit the narrow inspector');
      const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
      const shot=await client.send('Page.captureScreenshot',{format:'png'}),file=path.join(os.tmpdir(),'math-workspace-divisor-options.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));console.log('Screenshot: '+file);
    }
    console.log('PASS Schur recognition, exterior-power shortcut, divisor coefficients and operation options');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
