// Use the existing sheaf scene and its authoritative Assets projection. The
// full calculator and the object display share drawing, geometry and hit tests.
export const sheafDiagramPanel = String.raw`
__editor.setAssetAdapter({panel(config) {
  if (config.operation !== 'sheaf-view') return false;
  const style = document.createElement('style');
  style.textContent = '.workspace-native-content>.sheaf-stage{height:100%!important;min-height:0!important;padding:0!important;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;background:#fffdf8}';
  document.head.append(style);
  refs.clearCanvas.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();options.onOverviewAction?.('clear');},{capture:true});
  const setProjectionReadOnly = __workspaceSetProjectionReadOnly;
  __workspaceSetProjectionReadOnly = function(locked) { setProjectionReadOnly(locked); refs.clearCanvas.disabled=false; };
  const collect = document.querySelector('[data-workspace-collect-assets]');
  if (collect) collect.title = 'Show all variety, sheaf and map Assets on this overview';
  // Selection and dragging change this view's presentation only. Creation and
  // deletion remain Assets actions, including when a label is dragged outside.
  removeCanvasObject = () => false;
  startMapCanvasDrag = () => {};
  selectObject = function(kind,id,redraw=true) {
    const item = objectByKind(kind,id);
    if (!item?.__workspaceAssetKey) return false;
    state.activeVarietyId = kind==='variety' ? id : kind==='sheaf' ? item.baseVarietyId : null;
    state.activeSheafId = kind==='sheaf' ? id : null;
    state.activeMapId = kind==='map' ? id : null;
    state.activeSequenceId = null; state.activeGlobalInvariantId = null;
    state.inputMode = 'modify';
    __workspaceSetCanvasAppearanceTargetFromNative(kind,id);
    if (redraw) {
      const focused = refs.canvasLabels.getRootNode().activeElement?.closest('[data-object-kind][data-object-id]');
      const focusId = focused?.dataset.objectId, focusKind = focused?.dataset.objectKind;
      renderCanvas(state.lastResult);
      if (focusId) [...refs.canvasLabels.querySelectorAll('[data-object-kind][data-object-id]')].find(label=>label.dataset.objectId===focusId&&label.dataset.objectKind===focusKind)?.focus({preventScroll:true});
    } else {
      for (const label of refs.canvasLabels.querySelectorAll('[data-object-kind][data-object-id]')) label.classList.toggle('is-active',label.dataset.objectKind===kind&&label.dataset.objectId===id);
    }
    options.onSelectAsset?.({kind,id:item.__workspaceAssetKey.slice(item.__workspaceAssetKey.indexOf(':')+1)});
    return true;
  };
  const startLabelDrag = startCanvasLabelDrag;
  startCanvasLabelDrag = function(target,event) {
    const result = startLabelDrag(target,event);
    if (state.labelDrag) selectObject(target.dataset.objectKind,target.dataset.objectId,false);
    return result;
  };
  __editor.mountObjectSurfaces({content:[refs.canvas.closest('.sheaf-stage')]});
  const fitWholeScene = __workspaceUpdateSceneTransform;
  __workspaceUpdateSceneTransform = function() {
    const stage = __workspaceSceneStage(), scene = __workspaceSceneView?.scene;
    if (!stage || !scene || !stage.clientWidth || !stage.clientHeight) return false;
    // Keep the pointer-to-scene transform steady throughout a drag.
    if (state.labelDrag || state.mapControlDrag) return true;
    const points = [];
    for (const label of refs.canvasLabels.querySelectorAll('.sheaf-canvas-label,.sheaf-map-control')) {
      if (!label.offsetWidth || !label.offsetHeight) continue;
      const x = label.offsetLeft, y = label.offsetTop;
      points.push({x:x-label.offsetWidth/2,y:y-label.offsetHeight/2},{x:x+label.offsetWidth/2,y:y+label.offsetHeight/2});
    }
    const labels = canvasObjectLabels(__workspaceSceneCanonical.width,__workspaceSceneCanonical.height);
    for (const map of visibleCanvasMaps()) {
      const endpoints = mapEndpointLabels(map,labels);
      if (!endpoints) continue;
      const path = mapRawCurveGeometry(map,endpoints.from,endpoints.to,__workspaceSceneCanonical.width,__workspaceSceneCanonical.height);
      for (const segment of path?.segments || []) points.push(segment.start,segment.c1,segment.c2,segment.end);
    }
    const valid = points.filter(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y));
    if (!valid.length) return fitWholeScene();
    const left = Math.min(...valid.map(p=>p.x)), right = Math.max(...valid.map(p=>p.x));
    const top = Math.min(...valid.map(p=>p.y)), bottom = Math.max(...valid.map(p=>p.y));
    const width = stage.clientWidth, height = stage.clientHeight;
    const scale = Math.min(1.25,Math.max(1,width-48)/Math.max(1,right-left),Math.max(1,height-48)/Math.max(1,bottom-top));
    const offsetX = width/2-(left+right)*scale/2, offsetY = height/2-(top+bottom)*scale/2;
    scene.style.transform = 'translate('+offsetX+'px,'+offsetY+'px) scale('+scale+')';
    __workspaceSceneView = {...__workspaceSceneView,width,height,scale,offsetX,offsetY};
    return true;
  };
  let fitQueued = false;
  new MutationObserver(()=>{
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(()=>{fitQueued=false;__workspaceUpdateSceneTransform();});
  }).observe(refs.canvasLabels,{childList:true,subtree:true});
  __editor.setAssetAdapter({
    layout: () => allCanvasObjects().filter(item=>item.__workspaceAssetKey).map(item=>({
      key:item.__workspaceAssetKey,active:item.__workspaceAssetKey===__workspaceAppearanceTargetKey,
      point:__workspaceRecordKind(item)==='map'
        ? {x:Number(item.labelT),y:Number(item.labelOffset),mode:'map-curve',curve:__workspaceClone(item.curve),defaultBendPx:Number(item.defaultBendPx),modified:item.modified===true,hidden:item.hiddenOnCanvas===true}
        : {x:Number(item.labelX),y:Number(item.labelY),hidden:item.hiddenOnCanvas===true}
    })),
    capture: () => ({layout:__editor.captureAssetLayout()}),
    result: () => ({text:__workspaceAssetsCurrent.map(asset=>asset.name).join('\n')}),
    io(action,ref) {
      if (action === 'selection') {
        const item = __workspaceAppearanceObject();
        return item ? {kind:__workspaceRecordKind(item),id:item.__workspaceAssetKey.slice(item.__workspaceAssetKey.indexOf(':')+1)} : null;
      }
      if (action === 'select') return selectObject(ref.kind,__workspaceNativeId(ref.kind,ref.id));
      if (action === 'hide') { const item=allCanvasObjects().find(item=>item.__workspaceAssetKey===ref); if(item)hideCanvasObject(__workspaceRecordKind(item),item.id); return !!item; }
    }
  });
  __workspaceUpdateSceneTransform();
  return true;
}});
`;

// Workspace adapters execute inside the historical calculators' lexical scopes.
// They expose typed object projection without changing standalone source pages.
const common = String.raw`
let __objectPanel = null, __objectCard = null, __objectStale = false;
const __objectKey = ref => ref ? ref.kind + ':' + ref.id : '';
const __objectSync = (id, value) => {
  const control = document.getElementById(id);
  if (control) window.CalculatorInputSettings.syncEditableValue(control, String(value));
};
function __objectConfigure(config) {
  __objectPanel = config;
  const css = document.createElement('style');
  css.textContent = '.workspace-object-content>.card-head{display:none!important}.workspace-object-content{border:0!important;margin:0!important;max-height:none!important}.workspace-object-content>.card-body{padding:4px!important;max-height:none!important}.workspace-object-content [data-import-export-trigger],.workspace-object-content .card-pin-btn{display:none!important}.workspace-card-inspector{display:block!important}.workspace-object-content .decomposition-output{max-height:650px}.workspace-object-content #lie-dominant-canvas-btn{display:none!important}';
  if(config.mode==='input')css.textContent+='.workspace-view-card{border:0!important;box-shadow:none!important}.workspace-view-card>.panel-title>.panel-title-text{display:none!important}.workspace-view-card>.panel-title{border:0!important}';
  document.head.append(css);
  // The inspector has its own shadow root and therefore its own stylesheet.
  __editor.inspectorShadow?.append(css.cloneNode(true));
  if (config.mode === 'property') {
    __objectCard = document.getElementById(config.marker)?.closest('.card');
    if (!__objectCard) throw new Error('The requested property renderer is unavailable.');
    __objectCard.classList.add('workspace-object-content');
    __objectCard.classList.remove('collapsed');
    __editor.setCardVisible(__objectCard.dataset.workspaceCardId, true);
    __objectCard.addEventListener('click', event => {
      if (!event.target.closest('[data-shortcut-primary],button[id^="compute"]')) return;
      queueMicrotask(() => { __objectStale = false; __editor.notifyChange({ interaction: 'object-compute' }); });
    });
  }
  __objectConfigureSpecific(config);
  return true;
}
__editor.setAssetAdapter({
  panel: __objectConfigure,
  apply: (snapshot, ref, properties, binding = {}) => {
    const find = ref => snapshot.assets.find(asset => __objectKey(asset) === __objectKey(ref));
    const objects = Object.fromEntries(Object.entries(binding.refs || { lambda: ref }).map(([role, ref]) => [role, find(ref)]));
    __objectStale = binding.mode === 'property' && !binding.light;
    __objectProject(objects, binding);
    return true;
  },
  collect: () => __objectRows(),
  capture: () => __objectCard ? [...__objectCard.querySelectorAll('input[id],select[id],textarea[id]')].filter(control => !control.readOnly && !control.disabled).map(control => ({ id: control.id, value: control.value, checked: control.type === 'checkbox' ? control.checked : undefined })) : [],
  result: () => __objectCard ? { text: (__objectCard.querySelector('.card-body') || __objectCard).innerText || document.getElementById(__objectPanel.marker)?.textContent || '', stale: __objectStale } : null
});
`;
export const singleObjectPanel = String.raw`
function __objectRows() { return { rows: isGeneralizedCanvasActive() ? generalizedCanvasRows.slice(0, generalizedCanvasActiveRows) : rowLengths(), type: isGeneralizedCanvasActive() ? 'generalized' : 'partition' }; }
function __objectConfigureSpecific(config) {
  if (config.mode === 'property') {
    const type = document.getElementById('lie-type'), rank = document.getElementById('lie-rank');
    type.disabled = true; rank.disabled = true;
    // The selected Lie asset owns these values. Keep the algebra description.
    type.style.display = 'none'; type.previousElementSibling.style.display = 'none';
    document.getElementById('lie-rank-wrap').style.setProperty('display', 'none', 'important');
    const sourceB = document.getElementById('br-source-b'); sourceB.readOnly = true;
    document.getElementById('br-source-b-wrap').style.setProperty('display', 'none', 'important');
    if (config.operation === 'branching') {
      const rule = document.getElementById('br-rule'); rule.disabled = true;
      rule.closest('.branching-rule-row').style.display = 'none';
    }
  } else {
    const canvasPanel = document.querySelector('.canvas-panel');
    const display = document.getElementById('showhooks')?.closest('.card-body');
    if (display && config.mode!=='view') { const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent = 'Display options'; details.append(summary, display); canvasPanel.append(details); }
    // A view grid is presentation state. Resizing must not erase the Asset.
    setGridSize = function(cols, rows, clearDiagram, customized) {
      const value = __objectRows();
      gridCols = Math.max(Math.max(0, ...value.rows), clampInt(cols, 1, MAX_GRID_COLS, gridCols));
      gridRows = Math.max(value.rows.length, clampInt(rows, 1, MAX_GRID_ROWS, gridRows));
      if (customized) gridSizeWasCustomized = true;
      blocks = Array.from({ length: gridRows }, (_, r) => Array.from({ length: gridCols }, (_, c) => c < (value.rows[r] || 0) ? 1 : 0));
      syncGridSizeInputs(); resize();
    };
    if(config.mode==='view') {
      gridCols=5; gridRows=5; gridSizeWasCustomized=true; resetBlocks(); syncGridSizeInputs();
      // Breakpoints change density, not the user's grid or mathematical data.
      handleLayoutBreakpointChange=()=>resize();
      const toolbar=document.querySelector('.canvas-toolbar');
      const options=['showhooks','shadehooks','showcoords'].map(id=>document.getElementById(id)?.closest('label')).filter(Boolean);
      __editor.mountObjectSurfaces({content:[document.getElementById('canvas-wrap')],toolbar:[toolbar,...options]});
    }
    resizeGeneralizedCanvasFromControls = function(cols, rows, customized) {
      const value = __objectRows(), active = value.rows.length;
      generalizedCanvasSideCols = Math.max(1, ...value.rows.map(Math.abs), Math.min(25, Number(cols) || generalizedSideCols()));
      generalizedCanvasRows = normalizeGeneralizedRows(value.rows, Math.max(active, Math.min(15, Number(rows) || generalizedBoardRows())));
      generalizedCanvasActiveRows = active;
      if (customized) gridSizeWasCustomized = true;
      syncGridSizeInputs(); resize();
    };
  }
}
function __objectProject(objects, binding) {
  const asset = objects.lambda, rows = asset?.data?.rows || [], current = __objectRows();
  if (JSON.stringify(current.rows) !== JSON.stringify(rows) || (asset && current.type !== asset.type)) {
    gridRows = Math.max(gridRows, rows.length, 1); gridCols = Math.max(gridCols, ...rows.map(Math.abs), 1);
    if (asset?.type === 'generalized') {
      const cols=isGeneralizedCanvasActive()?generalizedSideCols():gridCols, count=isGeneralizedCanvasActive()?generalizedBoardRows():gridRows;
      setGeneralizedCanvasRows(rows);
      generalizedCanvasSideCols=Math.max(cols, ...rows.map(Math.abs), 1);
      generalizedCanvasRows=normalizeGeneralizedRows(rows,Math.max(count,rows.length));
      generalizedCanvasActiveRows = rows.length;
    }
    else drawPartitionRows(rows);
    syncGridSizeInputs(); resize();
    __objectSync('partition-input', rows.join(', '));
  }
  if (objects.lie) { __objectSync('lie-type', objects.lie.data.family); __objectSync('lie-rank', objects.lie.data.rank); }
  if (binding.operation === 'branching') {
    __objectSync('br-rule', binding.rule || 'diag-gl'); onBranchingRuleChange();
    __objectSync('br-source-b', (objects.mu?.data?.rows || []).join(', ')); markBranchingStale();
    document.getElementById('br-output').textContent = 'Inputs changed. Click compute.';
  }
  if (binding.mode === 'property') refreshOpenCalculations();
}
` + common;

export const doubleObjectPanel = String.raw`
let __lrTarget = null;
let __powerSettings = null;
const __renderPlethysmDecomposition = renderCoefficientDecomposition;
renderCoefficientDecomposition = function(outputId, left, terms, options) {
  if(outputId==='plethysm-out' && __powerSettings && __powerSettings.mode!=='advanced') left=(__powerSettings.mode==='symmetric'?'Sym':'∧')+'<sup>'+__powerSettings.degree+'</sup>(S<sub>'+partitionToString(state.mu.rows)+'</sub>)';
  return __renderPlethysmDecomposition(outputId,left,terms,options);
};
const __renderFullDecomposition = renderDecomposition;
renderDecomposition = function(terms, lambda, mu, type, rank, fixed) {
  if(__objectPanel?.operation==='lr') state.workspaceLRCompleteness={warning:terms.warning||'',dimensionCheck:terms.dimensionCheck||null};
  if (__lrTarget === null || __objectPanel?.operation !== 'lr') return __renderFullDecomposition(terms, lambda, mu, type, rank, fixed);
  const target = trimPartition(__lrTarget), labels = fixed ? diagramToDynkinLabels(target, rank) : null;
  const matches = term => fixed ? key(term.labels) === key(labels) : key(trimPartition(term.nu)) === key(target);
  const coefficient = terms.filter(matches).reduce((sum,term)=>sum+term.coefficient,0);
  const mode = fixed ? 'fixed ' + lieAlgebraLabel(type,rank) : 'stable ' + type;
  const output = $('schur-out'); output.replaceChildren();
  const title = document.createElement('div'); title.className='decomp-formula';
  title.textContent = 'Multiplicity of ' + partitionToString(target) + ' in ' + partitionToString(lambda) + ' ⊗ ' + partitionToString(mu) + ' (' + mode + ')'; output.append(title);
  const result = document.createElement('div'); result.dataset.lrCoefficient='';
  if (terms.warning || terms.dimensionCheck?.ok === false) { result.className='warning-text'; result.textContent='Coefficient is not certified: ' + (terms.warning || 'The decomposition failed its dimension completeness check.'); }
  else result.textContent = 'Coefficient = ' + coefficient;
  output.append(result);
  if(fixed) {const detail=document.createElement('div');detail.className='hint';detail.textContent='Target Dynkin labels: ['+labels.join(', ')+']';output.append(detail);}
};
__editor.setAssetAdapter({afterRestore: () => {
  if(__objectPanel?.operation==='lr' && state.lastDecomposition) {
    const value=state.lastDecomposition;
    // Array metadata is not preserved by the native state encoder. Store the
    // completeness certificate on state so restored targets cannot lose it.
    Object.assign(value.terms,state.workspaceLRCompleteness || (value.fixed&&__lrTarget!==null?{warning:'Saved result has no completeness certificate. Compute again.'}:{}));
    renderDecomposition(value.terms,value.lambda,value.mu,value.type,value.rank,value.fixed);__objectStale=false;
  } else if(__objectPanel?.operation==='plethysm' && state.lastPlethysm) {
    const value=state.lastPlethysm;
    renderCoefficientDecomposition('plethysm-out','s<sub>'+partitionToString(value.lambda)+'</sub> ∘ s<sub>'+partitionToString(value.mu)+'</sub>',value.terms,{hue:315});__objectStale=false;
  }
}});
function __objectRows() { return { rows: state.lambda.rows.slice(), type: 'partition' }; }
function __objectConfigureSpecific(config) {
  if (config.mode === 'input') {
    const style = document.createElement('style');
    style.textContent = '.double-canvas-grid{grid-template-columns:minmax(0,1fr)!important;padding:8px!important}.diagram-slot:has(#mu-canvas),.lie-inline-controls,#double-title,#slice-diagram-toggle,.diagram-label{display:none!important}.canvas-toolbar{justify-content:flex-end!important}.panel-title{padding:6px!important}.canvas-stack>.canvas-panel{overflow:hidden!important}'; document.head.append(style);
    $('grid-cols').max = '25'; $('grid-rows').max = '15';
    applyGridSize = function() {
      const rows = Math.max(state.lambda.rows.length, Math.min(15, Math.max(1, Number($('grid-rows').value) || 5)));
      const cols = Math.max(0, ...state.lambda.rows, Math.min(25, Math.max(1, Number($('grid-cols').value) || 5)));
      for (const slot of ['lambda','mu']) { state[slot].maxRows = rows; state[slot].maxCols = cols; }
      __objectSync('grid-rows', rows); __objectSync('grid-cols', cols); resizeCanvases();
    };
    // Existing listeners captured the old function before this adapter mounted.
    for (const id of ['grid-rows','grid-cols']) $(id).addEventListener('change', event => { event.stopImmediatePropagation(); applyGridSize(); }, true);
  }
  if (config.operation === 'lr') { $('fixed-rank-mode').checked = true; refreshLRModeHint(); }
  if (config.operation === 'slice') {
    __editor.mountObjectSurfaces({content:[$('slice-canvas')],toolbar:[$('slice-panel').querySelector('.panel-title'),$('slice-legend')]});
    for (const id of ['slice-layer-card', 'slice-weight-info-card']) {
      const card = $(id); card.style.display = ''; card.hidden = false; card.classList.add('workspace-object-content'); card.classList.remove('collapsed'); __editor.setCardVisible(card.dataset.workspaceCardId, true);
    }
  }
}
function __objectProject(objects, binding) {
  __lrTarget = binding.operation === 'lr' && objects.nu ? objects.nu.data.rows.slice() : null;
  __powerSettings = binding.operation === 'plethysm' ? binding.settings : null;
  const partitions = ['lambda','mu'].map(slot => objects[slot]?.data?.rows || []);
  const space = objects.space?.data;
  const rows = space ? Number(space.r) : Math.max(state.lambda.maxRows, state.mu.maxRows, ...partitions.map(value => value.length), 5);
  const cols = space ? Number(space.n) - Number(space.r) : Math.max(state.lambda.maxCols, state.mu.maxCols, ...partitions.flat(), 5);
  for (const slot of ['lambda','mu']) { state[slot].maxRows = rows; state[slot].maxCols = cols; }
  __objectSync('grid-rows', rows); __objectSync('grid-cols', cols);
  if (objects.lie) {
    __objectSync('lie-type', objects.lie.data.family); __objectSync('lie-rank', objects.lie.data.rank); window.onTypeChange();
  }
  ['lambda','mu'].forEach((slot, index) => {
    if (JSON.stringify(state[slot].rows) !== JSON.stringify(partitions[index])) setDiagram(slot, partitions[index]);
    __objectSync(slot + '-partition', partitions[index].join(', '));
  });
  if (binding.mode === 'property') {
    for (const id of ['schur-out','kostka-out','kronecker-out','plethysm-out','schur-functor-out','grassmannian-out']) {
      const output = $(id); output.textContent = 'Inputs changed. Click compute.';
    }
    updateStats({ force: true }); updateInvariants(); renderSymmetricPolynomialProduct();
    if (binding.operation === 'slice') {
      updateSliceCard();
      if (!$('open-slice-btn').disabled) { openSlice(); refreshSlice(); }
    }
  }
  resizeCanvases();
}
` + common;
