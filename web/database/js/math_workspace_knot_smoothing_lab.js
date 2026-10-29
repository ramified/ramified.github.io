(function(root){
  'use strict';
  root.MathWorkspaceDesignLab.register({
    id:'knot-smoothing',title:'Knot smoothing · 曲线平滑',
    description:'当前默认采用三次 Bézier。上穿线保持连续，下穿线留短缺口；缺口大小可调。选择后临时应用到所有 Knot 展示面板，退出后恢复。',
    mount(host){
      const drawing=root.MathWorkspaceKnotDrawing,initial=drawing.settings(),cards=[];
      const el=(tag,text='',className='')=>Object.assign(document.createElement(tag),{textContent:text,className});
      const examples=root.MathWorkspaceTopology.presets.knot.filter(p=>p.data.pd.length),select=el('select','','workspace-control');
      select.setAttribute('aria-label','Knot smoothing example');select.dataset.knotSmoothingExample='';
      examples.forEach((p,index)=>select.append(new Option(p.label,String(index))));
      const field=el('label','','workspace-field');field.append(el('span','比较样例','input-label'),select);host.append(field);
      const gapField=el('label','','workspace-field'),gapHeading=el('span','','workspace-favorite-star-slider-label'),gapOutput=el('output'),gapInput=el('input');
      gapInput.type='range';gapInput.min='0';gapInput.max='24';gapInput.step='1';gapInput.dataset.knotGapControl='';gapInput.setAttribute('aria-label','下穿缺口大小');
      gapHeading.append(el('span','下穿缺口大小'),gapOutput);gapField.append(gapHeading,gapInput);host.append(gapField,el('p','数值越大，缺口越宽；0 为不留缺口。缺口随图缩放，拥挤交点会自动缩短。','workspace-card-context'));
      gapInput.addEventListener('input',()=>{drawing.setGapSize(Number(gapInput.value));update();showExamples();root.MathWorkspaceObjectPanels?.refresh();});
      const grid=el('div','','workspace-knot-smoothing-grid'),status=el('p','','workspace-card-context');status.setAttribute('role','status');
      for(const style of drawing.styles){
        const card=el('section','','workspace-knot-smoothing-card');card.dataset.knotSmoothingCard=style.id;
        const preview=el('div','','workspace-knot-smoothing-preview'),choose=el('button',style.label,'btn btn-ghost');choose.type='button';choose.dataset.knotSmoothingChoice=style.id;
        choose.addEventListener('click',()=>{drawing.setStyle(style.id);update();root.MathWorkspaceObjectPanels?.refresh();});
        card.append(choose,el('p',style.description,'workspace-card-context'),preview);grid.append(card);cards.push({style,card,choose,preview});
      }
      function showExamples(){const example=examples[Number(select.value)];for(const {style,preview}of cards)preview.replaceChildren(drawing.render(example.data,style.id));}
      function update(){for(const {style,card,choose}of cards){const selected=drawing.style()===style.id;card.dataset.selected=String(selected);choose.setAttribute('aria-pressed',String(selected));}gapInput.value=String(drawing.settings().gapSize);gapOutput.value=gapInput.value;status.textContent='当前展示方案：'+drawing.styles.find(style=>style.id===drawing.style()).label+'；缺口大小 '+gapInput.value+'。';}
      function reset(){drawing.setStyle(initial.smoothing);drawing.setGapSize(initial.gapSize);update();showExamples();root.MathWorkspaceObjectPanels?.refresh();}
      select.addEventListener('change',showExamples);host.append(grid,status);showExamples();update();
      return {reset,destroy:reset,settings:()=>({knotDrawing:drawing.settings()})};
    }
  });
})(window);
