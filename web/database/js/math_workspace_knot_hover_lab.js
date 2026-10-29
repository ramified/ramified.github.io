(function(root){
  'use strict';
  root.MathWorkspaceDesignLab.register({id:'knot-hover',title:'Knot crossing hover · 交点悬停',description:'交点始终直接点击交换。这里只比较悬停／键盘聚焦时的高亮样式；首个交点固定显示效果，其他交点可悬停试用。',
    mount(host){
      const editing=root.MathWorkspaceKnotEditing,initial=editing.hover(),cards=[],data=root.MathWorkspaceTopology.presets.knot[1].data;
      const el=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
      const grid=el('div','','workspace-knot-smoothing-grid');
      for(const [id,label]of editing.hoverOptions){
        const card=el('section','','workspace-knot-smoothing-card'),choose=el('button',label,'btn btn-ghost');choose.type='button';choose.dataset.knotHoverChoice=id;
        choose.addEventListener('click',()=>{editing.setHover(id);update();root.MathWorkspaceObjectPanels?.refresh();});
        const preview=el('div','','workspace-knot-smoothing-preview workspace-knot-hover-preview'),overview=el('div','','workspace-knot-hover-overview'),detail=el('div','','workspace-knot-hover-detail');
        overview.append(editing.decorate(root.MathWorkspaceKnotDrawing.render(data),data,{highlight:id,demonstrate:true}));
        const zoom=editing.decorate(root.MathWorkspaceKnotDrawing.render(data),data,{highlight:id,demonstrate:true}),geometry=root.MathWorkspaceKnotDrawing.layout(data),group=geometry.groups[0],center=group.points.get(group.centers.get(group.crossings[0]));
        zoom.setAttribute('viewBox',[center.x-42,center.y-42,84,84].join(' '));zoom.setAttribute('aria-label',label+'：交点局部放大');detail.append(zoom,el('small','局部放大'));preview.append(overview,detail);
        card.append(choose,preview);grid.append(card);cards.push({id,card,choose});
      }
      function update(){for(const {id,card,choose}of cards){const selected=editing.hover()===id;card.dataset.selected=String(selected);choose.setAttribute('aria-pressed',String(selected));}}
      function reset(){editing.setHover(initial);update();root.MathWorkspaceObjectPanels?.refresh();}
      host.append(grid);update();return {reset,destroy:reset,settings:()=>({knotInteraction:{hover:editing.hover()}})};
    }
  });
})(window);
