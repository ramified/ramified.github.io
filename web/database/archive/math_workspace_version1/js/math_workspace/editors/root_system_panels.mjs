import { chrome } from './linear_category_panels.mjs';

// Project explicit mathematical objects into the unchanged calculator engines.
// Local selection, layout and display controls remain renderer state.
const resultText = String.raw`
function __textResult(format) {
  const body = __panelCard?.querySelector('.card-body');
  if (format === 'latex' && body) {
    const items = window.MathJax?.startup?.document?.getMathItemsWithin?.(body) || [];
    if (items.length) return items.map(item => (item.display ? '\\[' : '\\(') + item.math + (item.display ? '\\]' : '\\)')).join('\n');
  }
  return body?.innerText || body?.textContent || '';
}
`;

export const dynkinObjectPanel = chrome + resultText + String.raw`
let __dynkinAsset = null, __hasQuiver = false, __focusedVertex = null;
const __oldRenderVertexData = renderVertexData;
renderVertexData = function() { return __oldRenderVertexData(__panelConfig.operation === 'dynkin-vertex'); };
const __oldSyncQuiver = syncQuiverControls, __oldSelectVertex = selectDynkinVertex;
const __oldToggleEdge = toggleQuiverEdge, __oldCanUseAR = canUseStartingFunctionAR;
const __oldSetMultiSelect = setMultiSelect;
setMultiSelect = function(enabled) {
  __oldSetMultiSelect(enabled);
  if (__panelConfig.operation === 'dynkin-view') {
    __focusedVertex = state.selected + 1;
    __editor.notifyChange({interaction:'dynkin-vertex-focus'});
  }
};
const __oldSetQuiverMode = setQuiverMode;
setQuiverMode = function(enabled) {
  if (!['dynkin-view','dynkin-starting'].includes(__panelConfig.operation)) return __oldSetQuiverMode(enabled);
  const next = !!enabled && !!__dynkinAsset && supportsQuiverOrientation(state.type);
  if (next && !__hasQuiver) state.quiverOrientations[quiverLayoutKey(state.type,state.rank)] = defaultQuiverOrientations(state.cartan);
  __hasQuiver = next;
  return __oldSetQuiverMode(next);
};
syncQuiverControls = function() {
  __oldSyncQuiver();
  if (!__panelConfig.mode) return;
  const control = $('dynkin-quiver-mode');
  if (__panelConfig.operation === 'dynkin-view') {
    control.disabled = !__dynkinAsset || !supportsQuiverOrientation(state.type);
    if (!control.disabled) control.closest('label').title = 'Add or remove quiver directions; click an edge to reverse it';
    return;
  }
  control.disabled = !__hasQuiver;
  control.closest('label').title = __hasQuiver ? 'Show stored quiver arrows; click an edge to reverse it' : 'Add quiver directions in the diagram display first';
};
canUseStartingFunctionAR = function(available) { return __oldCanUseAR(available) && (!__panelConfig.mode || __hasQuiver || !!__dynkinAsset && __panelConfig.operation === 'dynkin-starting'); };
const __oldSetAR = setStartingFunctionARMode;
setStartingFunctionARMode = function(enabled) {
  if (!__panelConfig.mode) return __oldSetAR(enabled);
  if (enabled && !__hasQuiver && __panelConfig.operation === 'dynkin-starting') setQuiverMode(true);
  state.startingFunctionARMode = !!enabled && __hasQuiver && supportsQuiverOrientation(state.type);
  state.quiverMode = __hasQuiver;
  renderStartingFunction(); queueMathTypeset();
};
selectDynkinVertex = function(index) {
  if (__panelConfig.operation === 'lie-view') return;
  if (__panelConfig.mode !== 'property') {
    if (__panelConfig.operation !== 'dynkin-view') return __oldSelectVertex(index);
    if (!Number.isInteger(index) || index < 0 || index >= state.rank) return;
    __focusedVertex = index + 1;
    __oldSelectVertex(index);
    __editor.notifyChange({interaction:'dynkin-vertex-focus'});
    return;
  }
  if (!Number.isInteger(index) || index < 0 || index >= state.rank) return;
  __focusedVertex = index + 1;
  if (__panelConfig.operation === 'dynkin-starting') {
    __oldSelectVertex(index);
    __editor.notifyChange({interaction:'dynkin-vertex-focus'});
    return;
  }
  state.selected = index; renderVertexData(); renderStartingFunction(); queueMathTypeset();
};
toggleQuiverEdge = function(i,j) { if ((['input','view'].includes(__panelConfig.mode) || __panelConfig.operation === 'dynkin-starting') && __hasQuiver) return __oldToggleEdge(i,j); };
__editor.setAssetAdapter({
  panel(config) {
    __panelConfig = config;
    state.highlightSelection = config.operation !== 'lie-view';
    if (config.operation === 'lie-view') __panelStyle('label[for="dynkin-multi-select"],label[for="dynkin-quiver-mode"]{display:none!important}');
    __panelStyle('#dynkin-type,label[for="dynkin-type"],#dynkin-rank-wrap,#dynkin-starting-wide{display:none!important}.canvas-toolbar{flex-wrap:wrap!important}');
    $('dynkin-type').disabled = true; $('dynkin-rank').disabled = true;
    $('dynkin-starting-card').removeAttribute('data-card-wide');
    $('dynkin-starting-ar-mode').closest('label').title = 'Show the AR quiver; add quiver directions if needed';
    if (config.mode === 'property') __showCard($(config.marker).closest('.card'));
    if(config.mode==='view') {
      const toolbar=document.querySelector('.canvas-toolbar');
      $('dynkin-type').closest('label')?.setAttribute('hidden','');$('dynkin-type').hidden=true;$('dynkin-rank-wrap').hidden=true;
      __editor.mountObjectSurfaces({content:[$('dynkin-canvas').parentElement],toolbar:[toolbar]});
    }
    return true;
  },
  apply(snapshot, ref, properties, binding) {
    const asset = snapshot.assets.find(item => item.kind === 'dynkin' && (__key(item) === __key(ref) || __key(item) === __key(binding?.refs?.dynkin)));
    const parent = snapshot.assets.find(item => item.kind === 'lie'); if (!parent) return false;
    const model = window.MathWorkspaceObjects, issues = [...model.lieEngineIssues(parent.data, 'dynkin'), ...(asset ? model.rootObjectIssues(asset, parent) : [])];
    if (issues.length) throw new Error(issues.join(' '));
    const sameAsset = __dynkinAsset && asset && __key(__dynkinAsset) === __key(asset);
    __dynkinAsset = asset ? JSON.parse(JSON.stringify(asset)) : null;
    __hasQuiver = asset?.data.quiver != null;
    state.type = parent.data.family; state.rank = parent.data.rank;
    const indices = asset ? asset.data.vertices.map(v => v - 1) : [0];
    state.selectedSet = indices;
    if (!indices.includes(state.selected)) state.selected = indices[0];
    state.multiSelect = indices.length > 1 || (typeof binding?.multiSelect === 'boolean' ? binding.multiSelect : sameAsset && state.multiSelect);
    if (__panelConfig.mode === 'property' && __panelConfig.operation !== 'dynkin-starting') state.multiSelect = true;
    if (__hasQuiver) state.quiverOrientations[quiverLayoutKey(state.type, state.rank)] = { ...asset.data.quiver };
    state.quiverMode = __hasQuiver;
    if (!__hasQuiver) state.startingFunctionARMode = false;
    render();
    const focus = binding?.vertexFocus ?? (sameAsset ? __focusedVertex : null);
    __focusedVertex = Number.isInteger(focus) && focus >= 1 && focus <= state.rank ? focus : state.selected + 1;
    if (__panelConfig.operation === 'dynkin-vertex' || __panelConfig.operation === 'dynkin-starting' && state.multiSelect) { state.selected = __focusedVertex - 1; renderVertexData(); renderStartingFunction(); }
    return true;
  },
  collect() {
    if (!__dynkinAsset) return null;
    return { type: 'dynkin', data: { lie: __dynkinAsset.data.lie, vertices: selectedIndices().map(i => i + 1), quiver: __hasQuiver ? { ...state.quiverOrientations[quiverLayoutKey(state.type,state.rank)] } : null } };
  },
  capture: () => ({ vertex: ['dynkin-view','dynkin-starting'].includes(__panelConfig.operation) ? __focusedVertex : state.selected + 1, multiSelect:state.multiSelect, arMode: state.startingFunctionARMode, transpose: state.startingFunctionTransposed }),
  result: () => ({ text: __textResult('plain'), hasResult: true, vertex: __panelConfig.operation === 'lie-view' ? null : state.selected + 1, vertices: __panelConfig.operation === 'lie-view' ? [] : selectedIndices().map(i => i + 1), cartan: state.cartan.map(row => row.slice()) }),
  io(action, format) {
    if (action === 'selection-mode') {
      if (typeof format === 'boolean' && state.multiSelect !== format && ['dynkin-view','dynkin-starting'].includes(__panelConfig.operation)) {
        state.multiSelect = format;
        if (!format) state.selected = state.selectedSet[0] ?? state.selected;
        syncControls(); drawDynkin(); renderStartingFunction(); queueMathTypeset();
      }
      return state.multiSelect;
    }
    if (action === 'vertex-focus') {
      if (Number.isInteger(format) && format >= 1 && format <= state.rank) {
        __focusedVertex = format;
        if (__panelConfig.operation === 'dynkin-vertex' || __panelConfig.operation === 'dynkin-starting' && state.multiSelect) { state.selected = format - 1; renderVertexData(); renderStartingFunction(); queueMathTypeset(); }
      }
      return __focusedVertex;
    }
    if (action === 'geometry') return { vertices: state.hitboxes, edges: state.edgeHitboxes };
    if (action === 'export') {
      if (__panelConfig.mode === 'property') return __textResult(format);
      if (__panelConfig.operation === 'lie-view') return format === 'latex' ? '\\[' + typeLatex() + '\\qquad ' + matrixLatex(state.cartan) + '\\]' : typeLabel();
      if (format === 'latex') return '\\[' + typeLatex() + '\\qquad ' + matrixLatex(state.cartan) + '\\qquad I=\\{' + selectedIndices().map(i => i + 1).join(',') + '\\}\\]';
      return typeLabel() + '; vertices: ' + selectedIndices().map(i => i + 1).join(', ') + (__hasQuiver ? '; quiver: ' + JSON.stringify(__dynkinAsset.data.quiver) : '');
    }
  }
});
`;

export const strandObjectPanel = chrome + resultText + String.raw`
let __strandAsset = null, __strandSignature = '';
const __viewKeys = ['direction','strandDisplayStyle','generatorSpacing','generatorGapEnabled','strandSizeMode','fixedGeneratorSize'];
function __strandView(value) {
  if (value) {
    for (const key of __viewKeys) if (Object.hasOwn(value,key)) state[key] = value[key];
    renderAll({ preserveMessage: true });
  }
  return Object.fromEntries(__viewKeys.map(key => [key,state[key]]));
}
__editor.setAssetAdapter({
  panel(config) {
    __panelConfig = config;
    __panelStyle('label[for="strand-group-type"],label[for="strand-count"],#strand-calculation-task-row,#strand-calculation-wide{display:none!important}.strand-input-chart{overflow:auto;max-height:400px}.strand-field-row{flex-wrap:wrap}');
    refs.groupType.disabled = true; refs.count.disabled = true;
    document.getElementById('strand-calculation-card').removeAttribute('data-card-wide');
    if (config.mode === 'input') {
      const card=refs.inputChart.closest('.card');__showCard(card);
      __editor.mountObjectSurfaces({modify:[card.querySelector('.card-body')]});
    }
    if(config.mode==='view') __editor.mountObjectSurfaces({content:[document.getElementById('strand-canvas').parentElement],toolbar:[document.querySelector('.strand-display-controls')]});
    if (config.mode === 'property') {
      __showCard(document.getElementById(config.marker).closest('.card'));
      setCalculationTask(config.operation === 'strands-relations' ? 'relations' : config.operation === 'strands-basis' ? 'basis' : 'strand');
      __panelCard.addEventListener('click', event => {
        if (event.target.closest('#strand-calculate')) queueMicrotask(() => __editor.notifyChange({ interaction: 'object-compute' }));
      });
    }
    return true;
  },
  apply(snapshot, ref, properties, binding) {
    const asset = snapshot.assets.find(item => item.kind === 'strands' && (__key(item) === __key(ref) || __key(item) === __key(binding?.refs?.strands)));
    const parent = snapshot.assets.find(item => item.kind === 'lie');
    if (!parent && __panelConfig.operation !== 'strands-relations') return false;
    if (parent) {
      const model = window.MathWorkspaceObjects, issues = [...model.lieEngineIssues(parent.data, 'strand'), ...(asset ? model.rootObjectIssues(asset, parent) : [])];
      if (issues.length) throw new Error(issues.join(' '));
      Object.assign(state, model.strandContext(parent.data));
    }
    __strandAsset = asset ? JSON.parse(JSON.stringify(asset)) : null;
    const signature = JSON.stringify([parent?.data, asset?.data]);
    if (signature !== __strandSignature) {
      __strandSignature = signature;
      state.appliedSteps = asset ? asset.data.generators.map(record => ({ ...record })) : [];
      state.calculationResult = null; state.calculationKey = ''; state.calculationStale = true;
      state.calculationLatex = ''; state.calculationPlain = ''; clearCalculationResultDisplay();
    }
    renderInputChart(); renderAll({ preserveMessage: true });
    if (relationTaskActive()) renderRelationReference();
    return true;
  },
  collect: () => __strandAsset ? { type: 'strands', data: { lie: __strandAsset.data.lie, generators: state.appliedSteps.map(record => ({ ...record })) } } : null,
  capture: () => ({ task: state.calculationTask, target: relationTaskActive() ? state.relationTarget : basisTaskActive() ? state.basisTarget : state.calculationTarget, basis: basisTaskActive() ? state.basisBasis : state.calculationBasis }),
  result: () => ({ text: __textResult('plain'), hasResult: __panelConfig.operation !== 'strands-calculation' || !!state.calculationResult && !state.calculationStale && state.calculationKey === calculationFingerprint(), calculation: state.calculationResult && !state.calculationStale ? window.StrandMath.serializeCalculation(state.calculationResult) : null, groupType: state.groupType, strandCount: state.strandCount }),
  io(action, value) {
    if (action === 'view') return __strandView(value);
    if (action === 'export') {
      if (__panelConfig.operation === 'strands-calculation') {
        if (!state.calculationResult || state.calculationStale || state.calculationKey !== calculationFingerprint()) throw new Error('Compute the current word first.');
        return value === 'latex' ? calculationLatexForCopy() : state.calculationPlain;
      }
      if (__panelConfig.mode === 'property') return __textResult(value);
      const data = buildPermutationData(); return value === 'latex' ? exportLatex(data) : exportPlain(data);
    }
  }
});
`;
