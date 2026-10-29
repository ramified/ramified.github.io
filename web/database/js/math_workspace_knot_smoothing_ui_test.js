'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {startServer,launchBrowser,stopBrowser,waitFor,evaluate}=require('./math_workspace_drag_regression_test.js');
async function run(){const server=await startServer();let session;
  try{
    session=await launchBrowser('http://127.0.0.1:'+server.address().port+'/math_workspace.html?designLab=1');const {client}=session;
    const read=(fn,...args)=>evaluate(client,'('+fn.toString()+')(...'+JSON.stringify(args)+')');
    await waitFor(()=>read(()=>!!window.MathWorkspaceObjectPanels&&!!document.querySelector('[data-knot-smoothing-choice]')),20000);
    await read(()=>{
      window.api=MathWorkspaceAssetsTest;window.panels=MathWorkspaceObjectPanels;
      window.knot=api.createObjectAsset('knot',{data:MathWorkspaceTopology.presets.knot[1].data});
      window.view=panels.open('knot-view',knot.kind+':'+knot.id,'main');
      window.beforeSmoothing=JSON.stringify(api.localAssetSnapshot().assets);
      const picker=document.querySelector('[data-design-picker]');picker.value='knot-smoothing';picker.dispatchEvent(new Event('change'));
    });
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotStyle),'cubic');
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotGapSize),'24');
    assert.equal(await read(()=>document.querySelectorAll('[data-knot-smoothing-card]').length),4);
    // Sample the actual SVG curves and count geometric intersections, including
    // self intersections of a strand. PD data alone cannot catch rendering bugs.
    const results=await read(()=>{
      const results=[];
      const cross=(a,b)=>a.x*b.y-a.y*b.x,sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
      for(const preset of MathWorkspaceTopology.presets.knot){
        for(const style of ['quadratic','cubic','circular']){
          const svg=MathWorkspaceKnotDrawing.render(preset.data,style,{gapSize:0});document.body.append(svg);
          const paths=[...svg.querySelectorAll('[data-knot-strand]')],segments=[];
          paths.forEach((p,route)=>{
            const length=p.getTotalLength(),count=1200;
            const points=Array.from({length:count},(_,i)=>p.getPointAtLength(((i+.371)/count*length)%length));
            points.forEach((point,i)=>segments.push({a:point,b:points[(i+1)%count],route,index:i,count}));
          });
          let intersections=0;
          for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
            const a=segments[i],b=segments[j];
            if(a.route===b.route&&(Math.abs(a.index-b.index)<=1||Math.abs(a.index-b.index)===a.count-1))continue;
            if(Math.max(a.a.x,a.b.x)<Math.min(b.a.x,b.b.x)||Math.max(b.a.x,b.b.x)<Math.min(a.a.x,a.b.x)||Math.max(a.a.y,a.b.y)<Math.min(b.a.y,b.b.y)||Math.max(b.a.y,b.b.y)<Math.min(a.a.y,a.b.y))continue;
            const u=sub(a.b,a.a),v=sub(b.b,b.a),w=sub(b.a,a.a),den=cross(u,v);if(Math.abs(den)<1e-10)continue;
            const t=cross(w,v)/den,s=cross(w,u)/den;if(t>1e-7&&t<1-1e-7&&s>1e-7&&s<1-1e-7)intersections++;
          }
          results.push({label:preset.label,style,intersections,expected:preset.data.pd.length,components:paths.length+svg.querySelectorAll('ellipse').length,expectedComponents:MathWorkspaceTopology.knotInfo(preset.data).componentCount,overpasses:svg.querySelectorAll('[data-knot-crossing]').length,finite:![...svg.querySelectorAll('path')].some(p=>/NaN|Infinity/.test(p.getAttribute('d')))});
          svg.remove();
        }
      }
      return results;
    });
    for(const result of results){assert.equal(result.intersections,result.expected,JSON.stringify(result));assert.equal(result.overpasses,result.expected,JSON.stringify(result));assert.equal(result.components,result.expectedComponents,JSON.stringify(result));assert(result.finite,JSON.stringify(result));}
    // Rasterize the real SVG at the largest gap and inspect the upper strand
    // from the crossing through the former overlay endpoints, on both sides.
    // A crossing-count test cannot detect the old floating-patch rendering bug.
    const continuity=await read(async()=>{
      const failures=[];
      for(const preset of MathWorkspaceTopology.presets.knot.filter(p=>p.data.pd.length)){
        const svg=MathWorkspaceKnotDrawing.render(preset.data,'cubic',{gapSize:24});svg.setAttribute('width','640');svg.setAttribute('height','400');
        const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'})),image=new Image();image.src=url;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;const context=canvas.getContext('2d');context.drawImage(image,0,0);URL.revokeObjectURL(url);
        const pixels=context.getImageData(0,0,640,400).data,ink=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=Math.round(x)+dx,yy=Math.round(y)+dy;if(xx<0||xx>=640||yy<0||yy>=400)continue;const i=(yy*640+xx)*4;if(pixels[i+3]>100&&pixels[i]<90&&pixels[i+1]>70&&pixels[i+2]>70)return true;}return false;};
        const geometry=MathWorkspaceKnotDrawing.layout(preset.data);
        for(const group of geometry.groups)for(const crossing of group.crossings){
          const center=group.points.get(group.centers.get(crossing));
          for(const port of [4*crossing+1,4*crossing+3]){
            const point=group.points.get(port),length=Math.hypot(point.x-center.x,point.y-center.y)*.5;
            for(let t=0;t<=length;t+=.5){const ratio=length?t/length*.5:0;if(!ink(center.x+(point.x-center.x)*ratio,center.y+(point.y-center.y)*ratio)){failures.push({preset:preset.label,crossing,port,t});break;}}
          }
        }
      }
      return failures;
    });
    assert.deepEqual(continuity,[],'upper strands remain visibly continuous at all preset crossings');
    for(const style of ['quadratic','cubic','circular']){
      await read(style=>document.querySelector('[data-knot-smoothing-choice="'+style+'"]').click(),style);
      assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotStyle),style,'real display updates without modifying asset');
    }
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeSmoothing));
    await read(()=>document.querySelector('[data-knot-gap-control]').focus());
    const key=async(key,code,virtual)=>{for(const type of ['keyDown','keyUp'])await client.send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:virtual});};
    await key('Home','Home',36);
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotGapSize),'0');
    assert(await read(()=>[...view.renderArea.querySelectorAll('[data-underpass-gap]')].every(node=>Number(node.dataset.underpassGap)===0)),'zero closes underpass gaps');
    await key('End','End',35);
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotGapSize),'24');
    for(let i=0;i<5;i++)await key('ArrowLeft','ArrowLeft',37);
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotGapSize),'19','keyboard changes the real display immediately');
    assert(await read(()=>[...document.querySelectorAll('[data-knot-smoothing-card] [data-knot-drawing]')].every(svg=>svg.dataset.knotGapSize==='19')),'all comparison examples share the chosen gap');
    await read(()=>{
      const select=document.querySelector('[data-knot-smoothing-example]');select.value=String([...select.options].findIndex(o=>o.textContent.includes('Figure-eight')));select.dispatchEvent(new Event('change'));
      document.querySelector('#workspace-design-lab button[aria-label="Move to main area"]').click();
    });
    const shot=await client.send('Page.captureScreenshot',{format:'png'});const filename=path.join(os.tmpdir(),'math-workspace-knot-smoothing.png');fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));console.log('Screenshot: '+filename);
    await read(()=>document.querySelector('[data-knot-smoothing-card="cubic"]').scrollIntoView({block:'center'}));
    const lower=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(os.tmpdir(),'math-workspace-knot-smoothing-lower.png'),Buffer.from(lower.data,'base64'));
    await read(()=>document.querySelector('[data-design-reset="knot-smoothing"]').click());
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotStyle),'cubic');
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotGapSize),'24');
    await read(()=>{
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedKnotSettings=JSON.parse(text);}}});
      document.querySelector('[data-knot-smoothing-choice="circular"]').click();document.querySelector('[data-design-copy="knot-smoothing"]').click();
    });
    await waitFor(()=>read(()=>!!window.copiedKnotSettings));
    assert.deepEqual(await read(()=>copiedKnotSettings),{knotDrawing:{smoothing:'circular',gapSize:24}});
    await read(()=>document.querySelector('[data-design-exit]').click());
    assert.equal(await read(()=>MathWorkspaceKnotDrawing.style()),'cubic');
    assert.equal(await read(()=>view.renderArea.querySelector('[data-knot-drawing]').dataset.knotStyle),'cubic');
    assert.equal(await read(()=>JSON.stringify(api.localAssetSnapshot().assets)),await read(()=>beforeSmoothing));
    await read(()=>{const backup=panels.exportText('workspace');panels.importText('workspace',backup);});
    assert.equal(await read(()=>[...panels.panels.values()].find(p=>p.definition.id==='knot-view').renderArea.querySelector('[data-knot-drawing]').dataset.knotStyle),'cubic');
    console.log('PASS cubic default, continuous upper strands, adjustable underpass gaps, topology, live previews, reset/exit and backup');
  }finally{if(session){session.client.close();await stopBrowser(session.browser,session.profile);}await new Promise(resolve=>server.close(resolve));}
}
if(require.main===module)run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
