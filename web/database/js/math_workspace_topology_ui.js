(function(root){
  'use strict';
  const model=root.MathWorkspaceTopology,keyOf=a=>a?a.kind+':'+a.id:'';
  const el=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
  const button=(text,action)=>{const b=el('button',text,'btn btn-ghost');b.type='button';b.addEventListener('click',action);return b;};
  const field=(text,input)=>{const label=el('label','','workspace-field');label.append(el('span',text,'input-label'),input);return label;};
  function mountInput(host,{read,assets,update,feedback,open,generatePreset}){
    const source=el('select','','workspace-control'),preset=el('select','','workspace-control'),code=el('textarea','','workspace-control workspace-code-control'),hint=el('p','','workspace-card-context');
    source.setAttribute('aria-label','Mosaic Diagram source');source.dataset.topologySource='';preset.setAttribute('aria-label','Topology preset');preset.dataset.topologyPreset='';
    code.rows=9;code.spellcheck=false;code.setAttribute('aria-label','Independent topology definition');code.dataset.topologyDefinition='';
    let dirty=false,lastKey='',lastSource='',baseline='';
    const text=asset=>JSON.stringify(model.definition(asset.kind,asset.data),null,2);
    const save=data=>{try{update(data);dirty=false;refresh(true);feedback('');}catch(error){feedback(error.message,true);}};
    const apply=button('Apply definition',()=>{try{const a=read();if(!a||a.data.source)return;save(model.normalize(a.kind,JSON.parse(code.value)));}catch(error){feedback(error.message,true);}});apply.dataset.topologyApply='';
    const reset=button('Reset draft',()=>{dirty=false;refresh(true);feedback('');});reset.dataset.topologyReset='';
    const detach=button('Make independent',()=>{const a=read();if(a)try{save(model.detach(a,assets()));}catch(error){feedback(error.message,true);}});detach.dataset.topologyDetach='';
    const edit=button('Edit source',()=>{const a=assets().find(a=>keyOf(a)===read()?.data.source);if(a)open('mosaic-diagram-input',keyOf(a),'side');});
    source.addEventListener('change',()=>{const a=read();if(!a)return;try{if(source.value){const next=model.resolve({...a,data:{...a.data,source:source.value}},assets());save(next);}else if(a.data.source)save(model.detach(a,assets()));}catch(error){source.value=a.data.source;feedback(error.message,true);}});
    const parameters=el('div','','workspace-topology-preset-parameters workspace-object-reference'),genus=el('select','','workspace-control'),markings=el('select','','workspace-control');
    genus.setAttribute('aria-label','Preset genus g');markings.setAttribute('aria-label','Preset markings n');genus.dataset.topologyPresetG='';markings.dataset.topologyPresetN='';
    for(let i=0;i<=12;i++)genus.append(new Option(String(i),String(i)));for(let i=0;i<=6;i++)markings.append(new Option(String(i),String(i)));genus.value='2';markings.value='5';
    parameters.append(field('g',genus),field('n',markings));parameters.hidden=true;
    const load=button('Load preset',()=>loadPreset());load.dataset.topologyLoadPreset='';
    function loadPreset(){const a=read(),choice=preset.value!==''&&model.presets[a?.kind]?.[Number(preset.value)];if(!a||a.data.source||!choice)return;
      try{const data=choice.generator==='moduli'?model.moduliPreset(Number(genus.value),Number(markings.value)):choice.generator?generatePreset(choice.generator):model.normalize(a.kind,choice.data);save(data);}catch(error){feedback(error.message,true);}
    }
    preset.addEventListener('change',()=>{const a=read(),choice=preset.value!==''&&model.presets[a?.kind]?.[Number(preset.value)];parameters.hidden=choice?.generator!=='moduli';load.disabled=!choice||!!a?.data.source;if(choice&&!choice.generator){loadPreset();preset.value='';load.disabled=true;}});
    root.CalculatorInputSettings.listenEditable(code,'input',()=>{dirty=true;},{commitHandled:true});
    const actions=el('div','','workspace-object-reference');actions.append(load,apply,reset,detach,edit);
    host.append(field('Source',source),hint,field('Preset',preset),parameters,field('Definition',code),actions);
    function refresh(force=false){
      const a=read();if(!a)return;
      const key=keyOf(a),linked=!!a.data.source,changedTarget=key!==lastKey||a.data.source!==lastSource;
      const signature=JSON.stringify(assets().filter(a=>a.kind==='mosaic-diagram').map(a=>[keyOf(a),a.name]));
      if(source.dataset.signature!==signature){source.replaceChildren(new Option('Independent',''),...assets().filter(a=>a.kind==='mosaic-diagram').map(a=>new Option(a.plainName||a.name,keyOf(a))));source.dataset.signature=signature;}
      if(linked&&![...source.options].some(o=>o.value===a.data.source))source.append(new Option('Missing source · '+a.data.source,a.data.source));source.value=a.data.source;
      if(preset.dataset.kind!==a.kind){preset.replaceChildren(new Option('Choose a preset…',''),...model.presets[a.kind].map((p,i)=>new Option(p.label,String(i))));preset.dataset.kind=a.kind;}
      if(force||changedTarget)dirty=false;
      const value=text(a);
      if(!dirty||force||changedTarget){root.CalculatorInputSettings.syncEditableValue(code,value,{force:force||changedTarget});baseline=value;}
      code.readOnly=linked;apply.disabled=reset.disabled=preset.disabled=genus.disabled=markings.disabled=linked;load.disabled=linked||preset.value==='';detach.hidden=edit.hidden=!linked;edit.disabled=!assets().some(item=>keyOf(item)===a.data.source);
      parameters.hidden=preset.value===''||model.presets[a.kind][Number(preset.value)]?.generator!=='moduli';
      const errors=model.issues(a,assets());detach.disabled=!a.data.hasSnapshot&&errors.length>0;detach.textContent=errors.length?'Use last valid result as independent':'Make independent';
      source.options[0].textContent=linked&&errors.length?'Independent (use last valid result)':'Independent';
      hint.textContent=linked?'Follows the Mosaic Diagram. Make independent to edit this object.':a.kind==='knot'?'PD lists four arc labels in cyclic order per crossing; positions 1 and 3 pass under. Each label occurs twice. circles counts crossing-free components.':'genera lists vertex weights; legs lists their half-edges; edges pairs internal half-edges. Unpaired half-edges are marked legs.';
      if(errors.length)feedback(errors.join(' '),true);else if(dirty&&baseline!==value)feedback('The saved object changed. Your draft is preserved; Apply definition replaces it, or Reset draft loads the saved version.');
      lastKey=key;lastSource=a.data.source;
    }
    return {refresh,restoreDraft(){dirty=code.value!==text(read());}};
  }
  function row(host,label,value){const line=el('div','','stat-row');line.append(el('span',label,'stat-label'),el('span',String(value),'stat-value'));host.append(line);}
  function knotDrawing(data,style){return root.MathWorkspaceKnotDrawing.render(data,style);}
  const identityCache=new Map();
  function identify(data,info){const signature=JSON.stringify([data.pd,data.circles]);if(!identityCache.has(signature)){if(identityCache.size>32)identityCache.clear();identityCache.set(signature,root.MosaicKnotEngine.identifyPlanar(data.pd,info.components,data.circles));}return identityCache.get(signature);}
  function render(host,asset,operation,context){
    host.replaceChildren();const d=asset.data;
    if(asset.kind==='knot'){
      const info=model.knotInfo(d);if(operation==='knot-view'){if(context)return root.MathWorkspaceKnotEditing.render(host,asset,context);host.append(knotDrawing(d));return {text:info.componentCount+' components · '+info.crossingCount+' crossings',hasResult:true};}
      const result=identify(d,info);row(host,'Components',info.componentCount);row(host,'Crossings in this diagram',info.crossingCount);row(host,'Identification',result.name||'Not identified');row(host,'Status',result.status||'Code generated');
      const codes=el('textarea','','workspace-control workspace-code-control');codes.readOnly=true;codes.rows=6;codes.setAttribute('aria-label','Knot codes');codes.value=(d.pd.length?result.pd:'PD[]')+'\nCrossing-free circles: '+d.circles+(result.dt?'\n'+result.dt:'')+(Array.isArray(result.braid)?'\nBraid: '+result.braid.join(', '):'');host.append(codes);
      if(result.candidates?.length){const list=el('p');list.append(el('span','Candidates: '));result.candidates.forEach((c,i)=>{if(i)list.append(document.createTextNode(', '));const link=el('a',c.label||c.name);if(/^https:\/\//.test(c.href||'')){link.href=c.href;link.target='_blank';link.rel='noopener';}list.append(link);});host.append(list);}
      return {text:host.textContent+'\n'+codes.value,hasResult:true};
    }
    const info=model.graphInfo(d);for(const [key,label]of Object.entries({vertices:'Vertices',edges:'Internal edges',markings:'Marked legs',components:'Components',betti:'First Betti number',genus:'Total genus',stable:'Stable',dimension:'Stack stratum dimension'}))row(host,label,typeof info[key]==='boolean'?(info[key]?'yes':'no'):info[key]);
    return {text:host.textContent,hasResult:true};
  }
  root.MathWorkspaceTopologyUI={mountInput,render,knotDrawing};
})(window);
