(function(root){
  'use strict';
  function init({entries,assignments}){
    const {subjects,displays}=root.MathWorkspaceCreation;
    const element=(tag,text,className)=>Object.assign(document.createElement(tag),{textContent:text||'',className:className||''});
    root.MathWorkspaceDesignLab.register({
      id:'asset-subjects',title:'Asset subject assignments',
      description:'Assign subjects to asset types. Changes preview immediately in New mathematical object. Copy settings to keep a candidate configuration; exiting Design Lab restores defaults.',
      mount(host){
        let selected=entries[0]?.kind;
        const searchLabel=element('label','Find an asset type','workspace-principal-control'),search=element('input','','workspace-control');
        search.type='search';search.placeholder='Search asset types';search.dataset.subjectAssignmentSearch='';searchLabel.append(search);
        const unassignedLabel=element('label','','workspace-principal-toggle'),unassigned=element('input');unassigned.type='checkbox';unassigned.dataset.subjectAssignmentUnassigned='';unassignedLabel.append(unassigned,element('span','Unassigned only'));
        const count=element('p','','workspace-card-context');count.setAttribute('role','status');
        const layout=element('div','','workspace-subject-layout'),list=element('div','','workspace-subject-list'),detail=element('div','','workspace-subject-detail');
        list.setAttribute('role','group');list.setAttribute('aria-label','Asset types');
        const heading=element('strong'),context=element('p','','workspace-card-context'),fields=element('fieldset'),legend=element('legend','Subjects');fields.append(legend);
        const checkboxes=new Map();
        subjects.forEach(subject=>{
          const label=element('label','','workspace-principal-toggle'),input=element('input');input.type='checkbox';input.dataset.assignmentSubject=subject.id;
          input.addEventListener('change',()=>{const entry=entries.find(entry=>entry.kind===selected);if(entry)assignments.set(selected,subjects.filter(s=>checkboxes.get(s.id).checked).map(s=>s.id));});
          label.append(input,element('span',subject.label));fields.append(label);checkboxes.set(subject.id,input);
        });
        detail.append(heading,context,fields,element('p','Select any number of subjects. Unassigned types remain available under All subjects.','workspace-card-context'));
        layout.append(list,detail);host.append(searchLabel,unassignedLabel,count,layout);
        const buttons=new Map();
        entries.slice().sort((a,b)=>a.label.localeCompare(b.label)).forEach(entry=>{
          const button=element('button','','workspace-subject-type');button.type='button';button.dataset.assignmentKind=entry.kind;
          button.append(element('strong',entry.label),element('small'));
          button.addEventListener('click',()=>{selected=entry.kind;render();});list.append(button);buttons.set(entry.kind,button);
        });
        const empty=element('p','No asset types match. Clear the search or turn off Unassigned only.','workspace-card-context');list.append(empty);
        function render(){
          const matches=new Set(root.MathWorkspaceCreation.filter(entries,search.value).filter(entry=>!unassigned.checked||!entry.subjects.length).map(entry=>entry.kind));
          entries.forEach(entry=>{
            const button=buttons.get(entry.kind);button.hidden=!matches.has(entry.kind);button.setAttribute('aria-pressed',String(entry.kind===selected));
            button.querySelector('small').textContent=entry.subjects.length?entry.subjects.map(id=>subjects.find(s=>s.id===id).label).join(' · '):'Unassigned';
          });
          empty.hidden=matches.size>0;count.textContent=matches.size+' asset types · '+entries.filter(entry=>!entry.subjects.length).length+' unassigned';
          // Keep the selected editor mounted even if a filter hides its list row.
          // This lets a user add several subjects without losing the focused checkbox.
          const entry=entries.find(entry=>entry.kind===selected);detail.hidden=!entry;if(!entry)return;
          heading.textContent=entry.label;context.textContent='Display: '+displays.find(d=>d.id===entry.display).label;
          checkboxes.forEach((input,id)=>{input.checked=entry.subjects.includes(id);});
        }
        root.CalculatorInputSettings.listenEditable(search,'input',render);
        unassigned.addEventListener('change',render);
        const unsubscribe=assignments.subscribe(render);render();
        return {reset(){root.CalculatorInputSettings.syncEditableValue(search,'',{force:true});unassigned.checked=false;assignments.reset();},settings:assignments.settings,destroy:unsubscribe};
      }
    });
  }
  root.MathWorkspaceSubjectAssignments={init};
})(window);
