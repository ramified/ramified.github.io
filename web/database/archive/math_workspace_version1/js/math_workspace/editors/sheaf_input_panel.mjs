// Retain the historical Input DOM and constructors, with Assets as the owner.
export const sheafInputPanel=String.raw`
__workspaceVarietyFromAsset=(asset,ids,properties)=>window.MathWorkspaceSheafModel.project(asset,ids,__workspaceAssetsCurrent,properties);
__workspaceSheafFromAsset=(asset,ids,properties)=>window.MathWorkspaceSheafModel.project(asset,ids,__workspaceAssetsCurrent,properties);
__workspaceMapFromAsset=(asset,ids,properties)=>window.MathWorkspaceSheafModel.project(asset,ids,__workspaceAssetsCurrent,properties);
function __workspaceMaterializeSheaves(assets,ids){
  const done=new Set(),visiting=new Set();
  function visit(asset){
    if(done.has(__workspaceAssetKey(asset)))return;if(visiting.has(__workspaceAssetKey(asset)))throw new Error('Cyclic sheaf construction.');
    visiting.add(__workspaceAssetKey(asset));
    for(const ref of asset.dependencies||[]){const parent=assets.find(a=>__workspaceAssetKey(a)===__workspaceAssetKey(ref));if(parent?.kind==='sheaf')visit(parent);}
    const data=asset.data||{},target=state.sheaves.find(s=>s.__workspaceAssetKey===__workspaceAssetKey(asset));
    if(target&&!target.construction&&!window.MathWorkspaceSheafModel.direct.has(asset.type)){
      const get=key=>state.sheaves.find(s=>s.id===ids.get(key)),map=state.maps.find(m=>m.id===ids.get(data.map));
      const args={name:asset.name,defaultName:asset.name,nameDirty:true,baseVarietyId:target.baseVarietyId,
        left:get(data.first),right:get(data.second),source:get(data.first),target:get(data.second),parent:get(data.parent),sheaf:get(data.parent),
        multiplicity:String(data.multiplicity??2),partition:parseSchurPartition(data.partition||'2,1'),map,
        domain:state.varieties.find(v=>v.id===map?.domainId),codomain:state.varieties.find(v=>v.id===map?.codomainId),
        derived:data.exact!==true,exact:data.exact===true,proper:data.proper!==false,cleanEmbeddingConfirmed:data.confirmed===true,smoothConfirmed:data.confirmed===true};
      let fresh;
      if(['direct-sum','tensor'].includes(asset.type)){args.operation=asset.type==='tensor'?'tensor-sheaf':'direct-sum-sheaf';args.parents=(data.parents||[data.first,data.second]).map(get);args.exponents=data.exponents;fresh=createBinarySheafConstruction(args);}
      else if(['self-direct-sum','self-tensor-product'].includes(asset.type)){args.operation=asset.type;fresh=createSelfSumSheafConstruction(args);}
      else if(asset.type==='dual')fresh=createDualSheafConstruction(args);
      else if(asset.type==='internal-hom')fresh=createInternalHomSheafConstruction(args);
      else if(asset.type==='schur')fresh=createSchurSheafConstruction(args);
      else if(asset.type==='map-operation'){args.operation=data.operation==='pushforward'?'pushforward-sheaf':'pullback-sheaf';fresh=createMapSheafConstruction(args);}
      else if(asset.type==='ideal-sheaf')fresh=createIdealSheafConstruction(args);
      else if(asset.type==='normal-bundle')fresh=createNormalBundleConstruction(args);
      else if(asset.type==='conormal-bundle')fresh=createConormalBundleConstruction(args);
      else if(['relative-tangent','relative-cotangent'].includes(asset.type)){args.type=asset.type==='relative-cotangent'?'cotangent':'tangent';fresh=createRelativeSheafConstruction(args);}
      if(!fresh)throw new Error('Could not construct '+asset.name+'. Open Full Input to repair it.');
      const oldId=fresh.id,newId=target.id;
      Object.assign(target,fresh,{id:newId,__workspaceAssetKey:__workspaceAssetKey(asset),name:asset.name});
      state.sheaves=state.sheaves.filter(s=>s!==fresh);
      const rename=new Map([[oldId,newId]]);
      for(const item of [...state.varieties,...state.sheaves,...state.maps,...state.sequences]){
        if(item.construction)item.construction=window.MathWorkspaceSheafModel.remap(item.construction,rename);
        if(item.sheafIds)item.sheafIds=item.sheafIds.map(id=>rename.get(id)||id);
        if(item.domainId===oldId)item.domainId=newId;if(item.codomainId===oldId)item.codomainId=newId;
      }
    }
    visiting.delete(__workspaceAssetKey(asset));done.add(__workspaceAssetKey(asset));
  }
  assets.filter(a=>a.kind==='sheaf').forEach(visit);
}
let __workspaceFullInput=false,__workspaceInputBaseline='',__workspaceInputApplying=false,__workspaceNumberBaseline=new Map();
const __workspaceNumberValue=n=>JSON.stringify([n.name,n.hasValue,n.value,n.replaceWithValue,n.positive]);
function __workspaceInputGraph(){
  const entries=__workspaceCollectAssets();
  for(const entry of entries){
    const item=[...state.varieties,...state.sheaves,...state.maps].find(s=>s.id===entry.nativeId),c=item.construction;
    if(entry.kind==='variety'&&c?.type==='product')entry.type='product';
    if(entry.kind==='sheaf'&&c){
      if(c.internalHom)entry.type='internal-hom';else if(['direct-sum','tensor','dual','self-direct-sum','self-tensor-product','schur'].includes(c.type))entry.type=c.type;
      else if(['pullback','pushforward'].includes(c.type))entry.type='map-operation';
      else if(c.idealSheafMapId)entry.type='ideal-sheaf';else if(c.normalBundleMapId)entry.type='normal-bundle';else if(c.conormalBundleMapId)entry.type='conormal-bundle';
      else if(c.relativeSheafMapId)entry.type=c.relativeSheafType==='cotangent'?'relative-cotangent':'relative-tangent';
    }
    if(entry.kind==='map')entry.type=c?.type==='composition'?'composition':c?.type==='abel-jacobi'?'abel-jacobi':item.domainKind==='sheaf'?'sheaf':'ordinary';
  }
  return {entries,numbers:state.globalInvariants.filter(n=>n.auto!==true).map(n=>{
      const asset=__workspaceAssetsCurrent.find(a=>a.kind==='number'&&(__workspaceAssetKey(a)===n.__workspaceAssetKey||window.MathWorkspaceNumbers.symbol(a)===n.name));
      if(!asset)return __workspaceClone(n);
      const changed=__workspaceNumberBaseline.has(n.id)&&__workspaceNumberBaseline.get(n.id)!==__workspaceNumberValue(n);
      return {...__workspaceClone(n),__workspaceAssetKey:__workspaceAssetKey(asset),name:n.name===window.MathWorkspaceNumbers.symbol(asset)?asset.name:n.name,
        ...(!changed?{hasValue:asset.data.hasValue,value:asset.data.value,replaceWithValue:asset.data.replaceWithValue,positive:asset.data.positive}:{})};
    }),
    sequences:__workspaceClone(state.sequences),activeKey:[...state.sheaves,...state.maps,...state.varieties].find(s=>[state.activeSheafId,state.activeMapId,state.activeVarietyId].includes(s.id))?.__workspaceAssetKey||'',
    activeNativeId:state.activeSheafId||state.activeMapId||state.activeVarietyId||null};
}
function __workspaceInputSignature(){const graph=__workspaceInputGraph();return JSON.stringify({entries:graph.entries.map(e=>({assetKey:e.assetKey,nativeId:e.nativeId,kind:e.kind,name:e.name,type:e.type,data:e.data})),numbers:graph.numbers,sequences:graph.sequences});}
__editor.extendAssetAdapter(previous=>({...previous,
  apply(snapshot,activeRef,properties,binding){
    __workspaceInputApplying=true;
    try{
      const result=previous.apply(snapshot,activeRef,properties,binding);
      if(__workspaceFullInput){
        __workspaceSetProjectionReadOnly(false);
        state.nextObjectId=Math.max(state.nextObjectId,...[...state.varieties,...state.sheaves,...state.maps,...state.sequences].map(s=>Number(/^[A-Za-z]+(\d+)$/.exec(s.id)?.[1]||0)+1));
        if(activeRef){const id=__workspaceNativeId(activeRef.kind,activeRef.id);activateObject(activeRef.kind,id,{mode:'modify',loadDraft:true});}
        else {state.inputMode='create';syncInputModeControls();}
        __workspaceNumberBaseline=new Map(state.globalInvariants.map(n=>[n.id,__workspaceNumberValue(n)]));__workspaceInputBaseline=__workspaceInputSignature();
      }
      return result;
    }finally{__workspaceInputApplying=false;}
  },
  panel(config){
    if(config.operation!=='sheaf-input')return previous.panel?.(config)??false;
    __workspaceFullInput=true;
    const input=document.getElementById('input-card');__editor.setCardVisible('input-card',true);
    input.classList.remove('calculator-card-user-hidden','workspace-card-hidden');input.hidden=false;
    const style=document.createElement('style');style.textContent='.workspace-full-input{display:grid;grid-template-columns:minmax(260px,1fr) minmax(280px,1.4fr);height:100%;gap:10px}.workspace-full-input>#input-card{height:auto;max-height:100%;overflow:auto}.workspace-full-input>.sheaf-stage{min-height:340px;height:100%!important}.workspace-native-surface[data-surface-role="view"] .workspace-native-content:has(.workspace-full-input){overflow:auto}@media(max-width:800px){.workspace-full-input{grid-template-columns:1fr;height:auto}.workspace-full-input>.sheaf-stage{height:360px!important}}';document.head.append(style);
    const content=document.createElement('div');content.className='workspace-full-input';content.append(input,refs.canvas.closest('.sheaf-stage'));
    __editor.mountObjectSurfaces({content:[content]});__workspaceSetProjectionReadOnly(false);return true;
  },
  io(action,value){
    if(action==='input-graph')return __workspaceInputGraph();
    if(action==='input-changed')return __workspaceFullInput&&!__workspaceInputApplying&&__workspaceInputSignature()!==__workspaceInputBaseline;
    if(action==='input-ack'){
      const ids=value.ids||value;
      for(const item of [...state.varieties,...state.sheaves,...state.maps,...state.globalInvariants])if(ids?.[item.id])item.__workspaceAssetKey=ids[item.id];
      if(value.assets)__workspaceAssetsCurrent=value.assets;
      __workspaceNumberBaseline=new Map(state.globalInvariants.map(n=>[n.id,__workspaceNumberValue(n)]));
      __workspaceInputBaseline=__workspaceInputSignature();return true;
    }
    return previous.io?.(action,value);
  }
}));
`;
