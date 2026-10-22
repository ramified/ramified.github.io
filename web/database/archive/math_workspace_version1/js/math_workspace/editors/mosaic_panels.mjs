// Runs inside the original Mosaic closure, retaining its canvas and handlers.
export const mosaicObjectPanel=String.raw`
let __mosaicConfig={},__mosaicAsset=null,__mosaicAssets=[],__mosaicProjected='',__mosaicCard=null;
const __mosaicKey=a=>a?a.kind+':'+a.id:'';
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
    if(config.mode==='input'||config.operation==='mosaic-view'||config.operation==='mosaic-seifert'||config.operation==='mosaic-homology'){
      const toolbar=document.querySelector('.canvas-toolbar');
      __editor.mountObjectSurfaces({content:[refs.canvasWrap],toolbar:config.mode==='input'?[toolbar]:[]});
      if(config.mode==='input'){
        const input=refs.inputMode.closest('.card').querySelector('.card-body');
        __editor.mountObjectSurfaces({modify:[input]});
        if(config.assetKind==='mosaic-diagram'){
          toolbar.hidden=true;
          for(const value of ['background','import']){const option=refs.inputMode.querySelector('option[value="'+value+'"]');if(option)option.remove();}
        }else{
          refs.diagramTypeRow.hidden=true;refs.inputModeRow.hidden=true;
          // Space editing owns topology; decorations belong to diagrams.
          for(const value of ['decoration','billiard']){const option=refs.backgroundAction.querySelector('option[value="'+value+'"]');if(option)option.remove();}
        }
      }else {
        if(config.operation!=='mosaic-homology')refs.canvas.style.pointerEvents='none';
        if(config.operation==='mosaic-seifert'||config.operation==='mosaic-homology'){
          __mosaicCard=document.getElementById(config.marker);
          __editor.mountObjectSurfaces({modify:[__mosaicCard.querySelector('.card-body')]});
        }
      }
    }else{
      __mosaicCard=document.getElementById(config.marker);
      __mosaicCard.hidden=false;__mosaicCard.classList.remove('collapsed','workspace-card-hidden','calculator-card-user-hidden');
      __editor.mountObjectSurfaces({modify:[__mosaicCard.querySelector('.card-body')]});
    }
    return true;
  },
  apply(snapshot,ref,properties,binding){
    const key=__mosaicKey(ref||binding?.refs?.asset);__mosaicAssets=snapshot.assets;
    __mosaicAsset=snapshot.assets.find(a=>__mosaicKey(a)===key);if(!__mosaicAsset)return false;
    const payload=window.MathWorkspaceMosaic.payload(__mosaicAsset,snapshot.assets),signature=JSON.stringify(payload);
    if(signature!==__mosaicProjected){
      applyImportedMosaic({...payload,inputMode:__mosaicAsset.kind==='mosaic-space'?'background':'draw'});
      __mosaicProjected=signature;
    }
    if(__mosaicConfig.assetKind==='mosaic-space'&&isGluedBoundaryMode())setInputMode('background');
    if(__mosaicConfig.operation==='mosaic-seifert'){state.showSeifertSurface=true;syncSeifertSurfaceControls();draw(analyze());}
    if(__mosaicConfig.operation==='mosaic-homology'){if(!state.homologyTrace.length)setInputMode('pick');updateReport(false);}
    return true;
  },
  collect(){
    if(!__mosaicAsset||__mosaicConfig.mode!=='input')return null;
    const data=window.MathWorkspaceMosaic.fromPayload(__mosaicAsset.kind,__mosaicPayload(),__mosaicAsset.data.space);
    const next={...__mosaicAsset,data};
    __mosaicProjected=JSON.stringify(window.MathWorkspaceMosaic.payload(next,__mosaicAssets));
    return {type:__mosaicAsset.type,data};
  },
  capture:()=>({}),
  result:()=>({text:__mosaicCard?.textContent||refs.statusLine?.textContent||'',hasResult:true}),
  io(action){if(action==='validate')return __mosaicAsset?.data;if(action==='mosaic-payload')return __mosaicPayload();}
});
`;
