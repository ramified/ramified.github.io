(function(root){
  'use strict';
  // Chinese option labels belong only to the Design Lab; workspace UI is English.
  const records=new Map(),hoverOptions=[['ring','A · 细圆环'],['halo','B · 柔和光晕'],['ticks','C · 四向短标记']];let hover='halo',hoverRevision=0;
  const clone=d=>JSON.parse(JSON.stringify(d)),key=a=>a.kind+':'+a.id,version=a=>JSON.stringify(a.data);
  const el=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
  const button=(label,action,data)=>{const b=el('button',label,'btn btn-ghost');b.type='button';if(data)b.dataset[data]='';b.addEventListener('click',action);return b;};
  function record(asset){
    const id=key(asset);if(!records.has(id))records.set(id,{preview:null,previewMeta:null,previewUndo:[],base:'',sync:!!asset.data.source,source:asset.data.source,undo:[],message:'',serial:0});
    const state=records.get(id);if(state.source!==asset.data.source){state.source=asset.data.source;state.sync=!!asset.data.source;state.serial++;}return state;
  }
  function decorate(svg,data,{onCrossing,highlight=hover,demonstrate=false}={}){
    svg.dataset.knotHover=highlight;
    const drawing=root.MathWorkspaceKnotDrawing,geometry=drawing.layout(data,svg.dataset.knotStyle!=='polyline'),ns='http://www.w3.org/2000/svg';
    const node=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const [name,value]of Object.entries(attrs))n.setAttribute(name,String(value));return n;};
    const centers=geometry.groups.flatMap(group=>[...group.centers.values()].map(id=>group.points.get(id)));let first=true;
    for(const group of geometry.groups)for(const c of group.crossings){
      const center=group.points.get(group.centers.get(c)),hit=svg.querySelector('[data-knot-crossing="'+c+'"]');
      hit.classList.add('workspace-knot-crossing');hit.dataset.knotCrossingHit=c;
      hit.setAttribute('role',onCrossing?'button':'img');hit.setAttribute('tabindex','0');hit.setAttribute('aria-label',onCrossing?'Switch over/under at crossing '+(c+1):'Crossing '+(c+1)+' highlight sample');
      const title=node('title',{});title.textContent=onCrossing?'Click to switch over/under (crossing '+(c+1)+')':'Crossing '+(c+1);hit.append(title);
      const marks=node('g',{'class':'workspace-knot-crossing-highlight','pointer-events':'none'});
      if(highlight==='ticks')for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]])marks.append(node('path',{d:'M'+(center.x+x*12)+','+(center.y+y*12)+' L'+(center.x+x*18)+','+(center.y+y*18)}));
      else marks.append(node('circle',{cx:center.x,cy:center.y,r:12}));
      const radius=Math.min(14,...centers.filter(p=>p!==center).map(p=>Math.hypot(p.x-center.x,p.y-center.y)*.42));
      hit.append(marks,node('circle',{cx:center.x,cy:center.y,r:radius,fill:'transparent','pointer-events':'all'}));
      if(demonstrate&&first){hit.dataset.hoverDemo='true';first=false;}
      if(onCrossing){hit.addEventListener('click',()=>onCrossing(c));hit.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onCrossing(c);}});}
    }
    return svg;
  }
  function render(host,asset,context){
    const state=record(asset),ops=root.MathWorkspaceKnotOperations,topology=root.MathWorkspaceTopology,drawing=root.MathWorkspaceKnotDrawing;
    const read=()=>context.read(),refresh=()=>{state.serial++;context.refresh();},current=()=>read(),data=state.preview||asset.data,outdated=!!state.preview&&state.base!==version(asset);
    const controls=el('div','','workspace-knot-edit-controls'),label=el('label','','workspace-check'),sync=el('input');sync.type='checkbox';sync.dataset.knotSyncMosaic='';sync.checked=!!asset.data.source&&state.sync;sync.disabled=!asset.data.source;
    sync.addEventListener('change',()=>{state.sync=sync.checked;refresh();});label.append(sync,document.createTextNode(' Sync edits to Mosaic'));controls.append(label);
    const status=el('p',outdated?'The source has changed. Your preview is preserved; discard it before editing again.':state.message||'Click a crossing to switch over/under, or focus it and press Enter or Space.','workspace-card-context');status.setAttribute('role','status');status.dataset.knotEditStatus='';
    function showError(error){state.message=error.message||String(error);refresh();}
    function commit(candidate,target){
      try{
        const a=current();if(!a)throw new Error('This object no longer exists.');
        if(candidate.base!==version(a))throw new Error('The source or object changed. This edit was not applied.');
        const ref=target?.ref||{kind:a.kind,id:a.id},before=clone(target?.before||a.data),after=clone(target?.data||candidate.data);
        const source=a.data.source&&context.assets().find(item=>key(item)===a.data.source);
        context.update(ref,{data:after});
        state.undo.push({ref,before,after,source:!target&&source?{ref:key(source),version:version(source)}:null});if(state.undo.length>20)state.undo.shift();
        state.preview=null;state.previewMeta=null;state.previewUndo=[];state.base='';state.message=target?'Edits synced to Mosaic.':'Edit applied.';refresh();
      }catch(error){showError(error);}
    }
    function preview(candidate){
      if(!state.preview)state.previewUndo=[];
      if(JSON.stringify(state.preview)!==JSON.stringify(candidate.data)){
        state.previewUndo.push({data:state.preview?clone(state.preview):null,meta:state.previewMeta,base:state.base,message:state.message});if(state.previewUndo.length>20)state.previewUndo.shift();
      }
      state.preview=clone(candidate.data);state.previewMeta={flips:candidate.flips,reason:candidate.reason};state.base=candidate.base;state.message=candidate.summary||'Unsaved preview.';refresh();
    }
    function ask(candidate,reason){
      const dialog=el('dialog','','workspace-knot-edit-dialog');dialog.dataset.knotDetachDialog='';
      const title=el('h3','Cannot sync this edit to Mosaic'),description=el('p',reason),actions=el('div','','workspace-design-actions');
      dialog.setAttribute('aria-labelledby','knot-detach-title');title.id='knot-detach-title';
      const close=()=>{dialog.close();dialog.remove();};
      actions.append(button('Make independent and apply',()=>{close();commit(candidate);},'knotDetachApply'),button('Preview only',()=>{close();preview({...candidate,reason});},'knotPreviewOnly'),button('Cancel',close,'knotCancelEdit'));
      dialog.append(title,description,el('p','Making this Knot / Link independent will stop following its Mosaic source and turn off synchronization.'),actions);
      dialog.addEventListener('cancel',()=>dialog.remove());document.body.append(dialog);dialog.showModal();actions.lastElementChild.focus();
    }
    function apply(candidate){
      const a=current();if(!a)return;
      if(candidate.base!==version(a)){showError(new Error('The source or object changed. This edit was not applied.'));return;}
      if(!a.data.source){commit(candidate);return;}
      if(state.sync&&candidate.flips){const result=ops.prepareMosaicFlips(a,context.assets(),candidate.flips);if(result.ok){commit(candidate,result);return;}ask(candidate,result.reason);}
      else ask(candidate,state.sync?(candidate.reason||'The preview no longer maps exactly to crossings in the original Mosaic.'):'Sync edits to Mosaic is turned off.');
    }
    function flip(index){
      if(outdated)return;
      try{
        const a=current(),flips=state.preview?(state.previewMeta?.flips?[...state.previewMeta.flips,index]:undefined):[index],candidate={data:ops.flip(state.preview||a.data,index),base:state.preview?state.base:version(a),flips,reason:state.previewMeta?.reason};
        if(state.preview){preview(candidate);return;}apply(candidate);
      }catch(error){showError(error);}
    }
    const undo=button('Undo',()=>{
      if(state.preview){const prior=state.previewUndo.pop();if(!prior)return;state.preview=prior.data;state.previewMeta=prior.meta;state.base=prior.base;state.message=prior.message||'Preview edit undone.';refresh();return;}
      const entry=state.undo.at(-1);if(!entry)return;
      try{
        const target=context.assets().find(a=>key(a)===key(entry.ref));if(!target||JSON.stringify(target.data)!==JSON.stringify(entry.after))throw new Error('The data changed elsewhere. This step cannot be undone.');
        if(entry.source){const source=context.assets().find(a=>key(a)===entry.source.ref);if(!source||version(source)!==entry.source.version)throw new Error('The Mosaic source changed. Its previous link cannot be restored.');}
        context.update(entry.ref,{data:entry.before});state.undo.pop();state.message='Last edit undone.';refresh();
      }catch(error){showError(error);}
    },'knotUndo');undo.disabled=state.preview?!state.previewUndo.length:!state.undo.length;controls.append(undo);
    const simplify=button('Try simplifying',()=>{
      try{
        const a=current(),before=state.preview||a.data,result=ops.simplify(before);
        if(!result.removed){state.message='No removable R1/R2 crossings found. This method does not guarantee a minimal diagram.';refresh();return;}
        preview({data:result.data,base:state.preview?state.base:version(a),reason:'Simplification changes the crossing count and cannot be mapped back to the original Mosaic tiles.',summary:'Simplification preview: '+before.pd.length+' → '+result.data.pd.length+' crossings ('+result.moves.join(', ')+'). Not saved.'});
      }catch(error){showError(error);}
    },'knotSimplify');simplify.disabled=!data.pd.length||outdated;controls.append(simplify);
    host.append(controls);
    if(state.preview){
      const banner=el('div','','workspace-knot-preview-banner');banner.dataset.knotPreview='';banner.append(el('strong','Unsaved preview'),button('Apply',()=>apply({data:clone(state.preview),base:state.base,...state.previewMeta}),'knotApplyPreview'),button('Discard',()=>{state.preview=null;state.previewMeta=null;state.previewUndo=[];state.base='';state.message='Preview discarded.';refresh();},'knotDiscardPreview'));
      banner.querySelector('[data-knot-apply-preview]').disabled=outdated;host.append(banner);
    }
    const svg=decorate(drawing.render(data),data,{onCrossing:outdated?undefined:flip});host.append(svg,status);
    const codes=el('details'),summary=el('summary',state.preview?'Preview PD code':'PD code'),code=el('pre',JSON.stringify(topology.definition('knot',data),null,2));codes.append(summary,code);host.append(codes);
    const info=topology.knotInfo(data);return {text:info.componentCount+' components · '+info.crossingCount+' crossings'+(state.preview?' · unsaved preview':''),hasResult:true};
  }
  root.MathWorkspaceKnotEditing={render,decorate,hoverOptions,hover:()=>hover,setHover(value){if(!hoverOptions.some(([id])=>id===value))throw new Error('Unknown crossing highlight.');hover=value;hoverRevision++;},signature(asset){const state=record(asset);return state.serial+':'+hoverRevision;},clear(){records.clear();document.querySelectorAll('[data-knot-detach-dialog]').forEach(dialog=>{dialog.close();dialog.remove();});}};
})(window);
