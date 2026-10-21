import {chrome} from './linear_category_panels.mjs';

export const slicingObjectPanel = chrome + String.raw`
const __sliceModel = () => window.MathWorkspaceSlicing;
const __copySlice = value => JSON.parse(JSON.stringify(value));
let __sliceSnapshot = {assets:[]}, __sliceRef = null, __sliceBinding = {}, __sliceFrame = null, __sliceTarget = null;
let __sliceApplying = false, __sliceRendering = false, __sliceNotifyQueued = false;
const __sliceLayers = new Map(), __sliceInputModes = new Map();
let __sliceSceneUI = null;
const __sceneObjects = () => state.objects.filter(object=>object.id!==__key(__sliceFrame)&&(__sliceBinding.references?.nodes||[]).includes(object.id));
let __sliceSourceSignature = '', __sliceFrameSignature = '', __sliceRawFrame = null;
const __originalSliceRender = renderAll, __originalReadouts = updateReadouts, __originalDirectFrame = applyDirectFrameRows, __originalSliceDraw = draw;
const __originalSourceLabel=sourceLabel;
sourceLabel=function(object) {return objectTypeKey(object)==='workspace-frame'?'frame':__originalSourceLabel(object);};
function __sliceFrameData() {
  return {ambientDimension:state.ambientDim,position:state.p.slice(),basis:frameRows(state.frame).map(row=>row.slice())};
}
function __withOrthonormalFrame(action) {
  const raw=state.frame, candidate=orthonormalizeFrameColumns(raw,state.ambientDim);
  if (!candidate.ok) throw new Error(candidate.error);
  __sliceRawFrame=raw; state.frame=candidate.frame;
  try { return action(); } finally { state.frame=raw; __sliceRawFrame=null; }
}
draw = function() { return __panelConfig.mode && __panelConfig.mode!=='kernel' ? __withOrthonormalFrame(()=>__originalSliceDraw()) : __originalSliceDraw(); };
const __originalDynkinPicker=buildDynkinReferencePicker, __originalSliceParams=rebuildObjectParams;
const __originalLatticeParams=buildLatticeParams;
buildLatticeParams=function(container,object) {
  if(__panelConfig.mode==='input'&&__panelConfig.assetKind==='lattice'&&['matrix-input','matrix-object'].includes(object.data.basisMode))return;
  return __originalLatticeParams(container,object);
};
buildDynkinReferencePicker=function(...args) { if(!__panelConfig.mode)return __originalDynkinPicker(...args); };
rebuildObjectParams=function() {
  if(__panelConfig.operation!=='slicing-display') return __originalSliceParams();
  const host=$('object-params'),object=activeObject();host.replaceChildren();if(!object)return;
  const control=(label,key,options)=>{
    const row=document.createElement('label');row.className='slice-control-line';row.append(document.createTextNode(label+' '));
    const input=document.createElement(options?'select':'input');input.setAttribute('aria-label',label);
    if(options) {for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value;input.append(option);}input.value=object.data[key];}
    else {input.type='checkbox';input.checked=object.data[key]!==false;}
    input.addEventListener('change',()=>{object.data[key]=options?input.value:input.checked;renderAll();});row.append(input);host.append(row);
  };
  const type=objectTypeKey(object);
  if(type==='lattice') {control('Lattice points','showLatticePoints');buildLatticeBoundControls(host,object);}
  if(type==='tropical-polynomial') {control('Tropical districts','showDistricts');control('District label density','tropicalDistrictLabelDensity',['all','active']);}
  if(type==='weyl-chambers') {control('Weyl chambers','showChambers');control('Weyl labels','weylLabelMode',['permutation','word','length','kl','kl-v1']);control('Weyl label density','weylLabelDensity',['all','active']);}
};
updateReadouts = function() {
  if (!__sliceRawFrame) return __originalReadouts();
  const computational=state.frame; state.frame=__sliceRawFrame;
  try { __originalReadouts(); } finally { state.frame=computational; }
};
applyDirectFrameRows = function(rows,nextP,message) {
  if(!__panelConfig.mode) return __originalDirectFrame(rows,nextP,message);
  const data=__sliceModel().normalize('frame','frame',{ambientDimension:state.ambientDim,position:nextP||state.p,basis:rows});
  state.p=data.position; state.frame=columnsFromRows(data.basis); state.lastWarning=message;
  syncDirectInputFields({force:true}); renderAll();
};
function __sliceNative(asset,all) {
  const model=__sliceModel(),key=__key(asset),d=model.materialize(asset,all).data,n=d.ambientDimension??d.rows??state.ambientDim;
  const get=key=>all.find(a=>__key(a)===key);
  let data;
  if(asset.kind==='frame') {
    data={objectType:'workspace-frame',kind:'geometry',ambientDimension:n,points:[],edges:[],rays:d.basis[0].map((_,i)=>({origin:d.position.slice(),direction:d.basis.map(row=>row[i]),length:Math.hypot(...d.basis.map(row=>row[i])),label:'v_'+(i+1)}))};
  } else if(asset.kind==='variety'&&asset.type==='toric') {
    const parent=get(d.fan||d.cone); if(!parent) throw new Error('Choose the toric construction source.');
    data=__copySlice(__sliceNative(parent,all).data);
    if(parent.kind==='cone') { data={...makeToricFanData(n),constructionMode:'cone-list',coneSourceIds:[__key(parent)],cones:[{id:__key(parent),label:parent.name,sourceId:__key(parent),generators:__copySlice(parent.data.generators)}]}; }
  } else if(asset.kind==='matrix') {
    const value=model.materialize(asset,all); data=makeMatrixData(n); data.matrixRows=model.rows(value.data.entries,n,'Matrix');
  } else if(asset.kind==='lie') data=makeDynkinTypeData(d.rank,d.family.charAt(0));
  else {
    const type=asset.kind==='polytope'?asset.type:model.nativeTypes[asset.kind]; if(!type) return null;
    data=makeObjectData(type,n,{family:d.family});
    Object.assign(data,__copySlice(d),{objectType:type});
    if(asset.kind==='formula') Object.assign(data,compileFormulaRelation(d.formula,n));
    if(asset.kind==='tropical') Object.assign(data,compileTropicalPolynomial(d.tropicalInput,d.tropicalConvention,n));
    if(d.lie) { const lie=get(d.lie); if(!lie) throw new Error('Missing Lie type.'); Object.assign(data,{dynkinSourceId:d.lie,dynkinType:lie.data.family.charAt(0),dynkinRank:lie.data.rank}); }
    if(asset.kind==='lattice') {
      if(d.basisMode==='matrix-object') data.matrixSourceId=d.matrix;
      if(d.basisMode==='dynkin') data.basisRows=latticeBasisRowsFromDynkin(data,n);
      if(d.basisMode==='lmfdb-field'&&d.lmfdbField) data.basisRows=lmfdbBasisRowsFromField(d.lmfdbField,d.embeddingCoordinateMode,n);
    }
    if(asset.kind==='voronoi') {data.latticeSourceId=d.lattice;data.latticePoint=get(d.point).data.position.slice();}
    if(asset.kind==='fan') {
      data.coneSourceIds=d.cones||[]; data.characterLatticeSourceId=d.characterLattice;
      data.cones=d.constructionMode==='preset'?toricFanPresetCones(d.preset,n).map(c=>cloneToricFanCone(c,n)):(d.cones||[]).map(key=>{const cone=get(key);if(!cone) throw new Error('Missing cone.');return {id:key,label:cone.name,sourceId:key,generators:__copySlice(cone.data.generators)};});
    }
  }
  const type=data.objectType,defaults=OBJECT_TYPES.find(t=>t.key===type)||OBJECT_TYPES[3];
  const layer=__sliceLayers.get(key)||{};
  Object.assign(data,__sliceInputModes.get(key)||{});
  // Enumeration extent and label rendering belong to this view.
  if(layer.data) Object.assign(data,layer.data);
  return {id:key,name:asset.name,kind:data.kind||'geometry',data:{...data,name:asset.name},visibleProjection:layer.visibleProjection??!isProjectionlessSourceType(type),visibleSlice:layer.visibleSlice??supportsExact2DSliceType(type),labels:!!layer.labels,style:{color:defaults.color,opacity:.85,pointSize:defaults.pointSize,lineWidth:defaults.lineWidth,...layer.style}};
}
function __rememberSliceViews() {
  for(const object of state.objects) {
    const data={}; for(const key of ['showDistricts','tropicalDistrictLabelDensity','tropicalNotationMode','showChambers','weylLabelMode','weylElementDisplayMode','weylLabelDensity','showLatticePoints','latticeBoundShape','latticeBoundRadius']) if(Object.hasOwn(object.data,key)) data[key]=object.data[key];
    // Dependency-only objects remain hidden without overwriting the user's layer choices.
    const previous=__sliceLayers.get(object.id)||{};
    __sliceLayers.set(object.id,{...previous,style:{...object.style},labels:object.labels,data,...(!object.__dependency?{visibleProjection:object.visibleProjection,visibleSlice:object.visibleSlice}:{})});
    const modes={}; for(const key of ['positionInputMode','vectorInputMode','centerInputMode','basisInputMode','formulaInputMode','generatorInputMode','generatorImportOrientation']) if(Object.hasOwn(object.data,key)) modes[key]=object.data[key];
    __sliceInputModes.set(object.id,modes);
  }
}
function __collectSlice() {
  if(__sliceFrame && (__sliceTarget?.kind==='frame'||['slicing-scene','geometry-view'].includes(__panelConfig.operation))) return {kind:'frame',assetKey:__key(__sliceFrame),type:'frame',data:__sliceFrameData()};
  if(!__sliceTarget||!__sliceModel().isAsset(__sliceTarget)||__sliceTarget.kind==='variety') return null;
  const object=state.objects.find(o=>o.id===__key(__sliceTarget)); if(!object) return null;
  const d={...object.data};
  if(d.dynkinSourceId) d.lie=d.dynkinSourceId;
  if(__sliceTarget.kind==='lattice') d.matrix=d.matrixSourceId;
  if(__sliceTarget.kind==='voronoi') {d.lattice=d.latticeSourceId;d.point=__sliceTarget.data.point;}
  if(__sliceTarget.kind==='fan') { d.cones=d.coneSourceIds; d.characterLattice=d.characterLatticeSourceId; }
  return {type:__sliceTarget.type,data:__sliceModel().normalize(__sliceTarget.kind,__sliceTarget.type,d)};
}
function __sliceNotify() {
  if(__sliceApplying||!__panelConfig.mode||__panelConfig.mode==='kernel'||__panelConfig.mode==='io'||__sliceNotifyQueued) return;
  __sliceNotifyQueued=true;
  queueMicrotask(()=>{__sliceNotifyQueued=false;if(!__sliceApplying)__editor.notifyChange({interaction:'object-preview'});});
}
function __slicePinTabs() {
  const op=__panelConfig.operation;
  if(op==='cone-input') setToricTab('build');
  else if(op==='cone-faces') setToricTab('faces');
  else if(op==='cone-variety') setToricTab('variety');
  if(op==='fan-input') setToricFanTab('build');
  else if(op==='fan-orbits') setToricFanTab('fan');
  else if(op==='fan-divisors') setToricFanTab('divisors');
  if(__panelCard) __panelCard.hidden=false;
}
renderAll = function() {
  if(!__panelConfig.mode||__panelConfig.mode==='kernel') return __originalSliceRender();
  if(__sliceRendering) return;
  __sliceRendering=true;
  try {
    __originalSliceRender(); __slicePinTabs();
    const visible=__sceneObjects();
    for(const control of document.querySelectorAll('[data-layer-control]')){const count=visible.filter(object=>!!object[control.dataset.layerControl]).length;control.checked=visible.length>0&&count===visible.length;control.indeterminate=count>0&&count<visible.length;control.disabled=!visible.length;}
    if(__sliceSceneUI) {
      const object=state.objects.find(object=>object.id===__key(__sliceFrame));
      __sliceSceneUI.frame.textContent=__sliceFrame?(__sliceFrame.plainName||__sliceFrame.name)+' · '+state.ambientDim+'D':'Choose a frame';
      __sliceSceneUI.count.textContent=visible.length+' displayed';
      for(const control of __sliceSceneUI.frameControls) {control.checked=!!object?.[control.dataset.frameControl];control.disabled=!object;}
      __sliceSceneUI.clear.disabled=!visible.length;
      __sliceSceneUI.collect.disabled=!__sliceFrame;
    }
    if(__panelConfig.operation==='lattice-character') __renderBoundCharacter();
  } finally { __sliceRendering=false; }
  __sliceNotify();
};
function __renderBoundCharacter() {
  const refs=__sliceBinding.references||{},get=k=>__sliceSnapshot.assets.find(a=>__key(a)===k),point=get(refs.point),lattice=state.objects.find(o=>o.id===refs.lattice);
  if(!point||!lattice) return;
  const ambient=point.data.position;
  try {
    const coeffs=multiplyMatrixVector(inverseMatrix(lattice.data.basisRows,'Lattice basis'),ambient);
    if(coeffs.some(x=>Math.abs(x-Math.round(x))>1e-7)) { $('slice-weight-info-out').textContent='The selected point is not an integral point of this lattice.'; return; }
    const candidate={objectId:lattice.id,objectName:lattice.name,label:point.name,ambient,latticePoint:true,latticeCoefficients:coeffs.map(Math.round)};
    if(!refs.variety&&lattice.data.basisMode!=='dynkin') {$('slice-weight-info-out').textContent='Lattice coordinates: ('+candidate.latticeCoefficients.join(', ')+'). Choose a toric variety to compute its character and principal divisor.';return;}
    renderWeightInfoCard(candidate);
  } catch(error) { $('slice-weight-info-out').textContent=error.message; }
}
const __originalCharacterFan=toricCharacterFanForCandidate;
toricCharacterFanForCandidate=function(candidate) {
  if(__panelConfig.operation!=='lattice-character')return __originalCharacterFan(candidate);
  const refs=__sliceBinding.references||{},object=state.objects.find(o=>o.id===refs.variety);
  if(!object||!candidate?.latticeCoefficients)return null;
  const coordinates=candidate.latticeCoefficients;
  if(object.data.characterLatticeSourceId&&object.data.characterLatticeSourceId!==refs.lattice)return {object,coordinates,error:'This variety uses a different character lattice. Choose the referenced lattice.'};
  return {object,coordinates,analysis:toricFanAnalysis(object)};
};
const __originalSliceObjectSelect=syncObjectSelect;
syncObjectSelect=function() {
  __originalSliceObjectSelect();if(__panelConfig.operation!=='slicing-display')return;
  const select=$('object-select');for(const option of [...select.options])if(option.value===__key(__sliceFrame)||state.objects.find(o=>o.id===option.value)?.__dependency)option.remove();
  if(![...select.options].some(o=>o.value===state.activeObjectId)){state.activeObjectId=select.options[0]?.value||null;select.value=state.activeObjectId||'';}
};
function __sliceApply(snapshot,ref,binding={}) {
  const model=__sliceModel(),all=snapshot.assets||[],refs=binding.references||{};
  const target=all.find(a=>__key(a)===__key(ref));
  const frame=all.find(a=>__key(a)===refs.frame&&a.kind==='frame')||(target?.kind==='frame'?target:null);
  const primary=target||all.find(a=>__key(a)===(refs.cone||refs.fan||refs.variety||refs.lattice));
  const primaryData=primary?model.materialize(primary,all).data:null;
  const n=frame?.data.ambientDimension??primaryData?.ambientDimension??primaryData?.rows??(Number(primaryData?.dimension)||4);
  if(n<2||n>8) throw new Error('The slicing renderer supports dimensions 2–8.');
  const changedDimension=state.ambientDim!==n;
  let current; try { current=__collectSlice(); } catch(_) {}
  const sameTarget=__key(target)===__key(__sliceTarget);
  const incoming=target?JSON.stringify(target.data):'';
  const unchangedTarget=sameTarget&&incoming===JSON.stringify(current?.data);
  const sourceSignature=JSON.stringify([refs,all.map(a=>[__key(a),a.name,a.type,a.data])]);
  __rememberSliceViews(); __sliceSnapshot=snapshot; __sliceRef=ref; __sliceBinding=binding; __sliceTarget=target||null; __sliceFrame=frame||null;
  __sliceApplying=true;
  try {
    state.ambientDim=n; state.sliceDim=2;
    if(frame) { state.p=frame.data.position.slice();state.frame=columnsFromRows(frame.data.basis); }
    else {state.p=Array(n).fill(0);state.frame=identityFrame(n);}
    if(changedDimension) {state.activeDirection=defaultDirection(n);state.rotationPair=defaultRotationPair(n);rebuildDynamicControls();}
    if(sourceSignature!==__sliceSourceSignature) {
      const selected=new Set(refs.nodes|| (primary?[__key(primary)]:[]));
      if(__panelConfig.mode==='scene'&&frame) selected.add(__key(frame));
      if(__panelConfig.operation==='lattice-character'&&refs.variety) selected.add(refs.variety);
      const old=new Map(state.objects.map(o=>[o.id,o]));
      state.objects=all.filter(a=>{if(!(model.isAsset(a)||['matrix','lie'].includes(a.kind)))return false;try{const d=model.materialize(a,all).data;return (d.ambientDimension??d.rows??d.rank??Number(d.dimension))===n;}catch(_){return false;}}).flatMap(a=>{
        if(model.inputIssues(a,all).length) return [];
        let object;
        if(unchangedTarget&&!['frame','voronoi'].includes(a.kind)&&__key(a)===__key(target)&&old.has(__key(a))) object=old.get(__key(a)); else object=__sliceNative(a,all);
        if(!object) return [];
        if(__panelConfig.mode==='scene'&&__key(a)===__key(frame)) {
          const layer=__sliceLayers.get(object.id);
          object.visibleProjection=layer?.visibleProjection??true;object.visibleSlice=false;
        }
        object.__dependency=!selected.has(object.id); if(object.__dependency){object.visibleProjection=false;object.visibleSlice=false;}
        return [object];
      });
      __sliceSourceSignature=sourceSignature;
    }
    const nativeTarget=primary&&state.objects.find(o=>o.id===__key(primary));
    if(nativeTarget) state.activeObjectId=nativeTarget.id;
    else if(!state.objects.some(o=>o.id===state.activeObjectId)) state.activeObjectId=state.objects[0]?.id||null;
    if(refs.nodes&&!refs.nodes.includes(state.activeObjectId))state.activeObjectId=refs.nodes.find(key=>state.objects.some(o=>o.id===key))||null;
    state.sourceMode='modify';
    if(!unchangedTarget&&nativeTarget&&target?.kind!=='frame') syncObjectPanel();
    if(__panelConfig.operation==='slicing-display') {syncObjectSelect();syncObjectPanel();}
    if(frame&&JSON.stringify(frame.data)!==__sliceFrameSignature) {syncDirectInputFields();__sliceFrameSignature=JSON.stringify(frame.data);}
    if(!sameTarget) { clearVectorTargetSession();clearWeylInteraction();state.selectedVertex=null;state.activeToricFace=null; }
    renderAll(); return true;
  } finally {__sliceApplying=false;}
}
function __sliceResult() {
  const refs=__sliceBinding.references||{},op=__panelConfig.operation;
  const result={hasResult:true,text:__panelCard?.querySelector('.card-body')?.innerText||'',frame:__sliceFrame?__sliceFrameData():null};
  if(['slicing-scene','geometry-view'].includes(op)) __withOrthonormalFrame(()=>{result.sliceBasis=frameRows(state.frame.slice(0,2));result.coordinates='orthonormal slice coordinates';result.objects=__sceneObjects().map(o=>({asset:o.id,slice:o.visibleSlice?exactSliceData(o):null}));});
  if(['cone-faces','cone-variety','fan-orbits','fan-divisors'].includes(op)) {const o=activeObject();if(o){const a=objectTypeKey(o)==='toric-fan'?toricFanAnalysis(o):toricConeAnalysis(o);result.hasResult=a?.status!=='pending';result.analysis=__copySlice(a);}}
  if(op==='lattice-character') result.point=refs.point;
  return result;
}
function __sliceView(value) {
  if(value) {
    __sliceApplying=true;
    try {
      if(__panelConfig.operation==='slicing-display'||__panelConfig.operation==='slicing-debug') {
        __sliceApply(value.context,value.ref,value.binding); __sliceApplying=true;
      }
      Object.assign(state.viewport,value.viewport||{});
      for(const [key,layer] of value.layers||[]) {
        __sliceLayers.set(key,__copySlice(layer)); const o=state.objects.find(o=>o.id===key); if(!o) continue;
        Object.assign(o,{style:{...o.style,...layer.style},labels:!!layer.labels});if(!o.__dependency) Object.assign(o,{visibleProjection:!!layer.visibleProjection,visibleSlice:!!layer.visibleSlice});Object.assign(o.data,layer.data||{});
      }
      renderAll();
    } finally {__sliceApplying=false;}
  }
  __rememberSliceViews();
  return {viewport:{...state.viewport},layers:[...__sliceLayers.entries()],context:__sliceSnapshot,ref:__sliceRef,binding:__sliceBinding};
}
__editor.setAssetAdapter({
  panel(config) {
    __panelConfig=config;state.autoSchmidt=false;
    __panelStyle('[data-import-export-trigger]{display:none!important}#toric-cone-tabs,#toric-fan-tabs{display:none!important}.workspace-object-content .slice-row:has(#source-mode-controls),.workspace-object-content .slice-row:has(#source-add-object),.workspace-object-content .slice-row:has(#object-name),.workspace-object-content .slice-row:has(#object-select){display:none!important}');
    $('ambient-dimension').disabled=true;
    let card;
    if(config.mode==='input') {
      __panelStyle('#toric-cone-summary,#toric-fan-summary{display:none!important}.slice-matrix-panel,.slice-vector-panel,.slice-direct-panel{border:0!important;padding:0!important;background:transparent!important}');
      if(config.assetKind==='frame') card=$('slide-input-mode-controls').closest('.card');
      else if(config.assetKind==='cone') card=$('slice-toric-cone-card');
      else if(config.assetKind==='fan') card=$('slice-toric-fan-card');
      else if(config.assetKind!=='variety') card=$('object-params').closest('.card');
      __panelStyle('.workspace-object-content .slice-row:has(#object-color),.workspace-object-content .slice-row:has(#object-visible-projection){display:none!important}');
      __panelStyle('[aria-label="Lattice basis mode"],.slice-control-line:has([aria-label="Matrix object basis source"]),.slice-control-line:has([aria-label="Voronoi lattice source"]),#toric-fan-source-mode,#toric-fan-cone-list-panel,.slice-row:has(#toric-fan-character-lattice){display:none!important}#object-params .slice-inline-check,[aria-label="Weyl label mode"],[aria-label="Weyl label density"],[aria-label="Tropical district label density"],.slice-row:has([aria-label="Lattice point bound shape"]){display:none!important}');
    } else if(config.mode==='property') {
      card=$(config.marker)?.closest('.card');
      if(config.operation==='slicing-display') {
        const source=$('object-params').closest('.card');__showCard(source);
        const style=document.createElement('style');style.textContent='.workspace-object-content .slice-row:has(#object-select){display:flex!important}#object-delete,#object-export{display:none!important}';__editor.inspectorShadow.append(style);
      }
    }
    if(card) {__showCard(card);if(config.mode==='input')__editor.mountObjectSurfaces({modify:[card.querySelector('.card-body')]});}
    if(config.mode==='scene') {
      const group=(title,key)=>{const node=document.createElement('div');node.className='workspace-scene-control-group';node.dataset.sceneControlGroup=key;node.setAttribute('role','group');node.setAttribute('aria-label',title);const heading=document.createElement('strong');heading.textContent=title;node.append(heading);return node;};
      const view=group('View','view');
      for(const node of [$('screen-zoom')?.closest('.slice-control-line'),$('show-axes')?.closest('label')]) if(node)view.append(node);
      const frame=group('Frame','frame'),name=document.createElement('span');name.className='workspace-scene-frame-name';frame.append(name);
      const frameControls=[];
      for(const [text,key]of [['Basis vectors','visibleProjection'],['Labels','labels']]) {
        const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.frameControl=key;check.setAttribute('aria-label','Frame: '+text);
        check.addEventListener('change',()=>{const object=state.objects.find(object=>object.id===__key(__sliceFrame));if(object)object[key]=check.checked;renderAll();});label.append(check,document.createTextNode(text));frame.append(label);frameControls.push(check);
      }
      const layers=group('Geometric objects','objects'),count=document.createElement('span');count.className='workspace-scene-object-count';count.setAttribute('aria-live','polite');layers.append(count);
      for(const [text,key]of [['Projection','visibleProjection'],['2D slice','visibleSlice'],['Labels','labels']]){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.layerControl=key;check.setAttribute('aria-label','Geometric objects: '+text);check.addEventListener('change',()=>{for(const object of __sceneObjects())object[key]=check.checked;renderAll();});label.append(check,document.createTextNode(text));layers.append(label);}
      const action=(text,key,title)=>{const button=document.createElement('button');button.type='button';button.className='btn btn-ghost';button.dataset.sceneAction=key;button.textContent=text;button.title=title;button.setAttribute('aria-label',title);button.addEventListener('click',()=>options.onOverviewAction?.(key));layers.append(button);return button;};
      const clear=action('Clear','clear','Remove geometric objects from this display'),collect=action('Collect','collect','Collect valid objects with the same ambient dimension as the selected frame');
      __sliceSceneUI={frame:name,count,frameControls,clear,collect};
      __panelStyle('.workspace-native-surface .workspace-native-toolbar{align-items:flex-start;max-height:48%;gap:6px 16px}.workspace-scene-control-group{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;min-width:0}.workspace-scene-control-group>strong{font-size:.75rem;color:var(--muted);font-weight:600}.workspace-scene-control-group label{display:inline-flex;align-items:center;gap:4px;margin:0}.workspace-scene-control-group input[type="checkbox"]{margin:0}.workspace-scene-control-group .slice-control-line{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:0}.workspace-scene-control-group #screen-zoom{width:110px;min-width:70px;flex:initial}.workspace-scene-frame-name{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.workspace-scene-object-count{font-size:.75rem;color:var(--muted)}.workspace-scene-control-group .btn{padding:3px 8px}');
      __editor.mountObjectSurfaces({content:[$('slice-viewport').parentElement],toolbar:[view,frame,layers]});
      $('clear-canvas').hidden=true;
    }
    if(config.assetKind==='frame'||config.operation==='frame-details') {const note=document.createElement('p');note.className='workspace-frame-note';note.textContent='Frame: point p and all ordered basis vectors. The slice is p + span(v1, v2); drawing uses an orthonormal basis of that plane.';(__panelCard?.querySelector('.card-body')||__editor.shadow.querySelector('.slice-layout')||__editor.host).append(note);}
    return true;
  },
  apply:(snapshot,ref,properties,binding)=>__sliceApply(snapshot,ref,binding),
  collect:__collectSlice,
  capture:()=>({viewport:{...state.viewport},layers:[...__sliceLayers.entries()]}),
  result:__sliceResult,
  io(action,value) {
    if(action==='view') return __sliceView(value);
    if(action==='geometry') return {p:state.p.slice(),frame:frameRows(state.frame),picks:state.pickCandidates.map(c=>({objectId:c.objectId,ambient:c.ambient,label:c.label}))};
    if(action==='lie-matrix') { const previous=state.ambientDim;state.ambientDim=value.lie.rank;try{return dynkinMatrixRows(value.lie.family.charAt(0),value.basis,value.lie.rank);}finally{state.ambientDim=previous;} }
    if(action==='validate') {
      const {asset}=value,n=asset.data.ambientDimension;if(asset.kind==='formula')return compileFormulaRelation(asset.data.formula,n);if(asset.kind==='tropical')return compileTropicalPolynomial(asset.data.tropicalInput,asset.data.tropicalConvention,n);return true;
    }
    if(action==='export') {
      const a=__sliceTarget;
      if(a?.kind==='frame') return value==='latex'?'p='+vectorToTex(state.p)+'\nB='+matrixToTex(frameRows(state.frame)):JSON.stringify(__sliceFrameData(),null,2);
      return __panelConfig.mode==='property'?__sliceResult().text:JSON.stringify(a?.data||__sliceResult(),null,2);
    }
    if(action==='result') return __sliceResult();
  }
});
`;
