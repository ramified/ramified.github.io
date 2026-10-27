// Keep legacy full calculators intact; activate these adapters only for asset panels.
export const complexStructurePanel=String.raw`
document.addEventListener('DOMContentLoaded',()=>{
  if(!options.onCollectComplexAssets||options.workspaceObjectPanel)return;
  const save=document.createElement('button');save.type='button';save.className='btn btn-ghost';save.textContent='Save selected complexes / filtrations to Assets';save.dataset.saveComplexAssets='';
  save.addEventListener('click',()=>options.onCollectComplexAssets());refs.complexChartExport?.parentElement?.append(save);
});
__editor.extendAssetAdapter(previous=>{
  let enabled=false,display=null,current=null,operations=false,signature='',operationBody=null;
  return {...previous,
    panel(config){
      if(!['complex-view','complex-operations','filtration-view','filtration-operations'].includes(config.operation))return previous.panel?.(config);
      operations=config.operation.endsWith('-operations');
      enabled=true;display=document.createElement('div');display.className='workspace-complex-display';
      if(operations){
        const save=document.createElement('button');save.type='button';save.className='btn';save.textContent='Save operation results to Assets';save.dataset.saveComplexResults='';
        save.addEventListener('click',()=>options.onCollectComplexAssets?.(ensureComplexChartState().entries.filter(entry=>entry.selected!==false&&entry.id!==current?.id)));
        operationBody=refs.complexChartCard.querySelector('.card-body');display.hidden=true;
        __editor.mountObjectSurfaces({content:[display,operationBody],toolbar:[save]}).content.style.overflow='auto';
      }else __editor.mountObjectSurfaces({content:[display]}).content.style.overflow='auto';
    },
    apply(snapshot,ref,properties,binding){
      if(!enabled)return previous.apply?.(snapshot,ref,properties,binding);
      current=snapshot.assets.find(a=>a.kind===ref?.kind&&a.id===ref?.id);if(!current)return false;
      const raw=window.MathWorkspaceStructures.complexEntry(current,snapshot.assets),entry=normalizeComplexChartEntry(raw);
      const unsupported=[...raw.objects,...raw.maps,...(raw.quotients||[])].some(text=>String(text).trim().replace(/\s+/g,' ')!==sanitizeComplexChartLatex(text));
      if(operations){
        operationBody.hidden=unsupported;display.hidden=!unsupported;
        if(unsupported){display.textContent='These labels are outside the legacy operation engine’s supported notation. Definitions are preserved; edit their symbols before running operations.';ensureComplexChartState().entries=[];signature='';return true;}
        const next=JSON.stringify(entry);if(next!==signature){ensureComplexChartState().entries=[entry];signature=next;renderComplexChartList();}return true;
      }
      display.innerHTML=complexChartEntryDisplayHtml(entry);
      if(unsupported){
        display.textContent=raw.objects.map((text,index)=>text+(raw.kind==='filtration'&&index<raw.quotients.length?' ⊂ ['+raw.quotients[index]+'] ':index<raw.maps.length?' —'+raw.maps[index]+'→ ':'')).join('');
        const warning=document.createElement('p');warning.textContent='Plain-text preview: some labels are outside the legacy formula renderer’s supported notation.';display.append(warning);
      }
      const note=document.createElement('p');note.textContent=(current.kind==='filtration'?'Filtration index ':'Degrees ')+current.data.startDegree+' ('+current.data.direction+'). '+(current.data.condition==='declared'?'Condition declared by user; not verified.':'Symbolic diagram; condition not verified.');display.append(note);typeset(display);return true;
    },
    capture(){return enabled?{}:previous.capture?.();},
    result(){return enabled?{text:operations?refs.complexChartSaved?.textContent||'':display?.textContent||'',hasResult:true}:previous.result?.();},
    io(action,value){if(action==='complex-entries')return JSON.parse(JSON.stringify(ensureComplexChartState().entries));return previous.io?.(action,value);}
  };
});
`;
export const extensionStructurePanel=String.raw`
const __extensionLookup=lookupLmfdbSelector;
lookupLmfdbSelector=function(role){if(options.workspaceObjectPanel&&role==='extension')return Promise.resolve(null);return __extensionLookup(role);};
__editor.extendAssetAdapter(previous=>{
  let enabled=false,signature='',compute=null,current=null,error='',epoch=0;
  const originalCompute=computeGenericExtension;
  computeGenericExtension=async function(){
    if(!enabled)return originalCompute();
    if(error||state.generic.loading)return;
    const token=++epoch;state.generic.loading=true;compute.disabled=true;
    try{
      if(state.baseKind==='lmfdb'){
        const loaded=await __extensionLookup('base');
        if(token!==epoch)return;
        if(!loaded)throw new Error(state.baseLmfdbStatus||'Could not load the selected base field.');
      }
      state.generic.status='Computing E/F in this browser...';render();
      const response=await runLocalEngine(localEngineRequest());
      if(token!==epoch)return;
      state.source='generic';state.generic.response=response;
      state.generic.status=response.places.some(place=>place.status==='unresolved')?'Computed locally; unresolved places are explicitly marked.':'Computed locally with place certificates.';
      state.generic.statusKind='ok';__editor.notifyChange({interaction:'object-compute'});
    }catch(failure){if(token===epoch){state.generic.status=failure.message;state.generic.statusKind='error';}}
    finally{if(token===epoch){state.generic.loading=false;compute.disabled=!!error;render();}}
  };
  return {...previous,
    panel(config){
      if(!config.operation.startsWith('field-extension-'))return previous.panel?.(config);
      enabled=true;
      compute=document.createElement('button');compute.type='button';compute.className='btn';compute.textContent='Compute ramification';compute.dataset.extensionCompute='';
      compute.addEventListener('click',()=>computeGenericExtension());
      const controls=document.createElement('div');Object.assign(controls.style,{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'8px'});controls.append(compute,$('show-infinite').closest('label'));
      const status=$('generic-status');status.style.flexBasis='100%';status.setAttribute('role','status');
      $('extra-prime-input').setAttribute('aria-label','Additional prime or function-field place');
      const places=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Places';places.append(summary,$('extra-prime-input').parentElement,$('place-chip-list'));
      const outputs={'field-extension-invariants':$('field-invariants'),'field-extension-decomposition':$('decomposition-table'),'field-extension-selected':$('selected-place-data')};
      const surface=__editor.mountObjectSurfaces({content:[outputs[config.operation]||document.querySelector('.ramification-stage')],toolbar:[document.querySelector('.canvas-toolbar'),controls,places,status]});
      if(outputs[config.operation])surface.content.style.overflow='auto';
    },
    apply(snapshot,ref,properties,binding){
      if(!enabled)return previous.apply?.(snapshot,ref,properties,binding);
      current=snapshot.assets.find(a=>a.kind===ref?.kind&&a.id===ref?.id);if(!current)return false;
      const next=JSON.stringify(snapshot.assets);if(next===signature)return true;
      epoch++;cancelLocalComputation('Extension definition changed.');state.generic.loading=false;state.generic.response=null;state.source='generic';state.extensionKind='polynomial';error='';
      try{
        const input=window.MathWorkspaceStructures.extensionInput(current,snapshot.assets);
        state.baseKind=input.baseKind;state.generic.baseKind=input.baseKind;state.generic.generator=input.generator;state.generic.polynomial=input.polynomial;state.generic.q=input.q||'3';$('generic-q').value=state.generic.q;
        state.baseLmfdbField=null;state.baseLmfdbQuery=input.baseQuery||'';$('base-lmfdb-query').value=state.baseLmfdbQuery;
        $('generic-generator').value=input.generator;$('generic-polynomial').value=input.polynomial;
        state.generic.status='Definition ready. Compute ramification to obtain certified or explicitly unresolved results.';
      }catch(failure){error=failure.message;state.generic.status=error;}
      compute.disabled=!!error;signature=next;render();return true;
    },
    capture(){return enabled?{primeBound:state.primeBound,functionDegreeBound:state.functionDegreeBound,includeInfinite:state.showInfinite}:previous.capture?.();},
    result(){return enabled?{text:error||state.generic.status,hasResult:!!state.generic.response}:previous.result?.();},
    io(action,value){if(action==='extension-export')return window.SiteImportExportPageAdapter.exportDefault().text;return previous.io?.(action,value);}
  };
});
`;
