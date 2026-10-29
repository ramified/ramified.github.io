(function(root){
  'use strict';
  root.MathWorkspaceDesignLab.register({id:'topology-icons',title:'Knot / Dual Graph icons',
    description:'Your rounded trefoil and unlabelled vertex + loop are now the defaults. Compare alternatives at large and toolbar sizes. Click to preview; exit restores your active icons.',
    mount(host,{renderWorkspace}){
      const icons=root.MathWorkspaceAssetIcons,initial=icons.topologyPreview(),buttons=[];
      const el=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
      const status=el('p','','workspace-card-context');status.setAttribute('role','status');status.dataset.topologyIconStatus='';
      for(const [kind,title]of [['knot','Knot / Link'],['dual-graph','Dual Graph']]){
        const section=el('section'),grid=el('div','','workspace-topology-icon-choices');section.append(el('h3',title),grid);host.append(section);
        icons.topologyRefinements[kind].forEach((choice,index)=>{
          const label=icons.topologyOptions[kind].find(([id])=>id===choice)[1];
          const button=el('button','','workspace-topology-icon-choice');button.type='button';button.dataset.topologyIconKind=kind;button.dataset.topologyIconChoice=choice;button.setAttribute('aria-label',title+': '+label);
          const previews=el('span','','workspace-topology-icon-samples');for(const size of ['large','small']){const icon=icons.renderTopologyChoice(kind,choice);icon.dataset.sampleSize=size;previews.append(icon);}
          button.append(previews,el('strong',(index?String.fromCharCode(64+index)+' · ':'Reference · ')+label));
          button.addEventListener('click',()=>{icons.previewTopology({[kind]:choice});update();renderWorkspace();});grid.append(button);buttons.push(button);
        });
      }
      host.append(status);
      function update(){const selected=icons.topologyPreview();buttons.forEach(b=>b.setAttribute('aria-pressed',String(selected[b.dataset.topologyIconKind]===b.dataset.topologyIconChoice)));status.textContent='Preview: Knot / Link — '+selected.knot+'; Dual Graph — '+selected['dual-graph']+'.';}
      function reset(){icons.previewTopology(initial);update();renderWorkspace();}
      update();return {reset,settings:()=>({topologyIcons:icons.topologyPreview()}),destroy:reset};
    }
  });
})(window);
