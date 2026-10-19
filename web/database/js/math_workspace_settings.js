(function(root){
  'use strict';
  const prefix='ramified.calculatorInputSettings.v1.',key='ramified.mathWorkspace.settings.v1';
  const records=new Map(),backends=new Map();let values={},dialog,select,body,active;
  try{values=JSON.parse(root.localStorage.getItem(key)||'{}');}catch(_){}
  if(!values||typeof values!=='object'||Array.isArray(values))values={};
  const clone=value=>JSON.parse(JSON.stringify(value));
  function save(){try{root.localStorage.setItem(key,JSON.stringify(values));}catch(_){} }
  function publish(storageKey,value){
    values[storageKey]=value;save();
    for(const {session} of records.values())if(session.storageKey===storageKey){session.data=JSON.parse(value);session.refresh();}
  }
  const storage={getItem:k=>values[k]??null,setItem:(k,v)=>publish(String(k),String(v)),removeItem:k=>{delete values[k];save();}};
  function register(page,session,context){const token={};records.set(token,{page,session,...context});return()=>{session.capture=null;records.delete(token);};}
  function normalize(saved){
    if(saved==null)return null;
    if(!saved||saved.version!==1||!saved.values||typeof saved.values!=='object'||Array.isArray(saved.values))throw new Error('Invalid workspace input settings.');
    const next={};for(const [name,value] of Object.entries(saved.values)){if(!name.startsWith(prefix)||typeof value!=='string')throw new Error('Invalid workspace shortcut settings.');const parsed=JSON.parse(value);if(!parsed||parsed.version!==1||!parsed.profiles||typeof parsed.profiles!=='object'||Array.isArray(parsed.profiles))throw new Error('Invalid workspace shortcut profile.');next[name]=value;}
    return next;
  }
  function restore(saved){
    const next=normalize(saved);if(next===null)return;
    values=next;save();for(const {session}of records.values()){session.data=JSON.parse(values[session.storageKey]||'{"version":1,"profiles":{},"cardVisibility":{}}');session.refresh();}
  }
  function choose(){
    if(active){for(const record of records.values())if(record.host===active.host)record.session.close();active.host.hidden=true;active.editor.setCanvasActive(false);}
    const id=select.value;let backend=backends.get(id);
    if(!backend){const host=document.createElement('section'),inspector=document.createElement('section');host.className='workspace-settings-engine';inspector.hidden=true;body.append(host,inspector);const editor=root.MathWorkspaceNativeEditors.factories[id].mount(host,{id:'workspace-settings-'+id,inspectorHost:inspector});editor.setCanvasActive(false);editor.setInspectorActive(false);backend={host,editor};backends.set(id,backend);}
    active=backend;backend.host.hidden=false;
    if(!backend.editor.openInputSettings())body.dataset.empty='true';else delete body.dataset.empty;
  }
  function open(){
    if(!dialog){dialog=document.createElement('dialog');dialog.className='workspace-settings-dialog';dialog.setAttribute('aria-labelledby','workspace-settings-title');
      const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='workspace-settings-title';title.textContent='Workspace Settings';close.type='button';close.className='btn btn-ghost';close.textContent='Close';close.addEventListener('click',()=>dialog.close());header.append(title,close);
      select=document.createElement('select');select.className='workspace-control';select.setAttribute('aria-label','Interaction category');for(const [id,factory]of Object.entries(root.MathWorkspaceNativeEditors.factories)){if(id==='production')continue;select.append(new Option(factory.metadata?.en||({young:'Young diagrams',matrix:'Matrices',slice:'Projection / 2D Slice',dynkin:'Dynkin diagrams',strand:'Strands',category:'Categories'}[id])||id,id));}select.value='young';select.addEventListener('change',choose);
      body=document.createElement('div');body.className='workspace-settings-body';dialog.append(header,select,body);document.body.append(dialog);
      dialog.addEventListener('close',()=>{for(const {session,settingsOnly}of records.values())if(settingsOnly)session.close();for(const backend of backends.values())backend.editor.setCanvasActive(false);});
    }
    dialog.showModal();choose();
  }
  root.MathWorkspaceSettings={storage,register,open,capture:()=>({version:1,values:clone(values)}),validate:normalize,restore,
    sessions:records};
  document.getElementById('workspace-settings')?.addEventListener('click',open);
})(window);
