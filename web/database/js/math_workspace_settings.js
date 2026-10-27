(function(root){
  'use strict';
  const prefix='ramified.calculatorInputSettings.v1.',key='ramified.mathWorkspace.settings.v1';
  const records=new Map(),backends=new Map();let values={},dialog,select,body,active,help;
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
    active=null;
    if(!select.value)return;
    const id=select.value;let backend=backends.get(id);
    if(!backend){const host=document.createElement('section'),inspector=document.createElement('section');host.className='workspace-settings-engine';inspector.hidden=true;body.append(host,inspector);const editor=root.MathWorkspaceNativeEditors.factories[id].mount(host,{id:'workspace-settings-'+id,inspectorHost:inspector});editor.setCanvasActive(false);editor.setInspectorActive(false);backend={host,editor};backends.set(id,backend);}
    active=backend;backend.host.hidden=false;
    if(!backend.editor.openInputSettings())body.dataset.empty='true';else delete body.dataset.empty;
  }
  function open(){
    if(!dialog){dialog=document.createElement('dialog');dialog.className='workspace-settings-dialog';dialog.setAttribute('aria-labelledby','workspace-settings-title');
      const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');title.id='workspace-settings-title';title.textContent='Workspace Settings';close.type='button';close.className='btn btn-ghost';close.textContent='Close';close.addEventListener('click',()=>dialog.close());header.append(title,close);
      select=document.createElement('select');select.className='workspace-control';select.setAttribute('aria-label','Shortcuts for visible editors');select.addEventListener('change',choose);
      help=document.createElement('p');help.className='workspace-settings-help';
      body=document.createElement('div');body.className='workspace-settings-body';dialog.append(header,help,select,body);document.body.append(dialog);
      dialog.addEventListener('close',()=>{for(const {session,settingsOnly}of records.values())if(settingsOnly)session.close();for(const backend of backends.values())backend.editor.setCanvasActive(false);});
    }
    // Settings follow actual visible editors, not the complete legacy factory catalog.
    // Detached card surfaces may live in their own shadow root outside inspectorHost.
    const visible=node=>!!node?.isConnected&&node.getClientRects().length>0;
    const pages=new Set([...records.values()].filter(record=>!record.settingsOnly&&(visible(record.host)||visible(record.inspectorHost)||visible(record.session.content))).map(record=>record.page));
    const previous=select.value;
    select.replaceChildren(...Object.entries(root.MathWorkspaceNativeEditors.factories).filter(([,factory])=>pages.has(factory.metadata?.page)).map(([id,factory])=>new Option(factory.metadata.en,id)));
    if([...select.options].some(option=>option.value===previous))select.value=previous;
    select.hidden=!select.options.length;
    help.textContent=select.options.length?'Keyboard shortcuts and gesture hints for visible editors. Use Add panel to manage workspace panels.':'Open an editor to configure its keyboard shortcuts. Use Add panel to add workspace panels.';
    dialog.showModal();choose();
  }
  root.MathWorkspaceSettings={storage,register,open,capture:()=>({version:1,values:clone(values)}),validate:normalize,restore,
    sessions:records};
  document.getElementById('workspace-settings')?.addEventListener('click',open);
})(window);
