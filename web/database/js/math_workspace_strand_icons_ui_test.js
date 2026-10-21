'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){
  const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');const {client}=session,errors=[];
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await client.send('Runtime.enable');client.socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!document.querySelector('#workspace-design-lab')),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;window.key=a=>a.kind+':'+a.id;
      window.lie=api.createObjectAsset('lie',{data:{family:'A',rank:2}});
      window.word=[{family:'braid',index:1,sign:1},{family:'braid',index:2,sign:-1}];
      window.exact=api.createObjectAsset('strands',{data:{lie:key(lie),generators:word}});
      window.large=api.createObjectAsset('strands',{data:{lie:key(lie),generators:[...word,...word,...word]}});
      window.lie3=api.createObjectAsset('lie',{data:{family:'A',rank:3}});
      const row={family:'braid',index:1,sign:1},other={family:'braid',index:3,sign:-1};
      window.packed=api.createObjectAsset('strands',{data:{lie:key(lie3),generators:Array.from({length:4},()=>[row,other]).flat()}});
      window.tall=api.createObjectAsset('strands',{data:{lie:key(lie3),generators:Array.from({length:5},()=>[row,other]).flat()}});
      window.empty=api.createObjectAsset('young',{data:{rows:[]}});
      window.families=['coxeter','kl','tl'].map(family=>api.createObjectAsset('strands',{data:{lie:key(lie),generators:[{family,index:1}]}}));
      window.icon=asset=>document.querySelector('[data-asset-key="'+key(asset)+'"] .workspace-asset-icon');
      window.ink=canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let count=0;const colors=new Set();for(let i=0;i<pixels.length;i+=4){if(pixels[i+3])count++;if(pixels[i+3]===255)colors.add([pixels[i],pixels[i+1],pixels[i+2]].join(','));}return{count,colors:[...colors]};};
      window.beforeData=JSON.stringify(api.localAssetSnapshot().assets);
    });
    for(const layout of ['icons','list','details','tiles','content']){
      await read(layout=>{api.state.layout=layout;api.applyAssetSnapshot(api.localAssetSnapshot());},layout);
      assert.equal(await read(()=>icon(empty).dataset.iconSource),'generic');
      assert.deepEqual(await read(()=>[...icon(empty).querySelectorAll('rect')].map(rect=>[Number(rect.getAttribute('x')),Number(rect.getAttribute('y'))])),[[0,0],[1,0],[2,0],[0,1]],layout+' uses the (3,1) fallback');
      assert.equal(await read(()=>icon(large).dataset.iconSource),'generic');
      assert.equal(await read(()=>icon(packed).dataset.iconSource),'diagram',layout+' shows eight generators in four rows exactly');
      assert.equal(await read(()=>icon(tall).dataset.iconSource),'generic',layout+' uses the fallback for five rows');
      const exactInk=await read(()=>ink(icon(exact).querySelector('canvas'))),genericInk=await read(()=>ink(icon(large).querySelector('canvas')));
      assert.equal(exactInk.colors.length,1);assert.equal(genericInk.colors.length,1);assert.notDeepEqual(exactInk.colors,genericInk.colors,'exact and generic colors differ');
      assert.deepEqual(genericInk.colors,['168,81,11'],'committed generic ink is #a8510b');
      const base=exactInk.colors[0].split(',').map(Number);
      for(const colors of await read(()=>families.map(asset=>ink(icon(asset).querySelector('canvas')).colors)))assert(colors.length&&colors.every(color=>color.split(',').map(Number).every((channel,i)=>Math.abs(channel-base[i])<=2)),'KL/TL glyphs use the same ink, allowing raster rounding at overlapping edges');
      assert(await read(()=>{const a=icon(exact).querySelector('canvas').getContext('2d').getImageData(0,0,256,256).data,b=icon(large).querySelector('canvas').getContext('2d').getImageData(0,0,256,256).data;for(let i=3;i<a.length;i+=4)if(a[i]!==b[i])return false;return true;}),'fallback depicts the exact representative word');
    }
    await read(()=>{api.state.layout='icons';api.applyAssetSnapshot(api.localAssetSnapshot());window.normalInk=ink(icon(exact).querySelector('canvas')).count;window.genericInk=ink(icon(large).querySelector('canvas')).count;MathWorkspaceAssetIcons.configure({...MathWorkspaceAssetIcons.settings(),strandStroke:20});api.applyAssetSnapshot(api.localAssetSnapshot());});
    assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().strandStroke),20);
    assert(await read(()=>ink(icon(exact).querySelector('canvas')).count>normalInk&&ink(icon(large).querySelector('canvas')).count>genericInk),'stroke control updates both exact and generic icons live');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeData),'icon settings never change Assets');
    assert.equal(await read(()=>panels.exportText('workspace').includes('strandStroke')),false,'temporary settings are omitted from backups');
    const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-strand-icons.png'),Buffer.from(shot.data,'base64'));
    await read(()=>{MathWorkspaceAssetIcons.configure();api.applyAssetSnapshot(api.localAssetSnapshot());});
    assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().strandStroke),19);
    assert.equal(await read(()=>ink(icon(exact).querySelector('canvas')).count),await read(()=>normalInk));
    assert.equal(await read(()=>document.querySelectorAll('[data-design-setting]').length),0,'finished icon controls are retired');
    const alignment=await read(async()=>{
      const defaults=MathWorkspaceAssetIcons.settings(),results=[];
      try {
        for(const font of ['"Times New Roman", serif','Georgia, serif','monospace','Arial, sans-serif'])for(const rows of [1,2,4]) {
          MathWorkspaceAssetIcons.configure({...defaults,matrixFontFamily:font});
          const svg=MathWorkspaceAssetIcons.render({kind:'matrix',data:{rows,cols:2}}).querySelector('svg');
          svg.setAttribute('width',512);svg.setAttribute('height',512);svg.querySelector('path').setAttribute('stroke','blue');
          svg.querySelectorAll('text').forEach(text=>{text.setAttribute('fill','red');text.setAttribute('stroke','red');});
          const image=new Image();image.src='data:image/svg+xml,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));await image.decode();
          const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d');context.drawImage(image,0,0);
          const pixels=context.getImageData(0,0,512,512).data,stars=[],brackets=[];
          for(let y=0;y<512;y++)for(let x=0;x<512;x++) {const i=(y*512+x)*4;if(pixels[i+3]<128)continue;if(pixels[i]>pixels[i+2]+100)stars.push(y);if(pixels[i+2]>pixels[i]+100)brackets.push(y);}
          const center=values=>(Math.min(...values)+Math.max(...values))/2,box=svg.viewBox.baseVal,scale=Math.min(512/box.width,512/box.height);
          results.push({font,rows,offset:(center(stars)-center(brackets))/scale});
        }
      } finally {MathWorkspaceAssetIcons.configure(defaults);}
      return results;
    });
    for(const result of alignment)assert(Math.abs(result.offset)<0.7,'asterisk ink is centered inside parentheses: '+JSON.stringify(result));
    const matrixShot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-matrix-design-lab.png'),Buffer.from(matrixShot.data,'base64'));
    // Creation uses the same representatives and refreshes cached tiles after a lab change.
    await read(()=>{document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();window.pickerInk=ink(document.querySelector('[data-create-kind="strands"] canvas')).count;});
    assert.equal(await read(()=>document.querySelector('[data-create-kind="young"] svg').querySelectorAll('rect').length),4);
    assert(await read(()=>{const r=document.querySelector('[data-create-kind="strands"] canvas').getBoundingClientRect();return Math.abs(r.width-r.height)<1;}),'picker thumbnails stay square');
    await read(()=>{document.querySelector('#workspace-create-dialog').close();MathWorkspaceAssetIcons.configure({...MathWorkspaceAssetIcons.settings(),strandStroke:20});document.querySelector('[data-assets-content]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:100,clientY:150}));[...document.querySelectorAll('#workspace-assets-context-menu button')].find(button=>button.textContent==='New…').click();});
    assert(await read(()=>ink(document.querySelector('[data-create-kind="strands"] canvas')).count>pickerInk),'cached creation icons pick up lab changes');
    await read(()=>{document.querySelector('#workspace-create-dialog').close();MathWorkspaceAssetIcons.configure();document.querySelector('[data-design-exit]').click();});
    assert.equal(await read(()=>MathWorkspaceAssetIcons.settings().strandStroke),19);assert.equal(await read(()=>new URL(location.href).searchParams.has('designLab')),false);
    assert.deepEqual(errors,[]);
    console.log('PASS Representative Young/braid icons, all five layouts, retired lab controls, matrix glyph alignment, clean backups and shared creation previews');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
