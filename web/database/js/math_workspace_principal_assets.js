(function(root){
  'use strict';
  function init({catalog,changed}){
    const labels=root.MathWorkspaceObjects.kindLabels,label=kind=>labels[kind]||kind;
    function choiceLabel(panel,kind){
      if(kind!=='variety')return label(kind);
      const inputs=panel.inputs.filter(input=>(input.kinds||[input.kind]).includes(kind));
      if(inputs.length&&inputs.every(input=>input.subtype==='toric'||input.subtypes?.variety?.length===1&&input.subtypes.variety[0]==='toric'))return 'Variety (toric only)';
      if(inputs.length&&inputs.every(input=>input.excludeTypes?.includes('toric')))return 'Variety (non-toric)';
      return 'Variety';
    }
    const panels=catalog.panels.filter(panel=>panel.role==='property').sort((a,b)=>a.label.localeCompare(b.label));
    const element=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
    root.MathWorkspaceDesignLab.register({id:'principal-assets',title:'Principal asset types',description:'Your confirmed assignments are active. Preview changes here; Wait panels keep their existing associations.',mount(host){
      const toggleRow=element('label','workspace-principal-toggle'),toggle=element('input');toggle.type='checkbox';toggle.dataset.principalEnabled='';toggleRow.append(toggle,element('span','','Preview filtering in asset menus'));
      const summary=element('p','workspace-card-context','Choose a type, None (omit this property), or Wait (decide later). Variety includes toric and other varieties; restrictions appear on individual choices. Display and Input/Modify panels are excluded.'),groups=element('div','workspace-principal-groups');
      const waitRow=element('label','workspace-principal-toggle'),waitOnly=element('input'),waitLabel=element('span');waitOnly.type='checkbox';waitOnly.dataset.principalWaitOnly='';waitRow.append(waitOnly,waitLabel);
      const previewRow=element('label','workspace-principal-control'),previewKind=element('select');previewKind.dataset.principalPreview='';previewKind.setAttribute('aria-label','Preview asset type');
      catalog.assets.forEach(asset=>previewKind.append(new Option(label(asset.kind),asset.kind)));previewRow.append(element('span','','Preview asset type'),previewKind);
      const preview=element('div','workspace-principal-preview');preview.setAttribute('aria-live','polite');host.append(toggleRow,summary,waitRow,previewRow,preview,groups);
      function filterWaiting(){
        const values=catalog.getPrincipals().types,count=Object.values(values).filter(value=>value==='wait').length;waitLabel.textContent='Review waiting only ('+count+')';
        groups.querySelectorAll('.workspace-principal-assignment').forEach(row=>{row.hidden=waitOnly.checked&&values[row.querySelector('select').dataset.principalPanel]!=='wait';});
        groups.querySelectorAll('.workspace-principal-group').forEach(group=>{const visible=[...group.querySelectorAll('.workspace-principal-assignment')].filter(row=>!row.hidden);group.hidden=waitOnly.checked&&!visible.length;if(waitOnly.checked&&visible.length)group.open=true;});
        pending.textContent=waitOnly.checked&&!count?'No panels are waiting.':'';
      }
      const pending=element('p','workspace-card-context');pending.dataset.principalWaitingStatus='';host.insertBefore(pending,groups);waitOnly.addEventListener('change',filterWaiting);
      function renderPreview(){
        const kinds=catalog.getPrincipals().types,items=panels.filter(panel=>kinds[panel.id]===previewKind.value);
        const title=element('strong','','Draft: '+label(previewKind.value)+' · '+items.length+' panels'),list=element('ul');
        items.forEach(panel=>list.append(element('li','',panel.label)));preview.replaceChildren(title,items.length?list:element('p','workspace-card-context','No panels assigned to this asset type.'));
      }
      function update(){const values=catalog.getPrincipals();toggle.checked=values.enabled;groups.querySelectorAll('[data-principal-panel]').forEach(select=>{select.value=values.types[select.dataset.principalPanel]||'';});renderPreview();filterWaiting();changed();}
      toggle.addEventListener('change',()=>{catalog.configurePrincipals({...catalog.getPrincipals(),enabled:toggle.checked});update();});previewKind.addEventListener('change',renderPreview);
      for(const multiple of [true,false]){
        const items=panels.filter(panel=>(catalog.principalCandidates(panel.id).length>1)===multiple),section=element('details','workspace-principal-group');section.open=multiple;
        section.append(element('summary','',(multiple?'Panels shared by asset types':'Single-type panels')+' ('+items.length+')'));
        const list=element('div','workspace-principal-list');section.append(list);groups.append(section);
        for(const panel of items){
          const row=element('label','workspace-principal-assignment'),text=element('span'),select=element('select');text.append(element('strong','',panel.label));
          const inputs=panel.inputs.map(input=>input.label).filter(Boolean);if(inputs.length)text.append(element('small','','Inputs: '+inputs.join(' · ')));
          if(panel.targetLabels){const variants=element('small');variants.dataset.principalVariants=panel.id;variants.textContent='Separate interfaces: '+Object.entries(panel.targetLabels).map(([kind,name])=>label(kind)+' — '+name).join('; ')+'. Organization remains on Wait.';text.append(variants);}
          select.dataset.principalPanel=panel.id;select.setAttribute('aria-label',panel.label+' principal asset type');select.append(new Option('Wait — decide later','wait'),new Option('None',''));
          catalog.principalCandidates(panel.id).forEach(kind=>select.append(new Option(choiceLabel(panel,kind),kind)));
          select.addEventListener('change',()=>{const values=catalog.getPrincipals();values.types[panel.id]=select.value||null;catalog.configurePrincipals(values);renderPreview();filterWaiting();changed();});
          row.append(text,select);list.append(row);
        }
      }
      update();return {reset(){catalog.configurePrincipals();waitOnly.checked=false;update();},settings:()=>catalog.getPrincipals()};
    }});
  }
  root.MathWorkspacePrincipalAssets={init};
})(window);
