// Workspace-only viewport adapters. Logical coordinates and Assets stay owned
// by each calculator; fitting is derived presentation state, never serialized.
const helpers=String.raw`
function __viewportStyle(css){const node=document.createElement('style');node.textContent=css;document.head.append(node);}
function __viewportCanvasSize(canvas,width,height){
  canvas.style.setProperty('width',width+'px','important');
  canvas.style.setProperty('height',height+'px','important');
  canvas.style.setProperty('min-height','0','important');
  canvas.style.setProperty('max-width','none','important');
}
function __viewportFit(canvas,width,height){
  const size=__editor.getViewport(),scale=Math.min(size.width/width,size.height/height);
  if(scale>0)__viewportCanvasSize(canvas,width*scale,height*scale);
}
`;
const centered=String.raw`__viewportStyle('.workspace-native-content>div{padding:0!important;display:flex;align-items:center;justify-content:center;overflow:hidden!important}');`;
const legacy=helpers+String.raw`
__viewportStyle('.workspace-editor-layout .workspace-view-card{display:flex;flex-direction:column;overflow:hidden!important}.workspace-view-card>.panel-title,.workspace-view-card>.calculator-underbar{flex:none}.workspace-view-card>.panel-title{flex-wrap:wrap}.workspace-view-card>.panel-title .canvas-toolbar{flex-wrap:wrap;min-width:0}.workspace-view-card #canvas-wrap,.workspace-view-card>.sheaf-workspace,.workspace-view-card>.ramification-stage{flex:1;min-height:0!important;height:auto!important;overflow:hidden!important;padding:0!important;position:relative}.workspace-view-card #canvas-wrap{display:flex;align-items:center;justify-content:center}');
function __viewportFitLayer(layer,width,height){
  const size=__editor.getViewport(),scale=Math.min(1,size.width/width,size.height/height);
  if(!(scale>0))return;
  Object.assign(layer.style,{position:'absolute',left:((size.width-width*scale)/2)+'px',top:((size.height-height*scale)/2)+'px',transformOrigin:'0 0',transform:'scale('+scale+')'});
}
`;
export const viewportPanels={
  'js/mosaic_calculator.js':legacy+String.raw`
const __viewportOriginalResize=resizeCanvas;
resizeCanvas=function(){
  __viewportOriginalResize();
  if(!geometry)return;__viewportFit(refs.canvas,geometry.width,geometry.height);
  // Recompute backing resolution for the fitted CSS size (same logical board).
  __viewportOriginalResize();
};
document.addEventListener('DOMContentLoaded',()=>__editor.setViewportElement(refs.canvasWrap));
__editor.setAssetAdapter({viewport:()=>{resizeCanvas();draw(poincareReport);}});
`,
  'js/place_ramification_calculator.js':legacy+String.raw`
const __viewportOriginalDraw=drawCanvas;
drawCanvas=function(field){
  __viewportOriginalDraw(field);
  const canvas=$('ramification-canvas'),layer=$('ramification-diagram-wrap'),ratio=window.devicePixelRatio||1;
  __viewportFitLayer(layer,canvas.width/ratio,canvas.height/ratio);
};
document.addEventListener('DOMContentLoaded',()=>__editor.setViewportElement(document.querySelector('.ramification-stage')));
__editor.setAssetAdapter({viewport:()=>{const field=activeField();if(!field.error)drawCanvas(field);}});
`,
  'js/sheaf_complex_calculator.js':legacy+String.raw`
const __viewportOriginalRender=renderCanvas;
renderCanvas=function(result){
  const layer=refs.canvas?.parentElement;if(!layer)return;
  const size=__editor.getViewport();layer.style.width=Math.max(1,size.width)+'px';
  __viewportOriginalRender(result);
  layer.style.height=state.canvasHeight+'px';__viewportFitLayer(layer,state.canvasWidth,state.canvasHeight);
};
document.addEventListener('DOMContentLoaded',()=>__editor.setViewportElement(document.querySelector('.sheaf-workspace')));
__editor.setAssetAdapter({viewport:()=>renderCanvas(state.lastResult)});
`,
  'js/young_diagrams.js':helpers+centered+String.raw`
const __viewportOriginalResize=resize;
resize=function(){
  if(!document.querySelector('.workspace-native-surface'))return __viewportOriginalResize();
  const size=__editor.getViewport();if(size.width<1||size.height<1)return;
  const cols=isGeneralizedCanvasActive()?generalizedSideCols()*2:gridCols,rows=isGeneralizedCanvasActive()?generalizedBoardRows():gridRows;
  bsize=Math.min(size.width/Math.max(1,cols),size.height/Math.max(1,rows));W=bsize*cols;H=bsize*rows;
  __viewportCanvasSize(canvasEl,W,H);
  canvasEl.width=Math.max(1,Math.round(W*size.dpr));canvasEl.height=Math.max(1,Math.round(H*size.dpr));
  ctx.setTransform(size.dpr,0,0,size.dpr,0,0);redraw();
};
__editor.setAssetAdapter({viewport:()=>resize()});
`,
  'js/dynkin_diagram_calculator.js':helpers+centered+String.raw`
const __viewportOriginalDraw=drawDynkin;
drawDynkin=function(){__viewportOriginalDraw();if(document.querySelector('.workspace-native-surface'))__viewportFit($('dynkin-canvas'),CANVAS_WIDTH,CANVAS_HEIGHT);};
__editor.setAssetAdapter({viewport:()=>drawDynkin()});
`,
  'js/strand_diagram_calculator.js':helpers+String.raw`
__viewportStyle('.workspace-native-content>div{padding:0!important}.workspace-native-content canvas{min-height:0!important}');
const __viewportDesiredCanvasSize=desiredCanvasSize;
desiredCanvasSize=function(canvas){
  const size=__editor.getViewport();
  if(document.querySelector('.workspace-native-surface')&&state.strandSizeMode!=='fixed'&&size.width>0&&size.height>0)return {width:size.width,height:size.height,scrollAxes:{x:false,y:false}};
  return __viewportDesiredCanvasSize(canvas);
};
__editor.setAssetAdapter({viewport:()=>{resizeCanvas();renderCanvas();}});
`,
  'js/category_calculator.js':helpers+String.raw`
__viewportStyle('.workspace-native-content>div{padding:0!important}.workspace-native-content canvas{min-height:0!important}');
const __viewportOriginalResize=resizeCanvas;
resizeCanvas=function(){
  if(!document.querySelector('.workspace-native-surface'))return __viewportOriginalResize();
  const size=__editor.getViewport();if(size.width<1||size.height<1)return;
  const canvas=refs.canvas;state.canvasWidth=size.width;state.canvasHeight=size.height;
  __viewportCanvasSize(canvas,size.width,size.height);canvas.width=Math.round(size.width*size.dpr);canvas.height=Math.round(size.height*size.dpr);
  canvas.getContext('2d').setTransform(size.dpr,0,0,size.dpr,0,0);
};
__editor.setAssetAdapter({viewport:()=>{resizeCanvas();renderCanvas();}});
`,
  'js/higher_dimensional_slice_explorer.js':helpers+String.raw`
__viewportStyle('.workspace-native-content>div{padding:0!important}.workspace-native-content canvas{min-height:0!important}');
const __viewportOriginalResize=resizeCanvas;
resizeCanvas=function(){
  if(!document.querySelector('.workspace-native-surface'))return __viewportOriginalResize();
  const size=__editor.getViewport();if(size.width<1||size.height<1)return;
  const canvas=$('slice-viewport');__viewportCanvasSize(canvas,size.width,size.height);
  canvas.width=Math.max(1,Math.round(size.width*size.dpr));canvas.height=Math.max(1,Math.round(size.height*size.dpr));draw();
};
__editor.setAssetAdapter({viewport:()=>resizeCanvas()});
`
};
