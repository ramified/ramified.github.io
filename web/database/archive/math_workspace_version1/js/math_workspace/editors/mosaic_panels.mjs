// Runs inside the original Mosaic closure, retaining its canvas and handlers.
export const mosaicObjectPanel=String.raw`
let __mosaicConfig={},__mosaicAsset=null,__mosaicAssets=[],__mosaicProjected='',__mosaicCard=null,__mosaicNativeBaseline='',__mosaicBackgroundBaseline='';
const __mosaicKey=a=>a?a.kind+':'+a.id:'';
const __mosaicProperty=()=>window.MathWorkspaceMosaic.propertyPanels.find(panel=>panel.id===__mosaicConfig.operation);
const __mosaicTools=()=>__mosaicConfig.mode==='input'?window.MathWorkspaceMosaic.editTools[__mosaicConfig.assetKind]:null;
// Reuse native handlers, but constrain their modes to the bound object's owner.
const __mosaicNormalizeMode=normalizeInputMode;
normalizeInputMode=function(mode){
  const tools=__mosaicTools();
  if(!tools)return __mosaicNormalizeMode(mode);
  if(__mosaicConfig.assetKind==='mosaic-space')return 'background';
  if(mode==='background')return 'background'; // Pieces are valid on every background mode.
  return __mosaicNormalizeMode(tools.modes.includes(mode)?mode:'draw');
};
const __mosaicBackgroundControls=syncBackgroundModeControls;
syncBackgroundModeControls=function(){
  const tools=__mosaicTools();
  if(tools&&!tools.actions.includes(state.backgroundAction))state.backgroundAction=tools.actions[0];
  __mosaicBackgroundControls();
};
const __mosaicDrawControls=updateDrawModeControls;
updateDrawModeControls=function(){
  const previous=state.inputMode;
  __mosaicDrawControls();
  const tools=__mosaicTools();if(!tools)return;
  state.inputMode=normalizeInputMode(previous);refs.inputMode.value=state.inputMode;
  refs.diagramTypeRow.hidden=__mosaicConfig.assetKind==='mosaic-space';
  refs.inputModeRow.hidden=__mosaicConfig.assetKind==='mosaic-space';
  if(refs.inputBackgroundOption){refs.inputBackgroundOption.hidden=false;refs.inputBackgroundOption.disabled=false;}
  updateInputModePanels();syncBackgroundModeControls();
};
const __mosaicStatistics=updateStatisticsChart;
updateStatisticsChart=function(report){
  if(__mosaicConfig.operation==='mosaic-diagram-statistics'){
    const previous=state.inputMode;state.inputMode='draw';try{__mosaicStatistics(report);}finally{state.inputMode=previous;}return;
  }
  if(__mosaicConfig.operation==='mosaic-statistics')refs.out.openEndsRow.hidden=false;
  __mosaicStatistics(report);
  if(__mosaicConfig.operation==='mosaic-statistics'&&!isGluedBoundaryMode()){
    refs.out.tilesLabel.textContent='Existing tiles';refs.out.tiles.textContent=(state.rows*state.cols-state.removedTiles.size)+'/'+(state.rows*state.cols);
    refs.out.openEndsRow.hidden=true;refs.out.componentsRow.hidden=true;
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  const toolbar=document.querySelector('.canvas-toolbar'),save=document.createElement('button');
  save.type='button';save.className='btn btn-ghost';save.dataset.mosaicSaveAssets='';save.textContent='Save to Assets';
  save.addEventListener('click',()=>options.onCollectAssets?.());toolbar.append(save);
});
function __mosaicPayload(){
  return {rows:state.rows,cols:state.cols,lattice:state.lattice,boundary:state.boundaryMode,backgroundMetric:state.backgroundMetric,
    removedTiles:removedTilesForExport(),cutEdges:cutEdgesForExport(),gluedEdges:gluedEdgesForExport(),diagramType:state.diagramType,
    tiles:state.tiles.map((tile,index)=>({row:Math.floor(index/state.cols)+1,col:index%state.cols+1,tile:cloneTile(tile),decoration:vertexDecorationValue(index)})),
    halfEdgeDecorations:{...state.halfEdgeDecorations},inputHoles:inputHolesForExport(),pieces:presetPiecesForExport(),pieceSets:pieceSetsForExport(),
    sokoban:sokobanDecorationsForExport()||{},lianliankan:lianliankanDecorationsForExport()||{},hex:hexDecorationsForExport()||{},billiards:billiardsDecorationsForExport()||{}};
}
__editor.setAssetAdapter({
  panel(config){
    __mosaicConfig=config;
    document.querySelector('[data-mosaic-save-assets]')?.remove();
    const style=document.createElement('style');
    style.textContent='.workspace-native-content #canvas-wrap{height:100%;min-height:0;display:flex;align-items:center;justify-content:center}.workspace-native-content>.card-body{padding:8px}.workspace-native-content .input-mode-panel{max-width:100%}';document.head.append(style);
    const property=__mosaicProperty();
    if(config.mode==='input'||config.operation==='mosaic-view'||property?.canvas){
      const toolbar=document.querySelector('.canvas-toolbar');
      __editor.mountObjectSurfaces({content:[refs.canvasWrap],toolbar:config.mode==='input'?[toolbar]:[]});
      if(config.mode==='input'){
        const input=refs.inputMode.closest('.card').querySelector('.card-body');
        __editor.mountObjectSurfaces({modify:[input]});
        if(config.assetKind==='mosaic-diagram'){
          toolbar.hidden=true;
          toolbar.querySelectorAll('input,select,button').forEach(control=>{control.disabled=true;});
          refs.inputBackgroundOption.textContent='Pieces';
        }else{
          refs.diagramTypeRow.hidden=true;refs.inputModeRow.hidden=true;
        }
        const tools=__mosaicTools();
        [...refs.inputMode.options].forEach(option=>{if(!tools.modes.includes(option.value))option.remove();});
        [...refs.backgroundAction.options].forEach(option=>{if(!tools.actions.includes(option.value))option.remove();});
        if(config.assetKind==='mosaic-diagram')refs.backgroundAction.closest('.mosaic-inline-row').hidden=true;
        // Experimental controls have their own property panels, not input surfaces.
        for(const id of ['background-billiard-row','wander-open-row','background-cusp-marker-row'])document.getElementById(id)?.remove();
      }else {
        if(!property?.canvas||config.operation==='mosaic-seifert')refs.canvas.style.pointerEvents='none';
        if(property?.canvas){
          __mosaicCard=document.getElementById(config.marker);
          const bodies=[__mosaicCard.querySelector('.card-body')];
          if(config.operation==='mosaic-metric'){
            const metric=document.createElement('label');metric.className='mosaic-inline-row';metric.textContent='Background geometry ';
            metric.append(refs.backgroundMetricToggle);bodies[0].prepend(metric);
          }
          if(['mosaic-homology-cords','mosaic-local-geometry'].includes(config.operation))bodies.unshift(document.getElementById('homology-card').querySelector('.card-body'));
          __editor.mountObjectSurfaces({modify:bodies});
        }
      }
    }else{
      __mosaicCard=document.getElementById(config.marker);
      __mosaicCard.hidden=false;__mosaicCard.classList.remove('collapsed','workspace-card-hidden','calculator-card-user-hidden');
      __editor.mountObjectSurfaces({modify:[__mosaicCard.querySelector('.card-body')]});
    }
    if(property?.owner==='mosaic-space'){
      refs.pickHomologyKnot?.closest('label')?.remove();
      if(refs.homologyKnotResult)refs.homologyKnotResult.hidden=true;
    }
    // Disabled or removed controls cannot trigger stale native listeners.
    for(const type of ['input','change'])document.addEventListener(type,event=>{
      if(__mosaicConfig.mode==='input'&&event.target.disabled){event.stopImmediatePropagation();event.preventDefault();}
    },true);
    return true;
  },
  apply(snapshot,ref,properties,binding){
    const key=__mosaicKey(ref||binding?.refs?.asset);__mosaicAssets=snapshot.assets;
    __mosaicAsset=snapshot.assets.find(a=>__mosaicKey(a)===key);if(!__mosaicAsset)return false;
    const payload=window.MathWorkspaceMosaic.payload(__mosaicAsset,snapshot.assets),signature=JSON.stringify(payload);
    if(signature!==__mosaicProjected){
      const localWanderMetric=__mosaicConfig.operation==='mosaic-wander'&&wanderViewMode==='complete-interior';
      applyImportedMosaic({...payload,...(localWanderMetric?{backgroundMetric:'complete-interior'}:{}),inputMode:__mosaicAsset.kind==='mosaic-space'?'background':'draw'});
      __mosaicProjected=signature;
      __mosaicNativeBaseline=JSON.stringify(__mosaicPayload());
      __mosaicBackgroundBaseline=JSON.stringify(window.MathWorkspaceMosaic.fromPayload('mosaic-space',__mosaicPayload()));
    }
    if(__mosaicConfig.assetKind==='mosaic-space')setInputMode('background');
    if(__mosaicConfig.operation==='mosaic-seifert'){state.showSeifertSurface=true;syncSeifertSurfaceControls();draw(analyze());}
    if(['mosaic-homology','mosaic-homology-cords','mosaic-local-geometry'].includes(__mosaicConfig.operation)){if(!state.homologyTrace.length)setInputMode('pick');updateReport(false);}
    if(__mosaicConfig.operation==='mosaic-wander'){state.wanderOpen=true;syncWanderControls();setInputMode('pick');renderWanderChart();}
    if(__mosaicConfig.operation==='mosaic-metric')setInputMode('pick');
    return true;
  },
  collect(){
    if(!__mosaicAsset||__mosaicConfig.mode!=='input')return null;
    if(window.MathWorkspaceMosaic.issues(__mosaicAsset,__mosaicAssets).length)return null;
    const payload=__mosaicPayload();
    if(JSON.stringify(payload)===__mosaicNativeBaseline)return null;
    if(__mosaicAsset.kind==='mosaic-diagram'){
      const background=window.MathWorkspaceMosaic.fromPayload('mosaic-space',payload);
      if(JSON.stringify(background)!==__mosaicBackgroundBaseline){
        applyImportedMosaic({...window.MathWorkspaceMosaic.payload(__mosaicAsset,__mosaicAssets),inputMode:'draw'});
        return null;
      }
    }
    const data=window.MathWorkspaceMosaic.fromPayload(__mosaicAsset.kind,payload,__mosaicAsset.data.space);
    const next={...__mosaicAsset,data};
    __mosaicProjected=JSON.stringify(window.MathWorkspaceMosaic.payload(next,__mosaicAssets));
    __mosaicNativeBaseline=JSON.stringify(payload);
    __mosaicBackgroundBaseline=JSON.stringify(window.MathWorkspaceMosaic.fromPayload('mosaic-space',payload));
    return {type:__mosaicAsset.type,data};
  },
  capture:()=>({}),
  result:()=>({text:__mosaicCard?.textContent||refs.statusLine?.textContent||'',hasResult:true}),
  io(action){if(action==='validate')return __mosaicAsset?.data;if(action==='mosaic-payload')return __mosaicPayload();}
});
`;
