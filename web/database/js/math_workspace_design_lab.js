(function (root) {
  'use strict';
  function init(api) {
    let panel = null, active = false;
    const icons = root.MathWorkspaceAssetIcons;
    function refresh() { api.render(); if (panel) gallery(panel.querySelector('[data-design-gallery]')); }
    function gallery(host) {
      host.replaceChildren();
      const lie = {kind:'lie', id:'fixture-lie', data:{family:'A',rank:3}};
      const samples = [
        ['Empty', {kind:'young',type:'partition',data:{rows:[]}}],
        ['5 × 5', {kind:'young',type:'partition',data:{rows:[5,4,3,2,1]}}],
        ['Signed', {kind:'young',type:'generalized',data:{rows:[3,1,0,-1,-3]}}],
        ['Generic', {kind:'young',type:'partition',data:{rows:[6]}}],
        ['Notation', {kind:'sheaf',name:'\\mathcal{F}^{st}_{2}'}],
        ...['coxeter','braid','kl','tl'].map(family => [family, {kind:'strands',data:{lie:'lie:fixture-lie',generators:[{family,index:1,...(family==='braid'?{sign:-1}:{})}]}}])
      ];
      samples.forEach(([label, asset]) => { const tile = document.createElement('div'); tile.className='workspace-design-sample'; tile.append(icons.render(asset,()=>lie), Object.assign(document.createElement('small'),{textContent:label})); host.append(tile); });
      icons.typeset(host);
    }
    function build() {
      panel = document.createElement('section'); panel.id='workspace-design-lab'; panel.className='card workspace-assets-inspector-card workspace-design-lab';
      panel.innerHTML='<div class="card-head" role="button" tabindex="0" aria-expanded="true"><span class="card-head-label">Design Lab</span><em class="toggle-icon">▾</em></div><div class="card-body"><h3>Icons</h3><p class="workspace-card-context">Temporary previews in this tab. Asset data and saved defaults stay unchanged.</p><div data-design-controls></div><div class="workspace-design-gallery" data-design-gallery></div><div class="workspace-design-actions"><button class="btn btn-ghost" data-design-reset>Reset</button><button class="btn btn-ghost" data-design-copy>Copy design settings</button><button class="btn btn-ghost" data-design-exit>Exit Design Lab</button></div><output data-design-status role="status"></output></div>';
      const controls=panel.querySelector('[data-design-controls]');
      for(const [key,label,type] of [['exactColor','Exact color','color'],['genericColor','Generic color','color'],['stroke','Cell stroke','range'],['hatch','Hatch negative cells','checkbox']]) {
        const row=document.createElement('label'), text=document.createElement('span'), input=document.createElement('input'); row.className='workspace-design-control';text.textContent=label;input.type=type;input.dataset.designSetting=key;input.setAttribute('aria-label',label);
        if(type==='range'){input.min='0.3';input.max='1.6';input.step='0.1';}
        input.addEventListener('input',()=>{const next=icons.settings();next[key]=type==='checkbox'?input.checked:type==='range'?Number(input.value):input.value;icons.configure(next);refresh();});row.append(text,input);controls.append(row);
      }
      panel.querySelector('[data-design-reset]').addEventListener('click',()=>{icons.configure();sync();refresh();});
      panel.querySelector('[data-design-copy]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(icons.settings(),null,2));panel.querySelector('[data-design-status]').textContent='Design settings copied.';}catch(_){panel.querySelector('[data-design-status]').textContent=JSON.stringify(icons.settings());}});
      panel.querySelector('[data-design-exit]').addEventListener('click',exit);
      api.mount(panel);sync();gallery(panel.querySelector('[data-design-gallery]'));
    }
    function sync(){const values=icons.settings(), css=getComputedStyle(document.documentElement);panel.querySelectorAll('[data-design-setting]').forEach(input=>{const key=input.dataset.designSetting;if(input.type==='checkbox')input.checked=values[key];else input.value=values[key] || (key==='exactColor'?css.getPropertyValue('--accent').trim():css.getPropertyValue('--muted').trim());});}
    function open(){active=true;const url=new URL(location.href);url.searchParams.set('designLab','1');history.replaceState(null,'',url);if(!panel)build();api.show(panel);refresh();}
    function exit(){active=false;icons.configure();if(panel){api.remove(panel);panel=null;}const url=new URL(location.href);url.searchParams.delete('designLab');history.replaceState(null,'',url);api.render();}
    document.addEventListener('keydown',event=>{if(event.isComposing||event.composedPath().some(node=>node.matches?.('input,textarea,select,[contenteditable="true"]')))return;if(event.ctrlKey&&event.altKey&&event.shiftKey&&event.code==='KeyD'){event.preventDefault();open();}});
    root.addEventListener('load',refresh,{once:true});
    icons.configure();if(new URL(location.href).searchParams.get('designLab')==='1')open();
    return {open,exit,get active(){return active;}};
  }
  root.MathWorkspaceDesignLab={init};
})(window);
