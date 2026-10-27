// Adapt the standalone chart's renderer and operations to workspace-owned Assets.
export const diagramDisplayPanel=String.raw`
__editor.extendAssetAdapter(previous=>{
  let enabled=false,sources=new Map(),lastAssets=[],members=[],presentation={},signature='',save=null,note=null,layout=null;
  const copy=value=>JSON.parse(JSON.stringify(value)),prefix='workspace-diagram-';
  const projectedId=a=>prefix+a.kind+'-'+a.id;
  const isPreview=entry=>!entry.id.startsWith(prefix);
  const originalRender=renderComplexChartList,originalEdit=editComplexChartEntry,originalDelete=deleteSelectedComplexChartEntries,originalAdd=addSelectedComplexChartOperationCandidates,originalUpsert=upsertComplexChartEntries,originalImport=importComplexChartFromText;
  upsertComplexChartEntries=function(entries){return originalUpsert(enabled?entries.map(entry=>entry.id?.startsWith(prefix)?{...entry,id:'preview-'+entry.id}:entry):entries);};
  importComplexChartFromText=function(text){const result=originalImport(text);if(enabled){project();__editor.notifyChange({interaction:'object-preview'});}return result;};
  function decorate(){
    if(!enabled)return;
    const heading=refs.complexChartSaved.querySelector('.sheaf-step-saved-rule-title');if(heading)heading.hidden=true;
    const selectionLabel=refs.complexChartSaved.querySelector('.sheaf-step-select-all-row span');if(selectionLabel)selectionLabel.textContent='Select all';
    for(const button of refs.complexChartSaved.querySelectorAll('[data-complex-chart-edit]')){
      const source=sources.get(button.dataset.complexChartEdit),row=button.closest('.sheaf-complex-saved-row');
      if(source){row.dataset.diagramAsset=source.kind+':'+source.id;const label=row.querySelector('.sheaf-step-saved-rule-kind');label.textContent=source.name+' · '+source.kind;label.title='Index '+source.data.startDegree+' · '+source.data.direction+' · '+source.data.condition+' (not verified)';button.textContent='Modify';button.title='Edit the shared Asset';
        const formula=row.querySelector('.sheaf-step-saved-rule-formula'),entry=ensureComplexChartState().entries.find(e=>e.id===button.dataset.complexChartEdit);
        formula.innerHTML=complexChartEntryDisplayHtml(entry,{clickableObjects:true,clickableMaps:source.kind==='complex',entryId:entry.id});
        for(const control of formula.querySelectorAll('button')){control.title='Edit this term or its linked Asset';control.setAttribute('aria-label',control.title);}
        typeset(formula);
      }
      else row.dataset.diagramPreview='';
    }
    refs.complexChartDelete.textContent='Remove from display';refs.complexChartDelete.title='Remove selected references or previews; keep Assets';
    refs.complexChartAdd.textContent='New preview';
    save.hidden=!ensureComplexChartState().entries.some(isPreview);
    save.disabled=!ensureComplexChartState().entries.some(e=>isPreview(e)&&e.selected!==false);
  }
  renderComplexChartList=function(){const result=originalRender();decorate();return result;};
  editComplexChartEntry=function(id){const source=enabled&&sources.get(id);if(source){options.onEditDiagramAsset?.(source.kind+':'+source.id);return;}return originalEdit(id);};
  deleteSelectedComplexChartEntries=function(){
    if(!enabled)return originalDelete();
    const chart=ensureComplexChartState(),selected=chart.entries.filter(e=>e.selected!==false),keys=selected.map(e=>sources.get(e.id)).filter(Boolean).map(a=>a.kind+':'+a.id);
    chart.entries=chart.entries.filter(e=>e.selected===false);chart.operations=defaultComplexChartOperationsState();
    if(keys.length)options.onRemoveDiagramAssets?.(keys);renderComplexChartList();__editor.notifyChange({interaction:'object-preview'});
  };
  addSelectedComplexChartOperationCandidates=function(){
    if(!enabled)return originalAdd();
    const chart=ensureComplexChartState(),before=new Set(chart.entries.map(e=>e.id));
    const target=sources.get(chart.operations?.targetId);
    const provenance={operation:chart.operations?.mode||'operation',inputs:(target?[target]:[]).map(a=>({kind:a.kind,id:a.id,name:a.name,data:copy(a.data)})),...(target?{}:{previewInput:copy(chart.entries.find(e=>e.id===chart.operations?.targetId)||null)})};
    const result=originalAdd();for(const entry of chart.entries)if(!before.has(entry.id))entry.workspaceProvenance=provenance;
    renderComplexChartList();__editor.notifyChange({interaction:'object-preview'});return result;
  };
  function project(){
    const chart=ensureComplexChartState(),old=new Map(chart.entries.map(e=>[e.id,e])),entries=[],warnings=[];sources=new Map();
    for(const key of members){
      const asset=lastAssets.find(a=>a.kind+':'+a.id===key);if(!asset)continue;
      const raw=window.MathWorkspaceStructures.complexEntry(asset,lastAssets,presentation),id=projectedId(asset);
      if([...raw.objects,...raw.maps,...(raw.quotients||[])].some(text=>String(text).trim().replace(/\s+/g,' ')!==sanitizeComplexChartLatex(text))){warnings.push(asset.name+': unsupported formula notation; edit its symbols in Modify.');continue;}
      sources.set(id,asset);entries.push({...normalizeComplexChartEntry({...raw,id}),selected:old.get(id)?.selected!==false});
    }
    chart.entries=[...entries,...chart.entries.filter(isPreview)];
    note.textContent=warnings.join(' ')||'New results remain previews until saved to Assets. Diagram conditions are not verified.';
    renderComplexChartList();
  }
  return {...previous,
    panel(config){
      if(config.operation!=='complex-diagrams')return previous.panel?.(config);
      enabled=true;
      const body=refs.complexChartCard.querySelector('.card-body');
      refs.complexChartSaved.addEventListener('click',event=>{
        const control=event.target.closest('[data-complex-chart-object-entry],[data-complex-chart-map-entry]');if(!control)return;
        const map=control.hasAttribute('data-complex-chart-map-entry'),source=sources.get(map?control.dataset.complexChartMapEntry:control.dataset.complexChartObjectEntry);if(!source)return;
        let index=Number(map?control.dataset.complexChartMapIndex:control.dataset.complexChartObjectIndex);
        if(source.kind==='filtration'&&source.data.direction==='decreasing')index=source.data.objects.length-1-index;
        options.onEditDiagramTerm?.(source.kind+':'+source.id,map?'maps':'objects',index);
      });
      save=document.createElement('button');save.type='button';save.className='btn';save.dataset.saveComplexResults='';save.textContent='Save selected previews to Assets';
      save.addEventListener('click',()=>{
        const chart=ensureComplexChartState(),entries=chart.entries.filter(e=>isPreview(e)&&e.selected!==false),ids=new Set(entries.map(e=>e.id));
        if(!entries.length)return;
        try{options.onCollectComplexAssets?.(copy(entries));chart.entries=chart.entries.filter(e=>!ids.has(e.id));project();__editor.notifyChange({interaction:'object-preview'});}catch(error){options.onError?.(error);}
      });
      const label=document.createElement('label');label.textContent='Layout ';layout=document.createElement('select');layout.setAttribute('aria-label','Complex display layout');layout.append(new Option('Inline','inline'),new Option('Snake','snake'));label.append(layout);
      layout.addEventListener('change',()=>{presentation={display:layout.value==='snake'?'snake-les':''};project();__editor.notifyChange({interaction:'object-preview'});});
      note=document.createElement('p');note.className='hint';
      const actions=body.querySelector('.sheaf-complex-toolbar');
      label.className='workspace-diagram-layout';note.className='hint workspace-diagram-note';
      body.classList.add('workspace-diagram-content');
      const surface=__editor.mountObjectSurfaces({content:[body,note],toolbar:[...actions.children,label,save]});
      actions.remove();surface.shell.classList.add('workspace-diagram-surface');surface.content.style.overflow='auto';
      const style=document.createElement('style');style.textContent="\n        .workspace-diagram-surface{font-size:.85rem;line-height:1.4;container-type:inline-size}\n        .workspace-diagram-surface>.workspace-native-toolbar{justify-content:flex-start;gap:6px 8px;padding:6px 8px}\n        .workspace-diagram-surface .btn{font-size:.75rem;line-height:1.4;padding:4px 8px;border-radius:4px}\n        .workspace-diagram-layout{display:inline-flex;align-items:center;gap:6px;margin-left:auto;color:var(--muted);font-size:.75rem}\n        .workspace-diagram-layout select{font:inherit;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:3px 6px;min-height:26px}\n        .workspace-diagram-content{padding:4px 8px;min-width:0}\n        .workspace-diagram-surface .sheaf-complex-saved-row{gap:8px;padding:8px 0;font-size:.85rem;border-bottom:1px solid var(--border)}\n        .workspace-diagram-surface .sheaf-step-saved-rule-kind{font-size:.75rem;max-width:12em;overflow:hidden;text-overflow:ellipsis}\n        .workspace-diagram-surface .sheaf-step-saved-rule-formula{font-size:1rem;overflow-x:auto;text-overflow:clip;padding:4px 0}\n        .workspace-diagram-surface .sheaf-step-saved-rule-formula mjx-container{overflow:visible;max-width:none!important}\n        .workspace-diagram-surface .sheaf-complex-saved-row[data-diagram-preview]{border-left:2px solid var(--accent);padding-left:8px}\n        .workspace-diagram-note{margin:8px;padding:0;color:var(--muted);font-size:.75rem;line-height:1.4}\n        @container(max-width:480px){\n          .workspace-diagram-surface .sheaf-complex-saved-row{grid-template-columns:auto minmax(0,1fr) auto}\n          .workspace-diagram-surface .sheaf-complex-saved-row>input{grid-column:1;grid-row:1}\n          .workspace-diagram-surface .sheaf-step-saved-rule-kind{grid-column:2;grid-row:1;max-width:100%}\n          .workspace-diagram-surface [data-complex-chart-edit]{grid-column:3;grid-row:1}\n          .workspace-diagram-surface .sheaf-step-saved-rule-formula{grid-column:1/-1;grid-row:2;text-align:left}\n        }\n      ";document.head.append(style);
      decorate();
    },
    apply(snapshot,ref,properties,binding){
      if(!enabled)return previous.apply?.(snapshot,ref,properties,binding);
      lastAssets=snapshot.assets;members=(binding.references.nodes||[]).slice();
      const next=JSON.stringify([members,lastAssets.map(a=>[a.kind,a.id,a.name,a.data])]);
      if(signature&&next!==signature)ensureComplexChartState().operations=defaultComplexChartOperationsState();signature=next;project();return true;
    },
    capture(){return enabled?{presentation:copy(presentation)}:previous.capture?.();},
    result(){return enabled?{hasResult:true,text:refs.complexChartSaved.textContent}:previous.result?.();},
    io(action,value){
      if(!enabled)return previous.io?.(action,value);
      if(action==='presentation'){if(value){presentation=copy(value);layout.value=presentation.display==='snake-les'?'snake':'inline';project();}return copy(presentation);}
      if(action==='complex-entries')return copy(ensureComplexChartState().entries);
      return previous.io?.(action,value);
    }
  };
});
`;
