import {tk} from '../locales.mjs';

// Reuse the original card nodes, including their listeners and form values.
// User visibility is separate from a calculator's conditional `hidden` state.
export function createCardDock(body,{changed,resize,inspectorLayout=null}) {
  const side=body.querySelector('.layout .side');
  if(!side)return null;
  const layout=side.closest('.layout');layout.classList.add('workspace-editor-layout');
  side.classList.add('workspace-card-inspector');
  // Attribution/feedback footers belong to the historical standalone pages.
  // The workspace already has its own site chrome, so omit them from the
  // native canvas surface and preserve the available calculation space.
  for(const footer of body.querySelectorAll('footer'))footer.remove();
  const cards=[...layout.querySelectorAll('.card')].filter(c=>c.querySelector('.card-head')&&!c.parentElement.closest('.card'));
  for(const card of cards)if(!side.contains(card)&&!card.querySelector('canvas')){
    const anchor=card.id==='diagram-input-card'?body.querySelector('#diagram-input-anchor'):null;
    if(anchor)side.append(anchor);side.append(card);
  }
  // The workspace supplies the View title and the Inspector surface.  Do not
  // add another canvas wrapper, heading, or inspector toolbar here.
  for(const panel of layout.querySelectorAll('.canvas-panel'))panel.classList.add('workspace-view-card');
  cards.forEach((card,i)=>{card.dataset.workspaceCardId=card.id||`card-${i+1}`;});
  const label=card=>card.querySelector('.card-head-label')?.textContent.trim()||card.querySelector('.card-head')?.textContent.trim()||card.id;
  function available(card){return !card.hidden&&card.style.display!=='none';}
  function update(){
    for(const card of cards){
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
      ['hideCard','×',()=>{card.classList.add('workspace-card-hidden');changed();resize();update();}],
    ]){
      const button=document.createElement('button');button.type='button';button.className='workspace-card-tool';button.dataset.i18n=key;button.textContent=text;
      for(const event of ['pointerdown','mousedown','touchstart','keydown'])button.addEventListener(event,e=>e.stopPropagation());
      button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler();});tools.append(button);
    }
    head.append(tools);
  }
  if(inspectorLayout)inspectorLayout.append(side);
  update();
  const setVisible=(key,visible)=>{const card=cards.find(item=>item.dataset.workspaceCardId===key);if(!card||!available(card))return false;card.classList.toggle('workspace-card-hidden',!visible);if(visible){card.classList.remove('calculator-card-user-hidden');card.removeAttribute('aria-hidden');delete card.dataset.cardUserAriaHidden;}changed();resize();update();return true;};
  return {update,listCards:()=>cards.map(card=>({key:card.dataset.workspaceCardId,label:label(card),available:available(card),visible:!card.classList.contains('workspace-card-hidden')&&!card.classList.contains('calculator-card-user-hidden')})),setVisible,focusCard:key=>{const card=cards.find(item=>item.dataset.workspaceCardId===key);if(!card)return false;setVisible(key,true);card.scrollIntoView?.({block:'nearest'});card.querySelector('input,select,textarea,button,[tabindex]')?.focus?.();return true;},capture:()=>({cards:cards.map(card=>({key:card.dataset.workspaceCardId,hidden:card.classList.contains('workspace-card-hidden')})),order:[...side.querySelectorAll('.card')].map(c=>c.dataset.workspaceCardId),scrollTop:side.scrollTop}),
    restore(value){if(!value)return;for(const saved of value.cards||[]){const card=cards.find(c=>c.dataset.workspaceCardId===saved.key);if(card)card.classList.toggle('workspace-card-hidden',!!saved.hidden);}
      // Only reorder cards already in this inspector. Original wide-card hosts
      // and conditional diagrams keep their own parent and behavior.
      for(const key of value.order||[]){const card=cards.find(c=>c.dataset.workspaceCardId===key);if(card?.parentElement===side)side.append(card);}
      side.scrollTop=value.scrollTop||0;update();},
  };
}

export const dockStyles=`
.editor-body>.workspace-editor-layout{display:block!important;margin:0!important;padding:0!important;max-width:none!important}
.workspace-editor-layout>.canvas-stack,.workspace-editor-layout>.sheaf-main-column,.workspace-editor-layout>.strand-main-column,.workspace-editor-layout>.category-main-column{min-width:0;width:100%}
.workspace-view-card{min-width:0;max-width:100%;box-sizing:border-box}
.workspace-editor-inspector-layout{display:block!important;margin:0!important;padding:0!important;max-width:none!important}
.workspace-editor-inspector-layout>.workspace-card-inspector{display:grid;gap:12px;min-width:0;width:auto!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;max-height:none!important;overflow:visible!important}
.workspace-card-inspector .card{flex:none;max-width:100%;box-sizing:border-box}
.workspace-card-hidden{display:none!important}
.workspace-card-tools{display:inline-flex;gap:2px;margin-left:auto;align-items:center}.workspace-card-tool{border:0;background:transparent;color:inherit;cursor:pointer;padding:3px 5px;font:14px system-ui;border-radius:3px}.workspace-card-tool:hover{background:#64756b25}.workspace-card-tool:focus-visible{outline:2px solid #b17835}
.workspace-card-inspector .card-head{flex-wrap:wrap}.workspace-card-inspector .card-head-label{flex:1;min-width:80px}
@media(max-width:760px){.workspace-card-tool{padding:8px}}
`;
