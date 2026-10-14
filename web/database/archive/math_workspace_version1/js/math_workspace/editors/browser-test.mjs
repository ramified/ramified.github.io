import nativeEditors from 'workspace:editors';
import {decodeState} from './state.mjs';
import {newProject,validateProject} from '../project.mjs';
import {operations} from '../kernel.mjs';

// This opt-in test page never loads or writes a user's project.
export async function runBrowserTests(){
  const output=document.getElementById('test-results'),stage=document.getElementById('test-stage');
  const errors=[],mounted=[];let passed=0,failed=0;
  const check=(value,message)=>{if(!value)throw new Error(message);};
  const pause=()=>new Promise(resolve=>setTimeout(resolve,30));
  const mount=(family,snapshot=null)=>{const host=document.createElement('section');stage.append(host);const editor=nativeEditors[family].mount(host,{id:`test-${mounted.length}`,snapshot,onError:e=>errors.push(e)});mounted.push(editor);return editor;};
  const node=(e,id)=>{const n=e.shadow.getElementById(id);check(n,`Missing control ${id}`);return n;};
  const input=(e,id,value,type='change')=>{const n=node(e,id);n.value=value;n.dispatchEvent(new Event(type,{bubbles:true,composed:true}));};
  const test=async(name,work)=>{const row=document.createElement('li');row.textContent=`Running: ${name}`;output.append(row);const start=errors.length;try{await work();await pause();if(errors.length>start)throw errors[start];passed++;row.textContent=`PASS: ${name}`;}catch(e){failed++;row.textContent=`FAIL: ${name}: ${e.message}`;row.style.color='#a22';}document.getElementById('status').textContent=`${passed} passed, ${failed} failed`;};
  let a,b;
  await test('Slicing: original Source Data creates a tesseract',()=>{
    a=mount('slice');a.shadow.querySelector('[data-source-mode="add"]').click();input(a,'source-add-type','regular-polytope');node(a,'source-add-object').click();
    check(node(a,'object-select').options.length===2,'Expected frame and tesseract');check(node(a,'object-name').value==='tesseract','Tesseract not selected');
    check(node(a,'slice-viewport').closest('.workspace-view-card'),'Main canvas is not in a view card');
    check(node(a,'object-select').closest('.workspace-card-inspector'),'Controls are not in the Inspector');
  });
  await test('Two slicing instances have independent objects and helper sessions',()=>{
    b=mount('slice');check(node(b,'object-select').options.length===1,'New editor inherited an object');
    check(a.environment.document.__calculatorCardsSession!==b.environment.document.__calculatorCardsSession,'Shared card session');
    const card=node(b,'screen-zoom').closest('.card');card.querySelector('.card-head-label').click();check(!card.classList.contains('collapsed'),'Viewport header did not open');
  });
  await test('Inspector hide, show and keyboard ordering preserve the same card',()=>{
    const card=node(a,'object-select').closest('.card'),key=card.dataset.workspaceCardId;
    card.querySelector('[data-i18n="hideCard"]').click();check(card.classList.contains('workspace-card-hidden'),'Card not hidden');
    const saved=a.capture();check(saved.ui.dock.cards.find(c=>c.key===key).hidden,'Hidden flag not saved');
    a.restore(saved);check(card.classList.contains('workspace-card-hidden'),'Hidden flag not restored');
    const picker=a.shadow.querySelector('.workspace-card-picker');picker.open=true;
    const choice=[...picker.querySelectorAll('label')].find(n=>n.textContent==='Source Data').querySelector('input');choice.checked=true;choice.dispatchEvent(new Event('change'));
    check(!card.classList.contains('workspace-card-hidden'),'Add card failed');check(node(a,'object-name').value==='tesseract','Hiding changed object');
    const before=a.capture().ui.dock.order.indexOf(key);card.querySelector('[data-i18n="moveCardDown"]').click();
    check(a.capture().ui.dock.order.indexOf(key)>before,'Move down did not change visible card order');
  });
  await test('Slicing snapshot restores editable objects and independent Inspector state',()=>{
    const saved=JSON.parse(JSON.stringify(a.capture())),restored=mount('slice',saved);check(node(restored,'object-select').options.length===2,'Object lost on restore');
    input(restored,'object-name','Restored cube');check(node(a,'object-name').value==='tesseract','Restore shares mutable state');
    const p=newProject();p.calculatorSessions=[{id:'saved',family:'slice',name:'Saved',version:1,snapshot:saved}];p.activeCalculator='saved';validateProject(p,operations);restored.dispose();
  });
  await test('Slicing: discrete movement and viewport settings update the saved frame',()=>{
    a.shadow.querySelector('[data-motion-mode="discrete"]').click();node(a,'move-positive').click();
    const value=decodeState(a.capture().model).full;check(value.position.some(x=>x!==0),'Discrete movement did not move the frame');
    input(a,'screen-zoom','1.5','input');check(decodeState(a.capture().model).full.viewport.zoom===1.5,'Zoom was not applied');
    check(decodeState(b.capture().model).full.position.every(x=>x===0),'Movement changed the second instance');
    node(a,'reset-position').click();
  });
  await test('Slicing: original object constructors remain available',()=>{
    const e=mount('slice');
    for(const type of ['regular-polytope','simplex','sphere','cartesian-frame','point','vector','matrix','dynkin-type','root-set','lattice','formula-set','tropical-polynomial','weyl-chambers']){
      const before=node(e,'object-select').options.length;e.shadow.querySelector('[data-source-mode="add"]').click();input(e,'source-add-type',type);node(e,'source-add-object').click();
      check(node(e,'object-select').options.length===before+1,`${type} was not constructed`);
    }
    e.dispose();
  });
  await test('Slicing: shortcuts affect only the focused editor',()=>{
    a.activate();b.activate();
    a.shadow.querySelector('[data-motion-mode="discrete"]').click();b.shadow.querySelector('[data-motion-mode="discrete"]').click();
    const position=e=>decodeState(e.capture().model).full.position.join(',');
    const beforeA=position(a),beforeB=position(b);a.host.focus();
    a.host.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true,composed:true}));
    a.host.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true,composed:true}));
    check(position(a)!==beforeA,'Focused canvas did not respond to shortcut');check(position(b)===beforeB,'Shortcut changed another editor');
    node(a,'reset-position').click();
  });
  await test('Slicing: deactivating a tab stops held continuous motion',async()=>{
    a.activate();a.shadow.querySelector('[data-motion-mode="continuous"]').click();a.host.focus();
    a.host.dispatchEvent(new KeyboardEvent('keydown',{key:'w',code:'KeyW',bubbles:true,composed:true}));
    for(let i=0;i<8;i++)await pause();
    check(decodeState(a.capture().model).full.position.some(x=>x!==0),'Held key did not start motion');
    a.deactivate();const stopped=JSON.stringify(decodeState(a.capture().model).full.position);
    for(let i=0;i<4;i++)await pause();
    check(JSON.stringify(decodeState(a.capture().model).full.position)===stopped,'Inactive editor kept moving');
    a.activate();for(let i=0;i<4;i++)await pause();
    check(JSON.stringify(decodeState(a.capture().model).full.position)===stopped,'Activation restarted a released key');
    node(a,'reset-position').click();
  });
  await test('Slicing: positive orthant computes through the packaged toric worker',async()=>{
    const e=mount('slice');input(e,'ambient-dimension','2');e.shadow.querySelector('[data-source-mode="add"]').click();input(e,'source-add-type','toric-cone');node(e,'source-add-object').click();
    input(e,'toric-cone-preset','positive-orthant');node(e,'toric-cone-apply-preset').click();
    for(let i=0;i<80&&!node(e,'toric-cone-summary').textContent.includes('2 rays');i++)await pause();
    check(node(e,'toric-cone-summary').textContent.includes('2 rays'),'Positive orthant analysis missing');
    check(!node(e,'slice-toric-cone-card').hidden,'Conditional toric card is hidden');e.dispose();
  });
  await test('Matrix: card opening, editable grid and inverse computation',()=>{
    const e=mount('matrix');input(e,'matrix-rows','2');input(e,'matrix-cols','2');
    const entry=e.shadow.querySelector('[aria-label="matrix entry row 1, column 1"]');entry.value='2';entry.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    const card=node(e,'compute-operation').closest('.card');if(card.classList.contains('collapsed'))card.querySelector('.card-head-label').click();
    check(!card.classList.contains('collapsed'),`Computation header did not open; contains=${e.environment.document.contains(card)}; own session=${Object.hasOwn(e.environment.document,'__calculatorCardsSession')}`);
    input(e,'operation-select','inverse');node(e,'compute-operation').click();check(node(e,'operation-output').textContent.includes('0.5'),'Inverse result missing');
    const saved=e.capture();check(decodeState(saved.model).state.lastOperationResult,'Computed payload not saved');e.dispose();
    const restored=mount('matrix',saved);check(node(restored,'operation-output').textContent.includes('0.5'),'Saved inverse was not rendered on reopening');restored.dispose();
  });
  for(const family of ['young','double-young','dynkin','strand','sheaf','complex','mosaic','category','ramification'])await test(`${family}: mount, snapshot and reopen`,async()=>{
    const e=mount(family);check(e.shadow.querySelector('.workspace-card-inspector'),'Missing Inspector');await pause();const saved=JSON.parse(JSON.stringify(e.capture()));e.dispose();
    const p=newProject();p.calculatorSessions=[{id:'saved',family,name:family,version:1,snapshot:saved}];p.activeCalculator='saved';validateProject(p,operations);
    const reopened=mount(family,saved);await pause();reopened.dispose();
  });
  await test('Mosaic: legacy catalog presets load from the packaged scripts',async()=>{
    const e=mount('mosaic');input(e,'import-catalog','minigames');
    check(node(e,'import-preset-select').options.length>0,'Preset catalog is empty');node(e,'load-import-preset').click();
    for(let i=0;i<80&&!node(e,'import-input').value.trim();i++)await pause();
    check(node(e,'import-input').value.trim().startsWith('{'),'Packaged preset did not load');e.dispose();
  });
  mounted.forEach(e=>e.dispose());document.body.dataset.testStatus=failed?'failed':'passed';
}
