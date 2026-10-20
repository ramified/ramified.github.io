// Shared overview presentation: retain center-anchored editable curves, trim
// only the painted path, and keep label backgrounds below the arrow strokes.
export const overviewArrowPresentation = String.raw`
function __workspaceConfigureOverviewArrows() {
  const projectLayout=__workspaceProjectionLayout;
  __workspaceProjectionLayout=function(item,asset) {
    const map=Object.hasOwn(item,'domainId') && Object.hasOwn(item,'codomainId');
    const previous=map && state.maps.find(value=>value.__workspaceAssetKey===item.__workspaceAssetKey);
    const endpointsChanged=previous && ['domainKind','domainId','codomainKind','codomainId'].some(key=>previous[key]!==item[key]);
    // Old world-space curves belong to the previous endpoints. Preserve
    // visibility, but regenerate shape and label placement for a new binding.
    const projected=projectLayout(item,endpointsChanged ? {...asset,viewPosition:{hidden:asset.viewPosition?.hidden}} : asset);
    if (map && (endpointsChanged || (isSelfMap(projected) && projected.curve && (isStraightMapCurve(projected.curve) || projected.curve.anchors?.length<3)))) {
      projected.curve=null;projected.defaultBendPx=0;projected.modified=false;
      projected.labelT=DEFAULT_MAP_LABEL_T;projected.labelOffset=DEFAULT_MAP_LABEL_OFFSET;
    }
    return projected;
  };
  // Use the object center consistently for geometry and its reflected
  // incoming handle. Label-edge clipping is only a painting operation.
  selfMapEndpoint=(anchor,label)=>({x:label.x,y:label.y});
  const preserveHandles=preserveEndpointHandlesForMovedObject;
  preserveEndpointHandlesForMovedObject=function(kind,id,dx,dy,width,height) {
    if (!kind || !id || (Math.abs(dx)<.001 && Math.abs(dy)<.001)) return;
    preserveHandles(kind,id,dx,dy,width,height);
    const shift=point=>({x:point.x+dx/Math.max(1,width),y:point.y+dy/Math.max(1,height)});
    for (const map of state.maps) {
      if (map.domainKind!==kind || map.domainId!==id || !isSelfMap(map) || !map.curve || isStraightMapCurve(map.curve)) continue;
      const lastIndex=map.curve.anchors.length-1;
      map.curve.anchors=map.curve.anchors.map((anchor,index)=>index===0 || index===lastIndex ? shift(anchor) : anchor);
      // The native updater translates only the endpoint handles. Interior
      // anchors and handles stay fixed while the two ends follow the object.
      map.modified=true;
    }
  };
  const standardHandles=standardMapHandles;
  standardMapHandles=function(anchors,width,height,bendPx=0) {
    const handles=standardHandles(anchors,width,height,bendPx);
    if (anchors.length<3) return handles;
    return handles.map((handle,index)=>{
      const anchor=anchorToPoint(anchors[index],width,height),point=anchorToPoint(handle,width,height);
      const dx=point.x-anchor.x,dy=point.y-anchor.y,length=Math.hypot(dx,dy);
      if (length<1e-6) return handle;
      const neighbors=[anchors[index-1],anchors[index+1]].filter(Boolean).map(value=>anchorToPoint(value,width,height));
      const spacing=Math.min(...neighbors.map(value=>Math.hypot(value.x-anchor.x,value.y-anchor.y)));
      // A tight turn can have a tiny neighbor-to-neighbor tangent despite
      // widely spaced anchors. Keep that direction but give it useful reach.
      const reach=Math.max(length*1.5,spacing*.5),scale=reach/length;
      return {x:(anchor.x+dx*scale)/width,y:(anchor.y+dy*scale)/height};
    });
  };
  mapCurveGeometry=function(map,from,to,width,height) {
    const raw=mapRawCurveGeometry(map,from,to,width,height);
    return raw ? clipBezierPathByLabels(raw,from,to) : null;
  };
  const scene=__workspaceSceneView.scene;
  const backgrounds=document.createElement('div');
  backgrounds.className='workspace-overview-label-backgrounds';
  backgrounds.setAttribute('aria-hidden','true');
  scene.insertBefore(backgrounds,refs.canvas);
  const style=document.createElement('style');
  style.textContent='.workspace-overview-label-backgrounds{position:absolute;inset:0;z-index:0;pointer-events:none}.workspace-overview-label-backgrounds>*{pointer-events:none!important;box-sizing:border-box;padding:0}.workspace-sheaf-scene:has(>.workspace-overview-label-backgrounds)>#sheaf-canvas{position:absolute;left:0;top:0;z-index:1;background:transparent!important;pointer-events:none}.workspace-sheaf-scene:has(>.workspace-overview-label-backgrounds)>.sheaf-canvas-labels{z-index:2}.workspace-sheaf-scene:has(>.workspace-overview-label-backgrounds)>.sheaf-canvas-labels>.sheaf-canvas-label{background:transparent!important;border-color:transparent!important;box-shadow:none!important}';
  document.head.append(style);
  // The stage supplies the paper color. A transparent canvas lets the label
  // backgrounds remain visible beneath its arrows without covering glyphs.
  drawCanvasBackground=()=>{};
  function syncBackgrounds() {
    const labels=[...refs.canvasLabels.querySelectorAll('.sheaf-canvas-label')];
    backgrounds.replaceChildren();
    for (const label of labels) {
      const background=document.createElement('div');
      background.className=label.className;
      Object.assign(background.style,{left:label.style.left,top:label.style.top,width:label.offsetWidth+'px',height:label.offsetHeight+'px',maxWidth:label.style.maxWidth});
      backgrounds.append(background);
      // Resolve the calculator's existing styles, then drop its interactive
      // label classes so selectors and accessibility only see the real text.
      const computed=window.getComputedStyle(background);
      const paint={background:computed.backgroundColor,border:computed.border,borderRadius:computed.borderRadius,boxShadow:computed.boxShadow,position:'absolute',transform:'translate(-50%,-50%)'};
      background.className='workspace-overview-label-background';
      Object.assign(background.style,paint);
    }
  }
  const sizes=new ResizeObserver(syncBackgrounds);
  const labelsChanged=new MutationObserver(()=>{
    sizes.disconnect();
    refs.canvasLabels.querySelectorAll('.sheaf-canvas-label').forEach(label=>sizes.observe(label));
    syncBackgrounds();
  });
  labelsChanged.observe(refs.canvasLabels,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  const renderLabels=renderCanvasLabels;
  renderCanvasLabels=function(width,height) {
    const result=renderLabels(width,height);syncBackgrounds();return result;
  };
}
`;
