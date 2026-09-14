import {tk} from '../locales.mjs';

// Reuse the original card nodes, including their listeners and form values.
// User visibility is separate from a calculator's conditional `hidden` state.
export function createCardDock(body,{changed,resize}) {
  const side=body.querySelector('.layout .side');
  if(!side)return null;
  const layout=side.closest('.layout');layout.classList.add('workspace-editor-layout');
  side.classList.add('workspace-card-inspector');
  const cards=[...layout.querySelectorAll('.card')].filter(c=>c.querySelector('.card-head')&&!c.parentElement.closest('.card'));
  for(const card of cards)if(!side.contains(card)&&!card.querySelector('canvas')){
    const anchor=card.id==='diagram-input-card'?body.querySelector('#diagram-input-anchor'):null;
    if(anchor)side.append(anchor);side.append(card);
  }
  // Main canvases remain whole view cards, including their own toolbar,
  // overlays and linked diagrams. Only their surrounding position changes.
  const view=document.createElement('section');view.className='workspace-view-area';
  const viewHeading=document.createElement('h2');viewHeading.className='workspace-view-heading';viewHeading.dataset.i18n='mainCanvas';
  view.append(viewHeading);
  for(const child of [...layout.children])if(child!==side)view.append(child);
  for(const panel of view.querySelectorAll('.canvas-panel'))panel.classList.add('workspace-view-card');
  layout.prepend(view);
  cards.forEach((card,i)=>{card.dataset.workspaceCardId=card.id||`card-${i+1}`;});
  const toolbar=document.createElement('div');toolbar.className='workspace-dock-toolbar';
  const title=document.createElement('h2');title.dataset.i18n='inspector';
  const picker=document.createElement('details');picker.className='workspace-card-picker';
  const summary=document.createElement('summary');summary.dataset.i18n='addCard';
  const choices=document.createElement('div');choices.className='workspace-card-choices';
  picker.append(summary,choices);toolbar.append(title,picker);side.prepend(toolbar);
  const label=card=>card.querySelector('.card-head-label')?.textContent.trim()||card.querySelector('.card-head')?.textContent.trim()||card.id;
  function available(card){return !card.hidden&&card.style.display!=='none';}
  function update(){
    viewHeading.textContent=tk('mainCanvas');view.setAttribute('aria-label',tk('canvasView'));
    title.textContent=tk('inspector');summary.textContent=tk('addCard');side.setAttribute('aria-label',tk('inspector'));
    choices.replaceChildren();
    for(const card of cards){
      const row=document.createElement('label'),check=document.createElement('input');check.type='checkbox';
      check.checked=!card.classList.contains('workspace-card-hidden')&&!card.classList.contains('calculator-card-user-hidden');check.disabled=!available(card);
      const name=label(card);row.append(check,document.createTextNode(available(card)?name:tk('cardUnavailable',{name})));
      check.addEventListener('change',()=>{
        card.classList.toggle('workspace-card-hidden',!check.checked);
        if(check.checked){card.classList.remove('calculator-card-user-hidden');card.removeAttribute('aria-hidden');delete card.dataset.cardUserAriaHidden;}
        changed();resize();update();
      });choices.append(row);
      for(const button of card.querySelectorAll('.workspace-card-tool')){const text=tk(button.dataset.i18n,{name});button.title=text;button.setAttribute('aria-label',text);}
    }
  }
  function move(card,delta){
    const siblings=[...card.parentElement.children].filter(c=>cards.includes(c)&&available(c)&&!c.classList.contains('workspace-card-hidden')&&!c.classList.contains('calculator-card-user-hidden'));const i=siblings.indexOf(card),other=siblings[i+delta];
    if(!other)return;card.parentElement.insertBefore(card,delta<0?other:other.nextSibling);changed();resize();
  }
  for(const card of cards){
    const head=card.querySelector('.card-head'),tools=document.createElement('span');tools.className='workspace-card-tools';
    for(const [key,text,handler] of [
      ['moveCardUp','↑',()=>move(card,-1)],['moveCardDown','↓',()=>move(card,1)],
      ['hideCard','×',()=>{card.classList.add('workspace-card-hidden');changed();resize();update();summary.focus();}],
    ]){
      const button=document.createElement('button');button.type='button';button.className='workspace-card-tool';button.dataset.i18n=key;button.textContent=text;
      for(const event of ['pointerdown','mousedown','touchstart','keydown'])button.addEventListener(event,e=>e.stopPropagation());
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler();});tools.append(button);
    }
    head.append(tools);
  }
  picker.addEventListener('toggle',()=>{if(picker.open)update();});
  update();
  return {update,capture:()=>({cards:cards.map(card=>({key:card.dataset.workspaceCardId,hidden:card.classList.contains('workspace-card-hidden')})),order:[...side.querySelectorAll('.card')].map(c=>c.dataset.workspaceCardId),scrollTop:side.scrollTop}),
    restore(value){if(!value)return;for(const saved of value.cards||[]){const card=cards.find(c=>c.dataset.workspaceCardId===saved.key);if(card)card.classList.toggle('workspace-card-hidden',!!saved.hidden);}
      // Only reorder cards already in this inspector. Original wide-card hosts
      // and conditional diagrams keep their own parent and behavior.
      for(const key of value.order||[]){const card=cards.find(c=>c.dataset.workspaceCardId===key);if(card?.parentElement===side)side.append(card);}
      side.scrollTop=value.scrollTop||0;update();},
  };
}

export const dockStyles=`
.editor-body>.workspace-editor-layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(310px,370px)!important;gap:0!important;margin:0!important;padding:0!important;max-width:none!important;align-items:start}
.workspace-editor-layout>.workspace-view-area{min-width:0;padding:12px;grid-column:1;grid-row:1;box-sizing:border-box}
.workspace-view-heading{font:600 14px system-ui;margin:10px 0 20px}.workspace-view-area>.canvas-stack,.workspace-view-area>.sheaf-main-column,.workspace-view-area>.strand-main-column,.workspace-view-area>.category-main-column{min-width:0;width:100%}
.workspace-view-card{min-width:0;max-width:100%;box-sizing:border-box}
.workspace-editor-layout>.workspace-card-inspector{grid-column:2;grid-row:1;min-width:0;width:auto!important;padding:12px;box-sizing:border-box;border-left:1px solid var(--border,#d5ddd4);background:var(--surface,#fbfcf8);position:sticky;top:0;max-height:calc(100vh - 225px);overflow:auto;gap:12px}
.workspace-card-inspector .card{flex:none;max-width:100%;box-sizing:border-box}
.workspace-card-hidden{display:none!important}
.workspace-dock-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-12px;background:var(--surface,#fbfcf8);z-index:5;padding:10px 0}
.workspace-dock-toolbar h2{font:600 14px system-ui;margin:0}.workspace-card-picker summary{cursor:pointer;font:13px system-ui;list-style:none;border:1px solid var(--border,#d5ddd4);border-radius:4px;padding:6px 10px}
.workspace-card-choices{position:absolute;top:100%;left:0;right:0;max-height:55vh;overflow:auto;padding:8px;background:var(--surface,#fff);border:1px solid var(--border,#d5ddd4);box-shadow:0 6px 20px #0002}
.workspace-card-choices label{display:flex;gap:8px;align-items:center;padding:7px;font:13px system-ui;cursor:pointer}.workspace-card-choices input{width:auto!important}
.workspace-card-tools{display:inline-flex;gap:2px;margin-left:auto;align-items:center}.workspace-card-tool{border:0;background:transparent;color:inherit;cursor:pointer;padding:3px 5px;font:14px system-ui;border-radius:3px}.workspace-card-tool:hover{background:#64756b25}.workspace-card-tool:focus-visible{outline:2px solid #b17835}
.workspace-card-inspector .card-head{flex-wrap:wrap}.workspace-card-inspector .card-head-label{flex:1;min-width:80px}
@media(max-width:760px){.editor-body>.workspace-editor-layout{grid-template-columns:minmax(0,1fr)!important}.workspace-editor-layout>.workspace-card-inspector{grid-column:1;grid-row:auto;position:static;max-height:none;border-left:0;border-top:1px solid var(--border,#d5ddd4)}.workspace-card-tool{padding:8px}.workspace-dock-toolbar{top:0}}
`;
