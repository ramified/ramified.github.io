(function(root){
  'use strict';
  const subjects = [
    {id:'linear',label:'Linear algebra',kinds:['field','matrix','vector','frame','lattice']},
    {id:'representation',label:'Representation theory',kinds:['young','lie','dynkin','strands','roots','weyl','matrix']},
    {id:'categories',label:'Categories',kinds:['category','functor','sheaf','map']},
    {id:'algebraic',label:'Algebraic geometry',kinds:['variety','sheaf','map','field','cone','fan','tropical']},
    {id:'geometry',label:'Geometry and coordinates',kinds:['frame','point','vector','polytope','sphere','roots','lattice','voronoi','formula','weyl','cone','fan','tropical','variety']}
  ];
  const descriptions={young:'Ordinary or generalized rows of a Young diagram.',lie:'A Lie family and rank.',field:'Coefficients for algebraic objects.',matrix:'A matrix with an explicit coefficient field.',category:'Objects and morphisms of a category.',functor:'A covariant or contravariant functor.',dynkin:'Vertices and optional quiver directions.',strands:'An ordered word of crossings or generators.',variety:'A variety, including Grassmannian and toric models.',sheaf:'A sheaf or vector bundle on a variety.',map:'A map of varieties, sheaves, or other maps.',frame:'A position and coordinate basis.',point:'A coordinate point.',vector:'A vector in an ambient space.',polytope:'A regular polytope or simplex.',sphere:'A sphere in an ambient space.',roots:'A Lie root system.',lattice:'A lattice specified by a basis or another object.',voronoi:'A Voronoi cell of a lattice.',formula:'A set of implicit equations.',tropical:'A tropical polynomial.',weyl:'Weyl chambers of a root system.',cone:'A rational cone.',fan:'A collection of rational cones.'};
  const aliases={young:'partition tableau symmetric exterior',lie:'lie algebra root system',strands:'braid coxeter temperley lieb kazhdan lusztig',matrix:'linear transformation coefficients',sheaf:'bundle coherent locally free',map:'morphism arrow',cone:'toric convex',fan:'toric',point:'coordinates',formula:'equation implicit zero locus',weyl:'reflection chamber',voronoi:'dirichlet cell'};
  function catalog(subtypes,labels={}) {
    return Object.entries(subtypes).map(([kind,types])=>({kind,label:({variety:'Variety',sheaf:'Sheaf',map:'Map'}[kind])||labels[kind]||types[0][1],description:descriptions[kind]||'',subjects:subjects.filter(s=>s.kinds.includes(kind)).map(s=>s.id),search:[kind,labels[kind]||'',...types.map(t=>t[1]),aliases[kind]||'',descriptions[kind]||'',...subjects.filter(s=>s.kinds.includes(kind)).map(s=>s.label)].join(' ').toLowerCase()}));
  }
  function filter(entries,query='',selected=[]) {
    const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return entries.filter(entry=>(!selected.length||entry.subjects.some(id=>selected.includes(id)))&&words.every(word=>(entry.label+' '+entry.search).toLowerCase().includes(word)));
  }
  function init({entries,create,capabilities,returnFocus}) {
    let dialog,search,list,count,filters,opener,creating=false,resultsSignature='';
    const selected=new Set();
    const element=(tag,text,className)=>Object.assign(document.createElement(tag),{textContent:text||'',className:className||''});
    function results(){
      const items=filter(entries,search.value,[...selected]);
      const signature=JSON.stringify([[...selected].sort(),items.map(item=>[item.kind,capabilities()?.[item.kind]===false])]);
      // The editable helper commits on blur. An unchanged filter must keep the
      // result button that ArrowDown just focused, rather than replacing it.
      if(signature===resultsSignature)return;
      resultsSignature=signature;list.replaceChildren();
      filters.querySelectorAll('[data-subject]').forEach(button=>button.setAttribute('aria-pressed',String(selected.has(button.dataset.subject))));
      dialog.querySelector('[data-all-subjects]').setAttribute('aria-pressed',String(!selected.size));count.textContent=items.length+' object types';
      if(!items.length)list.append(element('p','No objects match. Clear filters or try another search.','workspace-card-context'));
      for(const item of items){const button=element('button','','workspace-create-result');button.type='button';button.dataset.createKind=item.kind;button.disabled=capabilities()?.[item.kind]===false;button.append(element('strong',item.label),element('span',item.description));const tags=element('small');tags.textContent=item.subjects.map(id=>subjects.find(s=>s.id===id).label).join(' · ');button.append(tags);button.addEventListener('click',()=>{creating=true;dialog.close();create(item.kind);});list.append(button);}
    }
    function build(){
      dialog=element('dialog','','workspace-create-dialog');dialog.id='workspace-create-dialog';dialog.setAttribute('aria-labelledby','workspace-create-title');
      const head=element('header'),title=element('h2','New mathematical object');title.id='workspace-create-title';const close=element('button','Close','btn btn-ghost');close.type='button';close.addEventListener('click',()=>dialog.close());head.append(title,close);
      search=element('input','','workspace-control');search.type='search';search.placeholder='Search objects, subtypes, or subjects';search.setAttribute('aria-label','Search mathematical objects');search.dataset.createSearch='';
      root.CalculatorInputSettings.listenEditable(search,'input',results);
      filters=element('div','','workspace-create-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Subjects');
      const all=element('button','All objects','btn btn-ghost');all.type='button';all.dataset.allSubjects='';all.addEventListener('click',()=>{selected.clear();results();});filters.append(all);
      for(const subject of subjects){const button=element('button',subject.label,'btn btn-ghost');button.type='button';button.dataset.subject=subject.id;button.addEventListener('click',()=>{selected.has(subject.id)?selected.delete(subject.id):selected.add(subject.id);results();});filters.append(button);}
      const clear=element('button','Clear filters','btn btn-ghost');clear.type='button';clear.addEventListener('click',()=>{selected.clear();root.CalculatorInputSettings.syncEditableValue(search,'',{force:true});results();search.focus();});
      count=element('p','','workspace-card-context');count.setAttribute('role','status');list=element('div','','workspace-create-results');list.setAttribute('aria-label','Matching object types');
      const searchArea=element('div','','workspace-create-search-area'),toolbar=element('div','','workspace-create-toolbar');toolbar.append(count,clear);searchArea.append(search,filters,toolbar);dialog.append(head,searchArea,list);document.body.append(dialog);
      dialog.addEventListener('close',()=>{if(creating)return;if(opener?.isConnected)opener.focus({preventScroll:true});else returnFocus()?.focus({preventScroll:true});});
      dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close();return;}const buttons=[...list.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&(index>=0||event.target===search&&['ArrowDown','ArrowUp'].includes(event.key))){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?Math.min(buttons.length-1,index+1):Math.max(0,index-1);buttons[next]?.focus();}else if(event.key==='Enter'&&!event.isComposing&&(event.target===search||index>=0)){event.preventDefault();event.stopPropagation();(index>=0?buttons[index]:buttons[0])?.click();}});
    }
    return {open(){opener=document.activeElement;creating=false;if(!dialog)build();selected.clear();root.CalculatorInputSettings.syncEditableValue(search,'',{force:true});results();dialog.showModal();search.focus();}};
  }
  const api={subjects,catalog,filter,init};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MathWorkspaceCreation=api;
})(typeof window!=='undefined'?window:globalThis);
