// Shared card UI behavior for calculator pages.
// Change this value to adjust the default number of right-side cards that can
// stay open at the same time. Individual pages can override it with
// data-card-max-open="N" on their .side / #cards container.
const DEFAULT_MAX_OPEN_CARDS = 2;

try {
(() => {
  'use strict';

  const INTERACTIVE_SELECTOR = 'button,input,select,textarea,a,.drag-handle,.card-pin-btn,.calculator-card-wide-btn';
  const PIN_SMALL_SCREEN_QUERY = '(max-width: 980px)';
  const DEFAULT_WIDE_QUERY = '(min-width: 960px)';
  const sessions = new Set();
  const cardSessions = new WeakMap();
  const sideSessions = new WeakMap();
  const wideMeta = new WeakMap();
  let openSequence = 0;
  let generatedCardKey = 0;

  const pinMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia(PIN_SMALL_SCREEN_QUERY)
    : null;

  const CARD_PIN_ICON = '<svg class="card-pin-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"></path><path d="M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16h14v-.8a2 2 0 0 0-1.1-1.7l-1.8-.9A2 2 0 0 1 15 10.8V7a2 2 0 0 1 .6-1.4L17 4.2V2H7v2.2l1.4 1.4A2 2 0 0 1 9 7z"></path></svg>';

  function resolveElement(ref, root = document) {
    if (!ref) return null;
    if (ref instanceof Element || ref === document) return ref;
    if (typeof ref === 'string') return root.querySelector(ref) || document.querySelector(ref);
    return null;
  }

  function resolveElements(ref, root = document) {
    if (!ref) return Array.from(root.querySelectorAll ? root.querySelectorAll('.side') : []);
    if (ref instanceof Element) return [ref];
    if (Array.isArray(ref)) return ref.filter(Boolean);
    if (typeof ref === 'string') return Array.from(root.querySelectorAll(ref));
    return [];
  }

  function cardFrom(ref, root = document) {
    if (!ref) return null;
    if (ref instanceof Element) return ref.classList.contains('card') ? ref : ref.closest('.card');
    if (typeof ref === 'string') return root.querySelector(ref) || document.querySelector(ref);
    return null;
  }

  function isHidden(el) {
    if (!el) return true;
    if (el.hidden || el.style.display === 'none' || el.classList?.contains('calculator-card-user-hidden')) return true;
    return !!el.closest('[hidden]');
  }

  function setCardUserVisible(cardRef, visible) {
    const card = cardFrom(cardRef);
    if (!card) return false;
    const nextVisible = visible !== false;
    if (!nextVisible) {
      if (card.dataset.cardWideState === 'wide') setWide(card, false);
      card.classList.remove('is-pinned');
      const pin = card.querySelector('.card-pin-btn');
      if (pin) {
        pin.setAttribute('aria-pressed', 'false');
        pin.setAttribute('aria-label', 'pin card');
        pin.title = 'pin card';
      }
      setCardCollapsed(card, true, { reason: 'visibility' });
    }
    card.classList.toggle('calculator-card-user-hidden', !nextVisible);
    if (nextVisible) {
      if (card.dataset.cardUserAriaHidden === 'true') card.removeAttribute('aria-hidden');
      delete card.dataset.cardUserAriaHidden;
    } else {
      card.setAttribute('aria-hidden', 'true');
      card.dataset.cardUserAriaHidden = 'true';
    }
    card.dispatchEvent(new CustomEvent('calculator-card-visibility-change', {
      bubbles: true,
      detail: { visible: nextVisible }
    }));
    return true;
  }

  function setCardAriaExpanded(card, expanded) {
    const head = card ? card.querySelector('.card-head') : null;
    if (head) head.setAttribute('aria-expanded', String(!!expanded));
  }

  function cardPinningEnabled() {
    return !(pinMedia && pinMedia.matches);
  }

  function syncCardPinAvailability(root = document) {
    const enabled = cardPinningEnabled();
    root.querySelectorAll?.('.card-pin-btn').forEach((btn) => {
      btn.disabled = !enabled;
      btn.setAttribute('aria-hidden', String(!enabled));
    });
  }

  function stopCardToolEvent(event) {
    event.stopPropagation();
  }

  function toggleCardPinned(card, pinned) {
    if (!card || !cardPinningEnabled()) return;
    const next = pinned == null ? !card.classList.contains('is-pinned') : !!pinned;
    card.classList.toggle('is-pinned', next);
    const btn = card.querySelector('.card-pin-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(next));
      btn.setAttribute('aria-label', next ? 'unpin card' : 'pin card');
      btn.title = next ? 'unpin card' : 'pin card';
    }
  }

  function titleToolsForCard(card) {
    const head = card ? card.querySelector('.card-head') : null;
    if (!head) return null;
    let tools = head.querySelector('.card-title-tools');
    if (!tools) {
      tools = document.createElement('span');
      tools.className = 'card-title-tools';
      const toggle = head.querySelector('.toggle-icon');
      if (toggle) head.insertBefore(tools, toggle);
      else head.appendChild(tools);
    }
    return tools;
  }

  function isDndChild(child) {
    return !!child && (
      child.classList?.contains('card')
      || child.dataset?.cardDragItem === 'true'
      || child.hasAttribute?.('data-card-drag-item')
    );
  }

  function dragItemForCard(container, card) {
    if (!container || !card) return null;
    if (card.parentElement === container) return card;
    const item = card.closest?.('[data-card-drag-item]');
    if (item && item.parentElement === container && item.contains(card)) return item;
    return null;
  }

  function dragContainerForCard(session, card) {
    if (!session || !card) return null;
    const containers = [...session.sides, ...session.dragContainers];
    return containers.find((container) => dragItemForCard(container, card)) || null;
  }

  function ensureDragHandle(card, session) {
    const head = card ? card.querySelector('.card-head') : null;
    if (!head || card.dataset.cardDrag === 'off' || head.querySelector('.drag-handle')) return;
    if (session && !dragContainerForCard(session, card)) return;
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.title = 'drag card';
    handle.setAttribute('aria-hidden', 'true');
    handle.innerHTML = '&#8942;&#8942;';
    const label = head.querySelector('.card-head-label');
    if (label) head.insertBefore(handle, label);
    else head.insertBefore(handle, head.firstChild);
  }

  function initCardChrome(card, session) {
    const head = card ? card.querySelector('.card-head') : null;
    if (!head) return;
    ensureDragHandle(card, session);
    const tools = titleToolsForCard(card);
    if (!tools) return;

    if (!tools.querySelector('.card-stale-badge')) {
      const stale = document.createElement('span');
      stale.className = 'card-stale-badge';
      stale.textContent = 'stale';
      tools.appendChild(stale);
    }

    if (!tools.querySelector('.card-pin-btn')) {
      const pin = document.createElement('button');
      pin.className = 'card-pin-btn';
      pin.type = 'button';
      pin.innerHTML = CARD_PIN_ICON;
      pin.title = 'pin card';
      pin.setAttribute('aria-label', 'pin card');
      pin.setAttribute('aria-pressed', String(card.classList.contains('is-pinned')));
      ['pointerdown', 'mousedown'].forEach((type) => pin.addEventListener(type, stopCardToolEvent));
      pin.addEventListener('touchstart', stopCardToolEvent, { passive: true });
      pin.addEventListener('click', (event) => {
        event.preventDefault();
        stopCardToolEvent(event);
        toggleCardPinned(card);
      });
      tools.appendChild(pin);
    }

    setupWideCard(card);
    setCardAriaExpanded(card, !card.classList.contains('collapsed'));
  }

  function cardGroupKey(session, card) {
    if (!card.dataset.calculatorCardKey) card.dataset.calculatorCardKey = `card-${++generatedCardKey}`;
    if (typeof session.options.groupKey === 'function') {
      const key = session.options.groupKey(card);
      if (key) return String(key);
    }
    return card.dataset.cardGroup || card.dataset.openChartGroup || card.dataset.calculatorCardKey;
  }

  function sideForCard(session, card) {
    return session.sides.find((side) => side.contains(card)) || null;
  }

  function maxOpenForSide(session, side) {
    const raw = side?.dataset?.cardMaxOpen ?? session.options.maxOpenCards;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_MAX_OPEN_CARDS;
  }

  function defaultLimitPredicate(session, card) {
    if (!card || !card.classList.contains('card')) return false;
    if (card.dataset.cardLimit === 'off') return false;
    if (card.closest('.canvas-panel')) return false;
    if (isHidden(card)) return false;
    return !!sideForCard(session, card);
  }

  function isLimitCard(session, card) {
    if (typeof session.options.limitPredicate === 'function') {
      return !!session.options.limitPredicate(card, { defaultPredicate: () => defaultLimitPredicate(session, card) });
    }
    return defaultLimitPredicate(session, card);
  }

  function collapseForLimit(session, card) {
    card.classList.add('collapsed');
    setCardAriaExpanded(card, false);
    if (typeof session.options.onCollapse === 'function') {
      session.options.onCollapse(card, { reason: 'limit' });
    }
  }

  function enforceOpenLimit(session, activeCard, protectedCard = null) {
    if (!isLimitCard(session, activeCard)) return;
    const side = sideForCard(session, activeCard);
    if (!side) return;
    const maxOpen = maxOpenForSide(session, side);
    if (maxOpen <= 0) return;

    activeCard.dataset.openChartOrder = String(++openSequence);
    const activeKey = cardGroupKey(session, activeCard);
    const protectedKey = protectedCard && isLimitCard(session, protectedCard)
      ? cardGroupKey(session, protectedCard)
      : null;
    const groups = new Map();
    side.querySelectorAll('.card:not(.collapsed)').forEach((card) => {
      if (!isLimitCard(session, card)) return;
      const key = cardGroupKey(session, card);
      const order = Number(card.dataset.openChartOrder || 0);
      const existing = groups.get(key) || { key, cards: [], order: 0, pinned: false };
      existing.cards.push(card);
      existing.order = Math.max(existing.order, order);
      existing.pinned = existing.pinned || (cardPinningEnabled() && card.classList.contains('is-pinned'));
      groups.set(key, existing);
    });

    const openGroups = Array.from(groups.values()).sort((a, b) => a.order - b.order);
    while (openGroups.length > maxOpen) {
      const victim = openGroups.find((group) => group.key !== activeKey && group.key !== protectedKey && !group.pinned);
      if (!victim) break;
      victim.cards.forEach((card) => collapseForLimit(session, card));
      openGroups.splice(openGroups.indexOf(victim), 1);
    }
  }

  function sessionForCard(card) {
    if (cardSessions.has(card)) return cardSessions.get(card);
    for (const session of sessions) {
      if (session.root.contains?.(card) || session.root === document) {
        cardSessions.set(card, session);
        return session;
      }
    }
    return null;
  }

  function setCardCollapsed(cardRef, collapsed, options = {}) {
    const card = cardFrom(cardRef);
    if (!card) return false;
    const session = sessionForCard(card);
    const wasCollapsed = card.classList.contains('collapsed');
    const nextCollapsed = !!collapsed;
    card.classList.toggle('collapsed', nextCollapsed);
    setCardAriaExpanded(card, !nextCollapsed);
    if (!nextCollapsed) {
      if (session) enforceOpenLimit(session, card, options.protectedCard || null);
      if (session && options.refreshOnOpen !== false && typeof session.options.onOpen === 'function') {
        session.options.onOpen(card, { wasCollapsed, reason: options.reason || 'open' });
      }
    } else if (session && !wasCollapsed && typeof session.options.onCollapse === 'function') {
      session.options.onCollapse(card, { reason: options.reason || 'collapse' });
    }
    return true;
  }

  function openCard(cardRef, options = {}) {
    return setCardCollapsed(cardRef, false, options);
  }

  function collapseCard(cardRef, options = {}) {
    return setCardCollapsed(cardRef, true, options);
  }

  function toggleCardFromRef(eventOrHead, maybeHead) {
    const event = maybeHead ? eventOrHead : (eventOrHead?.target ? eventOrHead : window.event);
    const head = maybeHead || (eventOrHead?.closest ? eventOrHead : event?.target?.closest?.('.card-head'));
    if (event?.target?.closest?.(INTERACTIVE_SELECTOR)) return false;
    const card = head?.closest?.('.card');
    if (!card) return false;
    event?.stopPropagation?.();
    return setCardCollapsed(card, !card.classList.contains('collapsed'), { reason: 'toggle' });
  }

  function setupCollapseDelegates(session) {
    if (session.collapseReady) return;
    session.collapseReady = true;

    session.root.addEventListener('click', (event) => {
      const head = event.target.closest?.('.card-head');
      if (!head || !session.root.contains(head)) return;
      if (Date.now() < session.suppressToggleUntil) return;
      if (event.target.closest(INTERACTIVE_SELECTOR)) return;
      const card = head.closest('.card');
      if (!card) return;
      setCardCollapsed(card, !card.classList.contains('collapsed'), { reason: 'toggle' });
    });

    session.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const head = event.target.closest?.('.card-head');
      if (!head || !session.root.contains(head)) return;
      if (Date.now() < session.suppressToggleUntil) return;
      if (event.target.closest(INTERACTIVE_SELECTOR)) return;
      event.preventDefault();
      const card = head.closest('.card');
      if (!card) return;
      setCardCollapsed(card, !card.classList.contains('collapsed'), { reason: 'toggle' });
    });
  }

  function createPlaceholder(height) {
    const el = document.createElement('div');
    el.id = 'dnd-placeholder';
    el.style.cssText = `height:${height}px;border:2px dashed var(--accent);border-radius:4px;background:rgba(61,107,79,0.06);box-sizing:border-box;transition:height 0.15s;`;
    return el;
  }

  function getCardAfterPointer(container, y, dragItem, placeholder) {
    const items = Array.from(container.children)
      .filter((item) => isDndChild(item) && item !== dragItem && item !== placeholder);
    return items.reduce((closest, item) => {
      const box = item.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: item };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function setupSideDrag(session, container) {
    if (!container || container.dataset.calculatorCardsDndReady === '1') return;
    container.dataset.calculatorCardsDndReady = '1';
    let dragItem = null;
    let dragCard = null;
    let dragHandle = null;
    let placeholder = null;
    let pointerId = null;
    let startY = 0;
    let cardTop = 0;
    let cardLeft = 0;
    let cardWidth = 0;
    let cardHeight = 0;
    let ghost = null;
    let ghostOffsetY = 0;
    let dragging = false;
    const pointerOptions = { passive: false };

    container.addEventListener('pointerdown', (event) => {
      const handle = event.target.closest?.('.drag-handle');
      if (!handle || !container.contains(handle)) return;
      const card = handle.closest('.card');
      const item = dragItemForCard(container, card);
      if (!card || !item || card.dataset.cardDrag === 'off' || item.dataset.cardDrag === 'off') return;
      event.preventDefault();
      event.stopPropagation();
      dragCard = card;
      dragItem = item;
      dragHandle = handle;
      pointerId = event.pointerId;
      startY = event.clientY;
      dragging = false;
      const rect = item.getBoundingClientRect();
      cardTop = rect.top;
      cardLeft = rect.left;
      cardWidth = rect.width;
      cardHeight = rect.height;
      ghostOffsetY = startY - cardTop;
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(pointerId); } catch (_) {}
      }
      document.addEventListener('pointermove', handleMove, pointerOptions);
      document.addEventListener('pointerup', finishDrag, pointerOptions);
      document.addEventListener('pointercancel', finishDrag, pointerOptions);
    }, pointerOptions);

    function handleMove(event) {
      if (!dragItem || !dragCard || event.pointerId !== pointerId) return;
      event.preventDefault();
      if (!dragging && Math.abs(event.clientY - startY) < 6) return;
      if (!dragging) {
        dragging = true;
        session.suppressToggleUntil = Date.now() + 500;
        document.body.classList.add('card-dragging');
        dragCard.classList.add('dragging');
        dragItem.classList.add('dragging');
        placeholder = createPlaceholder(cardHeight);
        dragItem.parentElement.insertBefore(placeholder, dragItem);
        ghost = dragItem.cloneNode(true);
        ghost.id = 'dnd-ghost';
        Object.assign(ghost.style, {
          position: 'fixed',
          left: `${cardLeft}px`,
          width: `${cardWidth}px`,
          top: `${event.clientY - ghostOffsetY}px`,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: '0.88',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: '4px',
          transition: 'none',
          touchAction: 'none'
        });
        document.body.appendChild(ghost);
        dragItem.style.display = 'none';
      }
      if (ghost) ghost.style.top = `${event.clientY - ghostOffsetY}px`;
      const after = getCardAfterPointer(container, event.clientY, dragItem, placeholder);
      if (after) container.insertBefore(placeholder, after);
      else container.appendChild(placeholder);
    }

    function finishDrag(event) {
      if (!dragItem || !dragCard || (event && event.pointerId !== pointerId)) return;
      if (event) event.preventDefault();
      document.removeEventListener('pointermove', handleMove, pointerOptions);
      document.removeEventListener('pointerup', finishDrag, pointerOptions);
      document.removeEventListener('pointercancel', finishDrag, pointerOptions);
      document.body.classList.remove('card-dragging');
      if (dragHandle?.releasePointerCapture && pointerId !== null) {
        try { dragHandle.releasePointerCapture(pointerId); } catch (_) {}
      }
      if (dragging && placeholder) {
        dragItem.style.display = '';
        container.insertBefore(dragItem, placeholder);
        placeholder.remove();
        if (ghost) ghost.remove();
        session.suppressToggleUntil = Date.now() + 500;
      } else if (dragItem) {
        dragItem.style.display = '';
      }
      if (dragCard) dragCard.classList.remove('dragging');
      if (dragItem) dragItem.classList.remove('dragging');
      dragItem = null;
      dragCard = null;
      dragHandle = null;
      placeholder = null;
      pointerId = null;
      ghost = null;
      dragging = false;
    }
  }

  function wideAvailable(card, session = sessionForCard(card)) {
    if (!card || card.dataset.cardWide !== 'true') return false;
    if (session?.options?.wideAvailable && !session.options.wideAvailable(card)) return false;
    const query = card.dataset.cardWideMin || DEFAULT_WIDE_QUERY;
    return typeof window.matchMedia !== 'function' || window.matchMedia(query).matches;
  }

  function wideButtonForCard(card) {
    const selector = card.dataset.cardWideButton;
    if (selector) return document.querySelector(selector);
    return card.querySelector('.calculator-card-wide-btn');
  }

  function syncWideButton(card) {
    const btn = wideButtonForCard(card);
    if (!btn) return;
    const isWide = card.classList.contains('wide') && card.dataset.cardWideState === 'wide';
    btn.textContent = isWide ? 'side' : 'wide';
    btn.setAttribute('aria-pressed', String(isWide));
    btn.disabled = !wideAvailable(card);
  }

  function setupWideCard(card) {
    if (!card || card.dataset.cardWide !== 'true') return;
    const tools = titleToolsForCard(card);
    if (!card.dataset.cardWideButton && tools && !tools.querySelector('.calculator-card-wide-btn')) {
      const btn = document.createElement('button');
      btn.className = 'calculator-card-wide-btn';
      btn.type = 'button';
      btn.textContent = 'wide';
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'move card to wide layout';
      ['pointerdown', 'mousedown'].forEach((type) => btn.addEventListener(type, stopCardToolEvent));
      btn.addEventListener('touchstart', stopCardToolEvent, { passive: true });
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        stopCardToolEvent(event);
        setWide(card, !(card.dataset.cardWideState === 'wide'));
      });
      tools.appendChild(btn);
    }
    const existing = wideButtonForCard(card);
    if (existing && existing.dataset.calculatorCardsWideReady !== '1' && !existing.classList.contains('calculator-card-wide-btn')) {
      existing.dataset.calculatorCardsWideReady = '1';
      existing.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        const session = sessionForCard(card);
        if (!session?.options?.manualWideButtons) return;
        event.preventDefault();
        setWide(card, !(card.dataset.cardWideState === 'wide'));
      });
    }
    syncWideButton(card);
  }

  function ensureWideMeta(card) {
    let meta = wideMeta.get(card);
    if (meta) return meta;
    const sideAnchor = card.dataset.cardSideAnchor ? document.querySelector(card.dataset.cardSideAnchor) : null;
    const sideHost = card.dataset.cardSideHost ? document.querySelector(card.dataset.cardSideHost) : null;
    const anchor = sideAnchor || document.createComment(`calculator-card-side-anchor:${card.id || ++generatedCardKey}`);
    if (!sideAnchor && card.parentElement) card.parentElement.insertBefore(anchor, card);
    meta = { anchor, sideHost };
    wideMeta.set(card, meta);
    return meta;
  }

  function setWide(cardRef, enabled, options = {}) {
    const card = cardFrom(cardRef);
    if (!card) return false;
    if (card.dataset.cardWide !== 'true') return false;
    const session = sessionForCard(card);
    const hostSelector = card.dataset.cardWideHost;
    const wideHost = hostSelector ? document.querySelector(hostSelector) : null;
    if (!wideHost) return false;
    const useWide = !!enabled && wideAvailable(card, session);
    const meta = ensureWideMeta(card);
    if (useWide) {
      if (card.parentElement !== wideHost) wideHost.appendChild(card);
    } else if (meta.sideHost) {
      if (card.parentElement !== meta.sideHost) meta.sideHost.appendChild(card);
    } else if (meta.anchor?.parentElement && card.parentElement !== meta.anchor.parentElement) {
      meta.anchor.insertAdjacentElement('afterend', card);
    } else if (meta.anchor?.parentNode) {
      meta.anchor.parentNode.insertBefore(card, meta.anchor.nextSibling);
    }
    card.classList.toggle('wide', useWide);
    card.dataset.cardWideState = useWide ? 'wide' : 'side';
    wideHost.hidden = !useWide;
    syncWideButton(card);
    if (typeof session?.options?.onWideChange === 'function' && options.notify !== false) {
      session.options.onWideChange(card, useWide, { requested: !!enabled });
    }
    return useWide;
  }

  function syncWideCards(root = document) {
    root.querySelectorAll?.('[data-card-wide="true"]').forEach((card) => {
      setupWideCard(card);
      if (card.dataset.cardWideState === 'wide' && !wideAvailable(card)) setWide(card, false);
      else syncWideButton(card);
    });
  }

  function init(options = {}) {
    const root = resolveElement(options.root, document) || document;
    let session = root.__calculatorCardsSession;
    if (!session) {
      session = { root, sides: [], dragContainers: [], options: {}, collapseReady: false, suppressToggleUntil: 0 };
      Object.defineProperty(root, '__calculatorCardsSession', { value: session, configurable: true });
      sessions.add(session);
    }
    session.options = { ...session.options, ...options };
    session.sides = resolveElements(options.side, root);
    session.dragContainers = options.dragContainers ? resolveElements(options.dragContainers, root) : [];
    if (!session.sides.length && root.classList?.contains('side')) session.sides = [root];
    setupCollapseDelegates(session);

    const cards = Array.from(root.querySelectorAll?.('.card') || []);
    cards.forEach((card, index) => {
      if (!card.dataset.cardSettingsId) card.dataset.cardSettingsId = card.id || `card-${index + 1}`;
      cardSessions.set(card, session);
      card.addEventListener('dragstart', (event) => event.preventDefault());
      if (!card.dataset.openChartOrder && !card.classList.contains('collapsed')) {
        card.dataset.openChartOrder = String(openSequence + cards.length - index);
      }
      initCardChrome(card, session);
    });
    openSequence += cards.length;

    session.sides.forEach((side) => {
      sideSessions.set(side, session);
      setupSideDrag(session, side);
    });
    session.dragContainers.forEach((container) => {
      setupSideDrag(session, container);
    });
    syncCardPinAvailability(root);
    syncWideCards(root);

    if (options.enforceInitial !== false) {
      session.sides.forEach((side) => {
        const open = Array.from(side.querySelectorAll('.card:not(.collapsed)')).filter((card) => isLimitCard(session, card));
        if (open.length > maxOpenForSide(session, side)) enforceOpenLimit(session, open[0]);
      });
    }
    return session;
  }

  if (pinMedia) {
    const listener = () => {
      sessions.forEach((session) => {
        syncCardPinAvailability(session.root);
        syncWideCards(session.root);
      });
    };
    if (typeof pinMedia.addEventListener === 'function') pinMedia.addEventListener('change', listener);
    else if (typeof pinMedia.addListener === 'function') pinMedia.addListener(listener);
  }

  window.CalculatorCards = {
    DEFAULT_MAX_OPEN_CARDS,
    init,
    openCard,
    collapseCard,
    setCardCollapsed,
    toggleCard: toggleCardFromRef,
    setWide,
    syncWideCards,
    syncCardPinAvailability,
    toggleCardPinned,
    setCardUserVisible
  };

  window.toggleCard = toggleCardFromRef;
})();
} catch (error) {
  console.error('CalculatorCards failed to initialize', error);
}
