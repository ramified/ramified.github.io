(function(root){
  'use strict';
  const subjects = [
    {id:'topology',label:'Topology and Mosaic',kinds:['mosaic-space','mosaic-diagram']},
    {id:'linear',label:'Linear algebra',kinds:['number','field','field-extension','matrix','point','vector','frame','lattice']},
    {id:'representation',label:'Representation theory',kinds:['young','lie','dynkin','strands','roots','weyl','fan']},
    {id:'categories',label:'Categories',kinds:['category','functor']},
    {id:'algebraic',label:'Algebraic geometry',kinds:['number','variety','sheaf','map','complex','filtration','fan']},
    {id:'geometry',label:'Geometry and coordinates',kinds:['frame','point','vector','polytope','sphere','roots','lattice','voronoi','formula','weyl','cone','fan','tropical']}
  ];
  const descriptions={filtration:'An indexed sequence of subobjects with symbolic or linked subquotients.',complex:'A graded sequence of symbolic or linked objects and differentials.','field-extension':'An extension with an explicit base field and defining polynomial.',number:'A symbolic or valued element of a shared coefficient ring; usable as genus or rank.','mosaic-space':'A tiled space with cuts and edge identifications.','mosaic-diagram':'A knot, link or graph on a Mosaic space.',young:'Ordinary or generalized rows of a Young diagram.',lie:'A Lie family and rank.',field:'A commutative ring with identity, including integer rings and fields.',matrix:'A matrix with an explicit coefficient ring.',category:'Objects and morphisms of a category.',functor:'A covariant or contravariant functor.',dynkin:'A Lie type with marked vertices and optional quiver directions.',strands:'An ordered word of crossings or generators.',variety:'A variety, including Grassmannian and toric models.',sheaf:'A sheaf or vector bundle on a variety.',map:'A map of varieties, sheaves, or other maps.',frame:'A position and coordinate basis.',point:'A coordinate point.',vector:'A vector in an ambient space.',polytope:'A regular polytope or simplex.',sphere:'A sphere in an ambient space.',roots:'A Lie root system.',lattice:'A lattice specified by a basis or another object.',voronoi:'A Voronoi cell of a lattice.',formula:'Equations or inequalities defining a set.',tropical:'A tropical polynomial.',weyl:'Weyl chambers of a root system.',cone:'A rational cone.',fan:'A collection of rational cones.'};
  const aliases={field:'ring field coefficient integer rational real complex algebra commutative',number:'scalar rational integer genus rank parameter',dynkin:'marked pointed decorated vertex quiver',young:'partition tableau symmetric exterior',lie:'lie algebra root system',strands:'braid coxeter temperley lieb kazhdan lusztig',matrix:'linear transformation coefficients',sheaf:'bundle coherent locally free',map:'morphism arrow',cone:'toric convex',fan:'toric',point:'coordinates',formula:'formula set equation inequality constraint implicit zero locus',weyl:'reflection chamber',voronoi:'dirichlet cell'};
  const displays = [
    {id:'complex',label:'Complexes',views:['complex-diagrams','complex-view','filtration-view']},
    {id:'extensions',label:'Field extensions',views:['field-extension-view']},
    {id:'geometry',label:'Geometry',views:['geometry-view']},
    {id:'mosaic',label:'Mosaic',views:['mosaic-view']},
    {id:'dynkin',label:'Dynkin diagrams',views:['lie-view','dynkin-view']},
    {id:'young',label:'Young diagrams',views:['young-view']},
    {id:'strands',label:'Strands',views:['strands-view']},
    {id:'matrix',label:'Matrices',views:['matrix-view']},
    {id:'number',label:'Numbers',views:['number-view']},
    {id:'field',label:'Rings',views:['field-view']},
    {id:'category',label:'Category diagrams',views:['category-diagram']},
    {id:'sheaf',label:'Variety & sheaf diagrams',views:['sheaf-view']},
    {id:'other',label:'Other displays',views:['asset-view']}
  ];
  function catalog(subtypes,labels={},capabilities=root.MathWorkspaceObjects?.capabilities||{}) {
    return Object.entries(subtypes).map(([kind,types])=>({kind,label:({variety:'Variety',sheaf:'Sheaf',map:'Map',dynkin:'Dynkin',young:'Young',point:'Point'}[kind])||labels[kind]||types[0][1],description:descriptions[kind]||'',display:displays.find(d=>d.views.includes(capabilities[kind]?.open))?.id||'other',subjects:subjects.filter(s=>s.kinds.includes(kind)).map(s=>s.id),search:[kind,labels[kind]||'',...types.map(t=>t[1]),aliases[kind]||'',descriptions[kind]||''].join(' ').toLowerCase()}));
  }
  function filter(entries,query='',subject='',display='') {
    const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return entries.filter(entry=>{
      const search=[entry.label,entry.search,displays.find(d=>d.id===entry.display)?.label,...subjects.filter(s=>entry.subjects.includes(s.id)).map(s=>s.label)].join(' ').toLowerCase();
      return (!subject||entry.subjects.includes(subject))&&(!display||entry.display===display)&&words.every(word=>search.includes(word));
    });
  }
  // Classification is catalog metadata. Preview changes never enter asset data or backups.
  function subjectAssignments(entries) {
    const defaults=Object.fromEntries(entries.map(entry=>[entry.kind,[...entry.subjects]])),listeners=new Set();
    const settings=()=>({version:1,subjectsByKind:Object.fromEntries(entries.map(entry=>[entry.kind,[...entry.subjects]]))});
    function set(kind,ids){
      const entry=entries.find(entry=>entry.kind===kind);
      if(!entry||!Array.isArray(ids)||ids.some(id=>!subjects.some(subject=>subject.id===id)))throw new Error('Unknown asset type or subject.');
      entry.subjects=subjects.filter(subject=>ids.includes(subject.id)).map(subject=>subject.id);listeners.forEach(listener=>listener());
    }
    function reset(){entries.forEach(entry=>{entry.subjects=[...defaults[entry.kind]];});listeners.forEach(listener=>listener());}
    return {settings,set,reset,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}};
  }
  function init({entries,create,dependencies=()=>[],capabilities,returnFocus}) {
    const assignments=subjectAssignments(entries);
    const preferenceKey='math-workspace-create-preferences-v1',known=new Set(entries.map(entry=>entry.kind));
    let preferences={favorites:[],recent:[],hiddenRows:[]};
    try{
      const saved=JSON.parse(root.localStorage.getItem(preferenceKey));
      if(saved&&typeof saved==='object')for(const key of Object.keys(preferences)){
        const allowed=key==='hiddenRows'?new Set(['favorites','recent']):known;
        preferences[key]=Array.isArray(saved[key])?[...new Set(saved[key].filter(id=>allowed.has(id)))]:[];
      }
      preferences.recent=preferences.recent.slice(0,6);
    }catch(_){} // Storage may be unavailable; the picker still works for this visit.
    const savePreferences=()=>{try{root.localStorage.setItem(preferenceKey,JSON.stringify(preferences));}catch(_){}};
    const shortcutVisibility=new Map();
    let dialog,search,list,count,filters,filterDetails,filterSummary,displaySelect,subjectSelect,opener,stayOpen,dependencyMode,addedStatus,statusTimer,lastCreatedFocus,subject='',display='',creating=false,busy=false,resultsSignature='';
    const element=(tag,text,className)=>Object.assign(document.createElement(tag),{textContent:text||'',className:className||''});
    function results(preserveCatalog=false,force=false){
      const items=filter(entries,search.value,subject,display);
      // Recent shortcuts refresh on the next visit/filter change; adding an
      // object in Stay open mode must keep its existing result button and focus.
      const signature=JSON.stringify([subject,display,preferences.favorites,preferences.hiddenRows,root.MathWorkspaceAssetIcons.settings(),items.map(item=>[item.kind,item.subjects,capabilities()?.[item.kind]===false])]);
      // The editable helper commits on blur. An unchanged filter must keep the
      // result button that ArrowDown just focused, rather than replacing it.
      if(signature===resultsSignature&&!force)return;
      resultsSignature=signature;
      if(preserveCatalog===true)list.querySelectorAll('[data-create-shortcuts]').forEach(section=>section.remove());
      else list.replaceChildren();
      displaySelect.value=display;subjectSelect.value=subject;
      [displaySelect,subjectSelect].forEach(select=>{select.title=select.selectedOptions[0].textContent;});count.textContent=items.length+' object types';
      shortcutVisibility.forEach((control,id)=>{control.checked=!preferences.hiddenRows.includes(id);});
      if(!items.length)list.append(element('p','No objects match. Clear filters or try another search.','workspace-card-context'));
      function updateFavorite(favorite,item){
        const selected=preferences.favorites.includes(item.kind);
        favorite.textContent=selected?'★':'☆';favorite.setAttribute('aria-pressed',String(selected));
        favorite.title=(selected?'Remove from favorites: ':'Add to favorites: ')+item.label;favorite.setAttribute('aria-label',favorite.title);
      }
      if(preserveCatalog===true)list.querySelectorAll('[data-create-favorite]').forEach(control=>updateFavorite(control,entries.find(item=>item.kind===control.dataset.createFavorite)));
      function choice(item,shortcut=false){
        const tile=element('div','','workspace-create-tile');
        const button=element('button','','workspace-create-result');button.type='button';button.dataset.createKind=item.kind;button.disabled=capabilities()?.[item.kind]===false;
        const description=item.description+' Display: '+displays.find(d=>d.id===item.display).label+'. Subjects: '+(item.subjects.map(id=>subjects.find(s=>s.id===id).label).join(', ')||'Unassigned')+'.';
        button.title=description;button.setAttribute('aria-description',description);
        const icon=root.MathWorkspaceAssetIcons.renderType(item.kind);icon.classList.add('workspace-create-icon');button.append(icon,element('strong',item.label));
        button.addEventListener('click',()=>activate(item,button));tile.append(button);
        if(!shortcut){
          const favorite=element('button','','workspace-create-favorite');favorite.type='button';favorite.dataset.createFavorite=item.kind;updateFavorite(favorite,item);
          favorite.addEventListener('click',()=>{
            const scroll=list.scrollTop;
            preferences.favorites=preferences.favorites.includes(item.kind)?preferences.favorites.filter(kind=>kind!==item.kind):[...preferences.favorites,item.kind];
            // Keep the clicked control and its native pointer/keyboard focus state.
            // Replacing it and forcing focus left unpinned stars emphasized.
            updateFavorite(favorite,item);savePreferences();results(true);list.scrollTop=scroll;
          });tile.append(favorite);
        }
        return tile;
      }
      for(const [id,label,kinds] of [['favorites','Favorites',preferences.favorites],['recent','Recent',preferences.recent.filter(kind=>!preferences.favorites.includes(kind))]]){
        if(preferences.hiddenRows.includes(id))continue;
        const shortcuts=kinds.map(kind=>items.find(item=>item.kind===kind)).filter(Boolean);
        if(!shortcuts.length)continue;
        const section=element('section','','workspace-create-shortcuts');section.dataset.createShortcuts=id;section.setAttribute('aria-label',label);
        const heading=element('div','','workspace-create-shortcut-heading'),hide=element('button','×','workspace-create-shortcut-hide'),row=element('div','','workspace-create-shortcut-row');
        hide.type='button';hide.dataset.createHideShortcuts=id;hide.setAttribute('aria-label','Close '+label+' row');hide.title='Close '+label+' row; show it again in Filters';
        hide.addEventListener('click',()=>{
          const keyboard=hide.matches(':focus-visible'),scroll=list.scrollTop;
          preferences.hiddenRows=[...preferences.hiddenRows,id];savePreferences();results(true);
          if(keyboard)filterSummary.focus({preventScroll:true});list.scrollTop=scroll;
        });
        shortcuts.forEach((item,index)=>{
          const tile=choice(item,true),remove=element('button','×','workspace-create-shortcut-remove');remove.type='button';remove.dataset.createRemoveShortcut=id;remove.dataset.createShortcutKind=item.kind;
          remove.title='Remove from '+label.toLowerCase()+': '+item.label;remove.setAttribute('aria-label',remove.title);
          remove.addEventListener('click',()=>{
            const keyboard=remove.matches(':focus-visible'),scroll=list.scrollTop;
            preferences[id]=preferences[id].filter(kind=>kind!==item.kind);savePreferences();results(true,true);
            if(keyboard){const buttons=[...list.querySelectorAll('[data-create-remove-shortcut="'+id+'"]')];(buttons[Math.min(index,buttons.length-1)]||filterSummary).focus({preventScroll:true});}list.scrollTop=scroll;
          });tile.append(remove);row.append(tile);
        });
        heading.append(element('h3',label),hide);section.append(heading,row);list.insertBefore(section,list.querySelector('[data-create-group]'));
      }
      if(preserveCatalog!==true)for(const group of displays){
        const members=items.filter(item=>item.display===group.id);if(!members.length)continue;
        const section=element('div','','workspace-create-group');section.dataset.createGroup=group.id;section.setAttribute('role','group');section.setAttribute('aria-label',group.label);
        members.forEach(item=>section.append(choice(item)));list.append(section);
      }
      root.MathWorkspaceAssetIcons.typeset(list);
    }
    function chooseDependencies(item,slots){
      return new Promise(resolve=>{
        const picker=element('dialog','','workspace-create-dialog'),heading=element('h2',item.label+' dependencies');
        picker.dataset.createDependencies='';heading.id='workspace-create-dependencies-title';picker.setAttribute('aria-labelledby',heading.id);
        const form=element('form'),fields=element('div'),actions=element('footer'),selects=[];
        form.method='dialog';
        for(const slot of slots){
          const label=element('label',slot.label+' ','workspace-control-label'),select=element('select','','workspace-control');
          select.dataset.createDependency=slot.field;
          slot.candidates.forEach((candidate,index)=>select.append(new Option(candidate.label+(index===0?' — Suggested':''),candidate.key)));
          select.append(new Option('Automatic supporting asset',''));
          label.append(select);const row=element('p');row.append(label);fields.append(row);selects.push([slot.field,select]);
        }
        const cancel=element('button','Cancel','btn btn-ghost'),confirm=element('button','Create object','btn');
        cancel.type='button';cancel.addEventListener('click',()=>picker.close());confirm.type='submit';confirm.dataset.createConfirm='';
        let result=null;
        form.addEventListener('submit',event=>{event.preventDefault();result={data:Object.fromEntries(selects.filter(([,select])=>select.value).map(([field,select])=>[field,select.value]))};picker.close();});
        picker.addEventListener('close',()=>{picker.remove();resolve(result);},{once:true});
        picker.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();picker.close();}});
        actions.append(cancel,confirm);form.append(fields,element('p','Automatic supporting asset: create or reuse a suitable supporting object.','workspace-dependency-help'),actions);picker.append(heading,element('p','Existing assets are preselected. Keep the suggestions or change a choice.','workspace-dependency-help'),form);document.body.append(picker);picker.showModal();selects[0][1].focus();
      });
    }
    function showStatus(message){
      clearTimeout(statusTimer);addedStatus.textContent=message;
      statusTimer=setTimeout(()=>{addedStatus.textContent='';},4000);
    }
    async function activate(item,button){
      if(busy||capabilities()?.[item.kind]===false)return;
      busy=true;const keepOpen=stayOpen.checked,scroll=list.scrollTop,pageX=window.scrollX,pageY=window.scrollY;
      try{
        const mode=dependencyMode.value,slots=mode==='automatic'?[]:dependencies(item.kind);
        const options=mode==='review'&&slots.length?await chooseDependencies(item,slots):{data:Object.fromEntries(slots.map(slot=>[slot.field,slot.candidates[0].key]))};
        if(options===null){button.focus({preventScroll:true});return;}
        if(!keepOpen){creating=true;dialog.close();}
        const focus=await create(item.kind,options);
        if(focus===null){showStatus('The object could not be added.');return;}
        preferences.recent=[item.kind,...preferences.recent.filter(kind=>kind!==item.kind)].slice(0,6);savePreferences();
        if(typeof focus==='function')lastCreatedFocus=focus;
        showStatus('Added '+item.label+'.');
      }catch(error){showStatus(error.message||'The object could not be added.');}
      finally{
        busy=false;
        if(keepOpen&&dialog.open){window.scrollTo(pageX,pageY);button.focus({preventScroll:true});list.scrollTop=scroll;}
      }
    }
    function build(){
      dialog=element('dialog','','workspace-create-dialog');dialog.id='workspace-create-dialog';dialog.setAttribute('aria-labelledby','workspace-create-title');
      const head=element('header'),title=element('h2','New mathematical object');title.id='workspace-create-title';const close=element('button','Close','btn btn-ghost');close.type='button';close.addEventListener('click',()=>dialog.close());head.append(title,close);
      search=element('input','','workspace-control');search.type='search';search.placeholder='Search objects, displays, or subjects';search.setAttribute('aria-label','Search mathematical objects');search.dataset.createSearch='';
      root.CalculatorInputSettings.listenEditable(search,'input',results);
      filters=element('div','','workspace-create-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Object filters');
      const displayLabel=element('label','Display:','workspace-create-filter');displaySelect=element('select','','workspace-control');displaySelect.dataset.createDisplay='';
      for(const option of [{id:'',label:'All displays'},...displays.filter(d=>entries.some(entry=>entry.display===d.id))]){
        displaySelect.append(new Option(option.label,option.id));
      }
      displaySelect.addEventListener('change',()=>{display=displaySelect.value;results();});displayLabel.append(displaySelect);
      const subjectLabel=element('label','Subject:','workspace-create-filter');subjectSelect=element('select','','workspace-control');subjectSelect.dataset.createSubject='';
      for(const option of [{id:'',label:'All subjects'},...subjects])subjectSelect.append(new Option(option.label,option.id));
      subjectSelect.addEventListener('change',()=>{subject=subjectSelect.value;results();});subjectLabel.append(subjectSelect);
      filters.append(displayLabel,subjectLabel);
      const clear=element('button','Clear filters','btn btn-ghost');clear.type='button';clear.dataset.createClear='';clear.addEventListener('click',()=>{subject='';display='';root.CalculatorInputSettings.syncEditableValue(search,'',{force:true});results();filterDetails.open=true;search.focus();});
      count=element('span','','workspace-card-context');count.setAttribute('role','status');list=element('div','','workspace-create-results');list.setAttribute('aria-label','Matching object types');
      const searchArea=element('div','','workspace-create-search-area'),toolbar=element('div','','workspace-create-toolbar'),filterBody=element('div','','workspace-create-filter-body');
      filterDetails=element('details','','workspace-create-filter-details');filterSummary=element('summary','Filters');
      const shortcutSettings=element('div','','workspace-create-shortcut-settings');shortcutSettings.append(element('span','Show:'));
      for(const [id,label] of [['favorites','Favorites'],['recent','Recent']]){
        const option=element('label','','workspace-check'),control=element('input');control.type='checkbox';control.dataset.createShowShortcuts=id;control.checked=!preferences.hiddenRows.includes(id);shortcutVisibility.set(id,control);
        control.addEventListener('change',()=>{preferences.hiddenRows=preferences.hiddenRows.filter(row=>row!==id);if(!control.checked)preferences.hiddenRows.push(id);savePreferences();results(true);});option.append(control,element('span',label));shortcutSettings.append(option);
      }
      filterSummary.append(count);toolbar.append(clear);filterBody.append(search,filters,shortcutSettings,toolbar);filterDetails.append(filterSummary,filterBody);searchArea.append(filterDetails);
      const footer=element('footer','','workspace-create-footer'),actions=element('div','','workspace-create-toolbar'),stayLabel=element('label','','workspace-check');
      stayOpen=element('input');stayOpen.type='checkbox';stayOpen.dataset.createStayOpen='';stayLabel.append(stayOpen,element('span','Stay open'));
      const dependencyLabel=element('label','','workspace-dependency-mode');dependencyMode=element('select','','workspace-control');dependencyMode.dataset.createDependencyMode='';
      for(const [value,label] of [['existing','Prefer existing'],['review','Review'],['automatic','Automatic']])dependencyMode.append(new Option(label,value));
      dependencyMode.title='Prefer existing uses suggested assets immediately. Review choices lets you check them first. Automatic creates or reuses supporting assets.';
      dependencyMode.setAttribute('aria-label','Dependencies');
      dependencyLabel.append(element('span','Dependencies:','workspace-dependency-label-full'),element('span','Use:','workspace-dependency-label-short'),dependencyMode);
      addedStatus=element('span','','workspace-create-added');addedStatus.setAttribute('role','status');actions.append(stayLabel,dependencyLabel);footer.append(actions,addedStatus);
      dialog.append(head,searchArea,list,footer);document.body.append(dialog);
      dialog.addEventListener('close',()=>{if(creating)return;if(lastCreatedFocus)lastCreatedFocus();else if(opener?.isConnected)opener.focus({preventScroll:true});else returnFocus()?.focus({preventScroll:true});});
      dialog.addEventListener('keydown',event=>{
        if(event.isComposing||event.keyCode===229)return;
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();return;}
        if(event.target===filterSummary&&(event.key==='Enter'||event.key===' ')){
          event.preventDefault();event.stopPropagation();filterDetails.open=!filterDetails.open;return;
        }
        const buttons=[...list.querySelectorAll('[data-create-kind]')].filter(button=>!button.closest('[hidden]')),index=buttons.indexOf(document.activeElement),enabled=buttons.filter(button=>!button.disabled);
        if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)&&(index>=0||(event.target===search||event.target===filterSummary)&&['ArrowDown','ArrowUp'].includes(event.key))){
          event.preventDefault();
          if(index<0){(event.key==='ArrowUp'?enabled.at(-1):enabled[0])?.focus();return;}
          if(event.key==='Home'||event.key==='End'){(event.key==='Home'?enabled[0]:enabled.at(-1))?.focus();return;}
          if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
            const step=event.key==='ArrowLeft'?-1:1;
            for(let next=index+step;next>=0&&next<buttons.length;next+=step)if(!buttons[next].disabled){buttons[next].focus();break;}
          }else{
            const current=buttons[index].getBoundingClientRect(),direction=event.key==='ArrowUp'?-1:1;
            const candidates=enabled.filter(button=>direction*(button.getBoundingClientRect().top-current.top)>2);
            candidates.sort((a,b)=>{
              const score=button=>{const rect=button.getBoundingClientRect();return Math.abs(rect.top-current.top)*1000+Math.abs((rect.left+rect.right-current.left-current.right)/2);};
              return score(a)-score(b);
            });candidates[0]?.focus();
          }
        }else if(event.key==='Enter'&&(event.target===search||index>=0)){event.preventDefault();event.stopPropagation();(index>=0?buttons[index]:enabled[0])?.click();}
      });
    }
    assignments.subscribe(()=>{if(dialog){const scroll=list.scrollTop,kind=document.activeElement?.dataset.createKind;results();if(kind)list.querySelector('[data-create-kind="'+kind+'"]')?.focus({preventScroll:true});list.scrollTop=scroll;}});
    return {assignments,open(){opener=document.activeElement;creating=false;lastCreatedFocus=null;subject='';display='';resultsSignature='';if(!dialog)build();stayOpen.checked=false;addedStatus.textContent='';root.CalculatorInputSettings.syncEditableValue(search,'',{force:true});results();dialog.showModal();list.scrollTop=0;(filterDetails.open?search:filterSummary).focus();}};
  }
  const api={subjects,displays,catalog,filter,subjectAssignments,init};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceCreation=api;
})(typeof window!=='undefined'?window:globalThis);
