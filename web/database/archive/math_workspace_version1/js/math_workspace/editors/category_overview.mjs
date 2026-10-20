// Category Assets keep their mathematical definitions. Only the overview
// projects categories and functors onto the existing variety/map scene.
export const categoryOverviewProjection = String.raw`
function __workspaceConfigureCategoryOverview() {
  refs.canvas.setAttribute('aria-label','Category and functor overview');
  refs.canvasLabels.setAttribute('aria-label','Categories and functors');
  const renderLabels=renderCanvasLabels;
  renderCanvasLabels=function(width,height) {
    renderLabels(width,height);
    for (const label of refs.canvasLabels.querySelectorAll('[data-object-kind][data-object-id]')) {
      const item=objectByKind(label.dataset.objectKind,label.dataset.objectId);
      if (!item?.__workspaceAssetKey) continue;
      label.dataset.workspaceAssetKey=item.__workspaceAssetKey;
      const kind=item.__workspaceAssetKey.split(':')[0];
      label.setAttribute('aria-label',kind+' '+latexToPlain(item.name));
    }
  };
  const setAppearanceTarget=__workspaceSetCanvasAppearanceTarget;
  __workspaceSetCanvasAppearanceTarget=function(ref) {
    // Native map handles and keyboard controls use native kinds too.
    const kind=ref?.kind==='variety'?'category':ref?.kind==='map'?'functor':ref?.kind;
    return setAppearanceTarget(ref ? {kind,id:ref.id} : null);
  };
  const renderMessage=renderCanvasMessage;
  renderCanvasMessage=function(width,height,latex) {
    return renderMessage(width,height,latex==='\\text{Add a variety}'?'\\text{Add a category}':latex);
  };
  __editor.setAssetAdapter({apply(snapshot,activeRef) {
    const assets=snapshot.assets || [];
    __workspaceAssetsCurrent=assets; __workspaceAssetsApplied=true;
    const ids=new Map(assets.map(asset=>[__workspaceAssetKey(asset),__workspaceNativeId(asset.kind==='category'?'variety':'map',asset.id)]));
    state.sheaves=[]; state.sequences=[]; state.globalInvariants=[];
    state.varieties=assets.filter(asset=>asset.kind==='category').map(asset=>{
      const name=asset.data.opposite ? '{'+asset.name+'}^{op}' : asset.name;
      return __workspaceProjectionLayout(__workspaceVarietyFromAsset({...asset,name,type:'abstract'},ids,{}),asset);
    });
    state.maps=assets.filter(asset=>asset.kind==='functor').map(asset=>__workspaceProjectionLayout({
      id:ids.get(__workspaceAssetKey(asset)),__workspaceAssetKey:__workspaceAssetKey(asset),name:asset.name,
      domainKind:'variety',domainId:ids.get(asset.data.domain),codomainKind:'variety',codomainId:ids.get(asset.data.codomain),construction:null,curve:null
    },asset));
    const key=__workspaceAssetKey(activeRef);
    state.activeVarietyId=activeRef?.kind==='category'?ids.get(key)||null:null;
    state.activeMapId=activeRef?.kind==='functor'?ids.get(key)||null:null;
    state.activeSheafId=null; state.activeSequenceId=null; state.activeGlobalInvariantId=null; state.inputMode='modify';
    __workspaceSetProjectionReadOnly(true);
    __workspaceSetCanvasAppearanceTarget(activeRef);
    renderCanvas(state.lastResult);
    __workspaceSyncCanvasAppearance();
    return true;
  }});
}
`;
