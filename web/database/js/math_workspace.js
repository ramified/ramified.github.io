(function () {
  'use strict';

  const calculators = [
    ['young', 'Young diagrams', 'young'],
    ['double-young', 'Double Young diagrams', 'double-young'],
    ['slicing', 'Higher-dimensional slicing', 'slice'],
    ['dynkin', 'Dynkin diagrams', 'dynkin'],
    ['strands', 'Strands', 'strand'],
    ['matrices', 'Matrices', 'matrix'],
    ['sheaf-complexes', 'Sheaf complexes', 'complex'],
    ['mosaic', 'Mosaic', 'mosaic'],
    ['categories', 'Categories', 'category'],
    ['places', 'Place ramification', 'ramification']
  ].map(([id, label, nativeId]) => ({ id, label, nativeId, kind: 'calculator' }));
  const assetsDefinition = { id: 'assets', label: 'Assets', kind: 'assets' };
  const byId = new Map([...calculators, assetsDefinition].map((item) => [item.id, item]));
  const canvases = new Map(), sessions = new Map(), liveCards = new Map();
  const paneCanvases = { primary: '', secondary: '' };
  let activeCanvasId = '', focusedPane = 'primary', splitView = false, inspectorSourceId = '', cardPickerSourceId = '';
  const DEFAULT_CANVAS_HEIGHT = 680, MIN_CANVAS_HEIGHT = 420, MAX_CANVAS_HEIGHT = 1600;
  const ASSET_LAYOUTS = ['icons', 'list', 'details', 'tiles', 'content'];
  const ASSET_KINDS = ['variety', 'sheaf', 'map'];
  const INPUT_AUTOSAVE_DEBOUNCE_MS = 450, INPUT_AUTOSAVE_MAX_WAIT_MS = 1500;
  const assetState = {
    ready: true, editorCard: null, editorRecord: null, editorMode: 'create', activeInputInstanceKey: null, view: null,
    snapshot: { revision: 0, assets: [], capabilities: { variety: true, sheaf: false, map: false } },
    layout: 'icons', sort: 'creation', direction: 'asc', selected: new Set(), anchor: '', metadata: new Map(),
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
    input: Object.freeze({ cardType: 'input', label: 'Input', nativeCardKey: null, supportedKinds: Object.freeze(['variety', 'sheaf', 'map']) }),
    hodge: Object.freeze({ cardType: 'hodge', label: 'Hodge Numbers', nativeCardKey: 'hodge-card', supportedKinds: Object.freeze(['variety']) }),
    betti: Object.freeze({ cardType: 'betti', label: 'Betti Table', nativeCardKey: 'betti-card', supportedKinds: Object.freeze(['variety']) }),
    homology: Object.freeze({ cardType: 'homology', label: 'Homology Classes', nativeCardKey: 'homology-card', supportedKinds: Object.freeze(['variety', 'sheaf', 'map']) }),
    'characteristic-classes': Object.freeze({ cardType: 'characteristic-classes', label: 'Characteristic Classes', nativeCardKey: 'class-card', supportedKinds: Object.freeze(['sheaf']) }),
    'sheaf-cohomology': Object.freeze({ cardType: 'sheaf-cohomology', label: 'Sheaf Cohomology', nativeCardKey: 'cohomology-card', supportedKinds: Object.freeze(['sheaf']) })
  });
  const NATIVE_ASSET_CARD_TYPES = Object.freeze(Object.keys(ASSET_CARD_REGISTRY).filter((cardType) => ASSET_CARD_REGISTRY[cardType].nativeCardKey));
  const ASSET_PROPERTY_CARDS = new Set(NATIVE_ASSET_CARD_TYPES.map((cardType) => ASSET_CARD_REGISTRY[cardType].nativeCardKey));
  const cardSupportsAsset = (cardType, assetKind) => ASSET_CARD_REGISTRY[cardType]?.supportedKinds.includes(assetKind) === true;
  const assetCardInstanceKey = (targetRef, cardType) => `asset:${targetRef?.kind || ''}:${targetRef?.id || ''}:${cardType}`;
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
        if (options.onChange) options.onChange(editor, change);
        else if (calculator.id === activeCanvasId) updateImportExport();
      },
      createAssetPropertyCommand: options.createAssetPropertyCommand,
      validateAssetCardBinding: options.validateAssetCardBinding,
      onCollectAssets: () => options.onCollectAssets?.(editor),
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
        onChange: (_editor, change) => {
          if (!session || session.applyingAssets) return;
          captureSheafComplexLayout(session);
          if (change?.interaction === 'canvas-appearance' || change?.interaction === 'canvas-appearance-live' || change?.interaction === 'card-chrome') return;
          projectAssetsToSheafComplex(session);
        }
      } : {};
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
    return clampCanvasHeight(sessions.get(id)?.canvasHeight);
  }
  function visibleCanvasIds() {
    return (splitView ? [paneCanvases.primary, paneCanvases.secondary] : [paneCanvases.primary]).filter(Boolean);
  }
  function updateCanvasHeightLayout() {
    const view = document.querySelector('.workspace-view-card'), panes = $('#workspace-canvas-panes'), resizer = $('#workspace-canvas-resizer');
    if (!view || !panes || !resizer) return;
    const ids = visibleCanvasIds(), outerHeight = ids.length ? Math.max(...ids.map(canvasHeightFor)) : DEFAULT_CANVAS_HEIGHT;
    view.style.setProperty('--workspace-view-height', `${outerHeight}px`);
    const focusedHeight = activeCanvasId ? canvasHeightFor(activeCanvasId) : DEFAULT_CANVAS_HEIGHT;
    resizer.setAttribute('aria-valuenow', String(focusedHeight));
    resizer.setAttribute('aria-disabled', String(!activeCanvasId));
    resizer.tabIndex = activeCanvasId ? 0 : -1;
    const applyPaneHeights = () => {
      const chromeHeight = Math.max(0, view.getBoundingClientRect().height - panes.getBoundingClientRect().height);
      ids.forEach((id) => {
        const node = canvases.get(id)?.node;
        if (node) node.style.setProperty('--workspace-session-pane-height', `${Math.max(0, canvasHeightFor(id) - chromeHeight)}px`);
      });
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(applyPaneHeights); else setTimeout(applyPaneHeights, 0);
  }
  function setCanvasHeight(id, height) {
    const next = clampCanvasHeight(height);
    if (id === 'assets') assetState.canvasHeight = next;
    else {
      const session = sessions.get(id);
      if (!session) return;
      session.canvasHeight = next;
    }
    updateCanvasHeightLayout();
  }
  function beginCanvasResize(event) {
    if (!activeCanvasId || event.button !== 0) return;
    event.preventDefault();
    const resizer = event.currentTarget, id = activeCanvasId, startingHeight = canvasHeightFor(id), startingY = event.clientY;
    resizer.setPointerCapture?.(event.pointerId);
    const resize = (move) => setCanvasHeight(id, startingHeight + move.clientY - startingY);
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
    if (event.key === 'ArrowUp') { event.preventDefault(); setCanvasHeight(activeCanvasId, canvasHeightFor(activeCanvasId) - step); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setCanvasHeight(activeCanvasId, canvasHeightFor(activeCanvasId) + step); }
    else if (event.key === 'Home') { event.preventDefault(); setCanvasHeight(activeCanvasId, MIN_CANVAS_HEIGHT); }
    else if (event.key === 'End') { event.preventDefault(); setCanvasHeight(activeCanvasId, MAX_CANVAS_HEIGHT); }
  }

  function renderInspector() {
    sessions.forEach((session) => {
      const hasVisibleCard = session.editor?.listCards?.().some((card) => card.available !== false && card.visible);
      session.editor?.setInspectorActive?.(!!hasVisibleCard);
    });
    NATIVE_ASSET_CARD_TYPES.forEach((cardType) => {
      const slot = assetsCardState.slots.get(cardType), session = slot?.rendererSession;
      if (!session) return;
      const cardKey = ASSET_CARD_REGISTRY[cardType].nativeCardKey;
      const instance = assetsCardState.instances.get(slot.activeInstanceKey);
      const hasVisibleCard = session.editor?.listCards?.().some((card) => card.key === cardKey && card.available !== false && card.visible);
      session.editor?.setInspectorActive?.(!!slot.visible && !!instance && !!hasVisibleCard);
    });
    $('#workspace-io-card').hidden = !workspaceOwnedCardSlot('importExport').visible;
    if (assetState.editorCard) assetState.editorCard.hidden = !workspaceOwnedCardSlot('input').visible;
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
    const definition = byId.get(id);
    if (!definition) return;
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
    canvases.forEach((entry, id) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', className: `workspace-canvas-tab${id === activeCanvasId ? ' active' : ''}`, textContent: entry.definition.label });
      button.dataset.canvasTab = id; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(id === activeCanvasId));
      button.addEventListener('click', () => selectCanvasTab(id));
      const close = Object.assign(document.createElement('button'), { type: 'button', className: 'workspace-canvas-tab-close', textContent: '×', title: `Close ${entry.definition.label}` });
      close.setAttribute('aria-label', close.title); close.addEventListener('click', (event) => { event.stopPropagation(); closeCanvas(id); });
      const tab = Object.assign(document.createElement('div'), { className: 'workspace-canvas-tab-group' }); tab.append(button, close); host.appendChild(tab);
    });
  }

  function renderCanvasView() {
    const panes = $('#workspace-canvas-panes'), primary = $('#workspace-canvas-pane-primary'), secondary = $('#workspace-canvas-pane-secondary'), parking = $('#workspace-canvas-parking');
    panes.dataset.split = String(splitView); secondary.hidden = !splitView;
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
    renderCanvasTabs(); renderInspector(); updateCanvasHeightLayout();
  }

  function availableCardsFor(sourceId) {
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
    if (sourceId === 'assets') {
      if (key === 'input' && !visible) flushAssetInputInstance(activeAssetInputInstance());
      const slot = workspaceOwnedCardSlot(key);
      if (!slot) return;
      slot.visible = !!visible;
      // Compatibility observation for older tests/imported session state.
      assetState.cards[key] = !!visible;
      if (key === 'input' && visible) ensureAssetsEditor(false);
      return;
    }
    const definition = byId.get(sourceId);
    if (definition?.kind === 'calculator') {
      const session = ensureCalculatorSession(definition);
      if (session.assetProjection?.keys.size && ASSET_PROPERTY_CARDS.has(key)) return;
      session.editor.setCardVisible?.(key, visible);
    }
  }
  function setCardVisibility(sourceId, key, visible) {
    applyCardVisibility(sourceId, key, visible);
    renderInspector(); renderCardPicker();
  }

  function renderCardPicker() {
    const source = $('#workspace-card-source'), options = $('#workspace-card-options');
    if (!source || !options) return;
    const preferred = cardPickerSourceId || inspectorSourceId || activeCanvasId || 'assets';
    cardPickerSourceId = preferred;
    source.replaceChildren(new Option('Assets', 'assets'), ...calculators.map((calculator) => new Option(calculator.label, calculator.id)));
    source.value = preferred;
    const cards = availableCardsFor(preferred), session = sessions.get(preferred); options.replaceChildren();
    const appendCard = (card) => {
      const row = Object.assign(document.createElement('label'), { className: 'workspace-check workspace-card-option' });
      const available = card.available !== false;
      const onScreen = preferred === 'assets' || !session?.inspectorHost?.hidden;
      const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: onScreen && available && !!card.visible, disabled: !available });
      check.addEventListener('change', () => setCardVisibility(preferred, card.key, check.checked));
      row.append(check, document.createTextNode(available ? card.label : `${card.label} — ${card.unavailableReason || 'unavailable for the current selection'}`)); options.appendChild(row);
    };
    const legacy = preferred === 'sheaf-complexes' ? new Set(['input-card', 'homology-card']) : new Set();
    cards.filter((card) => card.available !== false && !legacy.has(card.key)).forEach(appendCard);
    const legacyCards = cards.filter((card) => card.available !== false && legacy.has(card.key));
    if (legacyCards.length) {
      options.appendChild(Object.assign(document.createElement('div'), { className: 'workspace-card-options-legacy', textContent: 'Will be removed next version' }));
      legacyCards.forEach(appendCard);
    }
    const unavailable = cards.filter((card) => card.available === false);
    if (unavailable.length) {
      options.appendChild(Object.assign(document.createElement('div'), { className: 'workspace-card-options-unavailable', textContent: 'Unavailable for current selection' }));
      unavailable.forEach(appendCard);
    }
    if (preferred === 'assets') renderInspector();
  }

  function closeCardPicker() {
    const picker = $('#workspace-card-picker'); if (picker.hidden) return false;
    picker.hidden = true; $('#workspace-add-card').setAttribute('aria-expanded', 'false'); return true;
  }

  function openCardPicker() {
    cardPickerSourceId = inspectorSourceId || activeCanvasId || 'assets'; renderCardPicker();
    const picker = $('#workspace-card-picker'), button = $('#workspace-add-card'), rect = button.getBoundingClientRect();
    picker.hidden = false; picker.style.left = `${Math.max(8, Math.min(rect.right - 310, window.innerWidth - 318))}px`; picker.style.top = `${Math.min(rect.bottom + 7, window.innerHeight - 120)}px`;
    button.setAttribute('aria-expanded', 'true'); $('#workspace-card-source').focus();
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
  function installWorkspaceOwnedCardChrome(card, key) {
    if (!card || card.dataset.workspaceOwnedChrome) return;
    card.dataset.workspaceOwnedChrome = key;
    const head = card.querySelector('.card-head'); if (!head) return;
    if (!head.querySelector('.drag-handle')) head.insertBefore(Object.assign(document.createElement('span'), { className: 'drag-handle', textContent: '⋮⋮' }), head.firstChild).setAttribute('aria-hidden', 'true');
    const tools = Object.assign(document.createElement('span'), { className: 'workspace-card-tools' });
    const hide = () => {
      const slot = workspaceOwnedCardSlot(key); if (!slot) return;
      slot.visible = false; assetState.cards[key] = false; renderInspector(); renderCardPicker(); refreshWorkspaceOwnedCardChrome();
    };
    [['move-up', 'Move up', '↑', () => moveWorkspaceOwnedCard(card, -1)], ['move-down', 'Move down', '↓', () => moveWorkspaceOwnedCard(card, 1)], ['hide', 'Hide card', '×', hide]].forEach(([actionKey, label, glyph, action]) => {
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

  function enableWorkspaceOwnedCardDragging() {
    const container = $('#workspace-cards');
    if (!container || container.dataset.workspaceOwnedDragReady) return;
    container.dataset.workspaceOwnedDragReady = 'true';
    container.addEventListener('pointerdown', (event) => {
      const path = event.composedPath?.() || [event.target];
      const handle = path.find((node) => node?.classList?.contains('drag-handle'));
      const card = path.find((node) => node?.parentElement === container && (node.classList?.contains('workspace-assets-inspector-card') || node.dataset?.assetCardSlot));
      if (!handle || !card || card.parentElement !== container || event.button !== 0) return;
      const drag = { card, startY: event.clientY, active: false };
      const move = (moveEvent) => {
        if (!drag.active && Math.abs(moveEvent.clientY - drag.startY) < 4) return;
        drag.active = true;
        card.classList.add('workspace-card-dragging');
        const siblings = workspaceOwnedAssetCards().filter((item) => item !== card);
        const before = siblings.find((item) => {
          const rect = item.getBoundingClientRect();
          return moveEvent.clientY < rect.top + rect.height / 2;
        });
        if (before) container.insertBefore(card, before); else container.appendChild(card);
      };
      const finish = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', finish);
        document.removeEventListener('pointercancel', finish);
        if (drag.active) {
          card.classList.remove('workspace-card-dragging');
          card.dataset.workspaceCardDragSuppressed = 'true';
          syncWorkspaceOwnedCardOrder();
          refreshWorkspaceOwnedCardChrome();
          setTimeout(() => delete card.dataset.workspaceCardDragSuppressed, 0);
        }
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', finish);
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
    content.addEventListener('contextmenu', handleAssetsContextMenu); content.addEventListener('pointerdown', beginAssetMarquee);
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
        <div class="workspace-form-grid"><label class="workspace-field workspace-field-inline"><span class="input-label">Mode</span><select class="workspace-control" data-assets-mode><option value="create">Create</option><option value="modify">Modify</option></select></label><label class="workspace-field workspace-field-inline"><span class="input-label">Object</span><select class="workspace-control" data-assets-kind><option value="variety">Variety</option><option value="sheaf">Sheaf</option><option value="map">Map</option></select></label></div>
        <label class="workspace-field workspace-field-inline"><span class="input-label">Name</span><input class="workspace-control workspace-code-control" data-assets-name type="text" value="X" maxlength="80" spellcheck="false"></label>
        <label class="workspace-field workspace-field-inline"><span class="input-label">Type</span><select class="workspace-control" data-assets-subtype></select></label>
        <div class="workspace-form-fields" data-assets-fields></div>
        <div class="workspace-form-actions"><button class="btn" type="submit" data-assets-save>save now</button><button class="btn btn-ghost" type="button" data-assets-delete hidden>delete</button></div>
        <p class="workspace-status" data-assets-editor-status role="status" aria-live="polite"></p>
      </form>`;
    const form = card.querySelector('[data-assets-editor]');
    form.querySelector('[data-assets-mode]').addEventListener('change', (event) => {
      assetState.editorMode = event.target.value;
      if (event.target.value === 'create') {
        flushAssetInputInstance(activeAssetInputInstance());
        assetState.activeInputInstanceKey = null; assetsCardState.slots.get('input').activeInstanceKey = null;
      }
      renderAssetsEditor();
    });
    form.querySelector('[data-assets-kind]').addEventListener('change', () => { if (!activeAssetInputInstance()) renderAssetsEditor(); });
    form.addEventListener('input', (event) => {
      if (!event.target.matches('[data-assets-name],[data-assets-field]') || event.target.matches('select,input[type="checkbox"],input[type="radio"]')) return;
      captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: false });
    });
    form.addEventListener('change', (event) => {
      if (event.target.matches('[data-assets-subtype]')) {
        captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: true, type: event.target.value });
        renderAssetsEditorFields();
      } else if (event.target.matches('select[data-assets-field],input[type="checkbox"][data-assets-field],input[type="radio"][data-assets-field]')) {
        captureAssetInputDraftFromForm(form.dataset.inputInstanceKey, Number(form.dataset.rendererEpoch), { immediate: true });
      }
    });
    form.addEventListener('focusout', (event) => {
      if (!event.target.matches('[data-assets-name],[data-assets-field],[data-assets-reference]')) return;
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
    variety: [['abstract', 'Abstract variety'], ['curve', 'Curve'], ['symmetric-product-curve', 'Symmetric product of a curve'], ['abelian', 'Abelian variety'], ['ppav-moduli', 'Moduli of ppav'], ['point', 'Point'], ['projective', 'Projective space'], ['grassmannian', 'Grassmannian'], ['complete-intersection', 'Complete intersection'], ['product', 'Product of varieties']],
    sheaf: [['abstract', 'Abstract sheaf'], ['locally-free', 'Locally free sheaf'], ['structure', 'Structure sheaf'], ['tangent', 'Tangent sheaf'], ['cotangent', 'Cotangent sheaf'], ['canonical', 'Canonical sheaf'], ['twist', 'Twist'], ['divisor-line', 'Divisor line bundle'], ['universal-bundle', 'Universal bundle'], ['direct-sum', 'Direct sum'], ['self-direct-sum', 'Self direct sum'], ['self-tensor-product', 'Self tensor product'], ['dual', 'Dual sheaf'], ['internal-hom', 'Internal Hom'], ['ideal-sheaf', 'Ideal sheaf'], ['normal-bundle', 'Normal bundle'], ['conormal-bundle', 'Conormal bundle'], ['relative-tangent', 'Relative tangent'], ['relative-cotangent', 'Relative cotangent'], ['tensor', 'Tensor product'], ['schur', 'Schur functor'], ['map-operation', 'Pullback / pushforward']],
    map: [['ordinary', 'Map of varieties'], ['sheaf', 'Map of sheaves'], ['abel-jacobi', 'Abel–Jacobi map'], ['composition', 'Composition of maps']]
  };
  const plainAssetName = (value) => String(value || '').replace(/\\(?:mathcal|mathbf|mathrm|operatorname)\s*\{([^}]*)\}/g, '$1').replace(/[{}$\\]/g, '').replace(/[_^]/g, ' ').replace(/\s+/g, ' ').trim();
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
  const localAssetSnapshot = () => ({ revision: assetState.snapshot.revision, assets: assetState.snapshot.assets.map((asset) => ({ ...asset, dependencies: (asset.dependencies || []).map((ref) => ({ ...ref })), data: { ...(asset.data || {}) }, properties: cloneAssetProperties(asset.properties) })), capabilities: { variety: true, sheaf: assetState.snapshot.assets.some((asset) => asset.kind === 'variety'), map: assetState.snapshot.assets.some((asset) => asset.kind === 'variety') } });
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
    if (!instance || instance !== activeAssetInputInstance() || instance.rendererEpoch !== rendererEpoch || form?.dataset.inputInstanceKey !== instanceKey || Number(form.dataset.rendererEpoch) !== rendererEpoch) return false;
    const draft = cloneInputDraft({
      ...instance.draft,
      name: form.querySelector('[data-assets-name]').value,
      type: options.type || form.querySelector('[data-assets-subtype]').value,
      data: assetEditorData(instance)
    });
    if (JSON.stringify(draft) === JSON.stringify(instance.draft)) return true;
    return updateAssetInputDraft(instance, draft, options);
  }
  const fieldHtml = (label, name, value = '', type = 'text', options = {}) => `<label class="workspace-field workspace-field-inline"><span class="input-label">${label}</span><input class="workspace-control${type === 'text' ? ' workspace-code-control' : ''}" data-assets-field="${name}" type="${type}" value="${String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"${options.readOnly ? ' readonly aria-readonly="true"' : ''}></label>`;
  const assetByKey = (key, kind = '') => assetState.snapshot.assets.find((asset) => assetKey(asset) === key && (!kind || asset.kind === kind)) || null;
  const DIRECT_SHEAF_TYPES = new Set(['abstract', 'locally-free', 'structure', 'tangent', 'cotangent', 'canonical', 'twist', 'divisor-line', 'universal-bundle']);
  const MAP_BASE_ENDPOINT = { 'ideal-sheaf': 'codomain', 'normal-bundle': 'domain', 'conormal-bundle': 'domain', 'relative-tangent': 'domain', 'relative-cotangent': 'domain' };
  const isDirectSheafType = (type) => DIRECT_SHEAF_TYPES.has(type);
  function inferredSheafBase(type, data = {}) {
    if (isDirectSheafType(type)) return data.base || '';
    if (['direct-sum', 'tensor', 'internal-hom'].includes(type)) {
      const first = assetByKey(data.first, 'sheaf'), second = assetByKey(data.second, 'sheaf');
      return first?.data?.base && first.data.base === second?.data?.base ? first.data.base : '';
    }
    if (['dual', 'self-direct-sum', 'self-tensor-product', 'schur'].includes(type)) return assetByKey(data.parent, 'sheaf')?.data?.base || '';
    const map = assetByKey(data.map, 'map');
    const endpoint = type === 'map-operation' ? (data.operation === 'pushforward' ? 'codomain' : 'domain') : MAP_BASE_ENDPOINT[type];
    const base = endpoint ? map?.data?.[endpoint] : '';
    return assetByKey(base, 'variety') ? base : '';
  }
  const nonnegativeInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : fallback;
  const positiveInt = (value, fallback = 1) => Math.max(1, nonnegativeInt(value, fallback));
  function degreeList(value) {
    return String(value ?? '').split(/[,\s]+/).filter(Boolean).map((entry) => positiveInt(entry, 0)).filter(Boolean);
  }
  function varietyDimension(asset) {
    return nonnegativeInt(asset?.data?.dimension, 0);
  }
  function normalizedAssetData(kind, type, source = {}) {
    const data = { ...source };
    if (kind === 'variety') {
      if (type === 'point') data.dimension = '0';
      else if (type === 'curve') { data.dimension = '1'; data.genus = String(nonnegativeInt(data.genus, 2)); }
      else if (type === 'symmetric-product-curve') { data.power = String(positiveInt(data.power, 3)); data.genus = String(nonnegativeInt(data.genus, 2)); data.dimension = data.power; }
      else if (type === 'ppav-moduli') { const genus = positiveInt(data.genus, 2); data.genus = String(genus); data.dimension = String((genus * (genus + 1)) / 2); }
      else if (type === 'grassmannian') { const r = positiveInt(data.r, 2), n = Math.max(r, positiveInt(data.n, 4)); data.r = String(r); data.n = String(n); data.dimension = String(r * (n - r)); }
      else if (type === 'complete-intersection') { const degrees = degreeList(data.degrees || '2, 3'); const ambient = nonnegativeInt(data.ambientDimension, 4); data.degrees = degrees.join(', '); data.ambientDimension = String(ambient); data.dimension = String(Math.max(0, ambient - degrees.length)); }
      else if (type === 'product') { const left = assetByKey(data.first, 'variety'), right = assetByKey(data.second, 'variety'); data.dimension = left && right ? String(varietyDimension(left) + varietyDimension(right)) : ''; }
      else data.dimension = String(nonnegativeInt(data.dimension, 3));
    } else if (kind === 'sheaf') {
      if (['abstract', 'locally-free'].includes(type)) data.rank = String(positiveInt(data.rank, 1));
      if (type === 'twist') data.twist = String(Math.round(Number(data.twist) || 0));
      if (!isDirectSheafType(type)) data.base = inferredSheafBase(type, data);
    }
    return data;
  }
  const ASSET_DRAG_TYPE = 'application/x-math-workspace-asset';
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function referenceFieldSpecs(kind, type) {
    if (kind === 'variety') return type === 'product' ? [{ field: 'first', label: 'First factor', expectedKind: 'variety' }, { field: 'second', label: 'Second factor', expectedKind: 'variety' }] : [];
    if (kind === 'sheaf') {
      const specs = isDirectSheafType(type) ? [{ field: 'base', label: 'Base variety', expectedKind: 'variety' }] : [];
      if (['direct-sum', 'tensor', 'internal-hom'].includes(type)) specs.push({ field: 'first', label: 'First sheaf', expectedKind: 'sheaf', distinctFrom: 'second' }, { field: 'second', label: 'Second sheaf', expectedKind: 'sheaf', distinctFrom: 'first' });
      if (['dual', 'self-direct-sum', 'self-tensor-product', 'schur'].includes(type)) specs.push({ field: 'parent', label: 'Parent sheaf', expectedKind: 'sheaf' });
      if (MAP_BASE_ENDPOINT[type] || type === 'map-operation') specs.push({ field: 'map', label: 'Source map', expectedKind: 'map' });
      return specs;
    }
    const expectedKind = type === 'sheaf' ? 'sheaf' : type === 'composition' ? 'map' : 'variety';
    return [{ field: 'domain', label: type === 'composition' ? 'First map' : 'Domain', expectedKind }, { field: 'codomain', label: type === 'composition' ? 'Second map' : 'Codomain', expectedKind }];
  }
  function referenceKeys(kind, type, data) {
    return [...new Set(referenceFieldSpecs(kind, type).map((spec) => data[spec.field]).filter(Boolean))];
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
    if (candidate.kind !== spec.expectedKind) return { allowed: false, reason: 'type' };
    if (candidateKey === context.currentKey) return { allowed: false, reason: 'self' };
    if (spec.distinctFrom && candidateKey && candidateKey === context.data[spec.distinctFrom]) return { allowed: false, reason: 'duplicate' };
    const projected = normalizedAssetData(context.kind, context.type, { ...context.data, [spec.field]: candidateKey });
    if (referenceWouldCreateCycle(context.currentKey, candidateKey, context.kind, context.type, projected)) return { allowed: false, reason: 'cycle' };
    return { allowed: true, asset: candidate };
  }
  function eligibleReferenceAssets(spec, context) {
    return assetState.snapshot.assets.filter((asset) => referenceEligibility(spec, assetKey(asset), context).allowed);
  }
  function referenceContext(form) {
    const kind = form.querySelector('[data-assets-kind]').value, type = form.querySelector('[data-assets-subtype]').value;
    const instance = activeAssetInputInstance(), record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    return { kind, type, currentKey: record ? assetKey(record) : '', data: normalizedAssetData(kind, type, { ...(instance?.draft?.data || {}), ...assetEditorData(instance) }) };
  }
  function referenceFieldHtml(spec, context) {
    const selected = referenceEligibility(spec, context.data[spec.field], context).asset;
    const eligible = eligibleReferenceAssets(spec, context);
    const text = selected ? `\\(${escapeHtml(selected.name)}\\)` : `Choose ${spec.expectedKind}…`;
    const label = selected ? `${spec.label}: ${selected.plainName || selected.name}` : `${spec.label}: choose a ${spec.expectedKind}`;
    return `<label class="workspace-field workspace-field-inline"><span class="input-label">${spec.label}</span><button class="workspace-control workspace-reference-control" type="button" data-assets-reference="${spec.field}" data-assets-reference-value="${selected ? assetKey(selected) : ''}" data-assets-expected-kind="${spec.expectedKind}" data-assets-reference-label="${escapeHtml(spec.label)}" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(label)}"${eligible.length ? '' : ' disabled'}><span class="workspace-reference-value${selected ? ' workspace-reference-math' : ''}">${text}</span><span class="workspace-reference-arrow" aria-hidden="true">⌄</span></button></label>`;
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
      const label = kind === 'sheaf' ? 'Sheaf' : kind === 'map' ? 'Map' : 'Variety';
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
    const form = editorForm(); if (!form) return;
    const instance = activeAssetInputInstance(), record = instance ? assetByKey(assetKey(instance.targetRef)) : null;
    if (record) assetState.editorMode = 'modify';
    const draft = instance?.draft || cloneInputDraft({ name: '', kind: form.querySelector('[data-assets-kind]').value || 'variety', type: '', data: {} });
    const kind = record?.kind || draft.kind || 'variety';
    const subtype = draft.type || record?.type || ASSET_SUBTYPES[kind][0][0];
    if (instance) instance.rendererEpoch += 1;
    form.dataset.inputInstanceKey = instance?.key || '';
    form.dataset.rendererEpoch = String(instance?.rendererEpoch || 0);
    form.querySelector('[data-assets-mode]').value = assetState.editorMode;
    form.querySelector('[data-assets-kind]').value = kind; form.querySelector('[data-assets-kind]').disabled = !!record;
    updateAssetsInputCardTitle(instance, kind);
    form.querySelector('[data-assets-name]').value = instance ? draft.name : (kind === 'variety' ? 'X' : kind === 'sheaf' ? '\\mathcal{E}' : 'f');
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
    const currentKey = record ? assetKey(record) : '', rawData = { ...(instance?.draft?.data || {}) }, data = { ...normalizedAssetData(kind, type, rawData), ...rawData }, fields = form.querySelector('[data-assets-fields]'); let html = '';
    const context = { kind, type, currentKey, data };
    if (kind === 'variety') {
      const derivedDimension = ['curve', 'symmetric-product-curve', 'ppav-moduli', 'grassmannian', 'complete-intersection', 'product'].includes(type);
      html += fieldHtml('Dimension', 'dimension', data.dimension ?? 3, 'number', { readOnly: type === 'point' || derivedDimension });
      if (['curve', 'symmetric-product-curve', 'ppav-moduli'].includes(type)) html += fieldHtml('Genus', 'genus', data.genus ?? 2, 'number');
      if (type === 'symmetric-product-curve') html += fieldHtml('Symmetric power m', 'power', data.power ?? 3, 'number');
      if (type === 'grassmannian') html += fieldHtml('r', 'r', data.r ?? 2, 'number') + fieldHtml('n', 'n', data.n ?? 4, 'number');
      if (type === 'complete-intersection') html += fieldHtml('Ambient dimension', 'ambientDimension', data.ambientDimension ?? 4, 'number') + fieldHtml('Degrees', 'degrees', data.degrees ?? '2, 3');
      referenceFieldSpecs(kind, type).forEach((spec) => { html += referenceFieldHtml(spec, context); });
    } else if (kind === 'sheaf') {
      const specs = referenceFieldSpecs(kind, type);
      specs.filter((spec) => spec.field === 'base').forEach((spec) => { html += referenceFieldHtml(spec, context); });
      if (['abstract', 'locally-free'].includes(type)) html += fieldHtml('Rank', 'rank', data.rank ?? 1, 'number');
      if (type === 'twist') html += fieldHtml('Twist r', 'twist', data.twist ?? 1, 'number');
      if (type === 'map-operation') html += `<label class="workspace-field workspace-field-inline"><span class="input-label">Operation</span><select class="workspace-control" data-assets-field="operation"><option value="pullback"${data.operation === 'pushforward' ? '' : ' selected'}>Pullback</option><option value="pushforward"${data.operation === 'pushforward' ? ' selected' : ''}>Pushforward</option></select></label>`;
      specs.filter((spec) => spec.field !== 'base').forEach((spec) => { html += referenceFieldHtml(spec, context); });
      if (!isDirectSheafType(type)) html += inferredBaseFieldHtml(type, data);
      if (type === 'schur') html += fieldHtml('Partition', 'partition', data.partition ?? '2,1');
    } else {
      referenceFieldSpecs(kind, type).forEach((spec) => { html += referenceFieldHtml(spec, context); });
    }
    fields.innerHTML = html;
    fields.querySelectorAll('[data-assets-reference]').forEach(bindReferenceField);
    if (window.MathJax?.typesetPromise) {
      const instanceKey = instance?.key || '', rendererEpoch = instance?.rendererEpoch || 0, taskGeneration = instance?.taskGeneration || 0;
      window.MathJax.typesetClear?.([fields]);
      window.MathJax.typesetPromise([fields]).then(() => acceptAssetInputAsyncResult(instanceKey, rendererEpoch, taskGeneration), () => {});
    }
  }
  function assetEditorData(instance = activeAssetInputInstance()) {
    const form = editorForm(), data = {};
    form.querySelectorAll('[data-assets-field]').forEach((field) => { data[field.dataset.assetsField] = field.value; });
    form.querySelectorAll('[data-assets-reference]').forEach((field) => {
      const name = field.dataset.assetsReference, value = field.dataset.assetReferenceValue || '';
      // Reference controls are replaced when another reference is chosen.  A
      // transient empty button must never erase a value already kept in the
      // draft (notably the other endpoint of a map).
      if (value || !Object.prototype.hasOwnProperty.call(instance?.draft?.data || {}, name)) data[name] = value;
    });
    return data;
  }
  function validateAssetData(kind, type, data, currentKey) {
    const context = { kind, type, data, currentKey };
    referenceFieldSpecs(kind, type).forEach((spec) => {
      const result = referenceEligibility(spec, data[spec.field], context);
      if (!result.allowed) throw new Error(`${spec.label} must reference an allowed ${spec.expectedKind}.`);
    });
    if (kind === 'variety') {
      if (type === 'complete-intersection' && nonnegativeInt(data.ambientDimension, 0) < degreeList(data.degrees).length) throw new Error('Ambient dimension must be at least the number of defining degrees.');
    } else if (kind === 'sheaf') {
      if (['direct-sum', 'tensor', 'internal-hom'].includes(type) && data.first === data.second) throw new Error('Use a self construction instead of selecting the same sheaf twice.');
      if (!isDirectSheafType(type) && !assetByKey(data.base, 'variety')) throw new Error('This construction must determine a compatible base variety.');
      if (['direct-sum', 'tensor', 'internal-hom'].includes(type)) {
        const firstBase = assetByKey(data.first, 'sheaf')?.data?.base, secondBase = assetByKey(data.second, 'sheaf')?.data?.base;
        if (!firstBase || firstBase !== secondBase) throw new Error('Both parent sheaves must have the same base variety.');
      }
    }
  }
  const cloneInputDraft = (draft) => ({
    name: String(draft?.name ?? ''), kind: draft?.kind || 'variety', type: draft?.type || 'abstract', data: { ...(draft?.data || {}) }
  });
  const inputDraftFromRecord = (record) => cloneInputDraft({ name: record?.name || '', kind: record?.kind || 'variety', type: record?.type || 'abstract', data: record?.data || {} });
  function createAssetInputInstance(targetRef, record = assetByKey(assetKey(targetRef)), revision = assetState.snapshot.revision) {
    if (!targetRef || !record || assetKey(targetRef) !== assetKey(record)) throw new Error('The Input target no longer exists.');
    const stableRef = Object.freeze(cloneAssetRef(targetRef));
    return {
      key: assetCardInstanceKey(stableRef, 'input'), targetRef: stableRef, cardType: 'input',
      draft: inputDraftFromRecord(record), dirty: false, validation: { valid: true, message: '', field: '' },
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
      if (numericFields.has(field) && (String(value).trim() === '' || !Number.isFinite(Number(value)) || !Number.isInteger(Number(value)))) return { valid: false, message: `${field} must be a complete integer.`, field };
    }
    if (draft.kind === 'variety' && draft.type === 'complete-intersection' && !/^\s*\d+(?:\s*[, ]\s*\d+)*\s*$/.test(String(draft.data.degrees || ''))) return { valid: false, message: 'Degrees must be a complete list of positive integers.', field: 'degrees' };
    try {
      const data = normalizedAssetData(draft.kind, draft.type, draft.data);
      validateAssetData(draft.kind, draft.type, data, currentKey);
      return { valid: true, message: '', field: '', normalized: { name, kind: draft.kind, type: draft.type, data, dependencies: assetDependencies(draft.kind, draft.type, data) } };
    } catch (error) { return { valid: false, message: error.message, field: '' }; }
  }
  function inputSemanticValue(record) {
    return JSON.stringify({ name: record?.name || '', kind: record?.kind || '', type: record?.type || '', data: record?.data || {}, dependencies: record?.dependencies || [] });
  }
  function createAssetInputCommitCommand(instance) {
    const validation = validateAssetInputDraft(instance);
    instance.validation = { valid: validation.valid, message: validation.message, field: validation.field || '' };
    if (!validation.valid) return null;
    return {
      instanceKey: instance.key, targetRef: cloneAssetRef(instance.targetRef), baseRevision: instance.baseRevision,
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
    for (const instance of coordinator.instances.values()) if (instance.cardType === 'input' && !instance.dirty && !instance.conflictState) instance.baseRevision = revision;
  }
  function commitAssetInputCommand(command, options = {}) {
    const coordinator = options.coordinator || assetsCardState, refresh = options.refresh || ((snapshot, targetRef, affectedAssetKeys) => applyAssetSnapshot(snapshot, targetRef, { affectedAssetKeys }));
    if (!inputTaskMatches(command, coordinator)) return { committed: false, stale: true };
    const instance = coordinator.instances.get(command.instanceKey), record = assetByKey(assetKey(command.targetRef));
    if (!record) return { committed: false, stale: true };
    if (command.baseRevision !== assetState.snapshot.revision) {
      instance.autosaveStatus = 'Conflict'; instance.conflictState = { expectedRevision: command.baseRevision, actualRevision: assetState.snapshot.revision };
      instance.validation = { valid: true, message: 'Asset changed before this draft could be saved.', field: '' };
      return { committed: false, conflict: true };
    }
    const next = { ...record, ...command.normalized };
    if (inputSemanticValue(record) === inputSemanticValue(next)) {
      instance.dirty = false; instance.autosaveStatus = 'Saved'; instance.conflictState = null; instance.baseRevision = assetState.snapshot.revision;
      return { committed: false, unchanged: true };
    }
    const staged = {
      ...record, name: next.name, plainName: plainAssetName(next.name), kind: next.kind, type: next.type,
      typeLabel: ASSET_SUBTYPES[next.kind].find(([value]) => value === next.type)?.[1] || next.kind,
      definition: assetDefinitionFor(next.kind, next.type, next.data), dependencies: next.dependencies, data: next.data,
      properties: invalidateDerivedAssetProperties(record, next)
    };
    staged.fingerprint = JSON.stringify({ name: staged.name, type: staged.type, data: staged.data, dependencies: staged.dependencies, properties: staged.properties });
    Object.assign(record, staged);
    assetState.snapshot.revision += 1;
    assetState.snapshot.capabilities = localAssetSnapshot().capabilities;
    instance.dirty = false; instance.autosaveStatus = 'Saved'; instance.conflictState = null; instance.baseRevision = assetState.snapshot.revision;
    rebaseCleanAssetInputInstances(assetState.snapshot.revision, coordinator);
    if (coordinator === assetsCardState && assetsCardState.slots.get('input').activeInstanceKey === instance.key) updateAssetsInputCardTitle(instance, staged.kind);
    refresh(localAssetSnapshot(), command.targetRef, new Set([assetKey(command.targetRef)]));
    return { committed: true, revision: assetState.snapshot.revision };
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
    if (!instance || activeAssetInputInstance() !== instance) return;
    const card = assetState.editorCard, form = editorForm(); if (!card || !form) return;
    const compact = card.querySelector('[data-assets-autosave-status]'), message = form.querySelector('[data-assets-editor-status]');
    if (compact) compact.textContent = instance.autosaveStatus;
    if (message) message.textContent = instance.validation?.message || '';
    form.dataset.autosaveState = instance.autosaveStatus.toLowerCase().replace(/[^a-z]+/g, '-');
    form.querySelectorAll('[data-assets-name],[data-assets-field]').forEach((field) => field.setAttribute('aria-invalid', String(!instance.validation?.valid && (!instance.validation.field || instance.validation.field === (field.dataset.assetsField || 'name')))));
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
    instance.draft = cloneInputDraft({ ...instance.draft, ...patch, data: { ...instance.draft.data, ...(patch.data || {}) } });
    instance.dirty = true; instance.validation = { valid: true, message: '', field: '' };
    instance.autosaveStatus = instance.conflictState ? 'Conflict' : 'Editing';
    renderAssetInputStatus(instance);
    return options.schedule === false ? true : scheduleAssetInputAutosave(instance, options);
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
    return referenceFieldSpecs(context.kind, context.type).find((spec) => spec.field === control.dataset.assetsReference) || null;
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
    const boundInstance = assetsCardState.instances.get(instanceKey);
    if (!boundInstance || boundInstance !== activeAssetInputInstance() || boundInstance.rendererEpoch !== rendererEpoch) return;
    const context = referenceContext(editorForm());
    if (!referenceEligibility(spec, key, context).allowed) return;
    // `context.data` includes every current reference.  Rebuilding from the
    // clicked control's transient DOM snapshot can omit its sibling (for
    // example, a map's Domain while choosing its Codomain).
    const instance = boundInstance;
    updateAssetInputDraft(instance, { data: { ...context.data, [spec.field]: key } }, { immediate: true });
    closeReferencePicker(); renderAssetsEditorFields(); renderAssetInputStatus(instance);
    const taskGeneration = instance.taskGeneration;
    setTimeout(() => acceptAssetInputAsyncResult(instance.key, instance.rendererEpoch, taskGeneration, () => editorForm()?.querySelector(`[data-assets-reference="${CSS.escape(spec.field)}"]`)?.focus()), 0);
  }
  function openReferencePicker(control) {
    const form = editorForm(); if (!form || control.disabled) return;
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
    if (kind === 'variety') {
      if (type === 'projective') return `Projective space of dimension ${data.dimension || 0}`;
      if (type === 'grassmannian') return `Gr(${data.r || '?'}, ${data.n || '?'})`;
      if (type === 'complete-intersection') return `Complete intersection of degrees ${data.degrees || '—'} in ℙ^${data.ambientDimension || '?'}`;
      if (type === 'curve') return `Curve of genus ${data.genus || '?'}`;
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
        const pending = cloneInputDraft({ name: form.querySelector('[data-assets-name]').value, kind: form.querySelector('[data-assets-kind]').value, type: form.querySelector('[data-assets-subtype]').value, data: assetEditorData(null) });
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
    const mathTitle = `\\(${target.name}\\) · ${card.label}`;
    const plainTitle = `${target.plainName || target.name} · ${card.label}`;
    session.editor?.setCardLabel?.(card.nativeCardKey, mathTitle, plainTitle);
  }

  function applyAssetPropertyBindingProjection(session, slot, instance, snapshot, bindingToken) {
    const card = ASSET_CARD_REGISTRY[slot.cardType], target = assetByKey(assetKey(instance.targetRef));
    if (!target || !cardSupportsAsset(slot.cardType, target.kind)) throw new Error('The Property Card target is no longer compatible.');
    session.editor?.setBindingToken?.(bindingToken);
    const applied = session.editor?.applyAssets?.(snapshot, instance.targetRef, null, {
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
    if (!session || session.applyingAssets) return false;
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
    rebaseCleanAssetInputInstances(snapshot.revision);
    pruneAssetPropertyBindings(present);
    markAffectedAssetPropertyInstances(options.affectedAssetKeys);
    reprojectActiveAssetPropertySlots(localAssetSnapshot(), { onlyStale: !!options.affectedAssetKeys?.size });
    syncAssetProjectionSessions();
    renderAssets(); renderInspector();
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
    const assets = assetState.snapshot.assets.filter((asset) => session.assetProjection.keys.has(assetKey(asset)));
    const snapshot = { ...localAssetSnapshot(), assets: assets.map((asset) => ({ ...asset, viewPosition: session.assetProjection.layout.get(assetKey(asset)) || null })) };
    session.applyingAssets = true;
    try {
      session.editor.applyAssets?.(snapshot, projectedActiveRef, null);
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
    const entries = assetState.snapshot.assets.slice(), direction = assetState.direction === 'desc' ? -1 : 1;
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

  const assetIcon = (kind) => kind === 'variety' ? '𝕍' : kind === 'sheaf' ? '𝒽' : '→';
  const formatAssetTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  function createAssetItem(asset) {
    const key = assetKey(asset), meta = assetState.metadata.get(key) || {}, item = document.createElement('div');
    item.className = `workspace-asset-item workspace-asset-${asset.kind}`; item.dataset.assetKey = key; item.dataset.assetKind = asset.kind; item.dataset.assetId = asset.id;
    item.draggable = true;
    item.setAttribute('role', assetState.layout === 'details' ? 'row' : 'option'); item.setAttribute('aria-selected', String(assetState.selected.has(key)));
    item.setAttribute('aria-label', `${asset.plainName || asset.name}, ${asset.typeLabel}`); item.tabIndex = assetState.selected.has(key) ? 0 : -1;
    const icon = Object.assign(document.createElement('span'), { className: 'workspace-asset-icon', textContent: assetIcon(asset.kind) }); icon.setAttribute('aria-hidden', 'true');
    const name = Object.assign(document.createElement('span'), { className: 'workspace-asset-name', title: asset.name, textContent: `\\(${asset.name}\\)` });
    const type = Object.assign(document.createElement('span'), { className: 'workspace-asset-type', textContent: asset.typeLabel });
    const definition = Object.assign(document.createElement('span'), { className: 'workspace-asset-definition', textContent: asset.definition || asset.typeLabel });
    const modified = Object.assign(document.createElement('time'), { className: 'workspace-asset-modified', textContent: formatAssetTime(meta.modifiedAt) });
    if (assetState.renameKey === key) {
      const input = Object.assign(document.createElement('input'), { className: 'workspace-asset-rename', value: asset.name }); input.setAttribute('aria-label', `Rename ${asset.plainName || asset.name}`);
      input.addEventListener('click', (event) => event.stopPropagation()); input.addEventListener('keydown', handleRenameKeydown); input.addEventListener('blur', () => commitAssetRename(key, input.value)); name.replaceChildren(input);
    }
    item.append(icon, name, type, definition, modified);
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

  function renderAssets() {
    if (!assetState.view) return;
    const content = assetState.view.querySelector('[data-assets-content]'), entries = orderedAssets();
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    content.dataset.layout = assetState.layout; content.dataset.assetsEmpty = !assetState.ready ? 'loading' : !entries.length ? 'empty' : 'false'; content.replaceChildren();
    if (!assetState.ready) { content.appendChild(Object.assign(document.createElement('p'), { className: 'workspace-assets-empty', textContent: 'Loading Assets…' })); return; }
    if (!entries.length) {
      const empty = Object.assign(document.createElement('div'), { className: 'workspace-assets-empty' }); empty.innerHTML = '<strong>This Assets view is empty.</strong><span>Right-click here to create a variety.</span>'; content.appendChild(empty); return;
    }
    if (assetState.layout === 'details') {
      const header = Object.assign(document.createElement('div'), { className: 'workspace-assets-details-header' }); header.setAttribute('role', 'row');
      ['Name', 'Type', 'Definition', 'Date modified'].forEach((label) => header.appendChild(Object.assign(document.createElement('span'), { textContent: label }))); content.appendChild(header);
    }
    entries.forEach((asset) => content.appendChild(createAssetItem(asset)));
    const rename = content.querySelector('.workspace-asset-rename'); if (rename) { rename.focus(); rename.select(); }
    if (!assetState.renameKey && window.MathJax?.typesetPromise) { window.MathJax.typesetClear?.([content]); window.MathJax.typesetPromise([content]).catch(() => {}); }
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
  }

  function syncAssetSelectionDom() {
    if (!assetState.view) return;
    const entries = orderedAssets();
    assetState.view.querySelector('[data-assets-count]').textContent = `${entries.length} object${entries.length === 1 ? '' : 's'}${assetState.selected.size ? ` · ${assetState.selected.size} selected` : ''}`;
    assetState.view.querySelectorAll('[data-asset-key]').forEach((item) => {
      const selected = assetState.selected.has(item.dataset.assetKey);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  }

  function handleAssetClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (item && !event.target.closest('input')) selectAssetKey(item.dataset.assetKey, event);
  }
  function handleAssetDoubleClick(event) {
    const item = event.target.closest('[data-asset-key]');
    if (!item || event.target.closest('input')) return;
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

  async function openSelectedAsset() {
    const selected = selectedAssetRecords();
    if (selected.length !== 1) return;
    revealAssetsEditor();
    try {
      await assetRequest('select-for-modify', { ref: assetRef(selected[0]) });
      status(`Editing ${selected[0].plainName || selected[0].name}.`, 'success');
    } catch (error) { status(error.message, 'error'); }
  }

  function openAssetProperty(cardType, contextTargetRef = assetState.contextTargetRef) {
    const ref = cloneAssetRef(contextTargetRef), asset = assetByKey(assetKey(ref)), card = ASSET_CARD_REGISTRY[cardType];
    closeAssetsContextMenu();
    try {
      if (!asset || !card?.nativeCardKey) throw new Error('The context Asset no longer exists.');
      bindAssetPropertySlot(cardType, ref);
      status(`Showing ${card.label} for ${asset.plainName || asset.name}.`, 'success');
    } catch (error) { status(error?.message || String(error), 'error'); }
  }
  function assetPropertiesMenuItems(contextTargetRef = assetState.contextTargetRef) {
    const target = assetByKey(assetKey(contextTargetRef));
    if (!target) return [menuButton('Choose one object', () => {}, { disabled: true })];
    const capturedRef = cloneAssetRef(contextTargetRef);
    return NATIVE_ASSET_CARD_TYPES
      .filter((cardType) => cardSupportsAsset(cardType, target.kind))
      .map((cardType) => menuButton(ASSET_CARD_REGISTRY[cardType].label, () => openAssetProperty(cardType, capturedRef)));
  }

  function uniqueDefaultAssetName(kind) {
    const base = kind === 'variety' ? 'X' : kind === 'sheaf' ? '\\mathcal{E}' : 'f';
    const numbered = (number) => kind === 'sheaf' ? `\\mathcal{E}_{${number}}` : `${base}_{${number}}`;
    let name = base, number = 2;
    const isTaken = (candidate) => assetState.snapshot.assets.some((asset) => canonicalAssetName(asset.name) === canonicalAssetName(candidate));
    while (isTaken(name)) name = numbered(number++);
    return name;
  }
  function createDefaultAsset(kind) {
    const type = kind === 'map' ? 'ordinary' : 'abstract';
    const firstVariety = assetState.snapshot.assets.find((asset) => asset.kind === 'variety');
    const data = kind === 'variety'
      ? { dimension: '3' }
      : kind === 'sheaf'
        ? { base: firstVariety ? assetKey(firstVariety) : '', rank: '1' }
        : { domain: firstVariety ? assetKey(firstVariety) : '', codomain: firstVariety ? assetKey(firstVariety) : '' };
    const prefix = kind === 'variety' ? 'X' : kind === 'sheaf' ? 'E' : 'M';
    const record = { id: `${prefix}${++assetState.nextObjectId}`, kind, name: uniqueDefaultAssetName(kind), type, data };
    record.plainName = plainAssetName(record.name);
    record.typeLabel = ASSET_SUBTYPES[kind].find(([value]) => value === type)?.[1] || kind;
    record.dependencies = assetDependencies(kind, type, data);
    record.definition = assetDefinitionFor(kind, type, data);
    record.fingerprint = JSON.stringify({ name: record.name, type, data, dependencies: record.dependencies });
    assetState.snapshot.assets.push(record);
    assetState.snapshot.revision += 1;
    assetState.snapshot.capabilities = localAssetSnapshot().capabilities;
    assetState.selected = new Set([assetKey(record)]);
    assetState.anchor = assetKey(record);
    bindAssetInputInstance(assetRef(record), { flush: false, render: false });
    rebaseCleanAssetInputInstances(assetState.snapshot.revision);
    return record;
  }
  async function createAsset(kind) {
    closeAssetsContextMenu(); revealAssetsEditor();
    try {
      flushAssetInputInstance(activeAssetInputInstance());
      const record = createDefaultAsset(kind);
      applyAssetSnapshot(localAssetSnapshot(), assetRef(record), { affectedAssetKeys: new Set([assetKey(record)]) });
      renderAssetsEditor();
      editorForm()?.querySelector('[data-assets-name]')?.focus();
      status(`Created ${record.plainName || record.name}. Edit it in the Input card.`, 'success');
    } catch (error) { status(error.message, 'error'); }
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
      const selected = selectedAssetRecords();
      assetState.contextTargetRef = selected.length === 1 ? assetRef(selected[0]) : null;
      const rect = assetState.view.querySelector('[aria-selected="true"]')?.getBoundingClientRect();
      if (rect) showAssetsContextMenu(rect.left + 12, rect.top + 12, 'item');
    }
  }

  function beginAssetMarquee(event) {
    if (event.button !== 0 || event.target.closest('[data-asset-key],input,select,button')) return;
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
  }

  function handleAssetsContextMenu(event) {
    event.preventDefault(); const item = event.target.closest('[data-asset-key]');
    if (item) {
      const target = assetByKey(item.dataset.assetKey);
      assetState.contextTargetRef = target ? assetRef(target) : null;
      assetState.selected = new Set([item.dataset.assetKey]); assetState.anchor = item.dataset.assetKey; renderAssets();
      showAssetsContextMenu(event.clientX, event.clientY, 'item');
    } else {
      assetState.contextTargetRef = null; assetState.selected.clear(); assetState.anchor = ''; renderAssets(); showAssetsContextMenu(event.clientX, event.clientY, 'background');
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
      if (activated) return;
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
    wrapper.addEventListener('mouseenter', openExclusive); wrapper.addEventListener('mouseleave', () => setOpen(false)); trigger.addEventListener('focus', openExclusive);
    trigger.addEventListener('click', (event) => { event.stopPropagation(); openExclusive(); });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); setOpen(true); submenu.querySelector('button:not(:disabled)')?.focus(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); }
    });
    submenu.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(false); trigger.focus(); } });
    wrapper.append(trigger, submenu); return wrapper;
  }
  function showAssetsContextMenu(x, y, kind) {
    const menu = $('#workspace-assets-context-menu'); menu.replaceChildren();
    if (kind === 'item') {
      menu.append(
        menuButton('Open', openSelectedAsset, { disabled: assetState.selected.size !== 1 }),
        menuCascade('Properties', assetPropertiesMenuItems(assetState.contextTargetRef), { disabled: !assetState.contextTargetRef }),
        menuButton('Rename', beginAssetRename, { disabled: assetState.selected.size !== 1 }),
        menuButton(`Delete${assetState.selected.size > 1 ? ` ${assetState.selected.size} assets` : ''}`, () => deleteAssets(selectedAssetRecords().map(assetRef)), { disabled: !assetState.selected.size })
      );
    } else {
      const viewItems = ASSET_LAYOUTS.map((layout) => menuButton(layout[0].toUpperCase() + layout.slice(1), () => { assetState.layout = layout; renderAssets(); }, { checked: assetState.layout === layout }));
      const sortItems = [['creation', 'Creation order'], ['name', 'Name'], ['type', 'Object type'], ['modified', 'Date modified']].map(([value, label]) => menuButton(label, () => { assetState.sort = value; renderAssets(); }, { checked: assetState.sort === value }));
      sortItems.push(Object.assign(document.createElement('div'), { className: 'workspace-assets-menu-separator' }), menuButton('Ascending', () => { assetState.direction = 'asc'; renderAssets(); }, { checked: assetState.direction === 'asc', disabled: assetState.sort === 'creation' }), menuButton('Descending', () => { assetState.direction = 'desc'; renderAssets(); }, { checked: assetState.direction === 'desc', disabled: assetState.sort === 'creation' }));
      const newItems = ASSET_KINDS.map((assetKind) => menuButton(assetKind[0].toUpperCase() + assetKind.slice(1), () => createAsset(assetKind), { disabled: assetState.snapshot.capabilities?.[assetKind] === false }));
      menu.append(menuCascade('View', viewItems), menuCascade('Sort by', sortItems), menuCascade('New', newItems));
    }
    menu.hidden = false; menu.classList.toggle('workspace-assets-menu-left', x > window.innerWidth - 460); menu.style.left = '0px'; menu.style.top = '0px';
    const rect = menu.getBoundingClientRect(); menu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - rect.width - 6))}px`; menu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - rect.height - 6))}px`;
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
  function chooseOptions(select, entries, placeholder) {
    const previous = select.value; select.replaceChildren(new Option(placeholder, '')); entries.filter((entry) => !entry.disabled).forEach((entry) => select.appendChild(new Option(entry.label, entry.id)));
    if (Array.from(select.options).some((item) => item.value === previous)) select.value = previous; select.disabled = entries.length === 0;
  }
  function updateImportExport() {
    const assetsTarget = inspectorSourceId === 'assets' || activeCanvasId === 'assets';
    const definition = byId.get(assetsTarget ? 'assets' : activeCanvasId); $('#workspace-io-target').textContent = definition ? definition.label : 'No main view selected';
    chooseOptions($('#workspace-io-exporter'), [], assetsTarget ? 'Unavailable for Assets' : 'Use the calculator’s native card');
    chooseOptions($('#workspace-io-format'), [], 'Default format'); $('#workspace-io-format-row').hidden = true;
    chooseOptions($('#workspace-io-importer'), [], assetsTarget ? 'Unavailable for Assets' : 'Use the calculator’s native card');
    $('#workspace-io-output').value = '';
  }

  function initialise() {
    const picker = $('#workspace-open-canvas'); picker.appendChild(new Option('Open view…', '', true, true));
    const views = document.createElement('optgroup'); views.label = 'Workspace views'; views.appendChild(new Option('Assets', 'assets')); picker.appendChild(views);
    const calculatorGroup = document.createElement('optgroup'); calculatorGroup.label = 'Calculator views';
    calculators.forEach((calculator) => calculatorGroup.appendChild(new Option(calculator.label, calculator.id))); picker.appendChild(calculatorGroup);
    picker.addEventListener('change', () => { if (picker.value) openCanvas(picker.value); picker.value = ''; }); $('#workspace-split-view').addEventListener('click', () => setSplitView(!splitView));
    $('#workspace-io-card').classList.add('workspace-assets-inspector-card'); installWorkspaceOwnedCardChrome($('#workspace-io-card'), 'importExport'); enableWorkspaceOwnedCardDragging();
    $('#workspace-add-card').addEventListener('click', () => $('#workspace-card-picker').hidden ? openCardPicker() : closeCardPicker());
    const changeCardPickerSource = (event) => {
      const selectedSource = event.currentTarget.value;
      cardPickerSourceId = selectedSource;
      renderCardPicker();
      $('#workspace-card-picker').hidden = false;
      $('#workspace-add-card').setAttribute('aria-expanded', 'true');
    };
    $('#workspace-card-source').addEventListener('input', changeCardPickerSource);
    $('#workspace-card-source').addEventListener('change', changeCardPickerSource);
    document.querySelectorAll('[data-pane]').forEach((pane) => pane.addEventListener('pointerdown', () => focusCanvasPane(pane.dataset.pane)));
    $('#workspace-canvas-resizer').addEventListener('pointerdown', beginCanvasResize);
    $('#workspace-canvas-resizer').addEventListener('keydown', handleCanvasResizeKeydown);
    document.addEventListener('pointerdown', (event) => { if (!$('#workspace-assets-context-menu').hidden && !$('#workspace-assets-context-menu').contains(event.target)) closeAssetsContextMenu(); const picker = assetState.referencePicker; if (picker && !picker.node.contains(event.target) && !picker.control.contains(event.target)) closeReferencePicker(); }, true);
    window.addEventListener('blur', () => { closeAssetsContextMenu(); closeReferencePicker(); }); window.addEventListener('resize', () => { closeAssetsContextMenu(); closeCardPicker(); closeReferencePicker(); });
    document.querySelectorAll('[data-workspace-io-tab]').forEach((tab) => tab.addEventListener('click', () => { const name = tab.dataset.workspaceIoTab; document.querySelectorAll('[data-workspace-io-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === tab))); $('#workspace-io-export-panel').hidden = name !== 'export'; $('#workspace-io-import-panel').hidden = name !== 'import'; }));
    openCanvas('assets');
  }

  window.MathWorkspaceAssetsTest = { assetKey, layouts: ASSET_LAYOUTS.slice(), selectAssetKey, orderedAssets, state: assetState, assetRequest, renderAssetsEditor, canonicalAssetName, normalizedAssetData, validateAssetData, referenceFieldSpecs, referenceEligibility, referenceWouldCreateCycle, referenceDragKey, isDirectSheafType, inferredSheafBase, assetMathSignature, invalidateDerivedAssetProperties, createAssetPropertyCommand, commitAssetPropertyCommand, captureAndCommitAssetPropertyCommand, captureSheafComplexLayout, cardSupportsAsset, assetCardInstanceKey, ASSET_CARD_REGISTRY, NATIVE_ASSET_CARD_TYPES, assetsCardState, assetsUtilitySlots, assetInputCardTitleState, createAssetsCardCoordinator, planAssetPropertySlotBinding, bindAssetPropertySlot, handleAssetPropertySessionChange, createAssetInputInstance, bindAssetInputInstance, activeAssetInputInstance, assetInputInstanceForRef, validateAssetInputDraft, createAssetInputCommitCommand, commitAssetInputCommand, updateAssetInputDraft, scheduleAssetInputAutosave, flushAssetInputInstance, cancelAssetInputAutosave, queueAssetInputAutosave, drainAssetInputQueue, removeAssetInputInstances, acceptAssetInputAsyncResult, markAffectedAssetPropertyInstances, reprojectActiveAssetPropertySlots, INPUT_AUTOSAVE_DEBOUNCE_MS, INPUT_AUTOSAVE_MAX_WAIT_MS, DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT, canvasHeightFor, sessions };
  document.addEventListener('DOMContentLoaded', initialise);
}());
