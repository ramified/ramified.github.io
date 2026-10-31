(function () {
  'use strict';
  const slicing = window.MathWorkspaceSlicing;
  const presentation = window.MathWorkspacePresentation, viewDefaults = new Map();
  const viewDefaultsFor = ref => viewDefaults.get(assetKey(ref)) || {};

  const calculators = [
    ['sheaf-complexes', 'Sheaf complexes', 'complex'],
    ['mosaic', 'Mosaic', 'mosaic'],
    ['places', 'Place ramification', 'ramification']
  ].map(([id, label, nativeId]) => ({ id, label, nativeId, kind: 'calculator' }));
  const assetsDefinition = { id: 'assets', label: 'Assets', kind: 'assets' };
  const byId = new Map([...calculators, assetsDefinition].map((item) => [item.id, item]));
  const canvases = new Map(), sessions = new Map(), liveCards = new Map(), dockedPanels = new Map();
  const paneCanvases = { primary: '', secondary: '' };
  let designLab = null, creationPicker = null;
  let defaultCleanupQueued = false, collectingDefaults = false;
  const DESIGN_LAB_ID = 'dock:workspace-design-lab';
  let objectWorkspace = null, panelCatalog = null, renderingCardPicker = false, panelManagerOpen = false, restoringWorkspace = false;
  let activeCanvasId = '', focusedPane = 'primary', splitView = false, inspectorSourceId = '', suppressCanvasClickUntil = 0;
  const DEFAULT_CANVAS_HEIGHT = 680, MIN_CANVAS_HEIGHT = 240, MAX_CANVAS_HEIGHT = 1600;
  const ASSET_LAYOUTS = ['icons', 'list', 'details', 'tiles', 'content'];
  const OBJECT_INPUT_KINDS = ['number', 'young', 'lie', 'field', 'matrix', 'category', 'functor', 'dynkin', 'strands', ...(slicing?.kinds || []), ...(window.MathWorkspaceMosaic?.kinds||[]), ...(window.MathWorkspaceTopology?.kinds||[]), 'complex','filtration','field-extension'];
  const ASSET_KINDS = ['variety', 'sheaf', 'map', ...OBJECT_INPUT_KINDS];
  const INPUT_AUTOSAVE_DEBOUNCE_MS = 450, INPUT_AUTOSAVE_MAX_WAIT_MS = 1500;
  const assetState = {
    ready: true, editorCard: null, editorRecord: null, editorMode: 'create', activeInputInstanceKey: null, view: null,
    snapshot: { revision: 0, assets: [], capabilities: { variety: true, sheaf: true, map: true } },
    layout: 'icons', sort: 'creation', direction: 'asc', showDefaults: false, selected: new Set(), anchor: '', metadata: new Map(),
    creationCounter: 0, nextObjectId: 0, renameKey: '', marquee: null, canvasHeight: DEFAULT_CANVAS_HEIGHT,
    cards: { input: true, importExport: true },
    // Deprecated CARD-003 compatibility observations only.  New Property Card
    // renderers, commands, and callbacks must use their Slot/Instance binding.
    propertySession: null, propertyRef: null,
    referencePicker: null, draggedAssetKey: '', contextTargetRef: null
  };
  const $ = (selector) => document.querySelector(selector);
  const assetKey = (asset) => `${asset?.kind || ''}:${asset?.id || ''}`;
  const assetRef = (asset) => ({ kind: asset.kind, id: asset.id });

  const ASSET_CARD_REGISTRY = Object.freeze({
    input: Object.freeze({ cardType: 'input', label: 'Input', nativeCardKey: null, supportedKinds: Object.freeze(['variety', 'sheaf', 'map', 'young', 'lie']) }),
    hodge: Object.freeze({ cardType: 'hodge', label: 'Hodge Numbers', nativeCardKey: 'hodge-card', supportedKinds: Object.freeze(['variety']) }),
    betti: Object.freeze({ cardType: 'betti', label: 'Betti Table', nativeCardKey: 'betti-card', supportedKinds: Object.freeze(['variety']) }),
    'homology-variety': Object.freeze({ cardType: 'homology-variety', label: 'Variety Homology Classes', nativeCardKey: 'homology-card', supportedKinds: Object.freeze(['variety']) }),
    'homology-sheaf': Object.freeze({ cardType: 'homology-sheaf', label: 'Sheaf Class Relations', nativeCardKey: 'homology-card', supportedKinds: Object.freeze(['sheaf']) }),
    'homology-map': Object.freeze({ cardType: 'homology-map', label: 'Map Pullback / Pushforward', nativeCardKey: 'homology-card', supportedKinds: Object.freeze(['map']) }),
    'characteristic-classes': Object.freeze({ cardType: 'characteristic-classes', label: 'Characteristic Classes', nativeCardKey: 'class-card', supportedKinds: Object.freeze(['sheaf']) }),
    'sheaf-cohomology': Object.freeze({ cardType: 'sheaf-cohomology', label: 'Sheaf Cohomology', nativeCardKey: 'cohomology-card', supportedKinds: Object.freeze(['sheaf']) })
  });
  const NATIVE_ASSET_CARD_TYPES = Object.freeze(Object.keys(ASSET_CARD_REGISTRY).filter((cardType) => ASSET_CARD_REGISTRY[cardType].nativeCardKey));
  const ASSET_PROPERTY_CARDS = new Set(NATIVE_ASSET_CARD_TYPES.map((cardType) => ASSET_CARD_REGISTRY[cardType].nativeCardKey));
  const propertyCardType = (cardType,kind) => cardType==='homology' ? 'homology-'+kind : cardType;
  const cardSupportsAsset = (cardType, assetKind) => ASSET_CARD_REGISTRY[propertyCardType(cardType,assetKind)]?.supportedKinds.includes(assetKind) === true;
  const assetCardInstanceKey = (targetRef, cardType) => `asset:${targetRef?.kind || ''}:${targetRef?.id || ''}:${propertyCardType(cardType,targetRef?.kind)}`;
  const createAssetCardSlot = (cardType) => ({
    cardType, visible: cardType === 'input', activeInstanceKey: null, recentInstanceKeys: [],
    order: null, collapsed: false, pinned: false, displayMode: 'normal',
    rendererSession: null, bindingEpoch: 0, retargeting: false
  });
  function createAssetsCardCoordinator(options = {}) {
    return {
      slots: new Map(Object.keys(ASSET_CARD_REGISTRY).map((cardType) => [cardType, createAssetCardSlot(cardType)])),
      instances: new Map(), nextBindingToken: 0, outerRefreshCount: 0,
      inputTaskQueue: [], inputTaskRunning: false,
      // Browser timer functions require their Window receiver.  Keep the
      // coordinator API method-safe while preserving injected deterministic
      // timers used by the autosave tests.
      setTimer: options.setTimer || ((callback, delay) => setTimeout(callback, delay)),
      clearTimer: options.clearTimer || ((token) => clearTimeout(token)),
      now: options.now || Date.now
    };
  }
  const assetsCardState = createAssetsCardCoordinator();
  const importExportSlot = createAssetCardSlot('importExport');
  importExportSlot.visible = true;
  const assetsUtilitySlots = new Map([['importExport', importExportSlot]]);
  const cloneAssetRef = (ref) => ref ? { kind: ref.kind, id: ref.id } : null;
  const workspaceOwnedCardSlot = (key) => key === 'input' ? assetsCardState.slots.get('input') : assetsUtilitySlots.get(key) || null;
  function createAssetCardInstance(targetRef, cardType) {
    cardType=propertyCardType(cardType,targetRef?.kind);
    const stableRef = Object.freeze(cloneAssetRef(targetRef));
    return { key: assetCardInstanceKey(stableRef, cardType), targetRef: stableRef, cardType, localUiState: {}, capturedRevision: assetState.snapshot.revision, derivedStale: false };
  }

  function status(message, kind = '') {
    const node = $('#workspace-status');
    node.textContent = message || '';
    node.dataset.state = kind;
  }

  function makeNativeCalculator(calculator, options = {}) {
    const library = window.MathWorkspaceNativeEditors;
    const factory = library?.factories?.[calculator.nativeId];
    if (!factory?.mount) throw new Error(`The native ${calculator.label} editor is unavailable.`);
    const host = document.createElement('section'), inspectorHost = document.createElement('section');
    host.className = 'workspace-native-calculator'; host.dataset.nativeCalculator = calculator.nativeId;
    inspectorHost.className = 'workspace-native-inspector'; inspectorHost.dataset.nativeInspector = options.sessionId || calculator.id; inspectorHost.hidden = true;
    let editor;
    editor = factory.mount(host, {
      id: `workspace-${options.sessionId || calculator.id}`,
      inspectorHost,
      onChange: (change) => {
        for(const record of dockedPanels.values())if(record.source==='native-card'&&record.sessionId===calculator.id&&record.location!=='hidden'&&editor?.listCards().find(card=>card.key===record.key)?.visible===false)placeDockedPanel(record,'hidden');
        if (options.onChange) options.onChange(editor, change);
        else if (calculator.id === activeCanvasId) updateImportExport();
      },
      createAssetPropertyCommand: options.createAssetPropertyCommand,
      validateAssetCardBinding: options.validateAssetCardBinding,
      onCollectAssets: () => options.onCollectAssets?.(editor),
      onCollectComplexAssets: options.onCollectComplexAssets,
      onError: (error) => status(error?.message || String(error), 'error')
    });
    $('#workspace-canvas-parking').appendChild(host); $('#workspace-cards').appendChild(inspectorHost);
    // A workspace session starts with no Inspector cards selected.  The
    // historical calculator's default card state stays inside its editor,
    // but the shared Inspector is opt-in through its Add card checkboxes.
    editor.listCards?.().forEach((card) => editor.setCardVisible?.(card.key, false));
    editor.setCanvasActive?.(false); editor.setInspectorActive?.(false);
    return { host, inspectorHost, editor };
  }

  function ensureCalculatorSession(definition) {
    let session = sessions.get(definition.id);
    if (!session) {
      const options = definition.id === 'sheaf-complexes' ? {
        onCollectAssets: () => collectSheafComplexAssets(session),
        onCollectComplexAssets: () => {
          const entries=session.editor.objectIO('complex-entries')||[];
          let saved=0,skipped=0;
          for(const entry of entries.filter(item=>item.selected!==false)){
            if(!['chain-complex','filtration'].includes(entry.kind)){skipped++;continue;}
            const kind=entry.kind==='filtration'?'filtration':'complex';
            const data=window.MathWorkspaceStructures.fromComplexEntry(entry);
            const existing=assetState.snapshot.assets.find(a=>a.kind===kind&&a.data.legacy?.id===entry.id);
            const view=presentation.split(kind,{legacy:entry}).view;
            const asset=existing?updateObjectAsset(assetRef(existing),{data,view}):createObjectAsset(kind,{data,view});
            if(asset)objectWorkspace.open('complex-diagrams',assetKey(asset),'main');saved++;
          }
          status(`Saved ${saved} complex / filtration assets.${skipped?' Unsupported entries were retained in the original editor.':''}`,'success');
        },
        onChange: (_editor, change) => {
          if (!session || session.applyingAssets) return;
          captureSheafComplexLayout(session);
          if (change?.interaction === 'canvas-appearance' || change?.interaction === 'canvas-appearance-live' || change?.interaction === 'card-chrome') return;
          projectAssetsToSheafComplex(session);
        }
      } : definition.id==='mosaic'?{onCollectAssets:editor=>{
        try{
          const payload=editor.objectIO('mosaic-payload'),model=window.MathWorkspaceMosaic;
          const spaceData=model.fromPayload('mosaic-space',payload),diagramData=model.fromPayload('mosaic-diagram',payload,'');
          const space=createObjectAsset('mosaic-space',{data:spaceData});
          const diagram=createObjectAsset('mosaic-diagram',{data:{...diagramData,space:assetKey(space)}});
          objectWorkspace.open('mosaic-diagram-input',assetKey(diagram),'main');
          status('Saved Mosaic space and diagram to Assets.','success');
        }catch(error){status(error.message,'error');}
      }}:{};
      const created = makeNativeCalculator(definition, options);
      session = { kind: 'calculator', definition, canvasHeight: DEFAULT_CANVAS_HEIGHT, applyingAssets: false, assetProjection: definition.id === 'sheaf-complexes' ? { keys: new Set(), layout: new Map(), activeRef: null } : null, ...created };
      sessions.set(definition.id, session);
      if (session.assetProjection) {
        session.editor.applyAssets?.({ revision: 0, assets: [] }, null, null);
        session.editor.setCardVisible?.('canvas-appearance-card', true);
        bindSheafComplexAssetDrop(session);
      }
    }
    return session;
  }

  function ensureAssetsPropertySlotSession(cardType) {
    const slot = assetsCardState.slots.get(cardType), card = ASSET_CARD_REGISTRY[cardType];
    if (!slot || !card?.nativeCardKey) throw new Error('Unknown Assets Property Card.');
    if (slot.rendererSession) return slot.rendererSession;
    let session = null;
    const definition = byId.get('sheaf-complexes');
    const created = makeNativeCalculator(definition, {
      sessionId: `assets-properties-${cardType}`,
      createAssetPropertyCommand,
      validateAssetCardBinding: cardSupportsAsset,
      onChange: (_editor, change) => {
        try { handleAssetPropertySessionChange(session, change); }
        catch (error) { status(error?.message || String(error), 'error'); }
      },
      onCardAction: (action) => handleAssetPropertyCardAction(cardType, action),
      getCardActionState: () => assetPropertyCardActionState(cardType)
    });
    session = {
      kind: 'assets-property-slot', definition, cardType, applyingAssets: false,
      boundInstanceKey: null, bindingToken: null, ...created
    };
    session.inspectorHost.dataset.assetCardSlot = cardType;
    slot.rendererSession = session;
    session.editor.listCards?.().forEach((entry) => session.editor.setCardVisible?.(entry.key, false));
    session.editor.setCanvasActive?.(false);
    session.editor.setInspectorActive?.(false);
    return session;
  }

  const clampCanvasHeight = (height) => Math.max(MIN_CANVAS_HEIGHT, Math.min(MAX_CANVAS_HEIGHT, Math.round(Number(height) || DEFAULT_CANVAS_HEIGHT)));
  function canvasHeightFor(id) {
    if (id === 'assets') return clampCanvasHeight(assetState.canvasHeight);
    return clampCanvasHeight((sessions.get(id)||objectWorkspace?.panels.get(id)||dockedPanels.get(id))?.canvasHeight);
  }
  function canvasHeightModeFor(id) { return (id==='assets'?assetState:(sessions.get(id)||objectWorkspace?.panels.get(id)||dockedPanels.get(id)))?.canvasHeightMode; }
  function visibleCanvasIds() {
    return (splitView ? [paneCanvases.primary, paneCanvases.secondary] : [paneCanvases.primary]).filter(Boolean);
  }
  function updateCanvasHeightLayout() {
    const view = document.querySelector('.workspace-view-card'), panes = $('#workspace-canvas-panes'), resizer = $('#workspace-canvas-resizer');
    if (!view || !panes || !resizer) return;
    const ids = visibleCanvasIds(), preferred = ids.length ? Math.max(...ids.map(canvasHeightFor)) : DEFAULT_CANVAS_HEIGHT;
    const available = Math.max(MIN_CANVAS_HEIGHT, Math.floor(window.innerHeight - (view.getBoundingClientRect().top + window.scrollY) - 16));
    const outerHeight = ids.some(id=>canvasHeightModeFor(id)==='manual') ? preferred : Math.min(preferred, available);
    view.style.setProperty('--workspace-view-height', `${outerHeight}px`);
    const focusedHeight = outerHeight;
    resizer.setAttribute('aria-label',splitView?'Resize both canvas panes':'Resize canvas');
    resizer.setAttribute('aria-valuenow', String(focusedHeight));
    resizer.setAttribute('aria-disabled', String(!activeCanvasId));
    resizer.tabIndex = activeCanvasId ? 0 : -1;
    const applyPaneHeights = () => {
      const chromeHeight = Math.max(0, view.getBoundingClientRect().height - panes.getBoundingClientRect().height);
      ids.forEach((id) => {
        const node = canvases.get(id)?.node;
        if (node) node.style.setProperty('--workspace-session-pane-height', `${Math.max(0, outerHeight - chromeHeight)}px`);
      });
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(applyPaneHeights); else setTimeout(applyPaneHeights, 0);
  }
  function setCanvasHeight(id, height) {
    const next = clampCanvasHeight(height);
    if (id === 'assets') { assetState.canvasHeight = next; assetState.canvasHeightMode = 'manual'; }
    else {
      const session = sessions.get(id)||objectWorkspace?.panels.get(id)||dockedPanels.get(id);
      if (!session) return;
      session.canvasHeight = next; session.canvasHeightMode = 'manual';
    }
    updateCanvasHeightLayout();
  }
  function resizeVisibleCanvases(height){
    for(const id of splitView?visibleCanvasIds():[activeCanvasId])if(id)setCanvasHeight(id,height);
  }
  function visibleCanvasHeight(){return document.querySelector('.workspace-view-card')?.getBoundingClientRect().height || canvasHeightFor(activeCanvasId);}
  function beginCanvasResize(event) {
    if (!activeCanvasId || event.button !== 0) return;
    event.preventDefault();
    const resizer = event.currentTarget, startingHeight = visibleCanvasHeight(), startingY = event.clientY;
    resizer.setPointerCapture?.(event.pointerId);
    const resize = (move) => resizeVisibleCanvases(startingHeight + move.clientY - startingY);
    const finish = () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
  }
  function handleCanvasResizeKeydown(event) {
    if (!activeCanvasId) return;
    const step = event.shiftKey ? 80 : 24;
    if (event.key === 'ArrowUp') { event.preventDefault(); resizeVisibleCanvases(visibleCanvasHeight() - step); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); resizeVisibleCanvases(visibleCanvasHeight() + step); }
    else if (event.key === 'Home') { event.preventDefault(); resizeVisibleCanvases(MIN_CANVAS_HEIGHT); }
    else if (event.key === 'End') { event.preventDefault(); resizeVisibleCanvases(MAX_CANVAS_HEIGHT); }
  }

  function renderInspector() {
    scheduleDefaultCleanup();
    sessions.forEach((session) => {
      const hasVisibleCard = session.editor?.listCards?.().some((card) => !card.docked && card.available !== false && card.visible);
      session.editor?.setInspectorActive?.(!!hasVisibleCard);
    });
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => {
      const slot = assetsCardState.slots.get(cardType), session = slot?.rendererSession;
      if (!session) return;
      const cardKey = ASSET_CARD_REGISTRY[cardType].nativeCardKey;
      const instance = assetsCardState.instances.get(slot.activeInstanceKey);
      const hasVisibleCard = session.editor?.listCards?.().some((card) => card.key === cardKey && card.available !== false && card.visible);
      session.editor?.setInspectorActive?.(!!slot.visible && !!instance && (!!hasVisibleCard || !!session.dependencyInvalid));
    });
    $('#workspace-io-card').hidden = !workspaceOwnedCardSlot('importExport').visible;
    if (assetState.editorCard) assetState.editorCard.hidden = !workspaceOwnedCardSlot('input').visible;
    for (const record of dockedPanels.values()) {
      const active = record.location === 'side' || record.location === 'main' && visibleCanvasIds().includes(record.id);
      if (record.source === 'canvas') { record.node.hidden = record.location !== 'side'; if(record.location !== 'main')record.entry.editor?.setCanvasActive?.(active); }
      else { record.node.hidden = !active; record.entry.editor?.setCanvasActive?.(active); }
    }
    $('#workspace-add-card').setAttribute('aria-expanded', String(!$('#workspace-card-picker').hidden));
    refreshWorkspaceOwnedCardChrome();
  }

  function selectInspectorSource(id) {
    const definition = byId.get(id); if (!definition) return;
    if (inspectorSourceId === 'assets' && id !== 'assets') flushAssetInputInstance(activeAssetInputInstance());
    if (definition.kind === 'calculator') ensureCalculatorSession(definition);
    inspectorSourceId = id; renderInspector(); updateImportExport(); renderCardPicker();
  }

  function openCanvas(id) {
    if (id.startsWith('object:')) { objectWorkspace?.open(id.slice(7), '', 'main'); return; }
    const definition = byId.get(id);
    if (!definition) return;
    if(dockedPanels.has(id)){placeDockedPanel(dockedPanels.get(id),'main');return;}
    if (!canvases.has(id)) {
      if (definition.kind === 'assets') {
        canvases.set(id, { kind: 'assets', definition, node: ensureAssetsView() });
        ensureAssetsEditor(false);
      } else {
        try {
          const session = ensureCalculatorSession(definition);
          canvases.set(id, { kind: 'calculator', definition, node: session.host, editor: session.editor, ready: true });
        } catch (error) {
          status(error?.message || String(error), 'error');
          return;
        }
      }
    }
    if (!inspectorSourceId) selectInspectorSource(id);
    selectCanvasTab(id);
  }

  const otherPane = (name) => name === 'primary' ? 'secondary' : 'primary';
  const openedCanvasIds = () => Array.from(canvases.keys());
  function createDockedPanel(spec) {
    if(dockedPanels.has(spec.id))return dockedPanels.get(spec.id);
    const record={...spec,location:'side',canvasHeight:clampCanvasHeight(spec.canvasHeight)};
    if(spec.source==='canvas'){
      const definition=byId.get(spec.id),session=sessions.get(spec.id);
      record.entry=canvases.get(spec.id)||{kind:definition.kind,definition,node:spec.id==='assets'?ensureAssetsView():session.host,editor:session?.editor,ready:true};
      const shell=document.createElement('section'),head=document.createElement('div'),title=document.createElement('span'),body=document.createElement('div');
      shell.className='card workspace-assets-inspector-card workspace-docked-canvas';head.className='card-head';head.tabIndex=0;head.setAttribute('role','button');head.setAttribute('aria-expanded','true');title.className='card-head-label';title.textContent=definition.label;body.className='card-body';head.append(title,Object.assign(document.createElement('em'),{className:'toggle-icon',textContent:'▾'}));shell.append(head,body);record.node=shell;record.body=body;
      const toggle=event=>{if(!shouldToggleWorkspaceOwnedCard(event,shell))return;shell.classList.toggle('collapsed');head.setAttribute('aria-expanded',String(!shell.classList.contains('collapsed')));};
      head.addEventListener('click',toggle);head.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(event);}});
      installWorkspaceOwnedCardChrome(shell,spec.id,{hide:()=>placeDockedPanel(record,'hidden'),actions:[['move-area','Move to main area','↗',()=>placeDockedPanel(record,'main')]]});
    }else{
      let editor,label;
      if(spec.source==='native-card'){
        const session=sessions.get(spec.sessionId);if(!session)throw new Error('The calculator panel no longer exists.');
        record.node=document.createElement('section');record.node.className='workspace-native-inspector workspace-docked-native';
        if(!session.editor.moveCardSurface(spec.key,record.node))throw new Error('The calculator card no longer exists.');
        label=session.editor.listCards().find(card=>card.key===spec.key).label;
        editor={setCanvasActive:active=>session.editor.setCardSurfaceActive(spec.key,active)};
      }else{
        record.node=[...$('#workspace-cards').children].find(node=>inspectorNodeKey(node)===spec.key);
        if(!record.node)throw new Error('The sidebar panel no longer exists.');
        const session=record.node.dataset.assetCardSlot&&assetsCardState.slots.get(record.node.dataset.assetCardSlot)?.rendererSession;
        label=record.node.querySelector('.card-head-label')?.textContent||session?.editor.listCards().find(card=>card.visible)?.label||'Panel';
        editor=session?{setCanvasActive:active=>session.editor.setInspectorActive(active)}:null;
      }
      record.entry={kind:'docked-panel',definition:{id:spec.id,label,kind:'docked-panel'},node:record.node,editor};byId.set(spec.id,record.entry.definition);
    }
    record.node.dataset.dockedPanel=record.id;dockedPanels.set(record.id,record);return record;
  }
  function placeDockedPanel(record,location){
    if(canvases.has(record.id))closeCanvas(record.id);
    record.location=location;
    if(location==='main'){
      record.node.classList.remove('collapsed');record.node.querySelector('.card-head')?.setAttribute('aria-expanded','true');
      if(record.source==='native-card')sessions.get(record.sessionId).editor.setCardPresentation(record.key,{collapsed:false});
      if(record.source==='sidebar'&&record.node.dataset.assetCardSlot){const slot=assetsCardState.slots.get(record.node.dataset.assetCardSlot);slot.collapsed=false;slot.rendererSession?.editor.setCardPresentation(ASSET_CARD_REGISTRY[slot.cardType].nativeCardKey,{collapsed:false});}
      if(record.source==='canvas'){record.node.hidden=true;$('#workspace-canvas-parking').append(record.node);}
      record.entry.node.classList.remove('collapsed');record.entry.node.dataset.location='main';
      canvases.set(record.id,record.entry);selectCanvasTab(record.id);
    }else{
      record.entry.node.dataset.location='side';
      if(record.source==='canvas')record.body.append(record.entry.node);
      (location==='side'?$('#workspace-cards'):$('#workspace-canvas-parking')).prepend(record.node);
      record.node.hidden=location==='hidden';record.entry.node.hidden=location==='hidden';record.entry.editor?.setCanvasActive?.(location==='side');
      renderCanvasView();updateImportExport();
    }
  }
  function reorderCanvasTabs(id,before){
    const entry=canvases.get(id);if(!entry)return;
    const entries=[...canvases].filter(([key])=>key!==id),index=entries.findIndex(([key])=>key===before);
    entries.splice(index<0?entries.length:index,0,[id,entry]);canvases.clear();entries.forEach(([key,value])=>canvases.set(key,value));renderCanvasTabs();updateImportExport();
  }
  function clearDockedPanels(){
    for(const record of dockedPanels.values()){
      if(record.source==='canvas'){$('#workspace-canvas-parking').append(record.entry.node);record.node.remove();}
      else if(record.source==='native-card'){sessions.get(record.sessionId)?.editor.returnCardSurface(record.key);byId.delete(record.id);}
      else{delete record.node.dataset.dockedPanel;$('#workspace-cards').append(record.node);byId.delete(record.id);}
    }
    dockedPanels.clear();
  }
  function selectCanvasTab(id) {
    if (!canvases.has(id)) return;
    const other = otherPane(focusedPane);
    if (splitView && paneCanvases[other] === id) {
      const current = paneCanvases[focusedPane]; paneCanvases[focusedPane] = id; paneCanvases[other] = current;
    } else {
      paneCanvases[focusedPane] = id;
      if (!splitView) paneCanvases.secondary = '';
    }
    activeCanvasId = paneCanvases[focusedPane];
    renderCanvasView(); updateImportExport();
  }
  function focusCanvasPane(name) {
    const id = paneCanvases[name];
    if (!id || (focusedPane === name && activeCanvasId === id)) return;
    focusedPane = name; activeCanvasId = id; renderCanvasView(); updateImportExport();
  }
  function setSplitView(enabled) {
    const ids = openedCanvasIds();
    if (enabled && ids.length < 2) return;
    splitView = !!enabled;
    if (splitView) {
      const other = otherPane(focusedPane);
      if (!paneCanvases[other] || paneCanvases[other] === paneCanvases[focusedPane]) paneCanvases[other] = ids.find((id) => id !== paneCanvases[focusedPane]) || '';
    } else {
      paneCanvases.secondary = ''; focusedPane = 'primary'; activeCanvasId = paneCanvases.primary;
    }
    renderCanvasView(); updateImportExport();
  }
  function closeCanvas(id) {
    const canvas = canvases.get(id);
    if (!canvas) return;
    if (canvas.kind === 'calculator') {
      $('#workspace-canvas-parking').appendChild(canvas.node); canvas.node.hidden = true; canvas.editor?.setCanvasActive?.(false);
    } else {
      $('#workspace-canvas-parking').appendChild(canvas.node); canvas.node.hidden = true;
    }
    canvases.delete(id);
    if(dockedPanels.has(id))dockedPanels.get(id).location='hidden';
    if (canvas.kind === 'object-panel') objectWorkspace?.closed(id);
    const ids = openedCanvasIds();
    ['primary', 'secondary'].forEach((name) => {
      if (paneCanvases[name] === id) paneCanvases[name] = ids.find((candidate) => candidate !== paneCanvases[otherPane(name)]) || '';
    });
    if (splitView && (!paneCanvases.primary || !paneCanvases.secondary)) splitView = false;
    if (!splitView) {
      paneCanvases.primary = paneCanvases.primary || paneCanvases.secondary || ids[0] || '';
      paneCanvases.secondary = ''; focusedPane = 'primary';
    } else if (!paneCanvases[focusedPane]) focusedPane = paneCanvases.primary ? 'primary' : 'secondary';
    activeCanvasId = paneCanvases[focusedPane] || '';
    renderCanvasView(); updateImportExport();
  }

  function renderCanvasTabs() {
    const host = $('#workspace-canvas-tabs'); host.replaceChildren();
    if (splitView) host.setAttribute('aria-multiselectable', 'true');
    else host.removeAttribute('aria-multiselectable');
    canvases.forEach((entry, id) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', className: `workspace-canvas-tab${id === activeCanvasId ? ' active' : ''}`, textContent: entry.definition.label });
      const shownIn = splitView ? (id === paneCanvases.primary ? 'primary' : id === paneCanvases.secondary ? 'secondary' : '') : '';
      button.dataset.canvasTab = id; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(splitView ? !!shownIn : id === activeCanvasId));
      if (shownIn) button.dataset.shownIn = shownIn;
      if (splitView && id === activeCanvasId) button.setAttribute('aria-current', 'true');
      if (shownIn && shownIn !== focusedPane) button.title = 'Shown in the other pane. Click to swap sides.';
      button.addEventListener('click', () => {if(Date.now()>=suppressCanvasClickUntil)selectCanvasTab(id);});
      const close = Object.assign(document.createElement('button'), { type: 'button', className: 'workspace-canvas-tab-close', textContent: '×', title: `Close ${entry.definition.label}` });
      close.setAttribute('aria-label', close.title); close.addEventListener('click', (event) => { event.stopPropagation(); closeCanvas(id); });
      const tab = Object.assign(document.createElement('div'), { className: 'workspace-canvas-tab-group' }); tab.append(button, close); host.appendChild(tab);
    });
  }

  function updateCanvasPaneTitles() {
    ['primary', 'secondary'].forEach((name) => {
      const pane = $('#workspace-canvas-pane-' + name);
      let title = pane.querySelector('.workspace-canvas-pane-title');
      if (!title) {
        title = Object.assign(document.createElement('div'), { id: pane.id + '-title', className: 'workspace-canvas-pane-title', hidden: true });
        pane.prepend(title);
      }
      const label = byId.get(paneCanvases[name])?.label || '';
      title.textContent = label; title.title = label;
      pane.setAttribute('aria-labelledby', title.id);
    });
  }

  function renderCanvasView() {
    const panes = $('#workspace-canvas-panes'), primary = $('#workspace-canvas-pane-primary'), secondary = $('#workspace-canvas-pane-secondary'), parking = $('#workspace-canvas-parking');
    panes.dataset.split = String(splitView); secondary.hidden = !splitView;
    updateCanvasPaneTitles();
    [primary, secondary].forEach((pane) => pane.classList.toggle('focused', pane.dataset.pane === focusedPane));
    canvases.forEach((entry, id) => {
      const paneName = id === paneCanvases.primary ? 'primary' : (splitView && id === paneCanvases.secondary ? 'secondary' : '');
      if (paneName) {
        const slot = document.querySelector(`#workspace-canvas-pane-${paneName} .workspace-canvas-pane-slot`);
        slot.querySelector('.workspace-canvas-empty')?.remove();
        const alreadyActive = entry.node.parentElement === slot && !entry.node.hidden;
        if (!alreadyActive) {
          if (entry.node.parentElement !== slot) slot.appendChild(entry.node);
          entry.node.hidden = false;
          entry.editor?.setCanvasActive?.(true);
        }
      } else {
        const alreadyInactive = entry.node.parentElement === parking && entry.node.hidden;
        if (!alreadyInactive) {
          if (entry.node.parentElement !== parking) parking.appendChild(entry.node);
          entry.node.hidden = true;
          entry.editor?.setCanvasActive?.(false);
        }
      }
    });
    [primary, secondary].forEach((pane) => {
      const slot = pane.querySelector('.workspace-canvas-pane-slot'), id = paneCanvases[pane.dataset.pane];
      pane.classList.toggle('workspace-canvas-pane-empty', !id);
      if (!id) slot.replaceChildren(Object.assign(document.createElement('p'), { className: 'workspace-canvas-empty', textContent: 'Open a view to begin.' }));
    });
    $('#workspace-canvas-name').textContent = activeCanvasId ? byId.get(activeCanvasId).label : 'Choose a view';
    const split = $('#workspace-split-view'); split.disabled = canvases.size < 2; split.textContent = splitView ? 'single view' : 'split view'; split.setAttribute('aria-pressed', String(splitView));
    renderCanvasTabs(); renderInspector(); renderCardPicker(); updateCanvasHeightLayout();
    objectWorkspace?.resize();
  }

  function availableCardsFor(sourceId) {
    if (sourceId === 'objects') return objectWorkspace?.listCards() || [];
    if (sourceId === 'assets') {
      ensureAssetsEditor(false);
      return [
        { key: 'input', label: 'Assets Input', available: true, visible: !!workspaceOwnedCardSlot('input').visible },
        { key: 'importExport', label: 'Import / Export (session-only)', available: true, visible: !!workspaceOwnedCardSlot('importExport').visible }
      ];
    }
    const definition = byId.get(sourceId);
    if (!definition || definition.kind !== 'calculator') return [];
    const session = ensureCalculatorSession(definition), cards = session.editor.listCards?.() || [];
    // A projected Sheaf Complex card has no independent mathematical target.
    // Object-owned cards must instead be opened through openAssetProperty(),
    // which passes the stable Asset reference and commits through its command.
    if (session.assetProjection?.keys.size) return cards.map((card) => ASSET_PROPERTY_CARDS.has(card.key)
      ? { ...card, available: false, visible: false, unavailableReason: 'Open this from Assets > Properties so it stays bound to one Asset.' }
      : card);
    return cards;
  }

  function applyCardVisibility(sourceId, key, visible) {
    if (sourceId === 'objects') { objectWorkspace?.setVisible(key, visible); return; }
    if (sourceId === 'assets') {
      if (key === 'input' && !visible) flushAssetInputInstance(activeAssetInputInstance());
      const slot = workspaceOwnedCardSlot(key);
      if (!slot) return;
      slot.visible = !!visible;
      // Compatibility observation for older tests/imported session state.
      assetState.cards[key] = !!visible;
      if (key === 'input' && visible) ensureAssetsEditor(false);
      const docked=[...dockedPanels.values()].find(record=>record.source==='sidebar'&&record.key===(key==='importExport'?'workspace-io-card':assetState.editorCard?.dataset.workspaceCard));
      if(docked)placeDockedPanel(docked,visible?'side':'hidden');
      return;
    }
    const definition = byId.get(sourceId);
    if (definition?.kind === 'calculator') {
      const session = ensureCalculatorSession(definition);
      if (session.assetProjection?.keys.size && ASSET_PROPERTY_CARDS.has(key)) return;
      session.editor.setCardVisible?.(key, visible);
      const docked=[...dockedPanels.values()].find(record=>record.source==='native-card'&&record.sessionId===sourceId&&record.key===key);
      if(docked)placeDockedPanel(docked,visible?'side':'hidden');
    }
  }
  function setCardVisibility(sourceId, key, visible) {
    applyCardVisibility(sourceId, key, visible);
    renderInspector(); renderCardPicker();
  }

  function renderCardPicker() {
    const options = $('#workspace-card-options');
    if (!options || !panelCatalog || $('#workspace-card-picker').hidden || renderingCardPicker) return;
    renderingCardPicker = true;
    try {
      const focusedOption = options.contains(document.activeElement) ? document.activeElement.dataset.optionIdentity : '';
      const selected = [...assetState.selected].map(key => assetByKey(key)).filter(Boolean);
      const name = key => assetByKey(key)?.plainName || assetByKey(key)?.name || 'Missing asset';
      const bindings = refs => [...new Set(Object.entries(refs || {}).filter(([role]) => role !== 'view').flatMap(([,value]) => Array.isArray(value) ? value : [value]).filter(Boolean))];
      const allPanels = [...(objectWorkspace?.panels.values() || [])];
      const panelLabel = panel => panel.definition.label + (bindings(panel.computation?.refs).length ? ' · ' + bindings(panel.computation.refs).map(name).join(', ') : '');
      const views = allPanels.map((panel,index) => ({ id: panel.id, type: panel.definition.id, closed: panel.closed, active: panel.id === activeCanvasId, assetKeys: panel.assetKey ? [panel.assetKey] : bindings(panel.computation?.refs), label: (panel.assetKey ? name(panel.assetKey) : panelLabel(panel)) + ' · View ' + (index+1) }));
      const suggestions = panelCatalog.suggest(selected.map(assetKey),assetState.snapshot.assets,views), represented = new Set();
      $('#workspace-card-context').textContent = selected.length ? 'Selected: ' + selected.map(asset => asset.plainName || asset.name).join(', ') : 'Select one or more assets to see matching panels.';
      options.replaceChildren();
      const heading = (label,parent=options) => parent.appendChild(Object.assign(document.createElement('div'),{className:'workspace-card-options-heading',textContent:label}));
      const append = (parent,{key,identity=key,type,label,detail,checked,action}) => {
        const row = Object.assign(document.createElement('label'),{className:'workspace-check workspace-card-option'}), check = Object.assign(document.createElement('input'),{type:'checkbox',checked:!!checked});
        check.dataset.cardKey=key;check.dataset.optionIdentity=identity;if(type)check.dataset.panelType=type;
        const text=document.createElement('span');text.append(document.createTextNode(label));if(detail)text.append(Object.assign(document.createElement('small'),{textContent:detail}));
        check.addEventListener('change',()=>{try{action(check.checked);}catch(error){status(error.message,'error');}renderInspector();renderCardPicker();});
        row.append(check,text);parent.append(row);
      };
      const appendSuggestion = suggestion => {
        const panel = suggestion.route==='objects' ? allPanels.filter(panel=>{
          if(!panel.computation)return false;
          const refs=panel.definition.id==='plethysm'&&!suggestion.refs.lambda&&panel.computation.settings?.mode!=='advanced'?{mu:panel.computation.refs.mu}:panel.computation.refs;
          return panelCatalog.bindingKey(panel.definition.id,refs,panel.computation.rule)===suggestion.key;
        }).sort((a,b)=>Number(a.closed)-Number(b.closed))[0] : null;
        const slot = suggestion.route==='assets' ? assetsCardState.slots.get(suggestion.cardType) : null;
        const target = suggestion.refs.asset, instanceKey = target && assetCardInstanceKey(assetRefFromKey(target),suggestion.cardType);
        const isBound = !!slot && !!instanceKey && slot.activeInstanceKey===instanceKey;
        if(panel)represented.add(panel.id);if(isBound)represented.add(suggestion.id);
        const context = suggestion.viewLabel || bindings(suggestion.refs).map(name).join(', ');
        append(options,{key:panel?.id || 'suggest:'+suggestion.key,identity:suggestion.key,type:suggestion.id,label:suggestion.label,detail:[context,suggestion.missing.length?'Needs: '+suggestion.missing.join(', '):''].filter(Boolean).join(' · '),checked:panel ? !panel.closed : isBound&&slot.visible,action:visible=>{
          if(suggestion.route==='objects') {
            if(panel)objectWorkspace.setVisible(panel.id,visible);
            else if(visible)objectWorkspace.open(suggestion.id,'','side',{keepPickerOpen:true,refs:suggestion.refs,rule:suggestion.rule});
          } else if(visible)bindAssetPropertySlot(suggestion.cardType,assetRefFromKey(target),{selectTarget:false});
          else if(isBound)slot.visible=false;
        }});
      };
      for(const [label,items] of [['Properties',suggestions.filter(s=>s.ready&&s.role==='property')],['More inputs needed',suggestions.filter(s=>!s.ready&&s.role==='property')],['Open / display',suggestions.filter(s=>s.role==='display')],['View settings',suggestions.filter(s=>s.role==='view')]]) {
        if(items.length){heading(label);items.forEach(appendSuggestion);}
      }
      if(selected.length&&!suggestions.length)options.appendChild(Object.assign(document.createElement('p'),{className:'workspace-card-context',textContent:'No additional panels for this selection.'}));
      const existing=allPanels.filter(panel=>!panel.definition.input&&!represented.has(panel.id));
      const nativeExisting=NATIVE_ASSET_CARD_TYPES.filter(type=>assetsCardState.slots.get(type)?.activeInstanceKey&&!represented.has('asset:'+type));
      if(existing.length||nativeExisting.length) {
        const details=document.createElement('details');details.className='workspace-existing-panels';details.open=panelManagerOpen;
        details.appendChild(Object.assign(document.createElement('summary'),{textContent:'Existing panels ('+(existing.length+nativeExisting.length)+')'}));
        details.addEventListener('toggle',()=>{if(details.isConnected)panelManagerOpen=details.open;});options.append(details);
        existing.forEach(panel=>append(details,{key:panel.id,type:panel.definition.id,label:panelLabel(panel),checked:!panel.closed,action:visible=>objectWorkspace.setVisible(panel.id,visible)}));
        nativeExisting.forEach(type=>{const slot=assetsCardState.slots.get(type),instance=assetsCardState.instances.get(slot.activeInstanceKey),card=ASSET_CARD_REGISTRY[type];append(details,{key:'asset:'+type,label:card.targetLabels?.[instance?.targetRef?.kind]||card.label,detail:instance?name(assetKey(instance.targetRef)):'',checked:slot.visible,action:visible=>{slot.visible=visible;}});});
      }
      if(sessions.has(activeCanvasId)&&byId.get(activeCanvasId)?.kind==='calculator') {
        const sourceId=activeCanvasId,cards=availableCardsFor(sourceId).filter(card=>card.available!==false&&!['input-card','homology-card'].includes(card.key));
        if(cards.length){heading('Current view · '+byId.get(sourceId).label);cards.forEach(card=>append(options,{key:card.key,label:card.label,checked:!!card.visible&&(card.docked?[...dockedPanels.values()].some(record=>record.sessionId===sourceId&&record.key===card.key&&record.location!=='hidden'):!sessions.get(sourceId).inspectorHost.hidden),action:visible=>applyCardVisibility(sourceId,card.key,visible)}));}
      }
      const closedDocked=[...dockedPanels.values()].filter(record=>record.location==='hidden'&&record.id!==DESIGN_LAB_ID);
      if(closedDocked.length){heading('Closed panels');closedDocked.forEach(record=>append(options,{key:record.id,label:record.entry.definition.label,checked:false,action:visible=>{if(visible){if(record.source==='native-card')sessions.get(record.sessionId).editor.setCardVisible(record.key,true);placeDockedPanel(record,'side');}}}));}
      if(designLab?.active) append(options,{key:'design-lab',label:'Design Lab',checked:!document.getElementById('workspace-design-lab')?.hidden,action:visible=>{if(visible)designLab.open();else {const record=dockedPanels.get(DESIGN_LAB_ID);if(record)placeDockedPanel(record,'hidden');}}});
      heading('Workspace');append(options,{key:'importExport',label:'Import / Export',checked:workspaceOwnedCardSlot('importExport').visible,action:visible=>applyCardVisibility('assets','importExport',visible)});
      if(focusedOption)[...options.querySelectorAll('input')].find(input=>input.dataset.optionIdentity===focusedOption)?.focus({preventScroll:true});
    } finally { renderingCardPicker=false; }
  }

  function closeCardPicker() {
    const picker = $('#workspace-card-picker'); if (picker.hidden) return false;
    picker.hidden = true; $('#workspace-add-card').setAttribute('aria-expanded', 'false'); return true;
  }

  function openCardPicker() {
    const picker = $('#workspace-card-picker'), button = $('#workspace-add-card'), rect = button.getBoundingClientRect();
    picker.hidden = false; renderCardPicker();picker.style.left = `${Math.max(8, Math.min(rect.right - 310, window.innerWidth - 318))}px`; picker.style.top = `${Math.min(rect.bottom + 7, window.innerHeight - 120)}px`;
    button.setAttribute('aria-expanded', 'true'); $('#workspace-card-options input')?.focus();
  }

  function workspaceOwnedAssetCards() {
    return Array.from($('#workspace-cards').children).filter((card) =>
      !card.hidden && (card.classList.contains('workspace-assets-inspector-card') || !!card.dataset.assetCardSlot));
  }
  function workspaceOwnedCardKey(card) {
    return card?.dataset?.workspaceOwnedChrome || card?.dataset?.assetCardSlot || '';
  }
  function syncWorkspaceOwnedCardSlot(card) {
    const slot = workspaceOwnedCardSlot(workspaceOwnedCardKey(card));
    if (!slot || !card?.classList?.contains('workspace-assets-inspector-card')) return;
    slot.visible = !card.hidden;
    slot.collapsed = card.classList.contains('collapsed');
    slot.pinned = card.classList.contains('is-pinned');
    slot.displayMode = card.dataset.cardWideState || 'normal';
    assetState.cards[slot.cardType] = slot.visible;
  }
  function syncWorkspaceOwnedCardOrder() {
    workspaceOwnedAssetCards().forEach((card, order) => {
      const slot = workspaceOwnedCardSlot(workspaceOwnedCardKey(card)) || assetsCardState.slots.get(workspaceOwnedCardKey(card));
      if (slot) slot.order = order;
    });
    updateAssetPropertySlotOrder();
    refreshWorkspaceOwnedCardChrome();
  }
  function workspaceOwnedCardActionState(card) {
    const cards = workspaceOwnedAssetCards(), index = cards.indexOf(card);
    return { canMoveUp: index > 0, canMoveDown: index >= 0 && index < cards.length - 1 };
  }
  function refreshWorkspaceOwnedCardChrome() {
    const cards = workspaceOwnedAssetCards();
    cards.forEach((card) => {
      const state = workspaceOwnedCardActionState(card);
      card.querySelector?.('[data-workspace-card-action="move-up"]')?.toggleAttribute('disabled', !state.canMoveUp);
      card.querySelector?.('[data-workspace-card-action="move-down"]')?.toggleAttribute('disabled', !state.canMoveDown);
    });
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => assetsCardState.slots.get(cardType)?.rendererSession?.editor?.refreshCardDock?.());
  }
  function moveWorkspaceOwnedCard(card, delta) {
    const cards = workspaceOwnedAssetCards(), index = cards.indexOf(card), other = cards[index + delta];
    if (!other) return false;
    card.parentElement.insertBefore(card, delta < 0 ? other : other.nextSibling);
    syncWorkspaceOwnedCardOrder();
    refreshWorkspaceOwnedCardChrome();
    return true;
  }
  function assetPropertyCardActionState(cardType) {
    const host = assetsCardState.slots.get(cardType)?.rendererSession?.inspectorHost;
    return host ? workspaceOwnedCardActionState(host) : { canMoveUp: false, canMoveDown: false };
  }
  function handleAssetPropertyCardAction(cardType, action = {}) {
    const slot = assetsCardState.slots.get(cardType), host = slot?.rendererSession?.inspectorHost;
    if (!slot || !host) return false;
    if (action.action === 'move') return moveWorkspaceOwnedCard(host, Number(action.delta) || 0);
    if (action.action === 'hide') {
      slot.visible = false;
      renderInspector();
      if (!$('#workspace-card-picker')?.hidden) renderCardPicker();
      refreshWorkspaceOwnedCardChrome();
      return true;
    }
    return false;
  }
  function applyWorkspaceOwnedSlotPresentation(card, key) {
    const slot = workspaceOwnedCardSlot(key);
    if (!card || !slot) return;
    card.classList.toggle('collapsed', !!slot.collapsed);
    card.classList.toggle('is-pinned', !!slot.pinned);
    card.dataset.cardWideState = slot.displayMode || 'normal';
    card.querySelector('.card-head')?.setAttribute('aria-expanded', String(!slot.collapsed));
    card.querySelector('.card-pin-btn')?.setAttribute('aria-pressed', String(!!slot.pinned));
  }
  function installWorkspaceOwnedCardChrome(card, key, options = {}) {
    if (!card || card.dataset.workspaceOwnedChrome) return;
    card.dataset.workspaceOwnedChrome = key;
    const head = card.querySelector('.card-head'); if (!head) return;
    if (!head.querySelector('.drag-handle')) head.insertBefore(Object.assign(document.createElement('span'), { className: 'drag-handle', textContent: '⋮⋮' }), head.firstChild).setAttribute('aria-hidden', 'true');
    const tools = Object.assign(document.createElement('span'), { className: 'workspace-card-tools' });
    const hide = () => {
      if (options.hide) { options.hide(); refreshWorkspaceOwnedCardChrome(); renderCardPicker(); return; }
      const slot = workspaceOwnedCardSlot(key); if (!slot) return;
      slot.visible = false; assetState.cards[key] = false; renderInspector(); renderCardPicker(); refreshWorkspaceOwnedCardChrome();
    };
    [...(options.actions || []), ['move-up', 'Move up', '↑', () => moveWorkspaceOwnedCard(card, -1)], ['move-down', 'Move down', '↓', () => moveWorkspaceOwnedCard(card, 1)], ['hide', 'Hide card', '×', hide]].forEach(([actionKey, label, glyph, action]) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', className: 'workspace-card-tool', textContent: glyph, title: label });
      button.dataset.workspaceCardAction = actionKey;
      button.setAttribute('aria-label', label);
      ['pointerdown', 'mousedown', 'touchstart', 'keydown'].forEach((type) => button.addEventListener(type, (event) => event.stopPropagation()));
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); action(); }); tools.appendChild(button);
    });
    head.appendChild(tools);
    applyWorkspaceOwnedSlotPresentation(card, key);
  }

  function shouldToggleWorkspaceOwnedCard(event, card) {
    if (event.target.closest('.workspace-card-tools, .drag-handle')) return false;
    if (!card.dataset.workspaceCardDragSuppressed) return true;
    delete card.dataset.workspaceCardDragSuppressed;
    return false;
  }

  function cloneWorkspaceDragPreview(source, nested=false) {
    const sourceRoot=source.getRootNode();
    if(!nested&&sourceRoot instanceof ShadowRoot){
      const host=document.createElement('section'),root=host.attachShadow({mode:'open'}),content=document.createElement('div');content.className='workspace-card-inspector';
      for(const css of sourceRoot.querySelectorAll('style'))root.append(css.cloneNode(true));
      content.append(cloneWorkspaceDragPreview(source,true));root.append(content);return host;
    }
    const clone = source.cloneNode(false);
    for (const child of source.childNodes) clone.appendChild(cloneWorkspaceDragPreview(child,true));
    // Native calculator cards live in shadow roots, which cloneNode omits.
    if (source.shadowRoot) {
      const shadow = clone.attachShadow({ mode: 'open' });
      for (const child of source.shadowRoot.childNodes) shadow.appendChild(cloneWorkspaceDragPreview(child,true));
    }
    if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement || source instanceof HTMLSelectElement) clone.value = source.value;
    if (source instanceof HTMLInputElement) clone.checked = source.checked;
    if (source instanceof HTMLCanvasElement) {
      try { clone.getContext('2d')?.drawImage(source, 0, 0); } catch (_) {}
    }
    return clone;
  }

  function enableWorkspaceOwnedCardDragging() {
    const container = $('#workspace-cards');
    if (!container || container.dataset.workspaceOwnedDragReady) return;
    container.dataset.workspaceOwnedDragReady = 'true';
    document.querySelector('.math-workspace-layout').addEventListener('pointerdown', (event) => {
      const path = event.composedPath?.() || [event.target];
      const tab = path.find(node=>node?.dataset?.canvasTab);
      const handle = tab || path.find((node) => node?.classList?.contains('drag-handle'));
      const objectNode = path.find(node => node?.dataset?.objectPanel);
      const panel = objectWorkspace?.panels.get(tab?.dataset.canvasTab||objectNode?.dataset.objectPanel);
      const topCard = path.find(node=>node?.dataset?.dockedPanel||node?.parentElement===container&&(node.classList?.contains('workspace-assets-inspector-card')||node.dataset?.assetCardSlot));
      const nativeCard = path.find(node=>node?.dataset?.workspaceCardId), nativeHost=path.find(node=>node?.dataset?.nativeInspector);
      const card = tab?.closest('.workspace-canvas-tab-group') || objectNode || topCard || nativeCard;
      if (!handle || !card || event.button !== 0) return;
      let spec = panel ? null : dockedPanels.get(tab?.dataset.canvasTab||topCard?.dataset.dockedPanel);
      if(!panel&&!spec){
        if(tab)spec={id:tab.dataset.canvasTab,source:'canvas'};
        else if(topCard)spec={id:'dock:'+inspectorNodeKey(topCard),source:'sidebar',key:inspectorNodeKey(topCard)};
        else if(nativeCard&&sessions.has(nativeHost?.dataset.nativeInspector))spec={id:'native-card:'+nativeHost.dataset.nativeInspector+':'+nativeCard.dataset.workspaceCardId,source:'native-card',sessionId:nativeHost.dataset.nativeInspector,key:nativeCard.dataset.workspaceCardId};
        else return;
      }
      const id=panel?.id||spec.id,tabs=$('#workspace-canvas-tabs');
      const rect = card.getBoundingClientRect();
      const drag = { startX: event.clientX, startY: event.clientY, active: false, ghost: null, placeholder: null, pane: null, target: null, beforeTab:null };
      const display = card.style.display, pointerId = event.pointerId;
      const clearPane = () => { drag.pane?.removeAttribute('data-panel-drop'); drag.pane = null; };
      const move = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        if (!drag.active && Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY) < 4) return;
        moveEvent.preventDefault();
        if (!drag.active) {
          drag.active = true;
          drag.ghost = cloneWorkspaceDragPreview(card);
          drag.ghost.id = 'workspace-card-drag-ghost';
          drag.ghost.removeAttribute('data-object-panel');
          drag.ghost.removeAttribute('data-docked-panel');
          drag.ghost.setAttribute('aria-hidden', 'true');
          drag.ghost.inert = true;
          Object.assign(drag.ghost.style, { position: 'fixed', width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', zIndex: '9999', pointerEvents: 'none', opacity: '.88', boxShadow: '0 8px 32px rgba(0,0,0,.22)', overflow: 'hidden', transition: 'none' });
          document.body.appendChild(drag.ghost);
          drag.placeholder = document.createElement('div');
          drag.placeholder.className = 'workspace-card-drop-placeholder';
          drag.placeholder.setAttribute('aria-hidden', 'true');
          drag.placeholder.style.height = `${tab?240:rect.height}px`;
          container.append(drag.placeholder);drag.placeholder.hidden=true;
          drag.tabMarker=document.createElement('div');drag.tabMarker.className='workspace-tab-drop-placeholder';drag.tabMarker.setAttribute('aria-hidden','true');
          if(tab)card.style.opacity='.4';else card.style.display = 'none';
          document.body.classList.add('card-dragging');
        }
        drag.ghost.style.left = `${rect.left + moveEvent.clientX - drag.startX}px`;
        drag.ghost.style.top = `${rect.top + moveEvent.clientY - drag.startY}px`;
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        clearPane();drag.tabMarker.remove();
        drag.target = target?.closest('#workspace-canvas-tabs') ? 'tabs' : target?.closest('[data-pane]') ? 'main' : target?.closest('.workspace-inspector') ? 'side' : null;
        drag.placeholder.hidden = drag.target !== 'side';
        if(drag.target==='tabs'){
          const groups=[...tabs.children].filter(group=>group!==card&&group.querySelector('[data-canvas-tab]'));
          const before=groups.find(group=>{const box=group.getBoundingClientRect();return moveEvent.clientY<box.top||moveEvent.clientY<=box.bottom&&moveEvent.clientX<box.left+box.width/2;});
          drag.beforeTab=before?.querySelector('[data-canvas-tab]').dataset.canvasTab||null;
          tabs.insertBefore(drag.tabMarker,before||null);return;
        }
        if (drag.target === 'main') {
          drag.pane = target.closest('[data-pane]');
          drag.pane.setAttribute('data-panel-drop', 'true');
          return;
        }
        if (drag.target !== 'side') return;
        const siblings = [...container.children].filter(item=>item!==card&&item!==drag.placeholder&&!item.hidden&&item.getBoundingClientRect().height>0);
        const before = siblings.find((item) => {
          const rect = item.getBoundingClientRect();
          return moveEvent.clientY < rect.top + rect.height / 2;
        });
        if (before) container.insertBefore(drag.placeholder, before); else container.appendChild(drag.placeholder);
      };
      const finish = (finishEvent) => {
        if (finishEvent.pointerId !== pointerId) return;
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', finish);
        document.removeEventListener('pointercancel', finish);
        window.removeEventListener('blur', cancel);
        document.removeEventListener('keydown', escape);
        if (drag.active) {
          const destination = drag.pane;
          clearPane();
          drag.ghost.remove();
          drag.tabMarker.remove();card.style.display = display;card.style.opacity='';
          document.body.classList.remove('card-dragging');
          card.dataset.workspaceCardDragSuppressed = 'true';
          suppressCanvasClickUntil=Date.now()+500;
          if (finishEvent.type === 'pointerup') {
            if (drag.target === 'tabs'||drag.target === 'main' && destination) {
              if(destination)focusedPane=destination.dataset.pane;
              if(panel){if(panel.location!=='main')objectWorkspace.move(panel,'main');else selectCanvasTab(id);}
              else if(canvases.has(id))selectCanvasTab(id);
              else placeDockedPanel(createDockedPanel(spec),'main');
              if(drag.target==='tabs')reorderCanvasTabs(id,drag.beforeTab);
            } else if (drag.target === 'side') {
              let node;
              if(panel){if(panel.location!=='side')objectWorkspace.move(panel,'side');node=panel.node;}
              else if(!tab&&spec.source==='sidebar'&&!dockedPanels.has(id))node=card;
              else{const record=createDockedPanel(spec);placeDockedPanel(record,'side');node=record.node;}
              container.insertBefore(node, drag.placeholder);
            }
          }
          drag.placeholder.remove();
          syncWorkspaceOwnedCardOrder();
          refreshWorkspaceOwnedCardChrome();
          setTimeout(() => delete card.dataset.workspaceCardDragSuppressed, 0);
        }
      };
      const cancel = () => finish({ pointerId, type: 'pointercancel' });
      const escape = (keyEvent) => { if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); cancel(); } };
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', finish);
      window.addEventListener('blur', cancel);
      document.addEventListener('keydown', escape);
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  function initialiseWorkspaceOwnedCardShells() {
    const container = $('#workspace-cards');
    if (!container) return;
    // Input and Import / Export use the same shared CalculatorCards chrome as
    // native calculator cards; the workspace dock only adds move/hide actions.
    window.CalculatorCards?.init?.({ root: container, side: [], enforceInitial: false });
    if (!container.dataset.workspaceOwnedSlotSyncReady) {
      container.dataset.workspaceOwnedSlotSyncReady = 'true';
      const sync = (event) => {
        const card = event.target.closest?.('.workspace-assets-inspector-card');
        if (!card) return;
        setTimeout(() => { syncWorkspaceOwnedCardSlot(card); refreshWorkspaceOwnedCardChrome(); }, 0);
      };
      container.addEventListener('click', sync);
      container.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') sync(event); });
    }
    workspaceOwnedAssetCards().forEach(syncWorkspaceOwnedCardSlot);
    syncWorkspaceOwnedCardOrder();
    refreshWorkspaceOwnedCardChrome();
  }

  function ensureAssetsView() {
    if (assetState.view) return assetState.view;
    const view = document.createElement('section');
    view.className = 'workspace-assets-view'; view.tabIndex = 0; view.setAttribute('aria-label', 'Assets explorer');
    view.innerHTML = `<span class="workspace-assets-count" data-assets-count aria-live="polite"></span>
      <div class="workspace-assets-content" data-assets-content role="listbox" aria-label="Mathematical assets" aria-multiselectable="true"></div>`;
    const content = view.querySelector('[data-assets-content]');
    view.addEventListener('contextmenu', handleAssetsContextMenu); content.addEventListener('pointerdown', beginAssetMarquee);
    content.addEventListener('dblclick', event => {
      if (content.dataset.assetsEmpty === 'empty' && !event.target.closest('button,a')) content.querySelector('[data-empty-create-variant="none"] [data-assets-create]')?.click();
    });
    view.addEventListener('keydown', handleAssetKeydown);
    assetState.view = view;
    renderAssets();
    return view;
  }

  function ensureAssetsEditor(visible) {
    if (assetState.editorCard) { if (visible) assetState.editorCard.hidden = false; return assetState.editorRecord; }
    const identity = 'assets::input', card = document.createElement('section');
    card.className = 'card workspace-live-card workspace-assets-input-card workspace-assets-inspector-card'; card.dataset.workspaceCard = identity; card.dataset.workspaceLabel = 'Assets · Input'; card.hidden = !visible;
    card.innerHTML = `<div class="card-head" role="button" tabindex="0" aria-expanded="true"><span class="drag-handle" aria-hidden="true">⋮⋮</span><span class="card-head-label">Assets · Input</span><span class="workspace-autosave-status" data-assets-autosave-status>Saved</span><em class="toggle-icon">▾</em></div>
      <form class="card-body workspace-card-form" data-assets-editor novalidate>
        <label class="workspace-field workspace-field-inline" data-assets-kind-row><span class="input-label">Object</span><select class="workspace-control" data-assets-kind><option value="variety">Variety</option><option value="sheaf">Sheaf</option><option value="map">Map</option><option value="young">Young diagram</option><option value="lie">Lie type</option></select></label>
        <label class="workspace-field workspace-field-inline"><span class="input-label">Name</span><input class="workspace-control workspace-code-control" data-assets-name type="text" value="X" maxlength="80" spellcheck="false"></label>
        <label class="workspace-field workspace-field-inline"><span class="input-label">Type</span><select class="workspace-control" data-assets-subtype></select></label>
        <div class="workspace-form-fields" data-assets-fields></div>
        <div class="workspace-form-actions"><button class="btn" type="submit" data-assets-save>save now</button><button class="btn btn-ghost" type="button" data-assets-delete hidden>delete</button></div>
        <p class="workspace-status" data-assets-editor-status role="status" aria-live="polite"></p>
        <div class="workspace-io-actions" data-assets-conflict-actions hidden><button type="button" class="btn btn-ghost" data-assets-resolve="draft">Save my version</button><button type="button" class="btn btn-ghost" data-assets-resolve="saved">Load saved version</button></div>
      </form>`;
    const form = card.querySelector('[data-assets-editor]');
    form.querySelectorAll('[data-assets-resolve]').forEach(button=>button.addEventListener('click',()=>{
      const instance=activeAssetInputInstance();if(!instance)return;
      if(button.dataset.assetsResolve==='draft')captureAssetInputDraftFromForm(instance.key,instance.rendererEpoch,{schedule:false});
      resolveAssetInputConflict(instance,button.dataset.assetsResolve);
    }));
    form.querySelector('[data-assets-kind]').addEventListener('change', () => { if (!activeAssetInputInstance()) renderAssetsEditor(); });
    window.CalculatorInputSettings.listenEditable(form.querySelector('[data-assets-name]'), 'input', () => {
      if (!activeAssetInputInstance() && form.querySelector('[data-assets-name]').value !== form.dataset.autoName) form.dataset.autoName = '';
      captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: false });
    }, { commitHandled: true });
    form.addEventListener('change', (event) => {
      if (event.target.matches('[data-assets-subtype]')) {
        if (!activeAssetInputInstance() && form.querySelector('[data-assets-kind]').value === 'variety') {
          const name = form.querySelector('[data-assets-name]');
          if (name.value === form.dataset.autoName) {
            const data = normalizedAssetData('variety', event.target.value);
            form.dataset.autoName = uniqueDefaultAssetName('variety', event.target.value, '', data);
            window.CalculatorInputSettings.syncEditableValue(name, form.dataset.autoName);
          }
        }
        captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: true, type: event.target.value });
        renderAssetsEditorFields();
      } else if (event.target.matches('select[data-assets-field],input[type="checkbox"][data-assets-field],input[type="radio"][data-assets-field]')) {
        if(!activeAssetInputInstance()&&form.querySelector('[data-assets-kind]').value==='sheaf'){saveAssetsEditor({preventDefault(){}});return;}
        captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: true });
        if (['operation','differentialWedge'].includes(event.target.dataset.assetsField)) renderAssetsEditorFields();
      }
    });
    form.addEventListener('focusout', (event) => {
      if (!event.target.matches('[data-assets-name],[data-assets-field],[data-assets-reference],[data-assets-tensor-exponent],[data-assets-divisor-class]')) return;
      const instance = activeAssetInputInstance();
      if (instance) { captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { schedule: false }); flushAssetInputInstance(instance); }
    });
    form.addEventListener('submit', saveAssetsEditor);
    form.querySelector('[data-assets-delete]').addEventListener('click', () => { const instance = activeAssetInputInstance(); if (instance) deleteAssets([instance.targetRef]); });
    installWorkspaceOwnedCardChrome(card, 'input'); $('#workspace-cards').appendChild(card); liveCards.set(identity, card);
    assetState.editorCard = card; assetState.editorRecord = { card };
    initialiseWorkspaceOwnedCardShells();
    renderAssetsEditor();
    return assetState.editorRecord;
  }

  const ASSET_SUBTYPES = {
    filtration:[['filtration','Filtration']], complex:[['complex','Complex']], 'field-extension':[['field-extension','Field extension']],
    'mosaic-space':[['mosaic-space','Mosaic Space']], 'mosaic-diagram':[['mosaic-diagram','Mosaic Diagram']],
    knot:[['knot','Knot / Link']], 'dual-graph':[['dual-graph','Dual Graph']],
    ...(slicing?.subtypes || {}),
    dynkin: [['dynkin', 'Marked Dynkin diagram']],
    strands: [['strands', 'Strands']],
    matrix: [['matrix', 'Matrix']],
    field: [['field', 'Ring']],
    number: [['number', 'Number']],
    category: [['category', 'Category']],
    functor: [['functor', 'Functor']],
    young: [['partition', 'Young diagram'], ['generalized', 'Generalized Young diagram']],
    lie: [['simple', 'Lie type']],
    variety: [['abstract', 'Abstract variety'], ['curve', 'Curve'], ['symmetric-product-curve', 'Symmetric product of a curve'], ['abelian', 'Abelian variety'], ['ppav-moduli', 'Moduli of ppav'], ['point', 'Point'], ['projective', 'Projective space'], ['grassmannian', 'Grassmannian'], ['complete-intersection', 'Complete intersection'], ['product', 'Product of varieties'], ['toric', 'Toric variety']],
    sheaf: [['abstract', 'Abstract sheaf'], ['locally-free', 'Locally free sheaf'], ['structure', 'Structure sheaf'], ['tangent', 'Tangent sheaf'], ['cotangent', 'Cotangent sheaf'], ['canonical', 'Canonical sheaf'], ['twist', 'Twist'], ['divisor-line', 'Divisor line bundle'], ['universal-bundle', 'Universal bundle'], ['direct-sum', 'Direct sum'], ['self-direct-sum', 'Self direct sum'], ['self-tensor-product', 'Self tensor product'], ['dual', 'Dual sheaf'], ['internal-hom', 'Internal Hom'], ['ideal-sheaf', 'Ideal sheaf'], ['normal-bundle', 'Normal bundle'], ['conormal-bundle', 'Conormal bundle'], ['relative-tangent', 'Relative tangent'], ['relative-cotangent', 'Relative cotangent'], ['tensor', 'Tensor product'], ['schur', 'Schur functor'], ['map-operation', 'Pullback / pushforward']],
    map: [['ordinary', 'Map of varieties'], ['sheaf', 'Map of sheaves'], ['abel-jacobi', 'Abel–Jacobi map'], ['composition', 'Composition of maps']]
  };
  const plainAssetName = (value) => String(value || '').replace(/\\(?:mathcal|mathfrak|mathbf|mathrm|operatorname)\s*\{([^}]*)\}/g, '$1').replace(/[{}$\\]/g, '').replace(/[_^]/g, ' ').replace(/\s+/g, ' ').trim();
  const canonicalAssetName = (value) => plainAssetName(value).toLocaleLowerCase().replace(/\s+/g, '');
  const cloneAssetProperties = (properties) => properties ? JSON.parse(JSON.stringify(properties)) : {};
  const cloneAssetPropertyValue = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const ASSET_PROPERTY_FIELDS_BY_KIND = Object.freeze({
    variety: new Set(['homology', 'grassmannianYoungBasis']),
    sheaf: new Set(['homology', 'basis']),
    map: new Set(['homology'])
  });
  const propertyValueEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  function assetRefFromKey(key) {
    const separator = String(key || '').indexOf(':');
    return separator > 0 ? { kind: key.slice(0, separator), id: key.slice(separator + 1) } : { kind: '', id: '' };
  }
  function createAssetPropertyCommand({ sourceRef, revision, before = {}, after = {}, reason = 'homology' } = {}) {
    const beforeObjects = before?.objects || before || {}, afterObjects = after?.objects || after || {};
    const changes = [];
    new Set([...Object.keys(beforeObjects), ...Object.keys(afterObjects)]).forEach((key) => {
      const ref = assetRefFromKey(key), allowed = ASSET_PROPERTY_FIELDS_BY_KIND[ref.kind] || new Set();
      const previous = beforeObjects[key] || {}, current = afterObjects[key] || {}, set = {}, unset = [];
      allowed.forEach((field) => {
        const had = Object.prototype.hasOwnProperty.call(previous, field), has = Object.prototype.hasOwnProperty.call(current, field);
        if (has && (!had || !propertyValueEqual(previous[field], current[field]))) set[field] = cloneAssetPropertyValue(current[field]);
        else if (had && !has) unset.push(field);
      });
      if (Object.keys(set).length || unset.length) changes.push({ ref, propertiesPatch: { set, unset } });
    });
    return { sourceRef: sourceRef ? { kind: sourceRef.kind, id: sourceRef.id } : null, revision, changes, reason };
  }
  let diagnosticCache = { revision: -1, assets: null, value: {} };
  function assetDiagnostics() {
    synchronizeTopologyAssets();
    synchronizeVarietyAssets();
    if(diagnosticCache.revision!==assetState.snapshot.revision||diagnosticCache.assets!==assetState.snapshot.assets){
      diagnosticCache={revision:assetState.snapshot.revision,assets:assetState.snapshot.assets,value:window.MathWorkspaceDiagnostics?.analyze(assetState.snapshot.assets)||{}};
    }
    return diagnosticCache.value;
  }
  function synchronizeTopologyAssets(){
    const changed=window.MathWorkspaceTopology?.synchronize(assetState.snapshot.assets)||[];
    if(changed.length){for(const asset of changed){asset.dependencies=assetDependencies(asset.kind,asset.type,asset.data);asset.definition=assetDefinitionFor(asset.kind,asset.type,asset.data);asset.properties={};asset.fingerprint=JSON.stringify({name:asset.name,type:asset.type,data:asset.data,dependencies:asset.dependencies});}assetState.snapshot.revision++;}
  }
  const localAssetSnapshot = () => {synchronizeTopologyAssets();synchronizeVarietyAssets();return { revision: assetState.snapshot.revision, diagnostics: assetDiagnostics(), assets: assetState.snapshot.assets.map((asset) => ({ ...asset, ...(asset.kind === 'matrix' && asset.data.field ? {definition:assetDefinitionFor(asset.kind,asset.type,asset.data)} : {}), dependencies: (asset.dependencies || []).map((ref) => ({ ...ref })), data: cloneAssetProperties(asset.data), properties: cloneAssetProperties(asset.properties) })), capabilities: { variety: true, young: true, lie: true, sheaf: true, map: true } };};
  const assetMathSignature = (asset) => JSON.stringify({ kind: asset?.kind, type: asset?.type, data: asset?.data || {}, dependencies: asset?.dependencies || [] });
  function invalidateDerivedAssetProperties(record, next) {
    if (!record || assetMathSignature(record) === assetMathSignature(next)) return cloneAssetProperties(record?.properties);
    // Homology rules are mathematical consequences of an object's construction.
    // Retaining them after a structural edit would leave hidden references to an
    // old base or endpoint. Card chrome remains session UI state, not Asset data.
    const properties = cloneAssetProperties(record.properties);
    delete properties.homology;
    return properties;
  }
  const editorForm = () => assetState.editorCard?.querySelector('[data-assets-editor]');
  function captureAssetInputDraftFromForm(instanceKey, rendererEpoch, options = {}) {
    const instance = assetsCardState.instances.get(instanceKey), form = editorForm();
    if(form?.querySelector('[data-assets-fields]')?.dataset.rebuilding==='true')return false;
    // The initial Create form has no asset yet, but its CI controls still
    // project the same draft that will be submitted at the commit boundary.
    if (!instance && !activeAssetInputInstance()) {
      syncCompleteIntersectionInput();
      return false;
    }
    if (!instance || instance !== activeAssetInputInstance() || instance.rendererEpoch !== rendererEpoch || form?.dataset.inputInstanceKey !== instanceKey || Number(form.dataset.rendererEpoch) !== rendererEpoch) return false;
    const data = assetEditorData(instance);
    if (options.type && options.type !== instance.draft.type) {
      if (instance.draft.kind === 'sheaf' && GEOMETRIC_HYPOTHESES[options.type]) data.confirmed = false;
      const next = window.MathWorkspaceNumbers.references(instance.draft.kind, options.type);
      for (const spec of window.MathWorkspaceNumbers.references(instance.draft.kind, instance.draft.type).filter(spec => spec.scalar)) {
        if (next.some(item => item.field === spec.field)) continue;
        if (options.type === 'ppav-moduli' && spec.field === 'genus') data.genus = window.MathWorkspaceNumbers.literalValue({data}, spec, assetState.snapshot.assets);
        else delete data[spec.field];
      }
      if (instance.draft.kind === 'variety' && VARIETY_INPUT_FIELDS[options.type]) {
        const defaults = normalizedAssetData('variety', options.type);
        for (const field of VARIETY_INPUT_FIELDS[options.type]) if (!Object.hasOwn(data, field) && Object.hasOwn(defaults, field)) data[field] = defaults[field];
      }
    }
    const draft = cloneInputDraft({
      ...instance.draft,
      name: form.querySelector('[data-assets-name]').value,
      type: options.type || form.querySelector('[data-assets-subtype]').value,
      data
    });
    if (JSON.stringify(draft) === JSON.stringify(instance.draft)) return true;
    return updateAssetInputDraft(instance, draft, options);
  }
  const fieldHtml = (label, name, value = '', type = 'text', options = {}) => `<label class="workspace-field workspace-field-inline"><span class="input-label">${label}</span><input class="workspace-control${type === 'text' ? ' workspace-code-control' : ''}" data-assets-field="${name}" type="${type}" value="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"${options.readOnly ? ' readonly aria-readonly="true"' : ''}></label>`;
  const assetByKey = (key, kind = '') => assetState.snapshot.assets.find((asset) => assetKey(asset) === key && (!kind || asset.kind === kind)) || null;
  const DIRECT_SHEAF_TYPES = new Set(['abstract', 'locally-free', 'structure', 'tangent', 'cotangent', 'canonical', 'twist', 'divisor-line', 'universal-bundle']);
  const MAP_BASE_ENDPOINT = { 'ideal-sheaf': 'codomain', 'normal-bundle': 'domain', 'conormal-bundle': 'domain', 'relative-tangent': 'domain', 'relative-cotangent': 'domain' };
  const GEOMETRIC_HYPOTHESES = {
    'ideal-sheaf': 'The map is an embedding and is not an isomorphism.',
    'normal-bundle': 'The map is a regular/lci closed embedding, and its source and target are smooth.',
    'conormal-bundle': 'The map is a regular/lci closed embedding, and its source and target are smooth.',
    'relative-tangent': 'The map is smooth/submersive, and its source and target are smooth.',
    'relative-cotangent': 'The map is smooth/submersive, and its source and target are smooth.'
  };
  function syncTensorAliases(kind, type, data) {
    // Keep legacy binary aliases aligned with the complete factor list.
    if (kind === 'sheaf' && type === 'tensor' && Array.isArray(data.parents)) {
      data.first = data.parents[0] || ''; data.second = data.parents[1] || '';
    }
  }
  const isDirectSheafType = (type) => DIRECT_SHEAF_TYPES.has(type);
  function inferredSheafBase(type,data={}) {return window.MathWorkspaceSheafModel.base({kind:'sheaf',id:'draft',type,data},assetState.snapshot.assets);}
  const nonnegativeInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : fallback;
  const positiveInt = (value, fallback = 1) => Math.max(1, nonnegativeInt(value, fallback));
  function degreeList(value) {
    return window.MathWorkspaceSheafModel.degrees(value ?? '');
  }
  function completeIntersectionInputParameters(data) {
    const degrees = degreeList(data.degrees), dimension = varietyInteger(data.dimension, 3);
    if (dimension == null || dimension > 15) throw new Error('Dimension must be an integer from 0 to 15.');
    return { degrees, ambientDimension: dimension + degrees.length };
  }
  function changeCompleteIntersectionSlider(control) {
    const form = editorForm(), degreesField = form?.querySelector('[data-assets-field="degrees"]');
    if (!degreesField) return;
    let degrees;
    try { degrees = degreeList(degreesField.value); } catch (_) { return; }
    if (control.hasAttribute('data-assets-ci-count')) {
      const count = Number(control.value);
      degrees = Array.from({ length: count }, (_, i) => degrees[i] ?? 2);
    } else degrees[Number(control.dataset.assetsCiDegree)] = Number(control.value);
    window.CalculatorInputSettings.syncEditableValue(degreesField, degrees.join(', '));
    captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: false });
  }
  function syncCompleteIntersectionInput(data) {
    const form = editorForm(), count = form?.querySelector('[data-assets-ci-count]');
    if (!count) return;
    const degreesField = form.querySelector('[data-assets-field="degrees"]');
    data = data || { dimension: form.querySelector('[data-assets-field="dimension"]').value, degrees: degreesField.value };
    const rows = form.querySelector('[data-assets-ci-degrees]');
    let degrees;
    try { degrees = degreeList(data.degrees); } catch (_) {
      count.disabled = true;
      rows.querySelectorAll('input').forEach(control => { control.disabled = true; });
      window.CalculatorInputSettings.syncEditableValue(form.querySelector('[data-assets-field="ambientDimension"]'), '');
      return;
    }
    count.disabled = false;
    window.CalculatorInputSettings.syncEditableValue(count, degrees.length);
    form.querySelector('[data-assets-ci-count-value]').textContent = String(degrees.length);
    // Update rows in place: dragging a slider must retain that control and focus.
    while (rows.children.length > degrees.length) rows.lastElementChild.remove();
    while (rows.children.length < degrees.length) {
      const index = rows.children.length, row = document.createElement('label');
      row.className = 'workspace-field workspace-field-inline';
      row.innerHTML = `<span class="input-label">Degree ${index + 1}</span><span class="workspace-ci-slider"><input class="workspace-control" type="range" min="1" step="1" data-assets-ci-degree="${index}" aria-label="Degree ${index + 1}"><output data-assets-ci-degree-value></output></span>`;
      const slider = row.querySelector('input');
      slider.addEventListener('input', () => changeCompleteIntersectionSlider(slider));
      slider.addEventListener('change', () => changeCompleteIntersectionSlider(slider));
      rows.append(row);
    }
    degrees.forEach((degree, index) => {
      const row = rows.children[index], slider = row.querySelector('input');
      slider.disabled = false; slider.max = String(Math.max(12, degree));
      window.CalculatorInputSettings.syncEditableValue(slider, degree);
      row.querySelector('output').textContent = String(degree);
    });
    let ambient = '';
    try { ambient = completeIntersectionInputParameters(data).ambientDimension; } catch (_) {}
    window.CalculatorInputSettings.syncEditableValue(form.querySelector('[data-assets-field="ambientDimension"]'), ambient);
    if (!activeAssetInputInstance() && ambient !== '') {
      const name = form.querySelector('[data-assets-name]');
      if (form.dataset.autoName && name.value === form.dataset.autoName) {
        form.dataset.autoName = uniqueDefaultAssetName('variety', 'complete-intersection', '', { ...data, ambientDimension: ambient });
        window.CalculatorInputSettings.syncEditableValue(name, form.dataset.autoName);
      }
    }
  }
  const DERIVED_VARIETY_DIMENSIONS = new Set(['point', 'curve', 'symmetric-product-curve', 'ppav-moduli', 'grassmannian', 'complete-intersection', 'product', 'toric']);
  const GROUPED_VARIETY_COPY_NAMES = new Set(['complete-intersection', 'ppav-moduli', 'product']);
  const VARIETY_INPUT_FIELDS = {
    abstract: ['dimension'], curve: ['genus'], 'symmetric-product-curve': ['genus', 'power'], abelian: ['dimension'],
    'ppav-moduli': ['genus'], point: [], projective: ['dimension'], grassmannian: ['r', 'n'],
    'complete-intersection': ['dimension', 'ambientDimension', 'degrees'], product: ['first', 'second']
  };
  const VARIETY_CONSTRUCTION_FIELDS = new Set(Object.values(VARIETY_INPUT_FIELDS).flat());
  function varietyInteger(value, fallback, min = 0) {
    const raw = value ?? fallback;
    return String(raw).trim() !== '' && Number.isSafeInteger(Number(raw)) && Number(raw) >= min ? Number(raw) : null;
  }
  // Derived fields are projections of the construction, never editable drafts.
  // This deliberately does not normalize unrelated drafts such as curve genus.
  function derivedVarietyDimension(type,data) {try{return window.MathWorkspaceSheafModel.dimension({kind:'variety',id:'dimension-draft',type,data},assetState.snapshot.assets);}catch(_){return null;}}
  function varietyDimension(asset, visiting = new Set()) {
    if (!asset || visiting.has(assetKey(asset))) return null;
    const next = new Set(visiting); next.add(assetKey(asset));
    return derivedVarietyDimension(asset.type, asset.data || {}, next);
  }
  function defaultVarietyName(type, data = {}) {
    if (type === 'curve') return String(data.genus?.value ?? data.genus)==='1'?'E':'C';
    if (type === 'abelian') return 'A';
    if (type === 'point') return 'p';
    if (type === 'projective') return `\\mathbb{P}^{${data.dimension ?? 3}}`;
    if (type === 'grassmannian') return `\\operatorname{Gr}(${data.r ?? 2},${data.n ?? 4})`;
    if (type === 'ppav-moduli') return `\\mathcal{A}_{${data.genus ?? 2}}`;
    if (type === 'symmetric-product-curve') return `\\operatorname{Sym}^{${data.power ?? 3}}(C)`;
    if (type === 'complete-intersection') {const ds=degreeList(data.degrees??'');return ds.length?`X_{${ds.join(',')}}`:`\\mathbb{P}^{${data.dimension??data.ambientDimension??3}}`;}
    if (type === 'product') return `${assetByKey(data.first, 'variety')?.name || 'X'}\\times ${assetByKey(data.second, 'variety')?.name || 'Y'}`;
    return 'X';
  }
  function synchronizeVarietyAssets() {
    const visited = new Set(), visiting = new Set(); let changed = false;
    const visit = record => {
      if (!record || record.kind !== 'variety' || visited.has(assetKey(record)) || visiting.has(assetKey(record))) return;
      visiting.add(assetKey(record));
      if (record.type === 'product') { visit(assetByKey(record.data?.first)); visit(assetByKey(record.data?.second)); }
      visiting.delete(assetKey(record)); visited.add(assetKey(record));
      const data = { ...record.data };
      if (DERIVED_VARIETY_DIMENSIONS.has(record.type)) data.dimension = String(varietyDimension(record) ?? '');
      const automatic = record.autoName && record.autoName === record.name;
      const name = automatic ? uniqueDefaultAssetName('variety', record.type, assetKey(record), data) : record.name;
      if (name === record.name && data.dimension === record.data?.dimension) return;
      const next = { ...record, name, data };
      Object.assign(record, { name, ...(automatic ? { autoName: name } : {}), plainName: plainAssetName(name), data,
        definition: assetDefinitionFor(record.kind, record.type, data), properties: invalidateDerivedAssetProperties(record, next) });
      record.fingerprint = JSON.stringify({ name, type: record.type, data, dependencies: record.dependencies });
      const instance = assetInputInstanceForRef(record);
      if (instance && !instance.dirty) instance.draft = inputDraftFromRecord(record);
      changed = true;
    };
    assetState.snapshot.assets.forEach(visit);
    for(const record of assetState.snapshot.assets.filter(a=>a.kind==='sheaf'&&!isDirectSheafType(a.type))){
      let base='';try{base=inferredSheafBase(record.type,record.data);}catch(_){}
      if(record.data.base===base)continue;
      const data={...record.data,base};record.properties=invalidateDerivedAssetProperties(record,{...record,data});record.data=data;
      record.dependencies=assetDependencies(record.kind,record.type,data);record.definition=assetDefinitionFor(record.kind,record.type,data);
      record.fingerprint=JSON.stringify({name:record.name,type:record.type,data,dependencies:record.dependencies});
      const instance=assetInputInstanceForRef(record);if(instance&&!instance.dirty)instance.draft=inputDraftFromRecord(record);changed=true;
    }
    if (changed) assetState.snapshot.revision += 1;
  }
  function normalizedAssetData(kind, type, source = {}) {
    source=presentation.split(kind,source).data;
    if (kind === 'variety' && type === 'toric') return slicing.normalize(kind,type,source);
    if (OBJECT_INPUT_KINDS.includes(kind)) return window.MathWorkspaceObjects.normalize(kind, type, source);
    const data = window.MathWorkspaceNumbers.normalizeInputs(kind, type, source);
    if (kind === 'variety' && type === 'ppav-moduli' && typeof data.genus === 'object') {
      data.genus = window.MathWorkspaceNumbers.literalValue({data}, window.MathWorkspaceNumbers.references('variety','curve')[0], assetState.snapshot.assets);
      if (!data.genus) throw new Error('Enter a genus value for this variety type.');
    }
    if (kind === 'variety') {
      if (type === 'symmetric-product-curve') data.power = String(data.power??3);
      else if (type === 'ppav-moduli') data.genus = String(data.genus??2);
      else if (type === 'grassmannian') { data.r=String(data.r??2);data.n=String(data.n??4); }
      else if (type === 'complete-intersection') { data.degrees = degreeList(data.degrees ?? '').join(', '); data.ambientDimension = String(data.ambientDimension??3); }
      data.dimension = DERIVED_VARIETY_DIMENSIONS.has(type) ? String(derivedVarietyDimension(type, data) ?? '') : String(data.dimension??3);
    } else if (kind === 'sheaf') {
      const cached=data.workspaceSheafComplex?.payload?.construction;
      if (['tensor','internal-hom','map-operation'].includes(type) && !Object.hasOwn(data,'exact') && cached && (Object.hasOwn(cached,'exact')||Object.hasOwn(cached,'derived'))) data.exact=cached.exact===true||cached.derived===false;
      if (type==='map-operation' && !Object.hasOwn(data,'proper') && cached?.type==='pushforward') data.proper=cached.proper===true;
      if (['tangent','cotangent'].includes(type) && data.differentialWedge === true) data.wedgeDegree = String(data.wedgeDegree ?? 1);
      if (type === 'tensor') {
        data.parents = window.MathWorkspaceSheafModel.tensorParents(data);
        data.exponents = window.MathWorkspaceSheafModel.tensorExponents(data);
      }
      syncTensorAliases(kind, type, data);
      if (type === 'twist') data.twist = String(data.twist??1);
      if (!isDirectSheafType(type)) data.base = inferredSheafBase(type, data);
    }
    return data;
  }
  const ASSET_DRAG_TYPE = 'application/x-math-workspace-asset';
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function referenceFieldSpecs(kind, type, data = {}) {
    if(kind==='complex'||kind==='filtration')return [];
    if(kind==='field')return [{field:'constantField',label:'Constant field',expectedKind:'field',optional:true,requiresField:true}];
    if(kind==='field-extension')return [{field:'base',label:'Base field',expectedKind:'field',requiresField:true},{field:'target',label:'Target field',expectedKind:'field',optional:true,requiresField:true}];
    if(kind==='mosaic-space')return [];
    if(kind==='mosaic-diagram')return [{field:'space',label:'Mosaic space',expectedKind:'mosaic-space'}];
    if(window.MathWorkspaceTopology?.kinds.includes(kind))return [{field:'source',label:'Mosaic Diagram source',expectedKind:'mosaic-diagram',optional:true}];
    if (kind === 'variety' && type === 'toric') return [{field:'fan',label:'Fan',expectedKind:'fan'},{field:'cone',label:'Affine cone',expectedKind:'cone'}];
    if (['dynkin','strands'].includes(kind)) return [{ field: 'lie', label: 'Lie type', expectedKind: 'lie' }];
    if (kind === 'functor') return ['domain', 'codomain'].map(field => ({ field, label: field === 'domain' ? 'Domain' : 'Codomain', expectedKind: 'category' }));
    if (kind === 'number') return window.MathWorkspaceNumbers.references(kind,type);
    if (OBJECT_INPUT_KINDS.includes(kind)) return [];
    if (kind === 'variety' && ['curve','symmetric-product-curve'].includes(type)) return window.MathWorkspaceNumbers?.references(kind,type) || [];
    if (kind === 'variety') return type === 'product' ? [{ field: 'first', label: 'First factor', expectedKind: 'variety' }, { field: 'second', label: 'Second factor', expectedKind: 'variety' }] : [];
    if (kind === 'sheaf') {
      const specs = isDirectSheafType(type) ? [{ field: 'base', label: 'Base variety', expectedKind: 'variety' }] : [];
      if (type === 'tensor') {
        const parents = window.MathWorkspaceSheafModel.tensorParents(data);
        if (!parents.length) specs.push({ field: 'base', label: 'Base variety', expectedKind: 'variety' });
        parents.forEach((_,index)=>specs.push({ field: index === 0 ? 'first' : index === 1 ? 'second' : 'tensorFactor'+index, label: 'Factor '+(index+1), expectedKind: 'sheaf', tensorIndex: index }));
      }
      if (['direct-sum', 'internal-hom'].includes(type)) specs.push(...['first', 'second'].map((field, index) => ({ field, label: index ? 'Second sheaf' : 'First sheaf', expectedKind: 'sheaf' })));
      if (['dual', 'self-direct-sum', 'self-tensor-product', 'schur'].includes(type)) specs.push({ field: 'parent', label: 'Parent sheaf', expectedKind: 'sheaf' });
      if (MAP_BASE_ENDPOINT[type] || type === 'map-operation') specs.push({ field: 'map', label: 'Source map', expectedKind: 'map', ...(GEOMETRIC_HYPOTHESES[type] ? { geometricConfirmation: true } : {}) });
      if(type==='map-operation')specs.push({field:'parent',label:'Source sheaf',expectedKind:'sheaf'});
      return [...specs,...(window.MathWorkspaceNumbers?.references(kind,type)||[])];
    }
    const expectedKind = type === 'sheaf' ? 'sheaf' : type === 'composition' ? 'map' : 'variety';
    return [{ field: 'domain', label: type === 'composition' ? 'First map' : 'Domain', expectedKind }, { field: 'codomain', label: type === 'composition' ? 'Second map' : 'Codomain', expectedKind }];
  }
  function referenceKeys(kind, type, data) {
    if(['complex','filtration','field-extension'].includes(kind))return window.MathWorkspaceStructures.references(kind,data);
    if (slicing?.isAsset({kind,type}) || kind === 'matrix') return slicing.refKeys({kind,type,data});
    return [...new Set([...referenceFieldSpecs(kind, type, data).map((spec) => assetReferenceKey(data, spec)).filter(Boolean),...window.MathWorkspaceSheafModel.references({kind,id:'draft',type,data})])];
  }
  function assetReferenceKey(data, spec) { return Number.isInteger(spec.tensorIndex) ? window.MathWorkspaceSheafModel.tensorParents(data)[spec.tensorIndex] || '' : window.MathWorkspaceNumbers.referenceKey(data, spec); }
  function dataWithReference(data, spec, key) {
    if (Number.isInteger(spec.tensorIndex)) {
      const next = { ...data, parents: window.MathWorkspaceSheafModel.tensorParents(data) };
      next.parents[spec.tensorIndex] = key; syncTensorAliases('sheaf', 'tensor', next); return next;
    }
    const next = { ...data, [spec.field]: spec.scalar ? { kind: 'reference', ref: key } : key };
    if (spec.geometricConfirmation && data[spec.field] !== key) next.confirmed = false;
    return next;
  }
  function referenceWouldCreateCycle(currentKey, candidateKey, kind, type, data) {
    if (!currentKey || !candidateKey) return false;
    const visiting = new Set();
    const reachesCurrent = (key) => {
      if (key === currentKey) return true;
      if (visiting.has(key)) return false;
      visiting.add(key);
      const asset = assetByKey(key);
      const dependencies = key === currentKey ? referenceKeys(kind, type, data) : (asset?.dependencies || []).map(assetKey);
      return dependencies.some(reachesCurrent);
    };
    return reachesCurrent(candidateKey);
  }
  function referenceEligibility(spec, candidateKey, context) {
    const candidate = assetByKey(candidateKey);
    if (!candidate) return { allowed: false, reason: 'missing' };
    if (spec.requiresField && !window.MathWorkspaceRings.isField(candidate)) return { allowed: false, reason: 'This operation requires a field.' };
    if (spec.scalar) { try { window.MathWorkspaceNumbers.scalar({kind:context.kind,type:context.type,data:dataWithReference(context.data,spec,candidateKey)},spec,assetState.snapshot.assets); } catch(error) { return {allowed:false,reason:error.message}; } }
    if (candidate.kind !== spec.expectedKind) return { allowed: false, reason: 'type' };
    if (candidateKey === context.currentKey) return { allowed: false, reason: 'self' };
    if (spec.distinctFrom && candidateKey && candidateKey === context.data[spec.distinctFrom]) return { allowed: false, reason: 'duplicate' };
    const projected = dataWithReference(context.data, spec, candidateKey);
    if (referenceWouldCreateCycle(context.currentKey, candidateKey, context.kind, context.type, projected)) return { allowed: false, reason: 'cycle' };
    return { allowed: true, asset: candidate };
  }
  function eligibleReferenceAssets(spec, context) {
    return assetState.snapshot.assets.filter((asset) => referenceEligibility(spec, assetKey(asset), context).allowed);
  }
  function referenceContext(form) {
    const kind = form.querySelector('[data-assets-kind]').value, type = form.querySelector('[data-assets-subtype]').value;
    const instance = activeAssetInputInstance(), record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    return { kind, type, currentKey: record ? assetKey(record) : '', data: { ...(instance?.draft?.data || {}), ...assetEditorData(instance) } };
  }
  function referenceFieldHtml(spec, context, controlOnly = false) {
    const selected = assetByKey(assetReferenceKey(context.data, spec),spec.expectedKind);
    const eligible = eligibleReferenceAssets(spec, context);
    const text = selected ? `\\(${escapeHtml(selected.name)}\\)` : `Choose ${spec.expectedKind}…`;
    const label = selected ? `${spec.label}: ${selected.plainName || selected.name}` : `${spec.label}: choose a ${spec.expectedKind}`;
    const control = `<button class="workspace-control workspace-reference-control" type="button" data-assets-reference="${spec.field}"${Number.isInteger(spec.tensorIndex) ? ` data-assets-tensor-index="${spec.tensorIndex}"` : ''} data-assets-reference-value="${selected ? assetKey(selected) : ''}" data-assets-expected-kind="${spec.expectedKind}" data-assets-reference-label="${escapeHtml(spec.label)}" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(label)}"${eligible.length || spec.scalar ? '' : ' disabled'}><span class="workspace-reference-value${selected ? ' workspace-reference-math' : ''}">${text}</span><span class="workspace-reference-arrow" aria-hidden="true">⌄</span></button>`;
    return controlOnly ? control : `<label class="workspace-field workspace-field-inline"><span class="input-label">${spec.label}</span>${control}</label>`;
  }
  function scalarFieldHtml(spec, context) {
    const parameter = window.MathWorkspaceNumbers.input(context.data, spec), literal = parameter.kind !== 'reference';
    const control = literal ? `<input class="workspace-control" type="text" inputmode="numeric" data-scalar-value="${spec.field}" aria-label="${spec.label}" value="${escapeHtml(parameter.value)}" placeholder="Enter an integer">` : referenceFieldHtml(spec, context, true);
    const action = literal ? `<button type="button" class="btn btn-ghost" data-scalar-promote="${spec.field}" aria-label="Save ${spec.label.toLowerCase()} as a Number asset" title="Save this value as a reusable Number asset">Save as Number</button>`
      : `<button type="button" class="btn btn-ghost" data-scalar-edit="${spec.field}" aria-label="Edit ${spec.label.toLowerCase()} Number asset"${parameter.ref ? '' : ' disabled'}>Edit</button>`;
    return `<div class="workspace-field workspace-field-inline workspace-scalar-field" role="group" aria-label="${spec.label}"><span class="input-label">${spec.label}</span><div class="workspace-scalar-controls"><select class="workspace-control" data-scalar-mode="${spec.field}" aria-label="${spec.label} input source"><option value="literal"${parameter.kind==='literal'?' selected':''}>Value</option><option value="expression"${parameter.kind==='expression'?' selected':''}>Expression</option><option value="reference"${literal ? '' : ' selected'}>Asset</option></select>${control}${parameter.kind==='expression'?'':action}</div></div>`;
  }
  function bindScalarField(group, spec, instance) {
    const numbers = window.MathWorkspaceNumbers, mode = group.querySelector('[data-scalar-mode]');
    mode.addEventListener('change', () => {
      const requested=mode.value;mode.value=numbers.input(instance.draft.data,spec).kind;
      captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { schedule: false });
      mode.value=requested;
      const current = numbers.input(instance.draft.data, spec), saved = numbers.input(assetByKey(assetKey(instance.targetRef)).data, spec);
      const parameter = mode.value !== 'reference' ? { kind: mode.value, value: numbers.literalValue(instance.draft, spec, assetState.snapshot.assets) }
        : saved.kind === 'reference' ? saved : { kind: 'reference', ref: '' };
      if (current.kind === 'reference' && !current.ref && saved.kind === 'literal' && mode.value === 'literal') parameter.value = saved.value;
      updateAssetInputDraft(instance, { data: { [spec.field]: parameter } }, { immediate: true });
      renderAssetsEditorFields(); renderAssetInputStatus(instance);
      editorForm().querySelector(`[data-scalar-mode="${spec.field}"]`)?.focus();
    });
    const value = group.querySelector('[data-scalar-value]');
    if (value) {
      window.CalculatorInputSettings.listenEditable(value, 'input', () => captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { immediate: false }), { commitHandled: true });
      value.addEventListener('blur', () => { captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { schedule: false }); flushAssetInputInstance(instance); });
    }
    group.querySelector('[data-scalar-promote]')?.addEventListener('click', () => {
      captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { schedule: false });
      const validation = validateAssetInputDraft(instance);
      if (!validation.valid) { instance.validation = validation; renderAssetInputStatus(instance); return; }
      const parameter = numbers.normalizeInput(numbers.input(instance.draft.data, spec), spec);
      flushAssetInputInstance(instance);
      if (instance.dirty) return;
      const number = createObjectAsset('number', { data: { hasValue: true, value: parameter.value, replaceWithValue: true }, bindInput: false });
      updateAssetInputDraft(instance, { data: dataWithReference(instance.draft.data, spec, assetKey(number)) }, { immediate: true });
      renderAssetsEditorFields(); renderAssetInputStatus(instance);
      objectWorkspace.open('number-input', assetKey(number), 'side');
    });
    group.querySelector('[data-scalar-edit]')?.addEventListener('click', () => objectWorkspace.open('number-input', numbers.referenceKey(instance.draft.data, spec), 'side'));
  }
  function inferredBaseFieldHtml(type, data) {
    const base = assetByKey(data.base, 'variety');
    const text = base ? `\\(${escapeHtml(base.name)}\\)` : 'Complete the construction to determine its base.';
    const label = base ? `Base variety inferred from this construction: ${base.plainName || base.name}` : 'Base variety is inferred from this construction';
    return `<label class="workspace-field workspace-field-inline"><span class="input-label">Base variety</span><span class="workspace-control workspace-reference-control workspace-reference-derived" role="status" aria-label="${escapeHtml(label)}"><span class="workspace-reference-value${base ? ' workspace-reference-math' : ''}">${text}</span></span></label>`;
  }
  function assetInputCardTitleState(coordinator = assetsCardState, options = {}) {
    const instanceKey = coordinator.slots.get('input')?.activeInstanceKey || '';
    const instance = instanceKey ? coordinator.instances.get(instanceKey) : null;
    const record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    if (record) return {
      rendered: `\\(${record.name}\\) · Input`,
      plain: `${record.plainName || plainAssetName(record.name) || record.name} · Input`,
      instanceKey
    };
    const mode = options.mode || assetState.editorMode;
    if (mode === 'create') {
      const kind = options.createKind || 'variety';
      const label = kind === 'young' ? 'Young diagram' : kind === 'lie' ? 'Lie type' : kind === 'sheaf' ? 'Sheaf' : kind === 'map' ? 'Map' : 'Variety';
      return { rendered: `New ${label} · Input`, plain: `New ${label} · Input`, instanceKey: '' };
    }
    return { rendered: 'Assets · Input', plain: 'Assets · Input', instanceKey: '' };
  }
  function updateAssetsInputCardTitle(instance, kind) {
    const card = assetState.editorCard, label = card?.querySelector('.card-head-label');
    if (!card || !label) return;
    const title = assetInputCardTitleState(assetsCardState, { mode: assetState.editorMode, createKind: kind });
    window.MathJax?.typesetClear?.([label]);
    label.textContent = title.rendered;
    card.dataset.workspaceLabel = title.plain;
    card.dataset.inputInstanceKey = title.instanceKey;
    card.querySelector('.card-head')?.setAttribute('aria-label', title.plain);
    if (instance && window.MathJax?.typesetPromise) {
      const instanceKey = instance.key, rendererEpoch = instance.rendererEpoch, taskGeneration = instance.taskGeneration;
      window.MathJax.typesetPromise([label]).then(() => acceptAssetInputAsyncResult(instanceKey, rendererEpoch, taskGeneration), () => {});
    }
  }
  function renderAssetsEditor() {
    scheduleDefaultCleanup();
    const form = editorForm(); if (!form) return;
    const instance = activeAssetInputInstance(), record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    if (record) assetState.editorMode = 'modify';
    const draft = instance?.draft || cloneInputDraft({ name: '', kind: form.querySelector('[data-assets-kind]').value || 'variety', type: '', data: {} });
    const kind = record?.kind || draft.kind || 'variety';
    const subtype = draft.type || record?.type || ASSET_SUBTYPES[kind][0][0];
    if (instance) instance.rendererEpoch += 1;
    form.dataset.inputInstanceKey = instance?.key || '';
    form.dataset.rendererEpoch = String(instance?.rendererEpoch || 0);
    form.querySelector('[data-assets-kind-row]').hidden = !!record;
    form.querySelector('[data-assets-kind]').value = kind; form.querySelector('[data-assets-kind]').disabled = !!record;
    updateAssetsInputCardTitle(instance, kind);
    const name = instance ? draft.name : uniqueDefaultAssetName(kind, subtype);
    form.dataset.autoName = instance ? draft.autoName : name;
    window.CalculatorInputSettings.syncEditableValue(form.querySelector('[data-assets-name]'), name);
    const subtypeSelect = form.querySelector('[data-assets-subtype]'); subtypeSelect.replaceChildren(...ASSET_SUBTYPES[kind].map(([value, label]) => new Option(label, value))); subtypeSelect.value = subtype;
    form.querySelector('[data-assets-save]').textContent = record ? 'save now' : 'add'; form.querySelector('[data-assets-delete]').hidden = !record;
    renderAssetsEditorFields();
    if (instance) {
      renderAssetInputStatus(instance);
      if (instance.dirty && ['Editing', 'Saving…'].includes(instance.autosaveStatus)) scheduleAssetInputAutosave(instance);
    }
    else { form.querySelector('[data-assets-editor-status]').textContent = ''; assetState.editorCard.querySelector('[data-assets-autosave-status]').textContent = 'Editing'; }
  }
  function renderAssetsEditorFields() {
    const form = editorForm(); if (!form) return;
    closeReferencePicker();
    const kind = form.querySelector('[data-assets-kind]').value, type = form.querySelector('[data-assets-subtype]').value;
    const instance = activeAssetInputInstance(), record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    const currentKey = record ? assetKey(record) : '', rawData = { ...(instance?.draft?.data || {}) }, data = ['young', 'lie'].includes(kind) ? rawData : { ...normalizedAssetData(kind, type, record?.type === type ? record.data : {}), ...window.MathWorkspaceNumbers.migrateInputs(kind, type, rawData) }, fields = form.querySelector('[data-assets-fields]'); let html = '';
    const context = { kind, type, currentKey, data };
    if (kind === 'young') {
      html += fieldHtml('Rows', 'partition', data.partition ?? (data.rows || []).join(', '));
    } else if (kind === 'lie') {
      html += `<label class="workspace-field workspace-field-inline"><span class="input-label">Lie type</span><select class="workspace-control" data-assets-field="family">${['A','B','C','D','E6','E7','E8','F4','G2'].map(family => `<option value="${family}"${family === (data.family || 'A') ? ' selected' : ''}>${family}</option>`).join('')}</select></label>`;
      html += fieldHtml('Rank', 'rank', data.rank ?? 3, 'number');
    } else if (kind === 'variety') {
      const derivedDimension = DERIVED_VARIETY_DIMENSIONS.has(type);
      const dimension = type === 'complete-intersection' ? data.dimension ?? derivedVarietyDimension(type, data) ?? ''
        : derivedDimension ? derivedVarietyDimension(type, data) ?? '' : data.dimension ?? 3;
      html += fieldHtml('Dimension', 'dimension', dimension, 'number', { readOnly: derivedDimension&&type!=='complete-intersection' });
      if (type === 'ppav-moduli') html += fieldHtml('Genus', 'genus', data.genus ?? 2, 'number');
      if (type === 'symmetric-product-curve') html += fieldHtml('Symmetric power m', 'power', data.power ?? 3, 'number');
      if (type === 'grassmannian') html += fieldHtml('r', 'r', data.r ?? 2, 'number') + fieldHtml('n', 'n', data.n ?? 4, 'number');
      if (type === 'complete-intersection') html += fieldHtml('Ambient dimension', 'ambientDimension', data.ambientDimension ?? 3, 'number',{readOnly:true})
        + `<label class="workspace-field workspace-field-inline"><span class="input-label">Equations</span><span class="workspace-ci-slider"><input class="workspace-control" type="range" min="0" max="8" step="1" value="0" data-assets-ci-count aria-label="Equations"><output data-assets-ci-count-value>0</output></span></label>`
        + fieldHtml('Degrees', 'degrees', data.degrees ?? '')
        + `<div class="workspace-form-fields" data-assets-ci-degrees></div><p class="workspace-card-context">Ambient dimension = dimension + number of equations. Leave Degrees empty for projective space. For degrees above 12, use the Degrees list (maximum 99).</p>`;
      if(type==='point')html+=`<div class="workspace-form-actions">${['\\{*\\}','pt','p','\\{p\\}'].map(name=>`<button type="button" class="btn btn-ghost" data-point-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div>`;
      referenceFieldSpecs(kind, type).forEach((spec) => { html += spec.scalar ? scalarFieldHtml(spec, context) : referenceFieldHtml(spec, context); });
    } else if (kind === 'sheaf') {
      const specs = referenceFieldSpecs(kind, type, data);
      specs.filter((spec) => spec.field === 'base').forEach((spec) => { html += referenceFieldHtml(spec, context); });
      if (['tangent','cotangent'].includes(type)) {
        html += `<label class="workspace-check"><input type="checkbox" data-assets-field="differentialWedge"${data.differentialWedge===true?' checked':''}><span>Exterior power</span></label>`;
        if (data.differentialWedge===true) {
          let max=null;try{max=window.MathWorkspaceSheafModel.dimension(assetByKey(data.base),assetState.snapshot.assets);}catch(_){}
          const degree=String(data.wedgeDegree??1);
          const degrees=max==null?[degree]:Array.from({length:max+1},(_,i)=>String(i));
          if(!degrees.includes(degree))degrees.push(degree);
          html += `<label class="workspace-field workspace-field-inline"><span class="input-label">Exterior degree</span><select class="workspace-control" data-assets-field="wedgeDegree"${max==null?' disabled':''}>${degrees.map(value=>`<option value="${escapeHtml(value)}"${degree===value?' selected':''}${max!=null&&Number(value)>max?' disabled':''}>${escapeHtml(value)}${max!=null&&Number(value)>max?' (unavailable)':''}</option>`).join('')}</select></label><p class="workspace-card-context">Exterior degree k means the k-th wedge power, rather than a tensor power. Degree 0 gives the structure sheaf.</p>`;
        }
      }
      if (type === 'divisor-line') {
        let basis=[];try{basis=window.MathWorkspaceSheafModel.divisorBasis(data.base,assetState.snapshot.assets);}catch(error){html+=`<p class="workspace-card-context">${escapeHtml(error.message)}</p>`;}
        const known=new Set(basis.map(d=>d.id)),coefficients=data.divisorCoefficients||{};
        const rows=[...basis,...Object.keys(coefficients).filter(id=>!known.has(id)&&String(coefficients[id]).trim()!=='0').map(id=>({id,plain:id+' (unavailable on this base)',latex:''}))];
        html += rows.map(def=>`<label class="workspace-field workspace-field-inline"><span class="input-label">${def.latex?'\\('+escapeHtml(def.latex)+'\\)':escapeHtml(def.plain)}</span><input class="workspace-control workspace-code-control" type="text" data-assets-divisor-class="${escapeHtml(def.id)}" value="${escapeHtml(coefficients[def.id]??'0')}" aria-label="Coefficient of ${escapeHtml(def.plain||def.id)} in D" autocomplete="off" spellcheck="false"></label>`).join('');
        html += `<p class="workspace-card-context">${rows.length?'Write D in the displayed divisor classes. Coefficients accept integers or fractions; set unavailable classes to 0.':'This base has no known divisor classes; D = 0.'}</p>`;
      }
      if (['tensor','internal-hom','map-operation'].includes(type)) html += `<label class="workspace-field workspace-field-inline"><span class="input-label">Mode</span><select class="workspace-control" data-assets-field="exact"><option value="false"${data.exact===true?'':' selected'}>Derived</option><option value="true"${data.exact===true?' selected':''}>Ordinary (assume exactness)</option></select></label>`;
      if (type === 'twist') html += fieldHtml('Twist r', 'twist', data.twist ?? 1, 'number');
      if(['self-direct-sum','self-tensor-product'].includes(type))html+=fieldHtml('Multiplicity','multiplicity',data.multiplicity??'2');
      if (type === 'map-operation') html += `<label class="workspace-field workspace-field-inline"><span class="input-label">Operation</span><select class="workspace-control" data-assets-field="operation"><option value="pullback"${data.operation === 'pushforward' ? '' : ' selected'}>Pullback</option><option value="pushforward"${data.operation === 'pushforward' ? ' selected' : ''}>Pushforward</option></select></label>`;
      if (type==='map-operation'&&data.operation==='pushforward') html += `<label class="workspace-check"><input type="checkbox" data-assets-field="proper"${data.proper!==false?' checked':''}><span>Proper map (use f_*; otherwise f_!)</span></label>`;
      specs.filter((spec) => spec.field !== 'base').forEach((spec) => {
        if (type === 'tensor') {
          const index = spec.tensorIndex;
          html += `<div class="workspace-tensor-factor workspace-form-fields" data-assets-tensor-row="${index}">${referenceFieldHtml(spec, context)}<label class="workspace-field workspace-field-inline"><span class="input-label">Exponent</span><input class="workspace-control workspace-code-control" type="text" data-assets-tensor-exponent="${index}" value="${escapeHtml(data.exponents?.[index] ?? '1')}" spellcheck="false" autocomplete="off" aria-label="Exponent for factor ${index+1}"></label><button class="btn btn-ghost" type="button" data-assets-tensor-remove="${index}" aria-label="Remove factor ${index+1}">Remove factor</button></div>`;
        } else html += spec.scalar ? scalarFieldHtml(spec, context) : referenceFieldHtml(spec, context);
      });
      if (type === 'tensor') html += `<div class="workspace-form-actions"><button class="btn btn-ghost" type="button" data-assets-tensor-add${window.MathWorkspaceSheafModel.tensorParents(data).length >= window.MathWorkspaceSheafModel.tensorLimit ? ' disabled' : ''}>Add factor</button><span class="workspace-card-context">${window.MathWorkspaceSheafModel.tensorParents(data).length} / ${window.MathWorkspaceSheafModel.tensorLimit} factors</span></div><p class="workspace-card-context">Exponents accept expressions such as 2 or n + 1. An empty product is the structure sheaf on the selected base.</p>`;
      if (!isDirectSheafType(type) && !(type === 'tensor' && !window.MathWorkspaceSheafModel.tensorParents(data).length)) html += inferredBaseFieldHtml(type, data);
      if (GEOMETRIC_HYPOTHESES[type]) {
        const confirmed = data.confirmed === true || data.confirmed == null && !!data.workspaceSheafComplex?.payload?.construction;
        html += `<label class="workspace-check"><input type="checkbox" data-assets-field="confirmed"${confirmed ? ' checked' : ''}><span>${GEOMETRIC_HYPOTHESES[type]}</span></label>`;
      }
      if (type === 'schur') html += fieldHtml('Partition', 'partition', data.partition ?? '2,1');
    } else {
      referenceFieldSpecs(kind, type).forEach((spec) => { html += referenceFieldHtml(spec, context); });
    }
    fields.dataset.rebuilding='true';fields.innerHTML = html;delete fields.dataset.rebuilding;
    fields.querySelectorAll('[data-point-name]').forEach(button=>button.addEventListener('click',()=>{const name=form.querySelector('[data-assets-name]');window.CalculatorInputSettings.syncEditableValue(name,button.dataset.pointName,{force:true});captureAssetInputDraftFromForm(instance.key,instance.rendererEpoch,{immediate:true});}));
    fields.querySelectorAll('input[data-assets-field]:not([readonly]),input[data-assets-tensor-exponent],input[data-assets-divisor-class]').forEach(field => {
      window.CalculatorInputSettings.listenEditable(field, 'input', () => captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: false }), { commitHandled: true });
    });
    fields.querySelectorAll('[data-assets-reference]').forEach(bindReferenceField);
    fields.querySelector('[data-assets-tensor-add]')?.addEventListener('click', () => changeTensorFactors());
    fields.querySelectorAll('[data-assets-tensor-remove]').forEach(button => button.addEventListener('click', () => changeTensorFactors(Number(button.dataset.assetsTensorRemove))));
    const ciCount = fields.querySelector('[data-assets-ci-count]');
    if (ciCount) {
      ciCount.addEventListener('input', () => changeCompleteIntersectionSlider(ciCount));
      ciCount.addEventListener('change', () => changeCompleteIntersectionSlider(ciCount));
      syncCompleteIntersectionInput();
    }
    if (instance) fields.querySelectorAll('.workspace-scalar-field').forEach(group => bindScalarField(group, referenceFieldSpecs(kind, type).find(spec => spec.field === group.querySelector('[data-scalar-mode]').dataset.scalarMode), instance));
    if (window.MathJax?.typesetPromise) {
      const instanceKey = instance?.key || '', rendererEpoch = instance?.rendererEpoch || 0, taskGeneration = instance?.taskGeneration || 0;
      window.MathJax.typesetClear?.([fields]);
      window.MathJax.typesetPromise([fields]).then(() => acceptAssetInputAsyncResult(instanceKey, rendererEpoch, taskGeneration), () => {});
    }
  }
  function assetEditorData(instance = activeAssetInputInstance()) {
    const form = editorForm(), data = {};
    if (form.querySelector('[data-assets-kind]').value === 'sheaf' && form.querySelector('[data-assets-subtype]').value === 'tensor' && form.querySelector('[data-assets-tensor-add]')) {
      const previous = window.MathWorkspaceSheafModel.tensorParents(instance?.draft.data || {});
      data.parents = [...form.querySelectorAll('[data-assets-tensor-index]')].map(field => field.dataset.assetsReferenceValue || previous[Number(field.dataset.assetsTensorIndex)] || '');
      data.exponents = [...form.querySelectorAll('[data-assets-tensor-exponent]')].map(field => field.value);
      syncTensorAliases('sheaf', 'tensor', data);
    }
    form.querySelectorAll('[data-assets-field]').forEach((field) => { if (!field.readOnly) data[field.dataset.assetsField] = field.type === 'checkbox' ? field.checked : field.dataset.assetsField==='exact' ? field.value==='true' : field.value; });
    if (form.querySelector('[data-assets-subtype]').value==='divisor-line' && form.querySelector('[data-assets-divisor-class]')) {
      data.divisorCoefficients={...(instance?.draft.data.divisorCoefficients||{})};
      form.querySelectorAll('[data-assets-divisor-class]').forEach(field=>{data.divisorCoefficients[field.dataset.assetsDivisorClass]=field.value;});
    }
    form.querySelectorAll('[data-scalar-value]').forEach(field => { data[field.dataset.scalarValue] = { kind: field.closest('.workspace-scalar-field').querySelector('[data-scalar-mode]').value, value: field.value }; });
    if(form.querySelector('[data-assets-kind]').value==='variety'&&form.querySelector('[data-assets-subtype]').value==='complete-intersection'&&(!instance||instance.draft.type==='complete-intersection')){
      try { data.ambientDimension = String(completeIntersectionInputParameters(data).ambientDimension); } catch (_) {}
    }
    form.querySelectorAll('[data-assets-reference]').forEach((field) => {
      if (field.hasAttribute('data-assets-tensor-index')) return;
      const name = field.dataset.assetsReference, value = field.dataset.assetsReferenceValue || '';
      if (field.closest('.workspace-scalar-field')) { data[name] = { kind: 'reference', ref: value }; return; }
      // Reference controls are replaced when another reference is chosen.  A
      // transient empty button must never erase a value already kept in the
      // draft (notably the other endpoint of a map).
      if (value || !Object.prototype.hasOwnProperty.call(instance?.draft?.data || {}, name)) data[name] = value;
    });
    return data;
  }
  function validateAssetData(kind, type, data, currentKey) {
    if(window.MathWorkspaceTopology?.kinds.includes(kind)){
      const original=assetByKey(currentKey);
      if(data.source&&data.source!==original?.data.source)window.MathWorkspaceTopology.resolve({kind,data},assetState.snapshot.assets);
      return;
    }
    if(kind==='field'){const problems=window.MathWorkspaceStructures.issues({kind,data},assetState.snapshot.assets);if(problems.length)throw new Error(problems.join(' '));}
    if(['complex','filtration','field-extension'].includes(kind)){
      const issues=window.MathWorkspaceStructures.issues({kind,data},assetState.snapshot.assets);if(issues.length)throw new Error(issues.join(' '));return;
    }
    if(window.MathWorkspaceNumbers && (kind==='number'||window.MathWorkspaceNumbers.references(kind,type).some(spec=>spec.scalar&&data[spec.field]))) {
      const candidate={...(assetByKey(currentKey)||{kind,id:'draft',name:'a'}),type,data};
      const assets=[...assetState.snapshot.assets.filter(asset=>assetKey(asset)!==currentKey),candidate];
      if(kind==='number')window.MathWorkspaceNumbers.evaluate(candidate,assets);
      else for(const spec of window.MathWorkspaceNumbers.references(kind,type))if(spec.scalar)window.MathWorkspaceNumbers.scalar(candidate,spec,assets);
    }
    if (slicing?.isAsset({kind,type}) || kind === 'matrix') {
      const candidate={kind,type,data,...assetRefFromKey(currentKey||kind+':draft')};
      for(const spec of slicing.references(candidate)) for(const key of (spec.many?slicing.readRef(data,spec.field)||[]:[slicing.readRef(data,spec.field)])) {
        if (!key) continue;
        if (!assetByKey(key,spec.kind) && !slicing.refKeys(assetByKey(currentKey)||{kind,type,data:{}}).includes(key)) throw new Error('Choose an existing '+spec.label+' asset.');
      }
      const graph=slicing.closure([assetKey(candidate)],[...assetState.snapshot.assets.filter(a=>assetKey(a)!==currentKey),candidate]);
      if(graph.missing.some(text=>text.startsWith('Cyclic'))) throw new Error('Asset references cannot form a cycle.');
      if (['formula','tropical'].includes(kind) && data.ambientDimension <= 8) slicing.math('validate',{asset:candidate,assets:assetState.snapshot.assets});
      return;
    }
    if (['dynkin','strands'].includes(kind)) {
      if (data.lie && !assetByKey(data.lie, 'lie') && assetByKey(currentKey)?.data.lie !== data.lie) throw new Error('Choose an existing Lie type asset.');
      return;
    }
    if (kind === 'functor') {
      for (const field of ['domain', 'codomain']) if (data[field] && !assetByKey(data[field], 'category')) throw new Error('Functor endpoints must reference Category assets.');
      return;
    }
    const context = { kind, type, data, currentKey };
    referenceFieldSpecs(kind, type, data).forEach((spec) => {
      const key = assetReferenceKey(data, spec);
      if (spec.optional && !key) return;
      if (spec.scalar && !key) return;
      const result = referenceEligibility(spec, key, context);
      if (!result.allowed) throw new Error(`${spec.label} must reference an allowed ${spec.expectedKind}.`);
    });
    if (kind === 'variety') {
      if (type === 'complete-intersection' && nonnegativeInt(data.ambientDimension, 0) < degreeList(data.degrees).length) throw new Error('Ambient dimension must be at least the number of defining degrees.');
    } else if (kind === 'sheaf') {
      if (!isDirectSheafType(type) && !assetByKey(data.base, 'variety')) throw new Error('This construction must determine a compatible base variety.');
      if (['direct-sum', 'internal-hom'].includes(type)) {
        const firstBase = assetByKey(data.first, 'sheaf')?.data?.base, secondBase = assetByKey(data.second, 'sheaf')?.data?.base;
        if (!firstBase || firstBase !== secondBase) throw new Error('Both parent sheaves must have the same base variety.');
      }
    }
    const sheafIssues=window.MathWorkspaceSheafModel.issues({kind,id:assetRefFromKey(currentKey||kind+':draft').id,type,data},assetState.snapshot.assets);
    if(sheafIssues.length)throw new Error(sheafIssues.join(' '));
  }
  const cloneInputDraft = (draft) => {
    const data = window.MathWorkspaceNumbers.migrateInputs(draft?.kind, draft?.type, draft?.data || {});
    syncTensorAliases(draft?.kind, draft?.type, data);
    if (draft?.kind === 'variety' && VARIETY_INPUT_FIELDS[draft.type]) {
      for (const field of VARIETY_CONSTRUCTION_FIELDS) if (!VARIETY_INPUT_FIELDS[draft.type].includes(field)) delete data[field];
    }
    if (draft?.kind === 'variety' && DERIVED_VARIETY_DIMENSIONS.has(draft.type)&&draft.type!=='complete-intersection') delete data.dimension;
    return { name: String(draft?.name ?? ''), autoName: draft?.autoName || '', kind: draft?.kind || 'variety', type: draft?.type || 'abstract', data };
  };
  const inputDraftFromRecord = (record) => cloneInputDraft({ name: record?.name || '', autoName: record?.autoName ?? (record?.kind === 'variety' && /^X(?:_\{[1-9]\d*\})?$/.test(record.name) ? record.name : ''), kind: record?.kind || 'variety', type: record?.type || 'abstract', data: record?.data || {} });
  const assetInputDefinition = record => JSON.stringify(inputDraftFromRecord(record),(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value);
  function createAssetInputInstance(targetRef, record = assetByKey(assetKey(targetRef)), revision = assetState.snapshot.revision) {
    if (!targetRef || !record || assetKey(targetRef) !== assetKey(record)) throw new Error('The Input target no longer exists.');
    const stableRef = Object.freeze(cloneAssetRef(targetRef));
    return {
      key: assetCardInstanceKey(stableRef, 'input'), targetRef: stableRef, cardType: 'input',
      draft: inputDraftFromRecord(record), baseDefinition: assetInputDefinition(record), dirty: false, validation: { valid: true, message: '', field: '' },
      autosaveStatus: 'Saved', taskGeneration: 0, rendererEpoch: 0, baseRevision: revision,
      conflictState: null, debounceTimer: null, maxWaitTimer: null, maxWaitStartedAt: null, deleted: false
    };
  }
  function activeAssetInputInstance(coordinator = assetsCardState) {
    const key = coordinator === assetsCardState ? assetState.activeInputInstanceKey : coordinator.slots.get('input')?.activeInstanceKey;
    return key ? coordinator.instances.get(key) || null : null;
  }
  function assetInputInstanceForRef(targetRef, coordinator = assetsCardState) {
    return coordinator.instances.get(assetCardInstanceKey(targetRef, 'input')) || null;
  }
  function balancedLatex(value) {
    let depth = 0, escaped = false;
    for (const char of String(value ?? '')) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '{') depth += 1;
      else if (char === '}' && --depth < 0) return false;
    }
    return depth === 0 && !escaped;
  }
  function validateAssetInputDraft(instance) {
    const record = assetByKey(assetKey(instance?.targetRef));
    if (!instance || instance.deleted || !record) return { valid: false, message: 'The Input target no longer exists.', field: '' };
    const draft = cloneInputDraft(instance.draft), name = draft.name.trim(), currentKey = assetKey(instance.targetRef);
    if (!name) return { valid: false, message: 'An asset name cannot be empty.', field: 'name' };
    if (!balancedLatex(name)) return { valid: false, message: 'The name contains incomplete LaTeX.', field: 'name' };
    if (assetState.snapshot.assets.some((asset) => assetKey(asset) !== currentKey && canonicalAssetName(asset.name) === canonicalAssetName(name))) return { valid: false, message: 'Another asset already has that name.', field: 'name' };
    const numericFields = new Set(['dimension', 'genus', 'power', 'r', 'n', 'ambientDimension', 'rank', 'twist']);
    for (const [field, value] of Object.entries(draft.data)) {
      if (typeof value === 'string' && !balancedLatex(value)) return { valid: false, message: `${field} contains incomplete LaTeX.`, field };
      if (numericFields.has(field) && typeof value !== 'object' && (String(value).trim() === '' || !Number.isFinite(Number(value)) || !Number.isInteger(Number(value)))) return { valid: false, message: `${field} must be a complete integer.`, field };
    }
    if (draft.kind === 'variety' && draft.type === 'complete-intersection') {
      try { completeIntersectionInputParameters(draft.data); }
      catch (error) { return { valid: false, message: error.message, field: '' }; }
    }
    if (draft.kind === 'variety' && !['product', 'toric'].includes(draft.type) && derivedVarietyDimension(draft.type, draft.data) == null) return { valid: false, message: 'The variety parameters must define a valid dimension.', field: '' };
    try {
      const data = normalizedAssetData(draft.kind, draft.type, draft.data);
      if(draft.kind==='sheaf'&&draft.type==='divisor-line')data.divisorCoefficients=window.MathWorkspaceSheafModel.divisorCoefficients(data,assetState.snapshot.assets);
      validateAssetData(draft.kind, draft.type, data, currentKey);
      return { valid: true, message: '', field: '', normalized: { name, autoName: draft.autoName === draft.name ? name : '', kind: draft.kind, type: draft.type, data, dependencies: assetDependencies(draft.kind, draft.type, data) } };
    } catch (error) { return { valid: false, message: error.message, field: '' }; }
  }
  function inputSemanticValue(record) {
    return JSON.stringify({ name: record?.name || '', autoName: record?.autoName || '', kind: record?.kind || '', type: record?.type || '', data: record?.data || {}, dependencies: record?.dependencies || [] });
  }
  function createAssetInputCommitCommand(instance) {
    const validation = validateAssetInputDraft(instance);
    instance.validation = { valid: validation.valid, message: validation.message, field: validation.field || '' };
    if (!validation.valid) return null;
    return {
      instanceKey: instance.key, targetRef: cloneAssetRef(instance.targetRef), baseRevision: instance.baseRevision,
      baseDefinition: instance.baseDefinition ?? assetInputDefinition(assetByKey(assetKey(instance.targetRef))),
      rendererEpoch: instance.rendererEpoch, taskGeneration: instance.taskGeneration,
      normalized: { ...validation.normalized, data: { ...validation.normalized.data }, dependencies: validation.normalized.dependencies.map(cloneAssetRef) }
    };
  }
  function inputTaskMatches(command, coordinator = assetsCardState) {
    const instance = coordinator.instances.get(command?.instanceKey);
    return !!instance && !instance.deleted && instance.cardType === 'input' && assetKey(instance.targetRef) === assetKey(command.targetRef)
      && instance.rendererEpoch === command.rendererEpoch && instance.taskGeneration === command.taskGeneration;
  }
  function rebaseCleanAssetInputInstances(revision, coordinator = assetsCardState) {
    for (const instance of coordinator.instances.values()) if (instance.cardType === 'input' && !instance.dirty && !instance.conflictState) {
      instance.baseRevision = revision;
      const record=assetByKey(assetKey(instance.targetRef));if(record)instance.baseDefinition=assetInputDefinition(record);
    }
  }
  function commitAssetInputCommand(command, options = {}) {
    const coordinator = options.coordinator || assetsCardState, refresh = options.refresh || ((snapshot, targetRef, affectedAssetKeys) => applyAssetSnapshot(snapshot, targetRef, { affectedAssetKeys }));
    if (!inputTaskMatches(command, coordinator)) return { committed: false, stale: true };
    const instance = coordinator.instances.get(command.instanceKey), record = assetByKey(assetKey(command.targetRef));
    if (!record) return { committed: false, stale: true };
    if (command.baseDefinition !== assetInputDefinition(record)) {
      instance.autosaveStatus = 'Conflict'; instance.conflictState = { expectedRevision: command.baseRevision, actualRevision: assetState.snapshot.revision };
      instance.validation = { valid: true, message: 'This asset was edited elsewhere. Keep your edits or use the saved version.', field: '' };
      return { committed: false, conflict: true };
    }
    const next = { ...record, ...command.normalized };
    next.data=window.MathWorkspaceSheafModel.editedData(record,next.type,next.data);
    next.dependencies=assetDependencies(next.kind,next.type,next.data);
    if (inputSemanticValue(record) === inputSemanticValue(next)) {
      instance.dirty = false; instance.autosaveStatus = 'Saved'; instance.conflictState = null; instance.baseRevision = assetState.snapshot.revision;instance.baseDefinition=assetInputDefinition(record);
      return { committed: false, unchanged: true };
    }
    const staged = {
      ...record, name: next.name, autoName: next.autoName, plainName: plainAssetName(next.name), kind: next.kind, type: next.type,
      typeLabel: ASSET_SUBTYPES[next.kind].find(([value]) => value === next.type)?.[1] || next.kind,
      definition: assetDefinitionFor(next.kind, next.type, next.data), dependencies: next.dependencies, data: next.data,
      properties: invalidateDerivedAssetProperties(record, next)
    };
    staged.fingerprint = JSON.stringify({ name: staged.name, type: staged.type, data: staged.data, dependencies: staged.dependencies, properties: staged.properties });
    Object.assign(record, staged);
    if (next.data !== command.normalized.data) {
      // Invalidation must also reach the draft: another Save or autosave must
      // not republish its old construction after the factors have committed.
      // Keep all editable raw values and their focused controls untouched.
      delete instance.draft.data.construction;
      instance.draft.data.workspaceSheafComplex = copyInput(next.data.workspaceSheafComplex);
    }
    assetState.snapshot.revision += 1;
    assetState.snapshot.capabilities = localAssetSnapshot().capabilities;
    instance.dirty = false; instance.autosaveStatus = 'Saved'; instance.conflictState = null; instance.baseRevision = assetState.snapshot.revision;instance.baseDefinition=assetInputDefinition(record);
    rebaseCleanAssetInputInstances(assetState.snapshot.revision, coordinator);
    if (coordinator === assetsCardState && assetsCardState.slots.get('input').activeInstanceKey === instance.key) updateAssetsInputCardTitle(instance, staged.kind);
    refresh(localAssetSnapshot(), command.targetRef, new Set([assetKey(command.targetRef)]));
    return { committed: true, revision: assetState.snapshot.revision };
  }
  function resolveAssetInputConflict(instance,choice,options={}) {
    const record=assetByKey(assetKey(instance?.targetRef));if(!record||!instance.conflictState||!['draft','saved'].includes(choice))return false;
    cancelAssetInputAutosave(instance,options.coordinator||assetsCardState);
    instance.conflictState=null;instance.baseRevision=assetState.snapshot.revision;instance.baseDefinition=assetInputDefinition(record);
    if(choice==='saved'){
      instance.draft=inputDraftFromRecord(record);instance.dirty=false;instance.validation={valid:true,message:'',field:''};instance.autosaveStatus='Saved';
    }else{instance.autosaveStatus='Editing';flushAssetInputInstance(instance,options);}
    if(!options.coordinator||options.coordinator===assetsCardState){renderAssetsEditor();renderAssets();}
    return true;
  }
  function clearAssetInputTimers(instance, coordinator = assetsCardState) {
    if (instance?.debounceTimer != null) coordinator.clearTimer(instance.debounceTimer);
    if (instance?.maxWaitTimer != null) coordinator.clearTimer(instance.maxWaitTimer);
    if (instance) { instance.debounceTimer = null; instance.maxWaitTimer = null; instance.maxWaitStartedAt = null; }
  }
  function cancelAssetInputAutosave(instance, coordinator = assetsCardState) {
    if (!instance) return;
    clearAssetInputTimers(instance, coordinator); instance.taskGeneration += 1;
  }
  function renderAssetInputStatus(instance) {
    const record=instance&&assetByKey(assetKey(instance.targetRef)),item=record&&document.querySelector(`[data-asset-key="${assetKey(record)}"]`);
    if(item)syncAssetWarning(record,item);
    if (!instance || activeAssetInputInstance() !== instance) return;
    const card = assetState.editorCard, form = editorForm(); if (!card || !form) return;
    syncAssetInputDerivedFields(instance);
    const compact = card.querySelector('[data-assets-autosave-status]'), message = form.querySelector('[data-assets-editor-status]');
    const diagnosticMessages=record?window.MathWorkspaceDiagnostics?.messages(assetDiagnostics()[assetKey(record)],assetState.snapshot.assets)||[]:[];
    if (compact) compact.textContent = instance.autosaveStatus;
    if (message) message.textContent = instance.validation?.message || (diagnosticMessages.length?'⚠ Needs repair: '+diagnosticMessages.join(' '):'');
    form.querySelector('[data-assets-conflict-actions]').hidden=!instance.conflictState;
    form.dataset.autosaveState = instance.autosaveStatus.toLowerCase().replace(/[^a-z]+/g, '-');
    form.querySelectorAll('[data-assets-name],[data-assets-field],[data-scalar-value],[data-assets-reference]').forEach((field) => field.setAttribute('aria-invalid', String(!instance.validation?.valid && (!instance.validation.field || instance.validation.field === (field.dataset.assetsField || field.dataset.scalarValue || field.dataset.assetsReference || 'name')))));
  }
  function drainAssetInputQueue(coordinator = assetsCardState) {
    if (coordinator.inputTaskRunning) return;
    coordinator.inputTaskRunning = true;
    try { while (coordinator.inputTaskQueue.length) coordinator.inputTaskQueue.shift()(); }
    finally { coordinator.inputTaskRunning = false; }
  }
  function queueAssetInputAutosave(instance, rendererEpoch = instance?.rendererEpoch, taskGeneration = instance?.taskGeneration, options = {}) {
    const coordinator = options.coordinator || assetsCardState;
    if (!instance || instance.deleted || instance.rendererEpoch !== rendererEpoch || instance.taskGeneration !== taskGeneration) return false;
    clearAssetInputTimers(instance, coordinator);
    const command = createAssetInputCommitCommand(instance);
    if (!command) { instance.autosaveStatus = 'Invalid draft'; renderAssetInputStatus(instance); return false; }
    instance.autosaveStatus = 'Saving…'; renderAssetInputStatus(instance);
    coordinator.inputTaskQueue.push(() => {
      const result = commitAssetInputCommand(command, { coordinator, refresh: options.refresh });
      renderAssetInputStatus(instance); return result;
    });
    drainAssetInputQueue(coordinator);
    return true;
  }
  function scheduleAssetInputAutosave(instance, options = {}) {
    const coordinator = options.coordinator || assetsCardState, now = coordinator.now();
    if (!instance || instance.deleted) return false;
    if (instance.maxWaitStartedAt == null) instance.maxWaitStartedAt = now;
    if (instance.debounceTimer != null) coordinator.clearTimer(instance.debounceTimer);
    if (instance.maxWaitTimer != null) coordinator.clearTimer(instance.maxWaitTimer);
    const epoch = instance.rendererEpoch, generation = instance.taskGeneration;
    if (options.immediate) return queueAssetInputAutosave(instance, epoch, generation, options);
    instance.debounceTimer = coordinator.setTimer(() => queueAssetInputAutosave(instance, epoch, generation, options), INPUT_AUTOSAVE_DEBOUNCE_MS);
    const remaining = Math.max(0, INPUT_AUTOSAVE_MAX_WAIT_MS - (now - instance.maxWaitStartedAt));
    instance.maxWaitTimer = coordinator.setTimer(() => queueAssetInputAutosave(instance, epoch, generation, options), remaining);
    return true;
  }
  function updateAssetInputDraft(instance, patch, options = {}) {
    if (!instance || instance.deleted) return false;
    instance.taskGeneration += 1;
    const data = { ...instance.draft.data, ...(patch.data || {}) };
    if (instance.draft.kind === 'sheaf' && instance.draft.type === 'tensor' && patch.type && patch.type !== 'tensor') { delete data.parents; delete data.exponents; }
    instance.draft = cloneInputDraft({ ...instance.draft, ...patch, data });
    if (instance.draft.name !== instance.draft.autoName) instance.draft.autoName = '';
    if (instance.draft.kind === 'variety' && instance.draft.autoName) {
      const validation = validateAssetInputDraft(instance);
      if (validation.valid) {
        instance.draft.name = uniqueDefaultAssetName('variety', instance.draft.type, assetKey(instance.targetRef), validation.normalized.data);
        instance.draft.autoName = instance.draft.name;
      }
    }
    instance.dirty = true; instance.validation = { valid: true, message: '', field: '' };
    instance.autosaveStatus = instance.conflictState ? 'Conflict' : 'Editing';
    renderAssetInputStatus(instance);
    return options.schedule === false ? true : scheduleAssetInputAutosave(instance, options);
  }
  function syncAssetInputDerivedFields(instance = activeAssetInputInstance()) {
    const form = editorForm();
    if (!form || !instance || instance !== activeAssetInputInstance() || instance.draft.kind !== 'variety') return;
    const { type, data, name, autoName } = instance.draft;
    if(type==='complete-intersection')syncCompleteIntersectionInput(data);
    if (DERIVED_VARIETY_DIMENSIONS.has(type)) {
      const field = form.querySelector('[data-assets-field="dimension"]');
      if (field?.readOnly) window.CalculatorInputSettings.syncEditableValue(field, derivedVarietyDimension(type, data) ?? '');
    }
    if (autoName && name === autoName) {
      window.CalculatorInputSettings.syncEditableValue(form.querySelector('[data-assets-name]'), name);
      const record = assetByKey(assetKey(instance.targetRef));
      if (record && !instance.dirty && assetState.editorCard?.dataset.workspaceLabel !== `${record.plainName || record.name} · Input`) updateAssetsInputCardTitle(instance, 'variety');
    }
  }
  function flushAssetInputInstance(instance, options = {}) {
    if (!instance?.dirty || instance.deleted) return false;
    return scheduleAssetInputAutosave(instance, { ...options, immediate: true });
  }
  function bindAssetInputInstance(targetRef, options = {}) {
    const coordinator = options.coordinator || assetsCardState, target = assetByKey(assetKey(targetRef));
    if (!target) throw new Error('The selected asset no longer exists.');
    const slot = coordinator.slots.get('input'), previous = activeAssetInputInstance(coordinator);
    if (previous && previous.key !== assetCardInstanceKey(targetRef, 'input') && options.flush !== false) flushAssetInputInstance(previous, { coordinator, refresh: options.refresh });
    const key = assetCardInstanceKey(targetRef, 'input');
    let instance = coordinator.instances.get(key);
    if (!instance) { instance = createAssetInputInstance(targetRef, target); coordinator.instances.set(key, instance); }
    slot.activeInstanceKey = key; slot.visible = true;
    if (coordinator === assetsCardState) assetState.activeInputInstanceKey = key;
    if (options.render !== false) renderAssetsEditor();
    return instance;
  }
  function acceptAssetInputAsyncResult(instanceKey, rendererEpoch, taskGeneration, callback, coordinator = assetsCardState) {
    const instance = coordinator.instances.get(instanceKey);
    if (!instance || instance.deleted || instance.rendererEpoch !== rendererEpoch || instance.taskGeneration !== taskGeneration) return false;
    callback?.(instance); return true;
  }
  function assetDependencies(kind, type, data) {
    return referenceKeys(kind, type, data).map((key) => { const [dependencyKind, id] = key.split(':'); return { kind: dependencyKind, id }; });
  }
  function referenceSpecForControl(control, context) {
    return referenceFieldSpecs(context.kind, context.type, context.data).find((spec) => spec.field === control.dataset.assetsReference) || null;
  }
  function ensureSheafInputInstance() {
    if (!activeAssetInputInstance()) saveAssetsEditor({ preventDefault() {} });
    return activeAssetInputInstance();
  }
  function changeTensorFactors(removeIndex = null) {
    const instance = ensureSheafInputInstance(), form = editorForm();
    if (!instance || instance.draft.kind !== 'sheaf' || instance.draft.type !== 'tensor') return;
    captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { schedule: false });
    const data = { ...instance.draft.data }, parents = window.MathWorkspaceSheafModel.tensorParents(data);
    const exponents = parents.map((_,index)=>data.exponents?.[index] ?? '1');
    data.base = inferredSheafBase('tensor', data) || data.base;
    if (removeIndex == null) {
      if (parents.length >= window.MathWorkspaceSheafModel.tensorLimit) return;
      parents.push(''); exponents.push('1');
    } else {
      if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= parents.length) return;
      parents.splice(removeIndex, 1); exponents.splice(removeIndex, 1);
    }
    updateAssetInputDraft(instance, { data: { ...data, parents, exponents } }, { immediate: true });
    renderAssetsEditorFields(); renderAssetInputStatus(instance);
    const selector = removeIndex == null ? `[data-assets-tensor-index="${parents.length-1}"]` : parents.length ? `[data-assets-tensor-remove="${Math.min(removeIndex,parents.length-1)}"]` : '[data-assets-reference="base"]';
    form.querySelector(selector)?.focus();
  }
  function referenceDragKey(dataTransfer) {
    try {
      const value = JSON.parse(dataTransfer?.getData(ASSET_DRAG_TYPE) || 'null');
      return value?.kind && value?.id ? assetKey(value) : assetState.draggedAssetKey;
    } catch (_) { return assetState.draggedAssetKey; }
  }
  function markReferenceDrop(control, state) {
    delete control.dataset.dropState;
    if (!state) return;
    control.dataset.dropState = state;
    clearTimeout(control._assetsDropTimer);
    control._assetsDropTimer = setTimeout(() => { if (control.dataset.dropState === state) delete control.dataset.dropState; }, 260);
  }
  function closeReferencePicker() {
    const picker = assetState.referencePicker;
    if (!picker) return false;
    picker.control?.setAttribute('aria-expanded', 'false');
    picker.node.remove(); assetState.referencePicker = null;
    return true;
  }
  function chooseAssetReference(control, spec, key, instanceKey = control.closest?.('form')?.dataset.inputInstanceKey, rendererEpoch = Number(control.closest?.('form')?.dataset.rendererEpoch)) {
    if (!activeAssetInputInstance() && referenceContext(editorForm()).kind === 'sheaf') {
      ensureSheafInputInstance();
      return chooseAssetReference(editorForm().querySelector(`[data-assets-reference="${CSS.escape(spec.field)}"]`), spec, key);
    }
    const boundInstance = assetsCardState.instances.get(instanceKey);
    if (!boundInstance || boundInstance !== activeAssetInputInstance() || boundInstance.rendererEpoch !== rendererEpoch) return;
    const context = referenceContext(editorForm());
    if (!referenceEligibility(spec, key, context).allowed) return;
    // `context.data` includes every current reference.  Rebuilding from the
    // clicked control's transient DOM snapshot can omit its sibling (for
    // example, a map's Domain while choosing its Codomain).
    const instance = boundInstance;
    updateAssetInputDraft(instance, { data: dataWithReference(context.data, spec, key) }, { immediate: true });
    closeReferencePicker(); renderAssetsEditorFields(); renderAssetInputStatus(instance);
    const taskGeneration = instance.taskGeneration;
    setTimeout(() => acceptAssetInputAsyncResult(instance.key, instance.rendererEpoch, taskGeneration, () => editorForm()?.querySelector(`[data-assets-reference="${CSS.escape(spec.field)}"]`)?.focus()), 0);
  }
  function openReferencePicker(control) {
    const form = editorForm(); if (!form || control.disabled) return;
    if (!activeAssetInputInstance() && form.querySelector('[data-assets-kind]').value === 'sheaf') {
      const field = control.dataset.assetsReference; ensureSheafInputInstance();
      return openReferencePicker(form.querySelector(`[data-assets-reference="${CSS.escape(field)}"]`));
    }
    if (assetState.referencePicker?.control === control) { closeReferencePicker(); return; }
    closeReferencePicker();
    const context = referenceContext(form), spec = referenceSpecForControl(control, context);
    if (!spec) return;
    const entries = eligibleReferenceAssets(spec, context), picker = document.createElement('div');
    const boundInstance = activeAssetInputInstance(), instanceKey = boundInstance?.key || '', rendererEpoch = boundInstance?.rendererEpoch || 0;
    picker.className = 'workspace-reference-picker'; picker.setAttribute('role', 'listbox'); picker.setAttribute('aria-label', `${spec.label} choices`);
    if (!entries.length) picker.appendChild(Object.assign(document.createElement('p'), { className: 'workspace-reference-picker-empty', textContent: `No compatible ${spec.expectedKind} is available.` }));
    entries.forEach((asset) => {
      const option = document.createElement('button'); option.type = 'button'; option.className = 'workspace-reference-option'; option.setAttribute('role', 'option'); option.dataset.assetKey = assetKey(asset); option.setAttribute('aria-selected', String(assetKey(asset) === control.dataset.assetsReferenceValue));
      option.setAttribute('aria-label', `${asset.plainName || asset.name}, ${asset.typeLabel}`);
      option.innerHTML = `<span class="workspace-reference-option-name">\\(${escapeHtml(asset.name)}\\)</span><small>${escapeHtml(asset.typeLabel)}</small>`;
      option.addEventListener('click', () => chooseAssetReference(control, spec, assetKey(asset), instanceKey, rendererEpoch));
      picker.appendChild(option);
    });
    picker.addEventListener('keydown', (event) => {
      const options = Array.from(picker.querySelectorAll('.workspace-reference-option'));
      const index = options.indexOf(document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); closeReferencePicker(); control.focus(); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); }
      else if (event.key === 'Home') { event.preventDefault(); options[0]?.focus(); }
      else if (event.key === 'End') { event.preventDefault(); options.at(-1)?.focus(); }
    });
    document.body.appendChild(picker); control.setAttribute('aria-expanded', 'true');
    assetState.referencePicker = { node: picker, control };
    const controlRect = control.getBoundingClientRect(), pickerRect = picker.getBoundingClientRect();
    picker.style.left = `${Math.max(6, Math.min(controlRect.left, window.innerWidth - pickerRect.width - 6))}px`;
    picker.style.top = `${Math.max(6, Math.min(controlRect.bottom + 4, window.innerHeight - pickerRect.height - 6))}px`;
    const taskGeneration = boundInstance?.taskGeneration || 0;
    window.MathJax?.typesetPromise?.([picker]).then(() => acceptAssetInputAsyncResult(instanceKey, rendererEpoch, taskGeneration), () => {});
    picker.querySelector('.workspace-reference-option[aria-selected="true"], .workspace-reference-option')?.focus();
  }
  function bindReferenceField(control) {
    control.addEventListener('click', () => openReferencePicker(control));
    control.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && closeReferencePicker()) { event.preventDefault(); return; }
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); openReferencePicker(control); }
    });
    const dragResult = (event) => {
      const context = referenceContext(editorForm()), spec = referenceSpecForControl(control, context), key = referenceDragKey(event.dataTransfer);
      return { spec, key, result: spec ? referenceEligibility(spec, key, context) : { allowed: false } };
    };
    control.addEventListener('dragenter', (event) => { const { result } = dragResult(event); markReferenceDrop(control, result.allowed ? 'valid' : 'invalid'); });
    control.addEventListener('dragover', (event) => { const { result } = dragResult(event); markReferenceDrop(control, result.allowed ? 'valid' : 'invalid'); if (result.allowed) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } });
    control.addEventListener('dragleave', () => markReferenceDrop(control, ''));
    control.addEventListener('drop', (event) => { const { spec, key, result } = dragResult(event); if (!result.allowed) { markReferenceDrop(control, 'invalid'); return; } event.preventDefault(); markReferenceDrop(control, ''); chooseAssetReference(control, spec, key); });
  }
  function assetDefinitionFor(kind, type, data) {
    if(kind==='filtration')return 'Filtration · '+data.objects.length+' terms · '+data.direction+' from '+data.startDegree;
    if(kind==='complex')return 'Complex · '+data.objects.length+' terms · '+data.direction+' from '+data.startDegree;
    if(kind==='field-extension')return (assetByKey(data.target)?.plainName||data.generator)+' / '+(assetByKey(data.base)?.plainName||'Choose base field')+' · '+data.polynomial;
    if(kind==='mosaic-space')return data.rows+' × '+data.cols+' · '+data.lattice+' · '+data.boundary;
    if(kind==='mosaic-diagram')return (data.diagramType==='dual'?'Dual graph':'Knot / link')+' on '+data.space;
    if(kind==='knot')return data.pd.length+' crossings · '+data.circles+' crossing-free circles'+(data.source?' · follows '+data.source:' · independent');
    if(kind==='dual-graph')return data.genera.length+' vertices · '+data.edges.length+' edges'+(data.source?' · follows '+data.source:' · independent');
    if (kind === 'number') return (data.hasValue?data.value:'Symbolic number')+' · '+(assetByKey(data.field)?.plainName||'Ring');
    if (kind === 'field') return window.MathWorkspaceObjects.fieldLabel(data);
    if (slicing?.isAsset({kind,type})) return kind === 'frame' ? 'Point and full basis in R^'+data.ambientDimension : kind === 'variety' ? 'Toric variety · '+(data.fan?'fan':'affine cone') : (slicing.labels[kind]||kind)+' in R^'+data.ambientDimension;
    if (kind === 'dynkin') return (data.lie || 'Choose Lie type') + ' · vertices ' + data.vertices.join(', ') + (data.quiver ? ' · quiver' : '');
    if (kind === 'strands') return (data.lie || 'Choose Lie type') + ' · ' + data.generators.length + ' generators';
    if (kind === 'matrix') return data.construction ? data.construction.basis+' · '+(data.construction.lie||'Choose Lie type') : data.rows + ' × ' + data.cols + ' · ' + window.MathWorkspaceObjects.fieldLabel(assetByKey(data.field)?.data || data);
    if (kind === 'category') return data.opposite ? 'Opposite category' : 'Category · objects ' + data.objectSymbol;
    if (kind === 'functor') return data.variance + ': ' + (data.domain || '?') + ' → ' + (data.codomain || '?');
    if (kind === 'young') return `${type === 'generalized' ? 'Generalized rows' : 'Partition'} (${data.partition || '∅'})`;
    if (kind === 'lie') return ['A','B','C','D'].includes(data.family) ? `${data.family}${data.rank}` : data.family;
    if (kind === 'variety') {
      if (type === 'projective') return `Projective space of dimension ${data.dimension || 0}`;
      if (type === 'grassmannian') return `Gr(${data.r || '?'}, ${data.n || '?'})`;
      if (type === 'complete-intersection') return `Complete intersection of degrees ${data.degrees || '—'} in ℙ^${data.ambientDimension || '?'}`;
      if (type === 'curve') { const parameter = window.MathWorkspaceNumbers.input(data, window.MathWorkspaceNumbers.references(kind,type)[0]); return `Curve of genus ${parameter.kind === 'literal' ? parameter.value : assetByKey(parameter.ref)?.plainName || '?'}`; }
      return `${ASSET_SUBTYPES.variety.find(([value]) => value === type)?.[1] || 'Variety'} · dimension ${type === 'point' ? 0 : data.dimension || '?'}`;
    }
    if (kind === 'sheaf') return `${ASSET_SUBTYPES.sheaf.find(([value]) => value === type)?.[1] || 'Sheaf'} on ${data.base ? data.base.split(':')[1] : 'a variety'}`;
    return `${ASSET_SUBTYPES.map.find(([value]) => value === type)?.[1] || 'Map'}: ${data.domain ? data.domain.split(':')[1] : '?'} → ${data.codomain ? data.codomain.split(':')[1] : '?'}`;
  }
  function saveAssetsEditor(event) {
    event.preventDefault(); const form = editorForm();
    try {
      let instance = activeAssetInputInstance();
      if (!instance) {
        const pending = cloneInputDraft({ name: form.querySelector('[data-assets-name]').value, autoName: form.dataset.autoName, kind: form.querySelector('[data-assets-kind]').value, type: form.querySelector('[data-assets-subtype]').value, data: assetEditorData(null) });
        if (pending.kind === 'variety' && pending.type === 'complete-intersection') {
          // Validate before allocating an asset: an unfinished CI draft must
          // not leave a default abstract variety behind after a failed Add.
          completeIntersectionInputParameters(pending.data);
          validateAssetData(pending.kind, pending.type, normalizedAssetData(pending.kind, pending.type, pending.data), '');
        }
        const record = createDefaultAsset(pending.kind);
        applyAssetSnapshot(localAssetSnapshot(), assetRef(record), { affectedAssetKeys: new Set([assetKey(record)]) });
        instance = bindAssetInputInstance(assetRef(record), { render: false });
        updateAssetInputDraft(instance, pending, { schedule: false });
      } else {
        captureAssetInputDraftFromForm(instance.key, instance.rendererEpoch, { schedule: false });
      }
      flushAssetInputInstance(instance);
      renderAssetsEditor();
      renderAssetInputStatus(instance);
    } catch (error) { form.querySelector('[data-assets-editor-status]').textContent = error.message; status(error.message, 'error'); }
  }

  async function assetRequest(action, payload = {}) {
    if (action === 'snapshot') return localAssetSnapshot();
    if (action === 'prepare-create') { ensureAssetsEditor(false); flushAssetInputInstance(activeAssetInputInstance()); assetState.editorMode = 'create'; assetState.activeInputInstanceKey = null; assetsCardState.slots.get('input').activeInstanceKey = null; editorForm().querySelector('[data-assets-kind]').value = payload.kind; renderAssetsEditor(); return localAssetSnapshot(); }
    if (action === 'select-for-modify') { ensureAssetsEditor(false); const record = assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(payload.ref)); if (!record) throw new Error('The selected asset no longer exists.'); bindAssetInputInstance(assetRef(record)); return localAssetSnapshot(); }
    if (action === 'rename') { const record = assetState.snapshot.assets.find((asset) => assetKey(asset) === assetKey(payload.ref)); const name = String(payload.name || '').trim(); if (!record) throw new Error('The selected asset no longer exists.'); if (!name) throw new Error('An asset name cannot be empty.'); if (assetState.snapshot.assets.some((asset) => asset !== record && canonicalAssetName(asset.name) === canonicalAssetName(name))) throw new Error('Another asset already has that name.'); record.name = name; record.plainName = plainAssetName(name); record.fingerprint = JSON.stringify({ name, type: record.type, data: record.data, dependencies: record.dependencies }); assetState.snapshot.revision += 1; const instance = assetInputInstanceForRef(assetRef(record)); if (instance && !instance.dirty) { instance.draft.name = name; instance.baseRevision = assetState.snapshot.revision; instance.autosaveStatus = 'Saved'; } rebaseCleanAssetInputInstances(assetState.snapshot.revision); if (activeAssetInputInstance() === instance) renderAssetsEditor(); return localAssetSnapshot(); }
    if (action === 'plan-delete') {
      const selectedKeys = new Set((payload.refs || []).map(assetKey)), deleting = new Set(selectedKeys); let changed = true;
      while (changed) { changed = false; assetState.snapshot.assets.forEach((asset) => { if (!deleting.has(assetKey(asset)) && (asset.dependencies || []).some((ref) => deleting.has(assetKey(ref)))) { deleting.add(assetKey(asset)); changed = true; } }); }
      const selected = assetState.snapshot.assets.filter((asset) => selectedKeys.has(assetKey(asset))), dependents = assetState.snapshot.assets.filter((asset) => deleting.has(assetKey(asset)) && !selectedKeys.has(assetKey(asset)));
      return { revision: assetState.snapshot.revision, selected, dependents, all: [...selected, ...dependents] };
    }
    if (action === 'commit-delete') {
      if (Number(payload.revision) !== assetState.snapshot.revision) throw new Error('Assets changed while deletion was being confirmed. Review the deletion again.');
      const plan = await assetRequest('plan-delete', payload), deleting = new Set(plan.all.map(assetKey));
      assetState.snapshot.assets = assetState.snapshot.assets.filter((asset) => !deleting.has(assetKey(asset)));
      assetState.snapshot.revision += 1;
      removeAssetInputInstances(deleting);
      rebaseCleanAssetInputInstances(assetState.snapshot.revision);
      renderAssetsEditor();
      return localAssetSnapshot();
    }
    throw new Error('Unknown Assets operation.');
  }

  function commitAssetPropertyCommand(command, refresh = applyAssetSnapshot) {
    if (!command || command.reason !== 'homology') throw new Error('Invalid Asset property command.');
    if (!command.sourceRef || !ASSET_KINDS.includes(command.sourceRef.kind) || !String(command.sourceRef.id || '')) throw new Error('Invalid Asset property command source.');
    if (!Number.isInteger(command.revision) || command.revision !== assetState.snapshot.revision) throw new Error('Asset property command is stale.');
    const source = assetByKey(assetKey(command.sourceRef));
    if (!source || source.kind !== command.sourceRef.kind) throw new Error('Asset property command source no longer exists.');
    if (!Array.isArray(command.changes)) throw new Error('Invalid Asset property changes.');
    const allowedOwners = assetDependencyClosure([assetKey(source)]), seen = new Set(), staged = [];
    for (const change of command.changes) {
      const ref = change?.ref, key = assetKey(ref), record = assetByKey(key);
      if (!ref || !ASSET_KINDS.includes(ref.kind) || !String(ref.id || '') || !record || record.kind !== ref.kind) throw new Error('Asset property command owner no longer exists.');
      if (!allowedOwners.has(key)) throw new Error('Asset property command owner is outside the source dependency graph.');
      if (seen.has(key)) throw new Error('Asset property command repeats an owner.');
      seen.add(key);
      const patch = change.propertiesPatch;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some((field) => !['set', 'unset'].includes(field))) throw new Error('Invalid Asset properties patch.');
      const set = patch.set || {}, unset = patch.unset || [];
      if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(unset) || new Set(unset).size !== unset.length) throw new Error('Invalid Asset properties patch.');
      const fields = [...Object.keys(set), ...unset], allowed = ASSET_PROPERTY_FIELDS_BY_KIND[ref.kind];
      if (fields.some((field) => !allowed?.has(field)) || Object.keys(set).some((field) => unset.includes(field))) throw new Error('Asset properties patch contains an unapproved field.');
      const next = cloneAssetProperties(record.properties);
      Object.entries(set).forEach(([field, value]) => { next[field] = cloneAssetPropertyValue(value); });
      unset.forEach((field) => { delete next[field]; });
      if (!propertyValueEqual(record.properties || {}, next)) staged.push({ record, next });
    }
    if (!staged.length) return false;
    staged.forEach(({ record, next }) => {
      record.properties = next;
      record.fingerprint = JSON.stringify({ name: record.name, type: record.type, data: record.data, dependencies: record.dependencies, properties: record.properties });
    });
    assetState.snapshot.revision += 1;
    // The command is validated and staged in full before this single atomic
    // mutation/refresh boundary.  Native projections never become owners.
    refresh(localAssetSnapshot(), command.sourceRef);
    return true;
  }
  function captureAndCommitAssetPropertyCommand(session, refresh = applyAssetSnapshot) {
    if (session?.kind === 'assets-property-slot') return handleAssetPropertySessionChange(session, session.bindingToken, refresh);
    if (!session || session.applyingAssets) return false;
    const command = session.editor?.captureAssetProperties?.();
    return command ? commitAssetPropertyCommand(command, refresh) : false;
  }

  function planAssetPropertySlotBinding(cardType, targetRef, coordinator = assetsCardState) {
    cardType=propertyCardType(cardType,targetRef?.kind);
    const card = ASSET_CARD_REGISTRY[cardType], slot = coordinator.slots.get(cardType);
    if (!card?.nativeCardKey || !slot) throw new Error('Unknown Assets Property Card.');
    const target = assetByKey(assetKey(targetRef));
    if (!target || target.kind !== targetRef?.kind) throw new Error('The selected Asset no longer exists.');
    if (!cardSupportsAsset(cardType, target.kind)) throw new Error(`${card.label} is not available for this Asset.`);
    const instanceKey = assetCardInstanceKey(targetRef, cardType);
    return {
      card, slot, target, instanceKey,
      instance: coordinator.instances.get(instanceKey) || createAssetCardInstance(targetRef, cardType),
      isNewInstance: !coordinator.instances.has(instanceKey)
    };
  }

  function updateAssetPropertySlotPresentation(slot, session, cardKey) {
    const presentation = session.editor?.getCardPresentation?.(cardKey);
    if (!presentation) return;
    slot.collapsed = !!presentation.collapsed;
    slot.pinned = !!presentation.pinned;
    slot.displayMode = presentation.displayMode || 'normal';
  }

  function updateAssetPropertyCardTitle(session, card, target) {
    const label=card.targetLabels?.[target.kind]||card.label;
    const mathTitle = `\\(${target.name}\\) · ${label}`;
    const plainTitle = `${target.plainName || target.name} · ${label}`;
    session.editor?.setCardLabel?.(card.nativeCardKey, mathTitle, plainTitle);
  }

  function applyAssetPropertyBindingProjection(session, slot, instance, snapshot, bindingToken) {
    const card = ASSET_CARD_REGISTRY[slot.cardType], target = assetByKey(assetKey(instance.targetRef));
    if (!target || !cardSupportsAsset(slot.cardType, target.kind)) throw new Error('The Property Card target is no longer compatible.');
    session.editor?.setBindingToken?.(bindingToken);
    const messages=window.MathWorkspaceDiagnostics?.messages(snapshot.diagnostics?.[assetKey(target)],snapshot.assets)||[];
    session.dependencyInvalid=!!messages.length;
    const shadow=session.editor?.inspectorShadow;
    if(shadow&&!session.dependencyWarning){
      session.dependencyWarning=document.createElement('section');session.dependencyWarning.className='card workspace-dependency-warning';session.dependencyWarning.setAttribute('role','status');
      (shadow.querySelector('.workspace-card-inspector')||shadow).prepend(session.dependencyWarning);
    }
    if(session.dependencyWarning){session.dependencyWarning.hidden=!messages.length;session.dependencyWarning.textContent='⚠ '+(target.plainName||target.name)+' · Needs repair: '+messages.join(' ');}
    if(messages.length){
      session.editor?.applyAssets?.({...snapshot,assets:[]},null,null);
      session.editor?.listCards?.().forEach(card=>session.editor?.setCardVisible?.(card.key,false));
      return;
    }
    const projected={...snapshot,assets:snapshot.assets.filter(asset=>snapshot.diagnostics?.[assetKey(asset)]?.valid!==false)};
    const applied = session.editor?.applyAssets?.(projected, instance.targetRef, null, {
      cardType: slot.cardType,
      instanceKey: instance.key
    });
    if (applied === false) throw new Error('The Property Card target could not be projected.');
    ASSET_PROPERTY_CARDS.forEach((cardKey) => session.editor?.setCardVisible?.(cardKey, cardKey === card.nativeCardKey && slot.visible));
    if (!session.editor?.focusAssetCard?.(card.nativeCardKey)) throw new Error('This property card is not available for the selected Asset.');
    if (!session.editor?.setCardVisible?.(card.nativeCardKey, slot.visible)) throw new Error('This property card could not be displayed.');
    session.editor?.setCardPresentation?.(card.nativeCardKey, {
      collapsed: !!slot.collapsed,
      pinned: !!slot.pinned,
      displayMode: slot.displayMode || 'normal'
    });
    updateAssetPropertyCardTitle(session, card, target);
  }

  function updateAssetPropertySlotOrder() {
    const host = $('#workspace-cards');
    if (!host) return;
    const children = Array.from(host.children);
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => {
      const slot = assetsCardState.slots.get(cardType);
      if (slot?.rendererSession) slot.order = children.indexOf(slot.rendererSession.inspectorHost);
    });
  }

  function bindAssetPropertySlot(cardType, targetRef, options = {}) {
    cardType=propertyCardType(cardType,targetRef?.kind);
    const coordinator = options.coordinator || assetsCardState;
    const plan = planAssetPropertySlotBinding(cardType, targetRef, coordinator);
    const slot = plan.slot, session = options.session || ensureAssetsPropertySlotSession(cardType), snapshot = options.snapshot || localAssetSnapshot();
    const oldState = {
      activeInstanceKey: slot.activeInstanceKey,
      recentInstanceKeys: slot.recentInstanceKeys.slice(),
      visible: slot.visible,
      collapsed: slot.collapsed,
      pinned: slot.pinned,
      displayMode: slot.displayMode,
      rendererSession: slot.rendererSession,
      boundInstanceKey: session.boundInstanceKey,
      bindingToken: session.bindingToken
    };
    const oldInstance = coordinator.instances.get(oldState.activeInstanceKey);
    if (slot.rendererSession && slot.rendererSession !== session) throw new Error('The Property Card Slot already has another renderer.');
    if (slot.retargeting || session.applyingAssets) throw new Error('The Property Card Slot is already changing target.');
    if (oldInstance) updateAssetPropertySlotPresentation(slot, session, plan.card.nativeCardKey);

    const bindingToken = `${plan.instanceKey}@${++coordinator.nextBindingToken}`;
    slot.retargeting = true;
    session.applyingAssets = true;
    try {
      slot.visible = true;
      applyAssetPropertyBindingProjection(session, slot, plan.instance, snapshot, bindingToken);
      plan.instance.derivedStale = false;
      if (plan.isNewInstance) coordinator.instances.set(plan.instanceKey, plan.instance);
      if (oldState.activeInstanceKey && oldState.activeInstanceKey !== plan.instanceKey) {
        slot.recentInstanceKeys = [oldState.activeInstanceKey, ...slot.recentInstanceKeys.filter((key) => key !== oldState.activeInstanceKey && key !== plan.instanceKey)];
      }
      slot.activeInstanceKey = plan.instanceKey;
      slot.rendererSession = session;
      slot.bindingEpoch += 1;
      session.boundInstanceKey = plan.instanceKey;
      session.bindingToken = bindingToken;
      // Deprecated observation only; no renderer or command reads these fields.
      assetState.propertySession = session;
      assetState.propertyRef = cloneAssetRef(plan.instance.targetRef);
      if (options.selectTarget !== false) {
        assetState.selected = new Set([assetKey(plan.instance.targetRef)]);
        assetState.anchor = assetKey(plan.instance.targetRef);
      }
    } catch (error) {
      slot.activeInstanceKey = oldState.activeInstanceKey;
      slot.recentInstanceKeys = oldState.recentInstanceKeys;
      slot.visible = oldState.visible;
      slot.collapsed = oldState.collapsed;
      slot.pinned = oldState.pinned;
      slot.displayMode = oldState.displayMode;
      slot.rendererSession = oldState.rendererSession;
      session.boundInstanceKey = oldState.boundInstanceKey;
      session.bindingToken = oldState.bindingToken;
      session.editor?.setBindingToken?.(oldState.bindingToken);
      if (oldInstance) {
        try { applyAssetPropertyBindingProjection(session, slot, oldInstance, snapshot, oldState.bindingToken); }
        catch (_) { session.editor?.setInspectorActive?.(false); }
      } else {
        ASSET_PROPERTY_CARDS.forEach((cardKey) => session.editor?.setCardVisible?.(cardKey, false));
        session.editor?.setInspectorActive?.(false);
      }
      throw error;
    } finally {
      session.applyingAssets = false;
      slot.retargeting = false;
    }

    if (options.promote !== false) {
      session.editor?.prioritizeCard?.(plan.card.nativeCardKey);
      promoteInspectorCard(session.inspectorHost);
    }
    updateAssetPropertySlotOrder();
    if (options.render !== false) {
      assetsCardState.outerRefreshCount += 1;
      renderAssets();
      renderInspector();
    }
    if (options.focus !== false) session.editor?.focusCard?.(plan.card.nativeCardKey);
    return plan.instance;
  }

  function handleAssetPropertySessionChange(session, emittedBindingToken, refresh = applyAssetSnapshot, coordinator = assetsCardState) {
    if (!session || session.applyingAssets || session.dependencyInvalid) return false;
    const change = emittedBindingToken && typeof emittedBindingToken === 'object'
      ? emittedBindingToken
      : { bindingToken: emittedBindingToken };
    emittedBindingToken = change.bindingToken;
    const slot = coordinator.slots.get(session.cardType);
    if (!slot || slot.retargeting || emittedBindingToken !== session.bindingToken) return false;
    if (change.interaction === 'card-chrome') {
      const syncChrome = () => {
        if (slot.rendererSession && slot.rendererSession !== session) return;
        updateAssetPropertySlotPresentation(slot, session, ASSET_CARD_REGISTRY[session.cardType].nativeCardKey);
        const cardEntry = session.editor?.listCards?.().find((entry) => entry.key === ASSET_CARD_REGISTRY[session.cardType].nativeCardKey);
        if (cardEntry) slot.visible = !!cardEntry.visible;
        if (coordinator === assetsCardState) {
          renderInspector();
          if (!$('#workspace-card-picker')?.hidden) renderCardPicker();
          refreshWorkspaceOwnedCardChrome();
        }
      };
      syncChrome();
      if (coordinator === assetsCardState) setTimeout(syncChrome, 0);
      return false;
    }
    if (!session.boundInstanceKey || slot.activeInstanceKey !== session.boundInstanceKey) return false;
    const instance = coordinator.instances.get(session.boundInstanceKey);
    if (!instance || instance.cardType !== session.cardType) return false;
    const command = session.editor?.captureAssetProperties?.();
    if (!command) return false;
    if (assetKey(command.sourceRef) !== assetKey(instance.targetRef)) return false;
    return commitAssetPropertyCommand(command, refresh);
  }

  function assetPropertyInstanceAffected(instance, affectedAssetKeys) {
    if (!affectedAssetKeys?.size) return true;
    return [...assetDependencyClosure([assetKey(instance.targetRef)])].some((key) => affectedAssetKeys.has(key));
  }
  function markAffectedAssetPropertyInstances(affectedAssetKeys, coordinator = assetsCardState) {
    if (!affectedAssetKeys?.size) return;
    for (const instance of coordinator.instances.values()) {
      if (instance.cardType !== 'input' && assetPropertyInstanceAffected(instance, affectedAssetKeys)) instance.derivedStale = true;
    }
  }
  function reprojectActiveAssetPropertySlots(snapshot, options = {}, coordinator = assetsCardState) {
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => {
      const slot = coordinator.slots.get(cardType), session = slot?.rendererSession;
      const instance = coordinator.instances.get(slot?.activeInstanceKey);
      if (!slot?.visible || !session || !instance || (options.onlyStale && !instance.derivedStale)) return;
      session.applyingAssets = true;
      try { applyAssetPropertyBindingProjection(session, slot, instance, snapshot, session.bindingToken); }
      catch (error) { status(error?.message || String(error), 'error'); }
      finally { session.applyingAssets = false; }
      instance.derivedStale = false;
    });
  }

  function pruneAssetPropertyBindings(present) {
    for (const [key, instance] of assetsCardState.instances) {
      if (!present.has(assetKey(instance.targetRef))) {
        if (instance.cardType === 'input') { instance.deleted = true; cancelAssetInputAutosave(instance); }
        assetsCardState.instances.delete(key);
      }
    }
    if (assetState.activeInputInstanceKey && !assetsCardState.instances.has(assetState.activeInputInstanceKey)) {
      assetState.activeInputInstanceKey = null; assetsCardState.slots.get('input').activeInstanceKey = null; assetState.editorMode = 'modify';
    }
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => {
      const slot = assetsCardState.slots.get(cardType);
      slot.recentInstanceKeys = slot.recentInstanceKeys.filter((key) => assetsCardState.instances.has(key));
      if (slot.activeInstanceKey && !assetsCardState.instances.has(slot.activeInstanceKey)) {
        slot.activeInstanceKey = null;
        slot.visible = false;
        if (slot.rendererSession) {
          slot.rendererSession.boundInstanceKey = null;
          slot.rendererSession.bindingToken = null;
          slot.rendererSession.editor?.setBindingToken?.(null);
          slot.rendererSession.editor?.setInspectorActive?.(false);
        }
      }
    });
  }

  function removeAssetInputInstances(deleting, coordinator = assetsCardState) {
    const keys = deleting instanceof Set ? deleting : new Set(deleting || []);
    for (const [key, instance] of coordinator.instances) {
      if (instance.cardType !== 'input' || !keys.has(assetKey(instance.targetRef))) continue;
      instance.deleted = true; cancelAssetInputAutosave(instance, coordinator); coordinator.instances.delete(key);
    }
    const slot = coordinator.slots.get('input');
    if (slot?.activeInstanceKey && !coordinator.instances.has(slot.activeInstanceKey)) slot.activeInstanceKey = null;
    if (coordinator === assetsCardState && assetState.activeInputInstanceKey && !coordinator.instances.has(assetState.activeInputInstanceKey)) {
      assetState.activeInputInstanceKey = null; assetState.editorMode = 'modify';
    }
  }

  function applyAssetSnapshot(snapshot, activeRef = null, options = {}) {
    if (!snapshot || !Array.isArray(snapshot.assets)) return;
    const now = Date.now(), present = new Set();
    snapshot.assets.forEach((asset) => {
      const key = assetKey(asset); present.add(key); const previous = assetState.metadata.get(key);
      if (!previous) assetState.metadata.set(key, { createdAt: now, modifiedAt: now, order: ++assetState.creationCounter, fingerprint: asset.fingerprint });
      else if (previous.fingerprint !== asset.fingerprint) Object.assign(previous, { modifiedAt: now, fingerprint: asset.fingerprint });
    });
    Array.from(assetState.metadata.keys()).forEach((key) => { if (!present.has(key)) assetState.metadata.delete(key); });
    assetState.selected = new Set(Array.from(assetState.selected).filter((key) => present.has(key)));
    if (!present.has(assetState.anchor)) assetState.anchor = '';
    if (!present.has(assetState.renameKey)) assetState.renameKey = '';
    if (assetState.propertyRef && !present.has(assetKey(assetState.propertyRef))) assetState.propertyRef = null;
    assetState.snapshot = snapshot;
    synchronizeVarietyAssets();
    rebaseCleanAssetInputInstances(snapshot.revision);
    pruneAssetPropertyBindings(present);
    markAffectedAssetPropertyInstances(options.affectedAssetKeys);
    reprojectActiveAssetPropertySlots(localAssetSnapshot(), { onlyStale: !!options.affectedAssetKeys?.size });
    syncAssetProjectionSessions();
    renderAssets(); renderInspector();
    syncAssetInputDerivedFields();
    objectWorkspace?.refresh(localAssetSnapshot());
    scheduleDefaultCleanup();
  }

  function defaultAssetRoots() {
    const roots = new Set(), add = key => { if (typeof key === 'string' && key) roots.add(key); };
    // Hidden panels retain their saved bindings so reopening remains lossless.
    for (const panel of objectWorkspace?.panels.values() || []) {
      add(panel.assetKey);
      Object.values(panel.computation?.refs || {}).flat().forEach(add);
    }
    // Current slot bindings survive hiding; historical instances are caches.
    for (const slot of assetsCardState.slots.values()) {
      const instance = assetsCardState.instances.get(slot.activeInstanceKey);
      if (instance?.targetRef) add(assetKey(instance.targetRef));
    }
    for (const instance of assetsCardState.instances.values()) if (instance.dirty) {
      if (instance.targetRef) add(assetKey(instance.targetRef));
      const draft = instance.draft;
      if (draft) { try { referenceKeys(draft.kind, draft.type, draft.data).forEach(add); } catch (_) { /* Keep the model dependency closure for incomplete drafts. */ } }
    }
    for (const session of sessions.values()) for (const key of session.assetProjection?.keys || []) add(key);
    return roots;
  }
  function collectUnusedDefaults() {
    if (restoringWorkspace || collectingDefaults || !objectWorkspace) return;
    const unused = new Set(window.MathWorkspaceDefaults.unusedDefaultKeys(assetState.snapshot.assets, defaultAssetRoots()));
    if (!unused.size) return;
    collectingDefaults = true;
    try {
      assetState.snapshot.assets = assetState.snapshot.assets.filter(asset => !unused.has(assetKey(asset)));
      assetState.snapshot.revision += 1;
      removeAssetInputInstances(unused);
      applyAssetSnapshot(localAssetSnapshot(), null, { affectedAssetKeys: unused });
    } finally { collectingDefaults = false; }
  }
  function scheduleDefaultCleanup() {
    if (!objectWorkspace || restoringWorkspace || collectingDefaults || defaultCleanupQueued) return;
    defaultCleanupQueued = true;
    // Finish the current binding/creation transaction before examining owners.
    // This runs before the next user event, without a debounce or timer delay.
    Promise.resolve().then(() => { defaultCleanupQueued = false; collectUnusedDefaults(); });
  }

  function assetDependencyClosure(keys) {
    const pending = [...keys], closure = new Set();
    while (pending.length) {
      const key = pending.pop();
      if (closure.has(key)) continue;
      const asset = assetByKey(key); if (!asset) continue;
      closure.add(key);
      (asset.dependencies || []).forEach((ref) => pending.push(assetKey(ref)));
    }
    return closure;
  }
  function captureSheafComplexLayout(session) {
    if (!session?.assetProjection) return;
    let activeRef = null;
    for (const entry of session.editor.captureAssetLayout?.() || []) {
      if (!session.assetProjection.keys.has(entry.key)) continue;
      if (entry.active) activeRef = assetRefFromKey(entry.key);
      if (!Number.isFinite(entry.point?.x) || !Number.isFinite(entry.point?.y)) continue;
      session.assetProjection.layout.set(entry.key, { ...entry.point, x: entry.point.x, y: entry.point.y });
    }
    session.assetProjection.activeRef = activeRef;
  }
  function projectAssetsToSheafComplex(session, activeRef = undefined) {
    if (!session?.assetProjection) return false;
    const projectedActiveRef = activeRef === undefined ? session.assetProjection.activeRef : activeRef;
    if (activeRef !== undefined) session.assetProjection.activeRef = activeRef ? { kind: activeRef.kind, id: activeRef.id } : null;
    const present = new Set(assetState.snapshot.assets.map(assetKey));
    session.assetProjection.keys = new Set([...assetDependencyClosure(session.assetProjection.keys)].filter((key) => present.has(key)));
    const diagnostics=assetDiagnostics();
    const assets = assetState.snapshot.assets.filter((asset) => session.assetProjection.keys.has(assetKey(asset))&&diagnostics[assetKey(asset)]?.valid!==false);
    const messages=[...new Set([...session.assetProjection.keys].flatMap(key=>window.MathWorkspaceDiagnostics?.messages(diagnostics[key],assetState.snapshot.assets)||[]))];
    if(!session.projectionWarning&&session.editor.shadow){
      session.projectionWarning=document.createElement('p');session.projectionWarning.className='err';session.projectionWarning.setAttribute('role','status');session.projectionWarning.style.padding='8px';
      (session.editor.shadow.querySelector('.editor-body')||session.editor.shadow).prepend(session.projectionWarning);
    }
    if(session.projectionWarning){session.projectionWarning.hidden=!messages.length;session.projectionWarning.textContent='⚠ Some inputs need repair: '+messages.join(' ');}
    const snapshot = { ...localAssetSnapshot(), assets: assets.map((asset) => ({ ...asset, viewPosition: session.assetProjection.layout.get(assetKey(asset)) || presentation.layout(viewDefaultsFor(asset).sheaf) })) };
    session.applyingAssets = true;
    try {
      session.editor.applyAssets?.(snapshot, projectedActiveRef&&diagnostics[assetKey(projectedActiveRef)]?.valid!==false?projectedActiveRef:null, null);
      if (activeRef !== undefined) session.editor.setCanvasAppearanceTarget?.(activeRef, { source: 'canvas' });
      // These cards are meaningful only with an Asset ref.  Leave their UI
      // session intact, but never display an unbound calculator copy.
      ASSET_PROPERTY_CARDS.forEach((cardKey) => session.editor.setCardVisible?.(cardKey, false));
    } finally { session.applyingAssets = false; }
    captureSheafComplexLayout(session);
    return true;
  }
  function syncAssetProjectionSessions() {
    sessions.forEach((session) => { if (session.assetProjection) projectAssetsToSheafComplex(session); });
  }
  function collectSheafComplexAssets(session) {
    if (!session?.assetProjection) { status('This Sheaf Complex session cannot receive Assets yet.', 'error'); return; }
    const roots = assetState.snapshot.assets.map(assetKey);
    if (!roots.length) { status('There are no Assets to show on this canvas.', 'error'); return; }
    session.assetProjection.keys = assetDependencyClosure(roots);
    projectAssetsToSheafComplex(session);
    const displayed = session.assetProjection.keys.size;
    selectCanvasTab('sheaf-complexes');
    status(`Displayed ${displayed} Asset object${displayed === 1 ? '' : 's'} on the Sheaf Complex canvas.`, 'success');
  }
  function sheafComplexDropAllowed(session, key) {
    return !!(splitView && session?.assetProjection && visibleCanvasIds().includes('assets') && visibleCanvasIds().includes('sheaf-complexes') && assetByKey(key));
  }
  function bindSheafComplexAssetDrop(session) {
    const host = session?.host; if (!host || host.dataset.workspaceAssetDropReady) return;
    host.dataset.workspaceAssetDropReady = 'true';
    const dropKey = (event) => referenceDragKey(event.dataTransfer);
    const setState = (state = '') => { if (state) host.dataset.assetDrop = state; else delete host.dataset.assetDrop; };
    host.addEventListener('dragenter', (event) => { setState(sheafComplexDropAllowed(session, dropKey(event)) ? 'valid' : 'invalid'); });
    host.addEventListener('dragover', (event) => {
      const valid = sheafComplexDropAllowed(session, dropKey(event)); setState(valid ? 'valid' : 'invalid');
      if (valid) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; }
    });
    host.addEventListener('dragleave', (event) => { if (!host.contains(event.relatedTarget)) setState(); });
    host.addEventListener('drop', (event) => {
      const key = dropKey(event); if (!sheafComplexDropAllowed(session, key)) { setState('invalid'); return; }
      event.preventDefault(); setState();
      const [kind, id] = key.split(':'), rect = host.getBoundingClientRect();
      const point = session.editor.assetPositionFromClient?.(event.clientX, event.clientY) || { x: Math.max(.08, Math.min(.92, (event.clientX - rect.left) / Math.max(1, rect.width))), y: Math.max(.08, Math.min(.92, (event.clientY - rect.top) / Math.max(1, rect.height))) };
      assetDependencyClosure([key]).forEach((dependency) => session.assetProjection.keys.add(dependency));
      session.assetProjection.layout.set(key, point);
      projectAssetsToSheafComplex(session, { kind, id });
      status(`Added ${assetByKey(key)?.plainName || assetByKey(key)?.name || 'asset'} to the Sheaf Complex canvas.`, 'success');
    });
    host.addEventListener('dragend', () => setState());
  }

  function orderedAssets() {
    const entries = assetState.snapshot.assets.filter(asset => assetState.showDefaults || !asset.isDefault), direction = assetState.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    entries.sort((left, right) => {
      const lm = assetState.metadata.get(assetKey(left)) || {}, rm = assetState.metadata.get(assetKey(right)) || {};
      let compared = 0;
      if (assetState.sort === 'name') compared = collator.compare(left.plainName || left.name, right.plainName || right.name);
      else if (assetState.sort === 'type') compared = collator.compare(left.typeLabel, right.typeLabel);
      else if (assetState.sort === 'modified') compared = (lm.modifiedAt || 0) - (rm.modifiedAt || 0);
      else compared = (lm.order || 0) - (rm.order || 0);
      return compared ? compared * direction : (lm.order || 0) - (rm.order || 0);
    });
    return entries;
  }

  const formatAssetTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  function syncAssetWarning(asset,item) {
    const key=assetKey(asset),diagnostic=assetDiagnostics()[key],instance=assetInputInstanceForRef(assetRef(asset));
    const messages=window.MathWorkspaceDiagnostics?.messages(diagnostic,assetState.snapshot.assets)||[];
    if(instance?.dirty&&instance.validation?.valid===false)messages.push('Unsaved draft: '+instance.validation.message);
    if(instance?.conflictState)messages.push('Unsaved edits conflict with the saved version.');
    item.querySelector('.workspace-asset-warning')?.remove();
    item.setAttribute('aria-label',`${asset.plainName||asset.name}, ${asset.typeLabel}${asset.isDefault?', Default asset':''}`);
    if(!messages.length){delete item.dataset.validation;return;}
    const message='Needs repair: '+messages.join(' '),warning=Object.assign(document.createElement('span'),{className:'workspace-asset-warning',textContent:'⚠',title:message});
    warning.setAttribute('role','img');warning.setAttribute('aria-label',message);item.dataset.validation='invalid';
    item.setAttribute('aria-label',item.getAttribute('aria-label')+'. '+message);item.querySelector('.workspace-asset-icon')?.append(warning);
  }
  function createAssetItem(asset) {
    const key = assetKey(asset), meta = assetState.metadata.get(key) || {}, item = document.createElement('div');
    item.className = `workspace-asset-item workspace-asset-${asset.kind}`; item.dataset.assetKey = key; item.dataset.assetKind = asset.kind; item.dataset.assetId = asset.id;
    if (asset.isDefault) item.dataset.defaultAsset = 'true';
    item.draggable = true;
    item.setAttribute('role', assetState.layout === 'details' ? 'row' : 'option'); item.setAttribute('aria-selected', String(assetState.selected.has(key)));
    item.setAttribute('aria-label', `${asset.plainName || asset.name}, ${asset.typeLabel}${asset.isDefault ? ', Default asset' : ''}`); item.tabIndex = assetState.selected.has(key) ? 0 : -1;
    const icon = window.MathWorkspaceAssetIcons.render(asset, assetByKey);
    const name = Object.assign(document.createElement('span'), { className: 'workspace-asset-name', title: asset.name, textContent: `\\(${asset.name}\\)` });
    const type = Object.assign(document.createElement('span'), { className: 'workspace-asset-type', textContent: asset.typeLabel + (asset.isDefault ? ' · Default' : '') });
    const definition = Object.assign(document.createElement('span'), { className: 'workspace-asset-definition', textContent: asset.definition || asset.typeLabel });
    const modified = Object.assign(document.createElement('time'), { className: 'workspace-asset-modified', textContent: formatAssetTime(meta.modifiedAt) });
    if (assetState.renameKey === key) {
      const input = Object.assign(document.createElement('input'), { className: 'workspace-asset-rename', value: asset.name }); input.setAttribute('aria-label', `Rename ${asset.plainName || asset.name}`);
      input.addEventListener('click', (event) => event.stopPropagation()); input.addEventListener('keydown', handleRenameKeydown); input.addEventListener('blur', () => commitAssetRename(key, input.value)); name.replaceChildren(input);
    }
    item.append(icon, name, type, definition, modified);
    syncAssetWarning(asset,item);
    item.addEventListener('click', handleAssetClick);
    item.addEventListener('dblclick', handleAssetDoubleClick);
    item.addEventListener('dragstart', (event) => {
      assetState.draggedAssetKey = key;
      event.dataTransfer?.setData(ASSET_DRAG_TYPE, JSON.stringify(assetRef(asset)));
      event.dataTransfer?.setData('text/plain', asset.plainName || asset.name);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    });
    item.addEventListener('dragend', () => { assetState.draggedAssetKey = ''; document.querySelectorAll('[data-drop-state]').forEach((target) => { delete target.dataset.dropState; }); });
    return item;
  }

  function openAssetsCreationPicker() { closeAssetsContextMenu(); creationPicker.open(); }

  function renderAssets() {
    renderCardPicker();
    if (!assetState.view) return;
    const content = assetState.view.querySelector('[data-assets-content]'), entries = orderedAssets();
    const hiddenDefaults = assetState.showDefaults ? 0 : assetState.snapshot.assets.filter(asset => asset.isDefault).length;
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${hiddenDefaults ? ` · ${hiddenDefaults} default${hiddenDefaults === 1 ? '' : 's'} hidden` : ''}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    content.dataset.layout = assetState.layout; content.dataset.assetsEmpty = !assetState.ready ? 'loading' : !entries.length ? 'empty' : 'false'; content.replaceChildren();
    content.setAttribute('role', entries.length ? 'listbox' : 'group');
    if (entries.length) content.setAttribute('aria-multiselectable', 'true'); else content.removeAttribute('aria-multiselectable');
    if (!assetState.ready) { content.appendChild(Object.assign(document.createElement('p'), { className: 'workspace-assets-empty', textContent: 'Loading Assets…' })); return; }
    if (!entries.length) {
      const empty = Object.assign(document.createElement('div'), { className: 'workspace-assets-empty' });
      empty.innerHTML = '<strong>This Assets view is empty.</strong><button type="button" class="btn workspace-assets-create" data-assets-create aria-haspopup="dialog">New object</button><span>You can also right-click here to create a mathematical object.</span>';
      empty.querySelector('[data-assets-create]').addEventListener('click', openAssetsCreationPicker);
      window.MathWorkspaceEmptyCreateLab?.decorate(empty);
      content.appendChild(empty); return;
    }
    if (assetState.layout === 'details') {
      const header = Object.assign(document.createElement('div'), { className: 'workspace-assets-details-header' }); header.setAttribute('role', 'row');
      ['Name', 'Type', 'Definition', 'Date modified'].forEach((label) => header.appendChild(Object.assign(document.createElement('span'), { textContent: label }))); content.appendChild(header);
    }
    entries.forEach((asset) => content.appendChild(createAssetItem(asset)));
    const rename = content.querySelector('.workspace-asset-rename'); if (rename) { rename.focus(); rename.select(); }
    if (!assetState.renameKey && window.MathJax?.typesetPromise) { window.MathJax.typesetClear?.([content]); window.MathJax.typesetPromise([content]).then(() => window.MathWorkspaceAssetIcons.typeset(content)).catch(() => {}); }
  }

  function selectAssetKey(key, event = {}) {
    const keys = orderedAssets().map(assetKey), additive = !!(event.ctrlKey || event.metaKey);
    if (event.shiftKey && assetState.anchor && keys.includes(assetState.anchor)) {
      const start = keys.indexOf(assetState.anchor), end = keys.indexOf(key), range = keys.slice(Math.min(start, end), Math.max(start, end) + 1);
      assetState.selected = additive ? new Set([...assetState.selected, ...range]) : new Set(range);
    } else if (additive) {
      if (assetState.selected.has(key)) assetState.selected.delete(key); else assetState.selected.add(key);
      assetState.anchor = key;
    } else {
      assetState.selected = new Set([key]); assetState.anchor = key;
    }
    assetState.renameKey = ''; syncAssetSelectionDom();
    if (assetState.selected.size === 1) objectWorkspace?.selectAsset([...assetState.selected][0]);
  }

  function syncAssetSelectionDom() {
    renderCardPicker();
    if (!assetState.view) return;
    const entries = orderedAssets();
    const hiddenDefaults = assetState.showDefaults ? 0 : assetState.snapshot.assets.filter(asset => asset.isDefault).length;
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${hiddenDefaults ? ` · ${hiddenDefaults} default${hiddenDefaults === 1 ? '' : 's'} hidden` : ''}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => {
      const selected = assetState.selected.has(item.dataset.assetKey);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  }

  function handleAssetClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (item && !event.target.closest('input')) selectAssetKey(item.dataset.assetKey, assetState.touchMultiSelect && (event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents) ? { ctrlKey: true } : event);
  }
  function handleAssetDoubleClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (!item || event.target.closest('input') || assetState.touchMultiSelect && (event.workspaceTouch || event.pointerType === 'touch' || event.sourceCapabilities?.firesTouchEvents)) return;
    assetState.selected = new Set([item.dataset.assetKey]); assetState.anchor = item.dataset.assetKey; renderAssets(); openSelectedAsset();
  }
  const selectedAssetRecords = () => orderedAssets().filter((asset) => assetState.selected.has(assetKey(asset)));

  function revealAssetsEditor() {
    assetState.cards.input = true;
    selectInspectorSource('assets');
    const record = ensureAssetsEditor(true);
    promoteInspectorCard(record.card);
    renderInspector();
    record.card.scrollIntoView?.({ block: 'nearest' });
    return record;
  }

  // The card requested by an Assets action should be the first thing the
  // user sees in the independent workspace Inspector.  Keep this ownership
  // local to the workspace instead of changing historical calculator cards.
  function promoteInspectorCard(card) {
    const parent = card?.parentElement;
    if (parent && parent.firstElementChild !== card) parent.insertBefore(card, parent.firstElementChild);
  }

  function focusPaneBesideAssets() {
    const assetsPane = ['primary','secondary'].find(name => paneCanvases[name] === 'assets' && (splitView || name === 'primary'));
    if (assetsPane) { splitView = true; focusedPane = otherPane(assetsPane); }
  }
  async function openSelectedAsset() {
    const selected=selectedAssetRecords();if(selected.length!==1)return;
    const asset=selected[0],type=window.MathWorkspaceObjects.capabilityFor(asset).open;
    closeAssetsContextMenu();
    if (!objectWorkspace) return;
    // Build the display first, then place it beside Assets. Sidebar Assets
    // already remains visible, so preserve that placement and the current split.
    const panel = objectWorkspace.openOverview(type,assetKey(asset));
    if(panel.location==='side'&&!panel.closed){objectWorkspace.reveal(panel);return;}
    focusPaneBesideAssets();
    if (panel.location === 'main') selectCanvasTab(panel.id);
    else objectWorkspace.move(panel,'main');
  }
  async function modifySelectedAsset() {
    const selected = selectedAssetRecords();
    if (selected.length !== 1) return;
    closeAssetsContextMenu();
    return modifyAsset(selected[0]);
  }
  async function modifyAsset(asset) {
    if (!asset) return;
    const modifyType=window.MathWorkspaceObjects.capabilityFor(asset)?.modify;
    if (modifyType) { const existing=objectWorkspace?.find(modifyType,assetKey(asset));if(existing)return objectWorkspace.reveal(existing);focusPaneBesideAssets(); return objectWorkspace?.open(modifyType, assetKey(asset), 'main'); }
    revealAssetsEditor();
    try {
      await assetRequest('select-for-modify', { ref: assetRef(asset) });
      status(`Editing ${asset.plainName || asset.name}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }

  function openAssetProperty(cardType, contextTargetRef = assetState.contextTargetRef) {
    cardType=propertyCardType(cardType,contextTargetRef?.kind);
    const ref = cloneAssetRef(contextTargetRef), asset = assetByKey(assetKey(ref)), card = ASSET_CARD_REGISTRY[cardType];
    closeAssetsContextMenu();
    try {
      if (!asset || !card?.nativeCardKey) throw new Error('The context Asset no longer exists.');
      bindAssetPropertySlot(cardType, ref);
      status(`Showing ${card.targetLabels?.[asset.kind]||card.label} for ${asset.plainName || asset.name}.`, 'success');
    } catch (error) { status(error?.message || String(error), 'error'); }
  }
  function assetPropertiesMenuItems(contextTargetRef = assetState.contextTargetRef) {
    const target = assetByKey(assetKey(contextTargetRef));
    if (!target) return [menuButton('Choose one object', () => {}, { disabled: true })];
    const capturedRef = cloneAssetRef(contextTargetRef);
    const capturedKey = assetKey(target);
    const items = [];
    for(const suggestion of (panelCatalog?.suggest([capturedKey],assetState.snapshot.assets) || []).filter(item=>item.role==='property')) items.push(menuButton(suggestion.label,()=>{
      closeAssetsContextMenu();
      if(suggestion.route==='assets')openAssetProperty(suggestion.cardType,capturedRef);
      else objectWorkspace?.open(suggestion.id,'','side',{refs:suggestion.refs,rule:suggestion.rule});
    }));
    return items;
  }

  const reservedAssetNames = new Set();
  function uniqueDefaultAssetName(kind, type = '', currentKey = '', data = {}) {
    const base = ({knot:'K','dual-graph':'G',filtration:'F',complex:'C', 'field-extension':'L/K','mosaic-space':'S','mosaic-diagram':'D',number:'a',field:'R',frame:'F',polytope:'P',sphere:'S',point:'p',vector:'v',roots:'R',lattice:'L',voronoi:'V',formula:'Z',tropical:'T',weyl:'W',cone:'\\sigma',fan:'\\Sigma'})[kind] || (kind === 'dynkin' ? '\\Delta' : kind === 'strands' ? 'w' : kind === 'matrix' ? 'A' : kind === 'category' ? '\\mathcal{C}' : kind === 'functor' ? 'F' : kind === 'young' ? '\\lambda' : kind === 'lie' ? '\\mathfrak{g}' : kind === 'variety' ? defaultVarietyName(type, data) : kind === 'sheaf' ? '\\mathcal{E}' : 'f');
    // Index the whole expression for subscripted and compound variety names.
    const grouped = kind === 'variety' && GROUPED_VARIETY_COPY_NAMES.has(type);
    const numberedBase = grouped ? `(${base})` : base;
    const numbered = (number) => kind === 'sheaf' ? `\\mathcal{E}_{${number}}` : `${numberedBase}_{${number}}`;
    const isTaken = (candidate) => reservedAssetNames.has(canonicalAssetName(candidate)) || assetState.snapshot.assets.some((asset) => assetKey(asset) !== currentKey && canonicalAssetName(asset.name) === canonicalAssetName(candidate));
    const current = currentKey && assetByKey(currentKey);
    if (current && current.autoName === current.name && (current.name === base || current.name.startsWith(numberedBase + '_{') && /^_\{[1-9]\d*\}$/.test(current.name.slice(numberedBase.length)))) return current.name;
    if (grouped && current && current.autoName === current.name && current.name.startsWith(base + '_{')) {
      const suffix = current.name.slice(base.length), repaired = numberedBase + suffix;
      if (/^_\{[1-9]\d*\}$/.test(suffix) && !isTaken(repaired)) return repaired;
    }
    let name = base, number = 2;
    while (isTaken(name)) name = numbered(number++);
    return name;
  }
  function createDefaultAsset(kind, options = {}) {
    const type = options.type || ASSET_SUBTYPES[kind][0][0];
    if (!ASSET_SUBTYPES[kind].some(([value]) => value === type)) throw new Error('Unsupported object subtype.');
    const firstVariety = assetState.snapshot.assets.find((asset) => asset.kind === 'variety');
    const source = options.data || (firstVariety && kind === 'sheaf' && isDirectSheafType(type) ? { base: assetKey(firstVariety) } : firstVariety && kind === 'map' && type === 'ordinary' ? { domain: assetKey(firstVariety), codomain: assetKey(firstVariety) } : {});
    const supplied = options.defaults === false ? source : window.MathWorkspaceDefaults.assetData(kind, type, source, ensureDefaultDependency);
    const data = normalizedAssetData(kind, type, supplied);
    if (options.defaults !== false) validateAssetData(kind, type, data, '');
    const prefix = { field: 'R', dynkin: 'D', strands: 'W', matrix: 'A', category: 'C', functor: 'F', young: 'Y', lie: 'L', variety: 'X', sheaf: 'E', map: 'M' }[kind] || kind.charAt(0).toUpperCase();
    const name = options.name || uniqueDefaultAssetName(kind, type, '', data);
    const record = { id: `${prefix}${++assetState.nextObjectId}`, kind, name, ...(kind === 'variety' ? { autoName: options.name ? '' : name } : {}), type, data, ...(options.isDefault ? { isDefault: true } : {}) };
    const view=options.view||presentation.split(kind,supplied).view;if(Object.keys(view).length)viewDefaults.set(assetKey(record),JSON.parse(JSON.stringify(view)));
    record.plainName = plainAssetName(record.name);
    record.typeLabel = ASSET_SUBTYPES[kind].find(([value]) => value === type)?.[1] || kind;
    record.dependencies = assetDependencies(kind, type, data);
    record.definition = assetDefinitionFor(kind, type, data);
    record.fingerprint = JSON.stringify({ name: record.name, type, data, dependencies: record.dependencies });
    assetState.snapshot.assets.push(record);
    assetState.snapshot.revision += 1;
    assetState.snapshot.capabilities = localAssetSnapshot().capabilities;
    if (options.select !== false) {
      assetState.selected = new Set([assetKey(record)]);
      assetState.anchor = assetKey(record);
    }
    if (options.bindInput !== false) bindAssetInputInstance(assetRef(record), { flush: false, render: false });
    rebaseCleanAssetInputInstances(assetState.snapshot.revision);
    return record;
  }
  function ensureDefaultDependency(kind, options = {}) {
    scheduleDefaultCleanup();
    const type = options.type || ASSET_SUBTYPES[kind][0][0];
    const source = window.MathWorkspaceDefaults.assetData(kind, type, options.data || {}, ensureDefaultDependency);
    const data = normalizedAssetData(kind, type, source);
    const existing = assetState.snapshot.assets.find(asset => asset.kind === kind && asset.type === type && JSON.stringify(normalizedAssetData(kind, type, asset.data)) === JSON.stringify(data));
    return existing || createDefaultAsset(kind, { type, data, defaults: false, isDefault: true, select: false, bindInput: false });
  }
  function creationDependencies(kind) {
    const type = ASSET_SUBTYPES[kind][0][0], requested = [];
    // Inspect the constructor without creating defaults or changing the workspace.
    const template = window.MathWorkspaceDefaults.assetData(kind, type, {}, (parentKind, options) => {
      const ref = { kind: parentKind, id: 'creation-preview-' + requested.length };
      requested.push({ key: assetKey(ref), kind: parentKind, options });
      return ref;
    });
    const normalized = normalizedAssetData(kind, type, {});
    const specs = slicing?.isAsset({kind,type}) || kind === 'matrix'
      ? slicing.references({kind,type,data:normalized}) : referenceFieldSpecs(kind,type);
    return Object.entries(template).flatMap(([field, value]) => {
      const request = requested.find(item => item.key === value);
      if (!request) return [];
      const candidates = assetState.snapshot.assets.filter(asset => {
        if (asset.kind !== request.kind || asset.isDefault) return false;
        if (specs.some(spec => spec.field === field && spec.requiresField) && !window.MathWorkspaceRings.isField(asset)) return false;
        if (['roots','weyl','voronoi'].includes(kind)) {
          const dimension = request.kind === 'lie' ? asset.data.rank : asset.data.ambientDimension;
          if (dimension !== normalized.ambientDimension) return false;
        }
        return true;
      }).map(asset => ({key:assetKey(asset),label:(asset.plainName || asset.name)+' · '+asset.typeLabel}));
      return candidates.length ? [{field,label:specs.find(spec=>spec.field===field)?.label || field,candidates}] : [];
    });
  }
  async function createAsset(kind, options = {}) {
    if (OBJECT_INPUT_KINDS.includes(kind)) {
      closeAssetsContextMenu(); const record = createObjectAsset(kind, options); const panel=objectWorkspace?.open(`${kind}-input`, assetKey(record), 'side'); return ()=>panel?.name?.focus();
    }
    closeAssetsContextMenu(); revealAssetsEditor();
    try {
      flushAssetInputInstance(activeAssetInputInstance());
      const record = createObjectAsset(kind, options);
      bindAssetInputInstance(assetRef(record), { flush: false, render: false });
      renderAssetsEditor();
      editorForm()?.querySelector('[data-assets-name]')?.focus();
      status(`Created ${record.plainName || record.name}. Edit it in the Input card.`, 'success');
      return ()=>editorForm()?.querySelector('[data-assets-name]')?.focus();
    } catch (error) { status(error.message, 'error'); return null; }
  }
  function updateObjectAsset(ref, patch = {}) {
    const record = assetByKey(assetKey(ref));
    if (!record) throw new Error('The referenced asset no longer exists.');
    const name = String(patch.name ?? record.name).trim(), type = patch.type || record.type;
    if (!name || !balancedLatex(name)) throw new Error('Enter a complete asset name.');
    if (assetState.snapshot.assets.some(asset => asset.id !== record.id && canonicalAssetName(asset.name) === canonicalAssetName(name))) throw new Error('Another asset already has that name.');
    const data = window.MathWorkspaceSheafModel.editedData(record,type,normalizedAssetData(record.kind, type, patch.data || record.data));
    if(patch.data||patch.type)validateAssetData(record.kind, type, data, assetKey(record));
    const view=patch.view||presentation.split(record.kind,patch.data||{}).view;if(Object.keys(view).length)viewDefaults.set(assetKey(record),JSON.parse(JSON.stringify(view)));
    const next = { ...record, name, type, data, dependencies: assetDependencies(record.kind, type, data) };
    if (inputSemanticValue(next) === inputSemanticValue(record)) return record;
    Object.assign(record, next, {
      plainName: plainAssetName(name), typeLabel: ASSET_SUBTYPES[record.kind].find(entry => entry[0] === type)?.[1] || type,
      definition: assetDefinitionFor(record.kind, type, data), properties: invalidateDerivedAssetProperties(record, next)
    });
    record.fingerprint = JSON.stringify({ name, type, data, dependencies: record.dependencies });
    assetState.snapshot.revision += 1;
    const input = assetInputInstanceForRef(ref);
    if (input && !input.dirty) input.draft = inputDraftFromRecord(record);
    applyAssetSnapshot(localAssetSnapshot(), ref, { affectedAssetKeys: new Set([assetKey(ref)]) });
    return assetByKey(assetKey(ref));
  }
  function createObjectAsset(kind, options = {}) {
    if (!ASSET_KINDS.includes(kind)) throw new Error('Unknown mathematical object type.');
    if (Object.hasOwn(options, 'name')) {
      options = { ...options, name: String(options.name ?? '').trim() };
      if (!options.name || !balancedLatex(options.name) || assetState.snapshot.assets.some(asset => canonicalAssetName(asset.name) === canonicalAssetName(options.name))) throw new Error('Choose a complete, unique asset name.');
    }
    const previous = { snapshot: { ...assetState.snapshot, assets: assetState.snapshot.assets.slice() }, nextObjectId: assetState.nextObjectId, selected: assetState.selected, anchor: assetState.anchor };
    let record;
    if (options.name) reservedAssetNames.add(canonicalAssetName(options.name));
    try { record = createDefaultAsset(kind, { ...options, bindInput: false }); }
    catch (error) { Object.assign(assetState, previous); rebaseCleanAssetInputInstances(assetState.snapshot.revision); throw error; }
    finally { if (options.name) reservedAssetNames.delete(canonicalAssetName(options.name)); }
    applyAssetSnapshot(localAssetSnapshot(), assetRef(record), { affectedAssetKeys: new Set([assetKey(record)]) });
    return assetByKey(assetKey(record));
  }
  function importCategoryGraph(value) {
    const graph = window.MathWorkspaceObjects.prepareCategoryGraph(value), ids = new Map(), created = [], layout = [];
    for (const item of [...graph.categories, ...graph.functors]) if (!item.name.trim() || !balancedLatex(item.name)) throw new Error('The preset contains an incomplete object name.');
    // Validate the whole graph before allocating any Asset IDs or changing the store.
    const add = (kind, item, data) => {
      const record = createDefaultAsset(kind, { bindInput: false, defaults: false });
      let name = item.name.trim(), serial = 2;
      while (assetState.snapshot.assets.some(asset => asset !== record && canonicalAssetName(asset.name) === canonicalAssetName(name))) name = item.name.trim() + '_{' + serial++ + '}';
      Object.assign(record, { name, plainName: plainAssetName(name), data, dependencies: assetDependencies(kind, kind, data), definition: assetDefinitionFor(kind, kind, data) });
      record.fingerprint = JSON.stringify({ name, type: kind, data, dependencies: record.dependencies }); created.push(assetKey(record)); return record;
    };
    for (const item of graph.categories) {
      const record = add('category', item, item.data); ids.set(item.sourceId, assetKey(record));
      if (Number.isFinite(item.point.x) && Number.isFinite(item.point.y)) layout.push({ id: assetKey(record), x: Math.max(.06, Math.min(.94, item.point.x)), y: Math.max(.06, Math.min(.94, item.point.y)) });
    }
    for (const item of graph.functors) add('functor', item, { ...item.data, domain: ids.get(item.data.domain), codomain: ids.get(item.data.codomain) });
    applyAssetSnapshot(localAssetSnapshot(), null, { affectedAssetKeys: new Set(created) });
    const panel = objectWorkspace.open('category-diagram', '', 'main'); panel.computation.refs.nodes = created; objectWorkspace.refresh();
    panel.propertyRenderer?.editor.objectIO('layout', layout);
    return created;
  }
  function importRootObject(ref, value) {
    const asset = assetByKey(assetKey(ref));
    if (!asset || !['dynkin','strands'].includes(asset.kind)) throw new Error('Choose a Dynkin or Strands destination.');
    const model = window.MathWorkspaceObjects, prepared = model.prepareRootImport(asset.kind, value);
    let parent = assetByKey(prepared.data.lie, 'lie');
    if (prepared.lie) {
      if (!parent || JSON.stringify(parent.data) !== JSON.stringify(prepared.lie)) parent = assetState.snapshot.assets.find(item => item.kind === 'lie' && JSON.stringify(item.data) === JSON.stringify(prepared.lie));
    }
    const issues = model.rootObjectIssues({ kind: asset.kind, data: prepared.data }, prepared.lie ? { kind: 'lie', data: prepared.lie } : parent);
    if (issues.length) throw new Error(issues.join(' '));
    // The full payload is validated before creating any dependency. Never edit a shared Lie asset on import.
    if (!parent) parent = createObjectAsset('lie', { data: prepared.lie });
    return updateObjectAsset(ref, { data: { ...prepared.data, lie: assetKey(parent) } });
  }
  function importSlicing(value, ref) {
    const graph=slicing.prepareImport(value,window.MathWorkspaceObjects.normalize),destination=ref&&assetByKey(assetKey(ref));
    const primary=graph.records.find(a=>assetKey(a)===graph.primary);
    if(ref&&(!destination||graph.legacy||destination.kind!==primary?.kind)) throw new Error('Choose an asset of the same kind, or import a whole slicing experiment.');
    let nextId=assetState.nextObjectId;
    const remap=new Map(graph.records.map(a=>[assetKey(a),a===primary&&destination?assetKey(destination):a.kind+':S'+(++nextId)]));
    const usedNames=new Set(assetState.snapshot.assets.map(a=>canonicalAssetName(a.name)));
    const staged=graph.records.map(a=>{
      const key=remap.get(assetKey(a)),data=slicing.clone(a.data);
      for(const spec of slicing.references(a)) {
        const parts=spec.field.split('.'),field=parts.pop(),parent=parts.reduce((d,k)=>d[k],data),value=parent[field];
        parent[field]=spec.many?(value||[]).map(k=>remap.get(k)||k):(remap.get(value)||value||'');
      }
      let name=a===primary&&destination?destination.name:a.name.trim(),serial=2;
      if(!name||!balancedLatex(name)) throw new Error('Every imported asset needs a complete name.');
      if(!(a===primary&&destination)) { while(usedNames.has(canonicalAssetName(name)))name=a.name.trim()+'_{'+serial+++'}';usedNames.add(canonicalAssetName(name)); }
      const type=a.type,kind=a.kind,id=key.slice(key.indexOf(':')+1),normalized=normalizedAssetData(kind,type,data),dependencies=assetDependencies(kind,type,normalized);
      return {kind,id,type,name,plainName:plainAssetName(name),data:normalized,dependencies,typeLabel:ASSET_SUBTYPES[kind]?.find(entry=>entry[0]===type)?.[1]||type,definition:assetDefinitionFor(kind,type,normalized),fingerprint:JSON.stringify({name,type,data:normalized,dependencies})};
    });
    const all=[...assetState.snapshot.assets.filter(a=>!destination||assetKey(a)!==assetKey(destination)),...staged];
    for(const a of staged) {
      const errors=slicing.issues(a,all,false); if(errors.length) throw new Error(errors.join(' '));
      if(['formula','tropical'].includes(a.kind)) slicing.math('validate',{asset:a,assets:all});
    }
    // Publish only after the complete graph, references and formulas have passed validation.
    assetState.nextObjectId=nextId;assetState.snapshot.assets=all;assetState.snapshot.revision+=1;
    const created=staged.map(assetKey);applyAssetSnapshot(localAssetSnapshot(),ref||null,{affectedAssetKeys:new Set(created)});
    if(graph.legacy) {
      const panel=objectWorkspace.open('slicing-scene','','main');panel.computation.refs={frame:remap.get(graph.frame),nodes:graph.nodes.map(k=>remap.get(k))};objectWorkspace.refresh();
      panel.propertyRenderer?.editor.objectIO('view',{viewport:graph.viewport,layers:graph.layers.map(([key,layer])=>[remap.get(key),layer])});
    }
    return destination?assetByKey(assetKey(destination)):created;
  }
  function importNumberAsset(ref,value) {
    if(value.kind!=='number'||value.type!=='number')throw new Error('Choose a Number asset JSON file.');
    const record=assetByKey(assetKey(ref));if(!record)throw new Error('The Number was deleted.');
    const data=window.MathWorkspaceNumbers.normalize(value.data);
    if(!value.dependencies?.length)return updateObjectAsset(ref,{data});
    if(!Array.isArray(value.dependencies)||value.dependencies.length!==1)throw new Error('A Number export must contain its coefficient Ring dependency.');
    const source=value.dependencies[0];
    if(source.kind!=='field'||source.type!=='field'||assetKey(source)!==data.field)throw new Error('The Number export has an incompatible coefficient Ring.');
    const fieldData=window.MathWorkspaceObjects.normalize('field','field',source.data);
    const existing=assetState.snapshot.assets.find(asset=>asset.kind==='field'&&JSON.stringify(asset.data)===JSON.stringify(fieldData));
    const parent=existing||{kind:'field',id:'import-number-field',name:'R',type:'field',data:fieldData};
    const candidate={...record,data:{...data,field:assetKey(parent)}};
    window.MathWorkspaceNumbers.evaluate(candidate,[...assetState.snapshot.assets.filter(asset=>assetKey(asset)!==assetKey(ref)),...(!existing?[parent]:[]),candidate]);
    const target=existing||createDefaultAsset('field',{data:fieldData,select:false,bindInput:false});
    return updateObjectAsset(ref,{data:{...data,field:assetKey(target)}});
  }
  function commitSheafGraph(graph,managedKeys=[]) {
    if(!Array.isArray(graph?.entries))throw new Error('Invalid Sheaf Input graph.');
    const model=window.MathWorkspaceSheafModel,old=assetState.snapshot.assets,ids=new Map(),staged=[],nativeKeys={},used=new Set();
    let nextId=assetState.nextObjectId;
    const allocate=(kind,nativeId,existingKey)=>{
      const existing=assetByKey(existingKey),k=existing&&existing.kind===kind?assetKey(existing):kind+':'+({variety:'X',sheaf:'E',map:'M',number:'N',complex:'C'}[kind])+(++nextId);
      ids.set(nativeId,k);nativeKeys[nativeId]=k;return k;
    };
    for(const entry of graph.entries){if(!['variety','sheaf','map'].includes(entry.kind)||!ASSET_SUBTYPES[entry.kind].some(([t])=>t===entry.type))throw new Error('Unsupported native input object.');allocate(entry.kind,entry.nativeId,entry.assetKey);}
    for(const n of graph.numbers||[])allocate('number',n.id,n.__workspaceAssetKey);
    for(const sequence of graph.sequences||[]){const previous=old.find(a=>a.kind==='complex'&&a.data.legacy?.nativeSequence?.id===sequence.id);allocate('complex',sequence.id,previous&&assetKey(previous));}
    const sourceKeys=new Set([...managedKeys,...ids.values()]);
    for(const asset of old)if(!sourceKeys.has(assetKey(asset)))used.add(canonicalAssetName(asset.name));
    const record=(kind,nativeId,name,type,data,properties={})=>{
      const k=ids.get(nativeId),previous=assetByKey(k);
      if(!name||!balancedLatex(name)||used.has(canonicalAssetName(name)))throw new Error('Choose distinct, complete names for the constructed assets: '+name);
      used.add(canonicalAssetName(name));
      const next={...previous,kind,id:assetRefFromKey(k).id,name,autoName:'',plainName:plainAssetName(name),type,typeLabel:ASSET_SUBTYPES[kind].find(([t])=>t===type)?.[1]||type,data,properties};
      next.dependencies=assetDependencies(kind,type,data);next.definition=assetDefinitionFor(kind,type,data);next.fingerprint=JSON.stringify({name,type,data,properties,dependencies:next.dependencies});staged.push(next);return next;
    };
    let numberField=old.find(a=>a.kind==='field'&&a.data.dataType==='rational');
    if((graph.numbers||[]).length&&!numberField){const id='R'+(++nextId);numberField={kind:'field',id,name:uniqueDefaultAssetName('field'),type:'field',data:window.MathWorkspaceObjects.normalize('field','field',{dataType:'rational'}),dependencies:[],properties:{}};numberField.plainName=numberField.name;numberField.typeLabel='Ring';numberField.definition='Q';staged.push(numberField);}
    for(const n of graph.numbers||[])record('number',n.id,n.name,'number',window.MathWorkspaceNumbers.normalize({field:assetKey(numberField),hasValue:n.hasValue===true,value:n.value??0,replaceWithValue:n.replaceWithValue===true,positive:n.positive!==false}));
    const scalar=(raw,previous,spec)=>{
      raw=String(raw??'').trim()||spec.defaultValue;
      if(previous){try{if(window.MathWorkspaceNumbers.scalar({data:{[spec.field]:previous}},spec,old)===raw)return previous;}catch(_){}}
      const number=[...old,...staged].find(a=>a.kind==='number'&&(a.name===raw||window.MathWorkspaceNumbers.symbol(a)===raw));
      if(number)return {kind:'reference',ref:assetKey(number)};
      return {kind:/^\+?\d+$/.test(raw)?'literal':'expression',value:raw};
    };
    for(const entry of graph.entries){
      const previous=assetByKey(ids.get(entry.nativeId)),p=entry.data.workspaceSheafComplex.payload,c=p.construction||{};
      const payload=model.remap(p,ids);payload.id=entry.nativeId;delete payload.__workspaceAssetKey;
      const data={workspaceSheafComplex:{payload}},props={};
      if(payload.homology){props.homology=payload.homology;delete payload.homology;}
      if(entry.kind==='variety'){
        Object.assign(data,{dimension:String(p.dim??3)});
        if(['curve','symmetric-product-curve'].includes(entry.type)){const spec=window.MathWorkspaceNumbers.references('variety',entry.type)[0];data.genus=scalar(entry.type==='curve'?p.genus:p.symmetricProductGenus,previous?.data.genus,spec);}
        if(entry.type==='symmetric-product-curve')data.power=String(p.symmetricProductM??0);
        if(entry.type==='ppav-moduli')data.genus=String(p.ppavGenus??2);
        if(entry.type==='grassmannian')Object.assign(data,{r:String(p.grassmannianR),n:String(p.grassmannianN)});
        if(entry.type==='complete-intersection')Object.assign(data,{degrees:model.degrees(p.ciDegrees).join(', '),ambientDimension:String(p.ciAmbient??(Number(p.dim)+model.degrees(p.ciDegrees).length))});
        if(entry.type==='product')Object.assign(data,{first:ids.get(c.varietyIds?.[0]),second:ids.get(c.varietyIds?.[1])});
        if(p.grassmannianYoungBasis)props.grassmannianYoungBasis=true;
      }else if(entry.kind==='sheaf'){
        Object.assign(data,{base:ids.get(p.baseVarietyId),twist:String(p.twist??1)});props.basis=p.basis||'chern';
        if(['abstract','locally-free'].includes(entry.type)){const spec=window.MathWorkspaceNumbers.references('sheaf',entry.type)[0];data.rank=scalar(p.rank,previous?.data.rank,spec);}else data.rank=String(p.rank??'');
        if(p.divisorCoefficients)data.divisorCoefficients=copyInput(p.divisorCoefficients);
        if(p.workspaceDifferentialWedge)Object.assign(data,{differentialWedge:true,wedgeDegree:String(p.workspaceDifferentialWedge.degree)});
        if(['direct-sum','tensor','internal-hom'].includes(entry.type))Object.assign(data,{first:ids.get(c.internalHom?c.sourceSheafId:c.sheafIds?.[0]),second:ids.get(c.internalHom?c.targetSheafId:c.sheafIds?.[1]),exact:c.exact===true});
        if(entry.type==='tensor'){data.parents=(c.sheafIds||[]).map(id=>ids.get(id));data.exponents=c.exponents;}
        if(['dual','self-direct-sum','self-tensor-product','schur'].includes(entry.type))data.parent=ids.get(c.sheafId);
        if(c.multiplicity!=null)data.multiplicity=String(c.multiplicity);if(c.partition)data.partition=c.partition.join(',');
        const mapId=c.mapId||c.idealSheafMapId||c.normalBundleMapId||c.conormalBundleMapId||c.relativeSheafMapId;
        if(mapId){data.map=ids.get(mapId);data.confirmed=true;}
        if(entry.type==='map-operation')Object.assign(data,{parent:ids.get(c.sheafId),operation:c.type,exact:c.exact===true,proper:c.proper===true});
      }else Object.assign(data,entry.type==='composition'?{domain:ids.get(c.mapIds?.[0]),codomain:ids.get(c.mapIds?.[1])}:{domain:ids.get(p.domainId),codomain:ids.get(p.codomainId)});
      record(entry.kind,entry.nativeId,entry.name,entry.type,data,props);
    }
    for(const sequence of graph.sequences||[]){
      const terms=(sequence.sheafIds||[]).map(id=>({symbol:graph.entries.find(e=>e.nativeId===id)?.name||'?',ref:ids.get(id)||''}));
      const maps=(sequence.mapIds||[]).map(id=>({symbol:graph.entries.find(e=>e.nativeId===id)?.name||'',ref:ids.get(id)||''}));
      if(!terms.length)continue;
      const previous=assetByKey(ids.get(sequence.id));let name=previous?.name||'SES';for(let i=2;used.has(canonicalAssetName(name));i++)name='SES_{'+i+'}';
      const data=window.MathWorkspaceStructures.normalize('complex',{objects:terms,maps:maps.length===terms.length-1?maps:Array.from({length:terms.length-1},()=>({symbol:'',ref:''})),condition:'declared',legacy:{nativeSequence:model.remap(sequence,ids)}});
      data.legacy.nativeSequence.id=sequence.id;record('complex',sequence.id,name,'complex',data);
    }
    const all=[...old.filter(a=>!sourceKeys.has(assetKey(a))),...staged];
    const diagnostics=window.MathWorkspaceDiagnostics.analyze(all);
    for(const a of staged)if(diagnostics[assetKey(a)]?.valid===false)throw new Error(window.MathWorkspaceDiagnostics.messages(diagnostics[assetKey(a)],all).join(' '));
    assetState.nextObjectId=nextId;assetState.snapshot={...assetState.snapshot,assets:all,revision:assetState.snapshot.revision+1};
    const active=nativeKeys[graph.activeNativeId]||graph.activeKey;
    applyAssetSnapshot(localAssetSnapshot(),active?assetRefFromKey(active):null,{affectedAssetKeys:new Set(sourceKeys)});
    return {ids:nativeKeys,keys:staged.filter(a=>['variety','sheaf','map','number'].includes(a.kind)).map(assetKey),active};
  }
  function copyInput(value){return JSON.parse(JSON.stringify(value));}
  function initialiseObjectPanels() {
    if (!window.MathWorkspaceObjects) return;
    objectWorkspace = window.MathWorkspaceObjects.mount({
      snapshot: localAssetSnapshot, viewDefaults: viewDefaultsFor, create: createObjectAsset, update: updateObjectAsset, commitSheafGraph, ensureDefault: ensureDefaultDependency, publishDefaults: () => applyAssetSnapshot(localAssetSnapshot()), importCategoryGraph, importRootObject, importSlicing, importNumberAsset, captureWorkspace, restoreWorkspace, importAsset: (ref, value) => {
        if (!ASSET_SUBTYPES[ref.kind]?.some(([type]) => type === value.type)) throw new Error('Unsupported object subtype.');
        return updateObjectAsset(ref, { type: value.type, data: value.data });
      }, status, closePicker: closeCardPicker, ioChanged: updateImportExport,
      selectAsset: ref => {
        if (!ref) {
          assetState.selected.clear(); assetState.anchor='';
          assetState.renameKey=''; syncAssetSelectionDom(); return;
        }
        const key = assetKey(ref); if (!assetByKey(key)) return;
        assetState.selected = new Set([key]); assetState.anchor = key;
        assetState.renameKey = ''; syncAssetSelectionDom();
      },
      installChrome: panel => {
        installWorkspaceOwnedCardChrome(panel.node, panel.id, {
          hide: () => objectWorkspace.move(panel, 'hidden'),
          actions: [['move-area', 'Move to main area', '↗', () => objectWorkspace.move(panel, panel.location === 'main' ? 'side' : 'main')]]
        });
        panel.moveButton = panel.head.querySelector('[data-workspace-card-action="move-area"]');
        panel.moveButton.textContent = panel.location === 'main' ? '↙' : '↗';
        panel.moveButton.title = panel.location === 'main' ? 'Move to side panels' : 'Move to main area';
        panel.moveButton.setAttribute('aria-label', panel.moveButton.title);
        const sync = card => { if (card.dataset.objectPanel) objectWorkspace.syncPresentation(card.dataset.objectPanel); };
        window.CalculatorCards?.init?.({ root: panel.node.parentElement, side: [], enforceInitial: false, onOpen: sync, onCollapse: sync });
        const state = workspaceOwnedCardActionState(panel.node);
        panel.head.querySelector('[data-workspace-card-action="move-up"]').disabled = !state.canMoveUp;
        panel.head.querySelector('[data-workspace-card-action="move-down"]').disabled = !state.canMoveDown;
        refreshWorkspaceOwnedCardChrome();
      },
      side: $('#workspace-cards'), parking: $('#workspace-canvas-parking'), split: () => splitView,
      edit: ref => modifyAsset(assetByKey(assetKey(ref))),
      placeMain: panel => {
        const definition = { id: panel.id, label: panel.title.textContent, kind: 'object-panel' };
        byId.set(panel.id, definition);
        canvases.set(panel.id, { kind: 'object-panel', definition, node: panel.node, editor: { setCanvasActive: active => { panel.node.hidden = !active; } } });
        selectCanvasTab(panel.id);
      },
      removeMain: closeCanvas,
      title: (id, label) => { const definition = byId.get(id); if (definition && definition.label !== label) { definition.label = label; updateCanvasPaneTitles(); renderCanvasTabs(); if (activeCanvasId === id) $('#workspace-canvas-name').textContent = label; } },
      focusPane: name => { if (name === 'primary' || name === 'secondary') focusedPane = name; },
      pickerChanged: () => { if (!$('#workspace-card-picker').hidden) renderCardPicker(); scheduleDefaultCleanup(); }
    });
    window.MathWorkspaceObjectPanels = objectWorkspace;
  }
  function beginAssetRename() {
    const selected = selectedAssetRecords();
    if (selected.length !== 1) return;
    closeAssetsContextMenu(); assetState.renameKey = assetKey(selected[0]); renderAssets();
  }
  function handleRenameKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault(); const key = assetState.renameKey; assetState.renameKey = ''; renderAssets();
      assetState.view.querySelector(`[data-asset-key="${CSS.escape(key)}"]`)?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault(); commitAssetRename(assetState.renameKey, event.currentTarget.value);
    }
  }
  async function commitAssetRename(key, value) {
    if (!key || assetState.renameKey !== key) return;
    const asset = assetState.snapshot.assets.find((entry) => assetKey(entry) === key);
    if (!asset) return;
    assetState.renameKey = '';
    try {
      applyAssetSnapshot(await assetRequest('rename', { ref: assetRef(asset), name: value })); status('Asset renamed.', 'success');
    } catch (error) {
      assetState.renameKey = key; renderAssets(); status(error.message, 'error');
    }
  }

  function handleAssetKeydown(event) {
    if (event.target.closest('input,select,button')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault(); const ordered = orderedAssets(); assetState.selected = new Set(ordered.map(assetKey)); assetState.anchor = ordered[0] ? assetKey(ordered[0]) : ''; renderAssets();
    } else if (event.key === 'F2') { event.preventDefault(); beginAssetRename(); }
    else if (event.key === 'Delete') { event.preventDefault(); deleteAssets(selectedAssetRecords().map(assetRef)); }
    else if (event.key === 'Enter') { event.preventDefault(); openSelectedAsset(); }
    else if (event.key === 'Escape') {
      event.preventDefault(); if (!closeAssetsContextMenu()) { assetState.selected.clear(); assetState.anchor = ''; renderAssets(); }
    } else if ((event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) && assetState.selected.size) {
      event.preventDefault();
      assetState.touchMenu = false;
      const selected = selectedAssetRecords();
      assetState.contextTargetRef = selected.length === 1 ? assetRef(selected[0]) : null;
      const rect = assetState.view.querySelector('[aria-selected="true"]')?.getBoundingClientRect();
      if (rect) showAssetsContextMenu(rect.left + 12, rect.top + 12, 'item');
    }
  }

  function beginAssetMarquee(event) {
    if (event.currentTarget.querySelector('[data-empty-create-variant="none"]')) return;
    if (event.pointerType === 'touch' || event.button !== 0 || event.target.closest('[data-asset-key],input,select,button')) return;
    closeAssetsContextMenu(); event.preventDefault();
    const marquee = Object.assign(document.createElement('div'), { className: 'workspace-assets-marquee' }); document.body.appendChild(marquee);
    const baseline = (event.ctrlKey || event.metaKey) ? new Set(assetState.selected) : new Set();
    assetState.marquee = { startX: event.clientX, startY: event.clientY, marquee, baseline };
    const move = (moveEvent) => updateAssetMarquee(moveEvent);
    const finish = () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', finish); document.removeEventListener('pointercancel', finish);
      assetState.marquee?.marquee.remove(); assetState.marquee = null; renderAssets();
    };
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', finish, { once: true }); document.addEventListener('pointercancel', finish, { once: true });
    updateAssetMarquee(event);
  }
  function updateAssetMarquee(event) {
    const drag = assetState.marquee;
    if (!drag) return;
    event.preventDefault();
    const left = Math.min(drag.startX, event.clientX), top = Math.min(drag.startY, event.clientY), right = Math.max(drag.startX, event.clientX), bottom = Math.max(drag.startY, event.clientY);
    Object.assign(drag.marquee.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    const next = new Set(drag.baseline);
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => {
      const rect = item.getBoundingClientRect(); if (rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom) next.add(item.dataset.assetKey);
    });
    assetState.selected = next;
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => item.setAttribute('aria-selected', String(next.has(item.dataset.assetKey))));
    assetState.view.querySelector('[data-assets-count]').textContent = `${assetState.snapshot.assets.length} objects${next.size ? ` · ${next.size} selected` : ''}`;
    renderCardPicker();
  }

  function handleAssetsContextMenu(event) {
    event.preventDefault(); assetState.touchMenu = !!event.workspaceTouch; const item = event.target.closest('[data-asset-key]');
    if (item) {
      const target = assetByKey(item.dataset.assetKey);
      assetState.contextTargetRef = target ? assetRef(target) : null;
      if (!assetState.touchMenu || !assetState.selected.has(item.dataset.assetKey)) { assetState.selected = new Set([item.dataset.assetKey]); assetState.anchor = item.dataset.assetKey; }
      if (assetState.selected.size !== 1) assetState.contextTargetRef = null;
      renderAssets();
      showAssetsContextMenu(event.clientX, event.clientY, 'item');
    } else {
      assetState.contextTargetRef = null; if (!assetState.touchMenu || !assetState.touchMultiSelect) { assetState.selected.clear(); assetState.anchor = ''; } renderAssets(); showAssetsContextMenu(event.clientX, event.clientY, 'background');
    }
  }
  function menuButton(label, action, options = {}) {
    const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, disabled: !!options.disabled });
    button.setAttribute('role', 'menuitem'); if (options.checked) button.dataset.checked = 'true';
    // Floating submenus can lose their synthetic click when the pointer leaves
    // the cascade on mouse-up.  Activate on pointer-down, with click retained
    // for keyboard activation and assistive technologies.
    let activated = false;
    const activate = (event) => {
      if (activated || button.disabled || event?.type === 'pointerdown' && event.pointerType === 'touch') return;
      activated = true;
      if (event?.type === 'pointerdown') event.preventDefault();
      action(); closeAssetsContextMenu();
    };
    button.addEventListener('pointerdown', activate);
    button.addEventListener('click', activate); return button;
  }
  function menuCascade(label, children, options = {}) {
    const wrapper = Object.assign(document.createElement('div'), { className: 'workspace-assets-menu-cascade' });
    const trigger = Object.assign(document.createElement('button'), { type: 'button', disabled: !!options.disabled });
    trigger.setAttribute('role', 'menuitem'); trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
    trigger.append(document.createTextNode(label), Object.assign(document.createElement('span'), { className: 'workspace-assets-menu-arrow', textContent: '›' }));
    const submenu = Object.assign(document.createElement('div'), { className: 'workspace-assets-submenu' }); submenu.setAttribute('role', 'menu'); children.forEach((child) => submenu.appendChild(child));
    const setOpen = (open) => { wrapper.dataset.open = String(open); trigger.setAttribute('aria-expanded', String(open)); };
    const openExclusive = () => {
      if (trigger.disabled) return;
      wrapper.parentElement?.querySelectorAll('.workspace-assets-menu-cascade').forEach((item) => {
        item.dataset.open = 'false'; item.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
      });
      setOpen(true);
    };
    wrapper.addEventListener('mouseenter', () => { if (!assetState.touchMenu) openExclusive(); }); wrapper.addEventListener('mouseleave', () => { if (!assetState.touchMenu) setOpen(false); }); trigger.addEventListener('focus', () => { if (!assetState.touchMenu) openExclusive(); });
    trigger.addEventListener('click', (event) => { event.stopPropagation(); if (assetState.touchMenu && wrapper.dataset.open === 'true') setOpen(false); else openExclusive(); });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); setOpen(true); submenu.querySelector('button:not(:disabled)')?.focus(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); }
    });
    submenu.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); } });
    wrapper.append(trigger, submenu); return wrapper;
  }
  function showAssetsContextMenu(x, y, kind) {
    const menu = $('#workspace-assets-context-menu'); menu.replaceChildren(); menu.style.maxHeight = ''; menu.classList.toggle('workspace-touch-menu', !!assetState.touchMenu);
    if (kind === 'item') {
      menu.append(
        menuButton('Open', openSelectedAsset, { disabled: assetState.selected.size !== 1 }),
        menuButton('Modify', modifySelectedAsset, { disabled: assetState.selected.size !== 1 }),
        menuCascade('Properties', assetPropertiesMenuItems(assetState.contextTargetRef), { disabled: !assetState.contextTargetRef }),
        menuButton('Rename', beginAssetRename, { disabled: assetState.selected.size !== 1 }),
        menuButton(`Delete${assetState.selected.size > 1 ? ` ${assetState.selected.size} assets` : ''}`, () => deleteAssets(selectedAssetRecords().map(assetRef)), { disabled: !assetState.selected.size })
      );
    } else {
      const viewItems = ASSET_LAYOUTS.map((layout) => menuButton(layout[0].toUpperCase() + layout.slice(1), () => { assetState.layout = layout; renderAssets(); }, { checked: assetState.layout === layout }));
      const sortItems = [['creation', 'Creation order'], ['name', 'Name'], ['type', 'Object type'], ['modified', 'Date modified']].map(([value, label]) => menuButton(label, () => { assetState.sort = value; renderAssets(); }, { checked: assetState.sort === value }));
      sortItems.push(Object.assign(document.createElement('div'), { className: 'workspace-assets-menu-separator' }), menuButton('Ascending', () => { assetState.direction = 'asc'; renderAssets(); }, { checked: assetState.direction === 'asc', disabled: assetState.sort === 'creation' }), menuButton('Descending', () => { assetState.direction = 'desc'; renderAssets(); }, { checked: assetState.direction === 'desc', disabled: assetState.sort === 'creation' }));
      const defaults = menuButton('Show default assets', () => {
        assetState.showDefaults = !assetState.showDefaults;
        const visible = new Set(orderedAssets().map(assetKey));
        assetState.selected = new Set([...assetState.selected].filter(key => visible.has(key)));
        if (!visible.has(assetState.anchor)) assetState.anchor = '';
        renderAssets();
      }, { checked: assetState.showDefaults });
      defaults.setAttribute('role', 'menuitemcheckbox'); defaults.setAttribute('aria-checked', String(assetState.showDefaults));
      menu.append(menuCascade('View', viewItems), menuCascade('Sort by', sortItems), menuButton('New…', () => creationPicker.open()), defaults);
    }
    if (assetState.touchMenu) {
      menu.append(menuButton(assetState.touchMultiSelect ? 'Finish multiple selection' : 'Select multiple', () => { assetState.touchMultiSelect = !assetState.touchMultiSelect; assetState.view.dataset.touchMultiselect = String(assetState.touchMultiSelect); syncAssetSelectionDom(); }));
      menu.append(menuButton('Select all', () => { assetState.touchMultiSelect = true; assetState.view.dataset.touchMultiselect = 'true'; assetState.selected = new Set(orderedAssets().map(assetKey)); syncAssetSelectionDom(); }));
    }
    menu.hidden = false; menu.classList.toggle('workspace-assets-menu-left', x > window.innerWidth - 460); menu.style.left = '0px'; menu.style.top = '0px';
    const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - rect.width - 6))}px`; menu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - rect.height - 6))}px`;
    if (assetState.touchMenu) menu.style.maxHeight = `${window.innerHeight - parseFloat(menu.style.top) - 6}px`;
    menu.querySelector('button:not(:disabled)')?.focus();
  }
  function closeAssetsContextMenu() {
    const menu = $('#workspace-assets-context-menu'); if (menu.hidden) return false;
    menu.hidden = true; menu.replaceChildren(); return true;
  }

  async function deleteAssets(refs) {
    closeAssetsContextMenu(); if (!refs.length) return;
    try {
      const plan = await assetRequest('plan-delete', { refs });
      if (!plan.all?.length || !await confirmAssetDelete(plan)) return;
      applyAssetSnapshot(await assetRequest('commit-delete', { refs, revision: plan.revision }));
      assetState.selected.clear(); assetState.anchor = ''; status(`Deleted ${plan.all.length} asset${plan.all.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }
  function confirmAssetDelete(plan) {
    const dialog = $('#workspace-assets-delete-dialog'), selected = plan.selected || [], dependents = plan.dependents || [];
    $('#workspace-assets-delete-summary').textContent = dependents.length ? `Deleting the selection will also delete ${dependents.length} dependent asset${dependents.length === 1 ? '' : 's'}. This cannot be undone.` : `Delete ${selected.length} selected asset${selected.length === 1 ? '' : 's'}? This cannot be undone.`;
    fillDeleteList($('#workspace-assets-delete-selected'), 'Selected', selected); fillDeleteList($('#workspace-assets-delete-dependents'), 'Also deleted', dependents);
    if (typeof dialog.showModal !== 'function') return Promise.resolve(window.confirm($('#workspace-assets-delete-summary').textContent));
    return new Promise((resolve) => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal(); dialog.querySelector('[value="cancel"]')?.focus(); });
  }
  function fillDeleteList(host, heading, entries) {
    host.replaceChildren(); host.hidden = !entries.length; if (!entries.length) return;
    host.appendChild(Object.assign(document.createElement('h3'), { textContent: heading })); const list = document.createElement('ul');
    entries.forEach((asset) => list.appendChild(Object.assign(document.createElement('li'), { textContent: `${asset.plainName || asset.name} — ${asset.typeLabel}` }))); host.appendChild(list);
  }

  function toggleImportExportCard() { const card = $('#workspace-io-card'), collapsed = card.classList.toggle('collapsed'); $('#workspace-io-head').setAttribute('aria-expanded', String(!collapsed)); }
  function inspectorNodeKey(node) {
    return node.dataset.objectPanel || (node.dataset.assetCardSlot ? 'asset-card:' + node.dataset.assetCardSlot : node.dataset.nativeInspector ? 'calculator:' + node.dataset.nativeInspector : node.dataset.workspaceCard || node.id);
  }
  function captureWorkspace() {
    sessions.forEach(session => { if (session.assetProjection) captureSheafComplexLayout(session); });
    const slots = [...assetsCardState.slots.values()].map(slot => ({
      cardType: slot.cardType, visible: slot.visible, activeInstanceKey: slot.activeInstanceKey, recentInstanceKeys: slot.recentInstanceKeys,
      collapsed: slot.collapsed, pinned: slot.pinned, displayMode: slot.displayMode,
      snapshot: slot.rendererSession?.editor.capture() || null
    }));
    const instances = [...assetsCardState.instances.values()].map(instance => ({
      targetRef: instance.targetRef, cardType: instance.cardType, localUiState: instance.localUiState || {},
      ...(instance.cardType === 'input' ? { draft: instance.draft, baseDefinition: instance.baseDefinition, dirty: instance.dirty, validation: instance.validation, autosaveStatus: instance.autosaveStatus } : {})
    }));
    const tabs = openedCanvasIds().filter(id => id !== DESIGN_LAB_ID);
    const panes = { ...paneCanvases };
    for (const name of ['primary','secondary']) if (panes[name] === DESIGN_LAB_ID) panes[name] = tabs.find(id => id !== panes[otherPane(name)]) || '';
    const savedSplit = splitView && !!panes.primary && !!panes.secondary && panes.primary !== panes.secondary;
    if (!savedSplit) { panes.primary = panes.primary || panes.secondary || tabs[0] || ''; panes.secondary = ''; }
    return window.MathWorkspaceIO.clone({
      schema: window.MathWorkspaceIO.schema, version: 1, assets: localAssetSnapshot().assets,
      panels: objectWorkspace.capturePanels(),
      calculators: [...sessions.entries()].map(([id, session]) => ({ id, canvasHeight: session.canvasHeight, canvasHeightMode: session.canvasHeightMode, snapshot: session.editor.capture(),
        assetProjection: session.assetProjection ? { keys: [...session.assetProjection.keys], layout: [...session.assetProjection.layout], activeRef: session.assetProjection.activeRef } : null })),
      assetCards: { slots, instances, activeInputInstanceKey: assetState.activeInputInstanceKey, editorMode: assetState.editorMode,
        importExport: { visible: importExportSlot.visible, collapsed: importExportSlot.collapsed, pinned: importExportSlot.pinned, displayMode: importExportSlot.displayMode } },
      workspace: { tabs, panes, split: savedSplit, focusedPane: savedSplit ? focusedPane : 'primary', inspectorSourceId: inspectorSourceId === DESIGN_LAB_ID ? '' : inspectorSourceId,
        viewDefaults:[...viewDefaults].filter(([key])=>assetByKey(key)),
        dockedPanels:[...dockedPanels.values()].filter(record => record.id !== DESIGN_LAB_ID).map(({id,source,key,sessionId,location,canvasHeight,canvasHeightMode})=>({id,source,key,sessionId,location,canvasHeight,canvasHeightMode})),
        inspectorOrder: [...$('#workspace-cards').children].filter(node => node.id !== 'workspace-design-lab').map(inspectorNodeKey),
        settings: window.MathWorkspaceSettings?.capture(),
        assets: { layout: assetState.layout, sort: assetState.sort, direction: assetState.direction, showDefaults: assetState.showDefaults, selected: [...assetState.selected], anchor: assetState.anchor, canvasHeight: assetState.canvasHeight, canvasHeightMode: assetState.canvasHeightMode, metadata: [...assetState.metadata] } }
    });
  }
  function prepareWorkspace(text) {
    const io = window.MathWorkspaceIO, raw = io.parse(text);
    window.MathWorkspaceTopology.migrateWorkspace(raw);
    io.migrateHomologyCards(raw);
    presentation.migrateWorkspace(raw);
    window.MathWorkspaceSettings?.validate(raw.workspace.settings);
    for(const panel of raw.panels)if(panel.type==='asset-view'){
      const key=panel.computation?.refs?.asset,asset=raw.assets.find(a=>assetKey(a)===key),capability=window.MathWorkspaceObjects.capabilityFor(asset);
      if(capability&&capability.open!=='asset-view'){
        const definition=window.MathWorkspaceObjects.definitions.find(d=>d.id===capability.open);panel.type=definition.id;
        panel.computation.refs=definition.structureScene?{nodes:[key]}:definition.geometryView?{asset:key,frame:asset.kind==='frame'?key:'',nodes:asset.kind==='frame'?[]:[key]}:{[definition.viewRole||'asset']:key};
      }
    }
    const prepared = io.validate(raw, {
      subtypes: ASSET_SUBTYPES, definitions: window.MathWorkspaceObjects.definitions, calculatorIds: calculators.map(c => c.id),
      nameKey: canonicalAssetName, validName: name => typeof name === 'string' && !!name.trim() && balancedLatex(name),
      normalize: (kind, type, data) => OBJECT_INPUT_KINDS.includes(kind) || slicing.isAsset({kind,type}) ? window.MathWorkspaceObjects.normalize(kind,type,data) : window.MathWorkspaceNumbers.normalizeInputs(kind,type,io.clone(data)),
      references: asset => ['complex','filtration','field-extension'].includes(asset.kind)
        ? window.MathWorkspaceStructures.references(asset.kind,asset.data).map(key=>({key,kind:key.split(':')[0]}))
        : slicing.isAsset(asset) || asset.kind === 'matrix'
        ? slicing.references(asset).flatMap(spec => (spec.many ? slicing.readRef(asset.data,spec.field) || [] : [slicing.readRef(asset.data,spec.field)]).map(key => ({key,kind:spec.kind})))
        : referenceFieldSpecs(asset.kind,asset.type,asset.data).map(spec => ({key:assetReferenceKey(asset.data,spec),kind:spec.expectedKind,...(window.MathWorkspaceTopology.kinds.includes(asset.kind)&&spec.field==='source'?{allowMissing:true}:{})}))
    });
    for(const asset of prepared.assets)if(['complex','filtration'].includes(asset.kind)){
      const issues=window.MathWorkspaceStructures.issues(asset,prepared.assets);if(issues.length)throw new Error(issues.join(' '));
    }
    const types = new Set(Object.keys(ASSET_CARD_REGISTRY));
    for (const slot of prepared.assetCards.slots) if (!types.has(slot.cardType) || !Array.isArray(slot.recentInstanceKeys)) throw new Error('Invalid saved Assets card.');
    for (const instance of prepared.assetCards.instances) {
      if (!types.has(instance.cardType) || !prepared.assets.some(a => assetKey(a) === assetKey(instance.targetRef)) || instance.cardType === 'input' && (!instance.draft || typeof instance.draft.name !== 'string' || !instance.draft.data)) throw new Error('Invalid saved Assets input.');
      if (instance.cardType === 'input') instance.draft = cloneInputDraft(instance.draft);
      if(instance.cardType!=='input'&&!cardSupportsAsset(instance.cardType,instance.targetRef.kind))throw new Error('Incompatible saved Assets property target.');
    }
    for (const asset of prepared.assets) if (['formula','tropical'].includes(asset.kind) && asset.data.ambientDimension <= 8) slicing.math('validate',{asset,assets:prepared.assets});
    return prepared;
  }
  function applyWorkspaceBackup(saved) {
    const io = window.MathWorkspaceIO;
    window.MathWorkspaceSettings?.restore(saved.workspace.settings);
    closeCardPicker(); closeAssetsContextMenu(); closeReferencePicker();
    for (const instance of assetsCardState.instances.values()) if (instance.cardType === 'input') { instance.deleted = true; cancelAssetInputAutosave(instance); }
    clearDockedPanels();
    objectWorkspace.clearPanels();
    sessions.forEach(session => session.editor.dispose()); sessions.clear();
    for (const slot of assetsCardState.slots.values()) slot.rendererSession?.editor.dispose();
    assetsCardState.instances.clear(); assetsCardState.inputTaskQueue.length = 0;
    Object.keys(ASSET_CARD_REGISTRY).forEach(type => assetsCardState.slots.set(type, createAssetCardSlot(type)));
    for (const [id, definition] of byId) if (definition.kind === 'object-panel') byId.delete(id);
    if (assetState.view) { $('#workspace-canvas-parking').append(assetState.view); assetState.view.hidden = true; }
    canvases.clear(); paneCanvases.primary = ''; paneCanvases.secondary = ''; splitView = false; focusedPane = 'primary'; activeCanvasId = ''; inspectorSourceId = '';
    assetState.activeInputInstanceKey = null; assetState.propertyRef = null; assetState.propertySession = null;
    const revision = assetState.snapshot.revision + 1;
    const assets = saved.assets.map(asset => {
      const dependencies = assetDependencies(asset.kind,asset.type,asset.data);
      return { ...io.clone(asset), plainName: plainAssetName(asset.name), typeLabel: ASSET_SUBTYPES[asset.kind].find(([type]) => type === asset.type)[1], dependencies,
        definition: assetDefinitionFor(asset.kind,asset.type,asset.data), fingerprint: JSON.stringify({name:asset.name,type:asset.type,data:asset.data,dependencies}) };
    });
    viewDefaults.clear();for(const [key,view]of saved.workspace.viewDefaults||[])viewDefaults.set(key,io.clone(view));
    assetState.snapshot = { revision, assets, capabilities: {} }; assetState.snapshot = localAssetSnapshot();
    assetState.nextObjectId = Math.max(0, ...assets.map(a => Number(a.id.match(/\d+$/)?.[0]) || 0));
    const settings = saved.workspace.assets;
    assetState.layout = ASSET_LAYOUTS.includes(settings.layout) ? settings.layout : 'icons';
    assetState.showDefaults = settings.showDefaults === true;
    assetState.sort = ['creation','name','type','modified'].includes(settings.sort) ? settings.sort : 'creation'; assetState.direction = settings.direction === 'desc' ? 'desc' : 'asc';
    assetState.selected = new Set((settings.selected || []).filter(key => assetByKey(key) && (assetState.showDefaults || !assetByKey(key).isDefault))); assetState.anchor = assetState.selected.has(settings.anchor) ? settings.anchor : ''; assetState.renameKey = '';
    assetState.canvasHeight = clampCanvasHeight(settings.canvasHeight); assetState.canvasHeightMode = settings.canvasHeightMode==='manual'?'manual':'auto'; assetState.metadata = new Map(settings.metadata || []); assetState.creationCounter = Math.max(0,...[...assetState.metadata.values()].map(m => Number(m.order) || 0));
    for (const item of saved.assetCards.instances) {
      const instance = item.cardType === 'input' ? createAssetInputInstance(item.targetRef) : createAssetCardInstance(item.targetRef,item.cardType);
      instance.localUiState = io.clone(item.localUiState);
      if (item.cardType === 'input') Object.assign(instance,{draft:io.clone(item.draft),baseDefinition:typeof item.baseDefinition==='string'?item.baseDefinition:instance.baseDefinition,dirty:!!item.dirty,validation:io.clone(item.validation),autosaveStatus:item.dirty ? 'Restored draft' : item.autosaveStatus,baseRevision:revision});
      if (item.cardType === 'input' && !instance.dirty) {
        const record = assetByKey(assetKey(instance.targetRef));
        // Automatic copy labels may have been repaired while loading Assets.
        // A clean automatic Input follows that repair; user drafts stay intact.
        if (GROUPED_VARIETY_COPY_NAMES.has(record.type) && record.autoName === record.name && instance.draft.autoName
          && instance.draft.name === instance.draft.autoName && instance.draft.name !== record.name) {
          Object.assign(instance.draft, { name: record.name, autoName: record.autoName });
          instance.baseDefinition = assetInputDefinition(record);
        }
      }
      assetsCardState.instances.set(instance.key,instance);
    }
    for (const item of saved.assetCards.slots) {
      const slot = assetsCardState.slots.get(item.cardType);
      Object.assign(slot,{visible:!!item.visible,activeInstanceKey:item.activeInstanceKey,recentInstanceKeys:item.recentInstanceKeys,collapsed:!!item.collapsed,pinned:!!item.pinned,displayMode:item.displayMode});
      const instance = assetsCardState.instances.get(slot.activeInstanceKey);
      if (instance && item.cardType !== 'input') {
        slot.activeInstanceKey = null; // This renderer is new; it has no previous presentation to capture.
        bindAssetPropertySlot(item.cardType,instance.targetRef,{render:false,focus:false,promote:false});
        if (item.snapshot&&!slot.rendererSession.dependencyInvalid) { slot.rendererSession.applyingAssets = true; try { slot.rendererSession.editor.restore(item.snapshot); } finally { slot.rendererSession.applyingAssets = false; } }
        Object.assign(slot,{visible:!!item.visible,recentInstanceKeys:item.recentInstanceKeys,collapsed:!!item.collapsed,pinned:!!item.pinned,displayMode:item.displayMode});
        const card=ASSET_CARD_REGISTRY[item.cardType];
        slot.rendererSession.editor.setCardPresentation(card.nativeCardKey,{collapsed:slot.collapsed,pinned:slot.pinned,displayMode:slot.displayMode});
        slot.rendererSession.editor.setCardVisible(card.nativeCardKey,slot.visible&&!slot.rendererSession.dependencyInvalid);
        if(slot.rendererSession.dependencyInvalid)slot.rendererSession.editor.listCards().forEach(card=>slot.rendererSession.editor.setCardVisible(card.key,false));
      }
    }
    assetState.activeInputInstanceKey = saved.assetCards.activeInputInstanceKey; assetState.editorMode = saved.assetCards.editorMode;
    Object.assign(importExportSlot,saved.assetCards.importExport); applyWorkspaceOwnedSlotPresentation($('#workspace-io-card'),'importExport');
    for (const item of saved.calculators) {
      const session = ensureCalculatorSession(byId.get(item.id)); session.canvasHeight = clampCanvasHeight(item.canvasHeight); session.canvasHeightMode = item.canvasHeightMode==='manual'?'manual':'auto'; session.applyingAssets = true;
      try { session.editor.restore(item.snapshot); } finally { session.applyingAssets = false; }
      if (session.assetProjection && item.assetProjection) { session.assetProjection = {keys:new Set(item.assetProjection.keys),layout:new Map(item.assetProjection.layout),activeRef:item.assetProjection.activeRef}; projectAssetsToSheafComplex(session); }
    }
    objectWorkspace.restorePanels(saved.panels);
    for(const spec of saved.workspace.dockedPanels||[])placeDockedPanel(createDockedPanel(spec),spec.location);
    // Rebuild tab order after all panels exist, including tabs parked behind the active one.
    const mainPanels = new Map(canvases); canvases.clear();
    for (const id of saved.workspace.tabs) {
      if (mainPanels.has(id)) canvases.set(id,mainPanels.get(id));
      else if (id === 'assets') canvases.set(id,{kind:'assets',definition:assetsDefinition,node:ensureAssetsView()});
      else { const session = sessions.get(id); canvases.set(id,{kind:'calculator',definition:session.definition,node:session.host,editor:session.editor,ready:true}); }
    }
    Object.assign(paneCanvases,saved.workspace.panes); splitView = !!saved.workspace.split; focusedPane = saved.workspace.focusedPane; activeCanvasId = paneCanvases[focusedPane] || ''; inspectorSourceId = saved.workspace.inspectorSourceId;
    const nodes = new Map([...$('#workspace-cards').children].map(node => [inspectorNodeKey(node),node]));
    for (const key of saved.workspace.inspectorOrder) if (nodes.has(key||'assets::input')) $('#workspace-cards').append(nodes.get(key||'assets::input'));
    renderAssets(); renderAssetsEditor(); renderCanvasView(); renderInspector();
  }
  function restoreWorkspace(text) {
    const saved = prepareWorkspace(text), before = captureWorkspace();
    restoringWorkspace = true;
    try { applyWorkspaceBackup(saved); }
    catch (error) { applyWorkspaceBackup(before); throw new Error('Workspace import failed; the previous workspace was restored. ' + error.message); }
    finally { restoringWorkspace = false; scheduleDefaultCleanup(); updateImportExport(); }
  }
  function chooseOptions(select, entries, placeholder) {
    const previous = select.value; select.replaceChildren(new Option(placeholder, '')); entries.filter((entry) => !entry.disabled).forEach((entry) => select.appendChild(new Option(entry.label, entry.id)));
    if (Array.from(select.options).some((item) => item.value === previous)) select.value = previous; select.disabled = entries.length === 0;
  }
  function updateImportExport() {
    if (restoringWorkspace) return;
    const entries = objectWorkspace?.ioEntries() || [], exporter = $('#workspace-io-exporter'), importer = $('#workspace-io-importer');
    chooseOptions(exporter, entries.filter(entry => !entry.importOnly), 'Choose an asset or property…');
    const formats = exporter.value ? objectWorkspace.exportFormats(exporter.value) : [];
    chooseOptions($('#workspace-io-format'), formats, 'Default format'); $('#workspace-io-format-row').hidden = formats.length < 2;
    chooseOptions(importer, entries.filter(entry => entry.canImport), 'Choose the destination asset…');
    $('#workspace-io-target').textContent = importer.value === 'workspace' ? 'Importing a complete workspace backup replaces this workspace, including its objects and panels.' : 'Choose a complete workspace backup, an asset, or a property. Object imports update the selected asset.';
    try { $('#workspace-io-output').value = exporter.value ? objectWorkspace.exportText(exporter.value, $('#workspace-io-format').value || 'json') : ''; }
    catch (error) { $('#workspace-io-output').value = error.message; }
    ['export', 'copy', 'download'].forEach(action => { $('#workspace-io-' + action).disabled = !exporter.value; });
    $('#workspace-io-input').disabled = !importer.value;
    $('#workspace-io-import').disabled = !importer.value;
  }
  function initialiseImportExport() {
    const run = action => async () => { try { await action(); } catch (error) { status(error.message, 'error'); } };
    const currentExport = () => objectWorkspace.exportText($('#workspace-io-exporter').value, $('#workspace-io-format').value || 'json');
    $('#workspace-io-format').addEventListener('change', updateImportExport);
    $('#workspace-io-exporter').addEventListener('change', updateImportExport);
    $('#workspace-io-importer').addEventListener('change', updateImportExport);
    $('#workspace-io-export').addEventListener('click', run(() => { $('#workspace-io-output').value = currentExport(); }));
    $('#workspace-io-copy').addEventListener('click', run(async () => {
      const text = currentExport(); await navigator.clipboard.writeText(text);
      $('#workspace-io-output').value = text; status('Copied export data.', 'success');
    }));
    $('#workspace-io-download').addEventListener('click', run(() => {
      const entry = objectWorkspace.ioEntries().find(entry => entry.id === $('#workspace-io-exporter').value), text = currentExport();
      const format = $('#workspace-io-format').value || 'json', extension = format === 'json' || format === 'preset' ? 'json' : format === 'latex' ? 'tex' : format === 'sage' ? 'sage' : format === 'macaulay2' ? 'm2' : 'txt';
      const url = URL.createObjectURL(new Blob([text], { type: extension === 'json' ? 'application/json' : 'text/plain' })), link = document.createElement('a');
      link.href = url; link.download = entry.filename.replace(/\.json$/, '.' + extension); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }));
    $('#workspace-io-import').addEventListener('click', run(() => {
      const key = $('#workspace-io-importer').value;
      objectWorkspace.importText(key, $('#workspace-io-input').value);
      const entry = objectWorkspace.ioEntries().find(entry => entry.id === key);
      status('Imported into ' + entry.label + '.', 'success');
    }));
  }

  function initialise() {
    panelCatalog = window.MathWorkspacePanelCatalog.create({assets:ASSET_SUBTYPES,definitions:window.MathWorkspaceObjects.definitions,nativePanels:ASSET_CARD_REGISTRY,
      resolveRefs: (id, refs, assets) => {
        const definition = window.MathWorkspaceObjects.definitions.find(item => item.id === id);
        return definition ? window.MathWorkspaceDefaults.panelRefs(definition, refs, assets, (kind, options = {}) => {
          const type = options.type || ASSET_SUBTYPES[kind][0][0], data = normalizedAssetData(kind, type, options.data || {});
          return assets.find(asset => asset.kind === kind && asset.type === type && JSON.stringify(normalizedAssetData(kind, type, asset.data)) === JSON.stringify(data));
        }) : refs;
      }
    });
    window.MathWorkspacePanelRegistry = panelCatalog;
    window.MathWorkspacePrincipalAssets.init({catalog:panelCatalog,changed:()=>{closeAssetsContextMenu();renderCardPicker();}});
    initialiseObjectPanels();
    initialiseImportExport();
    const picker = $('#workspace-open-canvas'); picker.appendChild(new Option('Open view…', '', true, true));
    const views = document.createElement('optgroup'); views.label = 'Workspace views'; views.appendChild(new Option('Assets', 'assets')); picker.appendChild(views);
    const calculatorGroup = document.createElement('optgroup'); calculatorGroup.label = 'Calculator views';
    calculators.forEach((calculator) => calculatorGroup.appendChild(new Option(calculator.label, calculator.id))); picker.appendChild(calculatorGroup);
    picker.addEventListener('change', () => { if (picker.value) openCanvas(picker.value); picker.value = ''; }); $('#workspace-split-view').addEventListener('click', () => setSplitView(!splitView));
    $('#workspace-io-card').classList.add('workspace-assets-inspector-card'); installWorkspaceOwnedCardChrome($('#workspace-io-card'), 'importExport'); enableWorkspaceOwnedCardDragging();
    $('#workspace-add-card').addEventListener('click', () => $('#workspace-card-picker').hidden ? openCardPicker() : closeCardPicker());
    document.querySelectorAll('[data-pane]').forEach((pane) => pane.addEventListener('pointerdown', () => focusCanvasPane(pane.dataset.pane)));
    $('#workspace-canvas-resizer').addEventListener('pointerdown', beginCanvasResize);
    $('#workspace-canvas-resizer').addEventListener('keydown', handleCanvasResizeKeydown);
    document.addEventListener('pointerdown', (event) => { if (!$('#workspace-assets-context-menu').hidden && !$('#workspace-assets-context-menu').contains(event.target)) closeAssetsContextMenu(); const picker = assetState.referencePicker; if (picker && !picker.node.contains(event.target) && !picker.control.contains(event.target)) closeReferencePicker(); }, true);
    window.addEventListener('blur', () => { closeAssetsContextMenu(); closeReferencePicker(); }); window.addEventListener('resize', () => { updateCanvasHeightLayout(); closeAssetsContextMenu(); closeCardPicker(); closeReferencePicker(); });
    document.querySelectorAll('[data-workspace-io-tab]').forEach((tab) => tab.addEventListener('click', () => { const name = tab.dataset.workspaceIoTab; document.querySelectorAll('[data-workspace-io-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === tab))); $('#workspace-io-export-panel').hidden = name !== 'export'; $('#workspace-io-import-panel').hidden = name !== 'import'; }));
    openCanvas('assets');
    const creationEntries=window.MathWorkspaceCreation.catalog(ASSET_SUBTYPES,window.MathWorkspaceObjects.kindLabels);
    creationPicker = window.MathWorkspaceCreation.init({entries:creationEntries,create:createAsset,dependencies:creationDependencies,capabilities:()=>assetState.snapshot.capabilities,returnFocus:()=>assetState.view});
    window.MathWorkspaceEmptyCreateLab?.init(openAssetsCreationPicker);
    window.MathWorkspaceSubjectAssignments.init({entries:creationEntries,assignments:creationPicker.assignments});
    designLab = window.MathWorkspaceDesignLab.init({
      render: renderAssets,
      mount(node) {
        $('#workspace-cards').prepend(node);
        createDockedPanel({id:DESIGN_LAB_ID,key:node.id,source:'sidebar'});
        const current = () => dockedPanels.get(DESIGN_LAB_ID) || createDockedPanel({id:DESIGN_LAB_ID,key:node.id,source:'sidebar'});
        installWorkspaceOwnedCardChrome(node,'design-lab',{hide:()=>placeDockedPanel(current(),'hidden'),actions:[['move-area','Move to main area','↗',()=>placeDockedPanel(current(),'main')]]});
        const head=node.querySelector('.card-head');
        const toggle=event=>{if(!shouldToggleWorkspaceOwnedCard(event,node))return;node.classList.toggle('collapsed');head.setAttribute('aria-expanded',String(!node.classList.contains('collapsed')));};
        head.addEventListener('click',toggle);head.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(event);}});
      },
      show(node) {const record=dockedPanels.get(DESIGN_LAB_ID)||createDockedPanel({id:DESIGN_LAB_ID,key:node.id,source:'sidebar'});placeDockedPanel(record,'side');node.hidden=false;node.scrollIntoView({block:'nearest'});},
      remove(node) {if(canvases.has(DESIGN_LAB_ID))closeCanvas(DESIGN_LAB_ID);dockedPanels.delete(DESIGN_LAB_ID);byId.delete(DESIGN_LAB_ID);node.remove();renderCardPicker();}
    });
  }

  window.MathWorkspaceAssetsTest = { assetKey, layouts: ASSET_LAYOUTS.slice(), selectAssetKey, orderedAssets, state: assetState, assetRequest, renderAssetsEditor, canonicalAssetName, normalizedAssetData, validateAssetData, referenceFieldSpecs, referenceEligibility, referenceWouldCreateCycle, referenceDragKey, isDirectSheafType, inferredSheafBase, assetMathSignature, invalidateDerivedAssetProperties, createAssetPropertyCommand, commitAssetPropertyCommand, captureAndCommitAssetPropertyCommand, captureSheafComplexLayout, cardSupportsAsset, assetCardInstanceKey, ASSET_CARD_REGISTRY, NATIVE_ASSET_CARD_TYPES, assetsCardState, assetsUtilitySlots, assetInputCardTitleState, createAssetsCardCoordinator, planAssetPropertySlotBinding, bindAssetPropertySlot, handleAssetPropertySessionChange, createAssetInputInstance, bindAssetInputInstance, activeAssetInputInstance, assetInputInstanceForRef, validateAssetInputDraft, createAssetInputCommitCommand, commitAssetInputCommand, resolveAssetInputConflict, updateAssetInputDraft, scheduleAssetInputAutosave, flushAssetInputInstance, cancelAssetInputAutosave, queueAssetInputAutosave, drainAssetInputQueue, removeAssetInputInstances, acceptAssetInputAsyncResult, markAffectedAssetPropertyInstances, reprojectActiveAssetPropertySlots, INPUT_AUTOSAVE_DEBOUNCE_MS, INPUT_AUTOSAVE_MAX_WAIT_MS, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeightFor, sessions };
  Object.assign(window.MathWorkspaceAssetsTest, { createObjectAsset, updateObjectAsset, localAssetSnapshot, applyAssetSnapshot, openCanvas, closeCanvas, setSplitView, selectCanvasTab });
  document.addEventListener('DOMContentLoaded', initialise);
}());
