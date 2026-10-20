// Workspace-only projections; all mathematics and formula rendering stay in
// the original calculator closures.
export const chrome = String.raw`
let __panelConfig = {}, __panelCard = null;
const __key = ref => ref ? ref.kind + ':' + ref.id : '';
const __sync = (control, value) => window.CalculatorInputSettings.syncEditableValue(control, String(value ?? ''));
function __showCard(card) {
  __panelCard = card; card.classList.add('workspace-object-content'); card.classList.remove('collapsed');
  __editor.setCardVisible(card.dataset.workspaceCardId, true);
}
function __panelStyle(text = '') {
  const style = document.createElement('style');
  style.textContent = '.workspace-object-content>.card-head{display:none!important}.workspace-object-content{border:0!important;margin:0!important;max-height:none!important;box-shadow:none!important}.workspace-object-content>.card-body{padding:4px!important;max-height:none!important}.workspace-card-inspector{display:block!important}.workspace-object-content [data-import-export-trigger]{display:none!important}' + (__panelConfig.mode==='input'?'.workspace-view-card{border:0!important;box-shadow:none!important}.workspace-view-card>.panel-title>.panel-title-text{display:none!important}.workspace-view-card>.panel-title{border:0!important}':'') + text;
  document.head.append(style); __editor.inspectorShadow?.append(style.cloneNode(true));
}
const __captureControls = () => __panelCard ? [...__panelCard.querySelectorAll('input[id],select[id],textarea[id]')].filter(n => !n.readOnly && n.type !== 'hidden').map(n => ({ id: n.id, value: n.value, checked: n.type === 'checkbox' ? n.checked : undefined })) : [];
`;

export const matrixObjectPanel = chrome + String.raw`
let __matrixConstructed = false, __matrixDisplay = null, __matrixField = '';
function __matrixData() {
  return { rows: state.rows, cols: state.cols, entries: state.entries.map(row => row.slice()), dataType: currentDataType(), finiteFieldPrime: state.finiteFieldPrime, rationalFunctionVariables: state.rationalFunctionVariables.slice(), numberFieldSymbol: state.numberFieldSymbol, numberFieldPolynomial: state.numberFieldPolynomial, ...(__matrixField ? {field:__matrixField} : {}) };
}
function __matrixProject(data) {
  const resized = state.rows !== data.rows || state.cols !== data.cols;
  const oldVariables = defaultPolynomialVariables(state.cols).join(', ');
  if (!refs.polynomialActionVariables.value.trim() || refs.polynomialActionVariables.value.trim() === oldVariables) __sync(refs.polynomialActionVariables, defaultPolynomialVariables(data.cols).join(', '));
  state.rows = data.rows; state.cols = data.cols; state.entries = data.entries.map(row => row.slice());
  state.finiteFieldPrime = data.finiteFieldPrime; state.rationalFunctionVariables = data.rationalFunctionVariables.slice();
  state.numberFieldSymbol = data.numberFieldSymbol; state.numberFieldPolynomial = data.numberFieldPolynomial;
  __sync(refs.rows, data.rows); __sync(refs.cols, data.cols); __sync(refs.dataType, data.dataType);
  __sync(refs.finiteFieldPrime, data.finiteFieldPrime); __sync(refs.rationalFunctionVariable, data.rationalFunctionVariables.join(', '));
  __sync(refs.numberFieldGenerator, data.numberFieldSymbol); __sync(refs.numberFieldPolynomial, data.numberFieldPolynomial);
  if (resized) renderMatrixGrid();
  else refs.grid.querySelectorAll('input').forEach(control => __sync(control, data.entries[control.dataset.row][control.dataset.col]));
  updateFieldControls(); clearOperationResult(); clearPolynomialActionResult(); refreshAll();
}
__editor.setAssetAdapter({
  panel(config) {
    __panelConfig = config;
    __panelStyle('#apply-bulk,#bulk-message,#export-operation,#export-polynomial-action{display:none!important}.matrix-toolbar{flex-wrap:wrap!important}.matrix-grid-wrap{overflow:auto!important}.matrix-cell{min-width:0!important}');
    if (config.mode === 'input') {
      __showCard(refs.applyBulk.closest('.card'));
      __panelStyle('.calculator-input-settings-trigger,.matrix-toolbar-group,.matrix-editor{display:none!important}');
      __panelStyle(':host,.editor-document,.editor-body,.editor-body>.workspace-editor-layout{height:auto!important;overflow:visible!important}.workspace-editor-layout .workspace-view-card{height:auto!important;min-height:0!important;border:0!important;box-shadow:none!important}.panel-title>.panel-title-text,.panel-title>.panel-settings-btn,#matrix-summary,.matrix-action-row:has(#apply-bulk){display:none!important}.panel-title{padding:4px 0!important;border:0!important;min-height:0!important}.matrix-editor{min-height:0!important;padding:12px 0!important;justify-content:flex-start!important;--matrix-cell-size:72px}.matrix-underbar{border:0!important;padding:4px 0!important}.matrix-toolbar-group{padding-left:0!important;border:0!important}');
      __editor.mountObjectSurfaces({modify:[document.querySelector('.canvas-size-inline'),document.getElementById('clear-matrix'),__panelCard.querySelector('.card-body')]});
    }
    if (config.operation === 'matrix-view') {
      const card=document.createElement('section');card.className='card workspace-object-content';
      __matrixDisplay=document.createElement('div');__matrixDisplay.className='card-body matrix-display-output';
      const surface=document.createElement('div');surface.className='matrix-editor';surface.append(refs.grid);__matrixDisplay.append(surface);
      card.append(__matrixDisplay);__editor.inspectorShadow.querySelector('.workspace-card-inspector').append(card);__panelCard=card;
      __panelStyle(':host,.editor-document,.editor-body,.editor-body>.layout{height:auto!important;min-height:0!important;overflow:visible!important}.workspace-editor-inspector-layout>.workspace-card-inspector{display:block!important}.matrix-display-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 4px;color:var(--muted);font:0.74rem "JetBrains Mono",monospace}.matrix-display-name{color:var(--text)}.matrix-display-output .matrix-editor{display:block;min-height:0;padding:16px 4px;overflow:auto;scrollbar-gutter:auto}.matrix-display-output .matrix-grid{width:min(100%,var(--matrix-preferred-width));min-width:var(--matrix-min-width);max-width:none;grid-template-columns:repeat(var(--matrix-columns),minmax(0,1fr))!important;gap:7px;margin-inline:auto}.matrix-display-output .matrix-cell{box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%;height:36px;padding:5px 4px;font-size:.72rem}');
    } else if (config.mode === 'property') {
      __showCard(document.getElementById(config.marker).closest('.card'));
      __panelCard.addEventListener('click', event => {
        if (event.target.closest('#compute-operation,#compute-polynomial-action,#charpoly-factor')) queueMicrotask(() => __editor.notifyChange({ interaction: 'object-compute' }));
      });
    }
    return true;
  },
  apply(snapshot, ref, properties, binding) {
    const key = __key(binding?.refs?.matrix || ref), asset = snapshot.assets.find(a => __key(a) === key);
    if (!asset) return false;
    __matrixConstructed = !!asset.data.construction;
    __matrixField = asset.data.field || '';
    const projected = window.MathWorkspaceSlicing.materialize(asset,snapshot.assets);
    __matrixProject(projected.data);
    if (__matrixDisplay) {
      refs.grid.style.setProperty('--matrix-columns',state.cols);
      refs.grid.style.setProperty('--matrix-preferred-width',(state.cols*72+(state.cols-1)*7)+'px');
      refs.grid.style.setProperty('--matrix-min-width',(state.cols*42+(state.cols-1)*7)+'px');
      const result=readMatrix(false);
      let warning=__matrixDisplay.querySelector('.matrix-display-error');
      if(!warning){warning=document.createElement('p');warning.className='err matrix-display-error';warning.setAttribute('role','status');__matrixDisplay.append(warning);}
      warning.textContent=result.errors.length?matrixDataErrorMessage(result.errors[0]):'';warning.hidden=!result.errors.length;
      const heading=document.createElement('div');heading.className='matrix-display-header';
      const name=document.createElement('span');name.className='matrix-display-name';name.textContent=asset.plainName||asset.name;
      const metadata=document.createElement('span');metadata.textContent=state.rows+' × '+state.cols+' · '+window.MathWorkspaceObjects.fieldLabel(projected.data);heading.append(name,metadata);
      const previous=__matrixDisplay.querySelector('.matrix-display-header');if(previous)previous.replaceWith(heading);else __matrixDisplay.prepend(heading);
      refs.grid.querySelectorAll('input').forEach(control=>{control.disabled=__matrixConstructed;control.setAttribute('aria-label','Entry '+(Number(control.dataset.row)+1)+', '+(Number(control.dataset.col)+1));});
    }
    if (__panelConfig.mode === 'input') __panelCard.querySelectorAll('input,select,textarea,button').forEach(control=>{control.disabled=__matrixConstructed;});
    return true;
  },
  collect() {
    if (__matrixConstructed) return null;
    if (readMatrix(false).errors.length) return null;
    // Blank cells and partial exponents are drafts, even though the historical
    // parser accepts a blank cell as zero.
    const active = refs.grid.getRootNode().activeElement;
    if (active?.classList.contains('matrix-cell') && !active.value.trim()) return null;
    const data = __matrixData(); data.entries = data.entries.map(row => row.map(value => String(value).trim() ? value : '0'));
    return { type: 'matrix', data };
  },
  capture: __captureControls,
  result: () => ({ text: (__panelCard?.querySelector('.card-body')?.innerText || '') + (__matrixDisplay ? '\n' + state.entries.map(row=>row.join(' ')).join('\n') : ''), hasResult: __panelConfig.operation === 'matrix-computation' ? !!state.lastOperationResult : __panelConfig.operation === 'matrix-polynomial' ? !!state.lastPolynomialAction : true }),
  io(action, value) {
    if (action === 'validate') { const result = readMatrix(false); if (result.errors.length) throw new Error(matrixDataErrorMessage(result.errors[0])); return __matrixData(); }
    if (action === 'parse') {
      const entries = parseImportedMatrix(value).rows;
      if (!entries.length || entries.length > 8 || !entries[0]?.length || entries[0].length > 8) throw new Error('Matrix dimensions must be from 1 to 8.');
      return { ...__matrixData(), rows: entries.length, cols: entries[0].length, entries };
    }
    if (action === 'export') {
      if (__panelConfig.operation === 'matrix-computation') { if (!state.lastOperationResult) throw new Error('Compute the result first.'); return exportOperationPayload(state.lastOperationResult, value); }
      if (__panelConfig.operation === 'matrix-polynomial') { if (!state.lastPolynomialAction) throw new Error('Compute the result first.'); return exportPolynomialAction(state.lastPolynomialAction, value); }
      const result = readMatrix(false); if (result.errors.length) throw new Error(matrixDataErrorMessage(result.errors[0]));
      return exportMatrix(result.details, value, result.fieldInfo);
    }
  }
});
`;

export const categoryObjectPanel = chrome + String.raw`
let __categoryTarget = '', __categoryLayout = new Map();
function __categoryAssetData(item, kind) {
  if (kind === 'category') return { objectSymbol: item.objectSymbol, objectCondition: item.objectCondition, morphismElement: item.morphismElement, morphismCondition: item.morphismCondition, opposite: !!item.opposite };
  return { domain: item.domainId, codomain: item.codomainId, variance: item.variance };
}
function __categoryProject(snapshot, ref) {
  state.categories.forEach(item => __categoryLayout.set(item.id, { x: item.x, y: item.y }));
  state.categories = snapshot.assets.filter(a => a.kind === 'category').map((a, i) => ({ id: __key(a), label: a.name, ...a.data, ...(__categoryLayout.get(__key(a)) || positionForNewCategory(i)) }));
  state.functors = snapshot.assets.filter(a => a.kind === 'functor').map(a => ({ id: __key(a), label: a.name, domainId: a.data.domain, codomainId: a.data.codomain, variance: a.data.variance }));
  if (__panelConfig.mode === 'input') {
    __categoryTarget = __key(ref); state.activeKind = ref.kind; state.activeId = __categoryTarget; state.inputMode = 'modify';
    refs.objectKind.value = ref.kind; refs.inputMode.value = 'modify';
    const item = activeObject();
    if (ref.kind === 'category') {
      __sync(refs.categoryLabel, item.label); setCategoryObjectSymbol(item.objectSymbol);
      __sync(refs.categoryObjectCondition, item.objectCondition); __sync(refs.categoryMorphismElement, item.morphismElement); __sync(refs.categoryMorphismCondition, item.morphismCondition);
      refs.categoryOpposite.checked = item.opposite;
    } else {
      __sync(refs.functorLabel, item.label); __sync(refs.functorDomain, item.domainId); __sync(refs.functorCodomain, item.codomainId); __sync(refs.functorVariance, item.variance);
    }
    syncControls();
  } else {
    // Canvas selection and drag positions belong to this renderer only.
    state.functorPickTarget = null;
    if (ref && snapshot.assets.some(asset=>__key(asset)===__key(ref))) {
      state.activeKind = ref.kind; state.activeId = __key(ref);
    } else if (!activeObject()) { state.activeKind = null; state.activeId = null; }
  }
  resizeCanvas(); renderAll({ preserveControls: true });
}
__editor.setAssetAdapter({
  panel(config) {
    __panelConfig = config;
    __panelStyle('.category-input-add,#category-input-note,.category-pick-actions,#functor-pick-status,#category-mode-badge{display:none!important}.category-field-row:has(#category-label),.category-field-row:has(#functor-label),.category-field-row:has(#functor-domain-button){display:none!important}');
    if (config.mode === 'input') {
      __showCard(refs.inputMode.closest('.card'));
      refs.categoryApplyPreset.addEventListener('click', () => { if (refs.categoryPresetSelect.value) updateActiveObjectFromControls(); });
      __editor.mountObjectSurfaces({modify:[refs.inputMode.closest('.card').querySelector('.card-body')]});
    }
    if (config.mode === 'scene') {
      __panelStyle('.workspace-native-content>.category-stage{box-sizing:border-box;border:1px solid var(--border);border-radius:4px;overflow:hidden}');
      refs.clearCanvas.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();options.onOverviewAction?.('clear');},{capture:true});
      const select = (kind, id) => {
        if (!(kind === 'category' ? categoryById(id) : functorById(id))) return false;
        state.activeKind = kind; state.activeId = id; state.functorPickTarget = null;
        // Preserve the pointer target when a selection starts a category drag.
        refs.labelLayer.querySelectorAll('[data-object-kind][data-object-id]').forEach(label=>{
          const selected = label.dataset.objectKind===kind && label.dataset.objectId===id;
          label.classList.toggle('is-selected',selected); label.setAttribute('aria-pressed',String(selected));
        });
        renderCanvas();
        options.onSelectAsset?.({kind,id:id.slice(id.indexOf(':')+1)});
        return true;
      };
      setActive = select; selectActiveInPlace = select;
      handleFunctorCategoryPick = () => {};
      __editor.mountObjectSurfaces({content:[document.getElementById('category-canvas').parentElement]});
    }
    return true;
  },
  apply(snapshot, ref) { __categoryProject(snapshot, ref); return true; },
  collect() {
    const kind = __categoryTarget.split(':')[0], item = [...state.categories, ...state.functors].find(item => item.id === __categoryTarget);
    return item ? { name: item.label, data: __categoryAssetData(item, kind) } : null;
  },
  capture: () => ({ layout: state.categories.map(({id,x,y}) => ({id,x,y})) }),
  result: () => ({ text: exportPlain() }),
  io(action, format) {
    if (action === 'selection') return activeObject() ? {kind:state.activeKind,id:state.activeId.slice(state.activeId.indexOf(':')+1)} : null;
    if (action === 'select' && __panelConfig.mode === 'scene') return setActive(format.kind,__key(format));
    if (action === 'layout') { for (const point of format) { __categoryLayout.set(point.id, { x: point.x, y: point.y }); const item = categoryById(point.id); if (item) Object.assign(item, { x: point.x, y: point.y }); } renderAll({ preserveControls: true }); return true; }
    if (action === 'export') return format === 'latex' ? exportLatex() : format === 'plain' ? exportPlain() : exportJson();
  }
});
`;
